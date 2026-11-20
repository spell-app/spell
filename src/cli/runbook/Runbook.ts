import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, isAbsolute, join, resolve } from "node:path"

import { fencedBlocks } from "spell/cli/commandBlocks"

import { RUNBOOK_EXTENSION, type RunbookAction, type RunbookStep } from "./runbook.types"

/****************
 * ### `Runbook`
 * A runbook, read:  a Markdown file of steps that `spell runbook start` walks you through (epic `epic-engine` P78).
 *
 * ````markdown
 * ---
 * title: NetBox's demo, for Spell
 * folder: ~/netbox-try
 * fresh until: 04:00 UTC
 * ---
 *
 * ## Make a token
 *
 * Click your user name, top right, then **API Tokens**.
 *
 * ```ask NETBOX_TOKEN secret
 * Paste the whole token
 * ```
 *
 * ## Check every list reads
 *
 * ```sh
 * spell place verify NetBox.api.spell
 * ```
 *
 * If not:  start again with `spell runbook reset netbox-demo`.
 * ````
 *
 * - Its settings, at the top, all optional:
 *   - `title`:  what it's called;  else its `#` heading, else its file's name
 *   - `folder`:  where its commands run (`~` is your home;  else from the file's folder);  else where you started it
 *   - `fresh until`:  a time of day, `04:00 UTC` or `18:30` (yours):  a walk started before it is forgotten after it
 * - A step is a `##` heading;  what's under it says what it is:
 *   - an `ask` block:  a value to type in, the block's text the question;  `ask NAME secret` hides it
 *   - an `sh` block:  commands it runs, which must succeed;  an Output fold after it, what they should print
 *   - neither:  something to do by hand;  it offers to open the first web address its words name
 *   - a `Should:` paragraph says what you'll see;  an `If not:` one, what to do when it doesn't work
 * - A mistake names the file, its line and the step:  every mistake at once, in one `SyntaxError`.
 * - Its position:  node's own modules and the command blocks' reader;  it runs nothing.
 ****************/
export class Runbook {
  /** the file, absolute */
  readonly file: string
  /** its name:  the file's, without `.runbook.md` */
  readonly name: string
  /** what it's called */
  readonly title: string
  /** where its commands run, absolute;  `undefined`:  where it was started */
  readonly folder: string | undefined
  /** the time of day its walks lapse at:  `undefined`, never */
  readonly freshUntil: FreshUntil | undefined
  /** what it says before its first step (Markdown) */
  readonly intro: string
  /** its steps, in order */
  readonly steps: RunbookStep[]

  /**
   * Read `text`, the runbook at `file`.
   * - throws `SyntaxError` listing every mistake, each with its line, its `cause` the list
   */
  constructor(file: string, text: string) {
    this.file = resolve(file)
    this.name = Runbook.nameOf(file)
    const mistakes: string[] = []
    const mistake = (line: number, problem: string) => mistakes.push(`${basename(file)}:${line}:  ${problem}`)
    const lines = text.replace(/\r\n/g, "\n").split("\n")
    const { settings, bodyStart } = readSettings(lines, mistake)
    const sections = splitSteps(lines, bodyStart)
    const heading = /^#\s+(.+)$/m.exec(sections.intro)?.[1]?.trim()
    this.title = settings.title ?? heading ?? this.name
    this.intro = sections.intro.replace(/^#\s+.+$/m, "").trim()
    this.folder = settings.folder && folderFrom(settings.folder.value, dirname(this.file))
    this.freshUntil = settings.freshUntil && readFreshUntil(settings.freshUntil, mistake)
    this.steps = sections.steps.map((section, index) => readStep(section, index + 1, mistake))
    if (!this.steps.length) mistake(lines.length, "no steps:  each step is a `## ` heading, then what to do")
    const seen = new Set<string>()
    for (const step of this.steps) {
      if (seen.has(step.title)) mistake(step.line, `two steps called "${step.title}":  give each its own heading`)
      seen.add(step.title)
    }
    if (mistakes.length) {
      throw new SyntaxError(`${this.file} has ${count(mistakes.length, "mistake")}:\n${mistakes.join("\n")}`, {
        cause: { mistakes }
      })
    }
  }

  /** The runbook at `file`, read.  - throws `SyntaxError` for its mistakes;  node's own error when it isn't there */
  static read(file: string): Runbook {
    return new Runbook(file, readFileSync(file, "utf8"))
  }

  /** A runbook's name, from its file:  `netbox-demo` of `netbox-demo.runbook.md`. */
  static nameOf(file: string): string {
    const name = basename(file)
    return name.endsWith(RUNBOOK_EXTENSION) ? name.slice(0, -RUNBOOK_EXTENSION.length) : name.replace(/\.md$/, "")
  }

  /** What a step is:  `"by hand"` when the walk does nothing for it. */
  static kindOf(step: RunbookStep): "by hand" | "ask" | "run" {
    if (step.actions.some((action) => action.kind === "run")) return "run"
    return step.actions.length ? "ask" : "by hand"
  }
}

/** A time of day a walk lapses at. */
export type FreshUntil = {
  /** 0-23 */
  hour: number
  /** 0-59 */
  minute: number
  /** in UTC, else in this machine's own time */
  utc: boolean
  /** as written:  `04:00 UTC` */
  text: string
}

/**
 * When a walk started at `startedAt` lapses:  the first `fresh` time of day after it.
 * - e.g. started 2026-11-20 10:00 UTC, fresh until 04:00 UTC:  2026-11-21 04:00 UTC
 */
export function lapsesAt(fresh: FreshUntil, startedAt: Date): Date {
  const at = new Date(startedAt)
  if (fresh.utc) at.setUTCHours(fresh.hour, fresh.minute, 0, 0)
  else at.setHours(fresh.hour, fresh.minute, 0, 0)
  if (at <= startedAt) {
    if (fresh.utc) at.setUTCDate(at.getUTCDate() + 1)
    else at.setDate(at.getDate() + 1)
  }
  return at
}

////////////////
// ## Reading the file
////////////////

/** A mistake's reporter:  its line, from 1, and what's wrong. */
type Mistake = (line: number, problem: string) => void

/** A setting as written, with its line. */
type Setting = { value: string; line: number }

/** The settings a runbook may have, by how they're written. */
const SETTINGS = { title: "title", folder: "folder", "fresh until": "freshUntil" } as const

/** The settings at the top, between `---` lines, and the line its body starts at (from 0). */
function readSettings(
  lines: string[],
  mistake: Mistake
): { settings: { title?: string; folder?: Setting; freshUntil?: Setting }; bodyStart: number } {
  const settings: { title?: string; folder?: Setting; freshUntil?: Setting } = {}
  if (lines[0]?.trim() !== "---") return { settings, bodyStart: 0 }
  const end = lines.indexOf("---", 1)
  if (end === -1) {
    mistake(1, "its settings start with `---` but never end:  close them with another `---` line")
    return { settings, bodyStart: 0 }
  }
  for (let index = 1; index < end; index++) {
    const line = lines[index]!
    if (!line.trim() || line.trim().startsWith("#")) continue
    const found = /^([^:]+):\s*(.*)$/.exec(line)
    const key = found && SETTINGS[found[1]!.trim().toLowerCase() as keyof typeof SETTINGS]
    if (!found || !key) {
      mistake(index + 1, `"${line.trim()}" isn't a setting:  title, folder or fresh until, each as \`name: value\``)
      continue
    }
    const value = found[2]!.trim()
    if (key === "title") settings.title = value
    else settings[key] = { value, line: index + 1 }
  }
  return { settings, bodyStart: end + 1 }
}

/** `fresh until`'s time.  A mistake when it isn't one. */
function readFreshUntil({ value, line }: Setting, mistake: Mistake): FreshUntil | undefined {
  const found = /^(\d{1,2}):(\d{2})(?:\s*(UTC))?$/i.exec(value)
  const hour = Number(found?.[1])
  const minute = Number(found?.[2])
  if (!found || hour > 23 || minute > 59) {
    mistake(line, `fresh until "${value}" isn't a time of day:  write it as 04:00 UTC, or 18:30 for your own time`)
    return undefined
  }
  return { hour, minute, utc: Boolean(found[3]), text: value }
}

/** `folder` as a path:  `~` your home, else from `base`. */
function folderFrom(folder: string, base: string): string {
  if (folder === "~" || folder.startsWith("~/")) return join(homedir(), folder.slice(1))
  return isAbsolute(folder) ? folder : resolve(base, folder)
}

/** One `##` heading and what's under it:  its lines, the heading's at 0. */
type Section = { lines: string[]; start: number }

/** The body's intro, and its steps:  split at each `## ` heading outside a fenced block. */
function splitSteps(lines: string[], start: number): { intro: string; steps: Section[] } {
  const steps: Section[] = []
  const intro: string[] = []
  let fence: string | undefined
  for (let index = start; index < lines.length; index++) {
    const line = lines[index]!
    const marker = /^\s*(`{3,})/.exec(line)?.[1]
    if (marker && !fence) fence = marker
    else if (marker && fence && line.trim().replace(/`/g, "") === "" && marker.length >= fence.length) fence = undefined
    if (!fence && /^##\s+\S/.test(line)) steps.push({ lines: [line], start: index })
    else if (steps.length) steps[steps.length - 1]!.lines.push(line)
    else intro.push(line)
  }
  return { intro: intro.join("\n"), steps }
}

/** One step, from its section.  Mistakes for what won't do. */
function readStep({ lines, start }: Section, number: number, mistake: Mistake): RunbookStep {
  const title = lines[0]!.replace(/^##\s+/, "").trim()
  const line = start + 1
  const named = (problem: string) => `step ${number}, "${title}":  ${problem}`
  const body = lines.slice(1)
  const actions: RunbookAction[] = []
  const taken = new Set<number>()
  for (const block of fencedBlocks(body.join("\n"))) {
    const blockLine = line + block.line
    if (block.language !== "ask" && block.language !== "sh") continue
    for (let at = block.line - 1; at < block.lastLine; at++) taken.add(at)
    // its Output fold's closing lines, up to `</details>`
    for (let at = block.lastLine; at < body.length && /^\s*(<\/details>)?\s*$/i.test(body[at]!); at++) {
      taken.add(at)
      if (/<\/details>/i.test(body[at]!)) break
    }
    if (block.language === "sh") {
      if (!block.text.trim()) mistake(blockLine, named("its sh block is empty:  put the commands to run in it"))
      actions.push({
        kind: "run",
        commands: block.text,
        ...(block.output !== undefined && { output: block.output }),
        line: blockLine
      })
      continue
    }
    const [name = "", ...flags] = block.info.split(/\s+/).filter(Boolean)
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      mistake(blockLine, named("its ask block needs a name for the value, as ```ask NETBOX_TOKEN secret"))
    }
    const unknown = flags.filter((flag) => flag !== "secret")
    if (unknown.length) mistake(blockLine, named(`"${unknown.join(" ")}" after the name:  only secret goes there`))
    if (!block.text.trim()) mistake(blockLine, named(`its ask block for ${name} has no question:  write it inside`))
    actions.push({ kind: "ask", name, secret: flags.includes("secret"), question: block.text.trim(), line: blockLine })
  }
  const kept = body.filter((_text, index) => !taken.has(index))
  const { words, should, ifNot } = splitWords(kept)
  if (!words && !actions.length) mistake(line, named("it says nothing to do:  write what to do, or add an sh block"))
  const link = /\]\((https?:\/\/[^)\s]+)\)/.exec(words)?.[1] ?? /(https?:\/\/[^\s)>]+)/.exec(words)?.[1]
  return {
    number,
    title,
    line,
    words,
    ...(link && { link }),
    ...(should && { should }),
    ...(ifNot && { ifNot }),
    actions
  }
}

/** A step's words, and its `Should:` and `If not:` paragraphs, each without its label. */
function splitWords(lines: string[]): { words: string; should?: string; ifNot?: string } {
  const paragraphs: string[][] = [[]]
  for (const line of lines) {
    if (line.trim()) paragraphs[paragraphs.length - 1]!.push(line)
    else if (paragraphs[paragraphs.length - 1]!.length) paragraphs.push([])
  }
  const words: string[] = []
  let should: string | undefined
  let ifNot: string | undefined
  for (const paragraph of paragraphs.filter((each) => each.length)) {
    const text = paragraph.join("\n")
    if (/^should:/i.test(text)) should = text.replace(/^should:\s*/i, "")
    else if (/^if not:/i.test(text)) ifNot = text.replace(/^if not:\s*/i, "")
    else words.push(text)
  }
  return { words: words.join("\n\n"), ...(should && { should }), ...(ifNot && { ifNot }) }
}

/** `3 mistakes`, `1 mistake`. */
function count(number: number, word: string): string {
  return `${number} ${word}${number === 1 ? "" : "s"}`
}
