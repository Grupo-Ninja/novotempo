import assert from "node:assert/strict";
import test from "node:test";
import router from "./transacoes";
import { prisma } from "../lib/prisma";

// Exercise the real PUT handler and its validation. The database is mocked here;
// transacoes.integration.test.ts separately exercises PostgreSQL and HTTP/auth.
const handler = (router as any).stack.find((layer: any) => layer.route?.methods.put).route.stack.at(-1).handle;
const getHandler = (router as any).stack.find((layer: any) => layer.route?.methods.get && layer.route?.path === "/").route.stack.at(-1).handle;

test("PUT pagamento nunca envia valores ou vÃ­nculos ao update do banco", async () => {
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

test("PUT metadados nÃ£o altera status, valores ou data de pagamento", async () => {
  const originalTransaction = prisma.$transaction;
  try {
    let update: any;
    (prisma as any).$transaction = async (fn: any) => fn({ transacao: {
      updateMany: async () => assert.fail("nÃ£o deve alterar pagamento"),
      update: async (args: any) => { update = args; return args.data; },
    } });
    await handler({ body: { nfs: "456" }, params: { id: "trx" } }, { json: () => {} }, (err: unknown) => { throw err; });
    assert.deepEqual(update.data, { nfs: "456" });
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("GET transacoes filtra por numero do carregamento ou motorista", async () => {
  const originalFindMany = prisma.transacao.findMany;
  const originalCount = prisma.transacao.count;
  try {
    let listWhere: any;
    let summaryWhere: any;
    let calls = 0;
    (prisma.transacao as any).findMany = async (args: any) => {
      calls += 1;
      if (calls === 1) listWhere = args.where;
      if (calls === 2) summaryWhere = args.where;
      return [];
    };
    (prisma.transacao as any).count = async () => 0;
    let result: any;
    await getHandler({ query: { carregamento: "Joao" } }, { json: (data: any) => { result = data; } }, (err: unknown) => { throw err; });

    const expected = [{
      OR: [
        { carregamento: { is: { numeroId: { contains: "Joao", mode: "insensitive" } } } },
        { carregamento: { is: { motorista: { contains: "Joao", mode: "insensitive" } } } },
      ],
    }];
    assert.deepEqual(listWhere.AND, expected);
    assert.deepEqual(summaryWhere.AND, expected);
    assert.deepEqual(result.summary, { valorTotal: 0, valorPago: 0, saldoPendente: 0 });
  } finally {
    (prisma.transacao as any).findMany = originalFindMany;
    (prisma.transacao as any).count = originalCount;
  }
});
