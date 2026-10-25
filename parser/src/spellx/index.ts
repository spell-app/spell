/**
 * Spellx:  spell's tag-shaped form, a `.spellx` file (epic `elemental-spell`).
 * - Its namespace is `SX`:  `import { SX } from "spell-parser/spellx"`, then `SX.SpellxView.read(text)`.
 * - What's here:
 *   - `spellx.types.ts`:  the chunk tree's nodes, spans and diagnostics
 *   - `SpellxFile`:  a file, read
 *   - `SpellxView`:  a file's chunk tree, built from the tokens spell's parser reads it as
 *   - `CodeSpellWriter`:  the code spell a file means, as text ("Show as .spell")
 *   - `SpellxWriter`:  a `.spell` file written as spellx, the other way
 * - Above `spell-parser/spell` in the import graph:  it uses the language's spellx tokenizer there;
 *   nothing in `spell` imports it.
 */
export * as SX from "./"

export * from "./spellx.types"

export * from "./SpellxFile"
export * from "./SpellxView"
export * from "./CodeSpellWriter"
export * from "./SpellxWriter"
