//	# Parser Rules
//	Rules can be as simple as a string `Keyword` or a complex sequence of (nested) rules.
//
//
window.Rule = class Rule {
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
		return this.value;
	}

//
// ## group: reflection
//
	get _type() {
		return this.constructor.name;
	}

	// `argument` is argument name in transformed calling function.
	// Generally set by `(<arg>: <normalRule>)`
//TODOC
	get _argName() {
		if (this.argument) return ` (${this.argument})`;
		return "";
	}

//
// ### group: toJSON
//
	toJSON() {
		return `${this._type}${this._argName}: '${this.value}'${this.modifiersAsJSON}`;
	}

	get modifiersAsJSON() {
		var modifiers = [];
		if (this.optional) modifiers.push("optional");
		if (modifiers.length) return ` (${modifiers.join(" ")})`;
		return "";
	}

//
// ### group: toString
//
	toString() {
		return `${this.value}${this.modifiersAsString}`;
	}

	get modifiersAsString() {
		if (this.optional) return "*";
		if (this.repeat) return "+";
		if (this.optional) return "?";
		return "";
	}
}


// Rule for literal string value, which include punctuation such as `(` etc.
Rule.String = class String extends Rule {
	// Parse this rule at the beginning of `stream`, assuming no whitespace before.
	// Default is that `rule.value` is literal string to match.
	// On match, returns clone of rule with `value`, `stream` and `endIndex`.
	// Returns `undefined` if no match.
	parse(parser, stream) {
		if (!stream.startsWith(this.value)) return undefined;
		return this.clone({
			value: this.value,
			endIndex: stream.startIndex + this.value.length,
			stream
		});
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
			value: match[0],
			match: match,		// Include actual match in case subclass wants to pull bits out.
			endIndex: stream.startIndex + match[0].length,
			stream
		});
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
		return `{${this.name}}${this.modifiersAsString}`;
	}

	toJSON() {
		return `${this._type}${this._argName}: '${this.name}'${this.modifiersAsJSON}`;
	}
}



// Abstract:  `Nested` rule -- composed of a series of other `rules`.
Rule.Nested = class Nested extends Rule {
	constructor(properties) {
		super(properties);
		if (!this.rules) this.rules = [];
	}

	toJSON() {
		var json = {};
		var type = `${this._type}${this._argName}`;
		json[type] = this.rules;
		if (this.optional) json.optional = true;
		return json;
	}
}


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
			value: results,
			endIndex: next.startIndex,
			stream
		});
	}

	// Gather arguments from our parsed `value` array.
	// Returns an object with properties from the `values` array indexed by
	//		- `value.argument`:		argument set when rule was declared, eg: `{value:literal}` => `value`
	//		- `value.ruleName`:		name of rule when defined
	//		- rule type:			name of the rule type
	gatherArguments() {
		if (!this.value) return undefined;
		let args = {};
		for (let match of this.value) {
			let ruleName = match.argument || match.ruleName || match.constructor.name;
			// For nested rules, recurse to get their arguments
			let result = (match instanceof Rule.Nested ? match.gatherArguments() : match);

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

}


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
		return `(${this.rules.join("|")})${this.modifiersAsString}`;
	}
};



// Repeating rule.
//	`this.rule` is the rule that repeats.
//
// After matching:
//	`this.value` is array of results of matches.
//
//	Automatically consumes whitespace before rules.
//	If doesn't match at least one:
//		- if `optional`, returns `undefined`
//		- otherwise throws
//
Rule.Repeat = class Repeat extends Rule {
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
			value: results,
			endIndex: next.startIndex,
			stream
		});
	}

}


// List match rule:   `[<item><delimiter>]`. eg" `[{literal},]` to match `a,b,c`
//	`rule.item` is the rule for each item,
//	`rule.delimiter` is the delimiter between each item.
// 	`rule.value` in the output is the list of values.
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
			value: results,
			endIndex: next.startIndex,
			stream
		});
	}

	// Return matched item by index
	getItem(index) {
		if (!this.value) return undefined;
		return this.value[index];
	}


	toSource() {
		if (!this.value) return undefined;		// TODO: throw???
		let values = this.value.map( value => value.toSource() ).join(", ");
		return `[${values}]`;
	}


	toJSON() {
		let item = `{${JSON.stringify(this.item).replace(/"/g,"")}}`;
		let delimiter = `{${JSON.stringify(this.delimiter).replace(/"/g,"")}}`;
		return `${this._type}${this._argName}: { item: ${item}, delimiter: ${delimiter} } ${this.modifiersAsJSON}`;
	}


	toString() {
		return `[${this.item} ${this.delimiter}]${this.modifiersAsString}`;
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
	parseRuleSyntax(syntax) {
		let syntaxStream = Rule.tokeniseRuleSyntax(syntax);
		let rules = Rule.parseRuleSyntax_tokens(syntaxStream, []);

		let rule;
		// If we only got one thing, return that as the result
		if (rules.length === 1) {
			rule = rules[0];
		}
		else {
			rule = new Rule.Sequence({ rules });
		}

console.group("Parsing: ", syntax);
console.log(  "toString: ", rule.toString());
console.log(JSON.stringify(rule, undefined, 2));
console.groupEnd();

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
		var value = syntaxStream[startIndex], rule;
		// create as a Keyword or a String
		if (value.match(/\w+/)) {
			rule = new Rule.Keyword({ keyword: value });
		}
		else {
			rule = new Rule.String({ value });
			// If value starts with `\\`
			if (value.startsWith("\\")) {
				// remove leading slash in match value...
				rule.value = rule.value.substr(1);
				// but leave it in toString
				rule.toString = () => value;
			}
		}
		return [ rule, startIndex ];
	},


	// Match grouping expression `(...)` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_parentheses(syntaxStream, rules, startIndex) {
		let { endIndex, slice } = Tokenizer.findNested(syntaxStream, "(", ")", startIndex);

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
		let match = Tokenizer.findNested(syntaxStream, "{", "}", startIndex);
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
		let { endIndex, slice } = Tokenizer.findNested(syntaxStream, "[", "]", startIndex);

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
			alternates = new Rule.Alternatives();

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
