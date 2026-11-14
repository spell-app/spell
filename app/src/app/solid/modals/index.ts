/**
 * Barrel for `spell/app/app/solid/modals`:  the app's dialogs, on `spell-ui`.
 * - `dialogs.ts`:  `alert()`, `confirm()`, `prompt()`, `promptForNumber()`, `choose()` -- what `editor`'s dialog
 *   methods call, through a dynamic `import()`.
 * - `Chooser.tsx`:  `<Chooser>` and `openChooser()`, behind `choose()`.
 * - `VersionsBox.tsx`:  `openVersions()`, the project menu's Versions, drawn by the editor's Spell (epic `editor` I115).
 * - `modals.types.ts`:  their props (`AlertModalProps` ...), which `Actions`' `DialogActionProps` take too.
 */

export * from "./modals.types"

export * from "./dialogs"
export * from "./Chooser"
export * from "./YouPanel"
export * from "./PublishClash"
export * from "./VersionsBox"
