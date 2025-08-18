// pages/_app.tsx
import type { AppProps } from "next/app";
import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const guardOnce = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await originalFetch(input, {
        credentials: "include",         // asegura cookies de sesión
        ...init,
      });

      try {
        // Detecta llamadas a tu API
        const url = typeof input === "string" ? input : (input as Request).url;
        const isApi = url.startsWith("/api/") || url.includes("/api/");

        if (isApi && (res.status === 401 || res.status === 403)) {
          // evita disparar muchos alerts/redirects si hay varias llamadas en paralelo
          if (!guardOnce.current) {
            guardOnce.current = true;
            const msg = res.status === 401
              ? "Tu sesión no es válida o expiró. Inicia sesión nuevamente."
              : "No tienes permisos para esta acción.";
            // Muestra aviso
            alert(msg);
            // Redirige al Home (o a / si prefieres)
            router.push("/");
            // suelta el bloqueo tras un breve tiempo para no bloquear futuros avisos
            setTimeout(() => { guardOnce.current = false; }, 1500);
          }
        }
      } catch {
        // no-op
      }

      return res;
    };

    return () => { window.fetch = originalFetch; };
  }, [router]);

  return <Component {...pageProps} />;
}
