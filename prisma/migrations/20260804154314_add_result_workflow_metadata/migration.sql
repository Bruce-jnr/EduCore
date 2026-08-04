-- AlterTable
ALTER TABLE `ResultSheet`
    ADD COLUMN `approvedById` VARCHAR(191) NULL,
    ADD COLUMN `publishedById` VARCHAR(191) NULL,
    ADD COLUMN `rejectionReason` VARCHAR(500) NULL;
