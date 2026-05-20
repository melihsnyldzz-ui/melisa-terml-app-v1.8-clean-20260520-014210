ALTER TABLE "products" ADD COLUMN "average_cost_try" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "sales_receipt_items"
  ADD COLUMN "unit_cost_try" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "total_cost_try" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "gross_profit_try" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "profit_margin" DECIMAL(12,4) NOT NULL DEFAULT 0;

ALTER TABLE "stock_movements"
  ADD COLUMN "unit_cost_try" DECIMAL(12,2),
  ADD COLUMN "value_change_try" DECIMAL(12,2),
  ADD COLUMN "stock_after" DECIMAL(12,2),
  ADD COLUMN "average_cost_after_try" DECIMAL(12,2);

UPDATE "products" SET "average_cost_try" = COALESCE(NULLIF("buy_price_try", 0), "buy_price", 0);
