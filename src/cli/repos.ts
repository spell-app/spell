import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { kitFolders } from "spell/server/kitFolders"
import { CLI } from "spell/cli"

/**
 * Every part of `spell` that adds to it, lowest first:  the kit, then each of its folders whose `package.json` has a
 * `"spell"` entry (epic `repo-split` Q33;  the folders since P20, One Repo:  `parser/`, `ui/`, `epic/`, `app/`).
 * - Which folders:  the kit's `package.json`'s `workspaces`, in its order (`kitFolders()`), the same list wherever the
 *   kit is:  a checkout, or installed from npm (`<project>/node_modules/spell/`).
 * - `kit`:  the kit to look in, default the one `spell` runs from;  a test passes a made-up one.
 * - NEVER throws for a folder that isn't there:  it isn't listed.
 */
export function spellRepos(kit = CLI.KIT_ROOT): CLI.SpellRepo[] {
  return [kit, ...kitFolders(kit)].flatMap((root) => repoAt(root) ?? [])
}

/**
 * The word a part's commands go under in a clash:  the kit's, `spell`, is `kit`;  a folder's is its package name less
 * `spell-` (`spell-parser` => `parser`:  `spell parser check`).
 */
function shortNameFor(name: string): string {
  return name === "spell" ? "kit" : name.replace(/^spell-/, "")
}

/** The repo at `root`, when its `package.json` has a `"spell"` entry;  else `undefined`. */
function repoAt(root: string): CLI.SpellRepo | undefined {
  const file = join(root, "package.json")
  if (!existsSync(file)) return undefined
  const json = JSON.parse(readFileSync(file, "utf8")) as { name: string; version?: string; spell?: CLI.SpellEntry }
  if (!json.spell) return undefined
  const { commands, hooks } = json.spell
  return {
    name: json.name,
    short: shortNameFor(json.name),
    root,
    version: json.version ?? "0.0.0",
    ...(commands && { commands: resolve(root, commands) }),
    ...(hooks && { hooks: resolve(root, hooks) })
  }
}

/**
 * Each of `repos`' command lists, loaded:  the default export of its `"commands"` file.
 * - Throws when a file names no function:  a repo's mistake, said plainly.
 */
export async function commandLists(repos: CLI.SpellRepo[]): Promise<Array<[CLI.SpellRepo, CLI.CommandList]>> {
  const lists: Array<[CLI.SpellRepo, CLI.CommandList]> = []
  for (const repo of repos) {
    if (!repo.commands) continue
    const list = ((await import(pathToFileURL(repo.commands).href)) as { default?: CLI.CommandList }).default
    if (typeof list !== "function") {
      throw new TypeError(`spellRepos():  ${repo.commands} (${repo.name}'s "spell.commands") has no default function`)
    }
    lists.push([repo, list])
  }
  return lists
}

/**
 * What hook `name` loads, from the lowest repo that has it;  `undefined` when no installed repo does.
 * - The hooks are each repo's `"spell": { "hooks" }` file (`HookList`), loaded only now:  `spell help` never does.
 * - `repos`:  default every installed repo (`spellRepos()`)
 */
export async function hook<T>(name: string, repos = spellRepos()): Promise<T | undefined> {
  for (const repo of repos) {
    if (!repo.hooks) continue
    const hooks = ((await import(pathToFileURL(repo.hooks).href)) as { default?: CLI.HookList }).default
    const load = hooks?.[name]
    if (load) return (await load()) as T
  }
  return undefined
}

/**
 * What hook `name` loads (`hook()`), or a `CliError` saying `missing` when no installed repo has it:
 * e.g. "spell compile needs spell-app's projects for now:  yarn clone spell-app".
 */
export async function needHook<T>(name: string, missing: string): Promise<T> {
  const found = await hook<T>(name)
  if (found === undefined) throw new CLI.CliError(missing)
  return found
}
