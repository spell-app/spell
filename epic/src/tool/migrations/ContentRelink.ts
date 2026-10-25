import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

import { escapeRegExp } from "spell/util/string"

/****************
 * ### `ContentRelink`
 * Links on OTHER pages to items a migration renumbered (epic `epic-engine` P32, `caveats-and-tests`):  every file in
 * the content folder that names an epic's item by its old id, rewritten to the new one.
 * - what it rewrites, for epic `seo` renamed `t3` => `c55`, `v3` => `t3`:
 *   - a URL to its page with the id:  `epics/seo/seo.plan.html#t3` (any path before it;  HTML, Markdown, JSON5)
 *   - an `<epic-link epic="seo" item="T3">`:  its `item`, in the case written
 *   - a short address:  `SAGA:/drawable-spell/seo#T3`, `...:seo#t3`
 * - NOT the epic's own page and parts:  the step renumbered those already (`CaveatsAndTests.renumber()`);  its
 *   details pages and the rest of its folder ARE rewritten
 * - all of an epic's renames at once, so `v3` => `t3` never then becomes `c55`
 * - NOT idempotent:  run it once, with the renames of the pages THIS run migrated (`MigrateCommands`);  a second run
 *   finds nothing to migrate, so nothing to relink
 * - words in prose (`T3 of seo`) are left as written:  the page's log says what each old id became
 * - Node only, plain text:  a file is rewritten only when something in it changed, every other byte kept
 ****************/
export class ContentRelink {
  /**
   * Rewrite links under `root` by `renames` (epic => old id => new);  how many files and links changed (or would,
   * with `dryRun`).
   */
  static run(root: string, renames: Record<string, Record<string, string>>, { dryRun = false } = {}): RelinkCount {
    const epics = Object.entries(renames).filter(([, map]) => Object.keys(map).length)
    const count: RelinkCount = { files: 0, links: 0 }
    if (!epics.length) return count
    for (const file of ContentRelink.files(root)) {
      const path = relative(root, file).split(sep).join("/")
      const before = readFileSync(file, "utf8")
      let text = before
      let links = 0
      for (const [epic, map] of epics) {
        // the step renumbered the page itself and its parts
        if (path === `epics/${epic}/${epic}.plan.html` || path.startsWith(`epics/${epic}/parts/`)) continue
        const result = ContentRelink.rewrite(text, epic, map)
        text = result.text
        links += result.links
      }
      if (text === before) continue
      count.files++
      count.links += links
      if (!dryRun) writeFileSync(file, text)
    }
    return count
  }

  /** `text` with epic `epic`'s links renamed by `map` (old id => new, lower case), and how many changed. */
  static rewrite(text: string, epic: string, map: Record<string, string>): { text: string; links: number } {
    let links = 0
    // each new id goes in MARKED, so no later pass renames it again (`v8` => `t8`, never then `t8` => `c10`)
    const swap = (id: string) => {
      const to = map[id.toLowerCase()]
      if (!to) return id
      links++
      return `${MARK[0]}${id === id.toUpperCase() ? to.toUpperCase() : to}${MARK[1]}`
    }
    const name = escapeRegExp(epic)
    // a link whose words only say its old id (`<a href="...seo.plan.html#t8">T8</a>`):  the words follow too
    text = text.replace(
      new RegExp(`(<a\\b[^>]*${name}\\.plan\\.html#)([a-z]\\d+)("[^>]*>\\s*)([A-Z]\\d+)(\\s*</a>)`, "g"),
      (whole, start, id, middle, words, end) => {
        if (words.toLowerCase() !== id || !map[id]) return whole
        links--
        return start + swap(id) + middle + swap(words) + end
      }
    )
    text = text.replace(new RegExp(`(${name}\\.plan\\.html#)([a-z]\\d+)\\b`, "g"), (_, page, id) => page + swap(id))
    text = text.replace(new RegExp(`([/:]${name}#)([A-Za-z]\\d+)\\b`, "g"), (_, page, id) => page + swap(id))
    text = text.replace(/<epic-link\b[^>]*>/g, (tag) => {
      if (!new RegExp(`\\sepic="${name}"`).test(tag)) return tag
      return tag.replace(/(\sitem=")([A-Za-z]\d+)(")/, (_, start, id, end) => start + swap(id) + end)
    })
    return { text: text.replace(MARKED, "$1"), links }
  }

  /** Every page, Markdown and JSON5 file under `root`, but in `.git` and `node_modules`. */
  private static *files(root: string): Generator<string> {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules") continue
      const path = join(root, entry.name)
      if (entry.isDirectory()) yield* ContentRelink.files(path)
      else if (entry.isFile() && TEXT_FILE.test(entry.name)) yield path
    }
  }
}

/** What `ContentRelink.run()` changed:  files, and links in them. */
export type RelinkCount = { files: number; links: number }

/** What wraps a new id until every pass is done (`ContentRelink.rewrite()`):  characters no page holds. */
const MARK = ["\u0001", "\u0002"] as const

/** A marked new id:  the id is `$1`. */
// oxlint-disable-next-line no-control-regex -- the marks are control characters on purpose:  no page holds them
const MARKED = /\u0001([^\u0002]*)\u0002/g

/** The files a link may be in. */
const TEXT_FILE = /\.(html|md|json5)$/
