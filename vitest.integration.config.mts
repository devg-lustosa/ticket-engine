import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node", include: ["test/integration/**/*.test.ts"],
    globalSetup: ["./test/support/database.ts"], setupFiles: ["./test/support/environment.ts"],
    fileParallelism: false, testTimeout: 30000, hookTimeout: 60000,
  },
});
