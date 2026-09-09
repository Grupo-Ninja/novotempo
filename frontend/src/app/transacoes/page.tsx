"use client";
import DashboardLayout from "../dashboard-layout";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import { TransacaoStatusBadge } from "@/components/StatusBadge";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const LIMIT = 20;

interface Transacao {
  id: string; numeroId: string; categoria?: string; dataTransacao?: string;
  metodoPagamento?: string; nfs?: string; nfAcesso?: string; status: string;
  valorDebitado: number; refComissao: number;
  carregamento?: { id: string; numeroId: string } | null;
  contrato: { id: string; numeroId: string; comprador: { nome: string }; produtor: { nome: string }; };
}

export default function TransacoesPage() {
  const [items, setItems] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [comprador, setComprador] = useState("");
  const [produtor, setProdutor] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ valorTotal: 0, valorPago: 0, saldoPendente: 0 });

  async function load(p = page) {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    if (comprador) params.set("comprador", comprador);
    if (produtor) params.set("produtor", produtor);
    params.set("page", String(p));
    params.set("limit", String(LIMIT));
    try {
      const res = await apiFetch(`/transacoes?${params}`);
      const data = await res.json();
      setItems(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
      if (data.meta) setMeta({ total: data.meta.total, totalPages: data.meta.totalPages });
      if (data.summary) setSummary(data.summary);
    } catch {
      setItems([]);
      setSummary({ valorTotal: 0, valorPago: 0, saldoPendente: 0 });
    }
    setLoading(false);
  }

  useEffect(() => { setPage(1); }, [status, dataInicio, dataFim, comprador, produtor]);
  useEffect(() => { load(page); }, [status, dataInicio, dataFim, comprador, produtor, page]);

  function clearFilters() {
    setStatus(""); setDataInicio(""); setDataFim(""); setComprador(""); setProdutor("");
  }

  const hasFilters = status || dataInicio || dataFim || comprador || produtor;

  return (
    <DashboardLayout>
      <PageHeader title="Transações" subtitle={`${meta.total} registros`} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card text-center"><p className="text-xs text-gray-500 mb-1">Valor Total</p><p className="text-xl font-bold text-bt-dark">{formatCurrency(summary.valorTotal)}</p></div>
        <div className="card text-center"><p className="text-xs text-gray-500 mb-1">Valor Pago</p><p className="text-xl font-bold text-green-700">{formatCurrency(summary.valorPago)}</p></div>
        <div className="card text-center"><p className="text-xs text-gray-500 mb-1">Saldo Pendente</p><p className="text-xl font-bold text-amber-700">{formatCurrency(summary.saldoPendente)}</p></div>
      </div>

      <div className="card">
        {/* Filtros */}
        <div className="mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="label">Data início</label>
            <input className="input" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="label">Data fim</label>
            <input className="input" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div>
            <label className="label">Comprador</label>
            <input className="input" placeholder="Buscar..." value={comprador} onChange={(e) => setComprador(e.target.value)} />
          </div>
          <div>
            <label className="label">Produtor</label>
            <input className="input" placeholder="Buscar..." value={produtor} onChange={(e) => setProdutor(e.target.value)} />
          </div>
          {hasFilters && (
            <div className="col-span-full flex justify-end">
              <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-700 underline">Limpar filtros</button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin w-6 h-6 border-4 border-bt-mid border-t-transparent rounded-full" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead><tr className="border-b border-gray-100">
                <th className="table-th">ID</th><th className="table-th">Contrato</th>
                <th className="table-th">Comprador</th><th className="table-th">Carregamento</th><th className="table-th">Categoria</th>
                <th className="table-th">Data</th><th className="table-th">Método</th>
                <th className="table-th">Valor Debitado</th><th className="table-th">Ref. Comissão</th>
                <th className="table-th">NF Balança</th><th className="table-th">NF Acesso</th>
                <th className="table-th">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {items.length === 0 ? (
                  <tr><td colSpan={12} className="table-td text-center text-gray-400 py-10">Nenhuma transação encontrada</td></tr>
                ) : items.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="table-td text-xs text-gray-500">{t.numeroId}</td>
                    <td className="table-td"><Link href={`/contratos/${t.contrato?.id}`} className="text-bt-mid font-medium hover:underline">{t.contrato?.numeroId}</Link></td>
                    <td className="table-td">{t.contrato?.comprador?.nome || "-"}</td>
                    <td className="table-td text-xs">{t.carregamento?.numeroId || "-"}</td>
                    <td className="table-td">{t.categoria || "-"}</td>
                    <td className="table-td">{formatDate(t.dataTransacao)}</td>
                    <td className="table-td">{t.metodoPagamento || "-"}</td>
                    <td className="table-td font-medium">{formatCurrency(t.valorDebitado)}</td>
                    <td className="table-td">{formatCurrency(t.refComissao)}</td>
                    <td className="table-td text-xs">{t.nfs || "-"}</td>
                    <td className="table-td text-xs">{t.nfAcesso || "-"}</td>
                    <td className="table-td"><TransacaoStatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={LIMIT} onPageChange={setPage} />
      </div>
    </DashboardLayout>
  );
}
