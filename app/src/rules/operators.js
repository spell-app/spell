//
//	# Rules for infix and prefix operators.
//

import parser from "./_parser";
import "./core";

// re-export parser for testing.
export default parser;

//## Infix operators:   `{lhs} <operator> {rhs}`, eg: `a is 1`
// NOTE: `operator.transformer` MUST return a function which transforms two arguments (`lhs` and `rhs`) into output.

parser.addInfixOperator("and", "and", { transformer(a,b) { return `(${a} && ${b})` }});
parser.addInfixOperator("or", "or", { transformer(a,b) { return `(${a} || ${b})` }});

parser.addInfixOperator("is", "is", { transformer(a,b) { return `(${a} == ${b})` }});
parser.addInfixOperator("is-not", "is not", { transformer(a,b) { return `(${a} != ${b})` }});

parser.addInfixOperator("is-exactly", "is exactly", { transformer(a,b) { return `(${a} === ${b})` }});
parser.addInfixOperator("is-not-exactly", "is not exactly", { transformer(a,b) { return `(${a} !== ${b})` }});

//TODO: `spell.isOfType(thing, type)`
//TODO: `is same type as` ?
parser.addInfixOperator("is-type-of", ["is a", "is an"], { transformer(thing, type) { return `spell.isOfType(${thing}, '${type}')` }});
parser.addInfixOperator("is-not-type-of", ["is not a", "is not an"], { transformer(thing, type) { return `!spell.isOfType(${thing}, '${type}')` }});

//TODO: `spell.contains(collection, thing)`
parser.addInfixOperator("is-in", ["is in", "is one of"], { transformer(thing, list) { return `spell.contains(${list}, ${thing})` }});
parser.addInfixOperator("is-not-in", ["is not in", "is not one of"], { transformer(thing, list) { return `!spell.contains(${list}, ${thing})` }});
//TESTME
parser.addInfixOperator("includes", ["includes", "contains"], { transformer(list, thing) { return `spell.contains(${list}, ${thing})` }});
parser.addInfixOperator("doesnt-include", ["does not include", "doesnt include", "does not contain", "doesnt contain"], { transformer(list, thing) { return `!spell.contains(${list}, ${thing})` }});

parser.addInfixOperator("gt", [">", "is greater than"], { transformer(a,b) { return`(${a} > ${b})` }});
parser.addInfixOperator("gte", [">=", "is greater than or equal to"], { transformer(a,b) { return`(${a} >= ${b})` }});
parser.addInfixOperator("lt", ["<", "is less than"], { transformer(a,b) { return`(${a} < ${b})` }});
parser.addInfixOperator("lte", ["<=", "is less than or equal to"], { transformer(a,b) { return`(${a} <= ${b})` }});

//TODO:  can't add `+` as a rule, fix this then add these
//TODO:  operator precedence???
//TESTME
parser.addInfixOperator("plus", ["\\+", "plus"], { transformer(a,b) { return`${a} + ${b}` }});
parser.addInfixOperator("minus", ["-", "minus"], { transformer(a,b) { return`${a} - ${b}` }});
parser.addInfixOperator("times", ["\\*", "times"], { transformer(a,b) { return`${a} * ${b}` }});
parser.addInfixOperator("divided-by", ["/", "divided by"], { transformer(a,b) { return`${a} / ${b}` }});

//TODO:  `+=` etc?  other math functions?

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
