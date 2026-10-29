import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { every } from "spell/util/timing"
import { E } from "spell/ui/core"

import { COUNTDOWN_TICK_MS, STAGE_COUNTDOWN_MS, STAGE_ID, isHeld, type InboxMark } from "spell/epic/review"

import { CountdownRing } from "spell/epic/components/epic-send-buttons/CountdownRing"

import { epicStageButtonVocabulary } from "./EpicStageButton.en"
import { ReviewState } from "./ReviewState"

import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"
import ringCSS from "spell/epic/components/epic-send-buttons/CountdownRing.css?inline"
import stageButtonCSS from "./EpicStageButton.css?inline"

/****************
 * ### `<epic-stage-button>`
 * The STAGE BUTTON (epic `epic-engine` P29):  ends a stage of planning, on the work it accepts (I180).
 * - "Accept Overview" on the Overview's title row (`<epic-overview>`), "Accept Phases" on the Phases section's
 *   (`<epic-section kind="phases">`, before its gear):  each draws it while the page is reviewed and in that stage
 *   - Owen, 2026-10-29, on the green pill where Send's plane sat:  "This should just be normal paper plane";
 *     the header's Send is the plane in every stage now, and the stage's Accept sits where its work is
 *   - on the title row, so it's there while the section is folded
 * - a green thumbs up and its words (Owen, 2026-10-29:  the thumbs up "when it means 'accept this' rather than 'make
 *   this a todo'");  outlined green once pressed, until the session moves the page on
 * - a press STARTS A 5-MINUTE COUNTDOWN (`press()`;  epic `epic-engine` I181;  Owen, 2026-10-29:  "make 'accept
 *   overview' and 'accept phases' 5 minute countdown"):  always 5 minutes (`STAGE_COUNTDOWN_MS`), whatever Auto Send says
 *   - its mark goes in the inbox at once, HELD:  `{ action: "accept", stage, countdown: true }`, dated when it goes
 *     (`ReviewInbox.stamped()`), so a Send before then never carries it, and a reload finds the countdown where it was
 *   - Send's own ring round the icon (`CountdownRing`), green, filling in as the 5 minutes go (`:state(counting)`);
 *     its tooltip says how long is left, and that a click calls it off
 *   - nothing typed on the page starts it again:  it's a decision, not a pause in the work (Auto Send's is)
 *   - pressed again while it counts:  called off, the mark gone, as before the first press
 *   - run out (`tick()`):  Send, as a press did before I180, so it goes with whatever else is unsent, and wakes the
 *     epic when nobody listens;  then `:state(accepted)`, waiting for Claude
 *   - pressed once it's gone:  sent again, nothing more (the mark stands until the session applies it)
 *   - the page closed through the end:  it goes as the page opens again
 * - its tooltip says what's still open ("2 questions open", `open` from its owner):  a reminder, never a lock
 * - its view of the inbox is its own `ReviewState`, keyed `stage`;  the countdown's Send never accepts (J143)
 ****************/
export class EpicStageButton extends E.UIComponent<typeof epicStageButtonVocabulary> {
  @E.proto static vocabulary = epicStageButtonVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-countdown-ring": ringCSS, "epic-stage-button": stageButtonCSS }
  } satisfies Partial<E.ElementSetup>

  /** Its view of the page's review inbox, keyed `stage`. */
  readonly review = new ReviewState(() => STAGE_ID)

  /** Follow the inbox while connected (kept alive:  a removed one must stop listening). */
  @E.whileConnected
  protected followReviews() {
    return this.review.connect()
  }

  /** The time now, ms:  set each second (`tick()`), so the ring and its tooltip follow the clock. */
  @E.state accessor now = Date.now()

  /** Tick each second while connected:  the ring fills, and the accept goes once its time is up;  returns the undo. */
  @E.whileConnected
  protected followClock() {
    return every(COUNTDOWN_TICK_MS / 1000, () => this.tick())
  }

  /** Its accept mark in the inbox, for the stage it ends, if any. */
  get stageMark(): InboxMark | undefined {
    const mark = this.review.mark()
    return mark?.action === "accept" && mark.stage === this.stage ? mark : undefined
  }

  /** Pressed, and its 5 minutes still running:  the mark held (`isHeld()`). */
  @E.cssState("counting")
  get isCounting(): boolean {
    const mark = this.stageMark
    return !!mark && isHeld(mark, this.now)
  }

  /** Pressed, and its time is up (or it was never held):  sent, or going now;  waiting for Claude. */
  @E.cssState("accepted")
  get isAccepted(): boolean {
    return !!this.stageMark && !this.isCounting
  }

  /** How much of the 5 minutes is left, `1` to `0`:  the ring's length. */
  get fractionLeft(): number {
    const mark = this.stageMark
    if (!mark) return 0
    return Math.min(1, Math.max(0, (Date.parse(mark.at) - this.now) / STAGE_COUNTDOWN_MS))
  }

  /** Its `data-state`:  `idle`, `counting` or `accepted`. */
  get buttonState(): "idle" | "counting" | "accepted" {
    return this.isCounting ? "counting" : this.isAccepted ? "accepted" : "idle"
  }

  /** Its texts, by the stage it ends. */
  get texts(): (typeof STAGE_TEXTS)[keyof typeof STAGE_TEXTS] {
    return STAGE_TEXTS[this.stage === "phases" ? "phases" : "overview"]
  }

  /**
   * Its tooltip:  what a press does, what's still open, what it sends along;  once pressed, that it waits for Claude.
   */
  get tip(): string {
    if (this.isCounting)
      return [
        this.translationForKey(this.texts.tip),
        this.translationForKey("counting", {
          time: CountdownRing.timeLeft(Date.parse(this.stageMark!.at) - this.now)
        })
      ].join(" · ")
    if (this.isAccepted) return this.translationForKey(this.texts.accepted)
    const open = this.open ?? 0
    const unsent = this.review.unsentCount()
    return [
      this.translationForKey(this.texts.tip),
      open
        ? this.translationForKey(open === 1 ? "openQuestionsOne" : "openQuestionsMany", { count: open })
        : this.translationForKey("nothingOpen"),
      this.translationForKey("waits"),
      unsent ? this.translationForKey("acceptSends", { count: unsent }) : ""
    ]
      .filter(Boolean)
      .join(" · ")
  }

  render(): JSX.Element {
    return (
      <button
        type="button"
        class={this.rootClass}
        part={this.partForName("base")}
        data-state={this.buttonState}
        title={this.tip}
        aria-label={this.tip}
        onClick={(event: MouseEvent) => {
          // a title row's tool:  not a click on the title, which would fold it
          event.stopPropagation()
          void this.press()
        }}
      >
        <span class={GLYPH}>
          <ui-icon name="thumbs up" />
          <Show when={this.isCounting}>{CountdownRing.draw(() => this.fractionLeft, this.partForName("ring"))}</Show>
        </span>
        <span class={WORDS}>{this.translationForKey(this.texts.label)}</span>
      </button>
    )
  }

  /** A press:  starts its countdown;  while it counts, calls it off;  once it's gone, sends again.  See the class. */
  @E.untracked
  async press() {
    const client = this.review.client
    const stage = this.stage
    if (!client || (stage !== "overview" && stage !== "phases")) return
    if (this.isCounting) await client.save(STAGE_ID, null)
    else if (this.stageMark) await this.sendNow()
    else await client.save(STAGE_ID, { action: "accept", stage, countdown: true })
    this.now = Date.now()
  }

  /** A second gone:  the ring fills;  its time up and not sent yet, it goes (`sendNow()`). */
  @E.untracked
  protected tick() {
    this.now = Date.now()
    const client = this.review.client
    const mark = this.stageMark
    if (!client || !mark || isHeld(mark, this.now) || client.isSent(mark)) return
    // one try every `RETRY_MS`:  a failed send (the server down) says so once, not each second
    if (this.now - this.triedAt < RETRY_MS) return
    void this.sendNow()
  }

  /** When it last tried to send, ms. */
  private triedAt = 0

  /** Send, as the plane's press does:  the accept and whatever else is unsent;  wakes the epic when nobody listens. */
  private async sendNow() {
    this.triedAt = Date.now()
    await this.review.client?.send()
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicStageButton extends E.AttributeValues<typeof epicStageButtonVocabulary> {}

/** Classes of the shadow markup. */
const WORDS = "words"
const GLYPH = "glyph"

/** How long a run-out accept waits before it tries to send again, ms:  a send the server refused, or got to first. */
const RETRY_MS = 10_000

/** Its texts' keys, by the stage it ends. */
const STAGE_TEXTS = {
  overview: { label: "acceptOverview", tip: "acceptOverviewTip", accepted: "acceptedOverview" },
  phases: { label: "acceptPhases", tip: "acceptPhasesTip", accepted: "acceptedPhases" }
} as const
