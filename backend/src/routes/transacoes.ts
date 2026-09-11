import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminOnly, operacionalOrAdmin } from "../middleware/auth";
import { transacaoSchema, transacaoUpdateSchema } from "../middleware/validate";
import { calcFinancialSummary, generateNumeroId, parseCivilDate, parseCivilDateRange } from "../lib/utils";

const router = Router();

// ── File upload setup (comprovante) ──────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), "uploads", "comprovantes");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido. Use PDF, JPG ou PNG."));
    }
  },
});

function zodErrors(err: any) {
  return (err.issues ?? err.errors ?? []).map((e: any) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

// GET /api/transacoes/uploads/:filename
router.get("/uploads/:filename", authMiddleware, (req, res) => {
  const filePath = path.join(uploadsDir, String(req.params.filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Arquivo não encontrado.", code: "NOT_FOUND" });
  }
  res.sendFile(filePath);
});

// GET /api/transacoes?contratoId=&status=&dataInicio=&dataFim=&comprador=&produtor=&page=&limit=
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const { contratoId, status, dataInicio, dataFim, comprador, produtor, carregamento, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(String(page || "1")));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit || "20"))));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (contratoId) where.contratoId = String(contratoId);
    if (status) where.status = String(status);
    if (dataInicio || dataFim) {
      where.dataTransacao = {};
      if (dataInicio) where.dataTransacao.gte = parseCivilDateRange(String(dataInicio));
      if (dataFim) where.dataTransacao.lte = parseCivilDateRange(String(dataFim), true);
    }
    if (comprador) where.contrato = { ...where.contrato, comprador: { nome: { contains: String(comprador), mode: "insensitive" } } };
    if (produtor) where.contrato = { ...where.contrato, produtor: { nome: { contains: String(produtor), mode: "insensitive" } } };
    if (carregamento) {
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { carregamento: { is: { numeroId: { contains: String(carregamento), mode: "insensitive" } } } },
            { carregamento: { is: { motorista: { contains: String(carregamento), mode: "insensitive" } } } },
          ],
        },
      ];
    }

    const [data, total, allFiltered] = await Promise.all([
      prisma.transacao.findMany({
        where,
        include: { carregamento: true, contrato: { include: { comprador: true, produtor: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.transacao.count({ where }),
      prisma.transacao.findMany({
        where,
        select: { status: true, valorDebitado: true },
      }),
    ]);

    const summary = calcFinancialSummary(allFiltered);

    res.json({
      data,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      summary,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/transacoes — operacional ou admin
router.post(
  "/",
  authMiddleware,
  operacionalOrAdmin,
  upload.single("comprovante"),
  async (req, res, next) => {
    try {
      const parseResult = transacaoSchema.safeParse(req.body);
      if (!parseResult.success) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(422).json({ error: "Dados inválidos.", details: zodErrors(parseResult.error), code: "VALIDATION_ERROR" });
      }

      const data = parseResult.data;
      const numeroId = generateNumeroId("TRX");

      // Use `as any` because comprovante was just added via migration and TS server may cache old types
      const transacao = await prisma.transacao.create({
        data: {
          numeroId,
          contratoId: data.contratoId,
          carregamentoId: data.carregamentoId ?? null,
          categoria: data.categoria ?? null,
          metodoPagamento: data.metodoPagamento ?? null,
          nfs: data.nfs ?? null,
          nfAcesso: data.nfAcesso ?? null,
          status: data.status,
          tipoDaNota: data.tipoDaNota ?? null,
          observacoes: data.observacoes ?? null,
          valorDebitado: data.valorDebitado,
          refProdutor: data.refProdutor,
          refComissao: data.refComissao,
          dataTransacao: parseCivilDate(data.dataTransacao),
          dataPagamento: data.status === "pago" ? new Date() : null,
          comprovante: req.file ? req.file.filename : null,
        },
      });

      res.status(201).json(transacao);
    } catch (err) {
      if (req.file) fs.unlink(req.file.path, () => {});
      next(err);
    }
  }
);

// PUT /api/transacoes/:id — operacional ou admin
router.put(
  "/:id",
  authMiddleware,
  operacionalOrAdmin,
  upload.single("comprovante"),
  async (req, res, next) => {
    try {
      const parseResult = transacaoUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(422).json({ error: "Dados inválidos.", details: zodErrors(parseResult.error), code: "VALIDATION_ERROR" });
      }

      const data = parseResult.data;
      const updateData: any = { ...data };
      if (data.dataTransacao !== undefined) updateData.dataTransacao = parseCivilDate(data.dataTransacao);

      // A payment confirmation never changes the financial snapshot, even if
      // an older client submits a full form with empty monetary inputs.
      if (data.status === "pago") {
        delete updateData.valorDebitado;
        delete updateData.refProdutor;
        delete updateData.refComissao;
      }

      if (req.file) {
        const existing = await prisma.transacao.findUnique({ where: { id: String(req.params.id) } });
        if (existing?.comprovante) {
          const oldPath = path.join(uploadsDir, existing.comprovante);
          if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => {});
        }
        updateData.comprovante = req.file.filename;
      }

      delete updateData.contratoId;
      delete updateData.carregamentoId;
      delete updateData.id;

      const transacao = await prisma.$transaction(async (tx) => {
        const where = { id: String(req.params.id) };
        if (data.status === "pago") {
          // Conditional write preserves the first confirmation on retries.
          await tx.transacao.updateMany({
            where: { ...where, status: { not: "pago" }, dataPagamento: null },
            data: { dataPagamento: new Date() },
          });
        }
        return tx.transacao.update({ where, data: updateData });
      });
      res.json(transacao);
    } catch (err) {
      if (req.file) fs.unlink(req.file.path, () => {});
      next(err);
    }
  }
);

// DELETE /api/transacoes/:id — admin only
router.delete("/:id", authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const existing = await prisma.transacao.findUnique({ where: { id: String(req.params.id) } });
    if (existing?.comprovante) {
      const filePath = path.join(uploadsDir, existing.comprovante);
      if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
    }
    await prisma.transacao.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
