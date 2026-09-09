import { describe, expect, it } from "vitest";
import { calcContrato, formatDate } from "./utils";

describe("formatDate", () => {
  it.each([
    ["2026-09-01", "01/09/2026"],
    ["2026-02-01", "01/02/2026"],
    ["2026-02-28", "28/02/2026"],
    ["2026-12-31", "31/12/2026"],
    ["2027-01-01", "01/01/2027"],
  ])("preserva a data civil %s", (input, expected) => {
    expect(formatDate(input)).toBe(expected);
  });
});

describe("calcContrato", () => {
  it("calcula total carregado, pago e saldo pendente usando transacoes pagas", () => {
    const calc = calcContrato({
      numSacas: 100,
      valorSaca: 100,
      comissaoPorSaca: 0,
      comissaoTerceiro: 0,
      carregamentos: [
        { qntSacas: 40, valorCarga: 4000, refPeso: 60 },
        { qntSacas: 20, valorCarga: 2000, refPeso: 60 },
      ],
      transacoes: [
        { status: "pago", valorDebitado: 2500, refComissao: 0, refProdutor: 0 },
        { status: "pendente", valorDebitado: 3500, refComissao: 0, refProdutor: 0 },
        { status: "cancelado", valorDebitado: 1000, refComissao: 0, refProdutor: 0 },
      ],
    });

    expect(calc.valorCarregado).toBe(6000);
    expect(calc.totalRecebidoCarga).toBe(2500);
    expect(calc.aReceberCarga).toBe(3500);
  });
});
