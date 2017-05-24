//
//	# Core `rules` -- simple datatypes, etc.
//
// NOTE: many of the below are created as custom Pattern subclasses for debugging.
//
import Rule from "../RuleSyntax";
import Tokenizer from "../Tokenizer";
import parser from "./_parser";

// re-export parser for testing.
export default parser;


Rule.Comment = class comment extends Rule {
	// Comments are specially nodes in our token stream.
	parse(parser, tokens, startIndex = 0, stack) {
		let token = tokens[startIndex];
		if (!(token instanceof Tokenizer.Comment)) return undefined;
		return this.clone({
			matched: token,
			nextStart: startIndex + 1
		});
	}

	toSource(context) {
		return `//${this.matched.whitespace}${this.matched.comment}`;
	}
}
parser.addRule("comment", Rule.Comment);


// `word` = is a single alphanumeric word.
// MUST start with a lower-case letter (?)
Rule.Word = class word extends Rule.Pattern {
	// Convert "-" to "_" in source output.
	toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
};
Rule.Word.prototype.pattern = /^[a-z][\w\-]*$/;
parser.addRule("word", Rule.Word);


// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
Rule.Identifier = class identifier extends Rule.Pattern {
	// Convert "-" to "_" in source output.
	toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
};
Rule.Identifier.prototype.pattern = /^[a-z][\w\-]*$/;
parser.addRule(["identifier", "expression"], Rule.Identifier);

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
Rule.Type = class type extends Rule.Pattern {
	// Convert "-" to "_" in source output.
	toSource(context) {
		let type = this.matched;
		switch(type) {
			// special case to take the following as lowercase
			case "text":		return "String";
			case "character":	return "Character";
			case "number":		return "Number";
			case "integer":		return "Integer";
			case "decimal":		return "Decimal";
			case "boolean":		return "Boolean";
			case "object":		return "Object";
			default:
				return type.replace(/\-/g, "_");
		}
	}
};
Rule.Type.prototype.pattern = /([A-Z][\w\-]*|text|number|integer|decimal|character|boolean|object)/;
parser.addRule(["type", "expression"], Rule.Type);
parser.rules.type.addToBlacklist("I");



// `number` as either float or integer, created with custom constructor for debugging.
// NOTE: you can also use `one`...`ten` as strings.'
// TODO:  `integer` and `decimal`?  too techy?
Rule.Number = class number extends Rule.Pattern {
	// Special words you can use as numbers...
	static NUMBER_NAMES = {
		zero: 0,
		one: 1,
		two: 2,
		three: 3,
		four: 4,
		five: 5,
		six: 6,
		seven: 7,
		eight: 8,
		nine: 9,
		ten: 10
	}

	// Numbers get encoded as numbers in the token stream.
	parse(parser, tokens, startIndex = 0) {
		let token = tokens[startIndex];
		// if a string, attempt to run through our NUMBER_NAMES
		if (typeof token === "string") token = Rule.Number.NUMBER_NAMES[token];
		if (typeof token !== "number") return undefined;
		return this.clone({
			matched: token,
			nextStart: startIndex + 1
		});
	}

	// Convert to number on source output.
	toSource(context) {
		return this.matched;
	}
};

parser.addRule(["number", "expression"], Rule.Number);

// Add number words to identifier blacklist.
// TESTME
parser.rules.identifier.addToBlacklist(
	"one", "two", "three", "four", "five",
	"six", "seven", "eight", "nine", "ten"
);


// Literal `text` string, created with custom constructor for debugging.
// You can use either single or double quotes on the outside (although double quotes are preferred).
// Returned value has enclosing quotes.
Rule.Text = class text extends Rule.Pattern {
	// Text strings get encoded as `text` objects in the token stream.
	parse(parser, tokens, startIndex = 0) {
		let token = tokens[startIndex];
		if (!(token instanceof Tokenizer.Text)) return undefined;
		return this.clone({
			matched: token,
			nextStart: startIndex + 1
		});
	}

	toSource(context) {
		return this.matched.quotedString;
	}
};
parser.addRule(["text", "expression"], Rule.Text);


// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
Rule.Boolean = class boolean extends Rule.Pattern {
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
};
Rule.Boolean.prototype.pattern = /^(true|false|yes|no|ok|cancel|success|failure)$/;
parser.addRule(["boolean", "expression"], Rule.Boolean);

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



//
//	"Special" rules for `Statements`/block processing.
// TODO: figure out some way to make this more in line with the rest of our rules
//

parser.addRule("statements", Rule.Statements);

// Blank line representation in statements output
Rule.BlankLine = class blank_line extends Rule {
	toSource(context) {
		return "\n";
	}
}
parser.addRule("blank_line", Rule.BlankLine);

// Open block representation in statements output
Rule.OpenBlock = class open_block extends Rule {
	toSource(context) {
		return "{";
	}
}
parser.addRule("open_block", Rule.OpenBlock);


// Close block representation in statements output
Rule.CloseBlock = class close_block extends Rule {
	toSource(context) {
		return "}";
	}
}
parser.addRule("close_block", Rule.CloseBlock);


// Parser error representation statements output
Rule.ParseError = class parse_error extends Rule {
	toSource(context) {
		let message = this.message.split("\n").join("\n// ");
		return `// ERROR: ${message}`;
	}
}
parser.addRule("parse_error", Rule.ParseError);
