// HACK: expose a bunch of stuff on `global` for browser debugging
import * as _ from "lodash-es"
import JSON5 from "json5"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { editor, runtimeCore } from "spell/app/app/editor"

// Stick interesting bits on `global` to make console debugging easier.
Object.assign(globalThis, {
  global: globalThis,
  _, // lodash
  JSON5,
  SpellParser: SP.SpellParser,
  rulex: P.Parser.rulexParser,
  // its `compileCache`:  `.counts`, and `= undefined` to compile with no cache
  SpellProject: SP.SpellProject,
  editor
})

// the grammar's, read when asked:  the page loads it only on first use (epic `solid-2-final` P20);
// `await SP.loadGrammar()` in the console first, if it isn't here
const grammarGlobals: Record<string, () => unknown> = {
  spellParser: () => SP.spellParser,
  parse: () => SP.spellParser.parse.bind(SP.spellParser),
  compile: () => SP.spellParser.compile.bind(SP.spellParser),
  exp: () => SP.parseExpression,
  tokenizer: () => SP.spellParser.tokenizer,
  tokenize: () => SP.spellParser.tokenize.bind(SP.spellParser)
}
for (const [name, get] of Object.entries(grammarGlobals))
  Object.defineProperty(globalThis, name, { get, configurable: true })
Object.assign(globalThis, { SP })

// the `core` programs run on -- the runtime's, NOT one of our own:  see `runtimeCore()`
Object.defineProperty(globalThis, "core", { get: runtimeCore, configurable: true })
