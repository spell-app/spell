//	# Tokens
//
//
window.Token = class Token {
	constructor(properties) {
		Object.assign(this, properties);
	}

	// Clone this token and add any `props` passed in.
	clone(props) {
		var clone = Object.create(this);
		Object.assign(clone, props);
		return clone;
	}

	// Parse this token at the beginning of `stream`.
	// Default is that `token.name` is literal string to match.
	// On match, returns clone of token with `value`, `stream` and `next`stream.
	// Returns `undefined` if no match.
	parse(parser, stream, matches) {
		if (!stream.startsWith(this.name)) return undefined;
		return this.clone({
			value: this.name,
			stream,
			next: stream.advanceBy(this.name.length)
		});
	}

//
// ## group: reflection
//
	get _type() {
		return this.constructor.name;
	}

	get _argName() {
		if (this.argument) return ` (${this.argument})`;
		return "";
	}

//
// ### group: toJSON
//
	toJSON() {
		return `${this._type}${this._argName}: '${this.name}'${this.modifiersAsJSON}`;
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
		return `${this.name}${this.modifiersAsString}`;
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
	static parseRuleSyntax(syntax) {
		var syntaxStream = Token.tokeniseParseRuleSyntax(syntax);
		var rule = new Rule({ syntax, tokens: [] });
		Token.parseRuleSyntax_tokens(syntaxStream, rule.tokens);

console.group("Parsing: ", syntax);
console.log(  "toString: ", rule.toString());
console.log(JSON.stringify(rule, undefined, 2));
console.groupEnd();

		return rule;
	}

	static tokeniseParseRuleSyntax(syntax) {
		const SYNTAX_EXPRESSION = /(?:[\w\-]+|\\[\[\(\{\)\}\]]|[^\s\w]|\|)/g;
		var syntaxStream = syntax.match(SYNTAX_EXPRESSION);
		if (!syntaxStream) throw new SyntaxError(`Can't tokenize parse rule syntax >>${syntax}<<`);
		return syntaxStream;
	}

	static parseRuleSyntax_tokens(syntaxStream, tokens, startIndex = 0, lastIndex = syntaxStream.length) {
		while (startIndex < lastIndex) {
			let [ part, endIndex ] = Token.parseRuleSyntax_token(syntaxStream, tokens, startIndex);
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
			case "{":	return Token.Rule.parseRuleSyntax(syntaxStream, tokens, startIndex);
			case "(":	return Token.Sequence.parseRuleSyntax(syntaxStream, tokens, startIndex);
			case "[":	return Token.List.parseRuleSyntax(syntaxStream, tokens, startIndex);
			case "|":	return Token.Alternates.parseRuleSyntax(syntaxStream, tokens, startIndex);
			case "*":
			case "+":
			case "?":	return Token.parseRuleSyntax_repeat(syntaxStream, tokens, startIndex);

			// the following should ALWAYS be consumed
			case "}":
			case ")":
			case "]":
				throw new SyntaxError(`Unexpected ${syntaxToken} found as item ${startIndex} of ${this.syntax}`);

			default:
				if (syntaxToken.match(/^[\w\-_]+$/))
					return Token.Keyword.parseRuleSyntax(syntaxStream, tokens, startIndex);

				return Token.String.parseRuleSyntax(syntaxStream, tokens, startIndex);
		}
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


Token.Keyword = class Keyword extends Token{
	// Match `word` in syntax tokens.
	// Returns `[ token, endIndex ]`
	// Throws if invalid.
	static parseRuleSyntax(syntaxStream, tokens, startIndex) {
		var name = syntaxStream[startIndex];
		var token = new Token.Keyword({ name });
		return [ token, startIndex ];
	}
}


Token.String = class String extends Token{
	// Match `word` in syntax tokens.
	// Returns `[ token, endIndex ]`
	// Throws if invalid.
	static parseRuleSyntax(syntaxStream, tokens, startIndex) {
		var name = syntaxStream[startIndex];
		var token = new Token.String({ name });
		// If name starts with `\\`, remove leading slash.
		if (name.startsWith("\\")) {
			token.name = token.name.substr(1);
			token.toString = () => name;
		}
		return [ token, startIndex ];
	}
}



// Regex pattern.
Token.Pattern = class Pattern extends Token {
	parse(parser, stream, matches = []) {
		var match = stream.match(this.pattern);
		if (!match) return undefined;

		return this.clone({
			value: match[0],
			match: match,		// TODO: necessary???
			stream,
			next: stream.advanceBy(match[0].length)
		});

	}
}


Token.Rule = class Rule extends Token {
	parse(parser, stream, matches = []) {
		var result = parser.parseRule(stream, this.name, matches);
		if (!result && !this.optional) ;
	}

	toString() {
		return `{${this.name}}${this.modifiersAsString}`;
	}

	// Match `{<ruleName>}` in syntax tokens.
	// Returns `[ part, endIndex ]`
	// Throws if invalid.
	static parseRuleSyntax(syntaxStream, tokens, startIndex) {
		let match = Tokenizer.findNested(syntaxStream, "{", "}", startIndex);
		if (match.slice.length > 1) throw new SyntaxError(`Can't process rules with more than one rule name: ${rule}`);
		let token = new Token.Rule({ name: match.slice[0] });
		return [ token, match.endIndex ];
	}

}



Token.Nested = class Nested extends Token {
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

Token.Alternates = class Alternates extends Token.Nested {
	toString() {
		return `(${this.tokens.join("|")})${this.modifiersAsString}`;
	}

	// Match alternate `( a | b | c )`.
	// NOTE: this should only happen inside a group...
	static parseRuleSyntax(syntaxStream, tokens, startIndex) {
		let [ token, endIndex ] = Token.parseRuleSyntax_token(syntaxStream, tokens, startIndex + 1);

		// create alternates rule with lastToken, or re-use existing alternates rile
		let alternates;
		let lastToken = tokens.pop();
		if (lastToken instanceof Token.Alternates) {
			alternates = lastToken;
		}
		else {
			alternates = new Token.Alternates();

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


Token.Sequence = class Sequence extends Token.Nested {
	toString() {
		return `(${this.tokens.join(" ")})${this.modifiersAsString}`;
	}

	// Match grouping expression `(...)` in syntax tokens.
	// Returns `[ token, endIndex ]`
	// Throws if invalid.
	static parseRuleSyntax(syntaxStream, tokens, startIndex) {
		let { endIndex, slice } = Tokenizer.findNested(syntaxStream, "(", ")", startIndex);
		let sequence = new Token.Sequence();

		if (slice.length > 2 && slice[1] === ":") {
			sequence.argument = slice[0];
			slice = slice.slice(2);
		}

		Token.parseRuleSyntax_tokens(slice, sequence.tokens);

		// if only one item, this is an optional rule
		if (sequence.tokens.length === 1) {
			let token = sequence.tokens[0];
			if (sequence.argument) token.argument = sequence.argument;
			if (!(token instanceof Token.Alternates)) {
				token.optional = true;
			}
			return [ token, endIndex ];
		}
		return [ sequence, endIndex ];
	}

};


// List match token:   `[<item><delimiter>]`
// TODO: this is really convenient but non-standard...
// TODO: `[argName:{literal}:]`: not clear that `:` after `argName` is not the delimiter

Token.List = class List extends Token {
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

		let list = new Token.List();

		var tokens = Token.parseRuleSyntax_tokens(slice, []);
		if (tokens.length === 4 && tokens[1].name === ":") {
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

