import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { auditService } from '../../services/audit.service.js';
import { notificationService } from '../../services/notification.service.js';

const D = Prisma.Decimal;
const date = (value) => new Date(`${value}T00:00:00.000Z`);
const number = (value) => Number(value.toString());
const identifier = (prefix) => `${prefix}-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

async function tenantEntities(tenantId, checks) { for (const [model, id] of checks) { if (!id) continue; if (!await prisma[model].findFirst({ where: { id, tenantId } })) throw new AppError('A selected finance record does not belong to this school', 422, 'INVALID_FINANCE_REFERENCE'); } }
async function validateCategories(tenantId, items) { const ids = [...new Set(items.map((item) => item.feeCategoryId))]; const count = await prisma.feeCategory.count({ where: { tenantId, id: { in: ids }, status: 'ACTIVE' } }); if (count !== ids.length) throw new AppError('A fee category is invalid', 422, 'INVALID_FEE_CATEGORY'); }

export const financeService = {
  async overview(tenantId) {
    const [categories, structures, invoices, payments, students] = await Promise.all([
      prisma.feeCategory.findMany({ where: { tenantId, status: 'ACTIVE' }, orderBy: { name: 'asc' } }),
      prisma.feeStructure.findMany({ where: { tenantId, status: 'ACTIVE' }, include: { feeCategory: true, academicYear: true, academicPeriod: true, class: true }, orderBy: { createdAt: 'desc' } }),
      prisma.invoice.findMany({ where: { tenantId }, include: { student: true, items: { include: { allocations: { where: { payment: { status: 'COMPLETED' } } } } } }, orderBy: { createdAt: 'desc' } }),
      prisma.payment.findMany({ where: { tenantId }, include: { student: true, receivedBy: { select: { firstName: true, lastName: true } }, allocations: { include: { invoiceItem: { include: { invoice: true } } } } }, orderBy: { createdAt: 'desc' } }),
      prisma.student.findMany({ where: { tenantId, deletedAt: null, status: 'ACTIVE' }, select: { id: true, studentNumber: true, firstName: true, lastName: true }, orderBy: { firstName: 'asc' } }),
    ]);
    const bills = invoices.map((invoice) => { const total = invoice.items.reduce((sum, item) => sum + number(item.amount), 0); const paid = invoice.items.reduce((sum, item) => sum + item.allocations.reduce((allocated, allocation) => allocated + number(allocation.amount), 0), 0); return { ...invoice, total, paid, balance: total - paid }; });
    return { categories, structures, invoices: bills, payments, students, summary: { billed: bills.reduce((sum, item) => sum + item.total, 0), collected: payments.filter((item) => item.status === 'COMPLETED').reduce((sum, item) => sum + number(item.amount), 0), outstanding: bills.reduce((sum, item) => sum + item.balance, 0) } };
  },
  async category(auth, data) { try { const item = await prisma.feeCategory.create({ data: { ...data, tenantId: auth.tenantId } }); await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'CREATE', module: 'FINANCE', entityType: 'FeeCategory', entityId: item.id, newValue: data }); return item; } catch (error) { if (error.code === 'P2002') throw new AppError('Fee category code already exists', 409, 'FEE_CATEGORY_EXISTS'); throw error; } },
  async structure(auth, data) { await tenantEntities(auth.tenantId, [['academicYear', data.academicYearId], ['academicPeriod', data.academicPeriodId], ['class', data.classId], ['feeCategory', data.feeCategoryId]]); const item = await prisma.feeStructure.create({ data: { ...data, tenantId: auth.tenantId, academicPeriodId: data.academicPeriodId || null, classId: data.classId || null, amount: new D(data.amount) } }); await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'CREATE', module: 'FINANCE', entityType: 'FeeStructure', entityId: item.id, newValue: data }); if (auth.roles.includes('Accountant')) await notificationService.notifyPermission(auth.tenantId, 'settings.update', { type: 'FINANCE_REVIEW', title: 'New fee structure created', message: `${auth.firstName} ${auth.lastName} created the ${item.name} fee structure for administrative review.`, link: '#/finance/fees', entityType: 'FeeStructure', entityId: item.id, dedupeKey: `fee-structure-${item.id}` }, auth.userId); return item; },
  async invoice(auth, data) { await tenantEntities(auth.tenantId, [['student', data.studentId], ['academicYear', data.academicYearId], ['academicPeriod', data.academicPeriodId]]); await validateCategories(auth.tenantId, data.items); const item = await prisma.invoice.create({ data: { tenantId: auth.tenantId, studentId: data.studentId, academicYearId: data.academicYearId, academicPeriodId: data.academicPeriodId || null, invoiceNumber: identifier('INV'), issueDate: date(data.issueDate), dueDate: date(data.dueDate), notes: data.notes, items: { create: data.items.map((entry) => ({ ...entry, amount: new D(entry.amount) })) } }, include: { items: true, student: true } }); await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'CREATE', module: 'FINANCE', entityType: 'Invoice', entityId: item.id, newValue: { invoiceNumber: item.invoiceNumber, studentId: data.studentId } }); return item; },
  async bulkInvoice(auth, data) {
    if (date(data.dueDate) < date(data.issueDate)) throw new AppError('Due date cannot be before issue date', 422, 'INVALID_BILL_DATES');
    await tenantEntities(auth.tenantId, [['academicYear', data.academicYearId], ['academicPeriod', data.academicPeriodId], ['class', data.classId]]);
    if (data.scope === 'CLASS' && !await prisma.class.findFirst({ where: { id: data.classId, tenantId: auth.tenantId, academicYearId: data.academicYearId } })) throw new AppError('Class not found in this academic year', 422, 'INVALID_BILLING_CLASS');
    await validateCategories(auth.tenantId, data.items);
    const enrollmentWhere = { tenantId: auth.tenantId, academicYearId: data.academicYearId, status: 'ACTIVE', student: { deletedAt: null, status: 'ACTIVE' } };
    if (data.scope === 'CLASS') enrollmentWhere.classId = data.classId;
    if (data.scope === 'LEVEL') enrollmentWhere.class = { tenantId: auth.tenantId, academicYearId: data.academicYearId, levelOrder: data.levelOrder, status: 'ACTIVE' };
    const enrollments = await prisma.studentEnrollment.findMany({ where: enrollmentWhere, select: { studentId: true }, distinct: ['studentId'] });
    if (!enrollments.length) throw new AppError('No active enrolled students match this billing scope', 422, 'EMPTY_BILLING_SCOPE');
    const runKey = createHash('sha256').update(JSON.stringify({ tenantId: auth.tenantId, ...data, notes: data.notes || '' })).digest('hex');
    if (await prisma.bulkBillingRun.findFirst({ where: { runKey, tenantId: auth.tenantId } })) throw new AppError('This exact bulk bill has already been created', 409, 'DUPLICATE_BULK_BILL');
    const perStudent = data.items.reduce((sum, item) => sum.plus(new D(item.amount)), new D(0));
    const run = await prisma.$transaction(async (tx) => { const created = await tx.bulkBillingRun.create({ data: { runKey, tenantId: auth.tenantId, academicYearId: data.academicYearId, academicPeriodId: data.academicPeriodId || null, scope: data.scope, classId: data.scope === 'CLASS' ? data.classId : null, levelOrder: data.scope === 'LEVEL' ? data.levelOrder : null, description: data.items.map((item) => item.description).join(', '), studentCount: enrollments.length, totalAmount: perStudent.mul(enrollments.length), createdById: auth.userId } }); for (const { studentId } of enrollments) await tx.invoice.create({ data: { tenantId: auth.tenantId, studentId, academicYearId: data.academicYearId, academicPeriodId: data.academicPeriodId || null, invoiceNumber: identifier('INV'), issueDate: date(data.issueDate), dueDate: date(data.dueDate), notes: data.notes, bulkBillingRunId: created.id, items: { create: data.items.map((item) => ({ feeCategoryId: item.feeCategoryId, description: item.description, amount: new D(item.amount) })) } } }); return created; });
    await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'CREATE_BULK_BILLS', module: 'FINANCE', entityType: 'BulkBillingRun', entityId: run.id, newValue: { scope: data.scope, classId: data.classId || null, levelOrder: data.levelOrder ?? null, studentCount: enrollments.length, totalAmount: run.totalAmount.toString() } }); if (auth.roles.includes('Accountant')) await notificationService.notifyPermission(auth.tenantId, 'settings.update', { type: 'FINANCE_REVIEW', title: 'Bulk billing completed', message: `${auth.firstName} ${auth.lastName} billed ${enrollments.length} students and the run is ready for review.`, link: '#/finance/bills', entityType: 'BulkBillingRun', entityId: run.id, dedupeKey: `bulk-billing-${run.id}` }, auth.userId); return run;
  },
  async payment(auth, data) {
    const invoice = await prisma.invoice.findFirst({ where: { id: data.invoiceId, tenantId: auth.tenantId, studentId: data.studentId, status: { notIn: ['VOID', 'PAID'] } }, include: { items: { include: { allocations: { where: { payment: { status: 'COMPLETED' } } } } } } });
    if (!invoice) throw new AppError('Open invoice not found for this student', 404, 'INVOICE_NOT_FOUND');
    const amount = new D(data.amount); let remaining = amount; const outstanding = invoice.items.reduce((sum, item) => sum.plus(new D(item.amount).minus(item.allocations.reduce((paid, allocation) => paid.plus(allocation.amount), new D(0)))), new D(0));
    if (amount.greaterThan(outstanding)) throw new AppError('Payment cannot exceed the invoice balance', 422, 'PAYMENT_EXCEEDS_BALANCE');
    const allocations = []; for (const item of invoice.items) { if (remaining.isZero()) break; const paid = item.allocations.reduce((sum, allocation) => sum.plus(allocation.amount), new D(0)); const available = new D(item.amount).minus(paid); const allocated = remaining.lessThan(available) ? remaining : available; if (allocated.greaterThan(0)) { allocations.push({ invoiceItemId: item.id, amount: allocated }); remaining = remaining.minus(allocated); } }
    const payment = await prisma.$transaction(async (tx) => { const saved = await tx.payment.create({ data: { tenantId: auth.tenantId, studentId: data.studentId, receiptNumber: identifier('REC'), amount, paymentMethod: data.paymentMethod, paymentDate: date(data.paymentDate), reference: data.reference, notes: data.notes, receivedById: auth.userId, allocations: { create: allocations } } }); await tx.invoice.update({ where: { id: invoice.id, tenantId: auth.tenantId }, data: { status: amount.equals(outstanding) ? 'PAID' : 'PARTIALLY_PAID' } }); return saved; });
    await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'CREATE', module: 'FINANCE', entityType: 'Payment', entityId: payment.id, newValue: { receiptNumber: payment.receiptNumber, amount: data.amount, invoiceId: data.invoiceId } }); return payment;
  },
};
