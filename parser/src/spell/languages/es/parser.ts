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

import { coreEs } from "../../rules/core/core.es"
import { typesEs } from "../../rules/types/types.es"
import { variablesEs } from "../../rules/variables/variables.es"
import { constantsEs } from "../../rules/constants/constants.es"
import { assignmentEs } from "../../rules/assignment/assignment.es"
import { expressionsEs } from "../../rules/expressions/expressions.es"
import { statementsEs } from "../../rules/statements/statements.es"
import { mathEs } from "../../rules/math/math.es"
import { propertiesEs } from "../../rules/properties/properties.es"
import { eventsEs } from "../../rules/events/events.es"
import { ifEs } from "../../rules/if/if.es"
import { listsEs } from "../../rules/lists/lists.es"
import { UIEs } from "../../rules/UI/UI.es"
import { classesEs } from "../../rules/classes/classes.es"
import { methodsEs } from "../../rules/methods/methods.es"
import { asyncEs } from "../../rules/async/async.es"
import { testsEs } from "../../rules/tests/tests.es"
import { drawEs } from "../../rules/draw/draw.es"
import { JSXEs } from "../../rules/JSX/JSX.es"

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
