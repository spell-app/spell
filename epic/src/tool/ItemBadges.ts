import { Markup } from "spell/epic/markup"
import {
  BADGE_LIMITS,
  ItemBadge,
  type Badge,
  type BadgeFacts,
  type BadgeLimits,
  type ClosedAs
} from "spell/epic/components/epic-item/ItemBadge"
import { SelfFix } from "spell/epic/tool/SelfFix"

import {
  CALM_ID,
  FROM_LINE,
  MADE_TODO,
  QUESTION_ID,
  SETTLED_AS,
  TODO_ID,
  type BadgeMode,
  type ItemFacts
} from "./planDoc.types"

import { PlanItem } from "./PlanItem"

/****************
 * ### `ItemBadges`
 * One page's badges (epic `epic-engine` P81):  reads each item's facts off the page, and asks the ONE rule,
 * `ItemBadge`.
 * - only on a page with them (`<epic-page badges="trial | on">`):  none, and the page is drawn as before
 * - `PlanReader.itemState()` takes the badge's colour, `PlanDoc.updateStates()` writes both
 * - what's dear to find is kept until `refresh()`:  the Log's record of what the person got to, the inbox's
 * - reads only what it's handed:  never a file, changes nothing
 ****************/
export class ItemBadges {
  /** the page */
  private readonly document: Document
  /** an item's facts (`PlanReader.facts()`) */
  private readonly factsOf: (item: Element) => ItemFacts
  /** the repo's percentages (`issueBadges`), asked as they're used */
  private readonly limitsOf: () => BadgeLimits
  /** the items the person acted on in the review inbox */
  private readonly readActedOn: () => ReadonlySet<string>

  /** what the person got to, as read since `refresh()` */
  private gotTo: { logged: ReadonlySet<string>; inbox: ReadonlySet<string> } | undefined

  constructor({ document, factsOf, limitsOf = () => BADGE_LIMITS, readActedOn }: ItemBadgesProps) {
    this.document = document
    this.factsOf = factsOf
    this.limitsOf = limitsOf
    this.readActedOn = readActedOn
  }

  /** The page's badges:  `trial`, `on`, or none. */
  get mode(): BadgeMode | undefined {
    const value = this.document.querySelector("epic-page")?.getAttribute("badges")
    return value === "trial" || value === "on" ? value : undefined
  }

  /** The page may have changed:  read what the person got to again. */
  refresh(): void {
    this.gotTo = undefined
  }

  /** `item`'s badge;  `{}` on a page without them, or for an item with none. */
  badgeOf(item: Element): Badge {
    const { mode } = this
    if (!mode) return {}
    return ItemBadge.of(this.badgeFacts(item), this.limitsOf(), { trial: mode === "trial" })
  }

  /**
   * Why `item` mustn't be closed for the person (`epic badges <epic> close`);  `undefined`:  it may.
   * - their words, what they got to, a question:  never closed unseen, never answered for them
   */
  closeRefusal(item: Element): string | undefined {
    const facts = this.badgeFacts(item)
    if (facts.kind === "question") return "a question is never answered for them"
    if (facts.kind === "limit") return "a limit is a note, not work"
    if (facts.status !== "open") return `already ${facts.status}`
    if (facts.fixed) return "a fix waiting for their check"
    if (facts.picking) return "waiting for their pick"
    if (facts.queued || facts.handed || facts.flagged) return "they asked for it"
    if (facts.followUp && !facts.followUp.done) return `${facts.followUp.id.toUpperCase()} carries it`
    if (facts.fromYou) return "their words:  never closed unseen"
    if (facts.actedOn) return "they got to it:  never closed unseen"
    return undefined
  }

  /** `item`'s facts for the rule. */
  badgeFacts(item: Element): BadgeFacts {
    const facts = this.factsOf(item)
    const { id } = facts
    const data = Markup.read<"epic-item">(item)
    const isQuestion = QUESTION_ID.test(id)
    const isCall = CALM_ID.test(id)
    const isTodo = TODO_ID.test(id) && !facts.limit
    // the costly two, only as the rule asks for them
    const fromYou = () => facts.requested || startsWithTheirWords(item)
    const actedOn = () => this.isGotTo(item)
    const isReminder = isTodo && facts.urgent && !facts.calm && facts.reviewed === undefined
    const followsUp = isTodo && isFollowUp(item)
    return {
      kind: ItemBadge.kindOf(id, facts.limit),
      status: facts.status,
      care: data.care,
      doubt: data.doubt,
      severe: !!data.severe,
      needsYou: !!data.needsYou,
      // a todo flagged red as a reminder (T94) stays red;  NOT one made from an item, red before badges (I230):
      // "The todo itself reads WILL DO (yellow), or YOUR CALL (orange)" (T144)
      flagged: !!data.flagged || (isReminder && !followsUp),
      get fromYou() {
        return fromYou()
      },
      get actedOn() {
        return actedOn()
      },
      reviewed: facts.reviewed !== undefined,
      working: facts.working || facts.underway,
      unmerged: !!facts.unmerged,
      fixed: facts.fixed && facts.status === "open",
      queued: facts.queued !== undefined,
      handed: isCall && facts.urgent,
      picking: facts.awaitsPick,
      settled: !isQuestion && SETTLED_AS.has(facts.reviewAs ?? "") && (!isCall || facts.reviewed !== undefined),
      handled: !!facts.handled || facts.selfFixed,
      failed: item.hasAttribute("failed"),
      followsUp,
      followUp: this.followUpOf(item, facts),
      closedAs: data.closedAs as ClosedAs | undefined,
      dropped: facts.reviewAs === "drop"
    }
  }

  /** Has the person got to `item` (`SelfFix.isGotTo()`), by the page, its Log and the inbox? */
  private isGotTo(item: Element): boolean {
    this.gotTo ??= { logged: SelfFix.loggedGotTo(this.document), inbox: this.readActedOn() }
    return SelfFix.isGotTo(item, this.gotTo.inbox, this.gotTo.logged)
  }

  /**
   * The todo the person turned `item` into, and whether it's done;  none, or one dropped:  `undefined`.
   * - by its Noted card (`Made todo T23 ...`), else, before those cards, the todo whose `From J3` line links it
   */
  private followUpOf(item: Element, facts: ItemFacts): { id: string; done: boolean } | undefined {
    const made = Array.from(item.querySelectorAll(":scope > epic-status"))
      .map((card) => MADE_TODO.exec((card.textContent ?? "").trim())?.[1]?.toLowerCase())
      .findLast((id) => id !== undefined)
    let todo = made ? this.document.getElementById(made) : null
    if (!todo && facts.reviewAs === "todo") {
      const link = Array.from(this.document.querySelectorAll(`epic-item p a[href="#${facts.id}"]`)).find(
        (each) =>
          FROM_LINE.test(each.closest("p")?.textContent ?? "") && TODO_ID.test(each.closest("epic-item")?.id ?? "")
      )
      todo = link?.closest("epic-item") ?? null
    }
    if (todo?.localName !== "epic-item") return undefined
    const status = todo.getAttribute("status") ?? "open"
    return status === "canceled" ? undefined : { id: todo.id, done: status === "done" }
  }
}

/** `ItemBadges`' constructor options. */
export type ItemBadgesProps = {
  /** the page */
  document: Document
  /** an item's facts */
  factsOf: (item: Element) => ItemFacts
  /** the repo's percentages;  default `BADGE_LIMITS` */
  limitsOf?: () => BadgeLimits
  /** the items the person acted on in the review inbox */
  readActedOn: () => ReadonlySet<string>
}

/** Was todo `item` made by turning another into one (its `From J3` line)? */
function isFollowUp(item: Element): boolean {
  return Array.from(item.querySelectorAll("p")).some(
    (line) => FROM_LINE.test(line.textContent ?? "") && !!line.querySelector('a[href^="#"]')
  )
}

/** Does `item` start with the person's words, quoted (`PlanItem.isOwenQuote()`)? */
function startsWithTheirWords(item: Element): boolean {
  const first = item.querySelector("p, blockquote")
  return !!first && !first.closest("epic-status, epic-reply, epic-original") && PlanItem.isOwenQuote(first)
}
