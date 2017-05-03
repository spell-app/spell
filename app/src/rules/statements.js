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
			let { expression } = this.results;
			return `return ${expression.toSource(context)}`;
		}
	}
);



//
//	## Assignment
//
class assignment extends Rule.Statement{
	toSource(context) {
		let { thing, value } = this.results;
		if (thing instanceof Rule.Identifier) {
			// TODO: declare identifier if not in scope, etc
		}

		return `${thing.toSource(context)} = ${value.toSource(context)}`;
	}
}

//TESTME
parser.addStatement("assignment", "{thing:expression} = {value:expression}", assignment);
//TESTME
parser.addStatement("assignment", "set {thing:expression} to {value:expression}", assignment);
//TESTME
parser.addStatement("assignment", "put {value:expression} into {thing:expression}", assignment);


//
//	## User interaction
//

// Alert a message.
// TODO: need some fancy promise juju here?
//TESTME
parser.addStatement("alert", "alert {message:expression} (buttonClause:with {text})?",
	class alert extends Rule.Statement {
		toSource(context) {
			let { message, buttonClause } = this.results;
			message = message.toSource(context);
			let buttonName = buttonClause ? buttonClause.results.text.toSource(context) : '"OK"';
			return `await spell.alert(${message}, ${buttonName})`;
		}
	}
);

// Warning message -- like alert but fancier.
// TODO: need some fancy promise juju here?
//TESTME
parser.addStatement("warn", "warn {expression:expression} (buttonClause:with {text})?",
	class warn extends Rule.Statement {
		toSource(context) {
			let { message, buttonClause } = this.results;
			message = message.toSource(context);
			let buttonName = buttonClause ? buttonClause.results.text.toSource(context) : '"OK"';
			return `await spell.warn(${message}, ${buttonName})`;
		}
	}
);


// Confirm message -- present a question with two answers.
// TODO: need some fancy promise juju here?
//TESTME
parser.addStatement("confirm", "confirm {message:expression} (buttonClause:with {okButton:text} (cancelClause: (and|or) {cancelButton:text})? )?",
	class confirm extends Rule.Statement {
		toSource(context) {
			let { message, buttonClause } = this.results;
			message = message.toSource(context);
			let okButton = '"OK"', cancelButton = '"Cancel"';

			if (buttonClause) {
				okButton = buttonClause.results.okButton.results.toSource(context);
				let cancelClause = buttonClause.results.cancelClause;
				if (cancelClause) cancelButton = cancelClause.results.cancelButton.results.toSource(context);
			}
			return `await spell.confirm(${message}, ${okButton}, ${cancelButton})`;
		}
	}
);
