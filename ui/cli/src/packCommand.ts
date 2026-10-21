import { CLI } from "spell-kit/cli"

import type { PackOptions, PackScaffoldReport } from "./cli.types"
import { buildPack, checkPack, packNames } from "./packBuild"
import { addElement, createPack, nextSteps } from "./packCreate"

/**
 * `spell pack <verb> ...`:  component packs (epic `epic-components`) -- another repo's custom elements, which a page
 * loads on demand through `<ui-root>`.  The logic:  `packCreate.ts`, and the kit's pack tooling
 * (`spell-kit/element/tools/ComponentPack`) for `build` and `check`, through `packBuild.ts`.
 * - Which kit:  the nearest one from the current folder up (`CLI.findCheckout(CLI.KIT_MARKER)`), so a worktree's packs.
 * - `--json`:  the report as JSON.
 * - Was `spell dev pack new | element | build | check`, spell-app's, until epic `repo-split` P13.
 * - Each resolves to the exit code;  throws `CliError` for a name that's no pack, or a bad name, prefix or tag.
 */

/** `spell pack create <name> [--prefix x-] [--no-build]`:  `spell-<name>/`, a pack repo from the templates. */
export async function packCreate(name: string, options: PackOptions = {}): Promise<number> {
  const report = await createPack(kitRoot(), name, { prefix: options.prefix, build: options.build !== false })
  CLI.out(options.json ? JSON.stringify(report, null, 2) : [...scaffoldLines(report), ...nextSteps(name)].join("\n"))
  return CLI.EXIT.OK
}

/** `spell pack add <pack> <tag> [--no-build]`:  one element family, `components/<tag>/`, then the pack rebuilt. */
export async function packAdd(pack: string, tag: string, options: PackOptions = {}): Promise<number> {
  const report = await addElement(kitRoot(), pack, tag, { build: options.build !== false })
  CLI.out(options.json ? JSON.stringify(report, null, 2) : scaffoldLines(report).join("\n"))
  return CLI.EXIT.OK
}

/** `spell pack build <pack>`:  `components/__pack/`:  the catalog from the vocabularies, the entry, the script. */
export async function packBuild(pack: string, options: PackOptions = {}): Promise<number> {
  const report = await buildPack(kitRoot(), pack)
  CLI.out(
    options.json
      ? JSON.stringify(report, null, 2)
      : [`built ${report.pack}:  ${report.tags.length} tags, sources ${report.hash}`, ...report.files].join("\n  ")
  )
  return CLI.EXIT.OK
}

/** `spell pack check [pack]`:  exits 1 when a pack's `components/__pack/` is stale;  no pack:  every pack in the kit. */
export async function packCheck(pack: string | undefined, options: PackOptions = {}): Promise<number> {
  const root = kitRoot()
  const packs = pack ? [pack] : packNames(root)
  const reports = []
  for (const name of packs) reports.push(await checkPack(root, name))
  const stale = reports.filter((report) => report.stale.length)
  if (options.json) CLI.out(JSON.stringify(reports, null, 2))
  else if (!packs.length) CLI.out("no component packs in this kit")
  else {
    for (const report of reports) {
      const state = report.stale.length ? "STALE" : "current"
      CLI.out([`${report.pack}:  ${state}`, ...report.stale].join("\n  "))
    }
    if (stale.length) CLI.out(`fix:  ${stale.map((report) => `spell pack build ${report.pack}`).join(";  ")}`)
  }
  return stale.length ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** The kit the packs are in:  the nearest one from the current folder up. */
function kitRoot(): string {
  return CLI.findCheckout(CLI.KIT_MARKER)
}

/** `report` as lines:  what was created, updated, skipped and built. */
function scaffoldLines(report: PackScaffoldReport): string[] {
  const lines = [
    ...report.created.map((file) => `created  ${file}`),
    ...report.updated.map((file) => `updated  ${file}`),
    ...report.skipped.map((file) => `skipped  ${file}`)
  ]
  if (report.built) lines.push(`built    ${report.built.files.join(", ")}  (sources ${report.built.hash})`)
  else lines.push(`not built:  \`spell pack build ${report.pack}\``)
  return lines
}
