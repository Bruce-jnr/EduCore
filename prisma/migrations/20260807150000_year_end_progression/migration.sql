CREATE TABLE `ProgressionRun` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `action` ENUM('PROMOTE', 'REPEAT', 'TRANSFER', 'WITHDRAW', 'GRADUATE') NOT NULL,
  `sourceAcademicYearId` VARCHAR(191) NOT NULL,
  `sourceClassId` VARCHAR(191) NOT NULL,
  `targetAcademicYearId` VARCHAR(191) NULL,
  `targetClassId` VARCHAR(191) NULL,
  `studentCount` INTEGER NOT NULL,
  `notes` VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ProgressionRun_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
  INDEX `ProgressionRun_tenantId_sourceAcademicYearId_sourceClassId_idx`(`tenantId`, `sourceAcademicYearId`, `sourceClassId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ProgressionRun_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProgressionItem` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `progressionRunId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `studentNumber` VARCHAR(191) NOT NULL,
  `studentName` VARCHAR(191) NOT NULL,
  `action` ENUM('PROMOTE', 'REPEAT', 'TRANSFER', 'WITHDRAW', 'GRADUATE') NOT NULL,
  `sourceEnrollmentId` VARCHAR(191) NOT NULL,
  `targetEnrollmentId` VARCHAR(191) NULL,
  `previousStudentStatus` ENUM('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'GRADUATED', 'SUSPENDED', 'ARCHIVED') NOT NULL,
  `newStudentStatus` ENUM('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'GRADUATED', 'SUSPENDED', 'ARCHIVED') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ProgressionItem_progressionRunId_studentId_key`(`progressionRunId`, `studentId`),
  INDEX `ProgressionItem_tenantId_studentId_createdAt_idx`(`tenantId`, `studentId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ProgressionItem_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProgressionItem_progressionRunId_fkey` FOREIGN KEY (`progressionRunId`) REFERENCES `ProgressionRun`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
