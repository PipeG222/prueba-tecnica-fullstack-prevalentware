// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import '@/styles/globals.css';

const App = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  const guardOnce = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await originalFetch(input, {
        credentials: init?.credentials ?? 'include', // asegura cookies de sesión
        ...init,
      });

      try {
        let url = '';
        if (typeof input === 'string') url = input;
        else if (input instanceof Request) url = input.url;
        else if (input instanceof URL) url = input.pathname;

        const isApi = url.startsWith('/api/') || url.includes('/api/');

        if (isApi && (res.status === 401 || res.status === 403)) {
          if (!guardOnce.current) {
            guardOnce.current = true;
            const msg =
              res.status === 401
                ? 'Tu sesión no es válida o expiró. Inicia sesión nuevamente.'
                : 'No tienes permisos para esta acción.';
            alert(msg);
            router.push('/');
            setTimeout(() => {
              guardOnce.current = false;
            }, 1500);
          }
        }
      } catch {
        // no-op
      }

      return res;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  return <Component {...pageProps} />;
};

export default App;
