// Import directly, NOT through the `spell/app/spaces` barrel, which pulls in spell's parser
import { BUILD_STEP_PAGE_EVENT, isUnderWay, type BuildStep } from "spell/app/spaces/models/buildSteps"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { PageLoading } from "./PageLoading"

/**
 * Have the editor's loading screen say each step of the builds a project it opens waits on (epic `editor` P45, T176):
 * "Reading your project…", then "Getting it ready…", until every one under way is done.
 * - The page server tells every open page each step (spaces' `ProjectBuild`, `BUILD_STEP_PAGE_EVENT`):
 *   any project's counts, since what the editor waits on is an import it never names.
 * - Only while the hero's up:  `PageLoading.step()` does nothing after it's gone.
 * - Returns what stops it.
 */
export function stepsOnLoadingScreen(): () => void {
  const underWay = new Map<string, BuildStep["step"]>()
  const listener = (event: Event) => {
    const { projectId, step } = (event as CustomEvent<BuildStep>).detail ?? {}
    if (!projectId || !step) return
    if (isUnderWay(step)) underWay.set(projectId, step)
    else underWay.delete(projectId)
    const steps = [...underWay.values()]
    PageLoading.step(
      !steps.length
        ? undefined
        : appTexts.text(steps.every((it) => it === "reading") ? "buildStepReading" : "buildStepCompiling")
    )
  }
  addEventListener(BUILD_STEP_PAGE_EVENT, listener)
  return () => removeEventListener(BUILD_STEP_PAGE_EVENT, listener)
}
