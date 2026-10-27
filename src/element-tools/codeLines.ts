/**
 * Which lines of a source file hold code:  the ONE rule every line counter shares (epic `coherence` P23),
 * so two reports never give a file two sizes.
 * - Its users:  Spell UI's `LocCount` (`yarn report`'s line tables).
 *   - spell-epic's `epic loc` (`LinesOfCode.countsOf()`) still strips comments its own way, by regex;  moving it
 *     onto `codeLines()` is the catalog's copy left ("Lines of code").
 * - Imports nothing, so plain `node` loads it too, with its `.ts`.
 */

/**
 * The lines of `text` that hold code, each trimmed:  blank lines and comment-only lines left out.
 * - `extension` (`.ts`, `.html` ...) picks the comments, `COMMENTS`:
 *   - `.html`:  `<!-- ... -->` blocks
 *   - `.py`:  `#` lines
 *   - `.css`:  `/* ... *\/` blocks
 *   - anything else:  `/* ... *\/` blocks and `//` lines, as JavaScript writes them
 * - A line with code AND a comment counts, whole:  its comment stays in the line returned.
 * - A comment starts only where a line's code would:  `/*` inside a string further along (a glob,
 *   `"src/*.ts"`) is code, and never swallows the lines after it.
 * - A quick pass, not a parser:  a line inside a multi-line string that starts like a comment is taken for one.
 */
export function codeLines(text: string, extension: string): string[] {
  const { block, line } = COMMENTS[extension] ?? C_LIKE
  const code: string[] = []
  let inBlock = false
  for (const row of text.replace(/\n$/, "").split("\n")) {
    let rest = row.trim()
    let hasCode = false
    while (rest) {
      // only a language with block comments is ever in one
      if (block && inBlock) {
        const end = rest.indexOf(block.close)
        if (end < 0) break
        rest = rest.slice(end + block.close.length).trim()
        inBlock = false
        continue
      }
      if (line && rest.startsWith(line)) break
      if (block && rest.startsWith(block.open)) {
        inBlock = true
        rest = rest.slice(block.open.length)
        continue
      }
      hasCode = true
      break
    }
    if (hasCode) code.push(row.trim())
  }
  return code
}

////////////////
// ## Comments
////////////////

/** How a language writes its comments:  a block's `open` and `close`, and what starts a line comment. */
export type CommentSyntax = {
  /** a block comment, e.g. `/*` ... `*\/` */
  block?: { open: string; close: string }
  /** what starts a comment running to the line's end, e.g. `//` */
  line?: string
}

/** JavaScript's, TypeScript's and most languages':  `/* ... *\/` and `//`. */
const C_LIKE: CommentSyntax = { block: { open: "/*", close: "*/" }, line: "//" }

/** Each extension whose comments aren't `C_LIKE`'s. */
const COMMENTS: Readonly<Record<string, CommentSyntax>> = {
  ".html": { block: { open: "<!--", close: "-->" } },
  ".css": { block: { open: "/*", close: "*/" } },
  ".py": { line: "#" }
}
