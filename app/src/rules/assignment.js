//
//	# Rules for creating variables, property access, etc
//

import Rule from "../Rule";
import parser from "./_parser";

// re-export parser for testing.
export default parser;

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
//parser.addPattern("identifier", /^[a-z][\w\d\-_]*/);
let identifier = parser.addRule("identifier", new (class identifier extends Rule.Pattern{})({
	pattern: /^[a-z][\w\-]*/,
	// Convert "-" to "_" in source output.
	toSource: function(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));
parser.addRule("expression", identifier);
