import { z } from 'zod';

const request = (body = z.any(), query = z.any()) =>
  z.object({ body, params: z.any(), query });
const id = z.string().min(1);

export const assessmentSchemeSchema = request(
  z.object({
    name: z.string().trim().min(2).max(100),
    academicYearId: id,
    academicPeriodId: id.optional().or(z.literal('')),
    classId: id.optional().or(z.literal('')),
    components: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(80),
          weight: z.coerce.number().positive().max(100),
          maximumScore: z.coerce.number().positive().max(10000).optional(),
        }),
      )
      .min(1)
      .max(20),
  }),
);

export const gradingSchemeSchema = request(
  z.object({
    name: z.string().trim().min(2).max(100),
    isDefault: z.boolean().optional().default(false),
    boundaries: z
      .array(
        z.object({
          grade: z.string().trim().min(1).max(10),
          minimumScore: z.coerce.number().min(0).max(100),
          maximumScore: z.coerce.number().min(0).max(100),
          remark: z.string().trim().max(100).optional(),
          gradePoint: z.coerce.number().min(0).max(10).optional(),
        }),
      )
      .min(1)
      .max(30),
  }),
);

export const resultRosterSchema = request(
  z.any(),
  z.object({
    academicPeriodId: id,
    classId: id,
    subjectId: id,
    assessmentSchemeId: id,
  }),
);

export const saveScoresSchema = request(
  z.object({
    academicPeriodId: id,
    classId: id,
    subjectId: id,
    assessmentSchemeId: id,
    scores: z
      .array(
        z.object({
          studentId: id,
          componentId: id,
          rawScore: z.coerce.number().min(0).max(10000),
        }),
      )
      .max(5000),
  }),
);

export const sheetActionSchema = z.object({
  body: z.object({ reason: z.string().trim().min(3).max(500).optional() }),
  query: z.any(),
  params: z.object({ id }),
});

export const reportCardsSchema = request(
  z.any(),
  z.object({ academicPeriodId: id, classId: id }),
);
