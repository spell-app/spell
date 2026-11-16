/**
 * Barrel for `spell/app/app/ui` (`UI`):  the types the app's UI shares.
 * - `ui.types.ts`:  editor selections, the explorers' saved state, the code editors' commands -- types, and one small
 *   error class, `RenameRefusedError`.
 * - NOT the app's own UI:  that's Solid, on `spell-ui`, in `spell/app/app/solid`.
 *   Spell PROGRAMS draw with Spell UI's `<ui-*>` elements
 *   (epic `output-targets` P11 retired the React kit that lived here).
 * - NOTE: deliberately left out:
 *   - `./ClassSchemas`:  a spell class as a property editor's schema,
 *     imported by path (`spell/app/app/ui/ClassSchemas`) where the editor is drawn, so this barrel stays types only
 *   - `./PropertyEditorFiles`:  a project's property editor pages, loaded by `editor.createPropertyEditor()` on use
 *   - `./AppTexts`:  the editor's words in the page's language;  its languages are lazy chunks, `AppTexts.<lang>.ts`
 *     - imported by path (`spell/app/app/ui/AppTexts`) by `editor.ts`, the panes and the web components
 *   - `./codemirror`:  the code editor's plumbing, loaded on first use through `spell/app/app/solid`'s `LazyCodeMirror`
 *   - `./CodeRules`, `./TextMarks`, `./MarkupMarks`:  the code's colours and the bubbly look, with no editor in
 *     them, imported by path by the code editor's lazy plumbing
 *   - `./CodeEditorFeatures`, `./ValuePopups`:  what the language features decide and draw, with no editor in them
 *     (epic `codemirror` P5), imported by path by the code editor's lazy plumbing too
 *   - `syntax.css`:  the syntax colours, imported by the Solid viewers that use them
 */

export * from "./ui.types"

export * as UI from "./"
