
// TODO: convert to line-aware stream???
export default class TextStream {
	// You can construct with a text string or a set of properties (including `text`).
	constructor(textOrProps) {
		if (typeof textOrProps === "string")
			this.text = textOrProps;
		else
			Object.assign(this, textOrProps);

		// Make sure `text` is defined.
		if (!("text" in this)) this.text = "";
		if (!("startIndex" in this)) this.startIndex = 0;
	}

	// Return an immutable clone of the stream.
	clone(props) {
		let clone = new TextStream(this);
		Object.assign(clone, props);
		return clone;
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
	// Match `pattern` as regex at head of stream.
	// Returns match or `undefined`.
	// NOTE: We assume that we do NOT have a `^` in the regex, we'll make sure it only matches at the start.
	// TESTME: this likely breaks with a `g` on the pattern?
	match(pattern) {
		if (!(pattern instanceof RegExp)) throw new TypeError(`TextStream.match(${pattern}): expected RegExp`);
//TODO: use `stream.range` to ensure match is not not beyond `string.endIndex`
		var match = this.head.match(pattern);
		// only return match at the beginning of the stream
		if (match && match.index === 0) return match;
	}

	startsWith(string) {
//TODO: use `stream.range` to ensure match is not not beyond `string.endIndex`
		return this.head.startsWith(string);
	}


//
// ## Reflection
//
	// Return text of string starting at our `startIndex`
	get head() {
		return this.range();
	}

	// Return a range of the string from `startIndex` to `endIndex` NON-inclusive.
	range(startIndex = this.startIndex, endIndex = this.text.length) {
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
}
