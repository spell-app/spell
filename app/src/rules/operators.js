//
//	# Rules for infix and prefix operators.
//

import Parser from "../Parser";
import Rule from "../RuleSyntax";

// Create "operators" parser context.
const parser = Parser.forContext("operators");
export default parser;

// Import core rules.
import "./core";
parser.import("core");

//## Infix operators:   `{lhs} <operator> {rhs}`, eg: `a is 1`
// NOTE: `operator.apply` MUST return a function which transforms two arguments (`lhs` and `rhs`) into output.

// NOTE: `precedence` numbers come from Javascript equivalents
//		 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence

parser.addRule("infix_operator", class infix_operator extends Rule.Alternatives{});

// TODO:
// 	// Find best match according to operator precedence as defined below.
// 	getBestMatch(matches) {
// 		console.warn("GBM", matches, matches.map(match => match.precedence), matches.map(match => match.matchedText));
// 		return matches.reduce(function (best, next) {
// 			// take highest precedence match first
// 			if (next.precedence > best.precedence) return next;
// 			// take longest match if same precedence
// 			if (next.precedence === best.precedence) {
// 				if (next.endIndex > best.endIndex) return next;
// 			}
// 			return best;
// 		}, matches[0]);
// 	}


parser.addExpression(
	"infix_operator_expression",
	"{lhs:expression} {operator:infix_operator} {rhs:expression}",
	class infix_operator_expression extends Rule.Expression {
		// We CANNOT match if `infix_operator` isn't found in the expression.
		testRule = "infix_operator";

		toSource(context) {
			let { lhs, rhs, operator } = this.results;
			return operator.apply(lhs.toSource(context), rhs.toSource(context));
		}
	}
);


parser.addKeyword("infix_operator", "and",
	class and extends Rule.Keyword { precedence = 6; apply(a,b) { return `(${a} && ${b})` } }
);

parser.addKeyword("infix_operator", "or",
	class or extends Rule.Keyword { precedence = 5; apply(a,b) { return `(${a} || ${b})` } }
);

parser.addKeyword("infix_operator", "is",
	 class is extends Rule.Keyword { precedence = 10; apply(a,b) { return `(${a} == ${b})` } }
);
parser.addKeyword("infix_operator", "is not",
	 class is_not extends Rule.Keyword { precedence = 10; apply(a,b) { return `(${a} != ${b})` } }
);

parser.addKeyword("infix_operator", "is exactly",
	class is_exactly extends Rule.Keyword { precedence = 10; apply(a,b) { return `(${a} === ${b})` } }
);
parser.addKeyword("infix_operator", "is not exactly",
	 class  extends Rule.Keyword { precedence = 10; apply(a,b) { return `(${a} !== ${b})` } }
);

//TODO: `spell.isOfType(thing, type)`
//TODO: `is same type as` ?
parser.addKeyword("infix_operator", "is a",
	 class is_a extends Rule.Keyword { precedence = 11; apply(thing, type) { return `spell.isOfType(${thing}, '${type}')` } }
);
parser.addKeyword("infix_operator", "is an",
	 class is_an extends Rule.Keyword { precedence = 11; apply(thing, type) { return `spell.isOfType(${thing}, '${type}')` } }
);

parser.addKeyword("infix_operator", "is not a",
	 class is_not_a extends Rule.Keyword { precedence = 11; apply(thing, type) { return `!spell.isOfType(${thing}, '${type}')` } }
);
parser.addKeyword("infix_operator", "is not an",
	 class is_not_an extends Rule.Keyword { precedence = 11; apply(thing, type) { return `!spell.isOfType(${thing}, '${type}')` } }
);

//TODO: `spell.contains(collection, thing)`
parser.addKeyword("infix_operator", "is in",
	 class is_in extends Rule.Keyword { precedence = 11; apply(thing, list) { return `${list}.includes(${thing})` } }
);
parser.addKeyword("infix_operator", "is one of",
	 class is_one_of extends Rule.Keyword { precedence = 11; apply(thing, list) { return `${list}.includes(${thing})` } }
);

parser.addKeyword("infix_operator", "is not in",
	 class is_not_in extends Rule.Keyword { precedence = 11; apply(thing, list) { return `!${list}.includes(${thing})` } }
);
parser.addKeyword("infix_operator", "is not one of",
	 class is_not_one_of extends Rule.Keyword { precedence = 11; apply(thing, list) { return `!${list}.includes(${thing})` } }
);



parser.addKeyword("infix_operator", "includes",
	 class includes extends Rule.Keyword { precedence = 11; apply(list, thing) { return `${list}.includes(${thing})` } }
);
parser.addKeyword("infix_operator", "contains",
	 class contains extends Rule.Keyword { precedence = 11; apply(list, thing) { return `${list}.includes(${thing})` } }
);

parser.addKeyword("infix_operator", "does not include",
	 class does_not_include extends Rule.Keyword { precedence = 11; apply(list, thing) { return `!${list}.includes(${thing})` } }
);
parser.addKeyword("infix_operator", "does not contain",
	 class does_not_contain extends Rule.Keyword { precedence = 11; apply(list, thing) { return `!${list}.includes(${thing})` } }
);


parser.addSymbol("infix_operator", ">",
	 class gt extends Rule.Symbol { precedence = 11; apply(a,b) { return`(${a} > ${b})` } }
);
parser.addKeyword("infix_operator", "is greater than",
	 class is_greater_than extends Rule.Keyword { precedence = 11; apply(a,b) { return`(${a} > ${b})` } }
);

parser.addSymbol("infix_operator", ">=",
	 class gte extends Rule.Symbol { precedence = 11; apply(a,b) { return`(${a} >= ${b})` } }
);
parser.addKeyword("infix_operator", "is greater than or equal to",
	 class is_gte extends Rule.Keyword { precedence = 11; apply(a,b) { return`(${a} >= ${b})` } }
);

parser.addSymbol("infix_operator", "<",
	 class lt extends Rule.Symbol { precedence = 11; apply(a,b) { return`(${a} < ${b})` } }
);
parser.addKeyword("infix_operator", "is less than",
	 class is_less_than extends Rule.Keyword { precedence = 11; apply(a,b) { return`(${a} < ${b})` } }
);

parser.addSymbol("infix_operator", "<=",
	 class lte extends Rule.Symbol { precedence = 11; apply(a,b) { return`(${a} <= ${b})` } }
);
parser.addKeyword("infix_operator", "is less than or equal to",
	 class is_lte extends Rule.Keyword { precedence = 11; apply(a,b) { return`(${a} <= ${b})` } }
);


parser.addSymbol("infix_operator", "\\+",
	 class plus extends Rule.Symbol { precedence = 13; apply(a,b) { return`${a} + ${b}` } }
);
parser.addKeyword("infix_operator", "plus",
	 class plus extends Rule.Keyword { precedence = 13; apply(a,b) { return`${a} + ${b}` } }
);

parser.addSymbol("infix_operator", "-",
	 class minus extends Rule.Symbol { precedence = 13; apply(a,b) { return`${a} - ${b}` } }
);
parser.addKeyword("infix_operator", "minus",
	 class minus extends Rule.Keyword { precedence = 13; apply(a,b) { return`${a} - ${b}` } }
);

parser.addSymbol("infix_operator", "\\*",
	 class times extends Rule.Symbol { precedence = 14; apply(a,b) { return`${a} * ${b}` } }
);
parser.addKeyword("infix_operator", "times",
	 class times extends Rule.Keyword { precedence = 14; apply(a,b) { return`${a} * ${b}` } }
);

parser.addSymbol("infix_operator", "/",
	 class divided_by extends Rule.Symbol { precedence = 14; apply(a,b) { return`${a} / ${b}` } }
);
parser.addKeyword("infix_operator", "divided by",
	 class divided_by extends Rule.Keyword { precedence = 14; apply(a,b) { return`${a} / ${b}` } }
);

//TODO:  `+=` etc?  other math functions?


//
//
//## Postifx operators:   `{lhs} <operator>`, e.g. `a is defined`
// NOTE: `operator.apply` MUST return a function which transforms argument (`lhs`) into JS output.

parser.addRule("postfix_operator", class postfix_operator extends Rule.Alternatives{});

parser.addExpression(
	"postfix_operator_expression",
	"{expression} {operator:postfix_operator}",
	class postfix_operator_expresion extends Rule.Expression {
		// We CANNOT match if `postfix_operator` isn't found in the expression.
		testRule = "postfix_operator";

		toSource(context) {
			let { expression, operator } = this.results;
			return operator.apply(expression.toSource(context));
		}
	}
);

parser.addKeyword("postfix_operator", "is defined",
	class is_defined extends Rule.Keyword { apply(thing) { return `(typeof ${thing} !== 'undefined')` } }
);
parser.addKeyword("postfix_operator", "is not defined",
	class is_not_defined extends Rule.Keyword { apply(thing) { return `(typeof ${thing} === 'undefined')` } }
);
parser.addKeyword("postfix_operator", "is undefined",
	class is_undefined extends Rule.Keyword { apply(thing) { return `(typeof ${thing} === 'undefined')` } }
);

//TODO: `spell.isEmpty(thing)`
parser.addKeyword("postfix_operator", "is empty",
	class is_empty extends Rule.Keyword { apply(thing) { return `spell.isEmpty(${thing})` } }
);
parser.addKeyword("postfix_operator", "is not empty",
	class is_not_empty extends Rule.Keyword { apply(thing) { return `!spell.isEmpty(${thing})` } }
);

