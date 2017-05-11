//
//	# Rules for creating variables, property access, etc
//

import Rule from "../RuleSyntax";
import parser from "./_parser";
import "./core";

// re-export parser for testing.
export default parser;


//
//	## Returns
//

// Return a value
//TESTME
parser.addStatement("return_statement", "return {expression}",
	class return_statement extends Rule.Statement {
		toSource(context) {
			let { expression } = this.getMatchedSource(context);
			return `return ${expression}`;
		}
	}
);



//
//	## Assignment
//
class assignment extends Rule.Statement {
	toSource(context) {
		let { thing, value } = this.getMatchedSource(context);
		// TODO: declare identifier if not in scope, etc
		return `${thing} = ${value}`;
	}
}

//TESTME
parser.addStatement("assignment", "{thing:expression} = {value:expression}", assignment);
//TESTME
parser.addStatement("assignment", "set {thing:expression} to {value:expression}", assignment);
//TESTME
parser.addStatement("assignment", "put {value:expression} into {thing:expression}", assignment);

//TESTME
parser.addStatement(
	"get_expression",
	"get {value:expression}",
	class get_expression extends Rule.Statement {
		toSource(context) {
			let { value } = this.getMatchedSource(context);;
			return `it = ${value}`
		}
	}
);



//
//	## User interaction
//

// Alert a message.
// TODO: need some fancy promise juju here?
//TESTME
parser.addStatement("alert", "alert {message:expression} (?:with {okButton:text})?",
	class alert extends Rule.Statement {
		toSource(context) {
			let { message, okButton = `"OK"` } = this.getMatchedSource(context);
			return `await spell.alert(${message}, ${okButton})`;
		}
	}
);

// Warning message -- like alert but fancier.
// TODO: need some fancy promise juju here?
//TESTME
parser.addStatement("warn", "warn {expression:expression} (?:with {okButton:text})?",
	class warn extends Rule.Statement {
		toSource(context) {
			let { message, okButton = `"OK"` } = this.getMatchedSource(context);
			return `await spell.warn(${message}, ${okButton})`;
		}
	}
);


// Confirm message -- present a question with two answers.
// TODO: need some fancy promise juju here?
//TESTME
parser.addStatement("confirm", "confirm {message:expression} (?:with {okButton:text} (?: (and|or) {cancelButton:text})? )?",
	class confirm extends Rule.Statement {
		toSource(context) {
			let { message, okButton = `"OK"`, cancelButton = `"Cancel"` } = this.getMatchedSource(context);
			return `await spell.confirm(${message}, ${okButton}, ${cancelButton})`;
		}
	}
);
