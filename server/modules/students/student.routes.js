import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { resolveTenant } from '../../middleware/resolve-tenant.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { createStudent, getStudent, listStudents } from './student.controller.js';
import { createStudentSchema, listStudentsSchema, studentIdSchema } from './student.validation.js';

export const studentRouter = Router();
studentRouter.use(authenticate, resolveTenant);
studentRouter.get('/', requirePermission('students.view'), validate(listStudentsSchema), asyncHandler(listStudents));
studentRouter.get('/:id', requirePermission('students.view'), validate(studentIdSchema), asyncHandler(getStudent));
studentRouter.post('/', requirePermission('students.create'), validate(createStudentSchema), asyncHandler(createStudent));
