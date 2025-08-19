// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useRef, useEffect } from 'react';
import '@/styles/globals.css';

let installed = false;

// Solo en cliente
if (typeof window !== 'undefined' && !installed) {
  installed = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const mergedInit: RequestInit = { ...init, credentials: init?.credentials ?? 'include' };
    const res = await originalFetch(input as any, mergedInit);

    try {
      const urlStr =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.href
          : input instanceof Request
          ? input.url
          : '';

      const isApi = urlStr.includes('/api/');
      if (isApi && (res.status === 401 || res.status === 403)) {
        const evt = new CustomEvent('api-auth-error', { detail: { status: res.status, url: urlStr } });
        window.dispatchEvent(evt);
      }
    } catch {
      // no-op
    }

    return res;
  };
}

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const guardOnce = useRef(false);

  useEffect(() => {
    const onAuthError = (e: Event) => {
      if (guardOnce.current) return;
      guardOnce.current = true;

      const detail = (e as CustomEvent).detail as { status: number; url: string };
      alert(detail.status === 401
        ? 'Tu sesión no es válida o expiró. Inicia sesión nuevamente.'
        : 'No tienes permisos para esta acción.'
      );
      router.push('/');

      setTimeout(() => (guardOnce.current = false), 1500);
    };

    window.addEventListener('api-auth-error', onAuthError);
    return () => window.removeEventListener('api-auth-error', onAuthError);
  }, [router]);

  return <Component {...pageProps} />;
}

export default App; 
