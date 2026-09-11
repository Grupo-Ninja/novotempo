export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  if (typeof date === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 1)}%`;
}

export function generateNumeroId(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}${year}${month}${random}`;
}

export function getContratoDisplayNumber(contrato: { displayNumber?: string | null; numeroId: string }): string {
  return contrato.displayNumber || contrato.numeroId;
}

export const DEFAULT_PESO_SACA_KG = 60;

export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
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
