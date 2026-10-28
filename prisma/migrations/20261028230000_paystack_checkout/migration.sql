CREATE TABLE `PaystackPayment` (
 `id` VARCHAR(191) NOT NULL, `reference` VARCHAR(80) NOT NULL, `idempotencyKey` VARCHAR(80) NOT NULL,
 `activeKey` VARCHAR(191) NULL, `purpose` ENUM('LESSON_EXPORT','SCHOOL_SUBSCRIPTION') NOT NULL,
 `status` ENUM('INITIALIZING','PENDING','FULFILLED','FAILED','REVIEW') NOT NULL DEFAULT 'INITIALIZING',
 `amountMinor` BIGINT NOT NULL, `currency` VARCHAR(3) NOT NULL DEFAULT 'GHS', `mode` VARCHAR(10) NOT NULL,
 `payerEmail` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NULL, `teacherId` VARCHAR(191) NULL,
 `tenantId` VARCHAR(191) NULL, `lessonPurchaseId` VARCHAR(191) NULL, `lessonPlanId` VARCHAR(191) NULL,
 `plan` ENUM('FREEMIUM','TRIAL','STARTER','PROFESSIONAL','ENTERPRISE') NULL,
 `billingCycle` ENUM('MONTHLY','ANNUAL') NULL, `authorizationUrl` VARCHAR(1000) NULL,
 `providerStatus` VARCHAR(30) NULL, `lastErrorCode` VARCHAR(80) NULL,
 `verifiedAt` DATETIME(3) NULL, `fulfilledAt` DATETIME(3) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
 PRIMARY KEY (`id`), UNIQUE INDEX `PaystackPayment_reference_key` (`reference`),
 UNIQUE INDEX `PaystackPayment_idempotencyKey_key` (`idempotencyKey`), UNIQUE INDEX `PaystackPayment_activeKey_key` (`activeKey`),
 INDEX `PaystackPayment_tenantId_createdAt_idx` (`tenantId`,`createdAt`),
 INDEX `PaystackPayment_teacherId_createdAt_idx` (`teacherId`,`createdAt`), INDEX `PaystackPayment_status_createdAt_idx` (`status`,`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
