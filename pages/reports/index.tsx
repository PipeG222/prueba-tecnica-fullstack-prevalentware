// pages/reports/index.tsx
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type Summary = {
  income: number;
  expense: number;
  balance: number;
  series: { month: string; income: number; expense: number; balance: number }[];
};

const authFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', cache: 'no-store', ...init });

export default function ReportsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch('/api/reports/summary');
      const js = await res.json();
      if (!res.ok) throw new Error(js?.error ?? 'Error cargando reporte');
      setData(js);
    } catch (e) {
      alert((e as any).message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function downloadCsv() {
    const res = await authFetch('/api/reports/csv');
    if (!res.ok) return alert('Error CSV');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'movements.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />
      <main className="p-6 space-y-6">
        {/* Header responsive */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Reportes (ADMIN)</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadCsv}
              className="px-3 py-2 rounded bg-emerald-600 text-white text-sm"
            >
              Descargar CSV
            </button>
            <button
              onClick={load}
              className="px-3 py-2 rounded bg-slate-800 text-white text-sm disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Refrescar'}
            </button>
          </div>
        </header>

        {data && (
          <>
            {/* Cards responsive */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded border p-4 bg-white">
                <div className="text-sm text-slate-500">Ingresos</div>
                <div className="text-xl font-semibold">
                  {data.income.toLocaleString('es-CO')}
                </div>
              </div>
              <div className="rounded border p-4 bg-white">
                <div className="text-sm text-slate-500">Egresos</div>
                <div className="text-xl font-semibold">
                  {data.expense.toLocaleString('es-CO')}
                </div>
              </div>
              <div className="rounded border p-4 bg-white">
                <div className="text-sm text-slate-500">Saldo</div>
                <div
                  className={`text-xl font-semibold ${
                    data.balance >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {data.balance.toLocaleString('es-CO')}
                </div>
              </div>
            </section>

            {/* Gráfico responsive + colores distintos */}
            <section className="rounded border p-4 bg-white">
              <h2 className="font-semibold mb-4">Evolución mensual</h2>
              <div className="w-full h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.series} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Ingresos"
                      stroke="#10b981" // emerald-500
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      name="Egresos"
                      stroke="#ef4444" // red-500
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      name="Saldo"
                      stroke="#3b82f6" // blue-500
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
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
