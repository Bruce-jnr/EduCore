import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { auditService } from '../../services/audit.service.js';

async function audit(auth, entityType, entity) { await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'CREATE', module: 'ACADEMICS', entityType, entityId: entity.id, newValue: entity }); }
async function unique(operation) { try { return await operation(); } catch (error) { if (error.code === 'P2002') throw new AppError('A record with these details already exists', 409, 'ACADEMIC_RECORD_EXISTS'); throw error; } }

export const academicService = {
  async overview(tenantId) {
    const [academicYears, academicPeriods, classes, subjects, settings] = await prisma.$transaction([
      prisma.academicYear.findMany({ where: { tenantId }, orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }] }),
      prisma.academicPeriod.findMany({ where: { tenantId }, include: { academicYear: true }, orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }] }),
      prisma.class.findMany({ where: { tenantId }, include: { academicYear: true, _count: { select: { enrollments: true, teacherAssignments: true } } }, orderBy: [{ academicYear: { startDate: 'desc' } }, { levelOrder: 'asc' }, { name: 'asc' }] }),
      prisma.subject.findMany({ where: { tenantId }, include: { _count: { select: { teacherAssignments: true } } }, orderBy: { name: 'asc' } }),
      prisma.tenantSettings.findUnique({ where: { tenantId }, select: { academicConfig: true } }),
    ]);
    return { academicYears, academicPeriods, classes, subjects, levelTemplates: settings?.academicConfig?.levelTemplates || [], terminology: settings?.academicConfig?.terminology || null, defaultPeriodType: settings?.academicConfig?.defaultPeriodType || 'TERM' };
  },
  async createYear(auth, data) { const entity = await unique(() => prisma.$transaction(async (tx) => { if (data.isCurrent) await tx.academicYear.updateMany({ where: { tenantId: auth.tenantId, isCurrent: true }, data: { isCurrent: false } }); return tx.academicYear.create({ data: { ...data, tenantId: auth.tenantId } }); })); await audit(auth, 'AcademicYear', entity); return entity; },
  async createPeriod(auth, data) { const entity = await unique(() => prisma.$transaction(async (tx) => { const year = await tx.academicYear.findFirst({ where: { id: data.academicYearId, tenantId: auth.tenantId } }); if (!year) throw new AppError('Academic year not found', 404, 'ACADEMIC_YEAR_NOT_FOUND'); if (data.isCurrent) await tx.academicPeriod.updateMany({ where: { tenantId: auth.tenantId, isCurrent: true }, data: { isCurrent: false } }); return tx.academicPeriod.create({ data: { ...data, tenantId: auth.tenantId } }); })); await audit(auth, 'AcademicPeriod', entity); return entity; },
  async createClass(auth, data) { const year = await prisma.academicYear.findFirst({ where: { id: data.academicYearId, tenantId: auth.tenantId } }); if (!year) throw new AppError('Academic year not found', 404, 'ACADEMIC_YEAR_NOT_FOUND'); const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: auth.tenantId }, select: { academicConfig: true } }); const templates = settings?.academicConfig?.levelTemplates || []; const template = templates.find((item) => item.name === data.name); const normalized = { ...data, levelOrder: template?.order ?? data.levelOrder, section: data.section || null, tenantId: auth.tenantId }; const entity = await unique(() => prisma.class.create({ data: normalized })); await audit(auth, 'Class', entity); return entity; },
  async createSubject(auth, data) { const entity = await unique(() => prisma.subject.create({ data: { ...data, tenantId: auth.tenantId } })); await audit(auth, 'Subject', entity); return entity; },
};
