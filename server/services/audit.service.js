import { prisma } from '../config/prisma.js';

export const auditService = {
  log(entry) {
    return prisma.auditLog.create({ data: entry });
  },
};
