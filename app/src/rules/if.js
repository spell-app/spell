//
//	# Rules for creating variables, property access, etc
//

import Rule from "../Rule";
import parser from "./_parser";
import "./core";

// re-export parser for testing.
export default parser;

class if_statement extends Rule.Statement {}

//TESTME
parser.addStatement(
	"if",
	"if {expression} (then|:) {statement}?",
	{
		toSource(context) {
			let { expression, statement } = this.results;
			expression = expression.toSource(context);
			statement = statement ? statement.toSource(context) : undefined;

			if (statement) return `if (${expression}) { ${statement} }`;
			return `if (${expression})`
		},
	},
	if_statement
);

parser.addStatement(
	"if",
	"{statement} if {expression} (elsePhrase:(else|otherwise) {statement})?",
	{
		toSource(context) {
			let { expression, statement, elsePhrase } = this.results;
			expression = expression.toSource(context);
			statement = statement ? statement.toSource(context) : undefined;
			let elseStatement = elsePhrase && elsePhrase.results.statement.toSource();

			if (elseStatement) return `if (${expression}) { ${statement} } else { ${elseStatement} }`
			return `if (${expression}) { ${statement} }`;
		},
	},
	if_statement
);

parser.addStatement(
	"if",
	"(else|otherwise) if {expression} (then|:) {statement}?",
	{
		toSource(context) {
			let { expression, statement } = this.results;
			expression = expression.toSource(context);
			statement = statement ? statement.toSource(context) : undefined;

			if (statement) return `else if (${expression}) { ${statement} }`;
			return `else if (${expression})`
		},
	},
	if_statement
);

parser.addStatement(
	"if",
	"(else|otherwise) {statement}?",
	{
		toSource(context) {
			let { statement } = this.results;
			statement = statement ? statement.toSource(context) : undefined;

			if (statement) return `else { ${statement} }`;
			return `else`
		},
	},
	if_statement
);
