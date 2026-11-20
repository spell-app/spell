import { existsSync, readFileSync, realpathSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import JSON5 from "json5"

import { KIT_FILE, kitFileAt } from "./projectBin"

/**
 * Running your own kit checkout in a project that installs `spell` from npm (epic `repo-split` T69, T70):
 * one person runs Spell from their checkout, everyone else from npm, and nothing the project commits changes.
 * - Two ways to name the checkout:
 *   - for every project on the machine:  the `SPELL_KIT` environment variable, `export SPELL_KIT=~/www/spell`
 *   - for one project:  its `.spell/kit.json5`, each person's own (git-ignored), `{ kit: "~/www/spell" }`,
 *     written by `spell local on`
 *   - Both set:  the variable wins, so one command can try another checkout.
 * - Each published bin asks first (`checkoutToRun()`, `PublishedPackage`'s `writeBins()`), and runs the checkout's
 *   own bin instead;  the checkout's own bin never asks, so it never hands off twice.
 * - A project's git worktrees follow its main checkout's file (`kitFileAt()`, epic `repo-split` T72).
 * - Imports only node's own modules, `json5` and the bins' own `projectBin`:  it runs before anything else of the
 *   package.
 */
export const SPELL_KIT = "SPELL_KIT"

export { KIT_FILE }

/** Where the checkout to run is named, when it is:  `kitSetting()`. */
export type KitSetting = {
  /** the checkout's folder, resolved (`~/` is the home folder;  a file's relative path is from its project) */
  kit: string
  /** what named it:  `SPELL_KIT`, or the project's `KIT_FILE`, its full path */
  namedBy: string
  /** what it says, as written */
  setting: string
}

/**
 * The checkout to run, from `SPELL_KIT`, else the nearest `KIT_FILE` from `from` up;  `undefined` when neither names
 * one.
 * - `from`:  where the command was started (`INIT_CWD`, the folder `yarn` ran in;  else the process's own)
 * - throws when the file won't read, or names no `kit`
 */
export function kitSetting(
  from = process.env.INIT_CWD ?? process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): KitSetting | undefined {
  const variable = env[SPELL_KIT]?.trim()
  if (variable) return { kit: resolveKit(variable, process.cwd()), namedBy: SPELL_KIT, setting: variable }
  const file = kitFileFrom(from)
  if (!file) return undefined
  const { kit } = (JSON5.parse(readFileSync(file, "utf8")) ?? {}) as { kit?: unknown }
  if (typeof kit !== "string" || !kit.trim())
    throw new Error(`${file}:  names no checkout;  write { kit: "~/www/spell" }`)
  return { kit: resolveKit(kit.trim(), dirname(dirname(file))), namedBy: file, setting: kit.trim() }
}

/**
 * The nearest `KIT_FILE` from `from` up, as a full path;  else `undefined`.
 * - in a git worktree, its main checkout's counts at each folder (`kitFileAt()`)
 */
export function kitFileFrom(from: string): string | undefined {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    const file = kitFileAt(dir)
    if (file) return file
    if (dirname(dir) === dir) return undefined
  }
}

/**
 * Why `kit` can't run `binPath`, in words;  else `undefined`:
 * - no checkout of spell there, no such bin, not installed
 * - older than `installed`, the version the project installs from npm:  it'd miss what the project relies on
 *   (2026-11-19:  a checkout from before 0.8.15 refused `spell server local` in a project outside the kit)
 */
export function kitProblem(kit: string, binPath = "bin/spell.mjs", installed?: string): string | undefined {
  const manifest = join(kit, "package.json")
  if (!existsSync(manifest)) return `no package.json in ${kit}`
  const { name, version } = JSON.parse(readFileSync(manifest, "utf8")) as { name?: string; version?: string }
  if (name !== "spell") return `${kit} isn't a checkout of spell (its package.json isn't named spell)`
  if (!existsSync(join(kit, binPath))) return `${kit} has no ${binPath}`
  if (!existsSync(join(kit, "node_modules", "tsx"))) return `${kit} isn't installed yet:  run yarn install there`
  if (installed && version && isOlder(version, installed)) {
    return (
      `that checkout is spell ${version}, older than the ${installed} this project installs:  ` +
      `update it (cd ${kit} && git pull && yarn install)`
    )
  }
  return undefined
}

/** Whether version `a` comes before `b`:  their numbers compared in turn (`0.8.9` before `0.8.15`);  a tag ignored. */
export function isOlder(a: string, b: string): boolean {
  const numbers = (version: string) => version.split(/[-+]/)[0]!.split(".").map(Number)
  const [left, right] = [numbers(a), numbers(b)]
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0)
    if (difference) return difference < 0
  }
  return false
}

/** The version of the package `self` (a bin's `import.meta.url`) is in:  its nearest `package.json`'s;  else `undefined`. */
function versionOf(self: string): string | undefined {
  for (let dir = dirname(fileURLToPath(self)); ; dir = dirname(dir)) {
    const manifest = join(dir, "package.json")
    if (existsSync(manifest)) return (JSON.parse(readFileSync(manifest, "utf8")) as { version?: string }).version
    if (dirname(dir) === dir) return undefined
  }
}

/**
 * The checkout's own bin `binPath` (`bin/spell.mjs`) to run instead, as a URL to import, when `kitSetting()` names a
 * checkout other than the one `self` (a built bin's `import.meta.url`) is in;  else `undefined`, to run this copy.
 * - throws when the checkout named can't run, or is older than the package `self` is in, saying why (`kitProblem()`)
 *   and what named it.
 *   Never runs the npm copy instead:  you'd think you had your checkout's.
 */
export function kitCheckoutBin(
  binPath: string,
  self: string,
  from?: string,
  env?: NodeJS.ProcessEnv
): string | undefined {
  const named = kitSetting(from, env)
  if (!named) return undefined
  if (existsSync(named.kit) && isInside(fileURLToPath(self), realpathSync(named.kit))) return undefined
  const problem = kitProblem(named.kit, binPath, versionOf(self))
  if (problem) {
    const off = named.namedBy === SPELL_KIT ? `unset ${SPELL_KIT}` : `run spell local off`
    throw new Error(
      `${named.namedBy} names ${named.setting}:  ${problem};  fix it, or ${off} to run the installed spell`
    )
  }
  return pathToFileURL(join(named.kit, binPath)).href
}

/**
 * `kitCheckoutBin()` for a published bin:  its problem printed as one line, and the process ended (exit 1), rather
 * than a stack trace.
 * - `spell local off` never hands off:  so it works while the checkout named can't run.
 */
export function checkoutToRun(binPath: string, self: string, args = process.argv.slice(2)): string | undefined {
  if (args[0] === "local" && args[1] === "off") return undefined
  try {
    return kitCheckoutBin(binPath, self)
  } catch (error) {
    console.error((error as Error).message)
    process.exit(1)
  }
}

/** `setting` as a full path:  `~/` the home folder, a relative path from `base`. */
function resolveKit(setting: string, base: string): string {
  return resolve(base, setting.replace(/^~(?=\/|$)/, homedir()))
}

/** Whether `file`, with links followed, is inside `folder`. */
function isInside(file: string, folder: string): boolean {
  const real = existsSync(file) ? realpathSync(file) : file
  return real === folder || real.startsWith(folder + "/")
}
