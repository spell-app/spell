/**
 * Whether the page server is there, as the editor's live channel says (epic `editor` T177):
 * every merge into main restarts it, and an open editor lost its connection with nothing said.
 * - The live client says `spell-server:down` as its socket closes, `spell-server:up` as it opens again
 *   (spell/server's `liveClient()`, which the editor joins:  `joinLiveChannel()`).
 * - `whenBack()`:  what waits for it, e.g. an edit AutoSave couldn't keep while it was away (`editor.keepNow()`).
 * - `<ServerRestarting>` says so at the top of the page.
 * - Plain state, no Solid:  `editor.ts` reads it, and stays free of Solid;  `<ServerRestarting>` follows the same
 *   events itself.
 * - NEVER on in the static build:  it has no server, so no live channel says anything.
 */
export const ServerRestarts = {
  /** Is the page server away now:  its socket closed, and not open again yet? */
  get isDown(): boolean {
    return isDown
  },

  /** Resolves once the page server is back:  at once when it's there. */
  whenBack(): Promise<void> {
    if (!isDown) return Promise.resolve()
    return new Promise((resolve) => waiting.push(resolve))
  },

  /**
   * Is the page server away, or gone within `withinMsec`?  For a request that just failed:
   * its socket may close a moment after the request does.
   * - NEVER rejects
   */
  wentDown(withinMsec = WENT_DOWN_MSEC): Promise<boolean> {
    if (isDown) return Promise.resolve(true)
    return new Promise((resolve) => {
      const down = () => {
        clearTimeout(timer)
        resolve(true)
      }
      const timer = setTimeout(() => {
        removeEventListener("spell-server:down", down)
        resolve(isDown)
      }, withinMsec)
      addEventListener("spell-server:down", down, { once: true })
    })
  },

  /**
   * Follow the live channel's `spell-server:down` and `spell-server:up`, once for the page.
   * - SIDE EFFECT:  two listeners on `window`, for good
   */
  follow(): void {
    if (isFollowing) return
    isFollowing = true
    addEventListener("spell-server:down", () => (isDown = true))
    addEventListener("spell-server:up", () => {
      isDown = false
      for (const resolve of waiting.splice(0)) resolve()
    })
  }
}

/** The page server is away (`ServerRestarts.isDown`). */
let isDown = false
/** What waits for it to come back (`whenBack()`). */
const waiting: (() => void)[] = []
/** `follow()` has run. */
let isFollowing = false

/** How long after a failed request its socket may still close (`wentDown()`), in msec. */
const WENT_DOWN_MSEC = 2000
