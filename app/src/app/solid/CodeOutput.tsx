import { For, Loading, createEffect, createMemo, createSignal, onCleanup, untrack } from "solid-js"

import { P } from "spell/parser/parser"
import { editor, type FollowedPlace } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import type { monaco } from "spell/app/app/ui/monaco"
import { ErrorBoundary, tracked } from "spell/app/app/solid"
import { Inspector } from "./Inspector"
import { InspectorWrites } from "./InspectorWrites"
import { LazyMonaco } from "./LazyMonaco"

import "./CodeOutput.css"

/** The targets the compiled-code pane shows, in its menu's order, each with its code editor language and name. */
const OUTPUT_TARGETS = {
  "js/solid": { language: "javascript", text: "javascriptTab", icon: "js" },
  "ts/solid": { language: "typescript", text: "typescriptTab", icon: "code" },
  py: { language: "python", text: "pythonTab", icon: "python" }
} as const satisfies Record<string, { language: string; text: AppTextKey; icon: string }>

/** A target the compiled-code pane shows. */
export type OutputTarget = keyof typeof OUTPUT_TARGETS

/** The remembered value for no compiled code. */
const NO_OUTPUT = "off"

/** The preference that remembers which compiled code shows beside the code. */
const OUTPUT_PREF = "codeOutput"
editorPrefs.declare(OUTPUT_PREF, { oneOf: [NO_OUTPUT, ...(Object.keys(OUTPUT_TARGETS) as OutputTarget[])] })

const [outputTarget, setOutputTarget] = createSignal<string>(editorPrefs.get<string>(OUTPUT_PREF) || NO_OUTPUT)

/****************
 * ### `CodeOutputShown`
 * Which compiled code shows beside the code, if any:  none unless someone asks (Owen:  "Won't want to show output
 * language all the time, don't force it").  Remembered in the browser (`spellEditor:codeOutput`).
 ****************/
export class CodeOutputShown {
  /** The target showing;  `undefined`:  none (reactive). */
  static get target(): OutputTarget | undefined {
    const target = outputTarget()
    return target in OUTPUT_TARGETS ? (target as OutputTarget) : undefined
  }

  /** Show `target`'s code;  `undefined`:  hide it. */
  static set(target: OutputTarget | undefined): void {
    if (target) lastShown = target
    setOutputTarget(target ?? NO_OUTPUT)
    editorPrefs.set(OUTPUT_PREF, target ?? NO_OUTPUT)
  }

  /** View › Compiled Code:  hide it, or show the one shown last (JavaScript the first time). */
  static toggle(): void {
    CodeOutputShown.set(CodeOutputShown.target ? undefined : lastShown)
  }
}

/** The compiled code shown last, what View › Compiled Code shows again. */
let lastShown: OutputTarget = CodeOutputShown.target ?? "js/solid"

/** The ⋯'s id, its popup's target:  one code pane per page. */
const MORE_MENU_ID = "CodeMoreMenu"

/****************
 * ### `<CodeMoreMenu>`
 * The code pane's ⋯, at the right of its bar:  which compiled code to show beside the code.
 * - A menu of ticks, as the top bar's are (`<BarMenu ticks>`):  each target keeps its icon,
 *   a tick before it on the one showing (Owen, epic `editor` I73).
 * - A click on the ticked one hides it;  on another, shows that one instead.  No "None" row.
 * - Not a `<ui-dropdown>`:  a dropdown has no column for ticks, and swapped the showing row's icon for one.
 ****************/
export function CodeMoreMenu() {
  let popup: (HTMLElement & { visible?: boolean }) | undefined
  const choose = (target: OutputTarget) => {
    CodeOutputShown.set(CodeOutputShown.target === target ? undefined : target)
    if (popup) popup.visible = false
  }
  return (
    <>
      <ui-icon
        slot="right"
        id={MORE_MENU_ID}
        class="CodeMoreMenu"
        name="ellipsis horizontal"
        link=""
        aria-haspopup="menu"
        label={appTexts.text("codeMore")}
        title={appTexts.text("codeMore")}
      />
      <ui-popup
        slot="right"
        for={MORE_MENU_ID}
        open-on="click"
        position="bottom right"
        class="BarMenuPopup"
        aria-label={appTexts.text("codeMore")}
        ref={(element: HTMLElement) => (popup = element)}
      >
        <ui-menu
          direction="vertical"
          size="small"
          class="BarMenuItems"
          icon-column=""
          ticks=""
          aria-label={appTexts.text("codeOutputMenu")}
        >
          <ui-item kind="header">{appTexts.text("codeOutputMenu")}</ui-item>
          <For each={Object.keys(OUTPUT_TARGETS) as OutputTarget[]}>
            {(target) => (
              <ui-action
                icon={OUTPUT_TARGETS[target].icon}
                selected={CodeOutputShown.target === target ? "" : undefined}
                onClick={() => choose(target)}
              >
                {appTexts.text(OUTPUT_TARGETS[target].text)}
              </ui-action>
            )}
          </For>
        </ui-menu>
      </ui-popup>
    </>
  )
}

/****************
 * ### `<CodeOutputPane>`
 * The compiled code beside the code, read only:  a bar choosing its language, as every header, then the code.
 * - The project as `target` writes it, afresh after each compile, with its source map (`project.codeWithMapFor()`).
 * - A click on a line says where in the program it came from (`editor.followed`), and its line follows a click elsewhere.
 * - A target whose writer can't write the project shows why, as a comment, and follows nothing.
 ****************/
export function CodeOutputPane(props: { target: OutputTarget }) {
  const written = tracked(() => {
    const { project } = editor
    // read so a compile writes it afresh
    if (!project?.compiled) return { code: "" }
    try {
      return project.codeWithMapFor(props.target)
    } catch (error) {
      const comment = props.target === "py" ? "#" : "//"
      return { code: `${comment} ${error instanceof Error ? error.message : String(error)}\n` }
    }
  })
  const lines = createMemo(() => {
    const { map } = written() as { map?: P.SourceMapV3 }
    return map && new P.SourceMapLines(map)
  })
  const [output, setOutput] = createSignal<monaco.editor.IStandaloneCodeEditor>()
  const mounted = (made: monaco.editor.IStandaloneCodeEditor) => {
    setOutput(() => made)
    made.onDidChangeCursorSelection((event) => {
      if (event.source !== "mouse" || !event.selection.isEmpty()) return
      const place = lines()?.placeOfLine(event.selection.positionLineNumber - 1)
      if (place) editor.followed = { path: place.path, line: place.line, from: "output" }
    })
  }
  const follower = lineFollower()
  createEffect(
    () => [editor.followed, lines(), output(), written()] as const,
    ([followed, map, made]) => {
      if (!followed || !map || !made) return
      if (followed.from === "output") return follower.clear()
      follower.show(made, map.linesOf(followed.path, followed.line))
    }
  )
  return (
    <ui-panel appearance="pane" class="CodeOutputPane" label={appTexts.text("codeOutputHeader")}>
      <ui-toolbar slot="actions" appearance="segmented link header" tabs label={appTexts.text("codeOutputHeader")}>
        <For each={Object.keys(OUTPUT_TARGETS) as OutputTarget[]}>
          {(target) => (
            <ui-item
              icon={OUTPUT_TARGETS[target].icon}
              selected={props.target === target}
              onClick={() => CodeOutputShown.set(target)}
            >
              {appTexts.text(OUTPUT_TARGETS[target].text)}
            </ui-item>
          )}
        </For>
        <ui-icon
          slot="right"
          name="close"
          link=""
          label={appTexts.text("codeOutputClose")}
          title={appTexts.text("codeOutputClose")}
          onClick={() => CodeOutputShown.set(undefined)}
        />
      </ui-toolbar>
      <div class="CodeOutputCode">
        <ErrorBoundary onError={(error) => editor.showError(error)}>
          <Loading fallback={<LazyMonaco.Loading />}>
            <LazyMonaco.MonacoEditor
              value={written().code}
              language={OUTPUT_TARGETS[props.target].language}
              options={{ readOnly: true }}
              onMount={mounted}
            />
          </Loading>
        </ErrorBoundary>
      </div>
    </ui-panel>
  )
}

/****************
 * ### `<FollowAlong>`
 * Keeps the code and what's selected on the one place in focus (`editor.followed`):  a click on a line of the code, a line
 * of compiled code, a row of the Views tree or a thing on the screen, and the others show it.
 * - Draws nothing.  The compiled code shows it for itself (`<CodeOutputPane>`).
 * - By statement, as the source map is (Owen:  "This is fine").
 * - Quiet:  it never takes the keyboard's focus, scrolls only what's out of view, and leaves the code alone while
 *   someone's typing in it.
 * - A line that draws or makes something selects it:  every card, for the line that makes them all;  a line inside
 *   a tag, what that tag draws.
 * - A line of the code that draws nothing lets go of what's selected;  one of compiled code leaves it as it was,
 *   and so does the cursor's line once an edit typed there is drawn (`from: "edit"`, I87).
 ****************/
export function FollowAlong() {
  const follower = lineFollower()
  let selectedFor: FollowedPlace | undefined
  let openedFor: FollowedPlace | undefined
  createEffect(
    () => [editor.followed, editor.shownCodeEditor] as const,
    ([followed, codeEditor]) => {
      if (!followed) return
      if (followed !== selectedFor) {
        selectedFor = followed
        // the code's cursor on a line that draws nothing:  nothing's selected (P28, Choice 2)
        const ifNone = followed.from === "code" ? "deselect" : "keep"
        // only a new place runs it, so what it reads (the selection, the trail) it reads as it is now,
        // untracked on purpose (I88)
        if (followed.from !== "parts")
          untrack(() => Inspector.selectWrittenAt(followed.path, followed.line, { ifNone }))
      }
      if (followed.from === "code" || followed.from === "edit") return follower.clear()
      if (!codeEditor || codeEditor.hasTextFocus()) return
      const file = InspectorWrites.fileNamed(followed.path)
      if (!file) return
      // the file showing read, not followed:  opening another one here would run this again (I98)
      if (file.path === untrack(() => editor.file?.path)) return follower.show(codeEditor, [followed.line])
      if (followed === openedFor) return
      openedFor = followed
      void editor
        .showFileQuietly(file.path)
        .then(() => {
          const shown = editor.shownCodeEditor
          // still the place in focus, and nobody typing:  mark its line in the file now showing
          if (editor.followed === followed && shown && !shown.hasTextFocus()) follower.show(shown, [followed.line])
        })
        .catch((error: unknown) => editor.showError(error as Error))
    }
  )
  return null
}

/**
 * A mark in a code editor's margin on the line being followed, scrolling to it only when it's out of view.
 * - A mark, not a band across the line:  the code stays as it was, and takes no focus.
 * - Call in a component body:  its mark goes with the component.
 */
function lineFollower() {
  let marks: monaco.editor.IEditorDecorationsCollection | undefined
  let markedIn: monaco.editor.IStandaloneCodeEditor | undefined
  const clear = () => {
    marks?.clear()
    marks = markedIn = undefined
  }
  onCleanup(clear)
  return {
    clear,
    /** Mark `lines`, from 0, in `codeEditor`, and bring the first into view;  none:  no mark. */
    show(codeEditor: monaco.editor.IStandaloneCodeEditor, lines: readonly number[]): void {
      if (markedIn !== codeEditor) clear()
      if (!lines.length) return clear()
      markedIn = codeEditor
      marks ??= codeEditor.createDecorationsCollection()
      marks.set(
        lines.map((line) => ({
          range: { startLineNumber: line + 1, startColumn: 1, endLineNumber: line + 1, endColumn: 1 },
          options: { isWholeLine: true, linesDecorationsClassName: "FollowedLine" }
        }))
      )
      codeEditor.revealLineInCenterIfOutsideViewport(lines[0]! + 1)
    }
  }
}
