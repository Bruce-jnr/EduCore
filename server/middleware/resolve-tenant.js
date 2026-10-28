import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';
import { tenantContext } from '../security/tenant-context.js';

import { assertSubscription, assertPlanFeature } from '../modules/subscriptions/plan-policy.js';

export async function resolveTenant(req, _res, next) {
  try {
    if (!req.auth?.tenantId) throw new AppError('A school context is required', 403, 'TENANT_REQUIRED');
    const tenant = await prisma.tenant.findFirst({ where: { id: req.auth.tenantId, isActive: true } });
    if (!tenant) throw new AppError('School is inactive or unavailable', 403, 'TENANT_INACTIVE');
    assertSubscription(tenant);
    if (req.baseUrl === '/api/finance') assertPlanFeature(tenant, 'finance');
    if (req.baseUrl === '/api/lesson-plans') assertPlanFeature(tenant, 'schoolLessons');
    if (req.baseUrl === '/api/results' && /report-card/.test(req.path)) assertPlanFeature(tenant, 'reportCards');
    if (req.baseUrl === '/api/results' && /master-sheet/.test(req.path)) assertPlanFeature(tenant, 'advancedReports');
    const schoolOffice = req.auth.roles.some(role => ['School Administrator','Academic Administrator'].includes(role));
    if (!schoolOffice && req.auth.roles.includes('Teacher')) assertPlanFeature(tenant, 'teacherPortal');
    req.tenant = tenant;
    tenantContext.run({ tenantId: tenant.id }, next);
  } catch (error) {
    next(error);
  }
}
