//
// Yes, I'm doing it.
//

// Getter for the `last` element in an array.
// Returns `undefined` if the array is empty.
Object.defineProperty(Array.prototype, "last", {
	get() {
		return this[this.length - 1];
	}
});



// TODO: convert to line-aware stream???
const Tokenizer = {

	// Regular expressions for rule functions.
	WORD_START: /[A-Za-z]/,
	WORD_CHAR : /^[\w_-]/,
	NUMBER_START: /[0-9-.]/,
	NUMBER : /^-?([0-9]*\.)?[0-9]+/,
	COMMENT : /^(##+|--+|\/\/+)(\s*)(.*)/,

	// JSX parsing
	TAG_START : /^</,
	START_TAG : /^<([\w-]+\b)/,
	BINARY_TAG_END : />/,
	UNARY_TAG_END : "/\/>",
	TAG_END : /^<\/([\w-])>/,

	getTagEnd : function(tagName, startLine = true) {
		return new RegExp(`${startLine ? "^" : ""}<\/(${tagName})>`);
	},


	// NOTE: `patterns` match a single character and are either:
	//	- a RegExp.
	//	- an array of strings (in which case any of the strings will work).
	//
	// It is MUCH MUCH faster to use strings!
	rules : [
		"matchWhitespace",
		"matchWord",
		"matchNumber",
		"matchJSX",
		"matchNewline",
		"matchText",
		"matchComment",
	],


	// Tokenize text between `start` and `end` into an array of `results`:
	//	- an array for each line, within each line,
	//		- strings for keywords/symbols
	//		- numbers for number literals
	//		- `{ indent: number }` for indent at start of line
	//		- `{ type: "text", literal: "'abc'", text: "abc" }
	//		- `{ type: "indent", level: 7 }`
	//		- `{ type: "comment", comment: "string", commentSymbol, whitespace }`
	tokenize(text, start, end) {
		let results = [[]];
		if (typeof text !== "string") throw new TypeError("tokenize(): text parameter must be a string: "+text);

		// quick return if only whitespace
		if (!text.trim()) return results;
//console.time("tokenize");
		if (typeof start !== "number") start = 0;
		if (typeof end !== "number") end = text.length;

		// check for a leading indent if at the beginning of text
		if (start === 0) {
			let [indent, newStart] = this.matchIndent(text, start, end, results) || [];
			if (indent) {
				results.last.push(indent);
				start = newStart;
			}
		}

		// process rules repeatedly until we get to the end
		while (start < end) {
			let newStart = this.applyRulesToHead(text, start, end, results);
			// Throw if we didn't get a productive rule!
			if (start === newStart) throw new SyntaxError(`tokenize(${text.substr(start, 20)}): rules didn't match anything!`);
			start = newStart;
		}
//console.timeEnd("tokenize");
		return results;
	},

	// Apply our `rules` to the head of the text.
	applyRulesToHead(text, start, end, results) {
		let ruleNumber = -1;
		let ruleName;
		while (ruleName = this.rules[++ruleNumber]) {
			let result = this[ruleName](text, start, end, results);
			if (result !== undefined) {
				let [token, newStart] = result;
				if (token) results[results.length - 1] = results[results.length - 1].concat(token);
				return newStart;
			}
		}
		// if NO rules applied, eat a single symbol character.
		results.last.push(text[start]);
		return start + 1;
	},

	//
	// ## Processors
	// Each are called because their `rule` was matched in the stream.
	// They manipulate `results` (array of arrays), generally by adding rules to `results.last`.
	// Returns new `start` character for further processing.
	// It's possible that they may not actually match anything, which is fine,
	//	just return `undefined` so we'll try the next rule.
	//

	//
	//	### Whitespace
	//

	// Eat one or more whitespace characters.
	// NOTE: does NOT add whitespace to the `results`.
	matchWhitespace(text, start, end, results) {
		let whiteSpaceEnd = start;
		while (text[whiteSpaceEnd] === " " || text[whiteSpaceEnd] === "\t") {
			whiteSpaceEnd++;
		}
		if (whiteSpaceEnd === start) return undefined;
		return [undefined, whiteSpaceEnd];
	},

	//
	//	### Word
	//

	// Match a single `word` in `text` at character `start`.
	// Returns `[word, wordEnd]`.
	// Returns an empty array if couldn't match a word.
	matchWord(text, start, end, results) {
		if (!this.WORD_START.test(text[start])) return undefined;

		let wordEnd = start + 1;
		while (wordEnd < end && this.WORD_CHAR.test(text[wordEnd])) {
			wordEnd++;
		}
		if (wordEnd === start) return undefined;

		let word = text.slice(start, wordEnd);
		return [word, wordEnd];
	},


	//
	//	### Text literal
	//

	// Eat a text literal (starts/ends with `'` or `"`).
	// Returns a `Tokenizer.Text` if matched.
	matchText(text, start, end, results) {
		let quoteSymbol = text[start];
		if (quoteSymbol !== '"' && quoteSymbol !== "'") return undefined;

		let textEnd = start + 1;
		while (textEnd < end) {
			let char = text[textEnd];
			if (char === quoteSymbol) break;
			// if we get a backquote, ignore quote in next char
			if (char === "\\" && text[textEnd + 1] === quoteSymbol) textEnd++;
			textEnd++;
		}
		// advance past end quote
		textEnd++;

		let quotedString = text.slice(start, textEnd);
		let token = new Tokenizer.Text(quotedString);
		return [token, textEnd];
	},

	// `Text` class for string literals.
	// Pass the literal value, use `.text` to get just the bit inside the quotes.
	Text : class text {
		constructor(quotedString) {
			this.quotedString = quotedString;

			// calculate `text` as the bits between the quotes.
			let start = 0;
			let end = quotedString.length;
			if (quotedString[start] === '"' || quotedString[start] === "'") start = 1;
			if (quotedString[end-1] === '"' || quotedString[end-1] === "'") end = -1;
			this.text = quotedString.slice(start, end);
		}
		toString() {
			return this.quotedString;
		}
	},

	//
	//	### Numbers
	//

	// Eat a single number.
	// Returns a `Number` if matched.
	matchNumber(text, start, end, results) {
		if (!this.NUMBER_START.test(text[start])) return undefined;

		let line = this.getLine(text, start, end);
		let numberMatch = line.match(this.NUMBER);
		if (!numberMatch) return undefined;

		let numberStr = numberMatch[0];
		let number = parseFloat(numberStr, 10);
		return [number, start + numberStr.length];
	},

	//
	//	### Comments
	//

	// Eat a comment (until the end of the line).
	// Returns a `Tokenizer.Comment` if matched.
	matchComment(text, start, end, results) {
		let commentStart = text.slice(start, start + 2);
		if (commentStart !== "--" && commentStart !== "\/\/" && commentStart !== "##") return undefined;

		// comment eats until the end of the line
		let line = this.getLine(text, start, end);
		let commentMatch = line.match(this.COMMENT)
		if (!commentMatch) return undefined;

		let [match, commentSymbol, whitespace, comment] = commentMatch;
		let token = new Tokenizer.Comment({ commentSymbol, whitespace, comment });
		return [token, start + line.length];
	},

	// Comment class
	Comment : class comment {
		constructor (comment) {
			this.comment = comment;
		}
		toString() {
			return `/*${this.comment}*/`;
		}
	},


	//
	//	### Newline
	//

	// Eat a newline, which starts a new line in the `results`.
	// If one or more tabs occur after the newline, inserts a `Tokenizer.Indent` in the new line.
	matchNewline(text, start, end, results) {
		if (text[start] !== "\n") return undefined;

		// start a new line in the results
		results.push([]);
		let nextLineStart = start + 1;

		// attempt to match tabs at the beginning of the line
		let indentResult = this.matchIndent(text, nextLineStart, end, results);
		return indentResult || [undefined, nextLineStart];
	},


	//
	//	### Indent
	//

	// Convert a run of tabs (e.g. at the beginning of a line) into a `Tokenizer.Indent`.
	matchIndent(text, start, end, results) {
		// figure out # of tabs at the beginning of the new line
		let tabCount = 0;
		while (text[start + tabCount] === "\t") {
			tabCount++;
		}
		if (tabCount === 0) return undefined;

		let indent = new Tokenizer.Indent(tabCount);
		return [indent, start + tabCount];
	},

	// Indent class
	Indent : class indent {
		constructor(level) {
			this.level = level;
		}
		toString() {
			return "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t".slice(0, this.indent);
		}
	},

	//
	//	### JSX
	//

	// Eat a (nested) JSX expression.
	matchJSX(text, start, end, results) {
		// Make sure we start with `<`.
		if (text[start] !== "<") return undefined;

		// text after the leading `<` MUST be a `word` as defined above, with no whitespace before it.
		let [tagName, tagNameEnd ] = this.matchWord(text, start + 1, end, results) || [];
		if (!tagName) return undefined;

		let token = new Tokenizer.JSX(tagName);
		return [token, tagNameEnd];
	},

	// JSX class
	JSX : class jsx {
		constructor(tagName, attributes, children) {
			this.tagName = tagName;
			this.attributes = attributes || {};
			if (children) this.children = children;
		}
		toString() {
			return `<${this.tagName}...>`;
		}
	},


	//
	//	## Utility functions
	//

	// Return characters up to, but not including, the next newline char after `start`.
	// If `start` is a newline char, returns empty string.
	// If at the end of the string (eg: no more newlines), returns from start to end.
	getLine(text, start = 0, end = text.length) {
		let newLine = text.indexOf("\n", start);
		if (newLine === -1 || newLine > end) newLine = end;
		return text.slice(start, newLine);
	}

};


export default Tokenizer;
