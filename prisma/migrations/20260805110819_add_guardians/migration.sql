-- CreateTable
CREATE TABLE `Guardian` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `occupation` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Guardian_tenantId_phone_key`(`tenantId`, `phone`),
    INDEX `Guardian_tenantId_lastName_firstName_idx`(`tenantId`, `lastName`, `firstName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentGuardian` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `guardianId` VARCHAR(191) NOT NULL,
    `relationship` VARCHAR(191) NOT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `isEmergencyContact` BOOLEAN NOT NULL DEFAULT false,
    `isFinanciallyResponsible` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `StudentGuardian_studentId_guardianId_key`(`studentId`, `guardianId`),
    INDEX `StudentGuardian_tenantId_guardianId_idx`(`tenantId`, `guardianId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Guardian` ADD CONSTRAINT `Guardian_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `StudentGuardian` ADD CONSTRAINT `StudentGuardian_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StudentGuardian` ADD CONSTRAINT `StudentGuardian_guardianId_fkey` FOREIGN KEY (`guardianId`) REFERENCES `Guardian`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
