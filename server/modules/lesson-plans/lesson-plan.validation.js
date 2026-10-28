import { z } from 'zod';

const id = z.string().trim().min(1).max(191);
const shortText = z.string().trim().max(300).default('');
const longText = z.string().trim().max(2000).default('');
export const lessonWeekSchema = z.object({
  week: z.number().int().min(1).max(16),
  durationMinutes: z.number().int().min(20).max(180),
  topic: shortText, strand: shortText, subStrand: shortText,
  contentStandard: shortText, indicator: shortText,
  performanceIndicator: longText, coreCompetencies: longText,
  resources: longText, keywords: shortText,
  starter: longText, mainActivity: longText, assessment: longText,
  plenary: longText, reflection: longText,
}).strict();

export const createLessonBody = z.object({
  title: z.string().trim().min(3).max(150),
  classId: id, subjectId: id, academicPeriodId: id,
  weekCount: z.number().int().min(1).max(16).default(12),
  durationMinutes: z.number().int().min(20).max(180).default(60),
  topics: z.array(z.string().trim().max(300)).max(16).default([]),
}).strict().refine(value => value.topics.length <= value.weekCount, {
  message: 'Provide no more topics than the number of weeks', path: ['topics'],
});
export const updateLessonBody = z.object({
  title: z.string().trim().min(3).max(150),
  revision: z.number().int().positive(),
  status: z.enum(['DRAFT', 'READY', 'ARCHIVED']),
  weeks: z.array(lessonWeekSchema).min(1).max(16),
}).strict().refine(value => value.weeks.every((week, index) => week.week === index + 1), {
  message: 'Weeks must be unique and numbered consecutively from 1', path: ['weeks'],
});
export const createLessonSchema = z.object({ body: createLessonBody, params: z.object({}), query: z.object({}) });
export const updateLessonSchema = z.object({ body: updateLessonBody, params: z.object({ id }), query: z.object({}) });
export const getLessonSchema = z.object({ body: z.any(), params: z.object({ id }), query: z.object({}) });
export const listLessonSchema = z.object({
  body: z.any(), params: z.object({}), query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().trim().max(100).default(''),
    status: z.enum(['DRAFT', 'READY', 'ARCHIVED']).optional(),
    scope: z.enum(['mine', 'school']).default('mine'),
  }),
});
