// tests/users.role.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 🔝 Mock hoisted de prisma (se asegura de existir antes de los vi.mock)
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
}));

// 🔝 Mock hoisted de withRole (solo devuelve el handler tal cual)
const withRolePassthrough = vi.hoisted(() => ({
  impl: (_role: string, fn: any) => fn,
}));

// Mock de módulos usando los objetos hoisted
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/secure", () => ({ withRole: withRolePassthrough.impl }));

// ⬇️ Importa el handler DESPUÉS de los mocks
import handler from "@/pages/api/users/[id]/role";

// Helpers para req/res
type Req = Partial<{
  method: string;
  query: Record<string, any>;
  body: any;
  headers: Record<string, string>;
}>;

function createMockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.headers = {} as Record<string, string>;
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.setHeader = vi.fn((k: string, v: any) => {
    res.headers[k] = v;
  });
  res.json = vi.fn((data: any) => {
    res._json = data;
    return res;
  });
  res.end = vi.fn(() => res);
  return res;
}

describe("/api/users/[id]/role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("405 si método no es PUT ni POST y expone Allow", async () => {
    const req: Req = { method: "GET", query: { id: "u1" } };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(res.setHeader).toHaveBeenCalledWith("Allow", "PUT, POST");
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalled();
  });

  it("404 si el usuario objetivo no existe", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const req: Req = { method: "POST", query: { id: "u404" } };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u404" },
      select: { role: true },
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Not found" });
  });

  it("PUT: 400 si el body no valida con zod", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ role: "USER" });

    const req: Req = {
      method: "PUT",
      query: { id: "u1" },
      body: { role: "SUPER" }, // no permitido
    };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("PUT: 200 y actualiza role a ADMIN cuando el body es válido", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ role: "USER" });
    prismaMock.user.update.mockResolvedValueOnce({ id: "u1", role: "ADMIN" });

    const req: Req = {
      method: "PUT",
      query: { id: "u1" },
      body: { role: "ADMIN" },
    };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { role: "ADMIN" },
      select: { id: true, role: true },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: "u1", role: "ADMIN" });
  });

  it("POST: toggle USER → ADMIN", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ role: "USER" });
    prismaMock.user.update.mockResolvedValueOnce({ id: "u1", role: "ADMIN" });

    const req: Req = { method: "POST", query: { id: "u1" } };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { role: "ADMIN" },
      select: { id: true, role: true },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: "u1", role: "ADMIN" });
  });

  it("POST: bloquea ADMIN → USER si solo hay 1 admin (409)", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ role: "ADMIN" });
    prismaMock.user.count.mockResolvedValueOnce(1);

    const req: Req = { method: "POST", query: { id: "uAdmin" } };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(prismaMock.user.count).toHaveBeenCalledWith({ where: { role: "ADMIN" } });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "No puedes dejar la organización sin administradores.",
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("POST: permite ADMIN → USER si hay más de 1 admin (200)", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ role: "ADMIN" });
    prismaMock.user.count.mockResolvedValueOnce(2);
    prismaMock.user.update.mockResolvedValueOnce({ id: "uAdmin", role: "USER" });

    const req: Req = { method: "POST", query: { id: "uAdmin" } };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "uAdmin" },
      data: { role: "USER" },
      select: { id: true, role: true },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: "uAdmin", role: "USER" });
  });

  it("500 si ocurre una excepción inesperada", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ role: "USER" });
    prismaMock.user.update.mockRejectedValueOnce(new Error("DB down"));

    const req: Req = { method: "POST", query: { id: "u1" } };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
  });
});
