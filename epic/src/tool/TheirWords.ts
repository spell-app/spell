import { escapeRegExp } from "spell/util/string"

import { PlanItem } from "./PlanItem"
import { PlanMarkup } from "./PlanMarkup"

/****************
 * ### `TheirWords`
 * Is an item the person's own words (epic `epic-engine` T144, I435)?  Those are never closed or greyed unseen.
 * - filed from their words (`requested`), or added by them on the page
 * - a quote of theirs anywhere in its own text, `<q>` too:  after a `Was titled:` line, a card, in brackets
 * - its first words name them as asking:  `Owen asked for ...`, `Owen's comment C8 names ...`
 * - errs to theirs:  one kept open costs a look, one closed wrongly loses their words
 * - STATIC and pure:  reads the element, changes nothing
 ****************/
export class TheirWords {
  /** Is `item` theirs, `person` being whose page it is? */
  static isTheirs(item: Element, person?: string): boolean {
    return item.hasAttribute("requested") || TheirWords.isAddedOnPage(item) || TheirWords.quotes(item, person)
  }

  /** Did they add `item` on the page (its Noted card, `PlanDoc.addFromPage()`)? */
  static isAddedOnPage(item: Element): boolean {
    return Array.from(item.querySelectorAll(":scope > epic-status")).some((card) =>
      (card.textContent ?? "").trim().startsWith(MADE_FROM_PAGE)
    )
  }

  /** Does `item`'s own text quote `person`, or start from what they said? */
  private static quotes(item: Element, person?: string): boolean {
    const names = [...OWNER_NAMES, ...(person && person !== NOBODY ? [person] : [])].map(escapeRegExp).join("|")
    const starts = new RegExp(String.raw`^["“]?(?:${names})\b`)
    const quoted = [
      // `Owen typed "orange until ..."`, `Owen's rule, 'stay in place'`:  in one sentence
      new RegExp(String.raw`\b(?:${names})\b(?:[^“".]|\.(?=\S)){0,100}(?:[“"]|(?<=\s)'(?=\S))`),
      // `"stay in place" (Owen, 2026-10-10)`
      new RegExp(String.raw`[”"]\s*\(\s*(?:${names})\b`),
      // `(Owen, 2026-10-29:  only when no mark says it)`
      new RegExp(String.raw`\(\s*(?:${names})\b[^)]{0,60}:`),
      YOU_SAID
    ]
    const namesThem = new RegExp(String.raw`\b(?:${names}|you|You|your|Your)\b`)
    const blocks = TheirWords.blocksOf(item)
    return blocks.some((block, at) => {
      if (PlanItem.isOwenQuote(block)) return true
      const copy = block.cloneNode(true) as Element
      for (const each of Array.from(copy.querySelectorAll(NOT_THEIRS))) each.remove()
      const marks = Array.from(copy.querySelectorAll("q"))
      for (const mark of marks) mark.textContent = `"${mark.textContent ?? ""}"`
      const text = PlanMarkup.squeeze(copy.textContent ?? "")
      if (at === 0 && starts.test(text)) return true
      if (marks.length && namesThem.test(text)) return true
      return quoted.some((pattern) => pattern.test(text))
    })
  }

  /** The blocks of `item`'s own text, in order:  never a card's, a reply's, a commit's, nor `Was titled:`. */
  private static blocksOf(item: Element): Element[] {
    return Array.from(item.querySelectorAll(BLOCKS)).filter((block) => {
      const outside = block.closest(NOT_THEIRS)
      return (!outside || !item.contains(outside)) && !block.parentElement?.closest(BLOCKS)
    })
  }
}

/** How the Noted card of an item made from the page starts (`PlanDoc.addFromPage()`). */
export const MADE_FROM_PAGE = "Made from the page:"

/** The page owner's names as items have quoted them, whoever's at the keyboard (`PlanItem.isOwenQuote()`'s). */
const OWNER_NAMES = ["Owen", "owenoak"]

/** The name written when nobody's is known. */
const NOBODY = "someone"

/** A quote put to them in the second person:  `You said "start it"`. */
const YOU_SAID = /\b[Yy]ou (?:said|asked|wrote|typed|picked|chose)\b[^“".]{0,100}[“"]/

/** An item's blocks of text. */
const BLOCKS = "p, li, blockquote, dd, td"

/** What isn't an item's own words:  the line saying its old title, and what others or the tool added. */
const NOT_THEIRS =
  "p.spell-meta, epic-status, epic-reply, epic-original, epic-commit, epic-commits, epic-update, [slot='title']"
