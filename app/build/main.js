/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 12);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Parser = __webpack_require__(1);

var _Parser2 = _interopRequireDefault(_Parser);

var _RuleSyntax = __webpack_require__(3);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Create parser instance.
//
//	# Create a `parser` singleton to use to set up rules and during tests.
//
var parser = new _Parser2.default();
exports.default = parser;

// Stick on window for reflection and ad-hoc testing.

window.parser = parser;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // Spell "English" parser strawman

// TODO:	`test` function for quick no-good hit on `{a} blah blah {b}`?
// TODO:	this doesn't work:   `{expression} is {expression}`
// TODO:	break `file` into lines and process each (incl. substr/match not going beyond the end)
// TODO:	nesting -- is this just indent = "add block scope"
// TODO:	promotion pattern for gather arguments (eg: literal-list) ???
// TODO:	What does syntax tree look like?  How do we extract meaning out of the nest?
// TODO:	Pass `context` to toSource(), add property descriptors to `class`, variables and code to `method`, `global` stuff etc

var _TextStream = __webpack_require__(5);

var _TextStream2 = _interopRequireDefault(_TextStream);

var _Rule = __webpack_require__(2);

var _Rule2 = _interopRequireDefault(_Rule);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// GRRR... will SOMEONE on the node team please implement console.group ???
if (!console.group) console.group = console.log;
if (!console.groupEnd) console.groupEnd = console.log;

var Parser = function () {
	function Parser(properties) {
		_classCallCheck(this, Parser);

		Object.assign(this, properties);

		// Clone rules, starting with a completely empty map if not defined (no standard object keys)
		this.rules = Object.create(this.rules || null);
	}
	// Set to `true` to output debug info while adding rules


	_createClass(Parser, [{
		key: "getRule",
		value: function getRule(name) {
			return this.rules[name];
		}

		//
		//### Parsing
		//
		// Parse `name`d rule at head of `stream` (`string` or `TextStream`).
		// Handles optional and repeating rules as well as eating whitespace.
		// Returns result of parse.

	}, {
		key: "parse",
		value: function parse(name, stream) {
			if (typeof stream === "string") stream = new _TextStream2.default(stream);
			var rule = this.getRule(name);
			if (!rule) throw new SyntaxError("parser.parse(" + name + "): Rule not found");
			stream = this.eatWhitespace(stream);
			return rule.parse(this, stream);
		}

		// Parse a set of statements line-by-line.
		//TESTME

	}, {
		key: "parseStatements",
		value: function parseStatements(statements) {
			var _this = this;

			var results = [];
			var currentIndent = 0;
			statements.split(/\n+/g).forEach(function (statement) {
				// skip lines that are all whitespace
				if (statement.trim() === "") {
					results.push("");
					return;
				}

				// figure out indent level of this line
				var lineStart = statement.match(/^\t*/)[0];
				var lineIndent = lineStart.length;
				if (lineIndent > currentIndent) {
					if (results.length) results[results.length - 1] += " {";else results.push(lineStart.substr(0, lineIndent - 1) + "{");
				} else if (lineIndent < currentIndent) {
					for (var i = currentIndent; i > lineIndent; i--) {
						results.push(lineStart.substr(0, i) + "}");
					}
				}
				currentIndent = lineIndent;
				var result = _this.parse("statement", statement);
				if (result) {
					results.push(lineStart + result.toSource());
				} else {
					console.warn("Couldn't parse statement:", statement);
					results.push("ERROR: " + statement);
				}
			});
			// add ending braces
			while (currentIndent > 0) {
				results.push("}");
				currentIndent--;
			}

			return results.join("\n");
		}

		// Eat whitespace (according to `rules.whitespace`) at the beginning of the stream.
		// Returns new stream if we matched whitespace, otherwise the same stream.

	}, {
		key: "eatWhitespace",
		value: function eatWhitespace(stream) {
			var result = this.rules.whitespace.parse(this, stream);
			if (!result) return stream;
			return stream.advanceBy(result.matched.length);
		}

		//
		//	Rules
		//

		// Add a rule to our list of rules!
		// Converts to `alternatives` on re-defining the same rule.

	}, {
		key: "addRule",
		value: function addRule(name, rule) {
			// don't override ruleName
			if (!rule.ruleName) rule.ruleName = name;

			var existing = this.rules[name];
			if (existing) {
				if (!(existing instanceof _Rule2.default.Alternatives)) {
					if (Parser.debug) console.log("Converting rule '" + name + "' to alternatives");
					this.rules[name] = new _Rule2.default.Alternatives({ ruleName: name, rules: [existing] });
					// copy argument name over (???)
					if (existing.argument) this.rules[name].argument = existing.argument;
				}
				if (Parser.debug) console.log("Adding rule '" + rule.ruleName + "' to '" + name + "': ", rule);
				this.rules[name].addRule(rule);
			} else {
				this.rules[name] = rule;
			}

			// make a note if we're adding a left-recursive rule
			if (this.ruleIsLeftRecursive(name, rule)) {
				//console.info("marking ", rule, " as left recursive!");
				rule.leftRecursive = true;
			}

			return rule;
		}

		// Is the specified rule left-recursive?

	}, {
		key: "ruleIsLeftRecursive",
		value: function ruleIsLeftRecursive(name, rule) {
			if (!(rule instanceof _Rule2.default.Sequence)) return false;
			//console.log(name, rule);
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = rule.rules[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var subrule = _step.value;

					// ignore optional rules
					if (subrule.optional) continue;
					if (subrule instanceof _Rule2.default.Subrule && subrule.rule === name) return true;
					return false;
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}

			return false;
		}

		//
		// ## Utility methods
		//

		// Find the matching instance of possibly nested `endToken` to balance `startToken`
		//	in array of `tokens` (strings).
		// If successful, returns `{ startIndex, endIndex, slice }`
		// Throws if unsucessful.

	}], [{
		key: "findNestedTokens",
		value: function findNestedTokens(tokens, startToken, endToken) {
			var startIndex = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

			if (tokens[startIndex] !== startToken) throw new SyntaxError("Expected '" + startToken + "' at index " + startIndex + " of tokens");
			var nesting = 0;
			var nested = false;
			for (var endIndex = startIndex + 1, lastIndex = tokens.length; endIndex < lastIndex; endIndex++) {
				var token = tokens[endIndex];
				if (token === startToken) {
					nesting++;
					nested = true;
				}
				if (token === endToken) {
					if (nesting === 0) return { startIndex: startIndex, endIndex: endIndex, slice: tokens.slice(startIndex + 1, endIndex), nested: nested };
					nesting--;
				}
			}
			throw new SyntaxError("Couldn't find matching '" + endToken + "'s starting at item " + startIndex);
		}

		// List of special characters in regular expressions.
		// Used to escape those chars when creating regular expressions from strings.

	}, {
		key: "escapeRegExpCharacters",


		// Given a "normal" `string`, escape any regular expression special characters
		//	so we can create a `new RegExp()`.
		// Also converts a single space to arbitrary set of spaces with "\s+"
		value: function escapeRegExpCharacters(string) {
			return string.split("").map(function (char, index, list) {
				// Special case for backslash
				if (char === "\\") return "\\";
				// Special case for space
				if (char === " ") return "\\s+";
				// If a special char and previous character was not an escape, escape the result.
				if (Parser.REGEXP_SPECIAL_CHARACTERS[char] && list[index - 1] !== "\\") return "\\" + char;
				// This char should be fine by itself.
				return char;
			}).join("");
		}

		// Create a new regular expression from a "normal" string, escaping special characters as necessary.

	}, {
		key: "RegExpFromString",
		value: function RegExpFromString(string, flags) {
			return new RegExp(Parser.escapeRegExpCharacters(string), flags);
		}
	}]);

	return Parser;
}();

Parser.DEBUG = false;

Parser.REGEXP_SPECIAL_CHARACTERS = function () {
	var chars = {};
	"\\/^$*+?.()|{},[]".split("").forEach(function (char) {
		return chars[char] = true;
	});
	return chars;
}();

exports.default = Parser;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); //	# Parser Rules
//	Rules can be as simple as a string `Keyword` or a complex sequence of (nested) rules.
//
//	Parse a rule with `rule.parse(parser, stream)`, this will either:
//		- return `undefined` if the rule doesn't match the head of the stream, or
//		- return a CLONE of the rule with at least the following:
//			- `stream`		Stream which was matched with `startIndex` at the start of the match
//			- `endIndex`	Non-inclusive end index in stream where match ends.
//
//	The clone returned above can be manipulated with
//		- `rule.results`			Return matched arguments in a format suitable to do:
//		- `rule.toSource(context)`	Return javascript source to interpret the rule.
//


var _Parser = __webpack_require__(1);

var _Parser2 = _interopRequireDefault(_Parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Rule = function () {
	function Rule(properties) {
		_classCallCheck(this, Rule);

		if (this.constructor !== Rule || !this.constructor.prototype.hasOwnProperty("constructor")) {
			//console.warn("not rule", this);
		}
		Object.assign(this, properties);
	}

	// Clone this rule and add any `props` passed in.


	_createClass(Rule, [{
		key: "clone",
		value: function clone() {
			var clone = Object.create(this);

			for (var _len = arguments.length, props = Array(_len), _key = 0; _key < _len; _key++) {
				props[_key] = arguments[_key];
			}

			Object.assign.apply(Object, [clone].concat(props));
			return clone;
		}

		// For a rule instance associated with a stream,
		// return a new stream AFTER this rule's end.

	}, {
		key: "next",
		value: function next() {
			if (!this.stream || this.endIndex === undefined) throw new TypeError("rule.next() called on rule without a stream", this);
			return this.stream.advanceTo(this.endIndex);
		}

		//
		//	Parsing primitives -- you MUST implement these in your subclasses!
		//

		// Attempt to match this rule in the `stream`.
		// Returns results of the parse or `undefined`.

	}, {
		key: "parse",
		value: function parse(parser, stream, stack) {
			return undefined;
		}

		// Is this rule deterministic, eg: can it be quickly and unambiguously satisfied?
		// Returning `true` can speed up sequence processing,
		//	but if you're really not sure, return `undefined`.

	}, {
		key: "isDeterministic",
		value: function isDeterministic(parser, stream) {
			return undefined;
		}

		// Does the parse `stack` already contain `rule`?

	}, {
		key: "toSource",


		// Output value for this INSTANTIATED rule as source.
		value: function toSource(context) {
			return this.matched;
		}

		//
		// ## group: reflection
		//

	}, {
		key: "results",


		//
		// ## output as source
		//

		// "gather" arguments in preparation to call `toSource()`
		// Only callable after parse is completed.
		// NOTE: you may want to memoize the results.
		get: function get() {
			return this;
		}
	}, {
		key: "ruleType",
		get: function get() {
			return this.constructor.name;
		}
	}], [{
		key: "stackContains",
		value: function stackContains(stack, rule, stream) {
			if (stack.length === 0) return false;

			//console.info(stack);
			// go backwards
			for (var i = stack.length - 1; i >= 0; i--) {
				var _stack$i = _slicedToArray(stack[i], 2),
				    nextRule = _stack$i[0],
				    nextStream = _stack$i[1];

				if (nextRule === rule) {
					if (nextStream.startIndex === stream.startIndex) {
						//					console.warn("found unproductive rule ", rule, " on stack", stack);
						return true;
					} else {
						//					console.warn("found productive rule ", rule, " on stack", stack);
						return false;
					}
				}
			}
			return false;
		}
	}]);

	return Rule;
}();

// Regex pattern.
// `rule.pattern` is the regular expression to match.
//
// NOTE	To make this more generally applicable, do NOT start the pattern with a `^`.
//		We'll automatically make a copy of the RegExp with the start point attached
//		and use that as appropriate.
//
//		This way we can re-use the regex to check for a match in the middle of the stream...
//
// You can optionally specify a `rule.blacklist`, a set of matches which will specifically NOT work,
//	eg for `identifier.


exports.default = Rule;
Rule.Pattern = function (_Rule) {
	_inherits(Pattern, _Rule);

	function Pattern(properties) {
		_classCallCheck(this, Pattern);

		// `pattern` is required
		if (!properties.pattern) throw new TypeError("new Rule.Pattern(): You must pass a `pattern` parameter");

		// Create a `startPattern` to match at the beginning of the strong
		// Create non-enumerably.
		var _this = _possibleConstructorReturn(this, (Pattern.__proto__ || Object.getPrototypeOf(Pattern)).call(this, properties));

		Object.defineProperty(_this, "startPattern", { value: new RegExp("^" + _this.pattern.source) });
		return _this;
	}

	// Attempt to match this pattern at the beginning of the stream.


	_createClass(Pattern, [{
		key: "parse",
		value: function parse(parser, stream, stack) {
			var match = stream.match(this.startPattern);
			if (!match) return undefined;

			// bail if present in blacklist
			var matched = match[0];
			if (this.blacklist && this.blacklist[matched]) return undefined;

			return this.clone({
				matched: matched,
				// DEBUG
				startIndex: stream.startIndex,
				endIndex: stream.startIndex + matched.length,
				stream: stream
			});
		}

		// Patterns are ALWAYS deterministic.

	}, {
		key: "isDeterministic",
		value: function isDeterministic(parser, stream) {
			return true;
		}
	}, {
		key: "addToBlacklist",
		value: function addToBlacklist() {
			var _this2 = this;

			if (!this.blacklist) this.blacklist = {};

			for (var _len2 = arguments.length, words = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
				words[_key2] = arguments[_key2];
			}

			words.forEach(function (word) {
				return _this2.blacklist[word] = true;
			});
		}
	}, {
		key: "toString",
		value: function toString() {
			return this.pattern.source;
		}
	}]);

	return Pattern;
}(Rule);

// Rule for literal string value, which include punctuation such as `(` etc.
// `Symbol`s are different from `Keywords` in that they do not require a word boundary.
//TODO: rename `Symbol`???
Rule.Symbol = function (_Rule$Pattern) {
	_inherits(_Symbol, _Rule$Pattern);

	function _Symbol(properties) {
		_classCallCheck(this, _Symbol);

		// `string` is requied.
		if (!properties.string) throw new TypeError("new Rule.Symbol(): Expected string property");

		// convert string to pattern
		if (!properties.pattern) {
			properties.pattern = _Parser2.default.RegExpFromString(properties.string);
			//console.info(properties.string, properties.pattern);
		}

		//		console.info("creating string", properties);
		return _possibleConstructorReturn(this, (_Symbol.__proto__ || Object.getPrototypeOf(_Symbol)).call(this, properties));
	}

	_createClass(_Symbol, [{
		key: "toString",
		value: function toString() {
			return "" + this.string + (this.optional ? '?' : '');
		}
	}]);

	return _Symbol;
}(Rule.Pattern);

// Merge two Symbol rules together, returning a new rule that matches both.
Rule.mergeSymbols = function (first, second) {
	return new Rule.Symbol({ string: first.string + second.string });
};

// Keyword pattern.
// Properties:
//	- `rule.string` 	(required) 	Keyword string to match.
//	- `rule.pattern`	(optional) 	RegExp for the match.
//									We'll create one from `string` if necessary.
//									NOTE: do NOT start the `pattern` with `^`.
Rule.Keyword = function (_Rule$Pattern2) {
	_inherits(Keyword, _Rule$Pattern2);

	function Keyword(properties) {
		_classCallCheck(this, Keyword);

		// `string` is requied.
		if (!properties.string) throw new TypeError("new Rule.Keyword(): Expected string property");

		// derive `pattern` if necessary.
		if (!properties.pattern) {
			// enforce word boundaries and allow arbitrary space between words
			var patternString = _Parser2.default.escapeRegExpCharacters(properties.string);
			properties.pattern = new RegExp("\\b" + patternString + "\\b");
		}
		return _possibleConstructorReturn(this, (Keyword.__proto__ || Object.getPrototypeOf(Keyword)).call(this, properties));
	}

	_createClass(Keyword, [{
		key: "toString",
		value: function toString() {
			return "" + this.string + (this.optional ? '?' : '');
		}
	}]);

	return Keyword;
}(Rule.Pattern);

// Merge two Keyword rules together, adding the second to the first.
Rule.mergeKeywords = function (first, second) {
	return new Rule.Keyword({ string: first.string + " " + second.string });
};

// Subrule -- name of another rule to be called.
// `rule.rule` is the name of the rule in `parser.rules`.
Rule.Subrule = function (_Rule2) {
	_inherits(Subrule, _Rule2);

	function Subrule() {
		_classCallCheck(this, Subrule);

		return _possibleConstructorReturn(this, (Subrule.__proto__ || Object.getPrototypeOf(Subrule)).apply(this, arguments));
	}

	_createClass(Subrule, [{
		key: "parse",
		value: function parse(parser, stream, stack) {
			var rule = parser.getRule(this.rule);
			if (!rule) throw new SyntaxError("Attempting to parse unknown rule '" + this.rule + "'");
			var match = rule.parse(parser, stream, stack);
			if (!match) return undefined;

			if (this.argument) match.argument = this.argument;
			return match;
		}
	}, {
		key: "isDeterministic",
		value: function isDeterministic(parser, stream) {
			var rule = parser.getRule(this.rule);
			if (!rule) return false;
			return rule.isDeterministic(parser, stream);
		}
	}, {
		key: "toString",
		value: function toString() {
			return "{" + (this.argument ? this.argument + ":" : "") + this.rule + "}" + (this.optional ? '?' : '');
		}
	}]);

	return Subrule;
}(Rule);

// Abstract:  `Nested` rule -- composed of a series of other `rules`.
Rule.Nested = function (_Rule3) {
	_inherits(Nested, _Rule3);

	function Nested() {
		_classCallCheck(this, Nested);

		return _possibleConstructorReturn(this, (Nested.__proto__ || Object.getPrototypeOf(Nested)).apply(this, arguments));
	}

	_createClass(Nested, [{
		key: "isDeterministic",


		// Is this deterministic, eg: are our subrules unambigously determinable?
		value: function isDeterministic(parser, stream) {
			return this.rules.every(function (rule) {
				return rule.isDeterministic(parser, stream);
			});
		}
	}]);

	return Nested;
}(Rule);

// Sequence of rules to match (auto-excluding whitespace).
Rule.Sequence = function (_Rule$Nested) {
	_inherits(Sequence, _Rule$Nested);

	function Sequence() {
		_classCallCheck(this, Sequence);

		return _possibleConstructorReturn(this, (Sequence.__proto__ || Object.getPrototypeOf(Sequence)).apply(this, arguments));
	}

	_createClass(Sequence, [{
		key: "parse",
		value: function parse(parser, stream) {
			var stack = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

			if (this.leftRecursive) {
				if (Rule.stackContains(stack, this, stream)) return undefined;
				stack = stack.concat();
				stack.push([this, stream]);
			}

			var matched = [],
			    next = stream;
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = this.rules[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var rule = _step.value;

					next = parser.eatWhitespace(next);
					var match = rule.parse(parser, next, stack);
					if (!match && !rule.optional) return undefined;
					if (match) {
						matched.push(match);
						next = match.next();
					}
				}
				// if we get here, we matched all the rules!
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}

			return this.clone({
				matched: matched,
				// DEBUG
				matchedText: stream.range(stream.startIndex, next.startIndex),
				// DEBUG
				startIndex: stream.startIndex,
				endIndex: next.startIndex,
				stream: stream
			});
		}

		//TODOC
		// "gather" arguments in preparation to call `toSource()`
		// Only callable after parse is completed.
		// Returns an object with properties from the `matched` array indexed by
		//		- `match.argument`:		argument set when rule was declared, eg: `{value:literal}` => `value`
		//		- `match.ruleName`:		name of rule when defined
		//		- `rule type`:				name of the rule type
		// NOTE: memoizes the results.

	}, {
		key: "toString",
		value: function toString() {
			return "" + this.rules.join(" ") + (this.optional ? '?' : '');
		}
	}, {
		key: "results",
		get: function get() {
			if (!this.matched) return undefined;
			if (!this._results) {
				var results = this._results = {};
				var _iteratorNormalCompletion2 = true;
				var _didIteratorError2 = false;
				var _iteratorError2 = undefined;

				try {
					for (var _iterator2 = this.matched[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
						var match = _step2.value;

						var argName = match.argument || match.ruleName || match.constructor.name;

						// If arg already exists, convert to an array
						if (argName in results) {
							if (!Array.isArray(results[argName])) results[argName] = [results[argName]];
							results[argName].push(match);
						} else {
							results[argName] = match;
						}
					}
				} catch (err) {
					_didIteratorError2 = true;
					_iteratorError2 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion2 && _iterator2.return) {
							_iterator2.return();
						}
					} finally {
						if (_didIteratorError2) {
							throw _iteratorError2;
						}
					}
				}
			}
			return this._results;
		}
	}]);

	return Sequence;
}(Rule.Nested);

// Syntactic sugar for debugging
Rule.Expression = function (_Rule$Sequence) {
	_inherits(expression, _Rule$Sequence);

	function expression() {
		_classCallCheck(this, expression);

		return _possibleConstructorReturn(this, (expression.__proto__ || Object.getPrototypeOf(expression)).apply(this, arguments));
	}

	return expression;
}(Rule.Sequence);

// Statements take up the entire line.
Rule.Statement = function (_Rule$Sequence2) {
	_inherits(statement, _Rule$Sequence2);

	function statement() {
		_classCallCheck(this, statement);

		return _possibleConstructorReturn(this, (statement.__proto__ || Object.getPrototypeOf(statement)).apply(this, arguments));
	}

	return statement;
}(Rule.Sequence);

// Alternative syntax, matching one of a number of different rules.
// The result of a parse is the longest rule that actually matched.
// NOTE: Currently takes the longest valid match.
// TODO: match all valid alternatives
// TODO: rename?
Rule.Alternatives = function (_Rule$Nested2) {
	_inherits(Alternatives, _Rule$Nested2);

	function Alternatives(props) {
		_classCallCheck(this, Alternatives);

		var _this10 = _possibleConstructorReturn(this, (Alternatives.__proto__ || Object.getPrototypeOf(Alternatives)).call(this, props));

		if (!_this10.rules) _this10.rules = [];
		return _this10;
	}

	// Find the LONGEST match


	_createClass(Alternatives, [{
		key: "parse",
		value: function parse(parser, stream, stack) {
			//DEBUG
			var matches = [];

			var bestMatch = void 0;
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = this.rules[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var rule = _step3.value;

					var match = rule.parse(parser, stream, stack);
					if (!match) continue;

					// take the longest match
					if (!bestMatch || match.endIndex > bestMatch.endIndex) bestMatch = match;
					// DEBUG
					matches.push(match);
				}

				// DEBUG
				// 		if (matches.length > 1) {
				// 			let stackContents = stack.map(item => item[0]);
				// 			console.group(this.ruleName + " matched "+matches.length+" times:", stackContents);
				// 			matches.forEach(match => console.log("  ", match.toSource()));
				// 			console.groupEnd();
				// 		}
			} catch (err) {
				_didIteratorError3 = true;
				_iteratorError3 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion3 && _iterator3.return) {
						_iterator3.return();
					}
				} finally {
					if (_didIteratorError3) {
						throw _iteratorError3;
					}
				}
			}

			if (!bestMatch) return undefined;

			// assign `argName` or `ruleName` for `results`
			if (this.argument) bestMatch.argument = this.argument;else if (this.ruleName) bestMatch.ruleName = this.ruleName;

			//TODO: other things to copy here???
			return bestMatch;
		}
	}, {
		key: "addRule",
		value: function addRule(rule) {
			this.rules.push(rule);
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			return this.matched.toSource(context);
		}
	}, {
		key: "toString",
		value: function toString() {
			return "(" + (this.argument ? this.argument + ":" : "") + this.rules.join("|") + ")" + (this.optional ? '?' : '');
		}
	}]);

	return Alternatives;
}(Rule.Nested);

// Repeating rule.
//	`this.rule` is the rule that repeats.
//
// After matching:
//	`this.matched` is array of results of matches.
//
//	Automatically consumes whitespace before rules.
//	If doesn't match at least one, returns `undefined`.
Rule.Repeat = function (_Rule$Nested3) {
	_inherits(Repeat, _Rule$Nested3);

	function Repeat() {
		_classCallCheck(this, Repeat);

		return _possibleConstructorReturn(this, (Repeat.__proto__ || Object.getPrototypeOf(Repeat)).apply(this, arguments));
	}

	_createClass(Repeat, [{
		key: "parse",
		value: function parse(parser, stream) {
			var stack = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

			if (this.leftRecursive) {
				if (Rule.stackContains(stack, this, stream)) return undefined;
				stack = stack.concat();
				stack.push([this, stream]);
			}

			var next = stream;
			var matched = [];
			while (true) {
				next = parser.eatWhitespace(next);
				var match = this.rule.parse(parser, next, stack);
				if (!match) break;

				matched.push(match);
				next = match.next();
			}

			if (matched.length === 0) return undefined;

			return this.clone({
				matched: matched,
				// DEBUG
				matchedText: stream.range(stream.startIndex, next.startIndex),
				// DEBUG
				startIndex: stream.startIndex,
				endIndex: next.startIndex,
				stream: stream
			});
		}

		// "gather" arguments in preparation to call `toSource()`
		// Only callable after parse is completed.
		// Returns an array with arguments of all results.
		// NOTE: memoizes the results.

	}, {
		key: "toSource",
		value: function toSource() {
			throw "Don't understand how to source Rule.Repeat!";
		}
	}, {
		key: "toString",
		value: function toString() {
			var rule = this.rule instanceof Rule.Sequence || this.rule instanceof Rule.Keyword && this.rule.string.includes(" ") ? "(" + this.rule + ")" : "" + this.rule;
			return "" + rule + (this.optional ? '*' : '+');
		}
	}, {
		key: "results",
		get: function get() {
			if (!this.matched) return undefined;
			return this._results || (this._results = this.matched.map(function (match) {
				return match.results;
			}));
		}
	}]);

	return Repeat;
}(Rule.Nested);

// List match rule:   `[<item><delimiter>]`. eg" `[{number},]` to match `1,2,3`
//	`rule.item` is the rule for each item,
//	`rule.delimiter` is the delimiter between each item.
// 	`rule.matched` in the output is the list of values.
//
//
// NOTE: we assume that a List rule will NOT repeat (????)
Rule.List = function (_Rule4) {
	_inherits(List, _Rule4);

	function List() {
		_classCallCheck(this, List);

		return _possibleConstructorReturn(this, (List.__proto__ || Object.getPrototypeOf(List)).apply(this, arguments));
	}

	_createClass(List, [{
		key: "parse",
		value: function parse(parser, stream) {
			var stack = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

			if (this.leftRecursive) {
				if (Rule.stackContains(stack, this, stream)) return undefined;
				stack = stack.concat();
				stack.push([this, stream]);
			}

			// ensure item and delimiter are optional so we don't barf in `parseRule`
			this.item.optional = true;
			this.delimiter.optional = true;

			var matched = [],
			    next = stream;
			while (true) {
				next = parser.eatWhitespace(next);
				// get next item, exiting if not found
				var item = this.item.parse(parser, next, stack);
				if (!item) break;
				//console.log(item);
				matched.push(item);
				next = item.next();

				next = parser.eatWhitespace(next);
				// get delimiter, exiting if not found
				var delimiter = this.delimiter.parse(parser, next, stack);
				if (!delimiter) break;
				next = delimiter.next();
			}

			return this.clone({
				matched: matched,
				// DEBUG
				matchedText: stream.range(stream.startIndex, next.startIndex),
				// DEBUG
				startIndex: matched[0] ? matched[0].startIndex : stream.startIndex,
				endIndex: next.startIndex,
				stream: stream
			});
		}

		// Return matched item by index

	}, {
		key: "getItem",
		value: function getItem(index) {
			if (!this.matched) return undefined;
			return this.matched[index];
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			if (!this.matched) return undefined; // TODO: throw???
			var matched = this.matched.map(function (match) {
				return match.toSource(context);
			}).join(", ");
			return "[" + matched + "]";
		}
	}, {
		key: "toString",
		value: function toString() {
			return "[" + (this.argument ? this.argument + ":" : "") + this.item + " " + this.delimiter + "]" + (this.optional ? '?' : '');
		}
	}]);

	return List;
}(Rule);

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _memoize = __webpack_require__(7);

var _Parser = __webpack_require__(1);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(2);

var _Rule2 = _interopRequireDefault(_Rule);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// re-export Rule for testing
exports.default = _Rule2.default;

//
//	# Parsing `ruleSyntax` to create rules automatically.
//
// TODO:	Pull `parseRuleSyntax` stuff out into separate module?
// TODO:	Better name for `ruleSyntax`
// TODO:	Use keywords in syntax to make a quick regex-based `test` function for the entire rule

Object.assign(_Rule2.default, {

	//
	// ## group: parsing syntax
	//

	// TODO: convert to TextStream pattern ala normal parser once that settles down???
	parseRuleSyntax: function parseRuleSyntax(syntax) {
		var SequenceConstructor = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _Rule2.default.Sequence;

		var syntaxStream = _Rule2.default.tokeniseRuleSyntax(syntax);
		var rules = _Rule2.default.parseRuleSyntax_tokens(syntaxStream, []);

		var rule = void 0;
		// If we only got one thing, return that as the result
		if (rules.length === 1) {
			rule = rules[0];
		} else {
			rule = new SequenceConstructor({ rules: rules });
		}

		return rule;
	},
	tokeniseRuleSyntax: function tokeniseRuleSyntax(syntax) {
		var SYNTAX_EXPRESSION = /(?:[\w\-]+|\\[\[\(\{\)\}\]]|[^\s\w]|\|)/g;
		var syntaxStream = syntax.match(SYNTAX_EXPRESSION);
		if (!syntaxStream) throw new SyntaxError("Can't tokenize parse rule syntax >>" + syntax + "<<");
		return syntaxStream;
	},
	parseRuleSyntax_tokens: function parseRuleSyntax_tokens(syntaxStream, rules) {
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

		var lastIndex = syntaxStream.length;
		while (startIndex < lastIndex) {
			var _Rule$parseRuleSyntax = _Rule2.default.parseRuleSyntax_token(syntaxStream, rules, startIndex),
			    _Rule$parseRuleSyntax2 = _slicedToArray(_Rule$parseRuleSyntax, 2),
			    rule = _Rule$parseRuleSyntax2[0],
			    endIndex = _Rule$parseRuleSyntax2[1];

			if (rule) {
				var last = rules[rules.length - 1];
				// If this is a `String` and last was a `String`, merge together
				if (last && last instanceof _Rule2.default.Symbol && rule instanceof _Rule2.default.Symbol) {
					// remove the last rule
					rules.pop();
					// and replace with a rule that merges the keywords
					rule = _Rule2.default.mergeSymbols(last, rule);
				}
				// If this is a `Keyword` and last was also a `Keyword`, merge together
				else if (last && last instanceof _Rule2.default.Keyword && rule instanceof _Rule2.default.Keyword) {
						// remove the last rule
						rules.pop();
						// and replace with a rule that merges the keywords
						rule = _Rule2.default.mergeKeywords(last, rule);
					}
				rules.push(rule);
			}
			startIndex = endIndex + 1;
		}
		return rules;
	},
	parseRuleSyntax_token: function parseRuleSyntax_token(syntaxStream, rules) {
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

		var syntaxToken = syntaxStream[startIndex];

		// if we got a "\\" (which also has to go into the source string as "\\")
		// treat the next token as a literal string rather than as a special character.
		if (syntaxToken === "\\") {
			return _Rule2.default.parseRuleSyntax_string(syntaxStream, rules, startIndex + 1);
		}

		switch (syntaxToken) {
			case "{":
				return _Rule2.default.parseRuleSyntax_subrule(syntaxStream, rules, startIndex);
			case "(":
				return _Rule2.default.parseRuleSyntax_parentheses(syntaxStream, rules, startIndex);
			case "[":
				return _Rule2.default.parseRuleSyntax_list(syntaxStream, rules, startIndex);
			case "*":
			case "+":
			case "?":
				return _Rule2.default.parseRuleSyntax_repeat(syntaxStream, rules, startIndex);

			// the following should ALWAYS be consumed by the above
			case "}":
			case ")":
			case "]":
			case "|":
				throw new SyntaxError("Unexpected " + syntaxToken + " found as item " + startIndex + " of " + this.syntax);

			default:
				return _Rule2.default.parseRuleSyntax_string(syntaxStream, rules, startIndex);
		}
	},


	// Match `keyword` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_string: function parseRuleSyntax_string(syntaxStream, rules, startIndex) {
		var string = syntaxStream[startIndex],
		    rule;
		// If letters only, match as a Keyword (so we require a word boundary after the string).
		if (string.match(/[A-Za-z]+/)) {
			rule = new _Rule2.default.Keyword({ string: string });
		}
		// Otherwise match as a String, which doesn't require non-word chars after the text.
		else {
				rule = new _Rule2.default.Symbol({ string: string });
				// If string starts with `\\`, it's an escaped literal (eg: `\[` needs to input as `\\[`).
				if (string.startsWith("\\")) {
					// remove leading slash in match string...
					rule.string = rule.string.substr(1);
					// but leave it in toString
					rule.toString = function () {
						return string;
					};
				}
			}
		return [rule, startIndex];
	},


	// Match grouping expression `(...|...)` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	// NOTE: nested parens may not have alternatives... :-(   `(a|(b|c))` won't work???
	parseRuleSyntax_parentheses: function parseRuleSyntax_parentheses(syntaxStream, rules, startIndex) {
		var _Parser$findNestedTok = _Parser2.default.findNestedTokens(syntaxStream, "(", ")", startIndex),
		    endIndex = _Parser$findNestedTok.endIndex,
		    slice = _Parser$findNestedTok.slice;

		// pull out explicit argument name


		var argument = void 0;
		if (slice.length > 2 && slice[1] === ":") {
			argument = slice[0];
			slice = slice.slice(2);
		}

		// split into groups, including nested parens
		var alternatives = groupAlternatives(slice).map(function (group) {
			var results = _Rule2.default.parseRuleSyntax_tokens(group, []);
			if (results.length === 1) {
				return results[0];
			} else {
				return new _Rule2.default.Sequence({ rules: results });
			}
		});

		var rule = alternatives.length === 1 ? alternatives[0] : new _Rule2.default.Alternatives({ rules: alternatives });
		if (argument) rule.argument = argument;
		return [rule, endIndex];

		function groupAlternatives(tokens) {
			var alternatives = [];
			var current = [];
			for (var i = 0, token; token = tokens[i]; i++) {
				// handle alternate marker
				if (token === "|") {
					alternatives.push(current);
					current = [];
				}
				// handle nested parens
				else if (token === "(") {
						var _Parser$findNestedTok2 = _Parser2.default.findNestedTokens(tokens, "(", ")", i),
						    _endIndex = _Parser$findNestedTok2.endIndex;

						current = current.concat(tokens.slice(i, _endIndex + 1));
						i = _endIndex;
					} else {
						current.push(token);
					}
			}
			if (current.length) alternatives.push(current);
			return alternatives;
		}
	},


	// Match repeat indicator `?`, `+` or `*` by attaching it to the previous rule.
	parseRuleSyntax_repeat: function parseRuleSyntax_repeat(syntaxStream, rules, startIndex) {
		var symbol = syntaxStream[startIndex];
		var rule = rules[rules.length - 1];
		if (!rule) throw new SyntaxError("Can't attach repeat symbol " + symbol + " to empty rule!");

		// Transform last rule into a repeat for `*` and `+`.
		if (symbol === "*" || symbol === "+") {
			var argument = rule.argument;
			rule = new _Rule2.default.Repeat({ rule: rule });
			if (argument) rule.argument = argument;
			// push into rule stack in place of old rule
			rules[rules.length - 1] = rule;
		}

		// Rule is optional for `?` and `*`.
		if (symbol === "?" || symbol === "*") {
			rule.optional = true;
		}

		return [undefined, startIndex];
	},


	// Match `{<ruleName>}` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_subrule: function parseRuleSyntax_subrule(syntaxStream, rules, startIndex) {
		var match = _Parser2.default.findNestedTokens(syntaxStream, "{", "}", startIndex);
		var argument = void 0;
		if (match.slice.length === 3 && match.slice[1] === ":") {
			argument = match.slice[0];
			match.slice = match.slice.slice(2);
		}
		if (match.slice.length > 1) throw new SyntaxError("Can't process rules with more than one rule name: {" + match.slice.join("") + "}");

		var params = { rule: match.slice[0] };

		// see if there's a `not` rule in there
		var bangPosition = params.rule.indexOf("!");
		if (bangPosition !== -1) {
			params.not = params.rule.substr(bangPosition + 1); //[ params.rule.substr(bangPosition + 1) ];
			params.rule = params.rule.substr(0, bangPosition);
		}

		var rule = new _Rule2.default.Subrule(params);
		if (argument) rule.argument = argument;
		return [rule, match.endIndex];
	},


	// Match list expression `[<item><delimiter>]` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_list: function parseRuleSyntax_list(syntaxStream, rules, startIndex) {
		var _Parser$findNestedTok3 = _Parser2.default.findNestedTokens(syntaxStream, "[", "]", startIndex),
		    endIndex = _Parser$findNestedTok3.endIndex,
		    slice = _Parser$findNestedTok3.slice;

		var argument = void 0;
		if (slice.length > 2 && slice[1] === ":") {
			argument = slice[0];
			slice = slice.slice(2);
		}

		var results = _Rule2.default.parseRuleSyntax_tokens(slice, []);
		if (results.length !== 2) {
			throw new SyntaxError("Unexpected stuff at end of list: [" + slice.join(" ") + "]");
		}
		var rule = new _Rule2.default.List();
		rule.item = results[0];
		rule.delimiter = results[1];
		if (argument) rule.argument = argument;
		return [rule, endIndex];
	}
});

// ##  Add methods to Parser to define rules using the above syntax.
Object.defineProperties(_Parser2.default.prototype, {

	// Parse a `ruleSyntax` rule and add it to our list of rules.
	// Returns the new rule.
	// Logs parsing errors but allows things to continue.
	addSyntax: { value: function value(name, ruleSyntax, properties) {
			var constructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.Sequence;

			// If we only got 3 args, and 2nd is a function, use it as constructor instead
			if (properties instanceof Function) {
				constructor = properties;
				properties = undefined;
			}
			try {
				var rule = _Rule2.default.parseRuleSyntax(ruleSyntax, constructor);
				// Reflect the rule back out to make sure it looks (more or less) the same
				if (_Parser2.default.debug) console.log("Added rule '" + name + "':\n  INPUT: " + ruleSyntax + " \n OUTPUT: " + rule);

				if (properties) Object.assign(rule, properties);
				return this.addRule(name, rule);
			} catch (e) {
				console.group("Error parsing syntax for rule '" + name + "':");
				console.log("syntax: " + ruleSyntax);
				console.error(e);
			}
		} },

	addStatement: { value: function value(name, ruleSyntax, properties) {
			var constructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.Statement;

			var rule = this.addSyntax(name, ruleSyntax, properties, constructor);
			if (rule) return this.addRule("statement", rule);
		} },

	addExpression: { value: function value(name, ruleSyntax, properties) {
			var constructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.Expression;

			var rule = this.addSyntax(name, ruleSyntax, properties, constructor);
			if (rule) return this.addRule("expression", rule);
		} },

	// Add infix operator, such as "a or b".
	// NOTE: if you have more than one matching operator,
	//		 pass in an array of simple strings so all of our operators are simple strings.
	addInfixOperator: { value: function value(name, ruleSyntax, properties) {
			var _this = this;

			if (Array.isArray(ruleSyntax)) {
				return ruleSyntax.forEach(function (syntax) {
					return _this.addInfixOperator(name, syntax, properties);
				});
			}

			var rule = this.addSyntax(name, ruleSyntax, properties);
			if (rule) {
				if (!rule.toJS) {
					throw new TypeError("Expected infix operator rule '" + name + "' to specify 'toJS' function");
				}
				// clear list of infix operators for getter below
				delete this.__infixOperators;
				return this.addRule("infix_operator", rule);
			}
		} },

	// List of infix operators as strings.
	// Re-memoized after `addInfixOperator` above.
	infixOperators: (0, _memoize.defineMemoized)("__infixOperators", function () {
		return this.rules["infix_operator"] && this.rules["infix_operator"].rules.map(function (rule) {
			return rule.string;
		});
	}),

	// Add postfix operator, such as "a is defined"
	// NOTE: if you have more than one matching operator,
	//		 pass in an array of simple strings so all of our operators are simple strings.
	addPostfixOperator: { value: function value(name, ruleSyntax, properties) {
			var _this2 = this;

			if (Array.isArray(ruleSyntax)) {
				return ruleSyntax.forEach(function (syntax) {
					return _this2.addPostfixOperator(name, syntax, properties);
				});
			}

			var rule = this.addSyntax(name, ruleSyntax, properties);
			if (rule) {
				if (!rule.toJS) {
					throw new TypeError("Expected postfix operator rule '" + name + "' to specify 'toJS' function");
				}
				// clear list of infix operators for getter below
				delete this.__postfixOperators;
				return this.addRule("postfix_operator", rule);
			}
		} },

	// List of postfix operators as strings.
	// Re-memoized after `addInfixOperator` above.
	postfixOperators: (0, _memoize.defineMemoized)("__posfixOperators", function () {
		return this.rules["postfix_operator"] && this.rules["postfix_operator"].rules.map(function (rule) {
			return rule.string;
		});
	})
});

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _RuleSyntax = __webpack_require__(3);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Core `rules` -- simple datatypes, etc.
//
// NOTE: many of the below are created as custom Pattern subclasses for debugging.
//


// re-export parser for testing.
exports.default = _parser2.default;

// `whitespace` rule.
// NOTE `parser.parse("whitespace", "   ")` will return `undefined`
//		 because `parser.parse()` automatically eats whitespace at the start of a rule.

_RuleSyntax2.default.Whitespace = function (_Rule$Pattern) {
	_inherits(whitespace, _Rule$Pattern);

	function whitespace() {
		_classCallCheck(this, whitespace);

		return _possibleConstructorReturn(this, (whitespace.__proto__ || Object.getPrototypeOf(whitespace)).apply(this, arguments));
	}

	return whitespace;
}(_RuleSyntax2.default.Pattern);
_parser2.default.addRule("whitespace", new _RuleSyntax2.default.Whitespace({ pattern: /\s+/, optional: true }));

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
_RuleSyntax2.default.Identifier = function (_Rule$Pattern2) {
	_inherits(identifier, _Rule$Pattern2);

	function identifier() {
		_classCallCheck(this, identifier);

		return _possibleConstructorReturn(this, (identifier.__proto__ || Object.getPrototypeOf(identifier)).apply(this, arguments));
	}

	return identifier;
}(_RuleSyntax2.default.Pattern);
var identifier = _parser2.default.addRule("identifier", new _RuleSyntax2.default.Identifier({
	pattern: /[a-z][\w\-]*/,
	// Convert "-" to "_" in source output.
	toSource: function toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));
_parser2.default.addRule("expression", identifier);

// Add English prepositions to identifier blacklist.
//
// Wikipedia "Preposition":
//	"Prepositions...are a class of words that
//	express spatial or temporal relations  (in, under, towards, before)
//	or mark various semantic roles (of, for).
// TESTME
_parser2.default.rules.identifier.addToBlacklist("about", "above", "after", "and", "as", "at", "before", "behind", "below", "beneath", "beside", "between", "beyond", "by", "defined", "down", "during", "each", "empty", "exactly", "except", "for", "from", "greater", "in", "into", "less", "long", "minus", "more", "near", "not", "of", "off", "on", "onto", "opposite", "out", "outside", "over", "short", "since", "than", "the", "then", "through", "thru", "to", "toward", "towards", "undefined", "under", "underneath", "unique", "until", "up", "upon", "upside", "versus", "vs", "with", "within", "without");

// Add common english verbs to identifier blacklist.
_parser2.default.rules.identifier.addToBlacklist("are", "do", "does", "contains", "has", "have", "is", "repeat", "was", "were");

// Add special control keywords to identifier blacklist.
_parser2.default.rules.identifier.addToBlacklist("else", "if", "otherwise", "while");

// `Type` = type name.
// MUST start with an upper-case letter (?)
_RuleSyntax2.default.Type = function (_Rule$Pattern3) {
	_inherits(type, _Rule$Pattern3);

	function type() {
		_classCallCheck(this, type);

		return _possibleConstructorReturn(this, (type.__proto__ || Object.getPrototypeOf(type)).apply(this, arguments));
	}

	return type;
}(_RuleSyntax2.default.Pattern);
var type = _parser2.default.addRule("type", new _RuleSyntax2.default.Type({
	pattern: /[A-Z][\w\-]*/,
	// Convert "-" to "_" in source output.
	toSource: function toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));
_parser2.default.addRule("expression", type);

// `number` as either float or integer, created with custom constructor for debugging.
_RuleSyntax2.default.Number = function (_Rule$Pattern4) {
	_inherits(number, _Rule$Pattern4);

	function number() {
		_classCallCheck(this, number);

		return _possibleConstructorReturn(this, (number.__proto__ || Object.getPrototypeOf(number)).apply(this, arguments));
	}

	return number;
}(_RuleSyntax2.default.Pattern);
var number = _parser2.default.addRule("number", new _RuleSyntax2.default.Number({
	pattern: /-?([0-9]*[.])?[0-9]+/,
	// Convert to number on source output.
	toSource: function toSource(context) {
		return parseFloat(this.matched, 10);
	}
}));
_parser2.default.addRule("expression", number);

// Numeric `integer` only, created with custom constructor for debugging.
// NOTE: this WILL match a float, but the returned value will coerce to an integer.
// REVIEW: is this right?  Better to not match a float?
_RuleSyntax2.default.Integer = function (_Rule$Pattern5) {
	_inherits(integer, _Rule$Pattern5);

	function integer() {
		_classCallCheck(this, integer);

		return _possibleConstructorReturn(this, (integer.__proto__ || Object.getPrototypeOf(integer)).apply(this, arguments));
	}

	return integer;
}(_RuleSyntax2.default.Pattern);
_parser2.default.addRule("integer", new _RuleSyntax2.default.Integer({
	pattern: /-?([0-9]*[.])?[0-9]+/,
	// Convert to integer on source output.
	toSource: function toSource(context) {
		return parseInt(this.matched, 10);
	}
}));

// Literal `text` string, created with custom constructor for debugging.
// You can use either single or double quotes on the outside (although double quotes are preferred).
// Returned value has enclosing quotes.
// TODO: escaped quotes inside string
_RuleSyntax2.default.Text = function (_Rule$Pattern6) {
	_inherits(text, _Rule$Pattern6);

	function text() {
		_classCallCheck(this, text);

		return _possibleConstructorReturn(this, (text.__proto__ || Object.getPrototypeOf(text)).apply(this, arguments));
	}

	return text;
}(_RuleSyntax2.default.Pattern);
var text = _parser2.default.addRule("text", new _RuleSyntax2.default.Text({
	pattern: /(?:"[^"]*"|'[^']*')/
}));
_parser2.default.addRule("expression", text);

// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
_RuleSyntax2.default.Boolean = function (_Rule$Pattern7) {
	_inherits(boolean, _Rule$Pattern7);

	function boolean() {
		_classCallCheck(this, boolean);

		return _possibleConstructorReturn(this, (boolean.__proto__ || Object.getPrototypeOf(boolean)).apply(this, arguments));
	}

	return boolean;
}(_RuleSyntax2.default.Pattern);
var bool = _parser2.default.addRule("boolean", new _RuleSyntax2.default.Boolean({
	pattern: /(true|false|yes|no|ok|cancel)\b/,
	toSource: function toSource(context) {
		switch (this.matched) {
			case "true":
			case "yes":
			case "ok":
				return true;
			default:
				return false;
		}
	}
}));
_parser2.default.addRule("expression", bool);
// Add boolean tokens to identifier blacklist.
// TESTME
_parser2.default.rules.identifier.addToBlacklist("true", "false", "yes", "no", "ok", "cancel");

// Literal list (array), eg:  `[1,2,true,false ]`
var list = _parser2.default.addExpression("literal_list", "\\[[list:{expression},]?\\]", function (_Rule$Expression) {
	_inherits(literal_list, _Rule$Expression);

	function literal_list() {
		_classCallCheck(this, literal_list);

		return _possibleConstructorReturn(this, (literal_list.__proto__ || Object.getPrototypeOf(literal_list)).apply(this, arguments));
	}

	_createClass(literal_list, [{
		key: "toSource",


		// return just the list as our source
		value: function toSource(context) {
			return this.results.toSource(context);
		}
	}, {
		key: "results",


		//TODO: squirrely...
		// When gathering arguments, return just the matched list data, ignoring the brackets.
		get: function get() {
			return this.matched[1];
		}
	}]);

	return literal_list;
}(_RuleSyntax2.default.Expression));

// Parenthesized expression
//TESTME
_parser2.default.addExpression("parenthesized_expression", "\\({expression}\\)", function (_Rule$Expression2) {
	_inherits(parenthesized_expression, _Rule$Expression2);

	function parenthesized_expression() {
		_classCallCheck(this, parenthesized_expression);

		return _possibleConstructorReturn(this, (parenthesized_expression.__proto__ || Object.getPrototypeOf(parenthesized_expression)).apply(this, arguments));
	}

	_createClass(parenthesized_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var expression = this.results.toSource(context);
			// don't double parens if not necessary
			if (typeof expression === "string" && expression.startsWith("(") && expression.endsWith(")")) return expression;
			return "(" + expression + ")";
		}
	}, {
		key: "results",
		get: function get() {
			return this.matched[1];
		}
	}]);

	return parenthesized_expression;
}(_RuleSyntax2.default.Expression));

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// TODO: convert to line-aware stream???
var TextStream = function () {
	// You can construct with a text string or a set of properties (including `text`).
	function TextStream() {
		var _this = this;

		_classCallCheck(this, TextStream);

		for (var _len = arguments.length, textOrProps = Array(_len), _key = 0; _key < _len; _key++) {
			textOrProps[_key] = arguments[_key];
		}

		textOrProps.forEach(function (arg) {
			if (typeof arg === "string") {
				_this.text = arg;
			} else if (arg) {
				Object.assign(_this, arg);
			}
		});

		// Make sure `text` and `startIndex` are defined.
		if (!("text" in this)) this.text = "";
		if (!("startIndex" in this)) this.startIndex = 0;
	}

	// Return an immutable clone of the stream.


	_createClass(TextStream, [{
		key: "clone",
		value: function clone(props) {
			return new TextStream(this, props);
		}

		// Return a clone of the stream, advanced to new startIndex.

	}, {
		key: "advanceTo",
		value: function advanceTo(startIndex) {
			return this.clone({ startIndex: startIndex });
		}

		// Return a clone of the stream, advancing startIndex BY `length`

	}, {
		key: "advanceBy",
		value: function advanceBy(length) {
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

	}, {
		key: "match",
		value: function match(pattern) {
			if (!(pattern instanceof RegExp)) throw new TypeError("TextStream.match(" + pattern + "): expected RegExp");
			//TODO: use `stream.range` to ensure match is not not beyond `string.endIndex`
			return this.head.match(pattern) || undefined;
		}

		// Does this stream INCLUDE a regex within it?
		// Returns `true` or `false`.
		// NOTE: Pattern must NOT start with `^` for this to match in the middle of the stream.

	}, {
		key: "test",
		value: function test(pattern) {
			return pattern.test(this.head);
		}

		//
		// ## Reflection
		//
		// Return text of string starting at our `startIndex`

	}, {
		key: "range",


		// Return a range of the string from `startIndex` to `endIndex` NON-inclusive.
		value: function range() {
			var startIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.startIndex;
			var endIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.endIndex || this.text.length;

			return this.text.substring(startIndex, endIndex);
		}

		// Length of the stream.

	}, {
		key: "toString",
		value: function toString() {
			return this.text;
		}
	}, {
		key: "head",
		get: function get() {
			return this.range();
		}
	}, {
		key: "length",
		get: function get() {
			return this.text.length;
		}

		// Are we at the end of the stream?

	}, {
		key: "isEmpty",
		get: function get() {
			return this.startIndex === this.length;
		}
	}]);

	return TextStream;
}();

exports.default = TextStream;

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(4);

__webpack_require__(10);

__webpack_require__(11);

__webpack_require__(14);

__webpack_require__(8);

__webpack_require__(9);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _parser2.default;

// load standard rules files here

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.memoized = memoized;
exports.defineMemoized = defineMemoized;
// Memoize/forget semantics.

// Return a memoizing getter function.
// TESTME
function memoized(property, getter) {
	return function () {
		if (this[property] === undefined) {
			var value = getter.apply(this);
			if (value !== undefined) {
				// Define so that we can be deleted and re-defined, but not set or enumerated.
				Object.defineProperty(this, property, { value: value, configurable: true });
			}
		}
		return this[property];
	};
}

// Return a memoize function for use as a getter in a `Object.defineProperty()`
// TESTME
function defineMemoized(property, getter) {
	return {
		get: memoized(property, getter)
	};
}

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _RuleSyntax = __webpack_require__(3);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(4);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for creating variables, property access, etc
//

// re-export parser for testing.
exports.default = _parser2.default;

// TODO: {property-expression} also works... {assignable-expression} ???

_parser2.default.addStatement("assignment", "{identifier} = {expression}", function (_Rule$Statement) {
	_inherits(assignment, _Rule$Statement);

	function assignment() {
		_classCallCheck(this, assignment);

		return _possibleConstructorReturn(this, (assignment.__proto__ || Object.getPrototypeOf(assignment)).apply(this, arguments));
	}

	_createClass(assignment, [{
		key: "toSource",
		value: function toSource(context) {
			var _results = this.results,
			    identifier = _results.identifier,
			    expression = _results.expression;
			// TODO: declare identifier if not in scope, etc

			return identifier.toSource(context) + " = " + expression.toSource(context);
		}
	}]);

	return assignment;
}(_RuleSyntax2.default.Statement));

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _RuleSyntax = __webpack_require__(3);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for defining classes (known as `types`)
//


// re-export parser for testing.
exports.default = _parser2.default;


_parser2.default.addExpression("property_expression", "(properties:the {identifier} of)+ the? {expression}", function (_Rule$Expression) {
	_inherits(property_expression, _Rule$Expression);

	function property_expression() {
		_classCallCheck(this, property_expression);

		return _possibleConstructorReturn(this, (property_expression.__proto__ || Object.getPrototypeOf(property_expression)).apply(this, arguments));
	}

	_createClass(property_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _results = this.results,
			    expression = _results.expression,
			    properties = _results.properties;

			expression = expression.toSource(context);
			properties = properties.results.reverse().map(function (property) {
				return property.identifier.toSource(context);
			}).join("', '");
			return "spell.get(" + expression + ", ['" + properties + "'])";
		}
	}]);

	return property_expression;
}(_RuleSyntax2.default.Expression));

_parser2.default.addSyntax("scope_modifier", "(scope:global|constant|shared|local)");

_parser2.default.addStatement("declare_property", "{scope_modifier}? {assignment}", {
	toSource: function toSource(context) {
		var _results2 = this.results,
		    assignment = _results2.assignment,
		    scope_modifier = _results2.scope_modifier;

		assignment = assignment.toSource(context);
		var scope = scope && scope.toSource(context);
		switch (scope) {
			case "global":
				return "global." + assignment;

			case "constant":
				return "const " + assignment;

			case "shared":
				return "static " + assignment;

			case "local":
			default:
				return assignment;
		}
	}
});

// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
_parser2.default.addStatement("declare_property_as_one_of", "{scope_modifier}? {identifier} as one of {list:literal_list}", {
	toSource: function toSource(context) {
		var _results3 = this.results,
		    scope_modifier = _results3.scope_modifier,
		    identifier = _results3.identifier,
		    list = _results3.list;
		//TODO: not handling scope_modifier

		identifier = identifier.toSource(context);
		var plural = (identifier + "_VALUES").toUpperCase();
		var values = list.toSource(context);
		//TODO: list.getItem(0)
		var first = list.results.matched[0];
		var firstValue = first ? first.toSource(context) : "undefined";
		return "static " + plural + " = " + values + ";\n" + ("get " + identifier + " { return (\"__" + identifier + "\" in this ? this.__" + identifier + " : " + firstValue + ") }\n") + ("set " + identifier + "(value) { if (this.constructor." + plural + ".includes(value)) this.__" + identifier + " = value }\n");
	}
});

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Rule = __webpack_require__(2);

var _Rule2 = _interopRequireDefault(_Rule);

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for dealing with numbers
//


// re-export parser for testing.
exports.default = _parser2.default;

// TODO: if `identifier` is "word", output `getWord()` etc

var index_expression = function (_Rule$Expression) {
	_inherits(index_expression, _Rule$Expression);

	function index_expression() {
		_classCallCheck(this, index_expression);

		return _possibleConstructorReturn(this, (index_expression.__proto__ || Object.getPrototypeOf(index_expression)).apply(this, arguments));
	}

	_createClass(index_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _results = this.results,
			    identifier = _results.identifier,
			    number = _results.number,
			    expression = _results.expression;

			expression = expression.toSource(context);
			number = number.toSource(context);
			return "spell.getItem(" + expression + ", " + number + ")";
		}
	}]);

	return index_expression;
}(_Rule2.default.Expression);

// Numeric index in a list-like thing:
//	- `item 1 of ...`
//	- `item #2 of ...`
// NOTE: these indices are ONE based, NOT zero based as is Javascript.


_parser2.default.addExpression("index_expression", "{identifier} (#)?{number:integer} of {expression}", index_expression);

_parser2.default.addSyntax("ordinal", "first", { toSource: function toSource() {
		return 1;
	} });
_parser2.default.addSyntax("ordinal", "second", { toSource: function toSource() {
		return 2;
	} });
_parser2.default.addSyntax("ordinal", "third", { toSource: function toSource() {
		return 3;
	} });
_parser2.default.addSyntax("ordinal", "fourth", { toSource: function toSource() {
		return 4;
	} });
_parser2.default.addSyntax("ordinal", "fifth", { toSource: function toSource() {
		return 5;
	} });
_parser2.default.addSyntax("ordinal", "sixth", { toSource: function toSource() {
		return 6;
	} });
_parser2.default.addSyntax("ordinal", "seventh", { toSource: function toSource() {
		return 7;
	} });
_parser2.default.addSyntax("ordinal", "eighth", { toSource: function toSource() {
		return 8;
	} });
_parser2.default.addSyntax("ordinal", "ninth", { toSource: function toSource() {
		return 9;
	} });
_parser2.default.addSyntax("ordinal", "tenth", { toSource: function toSource() {
		return 10;
	} });
_parser2.default.addSyntax("ordinal", "penultimate", { toSource: function toSource() {
		return -2;
	} });
_parser2.default.addSyntax("ordinal", "final", { toSource: function toSource() {
		return -1;
	} });
_parser2.default.addSyntax("ordinal", "last", { toSource: function toSource() {
		return -1;
	} });

// TODO: sixty-fifth, two hundred forty ninth...

// Alternative form for numeric index in a list-like thing.
// NOTE: don't add as an expression since we're auto-merged with `index_expression` above.
_parser2.default.addExpression("index_expression", "the {number:ordinal} {identifier} of {expression}", index_expression);

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _RuleSyntax = __webpack_require__(3);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(4);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for infix and prefix operators.
//

// re-export parser for testing.
exports.default = _parser2.default;

//## Infix operators:   `{lhs} <operator> {rhs}`, eg: `a is 1`
// NOTE: `operator.toJS` MUST return a function which transforms two arguments (`lhs` and `rhs`) into output.

_parser2.default.addInfixOperator("and", "and", {
	toJS: function toJS(a, b) {
		return "(" + a + " && " + b + ")";
	}
});
_parser2.default.addInfixOperator("or", "or", {
	toJS: function toJS(a, b) {
		return "(" + a + " || " + b + ")";
	}
});

_parser2.default.addInfixOperator("is", "is", {
	toJS: function toJS(a, b) {
		return "(" + a + " == " + b + ")";
	}
});
_parser2.default.addInfixOperator("is_not", "is not", {
	toJS: function toJS(a, b) {
		return "(" + a + " != " + b + ")";
	}
});

_parser2.default.addInfixOperator("is_exactly", "is exactly", {
	toJS: function toJS(a, b) {
		return "(" + a + " === " + b + ")";
	}
});
_parser2.default.addInfixOperator("is_not_exactly", "is not exactly", {
	toJS: function toJS(a, b) {
		return "(" + a + " !== " + b + ")";
	}
});

//TODO: `spell.isOfType(thing, type)`
//TODO: `is same type as` ?
_parser2.default.addInfixOperator("is_type_of", ["is a", "is an"], {
	toJS: function toJS(thing, type) {
		return "spell.isOfType(" + thing + ", '" + type + "')";
	}
});
_parser2.default.addInfixOperator("is_not_type_of", ["is not a", "is not an"], {
	toJS: function toJS(thing, type) {
		return "!spell.isOfType(" + thing + ", '" + type + "')";
	}
});

//TODO: `spell.contains(collection, thing)`
_parser2.default.addInfixOperator("is_in", ["is in", "is one of"], {
	toJS: function toJS(thing, list) {
		return "spell.contains(" + list + ", " + thing + ")";
	}
});
_parser2.default.addInfixOperator("is_not_in", ["is not in", "is not one of"], {
	toJS: function toJS(thing, list) {
		return "!spell.contains(" + list + ", " + thing + ")";
	}
});
//TESTME
_parser2.default.addInfixOperator("includes", ["includes", "contains"], {
	toJS: function toJS(list, thing) {
		return "spell.contains(" + list + ", " + thing + ")";
	}
});
_parser2.default.addInfixOperator("doesnt_include", ["does not include", "doesnt include", "does not contain", "doesnt contain"], {
	toJS: function toJS(list, thing) {
		return "!spell.contains(" + list + ", " + thing + ")";
	}
});

_parser2.default.addInfixOperator("gt", [">", "is greater than"], {
	toJS: function toJS(a, b) {
		return "(" + a + " > " + b + ")";
	}
});
_parser2.default.addInfixOperator("gte", [">=", "is greater than or equal to"], {
	toJS: function toJS(a, b) {
		return "(" + a + " >= " + b + ")";
	}
});
_parser2.default.addInfixOperator("lt", ["<", "is less than"], {
	toJS: function toJS(a, b) {
		return "(" + a + " < " + b + ")";
	}
});
_parser2.default.addInfixOperator("lte", ["<=", "is less than or equal to"], {
	toJS: function toJS(a, b) {
		return "(" + a + " <= " + b + ")";
	}
});

//TODO:  can't add `+` as a rule, fix this then add these
//TODO:  operator precedence???
//TESTME
_parser2.default.addInfixOperator("plus", ["\\+", "plus"], {
	toJS: function toJS(a, b) {
		return a + " + " + b;
	}
});
_parser2.default.addInfixOperator("minus", ["-", "minus"], {
	toJS: function toJS(a, b) {
		return a + " - " + b;
	}
});
_parser2.default.addInfixOperator("times", ["\\*", "times"], {
	toJS: function toJS(a, b) {
		return a + " * " + b;
	}
});
_parser2.default.addInfixOperator("divided_by", ["/", "divided by"], {
	toJS: function toJS(a, b) {
		return a + " / " + b;
	}
});

//TODO:  `+=` etc?  other math functions?

_parser2.default.addExpression("infix_operator_expression", "{lhs:expression} {operator:infix_operator} {rhs:expression}", function (_Rule$Expression) {
	_inherits(infix_operator_expression, _Rule$Expression);

	function infix_operator_expression() {
		_classCallCheck(this, infix_operator_expression);

		return _possibleConstructorReturn(this, (infix_operator_expression.__proto__ || Object.getPrototypeOf(infix_operator_expression)).apply(this, arguments));
	}

	_createClass(infix_operator_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _results = this.results,
			    lhs = _results.lhs,
			    rhs = _results.rhs,
			    operator = _results.operator;

			return operator.toJS(lhs.toSource(context), rhs.toSource(context));
		}
	}]);

	return infix_operator_expression;
}(_RuleSyntax2.default.Expression));

//## Postifx operators:   `{lhs} <operator>`, e.g. `a is defined`
// NOTE: `operator.toJS` MUST return a function which transforms argument (`lhs`) into JS output.

_parser2.default.addPostfixOperator("is_defined", "is defined", {
	toJS: function toJS(thing) {
		return "(typeof " + thing + " !== 'undefined')";
	}
});
_parser2.default.addPostfixOperator("is_not_defined", ["is not defined", "is undefined"], {
	toJS: function toJS(thing) {
		return "(typeof " + thing + " === 'undefined')";
	}
});

//TODO: `spell.isEmpty(thing)`
_parser2.default.addPostfixOperator("is_empty", "is empty", {
	toJS: function toJS(thing) {
		return "spell.isEmpty(" + thing + ")";
	}
});
_parser2.default.addPostfixOperator("is_not_empty", "is not empty", {
	toJS: function toJS(thing) {
		return "!spell.isEmpty(" + thing + ")";
	}
});

_parser2.default.addExpression("postfix_operator_expression", "{expression} {operator:postfix_operator}", function (_Rule$Expression2) {
	_inherits(postfix_operator_expresion, _Rule$Expression2);

	function postfix_operator_expresion() {
		_classCallCheck(this, postfix_operator_expresion);

		return _possibleConstructorReturn(this, (postfix_operator_expresion.__proto__ || Object.getPrototypeOf(postfix_operator_expresion)).apply(this, arguments));
	}

	_createClass(postfix_operator_expresion, [{
		key: "toSource",
		value: function toSource(context) {
			var _results2 = this.results,
			    expression = _results2.expression,
			    operator = _results2.operator;

			return operator.toJS(expression.toSource(context));
		}
	}]);

	return postfix_operator_expresion;
}(_RuleSyntax2.default.Expression));

// TODO: this should really be a general "expression"...
//parser.addSyntax("operator_expression", "(expression:{postfix_operator_expression}|{infix_operator_expression})");

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _TextStream = __webpack_require__(5);

var _TextStream2 = _interopRequireDefault(_TextStream);

var _Parser = __webpack_require__(1);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(2);

var _Rule2 = _interopRequireDefault(_Rule);

__webpack_require__(3);

var _index = __webpack_require__(6);

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Stick on window for reflection and ad-hoc testing.
if (typeof window !== "undefined") {
	window.TextStream = _TextStream2.default;
	window.Parser = _Parser2.default;
	window.Rule = _Rule2.default;
	window.parser = _index2.default;
}

exports.default = {
	TextStream: _TextStream2.default, Parser: _Parser2.default, Rule: _Rule2.default, parser: _index2.default
};

/***/ }),
/* 13 */,
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _Rule = __webpack_require__(2);

var _Rule2 = _interopRequireDefault(_Rule);

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(4);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for creating variables, property access, etc
//

// re-export parser for testing.
exports.default = _parser2.default;

var if_statement = function (_Rule$Statement) {
	_inherits(if_statement, _Rule$Statement);

	function if_statement() {
		_classCallCheck(this, if_statement);

		return _possibleConstructorReturn(this, (if_statement.__proto__ || Object.getPrototypeOf(if_statement)).apply(this, arguments));
	}

	return if_statement;
}(_Rule2.default.Statement);

//TESTME


_parser2.default.addStatement("if", "if {expression} (then|:) {statement}?", {
	toSource: function toSource(context) {
		var _results = this.results,
		    expression = _results.expression,
		    statement = _results.statement;

		expression = expression.toSource(context);
		statement = statement ? statement.toSource(context) : undefined;

		if (statement) return "if (" + expression + ") { " + statement + " }";
		return "if (" + expression + ")";
	}
}, if_statement);

_parser2.default.addStatement("if", "{statement} if {expression} (elsePhrase:(else|otherwise) {statement})?", {
	toSource: function toSource(context) {
		var _results2 = this.results,
		    expression = _results2.expression,
		    statement = _results2.statement,
		    elsePhrase = _results2.elsePhrase;

		expression = expression.toSource(context);
		statement = statement ? statement.toSource(context) : undefined;
		var elseStatement = elsePhrase && elsePhrase.results.statement.toSource();

		if (elseStatement) return "if (" + expression + ") { " + statement + " } else { " + elseStatement + " }";
		return "if (" + expression + ") { " + statement + " }";
	}
}, if_statement);

_parser2.default.addStatement("if", "(else|otherwise) if {expression} (then|:) {statement}?", {
	toSource: function toSource(context) {
		var _results3 = this.results,
		    expression = _results3.expression,
		    statement = _results3.statement;

		expression = expression.toSource(context);
		statement = statement ? statement.toSource(context) : undefined;

		if (statement) return "else if (" + expression + ") { " + statement + " }";
		return "else if (" + expression + ")";
	}
}, if_statement);

_parser2.default.addStatement("if", "(else|otherwise) {statement}?", {
	toSource: function toSource(context) {
		var statement = this.results.statement;

		statement = statement ? statement.toSource(context) : undefined;

		if (statement) return "else { " + statement + " }";
		return "else";
	}
}, if_statement);

/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgOGY3MjdmMmE4Y2ZlOWJmOWM3NTIiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZVN5bnRheC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9pZi5qcyJdLCJuYW1lcyI6WyJwYXJzZXIiLCJ3aW5kb3ciLCJjb25zb2xlIiwiZ3JvdXAiLCJsb2ciLCJncm91cEVuZCIsIlBhcnNlciIsInByb3BlcnRpZXMiLCJPYmplY3QiLCJhc3NpZ24iLCJydWxlcyIsImNyZWF0ZSIsIm5hbWUiLCJzdHJlYW0iLCJydWxlIiwiZ2V0UnVsZSIsIlN5bnRheEVycm9yIiwiZWF0V2hpdGVzcGFjZSIsInBhcnNlIiwic3RhdGVtZW50cyIsInJlc3VsdHMiLCJjdXJyZW50SW5kZW50Iiwic3BsaXQiLCJmb3JFYWNoIiwic3RhdGVtZW50IiwidHJpbSIsInB1c2giLCJsaW5lU3RhcnQiLCJtYXRjaCIsImxpbmVJbmRlbnQiLCJsZW5ndGgiLCJzdWJzdHIiLCJpIiwicmVzdWx0IiwidG9Tb3VyY2UiLCJ3YXJuIiwiam9pbiIsIndoaXRlc3BhY2UiLCJhZHZhbmNlQnkiLCJtYXRjaGVkIiwicnVsZU5hbWUiLCJleGlzdGluZyIsIkFsdGVybmF0aXZlcyIsImRlYnVnIiwiYXJndW1lbnQiLCJhZGRSdWxlIiwicnVsZUlzTGVmdFJlY3Vyc2l2ZSIsImxlZnRSZWN1cnNpdmUiLCJTZXF1ZW5jZSIsInN1YnJ1bGUiLCJvcHRpb25hbCIsIlN1YnJ1bGUiLCJ0b2tlbnMiLCJzdGFydFRva2VuIiwiZW5kVG9rZW4iLCJzdGFydEluZGV4IiwibmVzdGluZyIsIm5lc3RlZCIsImVuZEluZGV4IiwibGFzdEluZGV4IiwidG9rZW4iLCJzbGljZSIsInN0cmluZyIsIm1hcCIsImNoYXIiLCJpbmRleCIsImxpc3QiLCJSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTIiwiZmxhZ3MiLCJSZWdFeHAiLCJlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzIiwiREVCVUciLCJjaGFycyIsIlJ1bGUiLCJjb25zdHJ1Y3RvciIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2xvbmUiLCJwcm9wcyIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsInN0YWNrIiwiY29udGV4dCIsIm5leHRSdWxlIiwibmV4dFN0cmVhbSIsIlBhdHRlcm4iLCJwYXR0ZXJuIiwiZGVmaW5lUHJvcGVydHkiLCJ2YWx1ZSIsInNvdXJjZSIsInN0YXJ0UGF0dGVybiIsImJsYWNrbGlzdCIsIndvcmRzIiwid29yZCIsIlN5bWJvbCIsIlJlZ0V4cEZyb21TdHJpbmciLCJtZXJnZVN5bWJvbHMiLCJmaXJzdCIsInNlY29uZCIsIktleXdvcmQiLCJwYXR0ZXJuU3RyaW5nIiwibWVyZ2VLZXl3b3JkcyIsImlzRGV0ZXJtaW5pc3RpYyIsIk5lc3RlZCIsImV2ZXJ5Iiwic3RhY2tDb250YWlucyIsImNvbmNhdCIsIm5leHQiLCJtYXRjaGVkVGV4dCIsInJhbmdlIiwiX3Jlc3VsdHMiLCJhcmdOYW1lIiwiQXJyYXkiLCJpc0FycmF5IiwiRXhwcmVzc2lvbiIsIlN0YXRlbWVudCIsIm1hdGNoZXMiLCJiZXN0TWF0Y2giLCJSZXBlYXQiLCJpbmNsdWRlcyIsIkxpc3QiLCJpdGVtIiwiZGVsaW1pdGVyIiwicGFyc2VSdWxlU3ludGF4Iiwic3ludGF4IiwiU2VxdWVuY2VDb25zdHJ1Y3RvciIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInBhcnNlUnVsZVN5bnRheF90b2tlbnMiLCJTWU5UQVhfRVhQUkVTU0lPTiIsInBhcnNlUnVsZVN5bnRheF90b2tlbiIsImxhc3QiLCJwb3AiLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zdHJpbmciLCJwYXJzZVJ1bGVTeW50YXhfc3VicnVsZSIsInBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyIsInBhcnNlUnVsZVN5bnRheF9saXN0IiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsInN0YXJ0c1dpdGgiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJhbHRlcm5hdGl2ZXMiLCJncm91cEFsdGVybmF0aXZlcyIsImN1cnJlbnQiLCJzeW1ib2wiLCJwYXJhbXMiLCJiYW5nUG9zaXRpb24iLCJpbmRleE9mIiwibm90IiwiZGVmaW5lUHJvcGVydGllcyIsImFkZFN5bnRheCIsInJ1bGVTeW50YXgiLCJGdW5jdGlvbiIsImUiLCJlcnJvciIsImFkZFN0YXRlbWVudCIsImFkZEV4cHJlc3Npb24iLCJhZGRJbmZpeE9wZXJhdG9yIiwidG9KUyIsIl9faW5maXhPcGVyYXRvcnMiLCJpbmZpeE9wZXJhdG9ycyIsImFkZFBvc3RmaXhPcGVyYXRvciIsIl9fcG9zdGZpeE9wZXJhdG9ycyIsInBvc3RmaXhPcGVyYXRvcnMiLCJXaGl0ZXNwYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJyZXBsYWNlIiwiYWRkVG9CbGFja2xpc3QiLCJUeXBlIiwidHlwZSIsIk51bWJlciIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJJbnRlZ2VyIiwicGFyc2VJbnQiLCJUZXh0IiwidGV4dCIsIkJvb2xlYW4iLCJib29sIiwiZXhwcmVzc2lvbiIsImVuZHNXaXRoIiwiVGV4dFN0cmVhbSIsInRleHRPclByb3BzIiwiYXJnIiwiaGVhZCIsInRlc3QiLCJzdWJzdHJpbmciLCJtZW1vaXplZCIsImRlZmluZU1lbW9pemVkIiwicHJvcGVydHkiLCJnZXR0ZXIiLCJhcHBseSIsImNvbmZpZ3VyYWJsZSIsImdldCIsInJldmVyc2UiLCJhc3NpZ25tZW50Iiwic2NvcGVfbW9kaWZpZXIiLCJzY29wZSIsInBsdXJhbCIsInRvVXBwZXJDYXNlIiwidmFsdWVzIiwiZmlyc3RWYWx1ZSIsImluZGV4X2V4cHJlc3Npb24iLCJhIiwiYiIsInRoaW5nIiwibGhzIiwicmhzIiwib3BlcmF0b3IiLCJpZl9zdGF0ZW1lbnQiLCJlbHNlUGhyYXNlIiwiZWxzZVN0YXRlbWVudCJdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLG1EQUEyQyxjQUFjOztBQUV6RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOzs7O0FBQ0E7Ozs7OztBQUVBO0FBTkE7QUFDQTtBQUNBO0FBS0EsSUFBTUEsU0FBUyxzQkFBZjtrQkFDZUEsTTs7QUFFZjs7QUFDQUMsT0FBT0QsTUFBUCxHQUFnQkEsTUFBaEIsQzs7Ozs7Ozs7Ozs7OztxakJDWEE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7QUFDQTs7Ozs7Ozs7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b0M5SixTQUFwQztBQUNmLHVCQUFtQjhKLFVBQW5CO0FBQ0E7QUFSRixDQUhELEVBYUM4QixZQWJEOztBQWdCQSxpQkFBT3ZELFlBQVAsQ0FDQyxJQURELEVBRUMsK0JBRkQsRUFHQztBQUNDM0gsU0FERCxvQkFDVWlELE9BRFYsRUFDbUI7QUFBQSxNQUNYM0QsU0FEVyxHQUNHLEtBQUtKLE9BRFIsQ0FDWEksU0FEVzs7QUFFakJBLGNBQVlBLFlBQVlBLFVBQVVVLFFBQVYsQ0FBbUJpRCxPQUFuQixDQUFaLEdBQTBDSixTQUF0RDs7QUFFQSxNQUFJdkQsU0FBSixFQUFlLG1CQUFpQkEsU0FBakI7QUFDZjtBQUNBO0FBUEYsQ0FIRCxFQVlDNEwsWUFaRCxFIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMTIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDhmNzI3ZjJhOGNmZTliZjljNzUyIiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCIvLyBTcGVsbCBcIkVuZ2xpc2hcIiBwYXJzZXIgc3RyYXdtYW5cblxuLy8gVE9ETzpcdGB0ZXN0YCBmdW5jdGlvbiBmb3IgcXVpY2sgbm8tZ29vZCBoaXQgb24gYHthfSBibGFoIGJsYWgge2J9YD9cbi8vIFRPRE86XHR0aGlzIGRvZXNuJ3Qgd29yazogICBge2V4cHJlc3Npb259IGlzIHtleHByZXNzaW9ufWBcbi8vIFRPRE86XHRicmVhayBgZmlsZWAgaW50byBsaW5lcyBhbmQgcHJvY2VzcyBlYWNoIChpbmNsLiBzdWJzdHIvbWF0Y2ggbm90IGdvaW5nIGJleW9uZCB0aGUgZW5kKVxuLy8gVE9ETzpcdG5lc3RpbmcgLS0gaXMgdGhpcyBqdXN0IGluZGVudCA9IFwiYWRkIGJsb2NrIHNjb3BlXCJcbi8vIFRPRE86XHRwcm9tb3Rpb24gcGF0dGVybiBmb3IgZ2F0aGVyIGFyZ3VtZW50cyAoZWc6IGxpdGVyYWwtbGlzdCkgPz8/XG4vLyBUT0RPOlx0V2hhdCBkb2VzIHN5bnRheCB0cmVlIGxvb2sgbGlrZT8gIEhvdyBkbyB3ZSBleHRyYWN0IG1lYW5pbmcgb3V0IG9mIHRoZSBuZXN0P1xuLy8gVE9ETzpcdFBhc3MgYGNvbnRleHRgIHRvIHRvU291cmNlKCksIGFkZCBwcm9wZXJ0eSBkZXNjcmlwdG9ycyB0byBgY2xhc3NgLCB2YXJpYWJsZXMgYW5kIGNvZGUgdG8gYG1ldGhvZGAsIGBnbG9iYWxgIHN0dWZmIGV0Y1xuXG5pbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIEdSUlIuLi4gd2lsbCBTT01FT05FIG9uIHRoZSBub2RlIHRlYW0gcGxlYXNlIGltcGxlbWVudCBjb25zb2xlLmdyb3VwID8/P1xuaWYgKCFjb25zb2xlLmdyb3VwKSBjb25zb2xlLmdyb3VwID0gY29uc29sZS5sb2c7XG5pZiAoIWNvbnNvbGUuZ3JvdXBFbmQpIGNvbnNvbGUuZ3JvdXBFbmQgPSBjb25zb2xlLmxvZztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblx0Ly8gU2V0IHRvIGB0cnVlYCB0byBvdXRwdXQgZGVidWcgaW5mbyB3aGlsZSBhZGRpbmcgcnVsZXNcblx0c3RhdGljIERFQlVHID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cblx0XHQvLyBDbG9uZSBydWxlcywgc3RhcnRpbmcgd2l0aCBhIGNvbXBsZXRlbHkgZW1wdHkgbWFwIGlmIG5vdCBkZWZpbmVkIChubyBzdGFuZGFyZCBvYmplY3Qga2V5cylcblx0XHR0aGlzLnJ1bGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnJ1bGVzIHx8IG51bGwpO1xuXHR9XG5cblx0Z2V0UnVsZShuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXNbbmFtZV07XG5cdH1cblxuLy9cbi8vIyMjIFBhcnNpbmdcbi8vXG5cdC8vIFBhcnNlIGBuYW1lYGQgcnVsZSBhdCBoZWFkIG9mIGBzdHJlYW1gIChgc3RyaW5nYCBvciBgVGV4dFN0cmVhbWApLlxuXHQvLyBIYW5kbGVzIG9wdGlvbmFsIGFuZCByZXBlYXRpbmcgcnVsZXMgYXMgd2VsbCBhcyBlYXRpbmcgd2hpdGVzcGFjZS5cblx0Ly8gUmV0dXJucyByZXN1bHQgb2YgcGFyc2UuXG5cdHBhcnNlKG5hbWUsIHN0cmVhbSkge1xuXHRcdGlmICh0eXBlb2Ygc3RyZWFtID09PSBcInN0cmluZ1wiKSBzdHJlYW0gPSBuZXcgVGV4dFN0cmVhbShzdHJlYW0pO1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZXIucGFyc2UoJHtuYW1lfSk6IFJ1bGUgbm90IGZvdW5kYCk7XG5cdFx0c3RyZWFtID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJ1bGUucGFyc2UodGhpcywgc3RyZWFtKTtcblx0fVxuXG5cdC8vIFBhcnNlIGEgc2V0IG9mIHN0YXRlbWVudHMgbGluZS1ieS1saW5lLlxuLy9URVNUTUVcblx0cGFyc2VTdGF0ZW1lbnRzKHN0YXRlbWVudHMpIHtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdGxldCBjdXJyZW50SW5kZW50ID0gMDtcblx0XHRzdGF0ZW1lbnRzLnNwbGl0KC9cXG4rL2cpLmZvckVhY2goc3RhdGVtZW50ID0+IHtcblx0XHRcdC8vIHNraXAgbGluZXMgdGhhdCBhcmUgYWxsIHdoaXRlc3BhY2Vcblx0XHRcdGlmIChzdGF0ZW1lbnQudHJpbSgpID09PSBcIlwiKSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChcIlwiKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBmaWd1cmUgb3V0IGluZGVudCBsZXZlbCBvZiB0aGlzIGxpbmVcblx0XHRcdGxldCBsaW5lU3RhcnQgPSBzdGF0ZW1lbnQubWF0Y2goL15cXHQqLylbMF07XG5cdFx0XHRsZXQgbGluZUluZGVudCA9IGxpbmVTdGFydC5sZW5ndGg7XG5cdFx0XHRpZiAobGluZUluZGVudCA+IGN1cnJlbnRJbmRlbnQpIHtcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoKSByZXN1bHRzW3Jlc3VsdHMubGVuZ3RoIC0gMV0gKz0gXCIge1wiO1xuXHRcdFx0XHRlbHNlIHJlc3VsdHMucHVzaChsaW5lU3RhcnQuc3Vic3RyKDAsIGxpbmVJbmRlbnQtMSkgKyBcIntcIik7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChsaW5lSW5kZW50IDwgY3VycmVudEluZGVudCkge1xuXHRcdFx0XHRmb3IgKHZhciBpID0gY3VycmVudEluZGVudDsgaSA+IGxpbmVJbmRlbnQ7IGktLSkge1xuXHRcdFx0XHRcdHJlc3VsdHMucHVzaChsaW5lU3RhcnQuc3Vic3RyKDAsIGkpICsgXCJ9XCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50SW5kZW50ID0gbGluZUluZGVudDtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnBhcnNlKFwic3RhdGVtZW50XCIsIHN0YXRlbWVudCk7XG5cdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChsaW5lU3RhcnQgKyByZXN1bHQudG9Tb3VyY2UoKSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiQ291bGRuJ3QgcGFyc2Ugc3RhdGVtZW50OlwiLCBzdGF0ZW1lbnQpO1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCJFUlJPUjogXCIrc3RhdGVtZW50KTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHQvLyBhZGQgZW5kaW5nIGJyYWNlc1xuXHRcdHdoaWxlIChjdXJyZW50SW5kZW50ID4gMCkge1xuXHRcdFx0cmVzdWx0cy5wdXNoKFwifVwiKTtcblx0XHRcdGN1cnJlbnRJbmRlbnQtLTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0cy5qb2luKFwiXFxuXCIpO1xuXHR9XG5cblx0Ly8gRWF0IHdoaXRlc3BhY2UgKGFjY29yZGluZyB0byBgcnVsZXMud2hpdGVzcGFjZWApIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBuZXcgc3RyZWFtIGlmIHdlIG1hdGNoZWQgd2hpdGVzcGFjZSwgb3RoZXJ3aXNlIHRoZSBzYW1lIHN0cmVhbS5cblx0ZWF0V2hpdGVzcGFjZShzdHJlYW0pIHtcblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5ydWxlcy53aGl0ZXNwYWNlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiBzdHJlYW07XG5cdFx0cmV0dXJuIHN0cmVhbS5hZHZhbmNlQnkocmVzdWx0Lm1hdGNoZWQubGVuZ3RoKTtcblx0fVxuXG4vL1xuLy9cdFJ1bGVzXG4vL1xuXG5cdC8vIEFkZCBhIHJ1bGUgdG8gb3VyIGxpc3Qgb2YgcnVsZXMhXG5cdC8vIENvbnZlcnRzIHRvIGBhbHRlcm5hdGl2ZXNgIG9uIHJlLWRlZmluaW5nIHRoZSBzYW1lIHJ1bGUuXG5cdGFkZFJ1bGUobmFtZSwgcnVsZSkge1xuXHRcdC8vIGRvbid0IG92ZXJyaWRlIHJ1bGVOYW1lXG5cdFx0aWYgKCFydWxlLnJ1bGVOYW1lKSBydWxlLnJ1bGVOYW1lID0gbmFtZTtcblxuXHRcdGxldCBleGlzdGluZyA9IHRoaXMucnVsZXNbbmFtZV07XG5cdFx0aWYgKGV4aXN0aW5nKSB7XG5cdFx0XHRpZiAoIShleGlzdGluZyBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzKSkge1xuXHRcdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQ29udmVydGluZyBydWxlICcke25hbWV9JyB0byBhbHRlcm5hdGl2ZXNgKTtcblx0XHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVOYW1lOiBuYW1lLCBydWxlczogW2V4aXN0aW5nXSB9KTtcblx0XHRcdFx0Ly8gY29weSBhcmd1bWVudCBuYW1lIG92ZXIgKD8/Pylcblx0XHRcdFx0aWYgKGV4aXN0aW5nLmFyZ3VtZW50KSB0aGlzLnJ1bGVzW25hbWVdLmFyZ3VtZW50ID0gZXhpc3RpbmcuYXJndW1lbnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkaW5nIHJ1bGUgJyR7cnVsZS5ydWxlTmFtZX0nIHRvICcke25hbWV9JzogYCwgcnVsZSk7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdLmFkZFJ1bGUocnVsZSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IHJ1bGU7XG5cdFx0fVxuXG5cblx0XHQvLyBtYWtlIGEgbm90ZSBpZiB3ZSdyZSBhZGRpbmcgYSBsZWZ0LXJlY3Vyc2l2ZSBydWxlXG5cdFx0aWYgKHRoaXMucnVsZUlzTGVmdFJlY3Vyc2l2ZShuYW1lLCBydWxlKSkge1xuLy9jb25zb2xlLmluZm8oXCJtYXJraW5nIFwiLCBydWxlLCBcIiBhcyBsZWZ0IHJlY3Vyc2l2ZSFcIik7XG5cdFx0XHRydWxlLmxlZnRSZWN1cnNpdmUgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cblx0Ly8gSXMgdGhlIHNwZWNpZmllZCBydWxlIGxlZnQtcmVjdXJzaXZlP1xuXHRydWxlSXNMZWZ0UmVjdXJzaXZlKG5hbWUsIHJ1bGUpIHtcblx0XHRpZiAoIShydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSkpIHJldHVybiBmYWxzZTtcbi8vY29uc29sZS5sb2cobmFtZSwgcnVsZSk7XG5cdFx0Zm9yIChsZXQgc3VicnVsZSBvZiBydWxlLnJ1bGVzKSB7XG5cdFx0XHQvLyBpZ25vcmUgb3B0aW9uYWwgcnVsZXNcblx0XHRcdGlmIChzdWJydWxlLm9wdGlvbmFsKSBjb250aW51ZTtcblx0XHRcdGlmIChzdWJydWxlIGluc3RhbmNlb2YgUnVsZS5TdWJydWxlICYmIHN1YnJ1bGUucnVsZSA9PT0gbmFtZSkgcmV0dXJuIHRydWU7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cbi8vXG4vLyAjIyBVdGlsaXR5IG1ldGhvZHNcbi8vXG5cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmBcblx0Ly9cdGluIGFycmF5IG9mIGB0b2tlbnNgIChzdHJpbmdzKS5cblx0Ly8gSWYgc3VjY2Vzc2Z1bCwgcmV0dXJucyBgeyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2UgfWBcblx0Ly8gVGhyb3dzIGlmIHVuc3VjZXNzZnVsLlxuXHRzdGF0aWMgZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIHN0YXJ0VG9rZW4sIGVuZFRva2VuLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGlmICh0b2tlbnNbc3RhcnRJbmRleF0gIT09IHN0YXJ0VG9rZW4pIHRocm93IG5ldyBTeW50YXhFcnJvcihgRXhwZWN0ZWQgJyR7c3RhcnRUb2tlbn0nIGF0IGluZGV4ICR7c3RhcnRJbmRleH0gb2YgdG9rZW5zYCk7XG5cdFx0bGV0IG5lc3RpbmcgPSAwO1xuXHRcdGxldCBuZXN0ZWQgPSBmYWxzZTtcblx0XHRmb3IgKGxldCBlbmRJbmRleCA9IHN0YXJ0SW5kZXggKyAxLCBsYXN0SW5kZXggPSB0b2tlbnMubGVuZ3RoOyBlbmRJbmRleCA8IGxhc3RJbmRleDsgZW5kSW5kZXgrKykge1xuXHRcdFx0bGV0IHRva2VuID0gdG9rZW5zW2VuZEluZGV4XTtcblx0XHRcdGlmICh0b2tlbiA9PT0gc3RhcnRUb2tlbikge1xuXHRcdFx0XHRuZXN0aW5nKys7XG5cdFx0XHRcdG5lc3RlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodG9rZW4gPT09IGVuZFRva2VuKSB7XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKVxuXHRcdFx0XHRcdHJldHVybiB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZTogdG9rZW5zLnNsaWNlKHN0YXJ0SW5kZXgrMSwgZW5kSW5kZXgpLCBuZXN0ZWQgfTtcblx0XHRcdFx0bmVzdGluZy0tO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENvdWxkbid0IGZpbmQgbWF0Y2hpbmcgJyR7ZW5kVG9rZW59J3Mgc3RhcnRpbmcgYXQgaXRlbSAke3N0YXJ0SW5kZXh9YCk7XG5cdH1cblxuXG5cdC8vIExpc3Qgb2Ygc3BlY2lhbCBjaGFyYWN0ZXJzIGluIHJlZ3VsYXIgZXhwcmVzc2lvbnMuXG5cdC8vIFVzZWQgdG8gZXNjYXBlIHRob3NlIGNoYXJzIHdoZW4gY3JlYXRpbmcgcmVndWxhciBleHByZXNzaW9ucyBmcm9tIHN0cmluZ3MuXG5cdHN0YXRpYyBSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTID0gKGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IGNoYXJzID0ge307XG5cdFx0XCJcXFxcL14kKis/LigpfHt9LFtdXCIuc3BsaXQoXCJcIikuZm9yRWFjaChjaGFyID0+IGNoYXJzW2NoYXJdID0gdHJ1ZSk7XG5cdFx0cmV0dXJuIGNoYXJzO1xuXHR9KSgpXG5cblx0Ly8gR2l2ZW4gYSBcIm5vcm1hbFwiIGBzdHJpbmdgLCBlc2NhcGUgYW55IHJlZ3VsYXIgZXhwcmVzc2lvbiBzcGVjaWFsIGNoYXJhY3RlcnNcblx0Ly9cdHNvIHdlIGNhbiBjcmVhdGUgYSBgbmV3IFJlZ0V4cCgpYC5cblx0Ly8gQWxzbyBjb252ZXJ0cyBhIHNpbmdsZSBzcGFjZSB0byBhcmJpdHJhcnkgc2V0IG9mIHNwYWNlcyB3aXRoIFwiXFxzK1wiXG5cdHN0YXRpYyBlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZykge1xuXHRcdHJldHVybiBzdHJpbmcuc3BsaXQoXCJcIikubWFwKGZ1bmN0aW9uIChjaGFyLCBpbmRleCwgbGlzdCkge1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBiYWNrc2xhc2hcblx0XHRcdGlmIChjaGFyID09PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiO1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBzcGFjZVxuXHRcdFx0aWYgKGNoYXIgPT09IFwiIFwiKSByZXR1cm4gXCJcXFxccytcIjtcblx0XHRcdC8vIElmIGEgc3BlY2lhbCBjaGFyIGFuZCBwcmV2aW91cyBjaGFyYWN0ZXIgd2FzIG5vdCBhbiBlc2NhcGUsIGVzY2FwZSB0aGUgcmVzdWx0LlxuXHRcdFx0aWYgKFBhcnNlci5SRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTW2NoYXJdICYmIGxpc3RbaW5kZXgtMV0gIT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCIrY2hhcjtcblx0XHRcdC8vIFRoaXMgY2hhciBzaG91bGQgYmUgZmluZSBieSBpdHNlbGYuXG5cdFx0XHRyZXR1cm4gY2hhcjtcblx0XHR9KS5qb2luKFwiXCIpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgbmV3IHJlZ3VsYXIgZXhwcmVzc2lvbiBmcm9tIGEgXCJub3JtYWxcIiBzdHJpbmcsIGVzY2FwaW5nIHNwZWNpYWwgY2hhcmFjdGVycyBhcyBuZWNlc3NhcnkuXG5cdHN0YXRpYyBSZWdFeHBGcm9tU3RyaW5nKHN0cmluZywgZmxhZ3MpIHtcblx0XHRyZXR1cm4gbmV3IFJlZ0V4cChQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpLCBmbGFncyk7XG5cdH1cblxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUGFyc2VyLmpzIiwiLy9cdCMgUGFyc2VyIFJ1bGVzXG4vL1x0UnVsZXMgY2FuIGJlIGFzIHNpbXBsZSBhcyBhIHN0cmluZyBgS2V5d29yZGAgb3IgYSBjb21wbGV4IHNlcXVlbmNlIG9mIChuZXN0ZWQpIHJ1bGVzLlxuLy9cbi8vXHRQYXJzZSBhIHJ1bGUgd2l0aCBgcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSlgLCB0aGlzIHdpbGwgZWl0aGVyOlxuLy9cdFx0LSByZXR1cm4gYHVuZGVmaW5lZGAgaWYgdGhlIHJ1bGUgZG9lc24ndCBtYXRjaCB0aGUgaGVhZCBvZiB0aGUgc3RyZWFtLCBvclxuLy9cdFx0LSByZXR1cm4gYSBDTE9ORSBvZiB0aGUgcnVsZSB3aXRoIGF0IGxlYXN0IHRoZSBmb2xsb3dpbmc6XG4vL1x0XHRcdC0gYHN0cmVhbWBcdFx0U3RyZWFtIHdoaWNoIHdhcyBtYXRjaGVkIHdpdGggYHN0YXJ0SW5kZXhgIGF0IHRoZSBzdGFydCBvZiB0aGUgbWF0Y2hcbi8vXHRcdFx0LSBgZW5kSW5kZXhgXHROb24taW5jbHVzaXZlIGVuZCBpbmRleCBpbiBzdHJlYW0gd2hlcmUgbWF0Y2ggZW5kcy5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLnJlc3VsdHNgXHRcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZShjb250ZXh0KWBcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBSdWxlIHx8ICF0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShcImNvbnN0cnVjdG9yXCIpKSB7XG4vL2NvbnNvbGUud2FybihcIm5vdCBydWxlXCIsIHRoaXMpO1xuXHRcdH1cblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXHR9XG5cblx0Ly8gQ2xvbmUgdGhpcyBydWxlIGFuZCBhZGQgYW55IGBwcm9wc2AgcGFzc2VkIGluLlxuXHRjbG9uZSguLi5wcm9wcykge1xuXHRcdGxldCBjbG9uZSA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG5cdFx0T2JqZWN0LmFzc2lnbihjbG9uZSwgLi4ucHJvcHMpO1xuXHRcdHJldHVybiBjbG9uZTtcblx0fVxuXG5cdC8vIEZvciBhIHJ1bGUgaW5zdGFuY2UgYXNzb2NpYXRlZCB3aXRoIGEgc3RyZWFtLFxuXHQvLyByZXR1cm4gYSBuZXcgc3RyZWFtIEFGVEVSIHRoaXMgcnVsZSdzIGVuZC5cblx0bmV4dCgpIHtcblx0XHRpZiAoIXRoaXMuc3RyZWFtIHx8IHRoaXMuZW5kSW5kZXggPT09IHVuZGVmaW5lZClcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYHJ1bGUubmV4dCgpIGNhbGxlZCBvbiBydWxlIHdpdGhvdXQgYSBzdHJlYW1gLCB0aGlzKTtcblx0XHRyZXR1cm4gdGhpcy5zdHJlYW0uYWR2YW5jZVRvKHRoaXMuZW5kSW5kZXgpO1xuXHR9XG5cbi8vXG4vL1x0UGFyc2luZyBwcmltaXRpdmVzIC0tIHlvdSBNVVNUIGltcGxlbWVudCB0aGVzZSBpbiB5b3VyIHN1YmNsYXNzZXMhXG4vL1xuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBydWxlIGluIHRoZSBgc3RyZWFtYC5cblx0Ly8gUmV0dXJucyByZXN1bHRzIG9mIHRoZSBwYXJzZSBvciBgdW5kZWZpbmVkYC5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIElzIHRoaXMgcnVsZSBkZXRlcm1pbmlzdGljLCBlZzogY2FuIGl0IGJlIHF1aWNrbHkgYW5kIHVuYW1iaWd1b3VzbHkgc2F0aXNmaWVkP1xuXHQvLyBSZXR1cm5pbmcgYHRydWVgIGNhbiBzcGVlZCB1cCBzZXF1ZW5jZSBwcm9jZXNzaW5nLFxuXHQvL1x0YnV0IGlmIHlvdSdyZSByZWFsbHkgbm90IHN1cmUsIHJldHVybiBgdW5kZWZpbmVkYC5cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIERvZXMgdGhlIHBhcnNlIGBzdGFja2AgYWxyZWFkeSBjb250YWluIGBydWxlYD9cblx0c3RhdGljIHN0YWNrQ29udGFpbnMoc3RhY2ssIHJ1bGUsIHN0cmVhbSkge1xuXHRcdGlmIChzdGFjay5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcblxuLy9jb25zb2xlLmluZm8oc3RhY2spO1xuXHRcdC8vIGdvIGJhY2t3YXJkc1xuXHRcdGZvciAodmFyIGkgPSBzdGFjay5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0bGV0IFsgbmV4dFJ1bGUsIG5leHRTdHJlYW0gXSA9IHN0YWNrW2ldO1xuXHRcdFx0aWYgKG5leHRSdWxlID09PSBydWxlKSB7XG5cdFx0XHRcdGlmIChuZXh0U3RyZWFtLnN0YXJ0SW5kZXggPT09IHN0cmVhbS5zdGFydEluZGV4KSB7XG4vL1x0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJmb3VuZCB1bnByb2R1Y3RpdmUgcnVsZSBcIiwgcnVsZSwgXCIgb24gc3RhY2tcIiwgc3RhY2spO1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuLy9cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiZm91bmQgcHJvZHVjdGl2ZSBydWxlIFwiLCBydWxlLCBcIiBvbiBzdGFja1wiLCBzdGFjayk7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG4vL1xuLy8gIyMgb3V0cHV0IGFzIHNvdXJjZVxuLy9cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gTk9URTogeW91IG1heSB3YW50IHRvIG1lbW9pemUgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0Ly8gT3V0cHV0IHZhbHVlIGZvciB0aGlzIElOU1RBTlRJQVRFRCBydWxlIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQ7XG5cdH1cblxuLy9cbi8vICMjIGdyb3VwOiByZWZsZWN0aW9uXG4vL1xuXHRnZXQgcnVsZVR5cGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0fVxufVxuXG5cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vXG4vLyBOT1RFXHRUbyBtYWtlIHRoaXMgbW9yZSBnZW5lcmFsbHkgYXBwbGljYWJsZSwgZG8gTk9UIHN0YXJ0IHRoZSBwYXR0ZXJuIHdpdGggYSBgXmAuXG4vL1x0XHRXZSdsbCBhdXRvbWF0aWNhbGx5IG1ha2UgYSBjb3B5IG9mIHRoZSBSZWdFeHAgd2l0aCB0aGUgc3RhcnQgcG9pbnQgYXR0YWNoZWRcbi8vXHRcdGFuZCB1c2UgdGhhdCBhcyBhcHByb3ByaWF0ZS5cbi8vXG4vL1x0XHRUaGlzIHdheSB3ZSBjYW4gcmUtdXNlIHRoZSByZWdleCB0byBjaGVjayBmb3IgYSBtYXRjaCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBzdHJlYW0uLi5cbi8vXG4vLyBZb3UgY2FuIG9wdGlvbmFsbHkgc3BlY2lmeSBhIGBydWxlLmJsYWNrbGlzdGAsIGEgc2V0IG9mIG1hdGNoZXMgd2hpY2ggd2lsbCBzcGVjaWZpY2FsbHkgTk9UIHdvcmssXG4vL1x0ZWcgZm9yIGBpZGVudGlmaWVyLlxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHBhdHRlcm5gIGlzIHJlcXVpcmVkXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5QYXR0ZXJuKCk6IFlvdSBtdXN0IHBhc3MgYSBgcGF0dGVybmAgcGFyYW1ldGVyXCIpO1xuXG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cblx0XHQvLyBDcmVhdGUgYSBgc3RhcnRQYXR0ZXJuYCB0byBtYXRjaCBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJvbmdcblx0XHQvLyBDcmVhdGUgbm9uLWVudW1lcmFibHkuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic3RhcnRQYXR0ZXJuXCIsIHsgdmFsdWU6IG5ldyBSZWdFeHAoXCJeXCIgKyB0aGlzLnBhdHRlcm4uc291cmNlKSB9KTtcblx0fVxuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBwYXR0ZXJuIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0bGV0IG1hdGNoID0gc3RyZWFtLm1hdGNoKHRoaXMuc3RhcnRQYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYmFpbCBpZiBwcmVzZW50IGluIGJsYWNrbGlzdFxuXHRcdGxldCBtYXRjaGVkID0gbWF0Y2hbMF07XG5cdFx0aWYgKHRoaXMuYmxhY2tsaXN0ICYmIHRoaXMuYmxhY2tsaXN0W21hdGNoZWRdKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCArIG1hdGNoZWQubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBQYXR0ZXJucyBhcmUgQUxXQVlTIGRldGVybWluaXN0aWMuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0YWRkVG9CbGFja2xpc3QoLi4ud29yZHMpIHtcblx0XHRpZiAoIXRoaXMuYmxhY2tsaXN0KSB0aGlzLmJsYWNrbGlzdCA9IHt9O1xuXHRcdHdvcmRzLmZvckVhY2god29yZCA9PiB0aGlzLmJsYWNrbGlzdFt3b3JkXSA9IHRydWUpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMucGF0dGVybi5zb3VyY2U7XG5cdH1cbn1cblxuLy8gUnVsZSBmb3IgbGl0ZXJhbCBzdHJpbmcgdmFsdWUsIHdoaWNoIGluY2x1ZGUgcHVuY3R1YXRpb24gc3VjaCBhcyBgKGAgZXRjLlxuLy8gYFN5bWJvbGBzIGFyZSBkaWZmZXJlbnQgZnJvbSBgS2V5d29yZHNgIGluIHRoYXQgdGhleSBkbyBub3QgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkuXG4vL1RPRE86IHJlbmFtZSBgU3ltYm9sYD8/P1xuUnVsZS5TeW1ib2wgPSBjbGFzcyBTeW1ib2wgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHN0cmluZ2AgaXMgcmVxdWllZC5cblx0XHRpZiAoIXByb3BlcnRpZXMuc3RyaW5nKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuU3ltYm9sKCk6IEV4cGVjdGVkIHN0cmluZyBwcm9wZXJ0eVwiKTtcblxuXHRcdC8vIGNvbnZlcnQgc3RyaW5nIHRvIHBhdHRlcm5cblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikge1xuXHRcdFx0cHJvcGVydGllcy5wYXR0ZXJuID0gUGFyc2VyLlJlZ0V4cEZyb21TdHJpbmcocHJvcGVydGllcy5zdHJpbmcpO1xuLy9jb25zb2xlLmluZm8ocHJvcGVydGllcy5zdHJpbmcsIHByb3BlcnRpZXMucGF0dGVybik7XG5cdFx0fVxuXG4vL1x0XHRjb25zb2xlLmluZm8oXCJjcmVhdGluZyBzdHJpbmdcIiwgcHJvcGVydGllcyk7XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdH1cblxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cbi8vIE1lcmdlIHR3byBTeW1ib2wgcnVsZXMgdG9nZXRoZXIsIHJldHVybmluZyBhIG5ldyBydWxlIHRoYXQgbWF0Y2hlcyBib3RoLlxuUnVsZS5tZXJnZVN5bWJvbHMgPSBmdW5jdGlvbihmaXJzdCwgc2Vjb25kKSB7XG5cdHJldHVybiBuZXcgUnVsZS5TeW1ib2woeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cbi8vIEtleXdvcmQgcGF0dGVybi5cbi8vIFByb3BlcnRpZXM6XG4vL1x0LSBgcnVsZS5zdHJpbmdgIFx0KHJlcXVpcmVkKSBcdEtleXdvcmQgc3RyaW5nIHRvIG1hdGNoLlxuLy9cdC0gYHJ1bGUucGF0dGVybmBcdChvcHRpb25hbCkgXHRSZWdFeHAgZm9yIHRoZSBtYXRjaC5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0V2UnbGwgY3JlYXRlIG9uZSBmcm9tIGBzdHJpbmdgIGlmIG5lY2Vzc2FyeS5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0Tk9URTogZG8gTk9UIHN0YXJ0IHRoZSBgcGF0dGVybmAgd2l0aCBgXmAuXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLktleXdvcmQoKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gZGVyaXZlIGBwYXR0ZXJuYCBpZiBuZWNlc3NhcnkuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdC8vIGVuZm9yY2Ugd29yZCBib3VuZGFyaWVzIGFuZCBhbGxvdyBhcmJpdHJhcnkgc3BhY2UgYmV0d2VlbiB3b3Jkc1xuXHRcdFx0bGV0IHBhdHRlcm5TdHJpbmcgPSBQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhwcm9wZXJ0aWVzLnN0cmluZyk7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKFwiXFxcXGJcIiArIHBhdHRlcm5TdHJpbmcgKyBcIlxcXFxiXCIpO1xuXHRcdH1cblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuLy8gTWVyZ2UgdHdvIEtleXdvcmQgcnVsZXMgdG9nZXRoZXIsIGFkZGluZyB0aGUgc2Vjb25kIHRvIHRoZSBmaXJzdC5cblJ1bGUubWVyZ2VLZXl3b3JkcyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0cmV0dXJuIG5ldyBSdWxlLktleXdvcmQoeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIFwiIFwiICsgc2Vjb25kLnN0cmluZyB9KTtcbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlKHRoaXMucnVsZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEF0dGVtcHRpbmcgdG8gcGFyc2UgdW5rbm93biBydWxlICcke3RoaXMucnVsZX0nYCk7XG5cdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgbWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdHJldHVybiBtYXRjaDtcblx0fVxuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGUodGhpcy5ydWxlKTtcblx0XHRpZiAoIXJ1bGUpIHJldHVybiBmYWxzZTtcblx0XHRyZXR1cm4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHtcblxuXHQvLyBJcyB0aGlzIGRldGVybWluaXN0aWMsIGVnOiBhcmUgb3VyIHN1YnJ1bGVzIHVuYW1iaWdvdXNseSBkZXRlcm1pbmFibGU/XG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzLmV2ZXJ5KHJ1bGUgPT4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pKTtcblx0fVxufVxuXG5cbi8vIFNlcXVlbmNlIG9mIHJ1bGVzIHRvIG1hdGNoIChhdXRvLWV4Y2x1ZGluZyB3aGl0ZXNwYWNlKS5cblJ1bGUuU2VxdWVuY2UgPSBjbGFzcyBTZXF1ZW5jZSBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrID0gW10pIHtcblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHRpZiAoUnVsZS5zdGFja0NvbnRhaW5zKHN0YWNrLCB0aGlzLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0c3RhY2sgPSBzdGFjay5jb25jYXQoKTtcblx0XHRcdHN0YWNrLnB1c2goW3RoaXMsIHN0cmVhbV0pO1xuXHRcdH1cblxuXHRcdGxldCBtYXRjaGVkID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFtYXRjaCAmJiAhcnVsZS5vcHRpb25hbCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0XHRuZXh0ID0gbWF0Y2gubmV4dCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBpZiB3ZSBnZXQgaGVyZSwgd2UgbWF0Y2hlZCBhbGwgdGhlIHJ1bGVzIVxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG4vL1RPRE9DXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYG1hdGNoZWRgIGFycmF5IGluZGV4ZWQgYnlcblx0Ly9cdFx0LSBgbWF0Y2guYXJndW1lbnRgOlx0XHRhcmd1bWVudCBzZXQgd2hlbiBydWxlIHdhcyBkZWNsYXJlZCwgZWc6IGB7dmFsdWU6bGl0ZXJhbH1gID0+IGB2YWx1ZWBcblx0Ly9cdFx0LSBgbWF0Y2gucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gYHJ1bGUgdHlwZWA6XHRcdFx0XHRuYW1lIG9mIHRoZSBydWxlIHR5cGVcblx0Ly8gTk9URTogbWVtb2l6ZXMgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGlmICghdGhpcy5fcmVzdWx0cykge1xuXHRcdFx0bGV0IHJlc3VsdHMgPSB0aGlzLl9yZXN1bHRzID0ge307XG5cdFx0XHRmb3IgKGxldCBtYXRjaCBvZiB0aGlzLm1hdGNoZWQpIHtcblx0XHRcdFx0bGV0IGFyZ05hbWUgPSBtYXRjaC5hcmd1bWVudCB8fCBtYXRjaC5ydWxlTmFtZSB8fCBtYXRjaC5jb25zdHJ1Y3Rvci5uYW1lO1xuXG5cdFx0XHRcdC8vIElmIGFyZyBhbHJlYWR5IGV4aXN0cywgY29udmVydCB0byBhbiBhcnJheVxuXHRcdFx0XHRpZiAoYXJnTmFtZSBpbiByZXN1bHRzKSB7XG5cdFx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KHJlc3VsdHNbYXJnTmFtZV0pKSByZXN1bHRzW2FyZ05hbWVdID0gW3Jlc3VsdHNbYXJnTmFtZV1dO1xuXHRcdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0ucHVzaChtYXRjaCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmVzdWx0c1thcmdOYW1lXSA9IG1hdGNoO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLl9yZXN1bHRzO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBleHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIFN0YXRlbWVudHMgdGFrZSB1cCB0aGUgZW50aXJlIGxpbmUuXG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXgsIG1hdGNoaW5nIG9uZSBvZiBhIG51bWJlciBvZiBkaWZmZXJlbnQgcnVsZXMuXG4vLyBUaGUgcmVzdWx0IG9mIGEgcGFyc2UgaXMgdGhlIGxvbmdlc3QgcnVsZSB0aGF0IGFjdHVhbGx5IG1hdGNoZWQuXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBGaW5kIHRoZSBMT05HRVNUIG1hdGNoXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdC8vREVCVUdcblx0XHRsZXQgbWF0Y2hlcyA9IFtdO1xuXG5cdFx0bGV0IGJlc3RNYXRjaDtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKTtcblx0XHRcdGlmICghbWF0Y2gpIGNvbnRpbnVlO1xuXG5cdFx0XHQvLyB0YWtlIHRoZSBsb25nZXN0IG1hdGNoXG5cdFx0XHRpZiAoIWJlc3RNYXRjaCB8fCBtYXRjaC5lbmRJbmRleCA+IGJlc3RNYXRjaC5lbmRJbmRleClcblx0XHRcdFx0YmVzdE1hdGNoID0gbWF0Y2g7XG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlcy5wdXNoKG1hdGNoKTtcblx0XHR9XG5cblx0XHQvLyBERUJVR1xuLy8gXHRcdGlmIChtYXRjaGVzLmxlbmd0aCA+IDEpIHtcbi8vIFx0XHRcdGxldCBzdGFja0NvbnRlbnRzID0gc3RhY2subWFwKGl0ZW0gPT4gaXRlbVswXSk7XG4vLyBcdFx0XHRjb25zb2xlLmdyb3VwKHRoaXMucnVsZU5hbWUgKyBcIiBtYXRjaGVkIFwiK21hdGNoZXMubGVuZ3RoK1wiIHRpbWVzOlwiLCBzdGFja0NvbnRlbnRzKTtcbi8vIFx0XHRcdG1hdGNoZXMuZm9yRWFjaChtYXRjaCA9PiBjb25zb2xlLmxvZyhcIiAgXCIsIG1hdGNoLnRvU291cmNlKCkpKTtcbi8vIFx0XHRcdGNvbnNvbGUuZ3JvdXBFbmQoKTtcbi8vIFx0XHR9XG5cblx0XHRpZiAoIWJlc3RNYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGFzc2lnbiBgYXJnTmFtZWAgb3IgYHJ1bGVOYW1lYCBmb3IgYHJlc3VsdHNgXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIGJlc3RNYXRjaC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0ZWxzZSBpZiAodGhpcy5ydWxlTmFtZSkgYmVzdE1hdGNoLnJ1bGVOYW1lID0gdGhpcy5ydWxlTmFtZTtcblxuLy9UT0RPOiBvdGhlciB0aGluZ3MgdG8gY29weSBoZXJlPz8/XG5cdFx0cmV0dXJuIGJlc3RNYXRjaDtcblx0fVxuXG5cdGFkZFJ1bGUocnVsZSkge1xuXHRcdHRoaXMucnVsZXMucHVzaChydWxlKTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnRvU291cmNlKGNvbnRleHQpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAoJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGVzLmpvaW4oXCJ8XCIpfSkke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuLy8gUmVwZWF0aW5nIHJ1bGUuXG4vL1x0YHRoaXMucnVsZWAgaXMgdGhlIHJ1bGUgdGhhdCByZXBlYXRzLlxuLy9cbi8vIEFmdGVyIG1hdGNoaW5nOlxuLy9cdGB0aGlzLm1hdGNoZWRgIGlzIGFycmF5IG9mIHJlc3VsdHMgb2YgbWF0Y2hlcy5cbi8vXG4vL1x0QXV0b21hdGljYWxseSBjb25zdW1lcyB3aGl0ZXNwYWNlIGJlZm9yZSBydWxlcy5cbi8vXHRJZiBkb2Vzbid0IG1hdGNoIGF0IGxlYXN0IG9uZSwgcmV0dXJucyBgdW5kZWZpbmVkYC5cblJ1bGUuUmVwZWF0ID0gY2xhc3MgUmVwZWF0IGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2sgPSBbXSkge1xuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdGlmIChSdWxlLnN0YWNrQ29udGFpbnMoc3RhY2ssIHRoaXMsIHN0cmVhbSkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRzdGFjayA9IHN0YWNrLmNvbmNhdCgpO1xuXHRcdFx0c3RhY2sucHVzaChbdGhpcywgc3RyZWFtXSk7XG5cdFx0fVxuXG5cdFx0bGV0IG5leHQgPSBzdHJlYW07XG5cdFx0bGV0IG1hdGNoZWQgPSBbXTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IG1hdGNoID0gdGhpcy5ydWxlLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFtYXRjaCkgYnJlYWs7XG5cblx0XHRcdG1hdGNoZWQucHVzaChtYXRjaCk7XG5cdFx0XHRuZXh0ID0gbWF0Y2gubmV4dCgpO1xuXHRcdH1cblxuXHRcdGlmIChtYXRjaGVkLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBSZXR1cm5zIGFuIGFycmF5IHdpdGggYXJndW1lbnRzIG9mIGFsbCByZXN1bHRzLlxuXHQvLyBOT1RFOiBtZW1vaXplcyB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuX3Jlc3VsdHMgfHwgKHRoaXMuX3Jlc3VsdHMgPSB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC5yZXN1bHRzICkpO1xuXG5cdH1cblxuXHR0b1NvdXJjZSgpIHtcblx0XHR0aHJvdyBcIkRvbid0IHVuZGVyc3RhbmQgaG93IHRvIHNvdXJjZSBSdWxlLlJlcGVhdCFcIjtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdGNvbnN0IHJ1bGUgPSAodGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSB8fCB0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQgJiYgdGhpcy5ydWxlLnN0cmluZy5pbmNsdWRlcyhcIiBcIilcblx0XHRcdFx0ICAgPyBgKCR7dGhpcy5ydWxlfSlgXG5cdFx0XHRcdCAgIDogYCR7dGhpcy5ydWxlfWBcblx0XHRcdFx0KTtcblx0XHRyZXR1cm4gYCR7cnVsZX0ke3RoaXMub3B0aW9uYWwgPyAnKicgOiAnKyd9YDtcblx0fVxufVxuXG5cbi8vIExpc3QgbWF0Y2ggcnVsZTogICBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAuIGVnXCIgYFt7bnVtYmVyfSxdYCB0byBtYXRjaCBgMSwyLDNgXG4vL1x0YHJ1bGUuaXRlbWAgaXMgdGhlIHJ1bGUgZm9yIGVhY2ggaXRlbSxcbi8vXHRgcnVsZS5kZWxpbWl0ZXJgIGlzIHRoZSBkZWxpbWl0ZXIgYmV0d2VlbiBlYWNoIGl0ZW0uXG4vLyBcdGBydWxlLm1hdGNoZWRgIGluIHRoZSBvdXRwdXQgaXMgdGhlIGxpc3Qgb2YgdmFsdWVzLlxuLy9cbi8vXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhIExpc3QgcnVsZSB3aWxsIE5PVCByZXBlYXQgKD8/Pz8pXG5SdWxlLkxpc3QgPSBjbGFzcyBMaXN0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCBzdHJlYW1dKTtcblx0XHR9XG5cblx0XHQvLyBlbnN1cmUgaXRlbSBhbmQgZGVsaW1pdGVyIGFyZSBvcHRpb25hbCBzbyB3ZSBkb24ndCBiYXJmIGluIGBwYXJzZVJ1bGVgXG5cdFx0dGhpcy5pdGVtLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR0aGlzLmRlbGltaXRlci5vcHRpb25hbCA9IHRydWU7XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHQvLyBnZXQgbmV4dCBpdGVtLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGl0ZW0gPSB0aGlzLml0ZW0ucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdG1hdGNoZWQucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghZGVsaW1pdGVyKSBicmVhaztcblx0XHRcdG5leHQgPSBkZWxpbWl0ZXIubmV4dCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBtYXRjaGVkWzBdID8gbWF0Y2hlZFswXS5zdGFydEluZGV4IDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gbWF0Y2hlZCBpdGVtIGJ5IGluZGV4XG5cdGdldEl0ZW0oaW5kZXgpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkW2luZGV4XTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcdFx0Ly8gVE9ETzogdGhyb3c/Pz9cblx0XHRsZXQgbWF0Y2hlZCA9IHRoaXMubWF0Y2hlZC5tYXAoIG1hdGNoID0+IG1hdGNoLnRvU291cmNlKGNvbnRleHQpICkuam9pbihcIiwgXCIpO1xuXHRcdHJldHVybiBgWyR7bWF0Y2hlZH1dYDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgWyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5pdGVtfSAke3RoaXMuZGVsaW1pdGVyfV0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZS5qcyIsImltcG9ydCB7IGRlZmluZU1lbW9pemVkIH0gZnJvbSBcIi4vbWVtb2l6ZS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gcmUtZXhwb3J0IFJ1bGUgZm9yIHRlc3RpbmdcbmV4cG9ydCBkZWZhdWx0IFJ1bGU7XG5cbi8vXG4vL1x0IyBQYXJzaW5nIGBydWxlU3ludGF4YCB0byBjcmVhdGUgcnVsZXMgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUT0RPOlx0UHVsbCBgcGFyc2VSdWxlU3ludGF4YCBzdHVmZiBvdXQgaW50byBzZXBhcmF0ZSBtb2R1bGU/XG4vLyBUT0RPOlx0QmV0dGVyIG5hbWUgZm9yIGBydWxlU3ludGF4YFxuLy8gVE9ETzpcdFVzZSBrZXl3b3JkcyBpbiBzeW50YXggdG8gbWFrZSBhIHF1aWNrIHJlZ2V4LWJhc2VkIGB0ZXN0YCBmdW5jdGlvbiBmb3IgdGhlIGVudGlyZSBydWxlXG5PYmplY3QuYXNzaWduKFJ1bGUsIHtcblxuLy9cbi8vICMjIGdyb3VwOiBwYXJzaW5nIHN5bnRheFxuLy9cblxuLy8gVE9ETzogY29udmVydCB0byBUZXh0U3RyZWFtIHBhdHRlcm4gYWxhIG5vcm1hbCBwYXJzZXIgb25jZSB0aGF0IHNldHRsZXMgZG93bj8/P1xuXHRwYXJzZVJ1bGVTeW50YXgoc3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIFtdKTtcblxuXHRcdGxldCBydWxlO1xuXHRcdC8vIElmIHdlIG9ubHkgZ290IG9uZSB0aGluZywgcmV0dXJuIHRoYXQgYXMgdGhlIHJlc3VsdFxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSBydWxlc1swXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFNlcXVlbmNlQ29uc3RydWN0b3IoeyBydWxlcyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fSxcblxuXHR0b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KSB7XG5cdFx0Y29uc3QgU1lOVEFYX0VYUFJFU1NJT04gPSAvKD86W1xcd1xcLV0rfFxcXFxbXFxbXFwoXFx7XFwpXFx9XFxdXXxbXlxcc1xcd118XFx8KS9nO1xuXHRcdHZhciBzeW50YXhTdHJlYW0gPSBzeW50YXgubWF0Y2goU1lOVEFYX0VYUFJFU1NJT04pO1xuXHRcdGlmICghc3ludGF4U3RyZWFtKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHRva2VuaXplIHBhcnNlIHJ1bGUgc3ludGF4ID4+JHtzeW50YXh9PDxgKTtcblx0XHRyZXR1cm4gc3ludGF4U3RyZWFtO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbGFzdEluZGV4ID0gc3ludGF4U3RyZWFtLmxlbmd0aDtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKHJ1bGUpIHtcblx0XHRcdFx0dmFyIGxhc3QgPSBydWxlc1tydWxlcy5sZW5ndGgtMV07XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgU3RyaW5nYCBhbmQgbGFzdCB3YXMgYSBgU3RyaW5nYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0aWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG5cdFx0XHRcdFx0cnVsZXMucG9wKCk7XG5cdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG5cdFx0XHRcdFx0cnVsZSA9IFJ1bGUubWVyZ2VTeW1ib2xzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgS2V5d29yZGAgYW5kIGxhc3Qgd2FzIGFsc28gYSBgS2V5d29yZGAsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGVsc2UgaWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkKSB7XG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBsYXN0IHJ1bGVcblx0XHRcdFx0XHRydWxlcy5wb3AoKTtcblx0XHRcdFx0XHQvLyBhbmQgcmVwbGFjZSB3aXRoIGEgcnVsZSB0aGF0IG1lcmdlcyB0aGUga2V5d29yZHNcblx0XHRcdFx0XHRydWxlID0gUnVsZS5tZXJnZUtleXdvcmRzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJ1bGVzLnB1c2gocnVsZSk7XG5cdFx0XHR9XG5cdFx0XHRzdGFydEluZGV4ID0gZW5kSW5kZXggKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZXM7XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0dmFyIHN5bnRheFRva2VuID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXG5cdFx0Ly8gaWYgd2UgZ290IGEgXCJcXFxcXCIgKHdoaWNoIGFsc28gaGFzIHRvIGdvIGludG8gdGhlIHNvdXJjZSBzdHJpbmcgYXMgXCJcXFxcXCIpXG5cdFx0Ly8gdHJlYXQgdGhlIG5leHQgdG9rZW4gYXMgYSBsaXRlcmFsIHN0cmluZyByYXRoZXIgdGhhbiBhcyBhIHNwZWNpYWwgY2hhcmFjdGVyLlxuXHRcdGlmIChzeW50YXhUb2tlbiA9PT0gXCJcXFxcXCIpIHtcblx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCArIDEpO1xuXHRcdH1cblxuXHRcdHN3aXRjaCAoc3ludGF4VG9rZW4pIHtcblx0XHRcdGNhc2UgXCJ7XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIoXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiW1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKlwiOlxuXHRcdFx0Y2FzZSBcIitcIjpcblx0XHRcdGNhc2UgXCI/XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0XHQvLyB0aGUgZm9sbG93aW5nIHNob3VsZCBBTFdBWVMgYmUgY29uc3VtZWQgYnkgdGhlIGFib3ZlXG5cdFx0XHRjYXNlIFwifVwiOlxuXHRcdFx0Y2FzZSBcIilcIjpcblx0XHRcdGNhc2UgXCJdXCI6XG5cdFx0XHRjYXNlIFwifFwiOlxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgJHtzeW50YXhUb2tlbn0gZm91bmQgYXMgaXRlbSAke3N0YXJ0SW5kZXh9IG9mICR7dGhpcy5zeW50YXh9YCk7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzdHJpbmcgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF0sIHJ1bGU7XG5cdFx0Ly8gSWYgbGV0dGVycyBvbmx5LCBtYXRjaCBhcyBhIEtleXdvcmQgKHNvIHdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGFmdGVyIHRoZSBzdHJpbmcpLlxuXHRcdGlmIChzdHJpbmcubWF0Y2goL1tBLVphLXpdKy8pKSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuS2V5d29yZCh7IHN0cmluZyB9KTtcblx0XHR9XG5cdFx0Ly8gT3RoZXJ3aXNlIG1hdGNoIGFzIGEgU3RyaW5nLCB3aGljaCBkb2Vzbid0IHJlcXVpcmUgbm9uLXdvcmQgY2hhcnMgYWZ0ZXIgdGhlIHRleHQuXG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuU3ltYm9sKHsgc3RyaW5nOiBzdHJpbmcgfSk7XG5cdFx0XHQvLyBJZiBzdHJpbmcgc3RhcnRzIHdpdGggYFxcXFxgLCBpdCdzIGFuIGVzY2FwZWQgbGl0ZXJhbCAoZWc6IGBcXFtgIG5lZWRzIHRvIGlucHV0IGFzIGBcXFxcW2ApLlxuXHRcdFx0aWYgKHN0cmluZy5zdGFydHNXaXRoKFwiXFxcXFwiKSkge1xuXHRcdFx0XHQvLyByZW1vdmUgbGVhZGluZyBzbGFzaCBpbiBtYXRjaCBzdHJpbmcuLi5cblx0XHRcdFx0cnVsZS5zdHJpbmcgPSBydWxlLnN0cmluZy5zdWJzdHIoMSk7XG5cdFx0XHRcdC8vIGJ1dCBsZWF2ZSBpdCBpbiB0b1N0cmluZ1xuXHRcdFx0XHRydWxlLnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gWyBydWxlLCBzdGFydEluZGV4IF07XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBncm91cGluZyBleHByZXNzaW9uIGAoLi4ufC4uLilgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0Ly8gTk9URTogbmVzdGVkIHBhcmVucyBtYXkgbm90IGhhdmUgYWx0ZXJuYXRpdmVzLi4uIDotKCAgIGAoYXwoYnxjKSlgIHdvbid0IHdvcms/Pz9cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCIoXCIsIFwiKVwiLCBzdGFydEluZGV4KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHQvLyBzcGxpdCBpbnRvIGdyb3VwcywgaW5jbHVkaW5nIG5lc3RlZCBwYXJlbnNcblx0XHRsZXQgYWx0ZXJuYXRpdmVzID1cblx0XHRcdGdyb3VwQWx0ZXJuYXRpdmVzKHNsaWNlKVxuXHRcdFx0Lm1hcChmdW5jdGlvbihncm91cCkge1xuXHRcdFx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2Vucyhncm91cCwgW10pO1xuXHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0c1swXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IFJ1bGUuU2VxdWVuY2UoeyBydWxlczogcmVzdWx0cyB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRsZXQgcnVsZSA9IGFsdGVybmF0aXZlcy5sZW5ndGggPT09IDEgPyBhbHRlcm5hdGl2ZXNbMF0gOiBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlczogYWx0ZXJuYXRpdmVzIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cblx0XHRmdW5jdGlvbiBncm91cEFsdGVybmF0aXZlcyh0b2tlbnMpIHtcblx0XHRcdHZhciBhbHRlcm5hdGl2ZXMgPSBbXTtcblx0XHRcdHZhciBjdXJyZW50ID0gW107XG5cdFx0XHRmb3IgKHZhciBpID0gMCwgdG9rZW47IHRva2VuID0gdG9rZW5zW2ldOyBpKyspIHtcblx0XHRcdFx0Ly8gaGFuZGxlIGFsdGVybmF0ZSBtYXJrZXJcblx0XHRcdFx0aWYgKHRva2VuID09PSBcInxcIikge1xuXHRcdFx0XHRcdGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBbXTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBoYW5kbGUgbmVzdGVkIHBhcmVuc1xuXHRcdFx0XHRlbHNlIGlmICh0b2tlbiA9PT0gXCIoXCIpIHtcblx0XHRcdFx0XHRsZXQgeyBlbmRJbmRleCB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBcIihcIiwgXCIpXCIsIGkpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBjdXJyZW50LmNvbmNhdCh0b2tlbnMuc2xpY2UoaSwgZW5kSW5kZXggKyAxKSk7XG5cdFx0XHRcdFx0aSA9IGVuZEluZGV4O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGN1cnJlbnQucHVzaCh0b2tlbik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChjdXJyZW50Lmxlbmd0aCkgYWx0ZXJuYXRpdmVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRyZXR1cm4gYWx0ZXJuYXRpdmVzO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCByZXBlYXQgaW5kaWNhdG9yIGA/YCwgYCtgIG9yIGAqYCBieSBhdHRhY2hpbmcgaXQgdG8gdGhlIHByZXZpb3VzIHJ1bGUuXG5cdHBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzeW1ib2wgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cdFx0dmFyIHJ1bGUgPSBydWxlc1tydWxlcy5sZW5ndGggLSAxXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgYXR0YWNoIHJlcGVhdCBzeW1ib2wgJHtzeW1ib2x9IHRvIGVtcHR5IHJ1bGUhYCk7XG5cblx0XHQvLyBUcmFuc2Zvcm0gbGFzdCBydWxlIGludG8gYSByZXBlYXQgZm9yIGAqYCBhbmQgYCtgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiKlwiIHx8IHN5bWJvbCA9PT0gXCIrXCIpIHtcblx0XHRcdGxldCBhcmd1bWVudCA9IHJ1bGUuYXJndW1lbnQ7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuUmVwZWF0KHsgcnVsZSB9KTtcblx0XHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdFx0Ly8gcHVzaCBpbnRvIHJ1bGUgc3RhY2sgaW4gcGxhY2Ugb2Ygb2xkIHJ1bGVcblx0XHRcdHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdID0gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBSdWxlIGlzIG9wdGlvbmFsIGZvciBgP2AgYW5kIGAqYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIj9cIiB8fCBzeW1ib2wgPT09IFwiKlwiKSB7XG5cdFx0XHRydWxlLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gWyB1bmRlZmluZWQsIHN0YXJ0SW5kZXggXVxuXHR9LFxuXG5cdC8vIE1hdGNoIGB7PHJ1bGVOYW1lPn1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCBtYXRjaCA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJ7XCIsIFwifVwiLCBzdGFydEluZGV4KTtcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA9PT0gMyAmJiBtYXRjaC5zbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gbWF0Y2guc2xpY2VbMF07XG5cdFx0XHRtYXRjaC5zbGljZSA9IG1hdGNoLnNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID4gMSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBwcm9jZXNzIHJ1bGVzIHdpdGggbW9yZSB0aGFuIG9uZSBydWxlIG5hbWU6IHske21hdGNoLnNsaWNlLmpvaW4oXCJcIil9fWApO1xuXG5cdFx0dmFyIHBhcmFtcyA9IHsgcnVsZTogbWF0Y2guc2xpY2VbMF0gfTtcblxuXHRcdC8vIHNlZSBpZiB0aGVyZSdzIGEgYG5vdGAgcnVsZSBpbiB0aGVyZVxuXHRcdGxldCBiYW5nUG9zaXRpb24gPSBwYXJhbXMucnVsZS5pbmRleE9mKFwiIVwiKTtcblx0XHRpZiAoYmFuZ1Bvc2l0aW9uICE9PSAtMSkge1xuXHRcdFx0cGFyYW1zLm5vdCA9IHBhcmFtcy5ydWxlLnN1YnN0cihiYW5nUG9zaXRpb24gKyAxKTsgLy9bIHBhcmFtcy5ydWxlLnN1YnN0cihiYW5nUG9zaXRpb24gKyAxKSBdO1xuXHRcdFx0cGFyYW1zLnJ1bGUgPSBwYXJhbXMucnVsZS5zdWJzdHIoMCwgYmFuZ1Bvc2l0aW9uKTtcblx0XHR9XG5cblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlN1YnJ1bGUocGFyYW1zKTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBtYXRjaC5lbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuTGlzdCgpO1xuXHRcdHJ1bGUuaXRlbSA9IHJlc3VsdHNbMF1cblx0XHRydWxlLmRlbGltaXRlciA9IHJlc3VsdHNbMV1cblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG59KTtcblxuXG5cbi8vICMjICBBZGQgbWV0aG9kcyB0byBQYXJzZXIgdG8gZGVmaW5lIHJ1bGVzIHVzaW5nIHRoZSBhYm92ZSBzeW50YXguXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhQYXJzZXIucHJvdG90eXBlLCB7XG5cblx0Ly8gUGFyc2UgYSBgcnVsZVN5bnRheGAgcnVsZSBhbmQgYWRkIGl0IHRvIG91ciBsaXN0IG9mIHJ1bGVzLlxuXHQvLyBSZXR1cm5zIHRoZSBuZXcgcnVsZS5cblx0Ly8gTG9ncyBwYXJzaW5nIGVycm9ycyBidXQgYWxsb3dzIHRoaW5ncyB0byBjb250aW51ZS5cblx0YWRkU3ludGF4OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBjb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCAzIGFyZ3MsIGFuZCAybmQgaXMgYSBmdW5jdGlvbiwgdXNlIGl0IGFzIGNvbnN0cnVjdG9yIGluc3RlYWRcblx0XHRpZiAocHJvcGVydGllcyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0XHRjb25zdHJ1Y3RvciA9IHByb3BlcnRpZXM7XG5cdFx0XHRwcm9wZXJ0aWVzID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHR0cnkge1xuXHRcdFx0bGV0IHJ1bGUgPSBSdWxlLnBhcnNlUnVsZVN5bnRheChydWxlU3ludGF4LCBjb25zdHJ1Y3Rvcik7XG5cdFx0XHQvLyBSZWZsZWN0IHRoZSBydWxlIGJhY2sgb3V0IHRvIG1ha2Ugc3VyZSBpdCBsb29rcyAobW9yZSBvciBsZXNzKSB0aGUgc2FtZVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGVkIHJ1bGUgJyR7bmFtZX0nOlxcbiAgSU5QVVQ6ICR7cnVsZVN5bnRheH0gXFxuIE9VVFBVVDogJHtydWxlfWApO1xuXG5cdFx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5ncm91cChgRXJyb3IgcGFyc2luZyBzeW50YXggZm9yIHJ1bGUgJyR7bmFtZX0nOmApO1xuXHRcdFx0Y29uc29sZS5sb2coYHN5bnRheDogJHtydWxlU3ludGF4fWApO1xuXHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHR9XG5cdH19LFxuXG5cdGFkZFN0YXRlbWVudDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgY29uc3RydWN0b3IgPSBSdWxlLlN0YXRlbWVudCkge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgY29uc3RydWN0b3IpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRFeHByZXNzaW9uOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBjb25zdHJ1Y3RvciA9IFJ1bGUuRXhwcmVzc2lvbikge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgY29uc3RydWN0b3IpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBydWxlKTtcblx0fX0sXG5cblx0Ly8gQWRkIGluZml4IG9wZXJhdG9yLCBzdWNoIGFzIFwiYSBvciBiXCIuXG5cdC8vIE5PVEU6IGlmIHlvdSBoYXZlIG1vcmUgdGhhbiBvbmUgbWF0Y2hpbmcgb3BlcmF0b3IsXG5cdC8vXHRcdCBwYXNzIGluIGFuIGFycmF5IG9mIHNpbXBsZSBzdHJpbmdzIHNvIGFsbCBvZiBvdXIgb3BlcmF0b3JzIGFyZSBzaW1wbGUgc3RyaW5ncy5cblx0YWRkSW5maXhPcGVyYXRvcjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKSB7XG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZEluZml4T3BlcmF0b3IobmFtZSwgc3ludGF4LCBwcm9wZXJ0aWVzKSk7XG5cdFx0fVxuXG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkge1xuXHRcdFx0aWYgKCFydWxlLnRvSlMpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgaW5maXggb3BlcmF0b3IgcnVsZSAnJHtuYW1lfScgdG8gc3BlY2lmeSAndG9KUycgZnVuY3Rpb25gKVxuXHRcdFx0fVxuXHRcdFx0Ly8gY2xlYXIgbGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgZm9yIGdldHRlciBiZWxvd1xuXHRcdFx0ZGVsZXRlIHRoaXMuX19pbmZpeE9wZXJhdG9ycztcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJpbmZpeF9vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH19LFxuXG5cdC8vIExpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGFzIHN0cmluZ3MuXG5cdC8vIFJlLW1lbW9pemVkIGFmdGVyIGBhZGRJbmZpeE9wZXJhdG9yYCBhYm92ZS5cblx0aW5maXhPcGVyYXRvcnM6IGRlZmluZU1lbW9pemVkKFwiX19pbmZpeE9wZXJhdG9yc1wiLFxuXHRcdGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ydWxlc1tcImluZml4X29wZXJhdG9yXCJdXG5cdFx0XHRcdFx0XHQgJiYgdGhpcy5ydWxlc1tcImluZml4X29wZXJhdG9yXCJdLnJ1bGVzLm1hcChydWxlID0+IHJ1bGUuc3RyaW5nKVxuXHR9KSxcblxuXHQvLyBBZGQgcG9zdGZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgaXMgZGVmaW5lZFwiXG5cdC8vIE5PVEU6IGlmIHlvdSBoYXZlIG1vcmUgdGhhbiBvbmUgbWF0Y2hpbmcgb3BlcmF0b3IsXG5cdC8vXHRcdCBwYXNzIGluIGFuIGFycmF5IG9mIHNpbXBsZSBzdHJpbmdzIHNvIGFsbCBvZiBvdXIgb3BlcmF0b3JzIGFyZSBzaW1wbGUgc3RyaW5ncy5cblx0YWRkUG9zdGZpeE9wZXJhdG9yOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpIHtcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkUG9zdGZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50b0pTKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIHBvc3RmaXggb3BlcmF0b3IgcnVsZSAnJHtuYW1lfScgdG8gc3BlY2lmeSAndG9KUycgZnVuY3Rpb25gKTtcblx0XHRcdH1cblx0XHRcdC8vIGNsZWFyIGxpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGZvciBnZXR0ZXIgYmVsb3dcblx0XHRcdGRlbGV0ZSB0aGlzLl9fcG9zdGZpeE9wZXJhdG9ycztcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJwb3N0Zml4X29wZXJhdG9yXCIsIHJ1bGUpO1xuXHRcdH1cblx0fX0sXG5cblx0Ly8gTGlzdCBvZiBwb3N0Zml4IG9wZXJhdG9ycyBhcyBzdHJpbmdzLlxuXHQvLyBSZS1tZW1vaXplZCBhZnRlciBgYWRkSW5maXhPcGVyYXRvcmAgYWJvdmUuXG5cdHBvc3RmaXhPcGVyYXRvcnM6IGRlZmluZU1lbW9pemVkKFwiX19wb3NmaXhPcGVyYXRvcnNcIixcblx0XHRmdW5jdGlvbigpeyByZXR1cm4gdGhpcy5ydWxlc1tcInBvc3RmaXhfb3BlcmF0b3JcIl1cblx0XHRcdFx0XHRcdCYmIHRoaXMucnVsZXNbXCJwb3N0Zml4X29wZXJhdG9yXCJdLnJ1bGVzLm1hcChydWxlID0+IHJ1bGUuc3RyaW5nKTtcblx0fSlcbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGVTeW50YXguanMiLCIvL1xuLy9cdCMgQ29yZSBgcnVsZXNgIC0tIHNpbXBsZSBkYXRhdHlwZXMsIGV0Yy5cbi8vXG4vLyBOT1RFOiBtYW55IG9mIHRoZSBiZWxvdyBhcmUgY3JlYXRlZCBhcyBjdXN0b20gUGF0dGVybiBzdWJjbGFzc2VzIGZvciBkZWJ1Z2dpbmcuXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBgd2hpdGVzcGFjZWAgcnVsZS5cbi8vIE5PVEUgYHBhcnNlci5wYXJzZShcIndoaXRlc3BhY2VcIiwgXCIgICBcIilgIHdpbGwgcmV0dXJuIGB1bmRlZmluZWRgXG4vL1x0XHQgYmVjYXVzZSBgcGFyc2VyLnBhcnNlKClgIGF1dG9tYXRpY2FsbHkgZWF0cyB3aGl0ZXNwYWNlIGF0IHRoZSBzdGFydCBvZiBhIHJ1bGUuXG5SdWxlLldoaXRlc3BhY2UgPSBjbGFzcyB3aGl0ZXNwYWNlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9XG5wYXJzZXIuYWRkUnVsZShcIndoaXRlc3BhY2VcIiwgbmV3IFJ1bGUuV2hpdGVzcGFjZSh7IHBhdHRlcm46IC9cXHMrLywgb3B0aW9uYWw6IHRydWUgfSkpO1xuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5JZGVudGlmaWVyID0gY2xhc3MgaWRlbnRpZmllciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBpZGVudGlmaWVyID0gcGFyc2VyLmFkZFJ1bGUoXCJpZGVudGlmaWVyXCIsIG5ldyBSdWxlLklkZW50aWZpZXIoe1xuXHRwYXR0ZXJuOiAvW2Etel1bXFx3XFwtXSovLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgaWRlbnRpZmllcik7XG5cbi8vIEFkZCBFbmdsaXNoIHByZXBvc2l0aW9ucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vXG4vLyBXaWtpcGVkaWEgXCJQcmVwb3NpdGlvblwiOlxuLy9cdFwiUHJlcG9zaXRpb25zLi4uYXJlIGEgY2xhc3Mgb2Ygd29yZHMgdGhhdFxuLy9cdGV4cHJlc3Mgc3BhdGlhbCBvciB0ZW1wb3JhbCByZWxhdGlvbnMgIChpbiwgdW5kZXIsIHRvd2FyZHMsIGJlZm9yZSlcbi8vXHRvciBtYXJrIHZhcmlvdXMgc2VtYW50aWMgcm9sZXMgKG9mLCBmb3IpLlxuLy8gVEVTVE1FXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhYm91dFwiLCBcImFib3ZlXCIsIFwiYWZ0ZXJcIiwgXCJhbmRcIiwgXCJhc1wiLCBcImF0XCIsXG5cdFwiYmVmb3JlXCIsIFwiYmVoaW5kXCIsIFwiYmVsb3dcIiwgXCJiZW5lYXRoXCIsIFwiYmVzaWRlXCIsIFwiYmV0d2VlblwiLCBcImJleW9uZFwiLCBcImJ5XCIsXG5cdFwiZGVmaW5lZFwiLCBcImRvd25cIiwgXCJkdXJpbmdcIixcblx0XCJlYWNoXCIsIFwiZW1wdHlcIiwgXCJleGFjdGx5XCIsIFwiZXhjZXB0XCIsXG5cdFwiZm9yXCIsIFwiZnJvbVwiLFxuXHRcImdyZWF0ZXJcIixcblx0XCJpblwiLCBcImludG9cIixcblx0XCJsZXNzXCIsIFwibG9uZ1wiLFxuXHRcIm1pbnVzXCIsIFwibW9yZVwiLFxuXHRcIm5lYXJcIiwgXCJub3RcIixcblx0XCJvZlwiLCBcIm9mZlwiLCBcIm9uXCIsIFwib250b1wiLCBcIm9wcG9zaXRlXCIsIFwib3V0XCIsIFwib3V0c2lkZVwiLCBcIm92ZXJcIixcblx0XCJzaG9ydFwiLCBcInNpbmNlXCIsXG5cdFwidGhhblwiLCBcInRoZVwiLCBcInRoZW5cIiwgXCJ0aHJvdWdoXCIsIFwidGhydVwiLCBcInRvXCIsIFwidG93YXJkXCIsIFwidG93YXJkc1wiLFxuXHRcInVuZGVmaW5lZFwiLCBcInVuZGVyXCIsIFwidW5kZXJuZWF0aFwiLCBcInVuaXF1ZVwiLCBcInVudGlsXCIsIFwidXBcIiwgXCJ1cG9uXCIsIFwidXBzaWRlXCIsXG5cdFwidmVyc3VzXCIsIFwidnNcIixcblx0XCJ3aXRoXCIsIFwid2l0aGluXCIsIFwid2l0aG91dFwiLFxuKTtcblxuLy8gQWRkIGNvbW1vbiBlbmdsaXNoIHZlcmJzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYXJlXCIsXG5cdFwiZG9cIiwgXCJkb2VzXCIsXG5cdFwiY29udGFpbnNcIixcblx0XCJoYXNcIiwgXCJoYXZlXCIsXG5cdFwiaXNcIixcblx0XCJyZXBlYXRcIixcblx0XCJ3YXNcIiwgXCJ3ZXJlXCJcbik7XG5cbi8vIEFkZCBzcGVjaWFsIGNvbnRyb2wga2V5d29yZHMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJlbHNlXCIsXG5cdFwiaWZcIixcblx0XCJvdGhlcndpc2VcIixcblx0XCJ3aGlsZVwiXG4pO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLlR5cGUgPSBjbGFzcyB0eXBlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IHR5cGUgPSBwYXJzZXIuYWRkUnVsZShcInR5cGVcIiwgbmV3IFJ1bGUuVHlwZSh7XG5cdHBhdHRlcm46IC9bQS1aXVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCB0eXBlKTtcblxuXG4vLyBgbnVtYmVyYCBhcyBlaXRoZXIgZmxvYXQgb3IgaW50ZWdlciwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuUnVsZS5OdW1iZXIgPSBjbGFzcyBudW1iZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgbnVtYmVyID0gcGFyc2VyLmFkZFJ1bGUoXCJudW1iZXJcIiwgbmV3IFJ1bGUuTnVtYmVyKHtcblx0cGF0dGVybjogLy0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VGbG9hdCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG51bWJlcik7XG5cblxuLy8gTnVtZXJpYyBgaW50ZWdlcmAgb25seSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gTk9URTogdGhpcyBXSUxMIG1hdGNoIGEgZmxvYXQsIGJ1dCB0aGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBjb2VyY2UgdG8gYW4gaW50ZWdlci5cbi8vIFJFVklFVzogaXMgdGhpcyByaWdodD8gIEJldHRlciB0byBub3QgbWF0Y2ggYSBmbG9hdD9cblJ1bGUuSW50ZWdlciA9IGNsYXNzIGludGVnZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImludGVnZXJcIiwgbmV3IFJ1bGUuSW50ZWdlcih7XG5cdHBhdHRlcm46IC8tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gaW50ZWdlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUludCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xuXG5cbi8vIExpdGVyYWwgYHRleHRgIHN0cmluZywgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gWW91IGNhbiB1c2UgZWl0aGVyIHNpbmdsZSBvciBkb3VibGUgcXVvdGVzIG9uIHRoZSBvdXRzaWRlIChhbHRob3VnaCBkb3VibGUgcXVvdGVzIGFyZSBwcmVmZXJyZWQpLlxuLy8gUmV0dXJuZWQgdmFsdWUgaGFzIGVuY2xvc2luZyBxdW90ZXMuXG4vLyBUT0RPOiBlc2NhcGVkIHF1b3RlcyBpbnNpZGUgc3RyaW5nXG5SdWxlLlRleHQgPSBjbGFzcyB0ZXh0IGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IHRleHQgPSBwYXJzZXIuYWRkUnVsZShcInRleHRcIiwgbmV3IFJ1bGUuVGV4dCh7XG5cdHBhdHRlcm46IC8oPzpcIlteXCJdKlwifCdbXiddKicpL1xufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHRleHQpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cblJ1bGUuQm9vbGVhbiA9IGNsYXNzIGJvb2xlYW4gZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgYm9vbCA9IHBhcnNlci5hZGRSdWxlKFwiYm9vbGVhblwiLCBuZXcgUnVsZS5Cb29sZWFuKHtcblx0cGF0dGVybjogLyh0cnVlfGZhbHNlfHllc3xub3xva3xjYW5jZWwpXFxiLyxcblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0Y2FzZSBcInRydWVcIjpcblx0XHRcdGNhc2UgXCJ5ZXNcIjpcblx0XHRcdGNhc2UgXCJva1wiOlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBib29sKTtcbi8vIEFkZCBib29sZWFuIHRva2VucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vIFRFU1RNRVxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwidHJ1ZVwiLCBcImZhbHNlXCIsXG5cdFwieWVzXCIsIFwibm9cIixcblx0XCJva1wiLCBcImNhbmNlbFwiXG4pO1xuXG4vLyBMaXRlcmFsIGxpc3QgKGFycmF5KSwgZWc6ICBgWzEsMix0cnVlLGZhbHNlIF1gXG5sZXQgbGlzdCA9IHBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpdGVyYWxfbGlzdFwiLFxuXHRcIlxcXFxbW2xpc3Q6e2V4cHJlc3Npb259LF0/XFxcXF1cIixcblx0Y2xhc3MgbGl0ZXJhbF9saXN0IGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblxuLy9UT0RPOiBzcXVpcnJlbHkuLi5cblx0XHQvLyBXaGVuIGdhdGhlcmluZyBhcmd1bWVudHMsIHJldHVybiBqdXN0IHRoZSBtYXRjaGVkIGxpc3QgZGF0YSwgaWdub3JpbmcgdGhlIGJyYWNrZXRzLlxuXHRcdGdldCByZXN1bHRzKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMubWF0Y2hlZFsxXTtcblx0XHR9XG5cblx0XHQvLyByZXR1cm4ganVzdCB0aGUgbGlzdCBhcyBvdXIgc291cmNlXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuIFx0XHRcdHJldHVybiB0aGlzLnJlc3VsdHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvblxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvblwiLFxuXHRcIlxcXFwoe2V4cHJlc3Npb259XFxcXClcIixcblx0Y2xhc3MgcGFyZW50aGVzaXplZF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiB0aGlzLm1hdGNoZWRbMV07XG5cdFx0fVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBleHByZXNzaW9uID0gdGhpcy5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gZG9uJ3QgZG91YmxlIHBhcmVucyBpZiBub3QgbmVjZXNzYXJ5XG5cdFx0XHRpZiAodHlwZW9mIGV4cHJlc3Npb24gPT09IFwic3RyaW5nXCIgJiYgZXhwcmVzc2lvbi5zdGFydHNXaXRoKFwiKFwiKSAmJiBleHByZXNzaW9uLmVuZHNXaXRoKFwiKVwiKSkgcmV0dXJuIGV4cHJlc3Npb247XG5cdFx0XHRyZXR1cm4gYCgke2V4cHJlc3Npb259KWA7XG5cdFx0fVxuXHR9XG4pXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY29yZS5qcyIsIlxuLy8gVE9ETzogY29udmVydCB0byBsaW5lLWF3YXJlIHN0cmVhbT8/P1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFN0cmVhbSB7XG5cdC8vIFlvdSBjYW4gY29uc3RydWN0IHdpdGggYSB0ZXh0IHN0cmluZyBvciBhIHNldCBvZiBwcm9wZXJ0aWVzIChpbmNsdWRpbmcgYHRleHRgKS5cblx0Y29uc3RydWN0b3IoLi4udGV4dE9yUHJvcHMpIHtcblx0XHR0ZXh0T3JQcm9wcy5mb3JFYWNoKChhcmcpID0+IHtcblx0XHRcdGlmICh0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdHRoaXMudGV4dCA9IGFyZztcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGFyZykge1xuXHRcdFx0XHRPYmplY3QuYXNzaWduKHRoaXMsIGFyZyk7XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8vIE1ha2Ugc3VyZSBgdGV4dGAgYW5kIGBzdGFydEluZGV4YCBhcmUgZGVmaW5lZC5cblx0XHRpZiAoIShcInRleHRcIiBpbiB0aGlzKSkgdGhpcy50ZXh0ID0gXCJcIjtcblx0XHRpZiAoIShcInN0YXJ0SW5kZXhcIiBpbiB0aGlzKSkgdGhpcy5zdGFydEluZGV4ID0gMDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBpbW11dGFibGUgY2xvbmUgb2YgdGhlIHN0cmVhbS5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRyZXR1cm4gbmV3IFRleHRTdHJlYW0odGhpcywgcHJvcHMpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jZWQgdG8gbmV3IHN0YXJ0SW5kZXguXG5cdGFkdmFuY2VUbyhzdGFydEluZGV4KSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4IH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jaW5nIHN0YXJ0SW5kZXggQlkgYGxlbmd0aGBcblx0YWR2YW5jZUJ5KGxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuXHR9XG5cbi8vIFx0Ly8gUmV0dXJuIGNsb25lIG9mIHRoaXMgc3RyZWFtIHdpdGggZW5kSW5kZXggc2V0IHRvIHN0YXJ0ICsgYGxlbmd0aGBcbi8vIFx0ZW5kQWZ0ZXIobGVuZ3RoKSB7XG4vLyBcdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBlbmRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuLy8gXHR9XG5cbi8vXG4vLyAjIyBNYXRjaGluZ1xuLy9cblx0Ly8gTWF0Y2ggYHBhdHRlcm5gIGFzIHJlZ2V4IGluIHRoaXMgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG1hdGNoIG9yIGB1bmRlZmluZWRgLlxuXHQvLyBJZiB5b3Ugd2FudCB0byB0ZXN0IHRoZSBzdGFydCBvZiB0aGUgc3RyZWFtLFxuXHQvL1x0bWFrZSBzdXJlIHlvdXIgcmVnZXggc3RhcnRzIHdpdGggYF5gLlxuXHQvLyBURVNUTUU6IHRoaXMgbGlrZWx5IGJyZWFrcyB3aXRoIGEgYGdgIG9uIHRoZSBwYXR0ZXJuP1xuXHRtYXRjaChwYXR0ZXJuKSB7XG5cdFx0aWYgKCEocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHRocm93IG5ldyBUeXBlRXJyb3IoYFRleHRTdHJlYW0ubWF0Y2goJHtwYXR0ZXJufSk6IGV4cGVjdGVkIFJlZ0V4cGApO1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5tYXRjaChwYXR0ZXJuKSB8fCB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBEb2VzIHRoaXMgc3RyZWFtIElOQ0xVREUgYSByZWdleCB3aXRoaW4gaXQ/XG5cdC8vIFJldHVybnMgYHRydWVgIG9yIGBmYWxzZWAuXG5cdC8vIE5PVEU6IFBhdHRlcm4gbXVzdCBOT1Qgc3RhcnQgd2l0aCBgXmAgZm9yIHRoaXMgdG8gbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLlxuXHR0ZXN0KHBhdHRlcm4pIHtcblx0XHRyZXR1cm4gcGF0dGVybi50ZXN0KHRoaXMuaGVhZCk7XG5cdH1cblxuLy9cbi8vICMjIFJlZmxlY3Rpb25cbi8vXG5cdC8vIFJldHVybiB0ZXh0IG9mIHN0cmluZyBzdGFydGluZyBhdCBvdXIgYHN0YXJ0SW5kZXhgXG5cdGdldCBoZWFkKCkge1xuXHRcdHJldHVybiB0aGlzLnJhbmdlKCk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSByYW5nZSBvZiB0aGUgc3RyaW5nIGZyb20gYHN0YXJ0SW5kZXhgIHRvIGBlbmRJbmRleGAgTk9OLWluY2x1c2l2ZS5cblx0cmFuZ2Uoc3RhcnRJbmRleCA9IHRoaXMuc3RhcnRJbmRleCwgZW5kSW5kZXggPSB0aGlzLmVuZEluZGV4IHx8IHRoaXMudGV4dC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0LnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmRJbmRleCk7XG5cdH1cblxuXHQvLyBMZW5ndGggb2YgdGhlIHN0cmVhbS5cblx0Z2V0IGxlbmd0aCgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0Lmxlbmd0aDtcblx0fVxuXG5cdC8vIEFyZSB3ZSBhdCB0aGUgZW5kIG9mIHRoZSBzdHJlYW0/XG5cdGdldCBpc0VtcHR5KCkge1xuXHRcdHJldHVybiB0aGlzLnN0YXJ0SW5kZXggPT09IHRoaXMubGVuZ3RoO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dFxuXHR9O1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1RleHRTdHJlYW0uanMiLCJpbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gbG9hZCBzdGFuZGFyZCBydWxlcyBmaWxlcyBoZXJlXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbnVtYmVyc1wiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vaWZcIjtcbmltcG9ydCBcIi4vYXNzaWdubWVudFwiO1xuaW1wb3J0IFwiLi9jbGFzc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiLy8gTWVtb2l6ZS9mb3JnZXQgc2VtYW50aWNzLlxuXG4vLyBSZXR1cm4gYSBtZW1vaXppbmcgZ2V0dGVyIGZ1bmN0aW9uLlxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXNbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGdldHRlci5hcHBseSh0aGlzKTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIERlZmluZSBzbyB0aGF0IHdlIGNhbiBiZSBkZWxldGVkIGFuZCByZS1kZWZpbmVkLCBidXQgbm90IHNldCBvciBlbnVtZXJhdGVkLlxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcGVydHksIHsgdmFsdWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXNbcHJvcGVydHldO1xuXHR9XG59XG5cblxuLy8gUmV0dXJuIGEgbWVtb2l6ZSBmdW5jdGlvbiBmb3IgdXNlIGFzIGEgZ2V0dGVyIGluIGEgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYFxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4ge1xuXHRcdGdldCA6IG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpXG5cdH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9tZW1vaXplLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gVE9ETzoge3Byb3BlcnR5LWV4cHJlc3Npb259IGFsc28gd29ya3MuLi4ge2Fzc2lnbmFibGUtZXhwcmVzc2lvbn0gPz8/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYXNzaWdubWVudFwiLCBcIntpZGVudGlmaWVyfSA9IHtleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBhc3NpZ25tZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdC8vIFRPRE86IGRlY2xhcmUgaWRlbnRpZmllciBpZiBub3QgaW4gc2NvcGUsIGV0Y1xuXHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCl9ID0gJHtleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlZmluaW5nIGNsYXNzZXMgKGtub3duIGFzIGB0eXBlc2ApXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwcm9wZXJ0eV9leHByZXNzaW9uXCIsXG5cdFwiKHByb3BlcnRpZXM6dGhlIHtpZGVudGlmaWVyfSBvZikrIHRoZT8ge2V4cHJlc3Npb259XCIsXG5cdGNsYXNzIHByb3BlcnR5X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHByb3BlcnRpZXMgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cHJvcGVydGllcyA9IHByb3BlcnRpZXMucmVzdWx0c1xuXHRcdFx0XHRcdFx0XHQucmV2ZXJzZSgpXG5cdFx0XHRcdFx0XHRcdC5tYXAoIHByb3BlcnR5ID0+IHByb3BlcnR5LmlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCkgKVxuXHRcdFx0XHRcdFx0XHQuam9pbihcIicsICdcIik7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldCgke2V4cHJlc3Npb259LCBbJyR7cHJvcGVydGllc30nXSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG5wYXJzZXIuYWRkU3ludGF4KFwic2NvcGVfbW9kaWZpZXJcIiwgXCIoc2NvcGU6Z2xvYmFsfGNvbnN0YW50fHNoYXJlZHxsb2NhbClcIik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eVwiLFxuXHRcIntzY29wZV9tb2RpZmllcn0/IHthc3NpZ25tZW50fVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgYXNzaWdubWVudCwgc2NvcGVfbW9kaWZpZXIgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGFzc2lnbm1lbnQgPSBhc3NpZ25tZW50LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHNjb3BlID0gc2NvcGUgJiYgc2NvcGUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJnbG9iYWxcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGdsb2JhbC4ke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwiY29uc3RhbnRcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGNvbnN0ICR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJzaGFyZWRcIjpcblx0XHRcdFx0XHRyZXR1cm4gYHN0YXRpYyAke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwibG9jYWxcIjpcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRyZXR1cm4gYXNzaWdubWVudDtcblx0XHRcdH1cblx0XHR9XG5cdH1cbik7XG5cbi8vIFRPRE86IHdhcm4gb24gaW52YWxpZCBzZXQ/ICBzaGFyZWQ/ICB1bmRlZmluZWQ/IHNvbWV0aGluZyBvdGhlciB0aGFuIHRoZSBmaXJzdCB2YWx1ZSBhcyBkZWZhdWx0P1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5X2FzX29uZV9vZlwiLFxuXHRcIntzY29wZV9tb2RpZmllcn0/IHtpZGVudGlmaWVyfSBhcyBvbmUgb2Yge2xpc3Q6bGl0ZXJhbF9saXN0fVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc2NvcGVfbW9kaWZpZXIsIGlkZW50aWZpZXIsIGxpc3QgfSA9IHRoaXMucmVzdWx0cztcbi8vVE9ETzogbm90IGhhbmRsaW5nIHNjb3BlX21vZGlmaWVyXG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBwbHVyYWwgPSAoaWRlbnRpZmllciArIFwiX1ZBTFVFU1wiKS50b1VwcGVyQ2FzZSgpO1xuXHRcdFx0bGV0IHZhbHVlcyA9IGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG4vL1RPRE86IGxpc3QuZ2V0SXRlbSgwKVxuXHRcdFx0bGV0IGZpcnN0ID0gbGlzdC5yZXN1bHRzLm1hdGNoZWRbMF07XG5cdFx0XHRsZXQgZmlyc3RWYWx1ZSA9IGZpcnN0ID8gZmlyc3QudG9Tb3VyY2UoY29udGV4dCkgOiBcInVuZGVmaW5lZFwiO1xuXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9O1xcbmBcblx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9IHsgcmV0dXJuIChcIl9fJHtpZGVudGlmaWVyfVwiIGluIHRoaXMgPyB0aGlzLl9fJHtpZGVudGlmaWVyfSA6ICR7Zmlyc3RWYWx1ZX0pIH1cXG5gXG5cdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy5jb25zdHJ1Y3Rvci4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1cXG5gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NsYXNzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWFsaW5nIHdpdGggbnVtYmVyc1xuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlXCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy8gVE9ETzogaWYgYGlkZW50aWZpZXJgIGlzIFwid29yZFwiLCBvdXRwdXQgYGdldFdvcmQoKWAgZXRjXG5jbGFzcyBpbmRleF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9ue1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IHsgaWRlbnRpZmllciwgbnVtYmVyLCBleHByZXNzaW9uIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0bnVtYmVyID0gbnVtYmVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke251bWJlcn0pYDtcblx0fVxufVxuXG4vLyBOdW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nOlxuLy9cdC0gYGl0ZW0gMSBvZiAuLi5gXG4vL1x0LSBgaXRlbSAjMiBvZiAuLi5gXG4vLyBOT1RFOiB0aGVzZSBpbmRpY2VzIGFyZSBPTkUgYmFzZWQsIE5PVCB6ZXJvIGJhc2VkIGFzIGlzIEphdmFzY3JpcHQuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4X2V4cHJlc3Npb25cIiwgXCJ7aWRlbnRpZmllcn0gKCMpP3tudW1iZXI6aW50ZWdlcn0gb2Yge2V4cHJlc3Npb259XCIsIGluZGV4X2V4cHJlc3Npb24pO1xuXG5cbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZmlyc3RcIiwgeyB0b1NvdXJjZTogKCkgPT4gMSB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwic2Vjb25kXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDIgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInRoaXJkXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDMgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImZvdXJ0aFwiLCB7IHRvU291cmNlOiAoKSA9PiA0IH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJmaWZ0aFwiLCB7IHRvU291cmNlOiAoKSA9PiA1IH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJzaXh0aFwiLCB7IHRvU291cmNlOiAoKSA9PiA2IH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJzZXZlbnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDcgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImVpZ2h0aFwiLCB7IHRvU291cmNlOiAoKSA9PiA4IH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJuaW50aFwiLCB7IHRvU291cmNlOiAoKSA9PiA5IH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJ0ZW50aFwiLCB7IHRvU291cmNlOiAoKSA9PiAxMCB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwicGVudWx0aW1hdGVcIiwgeyB0b1NvdXJjZTogKCkgPT4gLTIgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImZpbmFsXCIsIHsgdG9Tb3VyY2U6ICgpID0+IC0xIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJsYXN0XCIsIHsgdG9Tb3VyY2U6ICgpID0+IC0xIH0pO1xuXG4vLyBUT0RPOiBzaXh0eS1maWZ0aCwgdHdvIGh1bmRyZWQgZm9ydHkgbmludGguLi5cblxuLy8gQWx0ZXJuYXRpdmUgZm9ybSBmb3IgbnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZy5cbi8vIE5PVEU6IGRvbid0IGFkZCBhcyBhbiBleHByZXNzaW9uIHNpbmNlIHdlJ3JlIGF1dG8tbWVyZ2VkIHdpdGggYGluZGV4X2V4cHJlc3Npb25gIGFib3ZlLlxucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJpbmRleF9leHByZXNzaW9uXCIsIFwidGhlIHtudW1iZXI6b3JkaW5hbH0ge2lkZW50aWZpZXJ9IG9mIHtleHByZXNzaW9ufVwiLCBpbmRleF9leHByZXNzaW9uKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL251bWJlcnMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGluZml4IGFuZCBwcmVmaXggb3BlcmF0b3JzLlxuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIyMgSW5maXggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+IHtyaHN9YCwgZWc6IGBhIGlzIDFgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHR3byBhcmd1bWVudHMgKGBsaHNgIGFuZCBgcmhzYCkgaW50byBvdXRwdXQuXG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiYW5kXCIsIFwiYW5kXCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAmJiAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJvclwiLCBcIm9yXCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSB8fCAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzXCIsIFwiaXNcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX25vdFwiLCBcImlzIG5vdFwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT0gJHtifSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19leGFjdGx5XCIsIFwiaXMgZXhhY3RseVwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT09ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX25vdF9leGFjdGx5XCIsIFwiaXMgbm90IGV4YWN0bHlcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9PSAke2J9KWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5pc09mVHlwZSh0aGluZywgdHlwZSlgXG4vL1RPRE86IGBpcyBzYW1lIHR5cGUgYXNgID9cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfdHlwZV9vZlwiLCBbXCJpcyBhXCIsIFwiaXMgYW5cIl0sIHsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX25vdF90eXBlX29mXCIsIFtcImlzIG5vdCBhXCIsIFwiaXMgbm90IGFuXCJdLCB7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGAhc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuY29udGFpbnMoY29sbGVjdGlvbiwgdGhpbmcpYFxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19pblwiLCBbXCJpcyBpblwiLCBcImlzIG9uZSBvZlwiXSwgeyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgc3BlbGwuY29udGFpbnMoJHtsaXN0fSwgJHt0aGluZ30pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX25vdF9pblwiLCBbXCJpcyBub3QgaW5cIiwgXCJpcyBub3Qgb25lIG9mXCJdLCB7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAhc3BlbGwuY29udGFpbnMoJHtsaXN0fSwgJHt0aGluZ30pYCB9fSk7XG4vL1RFU1RNRVxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpbmNsdWRlc1wiLCBbXCJpbmNsdWRlc1wiLCBcImNvbnRhaW5zXCJdLCB7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZG9lc250X2luY2x1ZGVcIiwgW1wiZG9lcyBub3QgaW5jbHVkZVwiLCBcImRvZXNudCBpbmNsdWRlXCIsIFwiZG9lcyBub3QgY29udGFpblwiLCBcImRvZXNudCBjb250YWluXCJdLCB7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAhc3BlbGwuY29udGFpbnMoJHtsaXN0fSwgJHt0aGluZ30pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZ3RcIiwgW1wiPlwiLCBcImlzIGdyZWF0ZXIgdGhhblwiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndGVcIiwgW1wiPj1cIiwgXCJpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG9cIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0XCIsIFtcIjxcIiwgXCJpcyBsZXNzIHRoYW5cIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDwgJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibHRlXCIsIFtcIjw9XCIsIFwiaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfX0pO1xuXG4vL1RPRE86ICBjYW4ndCBhZGQgYCtgIGFzIGEgcnVsZSwgZml4IHRoaXMgdGhlbiBhZGQgdGhlc2Vcbi8vVE9ETzogIG9wZXJhdG9yIHByZWNlZGVuY2U/Pz9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcInBsdXNcIiwgW1wiXFxcXCtcIiwgXCJwbHVzXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJtaW51c1wiLCBbXCItXCIsIFwibWludXNcIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLSAke2J9YCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcInRpbWVzXCIsIFtcIlxcXFwqXCIsIFwidGltZXNcIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKiAke2J9YCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImRpdmlkZWRfYnlcIiwgW1wiL1wiLCBcImRpdmlkZWQgYnlcIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLyAke2J9YCB9fSk7XG5cbi8vVE9ETzogIGArPWAgZXRjPyAgb3RoZXIgbWF0aCBmdW5jdGlvbnM/XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImluZml4X29wZXJhdG9yX2V4cHJlc3Npb25cIixcblx0XCJ7bGhzOmV4cHJlc3Npb259IHtvcGVyYXRvcjppbmZpeF9vcGVyYXRvcn0ge3JoczpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaHMsIHJocywgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGxocy50b1NvdXJjZShjb250ZXh0KSwgcmhzLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIyMgUG9zdGlmeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj5gLCBlLmcuIGBhIGlzIGRlZmluZWRgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBKUyBvdXRwdXQuXG5cbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19kZWZpbmVkXCIsIFwiaXMgZGVmaW5lZFwiLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ICE9PSAndW5kZWZpbmVkJylgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19ub3RfZGVmaW5lZFwiLCBbXCJpcyBub3QgZGVmaW5lZFwiLCBcImlzIHVuZGVmaW5lZFwiXSwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzRW1wdHkodGhpbmcpYFxucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX2VtcHR5XCIsIFwiaXMgZW1wdHlcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19ub3RfZW1wdHlcIiwgXCJpcyBub3QgZW1wdHlcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9fSk7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeF9vcGVyYXRvcn1cIixcblx0Y2xhc3MgcG9zdGZpeF9vcGVyYXRvcl9leHByZXNpb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIG9wZXJhdG9yIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gb3BlcmF0b3IudG9KUyhleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gVE9ETzogdGhpcyBzaG91bGQgcmVhbGx5IGJlIGEgZ2VuZXJhbCBcImV4cHJlc3Npb25cIi4uLlxuLy9wYXJzZXIuYWRkU3ludGF4KFwib3BlcmF0b3JfZXhwcmVzc2lvblwiLCBcIihleHByZXNzaW9uOntwb3N0Zml4X29wZXJhdG9yX2V4cHJlc3Npb259fHtpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9ufSlcIik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuY2xhc3MgaWZfc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge31cblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiaWZcIixcblx0XCJpZiB7ZXhwcmVzc2lvbn0gKHRoZW58Oikge3N0YXRlbWVudH0/XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0c3RhdGVtZW50ID0gc3RhdGVtZW50ID8gc3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpIDogdW5kZWZpbmVkO1xuXG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgaWYgKCR7ZXhwcmVzc2lvbn0pYFxuXHRcdH0sXG5cdH0sXG5cdGlmX3N0YXRlbWVudFxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJpZlwiLFxuXHRcIntzdGF0ZW1lbnR9IGlmIHtleHByZXNzaW9ufSAoZWxzZVBocmFzZTooZWxzZXxvdGhlcndpc2UpIHtzdGF0ZW1lbnR9KT9cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCwgZWxzZVBocmFzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cdFx0XHRsZXQgZWxzZVN0YXRlbWVudCA9IGVsc2VQaHJhc2UgJiYgZWxzZVBocmFzZS5yZXN1bHRzLnN0YXRlbWVudC50b1NvdXJjZSgpO1xuXG5cdFx0XHRpZiAoZWxzZVN0YXRlbWVudCkgcmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfSBlbHNlIHsgJHtlbHNlU3RhdGVtZW50fSB9YFxuXHRcdFx0cmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0fSxcblx0fSxcblx0aWZfc3RhdGVtZW50XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImlmXCIsXG5cdFwiKGVsc2V8b3RoZXJ3aXNlKSBpZiB7ZXhwcmVzc2lvbn0gKHRoZW58Oikge3N0YXRlbWVudH0/XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0c3RhdGVtZW50ID0gc3RhdGVtZW50ID8gc3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpIDogdW5kZWZpbmVkO1xuXG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGVsc2UgaWYgKCR7ZXhwcmVzc2lvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0cmV0dXJuIGBlbHNlIGlmICgke2V4cHJlc3Npb259KWBcblx0XHR9LFxuXHR9LFxuXHRpZl9zdGF0ZW1lbnRcbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiaWZcIixcblx0XCIoZWxzZXxvdGhlcndpc2UpIHtzdGF0ZW1lbnR9P1wiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgZWxzZWBcblx0XHR9LFxuXHR9LFxuXHRpZl9zdGF0ZW1lbnRcbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaWYuanMiXSwic291cmNlUm9vdCI6IiJ9