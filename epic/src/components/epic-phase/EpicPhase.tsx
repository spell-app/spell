import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import { PageStages, PhaseIds } from "spell-epic/phases"

// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell-epic/components/epic-review/ReviewState"
import { CHOSEN, SHOW_NOTE, type ReviewShows } from "spell-epic/components/epic-review/EpicReview.types"
import { STATUS_SLOT } from "spell-epic/components/epic-item/EpicItem.types"
// Import directly:  the fold base, not the `epic-section` barrel (which defines `<epic-section>`)
import { EpicFold } from "spell-epic/components/epic-section/EpicFold"
import type { ContentsEntry } from "spell-epic/components/epic-section/EpicSection.types"

import { epicPhaseVocabulary } from "./EpicPhase.en"
import { ICON } from "./EpicPhase.types"

import collapseAllCSS from "spell-epic/components/epic-item/CollapseAll.css?inline"
import foldCSS from "spell-epic/components/epic-section/EpicFold.css?inline"
import phaseCSS from "./EpicPhase.css?inline"
import tooltipCSS from "spell-epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicPhase`
 * The component behind `<epic-phase>`:  one phase of the plan, in the Phases section --
 * a fold (`EpicFold`) titled `P3 · <title>`.
 * - Its title line:
 *   - the status icon in its colour (grey to do, blue under way, green done);  while Claude is at work on it (the
 *     review inbox's `working`, I147), a blue turning spinner, its tooltip "Claude is writing this phase's plan" or
 *     "Claude is working on it"
 *   - `P3 · <title>` (`title`, or `slot="title"`);  a done phase's title reads quieter
 *     - `P3`:  its NUMBER, its place among the phases, worked out as it draws (`number`);  NOT its id, which is
 *       stable (`p-epic-migrate`, epic `epic-workflow` P15:  `PhaseIds`), so an insert renumbers no link
 *   - while it isn't done and its plan changed (`changes`, written by the tool):  an orange pen and how many times,
 *     so a folded phase says so too (its body, a part, isn't loaded until it opens)
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
 *   - Files and Verify show only while the Phases title's toggles say so;  commits while the page's git toggle does
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
 * - SIDE EFFECT:  follows the review inbox while connected.
 ****************/
export class EpicPhase extends EpicFold<typeof epicPhaseVocabulary> {
  @E.proto static vocabulary = epicPhaseVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: {
      "epic-tooltip": tooltipCSS,
      "epic-fold": foldCSS,
      "epic-collapse-all": collapseAllCSS,
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

  /** How many plan changes its title says it has:  `changes`, while it isn't done;  0 for none. */
  get changedCount(): number {
    return this.shownStatus === "done" ? 0 : (this.changes ?? 0)
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
    return (
      this.plan === "waiting" && this.shownStatus !== "done" && !DOC_REVIEW.test(EpicPhase.titleText(this.domElement))
    )
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
    return { label, icon: STATUS_ICONS[status], color: STATUS_COLORS[status] }
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
      // them), in the tools:  the review buttons end at one right edge on every row, the toggle-all after them
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
  // ## Plan changed
  ////////////////

  /**
   * Its title's mark while it isn't done and its plan changed:  the pen and how many times, in orange;
   * its name and tooltip say so (`changedTip`).
   */
  private changedMark(): JSX.Element {
    return (
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
    )
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
    // its own controls' only:  a nested element's come through here too
    if ((event.target as Node).getRootNode() !== event.currentTarget) return
    event.stopPropagation()
    this.collapse()
  }

  /** Revisit or Edit, pressed on its own review controls:  unfolded, its part loaded, to show the note box. */
  @E.on(SHOW_NOTE, { target: "renderRoot" })
  protected onShowNote(event: Event) {
    // its own controls' only:  a nested element's come through here too
    if ((event.target as Node).getRootNode() !== event.currentTarget) return
    event.stopPropagation()
    void this.reveal()
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicPhase extends E.AttributeValues<typeof epicPhaseVocabulary> {}

/** Class of its status icon's box while Claude is at work on it, and of the spinner in it (I147). */
const WORKING = "working"
const SPINNER = "spinner"

/** Class of the shadow markup:  the title's mark, its plan changed. */
const CHANGED = "changed"

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

/**
 * A phase's status => its icon's colour (Spell UI's `color`), as `EpicPhase.css`'s:
 * its `contentsEntry`'s, which only the contents list drew (gone 2026-10-08).
 */
const STATUS_COLORS = {
  todo: "grey",
  active: "blue",
  done: "green"
} as const satisfies Record<PhaseStatus, string>

/** The doc pass's title:  its build plan never waits for an Accept (`isPlanWaiting`). */
const DOC_REVIEW = /^doc review$/i

/** Class of its time pill (the estimate, or what it took), before its review controls. */
const ESTIMATE = "estimate"

/** Class of that pill while it says what the phase took. */
const TOOK = "took"
