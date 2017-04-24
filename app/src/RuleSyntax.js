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
				if (last && last instanceof Rule.Symbol && rule instanceof Rule.Symbol) {
					// remove the last rule
					rules.pop();
					// and replace with a rule that merges the keywords
					rule = Rule.mergeSymbols(last, rule);
				}
				// If this is a `Keyword` and last was also a `Keyword`, merge together
				else if (last && last instanceof Rule.Keyword && rule instanceof Rule.Keyword) {
					// remove the last rule
					rules.pop();
					// and replace with a rule that merges the keywords
					rule = Rule.mergeKeywords(last, rule);
				}
				rules.push(rule);
			}
			startIndex = endIndex + 1;
		}
		return rules;
	},

	parseRuleSyntax_token(syntaxStream, rules, startIndex = 0) {
		var syntaxToken = syntaxStream[startIndex];

		// if we got a "\\" (which also has to go into the source string as "\\")
		// treat the next token as a literal string rather than as a special character.
		if (syntaxToken === "\\") {
			return Rule.parseRuleSyntax_string(syntaxStream, rules, startIndex + 1);
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
			rule = new Rule.Keyword({ string });
		}
		// Otherwise match as a String, which doesn't require non-word chars after the text.
		else {
			rule = new Rule.Symbol({ string: string });
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
			var alternatives = [];
			var current = [];
			for (var i = 0, token; token = tokens[i]; i++) {
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

		var params = { rule: match.slice[0] };

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



// ##  Add methods to Parser to define rules using the above syntax.
Object.defineProperties(Parser.prototype, {

	// Parse a `ruleSyntax` rule and add it to our list of rules.
	// Returns the new rule.
	// Logs parsing errors but allows things to continue.
	addSyntax: { value: function(name, ruleSyntax, properties, constructor = Rule.Sequence) {
		// If we only got 3 args, and 2nd is a function, use it as constructor instead
		if (properties instanceof Function) {
			constructor = properties;
			properties = undefined;
		}
		try {
			let rule = Rule.parseRuleSyntax(ruleSyntax, constructor);
			// Reflect the rule back out to make sure it looks (more or less) the same
			if (Parser.debug) console.log(`Added rule '${name}':\n  INPUT: ${ruleSyntax} \n OUTPUT: ${rule}`);

			if (properties) Object.assign(rule, properties);
			return this.addRule(name, rule);
		} catch (e) {
			console.group(`Error parsing syntax for rule '${name}':`);
			console.log(`syntax: ${ruleSyntax}`);
			console.error(e);
		}
	}},

	addStatement: { value: function(name, ruleSyntax, properties, constructor = Rule.Statement) {
		var rule = this.addSyntax(name, ruleSyntax, properties, constructor);
		if (rule) return this.addRule("statement", rule);
	}},

	addExpression: { value: function(name, ruleSyntax, properties, constructor = Rule.Expression) {
		var rule = this.addSyntax(name, ruleSyntax, properties, constructor);
		if (rule) return this.addRule("expression", rule);
	}},

	// Add infix operator, such as "a or b".
	// NOTE: if you have more than one matching operator,
	//		 pass in an array of simple strings so all of our operators are simple strings.
	addInfixOperator: { value: function(name, ruleSyntax, properties) {
		if (Array.isArray(ruleSyntax)) {
			return ruleSyntax.forEach(syntax => this.addInfixOperator(name, syntax, properties));
		}

		var rule = this.addSyntax(name, ruleSyntax, properties);
		if (rule) {
			if (!rule.toJS) {
				throw new TypeError(`Expected infix operator rule '${name}' to specify 'toJS' function`)
			}
			// clear list of infix operators for getter below
			delete this.__infixOperators;
			return this.addRule("infix_operator", rule);
		}
	}},

	// List of infix operators as strings.
	// Re-memoized after `addInfixOperator` above.
	infixOperators: defineMemoized("__infixOperators",
		function() { return this.rules["infix_operator"]
						 && this.rules["infix_operator"].rules.map(rule => rule.string)
	}),

	// Add postfix operator, such as "a is defined"
	// NOTE: if you have more than one matching operator,
	//		 pass in an array of simple strings so all of our operators are simple strings.
	addPostfixOperator: { value: function(name, ruleSyntax, properties) {
		if (Array.isArray(ruleSyntax)) {
			return ruleSyntax.forEach(syntax => this.addPostfixOperator(name, syntax, properties));
		}

		var rule = this.addSyntax(name, ruleSyntax, properties);
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
