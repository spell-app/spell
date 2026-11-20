/**
 * Tours (epic `editor` P40):  what compiled spell calls to drive a page's tour, a `<ui-tour>` of Spell UI's.
 * - `start tour "first game"` => `core.startTour("first game")`,
 *   `start tour "first game" at step 3` => `core.startTour("first game", 3)`
 * - `stop the tour` => `core.stopTour()`
 * - `show step 3`, `show step "drag"` => `core.showTourStep(3)`, `core.showTourStep("drag")`
 * - `go to the next step` => `core.nextTourStep()`;  `go back a step` => `core.previousTourStep()`
 * - Core never imports Spell UI:  its tours put ONE control object on the page, by a global symbol,
 *   `globalThis[Symbol.for("spell-ui:tours")]`, and these read it there each time.
 * - NEVER throws:  no tours on the page, or no tour of that name, says so on the program's console and goes on.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */
import { core } from "./core"
import { defineCoreModule } from "./core.types"

/** Where Spell UI's tours put their control object, on `globalThis`. */
const TOURS_KEY = Symbol.for("spell-ui:tours")

/** The page's tours, as Spell UI's `<ui-tour>` family hands them over:  only the half compiled spell calls. */
type PageTours = {
  /** start the tour named `name` (its `<ui-tour name>`), at `step` if given;  `false` when there's no such tour */
  start(name?: string, step?: number | string): boolean
  /** stop the tour showing */
  stop(): void
  /** show a step of the tour showing, by its number (from 1) or its name */
  show(step: number | string): void
  /** the next step of the tour showing */
  next(): void
  /** the step before, in the tour showing */
  back(): void
}

/** `core`'s tour methods. */
export const tourMethods = defineCoreModule({
  /**
   * Start the page's tour `name`:  what `start tour "first game"` and `start the "first game" tour` compile to.
   * - At `step`, by its number (from 1) or its name, when given:  `start tour "first game" at step 3`
   * - NEVER throws:  no tours on the page, or none of that name, says so on the console.
   */
  startTour(name: string, step?: number | string): void {
    const tours = pageTours(`start tour "${name}"`)
    if (tours && !(step === undefined ? tours.start(name) : tours.start(name, step)))
      core.console.warn(`start tour "${name}":  this page has no tour of that name`)
  },

  /**
   * Stop the tour showing, if one is:  what `stop the tour` compiles to.
   * - NEVER throws:  no tours on the page says so on the console.
   */
  stopTour(): void {
    pageTours("stop the tour")?.stop()
  },

  /**
   * Show one step of the tour showing, by its number (from 1) or its name:
   * what `show step 3` and `show step "drag"` compile to.
   * - NEVER throws:  no tours on the page says so on the console.
   */
  showTourStep(step: number | string): void {
    pageTours(`show step ${typeof step === "string" ? `"${step}"` : step}`)?.show(step)
  },

  /**
   * Show the next step of the tour showing:  what `go to the next step` compiles to.
   * - NEVER throws:  no tours on the page says so on the console.
   */
  nextTourStep(): void {
    pageTours("go to the next step")?.next()
  },

  /**
   * Show the step before, in the tour showing:  what `go back a step` compiles to.
   * - NEVER throws:  no tours on the page says so on the console.
   */
  previousTourStep(): void {
    pageTours("go back a step")?.back()
  }
})
Object.assign(core, tourMethods)

/**
 * The page's tours, else `undefined`, saying on the console that `line` can't run:
 * Spell UI's tours aren't loaded on this page.
 */
function pageTours(line: string): PageTours | undefined {
  const tours = (globalThis as Record<symbol, PageTours | undefined>)[TOURS_KEY]
  if (!tours) core.console.warn(`${line}:  this page has no tours;  add a <ui-tour> to it`)
  return tours
}
