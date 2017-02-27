//	# Parser Rules
//	Rules can be as simple as a string `Keyword` or a complex sequence of (nested) rules.
//
//
window.Rule = class Rule {
	constructor(properties) {
		Object.assign(this, properties);
	}

	// Clone this token and add any `props` passed in.
	clone(props) {
		var clone = Object.create(this);
		Object.assign(clone, props);
		return clone;
	}

	// For a token instance associated with a stream,
	// return a new stream AFTER this token's end.
	next() {
		if (!this.stream || this.endIndex === undefined)
			throw new TypeError(`token.next() called on token without a stream`, this);
		return this.stream.advanceTo(this.endIndex);
	}


	// Parse this token at the beginning of `stream`.
	// Default is that `token.value` is literal string to match.
	// On match, returns clone of token with `value`, `stream` and `endIndex`.
	// Returns `undefined` if no match.
	parse(parser, stream) {
		if (typeof stream === "string") stream = new TextStream(stream);
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



//
// ## group: parsing syntax
//

// TODO: convert to TextStream pattern ala normal parser once that settles down
// TODO: Naming?  `Rule` as token type???
	static parseRuleSyntax(syntax) {
		let syntaxStream = Rule.tokeniseRuleSyntax(syntax);
		let tokens = Rule.parseRuleSyntax_tokens(syntaxStream, []);

		let rule;
		// If we only got one thing, return that as the result
		if (tokens.length === 1) {
			rule = tokens[0];
		}
		else {
			rule = new Rule.Sequence({ tokens });
		}

console.group("Parsing: ", syntax);
console.log(  "toString: ", rule.toString());
console.log(JSON.stringify(rule, undefined, 2));
console.groupEnd();

		return rule;
	}

	static tokeniseRuleSyntax(syntax) {
		const SYNTAX_EXPRESSION = /(?:[\w\-]+|\\[\[\(\{\)\}\]]|[^\s\w]|\|)/g;
		var syntaxStream = syntax.match(SYNTAX_EXPRESSION);
		if (!syntaxStream) throw new SyntaxError(`Can't tokenize parse rule syntax >>${syntax}<<`);
		return syntaxStream;
	}

	static parseRuleSyntax_tokens(syntaxStream, tokens, startIndex = 0, lastIndex = syntaxStream.length) {
		while (startIndex < lastIndex) {
			let [ part, endIndex ] = Rule.parseRuleSyntax_token(syntaxStream, tokens, startIndex);
			if (endIndex >= lastIndex)
				throw new SyntaxError("Past lastIndex");
			if (part) tokens.push(part);
			startIndex = endIndex + 1;
		}
		return tokens;
	}

	static parseRuleSyntax_token(syntaxStream, tokens, startIndex = 0) {
		var syntaxToken = syntaxStream[startIndex];

		switch (syntaxToken) {
			case "{":	return Rule.Subrule.parseRuleSyntax(syntaxStream, tokens, startIndex);
			case "(":	return Rule.parseRuleSyntax_parentheses(syntaxStream, tokens, startIndex);
			case "[":	return Rule.List.parseRuleSyntax(syntaxStream, tokens, startIndex);
			case "|":	return Rule.Alternates.parseRuleSyntax(syntaxStream, tokens, startIndex);
			case "*":
			case "+":
			case "?":	return Rule.parseRuleSyntax_repeat(syntaxStream, tokens, startIndex);

			// the following should ALWAYS be consumed by the above
			case "}":
			case ")":
			case "]":
				throw new SyntaxError(`Unexpected ${syntaxToken} found as item ${startIndex} of ${this.syntax}`);

			default:
				if (syntaxToken.match(/^[\w\-_]+$/))
					return Rule.Keyword.parseRuleSyntax(syntaxStream, tokens, startIndex);

				return Rule.String.parseRuleSyntax(syntaxStream, tokens, startIndex);
		}
	}


	// Match grouping expression `(...)` in syntax tokens.
	// Returns `[ token, endIndex ]`
	// Throws if invalid.
	static parseRuleSyntax_parentheses(syntaxStream, tokens, startIndex) {
		let { endIndex, slice } = Tokenizer.findNested(syntaxStream, "(", ")", startIndex);

		// pull out explicit argument name
		let argument;
		if (slice.length > 2 && slice[1] === ":") {
			argument = slice[0];
			slice = slice.slice(2);
		}

		let token;
		var tokens = Rule.parseRuleSyntax_tokens(slice, []);
		// Single token means optional expression
		if (tokens.length === 1) {
			token = tokens[0];
			if (!(token instanceof Rule.Alternates)) token.optional = true;
		}
		else {
			token = new Rule.Sequence({ tokens });
		}
		if (argument) token.argument = argument;

		return [ token, endIndex ];
	}

	// Match repeat indicator `?`, `+` or `*` by attaching it to the previous rule.
	static parseRuleSyntax_repeat(syntaxStream, tokens, startIndex) {
		var symbol = syntaxStream[startIndex];
		var last = tokens[tokens.length - 1];
		if (!last) throw new SyntaxError(`Can't attach repeat symbol ${symbol} to empty tokens!`);

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
	}
}


Rule.Keyword = class Keyword extends Rule{
	// Match `word` in syntax tokens.
	// Returns `[ token, endIndex ]`
	// Throws if invalid.
	static parseRuleSyntax(syntaxStream, tokens, startIndex) {
		var value = syntaxStream[startIndex];
		var token = new Rule.Keyword({ value });
		return [ token, startIndex ];
	}
}


Rule.String = class String extends Rule{
	// Match `word` in syntax tokens.
	// Returns `[ token, endIndex ]`
	// Throws if invalid.
	static parseRuleSyntax(syntaxStream, tokens, startIndex) {
		var value = syntaxStream[startIndex];
		var token = new Rule.String({ value });
		// If value starts with `\\`
		if (value.startsWith("\\")) {
			// remove leading slash in match value...
			token.value = token.value.substr(1);
			// but leave it in toString
			token.toString = () => value;
		}
		return [ token, startIndex ];
	}
}



// Regex pattern.
// `token.pattern` is the regular expression to match.
// NOTE: the regex should start with `/^...` to match at the beginning of the stream.
Rule.Pattern = class Pattern extends Rule {
	parse(parser, stream) {
		if (typeof stream === "string") stream = new TextStream(stream);
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


// Subrule -- name of another rule to called.
// `token.name` is the name of the rule (in the parser).
Rule.Subrule = class Subrule extends Rule {
	parse(parser, stream) {
		if (typeof stream === "string") stream = new TextStream(stream);
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

	// Match `{<ruleName>}` in syntax tokens.
	// Returns `[ part, endIndex ]`
	// Throws if invalid.
	static parseRuleSyntax(syntaxStream, tokens, startIndex) {
		let match = Tokenizer.findNested(syntaxStream, "{", "}", startIndex);
		if (match.slice.length > 1) throw new SyntaxError(`Can't process rules with more than one rule name: ${rule}`);
		let token = new Rule.Subrule({ name: match.slice[0] });
		return [ token, match.endIndex ];
	}

}



// `Nested` token -- composed of a series of other tokens.
Rule.Nested = class Nested extends Rule {
	constructor(properties) {
		super(properties);
		if (!this.tokens) this.tokens = [];
	}

	toJSON() {
		var json = {};
		var type = `${this._type}${this._argName}`;
		json[type] = this.tokens;
		if (this.optional) json.optional = true;
		if (this.repeat) json.repeat = true;
		return json;
	}
}


// Sequence of tokens to match (auto-excluding whitespace).
Rule.Sequence = class Sequence extends Rule.Nested {
	parse(parser, stream) {
		if (typeof stream === "string") stream = new TextStream(stream);
		var matches = [];
		for (let token in this.tokens) {
			if (stream.isEmpty && !token.optional)
				throw new SyntaxError("Stream is empty");

			let startIndex = stream.startIndex;
			let [ match, endIndex ] = token.parse(parser, stream);

			matches.push({ startIndex, endIndex, match });
			stream = stream.advanceTo(endIndex + 1);
		}
		return [ stream, matches ];
	}

}


// Alternative syntax.
// TODO: rename
// TODO: match all valid alternatives
Rule.Alternates = class Alternates extends Rule.Nested {
	parse(parser, stream) {
		if (typeof stream === "string") stream = new TextStream(stream);
		for (let token of this.tokens) {
			let match = token.parse(parser, stream, []);
			if (match) {
				if (this.argument) match.argument = this.argument;
				return match;
			}
		}
	}

	toString() {
		return `(${this.tokens.join("|")})${this.modifiersAsString}`;
	}

	// Match alternate `( a | b | c )`.
	// NOTE: this should only happen inside a group...
	static parseRuleSyntax(syntaxStream, tokens, startIndex) {
		let [ token, endIndex ] = Rule.parseRuleSyntax_token(syntaxStream, tokens, startIndex + 1);

		// create alternates rule with lastToken, or re-use existing alternates rile
		let alternates;
		let lastToken = tokens.pop();
		if (lastToken instanceof Rule.Alternates) {
			alternates = lastToken;
		}
		else {
			alternates = new Rule.Alternates();

			// if no last token, we have a rule like  `( | abc)` which means that the alternates is optional
			if (!lastToken)
				alternates.optional = true;
			else
				alternates.tokens.push(lastToken);
		}
		// add parsed token to the alternatess
		alternates.tokens.push(token);

		// add back to the end of tokens
		tokens.push(alternates);

		return [ undefined, endIndex ];
	}

};


// List match token:   `[<item><delimiter>]`
// TODO: this is really convenient but non-standard...
// TODO: `[argName:{literal}:]`: not clear that `:` after `argName` is not the delimiter

Rule.List = class List extends Rule {
	toJSON() {
		var item = `{${JSON.stringify(this.item).replace(/"/g,"")}}`;
		var delimiter = `{${JSON.stringify(this.delimiter).replace(/"/g,"")}}`;
		return `${this._type}${this._argName}: { item: ${item}, delimiter: ${delimiter} } ${this.modifiersAsJSON}`;
	}


	toString() {
		return `[${this.item} ${this.delimiter}]${this.modifiersAsString}`;
	}

	// Match list expression `[<item><delimiter>]` in syntax tokens.
	// Returns `[ token, endIndex ]`
	// Throws if invalid.
	static parseRuleSyntax(syntaxStream, tokens, startIndex) {
		let { endIndex, slice } = Tokenizer.findNested(syntaxStream, "[", "]", startIndex);

		let list = new Rule.List();

		var tokens = Rule.parseRuleSyntax_tokens(slice, []);
		if (tokens.length === 4 && tokens[1].value === ":") {
			list.argument = tokens[0];
			list.item = tokens[2]
			list.delimiter = tokens[3]
		}
		else if (tokens.length === 2) {
			list.item = tokens[0]
			list.delimiter = tokens[1]
		}
		else {
			throw new SyntaxError(`Unexpected stuff at end of list: [${slice.join(" ")}]`);
		}
		return [ list, endIndex ];
	}

};

