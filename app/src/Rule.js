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
//		- `rule.gatherArguments()`		Return matched arguments in a format suitable to do:
//		- `rule.toSource()`				Return javascript source to interpret the rule.
//
import Parser from "./Parser.js";


//TODO: make gatherArguments() static and call on this

export default class Rule {
	constructor(properties) {
		Object.assign(this, properties);
	}

	// Clone this rule and add any `props` passed in.
	clone(props) {
		var clone = Object.create(this);
		Object.assign(clone, props);
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
// ## output as source
//
	get _arg() { return this.argument || this.ruleName || this.constructor.name }

	// "gather" arguments in preparation to call `toSource()`
	// Note that we define `gatherArguments()` statically on each subclass
	//	and then instance method calls it on itself.
	static gatherArguments(rule) {
		return rule;
	}
	gatherArguments() {
		return this.constructor.gatherArguments(this);
	}

	// Output value for this INSTANTIATED rule as source.
	toSource() {
		return this.matched;
	}

//
// ## group: reflection
//
	get ruleType() {
		return this.constructor.name;
	}
}



// Rule for literal string value, which include punctuation such as `(` etc.
//TODO: rename `Symbol`???
Rule.String = class String extends Rule {
	// Parse this rule at the beginning of `stream`, assuming no whitespace before.
	// Default is that `rule.string` is literal string to match.
	// On match, returns clone of rule with `value`, `stream` and `endIndex`.
	// Returns `undefined` if no match.
	parse(parser, stream) {
		if (!stream.startsWith(this.string)) return undefined;
		return this.clone({
			matched: this.string,
			endIndex: stream.startIndex + this.string.length,
			stream
		});
	}

	toString() {
		return `${this.string}${this.optional ? '?' : ''}`;
	}
}


// Regex pattern.
// `rule.pattern` is the regular expression to match.
// NOTE: the regex should start with `/^...` to match at the beginning of the stream.
Rule.Pattern = class Pattern extends Rule {
	parse(parser, stream) {
		var match = stream.match(this.pattern);
		if (!match) return undefined;
		return this.clone({
			matched: match[0],
			endIndex: stream.startIndex + match[0].length,
			stream
		});
	}

	toString() {
		return this.pattern;
	}
}


// Keyword pattern
//	`rule.keyword` is the keyword string to match.
Rule.Keyword = class Keyword extends Rule.Pattern {
	constructor(properties) {
		super(properties);
		// create pattern which matches at word boundary
		if (!this.pattern) {
			if (!this.keyword) throw new TypeError("Expected keyword property");
			this.pattern = new RegExp(`^${this.keyword}\\b`);
		}
	}

	toString() {
		return `${this.keyword}${this.optional ? '?' : ''}`;
	}
}


// Subrule -- name of another rule to be called.
// `rule.rule` is the name of the rule in `parser.rules`.
Rule.Subrule = class Subrule extends Rule {
	parse(parser, stream) {
		var rule = parser.getRule(this.rule);
		if (!rule) throw new SyntaxError(`Attempting to parse unknown rule '${this.name}'`, this);
		var result = rule.parse(parser, stream);
		if (!result) return undefined;

		if (this.argument) result.argument = this.argument;
		return result;
	}

	toString() {
		return `{${this.argument ? this.argument+":" : ""}${this.rule}}${this.optional ? '?' : ''}`;
	}
}



// Abstract:  `Nested` rule -- composed of a series of other `rules`.
Rule.Nested = class Nested extends Rule {}


// Sequence of rules to match (auto-excluding whitespace).
Rule.Sequence = class Sequence extends Rule.Nested {
	parse(parser, stream) {
		let results = [], next = stream;
		for (let rule of this.rules) {
			next = parser.eatWhitespace(next);
			let result = rule.parse(parser, next);
			if (!result && !rule.optional) return undefined;
			if (result) {
				results.push(result);
				next = result.next();
			}
		}
		// if we get here, we matched all the rules!
		return this.clone({
			results,
			endIndex: next.startIndex,
			stream
		});
	}

//TODOC
	// Gather arguments from our parsed `results` array.
	// Returns an object with properties from the `values` array indexed by
	//		- `results.argument`:		argument set when rule was declared, eg: `{value:literal}` => `value`
	//		- `results.ruleName`:		name of rule when defined
	//		- rule type:				name of the rule type
	static gatherArguments(sequence) {
		if (!sequence.results) return undefined;
		let args = {};
		for (let next of sequence.results) {
			let argName = next._arg;
			// For nested rules, recurse to get their arguments
			let result = next.gatherArguments();

			// If arg already exists, convert to an array
			if (argName in args) {
				if (!Array.isArray(args[argName])) args[argName] = [args[argName]];
				args[argName].push(result);
			}
			else {
				args[argName] = result;
			}
		}
		return args;
	}

	toString() {
		return `${this.rules.join(" ")}${this.optional ? '?' : ''}`;
	}

}

// Syntactic sugar for debugging
Rule.Expression = class expression extends Rule.Sequence {}
Rule.Statement = class statement extends Rule.Sequence {}


// Alternative syntax.
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

		return this.clone({
			matched: bestMatch,
			endIndex: bestMatch.endIndex,
			stream
		});
	}

	addRule(rule) {
		this.rules.push(rule);
	}

	toSource(context) {
		return this.matched.toSource();
	}

	toString() {
		return `(${this.argument ? this.argument+":" : ""}${this.rules.join("|")})${this.optional ? '?' : ''}`;
	}
};



// Repeating rule.
//	`this.rule` is the rule that repeats.
//
// After matching:
//	`this.results` is array of results of matches.
//
//	Automatically consumes whitespace before rules.
//	If doesn't match at least one, returns `undefined`.
Rule.Repeat = class Repeat extends Rule.Nested {
	parse(parser, stream) {
		let next = stream;
		let results = [];
		while (true) {
			next = parser.eatWhitespace(next);
			let result = this.rule.parse(parser, next);
			if (!result) break;

			results.push(result);
			next = result.next();
		}

		if (results.length === 0) return undefined;

		return this.clone({
			results,
			endIndex: next.startIndex,
			stream
		});
	}

	static gatherArguments(repeat) {
		if (!repeat.results) return undefined;
		return repeat.results.map( result => result.gatherArguments() );
	}

	toSource() {
		throw "Don't understand how to source Rule.Repeat!";
	}

	toString() {
		const rule = (this.rule instanceof Rule.Sequence ? `(${this.rule})` : `${this.rule}`);
		return `${rule}${this.optional ? '*' : '+'}`;
	}
}


// List match rule:   `[<item><delimiter>]`. eg" `[{number},]` to match `1,2,3`
//	`rule.item` is the rule for each item,
//	`rule.delimiter` is the delimiter between each item.
// 	`rule.results` in the output is the list of values.
//
//
// NOTE: we assume that a List rule will NOT repeat (????)
Rule.List = class List extends Rule {
	parse(parser, stream) {
		// ensure item and delimiter are optional so we don't barf in `parseRule`
		this.item.optional = true;
		this.delimiter.optional = true;

		var results = [], next = stream;
		while (true) {
			// get next item, exiting if not found
			let item = this.item.parse(parser, next);
			if (!item) break;
//console.log(item);
			results.push(item);
			next = item.next();

			// get delimiter, exiting if not found
			let delimiter = this.delimiter.parse(parser, next);
			if (!delimiter) break;
			next = delimiter.next();
		}

		return this.clone({
			results,
			endIndex: next.startIndex,
			stream
		});
	}

	// Return matched item by index
	getItem(index) {
		if (!this.results) return undefined;
		return this.results[index];
	}

	toSource() {
		if (!this.results) return undefined;		// TODO: throw???
		let results = this.results.map( result => result.toSource() ).join(", ");
		return `[${results}]`;
	}

	toString() {
		return `[${this.argument ? this.argument+":" : ""}${this.item} ${this.delimiter}]${this.optional ? '?' : ''}`;
	}
};




