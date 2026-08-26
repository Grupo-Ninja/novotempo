"use client";
import DashboardLayout from "../../dashboard-layout";
import { ContratoStatusBadge, TransacaoStatusBadge } from "@/components/StatusBadge";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatCurrency, formatNumber, formatDate, calcContrato } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { MoneyInput } from "@/components/InputMask";

const PRODUTOS = ["Soja", "Milho", "Sorgo", "Trigo", "Feijão", "Algodão", "Café", "Outro"];

interface QualidadeRow { item: string; padrao: string; desconto: string; }

const DEFAULT_QUALIDADE: QualidadeRow[] = [
  { item: "Umidade",        padrao: "Até 14,00 %",          desconto: "Isento até o padrão" },
  { item: "Impurezas",      padrao: "1,0 % (peneira 3 mm)",  desconto: "Até o limite de 1 %" },
  { item: "Avariados",      padrao: "5 %",                   desconto: "1×1 conforme limites de tolerância" },
  { item: "Carunchado",     padrao: "Até 1 %",               desconto: "1×1 até limite de 2 %" },
  { item: "Insetos / Odor", padrao: "Isento",                desconto: "Produto recusado" },
  { item: "Quebrado",       padrao: "Até 8 %",               desconto: "1×1 conforme limite de cada peneira" },
];

function defaultClausulas(foro?: string) {
  return `1. As partes declaram plena ciência e aceitação das condições estipuladas neste instrumento particular de compra e venda.
2. O produto objeto deste contrato está livre de quaisquer ônus, penhoras ou gravames (Lei 13.606/2018).
3. A Corretora Novo Tempo atua exclusivamente como intermediária, sem responsabilidade solidária pelas obrigações das partes.
4. O descumprimento de qualquer cláusula implicará multa de 10% sobre o valor total do contrato, além de perdas e danos.
5. Este contrato entra em vigor na data de sua assinatura, sendo irretratável e irrevogável.
6. Fica eleito o foro da Comarca de ${foro || "Uberlândia - MG"} para dirimir quaisquer litígios.`;
}

interface MotoristaOpt { id: string; nome: string; placaCavalo?: string; }
interface Cliente { id: string; nome: string; cpfCnpj: string; tipo: string; }
interface Carregamento {
  id: string; numeroId: string; dataEnvio?: string; motorista?: string; corretor?: string;
  produto?: string; pesoKg: number; qntSacas: number; valorCarga: number; refPeso: number;
  refValorSaca: number; umidadeSorgo?: number; observacoes?: string;
}
interface Transacao {
  id: string; numeroId: string; categoria?: string; dataTransacao?: string;
  metodoPagamento?: string; nfs?: string; nfAcesso?: string; status: string; tipoDaNota?: string;
  valorDebitado: number; refProdutor: number; refComissao: number; observacoes?: string;
}
interface Contrato {
  id: string; numeroId: string; status: string; produto: string; cidade?: string;
  numSacas: number; valorSaca: number; comissaoPorSaca: number; comissaoTerceiro: number;
  dataFechamento?: string; inicio?: string; termino?: string;
  fechamentoOrigem?: string; fechamentoDestino?: string; refPeso: number;
  observacoes?: string; clausulas?: string;
  comissaoPagaPor: string; comissaoVendedor: number; comissaoComprador: number;
  fretePorConta?: string; localRetirada?: string; condicoesPagamento?: string;
  funrural: number; foro?: string; padraoQualidade?: QualidadeRow[];
  comprador: { id: string; nome: string; cpfCnpj: string; endereco?: string; };
  produtor: { id: string; nome: string; cpfCnpj: string; inscricaoEstadual?: string; fazenda?: string; banco?: string; agencia?: string; conta?: string; pix?: string; };
  carregamentos: Carregamento[];
  transacoes: Transacao[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

function CollapsibleCard({ title, defaultOpen = true, children }: {
  title: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function ToggleButtons({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      {options.map((opt) => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function parseNonNegativeDecimal(value: string | undefined, label: string, max?: number): number {
  const raw = (value || "").trim();
  if (!raw) return 0;
  if (raw.startsWith("-")) {
    throw new Error(`${label}: valores negativos não são permitidos.`);
  }
  if (!/^\d+(?:[.,]\d+)?$/.test(raw)) {
    throw new Error(`${label}: informe um número válido.`);
  }
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label}: valores negativos não são permitidos.`);
  }
  if (max !== undefined && parsed > max) {
    throw new Error(`${label} deve estar entre 0 e ${max}.`);
  }
  return parsed;
}

async function responseError(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => null) as {
    error?: string;
    details?: { message?: string }[];
  } | null;
  const detail = body?.details?.map((item) => item.message).filter(Boolean).join(" · ");
  return new Error(detail || body?.error || `${fallback} (HTTP ${res.status})`);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ContratoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [editQualidade, setEditQualidade] = useState<QualidadeRow[]>([]);

  const [showCarrModal, setShowCarrModal] = useState(false);
  const [showTrxModal, setShowTrxModal] = useState(false);
  const [editingCarr, setEditingCarr] = useState<Carregamento | null>(null);
  const [editingTrx, setEditingTrx] = useState<Transacao | null>(null);
  const [carrForm, setCarrForm] = useState<Record<string, string>>({});
  const [trxForm, setTrxForm] = useState<Record<string, string>>({});
  const [modalLoading, setModalLoading] = useState(false);
  const modalSubmittingRef = useRef(false);
  const [modalError, setModalError] = useState("");
  const [confirmingPago, setConfirmingPago] = useState<string | null>(null);

  // Motorista combobox
  const [motoristaOptions, setMotoristaOptions] = useState<MotoristaOpt[]>([]);
  const [motoristaSearch, setMotoristaSearch] = useState("");
  const [showMotoristaDrop, setShowMotoristaDrop] = useState(false);

  async function load() {
    const res = await apiFetch(`/contratos/${id}`);
    if (!res.ok) throw await responseError(res, "Erro ao atualizar contrato");
    const data = await res.json();
    setContrato(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    apiFetch("/clientes?limit=200").then((r) => r.json()).then((d) =>
      setClientes(Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []))
    );
  }, [id]);

  // Carrega motoristas quando o modal de carregamento abre
  useEffect(() => {
    if (!showCarrModal) return;
    apiFetch("/motoristas?limit=200").then((r) => r.json()).then((d) =>
      setMotoristaOptions(Array.isArray(d.data) ? d.data : [])
    );
  }, [showCarrModal]);

  if (loading || !contrato) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-bt-mid border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  const calc = calcContrato(contrato);
  const produtores = clientes.filter((c) => c.tipo === "produtor" || c.tipo === "ambos");
  const compradores = clientes.filter((c) => c.tipo === "comprador" || c.tipo === "ambos");

  // Motoristas filtrados pelo texto digitado
  const filteredMotoristas = motoristaOptions.filter((m) =>
    !motoristaSearch ||
    m.nome.toLowerCase().includes(motoristaSearch.toLowerCase()) ||
    (m.placaCavalo && m.placaCavalo.toLowerCase().includes(motoristaSearch.toLowerCase()))
  );

  function startEdit() {
    setEditForm({
      status: contrato!.status, produto: contrato!.produto, cidade: contrato!.cidade || "",
      compradorId: contrato!.comprador.id, produtorId: contrato!.produtor.id,
      numSacas: contrato!.numSacas, valorSaca: contrato!.valorSaca,
      comissaoPorSaca: contrato!.comissaoPorSaca, comissaoTerceiro: contrato!.comissaoTerceiro,
      refPeso: contrato!.refPeso,
      dataFechamento: contrato!.dataFechamento ? contrato!.dataFechamento.split("T")[0] : "",
      inicio: contrato!.inicio ? contrato!.inicio.split("T")[0] : "",
      termino: contrato!.termino ? contrato!.termino.split("T")[0] : "",
      fechamentoOrigem: contrato!.fechamentoOrigem || "",
      fechamentoDestino: contrato!.fechamentoDestino || "",
      comissaoPagaPor: contrato!.comissaoPagaPor,
      comissaoVendedor: contrato!.comissaoVendedor,
      comissaoComprador: contrato!.comissaoComprador,
      fretePorConta: contrato!.fretePorConta || "",
      localRetirada: contrato!.localRetirada || "",
      condicoesPagamento: contrato!.condicoesPagamento || "",
      funrural: contrato!.funrural,
      foro: contrato!.foro || "",
      observacoes: contrato!.observacoes || "",
      clausulas: (contrato!.clausulas && contrato!.clausulas !== "null") ? contrato!.clausulas : defaultClausulas(contrato!.foro),
    });
    const q = contrato!.padraoQualidade && contrato!.padraoQualidade.length > 0
      ? contrato!.padraoQualidade.map((r: QualidadeRow) => ({ ...r }))
      : DEFAULT_QUALIDADE.map((r: QualidadeRow) => ({ ...r }));
    setEditQualidade(q);
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    const body: Record<string, unknown> = { ...editForm, padraoQualidade: editQualidade };
    if (!body.dataFechamento) delete body.dataFechamento;
    if (!body.inicio) delete body.inicio;
    if (!body.termino) delete body.termino;
    await apiFetch(`/contratos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setEditing(false);
    load();
  }

  async function updateStatus(newStatus: string) {
    await apiFetch(`/contratos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  async function deleteContrato() {
    if (!confirm(`Excluir o contrato ${contrato!.numeroId}?`)) return;
    await apiFetch(`/contratos/${id}`, { method: "DELETE" });
    router.push("/contratos");
  }

  async function confirmarPago(trxId: string) {
    setConfirmingPago(trxId);
    try {
      await apiFetch(`/transacoes/${trxId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pago" }),
      });
      load();
    } finally {
      setConfirmingPago(null);
    }
  }

  function openCarrModal(carr?: Carregamento) {
    setModalError("");
    setEditingCarr(carr || null);
    const motNome = carr?.motorista || "";
    setMotoristaSearch(motNome);
    setShowMotoristaDrop(false);
    setCarrForm(carr ? {
      dataEnvio: carr.dataEnvio ? carr.dataEnvio.split("T")[0] : "",
      motorista: carr.motorista || "", corretor: carr.corretor || "",
      produto: carr.produto || contrato!.produto, pesoKg: String(carr.pesoKg),
      qntSacas: String(carr.qntSacas), valorCarga: String(carr.valorCarga),
      refPeso: String(carr.refPeso), refValorSaca: String(carr.refValorSaca),
      umidadeSorgo: carr.umidadeSorgo != null ? String(carr.umidadeSorgo) : "",
      observacoes: carr.observacoes || "",
    } : {
      produto: contrato!.produto, dataEnvio: "", motorista: "", corretor: "",
      pesoKg: "", qntSacas: "", valorCarga: "", refPeso: "", refValorSaca: "",
      umidadeSorgo: "", observacoes: "",
    });
    setShowCarrModal(true);
  }

  async function saveCarr() {
    if (modalSubmittingRef.current) return;
    modalSubmittingRef.current = true;
    setModalLoading(true);
    setModalError("");
    try {
      const payload = {
        ...carrForm,
        contratoId: id,
        qntSacas: parseNonNegativeDecimal(carrForm.qntSacas, "Qnt Sacas"),
        pesoKg: parseNonNegativeDecimal(carrForm.pesoKg, "Peso"),
        valorCarga: parseNonNegativeDecimal(carrForm.valorCarga, "Valor Carga"),
        refPeso: parseNonNegativeDecimal(carrForm.refPeso, "Ref. Peso"),
        refValorSaca: parseNonNegativeDecimal(carrForm.refValorSaca, "Ref. Valor Saca"),
        umidadeSorgo: carrForm.umidadeSorgo
          ? parseNonNegativeDecimal(carrForm.umidadeSorgo, "Umidade", 100)
          : null,
      };
      const url = editingCarr ? `/carregamentos/${editingCarr.id}` : "/carregamentos";
      const res = await apiFetch(url, {
        method: editingCarr ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw await responseError(res, "Erro ao salvar carregamento");
      await load();
      setShowCarrModal(false);
    } catch (error) {
      console.error("[Carregamento] Falha ao salvar", error);
      setModalError(error instanceof Error ? error.message : "Erro de conexão. Tente novamente.");
    } finally {
      modalSubmittingRef.current = false;
      setModalLoading(false);
    }
  }

  async function deleteCarr(carrId: string) {
    if (!confirm("Excluir este carregamento?")) return;
    await apiFetch(`/carregamentos/${carrId}`, { method: "DELETE" }); load();
  }

  function openTrxModal(trx?: Transacao) {
    setModalError("");
    setEditingTrx(trx || null);
    setTrxForm(trx ? {
      categoria: trx.categoria || "", dataTransacao: trx.dataTransacao ? trx.dataTransacao.split("T")[0] : "",
      metodoPagamento: trx.metodoPagamento || "", nfs: trx.nfs || "", nfAcesso: trx.nfAcesso || "",
      status: trx.status, tipoDaNota: trx.tipoDaNota || "", valorDebitado: String(trx.valorDebitado),
      refProdutor: String(trx.refProdutor), refComissao: String(trx.refComissao), observacoes: trx.observacoes || "",
    } : {
      categoria: "", dataTransacao: "", metodoPagamento: "", nfs: "", nfAcesso: "",
      status: "pendente", tipoDaNota: "", valorDebitado: "", refProdutor: "", refComissao: "", observacoes: "",
    });
    setShowTrxModal(true);
  }

  async function saveTrx() {
    if (modalSubmittingRef.current) return;
    modalSubmittingRef.current = true;
    setModalLoading(true);
    setModalError("");
    try {
      const payload = {
        ...trxForm,
        contratoId: id,
        valorDebitado: parseNonNegativeDecimal(trxForm.valorDebitado, "Valor Debitado"),
        refComissao: parseNonNegativeDecimal(trxForm.refComissao, "Ref. Comissão"),
        refProdutor: parseNonNegativeDecimal(trxForm.refProdutor, "Ref. Produtor"),
      };
      const url = editingTrx ? `/transacoes/${editingTrx.id}` : "/transacoes";
      const res = await apiFetch(url, {
        method: editingTrx ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw await responseError(res, "Erro ao salvar transação");
      await load();
      setShowTrxModal(false);
    } catch (error) {
      console.error("[Transação] Falha ao salvar", error);
      setModalError(error instanceof Error ? error.message : "Erro de conexão. Tente novamente.");
    } finally {
      modalSubmittingRef.current = false;
      setModalLoading(false);
    }
  }

  async function deleteTrx(trxId: string) {
    if (!confirm("Excluir esta transação?")) return;
    await apiFetch(`/transacoes/${trxId}`, { method: "DELETE" }); load();
  }

  const qualidadeExibida = (contrato.padraoQualidade && contrato.padraoQualidade.length > 0)
    ? contrato.padraoQualidade
    : DEFAULT_QUALIDADE;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/contratos")} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{contrato.numeroId}</h1>
              <ContratoStatusBadge status={contrato.status} />
              {/* Status rápido — admin only */}
              {isAdmin && (
                <select
                  value={contrato.status}
                  onChange={(e) => updateStatus(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-400"
                >
                  <option value="nao_iniciado">Não Iniciado</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                </select>
              )}
            </div>
            <p className="text-sm text-gray-500">{contrato.produto} · {contrato.comprador.nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api"}/contratos/${id}/pdf?view=vendedor`} target="_blank" className="bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 text-xs font-semibold border-r border-gray-200 flex items-center gap-1.5 transition-colors">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Contrato Produtor
            </a>
            <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api"}/contratos/${id}/pdf?view=comprador`} target="_blank" className="bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 text-xs font-semibold border-r border-gray-200 flex items-center gap-1.5 transition-colors">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Contrato Comprador
            </a>
            <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api"}/contratos/${id}/pdf?view=unificado`} target="_blank" className="bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Contrato Unificado
            </a>
          </div>
          {isAdmin && !editing && (
            <>
              <button onClick={startEdit} className="btn-primary text-sm py-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Editar
              </button>
              <button onClick={deleteContrato} className="btn-danger text-sm py-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Excluir
              </button>
            </>
          )}
          {editing && (
            <>
              <button onClick={saveEdit} disabled={saving} className="btn-primary text-sm py-1.5">{saving ? "Salvando..." : "Salvar"}</button>
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-1.5">Cancelar</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">

          {/* ── View mode com seções colapsáveis ── */}
          {!editing ? (
            <>
              {/* Informações do Contrato — aberto por padrão */}
              <CollapsibleCard title="Informações do Contrato" defaultOpen={true}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <div>
                    <InfoRow label="Produto" value={contrato.produto} />
                    <InfoRow label="Comprador" value={contrato.comprador.nome} />
                    <InfoRow label="Produtor" value={contrato.produtor.nome} />
                    <InfoRow label="Cidade" value={contrato.cidade || "-"} />
                    <InfoRow label="Fechamento Origem" value={contrato.fechamentoOrigem || "-"} />
                    <InfoRow label="Fechamento Destino" value={contrato.fechamentoDestino || "-"} />
                    <InfoRow label="Comissão Paga Por" value={contrato.comissaoPagaPor.toUpperCase()} />
                  </div>
                  <div>
                    <InfoRow label="Data Fechamento" value={formatDate(contrato.dataFechamento)} />
                    <InfoRow label="Início" value={formatDate(contrato.inicio)} />
                    <InfoRow label="Término" value={formatDate(contrato.termino)} />
                    <InfoRow label="Ref. Peso" value={formatNumber(contrato.refPeso, 3)} />
                    <InfoRow label="Frete" value={contrato.fretePorConta || "-"} />
                    <InfoRow label="Retirada" value={contrato.localRetirada || "-"} />
                    <InfoRow label="Foro" value={contrato.foro || "-"} />
                  </div>
                </div>
                {contrato.observacoes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Observações</p>
                    <p className="text-sm text-gray-700">{contrato.observacoes}</p>
                  </div>
                )}
              </CollapsibleCard>

              {/* Padrão de Qualidade — fechado por padrão */}
              <CollapsibleCard title="Padrão de Qualidade" defaultOpen={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100">
                      <th className="table-th">Item</th>
                      <th className="table-th">Padrão</th>
                      <th className="table-th">Desconto fora do padrão</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {qualidadeExibida.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="table-td font-medium">{row.item}</td>
                          <td className="table-td">{row.padrao}</td>
                          <td className="table-td text-gray-600">{row.desconto}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleCard>

              {/* Cláusulas — fechado por padrão */}
              <CollapsibleCard title="Cláusulas" defaultOpen={false}>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {(contrato.clausulas && contrato.clausulas !== "null") ? contrato.clausulas : defaultClausulas(contrato.foro)}
                </p>
              </CollapsibleCard>
            </>
          ) : (
            /* ── Edit mode ── */
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Editar Contrato</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Produto", key: "produto", type: "select", opts: PRODUTOS },
                  { label: "Status", key: "status", type: "select", opts: ["nao_iniciado:Não Iniciado", "em_andamento:Em Andamento", "concluido:Concluído"] },
                  { label: "Comprador", key: "compradorId", type: "select-clientes", opts: compradores },
                  { label: "Produtor", key: "produtorId", type: "select-clientes", opts: produtores },
                  { label: "Cidade", key: "cidade" },
                  { label: "Nº Sacas", key: "numSacas", type: "number" },
                  { label: "Valor/Saca (R$)", key: "valorSaca", type: "number" },
                  { label: "Ref. Peso", key: "refPeso", type: "number" },
                  { label: "Fechamento Origem", key: "fechamentoOrigem" },
                  { label: "Fechamento Destino", key: "fechamentoDestino" },
                  { label: "Data Fechamento", key: "dataFechamento", type: "date" },
                  { label: "Início", key: "inicio", type: "date" },
                  { label: "Término", key: "termino", type: "date" },
                ].map(({ label, key, type, opts }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    {type === "select" ? (
                      <select className="input" value={String(editForm[key] || "")} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}>
                        {(opts as string[]).map((o) => {
                          const [val, lbl] = o.includes(":") ? o.split(":") : [o, o];
                          return <option key={val} value={val}>{lbl}</option>;
                        })}
                      </select>
                    ) : type === "select-clientes" ? (
                      <select className="input" value={String(editForm[key] || "")} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}>
                        {(opts as Cliente[]).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    ) : (
                      <input className="input" type={type || "text"} step={type === "number" ? "0.01" : undefined}
                        value={String(editForm[key] || "")}
                        onChange={(e) => setEditForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))} />
                    )}
                  </div>
                ))}

                <div className="col-span-full">
                  <label className="label mb-2">Comissão paga por</label>
                  <ToggleButtons
                    value={String(editForm.comissaoPagaPor || "comprador")}
                    onChange={(v) => setEditForm((f) => ({ ...f, comissaoPagaPor: v }))}
                    options={[
                      { value: "comprador", label: "Somente Comprador" },
                      { value: "vendedor", label: "Somente Vendedor" },
                      { value: "ambos", label: "Ambos" },
                    ]}
                  />
                </div>
                {(editForm.comissaoPagaPor === "vendedor" || editForm.comissaoPagaPor === "ambos") && (
                  <div>
                    <label className="label text-green-700">Comissão Vendedor (R$/SC)</label>
                    <input className="input border-green-100" type="number" step="0.01" value={String(editForm.comissaoVendedor || "")} onChange={(e) => setEditForm((f) => ({ ...f, comissaoVendedor: Number(e.target.value) }))} />
                  </div>
                )}
                {(editForm.comissaoPagaPor === "comprador" || editForm.comissaoPagaPor === "ambos") && (
                  <div>
                    <label className="label text-blue-700">Comissão Comprador (R$/SC)</label>
                    <input className="input border-blue-100" type="number" step="0.01" value={String(editForm.comissaoComprador || "")} onChange={(e) => setEditForm((f) => ({ ...f, comissaoComprador: Number(e.target.value) }))} />
                  </div>
                )}
                <div>
                  <label className="label">Comissão Terceiro (R$/SC)</label>
                  <input className="input" type="number" step="0.01" value={String(editForm.comissaoTerceiro || "")} onChange={(e) => setEditForm((f) => ({ ...f, comissaoTerceiro: Number(e.target.value) }))} />
                </div>

                <div className="col-span-full">
                  <label className="label mb-2">Frete</label>
                  <ToggleButtons
                    value={String(editForm.fretePorConta || "")}
                    onChange={(v) => setEditForm((f) => ({ ...f, fretePorConta: v }))}
                    options={[
                      { value: "CIF POR CONTA DO VENDEDOR", label: "CIF — Conta do Vendedor" },
                      { value: "FOB POR CONTA DO COMPRADOR", label: "FOB — Conta do Comprador" },
                    ]}
                  />
                  <input className="input mt-2 text-xs" placeholder="Ou descreva livremente..."
                    value={
                      String(editForm.fretePorConta || "") === "CIF POR CONTA DO VENDEDOR" ||
                      String(editForm.fretePorConta || "") === "FOB POR CONTA DO COMPRADOR"
                        ? "" : String(editForm.fretePorConta || "")
                    }
                    onChange={(e) => setEditForm((f) => ({ ...f, fretePorConta: e.target.value }))}
                  />
                </div>

                {[
                  { label: "Retirada", key: "localRetirada" },
                  { label: "Pagamento", key: "condicoesPagamento" },
                  { label: "Funrural (%)", key: "funrural", type: "number" },
                  { label: "Foro", key: "foro" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <input className="input" type={type || "text"} step={type === "number" ? "0.01" : undefined}
                      value={String(editForm[key] || "")}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))} />
                  </div>
                ))}

                <div className="col-span-full">
                  <label className="label">Observações</label>
                  <textarea className="input" rows={2} value={String(editForm.observacoes || "")} onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))} />
                </div>
                <div className="col-span-full">
                  <label className="label">Cláusulas</label>
                  <textarea className="input" rows={5} value={String(editForm.clausulas || "")} onChange={(e) => setEditForm((f) => ({ ...f, clausulas: e.target.value }))} />
                </div>
              </div>

              {/* Padrão de qualidade editável */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="font-medium text-gray-700 mb-3">Padrão de Qualidade</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100">
                      <th className="table-th w-1/4">Item</th>
                      <th className="table-th w-1/3">Padrão</th>
                      <th className="table-th">Desconto fora do padrão</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {editQualidade.map((row, idx) => (
                        <tr key={idx}>
                          <td className="py-1 pr-2"><input className="input py-1 text-xs" value={row.item} onChange={(e) => setEditQualidade((r) => r.map((x, i) => i === idx ? { ...x, item: e.target.value } : x))} /></td>
                          <td className="py-1 pr-2"><input className="input py-1 text-xs" value={row.padrao} onChange={(e) => setEditQualidade((r) => r.map((x, i) => i === idx ? { ...x, padrao: e.target.value } : x))} /></td>
                          <td className="py-1 flex gap-1 items-center">
                            <input className="input py-1 text-xs flex-1" value={row.desconto} onChange={(e) => setEditQualidade((r) => r.map((x, i) => i === idx ? { ...x, desconto: e.target.value } : x))} />
                            <button type="button" onClick={() => setEditQualidade((r) => r.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={() => setEditQualidade((r) => [...r, { item: "", padrao: "", desconto: "" }])} className="mt-2 text-xs text-brand-600 hover:underline">+ Adicionar linha</button>
              </div>
            </div>
          )}

          {/* ── Carregamentos ── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Carregamentos ({contrato.carregamentos.length})</h3>
              <button onClick={() => openCarrModal()} className="btn-primary text-sm py-1.5">+ Adicionar</button>
            </div>
            {contrato.carregamentos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum carregamento registrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead><tr className="border-b border-gray-100">
                    <th className="table-th">ID</th><th className="table-th">Data</th>
                    <th className="table-th">Motorista</th><th className="table-th">Sacas</th>
                    <th className="table-th">Peso(kg)</th><th className="table-th">Valor Carga</th>
                    <th className="table-th">Umidade</th><th className="table-th">Ações</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {contrato.carregamentos.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="table-td text-xs text-gray-500">{c.numeroId}</td>
                        <td className="table-td">{formatDate(c.dataEnvio)}</td>
                        <td className="table-td">{c.motorista || "-"}</td>
                        <td className="table-td">{formatNumber(c.qntSacas, 0)}</td>
                        <td className="table-td">{formatNumber(c.pesoKg, 0)}</td>
                        <td className="table-td">{formatCurrency(c.valorCarga)}</td>
                        <td className="table-td">{c.umidadeSorgo != null ? `${c.umidadeSorgo}%` : "-"}</td>
                        <td className="table-td">
                          <div className="flex gap-2">
                            <button onClick={() => openCarrModal(c)} className="text-bt-mid text-xs hover:underline">Editar</button>
                            {isAdmin && <button onClick={() => deleteCarr(c.id)} className="text-red-500 text-xs hover:underline">Excluir</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="bg-bt-pale">
                    <td colSpan={3} className="table-td font-semibold text-bt-dark">Total</td>
                    <td className="table-td font-semibold">{formatNumber(calc.sacasRetiradas, 0)}</td>
                    <td className="table-td font-semibold">{formatNumber(contrato.carregamentos.reduce((s, c) => s + c.pesoKg, 0), 0)}</td>
                    <td className="table-td font-semibold">{formatCurrency(calc.valorCarregado)}</td>
                    <td colSpan={2} />
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ── Transações ── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Transações ({contrato.transacoes.length})</h3>
              <button onClick={() => openTrxModal()} className="btn-primary text-sm py-1.5">+ Adicionar</button>
            </div>
            {contrato.transacoes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma transação registrada</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead><tr className="border-b border-gray-100">
                    <th className="table-th">ID</th><th className="table-th">Categoria</th>
                    <th className="table-th">Data</th><th className="table-th">Método</th>
                    <th className="table-th">Valor Debitado</th><th className="table-th">Ref. Comissão</th>
                    <th className="table-th">NF Balança</th><th className="table-th">NF Acesso</th>
                    <th className="table-th">Status</th><th className="table-th">Ações</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {contrato.transacoes.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="table-td text-xs text-gray-500">{t.numeroId}</td>
                        <td className="table-td">{t.categoria || "-"}</td>
                        <td className="table-td">{formatDate(t.dataTransacao)}</td>
                        <td className="table-td">{t.metodoPagamento || "-"}</td>
                        <td className="table-td font-medium">{formatCurrency(t.valorDebitado)}</td>
                        <td className="table-td">{formatCurrency(t.refComissao)}</td>
                        <td className="table-td text-xs">{t.nfs || "-"}</td>
                        <td className="table-td text-xs">{t.nfAcesso || "-"}</td>
                        <td className="table-td"><TransacaoStatusBadge status={t.status} /></td>
                        <td className="table-td">
                          <div className="flex gap-2 items-center">
                            <button onClick={() => openTrxModal(t)} className="text-bt-mid text-xs hover:underline">Editar</button>
                            {t.status === "pendente" && (
                              <button
                                onClick={() => confirmarPago(t.id)}
                                disabled={confirmingPago === t.id}
                                className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 hover:bg-green-100 transition-colors disabled:opacity-50"
                              >
                                {confirmingPago === t.id ? "..." : "✓ Pago"}
                              </button>
                            )}
                            {isAdmin && <button onClick={() => deleteTrx(t.id)} className="text-red-500 text-xs hover:underline">Excluir</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="bg-bt-pale">
                    <td colSpan={4} className="table-td font-semibold text-bt-dark">Total</td>
                    <td className="table-td font-semibold">{formatCurrency(calc.totalRecebidoCarga)}</td>
                    <td className="table-td font-semibold">{formatCurrency(calc.comissaoRecebida)}</td>
                    <td colSpan={4} />
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Painel direito — sticky */}
        <div className="space-y-4 lg:sticky top-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">Resumo Financeiro</h3>
            <InfoRow label="Nº Sacas" value={formatNumber(contrato.numSacas, 0)} />
            <InfoRow label="Valor/Saca" value={formatCurrency(contrato.valorSaca)} />
            <InfoRow label="Valor Contrato" value={<span className="text-bt-dark font-bold">{formatCurrency(calc.valorContrato)}</span>} />
            <InfoRow label="Sacas Retiradas" value={formatNumber(calc.sacasRetiradas, 0)} />
            <InfoRow label="Sacas a Retirar" value={formatNumber(calc.sacasARetirar, 0)} />
            <InfoRow label="Valor Carregado" value={formatCurrency(calc.valorCarregado)} />
            <InfoRow label="Saldo Carregamento" value={formatCurrency(calc.saldoCarregamento)} />
            <div className="border-t border-gray-100 mt-2 pt-2">
              <InfoRow label="Valor Recebido" value={formatCurrency(calc.totalRecebidoCarga)} />
              <InfoRow label="% Recebida" value={`${formatNumber(calc.percRecebida, 1)}%`} />
              <InfoRow label="A Receber (Carga)" value={<span className="text-yellow-700 font-medium">{formatCurrency(calc.aReceberCarga)}</span>} />
            </div>
            <div className="border-t border-gray-100 mt-2 pt-2">
              <InfoRow label="Comissão Projetada" value={formatCurrency(calc.comissaoProjetada)} />
              <InfoRow label="Comissão Recebida" value={formatCurrency(calc.comissaoRecebida)} />
              <InfoRow label="% Comissão Rec." value={`${formatNumber(calc.percComissao, 1)}%`} />
              <InfoRow label="Comissão a Receber" value={<span className="text-yellow-700 font-medium">{formatCurrency(calc.comissaoAReceber)}</span>} />
            </div>
            <div className="border-t border-gray-100 mt-2 pt-2">
              <InfoRow label="Σ Ref. Peso Carr." value={formatNumber(calc.refPesoCarregamento, 3)} />
              <InfoRow label="Σ Ref. Produtor" value={formatCurrency(calc.refProdutor)} />
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">Partes</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Comprador</p>
                <p className="text-sm font-medium">{contrato.comprador.nome}</p>
                <p className="text-xs text-gray-400">{contrato.comprador.cpfCnpj}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Produtor</p>
                <p className="text-sm font-medium">{contrato.produtor.nome}</p>
                <p className="text-xs text-gray-400">{contrato.produtor.cpfCnpj}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Carregamento ── */}
      {showCarrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold">{editingCarr ? "Editar" : "Novo"} Carregamento</h3>
              <button onClick={() => setShowCarrModal(false)} disabled={modalLoading}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <label className="label">Data Envio</label>
                <input className="input" type="date" value={carrForm.dataEnvio || ""} onChange={(e) => setCarrForm((f) => ({ ...f, dataEnvio: e.target.value }))} />
              </div>
              <div>
                <label className="label">Produto</label>
                <input className="input" value={carrForm.produto || ""} onChange={(e) => setCarrForm((f) => ({ ...f, produto: e.target.value }))} />
              </div>

              {/* Motorista — combobox com search */}
              <div className="col-span-2 relative">
                <label className="label">Motorista</label>
                <input
                  className="input"
                  placeholder="Buscar por nome ou placa..."
                  value={motoristaSearch}
                  onChange={(e) => {
                    setMotoristaSearch(e.target.value);
                    setCarrForm((f) => ({ ...f, motorista: e.target.value }));
                    setShowMotoristaDrop(true);
                  }}
                  onFocus={() => setShowMotoristaDrop(true)}
                  onBlur={() => setTimeout(() => setShowMotoristaDrop(false), 150)}
                />
                {showMotoristaDrop && filteredMotoristas.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-44 overflow-y-auto">
                    {filteredMotoristas.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setCarrForm((f) => ({ ...f, motorista: m.nome }));
                          setMotoristaSearch(m.nome);
                          setShowMotoristaDrop(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
                      >
                        <span className="font-medium">{m.nome}</span>
                        {m.placaCavalo && <span className="text-xs text-gray-400 font-mono">{m.placaCavalo}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Corretor</label>
                <input className="input" value={carrForm.corretor || ""} onChange={(e) => setCarrForm((f) => ({ ...f, corretor: e.target.value }))} />
              </div>
              {[
                { label: "Qnt Sacas", key: "qntSacas", money: false },
                { label: "Peso (kg)", key: "pesoKg", money: false },
                { label: "Valor Carga (R$)", key: "valorCarga", money: true },
                { label: "Ref. Peso", key: "refPeso", money: false },
                { label: "Ref. Valor Saca", key: "refValorSaca", money: true },
                { label: "Umidade (%)", key: "umidadeSorgo", money: false },
              ].map(({ label, key, money }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  {money ? (
                    <MoneyInput className="input" inputMode="decimal"
                      value={carrForm[key] || ""} onChange={(value) => setCarrForm((f) => ({ ...f, [key]: value }))} />
                  ) : (
                    <input className="input" type="text" inputMode="decimal"
                      value={carrForm[key] || ""} onChange={(e) => setCarrForm((f) => ({ ...f, [key]: e.target.value }))} />
                  )}
                </div>
              ))}
              <div className="col-span-2">
                <label className="label">Observações</label>
                <textarea className="input" rows={2} value={carrForm.observacoes || ""} onChange={(e) => setCarrForm((f) => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            {modalError && <div className="mx-5 mb-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{modalError}</div>}
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={saveCarr} disabled={modalLoading} className="btn-primary flex-1 justify-center">{modalLoading ? "Salvando..." : "Salvar"}</button>
              <button onClick={() => setShowCarrModal(false)} disabled={modalLoading} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Transação ── */}
      {showTrxModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold">{editingTrx ? "Editar" : "Nova"} Transação</h3>
              <button onClick={() => setShowTrxModal(false)} disabled={modalLoading}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div><label className="label">Categoria</label><input className="input" value={trxForm.categoria || ""} onChange={(e) => setTrxForm((f) => ({ ...f, categoria: e.target.value }))} /></div>
              <div><label className="label">Data</label><input className="input" type="date" value={trxForm.dataTransacao || ""} onChange={(e) => setTrxForm((f) => ({ ...f, dataTransacao: e.target.value }))} /></div>
              <div><label className="label">Método Pagamento</label>
                <select className="input" value={trxForm.metodoPagamento || ""} onChange={(e) => setTrxForm((f) => ({ ...f, metodoPagamento: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {["PIX","TED","Boleto","Cheque","Dinheiro","Outro"].map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div><label className="label">Status</label>
                <select className="input" value={trxForm.status || "pendente"} onChange={(e) => setTrxForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div><label className="label">Valor Debitado (R$)</label><MoneyInput className="input" inputMode="decimal" value={trxForm.valorDebitado || ""} onChange={(value) => setTrxForm((f) => ({ ...f, valorDebitado: value }))} /></div>
              <div><label className="label">Ref. Comissão (R$)</label><MoneyInput className="input" inputMode="decimal" value={trxForm.refComissao || ""} onChange={(value) => setTrxForm((f) => ({ ...f, refComissao: value }))} /></div>
              <div><label className="label">Ref. Produtor (R$)</label><MoneyInput className="input" inputMode="decimal" value={trxForm.refProdutor || ""} onChange={(value) => setTrxForm((f) => ({ ...f, refProdutor: value }))} /></div>
              <div><label className="label">Tipo da Nota</label><input className="input" value={trxForm.tipoDaNota || ""} onChange={(e) => setTrxForm((f) => ({ ...f, tipoDaNota: e.target.value }))} /></div>
              <div><label className="label">NF Balança</label><input className="input" placeholder="NF de Peso de Balança" value={trxForm.nfs || ""} onChange={(e) => setTrxForm((f) => ({ ...f, nfs: e.target.value }))} /></div>
              <div><label className="label">NF Acesso</label><input className="input" placeholder="NF de Acesso" value={trxForm.nfAcesso || ""} onChange={(e) => setTrxForm((f) => ({ ...f, nfAcesso: e.target.value }))} /></div>
              <div className="col-span-2"><label className="label">Observações</label><textarea className="input" rows={2} value={trxForm.observacoes || ""} onChange={(e) => setTrxForm((f) => ({ ...f, observacoes: e.target.value }))} /></div>
            </div>
            {modalError && <div className="mx-5 mb-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{modalError}</div>}
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={saveTrx} disabled={modalLoading} className="btn-primary flex-1 justify-center">{modalLoading ? "Salvando..." : "Salvar"}</button>
              <button onClick={() => setShowTrxModal(false)} disabled={modalLoading} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
