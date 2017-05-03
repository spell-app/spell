//
//	# Rules for dealing with numbers
//
import Rule from "../Rule";
import parser from "./_parser";
// re-export parser for testing.
export default parser;


// Index expression: numeric index in some list.
// NOTE: Our indexes are **1-based** and Javascript is **0-based**.
//		 e.g. `item 1 of the array`  = `array[0]`
//
// TODO: if `identifier` is "word", output `getWord()` etc
class index_expression extends Rule.Expression{
	toSource(context) {
		let { identifier, index, expression } = this.results;
		expression = expression.toSource(context);
		index = index.toSource(context);

		// If we got a positive number literal, compensate for JS 0-based arrays now.
		if (typeof index === "number" && index > 0) {
			return `${expression}[${index - 1}]`;
		}
		return `spell.getItem(${expression}, ${index})`;

// This is safer, but using the above for demo purposes
//		return `spell.getItem(${expression}, ${index})`;
	}
}

// Numeric index in a list-like thing:
//	- `item 1 of ...`
//	- `item #2 of ...`
// NOTE: these indices are ONE based, NOT zero based as is Javascript.
parser.addExpression("index_expression", "{identifier} (#)?{index:expression} of {expression}", index_expression);

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

// Alternative form for numeric index in a list-like thing.
parser.addExpression("index_expression", "the {index:ordinal} {identifier} of {expression}", index_expression);

