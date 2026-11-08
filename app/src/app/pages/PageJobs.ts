import { SiteEdits } from "./SiteEdits"

/****************
 * ### `PageJobs`
 * A page's STORIES, read from its file and written back (epic `mockup` P6, Q12):  what the page must let people do,
 * kept with it for good, through the mockup and into the real site.
 * - Written in the page's own declaration, first in its body, as markdown:
 *   - spellx:  `<spell-stories>` ... `</>`
 *   - code spell:  `<stories>` ... `</stories>`
 *   - both compile to the page's `static stories` (`markdown_description`);  the running page draws nothing for them.
 * - A job is a markdown list item:  a plain line, or an Agile story ("As a fan, I want ..., so that ...");
 *   a task list's box ticks it off, `- [x]`.  Lines under it are its details:  `- done when:  ...`.
 * - Plain text in, text out, as `SiteEdits` is:  it loads no parser, so it's tested in node;
 *   the site editor applies the result as one step of the editor's history (`SiteWrites.changeJobs()`).
 * - Static and instance-free on purpose:  it holds nothing, and every caller has its own text.
 ****************/
export class PageJobs {
  /**
   * Page `name`'s jobs, as `text` has them;  `[]` for none written yet.
   * - `undefined` when `text` doesn't declare the page:  another file's, or another project's (a notebook a site
   *   imports), whose jobs are written there.
   */
  static of(text: string, name: string): PageJob[] | undefined {
    const declared = SiteEdits.declarationOf(text, name)
    if (!declared) return undefined
    const block = PageJobs.blockIn(text, declared)
    return block ? PageJobs.parsed(block.markdown) : []
  }

  /**
   * `text` with page `name`'s jobs `jobs`:  its block written, replaced, or taken out when `jobs` is empty.
   * - A page written `<spell-page "x"/>` opens up to hold them;  `a "x" is a page` gains its `:`.
   * - throws `TypeError` when `text` doesn't declare the page
   */
  static withJobs(text: string, name: string, jobs: readonly PageJob[]): string {
    const declared = SiteEdits.declarationOf(text, name)
    if (!declared) {
      throw new TypeError(`PageJobs.withJobs():  this file doesn't declare "${name}";  its jobs go where it's declared`)
    }
    const head = text.slice(declared.start, text.indexOf("\n", declared.start) + 1 || declared.end)
    const form = head.startsWith("<") ? "spellx" : "code"
    const block = PageJobs.blockIn(text, declared)
    const written = jobs.length ? PageJobs.blockText(form, jobs) : ""
    if (block) return text.slice(0, block.span.start) + written + text.slice(block.span.end)
    if (!written) return text
    const headEnd = declared.start + head.length
    const firstLine = head.replace(/\r?\n$/, "")
    if (form === "spellx" && /\/>\s*$/.test(firstLine)) {
      const opened = firstLine.replace(/\s*\/>\s*$/, ">")
      return text.slice(0, declared.start) + `${opened}\n${written}</>\n` + text.slice(headEnd)
    }
    const withColon = form === "code" && !firstLine.trimEnd().endsWith(":") ? `${firstLine.trimEnd()}:` : firstLine
    // code spell reads two raw-text blocks on lines next to each other as one:  a blank line before a `<markdown>`
    const apart = form === "code" && /^[ \t]+<(?:markdown|stories)>/.test(text.slice(headEnd)) ? "\n" : ""
    return text.slice(0, declared.start) + `${withColon}\n${written}${apart}` + text.slice(headEnd)
  }

  /**
   * A new job, a plain line or an Agile story's three parts with its check under it.
   * - The words are the person's to fill in:  `As a …, I want …, so that …`.
   */
  static newJob(text: string, details: string[] = []): PageJob {
    return { text, done: false, details }
  }

  /** How many of `jobs` are ticked off. */
  static doneIn(jobs: readonly PageJob[]): number {
    return jobs.filter((job) => job.done).length
  }

  ////////////////
  // ## Reading and writing the block
  ////////////////

  /** The jobs block in declaration `declared` of `text`:  its lines, and its markdown less their shared indent. */
  private static blockIn(text: string, declared: { start: number; end: number }): JobsBlock | undefined {
    const body = text.slice(declared.start, declared.end)
    const open = OPENER.exec(body)
    if (!open) return undefined
    const start = declared.start + open.index
    const indent = open[1]!
    const after = start + open[0].length
    const close = new RegExp(`^${indent}<\\/(?:${open[2]})?>[ \\t]*(?:\\r?\\n|$)`, "m")
    const rest = text.slice(after, declared.end)
    const closed = close.exec(rest)
    if (!closed) return undefined
    const lines = rest
      .slice(0, closed.index)
      .replace(/\r?\n$/, "")
      .split("\n")
    return { span: { start, end: after + closed.index + closed[0].length }, markdown: dedent(lines).join("\n") }
  }

  /** The jobs in `markdown`:  each list item at its left edge a job, the lines under it its details. */
  private static parsed(markdown: string): PageJob[] {
    const jobs: PageJob[] = []
    for (const line of markdown.split("\n")) {
      if (!line.trim()) continue
      const item = ITEM.exec(line)
      if (item) {
        const [, box, words] = item
        jobs.push({ text: words!.trim(), done: box === undefined ? undefined : /x/i.test(box), details: [] })
      } else if (/^\s/.test(line) && jobs.length) jobs.at(-1)!.details.push(line.replace(/^(?:\t| {2})/, ""))
      else jobs.push({ text: line.trim(), done: undefined, details: [] })
    }
    return jobs
  }

  /** The block for `jobs`, in `form`, one tab in, its lines two:  ready to put first in a page's body. */
  private static blockText(form: "spellx" | "code", jobs: readonly PageJob[]): string {
    const items = jobs.flatMap((job) => {
      const box = job.done === undefined ? "" : job.done ? "[x] " : "[ ] "
      return [`\t\t- ${box}${job.text}`, ...job.details.filter((line) => line.trim()).map((line) => `\t\t\t${line}`)]
    })
    const [opener, closer] = form === "spellx" ? ["<spell-stories>", "</>"] : ["<stories>", "</stories>"]
    return `\t${opener}\n${items.join("\n")}\n\t${closer}\n`
  }
}

/** One job of a page:  what it must let people do. */
export type PageJob = {
  /** Its words:  `see a film's opening crawl`, or a story, `As a fan, I want ..., so that ...`. */
  text: string
  /** Ticked off (`- [x]`), not yet (`- [ ]`), or a plain item with no box (`undefined`). */
  done: boolean | undefined
  /** The lines under it, less one indent:  its checks, `- done when:  its people are listed`. */
  details: string[]
}

/** A jobs block in a page's declaration:  where it's written, and its markdown. */
type JobsBlock = { span: { start: number; end: number }; markdown: string }

/** A jobs block's first line, in either form:  `\t<spell-stories>`, `\t<stories>`;  its indent, and its tag. */
const OPENER = /^([ \t]*)<(spell-stories|encanto-historias|stories)>[ \t]*\r?\n/m

/** A list item at the left edge:  `- [x] see a film`, `- see a film`;  its box, then its words. */
const ITEM = /^[-*+]\s+(\[[ xX]\]\s+)?(.*)$/

/** `lines` less the indent every line that isn't blank shares. */
function dedent(lines: string[]): string[] {
  const indents = lines.filter((line) => line.trim()).map((line) => /^[ \t]*/.exec(line)![0])
  const shared = indents.reduce((a, b) => {
    let at = 0
    while (at < a.length && a[at] === b[at]) at++
    return a.slice(0, at)
  }, indents[0] ?? "")
  return lines.map((line) => (line.startsWith(shared) ? line.slice(shared.length) : line.trimStart()))
}
