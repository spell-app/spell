import { For, Show, createEffect, createMemo, createSignal, onSettled } from "solid-js"

import { SP } from "spell/parser/spell"
import type { DebugFrame } from "spell/parser/core/stepping"
import { editor, runtimeCore } from "spell/app/app/editor"
import { debugging } from "spell/app/app/Debugging"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import { EDITOR_HOTKEYS } from "spell/app/app/pages/editorHotkeys"
import { Inspector } from "./Inspector"
import { shownValue, type ShownValue } from "./ThingExplorer"

import "./Debugger.css"

/****************
 * ### `<Debugger>`
 * The step debugger, above the code (epic `editor` P33):  while debugging's on, its bar, and once the app is stopped,
 * what the stopped action is working on.
 * - The bar:  Continue, Step Over, Step Into and Step Out, each with its key, and Stop Debugging.
 * - Stopped, beside the code:
 *   - the thing the action is on, and its properties:  the pile, and its cards
 *   - what it was given:  the card being moved
 *   - what its lines have set so far
 *   - the actions that called it, this one first:  a click shows that one's line and values
 * - Follows the stopped line into whichever file it's in, lit (`CodeMirrorDebug.showStopped()`), scrolling to it.
 * - Hears the code's margin:  a breakpoint clicked there reaches `debugging.setBreakpoints()`, and the first starts
 *   debugging.
 * - Draws `debugging` (`Debugging.ts`), which does the work.
 ****************/
export function Debugger() {
  /** The action looked at:  the stopped one, or one that called it, clicked. */
  const [picked, setPicked] = createSignal<DebugFrame>()
  const stopped = () => debugging.stopped
  /** The action looked at, and its line, a new one at each stop:  a frame's line moves on as it's stepped. */
  const shown = createMemo(() => {
    const at = stopped()
    if (!at) return undefined
    const frame = picked()
    return frame && frame !== at.frame && at.frame.stack.includes(frame)
      ? { frame, path: frame.path, line: frame.line }
      : { frame: at.frame, path: at.path, line: at.line }
  })
  /** The actions that called the stopped one, it first, each with its line now. */
  const stack = createMemo(() => {
    const at = stopped()
    return at ? at.frame.stack.map((frame) => ({ frame, line: frame === at.frame ? at.line : frame.line })) : []
  })

  /** What the bar says:  where it's stopped, or how to stop it. */
  const says = () => {
    const at = stopped()
    return at
      ? appTexts.text("debugStoppedAt", { line: at.line + 1, file: fileName(at.path) })
      : appTexts.text("debugRunning")
  }

  listenToTheMargin()
  followTheStoppedLine(() => {
    const at = shown()
    return at && { path: at.path, line: at.line }
  })

  return (
    <Show when={debugging.isOn}>
      <section class="Debugger" aria-label={appTexts.text("debugStop")}>
        <div class="DebuggerBar">
          <span class="DebuggerSays">{says()}</span>
          <span class="DebuggerButtons">
            <StepButton text="debugContinue" icon="play" hotkey="debugContinue" run={debugging.goOn} />
            <StepButton text="debugStepOver" icon="redo" hotkey="debugStepOver" run={debugging.stepOver} />
            <StepButton
              text="debugStepInto"
              icon="level down alternate"
              hotkey="debugStepInto"
              run={debugging.stepInto}
            />
            <StepButton text="debugStepOut" icon="level up alternate" hotkey="debugStepOut" run={debugging.stepOut} />
            <ui-button
              appearance="basic"
              size="mini"
              icon="stop"
              aria-label={appTexts.text("debugStop")}
              title={appTexts.text("debugStop")}
              onClick={() => debugging.stop()}
            />
          </span>
        </div>
        <Show when={shown()}>
          {(at) => (
            <div class="DebuggerValues">
              <FrameValues frame={at().frame} stops={stopped()} />
              <section>
                <h5>{appTexts.text("debugCalledFrom")}</h5>
                <ol class="DebuggerStack">
                  <For each={stack()} keyed={(each) => each.frame}>
                    {(each) => (
                      <li
                        class={{ picked: each().frame === at().frame }}
                        onClick={() => setPicked(each().frame)}
                        title={appTexts.text("debugStoppedAt", {
                          line: each().line + 1,
                          file: fileName(each().frame.path)
                        })}
                      >
                        <code>{declaredLine(each().frame)}</code>
                        <span class="DebuggerWhere">
                          {fileName(each().frame.path)}:{each().line + 1}
                        </span>
                      </li>
                    )}
                  </For>
                </ol>
              </section>
            </div>
          )}
        </Show>
      </section>
    </Show>
  )
}

/****************
 * ### `<StepButton>`
 * One of the debugger's buttons:  lit only while the app is stopped, its key in its tooltip.
 ****************/
function StepButton(props: {
  text: AppTextKey
  icon: string
  hotkey: keyof typeof EDITOR_HOTKEYS
  run: () => boolean
}) {
  const title = () => `${appTexts.text(props.text)} (${EDITOR_HOTKEYS[props.hotkey].shortcut})`
  return (
    <ui-button
      appearance="basic"
      size="mini"
      icon={props.icon}
      aria-label={title()}
      title={title()}
      disabled={debugging.stopped ? undefined : ""}
      onClick={() => props.run()}
    />
  )
}

/****************
 * ### `<FrameValues>`
 * What one action is working on, as it is right now:  its thing and the thing's properties, what it was given,
 * and what its lines have set so far.
 * - Read again at each stop (`stops`):  the program's values aren't spell state the page follows while it's held.
 ****************/
function FrameValues(props: { frame: DebugFrame; stops: unknown }) {
  const things = () => runtimeCore()?.things
  const values = createMemo(() => {
    void props.stops
    const registry = things()
    const { frame } = props
    const shownOf = (value: unknown): ShownValue => (registry ? shownValue(registry, value) : plainValue(value))
    const named = (record: Record<string, unknown>) =>
      Object.entries(record)
        .filter(([name]) => !HIDDEN_NAME.test(name))
        .map(([name, value]) => ({ name: wordsOf(name), value: shownOf(value) }))
    const thing = frame.thing as object | undefined
    const isThing = !!thing && !!registry?.isThing(thing)
    const properties = isThing
      ? registry!.propertiesOf(thing as never).map(({ name }) => {
          const read = registry!.read(thing as never, name)
          const value: ShownValue = "error" in read ? { kind: "error", text: read.error } : shownOf(read.value)
          return { name: wordsOf(name), value }
        })
      : []
    return {
      thing: isThing ? { label: registry!.labelOf(thing as never), thing: thing! } : undefined,
      properties,
      inputs: named(frame.inputs),
      setSoFar: named(frame.values)
    }
  })
  return (
    <>
      <Show when={values().thing}>
        {(it) => (
          <section>
            <h5>{appTexts.text("debugThing")}</h5>
            <button type="button" class="DebuggerThing" onClick={() => Inspector.inspectThing(it().thing)}>
              {it().label}
            </button>
            <ValueRows rows={values().properties} />
          </section>
        )}
      </Show>
      <section>
        <h5>{appTexts.text("debugInputs")}</h5>
        <ValueRows rows={values().inputs} />
      </section>
      <section>
        <h5>{appTexts.text("debugValues")}</h5>
        <ValueRows rows={values().setSoFar} />
      </section>
    </>
  )
}

/** Rows of names and values;  none:  "Nothing yet". */
function ValueRows(props: { rows: Array<{ name: string; value: ShownValue }> }) {
  return (
    <Show when={props.rows.length} fallback={<p class="DebuggerNothing">{appTexts.text("debugNothing")}</p>}>
      <dl class="DebuggerRows">
        <For each={props.rows}>
          {(row) => (
            <>
              <dt>{row.name}</dt>
              <dd class={row.value.kind}>
                <ValueText value={row.value} />
              </dd>
            </>
          )}
        </For>
      </dl>
    </Show>
  )
}

/** A value as text:  a thing a link to inspect it, a list its summary. */
function ValueText(props: { value: ShownValue }) {
  const value = () => props.value
  return (
    <Show
      when={value().kind === "thing" && (value() as Extract<ShownValue, { kind: "thing" }>)}
      fallback={textOf(value())}
    >
      {(it) => (
        <button type="button" class="DebuggerThing" onClick={() => Inspector.inspectThing(it().thing)}>
          {it().label}
        </button>
      )}
    </Show>
  )
}

////////////////
// ## The code
////////////////

/**
 * Hear the code's margin for as long as the debugger's up:  each file's breakpoints reach `debugging.setBreakpoints()`.
 * - Loads CodeMirror's debugger marks with the code, never before:  the code pane has loaded it by the time a margin
 *   can be clicked.
 */
function listenToTheMargin(): void {
  onSettled(() => {
    let stop: (() => void) | undefined
    let isGone = false
    void import("spell/app/app/ui/codemirror/CodeMirrorDebug")
      .then(({ CodeMirrorDebug }) => {
        if (!isGone) stop = CodeMirrorDebug.onBreakpoints(debugging.setBreakpoints)
      })
      .catch((error: unknown) => console.error("<Debugger>:  couldn't hear the code's margin", error))
    return () => {
      isGone = true
      stop?.()
    }
  })
}

/**
 * Light the line `at()` says in the code, opening its file in the code pane if another shows, and scrolling to it;
 * nothing stopped, no light.
 * - Never takes the keyboard's focus, nor moves the caret.
 */
function followTheStoppedLine(at: () => { path: string; line: number } | undefined): void {
  createEffect(at, (where) => {
    void showStopped(where).catch((error: unknown) =>
      console.error("<Debugger>:  couldn't show the stopped line", error)
    )
  })
}

/** `followTheStoppedLine()`'s work, once CodeMirror's marks have loaded. */
async function showStopped(where: { path: string; line: number } | undefined): Promise<void> {
  const { CodeMirrorDebug } = await import("spell/app/app/ui/codemirror/CodeMirrorDebug")
  const shownView = () => editor.getInputEditor()?.view
  if (
    where &&
    editor.file?.path !== where.path &&
    editor.project?.spellFiles.some((file) => file.path === where.path)
  ) {
    await editor.showFileQuietly(where.path)
  }
  const view = shownView()
  CodeMirrorDebug.showStopped(where, view ? [view] : [])
}

////////////////
// ## Helpers
////////////////

/** A file's name, from its path:  `Pile.spell`. */
function fileName(path: string): string {
  return SP.SpellProject.sourceNameOf(path).split("/").at(-1) ?? path
}

/** The line `frame`'s action is declared on, as written:  `to "move a card to a pile"`. */
function declaredLine(frame: DebugFrame): string {
  const file = editor.project?.spellFiles.find((each) => each.path === frame.path)
  return file?.contents?.split("\n")[frame.declaredAt]?.trim() || fileName(frame.path)
}

/** A name as people read it:  `end pile` for `end_pile`;  `endPile` too, for a property's code name. */
function wordsOf(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
}

/** A value as text, with no program's registry to name its things. */
function plainValue(value: unknown): ShownValue {
  if (value === undefined || value === null) return { kind: "empty" }
  if (typeof value === "string") return { kind: "text", text: JSON.stringify(value) }
  if (typeof value === "number" || typeof value === "boolean")
    return { kind: typeof value as "number", text: String(value) }
  return { kind: "other", text: appTexts.text("debugValueOf", { type: value.constructor?.name ?? typeof value }) }
}

/** A shown value's text, for any but a thing. */
function textOf(value: ShownValue): string {
  if (value.kind === "empty") return "—"
  if (value.kind === "list") return value.summary
  if (value.kind === "thing") return value.label
  return value.text
}

/** A name the program made for itself, not one its lines say:  `it_2`, the thing an `its` line reads. */
const HIDDEN_NAME = /^it_\d+$/
