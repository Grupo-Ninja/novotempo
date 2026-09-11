ALTER TABLE "Transacao" ADD COLUMN "dataPagamento" TIMESTAMP(3);
-- Historical payment dates cannot be inferred reliably from updatedAt.
