/**
 * Base classes for spell.
 */
import { core } from "spell/parser/core/core"
import { describedMethods } from "spell/parser/core/described"
import type { ShownHistory } from "spell/parser/core/undoing"
// Import directly to avoid circular import
import { View } from "./View"
import { APP_ID_PROP } from "./ids"

/**
 * `App`:  a `View` that draws a whole application -- what `a game is an app` extends.
 * - Its element is named for its project and `app`, not its class (epic `elemental-spell` Q62):
 *   `<solitaire-app>`, which `<spell-viewer>` places inside itself when the app starts.
 * - Its element shows its drawing as its CHILDREN, not in its shadow root (`drawsInItsChildren`):
 *   so the project's `.css` files, installed where the app mounts (`core.domRoot()`), still reach its board.
 * - Its `id` is its name, lower kebab case:  `solitaire` (`APP_ID_PROP`, language T147).
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

  static {
    this.declareProp("id", APP_ID_PROP)
  }

  /**
   * SIDE EFFECT:  the running program's first app is its app, `core.RUNTIME.app`:
   * the last stop up an event's chain before the program's own listeners (`send()`, epic `elemental-spell` P9).
   */
  constructor(props?: Record<string, unknown>) {
    super(props)
    if (core.RUNTIME && !core.RUNTIME.app) core.RUNTIME.app = this
  }

  /**
   * An app's remembered props are kept by name alone, e.g. `theme` at `@owen/solitaire:theme`:
   * a program has one app, so it needs no id -- see `Thing.rememberedKeyFor()`.
   * - Not `solitaire.theme`, now its id is its name (`APP_ID_PROP`):  what's kept stays where it was.
   */
  protected rememberedKeyFor(property: string): string {
    return property
  }

  ////////////////
  // ## Undo and redo
  ////////////////

  /**
   * Undo the newest step:  what the program's last undoable action changed, put back (epic `prefs-and-undo` P6).
   * - False with nothing to undo.
   * - ⌘Z does it too, while the app has the focus.
   * - The run's history, `core.RUNTIME.history`:  see `undoing.ts`.
   * - On a page drawing a program that runs elsewhere (Python's), the program undoes it:
   *   its `<action "undo"/>` runs there (`core.runAction()`), never this.
   */
  undo(): boolean {
    return core.RUNTIME.history.undo()
  }

  /** Redo the step undone last;  false with none.  ⇧⌘Z does it too. */
  redo(): boolean {
    return core.RUNTIME.history.redo()
  }

  /**
   * Is there a step to undo?  Live:  a menu item drawn from it greys out by itself.
   * - A page drawing a program that runs elsewhere (Python's):  that program's history, as it last said
   *   (`core.remote.history`, epic `language` P54).
   */
  get canUndo(): boolean {
    return shownHistory()?.canUndo ?? false
  }

  /** Is there a step to redo?  Live. */
  get canRedo(): boolean {
    return shownHistory()?.canRedo ?? false
  }

  /** The Edit menu's undo item, in the program's language:  `Undo Turn Card`, or `Undo` with nothing to undo.  Live. */
  get undoTitle(): string {
    return shownHistory()?.undoTitle ?? core.message("undo")
  }

  /** The Edit menu's redo item:  `Redo Turn Card`, or `Redo`.  Live. */
  get redoTitle(): string {
    return shownHistory()?.redoTitle ?? core.message("redo")
  }

  // `undo` and `redo` are the app's own ACTIONS (epic `elemental-spell` P10):  a menu names them, `- its "edit menu" is
  // a menu of "undo" and "redo"`, and draws them with their live titles, greyed out with nothing to undo
  static {
    describedMethods.describeAction(this, "undo", {
      title: "undo",
      titleFrom: "undoTitle",
      icon: "undo",
      shortcuts: ["meta+Z"],
      enabledWhen: "canUndo",
      refusedWhileBusy: true
    })
    describedMethods.describeAction(this, "redo", {
      title: "redo",
      titleFrom: "redoTitle",
      icon: "redo",
      shortcuts: ["meta+shift+Z"],
      enabledWhen: "canRedo",
      refusedWhileBusy: true
    })
  }

  /**
   * Mount this app's drawing into `core.appElement()`:  `core.startDrawing()`, which a page's `start()` shares.
   * - Compiles from `start the game` -- see `rules/draw/StartApp.ts` (a method call on the app instance, not a global).
   */
  start(): void {
    core.startDrawing(this)
  }
}

/** The history the app's Undo and Redo show:  a program running elsewhere's, as it last said, else this run's own. */
function shownHistory(): ShownHistory | undefined {
  return core.remote?.history ?? core.RUNTIME?.history
}
