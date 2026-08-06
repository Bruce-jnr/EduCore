import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { auditService } from '../../services/audit.service.js';

const clean = (value) => value || null;
const sheetKey = (tenantId, input) =>
  [
    tenantId,
    input.academicPeriodId,
    input.classId,
    input.subjectId,
    input.assessmentSchemeId,
  ].join(':');

async function getContext(tenantId, input) {
  const [period, schoolClass, subject, scheme] = await Promise.all([
    prisma.academicPeriod.findFirst({
      where: { id: input.academicPeriodId, tenantId, status: 'ACTIVE' },
    }),
    prisma.class.findFirst({
      where: { id: input.classId, tenantId, status: 'ACTIVE' },
    }),
    prisma.subject.findFirst({
      where: { id: input.subjectId, tenantId, status: 'ACTIVE' },
    }),
    prisma.assessmentScheme.findFirst({
      where: { id: input.assessmentSchemeId, tenantId, status: 'ACTIVE' },
      include: {
        components: {
          where: { status: 'ACTIVE' },
          orderBy: { displayOrder: 'asc' },
        },
      },
    }),
  ]);
  if (!period || !schoolClass || !subject || !scheme)
    throw new AppError(
      'One or more result selections are invalid',
      404,
      'RESULT_CONTEXT_NOT_FOUND',
    );
  if (
    period.academicYearId !== schoolClass.academicYearId ||
    scheme.academicYearId !== period.academicYearId
  )
    throw new AppError(
      'The period, class, and assessment scheme must belong to the same academic year',
      422,
      'RESULT_CONTEXT_MISMATCH',
    );
  if (scheme.academicPeriodId && scheme.academicPeriodId !== period.id)
    throw new AppError(
      'This assessment scheme is not configured for the selected period',
      422,
      'ASSESSMENT_PERIOD_MISMATCH',
    );
  if (scheme.classId && scheme.classId !== schoolClass.id)
    throw new AppError(
      'This assessment scheme is not configured for the selected class',
      422,
      'ASSESSMENT_CLASS_MISMATCH',
    );
  return { period, schoolClass, subject, scheme };
}

async function requireAssignedSubject(auth, input) {
  if (auth.permissions.includes('results.approve') || auth.permissions.includes('assessments.manage')) return;
  if (!auth.staffId) throw new AppError('Link this user account to a staff profile before entering results', 403, 'STAFF_PROFILE_REQUIRED');
  const assignment = await prisma.teacherAssignment.findFirst({ where: { tenantId: auth.tenantId, staffId: auth.staffId, academicPeriodId: input.academicPeriodId, classId: input.classId, subjectId: input.subjectId, status: 'ACTIVE' } });
  if (!assignment) throw new AppError('You are not assigned to this class and subject for the selected period', 403, 'TEACHER_ASSIGNMENT_REQUIRED');
}

function validateBoundaries(boundaries) {
  for (const boundary of boundaries)
    if (boundary.minimumScore > boundary.maximumScore)
      throw new AppError(
        `Minimum score cannot exceed maximum score for ${boundary.grade}`,
        422,
        'INVALID_GRADE_BOUNDARY',
      );
  const sorted = [...boundaries].sort(
    (a, b) => a.minimumScore - b.minimumScore,
  );
  for (let index = 1; index < sorted.length; index += 1)
    if (sorted[index].minimumScore <= sorted[index - 1].maximumScore)
      throw new AppError(
        'Grade boundaries cannot overlap',
        422,
        'OVERLAPPING_GRADE_BOUNDARIES',
      );
}

export const resultService = {
  async overview(auth) {
    const tenantId = auth.tenantId;
    const isAdministrator = auth.roles.some((role) => role === 'School Administrator' || role === 'Academic Administrator');
    const broadAccess = auth.permissions.includes('results.approve') || auth.permissions.includes('assessments.manage');
    const assignments = broadAccess || !auth.staffId ? [] : await prisma.teacherAssignment.findMany({ where: { tenantId, staffId: auth.staffId, status: 'ACTIVE' }, select: { academicPeriodId: true, classId: true, subjectId: true } });
    const sheetWhere = isAdministrator ? { tenantId, status: { in: ['SUBMITTED', 'APPROVED', 'PUBLISHED', 'REJECTED'] } } : broadAccess ? { tenantId } : assignments.length ? { tenantId, OR: assignments.map(({ academicPeriodId, classId, subjectId }) => ({ academicPeriodId, classId, subjectId })) } : { tenantId, id: '__none__' };
    const [assessmentSchemes, gradingSchemes, recentSheets] =
      await prisma.$transaction([
        prisma.assessmentScheme.findMany({
          where: { tenantId },
          include: {
            academicYear: true,
            academicPeriod: true,
            class: true,
            components: { orderBy: { displayOrder: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        broadAccess ? prisma.gradingScheme.findMany({
          where: { tenantId },
          include: { boundaries: { orderBy: { minimumScore: 'desc' } } },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        }) : prisma.gradingScheme.findMany({ where: { id: '__none__' } }),
        prisma.resultSheet.findMany({
          where: sheetWhere,
          take: 20,
          orderBy: { updatedAt: 'desc' },
          include: {
            academicPeriod: true,
            class: true,
            subject: true,
            assessmentScheme: { include: { components: { where: { status: 'ACTIVE' }, orderBy: { displayOrder: 'asc' } } } },
            entries: { include: { student: { select: { id: true, studentNumber: true, firstName: true, lastName: true } }, assessmentComponent: { select: { id: true, name: true, maximumScore: true } } }, orderBy: { student: { lastName: 'asc' } } },
            enteredBy: { select: { firstName: true, lastName: true } },
            _count: { select: { entries: true } },
          },
        }),
      ]);
    return { assessmentSchemes, gradingSchemes, recentSheets };
  },

  async createAssessmentScheme(auth, input) {
    const total = input.components.reduce(
      (sum, component) => sum + component.weight,
      0,
    );
    if (Math.abs(total - 100) > 0.001)
      throw new AppError(
        `Assessment component weights must total 100%. Current total: ${total}%`,
        422,
        'INVALID_ASSESSMENT_WEIGHT',
      );
    const year = await prisma.academicYear.findFirst({
      where: { id: input.academicYearId, tenantId: auth.tenantId },
    });
    if (!year)
      throw new AppError(
        'Academic year not found',
        404,
        'ACADEMIC_YEAR_NOT_FOUND',
      );
    if (
      input.academicPeriodId &&
      !(await prisma.academicPeriod.findFirst({
        where: {
          id: input.academicPeriodId,
          tenantId: auth.tenantId,
          academicYearId: year.id,
        },
      }))
    )
      throw new AppError(
        'Academic period not found in this academic year',
        404,
        'ACADEMIC_PERIOD_NOT_FOUND',
      );
    if (
      input.classId &&
      !(await prisma.class.findFirst({
        where: {
          id: input.classId,
          tenantId: auth.tenantId,
          academicYearId: year.id,
        },
      }))
    )
      throw new AppError(
        'Class not found in this academic year',
        404,
        'CLASS_NOT_FOUND',
      );
    const entity = await prisma.assessmentScheme.create({
      data: {
        tenantId: auth.tenantId,
        academicYearId: year.id,
        academicPeriodId: clean(input.academicPeriodId),
        classId: clean(input.classId),
        name: input.name,
        components: {
          create: input.components.map((component, displayOrder) => ({
            ...component,
            displayOrder,
          })),
        },
      },
      include: { components: true },
    });
    await auditService.log({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: 'CREATE',
      module: 'RESULTS',
      entityType: 'AssessmentScheme',
      entityId: entity.id,
      newValue: { name: entity.name, componentCount: entity.components.length },
    });
    return entity;
  },

  async createGradingScheme(auth, input) {
    validateBoundaries(input.boundaries);
    const entity = await prisma.$transaction(async (tx) => {
      if (input.isDefault)
        await tx.gradingScheme.updateMany({
          where: { tenantId: auth.tenantId, isDefault: true },
          data: { isDefault: false },
        });
      return tx.gradingScheme.create({
        data: {
          tenantId: auth.tenantId,
          name: input.name,
          isDefault: input.isDefault,
          boundaries: {
            create: input.boundaries.map((boundary) => ({
              ...boundary,
              remark: clean(boundary.remark),
              gradePoint: boundary.gradePoint ?? null,
            })),
          },
        },
        include: { boundaries: true },
      });
    });
    await auditService.log({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: 'CREATE',
      module: 'RESULTS',
      entityType: 'GradingScheme',
      entityId: entity.id,
      newValue: { name: entity.name, boundaryCount: entity.boundaries.length },
    });
    return entity;
  },

  async roster(auth, input) {
    const tenantId = auth.tenantId;
    await requireAssignedSubject(auth, input);
    const context = await getContext(tenantId, input);
    const [enrollments, sheet] = await Promise.all([
      prisma.studentEnrollment.findMany({
        where: {
          tenantId,
          academicYearId: context.period.academicYearId,
          classId: input.classId,
          status: 'ACTIVE',
        },
        include: { student: true },
        orderBy: { student: { lastName: 'asc' } },
      }),
      prisma.resultSheet.findUnique({
        where: { sheetKey: sheetKey(tenantId, input) },
        include: { entries: true },
      }),
    ]);
    return {
      period: context.period,
      class: context.schoolClass,
      subject: context.subject,
      scheme: context.scheme,
      sheet,
      students: enrollments.map(({ student }) => student),
    };
  },

  async saveScores(auth, input) {
    if (auth.roles.some((role) => role === 'School Administrator' || role === 'Academic Administrator')) throw new AppError('Only teachers can enter scores', 403, 'TEACHER_RESULTS_REQUIRED');
    await requireAssignedSubject(auth, input);
    const context = await getContext(auth.tenantId, input);
    const [enrollments, existing] = await Promise.all([
      prisma.studentEnrollment.findMany({
        where: {
          tenantId: auth.tenantId,
          academicYearId: context.period.academicYearId,
          classId: input.classId,
          status: 'ACTIVE',
        },
        select: { studentId: true },
      }),
      prisma.resultSheet.findUnique({
        where: { sheetKey: sheetKey(auth.tenantId, input) },
      }),
    ]);
    if (
      existing &&
      existing.status !== 'DRAFT' &&
      existing.status !== 'REJECTED'
    )
      throw new AppError(
        'Submitted results cannot be edited',
        409,
        'RESULT_SHEET_LOCKED',
      );
    const students = new Set(enrollments.map((item) => item.studentId));
    const components = new Map(
      context.scheme.components.map((component) => [component.id, component]),
    );
    for (const score of input.scores) {
      if (!students.has(score.studentId))
        throw new AppError(
          'A score belongs to a student not enrolled in this class',
          422,
          'INVALID_RESULT_STUDENT',
        );
      const component = components.get(score.componentId);
      if (!component)
        throw new AppError(
          'A score uses an invalid assessment component',
          422,
          'INVALID_ASSESSMENT_COMPONENT',
        );
      if (score.rawScore > Number(component.maximumScore))
        throw new AppError(
          `${component.name} score cannot exceed ${component.maximumScore}`,
          422,
          'SCORE_EXCEEDS_MAXIMUM',
        );
    }
    const saved = await prisma.$transaction(async (tx) => {
      const sheet = await tx.resultSheet.upsert({
        where: { sheetKey: sheetKey(auth.tenantId, input) },
        update: { enteredById: auth.userId, status: 'DRAFT' },
        create: {
          sheetKey: sheetKey(auth.tenantId, input),
          tenantId: auth.tenantId,
          academicYearId: context.period.academicYearId,
          academicPeriodId: input.academicPeriodId,
          classId: input.classId,
          subjectId: input.subjectId,
          assessmentSchemeId: input.assessmentSchemeId,
          enteredById: auth.userId,
        },
      });
      for (const score of input.scores) {
        const component = components.get(score.componentId);
        const weightedScore =
          (score.rawScore / Number(component.maximumScore)) *
          Number(component.weight);
        const entryKey = `${sheet.id}:${score.studentId}:${score.componentId}`;
        await tx.resultEntry.upsert({
          where: { entryKey },
          update: {
            rawScore: score.rawScore,
            weightedScore,
            enteredById: auth.userId,
          },
          create: {
            entryKey,
            tenantId: auth.tenantId,
            resultSheetId: sheet.id,
            studentId: score.studentId,
            academicYearId: context.period.academicYearId,
            academicPeriodId: input.academicPeriodId,
            classId: input.classId,
            subjectId: input.subjectId,
            assessmentComponentId: score.componentId,
            rawScore: score.rawScore,
            weightedScore,
            enteredById: auth.userId,
          },
        });
      }
      return tx.resultSheet.findUnique({
        where: { id: sheet.id },
        include: { entries: true },
      });
    });
    await auditService.log({
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: 'SAVE_DRAFT',
      module: 'RESULTS',
      entityType: 'ResultSheet',
      entityId: saved.id,
      newValue: {
        scoreCount: input.scores.length,
        classId: input.classId,
        subjectId: input.subjectId,
      },
    });
    return saved;
  },

  async submit(auth, id) {
    if (auth.roles.some((role) => role === 'School Administrator' || role === 'Academic Administrator')) throw new AppError('Only teachers can submit result sheets', 403, 'TEACHER_RESULTS_REQUIRED');
    const sheet = await prisma.resultSheet.findFirst({ where: { id, tenantId: auth.tenantId }, include: { assessmentScheme: { include: { components: { where: { status: 'ACTIVE' } } } }, entries: true } });
    if (!sheet) throw new AppError('Result sheet not found', 404, 'RESULT_SHEET_NOT_FOUND');
    await requireAssignedSubject(auth, sheet);
    if (!['DRAFT', 'REJECTED'].includes(sheet.status)) throw new AppError('Only draft or rejected sheets can be submitted', 409, 'INVALID_RESULT_STATUS');
    const studentCount = await prisma.studentEnrollment.count({ where: { tenantId: auth.tenantId, academicYearId: sheet.academicYearId, classId: sheet.classId, status: 'ACTIVE', student: { deletedAt: null, status: 'ACTIVE' } } });
    const expected = studentCount * sheet.assessmentScheme.components.length;
    if (!expected || sheet.entries.length !== expected) throw new AppError(`Complete every score before submission. Expected ${expected} scores but found ${sheet.entries.length}.`, 422, 'INCOMPLETE_RESULT_SHEET');
    const updated = await prisma.resultSheet.update({ where: { id }, data: { status: 'SUBMITTED', submittedAt: new Date(), rejectionReason: null } });
    await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'SUBMIT', module: 'RESULTS', entityType: 'ResultSheet', entityId: id, oldValue: { status: sheet.status }, newValue: { status: 'SUBMITTED' } });
    return updated;
  },

  async review(auth, id, action, reason) {
    const sheet = await prisma.resultSheet.findFirst({ where: { id, tenantId: auth.tenantId } });
    if (!sheet) throw new AppError('Result sheet not found', 404, 'RESULT_SHEET_NOT_FOUND');
    if (action === 'REJECT') {
      if (!reason) throw new AppError('A rejection reason is required', 422, 'REJECTION_REASON_REQUIRED');
      if (!['SUBMITTED', 'APPROVED'].includes(sheet.status)) throw new AppError('This result sheet cannot be rejected', 409, 'INVALID_RESULT_STATUS');
      const updated = await prisma.resultSheet.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason, approvedAt: null, approvedById: null } });
      await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'REJECT', module: 'RESULTS', entityType: 'ResultSheet', entityId: id, oldValue: { status: sheet.status }, newValue: { status: 'REJECTED', reason } }); return updated;
    }
    if (sheet.status !== 'SUBMITTED') throw new AppError('Only submitted result sheets can be approved', 409, 'INVALID_RESULT_STATUS');
    const updated = await prisma.resultSheet.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date(), approvedById: auth.userId, rejectionReason: null } });
    await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'APPROVE', module: 'RESULTS', entityType: 'ResultSheet', entityId: id, oldValue: { status: sheet.status }, newValue: { status: 'APPROVED' } }); return updated;
  },

  async publish(auth, id) {
    const sheet = await prisma.resultSheet.findFirst({ where: { id, tenantId: auth.tenantId } });
    if (!sheet) throw new AppError('Result sheet not found', 404, 'RESULT_SHEET_NOT_FOUND');
    if (sheet.status !== 'APPROVED') throw new AppError('Only approved result sheets can be published', 409, 'INVALID_RESULT_STATUS');
    const updated = await prisma.resultSheet.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date(), publishedById: auth.userId } });
    await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'PUBLISH', module: 'RESULTS', entityType: 'ResultSheet', entityId: id, oldValue: { status: sheet.status }, newValue: { status: 'PUBLISHED' } }); return updated;
  },

  async reportCards(auth, input) {
    const tenantId = auth.tenantId;
    if (!auth.permissions.includes('results.approve') && !auth.permissions.includes('results.publish')) {
      if (!auth.staffId || !await prisma.teacherAssignment.findFirst({ where: { tenantId, staffId: auth.staffId, academicPeriodId: input.academicPeriodId, classId: input.classId, status: 'ACTIVE' } })) throw new AppError('You are not assigned to this report-card class', 403, 'TEACHER_ASSIGNMENT_REQUIRED');
    }
    const period = await prisma.academicPeriod.findFirst({ where: { id: input.academicPeriodId, tenantId } });
    const schoolClass = period ? await prisma.class.findFirst({ where: { id: input.classId, tenantId, academicYearId: period.academicYearId } }) : null;
    if (!period || !schoolClass) throw new AppError('Report-card class or period is invalid', 422, 'INVALID_REPORT_CONTEXT');
    const [tenant, enrollments, sheets, grading, attendance] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, logoUrl: true, schoolCode: true, email: true, phone: true, address: true, city: true, country: true, primaryColor: true, secondaryColor: true, settings: { select: { reportCardConfig: true } } } }),
      prisma.studentEnrollment.findMany({ where: { tenantId, academicYearId: period.academicYearId, classId: input.classId, status: 'ACTIVE' }, include: { student: true }, orderBy: { student: { lastName: 'asc' } } }),
      prisma.resultSheet.findMany({ where: { tenantId, academicPeriodId: period.id, classId: input.classId, status: 'PUBLISHED' }, include: { subject: true, entries: true } }),
      prisma.gradingScheme.findFirst({ where: { tenantId, status: 'ACTIVE' }, orderBy: { isDefault: 'desc' }, include: { boundaries: true } }),
      prisma.attendanceSession.findMany({ where: { tenantId, academicPeriodId: period.id, classId: input.classId }, include: { records: true } }),
    ]);
    const gradeFor = (score) => grading?.boundaries.find((boundary) => score >= Number(boundary.minimumScore) && score <= Number(boundary.maximumScore));
    return { tenant, period, class: schoolClass, gradingScheme: grading?.name || null, cards: enrollments.map(({ student }) => { const subjects = sheets.map((sheet) => { const total = sheet.entries.filter((entry) => entry.studentId === student.id).reduce((sum, entry) => sum + Number(entry.weightedScore), 0); const boundary = gradeFor(total); return { subjectId: sheet.subjectId, subject: sheet.subject.name, total: Math.round(total * 100) / 100, grade: boundary?.grade || null, remark: boundary?.remark || null }; }); const records = attendance.flatMap((session) => session.records).filter((record) => record.studentId === student.id); const present = records.filter((record) => ['PRESENT', 'LATE'].includes(record.status)).length; const average = subjects.length ? subjects.reduce((sum, subject) => sum + subject.total, 0) / subjects.length : 0; return { student, subjects, average: Math.round(average * 100) / 100, attendance: { present, total: records.length, rate: records.length ? Math.round((present / records.length) * 1000) / 10 : 0 } }; }) };
  },
};
