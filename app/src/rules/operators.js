//
//	# Rules for infix and prefix operators.
//

import Rule from "../RuleSyntax";
import parser from "./_parser";
import "./core";

// re-export parser for testing.
export default parser;

//## Infix operators:   `{lhs} <operator> {rhs}`, eg: `a is 1`
// NOTE: `operator.toJS` MUST return a function which transforms two arguments (`lhs` and `rhs`) into output.

parser.addInfixOperator("and", "and", { toJS(a,b) { return `(${a} && ${b})` }});
parser.addInfixOperator("or", "or", { toJS(a,b) { return `(${a} || ${b})` }});

parser.addInfixOperator("is", "is", { toJS(a,b) { return `(${a} == ${b})` }});
parser.addInfixOperator("is_not", "is not", { toJS(a,b) { return `(${a} != ${b})` }});

parser.addInfixOperator("is_exactly", "is exactly", { toJS(a,b) { return `(${a} === ${b})` }});
parser.addInfixOperator("is_not_exactly", "is not exactly", { toJS(a,b) { return `(${a} !== ${b})` }});

//TODO: `spell.isOfType(thing, type)`
//TODO: `is same type as` ?
parser.addInfixOperator("is_type_of", ["is a", "is an"], { toJS(thing, type) { return `spell.isOfType(${thing}, '${type}')` }});
parser.addInfixOperator("is_not_type_of", ["is not a", "is not an"], { toJS(thing, type) { return `!spell.isOfType(${thing}, '${type}')` }});

//TODO: `spell.contains(collection, thing)`
parser.addInfixOperator("is_in", ["is in", "is one of"], { toJS(thing, list) { return `${list}.includes(${thing})` }});
parser.addInfixOperator("is_not_in", ["is not in", "is not one of"], { toJS(thing, list) { return `!${list}.includes(${thing})` }});
//TESTME
parser.addInfixOperator("includes", ["includes", "contains"], { toJS(list, thing) { return `${list}.includes(${thing})` }});
parser.addInfixOperator("doesnt_include", ["does not include", "doesnt include", "does not contain", "doesnt contain"], { toJS(list, thing) { return `${list}.includes(${thing})` }});

parser.addInfixOperator("gt", [">", "is greater than"], { toJS(a,b) { return`(${a} > ${b})` }});
parser.addInfixOperator("gte", [">=", "is greater than or equal to"], { toJS(a,b) { return`(${a} >= ${b})` }});
parser.addInfixOperator("lt", ["<", "is less than"], { toJS(a,b) { return`(${a} < ${b})` }});
parser.addInfixOperator("lte", ["<=", "is less than or equal to"], { toJS(a,b) { return`(${a} <= ${b})` }});

//TODO:  can't add `+` as a rule, fix this then add these
//TODO:  operator precedence???
//TESTME
parser.addInfixOperator("plus", ["\\+", "plus"], { toJS(a,b) { return`${a} + ${b}` }});
parser.addInfixOperator("minus", ["-", "minus"], { toJS(a,b) { return`${a} - ${b}` }});
parser.addInfixOperator("times", ["\\*", "times"], { toJS(a,b) { return`${a} * ${b}` }});
parser.addInfixOperator("divided_by", ["/", "divided by"], { toJS(a,b) { return`${a} / ${b}` }});

//TODO:  `+=` etc?  other math functions?

parser.addExpression(
	"infix_operator_expression",
	"{lhs:expression} {operator:infix_operator} {rhs:expression}",
	class infix_operator_expression extends Rule.Expression {
		toSource(context) {
			let { lhs, rhs, operator } = this.results;
			return operator.toJS(lhs.toSource(context), rhs.toSource(context));
		}
	}
);

//## Postifx operators:   `{lhs} <operator>`, e.g. `a is defined`
// NOTE: `operator.toJS` MUST return a function which transforms argument (`lhs`) into JS output.

parser.addPostfixOperator("is_defined", "is defined", { toJS(thing) { return `(typeof ${thing} !== 'undefined')` }});
parser.addPostfixOperator("is_not_defined", ["is not defined", "is undefined"], { toJS(thing) { return `(typeof ${thing} === 'undefined')` }});

//TODO: `spell.isEmpty(thing)`
parser.addPostfixOperator("is_empty", "is empty", { toJS(thing) { return `spell.isEmpty(${thing})` }});
parser.addPostfixOperator("is_not_empty", "is not empty", { toJS(thing) { return `!spell.isEmpty(${thing})` }});

parser.addExpression(
	"postfix_operator_expression",
	"{expression} {operator:postfix_operator}",
	class postfix_operator_expresion extends Rule.Expression {
		toSource(context) {
			let { expression, operator } = this.results;
			return operator.toJS(expression.toSource(context));
		}
	}
);


// TODO: this should really be a general "expression"...
//parser.addSyntax("operator_expression", "(expression:{postfix_operator_expression}|{infix_operator_expression})");
