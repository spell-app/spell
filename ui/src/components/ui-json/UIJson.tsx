import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { JSON_CHANGED } from "./JsonChild"
import { jsonVocabulary } from "./UIJson.en"

import jsonCSS from "./UIJson.css?inline"

/****************
 * ### `DOMJsonElement`
 * The DOM element of `<ui-json>`:  the source element's script API, plus `value`.
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
}

/****************
 * ### `<ui-json>`
 * The component behind `<ui-json>`:  JSON data held in a page, drawing nothing (epic `elemental-spell` P31).
 *
 * - Where it comes from is `LoadableComponent`'s:  `source` through `UI.sources`, else its own text.
 *   So `load`, `reload()`, `loaded`, `save()` and `ui-error` are the same as `<ui-code>`'s.
 * - What it adds:  `value`, the parsed data, and `ui-changed` when that changes.
 * - Text that isn't JSON:  `value` is `undefined`, one console warning, `ui-error` (`render`), `:state(error)`.
 *   As it draws nothing, a failed load warns too:  nothing else would show it.
 * - An element that takes JSON reads a `<ui-json>` child through `JsonChild`.
 ****************/
export class UIJson extends E.LoadableComponent<typeof jsonVocabulary> {
  @E.proto static vocabulary = jsonVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { json: jsonCSS },
    DOMElement: DOMJsonElement,
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

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

  /** Has `onParsedChanged()` run once?  What's there when it first draws is no change. */
  private hasStarted = false

  /** The data changed:  `ui-changed`, or the error when its text isn't JSON. */
  @E.onChange("parsed")
  protected onParsedChanged({ value, error }: ParsedJson) {
    const isFirst = !this.hasStarted
    this.hasStarted = true
    if (error) this.onLoadError(error, "render")
    else if (this.loadStatus === E.SourceStatus.error) this.loadStatus = E.SourceStatus.loaded
    if (isFirst) return
    this.domElement.dispatchEvent(new Event(JSON_CHANGED, { bubbles: true }))
    this.send("ui-changed", { value, content: this.content })
  }

  /** As `LoadableComponent`'s, and warns:  it draws nothing, so no message would show it. */
  protected override onLoadError(error: unknown, kind?: E.SourceErrorKind) {
    E.Warnings.warn(`<${this.domElement.localName}>`, `can't read its data`, error)
    super.onLoadError(error, kind)
  }

  /** Not the base's `ui-changed`, which says only the text:  `onParsedChanged()` says the data too. */
  protected override sendSourceEvent(name: E.SourceEventName, detail: object): boolean {
    return name === E.SourceEvent.change ? true : super.sendSourceEvent(name, detail)
  }

  override render(): JSX.Element {
    return null
  }

  protected renderContent(): JSX.Element {
    return null
  }

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
