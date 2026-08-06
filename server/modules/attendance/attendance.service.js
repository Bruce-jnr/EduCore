import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { auditService } from '../../services/audit.service.js';

const dateValue = (value) => new Date(`${value}T00:00:00.000Z`);
const sessionKey = (tenantId, classId, periodId, date) => `${tenantId}:${classId}:${periodId}:${date}`;

async function context(tenantId, classId, periodId) {
  const period = await prisma.academicPeriod.findFirst({ where: { id: periodId, tenantId }, include: { academicYear: true } });
  if (!period) throw new AppError('Academic period not found', 404, 'PERIOD_NOT_FOUND');
  const schoolClass = await prisma.class.findFirst({ where: { id: classId, tenantId, academicYearId: period.academicYearId } });
  if (!schoolClass) throw new AppError('Class does not belong to this academic period', 422, 'INVALID_ATTENDANCE_CLASS');
  return { period, schoolClass };
}

async function requireAssignedClass(auth, classId, academicPeriodId) {
  if (auth.permissions.includes('attendance.update')) return;
  if (!auth.staffId) throw new AppError('Link this user account to a staff profile before taking attendance', 403, 'STAFF_PROFILE_REQUIRED');
  const assignment = await prisma.teacherAssignment.findFirst({ where: { tenantId: auth.tenantId, staffId: auth.staffId, classId, academicPeriodId, status: 'ACTIVE' } });
  if (!assignment) throw new AppError('You are not assigned to this class for the selected period', 403, 'TEACHER_ASSIGNMENT_REQUIRED');
}

export const attendanceService = {
  async roster(auth, input) {
    const { period, schoolClass } = await context(auth.tenantId, input.classId, input.academicPeriodId);
    await requireAssignedClass(auth, input.classId, input.academicPeriodId);
    const [enrollments, session] = await Promise.all([
      prisma.studentEnrollment.findMany({ where: { tenantId: auth.tenantId, classId: input.classId, academicYearId: period.academicYearId, status: 'ACTIVE', student: { deletedAt: null, status: 'ACTIVE' } }, include: { student: true }, orderBy: { student: { firstName: 'asc' } } }),
      prisma.attendanceSession.findUnique({ where: { sessionKey: sessionKey(auth.tenantId, input.classId, input.academicPeriodId, input.date) }, include: { records: true } }),
    ]);
    const recordMap = new Map(session?.records.map((record) => [record.studentId, record]) || []);
    return { class: schoolClass, period, sessionId: session?.id || null, students: enrollments.map(({ student }) => ({ ...student, attendance: recordMap.get(student.id) || null })) };
  },
  async save(auth, input) {
    if (auth.roles.some((role) => role === 'School Administrator' || role === 'Academic Administrator')) throw new AppError('Attendance can only be recorded by teachers', 403, 'TEACHER_ATTENDANCE_REQUIRED');
    const { period } = await context(auth.tenantId, input.classId, input.academicPeriodId);
    await requireAssignedClass(auth, input.classId, input.academicPeriodId);
    const enrolled = await prisma.studentEnrollment.findMany({ where: { tenantId: auth.tenantId, classId: input.classId, academicYearId: period.academicYearId, status: 'ACTIVE' }, select: { studentId: true } });
    const allowed = new Set(enrolled.map((item) => item.studentId));
    if (input.records.some((record) => !allowed.has(record.studentId))) throw new AppError('Attendance contains a student not enrolled in this class', 422, 'INVALID_ATTENDANCE_STUDENT');
    const key = sessionKey(auth.tenantId, input.classId, input.academicPeriodId, input.date);
    const session = await prisma.$transaction(async (tx) => {
      const saved = await tx.attendanceSession.upsert({ where: { sessionKey: key }, update: { createdById: auth.userId }, create: { sessionKey: key, tenantId: auth.tenantId, academicYearId: period.academicYearId, academicPeriodId: input.academicPeriodId, classId: input.classId, date: dateValue(input.date), createdById: auth.userId } });
      for (const record of input.records) await tx.attendanceRecord.upsert({ where: { attendanceSessionId_studentId: { attendanceSessionId: saved.id, studentId: record.studentId } }, update: { status: record.status, remarks: record.remarks || null }, create: { attendanceSessionId: saved.id, studentId: record.studentId, status: record.status, remarks: record.remarks || null } });
      return saved;
    });
    await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'SAVE', module: 'ATTENDANCE', entityType: 'AttendanceSession', entityId: session.id, newValue: { date: input.date, classId: input.classId, recordCount: input.records.length } });
    return session;
  },
  async history(auth) {
    const where = { tenantId: auth.tenantId };
    if (!auth.permissions.includes('attendance.update')) {
      if (!auth.staffId) return [];
      const assignments = await prisma.teacherAssignment.findMany({ where: { tenantId: auth.tenantId, staffId: auth.staffId, status: 'ACTIVE' }, select: { classId: true, academicPeriodId: true } });
      where.OR = assignments.map(({ classId, academicPeriodId }) => ({ classId, academicPeriodId }));
      if (!where.OR.length) return [];
    }
    const sessions = await prisma.attendanceSession.findMany({ where, take: 30, orderBy: { date: 'desc' }, include: { class: true, academicPeriod: true, records: true, createdBy: { select: { firstName: true, lastName: true } } } });
    return sessions.map((session) => { const counts = Object.fromEntries(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map((status) => [status, session.records.filter((item) => item.status === status).length])); return { ...session, records: undefined, counts, total: session.records.length, attendanceRate: session.records.length ? Math.round(((counts.PRESENT + counts.LATE) / session.records.length) * 1000) / 10 : 0 }; });
  },
  async statistics(auth) {
    const [sessions, currentPeriod] = await Promise.all([
      prisma.attendanceSession.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { date: 'desc' },
        include: { class: true, academicPeriod: true, records: { select: { status: true } } },
      }),
      prisma.academicPeriod.findFirst({
        where: { tenantId: auth.tenantId, isCurrent: true, status: 'ACTIVE' },
        include: { academicYear: { include: { classes: { where: { status: 'ACTIVE' }, orderBy: [{ levelOrder: 'asc' }, { name: 'asc' }] } } } },
      }),
    ]);
    const classes = new Map();
    for (const schoolClass of currentPeriod?.academicYear.classes || []) {
      classes.set(`${schoolClass.id}:${currentPeriod.id}`, {
        classId: schoolClass.id,
        className: `${schoolClass.name}${schoolClass.section ? ` ${schoolClass.section}` : ''}`,
        academicPeriodId: currentPeriod.id,
        academicPeriod: currentPeriod.name,
        sessions: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
        lastRecordedAt: null,
      });
    }
    for (const session of sessions) {
      const key = `${session.classId}:${session.academicPeriodId}`;
      const item = classes.get(key) || {
        classId: session.classId,
        className: `${session.class.name}${session.class.section ? ` ${session.class.section}` : ''}`,
        academicPeriodId: session.academicPeriodId,
        academicPeriod: session.academicPeriod.name,
        sessions: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
        lastRecordedAt: session.date,
      };
      if (!item.lastRecordedAt) item.lastRecordedAt = session.date;
      item.sessions += 1;
      item.total += session.records.length;
      for (const record of session.records) item[record.status.toLowerCase()] += 1;
      classes.set(key, item);
    }
    return [...classes.values()].map((item) => ({
      ...item,
      attendanceRate: item.total ? Math.round(((item.present + item.late) / item.total) * 1000) / 10 : 0,
    }));
  },
};
