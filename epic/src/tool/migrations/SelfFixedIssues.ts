import { SelfFix } from "spell/epic/tool/SelfFix"

import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `SelfFixedIssues`
 * The migration `self-fixed-issues` (epic `epic-engine` T143):  the fixes that wait for review on a page written
 * before the rule take their new colours.
 * - Owen, 2026-11-22:  "Issues which are fixed before I get to them can just be labeled `FIXED - <description>` and
 *   go to grey automatically" ("Only ones Claude found");  of the others:  "Issue from my words which you are
 *   leaving orange should be light orange"
 * - which:  open issues, `fixed`, nobody at work on them
 *   - greyed only when fixed BEFORE the rule (`RULE_FROM`):  one fixed since waits because the rule said so as it
 *     was fixed, whatever of its reason is still on the page (I375's was gone a minute later)
 *   - Claude found it, and he hasn't got to it:  grey, as a fix writes it now (`SelfFix.mark()`)
 *   - from his own words (`requested`):  light orange, still waiting for his look
 *   - the rest (he got to it):  left orange
 * - NOT stamped `changed`:  nothing happened to them today
 * - runs on command (`epic migrate`), never on every edit:  it closes items, and reads the review inbox
 *   (`MigrationContext.actedOn`)
 * - IDEMPOTENT:  a closed or light orange one is left
 ****************/
export class SelfFixedIssues implements Migration {
  readonly name = "self-fixed-issues"
  readonly kind = "epic"
  readonly date = "2026-11-22"
  readonly everyEdit = false
  readonly description =
    "an issue Claude found and fixed before the person got to it is grey, FIXED - ...;  one from their words, light orange"

  /** Colour every such fix of `document` by today's rule, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const greyed: string[] = []
    const lightened: string[] = []
    const decided = SelfFixedIssues.fixedUnderRule(document)
    for (const item of Array.from(document.querySelectorAll("epic-page > epic-section > epic-item"))) {
      if (!SelfFixedIssues.isWaitingFix(item)) continue
      if (!decided.has(item.id.toUpperCase()) && SelfFix.isTheirsToSkip(item, context.actedOn)) {
        SelfFix.mark(item)
        item.setAttribute("state", "handled")
        greyed.push(item.id.toUpperCase())
      } else if (item.hasAttribute("requested") && item.getAttribute("state") === "replied") {
        item.setAttribute("state", "requested")
        lightened.push(item.id.toUpperCase())
      }
    }
    if (greyed.length) context.notes?.push(`self-fixed-issues:  FIXED, grey:  ${greyed.join(", ")}`)
    if (lightened.length)
      context.notes?.push(`self-fixed-issues:  from the person's words, light orange:  ${lightened.join(", ")}`)
    return greyed.length > 0 || lightened.length > 0
  }

  /** The ids (`I375`) the Log says were fixed for review once the rule was in (`RULE_FROM`). */
  private static fixedUnderRule(document: Document): Set<string> {
    const ids = new Set<string>()
    for (const event of Array.from(document.querySelectorAll('epic-page > epic-section[kind="log"] epic-event'))) {
      const id = FIXED_LINE.exec(event.textContent?.trim() ?? "")?.[1]
      const at = Date.parse(event.getAttribute("at") ?? "")
      if (id && at >= RULE_FROM) ids.add(id)
    }
    return ids
  }

  /** Is `item` open and `fixed`, with nobody at work on it again? */
  private static isWaitingFix(item: Element): boolean {
    if (!item.hasAttribute("fixed") || item.hasAttribute("working")) return false
    const status = item.getAttribute("status")
    if (status && status !== "open") return false
    return !item.querySelector(':scope > epic-status[state="underway"]')
  }
}

/** When T143's rule reached main:  from then on every fix is sorted as it's written. */
const RULE_FROM = Date.parse("2026-11-22T10:39-05:00")

/** The Log's line of a fix waiting for review (`PlanDoc.markFixed()`);  its id. */
const FIXED_LINE = /^([A-Z]+\d+) fixed, for review:/
