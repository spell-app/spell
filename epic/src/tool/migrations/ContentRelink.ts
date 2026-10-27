import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

import { escapeRegExp } from "spell/util/string"
import { SRV } from "spell/server"
import { DataFile } from "spell/epic/data/DataFile"
import { CommentList, type Comment } from "spell/epic/tool/CommentList"

import { RootLinks } from "./RootLinks"

/****************
 * ### `ContentRelink`
 * Links on OTHER pages to items a migration renamed (epic `epic-engine` P32;  `item-renames`, P44):  every file in
 * the content folder that names an epic's item (or section) by its old id, rewritten to the new one.
 * - what it rewrites, for epic `seo` renamed `c3` => `t3`, `t3` => `m3`, `caveats` => `todos`:
 *   - a URL to its page with the id:  `epics/seo/seo.plan.html#t3` (any path before it;  HTML, Markdown, JSON5)
 *   - an `<epic-link epic="seo" item="T3">`:  its `item`, in the case written
 *   - a short address:  `SAGA:/drawable-spell/seo#T3`, `...:seo#t3`
 * - NOT the epic's own page and parts:  the step renumbered those already (`ItemRenames.renumber()`);  its
 *   details pages and the rest of its folder ARE rewritten
 * - all of an epic's renames at once, so `c3` => `t3` never then becomes `m3`
 * - NOT idempotent:  run it once, with the renames of the pages THIS run migrated (`MigrateCommands`);  a second run
 *   finds nothing to migrate, so nothing to relink
 * - words in prose (`T3 of seo`) are left as written:  the page's log says what each old id became
 * - Node only, plain text:  a file is rewritten only when something in it changed, every other byte kept;  under its
 *   page's lock, as `RootLinks` writes (`RootLinks.lockOf()`)
 * - and every inbox's COMMENTS (`respellComments()`):  their keys respelt `c3` (epic `epic-engine` P44)
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
      /** The links it renamed, written back unless `dryRun`;  `undefined` when nothing changed. */
      const relink = (): number | undefined => {
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
        if (text === before) return undefined
        if (!dryRun) writeFileSync(file, text)
        return links
      }
      // under its page's lock, as its writers take it:  a session writing the page meanwhile loses no write
      const links = dryRun ? relink() : SRV.FileLock.run(RootLinks.lockOf(file), relink, RootLinks.LOCK)
      if (links === undefined) continue
      count.files++
      count.links += links
    }
    return count
  }

  /** `text` with epic `epic`'s links renamed by `map` (old id => new, lower case), and how many changed. */
  static rewrite(text: string, epic: string, map: Record<string, string>): { text: string; links: number } {
    let links = 0
    // each new id goes in MARKED, so no later pass renames it again (`t8` => `m8`, never then `c8` => `t8` => `m8`)
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
    text = text.replace(new RegExp(`(${name}\\.plan\\.html#)(${ANCHOR})`, "g"), (_, page, id) => page + swap(id))
    text = text.replace(new RegExp(`([/:]${name}#)(${ANCHOR})`, "g"), (_, page, id) => page + swap(id))
    text = text.replace(/<epic-link\b[^>]*>/g, (tag) => {
      if (!new RegExp(`\\sepic="${name}"`).test(tag)) return tag
      return tag.replace(/(\sitem=")([A-Za-z]\d+)(")/, (_, start, id, end) => start + swap(id) + end)
    })
    return { text: text.replace(MARKED, "$1"), links }
  }

  /**
   * Every inbox under `root` (`<page>.inbox.json5`:  an epic page's, a saga page's, a docs page's) with its comments'
   * keys respelt as the files key them now (`c3`, from `m3` and `cm3`:  `CommentList.migrate()`), open and closed;
   * how many files and comments changed (or would, with `dryRun`).
   * - the ids are only keys:  nothing else in a file names a comment
   * - each file under its own lock, the one its writers take;  every other key and comment in it kept
   * - idempotent:  a respelt file reads as one written since
   */
  static respellComments(root: string, { dryRun = false } = {}): RelinkCount {
    const count: RelinkCount = { files: 0, links: 0 }
    for (const file of ContentRelink.files(root, INBOX_FILE)) {
      const old = Object.keys(DataFile.read<InboxComments>(file)?.comments ?? {}).filter(
        (key) => CommentList.keyOf(key) !== key
      )
      if (!old.length) continue
      count.files++
      count.links += old.length
      if (dryRun) continue
      SRV.FileLock.run(file, () =>
        DataFile.edit<InboxComments>(file, (value) => {
          if (value?.comments) CommentList.migrate(value.comments)
          return value ?? {}
        })
      )
    }
    return count
  }

  /** Every file under `root` whose name passes `pattern` (a page, Markdown or JSON5), but in `.git` and `node_modules`. */
  private static *files(root: string, pattern: RegExp = TEXT_FILE): Generator<string> {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules") continue
      const path = join(root, entry.name)
      if (entry.isDirectory()) yield* ContentRelink.files(path, pattern)
      else if (entry.isFile() && pattern.test(entry.name)) yield path
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

/** An inbox file:  its comments are respelt (`respellComments()`). */
const INBOX_FILE = /\.inbox\.json5$/

/** An id a link lands on, as the rewrite reads it:  an item's (`t3`, `T3`) or a section's (`caveats`). */
const ANCHOR = "[A-Za-z][\\w-]*"

/** What `respellComments()` reads of an inbox file:  its comments, by key. */
type InboxComments = { comments?: Record<string, Comment> }
