// Spell "English" parser strawman

// TODO:	consistent `parse => rule`
// TODO:	custom SyntaxError etc which understand streams
// TODO:	add same named rule = make alternatives
// TODO:	`statement` vs `expression` vs `control structure` etc -- are these just named rules?
// TODO:	break `file` into lines and process each (incl. substr/match not going beyond the end)
// TODO:	nesting -- is this just indent = "add block scope"
// TODO:	promotion pattern for gather arguments (eg: literal-list)
// TODO:	What does syntax tree look like?  How do we extract meaning out of the nest?
// TODO:	Don't use `toJSON` for outputting rule...
// TODO:	Recycle word/string/pattern rules to more easily see commonality...
// TODO:	Pass `context` to toSource(), add property descriptors to `class`, variables and code to `method`, `global` stuff etc

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




window.Parser = class Parser {
	constructor(properties) {
		Object.assign(this, properties);
		// Clone rules, starting with a completely empty map if not defined (no standard object keys)
		this.rules = Object.create(this.rules || null);
	}

	// Parse `name`d rule at head of `stream`.
	// Handles optional and repeating rules as well as eating whitespace.
	// Throws if a non-optional rule can't be matched.
	// Returns result of parse.
	parse(name, stream) {
		if (typeof stream === "string") stream = new TextStream(stream);

		let rule = this.getRule(name);
		if (!rule) throw new SyntaxError(`Rule ${name} not understood`);
		return rule.parse(this, stream);
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
console.info(rule, "\n", result);
		// throw if no result and rule is not optional
		if (!result && !rule.optional)
			throw new SyntaxError(`Mandatory rule '${rule.ruleName}' not matched at '${stream.head.substr(20)}'`);

		return result;
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
		rule.ruleName = name;
		this.rules[name] = rule;
		return rule;
	}

	// Parse a `ruleSyntax` rule and add it to our list of rules.
	// Returns the new rule.
	// Logs parsing errors but allows things to continue.
	addSyntax(name, ruleSyntax, properties) {
		try {
			let rule = Rule.parseRuleSyntax(ruleSyntax);
			Object.assign(rule, properties);
			return this.addRule(name, rule);
		} catch (e) {
			console.group(`Error parsing syntax for rule '${name}':`);
			console.log(`syntax: ${ruleSyntax}`);
			console.error(e);
			console.groupEnd();
		}
	}

}

window.parser = new Parser();
