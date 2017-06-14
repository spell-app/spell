// Spell "parser" class.
//

// TODO: dependency-inject tokenizer?
import Tokenizer from "./Tokenizer.js";
import Rule from "./Rule.js";

// GRRR... will SOMEONE on the node team please implement console.group ???
if (!console.group) console.group = console.log;
if (!console.groupEnd) console.groupEnd = console.log;

export default class Parser {
	// Set to `true` to output debug info while adding rules
	static DEBUG = false;

	// Constructor.
	constructor(properties) {
		Object.assign(this, properties);
	}

//
//### Parsing
//
	// Parse `ruleName` rule at head of `text`.
	// If you pass only one argument, we'll assume that's `text` and you want to match `statements`.
	// Handles optional and repeating rules as well as eating whitespace.
	// Returns result of parse.
//TESTME
	parse(ruleName, text) {
		// If only one argument, assume that's the text and parse `statements`
		if (arguments.length === 1) {
			text = ruleName;
			ruleName = "statements";
		}

		// Convert to tokens.
		let tokens = this.tokenize(text);
		// Bail if we didn't get any tokens back.
//TODO: WARN?  ERROR?
		if (tokens === undefined) return undefined;

		// If we're not parsing `statements`, use only the first line and pop off indentation.
		if (ruleName !== "statements") {
			tokens = tokens[0];
			// remove whitespace from the start of the line
			if (tokens[0] instanceof Tokenizer.Whitespace) tokens = tokens.slice(1);
		}

		// Parse the rule or throw an exception if rule not found.
		return this.parseRuleOrDie(ruleName, tokens, 0, undefined, "parser.parse()");
	}



	// Parse something:
	//	- if one string argument, does a `compileStatements()`
	// Returns the `toString()` or throws.
//TESTME
	compile(ruleName, text) {
		// If only one argument, assume that's the text and parse `statements`
		if (arguments.length === 1) {
			text = ruleName;
			ruleName = "statements";
		}
		let result = this.parse(ruleName, text);
		if (!result) throw new SyntaxError(`parser.parse('${ruleName}', '${string}'): can't parse this`);
		return result.toSource(this);
	}


	// Parse a named rule (defined in this parser or in any of our `imports`), returning the "best" match.
	// Returns `undefined` if no match.
	// Throws if NOBODY implements `ruleName`.
	//
	// NOTE: currently "best" is defined as the first rule in our `imports` which matches...
	parseRuleOrDie(ruleName, tokens, startIndex, stack, callingContext = "parseRuleOrDie") {
		// Keep track of whether rule was EVER found or not.
		let ruleFound = false;
		let imports = this.imports, index = 0, parser;
		let results = [];
		while (parser = imports[index++]) {
			let rule = parser.rules[ruleName];
			if (!rule) continue;
			const result = rule.parse(this, tokens, startIndex, stack);
			if (result) results.push(result);
			ruleFound = true;
		}
		// If never found, throw.
		if (!ruleFound) throw new SyntaxError(`${callingContext}: rule '${ruleName}' not found`);

		// If no match, return undefined.
		if (results.length === 0) return undefined;

		// If exactly one match, return that.
		if (results.length === 1) return results[0];

		// Otherwise return the longest match.
		return results.reduce(function (largest, next) {
			if (next.nextStart > largest.nextStart) return next;
			return largest;
		}, results[0]);
	}

	// Test whether a named rule MIGHT be found in head of stream.
	// Returns:
	//	- `true` if the rule MIGHT be matched.
	//	- `false` if there is no way the rule can be matched.
	//	- `undefined` if not determinstic (eg: no way to tell quickly).
	testRule(ruleName, tokens, startIndex) {
		let imports = this.imports, index = 0, parser;
		while (parser = imports[index++]) {
			let rule = parser.rules[ruleName];
			if (!rule) continue;
			let result = rule.test(this, tokens, startIndex);
			if (result !== undefined) return result;
		}
	}


//
//### Tokenizing
//

	// Given an arbitarary `text` string, tokenize it and return as an array of arrays of lines.
	// Returns `undefined` if result didn't produce any tokens.
//TODO: `tokenize` returns tokensEnd, complain if `tokensEnd !== end`.
//TESTME
	tokenize(text, start, end) {
		let tokens = Tokenizer.tokenize(text, start, end);
		if (!tokens || tokens.length === 0) return undefined;

		// Convert to lines.
		let lines = [[]];
		tokens.forEach(token => {
			// Skip whitespace which is not an indent.
			if (token instanceof Tokenizer.Whitespace && !token.isIndent) return;

			// add new array for each newline
			if (token === Tokenizer.NEWLINE) return lines.push([]);

			// otherwise just add to the last line
			lines[lines.length - 1].push(token);
		});
		return lines;
	}


//
// ### 	Imports
//		Parsers depend on other parsers for their `rules`.
//		Imports are lazy-bound (and we assume the build file will include all necessary imports).
//

	// Add one or more named imports to this parser.
	// Imports increase in priority the later they are in the list.
	import(...imports) {
		// REVERSE the list of imports, so the most general one is LAST
		// Thus more specific imports will be EARLIER in the `imports` list.

		// Create new array of imports and add import names passed in.
		this._imports = (this._imports || []).concat(imports.reverse());
		// clear memoize variable for `imports`.
		delete this.__imports;
	}

	// Getter to return list of our `imports` as `Parser` objects, INCLUDING `this` parser itself!
	// Most specific import (eg: ourself) is first in the list.
	// Throws if an import can't be found.
	get imports() {
		if (!this.__imports) {
			var imports = (this._imports ? this._imports.map(Parser.getContextOrDie) : []);
			this.__imports = [this].concat(imports);
		}
		return this.__imports;
	}


//
// ### Rules
//
	// Start with an empty map of rules.
	rules = {};

	// Add a `rule` to our list of rules!
	// Converts to `alternatives` on re-defining the same rule.
	addRule(ruleName, rule) {
		// If passed a function, create an instance for the actual rule.
		// This is commonly done so JS will give us meaningful class names in debug output.
		if (typeof rule === "function") {
			rule = new rule();
		}

		// If we got an array of `ruleNames`, recursively add under each name with the same `rule`.
		if (Array.isArray(ruleName)) {
			ruleName.forEach(ruleName => this.addRule(ruleName, rule) );
			return rule;
		}

		// Set `ruleName` if it hasn't been explicitly set.
		if (!rule.ruleName) rule.ruleName = ruleName;

		// If a rule of this name already exists
		const existing = this.rules[ruleName];
		if (existing) {
			// Convert to an `Alternatives` if not one already.
			if (!(existing instanceof Rule.Alternatives)) {
				if (Parser.DEBUG) console.log(`Converting rule '${ruleName}' to alternatives`);
				this.rules[ruleName] = new Rule.Alternatives({ ruleName, rules: [existing] });
				// copy argument name over (???)
				if (existing.argument) this.rules[ruleName].argument = existing.argument;
			}
			if (Parser.DEBUG) console.log(`Adding rule '${rule.ruleName}' to '${ruleName}': `, rule);
			// Add rule to the alternatives.
			this.rules[ruleName].addRule(rule);
		}
		// Otherwise just remember the rule.
		else {
			this.rules[ruleName] = rule;
		}


		// make a note if we're adding a left-recursive rule
//TODO: this doesn't fly if adding under multiple names...  :-(
		if (Parser.ruleIsLeftRecursive(ruleName, rule)) {
//console.info("marking ", rule, " as left recursive!");
			rule.leftRecursive = true;
		}

		return rule;
	}


//
// ### Parser registry.
//
	static REGISTRY = {};

	// Get a parser for a given named "context".
	// Will re-use existing context, or create a new one if parser context is not defined.
	static forContext(context) {
		if (!Parser.REGISTRY[context]) {
			Parser.REGISTRY[context] = new Parser({ context });
		}
		return Parser.REGISTRY[context];
	}

	// Return a parser for a named "context" or throw an exception if not found.
	static getContextOrDie(context) {
		if (Parser.REGISTRY[context]) return Parser.REGISTRY[context];
		throw new TypeError(`Parser.getContextOrDie(): context '${context}' not found.`);
	}



//
// ## Utility methods
//

	// Is the specified rule left-recursive?
	static ruleIsLeftRecursive(ruleName, rule) {
		if (!(rule instanceof Rule.Sequence) || !rule.rules) return false;
//console.log(ruleName, rule);
		let index = 0, subrule = undefined;
		while (subrule = rule.rules[index++]) {
			// ignore optional rules
			if (subrule.optional) continue;
			if (subrule instanceof Rule.Subrule && subrule.rule === ruleName) return true;
			return false;
		}
		return false;
	}

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

