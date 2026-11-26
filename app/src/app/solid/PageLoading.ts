/**
 * The hero over the whole page while it starts, `#PageLoading` (`index.html`):  nothing appears piecemeal.
 * - Each piece worth waiting for holds it (`hold()`):  the editor's top bar, which waits on the layout's runtime
 *   (epic `editor` J12;  Owen:  "As long as we are showing a 'loading' hero for the entire page this is fine"), and its code.
 * - It goes once none holds it, and for good:  a later file or project shows its own loading in place.
 * - While a project it opens waits on a build (an import not built yet), the line under "All Magic, No Fuss!" says
 *   the step it's on (`step()`, epic `editor` P45), and the hero stays up while one is under way.
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
   * - SIDE EFFECT:  a piece that never answers can't keep the page hidden:  it goes after `LONGEST_WAIT_MSEC`,
   *   unless a step is under way (`step()`)
   */
  start(): void {
    isStarted = true
    setTimeout(() => (stepping ? (isOverdue = true) : finish()), LONGEST_WAIT_MSEC)
    goneIfNotHeld()
  },

  /**
   * Say the step the page is waiting on, under the hero's line, e.g. "Getting it ready…";  `undefined`:  none now.
   * - While one is under way the hero stays, past `LONGEST_WAIT_MSEC`, but never past `LONGEST_STEP_MSEC`:
   *   a build that never says it's done can't keep the page hidden.
   * - After the hero's gone, this does nothing.
   */
  step(words: string | undefined): void {
    if (isDone) return
    const line = document.querySelector<HTMLElement>(`#${HERO_ID} .${STEP_CLASS}`)
    if (line) {
      line.textContent = words ?? ""
      line.hidden = !words
    }
    if (words && !stepping) {
      stepping = PageLoading.hold()
      stepTimer = setTimeout(() => PageLoading.step(undefined), LONGEST_STEP_MSEC)
    } else if (!words && stepping) {
      clearTimeout(stepTimer)
      const release = stepping
      stepping = undefined
      release()
      if (isOverdue) finish()
    }
  },

  /**
   * Has the hero gone, its fade done?  True on a page that never had one (a test, a demo).
   * - What draws over the page waits for this (the selection's marching ants):  never on top of the hero.
   */
  get isGone(): boolean {
    return isGone || !document.getElementById(HERO_ID)
  },

  /** Run `callback` once the hero has gone, its fade done:  at once if it has. */
  whenGone(callback: () => void): void {
    if (PageLoading.isGone) callback()
    else whenGone.push(callback)
  }
}

/** The hero's `id`, in `index.html`. */
const HERO_ID = "PageLoading"

/** The most the hero stays up, whatever holds it, unless a step is under way (`step()`). */
const LONGEST_WAIT_MSEC = 8000
/** The most a step keeps the hero up:  `ProjectBuild`'s `COMPILE_WAIT_MS`, the most a request waits for a build. */
const LONGEST_STEP_MSEC = 60_000
/** The class of the hero's step line, in `index.html`. */
const STEP_CLASS = "Step"
/** How long its fade takes (`index.html`'s `transition`), before it's removed. */
const FADE_MSEC = 150

let holds = 0
let isStarted = false
let isDone = false
let isGone = false
/** What holds the hero while a step is under way (`step()`). */
let stepping: (() => void) | undefined
let stepTimer: ReturnType<typeof setTimeout> | undefined
/** `LONGEST_WAIT_MSEC` went by while a step was under way:  the hero goes as soon as it's done. */
let isOverdue = false
/** What waits for the hero to go (`whenGone()`). */
const whenGone: (() => void)[] = []

/** Take the hero away, if it's time;  on the next frame, so what just drew has painted. */
function goneIfNotHeld() {
  if (isStarted && !holds) requestAnimationFrame(() => !holds && finish())
}

/** Fade the hero out, then remove it. */
function finish() {
  if (isDone) return
  isDone = true
  const hero = document.getElementById(HERO_ID)
  hero?.classList.add("done")
  setTimeout(() => {
    hero?.remove()
    isGone = true
    for (const callback of whenGone.splice(0)) callback()
  }, FADE_MSEC)
}
