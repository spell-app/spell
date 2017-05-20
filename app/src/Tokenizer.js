//
// Yes, I'm doing it.
//

Object.defineProperty(Array.prototype, "last", {
	get() {
		return this[this.length - 1];
	}
});

// Return up to, but not including, the next newline char after `start`.
// If `start` is a newline char, returns empty string.
// If at the end of the string (eg: no more newlines), returns from start to end.
Object.defineProperty(String.prototype, "getLine", {
	value: function(start = 0) {
		let end = this.indexOf("\n", start);
		if (end === -1) end = this.length;
		return this.slice(start, end);
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


	rules : [
		{ method: "eatWhitespace", 		pattern: /^[ \t]/		},
		{ method: "eatWord",			pattern: /^[A-Za-z]/	},
		{ method: "eatNumber",			pattern: /^[0-9-.]/		},
		{ method: "eatText",			pattern: /^['"]/		},
		{ method: "eatComment",			pattern: /^(#|-|\/)/	},
		{ method: "eatNewline",		 	pattern: /^\n/			},
	],


	// Tokenize text into an array of:
	//	- an array for each line, within each line,
	//		- `{ indent: number }` for indent at start of line
	//		- strings for keywords/symbols or
	//		- numbers for number literals
	//		- { type: "text", literal: "'abc'", text: "abc" },
	//		- { type: "indent", level: 7 },
	//		- { type: "comment", comment: "string", commentSymbol, whitespace }
	tokenize(text) {
		let results = [[]];
		if (!text) return results;

		let current = 0;
		let last = text.length;
		while (current < last) {
			current = this.applyRulesToHead(text, current, results);
		}
		return results;
	},

	// TODOC
	applyRulesToHead(text, start, results) {
		let char = text[start];
		let ruleNumber = -1;
		let rule;
		while (rule = this.rules[++ruleNumber]) {
			if (rule.pattern.test(char)) {
				let endChar = this[rule.method](text, start, results);
				if (endChar !== undefined) return endChar;
			}
		}
		// if NO rules applied, eat a single symbol character.
		return this.eatSymbol(text, start, results);
	},


	// Processors
	// Each are called because their `rule` was matched in the stream.
	// They manipulate `results` (array of arrays), generally by adding rules to `results.last`.
	// Returns new `start` character for further processing.
	// It's possible that they may not actually match anything, which is fine,
	//	just return `undefined` so we'll try the next rule.

	// Eat one or more whitespace characters.
	// NOTE: does NOT add whitespace to the `results`.
	eatWhitespace(text, start, results) {
		while (text[start] === " " || text[start] === "\t") {
			start++;
		}
		return start;
	},

	// Eat a single `word`.
	// Adds to results as a String.
	eatWord(text, start, results) {
		let end = start + 1;
		while (end < text.length && this.WORD_CHAR.test(text[end])) {
			end++;
		}
		let word = text.slice(start, end);
		results.last.push(word);
		return end;
	},

	// Eat a text literal (starts/ends with `'` or `"`).
	// Adds to `results` as `Tokenizer.Text`.
	eatText(text, start, results) {
		let quoteSymbol = text[start];
		let end = start + 1;
		let last = text.length;
		while (end < last) {
			let char = text[end];
			if (char === quoteSymbol) break;
			// if we get a backquote, ignore quote in next char
			if (char === "\\" && text[end + 1] === quoteSymbol) end++;
			end++;
		}
		// advance past end quote
		end++;

		let quotedString = text.slice(start, end);
		let token = new Tokenizer.Text(quotedString);
		results.last.push(token);

		return end;
	},

	// Eat a single number.
	// Adds to `results` as a Number.
	eatNumber(text, start, results) {
		let line = text.getLine(start);
		let numberMatch = line.match(this.NUMBER);
		if (!numberMatch) return undefined;

		let numberStr = numberMatch[0];
		results.last.push(parseFloat(numberStr, 10));

		return start + numberStr.length;
	},


	// Eat a comment (until the end of the line).
	// Adds to `results` as `Tokenizer.Comment`.
	eatComment(text, start, results) {
		let line = text.getLine(start);
		let commentMatch = line.match(this.COMMENT)
		if (!commentMatch) return undefined;

		let [match, commentSymbol, whitespace, comment] = commentMatch;
		let token = new Tokenizer.Comment({ commentSymbol, whitespace, comment });
		results.last.push(token);
		return start + line.length;
	},

	// Eat a newline, which starts a new line in the `results`.
	// If one or more tabs occur after the newline, inserts a `Tokenizer.Indent` in the new line.
	eatNewline(text, start, results) {
		// start a new line in the results
		results.push([]);
		// figure out # of tabs at the beginning of the new line
		let lineStart = start + 1;
		let tabsLength = 0;
		while (text[lineStart + tabsLength] === "\t") {
			tabsLength++;
		}
		if (tabsLength > 0) {
			results.last.push(new Tokenizer.Indent(tabsLength - 1));
		}
		return lineStart + tabsLength;
	},

	// Eat a single symbol character.
	// Adds to `results` as a String.
	eatSymbol(text, start, results) {
		results.last.push(text[start]);
		return start + 1;
	},
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
