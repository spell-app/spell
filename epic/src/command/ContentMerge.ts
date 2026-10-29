/****************
 * ### `ContentMerge`
 * The small merge rules the content repo's sync settles a conflict with (`SharedSync`, epic `epic-friend` P5):
 * what two people's edits to one epic page leave that git can't merge by itself, but whose answer is plain.
 * - `resolve()`:  a file with git's conflict marks (diff3 style), settled hunk by hunk, or `undefined` when any hunk
 *   isn't one of these:
 *   - both sides ADDED at one place (two new items at a section's end):  both kept, the other side's first
 *     (`bothInserted()`)
 *   - only a date changed on both (`<epic-page updated="...">`, `recent-since`):  the LATER one
 *   - one side left a line as it was:  the other's
 * - `sortLog()`:  a log part's events in time order, as a union merge (`merge=union`, the content repo's
 *   `.gitattributes`) leaves them two runs side by side
 * - pure, all `static`:  text in, text out;  no git, no files (WWOD §8 › "Singleton services are classes")
 * - NOT a whole-file add on both sides (`AA`) or a delete against an edit:  the sync never calls it for those
 ****************/
export class ContentMerge {
  /**
   * `text` with every conflict settled, or `undefined` when one can't be.
   * - the marks as `merge.conflictStyle=diff3` writes them:  `<<<<<<<`, `|||||||` (the base), `=======`, `>>>>>>>`
   * - a hunk without its base (another conflict style) can't be settled
   */
  static resolve(text: string): string | undefined {
    const lines = text.split("\n")
    const out: string[] = []
    for (let at = 0; at < lines.length; at++) {
      if (!lines[at]!.startsWith(OURS)) {
        out.push(lines[at]!)
        continue
      }
      const hunk: Hunk = { ours: [], base: [], theirs: [] }
      let side: keyof Hunk | undefined = "ours"
      let hasBase = false
      for (at++; at < lines.length; at++) {
        const line = lines[at]!
        if (line.startsWith(BASE)) {
          side = "base"
          hasBase = true
        } else if (line === SPLIT) side = "theirs"
        else if (line.startsWith(THEIRS)) {
          side = undefined
          break
        } else hunk[side!].push(line)
      }
      if (side !== undefined || !hasBase) return undefined
      const settled = ContentMerge.settle(hunk)
      if (!settled) return undefined
      out.push(...settled)
    }
    return out.join("\n")
  }

  /**
   * One hunk's lines, settled, or `undefined`.
   * - `ours` is the side being rebased ONTO (the remote's), `theirs` this machine's commit:  so on an add at one
   *   place, the remote's lines come first
   */
  static settle({ ours, base, theirs }: Hunk): string[] | undefined {
    if (same(ours, theirs)) return ours
    if (same(base, ours)) return theirs
    if (same(base, theirs)) return ours
    if (!base.length) return [...ours, ...theirs]
    const inserted = ContentMerge.bothInserted(ours.join("\n"), base.join("\n"), theirs.join("\n"))
    if (inserted !== undefined) return inserted.split("\n")
    if (ours.length !== base.length || theirs.length !== base.length) return undefined
    const lines: string[] = []
    for (let at = 0; at < base.length; at++) {
      const [mine, was, other] = [ours[at]!, base[at]!, theirs[at]!]
      const line = mine === other || other === was ? mine : mine === was ? other : ContentMerge.laterDates(mine, other)
      if (line === undefined) return undefined
      lines.push(line)
    }
    return lines
  }

  /**
   * `ours` and `theirs` when each only INSERTED text at one place in `base` (character by character), as `base` with
   * both inserts there, the remote's (`ours`) first;  `undefined` when either changed anything of `base`.
   * - why characters, not lines:  the formatter folds an element's `>` onto the next line, so adding an item at a
   *   section's end changes the line before it too (`<epic-section ...></epic-section>` becomes three lines);  as
   *   characters, it's an insert before `></epic-section>`
   * - the place:  after the longest end all three share, then the longest start
   */
  static bothInserted(ours: string, base: string, theirs: string): string | undefined {
    let end = 0
    const most = Math.min(ours.length, base.length, theirs.length)
    while (end < most && ours.at(-1 - end) === base.at(-1 - end) && theirs.at(-1 - end) === base.at(-1 - end)) end++
    let start = 0
    const room = most - end
    while (start < room && ours[start] === base[start] && theirs[start] === base[start]) start++
    if (start + end < base.length) return undefined
    const tail = base.length - end
    return (
      base.slice(0, start) +
      ours.slice(start, ours.length - end) +
      theirs.slice(start, theirs.length - end) +
      base.slice(tail)
    )
  }

  /**
   * Lines `a` and `b`, which differ only in the values of date attributes (`DATE_ATTRIBUTES`), as one line with the
   * later of each;  `undefined` when they differ in anything else.
   */
  static laterDates(a: string, b: string): string | undefined {
    const blank = (line: string) => line.replace(DATE_ATTRIBUTE, '$1=""')
    if (blank(a) !== blank(b)) return undefined
    const others = [...b.matchAll(DATE_ATTRIBUTE)].map((match) => match[2]!)
    let at = 0
    return a.replace(DATE_ATTRIBUTE, (_, name: string, value: string) => {
      const other = others[at++]!
      return `${name}="${later(value, other)}"`
    })
  }

  /**
   * A log part's `<epic-event>`s in time order (`at`), equal times in the order they were;  `undefined` when the text
   * holds anything but its opening comment, the events and space (a union merge that broke an event:  left for a
   * person, never cut).
   * - one event a line;  the formatter wraps them as it writes the part
   */
  static sortLog(text: string): string | undefined {
    const events = [...text.matchAll(EVENT)].map((match) => match[0])
    const rest = text.replace(EVENT, "").replace(OPENING_COMMENT, "")
    if (rest.trim()) return undefined
    const head = OPENING_COMMENT.exec(text)?.[0] ?? ""
    const timed = events.map((event, order) => ({ event, order, at: timeOf(event) }))
    timed.sort((a, b) => a.at - b.at || a.order - b.order)
    return `${head ? `${head}\n` : ""}${timed.map((each) => each.event).join("\n")}\n`
  }
}

/** A conflict's three sides, as lines. */
export type Hunk = { ours: string[]; base: string[]; theirs: string[] }

/** Git's conflict marks, diff3 style. */
const OURS = "<<<<<<<"
const BASE = "|||||||"
const SPLIT = "======="
const THEIRS = ">>>>>>>"

/** The attributes that hold a date or a time, the later of two winning:  `updated="2026-10-29"`. */
const DATE_ATTRIBUTE = /\b(updated|recent-since)="([^"]*)"/g

/** One log event, however the formatter wrapped it. */
const EVENT = /<epic-event\b[\s\S]*?<\/epic-event\s*>/g

/** A part's opening comment:  `<!-- plan-doc part:  #log's body ... -->`. */
const OPENING_COMMENT = /^\s*<!--[\s\S]*?-->/

/** Whether two lists of lines are the same. */
function same(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((line, at) => line === b[at])
}

/** The later of two dates or times as written;  by text when either won't read as a date. */
function later(a: string, b: string): string {
  const [ta, tb] = [Date.parse(a), Date.parse(b)]
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a >= b ? a : b
  return ta >= tb ? a : b
}

/** An event's time, ms;  one with no `at` that reads sorts first. */
function timeOf(event: string): number {
  const at = /\bat="([^"]*)"/.exec(event)?.[1]
  const time = at ? Date.parse(at) : Number.NaN
  return Number.isNaN(time) ? 0 : time
}
