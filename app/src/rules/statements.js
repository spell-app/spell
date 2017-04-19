//
//	# Rules for creating variables, property access, etc
//

import parser from "./_parser";
import "./core";

// re-export parser for testing.
export default parser;

//TESTME
parser.addStatement("if", "if {expression} then {number}?", {

	toSource(context) {
	}
});
