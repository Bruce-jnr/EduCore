-- Additive migration: existing school users and school lesson plans remain unchanged.
CREATE TABLE `TeacherAccount` (
 `id` VARCHAR(191) NOT NULL, `email` VARCHAR(191) NOT NULL,
 `firstName` VARCHAR(80) NOT NULL, `lastName` VARCHAR(80) NOT NULL,
 `passwordHash` VARCHAR(191) NULL, `googleSubject` VARCHAR(255) NULL,
 `isActive` BOOLEAN NOT NULL DEFAULT true, `emailVerifiedAt` DATETIME(3) NULL,
 `lastLoginAt` DATETIME(3) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 `updatedAt` DATETIME(3) NOT NULL, PRIMARY KEY (`id`),
 UNIQUE INDEX `TeacherAccount_email_key` (`email`), UNIQUE INDEX `TeacherAccount_googleSubject_key` (`googleSubject`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `PersonalLessonPlan` (
 `id` VARCHAR(191) NOT NULL, `teacherId` VARCHAR(191) NOT NULL, `title` VARCHAR(150) NOT NULL,
 `classKey` VARCHAR(80) NOT NULL, `className` VARCHAR(80) NOT NULL,
 `subjectKey` VARCHAR(100) NOT NULL, `subjectName` VARCHAR(100) NOT NULL,
 `termKey` VARCHAR(20) NOT NULL, `termName` VARCHAR(40) NOT NULL, `academicYearName` VARCHAR(40) NOT NULL,
 `status` ENUM('DRAFT','READY','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
 `weekCount` INTEGER NOT NULL DEFAULT 12, `weeks` JSON NOT NULL,
 `templateVersion` VARCHAR(191) NOT NULL DEFAULT 'teacher-template-v1', `revision` INTEGER NOT NULL DEFAULT 1,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
 PRIMARY KEY (`id`), INDEX `PersonalLessonPlan_teacherId_updatedAt_idx` (`teacherId`,`updatedAt`),
 INDEX `PersonalLessonPlan_teacherId_status_idx` (`teacherId`,`status`),
 CONSTRAINT `PersonalLessonPlan_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `TeacherAccount` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `TeacherActivity` (
 `id` VARCHAR(191) NOT NULL, `teacherId` VARCHAR(191) NOT NULL, `action` VARCHAR(40) NOT NULL,
 `planId` VARCHAR(191) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`id`), INDEX `TeacherActivity_teacherId_createdAt_idx` (`teacherId`,`createdAt`),
 CONSTRAINT `TeacherActivity_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `TeacherAccount` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
