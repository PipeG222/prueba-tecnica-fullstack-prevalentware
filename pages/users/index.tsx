// pages/users/index.tsx
import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header'; // o "@/components/Header" si tienes alias

type Role = 'ADMIN' | 'USER';
type UserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  createdAt?: string;
};

// fetch con cookies de sesión
const authFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init });

// Garantiza JSON (evita tragar HTML de error)
async function asJson(res: Response) {
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!ct.includes('application/json')) {
    throw new Error(`Respuesta no-JSON ${res.status}: ${text.slice(0, 160)}`);
  }
  return JSON.parse(text);
}

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const current = useMemo(
    () => rows.find((r) => r.id === editingId) ?? null,
    [rows, editingId]
  );
  const [form, setForm] = useState<{ name: string; phone: string; role: Role }>(
    { name: '', phone: '', role: 'USER' }
  );
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await authFetch('/api/users');
      const data = await asJson(res);
      if (!res.ok) throw new Error(data?.error ?? 'Error al listar usuarios');
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

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setForm({ name: u.name ?? '', phone: u.phone ?? '', role: u.role });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ name: '', phone: '', role: 'USER' });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setErr(null);
    try {
      // aviso si baja de ADMIN a USER (el backend también valida)
      if (current?.role === 'ADMIN' && form.role === 'USER') {
        const ok = confirm('Vas a convertir un ADMIN en USER. ¿Confirmas?');
        if (!ok) {
          setSaving(false);
          return;
        }
      }
      const res = await authFetch(`/api/users/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || null,
          role: form.role,
        }),
      });
      const data = await asJson(res);
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo guardar');
      setRows((prev) =>
        prev.map((r) => (r.id === editingId ? { ...r, ...data } : r))
      );
      cancelEdit();
    } catch (e: any) {
      alert(e.message || String(e));
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleRole(u: UserRow) {
    try {
      const next = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
      if (u.role === 'ADMIN' && next === 'USER') {
        const ok = confirm('Vas a convertir un ADMIN en USER. ¿Confirmas?');
        if (!ok) return;
      }
      const res = await authFetch(`/api/users/${u.id}/role`, {
        method: 'POST',
      });
      const data = await asJson(res);
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo cambiar el rol');
      setRows((prev) =>
        prev.map((r) => (r.id === u.id ? { ...r, role: data.role as Role } : r))
      );
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  return (
    <>
      <Header />
      <main className='p-6 space-y-6'>
        <header className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>Usuarios (ADMIN)</h1>
          <button
            onClick={load}
            className='px-3 py-2 rounded bg-slate-800 text-white text-sm'
            disabled={loading}
          >
            {loading ? 'Actualizando...' : 'Refrescar'}
          </button>
        </header>

        {err && (
          <div className='rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm'>
            {err}
          </div>
        )}

        {/* Tabla */}
        <div className='overflow-x-auto'>
          <table className='w-full border text-sm'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='p-2 border text-left'>Nombre</th>
                <th className='p-2 border text-left'>Correo</th>
                <th className='p-2 border text-left'>Teléfono</th>
                <th className='p-2 border text-left'>Rol</th>
                <th className='p-2 border'>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className='odd:bg-white even:bg-gray-50'>
                  <td className='p-2 border'>{u.name}</td>
                  <td className='p-2 border'>{u.email}</td>
                  <td className='p-2 border'>{u.phone ?? '-'}</td>
                  <td className='p-2 border'>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                        u.role === 'ADMIN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className='p-2 border'>
                    <div className='flex items-center gap-2 justify-center'>
                      <button
                        onClick={() => startEdit(u)}
                        className='px-2 py-1 rounded bg-blue-600 text-white text-xs'
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleRole(u)}
                        className='px-2 py-1 rounded bg-indigo-600 text-white text-xs'
                        title={`Cambiar a ${u.role === 'ADMIN' ? 'USER' : 'ADMIN'}`}
                      >
                        {u.role === 'ADMIN' ? 'Hacer USER' : 'Hacer ADMIN'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className='p-4 text-center text-slate-500'>
                    Sin usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Panel de edición */}
        {editingId && current && (
          <section className='rounded border p-4 max-w-xl space-y-3'>
            <h2 className='font-semibold'>Editar usuario</h2>
            <form onSubmit={saveEdit} className='space-y-3'>
              <div className='grid grid-cols-3 gap-3 items-center'>
                <label className='text-sm text-slate-600'>Nombre</label>
                <input
                  className='col-span-2 border rounded px-2 py-1'
                  value={form.name}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className='grid grid-cols-3 gap-3 items-center'>
                <label className='text-sm text-slate-600'>Teléfono</label>
                <input
                  className='col-span-2 border rounded px-2 py-1'
                  value={form.phone}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, phone: e.target.value }))
                  }
                  placeholder='Opcional'
                />
              </div>
              <div className='grid grid-cols-3 gap-3 items-center'>
                <label className='text-sm text-slate-600'>Rol</label>
                <select
                  className='col-span-2 border rounded px-2 py-1'
                  value={form.role}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, role: e.target.value as Role }))
                  }
                >
                  <option value='ADMIN'>ADMIN</option>
                  <option value='USER'>USER</option>
                </select>
              </div>

              <div className='flex gap-2 pt-2'>
                <button
                  type='submit'
                  disabled={saving}
                  className='px-3 py-2 rounded bg-emerald-600 text-white text-sm'
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  type='button'
                  onClick={cancelEdit}
                  className='px-3 py-2 rounded bg-slate-200 text-slate-900 text-sm'
                >
                  Cancelar
                </button>
              </div>
            </form>
            <p className='text-xs text-slate-500'>
              * Si cambias un ADMIN a USER y es el último admin, el servidor lo
              bloqueará.
            </p>
          </section>
        )}
      </main>
    </>
  );
}
