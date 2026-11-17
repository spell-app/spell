import { E, UI, UIT } from "spell/ui/core"
import { modalVocabulary } from "./UIModal.en"
import { type Vocabulary } from "./UIModal.types"

/****************
 * ### `ModalDialogs`
 * The dialogs behind `UI.modals.confirm()` / `alert()` / `prompt()` (Fomantic's `$.modal('confirm', …)`):
 * a `<ui-modal>` built for the call, appended to `<body>`, shown (`visible`), and removed once hidden.
 *
 * - Markup:  `<ui-modal size="tiny" closedby="closerequest" heading="title">` holding
 *   - a `<ui-content>`:  the message as a `<p>`, or for `prompt()` a `<label>` around it and an `<input>`
 *     - `size`:  the message's text size (`ui-font-size-big`), the title and buttons keeping theirs
 *     - `markdown`, and the message has Markdown in it (`hasMarkdown()`):
 *       a `<ui-markdown sanitized breaks>` instead of the `<p>`, its family imported the first time one is needed;
 *       the dialog shows once it has drawn, so it never opens on a half-drawn message
 *   - `<ui-actions>`:  a deny button (`cancel`, first:  it takes the initial focus, the least destructive choice)
 *     and a primary approve button.
 * - Escape denies (`closedby="closerequest"`:  no dimmer clicks, so a stray click can't answer).
 * - The promise settles once the modal is HIDDEN (`ui-closed`), so a caller can open the next dialog straight away.
 * - Button texts:  `okText` / `cancelText`, else the translated `ok` / `cancel` texts (`UI.i18n`).
 * - Everything is light DOM built with `createElement` / `textContent`:  never `innerHTML` with caller text.
 * - Other families' tags (`<ui-content>`, `<ui-actions>`, `<ui-button>`) are looked up at CALL time,
 *   by class noun, in the vocabulary registry (`UI.vocabulary`).
 *   - Why:  importing their vocabulary files would reach into other families' files,
 *     which `AGENTS.md` keeps behind `spell/ui/core`.
 *   - The family barrel imports `parts` and `button`, so both are defined before any dialog opens.
 * - Registered by the family barrel as `UI.modals`' provider;  the runtime never imports it.
 ****************/
export class ModalDialogs implements E.ModalProvider {
  /** Page the dialogs are made in;  a test passes its own. */
  readonly document: Document

  constructor({ document = globalThis.document }: ModalDialogsProps = {}) {
    this.document = document
  }

  /** Ask a yes / no question:  resolves `true` on approve, `false` on deny or Escape. */
  confirm(options: E.ModalOptions): Promise<boolean> {
    return this.run(options, { canDeny: true }, (isApproved) => isApproved)
  }

  /** Tell `options.message`:  resolves once the dialog has hidden, however it closed. */
  alert(options: E.ModalOptions): Promise<void> {
    return this.run(options, { canDeny: false }, () => undefined)
  }

  /** Ask for one line of text:  resolves with it on approve, `undefined` on deny or Escape. */
  prompt(options: E.ModalOptions): Promise<string | undefined> {
    return this.run(options, { canDeny: true, input: options.value ?? "" }, (isApproved, value) =>
      isApproved ? value : undefined
    )
  }

  /**
   * Build, open and await one dialog;  `result()` turns "approved?" and the input's value into the answer.
   * - SIDE EFFECT:  a `<ui-modal>` in `<body>` until it has hidden.
   * - Throws when the parts or `<ui-button>` aren't registered (`tagFor()`).
   */
  private run<T>(options: E.ModalOptions, flags: DialogFlags, result: (isApproved: boolean, value: string) => T) {
    if (flags.input === undefined && options.markdown && ModalDialogs.hasMarkdown(options.message)) {
      return this.markdown(options).then((message) => this.open(options, flags, result, message))
    }
    return this.open(options, flags, result)
  }

  /**
   * `run()`, once its message is ready:  `message` is the drawn Markdown, else the plain `<p>` is made here.
   * - Plain text opens at once, in the same task as the call:  callers and tests find the dialog straight away.
   */
  private open<T>(
    options: E.ModalOptions,
    { canDeny, input }: DialogFlags,
    result: (isApproved: boolean, value: string) => T,
    message?: HTMLElement
  ): Promise<T> {
    const modal = this.document.createElement(modalVocabulary.tag) as HTMLElement & { visible: boolean }
    modal.setAttribute(SIZE, TINY)
    modal.setAttribute("closedby", "closerequest")
    if (options.title) modal.setAttribute(UIT.HEADING, options.title)
    else modal.setAttribute("aria-label", options.message)
    const content = this.document.createElement(ModalDialogs.tagFor(UIT.CONTENT))
    const field = input === undefined ? undefined : this.input(input)
    content.append(field ? this.label(options.message, field) : (message ?? this.paragraph(options)))
    const actions = this.document.createElement(ModalDialogs.tagFor(ACTIONS))
    if (canDeny) actions.append(this.button(options.cancelText ?? UI.i18n.t(CANCEL), CANCEL))
    const approve = this.button(options.okText ?? UI.i18n.t(OK), APPROVE_CLASS)
    approve.setAttribute(COLOR, options.okColor ?? PRIMARY)
    actions.append(approve)
    modal.append(content, actions)
    field?.addEventListener("keydown", (event) => {
      if (event.key === UIT.Key.enter) approve.click()
    })
    const drawn = message && ModalDialogs.drawn(message)
    this.document.body.append(modal)
    if (drawn) void drawn.then(() => (modal.visible = true))
    else modal.visible = true
    return new Promise<T>((resolve) => {
      let isApproved = false
      modal.addEventListener(APPROVE_EVENT, () => (isApproved = true))
      modal.addEventListener(
        HIDE_EVENT,
        () => {
          modal.remove()
          resolve(result(isApproved, field?.value ?? ""))
        },
        { once: true }
      )
    })
  }

  /**
   * The message as a paragraph, a `\n` in it a line break.
   * - `size`:  its words in a `<span>` of that text size, so the paragraph's own margins stay the dialog's
   *   (`1em` of its 16px), on the 4px grid whatever the size.
   */
  private paragraph({ message, size }: E.ModalOptions): HTMLParagraphElement {
    const paragraph = this.document.createElement("p")
    paragraph.style.whiteSpace = MESSAGE_LINES
    if (size && size !== MEDIUM) {
      const words = this.document.createElement("span")
      words.className = FONT_SIZE_CLASS + size
      words.textContent = message
      paragraph.append(words)
    } else paragraph.textContent = message
    return paragraph
  }

  /**
   * The message as a `<ui-markdown sanitized breaks>`, importing its family the first time.
   * - `sanitized`:  the message may hold what someone typed, so raw HTML in it goes through DOMPurify
   *   (no scripts, event handlers or `javascript:` links).
   * - `breaks`:  each `\n` a line break, as in the plain `<p>`.
   * - Its text is the element's text content, never markup:  `<ui-markdown>` reads it as Markdown.
   * - rejects if the family can't be imported
   */
  private async markdown({ message, size }: E.ModalOptions): Promise<HTMLElement> {
    await import("spell/ui/components/ui-markdown")
    const markdown = this.document.createElement(ModalDialogs.tagFor(MARKDOWN))
    markdown.toggleAttribute(SANITIZED, true)
    markdown.toggleAttribute(BREAKS, true)
    if (size && size !== MEDIUM) markdown.setAttribute(SIZE, size)
    // the plain `<p>`'s margins, so the dialog keeps its spacing
    markdown.style.marginBlock = PARAGRAPH_MARGIN
    markdown.textContent = message
    return markdown
  }

  /**
   * Whether `message` has Markdown in it:  a heading, a list, a quote, a fence, bold or italic, code, a link.
   * - So a plain message stays a plain `<p>`, drawn exactly as before `markdown` was asked for.
   * - Static:  pure text.
   */
  static hasMarkdown(message: string): boolean {
    return MARKDOWN_MARKS.some((mark) => mark.test(message))
  }

  /**
   * Resolves once `markdown` has drawn (`ui-drawn`), or after `DRAW_WAIT` seconds whatever happened:
   * a message that can't draw still opens, showing its error.
   */
  private static drawn(markdown: HTMLElement): Promise<void> {
    return new Promise<void>((resolve) => {
      const wait = E.after(DRAW_WAIT, resolve)
      markdown.addEventListener(
        DRAWN_EVENT,
        () => {
          wait.cancel()
          resolve()
        },
        { once: true }
      )
    })
  }

  /** `prompt()`'s text input, focused when the dialog opens. */
  private input(value: string): HTMLInputElement {
    const input = this.document.createElement("input")
    input.type = "text"
    input.value = value
    input.autofocus = true
    return input
  }

  /** The message as the input's `<label>`, in the opt-in native look (`native.css`). */
  private label(message: string, input: HTMLInputElement): HTMLLabelElement {
    const label = this.document.createElement("label")
    label.className = NATIVE_LOOK
    label.style.cssText = LABEL_LAYOUT
    const words = this.document.createElement("span")
    words.style.whiteSpace = MESSAGE_LINES
    words.textContent = message
    label.append(words, input)
    return label
  }

  /** A `<ui-button>` with Fomantic's action class (`approve` / `cancel`). */
  private button(text: string, actionClass: string): HTMLElement {
    const button = this.document.createElement(ModalDialogs.tagFor(UIT.BUTTON))
    button.className = actionClass
    button.textContent = text
    return button
  }

  /**
   * Canonical tag of the registered component whose class noun is `noun` (`button` => `ui-button`).
   * - Throws when none is registered:  a dialog built from undefined elements would look right and not work.
   * - Static:  it reads only the page-wide vocabulary registry.
   */
  private static tagFor(noun: string): string {
    for (const vocabulary of UI.vocabulary.vocabularies.values()) if (vocabulary.noun === noun) return vocabulary.tag
    throw new Error(
      `UI.modals:  no component with the class noun "${noun}" is registered;  ` +
        `import its family (\`spell/ui/components/ui-parts\`, \`ui-button\`) before opening a dialog`
    )
  }
}

/** How `run()` builds a dialog:  a deny button or not;  `prompt()`'s input and its starting text. */
type DialogFlags = { canDeny: boolean; input?: string }

/** Constructor props for `ModalDialogs`. */
export type ModalDialogsProps = {
  /** page to build in.  Default:  the global `document`. */
  document?: Document
}

/** An approve element was activated:  the dialog answers yes. */
const APPROVE_EVENT: E.EventName<Vocabulary> = "ui-approving"

/** Hidden:  the call settles. */
const HIDE_EVENT: E.EventName<Vocabulary> = "ui-closed"

/** `<ui-modal>` width attribute (canonical name). */
const SIZE = "size"

/** The dialogs' width. */
const TINY = "tiny"

/** The size word that's the default:  no class, no attribute. */
const MEDIUM = "medium"

/** A plain message's text size:  `sizes.css`' utility, `ui-font-size-<size>`. */
const FONT_SIZE_CLASS = "ui-font-size-"

/** Class noun of `<ui-markdown>`. */
const MARKDOWN = "markdown"

/** `<ui-markdown>`'s attribute:  its markup through DOMPurify. */
const SANITIZED = "sanitized"

/** `<ui-markdown>`'s attribute:  a single newline is a line break. */
const BREAKS = "breaks"

/** The browser's margin above and below a `<p>`, which a Markdown message keeps too. */
const PARAGRAPH_MARGIN = "1em"

/** `<ui-markdown>` has drawn its text. */
const DRAWN_EVENT = "ui-drawn"

/** The longest a Markdown message holds its dialog back while it draws, in seconds. */
const DRAW_WAIT = 1

/**
 * What makes a message Markdown:  any one of them.
 * - a heading (`# Won`), a list item (`- one`, `1. one`), a quote (`> said`), a fence (```` ``` ````)
 * - bold or italic (`**big**`, `__big__`, `*so*`, `_so_`), code (`` `x` ``), a link (`[here](/x)`)
 * - Italic needs a mark against a word on both sides, so `5 * 3 * 2` and `snake_case_name` stay plain.
 */
const MARKDOWN_MARKS = [
  /^#{1,6}\s/m,
  /^\s*(?:[-*+]|\d+[.)])\s+\S/m,
  /^>\s?/m,
  /^```/m,
  /(\*\*|__)\S(?:.*?\S)?\1/,
  /(?<![\w*])\*[^\s*](?:[^*]*[^\s*])?\*(?![\w*])/,
  /(?<!\w)_[^\s_](?:[^_]*[^\s_])?_(?!\w)/,
  /`[^`\n]+`/,
  /\[[^\]\n]+\]\([^)\s]+\)/
]

/** Class noun of the actions part (`<ui-actions>`). */
const ACTIONS = "actions"

/** `<ui-button>` colour of the approve button. */
const PRIMARY = "primary"

/** `<ui-button>`'s `color`, which `PRIMARY` is a value of (epic `ui-gaps` P4). */
const COLOR = "color"

/** Fomantic's approve class of a button. */
const APPROVE_CLASS = "approve"

/** Fomantic's deny class of a button, and the text key of its label. */
const CANCEL = "cancel"

/** Text key of the approve button's label. */
const OK = "ok"

/** `native.css`'s opt-in class, for the prompt's input. */
const NATIVE_LOOK = "ui-native"

/** A message's lines:  each `\n` in it a line break, so a long message reads a sentence or phrase a line. */
const MESSAGE_LINES = "pre-line"

/** The prompt's label:  message above a full-width input. */
const LABEL_LAYOUT = "display: grid; gap: 0.5em"
