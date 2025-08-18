// pages/api/me.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

type GetSessionResponse =
  | {
      user?: { id?: string | null } | null;
    }
  | null;

type MeApiResponse = {
  user:
    | {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
        role: 'ADMIN' | 'USER';
      }
    | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MeApiResponse>
) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    // Usa el mismo origen del request si no hay override explícito
    const rawHost =
      req.headers.host ||
      process.env.VERCEL_URL || // en Vercel viene sin protocolo
      'localhost:3000';

    const isLocal =
      rawHost.includes('localhost') || rawHost.includes('127.0.0.1');

    const proto =
      (req.headers['x-forwarded-proto'] as string) || (isLocal ? 'http' : 'https');

    const baseUrl =
      process.env.BETTER_AUTH_URL || `${proto}://${rawHost}`;

    // 1) Obtener sesión del handler de Better Auth (reenviando cookies)
    const r = await fetch(`${baseUrl}/api/auth/get-session`, {
      headers: { cookie: req.headers.cookie ?? '' },
      cache: 'no-store',
    });

    if (!r.ok) {
      return res.status(200).json({ user: null });
    }

    const raw = await r.text();

    let data: GetSessionResponse = null;
    try {
      data = JSON.parse(raw) as GetSessionResponse;
    } catch {
      return res.status(200).json({ user: null });
    }

    const userId = data?.user?.id ?? undefined;
    if (!userId) {
      return res.status(200).json({ user: null });
    }

    // 2) Cargar el usuario (incluye rol)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, role: true },
    });

    return res.status(200).json({ user: user ?? null });
  } catch {
    return res.status(200).json({ user: null });
  }
}
