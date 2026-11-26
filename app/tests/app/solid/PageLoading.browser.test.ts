import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { Observable, prop } from "spell/util"
import { BUILD_STEP_PAGE_EVENT, type BuildStep } from "spell/app/spaces/models/buildSteps"
import { PageLoading } from "spell/app/app/solid/PageLoading"
import { stepsOnLoadingScreen } from "spell/app/app/solid/loadingSteps"
import type { OpeningStep } from "spell/app/app/editor"

/**
 * The editor's loading screen, `#PageLoading` (`index.html`), and the step line it shows while the editor opens a
 * project (epic `editor` P45, T176).
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

  test("says each step of opening a project, and stays past 8 seconds until it runs;  only its own builds count", () => {
    const opening = new Opening()
    // what the project opened imports:  `editor.waitsOnBuildOf()`
    const waitsOn = (projectId: string) => ["@spell/examples/Solitaire", "@spell/library/games"].includes(projectId)
    const stop = stepsOnLoadingScreen({ opening: () => opening.step, waitsOn })
    PageLoading.start()
    opening.at("opening")
    expect(stepLine().hidden).toBe(false)
    expect(stepLine().textContent).toBe("Opening Solitaire…")
    opening.at("reading")
    expect(stepLine().textContent).toBe("Reading your project…")
    opening.at("checking")
    expect(stepLine().textContent).toBe("Checking your code…")

    //////
    // another tab opening another project:  not this one's
    says("@spell/examples/FizzBuzz", "reading")
    expect(stepLine().textContent).toBe("Checking your code…")
    // a build it waits on comes first, while it's under way
    says("@spell/library/games", "reading")
    expect(stepLine().textContent).toBe("Reading your project…")
    says("@spell/library/games", "compiling")
    expect(stepLine().textContent).toBe("Getting it ready…")
    // past the 8 seconds it waits at most when nothing's under way
    vi.advanceTimersByTime(20_000)
    expect(isGoing()).toBe(false)
    says("@spell/library/games", "built")
    expect(stepLine().textContent).toBe("Checking your code…")

    //////
    opening.at("starting")
    expect(stepLine().textContent).toBe("Starting it…")
    vi.advanceTimersByTime(20_000)
    expect(isGoing()).toBe(false)
    // running:  the hero goes
    opening.at(undefined)
    expect(stepLine().hidden).toBe(true)
    vi.advanceTimersByTime(20)
    expect(isGoing()).toBe(true)
    stop()
  })
})

/** A stand-in for `editor.opening`:  a cell, so the loading screen follows it. */
class Opening extends Observable {
  @prop()
  accessor step: OpeningStep | undefined

  /** Solitaire's opening has got to `step`;  `undefined`:  it runs. */
  at(step: OpeningStep["step"] | undefined) {
    this.step = step && { step, projectId: "@spell/examples/Solitaire", projectName: "Solitaire" }
  }
}
