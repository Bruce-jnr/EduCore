import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolve-tenant.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { currentUser, login } from './auth.controller.js';
import { loginSchema } from './auth.validation.js';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), asyncHandler(login));
authRouter.get('/me', authenticate, resolveTenant, currentUser);
