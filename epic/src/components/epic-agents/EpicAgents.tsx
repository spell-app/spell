import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/element"

import {
  AgentsClient,
  ReviewClient,
  ageOf,
  clockOf,
  sentence,
  type InboxDoing,
  type RunningAgent
} from "spell/epic/review"
import type { DOMTextBoxElement } from "spell/epic/components/epic-text-box/EpicTextBox"

import { epicAgentsVocabulary } from "./EpicAgents.en"

import agentsCSS from "./EpicAgents.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicAgents`
 * The component behind `<epic-agents>`:  WHAT CLAUDE IS DOING (epic `epic-engine` P35), drawn by `<epic-page>` in its
 * shadow root:  a bare spinner beside the header's Send (`draws="spinner"`, P53), and the agents in the header's pill.
 * - the session's LINE:  what it's doing now, a word or two ("Responding", "Building P35"), a quiet spinner before it,
 *   in a grey pill like the header's step label (Owen, 2026-10-25:  "should look like "running P6" pill");
 *   nothing when idle, or nobody listens (`epic inbox status`, the inbox's `doing`:  `ReviewClient.doing`)
 *   - the bare spinner beside Send shows only for OTHER work ("Building P35"):  answering a Send (`doing` lists items),
 *     it hides, and Send's own ring turns instead (epic `epic-engine` P55, Q62 A)
 *   - hovered or focused, a STYLED tooltip (Owen, 2026-10-24:  "pretty tooltip for what you are responding to"):
 *     what it's answering, each item's id and title, linked (`<ui-popup open-on="hover">`)
 * - the RUNNING AGENTS (epic `skillz` P3):  `2 🤖`, a button, only while any runs ("2 agents running" its name);  a click opens them in
 *   a popover from the toolbar (Owen, 2026-10-24:  "click to see the agents which are running, rather than section at
 *   the top"):  a row per agent, each with a note box that REDIRECTS it (`<ui-popup open-on="click">`)
 *   - the "Agents running" panel above the page's blocks went (P35)
 * - one row per agent, KEYED by name (`row()`):  a poll updates it in place, never touching what's typed in its box,
 *   nor its focus
 * - in the page's shadow root:  the contents, the rail and the counts never see it (they read the light DOM)
 * - SIDE EFFECT:  follows the page's agents and review clients while connected
 ****************/
export class EpicAgents extends E.UIComponent<typeof epicAgentsVocabulary> {
  @E.proto static vocabulary = epicAgentsVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-agents": agentsCSS },
    // a toolbar's tools:  a click on its words must not jump to its first button
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The agents, and what the session is doing
  ////////////////

  /** The epic's running agents, one client per page;  none in a server render (nothing drawn). */
  readonly client = isServer ? undefined : AgentsClient.forPage()

  /** The page's review client:  what the listening session is doing (`doing`);  none in a server render. */
  readonly review = isServer ? undefined : ReviewClient.forPage()

  /** The agents client's `version`, as last heard:  `agents` reads it, so the button redraws on every change. */
  @E.state accessor version = 0

  /** The review client's `version`, as last heard:  `doing` reads it. */
  @E.state accessor reviewVersion = 0

  /** The agents shown:  every one running while listed;  none otherwise. */
  get agents(): RunningAgent[] {
    void this.version
    return this.client?.listed ? this.client.agents : []
  }

  /** What the listening session is doing now;  `null` for nothing. */
  get doing(): InboxDoing | null {
    void this.reviewVersion
    return this.review?.doing ?? null
  }

  /** Follow both clients while connected. */
  @E.whileConnected
  protected followClients() {
    const undo: (() => void)[] = []
    const { client, review } = this
    if (client) {
      this.version = client.version
      undo.push(client.subscribe(() => (this.version = client.version)))
    }
    if (review) {
      this.reviewVersion = review.version
      undo.push(review.subscribe(() => (this.reviewVersion = review.version)))
    }
    return () => undo.forEach((each) => each())
  }

  ////////////////
  // ## Drawing
  ////////////////

  /**
   * `:state(running)`:  agents are running, its button shows (the header's pill joins it:  `EpicPage.css`);
   * `:state(doing)`:  the session's line shows (the header keeps Send centred beside the spinner).
   */
  protected cssStates() {
    return {
      running: this.draws !== "spinner" && this.draws !== "doing" && this.agents.length > 0,
      doing: this.draws !== "agents" && !!this.doing && !this.isSendsRing
    }
  }

  /**
   * The session is answering a Send, and this is the spinner beside it (`draws="spinner"`):  it hides, since Send's own
   * ring turns (epic `epic-engine` P55, Q62 A;  Owen, r46).  Other work ("Building P35") still shows it.
   */
  get isSendsRing(): boolean {
    return this.draws === "spinner" && !!this.doing?.items?.length
  }

  render(): JSX.Element {
    return (
      <span class={TOOLS} part={this.partForName("base")}>
        <Show when={this.draws === "spinner" && !this.isSendsRing && this.doing}>
          {(doing) => this.bareSpinner(doing)}
        </Show>
        <Show when={this.draws !== "agents" && this.draws !== "spinner" && this.doing}>
          {(doing) => (
            <>
              <span
                class={DOING}
                part={this.partForName("doing")}
                tabindex={doing().items?.length ? "0" : undefined}
                aria-label={this.doingLabel(doing())}
              >
                {/* the header's step label's pill, its spinner in place of the label's icon (Owen, 2026-10-25) */}
                <ui-label appearance="basic" color="grey" class={DOING_PILL}>
                  <span slot="icon" class={SPINNER} aria-hidden="true" />
                  <span class={WORDS}>{doing().text}</span>
                </ui-label>
              </span>
              <Show when={doing().items?.length}>{this.doingTip(doing)}</Show>
            </>
          )}
        </Show>
        <Show when={this.draws !== "doing" && this.draws !== "spinner" && this.agents.length}>
          {/* `1 🤖` at every width (Owen, 2026-10-25:  "`1 <robot icon>` is sufficient");  the words its name and tooltip */}
          <button
            type="button"
            class={AGENTS_BUTTON}
            part={this.partForName("agents-button")}
            aria-label={this.agentsWords()}
            title={this.agentsWords()}
          >
            <span class={COUNT} aria-hidden="true">
              {this.agents.length}
            </span>
            {/* a span around the icon:  `ui-icon`'s host is `display: contents`, which can't be placed */}
            <span class={ROBOT}>
              <ui-icon name="robot" />
            </span>
          </button>
          <ui-popup
            open-on="click"
            position="bottom right"
            class={AGENTS_POP}
            part={this.partForName("agents")}
            aria-label={this.translationForKey("agents")}
          >
            <div class={AGENTS_LIST}>
              <For each={this.agents} keyed={(agent) => agent.name}>
                {(agent) => this.row(agent, this.redirectFor(agent))}
              </For>
            </div>
          </ui-popup>
        </Show>
      </span>
    )
  }

  /** The agents' button, in words, its name and tooltip:  `2 agents running`. */
  private agentsWords(): string {
    const count = this.agents.length
    return this.translationForKey(count === 1 ? "agentRunning" : "agentsRunning", { count })
  }

  /**
   * The session's line as a BARE spinner, beside the header's Send (`draws="spinner"`;  T53, Owen, 2026-10-29:
   * "Feels like this agent is chunking away circle should be in the top near the plane", then "the spinner is
   * already round, doesn't need to be in a circular border"):  no pill, its words the tooltip;  what it's
   * answering in the styled tooltip, as the line's.
   */
  private bareSpinner(doing: () => InboxDoing): JSX.Element {
    const answering = () => !!doing().items?.length
    return (
      <>
        <span
          class={[DOING, BARE]}
          part={this.partForName("doing")}
          role="img"
          tabindex={answering() ? "0" : undefined}
          aria-label={this.doingLabel(doing())}
          title={answering() ? undefined : doing().text}
        >
          <span class={SPINNER} aria-hidden="true" />
        </span>
        <Show when={answering()}>{this.doingTip(doing)}</Show>
      </>
    )
  }

  /** The line's styled tooltip:  what it's doing, then each item it's answering, linked. */
  private doingTip(doing: () => InboxDoing): JSX.Element {
    return (
      <ui-popup open-on="hover" position="bottom right" class={DOING_TIP} part={this.partForName("doing-tip")}>
        <b class={TIP_HEAD}>{this.translationForKey("doingTip", { doing: doing().text })}</b>
        <ul class={TIP_ITEMS}>
          <For each={doing().items ?? []} keyed={false}>
            {(item) => (
              <li>
                <a href={`#${item().id}`}>
                  <span class={TIP_CHIP}>{item().id.toUpperCase()}</span> {item().title}
                </a>
              </li>
            )}
          </For>
        </ul>
      </ui-popup>
    )
  }

  /** The line, spoken:  what it's doing, and what it's answering (the tooltip's ids). */
  private doingLabel(doing: InboxDoing): string {
    const ids = (doing.items ?? []).map((item) => item.id.toUpperCase()).join(", ")
    return ids ? `${doing.text}:  ${ids}` : doing.text
  }

  /**
   * One running agent's row, top to bottom:
   * - its name, status (`active` blue, `blocked on <name>` orange, else grey)
   *   and age (its start time in the tooltip)
   * - its task
   * - the redirects so far ("You · 10:42 · told 10:43", or "waiting for the session")
   * - a note box that grows as it's typed in, with Send (`Redirect`):  a blue plane in a circle, no word
   *   (Owen, 2026-10-25:  "Just blue plane icon, ditch "Send"")
   *
   * The box is the DOM's own (never set from the agent):  a poll redraws everything around it, never it.
   */
  private row(agent: () => RunningAgent, redirect: Redirect): JSX.Element {
    const name = redirect.name
    return (
      <div class={AGENT} data-name={name}>
        <div class={AGENT_LINE}>
          <b>
            <code class={AGENT_NAME}>{agent().name}</code>
          </b>
          <ui-label size="mini" appearance="basic" color={statusColorOf(agent().status)}>
            {agent().status}
          </ui-label>
          <span class={AGENT_AGE} title={this.startedTip(agent())}>
            {ageOf(agent().started, Date.now())}
          </span>
        </div>
        <p class={AGENT_TASK}>{agent().task}</p>
        <Show when={agent().redirects.length}>
          <ul class={AGENT_REDIRECTS}>
            {/* by position:  redirects only ever append */}
            <For each={agent().redirects} keyed={false}>
              {(said) => (
                <li>
                  <span class={AGENT_SAID}>
                    <span>
                      <ui-icon name="comment" />
                    </span>
                    <b>{this.translationForKey("agentYou")}</b> · {clockOf(said().at)} ·{" "}
                    {said().told
                      ? this.translationForKey("agentTold", { time: clockOf(said().told) })
                      : this.translationForKey("agentWaiting")}
                  </span>
                  <span class={AGENT_SAID_NOTE}>{said().note}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <div class={AGENT_REDIRECT}>
          <epic-text-box
            ref={(element: HTMLElement) => (redirect.note = element as DOMTextBoxElement)}
            class={AGENT_NOTE}
            type="note"
            max-height="40vh"
            placeholder={this.translationForKey("agentNote", { name })}
            label={this.translationForKey("agentNoteLabel", { name })}
            onInput={() => redirect.typed()}
            onKeyDown={(event: KeyboardEvent) => redirect.onKey(event)}
          />
          <ui-button
            class={AGENT_SEND}
            appearance="circular"
            color="blue"
            icon="paper plane"
            disabled={redirect.canSend ? undefined : ""}
            loading={redirect.isSending ? "" : undefined}
            aria-label={this.translationForKey("agentSend", { name })}
            title={this.translationForKey("agentSendTip", { name })}
            onClick={() => redirect.sendNote()}
          />
        </div>
        <Show when={redirect.error}>
          <p class={AGENT_ERROR} role="alert">
            {redirect.error}
          </p>
        </Show>
      </div>
    )
  }

  /** A row's note box:  for its agent, keyed by name, read once as the row is made. */
  @E.untracked
  private redirectFor(agent: () => RunningAgent): Redirect {
    return new Redirect(agent().name, this.client!)
  }

  /** An age's tooltip:  when it started;  none when unknown. */
  private startedTip(agent: RunningAgent): string | undefined {
    const time = clockOf(agent.started)
    return time ? this.translationForKey("agentStarted", { time }) : undefined
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicAgents extends E.AttributeValues<typeof epicAgentsVocabulary> {}

/****************
 * ### `Redirect`
 * One agent's note box, as its row draws it:  what can be sent, a send on its way, and why the last one failed.
 * - Send, or Cmd / Ctrl + Enter:  `POST redirect`
 *   - sent:  the box empties (unless typed on meanwhile)
 *   - failed:  the error shows under it, as a sentence
 * - MUST be created under the row's owner:  its members are signals
 ****************/
class Redirect {
  /** Something is typed:  Send is on. */
  @E.state accessor canSend = false

  /** A redirect on its way:  Send spins. */
  @E.state accessor isSending = false

  /** Why the last one failed, as a sentence;  `""` for none. */
  @E.state accessor error = ""

  /** The note box (an `<epic-text-box>`), as drawn. */
  note: DOMTextBoxElement | undefined

  /** A redirect on its way:  a second Send waits for it (a plain flag:  read right after it's set). */
  private busy = false

  /** `name`:  the row's agent, its key, the same for the row's life. */
  constructor(
    readonly name: string,
    private readonly client: AgentsClient
  ) {}

  /** A key typed:  Send on while there's something to send. */
  typed() {
    this.canSend = !!this.note!.value.trim()
  }

  /** Cmd / Ctrl + Enter in the box:  Send. */
  onKey(event: KeyboardEvent) {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return
    event.preventDefault()
    this.sendNote()
  }

  /** Send, clicked or keyed. */
  sendNote() {
    void this.send().catch((failure: unknown) => console.error("EpicAgents:  couldn't send", failure))
  }

  /**
   * Send the box's note to the agent.
   * - in the list:  the box empties (unless typed on meanwhile)
   * - failed:  the error shows under it
   * - does nothing for an empty box, or while one is on its way
   */
  private async send() {
    const note = this.note!
    const typed = note.value.trim()
    if (!typed || this.busy) return
    this.busy = true
    this.isSending = true
    this.error = ""
    try {
      await this.client.redirect(this.name, typed)
      if (note.value.trim() === typed) note.value = ""
    } catch (failure) {
      this.error = sentence((failure as Error).message)
    } finally {
      this.busy = false
      this.isSending = false
      this.canSend = !!note.value.trim()
    }
  }
}

/** An agent's status label colour:  `active` blue, `blocked on <name>` orange, anything else grey. */
function statusColorOf(status: string): "blue" | "orange" | "grey" {
  return status === "active" ? "blue" : /^blocked\b/.test(status) ? "orange" : "grey"
}

/** Classes of the shadow markup:  its tools, the session's line and its tooltip, the agents' button and popover, each agent's row. */
const TOOLS = "tools"
const DOING = "doing"
const DOING_PILL = "doing-pill"
const SPINNER = "spinner"
const BARE = "bare"
const DOING_TIP = "doing-tip"
const TIP_HEAD = "tip-head"
const TIP_ITEMS = "tip-items"
const TIP_CHIP = "tip-chip"
const WORDS = "words"
const COUNT = "count"
const ROBOT = "robot"
const AGENTS_BUTTON = "agents-button"
const AGENTS_POP = "agents-pop"
const AGENTS_LIST = "agents-list"
const AGENT = "agent"
const AGENT_LINE = "agent-line"
const AGENT_NAME = "agent-name"
const AGENT_AGE = "agent-age"
const AGENT_TASK = "agent-task"
const AGENT_REDIRECTS = "agent-redirects"
const AGENT_SAID = "agent-said"
const AGENT_SAID_NOTE = "agent-said-note"
const AGENT_REDIRECT = "agent-redirect"
const AGENT_NOTE = "agent-note"
const AGENT_SEND = "agent-send"
const AGENT_ERROR = "agent-error"
