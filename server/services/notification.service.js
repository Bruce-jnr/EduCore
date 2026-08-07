import { prisma } from '../config/prisma.js';

async function usersWithPermission(tenantId, permission) {
  return prisma.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: 'ACTIVE',
      userRoles: {
        some: {
          role: { permissions: { some: { permission: { key: permission } } } },
        },
      },
    },
    select: { id: true },
  });
}

async function createForUsers(userIds, data) {
  if (!userIds.length) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ ...data, userId })),
    skipDuplicates: true,
  });
}

export const notificationService = {
  async notifyPermission(tenantId, permission, data, excludeUserId) {
    const users = await usersWithPermission(tenantId, permission);
    await createForUsers(
      users.map(({ id }) => id).filter((id) => id !== excludeUserId),
      { ...data, tenantId },
    );
  },
  async notifyUser(tenantId, userId, data) {
    await createForUsers([userId], { ...data, tenantId });
  },
  async ensureSubscriptionWarnings(tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, subscriptionEndsAt: true },
    });
    if (!tenant?.subscriptionEndsAt) return;
    const days = Math.ceil(
      (tenant.subscriptionEndsAt.getTime() - Date.now()) / 86400000,
    );
    const threshold = [1, 3, 7, 14].find((value) => days <= value && days >= 0);
    if (!threshold) return;
    const users = await usersWithPermission(tenantId, 'settings.update');
    await createForUsers(
      users.map(({ id }) => id),
      {
        tenantId,
        type: 'SUBSCRIPTION_EXPIRING',
        title: 'Subscription expiring soon',
        message: `${tenant.name}'s subscription expires in ${days} day${days === 1 ? '' : 's'}.`,
        link: '#/settings',
        entityType: 'Tenant',
        entityId: tenantId,
        dedupeKey: `subscription-${tenant.subscriptionEndsAt.toISOString()}-${threshold}`,
      },
    );
  },
  async list(tenantId, userId) {
    await this.ensureSubscriptionWarnings(tenantId);
    const [items, unread] = await prisma.$transaction([
      prisma.notification.findMany({
        where: { tenantId, userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({ where: { tenantId, userId, readAt: null } }),
    ]);
    return { items, unread };
  },
  async markRead(tenantId, userId, id) {
    return prisma.notification.updateMany({
      where: { id, tenantId, userId },
      data: { readAt: new Date() },
    });
  },
  async markAllRead(tenantId, userId) {
    return prisma.notification.updateMany({
      where: { tenantId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
};
