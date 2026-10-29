import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

import { PageStages, PhaseIds, type PlanningStage } from "spell/epic/phases"

// Import directly:  the page's signals, not its family's barrel (which would define `<epic-page>` here)
import { EpicPage } from "spell/epic/components/epic-page/EpicPage"
import { SHOW_NOTE, stopIfOwn } from "spell/epic/components/epic-review/EpicReview.types"
// the fold pieces every `<epic-*>` fold shares:  their files, not `epic-item`'s barrel
import { CONTROLS, DEEP_TIPS, Fold, expandAllUnder, foldAllUnder } from "spell/epic/components/epic-item/Fold"

import {
  BODY,
  FILE_PROTOCOL,
  NOTE,
  STACK_PROPERTY,
  type ContentsEntry,
  type FoldAttributes,
  type FoldToggleDetail,
  type SectionStack
} from "./EpicSection.types"

/****************
 * ### `DOMEpicFoldElement`
 * The DOM element of a folding component:
 * `DOMLoadableBodyElement` (`load()`, `reload()`), plus `contentsEntry`, what the page's rail shows for it.
 * - Before its first render (no component yet):  `undefined`;  the runtime falls back on its attributes.
 * - Above `EpicFold`:  its `elementSetup` reads it while the class is defined.
 ****************/
export class DOMEpicFoldElement extends E.DOMLoadableBodyElement<EpicFold<any>> {
  /** What the rail shows for it;  untracked (the whole call, so a subclass's `contentsEntry()` too). */
  @E.untracked
  get contentsEntry(): ContentsEntry | undefined {
    return this.component?.contentsEntry()
  }
}

/****************
 * ### `EpicFold`
 * Base of the epic page's FOLDING components -- `<epic-overview>`, `<epic-section>`, `<epic-phase>`:
 * a title bar that sticks and folds, over the element's own children.
 * - The chrome is a `<ui-section sticky collapsible>` in the shadow root (`renderFold()`):
 *   - its title bar drawn from the subclass's pieces
 *   - the element's light children show through a `<slot>` inside it, wrapped in the `body` part
 * - So Spell UI's section brings:
 *   - the sticky stack:  nested titles stack below their parents', across these shadow roots
 *     (its owner lookup climbs the flat tree)
 *   - the fold chevron, at the row's start, as an item's line has it (Owen, 2026-10-25)
 *   - `hidden="until-found"`:  find-in-page and `#links` unfold it
 * - Folding:  `open` (page state, never in a doc:  epic pages open folded), `@controlled`.
 *   - The inner section's own `ui-opening` / `ui-closing` are CANCELLED and stopped there:
 *     the DOM element announces its own (cancelable), then `open` changes and the inner section follows.
 *   - Find-in-page (`beforematch`, not cancelable) is adopted.
 * - ⌥-click (Alt-click) on its chevron or title, or ⌥+Enter / ⌥+Space on its focused chevron (epic `epic-engine` I161;
 *   Owen, 2026-10-29:  "holding down option is 'expand all'"):  `toggleDeep()`
 *   - folded:  opens it and everything inside it, parts loading as they open (`expandAll()`)
 *   - open:  folds everything inside it, and then itself (`foldAll()`)
 *   - each open is the reader's, as a click's:  the page remembers the blocks' and items' folds
 *   - the chevron's tooltip says so (`DEEP_TIPS`, on `<ui-section>`'s `toggleTipMore`)
 *   - before:  a double-chevron toggle-all button in its title row (airplane P8, Owen 2026-10-20 / 2026-10-25),
 *     gone with I161;  `<epic-page>`'s toolbar keeps one, which has no chevron to hold
 * - Its title row's empty space folds it too (`onTitleRowClick()`), and shows the pointer;  a to-do phase on a reviewed
 *   page shows the grab cursor there instead, where it drags (`PhaseDrag`, `EpicPhase.css`)
 * - Sticky line:  a top-level fold sticks below the page header (`EpicPage.signalsOf(page).top`);
 *   a nested one below its parent's title (the inner sections stack themselves).
 *   Its children get `--epic-stack`, the bottom of the stuck titles above them (px from the viewport top),
 *   for their own sticky lines (`<epic-item>`'s).
 * - Source:  `source="parts/p3.html"` is fetched the first time it opens (`LoadableBody`, as `<ui-section source>`).
 *   - into the DOM element's LIGHT children, replacing any placeholder;  `ui-loaded` then
 *   - the inner section stays folded while the part is on its way (`isVeiled`), so it opens on the body
 *   - from `file://` it can't load:  the `Loads from parts/x.html when opened (needs the page server)` note, as today
 * - Links:  the page's `#hash` naming it, an element inside it, or an id in its `part-ids` opens it (loading its
 *   part);  the page lands there, once, below the stuck titles (the docs runtime, on Spell UI's `HashLanding`).
 * - The page's own buttons for its title (`slot="actions"`, `Fold.types.ts`):  first at the title's end, before its
 *   own tools (the badge, a phase's estimate, stays just after the title, where `<ui-section>` draws it).
 *   A click on one never folds:  `<ui-section>`'s actions never do.
 * - Its title (Owen, 2026-10-19:  "always show the full title, wrapped"):  in full, as many lines as it needs,
 *   folded or open;  the buttons sit on its first line.
 * - The DOM element's own `title` (a phase's, a sub-section's) would be a browser tooltip over all its content:
 *   the wrapper's EMPTY `title` stops it there (T8).
 * - The rail:  its DOM element's `contentsEntry` (`DOMEpicFoldElement`) is what the page's rail shows for it
 *   (`spell-doc-runtime.js` reads it):  its title as drawn, its icon, a section's count.
 * - SIDE EFFECT:  with `source`, replaces its own light children (a placeholder) with the part;
 *   listens for `hashchange` while connected.
 * - Position in the import graph:  `spell/ui/core` and `EpicPage` (for the page's signals) only;
 *   subclasses in other families import THIS file directly, never the `epic-section` barrel.
 ****************/
export abstract class EpicFold<V extends E.ComponentVocabulary> extends E.UIComponent<V> {
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
    DOMElement: DOMEpicFoldElement,
    // a container:  a click on its text must not jump to the fold button or a link inside
    delegatesFocus: false
  }

  /** Light-DOM slot occupancy:  its children, its `actions` slot's buttons, a subclass's own slots. */
  readonly slots = new E.SlotContent(this.domElement)

  ////////////////
  // ## Folding
  ////////////////

  /** Unfolded:  `open`, the DOM element's when set, else internal (starts folded). */
  @E.cssState("open")
  @E.controlled("open")
  accessor isOpen = false

  /**
   * Open or folded, as `open` (`isOpen`;  the kit's `Disclosure`):  the cancelable `ui-opening` / `ui-closing` first.
   */
  readonly disclosure = new E.Disclosure({
    component: this,
    member: "isOpen",
    detail: (open, originalEvent): FoldToggleDetail => ({ open, element: this.domElement, originalEvent })
  })

  /**
   * Fold or unfold as the user would:  the cancelable `ui-opening` / `ui-closing` first, then `open`.
   * - true when applied
   */
  toggle(originalEvent?: Event): boolean {
    return this.disclosure.toggle(originalEvent)
  }

  /**
   * Unfold for a link or find-in-page, and load its part:  `ui-opening` after the fact (not cancelable).
   * Resolves once the part is in (at once without one).
   * - NEVER rejects:  a part that can't load shows its note.
   */
  reveal(): Promise<void> {
    this.disclosure.adopt(true)
    return this.foldAttrs.source ? this.body.load().catch(() => undefined) : Promise.resolve()
  }

  /** Fold it, if open, as a click on its title would (`toggle()`);  true when it folded. */
  collapse(): boolean {
    return this.disclosure.close()
  }

  /** Open it, if folded, as a click on its title would (`toggle()`);  true when it opened.  Expand-all's. */
  expand(): boolean {
    return this.disclosure.open()
  }

  /**
   * ⌥-click on its chevron or title (`Fold.toggleFrom()`):  folded, open it and everything inside (`expandAll()`);
   * open, fold everything inside and then itself (`foldAll()`).
   */
  @E.untracked
  toggleDeep(): void {
    if (this.isOpen) this.foldAll()
    else void this.expandAll()
  }

  /** Fold everything inside it (`collapseAll()`), then itself, as a click would;  how many it folded, itself too. */
  @E.untracked
  foldAll(): number {
    return this.collapseAll() + (this.collapse() ? 1 : 0)
  }

  /**
   * Collapse-all:  fold everything inside it, itself staying open (`foldAll()`'s first step).
   * - what folds:  nested blocks, items, cards, asides, code (`foldAllUnder()`),
   *   and its own boxes (`foldOwnBoxes()`)
   * - its title stuck (the reader is inside it):
   *   the page scrolls first, so the title stays where it is and what folds goes away below it
   *   (as the docs runtime's `keepTitlePut()`, `spell-doc-runtime.js`)
   * - Returns how many it folded.
   */
  @E.untracked
  collapseAll(): number {
    this.keepTitlePut()
    return foldAllUnder(this.domElement) + this.foldOwnBoxes()
  }

  /**
   * Expand-all, ⌥-click on its folded chevron (`toggleDeep()`):  open it and everything inside it.
   * - itself first, as a click would (`expand()`), its part loaded
   * - then, round by round:  every section, phase and item inside, through its `expand()`, and every card and panel
   *   (`expandAllUnder()`, `cards`);  each part loaded before the next round, which opens what it brought
   *   (`EXPAND_ROUNDS` at most:  Overview > sub-section > item > aside is four)
   * - Resolves with how many it opened;  NEVER rejects:  a part that can't load shows its note.
   */
  @E.untracked
  async expandAll(): Promise<number> {
    let opened = this.expand() ? 1 : 0
    if (!this.isOpen) return 0
    if (this.foldAttrs.source) await this.body.load().catch(() => undefined)
    for (let round = 0; round < EXPAND_ROUNDS; round++) {
      const now = expandAllUnder(this.domElement, { cards: true })
      const parts = Array.from(this.domElement.querySelectorAll(`[${SOURCE}]`), (element) => {
        const component = (element as Partial<E.DOMElement>).component as { loadBody?: () => Promise<void> } | undefined
        return component?.loadBody ? component.loadBody().catch(() => undefined) : Promise.resolve()
      })
      await Promise.all(parts)
      opened += now
      if (!now) break
    }
    return opened
  }

  /** Fold the boxes it draws itself (in its shadow root), for `collapseAll()`;  how many it folded.  None by default. */
  protected foldOwnBoxes(): number {
    return 0
  }

  /** Its top scrolled past where its title sticks:  scroll at once so its top is there, the title not moving. */
  private keepTitlePut() {
    const stickTop = this.inner?.stickTop
    if (stickTop === undefined) return
    const top = this.domElement.getBoundingClientRect().top
    if (top >= stickTop - 1) return
    window.scrollTo({ top: window.scrollY + top - stickTop, behavior: "instant" })
  }

  /** The inner section, as it's drawn:  read its stack once it's ready;  its title row's clicks (`onTitleRowClick()`). */
  private readonly watchInner = (element: HTMLElement) => {
    const section = element as E.DOMElement
    void section.ready.then(() => (this.inner = section.component as unknown as SectionStack))
    element.addEventListener("click", (event) => this.onTitleRowClick(event, element))
    element.addEventListener("keydown", (event) => this.onToggleKey(event, element))
  }

  /** ⌥+Enter or ⌥+Space on its fold button (`Fold.deepKey()`):  `toggleDeep()`, as ⌥-click. */
  private onToggleKey(event: KeyboardEvent, section: Element) {
    const onToggle = EpicFold.titleRowPath(event, section)?.some((node) => EpicFold.hasPart(node, "toggle"))
    if (onToggle && Fold.deepKey(event)) this.toggleDeep()
  }

  /**
   * The elements `event` passed through inside `section`'s OWN title row, innermost first;  `undefined` when it
   * didn't start there (its body, or a nested fold's title row, whose events bubble out through it).
   */
  private static titleRowPath(event: Event, section: Element): Element[] | undefined {
    const path = event.composedPath()
    const title = path.findIndex(
      (node) => node instanceof Element && node.getRootNode() === section.shadowRoot && EpicFold.hasPart(node, "title")
    )
    return title < 0 ? undefined : path.slice(0, title).filter((node): node is Element => node instanceof Element)
  }

  /**
   * A click on its title row, but not on the fold button (`<ui-section>`'s own, which folds by itself):  the row's
   * empty space, its badge, an estimate pill, the gaps between its buttons fold it too, ⌥ as on the chevron
   * (Owen, 2026-10-29:  the empty space is part of the header)
   * - NOT on a control (`CONTROLS`, any `<ui-button>` or `<epic-review>`), nor a drag that selected words
   * - a native listener on the inner section:  its shadow root's path is open to it (`composedPath()`)
   */
  private onTitleRowClick(event: MouseEvent, section: Element) {
    if (event.defaultPrevented) return
    const inTitle = EpicFold.titleRowPath(event, section)
    if (!inTitle) return
    for (const node of inTitle) {
      if (EpicFold.hasPart(node, "toggle") || node.matches(TITLE_ROW_CONTROLS)) return
      // the page's own actions slot (its box, `slot="actions"`), not the inner section's slot its tools go through
      if (node.localName === "slot" && node.getRootNode() === this.domElement.renderRoot && node.matches(CONTROLS))
        return
    }
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed && String(selection)) return
    if (Fold.isDeep(event)) this.toggleDeep()
    else this.toggle(event)
  }

  /** `node`'s `part` names hold `name`. */
  private static hasPart(node: Element, name: string): boolean {
    return (node.getAttribute("part") ?? "").split(/\s+/).includes(name)
  }

  /**
   * The inner section's own `ui-opening` / `ui-closing` (the title clicked, or find-in-page):
   * this element's `ui-opening` / `ui-closing` instead.
   * - Heard on the shadow root, which the inner section's events reach on their way out.
   * - A nested fold's events bubble through here too (its DOM element is slotted inside),
   *   and so do those of a `<ui-section>` among the light children:
   *   only the inner section's own, the one sender in this shadow root.
   * - Cancelable (a click):  cancelled and stopped, then `toggle()`;  not (find-in-page):  adopted, and stopped.
   */
  @E.on("ui-opening", { target: "renderRoot" })
  @E.on("ui-closing", { target: "renderRoot" })
  protected onInnerToggle(event: Event) {
    const detail = (event as CustomEvent<{ section?: Element; originalEvent?: Event }>).detail
    const sender = event.target as Node
    if (sender.getRootNode() !== event.currentTarget || detail?.section !== sender) return
    event.stopPropagation()
    if (!event.cancelable) {
      void this.reveal()
      return
    }
    event.preventDefault()
    // ⌥-click (or ⌥+Enter / ⌥+Space) on the chevron or title:  everything inside too
    if (Fold.isDeep(detail.originalEvent)) this.toggleDeep()
    else this.toggle(detail.originalEvent)
  }

  /** The inner section's fold button's tooltip ends with what ⌥-click does (`DEEP_TIPS`), as every fold's does. */
  @E.onChange("isOpen", "inner")
  protected onTipShown(open: boolean, inner: SectionStack | undefined) {
    if (inner) inner.toggleTipMore = open ? DEEP_TIPS.fold : DEEP_TIPS.open
  }

  /**
   * Revisit or Edit, pressed on its own review controls (`<epic-review>`):  unfolded, its part loaded, to show the
   * note box.
   * - the Overview's, a section's, a phase's:  each draws its review controls in its shadow root
   */
  @E.on(SHOW_NOTE, { target: "renderRoot" })
  protected onShowNote(event: Event) {
    if (stopIfOwn(event)) void this.reveal()
  }

  ////////////////
  // ## Sticking
  ////////////////

  /** The inner `<ui-section>`'s component, once it has rendered:  its sticky line and stack. */
  @E.state accessor inner: SectionStack | undefined = undefined

  /** The `<epic-page>` around it, once connected;  `null` outside one. */
  get page(): Element | null {
    return this.isConnected ? this.domElement.closest(EpicPage.TAG) : null
  }

  /** Where a top-level title sticks:  below the site header and the page header, px from the viewport top. */
  get offset(): number {
    const page = this.page
    return page ? EpicPage.signalsOf(page).top.get() : 0
  }

  /** The bottom of the stuck titles over its children, px from the viewport top. */
  get stack(): number {
    return this.inner?.innerStackTop ?? this.offset
  }

  /** The page's layout counter:  bumped when sections come or go, or a phase changes (`EpicPage`). */
  get layout(): number {
    const page = this.page
    return page ? EpicPage.signalsOf(page).layout.get() : 0
  }

  ////////////////
  // ## Source (`DOMLoadableBodyElement`)
  ////////////////

  /** The children from `source`, loaded the first time it opens;  into the DOM element's light DOM. */
  readonly body = new E.LoadableBody({
    domElement: this.domElement,
    source: () => this.partSource(),
    select: () => undefined,
    target: () => this.domElement,
    send: (name, detail) => this.send(name as never, detail)
  })

  /** Its `source`, for `body`:  untracked, so a load never follows it. */
  @E.untracked
  private partSource(): string | undefined {
    return this.foldAttrs.source || undefined
  }

  /** Load the `source` part whenever it's open and connected (every fold's vocabulary has `source`). */
  @E.onChange("source", "isOpen", "isConnected")
  protected onSourceShown(source: string | undefined, open: boolean, connected: boolean) {
    if (source && open && connected) this.body.load().catch(() => undefined)
  }

  /** Inner section held folded while the `source` part is on its way. */
  get isVeiled(): boolean {
    return !isServer && !!this.foldAttrs.source && this.body.isVeiled
  }

  /** The `source` part arrived. */
  @E.cssState("loaded")
  get bodyIsLoaded(): boolean {
    return this.body.loadStatus === E.SourceStatus.loaded
  }

  /** The `source` part failed. */
  @E.cssState("error")
  get bodyFailed(): boolean {
    return this.body.loadStatus === E.SourceStatus.error
  }

  /** The note when the `source` part failed;  else `undefined`. */
  get failureText(): string | undefined {
    const failure = this.body.loadError
    if (!failure) return undefined
    const source = this.foldAttrs.source ?? ""
    return this.translationForKey((failure.kind === FILE_PROTOCOL ? "partNote" : "partError") as never, { source })
  }

  /** Fetch and insert the `source` part now, folded or not;  once per `source`. */
  loadBody(): Promise<void> {
    return this.body.load()
  }

  /** Fetch the `source` part again past the cache, and replace it (the live update). */
  reloadBody(): Promise<void> {
    return this.body.reload()
  }

  /** Its attributes as fold code reads them, whatever the vocabulary:  every fold's vocabulary has these. */
  protected get foldAttrs(): FoldAttributes {
    return this as unknown as FoldAttributes
  }

  ////////////////
  // ## Rendering
  ////////////////

  /**
   * The fold:  the inner `<ui-section>` around the subclass's title pieces, the part note and the children.
   * - `title`:  the header's content (`slot="label"` of the inner section):  in full, wrapping, folded or open
   * - `mark`:  after the title, on its first line, never cut (a phase's plan-changed pen)
   * - `icon`:  its icon
   * - `tools`:  what goes at the title's end (`slot="actions"` of the inner section), after the page's own buttons
   *   (its `actions` slot)
   * - `badge`:  its badge text
   * - `before`:  content above the children (the Overview's summary)
   */
  protected renderFold(pieces: FoldPieces): JSX.Element {
    return (
      // an EMPTY title:  the DOM element's `title` would otherwise be a tooltip over all of it (T8)
      <div class={this.rootClass} part={this.partForName("base" as never)} title="" style={this.foldStyle()}>
        <ui-section
          ref={this.watchInner}
          part={this.partForName("section" as never)}
          sticky=""
          collapsible=""
          // `"false"` folds it;  a bare `false` is written as no attribute, which is open (the default).
          open={this.isOpen && !this.isVeiled ? undefined : "false"}
          loading={this.body.isBusy ? "" : undefined}
          offset={this.offset}
          badge={pieces.badge?.() || undefined}
        >
          <Show when={pieces.icon}>
            <span slot="icon" class="icon">
              {pieces.icon!()}
            </span>
          </Show>
          {/* in full, wrapped, folded or open (EpicFold.css) */}
          <span slot="label" class="header">
            <span class="words">{pieces.title()}</span>
            {pieces.mark?.()}
          </span>
          {/* the page's own buttons first, then its tools;  no toggle-all:  ⌥-click on the chevron (I161) */}
          <span slot="actions" class="tools" part={this.partForName("tools" as never)}>
            <slot name={this.slotForName("actions" as never)} />
            {pieces.tools?.()}
          </span>
          <div class={BODY} part={this.partForName("body" as never)} style={{ [STACK_PROPERTY]: `${this.stack}px` }}>
            <Show when={this.failureText}>
              <p class={NOTE} part={this.partForName("note" as never)}>
                {this.failureText}
              </p>
            </Show>
            {pieces.before?.()}
            <slot />
            {pieces.after?.()}
          </div>
        </ui-section>
      </div>
    )
  }

  /** Buttons in its `actions` slot (the page's own)? */
  get hasActions(): boolean {
    return this.slots.hasContent(this.slotForName("actions" as never))
  }

  /** Inline style of the base box:  custom properties its children inherit;  none by default. */
  protected foldStyle(): Record<string, string> | undefined {
    return undefined
  }

  ////////////////
  // ## Its stage button (epic `epic-engine` I180)
  ////////////////

  /**
   * The STAGE BUTTON for its title row (`<epic-stage-button>`):  "Accept Overview" on the Overview's, "Accept Phases"
   * on the Phases section's, where the work it accepts is (Owen, 2026-10-29, on the green pill in Send's place:  "This
   * should just be normal paper plane").
   * - only while `reviewing()` and its page is in `stage`;  on the title row, so it's there while folded
   * - its tooltip counts the page's open questions (`PageStages.openQuestions()`), read again on every layout change
   * - its `part`:  `stage-button`;  a click on it never folds the row (`TITLE_ROW_CONTROLS`)
   */
  protected renderStageButton(stage: PlanningStage, reviewing: () => boolean): JSX.Element {
    const shown = () => {
      void this.layout
      return reviewing() && PageStages.of(this.page) === stage
    }
    const open = () => {
      void this.layout
      return PageStages.openQuestions(this.page)
    }
    return (
      <Show when={shown()}>
        <epic-stage-button stage={stage} open={open()} part={this.partForName("stage-button" as never)} />
      </Show>
    )
  }

  ////////////////
  // ## Its gear (epic `epic-engine` I166)
  ////////////////

  /**
   * A GEAR for its title row's end:  a round gear button opening a menu of ticked entries (Owen, 2026-10-29:  "we can
   * change the 'expand all' to a gear icon which shows menu").
   * - Spell UI's own menu:  a `<ui-dropdown>`, its trigger a `<ui-button>`, its menu opening leftwards, no caret
   *   - each entry a `<ui-item>`, a ticked box while on, an empty one while off
   *   - a pick calls `gear.pick(value)`;  the dropdown keeps no value, so the same entry picks again next time
   * - Drawn by the Phases section (every phase's fields) and each phase (its own), as their tools' last piece;  the
   *   entries are a LIST the subclass builds (`GearEntry`), so a new setting is one more entry
   * - its `part`:  `gear`;  its look:  `EpicFold.css` (`.gear`)
   * - a click on it never folds the row (`TITLE_ROW_CONTROLS`)
   */
  protected renderGear(gear: GearPieces): JSX.Element {
    return (
      <ui-dropdown
        class={GEAR}
        part={this.partForName("gear" as never)}
        direction="left"
        title={gear.title()}
        aria-label={gear.title()}
        on-ui-changed={(event: CustomEvent<{ value: string | string[] }>) => this.onGearPick(event, gear)}
      >
        {/* named too:  the dropdown's own button takes the focus, but this one is a button all the same */}
        <ui-button
          slot="trigger"
          appearance="circular basic"
          size="mini"
          icon="gear"
          tabindex="-1"
          aria-label={gear.title()}
        />
        {/* no caret:  the gear says it's a menu */}
        <span slot="icon" />
        <For each={gear.entries()} keyed={(it) => it.value}>
          {(it) => (
            <ui-item value={it().value} icon={it().isOn ? GEAR_TICKED : GEAR_UNTICKED}>
              {it().text}
            </ui-item>
          )}
        </For>
      </ui-dropdown>
    )
  }

  /** An entry of its gear picked:  the subclass acts on it, and the dropdown lets go of its value, to pick again. */
  @E.untracked
  private onGearPick(event: CustomEvent<{ value: string | string[] }>, gear: GearPieces) {
    const value = String(event.detail.value)
    const dropdown = event.currentTarget as HTMLElement & { value: string }
    if (value) gear.pick(value)
    // picked again next time:  a dropdown tells only of a new value
    E.afterSolidUpdate(() => (dropdown.value = ""))
  }

  /**
   * What the page's rail shows for it (`DOMEpicFoldElement.contentsEntry`):
   * by default its title, its id when it has none.
   * - read by the docs runtime (`spell-doc-runtime.js`), outside any render, right after a live update patched the page:
   *   so from the page as it is NOW (attributes, children), never a value that hasn't caught up
   */
  contentsEntry(): ContentsEntry {
    return { label: EpicFold.titleText(this.domElement) }
  }

  /** `element`'s title as text, as it is now:  its `slot="title"` child's text, else `title`, else its id. */
  protected static titleText(element: Element): string {
    const slotted = element.querySelector(':scope > [slot="title"]')?.textContent
    return (slotted ?? element.getAttribute("title") ?? element.id).replace(/\s+/g, " ").trim()
  }

  ////////////////
  // ## Links
  ////////////////

  /** The address's own `#hash` was followed:  a fold that moves doesn't open for it again as it reconnects. */
  private hasFollowedHash = false

  /** While connected, follow links (`hashchange`);  the first time, the address's own `#hash` too.  Returns the undo. */
  @E.whileConnected
  protected watchHash() {
    const listeners = new AbortController()
    window.addEventListener("hashchange", this.followHash, { signal: listeners.signal })
    if (!this.hasFollowedHash) {
      this.hasFollowedHash = true
      this.followHash()
    }
    return () => listeners.abort()
  }

  /**
   * The page's `#hash` names this element, an element inside it, or an id in its `part-ids`:  open it, loading its
   * part.
   * - it never scrolls:  the page lands the link, once, by its own rules (the docs runtime, on Spell UI's
   *   `HashLanding`), which open the folds around it too;  opening here serves a page whose lander doesn't know epic
   *   folds (Epic UI's pages, the site's `SiteSections`)
   */
  @E.untracked
  private readonly followHash = () => {
    // an old phase address (`#p7`, from before stable ids) is the 7th phase (`PhaseIds.landing()`)
    const id = PhaseIds.landing(document, decodeURIComponent(location.hash.slice(1)))
    if (!id) return
    const partIds = (this.foldAttrs.partIds ?? "").split(/\s+/)
    const element = document.getElementById(id)
    const inside = !!element && element !== this.domElement && this.domElement.contains(element)
    if (element !== this.domElement && !inside && !partIds.includes(id)) return
    void this.reveal()
  }
}

/** What a subclass draws in its fold (`EpicFold.renderFold()`);  each a function, read where it's drawn. */
export type FoldPieces = {
  /** The title:  number, id and text;  in full, wrapped, folded or open. */
  title: () => JSX.Element
  /** After the title, on its first line:  a phase's plan-changed pen. */
  mark?: () => JSX.Element
  /** The icon before it. */
  icon?: () => JSX.Element
  /** Controls at the title's end. */
  tools?: () => JSX.Element
  /** The badge text (a phase's estimate). */
  badge?: () => string | undefined
  /** Content above the children. */
  before?: () => JSX.Element
  /** Content below the children. */
  after?: () => JSX.Element
}

/** What a subclass hands its gear (`EpicFold.renderGear()`). */
export type GearPieces = {
  /** its entries, in order;  read where they're drawn */
  entries: () => readonly GearEntry[]
  /** its tooltip and name */
  title: () => string
  /** an entry picked:  its `value` */
  pick: (value: string) => void
}

/** One entry of a gear's menu. */
export type GearEntry = {
  /** what a pick hands the subclass */
  value: string
  /** its words */
  text: string
  /** ticked */
  isOn: boolean
}

/** Class of a gear's dropdown;  an entry's icon while on, and while off. */
const GEAR = "gear"
const GEAR_TICKED = "square check"
const GEAR_UNTICKED = "square outline"

/** The rounds of `expandAll()` at most:  each opens one level deeper, once the level above has loaded its parts. */
const EXPAND_ROUNDS = 6

/** What, in a title row, acts by itself:  a click there doesn't fold (`onTitleRowClick()`). */
const TITLE_ROW_CONTROLS =
  "a[href], button, input, select, textarea, label, summary, [role='button'], [contenteditable], ui-button, " +
  "ui-dropdown, epic-review, epic-stage-button"

/** The attribute naming a fold's or an item's part file. */
const SOURCE = "source"
