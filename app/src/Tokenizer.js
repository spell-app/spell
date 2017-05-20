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
	WORD_CHAR : /^[\w_-]/,
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
		{ method: "eatWhitespace", 		pattern: [" ", "\t"]		},
		{ method: "eatWord",			pattern: /[A-Za-z]/			},
		{ method: "eatNumber",			pattern: /[0-9-.]/			},
		{ method: "eatNewline",		 	pattern: ["\n"]				},
		{ method: "eatText",			pattern: ["'", '"']			},
		{ method: "eatComment",			pattern: ["#", "-", "\/"]	},
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

		if (typeof start !== "number") start = 0;
		if (typeof end !== "number") end = text.length;

		// check for a leading indent if at the beginning of text
		if (start === 0) {
			let newStart = this.eatIndent(text, start, end, results);
			if (newStart) start = newStart;
		}

		// process rules repeatedly until we get to the end
		while (start < end) {
			start = this.applyRulesToHead(text, start, end, results);
		}
		return results;
	},

	// Apply our `rules` to the head of the text.
	applyRulesToHead(text, start, end, results) {
		let char = text[start];
		let ruleNumber = -1;
		let rule;
		while (rule = this.rules[++ruleNumber]) {
			if (this.testRule(rule, char)) {
				// if we matched a rule, exit so we start over from the top.
				let newStart = this[rule.method](text, start, end, results);
				if (newStart !== undefined) return newStart;
			}
		}
		// if NO rules applied, eat a single symbol character.
		return this.eatSymbol(text, start, end, results);
	},

	// Return `true` if the `rule.pattern` matches the `char` passed in.
	testRule(rule, char) {
		let pattern = rule.pattern;
		if (pattern instanceof RegExp) return pattern.test(char);

		// return true if ANY chars work
		let index = 0;
		let testChar;
		while (testChar = pattern[index++]) {
			if (char === testChar) return true;
		}
		return false;
	},

	//
	// ## Processors
	// Each are called because their `rule` was matched in the stream.
	// They manipulate `results` (array of arrays), generally by adding rules to `results.last`.
	// Returns new `start` character for further processing.
	// It's possible that they may not actually match anything, which is fine,
	//	just return `undefined` so we'll try the next rule.
	//

	// Eat one or more whitespace characters.
	// NOTE: does NOT add whitespace to the `results`.
	eatWhitespace(text, start, end, results) {
		while (text[start] === " " || text[start] === "\t") {
			start++;
		}
		return start;
	},

	// Eat a single `word`.
	// Adds to results as a String.
	eatWord(text, start, end, results) {
		let wordEnd = start + 1;
		while (wordEnd < end && this.WORD_CHAR.test(text[wordEnd])) {
			wordEnd++;
		}
		let word = text.slice(start, wordEnd);
		results.last.push(word);
		return wordEnd;
	},

	// Eat a text literal (starts/ends with `'` or `"`).
	// Adds to `results` as `Tokenizer.Text`.
	eatText(text, start, end, results) {
		let quoteSymbol = text[start];
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
		results.last.push(token);

		return textEnd;
	},

	// Eat a single number.
	// Adds to `results` as a Number.
	eatNumber(text, start, end, results) {
		let line = this.getLine(text, start, end);
		let numberMatch = line.match(this.NUMBER);
		if (!numberMatch) return undefined;

		let numberStr = numberMatch[0];
		results.last.push(parseFloat(numberStr, 10));

		return start + numberStr.length;
	},


	// Eat a comment (until the end of the line).
	// Adds to `results` as `Tokenizer.Comment`.
	eatComment(text, start, end, results) {
		let line = this.getLine(text, start, end);
		let commentMatch = line.match(this.COMMENT)
		if (!commentMatch) return undefined;

		let [match, commentSymbol, whitespace, comment] = commentMatch;
		let token = new Tokenizer.Comment({ commentSymbol, whitespace, comment });
		results.last.push(token);
		return start + line.length;
	},

	// Eat a newline, which starts a new line in the `results`.
	// If one or more tabs occur after the newline, inserts a `Tokenizer.Indent` in the new line.
	eatNewline(text, start, end, results) {
		// start a new line in the results
		results.push([]);

		// attempt to match tabs at the beginning of the line
		let newStart = this.eatIndent(text, start + 1, end, results);
		if (newStart) return newStart;

		// if no tabs, just advance past the newline
		return start + 1;
	},

	// Convert a run of tabs (e.g. at the beginning of a line) into a `Tokenizer.Indent`.
	eatIndent(text, start, end, results) {
		// figure out # of tabs at the beginning of the new line
		let tabCount = 0;
		while (text[start + tabCount] === "\t") {
			tabCount++;
		}
		if (tabCount === 0) return undefined;

		results.last.push(new Tokenizer.Indent(tabCount - 1));
		return start + tabCount;
	},

	// Eat a single symbol character.
	// Adds to `results` as a String.
	eatSymbol(text, start, end, results) {
		results.last.push(text[start]);
		return start + 1;
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


Tokenizer.Token = function token(props) {
	Object.assign(this, props);
}


// `Text` class for string literals.
// Pass the literal value, use `.text` to get just the bit inside the quotes.
Tokenizer.Text = function text(quotedString) {
	this.quotedString = quotedString;

	// calculate `text` as the bits between the quotes.
	let start = 0;
	let end = quotedString.length;
	if (quotedString[start] === '"' || quotedString[start] === "'") start = 1;
	if (quotedString[end-1] === '"' || quotedString[end-1] === "'") end = -1;
	this.text = quotedString.slice(start, end);
}
Tokenizer.Text.prototype = new Tokenizer.Token({
	type: "text",
	toString() {
		return this.quotedString;
	}
});


// String indent class
Tokenizer.Indent = function indent(level) {
	this.level = level;
}
Tokenizer.Indent.prototype = new Tokenizer.Token({
	type: "indent",
	toString() {
		return "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t".slice(0, this.indent);
	}
});

// Comment class
Tokenizer.Comment = function comment(comment) {
	this.comment = comment;
}
Tokenizer.Comment.prototype = new Tokenizer.Token({
	type: "comment",
	toString() {
		return `/*${this.comment}*/`;
	}
});

export default Tokenizer;
