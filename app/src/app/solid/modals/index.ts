/**
 * Barrel for `spell/app/app/solid/modals`:  the app's dialogs, on `spell-ui`, each loaded the first time it's opened.
 * - `dialogs.ts`:  `alert()`, `confirm()`, `prompt()`, `promptForNumber()`, `choose()`, `askWithChoices()` -- what
 *   `editor`'s dialog methods call, through a dynamic `import()`.
 * - `Chooser.tsx`:  `<Chooser>` and `openChooser()`, behind `choose()`.
 * - `Choices.tsx`:  `<Choices>` and `openChoices()`, behind `askWithChoices()`:  a button per answer (epic `mockup` T52).
 * - `VersionsBox.tsx`:  `openVersions()`, the project menu's Versions, drawn by the editor's Spell (epic `editor` I115).
 * - `AppSnapshot.tsx`:  `openAppSnapshot()`, a project's card picture from its app as the person sets it up (epic `mockup` T47).
 * - `ShortcutsDialog.tsx`:  `openShortcuts()`, Help › Keyboard Shortcuts:  every key of `EDITOR_HOTKEYS` (epic `editor` P36).
 * - `YouPanel.tsx`:  `openYouPanel()`;  `PublishClash.tsx`:  `openPublishClash()`.
 * - `modals.types.ts`:  their props (`AlertModalProps` ...), which `Actions`' `DialogActionProps` take too.
 * - A CHUNK PER DIALOG (epic `solid-2-final` P11):  each function here imports its dialog's file the first time it's
 *   called, so an `alert()` loads the alerts alone, not every dialog and what they draw with (the Versions box
 *   brought the editor's Spell, about 400 KB brotli).
 *   - The barrel itself is small:  types, and these functions.
 *   - Their components and helpers (`<Chooser>`, `shortcutRows()`) are their files':  `spell/app/app/solid/modals/Chooser`.
 */
import type * as AppSnapshot from "./AppSnapshot"
import type * as Choices from "./Choices"
import type * as Chooser from "./Chooser"
import type * as Dialogs from "./dialogs"
import type * as PublishClash from "./PublishClash"
import type * as ShortcutsDialog from "./ShortcutsDialog"
import type * as VersionsBox from "./VersionsBox"
import type * as YouPanel from "./YouPanel"

export * from "./modals.types"
export type * from "./Chooser"
export type * from "./Choices"
export type * from "./YouPanel"
export type * from "./PublishClash"
export type * from "./VersionsBox"
export type * from "./AppSnapshot"
export type * from "./ShortcutsDialog"

export const alert = onFirstUse(() => import("./dialogs"), "alert")
export const confirm = onFirstUse(() => import("./dialogs"), "confirm")
export const prompt = onFirstUse(() => import("./dialogs"), "prompt")
export const promptForNumber = onFirstUse(() => import("./dialogs"), "promptForNumber")
export const choose = onFirstUse(() => import("./dialogs"), "choose")
export const askWithChoices = onFirstUse(() => import("./dialogs"), "askWithChoices")
export const openChooser = onFirstUse(() => import("./Chooser"), "openChooser")
export const openChoices = onFirstUse(() => import("./Choices"), "openChoices")
export const openYouPanel = onFirstUse(() => import("./YouPanel"), "openYouPanel")
export const openPublishClash = onFirstUse(() => import("./PublishClash"), "openPublishClash")
export const openVersions = onFirstUse(() => import("./VersionsBox"), "openVersions")
export const openAppSnapshot = onFirstUse(() => import("./AppSnapshot"), "openAppSnapshot")
export const openShortcuts = onFirstUse(() => import("./ShortcutsDialog"), "openShortcuts")

/** The dialogs' modules, as `onFirstUse()` loads them:  for its types alone. */
type DialogModules =
  | typeof Dialogs
  | typeof Chooser
  | typeof Choices
  | typeof YouPanel
  | typeof PublishClash
  | typeof VersionsBox
  | typeof AppSnapshot
  | typeof ShortcutsDialog

/**
 * Function `name` of the module `load()` imports, imported on its first call:  the same function, answering the same
 * promise, with its module a chunk of its own.
 * - Every function wrapped is async already:  it opens a dialog, which waits for an answer.
 */
function onFirstUse<Module extends DialogModules, Name extends keyof Module>(
  load: () => Promise<Module>,
  name: Name
): Module[Name] {
  const call = async (...args: unknown[]) => {
    const module = await load()
    return (module[name] as (...args: unknown[]) => unknown)(...args)
  }
  return call as Module[Name]
}
