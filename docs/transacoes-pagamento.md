# Diagnóstico registrado antes da correção

Reprodução local em 11/09/2026: `transacaoUpdateSchema.parse({ status: "pago" })`
retorna `{ status: "pago", valorDebitado: 0, refProdutor: 0, refComissao: 0 }`.

O botão em `frontend/src/app/contratos/[id]/page.tsx` envia somente o status.
O schema em `backend/src/middleware/validate.ts` deriva a atualização usando
`.partial()` sobre campos com `.default(0)`. Na versão instalada do Zod (4),
esses defaults são aplicados mesmo em propriedades opcionais ausentes.
A rota PUT em `backend/src/routes/transacoes.ts` espalha o resultado validado
diretamente no update do Prisma, sobrescrevendo os valores persistidos.
Atualizar apenas metadados também pode zerar valores e voltar o status a pendente.

A criação da carga e da transação já ocorre numa transação de banco e atribui
`valorCarga` a `valorDebitado` e `refProdutor`. As consultas de contrato/histórico
incluem pagos; o botão não chama exclusão. O resumo financeiro geral já separa
pagos e pendentes, excluindo cancelados. O rodapé do contrato, porém, chama de
"Total" a soma somente dos pagos. Não existe dataPagamento no modelo; dataTransacao
é preenchida com a data de envio da carga e não deve ser reutilizada para pagamento.

## Dados históricos

Uma transação paga zerada com carregamento relacionado de valor positivo é
candidata à recuperação, mas a carga pode ter sido editada após o pagamento e a
transação pode ter tido ajustes manuais. O valor atual da carga não prova o valor
original. Referências/comissões e a data real do pagamento não podem ser inferidas
com segurança de updatedAt. Não fazer atualização em massa sem conferir os casos.

## Ambiente

Não há DATABASE_URL configurada nesta sessão e o serviço Docker não está ativo.
A validação em PostgreSQL e a contagem dos registros reais afetados dependem de
uma conexão disponível; testes com mocks não comprovam persistência em banco.

## Correção implementada

- `backend/src/middleware/validate.ts`: atualização sem defaults; não aceita mudar
  o vínculo com contrato/carga. A criação continua com seus defaults.
- `backend/src/routes/transacoes.ts`: confirmação preserva os três valores
  monetários inclusive em payload completo; registra o primeiro pagamento numa
  transação de banco, sem sobrescrever datas em repetições. Mantém DELETE separado.
- `backend/prisma/schema.prisma` e migration
  `20260911120000_preserve_payment_history`: dataPagamento opcional. Pagamentos
  históricos sem data comprovada ficam nulos; não se inventa uma data retroativa.
- `backend/src/routes/carregamentos.ts`: sincronização condicionada ao status
  pendente na própria escrita, protegendo pagamento concorrente com edição da carga.
- `frontend/src/app/contratos/[id]/page.tsx`: tratamento de erro ao pagar, releitura
  da API aguardada, datas visíveis e rodapé com total geral, pago e pendente.
- `frontend/src/app/transacoes/page.tsx`: datas de criação e pagamento no histórico.
  Instantes são exibidos no fuso do navegador; dataTransacao continua sendo data civil.
- `backend/scripts/audit-payment-values.ts` e `backend/package.json`: auditoria
  somente de leitura (`npm.cmd run audit:payments` com DATABASE_URL configurada).
- Testes: `backend/src/middleware/validate.test.ts`,
  `backend/src/routes/transacoes.test.ts`,
  `backend/src/routes/transacoes.integration.test.ts` e
  `frontend/src/app/contratos/[id]/page.test.tsx`.

Total geral considera pendentes + pagos, excluindo cancelados. No histórico geral,
os totalizadores respeitam os filtros ativos e todas as páginas. A consulta do
contrato continua retornando todas as transações, inclusive pagas.

## Validação e implantação

Executados: 16 testes do backend e 15 do frontend aprovados; compilação do backend
e checagem TypeScript do frontend aprovadas. O teste PostgreSQL foi ignorado por
ausência de TEST_DATABASE_URL. A remontagem da página foi validada com API simulada;
isso não substitui a confirmação no banco real.

Antes de executar a versão nova, aplicar a migration no banco existente
(`npm.cmd run db:migrate` no backend), gerar o cliente Prisma e compilar. Nenhuma
migration foi aplicada a um banco nesta sessão.

Para executar o teste de persistência, provisionar PostgreSQL descartável, configurar
DATABASE_URL para esse banco e criar o schema com `npm.cmd run db:push`. Configurar
TEST_DATABASE_URL para a mesma conexão e executar `npm.cmd test` no backend.
O teste cria seus próprios cliente, contrato, carga e transações, confirma pagamento,
reabre a conexão Prisma, consulta histórico e contrato por HTTP, verifica vínculos,
datas e totalizadores com paginação/cancelados, repete o pagamento com zeros no
payload, edita metadados/carga e verifica que o valor pago permanece. Ao final,
remove somente os registros criados pelo teste.

## Recuperação dos registros existentes

Executar a auditoria após disponibilizar uma conexão autorizada. Ela inclui zeros
em todos os status porque uma edição de metadados também podia aplicar o default
pendente. Ordens sem peso e transações manuais de valor zero podem ser legítimas.

Para cada candidato, conferir carga original, comprovantes e eventuais ajustes.
Se comprovada a equivalência com a carga, recuperar valorDebitado a partir de
valorCarga; recuperar refProdutor/refComissao somente quando sua composição original
for comprovada. Fazer a escrita em transação com condição sobre os valores/updatedAt
auditados para não sobrescrever alterações posteriores e guardar o antes/depois.
Não usar updatedAt como data de pagamento. Sem vínculo/valor confiável, consultar
backup ou documentação. Nenhum dado histórico foi alterado nesta sessão.
