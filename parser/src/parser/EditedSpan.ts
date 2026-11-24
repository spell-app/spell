/**
 * Where an edit changed a file's text, as one span:  the old text's `from` to `to` became the new text's `from` to
 * `toNew` (epic `solid-2-final` P9).
 * - Everything before `from`, and after `to` (`toNew` in the new text), is the same in both.
 * - Several edits over a pause in typing make one span, from the first change to the last (`joined()`):
 *   a span a little wider than the edit is still right, only less use.
 * - An editor knows it for free (CodeMirror's change set:  `FileStates`), so `P.IncrementalProject.update()` and
 *   `P.IncrementalParse.update()` read only around it, rather than comparing the two texts whole.
 * - Plain data, and STATIC helpers:  it crosses from the app to the parser as it is.
 */
export class EditedSpan {
  /** Where the change starts, the same in both texts. */
  declare from: number
  /** Where it ends in the old text. */
  declare to: number
  /** Where it ends in the new text. */
  declare toNew: number

  /**
   * The narrowest span from `before` to `after`:  past what they start with alike, and before what they end with.
   * - Reads both texts whole:  for a caller with no change set, e.g. the tests and `spell speedtest --pipeline`.
   */
  static between(before: string, after: string): EditedSpan {
    const shortest = Math.min(before.length, after.length)
    let from = 0
    while (from < shortest && before.charCodeAt(from) === after.charCodeAt(from)) from++
    let same = 0
    while (
      same < shortest - from &&
      before.charCodeAt(before.length - 1 - same) === after.charCodeAt(after.length - 1 - same)
    ) {
      same++
    }
    return { from, to: before.length - same, toNew: after.length - same }
  }

  /**
   * The one span that covers `first`, then `second`, made to the text `first` made:
   * in the offsets of the text before `first`.
   * - Either missing:  the other one.
   */
  static joined(first: EditedSpan | undefined, second: EditedSpan | undefined): EditedSpan | undefined {
    if (!first || !second) return first ?? second
    const grew = first.toNew - first.to
    // `second`'s ends, back in the oldest text's offsets:  inside `first`'s new text, `first`'s own ends
    const from = second.from < first.from ? second.from : second.from >= first.toNew ? second.from - grew : first.from
    const end = second.to <= first.from ? second.to : second.to >= first.toNew ? second.to - grew : first.to
    const start = Math.min(first.from, from)
    const to = Math.max(first.to, end)
    return { from: start, to, toNew: to + grew + (second.toNew - second.to) }
  }

  /**
   * Can `span` be the change from `before` to `after`?  Only its ends are checked, not the text:
   * so a span left over from an older edit isn't used.
   */
  static fits(span: EditedSpan | undefined, before: string, after: string): span is EditedSpan {
    if (!span) return false
    const { from, to, toNew } = span
    return (
      from >= 0 && from <= to && from <= toNew && to <= before.length && before.length - to === after.length - toNew
    )
  }

  /**
   * Is `after` `before` with one line changed, and no line added or taken away:  a line being typed in?
   * - What `P.IncrementalProject.update()` lets keep its declarations till the next full parse (`keepLastGood`).
   * - With `span`, only the lines it touches are compared:  the rest are the same.
   */
  static changesOneLine(before: string, after: string, span?: EditedSpan): boolean {
    let was: string[]
    let now: string[]
    if (span) {
      const start = before.lastIndexOf("\n", span.from - 1) + 1
      was = before.slice(start, lineEnd(before, span.to)).split("\n")
      now = after.slice(start, lineEnd(after, span.toNew)).split("\n")
    } else {
      was = before.split("\n")
      now = after.split("\n")
    }
    if (was.length !== now.length) return false
    let changed = 0
    for (let at = 0; at < was.length && changed < 2; at++) if (was[at] !== now[at]) changed++
    return changed <= 1
  }
}

/** Where the line holding `offset` of `text` ends:  its line break, or the text's end. */
function lineEnd(text: string, offset: number): number {
  const end = text.indexOf("\n", offset)
  return end < 0 ? text.length : end
}
