-- v1.6 manual currency conversion snapshots and pair-rate preparation.

ALTER TABLE "exchange_rates"
ADD COLUMN IF NOT EXISTS "base_currency" "Currency",
ADD COLUMN IF NOT EXISTS "target_currency" "Currency",
ADD COLUMN IF NOT EXISTS "rate" DECIMAL(12,6),
ADD COLUMN IF NOT EXISTS "try_to_usd" DECIMAL(12,6),
ADD COLUMN IF NOT EXISTS "try_to_eur" DECIMAL(12,6),
ADD COLUMN IF NOT EXISTS "usd_to_eur" DECIMAL(12,6);

UPDATE "exchange_rates"
SET
  "try_to_usd" = COALESCE("try_to_usd", CASE WHEN "usd_to_try" <> 0 THEN 1 / "usd_to_try" ELSE NULL END),
  "try_to_eur" = COALESCE("try_to_eur", CASE WHEN "eur_to_try" <> 0 THEN 1 / "eur_to_try" ELSE NULL END),
  "eur_to_usd" = COALESCE("eur_to_usd", CASE WHEN "usd_to_try" <> 0 THEN "eur_to_try" / "usd_to_try" ELSE NULL END),
  "usd_to_eur" = COALESCE("usd_to_eur", CASE WHEN "eur_to_try" <> 0 THEN "usd_to_try" / "eur_to_try" ELSE NULL END);

ALTER TABLE "sales_receipts"
ADD COLUMN IF NOT EXISTS "total_amount_try" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "exchange_rate_snapshot" JSONB;

ALTER TABLE "purchase_receipts"
ADD COLUMN IF NOT EXISTS "total_amount_try" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "exchange_rate_snapshot" JSONB;

ALTER TABLE "sales_receipt_items"
ADD COLUMN IF NOT EXISTS "original_unit_price" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "original_currency" "Currency",
ADD COLUMN IF NOT EXISTS "receipt_currency" "Currency",
ADD COLUMN IF NOT EXISTS "exchange_rate_used" DECIMAL(12,6),
ADD COLUMN IF NOT EXISTS "converted_unit_price" DECIMAL(12,2);

UPDATE "sales_receipt_items"
SET
  "original_unit_price" = COALESCE("original_unit_price", "unit_price"),
  "original_currency" = COALESCE("original_currency", "currency"),
  "receipt_currency" = COALESCE("receipt_currency", "currency"),
  "exchange_rate_used" = COALESCE("exchange_rate_used", 1),
  "converted_unit_price" = COALESCE("converted_unit_price", "unit_price");

ALTER TABLE "purchase_receipt_items"
ADD COLUMN IF NOT EXISTS "original_unit_price" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "original_currency" "Currency",
ADD COLUMN IF NOT EXISTS "receipt_currency" "Currency",
ADD COLUMN IF NOT EXISTS "exchange_rate_used" DECIMAL(12,6),
ADD COLUMN IF NOT EXISTS "converted_unit_price" DECIMAL(12,2);

UPDATE "purchase_receipt_items"
SET
  "original_unit_price" = COALESCE("original_unit_price", "unit_price"),
  "original_currency" = COALESCE("original_currency", "currency"),
  "receipt_currency" = COALESCE("receipt_currency", "currency"),
  "exchange_rate_used" = COALESCE("exchange_rate_used", 1),
  "converted_unit_price" = COALESCE("converted_unit_price", "unit_price");
