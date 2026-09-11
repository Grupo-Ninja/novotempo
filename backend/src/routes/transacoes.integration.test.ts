import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { encode } from "next-auth/jwt";

// Explicit test database only; never fall back to production DATABASE_URL.
test("API persiste pagamento, histórico, vínculos e totais no PostgreSQL", {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.NEXTAUTH_SECRET = "payment-integration-test-only";
  const { prisma } = require("../lib/prisma") as typeof import("../lib/prisma");
  const carregamentos = require("./carregamentos").default;
  const transacoes = require("./transacoes").default;
  const contratos = require("./contratos").default;
  const app = express();
  app.use(express.json());
  app.use("/carregamentos", carregamentos);
  app.use("/transacoes", transacoes);
  app.use("/contratos", contratos);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET, token: { sub: "test", role: "admin" } });
  async function request(path: string, method = "GET", body?: unknown) {
    const res = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    assert.ok(res.ok, `${method} ${path}: ${res.status}`);
    return res.json();
  }
  const suffix = crypto.randomUUID();
  let clienteId: string | undefined;
  let contratoId: string | undefined;
  try {
    const cliente = await prisma.cliente.create({ data: { nome: "Teste pagamento", cpfCnpj: suffix, tipo: "ambos" } });
    clienteId = cliente.id;
    const contrato = await prisma.contrato.create({ data: {
      numeroId: suffix, produto: "Soja", compradorId: cliente.id, produtorId: cliente.id,
      numSacas: 1000, valorSaca: 100, refPeso: 60,
    } });
    contratoId = contrato.id;
    const carga = await request("/carregamentos", "POST", { contratoId, pesoKg: 600, dataEnvio: "2026-09-11" });
    const original = await prisma.transacao.findUniqueOrThrow({ where: { carregamentoId: carga.id } });
    assert.equal(original.valorDebitado, 1000);
    await request("/transacoes", "POST", { contratoId, valorDebitado: 200 });
    await request("/transacoes", "POST", { contratoId, valorDebitado: 999, status: "cancelado" });
    await request(`/transacoes/${original.id}`, "PUT", { status: "pago" });
    const saved = await prisma.transacao.findUniqueOrThrow({ where: { id: original.id } });
    assert.equal(saved.status, "pago");
    for (const field of ["valorDebitado", "refProdutor", "refComissao", "contratoId", "carregamentoId"] as const) {
      assert.equal(saved[field], original[field]);
    }
    assert.deepEqual(saved.createdAt, original.createdAt);
    assert.deepEqual(saved.dataTransacao, original.dataTransacao);
    assert.ok(saved.dataPagamento);
    // Fresh reads, including a new Prisma connection, prove this is not UI state.
    await prisma.$disconnect();
    const history = await request(`/transacoes?contratoId=${contratoId}&limit=1`);
    assert.equal(history.meta.total, 3);
    assert.deepEqual(history.summary, { valorTotal: 1200, valorPago: 1000, saldoPendente: 200 });
    const paid = await request(`/transacoes?contratoId=${contratoId}&status=pago`);
    assert.equal(paid.data[0].valorDebitado, 1000);
    assert.equal(paid.data[0].carregamento.id, carga.id);
    assert.equal(paid.data[0].contrato.comprador.id, cliente.id);
    const detail = await request(`/contratos/${contratoId}`);
    assert.equal(detail.transacoes.find((t: { id: string }) => t.id === original.id).valorDebitado, 1000);
    // Full-form retries, metadata updates and later loading edits cannot erase payment.
    await request(`/transacoes/${original.id}`, "PUT", { status: "pago", valorDebitado: 0, refProdutor: 0, refComissao: 0 });
    await request(`/transacoes/${original.id}`, "PUT", { nfs: "123" });
    await request(`/carregamentos/${carga.id}`, "PUT", { pesoKg: 1200 });
    const after = await prisma.transacao.findUniqueOrThrow({ where: { id: original.id } });
    assert.equal(after.status, "pago");
    assert.equal(after.valorDebitado, 1000);
    assert.equal(after.refProdutor, 1000);
    assert.deepEqual(after.dataPagamento, saved.dataPagamento);
    assert.equal(await prisma.transacao.count({ where: { contratoId } }), 3);
  } finally {
    if (contratoId) await prisma.contrato.delete({ where: { id: contratoId } });
    if (clienteId) await prisma.cliente.delete({ where: { id: clienteId } });
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});
