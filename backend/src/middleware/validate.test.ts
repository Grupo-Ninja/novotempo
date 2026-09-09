import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { carregamentoSchema, transacaoSchema } from "./validate";
import { calcCarregamento, calcFinancialSummary, parseCivilDate, parseCivilDateRange, shouldSyncAutoTransacao } from "../lib/utils";

const contratoId = "contrato-1";

test("calcula sacas pelo peso e o valor proporcional da carga", () => {
  assert.deepEqual(calcCarregamento(30_000, 60, 100), {
    refPeso: 60,
    refValorSaca: 100,
    qntSacas: 500,
    valorCarga: 50_000,
  });

  assert.deepEqual(calcCarregamento(1_000, 60, 100), {
    refPeso: 60,
    refValorSaca: 100,
    qntSacas: 16.667,
    valorCarga: 1_666.67,
  });
});

test("preserva data civil em dias sensiveis de calendario", () => {
  for (const value of ["2026-09-01", "2026-02-01", "2026-02-28", "2026-12-31", "2027-01-01"]) {
    const parsed = parseCivilDate(value);
    assert.ok(parsed);
    assert.equal(parsed.toISOString().slice(0, 10), value);
  }
});

test("monta range de filtro para data civil sem deslocamento", () => {
  assert.equal(parseCivilDateRange("2026-09-01")?.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(parseCivilDateRange("2026-09-01", true)?.toISOString(), "2026-09-01T23:59:59.999Z");
  assert.equal(parseCivilDateRange("2026-12-31", true)?.toISOString(), "2026-12-31T23:59:59.999Z");
});

test("carregamento rejeita umidade negativa e acima de 100", () => {
  assert.equal(carregamentoSchema.safeParse({ contratoId, umidadeSorgo: -0.03 }).success, false);
  assert.equal(carregamentoSchema.safeParse({ contratoId, umidadeSorgo: 100.01 }).success, false);
  assert.equal(carregamentoSchema.safeParse({ contratoId, pesoKg: 60, umidadeSorgo: 14 }).success, true);
});

test("carregamento rejeita valores quantitativos e monetários negativos", () => {
  for (const field of ["qntSacas", "pesoKg", "valorCarga", "refPeso", "refValorSaca"] as const) {
    const result = carregamentoSchema.safeParse({ contratoId, [field]: -0.01 });
    assert.equal(result.success, false, `${field} deveria ser rejeitado`);
  }
});

test("transação rejeita valores monetários negativos", () => {
  for (const field of ["valorDebitado", "refComissao", "refProdutor"] as const) {
    const result = transacaoSchema.safeParse({ contratoId, [field]: -0.01 });
    assert.equal(result.success, false, `${field} deveria ser rejeitado`);
  }
});

test("transação preserva status e método de pagamento aceitos", () => {
  for (const status of ["pendente", "pago", "cancelado"] as const) {
    for (const metodoPagamento of ["PIX", "TED", "Boleto", "Cheque", "Dinheiro", "Outro"]) {
      const result = transacaoSchema.safeParse({ contratoId, status, metodoPagamento });
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, status);
        assert.equal(result.data.metodoPagamento, metodoPagamento);
      }
    }
  }
});

test("transação continua aceitando campos opcionais vazios com valores padrão", () => {
  const result = transacaoSchema.safeParse({ contratoId });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.status, "pendente");
    assert.equal(result.data.valorDebitado, 0);
    assert.equal(result.data.refComissao, 0);
    assert.equal(result.data.refProdutor, 0);
  }
});

test("carregamento permite criar ordem sem peso informado", () => {
  const result = carregamentoSchema.safeParse({ contratoId, motorista: "Joao Silva" });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.pesoKg, 0);
    assert.equal(result.data.qntSacas, 0);
    assert.equal(result.data.valorCarga, 0);
  }
});

test("calcula resumo financeiro por status de transacao", () => {
  assert.deepEqual(calcFinancialSummary([
    { status: "pendente", valorDebitado: 1000 },
    { status: "pago", valorDebitado: 600 },
    { status: "cancelado", valorDebitado: 400 },
  ]), {
    valorTotal: 1600,
    valorPago: 600,
    saldoPendente: 1000,
  });
});

test("sincroniza somente transacao automatica pendente", () => {
  assert.equal(shouldSyncAutoTransacao(undefined), true);
  assert.equal(shouldSyncAutoTransacao("pendente"), true);
  assert.equal(shouldSyncAutoTransacao("pago"), false);
  assert.equal(shouldSyncAutoTransacao("cancelado"), false);
});

test("template do PDF mantem dados bancarios apenas do vendedor e uma quebra de pagina", () => {
  const source = fs.readFileSync("src/routes/contratos.ts", "utf8");
  assert.match(source, /Dados Bancarios do Vendedor/);
  assert.doesNotMatch(source, /Dados Bancarios do Comprador/);
  assert.equal((source.match(/<div class="page-break">/g) || []).length, 1);
});
