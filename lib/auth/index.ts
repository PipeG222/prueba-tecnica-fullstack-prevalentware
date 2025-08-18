// lib/auth/index.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,      // http://localhost:3000 en local
  secret: process.env.BETTER_AUTH_SECRET!,    // cadena larga y aleatoria

  // DB vía Prisma
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Social login: GitHub
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días
  },

  // Requisito de la prueba: todo nuevo usuario entra como ADMIN
  events: {
    async userCreated({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" },
      });
    },
  },
});
