import { AppError } from '../../errors/app-error.js';
import { auditService } from '../../services/audit.service.js';
import { studentRepository } from './student.repository.js';

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
};
