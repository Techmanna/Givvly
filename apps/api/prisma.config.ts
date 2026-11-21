import * as path from "node:path";
import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile?.(path.join(__dirname, ".env"));
} catch {
  // Ignore when .env is absent (e.g. in CI/container where env vars are injected)
}

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrations: {
    seed: "ts-node prisma/seed.ts",
  },
});
