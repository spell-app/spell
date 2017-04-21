//
//	# Rules for dealing with numbers
//
import Rule from "../Rule";
import parser from "./_parser";
// re-export parser for testing.
export default parser;

let index_expression = parser.addRule("index_expression", new (class index_expression extends Rule.Alternatives{})());
parser.addRule("expression", index_expression);

// Numeric index in a list-like thing:
//	- `item 1 of ...`
//	- `item #2 of ...`
// NOTE: these indices are ONE based, NOT zero based as is Javascript.
// TODO: allow any identifier instead of `{item}` ?
parser.addSyntax("index_expression",
	"{identifier} (#)?{number:integer} of {expression}",
	undefined,
	class index_expression extends Rule.Expression {
		toSource(context) {
			let number = this.args.number.toSource(context);
			let expression = this.args.expression.toSource(context);
			return `spell.getItem(${expression}, ${number})`;
		}
	}
);


// Ordinal numbers: first, second, etc.
parser.addRule("ordinal", new (class ordinal extends Rule.Alternatives {})());

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
parser.addSyntax(
	"index_expression",
	"the {ordinal} {identifier} of {expression}",
	undefined,
	class index_expression extends Rule.Expression {
		toSource(context) {
			let ordinal = this.args.ordinal.toSource(context);
			let expression = this.args.expression.toSource(context);
			return `spell.getItem(${expression}, ${ordinal})`;
		}
	}
);

