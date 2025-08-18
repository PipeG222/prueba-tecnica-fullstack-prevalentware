// components/Header.tsx
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth/client';

type Role = 'ADMIN' | 'USER';
type Me = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: Role;
};

// Respuesta esperada de /api/me
type MeApiResponse = {
  user?: Me | null;
};

// Respuesta esperada de /api/auth/get-session
type SessionResponse = {
  user?: { id?: string } | null;
};

// Respuesta esperada de /api/users/[id]/role
type ToggleRoleResponse = {
  role?: Role;
  error?: string;
};

export function Header() {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch(`/api/me?ts=${Date.now()}`, {
          credentials: 'same-origin',
          headers: { 'cache-control': 'no-store' },
        });

        const txt = await res.text();
        let data: MeApiResponse | null = null;
        try {
          data = JSON.parse(txt) as MeApiResponse;
        } catch {
          data = null;
        }

        if (!mounted) return;

        if (res.ok && data?.user) {
          setUser(data.user);
        } else {
          // Fallback: leer sesión cruda
          const s = await fetch('/api/auth/get-session', {
            credentials: 'same-origin',
            headers: { 'cache-control': 'no-store' },
          });
          const sTxt = await s.text();

          let sJson: SessionResponse | null = null;
          try {
            sJson = JSON.parse(sTxt) as SessionResponse;
          } catch {
            sJson = null;
          }

          const sesUserId = sJson?.user?.id;

          if (sesUserId) {
            const res2 = await fetch(`/api/me?ts=${Date.now()}&from=session`, {
              credentials: 'same-origin',
              headers: { 'cache-control': 'no-store' },
            });
            const txt2 = await res2.text();
            try {
              const js2 = JSON.parse(txt2) as MeApiResponse;
              setUser(js2?.user ?? null);
            } catch {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      } catch {
        if (!mounted) return;
        setUser(null);
      } finally {
        // No usamos "return" dentro de finally para evitar no-unsafe-finally
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const isAdmin = user?.role === 'ADMIN';

  const signIn = () => authClient.signIn.social({ provider: 'github' });
  const signOut = () => authClient.signOut().then(() => location.reload());

  async function toggleRole() {
    if (!user) return;

    if (
      user.role === 'ADMIN' &&
      !confirm('Vas a convertir tu rol a USER. ¿Confirmas?')
    ) {
      return;
    }

    setToggling(true);
    try {
      const res = await fetch(`/api/users/${user.id}/role`, { method: 'POST' });
      const raw = await res.text();

      let payload: ToggleRoleResponse | null = null;
      try {
        payload = JSON.parse(raw) as ToggleRoleResponse;
      } catch {
        payload = null;
      }

      if (!res.ok) {
        if (res.status === 403) {
          alert('No tienes permisos para cambiar el rol (se requiere ADMIN).');
        } else if (res.status === 409) {
          alert(
            payload?.error ??
              'No puedes dejar la organización sin administradores.'
          );
        } else {
          alert(payload?.error ?? `Error cambiando rol (${res.status})`);
        }
        return;
      }

      if (payload?.role) {
        setUser((u) => (u ? { ...u, role: payload!.role! } : u));
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert(message);
    } finally {
      setToggling(false);
    }
  }

  return (
    <header className='sticky top-0 z-40 w-full border-b bg-white/70 backdrop-blur'>
      <div className='mx-auto max-w-6xl px-4 h-16 flex items-center justify-between'>
        <div className='flex items-center gap-6'>
          <Link href='/' className='font-bold text-slate-900'>
            Finanzas
          </Link>
          <nav className='hidden md:flex items-center gap-4 text-sm text-slate-600'>
            <Link href='/movements' className='hover:text-slate-900'>
              Ingresos & Egresos
            </Link>
            {isAdmin && (
              <Link href='/users' className='hover:text-slate-900'>
                Usuarios (ADMIN)
              </Link>
            )}
            {isAdmin && (
              <Link href='/reports' className='hover:text-slate-900'>
                Reportes (ADMIN)
              </Link>
            )}
          </nav>
        </div>

        {loading ? (
          <div className='animate-pulse h-8 w-48 rounded bg-slate-200' />
        ) : user ? (
          <div className='flex items-center gap-3'>
            {user.image && (
              <img
                src={user.image}
                alt={user.name ?? user.email ?? 'user'}
                className='h-8 w-8 rounded-full border'
              />
            )}
            <div className='flex flex-col leading-tight'>
              <span className='text-sm text-slate-800'>
                {user.name ?? user.email}
              </span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded w-fit ${
                  isAdmin
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {user.role}
              </span>
            </div>

            {/* 🔒 Siempre visible para usuarios logueados */}
            <button
              onClick={toggleRole}
              disabled={toggling}
              className='px-3 py-2 rounded bg-indigo-600 text-white text-sm'
              title={`Cambiar a ${user.role === 'ADMIN' ? 'USER' : 'ADMIN'}`}
            >
              {toggling
                ? 'Cambiando...'
                : `Hacer ${user.role === 'ADMIN' ? 'USER' : 'ADMIN'}`}
            </button>

            <Link
              href='/movements'
              className='px-3 py-2 rounded bg-emerald-600 text-white text-sm'
            >
              Panel
            </Link>
            <button
              onClick={signOut}
              className='px-3 py-2 rounded bg-slate-800 text-white text-sm'
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <div className='flex items-center gap-2'>
            <button
              onClick={signIn}
              className='px-3 py-2 rounded bg-blue-600 text-white text-sm'
            >
              Iniciar sesión
            </button>
            <button
              onClick={signIn}
              className='px-3 py-2 rounded border border-blue-600 text-blue-600 text-sm'
            >
              Registrarse
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
