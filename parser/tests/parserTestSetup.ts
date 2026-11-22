import { P } from "spell/parser/parser"

// every language pack, past English:  tests read them all (epic `solid-2-final` P11)
import "spell/parser/spell/languages/all"

// Tests catch a badly-made match:  outside tests the check is off, as every parse paid for it.
P.Match.DEBUG_MATCH_INITIALIZATION = true
