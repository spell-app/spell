import { E, UI, UIT } from "spell/ui/core"

/****************
 * ### `ChoiceRows`
 * The rows of `UI.modals.choose()`'s dialog, and which of them are picked (epic `language` P66).
 * - Up to `BUTTON_ROWS` rows:  a `<ui-button>` each, one under another.
 * - More:  a `<ui-list selection>` of `<ui-item>`s that scrolls, with a search box above it, which hides the rows
 *   whose words don't hold what's typed.
 * - `shown`:  how many rows show before the rows scroll;  default every button, or `LIST_ROWS` of a list.
 * - One:  a row picks itself (`onPicked()`), and the dialog closes.
 * - Several:  each row turns on and off;  `onCountChanged()` says whether OK may pick them (`fits`).
 * - A row with a `color`:  a `<ui-color-chip>` before its words, read-only, so the row around it is what's picked;
 *   `ModalDialogs.choose()` imports the chip's family first.
 * - Plain DOM, built with `createElement` / `textContent`, as `ModalDialogs` is:  never `innerHTML` with caller text.
 * - Other families' tags are found by class noun (`tagFor`), as `ModalDialogs` finds them.
 ****************/
export class ChoiceRows {
  /** what the dialog holds:  the rows, and the search box above a long list */
  readonly element: HTMLElement
  /** pick several */
  readonly several: boolean
  /** the rows picked, by position */
  readonly picked = new Set<number>()
  /** a row picked itself:  one, never several */
  onPicked: () => void = () => {}
  /** several:  the rows picked changed */
  onCountChanged: () => void = () => {}

  private readonly document: Document
  private readonly least: number
  private readonly most: number

  constructor({ document, options, tagFor }: ChoiceRowsProps) {
    const { rows, several = false, least = 1, most = rows.length, shown } = options
    this.document = document
    this.several = several
    this.least = least
    this.most = most
    this.element = document.createElement("div")
    this.element.style.cssText = ROWS_LAYOUT
    if (rows.length > BUTTON_ROWS) this.drawList(rows, tagFor, shown ?? LIST_ROWS)
    else this.drawButtons(rows, tagFor, shown)
  }

  /** May OK pick the rows picked now?  Several:  as many as `least` to `most`. */
  get fits(): boolean {
    return this.picked.size >= this.least && this.picked.size <= this.most
  }

  /** The rows picked, by position, in the order they show. */
  get positions(): number[] {
    return [...this.picked].sort((a, b) => a - b)
  }

  ////////////////
  // ## Buttons, up to `BUTTON_ROWS`
  ////////////////

  /** A `<ui-button>` per row, one under another;  a `toggle` button each, for several. */
  private drawButtons(rows: readonly E.ChoiceRow[], tagFor: TagFor, shown: number | undefined): void {
    const box = this.scroller(shown, rows.some((row) => row.color) ? CHIP_ROW_HEIGHT : BUTTON_ROW_HEIGHT)
    rows.forEach((row, position) => {
      const button = this.document.createElement(tagFor(UIT.BUTTON))
      button.toggleAttribute(FLUID, true)
      button.setAttribute(APPEARANCE, BASIC)
      button.append(...this.words(row, tagFor))
      if (this.several) {
        button.toggleAttribute(TOGGLE, true)
        button.addEventListener(SELECTED_EVENT, () => this.turn(position, true))
        button.addEventListener(DESELECTED_EVENT, () => this.turn(position, false))
      } else button.addEventListener("click", () => this.pick(position))
      box.append(button)
    })
    this.element.append(box)
  }

  ////////////////
  // ## A list, past `BUTTON_ROWS`
  ////////////////

  /** A search box, then a `<ui-list selection>` of the rows, `shown` of them tall. */
  private drawList(rows: readonly E.ChoiceRow[], tagFor: TagFor, shown: number): void {
    const search = this.document.createElement("input")
    search.type = "search"
    search.className = NATIVE_LOOK
    search.autofocus = true
    search.setAttribute("aria-label", UI.i18n.t(SEARCH))
    search.placeholder = UI.i18n.t(SEARCH)
    const box = this.scroller(shown, LIST_ROW_HEIGHT)
    const list = this.document.createElement(tagFor(LIST))
    list.toggleAttribute(SELECTION, true)
    list.toggleAttribute(DIVIDED, true)
    const items = rows.map((row, position) => {
      const item = this.document.createElement(tagFor(ITEM))
      item.setAttribute(VALUE, String(position))
      item.append(...this.words(row, tagFor))
      list.append(item)
      return { item, words: row.title.toLocaleLowerCase() }
    })
    list.addEventListener(CHOSEN_EVENT, (event) => {
      const { item } = (event as CustomEvent<UIT.ListSelectDetail>).detail
      const position = Number(item.getAttribute(VALUE))
      if (!this.several) return this.pick(position)
      const isOn = !this.picked.has(position)
      item.toggleAttribute(SELECTED, isOn)
      this.turn(position, isOn)
    })
    search.addEventListener("input", () => {
      const typed = search.value.trim().toLocaleLowerCase()
      for (const { item, words } of items) item.hidden = !!typed && !words.includes(typed)
    })
    box.append(list)
    this.element.append(search, box)
  }

  ////////////////
  // ## Rows
  ////////////////

  /** A box `shown` rows of `rowHeight` tall, that scrolls past that;  none:  as tall as its rows. */
  private scroller(shown: number | undefined, rowHeight: number): HTMLElement {
    const box = this.document.createElement("div")
    box.style.cssText = shown ? `${SCROLLER_LAYOUT};max-height:${shown * rowHeight}em` : STACK_LAYOUT
    return box
  }

  /** A row's words, and its color's chip before them. */
  private words({ title, color }: E.ChoiceRow, tagFor: TagFor): Node[] {
    const words = this.document.createTextNode(title)
    if (!color) return [words]
    const chip = this.document.createElement(tagFor(COLOR_CHIP))
    chip.setAttribute(COLOR, HUES.has(color) ? `var(--ui-${color})` : color)
    // the row's words say it:  the chip is only its picture
    chip.setAttribute("aria-hidden", "true")
    chip.style.marginInlineEnd = CHIP_GAP
    return [chip, words]
  }

  /** One:  `position` is picked, and the dialog closes. */
  private pick(position: number): void {
    this.picked.clear()
    this.picked.add(position)
    this.onPicked()
  }

  /** Several:  `position` turned on or off. */
  private turn(position: number, isOn: boolean): void {
    if (isOn) this.picked.add(position)
    else this.picked.delete(position)
    this.onCountChanged()
  }
}

/** What `ChoiceRows` is made from. */
export type ChoiceRowsProps = {
  /** page to build in */
  document: Document
  /** the dialog's options:  its rows, and how many may be picked */
  options: E.ChooseModalOptions
  /** the registered tag of a class noun:  `ModalDialogs.tagFor()` */
  tagFor: TagFor
}

/** The registered tag of a class noun, `button` => `ui-button`. */
type TagFor = (noun: string) => string

/** The most rows drawn as buttons:  past it, a list with a search box (Q75). */
export const BUTTON_ROWS = 20

/** A list's rows shown before it scrolls, unless `shown` says. */
const LIST_ROWS = 10

/** A button row's height, with the gap under it, in ems:  `shown` buttons' worth of box. */
const BUTTON_ROW_HEIGHT = 2.75

/** The same, for buttons with a color chip, a little taller. */
const CHIP_ROW_HEIGHT = 3.125

/** A list row's height, in ems. */
const LIST_ROW_HEIGHT = 2.2

/** The rows under the message, and the search box above a list. */
const ROWS_LAYOUT = "display: grid; gap: 0.5em; margin-top: 1em"

/** Buttons one under another, a little apart. */
const STACK_LAYOUT = "display: grid; gap: 0.25em"

/**
 * The same, scrolling past its height.
 * - Its padding keeps a focused row's ring inside the box, and the negative margin keeps the rows where they were.
 */
const SCROLLER_LAYOUT = `${STACK_LAYOUT};overflow-y:auto;overscroll-behavior:contain;padding:4px;margin:-4px`

/** Between a chip and its words. */
const CHIP_GAP = "0.5em"

/** Spell UI's hue names:  a row's `color` that's one is its token, `var(--ui-red)`. */
const HUES = new Set<string>(UIT.ThemeHues)

/** `native.css`'s opt-in class, for the search box. */
const NATIVE_LOOK = "ui-native"

/** Text key of the search box's placeholder and label. */
const SEARCH = "search"

/** Class nouns of the list, its items and the color chip. */
const LIST = "list"
const ITEM = "item"
const COLOR_CHIP = "colour chip"

/** `<ui-button>`'s attributes (canonical names). */
const FLUID = "fluid"
const TOGGLE = "toggle"
const APPEARANCE = "appearance"
const BASIC = "basic"

/** `<ui-list>`'s and `<ui-item>`'s attributes (canonical names). */
const SELECTION = "selection"
const DIVIDED = "divided"
const VALUE = "value"
const SELECTED = "selected"

/** `<ui-color-chip>`'s colour attribute. */
const COLOR = "color"

/** A `toggle` button turned on, and off. */
const SELECTED_EVENT = "ui-selected"
const DESELECTED_EVENT = "ui-deselected"

/** A `selection` list's item was activated. */
const CHOSEN_EVENT = "ui-chosen"
