-- AlterTable
ALTER TABLE `otp_codes` ADD COLUMN `purpose` ENUM('PASSWORD_RESET', 'EMAIL_VERIFICATION') NOT NULL DEFAULT 'PASSWORD_RESET';

-- AlterTable
ALTER TABLE `users` ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `otp_codes_userId_purpose_idx` ON `otp_codes`(`userId`, `purpose`);


-- Accounts created before email verification existed stay usable
UPDATE `users` SET `emailVerifiedAt` = CURRENT_TIMESTAMP(3) WHERE `emailVerifiedAt` IS NULL;
