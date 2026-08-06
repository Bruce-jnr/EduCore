import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolve-tenant.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { settingsService } from './settings.service.js';
import { logoUploadSchema, reportCardSettingsSchema, updateSettingsSchema } from './settings.validation.js';

export const settingsRouter = Router();
settingsRouter.use(authenticate, resolveTenant);
settingsRouter.get('/', requirePermission('settings.view'), asyncHandler(async (req, res) => res.json({ success: true, data: await settingsService.get(req.auth.tenantId), message: null })));
settingsRouter.patch('/', requirePermission('settings.update'), validate(updateSettingsSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await settingsService.update(req.auth, req.validated.body), message: 'School settings updated' })));
settingsRouter.patch('/report-card', requirePermission('settings.update'), validate(reportCardSettingsSchema), asyncHandler(async (req, res) => res.json({ success: true, data: await settingsService.updateReportCard(req.auth, req.validated.body), message: 'Report-card letterhead updated' })));
settingsRouter.post('/logo', requirePermission('settings.update'), validate(logoUploadSchema), asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await settingsService.uploadLogo(req.auth, req.validated.body.dataUrl), message: 'School logo uploaded' })));
