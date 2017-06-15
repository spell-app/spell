//
//	# Rules for if statements.
//

import Parser from "../Parser";
import Rule from "../Rule";

// Create "if" parser context.
const parser = Parser.forContext("if");
export default parser;

// Import core rules.
import "./core";
parser.import("core");

//TESTME
parser.addStatement(
	"if",
	"if {condition:expression} (then|:)? {statement}?",
	class if_ extends Rule.Statement {
		toSource(context) {
			let { condition, statement } = this.getMatchedSource(context);
			if (statement) return `if (${condition}) { ${statement} }`;
			return `if (${condition})`
		}
	}
);

parser.addStatement(
	"backwards_if",
	"{statement} if {condition:expression} (?:(else|otherwise) {elseStatement:statement})?",
	class backwards_if extends Rule.Statement {
		testRule = new Rule.Match({ match: ["if"] });
		toSource(context) {
			let { condition, statement, elseStatement } = this.getMatchedSource(context);
			if (elseStatement) return `if (${condition}) { ${statement} } else { ${elseStatement} }`
			return `if (${condition}) { ${statement} }`;
		}
	}
);

parser.addStatement(
	"else_if",
	"(else|otherwise) if {condition:expression} (then|:) {statement}?",
	class else_if extends Rule.Statement {
		toSource(context) {
			let { condition, statement } = this.getMatchedSource(context);;
			if (statement) return `else if (${condition}) { ${statement} }`;
			return `else if (${condition})`
		}
	}
);

parser.addStatement(
	"else",
	"(else|otherwise) {statement}?",
	class else_ extends Rule.Statement {
		toSource(context) {
			let { statement } = this.getMatchedSource(context);
			if (statement) return `else { ${statement} }`;
			return `else`
		}
	}
);
