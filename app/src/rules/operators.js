//
//	# Rules for creating variables, property access, etc
//

import Rule from "../Rule";
import parser from "./_parser";

// re-export parser for testing.
export default parser;


// `operator.transformer` MUST return a function which transforms two arguments (`lhs` and `rhs`) into output.
parser.addOperator("is", "is", { transformer(a,b) { return `(${a} != ${b})` }});
parser.addOperator("is-not", "is not", { transformer(a,b) { return `(${a} != ${b})` }});
parser.addOperator("type-of", "is (a|an)", { transformer(thing, type) { return `spell.typeof(${thing}, ${type})` }});
parser.addOperator("not-type-of", "is not (a|an)", { transformer(thing, type) { return `!spell.typeof(${thing}, ${type})` }});

parser.addOperator("gt", "(>|(is greater than))", { transformer(a,b) { return`(${a} > ${b})` }});
parser.addOperator("gte", "(>=|(is greater than or equal to))", { transformer(a,b) { return`(${a} >= ${b})` }});
parser.addOperator("lt", "(<|(is less than))", { transformer(a,b) { return`(${a} < ${b})` }});
parser.addOperator("lte", "(<=|(is less than or equal to))", { transformer(a,b) { return`(${a} <= ${b})` }});

parser.addSyntax(
	"operator-expression",
	"{lhs:expression} {operator} {rhs:expression}",
	{
		toSource(context) {
			let args = this.gatherArguments();
			let lhs = args.lhs.toSource(context);
			let rhs = args.rhs.toSource(context);

			let transformer = args.operator.transformer;
			if (typeof transformer !== "function") {
				throw new TypeError("Expected 'transformer' argument to be a function", args);
			}
			return transformer(lhs, rhs);
		}
	}
);
