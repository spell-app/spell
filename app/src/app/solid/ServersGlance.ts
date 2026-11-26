import { createSignal } from "solid-js"

import { KnownFormat, LoadableFile } from "spell/util"
import { every } from "spell/util/timing"
import { SPACES } from "spell/app/spaces"
import type { AppTextKey } from "spell/app/app/ui/AppTexts.en"

/****************
 * ### `ServersGlance`
 * This machine's servers at a glance, for Help › Servers (epic `editor` T185):  are they all up, and where is the
 * Servers page.
 * - Asks the editor's own page server (`GET SPACES.KEEPER_GLANCE_API`), which reads the server keeper's record:
 *   the page never guesses the keeper's port.
 * - Asks while something follows it (`follow()`:  the menu item, as long as it's drawn), every `LOOK_SECONDS` while
 *   the tab shows, and at once when the tab shows again;  the keeper itself looks every 10 seconds.
 * - Plain Solid state, no element:  the item and its dialog read it.
 * - NEVER in the static build:  it has no page server, and its Servers item draws nothing (`HIDDEN_IN_STATIC_BUILD`).
 ****************/
export class ServersGlance {
  /** This machine's servers, as last asked;  `undefined` until the first answer. */
  static get current(): SPACES.KeeperGlance | undefined {
    return glance()
  }

  /** The Spell Servers page, on the keeper's own port;  none:  no keeper runs here, so there's no Servers item. */
  static get page(): string | undefined {
    return glance()?.page
  }

  /** How they stand, in the item's words:  all running, how many aren't, or that the keeper didn't say. */
  static get words(): { key: AppTextKey; count?: number } {
    const { servers, down } = glance() ?? {}
    if (servers === undefined || down === undefined) return { key: "serversUnknown" }
    if (!down) return { key: "serversAllRunning" }
    return down === 1 ? { key: "serversOneDown" } : { key: "serversSomeDown", count: down }
  }

  /** The item's dot:  green while all run, red while one is down, grey while the keeper doesn't say. */
  static get color(): "green" | "red" | "grey" {
    const { servers, down } = glance() ?? {}
    if (servers === undefined || down === undefined) return "grey"
    return down ? "red" : "green"
  }

  /**
   * Keep asking while the caller follows:  asks at once, then on its clock;  returns the function that stops following.
   * - One clock for every follower:  it stops when the last one does.
   */
  static follow(): () => void {
    if (followers++ === 0) startLooking()
    let following = true
    return () => {
      if (!following) return
      following = false
      if (--followers === 0) stopLooking?.()
    }
  }

  /**
   * Ask now, and keep the answer.
   * - NEVER throws:  a page server that can't be asked leaves the last answer, logged.
   */
  static async refresh(): Promise<void> {
    try {
      // a page server without the app's routes (404):  no keeper to show, as when none runs
      setGlance(
        await LoadableFile.fetch<SPACES.KeeperGlance>({
          url: SPACES.KEEPER_GLANCE_API,
          format: KnownFormat.json,
          defaultContents: {}
        })
      )
    } catch (error) {
      console.error("ServersGlance.refresh():  couldn't ask the page server how the servers stand", error)
    }
  }
}

/** The last answer. */
const [glance, setGlance] = createSignal<SPACES.KeeperGlance | undefined>(undefined)

/** How many are following (`ServersGlance.follow()`). */
let followers = 0

/** Stops the clock, while one runs. */
let stopLooking: (() => void) | undefined

/** How often to ask while the tab shows:  as often as the keeper looks. */
const LOOK_SECONDS = 10

/** Ask now, then every `LOOK_SECONDS` while the tab shows, and once more each time it shows again. */
function startLooking() {
  const ask = () => {
    if (document.visibilityState === "visible") void ServersGlance.refresh()
  }
  ask()
  const stopClock = every(LOOK_SECONDS, ask)
  document.addEventListener("visibilitychange", ask)
  stopLooking = () => {
    stopClock()
    document.removeEventListener("visibilitychange", ask)
    stopLooking = undefined
  }
}
