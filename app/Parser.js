// Spell "English" parser strawman

// TODO: 	Parse list
// TODO:	What does syntax tree look like?
// TODO:	Don't use `toJSON` for outputting rule...
// TODO:	Pull `parseRuleSyntax` stuff out into separate module/pattern
// TODO:	Recycle word/string/pattern rules?  do we care?
// TODO:	Maybe stream owns matched tokens?


window.Tokenizer = class Tokenizer {

	// Find the matching instance of possibly nested `endToken` to balance `startToken`.
	// If successful, returns `{ startIndex, endIndex, slice }`
	// Throws if unsucessful.
	static findNested(tokens, startToken, endToken, startIndex = 0) {
		if (tokens[startIndex] !== startToken) throw new SyntaxError(`Expected '${startToken}' at index ${startIndex} of tokens`);
		let nesting = 0;
		let nested = false;
		for (let endIndex = startIndex + 1, lastIndex = tokens.length; endIndex < lastIndex; endIndex++) {
			let token = tokens[endIndex];
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



// TODO: convert to line-aware stream???
window.TextStream = class TextStream {
	constructor(textOrProps) {
		if (typeof textOrProps === "string") this.text = textOrProps;
		else Object.assign(this, textOrProps);
		if (!this.startIndex) this.startIndex = 0;
	}

	// Return an immutable clone of the stream.
	clone(props) {
		let clone = new TextStream(this);
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

// 	// Return clone of this stream with endIndex set to start + `length`
// 	endAfter(length) {
// 		return this.clone({ endIndex: this.startIndex + length });
// 	}

	// Match `pattern` as regex at head of stream.
	// NOTE: regexes should start with `^`!
	// Returns match or undefined.
	match(pattern) {
		if (!(pattern instanceof RegExp)) throw new TypeError(`TextStream.match(${pattern}): expected RegExp`);
//TODO: use `stream.range` to ensure match is not not beyond `string.endIndex`
		return this.head.match(pattern);
	}

	startsWith(string) {
//TODO: use `stream.range` to ensure match is not not beyond `string.endIndex`
		return this.head.startsWith(string);
	}

	// Return text of string starting at our `startIndex`
	get head() {
		return this.range();
	}

	// Return a range of the string from `startIndex` to `endIndex` NON-inclusive.
	range(startIndex = this.startIndex, endIndex = this.text.length) {
		return this.text.substring(startIndex, endIndex);
	}

	// Length of the stream.
	get length() {
		return this.text.length;
	}

	// Are we at the end of the stream?
	get isEmpty() {
		return this.startIndex === this.length;
	}




	//
	//## Reflection
	//
	toString() {
		return this.text
	};
}

window.Parser = class Parser {
	constructor(properties) {
		Object.assign(this, properties);
		// Clone rules, starting with a completely empty map if not defined (no standard object keys)
		this.rules = Object.create(this.rules || null);
	}

	// Parse named rule at head of stream.
	// Handles optional and repeating rules as well as eating whitespace.
	// Throws if a non-optional rule can't be matched.
	// Returns array(???) of matched rules
	parse(name, stream) {
		if (typeof stream === "string") stream = new TextStream(stream);

		let rule = this.rules[name];
		if (!rule) throw new SyntaxError(`Rule ${name} not understood`);
		return this.parseRule(rule, stream);
	}

	// Parse a single `rule` at head of `stream`.
	// Automatically eats whitespace BEFORE the rule.
	// If rule can repeat, keeps eating as long as repeat is valid and `result` will be an array.
	// Returns `[ result, nextStream ]` or `undefined` if no match for an optional rule.
	// Throws if we can't match a mandatory rule.
	parseRule(rule, stream) {
		// Eat whitespace at the beginning of the stream
		stream = this.eatWhitespace(stream);

//TODO: check empty stream???

		// parse the rule
		let result = rule.parse(parser, stream);
console.info(rule, result);
		if (!result) {
			// throwing if no result and rule is not optional
			if (!rule.optional)
				throw new SyntaxError(`Mandatory rule '${name}' not matched at '${stream.head.substr(20)}'`);
			return undefined;
		}

		// advance the stream beyond what was matched
		let nextStream = result.next();

		// If the rule CAN repeat, return an array
		if (rule.repeat) {
			let results = [result];
			while (true) {
				nextStream = this.eatWhitespace(nextStream);
				result = rule.parse(parser, nextStream);
				if (!result) break;
				results.push(result);
				nextStream = result.next()
			}
			result = results;
		}
		return [ result, nextStream ];
	}

	// Eat whitespace (according to `rules.whitespace`) at the beginning of the stream.
	// Returns new stream if we matched whitespace, otherwise the same stream.
	// Otherwise returns this same stream.
	eatWhitespace(stream) {
		var result = this.rules.whitespace.parse(this, stream);
		return result ? result.next() : stream;
	}

	//### Rule factories

	getRule(name) {
		return this.rules[name];
	}

	// Add regex as a pattern to our list of rules
	addPattern(name, pattern, properties) {
		let rule = new Rule.Pattern(properties);
		rule.pattern = pattern;
		return this.addRule(name, rule);
	}

	// Add a rule to our list of rules!
	// TODO: convert to `alternatives` on overwrite?
	addRule(name, rule) {
		if (this.rules[name]) console.warn(`Overwriting rule ${name} old: `, this.rules[name], "new: ", rule);
		rule.name = rule;
		this.rules[name] = rule;
		return rule;
	}

	// Parse a `ruleSyntax rule and add it to our list of rules.
	// Returns the new rule.
// TODO: try...catch strategy?
	addSyntax(name, ruleSyntax) {
		try {
			let rule = Rule.parseRuleSyntax(ruleSyntax);
			return this.addRule(name, rule);
		} catch (e) {
			console.group(`Error parsing syntax for rule '${name}':`);
			console.log(`syntax: ${ruleSyntax}`);
			console.error(e);
		}
	}

}

window.parser = new Parser();

// Simple regex pattern based rules.
parser.addPattern("whitespace", /^\s+/);
parser.addPattern("variable", /^\w[\w\d\-_]*/);
parser.addPattern("literal", /^(?:-?\d+\.?\d*|"(?:[^"\\]|\\.)*"|true|false|yes|no)/);

// Rules auto-derived from our `rule syntax`.
parser.addSyntax("scope-modifier", "(scope:global|constant|shared)");
parser.addSyntax("declare-property", "{scope-modifier}? {variable} = {literal}");
parser.addSyntax("declare-property-as-one-of", "{scope-modifier}? {variable} as one of \\[[enumeration:{literal},]\\]");
parser.addSyntax("literal-enumeration", "\\[[enumeration:{literal},]\\]");

window.stream = new TextStream("a-variable \"a literal\"");


// DEBUG


