import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { calcContrato } from "../lib/utils";

const router = Router();

// GET /api/dashboard
router.get("/", authMiddleware, async (_req, res, next) => {
  try {
    const contratos = await prisma.contrato.findMany({
      include: { carregamentos: true, transacoes: true, comprador: true, produtor: true },
    });

    const totalContratos = contratos.length;
    const emAndamento = contratos.filter((c) => c.status === "em_andamento").length;
    const concluidos  = contratos.filter((c) => c.status === "concluido").length;
    const naoIniciados = contratos.filter((c) => c.status === "nao_iniciado").length;

    let totalValorContratos   = 0;
    let totalComissaoProjetada = 0;
    let totalComissaoRecebida  = 0;
    let totalRecebidoCarga     = 0;
    let totalAReceberCarga     = 0;
    let totalSacasARetirar     = 0;

    for (const c of contratos) {
      const calc = calcContrato(c);
      totalValorContratos    += calc.valorContrato;
      totalComissaoProjetada += calc.comissaoProjetada;
      totalComissaoRecebida  += calc.comissaoRecebida;
      totalRecebidoCarga     += calc.totalRecebidoCarga;
      totalAReceberCarga     += calc.aReceberCarga;
      totalSacasARetirar     += calc.sacasARetirar;
    }

    const totalSacas = contratos.reduce((s, c) => s + c.numSacas, 0);
    const totalCarregamentos = contratos.reduce((s, c) => s + c.carregamentos.length, 0);

    res.json({
      totalContratos,
      emAndamento,
      concluidos,
      naoIniciados,
      totalValorContratos,
      totalComissaoProjetada,
      totalComissaoRecebida,
      totalComissaoAReceber: totalComissaoProjetada - totalComissaoRecebida,
      totalRecebidoCarga,
      totalAReceberCarga,
      totalSacas,
      totalSacasARetirar,
      totalCarregamentos,
      contratosRecentes: contratos
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((c) => {
          const calc = calcContrato(c);
          return {
            id: c.id,
            numeroId: c.numeroId,
            displayNumber: c.displayNumber,
            status: c.status,
            produto: c.produto,
            comprador: c.comprador.nome,
            produtor: c.produtor.nome,
            valorContrato: calc.valorContrato,
            numSacas: c.numSacas,
            sacasARetirar: calc.sacasARetirar,
            percRecebida: calc.percRecebida,
          };
        }),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
