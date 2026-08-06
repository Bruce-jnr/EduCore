import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { resolveTenant } from '../../middleware/resolve-tenant.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { createStudent, getStudent, listStudents, updateStudent } from './student.controller.js';
import { createGuardianSchema, createStudentSchema, listStudentsSchema, studentIdSchema, updateStudentSchema } from './student.validation.js';
import { studentService } from './student.service.js';

export const studentRouter = Router();
studentRouter.use(authenticate, resolveTenant);
studentRouter.get('/', requirePermission('students.view'), validate(listStudentsSchema), asyncHandler(listStudents));
studentRouter.get('/:id', requirePermission('students.view'), validate(studentIdSchema), asyncHandler(getStudent));
studentRouter.post('/', requirePermission('students.create'), validate(createStudentSchema), asyncHandler(createStudent));
studentRouter.patch('/:id', requirePermission('students.update'), validate(updateStudentSchema), asyncHandler(updateStudent));
studentRouter.post('/:id/guardians', requirePermission('guardians.create'), validate(createGuardianSchema), asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await studentService.addGuardian(req.auth,req.validated.params.id,req.validated.body),message:'Guardian linked to student'})));
