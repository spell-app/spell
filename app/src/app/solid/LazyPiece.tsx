import { Loading, lazy, untrack, type Component } from "solid-js"
import type { JSX } from "@solidjs/web"

import { LoadOnce } from "spell/util/LoadOnce"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"

/****************
 * ### `LazyPiece`
 * A piece of the editor loaded the first time it's used:  a mode, a pane, a box (epic `solid-2-final` P6).
 * - Each piece is split in two:
 *   - its STATE file stays in the editor's first load:  what hotkeys, menus and the top bar ask (is it open, open it)
 *   - its VIEW file, what draws it, is a `LazyPiece`:  loaded with `import()` when it first shows
 * - The state file makes it, and the barrel exports its views from there:
 *
 *   ```tsx
 *   // Inspector.tsx, the state
 *   static views = new LazyPiece(() => import("./InspectorView"), "waitInspector")
 *   export const InspectorPane = Inspector.views.view("InspectorPane")
 *   ```
 *
 * - `view(name)`:  a component drawn as that view, inside its own `<Loading>` whose fallback is a `<ui-loader>`
 *   saying what it waits for, the piece's `words` ("Loading the Inspector…";  epic `editor` T180);
 *   once the module is in, at once, with no loader.
 * - `load()`:  the module, once;  the state's `open()` starts it, and what must wait for it (a tour, a test) awaits it.
 * - `ahead`:  a `ref` that loads it ahead, while the pointer rests on what opens it (its tab, its button),
 *   or it's focused or pressed:  `LoadOnce.ahead()`, the ONE way to load ahead.
 * - SEE:  `LazyCodeMirror`, the same idea for the code editor, which connects itself as it loads.
 * - NEVER import a view file statically, types aside:  it would be in the first load again
 *   (`app`'s build test, "the first screen", fails then).
 ****************/
export class LazyPiece<M extends Record<string, unknown>> {
  /**
   * The module's one load:  every view and caller shares it.
   * - A failure is forgotten:  the next open tries again (the server was restarting, the connection dropped).
   */
  private readonly loads = new LoadOnce<"module", M>({ failures: "forgotten" })

  /**
   * - `importer`:  loads the piece's view module, `() => import("./InspectorView")`
   * - `words`:  what its loader says while it loads, an `AppTexts` key ("Loading the Inspector…");
   *   none:  "Loading…"
   */
  constructor(
    private readonly importer: () => Promise<M>,
    private readonly words: AppTextKey = "waitPiece"
  ) {}

  /** The module, loaded once;  rejects if it can't load (a new build, offline). */
  load(): Promise<M> {
    return this.loads.get("module", this.importer)
  }

  /** The module, once it's in;  `undefined` until then. */
  get module(): M | undefined {
    return this.loads.valueOf("module")
  }

  /** Start loading the module, if it isn't yet.  NEVER throws:  a failure is logged, and its view shows it. */
  loadSoon(): void {
    this.load().catch((error: unknown) => console.error("LazyPiece:  couldn't load a piece of the editor", error))
  }

  /**
   * A `ref` for what opens the piece (a tab, a button, a menu item):  loads it ahead, nothing shown.
   * - Arrow, so it keeps its `this`:  `ref={(button: Element) => Inspector.views.ahead(button)}`
   *   (the lint's React `refs` rule takes `ref={Inspector.views.ahead}` for a React ref read in render).
   */
  ahead = (element: Element): void => {
    if (!this.module) LoadOnce.ahead(element, () => this.loadSoon())
  }

  /**
   * The module's `name` export as a component, loaded on first use:
   * drawn inside a `<Loading>` of its own, a `<ui-loader>` while it loads.
   * - Once the module is in, drawn at once, no loader.
   * - A view that fails to load throws, for the error boundary around it.
   */
  view<K extends keyof M & string>(name: K): M[K] {
    const lazyView = lazy(() => this.load(), { export: name }) as unknown as Component<object>
    const drawn = (props: object): JSX.Element => {
      const loaded = this.module?.[name] as Component<object> | undefined
      if (loaded) return untrack(() => loaded(props))
      return <Loading fallback={<LazyPiece.Loading words={this.words} />}>{lazyView(props)}</Loading>
    }
    return drawn as unknown as M[K]
  }

  /**
   * What shows while a piece loads:  a small spinner, centred in its place, its words under it.
   * - Every spinner says what it's waiting for (epic `editor` T180):  `words`, an `AppTexts` key.
   * - The Guides page's waits too.
   */
  static Loading(props: { words: AppTextKey }): JSX.Element {
    return (
      <ui-loader class="LazyPieceLoading" visible="" inline="" align="center" size="small" text="">
        {appTexts.text(props.words)}
      </ui-loader>
    )
  }
}
