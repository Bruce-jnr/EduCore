import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { auditService } from '../../services/audit.service.js';

import { schoolLevelTemplates, periodTypes, terminology } from './school-templates.js';
export { schoolLevelTemplates } from './school-templates.js';
function access(user) { return { roles: user.userRoles.map(({ role }) => role.name), permissions: [...new Set(user.userRoles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)))] }; }
import { createSubscriptionService } from '../subscriptions/subscription.service.js';
const subscriptions = createSubscriptionService(prisma);
const DAY = 86400000;
function subscriptionView(school) {
  const end = school.subscriptionEndsAt;
  const daysRemaining = end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / DAY)) : null;
  return { ...school, daysRemaining };
}

export const platformService = {
  async login(data) { const user = await prisma.user.findFirst({ where: { tenantId: null, email: data.email, isPlatformUser: true, deletedAt: null, status: 'ACTIVE' }, include: { userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } }); if (!user || !await bcrypt.compare(data.password, user.passwordHash)) throw new AppError('Invalid platform credentials', 401, 'INVALID_CREDENTIALS'); const rights = access(user); const token = jwt.sign({ platform: true }, env.JWT_SECRET, { subject: user.id, expiresIn: env.JWT_EXPIRES_IN }); await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }); return { token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, isPlatformUser: true, ...rights } }; },
  async overview() { await prisma.tenant.updateMany({ where: { subscriptionStatus: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] }, subscriptionEndsAt: { lt: new Date() } }, data: { subscriptionStatus: 'EXPIRED' } }); const [rawSchools, totalStudents, totalUsers] = await Promise.all([prisma.tenant.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { students: true, users: true, staff: true } } } }), prisma.student.count({ where: { deletedAt: null } }), prisma.user.count({ where: { deletedAt: null } }), this.getSettings()]); const schools = rawSchools.map(subscriptionView); return { schools, defaultTrialDays: 14, summary: { totalSchools: schools.length, activeSchools: schools.filter((school) => school.isActive).length, trialSchools: schools.filter((school) => school.subscriptionStatus === 'TRIAL').length, subscribedSchools: schools.filter((school) => school.subscriptionStatus === 'ACTIVE').length, expiredSchools: schools.filter((school) => school.subscriptionStatus === 'EXPIRED').length, suspendedSchools: schools.filter((school) => !school.isActive).length, totalStudents, totalUsers } }; },
  async createSchool(auth, data) {
    try {
      const passwordHash = await bcrypt.hash(data.adminPassword, 12); const [tenantPermissions] = await Promise.all([prisma.permission.findMany({ where: { key: { not: { startsWith: 'platform.' } } } }), this.getSettings()]); const levels = schoolLevelTemplates[data.schoolType]; const trialStartedAt = new Date(); const subscriptionEndsAt = new Date(trialStartedAt.getTime() + 14 * DAY);
      const school = await prisma.$transaction(async (tx) => { const tenant = await tx.tenant.create({ data: { name: data.name, slug: data.slug, schoolCode: data.schoolCode, schoolType: data.schoolType, email: data.email || null, phone: data.phone, country: data.country, currency: data.currency, timezone: data.timezone, subscriptionPlan: 'PROFESSIONAL', subscriptionStatus: 'TRIAL', trialStartedAt, trialEndsAt: subscriptionEndsAt, subscriptionEndsAt, paidTrialUsed: true, settings: { create: { academicConfig: { levelTemplates: levels, defaultPeriodType: periodTypes[data.schoolType], terminology: terminology[data.schoolType] } } } } }); const role = await tx.role.create({ data: { tenantId: tenant.id, name: 'School Administrator', description: 'Full tenant administration access', isSystem: true, permissions: { create: tenantPermissions.map((permission) => ({ permissionId: permission.id })) } } }); const administrator = await tx.user.create({ data: { tenantId: tenant.id, firstName: data.adminFirstName, lastName: data.adminLastName, email: data.adminEmail, passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date(), userRoles: { create: { roleId: role.id } } } }); return { ...tenant, daysRemaining: 14, levelTemplates: levels, administrator: { id: administrator.id, email: administrator.email, firstName: administrator.firstName, lastName: administrator.lastName } }; });
      await auditService.log({ userId: auth.userId, action: 'CREATE_TENANT', module: 'PLATFORM', entityType: 'Tenant', entityId: school.id, newValue: { name: school.name, slug: school.slug, schoolCode: school.schoolCode, schoolType: school.schoolType, levelTemplates: levels } }); return school;
    } catch (error) { if (error.code === 'P2002') throw new AppError('School slug, code, or administrator email already exists', 409, 'SCHOOL_EXISTS'); throw error; }
  },
  async setStatus(auth, id, isActive) { const tenant = await prisma.tenant.findUnique({ where: { id } }); if (!tenant) throw new AppError('School not found', 404, 'SCHOOL_NOT_FOUND'); const updated = await prisma.tenant.update({ where: { id }, data: { isActive } }); await auditService.log({ userId: auth.userId, action: isActive ? 'ACTIVATE_TENANT' : 'SUSPEND_TENANT', module: 'PLATFORM', entityType: 'Tenant', entityId: id, oldValue: { isActive: tenant.isActive }, newValue: { isActive } }); return updated; },
  async updateSubscription(auth,id,data) { return subscriptionView(await subscriptions.manage(auth,id,data)); },
  recordSubscriptionPayment: (auth,id,data) => subscriptions.payment(auth,id,data),
  subscriptionPayments: id => subscriptions.history(id),
  async getSettings() { const settings = await prisma.platformSettings.upsert({ where: { id: 'platform' }, update: {}, create: { id: 'platform', defaultTrialDays: 14 } }); return { ...settings, defaultTrialDays: 14 }; },
  async updateSettings(auth, data) { const oldValue = await this.getSettings(); const updated = await prisma.platformSettings.update({ where: { id: 'platform' }, data: { ...data, supportEmail: data.supportEmail || null, supportPhone: data.supportPhone || null, appUrl: data.appUrl || null } }); await auditService.log({ userId: auth.userId, action: 'UPDATE', module: 'PLATFORM_SETTINGS', entityType: 'PlatformSettings', entityId: 'platform', oldValue, newValue: updated }); return updated; },
};
