import assert from "node:assert/strict";
import test from "node:test";
import router from "./transacoes";
import { prisma } from "../lib/prisma";

// Exercise the real PUT handler and its validation. The database is mocked here;
// transacoes.integration.test.ts separately exercises PostgreSQL and HTTP/auth.
const handler = (router as any).stack.find((layer: any) => layer.route?.methods.put).route.stack.at(-1).handle;

test("PUT pagamento nunca envia valores ou vínculos ao update do banco", async () => {
  const originalTransaction = prisma.$transaction;
  try {
    for (const body of [
      { status: "pago" },
      { status: "pago", valorDebitado: 0, refProdutor: 0, refComissao: 0, contratoId: "outro", carregamentoId: "outro" },
    ]) {
      let update: any;
      let payment: any;
      (prisma as any).$transaction = async (fn: any) => fn({ transacao: {
        updateMany: async (args: any) => { payment = args; return { count: 1 }; },
        update: async (args: any) => { update = args; return { id: "trx", valorDebitado: 123.45, ...args.data }; },
      } });
      let result: any;
      await handler({ body, params: { id: "trx" } }, { json: (data: any) => { result = data; } }, (err: unknown) => { throw err; });
      assert.deepEqual(update, { where: { id: "trx" }, data: { status: "pago" } });
      assert.deepEqual(payment.where, { id: "trx", status: { not: "pago" }, dataPagamento: null });
      assert.ok(payment.data.dataPagamento instanceof Date);
      assert.equal(result.valorDebitado, 123.45);
      assert.equal(result.status, "pago");
    }
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("PUT metadados não altera status, valores ou data de pagamento", async () => {
  const originalTransaction = prisma.$transaction;
  try {
    let update: any;
    (prisma as any).$transaction = async (fn: any) => fn({ transacao: {
      updateMany: async () => assert.fail("não deve alterar pagamento"),
      update: async (args: any) => { update = args; return args.data; },
    } });
    await handler({ body: { nfs: "456" }, params: { id: "trx" } }, { json: () => {} }, (err: unknown) => { throw err; });
    assert.deepEqual(update.data, { nfs: "456" });
  } finally {
    prisma.$transaction = originalTransaction;
  }
});
