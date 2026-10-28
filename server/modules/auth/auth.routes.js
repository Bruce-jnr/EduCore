import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveBillingTenant } from '../../middleware/resolve-billing-tenant.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { currentUser, login } from './auth.controller.js';
import { loginSchema } from './auth.validation.js';

import { googleRouter } from './google.routes.js';

export const authRouter = Router();
authRouter.use('/google', googleRouter);

authRouter.post('/login', validate(loginSchema), asyncHandler(login));
authRouter.get('/me', authenticate, resolveBillingTenant, currentUser);
