/**
 * Assembles every spell rule module into ONE parser, `spellParser`.
 * - Not a plain re-export barrel:  this folder is a list of independent rule modules.
 *   - Each exports its rule classes and its own `SpellParser`.
 *   - Each module's `<module>.en.ts` registers its classes on that parser, with their English syntax and tests.
 *   - This file loads every `.en.ts`, then combines the parsers, via `spellParser.import(...)`.
 * - A module is a folder, one rule per file, e.g. `events/`:
 *   see "Parser rules" in spell's `AGENTS.md`.
 * - NOTE: import order matters in a few places -- see the comment above the `ParseError` import.
 * - Structural rules (`blank_line` / `block` / `line` / `parse_error`) are added directly, below.
 */
import { P } from "spell/parser/parser"
import { SpellParser } from "spell/parser/spell/SpellParser"
import { englishInflector } from "spell/parser/spell/languages/en/inflector"

// Structural rule classes, registered directly below.
import { Block, type DocComment } from "./Block"
import { BlockLine, SpellBlankLine } from "./BlockLine"
import { commitStatement, SpellStatement } from "./Statement"

// The following define "modules" of rule sets, which will be combined below.
import { core } from "./core"
import { types } from "./types"
import { variables } from "./variables"
import { constants } from "./constants"
import { assignment } from "./assignment"
import { expressions, Negatable } from "./expressions"
import { statements } from "./statements"
import { _if_ } from "./if"
import { JSX, SPELL_TAG_NAMES, isBareComponentName, type JSXMatchData, MarkdownBlock } from "./JSX"
import { lists } from "./lists"
import { math } from "./math"
import { properties } from "./properties"
import { events } from "./events"
import { UI } from "./UI"
import { classes, MarkdownDescription } from "./classes"
import { methods } from "./methods"
import { _async } from "./async"
import { draw } from "./draw"
import { tests } from "./tests"

// Each module's rules in English:  its syntax and tests, registered in the modules' order (epic `spanish` P3).
import "./core/core.en"
import "./types/types.en"
import "./variables/variables.en"
import "./constants/constants.en"
import "./assignment/assignment.en"
import "./expressions/expressions.en"
import "./statements/statements.en"
import "./if/if.en"
import "./JSX/JSX.en"
import "./lists/lists.en"
import "./math/math.en"
import "./properties/properties.en"
import "./events/events.en"
import "./UI/UI.en"
import "./classes/classes.en"
import "./methods/methods.en"
import "./async/async.en"
import "./draw/draw.en"
import "./tests/tests.en"

// NOTE: kept as the last import:  `ParseError.ts` MUST evaluate after every rule module above.
// It was `export { ParseError } from "./ParseError"`, which was hoisted to the same place.
import { ParseError } from "./ParseError"

/**
 * All core spell rules combined into a `SpellParser` instance.
 */
export const spellParser = new SpellParser({ module: "spell", inflector: englishInflector })

/**
 * Parse a spell "expression" with the default parser.
 */
export const parseExpression = (expression: string | P.Token | P.Token[], scope?: P.Scope) => {
  return spellParser.parse(expression, "expression", scope)
}

/** Export ParseError so we can create them programmatically. */
export { ParseError }
/** Export so a translation can register its own negatable words -- see `Negatable`. */
export { Negatable }
/** Export so callers can get at parse errors collected on a `block` / `line` match. */
export { type DocComment }
/** Export so anything which parses a statement on its own can lock it in, e.g. `SpellParser.commit()`. */
export { commitStatement }
/**
 * Export so editors can map a call's expression twin to its statement rule
 * -- see `SpellStatement.statementRuleOf()`.
 */
export { SpellStatement }
/** Export so `SpellParser`'s incremental parsing hooks can narrow to them. */
export { Block, BlockLine }

/**
 * The JSX module's `match.data` shape for `jsxElement`/`jsxAttribute`/`jsxExpression` matches
 * -- e.g. for UI code that reads them.
 */
export type { JSXMatchData }
/**
 * Export so editors can offer spell's own JSX tags, e.g. `<children/>` -- see `SPELL_TAG_NAMES`;
 * and so the spellx converter can tell a component's bare name -- see `isBareComponentName()`.
 */
export { SPELL_TAG_NAMES, isBareComponentName }

/** Export so editors can show a type's `<markdown>` description where its docstring shows -- e.g. hover. */
export { MarkdownDescription }
/**
 * Export so a `<spell-viewer>` layout's `<markdown>` splits its holes as a drawing's does
 * -- see `MarkdownBlock.partsOf()`.
 */
export { MarkdownBlock }

// Structural rules.  `SpellBlankLine` and `BlockLine` set `static ruleName`:  their class names don't give them.
spellParser.addRule(SpellBlankLine)
spellParser.addRule(Block)
spellParser.addRule(BlockLine)
spellParser.addRule(ParseError)

// Import the other rules defined above.
spellParser.import(
  core,
  types,
  variables,
  constants,
  assignment,
  expressions,
  statements,
  math,
  properties,
  events,
  _if_,
  lists,
  UI,
  classes,
  methods,
  _async,
  tests,
  draw,
  JSX
)
