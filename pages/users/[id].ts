// pages/api/users/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  phone: z.string().max(30).nullable().optional(),
});

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

  if (req.method === "GET") {
    // Solo admin por simplicidad (puedes abrirlo si quieres)
    const aid = await requireAdmin(req, res);
    if (!aid) return;
    const u = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
    if (!u) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(u);
  }

  if (req.method === "PUT") {
    const aid = await requireAdmin(req, res);
    if (!aid) return;

    const parsed = userUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    // Si se intenta cambiar rol, impedir dejar 0 ADMINs
    if (parsed.data.role) {
      if (parsed.data.role === "USER") {
        // ¿este usuario es admin actualmente?
        const current = await prisma.user.findUnique({ where: { id }, select: { role: true } });
        if (current?.role === "ADMIN") {
          const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
          if (adminCount <= 1) {
            return res.status(409).json({ error: "No puedes dejar la organización sin administradores." });
          }
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
    return res.status(200).json(updated);
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).end();
}
