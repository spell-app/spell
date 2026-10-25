import chalk from "chalk"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"

import { kb } from "spell/util/number"
import { readJSON5File } from "spell/util/node/json5"
import { CLI } from "spell/cli"
import {
  PACKS_FOLDER,
  PublishedPackage,
  STAGE_FOLDER,
  ScratchInstall,
  type PackedPackage,
  type PublishCheck,
  type PublishedRepo,
  type SourceManifest
} from "spell/cli/publish"

/**
 * `spell publish [--dry-run] [--no-scratch] [--json]`:  every repo that publishes, built, packed and checked, then
 * published to npm, lowest first (epic `repo-split` P19).
 * - Which repos:  the kit, `spell`, then each installed child repo with a `"spellPublish"` in its `package.json`,
 *   lowest first (`repos.json5`):  `spell`, then `spell-parser` and `spell-ui`, then `spell-epic` and `spell-app`.
 * - Each one:  its declarations rebuilt (`spell-types`, where it has them), then staged and packed by
 *   `PublishedPackage` into the kit's `dist-packs/` (git-ignored), its file list summed up and checked.
 * - ONE version for all:  the kit's `package.json` `version`, stamped on every package and on their dependencies on
 *   each other.  A checkout's own `version` that differs is reported, never published.
 * - `npm install spell` brings everything:  the published `spell` depends on every other package (only the PACKED
 *   one:  in the checkout they stay workspaces).
 * - Then the scratch install (`ScratchInstall`):  the packed files installed outside the checkout, a node import,
 *   a Vite page with a `<ui-button>`, `npx spell help`.  `--no-scratch` skips it (it needs the network).
 * - `--dry-run`:  stops there;  publishes nothing.
 *   Without it, and only when every check passed:  `npm publish <tgz>` for each, lowest first.
 *   NOTE: `npm login` first;  npm asks for a one-time password itself when the account has one.
 * - Which kit:  the nearest from the current folder (`findCheckout(KIT_MARKER)`).
 * - Exits 1 when a check fails or a publish does.
 */
export async function publishCommand(options: CLI.PublishOptions = {}): Promise<number> {
  const kit = CLI.findCheckout(CLI.KIT_MARKER)
  const repos = publishedRepos(kit)
  const kitManifest = repos[0]!.manifest
  const version = kitManifest.version
  const packsDir = join(kit, PACKS_FOLDER)
  rmSync(packsDir, { recursive: true, force: true })
  mkdirSync(join(packsDir, STAGE_FOLDER), { recursive: true })

  const catalog = yarnCatalog(kit)
  const others = Object.fromEntries(repos.slice(1).map((repo) => [repo.name, version]))
  const say = options.json ? () => {} : CLI.out
  const checks: PublishCheck[] = []
  const packed: PackedPackage[] = []
  say(chalk.bold(`spell publish${options.dryRun ? " --dry-run" : ""}:  ${repos.length} packages at ${version}`))

  for (const repo of repos) {
    if (repo.manifest.version !== version) {
      say(chalk.dim(`  ${repo.name}'s checkout says ${repo.manifest.version}:  published as ${version}`))
    }
    buildDeclarations(kit, repo)
    const pkg = new PublishedPackage(
      repo,
      join(packsDir, STAGE_FOLDER, repo.name),
      version,
      repo === repos[0] ? others : {},
      catalog
    )
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
 * The repos that publish, lowest first:  the kit, then each child repo `repos.json5` lists that's in the kit and has
 * a `"spellPublish"` (a repo without one never publishes:  spell-brand).
 * - Throws `CliError` when the kit has no `"spellPublish"` of its own.
 */
export function publishedRepos(kit: string): PublishedRepo[] {
  const repos: PublishedRepo[] = []
  const names = readJSON5File<{ repos?: { name: string }[] }>(join(kit, CLI.KIT_MARKER)).repos?.map((r) => r.name) ?? []
  for (const root of [kit, ...names.map((name) => join(kit, name))]) {
    const file = join(root, "package.json")
    if (!existsSync(file)) continue
    const manifest = JSON.parse(readFileSync(file, "utf8")) as SourceManifest
    if (manifest.spellPublish) repos.push({ name: manifest.name, root, manifest, settings: manifest.spellPublish })
  }
  if (repos[0]?.root !== kit) throw new CLI.CliError(`${kit}'s package.json has no "spellPublish":  nothing to publish`)
  return repos
}

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
