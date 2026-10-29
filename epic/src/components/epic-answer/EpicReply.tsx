import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

import { ThreadFacts, type Speaker } from "spell/epic/comments"
import { PlanDates } from "spell/epic/dates"
// the fold pieces every `<epic-*>` fold shares:  their files, not `epic-item`'s barrel (which would define it here)
import { FOLDS, Fold } from "spell/epic/components/epic-item/Fold"
// the item it's in, for its place in the item's thread:  the files, not `epic-item`'s barrel
import { ItemLink } from "spell/epic/components/epic-item/ItemLink"
import type { ThreadPlace } from "spell/epic/components/epic-item/AnswerThread"

import { epicReplyVocabulary } from "./EpicReply.en"
import {
  BODY,
  BODY_ID,
  DATE,
  DATED,
  EMPTY,
  HEADER,
  HEADING_SEPARATOR,
  NEW,
  NEW_TAG,
  WHO,
  WHO_ID
} from "./EpicAnswer.types"
import { SeenReplies } from "./SeenReplies"

import answerCSS from "./EpicAnswer.css?inline"
import foldCSS from "spell/epic/components/epic-item/Fold.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicReply`
 * The component behind `<epic-reply>`:  a reply on an item, after its answer.
 * - A card:  its heading band, then the reply (its light children).
 * - The band:  `<from> · re: <re>`, with the date (`at`) at its right, `10/7/26 10:50`;  each part only when set.
 *   - a flex row (`.header.dated`):  the fold chevron, then who and what about on the left, free to wrap
 *   - the date pinned to the right of the TOP line, never wrapping under them, at any width (Owen, 2026-10-08, P13)
 * - Folds by its band (Owen, 2026-10-08:  "Owen/Claude entries in the text should be collapsible"):
 *   - open to start with, as it's what's being read;  page state, never written
 *   - but Owen's note asking for More Details, above Claude's card, starts FOLDED (Owen, 2026-10-24)
 *   - folded, the reply is `hidden="until-found"`
 * - WHO wrote it (epic `epic-friend` P2, Q7, Q9), by `ThreadFacts.speakerOf()`:
 *   - a person's (no `agent`):  `You` when it's the reader's own (`window.SPELL_SERVER.person`), else their name;
 *     every person's in the one person's look (`.person`)
 *   - an agent's (`agent="claude"`, or an old `from="Claude"`):  `Claude (Ana)` for another person's session,
 *     plain `Claude` for the reader's own or an old one;  Claude's look
 *   - the round mark before the name:  its initial
 * - In an item (epic `epic-engine` P27, Owen's layout A):
 *   - one of the THREAD's section, with the item's other replies and its status lines (`AnswerThread`):
 *     one card frame round them all, a thin rule between them (I152)
 *   - the thread's HEAD (its first reply):  its band is the section's header, and its fold folds the whole thread,
 *     through its item (`ItemLink.foldThread()`);  the replies after it hide while it's folded
 *   - Claude's NEWEST reply (no person's after it):  an orange edge and a NEW tag in its band, until Owen has
 *     seen it (`SeenReplies`:  on screen for 1.2s, remembered in this browser);  orange:  changed since you looked
 ****************/
export class EpicReply extends E.UIComponent<typeof epicReplyVocabulary> {
  @E.proto static vocabulary = epicReplyVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-fold-button": foldCSS, "epic-answer": answerCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The item it's in:  its thread. */
  readonly link = new ItemLink(this.domElement)

  /** Light-DOM slot occupancy:  has it a body? */
  readonly slots = new E.SlotContent(this.domElement)

  /** Open or folded:  open to start with;  folded, Owen's note asking for More Details (it came first). */
  readonly fold = new Fold(() => !this.link.thread()?.asksForMore(this.domElement))

  /** Unfolded. */
  @E.cssState("open")
  get isOpen(): boolean {
    return this.fold.isOpen()
  }

  /** What Owen has seen of its item's replies, in this browser. */
  readonly seen = new SeenReplies()

  /** Its place in its item's thread's section;  `undefined` outside one. */
  get place(): ThreadPlace | undefined {
    return this.link.thread()?.placeOf(this.domElement)
  }

  /** In the thread's section:  inside its one frame. */
  @E.cssState("in-thread")
  get isInThread(): boolean {
    return !!this.place
  }

  /** First in the section:  the frame's top corners. */
  @E.cssState("thread-start")
  get startsThread(): boolean {
    return !!this.place?.start
  }

  /** Last in the section, or its head while folded (the rest hidden):  the frame's bottom corners. */
  @E.cssState("thread-end")
  get endsThread(): boolean {
    return !!this.place?.end || (this.isThreadHead && !this.isOpen)
  }

  /** The thread's head, its first reply:  its fold folds the whole thread. */
  get isThreadHead(): boolean {
    return !!this.place?.head
  }

  /** After the thread's head, which is folded:  hidden with it. */
  @E.cssState("thread-hidden")
  get isThreadHidden(): boolean {
    return !!this.place?.underHead && this.link.threadFolded()
  }

  /** The thread's head, folded or opened:  the item folds or opens the rest of the thread with it (page state). */
  @E.onChange("isThreadHead", "isOpen")
  protected onHeadFolded(isHead: boolean, open: boolean) {
    if (!isHead) return
    this.link.foldThread(!open)
    // no longer the head (or gone):  the thread stands open
    return () => this.link.foldThread(false)
  }

  /** Claude's newest reply on its item, not seen yet:  orange edge, NEW. */
  @E.cssState("new")
  get isNew(): boolean {
    const itemId = this.domElement.parentElement?.id ?? ""
    return this.link.thread()?.newestReply === this.domElement && !this.seen.isSeen(itemId, this.at ?? "")
  }

  /** Follow the item it's in, while connected;  read what's been seen of it. */
  @E.whileConnected
  protected followItem() {
    this.seen.load(this.domElement.parentElement?.id ?? "")
    return this.link.connect()
  }

  /** While it's new:  watch it on screen, and mark it seen once it's been there long enough. */
  @E.onChange("isNew", "isConnected")
  protected onNewShown(isNew: boolean, connected: boolean) {
    if (!isNew || !connected) return
    return SeenReplies.watch(this.domElement, () =>
      this.seen.markSeen(this.domElement.parentElement?.id ?? "", this.at ?? "")
    )
  }

  /** Has it a reply to fold? */
  get hasBody(): boolean {
    return this.slots.hasContent("")
  }

  /** Who wrote it, as the reader sees it (`ThreadFacts.speakerOf()`):  its person, its agent, and whether it's theirs. */
  get speaker(): Speaker {
    const attributes: Record<string, string | undefined> = { from: this.from, agent: this.agent, at: this.at }
    return ThreadFacts.speakerOf({ getAttribute: (name) => attributes[name] ?? null })
  }

  /**
   * Who wrote it, in words:  `You`, a person's name, `Claude`, or `Claude (Ana)` for another person's session;
   * `""` for a reply that names nobody.
   */
  get author(): string {
    const { person, agent, mine } = this.speaker
    if (agent)
      return person && !mine ? this.translationForKey("claudeOf", { person }) : this.translationForKey("claude")
    if (!person) return ""
    return mine ? this.translationForKey("you") : person
  }

  /** The round mark's letter:  the agent's (`C`), else the person's first. */
  get initial(): string {
    const { person, agent } = this.speaker
    return (agent ? this.translationForKey("claude") : (person ?? "")).trim().charAt(0).toUpperCase()
  }

  /** Its heading's left:  who, about what. */
  get who(): string {
    const { re } = this
    return [this.author, re && this.translationForKey("re", { re })].filter(Boolean).join(HEADING_SEPARATOR)
  }

  /** Its heading's right:  when, as drawn (`10/7/26 10:50`). */
  get date(): string {
    return PlanDates.format(this.at)
  }

  protected get extraClass(): string | undefined {
    return [!this.speaker.agent && PERSON, this.isNew && NEW].filter(Boolean).join(" ") || undefined
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <div
          ref={this.fold.heading}
          class={[HEADER, DATED, { [FOLDS]: this.hasBody }]}
          part={this.partForName("header")}
          hidden={!this.who && !this.date}
        >
          <Show when={this.hasBody}>
            {this.fold.button({
              controls: BODY_ID,
              labelledBy: WHO_ID,
              part: this.partForName("toggle"),
              tips: { fold: this.translationForKey("foldTip"), unfold: this.translationForKey("unfoldTip") }
            })}
          </Show>
          <span id={WHO_ID} class={WHO} part={this.partForName("who")} data-initial={this.initial}>
            {this.who}
          </span>
          <Show when={this.isNew}>
            <span class={NEW_TAG} part={this.partForName("new")} title={this.translationForKey("newTip")}>
              {this.translationForKey("new")}
            </span>
          </Show>
          <Show when={this.date}>
            <time class={DATE} part={this.partForName("date")} datetime={this.at}>
              {this.date}
            </time>
          </Show>
        </div>
        <div
          ref={this.fold.watch}
          id={BODY_ID}
          class={[BODY, { [EMPTY]: !this.hasBody }]}
          part={this.partForName("body")}
          hidden={this.fold.hidden()}
        >
          <slot />
        </div>
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicReply extends E.AttributeValues<typeof epicReplyVocabulary> {}

/** Class word on a reply box:  a person's, not an agent's. */
const PERSON = "person"
