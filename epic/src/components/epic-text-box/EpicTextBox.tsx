import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"

import {
  AnswerForm,
  NOTES_KEY,
  SEED_EMPTIED,
  type AnswerPart,
  type KeptText,
  type PageAnswer,
  type PartLabels,
  type SentAnswer
} from "spell/epic/answers"

import { epicTextBoxVocabulary } from "./EpicTextBox.en"

import textBoxCSS from "./EpicTextBox.css?inline"

/****************
 * ### `DOMTextBoxElement`
 * The DOM element of `<epic-text-box>`:  its script API, `value`, as a `<textarea>`'s.
 * - The elements that draw a box in their shadow roots read and set it so:
 *   `<epic-ask>` (Other), `<epic-choices-bar>` (the feedback).
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMTextBoxElement extends E.DOMElement<EpicTextBox> {
  /**
   * A value set before its component was built:  the component starts with it.
   * - Declared, never initialized:  an element made before its family loads never runs a field initializer
   *   (`DOMElement`, "Defined early").
   */
  declare startValue?: string

  /** What's typed in it. */
  get value(): string {
    return this.component?.text ?? this.startValue ?? ""
  }

  /**
   * Its native `<textarea>`, once drawn:  its `<ui-textarea>`'s, two shadow roots down;  `undefined` before.
   * - for what needs the field itself:  its cursor, its focus, a picture's words put in (`Pictures.putInto()`)
   */
  get textarea(): HTMLTextAreaElement | undefined {
    return this.shadowRoot?.querySelector(`.${FIELD}`)?.shadowRoot?.querySelector("textarea") ?? undefined
  }

  /** Put `value` in it (a sent answer coming back):  no `input` event, as a `<textarea>`'s `value`. */
  set value(value: string) {
    if (this.component) this.component.text = value
    else this.startValue = value
  }
}

/****************
 * ### `EpicTextBox`
 * The component behind `<epic-text-box>`:  a box Owen types in, on a page he answers on (epic `epic-workflow` P12).
 * - A `<ui-textarea grow>` (epic `ui-gaps` P14), one line to start, growing with its text to a third of the window
 *   (Owen, 2026-10-06:  every "tell me more" field grows);  `max-height` sets another cap.
 *   - its look is this box's own, through its `control` part (`EpicTextBox.css`)
 *   - `<ui-root>` loads its family, as every Spell UI tag's
 * - What's typed is part of the page's answer, by `type`:
 *   - `notes`:  the page's notes;  `comment`:  the comment on what `for` names (a section, an option `q1-B`);
 *     `other`:  question `for`'s Other
 *   - those three register with the page's `AnswerForm` while connected:  gathered for Send, and shown again from
 *     the answer sent (`gatherInto()`, `showAnswer()`)
 *   - on a GUIDE (any docs page with the comments' own Send, no `<epic-send>`), a `comment` box is a comment on its
 *     section instead, kind `note`, which the page's Send hands to the guide's epic (the docs runtime's
 *     `drawNoteBoxes()`, epic `epic-engine` T101);  its `AnswerForm` there sends nothing
 *   - `feedback`:  a choice page's, which its `<epic-choices-bar>` reads itself (`value`);  `note`:  likewise, the
 *     element drawing it reads it (`<epic-option-form>`'s, `<epic-new-item>`'s)
 * - Its `input` events are the native `<textarea>`'s own:  they bubble out of both shadow roots, so the element that
 *   draws it hears them (`onInput`).
 * - A SEED (epic `ast-markup`):  the text it starts with, Claude's suggestion, written as its child
 *   `<script type="text/plain">` (`seed`), so markup needs no escaping.
 *   - the seed is the baseline:  the box's answer is what's typed only once it differs, so a box left as seeded
 *     sends nothing (`epic ask answer` says it was kept), and an emptied one sends `SEED_EMPTIED`
 *   - a button under it puts the seed back (`reset`), while what's in it differs
 * - `code`:  monospace, no wrapping (it scrolls sideways), Tab indents (`onKeyDown`).
 * - The NOTES box also draws, above its field, what the page KEPT (epic `epic-workflow` P18):  text Owen typed for
 *   a question, option or section an agent's rewrite took off the page (`AnswerForm.kept`), "Kept from before the
 *   page changed", each with its old title and a × to drop it.  It's sent with the rest.
 ****************/
export class EpicTextBox extends E.UIComponent<typeof epicTextBoxVocabulary> implements AnswerPart {
  @E.proto static vocabulary = epicTextBoxVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-text-box": textBoxCSS },
    DOMElement: DOMTextBoxElement
  } satisfies Partial<E.ElementSetup>

  /**
   * Its SEED, the text it starts with (Claude's suggestion):  its own `<script type="text/plain">` (or `<template>`),
   * dedented, as `<ui-code>` reads its own;  `undefined` without one.
   * - follows the page:  a rewrite patched in place changes it
   */
  @E.watches({ childList: true, characterData: true, subtree: true })
  get seed(): string | undefined {
    return hasSeed(this.domElement) ? E.LoadableComponent.inlineTextOf(this.domElement) : undefined
  }

  /** What's typed in it;  to start with, a `value` set before it was built, else its seed. */
  @E.state accessor text = (this.domElement as DOMTextBoxElement).startValue ?? this.seed ?? ""

  /** Something is typed. */
  @E.cssState("filled")
  get isFilled(): boolean {
    return !!this.text.trim()
  }

  /** A seeded box whose text is no longer its seed. */
  @E.cssState("edited")
  get isEdited(): boolean {
    return this.seed !== undefined && this.said !== undefined
  }

  /**
   * What it says for the answer:  what's typed, trimmed (a `code` box keeps its first line's indent);
   * `undefined` for nothing to send.
   * - a seeded box:  nothing while it still holds its seed, `SEED_EMPTIED` once emptied
   */
  get said(): string | undefined {
    const text = this.code ? this.text.replace(/^\s*\n/, "").trimEnd() : this.text.trim()
    const seed = this.seed
    if (seed === undefined) return text || undefined
    if (text === (this.code ? seed.trimEnd() : seed.trim())) return undefined
    return text || SEED_EMPTIED
  }

  /** The text a part of an answer puts back:  sent text as it is, the seed for none, nothing for `SEED_EMPTIED`. */
  private shownFor(sent: string | undefined): string {
    if (sent === SEED_EMPTIED) return ""
    return sent ?? this.seed ?? ""
  }

  /**
   * The seed changed under it:  a box still holding the old one (or nothing) takes the new.
   * - a rewrite patched in place;  and a box built before its children were in (a page's router drawing it)
   */
  @E.onChange("seed")
  protected onSeedChanged(seed: string | undefined) {
    if (seed !== this.lastSeed && this.text === (this.lastSeed ?? "")) this.text = seed ?? ""
    this.lastSeed = seed
  }

  /** The seed as last seen, for `onSeedChanged()`. */
  private lastSeed = this.seed

  /** Put the seed back (the reset button):  a change like any typed one, so the draft follows. */
  private readonly resetToSeed = () => {
    this.text = this.seed ?? ""
    this.form?.edited()
    this.field?.focus()
  }

  /** Its placeholder:  its own, else its type's. */
  get hint(): string {
    return this.placeholder ?? this.translationForKey(this.type ?? "comment")
  }

  /** What the page kept, from the page's form:  a notes box draws it. */
  @E.state accessor kept: readonly KeptText[] = []

  /** The page's form, while it's registered there (a `notes`, `comment` or `other` box). */
  private form: AnswerForm | undefined

  /**
   * While connected, a `notes`, `comment` or `other` box is part of the page's answer;  a notes box follows what the
   * page kept;  returns the undo.
   */
  @E.whileConnected
  protected joinForm() {
    const type = this.type ?? "comment"
    if (type === "feedback" || type === "note") return undefined
    const form = AnswerForm.forPage()
    this.form = form
    const leave = form.add(this)
    const follow = type === "notes" ? this.followKept(form) : undefined
    return () => {
      follow?.()
      leave()
      this.form = undefined
    }
  }

  /** `kept` as `form` has it, now and on every change;  returns the undo. */
  private followKept(form: AnswerForm): () => void {
    this.kept = form.kept
    return form.subscribe(() => {
      if (this.kept !== form.kept) this.kept = form.kept
    })
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <Show when={this.kept.length}>{this.keptBox()}</Show>
        <ui-textarea
          ref={(element: HTMLElement) => this.holdField(element as DOMFieldElement)}
          class={FIELD}
          part={this.partForName("field")}
          grow=""
          fluid=""
          placeholder={this.hint}
          aria-label={this.label ?? this.hint}
          style={this.maxHeight ? { "--ui-input-textarea-grow-max-height": this.maxHeight } : undefined}
          on-ui-typed={this.onTyped}
          onKeyDown={this.onKeyDown}
        />
        <Show when={this.isEdited}>
          <div class={RESET_ROW}>
            <ui-button
              class={RESET}
              part={this.partForName("reset")}
              size="mini"
              appearance="basic"
              icon="rotate left"
              data-tooltip={this.translationForKey("resetTip")}
              onClick={this.resetToSeed}
            >
              {this.translationForKey("reset")}
            </ui-button>
          </div>
        </Show>
      </div>
    )
  }

  /**
   * What the page kept:  a box of its own, its title and why, then each text under its old title, with a × to drop
   * it.
   */
  private keptBox(): JSX.Element {
    const title = this.translationForKey("keptTitle")
    return (
      <div class={KEPT} part={this.partForName("kept")} role="group" aria-label={title}>
        <p class={KEPT_HEAD}>
          <ui-icon name="clock rotate left" />
          {title}
        </p>
        <p class={KEPT_WHY}>{this.translationForKey("keptWhy")}</p>
        <For each={this.kept}>
          {(item) => (
            <div class={KEPT_ITEM} part={this.partForName("kept-item")}>
              <p class={KEPT_LABEL}>{item.label}</p>
              <p class={KEPT_TEXT}>{item.text}</p>
              <ui-button
                class={KEPT_DROP}
                size="mini"
                appearance="basic circular"
                icon="xmark"
                aria-label={this.translationForKey("keptDrop", { label: item.label })}
                data-tooltip={this.translationForKey("keptDropTip")}
                onClick={() => this.form?.dropKept(item)}
              />
            </div>
          )}
        </For>
      </div>
    )
  }

  /** Its field, once drawn:  the `<ui-textarea>`. */
  private field: DOMFieldElement | undefined

  /** Its field, drawn:  kept, and given what's typed so far. */
  private holdField(element: DOMFieldElement) {
    this.field = element
    element.value = this.text
  }

  /** The text changed from outside (a sent answer, `value`):  the field shows it. */
  @E.onChange("text")
  protected onTextChanged(text: string) {
    if (this.field && this.field.value !== text) this.field.value = text
  }

  /**
   * A `code` box's Tab:  indents (two spaces, or every line picked), Shift-Tab takes it back;
   * after Escape, Tab moves on as usual, so the keyboard can always leave.
   * - typed through the browser's own editing (`insertText`), so Undo takes it back and the field's `input` follows
   */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.code) return
    if (event.key === UIT.Key.escape) {
      this.tabLeaves = true
      return
    }
    const leaves = this.tabLeaves
    this.tabLeaves = false
    if (event.key !== UIT.Key.tab || leaves || event.altKey || event.ctrlKey || event.metaKey) return
    const textarea = (this.domElement as DOMTextBoxElement).textarea
    if (!textarea) return
    event.preventDefault()
    const { value, selectionStart: start, selectionEnd: end } = textarea
    if (start === end && !event.shiftKey) {
      insertText(textarea, INDENT)
      return
    }
    // every line the pick touches, from its first line's start
    const from = value.lastIndexOf("\n", start - 1) + 1
    const lines = value.slice(from, end).split("\n")
    const shifted = lines.map((line) => (event.shiftKey ? line.replace(OUTDENT, "") : INDENT + line))
    textarea.setSelectionRange(from, end)
    insertText(textarea, shifted.join("\n"))
    textarea.setSelectionRange(from, from + shifted.join("\n").length)
  }

  /** Escape was the last key:  the next Tab leaves the box. */
  private tabLeaves = false

  /** A keystroke:  the text, and the page's form told (its draft follows). */
  private readonly onTyped = (event: CustomEvent<{ value: string }>) => {
    this.text = event.detail.value
    this.form?.edited()
  }

  ////////////////
  // ## Its part of the answer
  ////////////////

  /**
   * Add what it says (`said`) to `page`, by its type:  the notes, a comment, a question's Other;
   * nothing when blank, or left as seeded.
   */
  gatherInto(page: PageAnswer) {
    const text = this.said
    const type = this.type ?? "comment"
    if (type === "notes") page.notes = text ?? ""
    else if (type === "other") {
      if (!this.for) return
      const answer = (page.answers[this.for] ??= { picked: [] })
      if (text) answer.other = text
    } else if (type === "comment" && text && this.for) page.comments[this.for] = text
  }

  /**
   * Its id, for a draft (P18):  the notes (`NOTES_KEY`), or a comment's `for`, under its section's title;  an
   * option's comment (`q1-B`) under its question's, which names it.  Other is its question's.
   */
  labelsInto(labels: PartLabels) {
    const type = this.type ?? "comment"
    if (type === "notes") labels[NOTES_KEY] = this.translationForKey("notesTitle")
    else if (type === "comment" && this.for)
      labels[this.for] ??= document.getElementById(this.for)?.getAttribute("label") ?? this.for
  }

  /** Show its share of `answer`, as sent. */
  showAnswer(answer: SentAnswer) {
    const type = this.type ?? "comment"
    const id = this.for ?? ""
    if (type === "notes") this.text = this.shownFor(answer.notes || undefined)
    else if (type === "other") this.text = this.shownFor(answer.answers?.[id]?.other)
    else if (type === "comment") this.text = this.shownFor(answer.comments?.[id])
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicTextBox extends E.AttributeValues<typeof epicTextBoxVocabulary> {}

/** Its field's DOM element:  a `<ui-textarea>`, its live `value` a property. */
type DOMFieldElement = HTMLElement & { value: string }

/** Class of the `<ui-textarea>`. */
const FIELD = "field"

/** Classes of a seeded box's reset:  its row, its button. */
const RESET_ROW = "reset-row"
const RESET = "reset"

/** What a `code` box's Tab types;  Shift-Tab takes up to that much off a line's start. */
const INDENT = "  "
const OUTDENT = /^ {1,2}|^\t/

/** Does `element` hold a seed:  a `<script type="text/...">` or a `<template>` child, as `<ui-code>` reads? */
function hasSeed(element: Element): boolean {
  for (const child of element.children)
    if (
      child.localName === "template" ||
      (child.localName === "script" && (child as HTMLScriptElement).type.startsWith("text/"))
    )
      return true
  return false
}

/**
 * Type `text` into `textarea` over its selection, as the person would:  the browser's own editing, so Undo takes it
 * back and its `input` event fires;  where that's refused, set in place and announced.
 */
function insertText(textarea: HTMLTextAreaElement, text: string) {
  textarea.focus()
  // the one way to type into a field that keeps its Undo (deprecated, still in every browser)
  if (document.execCommand("insertText", false, text)) return
  textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, "end")
  textarea.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
}

/** Classes of a notes box's kept text:  its box, title, why, each text (its title, text, ×). */
const KEPT = "kept"
const KEPT_HEAD = "kept-head"
const KEPT_WHY = "kept-why"
const KEPT_ITEM = "kept-item"
const KEPT_LABEL = "kept-label"
const KEPT_TEXT = "kept-text"
const KEPT_DROP = "kept-drop"
