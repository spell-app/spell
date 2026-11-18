import { createSignal, onSettled } from "solid-js"

import { UI } from "spell/ui/core"
import { editor } from "spell/app/app/editor"
import { debugging } from "spell/app/app/Debugging"
import { ChangeThis, Inspector, PartEdits, uiReady, type PartAction } from "spell/app/app/solid"
import { codeEditors, type CodeEditorCommand, type CodeEditorHandle } from "spell/app/app/ui/ui.types"

/**
 * The editor page's keyboard shortcuts:  ONE list (`EDITOR_HOTKEYS`), which the page's keys, the code editor's
 * commands and the top bar's menus all read (epic `debut` P32).
 * - Each key, in Spell UI's words (`mod+S`:  ⌘S on a Mac, Ctrl+S elsewhere),
 *   is what a menu item shows (`<ui-action shortcut>`).
 * - The page's keys go through Spell UI's one keyboard (`UI.keyboard`), registered while the page is up
 *   (`editorHotkeys()`).
 * - Inside the code editor its own keymap runs them (`SpellCodeMirror.keymapFor()`);
 *   the page leaves a key typed there, or into any field, alone, so one press never runs twice.
 * - The code editor's own keys (Find, Go to Definition, Rename Symbol ...) are its commands,
 *   by neutral names (`codeEditorCommand`, epic `codemirror` P5):
 *   listed so the menus show them;  the code editor's keymap is made from this list.
 * - Cut, Copy, Paste, Duplicate and Delete are on what's selected in the app:  never a key in the code or a field,
 *   where the page leaves them alone.
 * - Undo and Redo go by focus (`undoWay()`):
 *   - in the code:  the code editor's own undo
 *   - in the running app, or on nothing (the page's body), in Run or Edit:
 *     the program's own first, a move in the game;  with none to undo, the key comes on to ours (epic `editor` I167)
 *     - the program's keys are registered after ours, so they're asked first (core's `listenForUndoKeys()`)
 *   - anywhere else in Edit, the Inspector's fields too:  the editor's history (`editor.history`);
 *     with nothing there, what was typed in the code, so a click on the app doesn't strand it (epic
 *     `elemental-spell` J116)
 */
export const EDITOR_HOTKEYS = {
  saveAll: { shortcut: "mod+S", run: () => editor.saveDraft() },
  revertChanges: { shortcut: "shift+mod+R", run: () => void editor.revertChanges() },
  compileApp: { shortcut: "mod+Enter", run: () => editor.compileApp() },
  // ⌘N is the browser's own New Window, which a page never gets:  ⌥⌘N, which neither Chrome nor Safari takes
  createFile: { shortcut: "alt+mod+N", run: () => editor.createFile() },
  stopInspecting: { shortcut: "Escape", run: stopInspecting, outsideCode: true },
  changeThis: { shortcut: "mod+K", run: () => ChangeThis.open(), outsideCode: true },
  undo: { shortcut: "mod+Z", codeEditorCommand: "undo", run: () => undoOutsideCode("undo"), inProperties: true },
  redo: { shortcut: "shift+mod+Z", codeEditorCommand: "redo", run: () => undoOutsideCode("redo"), inProperties: true },
  // find AND replace, as VS Code's ⌥⌘F:  its own ⌘R reloads the page here (Owen, epic `editor` I105)
  find: { shortcut: "mod+F", codeEditorCommand: "find" },
  goToDefinition: { shortcut: "F12", codeEditorCommand: "goToDefinition" },
  findReferences: { shortcut: "shift+F12", codeEditorCommand: "findReferences" },
  // VS Code's keys:  its own ⇧F12 is Peek References, which Find All References has here, so it's ⇧⌥F12 (epic `codemirror` I5)
  peekDefinition: { shortcut: "alt+F12", codeEditorCommand: "peekDefinition" },
  peekReferences: { shortcut: "shift+alt+F12", codeEditorCommand: "peekReferences" },
  rename: { shortcut: "F2", codeEditorCommand: "rename" },
  cutParts: { shortcut: "mod+X", run: () => partsAction("cut"), outsideCode: true },
  copyParts: { shortcut: "mod+C", run: () => partsAction("copy"), outsideCode: true },
  pasteParts: { shortcut: "mod+V", run: () => partsAction("paste"), outsideCode: true },
  duplicateParts: { shortcut: "mod+D", run: () => partsAction("duplicate"), outsideCode: true },
  deleteParts: { shortcut: "Backspace", run: () => partsAction("remove"), outsideCode: true },
  deletePartsForward: { shortcut: "Delete", run: () => partsAction("remove"), outsideCode: true },
  // the step debugger's, VS Code's keys (epic `editor` P33):  only while the app's stopped, else the key goes on
  debugContinue: { shortcut: "F5", run: () => debugging.goOn() },
  debugStepOver: { shortcut: "F10", run: () => debugging.stepOver() },
  debugStepInto: { shortcut: "F11", run: () => debugging.stepInto() },
  debugStepOut: { shortcut: "shift+F11", run: () => debugging.stepOut() }
} as const satisfies Record<string, Hotkey>

/** One of the editor's shortcuts, by name. */
export type HotkeyName = keyof typeof EDITOR_HOTKEYS

/** One shortcut:  its key, and what it does. */
export type Hotkey = {
  /** Its key, in Spell UI's words (`Chord`):  `mod+S`, `shift+mod+R`, `Escape`. */
  shortcut: string
  /** What it does;  none:  the code editor's own key, only shown. */
  run?: () => unknown
  /** The code editor's own command it is, which a menu item runs (`runCodeEditorCommand()`), by its neutral name. */
  codeEditorCommand?: CodeEditorCommand
  /** A key the code editor never takes (Esc):  the page's alone, never a code editor command. */
  outsideCode?: boolean
  /** A key that's still the page's in a property editor's field:  Undo, where the field's change is a step. */
  inProperties?: boolean
}

/**
 * Turn the editor page's shortcuts on while the page is up:  each of `EDITOR_HOTKEYS` that runs something,
 * on Spell UI's keyboard.
 * - Call in `<SpellEditor>`'s body.
 * - `isRunning`:  is it showing Run?  Undo is then the program's.
 * - A running program's ⌘Z, in the app or on nothing, is asked before ours:  its keys are registered later.
 * - A Mod key works with Command or Control, on every system.
 * - A key typed into a field, or into the code editor, is left alone:  the code editor runs its own.
 * - Its keys are registered once Spell UI has loaded (`uiReady`), and taken off with the page.
 */
export function editorHotkeys(isRunning: () => boolean): void {
  onSettled(() => {
    isRunningNow = isRunning
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
 * What the Edit menu's Undo and Redo reach now:  the code editor's own, or the editor's history;
 * `false` in Run:  the program's.
 * - A menu takes focus when it opens, so a focus in a menu doesn't count:  they go by where it was last.
 */
export function undoWay(): "code" | "history" | false {
  if (isRunningNow()) return false
  return focusInCode() ? "code" : "history"
}

/** Is it showing Run, where a press in the app is the program's? */
export function isRunningApp(): boolean {
  return isRunningNow()
}

/** Undo or redo pressed outside the code, where the code editor binds its own:  `false` in Run, so the key goes on. */
function undoOutsideCode(action: "undo" | "redo"): unknown {
  if (isRunningNow()) return false
  undoInEdit(action)
  return undefined
}

/**
 * Undo or redo in Edit with the focus off the code:  the side bar's change, else what was typed in the code
 * (epic `editor` I167's order;  epic `codemirror` Q2):  the code editor's own history.
 * - true if it did either.
 * - Leaves the focus where it is:  on the thing selected in the app, say.
 */
function undoInEdit(action: "undo" | "redo"): boolean {
  if (editor.history[action]()) return true
  const codeEditor = codeEditorNow()
  if (!codeEditor?.canUndo(action)) return false
  codeEditor.undo(action)
  return true
}

/**
 * The code editor the page's keys and menus reach now:  the one that has (or last had) the focus,
 * else the code pane's (`editor.getInputEditor()`).
 */
export function codeEditorNow(): CodeEditorHandle | undefined {
  return codeEditors.focused ?? editor.getInputEditor()
}

/**
 * A part key pressed outside the code:  on what's selected in the app.
 * - `false`:  not ours, so the key goes on:  in Run, or text is selected on the page, for ⌘C.
 */
function partsAction(action: PartAction): unknown {
  if (isRunningNow() || getSelection()?.toString()) return false
  return PartEdits.run(action) ? undefined : false
}

/** Cut, Copy or Paste from a menu:  the code editor's own in the code, else on what's selected in the app. */
export function cutCopyOrPaste(action: "cut" | "copy" | "paste"): void {
  if (undoWay() === "code") return runCodeEditorCommand(action)
  PartEdits.run(action)
}

/** Undo or redo from a menu, by `undoWay()`. */
export function undoOrRedo(action: "undo" | "redo"): void {
  const way = undoWay()
  if (way === "code") runCodeEditorCommand(action)
  else if (way === "history") undoInEdit(action)
}

/** Run the code editor's own `command` (`undo`, `find` ...), focusing it first.  Nothing without one. */
export function runCodeEditorCommand(command: CodeEditorCommand): void {
  codeEditorNow()?.run(command)
}

/** Was `event` typed into something editable:  a field, a `contenteditable`, or the code editor? */
export function isEditable(event: KeyboardEvent): boolean {
  const target = event.composedPath()[0]
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.matches("input, textarea, select") || !!target.closest(CODE_SELECTOR)
}

/** Is `event` in a property editor:  the Inspector's fields? */
function isInProperties(event: KeyboardEvent): boolean {
  return event.composedPath().some((target) => target instanceof Element && target.localName === PROPERTY_EDITOR)
}

/** Esc:  stop inspecting, while inspecting;  otherwise not ours (`false`), so the key goes on. */
function stopInspecting(): unknown {
  if (!Inspector.isInspecting) return false
  Inspector.stopInspecting()
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

/** What holds a code editor, and what a menu is:  see `undoWay()`. */
const CODE_SELECTOR = ".cm-editor"
const MENU_SELECTOR = "ui-menu, ui-dropdown, ui-action"
const PROPERTY_EDITOR = "ui-property-editor"

/** A shortcut with Spell UI's Command-or-Control key, `mod`. */
const MOD = /(^|\+)mod(\+|$)/i
