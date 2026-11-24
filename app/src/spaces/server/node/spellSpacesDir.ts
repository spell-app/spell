import { existsSync, readdirSync, readFileSync } from "fs"
import { homedir } from "os"
import { basename, delimiter, dirname, join, resolve } from "path"
import { fileURLToPath } from "url"
import JSON5 from "json5"

// The server's checkout finder, node built-ins only:  the main checkout from any worktree.
import { checkoutOf } from "spell/server/checkout"

/**
 * Where this checkout is, and where spell.spaces is:  the part of `environment` that loads anywhere.
 * - Apart from `environment` because that file reads `import.meta.resolve`, which Vitest's global setup can't run:
 *   the check of the real space after a test run (`tests/realSpaceCheck.ts`) needs only this.
 * - NEVER imports anything of spell-app's.
 * - Reads the MORE SPACES folders too (`moreSpaces`):  the orgs this machine serves from folders of their own.
 */

/** spaces' folder, `src/spaces/`:  this file is in `src/spaces/server/node/`. */
const spacesSrcDir = resolve(fileURLToPath(import.meta.url), "..", "..", "..")
/** The app folder's code:  `app/src/` in a checkout, `dist/app/` in the published `spell`. */
const codeDir = resolve(spacesSrcDir, "..")
/**
 * This checkout's root:  the main one, or a worktree's.
 * - spell-app's code is in its one `src/`, a folder each (`src/app/`, `src/spaces/` ...), since epic `repo-split` P14
 *   (folders at the root since P8, `packages/` before).
 * - In the published `spell` the code is built into `dist/app/`, and the rest (`spaces/`) is in its `app/`:
 *   so the root is that `app/` (epic `repo-split` P22).
 */
export const repoDir =
  basename(codeDir) === "src" ? dirname(codeDir) : join(dirname(dirname(codeDir)), basename(codeDir))
/** Is this a checkout's source (`app/src/`), not the published `spell`'s build (`dist/app/`)? */
export const isSourceCheckout = basename(codeDir) === "src"
/**
 * The MAIN checkout's root, from this checkout's:  the one a worktree's git shares (`SRV.checkoutOf()`).
 * - found wherever the worktree's folder is
 * - spell.spaces sits beside it, so every worktree reads the same spaces.
 */
const mainRepoDir = checkoutOf(repoDir)?.main ?? repoDir

/**
 * spell.spaces:  every person's and org's space (decisions Q10, Q24).
 * - ONE folder for main and every worktree, outside git.
 * - By default it's beside the main checkout, `<main checkout>/../spell.spaces`:
 *   `~/www/spell.spaces` (`../spell-spaces` before epic `repo-split` P8).
 * - `SPELL_SPACES_DIR` sets it, e.g. tests' temporary folder.
 * - Laid out by org, each person's space inside it:  `@spell/owen@/errors/` is `owen@spell/errors`.
 * - The page server's `--spaces <dir>` sets it (P8).
 */
export const spellSpacesDir = process.env.SPELL_SPACES_DIR
  ? resolve(process.env.SPELL_SPACES_DIR)
  : resolve(dirname(mainRepoDir), "spell.spaces")

/** spell.spaces when `SPELL_SPACES_DIR` doesn't set it:  beside the main checkout. */
export const defaultSpellSpacesDir = resolve(dirname(mainRepoDir), "spell.spaces")

////////////////
// ## More spaces folders
////////////////

/**
 * More SPACES FOLDERS this machine's page server serves beside spell.spaces, each holding orgs of its own:
 * a project's `spaces/`, whose `@acme/` the kit's server then opens at `/run/@acme/tools/dashboard`, with no second
 * page server (`--spaces`).
 * - Set in `~/.spell/more-spaces.json5` (`MORE_SPACES_FILE`), this machine's own, never committed:
 *   `{ spaces: ["~/work/acme-app/spaces"] }`
 * - `SPELL_MORE_SPACES` overrides it:  folders split by the path delimiter (`:`), empty for none.  Tests set it, and
 *   never read the person's file (`VITEST`).
 * - The file is read only where the spaces are the kit's own spell.spaces:  a page server given `--spaces`
 *   (`SPELL_SPACES_DIR`, `spell server local`) serves exactly that folder, as before.
 * - A folder that isn't there is left out, and said once on the console.
 */
export const MORE_SPACES_FILE = join(homedir(), ".spell", "more-spaces.json5")

/** One more spaces folder:  where it is, and the orgs it holds (`acme` for its `@acme/`). */
export type MoreSpaces = { dir: string; orgs: string[] }

/**
 * The more spaces folders, from `env` and the config `file` (see `MORE_SPACES_FILE`).
 * - `kitOwn`:  are the spaces the kit's own?  Else the file isn't read (`SPELL_MORE_SPACES` still counts).
 * - Each folder's orgs:  its `@org/` folders, never `@spell` (Spell's own org stays in spell.spaces);  an org in two
 *   folders is the first one's.
 * - NEVER throws:  a file that won't read is none, said on the console.
 */
export function moreSpacesFrom({
  env = process.env,
  file = MORE_SPACES_FILE,
  kitOwn = !env.SPELL_SPACES_DIR || resolve(env.SPELL_SPACES_DIR) === defaultSpellSpacesDir
}: { env?: NodeJS.ProcessEnv; file?: string; kitOwn?: boolean } = {}): MoreSpaces[] {
  const named =
    env.SPELL_MORE_SPACES !== undefined
      ? env.SPELL_MORE_SPACES.split(delimiter).filter(Boolean)
      : env.VITEST || !kitOwn
        ? []
        : foldersInFile(file)
  const taken = new Set(["spell"])
  const found: MoreSpaces[] = []
  for (const name of named) {
    const dir = resolve(name.replace(/^~(?=$|\/)/, homedir()))
    if (!existsSync(dir)) {
      console.warn(`More spaces:  ${dir} isn't there, so it's left out (${MORE_SPACES_FILE})`)
      continue
    }
    const orgs = orgsIn(dir).filter((org) => !taken.has(org))
    for (const org of orgs) taken.add(org)
    found.push({ dir, orgs })
  }
  return found
}

/** The folders `file` names (`{ spaces: [...] }`);  none when it isn't there, or won't read. */
function foldersInFile(file: string): string[] {
  if (!existsSync(file)) return []
  try {
    const { spaces } = JSON5.parse(readFileSync(file, "utf8")) as { spaces?: unknown }
    return Array.isArray(spaces) ? spaces.filter((each): each is string => typeof each === "string") : []
  } catch (error) {
    console.error(`${file} won't read, so no more spaces are served:`, error)
    return []
  }
}

/** The orgs a spaces folder holds:  `acme` for its `@acme/` folder. */
function orgsIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^@[a-z][a-z0-9_]*$/.test(entry.name))
    .map((entry) => entry.name.slice(1))
    .sort()
}

/** This program's more spaces folders, read once as it loads (`moreSpacesFrom()`). */
export const moreSpaces: MoreSpaces[] = moreSpacesFrom()

/**
 * The ONE answer to "which spaces folder holds org `org`?":  the more spaces folder holding it, else spell.spaces.
 * - `@acme` => `~/work/acme-app/spaces` when that folder holds `@acme/`
 */
export function spacesDirForOrg(org: string, more: MoreSpaces[] = moreSpaces, spaces = spellSpacesDir): string {
  return more.find((each) => each.orgs.includes(org))?.dir ?? spaces
}
