"use client";
import DashboardLayout from "./dashboard-layout";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatCurrency, formatNumber, getContratoDisplayNumber } from "@/lib/utils";
import { ContratoStatusBadge } from "@/components/StatusBadge";

interface DashboardData {
  totalContratos: number;
  emAndamento: number;
  concluidos: number;
  naoIniciados: number;
  totalValorContratos: number;
  totalComissaoProjetada: number;
  totalComissaoRecebida: number;
  totalComissaoAReceber: number;
  totalRecebidoCarga: number;
  totalAReceberCarga: number;
  totalSacas: number;
  totalCarregamentos: number;
  contratosRecentes: {
    id: string;
    numeroId: string;
    displayNumber?: string | null;
    status: string;
    produto: string;
    comprador: string;
    produtor: string;
    valorContrato: number;
    numSacas: number;
  }[];
}

function StatCard({
  label, value, sub, delay = "",
  iconBg, icon,
}: {
  label: string; value: string; sub?: string; delay?: string;
  iconBg: string; icon: React.ReactNode;
}) {
  return (
    <div className={`stat-card animate-fade-up ${delay}`}>
      <div className={`stat-icon ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-xs font-semibold text-ink-4 tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-ink mt-0.5 tracking-tight">{value}</p>
        {sub && <p className="text-xs text-ink-4 mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

import { apiFetch } from "@/lib/api";

export default function HomePage() {
  const { status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    apiFetch("/dashboard")
      .then((r) => { if (!r.ok) throw new Error("unauthorized"); return r.json(); })
      .then((d) => { if (d?.contratosRecentes) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status]);


  return (
    <DashboardLayout>

      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <p className="text-xs font-bold text-ink-4 uppercase tracking-widest mb-1">Visão Geral</p>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Dashboard</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-6">

          {/* Status cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total de Contratos" value={String(data.totalContratos)}
              delay="delay-1"
              iconBg="bg-brand-50" icon={
                <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <StatCard
              label="Em Andamento" value={String(data.emAndamento)}
              delay="delay-2"
              iconBg="bg-blue-50" icon={
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <StatCard
              label="Concluídos" value={String(data.concluidos)}
              delay="delay-3"
              iconBg="bg-emerald-50" icon={
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Não Iniciados" value={String(data.naoIniciados)}
              delay="delay-4"
              iconBg="bg-surface-3" icon={
                <svg className="w-5 h-5 text-ink-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Financial cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <StatCard
              label="Valor Total" value={formatCurrency(data.totalValorContratos)}
              sub={`${formatNumber(data.totalSacas, 0)} sacas · ${data.totalCarregamentos} carregamentos`}
              delay="delay-2"
              iconBg="bg-brand-50" icon={
                <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Comissão Projetada" value={formatCurrency(data.totalComissaoProjetada)}
              sub={`Recebida: ${formatCurrency(data.totalComissaoRecebida)}`}
              delay="delay-3"
              iconBg="bg-blue-50" icon={
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
            <StatCard
              label="A Receber" value={formatCurrency(data.totalComissaoAReceber)}
              sub={`Carga pendente: ${formatCurrency(data.totalAReceberCarga)}`}
              delay="delay-4"
              iconBg="bg-amber-50" icon={
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
          </div>

          {/* Recent contracts table */}
          <div className="card animate-fade-up delay-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-ink tracking-tight">Contratos Recentes</h2>
                <p className="text-xs text-ink-4 mt-0.5 font-medium">{data.contratosRecentes.length} registros</p>
              </div>
              <Link
                href="/contratos"
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                Ver todos
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {data.contratosRecentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-ink-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-ink-3">Nenhum contrato ainda</p>
                <p className="text-xs text-ink-4 mt-1">Crie o primeiro contrato para começar</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--tw-shadow-color, #EBEBED)" }}
                        className="border-b border-surface-3">
                      <th className="table-th pl-6">ID</th>
                      <th className="table-th">Produto</th>
                      <th className="table-th hidden md:table-cell">Comprador</th>
                      <th className="table-th hidden lg:table-cell">Produtor</th>
                      <th className="table-th">Valor</th>
                      <th className="table-th pr-6">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.contratosRecentes.map((c, i) => (
                      <tr key={c.id} className={`table-row animate-fade-up`} style={{ animationDelay: `${i * 0.04}s` }}>
                        <td className="table-td pl-6">
                          <Link href={`/contratos/${c.id}`}
                            className="font-semibold text-brand-600 hover:text-brand-700 transition-colors text-xs">
                            {getContratoDisplayNumber(c)}
                          </Link>
                        </td>
                        <td className="table-td font-semibold text-ink">{c.produto}</td>
                        <td className="table-td hidden md:table-cell text-ink-3">{c.comprador}</td>
                        <td className="table-td hidden lg:table-cell text-ink-3">{c.produtor}</td>
                        <td className="table-td font-semibold text-ink">{formatCurrency(c.valorContrato)}</td>
                        <td className="table-td pr-6">
                          <ContratoStatusBadge status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
