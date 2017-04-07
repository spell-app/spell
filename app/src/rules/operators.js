//
//	# Rules for infix and prefix operators.
//

import parser from "./_parser";
import "./core";

// re-export parser for testing.
export default parser;

//## Infix operators:   `{lhs} <operator> {rhs}`, eg: `a is 1`
// NOTE: `operator.transformer` MUST return a function which transforms two arguments (`lhs` and `rhs`) into output.

parser.addInfixOperator("is", "is", { transformer(a,b) { return `(${a} == ${b})` }});
parser.addInfixOperator("is-not", "is not", { transformer(a,b) { return `(${a} != ${b})` }});

parser.addInfixOperator("is-exactly", "is exactly", { transformer(a,b) { return `(${a} === ${b})` }});
parser.addInfixOperator("is-not-exactly", "is not exactly", { transformer(a,b) { return `(${a} !== ${b})` }});

//TODO: `spell.isOfType(thing, type)`
parser.addInfixOperator("is-type-of", "is (a|an)", { transformer(thing, type) { return `spell.isOfType(${thing}, '${type}')` }});
parser.addInfixOperator("is-not-type-of", "is not (a|an)", { transformer(thing, type) { return `!spell.isOfType(${thing}, '${type}')` }});

//TODO: `spell.isIn(thing, collection)`
parser.addInfixOperator("is-in", "is in", { transformer(thing, listy) { return `spell.isIn(${thing}, ${listy})` }});
parser.addInfixOperator("is-one-of", "is one of", { transformer(thing, listy) { return `spell.isIn(${thing}, ${listy})` }});
parser.addInfixOperator("is-not-in", "is not in", { transformer(thing, listy) { return `!spell.isIn(${thing}, ${listy})` }});
parser.addInfixOperator("is-not-one-of", "is not one of", { transformer(thing, listy) { return `!spell.isIn(${thing}, ${listy})` }});

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

			let transformer = args.operator.matched.transformer;
			return transformer(lhs, rhs);
		}
	}
);

//## Postifx operators:   `{lhs} <operator>`, e.g. `a is defined`
// NOTE: `operator.transformer` MUST return a function which transforms argument (`lhs`) into output.

parser.addPostfixOperator("is-defined", "is defined", { transformer(thing) { return `(typeof ${thing} !== 'undefined')` }});
parser.addPostfixOperator("is-not-defined", "is not defined", { transformer(thing) { return `(typeof ${thing} === 'undefined')` }});
parser.addPostfixOperator("is-undefined", "is undefined", { transformer(thing) { return `(typeof ${thing} === 'undefined')` }});

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
			let transformer = args.operator.matched.transformer;
			return transformer(lhs);
		}
	}
);


// TODO: this should really be a general "expression"...
parser.addSyntax("operator-expression", "(expression:{postfix-operator-expression}|{infix-operator-expression})");
