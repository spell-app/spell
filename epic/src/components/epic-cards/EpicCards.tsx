import { For, Show, createMemo } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "@spell-app/ui/core"
import { epicStateFor } from "$/epics/list/EpicState"

import { epicCardsVocabulary } from "./EpicCards.en"
import { EPIC_FILE, SAGA_EPICS_API, type CardsProblem, type SagaEpic, type SagaEpicsAnswer } from "./EpicCards.types"

import cardsCSS from "./EpicCards.css?inline"

/****************
 * ### `EpicCards`
 * The component behind `<epic-cards>`:  a saga page's Epics (epic `epic-workflow` P15) --
 * a card for each epic whose page names the saga, grouped by state as on the Epics page.
 * - THE EPICS PAGE'S OWN CARDS (epic `epic-engine` I39):  an `<epic-list no-favorites>` of `<epic-card>`s, drawn in
 *   its shadow root, so an epic looks and behaves the same on both pages (its mark, star, saga label, date)
 * - DRAWN FROM DATA, never a copy in the page:  the page server answers `GET /api/epics/saga?saga=<id>`
 *   (`$/epics/tool/SagaEpics`), reading every epic page's `<epic-page saga>` as it's asked
 *   - asked again whenever an epic page changes (`spell-server:file`):  an epic that joins the saga, finishes a phase
 *     or leaves shows at once
 * - each epic's state and group by the ONE rule the Epics page uses (`$/epics/list/EpicState`, `<epic-list>`):
 *   Active, Planning, Urgent, Done (no Favorites:  Owen's own list, on the Epics page);  an empty group isn't drawn;
 *   by title within each
 * - each card:  the state's mark (its why the tooltip), the linked title (its epic page, in that epic's tab), the
 *   epic's summary, and a meta line:  its state, phases done of all, the phase under way;  its star and last-worked day
 * - no cards:  a note says why -- no epic names the saga yet, the page opened from disk, or no answer
 * - SIDE EFFECT:  asks the page server while connected, and listens for its file changes
 ****************/
export class EpicCards extends E.UIComponent<typeof epicCardsVocabulary> {
  @E.proto static vocabulary = epicCardsVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-cards": cardsCSS },
    // a list of links:  a click on a card's words must not jump to its first link
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## State
  ////////////////

  /** The epics serving the saga, as last answered;  `undefined` until the first answer. */
  @E.state accessor epics: SagaEpic[] | undefined = undefined

  /** Why no cards show, when that's known:  opened from disk, or no answer. */
  @E.state accessor problem: CardsProblem | undefined = undefined

  /** A question to the page server is on its way:  a file change meanwhile asks again once it's back. */
  private isAsking = false

  /** A file changed while asking:  ask again once the answer is in. */
  private isStale = false

  ////////////////
  // ## Derived state
  ////////////////

  /** Why the note shows instead of cards;  `undefined` while there are cards, or before the first answer. */
  readonly note = createMemo((): CardsProblem | undefined => {
    if (this.problem) return this.problem
    return this.epics && !this.epics.length ? "none" : undefined
  })

  ////////////////
  // ## Asking the page server
  ////////////////

  /** Ask while connected, and again whenever an epic page changes. */
  @E.whileConnected
  protected followEpics() {
    if (isServer) return undefined
    if (location.protocol === "file:") {
      this.problem = "file"
      return undefined
    }
    void this.load()
    const onFile = (event: Event) => {
      const path = (event as CustomEvent<{ path: string }>).detail?.path ?? ""
      if (EPIC_FILE.test(path)) void this.load()
    }
    addEventListener("spell-server:file", onFile)
    return () => removeEventListener("spell-server:file", onFile)
  }

  /**
   * Ask the page server for the saga's epics;  one question at a time, a change meanwhile asking once more.
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
      const answer = await fetch(`${SAGA_EPICS_API}?saga=${encodeURIComponent(this.saga ?? "")}`)
      if (!answer.ok) throw new Error(`${answer.status}`)
      const { epics } = (await answer.json()) as SagaEpicsAnswer
      this.epics = Array.isArray(epics) ? epics : []
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
      <div
        class={this.rootClass}
        part={this.partForName("base")}
        role="region"
        aria-label={this.translationForKey("label")}
      >
        <Show when={this.note()}>
          {(note) => (
            <p class={NOTE} part={this.partForName("note")}>
              {this.translationForKey(note(), { saga: this.saga ?? "" })}
            </p>
          )}
        </Show>
        <Show when={this.epics?.length}>
          <epic-list part={this.partForName("list")} no-favorites="">
            <For each={this.epics ?? []} keyed={(epic) => epic.name}>
              {(epic) => this.card(epic)}
            </For>
          </epic-list>
        </Show>
      </div>
    )
  }

  /**
   * One epic's `<epic-card>`, as `epicCardHtml()` writes the Epics page's:  its facts as attributes;  its title
   * linking its epic page (in that epic's tab), its summary and its meta line as children.
   * - `epic`:  the epic as last answered, read where it's drawn, so a new answer redraws the card in place
   */
  private card(epic: () => SagaEpic): JSX.Element {
    const facts = () => epic().facts
    const flag = (on: boolean | undefined) => (on ? "" : undefined)
    return (
      <epic-card
        epic={epic().name}
        data-status={epicStateFor(facts()).name === "done" ? "done" : "open"}
        phases={facts().phases.join(" ")}
        updated={facts().updated ?? undefined}
        urgent={facts().urgent?.length ? facts().urgent!.join(" ") : undefined}
        future={flag(facts().future)}
        standing={flag(facts().standing)}
        active={facts().active}
        worked={epic().worked}
        favorite={flag(epic().favorite)}
      >
        <a href={epic().href} target={epic().name}>
          {epic().title}
        </a>
        <Show when={epic().summary}>
          <span slot="description">{epic().summary}</span>
        </Show>
        <span slot="meta">{this.metaOf(epic())}</span>
      </epic-card>
    )
  }

  /** A card's meta line:  `in progress · 6/8 phases · P8 · Review Polish`, each part only when it has something. */
  private metaOf(epic: SagaEpic): string {
    const state = epicStateFor(epic.facts)
    const phases = state.count ? this.translationForKey("phases", { count: state.count }) : ""
    return [state.words, phases, epic.facts.active ?? ""].filter(Boolean).join(" · ")
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicCards extends E.AttributeValues<typeof epicCardsVocabulary> {}

/** Classes of what it draws. */
const NOTE = "note"
