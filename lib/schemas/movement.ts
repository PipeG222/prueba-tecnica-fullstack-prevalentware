// lib/schemas/movement.ts
import { z } from "zod";

/**
 * Normaliza montos que llegan como string con coma o punto.
 * "12,50" -> 12.5   |   "12.50" -> 12.5
 */
const parseAmount = (v: unknown) =>
  typeof v === "string" ? Number(v.replace(",", ".")) : v;

/**
 * Body de creación de movimientos
 * Usado en POST /api/movements
 */
export const movementCreateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  concept: z.string().min(1).max(255),
  amount: z.preprocess(parseAmount, z.number().positive()),
  // El handler usa z.coerce.date() → acepta 'YYYY-MM-DD'
  date: z.coerce.date(),
});

export type MovementCreate = z.infer<typeof movementCreateSchema>;

/**
 * Body de actualización parcial
 * Usado en PUT /api/movements/{id}
 */
export const movementUpdateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  concept: z.string().min(1).max(255).optional(),
  amount: z.preprocess(parseAmount, z.number().positive()).optional(),
  date: z.coerce.date().optional(),
});

export type MovementUpdate = z.infer<typeof movementUpdateSchema>;

/**
 * Query params para listar con filtros
 * Usado (si quieres) en GET /api/movements
 */
export const movementsFilterSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  // Forzamos formato YYYY-MM-DD para evitar sorpresas con timezone
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD")
    .optional(),
});

export type MovementsFilter = z.infer<typeof movementsFilterSchema>;
