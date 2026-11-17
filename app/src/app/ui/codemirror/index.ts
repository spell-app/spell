/**
 * Barrel for the app's CodeMirror editor:  its file states, its base setup, the converter from the language service,
 * and Spell's features on it.
 * - NOTE: NOT in the `UI` barrel, and NEVER imported statically outside this folder and `spell/app/app/solid/codemirror`
 *   -- types aside:  it loads lazily, so CodeMirror stays out of the main bundle.
 * - NOTE: leaves out the test page's entry, `CodeMirrorTest.tsx`:  it draws the page as it loads.
 * - NOTE: leaves out the right-click menu, `CodeMirrorMenu`:  it's the app's own menu (`spell/app/app/solid`), which
 *   `<spell-editor>`'s chunk, this barrel, mustn't bring.  Import it by its file, where the app is.
 */
export * from "./LspToCodeMirror"
export * from "./CodeMirrorSetup"
export * from "./CodeMirrorFollowed"
export * from "./CodeMirrorRelayout"
export * from "./CodeMirrorSelection"
export * from "./CodeMirrorMarkup"
export * from "./CodeMirrorBubbly"
export * from "./CodeMirrorTokens"
export * from "./CodeMirrorLook"
export * from "./CodeMirrorPopups"
export * from "./CodeMirrorPinned"
export * from "./CodeMirrorLanguage"
export * from "./CodeMirrorRename"
export * from "./CodeMirrorPeek"
export * from "./CodeMirrorTyping"
export * from "./CodeMirrorCodeOrText"
export * from "./CodeMirrorValues"
export * from "./CodeMirrorLinks"
export * from "./CodeMirrorHovers"
export * from "./CodeMirrorHeadings"
export * from "./FileStates"
export * from "./CodeMirrorMerge"
export * from "./SpellCodeMirror"
