import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { auditService } from '../../services/audit.service.js';
import { authRepository } from './auth.repository.js';

function accessFromUser(user) {
  return {
    roles: user.userRoles.map(({ role }) => role.name),
    permissions: [
      ...new Set(
        user.userRoles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.key),
        ),
      ),
    ],
  };
}

export const authService = {
  async login(credentials, requestMeta) {
    const user = await authRepository.findTenantUser(
      credentials.schoolSlug,
      credentials.email,
    );
    const passwordMatches = user
      ? await bcrypt.compare(credentials.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      throw new AppError(
        'Invalid school, email, or password',
        401,
        'INVALID_CREDENTIALS',
      );
    }

    const access = accessFromUser(user);
    const token = jwt.sign(
      { tenantId: user.tenantId, permissions: access.permissions },
      env.JWT_SECRET,
      { subject: user.id, expiresIn: env.JWT_EXPIRES_IN },
    );

    await Promise.all([
      authRepository.recordLogin(user.id),
      auditService.log({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'LOGIN',
        module: 'AUTH',
        entityType: 'User',
        entityId: user.id,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      }),
    ]);

    return {
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
        },
        ...access,
      },
    };
  },
};
