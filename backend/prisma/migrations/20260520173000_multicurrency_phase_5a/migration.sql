ALTER TABLE "products"
  ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'TRY',
  ADD COLUMN "purchase_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "sale_price" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "products"
SET
  "purchase_price" = COALESCE(NULLIF("buy_price", 0), "buy_price_try", 0),
  "sale_price" = COALESCE(NULLIF("sell_price", 0), "sell_price_try", 0);

ALTER TABLE "purchase_receipts"
  ADD COLUMN "document_currency" "Currency" NOT NULL DEFAULT 'TRY',
  ADD COLUMN "exchange_rate_to_try" DECIMAL(12,6) NOT NULL DEFAULT 1,
  ADD COLUMN "original_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "total_try" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "purchase_receipts"
SET
  "document_currency" = "currency",
  "exchange_rate_to_try" = CASE
    WHEN "currency" = 'USD' THEN "usd_to_try"
    WHEN "currency" = 'EUR' THEN "eur_to_try"
    ELSE 1
  END,
  "original_total" = "total_amount",
  "total_try" = COALESCE("total_amount_try", "total_amount");

ALTER TABLE "sales_receipts"
  ADD COLUMN "document_currency" "Currency" NOT NULL DEFAULT 'TRY',
  ADD COLUMN "exchange_rate_to_try" DECIMAL(12,6) NOT NULL DEFAULT 1,
  ADD COLUMN "original_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "total_try" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "sales_receipts"
SET
  "document_currency" = "currency",
  "exchange_rate_to_try" = CASE
    WHEN "currency" = 'USD' THEN "usd_to_try"
    WHEN "currency" = 'EUR' THEN "eur_to_try"
    ELSE 1
  END,
  "original_total" = "total_amount",
  "total_try" = COALESCE("total_amount_try", "total_amount");

ALTER TABLE "purchase_receipt_items"
  ADD COLUMN "line_currency" "Currency" NOT NULL DEFAULT 'TRY',
  ADD COLUMN "unit_price_original" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "line_total_original" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "unit_price_try" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "line_total_try" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "purchase_receipt_items"
SET
  "line_currency" = "currency",
  "unit_price_original" = "unit_price",
  "line_total_original" = "line_total",
  "unit_price_try" = CASE
    WHEN "currency" = 'USD' THEN "unit_price" * "usd_to_try"
    WHEN "currency" = 'EUR' THEN "unit_price" * "eur_to_try"
    ELSE "unit_price"
  END,
  "line_total_try" = CASE
    WHEN "currency" = 'USD' THEN "line_total" * "usd_to_try"
    WHEN "currency" = 'EUR' THEN "line_total" * "eur_to_try"
    ELSE "line_total"
  END;

ALTER TABLE "sales_receipt_items"
  ADD COLUMN "line_currency" "Currency" NOT NULL DEFAULT 'TRY',
  ADD COLUMN "unit_price_original" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "line_total_original" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "unit_price_try" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "line_total_try" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "sales_receipt_items"
SET
  "line_currency" = "currency",
  "unit_price_original" = "unit_price",
  "line_total_original" = "line_total",
  "unit_price_try" = CASE
    WHEN "currency" = 'USD' THEN "unit_price" * "usd_to_try"
    WHEN "currency" = 'EUR' THEN "unit_price" * "eur_to_try"
    ELSE "unit_price"
  END,
  "line_total_try" = CASE
    WHEN "currency" = 'USD' THEN "line_total" * "usd_to_try"
    WHEN "currency" = 'EUR' THEN "line_total" * "eur_to_try"
    ELSE "line_total"
  END;

ALTER TABLE "current_account_movements"
  ADD COLUMN "account_currency" "Currency" NOT NULL DEFAULT 'TRY',
  ADD COLUMN "account_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "document_currency" "Currency" NOT NULL DEFAULT 'TRY',
  ADD COLUMN "document_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "current_account_movements"
SET
  "account_currency" = "currency",
  "account_amount" = "amount",
  "document_currency" = "currency",
  "document_amount" = "amount";
