// pages/api/users/[id].ts
import type { NextApiResponse } from "next";
import type { AuthedReq } from "@/lib/secure";
import { withRole } from "@/lib/secure";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  phone: z.string().max(30).nullable().optional(),
});

export default withRole("ADMIN", async (req: AuthedReq, res: NextApiResponse) => {
  const { id } = req.query as { id: string };

  try {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "no-store");
      const u = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      });
      if (!u) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(u);
    }

    if (req.method === "PUT") {
      const parsed = userUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      // Evitar quedarse sin admins si baja de ADMIN -> USER
      if (parsed.data.role === "USER") {
        const current = await prisma.user.findUnique({ where: { id }, select: { role: true } });
        if (current?.role === "ADMIN") {
          const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
          if (adminCount <= 1) {
            return res.status(409).json({ error: "No puedes dejar la organización sin administradores." });
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

    if (req.method === "DELETE") {
      // No permitir borrar el ÚLTIMO ADMIN
      const current = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (!current) return res.status(404).json({ error: "Not found" });

      if (current.role === "ADMIN") {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
        if (adminCount <= 1) {
          return res.status(409).json({ error: "No puedes borrar al último administrador." });
        }
      }

      // Opcional: no permitir que alguien se borre a sí mismo
      // if (req.userId === id) return res.status(409).json({ error: "No puedes borrarte a ti mismo." });

      await prisma.user.delete({ where: { id } });
      return res.status(204).end();
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).end();
  } catch (err: any) {
    console.error("[API] /api/users/[id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
