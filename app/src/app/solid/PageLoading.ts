/**
 * The hero over the whole page while it starts, `#PageLoading` (`index.html`):  nothing appears piecemeal.
 * - Each piece worth waiting for holds it (`hold()`):  the editor's top bar, which waits on the layout's runtime
 *   (epic `editor` J12;  Owen:  "As long as we are showing a 'loading' hero for the entire page this is fine"), and its code.
 * - It goes once none holds it, and for good:  a later file or project shows its own loading in place.
 * - Plain DOM, no Solid:  it's up before any script has run.
 */
export const PageLoading = {
  /**
   * Keep the hero up until the function it returns is called.
   * - Calling that again does nothing;  after the hero's gone, this does nothing.
   */
  hold(): () => void {
    if (isDone) return () => undefined
    holds++
    let isHeld = true
    return () => {
      if (!isHeld) return
      isHeld = false
      holds--
      goneIfNotHeld()
    }
  },

  /**
   * The page has drawn once:  from now on only what holds it keeps the hero up.
   * - SIDE EFFECT:  a piece that never answers can't keep the page hidden:  it goes after `LONGEST_WAIT_MSEC`.
   */
  start(): void {
    isStarted = true
    setTimeout(finish, LONGEST_WAIT_MSEC)
    goneIfNotHeld()
  }
}

/** The most the hero stays up, whatever holds it. */
const LONGEST_WAIT_MSEC = 8000
/** How long its fade takes (`index.html`'s `transition`), before it's removed. */
const FADE_MSEC = 150

let holds = 0
let isStarted = false
let isDone = false

/** Take the hero away, if it's time;  on the next frame, so what just drew has painted. */
function goneIfNotHeld() {
  if (isStarted && !holds) requestAnimationFrame(() => !holds && finish())
}

/** Fade the hero out, then remove it. */
function finish() {
  if (isDone) return
  isDone = true
  const hero = document.getElementById("PageLoading")
  hero?.classList.add("done")
  setTimeout(() => hero?.remove(), FADE_MSEC)
}
