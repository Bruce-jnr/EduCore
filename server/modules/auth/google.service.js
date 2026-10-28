import { randomBytes } from 'node:crypto';
import { AppError } from '../../errors/app-error.js';
import { schoolLevelTemplates, periodTypes, terminology } from '../platform/school-templates.js';

const include = { tenant: true, staffProfile: { select: { id: true } }, userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } };
export function createGoogleService({ db, identity, clientId, hashPassword, signSession, now = () => new Date() }) {
  async function config() {
    const settings = await db.platformSettings.findUnique({ where: { id: 'platform' } });
    return { clientId, signupEnabled: Boolean(clientId && settings?.registrationEnabled && !settings.maintenanceMode) };
  }
  async function authenticate(intent, data, meta = {}) {
    const profile = await identity.verify(data.credential, data.challenge, intent);
    // Expensive password hashing stays outside the database transaction. No user knows this password.
    const passwordHash = intent === 'signup' ? await hashPassword(randomBytes(48).toString('base64url'), 12) : null;
    let user;
    try {
      user = await db.$transaction(async (tx) => {
        let account = await tx.user.findUnique({ where: { googleSubject: profile.subject }, include });
        if (intent === 'signup') {
          const settings = await tx.platformSettings.findUnique({ where: { id: 'platform' } });
          if (!settings?.registrationEnabled || settings.maintenanceMode) throw new AppError('School registration is currently unavailable.', 403, 'REGISTRATION_DISABLED');
          if (account) throw new AppError('This Google account is already registered. Sign in instead.', 409, 'GOOGLE_ACCOUNT_EXISTS');
          const permissions = await tx.permission.findMany({ where: { key: { not: { startsWith: 'platform.' } } } });
          if (!permissions.some((permission) => permission.key === 'dashboard.view')) throw new AppError('School permissions have not been configured. Contact the platform administrator.', 503, 'PERMISSIONS_NOT_CONFIGURED');
          const started = now();

          const tenant = await tx.tenant.create({ data: {
            name: data.name, slug: data.slug, schoolCode: data.schoolCode, schoolType: 'BASIC', email: profile.email,
            country: settings.defaultCountry, currency: settings.defaultCurrency, timezone: settings.defaultTimezone,
            subscriptionPlan: 'FREEMIUM', subscriptionStatus: 'ACTIVE', billingCycle: data.billingCycle || 'MONTHLY', requestedSubscriptionPlan: data.requestedPlan && data.requestedPlan !== 'FREEMIUM' ? data.requestedPlan : null,
            settings: { create: { academicConfig: { levelTemplates: schoolLevelTemplates.BASIC, defaultPeriodType: periodTypes.BASIC, terminology: terminology.BASIC } } },
          } });
          const role = await tx.role.create({ data: { tenantId: tenant.id, name: 'School Administrator', description: 'Full tenant administration access', isSystem: true, permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) } } });
          account = await tx.user.create({ data: { tenantId: tenant.id, googleSubject: profile.subject, firstName: profile.firstName, lastName: profile.lastName, email: profile.email, passwordHash, status: 'ACTIVE', emailVerifiedAt: started, userRoles: { create: { roleId: role.id } } }, include });
        }
        if (!account || account.isPlatformUser || account.status !== 'ACTIVE' || account.deletedAt || !account.tenant?.isActive) throw new AppError('No active school account is linked to this Google account. Use your school password or create a new school.', 403, 'GOOGLE_ACCOUNT_UNAVAILABLE');
        // Expired schools can sign in to pay; operational routers still enforce access.
        await tx.user.update({ where: { id: account.id, tenantId: account.tenantId }, data: { lastLoginAt: now() } });
        await tx.auditLog.create({ data: { tenantId: account.tenantId, userId: account.id, action: intent === 'signup' ? 'GOOGLE_SIGNUP' : 'LOGIN', module: 'AUTH', entityType: 'User', entityId: account.id, ipAddress: meta.ipAddress, userAgent: meta.userAgent?.slice(0, 191), newValue: { provider: 'google' } } });
        return account;
      });
    } catch (error) {
      if (error.code === 'P2002') throw new AppError('This Google account, school address, or school code is already registered. Sign in or choose different school details.', 409, 'REGISTRATION_CONFLICT');
      throw error;
    }
    const roles = user.userRoles.map(({ role }) => role.name);
    const permissions = [...new Set(user.userRoles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)))];
    return { token: signSession(user, permissions), user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, staffId: user.staffProfile?.id || null, tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug, subscriptionPlan:user.tenant.subscriptionPlan,subscriptionStatus:user.tenant.subscriptionStatus,billingCycle:user.tenant.billingCycle,subscriptionEndsAt:user.tenant.subscriptionEndsAt }, roles, permissions } };
  }
  return { config, authenticate };
}
