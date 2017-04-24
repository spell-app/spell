//	# Parser Rules
//	Rules can be as simple as a string `Keyword` or a complex sequence of (nested) rules.
//
//	Parse a rule with `rule.parse(parser, stream)`, this will either:
//		- return `undefined` if the rule doesn't match the head of the stream, or
//		- return a CLONE of the rule with at least the following:
//			- `stream`		Stream which was matched with `startIndex` at the start of the match
//			- `endIndex`	Non-inclusive end index in stream where match ends.
//
//	The clone returned above can be manipulated with
//		- `rule.results`			Return matched arguments in a format suitable to do:
//		- `rule.toSource(context)`	Return javascript source to interpret the rule.
//
import Parser from "./Parser.js";


export default class Rule {
	constructor(properties) {
		if (this.constructor !== Rule || !this.constructor.prototype.hasOwnProperty("constructor")) {
//console.warn("not rule", this);
		}
		Object.assign(this, properties);
	}

	// Clone this rule and add any `props` passed in.
	clone(...props) {
		let clone = Object.create(this);
		Object.assign(clone, ...props);
		return clone;
	}

	// For a rule instance associated with a stream,
	// return a new stream AFTER this rule's end.
	next() {
		if (!this.stream || this.endIndex === undefined)
			throw new TypeError(`rule.next() called on rule without a stream`, this);
		return this.stream.advanceTo(this.endIndex);
	}

//
//	Parsing primitives -- you MUST implement these in your subclasses!
//

	// Attempt to match this rule in the `stream`.
	// Returns results of the parse or `undefined`.
	parse(parser, stream) {
		return undefined;
	}

	// Is this rule deterministic, eg: can it be quickly and unambiguously satisfied?
	// Returning `true` can speed up sequence processing,
	//	but if you're really not sure, return `undefined`.
	isDeterministic(parser, stream) {
		return undefined;
	}

//
// ## output as source
//

	// "gather" arguments in preparation to call `toSource()`
	// Only callable after parse is completed.
	// NOTE: you may want to memoize the results.
	get results() {
		return this;
	}

	// Output value for this INSTANTIATED rule as source.
	toSource(context) {
		return this.matched;
	}

//
// ## group: reflection
//
	get ruleType() {
		return this.constructor.name;
	}
}




// Regex pattern.
// `rule.pattern` is the regular expression to match.
//
// NOTE	To make this more generally applicable, do NOT start the pattern with a `^`.
//		We'll automatically make a copy of the RegExp with the start point attached
//		and use that as appropriate.
//
//		This way we can re-use the regex to check for a match in the middle of the stream...
//
// You can optionally specify a `rule.blacklist`, a set of matches which will specifically NOT work,
//	eg for `identifier.
Rule.Pattern = class Pattern extends Rule {
	constructor(properties) {
		// `pattern` is required
		if (!properties.pattern) throw new TypeError("new Rule.Pattern(): You must pass a `pattern` parameter");

		super(properties);

		// Create a `startPattern` to match at the beginning of the strong
		// Create non-enumerably.
		Object.defineProperty(this, "startPattern", { value: new RegExp("^" + this.pattern.source) });
	}

	// Attempt to match this pattern at the beginning of the stream.
	parse(parser, stream) {
		let match = stream.match(this.startPattern);
		if (!match) return undefined;

		// bail if present in blacklist
		let matched = match[0];
		if (this.blacklist && this.blacklist[matched]) return undefined;

		return this.clone({
			matched,
			// DEBUG
			startIndex: stream.startIndex,
			endIndex: stream.startIndex + matched.length,
			stream
		});
	}

	// Patterns are ALWAYS deterministic.
	isDeterministic(parser, stream) {
		return true;
	}

	addToBlacklist(...words) {
		if (!this.blacklist) this.blacklist = {};
		words.forEach(word => this.blacklist[word] = true);
	}

	toString() {
		return this.pattern.source;
	}
}

// Rule for literal string value, which include punctuation such as `(` etc.
// `Symbol`s are different from `Keywords` in that they do not require a word boundary.
//TODO: rename `Symbol`???
Rule.Symbol = class Symbol extends Rule.Pattern {
	constructor(properties) {
		// `string` is requied.
		if (!properties.string) throw new TypeError("new Rule.Symbol(): Expected string property");

		// convert string to pattern
		if (!properties.pattern) {
			properties.pattern = Parser.RegExpFromString(properties.string);
//console.info(properties.string, properties.pattern);
		}

//		console.info("creating string", properties);
		super(properties);
	}


	toString() {
		return `${this.string}${this.optional ? '?' : ''}`;
	}
}

// Merge two Symbol rules together, returning a new rule that matches both.
Rule.mergeSymbols = function(first, second) {
	return new Rule.Symbol({ string: first.string + second.string });
}

// Keyword pattern.
// Properties:
//	- `rule.string` 	(required) 	Keyword string to match.
//	- `rule.pattern`	(optional) 	RegExp for the match.
//									We'll create one from `string` if necessary.
//									NOTE: do NOT start the `pattern` with `^`.
Rule.Keyword = class Keyword extends Rule.Pattern {
	constructor(properties) {
		// `string` is requied.
		if (!properties.string) throw new TypeError("new Rule.Keyword(): Expected string property");

		// derive `pattern` if necessary.
		if (!properties.pattern) {
			// enforce word boundaries and allow arbitrary space between words
			let patternString = Parser.escapeRegExpCharacters(properties.string);
			properties.pattern = new RegExp("\\b" + patternString + "\\b");
		}
		super(properties);
	}

	toString() {
		return `${this.string}${this.optional ? '?' : ''}`;
	}
}


// Merge two Keyword rules together, adding the second to the first.
Rule.mergeKeywords = function(first, second) {
	return new Rule.Keyword({ string: first.string + " " + second.string });
}


// Subrule -- name of another rule to be called.
// `rule.rule` is the name of the rule in `parser.rules`.
Rule.Subrule = class Subrule extends Rule {
	parse(parser, stream) {
		let rule = parser.getRule(this.rule);
		if (!rule) throw new SyntaxError(`Attempting to parse unknown rule '${this.rule}'`);
		let match = rule.parse(parser, stream);
		if (!match) return undefined;

		if (this.argument) match.argument = this.argument;
		return match;
	}

	isDeterministic(parser, stream) {
		let rule = parser.getRule(this.rule);
		if (!rule) return false;
		return rule.isDeterministic(parser, stream);
	}

	toString() {
		return `{${this.argument ? this.argument+":" : ""}${this.rule}}${this.optional ? '?' : ''}`;
	}
}



// Abstract:  `Nested` rule -- composed of a series of other `rules`.
Rule.Nested = class Nested extends Rule {

	// Is this deterministic, eg: are our subrules unambigously determinable?
	isDeterministic(parser, stream) {
		return this.rules.every(rule => rule.isDeterministic(parser, stream));
	}
}


// Sequence of rules to match (auto-excluding whitespace).
Rule.Sequence = class Sequence extends Rule.Nested {
	parse(parser, stream) {
		let matched = [], next = stream;
		for (let rule of this.rules) {
			next = parser.eatWhitespace(next);
			let match = rule.parse(parser, next);
			if (!match && !rule.optional) return undefined;
			if (match) {
				matched.push(match);
				next = match.next();
			}
		}
		// if we get here, we matched all the rules!
		return this.clone({
			matched,
			// DEBUG
			matchedText: stream.range(stream.startIndex, next.startIndex),
			// DEBUG
			startIndex: stream.startIndex,
			endIndex: next.startIndex,
			stream
		});
	}

//TODOC
	// "gather" arguments in preparation to call `toSource()`
	// Only callable after parse is completed.
	// Returns an object with properties from the `matched` array indexed by
	//		- `match.argument`:		argument set when rule was declared, eg: `{value:literal}` => `value`
	//		- `match.ruleName`:		name of rule when defined
	//		- `rule type`:				name of the rule type
	// NOTE: memoizes the results.
	get results() {
		if (!this.matched) return undefined;
		if (!this._results) {
			let results = this._results = {};
			for (let match of this.matched) {
				let argName = match.argument || match.ruleName || match.constructor.name;

				// If arg already exists, convert to an array
				if (argName in results) {
					if (!Array.isArray(results[argName])) results[argName] = [results[argName]];
					results[argName].push(match);
				}
				else {
					results[argName] = match;
				}
			}
		}
		return this._results;
	}

	toString() {
		return `${this.rules.join(" ")}${this.optional ? '?' : ''}`;
	}

}

// Syntactic sugar for debugging
Rule.Expression = class expression extends Rule.Sequence {
	parse(parser, stream) {
		if (this.dontRecurse) {
//console.info("NOT recursing into ", this);
			return undefined;
		}
		// If the expression is leftRecursive, set a flag so we don't attempt to recurse into it again.
//TODO: this is dangerous: an exception will leave the flag set...
		if (this.leftRecursive) {
			this.dontRecurse = true;
//console.warn("Setting dontRecurse for", this);
		}
		let match = super.parse(parser, stream);
		if (this.leftRecursive) {
//console.info("clearing dontRecurse for ", this);
			delete this.dontRecurse;
		}
		return match;
	}
}


// Statements take up the entire line.
Rule.Statement = class statement extends Rule.Sequence {}


// Alternative syntax, matching one of a number of different rules.
// The result of a parse is the longest rule that actually matched.
// NOTE: Currently takes the longest valid match.
// TODO: match all valid alternatives
// TODO: rename?
Rule.Alternatives = class Alternatives extends Rule.Nested {
	constructor(props) {
		super(props);
		if (!this.rules) this.rules = [];
	}

	// Find the LONGEST match
	parse(parser, stream) {
		let bestMatch;
		for (let rule of this.rules) {
			let match = rule.parse(parser, stream);
			if (!match) continue;

			// take the longest match
			if (!bestMatch || match.endIndex > bestMatch.endIndex)
				bestMatch = match;
		}
		if (!bestMatch) return undefined;

		// assign `argName` or `ruleName` for `results`
		if (this.argument) bestMatch.argument = this.argument;
		else if (this.ruleName) bestMatch.ruleName = this.ruleName;
//TODO: other things to copy here???
		return bestMatch;
	}

	addRule(rule) {
		this.rules.push(rule);
	}

	toSource(context) {
		return this.matched.toSource(context);
	}

	toString() {
		return `(${this.argument ? this.argument+":" : ""}${this.rules.join("|")})${this.optional ? '?' : ''}`;
	}
};



// Repeating rule.
//	`this.rule` is the rule that repeats.
//
// After matching:
//	`this.matched` is array of results of matches.
//
//	Automatically consumes whitespace before rules.
//	If doesn't match at least one, returns `undefined`.
Rule.Repeat = class Repeat extends Rule.Nested {
	parse(parser, stream) {
		let next = stream;
		let matched = [];
		while (true) {
			next = parser.eatWhitespace(next);
			let match = this.rule.parse(parser, next);
			if (!match) break;

			matched.push(match);
			next = match.next();
		}

		if (matched.length === 0) return undefined;

		return this.clone({
			matched,
			// DEBUG
			matchedText: stream.range(stream.startIndex, next.startIndex),
			// DEBUG
			startIndex: stream.startIndex,
			endIndex: next.startIndex,
			stream
		});
	}

	// "gather" arguments in preparation to call `toSource()`
	// Only callable after parse is completed.
	// Returns an array with arguments of all results.
	// NOTE: memoizes the results.
	get results() {
		if (!this.matched) return undefined;
		return this._results || (this._results = this.matched.map( match => match.results ));

	}

	toSource() {
		throw "Don't understand how to source Rule.Repeat!";
	}

	toString() {
		const rule = (this.rule instanceof Rule.Sequence || this.rule instanceof Rule.Keyword && this.rule.string.includes(" ")
				   ? `(${this.rule})`
				   : `${this.rule}`
				);
		return `${rule}${this.optional ? '*' : '+'}`;
	}
}


// List match rule:   `[<item><delimiter>]`. eg" `[{number},]` to match `1,2,3`
//	`rule.item` is the rule for each item,
//	`rule.delimiter` is the delimiter between each item.
// 	`rule.matched` in the output is the list of values.
//
//
// NOTE: we assume that a List rule will NOT repeat (????)
Rule.List = class List extends Rule {
	parse(parser, stream) {
		// ensure item and delimiter are optional so we don't barf in `parseRule`
		this.item.optional = true;
		this.delimiter.optional = true;

		let matched = [], next = stream;
		while (true) {
			next = parser.eatWhitespace(next);
			// get next item, exiting if not found
			let item = this.item.parse(parser, next);
			if (!item) break;
//console.log(item);
			matched.push(item);
			next = item.next();

			next = parser.eatWhitespace(next);
			// get delimiter, exiting if not found
			let delimiter = this.delimiter.parse(parser, next);
			if (!delimiter) break;
			next = delimiter.next();
		}

		return this.clone({
			matched,
			// DEBUG
			matchedText: stream.range(stream.startIndex, next.startIndex),
			// DEBUG
			startIndex: matched[0] ? matched[0].startIndex : stream.startIndex,
			endIndex: next.startIndex,
			stream
		});
	}

	// Return matched item by index
	getItem(index) {
		if (!this.matched) return undefined;
		return this.matched[index];
	}

	toSource(context) {
		if (!this.matched) return undefined;		// TODO: throw???
		let matched = this.matched.map( match => match.toSource(context) ).join(", ");
		return `[${matched}]`;
	}

	toString() {
		return `[${this.argument ? this.argument+":" : ""}${this.item} ${this.delimiter}]${this.optional ? '?' : ''}`;
	}
};




