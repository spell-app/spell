/**
 * Barrel for `highlight/` -- drawing spell source outside an editor:
 * - `SpellHighlighter`:  its coloured spans, for `<ui-code language="spell">`
 * - `BubblyLayout`, `BubblyRoles`, `BubblyPresentation`:  the bubbly look, as data (its types in `highlight.types.ts`)
 * - `BubblyStretches`:  a drawing's lines as an editor marks them, for Monaco and VS Code
 * - Flattened into `spell/parser/spell`:  `SP.SpellHighlighter`, `SP.BubblyLayout`.
 * - The page's side is the app's:  its `<spell-code>` family registers it with `UI.code` (`SpellLanguage`),
 *   and draws the bubbly look (`BubblyHtml`).
 */

export * from "./highlight.types"
export * from "./SpellHighlighter"
export * from "./BubblyRoles"
export * from "./BubblyPresentation"
export * from "./BubblyLayout"
export * from "./BubblyStretches"
