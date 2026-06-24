import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only this project's tests — never recurse into nested git worktrees
    // (.claude/worktrees/*), which would otherwise be globbed by the default.
    root: __dirname,
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.claude/**", "**/dist/**"]
  }
});
