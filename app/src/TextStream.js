
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
}
