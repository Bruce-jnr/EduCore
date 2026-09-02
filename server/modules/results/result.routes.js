import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolve-tenant.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { resultService } from './result.service.js';
import {
  assessmentSchemeSchema,
  gradingSchemeSchema,
  resultRosterSchema,
  saveScoresSchema,
  sheetActionSchema,
  reportCardsSchema,
} from './result.validation.js';

export const resultRouter = Router();
resultRouter.use(authenticate, resolveTenant);
resultRouter.get(
  '/',
  requirePermission('results.view'),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await resultService.overview(req.auth),
      message: null,
    }),
  ),
);

resultRouter.post(
  '/assessment-schemes',
  requirePermission('assessments.manage'),
  validate(assessmentSchemeSchema),
  asyncHandler(async (req, res) =>
    res.status(201).json({
      success: true,
      data: await resultService.createAssessmentScheme(
        req.auth,
        req.validated.body,
      ),
      message: 'Assessment scheme created',
    }),
  ),
);

resultRouter.post(
  '/grading-schemes',
  requirePermission('grading.manage'),
  validate(gradingSchemeSchema),
  asyncHandler(async (req, res) =>
    res.status(201).json({
      success: true,
      data: await resultService.createGradingScheme(
        req.auth,
        req.validated.body,
      ),
      message: 'Grading scheme created',
    }),
  ),
);

resultRouter.get(
  '/roster',
  requirePermission('results.view'),
  validate(resultRosterSchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await resultService.roster(req.auth, req.validated.query),
      message: null,
    }),
  ),
);

resultRouter.put(
  '/scores',
  requirePermission('results.enter'),
  validate(saveScoresSchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await resultService.saveScores(req.auth, req.validated.body),
      message: 'Result draft saved',
    }),
  ),
);

resultRouter.post(
  '/sheets/:id/submit',
  requirePermission('results.submit'),
  validate(sheetActionSchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await resultService.submit(req.auth, req.validated.params.id),
      message: 'Results submitted for review',
    }),
  ),
);

resultRouter.post(
  '/sheets/:id/approve',
  requirePermission('results.approve'),
  validate(sheetActionSchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await resultService.review(
        req.auth,
        req.validated.params.id,
        'APPROVE',
      ),
      message: 'Results approved',
    }),
  ),
);

resultRouter.post(
  '/sheets/:id/reject',
  requirePermission('results.approve'),
  validate(sheetActionSchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await resultService.review(
        req.auth,
        req.validated.params.id,
        'REJECT',
        req.validated.body.reason,
      ),
      message: 'Results returned to teacher',
    }),
  ),
);

resultRouter.get(
  '/report-cards',
  requirePermission('results.view'),
  validate(reportCardsSchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await resultService.reportCards(req.auth, req.validated.query),
      message: null,
    }),
  ),
);
