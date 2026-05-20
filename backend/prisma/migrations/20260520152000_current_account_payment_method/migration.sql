-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK', 'CARD', 'OTHER');

-- AlterTable
ALTER TABLE "current_account_movements" ADD COLUMN "payment_method" "PaymentMethod";
