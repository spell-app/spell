import { For, Show, createMemo } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI } from "spell/ui/core"

import { PhaseIds } from "spell/epic/phases"
// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"
// the page's colour rules and the chips' event:  their files, not their families' barrels
import { EpicBodies } from "spell/epic/components/epic-item/EpicBodies"
import { DrawnState, isTodo } from "spell/epic/components/epic-item/EpicItem.types"
import { PhaseState } from "spell/epic/components/epic-section/PhaseState"
import { STATE_PICK, type StatePickDetail } from "spell/epic/components/epic-state-filter/EpicStateFilter.types"

import { epicFocusVocabulary } from "./EpicFocus.en"
import { FocusList, type FocusReads } from "./FocusList"
import { FocusPlace } from "./FocusPlace"
import {
  FOCUS_KINDS,
  FOCUS_TOGGLED,
  type EpicFocusVocabulary,
  type FocusAsk,
  type FocusEntry,
  type FocusKind,
  type FocusKindLook,
  type FocusPlaceData,
  type FocusToggledDetail
} from "./EpicFocus.types"

import focusCSS from "./EpicFocus.css?inline"

/****************
 * ### `DOMEpicFocusElement`
 * The DOM element of `<epic-focus>`:  its script API, which `<epic-page>` calls (the gear's Focus mode, Start testing).
 * - Above `EpicFocus`:  its `elementSetup` reads it while the class is defined.
 ****************/
export class DOMEpicFocusElement extends E.DOMElement<EpicFocus> {
  /** Open it:  on `ask`'s tab and item, else where it was left.  Nothing before its component exists. */
  show(ask?: FocusAsk): void {
    this.component?.show(ask)
  }

  /** Close it, keeping its place. */
  close(): void {
    this.component?.close()
  }

  /** It's showing. */
  get open(): boolean {
    return this.component?.isOpen ?? false
  }
}

/****************
 * ### `EpicFocus`
 * The component behind `<epic-focus>`:  FOCUS MODE (epic `epic-engine` P57;  Owen, 2026-10-30:  "a mode where I can
 * quickly walk through the open issues/questions/etc in a plan"), a full-screen overlay over the epic page around it.
 * - Spell UI's `<ui-modal fullscreen overlay>`:  the browser's top layer, the page inert under it;  Escape and its ×
 *   close it (`closedby="closerequest"`:  a click on nothing never does)
 * - WHICH ITEMS (`FocusList`):  the page's open ones by its own colour rule, a tab per kind (Phases, Questions,
 *   Todos, Calls, Issues, Tests), each with its count
 * - THE CHIPS:  the section's own `<epic-state-filter>` per tab, the same click rule (`StateFilter.nextShown()`,
 *   ⌥-click for only that colour);  each tab's choice its own, apart from the sections'
 * - THE ITEM:  its id chip, title and whole text, COPIED from the page (its part file through the same read the page's
 *   bodies load by, `EpicBodies`):  the page's item never moves
 *   - a link in it closes the overlay and lands on the page (`onBodyClick()`)
 * - ITS BUTTONS:  an `<epic-review>` for it, the buttons kind the page draws it with, and its note box, on the page's
 *   one review client:  the same marks, the same Send
 * - Back and Next, ← and →:  a press keeps you on the item;  Next moves on, a tab's last to the next tab's first
 *   - the item showing stays while Claude closes it (`FocusList.of()`'s `pinned`), until you move on
 * - "3 of 12 · Questions 1 of 3" says where you are
 * - KEEPS ITS PLACE in this browser (`FocusPlace`):  open, tab, item, chips, across reloads
 * - the page's Send rides in its top bar while it's open (`slot="send"`):  the top layer covers the page's header
 * - Drawn by `<epic-page>` in its shadow root, only while the page is reviewed;  never written in a page.
 *   It finds its page as its shadow root's host.
 * - SIDE EFFECT:  watches its page's items while open (their states change as Claude works);  writes the place kept.
 ****************/
export class EpicFocus extends E.UIComponent<EpicFocusVocabulary> {
  @E.proto static vocabulary = epicFocusVocabulary
  @E.protoMerged static elementSetup = {
    DOMElement: DOMEpicFocusElement,
    styleSheets: { "epic-focus": focusCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## State
  ////////////////

  /** The place kept for this page as it loaded:  the starting values below. */
  private readonly kept: FocusPlaceData = isServer ? {} : FocusPlace.read(location.pathname)

  /** Showing. */
  @E.cssState("open")
  @E.state
  accessor isOpen = false

  /** The tab asked for, when no item is:  its first item shows. */
  @E.state accessor askedTab: FocusKind | undefined = this.kept.tab

  /** The item showing, by id:  pinned, so it stays while Claude closes it. */
  @E.state accessor current: string | undefined = this.kept.item

  /** Each tab's chips:  the states showing;  a tab without, every one. */
  @E.state accessor shown: Partial<Record<FocusKind, string[]>> = this.kept.shown ?? {}

  /** Bumped when the page's items change while open:  the lists read them again. */
  @E.state accessor pageTick = 0

  /** The page's view of the review inbox:  the states, the marks. */
  readonly review = new ReviewState(() => undefined)

  /** The modal, as drawn. */
  private modal: (HTMLElement & { visible?: boolean }) | undefined

  /** The item's text box, as drawn:  its copy goes in here. */
  private bodyBox: HTMLElement | undefined

  /** Counts body loads:  a newer one makes an older one's result moot. */
  private bodyGeneration = 0

  /** Its words while the text loads, or why it didn't. */
  @E.state accessor bodyNote = ""

  ////////////////
  // ## The items
  ////////////////

  /**
   * What it walks:  the `<epic-page>` around it (its shadow root's host);  with `for`, the element of that id (a live
   * example on a docs page, its sections in a box of their own).
   */
  get page(): Element | undefined {
    if (isServer || !this.isConnected) return undefined
    const named = this.for ? document.getElementById(this.for) : null
    const root = this.domElement.getRootNode() as Partial<ShadowRoot>
    return named ?? root.host ?? this.domElement.closest("epic-page") ?? undefined
  }

  /** How the list reads each element:  its state as the page draws it, and whether it's marked (both tracked). */
  private readonly reads: FocusReads = {
    stateOf: (element) =>
      element.localName === "epic-phase"
        ? PhaseState.of(PhaseState.fieldsOf(element), {
            workedOn: this.review.liveOf(element.id).workedOn,
            isSeen: (id) => this.review.markOf(id)?.action === "seen"
          })
        : DrawnState.of(DrawnState.fieldsOf(element), this.review.liveOf(element.id)),
    isMarked: (id) => this.review.isMarked(id)
  }

  /** Every open item, tab by tab, before the chips;  none while closed. */
  readonly entries = createMemo((): FocusEntry[] => {
    void this.pageTick
    const page = this.page
    if (!this.isOpen || !page) return []
    return FocusList.of(page, this.reads, this.current)
  })

  /** The tabs:  each kind with open items. */
  readonly tabs = createMemo((): FocusKindLook[] => FocusList.tabsOf(this.entries()))

  /** What shows, by the chips:  the order Back and Next walk. */
  readonly walk = createMemo((): FocusEntry[] => FocusList.visible(this.entries(), this.shown, this.current))

  /** The item showing:  the current one, else the asked tab's first, else the first. */
  readonly item = createMemo((): FocusEntry | undefined => {
    const walk = this.walk()
    return (
      walk.find((entry) => entry.id === this.current) ?? walk.find((entry) => entry.kind === this.askedTab) ?? walk[0]
    )
  })

  /** The tab showing:  the item's, else the one asked for, else the first. */
  get tab(): FocusKind | undefined {
    return this.item()?.kind ?? this.askedTab ?? this.tabs()[0]?.kind
  }

  /** The item showing's id:  what the body and the pin follow. */
  get shownId(): string | undefined {
    return this.item()?.id
  }

  ////////////////
  // ## Opening and closing
  ////////////////

  /** Open on `ask`'s tab and item, else where it was left. */
  @E.untracked
  show(ask?: FocusAsk) {
    if (ask?.tab) {
      this.askedTab = ask.tab
      this.current = ask.item
    }
    this.isOpen = true
  }

  /** Close it, keeping its place. */
  @E.untracked
  close() {
    this.isOpen = false
  }

  /**
   * Shown or hidden:  the modal follows;  the page hears of it (`epic-focus-toggled`, Send moves);  the place kept.
   * - its first run opens it again when it was left open (a reload), the page reviewed:  it's drawn only then
   */
  @E.onChange("isOpen", "isReady")
  protected followOpen(open: boolean, ready: boolean) {
    if (!ready || isServer) return
    const modal = this.modal
    if (modal) {
      // the modal's family may load after it's drawn:  its `visible` then
      void E.DOMElement.whenAttached("ui-modal").then(() => {
        if (modal.visible !== this.isOpen) modal.visible = this.isOpen
      })
    }
    this.send(FOCUS_TOGGLED, { open } satisfies FocusToggledDetail)
    this.keepPlace({ open })
  }

  /** Reopen as it was left (a reload), once connected and drawn. */
  @E.onChange("isReady")
  protected reopen(ready: boolean) {
    if (ready && this.kept.open && !this.isOpen) E.afterSolidUpdate(() => (this.isOpen = true))
  }

  /** The modal closed itself (Escape, its ×):  closed here too. */
  private readonly onModalClosed = () => {
    if (this.isOpen) this.isOpen = false
  }

  /** While open:  watch the page's items (their states, their coming and going), so the lists follow. */
  @E.onChange("isOpen")
  protected watchPage(open: boolean) {
    const page = this.page
    if (!open || !page) return undefined
    // oxlint-disable-next-line spell-ui/no-mutation-observer -- watches its PAGE, another element, only while open
    const observer = new MutationObserver(() => this.pageTick++)
    observer.observe(page, { subtree: true, childList: true, attributes: true, attributeFilter: WATCHED })
    return () => observer.disconnect()
  }

  /** Follow the review inbox while connected (kept alive:  a removed one must stop listening). */
  @E.whileConnected
  protected followReviews() {
    return this.review.connect()
  }

  ////////////////
  // ## Moving
  ////////////////

  /** The item showing moved:  pinned, and kept. */
  @E.onChange("shownId")
  protected pin(id: string | undefined) {
    if (!id || !this.isOpen) return
    if (this.current !== id) this.current = id
    this.keepPlace({ item: id, tab: this.item()?.kind })
  }

  /** Go `step` items on (1 Next, -1 Back) in the walk:  across tabs at a tab's ends;  none there, stays. */
  @E.untracked
  move(step: 1 | -1) {
    const walk = this.walk()
    // `current` first:  it's fresh, where the memos may not have taken a key pressed a moment ago yet
    const fresh = walk.findIndex((entry) => entry.id === this.current)
    const at = fresh >= 0 ? fresh : walk.findIndex((entry) => entry.id === this.shownId)
    const next = walk[at + step]
    if (!next) return
    this.askedTab = next.kind
    this.current = next.id
  }

  /**
   * A tab picked:  its first item, by its chips now.
   * - worked out afresh, not from `walk()`:  a chip clicked a moment ago hasn't reached that memo yet
   */
  @E.untracked
  pickTab(kind: FocusKind) {
    this.askedTab = kind
    this.current = FocusList.visible(this.entries(), this.shown).find((entry) => entry.kind === kind)?.id
  }

  /** ← and →:  Back and Next;  not while typing, nor with a modifier. */
  @E.on("keydown", { target: "renderRoot" })
  protected onKey(event: KeyboardEvent) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    if (EpicFocus.isTyping(event)) return
    event.preventDefault()
    this.move(event.key === "ArrowRight" ? 1 : -1)
  }

  ////////////////
  // ## The chips
  ////////////////

  /** A chip clicked:  that tab shows what the chips' rule says;  the item showing hidden, the tab's first. */
  @E.on(STATE_PICK, { target: "renderRoot" })
  protected onStatePick(event: CustomEvent<StatePickDetail>) {
    event.stopPropagation()
    const tab = this.tab
    if (!tab) return
    const present = new Set(
      this.entries()
        .filter((entry) => entry.kind === tab && !entry.marked)
        .map((it) => it.state)
    )
    const everything = [...present].every((state) => event.detail.shown.includes(state))
    const shown = { ...this.shown }
    if (everything) delete shown[tab]
    else shown[tab] = event.detail.shown
    this.shown = shown
    this.keepPlace({ shown })
    const item = this.item()
    const stillShows = item && FocusList.visible([item], shown).length > 0
    if (!stillShows) this.pickTab(tab)
  }

  /** The tab's entries' states, for its chips:  `attention:2 open:3`;  the marked ones apart. */
  private chipsOf(kind: FocusKind): { counts: string; marked: number; shown: string | undefined } {
    const entries = this.entries().filter((entry) => entry.kind === kind)
    const counts = new Map<string, number>()
    for (const { state } of entries.filter((entry) => !entry.marked)) counts.set(state, (counts.get(state) ?? 0) + 1)
    const shown = this.shown[kind]
    return {
      counts: [...counts].map(([state, count]) => `${state}:${count}`).join(" "),
      marked: entries.filter((entry) => entry.marked).length,
      shown: shown ? shown.join(" ") : undefined
    }
  }

  ////////////////
  // ## The item's text
  ////////////////

  /**
   * The item showing changed:  its text copied into the body box, from its part file when it has one (the read the
   * page's bodies load through, `EpicBodies`, uncached, so it's the part as it is now;  any other `source`,
   * `UI.sources`), else from its children on the page.
   * - NEVER throws:  a part that won't load says so in the box
   */
  @E.onChange("shownId", "isOpen", "isReady")
  protected loadBody(id: string | undefined, open: boolean, ready: boolean) {
    const box = this.bodyBox
    const element = this.item()?.element
    if (!box || !ready || !open || !element || isServer) return
    const generation = ++this.bodyGeneration
    box.replaceChildren()
    const source = element.getAttribute("source")
    if (!source) {
      box.append(...EpicFocus.copyOfBody(element))
      this.bodyNote = ""
      return
    }
    this.bodyNote = this.translationForKey("loading")
    const text =
      EpicBodies.loadText(source, {}) ??
      UI.load()
        .then((ui) => ui.sources.load(source))
        .then((loaded) => loaded.text)
    void text
      .then((loaded) => {
        if (generation !== this.bodyGeneration) return
        box.replaceChildren(E.SourceMarkup.parse(loaded, { page: document, source }))
        this.bodyNote = ""
      })
      .catch((failure: unknown) => {
        if (generation !== this.bodyGeneration) return
        console.error(`<epic-focus>:  ${id}'s text didn't load`, failure)
        box.replaceChildren(...EpicFocus.copyOfBody(element))
        this.bodyNote = box.childNodes.length ? "" : this.translationForKey("noText", { source })
      })
  }

  /**
   * A click in the item's text:  a link closes the overlay;  one to this page lands there (its `#id`), as a link on the
   * page would.
   */
  @E.untracked
  private onBodyClick(event: MouseEvent) {
    const link = event.composedPath().find((target) => (target as Element).localName === "a") as
      | HTMLAnchorElement
      | undefined
    if (!link?.href) return
    const url = new URL(link.href, location.href)
    const here = url.pathname === location.pathname && !!url.hash && !link.target
    this.close()
    if (!here) return
    event.preventDefault()
    // after the modal has let the page go:  the runtime lands the hash, unfolding what hides it
    void E.after(0.25, () => {
      location.hash = url.hash
    })
  }

  ////////////////
  // ## Drawing
  ////////////////

  render(): JSX.Element {
    return (
      <ui-modal
        ref={(modal: HTMLElement) => this.adoptModal(modal)}
        class="focus-modal"
        part={this.partForName("base")}
        fullscreen=""
        overlay=""
        closedby="closerequest"
        aria-label={this.translationForKey("heading")}
      >
        <div class={[this.rootClass, "focus"]}>
          <div class="bar top">
            {this.tabBar()}
            <span class="send">
              <slot name={this.slotForName("send")} />
            </span>
            <ui-button
              class="close"
              appearance="circular basic"
              size="mini"
              icon="xmark"
              aria-label={this.translationForKey("closeTip")}
              title={this.translationForKey("closeTip")}
              onClick={() => this.close()}
            />
          </div>
          <Show when={this.tab}>
            {(tab) => (
              <div class="bar chips">
                {this.chips(tab())}
                <span class="where" part={this.partForName("where")}>
                  {this.whereWords()}
                </span>
              </div>
            )}
          </Show>
          <div class="scroller">
            <Show when={this.item()} fallback={<p class="nothing">{this.translationForKey("nothing")}</p>}>
              {(item) => this.card(item)}
            </Show>
            <div
              ref={(box: HTMLElement) => (this.bodyBox = box)}
              class="body"
              part={this.partForName("body")}
              hidden={!this.item()}
              onClick={(event) => this.onBodyClick(event)}
            />
            <Show when={this.bodyNote}>
              <p class="body-note">{this.bodyNote}</p>
            </Show>
            <Show when={this.item()}>{(item) => this.noteBox(item)}</Show>
          </div>
          <div class="bar actions">
            <ui-button
              class="back"
              part={this.partForName("back")}
              appearance="basic"
              title={this.translationForKey("backTip")}
              disabled={this.atEnd(-1) ? "" : undefined}
              onClick={() => this.move(-1)}
            >
              {this.translationForKey("back")}
            </ui-button>
            <Show when={this.item()}>{(item) => this.reviewButtons(item)}</Show>
            <ui-button
              class="next"
              part={this.partForName("next")}
              appearance="primary"
              icon="chevron right"
              icon-position="right"
              title={this.translationForKey("nextTip")}
              disabled={this.atEnd(1) ? "" : undefined}
              onClick={() => this.move(1)}
            >
              {this.translationForKey("next")}
            </ui-button>
          </div>
        </div>
      </ui-modal>
    )
  }

  /** The tabs:  a menu item per kind with open items, its icon, name and count (the chips' count). */
  private tabBar(): JSX.Element {
    return (
      // a box of its own around the menu (whose host draws no box):  it scrolls sideways when the tabs don't fit, and
      // takes the focus so the keys can scroll it (axe's scrollable-region-focusable)
      <div
        class="tabs"
        part={this.partForName("tabs")}
        role="group"
        aria-label={this.translationForKey("tabsLabel")}
        tabindex="0"
      >
        <ui-menu appearance="secondary pointing" size="small" aria-label={this.translationForKey("tabsLabel")}>
          <For each={this.tabs()}>
            {(look) => {
              const count = () => this.walk().filter((entry) => entry.kind === look.kind).length
              const name = () => this.translationForKey(look.tab)
              return (
                <ui-item
                  data-kind={look.kind}
                  selected={this.tab === look.kind ? "" : undefined}
                  title={this.translationForKey("tabTip", { tab: name(), count: count() })}
                  onClick={() => this.pickTab(look.kind)}
                >
                  <ui-icon name={look.icon} />
                  <span class="tab-name">{name()}</span>
                  <ui-label size="mini" color={this.tabColor(look.kind)}>
                    {count()}
                  </ui-label>
                </ui-item>
              )
            }}
          </For>
        </ui-menu>
      </div>
    )
  }

  /** A tab's count's colour:  its most pressing state's (red, orange, yellow, then blue). */
  private tabColor(kind: FocusKind): TabColor {
    const states = new Set(
      this.walk()
        .filter((entry) => entry.kind === kind)
        .map((entry) => entry.state)
    )
    return TAB_COLORS.find(([state]) => states.has(state))?.[1] ?? "blue"
  }

  /** The tab's chips:  the section's own element, a phase's states on the Phases tab. */
  private chips(tab: FocusKind): JSX.Element {
    const chips = () => this.chipsOf(tab)
    return (
      <epic-state-filter
        part={this.partForName("chips")}
        counts={chips().counts}
        marked={chips().marked || undefined}
        shown={chips().shown}
        phases={tab === "phases" ? "" : undefined}
      />
    )
  }

  /** Where you are:  `3 of 12 · Questions 1 of 3`. */
  private whereWords(): string {
    const item = this.item()
    if (!item) return ""
    const walk = this.walk()
    const inTab = walk.filter((entry) => entry.kind === item.kind)
    const look = FOCUS_KINDS.find((it) => it.kind === item.kind)!
    return this.translationForKey("where", {
      at: walk.indexOf(item) + 1,
      total: walk.length,
      tab: this.translationForKey(look.tab),
      atTab: inTab.indexOf(item) + 1,
      inTab: inTab.length
    })
  }

  /** Is there nothing `step` away (Back at the first, Next at the last)? */
  private atEnd(step: 1 | -1): boolean {
    const walk = this.walk()
    const at = walk.findIndex((entry) => entry.id === this.shownId)
    return at < 0 || !walk[at + step]
  }

  /** The item's head:  its id chip in its state's colour, and its title. */
  private card(item: () => FocusEntry): JSX.Element {
    return (
      <h2 class="head" part={this.partForName("item")}>
        <span class="chip" data-state={item().state}>
          {EpicFocus.labelOf(item())}
        </span>
        <span class="title">{EpicFocus.titleOf(item().element)}</span>
      </h2>
    )
  }

  /** The item's note box:  the page's own, on its inbox key. */
  private noteBox(item: () => FocusEntry): JSX.Element {
    return (
      <epic-review
        of={item().id}
        shows="note"
        buttons={EpicFocus.buttonsOf(item())}
        label={EpicFocus.labelOf(item())}
        part={this.partForName("note-box")}
      />
    )
  }

  /** The item's review buttons:  the kind the page draws it with. */
  private reviewButtons(item: () => FocusEntry): JSX.Element {
    return (
      <epic-review
        of={item().id}
        shows="buttons"
        buttons={EpicFocus.buttonsOf(item())}
        label={EpicFocus.labelOf(item())}
        part={this.partForName("review-buttons")}
      />
    )
  }

  /** The modal drawn:  kept, and its own closing heard. */
  private adoptModal(modal: HTMLElement) {
    this.modal = modal
    modal.addEventListener("ui-closed", this.onModalClosed)
  }

  /** Keep `changes` to the place, in this browser. */
  private keepPlace(changes: FocusPlaceData) {
    if (!isServer) FocusPlace.write(location.pathname, changes)
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** `item`'s id as the page draws it:  `Q7`, a phase's `P3` (its place). */
  static labelOf(item: FocusEntry): string {
    return item.kind === "phases" ? PhaseIds.labelOf(item.element) : item.id.toUpperCase()
  }

  /** `element`'s title:  its `title`, else its `slot="title"`'s text. */
  static titleOf(element: Element): string {
    const slotted = element.querySelector(':scope > [slot="title"]')?.textContent
    return (element.getAttribute("title") ?? slotted ?? "").replace(/\s+/g, " ").trim()
  }

  /**
   * The buttons kind the page draws `item` with (`<epic-review buttons>`):  a todo's, an item's;  a phase's as its own
   * row has it (`EpicPhase.reviewKind`:  a waiting plan's, a proposal's ...).
   */
  static buttonsOf(item: FocusEntry): string {
    if (item.kind !== "phases") return isTodo(item.id, item.element.hasAttribute("limit")) ? "todo" : "item"
    const phase = item.element as Element & { component?: { reviewKind?: string } }
    return phase.component?.reviewKind ?? "phase"
  }

  /** A deep copy of `element`'s body on the page:  its children, but its slotted parts (title, status cards). */
  static copyOfBody(element: Element): Node[] {
    return Array.from(element.childNodes)
      .filter((node) => !(node as Element).hasAttribute?.("slot"))
      .map((node) => node.cloneNode(true))
  }

  /** Is the key in a text field (any shadow depth)?  Then the arrows move its cursor. */
  private static isTyping(event: KeyboardEvent): boolean {
    return event.composedPath().some((target) => {
      const element = target as HTMLElement
      return !!element.localName && (TYPING.test(element.localName) || element.isContentEditable)
    })
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicFocus extends E.AttributeValues<EpicFocusVocabulary> {}

/** The page's attributes that change what Focus mode walks:  the states and what they're read from. */
const WATCHED = [
  "status",
  "state",
  "changed",
  "reviewed",
  "queued",
  "working",
  "plan",
  "to-see",
  "changes",
  "choices-open",
  "done-at",
  "prepared",
  "deferred",
  "title",
  "stage"
]

/** A tab's count's colour, by its most pressing state:  the first its items have. */
const TAB_COLORS: readonly (readonly [string, TabColor])[] = [
  ["attention", "red"],
  ["replied", "orange"],
  ["updated", "orange"],
  ["open", "yellow"],
  ["progress", "blue"],
  ["scheduled", "blue"]
]

/** A tab count's colour. */
type TabColor = "red" | "orange" | "yellow" | "blue"

/** Tags that take typing:  the arrows are theirs. */
const TYPING = /^(textarea|input|select)$/
