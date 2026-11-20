import { spawnSync } from "node:child_process"
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"

import { CLI } from "spell/cli"
import { KIT_FILE, kitProblem, kitSetting, SPELL_KIT } from "spell/cli/kitCheckout"
import { PathLink, type PathLinkResult, type PathUnlinkResult } from "spell/cli/PathLink"

/**
 * `spell local [status | on [checkout] | off]`:  run your own Spell checkout in a project that installs `spell` from
 * npm, for you alone (epic `repo-split` T70).
 * - `on` writes the project's `KIT_FILE`, `.spell/kit.json5`, naming the checkout;  every published bin reads it and runs
 *   the checkout's own instead (`kitCheckoutBin()`).  `SPELL_KIT`, when set, wins over it.
 * - The project:  the nearest folder from where it was started up with a `package.json`.
 * - The checkout:  `checkout`, else the one this `spell` runs from when it's a checkout, else `~/www/spell`;
 *   it must be installed (`yarn install` there), or nothing is written.
 * - Keeps the file out of git:  adds `/.spell/` to the project's `.gitignore` when git doesn't ignore it yet.
 * - Puts `spell` on your `PATH` too, linked to the checkout, as `yarn cli:install` does (`PathLink.linkFor()`,
 *   epic `repo-split` T71):  so you type `spell`, not `yarn spell`, here and in the checkout.
 * - `off`:  removes the file, and the `PATH` link once no project runs a checkout, when `spell local` made it
 *   (`PathLink.unlinkFor()`);  a link you made yourself stays.
 * - `status` (the default):  says which Spell runs here, and why, and where `spell` on your `PATH` leads;
 *   changes nothing.
 * - Throws `CliError` for a checkout that can't run, a checkout named to `off` or `status`, or another verb.
 */
export async function localCommand(
  verb = "status",
  checkout?: string,
  options: CLI.LocalOptions = {}
): Promise<number> {
  if (!LOCAL_VERBS.includes(verb)) throw new CLI.CliError(`unknown verb '${verb}':  ${LOCAL_VERBS.join(", ")}`)
  if (checkout && verb !== "on") throw new CLI.CliError(`spell local ${verb} takes no checkout`)
  const from = process.env.INIT_CWD ?? process.cwd()
  const project = CLI.findCheckout("package.json", from, from)
  const file = join(project, KIT_FILE)
  if (verb === "status") return report(project, options)
  if (verb === "off") {
    const had = existsSync(file)
    rmSync(file, { force: true })
    const path = new PathLink().unlinkFor(project)
    if (options.json) CLI.out(JSON.stringify({ project, off: true, removed: had ? file : undefined, path }, null, 2))
    else {
      CLI.out(had ? `npm's spell runs here again:  removed ${CLI.relativePath(file)}` : "npm's spell runs here already")
      const line = unlinkLine(path, had)
      if (line) CLI.out(line)
    }
    warnVariable()
    return CLI.EXIT.OK
  }
  const kit = checkoutToUse(checkout)
  const problem = kitProblem(kit)
  if (problem) throw new CLI.CliError(`can't run your checkout:  ${problem}`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, kitFileText(kit))
  const ignored = keepOutOfGit(project)
  const path = new PathLink().linkFor(project, join(kit, CHECKOUT_BIN))
  if (options.json) CLI.out(JSON.stringify({ project, kit, file, ignored, path }, null, 2))
  else {
    CLI.out(`Here, spell runs your checkout now:  ${shortPath(kit)}`)
    CLI.out(`- written:  ${CLI.relativePath(file)}, yours alone`)
    if (ignored) CLI.out(`- added /.spell/ to ${CLI.relativePath(ignored)}, so git leaves it out`)
    for (const line of linkLines(path)) CLI.out(line)
    CLI.out("- back to npm's spell:  spell local off")
  }
  warnVariable()
  return CLI.EXIT.OK
}

/** `spell local`'s verbs, the default first. */
const LOCAL_VERBS = ["status", "on", "off"]

/** A checkout's `spell`, from its root:  what the `PATH` link leads to. */
const CHECKOUT_BIN = "bin/spell.mjs"

/** `status`:  which Spell runs in `project`, and what said so. */
function report(project: string, options: CLI.LocalOptions): number {
  const named = kitSetting(project)
  const problem = named && kitProblem(named.kit)
  const path = new PathLink().status()
  if (options.json) CLI.out(JSON.stringify({ project, ...named, problem, path }, null, 2))
  else {
    if (!named) CLI.out("Here, spell runs npm's copy:  no .spell/kit.json5, and SPELL_KIT isn't set")
    else {
      const by = named.namedBy === SPELL_KIT ? SPELL_KIT : CLI.relativePath(named.namedBy)
      CLI.out(`Here, spell runs your checkout:  ${shortPath(named.kit)} (named by ${by})`)
      if (problem) CLI.out(`- but it can't run:  ${problem}`)
    }
    if (!path) CLI.out("- typing spell alone finds nothing yet:  type yarn spell, or run spell local on")
    else {
      const who = !path.isLink ? "a file, not a link" : path.madeByLocal ? "spell local added it" : "you added it"
      CLI.out(`- typing spell runs ${checkoutOf(path.target)} (${shortPath(path.link)};  ${who})`)
    }
  }
  return problem ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** What `on` did to `spell` on the `PATH`, in lines:  the novice voice (`epic voice check`). */
function linkLines(path: PathLinkResult): string[] {
  const link = shortPath(path.link)
  const lines =
    path.outcome === "blocked"
      ? [`- left ${link} as it is:  something else put that file there, so you still type yarn spell`]
      : path.outcome === "kept"
        ? ["- typing spell ran your checkout already"]
        : path.outcome === "repointed"
          ? [
              `- typing spell runs your checkout now, from any folder (${link})`,
              `- before, it ran ${checkoutOf(path.before!)};  spell local off goes back to that`
            ]
          : /* if (path.outcome === "linked") */ [`- typing spell runs your checkout now, from any folder (${link})`]
  if (path.outcome !== "blocked" && !path.isOnPath) {
    lines.push(
      `NOTE:  your terminal can't find spell yet.  Add ${shortPath(dirname(path.link))} to your PATH setting;`,
      "  until then, type yarn spell."
    )
  }
  return lines
}

/** What `off` did to `spell` on the `PATH`, in a line;  `undefined` to say nothing.  The novice voice. */
function unlinkLine(path: PathUnlinkResult, had: boolean): string | undefined {
  if (path.outcome === "removed") return `- removed the spell command spell local added (${shortPath(path.link!)})`
  if (path.outcome === "restored") return `- typing spell runs ${checkoutOf(path.target!)} again, as before spell local`
  if (!had) return undefined
  if (path.outcome === "in-use") {
    const count = path.projects!.length
    return `- left the spell command in place:  ${count} other project${count === 1 ? "" : "s"} still use your checkout`
  }
  if (path.outcome === "not-ours") return "- left the spell command in place:  it was there before spell local"
  return undefined
}

/** The checkout a `bin/spell.mjs` is in, short;  any other file as it is. */
function checkoutOf(bin: string): string {
  return shortPath(bin.endsWith(CHECKOUT_BIN) ? dirname(dirname(bin)) : bin)
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
    "// Written by `spell local on`;  `spell local off` removes it.",
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
  appendFileSync(gitignore, `${gap}# each person's own Spell settings (spell local):  never committed\n/.spell/\n`)
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
