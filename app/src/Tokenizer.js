//
//	# Tokenizer
//		- `tokenize()` Breaks up long string into tokens, including JSX expressions, etc.
//
const Tokenizer = {

	// Tokenize a stream and then divide it into lines.
	tokenizeToLines(text, start, end, rules) {
		let tokens = this.tokenize(text, start, end, rules);
		let lines = [[]];
		tokens.forEach(token => {
			if (token === Tokenizer.NEWLINE) lines.push([]);
			else lines[lines.length - 1].push(token);
		});
		return lines;
	},


	// Tokenize text between `start` and `end` into an array of `results`, an array of:
	//	- `Tokenizer.NEWLINE` for a newline symbol
	//	- strings for keywords/symbols
	//	- numbers for number literals
	//	- `{ indent: number }` for indent at start of line
	//	- `{ type: "text", literal: "'abc'", text: "abc" }
	//	- `{ type: "indent", level: 7 }`
	//	- `{ type: "comment", comment: "string", commentSymbol, whitespace }`
	tokenize(text, start = 0, end = text.length) {
		let results = [];
		// quick return if only whitespace
		if (!text.trim()) return results;

		let nextStart = start;
		// check for a leading indent if at the beginning of text
		if (nextStart === 0) {
			[results, nextStart] = this.eatTokens(this.matchIndent, text, start, end);
		}

		// Process our top-level rules.
		[results, nextStart] = this.eatTokens(this.matchTopTokens, text, start, end, results);

		if (nextStart !== end) console.warn("tokenize(): didn't consume: `", tokens.slice(nextStart, end) + "`");
		return results;
	},

	// Repeatedly execute a `method` (bound to `this) which returns a `[result, nextStart]` or `undefined`.
	// Places matched results together in `results` array and returns `[results, nextStart]` for the entire set.
	// Stops if `method` doesn't return anything, or if calling `method` is unproductive.
	eatTokens(method, text, start, end, results = []) {
		// process rules repeatedly until we get to the end
		while (start < end) {
			let result = method.call(this, text, start, end);
			if (!result) break;

			let [tokens, nextStart] = result;
			// Bail if we didn't get a productive rule!
			if (start === nextStart) break;

			// handle newResults as an array or single object.
			if (tokens !== undefined) results = results.concat(tokens);
			start = nextStart;
		}
		return [results, start];
	},

	// Match a single top-level token at `text[start]`.
	matchTopTokens(text, start, end) {
		return	this.matchWhitespace(text, start, end)
			 || this.matchWord(text, start, end)
			 || this.matchNumber(text, start, end)
			 || this.matchNewlineAndIndent(text, start, end)
			 || this.matchJSXElement(text, start, end)
			 || this.matchText(text, start, end)
			 || this.matchComment(text, start, end)
			 || this.matchSymbol(text, start, end)
		;
	},


	//
	//	### Symbol character
	//

	// Match the single "symbol" character at `text[start]`.
	// NOTE: This does not do any checking, it just blindly uses the character in question.
	//		 You should make sure all other rules have been exhausted first.
	matchSymbol(text, start, end) {
		if (start >= end) return undefined;
		return [text[start], start + 1]
	},


	//
	//	### Whitespace
	//

	// Return the first char position after `start` which is NOT a whitespace char.
	// May return `start` if that's not whitespace...
	eatWhitespace(text, start, end) {
		let whiteSpaceEnd = start;
		while (text[whiteSpaceEnd] === " " || text[whiteSpaceEnd] === "\t") {
			whiteSpaceEnd++;
		}
		return whiteSpaceEnd;
	},

	// Eat one or more whitespace characters.
	matchWhitespace(text, start, end) {
		let whiteSpaceEnd = this.eatWhitespace(text, start, end);
		if (whiteSpaceEnd === start) return undefined;
		return [undefined, whiteSpaceEnd];
	},

	//
	//	### Newline
	//

	// Newline marker (singleton).
	NEWLINE : new (class newline {})(),

	// Eat a newline, which starts a new line in the `results`.
	// If one or more tabs occur after the newline, inserts a `Tokenizer.Indent` in the new line.
	matchNewlineAndIndent(text, start, end) {
		if (text[start] !== "\n") return undefined;

		let nextLineStart = start + 1;

		// attempt to match tabs at the beginning of the line
		let [ indent, indentEnd ] = this.matchIndent(text, nextLineStart, end) || [];
		if (indent) return [ [ Tokenizer.NEWLINE, indent ], indentEnd ];

		return [ Tokenizer.NEWLINE, nextLineStart ];
	},


	//
	//	### Indent
	//

	// Convert a run of tabs (e.g. at the beginning of a line) into a `Tokenizer.Indent`.
	matchIndent(text, start, end) {
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
	//	### Word
	//

	// Match a single `word` in `text` at character `start`.
	// Returns `[word, wordEnd]`.
	// Returns an empty array if couldn't match a word.
	WORD_START: /[A-Za-z]/,
	WORD_CHAR : /^[\w_-]/,
	matchWord(text, start, end) {
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
	matchText(text, start, end) {
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
		}
		get text() {
			let string = this.quotedString;
			// calculate `text` as the bits between the quotes.
			let start = 0;
			let end = string.length;
			if (string[start] === '"' || string[start] === "'") start = 1;
			if (string[end-1] === '"' || string[end-1] === "'") end = -1;
			return string.slice(start, end);
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
	NUMBER_START: /[0-9-.]/,
	NUMBER : /^-?([0-9]*\.)?[0-9]+/,
	matchNumber(text, start, end) {
		if (!this.NUMBER_START.test(text[start])) return undefined;

		let numberMatch = this.matchExpressionAtHead(this.NUMBER, text, start, end);
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
	COMMENT : /^(##+|--+|\/\/+)(\s*)(.*)/,
	matchComment(text, start, end) {
		let commentStart = text.slice(start, start + 2);
		if (commentStart !== "--" && commentStart !== "\/\/" && commentStart !== "##") return undefined;

		// comment eats until the end of the line
		let line = this.getLineAtHead(text, start, end);
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
	//	### JSX
	//

	// Eat a (nested) JSX expression.
	// Ignores leading whitespace.
	JSX_TAG_NAME : /^<([A-Za-z][\w-\.]*)(\s*\/>|\s*>|\s+)/,
	matchJSXElement(text, start, end) {
		let nextStart = this.eatWhitespace(text, start, end);
		// Make sure we start with `<`.
		if (text[nextStart] !== "<") return undefined;

		let tagMatch = this.matchExpressionAtHead(this.JSX_TAG_NAME, text, nextStart, end);
		if (!tagMatch) return undefined;

		let [ matchText, tagName, endBit ] = tagMatch;
		let jsxElement = new Tokenizer.JSXElement(tagName);
		nextStart = nextStart + matchText.length;

		// If unary tag, mark as such and return.
		endBit = endBit.trim();
		if (endBit === "/>") {
			jsxElement.isUnaryTag = true;
			return [jsxElement, nextStart];
		}

		// If we didn't immediately get an end marker, attempt to match attributes
		if (endBit !== ">" && endBit !== "/>") {
			let [ attrs, attrEnd ] = this.eatTokens(this.matchJSXAttribute, text, nextStart, end);
			jsxElement.attributes = attrs;
			nextStart = attrEnd;
		}

		// at this point we should get an `/>` or `>` (with no whitespace).
		if (text[nextStart] === "/" && text[nextStart + 1] === ">") {
			endBit = "/>";
			nextStart += 2;
		}
		else if (text[nextStart] === ">") {
			endBit = text[nextStart];
			nextStart += 1;
		}

		// Return immediately for unary tag
		if (endBit === "/>") {
			jsxElement.isUnaryTag = true;
			return [jsxElement, nextStart];
		}

		// advance past `>`
		if (endBit !== ">") {
			console.warn("Missing expected end `>` for jsxElement", jsxElement, "`"+text.slice(start, nextStart)+"`");
			jsxElement.error = "No end >";
			return [jsxElement, nextStart];
		}

		let [children, childEnd] = this.matchJSXChildren(text, nextStart, end, tagName);
		if (children.length) jsxElement.children = children;
		nextStart = childEnd;

		return [jsxElement, nextStart];
	},

	// JSX element class
	JSXElement : class jsxElement {
		constructor(tagName, attributes, children) {
			this.tagName = tagName;
			if (attributes) this.attributes = attributes;
			if (children) this.children = children;
		}

		// Return attributes as a map.
		get attrs() {
			let attrs = {};
			if (this.attributes) this.attributes.forEach(attr => attrs[attr.name] = attr.value);
			return attrs;
		}

		// Return our attributes as a string
		get attrsAsString() {
			if (!this.attributes) return "";
			return " " + this.attributes.map( ({ name, value }) => {
				if (value === undefined) return name;
				// convert value array (tokens) to string
				// TODO: this will want to be smarter...
				if (Array.isArray(value)) value = `{${value.join(" ")}}`;
				return `name=${value}`;
			}).join(" ");
		}

		// Return our children as a string.
		get childrenAsString() {
			if (!this.children) return "";
			return this.children.map(child => {
				if (Array.isArray(child)) return `{${child.join(" ")}}`;
				return "" + child;
			}).join("");
		}

		toString() {
			let attrs = this.attrsAsString;
			let children = this.childrenAsString;
			if (this.isUnaryTag) return `<${this.tagName}${attrs}/>`;
			return `<${this.tagName}${attrs}>${children}</${this.tagName}>`;
		}
	},


	//
	//	### JSX children
	//

	// Match JSX element children of `<tagName>` at `text[start]`.
	// Matches nested children and end tag.
	// Returns `[children, nextStart]`.
	matchJSXChildren(text, start, end, tagName) {
		let children = [];
		let nesting = 1;
		let endTag = `</${tagName}>`;

		let nextStart = start;
		while(true) {
			let result = this.matchJSXChild(text, nextStart, end, endTag);
			if (!result) break;

			let [child, childEnd] = result;
			nextStart = childEnd;
			// If we got the endTag, update nesting and break out of loop if nesting !== 0
			if (child === endTag) {
				nesting --;
				if (nesting === 0) break;
				continue;
			}
			else {
				if (child) children.push(child);
			}
		}
// TODO: how to surface this error???
		if (nesting !== 0) {
			console.warn(`matchJSXChildren(${text.slice(start, nextStart + 10)}: didn't match end child!`);
		}
		return [children, nextStart];
	},

	// Match a single JSX child:
	//	- current endTag
	//	- `{ jsx expression }`
	//	- nested JSX element
	//	- (anything else) as jsxText expression.
	matchJSXChild(text, start, end, endTag) {
		return this.matchJSXEndTag(text, start, end, endTag)
			|| this.matchJSXExpression(text, start, end)
			|| this.matchJSXElement(text, start, end)
			|| this.matchJSXText(text, start, end);
	},

	// Attempt to match a specific end tag.
	// Ignores leading whitespace.
	matchJSXEndTag(text, start, end, endTag) {
		let nextStart = this.eatWhitespace(text, start, end);
		if (!this.matchStringAtHead(endTag, text, nextStart, end)) return undefined;
		return [endTag, nextStart + endTag.length];
	},

	// Match a JSX expression enclosed in curly braces, eg:  `{ ... }`.
	//  Handles nested curlies, quotes, etc.
	// Returns array of tokens of internal match.
	// Ignores leading whitespace.
//TODO: newlines/indents???
	matchJSXExpression(text, start, end) {
		let nextStart = this.eatWhitespace(text, start, end);
		let endIndex = this.findMatchingAtHead("{", "}", text, nextStart, end);
		if (endIndex === undefined) return undefined;

		// tokenize the contents!!!
		let contents = text.slice(nextStart + 1, endIndex).trim();
		let tokens = this.tokenize(contents);

		return [tokens, endIndex + 1];
	},

	// Match JSXText until the one of `{`, `<`, `>` or `}`.
	// NOTE: INCLUDES leading / trailing whitespace.
	JSX_TEXT_END_CHARS : ["{", "<", ">", "}"],
	matchJSXText(text, start, end) {
		// temporarily advance past whitespace (we'll include it in the output).
		let nextStart = this.eatWhitespace(text, start, end);
		let endIndex = this.findFirstAtHead(this.JSX_TEXT_END_CHARS, text, nextStart, end);
		// If the first non-whitespace char is in our END_CHARS, forget it.
		if (endIndex === nextStart) return undefined;

		// if no match, we've got some sort of error
		if (endIndex === undefined) {
			console.warn("matchJSXText("+text.slice(start, start + 50)+"): JSX seems to be unbalanced.");
			return undefined;
		}

		// include leading whitespace in the output.
		let jsxText = text.slice(start, endIndex);
		return [jsxText, endIndex];
	},


	//
	//	### JSX attributes
	//

	// Match a single JSX element attribute as `<attr>={<value>}`
// TODO: {...xxx}
	JSX_ATTRIBUTE_START : /^\s*([\w-]+\b)\s*(=?)\s*/,
	matchJSXAttribute(text, start, end) {
		// attributes must start with a word character
		if (!this.WORD_START.test(text[start])) return undefined;

		// attempt to match an attribute name, including `=` if present.
		let result = this.matchExpressionAtHead(this.JSX_ATTRIBUTE_START, text, start, end);
		if (!result) return undefined;

		let [ match, name, equals ] = result;
		let nextStart = start + match.length;
		let attribute = new Tokenizer.JSXAttribute(name);

		// if there was an equals char, parse the value
		if (equals) {
			let [value, valueEnd] = this.matchJSXAttributeValue(text, nextStart, end) || [];
			if (value) {
				attribute.value = value;
				nextStart = valueEnd;
			}
		}
		// eat whitespace before the next attribute / tag end
		nextStart = this.eatWhitespace(text, nextStart, end);
		return [attribute, nextStart];
	},

	// Match a value expression for a JSX element attribute:
	//	`'...'`			// Text (literal string).
	//	`"..."`			// Text (literal string).
	//	`{...}`			// Expression.  Results will be tokenized array.
	//	`<....>`		// JSX element.
	//	`1`				// Number.  Note: this is an extension to JSX.
	//
	// NOTE: we will be called immediately after the `=` (and subsequent whitespace).
//TODO: `<word>` ?
	matchJSXAttributeValue(text, start, end) {
		return this.matchText(text, start, end)
			|| this.matchJSXExpression(text, start, end)
			|| this.matchJSXElement(text, start, end)
			|| this.matchNumber(text, start, end)
		;
	},

	// JSX attribute class
	JSXAttribute : class jsxAttribute {
		constructor(name, value) {
			this.name = name;
			if (value !== undefined) this.value = value;
		}
		toString() {
			if (this.value === undefined) return this.name;
			return `${this.name}={${this.value}}`;
		}
	},


	//
	//	## Utility functions
	//

	// Return characters up to, but not including, the next newline char after `start`.
	// If `start` is a newline char, returns empty string.
	// If at the end of the string (eg: no more newlines), returns from start to end.
	getLineAtHead(text, start = 0, end = text.length) {
		let newLine = text.indexOf("\n", start);
		if (newLine === -1 || newLine > end) newLine = end;
		return text.slice(start, newLine);
	},

	// Match a multi-char string starting at `text[start]`.
	matchStringAtHead(string, text, start = 0, end = text.length) {
		let stringEnd = start + string.length;
		if (stringEnd > end) return undefined;
		return string === text.slice(start, stringEnd);
	},


	// Match a regular expression starting at `text[start]`, returning the match.
	// Returns `null` if no match.
	//
	// NOTE: The expression MUST start with `/^.../`
	matchExpressionAtHead(expression, text, start = 0, end = text.length) {
		let head = text.slice(start, end);
		return head.match(expression);
	},

	// Find index of the matching SINGLE CHARACTER `endDelimiter` to match `startDelimiter`.
	// Matches nested delimiters and handles escaped delimiters.
	// Assumes `text[start]` is the startDelimiter!
	// Returns numeric index or `undefined` if no match or if first char is not `startDelimiter`.
	//
	//	Also handles nested quotes -- if we encounter a single or double quote,
	//		we'll skip scanning until we find a matching quote.
	//
	//	eg:  `findMatchingAtHead("{", "}", "{aa{a}aa}")` => 8
	findMatchingAtHead(startDelimiter, endDelimiter, text, start = 0, end = text.length) {
		if (text[start] !== startDelimiter) return undefined;

		let nesting = 0;
		let current = start;
		while (current < end) {
			let char = text[current];
			// if startDelimiter, increase nesting
			if (char === startDelimiter) {
				nesting++;
			}
			// if endDelimiter, decrease nesting and return if nesting back to 0
			else if (char === endDelimiter) {
				nesting--;
				if (nesting === 0) return current;
			}
			// if a single or double quote, skip until the matching quote
			else if (char === "'" || char === '"') {
				let [token, afterQuote] = this.matchText(text, current, end) || [];
				current = afterQuote;
				continue;	// continue so we don't add 1 to curent below
			}
			// If backslash, skip an extra char if it's either delimiter or a quote
			else if (char === "\\") {
				char = text[current + 1];
				if (char === startDelimiter
				 || char === endDelimiter
				 || char === "'"
				 || char === '"'
				) {
					current++;;
				}
			}
			current++;
		}
	},

	// Return the index of the first NON-ESCAPED character in `chars` after `text[start]`.
	// Returns `undefined` if we didn't find a match.
	findFirstAtHead(chars, text, start, end) {
		while (start < end) {
			let char = text[start];
			if (chars.includes(char)) return start;
			// if we got an escape char, ignore the next char if it's in `chars`
			if (char === "\\" && chars.includes(text[start+1])) start++;
			start++;
		}
		if (start >= end) return undefined;
		return start;
	}

};


export default Tokenizer;
