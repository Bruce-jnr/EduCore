-- CreateTable
CREATE TABLE `BulkBillingRun` (
    `id` VARCHAR(191) NOT NULL,
    `runKey` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `academicYearId` VARCHAR(191) NOT NULL,
    `academicPeriodId` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NULL,
    `levelOrder` INTEGER NULL,
    `description` VARCHAR(191) NOT NULL,
    `studentCount` INTEGER NOT NULL,
    `totalAmount` DECIMAL(14, 2) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `BulkBillingRun_runKey_key`(`runKey`),
    INDEX `BulkBillingRun_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Invoice` ADD COLUMN `bulkBillingRunId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Invoice_bulkBillingRunId_idx` ON `Invoice`(`bulkBillingRunId`);

-- AddForeignKey
ALTER TABLE `BulkBillingRun` ADD CONSTRAINT `BulkBillingRun_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `BulkBillingRun` ADD CONSTRAINT `BulkBillingRun_academicYearId_fkey` FOREIGN KEY (`academicYearId`) REFERENCES `AcademicYear`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `BulkBillingRun` ADD CONSTRAINT `BulkBillingRun_academicPeriodId_fkey` FOREIGN KEY (`academicPeriodId`) REFERENCES `AcademicPeriod`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `BulkBillingRun` ADD CONSTRAINT `BulkBillingRun_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_bulkBillingRunId_fkey` FOREIGN KEY (`bulkBillingRunId`) REFERENCES `BulkBillingRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
