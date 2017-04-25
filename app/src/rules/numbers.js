//
//	# Rules for dealing with numbers
//
import Rule from "../Rule";
import parser from "./_parser";
// re-export parser for testing.
export default parser;


// TODO: if `identifier` is "word", output `getWord()` etc
class index_expression extends Rule.Expression{
	toSource(context) {
		let { identifier, number, expression } = this.results;
		expression = expression.toSource(context);
		number = number.toSource(context);
		return `${expression}[${number} - 1]`;
// This is safer, but using the below for demo purposes
//		return `spell.getItem(${expression}, ${number})`;
	}
}

// Numeric index in a list-like thing:
//	- `item 1 of ...`
//	- `item #2 of ...`
// NOTE: these indices are ONE based, NOT zero based as is Javascript.
parser.addExpression("index_expression", "{identifier} (#)?{number:expression} of {expression}", index_expression);


parser.addSyntax("ordinal", "first", { toSource: () => 1 });
parser.addSyntax("ordinal", "second", { toSource: () => 2 });
parser.addSyntax("ordinal", "third", { toSource: () => 3 });
parser.addSyntax("ordinal", "fourth", { toSource: () => 4 });
parser.addSyntax("ordinal", "fifth", { toSource: () => 5 });
parser.addSyntax("ordinal", "sixth", { toSource: () => 6 });
parser.addSyntax("ordinal", "seventh", { toSource: () => 7 });
parser.addSyntax("ordinal", "eighth", { toSource: () => 8 });
parser.addSyntax("ordinal", "ninth", { toSource: () => 9 });
parser.addSyntax("ordinal", "tenth", { toSource: () => 10 });
parser.addSyntax("ordinal", "penultimate", { toSource: () => -2 });
parser.addSyntax("ordinal", "final", { toSource: () => -1 });
parser.addSyntax("ordinal", "last", { toSource: () => -1 });

// TODO: sixty-fifth, two hundred forty ninth...

// Alternative form for numeric index in a list-like thing.
// NOTE: don't add as an expression since we're auto-merged with `index_expression` above.
parser.addExpression("index_expression", "the {number:ordinal} {identifier} of {expression}", index_expression);

