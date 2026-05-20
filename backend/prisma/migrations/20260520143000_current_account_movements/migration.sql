-- CreateEnum
CREATE TYPE "CurrentAccountPartyType" AS ENUM ('CUSTOMER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "CurrentAccountDocumentType" AS ENUM ('SALES_RECEIPT', 'PURCHASE_RECEIPT', 'PAYMENT', 'COLLECTION', 'CANCEL');

-- CreateEnum
CREATE TYPE "CurrentAccountDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "current_account_movements" (
    "id" SERIAL NOT NULL,
    "party_type" "CurrentAccountPartyType" NOT NULL,
    "customer_id" INTEGER,
    "supplier_id" INTEGER,
    "document_type" "CurrentAccountDocumentType" NOT NULL,
    "document_id" INTEGER NOT NULL,
    "document_no" TEXT NOT NULL,
    "direction" "CurrentAccountDirection" NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'TRY',
    "amount" DECIMAL(12,2) NOT NULL,
    "amount_try" DECIMAL(12,2),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "current_account_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "current_account_movements_party_type_customer_id_idx" ON "current_account_movements"("party_type", "customer_id");

-- CreateIndex
CREATE INDEX "current_account_movements_party_type_supplier_id_idx" ON "current_account_movements"("party_type", "supplier_id");

-- CreateIndex
CREATE INDEX "current_account_movements_document_type_document_id_idx" ON "current_account_movements"("document_type", "document_id");

-- CreateIndex
CREATE INDEX "current_account_movements_created_at_idx" ON "current_account_movements"("created_at");

-- AddForeignKey
ALTER TABLE "current_account_movements" ADD CONSTRAINT "current_account_movements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_movements" ADD CONSTRAINT "current_account_movements_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
