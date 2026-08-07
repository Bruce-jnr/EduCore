import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { auditService } from '../../services/audit.service.js';

const terminalStatuses = { TRANSFER: 'TRANSFERRED', WITHDRAW: 'WITHDRAWN', GRADUATE: 'GRADUATED' };

async function sourceContext(tenantId, academicYearId, classId) {
  const [year, schoolClass] = await Promise.all([
    prisma.academicYear.findFirst({ where: { id: academicYearId, tenantId } }),
    prisma.class.findFirst({ where: { id: classId, tenantId, academicYearId } }),
  ]);
  if (!year || !schoolClass) throw new AppError('The source year or class is invalid', 422, 'INVALID_PROGRESSION_SOURCE');
  return { year, schoolClass };
}

export const progressionService = {
  async roster(auth, input) {
    const source = await sourceContext(auth.tenantId, input.academicYearId, input.classId);
    const enrollments = await prisma.studentEnrollment.findMany({ where: { tenantId: auth.tenantId, academicYearId: input.academicYearId, classId: input.classId, status: 'ACTIVE', student: { deletedAt: null, status: 'ACTIVE' } }, include: { student: true }, orderBy: { student: { lastName: 'asc' } } });
    return { source, students: enrollments.map(({ id: enrollmentId, student }) => ({ enrollmentId, ...student })) };
  },

  async history(auth) {
    const runs = await prisma.progressionRun.findMany({ where: { tenantId: auth.tenantId }, include: { items: { orderBy: { studentName: 'asc' } } }, orderBy: { createdAt: 'desc' }, take: 30 });
    const yearIds = [...new Set(runs.flatMap((run) => [run.sourceAcademicYearId, run.targetAcademicYearId]).filter(Boolean))]; const classIds = [...new Set(runs.flatMap((run) => [run.sourceClassId, run.targetClassId]).filter(Boolean))];
    const [years, classes] = await Promise.all([prisma.academicYear.findMany({ where: { tenantId: auth.tenantId, id: { in: yearIds } }, select: { id: true, name: true } }), prisma.class.findMany({ where: { tenantId: auth.tenantId, id: { in: classIds } }, select: { id: true, name: true, section: true } })]);
    const yearMap = new Map(years.map((item) => [item.id, item.name])); const classMap = new Map(classes.map((item) => [item.id, `${item.name}${item.section ? ` ${item.section}` : ''}`]));
    return runs.map((run) => ({ ...run, sourceYearName: yearMap.get(run.sourceAcademicYearId) || 'Unknown year', sourceClassName: classMap.get(run.sourceClassId) || 'Unknown class', targetYearName: run.targetAcademicYearId ? yearMap.get(run.targetAcademicYearId) || 'Unknown year' : null, targetClassName: run.targetClassId ? classMap.get(run.targetClassId) || 'Unknown class' : null }));
  },

  async execute(auth, input) {
    const source = await sourceContext(auth.tenantId, input.sourceAcademicYearId, input.sourceClassId);
    let target = null;
    if (['PROMOTE', 'REPEAT'].includes(input.action)) {
      const [year, schoolClass] = await Promise.all([prisma.academicYear.findFirst({ where: { id: input.targetAcademicYearId, tenantId: auth.tenantId } }), prisma.class.findFirst({ where: { id: input.targetClassId, tenantId: auth.tenantId, academicYearId: input.targetAcademicYearId } })]);
      if (!year || !schoolClass) throw new AppError('Select a valid destination year and class', 422, 'INVALID_PROGRESSION_TARGET');
      if (year.startDate <= source.year.startDate) throw new AppError('The destination academic year must come after the source year', 422, 'INVALID_PROGRESSION_YEAR');
      if (input.action === 'PROMOTE' && source.schoolClass.levelOrder != null && schoolClass.levelOrder != null && schoolClass.levelOrder <= source.schoolClass.levelOrder) throw new AppError('Promotion must move students to a higher level', 422, 'INVALID_PROMOTION_LEVEL');
      if (input.action === 'REPEAT' && source.schoolClass.levelOrder != null && schoolClass.levelOrder !== source.schoolClass.levelOrder) throw new AppError('Repeating students must remain at the same level', 422, 'INVALID_REPEAT_LEVEL');
      target = { year, schoolClass };
    }
    const uniqueStudentIds = [...new Set(input.studentIds)];
    const enrollments = await prisma.studentEnrollment.findMany({ where: { tenantId: auth.tenantId, academicYearId: input.sourceAcademicYearId, classId: input.sourceClassId, status: 'ACTIVE', studentId: { in: uniqueStudentIds }, student: { deletedAt: null } }, include: { student: true } });
    if (enrollments.length !== uniqueStudentIds.length) throw new AppError('One or more selected students are no longer actively enrolled in the source class', 409, 'STALE_PROGRESSION_ROSTER');
    if (target) {
      const duplicate = await prisma.studentEnrollment.findFirst({ where: { tenantId: auth.tenantId, academicYearId: target.year.id, studentId: { in: uniqueStudentIds }, status: 'ACTIVE' } });
      if (duplicate) throw new AppError('A selected student already has an active enrollment in the destination year', 409, 'DUPLICATE_PROGRESSION');
    }
    const newStatus = terminalStatuses[input.action] || 'ACTIVE'; const endedAt = new Date();
    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.progressionRun.create({ data: { tenantId: auth.tenantId, action: input.action, sourceAcademicYearId: input.sourceAcademicYearId, sourceClassId: input.sourceClassId, targetAcademicYearId: target?.year.id || null, targetClassId: target?.schoolClass.id || null, studentCount: enrollments.length, notes: input.notes || null, createdById: auth.userId } });
      for (const enrollment of enrollments) {
        const closed = await tx.studentEnrollment.updateMany({ where: { id: enrollment.id, tenantId: auth.tenantId, status: 'ACTIVE' }, data: { status: 'INACTIVE', endDate: endedAt } });
        if (closed.count !== 1) throw new AppError('A student enrollment changed during progression. Please reload and try again.', 409, 'PROGRESSION_CONFLICT');
        let targetEnrollment = null;
        if (target) targetEnrollment = await tx.studentEnrollment.create({ data: { tenantId: auth.tenantId, studentId: enrollment.studentId, academicYearId: target.year.id, classId: target.schoolClass.id, status: 'ACTIVE', enrollmentDate: target.year.startDate } });
        await tx.student.update({ where: { id: enrollment.studentId, tenantId: auth.tenantId }, data: { status: newStatus } });
        await tx.progressionItem.create({ data: { tenantId: auth.tenantId, progressionRunId: created.id, studentId: enrollment.studentId, studentNumber: enrollment.student.studentNumber, studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`, action: input.action, sourceEnrollmentId: enrollment.id, targetEnrollmentId: targetEnrollment?.id || null, previousStudentStatus: enrollment.student.status, newStudentStatus: newStatus } });
      }
      return tx.progressionRun.findUnique({ where: { id: created.id, tenantId: auth.tenantId }, include: { items: true } });
    });
    await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'YEAR_END_PROGRESSION', module: 'ACADEMICS', entityType: 'ProgressionRun', entityId: run.id, newValue: { action: input.action, sourceAcademicYearId: input.sourceAcademicYearId, sourceClassId: input.sourceClassId, targetAcademicYearId: input.targetAcademicYearId || null, targetClassId: input.targetClassId || null, studentIds: uniqueStudentIds, notes: input.notes || null } });
    return run;
  },
};
