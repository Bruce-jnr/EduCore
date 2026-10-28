import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePlatformPermission } from '../../middleware/require-platform-permission.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { platformService } from './platform.service.js';
import { platformAnalyticsService } from './platform-analytics.service.js';
import { platformAuditService } from './platform-audit.service.js';
import {
  auditQuerySchema,
  createSchoolSchema,
  platformLoginSchema,
  platformSettingsSchema,
  schoolStatusSchema,
  subscriptionSchema,
  subscriptionPaymentSchema,
} from './platform.validation.js';
import { createLessonBilling } from '../teachers/lesson-billing.service.js';
import {
  lessonVerifySchema,
  lessonPaymentsListSchema,
} from '../teachers/lesson-billing.validation.js';
import { prisma } from '../../config/prisma.js';
const lessonBilling = createLessonBilling(prisma);
import { paystackService } from '../payments/paystack.runtime.js';
import { paymentVerifySchema } from '../payments/paystack.routes.js';
export const platformRouter = Router();
platformRouter.get(
  '/paystack-payments',
  authenticate,
  requirePlatformPermission('platform.schools.view'),
  asyncHandler(async (_req, res) =>
    res.json({ success: true, data: await paystackService.list() }),
  ),
);
platformRouter.post(
  '/paystack-payments/reconcile',
  authenticate,
  requirePlatformPermission('platform.schools.update'),
  validate(paymentVerifySchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await paystackService.reconcile(req.validated.body.reference),
    }),
  ),
);
platformRouter.get(
  '/teacher-lesson-payments',
  authenticate,
  requirePlatformPermission('platform.schools.view'),
  validate(lessonPaymentsListSchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await lessonBilling.list(req.validated.query.status),
    }),
  ),
);
platformRouter.post(
  '/teacher-lesson-payments/:id/verify',
  authenticate,
  requirePlatformPermission('platform.schools.update'),
  validate(lessonVerifySchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await lessonBilling.verify(
        req.auth,
        req.validated.params.id,
        req.validated.body,
      ),
    }),
  ),
);
platformRouter.post(
  '/auth/login',
  validate(platformLoginSchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await platformService.login(req.validated.body),
      message: 'Platform sign-in successful',
    }),
  ),
);
platformRouter.get(
  '/auth/me',
  authenticate,
  requirePlatformPermission('platform.schools.view'),
  (req, res) =>
    res.json({ success: true, data: { auth: req.auth }, message: null }),
);
platformRouter.get(
  '/schools',
  authenticate,
  requirePlatformPermission('platform.schools.view'),
  asyncHandler(async (_req, res) =>
    res.json({
      success: true,
      data: await platformService.overview(),
      message: null,
    }),
  ),
);
platformRouter.post(
  '/schools',
  authenticate,
  requirePlatformPermission('platform.schools.create'),
  validate(createSchoolSchema),
  asyncHandler(async (req, res) =>
    res.status(201).json({
      success: true,
      data: await platformService.createSchool(req.auth, req.validated.body),
      message: 'School tenant created',
    }),
  ),
);
platformRouter.patch(
  '/schools/:id/status',
  authenticate,
  requirePlatformPermission('platform.schools.update'),
  validate(schoolStatusSchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await platformService.setStatus(
        req.auth,
        req.validated.params.id,
        req.validated.body.isActive,
      ),
      message: 'School status updated',
    }),
  ),
);
platformRouter.patch(
  '/schools/:id/subscription',
  authenticate,
  requirePlatformPermission('platform.schools.update'),
  validate(subscriptionSchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await platformService.updateSubscription(
        req.auth,
        req.validated.params.id,
        req.validated.body,
      ),
      message: 'School subscription updated',
    }),
  ),
);
platformRouter.post(
  '/schools/:id/subscription/payments',
  authenticate,
  requirePlatformPermission('platform.schools.update'),
  validate(subscriptionPaymentSchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await platformService.recordSubscriptionPayment(
        req.auth,
        req.validated.params.id,
        req.validated.body,
      ),
    }),
  ),
);
platformRouter.get(
  '/schools/:id/subscription/payments',
  authenticate,
  requirePlatformPermission('platform.schools.view'),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await platformService.subscriptionPayments(req.params.id),
    }),
  ),
);
platformRouter.get(
  '/settings',
  authenticate,
  requirePlatformPermission('platform.settings.view'),
  asyncHandler(async (_req, res) =>
    res.json({
      success: true,
      data: await platformService.getSettings(),
      message: null,
    }),
  ),
);
platformRouter.patch(
  '/settings',
  authenticate,
  requirePlatformPermission('platform.settings.update'),
  validate(platformSettingsSchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await platformService.updateSettings(req.auth, req.validated.body),
      message: 'Platform settings updated',
    }),
  ),
);
platformRouter.get(
  '/analytics',
  authenticate,
  requirePlatformPermission('platform.analytics.view'),
  asyncHandler(async (_req, res) =>
    res.json({
      success: true,
      data: await platformAnalyticsService.get(),
      message: null,
    }),
  ),
);
platformRouter.get(
  '/audit-logs',
  authenticate,
  requirePlatformPermission('platform.audit.view'),
  validate(auditQuerySchema),
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await platformAuditService.list(req.validated.query),
      message: null,
    }),
  ),
);
