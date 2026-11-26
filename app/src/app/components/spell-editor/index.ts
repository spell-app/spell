/**
 * The `spell-editor` family:  defines `<spell-editor>` and exports its component, `SpellEditor`,
 * and its DOM element, `DOMSpellEditorElement`.
 * - SIDE EFFECT:  importing it defines the tag (nothing, if something already has).
 * - Also the entry of `spell-editor.js` (`yarn build:element`, `vite.code.config.ts`, built with `<spell-code>`), which a page loads to edit
 *   spell, by itself or through the component pack, `spell.pack.js`:
 *
 *       <script type="module" src="/element/spell-editor.js"></script>
 *       <spell-editor project="@spell/examples/Solitaire" app="#game"></spell-editor>
 *
 * - Holds the parser, to compile in the page:  its grammar loads on first use (`spell/parser/spell/grammarOnFirstUse`,
 *   epic `solid-2-final` P20), `spell-grammar.js`'s.  CodeMirror is a chunk of its own, `spell-editor-codemirror.js`,
 *   loaded once there's a project to show.
 * - NEVER imports `spell/parser/core`, even indirectly:  apps run on their own copy (`spellRuntime.ts`).
 */

import { DOMSpellEditorElement, SpellEditor } from "./SpellEditor"

// spell's grammar, loaded as the first project parses
import "spell/parser/spell/grammarOnFirstUse"

SpellEditor.define()

export { SpellEditor, DOMSpellEditorElement }
