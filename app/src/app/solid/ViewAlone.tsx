import { Show, createEffect, createMemo, createSignal, untrack } from "solid-js"
import type { JSX } from "@solidjs/web"

import { setDebugGlobal } from "spell/util"
import { editor, runtimeCore } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { EDITOR_OWN } from "spell/app/app/ui/ui.types"
import { SpellElement } from "spell/app/app/runner/SpellElement"
import { barTooltip } from "./chrome"
import { Inspector, OwnEditorPage, VIEW_ALONE } from "./Inspector"
import { Palette, type OwnView } from "./Palette"

import "./ViewAlone.css"

/**
 * A view of the app shown on its own, its drawing and its property editor, edited by themselves inside its project
 * (epic `editor` P35, Q45 A, Q46 A):  Solitaire's `Card.spell` open, one card, not the whole game.
 * - Its switch is in the top bar beside Inspect app (`<ViewAloneButton>`), while the open file writes a view;
 *   remembered for each file.
 * - It draws the card selected in the app, else a new one made just for it, never added to the game.
 * - The app keeps running behind it, hidden and none of the Inspector's parts:  only the view and its editor are.
 * - Plain state here;  `<ViewAloneStage>` draws it in the app pane.
 */
export class ViewAlone {
  /**
   * The view the open file writes (reactive):  the one named like the file (`Card.spell`'s card), else its first;
   * `undefined` for a file that writes none, or outside Edit.
   */
  static get view(): OwnView | undefined {
    const file = editor.file
    if (!file || editor.projectPage !== "editor") return undefined
    const name = file.path.split("/").at(-1) ?? ""
    const own = Palette.ownViews.filter((view) => view.file === name)
    const named = name.split(".")[0]!.toLowerCase()
    return own.find((view) => view.classNames[0]!.toLowerCase() === named) ?? own[0]
  }

  /** Is the open file's view shown alone (reactive)? */
  static get isShowing(): boolean {
    const path = editor.file?.path
    return !!ViewAlone.view && !!path && aloneFiles().includes(path)
  }

  /** Show the open file's view alone, or the whole app again;  remembered for the file. */
  static toggle(): void {
    const path = editor.file?.path
    if (!path) return
    const files = aloneFiles().filter((each) => each !== path)
    const next = ViewAlone.isShowing ? files : [...files, path]
    setAloneFiles(next)
    editorPrefs.set(ALONE_PREF, next)
  }
}

setDebugGlobal({ ViewAlone })

/** The pref remembering which files show their view alone, by their paths. */
const ALONE_PREF = "viewAlone"

/** The files showing their view alone, by their paths (`ALONE_PREF`). */
const [aloneFiles, setAloneFiles] = createSignal<readonly string[]>(
  (editorPrefs.get(ALONE_PREF) as string[] | undefined) ?? []
)

/****************
 * ### `<ViewAloneButton>`
 * The switch between the whole app and the open file's view alone, in the top bar's Run | Edit group after
 * Inspect app:  `Card alone`, pressed while the card shows alone.
 * - Only while the open file writes a view (`ViewAlone.view`).
 ****************/
export function ViewAloneButton(): JSX.Element {
  return (
    <Show when={ViewAlone.view}>
      {(view) => (
        <ui-item
          icon={ALONE_ICON}
          appearance="circular"
          class={["ViewAloneButton", { showing: ViewAlone.isShowing }]}
          label={appTexts.text("viewAlone", { view: view().name })}
          aria-pressed={ViewAlone.isShowing ? "true" : "false"}
          {...barTooltip(
            appTexts.text(ViewAlone.isShowing ? "viewAloneStopTip" : "viewAloneTip", { view: view().name })
          )}
          onClick={() => ViewAlone.toggle()}
        />
      )}
    </Show>
  )
}

/** The switch's icon:  one thing on its own. */
const ALONE_ICON = "square outline"

/****************
 * ### `<ViewAloneStage>`
 * The open file's view alone, in the app pane:  drawn for one thing in the pane's middle, its property editor beside it.
 * - Drawn on the programs' runtime, as the editor's zones are (`runtimeCore()`):  a live edit draws it again in place,
 *   and the Inspector's changes to its thing redraw it.
 * - Its thing:  the one selected in the app when it opened, else a new one with its starting values (Q46 A);
 *   a new one again when the app restarts.
 * - The view is selected in the Inspector as it's drawn, so its rank, suit and face can be changed there.
 * - Its own drawing and its editor's elements are the Inspector's parts (`VIEW_ALONE`, `<OwnEditorPage>`):
 *   the palette's drops and clicks, moves, cut, copy and paste write into the view's file and its editor's.
 * - `program`:  the app's own drawing, hidden while it shows, and none of the Inspector's parts (`EDITOR_OWN`).
 ****************/
export function ViewAloneStage(props: { program: () => HTMLElement | undefined }): JSX.Element {
  const [thing, setThing] = createSignal<object>()
  createEffect(
    () => ViewAlone.isShowing,
    (isShowing) => {
      props.program()?.toggleAttribute(EDITOR_OWN, isShowing)
    }
  )
  createEffect(
    () => ({
      className: ViewAlone.isShowing ? ViewAlone.view?.classNames[0] : undefined,
      runs: editor.programRuns,
      core: runtimeCore()
    }),
    ({ className, core }) => {
      setThing(() => (className && core ? untrack(() => thingFor(className, core)) : undefined))
    }
  )
  const drawn = createMemo(() => {
    const shown = thing()
    const core = runtimeCore()
    if (!shown || !core) return undefined
    const element = untrack(() => core.drawThing(shown)) as unknown as Element | null
    element?.setAttribute(VIEW_ALONE, "")
    return element ?? undefined
  })
  // selected as it's drawn:  the Inspector changes its thing
  createEffect(drawn, (element) => {
    if (element) requestAnimationFrame(() => element.isConnected && Inspector.select(element))
  })
  return (
    <Show when={ViewAlone.isShowing}>
      <div class="ViewAloneStage">
        <Show when={drawn()} fallback={<p class="ViewAloneWaiting">{appTexts.text("viewAloneWaiting")}</p>}>
          {(element) => (
            <>
              <div class="ViewAloneView">{element()}</div>
              <div class="ViewAloneEditor">
                <OwnEditorPage element={element()} thing={thing()!} />
              </div>
            </>
          )}
        </Show>
      </div>
    </Show>
  )
}

/** The running program's core, as far as the stage uses it. */
type StageCore = NonNullable<ReturnType<typeof runtimeCore>>

/**
 * The thing of class `className` a view alone draws (Q46 A):  the one selected in the app, else a new one,
 * made with its starting values and put in nothing, so the game never sees it.
 * - `undefined` while the program has no such class.
 */
function thingFor(className: string, core: StageCore): object | undefined {
  const Class = core.things.classNamed(className) as (new () => object) | undefined
  if (!Class) return undefined
  const selected = Inspector.allSelected
    .map((part) => part.element && part.element.isConnected && SpellElement.thingOf(part.element))
    .find((value): value is object => !!value && value instanceof Class)
  return selected ?? new Class()
}
