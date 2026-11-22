import { PlanMarkup } from "./PlanMarkup"

/****************
 * ### `JudgeText`
 * An item as a fresh judge reads it:  its words, and its last cards and replies, each cut short.
 * - ONE reading for both judges:  `Hush`'s (epic `epic-engine` T122) and the badges' (`ItemJudge`, P81)
 * - STATIC and pure:  reads the element, changes nothing
 ****************/
export class JudgeText {
  /** `item`'s own words:  its text, without its cards, replies or Original Discussion, cut to `WORDS_CHARS`. */
  static wordsOf(item: Element): string {
    const copy = item.cloneNode(true) as Element
    for (const each of Array.from(copy.querySelectorAll(NOT_ITS_WORDS))) each.remove()
    return JudgeText.cut(PlanMarkup.squeeze(copy.textContent ?? ""), WORDS_CHARS)
  }

  /** `item`'s last `LAST_CARDS` status cards and replies, oldest first:  `Done (11/14 09:12):  <its words>`. */
  static lastCards(item: Element): string[] {
    return Array.from(item.querySelectorAll(":scope > epic-status, :scope > epic-reply"))
      .slice(-LAST_CARDS)
      .map((card) => {
        const who =
          card.localName === "epic-reply"
            ? (card.getAttribute("from") ?? "reply")
            : (card.getAttribute("state") ?? "underway")
        const at = card.getAttribute("at")
        const said = JudgeText.cut(PlanMarkup.squeeze(card.textContent ?? ""), CARD_CHARS)
        return `${who}${at ? ` (${at})` : ""}:  ${said}`
      })
  }

  /** `text` cut to `chars`, with `…` when it was longer. */
  static cut(text: string, chars: number): string {
    return text.length > chars ? `${text.slice(0, chars - 1)}…` : text
  }
}

/** What an item's own words leave out. */
const NOT_ITS_WORDS = "epic-status, epic-reply, epic-original, epic-commits, epic-commit"

/** How much of an item's words, and of each card, a judge reads. */
const WORDS_CHARS = 600
const CARD_CHARS = 300

/** How many of an item's last cards a judge reads. */
const LAST_CARDS = 3
