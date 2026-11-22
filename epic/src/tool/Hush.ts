import { DrawnState, NO_LIVE_REVIEW } from "spell/epic/components/epic-item/EpicItem.types"
import { ClaudePrint } from "spell/epic/command/ClaudePrint"

import type { PlanDoc } from "./PlanDoc"
import { JudgeText } from "./JudgeText"
import { PlanItem } from "./PlanItem"
import { PROMISED_CARD, type ItemState } from "./planDoc.types"

/****************
 * ### `Hush`
 * `epic hush [<epic> | all] [--dryrun]` (epic `epic-engine` T122):  the green, yellow and orange items Owen almost
 * certainly doesn't care about any more, greyed, as his ✓ would.
 * - Owen, 2026-11-20:  "go through all of the green / yellow / orange items and make a judgement call -- if you are
 *   80% sure I don't care and the item was settled more than 3 days ago, mark it as settled"
 * - three steps, each its own method:
 *   1. `candidates()`:  which items may be hushed at all, pure:  their colour as drawn, settled 3 days ago or more,
 *      and none of the exclusions (its docstring)
 *   2. the JUDGE decides each one, hush or keep, with a one-line why:  `claude -p`, Sonnet, nothing of the repo
 *      (`ClaudePrint`), handed the rule (`JUDGE_RULE`) and each item's title, kind, colour, age, words and last cards;
 *      a constructor option, so a test never calls a model
 *   3. `apply()`:  each hushed item approved as his ✓ would (`PlanDoc.applyAction()`:  a fix accepted, a call
 *      accepted, a finished item reviewed), its log line `I4 hushed:  <why>`, then ONE line for the run,
 *      `Hush:  N greyed, M kept`;  the caller saves the page once
 * - the sibling of `/epic tidy`, which closes OPEN items other work made obsolete;  this greys SETTLED ones
 * - node only;  imported by `PlanDocCommands`, by path
 ****************/
export class Hush {
  /** decides each candidate:  `claude -p` by default */
  private readonly judge: HushJudge

  /** the judge's model */
  private readonly model: string

  constructor({ judge = claudeJudge, model = DEFAULT_MODEL }: { judge?: HushJudge; model?: string } = {}) {
    this.judge = judge
    this.model = model
  }

  /**
   * The items of `plan` that may be hushed, in page order:  drawn green, yellow or orange, settled `HUSH_DAYS` or more
   * before `plan.now`, and none of these:
   * - an open question (red anyway), a manual test (left for Owen), open work (an open todo, an open issue not fixed)
   * - YOUR CALL, on a page with badges (P81):  only he can decide it
   * - one waiting on his pick, one he marked loud (`urgent`, unless it's a fix waiting for his review), one a tidy
   *   found promised and not delivered
   * - one with his mark not yet taken (`skip.marked`), Claude at work on it (`skip.working`), or a comment thread on it
   *   not finished with (`skip.commented`)
   * - pure:  reads the page, changes nothing
   */
  static candidates(plan: PlanDoc, skip: HushSkips = {}): HushCandidate[] {
    const now = plan.now.getTime()
    return plan.allItems.flatMap((item): HushCandidate[] => {
      const id = item.id
      if (skip.marked?.has(id) || skip.working?.has(id) || skip.commented?.has(id)) return []
      const facts = plan.facts(item)
      const kind = PlanItem.kindOfItem(item)
      if (kind === "question" || kind === "test") return []
      const open = facts.status === "open"
      if (open && (kind === "todo" || kind === "limit")) return []
      if (open && kind === "issue" && !facts.fixed) return []
      if (facts.awaitsPick || (facts.urgent && !facts.fixed) || Hush.isPromised(item)) return []
      // a page with badges:  YOUR CALL waits on him alone, so nobody greys it for him (epic `epic-engine` P81)
      if (open && plan.badges.badgeOf(item).badge === "yourCall") return []
      const state = DrawnState.of({ ...DrawnState.fieldsOf(item), state: plan.itemState(item) }, NO_LIVE_REVIEW, now)
      const colour = COLOURS[state]
      if (!colour) return []
      const settled = Hush.settledAt(item)
      if (settled === undefined || now - settled < HUSH_DAYS * DAY_MS) return []
      return [
        {
          id,
          kind,
          title: facts.title,
          colour,
          state,
          ageDays: Math.floor((now - settled) / DAY_MS),
          words: JudgeText.wordsOf(item),
          cards: JudgeText.lastCards(item)
        }
      ]
    })
  }

  /**
   * Each of `candidates`, decided:  hush or keep, with why, in their order.
   * - asks the judge in batches of `BATCH`;  one it didn't answer is KEPT
   * - throws what the judge throws (`claude -p` failing:  `EpicCommandError`)
   */
  decide(epic: string, candidates: readonly HushCandidate[]): HushCall[] {
    const calls = new Map<string, HushVerdict>()
    for (let at = 0; at < candidates.length; at += BATCH) {
      const batch = candidates.slice(at, at + BATCH)
      const verdicts = this.judge({ system: JUDGE_RULE, text: Hush.request(epic, batch), model: this.model, schema })
      for (const verdict of verdicts) calls.set(verdict.id.toLowerCase(), verdict)
    }
    return candidates.map((candidate) => {
      const verdict = calls.get(candidate.id)
      return {
        ...candidate,
        hush: verdict?.hush === true,
        why: verdict?.why?.trim() || "the judge gave no answer:  kept"
      }
    })
  }

  /**
   * Grey each hushed call on `plan`, as Owen's ✓ would, and log the run;  returns how many it greyed, and the log's
   * lines.
   * - one no longer a candidate (the page changed since it was judged) is left as it is, and counted kept
   * - `apply()` writes, the caller saves:  one write of the page per epic
   */
  static apply(plan: PlanDoc, calls: readonly HushCall[], skip: HushSkips = {}): { greyed: number; lines: string[] } {
    const still = new Set(Hush.candidates(plan, skip).map((candidate) => candidate.id))
    const lines: string[] = []
    let greyed = 0
    for (const call of calls) {
      if (!call.hush || !still.has(call.id)) continue
      const item = plan.item(call.id)
      const result = plan.applyAction(item, { id: call.id, action: "approve" })
      if (!result.applied) continue
      plan.reviewedAs(item, "approve")
      const line = `${call.id.toUpperCase()} hushed:  ${call.why} (${result.did})`
      plan.log(line)
      lines.push(line)
      greyed++
    }
    const summary = `Hush:  ${greyed} greyed, ${calls.length - greyed} kept`
    plan.log(summary)
    return { greyed, lines: [...lines, summary] }
  }

  /** `calls` as a table to read:  one row each, id, colour, age, hush or keep, why. */
  static table(calls: readonly HushCall[]): string[] {
    return calls.map(
      (call) =>
        `  ${call.id.toUpperCase().padEnd(6)}${call.colour.padEnd(8)}${`${call.ageDays}d`.padEnd(5)}` +
        `${(call.hush ? "hush" : "keep").padEnd(6)}${call.why}`
    )
  }

  /** What the judge reads for `candidates`:  each item in a few lines, its id first. */
  static request(epic: string, candidates: readonly HushCandidate[]): string {
    const blocks = candidates.map((candidate) => {
      const lines = [
        `## ${candidate.id.toUpperCase()} · ${candidate.kind} · ${candidate.colour} (${STATE_WORDS[candidate.state]})` +
          ` · settled ${candidate.ageDays} days ago`,
        `Title:  ${candidate.title}`
      ]
      if (candidate.words) lines.push(`Its words:  ${candidate.words}`)
      if (candidate.cards.length)
        lines.push("Its last cards, oldest first:", ...candidate.cards.map((card) => `- ${card}`))
      return lines.join("\n")
    })
    return [`The epic:  ${epic}.  ${candidates.length} items.`, ...blocks].join("\n\n")
  }

  ////////////////
  // ## Reading an item
  ////////////////

  /**
   * When `item` was last settled (ms):  the latest of its change stamp and anything dated in it (a status card, a
   * reply);  `undefined` for none.
   */
  static settledAt(item: Element): number | undefined {
    const times = [
      item.getAttribute("changed"),
      ...Array.from(item.querySelectorAll("[at]"), (each) => each.getAttribute("at"))
    ]
      .map((text) => (text ? Date.parse(text.replace(" ", "T")) : NaN))
      .filter((at) => Number.isFinite(at))
    return times.length ? Math.max(...times) : undefined
  }

  /** Did a tidy leave `item` a `Promised, not delivered:` card? */
  private static isPromised(item: Element): boolean {
    return Array.from(item.querySelectorAll(":scope > epic-status")).some((card) =>
      (card.textContent ?? "").trim().startsWith(PROMISED_CARD)
    )
  }
}

////////////////
// ## Types
////////////////

/** The ids (lower case) `Hush.candidates()` leaves out, from the epic's inbox. */
export type HushSkips = {
  /** holding a mark of Owen's not yet taken, or taken and in hand */
  marked?: ReadonlySet<string>
  /** Claude's agent at work on it */
  working?: ReadonlySet<string>
  /** a comment thread on it not finished with:  waiting on Claude, or on Owen */
  commented?: ReadonlySet<string>
}

/** The colours an item may be hushed from. */
export type HushColour = "green" | "yellow" | "orange"

/** An item that may be hushed, as the judge reads it. */
export type HushCandidate = {
  /** its id, lower case:  `i4` */
  id: string
  /** `judgement`, `issue`, `todo` ... */
  kind: string
  /** its title */
  title: string
  /** its colour as drawn */
  colour: HushColour
  /** its state as drawn (`DrawnState.of()`) */
  state: ItemState
  /** whole days since it was settled */
  ageDays: number
  /** its own words, cut short */
  words: string
  /** its last cards and replies, oldest first, each a line */
  cards: string[]
}

/** The judge's answer on one item. */
export type HushVerdict = {
  /** the item's id, any case */
  id: string
  /** grey it */
  hush: boolean
  /** one line:  why */
  why: string
}

/** A candidate, decided. */
export type HushCall = HushCandidate & {
  /** grey it */
  hush: boolean
  /** one line:  why */
  why: string
}

/** What the judge is handed. */
export type HushRequest = {
  /** its instructions:  `JUDGE_RULE` */
  system: string
  /** the items:  `Hush.request()` */
  text: string
  /** the model */
  model: string
  /** the answer's JSON Schema */
  schema: object
}

/** Decides a batch of candidates;  throws `EpicCommandError` when it can't. */
export type HushJudge = (request: HushRequest) => HushVerdict[]

////////////////
// ## Constants and the judge
////////////////

/** How long an item must have been settled before it may be hushed, in days (Owen:  "more than 3 days ago"). */
export const HUSH_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000

/** The colour of each state hush takes;  the rest (red, blue, grey) are never candidates. */
const COLOURS: Partial<Record<ItemState, HushColour>> = {
  recent: "green",
  open: "yellow",
  replied: "orange",
  requested: "orange"
}

/** Each candidate state in words, for the judge. */
const STATE_WORDS: Partial<Record<ItemState, string>> = {
  recent: "decided or done, not looked at again",
  open: "settled, still drawn as open",
  replied: "fixed, waiting for his review",
  requested: "something he asked for, finished, not looked at yet"
}

/** How many items one `claude -p` call decides. */
const BATCH = 40

/** The judge's model:  a judgement call, so Sonnet. */
const DEFAULT_MODEL = "sonnet"

/** The longest one batch may take, ms. */
const JUDGE_TIMEOUT_MS = 600_000

/**
 * The judge's instructions:  Owen's rule (T122), the 80% line.
 * - the items it may hush are already settled, and 3 days old:  the colour lists are what it thins
 */
const JUDGE_RULE = `You decide which items on a software project's planning page the project's owner, Owen, no longer
needs to look at.  Each item is already settled (fixed, decided, done, or recorded) and has been for at least three
days;  it still shows in a colour that asks for his attention (green, yellow or orange).  Hushing an item greys it,
as if he had ticked it himself.

The rule:  HUSH an item only if you are at least 80% sure Owen won't want to look at it again.  Hush:
- routine fixes he asked for that shipped
- calm judgement calls that follow the house style, or that only record what was done
- bookkeeping:  renames, rebuilt files, tidying, notes

KEEP anything that:
- changed behaviour he'd notice (what a page, a command or the editor does or looks like)
- dropped or narrowed something he asked for, or left part of it undone
- cost something:  time, speed, size, money
- is hard to undo
- is a choice he might have made differently

When unsure, KEEP.  For each item answer its id, hush true or false, and why in ONE short line he can read cold
(no ids but the item's, no jargon).  Answer every item.`

/** The judge's answer's shape, as `claude -p --json-schema` takes it. */
const schema = {
  type: "object",
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, hush: { type: "boolean" }, why: { type: "string" } },
        required: ["id", "hush", "why"]
      }
    }
  },
  required: ["verdicts"]
}

/** Is `answer` the judge's:  a list of verdicts. */
function isVerdicts(answer: unknown): answer is { verdicts: HushVerdict[] } {
  return Array.isArray((answer as { verdicts?: unknown } | undefined)?.verdicts)
}

/** The default judge:  `claude -p`, as fresh as it gets (`ClaudePrint`);  `EPIC_HUSH` set while it runs. */
function claudeJudge({ system, text, model, schema: shape }: HushRequest): HushVerdict[] {
  return ClaudePrint.ask({
    system,
    text,
    model,
    schema: shape,
    label: "epic hush",
    marker: "EPIC_HUSH",
    timeoutMs: JUDGE_TIMEOUT_MS,
    isAnswer: isVerdicts
  }).verdicts.filter((verdict) => typeof verdict?.id === "string")
}
