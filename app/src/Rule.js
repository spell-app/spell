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
		if (this.constructor !== Rule || !this.constructor.prototype.hasOwnProperty("constructor")) {
//console.warn("not rule", this);
		}
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
		// Use `startPattern` defined in constructor above, much more efficient!
		var match = stream.match(this.startPattern);
		if (!match) return undefined;

		// bail if not in blacklist
		var matched = match[0];
		if (this.blacklist && this.blacklist[matched]) return undefined;

		return this.clone({
			matched: matched,
			endIndex: stream.startIndex + matched.length,
			stream
		});
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
// `Strings` are different from `Keywords` in that they do not require a word boundary.
//TODO: rename `Symbol`???
Rule.String = class String extends Rule.Pattern {
	constructor(properties) {
		// `string` is requied.
		if (!properties.string) throw new TypeError("new Rule.String(): Expected string property");

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

// Merge two String rules together, returning a new rule that matches both.
Rule.mergeStrings = function(first, second) {
	return new Rule.String({ string: first.string + second.string });
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
			var patternString = `\\b${properties.string.split(/\s+/).join("\\s+")}\\b`;
			properties.pattern = new RegExp(patternString);
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




