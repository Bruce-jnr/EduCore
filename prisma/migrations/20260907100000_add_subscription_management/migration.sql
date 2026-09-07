ALTER TABLE `Tenant`
  ADD COLUMN `subscriptionPlan` ENUM('TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE') NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN `subscriptionStatus` ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN `trialStartedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `trialEndsAt` DATETIME(3) NULL,
  ADD COLUMN `subscriptionStartedAt` DATETIME(3) NULL;

UPDATE `Tenant`
SET
  `trialStartedAt` = `createdAt`,
  `trialEndsAt` = `subscriptionEndsAt`,
  `subscriptionStatus` = CASE
    WHEN `subscriptionEndsAt` IS NOT NULL AND `subscriptionEndsAt` < CURRENT_TIMESTAMP(3) THEN 'EXPIRED'
    ELSE 'TRIAL'
  END;

CREATE INDEX `Tenant_subscriptionStatus_subscriptionEndsAt_idx`
  ON `Tenant`(`subscriptionStatus`, `subscriptionEndsAt`);
