
// TODO: convert to line-aware stream???
export default class TextStream {
	// You can construct with a text string or a set of properties (including `text`).
	constructor(...textOrProps) {
		textOrProps.forEach((arg) => {
			if (typeof arg === "string") {
				this.text = arg;
			}
			else if (arg) {
				Object.assign(this, arg);
			}
		})

		// Make sure `text` and `startIndex` are defined.
		if (!("text" in this)) this.text = "";
		if (!("startIndex" in this)) this.startIndex = 0;
		this.head = this.text.substr(this.startIndex);
	}

	// Return an immutable clone of the stream.
	clone(props) {
		return new TextStream(this, props);
	}

	// Return a clone of the stream, advanced to new startIndex.
	advanceTo(startIndex) {
		return this.clone({ startIndex });
	}

	// Return a clone of the stream, advancing startIndex BY `length`
	advanceBy(length) {
		return this.clone({ startIndex: this.startIndex + length });
	}

// 	// Return clone of this stream with endIndex set to start + `length`
// 	endAfter(length) {
// 		return this.clone({ endIndex: this.startIndex + length });
// 	}

//
// ## Matching
//
	// Match `pattern` as regex in this stream.
	// Returns match or `undefined`.
	// If you want to test the start of the stream,
	//	make sure your regex starts with `^`.
	// TESTME: this likely breaks with a `g` on the pattern?
	match(pattern) {
		if (!(pattern instanceof RegExp)) throw new TypeError(`TextStream.match(${pattern}): expected RegExp`);
//TODO: use `stream.range` to ensure match is not not beyond `string.endIndex`
		return this.head.match(pattern) || undefined;
	}

	// Does this stream INCLUDE a regex within it?
	// Returns `true` or `false`.
	// NOTE: Pattern must NOT start with `^` for this to match in the middle of the stream.
	test(pattern) {
		return pattern.test(this.head);
	}

//
// ## Reflection
//
	// Return text of string starting at our `startIndex`
// 	get head() {
// 		return this.range();
// 	}

	// Return a range of the string from `startIndex` to `endIndex` NON-inclusive.
	range(startIndex = this.startIndex, endIndex = this.endIndex || this.text.length) {
		return this.text.substring(startIndex, endIndex);
	}

	// Length of the stream.
	get length() {
		return this.text.length;
	}

	// Are we at the end of the stream?
	get isEmpty() {
		return this.startIndex === this.length;
	}

	toString() {
		return this.text
	};

	// Tokenize text into a series of:
	//	- an array for each line, within each line,
	//		- `{ indent: number }` for indent at start of line
	//		- strings for keywords/symbols or
	//		- objects for things which match the TOKENIZE_RULES below.
	//			- NOTE: indent, string literals and comments will be removed
	//				BEFORE calling `parseStructure`
	static tokenize(text) {
		const TABS = /^\t+/;
		const WORD_START = /^[A-Za-z]/;
		const WORD_CHAR = /^[\w_-]/;
		const WHITE_SPACE = /^\s/;
		const NUMBER_START = /^[0-9-.]/;
		const NUMBER = /^-?([0-9]*\.)?[0-9]+/;
		const HEADER = /^#+/;

		let lines = text.split("\n").map(line => {
			let tokens = [];
			// pop indent off
			let tabs = line.match(TABS);
			if (tabs) {
				tokens.push(new TextStream.indent(tabs.length));
				line = line.substr(tabs.length);
			}

			let current = 0;
			let last = line.length;
			while (current < last) {
				// eat whitespace
				while (WHITE_SPACE.test(line[current])) {
					current++;
				}

				let char = line[current];
				// if a word character, make the `word` as long as we can
				if (WORD_START.test(char)) {
					let start = current;
					current++;
					while (current < last && WORD_CHAR.test(line[current])) {
						current++;
					}
					tokens.push(line.slice(start, current));
					continue;
				}

				// if char is a quote symbol, eat until we get a matching quote.
				if (char === '"' || char === "'") {
					let end = this.getEndQuotePosition(line, current, char);
					let text = new TextStream.text(line.slice(current, end + 1));
					if (end === last) text.unbalanced = true;
					tokens.push(text);
					current = end + 1;
					continue;
				}

				// if a number, stick in as a number
				if (NUMBER_START.test(char)) {
					let numberMatch = line.substr(current).match(NUMBER);
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
					let level = line.match(HEADER)[0].length;
					text = text.substr(level).trim();
					let comment = new TextStream.comment(text);
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
					let comment = new TextStream.comment(text);
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
	}

	// Return position of matching `quoteSymbol` for `line` at `start`.
	// TODO: handle `\"`
	static getEndQuotePosition(line, start, quoteSymbol) {
		let end = start + 1;
		let last = line.length;
		while (end < last && line[end] !== quoteSymbol) {
			end++;
		}
		return end;
	}
}


// `Text` class for string literals.
// Pass the literal value, use `.text` to get just the bit inside the quotes.
TextStream.text = function text(literal) {
	this.literal = literal;

	let start = 0;
	let end = literal.length;
	if (literal[start] === '"' || literal[start] === "'") start = 1;
	if (literal[end-1] === '"' || literal[end-1] === "'") end = -1;
	this.text = literal.slice(start, end);
}
TextStream.text.prototype = {
	type: "text",
	toString() {
		return this.literal;
	}
};


// String indent class
TextStream.indent = function indent(level) {
	this.level = level;
}
TextStream.indent.prototype = {
	type: "indent",
	toString() {
		return "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t".slice(0, this.indent);
	}
};

// Comment class
TextStream.comment = function comment(comment) {
	this.comment = comment;
}
TextStream.comment.prototype = {
	type: "comment",
	toString() {
		return `/*${this.comment}*/`;
	}
};
