// Spell "English" parser strawman

// TODO:	`test` function for quick no-good hit on `{a} blah blah {b}`?
// TODO:	this doesn't work:   `{expression} is {expression}`
// TODO:	break `file` into lines and process each (incl. substr/match not going beyond the end)
// TODO:	nesting -- is this just indent = "add block scope"
// TODO:	promotion pattern for gather arguments (eg: literal-list) ???
// TODO:	What does syntax tree look like?  How do we extract meaning out of the nest?
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
	}

	getRule(name) {
		return this.rules[name];
	}

//
//### Parsing
//
	// Parse `name`d rule at head of `stream` (`string` or `TextStream`).
	// Handles optional and repeating rules as well as eating whitespace.
	// Returns result of parse.
	parse(name, stream) {
		if (typeof stream === "string") stream = new TextStream(stream);
		let rule = this.getRule(name);
		if (!rule) throw new SyntaxError(`parser.parse(${name}): Rule not found`);
		stream = this.eatWhitespace(stream);
		return rule.parse(this, stream);
	}

	// Eat whitespace (according to `rules.whitespace`) at the beginning of the stream.
	// Returns new stream if we matched whitespace, otherwise the same stream.
	eatWhitespace(stream) {
		let result = this.rules.whitespace.parse(this, stream);
		if (!result) return stream;
		return stream.advanceBy(result.matched.length);
	}

	// Add a rule to our list of rules!
	// Converts to `alternatives` on re-defining the same rule.
	addRule(name, rule) {
		let existing = this.rules[name];
		if (existing) {
			if (!(existing instanceof Rule.Alternatives)) {
				if (Parser.debug) console.log(`Converting rule '${name}' to alternatives`);
				this.rules[name] = new Rule.Alternatives({ ruleName: name, rules: [existing] });
				// copy argument name over (???)
				if (existing.argument) this.rules[name].argument = existing.argument;
			}
			if (Parser.debug) console.log(`Adding rule '${rule.ruleName}' to '${name}': `, rule);
			this.rules[name].addRule(rule);
		}
		else {
			// don't override ruleName
			if (!rule.ruleName) rule.ruleName = name;
			this.rules[name] = rule;
		}
		return rule;
	}


//
// ## Utility methods
//

	// Find the matching instance of possibly nested `endToken` to balance `startToken`
	//	in array of `tokens` (strings).
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


	// List of special characters in regular expressions.
	// Used to escape those chars when creating regular expressions from strings.
	static REGEXP_SPECIAL_CHARACTERS = (function() {
		const chars = {};
		"\\/^$*+?.()|{},[]".split("").forEach(char => chars[char] = true);
		return chars;
	})()

	// Given a "normal" `string`, escape any regular expression special characters
	//	so we can create a `new RegExp()`.
	// Also converts a single space to arbitrary set of spaces with "\s+"
	static escapeRegExpCharacters(string) {
		return string.split("").map(function (char, index, list) {
			// Special case for backslash
			if (char === "\\") return "\\";
			// Special case for space
			if (char === " ") return "\\s+";
			// If a special char and previous character was not an escape, escape the result.
			if (Parser.REGEXP_SPECIAL_CHARACTERS[char] && list[index-1] !== "\\") return "\\"+char;
			// This char should be fine by itself.
			return char;
		}).join("");
	}

	// Create a new regular expression from a "normal" string, escaping special characters as necessary.
	static RegExpFromString(string, flags) {
		return new RegExp(Parser.escapeRegExpCharacters(string), flags);
	}

}

