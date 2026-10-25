/**
 * Base classes for spell.
 */
import { core } from "spell-parser/core/core"
// Import directly to avoid circular import
import { View } from "./View"

/**
 * `App`:  a `View` that draws a whole application -- what `a game is an app` extends.
 * - Its element is named for its project and `app`, not its class:  `<solitaire-app>` (epic `elemental-spell` Q62),
 *   which `<spell-viewer>` places inside itself when the app starts.
 * - Its element shows its drawing as its CHILDREN, not in its shadow root (`drawsInItsChildren`):
 *   so the project's `.css` files, installed where the app mounts (`core.domRoot()`), still reach its board.
 * - Set the `draw` method (e.g. via a spell-compiled `to draw`) and start things with `start the game`.
 * - Everything else as a `View`.
 */
export class App extends View {
  /**
   * Does our element show our drawing as its children, in its `<slot>`, rather than in its shadow root?
   * - Yes for an app:  see the class docs.
   * - Read by `core.drawThing()` and the page's element (app's `SpellElement`).
   */
  static drawsInItsChildren = true

  /**
   * An app's remembered props are kept by name alone, e.g. `theme` at `@owen/solitaire:theme`:
   * a program has one app, so it needs no id -- see `Thing.rememberedKeyFor()`.
   */
  protected rememberedKeyFor(property: string): string {
    return property
  }

  /**
   * Mount this app's drawing into `core.appElement()` (`core.mountApp()`), creating a
   * `core.REACT_APP_ROOT_ID` container `div` if there's none.
   * - On a page that defines elements, that's our element, `<solitaire-app>`, our drawing inside it.
   * - Compiles from `start the game` -- see `rules/draw/StartApp.ts` (a method call on the app instance, not a global).
   * - Starting again replaces the app drawn there.
   * - SIDE EFFECT: appends a `div` to `document.body` the first time it's called, if the host set no `appRoot`.
   * - With `core.appLayout` (a `<spell-viewer>` with markup inside it):  draws nothing, saying so on the console.
   */
  start(): void {
    if (core.appLayout) {
      core.console.log(`${this.constructor.name}:  its page's markup draws it, not its \`to draw\``)
      return
    }
    let element = core.appElement()
    if (!element) {
      element = document.createElement("div")
      element.id = core.REACT_APP_ROOT_ID
      document.body.appendChild(element)
    }
    core.mountApp(this, element)
  }
}
