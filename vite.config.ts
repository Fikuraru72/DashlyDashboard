import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  fmt: {
    ignorePatterns: [".next/**", "dist/**", ".pi-subagents/**", "AGENTS.md", "next-env.d.ts"],
    singleQuote: false,
    semi: true,
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns: [".next/**", "dist/**", ".pi-subagents/**", "AGENTS.md", "next-env.d.ts"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
    clearMocks: true,
  },
});
