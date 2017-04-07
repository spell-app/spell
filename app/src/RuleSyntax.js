import Parser from "./Parser.js";
import Rule from "./Rule.js";

// re-export Rule for testing
export default Rule;

//
//	# Parsing `ruleSyntax` to create rules automatically.
//
// TODO:	Pull `parseRuleSyntax` stuff out into separate module?
// TODO:	Better name for `ruleSyntax`
// TODO:	Use keywords in syntax to make a quick regex-based `test` function for the entire rule
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

	parseRuleSyntax_tokens(syntaxStream, rules, startIndex = 0) {
		let lastIndex = syntaxStream.length;
		while (startIndex < lastIndex) {
			let [ rule, endIndex ] = Rule.parseRuleSyntax_token(syntaxStream, rules, startIndex);
			if (rule) {
				var last = rules[rules.length-1];
				// If this is a `String` and last was a `String`, merge together
				if (last && last instanceof Rule.String && rule instanceof Rule.String) {
					last.string += rule.string;
				}
				else {
					rules.push(rule);
				}
			}
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
			case "*":
			case "+":
			case "?":	return Rule.parseRuleSyntax_repeat(syntaxStream, rules, startIndex);

			// the following should ALWAYS be consumed by the above
			case "}":
			case ")":
			case "]":
			case "|":
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


	// Match grouping expression `(...|...)` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	// NOTE: nested parens may not have alternatives... :-(   `(a|(b|c))` won't work???
	parseRuleSyntax_parentheses(syntaxStream, rules, startIndex) {
		let { endIndex, slice } = Parser.findNestedTokens(syntaxStream, "(", ")", startIndex);

		// pull out explicit argument name
		let argument;
		if (slice.length > 2 && slice[1] === ":") {
			argument = slice[0];
			slice = slice.slice(2);
		}

		// split into groups, including nested parens
		let alternates =
			groupAlternates(slice)
			.map(function(group) {
				let results = Rule.parseRuleSyntax_tokens(group, []);
				if (results.length === 1) {
					return results[0];
				}
				else {
					return new Rule.Sequence({ rules: results });
				}
			});

		let rule = alternates.length === 1 ? alternates[0] : new Rule.Alternatives({ rules: alternates });
		if (argument) rule.argument = argument;
		return [ rule, endIndex ];

		function groupAlternates(tokens) {
			var alternates = [];
			var current = [];
			for (var i = 0, token; token = tokens[i]; i++) {
				// handle alternate marker
				if (token === "|") {
					alternates.push(current);
					current = [];
				}
				// handle nested parens
				else if (token === "(") {
					let { endIndex } = Parser.findNestedTokens(tokens, "(", ")", i);
					current = current.concat(tokens.slice(i, endIndex + 1));
					i = endIndex;
				}
				else {
					current.push(token);
				}
			}
			if (current.length) alternates.push(current);
			return alternates;
		}
	},

	// Match repeat indicator `?`, `+` or `*` by attaching it to the previous rule.
	parseRuleSyntax_repeat(syntaxStream, rules, startIndex) {
		var symbol = syntaxStream[startIndex];
		var rule = rules[rules.length - 1];
		if (!rule) throw new SyntaxError(`Can't attach repeat symbol ${symbol} to empty rule!`);

		// Transform last rule into a repeat for `*` and `+`.
		if (symbol === "*" || symbol === "+") {
			let argument = rule.argument;
			rule = new Rule.Repeat({ rule });
			if (argument) rule.argument = argument;
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

});
