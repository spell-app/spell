import { BADGE_WORDS, TITLE_PREFIX_WORDS, type BadgeWord } from "./EpicItem.en"

/****************
 * ### `TitlePrefix`
 * The word an item's line STARTS with, worked out from its state:  `FIXED - It jumps` (epic `epic-engine` T143),
 * or, on a page with badges, its badge:  `WILL FIX - It jumps` (`ItemBadge`, P81).
 * - Owen, 2026-11-22:  "item title prefixes are great, it will help me sort quickly ... put it first rather than at
 *   the end"
 * - ONE rule for the page (`<epic-item>`), the tool's listings (`PlanItem.listedTitle()`) and "0. While you were out"
 * - never written into the stored title
 * - where a prefix shows, the same word's UPDATE label at the line's end doesn't (`--epic-update-fixed-display`);
 *   where a badge does, no UPDATE word does (`--epic-update-word-display`)
 * - a badge's words:  `BADGE_WORDS`, its rules `ItemBadge`'s tables
 * - NEVER reads the page but in `of...` methods handed an element;  no Solid, so the node tool uses it too
 ****************/
export class TitlePrefix {
  /**
   * The word an item with `fields` starts with, on a page without badges;  `undefined` for none.
   * - `fixed`:  fixed and waiting for a look (open, `fixed`), or fixed before anyone needed one (`self-fixed`)
   * - none while Claude is at work on it (`progress`)
   * - none where it has a `badge`, which says it
   * - `accepted`:  his check on a waiting fix, sent or not:  it goes at the click, as the label did (I285)
   */
  static of(
    { status, state, fixed, selfFixed, badge }: TitlePrefixFields,
    { accepted = false }: { accepted?: boolean } = {}
  ): TitlePrefixWord | undefined {
    if (badge || state === "progress") return undefined
    if (selfFixed) return "fixed"
    const waits = !!fixed && (!status || status === "open")
    return waits && !accepted ? "fixed" : undefined
  }

  /** What `item`'s line starts with, in words, read off its attributes:  `SEE T38 -`;  `""` for nothing. */
  static wordsOfItem(item: Element): string {
    const badge = TitlePrefix.badgeOfItem(item)
    if (badge) {
      const id = item.getAttribute("badge-item")?.toUpperCase() ?? ""
      return `${BADGE_WORDS[badge].replace("{id}", id)} -`
    }
    const word = TitlePrefix.of({
      status: item.getAttribute("status"),
      state: item.getAttribute("state"),
      fixed: item.hasAttribute("fixed"),
      selfFixed: item.hasAttribute("self-fixed")
    })
    return word ? TITLE_PREFIX_WORDS[word] : ""
  }

  /** `item`'s badge as written;  `undefined` for none, or one this code doesn't know. */
  static badgeOfItem(item: Element): BadgeWord | undefined {
    return TitlePrefix.knownBadge(item.getAttribute("badge"))
  }

  /** `value`, a `badge` attribute's, as a badge;  `undefined` for none, or one a newer engine wrote. */
  static knownBadge(value: string | null | undefined): BadgeWord | undefined {
    return value && Object.hasOwn(BADGE_WORDS, value) ? (value as BadgeWord) : undefined
  }

  /** `title` as a listing says it for `item`:  `FIXED - It jumps`;  `title` alone with nothing before it. */
  static titled(title: string, item: Element | null | undefined): string {
    const words = item ? TitlePrefix.wordsOfItem(item) : ""
    return words ? `${words} ${title}` : title
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
  /** its badge, on a page with badges */
  badge?: string | null
}
