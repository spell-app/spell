import { existsSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"

import { CLI } from "spell-kit/cli"
import { ComponentPack } from "spell-kit/element-tools/ComponentPack"
import { ComponentPackError } from "spell-kit/element-tools/tools.types"

import type { PackBuildReport, PackCheckReport } from "./cli.types"

/**
 * `spell pack build <pack>`:  pack `name` of kit `root` built by the kit's pack tooling, `ComponentPack`
 * (`spell-kit/element-tools/ComponentPack`), which every pack's own `yarn pack:build` runs too (`spell-pack build`).
 * - What this adds:  the pack found BY NAME in the kit (`readPack()`), paths relative to the kit, `CliError`s.
 * - Node built-ins, `ComponentPack` and (only while building) Vite.
 * - Throws `CliError` for a name that's no pack, a tag without the pack's prefix, or an import of Spell UI or
 *   Solid the page can't share.
 */
export async function buildPack(root: string, name: string): Promise<PackBuildReport> {
  const pack = readPack(root, name)
  const report = await asCliError(() => pack.build())
  return { ...report, files: report.files.map((file) => relative(root, file)) }
}

/**
 * `spell pack check [<pack>]`:  whether pack `name`'s generated files are CURRENT (`ComponentPack.check()`).
 * - `stale` names each one that isn't, relative to `root`, and why;  none means current.
 */
export async function checkPack(root: string, name: string): Promise<PackCheckReport> {
  const { pack, hash, stale } = await asCliError(() => readPack(root, name).check())
  return { pack, hash, stale: stale.map(({ file, reason }) => `${relative(root, file)}:  ${reason}`) }
}

/**
 * Pack `name` in kit `root`:  the repo among `packFolders()` whose pack is named `name` (spell-brand's is `brand`,
 * spell-epic's `epics`), or whose folder is `spell-<name>` or `<name>`.
 * - Throws `CliError` when there's no such pack, or that folder isn't one.
 */
export function readPack(root: string, name: string): ComponentPack {
  for (const folder of packFolders(root)) {
    const pack = ComponentPack.read(folder)
    if (pack.name === name) return pack
  }
  const folder = [join(root, `spell-${name}`), join(root, name)].find((each) => existsSync(join(each, "package.json")))
  if (folder && ComponentPack.prefixOf(folder) !== undefined) return ComponentPack.read(folder)
  const where = folder ? `${relative(root, folder)}/package.json has no "spellPack": { "prefix" }` : "no such repo"
  throw new CLI.CliError(
    `pack '${name}':  ${where}, so it isn't a component pack;  make one with \`spell pack create ${name}\``
  )
}

/**
 * Every component pack's folder in kit `root`, sorted:  the kit's child repos (`spell-*`) whose `package.json` has a
 * `spellPack` (spell-brand, spell-epic, one `spell pack create` made);  and `root` itself, when it's a pack (a pack
 * repo checked out on its own).
 */
function packFolders(root: string): string[] {
  const children = readdirSync(root)
    .filter((name) => name.startsWith("spell-"))
    .sort()
    .map((name) => join(root, name))
  return [root, ...children].filter((folder) => ComponentPack.prefixOf(folder) !== undefined)
}

/** Every component pack in kit `root`, by its pack name (`ComponentPack.read()`'s:  `brand`, `epics`), sorted. */
export function packNames(root: string): string[] {
  return [...new Set(packFolders(root).map((folder) => ComponentPack.read(folder).name))].sort()
}

/** `run()`'s result;  a `ComponentPackError` it throws becomes a `CliError` (exit 1), with the same message. */
async function asCliError<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof ComponentPackError) throw new CLI.CliError(error.message, CLI.EXIT.ERRORS)
    throw error
  }
}
