//
//	# Rules for dealing with numbers
//
import Rule from "../Rule";
import parser from "./_parser";
// re-export parser for testing.
export default parser;

// WORKING FROM OTHER RULES (testme)
//	`the length of <list>`
//	`<thing> is not? in <list>`
//	`<list> is not? empty`


// TODO: 	`create list with <exp>, <exp>, <exp>`
// TODO:	`duplicate list`
// TODO:	`duplicate list with <exp>, <exp>, <exp>` ???

// TODO:	`the size of <list>` => will map to `list.size`...
//				- install `size` as an alias to `length`?
parser.addExpression(
	"list_length",
	"the? number of {identifier} in {list:expression}",
	class list_length extends Rule.Sequence {
		toSource(context) {
			let { list } = this.results;
			list = list.toSource(context);
			return `${list}.length`;
		}
	}
);

// Return the first position of specified item in the list as an array.
// NOTE: this position returned is **1-based**.
parser.addExpression(
	"list_position",
	"the? position of {thing:expression} in {list:expression}",
	class list_position extends Rule.Sequence {
		toSource(context) {
			let { thing, list } = this.results;
			thing = thing.toSource(context);
			list = list.toSource(context);
			return `spell.positionOf(${thing}, ${list})`
		}
	}
);




// Index expression: numeric position in some list.
// NOTE: Our positions are **1-based** and Javascript is **0-based**.
//		 e.g. `item 1 of the array`  = `array[0]`
//
// TODO: if `identifier` is "word", output `getWord()` etc
class position_expression extends Rule.Expression{
	toSource(context) {
		let { identifier, position, expression } = this.results;
		expression = expression.toSource(context);
		position = position.toSource(context);

		// If we got a positive number literal, compensate for JS 0-based arrays now,
		// for nicer output.
		if (typeof position === "number" && position > 0) {
			return `${expression}[${position - 1}]`;
		}
		return `spell.getItem(${expression}, ${position})`;

// This is safer, but using the above sometimes for demo purposes
//		return `spell.getItem(${expression}, ${position})`;
	}
}

// Numeric position in a list-like thing:
//	- `item 1 of ...`
//	- `item #2 of ...`
// NOTE: these indices are ONE based, NOT zero based as is Javascript.
parser.addExpression("position_expression", "{identifier} (#)?{position:expression} of (the?) {expression}", position_expression);

class ordinal extends Rule.Keyword {}
parser.addKeyword("ordinal", "first", ordinal, { toSource: () => 1 });
parser.addKeyword("ordinal", "second", ordinal, { toSource: () => 2 });
parser.addKeyword("ordinal", "third", ordinal, { toSource: () => 3 });
parser.addKeyword("ordinal", "fourth", ordinal, { toSource: () => 4 });
parser.addKeyword("ordinal", "fifth", ordinal, { toSource: () => 5 });
parser.addKeyword("ordinal", "sixth", ordinal, { toSource: () => 6 });
parser.addKeyword("ordinal", "seventh", ordinal, { toSource: () => 7 });
parser.addKeyword("ordinal", "eighth", ordinal, { toSource: () => 8 });
parser.addKeyword("ordinal", "ninth", ordinal, { toSource: () => 9 });
parser.addKeyword("ordinal", "tenth", ordinal, { toSource: () => 10 });
parser.addKeyword("ordinal", "penultimate", ordinal, { toSource: () => -2 });
parser.addKeyword("ordinal", "final", ordinal, { toSource: () => -1 });
parser.addKeyword("ordinal", "last", ordinal, { toSource: () => -1 });

// TODO: sixty-fifth, two hundred forty ninth...

// Alternative form for numeric position in a list-like thing.
parser.addExpression("position_expression", "the {position:ordinal} {identifier} of (the)? {expression}", position_expression);

