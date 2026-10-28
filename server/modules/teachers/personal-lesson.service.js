import {TEACHER_CONTENT_PACKS,contentPackSummary,findContentPack} from './teacher-content.js';
import { createLessonBilling } from './lesson-billing.service.js';
import { AppError } from '../../errors/app-error.js';
import { GHANA_LEVELS } from '../../../shared/ghana-curriculum.js';
import { buildLessonWeeks, incompleteWeeks, lessonBooklet, LESSON_TEMPLATE_VERSION } from '../lesson-plans/lesson-plan.template.js';
const extraSubjects = ['Biology','Chemistry','Physics','Geography','Economics','Literature in English','ICT','General Science'];
const subjects = [...new Map([...GHANA_LEVELS.flatMap(level => level.subjects).filter(item => item.slug !== 'secondary-curriculum-collection'), ...extraSubjects.map(name => ({ name, slug: name.toLowerCase().replaceAll(' ','-') }))].map(item => [item.slug, { id: item.slug, name: item.name, code: item.slug }])).values()];
const basicPeriods = [1,2,3].map(n => ({ id: `term-${n}`, name: `Term ${n}`, academicYearId: 'personal', academicYear: { name: 'Your academic year' }, isCurrent: n === 1 }));
const periods=[...basicPeriods,...[1,2].map(n=>({id:`semester-${n}`,name:`Semester ${n}`,academicYearId:'personal',academicYear:{name:'Your academic year'},isCurrent:false}))];
const classes = GHANA_LEVELS.map(item => ({ id: item.slug, name: item.name, academicYearId: 'personal', periodIds:item.slug.startsWith('shs-')?['semester-1','semester-2']:['term-1','term-2','term-3'], subjectIds: subjects.map(subject => subject.id) }));
const publicAuthor = teacher => ({ id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName });
function view(plan, teacher) {
  const pack=TEACHER_CONTENT_PACKS.find(item=>item.version===plan.templateVersion);
  return { ...plan, contentPack:pack?contentPackSummary(pack):null, author: publicAuthor(teacher), class: { id: plan.classKey, name: plan.className, academicYearId: 'personal' }, subject: { id: plan.subjectKey, name: plan.subjectName }, academicPeriod: { id: plan.termKey, name: plan.termName, academicYear: { name: plan.academicYearName } } };
}
const audit = (tx, teacher, action, planId) => tx.teacherActivity.create({ data: { teacherId: teacher.id, action, planId } });
export function createPersonalLessonService(db) {
  const billing=createLessonBilling(db);
  const service = {
    options() { return { contentPacks:TEACHER_CONTENT_PACKS.map(contentPackSummary), classes, subjects, academicPeriods: basicPeriods, assignments: classes.flatMap(item => periods.filter(period=>item.periodIds.includes(period.id)).map(period => ({ classId: item.id, academicPeriodId: period.id, subjectId: null }))), canReview: false, defaultWeekCount: 12, templateVersion: LESSON_TEMPLATE_VERSION }; },
    async list(teacher, query) {
      if (query.scope !== 'mine') throw new AppError('Personal teacher accounts have a private library only.', 403, 'PERSONAL_LIBRARY_ONLY');
      const where = { teacherId: teacher.id, status: query.status || { not: 'ARCHIVED' }, ...(query.search && { OR: [{ title: { contains: query.search } }, { subjectName: { contains: query.search } }] }) };
      const [items, total] = await Promise.all([db.personalLessonPlan.findMany({ where, skip: (query.page-1)*query.limit, take: query.limit, orderBy: { updatedAt: 'desc' } }), db.personalLessonPlan.count({ where })]);
      return { items: items.map(item => view(item,teacher)), total, page: query.page, pages: Math.ceil(total/query.limit) };
    },
    async get(teacher,id) {
      const plan = await db.personalLessonPlan.findFirst({ where: { id, teacherId: teacher.id } });
      if (!plan) throw new AppError('Personal lesson plan not found.', 404, 'LESSON_PLAN_NOT_FOUND');
      return view(plan,teacher);
    },
    async create(teacher,input) {
      const selectedClass = classes.find(item => item.id === input.classId);
      const subject = subjects.find(item => item.id === input.subjectId);
      const period = periods.find(item => item.id === input.academicPeriodId);
      if (!selectedClass || !subject || !period || !selectedClass.periodIds.includes(period.id)) throw new AppError('Choose a valid teaching level, subject and term.', 422, 'INVALID_PERSONAL_CONTEXT');
      const pack=input.contentPackId?findContentPack(input.contentPackId):null;
      if(input.contentPackId&&(!pack||pack.classId!==selectedClass.id||pack.subjectId!==subject.id||pack.weekCount!==input.weekCount||(input.topics||[]).some(topic=>topic.trim())))throw new AppError('Choose a matching ready-to-use pack with its original week count. Edit topics after creating the booklet.',422,'INVALID_CONTENT_PACK');
      const weeks=pack?pack.weeks.map(week=>({...week,durationMinutes:input.durationMinutes||60})):buildLessonWeeks(input.topics,input.weekCount,input.durationMinutes);
      return db.$transaction(async tx => {
        const plan = await tx.personalLessonPlan.create({ data: { teacherId: teacher.id, title: input.title, classKey: selectedClass.id, className: selectedClass.name, subjectKey: subject.id, subjectName: subject.name, termKey: period.id, termName: period.name, academicYearName: input.academicYearName, weekCount: input.weekCount, weeks, templateVersion: pack?.version||LESSON_TEMPLATE_VERSION } });
        await audit(tx,teacher,'CREATE_LESSON',plan.id); return view(plan,teacher);
      });
    },
    async update(teacher,id,input) {
      return db.$transaction(async tx => {
        const plan = await tx.personalLessonPlan.findFirst({ where: { id, teacherId: teacher.id } });
        if (!plan) throw new AppError('Personal lesson plan not found.', 404, 'LESSON_PLAN_NOT_FOUND');
        if (input.weeks.length !== plan.weekCount) throw new AppError('Keep the original number of teaching weeks.',422,'LESSON_WEEK_COUNT_MISMATCH');
        const missing = input.status === 'READY' ? incompleteWeeks(input.weeks) : [];
        if (missing.length) throw new AppError(`Complete the required activities for weeks ${missing.join(', ')}.`,422,'INCOMPLETE_LESSON_PLAN');
        const updated = await tx.personalLessonPlan.updateMany({ where: { id, teacherId: teacher.id, revision: input.revision }, data: { title: input.title, status: input.status, weeks: input.weeks, revision: { increment: 1 } } });
        if (updated.count !== 1) throw new AppError('This booklet changed elsewhere. Reload before saving.',409,'LESSON_REVISION_CONFLICT');
        const current = await tx.personalLessonPlan.findFirst({ where: { id, teacherId: teacher.id } });
        await audit(tx,teacher,'UPDATE_LESSON',id); return view(current,teacher);
      });
    },
    async booklet(teacher,id) {
      const plan = await service.get(teacher,id);
      await billing.requirePaid(teacher,id);
      const document=lessonBooklet({ ...plan, tenant: { name: `${teacher.firstName} ${teacher.lastName} · Personal lesson plans`, schoolCode: 'PERSONAL', country: 'Ghana' } });
      if(plan.contentPack){document.notice=`${plan.contentPack.notice} Source: ${plan.contentPack.sourceUrl}. Teacher-edited draft; review before teaching.`;}
      return document;
    },
  };
  return service;
}
