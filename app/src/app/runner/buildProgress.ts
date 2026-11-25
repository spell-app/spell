/**
 * Watching a project's compile on the page server while a runner waits for its built files (`SP.BuildProgress`):
 * a fresh checkout's first run of a project compiles it first, and a big one takes a while, so the runner says so.
 * - Asks nothing for the first `WATCH_AFTER_MS`:  a project that's built answers well before.
 * - Then asks `GET /api/projects/building/<project>` (`SpellUrls.buildingUrl()`) every `WATCH_EVERY_MS`,
 *   handing each answer to `onProgress`, until stopped.
 * - A server with no such route (a static build) answers nothing, and nothing's said.
 * - Import directly, NOT through the `spell/parser/spell` barrel, which would pull in the whole parser.
 */
import { SpellUrls, type BuildProgress } from "spell/parser/spell/SpellUrls"
import { fetchJSON } from "./fetchFresh"

/**
 * Watch project `projectId`'s compile, calling `onProgress` with each answer, and `undefined` once it's not building.
 * - Answers what stops watching:  call it once the files came, however it went.  It calls `onProgress(undefined)`.
 * - NEVER throws.
 */
export function watchBuild(projectId: string, onProgress: (progress: BuildProgress | undefined) => void): () => void {
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const ask = async () => {
    const progress = await fetchJSON<BuildProgress>(SpellUrls.buildingUrl(projectId))
    if (stopped) return
    onProgress(progress?.building ? progress : undefined)
    timer = setTimeout(() => void ask(), WATCH_EVERY_MS)
  }
  timer = setTimeout(() => void ask(), WATCH_AFTER_MS)
  return () => {
    stopped = true
    clearTimeout(timer)
    onProgress(undefined)
  }
}

/** ms a runner waits for a project's files before asking whether it's compiling. */
export const WATCH_AFTER_MS = 1_000

/** ms between asking how a compile is coming along. */
export const WATCH_EVERY_MS = 1_000
