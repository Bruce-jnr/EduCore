import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';
import { tenantContext } from '../security/tenant-context.js';

export async function resolveTenant(req, _res, next) {
  try {
    if (!req.auth?.tenantId) throw new AppError('A school context is required', 403, 'TENANT_REQUIRED');
    const tenant = await prisma.tenant.findFirst({ where: { id: req.auth.tenantId, isActive: true } });
    if (!tenant) throw new AppError('School is inactive or unavailable', 403, 'TENANT_INACTIVE');
    const subscriptionUnavailable = ['EXPIRED', 'CANCELLED'].includes(tenant.subscriptionStatus) || (tenant.subscriptionEndsAt && tenant.subscriptionEndsAt < new Date());
    if (subscriptionUnavailable) throw new AppError('School subscription has expired. Contact the platform administrator.', 403, 'SUBSCRIPTION_EXPIRED');
    req.tenant = tenant;
    tenantContext.run({ tenantId: tenant.id }, next);
  } catch (error) {
    next(error);
  }
}
