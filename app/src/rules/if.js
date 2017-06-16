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


// TODO: custom `getMatcher`:
//			- `condtion` wraps in parens if NOT wrapped

//TESTME
parser.addStatement(
	"if",
	"if {condition:expression} (then|:)? {statement}?",
	class if_ extends Rule.BlockStatement {
		toSource(context) {
			let { condition, statement, block } = this.getMatchedSource(context);
//			if (statement && block) throw new SyntaxError("if may only have inline statement OR block");
			let statements = Rule.Block.encloseStatements(statement, block);
			return `if (${condition}) ${statements}`;
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
			let output = `if (${condition}) { ${statement} }`;
			if (elseStatement) output += `\nelse { ${elseStatement} }`
			return output;
		}
	}
);

parser.addStatement(
	"else_if",
	"(else|otherwise) if {condition:expression} (then|:) {statement}?",
	class else_if extends Rule.BlockStatement {
		toSource(context) {
			let { condition, statement, block } = this.getMatchedSource(context);
//			if (statement && block) throw new SyntaxError("else if may only have inline statement OR block");
			let statements = Rule.Block.encloseStatements(statement, block);
			return `else if (${condition}) ${statements}`
		}
	}
);

parser.addStatement(
	"else",
	"(else|otherwise) (:)? {statement}?",
	class else_ extends Rule.BlockStatement {
		toSource(context) {
			let { statement, block } = this.getMatchedSource(context);
//			if (statement && block) throw new SyntaxError("else if may only have inline statement OR block");
			let statements = Rule.Block.encloseStatements(statement, block);
			return `else ${statements}`
		}
	}
);
