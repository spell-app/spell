import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

import { SendCountdown } from "spell/epic/review"

import { epicSendButtonsVocabulary } from "./EpicSendButtons.en"
import { SEND_ASKED, type SendAskedDetail } from "./EpicSendButtons.types"
import { CountdownRing } from "./CountdownRing"

import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"
import ringCSS from "./CountdownRing.css?inline"
import sendButtonsCSS from "./EpicSendButtons.css?inline"

/****************
 * ### `<epic-send-buttons>`
 * Send:  the paper plane, and its COUNTDOWN when asked for (`countdown`;  epic `epic-engine` P20, P53).
 * - its WORDS beside the plane, "Send to Claude" (epic `epic-engine` I305;  Owen, 2026-11-15:  "The round plane icon
 *   at the top is what should say `send to claude`");  an item's own plane stays the icon alone
 *   - "Sent to Claude" for 5 seconds after a send (`SENT_SECONDS`;  epic `epic-engine` I352, Owen:  "Should say
 *     `Sent to Claude` for 5 seconds after send"), by a press or by Auto Send;  its tooltip says when
 *   - a send:  asked for here, then `state` leaving `unsent`;  a mark taken back with no ask is no send
 *   - something new marked meanwhile (`unsent` again):  "Send to Claude" at once, as that's what a press does now
 *   - the words keep the width of the longer of the two, so nothing beside the pill moves
 * - Owen, 2026-10-29:  "Send works on a 2-minute no interaction timer.  This is integrated into the single send button
 *   ... with the countdown ring.  Pressing it sends immediately."
 * - the PLANE asks its owner to send (`epic-send-saving`, `auto` false)
 *   - from `state`:  grey with nothing to send, blue with something not sent
 *   - the group's outline:  none with nothing to send, the grey plane alone (Owen, 2026-10-25:  "no boder around
 *     plane in this mode");  grey with something not sent, blue once sent;  never dashed (Owen, 2026-10-22)
 *   - Auto Send off (or no `countdown`) with something not sent:  FILLED blue, so it plainly waits for a press
 *     (`:state(waiting)`)
 * - the RING (`countdown`, the page's Auto Send on, something not sent;  `CountdownRing`, a stage button's too):
 *   round the plane, set apart from it, with
 *   rounded ends, filling in blue clockwise over a light grey track as the wait runs
 *   (Owen's comment C10:  "Prettier ring, with pill edges, not just border.  Should look distinct from the button
 *   itself";  2026-10-29:  "Start out light grey and fill in blue")
 *   - every key, click or scroll on the page fills it again;  a note box being typed in holds it full
 *   - the plane's tooltip says how long is left, and that a click sends now
 *   - at the end the owner is asked to send (`auto` true), as a press would, waking the epic when nobody listens
 *   - Auto Send Immediately:  no ring;  each change goes as it's finished
 *   - the choice is the page header's gear's (`SendCountdown.choose()`), never this element's
 * - the TURNING ring (`working`, epic `epic-engine` P55;  Owen, r46:  "put the spinning wheel cursor around this
 *   button (same size as countdown) while you are digesting remarks"):  while the session works through what was sent,
 *   a blue arc goes round the plane, in the countdown ring's frame (`CountdownRing.turning()`)
 *   - the countdown wins:  something new marked, its ring shows instead, since that's what the next press sends
 *   - the plane's tooltip says Claude is working on what you sent, and what (`working-on`)
 *   - only an epic page's header sets it, from the inbox's `doing` while it lists items
 * - the plane in every stage of an epic page:  the stage's Accept is on the title row of what it accepts
 *   (`<epic-stage-button>`, epic `epic-engine` I180;  the stage button took the plane's place here before, P29)
 * - WAITING ON OWEN (`asks`;  Owen, 2026-10-25:  "try the thicker border if you are waiting on me"):  the pill
 *   its own border 2px #666, darker than its hairline, solid, dotted once he's pressed what it waits for (`taken`)
 *   - an epic page's header, while Claude's build plans wait for his Accept on their phases
 * - the countdown is the PAGE's (`SendCountdown`), not this element's:  a Send drawn again finds it where it was
 * - its owners:  `<epic-page>` (the header, with `countdown`), `<epic-send>` (a details page) and the docs runtime's
 *   comments (`drawSend()`, a docs page;  both without:  J142);  each sends its own way, and only sets `state`
 * - NEVER sends anything itself:  it only asks
 ****************/
export class EpicSendButtons extends E.UIComponent<typeof epicSendButtonsVocabulary> {
  @E.proto static vocabulary = epicSendButtonsVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-countdown-ring": ringCSS, "epic-send-buttons": sendButtonsCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The countdown
  ////////////////

  /** The page's countdown;  none in a server render. */
  readonly pageCountdown = isServer ? undefined : SendCountdown.forPage()

  /** The countdown's `version`, as last heard:  the getters below read it, so the group redraws on each change. */
  @E.state accessor version = 0

  /** Auto Send is on, and this Send counts down (`countdown`). */
  @E.cssState("countdown")
  get isCountdownOn(): boolean {
    void this.version
    if (this.isManual) return false
    return this.pageCountdown?.isOn ?? true
  }

  /** The ring shows:  the countdown is running with a wait (not Immediately). */
  @E.cssState("counting")
  get isCounting(): boolean {
    void this.version
    return !this.isManual && !!this.pageCountdown?.hasRing
  }

  /** The session works through what was sent (`working`), and the countdown isn't running:  the turning ring. */
  @E.cssState("working")
  get isWorking(): boolean {
    return !!this.working && !this.isCounting
  }

  /** Auto Send off, something not sent:  the plane is filled, waiting for a press. */
  @E.cssState("waiting")
  get isWaiting(): boolean {
    return !this.isCountdownOn && this.isUnsent
  }

  /** No `countdown`:  only a press sends, and the page's countdown never hears of this Send (J142). */
  get isManual(): boolean {
    return !this.countdown
  }

  /** Something not sent yet. */
  get isUnsent(): boolean {
    return this.state === "unsent"
  }

  ////////////////
  // ## Just sent
  ////////////////

  /** When the last send went, `Date.now()`, for `SENT_SECONDS` after it;  `undefined` otherwise. */
  @E.state accessor sentAt: number | undefined = undefined

  /** A send was asked for, and `state` hasn't changed since:  its leaving `unsent` next is that send landing. */
  private isSendAsked = false

  /** `state` as last seen, to tell a send landing (`unsent` to anything else) from any other change. */
  private lastState: string | undefined

  /** Ends the "Sent to Claude" words, `SENT_SECONDS` after a send. */
  private sentTimer?: E.CancelablePromise<unknown>

  /** Sent in the last `SENT_SECONDS`, with nothing new to send since:  the words say "Sent to Claude". */
  get isJustSent(): boolean {
    return this.sentAt !== undefined && !this.isUnsent
  }

  /** The words beside the plane:  "Send to Claude", or "Sent to Claude" just after a send. */
  get words(): string {
    return this.translationForKey(this.isJustSent ? "sentWords" : "words")
  }

  /** A send landed:  "Sent to Claude" for `SENT_SECONDS`, then the words go back. */
  @E.untracked
  private showSent() {
    this.sentTimer?.cancel()
    this.sentAt = Date.now()
    this.sentTimer = E.after(SENT_SECONDS, () => this.clearSent())
  }

  /** Back to "Send to Claude". */
  @E.untracked
  private clearSent() {
    this.sentTimer?.cancel()
    this.sentTimer = undefined
    this.sentAt = undefined
  }

  /** While connected:  nothing;  disconnected, a "Sent" timer still waiting stops, and the words go back. */
  @E.whileConnected
  protected followSent() {
    return () => this.clearSent()
  }

  /** How much of the wait is left, `0` to `1`:  the ring's length. */
  get fractionLeft(): number {
    void this.version
    return this.pageCountdown?.fractionLeft ?? 0
  }

  /**
   * While connected:  follow the page's countdown, tell it whether something waits, and send when it runs out;
   * returns the undo.
   */
  @E.whileConnected
  protected followCountdown() {
    const countdown = this.pageCountdown
    if (!countdown || this.isManual) return undefined
    const unsubscribe = countdown.subscribe(() => (this.version = countdown.version))
    const unfire = countdown.onFire(() => this.askToSend(true))
    countdown.setPending(this.isUnsent)
    this.version = countdown.version
    return () => {
      unsubscribe()
      unfire()
    }
  }

  /** `state` changed:  the countdown starts while something waits, and stops once nothing does. */
  @E.onChange("state")
  protected onStateChange() {
    // first:  Auto Send Immediately may ask to send as soon as the countdown hears something waits
    this.followSendLanding()
    if (!this.isManual) this.pageCountdown?.setPending(this.isUnsent)
  }

  /**
   * `state` changed:  `unsent` to anything else, after an ask, is a send landing ("Sent to Claude");
   * something new to send ends the "Sent" words at once.
   */
  @E.untracked
  private followSendLanding() {
    const was = this.lastState
    this.lastState = this.state
    if (this.isUnsent) {
      // something new to send:  an ask from before it sent nothing of it
      if (was !== "unsent") this.isSendAsked = false
      if (this.sentAt !== undefined) this.clearSent()
      return
    }
    if (this.isSendAsked && was === "unsent") this.showSent()
    this.isSendAsked = false
  }

  ////////////////
  // ## Drawing
  ////////////////

  render(): JSX.Element {
    return (
      <span
        class={GROUP}
        part={this.partForName("base")}
        role="group"
        aria-label={this.translationForKey("group")}
        data-state={this.groupState}
        data-asks={this.asks}
      >
        <button
          type="button"
          class={SEND}
          part={this.partForName("send")}
          data-state={this.groupState}
          aria-busy={this.busy ? "true" : undefined}
          aria-label={this.sendTitle}
          title={this.sendTitle}
          onClick={() => this.askToSend(false)}
        >
          <span class={GLYPH}>
            <ui-icon name={this.busy ? "circle notch" : "paper plane"} loading={this.busy ? "" : undefined} />
            <Show when={this.isCounting}>{CountdownRing.draw(() => this.fractionLeft, this.partForName("ring"))}</Show>
            <Show when={this.isWorking}>{CountdownRing.turning(this.partForName("working"))}</Show>
          </span>
          {/* both words stacked in one cell, the hidden ones keeping its width:  "Sent" never moves the header */}
          <span class={LABEL}>
            <span class={WORDS} part={this.partForName("words")}>
              {this.words}
            </span>
            <span class={ROOM} aria-hidden="true">
              {this.translationForKey("words")}
            </span>
            <span class={ROOM} aria-hidden="true">
              {this.translationForKey("sentWords")}
            </span>
          </span>
          <Show when={(this.count ?? 0) > 0}>
            <span class={COUNT} part={this.partForName("count")}>
              {this.count}
            </span>
          </Show>
        </button>
      </span>
    )
  }

  /** The group's `data-state`, its outline and the plane's colour:  `state`, `idle` for none. */
  get groupState(): string {
    return this.state ?? "idle"
  }

  /**
   * The plane's tooltip and name:  what a press sends (`send-tip`), then, while the ring
   * counts, how long is left and that a click sends now;  while it turns, what Claude is working on.
   */
  get sendTitle(): string {
    const tip = this.sendTip || this.translationForKey("send")
    const words = this.isJustSent ? `${tip} · ${this.translationForKey("sentAt", { time: this.sentTime })}` : tip
    if (this.isWorking) {
      const on = this.workingOn
      return `${words} · ${on ? this.translationForKey("workingOn", { items: on }) : this.translationForKey("working")}`
    }
    if (!this.isCounting) return words
    const countdown = this.pageCountdown!
    const when = countdown.isHeld
      ? this.translationForKey("held")
      : this.translationForKey("counting", { time: CountdownRing.timeLeft(countdown.msLeft) })
    return `${words} · ${when}`
  }

  /** When the last send went, as the clock says it (`14:32`), for the tooltip. */
  get sentTime(): string {
    return new Date(this.sentAt ?? Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  }

  /** Ask the owner to send (`auto`:  the countdown ran out);  nothing while a send is on its way. */
  @E.untracked
  private askToSend(auto: boolean) {
    if (this.busy) return
    this.isSendAsked = true
    this.send(SEND_ASKED, { auto } satisfies SendAskedDetail)
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicSendButtons extends E.AttributeValues<typeof epicSendButtonsVocabulary> {}

/** Classes of the shadow markup. */
const GROUP = "group"
const SEND = "send"
const COUNT = "count"
const GLYPH = "glyph"
const WORDS = "words"
const LABEL = "label"
const ROOM = "room"

/** How long Send says "Sent to Claude" after a send (epic `epic-engine` I352). */
const SENT_SECONDS = 5
