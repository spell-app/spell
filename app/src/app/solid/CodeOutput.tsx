import { For, Loading, createEffect, createMemo, createSignal, onCleanup, untrack } from "solid-js"
import type { JSX } from "@solidjs/web"
import type { EditorView, ViewUpdate } from "@codemirror/view"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { editor, type FollowedPlace } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import type { CodeMirrorFollowed, SpellCodeMirror } from "spell/app/app/solid/codemirror"
import { ErrorBoundary } from "spell/app/app/solid"
import { barTooltip } from "./chrome"
import { Inspector } from "./Inspector"
import { InspectorWrites } from "./InspectorWrites"
import { LazyCodeMirror } from "./LazyCodeMirror"
import { on } from "./on"

import "./CodeOutput.css"

/**
 * How each language of compiled code looks, wherever the editor names one:
 * the compiled code's tabs, and the top bar's button for it.
 * - `icon`:  Font Awesome's brand icon (the app's `<ui-root icons="fa7-brands, fomantic">`)
 * - `text`:  its name's key, `JavaScript`
 * - `tip`:  the top bar's button's label, `Compiled JavaScript`
 */
export const LANGUAGE_LOOKS = {
  javascript: { icon: "js", text: "javascriptTab", tip: "compiledJavaScript" },
  typescript: { icon: "typescript", text: "typescriptTab", tip: "compiledTypeScript" },
  python: { icon: "python", text: "pythonTab", tip: "compiledPython" }
} as const satisfies Record<string, { icon: string; text: AppTextKey; tip: AppTextKey }>

/** The targets the compiled-code pane shows, in its tabs' order, each with the language its code is read as. */
const OUTPUT_TARGETS = {
  "js/solid": { language: "javascript" },
  "ts/solid": { language: "typescript" },
  py: { language: "python" }
} as const satisfies Record<string, { language: keyof typeof LANGUAGE_LOOKS }>

/** A target the compiled-code pane shows. */
export type OutputTarget = keyof typeof OUTPUT_TARGETS

/** How `target`'s code looks where it's named:  its language's icon and words. */
function lookOf(target: OutputTarget) {
  return LANGUAGE_LOOKS[OUTPUT_TARGETS[target].language]
}

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

  /** The target showing, else the one `toggle()` would show:  what the top bar's button names (reactive). */
  static get shownOrNext(): OutputTarget {
    return CodeOutputShown.target ?? lastShown
  }

  /** Show `target`'s code;  `undefined`:  hide it. */
  static set(target: OutputTarget | undefined): void {
    if (target) lastShown = target
    setOutputTarget(target ?? NO_OUTPUT)
    editorPrefs.set(OUTPUT_PREF, target ?? NO_OUTPUT)
  }

  /** View › Compiled Code, and the top bar's button:  hide it, or show the one shown last (JavaScript the first time). */
  static toggle(): void {
    CodeOutputShown.set(CodeOutputShown.target ? undefined : lastShown)
  }
}

/** The compiled code shown last, what View › Compiled Code shows again. */
let lastShown: OutputTarget = CodeOutputShown.target ?? "js/solid"

/****************
 * ### `<CompiledCodeButton>`
 * The top bar's compiled-code button, between the code's `</>` and Inspect app (epic `editor` T76):
 * shows the compiled code beside the code, or hides it, as View › Compiled Code does.
 * - Its icon is the language it shows, `js` for JavaScript:  the one showing, else the one it'd show.
 * - Its tooltip says what a click does, "Show Compiled JavaScript" or "Hide Compiled JavaScript" (epic `editor` I230);
 *   its label names it, "Compiled JavaScript".
 * - A plain toggle, no menu (Owen:  "I can change it when the compiled code is visible"):
 *   the compiled code's own tabs choose the language.
 * - `aria-pressed` while the compiled code shows, as the code's icon has it (`<ModeButtons>`).
 * - An item of the mode tabs' menu, handed to `<ModeButtons>` as `compiled`.
 ****************/
export function CompiledCodeButton(): JSX.Element {
  const look = () => lookOf(CodeOutputShown.shownOrNext)
  return (
    <ui-item
      icon={look().icon}
      appearance="circular"
      class="CompiledCodeToggle"
      label={appTexts.text(look().tip)}
      {...barTooltip(
        appTexts.text(CodeOutputShown.target ? "hideCompiledTip" : "showCompiledTip", {
          language: appTexts.text(look().text)
        })
      )}
      aria-pressed={CodeOutputShown.target ? "true" : "false"}
      onClick={() => CodeOutputShown.toggle()}
    />
  )
}

/****************
 * ### `<CodeOutputPane>`
 * The compiled code beside the code, read only:  a bar choosing its language, as every header, then the code.
 * - The project as `target` writes it, afresh after each compile, with its source map:  asked of the code's language
 *   service (`spell/codeWithMap`), the language worker's where it compiles the project (epic `solid-2-final` T36),
 *   else written from the page's own parse (`project.codeWithMapFor()`).
 * - A click on a line says where in the program it came from (`editor.followed`), and its line follows a click elsewhere.
 * - A target whose writer can't write the project shows why, as a comment, and follows nothing.
 ****************/
export function CodeOutputPane(props: { target: OutputTarget }) {
  const [written, setWritten] = createSignal<Written>({ code: "" })
  // afresh after each compile:  its compiled code is read so one writes it again
  createEffect(
    () => [editor.project, editor.project?.compiled, props.target] as const,
    ([project, compiled, target]) => {
      let isCurrent = true
      void writtenFor(project, compiled, target).then((made) => {
        if (isCurrent) setWritten(made)
      })
      return () => {
        isCurrent = false
      }
    }
  )
  const lines = createMemo(() => {
    const { map } = written() as { map?: P.SourceMapV3 }
    return map && new P.SourceMapLines(map)
  })
  const [output, setOutput] = createSignal<EditorView>()
  /** A click on a line:  where in the program it came from is the place in focus. */
  const clicked = (update: ViewUpdate) => {
    const { selection, doc } = update.state
    if (!selection.main.empty || !update.transactions.some((each) => each.isUserEvent("select.pointer"))) return
    const place = lines()?.placeOfLine(doc.lineAt(selection.main.head).number - 1)
    if (place) editor.followed = { path: place.path, line: place.line, from: "output" }
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
    <ui-panel
      appearance="pane"
      class="CodeOutputPane"
      label={appTexts.text("codeOutputHeader")}
      closable=""
      close-label={appTexts.text("codeOutputClose")}
      ref={on("ui-dismissed", () => CodeOutputShown.set(undefined))}
    >
      <ui-toolbar slot="actions" appearance="segmented link header" tabs label={appTexts.text("codeOutputHeader")}>
        <For each={Object.keys(OUTPUT_TARGETS) as OutputTarget[]}>
          {(target) => (
            <ui-item
              icon={lookOf(target).icon}
              selected={props.target === target}
              onClick={() => CodeOutputShown.set(target)}
            >
              {appTexts.text(lookOf(target).text)}
            </ui-item>
          )}
        </For>
      </ui-toolbar>
      <div class="CodeOutputCode">
        <ErrorBoundary onError={(error) => editor.showError(error)}>
          <Loading fallback={<LazyCodeMirror.Loading />}>
            <LazyCodeMirror.CodeMirrorEditor
              value={written().code}
              language={OUTPUT_TARGETS[props.target].language}
              onMount={(made) => setOutput(() => made)}
              onUpdate={clicked}
            />
          </Loading>
        </ErrorBoundary>
      </div>
    </ui-panel>
  )
}

/** What the compiled-code pane shows:  the code, and the source map it was written with. */
type Written = { code: string; map?: P.SourceMapV3 }

/**
 * `project` as `target` writes it, for `<CodeOutputPane>`:  asked of the language service, else from the page's parse.
 * - A target whose writer can't write the project:  why, as a comment.
 * - NEVER throws.
 */
async function writtenFor(
  project: SP.SpellProject | undefined,
  compiled: string | undefined,
  target: OutputTarget
): Promise<Written> {
  if (!project || !compiled) return { code: "" }
  const comment = target === "py" ? "#" : "//"
  const file = editor.languageFileOf(project)
  const answer =
    editor.askLanguage && file ? await editor.askLanguage(file, "spell/codeWithMap", { target }) : undefined
  // the worker's, where it compiled the project;  a project it hasn't compiled is written from the page's parse
  if (answer && !("error" in answer)) return answer
  try {
    return project.codeWithMapFor(target)
  } catch (error) {
    return { code: `${comment} ${error instanceof Error ? error.message : String(error)}\n` }
  }
}

/****************
 * ### `<FollowAlong>`
 * Keeps the code and what's selected on the one place in focus (`editor.followed`):  a click on a line of the code, a line
 * of compiled code, a row of the Views tree or a thing on the screen, and the others show it.
 * - Draws nothing.  The compiled code shows it for itself (`<CodeOutputPane>`).
 * - By statement, as the source map is (Owen:  "This is fine").
 * - Quiet:  it never takes the keyboard's focus, scrolls only what's out of view, and leaves the code alone while
 *   someone's typing in it.
 * - A part clicked (inspected in the app, a row of the tree) puts the code's caret where it's written too,
 *   on its tag (epic `editor` I158;  Owen:  "I'd expect it to select `<action "cheat" />` and put the cursor there").
 * - A line that draws or makes something selects it:  every card, for the line that makes them all;
 *   a line inside a tag, what that tag draws.
 * - A line of the code that draws nothing lets go of what's selected;  one of compiled code leaves it as it was,
 *   and so does the cursor's line once an edit typed there is drawn (`from: "edit"`, I87).
 * - The code's cursor ON a word naming a thing the app has (`the stock`, `the deck`, `la reserva`) inspects that
 *   thing instead of its line (epic `editor` T64;  Owen:  "How cool would it be if `the stock` was inspected when
 *   your cursor was here"):  `followCodeCursor()`.
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
        if (followed.from === "code" || followed.from === "edit") void followCodeCursor(followed, codeEditor, ifNone)
        else if (followed.from !== "parts") {
          const isWanted = () => editor.followed === followed
          untrack(() => void Inspector.selectWrittenAt(followed.path, followed.line, { ifNone, isWanted }))
        }
      }
      if (followed.from === "code" || followed.from === "edit") return follower.clear()
      if (!codeEditor || codeEditor.view.hasFocus) return
      const file = InspectorWrites.fileNamed(followed.path)
      if (!file) return
      // the file showing read, not followed:  opening another one here would run this again (I98)
      if (file.path === untrack(() => editor.file?.path)) return follower.show(codeEditor, [followed.line], followed)
      if (followed === openedFor) return
      openedFor = followed
      void editor
        .showFileQuietly(file.path)
        .then(() => {
          const shown = editor.shownCodeEditor
          // still the place in focus, and nobody typing:  mark its line in the file now showing
          if (editor.followed === followed && shown && !shown.view.hasFocus)
            follower.show(shown, [followed.line], followed)
        })
        .catch((error: unknown) => editor.showError(error as Error))
    }
  )
  return null
}

/**
 * The code's cursor rests at `followed`:  select the thing the word under it names, when it names one the app draws,
 * else what its line draws or makes, as ever (`Inspector.selectWrittenAt()`).
 * - The word is read by the language service, the language worker's where it parses,
 *   from its declaration (`<stock-pile "stock"/>`, `"stock" is a new ...`):
 *   that line's part is the thing, so what's inspected is what the program declared, never a guess from the text.
 * - Only a property or a variable counts (`declaredThingAt()`):  a type, an action or a keyword falls back to the line.
 * - A place followed since (the cursor moved on) is left alone:  the language service loads lazily.
 * - NEVER throws.
 */
async function followCodeCursor(
  followed: FollowedPlace,
  codeEditor: SpellCodeMirror | undefined,
  ifNone: "keep" | "deselect"
): Promise<void> {
  const named = codeEditor && (await thingNamedAtCursor(codeEditor, followed).catch(() => undefined))
  if (editor.followed !== followed) return
  const isWanted = () => editor.followed === followed
  if (named && (await untrack(() => Inspector.selectWrittenAt(named.path, named.line, { isWanted })))) return
  if (isWanted()) await untrack(() => Inspector.selectWrittenAt(followed.path, followed.line, { ifNone, isWanted }))
}

/**
 * Where the thing the word at `codeEditor`'s caret names was declared, by its file's name and line from 0:
 * `undefined` when the caret isn't on `followed`'s line, a range is selected, or the word names no thing.
 */
async function thingNamedAtCursor(
  codeEditor: SpellCodeMirror,
  followed: FollowedPlace
): Promise<{ path: string; line: number } | undefined> {
  const { state } = codeEditor.view
  const { main } = state.selection
  const caretLine = state.doc.lineAt(main.head)
  if (!main.empty || caretLine.number !== followed.line + 1) return undefined
  await LazyCodeMirror.load()
  const { language } = codeEditor
  // the parse of the code showing, as its other features read it:  the language worker's, else the page's
  if (!language || !(await language.fileReady(state.doc))) return undefined
  const position = { line: caretLine.number - 1, character: main.head - caretLine.from }
  const declared = await language.ask("spell/declaredThing", { position })
  // typed in since it asked:  the answer is about other text
  if (!declared || codeEditor.view.state.doc !== state.doc) return undefined
  return { path: SP.SpellProject.sourceNameOf(declared.path), line: declared.line }
}

/**
 * A mark at the left of the line being followed, in a code editor, scrolling to it only when it's out of view
 * (`CodeMirrorFollowed`).
 * - A mark, not a band across the line:  the code stays as it was, and takes no focus.
 * - Call in a component body:  its mark goes with the component.
 */
function lineFollower() {
  let markedIn: EditorView | undefined
  /** CodeMirror's marks, once it's loaded:  before then there's no editor to mark. */
  let marks: typeof CodeMirrorFollowed | undefined
  void LazyCodeMirror.load().then((module) => (marks = module.CodeMirrorFollowed))
  const clear = () => {
    if (markedIn && marks) marks.clear(markedIn)
    markedIn = undefined
  }
  onCleanup(clear)
  return {
    clear,
    /**
     * Mark `lines`, from 0, in `codeEditor` (the code pane's, or a plain view), and bring the first into view;
     * none:  no mark.
     * - `caretAt`, a part's place with its column:  the caret goes there, without the keyboard's focus.
     *   Moved by code, not the mouse or keys, so it isn't followed back (`caretMoveToFollow()`, in `editor.ts`).
     */
    show(codeEditor: SpellCodeMirror | EditorView, lines: readonly number[], caretAt?: FollowedPlace): void {
      const view = "view" in codeEditor ? codeEditor.view : codeEditor
      if (markedIn !== view) clear()
      if (caretAt?.column !== undefined) {
        const { doc } = view.state
        const line = doc.line(Math.max(1, Math.min(caretAt.line + 1, doc.lines)))
        view.dispatch({ selection: { anchor: line.from + Math.min(caretAt.column, line.length) } })
      }
      if (!marks) return
      if (!lines.length) return clear()
      markedIn = view
      marks.show(view, lines)
    }
  }
}
