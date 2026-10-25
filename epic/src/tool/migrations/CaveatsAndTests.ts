import { Markup } from "spell-epic/markup"
import { PlanItem } from "spell-epic/tool/PlanItem"
import { PlanTime } from "spell-epic/tool/PlanTime"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `CaveatsAndTests`
 * The migration `caveats-and-tests` (epic `epic-engine` P32;  Q16, Owen, 2026-10-24:  "call this `caveat` so we can
 * use `C` for this and `T` for tests", and "renumber the todos/caveats/links when migrating"):
 * ONE list of loose ends, Caveats, holding the todos too;  tests take the letter `T`.
 * - the page's caveats KEEP their ids, marked `limit` (`<epic-item limit>`):  each was a limit to know about
 * - its todos (`t3`) become caveats with no `limit` (work still to do), numbered after the last caveat, in page
 *   order, and move to the end of the Caveats section;  the Todos section goes
 * - its tests (`v3`) become `t3`:  the same number
 * - every reference on the page follows, all at once (`renames()`):  ids, `#t3` links (and words that only say
 *   `T3`), a change mark's `item`, a part's `source`, `part-ids`, a note box's `for`, an `<epic-link item>` naming
 *   this page
 * - the page's review inbox follows too:  the runner re-keys it (`context.renames`, `ReviewInbox.renameIds()`)
 * - the LOG records the renames, `T1 → C12, V1 → T1`, so "T4" in old chat and commits can be looked up;
 *   `CaveatsAndTests.renamesInLog()` reads them back for the links on OTHER pages (`epic migrate --relink`)
 * - which pages:  one with a Todos section (`kind="todos"`) or a `v` test;  migrated, it has neither, so a second
 *   run changes nothing (IDEMPOTENT)
 * - Runs on command (`epic migrate`), never on every edit:  it renumbers, and links from other pages need the
 *   content folder's pass too
 ****************/
export class CaveatsAndTests implements Migration {
  readonly name = "caveats-and-tests"
  readonly kind = "epic"
  readonly date = "2026-10-24"
  readonly everyEdit = false
  readonly description = "todos fold into Caveats (new C ids after the caveats, which are marked limit);  tests V -> T"

  /** Migrate `document`, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const todosSection = document.querySelector('epic-page > epic-section[kind="todos"]')
    const renames = CaveatsAndTests.renames(document)
    if (!todosSection && !Object.keys(renames).length) return false
    let caveats = document.querySelector('epic-page > epic-section[kind="caveats"]')
    // the caveats already written:  limits to know about
    for (const caveat of CaveatsAndTests.itemsWith(document, CAVEAT)) Markup.set<"epic-item">(caveat, { limit: true })
    CaveatsAndTests.renumber(document, renames, context.epic)
    if (todosSection) {
      if (!caveats) {
        // no Caveats section:  the Todos one becomes it, where it stands
        Markup.set<"epic-section">(todosSection, { kind: "caveats" })
        todosSection.id = "caveats"
        caveats = todosSection
      } else {
        for (const item of Array.from(todosSection.querySelectorAll(":scope > epic-item"))) caveats.append(item)
        todosSection.remove()
      }
    }
    const line = CaveatsAndTests.logLine(renames)
    if (line) {
      CaveatsAndTests.log(document, line, context.now)
      context.notes?.push(`caveats-and-tests:  ${line}`)
    }
    context.renames = { ...context.renames, ...renames }
    return true
  }

  /**
   * The page's renames, old id => new (`t3` => `c55`, `v3` => `t3`):  its todos numbered after its last caveat, in
   * page order;  its tests to `t`, the same number.  Nothing on a page migrated already (no `t` todo, no `v` test).
   */
  static renames(document: Document): Record<string, string> {
    const renames: Record<string, string> = {}
    const todos = document.querySelector('epic-page > epic-section[kind="todos"]')
      ? CaveatsAndTests.itemsWith(document, OLD_TODO)
      : []
    let next = Math.max(0, ...CaveatsAndTests.itemsWith(document, CAVEAT).map((item) => PlanItem.idNumber(item.id)))
    for (const todo of todos) renames[todo.id] = `c${++next}`
    for (const test of CaveatsAndTests.itemsWith(document, OLD_TEST))
      renames[test.id] = `t${PlanItem.idNumber(test.id)}`
    return renames
  }

  /**
   * Every rename a migrated page's log records (`T1 → C12, V1 → T1`), old id => new, lower case;  `{}` for a page
   * the step never ran on.  What the content folder's pass rewrites other pages' links by.
   */
  static renamesInLog(document: Document): Record<string, string> {
    const renames: Record<string, string> = {}
    for (const event of document.querySelectorAll('epic-section[kind="log"] > epic-event')) {
      const text = event.textContent ?? ""
      if (!text.startsWith(LOG_PREFIX)) continue
      for (const [, from, to] of text.matchAll(/\b([TV]\d+) → ([CT]\d+)\b/g))
        renames[from!.toLowerCase()] = to!.toLowerCase()
    }
    return renames
  }

  /**
   * Rename every reference in `document` by `renames`, ALL AT ONCE (`v3` => `t3` while `t3` => `c55`);  changed?
   * - an item's `id`;  `href` to `#t3` on this page (`epic`'s, or no page);  a link's words that only say `T3`
   * - a change mark's `item`, a part's `source` (`parts/t3.html`), a host's `part-ids`, a note box's `for`
   * - an `<epic-link item>` with no `epic`, or this one
   */
  static renumber(document: Document, renames: Record<string, string>, epic?: string): boolean {
    if (!Object.keys(renames).length) return false
    let changed = false
    const swap = (id: string) => renames[id.toLowerCase()]
    const set = (element: Element, name: string, value: string) => {
      if (element.getAttribute(name) === value) return
      element.setAttribute(name, value)
      changed = true
    }
    for (const element of Array.from(document.querySelectorAll("*"))) {
      if (element.localName === "epic-item" && swap(element.id)) set(element, "id", swap(element.id)!)
      for (const name of ["item", "for"]) {
        const value = element.getAttribute(name)
        const other = element.getAttribute("epic")
        if (value && swap(value) && (!other || other === epic)) {
          const to = swap(value)!
          set(element, name, value === value.toUpperCase() ? to.toUpperCase() : to)
        }
      }
      const source = element.getAttribute("source")
      const part = source && /^(.*parts\/)([a-z]\d+)(\.html)$/.exec(source)
      if (part && swap(part[2]!)) set(element, "source", `${part[1]}${swap(part[2]!)}${part[3]}`)
      const partIds = element.getAttribute("part-ids")
      if (partIds)
        set(
          element,
          "part-ids",
          partIds
            .split(/\s+/)
            .map((id) => swap(id) ?? id)
            .join(" ")
        )
      const href = element.getAttribute("href")
      const link = href && /^([^#]*)#([a-z]\d+)$/.exec(href)
      if (link && swap(link[2]!) && (link[1] === "" || (epic && link[1]!.endsWith(`${epic}.plan.html`)))) {
        set(element, "href", `${link[1]}#${swap(link[2]!)}`)
        const words = element.textContent?.trim() ?? ""
        if (words.toLowerCase() === link[2] && element.children.length === 0) {
          element.textContent = swap(link[2]!)!.toUpperCase()
          changed = true
        }
      }
    }
    return changed
  }

  /** `renames` as the log says them:  `T1 → C12, V1 → T1`;  `""` for none. */
  static logLine(renames: Record<string, string>): string {
    const pairs = Object.entries(renames).map(([from, to]) => `${from.toUpperCase()} → ${to.toUpperCase()}`)
    return pairs.length ? `${LOG_PREFIX}${pairs.join(", ")}` : ""
  }

  /** The page's items whose id matches `pattern`, in page order. */
  private static itemsWith(document: Document, pattern: RegExp): Element[] {
    return Array.from(document.querySelectorAll("epic-page > epic-section > epic-item")).filter((item) =>
      pattern.test(item.id)
    )
  }

  /** Add `line` to the page's log, at `now`. */
  private static log(document: Document, line: string, now: Date) {
    const log = document.querySelector('epic-page > epic-section[kind="log"]')
    if (!log) return
    const event = document.createElement("epic-event")
    event.setAttribute("at", PlanTime.isoMinutes(now))
    event.textContent = line
    log.append(event)
  }
}

/** A caveat's id. */
const CAVEAT = /^c\d+$/

/** A todo's id before the step:  `t3`. */
const OLD_TODO = /^t\d+$/

/** A test's id before the step:  `v3`. */
const OLD_TEST = /^v\d+$/

/** How the log's line of renames starts:  `renamesInLog()` finds it by this. */
const LOG_PREFIX = "Caveats hold the todos now, tests are T:  "
