//
//	# Rules for creating variables, property access, etc
//

import Rule from "../Rule";
import parser from "./_parser";
import "./core";

// re-export parser for testing.
export default parser;

let if_expression = parser.addRule("if", new (class if_expression extends Rule.Alternatives{})());

//TESTME
parser.addStatement("if", "if {expression} (then|:) {statement}?", {
	toSource(context) {
		let { expression, statement } = this.results;
		expression = expression.toSource(context);
		statement = statement ? statement.toSource(context) : undefined;
		if (statement) return `if (${expression}) { ${statement} }`;
		return `if (${expression})`
	}
});

parser.addStatement("if", "{statement} if {expression}", {
	toSource(context) {
		let { expression, statement } = this.results;
		expression = expression.toSource(context);
		statement = statement ? statement.toSource(context) : undefined;
		if (statement) return `if (${expression}) { ${statement} }`;
		return `if (${expression})`
	}
});
