CREATE TYPE "ImportJobKind" AS ENUM ('PRODUCTS', 'CUSTOMERS', 'SUPPLIERS', 'PRICES', 'STOCK');
CREATE TYPE "ImportJobMode" AS ENUM ('createOnly', 'updateOnly', 'upsert', 'stockAdjustment');
CREATE TYPE "ImportJobStatus" AS ENUM ('PREVIEWED', 'APPLIED', 'FAILED');

CREATE TABLE "import_jobs" (
  "id" SERIAL NOT NULL,
  "kind" "ImportJobKind" NOT NULL,
  "mode" "ImportJobMode" NOT NULL,
  "file_name" TEXT,
  "status" "ImportJobStatus" NOT NULL DEFAULT 'PREVIEWED',
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "valid_rows" INTEGER NOT NULL DEFAULT 0,
  "warning_rows" INTEGER NOT NULL DEFAULT 0,
  "error_rows" INTEGER NOT NULL DEFAULT 0,
  "duplicate_rows" INTEGER NOT NULL DEFAULT 0,
  "created_count" INTEGER NOT NULL DEFAULT 0,
  "updated_count" INTEGER NOT NULL DEFAULT 0,
  "skipped_count" INTEGER NOT NULL DEFAULT 0,
  "applied_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "applied_at" TIMESTAMP(3),
  CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_job_rows" (
  "id" SERIAL NOT NULL,
  "import_job_id" INTEGER NOT NULL,
  "row_number" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "error_json" JSONB,
  "warning_json" JSONB,
  "raw_json" JSONB,
  "entity_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_job_rows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "import_jobs_kind_status_idx" ON "import_jobs"("kind", "status");
CREATE INDEX "import_jobs_created_at_idx" ON "import_jobs"("created_at");
CREATE INDEX "import_job_rows_import_job_id_idx" ON "import_job_rows"("import_job_id");
CREATE INDEX "import_job_rows_status_idx" ON "import_job_rows"("status");

ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "import_job_rows" ADD CONSTRAINT "import_job_rows_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
