import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "$/spell-element"

import { ThreadFacts, type ThreadComment } from "$/epics/comments"

import { epicThreadVocabulary } from "./EpicThread.en"
import {
  BASE,
  BODY,
  CHECK,
  CHEVRON,
  DONE,
  FLOPPY,
  FOLD,
  HEAD,
  HEADLINE,
  HTML,
  ID,
  MARK,
  MOVED,
  REPLY,
  SPIN,
  THREAD_DELETE,
  THREAD_EDIT,
  THREAD_FOLD,
  TOOL,
  type MessageBy
} from "./EpicThread.types"

import threadCSS from "./EpicThread.css?inline"
import tooltipCSS from "$/epics/components/epic-item/Tooltip.css?inline"

/****************
 * ### `DOMThreadElement`
 * The DOM element of `<epic-thread>`:  its script API, for the comments' code (`spell-doc-comments.js`).
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMThreadElement extends E.DOMElement<EpicThread> {
  /** Its header, once drawn:  what a corner bullhorn must keep off (the comments' `makeRoom()`). */
  get header(): HTMLElement | undefined {
    return this.component?.header
  }

  /** The focus to its fold (opening it from its quote, landing on it from the toolbar);  no scrolling. */
  focusFold() {
    this.component?.fold?.focus({ preventScroll: true })
  }

  /** Is the focus on its fold? */
  get isFoldFocused(): boolean {
    const fold = this.component?.fold
    return !!fold && this.shadowRoot?.activeElement === fold
  }
}

/****************
 * ### `EpicThread`
 * The component behind `<epic-thread>`:  one comment's whole THREAD (Owen, 2026-10-10:  "the entire comment thread
 * should be in one collapsable/accordion pane";  an element since epic `epic-engine` P3).
 * - ONE ivory pane, whoever spoke last ("Make the entire thing ivory");  ORANGE while Claude spoke last and Owen
 *   hasn't answered (`unseen`;  Owen, 2026-10-10:  "make the background of the entire bullhorn thread + the last
 *   claude reply orange").
 * - Its HEADER (`head()`):  the fold -- a chevron, the bullhorn (a green check circle once done), its id (`M3`), the
 *   first words it's on (its tooltip the block in full) -- then:
 *   - Owen's answer while it's his turn:  an item's review pills (`<epic-review buttons="thread">`;  Owen,
 *     2026-10-10:  "Make top buttons same semantics/look as pills in item header");  Reopen once done
 *   - the pen, while his first words wait and Claude hasn't had them
 *   - the trash, always
 *   - no date:  each message has its time (Owen, 2026-10-10:  "Dont need date in the top if it's next to who spoke")
 *   - a click on it, not on one of its buttons, folds it:  it flips `open`, and says so (`epic-thread-fold`)
 * - Its BODY, while open:  what it was on, if its block changed;  the messages in order (`messages`, each an
 *   `<epic-thread-message>`);  then Owen's box, slotted, its floppy in the corner.
 * - It draws what it's given (`comment`, `open` ...) and says what Owen did (its events, `<epic-review>`'s
 *   `epic-thread-answer`):  the comments' code saves, keeps the box and draws it again.
 ****************/
export class EpicThread extends E.UIComponent<typeof epicThreadVocabulary> {
  @E.proto static vocabulary = epicThreadVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-thread": threadCSS },
    DOMElement: DOMThreadElement,
    // a click on its words selects them;  its fold and buttons take the focus themselves
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Light-DOM slot occupancy:  is Owen's box there? */
  readonly slots = new E.SlotContent(this.domElement)

  /** Its header, once drawn. */
  header: HTMLElement | undefined

  /** Its fold, once drawn. */
  fold: HTMLButtonElement | undefined

  ////////////////
  // ## What it shows
  ////////////////

  /** Whose turn it is:  the server's, else worked out (a server started before threads sends none). */
  get turn(): string {
    const comment = this.comment as ThreadComment | undefined
    return comment ? (comment.turn ?? ThreadFacts.turnOf(comment)) : "claude"
  }

  /** The pen shows:  his first words wait, Claude hasn't had them, and its box isn't open. */
  get hasPen(): boolean {
    const comment = this.comment as ThreadComment | undefined
    return !!comment && this.boxed !== "first" && ThreadFacts.pendingOf(comment) === "edit"
  }

  /** Where it is, in full, then what a click on its header does:  the fold's tooltip. */
  get foldTip(): string {
    const comment = this.comment as ThreadComment | undefined
    const about = comment ? ThreadFacts.aboutTip({ id: comment.id, place: comment }) : ""
    return `${about}\n(${this.translationForKey(this.open ? "foldTip" : "unfoldTip")})`
  }

  /**
   * The messages, in order (`ThreadMessage`):  Owen's words, Claude's answers, his replies;  "taken into" where
   * Claude took it;  then the Done line once closed, or "Claude: thinking…" while Claude is at work on it.
   * - `boxed`:  his words in the box under it are left out
   * - each one's time:  the day with it on the first, and whenever the day changes
   * - every one but the last `older`;  Claude's latest `latest` while the thread is orange
   */
  @E.derived
  get messages(): ThreadMessage[] {
    const comment = this.comment as ThreadComment | undefined
    if (!comment) return []
    const said = [{ by: OWEN, at: comment.at, text: comment.text }, ...(comment.replies ?? [])]
    if (this.boxed === "first") said.shift()
    else if (this.boxed === "pending" && ThreadFacts.pendingReplyOf(comment)) said.pop()
    const messages: ThreadMessage[] = said.map((each) =>
      each.by === OWEN
        ? { by: "owen", at: each.at, text: each.text ?? "" }
        : { by: "claude", at: each.at, html: "html" in each ? each.html || undefined : undefined }
    )
    const { taken, done } = comment
    if (taken) {
      const into = ThreadFacts.takenInto(taken)
      const line: ThreadMessage = {
        by: "claude",
        at: taken.at,
        taken: { href: planLink(taken.epic, into.hash), label: into.label }
      }
      const after = messages.findIndex((each) => each.at > taken.at)
      messages.splice(after < 0 ? messages.length : after, 0, line)
    }
    // answered before threads, in an epic page:  no entry of Claude's at all
    if (comment.status === "answered" && !comment.replies?.some((each) => each.by !== OWEN))
      messages.push({ by: "claude", at: "" })
    if (done) {
      const commit = comment.replies?.findLast((each) => each.commit)?.commit
      messages.push({ by: "done", at: done.at, how: done.how, commit })
    }
    // Claude thinking about it now (Owen, 2026-10-10:  "You could put in a stub and replace that when you've thought")
    if (comment.working && !done) messages.push({ by: "thinking", at: comment.working })
    const latest = messages.findLastIndex((each) => each.by === "claude" && each.at)
    let day = ""
    return messages.map((each, index) => {
      const local = each.at ? ThreadFacts.localStamp(each.at) : ""
      const stamp = !local ? "" : local.slice(0, 10) === day ? local.slice(11) : ThreadFacts.shortStamp(local)
      if (local) day = local.slice(0, 10)
      return { ...each, stamp, older: index < messages.length - 1, latest: index === latest && !!this.unseen }
    })
  }

  ////////////////
  // ## Drawing
  ////////////////

  render(): JSX.Element {
    return (
      <div class={BASE} part={this.partForName("base")}>
        {this.head()}
        <Show when={this.open}>
          <div class={BODY} part={this.partForName("body")}>
            <Show when={this.moved}>
              <p class={MOVED}>
                {this.translationForKey("moved", {
                  excerpt: (this.comment as ThreadComment | undefined)?.excerpt ?? ""
                })}
              </p>
            </Show>
            <For each={this.messages}>{(message) => this.message(message)}</For>
            <Show when={this.slots.hasContent("")}>
              <div class={REPLY} part={this.partForName("reply")}>
                <slot />
                <Show when={this.saved}>
                  <span class={FLOPPY} title={this.saved} data-failed={this.failed ? "" : undefined}>
                    <ui-icon name="floppy disk outline" />
                  </span>
                </Show>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    )
  }

  /**
   * Its header:  the fold (chevron, bullhorn or check circle, id, first words), Owen's answer, the pen, the trash.
   * - the fold is a `<button>`, the whole of what names the thread:  the old comments' header row, now its own
   * - a click anywhere on the header but its buttons folds it (`onHeadClick()`)
   */
  private head(): JSX.Element {
    const comment = () => this.comment as ThreadComment | undefined
    const done = () => this.turn === "done"
    return (
      <div ref={this.onHeadDrawn} class={HEAD} part={this.partForName("header")}>
        <button
          ref={(fold) => (this.fold = fold)}
          type="button"
          class={FOLD}
          part={this.partForName("fold")}
          aria-expanded={this.open ? "true" : "false"}
          title={this.foldTip}
        >
          <span class={CHEVRON}>
            <ui-icon name="chevron right" />
          </span>
          <span class={[MARK, { [DONE]: done() }]}>
            <ui-icon name={done() ? "circle check" : "bullhorn"} />
          </span>
          <span class={ID} part={this.partForName("id")}>
            {ThreadFacts.label(comment()?.id ?? "")}
          </span>
          <span class={HEADLINE} part={this.partForName("headline")}>
            {comment() ? ThreadFacts.headline(comment()!) : ""}
          </span>
        </button>
        <Show when={this.turn === "owen" || done()}>
          <epic-review
            part={this.partForName("answer")}
            of={comment()?.id ?? ""}
            label={ThreadFacts.label(comment()?.id ?? "")}
            shows="buttons"
            buttons={done() ? "closed" : "thread"}
          />
        </Show>
        <Show when={this.hasPen}>
          <ui-button
            class={[TOOL, "edit"]}
            circular=""
            basic=""
            size="mini"
            icon="edit"
            title={this.translationForKey("editTitle")}
            aria-label={this.translationForKey("editLabel")}
            onClick={(event: MouseEvent) => this.say(event, THREAD_EDIT)}
          />
        </Show>
        <ui-button
          class={[TOOL, "delete"]}
          circular=""
          basic=""
          size="mini"
          icon="trash can"
          title={this.translationForKey("deleteTitle")}
          aria-label={this.translationForKey(comment()?.status === "new" ? "deleteNew" : "deleteHad")}
          onClick={(event: MouseEvent) => this.say(event, THREAD_DELETE)}
        />
      </div>
    )
  }

  /** One message, as `<epic-thread-message>`:  who and when are its attributes, what was said its children. */
  private message(message: ThreadMessage): JSX.Element {
    return (
      <epic-thread-message
        by={message.by}
        at={message.at || undefined}
        stamp={message.stamp || undefined}
        older={message.older ? "" : undefined}
        latest={message.latest ? "" : undefined}
      >
        {this.words(message)}
      </epic-thread-message>
    )
  }

  /**
   * What a message says:
   * - Owen's words:  a paragraph per block (split at blank lines), a single newline a line break, `backticked` runs
   *   code -- as `PageNotes.js` `htmlOf()` makes his notes on the server
   * - Claude's answer:  its markup, as the server gave it;  none here:  "Answered on the epic page."
   * - taken:  "Taken into <epic> · <phase>", linked by the phase's stable id (`ThreadFacts.takenInto()`)
   * - the Done line:  a check, "That's good." or "Skipped", and the commit Claude named
   * - the thinking stub:  a turning notch, "thinking…"
   */
  private words(message: ThreadMessage): JSX.Element {
    if (message.by === "owen") return paragraphsOf(message.text ?? "")
    if (message.by === "done")
      return (
        <p>
          <span class={CHECK}>
            <ui-icon name="circle check" />
          </span>
          {this.translationForKey(message.how === "skip" ? "skip" : "good")}
          <Show when={message.commit}>
            {(commit) => (
              <>
                {"  "}
                {this.translationForKey("builtIn")} <code>{commit()}</code>.
              </>
            )}
          </Show>
        </p>
      )
    if (message.by === "thinking")
      return (
        <p>
          <span class={SPIN} aria-hidden="true">
            <ui-icon name="circle notch" />
          </span>
          {this.translationForKey("thinking")}
        </p>
      )
    if (message.taken)
      return (
        <p>
          {this.translationForKey("takenInto")} <a href={message.taken.href}>{message.taken.label}</a>
          {this.translationForKey("takenWhy")}
        </p>
      )
    if (message.html) return <div class={HTML} innerHTML={message.html} />
    return <p>{this.translationForKey("answeredInDoc")}</p>
  }

  ////////////////
  // ## What Owen does
  ////////////////

  /**
   * Its header, as it's drawn:  kept, and a click on it folds (`onHeadClick()`).
   * - a native listener, not JSX's `onClick`:  Solid delegates that to the root, where the click's `currentTarget`
   *   (where the header ends) is gone (as `Fold.heading`)
   */
  @E.untracked
  private readonly onHeadDrawn = (head: HTMLDivElement) => {
    this.header = head
    head.addEventListener("click", this.onHeadClick)
  }

  /**
   * A click on its header, not on one of its buttons (or its review pills), folds or unfolds it:  `open` flips, and
   * it says so (`epic-thread-fold`).  Its fold button's click, Enter and Space land here too.
   */
  @E.untracked
  private readonly onHeadClick = (event: MouseEvent) => {
    const header = event.currentTarget as Element
    for (const target of event.composedPath()) {
      if (target === header || !(target instanceof Element)) break
      if (target.matches(BUTTONS)) return
    }
    const open = !this.open
    this.open = open
    this.send(THREAD_FOLD, { open })
  }

  /** The pen or the trash:  say so;  the header doesn't fold for it. */
  @E.untracked
  private say(event: MouseEvent, name: typeof THREAD_EDIT | typeof THREAD_DELETE) {
    event.stopPropagation()
    this.send(name, {})
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicThread extends E.AttributeValues<typeof epicThreadVocabulary> {}

/**
 * One message of a thread, as `EpicThread.messages` works it out:  who, when, and what was said (one of `text`,
 * `html`, `taken`, or the Done line's `how` and `commit`;  none of them:  Claude's answer with no words here).
 */
type ThreadMessage = {
  by: MessageBy
  /** when, ISO;  `""` for none */
  at: string
  /** Owen's words, as typed */
  text?: string
  /** Claude's answer, as the server gave it */
  html?: string
  /** where Claude took it:  the phase's link, and what it says */
  taken?: { href: string; label: string }
  /** the Done line:  how Owen closed it, and the commit Claude named */
  how?: string
  commit?: string
  /** its time as shown in its corner */
  stamp?: string
  /** not the last */
  older?: boolean
  /** Claude's latest reply, on an orange thread */
  latest?: boolean
}

/** Who writes Owen's words on a thread. */
const OWEN = "Owen"

/** What, in its header, acts by itself:  a click there doesn't fold. */
const BUTTONS = "ui-button, epic-review"

/** Owen's words split into paragraphs at blank lines;  a single newline a line break;  `backticked` runs code. */
function paragraphsOf(words: string): JSX.Element {
  const blocks = words.trim().split(/\n[ \t]*\n\s*/)
  return (
    <For each={blocks}>
      {(block) => (
        <p>
          <For each={block.trim().split(/(`[^`]+`|\n)/)}>
            {(piece) => (piece === "\n" ? <br /> : CODE_RUN.test(piece) ? <code>{piece.slice(1, -1)}</code> : piece)}
          </For>
        </p>
      )}
    </For>
  )
}

/** A `backticked` run in Owen's words. */
const CODE_RUN = /^`[^`]+`$/

/**
 * The URL of the phase a comment was taken into, from this checkout's root (a worktree's `/worktrees/<w>/` too):
 * epic `epic`'s page, at `#hash` (`ThreadFacts.takenInto()`:  the phase's stable id, or an old taken comment's `p7`).
 */
function planLink(epic: string, hash: string): string {
  const root = WORKTREE_ROOT.exec(location.pathname)?.[0] ?? "/"
  return `${root}epics/${encodeURIComponent(epic)}/${encodeURIComponent(epic)}.plan.html#${encodeURIComponent(hash)}`
}

/** A worktree's page:  `/worktrees/<w>/`. */
const WORKTREE_ROOT = /^\/worktrees\/[^/]+\//
