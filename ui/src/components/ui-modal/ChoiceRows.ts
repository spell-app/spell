import { E, UI, UIT } from "spell/ui/core"

import choiceRowsCSS from "./ChoiceRows.css?inline"

/****************
 * ### `ChoiceRows`
 * The rows of `UI.modals.choose()`'s dialog, and which of them are picked (epic `language` P66).
 * - Up to `BUTTON_ROWS` rows:  a `<ui-button>` each, in as many columns as fit (I165),
 *   each button's color chip and words at its start, so they line up down a column.
 * - More:  a `<ui-list selection>` of `<ui-item>`s that scrolls, with a `<ui-input>` search box above it,
 *   which hides the rows whose words don't hold what's typed.
 * - `shown`:  how many rows show before the rows scroll;  default every button, or `LIST_ROWS` of a list.
 * - One:  a row picks itself (`onPicked()`), and the dialog closes.
 * - Several:  each row turns on and off;  `onCountChanged()` says whether OK may pick them (`fits`).
 * - A row with a `color`:  a `<ui-color-chip>` before its words, read-only, so the row around it is what's picked;
 *   `ModalDialogs.choose()` imports the chip's family first.
 * - Plain DOM, built with `createElement` / `textContent`, as `ModalDialogs` is:  never `innerHTML` with caller text.
 * - Its look is a PAGE sheet, `ChoiceRows.css`, registered as the rows are first made:
 *   the rows are light DOM in the dialog, which no shadow sheet reaches.
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
    UI.styles.register(SHEET, choiceRowsCSS, { page: true })
    this.element = document.createElement("div")
    this.element.className = CHOICES_CLASS
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

  /**
   * A `<ui-button>` per row, in columns as wide as the longest row's words;  a `toggle` button each, for several.
   * - Across, then down:  the rows read in their order along each line of columns.
   */
  private drawButtons(rows: readonly E.ChoiceRow[], tagFor: TagFor, shown: number | undefined): void {
    const box = this.scroller(shown, rows.some((row) => row.color) ? CHIP_ROW_HEIGHT : BUTTON_ROW_HEIGHT)
    box.classList.add(BUTTONS_CLASS)
    box.style.setProperty(CHOICE_WIDTH, ChoiceRows.columnWidth(rows))
    rows.forEach((row, position) => {
      const button = this.document.createElement(tagFor(UIT.BUTTON))
      button.className = CHOICE_CLASS
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

  /** A `<ui-input>` search box, then a `<ui-list selection>` of the rows, `shown` of them tall. */
  private drawList(rows: readonly E.ChoiceRow[], tagFor: TagFor, shown: number): void {
    const search = this.document.createElement(tagFor(INPUT))
    search.setAttribute(TYPE, SEARCH_TYPE)
    search.setAttribute(ICON, SEARCH_ICON)
    search.toggleAttribute(FLUID, true)
    search.toggleAttribute("autofocus", true)
    search.setAttribute("aria-label", UI.i18n.t(SEARCH))
    search.setAttribute(PLACEHOLDER, UI.i18n.t(SEARCH))
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
    search.addEventListener(TYPED_EVENT, (event) => {
      const { value } = (event as CustomEvent<{ value: string }>).detail
      const typed = value.trim().toLocaleLowerCase()
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
    if (shown) {
      box.classList.add(SCROLLS_CLASS)
      box.style.maxHeight = `${shown * rowHeight}em`
    }
    return box
  }

  /**
   * The narrowest a column of buttons may be:  the longest row's words, the button's padding,
   * and a chip's room when a row has one.
   * - In `ch`, the width of a digit:  near enough an average letter's that a row's words fit on one line.
   */
  private static columnWidth(rows: readonly E.ChoiceRow[]): string {
    const longest = Math.max(...rows.map((row) => row.title.length))
    const chip = rows.some((row) => row.color) ? CHIP_ROOM : 0
    return `calc(${longest}ch + ${BUTTON_PADDING + chip}em)`
  }

  /** A row's words, and its color's chip before them. */
  private words({ title, color }: E.ChoiceRow, tagFor: TagFor): Node[] {
    const words = this.document.createTextNode(title)
    if (!color) return [words]
    const chip = this.document.createElement(tagFor(COLOR_CHIP))
    chip.setAttribute(COLOR, HUES.has(color) ? `var(--ui-${color})` : color)
    // the row's words say it:  the chip is only its picture
    chip.setAttribute("aria-hidden", "true")
    chip.className = CHIP_CLASS
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

/** A button's padding, both sides, and a chip with the gap after it, in ems:  `columnWidth()`. */
const BUTTON_PADDING = 3.5
const CHIP_ROOM = 2

/** The page sheet's name (`UI.styles`). */
const SHEET = "choice-rows"

/** `ChoiceRows.css`'s classes:  the rows box, the buttons' box, one that scrolls, a row, its chip. */
const CHOICES_CLASS = "ui-choices"
const BUTTONS_CLASS = "ui-choice-rows"
const SCROLLS_CLASS = "scrolls"
const CHOICE_CLASS = "ui-choice"
const CHIP_CLASS = "ui-choice-chip"

/** `ChoiceRows.css`'s narrowest column, set on the buttons' box. */
const CHOICE_WIDTH = "--_choice-width"

/** Spell UI's hue names:  a row's `color` that's one is its token, `var(--ui-red)`. */
const HUES = new Set<string>(UIT.ThemeHues)

/** `<ui-input>`'s attributes and values (canonical names) for the search box, and its event as letters are typed. */
const TYPE = "type"
const SEARCH_TYPE = "search"
const ICON = "icon"
const SEARCH_ICON = "search"
const PLACEHOLDER = "placeholder"
const TYPED_EVENT = "ui-typed"

/** Text key of the search box's placeholder and label. */
const SEARCH = "search"

/** Class nouns of the search box, the list, its items and the color chip. */
const INPUT = "input"
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
