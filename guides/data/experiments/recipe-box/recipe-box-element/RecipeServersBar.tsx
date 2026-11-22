import type { JSX } from "@solidjs/web"
import { Show } from "solid-js"

import { pollWhileVisible } from "spell/util/polling"
import { E } from "spell/ui/core"

import { recipeServersBarVocabulary } from "./RecipeServersBar.en"

import recipeServersBarCSS from "./RecipeServersBar.css?inline"

/** Where the page server answers about them (`recipeServersRoutes.ts`). */
const API = "/api/recipe-servers"

/** How often it asks where they stand, in seconds. */
const POLL_SECONDS = 3

/** The frames that need them:  not this device. */
const THEIR_FRAMES = "iframe[src*='recipe-box-frame']:not([src*='back-end=device'])"

/** What the page server says about them. */
type ServersStatus = {
  /** Running, stopped, or their port's held by something else. */
  state: "running" | "stopped" | "taken"
  /** Their port. */
  port: number
  /** The checkout these buttons run them from. */
  checkout: string
  /** Where the running ones were started from. */
  runningFrom?: string
  /** The CSV file. */
  csvFile: string
  /** The folder. */
  folder: string
}

/** What a button can ask for. */
type ServersAction = "start" | "stop" | "restart"

/****************
 * ### `RecipeServersBar`
 * The component behind `<recipe-servers-bar>`:  whether the recipe box demo's servers are running, on the demo's page.
 * - Asks the page server this page came from, which runs one fixed command:  the page names nothing to run.
 * - A page server started before that route existed answers 404, and the bar says so, with the command to run instead.
 * - After a start or restart it reloads each frame that needs them, so they start from the new recipes.
 * - A GUIDE-ONLY element:  built into `recipe-box.bundle.js`, as `<recipe-box>` is.
 ****************/
export class RecipeServersBar extends E.UIComponent<typeof recipeServersBarVocabulary> {
  @E.proto static vocabulary = recipeServersBarVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { recipeServersBar: recipeServersBarCSS }
  } satisfies Partial<E.ElementSetup>

  /** Where they stand, once the page server's said. */
  @E.state accessor status: ServersStatus | undefined
  /** Has this page server no such route? */
  @E.state accessor needsRestart = false
  /** Is a button's press under way? */
  @E.state accessor isBusy = false
  /** Why the last press failed. */
  @E.state accessor failure = ""

  /** Ask now, and every few seconds while the page shows. */
  @E.whileConnected
  protected startAsking() {
    void this.ask()
    return pollWhileVisible(POLL_SECONDS, () => this.ask())
  }

  /** Where do they stand?  - NEVER throws:  the page server being away just leaves it as it was */
  private async ask(): Promise<void> {
    try {
      const response = await fetch(API)
      this.needsRestart = response.status === 404
      if (response.ok && !this.isBusy) this.status = (await response.json()) as ServersStatus
    } catch (error) {
      console.error("RecipeServersBar:  couldn't ask the page server", error)
    }
  }

  /** Press a button:  then the frames that need them read from what's there now. */
  private async press(action: ServersAction): Promise<void> {
    this.isBusy = true
    this.failure = ""
    try {
      const token = (window as Window & { SPELL_SERVER?: { token?: string } }).SPELL_SERVER?.token ?? ""
      const response = await fetch(`${API}/${action}`, { method: "POST", headers: { "x-server-token": token } })
      const answer = (await response.json()) as ServersStatus & { error?: string }
      if (!response.ok) throw new Error(answer.error ?? response.statusText)
      this.status = answer
      if (action !== "stop") this.reloadFrames()
    } catch (error) {
      this.failure = (error as Error).message
    } finally {
      this.isBusy = false
    }
  }

  /** Each frame that needs them, again from the start. */
  private reloadFrames(): void {
    for (const frame of document.querySelectorAll<HTMLIFrameElement>(THEIR_FRAMES)) {
      frame.contentWindow?.location.reload()
    }
  }

  /** What to say about them. */
  private get saying(): string {
    if (this.needsRestart) return this.translationForKey("needs-restart")
    const { status } = this
    if (!status) return this.translationForKey("checking")
    if (status.state === "taken") return this.translationForKey("taken", { port: `${status.port}` })
    if (status.state === "stopped") return this.translationForKey("stopped")
    const { runningFrom, checkout } = status
    return runningFrom && runningFrom !== checkout
      ? this.translationForKey("running-from", { folder: runningFrom })
      : this.translationForKey("running")
  }

  render(): JSX.Element {
    return (
      <div class="bar">
        <ui-label size="small" color={this.status?.state === "running" && !this.needsRestart ? "green" : "yellow"}>
          {this.status?.port ?? 4791}
        </ui-label>
        <span part={this.partForName("status")}>{this.failure || this.saying}</span>
        <Show when={!this.needsRestart}>
          <ui-button
            size="small"
            appearance="basic"
            disabled={this.isBusy || this.status?.state !== "stopped"}
            title={this.translationForKey("start-title", { checkout: this.status?.checkout ?? "" })}
            onClick={() => void this.press("start")}
          >
            {this.translationForKey("start")}
          </ui-button>
          <ui-button
            size="small"
            appearance="basic"
            disabled={this.isBusy || this.status?.state !== "running"}
            title={this.translationForKey("stop-title")}
            onClick={() => void this.press("stop")}
          >
            {this.translationForKey("stop")}
          </ui-button>
          <ui-button
            size="small"
            appearance="basic"
            disabled={this.isBusy || this.status?.state === "taken" || !this.status}
            title={this.translationForKey("restart-title")}
            onClick={() => void this.press("restart")}
          >
            {this.translationForKey("restart")}
          </ui-button>
          <Show when={this.status}>
            {(status) => (
              <small class="where">
                {this.translationForKey("where", { csvFile: status().csvFile, folder: status().folder })}
              </small>
            )}
          </Show>
        </Show>
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed. */
export interface RecipeServersBar extends E.AttributeValues<typeof recipeServersBarVocabulary> {}
