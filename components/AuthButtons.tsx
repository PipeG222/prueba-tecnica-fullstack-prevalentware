import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: 'ADMIN' | 'USER';
};

export function AuthButtons() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/api/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted) return;
        setUser((data?.user as SessionUser) ?? null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className='animate-pulse h-8 w-40 rounded bg-slate-200' />;
  }

  if (user) {
    return (
      <div className='flex items-center gap-3'>
        {user.image && (
          <img
            src={user.image}
            alt={user.name ?? user.email ?? 'user'}
            className='h-8 w-8 rounded-full border'
          />
        )}
        <span className='text-sm text-slate-700'>
          {user.name ?? user.email}
        </span>
        <Link
          href='/movements'
          className='px-3 py-2 rounded bg-emerald-600 text-white text-sm'
        >
          Ir al panel
        </Link>
        <button
          onClick={() => authClient.signOut().then(() => location.reload())}
          className='px-3 py-2 rounded bg-slate-800 text-white text-sm'
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2'>
      <button
        onClick={() => authClient.signIn.social({ provider: 'github' })}
        className='px-3 py-2 rounded bg-blue-600 text-white text-sm'
      >
        Iniciar sesión
      </button>
      <button
        onClick={() => authClient.signIn.social({ provider: 'github' })}
        className='px-3 py-2 rounded border border-blue-600 text-blue-600 text-sm'
      >
        Registrarse
      </button>
    </div>
  );
}
