import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { auditService } from '../../services/audit.service.js';

const D = Prisma.Decimal;
const value = (amount) => Number(amount.toString());
const rounded = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;
const credits = new Set(['DISCOUNT', 'SCHOLARSHIP', 'ADJUSTMENT_CREDIT']);

export const ledgerService = {
  async get(auth, studentId) {
    const [student, tenant, invoices, payments, adjustments] = await Promise.all([
      prisma.student.findFirst({ where: { id: studentId, tenantId: auth.tenantId, deletedAt: null }, select: { id: true, studentNumber: true, firstName: true, middleName: true, lastName: true, status: true } }),
      prisma.tenant.findFirst({ where: { id: auth.tenantId }, select: { currency: true } }),
      prisma.invoice.findMany({ where: { tenantId: auth.tenantId, studentId, status: { not: 'VOID' } }, include: { academicYear: { select: { name: true } }, academicPeriod: { select: { name: true } }, items: { include: { feeCategory: { select: { name: true } } } } }, orderBy: { issueDate: 'asc' } }),
      prisma.payment.findMany({ where: { tenantId: auth.tenantId, studentId }, include: { receivedBy: { select: { firstName: true, lastName: true } } }, orderBy: { paymentDate: 'asc' } }),
      prisma.financialAdjustment.findMany({ where: { tenantId: auth.tenantId, studentId }, include: { createdBy: { select: { firstName: true, lastName: true } }, reversedBy: { select: { firstName: true, lastName: true } } }, orderBy: { effectiveDate: 'asc' } }),
    ]);
    if (!student) throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
    const transactions = [];
    for (const invoice of invoices) for (const item of invoice.items) transactions.push({ id: `charge:${item.id}`, sourceId: invoice.id, type: 'CHARGE', status: invoice.status, date: invoice.issueDate, createdAt: invoice.createdAt, reference: invoice.invoiceNumber, description: item.description, category: item.feeCategory.name, academicContext: [invoice.academicYear.name, invoice.academicPeriod?.name].filter(Boolean).join(' · '), debit: value(item.amount), credit: 0, impact: value(item.amount) });
    for (const payment of payments) { const active = payment.status === 'COMPLETED'; transactions.push({ id: `payment:${payment.id}`, sourceId: payment.id, type: 'PAYMENT', status: payment.status, date: payment.paymentDate, createdAt: payment.createdAt, reference: payment.receiptNumber, description: `${payment.paymentMethod.replaceAll('_', ' ')} payment${payment.reference ? ` · ${payment.reference}` : ''}`, category: 'Payment', actor: `${payment.receivedBy.firstName} ${payment.receivedBy.lastName}`, debit: 0, credit: value(payment.amount), impact: active ? -value(payment.amount) : 0 }); }
    for (const adjustment of adjustments) { const isCredit = credits.has(adjustment.type); const active = adjustment.status === 'ACTIVE'; const amount = value(adjustment.amount); transactions.push({ id: `adjustment:${adjustment.id}`, sourceId: adjustment.id, type: adjustment.type, status: adjustment.status, date: adjustment.effectiveDate, createdAt: adjustment.createdAt, reference: adjustment.reference || `ADJ-${adjustment.id.slice(-8).toUpperCase()}`, description: adjustment.reason, category: adjustment.type.replaceAll('_', ' '), actor: `${adjustment.createdBy.firstName} ${adjustment.createdBy.lastName}`, reversalReason: adjustment.reversalReason, debit: isCredit ? 0 : amount, credit: isCredit ? amount : 0, impact: active ? (isCredit ? -amount : amount) : 0, reversible: active }); }
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date) || new Date(a.createdAt) - new Date(b.createdAt));
    let balance = 0; for (const transaction of transactions) { balance = rounded(balance + transaction.impact); transaction.balance = balance; delete transaction.impact; }
    const activeAdjustments = adjustments.filter((item) => item.status === 'ACTIVE');
    const sumAdjustments = (type) => activeAdjustments.filter((item) => item.type === type).reduce((sum, item) => sum + value(item.amount), 0);
    const summary = { totalCharges: rounded(invoices.reduce((sum, invoice) => sum + invoice.items.reduce((subtotal, item) => subtotal + value(item.amount), 0), 0)), totalPayments: rounded(payments.filter((item) => item.status === 'COMPLETED').reduce((sum, item) => sum + value(item.amount), 0)), totalDiscounts: rounded(sumAdjustments('DISCOUNT')), totalScholarships: rounded(sumAdjustments('SCHOLARSHIP')), totalRefunds: rounded(sumAdjustments('REFUND')), creditAdjustments: rounded(sumAdjustments('ADJUSTMENT_CREDIT')), debitAdjustments: rounded(sumAdjustments('ADJUSTMENT_DEBIT')), outstandingBalance: rounded(balance) };
    return { student, currency: tenant?.currency || 'GHS', summary, transactions: transactions.reverse() };
  },

  async createAdjustment(auth, data) {
    const ledger = await this.get(auth, data.studentId); const amount = Number(data.amount);
    if (credits.has(data.type) && amount > Math.max(0, ledger.summary.outstandingBalance)) throw new AppError('This credit cannot exceed the student’s outstanding balance', 422, 'CREDIT_EXCEEDS_BALANCE');
    if (data.type === 'REFUND' && amount > ledger.summary.totalPayments - ledger.summary.totalRefunds) throw new AppError('Refund cannot exceed net completed payments', 422, 'REFUND_EXCEEDS_PAYMENTS');
    const adjustment = await prisma.financialAdjustment.create({ data: { tenantId: auth.tenantId, studentId: data.studentId, type: data.type, amount: new D(data.amount), effectiveDate: new Date(`${data.effectiveDate}T00:00:00.000Z`), reference: data.reference || null, reason: data.reason, createdById: auth.userId }, include: { student: { select: { studentNumber: true } } } });
    await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'CREATE_LEDGER_ADJUSTMENT', module: 'FINANCE', entityType: 'FinancialAdjustment', entityId: adjustment.id, newValue: { studentId: data.studentId, studentNumber: adjustment.student.studentNumber, type: data.type, amount: data.amount, reason: data.reason, reference: data.reference || null } });
    return adjustment;
  },

  async reverseAdjustment(auth, id, reason) {
    const adjustment = await prisma.financialAdjustment.findFirst({ where: { id, tenantId: auth.tenantId } });
    if (!adjustment) throw new AppError('Ledger adjustment not found', 404, 'ADJUSTMENT_NOT_FOUND');
    if (adjustment.status === 'REVERSED') throw new AppError('This ledger adjustment has already been reversed', 409, 'ADJUSTMENT_ALREADY_REVERSED');
    const updated = await prisma.financialAdjustment.update({ where: { id, tenantId: auth.tenantId }, data: { status: 'REVERSED', reversedAt: new Date(), reversedById: auth.userId, reversalReason: reason } });
    await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'REVERSE_LEDGER_ADJUSTMENT', module: 'FINANCE', entityType: 'FinancialAdjustment', entityId: id, oldValue: { status: adjustment.status, type: adjustment.type, amount: adjustment.amount.toString() }, newValue: { status: 'REVERSED', reason } });
    return updated;
  },
};
