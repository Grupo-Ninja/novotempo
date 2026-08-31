"use client";
import DashboardLayout from "../dashboard-layout";
import PageHeader from "@/components/PageHeader";
import Pagination from "@/components/Pagination";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

const LIMIT = 20;

interface Motorista {
  id: string; nome: string; cpfCnpj?: string; telefone?: string;
  placaCavalo?: string; placasAdicionais?: string[];
}

const emptyForm = () => ({ nome: "", cpfCnpj: "", telefone: "", placaCavalo: "", placasAdicionais: [] as string[] });

export default function MotoristasPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const [items, setItems] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Motorista | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load(p = page) {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", String(p));
    params.set("limit", String(LIMIT));
    try {
      const res = await apiFetch(`/motoristas?${params}`);
      const d = await res.json();
      setItems(Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []));
      if (d.meta) setMeta({ total: d.meta.total, totalPages: d.meta.totalPages });
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { load(page); }, [search, page]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setError("");
    setShowModal(true);
  }

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("novo") === "1" && isAdmin) {
      openNew();
    }
  }, [isAdmin]);

  function openEdit(m: Motorista) {
    setEditing(m);
    setForm({
      nome: m.nome,
      cpfCnpj: m.cpfCnpj || "",
      telefone: m.telefone || "",
      placaCavalo: m.placaCavalo || "",
      placasAdicionais: m.placasAdicionais ? [...m.placasAdicionais] : [],
    });
    setError("");
    setShowModal(true);
  }

  function setField(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function addPlaca() {
    setForm((f) => ({ ...f, placasAdicionais: [...f.placasAdicionais, ""] }));
  }

  function updatePlaca(idx: number, val: string) {
    setForm((f) => {
      const updated = [...f.placasAdicionais];
      updated[idx] = val;
      return { ...f, placasAdicionais: updated };
    });
  }

  function removePlaca(idx: number) {
    setForm((f) => ({ ...f, placasAdicionais: f.placasAdicionais.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.nome.trim()) { setError("Nome é obrigatório."); return; }
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/motoristas/${editing.id}` : "/motoristas";
      const method = editing ? "PUT" : "POST";
      const payload = {
        ...form,
        placasAdicionais: form.placasAdicionais.filter((p) => p.trim() !== ""),
      };
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (res.ok) {
        setShowModal(false);
        load();
      } else {
        setError(d.error || "Erro ao salvar.");
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir o motorista "${nome}"?`)) return;
    await apiFetch(`/motoristas/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Motoristas"
        subtitle={`${meta.total} cadastrados`}
      />
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <button onClick={openNew} className="btn-primary">+ Novo Motorista</button>
        </div>
      )}

      <div className="card">
        <div className="mb-4">
          <input
            className="input w-72"
            placeholder="Buscar por nome ou placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin w-6 h-6 border-4 border-bt-mid border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead><tr className="border-b border-gray-100">
                <th className="table-th">Nome</th>
                <th className="table-th">CPF/CNPJ</th>
                <th className="table-th">Telefone</th>
                <th className="table-th">Placa Cavalo</th>
                <th className="table-th">Placas Adicionais</th>
                {isAdmin && <th className="table-th">Ações</th>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="table-td text-center text-gray-400 py-10">Nenhum motorista cadastrado</td></tr>
                ) : items.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{m.nome}</td>
                    <td className="table-td text-gray-600">{m.cpfCnpj || "-"}</td>
                    <td className="table-td">{m.telefone || "-"}</td>
                    <td className="table-td font-mono text-sm">{m.placaCavalo || "-"}</td>
                    <td className="table-td text-sm text-gray-600">
                      {m.placasAdicionais && m.placasAdicionais.length > 0
                        ? m.placasAdicionais.join(", ")
                        : "-"}
                    </td>
                    {isAdmin && (
                      <td className="table-td">
                        <div className="flex gap-3">
                          <button onClick={() => openEdit(m)} className="text-bt-mid text-xs hover:underline">Editar</button>
                          <button onClick={() => handleDelete(m.id, m.nome)} className="text-red-500 text-xs hover:underline">Excluir</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={LIMIT} onPageChange={setPage} />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold">{editing ? "Editar" : "Novo"} Motorista</h3>
              <button onClick={() => setShowModal(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Nome *</label>
                <input className="input" value={form.nome} onChange={(e) => setField("nome", e.target.value)} placeholder="Nome completo" />
              </div>
              <div>
                <label className="label">CPF/CNPJ</label>
                <input className="input" value={form.cpfCnpj} onChange={(e) => setField("cpfCnpj", e.target.value)} />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="input" value={form.telefone} onChange={(e) => setField("telefone", e.target.value)} />
              </div>

              {/* Placa Cavalo */}
              <div>
                <label className="label">Placa Cavalo</label>
                <input
                  className="input font-mono uppercase"
                  value={form.placaCavalo}
                  onChange={(e) => setField("placaCavalo", e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                />
              </div>

              {/* Placas Adicionais */}
              <div>
                <label className="label">Placas Adicionais</label>
                <div className="space-y-2">
                  {form.placasAdicionais.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-xs text-gray-400 w-14 flex-shrink-0">Placa {i + 1}</span>
                      <input
                        className="input flex-1 font-mono uppercase"
                        value={p}
                        placeholder="ABC-1234"
                        onChange={(e) => updatePlaca(i, e.target.value.toUpperCase())}
                      />
                      <button
                        type="button"
                        onClick={() => removePlaca(i)}
                        className="text-red-400 hover:text-red-600 text-sm flex-shrink-0 px-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPlaca}
                    className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Adicionar placa
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
