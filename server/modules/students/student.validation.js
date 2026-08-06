import { z } from 'zod';

export const listStudentsSchema = z.object({ body: z.any(), params: z.any(), query: z.object({
  page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'GRADUATED', 'SUSPENDED', 'ARCHIVED']).optional(),
}) });
export const createGuardianSchema=z.object({query:z.any(),params:z.object({id:z.string().min(1)}),body:z.object({firstName:z.string().trim().min(1).max(80),lastName:z.string().trim().min(1).max(80),phone:z.string().trim().min(5).max(30),email:z.union([z.email(),z.literal('')]).optional(),address:z.string().trim().max(250).optional(),occupation:z.string().trim().max(100).optional(),relationship:z.string().trim().min(2).max(50),isPrimary:z.boolean().default(false),isEmergencyContact:z.boolean().default(false),isFinanciallyResponsible:z.boolean().default(false)})});
export const studentIdSchema = z.object({ body: z.any(), query: z.any(), params: z.object({ id: z.string().min(1) }) });
export const createStudentSchema = z.object({ query: z.any(), params: z.any(), body: z.object({
  studentNumber: z.string().trim().min(2).max(40), firstName: z.string().trim().min(1).max(80), middleName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().min(1).max(80), dateOfBirth: z.coerce.date().optional(), gender: z.string().trim().max(30).optional(),
  email: z.email().optional(), phone: z.string().trim().max(30).optional(), address: z.string().trim().max(250).optional(), admissionDate: z.coerce.date().optional(),
  classId: z.string().optional(), academicYearId: z.string().optional(),
}) });
const optionalDate = z.union([z.coerce.date(), z.literal('').transform(() => null)]).optional();
const optionalEmail = z.union([z.email(), z.literal('').transform(() => null)]).optional();
export const updateStudentSchema = z.object({ query: z.any(), params: z.object({ id: z.string().min(1) }), body: z.object({
  studentNumber: z.string().trim().min(2).max(40).optional(), firstName: z.string().trim().min(1).max(80).optional(), middleName: z.string().trim().max(80).nullable().optional(),
  lastName: z.string().trim().min(1).max(80).optional(), dateOfBirth: optionalDate, gender: z.string().trim().max(30).nullable().optional(),
  email: optionalEmail, phone: z.string().trim().max(30).nullable().optional(), address: z.string().trim().max(250).nullable().optional(), admissionDate: optionalDate,
  status: z.enum(['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'GRADUATED', 'SUSPENDED', 'ARCHIVED']).optional(),
}).strict().refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' }) });
