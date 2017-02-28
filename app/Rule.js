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


	// Parse this rule at the beginning of `stream`.
	// Default is that `rule.value` is literal string to match.
	// On match, returns clone of rule with `value`, `stream` and `endIndex`.
	// Returns `undefined` if no match.
	parse(parser, stream) {
		if (!stream.startsWith(this.value)) return undefined;
		return this.clone({
			endIndex: stream.startIndex + this.value.length,
			stream
		});
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
		if (this.repeat) modifiers.push("repeat");
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
		if (this.repeat && this.optional) return "*";
		if (this.repeat) return "+";
		if (this.optional) return "?";
		return "";
	}
}


// Rule for specific keywords.
Rule.Keyword = class Keyword extends Rule{}


// Rule for arbitrary string match.
Rule.String = class String extends Rule{}



// Regex pattern.
// `rule.pattern` is the regular expression to match.
// NOTE: the regex should start with `/^...` to match at the beginning of the stream.
Rule.Pattern = class Pattern extends Rule {
	parse(parser, stream) {
		var match = stream.match(this.pattern);
		if (!match) return undefined;

		return this.clone({
			value: match[0],
			endIndex: stream.startIndex + match[0].length,
			match: match,		// TODO: necessary???
			stream
		});
	}
}


// Subrule -- name of another rule to be called.
// `rule.name` is the name of the rule in `parser.rules`.
Rule.Subrule = class Subrule extends Rule {
	parse(parser, stream) {
		var rule = parser.getRule(this.name);
		if (!rule) throw new SyntaxError(`Attempting to parse unknown rule '${this.name}'`, this);
		return rule.parse(parser, stream);
	}

	toString() {
		return `{${this.name}}${this.modifiersAsString}`;
	}

	toJSON() {
		return `${this._type}${this._argName}: '${this.name}'${this.modifiersAsJSON}`;
	}
}



// Abstract:  `Nested` rule -- composed of a series of other rules.
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
		if (this.repeat) json.repeat = true;
		return json;
	}
}


// Sequence of rules to match (auto-excluding whitespace).
Rule.Sequence = class Sequence extends Rule.Nested {
	// Throws of mandatory rule can't be matched.
	parse(parser, stream) {
		let results = [], nextStream = stream;
		for (let rule of this.rules) {
			let result = parser.parseRule(rule, nextStream);
			if (result) {
				results.push(result[0]);
				nextStream = result[1];
			}
		}
		// if we get here, we matched all the rules!
		return this.clone({
			value: results,
			endIndex: nextStream.startIndex,
			stream
		});
	}

}


// Alternative syntax.
// TODO: rename
// TODO: match all valid alternatives
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


// List match rule:   `[<item><delimiter>]`. eg" `[{literal},]` to match `a,b,c`
//	`rule.item` is the rule for each item,
//	`rule.delimiter` is the delimiter between each item.
// 	`rule.value` in the output is the list of values.
//
//
// NOTE: we assume that a List match will NOT repeat (????)
// NOTE: this handles optional
// TODO: this is convenient but non-standard...
Rule.List = class List extends Rule {
	parse(parser, stream) {
		// ensure item and delimiter are optional so we don't barf in `parseRule`
		this.item.optional = true;
		this.delimiter.optional = true;

		var results = [], nextStream = stream;
		while (true) {
			// get next item, exiting if not found
			let item = parser.parseRule(this.item, nextStream);
			if (!item) break;
//console.log(item);
			results.push(item[0]);
			nextStream = item[1];

			// get delimiter, exiting if not found
			let delimiter = parser.parseRule(this.delimiter, nextStream);
			if (!delimiter) break;
			nextStream = delimiter[1];
		}

		// If we didn't get anything, barf if the list is not optional
		if (results.length === 0 && !this.optional) {
			throw new SyntaxError(`Mandatory list not matched at '${stream.head.substr(20)}'`);
		}

		return this.clone({
			value: results,
			endIndex: nextStream.startIndex,
			stream
		});
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
			let [ part, endIndex ] = Rule.parseRuleSyntax_token(syntaxStream, rules, startIndex);
			if (endIndex >= lastIndex)
				throw new SyntaxError("Past lastIndex");
			if (part) rules.push(part);
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
				if (syntaxToken.match(/^[\w\-_]+$/))
					return Rule.parseRuleSyntax_keyword(syntaxStream, rules, startIndex);

				return Rule.parseRuleSyntax_string(syntaxStream, rules, startIndex);
		}
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
		var last = rules[rules.length - 1];
		if (!last) throw new SyntaxError(`Can't attach repeat symbol ${symbol} to empty rules!`);

		switch (symbol) {
			case "?":
				last.optional = true;
				break;

			case "*":
				last.optional = true;
				last.repeat = true;
				break;

			case "+":
				last.repeat = true;

		}

		return [ undefined, startIndex ]
	},

	// Match `keyword` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_keyword(syntaxStream, rules, startIndex) {
		var value = syntaxStream[startIndex];
		var rule = new Rule.Keyword({ value });
		return [ rule, startIndex ];
	},

	// Match `word` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_string(syntaxStream, rules, startIndex) {
		var value = syntaxStream[startIndex];
		var rule = new Rule.String({ value });
		// If value starts with `\\`
		if (value.startsWith("\\")) {
			// remove leading slash in match value...
			rule.value = rule.value.substr(1);
			// but leave it in toString
			rule.toString = () => value;
		}
		return [ rule, startIndex ];
	},

	// Match `{<ruleName>}` in syntax rules.
	// Returns `[ part, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_subrule(syntaxStream, rules, startIndex) {
		let match = Tokenizer.findNested(syntaxStream, "{", "}", startIndex);
		if (match.slice.length > 1) throw new SyntaxError(`Can't process rules with more than one rule name: ${rule}`);
		let rule = new Rule.Subrule({ name: match.slice[0] });
		return [ rule, match.endIndex ];
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

	// Match list expression `[<item><delimiter>]` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_list(syntaxStream, rules, startIndex) {
		let { endIndex, slice } = Tokenizer.findNested(syntaxStream, "[", "]", startIndex);

		let list = new Rule.List();

		let results = Rule.parseRuleSyntax_tokens(slice, []);
		if (results.length === 4 && results[1].value === ":") {
			list.argument = results[0];
			list.item = results[2]
			list.delimiter = results[3]
		}
		else if (results.length === 2) {
			list.item = results[0]
			list.delimiter = results[1]
		}
		else {
			throw new SyntaxError(`Unexpected stuff at end of list: [${slice.join(" ")}]`);
		}
		return [ list, endIndex ];
	},

});
