//	# Parser Rules
//	Rules can be as simple as a string `Keyword` or a complex sequence of (nested) rules.
//
//	Parse a rule with `rule.parse(parser, stream)`, this will either:
//		- return `undefined` if the rule doesn't match the head of the stream, or
//		- return a CLONE of the rule with at least the following:
//			- `stream`		Stream which was matched with `startIndex` at the start of the match
//			- `endIndex`	Non-inclusive end index in stream where match ends.
//
//	The clone returned above can be manipulated with
//		- `rule.gatherArguments()`		Return matched arguments in a format suitable to do:
//		- `rule.toSource()`				Return javascript source to interpret the rule.
//
import Parser from "./Parser";

export default class Rule {
	constructor(properties) {
		Object.assign(this, properties);
	}

	// Clone this rule and add any `props` passed in.
	clone(props) {
		var clone = Object.create(this);
		Object.assign(clone, props);
		return clone;
	}

	// For a rule instance associated with a stream,
	// return a new stream AFTER this rule's end.
	next() {
		if (!this.stream || this.endIndex === undefined)
			throw new TypeError(`rule.next() called on rule without a stream`, this);
		return this.stream.advanceTo(this.endIndex);
	}


//
// ## output as source
//
	// Output value for this INSTANTIATED rule as source.
	toSource() {
		return this.matched;
	}

//
// ## group: reflection
//
	get ruleType() {
		return this.constructor.name;
	}
}


// Rule for literal string value, which include punctuation such as `(` etc.
Rule.String = class String extends Rule {
	// Parse this rule at the beginning of `stream`, assuming no whitespace before.
	// Default is that `rule.string` is literal string to match.
	// On match, returns clone of rule with `value`, `stream` and `endIndex`.
	// Returns `undefined` if no match.
	parse(parser, stream) {
		if (!stream.startsWith(this.string)) return undefined;
		return this.clone({
			matched: this.string,
			endIndex: stream.startIndex + this.string.length,
			stream
		});
	}

	toString() {
		return this.string;
	}
}


// Regex pattern.
// `rule.pattern` is the regular expression to match.
// NOTE: the regex should start with `/^...` to match at the beginning of the stream.
Rule.Pattern = class Pattern extends Rule {
	parse(parser, stream) {
		var match = stream.match(this.pattern);
		if (!match) return undefined;
		return this.clone({
			matched: match[0],
			endIndex: stream.startIndex + match[0].length,
			stream
		});
	}

	toString() {
		return this.pattern;
	}
}


// Keyword pattern
//	`rule.keyword` is the keyword string to match.
Rule.Keyword = class Keyword extends Rule.Pattern {
	constructor(properties) {
		super(properties);
		// create pattern which matches at word boundary
		if (!this.pattern) {
			if (!this.keyword) throw new TypeError("Expected keyword property");
			this.pattern = new RegExp(`^${this.keyword}\\b`);
		}
	}

	toString() {
		return this.keyword;
	}
}


// Subrule -- name of another rule to be called.
// `rule.name` is the name of the rule in `parser.rules`.
Rule.Subrule = class Subrule extends Rule {
	parse(parser, stream) {
		var rule = parser.getRule(this.rule);
		if (!rule) throw new SyntaxError(`Attempting to parse unknown rule '${this.name}'`, this);
		var result = rule.parse(parser, stream);
		if (!result) return undefined;

		if (this.argument) result.argument = this.argument;
		return result;
	}

	toString() {
		return `{${this.argument ? this.argument+":" : ""}${this.rule}}${this.optional ? '?' : ''}`;
	}
}



// Abstract:  `Nested` rule -- composed of a series of other `rules`.
Rule.Nested = class Nested extends Rule {}


// Sequence of rules to match (auto-excluding whitespace).
Rule.Sequence = class Sequence extends Rule.Nested {
	// Throws of mandatory rule can't be matched.
	parse(parser, stream) {
		let results = [], next = stream;
		for (let rule of this.rules) {
			next = parser.eatWhitespace(next);
			let result = rule.parse(parser, next);
			if (!result && !rule.optional) return undefined;
			if (result) {
				results.push(result);
				next = result.next();
			}
		}
		// if we get here, we matched all the rules!
		return this.clone({
			results,
			endIndex: next.startIndex,
			stream
		});
	}

	// Gather arguments from our parsed `results` array.
	// Returns an object with properties from the `values` array indexed by
	//		- `results.argument`:		argument set when rule was declared, eg: `{value:literal}` => `value`
	//		- `results.ruleName`:		name of rule when defined
	//		- rule type:				name of the rule type
	gatherArguments() {
		if (!this.results) return undefined;
		let args = {};
		for (let next of this.results) {
			let ruleName = next.argument || next.ruleName || next.constructor.name;
			// For nested rules, recurse to get their arguments
			let result = (next instanceof Rule.Nested ? next.gatherArguments() : next);

			if (ruleName in args) {
				if (!Array.isArray(args[ruleName])) args[ruleName] = [args[ruleName]];
				args[ruleName].push(result);
			}
			else {
				args[ruleName] = result;
			}
		}
		return args;
	}

	toString() {
		return `${this.rules.join(" ")}${this.optional ? '?' : ''}`;
	}

}

// Syntactic sugar for debugging
Rule.Expression = class Expression extends Rule.Sequence {}
Rule.Statement = class Statement extends Rule.Sequence {}


// Alternative syntax.
// NOTE: Currently takes the first valid match.
// TODO: match all valid alternatives
// TODO: rename
Rule.Alternatives = class Alternatives extends Rule.Nested {
	parse(parser, stream) {
		for (let rule of this.rules) {
			let match = rule.parse(parser, stream);
			if (match) {
				if (this.argument) match.argument = this.argument;
				return match;
			}
		}
	}

	toString() {
		return `(${this.argument ? this.argument+":" : ""}${this.rules.join("|")})${this.optional ? '?' : ''}`;
	}
};



// Repeating rule.
//	`this.rule` is the rule that repeats.
//
// After matching:
//	`this.results` is array of results of matches.
//
//	Automatically consumes whitespace before rules.
//	If doesn't match at least one, returns `undefined`.
Rule.Repeat = class Repeat extends Rule.Nested {
	parse(parser, stream) {
		let next = stream;
		let results = [];
		while (true) {
			next = parser.eatWhitespace(next);
			let result = this.rule.parse(parser, next);
			if (!result) break;

			results.push[result];
			next = result.next();
		}

		if (results.length === 0) return undefined;

		return this.clone({
			results,
			endIndex: next.startIndex,
			stream
		});
	}

	toSource() {
		throw "Don't understand how to source Rule.Repeat!";
	}

	toString() {
		return `${this.rule}${this.optional ? '*' : '+'}`;
	}
}


// List match rule:   `[<item><delimiter>]`. eg" `[{literal},]` to match `a,b,c`
//	`rule.item` is the rule for each item,
//	`rule.delimiter` is the delimiter between each item.
// 	`rule.results` in the output is the list of values.
//
//
// NOTE: we assume that a List rule will NOT repeat (????)
Rule.List = class List extends Rule {
	parse(parser, stream) {
		// ensure item and delimiter are optional so we don't barf in `parseRule`
		this.item.optional = true;
		this.delimiter.optional = true;

		var results = [], next = stream;
		while (true) {
			// get next item, exiting if not found
			let item = this.item.parse(parser, next);
			if (!item) break;
//console.log(item);
			results.push(item);
			next = item.next();

			// get delimiter, exiting if not found
			let delimiter = this.delimiter.parse(parser, next);
			if (!delimiter) break;
			next = delimiter.next();
		}

		return this.clone({
			results,
			endIndex: next.startIndex,
			stream
		});
	}

	// Return matched item by index
	getItem(index) {
		if (!this.results) return undefined;
		return this.results[index];
	}


	toSource() {
		if (!this.results) return undefined;		// TODO: throw???
		let results = this.results.map( result => result.toSource() ).join(", ");
		return `[${results}]`;
	}

	toString() {
		return `[${this.argument ? this.argument+":" : ""}${this.item} ${this.delimiter}]`;
	}
};





//
//	# Parsing `ruleSyntax` to create rules automatically.
//
// TODO:	Pull `parseRuleSyntax` stuff out into separate module?
// TODO:	Better name for `ruleSyntax`
Object.assign(Rule, {

//
// ## group: parsing syntax
//

// TODO: convert to TextStream pattern ala normal parser once that settles down???
	parseRuleSyntax(syntax, SequenceConstructor = Rule.Sequence) {
		let syntaxStream = Rule.tokeniseRuleSyntax(syntax);
		let rules = Rule.parseRuleSyntax_tokens(syntaxStream, []);

		let rule;
		// If we only got one thing, return that as the result
		if (rules.length === 1) {
			rule = rules[0];
		}
		else {
			rule = new SequenceConstructor({ rules });
		}

		return rule;
	},

	tokeniseRuleSyntax(syntax) {
		const SYNTAX_EXPRESSION = /(?:[\w\-]+|\\[\[\(\{\)\}\]]|[^\s\w]|\|)/g;
		var syntaxStream = syntax.match(SYNTAX_EXPRESSION);
		if (!syntaxStream) throw new SyntaxError(`Can't tokenize parse rule syntax >>${syntax}<<`);
		return syntaxStream;
	},

	parseRuleSyntax_tokens(syntaxStream, rules, startIndex = 0, lastIndex = syntaxStream.length) {
		while (startIndex < lastIndex) {
			let [ rule, endIndex ] = Rule.parseRuleSyntax_token(syntaxStream, rules, startIndex);
			if (endIndex >= lastIndex)
				throw new SyntaxError("Past lastIndex");
			if (rule) rules.push(rule);
			startIndex = endIndex + 1;
		}
		return rules;
	},

	parseRuleSyntax_token(syntaxStream, rules, startIndex = 0) {
		var syntaxToken = syntaxStream[startIndex];

		switch (syntaxToken) {
			case "{":	return Rule.parseRuleSyntax_subrule(syntaxStream, rules, startIndex);
			case "(":	return Rule.parseRuleSyntax_parentheses(syntaxStream, rules, startIndex);
			case "[":	return Rule.parseRuleSyntax_list(syntaxStream, rules, startIndex);
			case "|":	return Rule.parseRuleSyntax_alternatives(syntaxStream, rules, startIndex);
			case "*":
			case "+":
			case "?":	return Rule.parseRuleSyntax_repeat(syntaxStream, rules, startIndex);

			// the following should ALWAYS be consumed by the above
			case "}":
			case ")":
			case "]":
				throw new SyntaxError(`Unexpected ${syntaxToken} found as item ${startIndex} of ${this.syntax}`);

			default:
				return Rule.parseRuleSyntax_string(syntaxStream, rules, startIndex);
		}
	},

	// Match `keyword` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_string(syntaxStream, rules, startIndex) {
		var string = syntaxStream[startIndex], rule;
		// If letters only, match as a Keyword (so we require a word boundary after the string).
		if (string.match(/[A-Za-z]+/)) {
			rule = new Rule.Keyword({ keyword: string });
		}
		// Otherwise match as a String, which doesn't require non-word chars after the text.
		else {
			rule = new Rule.String({ string: string });
			// If string starts with `\\`, it's an escaped literal (eg: `\[` needs to input as `\\[`).
			if (string.startsWith("\\")) {
				// remove leading slash in match string...
				rule.string = rule.string.substr(1);
				// but leave it in toString
				rule.toString = () => string;
			}
		}
		return [ rule, startIndex ];
	},


	// Match grouping expression `(...)` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_parentheses(syntaxStream, rules, startIndex) {
		let { endIndex, slice } = Parser.findNestedTokens(syntaxStream, "(", ")", startIndex);

		// pull out explicit argument name
		let argument;
		if (slice.length > 2 && slice[1] === ":") {
			argument = slice[0];
			slice = slice.slice(2);
		}

		let rule;
		var results = Rule.parseRuleSyntax_tokens(slice, []);
		// Single result means optional expression
		if (results.length === 1) {
			rule = results[0];
			if (!(rule instanceof Rule.Alternatives)) rule.optional = true;
		}
		else {
			rule = new Rule.Sequence({ rules: results });
		}
		if (argument) rule.argument = argument;

		return [ rule, endIndex ];
	},

	// Match repeat indicator `?`, `+` or `*` by attaching it to the previous rule.
	parseRuleSyntax_repeat(syntaxStream, rules, startIndex) {
		var symbol = syntaxStream[startIndex];
		var rule = rules[rules.length - 1];
		if (!rule) throw new SyntaxError(`Can't attach repeat symbol ${symbol} to empty rule!`);

		// Transform last rule into a repeat for `*` and `+`.
		if (symbol === "*" || symbol === "+") {
			rule = new Rule.Repeat({ rule });
			// push into rule stack in place of old rule
			rules[rules.length - 1] = rule;
		}

		// Rule is optional for `?` and `*`.
		if (symbol === "?" || symbol === "*") {
			rule.optional = true;
		}

		return [ undefined, startIndex ]
	},

	// Match `{<ruleName>}` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_subrule(syntaxStream, rules, startIndex) {
		let match = Parser.findNestedTokens(syntaxStream, "{", "}", startIndex);
		let argument;
		if (match.slice.length === 3 && match.slice[1] === ":") {
			argument = match.slice[0];
			match.slice = match.slice.slice(2);
		}
		if (match.slice.length > 1) throw new SyntaxError(`Can't process rules with more than one rule name: {${match.slice.join("")}}`);
		let rule = new Rule.Subrule({ rule: match.slice[0] });
		if (argument) rule.argument = argument;
		return [ rule, match.endIndex ];
	},

	// Match list expression `[<item><delimiter>]` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_list(syntaxStream, rules, startIndex) {
		let { endIndex, slice } = Parser.findNestedTokens(syntaxStream, "[", "]", startIndex);

		let argument;
		if (slice.length > 2 && slice[1] === ":") {
			argument = slice[0];
			slice = slice.slice(2);
		}

		let results = Rule.parseRuleSyntax_tokens(slice, []);
		if (results.length !== 2) {
			throw new SyntaxError(`Unexpected stuff at end of list: [${slice.join(" ")}]`);
		}
		let rule = new Rule.List();
		rule.item = results[0]
		rule.delimiter = results[1]
		if (argument) rule.argument = argument;
		return [ rule, endIndex ];
	},

	// Match alternate `( a | b | c )`.
	// NOTE: this should only happen inside a group...
	parseRuleSyntax_alternatives(syntaxStream, rules, startIndex) {
		let [ rule, endIndex ] = Rule.parseRuleSyntax_token(syntaxStream, rules, startIndex + 1);

		// create alternates rule with lastToken, or re-use existing alternates rile
		let alternates;
		let lastToken = rules.pop();
		if (lastToken instanceof Rule.Alternatives) {
			alternates = lastToken;
		}
		else {
			alternates = new Rule.Alternatives({ rules: [] });

			// if no last rule, we have a rule like  `( | abc)` which means that the alternates is optional
			if (!lastToken)
				alternates.optional = true;
			else
				alternates.rules.push(lastToken);
		}
		// add parsed rule to the alternatess
		alternates.rules.push(rule);

		// add back to the end of rules
		rules.push(alternates);

		return [ undefined, endIndex ];
	},


});
