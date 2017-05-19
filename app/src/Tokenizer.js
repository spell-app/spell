
// TODO: convert to line-aware stream???
const Tokenizer = {

	TABS : /^\t+/,
	WORD_START : /^[A-Za-z]/,
	WORD_CHAR : /^[\w_-]/,
	WHITE_SPACE : /^\s/,
	NUMBER_START : /^[0-9-.]/,
	NUMBER : /^-?([0-9]*\.)?[0-9]+/,
	HEADER : /^#+/,

	// JSX
	TAG_START : /^</,
	START_TAG : /^<([\w-]+\b)/,
	BINARY_TAG_END : />/,
	UNARY_TAG_END : "/\/>",
	TAG_END : /^<\/([\w-])>/,

	getTagEnd : function(tagName, startLine = true) {
		return new RegExp(`${startLine ? "^" : ""}<\/(${tagName})>`);
	},

	// Tokenize text into a series of:
	//	- an array for each line, within each line,
	//		- `{ indent: number }` for indent at start of line
	//		- strings for keywords/symbols or
	//		- objects for things which match the TOKENIZE_RULES below.
	//			- NOTE: indent, string literals and comments will be removed
	//				BEFORE calling `parseStructure`
	tokenize(text) {
		let lines = text.split("\n").map(line => {
			let tokens = [];
			// pop indent off
			let tabs = line.match(this.TABS);
			if (tabs) {
				tokens.push(new this.indent(tabs.length));
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
					let text = new this.text(line.slice(current, end + 1));
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

				// if we got a comment header symbol, eat until the end of the line
				if (char === "#") {
					let text = line.slice(current);
					let level = line.match(this.HEADER)[0].length;
					text = text.substr(level).trim();
					let comment = new this.comment(text);
					comment.header = true;
					comment.level = level;
					tokens.push(comment);
					// break out of the loop since we ate to the end
					break;
				}

				// if we got a regular comment symbol, eat until the end of the line
				let next = line[current + 1];
				if ((char === "-" && next === "-") || (char === "/" && next === "/")) {
					// get the comment and strip off the comment start
					let text = line.slice(current + 2).trim();
					let comment = new this.comment(text);
					tokens.push(comment);

					// break out of the loop since we ate to the end
					break;
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


// `Text` class for string literals.
// Pass the literal value, use `.text` to get just the bit inside the quotes.
Tokenizer.text = function text(literal) {
	this.literal = literal;

	let start = 0;
	let end = literal.length;
	if (literal[start] === '"' || literal[start] === "'") start = 1;
	if (literal[end-1] === '"' || literal[end-1] === "'") end = -1;
	this.text = literal.slice(start, end);
}
Tokenizer.text.prototype = {
	type: "text",
	toString() {
		return this.literal;
	}
};


// String indent class
Tokenizer.indent = function indent(level) {
	this.level = level;
}
Tokenizer.indent.prototype = {
	type: "indent",
	toString() {
		return "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t".slice(0, this.indent);
	}
};

// Comment class
Tokenizer.comment = function comment(comment) {
	this.comment = comment;
}
Tokenizer.comment.prototype = {
	type: "comment",
	toString() {
		return `/*${this.comment}*/`;
	}
};

export default Tokenizer;
