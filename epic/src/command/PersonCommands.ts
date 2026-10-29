import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

import { CLI } from "spell/cli"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { EpicHome, type EpicPerson } from "spell/epic/config/EpicHome"

import { EXIT, EpicCommandError, parseVerbArgs } from "./command.types"
import { EpicCheckout } from "./EpicCheckout"

/****************
 * ### `PersonCommands`
 * `epic whoami [<name>]` and `epic whois <name>`:  who is at this machine's keyboard, and what the epics know about
 * someone (epic `epic-friend` P1).
 *
 * ```sh
 * epic whoami          # Ana Lima  (git's user.name)
 * epic whoami Ana      # you're Ana now, kept in ~/.spell-epic/person.json5
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
   * `epic whoami [<name>] [--json]`:  the name and where it came from;  with a name, keeps it first.
   * - a name in several words is one name:  `epic whoami Ana Lima`
   * - a new name, while pages still name the old one:  says how many, so the person knows
   * - Returns 0.
   */
  async whoami(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, ["json"])
    const name = positional.join(" ").trim()
    const before = EpicHome.person()
    const person = name ? EpicHome.keepPerson(name) : before
    const stillNamed = name && before.name && before.name !== person.name ? this.activityOf(before.name).count : 0
    if (flags.json) CLI.out(JSON.stringify({ ...person, file: EpicHome.personFile(), before, stillNamed }, null, 2))
    else
      for (const line of PersonCommands.whoamiLines(person, { kept: Boolean(name), before, stillNamed })) CLI.out(line)
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

  /** `epic whoami`'s lines. */
  static whoamiLines(
    person: EpicPerson,
    { kept, before, stillNamed }: { kept: boolean; before: EpicPerson; stillNamed: number }
  ): string[] {
    const file = EpicHome.personFile()
    if (kept) {
      const lines = [`you're ${person.name} now, kept in ${file}`]
      if (before.name && before.name !== person.name) {
        lines.push(`  before:  ${before.name} (${SOURCE_WORDS[before.source]})`)
        if (stillNamed)
          lines.push(`  ${stillNamed} replies and comments still name ${before.name}:  epic whois ${before.name}`)
      }
      return lines
    }
    if (!person.name)
      return ["nobody yet:  no name kept, and git has no user.name.", "  epic whoami <name> keeps the one you go by"]
    return [
      `${person.name}  (${person.source === "kept" ? `kept in ${file}` : SOURCE_WORDS[person.source]})`,
      ...(person.source === "git" ? ["  epic whoami <name> keeps another"] : [])
    ]
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

/** The content folder's folders people write replies and comments in. */
const PLACES = ["epics", "sagas", "guides", "pages"]

/** An element's opening tag with a `from` attribute, written in a page (not escaped as `&lt;`). */
const ELEMENT = /<[a-z][\w-]*\s[^<>]*\bfrom="[^"]*"[^<>]*>/g

/** The innermost `{ ... }` of a data file:  one record. */
const RECORD = /\{[^{}]*\}/g

/** How `whoami` says where a name came from. */
const SOURCE_WORDS: Record<EpicPerson["source"], string> = {
  kept: "kept",
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
