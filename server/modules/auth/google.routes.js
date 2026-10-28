import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { AppError } from '../../errors/app-error.js';
import { createGoogleIdentity } from './google-identity.js';
import { createGoogleService } from './google.service.js';
import { createGoogleRateLimit, googleRequestOrigin } from './google-security.js';

const google = new OAuth2Client();
const identity = createGoogleIdentity({ clientId: env.GOOGLE_CLIENT_ID, secret: env.JWT_SECRET, verifyIdToken: (options) => google.verifyIdToken(options) });
const service = createGoogleService({ db: prisma, identity, clientId: env.GOOGLE_CLIENT_ID, hashPassword: bcrypt.hash, signSession: (user, permissions) => jwt.sign({ tenantId: user.tenantId, permissions }, env.JWT_SECRET, { subject: user.id, expiresIn: env.JWT_EXPIRES_IN }) });
const envelope = (body) => z.object({ body, params: z.any(), query: z.any() });
const credentials = z.object({ credential: z.string().min(1).max(10000), challenge: z.string().min(1).max(1000) });
export const googleSignupBody = credentials.extend({ name: z.string().trim().min(2).max(150), slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), requestedPlan: z.enum(['FREEMIUM','STARTER','PROFESSIONAL','ENTERPRISE']).default('FREEMIUM'), billingCycle: z.enum(['MONTHLY','ANNUAL']).default('MONTHLY'), schoolCode: z.string().trim().min(2).max(30).regex(/^[a-zA-Z0-9-]+$/).transform((value) => value.toUpperCase()) }).strict();
export const googleRouter = Router();
googleRouter.get('/config', asyncHandler(async (_req, res) => res.set('Cache-Control', 'no-store').json({ success: true, data: await service.config() })));
googleRouter.use(googleRequestOrigin(env.CLIENT_URL), createGoogleRateLimit());
googleRouter.post('/challenge', validate(envelope(z.object({ intent: z.enum(['signin', 'signup']) }).strict())), asyncHandler(async (req, res) => {
  if (req.validated.body.intent === 'signup' && !(await service.config()).signupEnabled) throw new AppError('School registration is currently unavailable.', 403, 'REGISTRATION_DISABLED');
  res.set('Cache-Control', 'no-store').json({ success: true, data: { challenge: identity.challenge(req.validated.body.intent) } });
}));
for (const intent of ['signin', 'signup']) {
  googleRouter.post(`/${intent}`, validate(envelope(intent === 'signup' ? googleSignupBody : credentials.strict())), asyncHandler(async (req, res) => {
    const data = await service.authenticate(intent, req.validated.body, { ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.set('Cache-Control', 'no-store').status(intent === 'signup' ? 201 : 200).json({ success: true, data });
  }));
}
