import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { JSON_CHANGED } from "./JsonChild"
import { jsonVocabulary } from "./UIJson.en"

import jsonCSS from "./UIJson.css?inline"

/****************
 * ### `DOMJsonElement`
 * The DOM element of `<ui-json>`:  the source element's script API, plus `value`, `copy()` and `setQuotes()`.
 ****************/
export class DOMJsonElement extends E.DOMLoadableElement<UIJson> {
  /**
   * The data, parsed;  `undefined` while `source` loads, or when the text is empty or isn't JSON.
   * - Before the component exists:  its own text, parsed.
   */
  get value(): unknown {
    return this.component ? this.component.value : UIJson.parsedFrom(E.LoadableComponent.inlineTextOf(this)).value
  }

  /** Hold `value` instead, written as JSON into `content`:  `dirty` until saved;  sends `ui-changed`. */
  set value(value: unknown) {
    this.content = JSON.stringify(value, null, 2) ?? ""
  }

  /**
   * Copy the data to the clipboard, as JSON with 2-space indents;  true once it's there.
   * - NEVER throws
   */
  @E.untracked
  copy(): Promise<boolean> {
    return this.component?.copy() ?? Promise.resolve(false)
  }

  /** Quotes round keys or not:  the `quotes` attribute. */
  @E.untracked
  setQuotes(on: boolean) {
    this.component?.setQuotes(on)
  }
}

/****************
 * ### `<ui-json>`
 * The component behind `<ui-json>`:  JSON data held in a page, drawn as an indented outline whose objects and arrays
 * open and close (epic `elemental-spell` P31;  the outline from epic `from-console` P3).
 *
 * - Where it comes from is `LoadableComponent`'s:  `source` through `UI.sources`, else its own text.
 *   So `load`, `reload()`, `loaded`, `save()` and `ui-error` are the same as `<ui-code>`'s.
 * - What it adds:  `value`, the parsed data, and `ui-changed` when that changes.
 * - Text that isn't JSON:  `value` is `undefined`, one console warning, `ui-error` (`render`), `:state(error)`.
 * - An element that takes JSON reads a `<ui-json>` child through `JsonChild`;  that element's sheet hides it.
 *   `hidden` hides any other.
 *
 * The outline:
 * - Two spaces per level, monospace, coloured by the theme's code tokens (`--ui-code-attr`, `--ui-code-string` ...).
 * - A header (part `header`;  `no-header` hides it):  Copy, and a toggle for the quotes round keys (`quotes`).
 * - Each object and array has a toggle in the left gutter, one column for every row whatever its indent:
 *   a real `<button aria-expanded>` (part `toggle`) holding a chevron;  Alt-click opens or closes its branch.
 *   - Closed, it's one line:  `[ 1, 2, 3, ... ]`, `{ "a": 1, ... }`, cut to the characters that fit (`columns`).
 *   - `depth` levels start open (`1`:  the top alone).
 *   - A closed object's members aren't drawn:  387 of them cost one line until it's opened.
 * - A click on a key or value sends `ui-navigating` (`{ path, key, value, part }`;  cancelable):
 *   the page decides what it means.
 * - `editable`:  double-click a key or a value to edit it in a control that fits it (`editorKindFor()`).
 *   The data goes through `content`, so it's `dirty` until saved, and `ui-changed` is sent.
 ****************/
export class UIJson extends E.LoadableComponent<typeof jsonVocabulary> {
  @E.proto static vocabulary = jsonVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { json: jsonCSS },
    DOMElement: DOMJsonElement,
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The data
  ////////////////

  /**
   * The text, parsed.
   * - `@derived`:  parses JSON.
   */
  @E.derived
  get parsed(): ParsedJson {
    return UIJson.parsedFrom(this.textToShow)
  }

  /** The data;  `undefined` while `source` loads, or when the text is empty or isn't JSON. */
  get value(): unknown {
    return this.parsed.value
  }

  /** Did loading fail, or isn't its text JSON?  `:state(error)`. */
  @E.cssState("error")
  override get hasError(): boolean {
    return super.hasError || !!this.parsed.error
  }

  /**
   * As the base's, but text that isn't JSON says why, in the parser's words.
   * - Read from `parsed`, not the base's `loadError`:  the first load step clears that after the first parse.
   */
  override get errorText(): string | undefined {
    const { error } = this.parsed
    if (!error) return super.errorText
    return this.translationForKey("jsonInvalid", { message: error instanceof Error ? error.message : plainText(error) })
  }

  /** Has `onParsedChanged()` run once?  What's there when it first draws is no change. */
  private hasStarted = false

  /** The next new data is an edit made here:  what's open stays open. */
  private keepsToggles = false

  /** The data changed:  `ui-changed`, or the error when its text isn't JSON;  new data opens by `depth` again. */
  @E.onChange("parsed")
  protected onParsedChanged({ value, error }: ParsedJson) {
    const isFirst = !this.hasStarted
    this.hasStarted = true
    if (error) this.onLoadError(error, "render")
    else if (this.loadStatus === E.SourceStatus.error) this.loadStatus = E.SourceStatus.loaded
    if (isFirst) return
    if (this.keepsToggles) this.keepsToggles = false
    else this.toggled = new Map()
    this.domElement.dispatchEvent(new Event(JSON_CHANGED, { bubbles: true }))
    this.send("ui-changed", { value, content: this.content })
  }

  /** As `LoadableComponent`'s, and warns:  a `<ui-json>` is often unseen, a diagram's data or `hidden`. */
  protected override onLoadError(error: unknown, kind?: E.SourceErrorKind) {
    E.Warnings.warn(`<${this.domElement.localName}>`, `can't read its data`, error)
    super.onLoadError(error, kind)
  }

  /** Not the base's `ui-changed`, which says only the text:  `onParsedChanged()` says the data too. */
  protected override sendSourceEvent(name: E.SourceEventName, detail: object): boolean {
    return name === E.SourceEvent.change ? true : super.sendSourceEvent(name, detail)
  }

  ////////////////
  // ## Opening and closing
  ////////////////

  /** The open state of the objects and arrays a person toggled, by path;  the rest follow `depth`. */
  @E.state accessor toggled: ReadonlyMap<string, boolean> = new Map()

  /** How many levels start open. */
  get openDepth(): number {
    const depth = Number(this.depth ?? 1)
    return Number.isFinite(depth) ? depth : 1
  }

  /** Is the object or array at `path`, `level` deep, open? */
  isOpen(path: string, level: number): boolean {
    return this.toggled.get(path) ?? level < this.openDepth
  }

  /** Open or close the object or array at `path`;  `branch`:  everything inside it too. */
  @E.untracked
  toggle(path: string, value: unknown, level: number, branch = false) {
    const open = !this.isOpen(path, level)
    const toggled = new Map(this.toggled)
    toggled.set(path, open)
    if (branch) {
      const walk = (item: unknown, at: string) => {
        for (const [key, child] of entriesOf(item)) {
          if (!isContainer(child)) continue
          const childPath = at + SEP + key
          toggled.set(childPath, open)
          walk(child, childPath)
        }
      }
      walk(value, path)
    }
    this.toggled = toggled
  }

  ////////////////
  // ## Copy and quotes
  ////////////////

  /** Copy's job:  the JSON to the clipboard, then a check for a moment. */
  readonly clipboard = new E.ClipboardCopy()

  /**
   * Copy the data, as JSON with 2-space indents, to the clipboard;  `ui-copied`.
   * - Always real JSON, whatever `quotes` says.
   * - NEVER throws
   */
  @E.untracked
  async copy(): Promise<boolean> {
    const content = JSON.stringify(this.value, null, 2) ?? ""
    const isCopied = await this.clipboard.copy(content)
    if (isCopied) this.send("ui-copied", { content })
    return isCopied
  }

  /** Quotes round keys or not:  the `quotes` attribute (`quotes="no"` when off). */
  @E.untracked
  setQuotes(on: boolean) {
    if (on) this.domElement.removeAttribute("quotes")
    else this.domElement.setAttribute("quotes", "no")
  }

  ////////////////
  // ## Drawing
  ////////////////

  protected renderContent(): JSX.Element {
    return (
      <div class="ui json" part={this.partForName("viewer")} ref={(div: HTMLElement) => (this.box = div)}>
        <Show when={!this.noHeader && this.value !== undefined}>{this.header()}</Show>
        <span class="probe" aria-hidden="true">
          0000000000
        </span>
        <div class="body">{this.tree()}</div>
      </div>
    )
  }

  /** The outline's box, measured for `columns`. */
  private box: HTMLElement | undefined

  /** How many characters fit on a line;  `undefined` until measured. */
  @E.state accessor columns: number | undefined = undefined

  /** Keep `columns` in step with the element's width:  a closed line's preview is cut to it. */
  @E.whileConnected
  protected watchWidth() {
    if (typeof ResizeObserver === "undefined") return
    const measure = () => {
      const probe = this.box?.querySelector<HTMLElement>(".probe")
      if (!this.box || !probe) return
      const characterWidth = probe.getBoundingClientRect().width / 10
      const width = this.box.getBoundingClientRect().width
      if (!characterWidth || !width) return
      const columns = Math.floor(width / characterWidth)
      if (columns !== this.columns) this.columns = columns
    }
    const observer = new ResizeObserver(measure)
    E.afterSolidUpdate(() => {
      if (this.box) observer.observe(this.box)
      measure()
    })
    return () => observer.disconnect()
  }

  /** Copy and the quotes toggle. */
  private header(): JSX.Element {
    const copyLabel = () => this.translationForKey(this.clipboard.isCopied ? "jsonCopied" : "jsonCopy")
    return (
      <div class="header" part={this.partForName("header")}>
        <ui-button
          class="copy"
          appearance="basic"
          size="tiny"
          icon={this.clipboard.isCopied ? "check" : "clipboard"}
          aria-label={copyLabel()}
          title={copyLabel()}
          onClick={() => void this.copy()}
        />
        <ui-button
          class="quotes"
          appearance="basic"
          size="tiny"
          icon="quote-left"
          selected={!!this.quotes}
          aria-pressed={this.quotes ? "true" : "false"}
          aria-label={this.translationForKey("jsonQuotes")}
          title={this.translationForKey(this.quotes ? "jsonQuotesOff" : "jsonQuotesOn")}
          onClick={() => this.setQuotes(!this.quotes)}
        />
      </div>
    )
  }

  /** The whole outline, rebuilt only when the data changes. */
  private tree(): JSX.Element {
    const { value } = this.parsed
    if (value === undefined) {
      return this.isLoading || this.hasError ? undefined : (
        <div class="empty">{this.translationForKey("jsonEmpty")}</div>
      )
    }
    return this.entry(undefined, value, "", [], 0, true)
  }

  /** One value:  a line;  an object or array, its line, then (open) its members and its closing line. */
  private entry(key: Key, value: unknown, path: string, at: Path, level: number, isLast: boolean): JSX.Element {
    const comma = isLast ? undefined : <span class="punct">,</span>
    if (!isContainer(value)) {
      return (
        <div class="row" part={this.partForName("row")} style={`--level: ${level}`}>
          {this.keyOf(key, value, path, at)}
          {this.scalar(value, key, path, at)}
          {comma}
        </div>
      )
    }
    const isArray = Array.isArray(value)
    const entries = entriesOf(value)
    if (!entries.length) {
      return (
        <div class="row" part={this.partForName("row")} style={`--level: ${level}`}>
          {this.keyOf(key, value, path, at)}
          {this.link(<span class="punct">{isArray ? "[]" : "{}"}</span>, "value", key, value, at)}
          {comma}
        </div>
      )
    }
    const open = () => this.isOpen(path, level)
    const name = key === undefined ? this.translationForKey("jsonTop") : String(key)
    const toggleLabel = () => this.translationForKey(open() ? "jsonClose" : "jsonOpen", { key: name })
    const lastKey = entries[entries.length - 1]![0]
    return (
      <>
        <div class="row container" part={this.partForName("row")} style={`--level: ${level}`}>
          <button
            type="button"
            class={{ toggle: true, open: open() }}
            part={this.partForName("toggle")}
            aria-expanded={open() ? "true" : "false"}
            aria-label={toggleLabel()}
            title={`${toggleLabel()}  (${this.translationForKey("jsonAllInside")})`}
            onClick={(event: MouseEvent) => this.toggle(path, value, level, event.altKey)}
          >
            <ui-icon name={open() ? "chevron-down" : "chevron-right"} />
          </button>
          {this.keyOf(key, value, path, at)}
          <Show when={open()} fallback={this.closed(value, comma, level, key)}>
            <span class="punct">{isArray ? "[" : "{"}</span>
          </Show>
        </div>
        <Show when={open()}>
          <For each={entries}>
            {([childKey, child]) => {
              const memberKey = isArray ? Number(childKey) : childKey
              return this.entry(
                memberKey,
                child,
                path + SEP + childKey,
                [...at, memberKey],
                level + 1,
                childKey === lastKey
              )
            }}
          </For>
          <div class="row" part={this.partForName("row")} style={`--level: ${level}`}>
            <span class="punct">{isArray ? "]" : "}"}</span>
            {comma}
          </div>
        </Show>
      </>
    )
  }

  /** A closed object or array, on one line:  `{ "a": 1, ... }`. */
  private closed(value: object, comma: JSX.Element, level: number, key: Key): JSX.Element {
    // what's left of the line:  the gutter (3), the indent, `"key": `, the comma
    const used = 3 + level * 2 + (typeof key === "string" ? JSON.stringify(key).length + 2 : 0) + 1
    const budget = this.columns === undefined ? PREVIEW_CHARS : Math.max(PREVIEW_MIN, this.columns - used)
    const tokens = previewTokens(value, budget, !!this.quotes)
    return (
      <>
        <span class="preview" part={this.partForName("preview")}>
          {tokens.map(([kind, text]) => (
            <span class={kind}>{text}</span>
          ))}
        </span>
        {comma}
      </>
    )
  }

  /** `"key": `, for an object's member;  nothing for an array's or the top's. */
  private keyOf(key: Key, value: unknown, path: string, at: Path): JSX.Element {
    if (typeof key !== "string") return undefined
    const shown = this.link(<span class="key">{keyText(key, !!this.quotes)}</span>, "key", key, value, at)
    return (
      <>
        {this.editableAs(shown, { id: path + EDIT_SEP + "key", part: "key", at, kind: "text", value: key })}
        <span class="punct">: </span>
      </>
    )
  }

  /** A scalar:  `"text"`, `12`, `true`, `null`. */
  private scalar(value: unknown, key: Key, path: string, at: Path): JSX.Element {
    const shown = this.link(<span class={scalarKind(value)}>{scalarText(value)}</span>, "value", key, value, at)
    const edit = (): JsonEdit => ({
      id: path + EDIT_SEP + "value",
      part: "value",
      at,
      kind: this.editorKindFor(key, value),
      value
    })
    return this.editableAs(shown, edit)
  }

  /** `shown` as a link:  a click sends `ui-navigating`. */
  private link(shown: JSX.Element, part: JsonPart, key: Key, value: unknown, at: Path): HTMLElement {
    const span = shown as HTMLElement
    span.classList.add("link")
    span.addEventListener("click", (event) => this.navigate(event, { path: at, key, value, part }))
    return span
  }

  ////////////////
  // ## Editing
  ////////////////

  /** The key or value being edited:  its path, `EDIT_SEP`, `key` or `value`. */
  @E.state accessor editing: string | undefined = undefined

  /**
   * The control `editable` shows for a value:  what `editors` names for its key, else what its type picks.
   * - a string:  `text`;  an ISO date or date and time:  `date` / `datetime`
   * - a number:  `number`;  `true` / `false`:  `boolean`;  `null`:  `json`
   */
  editorKindFor(key: Key, value: unknown): JsonEditorKind {
    const named = typeof key === "string" ? this.editorsByKey[key] : undefined
    if (Array.isArray(named)) return named.map(String)
    if (typeof named === "string" && (JSON_EDITOR_KINDS as readonly string[]).includes(named)) {
      return named as JsonEditorKind
    }
    if (typeof value === "number") return "number"
    if (typeof value === "boolean") return "boolean"
    if (typeof value !== "string") return "json"
    if (ISO_DATE.test(value)) return "date"
    if (ISO_DATE_TIME.test(value)) return "datetime"
    return "text"
  }

  /** `editors`, the property, as an object;  `{}` without one. */
  private get editorsByKey(): Readonly<Record<string, unknown>> {
    const editors: unknown = this.editors
    return isContainer(editors) && !Array.isArray(editors) ? (editors as Record<string, unknown>) : {}
  }

  /** `span`, which an `editable` outline swaps for a control on a double-click. */
  private editableAs(span: HTMLElement, _edit: JsonEdit | (() => JsonEdit)): JSX.Element {
    const edit = typeof _edit === "function" ? _edit : () => _edit
    span.addEventListener("dblclick", (event) => {
      if (!this.editable) return
      event.preventDefault()
      this.pendingNavigate?.cancel()
      window.getSelection()?.removeAllRanges()
      void loadEditors().catch((error: unknown) =>
        E.Warnings.warn(`<${this.domElement.localName}>`, "can't load its editors", error)
      )
      this.editing = edit().id
    })
    return (
      <Show when={this.editing === edit().id} fallback={span}>
        {this.editor(edit())}
      </Show>
    )
  }

  /** The control for `edit`:  a Spell UI input that fits the value. */
  private editor(edit: JsonEdit): JSX.Element {
    const label = this.translationForKey(edit.part === "key" ? "jsonEditKey" : "jsonEditValue")
    const part = this.partForName("editor")
    const ref = (host: HTMLElement) => this.watchEditor(host, edit)
    const { kind } = edit
    if (Array.isArray(kind)) {
      const options = kind.map((choice) => ({ value: choice, text: choice }))
      return (
        <ui-select
          class="edit"
          part={part}
          size="mini"
          aria-label={label}
          options={options}
          value={plainText(edit.value)}
          ref={ref}
        />
      )
    }
    if (kind === "boolean") {
      return <ui-checkbox class="edit" part={part} aria-label={label} selected={edit.value === true} ref={ref} />
    }
    const shown = shownForEditing(edit)
    return (
      <ui-input
        class="edit"
        part={part}
        size="mini"
        aria-label={label}
        type={INPUT_TYPES[kind]}
        step={kind === "number" ? "any" : kind === "datetime" ? "1" : undefined}
        value={shown}
        spellcheck={false}
        style={`--edit-chars: ${Math.max(4, shown.length + 1)}`}
        ref={ref}
      />
    )
  }

  /**
   * Follow an editor:  Enter or leaving it keeps the edit, Escape drops it;  a checkbox or a pick list keeps a change
   * at once (`ui-changed`, which a translated tag sends under its own name:  the editors are always `ui-*` tags).  Focuses it once its family has drawn it.
   */
  private watchEditor(host: EditorHost, edit: JsonEdit) {
    const keep = () => this.commitEdit(edit, valueFromEditor(host, edit))
    host.addEventListener("keydown", (event) => {
      if (event.key === "Enter") keep()
      else if (event.key === "Escape") this.editing = undefined
      else return
      event.preventDefault()
      event.stopPropagation()
    })
    host.addEventListener("focusout", (event) => {
      const next = event.relatedTarget as Node | null
      if (next && (next === host || host.contains(next))) return
      keep()
    })
    // a controlled change is sent before the element takes it:  its detail holds the new value
    const keepChosen = (event: Event) => {
      const { selected, value } = (event as CustomEvent<{ selected?: boolean; value?: unknown }>).detail
      this.commitEdit(edit, edit.kind === "boolean" ? !!selected : plainText(value))
    }
    if (Array.isArray(edit.kind) || edit.kind === "boolean") host.addEventListener("ui-changed", keepChosen)
    // once drawn, and its value shown:  focus it, its text selected to type over
    E.afterSolidUpdate(() => {
      void Promise.resolve(host.ready).then(() =>
        E.beforeNextPaint(() => {
          host.focus()
          host.shadowRoot?.querySelector<HTMLInputElement>("input:not([type=checkbox])")?.select()
        })
      )
    })
  }

  /** Keep an edit:  a key renamed, or a value replaced;  `NO_CHANGE` just ends it. */
  @E.untracked
  private commitEdit(edit: JsonEdit, next: unknown) {
    if (this.editing !== edit.id) return
    this.editing = undefined
    if (next === NO_CHANGE) return
    const current = this.value
    const { at } = edit
    let changed: unknown
    if (edit.part === "value") {
      if (Object.is(next, valueAt(current, at))) return
      changed = setAt(current, at, next)
    } else {
      const oldKey = at[at.length - 1] as string
      const newKey = String(next)
      const parent = valueAt(current, at.slice(0, -1)) as Record<string, unknown>
      if (!newKey || newKey === oldKey || Object.hasOwn(parent, newKey)) return
      changed = renameAt(current, at, newKey)
      // what was open under the old key stays open under the new one
      const from = pathOf(at)
      const to = pathOf([...at.slice(0, -1), newKey])
      const toggled = new Map<string, boolean>()
      for (const [path, open] of this.toggled) {
        toggled.set(path === from || path.startsWith(from + SEP) ? to + path.slice(from.length) : path, open)
      }
      this.toggled = toggled
    }
    this.keepsToggles = true
    this.content = JSON.stringify(changed, null, 2) ?? ""
  }

  ////////////////
  // ## Navigating
  ////////////////

  /** A click waiting to see if it's the start of a double-click (`editable`). */
  private pendingNavigate: E.CancelablePromise<unknown> | undefined

  /**
   * A key or value was clicked:  `ui-navigating`, unless it's part of a double-click, an edit or a selection.
   * - `editable`:  it waits a moment, so a double-click's first click sends nothing.
   */
  @E.untracked
  private navigate(event: MouseEvent, detail: JsonNavigateDetail) {
    if (event.detail > 1 || this.editing) return
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed && selection.toString()) return
    this.pendingNavigate?.cancel()
    if (!this.editable) {
      this.send("ui-navigating", detail)
      return
    }
    this.pendingNavigate = E.after(DOUBLE_CLICK_SECONDS, () => this.send("ui-navigating", detail))
    this.pendingNavigate.catch(() => {})
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * `text` as data:  its `value`, or its `error` when it isn't JSON;  neither for empty text.
   * - NEVER throws.
   */
  static parsedFrom(text: string): ParsedJson {
    if (!text.trim()) return {}
    try {
      return { value: JSON.parse(text) }
    } catch (error) {
      return { error }
    }
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIJson extends E.AttributeValues<typeof jsonVocabulary> {}

/** A `<ui-json>`'s text, parsed. */
export type ParsedJson = {
  /** The data. */
  value?: unknown
  /** Why the text isn't JSON:  `JSON.parse()`'s `SyntaxError`. */
  error?: unknown
}

/** `ui-navigating`'s detail:  the member clicked, by its path from the top (`[]`:  the top value itself). */
export type JsonNavigateDetail = {
  /** the keys from the top value down to the member */
  path: Path
  /** its key (an array member's:  its index);  the top value's:  `undefined` */
  key: Key
  /** its value, as it is (an object or array too, when its key was clicked) */
  value: unknown
  /** what was clicked */
  part: JsonPart
}

/** The controls `editable` shows:  `editors` names one per key (`UIJson.editorKindFor()`). */
export const JSON_EDITOR_KINDS = ["text", "number", "date", "datetime", "boolean", "json"] as const

/** A control `editable` shows:  one of `JSON_EDITOR_KINDS`, or a pick list of these choices. */
export type JsonEditorKind = (typeof JSON_EDITOR_KINDS)[number] | string[]

/** A key's or value's place in the data. */
type Key = string | number | undefined
type Path = (string | number)[]
type JsonPart = "key" | "value"

/** A piece of a closed preview:  its class (`key`, `string` ...) and text. */
type Token = readonly [string, string]

/** A key or value being edited. */
type JsonEdit = {
  /** its path's string, `EDIT_SEP`, its part */
  id: string
  part: JsonPart
  at: Path
  kind: JsonEditorKind
  /** the key, or the value, before the edit */
  value: unknown
}

/** An editor's element:  a `<ui-input>`, `<ui-select>` or `<ui-checkbox>`. */
type EditorHost = HTMLElement & { value?: unknown; selected?: boolean; ready?: Promise<void> }

/** How many characters a closed object or array shows at least;  and before it's measured. */
const PREVIEW_MIN = 24
const PREVIEW_CHARS = 90
/** How long a string runs in a closed object or array before it's cut. */
const PREVIEW_STRING = 32
/** Joins a path's keys:  no JSON key holds it in practice, and a collision only shares an open state. */
const SEP = "\u0001"
/** Joins a path and its part in an edit's id. */
const EDIT_SEP = "\u0002"
/** How long a click on an `editable` outline waits for a second one, in seconds. */
const DOUBLE_CLICK_SECONDS = 0.3
/** An edit that changes nothing. */
const NO_CHANGE = Symbol("no change")
/** An ISO date, `2026-11-18`. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
/** An ISO date and time, `2026-11-18T10:00`, with seconds, fractions and a zone if it likes. */
const ISO_DATE_TIME = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/
/** The `<ui-input>` type for each kind of text editor. */
const INPUT_TYPES = {
  text: "text",
  number: "number",
  date: "date",
  datetime: "datetime-local",
  boolean: "text",
  json: "text"
} as const satisfies Record<Exclude<JsonEditorKind, string[]>, string>

/** The editors' families, loaded the first time something is edited:  most outlines are only read. */
function loadEditors(): Promise<unknown> {
  return Promise.all([
    import("spell/ui/components/ui-input"),
    import("spell/ui/components/ui-select"),
    import("spell/ui/components/ui-checkbox")
  ])
}

/** What an editor starts with. */
function shownForEditing({ part, kind, value }: JsonEdit): string {
  if (kind === "datetime") return ISO_DATE_TIME.exec(plainText(value))?.[1] ?? ""
  if (kind === "json" && part === "value") return scalarText(value)
  return plainText(value)
}

/** What an editor holds now, as the new key or value;  `NO_CHANGE` for nothing usable. */
function valueFromEditor(host: EditorHost, { part, kind, value }: JsonEdit): unknown {
  if (kind === "boolean") return !!host.selected
  const text = plainText(host.value)
  if (part === "key") return text.trim() || NO_CHANGE
  if (Array.isArray(kind) || kind === "text") return text
  if (kind === "json") return readLoose(text)
  if (!text) return NO_CHANGE
  if (kind === "number") return Number.isFinite(Number(text)) ? Number(text) : NO_CHANGE
  if (kind === "datetime") {
    // keep the old value's form:  seconds, and its zone
    const [, wall = "", , zone = ""] = ISO_DATE_TIME.exec(plainText(value)) ?? []
    const hasSeconds = wall.length > 16
    const next = hasSeconds && text.length === 16 ? text + ":00" : hasSeconds ? text.slice(0, 19) : text.slice(0, 16)
    return next + zone
  }
  return text
}

/** A key or scalar as plain text:  a string as it is, `""` for nothing, anything else as JSON. */
function plainText(value: unknown): string {
  if (typeof value === "string") return value
  if (value === null || value === undefined) return ""
  return JSON.stringify(value) ?? ""
}

function isContainer(value: unknown): value is object {
  return typeof value === "object" && value !== null
}

/** An object's or array's members, as `[key, value]`;  anything else has none. */
function entriesOf(value: unknown): [string, unknown][] {
  if (!isContainer(value)) return []
  if (Array.isArray(value)) return value.map((item, index) => [String(index), item])
  return Object.entries(value)
}

/** A scalar's class:  `string`, `number`, `boolean`, `null`. */
function scalarKind(value: unknown): string {
  if (typeof value === "string") return "string"
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  return "null"
}

function scalarText(value: unknown): string {
  return value === undefined ? "null" : (JSON.stringify(value) ?? "")
}

/** A key as shown:  `"type"`;  without quotes, `type` (JSON5:  a key that isn't a name keeps them). */
function keyText(key: string, quotes: boolean): string {
  return quotes || !/^[A-Za-z_$][\w$]*$/.test(key) ? JSON.stringify(key) : key
}

/** A path's string, as `toggled` keys it. */
function pathOf(at: Path): string {
  return at.map((key) => SEP + key).join("")
}

/** Text typed into a `json` editor:  JSON if it reads as JSON, else the text itself. */
function readLoose(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function valueAt(value: unknown, at: Path): unknown {
  let item = value
  for (const key of at) item = isContainer(item) ? (item as Record<string | number, unknown>)[key] : undefined
  return item
}

/** `value` with the member at `at` replaced:  copies along the path, the rest shared. */
function setAt(value: unknown, at: Path, next: unknown): unknown {
  if (!at.length) return next
  const [key, ...rest] = at
  const child = setAt((value as Record<string | number, unknown>)[key!], rest, next)
  if (Array.isArray(value)) return value.map((item, index) => (index === key ? child : item))
  return { ...(value as object), [key!]: child }
}

/** `value` with the key at `at` renamed, in its place. */
function renameAt(value: unknown, at: Path, newKey: string): unknown {
  const parentPath = at.slice(0, -1)
  const oldKey = at[at.length - 1]
  const parent = valueAt(value, parentPath) as Record<string, unknown>
  const renamed = Object.fromEntries(Object.entries(parent).map(([key, item]) => [key === oldKey ? newKey : key, item]))
  return setAt(value, parentPath, renamed)
}

/**
 * A closed object or array as tokens:  `[ 1, 2, 3, ... ]`, `{ "a": 1, "b": { "c": 2 }, ... }`.
 * - Nested values closed too, two levels down;  past that `{ ... }` / `[ ... ]`.
 * - Cut once it's about `budget` long;  the first member stays however long, and the CSS ellipsis cuts it.
 */
function previewTokens(value: object, budget: number, quotes: boolean): Token[] {
  const tokens: Token[] = []
  // `...` and the closing bracket must fit too
  let left = budget - 4
  const push = (kind: string, text: string) => {
    tokens.push([kind, text])
    left -= text.length
  }
  const walk = (item: object, nest: number) => {
    const isArray = Array.isArray(item)
    const entries = entriesOf(item)
    const [open, close] = isArray ? ["[", "]"] : ["{", "}"]
    if (!entries.length) return push("punct", open + close)
    if (nest >= 2) return push("punct", `${open} ... ${close}`)
    push("punct", open + " ")
    for (let index = 0; index < entries.length; index++) {
      // a member that runs past the line is taken back, `...` in its place
      const mark = tokens.length
      const leftAtMark = left
      if (index) push("punct", ", ")
      const [key, child] = entries[index]!
      if (!isArray) {
        push("key", keyText(key, quotes))
        push("punct", ": ")
      }
      if (isContainer(child)) walk(child, nest + 1)
      else {
        let text = scalarText(child)
        if (typeof child === "string" && text.length > PREVIEW_STRING) text = text.slice(0, PREVIEW_STRING - 2) + '…"'
        push(scalarKind(child), text)
      }
      if (left < 0 && index) {
        tokens.length = mark
        left = leftAtMark
        return push("punct", `, ... ${close}`)
      }
    }
    push("punct", " " + close)
  }
  walk(value, 0)
  return tokens
}
