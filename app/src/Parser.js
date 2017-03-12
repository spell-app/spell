// Spell "English" parser strawman

// TODO:	custom SyntaxError etc which understand streams
// TODO:	break `file` into lines and process each (incl. substr/match not going beyond the end)
// TODO:	nesting -- is this just indent = "add block scope"
// TODO:	promotion pattern for gather arguments (eg: literal-list) ???
// TODO:	What does syntax tree look like?  How do we extract meaning out of the nest?
// TODO:	Don't use `toJSON` for outputting rule...
// TODO:	Recycle word/string/pattern rules to more easily see commonality...
// TODO:	Pass `context` to toSource(), add property descriptors to `class`, variables and code to `method`, `global` stuff etc

import TextStream from "./TextStream.js";
import Rule from "./Rule.js";

export default class Parser {
	constructor(properties) {
		Object.assign(this, properties);
		// Clone rules, starting with a completely empty map if not defined (no standard object keys)
		this.rules = Object.create(this.rules || null);
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
				console.log(`Converting rule '${name}' to alternatives`);
				existing = new Rule.Alternatives({ name: existing.name, rules: [existing] });
				this.rules[name] = existing;
			}
			console.log(`Adding rule '${rule.ruleName}' to '${name}': `, rule);
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

	// Parse a `ruleSyntax` rule and add it to our list of rules.
	// Returns the new rule.
	// Logs parsing errors but allows things to continue.
	addSyntax(name, ruleSyntax, properties, SequenceConstructor = Rule.Sequence) {
		try {
			let rule = Rule.parseRuleSyntax(ruleSyntax, SequenceConstructor);

			// Reflect the rule back out to make sure it looks (more or less) the same
			console.log(`Added rule '${name}':\n  INPUT: ${ruleSyntax} \n OUTPUT: ${rule}`);

			Object.assign(rule, properties);
			return this.addRule(name, rule);
		} catch (e) {
			console.group(`Error parsing syntax for rule '${name}':`);
			console.log(`syntax: ${ruleSyntax}`);
			console.error(e);
			console.groupEnd();
		}
	}

	addStatement(name, ruleSyntax, properties) {
		var statement = this.addSyntax(name, ruleSyntax, properties, Rule.Statement);
		return this.addRule("statement", statement);
	}

	addExpression(name, ruleSyntax, properties) {
		var expression = this.addSyntax(name, ruleSyntax, properties, Rule.Expression);
		return this.addRule("expression", expression);
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

