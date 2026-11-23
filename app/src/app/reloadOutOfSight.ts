import { after } from "spell/util/timing"

/**
 * The dev server's socket closed while the editor's tab is out of sight (vite restarted, the Mac slept):  reload as
 * soon as the server answers, out of sight, not when the person comes back to the tab.
 * - Why:  vite's own client waits for the tab to show before it looks for the server, then reloads:  the person came
 *   back to a blank editor while it started again.  Reloaded out of sight, it has drawn by the time they're back
 *   (its parse and compile go on in a hidden tab:  `TaskList`'s `soonEvenHidden()`).
 * - The tab showing (before or while it looks):  left to vite's client, which reloads then, as ever.
 * - `hot`:  the editor's `import.meta.hot`;  none (a build), nothing to do.
 * - `isUp()`:  does the dev server answer?  (a test hands its own)
 * - SIDE EFFECT:  listens to `hot`'s `vite:ws:disconnect`;  reloads the page.
 */
export function reloadOutOfSight(
  hot: { on(event: "vite:ws:disconnect", listener: () => void): void } | undefined,
  {
    isUp = devServerAnswers,
    reload = () => location.reload()
  }: { isUp?: () => Promise<boolean>; reload?: () => void } = {}
): void {
  hot?.on("vite:ws:disconnect", () => void reloadOnceUp())

  async function reloadOnceUp() {
    while (document.visibilityState === "hidden") {
      if (await isUp()) return document.visibilityState === "hidden" ? reload() : undefined
      await after(LOOK_EVERY_SECONDS)
    }
  }
}

/** How often it looks for the dev server, out of sight. */
const LOOK_EVERY_SECONDS = 1

/** Does the dev server answer?  It serves vite's client;  a server down, or the network, is `false`. */
async function devServerAnswers(): Promise<boolean> {
  try {
    return (await fetch("/@vite/client", { cache: "no-store" })).ok
  } catch {
    return false
  }
}
