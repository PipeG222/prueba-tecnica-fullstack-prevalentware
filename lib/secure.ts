// lib/secure.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthedReq = NextApiRequest & { userId: string };

// Convierte IncomingHttpHeaders (Node) -> Headers (Web API)
function toWebHeaders(nodeHeaders: NextApiRequest["headers"]): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(nodeHeaders)) {
    if (typeof v === "undefined") continue;
    if (Array.isArray(v)) h.set(k, v.join(", "));
    else h.set(k, String(v));
  }
  return h;
}

export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // 🔑 Better Auth necesita Headers (cookie incluida)
      const headers = toWebHeaders(req.headers);
      const session = await auth.api.getSession({ headers });

      const userId = session?.user?.id as string | undefined;
      if (!userId) return res.status(401).json({ error: "Unauthenticated" });

      (req as AuthedReq).userId = userId;
      return handler(req as AuthedReq, res);
    } catch (e) {
      console.error("[withAuth] error:", e);
      return res.status(401).json({ error: "Unauthenticated" });
    }
  };
}

export function withRole(role: "ADMIN" | "USER", handler: NextApiHandler): NextApiHandler {
  return withAuth(async (req: AuthedReq, res: NextApiResponse) => {
    const u = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    const ok = role === "USER" ? Boolean(u) : u?.role === "ADMIN";
    if (!ok) return res.status(403).json({ error: "Forbidden" });
    return handler(req, res);
  });
}
