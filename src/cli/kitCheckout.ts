import { existsSync, readFileSync, realpathSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

/**
 * The environment variable naming a kit checkout to run instead of an npm install of `spell`:
 * `export SPELL_KIT=~/www/spell`.
 * - So one person runs Spell from their own checkout, in a project everyone else runs from npm, changing nothing
 *   the project commits (epic `repo-split` T69).
 */
export const SPELL_KIT = "SPELL_KIT"

/**
 * The checkout's own bin `binPath` (`bin/spell.mjs`) to run instead, as a URL to import, when `SPELL_KIT` names a kit
 * checkout other than the one `self` (a built bin's `import.meta.url`) is in;  else `undefined`, to run this copy.
 * - Each published bin calls it first, through `checkoutToRun()` (`PublishedPackage`'s `writeBins()`).
 * - The checkout's own bin never does, so it never hands off twice.
 * - A leading `~/` is the home folder.
 * - throws when `SPELL_KIT` names no runnable checkout, saying why:  no `package.json` named `spell`, no such bin, or
 *   not installed yet (`yarn install` there).  Never runs the npm copy instead:  you'd think you had your checkout's.
 * - Imports only node's own modules:  it runs before anything else of the package.
 */
export function kitCheckoutBin(binPath: string, self: string, env = process.env): string | undefined {
  const setting = env[SPELL_KIT]?.trim()
  if (!setting) return undefined
  const kit = resolve(setting.replace(/^~(?=\/|$)/, homedir()))
  const die = (problem: string) => {
    throw new Error(`${SPELL_KIT}=${setting}:  ${problem};  fix it, or unset ${SPELL_KIT} to run the installed spell`)
  }
  const manifest = join(kit, "package.json")
  if (!existsSync(manifest)) die(`no package.json in ${kit}`)
  if ((JSON.parse(readFileSync(manifest, "utf8")) as { name?: string }).name !== "spell") {
    die(`${kit} isn't a checkout of spell (its package.json isn't named spell)`)
  }
  if (isInside(fileURLToPath(self), realpathSync(kit))) return undefined
  const bin = join(kit, binPath)
  if (!existsSync(bin)) die(`${kit} has no ${binPath}`)
  if (!existsSync(join(kit, "node_modules", "tsx"))) die(`${kit} isn't installed yet:  run yarn install there`)
  return pathToFileURL(bin).href
}

/** Whether `file`, with links followed, is inside `folder`. */
function isInside(file: string, folder: string): boolean {
  const real = existsSync(file) ? realpathSync(file) : file
  return real === folder || real.startsWith(folder + "/")
}

/**
 * `kitCheckoutBin()` for a published bin:  its problem printed as one line, and the process ended (exit 1), rather
 * than a stack trace.
 */
export function checkoutToRun(binPath: string, self: string): string | undefined {
  try {
    return kitCheckoutBin(binPath, self)
  } catch (error) {
    console.error((error as Error).message)
    process.exit(1)
  }
}
