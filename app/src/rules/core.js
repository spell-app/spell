//
//	# Core `rules` -- simple datatypes, etc.
//
import Rule from "../RuleSyntax";
import parser from "./_parser";

// re-export parser for testing.
export default parser;

//
// Regex pattern rules with custom constructors for debugging
//
//parser.addPattern("whitespace", /^\s+/);
Rule.Whitespace = class whitespace extends Rule.Pattern {}
parser.addRule("whitespace", new Rule.Whitespace({ pattern: /^\s+/, optional: true }));

// `Type` = type name.
// MUST start with an upper-case letter (?)
//parser.addPattern("typename", /^[A-Z][\w\d\-_]*/);
Rule.Type = class Type extends Rule.Pattern {};
let type = parser.addRule("Type", new Rule.Type({
	pattern: /^[A-Z][\w\-]*/,
	// Convert "-" to "_" in source output.
	toSource: function(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));
parser.addRule("expression", type);


// `number` as either float or integer, created with custom constructor for debugging.
Rule.Number = class number extends Rule.Pattern {};
let number = parser.addRule("number", new Rule.Number({
	pattern: /^-?([0-9]*[.])?[0-9]+/,
	// Convert to number on source output.
	toSource: function(context) {
		return parseFloat(this.matched, 10);
	}
}));
parser.addRule("expression", number);


// Numeric `integer` only, created with custom constructor for debugging.
// NOTE: this WILL match a float, but the returned value will coerce to an integer.
// REVIEW: is this right?  Better to not match a float?
Rule.Integer = class integer extends Rule.Pattern {};
parser.addRule("integer", new Rule.Integer({
	pattern: /^-?([0-9]*[.])?[0-9]+/,
	// Convert to integer on source output.
	toSource: function(context) {
		return parseInt(this.matched, 10);
	}
}));


// Literal `text` string, created with custom constructor for debugging.
// You can use either single or double quotes on the outside (although double quotes are preferred).
// Returned value has enclosing quotes.
// TODO: escaped quotes inside string
Rule.Text = class text extends Rule.Pattern {};
let text = parser.addRule("text", new Rule.Text({
	pattern: /^(?:"[^"]*"|'[^']*')/
}));
parser.addRule("expression", text);


// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
Rule.Boolean = class boolean extends Rule.Pattern {};
let bool = parser.addRule("boolean", new Rule.Boolean({
	pattern: /^(true|false|yes|no|success|failure|ok|cancel)\b/,
	toSource: function(context) {
		switch (this.matched) {
			case "true":
			case "yes":
			case "success":
			case "ok":
				return true;
			default:
				return false;
		}
	}
}));
parser.addRule("expression", bool);

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
//parser.addPattern("identifier", /^[a-z][\w\d\-_]*/);
//TODO: don't accept certain keywords???
Rule.Identifier = class identifier extends Rule.Pattern {};
let identifier = parser.addRule("identifier", new Rule.Identifier({
	pattern: /^[a-z][\w\-]*/,
	// Convert "-" to "_" in source output.
	toSource: function(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));
parser.addRule("expression", identifier);

// Literal value as number, text or boolean.
//TODO: this is an expression... ?
parser.addSyntax("literal", "(literal:{number}|{text}|{boolean})");


// Literal list (array), eg:  `[1,2,true,false ]`
let list = parser.addExpression(
	"literal-list",
	"\\[[list:{expression},]?\\]",
	{
		gatherArguments() {
			return this.results[1];
		},
		// return just the list as our source
		toSource(context) {
 			return this.gatherArguments().toSource();
		}
	}
);

