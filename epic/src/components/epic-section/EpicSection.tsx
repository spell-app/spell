import { For, Show, createMemo } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"
import { E, UI } from "spell/ui/core"

import { PageStages } from "spell/epic/phases"
import { NOBODY_LISTENING, SUMMARY_ID, type NewItem, type NewKind } from "spell/epic/review"
// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"
import type { ReviewShows } from "spell/epic/components/epic-review/EpicReview.types"
import { NEW_KIND_LOOKS } from "spell/epic/components/epic-new-item/EpicNewItem.types"
import { DrawnState, NEEDS_OWEN, STATUS_SLOT } from "spell/epic/components/epic-item/EpicItem.types"
import {
  SHOW_ALL,
  STATE_PICK,
  type StatePickDetail
} from "spell/epic/components/epic-state-filter/EpicStateFilter.types"
import { TEST_START } from "spell/epic/components/epic-test-run/EpicTestRun.types"

import { epicSectionVocabulary } from "./EpicSection.en"
import { DOMEpicFoldElement, EpicFold } from "./EpicFold"
import { PhaseDrag } from "./PhaseDrag"
import { StateFilter } from "./StateFilter"
import {
  CLOSED_STATUSES,
  COUNT_ATTRIBUTES,
  COUNT_CHANGED,
  COUNTED,
  EMPTY,
  FILTER,
  FILTER_KEY,
  FILTER_STATES,
  ITEM_KINDS,
  NEW_HERE,
  NUMBERED_BLOCKS,
  PHASE_FILTER_STATES,
  PHASE_TOGGLES,
  PHASE_TOGGLES_KEY,
  REPORT,
  SECTION_LOOKS,
  STAYS_FOLDED_KINDS,
  TOGGLE,
  PhaseState,
  type ChipState,
  type ChipStateName,
  type ContentsEntry,
  type EpicSectionVocabulary,
  type FilterState,
  type ItemStateName,
  type PhaseToggle,
  type SectionCount,
  type SectionLook,
  type StateFilterEntry
} from "./EpicSection.types"

import foldCSS from "./EpicFold.css?inline"
import sectionCSS from "./EpicSection.css?inline"
import runsPageCSS from "./EpicSection.runs.css?inline"
import chipsCSS from "./StateChips.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `DOMEpicSectionElement`
 * The DOM element of `<epic-section>`:  a fold's (`DOMEpicFoldElement`), plus its state filter,
 * which the epic page's toolbar reads and sets to filter every section at once (`spell-doc-runtime.js`).
 * - Above `EpicSection`:  its `elementSetup` reads it while the class is defined.
 ****************/
export class DOMEpicSectionElement extends DOMEpicFoldElement {
  /**
   * Its state filter:  each state its items are in, how many, and whether they show;  none without items.
   * Read untracked (`EpicSection.stateFilter()`):  the page follows its `epic-filter-changed` instead.
   */
  get stateFilter(): readonly StateFilterEntry[] | undefined {
    return this.section?.stateFilter()
  }

  /**
   * How many of its items Owen marked in this pass (epic `epic-engine` P43), and the Phases section's phases with
   * Claude (I147):  the page's toolbar adds them up.
   * - read TRACKED:  the toolbar follows each mark (and reads `stateFilter` again with it)
   */
  get markedCount(): number {
    const section = this.section
    return section?.marked().size ?? 0
  }

  /**
   * Its state chips' counts as one string (`progress:1 attention:3`), read TRACKED:  the page's toolbar follows it,
   * so an item being worked on moves from red to blue there as on its own chips (Owen, 2026-10-26).
   */
  get chipCounts(): string {
    return [...(this.section?.stateCounts() ?? [])].map(([state, count]) => `${state}:${count}`).join(" ")
  }

  /** Show its items in `states` only (none:  every state), as if picked on its own chips;  remembered. */
  showStates(states: readonly string[] | undefined): void {
    this.section?.showStates(states)
  }

  /** Its component, as a section. */
  private get section(): EpicSection | undefined {
    return this.component as EpicSection | undefined
  }
}

/****************
 * ### `EpicSection`
 * The component behind `<epic-section>`:  one section of an epic page, by `kind`:
 * Phases, Questions ... Log, or one of the Overview's sub-sections.
 * - A fold (`EpicFold`):  its numbered title, the kind's icon (fixed per kind, from the vocabulary),
 *   then its children:  phases, items, log events or prose.
 *   - the title:  `3. Questions`, by its place among the page's blocks;
 *     `1.2 Why` for an Overview sub-section, its title its own
 * - Its COUNT (P10):  `open/all` of its items (or phases), open being any status but `done`, `decided` or
 *   `canceled`;  none without any.
 *   - on no title badge:  the state chips say the numbers (Owen, 2026-10-10:  "We can remove the (37/58) pill ...
 *     since we have the numbers in the filters");  the Phases section's `4/53` went with its chips (epic
 *     `epic-engine` I157)
 *   - the page's toolbar reads it (`contentsEntry`)
 *   Counted again whenever a child comes, goes, or changes its `status` or `state`
 *   (`@watches`:  the live update, a part loading).
 * - An item section's STATE FILTER (P10;  chips with counts, epic `airplane` P8), at the title's end:
 *   - one chip per state its items are in, in the state's colour, with how many:
 *     solid while that state's items show, outlined while hidden
 *   - a click (Owen, 2026-10-10;  `StateFilter.nextShown()`):
 *     everything showing, only that state;  else a hidden state shows too and a shown one hides;
 *     the only one showing, everything again
 *   - a filtered list says `3 hidden · show all` under it
 *   - each item it hides is marked `data-epic-filtered` (page state, never in the file:  the live patch keeps it),
 *     which the page sheet hides (`EpicSection.runs.css`;  a `::slotted(#id)` rule per item before epic `epic-engine`
 *     P45)
 *   - remembered per page, under the old runtime's key (`FILTER_KEY`);  `epic-filter-changed` says it changed
 *   - the page's toolbar filters every section at once, through its DOM element (`DOMEpicSectionElement`)
 * - The Phases section's STATE FILTER (epic `epic-engine` I157;  Owen, 2026-10-29:  "badges for
 *   'undone|updated|complete' -- e.g. 49 phases in this plan are a lot to scroll past"):  the same chips, rule, note,
 *   marks and memory, after its Files / Verify toggles, by a phase's state (`PhaseState.of()`)
 *   - its phases with Claude in the blue badge, as an item section's marked items
 *   - NOT in the page's toolbar chips, which are the items' (`stateFilter()`)
 * - An item section's lines are drawn as rounded cards, one per RUN of lines between unfolded items' details
 *   (Owen, 2026-10-24):  each run's first line rounded on top, its last on the bottom.
 *   - by position, with sibling selectors, in a page sheet it registers (`EpicSection.runs.css`, P45;  Owen,
 *     2026-10-25:  "generic CSS, using sibling selectors ... rather than with explicit ids"):  the phases and the
 *     Overview's parts too
 * - The Phases section's title holds the Files / Verify toggles:
 *   - each shows or hides that field in every phase,
 *     through `--epic-files-display` / `--epic-verify-display`, which the fields read
 *   - remembered per page
 * - No Plan changes box above the phases any more (Owen, 2026-10-11):  each phase draws its own (`<epic-phase>`).
 *   An older doc's copies (`<epic-updated slot="changes">`, T14) have no slot to show in;  the tool removes them.
 * - An item section with no items says "None yet".
 * - A REPORT (`kind="report"`, P14):  prose a run wrote for Owen to read (an overnight `/bedtime` report).
 *   - right after the Overview, on the page's section band
 *   - titled its own (`title`), never numbered, so the sections after it keep theirs
 * - An Overview sub-section is reviewed as an item is, only while the page is reviewed
 *   (decision Q14;  `<epic-review buttons="part">`):
 *   - Make Todo, Revisit in `tools` (no Approve:  Q14 asks for notes, not sign-off)
 *   - its note box at the end of its body, a marked note at its top
 *   - Claude's status cards (`slot="status"`, P13) just above the note box
 *   - Revisit and Edit unfold it (`epic-note-showing`)
 * - NEW ITEMS (epic `airplane` P2), while the page is reviewed:
 *   the Todos and Questions sections end with
 *   - the new items of their kind Owen asked for and Claude hasn't made yet (Edit, Remove:  `newItemList()`)
 *   - then a New todo / New question button, which opens the form there (`<epic-new-item>`)
 * - The Manual tests section's START TESTING (epic `epic-engine` P4), on its title while the page is reviewed and a test
 *   is open:  "Start testing · 9", a `<ui-button>` that asks the page for its test run (`epic-test-opening`)
 * - SIDE EFFECT:  observes its own children, from the first count on (`@watches`);
 *   follows the review inbox while connected (an Overview sub-section, Todos, Questions).
 ****************/
export class EpicSection extends EpicFold<EpicSectionVocabulary> {
  @E.proto static vocabulary = epicSectionVocabulary
  @E.protoMerged static elementSetup = {
    DOMElement: DOMEpicSectionElement,
    styleSheets: {
      "epic-tooltip": tooltipCSS,
      "epic-fold": foldCSS,
      "epic-state-chips": chipsCSS,
      "epic-section": sectionCSS
    }
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## State
  ////////////////

  /** The Phases section's toggles:  which fields show. */
  @E.state accessor shown: Record<string, boolean> = EpicSection.savedToggles()

  /**
   * The states the reader chose to show, as last left on this page;  `undefined`:  every state.
   * - by the DOM element's own `id`, read plainly:  a starting value, never followed
   */
  @E.state accessor chosen: readonly string[] | undefined = EpicSection.savedFilters()[this.domElement.id]

  /**
   * Its view of the review inbox:
   * - an Overview sub-section's:  keyed by its id (is the page reviewed?  has it a marked note?)
   * - the Todos and Questions sections':  for their new items (no id:  never marked themselves)
   * - other kinds never read it
   */
  readonly reviewState = new ReviewState(() => (this.kind === "overview-part" ? this.id : undefined))

  /** The Todos or Questions section's `<epic-new-item>`, as drawn:  Edit on a waiting item opens its form on it. */
  private newItem: (HTMLElement & { open: boolean; editing?: string }) | undefined

  /** The toggles' icons, in `PHASE_TOGGLES`' order. */
  readonly toggleGlyphs = PHASE_TOGGLES.map((toggle) => new E.IconGlyph({ owner: this, name: () => toggle.icon }))

  ////////////////
  // ## Derived state
  ////////////////

  /** The kind's look:  icon and title key;  `undefined` for an Overview sub-section or a report (titled their own). */
  readonly look = createMemo((): SectionLook | undefined => {
    const kind = this.kind
    return kind && kind in SECTION_LOOKS ? SECTION_LOOKS[kind as keyof typeof SECTION_LOOKS] : undefined
  })

  /** Its icon (after `look`, which it reads:  memos compute as they're made). */
  readonly glyph = new E.IconGlyph({ owner: this, name: () => this.look()?.icon })

  /**
   * Its number, by its place:  `3` for the third block of the page;  `1.2` for the Overview's second part;
   * "" for a report, which isn't numbered.
   */
  readonly number = createMemo(() => {
    void this.layout
    return this.isConnected ? this.place(this.kind) : ""
  })

  /** An item section with nothing in it, and no part on its way. */
  readonly empty = createMemo(() => this.holdsItems() && !this.slots.hasContent("") && !this.source)

  /**
   * Its counted children (items, or phases), read again whenever a child comes, goes or changes its status or state:
   * the count and filter follow.
   * - A NEW list on every change, so the count reads the children's `status` again.
   */
  @E.watches({ childList: true, subtree: true, attributeFilter: COUNT_ATTRIBUTES })
  get counted(): readonly Element[] {
    void this.slots.filledSlots
    if (!this.counts() || isServer) return NOTHING_COUNTED
    return Array.from(this.domElement.querySelectorAll(COUNTED))
  }

  /**
   * It stays FOLDED (the Log, `STAYS_FOLDED_KINDS`):  the page's expand-all leaves it folded (`expandAllUnder()`),
   * and every load starts it folded (the docs runtime's `STAYS_FOLDED`).
   * - a link into it, a click on its title and ⌥-click on its own chevron still open it
   */
  get staysFolded(): boolean {
    return STAYS_FOLDED_KINDS.includes(this.kind ?? "")
  }

  /** Its count:  `{ open, total }`;  `undefined` for a kind that isn't counted, or with nothing to count. */
  readonly count = createMemo((): SectionCount | undefined => this.countOf(this.counted))

  /**
   * Each item's state, in page order;  the Phases section's phases' (`PhaseState.of()`:  undone, updated, complete;
   * epic `epic-engine` I157), which its chips filter as an item section's do.
   */
  readonly itemStates = createMemo((): { item: Element; state: ChipStateName }[] => {
    if (this.kind === "phases")
      return this.counted
        .filter((child) => child.localName === "epic-phase")
        .map((phase) => ({ item: phase, state: PhaseState.of(PhaseState.fieldsOf(phase)) }))
    return this.holdsItems()
      ? this.counted
          .filter((child) => child.localName === "epic-item")
          .map((item) => ({ item, state: this.drawnStateOf(item) }))
      : []
  })

  /**
   * Its items Owen has MARKED in this pass, not applied yet (epic `epic-engine` P43;  `ReviewState.isMarked()`).
   * - counted apart, in the blue badge left of the state chips, and left out of theirs:  the chips tick down
   *   as he marks
   * - never hidden by the filter:  a marked item stays in sight mid-pass
   * - outside a review (no inbox):  none
   * - the Phases section's:  its phases WITH CLAUDE (epic `epic-engine` I147), not done, and marked in this pass or
   *   being worked on (the inbox's `working`:  its plan being written, or it being built);  the same blue badge,
   *   left out of the phase chips and never hidden by them (I157)
   */
  readonly marked = createMemo((): ReadonlySet<Element> => {
    const marked = this.itemStates().filter((it) => it.item.id && this.isWithClaude(it))
    return marked.length ? new Set(marked.map((it) => it.item)) : NOTHING_MARKED
  })

  /** Its items not marked in this pass:  what the state chips count and filter. */
  readonly unmarked = createMemo(() => this.itemStates().filter((it) => !this.marked().has(it.item)))

  /** The states its unmarked items (or phases) are in, in the filter's order:  its state chips. */
  readonly present = createMemo((): ChipState[] => {
    const states = new Set<string>(this.unmarked().map((it) => it.state))
    const order: readonly ChipState[] = this.kind === "phases" ? PHASE_FILTER_STATES : FILTER_STATES
    return order.filter((it) => states.has(it.state))
  })

  /** How many of its unmarked items are in each state. */
  readonly stateCounts = createMemo((): ReadonlyMap<string, number> => {
    const counts = new Map<string, number>()
    for (const { state } of this.unmarked()) counts.set(state, (counts.get(state) ?? 0) + 1)
    return counts
  })

  /**
   * The states showing:  the reader's choice, of the states there are now;  none chosen, every state.
   * - NOTE: a choice can leave none of them now (the page's toolbar showed only red, and this section has none):
   *   then every item is hidden, and `3 hidden · show all` says so
   *   (Owen, 2026-10-10:  filter "everything on the page").
   *   Before, such a choice showed everything.
   */
  readonly showing = createMemo((): ReadonlySet<string> => {
    const present = this.present().map((it) => it.state as string)
    return new Set(this.chosen ? this.chosen.filter((state) => present.includes(state)) : present)
  })

  /** The items the filter hides:  never a marked one. */
  readonly hidden = createMemo(() => this.unmarked().filter((it) => !this.showing().has(it.state)))

  /** The items the filter hides, as elements:  each marked `data-epic-filtered` (`onFiltered()`). */
  get filteredItems(): readonly Element[] {
    return this.hidden().map((it) => it.item)
  }

  ////////////////
  // ## Element hooks
  ////////////////

  /**
   * Hidden by its page's STAGE (`<epic-page stage>`, epic `epic-engine` P29):  a top-level section the stage doesn't
   * show (`PageStages.hides()`), drawn as nothing (`:state(offstage)`);  still in the file, and the tool reads it.
   * - read again on every layout change (the page's `layout`:  its `stage` changing too)
   */
  @E.cssState("offstage")
  get isOffStage(): boolean {
    void this.layout
    return this.isConnected && PageStages.hides(this.domElement)
  }

  /** Its title has tools:  the Phases toggles, or a state filter with chips (or the marked badge alone). */
  @E.cssState("tools")
  get hasTools(): boolean {
    return this.kind === "phases" || this.hasFilter()
  }

  ////////////////
  // ## Rendering
  ////////////////

  /**
   * Follow the review inbox while connected (kept alive:  a removed one stops):
   * - an Overview sub-section, for its marks
   * - the Todos and Questions sections, for their new items
   * - every item section, for its items marked in this pass (epic `epic-engine` P43)
   * - the Phases section, for its phases marked or being worked on (epic `epic-engine` I147)
   */
  @E.whileConnected
  protected followReviews() {
    // an item section for its marked items too (P43);  the Phases section for its phases with Claude (I147)
    const follows = this.kind === "overview-part" || this.kind === "phases" || this.holdsItems()
    return follows ? this.reviewState.connect() : undefined
  }

  /**
   * The Phases section, while connected:  its to-do phases DRAG to another place by their title rows (epic
   * `epic-engine` P34, `PhaseDrag`), while the page is reviewed;  each drop a move mark, the page keeping the
   * moves not applied yet.
   */
  @E.whileConnected
  protected dragPhases() {
    if (this.kind !== "phases" || isServer) return undefined
    const client = () => this.reviewState.client
    return PhaseDrag.wire(this.domElement, {
      enabled: () => this.reviewState.reviewing(),
      move: (id, to) => void client()?.move(id, to),
      pending: () => client()?.pendingMoves ?? [],
      subscribe: (listener) => client()?.subscribe(listener) ?? (() => undefined)
    })
  }

  /**
   * Its runs' rounded ends and its filter's hidden items are the page sheet's (`EpicSection.runs.css`, P45):
   * registered once per page, by the first section to connect.
   */
  @E.whileConnected
  protected registerRunSheet() {
    if (isServer) return undefined
    // the runtime may still be loading as the first section connects
    void UI.load()
      .then((runtime) => {
        if (!runtime.styles.has(RUNS_PAGE_SHEET)) runtime.styles.register(RUNS_PAGE_SHEET, runsPageCSS, { page: true })
      })
      .catch((error: unknown) => console.error(error))
    return undefined
  }

  /** Its count's parts the toolbar's badges show, as one string:  what `announceCount()` follows. */
  get badgeCount(): string {
    const count = this.count()
    return count ? `${count.attention} ${count.replied ?? 0} ${count.running ?? 0}` : ""
  }

  /** The badge count it last announced;  `undefined` before its first. */
  private announced: string | undefined

  /**
   * Its badge count changed after its first:  say so (`COUNT_CHANGED`), so the docs runtime draws the toolbar's
   * badges again from the live state, as its own chips draw (Owen, 2026-10-26:  "badges don't match up").
   * - a change of its markup re-counts the page by itself (the live update);  this is for the review inbox's
   * - SIDE EFFECT:  dispatches on its DOM element
   */
  @E.onChange("badgeCount")
  protected announceCount(badgeCount: string) {
    const before = this.announced
    this.announced = badgeCount
    if (isServer || before === undefined || before === badgeCount) return
    this.domElement.dispatchEvent(new CustomEvent(COUNT_CHANGED, { bubbles: true, composed: true }))
  }

  /**
   * Mark each item its filter hides `data-epic-filtered`, which the page sheet hides and its runs step over (P45);
   * the marks come off again when it shows them, or when the section goes.
   * - SIDE EFFECT:  writes the attribute on its items (light DOM):  page state, never in the file
   */
  @E.onChange("filteredItems")
  protected onFiltered(items: readonly Element[]) {
    if (isServer || !items.length) return undefined
    for (const item of items) item.setAttribute(FILTERED, "")
    return () => {
      for (const item of items) item.removeAttribute(FILTERED)
    }
  }

  render(): JSX.Element {
    // read once:  a section never changes its kind
    // (`render()`'s body runs once, untracked:  `UIComponent.onMount()`)
    const look = this.look()
    const kind = this.kind
    return this.renderFold({
      title: () => this.heading(),
      icon: look ? () => this.glyph.svg : undefined,
      // no count on the title:  the chips say the numbers (Owen, 2026-10-10:  "We can remove the (37/58) pill ...
      // since we have the numbers in the filters");  the Phases section's `4/53` too, since its chips (I157)
      tools:
        kind === "phases"
          ? () => (
              <>
                {this.toggles()}
                {this.filter()}
              </>
            )
          : kind === "overview-part"
            ? () => this.reviewButtons()
            : this.holdsItems()
              ? () => (
                  <>
                    <Show when={kind === "tests" && this.reviewState.reviewing() && this.count()?.open}>
                      {(open) => this.startTesting(open())}
                    </Show>
                    {this.filter()}
                    <Show when={this.reviewState.reviewing() && this.newKind()}>
                      {(newKind) => this.newButton(newKind())}
                    </Show>
                  </>
                )
              : undefined,
      before: kind === "overview-part" ? () => this.saidNote() : undefined,
      after: () => (
        <>
          <Show when={this.empty()}>
            <p class={EMPTY} part={this.partForName("empty")}>
              {this.translationForKey("noneYet")}
            </p>
          </Show>
          <Show when={this.hidden().length}>{this.hiddenNote()}</Show>
          {/* Claude's status cards (P13):  at the end of its body, above the note box */}
          <Show when={kind === "overview-part"}>
            <slot name={this.slotForName(STATUS_SLOT)} />
          </Show>
          <Show when={kind === "overview-part" && this.reviewState.reviewing()}>
            {this.reviewControl("note", "note-box")}
          </Show>
          <Show when={this.reviewState.reviewing() && this.newKind()}>{(newKind) => this.newItems(newKind())}</Show>
        </>
      )
    })
  }

  /**
   * The contents entry (`EpicFold.contentsEntry()`):
   * `3. Questions` with its kind's icon and its count, or an Overview sub-section's `1.2 <its title>`.
   * - read fresh from the page:  the count from its children now, never a memo a pending change hasn't reached yet
   *   (the live update re-reads the contents right after it patches)
   */
  contentsEntry(): ContentsEntry {
    const kind = this.domElement.getAttribute("kind") ?? ""
    const number = this.domElement.isConnected ? this.place(kind) : ""
    if (kind === "overview-part" || !(kind in SECTION_LOOKS))
      return { label: `${number} ${EpicSection.titleText(this.domElement)}`.trim() }
    const look = SECTION_LOOKS[kind as keyof typeof SECTION_LOOKS]
    const counted = kind === "phases" || (ITEM_KINDS as readonly string[]).includes(kind)
    const children = counted ? Array.from(this.domElement.querySelectorAll(COUNTED)) : []
    return {
      label: `${number}. ${this.translationForKey(look.title)}`,
      icon: look.icon,
      count: this.countOf(children)
    }
  }

  /** The title:  `3. Questions`, an Overview sub-section's `1.2 <its title>`, or a report's own. */
  private heading(): JSX.Element {
    const look = this.look()
    if (look) return `${this.number()}. ${this.translationForKey(look.title)}`
    return (
      <>
        <Show when={this.number()}>
          <span class="number">{this.number()}</span>{" "}
        </Show>
        <slot name={this.slotForName("title")}>{this.title}</slot>
      </>
    )
  }

  ////////////////
  // ## The state filter
  ////////////////

  /**
   * A Todo, Questions, Issues or Manual tests section's NEW button, on its title, while reviewed:
   * comment dots, round, its name the tooltip.
   * - Owen, 2026-10-13:  "Remove "comment" icon from top header -- add it to question/todo/issue/test headers".
   * - A click opens the section, then the form at its end (`openNewForm()`).
   */
  private newButton(kind: NewKind): JSX.Element {
    const words = () => this.translationForKey("addNew", { kind: this.translationForKey(NEW_KIND_LOOKS[kind].label) })
    return (
      <button
        type="button"
        class={NEW_HERE}
        part={this.partForName("new-button")}
        aria-label={words()}
        title={words()}
        onClick={(event) => {
          // a title's tool:  not a click on the title, which would fold it
          event.stopPropagation()
          this.openNewForm()
        }}
      >
        <ui-icon name="comment dots" />
      </button>
    )
  }

  /**
   * The Manual tests section's Start testing (epic `epic-engine` P4):  a blue button, "Start testing · 9".
   * - A click asks the page for its test run (`epic-test-opening`, out of the shadow root).
   */
  private startTesting(open: number): JSX.Element {
    return (
      <ui-button
        class={START_TESTING}
        part={this.partForName("start-testing")}
        color="blue"
        appearance="basic"
        size="mini"
        icon="flask"
        title={this.translationForKey("startTestingTip", { count: open })}
        onClick={(event: MouseEvent) => {
          // a title's tool:  not a click on the title, which would fold it
          event.stopPropagation()
          this.send(TEST_START, {})
        }}
      >
        {this.translationForKey("startTesting", { count: open })}
      </ui-button>
    )
  }

  /** Open this section, then its new item form, on screen, its title field ready. */
  @E.untracked
  private openNewForm() {
    void this.reveal().then(() =>
      E.afterSolidUpdate(() => {
        const box = this.newItem
        if (!box) return
        box.editing = undefined
        box.open = true
        E.beforeNextPaint(() => box.scrollIntoView({ block: "nearest" }))
      })
    )
  }

  /**
   * The filter's chips:  one per state its items are in, with how many, solid while they show
   * (`<epic-state-filter>`, the one chip element:  epic `epic-engine` P3);  a click comes back as `epic-state-changed`.
   * - the items marked in this pass in its blue badge, left of the chips, whatever the filter (P43)
   */
  private filter(): JSX.Element {
    return (
      <Show when={this.hasFilter()}>
        <span class={FILTER} part={this.partForName("filter")}>
          <epic-state-filter
            counts={[...this.stateCounts()].map(([state, count]) => `${state}:${count}`).join(" ")}
            shown={this.chosen ? [...this.showing()].join(" ") : undefined}
            marked={this.marked().size || undefined}
          />
        </span>
      </Show>
    )
  }

  /** Under a filtered list:  `3 hidden · show all` (`<epic-hidden-note>`);  a click shows everything (`onShowAll()`). */
  private hiddenNote(): JSX.Element {
    return <epic-hidden-note part={this.partForName("hidden-note")} count={this.hidden().length} />
  }

  ////////////////
  // ## The Phases section
  ////////////////

  /** The Phases title's toggles:  bare icons, the accent while pressed. */
  private toggles(): JSX.Element {
    return (
      <For each={PHASE_TOGGLES}>
        {(toggle, index) => {
          const on = () => !!this.shown[toggle.field]
          const label = () => this.translationForKey(on() ? toggle.hide : toggle.show)
          return (
            <button
              type="button"
              class={TOGGLE}
              aria-pressed={on() ? "true" : "false"}
              aria-label={label()}
              title={label()}
              onClick={() => this.flip(toggle)}
            >
              {this.toggleGlyphs[index()]!.svg}
            </button>
          )
        }}
      </For>
    )
  }

  /** The Phases section's fields to show:  each toggle's custom property, `block` while it's on. */
  protected foldStyle(): Record<string, string> | undefined {
    if (this.kind !== "phases") return undefined
    const shown = this.shown
    const style: Record<string, string> = {}
    for (const toggle of PHASE_TOGGLES) if (shown[toggle.field]) style[toggle.property] = "block"
    return style
  }

  ////////////////
  // ## Review (an Overview sub-section)
  ////////////////

  /** The review buttons at the title's end:  Make Todo, Revisit. */
  private reviewButtons(): JSX.Element {
    return <Show when={this.reviewState.reviewing()}>{this.reviewControl("buttons", "review-buttons")}</Show>
  }

  /** A marked note, at the top of its body. */
  private saidNote(): JSX.Element {
    return (
      <Show when={this.reviewState.reviewing() && this.reviewState.noted()}>{this.reviewControl("said", "said")}</Show>
    )
  }

  /** One of its review controls (`<epic-review>`):  what it `shows`, as its `part`. */
  private reviewControl(shows: ReviewShows, part: "review-buttons" | "note-box" | "said"): JSX.Element {
    return <epic-review of={this.id} shows={shows} buttons="part" part={this.partForName(part)} />
  }

  ////////////////
  // ## New items (the Todos and Questions sections:  epic `airplane` P2)
  ////////////////

  /**
   * At the end of the Todos or Questions section, while reviewed:
   * - the new items of its kind waiting to be made (`newItemList()`)
   * - then its New todo / New question button, or the form it opened (`<epic-new-item>`)
   */
  private newItems(kind: NewKind): JSX.Element {
    return (
      <>
        {this.newItemList(kind)}
        <epic-new-item
          ref={(element: HTMLElement) => (this.newItem = element as typeof this.newItem)}
          adds={kind}
          part={this.partForName("new-item")}
        />
      </>
    )
  }

  /**
   * The new items of one kind waiting to be made, each a card:
   * its icon, "Todo" or "Question", its title, its note, what it's about (a link), then Edit and Remove.
   * - the fill rule (decision Q20):  dashed until sent, outlined once sent
   * - its tooltip says which, and that it waits for a review while nobody is listening
   * - draws nothing while none waits
   */
  private newItemList(kind: NewKind): JSX.Element {
    const items = () => this.reviewState.newItems(kind)
    return (
      <Show when={items().length}>
        <ul class={NEW_LIST} part={this.partForName("new-list")}>
          <For each={items()} keyed={(it) => it.id}>
            {(it) => (
              <li class={NEW_CARD} data-fill={this.isSent(it()) ? "outline" : "dashed"} title={this.cardTip(it())}>
                <ui-icon name={NEW_KIND_LOOKS[it().kind].icon} />
                <span class="what">{this.translationForKey(NEW_KIND_LOOKS[it().kind].label)}</span>
                <span class="title">{it().title}</span>
                <span class="tools">
                  <button
                    type="button"
                    title={this.translationForKey("newEdit")}
                    aria-label={`${this.translationForKey("newEdit")}:  ${it().title}`}
                    onClick={() => this.editNew(it())}
                  >
                    <ui-icon name="pen" />
                  </button>
                  <button
                    type="button"
                    title={this.translationForKey("newRemove")}
                    aria-label={`${this.translationForKey("newRemove")}:  ${it().title}`}
                    onClick={() => void this.reviewState.client?.removeNew(it().id)}
                  >
                    <ui-icon name="trash can" />
                  </button>
                </span>
                <Show when={it().note}>{(note) => <p class="note">{note()}</p>}</Show>
                <Show when={it().near}>
                  {(near) => (
                    <a class="about" href={`#${near() === SUMMARY_ID ? SUMMARY_LINK : near()}`}>
                      {this.translationForKey("newAbout", {
                        id: near() === SUMMARY_ID ? near() : near().toUpperCase()
                      })}
                    </a>
                  )}
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
    )
  }

  /** Has waiting `item` gone with a send? */
  private isSent(item: NewItem): boolean {
    return this.reviewState.client?.isSent(item) ?? false
  }

  /** A waiting card's tooltip:  how far it got;  nobody listening, that it waits for a review. */
  private cardTip(item: NewItem): string {
    const state = this.translationForKey(this.isSent(item) ? "newSent" : "newUnsent")
    return this.reviewState.listening() ? state : `${state}.  ${NOBODY_LISTENING}`
  }

  /** Edit on a waiting card:  the section's `<epic-new-item>` opens its form on it. */
  @E.untracked
  private editNew(item: NewItem) {
    const box = this.newItem
    if (!box) return
    box.editing = item.id
    box.open = true
  }

  /** The kind of new item this section takes (`todo` in Todos, `question` in Questions);  none for any other. */
  private newKind(): NewKind | undefined {
    const kind = this.kind
    return (Object.keys(NEW_KIND_LOOKS) as NewKind[]).find((each) => NEW_KIND_LOOKS[each].section === kind)
  }

  ////////////////
  // ## Behaviour
  ////////////////

  /** A toggle, clicked:  show or hide its field in every phase, and remember it. */
  @E.untracked
  private flip(toggle: PhaseToggle) {
    const shown = { ...this.shown }
    shown[toggle.field] = !shown[toggle.field]
    this.shown = shown
    EpicSection.save(PHASE_TOGGLES_KEY, shown)
  }

  /** One of its state chips, clicked (`<epic-state-filter>`'s `epic-state-changed`). */
  @E.on(STATE_PICK, { target: "renderRoot" })
  protected onStatePick(event: CustomEvent<StatePickDetail>) {
    event.stopPropagation()
    this.pickState(event.detail.state)
  }

  /** A state chip, clicked:  what shows next, by `StateFilter.nextShown()`'s rule. */
  @E.untracked
  private pickState(state: string) {
    const present = this.present().map((it) => it.state as string)
    const next = StateFilter.nextShown(present, [...this.showing()], state)
    this.showStates(next.length === present.length ? undefined : next)
  }

  /** "Show all", under a filtered list (`<epic-hidden-note>`'s `epic-all-showing`). */
  @E.on(SHOW_ALL, { target: "renderRoot" })
  protected onShowAll(event: Event) {
    event.stopPropagation()
    this.showStates(undefined)
  }

  /**
   * Show its items in `states` only;  none:  every state, now and as new ones come.
   * - Remembered for this page;  `epic-filter-changed` tells the page (its toolbar's chips follow).
   * - Its DOM element's `showStates()`:  the page's toolbar filters every section through it.
   */
  @E.untracked
  showStates(states: readonly string[] | undefined) {
    this.chosen = states ? [...states] : undefined
    this.send("epic-filter-changed", { states: states ? [...states] : undefined })
    const id = this.id
    if (!id) return
    const saved: Record<string, readonly string[]> = { ...EpicSection.savedFilters() }
    if (states) saved[id] = [...states]
    else delete saved[id]
    EpicSection.save(FILTER_KEY, saved)
  }

  /**
   * Its state filter, for the page's toolbar (`DOMEpicSectionElement.stateFilter`):
   * each state its items are in, how many, and whether they show;  none without items.
   * - the items marked in this pass left out:  `markedCount` counts them
   */
  @E.untracked
  stateFilter(): StateFilterEntry[] | undefined {
    // the toolbar's chips are the items':  a phase's states are its own section's alone (I157)
    if (!this.holdsItems()) return undefined
    const present = this.present() as FilterState[]
    if (!present.length) return undefined
    const counts = this.stateCounts()
    const showing = this.showing()
    return present.map((it) => ({
      state: it.state,
      color: it.color,
      count: counts.get(it.state) ?? 0,
      on: showing.has(it.state)
    }))
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** It draws a state filter:  chips, or items marked in this pass (their badge). */
  private hasFilter(): boolean {
    return this.present().length > 0 || this.marked().size > 0
  }

  /**
   * Is `it` with Claude (`marked()`)?  An item marked in this pass;  a phase not done, marked or being worked on.
   */
  private isWithClaude(it: { item: Element; state: ChipStateName }): boolean {
    if (it.item.localName !== "epic-phase") return this.reviewState.isMarked(it.item.id)
    return (
      it.state !== "complete" && (this.reviewState.isMarked(it.item.id) || this.reviewState.liveOf(it.item.id).workedOn)
    )
  }

  /** A kind that holds items (Questions ... Manual tests). */
  private holdsItems(): boolean {
    return (ITEM_KINDS as readonly string[]).includes(this.kind ?? "")
  }

  /** Its number by its place now, as `kind`:  `3`, or an Overview sub-section's `1.2`;  "" unplaced, or a report. */
  private place(kind: string | undefined): string {
    const parent = this.domElement.parentElement
    if (!parent || kind === REPORT) return ""
    if (kind === "overview-part") {
      const own = EpicSection.placeOf(this.domElement, ":scope > epic-section")
      const overview = EpicSection.placeOf(parent, NUMBERED_BLOCKS) || 1
      return `${overview}.${own}`
    }
    return String(EpicSection.placeOf(this.domElement, NUMBERED_BLOCKS, { shown: true }))
  }

  /** A kind that's counted:  items, or phases.  A method:  memos above call it as they're made. */
  private counts(): boolean {
    return this.kind === "phases" || this.holdsItems()
  }

  /**
   * The count of `children` (items, or phases);  none without any.
   * - `open`:  any status but `CLOSED_STATUSES`'
   * - `attention`:  those that need Owen (`NEEDS_OWEN`:  red, or orange, his turn to pick), an item by its state AS
   *   DRAWN (`drawnStateOf()`), as its section's chips count it (Owen, 2026-10-26:  "badges don't match up"):
   *   - one being worked on is blue, not red
   *   - one Owen marked in this pass is with Claude (the blue badge), in neither
   * - `replied`:  of those, the ones waiting on his pick (orange)
   * - `running`:  the phases at work now:  under way (`status="active"`), or being worked on (I147)
   */
  private countOf(children: readonly Element[]): SectionCount | undefined {
    if (!children.length) return undefined
    const open = children.filter(
      (child) => !(CLOSED_STATUSES as readonly string[]).includes(child.getAttribute("status") ?? "")
    ).length
    // an item Owen marked in this pass is with Claude (the blue badge), as its section's chips leave it out (P43)
    const states = children.map((child) =>
      child.localName !== "epic-item"
        ? (child.getAttribute("state") ?? "")
        : child.id && this.reviewState.isMarked(child.id)
          ? "marked"
          : this.drawnStateOf(child)
    )
    const attention = states.filter((state) => NEEDS_OWEN.has(state)).length
    const replied = states.filter((state) => state === "replied").length
    const running = children.filter(
      (child) =>
        child.localName === "epic-phase" &&
        (child.getAttribute("status") === "active" ||
          (child.getAttribute("status") !== "done" && !!child.id && this.reviewState.liveOf(child.id).workedOn))
    ).length
    return { open, total: children.length, attention, replied, running }
  }

  /**
   * `element`'s place, from 1, among its parent's children matching `selector`;  0 when it isn't one.
   * - `shown`:  among those its page's stage shows only (`PageStages.hides()`):  Questions is `2.` while the Overview
   *   is agreed, not `3.` after a hidden Phases
   */
  private static placeOf(element: Element, selector: string, { shown = false } = {}): number {
    const siblings = Array.from(element.parentElement?.querySelectorAll(selector) ?? []).filter(
      (sibling) => !shown || !PageStages.hides(sibling)
    )
    return siblings.indexOf(element) + 1
  }

  /**
   * An item's state AS DRAWN, as its id chip shows it:  `DrawnState.of()`, its attributes and the live inbox
   * (worked on:  blue;  Owen's urgency not applied yet), the ONE rule every count uses.
   */
  private drawnStateOf(item: Element): ItemStateName {
    return DrawnState.of(DrawnState.fieldsOf(item), this.reviewState.liveOf(item.id))
  }

  /** The Phases toggles as last left on this page;  none without storage. */
  private static savedToggles(): Record<string, boolean> {
    return EpicSection.saved(PHASE_TOGGLES_KEY) as Record<string, boolean>
  }

  /** The state filters as last left on this page, by section id;  none without storage. */
  private static savedFilters(): Record<string, readonly string[]> {
    const saved = EpicSection.saved(FILTER_KEY)
    const filters: Record<string, readonly string[]> = {}
    for (const [id, states] of Object.entries(saved)) if (Array.isArray(states)) filters[id] = states as string[]
    return filters
  }

  /** This page's JSON under `prefix`;  `{}` without storage, or for bad JSON. */
  private static saved(prefix: string): Record<string, unknown> {
    const value = PrefStore.getAt(prefix + location.pathname)
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  }

  /** Keep `value` for this page under `prefix`, as JSON;  a browser that blocks storage keeps it for the visit. */
  private static save(prefix: string, value: object) {
    PrefStore.setAt(prefix + location.pathname, value)
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicSection extends E.AttributeValues<EpicSectionVocabulary> {}

/** No counted children:  a kind that isn't counted, or a server render.  One list, so a recount keeps it. */
const NOTHING_COUNTED: readonly Element[] = []

/** No items marked in this pass.  One set, so a recount keeps it. */
const NOTHING_MARKED: ReadonlySet<Element> = new Set()

/** Name of the page sheet that draws its runs' rounded ends and hides what its filter hides (`EpicSection.runs.css`). */
const RUNS_PAGE_SHEET = "epic-section-runs"

/** The attribute each item the filter hides gets:  page state, kept by the live patch. */
const FILTERED = "data-epic-filtered"

/** Class of the Manual tests section's Start testing. */
const START_TESTING = "start-testing"

/** Classes of the waiting new items (`newItemList()`):  the list, a card. */
const NEW_LIST = "new-list"
const NEW_CARD = "new-card"

/** Where a waiting item's link to the summary goes:  it has no id, so the Overview it opens. */
const SUMMARY_LINK = "overview"
