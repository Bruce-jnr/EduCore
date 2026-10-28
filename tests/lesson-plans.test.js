import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonWeeks, incompleteWeeks, lessonBooklet } from '../server/modules/lesson-plans/lesson-plan.template.js';
import { createLessonBody, updateLessonBody } from '../server/modules/lesson-plans/lesson-plan.validation.js';
import { createLessonPlanService } from '../server/modules/lesson-plans/lesson-plan.service.js';

const auth = { tenantId: 'school-a', userId: 'teacher-a', staffId: 'staff-a', permissions: ['lesson-plans.view', 'lesson-plans.manage'] };
const input = { title: 'Term lesson notes', classId: 'class-a', subjectId: 'subject-a', academicPeriodId: 'term-a', weekCount: 2, durationMinutes: 60, topics: ['Numbers', 'Operations'] };
function validContext(overrides = {}) {
  return {
    academicPeriod: { findFirst: async () => ({ id: 'term-a', academicYearId: 'year-a' }) },
    class: { findFirst: async () => ({ id: 'class-a' }) },
    subject: { findFirst: async () => ({ id: 'subject-a' }) },
    formTeacherAssignment: { findFirst: async () => ({ id: 'assignment-a' }) },
    teacherAssignment: { findFirst: async () => null },
    ...overrides,
  };
}
function transactional(tx) { return { $transaction: async work => work(tx) }; }
const isError = (status, code) => error => error.statusCode === status && error.code === code;

test('builds a 12-week editable structure without inventing curriculum or activities', () => {
  const weeks = buildLessonWeeks(['  Teacher topic  '], 12);
  assert.equal(weeks.length, 12);
  assert.deepEqual(weeks.map(week => week.week), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.equal(weeks[0].topic, 'Teacher topic');
  assert.equal(weeks[1].topic, '');
  assert.equal(weeks[0].starter, '');
  assert.equal(weeks[0].indicator, '');
  assert.equal(weeks[0].durationMinutes, 60);
  weeks[0].topic = 'Changed';
  assert.equal(weeks[1].topic, '');
});
test('finds incomplete weeks before marking ready', () => {
  const weeks = buildLessonWeeks(['Topic'], 1);
  assert.deepEqual(incompleteWeeks(weeks), [1]);
  for (const field of ['performanceIndicator', 'resources', 'starter', 'mainActivity', 'assessment', 'plenary']) weeks[0][field] = 'Teacher-entered content';
  assert.deepEqual(incompleteWeeks(weeks), []);
});
test('rejects forged ownership, tenant identifiers and oversized input', () => {
  assert.equal(createLessonBody.safeParse({ ...input, tenantId: 'school-b' }).success, false);
  assert.equal(createLessonBody.safeParse({ ...input, authorId: 'someone-else' }).success, false);
  assert.equal(createLessonBody.safeParse({ ...input, weekCount: 17 }).success, false);
  assert.equal(createLessonBody.safeParse({ ...input, topics: ['x'.repeat(301)] }).success, false);
  assert.equal(createLessonBody.safeParse({ ...input, weekCount: 1 }).success, false);
});
test('requires consecutive unique weeks and an update revision', () => {
  const body = { title: input.title, revision: 1, status: 'DRAFT', weeks: buildLessonWeeks([], 2) };
  assert.equal(updateLessonBody.safeParse(body).success, true);
  assert.equal(updateLessonBody.safeParse({ ...body, revision: undefined }).success, false);
  assert.equal(updateLessonBody.safeParse({ ...body, weeks: [body.weeks[0], body.weeks[0]] }).success, false);
});
test('teacher read lookup scopes both school and author', async () => {
  let where;
  const service = createLessonPlanService({ lessonPlan: { findFirst: async args => { where = args.where; return null; } } });
  await assert.rejects(service.get(auth, 'foreign-plan'), isError(404, 'LESSON_PLAN_NOT_FOUND'));
  assert.deepEqual(where, { id: 'foreign-plan', tenantId: 'school-a', authorId: 'teacher-a' });
});
test('reviewers retain school isolation while reading another author', async () => {
  let where;
  const service = createLessonPlanService({ lessonPlan: { findFirst: async args => { where = args.where; return { id: 'plan-a' }; } } });
  await service.get({ ...auth, permissions: [...auth.permissions, 'lesson-plans.review'] }, 'plan-a');
  assert.deepEqual(where, { id: 'plan-a', tenantId: 'school-a' });
});
test('school library cannot be requested by a teacher', async () => {
  await assert.rejects(createLessonPlanService({}).list(auth, { scope: 'school' }), isError(403, 'LESSON_REVIEW_REQUIRED'));
});
test('invalid school/term references are rejected before any write', async () => {
  const tx = validContext({ academicPeriod: { findFirst: async args => { assert.equal(args.where.tenantId, auth.tenantId); return null; } } });
  await assert.rejects(createLessonPlanService(transactional(tx)).create(auth, input), isError(422, 'INVALID_LESSON_CONTEXT'));
});
test('unassigned teachers cannot create plans', async () => {
  const tx = validContext({ formTeacherAssignment: { findFirst: async () => null } });
  await assert.rejects(createLessonPlanService(transactional(tx)).create(auth, input), isError(403, 'LESSON_ASSIGNMENT_REQUIRED'));
});
test('subject-teacher assignment is sufficient even without form-teacher assignment', async () => {
  const events = [];
  const tx = validContext({
    formTeacherAssignment: { findFirst: async () => null }, teacherAssignment: { findFirst: async args => { assert.equal(args.where.subjectId, input.subjectId); return { id: 'subject-assignment' }; } },
    lessonPlan: { create: async ({ data }) => { events.push('create'); assert.equal(data.tenantId, auth.tenantId); assert.equal(data.authorId, auth.userId); return { ...data, id: 'plan-a', revision: 1, status: 'DRAFT' }; } },
    auditLog: { create: async ({ data }) => { events.push('audit'); assert.equal(data.tenantId, auth.tenantId); assert.equal(data.entityId, 'plan-a'); } },
  });
  const result = await createLessonPlanService(transactional(tx)).create(auth, input);
  assert.equal(result.weeks.length, 2);
  assert.deepEqual(events, ['create', 'audit']);
});
test('audit failure propagates out of the transaction callback', async () => {
  const tx = validContext({
    lessonPlan: { create: async ({ data }) => ({ ...data, id: 'plan-a', revision: 1, status: 'DRAFT' }) },
    auditLog: { create: async () => { throw new Error('audit unavailable'); } },
  });
  await assert.rejects(createLessonPlanService(transactional(tx)).create(auth, input), /audit unavailable/);
});
test('another author cannot update a plan, even with reviewer access', async () => {
  const tx = { lessonPlan: { findFirst: async ({ where }) => { assert.equal(where.authorId, auth.userId); return null; } } };
  await assert.rejects(createLessonPlanService(transactional(tx)).update({ ...auth, permissions: [...auth.permissions, 'lesson-plans.review'] }, 'plan-a', {}), isError(404, 'LESSON_PLAN_NOT_FOUND'));
});
test('stale revisions fail with a conflict and no audit write', async () => {
  const weeks = buildLessonWeeks(input.topics, 2);
  const tx = validContext({ lessonPlan: {
    findFirst: async () => ({ ...input, weekCount: 2 }),
    updateMany: async ({ where }) => { assert.equal(where.revision, 1); assert.equal(where.authorId, auth.userId); assert.equal(where.tenantId, auth.tenantId); return { count: 0 }; },
  } });
  await assert.rejects(createLessonPlanService(transactional(tx)).update(auth, 'plan-a', { title: input.title, status: 'DRAFT', revision: 1, weeks }), isError(409, 'LESSON_REVISION_CONFLICT'));
});
test('incomplete booklets cannot be marked ready', async () => {
  const tx = validContext({ lessonPlan: { findFirst: async () => input } });
  await assert.rejects(createLessonPlanService(transactional(tx)).update(auth, 'plan-a', { title: input.title, status: 'READY', revision: 1, weeks: buildLessonWeeks([], 2) }), isError(422, 'INCOMPLETE_LESSON_PLAN'));
});
test('a booklet cannot silently change its configured week count', async () => {
  const tx = validContext({ lessonPlan: { findFirst: async () => input } });
  await assert.rejects(createLessonPlanService(transactional(tx)).update(auth, 'plan-a', { weeks: buildLessonWeeks([], 1) }), isError(422, 'LESSON_WEEK_COUNT_MISMATCH'));
});
test('booklet export produces a term scheme and only selected author identity', () => {
  const weeks = buildLessonWeeks(['Topic one'], 2);
  const result = lessonBooklet({ title: input.title, templateVersion: 'teacher-template-v1', status: 'DRAFT', weekCount: 2, weeks, tenant: { name: 'School' }, author: { firstName: 'Teacher', lastName: 'A', passwordHash: 'must-not-export' }, class: { name: 'Primary 4' }, subject: { name: 'Mathematics' }, academicPeriod: { name: 'Term 1' } });
  assert.equal(result.scheme.length, 2);
  assert.equal(result.teacher, 'Teacher A');
  assert.equal(JSON.stringify(result).includes('must-not-export'), false);
  assert.match(result.notice, /Teacher-authored/);
});
