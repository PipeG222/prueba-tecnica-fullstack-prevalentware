// pages/api/users/[id]/role.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const roleSchema = z.object({ role: z.enum(["ADMIN", "USER"]) });

async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.ALLOW_DEV_AUTH === "true") {
    const email = req.headers["x-dev-user-email"];
    if (typeof email === "string") {
      const u = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
      if (u?.role === "ADMIN") return u.id;
    }
  }
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length);
    const s = await prisma.session.findUnique({ where: { token }, select: { userId: true, expiresAt: true } });
    if (s && s.expiresAt > new Date()) {
      const u = await prisma.user.findUnique({ where: { id: s.userId }, select: { role: true } });
      if (u?.role === "ADMIN") return s.userId;
    }
  }
  res.status(403).json({ error: "Forbidden" });
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const aid = await requireAdmin(req, res);
  if (!aid) return;

  // Leer estado actual
  const current = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!current) return res.status(404).json({ error: "Not found" });

  if (req.method === "PUT") {
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const nextRole = parsed.data.role;

    if (current.role === "ADMIN" && nextRole === "USER") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return res.status(409).json({ error: "No puedes dejar la organización sin administradores." });
      }
    }

    const updated = await prisma.user.update({ where: { id }, data: { role: nextRole }, select: { id: true, role: true } });
    return res.status(200).json(updated);
  }

  if (req.method === "POST") {
    // toggle
    const nextRole = current.role === "ADMIN" ? "USER" : "ADMIN";

    if (current.role === "ADMIN" && nextRole === "USER") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return res.status(409).json({ error: "No puedes dejar la organización sin administradores." });
      }
    }

    const updated = await prisma.user.update({ where: { id }, data: { role: nextRole }, select: { id: true, role: true } });
    return res.status(200).json(updated);
  }

  res.setHeader("Allow", "PUT, POST");
  return res.status(405).end();
}
