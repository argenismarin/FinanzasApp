-- CreateTable: debt_payments
-- Tabla para registrar el historial de pagos de cada deuda

CREATE TABLE `debt_payments` (
    `id` VARCHAR(191) NOT NULL,
    `debt_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `description` VARCHAR(191) NULL,
    `payment_date` DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `debt_payments_debt_id_idx`(`debt_id`),
    INDEX `debt_payments_payment_date_idx`(`payment_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `debt_payments` ADD CONSTRAINT `debt_payments_debt_id_fkey` 
    FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

