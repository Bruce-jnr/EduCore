import { PrismaClient } from '@prisma/client';
import { currentTenantId } from '../security/tenant-context.js';

const globalForPrisma = globalThis;
const tenantModels = new Set(['User', 'Role', 'TenantSettings', 'AcademicYear', 'AcademicPeriod', 'Class', 'Subject', 'TeacherAssignment', 'Staff', 'Student', 'Guardian', 'StudentGuardian', 'FeeCategory', 'FeeStructure', 'Invoice', 'Payment', 'BulkBillingRun', 'AssessmentScheme', 'GradingScheme', 'ResultSheet', 'ResultEntry', 'StudentEnrollment', 'AttendanceSession', 'Notification', 'ProgressionRun', 'ProgressionItem', 'AuditLog']);

function secureTenantArgs(model, operation, args) {
  const tenantId = currentTenantId();
  if (!tenantId || !tenantModels.has(model)) return args;
  if (operation === 'create') {
    if (args.data.tenantId && args.data.tenantId !== tenantId) throw new Error(`Tenant security violation while creating ${model}`);
    return { ...args, data: { ...args.data, tenantId } };
  }
  if (operation === 'createMany') {
    const rows = Array.isArray(args.data) ? args.data : [args.data];
    if (rows.some((row) => row.tenantId && row.tenantId !== tenantId)) throw new Error(`Tenant security violation while creating ${model}`);
    return { ...args, data: Array.isArray(args.data) ? rows.map((row) => ({ ...row, tenantId })) : { ...args.data, tenantId } };
  }
  if (operation === 'upsert') {
    if (args.create.tenantId && args.create.tenantId !== tenantId) throw new Error(`Tenant security violation while upserting ${model}`);
    if (args.update?.tenantId && args.update.tenantId !== tenantId) throw new Error(`Tenant security violation while updating ${model}`);
    return { ...args, where: { ...args.where, tenantId }, create: { ...args.create, tenantId } };
  }
  if (['update', 'updateMany'].includes(operation) && args.data?.tenantId && args.data.tenantId !== tenantId) throw new Error(`Tenant security violation while updating ${model}`);
  if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy', 'update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) return { ...args, where: { ...(args.where || {}), tenantId } };
  return args;
}

const createClient = () => new PrismaClient().$extends({ name: 'tenant-defense', query: { $allModels: { async $allOperations({ model, operation, args, query }) { return query(secureTenantArgs(model, operation, args)); } } } });

export const prisma = globalForPrisma.__educorePrisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__educorePrisma = prisma;
}
