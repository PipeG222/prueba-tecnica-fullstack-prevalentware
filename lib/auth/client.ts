// lib/auth/client.ts
import { createAuthClient } from 'better-auth/react';

const baseURL =
  typeof window === 'undefined'
    ? // SSR/build: usa env o localhost
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000')
    : // Browser: mismo origen para evitar CORS entre preview/prod
      '';

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: { credentials: 'include' },
});
