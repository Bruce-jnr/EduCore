CREATE TABLE `LessonPlan` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `authorId` VARCHAR(191) NOT NULL,
  `classId` VARCHAR(191) NOT NULL,
  `subjectId` VARCHAR(191) NOT NULL,
  `academicPeriodId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `status` ENUM('DRAFT', 'READY', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `weekCount` INTEGER NOT NULL DEFAULT 12,
  `weeks` JSON NOT NULL,
  `templateVersion` VARCHAR(191) NOT NULL DEFAULT 'teacher-template-v1',
  `revision` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `LessonPlan_tenantId_authorId_updatedAt_idx` (`tenantId`, `authorId`, `updatedAt`),
  INDEX `LessonPlan_tenantId_classId_academicPeriodId_idx` (`tenantId`, `classId`, `academicPeriodId`),
  INDEX `LessonPlan_tenantId_status_idx` (`tenantId`, `status`),
  CONSTRAINT `LessonPlan_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `LessonPlan_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `LessonPlan_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `LessonPlan_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `LessonPlan_academicPeriodId_fkey` FOREIGN KEY (`academicPeriodId`) REFERENCES `AcademicPeriod` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `Permission` (`id`, `key`) VALUES
  ('perm_lesson_plans_view', 'lesson-plans.view'),
  ('perm_lesson_plans_manage', 'lesson-plans.manage'),
  ('perm_lesson_plans_review', 'lesson-plans.review')
ON DUPLICATE KEY UPDATE `key` = VALUES(`key`);

-- Add rights to existing default school roles; leave custom roles to administrators.
INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.`id`, p.`id` FROM `Role` r CROSS JOIN `Permission` p
WHERE r.`tenantId` IS NOT NULL AND r.`isSystem` = true AND (
  (r.`name` = 'School Administrator' AND p.`key` IN ('lesson-plans.view', 'lesson-plans.manage', 'lesson-plans.review')) OR
  (r.`name` = 'Academic Administrator' AND p.`key` IN ('lesson-plans.view', 'lesson-plans.review')) OR
  (r.`name` = 'Teacher' AND p.`key` IN ('lesson-plans.view', 'lesson-plans.manage'))
);
