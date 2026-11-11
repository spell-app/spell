/**
 * A page's chunk tree (epic `language` P47):  what a page file SAYS, for the notebook editor and agents.
 * - Its namespace is `PG`:  `import { PG } from "spell/parser/page"`, then `PG.PageView.read(text)`.
 * - What's here:
 *   - `page.types.ts`:  the chunk tree's nodes, spans and diagnostics
 *   - `PageFile`:  a file, read
 *   - `PageView`:  a file's chunk tree, built from the tokens spell's parser reads it as
 * - Above `spell/parser/spell` in the import graph:  it uses the language's page tokenizer there;
 *   nothing in `spell` imports it.
 */
export * as PG from "./"

export * from "./page.types"

export * from "./PageFile"
export * from "./PageView"
