import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E, UI } from "spell/ui/core"
import type { codeVocabulary } from "spell/ui/components/ui-code/UICode.en"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { MarkdownSource } from "./MarkdownSource"
import type {
  MarkdownHeading,
  MarkdownOptions,
  MarkdownPlace,
  MarkdownPlaceKind,
  MarkdownRendering
} from "./UIMarkdown.types"
import { markdownVocabulary } from "./UIMarkdown.en"

import markdownCSS from "./UIMarkdown.css?inline"

/****************
 * ### `DOMMarkdownElement`
 * The DOM element of `<ui-markdown>`:  it adds `headings` and `reveal()`
 * to the source API it inherits from `DOMLoadableElement` (`content`, `save()` ...).
 * - `headings`:  `{ level, text, id }` of each heading of the last render, e.g. for a table of contents;
 *   `[]` before the first (`ui-drawn` says when).
 * - `reveal(id)`:  scroll to one of them from outside.
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMMarkdownElement extends E.DOMLoadableElement<UIMarkdown> {
  /** Each heading of the last render;  `[]` before the first.  Untracked:  it's for scripts. */
  @E.untracked
  get headings(): MarkdownHeading[] {
    return this.component?.headings ?? []
  }

  /**
   * Scroll to the rendered heading `id` (a `headings` entry's) and put `#id` in the address,
   * as a `#id` link inside does;  `false` when no such heading is rendered (yet).
   * - Why a method:  the headings live in the shadow root, which the page's own fragment navigation can't see,
   *   e.g. from a table of contents outside the element.
   */
  reveal(id: string): boolean {
    return this.component?.reveal(id) ?? false
  }
}

/****************
 * ### `UIMarkdown`
 * The component behind `<ui-markdown>`:  GitHub-flavoured markdown, rendered.
 *
 * - Its shadow DOM:
 *   `<article class="ui [size] markdown" part="body">` in a `<section>` (the preview panel, when `editable="tabs"`).
 * - The text:  the element's own (`<script type="text/markdown">` keeps it exact),
 *   or a `source` file (see `LoadableComponent`).
 * - Rendering:  marked, loaded with the first render (`MarkdownRenderer` -> `MarkdownEngine`, the lazy chunk).
 *   Headings get GitHub's ids (`headings`, `ui-drawn`).
 *   - A subclass may draw with an engine of its own (`loadEngine()`):
 *     the app's `<spell-markdown>` draws with spell's, in `ui-*` elements.
 * - NOT sanitized unless `sanitized`:  raw HTML in the text is kept.
 *   `sanitized` loads DOMPurify (`MarkdownSanitizer`, a lazy chunk of its own) alongside the engine:
 *   set it for text you didn't write.
 * - After rendering:
 *   - each fenced code block becomes a `<ui-code language="x" copy>` (one highlighter, one palette)
 *   - each short inline code span is marked `short`, kept on one line (`keepShortCode()`)
 *   - each task-list checkbox is named by its item's text (marked leaves it unlabelled)
 *   - relative `href` / `src` resolve against `source`, so a README's links and images work where it's shown
 *   - `#id` links scroll to the heading INSIDE the shadow root
 *     (the page's own fragment navigation can't see it).
 *     So do `reveal(id)` from outside, and a `#id` in the address that names one of its headings:
 *     after the FIRST render (a page loaded with it), and on each `hashchange` (a link elsewhere on the page).
 * - `skip-title`:  the text's leading `#` title isn't rendered (the text keeps it).
 * - A failed render (an engine that won't load) is a `render` error, with its message.
 * - `editable`:  each paragraph, heading, list item and table cell is edited where it's drawn ("Editing in place").
 * - `editable="tabs"`:  Write / Preview tabs (`role=tablist`, arrow keys), a `<textarea>` for the text,
 *   and the article as the preview, drawn by the same engine.
 *   - each keystroke sets `content`:  `ui-changed`, `:state(dirty)`, and `save()` writes it back to `source`
 *   - the preview renders while it's shown:  the WHOLE text each time (~2 ms for 32 kB),
 *     then swaps only the top-level blocks whose markup changed (`patchBody()`),
 *     so unchanged elements keep their state (a highlighted `<ui-code>`, a scrolled table).
 * - SIDE EFFECTS:  listens to `window`'s `hashchange` while connected, and to its ⌥ key while `editable`;
 *   a revealed heading is put in the address (`history.replaceState`, no new entry).
 ****************/
export class UIMarkdown extends E.LoadableComponent<typeof markdownVocabulary> {
  // typed wide, as `UIRoot`'s:  a subclass names its own (the app's `<spell-markdown>`)
  @E.proto static vocabulary: E.ComponentVocabulary = markdownVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { markdown: markdownCSS },
    DOMElement: DOMMarkdownElement,
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Rendering
  ////////////////

  /** The `<article>`, once rendered. */
  private body?: HTMLElement

  /** Renders started;  only the latest one's result is shown. */
  private ticket = 0

  /** Markup of each top-level node `patchBody()` put in the article, to tell which blocks changed. */
  private readonly rendered = new WeakMap<Node, string>()

  /**
   * Render whenever the text or a rendering attribute changes;  `editable="tabs"`, only while the preview shows.
   * - Never on a server:  the server runs no effect.
   */
  @E.onChange("textToShow", "skipTitle", "loadStatus", "editable", "shownTab", "breaks", "headingOffset", "sanitized")
  protected onMarkdownChanged() {
    void this.renderNow()
  }

  /**
   * Render the text as it is now, unless it can't show:  not loaded, the Write tab up, or a piece being edited in
   * place (it renders once that closes, "Editing in place").
   * - Returns the render, for what waits on it (Tab, to the next piece).
   */
  private renderNow(): Promise<void> | undefined {
    const isShown = !this.hasTabs || this.shownTab === PREVIEW
    if (this.loadStatus !== "loaded" || !isShown) return
    if (this.box) {
      this.isRenderWaiting = true
      return
    }
    const text = this.textToShow
    const shown = this.skipTitle ? text.replace(LEADING_TITLE, "") : text
    this.placesOffset = text.length - shown.length
    return this.renderMarkdown({
      text: shown,
      isEditable: !!this.editable,
      options: {
        breaks: !!this.breaks,
        headingOffset: Number(this.headingOffset) || 0,
        sanitized: !!this.sanitized,
        places: this.editsInPlace
      }
    })
  }

  protected renderContent(): JSX.Element {
    return (
      <>
        <Show when={this.hasTabs}>
          {this.tabs()}
          {this.editor()}
        </Show>
        <section
          id={UIMarkdown.panelId(PREVIEW)}
          role={this.hasTabs ? TAB_ROLES.panel : undefined}
          aria-labelledby={this.hasTabs ? UIMarkdown.tabId(PREVIEW) : undefined}
          hidden={this.hasTabs && this.shownTab !== PREVIEW ? true : undefined}
        >
          <article
            class={this.rootClass}
            part={this.partForName("body")}
            onClick={this.onClick}
            ref={(body: HTMLElement) => {
              this.body = body
            }}
          />
        </section>
      </>
    )
  }

  ////////////////
  // ## Editing in tabs (`editable="tabs"`)
  ////////////////

  /** `editable="tabs"`:  Write / Preview tabs. */
  get hasTabs(): boolean {
    return this.editable === TABS
  }

  /** `editable`'s shown tab. */
  @E.state accessor shownTab: MarkdownTab = WRITE

  /** `editable`:  the text box. */
  private textBox?: HTMLTextAreaElement

  /** `editable`:  the tab buttons, by tab. */
  private readonly tabButtons = new Map<MarkdownTab, HTMLButtonElement>()

  /** `editable`'s tab list:  Write, Preview. */
  private tabs(): JSX.Element {
    return (
      <nav part={this.partForName("tabs")} role={TAB_ROLES.list} onKeyDown={this.onTabKeyDown}>
        <For each={MarkdownTabs}>
          {(tab) => (
            <button
              type="button"
              id={UIMarkdown.tabId(tab)}
              role={TAB_ROLES.tab}
              part={this.partForName("tab")}
              aria-selected={this.shownTab === tab ? "true" : "false"}
              aria-controls={UIMarkdown.panelId(tab)}
              tabindex={this.shownTab === tab ? 0 : -1}
              onClick={() => (this.shownTab = tab)}
              ref={(button: HTMLButtonElement) => {
                this.tabButtons.set(tab, button)
              }}
            >
              {this.translationForKey(tab)}
            </button>
          )}
        </For>
      </nav>
    )
  }

  /** `editable`'s text box, in the Write panel. */
  private editor(): JSX.Element {
    return (
      <section
        id={UIMarkdown.panelId(WRITE)}
        role={TAB_ROLES.panel}
        aria-labelledby={UIMarkdown.tabId(WRITE)}
        hidden={this.shownTab !== WRITE ? true : undefined}
      >
        <textarea
          part={this.partForName("editor")}
          aria-label={this.translationForKey("editor")}
          onInput={this.onInput}
          ref={this.keepTextBox}
        />
      </section>
    )
  }

  /** `editable`:  keep the text box as it's drawn, and fill it with the text (`onTextChanged()` keeps it in step). */
  @E.untracked
  private readonly keepTextBox = (textBox: HTMLTextAreaElement) => {
    this.textBox = textBox
    textBox.value = this.textToShow
  }

  /** `editable`:  the text box follows the content (`domElement.content = ...`, a reload). */
  @E.onChange("textToShow")
  protected onTextChanged(text: string) {
    if (this.textBox && this.textBox.value !== text) this.textBox.value = text
  }

  /** `editable`:  each keystroke is an edit (`ui-changed`, `dirty`). */
  private readonly onInput = (event: InputEvent) => {
    this.content = (event.currentTarget as HTMLTextAreaElement).value
  }

  /** `editable`'s tab list:  arrows move between the tabs (wrapping), Home / End to the ends;  focus follows. */
  private readonly onTabKeyDown = (event: KeyboardEvent) => {
    UI.focus.arrowKey(event, {
      container: event.currentTarget as HTMLElement,
      items: () => MarkdownTabs.map((tab) => this.tabButtons.get(tab)!),
      orientation: "horizontal",
      // the shown tab is the tab stop, drawn by `tabs()`
      tabindex: "left alone",
      onChange: (_button, index) => (this.shownTab = MarkdownTabs[index]!)
    })
  }

  ////////////////
  // ## Editing in place (`editable`)
  ////////////////

  /** `editable`, bare:  each piece edited where it's drawn, by ⌥-click (epic `epic-engine` P60). */
  get editsInPlace(): boolean {
    return this.editable === true
  }

  /** ⌥ (Alt) is held down, while the window has the focus. */
  @E.state accessor isOptionHeld = false

  /** Holding ⌥ outlines what can be edited in place:  `:state(placing)`. */
  @E.cssState("placing")
  get isPlacing(): boolean {
    return this.editsInPlace && this.isOptionHeld
  }

  /** The piece being edited in place, while one is. */
  @E.state accessor box: OpenBox | undefined = undefined

  /** A piece is being edited in place:  `:state(editing)`. */
  @E.cssState("editing")
  get isEditingInPlace(): boolean {
    return !!this.box
  }

  /** The places of the last render (`MarkdownSource`), as offsets into the text it rendered. */
  private places: MarkdownPlace[] = []

  /** Where the rendered text starts in the content:  past the title `skip-title` leaves out. */
  private placesOffset = 0

  /** A render came while a box was open:  it runs as the box closes. */
  private isRenderWaiting = false

  /** The open box's keep, 5 seconds after the last key. */
  private keepTimer?: E.CancelablePromise<unknown>

  /** The saves kept edits start, one after another (`saveInTurn()`). */
  private saves: Promise<unknown> = Promise.resolve()

  /** While connected, follow ⌥ on the window:  down, up, and the window losing the focus. */
  @E.whileConnected
  protected followOptionKey() {
    const listeners = new AbortController()
    const options = { signal: listeners.signal }
    const follow = (event: KeyboardEvent) => (this.isOptionHeld = event.altKey)
    window.addEventListener("keydown", follow, options)
    window.addEventListener("keyup", follow, options)
    window.addEventListener("blur", () => (this.isOptionHeld = false), options)
    return () => listeners.abort()
  }

  /** ⌥-click:  open a box on the piece under it;  `false` when there's none, or it's the open box. */
  private openAt(event: MouseEvent): boolean {
    const target = event.target as Element
    if (this.box?.field.contains(target)) return false
    const piece = target.closest?.(PLACED) as HTMLElement | null
    if (!piece || !this.body?.contains(piece)) return false
    void this.open(piece, { x: event.clientX, y: event.clientY })
    return true
  }

  /**
   * Edit `piece` where it is:  its own content becomes a box holding its markdown, the cursor where `point` was
   * (else at its end).
   * - Its own content:  all of it, but a list item's nested lists and task box;  a loose item's first paragraph.
   * - A box already open is kept first.
   */
  private async open(piece: HTMLElement, point?: { x: number; y: number }) {
    if (this.box) await this.keep("close")
    const place = this.places[Number(piece.getAttribute(PLACE_ATTRIBUTE))]
    if (!place || !piece.isConnected) return
    const text = this.textToShow
    const start = place.start + this.placesOffset
    const end = place.end + this.placesOffset
    const raw = text.slice(start, end)
    const holder = UIMarkdown.holderOf(piece)
    const own = UIMarkdown.ownNodes(holder)
    const caret = point ? this.caretFor(holder, raw, point) : raw.length
    const field = this.boxField(place.kind, raw)
    holder.insertBefore(field, own[0] ?? null)
    for (const node of own) node.remove()
    this.box = { piece, field, own, place: { ...place, start, end }, raw, opened: raw, base: text }
    field.focus()
    UIMarkdown.putCaret(field, caret)
  }

  /** The box a piece of `kind` becomes:  its markdown, `raw`, as plain editable text. */
  private boxField(kind: MarkdownPlaceKind, raw: string): HTMLElement {
    const field = this.domElement.ownerDocument.createElement("span")
    field.contentEditable = "plaintext-only"
    field.setAttribute("part", this.partForName("edit-box"))
    field.setAttribute("role", "textbox")
    field.setAttribute("aria-label", this.translationForKey("editBox", { kind: this.translationForKey(kind) }))
    if (kind === "paragraph") field.setAttribute("aria-multiline", "true")
    field.textContent = raw
    field.addEventListener("keydown", this.onBoxKey)
    field.addEventListener("input", this.onBoxInput)
    field.addEventListener("focusout", this.onBoxLeft)
    return field
  }

  /**
   * The box's keys:  Enter keeps it and closes;  Shift+Enter is a new line in a paragraph;  Tab and Shift+Tab keep it
   * and move to the next and previous piece;  Escape puts the text back;  Home and End go to its start and end.
   * - Stopped here, so a page's own keys don't act on them.
   */
  @E.untracked
  private readonly onBoxKey = (event: KeyboardEvent) => {
    event.stopPropagation()
    const box = this.box
    if (!box) return
    const isNewLine = event.key === "Enter" && event.shiftKey && box.place.kind === "paragraph"
    // Home and End:  the box's start and end, never the page's (a Mac scrolls the page by them)
    const edge = event.shiftKey ? undefined : EDGE_KEYS[event.key as keyof typeof EDGE_KEYS]
    if (edge !== undefined) UIMarkdown.putCaret(box.field, edge === "start" ? 0 : box.field.textContent!.length)
    else if (event.key === "Escape") void this.putBack()
    else if (event.key === "Enter" && !isNewLine) void this.keep("close")
    else if (event.key === "Tab") void this.keep(event.shiftKey ? "previous" : "next")
    else return
    event.preventDefault()
  }

  /** Each key:  the box is kept 5 seconds after the last one. */
  @E.untracked
  private readonly onBoxInput = () => {
    this.keepTimer?.cancel()
    this.keepTimer = E.after(KEEP_AFTER_SECONDS, () => void this.keep("open"))
  }

  /** The focus left the box (a click away):  it's kept, and closes. */
  @E.untracked
  private readonly onBoxLeft = (event: FocusEvent) => {
    const box = this.box
    if (box && !box.field.contains(event.relatedTarget as Node | null)) void this.keep("close")
  }

  /**
   * Keep what's typed in the box:  the content changes (`ui-changed`, dirty) and is saved (`save()`);  then the box
   * stays open (`open`), closes, or moves to the next or previous piece.
   * - The text changed under the box (a live update, an agent's save):  the piece's text is found again, once;  not
   *   there, or there twice, it's a `conflict` (`ui-error`), and the box stays open with what was typed.
   */
  private async keep(how: "open" | "close" | "next" | "previous") {
    const box = this.box
    if (!box) return
    this.keepTimer?.cancel()
    const typed = box.field.innerText.replace(/\n$/, "")
    const text = this.textToShow
    let start = box.place.start
    if (text !== box.base) {
      const at = text.indexOf(box.raw)
      if (at < 0 || text.includes(box.raw, at + 1)) return this.onKeepConflict()
      start = at
    }
    const place = { ...box.place, start, end: start + box.raw.length }
    const next = MarkdownSource.replace(text, place, typed)
    const neighbour = how === "next" || how === "previous" ? this.neighbourOf(box.piece, how) : undefined
    const after = neighbour && this.startInNext(neighbour, place, next.length - text.length)
    if (next !== text) {
      box.raw = next.slice(start, next.length - (text.length - place.end))
      box.place = { ...place, end: start + box.raw.length }
      box.base = next
      this.content = next
      this.saveInTurn()
    }
    if (how === "open") return
    // drawn again now, not when the content's change reaches the render:  the next piece opens in the new drawing
    const rendered = this.close(box) ?? (next !== text ? this.renderNow() : undefined)
    if (after === undefined) return
    await rendered
    const target = [...(this.body?.querySelectorAll<HTMLElement>(PLACED) ?? [])].find(
      (piece) => this.places[Number(piece.getAttribute(PLACE_ATTRIBUTE))]?.start === after
    )
    if (target) await this.open(target)
  }

  /**
   * Save the content, after any save still running:  each save finds the text the one before it wrote.
   * - Failures are the element's `ui-error`;  the content stays.
   */
  private saveInTurn() {
    this.saves = this.saves.then(() => this.save()).catch(() => false)
  }

  /** Escape:  the box's text as it was when it opened, kept;  then it closes. */
  private async putBack() {
    const box = this.box
    if (!box) return
    if (box.raw === box.opened) return void this.close(box)
    box.field.textContent = box.opened
    await this.keep("close")
  }

  /**
   * Close the box:  the piece shows as before, then the render that waited runs (its new text, if it changed).
   * - Returns that render, else `undefined`.
   */
  private close(box: OpenBox): Promise<void> | undefined {
    this.keepTimer?.cancel()
    this.box = undefined
    box.field.removeEventListener("focusout", this.onBoxLeft)
    box.field.replaceWith(...box.own)
    if (!this.isRenderWaiting) return
    this.isRenderWaiting = false
    return this.renderNow()
  }

  /** The text changed under the box, and its piece can't be found again:  `conflict`, and the box stays open. */
  private onKeepConflict() {
    const error = new Error("<ui-markdown>:  this text changed while it was edited;  copy what you typed, and reload")
    this.sendSourceEvent(E.SourceEvent.error, { kind: "conflict", source: this.source || undefined, error })
  }

  /** The piece before or after `piece`, in reading order;  `undefined` at either end. */
  private neighbourOf(piece: HTMLElement, how: "next" | "previous"): HTMLElement | undefined {
    const pieces = [...(this.body?.querySelectorAll<HTMLElement>(PLACED) ?? [])]
    return pieces[pieces.indexOf(piece) + (how === "next" ? 1 : -1)]
  }

  /**
   * Where `neighbour`'s text starts in the rendered text once the box's edit is in:  after `edited`, it moved by
   * `moved` characters.
   */
  private startInNext(neighbour: HTMLElement, edited: MarkdownPlace, moved: number): number | undefined {
    const place = this.places[Number(neighbour.getAttribute(PLACE_ATTRIBUTE))]
    if (!place) return
    const start = place.start + this.placesOffset
    return (start >= edited.end ? start + moved : start) - this.placesOffset
  }

  /**
   * The offset in `raw` for the point clicked in `holder`:  the drawn text before it, matched character by character
   * in the markdown, which has more (`**`, a link's address).
   */
  private caretFor(holder: HTMLElement, raw: string, point: { x: number; y: number }): number {
    const root = this.domElement.shadowRoot
    const caret = this.domElement.ownerDocument.caretPositionFromPoint?.(point.x, point.y, {
      shadowRoots: root ? [root] : []
    })
    if (!caret || !holder.contains(caret.offsetNode)) return raw.length
    const before = this.domElement.ownerDocument.createRange()
    before.setStart(holder, 0)
    before.setEnd(caret.offsetNode, caret.offset)
    let at = 0
    for (const char of before.toString()) {
      const found = raw.indexOf(char, at)
      if (found < 0) return raw.length
      at = found + 1
    }
    return at
  }

  ////////////////
  // ## Headings
  ////////////////

  /** The headings of the last render;  the DOM element's `headings` reads it untracked. */
  @E.state accessor headings: MarkdownHeading[] = []

  /** A render has finished:  the address's `#id` was looked for once, after the first. */
  private hasRendered = false

  /** Scroll to the rendered heading `id` and put `#id` in the address;  `false` when there's none. */
  reveal(id: string): boolean {
    if (!this.scrollTo(id)) return false
    history.replaceState(history.state, "", `#${id}`)
    return true
  }

  /** While connected, listen to `window`'s `hashchange`;  returns the listener's abort. */
  @E.whileConnected
  protected followHash() {
    const listeners = new AbortController()
    window.addEventListener("hashchange", () => this.onHashChange(), { signal: listeners.signal })
    return () => listeners.abort()
  }

  /**
   * Scroll to the heading the address's `#id` names, if it's one of ours:
   * on `hashchange`, and once after the first render.
   * - Not when the PAGE has that id:  the browser went there itself.
   */
  private onHashChange() {
    const id = UIMarkdown.idForHash(location.hash)
    if (id && !this.domElement.ownerDocument.getElementById(id)) this.scrollTo(id)
  }

  /** Scroll the element with `id` in the article into view;  `false` when there's none. */
  private scrollTo(id: string): boolean {
    const target = this.body?.querySelector(`[id="${CSS.escape(id)}"]`)
    target?.scrollIntoView()
    return !!target
  }

  /**
   * A `#id` link:  scroll to that heading here, in the shadow root, and put it in the address.
   * - `editable`, ⌥-click:  edit the piece clicked in place, the link not followed ("Editing in place").
   */
  private readonly onClick = (event: MouseEvent) => {
    if (this.editsInPlace && event.altKey && this.openAt(event)) return event.preventDefault()
    const link = (event.target as Element).closest?.(IN_PAGE_LINK)
    const id = link && UIMarkdown.idForHash(link.getAttribute("href")!)
    if (id && this.reveal(id)) event.preventDefault()
  }

  ////////////////
  // ## Markup
  ////////////////

  /**
   * The engine this element draws with, loaded on first use:  marked (`MarkdownRenderer.load()`).
   * - A HOOK:  a subclass draws with an engine of its own by overriding it (the app's `<spell-markdown>`).
   *   Its markup may hold `ui-*` elements (`MarkdownRendering.drawsUITags`), which `sanitized` then keeps.
   */
  protected loadEngine(): Promise<MarkdownRendering> {
    return MarkdownRenderer.load()
  }

  /**
   * Render `text` into the article;  `ui-drawn` when done.
   * - `isEditable`:  the markup patched in (`patchBody()`), so unchanged blocks keep their state.
   */
  private async renderMarkdown({ text, options, isEditable }: RenderParams) {
    const ticket = ++this.ticket
    try {
      await UI.load()
      const [engine, sanitizer] = await Promise.all([
        this.loadEngine(),
        options.sanitized ? MarkdownRenderer.loadSanitizer() : undefined
      ])
      if (ticket !== this.ticket || !this.body) return
      const { html, headings, places } = engine.render(text, options)
      const fragment = sanitizer
        ? sanitizer.sanitize(html, { uiTags: !!engine.drawsUITags })
        : this.domElement.ownerDocument.createRange().createContextualFragment(html)
      this.upgradeCode(fragment)
      this.keepShortCode(fragment)
      this.labelTaskItems(fragment)
      this.resolveUrls(fragment)
      if (isEditable) this.patchBody(this.body, fragment)
      else this.body.replaceChildren(fragment)
      this.places = places ?? []
      this.headings = headings
      this.send("ui-drawn", { headings })
      if (!this.hasRendered) {
        this.hasRendered = true
        this.onHashChange()
      }
    } catch (error) {
      if (ticket === this.ticket) this.onLoadError(error, "render")
    }
  }

  /** Each `<pre><code class="language-x">` in `fragment` becomes a `<ui-code language="x" copy>` with its text. */
  private upgradeCode(fragment: DocumentFragment) {
    for (const code of fragment.querySelectorAll(CODE_BLOCK)) {
      const pre = code.parentElement!
      const block = this.domElement.ownerDocument.createElement(CODE_TAG)
      const language = LANGUAGE_CLASS.exec(code.className)?.[1]
      if (language) block.setAttribute(LANGUAGE, language)
      block.setAttribute(COPY, "")
      block.textContent = (code.textContent ?? "").replace(/\n$/, "")
      pre.replaceWith(block)
    }
  }

  /**
   * Mark each short inline code span `short`, so it never breaks across lines (`UIMarkdown.css`):
   * a browser breaks `--toggle` after its dashes.
   * - Only short ones (`SHORT_CODE_LENGTH`):  a long span kept whole would run off a phone's screen.
   */
  private keepShortCode(fragment: DocumentFragment) {
    for (const code of fragment.querySelectorAll(INLINE_CODE)) {
      if ((code.textContent ?? "").length <= SHORT_CODE_LENGTH) code.classList.add(SHORT_CLASS)
    }
  }

  /** Name each task-list checkbox by its item's text:  both engines write a bare box, which nothing labels. */
  private labelTaskItems(fragment: DocumentFragment) {
    for (const box of fragment.querySelectorAll(TASK_BOXES)) {
      const text = box.parentElement!.textContent?.trim()
      if (text) box.setAttribute("aria-label", text)
    }
  }

  /** Point relative URLs in `fragment` where they point beside `source`;  in-page `#id`s are left alone. */
  private resolveUrls(fragment: DocumentFragment) {
    const source = this.source || undefined
    if (!source) return
    const base = new URL(source, this.domElement.ownerDocument.baseURI)
    for (const name of LINK_ATTRIBUTES) {
      for (const element of fragment.querySelectorAll(`[${name}]`)) {
        const value = element.getAttribute(name)!
        if (value.startsWith("#")) continue
        try {
          element.setAttribute(name, new URL(value, base).href)
        } catch {
          // not a URL:  leave it
        }
      }
    }
  }

  /**
   * Put `fragment`'s top-level nodes in `body`, keeping the ones already there whose markup is the same:
   * the unchanged lead and tail stay, only the middle is swapped.
   * - Why:  an edit changes a block or two;  re-creating every `ui-*` element would re-highlight every code block
   *   and lose each one's state (a scrolled table, a copied-code tick).
   * - A node not put here (a render from before `editable`) has no markup recorded, so it's always swapped.
   */
  private patchBody(body: HTMLElement, fragment: DocumentFragment) {
    const next = [...fragment.childNodes]
    const nextMarkup = next.map(UIMarkdown.markupFor)
    const old = [...body.childNodes]
    const oldMarkup = old.map((node) => this.rendered.get(node))
    let lead = 0
    while (lead < next.length && lead < old.length && nextMarkup[lead] === oldMarkup[lead]) lead++
    let tail = 0
    while (
      tail < next.length - lead &&
      tail < old.length - lead &&
      nextMarkup[next.length - 1 - tail] === oldMarkup[old.length - 1 - tail]
    ) {
      tail++
    }
    for (const node of old.slice(lead, old.length - tail)) node.remove()
    // `insertBefore()`'s "at the end" is `null`:  a platform boundary
    const anchor = tail ? old[old.length - tail] : null
    for (const [index, node] of next.slice(lead, next.length - tail).entries()) {
      this.rendered.set(node, nextMarkup[lead + index])
      body.insertBefore(node, anchor)
    }
  }

  ////////////////
  // ## Helpers:  static, as they're pure
  ////////////////

  /** `#some%20id` => `some id`;  `undefined` for no hash, or a malformed one. */
  private static idForHash(hash: string): string | undefined {
    try {
      return decodeURIComponent(hash.slice(1)) || undefined
    } catch {
      return undefined
    }
  }

  /** Where a piece's own content is:  a loose list item's first paragraph, else the piece. */
  private static holderOf(piece: HTMLElement): HTMLElement {
    const first = piece.firstElementChild
    return piece.localName === "li" && first?.localName === "p" ? (first as HTMLElement) : piece
  }

  /** `holder`'s own content:  its nodes up to a nested list, without a task box. */
  private static ownNodes(holder: HTMLElement): ChildNode[] {
    const own: ChildNode[] = []
    for (const node of holder.childNodes) {
      if (node.nodeType === E.NodeType.element && NESTED_LIST.test((node as Element).localName)) break
      if (node.nodeType === E.NodeType.element && (node as Element).matches(TASK_BOX)) continue
      own.push(node)
    }
    return own
  }

  /** Put the cursor `offset` characters into `field`'s text. */
  private static putCaret(field: HTMLElement, offset: number) {
    const text = field.firstChild
    const selection = field.ownerDocument.getSelection()
    if (!text || !selection) return
    selection.collapse(text, Math.min(offset, text.textContent?.length ?? 0))
  }

  /** A top-level node's markup, to compare renders by. */
  private static markupFor(node: Node): string {
    const markup = node.nodeType === E.NodeType.element ? (node as Element).outerHTML : node.textContent
    return `${node.nodeType}:${markup}`
  }

  /** Id of `tab`'s button, inside the shadow root. */
  private static tabId(tab: MarkdownTab): string {
    return `ui-markdown-${tab}-tab`
  }

  /** Id of `tab`'s panel, inside the shadow root. */
  private static panelId(tab: MarkdownTab): string {
    return `ui-markdown-${tab}-panel`
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIMarkdown extends E.AttributeValues<typeof markdownVocabulary> {}

/** What `renderMarkdown()` renders. */
type RenderParams = {
  /** the markdown */
  text: string
  /** how to render it */
  options: MarkdownOptions
  /** `editable`:  patched in, block by block (`patchBody()`) */
  isEditable: boolean
}

/** The piece open in a box (`editable`), and what it stood for. */
type OpenBox = {
  /** the drawn piece:  a `<p>`, a heading, an `<li>`, a `<td>` / `<th>` */
  piece: HTMLElement
  /** the box, in place of its own content */
  field: HTMLElement
  /** its own content, put back as the box closes */
  own: ChildNode[]
  /** its text's place in the content as kept last (offsets into the whole text, `skip-title`'s title too) */
  place: MarkdownPlace
  /** its markdown as kept last */
  raw: string
  /** its markdown as the box opened:  what Escape puts back */
  opened: string
  /** the whole content as kept last:  a different one means it changed under the box */
  base: string
}

/** `editable="tabs"`:  Write / Preview tabs, not editing in place. */
const TABS = "tabs"

/** The attribute the engine marks an editable piece with:  its place's number (`MarkdownEngine`). */
const PLACE_ATTRIBUTE = "data-ui-place"

/** A piece that can be edited in place. */
const PLACED = `[${PLACE_ATTRIBUTE}]`

/** A box is kept this long after its last key, in seconds:  Owen's 5 (epic `epic-engine` C2). */
const KEEP_AFTER_SECONDS = 5

/** The keys that go to the box's start or end. */
const EDGE_KEYS = { Home: "start", End: "end" } as const

/** A list nested in a list item:  not part of the item's own text. */
const NESTED_LIST = /^(ul|ol)$/

/** A task item's box, as marked draws it. */
const TASK_BOX = "input[type=checkbox]"

/** `editable`'s Write tab:  the text box. */
const WRITE = "write"

/** `editable`'s Preview tab:  the article. */
const PREVIEW = "preview"

/** `editable`'s tabs, in order;  each is also its text's key. */
const MarkdownTabs = [WRITE, PREVIEW] as const

/** One of `MarkdownTabs`. */
type MarkdownTab = (typeof MarkdownTabs)[number]

/** `editable`'s tab roles. */
const TAB_ROLES = { list: "tablist", tab: "tab", panel: "tabpanel" } as const

/**
 * A leading `#` title (`skip-title`), with its line end:
 * blank lines, then an ATX `# Title` (one `#`) or a setext title (a line underlined with `=`).
 */
const LEADING_TITLE = /^(?:[ \t]*\n)*[ ]{0,3}(?:#(?=[ \t\n]|$)[^\n]*|[^\s][^\n]*\n[ ]{0,3}=+[ \t]*)(?:\n|$)/

/** A fenced code block, as both engines write it. */
const CODE_BLOCK = "pre > code"

/** An inline code span:  any `<code>` outside a code block (the blocks are `<ui-code>`s by then). */
const INLINE_CODE = ":not(pre) > code"

/** Longest inline code span kept on one line, in characters:  a token name (`--ui-button-padding-block`) fits a phone's line. */
const SHORT_CODE_LENGTH = 28

/** Class of a short inline code span. */
const SHORT_CLASS = "short"

/** A code block's language, from its class:  `language-js` => `js`. */
const LANGUAGE_CLASS = /\blanguage-(\S+)/

/** Tag a fenced code block becomes. */
const CODE_TAG: (typeof codeVocabulary)["tag"] = "ui-code"

/** `<ui-code>`'s highlighting language. */
const LANGUAGE: E.AttributeName<typeof codeVocabulary> = "language"

/** `<ui-code>`'s copy button. */
const COPY: E.AttributeName<typeof codeVocabulary> = "copy"

/** Task-list checkboxes:  marked's (`<input>`), and a `ui-*` engine's (`<ui-checkbox>`:  `<spell-markdown>`'s). */
const TASK_BOXES = "li > input[type=checkbox], ui-item > ui-checkbox"

/**
 * Attributes rewritten against `source`, so relative links and images point where they did beside the file.
 * - Not the element core's `E.URL_ATTRIBUTES`:  markdown writes only these two, and keeps no originals to save.
 */
const LINK_ATTRIBUTES = ["href", "src"] as const

/** A link to a `#id` on this page. */
const IN_PAGE_LINK = "a[href^='#']"
