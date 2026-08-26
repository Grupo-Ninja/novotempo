import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminOnly } from "../middleware/auth";
import { validate, contratoSchema, contratoUpdateSchema } from "../middleware/validate";
import { AppError } from "../middleware/errorHandler";
import { generateNumeroId, calcContrato } from "../lib/utils";
import * as fs from "fs";
import * as path from "path";

const router = Router();

// GET /api/contratos?status=&q=&produto=&comprador=&produtor=&dataInicio=&dataFim=&page=&limit=
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const { status, q, produto, comprador, produtor, dataInicio, dataFim, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(String(page || "1")));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit || "20"))));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = String(status);
    if (produto) where.produto = { contains: String(produto), mode: "insensitive" };
    if (comprador) where.comprador = { nome: { contains: String(comprador), mode: "insensitive" } };
    if (produtor) where.produtor = { nome: { contains: String(produtor), mode: "insensitive" } };
    if (dataInicio || dataFim) {
      where.dataFechamento = {};
      if (dataInicio) where.dataFechamento.gte = new Date(String(dataInicio));
      if (dataFim) {
        const fim = new Date(String(dataFim));
        fim.setHours(23, 59, 59, 999);
        where.dataFechamento.lte = fim;
      }
    }
    if (q) {
      where.OR = [
        { numeroId: { contains: String(q), mode: "insensitive" } },
        { produto: { contains: String(q), mode: "insensitive" } },
        { comprador: { nome: { contains: String(q), mode: "insensitive" } } },
        { produtor: { nome: { contains: String(q), mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.contrato.findMany({
        where,
        include: { comprador: true, produtor: true, carregamentos: true, transacoes: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.contrato.count({ where }),
    ]);

    res.json({
      data,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/contratos/:id
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id: String(req.params.id) },
      include: {
        comprador: true,
        produtor: true,
        carregamentos: { orderBy: { dataEnvio: "desc" } },
        transacoes: { orderBy: { dataTransacao: "desc" } },
      },
    });
    if (!contrato) throw new AppError(404, "Contrato não encontrado.", "NOT_FOUND");
    res.json(contrato);
  } catch (err) {
    next(err);
  }
});

// POST /api/contratos — admin only
router.post("/", authMiddleware, adminOnly, validate(contratoSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const numeroId = generateNumeroId("CTR");

    const contrato = await (prisma.contrato.create as any)({
      data: {
        numeroId,
        status: data.status,
        produto: data.produto,
        compradorId: data.compradorId,
        produtorId: data.produtorId,
        cidade: data.cidade ?? null,
        numSacas: data.numSacas,
        valorSaca: data.valorSaca,
        comissaoPorSaca: data.comissaoPorSaca,
        comissaoTerceiro: data.comissaoTerceiro,
        comissaoPagaPor: data.comissaoPagaPor,
        comissaoVendedor: data.comissaoVendedor,
        comissaoComprador: data.comissaoComprador,
        fretePorConta: data.fretePorConta ?? null,
        localRetirada: data.localRetirada ?? null,
        condicoesPagamento: data.condicoesPagamento ?? null,
        funrural: data.funrural,
        foro: data.foro ?? null,
        refPeso: data.refPeso,
        fechamentoOrigem: data.fechamentoOrigem ?? null,
        fechamentoDestino: data.fechamentoDestino ?? null,
        observacoes: data.observacoes ?? null,
        padraoQualidade: data.padraoQualidade ?? null,
        dataFechamento: data.dataFechamento ? new Date(data.dataFechamento) : null,
        inicio: data.inicio ? new Date(data.inicio) : null,
        termino: data.termino ? new Date(data.termino) : null,
      },
      include: { comprador: true, produtor: true, carregamentos: true, transacoes: true },
    });

    res.status(201).json(contrato);
  } catch (err) {
    next(err);
  }
});

// PUT /api/contratos/:id — admin only
router.put("/:id", authMiddleware, adminOnly, validate(contratoUpdateSchema), async (req, res, next) => {
  try {
    const data = req.body;

    // ── Guardrail: status hierarchy ────────────────────────────────────────
    if (data.status === "concluido") {
      const full = await prisma.contrato.findUnique({
        where: { id: String(req.params.id) },
        include: { carregamentos: true, transacoes: true },
      });
      if (!full) throw new AppError(404, "Contrato não encontrado.", "NOT_FOUND");

      const calc = calcContrato(full);
      if (calc.sacasARetirar > 0) {
        throw new AppError(
          422,
          `Não é possível concluir: ainda há ${calc.sacasARetirar.toLocaleString("pt-BR")} sacas a retirar.`,
          "SALDO_PENDENTE"
        );
      }
      const transacoesPendentes = full.transacoes.filter((t) => t.status !== "pago" && t.status !== "cancelado");
      if (transacoesPendentes.length > 0) {
        throw new AppError(
          422,
          `Não é possível concluir: ${transacoesPendentes.length} transação(ões) ainda pendente(s).`,
          "PAGAMENTOS_PENDENTES"
        );
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    const updateData: any = { ...data };
    if (data.dataFechamento) updateData.dataFechamento = new Date(data.dataFechamento);
    if (data.inicio) updateData.inicio = new Date(data.inicio);
    if (data.termino) updateData.termino = new Date(data.termino);

    // Strip relations from body
    delete updateData.comprador;
    delete updateData.produtor;
    delete updateData.carregamentos;
    delete updateData.transacoes;
    delete updateData.id;

    const contrato = await prisma.contrato.update({
      where: { id: String(req.params.id) },
      data: updateData,
      include: { comprador: true, produtor: true },
    });
    res.json(contrato);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/contratos/:id — admin only
router.delete("/:id", authMiddleware, adminOnly, async (req, res, next) => {
  try {
    await prisma.contrato.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── PDF ───────────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtN = (n: number, d = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtD = (d: any) => d ? new Date(d).toLocaleDateString("pt-BR") : "-";

function loadLogo(): string {
  const candidates = [
    path.join(process.cwd(), "assets", "logo-jp-agro.png"),
    path.join(process.cwd(), "backend", "assets", "logo-jp-agro.png"),
    path.join(__dirname, "..", "..", "assets", "logo-jp-agro.png"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
      }
    } catch {}
  }
  return "";
}

// GET /api/contratos/:id/pdf?view=vendedor|comprador|unificado
router.get("/:id/pdf", authMiddleware, async (req, res, next) => {
  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id: String(req.params.id) },
      include: {
        produtor: true,
        comprador: true,
        carregamentos: { orderBy: { dataEnvio: "desc" } },
        transacoes: { orderBy: { dataTransacao: "desc" } },
      },
    });

    if (!contrato) throw new AppError(404, "Contrato não encontrado.", "NOT_FOUND");

    const view = String(req.query.view || "");
    const logoDataUri = loadLogo();
    const calc = calcContrato(contrato);

    let comissaoTexto = "";
    const vVend = contrato.comissaoVendedor || 0;
    const vComp = contrato.comissaoComprador || 0;

    if (view === "unificado") {
      const totalPerSaca = vVend + vComp;
      if (totalPerSaca > 0) comissaoTexto = `COMISSÃO: ${fmt(totalPerSaca)} / SC`;
    } else if (view === "vendedor") {
      if (vVend > 0) comissaoTexto = `COMISSÃO: ${fmt(vVend)} / SC — POR CONTA DO VENDEDOR`;
    } else if (view === "comprador") {
      if (vComp > 0) comissaoTexto = `COMISSÃO: ${fmt(vComp)} / SC — POR CONTA DO COMPRADOR`;
    } else if (contrato.comissaoPorSaca > 0) {
      comissaoTexto = `COMISSÃO: ${fmt(contrato.comissaoPorSaca)} / SC — POR CONTA DO ${(contrato.comissaoPagaPor || "COMPRADOR").toUpperCase()}`;
    }

    // Build carregamentos rows for page 2
    const carRows = contrato.carregamentos
      .map(
        (c) =>
          `<tr>
            <td>${c.numeroId}</td>
            <td>${fmtD(c.dataEnvio)}</td>
            <td>${c.motorista || "-"}</td>
            <td>${fmtN(c.qntSacas, 3)}</td>
            <td>${fmtN(c.pesoKg, 0)} kg</td>
            <td>${fmt(c.valorCarga)}</td>
          </tr>`
      )
      .join("");

    const trxRows = contrato.transacoes
      .map(
        (t) =>
          `<tr>
            <td>${t.numeroId}</td>
            <td>${fmtD(t.dataTransacao)}</td>
            <td>${t.categoria || "-"}</td>
            <td>${t.metodoPagamento || "-"}</td>
            <td class="status-${t.status}">${t.status.toUpperCase()}</td>
            <td>${fmt(t.valorDebitado)}</td>
          </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Contrato ${contrato.numeroId}</title>
  <style>
    /* ── Page setup ──────────────────────────────────────────────────── */
    @page {
      size: A4 portrait;
      margin: 30mm 20mm 20mm 30mm;
    }
    @page :first { margin-top: 30mm; }

    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #111;
      background: #fff;
    }

    /* ── Header ──────────────────────────────────────────────────────── */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8pt;
      border-bottom: 2pt solid #2d5a27;
      margin-bottom: 12pt;
    }
    .brand { display: flex; align-items: center; gap: 10pt; }
    .brand img { height: 40pt; width: auto; }
    .brand-text h1 { margin: 0; font-size: 14pt; color: #2d5a27; text-transform: uppercase; letter-spacing: 0.5pt; }
    .brand-text p  { margin: 2pt 0 0; font-size: 8pt; color: #555; }
    .header-meta { text-align: right; font-size: 8pt; color: #444; line-height: 1.5; }

    /* ── Title band ──────────────────────────────────────────────────── */
    .doc-title {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      color: #2d5a27;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      background: #f0f5f0;
      border: 1pt solid #2d5a27;
      padding: 5pt 8pt;
      margin-top: 10pt;
      margin-bottom: 25pt;
    }

    /* ── Section header ──────────────────────────────────────────────── */
    .sec-head {
      font-size: 8.5pt;
      font-weight: bold;
      text-transform: uppercase;
      background: #2d5a27;
      color: #fff;
      padding: 3pt 6pt;
      margin-bottom: 6pt;
      letter-spacing: 0.3pt;
    }

    /* ── Two-column grid ─────────────────────────────────────────────── */
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; margin-bottom: 10pt; }

    /* ── Data rows ───────────────────────────────────────────────────── */
    .drow { display: flex; border-bottom: 0.5pt solid #ddd; padding: 2pt 0; font-size: 9pt; }
    .dlabel { width: 80pt; font-weight: bold; color: #555; flex-shrink: 0; }
    .dval { font-weight: bold; color: #111; }

    /* ── Quality table ───────────────────────────────────────────────── */
    table.quality {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10pt;
      font-size: 8.5pt;
    }
    table.quality th {
      background: #f2f2f2;
      border: 0.5pt solid #999;
      padding: 3pt 5pt;
      text-align: left;
      font-weight: bold;
    }
    table.quality td {
      border: 0.5pt solid #bbb;
      padding: 3pt 5pt;
    }

    /* ── Resumo box ──────────────────────────────────────────────────── */
    .box-resumo {
      border: 1.5pt solid #2d5a27;
      padding: 8pt 10pt;
      margin-bottom: 10pt;
      background: #fff;
    }
    .total-line {
      font-size: 11pt;
      font-weight: bold;
      color: #2d5a27;
      border-top: 1pt dashed #2d5a27;
      margin-top: 6pt;
      padding-top: 5pt;
    }
    .comissao-line {
      font-size: 9pt;
      font-weight: bold;
      color: #1a3e18;
      margin-top: 4pt;
    }

    /* ── Clauses ─────────────────────────────────────────────────────── */
    .clauses {
      font-size: 8pt;
      text-align: justify;
      line-height: 1.45;
      color: #333;
      margin-bottom: 14pt;
    }
    .clauses b { color: #000; }

    /* ── Signatures ──────────────────────────────────────────────────── */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10pt 30pt;
      margin-top: 16pt;
    }
    .sig-block { text-align: center; }
    .sig-line { border-top: 0.75pt solid #222; margin-top: 32pt; padding-top: 3pt; font-size: 8.5pt; font-weight: bold; }
    .sig-sub { font-size: 7.5pt; color: #555; margin-top: 1pt; }

    /* ── Footer ──────────────────────────────────────────────────────── */
    .doc-footer {
      font-size: 7.5pt;
      color: #888;
      text-align: center;
      border-top: 0.5pt solid #ddd;
      padding-top: 5pt;
      margin-top: 10pt;
    }

    /* ── Page break ──────────────────────────────────────────────────── */
    .page-break { page-break-before: always; padding-top: 0; }

    /* ── Tables page 2 ───────────────────────────────────────────────── */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-bottom: 10pt;
    }
    table.data-table th {
      background: #2d5a27;
      color: #fff;
      border: 0.5pt solid #1a3e18;
      padding: 3pt 5pt;
      text-align: left;
    }
    table.data-table td {
      border: 0.5pt solid #ccc;
      padding: 3pt 5pt;
    }
    table.data-table tr:nth-child(even) td { background: #f8faf8; }

    .status-pago { color: #1a7a1a; font-weight: bold; }
    .status-pendente { color: #b85c00; font-weight: bold; }
    .status-cancelado { color: #c00; font-weight: bold; }

    /* ── Summary totals ──────────────────────────────────────────────── */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8pt;
      margin-bottom: 12pt;
    }
    .summary-card {
      border: 0.5pt solid #ccc;
      border-radius: 3pt;
      padding: 6pt 8pt;
      text-align: center;
    }
    .summary-card .s-label { font-size: 7.5pt; color: #666; text-transform: uppercase; }
    .summary-card .s-val { font-size: 10pt; font-weight: bold; color: #2d5a27; margin-top: 2pt; }
  </style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════════════ PAGE 1 -->
<div>

  <!-- Header -->
  <div class="doc-header">
    <div class="brand">
      ${logoDataUri
        ? `<img src="${logoDataUri}" alt="Logo JP Agro" />`
        : `<div style="width:40pt;height:40pt;border:1pt dashed #ccc;"></div>`}
      <div class="brand-text">
        <h1>JP Agro</h1>
        <p>GRÃOS E TRANSPORTE</p>
      </div>
    </div>
    <div class="header-meta">
      JP Agro — Grãos e Transporte<br/>
      Intermediação e Transporte de Grãos<br/>
      Emitido em: ${new Date().toLocaleDateString("pt-BR")}
    </div>
  </div>

  <!-- Title -->
  <div class="doc-title">Contrato de Compra e Venda de Grãos · Nº ${contrato.numeroId}</div>

  <!-- Parties -->
  <div class="grid2">
    <div>
      <div class="sec-head">Vendedor (Produtor)</div>
      <div class="drow"><span class="dlabel">Nome:</span><span class="dval">${contrato.produtor.nome}</span></div>
      <div class="drow"><span class="dlabel">CPF/CNPJ:</span><span class="dval">${contrato.produtor.cpfCnpj}</span></div>
      <div class="drow"><span class="dlabel">Insc. Est.:</span><span class="dval">${contrato.produtor.inscricaoEstadual || "-"}</span></div>
      <div class="drow"><span class="dlabel">Fazenda:</span><span class="dval">${contrato.produtor.fazenda || "-"}</span></div>
      <div class="drow"><span class="dlabel">Endereço:</span><span class="dval">${contrato.produtor.endereco || "-"}</span></div>
      <div class="drow"><span class="dlabel">Cidade/UF:</span><span class="dval">${contrato.produtor.cidade || "-"} / ${contrato.produtor.estado || "-"}</span></div>
      <div class="drow"><span class="dlabel">Telefone:</span><span class="dval">${contrato.produtor.telefone || "-"}</span></div>
    </div>
    <div>
      <div class="sec-head">Comprador</div>
      <div class="drow"><span class="dlabel">Nome:</span><span class="dval">${contrato.comprador.nome}</span></div>
      <div class="drow"><span class="dlabel">CNPJ:</span><span class="dval">${contrato.comprador.cpfCnpj}</span></div>
      <div class="drow"><span class="dlabel">Endereço:</span><span class="dval">${contrato.comprador.endereco || "-"}</span></div>
      <div class="drow"><span class="dlabel">Cidade/UF:</span><span class="dval">${contrato.comprador.cidade || "-"} / ${contrato.comprador.estado || "-"}</span></div>
      <div class="drow"><span class="dlabel">Telefone:</span><span class="dval">${contrato.comprador.telefone || "-"}</span></div>
      <div class="drow"><span class="dlabel">Data Contrato:</span><span class="dval">${fmtD(contrato.dataFechamento)}</span></div>
      <div class="drow"><span class="dlabel">Vigência:</span><span class="dval">${fmtD(contrato.inicio)} a ${fmtD(contrato.termino)}</span></div>
    </div>
  </div>

  <!-- Quality standards -->
  <div class="sec-head">Padrão de Qualidade</div>
  <table class="quality">
    <thead>
      <tr><th>Item</th><th>Padrão</th><th>Desconto fora do padrão</th></tr>
    </thead>
    <tbody>
      ${(() => {
        const defaultRows = [
          { item: "Umidade", padrao: "Até 14,00 %", desconto: "Isento até o padrão" },
          { item: "Impurezas", padrao: "1,0 % (peneira 3 mm)", desconto: "Até o limite de 1 %" },
          { item: "Avariados", padrao: "5 %", desconto: "1×1 conforme limites de tolerância" },
          { item: "Carunchado", padrao: "Até 1 %", desconto: "1×1 até limite de 2 %" },
          { item: "Insetos / Odor", padrao: "Isento", desconto: "Produto recusado" },
          { item: "Quebrado", padrao: "Até 8 %", desconto: "1×1 conforme limite de cada peneira" },
        ];
        const rows = (Array.isArray((contrato as any).padraoQualidade) && (contrato as any).padraoQualidade.length > 0)
          ? (contrato as any).padraoQualidade
          : defaultRows;
        return rows.map((r: any) => `<tr><td>${r.item}</td><td>${r.padrao}</td><td>${r.desconto}</td></tr>`).join("");
      })()}
    </tbody>
  </table>

  <!-- Resumo do negócio -->
  <div class="box-resumo">
    <div class="grid2">
      <div>
        <div class="drow"><span class="dlabel">Produto:</span><span class="dval">${contrato.produto.toUpperCase()}</span></div>
        <div class="drow"><span class="dlabel">Quantidade:</span><span class="dval">${fmtN(contrato.numSacas, 0)} sacas</span></div>
        <div class="drow"><span class="dlabel">Preço/Saca:</span><span class="dval">${fmt(contrato.valorSaca)}</span></div>
        <div class="drow"><span class="dlabel">Ref. Peso:</span><span class="dval">${fmtN(contrato.refPeso, 0)} kg/saca</span></div>
      </div>
      <div>
        <div class="drow"><span class="dlabel">Pagamento:</span><span class="dval">${contrato.condicoesPagamento || "SOBRE RODAS"}</span></div>
        <div class="drow"><span class="dlabel">Retirada:</span><span class="dval">${contrato.localRetirada || "-"}</span></div>
        <div class="drow"><span class="dlabel">Frete:</span><span class="dval">${contrato.fretePorConta?.toUpperCase() || "-"}</span></div>
        <div class="drow"><span class="dlabel">Fechamento:</span><span class="dval">${contrato.fechamentoOrigem || "-"} → ${contrato.fechamentoDestino || "-"}</span></div>
      </div>
    </div>
    <div class="total-line">VALOR TOTAL DO CONTRATO: ${fmt(contrato.numSacas * contrato.valorSaca)}</div>
    ${comissaoTexto ? `<div class="comissao-line">${comissaoTexto}</div>` : ""}
    ${contrato.funrural ? `<div style="font-size:8.5pt;color:#555;margin-top:3pt;">FUNRURAL: ${fmtN(contrato.funrural, 2)}%</div>` : ""}
  </div>

  <!-- Clauses & Signatures moved to Page 2 -->

  <!-- Footer -->
  <div class="doc-footer" style="margin-top: 40pt;">
    Documento gerado em ${new Date().toLocaleString("pt-BR")} · Intermediado por JP Agro — Grãos e Transporte · Página 1 de 2
  </div>

</div>

<!-- ═══════════════════════════════════════════════════════════════════ PAGE 2 -->
<div class="page-break">

  <!-- Header (repeated) -->
  <div class="doc-header">
    <div class="brand">
      ${logoDataUri
        ? `<img src="${logoDataUri}" alt="Logo JP Agro" />`
        : `<div style="width:40pt;height:40pt;border:1pt dashed #ccc;"></div>`}
      <div class="brand-text">
        <h1>JP Agro</h1>
        <p>GRÃOS E TRANSPORTE</p>
      </div>
    </div>
    <div class="header-meta">
      Contrato Nº ${contrato.numeroId}<br/>
      Anexo e Assinaturas<br/>
      Página 2 de 2
    </div>
  </div>

  <!-- Clauses -->
  <div class="clauses" style="margin-top: 15pt;">
    <b>CLÁUSULAS:</b><br/>
    <div style="white-space: pre-wrap; font-size: 9pt;">1. As partes declaram plena ciência e aceitação das condições estipuladas neste instrumento particular de compra e venda.<br/>
2. O produto objeto deste contrato está livre de quaisquer ônus, penhoras ou gravames (Lei 13.606/2018).<br/>
3. A JP Agro — Grãos e Transporte atua exclusivamente como intermediária, sem responsabilidade solidária pelas obrigações das partes.<br/>
4. O descumprimento de qualquer cláusula implicará multa de 10% sobre o valor total do contrato, além de perdas e danos.<br/>
5. Este contrato entra em vigor na data de sua assinatura, sendo irretratável e irrevogável.<br/>
6. Fica eleito o foro da Comarca de ${(contrato.foro || "Uberlândia - MG").toUpperCase()} para dirimir quaisquer litígios.</div>
    ${contrato.observacoes ? `<br/><b>Observações Adicionais:</b> ${contrato.observacoes}` : ""}
  </div>

  <!-- Signatures -->
  <div class="signatures" style="margin-bottom: 30pt;">
    <div class="sig-block">
      <div class="sig-line">COMPRADOR</div>
      <div class="sig-sub">${contrato.comprador.nome}</div>
      <div class="sig-sub">${contrato.comprador.cpfCnpj}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">VENDEDOR</div>
      <div class="sig-sub">${contrato.produtor.nome}</div>
      <div class="sig-sub">${contrato.produtor.cpfCnpj}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="doc-footer">
    Documento gerado em ${new Date().toLocaleString("pt-BR")} · Intermediado por JP Agro — Grãos e Transporte · Página 2 de 2
  </div>

</div>

<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    next(err);
  }
});

export default router;
