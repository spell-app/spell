import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import { SendCountdown } from "spell-epic/review"

import { epicSendButtonsVocabulary } from "./EpicSendButtons.en"
import { SEND_ASKED, type SendAskedDetail } from "./EpicSendButtons.types"

import tooltipCSS from "spell-epic/components/epic-item/Tooltip.css?inline"
import sendButtonsCSS from "./EpicSendButtons.css?inline"

/****************
 * ### `<epic-send-buttons>`
 * Send and its COUNTDOWN, one group (epic `epic-engine` P20):  the paper plane, then the wand.
 * - Owen, 2026-10-22:  "Make the magic wand near the plane a toggle -- when it is on, you wait for 2 minutes of
 *   inactivity from me ... and when that is reached you submit the answers.  When it's off, I have to press the plane."
 * - the PLANE asks its owner to send (`epic-send-asked`, `auto` false)
 *   - from `state`:  grey with nothing to send, blue with something not sent;  the group's outline grey, blue
 *     once sent, never dashed (Owen, 2026-10-22)
 *   - countdown off with something not sent:  FILLED blue, so it plainly waits for a press (`:state(waiting)`)
 * - the WAND turns countdown mode on and off, for every page in this browser (the page's `SendCountdown`)
 *   - on:  filled light blue, its icon white;  off:  grey
 *   - while it counts (mode on, something not sent):  a very light grey ring round it turns blue, clockwise, over
 *     the 2 minutes, starting again at every key, click or scroll on the page;  its tooltip says how long is left
 *   - at the end the owner is asked to send (`auto` true):  an epic page sends as Review Now did (decision Q7)
 * - a STAGE BUTTON in the plane's place (`accept`, epic `epic-engine` P29):  a check and its words ("Accept
 *   Overview"), green;  a press asks its owner as the plane's does, and the owner accepts the stage
 *   - outlined green once pressed (`accepted`), waiting for the session to move the page on
 *   - the wand stays:  the countdown still sends what's unsent by itself
 * - the countdown is the PAGE's, not this element's:  a Send drawn again (a guide's, at every redraw of its comments)
 *   finds it where it was, its ring too
 * - its owners:  `<epic-page>` (the header), `<epic-send>` (a details page) and the docs runtime's comments
 *   (`drawSend()`, a docs page);  each sends its own way, and only sets `state`
 * - NEVER sends anything itself:  it only asks
 ****************/
export class EpicSendButtons extends E.UIComponent<typeof epicSendButtonsVocabulary> {
  @E.proto static vocabulary = epicSendButtonsVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-send-buttons": sendButtonsCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The countdown
  ////////////////

  /** The page's countdown;  none in a server render. */
  readonly countdown = isServer ? undefined : SendCountdown.forPage()

  /** The countdown's `version`, as last heard:  the getters below read it, so the group redraws on each change. */
  @E.state accessor version = 0

  /** Countdown mode is on. */
  @E.cssState("countdown")
  get isCountdownOn(): boolean {
    void this.version
    if (this.manual) return false
    return this.countdown?.isOnHere ?? true
  }

  /** The countdown is running:  the ring drains. */
  @E.cssState("counting")
  get isCounting(): boolean {
    void this.version
    return !this.manual && !!this.countdown?.isRunning
  }

  /** Countdown off, something not sent:  the plane is filled, waiting for a press;  never the stage button. */
  @E.cssState("waiting")
  get isWaiting(): boolean {
    return !this.accept && !this.isCountdownOn && this.isUnsent
  }

  /** The plane's place holds the stage button (`accept`):  its words, not the plane. */
  @E.cssState("stage")
  get isStageButton(): boolean {
    return !!this.accept
  }

  /** Something not sent yet. */
  get isUnsent(): boolean {
    return this.state === "unsent"
  }

  /** How much of the countdown has run, `0` to `1`:  the ring's blue length. */
  get fractionElapsed(): number {
    void this.version
    return 1 - (this.countdown?.fractionLeft ?? 1)
  }

  /**
   * While connected:  follow the page's countdown, tell it whether something waits, and send when it runs out;
   * returns the undo.
   */
  @E.whileConnected
  protected followCountdown() {
    const countdown = this.countdown
    // `manual`:  only a press sends;  the page's countdown never hears of this Send
    if (!countdown || this.manual) return undefined
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
    if (!this.manual) this.countdown?.setPending(this.isUnsent)
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
      >
        <button
          type="button"
          class={[SEND, { [ACCEPT]: !!this.accept }]}
          part={this.partForName("send")}
          data-state={this.groupState}
          aria-busy={this.busy ? "true" : undefined}
          aria-label={this.sendTip || this.accept || this.translationForKey("send")}
          title={this.sendTip || this.accept || this.translationForKey("send")}
          onClick={() => this.askToSend(false)}
        >
          <ui-icon
            name={this.busy ? "circle notch" : this.accept ? "circle check" : "paper plane"}
            loading={this.busy ? "" : undefined}
          />
          <Show when={this.accept}>
            <span class={ACCEPT_WORDS}>{this.accept}</span>
          </Show>
          <Show when={!this.accept && (this.count ?? 0) > 0}>
            <span class={COUNT} part={this.partForName("count")}>
              {this.count}
            </span>
          </Show>
        </button>
        <Show when={!this.manual}>
          <button
            type="button"
            class={COUNTDOWN}
            part={this.partForName("countdown")}
            aria-pressed={this.isCountdownOn ? "true" : "false"}
            aria-label={this.translationForKey("countdownName")}
            title={this.countdownTip}
            onClick={() => this.countdown?.toggle()}
          >
            <Show when={this.isCounting}>
              <svg class={RING} part={this.partForName("ring")} viewBox="0 0 36 36" aria-hidden="true">
                <circle class={TRACK} cx="18" cy="18" r="15.5" pathLength="100" />
                <circle
                  class={ELAPSED}
                  cx="18"
                  cy="18"
                  r="15.5"
                  pathLength="100"
                  style={{ "stroke-dasharray": `${this.fractionElapsed * 100} 100` }}
                />
              </svg>
            </Show>
            <ui-icon name="wand magic sparkles" />
          </button>
        </Show>
      </span>
    )
  }

  /**
   * The group's `data-state`, its outline and the plane's colour:  `state`;  the stage button's own,
   * `accepted` once pressed, else `idle`.
   */
  get groupState(): string {
    if (this.accept) return this.accepted ? "accepted" : "idle"
    return this.state ?? "idle"
  }

  /** The wand's tooltip:  the mode, when it sends, what a click does. */
  get countdownTip(): string {
    if (!this.isCountdownOn) return this.translationForKey("countdownOff")
    const when = this.isCounting
      ? this.translationForKey("whenCounting", { time: clockOf(this.countdown?.msLeft ?? 0) })
      : this.translationForKey("whenIdle")
    return this.translationForKey("countdownOn", { when })
  }

  /** Ask the owner to send (`auto`:  the countdown ran out);  nothing while a send is on its way. */
  @E.untracked
  private askToSend(auto: boolean) {
    if (this.busy) return
    this.send(SEND_ASKED, { auto } satisfies SendAskedDetail)
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicSendButtons extends E.AttributeValues<typeof epicSendButtonsVocabulary> {}

/** Classes of the shadow markup. */
const GROUP = "group"
const SEND = "send"
const ACCEPT = "accept"
const ACCEPT_WORDS = "accept-words"
const COUNT = "count"
const COUNTDOWN = "countdown"
const RING = "ring"
const TRACK = "track"
const ELAPSED = "elapsed"

/** `ms` as minutes and seconds, rounded up:  `1:42`, `0:05`. */
function clockOf(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}
