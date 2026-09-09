ALTER TABLE "Transacao" ADD COLUMN "carregamentoId" TEXT;

CREATE UNIQUE INDEX "Transacao_carregamentoId_key" ON "Transacao"("carregamentoId");

ALTER TABLE "Transacao"
  ADD CONSTRAINT "Transacao_carregamentoId_fkey"
  FOREIGN KEY ("carregamentoId")
  REFERENCES "Carregamento"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
