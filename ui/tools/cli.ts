/// <reference types="node" />

/**
 * The package tooling's command line:  `tsx tools/cli.ts <command>` (the root `yarn vendor`, `yarn measure` ...).
 * - `vendor` -- `PeerVendor`:  one ES module per peer specifier (`solid-js`, `@solidjs/web`, `@spell/solid-element`)
 *   in `vendor/` + `vendor/importmap.json`, tree-shaken to what `dist/` and the smoke pages import
 * - `measure` -- `BundleMeasure`:  `tools/results/measure-results.json` (library / core / forms / own per family /
 *   scenarios / checks)
 * - `smoke` -- `SmokeRunner`:  `dist/` + `vendor/` through an import map, the framework host pages (the Solid 2 app
 *   on the SAME vendored Solid as the components) + the extra pages, headless chromium;
 *   `tools/results/smoke-results.json`
 * - `serve` -- the same pages and import map for a person:  prints the URLs, runs until killed
 * - `loc` / `report` -- `LocCount` (`loc-results.json`), then `ReportTables` rewrites `docs/report.md`'s generated
 *   tables
 * - `smoke` expects a fresh `vite build` and `yarn vendor`;  `measure` builds in memory.  Both `vendor` and
 *   `measure` bundle the fork's BUILT output:  `ForkBuild.ensure()` builds it first when stale.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import {
  BundleMeasure,
  ForkBuild,
  HostApp,
  LocCount,
  PeerVendor,
  ReportTables,
  SmokeRunner,
  type ImportMap
} from "./index.ts"
import { DIST_IMPORTS, PACKAGE } from "./package.config.ts"

const command = process.argv[2]
switch (command) {
  case "vendor":
    ForkBuild.ensure()
    await HostApp.ensure()
    await new PeerVendor({
      root: PACKAGE.root,
      peerEntry: PACKAGE.peerEntry,
      // `dist/`, and every page module that imports a peer itself:  the host app, the identity probe,
      // `perf-adapter.js`, the inline scripts of the extra pages (`flush`)
      usedBy: ["dist", "tools/frameworks", "tools/smoke", "tools/demo/fallback.html"]
    }).build()
    break
  case "measure":
    ForkBuild.ensure()
    await new BundleMeasure(PACKAGE).write()
    break
  case "smoke":
    if (!(await runner().run()).pages.every((page) => page.ok)) process.exitCode = 1
    break
  case "serve":
    await runner().serve()
    break
  case "loc":
    loc()
    break
  case "report":
    loc()
    new ReportTables(PACKAGE.root).write()
    break
  default:
    console.error("usage:  tsx tools/cli.ts vendor | measure | smoke | serve | loc | report")
    process.exit(1)
}

/** Host pages + the extra pages, against `dist/` and the vendored Solid. */
function runner() {
  const vendorMap = join(PACKAGE.root, "vendor", "importmap.json")
  if (!existsSync(vendorMap)) throw new Error("no vendor/importmap.json:  run `yarn vendor` first")
  const vendored = JSON.parse(readFileSync(vendorMap, "utf8")) as ImportMap
  return new SmokeRunner({
    name: PACKAGE.name,
    root: PACKAGE.root,
    results: PACKAGE.results,
    importMap: { imports: { ...vendored.imports, ...DIST_IMPORTS } },
    perfAdapter: "tools/smoke/perf-adapter.js",
    pages: [
      { path: "tools/smoke/compat-solid-1.9.html", kind: "compat" },
      { path: "tools/smoke/translate.html", kind: "check" },
      { path: "tools/demo/fallback.html", kind: "check" }
    ]
  })
}

/** Lines / code lines of the element core, components, foundation, tests and tooling. */
function loc() {
  const results = new LocCount(PACKAGE.name, PACKAGE.root, {
    "element core": ["src/elements/*.{ts,tsx}", "src/core.ts", "src/forms.ts", "!src/elements/*.test.{ts,tsx}"],
    components: [
      "src/components/*/UI*.{ts,tsx}",
      "src/components/*/index.ts",
      "src/components/dropdown/SlottedItems.ts",
      "src/components/parts/PartElement.ts",
      "!src/components/**/*.test.{ts,tsx}"
    ],
    "vocabularies & fallbacks": ["src/components/*/*.vocabulary.*.ts", "src/components/*/*.fallback.ts"],
    foundation: [
      "src/{util,vocabulary,runtime,styles,icons}/*.ts",
      "src/components/*.ts",
      "src/index.ts",
      "!src/**/*.test.ts"
    ],
    tests: ["src/**/*.test.{ts,tsx}", "test/**/*.{ts,tsx}"],
    tooling: ["tools/**/*.{ts,tsx,js,html}", "vite.config.ts", "vitest.config.ts", "vite.decorators.ts"]
  }).count()
  const folder = join(PACKAGE.root, PACKAGE.results)
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, "loc-results.json"), `${JSON.stringify(results, null, 2)}\n`)
}
