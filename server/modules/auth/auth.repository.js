import { prisma } from '../../config/prisma.js';

const userAccess = {
  userRoles: {
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  },
};

export const authRepository = {
  findTenantUser(schoolSlug, email) {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
        tenant: { slug: schoolSlug, isActive: true },
      },
      include: { tenant: true, ...userAccess },
    });
  },
  recordLogin(userId) {
    return prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  },
};
