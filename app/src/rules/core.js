//
//	# Core `rules` -- simple datatypes, etc.
//
import Rule from "../Rule";
import parser from "./_parser";

// re-export parser for testing.
export default parser;

//
// Regex pattern rules with custom constructors for debugging
//
//parser.addPattern("whitespace", /^\s+/);
parser.addRule("whitespace", new (class whitespace extends Rule.Pattern{})({ pattern: /^\s+/, optional: true }));

// `Type` = type name.
// MUST start with an upper-case letter (?)
//parser.addPattern("typename", /^[A-Z][\w\d\-_]*/);
let type = parser.addRule("Type", new (class Type extends Rule.Pattern{})({
	pattern: /^[A-Z][\w\-]*/,
	// Convert "-" to "_" in source output.
	toSource: function(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));
parser.addRule("expression", type);


// `number` as either float or integer, created with custom constructor for debugging.
let number = parser.addRule("number", new (class number extends Rule.Pattern{})({
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
parser.addRule("integer", new (class integer extends Rule.Pattern{})({
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
let text = parser.addRule("text", new (class text extends Rule.Pattern{})({
	pattern: /^(?:"[^"]*"|'[^']*')/
}));
parser.addRule("expression", text);


// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
let bool = parser.addRule("boolean", new (class boolean extends Rule.Pattern{})({
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


// Literal value as number, text or boolean.
//parser.addExpression("literal", "(literal:{number}|{text}|{boolean})");


// Literal list (array), eg:  `[1,2,true,false ]`
let list = parser.addExpression(
	"literal-list",
	"\\[[list:{expression},]?\\]",
	{
		// return just the list as our source
		toSource(context) {
 			return this.gatherArguments().list.toSource();
		}
	}
);

