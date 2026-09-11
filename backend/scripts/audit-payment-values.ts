import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Read-only: current loading values are proposals, not proof of original values.
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.transacao.findMany({
    where: { valorDebitado: 0 },
    include: { carregamento: true },
  });
  console.log(JSON.stringify(rows.map(t => ({
    id: t.id, numeroId: t.numeroId, status: t.status,
    contratoId: t.contratoId, carregamentoId: t.carregamentoId,
    valorDebitado: t.valorDebitado, refProdutor: t.refProdutor, refComissao: t.refComissao,
    createdAt: t.createdAt, updatedAt: t.updatedAt,
    valorCargaAtual: t.carregamento?.valorCarga ?? null,
    cargaAtualizadaEm: t.carregamento?.updatedAt ?? null,
    avaliacao: t.carregamento && t.carregamento.valorCarga > 0
      ? "Candidato: conferir comprovantes, ajustes e alterações da carga antes de recuperar"
      : "Sem valor recuperável pela carga relacionada",
  })), null, 2));
}
main().catch(() => {
  console.error("Falha na auditoria. Verifique a conexão DATABASE_URL.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
