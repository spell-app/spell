import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

/****************
 * ### `FamilyExamples`
 * A component family's element examples, `src/components/<family>/examples/elements/*.html`:  its files, main one
 * first, and each file's sections.
 * - ONE reading for the kitchen sink and the Theming playgrounds (`yarn site:kitchen`) and the claude.ai design
 *   export (`DesignComponents`), so both show a family by the same sections (epic `coherence` P23).
 * - Each caller filters what it can't show:  the kitchen sink leaves out the tests' `stub-*` stand-ins, the design
 *   export what loads a `source`.
 * - Static:  pure name and text rules, no state.
 ****************/
export class FamilyExamples {
  /**
   * Family `folder`'s example files (`ui-button`, under `components`:  Spell UI's `src/components/`), absolute:
   * its MAIN file first, then the others A-Z;  none without examples.
   * - The main file:  `MAIN_FILES`' name for the family, else `types.html`, else its first file.
   *   The kitchen sink shows it, and a page's Theming playground its first section.
   */
  static files(components: string, folder: string): string[] {
    const examples = join(components, folder, ELEMENT_EXAMPLES)
    if (!existsSync(examples)) return []
    const names = readdirSync(examples)
      .filter((name) => name.endsWith(".html"))
      .sort()
    const named = MAIN_FILES[folder]
    const main = named && names.includes(named) ? named : names.includes(TYPES_FILE) ? TYPES_FILE : names[0]
    return [...names.filter((name) => name === main), ...names.filter((name) => name !== main)].map((name) =>
      join(examples, name)
    )
  }

  /**
   * An example file's sections:  each `<section>` at the wrapper's top level (`  <section>`, with at most a `class`
   * of its own), its `<h4>` the title, its body dedented to column 0.
   * - Comments are left out, a comment's own lines with them.
   * - A `<section>` with other attributes (`id`, `style`) is an example's own markup, not one of the file's sections
   *   (`<ui-toc>`'s example follows one).
   * - A file without sections is ONE untitled section:  all of it.
   * - Blank lines at a body's ends, and spaces at its lines' ends, are left out.
   */
  static sections(html: string): ExampleSection[] {
    const lines = html.replace(COMMENT_LINES, "").replace(COMMENT, "").split("\n")
    const sections: ExampleSection[] = []
    let current: ExampleSection | undefined
    for (const line of lines) {
      const open = SECTION_OPEN.exec(line)
      if (open) {
        current = { title: "", className: open[1], body: [] }
        continue
      }
      if (!current) continue
      if (line === SECTION_CLOSE) {
        sections.push({ ...current, body: FamilyExamples.trim(current.body) })
        current = undefined
        continue
      }
      const title = TITLE.exec(line)
      if (title && !current.title) current.title = title[1]!
      else current.body.push(line.slice(BODY_INDENT))
    }
    if (sections.length) return sections
    return [{ title: "", body: FamilyExamples.trim(lines) }]
  }

  /** `lines` without leading and trailing blank lines, nor spaces at their ends. */
  private static trim(lines: string[]): string[] {
    const first = lines.findIndex((line) => line.trim())
    const last = lines.findLastIndex((line) => line.trim())
    return first < 0 ? [] : lines.slice(first, last + 1).map((line) => line.trimEnd())
  }
}

/** One example section of a file. */
export type ExampleSection = {
  /** its `<h4>`'s text as written, `""` for none (a file without sections) */
  title: string
  /** the `<section>`'s own class, e.g. `ui-dark ui-p-m` */
  className?: string
  /** its markup, dedented to column 0 */
  body: string[]
}

/** A family's element examples, in its folder. */
const ELEMENT_EXAMPLES = "examples/elements"

/** A family's main example file, unless `MAIN_FILES` names another. */
const TYPES_FILE = "types.html"

/** A family's main example file where it isn't `types.html` (or the first file):  folder => file name. */
const MAIN_FILES: Readonly<Record<string, string>> = { "ui-parts": "header.html" }

/** A section's opening tag, on its own line at the wrapper's top level:  its own class, if any. */
const SECTION_OPEN = /^ {2}<section(?: class="([^"]*)")?>$/

/** A section's closing tag. */
const SECTION_CLOSE = "  </section>"

/** A section's title, its first child. */
const TITLE = /^ {4}<h4>(.*)<\/h4>$/

/** How far a section's body is indented:  inside the wrapper, inside the section. */
const BODY_INDENT = 4

/** Lines holding only a comment (one or several lines long), with their line breaks. */
const COMMENT_LINES = /^[ \t]*<!--(?:(?!-->)[\s\S])*-->[ \t]*\n/gm

/** Any comment left, inside a line. */
const COMMENT = /<!--[\s\S]*?-->/g
