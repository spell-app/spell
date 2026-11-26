import { observe } from "spell/util"
// Import directly, NOT through the `spell/app/spaces` barrel, which pulls in spell's parser
import { BUILD_STEP_PAGE_EVENT, isUnderWay, type BuildStep } from "spell/app/spaces/models/buildSteps"
import type { OpeningStep } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { PageLoading } from "./PageLoading"

/**
 * Have the editor's loading screen say each step of opening a project, and stay up until it runs
 * (epic `editor` P45, T176;  Q92's A):
 * "Opening Solitaire…", "Reading your project…", "Checking your code…", "Starting it…".
 * - The editor's own steps:  `opening()`, the editor's `opening`, which its `selectPath()` and first `compileApp()` set.
 * - A build on the page server it waits on comes first, while one is under way:
 *   "Reading your project…", then "Getting it ready…".
 *   - The page server tells every open page each step of every build (spaces' `ProjectBuild`, `BUILD_STEP_PAGE_EVENT`):
 *     only the project being opened, and those it imports, count (`waitsOn()`), never another tab's.
 * - Only while the hero's up:  `PageLoading.step()` does nothing after it's gone, and keeps it up 60 seconds at most.
 * - Plain DOM, and given the editor's reads, never the editor:  so a test drives it alone.
 * - Returns what stops it.
 */
export function stepsOnLoadingScreen({ opening, waitsOn }: LoadingStepsProps): () => void {
  /** each build under way, by its project's id */
  const builds = new Map<string, BuildStep["step"]>()
  const show = () =>
    PageLoading.step(
      wordsFor(
        opening(),
        [...builds].filter(([projectId]) => waitsOn(projectId))
      )
    )
  const listener = (event: Event) => {
    const { projectId, step } = (event as CustomEvent<BuildStep>).detail ?? {}
    if (!projectId || !step) return
    if (isUnderWay(step)) builds.set(projectId, step)
    else builds.delete(projectId)
    show()
  }
  addEventListener(BUILD_STEP_PAGE_EVENT, listener)
  // again as the editor gets further
  const stopObserving = observe(show)
  return () => {
    removeEventListener(BUILD_STEP_PAGE_EVENT, listener)
    stopObserving()
  }
}

/** What the loading screen follows:  `stepsOnLoadingScreen()`'s props. */
export type LoadingStepsProps = {
  /** How far the editor's got opening a project:  `editor.opening`, read in a cell, so it's followed. */
  opening: () => OpeningStep | undefined
  /** Does the project being opened wait on a build of `projectId`?  `editor.waitsOnBuildOf()`. */
  waitsOn: (projectId: string) => boolean
}

/** The words for where things are:  a build under way first, else the editor's own step;  `undefined`:  none. */
function wordsFor(opening: OpeningStep | undefined, builds: [string, BuildStep["step"]][]): string | undefined {
  if (builds.length) {
    return appTexts.text(builds.every(([, step]) => step === "reading") ? "buildStepReading" : "buildStepCompiling")
  }
  if (!opening) return undefined
  const { step, projectName } = opening
  // oxfmt-ignore
  return step === "opening" ? appTexts.text("openingProject", { project: projectName })
    : step === "reading" ? appTexts.text("buildStepReading")
    : step === "checking" ? appTexts.text("openingChecking")
    : /* step === "starting" */ appTexts.text("buildStepStarting")
}
