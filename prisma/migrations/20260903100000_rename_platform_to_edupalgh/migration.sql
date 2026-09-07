ALTER TABLE `PlatformSettings`
  MODIFY `platformName` VARCHAR(191) NOT NULL DEFAULT 'EduPalGh';

UPDATE `PlatformSettings`
SET `platformName` = 'EduPalGh'
WHERE `platformName` = 'EduCore';
