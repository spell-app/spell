import { Show, createMemo } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

import { PlanDates } from "spell/epic/dates"
import { PhaseIds } from "spell/epic/phases"
// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"
import {
  CHOSEN,
  REVIEW_BUTTONS,
  SHOW_NOTE,
  TODO_BUTTONS,
  stopIfOwn,
  type ReviewShows
} from "spell/epic/components/epic-review/EpicReview.types"

import { AnswerThread } from "./AnswerThread"
import { epicItemVocabulary } from "./EpicItem.en"
import { Fold, type FoldButtonOptions, type Opener } from "./Fold"
import {
  BED_ICON,
  CANCELED,
  CELL,
  CHIP,
  CHOSEN_SET,
  COMMIT_TAG,
  COMMITS_PROPERTY,
  DETAILS,
  DETAILS_ID,
  EPIC_TAG,
  EXTRAS,
  FLOW_TAGS,
  FOLD,
  GIT,
  HAS_DETAILS,
  LABEL,
  LINE,
  MORE_TAG,
  NOTE,
  NOTE_OPEN,
  OVERNIGHT,
  FAILED,
  HANDLED,
  LIMIT,
  REVIEW,
  STATE_TIP_KEYS,
  STATUS_SLOT,
  DrawnState,
  THREAD_ATTRIBUTES,
  TITLE,
  TOGGLE,
  UNDER_LINE,
  UNDER_TITLE,
  UNFOLDED,
  type ChipMark,
  type EpicItemVocabulary,
  type StateFields,
  type ItemState,
  type ReviewLabel,
  isTodo
} from "./EpicItem.types"

import itemCSS from "./EpicItem.css?inline"
import tooltipCSS from "./Tooltip.css?inline"

/****************
 * ### `EpicItem`
 * The component behind `<epic-item>`:  one item -- question, judgement call, todo, issue or manual test.
 * Its kind is its id's letter (Q11).
 *
 * - Its LINE, in the shadow root, sticky while open (under the section titles stuck above it):
 *   - the fold chevron (only with details)
 *   - the id chip (`Q7`, a link to `#q7`), in its state's colour
 *   - the title (`title`, or `slot="title"`):  in full, as many lines as it needs, folded or open (Owen,
 *     2026-10-19:  "always show the full title, wrapped")
 *   - the page's own buttons (`slot="actions"`, and the docs runtime's bullhorn):  before its own;
 *     a click on one never folds it
 *   - the bed icon (`overnight`:  made overnight), the git icon (with commits)
 *   - handled in a phase (`handled`, epic `epic-engine` P31):  `in P4`, linking the phase;  the item grey
 *   - taken up in a phase (`taken-in`, epic `epic-engine` I128):  the same `in P4`, the item still green
 *   - the review label (`reviewed 10/6/26`, `deferred`, `to do`) and the review buttons
 * - `calm`:  an open judgement call or issue not reviewed yet is yellow (`open`), not red (`attention`).
 * - Its COMMITS (`<epic-commit>` children, or `commits` while its part isn't in):
 *   - hidden until the page's git toggle shows every commit
 *   - its git icon shows just its own, opening it first, and hides them again
 *     (T17, the old page runtime's `plan-git-hint`)
 *   - both through the same custom property, set on its details:
 *     with its icon off, it sets nothing, so the page's toggle still shows them
 * - Its DETAILS:  its light-DOM children, through the default slot,
 *   so find-in-page, `#d7` links and the live update see them (Q12).
 *   - hidden `until-found` while folded
 *   - over its own text:  `Original question` (answered), or `Original reply` (with a More Details card)
 *   - under them:  Claude's status cards (`<epic-status slot="status">`, P13), then the note box
 * - REVIEW (P9), three `<epic-review>`s:  its buttons, its note box, a marked note.
 *   - only while the page is reviewed (served with a token, its inbox answering:  `ReviewState`)
 *   - at the line's end:  Make Todo, Revisit, Approve, one group (no Do Now wand since 2026-10-25)
 *     - a todo's:  the plane (do it in the next phase), Revisit, the x (drop it:  Owen, 2026-10-09)
 *     - the review label in their tooltips, not beside them (Owen, 2026-10-07)
 *   - Revisit and Edit unfold it to show the box (`epic-note-showing`)
 *   - the note box:  LAST in its details, whatever its state
 *     - sticky at the window's bottom while it's open and taller than the window
 *     - without details:  under its line once Revisit opens it, lined up with where details start;
 *       its chevron then shows, and folding closes the box
 *   - a marked note just above the box, with Edit, and Claude's status cards between the two
 *   - While it carries a mark (a button dashed or outlined, or a pick), its id chip keeps its state's colour and
 *     wears the mark's fill (`chipMark`, Owen, 2026-10-11);  without one, its state's colour, solid.
 *   - Once Claude has handled the mark, the buttons CLEAR (Owen's input, taken):  the chip carries the result.
 *   - The id chip of an item Owen may call urgent or not (`canCalm`) is a button:
 *     urgent <-> not urgent, through the inbox (`ReviewClient.toggleCalm()`).
 *   - All in the shadow root:  a part reloaded keeps a half-typed note.
 * - FOLDING:  `open` (page state, never in the file).
 *   - a click on the line (not on a link or control in it), or Enter / Space on the chevron,
 *     go through the cancelable `ui-opening` / `ui-closing`
 *   - the chevron is THE fold button (`Fold.button()`), the line its band (`Fold.band()`):  every fold's, on the
 *     item's own open state (`showsOpen()`, `toggle()`;  epic `coherence` P22)
 *   - it opens for a link to the item, to an id in `part-ids`, or to an element inside it, and for find-in-page
 *   - folding while its line is stuck keeps the line where it is on screen (`keepLinePut()`)
 *   - its details fold and unfold by height, in Spell UI's section timing (`EpicItem.css`), however it folds:
 *     the auto-fold after an action jumped shut (Owen, 2026-10-10:  "make it animate.  It's jarring right now")
 *   - it folds by itself once Owen chooses an action for it (`foldAfterAction()`):
 *     a review button, a note box button, a Choose pill (Owen, 2026-10-10:  "collapse the item", so he moves on)
 *   - no collapse-all of its own (Owen, 2026-10-25:  "I don't like the 'collapse all' chevron here moving the buttons
 *     over ... lose it entirely");  the page's collapse-all folds the item and everything in it (`collapse()`)
 * - SOURCE:  `source="parts/q7.html"` is fetched the first time it opens (`LoadableBody`, as `<ui-section source>`).
 *   - into its LIGHT children, replacing the placeholder;  `ui-loaded` then
 *   - from `file://` it can't load:  the `Loads from ... (needs the page server)` note, as today
 * - The DOM element's own `title` would show as a tooltip over everything in it, prose included:
 *   the shadow wrapper's EMPTY `title` stops it there (T8).
 * - SIDE EFFECT:  with `source`, replaces its own light children (the placeholder) with the part;
 *   listens for `hashchange` while connected.
 ****************/
export class EpicItem extends E.UIComponent<EpicItemVocabulary> {
  @E.proto static vocabulary = epicItemVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-item": itemCSS },
    DOMElement: E.DOMLoadableBodyElement,
    // a container:  a click on its text must not jump to the fold button or a link inside
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## State
  ////////////////

  /** Light-DOM slot occupancy:  has it details? */
  readonly slots = new E.SlotContent(this.domElement)

  /** `open`:  the DOM element's (a boolean is always the DOM element's, see `@controlled`). */
  @E.controlled("open") accessor isMarkedOpen = false

  /**
   * What its light children start with, and whether a More Details card is among them:  for its label.
   * - Follows them as they change.
   */
  @E.watches({ childList: true, characterData: true, subtree: true })
  get childScan(): ChildScan {
    return this.scanChildren()
  }

  /** Its view of the page's review inbox:  its chip, its state, where its review controls show. */
  readonly reviewState = new ReviewState(() => this.id)

  /**
   * Owen marked it in this pass, not applied yet (epic `epic-engine` P43):  its id chip ringed in the blue badge's blue
   * (Owen, 2026-10-25:  "the T1 should be blue outline")
   */
  readonly isMarkedInPass = (): boolean => !!this.reviewState.mark()

  /** Its line, once drawn:  folding keeps it where it is on screen (`keepLinePut()`). */
  private lineBox: HTMLElement | undefined

  /** Its own commits show (its git icon pressed). */
  @E.state accessor showCommits = false

  /** Its line sits right under the section titles stuck above it, scrolled there:  its top corners square (`watchScroll()`). */
  @E.state accessor isUnderTitle = false

  /** The git icon's glyph. */
  readonly gitGlyph = new E.IconGlyph({ owner: this, name: () => "git" })

  /** The bed icon's glyph:  made overnight. */
  readonly bedGlyph = new E.IconGlyph({ owner: this, name: () => (this.overnight ? BED_ICON : undefined) })

  /** Its details from `source`, loaded the first time it opens;  into the DOM element's light DOM. */
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
    return this.source || undefined
  }

  /** Load the `source` part whenever it's open and connected (`open` alone:  a `source` means details). */
  @E.onChange("source", "isMarkedOpen", "isConnected")
  protected onSourceShown(source: string | undefined, open: boolean, connected: boolean) {
    if (source && open && connected) this.body.load().catch(() => undefined)
  }

  ////////////////
  // ## Derived state
  ////////////////

  /**
   * Its review buttons, in their order:
   * a todo's three (the plane, Revisit, the x:  Owen, 2026-10-09), else an item's four.
   * - declared before `chipMark`, which reads it (memos compute as they're made)
   */
  readonly reviewButtons = createMemo(() => (isTodo(this.id, this.limit) ? TODO_BUTTONS : REVIEW_BUTTONS))

  /**
   * May Owen call it urgent or not (its id chip, while the page is reviewed)?
   * - yes for an open judgement call or issue, not reviewed, nothing queued or under way:
   *   the items red for want of a review (`PlanReader.itemState()`)
   */
  readonly canCalm = createMemo(() => DrawnState.canCalm(this.stateFields()))

  /**
   * Where it stands, as drawn:  `DrawnState.of()`, the ONE rule its section's and the page's counts use too.
   * - Claude's agent at work on it (the review inbox's `working`):  `progress` (blue), at once
   * - Owen's urgency, not applied yet:  `open` or `attention`, at once
   * - else `state` as the tool wrote it, or by its status, greyed with age
   */
  readonly itemState = createMemo((): ItemState => DrawnState.of(this.stateFields(), this.reviewState.liveOf()))

  /** Its attributes its drawn state reads (`DrawnState.of()`), tracked. */
  private stateFields(): StateFields {
    const { id, state, status, changed, reviewed, queued, working } = this
    return { id, state, status, changed, reviewed, queued, working }
  }

  /**
   * Where Owen's answer on it stands, as its id chip wears it (Owen, 2026-10-10:  "leaning into outlines"):
   * the FILL says how far it got, so he sees at a glance what he already answered.
   * - his live mark:  the item's OWN state colour, DASHED until sent, then OUTLINED (Owen, 2026-10-11:  a red item
   *   marked Revisit turned blue, and the section's red count no longer matched any chip;  no `color` here)
   *   - the note box's x (`skip`, Owen, 2026-10-09) has no button on the line:  the chip alone shows it
   * - a pick Claude took off the inbox, its `chosen` not on the page yet:  green, outlined
   * - answered, and the work still due:  OUTLINED
   *   - queued (`queued`:  a review said "do it", a todo's plane):  green
   *   - Claude working on it (an underway card, an agent at work:  `progress`):  blue
   * - `undefined` once nothing more is due, so the chip shows its state SOLID:
   *   the RESULT (Owen, 2026-10-08):
   *   green decided or done, yellow still open, red needs Owen, orange Owen's turn to pick
   */
  readonly chipMark = createMemo((): ChipMark | undefined => {
    // Owen's own mark in flight:  no colour, so the chip keeps its state's (the section's counts still match it)
    for (const spec of this.reviewButtons()) {
      const fill = this.reviewState.fillOf(spec.action)
      if (fill === "dashed" || fill === "outline") return { fill, label: spec.label }
    }
    const mark = this.reviewState.mark()
    const fill = this.reviewState.isSent() ? "outline" : "dashed"
    if (mark?.action === "skip") return { fill, label: "boxSkip" }
    if (mark?.pick) return { fill, label: { pick: mark.pick } }
    // read plainly:  the doc's `chosen` lands with the item's own attributes changing
    // (`reviewed`, `state` ...), which re-run this
    const taken = this.reviewState.takenPick()?.pick
    if (taken && !this.domElement.querySelector(CHOSEN_SET))
      return { color: "green", fill: "outline", label: { pick: taken } }
    if (this.itemState() === "progress") return { color: "blue", fill: "outline" }
    if (this.queued && this.status === "open") return { color: "green", fill: "outline" }
    return undefined
  })

  /** Is its id chip a button (urgent <-> not urgent) now?  Only while the page is reviewed. */
  readonly chipToggles = createMemo(() => this.reviewState.reviewing() && this.canCalm())

  /** Has details to fold:  a `source`, or children in the default slot or the status cards' (`slot="status"`). */
  readonly hasDetails = createMemo(
    () => !!this.source || this.slots.hasContent("") || this.slots.hasContent(this.slotForName(STATUS_SLOT))
  )

  /**
   * A fresh token whenever its light DOM changes in a way its thread reads:  children come and go (a part loads),
   * a Choices is chosen, a reply's or a status card's times, state or slot change.
   * - its value is nothing:  `thread()` reads it to follow the change
   */
  @E.watches({ childList: true, subtree: true, attributes: true, attributeFilter: THREAD_ATTRIBUTES })
  get threadChange(): object {
    return {}
  }

  /** Shows Owen's marked note in its details, after the replies (the review's `said` note). */
  readonly saidShows = createMemo(() => this.reviewState.reviewing() && this.hasDetails() && !!this.reviewState.noted())

  /**
   * How it draws the talk after its question (epic `epic-engine` P27):  the thread, the status lines, a drive-by's,
   * whether the answer card is needed, Claude's newest reply (`AnswerThread`).
   * - its cards read their part of it (`ItemLink`)
   */
  readonly thread = createMemo(() => {
    void this.threadChange
    return AnswerThread.of(this.domElement, { said: this.saidShows() })
  })

  /** Unfolded. */
  readonly isOpen = createMemo(() => !!this.isMarkedOpen && this.hasDetails())

  /**
   * Its note box is open under its line (an item without details, Revisit pressed).
   * - its chevron shows, unfolded, and folding closes the box, its draft kept
   *   (Owen, 2026-10-09:  "note item is not collapsible")
   */
  readonly boxUnderLine = createMemo(
    () => this.reviewState.reviewing() && !this.hasDetails() && this.reviewState.boxOpen()
  )

  /** Has a chevron:  details to fold, or a note box open under its line. */
  readonly foldable = createMemo(() => this.hasDetails() || this.boxUnderLine())

  /** Shows as unfolded:  its details, or its note box under the line. */
  readonly showsOpen = createMemo(() => this.isOpen() || this.boxUnderLine())

  /** Details box held closed while the `source` part is on its way. */
  readonly veiled = createMemo(() => !isServer && !!this.source && this.body.isVeiled)

  /** Its id as shown:  `Q7`. */
  readonly label = createMemo(() => (this.id ?? "").toUpperCase())

  /** The review label, from its marks:  `to do`, else `deferred`, else `reviewed 10/6/26`;  none when unmarked. */
  readonly review = createMemo((): ReviewLabel | undefined => {
    const { queued, deferred, reviewed, work } = this
    if (queued) return { words: this.translationForKey("reviewTodo"), look: "todo", tip: work || undefined }
    if (deferred) {
      const tip = this.translationForKey("tipDeferred", { date: PlanDates.format(deferred) })
      return { words: this.translationForKey("reviewDeferred"), look: "deferred", tip }
    }
    if (reviewed) {
      const look = this.itemState() === "recent" ? "recent" : "old"
      return { words: this.translationForKey("reviewed", { date: PlanDates.format(reviewed) }), look }
    }
    return undefined
  })

  /** Lists commits:  `commits` (its part not in yet), or `<epic-commit>` children. */
  readonly hasCommits = createMemo(() => !!this.commits || this.childScan.hasCommits)

  /**
   * The review label, in words, for the review buttons' tooltips (`Approve · reviewed 10/7/26`):
   * while the page is reviewed, the buttons say it, not a label beside them (Owen, 2026-10-07).
   */
  readonly reviewTip = createMemo((): string | undefined => {
    const { queued, work, deferred, reviewed } = this
    if (queued) return this.translationForKey("tipTodo", { work: work || queued })
    if (deferred) return this.translationForKey("tipDeferred", { date: PlanDates.format(deferred) })
    if (reviewed) return this.translationForKey("reviewed", { date: PlanDates.format(reviewed) })
    return undefined
  })

  /** Anything at the line's end:  the page's own buttons, the bed and git icons, a review label, the review buttons. */
  readonly hasExtras = createMemo(
    () =>
      this.slots.hasContent(this.slotForName("actions")) ||
      !!this.overnight ||
      this.failed !== undefined ||
      !!this.handled ||
      !!this.takenIn ||
      this.hasCommits() ||
      !!this.review() ||
      this.reviewState.reviewing()
  )

  /**
   * The id chip's tooltip:  where it stands, then its review marks (`Needs attention · not reviewed yet`);
   * while it toggles, what a click does (and an urgency not sent yet).
   */
  readonly chipTip = createMemo(() => {
    const { queued, work, reviewed, deferred, status } = this
    // greyed with age (`ItemAge`), it's still decided or done, not "no longer relevant"
    const aged = this.itemState() === "old" && this.status !== "canceled"
    const parts = [this.translationForKey(STATE_TIP_KEYS[aged ? "recent" : this.itemState()])]
    const mark = this.chipMark()
    // a mark with no label (work still due:  queued, Claude on it):  the state's words and `to do` say it
    if (mark?.label) {
      const { label } = mark
      const chosen =
        typeof label === "string"
          ? this.translationForKey(label)
          : this.translationForKey("tipPick", { letter: label.pick })
      parts.push(this.translationForKey(mark.fill === "dashed" ? "tipMarkUnsent" : "tipMarkSent", { chosen }))
    }
    if (queued) parts.push(this.translationForKey("tipTodo", { work: work || queued }))
    if (reviewed) parts.push(this.translationForKey("tipReviewed", { date: PlanDates.format(reviewed) }))
    else if (deferred) parts.push(this.translationForKey("tipDeferred", { date: PlanDates.format(deferred) }))
    else if (status === "open") parts.push(this.translationForKey("tipNotReviewed"))
    if (this.chipToggles()) {
      const urgency = this.reviewState.urgency()
      if (urgency && !urgency.sent) parts.push(this.translationForKey("tipUrgencyUnsent"))
      parts.push(this.translationForKey(this.itemState() === "attention" ? "tipMakeCalm" : "tipMakeUrgent"))
    }
    return parts.join(" · ")
  })

  /** `Original question` / `Original reply` over its own text, or none. */
  readonly textLabel = createMemo((): string | undefined => {
    const { startsWithProse, hasMore } = this.childScan
    if (!startsWithProse) return undefined
    if (this.answered) return this.translationForKey("originalQuestion")
    return hasMore ? this.translationForKey("originalReply") : undefined
  })

  /** The note when the `source` part failed;  else `undefined`. */
  readonly failureText = createMemo(() => {
    const failure = this.body.loadError
    if (!failure) return undefined
    const key = E.SOURCE_FAILURE_KEYS[failure.kind] ?? E.SOURCE_FAILURE_KEYS.load
    return this.translationForKey(key as never, { source: this.source ?? "" })
  })

  ////////////////
  // ## Element hooks
  ////////////////

  /**
   * Words before the noun:  its state (`attention item`), `canceled`, `limit`, `has-details`, `note-open`, `unfolded`.
   * - NOTE: `unfolded`, not `open`:  `open` is a state (yellow) already.
   * - Of the statuses only `canceled` looks different (struck through), so only it is a word here.
   */
  protected get extraClass(): string | undefined {
    const canceled = this.status === CANCELED
    return [
      this.itemState(),
      canceled && CANCELED,
      this.limit && LIMIT,
      this.hasDetails() && HAS_DETAILS,
      this.boxUnderLine() && NOTE_OPEN,
      this.isOpen() && UNFOLDED,
      this.isUnderTitle && UNDER_TITLE
    ]
      .filter(Boolean)
      .join(" ")
  }

  protected cssStates() {
    const status = this.body.loadStatus
    return {
      open: this.isOpen(),
      loaded: status === "loaded",
      error: status === "error",
      commits: this.showCommits && this.hasCommits()
    }
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** The inbox's changes, while connected (kept alive:  a removed item must stop listening). */
  @E.whileConnected
  protected followReviews() {
    return this.reviewState.connect()
  }

  render(): JSX.Element {
    return (
      // an EMPTY title:  the DOM element's `title` would otherwise be a tooltip over all of it (T8)
      <div class={this.rootClass} part={this.partForName("base")} title="">
        {this.renderLine()}
        <Show when={this.reviewState.reviewing() && !this.hasDetails()}>
          <div class={UNDER_LINE}>
            {this.saidNote()}
            <Show when={this.reviewState.boxOpen()}>{this.noteBox()}</Show>
          </div>
        </Show>
        <div
          id={DETAILS_ID}
          class={DETAILS}
          part={this.partForName("details")}
          hidden={!this.isOpen() || this.veiled() ? "until-found" : undefined}
          style={this.showCommits ? { [COMMITS_PROPERTY]: "block" } : undefined}
        >
          <Show when={this.failureText()}>
            <p class={NOTE} part={this.partForName("error")}>
              {this.failureText()}
            </p>
          </Show>
          <Show when={this.textLabel()}>
            <div class={LABEL} part={this.partForName("label")}>
              {this.textLabel()}
            </div>
          </Show>
          {/* the light details in a block of their own:  the details are a column, so a drive-by's status line
              can go first (its `order`), and the prose's margins still collapse in here */}
          <div class={FLOW}>
            <slot />
          </div>
          {/* last in every item, whatever its state (Owen, 2026-10-07):  what was noted, Claude's status cards under
              it ("under my input", Owen, 2026-10-08, P13), then the box */}
          <Show when={this.reviewState.reviewing() && this.hasDetails()}>{this.saidNote()}</Show>
          <slot name={this.slotForName(STATUS_SLOT)} />
          <Show when={this.reviewState.reviewing() && this.hasDetails()}>{this.noteBox()}</Show>
        </div>
      </div>
    )
  }

  /** The line:  chevron, id chip, title, then its actions box:  the `actions` slot, review label, review buttons. */
  private renderLine(): JSX.Element {
    return (
      <div
        ref={[(element: HTMLDivElement) => (this.lineBox = element), Fold.band(this.opener)]}
        class={LINE}
        part={this.partForName("line")}
      >
        <span class={[CELL, FOLD]}>
          <Show when={this.foldable()}>{Fold.button(this.opener, this.foldButton)}</Show>
        </span>
        <span class={CELL}>
          <Show
            when={this.chipToggles()}
            fallback={
              <a
                class={CHIP}
                part={this.partForName("id")}
                href={`#${this.id ?? ""}`}
                data-color={this.chipMark()?.color}
                data-fill={this.chipMark()?.fill}
                data-marked={this.isMarkedInPass() ? "" : undefined}
                title={this.chipTip()}
              >
                {this.label()}
              </a>
            }
          >
            <button
              type="button"
              class={CHIP}
              part={this.partForName("id")}
              data-color={this.chipMark()?.color}
              data-fill={this.chipMark()?.fill}
              data-marked={this.isMarkedInPass() ? "" : undefined}
              aria-pressed={this.itemState() === "attention" ? "true" : "false"}
              data-unsent={this.reviewState.urgency()?.sent === false ? "" : undefined}
              title={this.chipTip()}
              onClick={this.flipUrgency}
            >
              {this.label()}
            </button>
          </Show>
        </span>
        {/* in full, wrapped, folded or open (EpicItem.css) */}
        <span class={TITLE} part={this.partForName("title")}>
          <slot name={this.slotForName("title")}>{this.title}</slot>
        </span>
        <span class={[CELL, EXTRAS]} part={this.partForName("actions")} hidden={!this.hasExtras()}>
          {/* the page's own buttons first, then the item's (`CONTROLS`:  a click on one never folds) */}
          <slot name={this.slotForName("actions")} />
          <Show when={this.overnight}>
            <span
              class={OVERNIGHT}
              part={this.partForName("overnight")}
              role="img"
              aria-label={this.translationForKey("madeOvernight")}
              title={this.translationForKey("madeOvernight")}
            >
              {this.bedGlyph.svg}
            </span>
          </Show>
          <Show when={this.failed !== undefined}>{this.failedMark()}</Show>
          <Show when={this.handled || this.takenIn}>{this.handledMark()}</Show>
          <Show when={this.hasCommits()}>{this.gitButton()}</Show>
          <Show when={!this.reviewState.reviewing() && this.review()}>
            {(review) => (
              <span class={[REVIEW, review().look]} part={this.partForName("review")} title={review().tip}>
                {review().words}
              </span>
            )}
          </Show>
          <Show when={this.reviewState.reviewing()}>{this.reviewControl("buttons", "review-buttons")}</Show>
        </span>
      </div>
    )
  }

  /**
   * A test that failed in Owen's test run (`failed="i42"`, epic `epic-engine` P4):  a red "failed → I42" on its line,
   * linking the issue it was filed as;  just "failed" without one.
   */
  private failedMark(): JSX.Element {
    const issue = () => this.failed ?? ""
    return (
      <ui-label
        class={FAILED}
        part={this.partForName("failed")}
        size="mini"
        appearance="basic"
        color="red"
        link={issue() ? `#${issue()}` : undefined}
        title={this.translationForKey(issue() ? "failedTip" : "failedTipNone", { id: issue().toUpperCase() })}
      >
        {this.translationForKey(issue() ? "failedMark" : "failedMarkNone", { id: issue().toUpperCase() })}
      </ui-label>
    )
  }

  /**
   * Handled in a phase (`handled="p-retry-logic"`, epic `epic-engine` P31):  a quiet grey `in P4` on its line,
   * linking the phase;  its tooltip names it (`P4 · Retry Logic`).
   * - taken up in a phase (`taken-in`, epic `epic-engine` I128):  the same chip, its tooltip saying it was fixed or
   *   done there;  `handled` wins when an item has both
   * - the phase read from the page when drawn:  a phase moved since shows its old number until the next redraw
   */
  private handledMark(): JSX.Element {
    const phaseId = () => this.handled || this.takenIn || ""
    const phase = () => {
      const element = isServer ? null : document.getElementById(phaseId())
      if (element?.localName !== "epic-phase") return { short: "P?", full: phaseId() }
      const short = `P${PhaseIds.numberOf(element)}`
      const title = element.getAttribute("title")
      return { short, full: title ? `${short} · ${title}` : short }
    }
    return (
      <ui-label
        class={HANDLED}
        part={this.partForName("handled")}
        size="mini"
        appearance="basic"
        link={`#${phaseId()}`}
        title={this.translationForKey(this.handled ? "handledTip" : "takenTip", { phase: phase().full })}
      >
        {this.translationForKey("handledIn", { phase: phase().short })}
      </ui-label>
    )
  }

  /** The git icon:  shows or hides its own commits;  pressed while they show. */
  private gitButton(): JSX.Element {
    const words = () => this.translationForKey(this.showCommits ? "hideCommits" : "showCommits")
    return (
      <button
        type="button"
        class={GIT}
        part={this.partForName("git")}
        aria-pressed={this.showCommits ? "true" : "false"}
        aria-label={words()}
        title={words()}
        onClick={this.flipCommits}
      >
        {this.gitGlyph.svg}
      </button>
    )
  }

  /**
   * A marked note, its box closed:  just above the note box;  nothing without one.
   * - in the item's thread, after its replies:  on the block's ground (`in-thread`;  `thread-end` when no status
   *   line follows it)
   */
  private saidNote(): JSX.Element {
    return <Show when={this.reviewState.noted()}>{this.reviewControl("said", "said")}</Show>
  }

  /**
   * The note box:  docked at the end of its details,
   * or under its line (an item without details:  `under-line`, so leaving it closes it).
   */
  private noteBox(): JSX.Element {
    return this.reviewControl("note", "note-box")
  }

  /** One of its review controls (`<epic-review>`):  what it `shows`, as its `part`. */
  private reviewControl(shows: ReviewShows, part: "review-buttons" | "note-box" | "said"): JSX.Element {
    return (
      <epic-review
        of={this.id}
        shows={shows}
        buttons={isTodo(this.id, this.limit) ? "todo" : "item"}
        label={this.label()}
        tip={this.reviewTip()}
        under-line={shows === "note" && !this.hasDetails() ? "" : undefined}
        part={this.partForName(part)}
        class={
          shows === "said" ? { [IN_THREAD]: !!this.thread().said, [THREAD_END]: !!this.thread().said?.end } : undefined
        }
      />
    )
  }

  ////////////////
  // ## Review
  ////////////////

  /** Revisit or Edit, pressed on its own review controls:  unfolded to show the note box, if it has details. */
  @E.on(SHOW_NOTE, { target: "renderRoot" })
  protected onShowNote(event: Event) {
    if (stopIfOwn(event)) this.reveal()
  }

  /** Owen chose an action on its own review controls (a review button, a note box button):  it folds. */
  @E.on(CHOSEN, { target: "renderRoot" })
  protected onChosen(event: Event) {
    if (stopIfOwn(event)) this.foldAfterAction()
  }

  ////////////////
  // ## Source (`DOMLoadableBodyElement`)
  ////////////////

  /** Fetch and insert the `source` part now, folded or not;  once per `source`. */
  loadBody(): Promise<void> {
    return this.body.load()
  }

  /** Fetch the `source` part again past the cache, and replace it (the live update). */
  reloadBody(): Promise<void> {
    return this.body.reload()
  }

  ////////////////
  // ## Folding
  ////////////////

  /**
   * Open or folded, as `open` (`isMarkedOpen`;  the kit's `Disclosure`):  only while it has details (`isOpen()`).
   * - the cancelable `ui-opening` / `ui-closing` first;  folding keeps its line where it is on screen (`keepLinePut()`)
   */
  readonly disclosure = new E.Disclosure({
    component: this,
    member: "isMarkedOpen",
    isOpen: () => this.isOpen(),
    canChange: () => this.hasDetails(),
    detail: (open, originalEvent) => ({ open, item: this.domElement, originalEvent }),
    beforeChange: (open) => {
      if (!open) this.keepLinePut()
    }
  })

  /**
   * Fold or unfold as the user would:  the cancelable `ui-opening` / `ui-closing` first, then `open`.
   * - true when applied
   * - without details:  folding its note box open under the line closes it, the draft kept;  else nothing
   */
  @E.untracked
  toggle(originalEvent?: Event): boolean {
    if (!this.hasDetails()) {
      if (!this.boxUnderLine()) return false
      this.reviewState.client?.closeBox(this.reviewState.id(), false)
      return true
    }
    return this.disclosure.toggle(originalEvent)
  }

  /** Fold it, if open, as a click on its line would (`toggle()`);  true when it folded.  Collapse-all's. */
  @E.untracked
  collapse(): boolean {
    return this.isOpen() ? this.toggle() : false
  }

  /** Open it, if folded and it has details, as a click on its line would (`toggle()`);  true when it opened.  Expand-all's. */
  @E.untracked
  expand(): boolean {
    return !this.isOpen() && this.hasDetails() ? this.toggle() : false
  }

  /**
   * Owen chose an action for it (a review button, a note box button, a Choose pill):
   * fold it, so he moves on to the next (Owen, 2026-10-10), its line kept where it is on screen.
   * - folded already, or nothing to fold:  nothing
   */
  @E.untracked
  foldAfterAction() {
    if (this.showsOpen()) this.toggle()
  }

  /**
   * About to fold while its line is STUCK (its top scrolled past):
   * scroll at once, so the line stays where it is on screen and the details fold away below it.
   * - as the docs runtime's `keepTitlePut()` (`spell-doc-runtime.js`), for an item
   * - why:  else the page keeps its scroll while the details vanish above it,
   *   and the reader lands as far down the page as he'd read into the item
   *   (Owen, 2026-10-10:  "loses the scroll of the page entirely")
   */
  private keepLinePut() {
    const line = this.lineBox
    const base = line?.parentElement
    if (!line || !base) return
    const stuckAt = line.getBoundingClientRect().top
    const top = base.getBoundingClientRect().top
    if (top >= stuckAt - 1) return
    window.scrollTo({ top: window.scrollY + top - stuckAt, behavior: "instant" })
    // the room an open item keeps above it (I105) goes once it's folded:  the line put back where it was, again
    E.beforeNextPaint(() => {
      const moved = line.getBoundingClientRect().top - stuckAt
      if (Math.abs(moved) >= 1) window.scrollBy({ top: moved, behavior: "instant" })
    })
  }

  /** Unfold for a link or find-in-page:  `ui-opening` after the fact (not cancelable). */
  private reveal() {
    if (this.hasDetails()) this.disclosure.adopt(true)
  }

  /** The git icon, clicked:  its commits shown (it opens, loading its part) or hidden again;  the line doesn't fold. */
  private readonly flipCommits = () => {
    const on = !this.showCommits
    this.showCommits = on
    if (on) this.reveal()
  }

  /** The id chip clicked while it toggles:  urgent <-> not urgent;  the line doesn't fold. */
  @E.untracked
  private readonly flipUrgency = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    this.reviewState.toggleCalm(!!this.calm)
  }

  /**
   * What its line's chevron and the line fold (`Fold.button()`, `Fold.band()`):  its own open state, as it shows
   * (its details, or its note box under the line), and `toggle()`.
   */
  private readonly opener: Opener = {
    isOpen: () => this.showsOpen(),
    toggle: (originalEvent) => this.toggle(originalEvent)
  }

  /** Its chevron's options (`Fold.button()`):  getters, read as it draws, so they follow its details and its id. */
  private readonly foldButton: FoldButtonOptions = EpicItem.foldButtonOf(this)

  /** `item`'s chevron's options:  the box it folds while it has details, its tooltip (its name too) by its id. */
  private static foldButtonOf(item: EpicItem): FoldButtonOptions {
    return {
      className: TOGGLE,
      get part() {
        return item.partForName("toggle")
      },
      get controls() {
        return item.hasDetails() ? DETAILS_ID : undefined
      },
      tips: {
        get fold() {
          return item.translationForKey("fold", { id: item.label() })
        },
        get unfold() {
          return item.translationForKey("unfold", { id: item.label() })
        }
      }
    }
  }

  /** Find-in-page matched inside the folded details:  the browser has revealed them;  adopt it. */
  @E.on("beforematch", { target: "renderRoot" })
  protected onBeforeMatch() {
    this.reveal()
  }

  /**
   * While connected, follow the page's scroll:  is its line right under the section titles stuck above it
   * (`isUnderTitle`)?  Then its top corners are square (Owen, 2026-10-24:  a rounded run top there showed the page
   * through, under the stuck title).
   * - where the titles end:  the line's own `top`, the stack it sticks under once open (`EpicItem.css`)
   * - read once a frame at most, and only while its run rounds its top (`--epic-item-top-radius`, its section's)
   */
  @E.whileConnected
  protected watchScroll() {
    const listeners = new AbortController()
    let pending = false
    const measure = () => {
      pending = false
      const line = this.lineBox
      const rounded = getComputedStyle(this.domElement).getPropertyValue("--epic-item-top-radius").trim()
      if (!line || !rounded) {
        this.isUnderTitle = false
        return
      }
      const stack = parseFloat(getComputedStyle(line).top) || 0
      const box = line.getBoundingClientRect()
      this.isUnderTitle = box.top <= stack + 1 && box.bottom > stack
    }
    const onScroll = () => {
      if (pending) return
      pending = true
      E.beforeNextPaint(measure)
    }
    window.addEventListener("scroll", onScroll, { passive: true, signal: listeners.signal })
    onScroll()
    return () => listeners.abort()
  }

  /** The address's own `#hash` was followed:  an item that moves doesn't open for it again as it reconnects. */
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
   * The page's `#hash` names this item, an id in its `part-ids`, or an element inside it:  open it (its part loads as
   * it opens).
   * - it never scrolls:  the page lands the link, once (the docs runtime, on Spell UI's `HashLanding`), as `EpicFold`
   */
  @E.untracked
  private readonly followHash = () => {
    const target = decodeURIComponent(location.hash.slice(1))
    if (!target) return
    const partIds = (this.partIds ?? "").split(/\s+/)
    const element = target === this.domElement.id ? this.domElement : document.getElementById(target)
    if (partIds.includes(target) || (element && this.domElement.contains(element))) this.reveal()
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Its light children, read now:  does the default slot start with prose?  Is there a More Details card? */
  private scanChildren(): ChildScan {
    let first: "prose" | "part" | undefined
    for (const node of this.domElement.childNodes) {
      if (first) break
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) first = "prose"
      if (node.nodeType !== Node.ELEMENT_NODE) continue
      const element = node as Element
      if (element.hasAttribute("slot")) continue
      const tag = element.localName
      first = EPIC_TAG.test(tag) && !FLOW_TAGS.includes(tag) ? "part" : "prose"
    }
    return {
      startsWithProse: first === "prose",
      hasMore: !!this.domElement.querySelector(`:scope > ${MORE_TAG}`),
      hasCommits: !!this.domElement.querySelector(`:scope > ${COMMIT_TAG}`)
    }
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicItem extends E.AttributeValues<EpicItemVocabulary> {}

/** Class names inside the shadow root:  the light details' block;  the said note's place in the thread. */
const FLOW = "flow"
const IN_THREAD = "in-thread"
const THREAD_END = "thread-end"

/** `EpicItem.scanChildren()`'s answer. */
type ChildScan = {
  /** the default slot's first content is prose (its text), not one of its parts */
  startsWithProse: boolean
  /** a More Details card is among its children */
  hasMore: boolean
  /** a commit is among its children */
  hasCommits: boolean
}
