ALTER TABLE `Tenant` ADD COLUMN `subscriptionEndsAt` DATETIME(3) NULL;

UPDATE `Tenant`
SET `subscriptionEndsAt` = DATE_ADD(`createdAt`, INTERVAL 30 DAY)
WHERE `subscriptionEndsAt` IS NULL;

CREATE TABLE `Notification` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` ENUM('APPROVAL_REQUIRED', 'APPROVED', 'REJECTED', 'FINANCE_REVIEW', 'SUBSCRIPTION_EXPIRING', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
  `title` VARCHAR(191) NOT NULL,
  `message` VARCHAR(191) NOT NULL,
  `link` VARCHAR(191) NULL,
  `entityType` VARCHAR(191) NULL,
  `entityId` VARCHAR(191) NULL,
  `dedupeKey` VARCHAR(191) NULL,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Notification_userId_dedupeKey_key`(`userId`, `dedupeKey`),
  INDEX `Notification_tenantId_userId_readAt_createdAt_idx`(`tenantId`, `userId`, `readAt`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Notification_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
