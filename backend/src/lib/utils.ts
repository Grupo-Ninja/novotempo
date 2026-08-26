export function generateNumeroId(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}${year}${month}${random}`;
}

export const DEFAULT_PESO_SACA_KG = 60;

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
    valorCarga: Math.round(quantidadeExata * valorPorSaca * 100) / 100,
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
  transacoes: { valorDebitado: number; refComissao: number; refProdutor: number }[];
}) {
  const valorContrato = contrato.numSacas * contrato.valorSaca;
  
  // Use dual commissions if present, otherwise fallback to comissaoPorSaca
  const comissaoTotalPorSaca = (contrato.comissaoVendedor || 0) + (contrato.comissaoComprador || 0) || contrato.comissaoPorSaca;
  const comissaoProjetada = contrato.numSacas * comissaoTotalPorSaca;

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
  const saldoCarregamento = valorContrato - valorCarregado;

  const totalRecebidoCarga = contrato.transacoes.reduce(
    (s, t) => s + t.valorDebitado,
    0
  );
  const comissaoRecebida = contrato.transacoes.reduce(
    (s, t) => s + t.refComissao,
    0
  );
  const refProdutor = contrato.transacoes.reduce(
    (s, t) => s + t.refProdutor,
    0
  );

  const percRecebida =
    valorContrato > 0 ? (totalRecebidoCarga / valorContrato) * 100 : 0;
  const aReceberCarga = valorContrato - totalRecebidoCarga;
  const percComissao =
    comissaoProjetada > 0 ? (comissaoRecebida / comissaoProjetada) * 100 : 0;
  const comissaoAReceber = comissaoProjetada - comissaoRecebida;

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
