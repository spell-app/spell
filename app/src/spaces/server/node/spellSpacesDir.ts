import { existsSync, readdirSync } from "fs"
import { basename, delimiter, dirname, join, resolve } from "path"
import { fileURLToPath } from "url"

// The server's checkout finder, node built-ins only:  the main checkout from any worktree.
import { checkoutOf } from "spell/server/checkout"
// the more spaces file's reader, node built-ins and json5 only
import { MORE_SPACES_FILE, moreSpacesInFile, servedSpaces, type MoreSpaces } from "spell/server/MoreSpaces"
// constants only, from a module that imports nothing:  by its `.ts` name, as the app's Vite config loads this in plain node
import { GROUP_PAGE_PROJECT } from "spell/app/spaces/models/spaceNames.ts"

export type { MoreSpaces }

/**
 * Where this checkout is, and where spell.spaces is:  the part of `environment` that loads anywhere.
 * - Apart from `environment` because that file reads `import.meta.resolve`, which Vitest's global setup can't run:
 *   the check of the real space after a test run (`tests/realSpaceCheck.ts`) needs only this.
 * - NEVER imports anything of spell-app's but one constant, from a module that imports nothing (`spaceNames.ts`):
 *   the app's Vite config loads it too, for an org group's page (`orgGroupFolders()`).
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
 * The more spaces folders this program serves, from `env` and the kit's file (`spell/server/MoreSpaces`:
 * `~/.spell/more-spaces.json5`, which `spell spaces use <folder>` writes):  each folder, with the orgs served from it.
 * - `SPELL_MORE_SPACES` overrides the file:  folders split by the path delimiter (`:`), empty for none.  Tests set it,
 *   and never read the person's file (`VITEST`).
 * - `kitOwn`:  are the spaces the kit's own spell.spaces?  Else the file isn't read:  a page server given `--spaces`
 *   (`SPELL_SPACES_DIR`, `spell server local`) serves exactly that folder, as before.
 * - NEVER throws.
 */
export function moreSpacesFrom({
  env = process.env,
  file = MORE_SPACES_FILE,
  kitOwn = !env.SPELL_SPACES_DIR || resolve(env.SPELL_SPACES_DIR) === defaultSpellSpacesDir
}: { env?: NodeJS.ProcessEnv; file?: string; kitOwn?: boolean } = {}): MoreSpaces[] {
  const entries =
    env.SPELL_MORE_SPACES !== undefined
      ? env.SPELL_MORE_SPACES.split(delimiter).filter(Boolean)
      : env.VITEST || !kitOwn
        ? []
        : moreSpacesInFile(file)
  return servedSpaces(entries)
}

/** This program's more spaces folders, read once as it loads (`moreSpacesFrom()`). */
export const moreSpaces: MoreSpaces[] = moreSpacesFrom()

/**
 * The ONE answer to "which spaces folder holds org `org`?":  the more spaces folder serving it, else spell.spaces.
 * - `@acme` => `~/work/acme-app/spaces` when that folder serves `@acme/`
 */
export function spacesDirForOrg(org: string, more: MoreSpaces[] = moreSpaces, spaces = spellSpacesDir): string {
  return more.find((each) => each.orgs.includes(org))?.dir ?? spaces
}

////////////////
// ## An org group's own page
////////////////

/**
 * What the editor's servers ask of an org group's address on disk, to pick the page it opens (`editorPageFor()`):
 * `orgGroupFolders(more)` answers from the spaces folders serving each org (`spacesDirForOrg()`).
 * - `more`:  default this program's own (`moreSpaces`);  the editor's dev server passes the file read again
 *   (`moreSpacesFrom()`), as it outlives the page server that started it.
 */
export function orgGroupFolders(more: MoreSpaces[] = moreSpaces): OrgGroupFolders {
  return {
    isGroup: (group) => isOrgGroup(group, more),
    hasOwnPage: (group) => groupHasOwnPage(group, more)
  }
}

/** What `orgGroupFolders()` answers, for an org group's address, `@acme/org-spell`. */
export type OrgGroupFolders = {
  /** is it an org's group:  a folder of projects, not a project itself */
  isGroup: (group: string) => boolean
  /** does it hold its own page (`groupHasOwnPage()`) */
  hasOwnPage: (group: string) => boolean
}

/**
 * Is `group`, `@acme/org-spell`, an org's GROUP on disk:  a folder in the org's, not a project itself (no project
 * file), holding at least one project?  As the page server finds them (`orgGroupsIn()`).
 * - `false` for an address that isn't `@<org>/<group>`.  NEVER throws.
 */
export function isOrgGroup(group: string, more: MoreSpaces[] = moreSpaces): boolean {
  const folder = groupFolder(group, more)
  if (!folder || !existsSync(folder) || existsSync(join(folder, PROJECT_FILE))) return false
  try {
    return readdirSync(folder, { withFileTypes: true }).some(
      (entry) => entry.isDirectory() && existsSync(join(folder, entry.name, PROJECT_FILE))
    )
  } catch {
    return false
  }
}

/** Where org group `group`, `@acme/org-spell`, is on disk;  `undefined` for an address that isn't `@<org>/<group>`. */
function groupFolder(group: string, more: MoreSpaces[]): string | undefined {
  const org = ORG_GROUP_ADDRESS.exec(group)?.[1]
  return org ? join(spacesDirForOrg(org, more), group) : undefined
}

/** A project's file, spell's `SP.PROJECT_FILE`:  spell's barrel won't load in plain node, as this does for Vite. */
const PROJECT_FILE = "__project.json5"

/** An org group's address:  `@acme/org-spell`. */
const ORG_GROUP_ADDRESS = /^@([a-z][a-z0-9_]*)\/[a-z][a-z0-9_-]*$/i

/**
 * Does org group `group`, `@acme/org-spell`, hold its OWN PAGE:  a project named `home` (`GROUP_PAGE_PROJECT`),
 * in the spaces folder serving its org (`spacesDirForOrg()`)?
 * - Read from disk each time it's asked.
 * - `false` for an address that isn't `@<org>/<group>`.  NEVER throws.
 */
export function groupHasOwnPage(group: string, more: MoreSpaces[] = moreSpaces): boolean {
  const folder = groupFolder(group, more)
  return !!folder && existsSync(join(folder, GROUP_PAGE_PROJECT, PROJECT_FILE))
}
