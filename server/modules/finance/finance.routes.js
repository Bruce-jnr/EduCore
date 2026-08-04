import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolve-tenant.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { financeService } from './finance.service.js';
import { bulkInvoiceSchema, categorySchema, invoiceSchema, paymentSchema, structureSchema } from './finance.validation.js';

export const financeRouter = Router();
financeRouter.use(authenticate, resolveTenant);
const response = (service, message, status = 201) => asyncHandler(async (req, res) => res.status(status).json({ success: true, data: await service(req.auth, req.validated?.body), message }));
financeRouter.get('/', requirePermission('finance.view'), asyncHandler(async (req, res) => res.json({ success: true, data: await financeService.overview(req.auth.tenantId), message: null })));
financeRouter.post('/categories', requirePermission('finance.fees.create'), validate(categorySchema), response(financeService.category, 'Fee category created'));
financeRouter.post('/structures', requirePermission('finance.fees.create'), validate(structureSchema), response(financeService.structure, 'Fee structure created'));
financeRouter.post('/invoices', requirePermission('finance.invoice.create'), validate(invoiceSchema), response(financeService.invoice, 'Student bill created'));
financeRouter.post('/invoices/bulk', requirePermission('finance.invoice.create'), validate(bulkInvoiceSchema), response(financeService.bulkInvoice, 'Bulk bills created'));
financeRouter.post('/payments', requirePermission('finance.payment.create'), validate(paymentSchema), response(financeService.payment, 'Payment recorded'));
