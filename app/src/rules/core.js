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
parser.addRule("whitespace", new Rule.Whitespace({ pattern: /\s+/ }));


// Generic rule to eat everything from start to end of the current line
// NOTE: due to our whitespace rules, whitespace BEFORE this will not be included.
// TODO: do not return EOL in results?
// TESTME
parser.addRule("eat_to_end_of_line", new (class eat_to_end_of_line extends Rule.Pattern {
	pattern = /.*\n?/;
}));

// Single-line comment symbol (with NO comment text).
// TESTME
parser.addRule("comment_symbol", new (class comment_symbol extends Rule.Pattern {
	pattern = /\s*(\/\/|--|#+)\s*/;
}));


// Comment 'expression"
// TODO: this does not preserve whitespace in the comment itself, which is probably wrong...
// TESTME
parser.addSequence(
	"comment",
	"{comment_symbol}{comment:eat_to_end_of_line}",
	class comment extends Rule.Sequence {
		toSource(context) {
			let { comment_symbol, comment } = this.getMatchedSource(context);
			return `// ${comment}`;
		}
	}
);


// `word` = is a single alphanumeric word.
// MUST start with a lower-case letter (?)
Rule.Word = class word extends Rule.Pattern {};
parser.addRule("word", new Rule.Word({
	pattern: /\b[a-z][\w\-]*\b/,
	// Convert "-" to "_" in source output.
	toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));


// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
Rule.Identifier = class identifier extends Rule.Pattern {};
parser.addRule("identifier", new Rule.Identifier({
	pattern: /\b[a-z][\w\-]*\b/,

	// Convert "-" to "_" in source output.
	toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));
parser.addRule("expression", parser.rules.identifier);

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
	"where", "with", "within", "without",
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
	toSource(context) {
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
// NOTE: you can also use `one`...`ten` as strings.
Rule.Number = class number extends Rule.Pattern {};
parser.addRule("number", new Rule.Number({
	pattern: /(-?([0-9]*[.])?[0-9]+|one|two|three|four|five|six|seven|eight|nine|ten)/,
	// Convert to number on source output.
	toSource(context) {
		var number = parseFloat(this.matched, 10);
		if (!isNaN(number)) return number;

		switch(this.matched) {
			case "one": return 1;
			case "two": return 2;
			case "three": return 3;
			case "four": return 4;
			case "five": return 5;
			case "six": return 6;
			case "seven": return 7;
			case "eight": return 8;
			case "nine": return 9;
			case "ten": return 10;
		}
	}
}));
parser.addRule("expression", parser.rules.number);

// Add number words to identifier blacklist.
parser.rules.identifier.addToBlacklist(
	"one", "two", "three", "four", "five",
	"six", "seven", "eight", "nine", "ten"
);

// Numeric `integer` only, created with custom constructor for debugging.
// NOTE: this WILL match a float, but the returned value will coerce to an integer.
// REVIEW: is this right?  Better to not match a float?
Rule.Integer = class integer extends Rule.Pattern {};
parser.addRule("integer", new Rule.Integer({
	pattern: /-?([0-9]*[.])?[0-9]+/,
	// Convert to integer on source output.
	toSource(context) {
		return parseInt(this.matched, 10);
	}
}));


// Literal `text` string, created with custom constructor for debugging.
// You can use either single or double quotes on the outside (although double quotes are preferred).
// Returned value has enclosing quotes.
// TODO: escaped quotes inside string
Rule.Text = class text extends Rule.Pattern {};
parser.addRule("text", new Rule.Text({
	pattern: /(?:"[^"]*"|'[^']*')/
}));
parser.addRule("expression", parser.rules.text);


// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
Rule.Boolean = class boolean extends Rule.Pattern {};
parser.addRule("boolean", new Rule.Boolean({
	pattern: /(true|false|yes|no|ok|cancel|success|failure)\b/,
	toSource(context) {
		switch (this.matched) {
			case "true":
			case "yes":
			case "ok":
			case "success":
				return true;
			default:
				return false;
		}
	}
}));
parser.addRule("expression", parser.rules.boolean);
// Add boolean tokens to identifier blacklist.
// TESTME
parser.rules.identifier.addToBlacklist(
	"true", "false",
	"yes", "no",
	"ok", "cancel",
	"success", "failure"
);

// Literal list (array), eg:  `[1,2,true,false ]`
parser.addExpression(
	"literal_list",
	"\\[[list:{expression},]?\\]",
	class literal_list extends Rule.Expression {
		toSource(context) {
			let { list } = this.getMatchedSource(context);
			return `[${list ? list.join(", ") : ""}]`;
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
