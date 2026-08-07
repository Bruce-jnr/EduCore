import { Router } from 'express';
import { prisma } from '../../config/prisma.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolve-tenant.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { validate } from '../../middleware/validate.js';
import { academicService } from './academic.service.js';
import { classSchema, periodSchema, progressionRosterSchema, progressionSchema, subjectSchema, yearSchema } from './academic.validation.js';
import { progressionService } from './progression.service.js';

export const academicRouter = Router();

academicRouter.get('/', authenticate, resolveTenant, requirePermission('academics.view'), asyncHandler(async(req,res)=>res.json({success:true,data:await academicService.overview(req.auth.tenantId),message:null})));
academicRouter.post('/years',authenticate,resolveTenant,requirePermission('academics.create'),validate(yearSchema),asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await academicService.createYear(req.auth,req.validated.body),message:'Academic year created'})));
academicRouter.post('/periods',authenticate,resolveTenant,requirePermission('academics.create'),validate(periodSchema),asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await academicService.createPeriod(req.auth,req.validated.body),message:'Academic period created'})));
academicRouter.post('/classes',authenticate,resolveTenant,requirePermission('academics.create'),validate(classSchema),asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await academicService.createClass(req.auth,req.validated.body),message:'Class created'})));
academicRouter.post('/subjects',authenticate,resolveTenant,requirePermission('academics.create'),validate(subjectSchema),asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await academicService.createSubject(req.auth,req.validated.body),message:'Subject created'})));
academicRouter.get('/progression/roster',authenticate,resolveTenant,requirePermission('academics.update'),validate(progressionRosterSchema),asyncHandler(async(req,res)=>res.json({success:true,data:await progressionService.roster(req.auth,req.validated.query),message:null})));
academicRouter.get('/progression/history',authenticate,resolveTenant,requirePermission('academics.update'),asyncHandler(async(req,res)=>res.json({success:true,data:await progressionService.history(req.auth),message:null})));
academicRouter.post('/progression',authenticate,resolveTenant,requirePermission('academics.update'),validate(progressionSchema),asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await progressionService.execute(req.auth,req.validated.body),message:'Year-end progression completed'})));

academicRouter.get('/options', authenticate, resolveTenant, asyncHandler(async (req, res) => {
  const tenantId = req.auth.tenantId;
  const restrictToAssignments = req.auth.staffId && (req.auth.permissions.includes('attendance.take') || req.auth.permissions.includes('results.enter')) && !req.auth.permissions.includes('academics.create') && !req.auth.permissions.includes('results.approve');
  const assignments = restrictToAssignments ? await prisma.teacherAssignment.findMany({ where: { tenantId, staffId: req.auth.staffId, status: 'ACTIVE' }, select: { academicYearId: true, academicPeriodId: true, classId: true, subjectId: true } }) : [];
  const assigned = (key) => [...new Set(assignments.map((item) => item[key]))];
  const [academicYears, academicPeriods, classes, subjects] = await prisma.$transaction([
    prisma.academicYear.findMany({ where: { tenantId, status: 'ACTIVE', ...(restrictToAssignments && { id: { in: assigned('academicYearId') } }) }, orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }] }),
    prisma.academicPeriod.findMany({ where: { tenantId, status: 'ACTIVE', ...(restrictToAssignments && { id: { in: assigned('academicPeriodId') } }) }, orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }] }),
    prisma.class.findMany({ where: { tenantId, status: 'ACTIVE', ...(restrictToAssignments && { id: { in: assigned('classId') } }) }, orderBy: [{ name: 'asc' }, { section: 'asc' }] }),
    prisma.subject.findMany({ where: { tenantId, status: 'ACTIVE', ...(restrictToAssignments && { id: { in: assigned('subjectId') } }) }, orderBy: { name: 'asc' } }),
  ]);
  res.json({ success: true, data: { academicYears, academicPeriods, classes, subjects }, message: null });
}));
