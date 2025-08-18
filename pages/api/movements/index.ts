import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { withAuth, withRole, type AuthedReq } from '@/lib/secure';

// Validación de creación
const movementCreateSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  concept: z.string().min(1).max(255),
  amount: z.preprocess(
    (v) => (typeof v === 'string' ? Number(v.replace(',', '.')) : v),
    z.number().positive()
  ),
  date: z.coerce.date(), // acepta "YYYY-MM-DD"
});

// GET: ambos roles (ADMIN ve todo; USER solo lo suyo)
const getHandler: NextApiHandler = async (req, res) => {
  const { userId } = req as AuthedReq;

  const { type, from, to } = req.query as {
    type?: 'INCOME' | 'EXPENSE';
    from?: string;
    to?: string;
  };

  const where: Prisma.MovementWhereInput = {};

  if (type) where.type = type; // coincide con el enum MovementType

  if (from || to) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    where.date = dateFilter;
  }

  // RBAC por datos: si no es ADMIN, filtra por su userId
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (me?.role !== 'ADMIN') where.userId = userId;

  const rows = await prisma.movement.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { user: { select: { name: true, email: true } } },
  });

  return res
    .status(200)
    .json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
};

// POST: solo ADMIN crea
const postHandler: NextApiHandler = async (req, res) => {
  const { userId } = req as AuthedReq;

  const parsed = movementCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const created = await prisma.movement.create({
    data: {
      type: parsed.data.type,
      concept: parsed.data.concept,
      amount: new Prisma.Decimal(parsed.data.amount),
      date: parsed.data.date,
      userId,
    },
    include: { user: { select: { name: true, email: true } } },
  });

  return res.status(201).json({ ...created, amount: Number(created.amount) });
};

// Export del handler combinado
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') return withAuth(getHandler)(req, res); // USER o ADMIN
  if (req.method === 'POST') return withRole('ADMIN', postHandler)(req, res); // solo ADMIN
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
