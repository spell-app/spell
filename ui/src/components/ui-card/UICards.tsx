import type { JSX } from "@solidjs/web"

import { E, UIT } from "spell-ui/core"
import { cardsVocabulary } from "./UICards.en"

import cardCSS from "./UICard.css?inline"

/****************
 * ### `UICards`
 * The component behind `<ui-cards>`:
 * a group of cards in a wrapping row, `<div class="ui ... cards" part="group" role="list"><slot></slot></div>`.
 *
 * - It owns its cards (`ownsParts:  card`):  each `<ui-card>` finds this group (`PartContext`),
 *   its DOM element becomes a `role=listitem` with `:state(in-cards)`,
 *   and it takes the group's shared variations as its own classes (`variationFor()`, `CardSharedVariation`),
 *   so a raised group's cards are `ui raised card`s.
 *
 * - Count, spacing and width reach the cards as private inherited tokens (`--_cards-*`, `UICard.css`).
 *   - `doubling` and `stackable` answer to THIS DOM element's width:
 *     it's a block and the size container `ui-cards` (`:state(cards)`, always on).
 *   - With `stack-with="page"` (a private class before the noun), they answer to the screen's.
 *
 * - A list:  a group of cards reads as "list, 3 items";  each card is still its own `<article>` or link.
 * - It shares the card's sheet, `UICard.css`.
 ****************/
export class UICards extends E.UIComponent<typeof cardsVocabulary> {
  @E.proto static vocabulary = cardsVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { card: cardCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The group's value of variation `name`, which its cards take when they don't set it.  Tracked. */
  variationFor(name: UIT.CardSharedVariation): unknown {
    return name === UIT.APPEARANCE ? this.looks : this[name]
  }

  /** `appearance`'s words, and `link` for a bare `link`:  the old look (`link` is every tag's link now). */
  get looks(): string | undefined {
    return UICards.withBareLinkLook(this.appearance, this.attributes.link)
  }

  protected classValue(name: E.AttributeName<typeof cardsVocabulary>): unknown {
    return name === UIT.APPEARANCE ? this.looks : super.classValue(name)
  }

  /**
   * `appearance`'s words, plus `link` when the `link` attribute is written bare (`<ui-card link>`):
   * the old look, from before `link` was a tag's link (epic `ui-gaps` P4).
   * - Static:  a card and its group both ask, and it reads nothing of either.
   */
  static withBareLinkLook(appearance: string | number | undefined, linkText: string | null): string | undefined {
    if (linkText !== "") return appearance === undefined ? undefined : String(appearance)
    return [...new Set([...String(appearance ?? "").split(" "), LINK_LOOK].filter(Boolean))].join(" ")
  }

  /** Always on:  the DOM element is the `ui-cards` size container (`:state(cards)`). */
  @E.cssState("cards")
  get isCards(): boolean {
    return true
  }

  /** `stack-with`'s class (`UIT.StackClasses`). */
  protected get extraClass(): string | undefined {
    return UIT.StackClasses.classFor(this.stackWith)
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("group")} role="list">
        <slot />
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UICards extends E.AttributeValues<typeof cardsVocabulary> {}

/** The `link` look word of `appearance`:  "rises on hover, as a link card does". */
const LINK_LOOK = "link"
