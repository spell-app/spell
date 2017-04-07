//
//	# Rules for dealing with numbers
//
import Rule from "../RuleSyntax";
import parser from "./_parser";
// re-export parser for testing.
export default parser;


// Numeric index in a list-like thing.
parser.addExpression("index-expression", "item {number:integer} of {expression}", {
	toSource() {
		let args = this.gatherArguments();
		let number = args.number.toSource();
		let expression = args.expression.toSource();
		return `spell.getItem(${expression}, ${number})`;
	}
});

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
parser.addExpression("index-expression", "the {ordinal} item of {expression}", {
	toSource() {
		let args = this.gatherArguments();
		let ordinal = args.ordinal.toSource();
		let expression = args.expression.toSource();
		return `spell.getItem(${expression}, ${ordinal})`;
	}
});

