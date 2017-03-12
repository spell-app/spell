//
//	# Rules for creating variables, property access, etc
//

import Rule from "../Rule";
import parser from "./_parser";

// re-export parser for testing.
export default parser;

parser.addStatement(
	"assignment",
	"{identifier} = {literal}",
	{
		toSource(context) {
			let args = this.gatherArguments();
			let identifier = args.identifier.toSource();
			let statement = `${identifier} = ${args.literal.toSource()};`;

			// if identifier does not already exist in context, add it and `var`
			// TODO: `let` is maybe better???
			if (context && !context.variables[identifier]) {
				statement = `var ${statement}`
			}
			return statement;
		}
	}
);
