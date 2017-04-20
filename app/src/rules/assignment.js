//
//	# Rules for creating variables, property access, etc
//

import parser from "./_parser";
import "./core";

// re-export parser for testing.
export default parser;

// TODO: {property-expression} also works... {assignable-expression} ???
parser.addStatement("assignment", "{identifier} = {expression}", {
	toSource(context) {
		let args = this.args;
		let identifier = args.identifier.toSource();
		let value = args.expression.toSource();
		// TODO: declare identifier if not in scope, etc
		return `${identifier} = ${value}`;
	}
});
