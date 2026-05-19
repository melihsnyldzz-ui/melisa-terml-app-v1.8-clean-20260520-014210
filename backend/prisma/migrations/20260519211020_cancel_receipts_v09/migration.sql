-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'CANCEL';

-- AlterTable
ALTER TABLE "purchase_receipts" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "status" "ReceiptStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "sales_receipts" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "status" "ReceiptStatus" NOT NULL DEFAULT 'ACTIVE';
