"use client";
import DashboardLayout from "../dashboard-layout";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import { ContratoStatusBadge } from "@/components/StatusBadge";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatCurrency, formatNumber, formatDate, calcContrato } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

interface Contrato {
  id: string;
  numeroId: string;
  status: string;
  produto: string;
  cidade?: string;
  numSacas: number;
  valorSaca: number;
  comissaoPorSaca: number;
  comissaoTerceiro: number;
  dataFechamento?: string;
  comprador: { id: string; nome: string };
  produtor: { id: string; nome: string };
  carregamentos: { qntSacas: number; valorCarga: number; refPeso: number }[];
  transacoes: { valorDebitado: number; refComissao: number; refProdutor: number }[];
}

const LIMIT = 15;

export default function ContratosPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [produto, setProduto] = useState("");
  const [comprador, setComprador] = useState("");
  const [produtor, setProdutor] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const hasFilters = !!(status || q || produto || comprador || produtor || dataInicio || dataFim);

  function clearFilters() {
    setStatus(""); setQ(""); setProduto(""); setComprador("");
    setProdutor(""); setDataInicio(""); setDataFim("");
  }

  async function load(p = page) {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (produto) params.set("produto", produto);
    if (comprador) params.set("comprador", comprador);
    if (produtor) params.set("produtor", produtor);
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    params.set("page", String(p));
    params.set("limit", String(LIMIT));
    try {
      const res = await apiFetch(`/contratos?${params}`);
      const data = await res.json();
      setContratos(Array.isArray(data.data) ? data.data : []);
      if (data.meta) setMeta({ total: data.meta.total, totalPages: data.meta.totalPages });
    } catch {
      setContratos([]);
    }
    setLoading(false);
  }

  useEffect(() => { setPage(1); }, [status, q, produto, comprador, produtor, dataInicio, dataFim]);
  useEffect(() => { load(page); }, [status, q, produto, comprador, produtor, dataInicio, dataFim, page]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Contratos"
        subtitle={`${meta.total} contratos`}
        action={isAdmin ? { label: "Novo Contrato", href: "/contratos/novo" } : undefined}
      />

      <div className="card">
        {/* Linha 1: busca geral + status */}
        <div className="flex flex-col sm:flex-row gap-3 mb-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Buscar por ID, produto, comprador, produtor..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="input sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="nao_iniciado">Não Iniciado</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>

        {/* Linha 2: filtros avançados */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            className="input sm:w-40"
            placeholder="Produto"
            value={produto}
            onChange={(e) => setProduto(e.target.value)}
          />
          <input
            type="text"
            className="input flex-1"
            placeholder="Comprador"
            value={comprador}
            onChange={(e) => setComprador(e.target.value)}
          />
          <input
            type="text"
            className="input flex-1"
            placeholder="Produtor"
            value={produtor}
            onChange={(e) => setProdutor(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="input sm:w-40"
              title="Data fechamento — de"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
            <span className="text-gray-400 text-sm">até</span>
            <input
              type="date"
              className="input sm:w-40"
              title="Data fechamento — até"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-gray-400 hover:text-gray-600 whitespace-nowrap">
              Limpar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin w-6 h-6 border-4 border-bt-mid border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">ID</th>
                  <th className="table-th">Produto</th>
                  <th className="table-th">Comprador</th>
                  <th className="table-th">Produtor</th>
                  <th className="table-th">Nº Sacas</th>
                  <th className="table-th">Valor/Saca</th>
                  <th className="table-th">Valor Contrato</th>
                  <th className="table-th">Sacas Retiradas</th>
                  <th className="table-th">Comissão Proj.</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Fechamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contratos.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="table-td text-center text-gray-400 py-10">
                      Nenhum contrato encontrado
                    </td>
                  </tr>
                ) : (
                  contratos.map((c) => {
                    const calc = calcContrato(c);
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="table-td">
                          <Link href={`/contratos/${c.id}`} className="text-bt-mid font-semibold hover:underline">
                            {c.numeroId}
                          </Link>
                        </td>
                        <td className="table-td font-medium">{c.produto}</td>
                        <td className="table-td">{c.comprador.nome}</td>
                        <td className="table-td">{c.produtor.nome}</td>
                        <td className="table-td">{formatNumber(c.numSacas, 0)}</td>
                        <td className="table-td">{formatCurrency(c.valorSaca)}</td>
                        <td className="table-td font-medium">{formatCurrency(calc.valorContrato)}</td>
                        <td className="table-td">{formatNumber(calc.sacasRetiradas, 3)}</td>
                        <td className="table-td">{formatCurrency(calc.comissaoProjetada)}</td>
                        <td className="table-td"><ContratoStatusBadge status={c.status} /></td>
                        <td className="table-td text-gray-500">{formatDate(c.dataFechamento)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={LIMIT} onPageChange={setPage} />
      </div>
    </DashboardLayout>
  );
}
