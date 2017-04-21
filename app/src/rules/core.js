//
//	# Core `rules` -- simple datatypes, etc.
//
// NOTE: many of the below are created as custom Pattern subclasses for debugging.
//
import Rule from "../RuleSyntax";
import parser from "./_parser";

// re-export parser for testing.
export default parser;

// `whitespace` rule.
// NOTE `parser.parse("whitespace", "   ")` will return `undefined`
//		 because `parser.parse()` automatically eats whitespace at the start of a rule.
Rule.Whitespace = class whitespace extends Rule.Pattern {}
parser.addRule("whitespace", new Rule.Whitespace({ pattern: /\s+/, optional: true }));

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
Rule.Identifier = class identifier extends Rule.Pattern {};
let identifier = parser.addRule("identifier", new Rule.Identifier({
	pattern: /[a-z][\w\-]*/,
	// Convert "-" to "_" in source output.
	toSource: function(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));
parser.addRule("expression", identifier);

// Add English prepositions to identifier blacklist.
//
// Wikipedia "Preposition":
//	"Prepositions...are a class of words that
//	express spatial or temporal relations  (in, under, towards, before)
//	or mark various semantic roles (of, for).
// TESTME
parser.rules.identifier.addToBlacklist(
	"about", "above", "after", "and", "as", "at",
	"before", "behind", "below", "beneath", "beside", "between", "beyond", "by",
	"defined", "down", "during",
	"each", "empty", "exactly", "except",
	"for", "from",
	"greater",
	"in", "into",
	"less", "long",
	"minus", "more",
	"near", "not",
	"of", "off", "on", "onto", "opposite", "out", "outside", "over",
	"short", "since",
	"than", "then", "through", "thru", "to", "toward", "towards",
	"undefined", "under", "underneath", "unique", "until", "up", "upon", "upside",
	"versus", "vs",
	"with", "within", "without",
);

// Add common english verbs to identifier blacklist.
parser.rules.identifier.addToBlacklist(
	"are",
	"do", "does",
	"contains",
	"has", "have",
	"is",
	"repeat",
	"was", "were"
);

// Add special control keywords to identifier blacklist.
parser.rules.identifier.addToBlacklist(
	"else",
	"if",
	"otherwise",
	"while"
);

// `Type` = type name.
// MUST start with an upper-case letter (?)
Rule.Type = class type extends Rule.Pattern {};
let type = parser.addRule("type", new Rule.Type({
	pattern: /[A-Z][\w\-]*/,
	// Convert "-" to "_" in source output.
	toSource: function(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));
parser.addRule("expression", type);


// `number` as either float or integer, created with custom constructor for debugging.
Rule.Number = class number extends Rule.Pattern {};
let number = parser.addRule("number", new Rule.Number({
	pattern: /-?([0-9]*[.])?[0-9]+/,
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
	pattern: /-?([0-9]*[.])?[0-9]+/,
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
	pattern: /(?:"[^"]*"|'[^']*')/
}));
parser.addRule("expression", text);


// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
Rule.Boolean = class boolean extends Rule.Pattern {};
let bool = parser.addRule("boolean", new Rule.Boolean({
	pattern: /(true|false|yes|no|ok|cancel)\b/,
	toSource: function(context) {
		switch (this.matched) {
			case "true":
			case "yes":
			case "ok":
				return true;
			default:
				return false;
		}
	}
}));
parser.addRule("expression", bool);
// Add boolean tokens to identifier blacklist.
// TESTME
parser.rules.identifier.addToBlacklist(
	"true", "false",
	"yes", "no",
	"ok", "cancel"
);

// Literal list (array), eg:  `[1,2,true,false ]`
let list = parser.addExpression(
	"literal_list",
	"\\[[list:{expression},]?\\]",
	undefined,
	class literal_list extends Rule.Expression {
		// When gathering arguments, return just the matched list data, ignoring the brackets.
		get args() {
			return this.results[1];
		}

		// return just the list as our source
		toSource(context) {
 			return this.args.toSource(context);
		}
	}
);

// Literal value as number, text or boolean.
//TODO: this is an expression... but installing it that way breaks parsing...?
//TESTME: add literal-list to this?
parser.addSyntax("literal", "(literal:{number}|{text}|{boolean}|{literal_list})");
