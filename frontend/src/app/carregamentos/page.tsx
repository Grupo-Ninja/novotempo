"use client";
import DashboardLayout from "../dashboard-layout";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const LIMIT = 20;

interface Carregamento {
  id: string; numeroId: string; dataEnvio?: string; motorista?: string;
  produto?: string; pesoKg: number; qntSacas: number; valorCarga: number;
  contrato: { id: string; numeroId: string; comprador: { nome: string }; produtor: { nome: string }; };
}

export default function CarregamentosPage() {
  const [items, setItems] = useState<Carregamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [comprador, setComprador] = useState("");
  const [produtor, setProdutor] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  async function load(p = page) {
    setLoading(true);
    const params = new URLSearchParams();
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    if (comprador) params.set("comprador", comprador);
    if (produtor) params.set("produtor", produtor);
    params.set("page", String(p));
    params.set("limit", String(LIMIT));
    try {
      const res = await apiFetch(`/carregamentos?${params}`);
      const d = await res.json();
      setItems(Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []));
      if (d.meta) setMeta({ total: d.meta.total, totalPages: d.meta.totalPages });
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  useEffect(() => { setPage(1); }, [dataInicio, dataFim, comprador, produtor]);
  useEffect(() => { load(page); }, [dataInicio, dataFim, comprador, produtor, page]);

  function clearFilters() {
    setDataInicio(""); setDataFim(""); setComprador(""); setProdutor("");
  }

  const totalSacas = items.reduce((s, c) => s + c.qntSacas, 0);
  const totalPeso = items.reduce((s, c) => s + c.pesoKg, 0);
  const totalValor = items.reduce((s, c) => s + c.valorCarga, 0);
  const hasFilters = dataInicio || dataFim || comprador || produtor;

  return (
    <DashboardLayout>
      <PageHeader title="Carregamentos" subtitle={`${meta.total} registros`} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center"><p className="text-xs text-gray-500 mb-1">Total Sacas</p><p className="text-xl font-bold">{formatNumber(totalSacas, 3)}</p></div>
        <div className="card text-center"><p className="text-xs text-gray-500 mb-1">Peso Total (kg)</p><p className="text-xl font-bold">{formatNumber(totalPeso, 0)}</p></div>
        <div className="card text-center"><p className="text-xs text-gray-500 mb-1">Valor Total</p><p className="text-xl font-bold text-bt-dark">{formatCurrency(totalValor)}</p></div>
      </div>

      <div className="card">
        {/* Filtros */}
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <input className="input" placeholder="Buscar comprador..." value={comprador} onChange={(e) => setComprador(e.target.value)} />
          </div>
          <div>
            <label className="label">Produtor</label>
            <input className="input" placeholder="Buscar produtor..." value={produtor} onChange={(e) => setProdutor(e.target.value)} />
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
            <table className="w-full min-w-[900px]">
              <thead><tr className="border-b border-gray-100">
                <th className="table-th">ID</th><th className="table-th">Contrato</th>
                <th className="table-th">Comprador</th><th className="table-th">Produtor</th>
                <th className="table-th">Data Envio</th><th className="table-th">Produto</th>
                <th className="table-th">Motorista</th><th className="table-th">Sacas</th>
                <th className="table-th">Peso (kg)</th><th className="table-th">Valor Carga</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {items.length === 0 ? (
                  <tr><td colSpan={10} className="table-td text-center text-gray-400 py-10">Nenhum carregamento encontrado</td></tr>
                ) : items.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="table-td text-xs text-gray-500">{c.numeroId}</td>
                    <td className="table-td"><Link href={`/contratos/${c.contrato.id}`} className="text-bt-mid font-medium hover:underline">{c.contrato.numeroId}</Link></td>
                    <td className="table-td">{c.contrato.comprador.nome}</td>
                    <td className="table-td">{c.contrato.produtor.nome}</td>
                    <td className="table-td">{formatDate(c.dataEnvio)}</td>
                    <td className="table-td">{c.produto || "-"}</td>
                    <td className="table-td">{c.motorista || "-"}</td>
                    <td className="table-td">{formatNumber(c.qntSacas, 3)}</td>
                    <td className="table-td">{formatNumber(c.pesoKg, 0)}</td>
                    <td className="table-td font-medium">{formatCurrency(c.valorCarga)}</td>
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
