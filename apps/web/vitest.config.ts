import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@qalam/form-engine": path.resolve(__dirname, "../../packages/form-engine/dist/index.js")
    }
  }
});
