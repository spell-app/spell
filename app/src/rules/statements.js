//
//	# Rules for creating variables, property access, etc
//

import Rule from "../RuleSyntax";
import parser from "./_parser";
import "./core";

// re-export parser for testing.
export default parser;

class assignment extends Rule.Statement{
	toSource(context) {
		let { thing, value } = this.results;
		if (thing instanceof Rule.Identifier) {
			// TODO: declare identifier if not in scope, etc
		}

		return `${thing.toSource(context)} = ${value.toSource(context)}`;
	}
}

parser.addStatement("assignment", "{thing:expression} = {value:expression}", assignment);
parser.addStatement("assignment", "set {thing:expression} to {value:expression}", assignment);
