/**
 * Spellx:  spell's tag-shaped form, a `.spellx` file (epic `elemental-spell`).
 * - Its namespace is `SX`:  `import { SX } from "spell-parser/spellx"`, then `SX.SpellxReader.read(text)`.
 * - What's here:
 *   - `spellx.types.ts`:  the chunk tree's nodes, spans and diagnostics
 *   - `SpellxFile`:  a file, read
 *   - `SpellxReader`:  what reads one
 * - Above `spell-parser/spell` in the import graph:  it reads the language's words and messages there;
 *   nothing in `spell` imports it.
 */
export * as SX from "./"

export * from "./spellx.types"

export * from "./SpellxFile"
export * from "./SpellxReader"
