# Papercuts

Log of things that slowed down development. Date · symptom · fix · project.

- 2026-09-28 · `yarn install` with the global yarn (volta, 4.9.2) dies in the fetch step:
  `ENOENT ... lstat '/node_modules/typescript/lib/_tsc.js'` -- yarn's builtin `compat/typescript` patch
  predates TypeScript 7, whose package has no `_tsc.js`. · Pinned the repo to yarn 4.18.0 (as `spell/parser`)
  with `yarn set version 4.18.0` -- `.yarn/releases/` + `yarnPath` in `.yarnrc.yml`. · spell/ui
- 2026-09-28 · yarn 4.18 then refuses `oxfmt@^0.71.0`: `All versions satisfying "^0.71.0" are quarantined`
  (new default minimum release age). · `npmMinimalAgeGate: 0` in `.yarnrc.yml`, as `spell/parser`. · spell/ui
- 2026-09-28 · `yarn build` fails loading `vite.config.ts`: `[unplugin-dts] The installed "typescript" package
  does not provide the JavaScript Compiler API (this happens with TypeScript 7+)`.  `vite-plugin-dts` 5 needs
  the TS 6 JS API. · `yarn add -D @typescript/typescript6`, which it falls back to automatically. · spell/ui
- 2026-09-28 · SIDE EFFECT of the above:  `@typescript/typescript6` depends on `typescript@^6`, which the
  node-modules linker hoists as `node_modules/@typescript/old` AND links as `node_modules/.bin/tsc` -- so
  `npx tsc` / `node_modules/.bin/tsc` run TypeScript 6.0.3, not 7. · Always `yarn tsc` (yarn resolves the
  workspace's own `typescript@7`);  package scripts are fine.  Check with `yarn tsc --version`. · spell/ui
- 2026-09-28 · Vite 8 deprecates `build.rollupOptions` (still accepted) in favour of `build.rolldownOptions`;
  `output.keepNames` lives there now. · Use `rolldownOptions` in `vite.config.ts`. · spell/ui
- 2026-09-28 · Vitest 5 browser mode prints `Plugin "vitest:mocks:interceptor" defines Vite-specific hooks
  (configureServer) in a plugin returned from applyToEnvironment. These hooks will be ignored.` on every run.
  Harmless:  it's Vitest's own plugin, tests run fine. · Ignore until Vitest fixes it. · spell/ui
- 2026-09-28 · Vitest 5 browser config shape (changed in v4):  provider is a FACTORY imported from its own
  package -- `import { playwright } from "@vitest/browser-playwright"`, `provider: playwright()` -- not the
  string `"playwright"`, and browsers are `instances: [{ browser: "chromium" }]`, not `name:`.  Test helpers
  import from `vitest/browser`, not `@vitest/browser/context`. · See `vitest.config.ts`. · spell/ui
