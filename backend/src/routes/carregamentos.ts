import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminOnly, operacionalOrAdmin } from "../middleware/auth";
import { validate, carregamentoSchema, carregamentoUpdateSchema } from "../middleware/validate";
import { AppError } from "../middleware/errorHandler";
import {
  calcCarregamento,
  DEFAULT_PESO_SACA_KG,
  generateNumeroId,
  parseCivilDate,
  parseCivilDateRange,
  shouldSyncAutoTransacao,
} from "../lib/utils";

const router = Router();

// GET /api/carregamentos?contratoId=&dataInicio=&dataFim=&comprador=&produtor=&page=&limit=
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const { contratoId, dataInicio, dataFim, comprador, produtor, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(String(page || "1")));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit || "20"))));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (contratoId) where.contratoId = String(contratoId);
    if (dataInicio || dataFim) {
      where.dataEnvio = {};
      if (dataInicio) where.dataEnvio.gte = parseCivilDateRange(String(dataInicio));
      if (dataFim) where.dataEnvio.lte = parseCivilDateRange(String(dataFim), true);
    }
    if (comprador) where.contrato = { ...where.contrato, comprador: { nome: { contains: String(comprador), mode: "insensitive" } } };
    if (produtor) where.contrato = { ...where.contrato, produtor: { nome: { contains: String(produtor), mode: "insensitive" } } };

    const [data, total] = await Promise.all([
      prisma.carregamento.findMany({
        where,
        include: { contrato: { include: { comprador: true, produtor: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.carregamento.count({ where }),
    ]);

    res.json({
      data,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/carregamentos — operacional ou admin
router.post("/", authMiddleware, operacionalOrAdmin, validate(carregamentoSchema), async (req, res, next) => {
  try {
    const data = req.body;

    // ── Guardrail: excess load check ───────────────────────────────────────
    const contrato = await prisma.contrato.findUnique({
      where: { id: data.contratoId },
      include: { carregamentos: true },
    });

    if (!contrato) throw new AppError(404, "Contrato não encontrado.", "NOT_FOUND");

    const refPeso = data.refPeso > 0
      ? data.refPeso
      : (contrato.refPeso > 0 ? contrato.refPeso : DEFAULT_PESO_SACA_KG);
    const refValorSaca = data.refValorSaca > 0 ? data.refValorSaca : contrato.valorSaca;
    const calculado = calcCarregamento(data.pesoKg, refPeso, refValorSaca);

    const sacasJaCarregadas = contrato.carregamentos.reduce((s, c) => s + c.qntSacas, 0);
    const saldoDisponivel = contrato.numSacas - sacasJaCarregadas;

    if (calculado.qntSacas > saldoDisponivel) {
      throw new AppError(
        422,
        `Excesso de carga: saldo disponível é ${saldoDisponivel.toLocaleString("pt-BR")} sacas, mas o peso informado corresponde a ${calculado.qntSacas.toLocaleString("pt-BR")} sacas.`,
        "EXCESS_LOAD"
      );
    }
    // ──────────────────────────────────────────────────────────────────────

    const dataEnvio = parseCivilDate(data.dataEnvio);

    const carregamento = await prisma.$transaction(async (tx) => {
      const numeroId = generateNumeroId("CAR");
      const created = await tx.carregamento.create({
        data: {
          numeroId,
          contratoId: data.contratoId,
          corretor: data.corretor ?? null,
          motorista: data.motorista ?? null,
          produto: data.produto ?? null,
          observacoes: data.observacoes ?? null,
          pesoKg: data.pesoKg,
          qntSacas: calculado.qntSacas,
          valorCarga: calculado.valorCarga,
          refPeso: calculado.refPeso,
          refValorSaca: calculado.refValorSaca,
          umidadeSorgo: data.umidadeSorgo ?? null,
          dataEnvio,
        },
      });

      await tx.transacao.upsert({
        where: { carregamentoId: created.id },
        create: {
          numeroId: generateNumeroId("TRX"),
          contratoId: created.contratoId,
          carregamentoId: created.id,
          categoria: `Carregamento ${created.numeroId}`,
          status: "pendente",
          valorDebitado: calculado.valorCarga,
          refProdutor: calculado.valorCarga,
          refComissao: 0,
          dataTransacao: dataEnvio,
          observacoes: "Transação gerada automaticamente a partir do carregamento.",
        },
        update: {},
      });

      return created;
    });

    res.status(201).json(carregamento);
  } catch (err) {
    next(err);
  }
});

// PUT /api/carregamentos/:id — operacional ou admin
router.put("/:id", authMiddleware, operacionalOrAdmin, validate(carregamentoUpdateSchema), async (req, res, next) => {
  try {
    const data = req.body;

    const existing = await prisma.carregamento.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new AppError(404, "Carregamento não encontrado.", "NOT_FOUND");

    const contrato = await prisma.contrato.findUnique({
      where: { id: existing.contratoId },
      include: { carregamentos: true },
    });
    if (!contrato) throw new AppError(404, "Contrato não encontrado.", "NOT_FOUND");

    const pesoKg = data.pesoKg ?? existing.pesoKg;
    const refPeso = data.refPeso > 0
      ? data.refPeso
      : (existing.refPeso > 0 ? existing.refPeso : (contrato.refPeso > 0 ? contrato.refPeso : DEFAULT_PESO_SACA_KG));
    const refValorSaca = data.refValorSaca > 0
      ? data.refValorSaca
      : (existing.refValorSaca > 0 ? existing.refValorSaca : contrato.valorSaca);
    const calculado = calcCarregamento(pesoKg, refPeso, refValorSaca);
    const sacasJaCarregadas = contrato.carregamentos
      .filter((c) => c.id !== existing.id)
      .reduce((s, c) => s + c.qntSacas, 0);
    const saldoDisponivel = contrato.numSacas - sacasJaCarregadas;

    if (calculado.qntSacas > saldoDisponivel) {
      throw new AppError(
        422,
        `Excesso de carga: saldo disponível é ${saldoDisponivel.toLocaleString("pt-BR")} sacas.`,
        "EXCESS_LOAD"
      );
    }

    const updateData: any = { ...data, ...calculado, pesoKg };
    if (data.dataEnvio !== undefined) updateData.dataEnvio = parseCivilDate(data.dataEnvio);

    const carregamento = await prisma.$transaction(async (tx) => {
      const updated = await tx.carregamento.update({
        where: { id: String(req.params.id) },
        data: updateData,
      });

      const existingTransacao = await tx.transacao.findUnique({
        where: { carregamentoId: updated.id },
      });

      if (!existingTransacao) {
        await tx.transacao.create({
          data: {
            numeroId: generateNumeroId("TRX"),
            contratoId: updated.contratoId,
            carregamentoId: updated.id,
            categoria: `Carregamento ${updated.numeroId}`,
            status: "pendente",
            valorDebitado: calculado.valorCarga,
            refProdutor: calculado.valorCarga,
            refComissao: 0,
            dataTransacao: updateData.dataEnvio ?? updated.dataEnvio,
            observacoes: "Transação gerada automaticamente a partir do carregamento.",
          },
        });
      } else if (shouldSyncAutoTransacao(existingTransacao.status)) {
        await tx.transacao.update({
          where: { id: existingTransacao.id },
          data: {
            contratoId: updated.contratoId,
            categoria: `Carregamento ${updated.numeroId}`,
            valorDebitado: calculado.valorCarga,
            refProdutor: calculado.valorCarga,
            dataTransacao: updateData.dataEnvio ?? updated.dataEnvio,
          },
        });
      }

      return updated;
    });
    res.json(carregamento);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/carregamentos/:id — admin only
router.delete("/:id", authMiddleware, adminOnly, async (req, res, next) => {
  try {
    await prisma.carregamento.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
