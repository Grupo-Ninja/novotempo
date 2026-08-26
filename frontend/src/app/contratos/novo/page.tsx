"use client";
import DashboardLayout from "../../dashboard-layout";
import PageHeader from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { MoneyInput } from "@/components/InputMask";

interface Cliente { id: string; nome: string; cpfCnpj: string; tipo: string; }

interface QualidadeRow { item: string; padrao: string; desconto: string; }

const PRODUTOS = ["Soja", "Milho", "Sorgo", "Trigo", "Feijão", "Algodão", "Café", "Outro"];

const DEFAULT_QUALIDADE: QualidadeRow[] = [
  { item: "Umidade",       padrao: "Até 14,00 %",          desconto: "Isento até o padrão" },
  { item: "Impurezas",     padrao: "1,0 % (peneira 3 mm)",  desconto: "Até o limite de 1 %" },
  { item: "Avariados",     padrao: "5 %",                   desconto: "1×1 conforme limites de tolerância" },
  { item: "Carunchado",    padrao: "Até 1 %",               desconto: "1×1 até limite de 2 %" },
  { item: "Insetos / Odor",padrao: "Isento",                desconto: "Produto recusado" },
  { item: "Quebrado",      padrao: "Até 8 %",               desconto: "1×1 conforme limite de cada peneira" },
];

function ToggleButtons({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-brand-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function NovoContratoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [qualidade, setQualidade] = useState<QualidadeRow[]>(DEFAULT_QUALIDADE.map((r) => ({ ...r })));
  const [form, setForm] = useState({
    status: "nao_iniciado",
    produto: "",
    compradorId: "",
    produtorId: "",
    cidade: "",
    numSacas: "",
    valorSaca: "",
    comissaoPorSaca: "",
    comissaoTerceiro: "",
    dataFechamento: "",
    inicio: "",
    termino: "",
    fechamentoOrigem: "",
    fechamentoDestino: "",
    refPeso: "60",
    comissaoPagaPor: "comprador",
    comissaoVendedor: "",
    comissaoComprador: "",
    fretePorConta: "CIF POR CONTA DO VENDEDOR",
    localRetirada: "",
    condicoesPagamento: "SOBRE RODAS",
    funrural: "0",
    foro: "UBERLÂNDIA-MG",
    observacoes: "",
  });

  useEffect(() => {
    apiFetch("/clientes").then((r) => r.json()).then((d) => setClientes(Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : [])));
  }, []);

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function setQRow(idx: number, field: keyof QualidadeRow, val: string) {
    setQualidade((rows) => rows.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  }

  const produtores = clientes.filter((c) => c.tipo === "produtor" || c.tipo === "ambos");
  const compradores = clientes.filter((c) => c.tipo === "comprador" || c.tipo === "ambos");

  const numSacas = Number(form.numSacas) || 0;
  const valorSaca = Number(form.valorSaca) || 0;
  const valorContrato = numSacas * valorSaca;
  const comissaoComp = numSacas * (Number(form.comissaoComprador) || 0);
  const comissaoVend = numSacas * (Number(form.comissaoVendedor) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, padraoQualidade: qualidade }),
      });
      const d = await res.json();
      if (res.ok) {
        router.push(`/contratos/${d.id}`);
      } else {
        setError(d.error || "Erro ao salvar contrato");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Novo Contrato" backHref="/contratos" />
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Dados principais */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Dados do Contrato</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Produto *</label>
                  <select className="input" required value={form.produto} onChange={(e) => set("produto", e.target.value)}>
                    <option value="">Selecione...</option>
                    {PRODUTOS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
                    <option value="nao_iniciado">Não Iniciado</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
                <div>
                  <label className="label">Comprador *</label>
                  <select className="input" required value={form.compradorId} onChange={(e) => set("compradorId", e.target.value)}>
                    <option value="">Selecione...</option>
                    {compradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Produtor *</label>
                  <select className="input" required value={form.produtorId} onChange={(e) => set("produtorId", e.target.value)}>
                    <option value="">Selecione...</option>
                    {produtores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Cidade</label>
                  <input className="input" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
                </div>
                <div>
                  <label className="label">Fechamento Origem</label>
                  <input className="input" value={form.fechamentoOrigem} onChange={(e) => set("fechamentoOrigem", e.target.value)} />
                </div>
                <div>
                  <label className="label">Fechamento Destino</label>
                  <input className="input" value={form.fechamentoDestino} onChange={(e) => set("fechamentoDestino", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Quantidades e Valores</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nº de Sacas *</label>
                  <MoneyInput className="input" required value={form.numSacas} onChange={(v) => set("numSacas", v)} />
                </div>
                <div>
                  <label className="label">Valor por Saca (R$) *</label>
                  <MoneyInput className="input" required value={form.valorSaca} onChange={(v) => set("valorSaca", v)} />
                </div>
                <div>
                  <label className="label">Ref. Peso (kg/saca)</label>
                  <input className="input" type="number" step="0.001" value={form.refPeso} onChange={(e) => set("refPeso", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Comissão do Negócio</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <label className="label mb-2">Quem paga a comissão?</label>
                  <ToggleButtons
                    value={form.comissaoPagaPor}
                    onChange={(v) => set("comissaoPagaPor", v)}
                    options={[
                      { value: "comprador", label: "Somente Comprador" },
                      { value: "vendedor", label: "Somente Vendedor" },
                      { value: "ambos", label: "Ambos" },
                    ]}
                  />
                </div>
                {(form.comissaoPagaPor === "comprador" || form.comissaoPagaPor === "ambos") && (
                  <div>
                    <label className="label text-blue-700">Comissão Comprador (R$/SC)</label>
                    <MoneyInput className="input border-blue-100 focus:border-blue-400" value={form.comissaoComprador} onChange={(v) => set("comissaoComprador", v)} />
                  </div>
                )}
                {(form.comissaoPagaPor === "vendedor" || form.comissaoPagaPor === "ambos") && (
                  <div>
                    <label className="label text-green-700">Comissão Vendedor (R$/SC)</label>
                    <MoneyInput className="input border-green-100 focus:border-green-400" value={form.comissaoVendedor} onChange={(v) => set("comissaoVendedor", v)} />
                  </div>
                )}
                <div className="col-span-full">
                  <label className="label">Comissão Terceiro (R$/SC total)</label>
                  <MoneyInput className="input" value={form.comissaoTerceiro} onChange={(v) => set("comissaoTerceiro", v)} />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Logística e Condições</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <label className="label mb-2">Frete</label>
                  <ToggleButtons
                    value={form.fretePorConta}
                    onChange={(v) => set("fretePorConta", v)}
                    options={[
                      { value: "CIF POR CONTA DO VENDEDOR", label: "CIF — Conta do Vendedor" },
                      { value: "FOB POR CONTA DO COMPRADOR", label: "FOB — Conta do Comprador" },
                    ]}
                  />
                  <input className="input mt-2 text-xs" placeholder="Ou descreva o frete livremente..." value={
                    form.fretePorConta === "CIF POR CONTA DO VENDEDOR" || form.fretePorConta === "FOB POR CONTA DO COMPRADOR"
                      ? "" : form.fretePorConta
                  } onChange={(e) => set("fretePorConta", e.target.value)} />
                </div>
                <div className="col-span-full">
                  <label className="label">Local de Retirada</label>
                  <input className="input" value={form.localRetirada} onChange={(e) => set("localRetirada", e.target.value)} placeholder="Silo do Renato, Fazenda..." />
                </div>
                <div>
                  <label className="label">Condições de Pagamento</label>
                  <input className="input" value={form.condicoesPagamento} onChange={(e) => set("condicoesPagamento", e.target.value)} placeholder="SOBRE RODAS" />
                </div>
                <div>
                  <label className="label">Funrural (%)</label>
                  <MoneyInput className="input" value={form.funrural} onChange={(v) => set("funrural", v)} />
                </div>
                <div className="col-span-full">
                  <label className="label">Foro da Comarca</label>
                  <input className="input" value={form.foro} onChange={(e) => set("foro", e.target.value)} placeholder="UBERLÂNDIA-MG" />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Padrão de Qualidade</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100">
                    <th className="table-th w-1/4">Item</th>
                    <th className="table-th w-1/3">Padrão</th>
                    <th className="table-th">Desconto fora do padrão</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {qualidade.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-1 pr-2"><input className="input py-1 text-xs" value={row.item} onChange={(e) => setQRow(idx, "item", e.target.value)} /></td>
                        <td className="py-1 pr-2"><input className="input py-1 text-xs" value={row.padrao} onChange={(e) => setQRow(idx, "padrao", e.target.value)} /></td>
                        <td className="py-1"><input className="input py-1 text-xs" value={row.desconto} onChange={(e) => setQRow(idx, "desconto", e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => setQualidade((r) => [...r, { item: "", padrao: "", desconto: "" }])} className="mt-2 text-xs text-brand-600 hover:underline">+ Adicionar linha</button>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Datas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Data Fechamento</label>
                  <input className="input" type="date" value={form.dataFechamento} onChange={(e) => set("dataFechamento", e.target.value)} />
                </div>
                <div>
                  <label className="label">Início</label>
                  <input className="input" type="date" value={form.inicio} onChange={(e) => set("inicio", e.target.value)} />
                </div>
                <div>
                  <label className="label">Término</label>
                  <input className="input" type="date" value={form.termino} onChange={(e) => set("termino", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="card">
              <label className="label">Observações</label>
              <textarea className="input" rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
            </div>
          </div>

          {/* Preview — sticky */}
          <div className="space-y-4 lg:sticky top-6">
            <div className="card bg-bt-pale border-bt-accent">
              <h3 className="font-semibold text-bt-dark mb-4">Resumo</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Nº Sacas</span>
                  <span className="font-medium">{numSacas.toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Valor/Saca</span>
                  <span className="font-medium">R$ {valorSaca.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-bt-accent pt-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">Valor Contrato</span>
                    <span className="font-bold text-bt-dark">
                      R$ {valorContrato.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Comissão Comprador</span>
                  <span className="font-medium text-green-700">R$ {comissaoComp.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Comissão Vendedor</span>
                  <span className="font-medium text-green-700">R$ {comissaoVend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-bt-accent pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Comissão</span>
                    <span className="font-bold text-green-700">R$ {(comissaoComp + comissaoVend).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? "Salvando..." : "Criar Contrato"}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-secondary w-full justify-center">
              Cancelar
            </button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
