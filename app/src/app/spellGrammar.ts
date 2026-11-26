/**
 * The entry of `spell-grammar.js` (`yarn build:element`, `vite.code.config.ts`):  spell's ONE grammar for the element
 * builds (epic `solid-2-final` P11), the parser and its rules, which a page loads once whoever asks.
 * - Who:  `<spell-code>`'s colours (`SpellLanguage`, in the same build) and a `<spell-viewer>` layout's spell
 *   (`LayoutSpell`, in `vite.element.config.ts`'s build, which imports this file by its name:  `sharedFiles({ grammar: true })`).
 * - What they hand it is text, and what comes back is text or its own trees:
 *   so its `spell/util`, the code build's, never meets the viewer's.
 * - NOT `<spell-editor>`'s:  its language service's projects are watched by the editor's Solid, through ITS
 *   `spell/util`'s reactive engine, so it keeps a grammar of its own.
 * - Loaded lazily by both:  nothing up front imports it.
 */
export { P } from "spell/parser/parser"
export { SP } from "spell/parser/spell"
