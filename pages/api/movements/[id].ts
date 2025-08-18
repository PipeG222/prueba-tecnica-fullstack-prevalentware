import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { withAuth, withRole, type AuthedReq } from "@/lib/secure";

const movementUpdateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  concept: z.string().min(1).max(255).optional(),
  amount: z.preprocess(
    (v) => (typeof v === "string" ? Number(v.replace(",", ".")) : v),
    z.number().positive()
  ).optional(),
  date: z.coerce.date().optional(),
});

// GET: ambos roles (ADMIN puede ver cualquiera; USER solo si es suyo)
async function getOne(req: AuthedReq, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  const row = await prisma.movement.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true, id: true } } },
  });
  if (!row) return res.status(404).json({ error: "Not found" });

  const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
  if (me?.role !== "ADMIN" && row.userId !== req.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { user, ...rest } = row;
  return res.status(200).json({ ...rest, user: user ? { name: user.name, email: user.email } : null, amount: Number(row.amount) });
}

// PUT: solo ADMIN
async function putOne(req: AuthedReq, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const parsed = movementUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const patch: any = {};
  if (parsed.data.type !== undefined) patch.type = parsed.data.type;
  if (parsed.data.concept !== undefined) patch.concept = parsed.data.concept;
  if (parsed.data.amount !== undefined) patch.amount = new Prisma.Decimal(parsed.data.amount);
  if (parsed.data.date !== undefined) patch.date = parsed.data.date;

  const updated = await prisma.movement.update({
    where: { id },
    data: patch,
    include: { user: { select: { name: true, email: true } } },
  });

  return res.status(200).json({ ...updated, amount: Number(updated.amount) });
}

// DELETE: solo ADMIN
async function deleteOne(req: AuthedReq, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  await prisma.movement.delete({ where: { id } });
  return res.status(204).end();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET")    return withAuth(getOne)(req as any, res);
  if (req.method === "PUT")    return withRole("ADMIN", putOne)(req as any, res);
  if (req.method === "DELETE") return withRole("ADMIN", deleteOne)(req as any, res);
  res.setHeader("Allow", "GET, PUT, DELETE");
  return res.status(405).end();
}
