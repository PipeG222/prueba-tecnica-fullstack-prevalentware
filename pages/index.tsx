// pages/index.tsx
import Head from "next/head";
import { Header } from "../components/Header";
import { authClient } from "@/lib/auth/client";

export default function Landing() {
  const startNow = () => authClient.signIn.social({ provider: "github" });

  return (
    <>
      <Head>
        <title>Finanzas – Gestión de ingresos y egresos</title>
        <meta
          name="description"
          content="Sistema fullstack para gestionar movimientos, usuarios y reportes."
        />
      </Head>

      <Header />

      <main className="relative">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-16 grid gap-8 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              Controla tus <span className="text-blue-600">finanzas</span> con claridad
            </h1>
            <p className="text-slate-600 text-lg">
              Registra ingresos y egresos, administra usuarios y descarga reportes.
              Autenticación con GitHub y control de acceso por roles.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startNow}
                className="px-5 py-3 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Empezar ahora
              </button>
              {/* Se elimina "Ver demo" como pediste */}
            </div>

            <ul className="mt-6 grid gap-2 text-sm text-slate-600">
              <li>• Next.js (pages) + TypeScript + Tailwind</li>
              <li>• UI con accesibilidad y semántica</li>
              <li>• RBAC (ADMIN / USER)</li>
              <li>• Reportes (saldo, CSV, gráfico)</li>
              <li>• API documentada con OpenAPI/Swagger</li>
            </ul>
          </div>

          {/* Panel lateral “preview” */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="rounded-xl border bg-slate-50 p-4">
              <div className="flex items-center justify-between pb-2">
                <h3 className="font-semibold">Resumen</h3>
                <span className="text-xs text-slate-500">Demo</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-white p-3">
                  <div className="text-xs text-slate-500">Ingresos</div>
                  <div className="text-lg font-bold text-emerald-700">$12.000</div>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <div className="text-xs text-slate-500">Egresos</div>
                  <div className="text-lg font-bold text-red-700">$4.500</div>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <div className="text-xs text-slate-500">Saldo</div>
                  <div className="text-lg font-bold">$7.500</div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <a href="/reports" className="text-sm text-blue-600 hover:underline">
                  Ver reportes →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Sección features */}
        <section className="bg-white border-t">
          <div className="mx-auto max-w-6xl px-4 py-12 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Gestión de movimientos",
                desc: "CRUD de ingresos y egresos con validación y orden por fecha.",
              },
              {
                title: "Usuarios y roles",
                desc: "ADMIN puede editar usuarios y alternar roles (ADMIN/USER).",
              },
              {
                title: "Reportes y CSV",
                desc: "Saldo actual, gráfico de movimientos y descarga CSV.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border p-5">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-slate-600 mt-2">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-slate-500">
        Hecho con Next.js + TypeScript + Tailwind
      </footer>
    </>
  );
}
