import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { resolveTenant } from '../../middleware/resolve-tenant.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const dashboardRouter = Router();
dashboardRouter.get('/', authenticate, resolveTenant, requirePermission('dashboard.view'), asyncHandler(async (req, res) => {
  const tenantId = req.auth.tenantId;
  const [totalStudents, activeStudents, totalStaff, totalClasses] = await prisma.$transaction([
    prisma.student.count({ where: { tenantId, deletedAt: null } }), prisma.student.count({ where: { tenantId, deletedAt: null, status: 'ACTIVE' } }),
    prisma.staff.count({ where: { tenantId, deletedAt: null, status: 'ACTIVE' } }), prisma.class.count({ where: { tenantId, status: 'ACTIVE' } }),
  ]);
  res.json({ success: true, data: { totalStudents, activeStudents, totalStaff, totalClasses }, message: null });
}));
