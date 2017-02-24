// Spell "English" parser strawman


// TODO:	make parseRuleSyntax() use a TextStream?  TokenStream?

// TODO:  	return single value: token.clone({..., stream}) or undefined
//			caller pulls stream out for next run as desired


window.Tokenizer = class Tokenizer {

	// Find the matching instance of possibly nested `endToken` to balance `startToken`.
	// If successful, returns `{ startIndex, endIndex, slice }`
	// Throws if unsucessful.
	static findNested(tokens, startToken, endToken, startIndex = 0) {
		if (tokens[startIndex] !== startToken) throw new SyntaxError(`Expected '${startToken}' at index ${startIndex} of tokens`);
		var nesting = 0;
		var nested = false;
		for (var endIndex = startIndex + 1, lastIndex = tokens.length; endIndex < lastIndex; endIndex++) {
			var token = tokens[endIndex];
			if (token === startToken) {
				nesting++;
				nested = true;
			}
			if (token === endToken) {
				if (nesting === 0)
					return { startIndex, endIndex, slice: tokens.slice(startIndex+1, endIndex), nested };
				nesting--;
			}
		}
		throw new SyntaxError(`Couldn't find matching '${endToken}'s starting at item ${startIndex}`);
	}

}


window.TextStream = class TextStream {
	constructor(textOrProps) {
		if (typeof textOrProps === "string") this.text = textOrProps;
		else Object.assign(this, textOrProps);
		if (!this.startIndex) this.startIndex = 0;
	}

	// Return an immutable clone of the stream.
	clone(props) {
		var clone = new TextStream(this);
		Object.assign(clone, props);
		return clone;
	}

	// Return a clone of the stream, advanced to new startIndex.
	advanceTo(startIndex) {
		return this.clone({ startIndex });
	}

	// Return a clone of the stream, advancing startIndex BY `length`
	advanceBy(length) {
		return this.clone({ startIndex: this.startIndex + length });
	}

	// Match `pattern` as string or regex at head of stream.
	// NOTE: regexes should start with `^`!
	// Returns `[ match, cloneAfterMatch ]` or `[]` if no match.
	match(pattern) {
		var match;
		if (typeof pattern === "string") {
			if (this.text.startsWith(pattern, this.startIndex)) {
				match = pattern;
			}
		}
		if (pattern instanceof RegExp) {
			var regexMatch = this.head.match(pattern);
			if (regexMatch) match = regexMatch[0];
		}
		if (match) return [ match, this.advanceBy(match.length) ];
		return [undefined, this];
	}

	// Return text of string starting at our `startIndex`
	get head() {
		return this.range();
	}

	// Return a range of the string from `startIndex` to `endIndex` NON-inclusive.
	range(startIndex = this.startIndex, endIndex = this.text.length) {
		return this.text.substring(startIndex, endIndex);
	}

	// Eat whitespace at the beginning of the stream.
	// Returns `[ match, cloneAfterMatch ]` or `[]` if no match.
	eatWhitespace() {
		return this.match(/^\s+/);
	}

	// Length of the stream.
	get length() {
		return this.text.length;
	}

	// Are we at the end of the stream?
	get isEmpty() {
		return this.startIndex === this.length;
	}

}

window.Rule = class Rule {
	constructor(properties) {
		Object.assign(this, properties);
	}

	parse(parser, stream, matches = []) {
		for (let token in this.tokens) {
			if (stream.isEmpty && !token.optional)
				throw new SyntaxError("Stream is empty");

			let startIndex = stream.startIndex;
			let [ match, endIndex ] = token.parse(parser, stream, matches);

			matches.push({ startIndex, endIndex, match });
			stream = stream.advanceTo(endIndex + 1);
		}
		return [ stream, matches ];
	}

	toJSON() {
		return this.tokens;
	}

	toString() {
		return this.tokens.join(" ");
	}

}

Rule.Pattern = class Pattern extends Rule {
	constructor(props) {
		super(props);
	}

	parse(parser, stream, matches) {
		return stream.match(this.pattern);
	}
}





window.Parser = class Parser {
	constructor(properties) {
		Object.assign(this, properties);
		// Clone rules, starting with a completely empty map (no standard object keys)
		this.rules = Object.create(this.rules || null);
	}

	// Parse head of stream starting at named rule.
	// NOTE: modifies the stream!
	parseRule(stream, name, matches = []) {
		var rule = this.rules[name];
		if (!rule) throw new SyntaxError(`Rule ${this.name} not understood`);

		var result = rule.parse(parser, stream, matches);
	}

	// Add a rule to our list of rules!
	// TODO: add array of rules on overwrite?
	addRule(name, rule) {
		if (this.rules[name]) console.warn(`Overwriting rule ${name} old: `, this.rules[name], "new: ", rule);
		this.rules[name] = rule;
		return rule;
	}

	// Add regex as a pattern to our list of rules
	addPattern(name, pattern, properties) {
		var rule = new Rule.Pattern(properties);
		rule.name = name;
		rule.pattern = pattern;
		return this.addRule(name, rule);
	}
}


// DEBUG
Token.parseRuleSyntax("(modifier:global|constant|shared)? {variable} as one of \\([enumeration:{literal},]\\)");


window.parser = new Parser();

// Simple regex pattern based rules.
parser.addPattern("whitespace", /^\s+/);
parser.addPattern("variable", /^\w[\w\d\-_]*/);
parser.addPattern("literal", /^(?:-?\d+\.?\d*|"(?:[^"\\]|\\.)*"|true|false|yes|no)/);

window.stream = new TextStream("a-variable \"a literal\"");


var testResults = {
	variable: parser.rules.variable.parse(parser, stream)[0],
	whitespace: stream.eatWhitespace()[0],
	literal: parser.rules.literal.parse(parser, stream)[0]
}
console.info(testResults)
