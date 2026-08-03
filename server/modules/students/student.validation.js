import { z } from 'zod';

export const listStudentsSchema = z.object({ body: z.any(), params: z.any(), query: z.object({
  page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'GRADUATED', 'SUSPENDED', 'ARCHIVED']).optional(),
}) });
export const studentIdSchema = z.object({ body: z.any(), query: z.any(), params: z.object({ id: z.string().min(1) }) });
export const createStudentSchema = z.object({ query: z.any(), params: z.any(), body: z.object({
  studentNumber: z.string().trim().min(2).max(40), firstName: z.string().trim().min(1).max(80), middleName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().min(1).max(80), dateOfBirth: z.coerce.date().optional(), gender: z.string().trim().max(30).optional(),
  email: z.email().optional(), phone: z.string().trim().max(30).optional(), address: z.string().trim().max(250).optional(), admissionDate: z.coerce.date().optional(),
  classId: z.string().optional(), academicYearId: z.string().optional(),
}) });
