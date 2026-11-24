import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import JSON5 from "json5"

/****************
 * ### MORE SPACES
 * More SPACES FOLDERS the kit's page server serves beside spell.spaces, each for orgs of its own:  a project's
 * `spaces/`, whose `@acme/` the kit's server then opens at `/run/@acme/tools/dashboard`, with no second page server
 * (`--spaces`).
 * - Kept in ONE file, this machine's own, never committed:  `~/.spell/more-spaces.json5` (`MORE_SPACES_FILE`;
 *   `SPELL_MORE_SPACES_FILE` names another, e.g. a scratch server's)
 *
 *   ```json5
 *   { spaces: ["~/work/acme-app/spaces", { folder: "~/work/beta.worktrees/fix/spaces", orgs: ["beta"] }] }
 *   ```
 *
 *   - each a folder, every org it holds served from it;  or `{ folder, orgs }`, only those
 *   - any checkout's `spaces/`:  a project's main, or one of its worktrees', to see work before it's merged
 *   - ONE folder per org:  an org two name is the first one's;  `@spell` is never taken from spell.spaces
 * - Read by spell-app as it loads (its `spellSpacesDir.ts`), written by `switchSpaces()`:  `spell spaces use <folder>`,
 *   and the epic hub's `POST /api/servers/editor-spaces` (spell-epic's `ServerKeeper.showInEditor()`)
 * - Node built-ins and json5 only:  spell-app's lightest module loads it.
 ****************/

/** The file:  `SPELL_MORE_SPACES_FILE`, else `~/.spell/more-spaces.json5`. */
export const MORE_SPACES_FILE = process.env.SPELL_MORE_SPACES_FILE
  ? resolve(process.env.SPELL_MORE_SPACES_FILE)
  : join(homedir(), ".spell", "more-spaces.json5")

/** One of the file's `spaces`:  a folder, or a folder for some of its orgs alone. */
export type MoreSpacesEntry = string | { folder: string; orgs?: string[] }

/** One more spaces folder, as served:  where it is, and the orgs served from it (`acme` for its `@acme/`). */
export type MoreSpaces = { dir: string; orgs: string[] }

/** The file's `spaces`, as written;  none when it isn't there, or won't read (said on the console).  NEVER throws. */
export function moreSpacesInFile(file: string = MORE_SPACES_FILE): MoreSpacesEntry[] {
  if (!existsSync(file)) return []
  try {
    const { spaces } = JSON5.parse(readFileSync(file, "utf8")) as { spaces?: unknown }
    if (!Array.isArray(spaces)) return []
    return spaces.filter(
      (each): each is MoreSpacesEntry =>
        typeof each === "string" || (typeof each === "object" && typeof each?.folder === "string")
    )
  } catch (error) {
    console.error(`${file} won't read, so no more spaces are served:`, error)
    return []
  }
}

/**
 * What `entries` serve:  each folder that's there with the orgs it serves, first come first served;  never `@spell`.
 * - a folder that isn't there is left out, and said on the console
 */
export function servedSpaces(entries: MoreSpacesEntry[]): MoreSpaces[] {
  const taken = new Set(["spell"])
  const found: MoreSpaces[] = []
  for (const entry of entries) {
    const { folder, orgs: only } = typeof entry === "string" ? { folder: entry, orgs: undefined } : entry
    const dir = homeExpanded(folder)
    if (!existsSync(dir)) {
      console.warn(`More spaces:  ${dir} isn't there, so it's left out (${MORE_SPACES_FILE})`)
      continue
    }
    const orgs = orgsIn(dir).filter((org) => !taken.has(org) && (!only || only.includes(org)))
    for (const org of orgs) taken.add(org)
    found.push({ dir, orgs })
  }
  return found
}

/**
 * Serve spaces folder `folder` for the orgs it holds, or for `org` alone:  written into the file, in place of the
 * folder that served them, so each org has ONE.  Returns the orgs it now serves.
 * - The page server reads the file as it starts:  the caller restarts it.
 * - throws a `TypeError` for a folder that isn't there, holds no org's folder, or not `org`'s
 */
export function switchSpaces(folder: string, { org, file = MORE_SPACES_FILE }: { org?: string; file?: string } = {}): string[] {
  const dir = homeExpanded(folder)
  if (!existsSync(dir)) throw new TypeError(`there's no folder ${dir}`)
  const held = orgsIn(dir).filter((one) => one !== "spell")
  const only = org?.replace(/^@/, "")
  if (only && !held.includes(only)) throw new TypeError(`${dir} holds no @${only}/ folder`)
  if (!held.length) throw new TypeError(`${dir} holds no org's folder, such as @acme/:  is it a spaces folder?`)
  const orgs = only ? [only] : held
  const kept = moreSpacesInFile(file).flatMap((entry): MoreSpacesEntry[] => {
    const { folder: other, orgs: was } = typeof entry === "string" ? { folder: entry, orgs: undefined } : entry
    const otherDir = homeExpanded(other)
    if (otherDir === dir && !only) return []
    const serves = (was ?? orgsIn(otherDir)).filter((one) => !orgs.includes(one))
    if (!serves.length) return []
    return serves.length === (was ?? orgsIn(otherDir)).length ? [entry] : [{ folder: other, orgs: serves }]
  })
  writeMoreSpaces([...kept, only ? { folder: dir, orgs } : dir], file)
  return orgs
}

/** Write `spaces` into the file:  a comment saying what it is, then `{ spaces: [...] }`. */
export function writeMoreSpaces(spaces: MoreSpacesEntry[], file: string = MORE_SPACES_FILE): void {
  mkdirSync(dirname(file), { recursive: true })
  const text = [
    "// More spaces folders the kit's page server serves beside spell.spaces, one per org:  this machine's own.",
    "// `spell spaces use <folder>` writes it;  `spell spaces` says what's served.",
    `${JSON.stringify({ spaces }, null, 2)}\n`
  ].join("\n")
  writeFileSync(file, text)
}

/** `~/work/spaces` as a whole path:  `~` is the home folder. */
export function homeExpanded(name: string): string {
  return resolve(name.replace(/^~(?=$|\/)/, homedir()))
}

/** The orgs a spaces folder holds:  `acme` for its `@acme/` folder;  none when it isn't there. */
export function orgsIn(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^@[a-z][a-z0-9_]*$/.test(entry.name))
    .map((entry) => entry.name.slice(1))
    .sort()
}
