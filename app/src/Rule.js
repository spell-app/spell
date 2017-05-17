//	# Parser Rules
//	Rules can be as simple as a string `Keyword` or a complex sequence of (nested) rules.
//
//	Parse a rule with `rule.parse(parser, tokens, startIndex)`, this will either:
//		- return `undefined` if the rule doesn't match the head of the tokens, or
//		- return a CLONE of the rule with at least the following:
//			- `tokens`		Stream which was matched with `startIndex` at the start of the match
//			- `endIndex`	Non-inclusive end index in tokens where match ends.
//
//	The clone returned above can be manipulated with
//		- `rule.results`			Return matched arguments in a format suitable to do:
//		- `rule.toSource(context)`	Return javascript source to interpret the rule.
//
import global from "./utils/global";
import Parser from "./Parser.js";


export default class Rule {
	constructor(...props) {
		Object.assign(this, ...props);
	}

	// Clone this rule and add any `props` passed in.
	clone(props) {
		return new this.constructor(this, props);
	}

//
//	Parsing primitives -- you MUST implement these in your subclasses!
//

	// Attempt to match this rule in the `tokens`.
	// Returns results of the parse or `undefined`.
	parse(parser, tokens, startIndex = 0,  stack = []) {
		return undefined;
	}

	// Test to see if bits of our rule are found ANYWHERE in the tokens.
	// Returns:
	//	- `undefined` if not determinstic (but all patterns are deterministic)
	//	- regex match if found,
	//	- `false` if not found
	test(parser, tokens, startIndex = 0) {
		return undefined;
	}

	// Does the parse `stack` already contain `rule`?
	static stackContains(stack, rule, tokens) {
		if (stack.length === 0) return false;

//console.info(stack);
		// go backwards
		for (var i = stack.length - 1; i >= 0; i--) {
			let [ nextRule, nextStream ] = stack[i];
			if (nextRule === rule) {
				if (tokens.startIndex === tokens.startIndex) {
//					console.warn("found unproductive rule ", rule, " on stack", stack);
					return true;
				}
				else {
//					console.warn("found productive rule ", rule, " on stack", stack);
					return false;
				}
			}
		}
		return false;
	}

	addToBlacklist(...words) {
		if (!this.blacklist) this.blacklist = {};
		words.forEach(word => this.blacklist[word] = true);
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


// Rule for one or more sequential literal values to match, which include punctuation such as `(` etc.
Rule.Match = class match extends Rule {
	constructor(...props) {
		super(...props);
		// coerce to an array (a bit slower but cleaner).
		if (!Array.isArray(this.match)) this.match = [this.match];
	}

	// Attempt to match this rule in the `tokens`.
	// Returns results of the parse or `undefined`.
	parse(parser, tokens, startIndex = 0,  stack = []) {
		if (!this.headStartsWith(this.match, tokens, startIndex)) return undefined;
		// if only one and we have a blacklist, make sure it's not in the blacklist!
		if (this.match.length === 1 && this.blacklist && this.blacklist[this.match[0]]) return undefined;

		return this.clone({
			matched: this.match.join(this.matchDelimiter),
			endIndex: startIndex + this.match.length
		});
	}

	// Does this match appear anywhere in the tokens?
	test(parser, tokens, startIndex = 0) {
		let matchStart = tokens.indexOf(this.match[0], startIndex);
		return matchStart !== -1 && this.headStartsWith(this.match, tokens, matchStart);
	}

	// Does the head of the tokens start with an array of matches?
	headStartsWith(matches, tokens, startIndex = 0) {
		// Special case for one match, maybe premature optimization but...
		if (matches.length === 1) return (matches[0] === tokens[startIndex]);

		for (let i = 0; i < matches.length; i++) {
			if (matches[i] !== tokens[startIndex + i]) return false
		}
		return true;
	}

	toString() {
		return `${this.match.join(this.matchDelimiter)}${this.optional ? '?' : ''}`;
	}
}
Rule.Match.prototype.matchDelimiter = "";


// Syntactic sugar to separate `symbols` (which don't require spaces) from `keywords` (which do).
Rule.Symbol = class symbol extends Rule.Match {}

Rule.Keyword = class keyword extends Rule.Match {}
Rule.Keyword.prototype.matchDelimiter = " ";



// Regex pattern.
// `rule.pattern` is the regular expression to match.
// Note that you MUST start your pattern with `^` and end with `$` to make sure it matches the entire token.
// Note that this can only match a single token!
Rule.Pattern = class Pattern extends Rule {
	// Attempt to match this pattern at the beginning of the tokens.
	parse(parser, tokens, startIndex = 0,  stack = []) {
		let token = tokens[startIndex];
		if (typeof token !== "string") return undefined;

		let match = token.match(this.pattern);
		if (!match) return undefined;

		// bail if present in blacklist
		let matched = match[0];
		if (this.blacklist && this.blacklist[matched]) return undefined;

		return this.clone({
			matched,
			endIndex: startIndex + 1
		});
	}

	// Test to see if any of our pattern is found ANYWHERE in the tokens.
	// Returns:
	//	- `undefined` if not determinstic (but all patterns are deterministic)
	//	- regex match if found,
	//	- `false` if not found
	test(parser, tokens, startIndex = 0) {
		return tokens.slice(startIndex).some(token => typeof token === "string" && token.match(this.pattern));
	}

	toString() {
		return this.pattern.source;
	}
}


// Subrule -- name of another rule to be called.
// `rule.rule` is the name of the rule in `parser.rules`.
Rule.Subrule = class Subrule extends Rule {
	parse(parser, tokens, startIndex = 0,  stack = []) {
		let rule = parser.getRuleOrDie(this.rule, "rule");
		let match = rule.parse(parser, tokens, startIndex,  stack);
		if (!match) return undefined;

		if (this.argument) match.argument = this.argument;
		return match;
	}

	// Test to see if any of our alternatives are found ANYWHERE in the tokens.
	// Returns:
	//	- regex match if found,
	//	- `false` if not found or
	//	- `undefined` if not determinstic.
	test(parser, tokens, startIndex = 0) {
		let rule = parser.getRuleOrDie(this.rule, "subrule.test()");
		return rule.test(parser, tokens, startIndex);
	}

	toString() {
		return `{${this.argument ? this.argument+":" : ""}${this.rule}}${this.optional ? '?' : ''}`;
	}
}


// Sequence of rules to match.
Rule.Sequence = class Sequence extends Rule {
	parse(parser, tokens, startIndex = 0,  stack = []) {
		// If we have a `testRule` defined
		if (this.testRule) {
			let rule = parser.getRuleOrDie(this.testRule, "testRule");
			if (rule.test(parser, tokens, startIndex) === false) return undefined;
		}

		if (this.leftRecursive) {
			if (Rule.stackContains(stack, this, tokens)) return undefined;
			stack = stack.concat();
			stack.push([this, tokens]);
		}

		let matched = [];
		let current = startIndex;
		for (let rule of this.rules) {
			let match = rule.parse(parser, tokens, current, stack);
			if (!match && !rule.optional) return undefined;
			if (match) {
				matched.push(match);
				current = match.endIndex;
			}
		}
		// if we get here, we matched all the rules!
		return this.clone({
			matched,
			endIndex: current
		});
	}

// 	parseInChunks(parser, tokens, stack) {}

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
		let results = this.addResults({}, this.matched);
		if (this.comment) results.comment = this.comment;
		return results;
	}

	addResults(results, matched) {
		for (let match of matched) {
			if (match.promote) {
				return this.addResults(results, match.matched);
			}
			else {
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
		return results;
	}

	// Return `toSource()` for our `results` as a map.
	// If you pass `keys`, we'll restrict to just those keys.
	getMatchedSource(context, ...keys) {
		let results = this.results;
		let output = {};
		if (!keys.length) keys = Object.keys(results);
		keys.forEach(key => {
			let value = results[key];
			if (value == null) return;
			if (value.toSource) output[key] = value.toSource(context);
			else output[key] = value;
		});
		return output;
	}

	// Echo this rule back out.
	toString() {
		return `${this.rules.join(" ")}${this.optional ? '?' : ''}`;
	}

}

// Syntactic sugar for debugging
Rule.Expression = class expression extends Rule.Sequence {}


// A statement takes up the entire line.
Rule.Statement = class statement extends Rule.Sequence {}


// Alternative syntax, matching one of a number of different rules.
// The result of a parse is the longest rule that actually matched.
// NOTE: Currently takes the longest valid match.
// TODO: match all valid alternatives
// TODO: rename?
Rule.Alternatives = class Alternatives extends Rule {
	constructor(...props) {
		super(...props);
		if (!this.rules) this.rules = [];
	}

	// Test to see if any of our alternatives are found ANYWHERE in the tokens.
	// NOTE: this should only be called if we're specified as a `testRule`
	//		 and then only if all of our rules are deterministic.
	// Returns:
	//	- regex match if found,
	//	- `false` if not found or
	test(parser, tokens, startIndex = 0) {
		for (let rule of this.rules) {
			if (rule.test(parser, tokens, startIndex)) return true;
		}
		return false;
	}

	// Find all rules which match and delegate to `getBestMatch()` to pick the best one.
	parse(parser, tokens, startIndex = 0,  stack = []) {
		let matches = [];
		for (let rule of this.rules) {
			let match = rule.parse(parser, tokens, startIndex,  stack);
			if (match) matches.push(match);
		}

		if (!matches.length) return undefined;

		// uncomment the below to print alternatives
		// if (matches.length > 1) {
		//	console.info(this.argument || this.ruleName, matches, matches.map(match => match.matchedText));
		// }

		let bestMatch = (matches.length === 1 ? matches[0] : this.getBestMatch(matches));

		// assign `argName` or `ruleName` for `results`
		if (this.argument) bestMatch.argument = this.argument;
		else if (this.ruleName) bestMatch.ruleName = this.ruleName;
//TODO: other things to copy here???

		return bestMatch;
	}

	// Return the "best" match given more than one matches at the head of the tokens.
	// Default is to return the longest match.
	// Implement something else to do, eg, precedence rules.
	getBestMatch(matches) {
		return matches.reduce(function (best, current) {
			if (current.endIndex > best.endIndex) return current;
			return best;
		}, matches[0]);
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
Rule.Repeat = class Repeat extends Rule {
	parse(parser, tokens, startIndex = 0,  stack = []) {
		if (this.leftRecursive) {
			if (Rule.stackContains(stack, this, tokens)) return undefined;
			stack = stack.concat();
			stack.push([this, tokens]);
		}

		let matched = [];
		let current = startIndex;
		while (true) {
			let match = this.rule.parse(parser, tokens, current, stack);
			if (!match) break;

			matched.push(match);
			current = match.endIndex;
		}

		if (matched.length === 0) return undefined;

		return this.clone({
			matched,
			endIndex: current
		});
	}

	// "gather" arguments in preparation to call `toSource()`
	// Only callable after parse is completed.
	// Returns an array with arguments of all results.
	// NOTE: memoizes the results.
	get results() {
		if (!this.matched) return undefined;
		return this.matched.map( match => match.results );
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
	parse(parser, tokens, startIndex = 0,  stack = []) {
		if (this.leftRecursive) {
			if (Rule.stackContains(stack, this, tokens)) return undefined;
			stack = stack.concat();
			stack.push([this, tokens]);
		}

		// ensure item and delimiter are optional so we don't barf in `parseRule`
		this.item.optional = true;
		this.delimiter.optional = true;

		let matched = [];
		let current = startIndex;
		while (true) {
			// get next item, exiting if not found
			let item = this.item.parse(parser, tokens, current, stack);
			if (!item) break;
//console.log(item);
			matched.push(item);
			current = matched.endIndex;

			// get delimiter, exiting if not found
			let delimiter = this.delimiter.parse(parser, tokens, current, stack);
			if (!delimiter) break;
			current = delimiter.endIndex;
		}

		// If we didn't get any matches, forget it.
		if (matched.length === 0) return undefined;

		return this.clone({
			matched,
			endIndex: current
		});
	}

	// Returns list of values as source.
	toSource(context) {
		if (!this.matched) return [];
		return this.matched.map( match => match.toSource(context) );
	}

	toString() {
		return `[${this.argument ? this.argument+":" : ""}${this.item} ${this.delimiter}]${this.optional ? '?' : ''}`;
	}
};



// `Statements` are a block of `Statements` that understand nesting and comments.
// TODO: is this a `Block`?
Rule.Statements = class statements extends Rule {
	// Return a certain `number` of tab characters.
	static TABS = "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t";
	getTabs(number) {
		if (typeof number !== "number") return "";
		return Rule.Statements.TABS.substr(0, number);
	}

	// `statements` is an array of arrays of tokens.
//TODO: non-standard, other `parse()` routines will take a single line???
	parse(parser, statements, lineNumber = 0, stack = []) {
console.info(statements);
		console.time("Rule.Statements.parse()");

		// Cut off the beginning if not on the first line...
		if (lineNumber !== 0) statements = statements.slice(lineNumber);

		let results = [];
		let lastIndent = 0;

		// Parse each line individually
		statements.forEach(tokens => {
			// add placeholders for empty lines
			if (tokens.length === 0) {
				return results.push(new Rule.BlankLine());
			}

			// current position in the tokens
			let current = 0;

			// figure out indent level of this line
			let indent = 0;
			// If we start with an indent
			if (tokens[0].type === "indent") {
				indent = tokens[0].level;
				// take the indent out of the statement start
				tokens = tokens.slice(1);
			}

			// If indent INCREASES, add open curly braces
			if (indent > lastIndent) {
				results.push(new Rule.OpenBlock({ indent: indent-1 }));
			}
			// if line indent DECREASES, add one or more closing curly braces
			else if (indent < lastIndent) {
				for (let indent = lastIndent; indent > indent; indent--) {
					results.push(new Rule.CloseBlock({ indent: indent-1 }));
				}
			}
			lastIndent = indent;

			// Attempt to parse a comment as the last item in the statement
			let last = tokens[tokens.length - 1];
			let comment;
			if (last && last.type === "comment") {
				comment = new Rule.Comment({ matched: last.comment, indent });

				// Add comment BEFORE corresponding statement
				results.push(comment);

				// pop the comment off before matching statements.
				tokens = tokens.slice(0, -1);
			}

			let result = parser.rules.statement.parse(parser, tokens, 0);
			// complain if no result and no comment
			if (!result && !comment) {
				let statement = tokens.join(" ");
				console.warn(`Couldn't parse statement:\n\t${statement}`);
				results.push(new Rule.ParseError({
					error: "Can't parse statement",
					message: `CAN'T PARSE: ${statement}`
				}));
				return;
			}

			// complain can't parse the entire line!
			if (result && result.endIndex !== tokens.length) {
				let statement = tokens.join(" ");
				let unparsed = tokens.slice(result.endIndex).join(" ");
				console.warn("Couldn't parse entire statement:",
								`\n\t"${statement}"`,
								`\nunparsed:`,
								`\n\t"${unparsed}"`);
				results.push(parser.rules.parse_error.clone({
					error: "Can't parse entire statement",
					message: `CANT PARSE ENTIRE STATEMENT`
						   + `PARSED    : ${result.matched}`
						   + `CANT PARSE: ${unparsed}`

				}));
				return;
			}

			if (result) {
				result.indent = indent;
				results.push(result);
			}
		});

		// Add closing curly braces as necessary
//TODO: move ABOVE any blank lines
		while (lastIndent > 0) {
			results.push(parser.rules.close_block.clone({ indent: this.getTabs(lastIndent - 1) }));
			--lastIndent;
		}
		console.timeEnd("Rule.Statements.parse()");

		return this.clone({
			matched: results,
			endIndex: statements.length
		});
	}

	toSource(context) {
		let results = [];
		for (var i = 0; i < this.matched.length; i++) {
			let match = this.matched[i];

			// special case open block to put on the same line
			//	if previous statement does not have `.opensBlock` set.
			if (match instanceof Rule.OpenBlock) {
				let previous = this.matched[i-1];
				if (previous) {
					if (!previous.opensBlock) {
						results[results.length - 1] += " {";
					}
					continue;
				}
			}
			let source = match.toSource(context) || "";
			let indent = this.getTabs(match.indent);
			results.push(indent + source.split("\n").join("\n"+indent));
		}
		return results.join("\n");
	}
}



