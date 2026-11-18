/**
 * The editor's own words for each line of code, for Explain This (epic `editor` P32, Q40):
 * what a hover over the line's words already says, in the editor's plain mode, chosen and trimmed for a reader.
 * - Editor-free, as `CodeEditorFeatures` is:  the code's right-click menu hands in each line's hovers
 *   (`LSP.SpellLanguageService.hover(..., "plain")` over each of its words), and the modal shows the result.
 * - A comment line has none:  it's words already, shown on the code's side, and an action's description comes with
 *   its head line's words.
 * - Of a line's hovers, the most telling:  how the line reads as a sentence (`Reads as`), then what a built-in step
 *   or an action does, then a property;  a variable's or a template's own card says little of the line, so only
 *   when nothing else does.
 * - No links, no "declared in" lines, at most two short paragraphs of each.
 */

/** One line of explained code:  its text, from the margin, and the editor's words for it, if it has any. */
export type ExplainedLine = {
  /** the line, its shared indent taken off */
  text: string
  /** what it does, in the editor's plain words (Markdown);  none for a blank line, or a line nothing explains */
  words?: string
}

/**
 * The words for line `text`, from `hovers`, the plain hovers over its words in order (`null` where none):
 * see the file's docs.
 */
export function wordsForLine(text: string, hovers: readonly (string | null | undefined)[]): string | undefined {
  if (COMMENT_LINE.test(text)) return undefined
  const sections = [...new Set(hovers.flatMap((hover) => (hover ? hover.split(HOVER_RULE) : [])))]
  const ranked = sections
    .map((section) => ({ section, rank: rankOf(section) }))
    .filter((it) => it.rank < SAYS_LITTLE)
    .sort((a, b) => a.rank - b.rank)
  const chosen = ranked.length ? ranked.slice(0, 2) : sections.slice(0, 1).map((section) => ({ section }))
  const words = chosen.map((it) => trimmed(it.section)).filter(Boolean)
  return words.length ? words.join("\n\n") : undefined
}

/** How telling `section` is of a line:  lower first, `SAYS_LITTLE` and up only when nothing else is. */
function rankOf(section: string): number {
  const index = TELLING.findIndex((start) => start.test(section))
  return index < 0 ? SAYS_LITTLE : index
}

/** `section`'s first two paragraphs, its links and "declared in" lines left out. */
function trimmed(section: string): string {
  return section
    .split("\n\n")
    .map((paragraph) =>
      paragraph
        .split("\n")
        .filter((line) => !DECLARED_IN.test(line))
        .join("\n")
        .replace(LINK, "$1")
        .trim()
    )
    .filter(Boolean)
    .slice(0, 2)
    .join("\n\n")
}

/** A whole line that's a comment, `// ...` or `-- ...`. */
const COMMENT_LINE = /^\s*(?:\/\/|--)/

/** Between a hover's sections:  `SpellLanguageService.hover()`'s rule. */
const HOVER_RULE = "\n\n---\n\n"

/** What a hover section starts with, most telling first:  how it reads, a built-in step, an action, a property. */
const TELLING = [/^\*\*(Reads as|Se lee)/, /^(built in|incorporad)/i, /^(action|acción)\s/i, /^(property|propiedad)\s/i]

/** Ranks at and past this say little of the line:  a variable's card, a template's. */
const SAYS_LITTLE = TELLING.length

/** A hover's "declared in [Card.spell:9](...)" line. */
const DECLARED_IN = /^(declared in|declarad[oa] en)\s/i

/** A Markdown link:  its words alone. */
const LINK = /\[([^\]]*)\]\([^)]*\)/g
