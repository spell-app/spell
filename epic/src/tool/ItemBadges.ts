import { Markup } from "spell/epic/markup"
import { PhaseIds } from "spell/epic/phases"
import type { BadgeWord } from "spell/epic/components/epic-item/EpicItem.en"
import {
  BADGE_LIMITS,
  ItemBadge,
  type Badge,
  type BadgeFacts,
  type BadgeLimits,
  type ClosedAs
} from "spell/epic/components/epic-item/ItemBadge"
import { NEEDS_PERSON } from "spell/epic/components/epic-item/EpicItem.types"
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
import { TheirWords } from "./TheirWords"

/****************
 * ### `ItemBadges`
 * One page's badges (epic `epic-engine` P81):  reads each item's facts off the page, and asks the ONE rule,
 * `ItemBadge`.
 * - only on a page with them (`<epic-page badges="trial | on">`):  none, and the page is drawn as before
 * - `PlanReader.itemState()` takes the badge's colour, `PlanDoc.updateStates()` writes both
 * - what's dear to find is kept until `refresh()`:  the Log's record of what the person got to and looked at, the
 *   inbox's, and what the open questions ask about
 * - its `holdOf()` is the badges' share of the ONE rule for closing, `PlanDoc.closeRefusal()` (I435)
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

  /** whose page it is:  their name in a quote */
  private readonly personOf: () => string
  /** now, as the page's edits take it */
  private readonly nowOf: () => Date

  /** what the person got to, as read since `refresh()` */
  private gotTo: { logged: ReadonlySet<string>; inbox: ReadonlySet<string> } | undefined
  /** when they last looked at each item, as read since `refresh()` */
  private looks: ReadonlyMap<string, number> | undefined
  /** each call's number and its earliest card's time, as read since `refresh()` (`isNewCall()`) */
  private cardTimes: ReadonlyMap<number, number> | undefined
  /** the open question asking about each item, by its id, as read since `refresh()` */
  private askedAbout: ReadonlyMap<string, string> | undefined
  /** `personOf()`'s answer:  it may ask git */
  private person: string | undefined

  constructor({ document, factsOf, limitsOf = () => BADGE_LIMITS, readActedOn, personOf, nowOf }: ItemBadgesProps) {
    this.document = document
    this.factsOf = factsOf
    this.limitsOf = limitsOf
    this.readActedOn = readActedOn
    this.personOf = personOf
    this.nowOf = nowOf
  }

  /** The page's badges:  `trial`, `on`, or none. */
  get mode(): BadgeMode | undefined {
    const value = this.document.querySelector("epic-page")?.getAttribute("badges")
    return value === "trial" || value === "on" ? value : undefined
  }

  /** The page may have changed:  read what the person got to again. */
  refresh(): void {
    this.gotTo = undefined
    this.looks = undefined
    this.askedAbout = undefined
    this.cardTimes = undefined
  }

  /** `item`'s badge;  `{}` on a page without them, or for an item with none. */
  badgeOf(item: Element): Badge {
    const { mode } = this
    if (!mode) return {}
    return ItemBadge.of(this.badgeFacts(item), this.limitsOf(), { trial: mode === "trial" })
  }

  /**
   * What holds open `item` open, for the person, on a page with badges;  `undefined`:  nothing.
   * - the badges' share of `PlanDoc.closeRefusal()`, the ONE rule every close by Claude asks (I435)
   * - waiting on them by its badge, their words, what they got to, a Revisit answered, what an open question asks
   *   about:  never closed unseen, never answered for them
   * - a call whose work may not be on main yet
   */
  holdOf(item: Element): string | undefined {
    if (!this.mode) return undefined
    const facts = this.badgeFacts(item)
    if (facts.kind === "limit") return "a limit is a note, not work"
    if (facts.flagged) return "they called it urgent"
    if (facts.followUp && !facts.followUp.done) return `${facts.followUp.id.toUpperCase()} carries it`
    const { badge } = ItemBadge.of(facts, this.limitsOf())
    const needsTheirOk = facts.needsYou && (facts.kind === "issue" || facts.kind === "todo")
    if (facts.asksYou || needsTheirOk || badge === "yourCall") return "YOUR CALL:  only they can decide it"
    if (facts.kind === "judgement" && facts.severe && !facts.reviewed)
      return "AGAINST YOUR ASK:  they haven't looked at it"
    if (badge === "youTest") return "YOU TEST:  only they can run it"
    if (badge === "failed") return "FAILED:  they saw it fail"
    if (ItemBadges.isRevised(item, facts)) return "a Revisit answered:  they haven't looked since"
    const question = this.questionAbout(item.id)
    if (question) return `${question.toUpperCase()} is open, and asks about it`
    if (facts.fromYou) return "their words:  never closed unseen"
    if (facts.actedOn) return "they got to it:  never closed unseen"
    if (facts.unmerged) return "its work isn't on main yet"
    if (facts.kind === "judgement" && this.isNewCall(item)) return "a new call:  its work may not be on main yet"
    return undefined
  }

  /**
   * Does open or finished `item` wait on the person by its badge (so `epic hush` never greys it, I435)?
   * - as with badges on, in a trial too:  finished work of theirs they haven't seen waits
   */
  waitsOnThem(item: Element): boolean {
    if (!this.mode) return false
    const { badge, state } = ItemBadge.of(this.badgeFacts(item), this.limitsOf())
    return (!!badge && WAITING_ON_THEM.has(badge)) || (!!state && NEEDS_PERSON.has(state))
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
    const fromYou = () => TheirWords.isTheirs(item, (this.person ??= this.personOf()))
    const actedOn = () => this.isGotTo(item) || ItemBadges.isRevised(item, badgeFacts)
    const seen = () => this.hasSeen(item, facts)
    const isReminder = isTodo && facts.urgent && !facts.calm && facts.reviewed === undefined
    const followsUp = isTodo && isFollowUp(item)
    const badgeFacts: BadgeFacts = {
      kind: ItemBadge.kindOf(id, facts.limit),
      status: facts.status,
      care: data.care,
      doubt: data.doubt,
      severe: !!data.severe,
      needsYou: !!data.needsYou,
      asksYou: !!data.asksYou,
      // a todo flagged red as a reminder (T94) stays red;  NOT one made from an item, red before badges (I230):
      // "The todo itself reads WILL DO (yellow), or YOUR CALL (orange)" (T144)
      flagged: !!data.flagged || (isReminder && !followsUp),
      get fromYou() {
        return fromYou()
      },
      get actedOn() {
        return actedOn()
      },
      get seen() {
        return seen()
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
      handledDone: !!facts.handled && this.document.getElementById(facts.handled)?.getAttribute("status") === "done",
      failed: item.hasAttribute("failed"),
      followsUp,
      followUp: this.followUpOf(item, facts),
      closedAs: data.closedAs as ClosedAs | undefined,
      dropped: facts.reviewAs === "drop"
    }
    return badgeFacts
  }

  /**
   * Has the person seen `item` as it stands (T144's footnote, I435)?  A finished one's result, then.
   * - reviewed on or after the day it last changed
   * - and their last look in the Log (`SelfFix.loggedLooks()`) is no older than that change
   *   - none there:  yes, unless all they did was ask for it (queued, Do this, Start now, urgent ...):
   *     `reviewed` then says go, not that they saw the result
   */
  private hasSeen(item: Element, { id, reviewed, changed, queued, work, reviewAs }: ItemFacts): boolean {
    if (reviewed === undefined) return false
    if (changed && reviewed.slice(0, 10) < changed.slice(0, 10)) return false
    this.looks ??= SelfFix.loggedLooks(this.document)
    const look = this.looks.get(id)
    // the Log's times are to the minute
    if (look !== undefined) return !changed || !(Date.parse(changed) >= look + MINUTE_MS)
    if (queued !== undefined || work !== undefined || ASKED_AS.has(reviewAs ?? "")) return false
    this.gotTo ??= this.readGotTo()
    return !this.gotTo.logged.has(id)
  }

  /** The open question asking about `id`:  one linking or naming it. */
  private questionAbout(id: string): string | undefined {
    this.askedAbout ??= this.readAskedAbout()
    return this.askedAbout.get(id.toLowerCase())
  }

  /** What each open question asks about:  the items it links, marks or names, each with that question's id. */
  private readAskedAbout(): Map<string, string> {
    const asked = new Map<string, string>()
    for (const question of Array.from(this.document.querySelectorAll('epic-item[status="open"][id^="q"]'))) {
      const copy = question.cloneNode(true) as Element
      for (const each of Array.from(copy.querySelectorAll("epic-original, epic-commit"))) each.remove()
      const named = [
        ...Array.from(copy.querySelectorAll('a[href^="#"]'), (link) => link.getAttribute("href")!.slice(1)),
        ...Array.from(copy.querySelectorAll("epic-mark[item]"), (mark) => mark.getAttribute("item")!),
        ...(`${question.getAttribute("title") ?? ""} ${copy.textContent}`.match(NAMED_ITEM) ?? [])
      ]
      for (const id of named) asked.set(id.toLowerCase(), question.id)
    }
    return asked
  }

  /**
   * Is call `item` too new to know its work is on main:  made in the last day, with no commit of its own?
   * - a commit not on main marks it `unmerged`;  one just made has none to mark
   * - made, not changed (I439's rule):  a retitle or a review stamps `changed` on an old call
   *   - the earliest time on it (`PlanItem.madeAt()`)
   *   - no later than the phase it was made in was done (`done-at`)
   *   - no later than any later call's card (`laterCardAt()`):  calls are numbered as they're made
   *   - a call with no card and no phase has only its stamps, which a retitle or a judging moves on
   */
  private isNewCall(item: Element): boolean {
    if (item.querySelector(":scope > epic-commit")) return false
    const made = Math.min(
      PlanItem.madeAt(item),
      this.phaseDoneAt(item.getAttribute("phase")),
      this.laterCardAt(PlanItem.idNumber(item.id))
    )
    return Number.isFinite(made) && this.nowOf().getTime() - made < DAY_MS
  }

  /** The earliest card or reply on a call numbered `number` or later, in ms;  `Infinity` with none. */
  private laterCardAt(number: number): number {
    this.cardTimes ??= this.readCardTimes()
    let earliest = Infinity
    for (const [at, time] of this.cardTimes) if (at >= number && time < earliest) earliest = time
    return earliest
  }

  /**
   * Each call's number, with the earliest time it's known to exist:  its cards and replies, and the Log's lines and
   * commits naming it (`J12 renamed`, `J286-J293`);  never its stamps.
   */
  private readCardTimes(): Map<number, number> {
    const times = new Map<number, number>()
    const saw = (number: number, at: string | null) => {
      const time = Date.parse((at ?? "").replace(" ", "T"))
      if (Number.isFinite(time) && time < (times.get(number) ?? Infinity)) times.set(number, time)
    }
    for (const call of Array.from(this.document.querySelectorAll("epic-item[id^='j']")))
      for (const dated of Array.from(call.querySelectorAll("[at]")))
        saw(PlanItem.idNumber(call.id), dated.getAttribute("at"))
    // the Log's lines and commits, outside any item:  `J12 renamed`, `J286-J293`
    for (const line of Array.from(this.document.querySelectorAll("epic-event[at], epic-commit[at]"))) {
      if (line.closest("epic-item")) continue
      for (const [, first, last = first] of (line.textContent ?? "").matchAll(CALLS_NAMED))
        for (let number = Number(first); number <= Number(last); number++) saw(number, line.getAttribute("at"))
    }
    return times
  }

  /** When the phase numbered `number` (`3`, `11.1`) was done, in ms;  `Infinity` while it isn't, or with none. */
  private phaseDoneAt(number: string | null): number {
    if (!number) return Infinity
    const phases = Array.from(this.document.querySelectorAll('epic-page > epic-section[kind="phases"] > epic-phase'))
    const phase = phases.find((each) => PhaseIds.numberOf(each) === number)
    if (phase?.getAttribute("status") !== "done") return Infinity
    const doneAt = Date.parse(phase.getAttribute("done-at") ?? "")
    return Number.isFinite(doneAt) ? doneAt : Infinity
  }

  /** Has the person got to `item` (`SelfFix.isGotTo()`), by the page, its Log and the inbox? */
  private isGotTo(item: Element): boolean {
    this.gotTo ??= this.readGotTo()
    return SelfFix.isGotTo(item, this.gotTo.inbox, this.gotTo.logged)
  }

  /** What the Log and the inbox say they got to. */
  private readGotTo() {
    return { logged: SelfFix.loggedGotTo(this.document), inbox: this.readActedOn() }
  }

  /**
   * Is it an open call, issue or todo with a Revisit answered:  the mark taken, or its words rewritten since
   * (`<epic-original>`:  J28, J192 of epic `epic-engine`)?
   */
  private static isRevised(item: Element, { kind, status }: BadgeFacts): boolean {
    if (status !== "open" || (kind !== "judgement" && kind !== "issue" && kind !== "todo")) return false
    return item.getAttribute("review-as") === "revisit" || !!item.querySelector(":scope > epic-original")
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
  /** whose page it is */
  personOf: () => string
  /** now */
  nowOf: () => Date
}

/** A call, or a run of them, named in a Log line:  `J12`, `J286-J293`. */
const CALLS_NAMED = /\bJ(\d+)(?:-J(\d+))?\b/g

/** The badges that wait on the person, whatever their colour. */
const WAITING_ON_THEM: ReadonlySet<BadgeWord> = new Set([
  "yourCall",
  "againstYourAsk",
  "urgent",
  "youTest",
  "failed",
  "yourTurn"
])

/** The review marks that ask for work:  they say go, not that the result was seen. */
const ASKED_AS: ReadonlySet<string> = new Set(["now", "next", "todo", "revisit"])

/** An item's id as text names it:  `J66`. */
const NAMED_ITEM = /\b[JIT]\d+\b/g

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

/** Was todo `item` made by turning another into one (its `From J3` line)? */
function isFollowUp(item: Element): boolean {
  return Array.from(item.querySelectorAll("p")).some(
    (line) => FROM_LINE.test(line.textContent ?? "") && !!line.querySelector('a[href^="#"]')
  )
}
