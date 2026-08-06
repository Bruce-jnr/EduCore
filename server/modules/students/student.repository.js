import { prisma } from '../../config/prisma.js';

export const studentRepository = {
  async list(tenantId, { page, limit, search, status }) {
    const where = { tenantId, deletedAt: null, ...(status && { status }), ...(search && { OR: [
      { firstName: { contains: search } }, { lastName: { contains: search } }, { studentNumber: { contains: search } },
    ] }) };
    const [items, total] = await prisma.$transaction([
      prisma.student.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { guardians: { take: 1, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], include: { guardian: true } }, enrollments: { where: { status: 'ACTIVE' }, take: 1, orderBy: { enrollmentDate: 'desc' }, include: { class: true, academicYear: true } } } }),
      prisma.student.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  },
  findById(tenantId, id) {
    return prisma.student.findFirst({ where: { id, tenantId, deletedAt: null }, include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], include: { guardian: true } }, enrollments: { orderBy: { enrollmentDate: 'desc' }, include: { class: true, academicYear: true, academicPeriod: true } } } });
  },
  create(tenantId, data) {
    const { classId, academicYearId, ...student } = data;
    return prisma.$transaction(async (tx) => {
      const targetClass = classId ? await tx.class.findFirst({ where: { id: classId, tenantId, ...(academicYearId && { academicYearId }) } }) : null;
      if (classId && !targetClass) return null;
      return tx.student.create({
        data: { ...student, tenantId, ...(targetClass && { enrollments: { create: { tenantId, classId, academicYearId: targetClass.academicYearId } } }) },
        include: { enrollments: { include: { class: true, academicYear: true } } },
      });
    });
  },
  update(tenantId, id, data) {
    return prisma.student.updateMany({ where: { id, tenantId, deletedAt: null }, data });
  },
};
