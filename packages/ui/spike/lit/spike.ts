/// <reference types="node" />

/**
 * The Lit spike's side of the shared tooling (`spike/shared/`):  `tsx spike.ts <command>`.
 * - `vendor` -- `PeerVendor`:  one ES module per `lit` specifier in `vendor/` + `vendor/importmap.json`
 * - `measure` -- `SpikeMeasure`:  `measure-results.json` (library / core / own per family / scenarios)
 * - `smoke` -- `SmokeRunner`:  `dist/` + `vendor/` through an import map, shared host pages + this spike's
 *   extra pages (`demo/smoke/`, `demo/fallback.html`), headless chromium;  `smoke-results.json`
 * - `serve` -- the same pages and import map for a person:  prints the URLs, runs until killed
 * - `loc` / `report` -- `LocCount` (`loc-results.json`), then `ReportTables` rewrites `REPORT.md`'s
 *   generated tables
 * - `smoke` and `measure` expect a fresh `yarn build` / `yarn vendor`;  the package scripts chain them.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { LocCount, PeerVendor, ReportTables, SmokeRunner, SpikeMeasure, type ImportMap } from "../shared/index.ts"
import { DIST_IMPORTS, SPIKE } from "./spike.config.ts"

const command = process.argv[2]
switch (command) {
  case "vendor":
    await new PeerVendor({ vite: SPIKE.vite, root: SPIKE.root, peerEntry: SPIKE.peerEntry }).build()
    break
  case "measure":
    await new SpikeMeasure(SPIKE).write()
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
    new ReportTables(SPIKE.root).write()
    break
  default:
    console.error("usage:  tsx spike.ts vendor | measure | smoke | serve | loc | report")
    process.exit(1)
}

/** Shared host pages + the Lit extras, against `dist/` and the vendored `lit`. */
function runner() {
  const vendorMap = join(SPIKE.root, "vendor", "importmap.json")
  if (!existsSync(vendorMap)) throw new Error("no vendor/importmap.json:  run `yarn vendor` first")
  const vendored = JSON.parse(readFileSync(vendorMap, "utf8")) as ImportMap
  return new SmokeRunner({
    spike: SPIKE.name,
    root: SPIKE.root,
    importMap: { imports: { ...vendored.imports, ...DIST_IMPORTS } },
    perfAdapter: "demo/smoke/perf-adapter.js",
    pages: [
      { path: "demo/smoke/compat-duplicate-lit.html", kind: "compat" },
      { path: "demo/smoke/translate.html", kind: "check" },
      { path: "demo/fallback.html", kind: "check" }
    ]
  })
}

/** Lines / code lines of the spike's element core, components, tests and tooling. */
function loc() {
  const results = new LocCount(SPIKE.name, SPIKE.root, {
    "element core": ["src/core.ts", "src/forms.ts", "src/elements/*.ts"],
    components: ["src/components/*/*.ts", "!src/components/*/*.test.ts"],
    tests: ["src/**/*.test.ts", "src/testing/*.ts"],
    "demo & tooling": ["demo/**/*.{ts,js,html}", "src/dictionary.es.ts", "*.ts"]
  }).count()
  writeFileSync(join(SPIKE.root, "loc-results.json"), `${JSON.stringify(results, null, 2)}\n`)
}
