-- CreateEnum: NotificationType
CREATE TABLE IF NOT EXISTS `_notification_type_enum` (
    value VARCHAR(50) PRIMARY KEY
);

INSERT IGNORE INTO `_notification_type_enum` (value) VALUES
('BUDGET_ALERT'),
('PAYMENT_REMINDER'),
('GOAL_COMPLETED'),
('DEBT_DUE'),
('UNUSUAL_SPENDING'),
('ACHIEVEMENT'),
('SYSTEM');

-- CreateEnum: NotificationPriority
CREATE TABLE IF NOT EXISTS `_notification_priority_enum` (
    value VARCHAR(20) PRIMARY KEY
);

INSERT IGNORE INTO `_notification_priority_enum` (value) VALUES
('LOW'),
('NORMAL'),
('HIGH'),
('URGENT');

-- CreateTable: notifications
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` ENUM('BUDGET_ALERT', 'PAYMENT_REMINDER', 'GOAL_COMPLETED', 'DEBT_DUE', 'UNUSUAL_SPENDING', 'ACHIEVEMENT', 'SYSTEM') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `icon` VARCHAR(191) NOT NULL DEFAULT '🔔',
    `link` VARCHAR(191) NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_idx`(`user_id`),
    INDEX `notifications_is_read_idx`(`is_read`),
    INDEX `notifications_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` 
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

