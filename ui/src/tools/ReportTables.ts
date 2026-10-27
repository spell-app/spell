/// <reference types="node" />

import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

import { kb } from "spell/util/number"
import { spliceGenerated, writeOrCheck } from "spell/element-tools/generatedFiles"
import type { PerfRecord, PerfResult, PerfStep } from "spell-ui/test-helpers/PerfRun"
import {
  REPORT_DIGITS,
  ScenarioNames,
  type LocResults,
  type MeasureChecks,
  type MeasureResults,
  type ScenarioName,
  type Size,
  type SmokePage,
  type SmokeResults
} from "./tools.types.ts"
import { Terminal } from "spell/element-tools/Terminal"

/****************
 * ### `ReportTables`
 * Rewrites the GENERATED tables of `notes/report.md` from the result files, with fixed headers, units and rounding.
 * - A table lives between `<!-- generated:<name> -->` and `<!-- /generated:<name> -->`;
 *   ONLY that content is replaced, prose around it is left alone (the kit's `spliceGenerated()`, a table at a time;  a
 *   table without its markers is skipped).  Names are the keys of `TABLES` (`TableName`).
 * - Inputs, all in `results/`:
 *   `measure-results.json` (`BundleMeasure`), `perf-results.json` (`PerfRun`, written by the dropdown perf test),
 *   `smoke-results.json` (`SmokeRunner`), `loc-results.json` (`LocCount`).
 *   A missing file renders a one-line "not measured" note instead of the table.
 * - Idempotent:  running it twice changes nothing;  an unchanged report isn't written (`writeOrCheck()`).
 ****************/
export class ReportTables {
  /** repo root, absolute */
  readonly root: string
  /** report file, relative to the root */
  readonly file: string
  /** folder of the result files, relative to the root */
  readonly results: string

  constructor({ root, file = "notes/report.md", results = "results" }: ReportTablesProps) {
    this.root = root
    this.file = file
    this.results = results
  }

  /**
   * Rewrite every marked table;  returns the names it found.
   * - `isCheck`:  write nothing;  fail (exit code 1) if a table is stale, naming `yarn report`
   * - SIDE EFFECT:  writes the report when a table changed, or sets `process.exitCode`
   */
  write({ isCheck = false }: { isCheck?: boolean } = {}): string[] {
    const path = resolve(this.root, this.file)
    let text = readFileSync(path, "utf8")
    const found: string[] = []
    for (const name of Object.keys(TABLES) as TableName[]) {
      const start = `<!-- generated:${name} -->`
      if (!text.includes(start)) continue
      found.push(name)
      const end = `<!-- /generated:${name} -->`
      text = spliceGenerated(text, { file: this.file, start, end, block: () => `${this.render(name)}\n` })
    }
    const [stale] = writeOrCheck([[path, text]], { command: "report", isCheck })
    if (!isCheck) {
      const tables = found.length ? `regenerated ${found.join(", ")}` : "nothing (no markers)"
      Terminal.out(`${this.file}:  ${stale ? tables : "unchanged"}`)
    }
    return found
  }

  /** Markdown for table `name`. */
  render(name: TableName): string {
    switch (name) {
      case "versions":
        return this.versions()
      case "bundle-tiers":
        return this.withMeasure((results) => this.tiers(results))
      case "bundle-families":
        return this.withMeasure((results) => this.families(results))
      case "bundle-scenarios":
        return this.withMeasure((results) => this.scenarios(results))
      case "bundle-checks":
        return this.withMeasure((results) => this.checks(results))
      case "loc":
        return this.withLoc((results) => this.loc(results))
      case "loc-files":
        return this.withLoc((results) => this.locFiles(results))
      case "perf":
        return this.perf()
      case "smoke":
        return this.smoke()
    }
  }

  ////////////////
  // ## Bundle
  ////////////////

  /** Peer package versions (from `measure-results.json`) + the root `package.json`'s Solid-related pins. */
  private versions(): string {
    const measure = this.read<MeasureResults>("measure-results.json")
    const packageJson = this.readRoot<{
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    }>("package.json")
    const rows: string[][] = []
    for (const [name, version] of Object.entries(measure?.versions ?? {}))
      rows.push([`\`${name}\``, version, "installed"])
    for (const [kind, dependencies] of [
      ["peer", packageJson?.peerDependencies],
      ["dependency", packageJson?.dependencies],
      ["dev", packageJson?.devDependencies]
    ] as const) {
      for (const [name, range] of Object.entries(dependencies ?? {})) {
        if (VERSIONED.test(name)) rows.push([`\`${name}\``, range, kind])
      }
    }
    return ReportTables.table(["Package", "Version", "Kind"], rows)
  }

  /** Tier table:  the library as used (what the scenarios add) and in full, then one row per shared entry. */
  private tiers(results: MeasureResults): string {
    const ownMin = Object.values(results.own).reduce((sum, own) => sum + own.min, 0)
    const ownGzip = Object.values(results.own).reduce((sum, own) => sum + own.gzip, 0)
    const shared = Object.entries(results.shared).map(([name, size]) => {
      const users = Object.entries(results.families).filter(([, needs]) => needs.shared.includes(name))
      const description = name === "core" ? "element core + foundation JS" : (size.description ?? "shared entry")
      const usedBy =
        name !== "core" ? `;  imported by ${users.map(([family]) => `\`${family}\``).join(", ") || "no family"}` : ""
      return [`${name} (${description}${usedBy})`, kb(size.min, REPORT_DIGITS), kb(size.gzip, REPORT_DIGITS), "eager"]
    })
    const library = [
      [
        "library (as used:  the bindings `dist/` imports)",
        kb(results.library.min, REPORT_DIGITS),
        kb(results.library.gzip, REPORT_DIGITS),
        "eager"
      ],
      [
        "library (full:  every export of the peer set)",
        kb(results.libraryFull.min, REPORT_DIGITS),
        kb(results.libraryFull.gzip, REPORT_DIGITS),
        "comparison"
      ]
    ]
    const rows = [
      ...library,
      ...shared,
      [
        `own, all ${Object.keys(results.own).length} families`,
        kb(ownMin, REPORT_DIGITS),
        kb(ownGzip, REPORT_DIGITS),
        "eager"
      ],
      ...Object.entries(results.extra ?? {}).map(([name, size]) => [
        `${name} (${EXTRA[name] ?? "extra entry"})`,
        kb(size.min, REPORT_DIGITS),
        kb(size.gzip, REPORT_DIGITS),
        "app only"
      ]),
      [
        "runtime (`UIRuntime` + foundation CSS)",
        kb(results.lazy.runtime.min, REPORT_DIGITS),
        kb(results.lazy.runtime.gzip, REPORT_DIGITS),
        "lazy"
      ],
      [
        "icons (none bundled:  pack indexes and SVGs are separate files, `notes/icons.md`)",
        kb(results.lazy.icons.min, REPORT_DIGITS),
        kb(results.lazy.icons.gzip, REPORT_DIGITS),
        "lazy"
      ],
      // older results files have no `data` tier
      ...(results.lazy.data
        ? [
            [
              "family data (emoji name chunks, each loaded on its own)",
              kb(results.lazy.data.min, REPORT_DIGITS),
              kb(results.lazy.data.gzip, REPORT_DIGITS),
              "lazy"
            ]
          ]
        : [])
    ]
    return ReportTables.table(["Tier", "min", "min+gz", "Loaded"], rows, ["left", "right", "right", "left"])
  }

  /**
   * Own cost per family, what else it imports, a page with only it, and the family built standalone (library
   * bundled).
   */
  private families(results: MeasureResults): string {
    const rows = Object.entries(results.own).map(([family, own]) => {
      const needs = results.families[family] ?? { shared: [], page: 0 }
      return [
        `\`${family}\``,
        `**${kb(own.gzip, REPORT_DIGITS)}**`,
        kb(own.classes.gzip, REPORT_DIGITS),
        kb(own.css.gzip, REPORT_DIGITS),
        kb(own.vocabulary.gzip, REPORT_DIGITS),
        kb(own.fallback.gzip, REPORT_DIGITS),
        needs.shared.join(" + "),
        kb(needs.page, REPORT_DIGITS),
        results.standalone[family] ? kb(results.standalone[family].gzip, REPORT_DIGITS) : "--"
      ]
    })
    return ReportTables.table(
      [
        "Family",
        "own min+gz",
        "classes",
        "css",
        "vocabulary",
        "fallback",
        "imports",
        "page with only it",
        "standalone (library bundled)"
      ],
      rows,
      ["left", "right", "right", "right", "right", "right", "left", "right", "right"]
    )
  }

  /** Scenario table, beside the same page from standalone builds (library bundled per build). */
  private scenarios(results: MeasureResults): string {
    const onePage = results.scenarios["page with one button"].parts.at(-1)!.slice(OWN_PREFIX.length)
    const standalone: Record<ScenarioName, Size | undefined> = {
      "page with one button": results.standalone[onePage],
      "all families": results.standalone["all families"],
      "app already ships the library": undefined
    }
    const rows = ScenarioNames.map((name) => {
      const scenario = results.scenarios[name]
      const before = standalone[name]
      return [
        name,
        ReportTables.parts(scenario.parts),
        `**${kb(scenario.gzip, REPORT_DIGITS)}**`,
        before ? kb(before.gzip, REPORT_DIGITS) : "--"
      ]
    })
    return ReportTables.table(["Scenario", "Adds up", "shared runtime min+gz", "standalone build"], rows, [
      "left",
      "left",
      "right",
      "right"
    ])
  }

  /** Structural checks. */
  private checks(results: MeasureResults): string {
    const rows = Object.entries(CHECK_LABELS).map(([key, label]) => {
      const found = results.checks[key as keyof MeasureChecks]
      return [
        label,
        found.length
          ? `FAIL:  ${found
              .slice(0, 4)
              .map((id) => `\`${id}\``)
              .join(", ")}`
          : "pass"
      ]
    })
    return ReportTables.table(["Check", "Result"], rows)
  }

  ////////////////
  // ## LOC
  ////////////////

  /** Lines per group. */
  private loc(results: LocResults): string {
    const rows = Object.entries(results.groups).map(([group, total]) => [
      group,
      String(total.files),
      String(total.lines),
      String(total.code)
    ])
    return ReportTables.table(["Group", "Files", "Lines", "Code lines"], rows, ["left", "right", "right", "right"])
  }

  /** Lines per file, element core and components only. */
  private locFiles(results: LocResults): string {
    const rows = results.files
      .filter((file) => LOC_FILE_GROUPS.includes(file.group))
      .map((file) => [`\`${file.path.replace(/^src\//, "")}\``, String(file.lines), String(file.code)])
    return ReportTables.table(["File", "Lines", "Code lines"], rows, ["left", "right", "right"])
  }

  ////////////////
  // ## Perf, smoke
  ////////////////

  /** Perf rows:  the test run (`perf-results.json`) and the smoke perf page, same columns. */
  private perf(): string {
    const record = this.read<PerfRecord>("perf-results.json")
    const smoke = this.read<SmokeResults>("smoke-results.json")
    const page = smoke?.pages.find((item) => item.kind === "perf" && item.perf)
    const rows: string[][] = []
    if (record) rows.push(ReportTables.perfRow(record.where, record.build, record.result))
    if (page?.perf)
      rows.push(ReportTables.perfRow("smoke perf page", "production (`dist/` + vendored peers)", page.perf))
    if (!rows.length) return "_Not measured yet:  run `yarn test` and `yarn smoke`._"
    return ReportTables.table(
      [
        "Where",
        "Build",
        "Open: update / + layout / + frame ms",
        "Keystroke update min / avg / max ms",
        "+ layout",
        "+ frame"
      ],
      rows,
      ["left", "left", "right", "right", "right", "right"]
    )
  }

  /** One smoke row per page. */
  private smoke(): string {
    const smoke = this.read<SmokeResults>("smoke-results.json")
    if (!smoke) return "_Not measured yet:  run `yarn smoke`._"
    const rows = smoke.pages.map((page) => [
      `\`${page.path.split("/").pop()}\``,
      page.kind === "compat" ? "COMPATIBILITY" : page.kind,
      page.label,
      page.ok ? "PASS" : "**FAIL**",
      ReportTables.smokeDetails(page)
    ])
    return ReportTables.table(["Page", "Kind", "Host", "Result", "Checks"], rows)
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** `measure-results.json`, or a note. */
  private withMeasure(render: (results: MeasureResults) => string): string {
    const results = this.read<MeasureResults>("measure-results.json")
    return results ? render(results) : "_Not measured yet:  run `yarn measure`._"
  }

  /** `loc-results.json`, or a note. */
  private withLoc(render: (results: LocResults) => string): string {
    const results = this.read<LocResults>("loc-results.json")
    return results ? render(results) : "_Not counted yet:  run `yarn report`._"
  }

  /** Parsed JSON file from the results folder, or `undefined`. */
  private read<T>(file: string): T | undefined {
    return this.readRoot(join(this.results, file))
  }

  /** Parsed JSON file from the root, or `undefined`. */
  private readRoot<T>(file: string): T | undefined {
    const path = join(this.root, file)
    return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : undefined
  }

  /** A perf table row. */
  private static perfRow(where: string, build: string, result: PerfResult): string[] {
    return [where, build, open(result.open), stats(result.update), stats(result.layout), stats(result.frame)]

    /** The open step's three timings. */
    function open(step: PerfStep): string {
      return `${ms(step.update)} / ${ms(step.layout)} / ${ms(step.frame)}`
    }

    /** A keystroke timing's min / avg (bold) / max. */
    function stats(value: { min: number; avg: number; max: number }): string {
      return `${ms(value.min)} / **${ms(value.avg)}** / ${ms(value.max)}`
    }
  }

  /** Short check list of a smoke page:  failed checks first, then the rest by name. */
  private static smokeDetails(page: SmokePage): string {
    if (page.kind === "perf" && page.perf) return `${page.perf.count} options, query \`${page.perf.query}\``
    const failed = Object.entries(page.checks)
      .filter(([, value]) => value === false)
      .map(([key]) => key)
    const passed = Object.entries(page.checks)
      .filter(([, value]) => value === true)
      .map(([key]) => key)
    const other = Object.entries(page.checks)
      .filter(([, value]) => typeof value !== "boolean")
      .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    const parts = [
      failed.length ? `failed: ${failed.join(", ")}` : "",
      passed.length ? `ok: ${passed.join(", ")}` : "",
      ...other,
      page.errors.length ? `${page.errors.length} console error(s)` : ""
    ]
    return parts.filter(Boolean).join("; ").replaceAll("|", "\\|")
  }

  /** Scenario parts, several `own:*` collapsed:  `library + core + forms + own (8 families)`. */
  private static parts(parts: string[]): string {
    const own = parts.filter((part) => part.startsWith(OWN_PREFIX))
    const rest = parts.filter((part) => !part.startsWith(OWN_PREFIX))
    if (own.length < 2) return parts.join(" + ")
    return [...rest, `own (${own.length} families)`].join(" + ")
  }

  /** A markdown table;  `align` per column, `left` by default. */
  static table(headers: string[], rows: string[][], align: ColumnAlign[] = []): string {
    const rule = headers.map((_, index) => (align[index] === "right" ? "--:" : "---"))
    return [headers, rule, ...rows].map((row) => `| ${row.join(" | ")} |`).join("\n")
  }
}

/** Constructor props of `ReportTables`. */
export type ReportTablesProps = {
  /** repo root, absolute */
  root: string
  /** report file, relative to the root (or absolute:  the content repo's `guides/ui/notes/report.md`, `src/tools/cli.ts`);
   * default `notes/report.md` */
  file?: string
  /** folder of the result files, relative to the root;  default `results` */
  results?: string
}

/** A key of `TABLES`:  a `<!-- generated:<name> -->` marker's name. */
export type TableName = keyof typeof TABLES

/** How a markdown table column aligns. */
export const ColumnAligns = ["left", "right"] as const
/** One of `ColumnAligns`. */
export type ColumnAlign = (typeof ColumnAligns)[number]

/**
 * Every generated table:  name => what it shows.
 * - Headers are defined ONCE, in the renderers.
 */
const TABLES = {
  versions: "installed peer packages and toolchain",
  "bundle-tiers":
    "library (as used, full) / shared entries (core, forms ...) / own / extra (api) / lazy, min and min+gz",
  "bundle-families": "own cost per family, split classes / css / vocabulary / fallback, and what it imports",
  "bundle-scenarios": "the three page scenarios",
  "bundle-checks": "structural checks of dist/",
  loc: "lines per group",
  "loc-files": "lines per file",
  perf: "1000-option search dropdown, open + keystrokes",
  smoke: "import-map smoke pages"
} as const

/** What each structural check means, as the checks table words it, in table order. */
const CHECK_LABELS: Record<keyof MeasureChecks, string> = {
  entriesMissingCore: "every family entry imports `core.js`",
  runtimeChunks: "no Rolldown runtime chunk (`rolldown-runtime-<hash>.js`):  its helpers stay in `core.js`",
  coreOutsideCore: "no shared-entry module outside its own chunk (`core.js`, `forms.js` ...)",
  libraryBundled: "no Solid module in `dist/`",
  docsBundled: "no doc-only `<ui-docs-*>` module in `dist/`",
  lazyInEager: "runtime + icon data only in lazy chunks",
  unattributed: "every module attributed to a bucket",
  peersMissing: "every external specifier is in the peer set",
  lightDarkLowered: "`light-dark()` kept as is (never lowered to `--lightningcss-*` variables)"
}

/** Packages the versions table lists:  Solid and the Solid plugin (the pins that matter). */
const VERSIONED = /^solid-js$|^@solidjs\//

/** What each extra entry (`MeasureResults.extra`) holds, for the tier table. */
const EXTRA: Record<string, string> = { api: "`E` / `V` namespaces, `spell-ui/api`" }

/** LOC groups listed file by file (`loc-files`). */
const LOC_FILE_GROUPS = ["element core", "components"]

/** A family's part in a scenario, `own:<family>` (`BundleMeasure`). */
const OWN_PREFIX = "own:"

/** Milliseconds, one decimal. */
function ms(value: number): string {
  return value.toFixed(1)
}
