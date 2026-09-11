export function generateNumeroId(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}${year}${month}${random}`;
}

export function formatContractDisplayNumber(sequence: number | bigint): string {
  return `CTR-${String(sequence).padStart(6, "0")}`;
}

export function getContratoDisplayNumber(contrato: { displayNumber?: string | null; numeroId: string }): string {
  return contrato.displayNumber || contrato.numeroId;
}

export const DEFAULT_PESO_SACA_KG = 60;

export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function parseCivilDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return new Date(value);
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0));
}

export function parseCivilDateRange(value: string | null | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return new Date(value);
  const [, year, month, day] = match;
  return new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  ));
}

export function calcCarregamento(
  pesoKg: number,
  refPeso: number,
  refValorSaca: number,
) {
  const pesoPorSaca = refPeso > 0 ? refPeso : DEFAULT_PESO_SACA_KG;
  const valorPorSaca = refValorSaca > 0 ? refValorSaca : 0;
  const quantidadeExata = pesoKg > 0 ? pesoKg / pesoPorSaca : 0;

  return {
    refPeso: pesoPorSaca,
    refValorSaca: valorPorSaca,
    qntSacas: Math.round(quantidadeExata * 1000) / 1000,
    valorCarga: roundMoney(quantidadeExata * valorPorSaca),
  };
}

export function calcContrato(contrato: {
  numSacas: number;
  valorSaca: number;
  comissaoPorSaca: number;
  comissaoVendedor?: number;
  comissaoComprador?: number;
  comissaoTerceiro: number;
  carregamentos: { qntSacas: number; valorCarga: number; refPeso: number }[];
  transacoes: { valorDebitado: number; refComissao: number; refProdutor: number; status?: string }[];
}) {
  const valorContrato = roundMoney(contrato.numSacas * contrato.valorSaca);
  
  // Use dual commissions if present, otherwise fallback to comissaoPorSaca
  const comissaoTotalPorSaca = (contrato.comissaoVendedor || 0) + (contrato.comissaoComprador || 0) || contrato.comissaoPorSaca;
  const comissaoProjetada = roundMoney(contrato.numSacas * comissaoTotalPorSaca);

  const sacasRetiradas = contrato.carregamentos.reduce(
    (s, c) => s + c.qntSacas,
    0
  );
  const sacasARetirar = contrato.numSacas - sacasRetiradas;
  const valorCarregado = contrato.carregamentos.reduce(
    (s, c) => s + c.valorCarga,
    0
  );
  const refPesoCarregamento = contrato.carregamentos.reduce(
    (s, c) => s + c.refPeso,
    0
  );
  const saldoCarregamento = roundMoney(valorContrato - valorCarregado);

  const transacoesPagas = contrato.transacoes.filter((t) => t.status === "pago");
  const totalRecebidoCarga = transacoesPagas.reduce(
    (s, t) => s + t.valorDebitado,
    0
  );
  const comissaoRecebida = transacoesPagas.reduce(
    (s, t) => s + t.refComissao,
    0
  );
  const refProdutor = contrato.transacoes.reduce(
    (s, t) => s + t.refProdutor,
    0
  );

  const percRecebida =
    valorContrato > 0 ? (totalRecebidoCarga / valorContrato) * 100 : 0;
  const aReceberCarga = roundMoney(valorCarregado - totalRecebidoCarga);
  const percComissao =
    comissaoProjetada > 0 ? (comissaoRecebida / comissaoProjetada) * 100 : 0;
  const comissaoAReceber = roundMoney(comissaoProjetada - comissaoRecebida);

  return {
    valorContrato,
    comissaoProjetada,
    sacasRetiradas,
    sacasARetirar,
    valorCarregado,
    refPesoCarregamento,
    saldoCarregamento,
    totalRecebidoCarga,
    comissaoRecebida,
    refProdutor,
    percRecebida,
    aReceberCarga,
    percComissao,
    comissaoAReceber,
  };
}

export function calcFinancialSummary(transacoes: { status: string; valorDebitado: number }[]) {
  const valorTotal = roundMoney(
    transacoes
      .filter((t) => t.status !== "cancelado")
      .reduce((s, t) => s + t.valorDebitado, 0)
  );
  const valorPago = roundMoney(
    transacoes
      .filter((t) => t.status === "pago")
      .reduce((s, t) => s + t.valorDebitado, 0)
  );
  return {
    valorTotal,
    valorPago,
    saldoPendente: roundMoney(valorTotal - valorPago),
  };
}

export function shouldSyncAutoTransacao(status?: string | null): boolean {
  return !status || status === "pendente";
}
