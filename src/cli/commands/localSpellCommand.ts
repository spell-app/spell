import { spawnSync } from "node:child_process"
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"

import { CLI } from "spell/cli"
import { KIT_FILE, kitProblem, kitSetting, SPELL_KIT } from "spell/cli/kitCheckout"

/**
 * `spell dev local-spell [checkout] [--off | --status]`:  run your own Spell checkout in a project that installs
 * `spell` from npm, for you alone (epic `repo-split` T70).
 * - Writes the project's `KIT_FILE`, `.spell/kit.json5`, naming the checkout;  every published bin reads it and runs
 *   the checkout's own instead (`kitCheckoutBin()`).  `SPELL_KIT`, when set, wins over it.
 * - The project:  the nearest folder from where it was started up with a `package.json`.
 * - The checkout:  `checkout`, else the one this `spell` runs from when it's a checkout, else `~/www/spell`;
 *   it must be installed (`yarn install` there), or nothing is written.
 * - Keeps the file out of git:  adds `/.spell/` to the project's `.gitignore` when git doesn't ignore it yet.
 * - `--off`:  removes the file;  `--status`:  says which Spell runs here, and why, changing nothing.
 * - Throws `CliError` for a checkout that can't run, or `--off` with a checkout named.
 */
export async function localSpellCommand(checkout?: string, options: CLI.LocalSpellOptions = {}): Promise<number> {
  const from = process.env.INIT_CWD ?? process.cwd()
  const project = CLI.findCheckout("package.json", from, from)
  const file = join(project, KIT_FILE)
  if (options.status) return report(project, options)
  if (options.off) {
    if (checkout) throw new CLI.CliError("spell dev local-spell --off takes no checkout")
    const had = existsSync(file)
    rmSync(file, { force: true })
    if (options.json) CLI.out(JSON.stringify({ project, off: true, removed: had ? file : undefined }, null, 2))
    else
      CLI.out(had ? `npm's spell runs here again:  removed ${CLI.relativePath(file)}` : "npm's spell runs here already")
    warnVariable()
    return CLI.EXIT.OK
  }
  const kit = checkoutToUse(checkout)
  const problem = kitProblem(kit)
  if (problem) throw new CLI.CliError(`can't run your checkout:  ${problem}`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, kitFileText(kit))
  const ignored = keepOutOfGit(project)
  if (options.json) CLI.out(JSON.stringify({ project, kit, file, ignored }, null, 2))
  else {
    CLI.out(`Here, spell runs your checkout now:  ${shortPath(kit)}`)
    CLI.out(`- written:  ${CLI.relativePath(file)}, yours alone`)
    if (ignored) CLI.out(`- added /.spell/ to ${CLI.relativePath(ignored)}, so git leaves it out`)
    CLI.out("- back to npm's spell:  spell dev local-spell --off")
  }
  warnVariable()
  return CLI.EXIT.OK
}

/** `--status`:  which Spell runs in `project`, and what said so. */
function report(project: string, options: CLI.LocalSpellOptions): number {
  const named = kitSetting(project)
  const problem = named && kitProblem(named.kit)
  if (options.json) CLI.out(JSON.stringify({ project, ...named, problem }, null, 2))
  else if (!named) CLI.out("Here, spell runs npm's copy:  no .spell/kit.json5, and SPELL_KIT isn't set")
  else {
    const by = named.namedBy === SPELL_KIT ? SPELL_KIT : CLI.relativePath(named.namedBy)
    CLI.out(`Here, spell runs your checkout:  ${shortPath(named.kit)} (named by ${by})`)
    if (problem) CLI.out(`- but it can't run:  ${problem}`)
  }
  return problem ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** The checkout to name:  `checkout`, else the one this `spell` runs from when it's a checkout, else `~/www/spell`. */
function checkoutToUse(checkout?: string): string {
  if (checkout) return resolve(checkout.replace(/^~(?=\/|$)/, homedir()))
  if (existsSync(join(CLI.KIT_ROOT, "src", "cli", "main.ts"))) return CLI.KIT_ROOT
  return join(homedir(), "www", "spell")
}

/** The file's text:  the checkout, by `~/` when it's under the home folder. */
function kitFileText(kit: string): string {
  return [
    "// The Spell checkout `spell` runs here, instead of npm's:  yours alone, never committed.",
    "// Written by `spell dev local-spell`;  `spell dev local-spell --off` removes it.",
    `{ kit: ${JSON.stringify(shortPath(kit))} }`,
    ""
  ].join("\n")
}

/**
 * Adds `/.spell/` to `project`'s `.gitignore` when git doesn't ignore `KIT_FILE` yet;  the `.gitignore` changed, or
 * `undefined` (already ignored, or no git there).
 */
function keepOutOfGit(project: string): string | undefined {
  const check = spawnSync("git", ["check-ignore", "-q", KIT_FILE], { cwd: project })
  // 0:  ignored;  1:  not ignored;  128:  no git repo here
  if (check.status !== 1) return undefined
  const gitignore = join(project, ".gitignore")
  const before = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : ""
  const gap = before && !before.endsWith("\n") ? "\n\n" : before ? "\n" : ""
  appendFileSync(
    gitignore,
    `${gap}# each person's own Spell settings (spell dev local-spell):  never committed\n/.spell/\n`
  )
  return gitignore
}

/** One line when `SPELL_KIT` is set:  it wins over the project's file. */
function warnVariable(): void {
  const variable = process.env[SPELL_KIT]?.trim()
  if (variable) CLI.out(`NOTE:  ${SPELL_KIT}=${variable} is set, and wins over this project's file while it is`)
}

/** `path`, with `~/` for the home folder. */
function shortPath(path: string): string {
  const fromHome = relative(homedir(), path)
  return fromHome && !fromHome.startsWith("..") ? `~/${fromHome}` : path
}
