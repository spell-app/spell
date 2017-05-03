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
// NOTE `parser.parseRule("whitespace", "   ")` will return `undefined`
//		 because `parser.parseRule()` automatically eats whitespace at the start of a rule.
Rule.Whitespace = class whitespace extends Rule.Pattern {}
parser.addRule("whitespace", new Rule.Whitespace({ pattern: /\s+/, optional: true }));


// `word` = is a single alphanumeric word.
// MUST start with a lower-case letter (?)
Rule.Word = class word extends Rule.Pattern {};
let word = parser.addRule("word", new Rule.Word({
	pattern: /\b[a-z][\w\-]*\b/,
	// Convert "-" to "_" in source output.
	toSource: function(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));


// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
Rule.Identifier = class identifier extends Rule.Pattern {};
let identifier = parser.addRule("identifier", new Rule.Identifier({
	pattern: /\b[a-z][\w\-]*\b/,

	// Convert "-" to "_" in source output.
	toSource(context) {
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
	"I", "in", "into",
	"less", "long",
	"me", "minus", "more",
	"near", "not",
	"of", "off", "on", "onto", "opposite", "out", "outside", "over",
	"short", "since",
	"than", "the", "then", "through", "thru", "to", "toward", "towards",
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
parser.addRule("type", new Rule.Type({
	pattern: /([A-Z][\w\-]*|text|number|integer|decimal|character|boolean|object)/,
	// Convert "-" to "_" in source output.
	toSource: function(context) {
		let value = this.matched;
		switch(value) {
			// special case to take the following as lowercase
			case "text":		return "String";
			case "character":	return "Character";
			case "number":		return "Number";
			case "integer":		return "Integer";
			case "decimal":		return "Decimal";
			case "boolean":		return "Boolean";
			case "object":		return "Object";
			default:
				return value.replace(/\-/g, "_");
		}
	}
}));
parser.rules.type.addToBlacklist("I");
parser.addRule("expression", parser.rules.type);


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
	class literal_list extends Rule.Expression {
		get results() {
			return super.results.list;
		}

		getItem(index) {
			let list = this.results;
			if (list) return list.matched[index];
		}

		toSource(context) {
			let list = this.results;
			if (!list) return "[]";
 			return list.toSource(context);
		}
	}
);


// Parenthesized expression
//TESTME
parser.addExpression(
	"parenthesized_expression",
	"\\({expression}\\)",
	class parenthesized_expression extends Rule.Expression {
		get results() {
			return this.matched[1];
		}
		toSource(context) {
			let expression = this.results.toSource(context);
			// don't double parens if not necessary
			if (typeof expression === "string" && expression.startsWith("(") && expression.endsWith(")")) return expression;
			return `(${expression})`;
		}
	}
)
