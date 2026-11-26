/**
 * HTML's whole entity table, up front:  `P.HTMLEntities` decodes every name from the start, with no load.
 * - For node programs and tests (`spell/parser/spell/languages/all` imports it), where size doesn't matter.
 * - A side-effect import:  `import "spell/parser/parser/htmlEntitiesUpFront"`.  The barrel never imports it:
 *   in a browser the table loads on first use (`P.HTMLEntities.load()`;  epic `solid-2-final` I64).
 */
import { decodeHTMLStrict } from "entities/decode"

import { P } from "spell/parser/parser"

P.HTMLEntities.install(decodeHTMLStrict)
