// pages/api/reports/csv.ts
import type { NextApiResponse } from "next";
import type { AuthedReq } from "@/lib/secure";
import { withRole } from "@/lib/secure";
import { prisma } from "@/lib/prisma";

export default withRole("ADMIN", async (_req: AuthedReq, res: NextApiResponse) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="movements.csv"');

    const rows = await prisma.movement.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { date: "desc" },
    });

    const lines = [
      ["concept", "type", "amount", "date", "user"].join(","),
      ...rows.map(r =>
        [
          JSON.stringify(r.concept),
          r.type,
          Number(r.amount).toFixed(2),
          r.date.toISOString().slice(0, 10),
          JSON.stringify(r.user?.name ?? r.user?.email ?? "-"),
        ].join(",")
      ),
    ];

    res.status(200).send(lines.join("\n"));
  } catch (err: any) {
    console.error("[API] /api/reports/csv", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
