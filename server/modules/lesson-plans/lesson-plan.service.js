import { AppError } from '../../errors/app-error.js';
import { buildLessonWeeks, incompleteWeeks, lessonBooklet, LESSON_TEMPLATE_VERSION } from './lesson-plan.template.js';

const reviewer = auth => auth.permissions.includes('lesson-plans.review');
const relationFields = {
  class: { select: { id: true, name: true, section: true, academicYearId: true } },
  subject: { select: { id: true, name: true, code: true } },
  academicPeriod: { select: { id: true, name: true, academicYear: { select: { name: true } } } },
  author: { select: { id: true, firstName: true, lastName: true } },
};
function readScope(auth) {
  return { tenantId: auth.tenantId, ...(!reviewer(auth) && { authorId: auth.userId }) };
}
function requireSchoolScope(auth, scope) {
  if (scope === 'school' && !reviewer(auth)) throw new AppError('School lesson library access requires review permission', 403, 'LESSON_REVIEW_REQUIRED');
}
async function validateContext(db, auth, input) {
  const period = await db.academicPeriod.findFirst({ where: { id: input.academicPeriodId, tenantId: auth.tenantId, status: 'ACTIVE' } });
  const schoolClass = period && await db.class.findFirst({ where: { id: input.classId, tenantId: auth.tenantId, academicYearId: period.academicYearId, status: 'ACTIVE', classSubjects: { some: { tenantId: auth.tenantId, subjectId: input.subjectId } } } });
  const subject = schoolClass && await db.subject.findFirst({ where: { id: input.subjectId, tenantId: auth.tenantId, status: 'ACTIVE' } });
  if (!period || !schoolClass || !subject) throw new AppError('Select an active class, term and class subject from the same school and academic year', 422, 'INVALID_LESSON_CONTEXT');
  if (!reviewer(auth)) {
    if (!auth.staffId) throw new AppError('Link this account to a staff profile before creating lesson plans', 403, 'STAFF_PROFILE_REQUIRED');
    const where = { tenantId: auth.tenantId, staffId: auth.staffId, classId: input.classId, academicPeriodId: input.academicPeriodId, academicYearId: period.academicYearId, status: 'ACTIVE' };
    const [form, subjectAssignment] = await Promise.all([
      db.formTeacherAssignment.findFirst({ where }),
      db.teacherAssignment.findFirst({ where: { ...where, subjectId: input.subjectId } }),
    ]);
    if (!form && !subjectAssignment) throw new AppError('You are not assigned to this class and subject in the selected term', 403, 'LESSON_ASSIGNMENT_REQUIRED');
  }
}
function audit(db, auth, action, plan, extra = {}) {
  return db.auditLog.create({ data: {
    tenantId: auth.tenantId, userId: auth.userId, action, module: 'LESSON_PLANS',
    entityType: 'LessonPlan', entityId: plan.id,
    newValue: { title: plan.title, status: plan.status, revision: plan.revision, ...extra },
  } });
}

/** Dependency injection permits unit tests without initializing Prisma or contacting a database. */
export function createLessonPlanService(db) {
  const service = {
    async options(auth) {
      const tenantId = auth.tenantId;
      const broad = reviewer(auth);
      const [formAssignments, subjectAssignments] = broad || !auth.staffId ? [[], []] : await Promise.all([
        db.formTeacherAssignment.findMany({ where: { tenantId, staffId: auth.staffId, status: 'ACTIVE' }, select: { classId: true, academicPeriodId: true } }),
        db.teacherAssignment.findMany({ where: { tenantId, staffId: auth.staffId, status: 'ACTIVE' }, select: { classId: true, academicPeriodId: true, subjectId: true } }),
      ]);
      const assignments = [...formAssignments.map(item => ({ ...item, subjectId: null })), ...subjectAssignments];
      const classIds = [...new Set(assignments.map(item => item.classId))];
      const periodIds = [...new Set(assignments.map(item => item.academicPeriodId))];
      const [classes, academicPeriods, subjects] = await Promise.all([
        db.class.findMany({ where: { tenantId, status: 'ACTIVE', ...(!broad && { id: { in: classIds } }) }, include: { classSubjects: { where: { tenantId }, select: { subjectId: true } } }, orderBy: { name: 'asc' } }),
        db.academicPeriod.findMany({ where: { tenantId, status: 'ACTIVE', ...(!broad && { id: { in: periodIds } }) }, include: { academicYear: { select: { name: true } } }, orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }] }),
        db.subject.findMany({ where: { tenantId, status: 'ACTIVE' }, select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } }),
      ]);
      return { classes: classes.map(({ classSubjects, ...item }) => ({ ...item, subjectIds: classSubjects.map(entry => entry.subjectId) })), academicPeriods, subjects, assignments, canReview: broad, defaultWeekCount: 12, templateVersion: LESSON_TEMPLATE_VERSION };
    },
    async list(auth, query) {
      requireSchoolScope(auth, query.scope);
      const where = {
        tenantId: auth.tenantId,
        ...(query.scope !== 'school' && { authorId: auth.userId }),
        status: query.status || { not: 'ARCHIVED' },
        ...(query.search && { OR: [{ title: { contains: query.search } }, { subject: { name: { contains: query.search } } }] }),
      };
      const [items, total] = await Promise.all([
        db.lessonPlan.findMany({ where, select: { id: true, title: true, status: true, revision: true, weekCount: true, updatedAt: true, ...relationFields }, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { updatedAt: 'desc' } }),
        db.lessonPlan.count({ where }),
      ]);
      return { items, total, page: query.page, pages: Math.ceil(total / query.limit) };
    },
    async get(auth, id) {
      const plan = await db.lessonPlan.findFirst({ where: { id, ...readScope(auth) }, include: relationFields });
      if (!plan) throw new AppError('Lesson plan not found', 404, 'LESSON_PLAN_NOT_FOUND');
      return plan;
    },
    async create(auth, input) {
      return db.$transaction(async tx => {
        await validateContext(tx, auth, input);
        const plan = await tx.lessonPlan.create({ data: {
          tenantId: auth.tenantId, authorId: auth.userId, classId: input.classId,
          subjectId: input.subjectId, academicPeriodId: input.academicPeriodId,
          title: input.title, weekCount: input.weekCount,
          templateVersion: LESSON_TEMPLATE_VERSION,
          weeks: buildLessonWeeks(input.topics, input.weekCount, input.durationMinutes),
        }, include: relationFields });
        await audit(tx, auth, 'CREATE', plan, { classId: input.classId, subjectId: input.subjectId });
        return plan;
      });
    },
    async update(auth, id, input) {
      return db.$transaction(async tx => {
        const previous = await tx.lessonPlan.findFirst({ where: { id, tenantId: auth.tenantId, authorId: auth.userId } });
        if (!previous) throw new AppError('Only the author can edit this lesson plan', 404, 'LESSON_PLAN_NOT_FOUND');
        if (input.weeks.length !== previous.weekCount) throw new AppError('The number of weeks must match the original booklet', 422, 'LESSON_WEEK_COUNT_MISMATCH');
        await validateContext(tx, auth, previous);
        if (input.status === 'READY') {
          const missing = incompleteWeeks(input.weeks);
          if (missing.length) throw new AppError(`Complete the topic, outcome, resources and lesson phases for weeks ${missing.join(', ')}`, 422, 'INCOMPLETE_LESSON_PLAN');
        }
        const result = await tx.lessonPlan.updateMany({ where: { id, tenantId: auth.tenantId, authorId: auth.userId, revision: input.revision }, data: { title: input.title, weeks: input.weeks, status: input.status, revision: { increment: 1 } } });
        if (result.count !== 1) throw new AppError('This booklet was updated elsewhere. Reload it before saving your changes.', 409, 'LESSON_REVISION_CONFLICT');
        const plan = await tx.lessonPlan.findFirst({ where: { id, tenantId: auth.tenantId, authorId: auth.userId }, include: relationFields });
        await audit(tx, auth, 'UPDATE', plan);
        return plan;
      });
    },
    async booklet(auth, id) {
      const plan = await service.get(auth, id);
      const tenant = await db.tenant.findFirst({ where: { id: auth.tenantId }, select: { name: true, schoolCode: true, address: true, city: true, country: true } });
      if (!tenant) throw new AppError('School not found', 404, 'TENANT_NOT_FOUND');
      return lessonBooklet({ ...plan, tenant });
    },
  };
  return service;
}
