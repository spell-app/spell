import {
  SearchQuery,
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  openSearchPanel,
  replaceAll,
  replaceNext,
  search,
  searchPanelOpen,
  setSearchQuery
} from "@codemirror/search"
import { EditorSelection, EditorState, type Extension } from "@codemirror/state"
import { EditorView, type KeyBinding, type Panel, type ViewUpdate, runScopeHandlers } from "@codemirror/view"

import { editorPrefs } from "spell/app/app/editorPrefs"

/****************
 * ### `CodeMirrorFind`
 * The find and replace bar every CodeMirror editor shows on ⌘F, drawn like VS Code's find widget (epic `codemirror` I8).
 * - One row to find:  the field, with its three switches inside it on the right (match case `Aa`, whole word `ab`,
 *   regular expression `.*`), the match count ("3 of 12", "No results"), previous / next, close.
 * - A second row to replace, showing when it opens:  the field, Replace and Replace All (Owen, I8 C1).
 *   - The chevron at its left folds it away;  folded, it stays folded, in every editor and after a reload,
 *     until the chevron or ⌥⌘F shows it again (`REPLACE_PREF`, the editor's preferences).
 *   - Not in an editor that only shows code (the compiled pane):  nothing there can be replaced.
 * - A card floating over the code's top right corner, as VS Code's:  the code doesn't move down when it opens.
 * - The keys, as VS Code's:
 *   - Enter next, ⇧Enter previous;  in the replace field, Enter replaces one, ⌘Enter all of them
 *   - ⌥⌘C, ⌥⌘W, ⌥⌘R switch match case, whole word, regular expression, in the bar or in the code while it shows
 *   - ⌥⌘F opens it with the replace row showing
 *   - Esc closes it, the caret back in the code
 * - Typing in the field moves to the first match from where the caret was, as VS Code does.
 * - It's CodeMirror's own search underneath (`search()`'s `createPanel`):  the query, the matches marked in the code,
 *   and the commands (`findNext`, `replaceAll` ...) are all CodeMirror's;  this is only the bar.
 * - Its words are CodeMirror's phrases, so they follow the app's language with the rest (`CodeMirrorSetup`).
 * - Plain DOM, no Solid and no Spell UI elements:  CodeMirror owns the panel's element and its focus,
 *   and `<spell-editor>` has it too, on pages with no app.
 *   Spell UI's look comes in through its tokens (`codemirror.css`).
 * - Its position in the import graph:  CodeMirror, and the editor's preferences (`editorPrefs`, `spell/util` only).
 ****************/
export class CodeMirrorFind implements Panel {
  /** The find bar, CodeMirror's search with it as the panel, and its keys:  for `CodeMirrorSetup`. */
  static extension(): Extension {
    return search({ top: true, createPanel: (view) => new CodeMirrorFind(view) })
  }

  /**
   * The bar's keys, in the code and in the bar:  ⌥⌘F to open it with the replace row, and the three switches.
   * - The switches do nothing while the bar's closed, so the keys stay free for anything else then.
   */
  static keys(): KeyBinding[] {
    return [
      { key: "Mod-Alt-f", run: (view) => CodeMirrorFind.openToReplace(view), preventDefault: true },
      ...TOGGLE_KEYS.map(({ key, option }) => ({
        key,
        run: (view: EditorView) => CodeMirrorFind.toggle(view, option),
        scope: "editor search-panel"
      }))
    ]
  }

  /**
   * Open the bar in `view` with its replace row showing, the replace field in focus if there's a word to find.
   * - SIDE EFFECT:  unfolds the replace row for every editor from now on, as the chevron would.
   */
  static openToReplace(view: EditorView): boolean {
    if (view.state.readOnly) return openSearchPanel(view)
    editorPrefs.set(REPLACE_PREF, true)
    openSearchPanel(view)
    const bar = BARS.get(view)
    bar?.showReplace(true)
    if (bar?.searchField.value) bar.replaceField.focus()
    return true
  }

  /** Switch `option` of the search in `view`, as the bar's button does:  only while the bar shows. */
  static toggle(view: EditorView, option: ToggleOption): boolean {
    if (!searchPanelOpen(view.state)) return false
    const query = getSearchQuery(view.state)
    view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ ...queryOptions(query), [option]: !query[option] })) })
    return true
  }

  /** The bar's element, which CodeMirror puts over the code. */
  readonly dom: HTMLElement
  /** CodeMirror shows it at the editor's top. */
  readonly top = true

  /** The query the bar shows:  CodeMirror's, as of the last change either side made. */
  private query: SearchQuery
  /** Where each match starts and ends, in order, for the count:  at most `MOST_COUNTED`. */
  private matches: { from: number; to: number }[] = []
  /** Where the caret was before typing in the find field:  where typing looks for the first match from. */
  private searchFrom: number

  private readonly searchField: HTMLInputElement
  private readonly replaceField: HTMLInputElement
  private readonly count: HTMLElement
  private readonly toggles: Record<ToggleOption, HTMLButtonElement>
  private readonly expander: HTMLButtonElement | undefined
  private readonly replaceRow: HTMLElement | undefined
  /** Every element whose words are phrases, with how to word it:  for a change of language. */
  private readonly worded: (() => void)[] = []

  private constructor(readonly view: EditorView) {
    this.query = getSearchQuery(view.state)
    this.searchFrom = view.state.selection.main.from
    const canReplace = !view.state.readOnly

    this.searchField = this.field("Find", { "main-field": "true" })
    this.searchField.addEventListener("input", () => {
      this.commit()
      this.selectFirstMatch()
    })
    this.replaceField = this.field("Replace")
    this.replaceField.addEventListener("input", () => this.commit())

    this.toggles = {
      caseSensitive: this.toggleButton("caseSensitive", "Aa", "Match Case ($)"),
      wholeWord: this.toggleButton("wholeWord", "ab", "Match Whole Word ($)"),
      regexp: this.toggleButton("regexp", ".*", "Use Regular Expression ($)")
    }
    this.count = element("span", { class: "count", "aria-live": "polite" })

    const findRow = element("div", { class: "row" }, [
      element("div", { class: "field" }, [this.searchField, ...Object.values(this.toggles)]),
      this.count,
      this.iconButton("previous", "Previous Match ($)", "⇧Enter", () => findPrevious(view)),
      this.iconButton("next", "Next Match ($)", "Enter", () => findNext(view)),
      this.iconButton("close", "Close ($)", "Escape", () => closeSearchPanel(view))
    ])

    if (canReplace) {
      this.expander = this.iconButton("chevron", "Toggle Replace", undefined, () => {
        this.showReplace(!this.showsReplace)
        ;(this.showsReplace ? this.replaceField : this.searchField).focus()
      })
      this.expander.classList.add("expander")
      this.replaceRow = element("div", { class: "row replace" }, [
        element("div", { class: "field" }, [this.replaceField]),
        this.iconButton("replace", "Replace ($)", "Enter", () => replaceNext(view)),
        this.iconButton("replaceAll", "Replace All ($)", `${MOD}Enter`, () => replaceAll(view))
      ])
    }

    this.dom = element("div", { class: "CodeMirrorFind", role: "search" }, [
      ...(this.expander ? [this.expander] : []),
      element("div", { class: "rows" }, [findRow, ...(this.replaceRow ? [this.replaceRow] : [])])
    ])
    this.dom.addEventListener("keydown", (event) => this.keydown(event))
    this.showReplace(canReplace && editorPrefs.get(REPLACE_PREF) === true)
    this.showQuery()
    BARS.set(view, this)
  }

  /** CodeMirror put the bar on the page:  the find field in focus, its text selected. */
  mount(): void {
    this.searchField.select()
  }

  /** Keep the bar in step with the editor:  a query set elsewhere, a new text or caret, another language. */
  update(update: ViewUpdate): void {
    let isNewQuery = false
    for (const transaction of update.transactions) {
      for (const effect of transaction.effects) {
        if (effect.is(setSearchQuery) && !effect.value.eq(this.query)) {
          this.query = effect.value
          isNewQuery = true
        }
      }
    }
    if (isNewQuery) this.showQuery()
    else if (update.docChanged) this.countMatches()
    else if (update.selectionSet) this.showCount()
    if (update.startState.facet(EditorState.phrases) !== update.state.facet(EditorState.phrases)) {
      for (const word of this.worded) word()
      this.showCount()
    }
    // the caret moved in the code, not by typing in the field:  typing next looks from there
    if (update.selectionSet && !this.dom.contains(update.view.root.activeElement)) {
      this.searchFrom = update.state.selection.main.from
    }
  }

  /** The bar's gone. */
  destroy(): void {
    if (BARS.get(this.view) === this) BARS.delete(this.view)
  }

  ////////////////
  // ## The query
  ////////////////

  /** Send the fields' query to CodeMirror, if it changed. */
  private commit(): void {
    const query = new SearchQuery({
      ...queryOptions(this.query),
      search: this.searchField.value,
      replace: this.replaceField.value
    })
    if (query.eq(this.query)) return
    this.query = query
    this.view.dispatch({ effects: setSearchQuery.of(query) })
    this.countMatches()
  }

  /** Show `this.query` in the fields and switches, and count its matches. */
  private showQuery(): void {
    const { query } = this
    if (this.searchField.value !== query.search) this.searchField.value = query.search
    if (this.replaceField.value !== query.replace) this.replaceField.value = query.replace
    for (const option of TOGGLE_OPTIONS) this.toggles[option].setAttribute("aria-pressed", String(query[option]))
    this.countMatches()
  }

  /** Select the first match from where the caret was, as the find field's typed in:  the code scrolled to it. */
  private selectFirstMatch(): void {
    const first = this.matches.find((match) => match.from >= this.searchFrom) ?? this.matches[0]
    if (!first) return
    this.view.dispatch({
      selection: EditorSelection.single(first.from, first.to),
      effects: EditorView.scrollIntoView(first.from, { y: "center" }),
      userEvent: "select.search"
    })
  }

  ////////////////
  // ## The count
  ////////////////

  /** Find every match of the query, up to `MOST_COUNTED`, then show the count. */
  private countMatches(): void {
    this.matches = []
    if (this.query.valid) {
      const cursor = this.query.getCursor(this.view.state)
      for (let next = cursor.next(); !next.done && this.matches.length < MOST_COUNTED; next = cursor.next()) {
        this.matches.push(next.value)
      }
    }
    this.showCount()
  }

  /**
   * "3 of 12" when the selection's a match, "? of 12" when it's not, "No results", or nothing with nothing to find.
   * - More than `MOST_COUNTED`:  "? of 1000+", as VS Code does past its own limit.
   */
  private showCount(): void {
    const { state } = this.view
    const { from, to } = state.selection.main
    const total = this.matches.length
    const isNothing = this.query.search === ""
    const isNone = !isNothing && total === 0
    const current = this.matches.findIndex((match) => match.from === from && match.to === to)
    const totalText = total >= MOST_COUNTED ? `${MOST_COUNTED}+` : String(total)
    this.count.textContent = isNothing
      ? ""
      : isNone
        ? state.phrase("No results")
        : state.phrase("$1 of $2", current < 0 ? "?" : String(current + 1), totalText)
    this.dom.classList.toggle("none", isNone)
  }

  ////////////////
  // ## The replace row
  ////////////////

  /** Whether the replace row shows. */
  private get showsReplace(): boolean {
    return this.replaceRow?.hidden === false
  }

  /**
   * Show or hide the replace row.
   * - SIDE EFFECT:  remembered in the editor's preferences, so every bar opens as the person left this one.
   */
  private showReplace(shows: boolean): void {
    if (!this.replaceRow || !this.expander) return
    editorPrefs.set(REPLACE_PREF, shows)
    this.replaceRow.hidden = !shows
    this.expander.setAttribute("aria-expanded", String(shows))
    this.dom.classList.toggle("replacing", shows)
  }

  ////////////////
  // ## Keys
  ////////////////

  /** A key in the bar:  CodeMirror's own for the bar (Esc, ⌘G ...) and ours first, then Enter in a field. */
  private keydown(event: KeyboardEvent): void {
    if (runScopeHandlers(this.view, event, "search-panel")) {
      event.preventDefault()
      return
    }
    if (event.key !== "Enter") return
    if (event.target === this.searchField) {
      event.preventDefault()
      void (event.shiftKey ? findPrevious : findNext)(this.view)
    } else if (event.target === this.replaceField) {
      event.preventDefault()
      void (event.metaKey || event.ctrlKey ? replaceAll : replaceNext)(this.view)
    }
  }

  ////////////////
  // ## Its parts
  ////////////////

  /** A text field, its placeholder and label the phrase `phrase`. */
  private field(phrase: string, attributes: Record<string, string> = {}): HTMLInputElement {
    const field = element("input", { type: "text", spellcheck: "false", autocomplete: "off", ...attributes })
    this.word(() => {
      const words = this.view.state.phrase(phrase)
      field.placeholder = words
      field.setAttribute("aria-label", words)
    })
    return field
  }

  /**
   * One of the three switches inside the find field, showing `glyph`, its tooltip `phrase` with its key.
   * - A press keeps the focus where it was, as VS Code's:  you go on typing in the field.
   */
  private toggleButton(option: ToggleOption, glyph: string, phrase: string): HTMLButtonElement {
    const keys = TOGGLE_KEYS.find((toggle) => toggle.option === option)!.label
    const button = this.button(phrase, keys, () => CodeMirrorFind.toggle(this.view, option))
    button.classList.add("toggle", option)
    button.textContent = glyph
    return button
  }

  /** A button showing the icon `icon`, its tooltip `phrase` with `keys`, if any, pressed by `run`. */
  private iconButton(icon: IconName, phrase: string, keys: string | undefined, run: () => void): HTMLButtonElement {
    const button = this.button(phrase, keys, run)
    button.classList.add("icon", icon)
    button.append(iconOf(icon))
    return button
  }

  /** A button, its tooltip and label the phrase `phrase` (`$` its `keys`), pressed by `run`. */
  private button(phrase: string, keys: string | undefined, run: () => void): HTMLButtonElement {
    const button = element("button", { type: "button" })
    // keeps the focus in the field, or the code:  a button press isn't a reason to leave either
    button.addEventListener("mousedown", (event) => event.preventDefault())
    button.addEventListener("click", () => run())
    this.word(() => {
      const words = keys === undefined ? this.view.state.phrase(phrase) : this.view.state.phrase(phrase, keys)
      button.title = words
      button.setAttribute("aria-label", words)
    })
    return button
  }

  /** Word something now, and again when the language changes. */
  private word(wording: () => void): void {
    wording()
    this.worded.push(wording)
  }
}

/** The switches, by their `SearchQuery` option. */
export type ToggleOption = "caseSensitive" | "wholeWord" | "regexp"

/** The switches, in the field's order. */
const TOGGLE_OPTIONS: readonly ToggleOption[] = ["caseSensitive", "wholeWord", "regexp"]

/**
 * ⌘ on a Mac, Ctrl elsewhere, for a tooltip.
 * - Its own small test, not `CodeEditorFeatures.IS_MAC`:  that file brings the language service, which this one mustn't.
 */
const IS_MAC = typeof navigator !== "undefined" && /mac/i.test(navigator.platform || navigator.userAgent)
const MOD = IS_MAC ? "⌘" : "Ctrl+"
const ALT = IS_MAC ? "⌥" : "Alt+"

/** Each switch's key, as VS Code's:  ⌥⌘C, ⌥⌘W, ⌥⌘R;  and how its tooltip writes it. */
const TOGGLE_KEYS: readonly { key: string; option: ToggleOption; label: string }[] = [
  { key: "Mod-Alt-c", option: "caseSensitive", label: `${ALT}${MOD}C` },
  { key: "Mod-Alt-w", option: "wholeWord", label: `${ALT}${MOD}W` },
  { key: "Mod-Alt-r", option: "regexp", label: `${ALT}${MOD}R` }
]

/** The most matches counted:  past it, the count says "1000+". */
const MOST_COUNTED = 1000

/** Each editor's bar, while it shows:  for ⌥⌘F, which opens it, then shows its replace row. */
const BARS = new WeakMap<EditorView, CodeMirrorFind>()

/**
 * The preference that says whether a bar opens with its replace row showing:  shown unless the person folded it.
 * - `spellEditor:findShowsReplace` in the browser's storage;  `<spell-editor>` on other pages keeps its own there.
 */
const REPLACE_PREF = "findShowsReplace"
editorPrefs.declare(REPLACE_PREF, { type: "choice", default: true })

/** Everything of `query` but its words:  its switches, and how it reads the words. */
function queryOptions(query: SearchQuery) {
  const { search, replace, caseSensitive, wholeWord, regexp, literal } = query
  return { search, replace, caseSensitive, wholeWord, regexp, literal }
}

/** A new `tag` element with `attributes` and `children`. */
function element<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  attributes: Record<string, string> = {},
  children: Node[] = []
): HTMLElementTagNameMap[Tag] {
  const made = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes)) made.setAttribute(name, value)
  made.append(...children)
  return made
}

////////////////
// ## Icons
////////////////

/** The bar's icons, by name. */
type IconName = keyof typeof ICON_PATHS

/**
 * Each icon's lines, on a 16px square, drawn with the text's colour:  as VS Code's, simpler.
 * - The replace icons:  a line of text turning down into the arrow;  Replace All has two lines.
 */
const ICON_PATHS = {
  chevron: ["M6 3.5 10.5 8 6 12.5"],
  previous: ["M8 13V3", "M3.5 7.5 8 3l4.5 4.5"],
  next: ["M8 3v10", "M3.5 8.5 8 13l4.5-4.5"],
  close: ["M4 4l8 8", "M12 4l-8 8"],
  replace: ["M2.5 4.5h6a3 3 0 0 1 3 3v5", "M9 10l2.5 2.5L14 10", "M2.5 12h4"],
  replaceAll: ["M2.5 4.5h6a3 3 0 0 1 3 3v5", "M9 10l2.5 2.5L14 10", "M2.5 8.5h4", "M2.5 12h4"]
} as const

/** The SVG namespace, which an SVG element must be made in. */
const SVG = "http://www.w3.org/2000/svg"

/** Icon `name`, a 16px SVG. */
function iconOf(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg")
  for (const [attribute, value] of Object.entries(ICON_ATTRIBUTES)) svg.setAttribute(attribute, value)
  for (const line of ICON_PATHS[name]) {
    const path = document.createElementNS(SVG, "path")
    path.setAttribute("d", line)
    svg.append(path)
  }
  return svg
}

/** Every icon's SVG attributes:  16px, lines in the text's colour. */
const ICON_ATTRIBUTES: Record<string, string> = {
  viewBox: "0 0 16 16",
  width: "16",
  height: "16",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "1.5",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true"
}
