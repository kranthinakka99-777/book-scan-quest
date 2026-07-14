// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const githubPagesBase =
  process.env.GITHUB_ACTIONS === "true" && repoName
    ? `/${repoName}/`
    : "/";

export default defineConfig({
  vite: {
    base: githubPagesBase,
  },
  tanstackStart: {
    pages: [{ path: "/" }],
    prerender: {
      enabled: false,
    },
    router: {
      basepath: githubPagesBase,
    },
  },
});
