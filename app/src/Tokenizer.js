
// TODO: convert to line-aware stream???
const Tokenizer = {

	TABS : /^\t+/,
	WORD_START : /^[A-Za-z]/,
	WORD_CHAR : /^[\w_-]/,
	WHITE_SPACE : /^\s/,
	NUMBER_START : /^[0-9-.]/,
	NUMBER : /^-?([0-9]*\.)?[0-9]+/,
	COMMENT_START : /^(?:#|-|\/)/,
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

	// Tokenize text into an array of:
	//	- an array for each line, within each line,
	//		- `{ indent: number }` for indent at start of line
	//		- strings for keywords/symbols or
	//		- numbers for number literals
	//		- { type: "text", literal: "'abc'", text: "abc" },
	//		- { type: "indent", level: 7 },
	//		- { type: "comment", ?header: true, comment: "string" }
	tokenize(text) {
		let lines = text.split("\n").map(line => {
			let tokens = [];
			// pop indent off
			let tabs = line.match(this.TABS);
			if (tabs) {
				tokens.push(new Tokenizer.Indent(tabs.length));
				line = line.substr(tabs.length);
			}

			let current = 0;
			let last = line.length;
			while (current < last) {
				// eat whitespace
				while (this.WHITE_SPACE.test(line[current])) {
					current++;
				}

				let char = line[current];
				// if a word character, make the `word` as long as we can
				if (this.WORD_START.test(char)) {
					let start = current;
					current++;
					while (current < last && this.WORD_CHAR.test(line[current])) {
						current++;
					}
					tokens.push(line.slice(start, current));
					continue;
				}

				// if char is a quote symbol, eat until we get a matching quote.
				if (char === '"' || char === "'") {
					let end = this.getEndQuotePosition(line, current, char);
					let text = new Tokenizer.Text(line.slice(current, end + 1));
					if (end === last) text.unbalanced = true;
					tokens.push(text);
					current = end + 1;
					continue;
				}

				// if a number, stick in as a number
				if (this.NUMBER_START.test(char)) {
					let numberMatch = line.substr(current).match(this.NUMBER);
					if (numberMatch) {
						let numberStr = numberMatch[0];
						tokens.push(parseFloat(numberStr, 10));
						current += numberStr.length;
						continue;
					}
				}

				// if we got a comment start symbol, attempt to match a comment
				if (this.COMMENT_START.test(char)) {
					let commentMatch = line.substr(current).match(this.COMMENT)
					if (commentMatch) {
						let [match, commentSymbol, whitespace, comment] = commentMatch;
						let token = new Tokenizer.Comment({ commentSymbol, whitespace, comment });
						tokens.push(token);
						// break out of the loop since we ate to the end of the line
						break;
					}
				}

				// otherwise stick non-word characters in by themselves
				tokens.push(char);
				current += 1;
			}
			return tokens;
		});
		return lines;
	},

	// Return position of matching `quoteSymbol` for `line` at `start`.
	// TODO: handle `\"`
	getEndQuotePosition(line, start, quoteSymbol) {
		let end = start + 1;
		let last = line.length;
		while (end < last && line[end] !== quoteSymbol) {
			end++;
		}
		return end;
	}
};


Tokenizer.Token = function token(props) {
	Object.assign(this, props);
}


// `Text` class for string literals.
// Pass the literal value, use `.text` to get just the bit inside the quotes.
Tokenizer.Text = function text(literal) {
	this.literal = literal;

	let start = 0;
	let end = literal.length;
	if (literal[start] === '"' || literal[start] === "'") start = 1;
	if (literal[end-1] === '"' || literal[end-1] === "'") end = -1;
	this.text = literal.slice(start, end);
}
Tokenizer.Text.prototype = new Tokenizer.Token({
	type: "text",
	toString() {
		return this.literal;
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
