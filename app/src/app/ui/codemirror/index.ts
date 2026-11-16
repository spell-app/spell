/**
 * Barrel for the app's CodeMirror editor:  its file states, its base setup, the converter from the language service,
 * and Spell's features on it.
 * - NOTE: NOT in the `UI` barrel, and NEVER imported statically outside this folder and `spell/app/app/solid/codemirror`
 *   -- types aside:  it's to load lazily, as Monaco's does, so CodeMirror stays out of the main bundle.
 * - NOTE: leaves out the test page's entry, `CodeMirrorTest.tsx`:  it draws the page as it loads.
 */
export * from "./LspToCodeMirror"
export * from "./CodeMirrorSetup"
export * from "./CodeMirrorRelayout"
export * from "./CodeMirrorMarkup"
export * from "./CodeMirrorBubbly"
export * from "./CodeMirrorTokens"
export * from "./CodeMirrorLook"
export * from "./CodeMirrorPopups"
export * from "./CodeMirrorLanguage"
export * from "./CodeMirrorRename"
export * from "./CodeMirrorTyping"
export * from "./CodeMirrorCodeOrText"
export * from "./CodeMirrorValues"
export * from "./CodeMirrorLinks"
export * from "./CodeMirrorHovers"
export * from "./CodeMirrorHeadings"
export * from "./FileStates"
export * from "./SpellCodeMirror"
export * from "./CodeMirrorMenu"
