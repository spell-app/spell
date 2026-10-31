import { createSignal, onSettled } from "solid-js"

import { UI } from "spell/ui/core"
import { editor } from "spell/app/app/editor"
import { Inspector, uiReady } from "spell/app/app/solid"
import type { monaco } from "spell/app/app/solid/monaco"

/**
 * The editor page's keyboard shortcuts:  ONE list (`EDITOR_HOTKEYS`), which the page's keys, the code editor's
 * commands and the top bar's menus all read (epic `debut` P32).
 * - Each key, in Spell UI's words (`mod+S`:  ⌘S on a Mac, Ctrl+S elsewhere), is what a menu item shows
 *   (`<ui-action shortcut>`).
 * - The page's keys go through Spell UI's one keyboard (`UI.keyboard`), registered while the page is up
 *   (`editorHotkeys()`).
 * - Inside the code editor (Monaco) its own commands run them (`addCodeEditorKeys()`):  the page leaves a key typed
 *   there, or into any field, alone, so one press never runs twice.
 * - Find is the code editor's own key:  listed so the menus show it, bound by Monaco itself.
 * - Undo and Redo go by focus (`undoWay()`), decided here and nowhere else:
 *   - in the code:  the code editor's own undo
 *   - in the running app, in Run:  the program's own, as ever:  not ours, so the key goes on
 *   - anywhere else in Edit, the Inspector's fields too:  the editor's history (`editor.history`);
 *     with nothing there, the running program's
 */
export const EDITOR_HOTKEYS = {
  saveFile: { shortcut: "mod+S", run: () => editor.saveFile() },
  revertFile: { shortcut: "shift+mod+R", run: () => editor.revertFile() },
  compileApp: { shortcut: "mod+Enter", run: () => editor.compileApp() },
  createFile: { shortcut: "mod+N", run: () => editor.createFile() },
  stopInspecting: { shortcut: "Escape", run: stopInspecting, outsideCode: true },
  undo: { shortcut: "mod+Z", codeEditorAction: "undo", run: () => undoOutsideCode("undo"), inProperties: true },
  redo: { shortcut: "shift+mod+Z", codeEditorAction: "redo", run: () => undoOutsideCode("redo"), inProperties: true },
  find: { shortcut: "mod+F", codeEditorAction: "actions.find" }
} as const satisfies Record<string, Hotkey>

/** One of the editor's shortcuts, by name. */
export type HotkeyName = keyof typeof EDITOR_HOTKEYS

/** One shortcut:  its key, and what it does. */
export type Hotkey = {
  /** Its key, in Spell UI's words (`Chord`):  `mod+S`, `shift+mod+R`, `Escape`. */
  shortcut: string
  /** What it does;  none:  the code editor's own key, only shown. */
  run?: () => unknown
  /** The code editor's own action it is, which a menu item runs (`runCodeEditorAction()`). */
  codeEditorAction?: string
  /** A key the code editor never takes (Esc):  the page's alone, never a code editor command. */
  outsideCode?: boolean
  /** A key that's still the page's in a property editor's field:  Undo, where the field's change is a step. */
  inProperties?: boolean
}

/**
 * Turn the editor page's shortcuts on while the page is up:  each of `EDITOR_HOTKEYS` that runs something,
 * on Spell UI's keyboard.
 * - Call in `<SpellEditor>`'s body.  `isRunning`:  is it showing Run?  Undo is then the program's.
 * - A Mod key works with Command or Control, on every system.
 * - A key typed into a field, or into the code editor, is left alone:  the code editor runs its own.
 * - Its keys are registered once Spell UI has loaded (`uiReady`), and taken off with the page.
 */
export function editorHotkeys(isRunning: () => boolean): void {
  onSettled(() => {
    isRunningNow = isRunning
    // a program's undo keys come after ours on the keyboard, whenever it runs:  it asks first
    void editor
      .loadRuntime()
      .then(({ core }) => {
        core.pageUndoKey = (action) => !isRunningNow() && editor.history[action]()
      })
      .catch((error: unknown) => console.error("editorHotkeys():  couldn't reach the program's runtime", error))
    const disposers: (() => void)[] = []
    let isGone = false
    void uiReady
      .then(() => {
        if (isGone) return
        for (const hotkey of Object.values(EDITOR_HOTKEYS) as Hotkey[]) {
          const run = hotkey.run
          if (!run) continue
          for (const chord of chordsFor(hotkey.shortcut)) {
            // `false`:  not ours, so the key goes on (typed in a field, or Esc while not inspecting)
            const handler = (event: KeyboardEvent) =>
              (isEditable(event) && !(hotkey.inProperties && isInProperties(event))) || run() === false
                ? false
                : undefined
            disposers.push(UI.keyboard.register({ chord, handler }))
          }
        }
      })
      .catch((error: unknown) => console.error("editorHotkeys():  couldn't register the page's keys", error))
    // a click on nothing moves no focus, so a press counts too
    const followFocus = (event: Event) => {
      const target = event.composedPath()[0]
      if (target instanceof Element && !target.closest(MENU_SELECTOR)) setFocusInCode(!!target.closest(CODE_SELECTOR))
    }
    document.addEventListener("focusin", followFocus, true)
    document.addEventListener("pointerdown", followFocus, true)
    return () => {
      document.removeEventListener("focusin", followFocus, true)
      document.removeEventListener("pointerdown", followFocus, true)
      isGone = true
      for (const dispose of disposers) dispose()
    }
  })
}

/**
 * Give the code editor (Monaco) the page's shortcuts as its own commands:  Save, Revert, Compile and Run, New File.
 * - Why:  a key typed in it is the code editor's, which the page's keys leave alone (`isEditable()`).
 * - Its own keys (Undo, Redo, Find) it binds itself;  Esc stays the page's.
 */
export function addCodeEditorKeys(codeEditor: monaco.editor.IStandaloneCodeEditor, api: typeof monaco): void {
  const { KeyMod, KeyCode } = api
  for (const hotkey of Object.values(EDITOR_HOTKEYS) as Hotkey[]) {
    const run = hotkey.run
    // Monaco binds its own undo
    if (!run || hotkey.outsideCode || hotkey.codeEditorAction) continue
    const chord = UI.keyboard.chord(hotkey.shortcut)
    const key = chord.key === "enter" ? KeyCode.Enter : KeyCode[`Key${chord.key.toUpperCase()}` as "KeyS"]
    const modifiers = KeyMod.CtrlCmd | (chord.shift ? KeyMod.Shift : 0)
    codeEditor.addCommand(modifiers | key, () => void run())
  }
}

/**
 * What the Edit menu's Undo and Redo reach now:  the code editor's own, or the editor's history;
 * `false` in Run:  the program's.
 * - A menu takes focus when it opens, so a focus in a menu doesn't count:  they go by where it was last.
 */
export function undoWay(): "code" | "history" | false {
  if (isRunningNow()) return false
  return focusInCode() ? "code" : "history"
}

/** Undo or redo pressed outside the code, where the code editor binds its own:  `false` in Run, so the key goes on. */
function undoOutsideCode(action: "undo" | "redo"): unknown {
  if (isRunningNow()) return false
  editor.history[action]()
  return undefined
}

/** Undo or redo from a menu, by `undoWay()`. */
export function undoOrRedo(action: "undo" | "redo"): void {
  const way = undoWay()
  if (way === "code") runCodeEditorAction(action)
  else if (way === "history") editor.history[action]()
}

/** Run the code editor's own action `name` (`undo`, `actions.find`), focusing it first.  Nothing without one. */
export function runCodeEditorAction(name: string): void {
  const codeEditor = editor.getInputEditor()
  if (!codeEditor) return
  codeEditor.focus()
  codeEditor.trigger("menu", name, undefined)
}

/** Was `event` typed into something editable:  a field, a `contenteditable`, or the code editor (Monaco)? */
export function isEditable(event: KeyboardEvent): boolean {
  const target = event.composedPath()[0]
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.matches("input, textarea, select") || !!target.closest(".monaco-editor")
}

/** Is `event` in a property editor:  the Inspector's fields? */
function isInProperties(event: KeyboardEvent): boolean {
  return event.composedPath().some((target) => target instanceof Element && target.localName === PROPERTY_EDITOR)
}

/** Esc:  stop inspecting, while inspecting;  otherwise not ours (`false`), so the key goes on. */
function stopInspecting(): unknown {
  if (!Inspector.isPicking) return false
  Inspector.stopPicking()
  return undefined
}

/**
 * The chords `shortcut` stands for:  a Mod key as both Command and Control, so either works on every system;
 * any other key as written.
 */
function chordsFor(shortcut: string) {
  if (!MOD.test(shortcut)) return [UI.keyboard.chord(shortcut)]
  return [UI.keyboard.chord(shortcut, { isApple: true }), UI.keyboard.chord(shortcut, { isApple: false })]
}

/** Was the code editor focused last?  Not counting a menu:  see `undoWay()`. */
const [focusInCode, setFocusInCode] = createSignal(false)

/** Is the page showing Run?  What `editorHotkeys()` was handed. */
let isRunningNow: () => boolean = () => false

/** What holds the code editor, and what a menu is:  see `undoWay()`. */
const CODE_SELECTOR = ".monaco-editor"
const MENU_SELECTOR = "ui-menu, ui-dropdown, ui-action"
const PROPERTY_EDITOR = "ui-property-editor"

/** A shortcut with Spell UI's Command-or-Control key, `mod`. */
const MOD = /(^|\+)mod(\+|$)/i
