import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e: any) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res.status(422).json({ error: "Dados inválidos.", details: errors, code: "VALIDATION_ERROR" });
    }
    req.body = result.data;
    next();
  };
}

// ── Schemas ──────────────────────────────────────────────────────────────────

export const carregamentoSchema = z.object({
  contratoId:   z.string().min(1, "contratoId é obrigatório"),
  corretor:     z.string().optional().nullable(),
  motorista:    z.string().optional().nullable(),
  produto:      z.string().optional().nullable(),
  pesoKg:       z.coerce.number().min(0, "Peso nÃ£o pode ser negativo").default(0),
  qntSacas:     z.coerce.number().min(0, "Quantidade de sacas não pode ser negativa").default(0),
  valorCarga:   z.coerce.number().min(0, "Valor da carga não pode ser negativo").default(0),
  refPeso:      z.coerce.number().min(0, "Referência de peso não pode ser negativa").default(0),
  refValorSaca: z.coerce.number().min(0, "Referência do valor da saca não pode ser negativa").default(0),
  umidadeSorgo: z.coerce.number()
    .min(0, "Umidade não pode ser negativa")
    .max(100, "Umidade deve estar entre 0 e 100%")
    .optional()
    .nullable(),
  dataEnvio:    z.string().optional().nullable(),
  observacoes:  z.string().optional().nullable(),
});

export const carregamentoUpdateSchema = carregamentoSchema.omit({ contratoId: true }).partial();

const padraoQualidadeRowSchema = z.object({
  item:     z.string(),
  padrao:   z.string(),
  desconto: z.string(),
});

export const contratoSchema = z.object({
  produto:            z.string().min(1, "Produto é obrigatório"),
  compradorId:        z.string().min(1, "Comprador é obrigatório"),
  produtorId:         z.string().min(1, "Produtor é obrigatório"),
  status:             z.enum(["nao_iniciado", "em_andamento", "concluido"]).default("nao_iniciado"),
  cidade:             z.string().optional().nullable(),
  numSacas:           z.coerce.number().min(0).default(0),
  valorSaca:          z.coerce.number().min(0).default(0),
  comissaoPorSaca:    z.coerce.number().min(0).default(0),
  comissaoTerceiro:   z.coerce.number().min(0).default(0),
  comissaoPagaPor:    z.string().default("comprador"),
  comissaoVendedor:   z.coerce.number().min(0).default(0),
  comissaoComprador:  z.coerce.number().min(0).default(0),
  fretePorConta:      z.string().optional().nullable(),
  localRetirada:      z.string().optional().nullable(),
  condicoesPagamento: z.string().optional().nullable(),
  funrural:           z.coerce.number().min(0).default(0),
  foro:               z.string().optional().nullable(),
  refPeso:            z.coerce.number().min(0).default(0),
  fechamentoOrigem:   z.string().optional().nullable(),
  fechamentoDestino:  z.string().optional().nullable(),
  observacoes:        z.string().optional().nullable(),
  clausulas:          z.string().optional().nullable(),
  dataFechamento:     z.string().optional().nullable(),
  inicio:             z.string().optional().nullable(),
  termino:            z.string().optional().nullable(),
  padraoQualidade:    z.array(padraoQualidadeRowSchema).optional().nullable(),
});

export const motoristaSchema = z.object({
  nome:             z.string().min(1, "Nome é obrigatório"),
  cpfCnpj:          z.string().optional().nullable(),
  telefone:         z.string().optional().nullable(),
  placaCavalo:      z.string().optional().nullable(),
  placasAdicionais: z.array(z.string()).optional().default([]),
});

export const motoristaUpdateSchema = motoristaSchema.partial();

export const contratoUpdateSchema = contratoSchema.partial();

export const transacaoSchema = z.object({
  contratoId:      z.string().min(1, "contratoId é obrigatório"),
  categoria:       z.string().optional().nullable(),
  metodoPagamento: z.string().optional().nullable(),
  nfs:             z.string().optional().nullable(),
  nfAcesso:        z.string().optional().nullable(),
  status:          z.enum(["pendente", "pago", "cancelado"]).default("pendente"),
  tipoDaNota:      z.string().optional().nullable(),
  valorDebitado:   z.coerce.number().min(0, "Valor debitado não pode ser negativo").default(0),
  refProdutor:     z.coerce.number().min(0, "Referência do produtor não pode ser negativa").default(0),
  refComissao:     z.coerce.number().min(0, "Referência da comissão não pode ser negativa").default(0),
  observacoes:     z.string().optional().nullable(),
  dataTransacao:   z.string().optional().nullable(),
});

export const transacaoUpdateSchema = transacaoSchema.omit({ contratoId: true }).partial();

export const clienteSchema = z.object({
  nome:              z.string().min(1, "Nome é obrigatório"),
  cpfCnpj:           z.string().min(1, "CPF/CNPJ é obrigatório"),
  tipo:              z.enum(["produtor", "comprador", "ambos"]),
  telefone:          z.string().optional().nullable(),
  email:             z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
  cidade:            z.string().optional().nullable(),
  estado:            z.string().optional().nullable(),
  inscricaoEstadual: z.string().optional().nullable(),
  fazenda:           z.string().optional().nullable(),
  endereco:          z.string().optional().nullable(),
  banco:             z.string().optional().nullable(),
  agencia:           z.string().optional().nullable(),
  conta:             z.string().optional().nullable(),
  pix:               z.string().optional().nullable(),
});

export const clienteUpdateSchema = clienteSchema.partial();
