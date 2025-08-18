// pages/api/users/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

/** Helpers mínimos de auth */
async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  // Dev override por email
  if (process.env.ALLOW_DEV_AUTH === "true") {
    const email = req.headers["x-dev-user-email"];
    if (typeof email === "string") {
      const u = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
      if (u?.role === "ADMIN") return u.id;
    }
  }
  // Token opcional (Authorization: Bearer <token>)
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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const rows = await prisma.user.findMany({
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json(rows);
}
