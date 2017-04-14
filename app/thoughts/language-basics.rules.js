// End-of-line symbol, used to indicate that statement goes til the end of the line.
class EOS extends Token {
	static PATTERN = /\n/;
}

class LEFT_PAREN extends Token {
	static PATTERN = /\(/;
}

class RIGHT_PAREN extends Token {
	static PATTERN = /\}/;
}

class COMMA extends Token {
	static PATTERN = /,/;
}

class COLON extends Token {
	static PATTERN = /:/;
}


// Identifier for variable, method parameter, etc.
class IDENTIFIER extends Token {
	static PATTERN = /\w+[A-Za-z0-9\-_]*/;
}
class VARIABLE extends IDENTIFIER {}

// Identifier which MUST start with a capital letter.
class TYPE_IDENTIFIER extends Token {
	static PATTERN = /[A-Z]+[A-Za-z0-9\-_]*/;
}

// Literal number, string or boolean.
// NOTE: double quote strings only.
// TODO: convert `yes` and `no` to true/false
class LITERAL extens Token {
	static PATTERN = /(?:-?\d+\.?\d*|"(?:[^"\\]|\\.)*"|true|false|yes|no)/;
}
//TODO:  $.literal	= number, literal string, yes, no, array(?), etc


// Ad-hoc registry of words literals.
const WORD_REGISTRY = {};
$.getWordToken = function(word) {
	if (this.WORD_REGISTRY[word]) return this.WORD_REGISTRY[word];
	this.WORD_REGISTRY[word] = createToken({name: word, pattern: new RegExp(word)});
	return this.WORD_REGISTRY[word];
}


// Consume ANY of the specified words as a word string literal.
// Returns workToken matched or throws if no match.
$.CONSUME_WORD = function(...words) {
	var result = this.CONSUME_OPTIONAL_WORD(...arguments);
	if (result !== undefined) return this.getWordToken(result);

	let wordsMsg = words.length === 1 ? `--> ${words[0]} <--` : `one of --> ${words} <--`;
    let msg = `Expecting ${wordsMsg} but found --> '${getImage(actualToken)}' <--`
    throw this.SAVE_ERROR(new exceptions.MismatchedTokenException(msg, this.LA(1)))
}

// Consume ANY of the specified words as a word string literal.
// Returns string matched or undefined if no match.
$.CONSUME_OPTIONAL_WORD = function(...words) {
	var nextToken = this.LA(1);
	for (let word in words) {
		var wordToken = this.getWordToken(word);
		if (this.tokenMatcher(nextToken, wordToken)) {
			this.consumeToken();
			return word;
		}
	}
	return undefined;
}


// List of literal values (number, string, yes/no)
$.RULE("literal_list", function() {
	$.CONSUME(LEFT_PAREN);
	let list = [];
	list.push($.CONSUME(LITERAL).image);
	$.MANY(() => {
		$.CONSUME(COMMA);
		list.push($.CONSUME(LITERAL).image);
	});
	$.CONSUME(RIGHT_PAREN);
	return list;
});


$.RULE("define_variable", function() {
	var _type = "variable";

	// TODO: peek for "shared" "constant" ("private" ?)
	var modifier = $.CONSUME_OPTIONAL_WORD("shared", "constant");

	return $.OR([
		// Untyped variable:
		//	`{variable}`
		{ALT: () => {
			let name = $.CONSUME(VARIABLE).image;
			$.CONSUME(EOS);
			return { _type, modifier, name };
		}},

		// Typed variable with no default.
		//	`{variable} as {Type}`
		{ALT: () => {
			let name = $.CONSUME(VARIABLE).image;
			$.CONSUME_WORD("as");
			let type = $.CONSUME(TYPE_IDENTIFIER).image;
			$.CONSUME(EOS);
			return { _type, modifier, name, type }
		}},

		// Variable with a literal default
		{ALT: () => {
			let name = $.CONSUME(VARIABLE).image;
			$.CONSUME(EQUALS);
			let value = $.CONSUME(LITERAL).image;
			$.CONSUME(EOS);
			return { _type, modifier, name, value }
		}},

// 		// Variable initialized with an expression
// 		//	`{variable} = {expression}`
// 		{ALT: () => {
// 			let name = $.CONSUME(VARIABLE).image;
// 			$.CONSUME(EQUALS);
// 			let expression = $.SUBRULE($.expression);
// 			$.CONSUME(EOS);
// 			return { _type, modifier, name, expression }
// 		}},

		// Variable as an enumerated value.  Default is first value (?).
		// TODO: expression which returns a list...
		//	`{variable} as one of \({value}(, {value})+\)`
		{ALT: () => {
			let name = $.CONSUME(VARIABLE).image;
			$.CONSUME_WORD("as");
			$.CONSUME_WORD("one");
			$.CONSUME_WORD("of");
			let enumeration = $.SUBRULE($.literal_list);
			return { _type, modifier, name, enumeration }
		}},

	]);
});
