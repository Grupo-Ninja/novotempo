ALTER TABLE "Contrato" ADD COLUMN "displayNumber" TEXT;

UPDATE "Contrato"
SET "displayNumber" = "numeroId"
WHERE "displayNumber" IS NULL;

CREATE UNIQUE INDEX "Contrato_displayNumber_key" ON "Contrato"("displayNumber");

CREATE SEQUENCE IF NOT EXISTS contract_display_number_seq START WITH 1 INCREMENT BY 1;
