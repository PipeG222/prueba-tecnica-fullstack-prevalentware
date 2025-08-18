// pages/api/users/index.ts
import type { NextApiResponse } from "next";
import type { AuthedReq } from "@/lib/secure";
import { withRole } from "@/lib/secure";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(30).nullable().optional(),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export default withRole("ADMIN", async (req: AuthedReq, res: NextApiResponse) => {
  try {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "no-store");
      const rows = await prisma.user.findMany({
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      res.setHeader("Cache-Control", "no-store");
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      try {
        const created = await prisma.user.create({
          data: {
            name: parsed.data.name,
            email: parsed.data.email,
            phone: parsed.data.phone ?? null,
            role: parsed.data.role, // En registro vía BetterAuth ya subes a ADMIN por el evento
          },
          select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
        });
        return res.status(201).json(created);
      } catch (e: any) {
        if (e?.code === "P2002") {
          return res.status(409).json({ error: "El correo ya está registrado." });
        }
        console.error("[API] POST /api/users error:", e);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  } catch (err: any) {
    console.error("[API] /api/users", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
