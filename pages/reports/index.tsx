// pages/reports/index.tsx
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

type Summary = {
  income: number;
  expense: number;
  balance: number;
  series: { month: string; income: number; expense: number; balance: number }[];
};

const authFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: "include", cache: "no-store", ...init });

export default function ReportsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch("/api/reports/summary");
      const js = await res.json();
      if (!res.ok) throw new Error(js?.error ?? "Error cargando reporte");
      setData(js);
    } catch (e) {
      alert((e as any).message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function downloadCsv() {
    const res = await authFetch("/api/reports/csv");
    if (!res.ok) return alert("Error CSV");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "movements.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Reportes (ADMIN)</h1>
          <div className="flex gap-2">
            <button onClick={downloadCsv} className="px-3 py-2 rounded bg-emerald-600 text-white text-sm">Descargar CSV</button>
            <button onClick={load} className="px-3 py-2 rounded bg-slate-800 text-white text-sm" disabled={loading}>{loading ? "Actualizando..." : "Refrescar"}</button>
          </div>
        </header>

        {data && (
          <>
            <section className="grid grid-cols-3 gap-3">
              <div className="rounded border p-4 bg-white">
                <div className="text-sm text-slate-500">Ingresos</div>
                <div className="text-xl font-semibold">{data.income.toLocaleString()}</div>
              </div>
              <div className="rounded border p-4 bg-white">
                <div className="text-sm text-slate-500">Egresos</div>
                <div className="text-xl font-semibold">{data.expense.toLocaleString()}</div>
              </div>
              <div className="rounded border p-4 bg-white">
                <div className="text-sm text-slate-500">Saldo</div>
                <div className={`text-xl font-semibold ${data.balance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {data.balance.toLocaleString()}
                </div>
              </div>
            </section>

            <section className="rounded border p-4 bg-white">
              <h2 className="font-semibold mb-4">Evolución mensual</h2>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={data.series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="income" />
                    <Line type="monotone" dataKey="expense" />
                    <Line type="monotone" dataKey="balance" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
