import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI } from "$/ui/core"

import { PlanDates } from "$/epics/dates"
import { readEpicDate } from "$/epics/list/EpicCards"
import { epicStateFor, type EpicState } from "$/epics/list/EpicState"
import { ServerLink } from "$/epics/review"

import { epicCardVocabulary } from "./EpicCard.en"
import { FAVORITE_API, cardFactsOf, shortDay, type FavoriteDetail } from "./EpicList.types"

import tooltipCSS from "$/epics/components/epic-item/Tooltip.css?inline"
import cardCSS from "./EpicCard.css?inline"

/****************
 * ### `<epic-card>`
 * One epic's card on the Epics page (epic `epic-engine` P3), drawn from its attributes:
 * - a Spell UI card (`<ui-card>`):  its state's mark, then its title (the link it holds), its description, its
 *   saga's label (the saga's purpose its tooltip) and its meta line
 * - its STATE by the ONE rule every list and page draws it by (`$/epics/list/EpicState`), as of now:
 *   in progress (`3/6`, blue), errors, paused, future, done;  why, the mark's tooltip
 * - the STAR at its top right (Owen, 2026-10-10:  "make it yellow"):  a click stars or unstars it at once
 *   (`favorite`, which its list groups by), then on the page server (`POST /api/epics/favorite`);
 *   refused:  back as it was, and a toast says why
 *   - its answer, every starred epic, goes to its list (`epic-favorite`):  another window may have starred one
 *   - only served with a write token:  from `file://`, the star shows, disabled, saying why
 * - the day it was last worked on at its bottom right, no year (`10/9`), the full date and time its tooltip
 * - SIDE EFFECT:  a star click sets its own `favorite` attribute;  posts to the page server
 ****************/
export class EpicCard extends E.UIComponent<typeof epicCardVocabulary> {
  @E.proto static vocabulary = epicCardVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-card": cardCSS },
    // a card of links:  a click on its words must not jump to its first link
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Which of its slots have content:  its description's. */
  readonly slots = new E.SlotContent(this.domElement)

  /** Its star is on its way to the page server:  a second click meanwhile does nothing. */
  @E.state accessor isStarring = false

  ////////////////
  // ## Derived state
  ////////////////

  /** Its state, from its attributes, as of now. */
  get state(): EpicState {
    return epicStateFor(cardFactsOf(this))
  }

  /** Can its star star it:  served by the page server with a write token, never from `file://`. */
  get canStar(): boolean {
    if (isServer) return false
    const server = (window as { SPELL_SERVER?: { token?: string } }).SPELL_SERVER
    return !!server?.token && location.protocol !== "file:"
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <>
        <ui-card class={this.rootClass} part={this.partForName("base")} fluid="">
          <ui-content>
            <ui-header class={HEADER}>
              {this.mark()} <slot />
            </ui-header>
            <Show when={this.slots.hasContent(this.slotForName("description"))}>
              <ui-description>
                <slot name={this.slotForName("description")} />
              </ui-description>
            </Show>
            <Show when={this.saga}>
              <ui-label
                class={SAGA}
                part={this.partForName("saga")}
                size="mini"
                basic=""
                icon="bullseye"
                title={this.sagaPurpose ?? ""}
              >
                {this.sagaTitle || this.saga}
              </ui-label>
            </Show>
            <ui-meta class={META}>
              <slot name={this.slotForName("meta")} />
            </ui-meta>
          </ui-content>
        </ui-card>
        {this.star()}
        <Show when={shortDay(this.worked)}>
          {(day) => (
            <time class={WORKED} part={this.partForName("worked")} datetime={this.worked} title={this.workedTip()}>
              {day()}
            </time>
          )}
        </Show>
      </>
    )
  }

  /**
   * Its state's mark before its title, its why the tooltip:
   * in progress, the phase count (`6/8`, or `planning`) in a small blue outlined label;  the rest, the state's icon
   * in its colour.
   */
  private mark(): JSX.Element {
    const state = () => this.state
    return (
      <Show
        when={state().name === "progress"}
        fallback={
          <ui-icon
            class={MARK}
            part={this.partForName("mark")}
            name={state().icon}
            color={state().color}
            title={state().tip}
          />
        }
      >
        <ui-label
          class={MARK}
          part={this.partForName("mark")}
          size="mini"
          color="blue"
          basic=""
          title={state().tip}
        >
          {state().count || this.translationForKey("planning")}
        </ui-label>
      </Show>
    )
  }

  /** The star:  solid and yellow when starred, else its outline;  disabled where it can't star. */
  private star(): JSX.Element {
    const epic = () => this.epic ?? ""
    const tip = () => {
      if (!this.canStar) return this.translationForKey("starOffline")
      return this.translationForKey(this.favorite ? "unstarTip" : "starTip")
    }
    return (
      <ui-button
        class={STAR}
        part={this.partForName("star")}
        tertiary=""
        size="small"
        icon={this.favorite ? "star" : "star outline"}
        title={tip()}
        aria-label={this.translationForKey(this.favorite ? "unstar" : "star", { epic: epic() })}
        disabled={this.canStar ? undefined : ""}
        onClick={this.onStar}
      />
    )
  }

  /** The day's tooltip:  its full date and time, as epic pages write dates (`10/9/26 14:34`). */
  private workedTip(): string {
    const date = readEpicDate(this.worked)
    return date ? this.translationForKey("worked", { date: PlanDates.formatDate(date) }) : ""
  }

  ////////////////
  // ## Behaviour
  ////////////////

  /**
   * The star, clicked:  star or unstar at once, then on the page server;  its answer to the list, or back as it was
   * and a toast.
   * - its own click only:  the card's link never fires
   */
  @E.untracked
  private readonly onStar = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!this.canStar || this.isStarring) return
    void this.setFavorite(!this.favorite)
  }

  /** Star (`favorite`) or unstar it:  its attribute at once, then the page server.  NEVER throws. */
  @E.untracked
  private async setFavorite(favorite: boolean) {
    const epic = this.epic ?? ""
    this.isStarring = true
    this.domElement.toggleAttribute("favorite", favorite)
    try {
      const answer = (await new ServerLink(ServerLink.pageOptions()).post(FAVORITE_API, { name: epic, favorite })) as {
        favorites?: unknown
      }
      const favorites = Array.isArray(answer.favorites) ? answer.favorites.map(String) : []
      this.send("epic-favorite", { epic, favorite, favorites } satisfies FavoriteDetail)
    } catch (error) {
      this.domElement.toggleAttribute("favorite", !favorite)
      this.toast(favorite ? "starFailed" : "unstarFailed", epic, (error as Error).message)
    } finally {
      this.isStarring = false
    }
  }

  /** A red toast saying the server refused;  the console where toasts aren't there. */
  private toast(key: "starFailed" | "unstarFailed", epic: string, error: string) {
    const message = this.translationForKey(key, { epic, error })
    if (!customElements.get("ui-toast")) return console.error(message)
    UI.toast({ message, type: "error", position: "bottom right", displayTime: 3000, showIcon: true })
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicCard extends E.AttributeValues<typeof epicCardVocabulary> {}

/** Classes of what it draws. */
const HEADER = "header"
const MARK = "mark"
const SAGA = "saga"
const META = "meta"
const STAR = "star"
const WORKED = "worked"
