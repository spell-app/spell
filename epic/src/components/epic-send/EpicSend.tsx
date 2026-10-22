import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import { AnswerForm, type ListenLine, type SendFill } from "spell-epic/answers"
import {
  SEND_ASKED,
  type SendAskedDetail,
  type SendState
} from "spell-epic/components/epic-send-buttons/EpicSendButtons.types"

import { epicSendVocabulary } from "./EpicSend.en"

import sendCSS from "./EpicSend.css?inline"
import tooltipCSS from "spell-epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicSend`
 * The component behind `<epic-send>`:  a details page's Send (epic `epic-workflow` P12), in its sticky header.
 * - Draws the page's `AnswerForm`:
 *   - where the answer stands:  "Not sent", "Changes not sent", "Sent 10/8/26 14:34 · 5 of 17 decided"
 *   - Send and its countdown (`<epic-send-buttons>`, epic `epic-engine` P20), blue as every Send is, by the fill rule
 *     (`templates/epics/plan-doc.md`, "Colours"):  a grey outline with nothing to send, dashed with changes not sent,
 *     an outline once sent;  never solid, since the page can't tell when Claude is done with it
 *     - countdown on:  the answer goes by itself 2 minutes after Owen stops;  off, the plane is filled until pressed
 *   - the draft's save, muted beside them ("draft saved 14:04";  epic `epic-workflow` P18)
 *     - a save that FAILED, on its own line under them, in red, bold (epic `epic-engine` P15):  never cut short by the
 *       side bar's width;  the browser still keeps the draft, and the form tries again every 3s
 *   - after Send, who hears it (epic `epic-engine` r6):  "repo-split is listening" with a green dot (a session's
 *     `epic ask wait`), or "nobody is waiting yet" (`AnswerForm.listenLine`)
 *   - why the last send failed, under them;  or, sent with nobody waiting, that it's saved for Claude's next look
 * - A press, or the countdown running out, sends the whole page (`AnswerForm.send()`):  partial answers too, again
 *   whenever Owen likes.
 * - SIDE EFFECT:  as it connects, the page's form reads back the answer already sent (`AnswerForm.load()`), and any
 *   draft newer than it, which every question and box shows;  and saves the draft as the page goes away
 *   (`AnswerForm.watch()`).
 ****************/
export class EpicSend extends E.UIComponent<typeof epicSendVocabulary> {
  @E.proto static vocabulary = epicSendVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-send": sendCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The page's form;  none in a server render. */
  readonly form = isServer ? undefined : AnswerForm.forPage()

  /** The form's `version`, as last heard:  every getter below reads it, so the bar redraws on each change. */
  @E.state accessor version = 0

  /** Where the answer stands, for Send's fill. */
  get fill(): SendFill {
    void this.version
    return this.form?.fill ?? "rest"
  }

  /** Something not sent yet. */
  @E.cssState("pending")
  get isPending(): boolean {
    return this.fill === "pending"
  }

  /** The page as sent. */
  @E.cssState("sent")
  get isSent(): boolean {
    return this.fill === "sent"
  }

  /** The words beside Send, and their colour. */
  get stateLine(): { text: string; color: string } {
    void this.version
    return this.form?.stateLine ?? { text: "", color: "grey" }
  }

  /** Why the last send failed;  `""` for none. */
  get error(): string {
    void this.version
    return this.form?.error ?? ""
  }

  /** The draft's save, and whether it failed (`AnswerForm.draftText`). */
  get draftLine(): { text: string; isError: boolean } {
    void this.version
    return { text: this.form?.draftText ?? "", isError: !!this.form?.isDraftError }
  }

  /** Who hears a Send (`AnswerForm.listenLine`). */
  get listenLine(): ListenLine {
    void this.version
    return this.form?.listenLine ?? { text: "", title: "", isListening: false }
  }

  /** What the last send did with nobody waiting;  `""` for nothing to say. */
  get notice(): string {
    void this.version
    return this.form?.notice ?? ""
  }

  /** A send on its way:  Send spins. */
  get isSending(): boolean {
    void this.version
    return !!this.form?.isSending
  }

  /**
   * While connected:  follow the page's form, read back the answer already sent (and a draft), and save the draft as
   * the page goes away;  returns the undo.
   */
  @E.whileConnected
  protected followForm() {
    const form = this.form
    if (!form) return undefined
    this.version = form.version
    void form.load()
    const unwatch = form.watch(window)
    const unsubscribe = form.subscribe(() => (this.version = form.version))
    return () => {
      unsubscribe()
      unwatch()
    }
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <div class={ROW}>
          <span class={STATE} part={this.partForName("state")} data-color={this.stateLine.color}>
            {this.stateLine.text}
          </span>
          <Show when={this.draftLine.text && !this.draftLine.isError}>
            <span class={DRAFT} part={this.partForName("draft")} title={this.draftLine.text}>
              {this.draftLine.text}
            </span>
          </Show>
          <epic-send-buttons
            class={SEND}
            part={this.partForName("send")}
            state={SEND_STATES_OF[this.fill]}
            data-fill={this.fill}
            busy={this.isSending ? "" : undefined}
            send-tip={this.translationForKey("sendTip")}
          />
          <Show when={this.listenLine.text}>
            <span
              class={WHO}
              part={this.partForName("who")}
              data-listening={this.listenLine.isListening ? "" : undefined}
              title={this.listenLine.title}
            >
              {this.listenLine.text}
            </span>
          </Show>
        </div>
        <Show when={this.draftLine.isError}>
          <p class={[ERROR, DRAFT_FAILED]} part={this.partForName("draft")} role="alert">
            {this.draftLine.text}
          </p>
        </Show>
        <Show when={this.error}>
          <p class={ERROR} part={this.partForName("error")} role="alert">
            {this.error}
          </p>
        </Show>
        <Show when={!this.error && this.notice}>
          <p class={NOTICE} part={this.partForName("notice")} role="status">
            {this.notice}
          </p>
        </Show>
      </div>
    )
  }

  /** Send asked for (`<epic-send-buttons>`):  a press, or the countdown running out;  the whole page goes. */
  @E.on(SEND_ASKED, { target: "renderRoot" })
  protected onSendAsked(event: CustomEvent<SendAskedDetail>) {
    event.stopPropagation()
    void this.form?.send()
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicSend extends E.AttributeValues<typeof epicSendVocabulary> {}

/** Classes of the shadow markup. */
const ROW = "row"
const STATE = "state"
const DRAFT = "draft"
const DRAFT_FAILED = "draft-failed"
const SEND = "send"
const ERROR = "error"
const WHO = "who"
const NOTICE = "notice"

/** The group's state for each fill of the form's (`<epic-send-buttons>` `state`). */
const SEND_STATES_OF: Record<SendFill, SendState> = { rest: "idle", pending: "unsent", sent: "sent" }
