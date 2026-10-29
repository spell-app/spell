import { PlanTime } from "spell/epic/tool/PlanTime"
import { Renumber } from "spell/epic/tool/Renumber"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `ItemRenames`
 * The migration `item-renames` (epic `epic-engine` P44;  Owen, 2026-10-25:  "`Todo`, key T, `Manual tests` -- can we
 * use `M` or did we already use `m` for `mark`?  Can `Mark` be `Comment (C)`"):  the item letters say what they are.
 * - Caveats become Todo:  `c3` => `t3`, the section `kind="todos"`, `id="todos"` (a limit stays a todo marked `limit`)
 * - Tests become Manual tests:  `t3` => `m3`
 * - comments become C:  the review inbox's `m3` (and the older `cm3`) => `c3`, by `CommentList.migrate()` as the
 *   runner rewrites the inbox;  items and comments are kept apart, so no number ever meets another's
 * - every number kept, ALL AT ONCE (`Renumber.page()`, the content repo's sync's renumbering too):
 *   a `t3` made from a `c3` is never then made an `m3`
 * - every reference on the page follows:  ids, `#t3` links (and words that only say `T3`), `#caveats` links, a change
 *   mark's `item`, an `<epic-mark item>`, a part's `source` (its file written fresh under the new name), `part-ids`,
 *   a note box's `for`, an `<epic-link item>` naming this page
 * - the page's review inbox follows too:  the runner re-keys it (`context.renames`, `ReviewInbox.renameIds()`), its
 *   marks by item, and a comment anchored on a renamed item with it
 * - ONE log line says the letters moved;  the links on OTHER pages follow by the content folder's pass
 *   (`ContentRelink`, `epic migrate`)
 * - which pages:  one with a Caveats section, or `t` ids in its Tests;  migrated, it has neither, so a second run
 *   changes nothing (IDEMPOTENT)
 * - Runs on command (`epic migrate`), never on every edit:  it renumbers, and links from other pages need the content
 *   folder's pass too
 * - it retired `caveats-and-tests` (P32's):  no page needed it any more, and it would read the new Todo section's `t`
 *   ids as old todos
 ****************/
export class ItemRenames implements Migration {
  readonly name = "item-renames"
  readonly kind = "epic"
  readonly date = "2026-10-25"
  readonly everyEdit = false
  readonly description = "Caveats become Todo (C -> T), Tests become Manual tests (T -> M), comments M -> C"

  /** Migrate `document`, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const caveats = document.querySelector(`epic-page > epic-section[kind="${OLD_KIND}"]`)
    const renames = ItemRenames.renames(document)
    if (!caveats && !Object.keys(renames).length) return false
    Renumber.page(document, { ...renames, [OLD_KIND]: NEW_KIND }, context.epic)
    if (caveats) {
      caveats.setAttribute("kind", NEW_KIND)
      caveats.id = NEW_KIND
    }
    ItemRenames.log(document, LOG_LINE, context.now)
    context.notes?.push(`item-renames:  ${ItemRenames.counted(renames)}`)
    context.renames = { ...context.renames, ...renames }
    return true
  }

  /**
   * The page's renames, old id => new, every number kept:  its caveats `c3` => `t3`, its tests `t3` => `m3`.
   * Nothing on a page migrated already (no Caveats section, no `t` in Tests).
   */
  static renames(document: Document): Record<string, string> {
    const renames: Record<string, string> = {}
    for (const item of ItemRenames.itemsIn(document, OLD_KIND, OLD_TODO)) renames[item.id] = `t${item.id.slice(1)}`
    for (const item of ItemRenames.itemsIn(document, "tests", OLD_TEST)) renames[item.id] = `m${item.id.slice(1)}`
    return renames
  }

  /** How many of each `renames` moved, for the page's report:  `5 caveats -> todos, 3 tests -> manual tests`. */
  static counted(renames: Record<string, string>): string {
    const to = Object.values(renames)
    const todos = to.filter((id) => id.startsWith("t")).length
    const tests = to.filter((id) => id.startsWith("m")).length
    return `${todos} caveat${todos === 1 ? "" : "s"} -> todos, ${tests} test${tests === 1 ? "" : "s"} -> manual tests`
  }

  /** The page's items in its `kind` section whose id matches `pattern`, in page order. */
  private static itemsIn(document: Document, kind: string, pattern: RegExp): Element[] {
    return Array.from(document.querySelectorAll(`epic-page > epic-section[kind="${kind}"] > epic-item`)).filter(
      (item) => pattern.test(item.id)
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

/** The Caveats section's kind and id before the step. */
const OLD_KIND = "caveats"

/** ... and the Todo section's, after. */
const NEW_KIND = "todos"

/** A caveat's id before the step:  `c3`. */
const OLD_TODO = /^c\d+$/

/** A test's id before the step:  `t3`. */
const OLD_TEST = /^t\d+$/

/** The page's one log line:  every number kept, so it says the letters, not each id. */
const LOG_LINE =
  "The item letters moved, every number kept:  Caveats are Todo (C3 -> T3), Tests are Manual tests (T3 -> M3), " +
  "comments are C (M3 -> C3)"
