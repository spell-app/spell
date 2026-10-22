/**
 * Spanish's parser:  spell's rule classes, registered with Spanish syntax and tests, one module at a time (epic `spanish`).
 * - Assembled as English's `spellParser` is (`rules/index.ts`):  the structural rules first, then each module's parser,
 *   in the same order, so ties break the same way.
 * - Each module's Spanish is its `rules/<module>/<module>.es.ts`.
 */
import { SpellParser } from "spell-lang/spell/SpellParser"
import { Block } from "spell-lang/spell/rules/Block"
import { BlockLine, SpellBlankLine } from "spell-lang/spell/rules/BlockLine"
import { ParseError } from "spell-lang/spell/rules/ParseError"

import { coreEs } from "spell-lang/spell/rules/core/core.es"
import { typesEs } from "spell-lang/spell/rules/types/types.es"
import { variablesEs } from "spell-lang/spell/rules/variables/variables.es"
import { constantsEs } from "spell-lang/spell/rules/constants/constants.es"
import { assignmentEs } from "spell-lang/spell/rules/assignment/assignment.es"
import { expressionsEs } from "spell-lang/spell/rules/expressions/expressions.es"
import { statementsEs } from "spell-lang/spell/rules/statements/statements.es"
import { mathEs } from "spell-lang/spell/rules/math/math.es"
import { propertiesEs } from "spell-lang/spell/rules/properties/properties.es"
import { eventsEs } from "spell-lang/spell/rules/events/events.es"
import { ifEs } from "spell-lang/spell/rules/if/if.es"
import { listsEs } from "spell-lang/spell/rules/lists/lists.es"
import { UIEs } from "spell-lang/spell/rules/UI/UI.es"
import { classesEs } from "spell-lang/spell/rules/classes/classes.es"
import { methodsEs } from "spell-lang/spell/rules/methods/methods.es"
import { asyncEs } from "spell-lang/spell/rules/async/async.es"
import { testsEs } from "spell-lang/spell/rules/tests/tests.es"
import { drawEs } from "spell-lang/spell/rules/draw/draw.es"
import { JSXEs } from "spell-lang/spell/rules/JSX/JSX.es"

import { spanishInflector } from "./inflector"

/** Spanish's parser:  every module's Spanish, assembled. */
export const spanishParser = new SpellParser({ module: "spell", inflector: spanishInflector })

spanishParser.addRule(SpellBlankLine)
spanishParser.addRule(Block)
spanishParser.addRule(BlockLine)
spanishParser.addRule(ParseError)

spanishParser.import(
  coreEs,
  typesEs,
  variablesEs,
  constantsEs,
  assignmentEs,
  expressionsEs,
  statementsEs,
  mathEs,
  propertiesEs,
  eventsEs,
  ifEs,
  listsEs,
  UIEs,
  classesEs,
  methodsEs,
  asyncEs,
  testsEs,
  drawEs,
  JSXEs
)
