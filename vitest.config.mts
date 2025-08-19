// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

/**
 * Requisitos:
 *   bun add -d vitest @vitest/coverage-v8 vite-tsconfig-paths @types/node node-mocks-http
 *
 * El plugin tsconfigPaths respeta tus alias de tsconfig (por ejemplo "@/").
 * Además dejamos un alias de respaldo por si tu tsconfig no está cargado.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts"],
    exclude: ["node_modules", ".next", "dist", "coverage"],
    coverage: {
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
    },
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
  resolve: {
    alias: {
      // Fallback: mapea "@" a la raíz del proyecto
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
