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
- 2026-09-28 · Tests under `src/` can't import `test/fixture.ts` without `../../test/fixture`:  the `$` alias
  only covers `src/`, and `AGENTS.md` says NEVER start an import with `../`. · `src/runtime/*.test.ts` use the
  relative path for now;  a `$test/*` alias (tsconfig `paths` + both vite configs) would fix it. · spell/ui
- 2026-09-28 · TypeScript 7's DOM lib has no `CloseWatcher`, and after a failed `instanceof HTMLStyleElement`
  it narrows `HTMLLinkElement | HTMLStyleElement` to `never` (the two are structurally close). · Minimal
  `CloseWatcherLike` type in `runtime.types.ts`;  test `instanceof HTMLLinkElement` first. · spell/ui
- 2026-09-28 · Checking that `load()` code-splits needs a build:  browser-mode tests can't read `dist/`, and a
  scratch `vite.config.ts` outside the repo can't resolve `vite` (`MODULE_NOT_FOUND`). · Drive the Vite JS
  API from a scratch `.mts` with `node --experimental-strip-types` (node 22.17), importing
  `node_modules/vite/dist/node/index.js` and `vite.decorators.ts` by absolute path.  Left as `it.todo` in
  `UIRuntime.test.ts`. · spell/ui
- 2026-09-28 · Tests under `src/` can't reach the shared test utils (`test/fixture.ts`, `test/a11y.ts`) by the
  `$/...` rule:  `$` maps to `src/`, and `AGENTS.md` bans `../` imports. · `OwnerContext.test.ts` renders into
  its own container instead.  Fix:  add a `$test` (or `$/../test`) alias in `tsconfig.json` + `vitest.config.ts`. · spell/ui
- 2026-09-28 · oxlint's type-aware `no-base-to-string` fires on `${value}` / `String(value)` when `value: unknown`
  (e.g. `ClassBuilder` reading a `Record<string, unknown>` bag), even though `restrict-template-expressions`
  is off. · Narrow first (`typeof value === "string" | "number"`), see `ClassBuilder.text()`. · spell/ui
