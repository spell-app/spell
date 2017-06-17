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

	// Should we warn about anomalous conditions?
	static WARN = false;

	// Set to `true` to output timing info.
	static TIME = false;

	// Pointer to our tokenizer.
	Tokenzier = Tokenizer;

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
		if (Parser.TIME) console.time("tokenize");
		let tokens = Tokenizer.tokenize(text);
		// eat non-indent whitespace (since we ignore it)
		tokens = tokens.filter(token => !Tokenizer.isNormalWhitespace(token));
		if (Parser.TIME) console.timeEnd("tokenize");

		// Bail if we didn't get any tokens back.
//TODO: WARN?  ERROR?
		if (!tokens || tokens.length === 0) return undefined;

		if (Parser.TIME) console.time("parse");
		// If we're not parsing `statements`, eat whitespace at the beginning of the line.
		if (ruleName !== "statements") {
			tokens = Tokenizer.removeLeadingWhitespace(tokens);
		}

		// Parse the rule or throw an exception if rule not found.
		let result = this.parseRuleOrDie(ruleName, tokens, 0, tokens.length, undefined, "parser.parse()");
		if (Parser.TIME) console.timeEnd("parse");
		return result;
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
		if (!result) throw new SyntaxError(`parser.parse('${ruleName}', '${text}'): can't parse this`);
		return result.toSource(this);
	}


	// Parse a named rule (defined in this parser or in any of our `imports`), returning the "best" match.
	// Returns `undefined` if no match.
	// Throws if NOBODY implements `ruleName`.
	//
	// NOTE: currently "best" is defined as the first rule in our `imports` which matches...
	parseRuleOrDie(ruleName, tokens, start, end, stack, callingContext = "parseRuleOrDie") {
		// Keep track of whether rule was EVER found or not.
		let ruleFound = false;
		let imports = this.imports, index = 0, parser;
		let results = [];
		while (parser = imports[index++]) {
			let rule = parser._rules[ruleName];
			if (!rule) continue;
			const result = rule.parse(this, tokens, start, end, stack);
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

	// Test whether a rule (which may be specified by name) MIGHT be found in head of stream.
	// Returns:
	//	- `true` if the rule MIGHT be matched.
	//	- `false` if there is no way the rule can be matched.
	//	- `undefined` if not determinstic (eg: no way to tell quickly).
	testRule(rule, tokens, start, end) {
		// Handle rule instance
		if (rule instanceof Rule) {
			return rule.test(this, tokens, start, end);
		}
		// Handle named rule by looking in our imports
		let imports = this.imports, index = 0, parser;
		while (parser = imports[index++]) {
			let nextRule = parser._rules[rule];
			if (!nextRule) continue;
			let result = nextRule.test(this, tokens, start, end);
			if (result !== undefined) return result;
		}
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
	_rules = {};

	// DANGEROUS: return map of array of named rules for us and our imports
	// NOTE: We memoize this but there's nothing that resets this when our imports change!
	get rules() {
		if (!this.__rules) {
			let output = this.__rules = {};
			// For each parser
			this.imports.forEach(parser => {
				// Merge rules into an Alternatives in output rules.
				for (var ruleName in parser._rules) {
					let rule = parser._rules[ruleName];
					let alternatives = output[ruleName] || (output[ruleName] = new Rule.Alternatives({ ruleName }));

					if (rule instanceof Rule.Alternatives
					 && rule.ruleName === ruleName
					 && !rule.argument
					) {
						rule.rules.forEach( alternative => alternatives.addRule(alternative) );
					}
					else {
						alternatives.addRule(rule);
					}
				}
			});
		}
		return this.__rules;
	}

	// Return ALL instances of named rule, for us and our imports.
	getRule(ruleName) {
		let rules = [];
		let imports = this.imports, index = 0, parser;
		while (parser = imports[index++]) {
			if (parser._rules[ruleName]) rules.push(parser._rules[ruleName]);
		}
		return rules;
	}

	// Return the concatenated blacklist for a given rule.
	getBlacklist(ruleName) {
		let rules = this.getRule(ruleName);
		return rules.reduce(function (blacklist, rule) {
			return Object.assign(blacklist, rule.blacklist);
		}, {});
	}

	// Add a `rule` to our list of rules!
	// Converts to `alternatives` on re-defining the same rule.
	addRule(ruleName, rule) {
		// Clear memoized `__rules`
		delete this.__rules;

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
		const existing = this._rules[ruleName];
		if (existing) {
			// Convert to an `Alternatives` if not one already.
			if (!(existing instanceof Rule.Alternatives)) {
				if (Parser.DEBUG) console.log(`Converting rule '${ruleName}' to alternatives`);
				this._rules[ruleName] = new Rule.Alternatives({ ruleName, rules: [existing] });
				// copy argument name over (???)
				if (existing.argument) this._rules[ruleName].argument = existing.argument;
			}
			if (Parser.DEBUG) console.log(`Adding rule '${rule.ruleName}' to '${ruleName}': `, rule);
			// Add rule to the alternatives.
			this._rules[ruleName].addRule(rule);
		}
		// Otherwise just remember the rule.
		else {
			this._rules[ruleName] = rule;
		}


		// make a note if we're adding a left-recursive rule
//TODO: this doesn't fly if adding under multiple names...  :-(
		if (Parser.ruleIsLeftRecursive(ruleName, rule)) {
			if (!rule instanceof Rule.Sequence) {
				throw new TypeError(`Error defining rule '${ruleName}': Only Sequence rules can be leftRecusive`);
			}
			// You must define a `testRule` for left recursive sequences.
			// e.g. `testRule = new Rule.Match({ match: ["something"] })`
			if (!rule.testRule) {
				throw new TypeError(`Error defining rule '${rule.ruleName}': You must define a 'testRule' for leftRecusive rules.`);
			}
			if (Parser.DEBUG) console.info("marking ", rule, " as left recursive!");

			rule.leftRecursive = true;
		}

		return rule;
	}


//
// ### Parser registry.
//
	static REGISTRY = {};

	// Get a parser for a given `contextName`.
	// Will re-use existing parser, or create a new one if not already defined.
	static forContext(contextName) {
		if (!Parser.REGISTRY[contextName]) {
			Parser.REGISTRY[contextName] = new Parser({ contextName });
		}
		return Parser.REGISTRY[contextName];
	}

	// Return a parser for `contextName` or throw an exception if not found.
	static getContextOrDie(contextName) {
		if (Parser.REGISTRY[contextName]) return Parser.REGISTRY[contextName];
		throw new TypeError(`Parser.getContextOrDie(): contextName '${contextName}' not found.`);
	}



//
// ## Utility methods
//

	// Is the specified rule left-recursive?
	// True for sequences where the first non-optional rule recursively calls `ruleName`.
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
	// If successful, returns `{ start, end, slice }`
	// Throws if unsucessful.
	static findNestedTokens(tokens, startToken, endToken, start = 0) {
		if (tokens[start] !== startToken) throw new SyntaxError(`Expected '${startToken}' at index ${start} of tokens`);
		let nesting = 0;
		let nested = false;
		for (let end = start + 1, lastIndex = tokens.length; end < lastIndex; end++) {
			let token = tokens[end];
			if (token === startToken) {
				nesting++;
				nested = true;
			}
			if (token === endToken) {
				if (nesting === 0)
					return { start, end, slice: tokens.slice(start+1, end), nested };
				nesting--;
			}
		}
		throw new SyntaxError(`Couldn't find matching '${endToken}'s starting at item ${start}`);
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

