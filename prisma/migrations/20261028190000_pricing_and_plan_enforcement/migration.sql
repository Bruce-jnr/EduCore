ALTER TABLE `Tenant`
 MODIFY `subscriptionPlan` ENUM('FREEMIUM','TRIAL','STARTER','PROFESSIONAL','ENTERPRISE') NOT NULL DEFAULT 'FREEMIUM',
 MODIFY `subscriptionStatus` ENUM('TRIAL','ACTIVE','PAST_DUE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
 ADD `requestedSubscriptionPlan` ENUM('FREEMIUM','TRIAL','STARTER','PROFESSIONAL','ENTERPRISE') NULL,
 ADD `billingCycle` ENUM('MONTHLY','ANNUAL') NOT NULL DEFAULT 'MONTHLY',
 ADD `paidTrialUsed` BOOLEAN NOT NULL DEFAULT false,
 ADD `enterpriseStudentLimit` INTEGER NULL,
 ADD `enterpriseStaffLimit` INTEGER NULL,
 ADD `enterprisePrice` DECIMAL(12,2) NULL;
-- Preserve all existing subscriptions and expiry dates. Legacy trials cannot be restarted.
UPDATE `Tenant` SET `paidTrialUsed`=true WHERE `subscriptionPlan` <> 'FREEMIUM';
ALTER TABLE `PlatformSettings` ALTER COLUMN `defaultTrialDays` SET DEFAULT 14;
UPDATE `PlatformSettings` SET `defaultTrialDays`=14 WHERE `defaultTrialDays`=30;
CREATE TABLE `SubscriptionPayment` (
 `id` VARCHAR(191) NOT NULL, `tenantId` VARCHAR(191) NOT NULL,
 `plan` ENUM('FREEMIUM','TRIAL','STARTER','PROFESSIONAL','ENTERPRISE') NOT NULL,
 `billingCycle` ENUM('MONTHLY','ANNUAL') NOT NULL, `amount` DECIMAL(12,2) NOT NULL,
 `currency` VARCHAR(3) NOT NULL DEFAULT 'GHS',
 `paymentMethod` ENUM('CASH','MOBILE_MONEY','CARD','BANK_TRANSFER','CHEQUE','OTHER') NOT NULL,
 `paymentReference` VARCHAR(120) NOT NULL, `idempotencyKey` VARCHAR(80) NOT NULL,
 `periodStart` DATETIME(3) NOT NULL, `periodEnd` DATETIME(3) NOT NULL, `verifiedById` VARCHAR(191) NOT NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
 UNIQUE INDEX `SubscriptionPayment_idempotencyKey_key` (`idempotencyKey`),
 UNIQUE INDEX `SubscriptionPayment_paymentMethod_paymentReference_key` (`paymentMethod`,`paymentReference`),
 INDEX `SubscriptionPayment_tenantId_createdAt_idx` (`tenantId`,`createdAt`),
 CONSTRAINT `SubscriptionPayment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
