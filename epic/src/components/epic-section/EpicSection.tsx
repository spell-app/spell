import { For, Show, createMemo } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"
import { E, UI } from "spell/ui/core"

import { PageStages } from "spell/epic/phases"
import { NOBODY_LISTENING, SUMMARY_ID, type NewItem, type NewKind, type TestsEntry } from "spell/epic/review"
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

import { epicSectionVocabulary } from "./EpicSection.en"
import { DOMEpicFoldElement, EpicFold } from "./EpicFold"
import { PhaseDrag } from "./PhaseDrag"
import { phaseFields } from "./PhaseFields"
import { PhaseState } from "./PhaseState"
import { StateFilter, type ChipPick } from "./StateFilter"
import { TestQueue } from "./TestQueue"
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
  PHASE_FIELDS,
  PHASE_FILTER_STATES,
  REPORT,
  SECTION_LOOKS,
  STAYS_FOLDED_KINDS,
  ALL_QUERY,
  TEST_ALL,
  TEST_QUERY,
  type ChipState,
  type ChipStateName,
  type ContentsEntry,
  type EpicSectionVocabulary,
  type FilterState,
  type ItemStateName,
  type PhaseFieldName,
  type PhaseStateName,
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
   * - the phases drawn blue (`progress`, I170) too:  its own filter counts them in its blue badge, and the toolbar's
   *   chips are the items' alone (`stateFilter()`)
   * - read TRACKED:  the toolbar follows each mark (and reads `stateFilter` again with it)
   */
  get markedCount(): number {
    const section = this.section
    if (!section) return 0
    const working = section.kind === "phases" ? (section.stateCounts().get("progress") ?? 0) : 0
    return section.marked().size + working
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
 *   - an ⌥-click (epic `epic-engine` I166):  only that state, whatever showed
 *   - a filtered list says `3 hidden · show all` under it
 *   - each item it hides is marked `data-epic-filtered` (page state, never in the file:  the live patch keeps it),
 *     which the page sheet hides (`EpicSection.runs.css`;  a `::slotted(#id)` rule per item before epic `epic-engine`
 *     P45)
 *   - remembered per page, under the old runtime's key (`FILTER_KEY`);  `epic-filter-changed` says it changed
 *   - the page's toolbar filters every section at once, through its DOM element (`DOMEpicSectionElement`)
 * - The Phases section's STATE FILTER (epic `epic-engine` I157;  Owen, 2026-10-29:  "badges for
 *   'undone|updated|complete' -- e.g. 49 phases in this plan are a lot to scroll past"):  the same chips, rule, note,
 *   marks and memory, before its gear, by a phase's state (`PhaseState.of()`)
 *   - its phases with Claude in the blue badge, as an item section's marked items
 *   - NOT in the page's toolbar chips, which are the items' (`stateFilter()`)
 * - An item section's lines are drawn as rounded cards, one per RUN of lines between unfolded items' details
 *   (Owen, 2026-10-24):  each run's first line rounded on top, its last on the bottom.
 *   - by position, with sibling selectors, in a page sheet it registers (`EpicSection.runs.css`, P45;  Owen,
 *     2026-10-25:  "generic CSS, using sibling selectors ... rather than with explicit ids"):  the phases and the
 *     Overview's parts too
 * - The Phases section's title ends in a GEAR (epic `epic-engine` I166;  `EpicFold.renderGear()`), its menu
 *   "Show each phase's files" and "Show each phase's checks", ticked while on (the Files / Verify toggles before;
 *   Owen, 2026-10-29:  "something I'd rarely choose")
 *   - each shows or hides that field in every phase (`PhaseFields.setEveryPhase()`, forgetting each phase's own
 *     choice of it), through `--epic-files-display` / `--epic-verify-display`, which the fields read
 *   - a phase's own gear chooses for it alone (`<epic-phase>`)
 *   - remembered per page, under the toggles' old key
 * - While the page agrees its phases (`<epic-page stage="phases">`, reviewed), "Accept Phases" before the gear
 *   (`<epic-stage-button>`, `EpicFold.renderStageButton()`;  epic `epic-engine` I180):  the header's green pill in
 *   Send's place before (P29)
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
 * - The Manual tests section's tests are answered WHERE THEY ARE (epic `epic-engine` P51, Q53;  the separate test run
 *   went):  Approve passes one, a note (and a screenshot pasted in it) says what Owen saw, the note box's x says it
 *   no longer applies;  left alone, it waits.  Its button, on its title while reviewed and a test is open
 *   (`testButton()`):
 *   - "Start testing · 9":  Claude prepares the tests first, a request for now (`ReviewClient.prepareTests()`):  it
 *     checks what it can itself, writes out the rest step by step with a screenshot, and stamps each `prepared`
 *   - "Preparing tests", turning, while it does (a click calls it off);  once done, the first test opens (`TestQueue`)
 *   - every open test prepared:  "Next test · 3 left", which opens the next one he hasn't answered
 *   - the address's `?test=1` presses it as the page loads (`epic test <epic>`);  with `all`, its last line links the
 *     next epic with open tests once every test here is answered
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

  /**
   * The states the reader chose to show, as last left on this page;  `undefined`:  every state.
   * - by the DOM element's own `id`, read plainly:  a starting value, never followed
   */
  @E.state accessor chosen: readonly string[] | undefined = EpicSection.savedFilters()[this.domElement.id]

  /**
   * Its view of the review inbox:
   * - an Overview sub-section's:  keyed by its id (is the page reviewed?  has it a marked note?)
   * - the Manual tests section's:  keyed by its id, `tests`, for Start testing's request (epic `epic-engine` P51)
   * - the Todos and Questions sections':  for their new items (no id:  never marked themselves)
   * - other kinds never read it
   */
  readonly reviewState = new ReviewState(() =>
    this.kind === "overview-part" || this.kind === "tests" ? this.id : undefined
  )

  /** The Todos or Questions section's `<epic-new-item>`, as drawn:  Edit on a waiting item opens its form on it. */
  private newItem: (HTMLElement & { open: boolean; editing?: string }) | undefined

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
   * Each item's state, in page order;  the Phases section's phases' (`PhaseState.of()`:  red, orange, blue, dotted
   * blue, green, grey, the first that holds;  epic `epic-engine` I157, I170), which its chips filter as an item
   * section's do.
   */
  readonly itemStates = createMemo((): { item: Element; state: ChipStateName }[] => {
    if (this.kind === "phases")
      return this.counted
        .filter((child) => child.localName === "epic-phase")
        .map((phase) => ({ item: phase, state: this.phaseStateOf(phase) }))
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
   * - the Phases section's:  its phases Owen marked in this pass, not done (epic `epic-engine` I147, I157);  the same
   *   blue badge, left out of the phase chips and never hidden by them
   *   - a phase under way or being worked on is `progress` (I170), which the filter counts in that badge too, as an
   *     item's:  unless it's red or orange first (Owen's order)
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

  /** Its title has tools:  the Phases gear, or a state filter with chips (or the marked badge alone). */
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
                {this.filter()}
                {/* Accept Phases, before the gear, while the phases are agreed (I180) */}
                {this.renderStageButton("phases", this.reviewState.reviewing)}
                {this.gear()}
              </>
            )
          : kind === "overview-part"
            ? () => this.reviewButtons()
            : this.holdsItems()
              ? () => (
                  <>
                    <Show when={kind === "tests" && this.reviewState.reviewing() && this.testing()}>
                      {(testing) => this.testButton(testing)}
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
          <Show when={kind === "tests" && this.runsAll && this.reviewState.reviewing() && this.testing()?.left === 0}>
            {this.nextEpicLine()}
          </Show>
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

  ////////////////
  // ## Testing (epic `epic-engine` P51)
  ////////////////

  /**
   * The Manual tests section's button (`testButton()`), as things stand;  `undefined` with no open test:
   * - `open`:  open tests;  `left`:  those Owen hasn't answered (no mark of his yet)
   * - `prepared`:  every open test written out by Start testing (`<epic-item prepared>`)
   * - `preparing`:  Start testing's request is on its way or under way;  `queued`:  nobody has taken it yet
   */
  readonly testing = createMemo((): TestingState | undefined => {
    if (this.kind !== "tests" || isServer) return undefined
    const open = this.count()?.open
    if (!open) return undefined
    const running = this.reviewState.running()
    return {
      open,
      left: TestQueue.leftIds(this.domElement, this.reviewState.isMarked).length,
      prepared: TestQueue.isPrepared(this.domElement),
      preparing: !!running,
      queued: !!running?.queued
    }
  })

  /** Start testing's request is under way:  what `onPrepared()` follows. */
  get isPreparing(): boolean {
    return !!this.testing()?.preparing
  }

  /** Start testing was pressed on this visit, and its request hasn't finished:  the first test opens when it does. */
  private pressedStart = false

  /** The test it opened last:  Next test goes on from it (the address may have followed the scroll since). */
  private lastOpened: string | undefined

  /** The address asked for a run across every epic (`?test=1&all=1`, `epic test --all`):  read as it connects. */
  readonly runsAll = !isServer && EpicSection.testQuery() === TEST_ALL

  /** The next epic with open tests, for a run across every epic;  `null` once asked and none is left. */
  @E.state accessor nextEpic: TestsEntry | null | undefined = undefined

  /**
   * The Manual tests section's button (Owen, 2026-10-29, Q53:  "The 'Start testing' button in header of Manual Testing
   * could just do the grunt work for fleshing out what exactly I need to do for the test, screenshots, etc."):
   * - "Start testing · 9" (blue):  Claude prepares them (`startTesting()`)
   * - "Preparing tests" (its icon turning) while that runs;  a click calls it off
   * - every open test prepared:  "Next test · 3 left" ("Go through the tests" with none left), opening the next
   */
  private testButton(state: () => TestingState): JSX.Element {
    const words = () => {
      const testing = state()
      return testing.preparing
        ? this.translationForKey("preparingTests")
        : testing.prepared
          ? this.translationForKey(testing.left ? "nextTest" : "firstTest", { count: testing.left || testing.open })
          : this.translationForKey("startTesting", { count: testing.open })
    }
    const tip = () => {
      const testing = state()
      return testing.preparing
        ? testing.queued
          ? this.translationForKey("waitingTip", { why: this.reviewState.waitingWhy() })
          : this.translationForKey("preparingTip")
        : this.translationForKey(testing.prepared ? "nextTestTip" : "startTestingTip")
    }
    return (
      <ui-button
        class={START_TESTING}
        part={this.partForName("start-testing")}
        color="blue"
        appearance={state().prepared && !state().preparing ? undefined : "basic"}
        size="mini"
        icon={state().preparing ? "circle notch" : state().prepared ? "arrow right" : "flask"}
        data-busy={state().preparing ? "" : undefined}
        title={tip()}
        onClick={(event: MouseEvent) => {
          // a title's tool:  not a click on the title, which would fold it
          event.stopPropagation()
          this.startTesting()
        }}
      >
        {words()}
      </ui-button>
    )
  }

  /**
   * Press the button:
   * - while preparing:  call it off ("nevermind")
   * - every open test prepared, nothing new since:  straight to the next test (`openNext()`)
   * - else Start testing's request for now;  the first test opens when it's done (`onPrepared()`)
   */
  @E.untracked
  startTesting() {
    const client = this.reviewState.client
    const testing = this.testing()
    if (!client || !testing) return
    if (testing.preparing) {
      this.pressedStart = false
      void client.cancel(this.id ?? "")
      return
    }
    if (testing.prepared) return this.openNext()
    this.pressedStart = true
    void client.prepareTests()
  }

  /** Open the next test Owen hasn't answered, after the one it opened last (`TestQueue.nextId()`). */
  @E.untracked
  private openNext() {
    const current = this.lastOpened ?? decodeURIComponent(location.hash.slice(1))
    const id = TestQueue.nextId(this.domElement, this.reviewState.isMarked, current)
    if (!id) return
    this.lastOpened = id
    TestQueue.open(id)
  }

  /**
   * Start testing's request finished:  the first test opens (Owen, Q53:  then the page "opens the first test");
   * while he's typing, a notice says the tests are ready instead, and Next test opens it.
   * - only for a press on this visit:  a request another window asked for, or one called off, opens nothing
   */
  @E.onChange("isPreparing")
  protected onPrepared(preparing: boolean) {
    if (preparing || !this.pressedStart || isServer) return
    this.pressedStart = false
    if (!TestQueue.openIds(this.domElement).length) return
    if (TestQueue.isTyping()) return this.reviewState.client?.notify(this.translationForKey("testsReady"))
    this.lastOpened = undefined
    this.openNext()
  }

  /** It can press its button by itself:  the page reviewed, a test open.  What `pressFromAddress()` follows. */
  get canStartTesting(): boolean {
    return this.reviewState.reviewing() && !!this.testing()
  }

  /**
   * The address's `?test=1` (`epic test <epic>`, an old test run's link) presses the button once, as soon as it can;
   * the query then leaves the address, so a reload doesn't ask again (`all` stays, for the next epic's link).
   */
  @E.onChange("canStartTesting")
  protected pressFromAddress(can: boolean) {
    if (!can || isServer || this.kind !== "tests" || !new URLSearchParams(location.search).has(TEST_QUERY)) return
    const url = new URL(location.href)
    url.searchParams.delete(TEST_QUERY)
    if (this.runsAll) url.searchParams.set(ALL_QUERY, "1")
    history.replaceState(history.state, "", url.href)
    this.startTesting()
  }

  /** Every test here answered, in a run across every epic:  what `findNextEpic()` follows. */
  get isAllAnswered(): boolean {
    return this.runsAll && this.testing()?.left === 0
  }

  /** Every test answered, in a run across every epic:  ask the page server which epic has open tests next. */
  @E.onChange("isAllAnswered")
  protected findNextEpic(answered: boolean) {
    const client = this.reviewState.client
    if (!answered || !client || this.nextEpic !== undefined) return
    const here = location.pathname
    void client.openTests().then((entries) => {
      this.nextEpic = entries.find((entry) => !here.endsWith(entry.page.replace(/^\//, ""))) ?? null
    })
  }

  /** The section's last line in a run across every epic:  the next epic with open tests, or that none is left. */
  private nextEpicLine(): JSX.Element {
    return (
      <Show when={this.nextEpic !== undefined}>
        <p class={NEXT_EPIC} part={this.partForName("next-epic")}>
          <Show when={this.nextEpic} fallback={this.translationForKey("noEpicLeft")}>
            {(next) => (
              <a href={`${next().page}?${TEST_QUERY}=1&${ALL_QUERY}=1`}>
                {this.translationForKey("nextEpic", { epic: next().epic, count: next().open })}
              </a>
            )}
          </Show>
        </p>
      </Show>
    )
  }

  /**
   * The address's `?test=`:  `1` (any value), `all` (`?test=all`, or `?test=1&all=1` as `epic test --all` writes it,
   * or `all=1` left after it pressed the button), or `undefined` for none.
   */
  private static testQuery(): string | undefined {
    const query = new URLSearchParams(location.search)
    const value = query.get(TEST_QUERY)
    if (query.has(ALL_QUERY) || value === TEST_ALL) return TEST_ALL
    return value === null ? undefined : "1"
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
            phases={this.kind === "phases" ? "" : undefined}
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

  /**
   * The Phases title's gear (`EpicFold.renderGear()`, I166), last in its row:
   * "Show each phase's files" and "... checks", ticked while every phase shows them.
   */
  private gear(): JSX.Element {
    return this.renderGear({
      title: () => this.translationForKey("gearTip"),
      entries: () =>
        PHASE_FIELDS.map((it) => ({
          value: it.field,
          text: this.translationForKey(it.every),
          isOn: !!phaseFields.everyPhase()[it.field]
        })),
      pick: (field) => this.flip(field as PhaseFieldName)
    })
  }

  /** The Phases section's fields to show:  each field's custom property, `block` while every phase shows it. */
  protected foldStyle(): Record<string, string> | undefined {
    if (this.kind !== "phases") return undefined
    const shown = phaseFields.everyPhase()
    const style: Record<string, string> = {}
    for (const it of PHASE_FIELDS) if (shown[it.field]) style[it.property] = "block"
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

  /** An entry of its gear menu, picked:  show or hide `field` in every phase, and remember it. */
  @E.untracked
  private flip(field: PhaseFieldName) {
    phaseFields.setEveryPhase(field, !phaseFields.everyPhase()[field])
  }

  /** One of its state chips, clicked (`<epic-state-filter>`'s `epic-state-changed`). */
  @E.on(STATE_PICK, { target: "renderRoot" })
  protected onStatePick(event: CustomEvent<StatePickDetail>) {
    event.stopPropagation()
    this.pickState(event.detail.state, event.detail.how)
  }

  /** A state chip, clicked:  what shows next, by `StateFilter.nextShown()`'s rule;  ⌥-clicked, only its state. */
  @E.untracked
  private pickState(state: string, how: ChipPick = "click") {
    const present = this.present().map((it) => it.state as string)
    const next = StateFilter.nextShown(present, [...this.showing()], state, how)
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
   * Is `it` with Claude (`marked()`)?  An item, or a phase not done, marked in this pass.
   */
  private isWithClaude(it: { item: Element; state: ChipStateName }): boolean {
    if (it.item.localName !== "epic-phase") return this.reviewState.isMarked(it.item.id)
    return it.state !== "recent" && it.state !== "old" && this.reviewState.isMarked(it.item.id)
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
   * - `running`:  the phases drawn blue (`PhaseState.of()`, I170):  under way or being worked on (I147), and needing
   *   nothing of Owen first, nor changed since he looked;  a phase drawn red counts in `attention`
   */
  private countOf(children: readonly Element[]): SectionCount | undefined {
    if (!children.length) return undefined
    const open = children.filter(
      (child) => !(CLOSED_STATUSES as readonly string[]).includes(child.getAttribute("status") ?? "")
    ).length
    // an item Owen marked in this pass is with Claude (the blue badge), as its section's chips leave it out (P43)
    const states = children.map((child) =>
      child.localName === "epic-phase"
        ? child.id && child.getAttribute("status") !== "done" && this.reviewState.isMarked(child.id)
          ? "marked"
          : this.phaseStateOf(child)
        : child.localName !== "epic-item"
          ? (child.getAttribute("state") ?? "")
          : child.id && this.reviewState.isMarked(child.id)
            ? "marked"
            : this.drawnStateOf(child)
    )
    const attention = states.filter((state) => NEEDS_OWEN.has(state)).length
    const replied = states.filter((state) => state === "replied").length
    // a phase drawn blue (I170):  under way or worked on, and neither red nor orange first
    const running = children.filter((child, at) => child.localName === "epic-phase" && states[at] === "progress").length
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

  /**
   * A phase's state as DRAWN (`PhaseState.of()`, epic `epic-engine` I170):  its attributes, and the review inbox now
   * (Claude at work on it, its updates marked Seen);  the rule its own status circle draws by too.
   */
  private phaseStateOf(phase: Element): PhaseStateName {
    return PhaseState.of(PhaseState.fieldsOf(phase), {
      workedOn: !!phase.id && this.reviewState.liveOf(phase.id).workedOn,
      isSeen: (id) => this.reviewState.markOf(id)?.action === "seen"
    })
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

/** Class of the Manual tests section's last line in a run across every epic. */
const NEXT_EPIC = "next-epic"

/** The Manual tests section's button, as things stand (`EpicSection.testing()`). */
type TestingState = { open: number; left: number; prepared: boolean; preparing: boolean; queued: boolean }

/** Classes of the waiting new items (`newItemList()`):  the list, a card. */
const NEW_LIST = "new-list"
const NEW_CARD = "new-card"

/** Where a waiting item's link to the summary goes:  it has no id, so the Overview it opens. */
const SUMMARY_LINK = "overview"
