CREATE TABLE `ClassSubject` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ClassSubject_classId_subjectId_key`(`classId`, `subjectId`),
    INDEX `ClassSubject_tenantId_subjectId_idx`(`tenantId`, `subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ClassSubject` ADD CONSTRAINT `ClassSubject_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ClassSubject` ADD CONSTRAINT `ClassSubject_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ClassSubject` ADD CONSTRAINT `ClassSubject_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `ClassSubject` (`id`, `tenantId`, `classId`, `subjectId`, `createdAt`)
SELECT CONCAT('cs-', LEFT(MD5(CONCAT(c.`id`, ':', s.`id`)), 24)), c.`tenantId`, c.`id`, s.`id`, CURRENT_TIMESTAMP(3)
FROM `Class` c
INNER JOIN `Subject` s ON s.`tenantId` = c.`tenantId` AND s.`status` = 'ACTIVE';
