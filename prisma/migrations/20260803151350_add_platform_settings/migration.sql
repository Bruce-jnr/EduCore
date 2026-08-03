-- CreateTable
CREATE TABLE `PlatformSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'platform',
    `platformName` VARCHAR(191) NOT NULL DEFAULT 'EduCore',
    `supportEmail` VARCHAR(191) NULL,
    `supportPhone` VARCHAR(191) NULL,
    `appUrl` VARCHAR(191) NULL,
    `defaultCountry` VARCHAR(191) NOT NULL DEFAULT 'Ghana',
    `defaultCurrency` VARCHAR(191) NOT NULL DEFAULT 'GHS',
    `defaultTimezone` VARCHAR(191) NOT NULL DEFAULT 'Africa/Accra',
    `defaultTrialDays` INTEGER NOT NULL DEFAULT 30,
    `registrationEnabled` BOOLEAN NOT NULL DEFAULT false,
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#4f46c8',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#1655d1',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
