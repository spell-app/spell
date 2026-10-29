import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

import { CLI } from "spell/cli"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { EpicHome, type EpicAgent, type EpicPerson } from "spell/epic/config/EpicHome"
import { ThreadFacts } from "spell/epic/comments"

import { EXIT, EpicCommandError, parseVerbArgs } from "./command.types"
import { EpicCheckout } from "./EpicCheckout"
import { NameSweep, type SweepResult } from "./NameSweep"

/****************
 * ### `PersonCommands`
 * `epic whoami [<name>]` and `epic whois <name>`:  who is at this machine's keyboard, and what the epics know about
 * someone (epic `epic-friend` P1);  `epic whoami --rename <name>`:  a new name, written over the old one wherever it
 * says who wrote something (P2, `NameSweep`).
 *
 * ```sh
 * epic whoami          # analima  (Ana Lima, github: analima)
 * epic whoami Ana      # you're Ana now, kept in ~/.spell-epic/person.json5
 * epic whoami --rename Ana Lima --dry-run   # what renaming Ana would change, file by file
 * epic whois Owen      # Owen:  264 replies and comments in 31 places, last on 2026-10-29 ...
 * ```
 *
 * - The person and where their name is kept:  `EpicHome`.
 * - `whois` reads the content folder as it is today (`activityOf()`):
 *   - an element's `from="<name>"` in its pages (`<epic-reply from="Owen" at="...">`), escaped markup (`&lt;`) left
 *     out:  that's a page SHOWING the markup
 *   - a reply's `"by": "<name>"` in its data files (a guide's comments)
 *   - names matched whole, any case
 * - `--json` on both:  what it prints, as JSON.
 ****************/
export class PersonCommands {
  /** the content folder `whois` reads */
  readonly content: string

  /** - `content`:  default the content folder of the checkout the command runs in (`EpicConfig.contentOf()`) */
  constructor({ content }: { content?: string } = {}) {
    this.content = content ?? EpicConfig.contentOf(EpicCheckout.nearest({ marker: ".git" }))
  }

  /**
   * `epic whoami [<name>] [--rename] [--dry-run] [--json]`:  the name and where it came from;  with a name, keeps it
   * first.
   * - a name in several words is one name:  `epic whoami Ana Lima`
   * - a new name, while pages still name the old one:  says how many, and how to rename them
   * - `--rename`:  `rename()`
   * - Returns 0.
   */
  async whoami(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, WHOAMI_SWITCHES)
    const name = positional.join(" ").trim()
    if (flags.rename) return this.rename(name, { dryRun: flags.dryRun === true, json: flags.json === true })
    // the one place (with `epic init`) that runs `gh`:  its login kept, so a page served never does
    EpicHome.refreshGithub()
    const before = EpicHome.person()
    const person = name ? EpicHome.keepPerson(name) : before
    const stillNamed = name && before.name && before.name !== person.name ? this.activityOf(before.name).count : 0
    const agent = EpicHome.agent()
    if (flags.json)
      CLI.out(JSON.stringify({ ...person, file: EpicHome.personFile(), before, stillNamed, agent }, null, 2))
    else
      for (const line of PersonCommands.whoamiLines(person, { kept: Boolean(name), before, stillNamed, agent }))
        CLI.out(line)
    return EXIT.OK
  }

  /**
   * `epic whoami --rename <name> [--dry-run] [--json]`:  keep `name`, and write it over the old one wherever the old
   * one says who wrote something, in every page, part, inbox and data file of the content folder (`NameSweep`);
   * their comments files move to the new name, all of it one commit in the content repo (epic `epic-friend` P9)
   * - the old name:  the person's before, kept or git's
   * - `dryRun`:  keeps nothing, writes nothing;  says what it would change
   * - the same name, or no old name:  says so, changes nothing
   * - Returns 0;  throws `EpicCommandError` (exit 2) with no name.
   */
  async rename(name: string, { dryRun = false, json = false }: { dryRun?: boolean; json?: boolean } = {}) {
    if (!name)
      throw new EpicCommandError(
        "epic whoami --rename <name>:  to what?  e.g. epic whoami --rename Ana Lima",
        EXIT.USAGE
      )
    const before = EpicHome.person()
    // the same name, as written:  a change of case ("ana" -> "Ana") is still a rename
    const same = before.name === name
    const sweep = new NameSweep({ content: this.content })
    const result: SweepResult =
      before.name && !same
        ? sweep.run(before.name, name, { dryRun })
        : { from: before.name ?? "", to: name, dryRun, count: 0, files: [], moved: [] }
    if (!dryRun) EpicHome.keepPerson(name)
    const commit = before.name && !same ? sweep.commit(result) : undefined
    if (json) CLI.out(JSON.stringify({ ...result, commit, before, file: EpicHome.personFile() }, null, 2))
    else for (const line of PersonCommands.renameLines(result, { before, same, commit })) CLI.out(line)
    return EXIT.OK
  }

  /**
   * `epic whois <name> [--json]`:  what the epics know about `name`:  how many replies and comments name them, in
   * which places, and when they were last active, from the newest.
   * - Returns 0, also when nothing names them (it says so).
   * - Throws `EpicCommandError` (exit 2) with no name.
   */
  async whois(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, ["json"])
    const name = positional.join(" ").trim()
    if (!name) throw new EpicCommandError("epic whois <name>:  whose?  e.g. epic whois Owen", EXIT.USAGE)
    const activity = this.activityOf(name)
    if (flags.json) CLI.out(JSON.stringify(activity, null, 2))
    else for (const line of PersonCommands.whoisLines(activity)) CLI.out(line)
    return EXIT.OK
  }

  /**
   * Every reply and comment naming `name` in the content folder, by place:  an epic by its id (its page, parts,
   * details pages and inbox together), any other page by its path from the content folder, no extension.
   * - places with the newest activity first
   * - NEVER throws:  a file that won't read is skipped
   */
  activityOf(name: string): PersonActivity {
    const places = new Map<string, PlaceActivity>()
    for (const file of PersonCommands.filesIn(this.content)) {
      let text: string
      try {
        text = readFileSync(file, "utf8")
      } catch {
        continue
      }
      const times = file.endsWith(".html") ? PersonCommands.pageTimes(text, name) : PersonCommands.dataTimes(text, name)
      if (!times.length) continue
      const place = PersonCommands.placeOf(relative(this.content, file))
      const entry = places.get(place) ?? { place, count: 0, last: undefined }
      entry.count += times.length
      for (const at of times) if (at && (!entry.last || at > entry.last)) entry.last = at
      places.set(place, entry)
    }
    const sorted = [...places.values()].sort(
      (a, b) => (b.last ?? "").localeCompare(a.last ?? "") || a.place.localeCompare(b.place)
    )
    return {
      name,
      count: sorted.reduce((sum, place) => sum + place.count, 0),
      last: sorted.find((place) => place.last)?.last,
      places: sorted
    }
  }

  ////////////////
  // ## Statics:  reading the content folder, and the lines printed
  ////////////////

  /**
   * The content folder's pages and data files (`.html`, `.json5`) in the folders people write in (`PLACES`).
   * - skips dot folders and `node_modules`
   */
  static filesIn(content: string): string[] {
    const files: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue
        const path = join(dir, entry.name)
        if (entry.isDirectory()) walk(path)
        else if (entry.isFile() && /\.(html|json5)$/.test(entry.name)) files.push(path)
      }
    }
    for (const folder of PLACES) if (existsSync(join(content, folder))) walk(join(content, folder))
    return files.sort()
  }

  /**
   * When each element of page `html` naming `name` (`from="<name>"`) was written:  its `at`, as an ISO-ish string
   * that sorts (`2026-10-12 23:54`);  `""` for one with no `at`.
   */
  static pageTimes(html: string, name: string): string[] {
    const times: string[] = []
    for (const [tag] of html.matchAll(ELEMENT)) {
      const from = /\sfrom="([^"]*)"/.exec(tag)?.[1]
      if (from === undefined || !sameName(from, name)) continue
      times.push(sortableTime(/\sat="([^"]*)"/.exec(tag)?.[1]))
    }
    return times
  }

  /**
   * When each record of data file `text` naming `name` (`"by": "<name>"`) was written:  the `at` beside it, as
   * `pageTimes()` gives them.
   * - read as text, record by record (the innermost `{ ... }` holding the `by`):  a file that won't parse still counts
   */
  static dataTimes(text: string, name: string): string[] {
    const times: string[] = []
    for (const [record] of text.matchAll(RECORD)) {
      const by = /(?<![\w$])["']?by["']?\s*:\s*"([^"]*)"/.exec(record)?.[1]
      if (by === undefined || !sameName(by, name)) continue
      times.push(sortableTime(/(?<![\w$])["']?at["']?\s*:\s*"([^"]*)"/.exec(record)?.[1]))
    }
    return times
  }

  /** The place a file at `path` (from the content folder) belongs to:  `epics/<id>/...` is `<id>`;  else its page. */
  static placeOf(path: string): string {
    const parts = path.split(sep)
    if (parts[0] === "epics" && parts.length > 2) return parts[1]!
    return parts.join("/").replace(/(\.(inbox|answer|draft|rows))?\.(html|json5)$/, "")
  }

  /**
   * `epic whoami`'s lines:  the person, then (not when keeping a name) the agent running `epic` under them
   * (`agentLine()`, epic `epic-friend` P10).
   */
  static whoamiLines(
    person: EpicPerson,
    { kept, before, stillNamed, agent }: { kept: boolean; before: EpicPerson; stillNamed: number; agent?: EpicAgent }
  ): string[] {
    const file = EpicHome.personFile()
    if (kept) {
      const lines = [`you're ${person.name} now, kept in ${file}`]
      if (before.name && before.name !== person.name) {
        lines.push(`  before:  ${before.name} (${SOURCE_WORDS[before.source]})`)
        if (stillNamed)
          lines.push(
            `  ${stillNamed} replies and comments still name ${before.name}:  ` +
              `epic whoami --rename ${person.name} rewrites them`
          )
      }
      return lines
    }
    const agentLines = agent ? [PersonCommands.agentLine(agent)] : []
    if (!person.name)
      return [
        "nobody yet:  no name kept, no GitHub login, and git has no user.name.",
        "  epic whoami <name> keeps the one you go by",
        ...agentLines
      ]
    return [
      PersonCommands.whoLine(person),
      person.source === "kept"
        ? `  kept in ${file}`
        : `  ${SOURCE_WORDS[person.source]};  epic whoami <name> keeps another`,
      ...agentLines
    ]
  }

  /**
   * The agent running `epic`, in one line (`EpicHome.agent()`):  what it stamps on what it writes, and how it was found;
   * a guess says so, and how to name it.
   * - `  agent:  codex (Codex's mark, CODEX_THREAD_ID)`
   * - `  agent:  claude (a guess:  no agent's mark found;  SPELL_EPIC_AGENT=<name> names it)`
   */
  static agentLine({ name, source, mark }: EpicAgent): string {
    const how =
      source === "set"
        ? `${EpicHome.AGENT_ENV}`
        : source === "mark"
          ? `${ThreadFacts.agentLabel(name)}'s mark, ${mark}`
          : `a guess:  no agent's mark found;  ${EpicHome.AGENT_ENV}=<name> names it`
    return `  agent:  ${name} (${how})`
  }

  /**
   * The person in one line:  the short name, then the full name and the GitHub login (Owen, 2026-10-29):
   * `owenoak  (Owen Williams, github: owenoak)`, `Owen  (Owen Williams, github: owenoak)`;  the full name only when
   * it isn't the short name;  neither known:  the name alone.
   */
  static whoLine({ name, fullName, github }: EpicPerson): string {
    const known = [fullName !== name && fullName, github && `github: ${github}`].filter(Boolean)
    return known.length ? `${name}  (${known.join(", ")})` : `${name}`
  }

  /** `epic whoami --rename`'s lines:  what changed (or would), then a line per file. */
  static renameLines(
    result: SweepResult,
    { before, same, commit }: { before: EpicPerson; same: boolean; commit?: string }
  ): string[] {
    const { from, to, dryRun, count, files, moved } = result
    const kept = dryRun ? "  (dry run:  nothing written, name not kept)" : `;  you're ${to} now`
    if (!before.name) return [`nothing to rename:  you had no name${kept}`]
    if (same) return [`you're ${to} already:  nothing to rename`]
    const verb = dryRun ? "would rename" : "renamed"
    const head = `${verb} ${from} as ${to} in ${count} ${count === 1 ? "place" : "places"}, ${files.length} ${files.length === 1 ? "file" : "files"}`
    const width = Math.max(0, ...files.map((file) => file.path.length))
    return [
      head + kept,
      ...files.map((file) => `  ${file.path.padEnd(width)}  ${String(file.count).padStart(4)}`),
      ...moved.map(([old, now]) => `  ${dryRun ? "would move" : "moved"} ${old} -> ${now}`),
      ...(commit ? [`committed in the content repo:  ${commit}`] : [])
    ]
  }

  /** Whether `written` names `name`:  the same words, any case, spaces trimmed (as `whois` matches). */
  static sameName(written: string, name: string): boolean {
    return sameName(written, name)
  }

  /** `epic whois`'s lines:  the total, then a line per place. */
  static whoisLines(activity: PersonActivity): string[] {
    const { name, count, last, places } = activity
    if (!count) return [`${name}:  nothing on the epics names them yet`]
    const width = Math.max(...places.map((place) => place.place.length))
    return [
      `${name}:  ${count} ${count === 1 ? "reply or comment" : "replies and comments"} in ${places.length} ` +
        `${places.length === 1 ? "place" : "places"}${last ? `, last on ${last.slice(0, 10)}` : ""}`,
      ...places.map(
        (place) =>
          `  ${place.place.padEnd(width)}  ${String(place.count).padStart(4)}` +
          `${place.last ? `  last ${place.last.slice(0, 10)}` : ""}`
      )
    ]
  }
}

/** What the epics know about one person:  `PersonCommands.activityOf()`. */
export type PersonActivity = {
  /** the name looked for */
  name: string
  /** replies and comments naming them, in all */
  count: number
  /** when the newest was written (`2026-10-12 23:54`, or an ISO time);  `undefined` when none says */
  last: string | undefined
  /** each place they wrote in, newest first */
  places: PlaceActivity[]
}

/** One place's part of a `PersonActivity`. */
export type PlaceActivity = {
  /** an epic's id, or a page's path from the content folder without its extension (`guides/python-target`) */
  place: string
  /** replies and comments naming them there */
  count: number
  /** the newest one's time;  `undefined` when none says */
  last: string | undefined
}

/** `whoami`'s switches:  flags that never take a value (the name is its words). */
const WHOAMI_SWITCHES = ["json", "rename", "dryRun"]

/** The content folder's folders people write replies and comments in. */
const PLACES = ["epics", "sagas", "guides", "pages"]

/** An element's opening tag with a `from` attribute, written in a page (not escaped as `&lt;`). */
const ELEMENT = /<[a-z][\w-]*\s[^<>]*\bfrom="[^"]*"[^<>]*>/g

/** The innermost `{ ... }` of a data file:  one record. */
const RECORD = /\{[^{}]*\}/g

/** How `whoami` says where a name came from. */
const SOURCE_WORDS: Record<EpicPerson["source"], string> = {
  kept: "kept",
  github: "your GitHub login",
  git: "git's user.name",
  none: "nobody said"
}

/** Whether `written` names `name`:  the same words, any case, spaces trimmed. */
function sameName(written: string, name: string): boolean {
  return written.trim().localeCompare(name.trim(), undefined, { sensitivity: "accent" }) === 0
}

/** `at` as a time that sorts with the others:  `2026-10-12 23:54` and ISO `2026-10-11T22:21:35.009Z` alike. */
function sortableTime(at: string | undefined): string {
  return at ? at.replace("T", " ").replace(/\.\d+Z$|Z$/, "") : ""
}
