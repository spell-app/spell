//	# Parser Rules
//	Rules can be as simple as a string `Keyword` or a complex sequence of (nested) rules.
//
//	Parse a rule with `rule.parse(parser, tokens, start, end)`, this will either:
//		- return `undefined` if the rule doesn't match the head of the tokens, or
//		- return a CLONE of the rule with at least the following:
//			- `matched`		Results of your parse.
//			- `nextStart`	Place where next match should start (eg: one beyond what you matched).
//
//	The clone returned above can be manipulated with
//		- `rule.results`			Return matched arguments in a format suitable to do:
//		- `rule.toSource(context)`	Return javascript source to interpret the rule.
//
import Parser from "./Parser.js";

import global from "./utils/global";
import { getTabs } from "./utils/string";

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

	// Attempt to match this rule between `start` and `end` of `tokens`.
	// Returns results of the parse or `undefined`.
	parse(parser, tokens, start = 0, end, stack) {
		return undefined;
	}

	// Test to see if bits of our rule are found ANYWHERE between `start` and `end` in the `tokens`.
	// This is used by complicated (eg: left recursive) rules to exit quickly if there's no chance.
	// Returns:
	//	- `true` if the rule MIGHT be matched.
	//	- `false` if there is no way the rule can be matched.
	//	- `undefined` if not determinstic (eg: no way to tell quickly).
	test(parser, tokens, start = 0, end) {
		return undefined;
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
	parse(parser, tokens, start = 0, end, stack) {
		if (!this.headStartsWith(this.match, tokens, start, end)) return undefined;
		// if only one and we have a blacklist, make sure it's not in the blacklist!
		if (this.match.length === 1 && this.blacklist && this.blacklist[this.match[0]]) return undefined;

		return this.clone({
			matched: this.match.join(this.matchDelimiter),
			nextStart: start + this.match.length
		});
	}

	// Does this match appear anywhere in the tokens?
	test(parser, tokens, start = 0, end) {
		let matchStart = tokens.indexOf(this.match[0], start);
		return matchStart !== -1 && this.headStartsWith(this.match, tokens, matchStart, end);
	}

	// Does the head of the tokens start with an array of matches?
	headStartsWith(matches, tokens, start = 0, end = tokens.length) {
		// bail if match would go beyond the end
		if (start + matches.length > end) return false;

		// Special case for one match, maybe premature optimization but...
		if (matches.length === 1) return (matches[0] === tokens[start]);

		for (let i = 0; i < matches.length; i++) {
			if (matches[i] !== tokens[start + i]) return false
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



// Regex pattern to match a SINGLE token.
// `rule.pattern` is the regular expression to match.
// Note that you MUST start your pattern with `^` and end with `$` to make sure it matches the entire token.
// Note that this can only match a single token!
Rule.Pattern = class Pattern extends Rule {
	// Attempt to match this pattern at the beginning of the tokens.
	parse(parser, tokens, start = 0, end, stack) {
		let token = tokens[start];
		if (typeof token !== "string") return undefined;

		let match = token.match(this.pattern);
		if (!match) return undefined;

		// bail if present in blacklist
		let matched = match[0];
		if (this.blacklist && this.blacklist[matched]) return undefined;

		return this.clone({
			matched,
			nextStart: start + 1
		});
	}

	// Test to see if any of our pattern is found ANYWHERE in the tokens.
	test(parser, tokens, start = 0, end) {
		return tokens.slice(start, end).some(token => typeof token === "string" && token.match(this.pattern));
	}

	toString() {
		return this.pattern.source;
	}
}


// Subrule -- name of another rule to be called.
// `rule.rule` is the name of the rule in `parser.rules`.
Rule.Subrule = class Subrule extends Rule {
	parse(parser, tokens, start = 0, end, stack) {
		let result = parser.parseRuleOrDie(this.rule, tokens, start, end, stack, `parse subrule '${this.rule}'`);
		if (!result) return undefined;

		if (this.argument) result.argument = this.argument;
		return result;
	}

	// Test to see if any of our alternatives are found ANYWHERE in the tokens.
	test(parser, tokens, start = 0, end) {
		return parser.testRule(this.rule, tokens, start);
	}

	toString() {
		return `{${this.argument ? this.argument+":" : ""}${this.rule}}${this.optional ? '?' : ''}`;
	}
}


// Sequence of rules to match.
Rule.Sequence = class Sequence extends Rule {
	parse(parser, tokens, start = 0, end, stack) {
		// If we have a `testRule` defined
		if (this.testRule) {
			// Forget it if there is NO WAY the rule could be matched.
			if (parser.testRule(this.testRule, tokens, start) === false) return undefined;
		}

		// If we're a leftRecursive sequence...
		if (this.leftRecursive) {
			// If the stack already contains this rule, forget it.
			if (stack && stack.includes(this)) return undefined;

			// Clone stack and add this rule for recursion...
			stack = stack ? stack.concat() : [];
			stack.push(this);

			// TODO: We could distinguish between productive and unproductive rules
			//		 by checking only rules which occur at the same `start`...
			//		 This would probably allow more interesting things, but it's much much slower.
		}

		let matched = [];
		let nextStart = start;
		let index = 0, rule = undefined;
		while (rule = this.rules[index++]) {
			let match = rule.parse(parser, tokens, nextStart, end, stack);
			if (!match && !rule.optional) return undefined;
			if (match) {
				matched.push(match);
				nextStart = match.nextStart;
			}
		}
		// if we get here, we matched all the rules!
		return this.clone({
			matched,
			nextStart
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
		let results = this.addResults({}, this.matched);
		if (this.comment) results.comment = this.comment;
		return results;
	}

	addResults(results, matched) {
		let index = 0, match = undefined;
		while (match = matched[index++]) {
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
	test(parser, tokens, start = 0, end) {
		let index = 0, rule = undefined;
		while (rule = this.rules[index++]) {
			if (rule.test(parser, tokens, start, end)) return true;
		}
		return false;
	}

	// Find all rules which match and delegate to `getBestMatch()` to pick the best one.
	parse(parser, tokens, start = 0, end, stack) {
		let matches = [];
		let index = 0, rule = undefined;
		while (rule = this.rules[index++]) {
			let match = rule.parse(parser, tokens, start, end, stack);
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
			if (current.nextStart > best.nextStart) return current;
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
	parse(parser, tokens, start = 0, end, stack) {
		let matched = [];
		let nextStart = start;
		while (true) {
			let match = this.rule.parse(parser, tokens, nextStart, end, stack);
			if (!match) break;

			matched.push(match);
			nextStart = match.nextStart;
		}

		if (matched.length === 0) return undefined;

		return this.clone({
			matched,
			nextStart
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
		let isCompoundRule = (this.rule instanceof Rule.Sequence)
						  || (this.rule instanceof Rule.Keyword && this.rule.match.length > 1);
		const rule = isCompoundRule ? `(${this.rule})` : `${this.rule}`;
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
	parse(parser, tokens, start = 0, end, stack) {
		// ensure item and delimiter are optional so we don't barf in `parseRule`
		this.item.optional = true;
		this.delimiter.optional = true;

		let matched = [];
		let nextStart = start;
		while (true) {
			// get next item, exiting if not found
			let item = this.item.parse(parser, tokens, nextStart, end, stack);
			if (!item) break;

			matched.push(item);
			nextStart = item.nextStart;

			// get delimiter, exiting if not found
			let delimiter = this.delimiter.parse(parser, tokens, nextStart, end, stack);
			if (!delimiter) break;
			nextStart = delimiter.nextStart;
		}

		// If we didn't get any matches, forget it.
		if (matched.length === 0) return undefined;

		return this.clone({
			matched,
			nextStart
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



// Blank line representation in parser output.
Rule.BlankLine = class blank_line extends Rule {
	toSource(context) {
		return "\n";
	}
}

// Open block representation in parser output.
Rule.OpenBlock = class open_block extends Rule {
	toSource(context) {
		return "{";
	}
}


// Close block representation in parser output.
Rule.CloseBlock = class close_block extends Rule {
	toSource(context) {
		return "}";
	}
}


// Parser error representation in parser output.
Rule.StatementParseError = class parse_error extends Rule {
	constructor(...props) {
		super(...props);
		if (Parser.WARN) console.warn(this.message);
	}

	get message() {
		if (this.parsed) {
			return "CANT PARSE ENTIRE STATEMENT\n"
				 + "PARSED      : `"+ this.parsed + "`\n"
				 + "CAN'T PARSE : `"+ this.unparsed + "`";
		}
		return "CAN'T PARSE STATEMENT: `" + this.unparsed + "`";
	}

	toSource(context) {
		return "// " + this.message.split("\n").join("\n// ");
	}
}


// Comment rule -- matches tokens of type `Tokenizer.Comment`.
Rule.Comment = class comment extends Rule {
	// Comments are specially nodes in our token stream.
	parse(parser, tokens, start = 0, end, stack) {
		let token = tokens[start];
		if (!(token instanceof Tokenizer.Comment)) return undefined;
		return this.clone({
			matched: token,
			nextStart: start + 1
		});
	}

	toSource(context) {
		return `//${this.matched.whitespace}${this.matched.comment}`;
	}
}


// Simple block class for `breakIntoBlocks`.
Rule.Block = class block {
	constructor(props){
		Object.assign(this, props);
		if (!this.contents) this.contents = [];
	}

	toString() {
		return JSON.stringify(this, null, "\t");
	}
}




// Break `tokens` between `start` and `end` into a `Rule.Block` with nested `contents`.
// Skips "normal" whitespace and indents in the results.
Rule.breakIntoBlocks = function(tokens, start = 0, end = tokens.length) {
	// restrict to tokens of interest and skip "normal" whitespace
	tokens = Tokenizer.removeNormalWhitespace(tokens.slice(start, end));

	// break into lines & return early if no lines
	let lines = Rule.breakIntoLines(tokens);
	if (lines.length === 0) return [];

	// figure out indents
	let indents = Rule.getLineIndents(lines);

	// First block is at the MINIMUM indent of all lines!
	let maxIndent = Math.min.apply(Math, indents);
	let block = new Rule.Block({ indent: maxIndent });

	// stack of blocks
	let stack = [block];

	lines.forEach( (line, index) => {
		// Remove leading whitespace (eg: indents)
		line = Tokenizer.removeLeadingWhitespace(line);

		let lineIndent = indents[index];
		let top = stack[stack.length - 1];
		// If indenting, push new block(s)
		if (lineIndent > top.indent) {
			while (lineIndent > top.indent) {
				var newBlock = new Rule.Block({ indent: top.indent + 1 });
				top.contents.push(newBlock);
				stack.push(newBlock);

				top = newBlock;
			}
		}
		// If outdenting: pop block(s)
		else if (lineIndent < top.indent) {
			while (lineIndent < top.indent) {
				stack.pop();
				top = stack[stack.length - 1];
			}
		}
		// add to top block
		top.contents.push(line);
	});

	return block;
}

// Break tokens into an array of arrays by `NEWLINE`s.
// Returns an array of lines WITHOUT the `NEWLINE`s.
// Lines which are composed solely of whitespace are converted to `NEWLINE`s
Rule.breakIntoLines = function(tokens) {
	// Convert to lines.
	let currentLine = [];
	let lines = [currentLine];
	tokens.forEach(token => {
		// add new array for each newline
		if (token === Tokenizer.NEWLINE) {
			// create a new line and push it in
			currentLine = [];
			return lines.push(currentLine);
		}

		// otherwise just add to the current line
		currentLine.push(token);
	});

	// Clear any lines that are only whitespace
	lines.forEach((line, index) => {
		if (line.length === 1 && line[0] instanceof Tokenizer.Whitespace) lines[index] = [];
	});

	return lines;
}


// Return indents of the specified blocks.
// Indents empty lines (NEWLINEs) into the block AFTER they appear.
Rule.getLineIndents = function(lines, defaultIndent = 0) {
	if (lines.length === 0) return [];

	const indents = lines.map(Tokenizer.getLineIndent);
	const end = indents.length;

	// figure out the indent of the first non-empty line
	let startIndent = getNextIndent(0);
	if (startIndent === undefined) startIndent = defaultIndent;

	// indent blank lines to the indent AFTER them
	for (var index = 0; index < end; index++) {
		if (indents[index] === undefined) {
			indents[index] = getNextIndent(index + 1);
		}
	}
	return indents;

	// Return the value of the NEXT non-undefined indent.
	function getNextIndent(index) {
		while (index < end) {
			if (indents[index] !== undefined) return indents[index];
			index++;
		}
		return startIndent;
	}
}


// `Statements` are a block of `Statement` that understand nesting and comments.
Rule.Statements = class statements extends Rule {

	// Split statements up into blocks and parse 'em.
	parse(parser, tokens, start = 0, end = tokens.length, stack) {
		var block = Rule.breakIntoBlocks(tokens, start, end);
		let matched = this.parseBlock(parser, block);

		if (matched) {
			return this.clone({
				matched,
				nextStart: end
			});
		}
	}


	// Parse the entire `block`, returning results.
	parseBlock(parser, block) {
		let results = [];
//console.warn("block:", block);
		block.contents.forEach((item, index) => {
			if (item.length === 0) {
				results.push(new Rule.BlankLine());
			}
			else if (item instanceof Rule.Block) {
				results.push(new Rule.OpenBlock({ indent: item.indent }));
				let blockResults = this.parseBlock(parser, item);
				results = results.concat(blockResults);
				results.push(new Rule.CloseBlock({ indent: item.indent - 1 }));
			}
			else {
				let result = this.parseStatement(parser, item, block.indent);
				if (result !== undefined && result.length) results = results.concat(result);
			}
		});
		return results;
	}

	// Parse a single statement (a line's worth of `tokens`).
	// Skips whitespace at the beginning of the line.
	// Auto-matches comment in the middle of the line.
	// Returns array of results.
	parseStatement(parser, tokens, indent) {
		let results = [];
		let start = 0, end = tokens.length;
		let statement, comment;

		// check for an indent at the start of the line
		if (tokens[start] instanceof Tokenizer.Whitespace) start++;

		// check for a comment at the end of the
		if (tokens[end-1] instanceof Tokenizer.Comment) {
			comment = parser.parseRuleOrDie("comment", tokens, end-1, end, undefined, "parseStatement");
			comment.indent = indent;
			results.push(comment);
			end--;
		}

		// parse the rest as a "statement"
		statement = parser.parseRuleOrDie("statement", tokens, start, end, undefined, "parseStatement");

		// complain if no statement and no comment
		if (!statement && !comment) {
			let unparsed = tokens.slice(start, end).join(" ");
			let error = new Rule.StatementParseError({ unparsed, indent });
			results.push(error);
		}

		// complain can't parse the entire line!
		else if (statement && statement.nextStart !== end) {
			let parsed = tokens.slice(start, statement.nextStart).join(" ");
			let unparsed = tokens.slice(statement.nextStart, end).join(" ");
			let error = new Rule.StatementParseError({ parsed, unparsed, indent });
			results.push(error);
		}
		// Otherwise add the statement
		else if (statement) {
			statement.indent = indent;
			results.push(statement);
		}
		return results;
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
			if (source === "\n") {
				results.push("");
			}
			else {
				let indent = getTabs(match.indent);
				results.push(indent + source.split("\n").join("\n"+indent));
			}
		}
		return results.join("\n");
	}
}


