import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { ContentRelink, type RelinkCount } from "./migrations/ContentRelink"
import type { PlanDocFiles } from "./PlanDocFiles"
import { ReviewInbox } from "./ReviewInbox"

/****************
 * ### `Renumber`
 * Giving an epic page's ids new numbers, every reference following:  the ONE way it's done, for the migration
 * `item-renames` (letters moved, every number kept) and for the content repo's sync (`SharedSync`, epic `epic-friend`
 * P5:  two people both made `T22`, and this machine's becomes `T23`).
 * - `page()`:  the page itself, in memory, ALL AT ONCE (`c3` => `t3` while `t3` => `m3`)
 *   - items' ids, change marks' ids (`ch12`), a request's (`r3`:  its folder in links and pictures, its label)
 *   - every reference:  `#t3` links (and words that only say `T3`), `item`, `for`, a part's `source`, `part-ids`,
 *     `to-accept`
 * - `epic()`:  the sync's whole renumbering of one epic:  its page (`page()`, written as an edit is, with a log line),
 *   its review inbox (`ReviewInbox.renameIds()`), its request folders, and links on OTHER pages (`others()`)
 * - `others()`:  links on other pages of the content folder (`ContentRelink`):  `epic migrate` runs it after the
 *   pages, for every epic it renumbered
 * - node only:  `epic()` and `others()` write files;  `page()` is pure DOM, on linkedom or a browser's
 ****************/
export class Renumber {
  /**
   * Rename every reference in `document` by `renames` (old id => new, lower case), ALL AT ONCE:  each value is read
   * once and written once, so nothing is renamed twice;  changed?
   * - an item's `id`, a change mark's `id`;  `href` to `#t3` (or a section, `#caveats`) on this page (`epic`'s, or no
   *   page);  a link's words that only say `T3`
   * - an `item` (a change mark, an `<epic-mark>`, an `<epic-link>` with no `epic` or this one), a note box's `for`
   * - a part's `source` (`parts/t3.html`), a host's `part-ids` and `to-accept`
   * - a request (`r3` => `r5`):  its folder in any link or picture (`requests/r3/`), a link's `target`, and the words
   *   that name it first in a label or a picture's `alt` (`r3 · ...`, `r3, screenshot 1`)
   */
  static page(document: Document, renames: Record<string, string>, epic?: string): boolean {
    if (!Object.keys(renames).length) return false
    let changed = false
    const swap = (id: string) => renames[id.toLowerCase()]
    const set = (element: Element, name: string, value: string) => {
      if (element.getAttribute(name) === value) return
      element.setAttribute(name, value)
      changed = true
    }
    const requests = Object.keys(renames).filter((id) => REQUEST_ID.test(id))
    for (const element of Array.from(document.querySelectorAll("*"))) {
      if (RENUMBERED.has(element.localName) && swap(element.id)) set(element, "id", swap(element.id)!)
      for (const name of ["item", "for"]) {
        const value = element.getAttribute(name)
        const other = element.getAttribute("epic")
        if (value && swap(value) && (!other || other === epic)) {
          const to = swap(value)!
          set(element, name, value === value.toUpperCase() ? to.toUpperCase() : to)
        }
      }
      const source = element.getAttribute("source")
      const part = source && /^(.*parts\/)([a-z]+\d+)(\.html)$/.exec(source)
      if (part && swap(part[2]!)) set(element, "source", `${part[1]}${swap(part[2]!)}${part[3]}`)
      for (const name of ["part-ids", "to-accept"]) {
        const ids = element.getAttribute(name)
        if (ids)
          set(
            element,
            name,
            ids
              .split(/\s+/)
              .map((id) => swap(id) ?? id)
              .join(" ")
          )
      }
      const href = element.getAttribute("href")
      const link = href && /^([^#]*)#([a-z][\w-]*)$/.exec(href)
      if (link && swap(link[2]!) && (link[1] === "" || (epic && link[1]!.endsWith(`${epic}.plan.html`)))) {
        set(element, "href", `${link[1]}#${swap(link[2]!)}`)
        const words = element.textContent?.trim() ?? ""
        if (words.toLowerCase() === link[2] && ITEM_ID.test(words) && element.children.length === 0) {
          element.textContent = swap(link[2]!)!.toUpperCase()
          changed = true
        }
      }
      for (const id of requests) Renumber.request(element, id, renames[id]!, set)
    }
    return changed
  }

  /**
   * Renumber epic `name`'s ids by `renames` (old => new, lower case), as the sync does (`SharedSync`):  how many
   * links on other pages followed.
   * - its page (`PlanDocFiles.edit()`:  under its lock, stamped and checked as any edit), with `line` in its log
   * - its review inbox:  marks, drafts and comments on a renamed item follow it (`ReviewInbox.renameIds()`)
   * - its request folders:  `requests/r3/` moved to `requests/r5/`, its `request.md` saying `id: r5`
   * - the links on other pages (`others()`)
   * - SIDE EFFECT:  writes all of those
   */
  static async epic(files: PlanDocFiles, name: string, renames: Record<string, string>, line: string): Promise<number> {
    const file = files.findDoc(name)
    await files.edit(file, (plan) => {
      Renumber.page(plan.document, renames, name)
      plan.log(line)
    })
    const inbox = ReviewInbox.pathFor(file)
    if (existsSync(inbox)) await ReviewInbox.updateAsync(inbox, (each) => void each.renameIds(renames))
    for (const [from, to] of Object.entries(renames)) {
      if (!REQUEST_ID.test(from)) continue
      const folder = join(dirname(file), "requests", from)
      if (!existsSync(folder)) continue
      const moved = join(dirname(folder), to)
      renameSync(folder, moved)
      const markdown = join(moved, "request.md")
      if (existsSync(markdown))
        writeFileSync(markdown, readFileSync(markdown, "utf8").replace(new RegExp(`^id: ${from}$`, "m"), `id: ${to}`))
    }
    return Renumber.others(files.content, { [name]: renames }).links
  }

  /**
   * Links on OTHER pages under `root` to the items each epic renamed (`renames`:  epic => old id => new), rewritten
   * (`ContentRelink.run()`);  how many files and links changed (or would, with `dryRun`).
   */
  static others(root: string, renames: Record<string, Record<string, string>>, { dryRun = false } = {}): RelinkCount {
    return ContentRelink.run(root, renames, { dryRun })
  }

  /** Request `from`'s folder, target and naming words in `element`'s attributes, as request `to`'s. */
  private static request(
    element: Element,
    from: string,
    to: string,
    set: (element: Element, name: string, value: string) => void
  ): void {
    for (const name of ["href", "src"]) {
      const value = element.getAttribute(name)
      if (value?.includes(`requests/${from}/`))
        set(element, name, value.replace(`requests/${from}/`, `requests/${to}/`))
    }
    const target = element.getAttribute("target")
    if (target?.includes(`-requests-${from}-`))
      set(element, "target", target.replace(`-requests-${from}-`, `-requests-${to}-`))
    for (const name of ["label", "alt"]) {
      const value = element.getAttribute(name)
      const first = value && new RegExp(`^${from}(?=[\\s,])`).exec(value)
      if (first) set(element, name, to + value.slice(from.length))
    }
  }
}

/** The elements whose `id` is renumbered:  items and change marks. */
const RENUMBERED = new Set(["epic-item", "epic-change"])

/** An item's id, as a link's words may say it:  `T3`. */
const ITEM_ID = /^[a-z]\d+$/i

/** A request's id:  `r3`. */
const REQUEST_ID = /^r\d+$/
