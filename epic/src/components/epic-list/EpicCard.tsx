import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI } from "spell/ui/core"

import { PlanDates } from "spell/epic/dates"
import { readEpicDate } from "spell/epic/list/EpicCards"
import { epicStateFor, type EpicState } from "spell/epic/list/EpicState"
import { ServerLink } from "spell/epic/review"

import { epicCardVocabulary } from "./EpicCard.en"
import {
  CARD_ACTIONS,
  FAVORITE_API,
  MANAGE_API,
  cardFactsOf,
  shortDay,
  type CardAction,
  type EpicManageFacts,
  type FavoriteDetail
} from "./EpicList.types"

import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"
import cardCSS from "./EpicCard.css?inline"

/****************
 * ### `<epic-card>`
 * One epic's card on the Epics page (epic `epic-engine` P3), drawn from its attributes:
 * - a Spell UI card (`<ui-card>`):  its state's mark, then its title (the link it holds), its description, its
 *   saga's label (the saga's purpose its tooltip) and its meta line
 * - its STATE by the ONE rule every list and page draws it by (`spell/epic/list/EpicState`), as of now:
 *   in progress (`3/6`, blue), errors, paused, future, done;  why, the mark's tooltip
 * - the STAR at its top right (Owen, 2026-10-10:  "make it yellow"):  a click stars or unstars it at once
 *   (`favorite`, which its list groups by), then on the page server (`POST /api/epics/favorite`);
 *   refused:  back as it was, and a toast says why
 *   - its answer, every starred epic, goes to its list (`epic-starred`):  another window may have starred one
 *   - only served with a write token:  from `file://`, the star shows, disabled, saying why
 * - the `...` MENU at its top right, the star just left of it (epic `epic-engine` T103;  Owen:  "on the epic home page
 *   cards, add a `...` menu in the TR corner, with Resume, Rename Epic..., Complete, Delete Epic..."):  Spell UI's
 *   dropdown, as an epic page's gears are (`EpicFold.gearMenu()`), each entry asking the page server
 *   (`MANAGE_API`, `EpicLifecycle`)
 *   - Resume:  its session in its own VS Code window, as `/epic resume <name>` from another window;  not on a done epic
 *   - Rename Epic...:  a dialog asking the new name;  Complete:  a dialog saying what it closes;  not on a done epic
 *   - Delete Epic...:  a dialog saying how to get it back
 *   - each asks the server first what it would refuse (a worktree, a branch not merged, the tooling home):  a dialog
 *     says why, and nothing is asked
 *   - the dialogs are Spell UI's (`UI.modals`), its family loaded the first time (`UI.modals.ready()`):  a close ✕ and
 *     Escape cancel
 *   - only served with a write token, as the star
 * - the day it was last worked on at its bottom right, no year (`10/9`), the full date and time its tooltip
 * - SIDE EFFECT:  a star click sets its own `favorite` attribute;  posts to the page server;  so does each menu entry
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

  /** A menu entry is asking the page server:  another meanwhile does nothing. */
  @E.state accessor isActing = false

  ////////////////
  // ## Derived state
  ////////////////

  /** Its state, from its attributes, as of now. */
  get state(): EpicState {
    return epicStateFor(cardFactsOf(this))
  }

  /** Can its star star it:  served by the page server with a write token, never from `file://`. */
  get canStar(): boolean {
    return !isServer && ServerLink.isServed()
  }

  /** Where its "While you were out" mark goes:  its epic page's section (`#away`), by its title's link. */
  private get awayLink(): string | undefined {
    const href = this.domElement.querySelector(":scope > a[href]")?.getAttribute("href")
    return href ? `${href.replace(/#.*$/, "")}#away` : undefined
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
                appearance="basic"
                icon="bullseye"
                title={this.sagaPurpose ?? ""}
              >
                {this.sagaTitle || this.saga}
              </ui-label>
            </Show>
            <Show when={this.away}>
              <ui-label
                class={AWAY}
                part={this.partForName("away")}
                size="mini"
                color="red"
                appearance="basic"
                icon="bed"
                link={this.awayLink}
                title={this.translationForKey("awayTip")}
              >
                {this.translationForKey("away")}
              </ui-label>
            </Show>
            <ui-meta class={META}>
              <slot name={this.slotForName("meta")} />
            </ui-meta>
          </ui-content>
        </ui-card>
        {this.star()}
        {this.menu()}
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
          appearance="basic"
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
        appearance="tertiary"
        size="small"
        icon={this.favorite ? "star" : "star outline"}
        title={tip()}
        aria-label={this.translationForKey(this.favorite ? "unstar" : "star", { epic: epic() })}
        disabled={this.canStar ? undefined : ""}
        onClick={this.onStar}
      />
    )
  }

  /** The `...` menu:  its entries, a done epic's without Resume and Complete;  disabled where it can't act. */
  private menu(): JSX.Element {
    const title = () =>
      this.canStar ? this.translationForKey("menu", { epic: this.epic ?? "" }) : this.translationForKey("menuOffline")
    const entries = () => CARD_ACTIONS.filter((action) => this.state.name !== "done" || !DONE_HIDES.includes(action))
    return (
      <ui-dropdown
        class={MENU}
        part={this.partForName("menu")}
        direction="left"
        title={title()}
        aria-label={title()}
        disabled={this.canStar && !this.isActing ? undefined : ""}
        on-ui-changed={this.onMenuPick}
      >
        <ui-button
          slot="trigger"
          appearance="circular basic"
          size="mini"
          icon="ellipsis"
          tabindex="-1"
          aria-label={title()}
        />
        {/* no caret:  the dots say it's a menu */}
        <span slot="icon" />
        <For each={entries()}>
          {(action) => (
            <ui-item value={action} icon={ACTION_ICONS[action]}>
              {this.translationForKey(action)}
            </ui-item>
          )}
        </For>
      </ui-dropdown>
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
      this.send("epic-starred", { epic, favorite, favorites } satisfies FavoriteDetail)
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
    if (!E.DOMElement.isAttached("ui-toast")) return console.error(message)
    UI.toast({ message, type: "error" })
  }

  ////////////////
  // ## The menu
  ////////////////

  /** A menu entry picked:  its action, and the dropdown lets go of its value, to pick again. */
  @E.untracked
  private readonly onMenuPick = (event: CustomEvent<{ value: string | string[] }>) => {
    const action = String(event.detail.value) as CardAction
    const dropdown = event.currentTarget as HTMLElement & { value: string }
    // picked again next time:  a dropdown tells only of a new value
    E.afterSolidUpdate(() => (dropdown.value = ""))
    if (!CARD_ACTIONS.includes(action) || this.isActing || !this.canStar) return
    void this.act(action)
  }

  /** Do `action` to its epic:  ask the page server, with a dialog first where it needs one.  NEVER throws. */
  @E.untracked
  private async act(action: CardAction) {
    const epic = this.epic ?? ""
    const link = new ServerLink(ServerLink.pageOptions())
    this.isActing = true
    try {
      if (action === "resume") {
        await link.post(`${MANAGE_API}/resume`, { name: epic })
        return await this.say(this.translationForKey("resumed", { epic }))
      }
      const facts = await link.get<EpicManageFacts>(MANAGE_API, { query: { epic } })
      if (!facts) throw new Error(`no epic called ${epic}`)
      await UI.modals.ready()
      if (action === "rename") await this.rename(link, facts)
      else if (action === "complete") await this.complete(link, facts)
      else await this.remove(link, facts)
    } catch (error) {
      await this.say(this.translationForKey(`${action}Failed`, { epic, error: (error as Error).message }), "error")
    } finally {
      this.isActing = false
    }
  }

  /** Rename:  why not, else the new name asked, then the server;  the page follows by itself (reindexed). */
  private async rename(link: ServerLink, facts: EpicManageFacts) {
    const { epic } = facts
    if (facts.blocked) return this.refuse(this.translationForKey("cantRename", { epic }), facts.blocked)
    const to = await UI.modals.prompt({
      title: this.translationForKey("renameTitle", { epic }),
      message: this.translationForKey("renameAsk"),
      value: epic,
      okText: this.translationForKey("renameOk"),
      cancelText: this.translationForKey("cancel")
    })
    if (!to?.trim() || to.trim() === epic) return
    await link.post(`${MANAGE_API}/rename`, { name: epic, to: to.trim() })
    await this.say(this.translationForKey("renamed", { epic, to: to.trim() }))
  }

  /** Complete:  what it closes said first, then the server. */
  private async complete(link: ServerLink, facts: EpicManageFacts) {
    const { epic } = facts
    if (!facts.phases)
      return this.refuse(this.translationForKey("cantComplete", { epic }), this.translationForKey("noPhases"))
    const lines = [
      this.translationForKey("completeAsk", { epic }),
      this.counted(facts.phasesLeft, "completePhase", "completePhases"),
      this.counted(facts.needsYou.length, "completeItem", "completeItems")
    ]
    const isSure = await UI.modals.confirm({
      title: this.translationForKey("completeTitle", { epic }),
      message: lines.filter(Boolean).join("\n"),
      okText: this.translationForKey("completeOk"),
      cancelText: this.translationForKey("cancel")
    })
    if (!isSure) return
    await link.post(`${MANAGE_API}/complete`, { name: epic })
    await this.say(this.translationForKey("completed", { epic }))
  }

  /** Delete:  why not, else how to get it back said first, then the server. */
  private async remove(link: ServerLink, facts: EpicManageFacts) {
    const { epic } = facts
    const why = facts.home ? this.translationForKey("isHome", { epic }) : facts.blocked
    if (why) return this.refuse(this.translationForKey("cantDelete", { epic }), why)
    const isSure = await UI.modals.confirm({
      title: this.translationForKey("deleteTitle", { epic }),
      message: this.translationForKey("deleteAsk", { epic }),
      okText: this.translationForKey("deleteOk"),
      okColor: "negative",
      cancelText: this.translationForKey("cancel")
    })
    if (!isSure) return
    await link.post(`${MANAGE_API}/delete`, { name: epic })
    await this.say(this.translationForKey("deleted", { epic }))
  }

  /** `count` in words:  `one`'s text for 1, `many`'s for more, `""` for none. */
  private counted(count: number, one: "completePhase" | "completeItem", many: "completePhases" | "completeItems") {
    if (!count) return ""
    return count === 1 ? this.translationForKey(one) : this.translationForKey(many, { count: String(count) })
  }

  /** Why it can't, in a dialog of one button. */
  private refuse(title: string, message: string): Promise<void> {
    return UI.modals.alert({ title, message, okText: this.translationForKey("ok") })
  }

  /** A toast saying `message`;  the console where toasts can't show. */
  private async say(message: string, type: "success" | "error" = "success") {
    try {
      await UI.toasts.ready()
      UI.toast({ message, type })
    } catch {
      console[type === "error" ? "error" : "log"](message)
    }
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicCard extends E.AttributeValues<typeof epicCardVocabulary> {}

/** Classes of what it draws. */
const HEADER = "header"
const MARK = "mark"
const SAGA = "saga"
/** Class of the "While you were out" mark (`away`, epic `epic-engine` P62). */
const AWAY = "away"
const META = "meta"
const STAR = "star"
const MENU = "menu"

/** Each menu entry's icon, an icon of the docs bundle's `ICONS`. */
const ACTION_ICONS: Record<CardAction, string> = {
  resume: "circle play",
  rename: "pen",
  complete: "circle check",
  delete: "trash can"
}

/** The entries a done epic leaves out:  nothing to resume or complete. */
const DONE_HIDES: readonly CardAction[] = ["resume", "complete"]
const WORKED = "worked"
