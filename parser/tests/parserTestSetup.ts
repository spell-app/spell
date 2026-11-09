import { P } from "spell/parser/parser"

// Tests catch a badly-made match:  outside tests the check is off, as every parse paid for it.
P.Match.DEBUG_MATCH_INITIALIZATION = true
