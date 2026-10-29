import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

import { PageStages, PhaseIds } from "spell/epic/phases"

// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"
import { CHOSEN, stopIfOwn, type ReviewShows } from "spell/epic/components/epic-review/EpicReview.types"
import { STATUS_SLOT } from "spell/epic/components/epic-item/EpicItem.types"
// Import directly:  the fold base, not the `epic-section` barrel (which defines `<epic-section>`)
import { EpicFold } from "spell/epic/components/epic-section/EpicFold"
import { phaseFields } from "spell/epic/components/epic-section/PhaseFields"
import { PhaseState, type PhaseFields } from "spell/epic/components/epic-section/PhaseState"
import {
  PHASE_FIELDS,
  PHASE_FILTER_STATES,
  type ContentsEntry,
  type PhaseFieldName,
  type PhaseStateName
} from "spell/epic/components/epic-section/EpicSection.types"

import { epicPhaseVocabulary } from "./EpicPhase.en"
import { ICON } from "./EpicPhase.types"

import foldCSS from "spell/epic/components/epic-section/EpicFold.css?inline"
import phaseCSS from "./EpicPhase.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicPhase`
 * The component behind `<epic-phase>`:  one phase of the plan, in the Phases section --
 * a fold (`EpicFold`) titled `P3 · <title>`.
 * - Its title line:
 *   - the status icon, its shape by its status (an outline to do, half filled under way, a check done), its COLOUR
 *     by where it stands, as its Phases chip (`PhaseState.of()`, epic `epic-engine` I170;  Owen, 2026-10-29):  red
 *     needs Owen (a plan to accept, a choice open), orange changed since he looked, blue under way, a DOTTED blue
 *     circle scheduled, green done in the last 3 days, grey done before;  while Claude is at work on it (the review
 *     inbox's `working`, I147), a turning spinner in that colour (blue, unless red or orange come first), its tooltip
 *     "Claude is writing this phase's plan" or "Claude is working on it"
 *   - `P3 · <title>` (`title`, or `slot="title"`);  a done phase's title reads quieter
 *     - `P3`:  its NUMBER, its place among the phases, worked out as it draws (`number`);  NOT its id, which is
 *       stable (`p-epic-migrate`, epic `epic-workflow` P15:  `PhaseIds`), so an insert renumbers no link
 *   - while it isn't done and has NEW updates (`to-see`, written by the tool, less the ones quiet or marked Seen since;
 *     epic `epic-engine` I168):  an orange pen and how many, so a folded phase says so too (its body, a part, isn't
 *     loaded until it opens);  none left, no pen
 *     - while the page is reviewed, a ✓ after it:  Seen on every one at once
 *     - an older page's `changes` (every plan change) until the tool's next write
 *   - the estimate as a badge;  once done and timed, what it took instead (`21m`), the estimate its tooltip
 *     (`~3-4h`;  Owen, M1 and M3 on epic `epic-engine` P41)
 * - Its children, in order (the vocabulary's):
 *   - `<epic-field>`s (Symptom, Changes, Requests, Goal), Owen's kept notes (`<epic-reply>`)
 *   - its PLAN CHANGES, `<epic-update at summary>` blocks, at the end of its description, after Goal
 *     (Owen, 2026-10-11:  "lose the "Plan changes" surround.  The updated blocks themselves go at the end of the
 *     phase description"):  plain children, each its own block, with no box around them
 *   - Done, `<epic-commit>`s, Files, Verify, To review
 *   - An older doc's `<epic-updated>` lines (its `changes` slot, P6) show at the end of its body, unboxed,
 *     until the epic tool's next write migrates them (`updates-as-epic-update`)
 *   - Files and Verify show only while the Phases title's gear says so, or its own;  commits while the page's git
 *     toggle does
 * - Its body is usually a part (`source="parts/p-epic-migrate.html"`), loaded the first time it opens.
 * - REVIEWED as an Overview sub-section is, only while the page is reviewed
 *   (epic `airplane` P2;  `<epic-review buttons="part">`):
 *   - Make Todo, Revisit at its title's end (no Approve:  notes on the plan, not sign-off)
 *   - a marked note at the top of its body
 *   - its note box at the end, Claude's status cards (`slot="status"`) just above it
 *   - Revisit and Edit unfold it (`epic-note-showing`)
 *   - while the page's phases are agreed (`<epic-page stage="phases">`, epic `epic-engine` P29), an open phase's are
 *     Looks good and Defer instead (`buttons="proposal"`;  Owen, 2026-10-24);  the usual ones once building starts
 *   - while Claude's build plan for it waits (`plan="waiting"`, P33):  Accept plan and Revisit (`buttons="plan"`)
 *   - still to do, its plan accepted (`plan="accepted"`, I140):  Make Todo, Revisit and a green check, a state saying
 *     it's good to go (`buttons="accepted"`;  Owen, 2026-10-26:  "so I can see they are good to go")
 * - Its GEAR (epic `epic-engine` I166;  `EpicFold.renderGear()`), last on its title row, with an `id`:
 *   "Show this phase's files" and "Show this phase's checks", ticked while it shows them
 *   - its own choice (`PhaseFields.setOwn()`), which wins over the Phases section's gear for it:  its fields' custom
 *     properties set on its own box (`foldStyle()`), over the ones they'd inherit from the section
 *   - a list of entries:  more settings for one phase come as more entries
 * - SIDE EFFECT:  follows the review inbox while connected.
 ****************/
export class EpicPhase extends EpicFold<typeof epicPhaseVocabulary> {
  @E.proto static vocabulary = epicPhaseVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: {
      "epic-tooltip": tooltipCSS,
      "epic-fold": foldCSS,
      "epic-phase": phaseCSS
    }
  } satisfies Partial<E.ElementSetup>

  /** Its status, as drawn:  `todo` for anything unknown. */
  get shownStatus(): PhaseStatus {
    const status = this.status
    return status && status in STATUS_ICONS ? status : "todo"
  }

  /** Its status icon. */
  readonly glyph = new E.IconGlyph({ owner: this, name: () => STATUS_ICONS[this.shownStatus] })

  /** Its view of the review inbox, keyed by its id (`p-epic-migrate`):  is the page reviewed?  Has it a marked note? */
  readonly reviewState = new ReviewState(() => this.id)

  /** The pen of its title's mark:  its plan changed. */
  readonly changedGlyph = new E.IconGlyph({ owner: this, name: () => "pen to square" })

  /** What `PhaseState` reads of it:  its attributes as its props (tracked), its title as text. */
  get stateFields(): PhaseFields {
    return {
      status: this.shownStatus,
      plan: this.plan,
      toSee: this.toSee,
      changes: this.changes,
      choicesOpen: this.choicesOpen,
      doneAt: this.doneAt,
      title: EpicPhase.titleText(this.domElement)
    }
  }

  /**
   * Its update blocks still NEW, by id (epic `epic-engine` I168;  `PhaseState.newUpdates()`):  `to-see`'s, less the
   * ones gone quiet since it was written (`PlanDates.isQuiet()`) or marked Seen in the review inbox, while it isn't done.
   * - an older page, with `changes` and no `to-see` yet:  that many, unnamed, until the epic tool's next write
   */
  get newUpdates(): string[] {
    return PhaseState.newUpdates(this.stateFields, this.live, new Date())
  }

  /** How many plan changes its title's pen counts:  its new updates (`newUpdates`);  0 for none. */
  get changedCount(): number {
    return this.newUpdates.length
  }

  /**
   * Where it stands, as its Phases chip counts it (`PhaseState.of()`, epic `epic-engine` I170):  its status circle's
   * colour and fill, the same as the chip's.
   */
  get drawnState(): PhaseStateName {
    return PhaseState.of(this.stateFields, this.live)
  }

  /** What the review inbox says of it now, for `PhaseState`:  Claude at work on it;  an update marked Seen. */
  private get live() {
    return {
      workedOn: this.reviewState.workedOn(),
      isSeen: (id: string) => this.reviewState.markOf(id)?.action === "seen"
    }
  }

  /** What it took (`took`), shown once it's done;  `undefined` before, or never measured. */
  get tookShown(): string | undefined {
    return this.shownStatus === "done" ? this.took || undefined : undefined
  }

  /** Its time pill's words:  what it took, once done and timed;  else its estimate;  none:  no pill. */
  get timeShown(): string | undefined {
    return this.tookShown ?? (this.estimate || undefined)
  }

  /**
   * Its time pill's tooltip while it says what it took:  the estimate it had, `~3-4h` (Owen, M3 on P41);
   * none without one, or while the pill is the estimate itself.
   */
  get tookTip(): string | undefined {
    const estimate = this.estimate?.replace(/^~\s*/, "")
    return this.tookShown && estimate ? this.translationForKey("tookTip", { estimate }) : undefined
  }

  /**
   * PROPOSED:  open (not done), on a page whose phases are being agreed (`stage="phases"`, epic `epic-engine` P29):
   * its review pills are Looks good and Defer.
   * - read again on every layout change (the page's `layout`:  its `stage` changing too)
   */
  get isProposed(): boolean {
    void this.layout
    return this.shownStatus !== "done" && PageStages.of(this.page) === "phases"
  }

  /**
   * It can be DRAGGED to another place by its title row (epic `epic-engine` P34, the Phases section's `PhaseDrag`):
   * still to do, on a page being reviewed;  its title row shows the grab cursor and says so in its tooltip.
   */
  @E.cssState("movable")
  get isMovable(): boolean {
    return this.shownStatus === "todo" && this.reviewState.reviewing()
  }

  /**
   * Claude's build plan for it waits for Owen (`plan="waiting"`, epic `epic-engine` P33), and it isn't done:  its
   * review pills are Accept plan and Revisit.
   */
  get isPlanWaiting(): boolean {
    // the doc pass never asks (Owen, 2026-10-25:  "I shouldn't have to accept `doc review` phase")
    return PhaseState.isPlanWaiting(this.stateFields)
  }

  /**
   * Still to do, and Owen accepted Claude's build plan for it (`plan="accepted"`, epic `epic-engine` I140):  good to
   * go, its review group ending in a green check.
   */
  get isPlanAccepted(): boolean {
    return this.plan === "accepted" && this.shownStatus === "todo"
  }

  /**
   * Claude is at work on it, and it isn't done (the review inbox's `working`, keyed by its id:  `epic inbox working
   * <epic>#P20 on`, or `epic update <epic>#P20 --plan ...` by itself;  epic `epic-engine` I147).
   * - Owen, 2026-10-26:  "repo-split is actively planning this (writing the plan) but there is no indication in the
   *   phase header"
   * - its status icon turns into the header's turning spinner, in blue;  it counts in the Phases section's blue badge
   *   and the toolbar's
   */
  @E.cssState("working")
  get isWorkedOn(): boolean {
    return this.shownStatus !== "done" && this.reviewState.workedOn()
  }

  /**
   * While it's worked on, what Claude is doing:  writing its plan (still to do, the plan not accepted yet), else
   * working on it (the plan accepted, or the phase under way).
   */
  get workingText(): string {
    const planning = this.shownStatus === "todo" && this.plan !== "accepted"
    return this.translationForKey(planning ? "workingPlan" : "workingOn")
  }

  /** Which review controls it draws, by where it stands (`<epic-review buttons>`). */
  get reviewKind(): "proposal" | "plan" | "accepted" | "part" {
    if (this.isProposed) return "proposal"
    if (this.isPlanWaiting) return "plan"
    return this.isPlanAccepted ? "accepted" : "part"
  }

  /**
   * Its number:  its place among the whole-numbered phases, from 1, or its own decimal (`11.1`, epic `epic-engine`
   * P39;  `PhaseIds.numberOf()`), drawn `P3`, `P11.1`.
   * - read again on every layout change (the page's `layout`:  a phase inserted, moved or removed)
   */
  get phaseNumber(): string {
    void this.layout
    return PhaseIds.numberOf(this.domElement)
  }

  /**
   * The contents entry (`EpicFold.contentsEntry()`):  `P3 · <title>`, its status icon in its colour.
   * - From the attributes as they are NOW, read off the DOM element:  the live update reads it right after a patch
   */
  contentsEntry(): ContentsEntry {
    const written = this.domElement.getAttribute("status") ?? ""
    const status: PhaseStatus = written in STATUS_ICONS ? (written as PhaseStatus) : "todo"
    const label = `${PhaseIds.labelOf(this.domElement)} · ${EpicPhase.titleText(this.domElement)}`
    const state = PhaseState.of(PhaseState.fieldsOf(this.domElement), this.live)
    const color = PHASE_FILTER_STATES.find((it) => it.state === state)!.color
    return { label, icon: STATUS_ICONS[status], color }
  }

  /** Follow the review inbox while connected (kept alive:  a removed phase stops). */
  @E.whileConnected
  protected followReviews() {
    return this.reviewState.connect()
  }

  render(): JSX.Element {
    return this.renderFold({
      title: () => (
        <>
          <span class="id">P{this.phaseNumber}</span>
          <span class="dot" aria-hidden="true">
            {" · "}
          </span>
          <slot name={this.slotForName("title")}>{this.title}</slot>
        </>
      ),
      // after the title, on its first line:  a folded phase is where the pen matters
      mark: () => this.changedMark(),
      icon: () => (
        <Show
          when={this.isWorkedOn}
          fallback={
            <span
              class={[ICON, this.shownStatus]}
              part={this.partForName("status")}
              data-state={this.drawnState}
              role="img"
              aria-label={this.translationForKey(STATUS_TEXTS[this.shownStatus])}
            >
              {this.glyph.svg}
            </span>
          }
        >
          {/* Claude at work on it:  the header's turning spinner, blue (I147) */}
          <span
            class={[ICON, WORKING]}
            part={this.partForName("status")}
            data-state={this.drawnState}
            role="img"
            aria-label={this.workingText}
            title={this.workingText}
          >
            <span class={SPINNER} aria-hidden="true" />
          </span>
        </Show>
      ),
      // its time pill (the estimate, or what a done phase took) just BEFORE the review controls (Owen, 2026-10-25:
      // "time moved to the right, I preferred it to the left so the buttons lined up row to row";  I123 had it after
      // them), in the tools:  the review buttons end at one right edge on every row
      tools: () => (
        <>
          <Show when={this.timeShown}>
            {(shown) => (
              <span
                class={[ESTIMATE, { [TOOK]: !!this.tookShown }]}
                part={this.partForName("estimate")}
                title={this.tookTip}
              >
                {shown()}
              </span>
            )}
          </Show>
          {this.reviewButtons()}
          <Show when={this.id}>{(id) => this.gear(id())}</Show>
        </>
      ),
      before: () => this.saidNote(),
      after: () => (
        <>
          {/* an older doc's plan changes (`slot="changes"`, until the tool migrates them):  unboxed, at the end */}
          <slot name={this.slotForName("changes")} />
          {/* Claude's status cards (P13):  at the end of its body, above the note box */}
          <slot name={this.slotForName(STATUS_SLOT)} />
          <Show when={this.reviewState.reviewing()}>{this.reviewControl("note", "note-box")}</Show>
        </>
      )
    })
  }

  ////////////////
  // ## Its gear (I166)
  ////////////////

  /** Its gear:  "Show this phase's files" and "... checks", ticked while it shows them. */
  private gear(id: string): JSX.Element {
    return this.renderGear({
      title: () => this.translationForKey("gearTip"),
      entries: () =>
        PHASE_FIELDS.map((it) => ({
          value: it.field,
          text: this.translationForKey(it.one),
          isOn: phaseFields.shows(id, it.field)
        })),
      pick: (field) => phaseFields.setOwn(id, field as PhaseFieldName, !phaseFields.shows(id, field as PhaseFieldName))
    })
  }

  /**
   * Its own choice of fields (`PhaseFields.ownOf()`):  each field's custom property, `block` or `none`, on its own box;
   * a field it hasn't chosen inherits the Phases section's.
   */
  protected foldStyle(): Record<string, string> | undefined {
    const id = this.id
    if (!id) return undefined
    const own = phaseFields.ownOf(id)
    const style: Record<string, string> = {}
    for (const it of PHASE_FIELDS)
      if (own[it.field] !== undefined) style[it.property] = own[it.field] ? "block" : "none"
    return style
  }

  ////////////////
  // ## Plan changed
  ////////////////

  /**
   * Its title's mark while it isn't done and has new updates:  the pen and how many, in orange;
   * its name and tooltip say so, and what Seen does (`changedTip`).
   * - while the page is reviewed, a ✓ after it (epic `epic-engine` I168):  Seen on every one of them at once
   */
  private changedMark(): JSX.Element {
    return (
      <>
        <Show when={this.changedCount}>
          {(count) => (
            <span
              class={CHANGED}
              part={this.partForName("changed")}
              role="img"
              aria-label={this.translationForKey("changedTip", { count: count() })}
              title={this.translationForKey("changedTip", { count: count() })}
            >
              {this.changedGlyph.svg}
              {count()}
            </span>
          )}
        </Show>
        <Show when={this.showsSeenAll}>
          <ui-button
            class={SEEN_ALL}
            part={this.partForName("seen-all")}
            appearance="circular basic"
            size="mini"
            icon="check"
            title={this.translationForKey("seenAllTip", { count: this.newUpdates.length })}
            aria-label={this.translationForKey("seenAllTip", { count: this.newUpdates.length })}
            onClick={(event: MouseEvent) => this.seeAll(event)}
          />
        </Show>
      </>
    )
  }

  /** The pen's ✓ shows:  the page reviewed, new updates to mark (not an older page's `changes`). */
  get showsSeenAll(): boolean {
    return this.reviewState.reviewing() && this.newUpdates.length > 0
  }

  /** The pen's ✓:  every new update marked Seen;  the click goes no further (the title row would fold). */
  @E.untracked
  private seeAll(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.reviewState.markSeen(this.newUpdates)
  }

  ////////////////
  // ## Review
  ////////////////

  /** The review buttons at the title's end:  Make Todo, Revisit;  proposed, Looks good and Defer. */
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
    return (
      <epic-review
        of={this.id}
        label={`P${this.phaseNumber}`}
        shows={shows}
        buttons={this.reviewKind}
        part={this.partForName(part)}
      />
    )
  }

  /**
   * Owen chose an action on its own review controls (Accept, Defer, Looks good, a note box button):  it folds, as an
   * item does, so he moves on to the next (Owen, 2026-10-25, r32:  "Clicking accept or Revisit should collapse like it
   * does for questions").  Revisit opens the note box first, as an item's;  sending the note folds it.
   */
  @E.on(CHOSEN, { target: "renderRoot" })
  protected onChosen(event: Event) {
    if (stopIfOwn(event)) this.collapse()
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicPhase extends E.AttributeValues<typeof epicPhaseVocabulary> {}

/** Class of its status icon's box while Claude is at work on it, and of the spinner in it (I147). */
const WORKING = "working"
const SPINNER = "spinner"

/** Classes of the shadow markup:  the title's mark, its plan changed;  the ✓ after it, Seen on them all. */
const CHANGED = "changed"
const SEEN_ALL = "seen-all"

/** A phase's status => its icon (Spell UI's names, from the docs bundle's set). */
const STATUS_ICONS = {
  todo: "circle outline",
  active: "circle half stroke",
  done: "circle check"
} as const

/** A phase's status. */
type PhaseStatus = keyof typeof STATUS_ICONS

/** A phase's status => its icon's name's text key (`status*`:  the review controls' `todo` is Make Todo). */
const STATUS_TEXTS = {
  todo: "statusTodo",
  active: "statusActive",
  done: "statusDone"
} as const satisfies Record<PhaseStatus, string>

/** Class of its time pill (the estimate, or what it took), before its review controls. */
const ESTIMATE = "estimate"

/** Class of that pill while it says what the phase took. */
const TOOK = "took"
