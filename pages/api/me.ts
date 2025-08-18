// pages/api/me.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // logs para depurar
  console.log("===> /api/me (via /api/auth/get-session) cookies:", req.headers.cookie);

  res.setHeader("cache-control", "no-store");

  try {
    // 1) Pedimos la sesión a nuestro propio handler de Better Auth
    const r = await fetch(`${process.env.BETTER_AUTH_URL}/api/auth/get-session`, {
      headers: { cookie: req.headers.cookie || "" }, // reenviamos cookies
    });

    const raw = await r.text();
    console.log("[/api/me] get-session status:", r.status, "raw:", raw);

    if (!r.ok) {
      return res.status(200).json({ user: null });
    }

    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.warn("[/api/me] JSON.parse error:", e);
      return res.status(200).json({ user: null });
    }

    const userId: string | undefined = data?.user?.id;
    console.log("[/api/me] session userId:", userId);

    if (!userId) {
      return res.status(200).json({ user: null });
    }

    // 2) Cargamos el usuario desde la DB (incluye rol)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, role: true },
    });

    console.log("[/api/me] prisma user:", user);

    return res.status(200).json({ user: user ?? null });
  } catch (err) {
    console.error("[/api/me] error:", err);
    return res.status(200).json({ user: null }); // no exponemos errores
  }
}
