import assert from "node:assert/strict";
import test from "node:test";
import { carregamentoSchema, transacaoSchema } from "./validate";
import { calcCarregamento } from "../lib/utils";

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
