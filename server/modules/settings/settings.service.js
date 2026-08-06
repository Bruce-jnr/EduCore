import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { auditService } from '../../services/audit.service.js';

export const settingsService = {
  get(tenantId) { return prisma.tenant.findFirst({ where: { id: tenantId }, include: { settings: true } }); },
  async update(auth, data) { const { studentIdPrefix, staffIdPrefix, academicConfig, featureFlags, ...tenantData } = data; const oldValue = await this.get(auth.tenantId); const updated = await prisma.$transaction(async (tx) => { await tx.tenant.update({ where: { id: auth.tenantId }, data: { ...tenantData, email: tenantData.email || null, logoUrl: tenantData.logoUrl || null } }); await tx.tenantSettings.upsert({ where: { tenantId: auth.tenantId }, update: { studentIdPrefix, staffIdPrefix, academicConfig, featureFlags }, create: { tenantId: auth.tenantId, studentIdPrefix, staffIdPrefix, academicConfig, featureFlags } }); return tx.tenant.findUnique({ where: { id: auth.tenantId }, include: { settings: true } }); }); await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'UPDATE', module: 'SETTINGS', entityType: 'Tenant', entityId: auth.tenantId, oldValue, newValue: updated }); return updated; },
  async updateReportCard(auth, config) { const current = await prisma.tenantSettings.findUnique({ where: { tenantId: auth.tenantId }, select: { reportCardConfig: true } }); const settings = await prisma.tenantSettings.upsert({ where: { tenantId: auth.tenantId }, update: { reportCardConfig: config }, create: { tenantId: auth.tenantId, reportCardConfig: config } }); await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'UPDATE_REPORT_CARD_LETTERHEAD', module: 'SETTINGS', entityType: 'TenantSettings', entityId: settings.id, oldValue: current?.reportCardConfig || null, newValue: config }); return settings.reportCardConfig; },
  async uploadLogo(auth, dataUrl) {
    const match = /^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) throw new AppError('Upload a PNG, JPEG, or WebP image', 422, 'INVALID_LOGO_TYPE');
    const buffer = Buffer.from(match[3], 'base64');
    if (!buffer.length || buffer.length > env.MAX_FILE_SIZE) throw new AppError(`Logo must be smaller than ${Math.round(env.MAX_FILE_SIZE / 1024 / 1024)}MB`, 422, 'LOGO_TOO_LARGE');
    const extension = match[2] === 'jpeg' ? 'jpg' : match[2]; const directory = path.resolve(env.UPLOAD_DIR, 'logos'); await mkdir(directory, { recursive: true }); const filename = `${auth.tenantId}-${Date.now()}.${extension}`; await writeFile(path.join(directory, filename), buffer); const logoUrl = `/uploads/logos/${filename}`; const old = await prisma.tenant.findUnique({ where: { id: auth.tenantId }, select: { logoUrl: true } }); await prisma.tenant.update({ where: { id: auth.tenantId }, data: { logoUrl } }); await auditService.log({ tenantId: auth.tenantId, userId: auth.userId, action: 'UPLOAD_LOGO', module: 'SETTINGS', entityType: 'Tenant', entityId: auth.tenantId, oldValue: { logoUrl: old?.logoUrl }, newValue: { logoUrl } }); return { logoUrl };
  },
};
