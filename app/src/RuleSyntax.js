import { defineMemoized } from "./memoize.js";
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
		let syntaxStream = syntax.match(SYNTAX_EXPRESSION);
		if (!syntaxStream) throw new SyntaxError(`Can't tokenize parse rule syntax >>${syntax}<<`);
		return syntaxStream;
	},

	parseRuleSyntax_tokens(syntaxStream, rules = [], startIndex = 0) {
		let lastIndex = syntaxStream.length;
		while (startIndex < lastIndex) {
			let [ rule, endIndex ] = Rule.parseRuleSyntax_token(syntaxStream, rules, startIndex);
			if (rule) {
				let last = rules[rules.length-1];
				// If this is a `String` and last was a `String`, merge together
				if (last && last instanceof Rule.Symbol && rule instanceof Rule.Symbol) {
					// remove the last rule
					rules.pop();
					// and replace with a rule that merges the keywords
					rule = Rule.mergeSymbols(last, rule);
				}
				rules.push(rule);
			}
			startIndex = endIndex + 1;
		}
		return rules;
	},

	parseRuleSyntax_token(syntaxStream, rules = [], startIndex = 0) {
		let syntaxToken = syntaxStream[startIndex];

		// if we got a "\\" (which also has to go into the source string as "\\")
		// treat the next token as a literal string rather than as a special character.
		if (syntaxToken === "\\") {
			return Rule.parseRuleSyntax_symbol(syntaxStream, rules, startIndex + 1);
		}

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
				if (syntaxToken.match(Rule.KEYWORD_PATTERN)) {
					return Rule.parseRuleSyntax_keyword(syntaxStream, rules, startIndex);
				}
				else {
					return Rule.parseRuleSyntax_symbol(syntaxStream, rules, startIndex);
				}
		}
	},

	KEYWORD_PATTERN : /[A-Za-z]+/,

	// Match `keyword` in syntax rules.
	// If more than one keyword appears in a row, combines them into a single `Keyword` object.
	// This is pretty safe, unless you have an optional keyword like
	//		`the {identifier} of the? {expression}`
	// in which case you can put the optional keyword in parens
	//		`the {identifier} of (the?) {expression}`
	//
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_keyword(syntaxStream, rules = [], startIndex = 0, constructor) {
		let words = [], endIndex;
 		// eat keywords while they last
		for (var i = startIndex; i < syntaxStream.length; i++) {
			let next = syntaxStream[i];
			if (next.match(Rule.KEYWORD_PATTERN)) {
				words.push(next);
				endIndex = i;
			}
			else break;
		}

		if (!constructor) constructor = Rule.Keyword;
		let rule = new constructor({ string: words.join(" ") });

		return [ rule, endIndex ];
	},

	// Match `keyword` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_symbol(syntaxStream, rules = [], startIndex = 0, constructor = Rule.Symbol) {
		let string = syntaxStream[startIndex];
		if (!constructor) constructor = Rule.Symbol;
		let rule = new constructor({ string: string });

		// If string starts with `\\`, it's an escaped literal (eg: `\[` needs to input as `\\[`).
		if (string.startsWith("\\")) {
			// remove leading slash in match string...
			rule.string = rule.string.substr(1);
			// but leave it in toString
			rule.toString = () => string;
		}
		return [ rule, startIndex ];
	},


	// Match grouping expression `(...|...)` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	// NOTE: nested parens may not have alternatives... :-(   `(a|(b|c))` won't work???
	parseRuleSyntax_parentheses(syntaxStream, rules = [], startIndex = 0) {
		let { endIndex, slice } = Parser.findNestedTokens(syntaxStream, "(", ")", startIndex);

		// pull out explicit argument name
		let argument;
		if (slice.length > 2 && slice[1] === ":") {
			argument = slice[0];
			slice = slice.slice(2);
		}

		// split into groups, including nested parens
		let alternatives =
			groupAlternatives(slice)
			.map(function(group) {
				let results = Rule.parseRuleSyntax_tokens(group, []);
				if (results.length === 1) {
					return results[0];
				}
				else {
					return new Rule.Sequence({ rules: results });
				}
			});

		let rule = alternatives.length === 1 ? alternatives[0] : new Rule.Alternatives({ rules: alternatives });
		if (argument) rule.argument = argument;
		return [ rule, endIndex ];

		function groupAlternatives(tokens) {
			let alternatives = [];
			let current = [];
			for (let i = 0, token; token = tokens[i]; i++) {
				// handle alternate marker
				if (token === "|") {
					alternatives.push(current);
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
			if (current.length) alternatives.push(current);
			return alternatives;
		}
	},

	// Match repeat indicator `?`, `+` or `*` by attaching it to the previous rule.
	parseRuleSyntax_repeat(syntaxStream, rules = [], startIndex = 0) {
		let symbol = syntaxStream[startIndex];
		let rule = rules[rules.length - 1];
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
	parseRuleSyntax_subrule(syntaxStream, rules = [], startIndex = 0) {
		let match = Parser.findNestedTokens(syntaxStream, "{", "}", startIndex);
		let argument;
		if (match.slice.length === 3 && match.slice[1] === ":") {
			argument = match.slice[0];
			match.slice = match.slice.slice(2);
		}
		if (match.slice.length > 1) throw new SyntaxError(`Can't process rules with more than one rule name: {${match.slice.join("")}}`);

		let params = { rule: match.slice[0] };

		// see if there's a `not` rule in there
		let bangPosition = params.rule.indexOf("!");
		if (bangPosition !== -1) {
			params.not = params.rule.substr(bangPosition + 1); //[ params.rule.substr(bangPosition + 1) ];
			params.rule = params.rule.substr(0, bangPosition);
		}

		let rule = new Rule.Subrule(params);
		if (argument) rule.argument = argument;
		return [ rule, match.endIndex ];
	},

	// Match list expression `[<item><delimiter>]` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_list(syntaxStream, rules = [], startIndex = 0, constructor = Rule.List) {
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
		let [ item, delimiter ] = results;

		let rule = new constructor({ item, delimiter });
		if (argument) rule.argument = argument;
		return [ rule, endIndex ];
	},

});



// ##  Add methods to Parser to define rules using the above syntax.
Object.defineProperties(Parser.prototype, {

	// Parse a `ruleSyntax` rule and add it to our list of rules.
	// Returns the new rule.
	// Logs parsing errors but allows things to continue.
	addSequence: { value: function(name, ruleSyntax, constructor = Rule.Sequence, properties) {
		// Add a bunch of syntaxes at once if we got an array of syntaxes
		if (Array.isArray(ruleSyntax))
			return ruleSyntax.forEach(syntax => this.addSequence(name, syntax, constructor, properties));

		if (typeof constructor !== "function") {
			properties = constructor;
			constructor = Rule.Sequence;
		}
		try {
			let rule = Rule.parseRuleSyntax(ruleSyntax, constructor);
			// Reflect the rule back out to make sure it looks (more or less) the same
			if (Parser.debug) console.log(`Added rule '${name}':\n  INPUT: ${ruleSyntax} \n OUTPUT: ${rule}`);

//console.info(name, constructor, rule);
			if (properties) Object.assign(rule, properties);
			return this.addRule(name, rule);
		} catch (e) {
			console.group(`Error parsing syntax for rule '${name}':`);
			console.log(`syntax: ${ruleSyntax}`);
			console.error(e);
		}
	}},

	addStatement: { value: function(name, ruleSyntax, constructor = Rule.Statement, properties) {
		// Add a bunch of syntaxes at once if we got an array of syntaxes
		if (Array.isArray(ruleSyntax))
			return ruleSyntax.forEach(syntax => this.addStatement(name, syntax, constructor, properties));

		let rule = this.addSequence(name, ruleSyntax, constructor, properties);
		if (rule) return this.addRule("statement", rule);
	}},

	addExpression: { value: function(name, ruleSyntax, constructor = Rule.Expression, properties) {
		// Add a bunch of syntaxes at once if we got an array of syntaxes
		if (Array.isArray(ruleSyntax))
			return ruleSyntax.forEach(syntax => this.addExpression(name, syntax, constructor, properties));

		let rule = this.addSequence(name, ruleSyntax, constructor, properties);
		if (rule) return this.addRule("expression", rule);
	}},

	addList: { value: function(name, ruleSyntax, constructor = Rule.List, properties) {
		// Add a bunch of syntaxes at once if we got an array of syntaxes
		if (Array.isArray(ruleSyntax))
			return ruleSyntax.forEach(syntax => this.addList(name, syntax, constructor, properties));

		let stream = Rule.tokeniseRuleSyntax(ruleSyntax);
		let rule = (Rule.parseRuleSyntax_list(stream, [], 0, constructor) || [])[0];
		if (!rule) return;
		if (properties) Object.assign(rule, properties);
		return this.addRule(name, rule);
	}},

	addKeyword: { value: function(name, ruleSyntax, constructor = Rule.Keyword, properties) {
		// Add a bunch of syntaxes at once if we got an array of syntaxes
		if (Array.isArray(ruleSyntax))
			return ruleSyntax.forEach(syntax => this.addKeyword(name, syntax, constructor, properties));

		let stream = Rule.tokeniseRuleSyntax(ruleSyntax);
		let rule = (Rule.parseRuleSyntax_keyword(stream, [], 0, constructor) || [])[0];
		if (!rule) return;
		if (properties) Object.assign(rule, properties);
		return this.addRule(name, rule);
	}},

	addSymbol: { value: function(name, ruleSyntax, constructor = Rule.Symbol, properties) {
		// Add a bunch of syntaxes at once if we got an array of syntaxes
		if (Array.isArray(ruleSyntax))
			return ruleSyntax.forEach(syntax => this.addSymbol(name, syntax, constructor, properties));

		// TODO: assume we just have one symbol of many letters...
		let stream = [ruleSyntax];
		let rule = (Rule.parseRuleSyntax_symbol(stream, [], 0, constructor) || [])[0];
		if (!rule) return;
		if (properties) Object.assign(rule, properties);
		return this.addRule(name, rule);
	}},

	// Add postfix operator, such as "a is defined"
	// NOTE: if you have more than one matching operator,
	//		 pass in an array of simple strings so all of our operators are simple strings.
	addPostfixOperator: { value: function(name, ruleSyntax, properties) {
		if (Array.isArray(ruleSyntax)) {
			return ruleSyntax.forEach(syntax => this.addPostfixOperator(name, syntax, properties));
		}

		let rule = this.addSequence(name, ruleSyntax, properties);
		if (rule) {
			if (!rule.toJS) {
				throw new TypeError(`Expected postfix operator rule '${name}' to specify 'toJS' function`);
			}
			// clear list of infix operators for getter below
			delete this.__postfixOperators;
			return this.addRule("postfix_operator", rule);
		}
	}},

	// List of postfix operators as strings.
	// Re-memoized after `addInfixOperator` above.
	postfixOperators: defineMemoized("__posfixOperators",
		function(){ return this.rules["postfix_operator"]
						&& this.rules["postfix_operator"].rules.map(rule => rule.string);
	})
});
