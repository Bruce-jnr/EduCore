CREATE TABLE `TeacherLessonPurchase` (
 `id` VARCHAR(191) NOT NULL, `teacherId` VARCHAR(191) NOT NULL, `planId` VARCHAR(191) NOT NULL,
 `product` VARCHAR(30) NOT NULL, `amount` DECIMAL(10,2) NOT NULL, `currency` VARCHAR(3) NOT NULL DEFAULT 'GHS',
 `status` ENUM('PENDING','PAID') NOT NULL DEFAULT 'PENDING', `idempotencyKey` VARCHAR(80) NOT NULL,
 `paymentMethod` ENUM('CASH','MOBILE_MONEY','CARD','BANK_TRANSFER','CHEQUE','OTHER') NULL,
 `paymentReference` VARCHAR(120) NULL, `verifiedById` VARCHAR(191) NULL, `verifiedAt` DATETIME(3) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
 PRIMARY KEY (`id`), UNIQUE INDEX `TeacherLessonPurchase_planId_key` (`planId`),
 UNIQUE INDEX `TeacherLessonPurchase_idempotencyKey_key` (`idempotencyKey`),
 UNIQUE INDEX `TeacherLessonPurchase_paymentMethod_paymentReference_key` (`paymentMethod`,`paymentReference`),
 INDEX `TeacherLessonPurchase_teacherId_createdAt_idx` (`teacherId`,`createdAt`),
 INDEX `TeacherLessonPurchase_status_createdAt_idx` (`status`,`createdAt`),
 CONSTRAINT `TeacherLessonPurchase_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `TeacherAccount` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT `TeacherLessonPurchase_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `PersonalLessonPlan` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
