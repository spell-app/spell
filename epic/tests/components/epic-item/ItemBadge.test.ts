/**
 * Tests of `ItemBadge` (epic `epic-engine` P81):  a test per row of the tables Owen agreed (T144), then what's drawn
 * live.
 */
import { describe, expect, test } from "vite-plus/test"

import { NO_LIVE_REVIEW } from "spell/epic/components/epic-item/EpicItem.types"
import { ItemBadge, type BadgeFacts, type BadgeKind } from "spell/epic/components/epic-item/ItemBadge"

/** `kind`'s badge with `facts`:  open, care 90 and doubt 5 unless they say. */
const badge = (kind: BadgeKind, facts: Partial<BadgeFacts> = {}, trial = false) =>
  ItemBadge.of({ kind, status: "open", care: 90, doubt: 5, ...facts }, undefined, { trial })

/** One row:  the kind, what's given, the badge, the colour's state. */
type Row = [BadgeKind, Partial<BadgeFacts>, string, string]

const ISSUES: Row[] = [
  ["issue", { working: true }, "underway", "progress"],
  ["issue", { working: true, doubt: 80 }, "rechecking", "progress"],
  ["issue", { working: true, care: 40 }, "rechecking", "progress"],
  ["issue", { status: "done", unmerged: true }, "notInMain", "progress"],
  ["issue", { status: "done" }, "fixed", "handled"],
  ["issue", { status: "done", fromYou: true }, "fixed", "requested"],
  ["issue", { status: "canceled", closedAs: "vanished" }, "cantReproduce", "old"],
  ["issue", { status: "canceled", closedAs: "moot" }, "moot", "old"],
  ["issue", { status: "canceled", closedAs: "duplicate" }, "duplicate", "old"],
  ["issue", { status: "canceled", closedAs: "declined" }, "wontFix", "old"],
  ["issue", { status: "canceled", dropped: true }, "wontFix", "old"],
  // T144's footnote, for every way of finishing (I435)
  ["issue", { status: "canceled", closedAs: "vanished", fromYou: true }, "cantReproduce", "requested"],
  ["issue", { status: "canceled", closedAs: "duplicate", actedOn: true }, "duplicate", "replied"],
  ["issue", { status: "done", fromYou: true, actedOn: true }, "fixed", "replied"],
  ["issue", { status: "done", fromYou: true, actedOn: true, seen: true }, "fixed", "handled"],
  ["issue", { fixed: true, fromYou: true, actedOn: true }, "fixed", "replied"],
  ["issue", { fixed: true, actedOn: true }, "fixed", "replied"],
  ["issue", { fixed: true, fromYou: true }, "fixed", "requested"],
  ["issue", { queued: true }, "queued", "scheduled"],
  ["issue", { handed: true }, "willFix", "handed"],
  ["issue", { needsYou: true, doubt: 80 }, "yourCall", "replied"],
  ["issue", { doubt: 50 }, "willRecheck", "recheck"],
  ["issue", { care: 24 }, "willClose", "recheck"],
  ["issue", { care: 25 }, "willRecheck", "recheck"],
  ["issue", { care: 60 }, "willRecheck", "recheck"],
  ["issue", { care: 61, severe: true }, "urgent", "attention"],
  ["issue", { care: 61 }, "willFix", "open"],
  ["issue", { care: 5, flagged: true }, "urgent", "attention"]
]

const JUDGEMENTS: Row[] = [
  ["judgement", { unmerged: true, doubt: 80 }, "notInMain", "progress"],
  ["judgement", { doubt: 50, severe: true }, "willRecheck", "recheck"],
  ["judgement", { care: 5, severe: true }, "againstYourAsk", "attention"],
  ["judgement", { care: 70, severe: true, reviewed: true }, "yourCall", "replied"],
  ["judgement", { care: 61 }, "yourCall", "replied"],
  ["judgement", { care: 40, fromYou: true }, "decided", "requested"],
  ["judgement", { care: 10, actedOn: true }, "decided", "replied"],
  ["judgement", { status: "done", care: 40 }, "decided", "recent"],
  ["judgement", { status: "done", care: 10 }, "decided", "handled"],
  ["judgement", { asksYou: true, care: 5, doubt: 90 }, "yourCall", "replied"]
]

const TODOS: Row[] = [
  ["todo", { working: true }, "underway", "progress"],
  ["todo", { status: "done", unmerged: true }, "notInMain", "progress"],
  ["todo", { status: "done" }, "done", "handled"],
  ["todo", { status: "done", fromYou: true }, "done", "requested"],
  ["todo", { status: "canceled", closedAs: "declined" }, "wontDo", "old"],
  ["todo", { queued: true }, "queued", "scheduled"],
  ["todo", { needsYou: true }, "yourCall", "replied"],
  ["todo", { doubt: 50 }, "willRecheck", "recheck"],
  ["todo", { care: 10, fromYou: true }, "willDo", "open"],
  ["todo", { care: 61 }, "willDo", "open"],
  ["todo", { care: 25 }, "someday", "someday"],
  ["todo", { care: 60 }, "someday", "someday"],
  ["todo", { followsUp: true, care: 5, doubt: 90 }, "willDo", "open"],
  ["todo", { followsUp: true, needsYou: true }, "yourCall", "replied"]
]

const TESTS: Row[] = [
  ["test", { failed: true, doubt: 90 }, "failed", "attention"],
  ["test", { status: "done" }, "passed", "handled"],
  ["test", { doubt: 50, needsYou: true }, "willRecheck", "recheck"],
  ["test", { care: 61, needsYou: true }, "youTest", "open"],
  ["test", { care: 60, needsYou: true }, "optional", "someday"],
  ["test", { care: 90 }, "optional", "someday"]
]

const OTHERS: Row[] = [
  ["question", { doubt: 50 }, "willRecheck", "recheck"],
  ["question", { care: 1 }, "yourCall", "attention"],
  ["question", { status: "decided" }, "answered", "recent"],
  ["question", { status: "decided", handled: true }, "answered", "handled"],
  ["question", { picking: true, doubt: 80 }, "yourCall", "replied"],
  ["limit", { care: undefined, doubt: undefined }, "limit", "quiet"]
]

// "Agreed, add":  ahead of every rule but a comment waiting on them
const TURNED_INTO_A_TODO: Row[] = [
  ["question", { followUp: { id: "t38", done: false } }, "see", "handed"],
  ["issue", { followUp: { id: "t38", done: false }, working: true }, "see", "handed"],
  ["question", { followUp: { id: "t38", done: true } }, "answered", "recent"],
  ["judgement", { followUp: { id: "t38", done: true } }, "decided", "recent"],
  ["issue", { followUp: { id: "t38", done: true } }, "fixed", "recent"]
]

describe("ItemBadge.of():  T144's tables", () => {
  test.each([...ISSUES, ...JUDGEMENTS, ...TODOS, ...TESTS, ...OTHERS, ...TURNED_INTO_A_TODO])(
    "%s %o:  %s, %s",
    (kind, facts, word, state) => {
      expect(badge(kind, facts)).toMatchObject({ badge: word, state })
    }
  )

  test("SEE names the todo", () => {
    expect(badge("question", { followUp: { id: "t38", done: false } }).item).toBe("t38")
  })

  test("what would be grey is only said (`closes`):  no badge and no colour while it's open", () => {
    expect(badge("judgement", { care: 40 })).toEqual({ closes: { badge: "decided", status: "done" } })
    expect(badge("judgement", { care: 10 })).toEqual({ closes: { badge: "decided", status: "done" } })
    expect(badge("todo", { care: 24 })).toEqual({ closes: { badge: "wontDo", status: "canceled" } })
  })

  test("grey always means closed:  no open rule is grey, a limit apart", () => {
    for (const kind of ["issue", "judgement", "todo", "test", "question"] as const)
      for (const care of [0, 25, 60, 100])
        for (const doubt of [0, 50])
          for (const needsYou of [false, true])
            expect(["handled", "quiet", "old"]).not.toContain(badge(kind, { care, doubt, needsYou }).state)
  })

  test("a phase handled it, still open:  yellow, a question red, never grey (I435)", () => {
    const unjudged = { care: undefined, doubt: undefined, handled: true }
    expect(badge("judgement", unjudged).state).toBe("open")
    expect(badge("question", unjudged).state).toBe("attention")
    expect(badge("judgement", { care: 10, handled: true, handledDone: true }).state).toBe("open")
  })

  test("a fix waiting for a check is never grey, whatever was scored (I411)", () => {
    expect(badge("issue", { fixed: true, care: 0, doubt: 100, handled: true }).state).toBe("replied")
  })

  test("not judged:  nothing, so it's drawn as before badges", () => {
    for (const kind of ["issue", "judgement", "todo", "test", "question"] as const)
      expect(badge(kind, { care: undefined, doubt: undefined })).toEqual({})
  })

  test("a trial leaves what's closed its colour;  not merged is blue all the same", () => {
    expect(badge("issue", { status: "done" }, true)).toEqual({ badge: "fixed", item: undefined, state: undefined })
    expect(badge("issue", { status: "done", unmerged: true }, true).state).toBe("progress")
  })

  test("a repo's own percentages", () => {
    const limits = { recheckAt: 90, closeBelow: 5, fixAbove: 10 }
    const of = (care: number, doubt: number) => ItemBadge.of({ kind: "issue", status: "open", care, doubt }, limits)
    expect([of(11, 89).badge, of(10, 89).badge, of(4, 0).badge]).toEqual(["willFix", "willRecheck", "willClose"])
  })
})

describe("ItemBadge.drawn():  what the page follows live", () => {
  const live = NO_LIVE_REVIEW

  test("an agent takes it:  UNDERWAY, or RECHECKING where it was to recheck", () => {
    const at = { ...live, workedOn: true }
    expect(ItemBadge.drawn({ kind: "issue", badge: "willFix" }, "progress", at)).toBe("underway")
    expect(ItemBadge.drawn({ kind: "issue", badge: "willRecheck" }, "progress", at)).toBe("rechecking")
  })

  test("the word follows the colour:  never URGENT in yellow", () => {
    const at = { ...live, urgency: { calm: false } }
    expect(ItemBadge.drawn({ kind: "issue", badge: "willFix" }, "attention", at)).toBe("urgent")
    expect(ItemBadge.drawn({ kind: "issue", badge: "willFix" }, "open", at)).toBe("willFix")
  })

  test("a comment waiting on them beats SEE", () => {
    const at = { ...live, commentsReplied: true }
    expect(ItemBadge.drawn({ kind: "question", badge: "see" }, "replied", at)).toBe("yourTurn")
  })

  test("closing at their check or x:  the finished word;  no badge written, none drawn", () => {
    const closing = { ...live, closing: true }
    expect(ItemBadge.drawn({ kind: "judgement", badge: "yourCall" }, "old", closing)).toBe("decided")
    expect(ItemBadge.drawn({ kind: "todo", badge: "willDo" }, "old", { ...closing, closingAs: "drop" })).toBe("wontDo")
    expect(ItemBadge.drawn({ kind: "issue" }, "progress", { ...live, workedOn: true })).toBeUndefined()
  })
})

describe("ItemBadge.ofPhase():  from its state alone", () => {
  test.each([
    ["waiting", "todo", "yourCall"],
    ["attention", "active", "yourCall"],
    ["paused", "todo", "held"],
    ["progress", "active", "underway"],
    ["scheduled", "todo", "queued"],
    ["recent", "done", "done"],
    ["old", "dropped", undefined]
  ])("%s, %s:  %s", (state, status, word) => {
    expect(ItemBadge.ofPhase(state, status)).toBe(word)
  })
})
