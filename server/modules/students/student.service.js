import { AppError } from '../../errors/app-error.js';
import { auditService } from '../../services/audit.service.js';
import { studentRepository } from './student.repository.js';
import { prisma } from '../../config/prisma.js';

export const studentService = {
  list: (tenantId, query) => studentRepository.list(tenantId, query),
  async get(tenantId, id) {
    const student = await studentRepository.findById(tenantId, id);
    if (!student) throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
    return student;
  },
  async create(context, input) {
    const student = await studentRepository.create(context.tenantId, input);
    if (!student) throw new AppError('The selected class does not belong to this school or academic year', 422, 'INVALID_ENROLLMENT');
    await auditService.log({ tenantId: context.tenantId, userId: context.userId, action: 'CREATE', module: 'STUDENTS', entityType: 'Student', entityId: student.id, newValue: { studentNumber: student.studentNumber } });
    return student;
  },
  async update(context, id, input) {
    const previous = await this.get(context.tenantId, id);
    const data = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, typeof value === 'string' && value === '' ? null : value]));
    try {
      const result = await studentRepository.update(context.tenantId, id, data);
      if (!result.count) throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
    } catch (error) {
      if (error.code === 'P2002') throw new AppError('Student ID already exists in this school', 409, 'STUDENT_NUMBER_EXISTS');
      throw error;
    }
    const updated = await this.get(context.tenantId, id);
    await auditService.log({ tenantId: context.tenantId, userId: context.userId, action: 'UPDATE', module: 'STUDENTS', entityType: 'Student', entityId: id, oldValue: previous, newValue: updated });
    return updated;
  },
  async addGuardian(context, studentId, input) {
    const student = await prisma.student.findFirst({ where: { id: studentId, tenantId: context.tenantId, deletedAt: null } });
    if (!student) throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
    const { relationship, isPrimary, isEmergencyContact, isFinanciallyResponsible, ...details } = input;
    try {
      const link = await prisma.$transaction(async (tx) => {
        const guardian = await tx.guardian.upsert({ where: { tenantId_phone: { tenantId: context.tenantId, phone: details.phone } }, update: { ...details, email: details.email || null, address: details.address || null, occupation: details.occupation || null }, create: { ...details, tenantId: context.tenantId, email: details.email || null, address: details.address || null, occupation: details.occupation || null } });
        if (isPrimary) await tx.studentGuardian.updateMany({ where: { tenantId: context.tenantId, studentId, isPrimary: true }, data: { isPrimary: false } });
        return tx.studentGuardian.create({ data: { tenantId: context.tenantId, studentId, guardianId: guardian.id, relationship, isPrimary, isEmergencyContact, isFinanciallyResponsible }, include: { guardian: true } });
      });
      await auditService.log({ tenantId: context.tenantId, userId: context.userId, action: 'LINK_GUARDIAN', module: 'STUDENTS', entityType: 'StudentGuardian', entityId: link.id, newValue: { studentId, guardianId: link.guardianId, relationship, isPrimary, isEmergencyContact, isFinanciallyResponsible } });
      return link;
    } catch (error) {
      if (error.code === 'P2002') throw new AppError('This guardian is already linked to the student', 409, 'GUARDIAN_ALREADY_LINKED');
      throw error;
    }
  },
};
