import { ThreadFacts } from "spell/epic/comments"
import { Markup } from "spell/epic/markup"
import { partOf } from "spell/epic/review/review.types"
import { PlanItem } from "spell/epic/tool/PlanItem"
import { ISSUE_ID } from "spell/epic/tool/planDoc.types"

import type { ReviewInbox } from "./ReviewInbox"

/****************
 * ### `SelfFix`
 * An issue Claude found and fixed before the person got to it (epic `epic-engine` T143):
 * grey at once, its line reading `FIXED - <description>`, with nothing for them to press.
 * - Owen, 2026-11-22:  "Issues which are fixed before I get to them can just be labeled `FIXED - <description>` and
 *   go to grey automatically";  asked which:  "Only ones Claude found"
 * - never one from their own words (`requested`):  that waits for their look, light orange
 * - never one they got to first (`isGotTo()`):  that waits for their check, orange
 * - on the page:  `<epic-item status="done" self-fixed>`
 *   - closed, so whatever reads a closed item leaves it be
 *   - `FIXED - ` starts its line, as any fix's (`TitlePrefix`):  the stored title never changes
 * - the ONE place the rule lives:  the fix (`PlanDoc`) and the migration `self-fixed-issues` both ask here
 * - reads only what it's handed, never a file:  the inbox's share is `actedOn()`, worked out by whoever read it
 ****************/
export class SelfFix {
  /**
   * Does fixing `item` need nothing from the person:  an issue, not `requested`, that they hadn't got to?
   * - `actedOn`:  the items they acted on in the page's review inbox (`actedOn()`)
   * - the badges ask `isGotTo()` too (`ItemBadges`, P81):  what they got to is never closed unseen
   */
  static isTheirsToSkip(item: Element, actedOn: ReadonlySet<string> = new Set()): boolean {
    return ISSUE_ID.test(item.id) && !item.hasAttribute("requested") && !SelfFix.isGotTo(item, actedOn)
  }

  /**
   * Has the person got to `item`?
   * - Do this (`urgent`), or a review, deferral or queued work
   * - a mark of theirs already handled (`review-as`:  a Revisit, say), or their reply in it
   * - a mark, comment or urgency waiting in the inbox (`actedOn`)
   * - what only the Log keeps:
   *   - their click on its id chip (urgent, or not), once applied
   *   - a review, deferral or queued work:  a fix for their review takes `reviewed` off, and starting the work
   *     `queued` (I375, 2026-11-22:  OK'd, then greyed by the migration)
   */
  static isGotTo(item: Element, actedOn: ReadonlySet<string> = new Set(), logged?: ReadonlySet<string>): boolean {
    if (actedOn.has(item.id.toLowerCase()) || ACTED_ATTRIBUTES.some((name) => item.hasAttribute(name))) return true
    const replies = Array.from(item.querySelectorAll("epic-reply"))
    if (replies.some((reply) => !PlanItem.inOriginal(reply) && !ThreadFacts.isAgents(reply))) return true
    return (logged ?? SelfFix.loggedGotTo(item.ownerDocument)).has(item.id.toLowerCase())
  }

  /** The ids (lower case) of what `document`'s Log says the person got to (`ACTED_LINES`). */
  static loggedGotTo(document: Document): Set<string> {
    const ids = new Set<string>()
    for (const event of Array.from(document.querySelectorAll('epic-page > epic-section[kind="log"] epic-event'))) {
      const line = event.textContent?.trim() ?? ""
      for (const acted of ACTED_LINES) {
        const id = acted.exec(line)?.[1]
        if (id) ids.add(id.toLowerCase())
      }
    }
    return ids
  }

  /**
   * When `document`'s Log last says the person LOOKED at each item (`LOOKED_LINES`), in ms, by id (lower case).
   * - a look, never an ask:  Do this, Start now and queued work say go, not that they saw the result (I435)
   */
  static loggedLooks(document: Document): Map<string, number> {
    const looks = new Map<string, number>()
    for (const event of Array.from(document.querySelectorAll('epic-page > epic-section[kind="log"] epic-event'))) {
      const id = LOOKED_LINE.exec(event.textContent?.trim() ?? "")?.[1]?.toLowerCase()
      const at = Date.parse((event.getAttribute("at") ?? "").replace(" ", "T"))
      if (id && Number.isFinite(at)) looks.set(id, Math.max(at, looks.get(id) ?? 0))
    }
    return looks
  }

  /**
   * The ids (lower case) of what the person acted on in `inbox`, sent or not:
   * - their marks, waiting or taken, and their requests for now
   * - a note they haven't sent (`drafts`;  epic `epic-engine` I435)
   * - their urgency, from an id chip
   * - their comments, answered and closed ones too
   */
  static actedOn(inbox: ReviewInbox): Set<string> {
    const ids = [
      ...Object.keys(inbox.marks),
      ...Object.keys(inbox.taken),
      ...Object.keys(inbox.drafts ?? {}),
      ...Object.keys(inbox.urgency),
      ...inbox.now.map((request) => request.id),
      ...Object.values(inbox.comments).map((comment) => partOf(comment.anchor))
    ]
    return new Set(ids.map((id) => id.toLowerCase()))
  }

  /**
   * SIDE EFFECT:  `item` is fixed with nothing for the person to do.
   * - closed, `self-fixed`, no longer waiting for their review
   * - its UPDATE label, if any, says `fixed`:  the line's prefix shows that word, the label only `Not in main`
   */
  static mark(item: Element): void {
    Markup.set<"epic-item">(item, { status: "done", selfFixed: true, fixed: undefined })
    PlanItem.updateLabelOf(item)?.setAttribute("became", "fixed")
  }
}

/** An item's own attributes saying the person got to it. */
const ACTED_ATTRIBUTES = ["urgent", "reviewed", "deferred", "queued", "review-as"] as const

/** A Log line saying the person looked at an item as it stood:  their check, pick, skip, x or run, or a review. */
const LOOKED_LINE =
  /^([A-Z]+\d+) (?:approved:|reviewed:|skipped:|hushed:|(?:\S+ )?picked [A-Z]|canceled:\s+dropped by |(?:passed|canceled)\b.*\brun\))/

/**
 * The Log's lines saying the person got to an item;  each one's id.
 * - their click on its id chip (`AuthorWords.fromChip()`)
 * - `epic review`, `epic defer`, `epic queue`:  it was talked through with them
 * - their marks and test runs, applied (P81)
 */
const ACTED_LINES = [
  /^([A-Z]+\d+) (?:not )?urgent\b.*from its id chip\)/,
  /^([A-Z]+\d+) (?:reviewed|deferred|to do):/,
  // their marks, as `inbox apply` logged them (P81:  a fix since took the item's own `reviewed` off, as I375's)
  /^([A-Z]+\d+) (?:approved:|to todo |do this, in |start now:|queued for |(?:\S+ )?picked [A-Z])/,
  // their test run
  /^([A-Z]+\d+) (?:passed|failed|canceled|deferred)\b.*\brun\)/
]
