import chalk from "chalk"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import { basename, join } from "node:path"

import { kb } from "spell/util/number"
import { CLI } from "spell/cli"
import { kitFolders } from "spell/server/kitFolders"
import {
  PACKS_FOLDER,
  PluginPackage,
  PublishedPackage,
  STAGE_FOLDER,
  ScratchInstall,
  UIBundle,
  type PackedPackage,
  type PublishCheck,
  type PublishedRepo,
  type SourceManifest
} from "spell/cli/publish"

/**
 * `spell publish [--dry-run] [--no-scratch] [--json]`:  the packages built, packed and checked, then published to
 * npm (epic `repo-split` P19;  three packages since P20, One Repo, Q65).
 * - `spell`:  the ONE package (Q62), the kit's `src/` and every folder's (`dist/ui/...`, `dist/parser/...`), with
 *   every name the checkout has (`spell/ui/core`), its commands, and every folder's runtime dependency.
 * - `spell-ui`:  Spell UI on its own, its Vite library build with the element code inside (Q63, `UIBundle`).
 * - `spell-epic`:  the epic plugin, its parts at its root, its code `spell`'s (Q64, `PluginPackage`).
 * - Which folders publish on their own:  by their package's name, `spell-ui` and `spell-epic` (`BUNDLED`, `PLUGIN`).
 *   spell-parser and spell-app stay held names, never published again (Q65).
 * - Each one:  declarations rebuilt (`spell-types`, where a program lists them), then staged and packed into the
 *   kit's `dist-packs/` (git-ignored), its file list summed up and checked.
 * - ONE version for all:  the kit's `package.json` `version`.
 * - Then the scratch install (`ScratchInstall`):  the packed files installed outside the checkout, a node import,
 *   a Vite page with a `<ui-button>`, `npx spell help`, `npx epic --help`.  `--no-scratch` skips it (it needs the
 *   network).
 * - `--dry-run`:  stops there;  publishes nothing.
 *   Without it, and only when every check passed:  `npm publish <tgz>` for each.
 *   - `spell-epic` published:  the root marketplace's `epic` entry turns from `./epic` to it
 *     (`PluginPackage.sourceToNpm()`, epic `epic-engine` P49), to commit
 *   NOTE: `npm login` first;  npm asks for a one-time password itself when the account has one.
 * - Which kit:  the nearest from the current folder (`findCheckout(KIT_MARKER)`).
 * - Exits 1 when a check fails or a publish does.
 */
export async function publishCommand(options: CLI.PublishOptions = {}): Promise<number> {
  const kit = CLI.findCheckout(CLI.KIT_MARKER)
  const { kit: kitRepo, folders } = publishedRepos(kit)
  const version = kitRepo.manifest.version
  const packsDir = join(kit, PACKS_FOLDER)
  rmSync(packsDir, { recursive: true, force: true })
  mkdirSync(join(packsDir, STAGE_FOLDER), { recursive: true })

  const catalog = yarnCatalog(kit)
  const say = options.json ? () => {} : CLI.out
  const checks: PublishCheck[] = []
  const packed: PackedPackage[] = []
  const stage = (name: string) => join(packsDir, STAGE_FOLDER, name)
  const ui = folders.find((folder) => folder.manifest.name === BUNDLED)
  const plugin = folders.find((folder) => folder.manifest.name === PLUGIN)
  const packages: PublishedPackage[] = [
    new PublishedPackage(kitRepo, stage(kitRepo.name), version, {}, catalog, folders),
    ...(ui ? [new UIBundle({ ...ui, name: BUNDLED }, stage(BUNDLED), version, {}, catalog)] : []),
    ...(plugin ? [new PluginPackage({ ...plugin, name: PLUGIN }, stage(PLUGIN), version, {}, catalog)] : [])
  ]
  say(chalk.bold(`spell publish${options.dryRun ? " --dry-run" : ""}:  ${packages.length} packages at ${version}`))
  for (const repo of [kitRepo, ...folders]) buildDeclarations(kit, repo)

  for (const pkg of packages) {
    const built = await pkg.stage()
    const result = pkg.pack(packsDir)
    packed.push(result)
    const own = pkg.checks(result)
    checks.push(...own)
    say(packSummary(result, built))
    for (const check of own) say(checkLine(check))
  }

  if (options.scratch !== false) {
    say(chalk.bold("scratch install"))
    const scratch = await new ScratchInstall(packed).run()
    checks.push(...scratch)
    for (const check of scratch) say(checkLine(check))
  }

  const failed = checks.filter((check) => !check.ok)
  const published: string[] = []
  if (!options.dryRun && !failed.length) {
    for (const pkg of packed) {
      say(chalk.bold(`npm publish ${CLI.relativePath(pkg.tgz)}`))
      const code = await CLI.runChild("npm", ["publish", pkg.tgz, "--access", "public"])
      if (code !== CLI.EXIT.OK) {
        failed.push({ pkg: pkg.name, check: "npm publish", ok: false, detail: `exit ${code}` })
        break
      }
      published.push(`${pkg.name}@${pkg.version}`)
    }
    // the plugin out on npm:  the root marketplace's `epic` names it, no longer the checkout's `./epic`
    if (published.some((name) => name.startsWith(`${PLUGIN}@`)) && PluginPackage.sourceToNpm(kit, PLUGIN))
      say(`.claude-plugin/marketplace.json:  epic's source is npm's ${PLUGIN} now;  commit it`)
  }

  if (options.json) CLI.out(JSON.stringify({ version, packed, checks, published }, null, 2))
  else if (failed.length)
    say(chalk.red(`${failed.length} check(s) failed${options.dryRun ? "" : ":  nothing more published"}`))
  else
    say(
      options.dryRun
        ? chalk.green("dry run:  every check passed;  nothing published")
        : `published ${published.join(", ")}`
    )
  return failed.length ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

////////////////
// ## Which repos
////////////////

/**
 * What publishes:  the kit, and each of its folders (`kitFolders()`) with a `"spellPublish"`, each as a repo named by
 * its import names (`spell/ui`:  its files are `spell/ui/...`).
 * - Throws `CliError` when the kit has no `"spellPublish"` of its own.
 */
export function publishedRepos(kit: string): { kit: PublishedRepo; folders: PublishedRepo[] } {
  const manifestOf = (root: string) => JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as SourceManifest
  const own = manifestOf(kit)
  if (!own.spellPublish) throw new CLI.CliError(`${kit}'s package.json has no "spellPublish":  nothing to publish`)
  const folders = kitFolders(kit).flatMap((root) => {
    const manifest = manifestOf(root)
    if (!manifest.spellPublish) return []
    return [{ name: `${own.name}/${basename(root)}`, root, manifest, settings: manifest.spellPublish }]
  })
  return { kit: { name: own.name, root: kit, manifest: own, settings: own.spellPublish }, folders }
}

/** The folder whose package publishes on its own as Spell UI's bundle (Q63). */
const BUNDLED = "spell-ui"

/** The folder whose package publishes as the epic plugin (Q64). */
const PLUGIN = "spell-epic"

/** The yarn `catalog:` versions in the kit's `.yarnrc.yml`, by package. */
export function yarnCatalog(kit: string): Record<string, string> {
  const file = join(kit, ".yarnrc.yml")
  if (!existsSync(file)) return {}
  const catalog: Record<string, string> = {}
  let inCatalog = false
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (/^catalog:\s*$/.test(line)) inCatalog = true
    else if (inCatalog && /^\S/.test(line)) inCatalog = false
    else if (inCatalog) {
      const entry = /^\s+"?([^":]+)"?:\s*(\S+)\s*$/.exec(line)
      if (entry) catalog[entry[1]!] = entry[2]!
    }
  }
  return catalog
}

/**
 * Rebuild `repo`'s declarations (`spell-types`), when it lists programs for them (`"spellTypes"`):  they ship in its
 * `dist/`.  Throws `CliError` when the build fails.
 */
function buildDeclarations(kit: string, repo: PublishedRepo): void {
  if (!repo.manifest.spellTypes) return
  try {
    execFileSync(process.execPath, [join(kit, "bin", "spell-types.ts")], { cwd: repo.root, stdio: "pipe" })
  } catch (error) {
    const output = (error as { stdout?: Buffer }).stdout?.toString() ?? ""
    throw new CLI.CliError(`${repo.name}'s declarations failed (spell-types):\n${output.slice(-2000)}`, CLI.EXIT.ERRORS)
  }
}

////////////////
// ## What it prints
////////////////

/** One package's lines:  name, size, files by top folder, what the build did. */
function packSummary(
  pkg: PackedPackage,
  built: { compiled: number; modules: number; copied: number; declarations: number }
): string {
  const folders = new Map<string, number>()
  for (const file of pkg.files) {
    const parts = file.split("/")
    const folder =
      parts.length > 2 && parts[0] === "dist" ? `dist/${parts[1]}/` : parts.length > 1 ? `${parts[0]}/` : file
    folders.set(folder, (folders.get(folder) ?? 0) + 1)
  }
  const list = [...folders].map(([folder, count]) => (count > 1 ? `${folder} ${count}` : folder)).join(",  ")
  return [
    chalk.bold(`${pkg.name}@${pkg.version}`) +
      `  ${CLI.relativePath(pkg.tgz)}:  ${pkg.files.length} files, ${kb(pkg.size)} packed, ${kb(pkg.unpackedSize)} unpacked`,
    chalk.dim(
      `  built:  ${built.compiled} compiled, ${built.modules} CSS / text / JSON modules, ${built.copied} copied, ` +
        `${built.declarations} declarations`
    ),
    chalk.dim(`  files:  ${list}`)
  ].join("\n")
}

/** One check's line. */
function checkLine(check: PublishCheck): string {
  const mark = check.ok ? chalk.green("  ✓") : chalk.red("  ✗")
  return `${mark} ${check.check}${check.detail ? chalk.dim(`  -- ${check.detail}`) : ""}`
}
