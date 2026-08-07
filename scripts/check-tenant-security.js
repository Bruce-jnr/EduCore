import { prisma } from '../server/config/prisma.js';
import { tenantContext } from '../server/security/tenant-context.js';

const tenant = await prisma.tenant.findFirst({ select: { id: true } });
if (!tenant) throw new Error('Create at least one tenant before running the tenant security check.');

await tenantContext.run({ tenantId: tenant.id }, async () => {
  const explicitlyScoped = await prisma.student.count({ where: { tenantId: tenant.id } });
  const accidentallyUnscoped = await prisma.student.count({ where: {} });
  const hostileScope = await prisma.student.count({ where: { tenantId: '__foreign_tenant__' } });
  if (explicitlyScoped !== accidentallyUnscoped || explicitlyScoped !== hostileScope) throw new Error('Tenant read guard failed.');

  let blocked = false;
  try {
    await prisma.notification.create({ data: { tenantId: '__foreign_tenant__', userId: '__invalid__', title: 'Security test', message: 'This must never reach the database.' } });
  } catch (error) {
    blocked = error.message.includes('Tenant security violation');
  }
  if (!blocked) throw new Error('Tenant write guard failed.');
});

console.log('Tenant defense-in-depth checks passed.');
await prisma.$disconnect();
