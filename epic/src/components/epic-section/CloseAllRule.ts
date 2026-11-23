import type { ItemState, LiveReview } from "spell/epic/components/epic-item/EpicItem.types"

/****************
 * ### `CloseAllRule`
 * Which items a section's Close all button closes (epic `epic-engine` T158;  Owen, 2026-11-23:  "I want 1-click way
 * to quickly e.g. close all "DECIDED" things in Js and "FIXED" in and "DONE" in todos"):
 * - Judgement calls:  every DECIDED call;  Issues:  every FIXED issue;  Todos:  every DONE todo
 * - only those still drawn in a colour, waiting for the person's ✓:  a grey one has nothing left to close
 * - "close" is what their ✓ does on one (a call accepted, a fix accepted, a finished item reviewed):  greyed
 * - ONE rule for the button's count (`<epic-section>`, the inbox as the page has it) and the server's close
 *   (`CloseAll`, the inbox as the server has it, plus what only the page file says)
 * - never one with their mark on it, Claude at work on it, closing at their ✓ or x, or a comment thread on it not
 *   finished with;  never one they called urgent, unless it's a fix waiting for them
 * - YOUR CALL, AGAINST YOUR ASK and the other badges that wait on them never count:  only the finished word does
 * - plain data:  no Solid, no DOM beyond reading attributes, so the page and the page server share it
 ****************/
export class CloseAllRule {
  /** The kind of section `kind` closes items of, or `undefined`:  its section kind is no Close all's. */
  static kindOf(kind: string | null | undefined): CloseAllKind | undefined {
    return kind && kind in CLOSE_ALL ? (kind as CloseAllKind) : undefined
  }

  /**
   * Is `item` of section kind `kind` finished, in the word its section closes:  DECIDED, FIXED, DONE?
   * - on a page with badges:  its badge is that word
   * - without:  a call decided or done, an issue fixed, a todo done
   */
  static isFinished(kind: CloseAllKind, item: Element): boolean {
    const { prefix, badge } = CLOSE_ALL[kind]
    if (!prefix.test(item.id)) return false
    const written = item.getAttribute("badge")
    if (written) return written === badge
    const status = item.getAttribute("status")
    if (kind === "issues") return item.hasAttribute("fixed")
    return status === "done" || (kind === "judgements" && status === "decided")
  }

  /**
   * Does Close all on section kind `kind` close `item`, drawn `state`, the inbox saying `live`?
   * - `commented`:  a comment thread on it isn't finished with
   */
  static closes(
    kind: CloseAllKind,
    item: Element,
    { state, live, commented }: { state: ItemState; live: LiveReview; commented: boolean }
  ): boolean {
    if (!CloseAllRule.isFinished(kind, item) || !WAITING_STATES.has(state)) return false
    if (live.mark || live.workedOn || live.closing || live.commentsReplied || commented) return false
    if (item.hasAttribute("working")) return false
    return !(item.hasAttribute("urgent") && !item.hasAttribute("fixed"))
  }
}

/**
 * Each section kind with a Close all:  the ids of its items, and the badge they're closed in.
 * - `word`:  that word in the button's text, lower case
 */
export const CLOSE_ALL = {
  judgements: { prefix: /^j\d+$/, badge: "decided" },
  issues: { prefix: /^i\d+$/, badge: "fixed" },
  todos: { prefix: /^t\d+$/, badge: "done" }
} as const

/** A section kind with a Close all:  `judgements`, `issues`, `todos`. */
export type CloseAllKind = keyof typeof CLOSE_ALL

/** The drawn states that still wait for the person's ✓:  green, light orange, orange, yellow;  grey never. */
const WAITING_STATES: ReadonlySet<ItemState> = new Set(["recent", "requested", "replied", "open"])
