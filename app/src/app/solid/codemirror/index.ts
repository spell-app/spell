/**
 * Barrel for the app's CodeMirror editors, in Solid:
 * `<CodeMirrorEditor>`, `<FileEditor>`, `<CodeSlice>` and `<DiffView>`.
 * - NOTE: NOT in the `spell/app/app/solid` barrel, and NEVER imported statically outside this folder -- types aside:
 *   it loads on first use (`LazyCodeMirror`, `<spell-editor>`'s `loadCodeMirror()`), so CodeMirror stays out of
 *   the main bundle.
 * - NOTE: the plumbing under them (`FileStates`, `CodeMirrorSetup`, `LspToCodeMirror` ...) stays in
 *   `spell/app/app/ui/codemirror`, and is re-exported here, so code loading this lazily gets it from the same module.
 */
export * from "spell/app/app/ui/codemirror"

export * from "./CodeMirrorEditor"
export * from "./FileEditor"
export * from "./CodeSlice"
export * from "./DiffView"
