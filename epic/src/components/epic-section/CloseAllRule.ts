import type { ItemState, LiveReview } from "spell/epic/components/epic-item/EpicItem.types"

/****************
 * ### `CloseAllRule`
 * Which items a section's Close all button closes (epic `epic-engine` T158;  Owen, 2026-11-23:  "I want 1-click way
 * to quickly e.g. close all "DECIDED" things in Js and "FIXED" in and "DONE" in todos"):
 * - Judgement calls:  every DECIDED call;  Issues:  every FIXED or DONE issue;  Todos:  every DONE or FIXED todo
 *   (epic `epic-engine` I487;  Owen:  "The 'Close' in the Issues header should close done items as well"):
 *   whatever finished word a single ✓ closes
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

  /** Is `item` of section kind `kind` finished, in a word its section closes (`wordOf()`)? */
  static isFinished(kind: CloseAllKind, item: Element): boolean {
    return !!CloseAllRule.wordOf(kind, item)
  }

  /**
   * The finished word `item` of section kind `kind` is closed in:  `decided`, `fixed`, `done`;  `undefined`:
   * it isn't finished, or isn't that section's.
   * - on a page with badges:  its badge, when it's one of the section's words
   * - without:  a call decided or done;  an issue or a todo fixed (`fixed`), else done
   */
  static wordOf(kind: CloseAllKind, item: Element): CloseWord | undefined {
    const { prefix, words } = CLOSE_ALL[kind]
    if (!prefix.test(item.id)) return undefined
    const written = item.getAttribute("badge")
    if (written) return (words as readonly string[]).includes(written) ? (written as CloseWord) : undefined
    const status = item.getAttribute("status")
    if (kind === "judgements") return status === "done" || status === "decided" ? "decided" : undefined
    if (item.hasAttribute("fixed")) return "fixed"
    return status === "done" ? "done" : undefined
  }

  /**
   * How many of `items` are closed in each finished word of section kind `kind`, in its order, none left out:
   * `[["fixed", 1], ["done", 2]]` (the button's `Close 1 fixed, 2 done`, epic `epic-engine` I487).
   */
  static wordsIn(kind: CloseAllKind, items: readonly { word: CloseWord }[]): [CloseWord, number][] {
    const words: readonly CloseWord[] = CLOSE_ALL[kind].words
    return words.flatMap((word): [CloseWord, number][] => {
      const count = items.filter((each) => each.word === word).length
      return count ? [[word, count]] : []
    })
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
 * Each section kind with a Close all:  the ids of its items, and the badges they're closed in, in the order its
 * button counts them (`Close 1 fixed, 2 done`).
 */
export const CLOSE_ALL = {
  judgements: { prefix: /^j\d+$/, words: ["decided"] },
  issues: { prefix: /^i\d+$/, words: ["fixed", "done"] },
  todos: { prefix: /^t\d+$/, words: ["done", "fixed"] }
} as const

/** A section kind with a Close all:  `judgements`, `issues`, `todos`. */
export type CloseAllKind = keyof typeof CLOSE_ALL

/** A finished word a Close all closes in:  `decided`, `fixed`, `done`. */
export type CloseWord = (typeof CLOSE_ALL)[CloseAllKind]["words"][number]

/** The drawn states that still wait for the person's ✓:  green, light orange, orange, yellow;  grey never. */
const WAITING_STATES: ReadonlySet<ItemState> = new Set(["recent", "requested", "replied", "open"])
