// pages/api/movements/index.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { withAuth, withRole, type AuthedReq } from "@/lib/secure";

// 👇 Reusa los schemas compartidos (para que los tests no dupliquen lógica)
import {
  movementCreateSchema,
  movementsFilterSchema,
} from "@/lib/schemas/movement";

// ===== GET: ambos roles (ADMIN ve todo; USER solo lo suyo)
const getHandler: NextApiHandler = async (req, res) => {
  const { userId } = req as AuthedReq;

  // 👇 Valida query con Zod (así puedes testear 400 fácilmente)
  const parsedQ = movementsFilterSchema.safeParse(req.query);
  if (!parsedQ.success) {
    return res.status(400).json({ error: parsedQ.error.flatten() });
  }
  const { type, from, to } = parsedQ.data;

  const where: Prisma.MovementWhereInput = {};
  if (type) where.type = type;

  if (from || to) {
    const dateFilter: Prisma.DateTimeFilter = {};
    // límites de día en UTC para evitar off-by-one en TZ
    if (from) dateFilter.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) dateFilter.lte = new Date(`${to}T23:59:59.999Z`);
    where.date = dateFilter;
  }

  // RBAC por datos
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") where.userId = userId;

  const rows = await prisma.movement.findMany({
    where,
    orderBy: { date: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return res
    .status(200)
    .json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
};

// ===== POST: solo ADMIN crea
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

// 👇 Exporta handlers “crudos” para testear sin middlewares
export { getHandler as _getMovements, postHandler as _postMovements };

// ===== Export del handler combinado (lo usa Next en runtime)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return withAuth(getHandler)(req, res);      // USER o ADMIN
  if (req.method === "POST") return withRole("ADMIN", postHandler)(req, res); // solo ADMIN
  res.setHeader("Allow", "GET, POST");
  return res.status(405).end();
}
