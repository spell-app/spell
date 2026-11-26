import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { BUILD_STEP_PAGE_EVENT, type BuildStep } from "spell/app/spaces/models/buildSteps"
import { PageLoading } from "spell/app/app/solid/PageLoading"
import { stepsOnLoadingScreen } from "spell/app/app/solid/loadingSteps"

/**
 * The editor's loading screen, `#PageLoading` (`index.html`), and the step line it shows while a project it opens
 * waits on a build (epic `editor` P45, T176).
 * - ONE test:  the hero goes once, for good, and its state is the module's, which a browser can't load afresh.
 */
describe("PageLoading", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame"] })
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div id="PageLoading"><section><div><p>All Magic, No Fuss!</p></div><p class="Step" hidden></p></section></div>`
    )
  })
  afterEach(() => {
    vi.useRealTimers()
    document.getElementById("PageLoading")?.remove()
  })

  /** The hero's step line. */
  const stepLine = () => document.querySelector<HTMLElement>("#PageLoading .Step")!
  /** Is the hero going, or gone? */
  const isGoing = () => !document.getElementById("PageLoading")?.isConnected || stepLine().closest(".done") !== null

  /** The page server says `step` of `projectId`, as the live client hands it on. */
  const says = (projectId: string, step: BuildStep["step"]) =>
    dispatchEvent(new CustomEvent<BuildStep>(BUILD_STEP_PAGE_EVENT, { detail: { projectId, step } }))

  test("while a build it waits on is under way:  says each step under the line, and stays past 8 seconds, until it's done", () => {
    const stop = stepsOnLoadingScreen()
    PageLoading.start()
    says("@spell/library/games", "reading")
    expect(stepLine().hidden).toBe(false)
    expect(stepLine().textContent).toBe("Reading your project…")
    says("@spell/library/games", "compiling")
    expect(stepLine().textContent).toBe("Getting it ready…")
    // past the 8 seconds it waits at most when nothing's under way
    vi.advanceTimersByTime(20_000)
    expect(isGoing()).toBe(false)
    says("@spell/library/games", "built")
    expect(stepLine().hidden).toBe(true)
    vi.advanceTimersByTime(20)
    expect(isGoing()).toBe(true)
    stop()
  })
})
