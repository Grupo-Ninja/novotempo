import assert from "node:assert/strict";
import test from "node:test";
import router from "./contratos";
import { prisma } from "../lib/prisma";

const getHandler = (method: "get" | "post", path: string) =>
  (router as any).stack.find((layer: any) => layer.route?.path === path && layer.route.methods[method]).route.stack.at(-1).handle;

test("POST contrato gera displayNumber sequencial no backend", async () => {
  const originalTransaction = prisma.$transaction;
  try {
    let createArgs: any;
    (prisma as any).$transaction = async (fn: any) => fn({
      $queryRaw: async () => [{ nextval: 1n }],
      contrato: {
        create: async (args: any) => {
          createArgs = args;
          return { id: "contrato-1", ...args.data };
        },
      },
    });

    const body = {
      status: "nao_iniciado",
      produto: "Soja",
      compradorId: "comprador-1",
      produtorId: "produtor-1",
      numSacas: 100,
      valorSaca: 120,
      comissaoPorSaca: 0,
      comissaoTerceiro: 0,
      comissaoPagaPor: "comprador",
      comissaoVendedor: 0,
      comissaoComprador: 0,
      funrural: 0,
      refPeso: 60,
    };
    let result: any;
    await getHandler("post", "/")({ body }, { status: () => ({ json: (data: any) => { result = data; } }) }, (err: unknown) => { throw err; });

    assert.equal(createArgs.data.displayNumber, "CTR-000001");
    assert.match(createArgs.data.numeroId, /^CTR\d{8}$/);
    assert.equal(result.displayNumber, "CTR-000001");
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("GET contratos pesquisa pelo número comercial sem remover busca antiga", async () => {
  const originalFindMany = prisma.contrato.findMany;
  const originalCount = prisma.contrato.count;
  try {
    let where: any;
    (prisma.contrato as any).findMany = async (args: any) => { where = args.where; return []; };
    (prisma.contrato as any).count = async () => 0;
    let result: any;
    await getHandler("get", "/")({ query: { q: "CTR-000001" } }, { json: (data: any) => { result = data; } }, (err: unknown) => { throw err; });

    assert.ok(result.meta);
    assert.deepEqual(where.OR[0], { displayNumber: { contains: "CTR-000001", mode: "insensitive" } });
    assert.deepEqual(where.OR[1], { numeroId: { contains: "CTR-000001", mode: "insensitive" } });
  } finally {
    (prisma.contrato as any).findMany = originalFindMany;
    (prisma.contrato as any).count = originalCount;
  }
});
