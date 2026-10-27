import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { CATALOG_FILE, WORDS_FILE, type ScoreSearch, type ScoreSearches } from "./coherence.types"

/**
 * Reading the score's searches from the catalog and the word list:  each entry's **Score:** line.
 * - The catalog stays the ONE source:  a person reads the same line the score runs.
 * - A line's shape, its parts split by ` · `:
 *
 *   ```text
 *   - **Score:**  `<regex>` · in `<path>` · home `<path>`, `<path>` · not `<path>`, `<path>`
 *   ```
 *
 *   - the search first:  git's Perl regex (`git grep -P`), matched one line at a time
 *   - `in`:  only those paths;  `home`:  the mechanism's own files;  `not`:  paths left out
 *   - every path from the kit's root (`src/server/Git.ts`, `ui/src/runtime/`), a file or a folder
 *   - words after a part's paths are for people:  `not \`x.ts\` (it loads before the kit)`
 * - A line may wrap:  the lines under it, indented, that aren't a bullet of their own, are its.
 * - Also left out of every search:  each path an entry's "Fine:" lines name, and the paths under "Fine as it is".
 */

/**
 * The checkout's searches:  its catalog's and its word list's.
 * - throws `Error` naming the file when the catalog isn't there;  a missing word list has none
 */
export function readScoreSearches(checkout: string): ScoreSearches {
  const catalog = readFileSync(join(checkout, CATALOG_FILE), "utf8")
  const wordsFile = join(checkout, WORDS_FILE)
  return scoreSearchesOf(catalog, existsSync(wordsFile) ? readFileSync(wordsFile, "utf8") : "")
}

/** The searches of `catalog`'s and `words`' texts. */
export function scoreSearchesOf(catalog: string, words: string): ScoreSearches {
  const fine = finePaths(catalog)
  return { mechanisms: searchesIn(catalog, fine), words: searchesIn(words, fine) }
}

/**
 * Each `### ` entry of `text` with a **Score:** line, as a search.
 * - `fine`:  left out of every one
 * - throws `SyntaxError` for a **Score:** line with no search, or a part it can't read, naming the entry
 */
export function searchesIn(text: string, fine: string[] = []): ScoreSearch[] {
  const searches: ScoreSearch[] = []
  for (const entry of entriesOf(text)) {
    const line = bulletsOf(entry.lines).find((bullet) => SCORE_LINE.test(bullet))
    if (!line) continue
    const search = scoreSearchOf(entry.name, line.replace(SCORE_LINE, ""))
    const entryFine = entry.lines.filter((each) => FINE_LINE.test(each)).flatMap(pathsIn)
    searches.push({ ...search, not: [...new Set([...search.not, ...entryFine, ...fine])] })
  }
  return searches
}

/**
 * The search a **Score:** line says, after its label:  `` `<regex>` · home `<path>` ``.
 * - throws `SyntaxError` naming the entry for a line with no search, or a part it can't read
 */
export function scoreSearchOf(name: string, line: string): ScoreSearch {
  const [first = "", ...parts] = line.trim().split(PART_BREAK)
  const pattern = first.match(/^`([^`]+)`/)?.[1]
  if (!pattern) throw new SyntaxError(`catalog entry "${name}":  its Score: line starts with no \`search\``)
  const search: ScoreSearch = { name, pattern, within: [], homes: [], not: [] }
  for (const part of parts) {
    const [, word, rest = ""] = part.match(/^(in|home|not)\s+(.*)$/) ?? []
    if (!word) throw new SyntaxError(`catalog entry "${name}":  "${part}" isn't in, home or not`)
    const paths = codeSpans(rest)
    if (word === "in") search.within.push(...paths)
    else if (word === "home") search.homes.push(...paths)
    else search.not.push(...paths)
  }
  return search
}

/** The paths the catalog's "Fine as it is" names:  left out of every search. */
export function finePaths(catalog: string): string[] {
  const section = catalog.split(/^## /m).find((each) => each.startsWith(FINE_SECTION))
  return section ? pathsIn(section) : []
}

/** What a **Score:** line starts with. */
const SCORE_LINE = /^- \*\*Score:\*\*\s*/

/** A line naming copies kept on purpose:  `Fine:  \`x.ts\` keeps its own`. */
const FINE_LINE = /\bFine:/

/** Between a **Score:** line's parts. */
const PART_BREAK = /\s+·\s+/

/** The catalog's section of copies kept on purpose. */
const FINE_SECTION = "Fine as it is"

/** `text`'s `### ` entries:  each one's title and its lines, up to the next heading. */
function entriesOf(text: string): Array<{ name: string; lines: string[] }> {
  const entries: Array<{ name: string; lines: string[] }> = []
  for (const line of text.split("\n")) {
    const heading = line.match(/^(#{1,3}) (.*)$/)
    if (heading) {
      if (heading[1] === "###") entries.push({ name: heading[2]!.trim(), lines: [] })
      else entries.push({ name: "", lines: [] })
      continue
    }
    entries.at(-1)?.lines.push(line)
  }
  return entries.filter((entry) => entry.name)
}

/** `lines`' top-level bullets, each with its wrapped lines joined:  a bullet of its own ends it. */
function bulletsOf(lines: string[]): string[] {
  const bullets: string[] = []
  let current: string | undefined
  for (const line of lines) {
    if (line.startsWith("- ")) {
      if (current !== undefined) bullets.push(current)
      current = line
    } else if (current !== undefined && /^\s+\S/.test(line) && !/^\s*- /.test(line)) current += ` ${line.trim()}`
    else if (current !== undefined) {
      bullets.push(current)
      current = undefined
    }
  }
  if (current !== undefined) bullets.push(current)
  return bullets
}

/** Every `` `code` `` span of `text`, in order. */
function codeSpans(text: string): string[] {
  return [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]!)
}

/** The code spans of `text` that are paths from the kit's root:  `epic/src/tool/InboxPoller.mjs`, `src/x/`. */
function pathsIn(text: string): string[] {
  return codeSpans(text).filter((span) => /^[\w.@-]+(\/[\w.@-]+)+\/?$/.test(span) && !span.includes(".."))
}
