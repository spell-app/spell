import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import { EPIC_GROUPS, byTitle, type EpicGroupName } from "spell-epic/list/EpicCards"
import { StateFilter } from "spell-epic/components/epic-section/StateFilter"

import { epicListVocabulary } from "./EpicList.en"
import {
  CARD_ATTRIBUTES,
  CARD_TAG,
  GROUP_LOOKS,
  SAGAS_SHOWN_KEY,
  SORT_EVENT,
  listedCardOf,
  save,
  savedList,
  savedSort,
  type EpicSortName,
  type FavoriteDetail,
  type ListedCard,
  type SortDetail
} from "./EpicList.types"

import tooltipCSS from "spell-epic/components/epic-item/Tooltip.css?inline"
import listCSS from "./EpicList.css?inline"

/****************
 * ### `<epic-list>`
 * The Epics page's list (epic `epic-engine` P3):  its `<epic-card>` children, grouped, sorted and filtered.
 * - five GROUPS, in `EPIC_GROUPS`' order (epic `airplane` P8):  Favorites (starred, whatever their state), Active,
 *   Planning, Urgent, Done, each a small heading with how many of its cards show;  a group with none showing isn't
 *   drawn;  `no-favorites`:  no Favorites (a saga page's, `<epic-cards>`)
 * - within each, by title (A to Z, numbers as numbers) or newest first by when each was last worked on, as the page's
 *   `<epic-sort>` says (`epic-sort`);  remembered in this browser
 * - SAGA CHIPS above them (epic `epic-workflow` P15):  one per saga its cards name, in `sagas`' order, then No saga,
 *   each with its count;  a click shows only that saga's epics, by the state chips' rule (`StateFilter.nextShown()`);
 *   remembered in this browser, for every Epics page
 * - a card the docs runtime's state chips hide (`data-spell-hidden`) doesn't count either
 * - it NEVER moves or changes its cards (but their star, below):  one grid in its shadow root holds the headings and
 *   the slotted cards, each card placed by a `::slotted()` rule (CSS `order`), the hidden ones hidden by one
 *   - so a live update of the page, or the page server's added cards, are placed as they come
 * - a card's star answered (`epic-favorite`):  every card starred as the page server says
 * - SIDE EFFECT:  watches its cards' attributes and text (`@watches`);
 *   listens for `epic-sort` on the document while connected
 ****************/
export class EpicList extends E.UIComponent<typeof epicListVocabulary> {
  @E.proto static vocabulary = epicListVocabulary
  @E.protoMerged static elementSetup = {
    // a chip's tooltip on the chip, never its count (`epic-tooltip`)
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-list": listCSS },
    // a list of links:  a click on a card's words must not jump to its first link
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## State
  ////////////////

  /** The sagas the reader chose to show, as remembered;  `undefined`:  every one. */
  @E.state accessor chosenSagas: readonly string[] | undefined = isServer ? undefined : savedList(SAGAS_SHOWN_KEY)

  /** How each group sorts:  by title, or newest first (`<epic-sort>`). */
  @E.state accessor sort: EpicSortName = isServer ? "title" : savedSort()

  ////////////////
  // ## Derived state
  ////////////////

  /** Its cards, as they place:  read again whenever one comes, goes, or changes what places it. */
  @E.watches({ childList: true, subtree: true, characterData: true, attributeFilter: CARD_ATTRIBUTES })
  get cards(): readonly ListedCard[] {
    if (isServer) return []
    const favorites = !this.noFavorites
    return Array.from(this.domElement.children)
      .filter((child) => child.localName === CARD_TAG)
      .map((card) => listedCardOf(card, favorites))
  }

  /** The sagas' ids, in Owen's order (`sagas`). */
  get sagaIds(): string[] {
    return (this.sagas ?? "").split(/\s+/).filter(Boolean)
  }

  /**
   * The chips:  one per listed saga a card names, in `sagas`' order, then No saga (`""`) when a card names none;
   * each with its title, tooltip and count.  None at all without a listed saga that has epics.
   */
  @E.derived
  get chips(): SagaChip[] {
    const ids = this.sagaIds
    const cards = this.cards
    const chips: SagaChip[] = []
    for (const id of ids) {
      const mine = cards.filter((card) => card.saga === id)
      if (!mine.length) continue
      chips.push({ id, title: mine[0]!.sagaTitle || id, tip: mine[0]!.sagaPurpose, count: mine.length })
    }
    if (!chips.length) return chips
    const none = cards.filter((card) => !ids.includes(card.saga)).length
    if (none) {
      const tip = this.translationForKey("noSagaTip")
      chips.push({ id: "", title: this.translationForKey("noSaga"), tip, count: none })
    }
    return chips
  }

  /** The sagas showing:  the reader's choice, of the chips there are now;  none chosen (or none left), every one. */
  get shownSagas(): ReadonlySet<string> {
    const ids = this.chips.map((chip) => chip.id)
    const chosen = (this.chosenSagas ?? []).filter((id) => ids.includes(id))
    return new Set(chosen.length ? chosen : ids)
  }

  /** The cards in their groups, each sorted, with whether each shows. */
  @E.derived
  get groups(): PlacedGroup[] {
    const ids = this.sagaIds
    const chips = this.chips.length > 0
    const shown = this.shownSagas
    const order = this.sort === "date" ? byWorked : byCardTitle
    return EPIC_GROUPS.map((group) => {
      const cards = this.cards
        .filter((card) => card.group === group)
        .sort(order)
        .map((card) => ({
          card,
          shows: !card.isFiltered && (!chips || shown.has(ids.includes(card.saga) ? card.saga : ""))
        }))
      return { group, cards, showing: cards.filter((each) => each.shows).length }
    })
  }

  /**
   * Where each card goes and whether it shows, as `::slotted()` rules:  each group's heading at `order` 10000 times
   * its place, its cards after it in their order;  a hidden card `display: none`.
   * - by its `epic` attribute:  nothing in the page changes
   */
  @E.derived
  get placeRules(): string {
    if (isServer) return ""
    return this.groups
      .flatMap(({ cards }, index) =>
        cards.map(
          ({ card, shows }, place) =>
            `::slotted(${CARD_TAG}[epic="${CSS.escape(card.epic)}"]) { order: ${index * GROUP_STEP + place + 1};` +
            `${shows ? "" : " display: none;"} }`
        )
      )
      .join("\n")
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** Follow `<epic-sort>`'s choice while connected:  it may sit anywhere on the page (the page's header). */
  @E.whileConnected
  protected followSort() {
    if (isServer) return undefined
    const onSort = (event: Event) => {
      const sort = (event as CustomEvent<SortDetail>).detail?.sort
      if (sort === "title" || sort === "date") this.sort = sort
    }
    document.addEventListener(SORT_EVENT, onSort)
    return () => document.removeEventListener(SORT_EVENT, onSort)
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <Show when={this.chips.length}>
          <div
            class={CHIPS}
            part={this.partForName("chips")}
            role="group"
            aria-label={this.translationForKey("chipsLabel")}
          >
            <For each={this.chips} keyed={(chip) => chip.id}>
              {(chip) => {
                const on = () => this.shownSagas.has(chip().id)
                return (
                  <button
                    type="button"
                    class={CHIP}
                    part={this.partForName("chip")}
                    data-saga={chip().id}
                    aria-pressed={on() ? "true" : "false"}
                    title={this.chipTip(chip(), on())}
                    onClick={() => this.pickSaga(chip().id)}
                  >
                    {chip().title} <span class={COUNT}>{chip().count}</span>
                  </button>
                )
              }}
            </For>
          </div>
        </Show>
        <div class={CARDS} part={this.partForName("cards")}>
          <For each={this.groups} keyed={(group) => group.group}>
            {(group, index) => (
              <Show when={group().showing}>
                <h3
                  class={[GROUP_TITLE, { [FIRST]: this.isFirstShowing(group().group) }]}
                  part={this.partForName("group-title")}
                  data-group={group().group}
                  style={{ order: index() * GROUP_STEP }}
                >
                  <ui-icon name={GROUP_LOOKS[group().group].icon} />
                  {this.translationForKey(GROUP_LOOKS[group().group].title)}{" "}
                  <span class={COUNT}>{group().showing}</span>
                </h3>
              </Show>
            )}
          </For>
          <slot />
          <style>{this.placeRules}</style>
        </div>
      </div>
    )
  }

  /** A chip's tooltip:  its saga's purpose, then what a click does. */
  private chipTip(chip: SagaChip, on: boolean): string {
    const does = this.translationForKey(on ? "showOnly" : "showToo", { saga: chip.title })
    return chip.tip ? `${chip.tip}\n${does}` : does
  }

  /** Whether `group` is the first group with cards showing:  its heading has no space above it. */
  private isFirstShowing(group: EpicGroupName): boolean {
    return this.groups.find((each) => each.showing)?.group === group
  }

  ////////////////
  // ## Behaviour
  ////////////////

  /** A saga chip, clicked:  what shows next, by the state chips' rule;  remembered for every Epics page. */
  @E.untracked
  private pickSaga(id: string) {
    const ids = this.chips.map((chip) => chip.id)
    const next = StateFilter.nextShown(ids, [...this.shownSagas], id)
    this.chosenSagas = next
    save(SAGAS_SHOWN_KEY, next)
  }

  /** A card's star, answered by the page server:  every card starred as it says (another window may have starred). */
  @E.on("epic-favorite")
  protected onFavorite(event: Event) {
    const { favorites } = (event as CustomEvent<FavoriteDetail>).detail ?? {}
    if (!Array.isArray(favorites)) return
    for (const card of this.cards) card.element.toggleAttribute("favorite", favorites.includes(card.epic))
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicList extends E.AttributeValues<typeof epicListVocabulary> {}

/** One saga chip:  its saga's id (`""` for No saga), title, tooltip and how many cards name it. */
type SagaChip = { id: string; title: string; tip: string; count: number }

/** A group as drawn:  its cards in order, each showing or not, and how many show. */
type PlacedGroup = { group: EpicGroupName; cards: { card: ListedCard; shows: boolean }[]; showing: number }

/** Each group's `order` steps by this:  room for its cards after its heading. */
const GROUP_STEP = 10_000

/** A to Z by title, numbers as numbers. */
function byCardTitle(a: ListedCard, b: ListedCard): number {
  return byTitle(a.title, b.title)
}

/** Newest first by `worked` (local ISO, so its text sorts as the time does);  none last;  then by title. */
function byWorked(a: ListedCard, b: ListedCard): number {
  return b.worked.localeCompare(a.worked) || byCardTitle(a, b)
}

/** Classes of what it draws. */
const CHIPS = "chips"
const CHIP = "chip"
const COUNT = "count"
const CARDS = "cards"
const GROUP_TITLE = "group-title"
const FIRST = "first"
