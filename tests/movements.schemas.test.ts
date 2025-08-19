import { describe, it, expect } from "vitest";
// Si tu alias "@/"" funciona (tsconfig + vitest.config), usa esta línea:
import { movementCreateSchema, movementUpdateSchema } from "@/lib/schemas/movement";
// Si NO tienes alias "@/": usa la ruta relativa
// import { movementCreateSchema, movementUpdateSchema } from "../lib/schemas/movement";

describe("movementCreateSchema", () => {
  it("acepta amount con coma y date YYYY-MM-DD", () => {
    const parsed = movementCreateSchema.parse({
      type: "INCOME",
      concept: "Venta #1",
      amount: "12,50",
      date: "2025-08-17",
    });
    expect(parsed.amount).toBe(12.5);
    expect(parsed.date instanceof Date).toBe(true);
    expect(parsed.type).toBe("INCOME");
  });

  it("rechaza amount negativo", () => {
    const r = movementCreateSchema.safeParse({
      type: "EXPENSE",
      concept: "Compra",
      amount: -10,
      date: "2025-08-17",
    });
    expect(r.success).toBe(false);
  });
});

describe("movementUpdateSchema", () => {
  it("permite parches parciales válidos", () => {
    const parsed = movementUpdateSchema.parse({ amount: "100,00" });
    expect(parsed.amount).toBe(100);
  });

  it("rechaza concept vacío si se envía", () => {
    const r = movementUpdateSchema.safeParse({ concept: "" });
    expect(r.success).toBe(false);
  });
});
