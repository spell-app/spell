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
	"item (#)?{number:integer} of {expression}",
	undefined,
	class index_expression extends Rule.Expression {
		toSource() {
			let args = this.args;
			let number = args.number.toSource();
			let expression = args.expression.toSource();
			return `spell.getItem(${expression}, ${number})`;
		}
	}
);

// `item # 1 of...`:  Numeric index in a list-like thing

// English words used for position of something in a list.
// TODO: `seventy-seventh`, `third-to-last`...
parser.addSyntax("ordinal", "(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|penultimate|last|final)", {
	toSource(context) {
		let ordinal = this.matched.toSource();
		switch (ordinal) {
			case "first":		return 1;
			case "second":		return 2;
			case "third":		return 3;
			case "fourth":		return 4;
			case "fifth":		return 5;
			case "sixth":		return 6;
			case "seventh":		return 7;
			case "eighth":		return 8;
			case "ninth":		return 9;
			case "tenth":		return 10;
			case "penultimate":	return -2;
			case "last":		return -1;
			case "final":		return -1;
		}
	}
});

// Alternative form for numeric index in a list-like thing.
// NOTE: don't add as an expression since we're auto-merged with `index_expression` above.
parser.addSyntax(
	"index_expression",
	"the {ordinal} item of {expression}",
	undefined,
	class index_expression extends Rule.Expression {
		toSource() {
			let args = this.args;
			let ordinal = args.ordinal.toSource();
			let expression = args.expression.toSource();
			return `spell.getItem(${expression}, ${ordinal})`;
		}
	}
);

