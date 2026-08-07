import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolve-tenant.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { notificationService } from '../../services/notification.service.js';

export const notificationRouter = Router();
notificationRouter.use(authenticate, resolveTenant);
notificationRouter.get(
  '/',
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await notificationService.list(req.auth.tenantId, req.auth.userId),
      message: null,
    }),
  ),
);
notificationRouter.patch(
  '/read-all',
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await notificationService.markAllRead(
        req.auth.tenantId,
        req.auth.userId,
      ),
      message: 'Notifications marked as read',
    }),
  ),
);
notificationRouter.patch(
  '/:id/read',
  asyncHandler(async (req, res) =>
    res.json({
      success: true,
      data: await notificationService.markRead(
        req.auth.tenantId,
        req.auth.userId,
        req.params.id,
      ),
      message: 'Notification marked as read',
    }),
  ),
);
