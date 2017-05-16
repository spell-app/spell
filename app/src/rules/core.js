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
parser.addRule(
	"whitespace",
	class whitespace extends Rule.Pattern {
		pattern = /\s+/;
	}
);


Rule.Comment = class comment extends Rule {
	// TODO: don't match comments INSIDE strings, etc
	pattern = /\s*(\/\/|--|#+)\s*(.*)\s*$/;
	parse(parser, stream, stack) {
		let match = stream.match(this.pattern);
		if (!match) return undefined;
		let endIndex = stream.startIndex + match[0].length;
		return this.clone({
			matched : {
				symbol: match[1],
				comment: match[2]
			},
			matchedText: match[0],
			startIndex: stream.startIndex,
			endIndex,
			stream
		});
	}

	toSource(context) {
		return `// ${this.matched.comment}`;
	}
}
parser.addRule("comment", Rule.Comment);


// `word` = is a single alphanumeric word.
// MUST start with a lower-case letter (?)
Rule.Word = class word extends Rule.Pattern {
	pattern = /\b[a-z][\w\-]*\b/;
	// Convert "-" to "_" in source output.
	toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
};
parser.addRule("word", Rule.Word);


// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
Rule.Identifier = class identifier extends Rule.Pattern {
	pattern = /\b[a-z][\w\-]*\b/;

	// Convert "-" to "_" in source output.
	toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
};
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
	pattern = /([A-Z][\w\-]*|text|number|integer|decimal|character|boolean|object)/;
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
};
parser.addRule(["type", "expression"], Rule.Type);
parser.rules.type.addToBlacklist("I");


// `number` as either float or integer, created with custom constructor for debugging.
// NOTE: you can also use `one`...`ten` as strings.'
Rule.Number = class number extends Rule.Pattern {
	pattern = /(-?([0-9]*[.])?[0-9]+|one|two|three|four|five|six|seven|eight|nine|ten)/;

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
// TODO: escaped quotes inside string
Rule.Text = class text extends Rule.Pattern {
	pattern = /(?:"[^"]*"|'[^']*')/;
};
parser.addRule(["text", "expression"], Rule.Text);


// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
Rule.Boolean = class boolean extends Rule.Pattern {
	pattern = /(true|false|yes|no|ok|cancel|success|failure)\b/;

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
parser.addRule( "blank_line", Rule.BlankLine);

// Open block representation in statements output
Rule.OpenBlock = class open_block extends Rule {
	toSource(context) {
		return "{";
	}
}
parser.addRule( "open_block", Rule.OpenBlock);


// Close block representation in statements output
Rule.CloseBlock = class close_block extends Rule {
	toSource(context) {
		return "}";
	}
}
parser.addRule( "close_block", Rule.CloseBlock);


// Parser error representation statements output
Rule.ParseError = class parse_error extends Rule {
	toSource(context) {
		return `// ERROR: ${this.message}`;
	}
}
parser.addRule( "parse_error", Rule.ParseError);
