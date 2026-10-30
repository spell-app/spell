import { onSettled } from "solid-js"

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
 * - Undo, Redo and Find are the code editor's own keys:  listed so the menus show them, bound by Monaco itself.
 */
export const EDITOR_HOTKEYS = {
  saveFile: { shortcut: "mod+S", run: () => editor.saveFile() },
  revertFile: { shortcut: "shift+mod+R", run: () => editor.revertFile() },
  compileApp: { shortcut: "mod+Enter", run: () => editor.compileApp() },
  createFile: { shortcut: "mod+N", run: () => editor.createFile() },
  stopInspecting: { shortcut: "Escape", run: stopInspecting, outsideCode: true },
  undo: { shortcut: "mod+Z", codeEditorAction: "undo" },
  redo: { shortcut: "shift+mod+Z", codeEditorAction: "redo" },
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
}

/**
 * Turn the editor page's shortcuts on while the page is up:  each of `EDITOR_HOTKEYS` that runs something,
 * on Spell UI's keyboard.
 * - Call in `<SpellEditor>`'s body.
 * - A Mod key works with Command or Control, on every system.
 * - A key typed into a field, or into the code editor, is left alone:  the code editor runs its own.
 * - Its keys are registered once Spell UI has loaded (`uiReady`), and taken off with the page.
 */
export function editorHotkeys(): void {
  onSettled(() => {
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
            const handler = (event: KeyboardEvent) => (isEditable(event) || run() === false ? false : undefined)
            disposers.push(UI.keyboard.register({ chord, handler }))
          }
        }
      })
      .catch((error: unknown) => console.error("editorHotkeys():  couldn't register the page's keys", error))
    return () => {
      isGone = true
      for (const dispose of disposers) dispose()
    }
  })
}

/**
 * Give the code editor (Monaco) the page's shortcuts as its own commands:  Save, Revert, Compile and Run, New File.
 * - Why:  a key typed in it is the code editor's, which the page's keys leave alone (`isEditable()`).
 * - Its own keys (Undo, Find ...) it binds itself;  Esc stays the page's.
 */
export function addCodeEditorKeys(codeEditor: monaco.editor.IStandaloneCodeEditor, api: typeof monaco): void {
  const { KeyMod, KeyCode } = api
  for (const hotkey of Object.values(EDITOR_HOTKEYS) as Hotkey[]) {
    const run = hotkey.run
    if (!run || hotkey.outsideCode) continue
    const chord = UI.keyboard.chord(hotkey.shortcut)
    const key = chord.key === "enter" ? KeyCode.Enter : KeyCode[`Key${chord.key.toUpperCase()}` as "KeyS"]
    const modifiers = KeyMod.CtrlCmd | (chord.shift ? KeyMod.Shift : 0)
    codeEditor.addCommand(modifiers | key, () => void run())
  }
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

/** A shortcut with Spell UI's Command-or-Control key, `mod`. */
const MOD = /(^|\+)mod(\+|$)/i
