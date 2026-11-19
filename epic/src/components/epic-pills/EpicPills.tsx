import { For, Show, createMemo } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { epicGroupFor } from "spell/epic/list/EpicCards"
import { epicStateFor } from "spell/epic/list/EpicState"
import { ServerLink } from "spell/epic/review"

import { epicPillsVocabulary } from "./EpicPills.en"
import {
  PILLS_POLL_MS,
  PHASES_DONE,
  PILL_FILE,
  RECENT_DAYS,
  RUNNING_EPICS_API,
  kindsOf,
  phaseOf,
  splitGradient,
  type PillEpic
} from "./EpicPills.types"

import pillsCSS from "./EpicPills.css?inline"

/****************
 * ### `EpicPills`
 * The component behind `<epic-pills>`:  the docs home page's Active epics (epic `epic-engine` T99), under its Epic
 * Pages card's description -- a pill for each open epic worked on in the last week, in two columns.
 * - each pill links its epic page (in this tab), and shows:
 *   - the epic's name
 *   - what waits on it, in its epic page's toolbar badge colours:  red, orange (light orange with it), blue;
 *     one colour its count, several ONE circle split between them, as the toolbar's (I347)
 *   - its phase under way, `P12`, or `Done` when every phase is
 *   - its running agents, `🤖 2`, when any run
 *   - its tooltip says it all in words:  the counts, the phase's name, the agents
 * - DRAWN FROM DATA, never a copy in the page:  every epic, running or not, from the page server,
 *   `GET /api/epics/running?every` (`spell/epic/list/runningRoutes`, the Epics page's route module;
 *   `RunningEpics.everyEpic()`)
 *   - asked again whenever an epic page, a part of one or its agents' list changes (`spell-server:changed`), and
 *     every `PILLS_POLL_MS` while the page shows
 * - which epics:  the Epics page's Active group (`epicGroupFor()`), worked on in the last `RECENT_DAYS` days, A to Z
 *   (J276's list, which `epic pages index` wrote into the page until T99)
 * - no pills:  a note says why -- none this week, the page opened from disk, or no answer
 * - SIDE EFFECT:  asks the page server while connected, and listens for its file changes
 ****************/
export class EpicPills extends E.UIComponent<typeof epicPillsVocabulary> {
  @E.proto static vocabulary = epicPillsVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-pills": pillsCSS },
    // a list of links:  a click on the heading must not jump to its first link
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## State
  ////////////////

  /** Every epic, as last answered;  `undefined` until the first answer. */
  @E.state accessor epics: PillEpic[] | undefined = undefined

  /** Why no pills show, when that's known:  opened from disk, or no answer. */
  @E.state accessor problem: "file" | "server" | undefined = undefined

  /** A question to the page server is on its way:  a file change meanwhile asks again once it's back. */
  private isAsking = false

  /** A file changed while asking:  ask again once the answer is in. */
  private isStale = false

  ////////////////
  // ## Derived state
  ////////////////

  /** The epics that get a pill:  Active, worked on this week, A to Z by name. */
  readonly active = createMemo((): PillEpic[] => {
    const since = Date.now() - RECENT_DAYS * 86_400_000
    return (this.epics ?? [])
      .filter((epic) => epic.worked && Date.parse(epic.worked) >= since)
      .filter((epic) => epicGroupFor(epicStateFor(epic)) === "active")
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /** Why the note shows instead of pills;  `undefined` while there are pills, or before the first answer. */
  readonly note = createMemo((): "file" | "server" | "none" | undefined => {
    if (this.problem) return this.problem
    return this.epics && !this.active().length ? "none" : undefined
  })

  ////////////////
  // ## Asking the page server
  ////////////////

  /** Ask while connected, again whenever an epic page or its agents change, and every `PILLS_POLL_MS`. */
  @E.whileConnected
  protected followEpics() {
    if (isServer) return undefined
    if (!ServerLink.canRead()) {
      this.problem = "file"
      return undefined
    }
    void this.load()
    return ServerLink.watch(
      window,
      (path) => PILL_FILE.test(path),
      () => void this.load(),
      { every: PILLS_POLL_MS }
    )
  }

  /**
   * Ask the page server for every epic;  one question at a time, a change meanwhile asking once more.
   * - NEVER throws:  no answer is `problem: "server"`
   */
  @E.untracked
  private async load() {
    if (this.isAsking) {
      this.isStale = true
      return
    }
    this.isAsking = true
    try {
      const answer = await ServerLink.forPage().get<PillEpic[]>(RUNNING_EPICS_API, { query: { every: "" } })
      if (!Array.isArray(answer)) throw new Error("no such route")
      this.epics = answer
      this.problem = undefined
    } catch {
      this.problem = "server"
    } finally {
      this.isAsking = false
    }
    if (this.isStale) {
      this.isStale = false
      void this.load()
    }
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <div class={HEADING} part={this.partForName("heading")}>
          {this.translationForKey("heading")}
        </div>
        <Show when={this.note()}>
          {(note) => (
            <p class={NOTE} part={this.partForName("note")}>
              {this.translationForKey(note())}
            </p>
          )}
        </Show>
        <Show when={this.active().length}>
          <div class={PILLS} part={this.partForName("pills")}>
            <For each={this.active()} keyed={(epic) => epic.name}>
              {(epic) => this.pill(epic)}
            </For>
          </div>
        </Show>
      </div>
    )
  }

  /**
   * One epic's pill:  a Spell UI label linking its epic page, its name at the left, what waits, its phase and its
   * agents at the right.
   * - `epic`:  the epic as last answered, read where it's drawn, so a new answer redraws the pill in place
   */
  private pill(epic: () => PillEpic): JSX.Element {
    const phase = () => phaseOf(epic())
    return (
      <ui-label
        class={PILL}
        link={epic().url}
        target="_self"
        appearance="tinted"
        color="blue"
        size="small"
        title={this.tipOf(epic())}
      >
        <span class={NAME}>{epic().name}</span>
        <span class={FACTS}>
          {this.badges(epic)}
          <Show when={phase()}>
            {(shown) => (
              <span class={[PHASE, { done: shown() === PHASES_DONE }]}>
                {shown() === PHASES_DONE ? this.translationForKey("done") : shown()}
              </span>
            )}
          </Show>
          <Show when={epic().agents}>
            {(agents) => (
              <span class={AGENTS} aria-hidden="true">
                {/* a span around the icon:  `ui-icon`'s host is `display: contents`, which can't be placed */}
                <span class={ROBOT}>
                  <ui-icon name="robot" />
                </span>
                {agents()}
              </span>
            )}
          </Show>
        </span>
      </ui-label>
    )
  }

  /**
   * What waits on `epic`, as its epic page's toolbar draws it (`spell-doc-toolbar.js` `badgeLabels()`):
   * one colour, its count badge;  several, ONE circle split into a slice of each, no number;  none, nothing.
   */
  private badges(epic: () => PillEpic): JSX.Element {
    const kinds = () => kindsOf(epic().badges)
    return (
      <Show when={kinds().length}>
        <Show
          when={kinds().length === 1}
          fallback={
            <span class={[BADGE, SPLIT]} style={{ "--epic-pills-split": splitGradient(kinds()) }} aria-hidden="true" />
          }
        >
          <span class={[BADGE, kinds()[0]!]} aria-hidden="true">
            {epic().badges![kinds()[0]!]}
          </span>
        </Show>
      </Show>
    )
  }

  /**
   * A pill's tooltip, in words:  the epic's title, then what waits, its phase under way (or every phase done),
   * and its agents, each on its own line:
   * `Epic Engine` / `2 urgent · 1 running now` / `P76 · Staged Demo` / `2 agents running`.
   */
  private tipOf(epic: PillEpic): string {
    const badges = epic.badges
    const counts = kindsOf(badges).map((kind) => this.translationForKey(kind, { count: badges![kind] }))
    const phase = epic.active ?? (phaseOf(epic) === PHASES_DONE ? this.translationForKey("allDone") : "")
    const agents = epic.agents
      ? epic.agents === 1
        ? this.translationForKey("agentOne")
        : this.translationForKey("agentMany", { count: epic.agents })
      : ""
    return [epic.title, counts.join(" · "), phase, agents].filter(Boolean).join("\n")
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicPills extends E.AttributeValues<typeof epicPillsVocabulary> {}

/** Classes of what it draws. */
const HEADING = "heading"
const NOTE = "note"
const PILLS = "list"
const PILL = "pill"
const NAME = "name"
const FACTS = "facts"
const BADGE = "badge"
const SPLIT = "split"
const PHASE = "phase"
const AGENTS = "agents"
const ROBOT = "robot"
