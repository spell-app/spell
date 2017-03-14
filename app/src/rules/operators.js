//
//	# Rules for infix and prefix operators.
//

import Rule from "../RuleSyntax";
import parser from "./_parser";

// re-export parser for testing.
export default parser;


// `operator.transformer` MUST return a function which transforms two arguments (`lhs` and `rhs`) into output.
parser.addInfixOperator("is", "is", { transformer(a,b) { return `(${a} != ${b})` }});
parser.addInfixOperator("is-not", "is not", { transformer(a,b) { return `(${a} != ${b})` }});

//TODO: `spell.isOfType(thing, type)`
parser.addInfixOperator("is-type-of", "is (a|an)", { transformer(thing, type) { return `spell.isOfType(${thing}, ${type})` }});
parser.addInfixOperator("is-not-type-of", "is not (a|an)", { transformer(thing, type) { return `!spell.isOfType(${thing}, ${type})` }});

//TODO: `spell.isIn(thing, collection)`
parser.addInfixOperator("is-in", "is in", { transformer(thing, type) { return `spell.isIn(${thing}, ${type})` }});
parser.addInfixOperator("is-not-in", "is not in", { transformer(thing, type) { return `!spell.isIn(${thing}, ${type})` }});
parser.addInfixOperator("is-one-of", "is one of", { transformer(thing, type) { return `spell.isIn(${thing}, ${type})` }});
parser.addInfixOperator("is-not-one-of", "is not one of", { transformer(thing, type) { return `!spell.isIn(${thing}, ${type})` }});

parser.addInfixOperator("gt", "(>|is greater than)", { transformer(a,b) { return`(${a} > ${b})` }});
parser.addInfixOperator("gte", "(>=|is greater than or equal to)", { transformer(a,b) { return`(${a} >= ${b})` }});
parser.addInfixOperator("lt", "(<|is less than)", { transformer(a,b) { return`(${a} < ${b})` }});
parser.addInfixOperator("lte", "(<=|is less than or equal to)", { transformer(a,b) { return`(${a} <= ${b})` }});

parser.addSyntax(
	"infix-operator-expression",
	"{lhs:expression} {operator:infix-operator} {rhs:expression}",
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


// `operator.transformer` MUST return a function which transforms argument (`lhs`) into output.
parser.addPostfixOperator("is-defined", "is defined", { transformer(thing) { return `(${thing} !== undefined)` }});
parser.addPostfixOperator("is-not-defined", "is not defined", { transformer(thing) { return `(${thing} === undefined)` }});
parser.addPostfixOperator("is-undefined", "is undefined", { transformer(thing) { return `(${thing} === undefined)` }});

//TODO: `spell.isEmpty(thing)`
parser.addPostfixOperator("is-empty", "is empty", { transformer(thing) { return `spell.isEmpty(${thing})` }});
parser.addPostfixOperator("is-not-empty", "is not empty", { transformer(thing) { return `!spell.isEmpty(${thing})` }});


parser.addSyntax(
	"postfix-operator-expression",
	"{lhs:expression} {operator:postfix-operator}",
	{
		toSource(context) {
			let args = this.gatherArguments();
			let lhs = args.lhs.toSource(context);
			let transformer = args.operator.transformer;
			if (typeof transformer !== "function") {
				throw new TypeError("Expected 'transformer' argument to be a function", args);
			}
			return transformer(lhs);
		}
	}
);
