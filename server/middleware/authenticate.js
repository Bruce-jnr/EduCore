import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';

export async function authenticate(req, _res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;
    if (!token) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');

    const payload = jwt.verify(token, env.JWT_SECRET);
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, status: 'ACTIVE' },
      include: {
        userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    if (!user) throw new AppError('Session is no longer valid', 401, 'INVALID_SESSION');

    req.auth = {
      userId: user.id,
      tenantId: user.tenantId,
      isPlatformUser: user.isPlatformUser,
      roles: user.userRoles.map(({ role }) => role.name),
      permissions: [...new Set(user.userRoles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)))],
    };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}
