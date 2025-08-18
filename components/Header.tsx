// components/Header.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";

type Role = "ADMIN" | "USER";
type Me = { id: string; name?: string | null; email?: string | null; image?: string | null; role: Role };

export function Header() {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log("[Header] mount, href:", window.location.href);
        console.log("[Header] document.cookie:", document.cookie);

        const url = `/api/me?ts=${Date.now()}`;
        console.log("[Header] GET", url);

        const res = await fetch(url, {
          credentials: "same-origin",
          headers: { "cache-control": "no-store" },
        });

        console.log("[Header] /api/me status:", res.status);
        const text = await res.text();
        console.log("[Header] /api/me raw body:", text);

        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.warn("[Header] /api/me JSON.parse error:", e);
        }

        if (!mounted) return;

        if (res.ok && data?.user) {
          console.log("[Header] /api/me user OK:", data.user);
          setUser(data.user as Me);
        } else {
          // Fallback: consulta la sesión directa al handler de Better Auth
          console.warn("[Header] /api/me no user; probando /api/auth/get-session");
          const s = await fetch("/api/auth/get-session", {
            credentials: "same-origin",
            headers: { "cache-control": "no-store" },
          });
          console.log("[Header] /api/auth/get-session status:", s.status);
          const sText = await s.text();
          console.log("[Header] /api/auth/get-session raw body:", sText);

          let sJson: any = null;
          try {
            sJson = JSON.parse(sText);
          } catch (e) {
            console.warn("[Header] /api/auth/get-session JSON.parse error:", e);
          }

          const sesUserId = sJson?.user?.id as string | undefined;
          console.log("[Header] session userId:", sesUserId);

          if (sesUserId) {
            // Vuelve a llamar a /api/me para traer el rol desde DB
            const res2 = await fetch(`/api/me?ts=${Date.now()}&from=session`, {
              credentials: "same-origin",
              headers: { "cache-control": "no-store" },
            });
            const txt2 = await res2.text();
            console.log("[Header] /api/me (retry) status:", res2.status, "body:", txt2);
            try {
              const js2 = JSON.parse(txt2);
              setUser(js2?.user ?? null);
            } catch {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      } catch (e) {
        console.error("[Header] error en fetch /api/me:", e);
        if (!mounted) return;
        setUser(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const signIn = () => {
    console.log("[Header] signIn clicked");
    authClient.signIn.social({ provider: "github" });
  };
  const signOut = () => {
    console.log("[Header] signOut clicked");
    authClient.signOut().then(() => location.reload());
  };

  async function toggleRole() {
    if (!user) return;
    if (user.role === "ADMIN" && !confirm("Vas a convertir tu rol a USER. ¿Confirmas?")) return;
    setToggling(true);
    try {
      console.log("[Header] toggleRole for user:", user.id, "current:", user.role);
      const res = await fetch(`/api/users/${user.id}/role`, { method: "POST" });
      const raw = await res.text();
      console.log("[Header] toggleRole status:", res.status, "body:", raw);
      const data = JSON.parse(raw);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cambiar el rol");
      setUser((u) => (u ? { ...u, role: data.role as Role } : u));
    } catch (e: any) {
      console.error("[Header] toggleRole error:", e);
      alert(e.message || String(e));
    } finally {
      setToggling(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-slate-900">Finanzas</Link>
          <nav className="hidden md:flex items-center gap-4 text-sm text-slate-600">
            <Link href="/movements" className="hover:text-slate-900">Ingresos & Egresos</Link>
            <Link href="/users" className="hover:text-slate-900">Usuarios (ADMIN)</Link>
            <Link href="/reports" className="hover:text-slate-900">Reportes (ADMIN)</Link>
          </nav>
        </div>

        {loading ? (
          <div className="animate-pulse h-8 w-48 rounded bg-slate-200" />
        ) : user ? (
          <div className="flex items-center gap-3">
            {user.image && <img src={user.image} alt={user.name ?? user.email ?? "user"} className="h-8 w-8 rounded-full border" />}
            <div className="flex flex-col leading-tight">
              <span className="text-sm text-slate-800">{user.name ?? user.email}</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded w-fit ${user.role === "ADMIN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{user.role}</span>
            </div>
            <button
              onClick={toggleRole}
              disabled={toggling}
              className="px-3 py-2 rounded bg-indigo-600 text-white text-sm"
              title={`Cambiar a ${user.role === "ADMIN" ? "USER" : "ADMIN"}`}
            >
              {toggling ? "Cambiando..." : `Hacer ${user.role === "ADMIN" ? "USER" : "ADMIN"}`}
            </button>
            <Link href="/api/movements" className="px-3 py-2 rounded bg-emerald-600 text-white text-sm">Panel</Link>
            <button onClick={signOut} className="px-3 py-2 rounded bg-slate-800 text-white text-sm">Cerrar sesión</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={signIn} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Iniciar sesión</button>
            <button onClick={signIn} className="px-3 py-2 rounded border border-blue-600 text-blue-600 text-sm">Registrarse</button>
          </div>
        )}
      </div>
    </header>
  );
}
