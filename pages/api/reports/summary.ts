// pages/api/reports/summary.ts
import type { NextApiResponse } from "next";
import type { AuthedReq } from "@/lib/secure";
import { withRole } from "@/lib/secure";
import { prisma } from "@/lib/prisma";

export default withRole("ADMIN", async (_req: AuthedReq, res: NextApiResponse) => {
  try {
    res.setHeader("Cache-Control", "no-store");

    const rows = await prisma.movement.findMany({
      select: { type: true, amount: true, date: true },
      orderBy: { date: "asc" },
    });

    let income = 0, expense = 0;
    const monthly: Record<string, { income: number; expense: number; balance: number }> = {};

    for (const r of rows) {
      const amt = Number(r.amount);
      if (r.type === "INCOME") income += amt; else expense += amt;

      const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
      const m = (monthly[key] ||= { income: 0, expense: 0, balance: 0 });
      if (r.type === "INCOME") m.income += amt; else m.expense += amt;
      m.balance = m.income - m.expense;
    }

    const series = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }));

    return res.status(200).json({ income, expense, balance: income - expense, series });
  } catch (err: any) {
    console.error("[API] /api/reports/summary", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
