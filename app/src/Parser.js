// Spell "English" parser strawman

// TODO:	consolidate subsequent literal words / strings into a single regex?
// TODO:	`test` function for quick no-good hit on `{a} blah blah {b}`?
// TODO:	this doesn't work:   `{expression} is {expression}`
// TODO:	custom SyntaxError etc which understand streams
// TODO:	break `file` into lines and process each (incl. substr/match not going beyond the end)
// TODO:	nesting -- is this just indent = "add block scope"
// TODO:	promotion pattern for gather arguments (eg: literal-list) ???
// TODO:	What does syntax tree look like?  How do we extract meaning out of the nest?
// TODO:	Recycle word/string/pattern rules to more easily see commonality...
// TODO:	Pass `context` to toSource(), add property descriptors to `class`, variables and code to `method`, `global` stuff etc

import TextStream from "./TextStream.js";
import Rule from "./Rule.js";

// GRRR... will SOMEONE on the node team please implement console.group ???
if (!console.group) console.group = console.log;
if (!console.groupEnd) console.groupEnd = console.log;

export default class Parser {
	// Set to `true` to output debug info while adding rules
	static DEBUG = false;

	constructor(properties) {
		Object.assign(this, properties);

		// Clone rules, starting with a completely empty map if not defined (no standard object keys)
		this.rules = Object.create(this.rules || null);

		// Set up standard rule classes as alternates
		this.addRule("statement", new Rule.Alternatives());
		this.addRule("expression", new Rule.Alternatives());
		this.addRule("infix-operator", new Rule.Alternatives());
		this.addRule("postfix-operator", new Rule.Alternatives());
	}

	getRule(name) {
		return this.rules[name];
	}

//### Parsing

	// Parse `name`d rule at head of `stream`.
	// Handles optional and repeating rules as well as eating whitespace.
	// Returns result of parse.
	parse(name, stream) {
		if (typeof stream === "string") stream = new TextStream(stream);
		let rule = this.getRule(name);
		if (!rule) throw new SyntaxError(`Rule ${name} not understood`, name, stream);
		stream = this.eatWhitespace(stream);
		return rule.parse(this, stream);
	}

	// Eat whitespace (according to `rules.whitespace`) at the beginning of the stream.
	// Returns new stream if we matched whitespace, otherwise the same stream.
	// Otherwise returns this same stream.
	eatWhitespace(stream) {
		var result = this.rules.whitespace.parse(this, stream);
		return result ? result.next() : stream;
	}

//### Rule factories

	// Add a rule to our list of rules!
	// TODO: convert to `alternatives` on overwrite?
	addRule(name, rule) {
		let existing = this.rules[name];
		if (existing) {
			if (!(existing instanceof Rule.Alternatives)) {
				if (Parser.debug) console.log(`Converting rule '${name}' to alternatives`);
				existing = new Rule.Alternatives({ name: existing.name, rules: [existing] });
				this.rules[name] = existing;
			}
			if (Parser.debug) console.log(`Adding rule '${rule.ruleName}' to '${name}': `, rule);
			existing.addRule(rule);
		}
		else {
			rule.ruleName = name;
			this.rules[name] = rule;
		}
		return rule;
	}

	// Add regex as a pattern to our list of rules
	addPattern(name, pattern, properties) {
		let rule = new Rule.Pattern(properties);
		rule.pattern = pattern;
		return this.addRule(name, rule);
	}

//TODO: move to `ruleSyntax.js`

	// Parse a `ruleSyntax` rule and add it to our list of rules.
	// Returns the new rule.
	// Logs parsing errors but allows things to continue.
	addSyntax(name, ruleSyntax, properties, SequenceConstructor = Rule.Sequence) {
		try {
			let rule = Rule.parseRuleSyntax(ruleSyntax, SequenceConstructor);

			// Reflect the rule back out to make sure it looks (more or less) the same
			if (Parser.debug) console.log(`Added rule '${name}':\n  INPUT: ${ruleSyntax} \n OUTPUT: ${rule}`);

			Object.assign(rule, properties);
			return this.addRule(name, rule);
		} catch (e) {
			console.group(`Error parsing syntax for rule '${name}':`);
			console.log(`syntax: ${ruleSyntax}`);
			console.error(e);
		}
	}

	addStatement(name, ruleSyntax, properties) {
		var rule = this.addSyntax(name, ruleSyntax, properties, Rule.Statement);
		if (rule) return this.addRule("statement", rule);
	}

	addExpression(name, ruleSyntax, properties) {
		var rule = this.addSyntax(name, ruleSyntax, properties, Rule.Expression);
		if (rule) return this.addRule("expression", rule);
	}

	addInfixOperator(name, ruleSyntax, properties) {
		var rule = this.addSyntax(name, ruleSyntax, properties);
		if (rule) {
			if (!rule.transformer) {
				throw new TypeError(`Expected infix operator rule '${name}' to specify 'transformer' function`)
			}
			return this.addRule("infix-operator", rule);
		}
	}

	addPostfixOperator(name, ruleSyntax, properties) {
		var rule = this.addSyntax(name, ruleSyntax, properties);
		if (rule) {
			if (!rule.transformer) {
				throw new TypeError(`Expected postfix operator rule '${name}' to specify 'transformer' function`);
			}
			return this.addRule("postfix-operator", rule);
		}
	}


//
// ## Utility methods
//
	// Find the matching instance of possibly nested `endToken` to balance `startToken`.
	// If successful, returns `{ startIndex, endIndex, slice }`
	// Throws if unsucessful.
	static findNestedTokens(tokens, startToken, endToken, startIndex = 0) {
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

