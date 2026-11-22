import { TITLE_PREFIX_WORDS } from "./EpicItem.en"

/****************
 * ### `TitlePrefix`
 * The word an item's line STARTS with, worked out from its state:  `FIXED - It jumps` (epic `epic-engine` T143).
 * - Owen, 2026-11-22:  "item title prefixes are great, it will help me sort quickly ... put it first rather than at
 *   the end"
 * - ONE rule for the page (`<epic-item>`), the tool's listings (`PlanItem.listedTitle()`) and "0. While you were out"
 * - never written into the stored title
 * - where a prefix shows, the same word's UPDATE label at the line's end doesn't (`--epic-update-fixed-display`)
 * - another word:  its text in `TITLE_PREFIX_WORDS`, its case in `of()`
 * - NEVER reads the page but in `ofItem()`;  no Solid, so the node tool uses it too
 ****************/
export class TitlePrefix {
  /**
   * The word an item with `fields` starts with;  `undefined` for none.
   * - `fixed`:  fixed and waiting for a look (open, `fixed`), or fixed before anyone needed one (`self-fixed`)
   * - none while Claude is at work on it (`progress`)
   * - `accepted`:  his check on a waiting fix, sent or not:  it goes at the click, as the label did (I285)
   */
  static of(
    { status, state, fixed, selfFixed }: TitlePrefixFields,
    { accepted = false }: { accepted?: boolean } = {}
  ): TitlePrefixWord | undefined {
    if (state === "progress") return undefined
    if (selfFixed) return "fixed"
    const waits = !!fixed && (!status || status === "open")
    return waits && !accepted ? "fixed" : undefined
  }

  /** `item`'s word, read off its attributes. */
  static ofItem(item: Element): TitlePrefixWord | undefined {
    return TitlePrefix.of({
      status: item.getAttribute("status"),
      state: item.getAttribute("state"),
      fixed: item.hasAttribute("fixed"),
      selfFixed: item.hasAttribute("self-fixed")
    })
  }

  /** `title` as a listing says it, behind `word`:  `FIXED - It jumps`;  `title` alone with no word. */
  static titled(title: string, word: TitlePrefixWord | undefined): string {
    return word ? `${TITLE_PREFIX_WORDS[word]} ${title}` : title
  }
}

/** A word an item's line may start with. */
export type TitlePrefixWord = keyof typeof TITLE_PREFIX_WORDS

/** What an item's prefix is worked out from:  its attributes. */
export type TitlePrefixFields = {
  /** `status` */
  status?: string | null
  /** `state` as the tool wrote it */
  state?: string | null
  /** fixed, waiting for the person's look */
  fixed?: boolean
  /** fixed before they got to it */
  selfFixed?: boolean
}
