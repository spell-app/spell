import { after, type CancelablePromise } from "spell/util/timing"
import type { SP } from "spell/parser/spell"
import { BuiltInSounds, SOUND_KINDS, type SoundKind } from "spell/ui/sounds"
import type { LSP } from "spell/app/lsp"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"

import "./ValuePopups.css"

/****************
 * ### `ValuePopups`
 * An attribute's value chosen rather than typed, in a popup by the caret, for every code editor:
 * The code editor's (`CodeMirrorValues`) is only wiring onto this.
 * - The choices strip (epic `editor` T70):  an attribute's words, shown quietly under its value once the caret
 *   has rested in it for a second (`REST_DELAY`), the value ticked:  `spacing="x|s"` shows `none  xs  s  m  l  xl`.
 *   - Owen:  "would be cool if there was a way to invoke the menu of options for this attribute when cursor is here
 *     ... It can't get in the way of typing.  Also, can wait 1s before showing, so it doesn't flicker too much."
 *   - Typing, moving the caret, a scroll, the editor losing the keys or its suggestion list showing hides it:
 *     each editor calls `restart()` or `hide()` as they happen.
 *   - It never takes the keys:  they go on to the code.  To step in:
 *     - ⌥↓ shows it at once if it isn't yet, and moves the keys into it (`stepIn()`):  ←/→ (or ↑/↓) between words,
 *       Enter to choose, Esc or Tab back to the code
 *     - a click on a word chooses it
 *   - Only for an attribute that lists its words, and not more than `MOST_WORDS` of them.
 * - The picker (epic `editor` T61, `pick()`):  the color palette for `color="|"`, the icon picker for `icon="|"`,
 *   the sound picker for `play "|"` (epic `mockup` P28:  hear each of Spell's built-in sounds, then pick one).
 *   - Owen, on I55:  "Is it possible to show a custom menu here?  e.g. for `color`, we could show the color pallete,
 *     `icon` could show the icon picker".
 *   - Opened by the words list's first row, "Pick a color…" (`LSP.PICK_VALUE_COMMAND`):  the list opens there anyway,
 *     so a picker opening by itself would fight it for the keys.
 *   - Which attribute takes which picker is Spell UI's to say (`SP.ComponentValuePicker`), in the file's language:
 *     no tag is named here.
 *   - Esc, a click outside, an edit, or the caret scrolled out of view closes it, changing nothing;
 *     a letter typed goes on into the code.
 *   - ONE at a time, across every editor;  the choices strip doesn't show while it's up.
 * - Choosing either way writes the word between the quotes as ONE undo step, the caret after the closing quote:
 *   the editor's to do (`CaretValue.write()`).
 * - Both are in the page's `<body>`, placed by the value inside the window:  so no pane clips them.
 * - Its position in the import graph:  plain DOM, the app's texts, the built-in sounds' names (`spell/ui/sounds`),
 *   and types of the parser and the language service;
 *   it knows no editor:  what it needs of one is a `ValuePopupHost`.
 *   Where a value is on its line is the language service's (`LSP.SpellTyping.quotedValueAt()`), which each host asks.
 ****************/
export class ValuePopups {
  constructor(private readonly host: ValuePopupHost) {}

  /** The strip of words, while it shows. */
  private strip: HTMLElement | undefined
  /** The value the strip is for. */
  private value: CaretValue | undefined
  /** The wait before the strip shows. */
  private rest: CancelablePromise<void> | undefined
  /** Counts each `hide()`:  words that come back after one are dropped. */
  private turn = 0

  ////////////////
  // ## The choices strip
  ////////////////

  /** Hide the strip, and wait again for the caret to rest in a value:  the caret moved, or the code changed. */
  restart(): void {
    this.hide()
    if (this.host.valueAt("closing-quote")) this.rest = after(REST_DELAY, () => void this.show())
  }

  /** Hide the strip, and stop waiting to show it. */
  hide(): void {
    this.turn++
    this.rest?.cancel()
    this.rest = undefined
    this.strip?.remove()
    this.strip = undefined
    this.value = undefined
  }

  /** The editor lost the keys:  hide the strip, unless they went into it (⌥↓). */
  blurred(): void {
    queueMicrotask(() => this.isFocused || this.hide())
  }

  /** Hide the strip, and close the picker if it's this editor's:  the editor is going. */
  dispose(): void {
    this.hide()
    if (PickerPopup.current?.host === this.host) PickerPopup.current.close()
  }

  /** Is the strip showing? */
  get isShowing(): boolean {
    return !!this.strip
  }

  /** Are the keys in the strip, by ⌥↓? */
  get isFocused(): boolean {
    return !!this.strip?.contains(document.activeElement)
  }

  /**
   * ⌥↓ in the code:  show the strip now if it isn't, and move the keys into it, on the value's word.
   * - Returns whether it did, so the editor knows the key was taken;  a promise when the words come back later.
   */
  stepIn(): boolean | Promise<boolean> {
    if (this.strip) return this.focusWord()
    if (!this.host.valueAt("closing-quote")) return false
    const shown = this.show()
    return shown instanceof Promise ? shown.then((isShown) => isShown && this.focusWord()) : shown && this.focusWord()
  }

  /**
   * Show the words of the value the caret is in, under it.
   * - Returns whether it showed:  not when the editor says it can't now (a selection, several carets,
   *   its suggestion list up ...), the picker is up, or the value's attribute lists no words.
   * - NEVER throws:  words that fail to come are logged, and nothing shows.
   */
  private show(): boolean | Promise<boolean> {
    const { host } = this
    if (!host.valueAt("closing-quote") || !host.canShowChoices() || PickerPopup.current) return false
    const turn = this.turn
    const draw = (values: readonly string[] | undefined) => turn === this.turn && this.draw(values)
    try {
      const words = host.wordsAt()
      if (!(words instanceof Promise)) return draw(words)
      return words.then(draw, (error: unknown) => {
        console.error("ValuePopups:  the words didn't come", error)
        return false
      })
    } catch (error) {
      console.error("ValuePopups:  the words didn't come", error)
      return false
    }
  }

  /** Draw the strip of `values`, the value's word ticked;  `false` when there's nothing to show. */
  private draw(values: readonly string[] | undefined): boolean {
    const value = this.host.valueAt("closing-quote")
    if (!value || !values?.length || values.length > MOST_WORDS) return false
    this.hide()
    const node = document.createElement("div")
    node.className = "ValueChoices"
    node.setAttribute("role", "listbox")
    node.setAttribute("aria-orientation", "horizontal")
    for (const each of values) {
      const word = document.createElement("button")
      word.type = "button"
      word.className = "ValueChoicesWord"
      word.tabIndex = -1
      word.textContent = each
      word.setAttribute("role", "option")
      word.setAttribute("aria-selected", String(each === value.text))
      // a click chooses, the keys staying with the code
      word.addEventListener("mousedown", (event) => event.preventDefault())
      word.addEventListener("click", () => this.choose(each))
      node.append(word)
    }
    node.addEventListener("keydown", (event) => this.listKeyDown(event))
    document.body.append(node)
    this.strip = node
    this.value = value
    if (placeNear(node, value.boxOf("start"))) return true
    this.hide()
    return false
  }

  /** The keys while the strip has them:  arrows between words, Enter chooses, Esc or Tab goes back to the code. */
  private listKeyDown(event: KeyboardEvent): void {
    const words = this.words
    const at = words.indexOf(document.activeElement as HTMLButtonElement)
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key]
    if (step) words[Math.max(0, Math.min(words.length - 1, at + step))]?.focus()
    else if (event.key === "Enter" && at >= 0) this.choose(words[at]!.textContent ?? "")
    else if (event.key === "Escape" || event.key === "Tab") {
      this.hide()
      this.host.focus()
    } else return
    event.preventDefault()
    event.stopPropagation()
  }

  /** Move the keys onto the ticked word, else the first;  always `true`, for `stepIn()`. */
  private focusWord(): boolean {
    const words = this.words
    ;(words.find((word) => word.getAttribute("aria-selected") === "true") ?? words[0])?.focus()
    return true
  }

  /** The strip's words. */
  private get words(): HTMLButtonElement[] {
    return [...(this.strip?.querySelectorAll<HTMLButtonElement>(".ValueChoicesWord") ?? [])]
  }

  /** Write `word` between the quotes, the editor's way (one undo, the caret after the closing quote). */
  private choose(word: string): void {
    const { value } = this
    this.hide()
    value?.write(word)
    // the caret moved:  it's left, not resting in the value again
    this.hide()
  }

  ////////////////
  // ## The picker
  ////////////////

  /**
   * Open the picker `picker` says at `host`'s caret, for the quoted value it's in (its closing quote not typed yet
   * is fine:  the value runs to the caret).
   * - `values`:  the attribute's words, as the file's language writes them (a palette's, each `picker.colors`' colour).
   * - Closes any picker already up, in any editor.
   * - NEVER throws:  no quoted value at the caret, nothing opens.
   */
  static pick(host: ValuePopupHost, picker: SP.ComponentValuePicker, values: readonly string[]): void {
    PickerPopup.current?.close()
    const value = host.valueAt("closing-quote-or-caret")
    if (value) PickerPopup.current = new PickerPopup(host, value, picker, values)
  }
}

/** What a code editor gives `ValuePopups`:  the value at its caret, its words, and its keys. */
export type ValuePopupHost = {
  /** the quoted value the caret is in, if any (`LSP.SpellTyping.quotedValueAt()` on the caret's line) */
  valueAt(end: LSP.QuotedValueEnd): CaretValue | undefined
  /** the words the value at the caret takes, as the suggestion list's are (`attributeValuesAt()`) */
  wordsAt(): Promise<readonly string[] | undefined> | readonly string[] | undefined
  /**
   * can the strip show now?
   * - the editor has the keys, one caret and nothing selected, it isn't read-only, and its suggestion list isn't up
   */
  canShowChoices(): boolean
  /** give the keys back to the code */
  focus(): void
  /** type `letter` into the code at the caret, as the keyboard would:  with the editor's typing helps */
  type(letter: string): void
  /** call `listener` on each edit and scroll till the function it returns is called:  the picker follows them */
  follow(listener: (change: "edit" | "scroll") => void): () => void
}

/** A quoted value at an editor's caret, as `ValuePopupHost.valueAt()` finds it. */
export type CaretValue = {
  /** its text between the quotes now */
  text: string
  /**
   * on screen now, the box of its first character (`start`) or of the caret (`caret`), in the window's px
   * - `undefined` once it's scrolled out of the editor's view
   */
  boxOf(at: "start" | "caret"): ScreenBox | undefined
  /** write `word` over its text:  ONE undo step, the caret after the closing quote, the keys back in the code */
  write(word: string): void
}

/** A box on screen, in the window's px:  a character's, or the caret's. */
export type ScreenBox = {
  /** its left edge */
  left: number
  /** its top */
  top: number
  /** its bottom */
  bottom: number
}

/****************
 * ### `PickerPopup`
 * `ValuePopups.pick()`'s popup, opened at once:
 * - the palette of colour chips
 * - Spell UI's `<ui-icon-picker>`
 * - or the sound picker:  the built-in sounds by kind, each with a ▶ to hear it, its name to pick it
 * - Placed just under the caret, or just over it where the window has no room below.
 * - ONE at a time, across every editor:  `current`.
 ****************/
class PickerPopup {
  /** The one showing, if any. */
  static current: PickerPopup | undefined

  /** The popup, in `<body>`. */
  private readonly node = document.createElement("div")
  /** What closes it:  the listeners it added. */
  private readonly cleanups: (() => void)[] = []

  constructor(
    /** the editor it's for */
    readonly host: ValuePopupHost,
    /** the quoted value a pick replaces */
    private readonly value: CaretValue,
    picker: SP.ComponentValuePicker,
    values: readonly string[]
  ) {
    this.node.className = `ValuePicker ValuePicker-${picker.kind}`
    document.body.append(this.node)
    if (picker.kind === "color") this.drawPalette(values, picker.colors)
    else if (picker.kind === "sound") this.drawSoundPicker(values)
    else this.drawIconPicker()
    // drawn first:  its size says whether it fits below the caret
    this.place()
    this.listen()
  }

  /** Each colour a round chip with its word, in a grid;  the value's chip focused, else the first. */
  private drawPalette(values: readonly string[], colors: readonly string[]): void {
    const current = this.value.text
    const chips = values.map((value, index) => {
      const chip = document.createElement("button")
      chip.type = "button"
      chip.className = "ValuePickerChip"
      chip.title = value
      chip.toggleAttribute("aria-pressed", value === current)
      const swatch = document.createElement("span")
      swatch.className = "ValuePickerSwatch"
      swatch.style.background = colors[index] ?? "transparent"
      const word = document.createElement("span")
      word.textContent = value
      chip.append(swatch, word)
      chip.addEventListener("click", () => this.pick(value))
      return chip
    })
    this.node.setAttribute("role", "listbox")
    this.node.append(...chips)
    ;(chips.find((chip) => chip.hasAttribute("aria-pressed")) ?? chips[0])?.focus()
  }

  /** Spell UI's icon picker, its panel open and searching;  its own keys (arrows, Enter, Esc) work as ever. */
  private drawIconPicker(): void {
    const iconPicker = document.createElement("ui-icon-picker") as HTMLElement & {
      value: string
      ready: Promise<void>
      component?: { open(query?: string): boolean }
    }
    iconPicker.value = this.value.text
    iconPicker.setAttribute("aria-label", "icon")
    iconPicker.addEventListener("ui-changed", (event) => {
      const { value } = (event as CustomEvent<{ value?: string }>).detail
      if (value) this.pick(value)
    })
    // its panel closing (Esc, a click outside) closes us:  after a pick, `pick()` already has
    iconPicker.addEventListener("ui-closing", () => queueMicrotask(() => this.close()))
    this.node.append(iconPicker)
    void iconPicker.ready
      .then(() => iconPicker.component?.open())
      .catch((error: unknown) => console.error("ValuePopups:  the icon picker didn't open", error))
  }

  /**
   * The built-in sounds, grouped by kind, in the order Spell UI lists them:  each a ▶ that plays it, and its name,
   * which picks it;  the value's name focused, else the first.
   * - `names`:  each sound's name as the file's language writes it (`card slide`, `deslizar carta`).
   * - The ↑ and ↓ keys move between the names (`moveFocus()`);  Space or Enter on a ▶ plays, on a name picks.
   * - Played through the page's Spell UI (`UI.sounds`), whose sound files sit beside its own code:
   *   this module's copy of `BuiltInSounds` may be bundled anywhere (`<spell-editor>`).
   */
  private drawSoundPicker(names: readonly string[]): void {
    this.columns = 1
    this.node.setAttribute("aria-label", appTexts.text("soundPicker"))
    const hint = document.createElement("p")
    hint.className = "ValuePickerHint"
    hint.textContent = appTexts.text("soundPickerHint")
    const list = document.createElement("div")
    list.className = "ValuePickerSounds"
    const current = BuiltInSounds.find(this.value.text)
    let focus: HTMLElement | undefined
    for (const kind of SOUND_KINDS) {
      const kindNames = names.filter((name) => BuiltInSounds.find(name)?.kind === kind)
      if (!kindNames.length) continue
      const heading = document.createElement("h4")
      heading.textContent = appTexts.text(SOUND_KIND_TEXTS[kind])
      list.append(heading)
      for (const name of kindNames) {
        const row = document.createElement("div")
        row.className = "ValuePickerSound"
        const listen = document.createElement("button")
        listen.type = "button"
        listen.className = "ValuePickerListen"
        listen.textContent = "▶"
        listen.title = appTexts.text("soundListen", { sound: name })
        listen.setAttribute("aria-label", listen.title)
        listen.addEventListener("click", () => this.hear(name))
        const chip = document.createElement("button")
        chip.type = "button"
        chip.className = "ValuePickerChip"
        chip.textContent = name
        const isCurrent = !!current && BuiltInSounds.find(name) === current
        chip.toggleAttribute("aria-pressed", isCurrent)
        chip.addEventListener("click", () => this.pick(name))
        row.append(listen, chip)
        list.append(row)
        if (isCurrent) focus = chip
        else focus ??= chip
      }
    }
    this.node.append(hint, list)
    focus?.focus()
    focus?.scrollIntoView({ block: "nearest" })
  }

  /** The sound playing in the sound picker, if any:  one at a time, stopped when it closes. */
  private hearing: HTMLAudioElement | undefined

  /**
   * Play the built-in sound `name` from its start, stopping the one before.
   * - NEVER throws:  a page without Spell UI's runtime, or a sound the browser refuses, plays nothing.
   */
  private hear(name: string): void {
    this.hearing?.pause()
    const runtime = (globalThis as Record<symbol, { sounds?: { url(name: string): string | undefined } } | undefined>)[
      UI_RUNTIME_KEY
    ]
    const address = runtime?.sounds?.url(name)
    if (!address) return
    this.hearing = new Audio(address)
    this.hearing.play().catch((error: unknown) => console.warn(`ValuePopups:  can't play ${name}`, error))
  }

  /** By the caret, inside the window;  `false` once the caret is scrolled out of the editor's view. */
  private place(): boolean {
    return placeNear(this.node, this.value.boxOf("caret"))
  }

  /** Write `word` between the quotes, the editor's way;  then close. */
  private pick(word: string): void {
    this.close()
    this.value.write(word)
  }

  /** Close it, writing nothing. */
  close(): void {
    if (PickerPopup.current === this) PickerPopup.current = undefined
    this.hearing?.pause()
    for (const cleanup of this.cleanups.splice(0)) cleanup()
    this.node.remove()
  }

  /** Esc, a click outside, an edit or the caret scrolled out of view closes it;  a letter typed goes on into the code. */
  private listen(): void {
    const { host } = this
    const onKey = (event: KeyboardEvent) => {
      if (!this.node.contains(event.target as Node) || this.node.querySelector("ui-icon-picker")) return
      if (event.key === "Escape") {
        event.preventDefault()
        this.close()
        host.focus()
      } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && event.key !== " ") {
        event.preventDefault()
        this.close()
        host.type(event.key)
      } else if (event.key.startsWith("Arrow")) {
        event.preventDefault()
        this.moveFocus(event.key)
      }
    }
    const onDown = (event: PointerEvent) => {
      if (event.composedPath().includes(this.node)) return
      // the icon picker's panel is in the top layer, outside us:  it closes us itself
      if (event.composedPath().some((at) => at instanceof Element && at.localName === "ui-icon-picker")) return
      this.close()
    }
    document.addEventListener("keydown", onKey, true)
    document.addEventListener("pointerdown", onDown, true)
    // a scroll moves it with the caret (the icon picker's search box, focused, scrolls the editor);  out of view, it goes
    const stopFollowing = host.follow((change) => (change === "edit" ? this.close() : this.place() || this.close()))
    this.cleanups.push(
      () => document.removeEventListener("keydown", onKey, true),
      () => document.removeEventListener("pointerdown", onDown, true),
      stopFollowing
    )
  }

  /** Chips to a row:  the palette's grid, or the sound picker's one name a row. */
  private columns = PALETTE_COLUMNS

  /** The arrow keys move between the chips, by row and column:  the palette's colours, the sound picker's names. */
  private moveFocus(key: string): void {
    const chips = [...this.node.querySelectorAll<HTMLElement>(".ValuePickerChip")]
    const at = chips.indexOf(document.activeElement as HTMLElement)
    const { columns } = this
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[key] ?? 0
    const next = chips[Math.max(0, Math.min(chips.length - 1, at + step))]
    next?.focus()
    next?.scrollIntoView({ block: "nearest" })
  }
}

////////////////
// ## Types and helpers
////////////////

/** How long the caret rests in a value, nothing typed, before its words show, in seconds:  Owen's "can wait 1s". */
const REST_DELAY = 1

/** The most words the strip shows:  a longer list (icons ...) is the suggestion list's, Ctrl+Space. */
const MOST_WORDS = 40

/** Between a popup and the value's line, and the window's edges, in px. */
const GAP = 4

/** The palette's chips to a row:  `ValuePopups.css`'s grid. */
const PALETTE_COLUMNS = 3

/** Each kind of built-in sound's heading in the sound picker, by its text's key. */
const SOUND_KIND_TEXTS: Record<SoundKind, AppTextKey> = {
  interface: "soundKindInterface",
  cards: "soundKindCards",
  casino: "soundKindCasino",
  pieces: "soundKindPieces",
  impacts: "soundKindImpacts",
  footsteps: "soundKindFootsteps",
  things: "soundKindThings",
  digital: "soundKindDigital",
  jingles: "soundKindJingles"
}

/** Spell UI's `RUNTIME_KEY`, where the page's runtime is (`UI.sounds`):  a copy, as this file never loads Spell UI. */
const UI_RUNTIME_KEY = Symbol.for("spell-ui:runtime")

/**
 * Place `node` just under `box`, or just over it where the window has no room below;  kept inside the window.
 * - `false`, and not moved, when there's no box:  what it's by is scrolled out of view.
 */
function placeNear(node: HTMLElement, box: ScreenBox | undefined): boolean {
  if (!box) return false
  const height = node.offsetHeight
  const below = box.bottom + GAP
  const above = box.top - GAP - height
  node.style.left = `${Math.max(GAP, Math.min(box.left, innerWidth - node.offsetWidth - GAP))}px`
  node.style.top = `${below + height > innerHeight - GAP && above > GAP ? above : below}px`
  return true
}
