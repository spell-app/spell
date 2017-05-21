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


	// NOTE: `patterns` match a single character and are either:
	//	- a RegExp.
	//	- an array of strings (in which case any of the strings will work).
	//
	// It is MUCH MUCH faster to use strings!
	rules : [
		"matchWhitespace",
		"matchWord",
		"matchNumber",
		"matchJSXElement",
		"matchNewline",
		"matchText",
		"matchComment",
	],

	// Tokenize a stream and then divide it into lines.
	tokenizeToLines(text, start, end, rules) {
		let tokens = this.tokenize(text, start, end, rules);
		let lines = [[]];
		tokens.forEach(token => {
			if (token === Tokenizer.NEWLINE) lines.push([]);
			else lines.last.push(token);
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
	tokenize(text, start = 0, end = text.length, rules = this.rules) {
		let results = [];
		// quick return if only whitespace
		if (!text.trim()) return results;

		// check for a leading indent if at the beginning of text
		if (start === 0) {
			let [indent, newStart] = this.matchIndent(text, start, end) || [];
			if (indent) {
				results.push(indent);
				start = newStart;
			}
		}

		// process rules repeatedly until we get to the end
		while (start < end) {
			let [newResults, newStart] = this.applyRulesToHead(text, start, end, results, rules);
			// Throw if we didn't get a productive rule!
			if (start === newStart) throw new SyntaxError(`tokenize(${text.substr(start, 20)}): rules didn't match anything!`);
			results = newResults;
			start = newStart;
		}
//console.timeEnd("tokenize");
		return results;
	},

	// Apply `rules` to the head of the text.
	applyRulesToHead(text, start, end, results, rules) {
		let ruleNumber = -1;
		let ruleName;
		while (ruleName = rules[++ruleNumber]) {
			let result = this[ruleName](text, start, end);
			if (result !== undefined) {
				let [token, newStart] = result;
				if (token) {
					results = results.concat(token);
				}
				return [results, newStart];
			}
		}
		// if NO rules applied, eat a single symbol character.
		results.push(text[start]);
		return [results, start + 1];
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
	matchNewline(text, start, end) {
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
	matchNumber(text, start, end) {
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
	matchComment(text, start, end) {
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
	//	### JSX
	//

	jsxRules : [
		"matchWhitespace",
		"matchJSXAttribute",
		"matchEndTag",
	],

	// JSX parsing

	BINARY_TAG_END : />/,
	UNARY_TAG_END : "/\/>",
	TAG_END : /^<\/([\w-])>/,

	getTagEnd : function(tagName, startLine = true) {
		return new RegExp(`${startLine ? "^" : ""}<\/(${tagName})>`);
	},


	// Eat a (nested) JSX expression.
	JSX_TAG_NAME : /^<([A-Za-z][\w-\.]*)(\s*\/>|\s*>|\s+)/,
	matchJSXElement(text, start, end) {
		// Make sure we start with `<`.
		if (text[start] !== "<") return undefined;

		let line = this.getLine(text, start, end);
		let tagMatch = line.match(this.JSX_TAG_NAME);
		if (!tagMatch) return undefined;

		let [ matchText, tagName, endBit ] = tagMatch;
		let jsxElement = new Tokenizer.JSXElement(tagName);
		let nextStart = start + matchText.length;

		// If unary tag, mark as such and return.
		endBit = endBit.trim();
		if (endBit === "/>") {
			jsxElement.isUnaryTag = true;
			return [jsxElement, nextStart];
		}

		// If we didn't immediately get an end marker, attempt to match attributes
		if (endBit !== ">") {
			let [ attrs, attrEnd ] = this.matchJSXAttributes(text, nextStart, end, jsxElement);
			jsxElement.attributes = attrs;
			nextStart = attrEnd;
		}

		// at this point we should get an `/>` or `>` (with no whitespace).

		// Return immediately for unary tag
		if (text[nextStart] === "/" && text[nextStart + 1] === ">") {
			jsxElement.isUnaryTag = true;
			return [jsxElement, nextStart + 2];
		}

		// Complain if we can't match a `>`
		if (text[start] !== ">") {
			console.warn("Missing expected end `>` for jsxElement", jsxElement, "'"+text.slice(start, nextStart)+"'");
			jsxElement.error = "No end >";
			return [jsxElement, nextStart];
		}

// TODO: look for children!
// TODO: look for end tag!

		return [jsxElement, nextStart];
	},

	// JSX element class
	JSXElement : class jsxElement {
		constructor(tagName, attributes, children) {
			this.tagName = tagName;
			if (attributes) this.attributes = attributes;
			if (children) this.children = children;
		}
		toString() {
			let attrs = (this.attributes && " " + this.attributes.join(" ")) ||"";
			if (this.isUnaryTag) return `<${this.tagName}${attrs}/>`;
			return `<${this.tagName}${attrs}></${this.tagName}>`;
		}
	},


	// Match any JSX attributes a `text[start]` and add to `jsxElement`.
	// Handles whitespace, including whitespace at the end.
//TODO: "\n" ???
	matchJSXAttributes(text, start, end) {
		let attrs = [];
		let attrStart = start;
		while (true) {
			let [ attr, nextStart ] = this.matchJSXAttribute(text, attrStart, end) || [];
			if (!attr) break

			attrs.push(attr);
			attrStart = nextStart;
		}
		return [attrs, attrStart];
	},

	// Match a single JSX element attribute as `<attr>={<value>}`
// TODO: doesn't handle anything nested!
// TODO: attr='a'
// TODO: attr="a"
// TODO: attr=<nested jsx>
// TODO: {...xxx}
	JSX_ATTRIBUTE_START : /^\s*([\w-]+\b)\s*(=?)\s*/,
	matchJSXAttribute(text, start, end) {
		// attributes must start with a word character
		if (!this.WORD_START.test(text[start])) return undefined;

		// attempt to match a full attribute as `name=` or `name name name`
		let line = this.getLine(text, start, end);
		let result = line.match(this.JSX_ATTRIBUTE_START);
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
		// eat whitespace before the next attribute
		nextStart = this.eatWhitespace(text, nextStart, end);
		return [attribute, nextStart];
	},

	// Match a value expression for a JSX element attribute:
	//	`'...'`			// Text (literal string).
	//	`"..."`			// Text (literal string).
	//	`{...}`			// Expression.  Results will be tokenized array.
	//	`<....>`		// JSX element.
	//	`1`				// Number.  Note: this is an extension to JSX>
	//
	// NOTE: we will be called immediately after the `=` (and subsequent whitespace).
//TODO: `<word>`
	matchJSXAttributeValue(text, start, end) {
			// attempt to match a literal string
		return this.matchText(text, start, end)
			// attempt to match expression as `{...}`
			|| this.matchJSXExpression(text, start, end)
			// attempt to match JSX elements
			|| this.matchJSXElement(text, start, end)
			// attempt to match a number (extension to JSX)
			|| this.matchNumber(text, start, end)
		;
	},

	// Match a JSX expression enclosed in curly braces.
//TODO: newlines/indents???
	matchJSXExpression(text, start, end) {
		let endIndex = this.findMatchingDelmiter("{", "}", text, start, end);
		if (endIndex === undefined) return undefined;

		// tokenize the contents!!!
		let contents = text.slice(start + 1, endIndex).trim();
		let tokens = this.tokenize(contents);

		return [tokens, endIndex + 1];
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
	getLine(text, start = 0, end = text.length) {
		let newLine = text.indexOf("\n", start);
		if (newLine === -1 || newLine > end) newLine = end;
		return text.slice(start, newLine);
	},

	// Find index of the matching SINGLE CHARACTER `endDelimiter` to match `startDelimiter`.
	// Matches nested delimiters and handles escaped delimiters.
	// Assumes `text[start]` is the startDelimiter!
	// Returns numeric index or `undefined` if no match or if first char is not `startDelimiter`.
	//
	//	Also handles nested quotes -- if we encounter a single or double quote,
	//		we'll skip scanning until we find a matching quote.
	//
	//	eg:  `findMatchingDelmiter("{", "}", "{aa{a}aa}")` => 8
	findMatchingDelmiter(startDelimiter, endDelimiter, text, start = 0, end = text.length) {
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

};


export default Tokenizer;
