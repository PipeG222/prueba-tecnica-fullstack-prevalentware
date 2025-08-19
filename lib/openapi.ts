// lib/openapi.ts
import { z } from "zod";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);
export const registry = new OpenAPIRegistry();

/* ===================== Schemas ===================== */
export const ErrorSchema = registry.register(
  "Error",
  z.object({
    message: z.string().openapi({ example: "Unauthorized" }),
  })
);

export const SessionSchema = registry.register(
  "Session",
  z.object({
    userId: z.string().openapi({ example: "usr_123" }),
    email: z.string().email().openapi({ example: "user@mail.com" }),
    expiresAt: z
      .string()
      .datetime()
      .openapi({ example: "2025-12-31T23:59:59.000Z", format: "date-time" }),
  })
);

export const UserSchema = registry.register(
  "User",
  z.object({
    id: z.string().openapi({ example: "usr_123" }),
    name: z.string().nullable().openapi({ example: "Felip" }),
    email: z.string().email().nullable().openapi({ example: "felip@mail.com" }),
    role: z.enum(["ADMIN", "USER"]).openapi({ example: "USER" }),
    image: z
      .string()
      .url()
      .nullable()
      .openapi({ example: "https://…/avatar.png" }),
  })
);

export const MovementSchema = registry.register(
  "Movement",
  z.object({
    id: z.string().openapi({ example: "mov_001" }),
    type: z.enum(["INCOME", "EXPENSE"]).openapi({ example: "INCOME" }),
    categoryId: z.string().nullable().openapi({ example: "cat_food" }),
    amount: z.number().openapi({ example: 125000 }),
    note: z.string().nullable().openapi({ example: "Venta #123" }),
    createdAt: z
      .string()
      .datetime()
      .openapi({ example: "2025-08-17T13:45:10.000Z", format: "date-time" }),
  })
);

export const MovementCreateSchema = registry.register(
  "MovementCreate",
  z.object({
    type: z.enum(["INCOME", "EXPENSE"]),
    categoryId: z.string().nullable().optional(),
    amount: z.number().positive().openapi({ example: 150000 }),
    note: z.string().max(500).optional().openapi({ example: "Pago cliente" }),
    // Si aceptas 'date' en el body, puedes incluirlo aquí también:
    date: z.string().openapi({ example: "2025-08-17", format: "date" }),
  })
);

export const ReportSummarySchema = registry.register(
  "ReportSummary",
  z.object({
    totalIncome: z.number().openapi({ example: 5000000 }),
    totalExpense: z.number().openapi({ example: 3200000 }),
    balance: z.number().openapi({ example: 1800000 }),
    from: z.string().openapi({ example: "2025-08-01", format: "date" }),
    to: z.string().openapi({ example: "2025-08-31", format: "date" }),
  })
);

/* ===================== Paths ===================== */
/** Auth */
registry.registerPath({
  method: "get",
  path: "/api/auth/get-session",
  summary: "Obtener sesión",
  tags: ["Auth"],
  responses: {
    200: {
      description: "Sesión (o null).",
      content: {
        "application/json": { schema: SessionSchema.nullable() },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/sign-out",
  summary: "Cerrar sesión",
  tags: ["Auth"],
  responses: { 200: { description: "OK" } },
});

/** Me */
registry.registerPath({
  method: "get",
  path: "/api/me",
  summary: "Usuario actual",
  tags: ["Users"],
  responses: {
    200: {
      description: "Usuario actual o null.",
      content: {
        "application/json": {
          schema: z.object({ user: UserSchema.nullable() }),
        },
      },
    },
  },
});

/** Users */
registry.registerPath({
  method: "get",
  path: "/api/users",
  summary: "Listar usuarios",
  tags: ["Users"],
  responses: {
    200: {
      description: "Listado de usuarios.",
      content: { "application/json": { schema: z.array(UserSchema) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{id}",
  summary: "Obtener usuario por id",
  description: "Corresponde a pages/api/users/[id].ts",
  tags: ["Users"],
  request: {
    params: z.object({
      id: z.string().openapi({ example: "usr_123" }),
    }),
  },
  responses: {
    200: {
      description: "Usuario.",
      content: { "application/json": { schema: UserSchema } },
    },
    404: {
      description: "No encontrado.",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

/** Movements */
registry.registerPath({
  method: "get",
  path: "/api/movements",
  summary: "Listar movimientos",
  tags: ["Movements"],
  request: {
    query: z.object({
      limit: z.string().optional().openapi({ example: "20" }),
      cursor: z.string().optional().openapi({ example: "mov_001" }),
      // si usas filtros:
      // type: z.enum(["INCOME","EXPENSE"]).optional().openapi({ example: "EXPENSE" }),
      // from: z.string().optional().openapi({ example: "2025-08-01", format: "date" }),
      // to: z.string().optional().openapi({ example: "2025-08-31", format: "date" }),
    }),
  },
  responses: {
    200: {
      description: "Listado paginado.",
      content: {
        "application/json": {
          schema: z.object({
            items: z.array(MovementSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
    },
    401: {
      description: "No autenticado.",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
  security: [{ cookieAuth: [] }],
});

registry.registerPath({
  method: "post",
  path: "/api/movements",
  summary: "Crear movimiento",
  tags: ["Movements"],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: MovementCreateSchema } },
    },
  },
  responses: {
    201: {
      description: "Creado.",
      content: { "application/json": { schema: MovementSchema } },
    },
    400: {
      description: "Datos inválidos.",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: {
      description: "No autenticado.",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
  security: [{ cookieAuth: [] }],
});

registry.registerPath({
  method: "get",
  path: "/api/movements/{id}",
  summary: "Detalle de movimiento",
  description: "Corresponde a pages/api/movements/[id].ts",
  tags: ["Movements"],
  request: {
    params: z.object({
      id: z.string().openapi({ example: "mov_001" }),
    }),
  },
  responses: {
    200: {
      description: "Movimiento.",
      content: { "application/json": { schema: MovementSchema } },
    },
    404: {
      description: "No encontrado.",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: {
      description: "No autenticado.",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
  security: [{ cookieAuth: [] }],
});

/** Reports */
registry.registerPath({
  method: "get",
  path: "/api/reports/summary",
  summary: "Resumen de reportes",
  tags: ["Reports"],
  request: {
    query: z.object({
      from: z.string().openapi({ example: "2025-08-01", format: "date" }),
      to: z.string().openapi({ example: "2025-08-31", format: "date" }),
    }),
  },
  responses: {
    200: {
      description: "Resumen.",
      content: { "application/json": { schema: ReportSummarySchema } },
    },
    401: {
      description: "No autenticado.",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
  security: [{ cookieAuth: [] }],
});

registry.registerPath({
  method: "get",
  path: "/api/reports/csv",
  summary: "Exportar CSV",
  tags: ["Reports"],
  request: {
    query: z.object({
      from: z.string().openapi({ example: "2025-08-01", format: "date" }),
      to: z.string().openapi({ example: "2025-08-31", format: "date" }),
    }),
  },
  responses: {
    200: {
      description: "Texto CSV.",
      content: {
        "text/csv": {
          schema: z
            .string()
            .openapi({ example: "id,amount\nmov_1,1000" }),
        },
      },
    },
    401: {
      description: "No autenticado.",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
  security: [{ cookieAuth: [] }],
});

/* ============ OpenAPI Document generator ============ */
export function getOpenApiDocument(baseUrl: string) {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "API – Prueba técnica",
      version: "1.0.0",
      description: "Documentación de la API. Autenticación por cookie de sesión.",
    },
    servers: [{ url: baseUrl }],
    tags: [{ name: "Auth" }, { name: "Users" }, { name: "Movements" }, { name: "Reports" }],
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "YOUR_SESSION_COOKIE_NAME" },
      },
    },
  });
}
// ===== Roles (Users) =====
export const RoleEnum = z.enum(["ADMIN", "USER"]);

export const UserRoleChangeRequestSchema = registry.register(
  "UserRoleChangeRequest",
  z.object({
    role: RoleEnum.openapi({ example: "ADMIN" }),
  })
);

export const UserRoleChangeResponseSchema = registry.register(
  "UserRoleChangeResponse",
  z.object({
    id: z.string().openapi({ example: "usr_123" }),
    role: RoleEnum.openapi({ example: "ADMIN" }),
  })
);
// PUT /api/users/{id}/role  — establece un rol específico
registry.registerPath({
  method: "put",
  path: "/api/users/{id}/role",
  summary: "Asignar rol a un usuario",
  description:
    "Establece el rol del usuario indicado. Requiere autenticación y pasar por las reglas de RBAC del backend. Devuelve 409 si se intenta dejar el sistema sin administradores.",
  tags: ["Users"],
  request: {
    params: z.object({
      id: z.string().openapi({ example: "usr_123" }),
    }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: UserRoleChangeRequestSchema,
          examples: {
            setAdmin: { value: { role: "ADMIN" } },
            setUser: { value: { role: "USER" } },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Rol actualizado.",
      content: { "application/json": { schema: UserRoleChangeResponseSchema } },
    },
    400: {
      description: "Body inválido.",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: {
      description: "No autenticado.",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Prohibido por RBAC.",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "Usuario no encontrado.",
      content: { "application/json": { schema: ErrorSchema } },
    },
    409: {
      description: "No se puede dejar la organización sin administradores.",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
  security: [{ cookieAuth: [] }],
});

// POST /api/users/{id}/role  — alterna (toggle) ADMIN/USER
registry.registerPath({
  method: "post",
  path: "/api/users/{id}/role",
  summary: "Alternar rol del usuario (toggle)",
  description:
    "Cambia el rol del usuario entre ADMIN y USER. No requiere body. Respeta reglas de RBAC y protege contra dejar el sistema sin administradores (409).",
  tags: ["Users"],
  request: {
    params: z.object({
      id: z.string().openapi({ example: "usr_123" }),
    }),
  },
  responses: {
    200: {
      description: "Rol alternado.",
      content: { "application/json": { schema: UserRoleChangeResponseSchema } },
    },
    401: {
      description: "No autenticado.",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Prohibido por RBAC.",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "Usuario no encontrado.",
      content: { "application/json": { schema: ErrorSchema } },
    },
    409: {
      description: "No se puede dejar la organización sin administradores.",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
  security: [{ cookieAuth: [] }],
});
// ===== /api/me response =====
export const MeResponseSchema = registry.register(
  "MeResponse",
  z.object({
    user: UserSchema.nullable(),
  })
);
registry.registerPath({
  method: "get",
  path: "/api/me",
  summary: "Usuario actual (via /api/auth/get-session)",
  description:
    "Devuelve el usuario autenticado consultando internamente /api/auth/get-session y luego Prisma. Siempre responde 200; si no hay sesión o hay error controlado, `user: null`.",
  tags: ["Users"],
  responses: {
    200: {
      description: "Usuario actual o null.",
      content: {
        "application/json": {
          schema: MeResponseSchema,
          examples: {
            autenticado: {
              value: {
                user: {
                  id: "usr_123",
                  name: "Felip",
                  email: "felip@mail.com",
                  image: "https://…/avatar.png",
                  role: "USER",
                },
              },
            },
            sinSesion: { value: { user: null } },
          },
        },
      },
    },
  },
  security: [{ cookieAuth: [] }], // ajusta si usas bearer
});
