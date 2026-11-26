/**
 * Spell's grammar loads on first use here (epic `solid-2-final` P20):  a side-effect import,
 * `import "spell/parser/spell/grammarOnFirstUse"`, so `SP.loadGrammar()` knows how.
 * - For a page that holds projects with no grammar up front, and parses only now and then:  the editor (its worker
 *   parses), `<spell-editor>`, a layout's spell (`LayoutSpell`), `<spell-code>`'s colours.
 * - Its own file, never the barrel's:  the `import()` here makes the grammar a chunk of its own in any bundle it's in,
 *   and the editor's language worker, which takes the grammar up front, would pay for the split (`grammar.ts`).
 */
import { SP } from "spell/parser/spell"

SP.grammarLoadsWith(() => import("spell/parser/spell/languages/en"))
