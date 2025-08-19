// tests/me.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 🔝 Hoisted mocks para evitar el error de inicialización
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}));

const fetchMock = vi.hoisted(() => vi.fn());

// Mock de prisma
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Importa el handler DESPUÉS de los mocks
import handler from "@/pages/api/me";

// Helpers req/res
type Req = Partial<{
  method: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body: any;
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

const ORIGINAL_ENV = { ...process.env };

describe("/api/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Stub global fetch
    // @ts-expect-error: we are stubbing global
    global.fetch = fetchMock;

    // Limpia env por defecto
    process.env = { ...ORIGINAL_ENV };
    delete process.env.BETTER_AUTH_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("setea Cache-Control y usa BETTER_AUTH_URL si existe (happy path)", async () => {
    process.env.BETTER_AUTH_URL = "https://example.com";

    // Mock de get-session OK
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ user: { id: "u1" } }),
    } as any);

    // Mock de prisma
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "u1",
      name: "Felip",
      email: "felip@example.com",
      image: null,
      role: "ADMIN",
    });

    const req: Req = {
      method: "GET",
      headers: {
        cookie: "sid=abc",
        host: "irrelevant-host.com",
      },
    };
    const res = createMockRes();

    await handler(req as any, res as any);

    // Verifica header
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store, max-age=0");

    // Verifica URL usada por fetch
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/auth/get-session",
      expect.objectContaining({
        headers: expect.objectContaining({ cookie: "sid=abc" }),
        cache: "no-store",
      })
    );

    // Verifica respuesta final
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      user: {
        id: "u1",
        name: "Felip",
        email: "felip@example.com",
        image: null,
        role: "ADMIN",
      },
    });
  });

  it("usa host/proto del request si NO hay BETTER_AUTH_URL (localhost → http)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ user: { id: "u2" } }),
    } as any);

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "u2",
      name: "User",
      email: "u2@example.com",
      image: null,
      role: "USER",
    });

    const req: Req = {
      method: "GET",
      headers: {
        host: "localhost:3000",
        cookie: "sid=zzz",
        // sin x-forwarded-proto -> isLocal => http
      },
    };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/get-session",
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      user: {
        id: "u2",
        name: "User",
        email: "u2@example.com",
        image: null,
        role: "USER",
      },
    });
  });

  it("cuando no es local y no hay proto header, usa https por defecto", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ user: { id: "u3" } }),
    } as any);

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "u3",
      name: "Prod",
      email: "prod@example.com",
      image: null,
      role: "USER",
    });

    const req: Req = {
      method: "GET",
      headers: {
        host: "app.example.com",
        cookie: "sid=ppp",
        // sin x-forwarded-proto, y no es localhost -> https
      },
    };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.example.com/api/auth/get-session",
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("retorna {user:null} si get-session responde !ok", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: async () => "whatever",
    } as any);

    const req: Req = {
      method: "GET",
      headers: {
        host: "localhost:3000",
        cookie: "",
      },
    };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: null });
  });

  it("retorna {user:null} si get-session devuelve texto no JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => "not-json",
    } as any);

    const req: Req = {
      method: "GET",
      headers: { host: "localhost:3000" },
    };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: null });
  });

  it("retorna {user:null} si no hay userId en la sesión", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ user: { id: null } }),
    } as any);

    const req: Req = {
      method: "GET",
      headers: { host: "localhost:3000" },
    };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: null });
  });

  it("retorna {user:null} si prisma no encuentra usuario", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ user: { id: "u404" } }),
    } as any);

    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const req: Req = {
      method: "GET",
      headers: { host: "localhost:3000" },
    };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u404" },
      select: { id: true, name: true, email: true, image: true, role: true },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: null });
  });

  it("atrapa excepciones y responde {user:null}", async () => {
    // Por ejemplo: fetch lanza
    fetchMock.mockRejectedValueOnce(new Error("Network down"));

    const req: Req = { method: "GET", headers: { host: "localhost:3000" } };
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: null });
  });
});
