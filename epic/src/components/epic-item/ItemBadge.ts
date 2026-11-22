/**
 * The item badges' ONE rule (epic `epic-engine` P81, T144):  its classes, its tables, their types.
 * - NEVER reads a page, imports no Solid:  the tool (`ItemBadges`) and the elements hand it what they read
 */

import type { BadgeWord } from "./EpicItem.en"
import type { ItemState, LiveReview } from "./EpicItem.types"

/****************
 * ### `ItemBadge`
 * What happens next to an item, said first on its line, and the colour that goes with it:
 * `WILL FIX`, `YOUR CALL`, `SOMEDAY` ... (epic `epic-engine` P81;  the tables Owen agreed:  T144).
 * - Owen, 2026-11-22:  "item title prefixes are great, it will help me sort quickly"
 * - in:  the item's facts, with what the judge stored (care, doubt, severe, needs you), and the repo's percentages
 *   (`issueBadges`)
 * - out:  the badge and its state (the colour)
 * - the rules are DATA, a list per kind (`RULES`), read top to bottom:  the first that matches wins
 * - the epic tool works it out and writes both (`badge`, `state`), as it writes every state:
 *   so the page, the counts, the lists and the tool's printouts agree, and the page needn't know the percentages
 * - the page only follows what happens live (`drawn()`):  an agent starting, his urgency, his ✓, a comment answered
 * - GREY MEANS CLOSED, a limit apart (Owen:  "grey open is not really a thing to me"):
 *   a rule that would grey an open item says `closes`, and the item keeps its look until something closes it
 ****************/
export class ItemBadge {
  /**
   * `facts`' badge by `limits`;  `{}`:  none, so it's drawn as it was before badges.
   * - `trial`:  the badges and colours of what's open;  what's closed keeps its colour
   */
  static of(facts: BadgeFacts, limits: BadgeLimits = BADGE_LIMITS, { trial = false } = {}): Badge {
    const test: RuleTest = {
      facts,
      isJudged: facts.care !== undefined && facts.doubt !== undefined,
      isDoubtful: (facts.doubt ?? 0) >= limits.recheckAt,
      isMinor: (facts.care ?? 100) < limits.closeBelow,
      isWorthIt: (facts.care ?? 0) > limits.fixAbove
    }
    const rule = RULES[facts.kind].find(({ when }) => when(test))
    if (!rule) return {}
    const { badge, state, closes, finished } = rule
    if (closes && badge) {
      // never closed unseen:  their words wait light orange, what they got to first orange
      if (facts.actedOn) return { badge, state: "replied" }
      if (facts.fromYou) return { badge, state: "requested" }
      return { closes: { badge, status: closes } }
    }
    const item = badge === "see" ? facts.followUp?.id : undefined
    return { badge, item, state: trial && finished ? undefined : state }
  }

  /** The kind with rules that item `id` is:  by its letter, a `limit` apart;  an old id's, a question. */
  static kindOf(id: string | null | undefined, limit?: boolean): BadgeKind {
    if (limit) return "limit"
    return KINDS_BY_LETTER[id?.[0]?.toLowerCase() ?? ""] ?? "question"
  }

  /**
   * `written`'s badge as drawn now:  what the tool wrote, following what's live (`live`), in its drawn `state`.
   * - none written, none drawn:  a page without badges is drawn as before
   */
  static drawn(written: WrittenBadge, state: ItemState, live: LiveReview): BadgeWord | undefined {
    const { badge, kind } = written
    if (!badge) return undefined
    if (live.closing) return live.closingAs === "drop" ? DECLINED[kind] : FINISHED[kind]
    if (live.workedOn && !KEPT_AT_WORK.has(badge)) return RECHECKS.has(badge) ? "rechecking" : "underway"
    if (live.commentsReplied && state === "replied") return "yourTurn"
    if (live.urgency) {
      if (!live.urgency.calm) return "urgent"
      if (badge === "urgent") return kind === "issue" ? "willFix" : undefined
    }
    return badge
  }

  /**
   * A phase's badge, from its state as drawn (`PhaseState`) and its status:  no percentages (T144).
   * - none for a draft, whose title says DRAFT already, or a dropped one, struck through
   */
  static ofPhase(state: string, status: string | null | undefined): BadgeWord | undefined {
    if (status === "dropped") return undefined
    if (state === "attention" || state === "waiting") return "yourCall"
    if (state === "paused") return "held"
    if (state === "progress" || status === "active") return "underway"
    if (status === "done") return "done"
    return "queued"
  }
}

////////////////
// ## Types
////////////////

/** The kinds with rules of their own. */
export type BadgeKind = "issue" | "judgement" | "todo" | "test" | "question" | "limit"

/** The percentages a repo tunes:  `issueBadges` in its `.epic/config.json5`. */
export type BadgeLimits = {
  /** doubt:  this or more is rechecked first */
  recheckAt: number
  /** care:  under this is closed */
  closeBelow: number
  /** care:  over this is fixed */
  fixAbove: number
}

/** What an item's badge is worked out from.  Only `kind` and `status` are needed;  the rest are no when missing. */
export type BadgeFacts = {
  /** its kind */
  kind: BadgeKind
  /** `open`, `done`, `canceled`, `decided` */
  status: string
  /** care, 0-100:  how likely the person is to want it */
  care?: number
  /** doubt, 0-100:  how likely it's transient, done already or overtaken */
  doubt?: number
  /** an issue:  it blocks work, loses work or gives wrong answers;  a call:  it changes or narrows what they said */
  severe?: boolean
  /** only they can:  decide the issue, OK the todo, run the test */
  needsYou?: boolean
  /** they called it urgent from its id chip */
  flagged?: boolean
  /** from their words or their request */
  fromYou?: boolean
  /** they marked it, commented or reviewed it, before it was handled */
  actedOn?: boolean
  /** they've looked since it was written */
  reviewed?: boolean
  /** Claude is at work on it */
  working?: boolean
  /** its work is on the branch, not on main */
  unmerged?: boolean
  /** fixed, waiting for their check */
  fixed?: boolean
  /** waiting for an agent */
  queued?: boolean
  /** their Do this, not started */
  handed?: boolean
  /** Claude asked them to pick */
  picking?: boolean
  /** approved as it stands, still open */
  settled?: boolean
  /** its answer is in a phase's text now */
  handled?: boolean
  /** a manual test that failed */
  failed?: boolean
  /** a todo made by turning an item into one */
  followsUp?: boolean
  /** the todo they turned it into:  its id, and whether that's done */
  followUp?: { id: string; done: boolean }
  /** why Claude closed it */
  closedAs?: ClosedAs
  /** their x closed it */
  dropped?: boolean
}

/** Why Claude closed an item unfixed. */
export type ClosedAs = (typeof CLOSED_AS)[number]

/** `ItemBadge.of()`'s answer. */
export type Badge = {
  /** the word its line starts with */
  badge?: BadgeWord
  /** the id the word names (`SEE T38`) */
  item?: string
  /** its colour;  none:  as without badges */
  state?: ItemState
  /** the rule would close it (grey):  with that status and word.  It keeps its look till it's closed */
  closes?: { badge: BadgeWord; status: "done" | "canceled" }
}

/** A badge as the tool wrote it on an item. */
export type WrittenBadge = {
  /** its word */
  badge?: BadgeWord
  /** the item's kind */
  kind: BadgeKind
}

/** One line of a kind's table. */
type BadgeRule = {
  /** the word */
  badge?: BadgeWord
  /** the colour */
  state?: ItemState
  /** grey, so it has to close first:  as what */
  closes?: "done" | "canceled"
  /** it's closed already:  a trial leaves its colour */
  finished?: boolean
  /** does it match */
  when(test: RuleTest): boolean | undefined
}

/** What a rule's `when` reads. */
type RuleTest = {
  facts: BadgeFacts
  /** care and doubt are stored */
  isJudged: boolean
  /** doubt at or over `recheckAt` */
  isDoubtful: boolean
  /** care under `closeBelow` */
  isMinor: boolean
  /** care over `fixAbove` */
  isWorthIt: boolean
}

////////////////
// ## The tables
////////////////

/** The percentages out of the box. */
export const BADGE_LIMITS: BadgeLimits = { recheckAt: 50, closeBelow: 25, fixAbove: 60 }

/** What Claude may close an item as, with no fix. */
export const CLOSED_AS = ["vanished", "moot", "duplicate", "declined"] as const

/** Each kind by its id's letter. */
const KINDS_BY_LETTER: Readonly<Record<string, BadgeKind>> = {
  i: "issue",
  j: "judgement",
  t: "todo",
  m: "test",
  q: "question"
}

/** A kind's word once it's finished. */
const FINISHED: Readonly<Record<BadgeKind, BadgeWord>> = {
  issue: "fixed",
  judgement: "decided",
  todo: "done",
  test: "passed",
  question: "answered",
  limit: "done"
}

/** A kind's word once it's closed as not worth doing. */
const DECLINED: Readonly<Record<BadgeKind, BadgeWord>> = {
  issue: "wontFix",
  judgement: "moot",
  todo: "wontDo",
  test: "moot",
  question: "moot",
  limit: "wontDo"
}

/** A badge that becomes RECHECKING, not UNDERWAY, as an agent takes it. */
const RECHECKS: ReadonlySet<BadgeWord> = new Set(["willRecheck", "willClose", "rechecking"])

/** A badge an agent at work doesn't change:  SEE is ahead of every rule but a comment waiting. */
const KEPT_AT_WORK: ReadonlySet<BadgeWord> = new Set(["see"])

/**
 * The rows every kind starts with:  where it stands, ahead of care and doubt.
 * - `rechecks`:  at work on it, is this a recheck, by the kind's own rules
 */
function stagesOf(kind: BadgeKind, rechecks: (test: RuleTest) => boolean = (test) => test.isDoubtful): BadgeRule[] {
  const isOpen = ({ facts }: RuleTest) => facts.status === "open"
  const isDone = ({ facts }: RuleTest) => facts.status === "done" || facts.status === "decided"
  const isCanceled = ({ facts }: RuleTest) => facts.status === "canceled"
  // a decision stays green a day, then greys with age (`ItemAge`)
  const isDecision = kind === "judgement" || kind === "question"
  return [
    // "Agreed, add":  ahead of every rule but a comment waiting on them
    {
      badge: "see",
      state: "handed",
      when: (test) => !isCanceled(test) && test.facts.followUp && !test.facts.followUp.done
    },
    {
      badge: "rechecking",
      state: "progress",
      when: (test) => {
        const { working, handed, flagged, queued, needsYou } = test.facts
        const asked = handed || flagged || queued || (needsYou && (kind === "issue" || kind === "todo"))
        return isOpen(test) && working && test.isJudged && !asked && rechecks(test)
      }
    },
    { badge: "underway", state: "progress", when: ({ facts }) => facts.working },
    {
      badge: "cantReproduce",
      state: "old",
      finished: true,
      when: (test) => isCanceled(test) && test.facts.closedAs === "vanished"
    },
    {
      badge: "duplicate",
      state: "old",
      finished: true,
      when: (test) => isCanceled(test) && test.facts.closedAs === "duplicate"
    },
    {
      badge: DECLINED[kind],
      state: "old",
      finished: true,
      when: (test) => isCanceled(test) && (test.facts.closedAs === "declined" || test.facts.dropped)
    },
    { badge: "moot", state: "old", finished: true, when: isCanceled },
    // not merged isn't closed:  blue, in a trial too
    {
      badge: "notInMain",
      state: "progress",
      when: (test) => test.facts.unmerged && (isDone(test) || test.facts.fixed || kind === "judgement")
    },
    {
      badge: FINISHED[kind],
      state: "requested",
      finished: true,
      when: (test) =>
        isDone(test) &&
        (kind === "issue" || kind === "todo") &&
        test.facts.fromYou &&
        !test.facts.reviewed &&
        !test.facts.handled
    },
    {
      badge: FINISHED[kind],
      state: "recent",
      finished: true,
      when: (test) =>
        isDone(test) && isDecision && !test.facts.handled && !(kind === "judgement" && test.isJudged && test.isMinor)
    },
    { badge: FINISHED[kind], state: "handled", finished: true, when: isDone },
    // a fix waiting for their check is never grey (I411)
    { badge: "fixed", state: "requested", when: ({ facts }) => facts.fixed && facts.fromYou },
    { badge: "fixed", state: "replied", when: ({ facts }) => facts.fixed },
    { badge: FINISHED[kind], state: "handled", when: ({ facts }) => facts.handled },
    { badge: FINISHED[kind], state: "recent", when: ({ facts }) => facts.followUp?.done },
    { badge: "queued", state: "scheduled", when: ({ facts }) => facts.queued },
    { badge: "yourCall", state: "replied", when: ({ facts }) => facts.picking },
    { badge: kind === "issue" ? "willFix" : "willDo", state: "handed", when: ({ facts }) => facts.handed },
    { badge: "urgent", state: "attention", when: ({ facts }) => facts.flagged },
    // approved as it stands:  green, as before badges;  only a decision has a word for it
    { badge: isDecision ? FINISHED[kind] : undefined, state: "recent", when: ({ facts }) => facts.settled }
  ]
}

/** Each kind's table (T144), its stages first:  the first that matches wins. */
const RULES: Readonly<Record<BadgeKind, readonly BadgeRule[]>> = {
  issue: [
    ...stagesOf("issue", (test) => test.isDoubtful || !test.isWorthIt),
    { badge: "yourCall", state: "replied", when: ({ isJudged, facts }) => isJudged && facts.needsYou },
    { badge: "willRecheck", state: "recheck", when: ({ isJudged, isDoubtful }) => isJudged && isDoubtful },
    { badge: "willClose", state: "recheck", when: ({ isJudged, isMinor }) => isJudged && isMinor },
    { badge: "willRecheck", state: "recheck", when: ({ isJudged, isWorthIt }) => isJudged && !isWorthIt },
    { badge: "urgent", state: "attention", when: ({ isJudged, facts }) => isJudged && facts.severe },
    { badge: "willFix", state: "open", when: ({ isJudged }) => isJudged }
  ],
  judgement: [
    ...stagesOf("judgement"),
    { badge: "willRecheck", state: "recheck", when: ({ isJudged, isDoubtful }) => isJudged && isDoubtful },
    {
      badge: "againstYourAsk",
      state: "attention",
      when: ({ isJudged, facts }) => isJudged && facts.severe && !facts.reviewed
    },
    { badge: "yourCall", state: "replied", when: ({ isJudged, isWorthIt }) => isJudged && isWorthIt },
    // green for a day, or grey at once:  closed either way
    { badge: "decided", closes: "done", when: ({ isJudged }) => isJudged }
  ],
  todo: [
    ...stagesOf("todo", (test) => test.isDoubtful && !test.facts.followsUp),
    { badge: "yourCall", state: "replied", when: ({ isJudged, facts }) => isJudged && facts.needsYou },
    // the todo that carries an item they turned into one
    { badge: "willDo", state: "open", when: ({ facts }) => facts.followsUp },
    { badge: "willRecheck", state: "recheck", when: ({ isJudged, isDoubtful }) => isJudged && isDoubtful },
    {
      badge: "willDo",
      state: "open",
      when: ({ isJudged, isWorthIt, facts }) => isJudged && (facts.fromYou || isWorthIt)
    },
    { badge: "someday", state: "someday", when: ({ isJudged, isMinor }) => isJudged && !isMinor },
    { badge: "wontDo", closes: "canceled", when: ({ isJudged }) => isJudged }
  ],
  test: [
    { badge: "failed", state: "attention", when: ({ facts }) => facts.failed && facts.status === "open" },
    ...stagesOf("test"),
    { badge: "willRecheck", state: "recheck", when: ({ isJudged, isDoubtful }) => isJudged && isDoubtful },
    {
      badge: "youTest",
      state: "open",
      when: ({ isJudged, isWorthIt, facts }) => isJudged && facts.needsYou && isWorthIt
    },
    { badge: "optional", state: "someday", when: ({ isJudged }) => isJudged }
  ],
  question: [
    ...stagesOf("question"),
    { badge: "willRecheck", state: "recheck", when: ({ isJudged, isDoubtful }) => isJudged && isDoubtful },
    { badge: "yourCall", state: "attention", when: ({ isJudged }) => isJudged }
  ],
  limit: [...stagesOf("limit"), { badge: "limit", state: "quiet", when: () => true }]
}
