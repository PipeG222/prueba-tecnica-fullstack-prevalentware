// pages/movements/index.tsx
import { useEffect, useMemo, useState } from "react";
import { Header } from "../../components/Header"; // si tienes alias: import { Header } from "@/components/Header";

type Movement = {
  id: string;
  type: "INCOME" | "EXPENSE";
  concept: string;
  amount: number;
  date: string;
  user?: { name?: string | null; email?: string | null } | null;
};

// Helper: fetch autenticado (envía cookies de sesión)
const authFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: "include", ...init });

// Helper: asegura JSON (evita tragar HTML de error)
async function asJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!ct.includes("application/json")) {
    throw new Error(`Respuesta no-JSON ${res.status}: ${text.slice(0, 160)}`);
  }
  return JSON.parse(text);
}

// Helper: fecha para <input type="date"> sin desfase por timezone
function toLocalInputDate(iso: string) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export default function MovementsPage() {
  const [rows, setRows] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Form creación
  const [newMv, setNewMv] = useState<{ type: "INCOME" | "EXPENSE"; concept: string; amount: number; date: string }>({
    type: "INCOME",
    concept: "",
    amount: 0,
    date: "",
  });
  const [creating, setCreating] = useState(false);

  // Edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(() => rows.find((r) => r.id === editingId) ?? null, [rows, editingId]);
  const [editForm, setEditForm] = useState<{ type: "INCOME" | "EXPENSE"; concept: string; amount: number; date: string }>({
    type: "INCOME",
    concept: "",
    amount: 0,
    date: "",
  });
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // KPIs
  const income = useMemo(() => rows.filter((r) => r.type === "INCOME").reduce((a, b) => a + Number(b.amount), 0), [rows]);
  const expense = useMemo(() => rows.filter((r) => r.type === "EXPENSE").reduce((a, b) => a + Number(b.amount), 0), [rows]);
  const balance = useMemo(() => income - expense, [income, expense]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await authFetch("/api/movements");
      const data = await asJson(res);
      if (!res.ok) throw new Error(data?.error ?? "Error cargando movimientos");
      setRows(data);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createMovement(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr(null);
    try {
      const res = await authFetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newMv.type,
          concept: newMv.concept,
          amount: Number(newMv.amount),
          date: newMv.date, // "YYYY-MM-DD"
        }),
      });
      const data = await asJson(res);
      if (!res.ok) throw new Error(data?.error ?? (res.status === 403 ? "No autorizado (solo ADMIN)" : "Error creando"));
      setNewMv({ type: "INCOME", concept: "", amount: 0, date: "" });
      load();
    } catch (e: any) {
      alert(e.message || String(e));
      setErr(e.message || String(e));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(m: Movement) {
    setEditingId(m.id);
    setEditForm({
      type: m.type,
      concept: m.concept,
      amount: Number(m.amount),
      date: m.date ? toLocalInputDate(m.date) : "",
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditForm({ type: "INCOME", concept: "", amount: 0, date: "" });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/movements/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editForm.type,
          concept: editForm.concept,
          amount: Number(editForm.amount),
          date: editForm.date, // "YYYY-MM-DD"
        }),
      });
      const data = await asJson(res);
      if (!res.ok) throw new Error(data?.error ?? (res.status === 403 ? "No autorizado (solo ADMIN)" : "Error guardando"));
      setRows((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...data } : r)));
      cancelEdit();
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este movimiento?")) return;
    setRemovingId(id);
    try {
      const res = await authFetch(`/api/movements/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || (res.status === 403 ? "No autorizado (solo ADMIN)" : "Error eliminando"));
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setRemovingId(null);
    }
  }

  async function downloadCsv() {
    try {
      const res = await authFetch(`/api/reports/csv`);
      if (!res.ok) throw new Error(`Error CSV (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "movements.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  return (
    <>
      <Header />
      <main className="p-6 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">Ingresos y Gastos</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadCsv}
              className="px-3 py-2 rounded bg-emerald-600 text-white text-sm"
              title="Descargar reporte CSV"
            >
              Descargar CSV
            </button>
            <button
              type="button"
              onClick={load}
              className="px-3 py-2 rounded bg-slate-800 text-white text-sm"
              disabled={loading}
            >
              {loading ? "Actualizando..." : "Refrescar"}
            </button>
          </div>
        </header>

        {/* KPIs */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded border p-4 bg-white">
            <div className="text-sm text-slate-500">Ingresos</div>
            <div className="text-xl font-semibold">{income.toLocaleString()}</div>
          </div>
          <div className="rounded border p-4 bg-white">
            <div className="text-sm text-slate-500">Egresos</div>
            <div className="text-xl font-semibold">{expense.toLocaleString()}</div>
          </div>
          <div className="rounded border p-4 bg-white">
            <div className="text-sm text-slate-500">Saldo</div>
            <div className={`text-xl font-semibold ${balance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {balance.toLocaleString()}
            </div>
          </div>
        </section>

        {/* Form de creación (solo Admin en backend; el server valida) */}
        <section className="rounded border p-4 bg-white space-y-3">
          <h2 className="font-semibold">Nuevo movimiento (ADMIN)</h2>
          <form onSubmit={createMovement} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              className="border rounded px-2 py-2"
              value={newMv.type}
              onChange={(e) => setNewMv((s) => ({ ...s, type: e.target.value as "INCOME" | "EXPENSE" }))}
            >
              <option value="INCOME">Ingreso</option>
              <option value="EXPENSE">Egreso</option>
            </select>
            <input
              className="border rounded px-2 py-2"
              placeholder="Concepto"
              value={newMv.concept}
              onChange={(e) => setNewMv((s) => ({ ...s, concept: e.target.value }))}
              required
            />
            <input
              className="border rounded px-2 py-2"
              placeholder="Monto"
              type="number"
              step="0.01"
              value={newMv.amount}
              onChange={(e) => setNewMv((s) => ({ ...s, amount: Number(e.target.value) }))}
              required
            />
            <input
              className="border rounded px-2 py-2"
              placeholder="Fecha"
              type="date"
              value={newMv.date}
              onChange={(e) => setNewMv((s) => ({ ...s, date: e.target.value }))}
              required
            />
            <button className="px-3 py-2 rounded bg-blue-600 text-white" disabled={creating} type="submit">
              {creating ? "Creando..." : "Crear"}
            </button>
          </form>
        </section>

        {/* Tabla */}
        {err && <div className="rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border">Concepto</th>
                <th className="p-2 border">Tipo</th>
                <th className="p-2 border">Monto</th>
                <th className="p-2 border">Fecha</th>
                <th className="p-2 border">Usuario</th>
                <th className="p-2 border">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border">
                    {editingId === m.id ? (
                      <input
                        className="border rounded px-2 py-1 w-full"
                        value={editForm.concept}
                        onChange={(e) => setEditForm((s) => ({ ...s, concept: e.target.value }))}
                      />
                    ) : (
                      m.concept
                    )}
                  </td>
                  <td className="p-2 border">
                    {editingId === m.id ? (
                      <select
                        className="border rounded px-2 py-1"
                        value={editForm.type}
                        onChange={(e) => setEditForm((s) => ({ ...s, type: e.target.value as "INCOME" | "EXPENSE" }))}
                      >
                        <option value="INCOME">Ingreso</option>
                        <option value="EXPENSE">Egreso</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                          m.type === "INCOME" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {m.type}
                      </span>
                    )}
                  </td>
                  <td className="p-2 border">
                    {editingId === m.id ? (
                      <input
                        className="border rounded px-2 py-1 w-32"
                        type="number"
                        step="0.01"
                        value={editForm.amount}
                        onChange={(e) => setEditForm((s) => ({ ...s, amount: Number(e.target.value) }))}
                      />
                    ) : (
                      Number(m.amount).toLocaleString()
                    )}
                  </td>
                  <td className="p-2 border">
                    {editingId === m.id ? (
                      <input
                        className="border rounded px-2 py-1"
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm((s) => ({ ...s, date: e.target.value }))}
                      />
                    ) : (
                      new Date(m.date).toLocaleDateString()
                    )}
                  </td>
                  <td className="p-2 border">{m.user?.name ?? m.user?.email ?? "-"}</td>
                  <td className="p-2 border">
                    {editingId === m.id ? (
                      <div className="flex gap-2 justify-center">
                        <button onClick={saveEdit} disabled={saving} className="px-2 py-1 rounded bg-emerald-600 text-white text-xs">
                          {saving ? "Guardando..." : "Guardar"}
                        </button>
                        <button onClick={cancelEdit} className="px-2 py-1 rounded bg-slate-200 text-slate-900 text-xs">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => startEdit(m)} className="px-2 py-1 rounded bg-blue-600 text-white text-xs">
                          Editar
                        </button>
                        <button
                          onClick={() => remove(m.id)}
                          disabled={removingId === m.id}
                          className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                        >
                          {removingId === m.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">
                    Sin movimientos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
