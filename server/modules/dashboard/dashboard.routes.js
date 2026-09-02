import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { resolveTenant } from '../../middleware/resolve-tenant.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const dashboardRouter = Router();
dashboardRouter.get('/', authenticate, resolveTenant, requirePermission('dashboard.view'), asyncHandler(async (req, res) => {
  const tenantId = req.auth.tenantId;
  const isAdministrator = req.auth.roles.some((role) => role === 'School Administrator' || role === 'Academic Administrator');
  const canSeeStaffStatistics = isAdministrator || req.auth.roles.includes('Accountant');
  const isTeacher = req.auth.roles.includes('Teacher') && !canSeeStaffStatistics;
  const teacherAssignments = isTeacher && req.auth.staffId ? await prisma.formTeacherAssignment.findMany({ where: { tenantId, staffId: req.auth.staffId, status: 'ACTIVE', academicPeriod: { isCurrent: true, status: 'ACTIVE' } }, select: { classId: true } }) : [];
  const assignedClassIds = [...new Set(teacherAssignments.map((assignment) => assignment.classId))];
  const studentScope = isTeacher ? { tenantId, deletedAt: null, enrollments: { some: { tenantId, status: 'ACTIVE', classId: { in: assignedClassIds }, academicYear: { isCurrent: true, status: 'ACTIVE' } } } } : { tenantId, deletedAt: null };
  const [totalStudents, activeStudents, totalStaff, totalClasses, tenant, administrators, academicYears, academicPeriods, subjects, enrollments, attendanceSessions, invoices, payments, assessmentSchemes, scoreSheets, approvedResults, publishedResults] = await prisma.$transaction([
    prisma.student.count({ where: studentScope }), prisma.student.count({ where: { ...studentScope, status: 'ACTIVE' } }),
    prisma.staff.count({ where: canSeeStaffStatistics ? { tenantId, deletedAt: null, status: 'ACTIVE' } : { tenantId, id: '__restricted__' } }), isTeacher ? prisma.class.count({ where: { tenantId, id: { in: assignedClassIds }, status: 'ACTIVE' } }) : prisma.class.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, include: { settings: true } }),
    prisma.user.count({ where: { tenantId, deletedAt: null, userRoles: { some: { role: { name: { in: ['School Administrator', 'Academic Administrator'] } } } } } }),
    prisma.academicYear.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.academicPeriod.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.subject.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.studentEnrollment.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.attendanceSession.count({ where: { tenantId } }),
    prisma.invoice.count({ where: { tenantId } }),
    prisma.payment.count({ where: { tenantId, status: 'COMPLETED' } }),
    prisma.assessmentScheme.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.resultSheet.count({ where: { tenantId, entries: { some: {} } } }),
    prisma.resultSheet.count({ where: { tenantId, status: 'PUBLISHED' } }),
    prisma.resultSheet.count({ where: { tenantId, status: 'PUBLISHED' } }),
  ]);
  const setupSteps = [
    ['School created', Boolean(tenant)], ['Administrator invited', administrators > 0],
    ['School configured', Boolean(tenant?.settings)], ['Academic year created', academicYears > 0],
    ['Term created', academicPeriods > 0], ['Classes created', totalClasses > 0],
    ['Subjects created', subjects > 0], ['Teachers added', totalStaff > 0],
    ['Students added', totalStudents > 0],
    ['Students enrolled', enrollments > 0], ['Attendance taken', attendanceSessions > 0],
    ['Fees assigned', invoices > 0], ['Payment recorded', payments > 0], ['Receipt generated', payments > 0],
    ['Assessment created', assessmentSchemes > 0], ['Scores entered', scoreSheets > 0],
    ['Results approved', approvedResults > 0], ['Results published', publishedResults > 0],
    ['Report card generated', publishedResults > 0],
  ].map(([label, complete], index) => ({ order: index + 1, label, complete }));
  const completed = setupSteps.filter((step) => step.complete).length;
  res.json({ success: true, data: { totalStudents, activeStudents, totalClasses, ...(canSeeStaffStatistics && { totalStaff }), ...(isAdministrator && { setup: { completed, total: setupSteps.length, percentage: Math.round((completed / setupSteps.length) * 100), steps: setupSteps } }) }, message: null });
}));
