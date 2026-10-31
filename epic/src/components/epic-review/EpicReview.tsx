import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"
// Spell UI's page zoom:  its plain-DOM leaf alone, so the pack holds no second `<ui-zoom>` (as `<epic-field>`'s)
import { ImageZoom } from "spell/ui/components/ui-zoom/ImageZoom"

import { DraftSaver } from "spell/epic/answers"
import { DRAFT_SAVE_MS, FOCUS_HOLD_MS, Pictures, clockOf, isImmediate, type InboxMark } from "spell/epic/review"

import { epicReviewVocabulary } from "./EpicReview.en"
import { ReviewState } from "./ReviewState"
import {
  ACCEPTED_CHECK,
  BUTTONS_OF,
  CHOSEN,
  DO_IT_ID,
  DO_IT_NOTE,
  NOTE_ACTIONS,
  NOTE_BOX,
  NOTE_BUTTONS_OF,
  NOTE_FIELD,
  NOTE_INPUT,
  NOTE_PICK,
  NOTE_PICTURE,
  NOTE_SAVED,
  NOTE_TEXT,
  REVIEW_CONTROLS,
  REVIEW_GROUP,
  REVIEW_NOTED,
  REVIEW_PICK,
  SAID,
  SAID_EDIT,
  SAID_NOTE,
  SAID_PICTURE,
  SAID_TAKEN,
  SAID_WHAT,
  SAID_WHO,
  SHOW_NOTE,
  TEST_ITEM_ID,
  THREAD_ANSWER,
  THREAD_BUTTONS_OF,
  type EpicReviewVocabulary,
  type NoteButtonSpec,
  type NoteHow,
  type ReviewButtonSpec,
  type ReviewFill,
  type ThreadButtonSpec
} from "./EpicReview.types"

import reviewCSS from "./EpicReview.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicReview`
 * The component behind `<epic-review>`:
 * the review controls (P9) of one item, Overview sub-section, phase or the summary.
 *
 * - It shows one of three things (`shows`):
 *   - `buttons`:  the controls at the end of a line or title (`controls()`)
 *   - `note`:  the note box (`noteBox()`)
 *   - `said`:  a marked note, its box closed (`said()`);  and the note Claude took, read-only (`takenSaid()`)
 * - Each family draws it in its own shadow root:
 *   - `<epic-item>`:  on its line, in its details, or under its line
 *   - an Overview `<epic-section>` and an `<epic-phase>`:  on their title and in their body
 *   - `<epic-summary>`:  under its lede
 * - Drawn only while the page is reviewed:
 *   the family wraps it in `<Show when={reviewState.reviewing()}>`.
 * - Each one has its own view of the page's review inbox (`ReviewState`, keyed by `of`),
 *   following it while connected.
 * - Revisit and Edit take the reader to the note box (`takeToNote()`):
 *   - `epic-note-showing`, so the family unfolds
 *   - then the box beside it (the `<epic-review shows="note">` of the same shadow root) takes the focus
 *   - a judgement call's or todo's EMPTY box gets "do it", selected, Revisit turning on with it (Owen, 2026-10-19,
 *     2026-10-22)
 * - Typing in the note box turns Revisit on, and never closes it (`ReviewClient.saveTyped()`;  epic `epic-engine` P20).
 * - A PICTURE in the note box (epic `epic-engine` P51;  Owen, 2026-10-29:  tests answered inline, "screenshots"):
 *   pasted (⌘V) or dropped on the box, or chosen with its picture button;  saved beside the page (`POST shot`) and
 *   put in the note's mark (`ReviewClient.attachShot()`), a thumbnail under the words that opens full size;  the
 *   marked note shows it too
 * - A manual test's x says "no longer applies":  `inbox apply` cancels the test (P51, as a test run's Skip did).
 * - A button that chose an action (a review button, a note box button) sends `epic-chosen`:
 *   `<epic-item>` folds, so Owen moves on to the next (Owen, 2026-10-10).
 * - SIDE EFFECT:  the note box listens for `pagehide` while connected, to save a draft as the page goes.
 * - A comment THREAD's answer (`buttons="thread"` / `"closed"`, drawn by `<epic-thread>`;  epic `epic-engine` P3):
 *   the same group, look and colours, That's good / Reply / Skip it, or Reopen (`threadControls()`).
 *   - No inbox behind them:  a press only says which (`epic-thread-answered`), and the comments' code acts on it.
 ****************/
export class EpicReview extends E.UIComponent<EpicReviewVocabulary> {
  @E.proto static vocabulary = epicReviewVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-review": reviewCSS },
    // a click on a marked note's words must not jump to its Edit button
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The inbox
  ////////////////

  /** Its view of the page's review inbox, keyed by `of`. */
  readonly review = new ReviewState(() => this.of)

  /** Follow the inbox while connected (kept alive:  a removed one must stop listening). */
  @E.whileConnected
  protected followReviews() {
    // a thread's answer has no inbox to follow
    if (this.threadButtons) return undefined
    return this.review.connect()
  }

  /** Its element's name as shown (`Q7`, `the summary`):  `label`, else `of` in capitals. */
  get name(): string {
    return this.label || (this.of ?? "").toUpperCase()
  }

  /** A comment thread's answer buttons (`buttons="thread"` / `"closed"`);  `undefined` for the review kinds. */
  get threadButtons(): readonly ThreadButtonSpec[] | undefined {
    return THREAD_BUTTONS_OF[this.buttons ?? "item"]
  }

  render(): JSX.Element {
    return (
      <>
        <Show when={this.shows === "buttons" && this.threadButtons}>{(specs) => this.threadControls(specs)}</Show>
        <Show when={this.shows === "buttons" && !this.threadButtons}>{this.controls()}</Show>
        <Show when={this.shows === "note"}>{this.noteBox()}</Show>
        <Show when={this.shows === "said"}>{this.said()}</Show>
      </>
    )
  }

  ////////////////
  // ## The buttons
  ////////////////

  /**
   * The controls at the end of a line, in their order:
   * - the note bubble:  what Owen wrote, its words as the tooltip
   * - a pick's letter
   * - the group:  Approve, Revisit, Make Todo
   *   - a todo's group instead:  the plane (do it in the next phase), Revisit,
   *     the x (drop it:  Owen, 2026-10-09)
   *
   * How they look and act:
   * - every button shows at every step, its FILL saying how far its mark has got (`ReviewFill`):
   *   - a grey outline:  available
   *   - dashed in its colour:  pressed, not sent
   *   - outlined:  sent (a revisit now:  taken)
   *   - then CLEARED, a grey outline again, once Claude has handled it
   *     (they're Owen's input:  the id chip carries the result, Owen, 2026-10-08)
   * - colours:
   *   - green:  decided (Approve, Make Todo, a todo's plane)
   *   - blue:  an ask of Claude (Revisit)
   *   - grey:  no longer relevant (a todo's x)
   * - work on its way or under way (`ReviewState.busyButton()`):
   *   - that button's icon turns while Claude is on it (`data-busy`)
   *   - queued with nobody listening, it stays dashed, "waiting for a session" (and what the page server's wake did:
   *     epic `epic-workflow` P16)
   *   - clicked then:  "nevermind"
   * - Revisit takes the reader to the note box (`takeToNote()`)
   * - no Do Now (the wand) since Owen, 2026-10-25:  "In practice, I'm never using the wand"
   * - tooltips:  the plain browser ones (`title`):  just the name (Q8), then the element's review label
   *   (`tip`, `Approve · reviewed 10/7/26`:  Owen, 2026-10-07, in place of the label beside them);
   *   a screen reader hears the state too
   */
  private controls(): JSX.Element {
    const specs = () => BUTTONS_OF[this.buttons ?? "item"]
    const group = specs
    return (
      <span
        class={REVIEW_CONTROLS}
        part={this.partForName("base")}
        role="group"
        aria-label={this.translationForKey("reviewControls", { id: this.name })}
      >
        <Show when={this.noteWords}>
          <span class={REVIEW_NOTED} data-sent={this.isNoteSent ? "" : undefined} title={this.noteTip}>
            <ui-icon name={this.review.draft() ? "comment outline" : "comment"} />
          </span>
        </Show>
        <Show when={this.review.mark()?.pick}>
          {(pick) => (
            <span
              class={REVIEW_PICK}
              data-fill={this.review.isSent() ? "outline" : "dashed"}
              title={this.translationForKey(this.review.isSent() ? "pickedSent" : "pickedUnsent", { letter: pick() })}
            >
              {/* a pick-any set's several (`A C +1`, epic `epic-engine` P50):  one tight word, `AC+1` */}
              {pick().replace(/\s+/g, "")}
            </span>
          )}
        </Show>
        {/* a waiting plan's Accept, Revisit and Defer:  icons like every row's, so they line up row to row;  the group
            ringed 2px #666 while it waits on Owen, dotted once he's pressed one (Owen, 2026-10-25:  "Make the entire
            group just icons, black border.  Dotted when action is being taken, 3px solid when you're waiting on input
            from me") */}
        <ui-buttons
          class={REVIEW_GROUP}
          appearance="basic"
          icon=""
          size="mini"
          data-asks={
            this.buttons === "plan"
              ? group().some((spec) => this.fillOf(spec) !== "none")
                ? "taken"
                : "waiting"
              : undefined
          }
        >
          {/* accepted:  its thumbs up FIRST, then Revisit -- in the slots a waiting plan's Accept and Revisit take, so the
              buttons line up row to row (Owen, 2026-10-26:  "checkmark on the wrong side");  no Do this (I184) */}
          <Show when={this.buttons === "accepted"}>{this.acceptedCheck()}</Show>
          <For each={group()}>{(spec) => this.button(spec)}</For>
        </ui-buttons>
      </span>
    )
  }

  /**
   * A comment thread's answer (epic `epic-engine` P3;  Owen, 2026-10-10:  "Make top buttons same semantics/look as
   * pills in item header"):  the line's group, its buttons always a grey outline on the page's ground, each in its
   * colour under the pointer (`EpicReview.css`, "A thread's answer").
   * - tooltips (`title`;  Owen, 2026-10-10:  "No tooltip on those same buttons"):  the name, and for the two that
   *   close it, that they do;  a screen reader hears what each does
   * - a press says which (`epic-thread-answered`, `{ act }`):  the thread's own line doesn't fold for it
   */
  private threadControls(specs: () => readonly ThreadButtonSpec[]): JSX.Element {
    return (
      <span
        class={REVIEW_CONTROLS}
        part={this.partForName("base")}
        role="group"
        aria-label={this.translationForKey("threadAnswer")}
      >
        <ui-buttons class={REVIEW_GROUP} appearance="basic" icon="" size="mini">
          <For each={specs()}>
            {(spec) => (
              <ui-button
                icon={spec.icon}
                data-act={spec.act}
                data-color={spec.color}
                title={this.translationForKey(spec.title)}
                aria-label={`${this.translationForKey(spec.label)}:  ${this.translationForKey(spec.tip)}`}
                onClick={(event: MouseEvent) => this.answer(event, spec)}
              />
            )}
          </For>
        </ui-buttons>
      </span>
    )
  }

  /** A thread's answer button pressed:  say which;  the click goes no further (its line would fold). */
  @E.untracked
  private answer(event: MouseEvent, spec: ThreadButtonSpec) {
    event.preventDefault()
    event.stopPropagation()
    this.send(THREAD_ANSWER, { act: spec.act })
  }

  /**
   * A to-do phase's plan accepted (`buttons="accepted"`, epic `epic-engine` I140):  the green check, drawn as a chosen
   * Approve whose mark is sent (outlined green), so Owen sees it's good to go.
   * - a STATE, not a mark:  a click does nothing, and goes no further (its title row would fold);  Revisit is how
   *   the plan is talked over again
   */
  private acceptedCheck(): JSX.Element {
    const tip = () => {
      const said = this.translationForKey("buttonTip", {
        label: this.translationForKey(ACCEPTED_CHECK.label),
        what: this.translationForKey(ACCEPTED_CHECK.tip)
      })
      return this.tip ? `${said} · ${this.tip}` : said
    }
    return (
      <ui-button
        icon={ACCEPTED_CHECK.icon}
        data-state="accepted"
        data-color={ACCEPTED_CHECK.color}
        data-fill="outline"
        title={tip()}
        aria-label={tip()}
        onClick={(event: MouseEvent) => {
          event.preventDefault()
          event.stopPropagation()
        }}
      />
    )
  }

  /** One review button, as its action stands. */
  private button(spec: ReviewButtonSpec): JSX.Element {
    const busy = () => this.review.busyButton() === spec.action
    return (
      <ui-button
        icon={spec.icon}
        data-action={spec.action}
        data-color={spec.color}
        data-fill={this.fillOf(spec)}
        data-busy={busy() && this.review.workedOn() ? "" : undefined}
        title={
          busy() ? this.translationForKey("callOff", { label: this.translationForKey(spec.label) }) : this.tipOf(spec)
        }
        aria-label={`${this.translationForKey(spec.label)} · ${this.stateOf(spec)}`}
        onClick={(event: MouseEvent) => this.press(event, spec)}
      />
    )
  }

  /**
   * A review button clicked:  its mark (`ReviewClient.press()`).
   * - Revisit takes the reader to the note box
   * - a click that CHOSE an action (not one that cleared a mark or called a request off) says so (`epic-chosen`):
   *   an item folds, so Owen moves on to the next (Owen, 2026-10-10)
   */
  @E.untracked
  private press(event: MouseEvent, spec: ReviewButtonSpec) {
    // the line's own click would fold it
    event.preventDefault()
    event.stopPropagation()
    const pressed = this.review.press(spec.action)
    if (pressed === "open-box") this.takeToNote()
    else if (pressed === "chosen") this.send(CHOSEN, { of: this.review.id() })
  }

  /** How far `spec`'s mark has got:  its fill (`ReviewState.fillOf()`, which the id chip reads too). */
  private fillOf(spec: ReviewButtonSpec): ReviewFill {
    return this.review.fillOf(spec.action)
  }

  /**
   * A button's tooltip:  its name, what a click does or where its mark stands, then the element's review label
   * (`Approve:  Fine as it is · reviewed 10/7/26`).
   */
  private tipOf(spec: ReviewButtonSpec): string {
    const said = this.translationForKey("buttonTip", {
      label: this.translationForKey(spec.label),
      what: this.inlineCommentsTip(spec) ?? this.stateOf(spec)
    })
    return this.tip ? `${said} · ${this.tip}` : said
  }

  /**
   * Revisit's tooltip while a click would mark it at once:  Owen's comments waiting in its text are the note
   * (`ReviewClient.commentsIn()`, epic `epic-engine` I140);  else `undefined`.
   */
  private inlineCommentsTip(spec: ReviewButtonSpec): string | undefined {
    if (spec.action !== "revisit" || this.fillOf(spec) !== "none") return undefined
    const ids = this.review.inlineComments()
    if (!ids.length) return undefined
    return this.translationForKey("revisitCommentsTip", { ids: ids.map((id) => id.toUpperCase()).join(", ") })
  }

  /** A button's state, for a screen reader. */
  private stateOf(spec: ReviewButtonSpec): string {
    const review = this.review
    if (review.busyButton() === spec.action) {
      if (review.running()?.queued) return this.translationForKey("waiting", { why: review.waitingWhy() })
      return this.translationForKey(review.workedOn() ? "working" : "asked")
    }
    const fill = this.fillOf(spec)
    if (fill === "dashed") return this.translationForKey("chosenUnsent")
    if (fill === "outline") return this.translationForKey("chosenSent")
    return this.translationForKey(spec.tip)
  }

  /** What Owen wrote:  the draft, else the mark's note;  `""` for none. */
  get noteWords(): string {
    return this.review.draft()?.note ?? this.review.mark()?.note ?? ""
  }

  /** The note is a mark's, sent. */
  get isNoteSent(): boolean {
    return !this.review.draft() && !!this.review.mark()?.note && this.review.isSent()
  }

  /** The note bubble's tooltip:  whose note, how far it got, its words. */
  get noteTip(): string {
    const note = this.noteWords
    if (this.review.draft()) return this.translationForKey("noteDraft", { note })
    return this.translationForKey(this.isNoteSent ? "noteSent" : "noteUnsent", { note })
  }

  ////////////////
  // ## The note box
  ////////////////

  /** Its draft's save:  saved (`at`, when), failed (`ok: false`), or nothing to say. */
  @E.state accessor saved: SaveState | undefined = this.startingSave()

  /** The note's field, once drawn:  a `<ui-textarea grow>`, its live text its `value`. */
  private noteInput: NoteField | undefined

  /**
   * The note's saves (epic `coherence` C10):  `DRAFT_SAVE_MS` after the last key, one at a time, retried every 3s
   * after a failure, sent as the page goes;  the floppy follows where they stand (`showSave()`).
   * - no browser copy of its own:  the client backs every key up (`ReviewClient.type()`)
   */
  private readonly drafts = new DraftSaver({
    save: (save) => this.saveNote(save),
    wait: DRAFT_SAVE_MS,
    onChange: () => this.showSave()
  })

  /**
   * The note box (Owen, 2026-10-06, Q8):  Owen's voice, on ivory.
   * - a note that grows as it's typed in (a `<ui-textarea grow>`, epic `ui-gaps` P14), a small Saved mark in its
   *   corner
   * - two round buttons stacked at its right:
   *   - Revisit Later (blue:  revisit soon, the line's Revisit icon)
   *   - the x (grey:  skip this, nothing to do;
   *     Owen, 2026-10-09, in place of Make Todo, which stays on the line)
   * - a todo's buttons (`TODO_NOTE_BUTTONS`), in its line's order:
   *   the plane (green), Revisit Later, the x (grey:  drop it)
   * - SAVED as typed, `DRAFT_SAVE_MS` after the last key, and at once when the box loses focus or the page goes away
   *   (`watchPageHide()`), by its `DraftSaver`:  a failed save tried again every 3s
   *   - as the mark it makes (`ReviewClient.saveTyped()`;  epic `epic-engine` P20):  words typed turn Revisit ON, at
   *     the first key, so Send and the countdown hand them over;  the box stays open under the cursor
   *   - a request at work, or an emptied box with no revisit:  a draft, as before
   *   - the floppy says Saved (its tooltip:  when), or turns red with why not
   *   - a localStorage backup too, for a save that fails (`ReviewClient.type()`)
   * - a button makes the note a mark, then empties the box;  Escape leaves it, the draft kept (`leaveNote()`)
   * - the button for the element's mark wears the fill rule (`data-mark`, `data-sent`):
   *   dashed until sent, outlined once sent;  the rest a grey outline
   */
  private noteBox(): JSX.Element {
    // a mark Claude took is no button of the box's (I190):  the box is for the next note
    const mark = () => markButton(this.review.ownMark())
    return (
      <div
        class={NOTE_BOX}
        part={this.partForName("base")}
        data-mark={mark()}
        data-sent={mark() && this.review.isSent() ? "" : undefined}
        onPaste={(event: ClipboardEvent) => this.onPicturePasted(event)}
        onDragOver={(event: DragEvent) => event.preventDefault()}
        onDrop={(event: DragEvent) => this.onPictureDropped(event)}
      >
        <span class={NOTE_TEXT}>
          <span class={NOTE_FIELD}>
            <ui-textarea
              ref={(element: HTMLElement) => this.onNoteDrawn(element as NoteField)}
              class={NOTE_INPUT}
              grow=""
              rows="2"
              placeholder={this.translationForKey("notePlaceholder")}
              aria-label={this.translationForKey("noteLabel", { id: this.name })}
              onInput={() => this.onInput()}
              onFocus={() => this.selectDoIt()}
              onBlur={() => this.flush()}
              onKeyDown={(event: KeyboardEvent) => this.onNoteKey(event)}
            />
            {/* a span around the icon:  `ui-icon`'s host is `display: contents`, which can't be placed */}
            <span
              class={NOTE_SAVED}
              hidden={!this.saved}
              data-failed={this.saved && !this.saved.ok ? "" : undefined}
              title={this.savedTip}
            >
              <ui-icon name="floppy disk outline" />
            </span>
            {this.pictureButton()}
          </span>
          <Show when={this.picture()}>{(src) => this.pictureRow(src)}</Show>
        </span>
        <span class={NOTE_ACTIONS}>
          <For each={NOTE_BUTTONS_OF[this.buttons ?? "item"]}>{(spec) => this.noteButton(spec)}</For>
        </span>
      </div>
    )
  }

  /** One note box button;  a manual test's x says it no longer applies (P51). */
  private noteButton(spec: NoteButtonSpec): JSX.Element {
    const tip = spec.how === "skip" && TEST_ITEM_ID.test(this.of ?? "") ? "boxSkipTestTip" : spec.tip
    return (
      <button
        type="button"
        data-how={spec.how}
        data-color={spec.color}
        title={this.translationForKey(tip)}
        aria-label={this.translationForKey(tip)}
        onClick={() => this.use(spec.how)}
      >
        <ui-icon name={spec.icon} />
      </button>
    )
  }

  /** The note's field, as it's drawn:  kept, and given what's typed so far. */
  @E.untracked
  private readonly onNoteDrawn = (note: NoteField) => {
    this.noteInput = note
    note.value = this.review.typed()
  }

  /** What's typed in its note box, by the inbox's client:  `onTypedElsewhere()` follows it. */
  get typed(): string {
    return this.review.typed()
  }

  /**
   * What's typed changed elsewhere (a request called off, Edit):  put back in the box, unless it's being typed in.
   * - emptied as Claude took the note it held (I190):  emptied even while it has the focus, its floppy gone
   */
  @E.onChange("typed")
  protected onTypedElsewhere(text: string) {
    const note = this.noteInput
    if (!note || note.value === text) return
    const taken = !text && note.value.trim() === (this.review.takenNote()?.note ?? "").trim()
    if (!note.value || !note.matches(":focus") || taken) note.value = text
    if (taken) this.saved = undefined
  }

  /**
   * Only the note box:  save a pending draft when the page goes away (`keepalive`),
   * and when the box goes (disconnected:  an item without details, folded by its chevron).
   */
  @E.whileConnected
  protected watchPageHide() {
    if (this.shows !== "note") return undefined
    const unwatch = this.drafts.watch(window)
    return () => {
      unwatch()
      this.flush()
    }
  }

  /**
   * A key typed:  kept and backed up at once, saved to the inbox once typing stops.
   * - the first words on an item with no note mark yet are saved AT ONCE:  Revisit turns on as he types (P20);
   *   so are the first over a note Claude took (I190), a new mark for the next send
   */
  @E.untracked
  private onInput() {
    const client = this.review.client
    const id = this.review.id()
    const text = this.noteInput!.value
    client?.type(id, text)
    this.drafts.changed()
    const made = client?.typedMark(id, text)
    // a new note over one Claude took is a new mark too (I190)
    if (made && made !== "draft" && (made.action !== client?.markOf(id)?.action || client?.isTaken(id))) this.flush()
  }

  /** Escape:  leave the box, the draft saved. */
  @E.untracked
  private onNoteKey(event: KeyboardEvent) {
    if (event.key !== "Escape") return
    event.stopPropagation()
    this.flush()
    EpicReview.nativeField(this.noteInput)?.blur()
    this.leaveNote()
  }

  /** A note box button:  the note becomes a mark (an action chosen:  `epic-chosen`);  the box empties. */
  @E.untracked
  private use(how: NoteHow) {
    this.drafts.done()
    const note = this.noteInput!
    const text = note.value.trim()
    note.value = ""
    this.saved = undefined
    void this.review.client?.useNote(this.review.id(), how, text)
    // an action chosen:  an item folds
    this.send(CHOSEN, { of: this.review.id() })
    this.leaveNote()
  }

  /**
   * Done with the note box;  the draft is kept either way.
   * - under an item's line (`under-line`):  it closes
   * - else it stays, but stops counting as written in once it's empty
   */
  @E.untracked
  private leaveNote() {
    const client = this.review.client
    if (!client) return
    if (this.underLine || !this.noteInput?.value.trim()) client.closeBox(this.review.id(), false)
  }

  /** Save a pending draft now (`keepalive`:  the page is going away). */
  private flush({ keepalive = false } = {}) {
    void this.drafts.save({ keepalive })
  }

  /**
   * `DraftSaver`'s save:  the note as the mark it makes, else as the element's draft (`ReviewClient.saveTyped()`).
   * - throws the client's last write error when it didn't go through
   */
  private async saveNote({ keepalive }: { keepalive: boolean }): Promise<undefined> {
    const client = this.review.client
    const note = this.noteInput
    if (!client || !note) return undefined
    const ok = await client.saveTyped(this.review.id(), note.value, { keepalive })
    if (!ok) throw new Error(this.review.lastWriteError || "not saved")
    return undefined
  }

  /** The floppy, as the saves stand:  hidden while typing;  Saved (with when) once through, red when not. */
  private showSave() {
    const state = this.drafts.state
    if (state.kind === "unsaved" || state.kind === "idle") this.saved = undefined
    else if (state.kind === "saved") this.saved = this.noteInput?.value.trim() ? { ok: true, at: state.at } : undefined
    else if (this.drafts.isError) this.saved = { ok: false }
  }

  /** The floppy's tooltip:  when it was saved, or why not. */
  get savedTip(): string {
    const state = this.saved
    if (!state) return ""
    if (state.ok) return this.translationForKey("saved", { time: clockOf(state.at) })
    return this.translationForKey("notSaved", { why: this.review.lastWriteError })
  }

  /** What the floppy starts with:  Saved, when there's a saved draft. */
  @E.untracked
  private startingSave(): SaveState | undefined {
    const draft = this.review.draft()
    return draft ? { ok: true, at: draft.at } : undefined
  }

  ////////////////
  // ## A picture in the note (epic `epic-engine` P51)
  ////////////////

  /** A picture pasted or dropped, shown while it saves:  its data URL. */
  @E.state accessor pastedPicture: string | undefined = undefined

  /**
   * The note box's picture:  one on its way, else its mark's (`shot`);  none while the marked note above the box shows
   * it (`said()`), nor a test answer's (an older run's).
   */
  readonly picture = (): string | undefined => {
    const mark = this.review.ownMark()
    if (this.pastedPicture) return this.pastedPicture
    return mark?.action === "test" || this.review.noted() ? undefined : mark?.shot
  }

  /**
   * The picture button, in the field's top corner:  a file chooser (VS Code's side bar never lets a file dragged in
   * reach the page), its tooltip saying a paste or a drop works too.
   */
  private pictureButton(): JSX.Element {
    return (
      <>
        <button
          type="button"
          class={NOTE_PICK}
          title={this.translationForKey("pictureAdd")}
          aria-label={this.translationForKey("pictureAdd")}
          onClick={(event: MouseEvent) =>
            (event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLInputElement>("input")?.click()
          }
        >
          <ui-icon name="file image" />
        </button>
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(event: Event) => this.onPictureChosen(event.currentTarget as HTMLInputElement)}
        />
      </>
    )
  }

  /** The picture under the words:  its thumbnail (a click opens it full size), "saving…" while it saves, its ✕. */
  private pictureRow(src: () => string): JSX.Element {
    const saving = () => this.pastedPicture === src()
    return (
      <span class={NOTE_PICTURE} data-saving={saving() ? "" : undefined}>
        <img
          src={src()}
          alt={this.translationForKey("pictureZoom")}
          title={this.translationForKey("pictureZoom")}
          onClick={(event: MouseEvent) => EpicReview.zoom(event)}
        />
        <Show when={saving()}>
          <span>{this.translationForKey("pictureSaving")}</span>
        </Show>
        <Show when={!saving()}>
          <button
            type="button"
            title={this.translationForKey("pictureRemove")}
            aria-label={this.translationForKey("pictureRemove")}
            onClick={() => void this.review.client?.attachShot(this.review.id(), undefined)}
          >
            <ui-icon name="xmark" />
          </button>
        </Show>
      </span>
    )
  }

  /** A paste in the note box:  a picture in it is the note's (text pastes as usual). */
  @E.untracked
  private onPicturePasted(event: ClipboardEvent) {
    const file = Pictures.fileOf(event)
    if (!file) return
    event.preventDefault()
    void this.takePicture(file)
  }

  /** A file dropped on the note box. */
  @E.untracked
  private onPictureDropped(event: DragEvent) {
    const file = Pictures.fileOf(event)
    if (!file) return
    event.preventDefault()
    void this.takePicture(file)
  }

  /** A file chosen with the picture button. */
  @E.untracked
  private onPictureChosen(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ""
    if (file) void this.takePicture(file)
  }

  /**
   * Take `file` as the note's picture:  shown at once, saved beside the page (`ReviewClient.saveShot()`), then put in
   * the note's mark (`attachShot()`), with what's typed:  Revisit turns on with it, as with words.
   * - not a picture, or over 8 MB:  a notice says so
   * - NEVER throws:  a failed save is the client's own notice, and the picture goes
   */
  @E.untracked
  private async takePicture(file: File) {
    const client = this.review.client
    if (!client) return
    const problem = Pictures.problemOf(file)
    if (problem) return client.notify(this.translationForKey(problem))
    const png = await Pictures.pngOf(file).catch(() => undefined)
    if (!png) return client.notify(this.translationForKey("notImage"))
    const id = this.review.id()
    this.pastedPicture = png
    // what's typed goes into the mark the picture joins
    if (this.noteInput) client.type(id, this.noteInput.value)
    const shot = await client.saveShot(id, png)
    if (shot) await client.attachShot(id, shot)
    if (this.pastedPicture === png) this.pastedPicture = undefined
  }

  /** A click on a note's picture:  full size, in the page's `<ui-zoom>`. */
  private static zoom(event: MouseEvent) {
    const image = event.currentTarget as HTMLImageElement | null
    if (!image || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    event.stopPropagation()
    ImageZoom.show(image)
  }

  ////////////////
  // ## A marked note
  ////////////////

  /**
   * A marked note, its box closed (epic `windows-and-review` P1:  a note must never seem lost):
   * ONE line, the note, then "revisit soon · sent 10:42" small at its end,
   * then Edit (an icon), which puts it back in the box.
   * - a changed note is unsent again until the next send
   * - draws nothing while there's no marked note, a draft, or the box is being written in
   *   (`ReviewState.noted()`, which the family reads too, to draw it at all)
   */
  private said(): JSX.Element {
    return (
      <>
        {this.takenSaid()}
        {this.markedSaid()}
      </>
    )
  }

  /**
   * The note Claude TOOK and is answering (epic `epic-engine` I190):  quiet and read-only, "You, 10:11 · the note",
   * just above Claude's status card, so Owen sees what's being answered while the box below is free for a new note.
   * - no Edit:  it's Claude's now;  a change is a new note
   * - Owen, 2026-10-31:  "I typed the comment in at a previous send, but the text still shows in the comment box"
   */
  private takenSaid(): JSX.Element {
    return (
      <Show when={this.review.takenNote()}>
        {(mark) => (
          <div
            class={[SAID, SAID_TAKEN]}
            part={this.partForName("taken")}
            title={this.translationForKey("saidTakenTip")}
            aria-label={this.translationForKey("you")}
          >
            <span class={SAID_WHO}>{this.translationForKey("saidTaken", { time: clockOf(mark().at) })} ·</span>
            <p class={SAID_NOTE}>{mark().note}</p>
            <Show when={mark().shot}>
              {(shot) => (
                <img
                  class={SAID_PICTURE}
                  src={shot()}
                  alt={this.translationForKey("pictureZoom")}
                  title={this.translationForKey("pictureZoom")}
                  onClick={(event: MouseEvent) => EpicReview.zoom(event)}
                />
              )}
            </Show>
          </div>
        )}
      </Show>
    )
  }

  /** A marked note, its box closed, still Owen's to change:  the note, how far it got, Edit. */
  private markedSaid(): JSX.Element {
    return (
      <Show when={this.review.noted()}>
        {(mark) => (
          <div class={SAID} part={this.partForName("base")} aria-label={this.translationForKey("you")}>
            <ui-icon name="comment" />
            <p class={SAID_NOTE}>{mark().note}</p>
            <Show when={mark().shot}>
              {(shot) => (
                <img
                  class={SAID_PICTURE}
                  src={shot()}
                  alt={this.translationForKey("pictureZoom")}
                  title={this.translationForKey("pictureZoom")}
                  onClick={(event: MouseEvent) => EpicReview.zoom(event)}
                />
              )}
            </Show>
            <span class={SAID_WHAT}>{this.what(mark())}</span>
            <button
              type="button"
              class={SAID_EDIT}
              title={this.translationForKey("editTip")}
              aria-label={this.translationForKey("edit")}
              onClick={() => this.takeToNote(this.review.mark()?.note)}
            >
              <ui-icon name="edit" />
            </button>
          </div>
        )}
      </Show>
    )
  }

  /** `revisit soon · sent 10:42`. */
  private what(mark: InboxMark): string {
    const how = this.translationForKey(HOW_KEYS[mark.action] ?? (mark.when === "now" ? "howNow" : "howSoon"))
    if (!this.review.isSent()) return this.translationForKey("saidUnsent", { how })
    const sent = mark.when === "now" ? mark.at : this.review.client?.inbox.sent
    return this.translationForKey("saidSent", { how, time: clockOf(sent) })
  }

  ////////////////
  // ## Taking the reader to the note box
  ////////////////

  /**
   * Take the reader to the note box (Revisit;  Edit, with the marked `note`).
   * 1. the box opens (`ReviewClient.openBox()`)
   * 2. `epic-note-showing` asks the family to show it:  it unfolds, or opens a box by itself under its line
   * 3. the note takes the focus, trying each frame until it can, for `FOCUS_HOLD_MS` at most
   *    (details just opened may not be drawn yet, a part may still be loading)
   * - Edit (`note`):  the marked note goes back in the box, unless something is typed there already
   * - Revisit on a judgement call or a todo whose box is EMPTY (no draft, no earlier note):  "do it" in it, as if
   *   Owen had typed it (`DO_IT_NOTE`;  Owen, 2026-10-19), selected, and saved at once:  Revisit turns ON with it
   *   (`fillIn()`;  Owen, 2026-10-22:  "turn revision on, add 'do it' and focus the text in the field")
   */
  @E.untracked
  private takeToNote(note?: string) {
    const client = this.review.client
    if (!client) return
    const id = this.review.id()
    const limit = this.domElement.closest("epic-item")?.hasAttribute("limit") ?? false
    const doIt = !note && DO_IT_ID.test(id) && !limit && !client.typedOf(id).trim() && !client.markOf(id)?.note
    if (note && !client.typedOf(id)) client.type(id, note)
    client.openBox(id)
    this.send(SHOW_NOTE, { of: id })
    const until = performance.now() + FOCUS_HOLD_MS
    const focus = () => {
      const box = this.noteBoxBeside()
      const input = box?.noteInput
      input?.focus({ preventScroll: true })
      const focused = !!input && input.matches(":focus")
      if (focused && doIt) box!.fillIn(DO_IT_NOTE)
      if (!focused && performance.now() < until) E.beforeNextPaint(focus)
    }
    E.beforeNextPaint(focus)
  }

  /** The note box beside it:  the `<epic-review shows="note">` of the same `of` in its shadow root, if drawn. */
  private noteBoxBeside(): EpicReview | undefined {
    const root = this.domElement.getRootNode() as ParentNode
    const selector = `${this.domElement.localName}[shows="note"][of="${CSS.escape(this.of ?? "")}"]`
    return root.querySelector<E.DOMElement<EpicReview>>(selector)?.component
  }

  /**
   * Only the note box:  `text` in its EMPTY note, as if typed (kept, backed up, saved at once:  Revisit turns on with
   * it), and selected, so the first key typed replaces it.  A note holding words is left alone.
   */
  @E.untracked
  fillIn(text: string) {
    const note = this.noteInput
    if (!note || note.value.trim()) return
    note.value = text
    this.onInput()
    this.flush()
    EpicReview.selectAll(note)
  }

  /** The note took the focus holding just "do it" (`DO_IT_NOTE`):  selected, so typing replaces it. */
  @E.untracked
  private selectDoIt() {
    const note = this.noteInput
    if (note?.value === DO_IT_NOTE) EpicReview.selectAll(note)
  }

  /** The native `<textarea>` inside the note's `<ui-textarea>`:  what selects its text and loses the focus. */
  private static nativeField(note: NoteField | undefined): HTMLTextAreaElement | null | undefined {
    return note?.shadowRoot?.querySelector("textarea")
  }

  /**
   * Every word of the note selected, so the first key typed replaces them.
   * - SIDE EFFECT:  hands its native `<textarea>` the note's text first:  the `<ui-textarea>` shows a new value only
   *   once its own effect runs, which would put the cursor back at the end
   */
  private static selectAll(note: NoteField) {
    const field = EpicReview.nativeField(note)
    if (!field) return
    if (field.value !== note.value) field.value = note.value
    field.select()
  }
}

/** The note's field:  a `<ui-textarea>`'s DOM element, its live text its `value` (as a native `<textarea>`'s). */
type NoteField = HTMLElement & { value: string }

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicReview extends E.AttributeValues<EpicReviewVocabulary> {}

/** A note box's draft save, as its floppy shows it. */
type SaveState = { ok: boolean; at?: string }

/** A marked note's kind, by its mark's action;  a revisit's is by its `when`. */
const HOW_KEYS: Partial<Record<string, "howTodo" | "howNext" | "howDrop" | "howSkip">> = {
  todo: "howTodo",
  next: "howNext",
  drop: "howDrop",
  skip: "howSkip"
}

/**
 * The note box button `mark` stands for:  the x (`skip`;  a todo's `drop`), a todo's plane (`next`), `soon` (Later);
 * else none (a Make Todo is the line's).
 */
function markButton(mark: InboxMark | undefined): NoteHow | undefined {
  if (mark?.action === "skip" || mark?.action === "next" || mark?.action === "drop") return mark.action
  if (mark?.action === "revisit" && !isImmediate(mark)) return "soon"
  return undefined
}
