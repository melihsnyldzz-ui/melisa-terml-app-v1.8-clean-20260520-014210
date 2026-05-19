-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('TRY', 'USD', 'EUR');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "balance_eur" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "balance_try" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "balance_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "default_currency" "Currency" NOT NULL DEFAULT 'TRY';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "buy_price_eur" DECIMAL(12,2),
ADD COLUMN     "buy_price_try" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "buy_price_usd" DECIMAL(12,2),
ADD COLUMN     "sell_price_eur" DECIMAL(12,2),
ADD COLUMN     "sell_price_try" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sell_price_usd" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "purchase_receipt_items" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'TRY',
ADD COLUMN     "eur_to_try" DECIMAL(12,6) NOT NULL DEFAULT 1,
ADD COLUMN     "eur_to_usd" DECIMAL(12,6),
ADD COLUMN     "usd_to_try" DECIMAL(12,6) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "purchase_receipts" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'TRY',
ADD COLUMN     "eur_to_try" DECIMAL(12,6) NOT NULL DEFAULT 1,
ADD COLUMN     "eur_to_usd" DECIMAL(12,6),
ADD COLUMN     "usd_to_try" DECIMAL(12,6) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "sales_receipt_items" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'TRY',
ADD COLUMN     "eur_to_try" DECIMAL(12,6) NOT NULL DEFAULT 1,
ADD COLUMN     "eur_to_usd" DECIMAL(12,6),
ADD COLUMN     "usd_to_try" DECIMAL(12,6) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "sales_receipts" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'TRY',
ADD COLUMN     "eur_to_try" DECIMAL(12,6) NOT NULL DEFAULT 1,
ADD COLUMN     "eur_to_usd" DECIMAL(12,6),
ADD COLUMN     "usd_to_try" DECIMAL(12,6) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "balance_eur" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "balance_try" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "balance_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "default_currency" "Currency" NOT NULL DEFAULT 'TRY';

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" SERIAL NOT NULL,
    "usd_to_try" DECIMAL(12,6) NOT NULL,
    "eur_to_try" DECIMAL(12,6) NOT NULL,
    "eur_to_usd" DECIMAL(12,6),
    "effective_date" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);
