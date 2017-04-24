//
//	# Rules for creating variables, property access, etc
//

import Rule from "../RuleSyntax";
import parser from "./_parser";
import "./core";

// re-export parser for testing.
export default parser;

// TODO: {property-expression} also works... {assignable-expression} ???
parser.addStatement("assignment", "{identifier} = {expression}",
	class assignment extends Rule.Statement {
		toSource(context) {
			let { identifier, expression } = this.results;
			// TODO: declare identifier if not in scope, etc
			return `${identifier.toSource(context)} = ${expression.toSource(context)}`;
		}
	}
);
