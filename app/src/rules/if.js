//
//	# Rules for creating variables, property access, etc
//

import Rule from "../Rule";
import parser from "./_parser";
import "./core";

// re-export parser for testing.
export default parser;

//TESTME
parser.addStatement(
	"if",
	"if {expression} (then|:)? {statement}?",
	class if_ extends Rule.Statement {
		toSource(context) {
			let { expression, statement } = this.results;
			expression = expression.toSource(context);
			statement = statement ? statement.toSource(context) : undefined;

			if (statement) return `if (${expression}) { ${statement} }`;
			return `if (${expression})`
		}
	}
);

parser.addStatement(
	"backwards_if",
	"{statement} if {expression} (elsePhrase:(else|otherwise) {statement})?",
	class backwards_if extends Rule.Statement {
		toSource(context) {
			let { expression, statement, elsePhrase } = this.results;
			expression = expression.toSource(context);
			statement = statement ? statement.toSource(context) : undefined;
			let elseStatement = elsePhrase && elsePhrase.results.statement.toSource();

			if (elseStatement) return `if (${expression}) { ${statement} } else { ${elseStatement} }`
			return `if (${expression}) { ${statement} }`;
		}
	}
);

parser.addStatement(
	"else_if",
	"(else|otherwise) if {expression} (then|:) {statement}?",
	class else_if extends Rule.Statement {
		toSource(context) {
			let { expression, statement } = this.results;
			expression = expression.toSource(context);
			statement = statement ? statement.toSource(context) : undefined;

			if (statement) return `else if (${expression}) { ${statement} }`;
			return `else if (${expression})`
		}
	}
);

parser.addStatement(
	"else",
	"(else|otherwise) {statement}?",
	class else_ extends Rule.Statement {
		toSource(context) {
			let { statement } = this.results;
			statement = statement ? statement.toSource(context) : undefined;

			if (statement) return `else { ${statement} }`;
			return `else`
		}
	}
);
