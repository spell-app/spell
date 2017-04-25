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

__webpack_require__(13);

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
/* 8 */,
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
			}).join(".");
			return expression + "." + properties;
			// NOTE: the following is safer, but ugly for demo purposes
			//			return `spell.get(${expression}, ['${properties}'])`;
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
/* 13 */
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

var assignment = function (_Rule$Statement) {
	_inherits(assignment, _Rule$Statement);

	function assignment() {
		_classCallCheck(this, assignment);

		return _possibleConstructorReturn(this, (assignment.__proto__ || Object.getPrototypeOf(assignment)).apply(this, arguments));
	}

	_createClass(assignment, [{
		key: "toSource",
		value: function toSource(context) {
			var _results = this.results,
			    thing = _results.thing,
			    value = _results.value;

			if (thing instanceof _RuleSyntax2.default.Identifier) {
				// TODO: declare identifier if not in scope, etc
			}

			return thing.toSource(context) + " = " + value.toSource(context);
		}
	}]);

	return assignment;
}(_RuleSyntax2.default.Statement);

_parser2.default.addStatement("assignment", "{thing:expression} = {value:expression}", assignment);
_parser2.default.addStatement("assignment", "set {thing:expression} to {value:expression}", assignment);

/***/ }),
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgY2FiMzA3NjE1NzM1N2Y1Njg0MjYiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZVN5bnRheC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9pZi5qcyJdLCJuYW1lcyI6WyJwYXJzZXIiLCJ3aW5kb3ciLCJjb25zb2xlIiwiZ3JvdXAiLCJsb2ciLCJncm91cEVuZCIsIlBhcnNlciIsInByb3BlcnRpZXMiLCJPYmplY3QiLCJhc3NpZ24iLCJydWxlcyIsImNyZWF0ZSIsIm5hbWUiLCJzdHJlYW0iLCJydWxlIiwiZ2V0UnVsZSIsIlN5bnRheEVycm9yIiwiZWF0V2hpdGVzcGFjZSIsInBhcnNlIiwic3RhdGVtZW50cyIsInJlc3VsdHMiLCJjdXJyZW50SW5kZW50Iiwic3BsaXQiLCJmb3JFYWNoIiwic3RhdGVtZW50IiwidHJpbSIsInB1c2giLCJsaW5lU3RhcnQiLCJtYXRjaCIsImxpbmVJbmRlbnQiLCJsZW5ndGgiLCJzdWJzdHIiLCJpIiwicmVzdWx0IiwidG9Tb3VyY2UiLCJ3YXJuIiwiam9pbiIsIndoaXRlc3BhY2UiLCJhZHZhbmNlQnkiLCJtYXRjaGVkIiwicnVsZU5hbWUiLCJleGlzdGluZyIsIkFsdGVybmF0aXZlcyIsImRlYnVnIiwiYXJndW1lbnQiLCJhZGRSdWxlIiwicnVsZUlzTGVmdFJlY3Vyc2l2ZSIsImxlZnRSZWN1cnNpdmUiLCJTZXF1ZW5jZSIsInN1YnJ1bGUiLCJvcHRpb25hbCIsIlN1YnJ1bGUiLCJ0b2tlbnMiLCJzdGFydFRva2VuIiwiZW5kVG9rZW4iLCJzdGFydEluZGV4IiwibmVzdGluZyIsIm5lc3RlZCIsImVuZEluZGV4IiwibGFzdEluZGV4IiwidG9rZW4iLCJzbGljZSIsInN0cmluZyIsIm1hcCIsImNoYXIiLCJpbmRleCIsImxpc3QiLCJSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTIiwiZmxhZ3MiLCJSZWdFeHAiLCJlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzIiwiREVCVUciLCJjaGFycyIsIlJ1bGUiLCJjb25zdHJ1Y3RvciIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2xvbmUiLCJwcm9wcyIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsInN0YWNrIiwiY29udGV4dCIsIm5leHRSdWxlIiwibmV4dFN0cmVhbSIsIlBhdHRlcm4iLCJwYXR0ZXJuIiwiZGVmaW5lUHJvcGVydHkiLCJ2YWx1ZSIsInNvdXJjZSIsInN0YXJ0UGF0dGVybiIsImJsYWNrbGlzdCIsIndvcmRzIiwid29yZCIsIlN5bWJvbCIsIlJlZ0V4cEZyb21TdHJpbmciLCJtZXJnZVN5bWJvbHMiLCJmaXJzdCIsInNlY29uZCIsIktleXdvcmQiLCJwYXR0ZXJuU3RyaW5nIiwibWVyZ2VLZXl3b3JkcyIsImlzRGV0ZXJtaW5pc3RpYyIsIk5lc3RlZCIsImV2ZXJ5Iiwic3RhY2tDb250YWlucyIsImNvbmNhdCIsIm5leHQiLCJtYXRjaGVkVGV4dCIsInJhbmdlIiwiX3Jlc3VsdHMiLCJhcmdOYW1lIiwiQXJyYXkiLCJpc0FycmF5IiwiRXhwcmVzc2lvbiIsIlN0YXRlbWVudCIsIm1hdGNoZXMiLCJiZXN0TWF0Y2giLCJSZXBlYXQiLCJpbmNsdWRlcyIsIkxpc3QiLCJpdGVtIiwiZGVsaW1pdGVyIiwicGFyc2VSdWxlU3ludGF4Iiwic3ludGF4IiwiU2VxdWVuY2VDb25zdHJ1Y3RvciIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInBhcnNlUnVsZVN5bnRheF90b2tlbnMiLCJTWU5UQVhfRVhQUkVTU0lPTiIsInBhcnNlUnVsZVN5bnRheF90b2tlbiIsImxhc3QiLCJwb3AiLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zdHJpbmciLCJwYXJzZVJ1bGVTeW50YXhfc3VicnVsZSIsInBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyIsInBhcnNlUnVsZVN5bnRheF9saXN0IiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsInN0YXJ0c1dpdGgiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJhbHRlcm5hdGl2ZXMiLCJncm91cEFsdGVybmF0aXZlcyIsImN1cnJlbnQiLCJzeW1ib2wiLCJwYXJhbXMiLCJiYW5nUG9zaXRpb24iLCJpbmRleE9mIiwibm90IiwiZGVmaW5lUHJvcGVydGllcyIsImFkZFN5bnRheCIsInJ1bGVTeW50YXgiLCJGdW5jdGlvbiIsImUiLCJlcnJvciIsImFkZFN0YXRlbWVudCIsImFkZEV4cHJlc3Npb24iLCJhZGRJbmZpeE9wZXJhdG9yIiwidG9KUyIsIl9faW5maXhPcGVyYXRvcnMiLCJpbmZpeE9wZXJhdG9ycyIsImFkZFBvc3RmaXhPcGVyYXRvciIsIl9fcG9zdGZpeE9wZXJhdG9ycyIsInBvc3RmaXhPcGVyYXRvcnMiLCJXaGl0ZXNwYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJyZXBsYWNlIiwiYWRkVG9CbGFja2xpc3QiLCJUeXBlIiwidHlwZSIsIk51bWJlciIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJJbnRlZ2VyIiwicGFyc2VJbnQiLCJUZXh0IiwidGV4dCIsIkJvb2xlYW4iLCJib29sIiwiZXhwcmVzc2lvbiIsImVuZHNXaXRoIiwiVGV4dFN0cmVhbSIsInRleHRPclByb3BzIiwiYXJnIiwiaGVhZCIsInRlc3QiLCJzdWJzdHJpbmciLCJtZW1vaXplZCIsImRlZmluZU1lbW9pemVkIiwicHJvcGVydHkiLCJnZXR0ZXIiLCJhcHBseSIsImNvbmZpZ3VyYWJsZSIsImdldCIsInJldmVyc2UiLCJhc3NpZ25tZW50Iiwic2NvcGVfbW9kaWZpZXIiLCJzY29wZSIsInBsdXJhbCIsInRvVXBwZXJDYXNlIiwidmFsdWVzIiwiZmlyc3RWYWx1ZSIsImluZGV4X2V4cHJlc3Npb24iLCJhIiwiYiIsInRoaW5nIiwibGhzIiwicmhzIiwib3BlcmF0b3IiLCJpZl9zdGF0ZW1lbnQiLCJlbHNlUGhyYXNlIiwiZWxzZVN0YXRlbWVudCJdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLG1EQUEyQyxjQUFjOztBQUV6RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOzs7O0FBQ0E7Ozs7OztBQUVBO0FBTkE7QUFDQTtBQUNBO0FBS0EsSUFBTUEsU0FBUyxzQkFBZjtrQkFDZUEsTTs7QUFFZjs7QUFDQUMsT0FBT0QsTUFBUCxHQUFnQkEsTUFBaEIsQzs7Ozs7Ozs7Ozs7OztxakJDWEE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7QUFDQTs7Ozs7Ozs7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bUJpRCxPQUFuQixDQUFaLEdBQTBDSixTQUF0RDs7QUFFQSxNQUFJdkQsU0FBSixFQUFlLHFCQUFtQjhKLFVBQW5CLFlBQW9DOUosU0FBcEM7QUFDZix1QkFBbUI4SixVQUFuQjtBQUNBO0FBUkYsQ0FIRCxFQWFDOEIsWUFiRDs7QUFnQkEsaUJBQU92RCxZQUFQLENBQ0MsSUFERCxFQUVDLCtCQUZELEVBR0M7QUFDQzNILFNBREQsb0JBQ1VpRCxPQURWLEVBQ21CO0FBQUEsTUFDWDNELFNBRFcsR0FDRyxLQUFLSixPQURSLENBQ1hJLFNBRFc7O0FBRWpCQSxjQUFZQSxZQUFZQSxVQUFVVSxRQUFWLENBQW1CaUQsT0FBbkIsQ0FBWixHQUEwQ0osU0FBdEQ7O0FBRUEsTUFBSXZELFNBQUosRUFBZSxtQkFBaUJBLFNBQWpCO0FBQ2Y7QUFDQTtBQVBGLENBSEQsRUFZQzRMLFlBWkQsRSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGlkZW50aXR5IGZ1bmN0aW9uIGZvciBjYWxsaW5nIGhhcm1vbnkgaW1wb3J0cyB3aXRoIHRoZSBjb3JyZWN0IGNvbnRleHRcbiBcdF9fd2VicGFja19yZXF1aXJlX18uaSA9IGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiB2YWx1ZTsgfTtcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7XG4gXHRcdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuIFx0XHRcdFx0ZW51bWVyYWJsZTogdHJ1ZSxcbiBcdFx0XHRcdGdldDogZ2V0dGVyXG4gXHRcdFx0fSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiL1wiO1xuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IDEyKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCBjYWIzMDc2MTU3MzU3ZjU2ODQyNiIsIi8vXG4vL1x0IyBDcmVhdGUgYSBgcGFyc2VyYCBzaW5nbGV0b24gdG8gdXNlIHRvIHNldCB1cCBydWxlcyBhbmQgZHVyaW5nIHRlc3RzLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcblxuLy8gQ3JlYXRlIHBhcnNlciBpbnN0YW5jZS5cbmNvbnN0IHBhcnNlciA9IG5ldyBQYXJzZXIoKTtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbndpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9fcGFyc2VyLmpzIiwiLy8gU3BlbGwgXCJFbmdsaXNoXCIgcGFyc2VyIHN0cmF3bWFuXG5cbi8vIFRPRE86XHRgdGVzdGAgZnVuY3Rpb24gZm9yIHF1aWNrIG5vLWdvb2QgaGl0IG9uIGB7YX0gYmxhaCBibGFoIHtifWA/XG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcms6ICAgYHtleHByZXNzaW9ufSBpcyB7ZXhwcmVzc2lvbn1gXG4vLyBUT0RPOlx0YnJlYWsgYGZpbGVgIGludG8gbGluZXMgYW5kIHByb2Nlc3MgZWFjaCAoaW5jbC4gc3Vic3RyL21hdGNoIG5vdCBnb2luZyBiZXlvbmQgdGhlIGVuZClcbi8vIFRPRE86XHRuZXN0aW5nIC0tIGlzIHRoaXMganVzdCBpbmRlbnQgPSBcImFkZCBibG9jayBzY29wZVwiXG4vLyBUT0RPOlx0cHJvbW90aW9uIHBhdHRlcm4gZm9yIGdhdGhlciBhcmd1bWVudHMgKGVnOiBsaXRlcmFsLWxpc3QpID8/P1xuLy8gVE9ETzpcdFdoYXQgZG9lcyBzeW50YXggdHJlZSBsb29rIGxpa2U/ICBIb3cgZG8gd2UgZXh0cmFjdCBtZWFuaW5nIG91dCBvZiB0aGUgbmVzdD9cbi8vIFRPRE86XHRQYXNzIGBjb250ZXh0YCB0byB0b1NvdXJjZSgpLCBhZGQgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYGNsYXNzYCwgdmFyaWFibGVzIGFuZCBjb2RlIHRvIGBtZXRob2RgLCBgZ2xvYmFsYCBzdHVmZiBldGNcblxuaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ2xvbmUgcnVsZXMsIHN0YXJ0aW5nIHdpdGggYSBjb21wbGV0ZWx5IGVtcHR5IG1hcCBpZiBub3QgZGVmaW5lZCAobm8gc3RhbmRhcmQgb2JqZWN0IGtleXMpXG5cdFx0dGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5ydWxlcyB8fCBudWxsKTtcblx0fVxuXG5cdGdldFJ1bGUobmFtZSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzW25hbWVdO1xuXHR9XG5cbi8vXG4vLyMjIyBQYXJzaW5nXG4vL1xuXHQvLyBQYXJzZSBgbmFtZWBkIHJ1bGUgYXQgaGVhZCBvZiBgc3RyZWFtYCAoYHN0cmluZ2Agb3IgYFRleHRTdHJlYW1gKS5cblx0Ly8gSGFuZGxlcyBvcHRpb25hbCBhbmQgcmVwZWF0aW5nIHJ1bGVzIGFzIHdlbGwgYXMgZWF0aW5nIHdoaXRlc3BhY2UuXG5cdC8vIFJldHVybnMgcmVzdWx0IG9mIHBhcnNlLlxuXHRwYXJzZShuYW1lLCBzdHJlYW0pIHtcblx0XHRpZiAodHlwZW9mIHN0cmVhbSA9PT0gXCJzdHJpbmdcIikgc3RyZWFtID0gbmV3IFRleHRTdHJlYW0oc3RyZWFtKTtcblx0XHRsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShuYW1lKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2VyLnBhcnNlKCR7bmFtZX0pOiBSdWxlIG5vdCBmb3VuZGApO1xuXHRcdHN0cmVhbSA9IHRoaXMuZWF0V2hpdGVzcGFjZShzdHJlYW0pO1xuXHRcdHJldHVybiBydWxlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdH1cblxuXHQvLyBQYXJzZSBhIHNldCBvZiBzdGF0ZW1lbnRzIGxpbmUtYnktbGluZS5cbi8vVEVTVE1FXG5cdHBhcnNlU3RhdGVtZW50cyhzdGF0ZW1lbnRzKSB7XG5cdFx0bGV0IHJlc3VsdHMgPSBbXTtcblx0XHRsZXQgY3VycmVudEluZGVudCA9IDA7XG5cdFx0c3RhdGVtZW50cy5zcGxpdCgvXFxuKy9nKS5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG5cdFx0XHQvLyBza2lwIGxpbmVzIHRoYXQgYXJlIGFsbCB3aGl0ZXNwYWNlXG5cdFx0XHRpZiAoc3RhdGVtZW50LnRyaW0oKSA9PT0gXCJcIikge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCJcIik7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpbmRlbnQgbGV2ZWwgb2YgdGhpcyBsaW5lXG5cdFx0XHRsZXQgbGluZVN0YXJ0ID0gc3RhdGVtZW50Lm1hdGNoKC9eXFx0Ki8pWzBdO1xuXHRcdFx0bGV0IGxpbmVJbmRlbnQgPSBsaW5lU3RhcnQubGVuZ3RoO1xuXHRcdFx0aWYgKGxpbmVJbmRlbnQgPiBjdXJyZW50SW5kZW50KSB7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCkgcmVzdWx0c1tyZXN1bHRzLmxlbmd0aCAtIDFdICs9IFwiIHtcIjtcblx0XHRcdFx0ZWxzZSByZXN1bHRzLnB1c2gobGluZVN0YXJ0LnN1YnN0cigwLCBsaW5lSW5kZW50LTEpICsgXCJ7XCIpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAobGluZUluZGVudCA8IGN1cnJlbnRJbmRlbnQpIHtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IGN1cnJlbnRJbmRlbnQ7IGkgPiBsaW5lSW5kZW50OyBpLS0pIHtcblx0XHRcdFx0XHRyZXN1bHRzLnB1c2gobGluZVN0YXJ0LnN1YnN0cigwLCBpKSArIFwifVwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Y3VycmVudEluZGVudCA9IGxpbmVJbmRlbnQ7XG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5wYXJzZShcInN0YXRlbWVudFwiLCBzdGF0ZW1lbnQpO1xuXHRcdFx0aWYgKHJlc3VsdCkge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2gobGluZVN0YXJ0ICsgcmVzdWx0LnRvU291cmNlKCkpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGNvbnNvbGUud2FybihcIkNvdWxkbid0IHBhcnNlIHN0YXRlbWVudDpcIiwgc3RhdGVtZW50KTtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKFwiRVJST1I6IFwiK3N0YXRlbWVudCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Ly8gYWRkIGVuZGluZyBicmFjZXNcblx0XHR3aGlsZSAoY3VycmVudEluZGVudCA+IDApIHtcblx0XHRcdHJlc3VsdHMucHVzaChcIn1cIik7XG5cdFx0XHRjdXJyZW50SW5kZW50LS07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdHMuam9pbihcIlxcblwiKTtcblx0fVxuXG5cdC8vIEVhdCB3aGl0ZXNwYWNlIChhY2NvcmRpbmcgdG8gYHJ1bGVzLndoaXRlc3BhY2VgKSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnMgbmV3IHN0cmVhbSBpZiB3ZSBtYXRjaGVkIHdoaXRlc3BhY2UsIG90aGVyd2lzZSB0aGUgc2FtZSBzdHJlYW0uXG5cdGVhdFdoaXRlc3BhY2Uoc3RyZWFtKSB7XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMucnVsZXMud2hpdGVzcGFjZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gc3RyZWFtO1xuXHRcdHJldHVybiBzdHJlYW0uYWR2YW5jZUJ5KHJlc3VsdC5tYXRjaGVkLmxlbmd0aCk7XG5cdH1cblxuLy9cbi8vXHRSdWxlc1xuLy9cblxuXHQvLyBBZGQgYSBydWxlIHRvIG91ciBsaXN0IG9mIHJ1bGVzIVxuXHQvLyBDb252ZXJ0cyB0byBgYWx0ZXJuYXRpdmVzYCBvbiByZS1kZWZpbmluZyB0aGUgc2FtZSBydWxlLlxuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHQvLyBkb24ndCBvdmVycmlkZSBydWxlTmFtZVxuXHRcdGlmICghcnVsZS5ydWxlTmFtZSkgcnVsZS5ydWxlTmFtZSA9IG5hbWU7XG5cblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLnJ1bGVzW25hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtuYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZTogbmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdC8vIGNvcHkgYXJndW1lbnQgbmFtZSBvdmVyICg/Pz8pXG5cdFx0XHRcdGlmIChleGlzdGluZy5hcmd1bWVudCkgdGhpcy5ydWxlc1tuYW1lXS5hcmd1bWVudCA9IGV4aXN0aW5nLmFyZ3VtZW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JyB0byAnJHtuYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXS5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBydWxlO1xuXHRcdH1cblxuXG5cdFx0Ly8gbWFrZSBhIG5vdGUgaWYgd2UncmUgYWRkaW5nIGEgbGVmdC1yZWN1cnNpdmUgcnVsZVxuXHRcdGlmICh0aGlzLnJ1bGVJc0xlZnRSZWN1cnNpdmUobmFtZSwgcnVsZSkpIHtcbi8vY29uc29sZS5pbmZvKFwibWFya2luZyBcIiwgcnVsZSwgXCIgYXMgbGVmdCByZWN1cnNpdmUhXCIpO1xuXHRcdFx0cnVsZS5sZWZ0UmVjdXJzaXZlID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cdC8vIElzIHRoZSBzcGVjaWZpZWQgcnVsZSBsZWZ0LXJlY3Vyc2l2ZT9cblx0cnVsZUlzTGVmdFJlY3Vyc2l2ZShuYW1lLCBydWxlKSB7XG5cdFx0aWYgKCEocnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UpKSByZXR1cm4gZmFsc2U7XG4vL2NvbnNvbGUubG9nKG5hbWUsIHJ1bGUpO1xuXHRcdGZvciAobGV0IHN1YnJ1bGUgb2YgcnVsZS5ydWxlcykge1xuXHRcdFx0Ly8gaWdub3JlIG9wdGlvbmFsIHJ1bGVzXG5cdFx0XHRpZiAoc3VicnVsZS5vcHRpb25hbCkgY29udGludWU7XG5cdFx0XHRpZiAoc3VicnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3VicnVsZSAmJiBzdWJydWxlLnJ1bGUgPT09IG5hbWUpIHJldHVybiB0cnVlO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXG4vL1xuLy8gIyMgVXRpbGl0eSBtZXRob2RzXG4vL1xuXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gXG5cdC8vXHRpbiBhcnJheSBvZiBgdG9rZW5zYCAoc3RyaW5ncykuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cblxuXHQvLyBMaXN0IG9mIHNwZWNpYWwgY2hhcmFjdGVycyBpbiByZWd1bGFyIGV4cHJlc3Npb25zLlxuXHQvLyBVc2VkIHRvIGVzY2FwZSB0aG9zZSBjaGFycyB3aGVuIGNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbnMgZnJvbSBzdHJpbmdzLlxuXHRzdGF0aWMgUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyA9IChmdW5jdGlvbigpIHtcblx0XHRjb25zdCBjaGFycyA9IHt9O1xuXHRcdFwiXFxcXC9eJCorPy4oKXx7fSxbXVwiLnNwbGl0KFwiXCIpLmZvckVhY2goY2hhciA9PiBjaGFyc1tjaGFyXSA9IHRydWUpO1xuXHRcdHJldHVybiBjaGFycztcblx0fSkoKVxuXG5cdC8vIEdpdmVuIGEgXCJub3JtYWxcIiBgc3RyaW5nYCwgZXNjYXBlIGFueSByZWd1bGFyIGV4cHJlc3Npb24gc3BlY2lhbCBjaGFyYWN0ZXJzXG5cdC8vXHRzbyB3ZSBjYW4gY3JlYXRlIGEgYG5ldyBSZWdFeHAoKWAuXG5cdC8vIEFsc28gY29udmVydHMgYSBzaW5nbGUgc3BhY2UgdG8gYXJiaXRyYXJ5IHNldCBvZiBzcGFjZXMgd2l0aCBcIlxccytcIlxuXHRzdGF0aWMgZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpIHtcblx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KFwiXCIpLm1hcChmdW5jdGlvbiAoY2hhciwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3IgYmFja3NsYXNoXG5cdFx0XHRpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIjtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igc3BhY2Vcblx0XHRcdGlmIChjaGFyID09PSBcIiBcIikgcmV0dXJuIFwiXFxcXHMrXCI7XG5cdFx0XHQvLyBJZiBhIHNwZWNpYWwgY2hhciBhbmQgcHJldmlvdXMgY2hhcmFjdGVyIHdhcyBub3QgYW4gZXNjYXBlLCBlc2NhcGUgdGhlIHJlc3VsdC5cblx0XHRcdGlmIChQYXJzZXIuUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSU1tjaGFyXSAmJiBsaXN0W2luZGV4LTFdICE9PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiK2NoYXI7XG5cdFx0XHQvLyBUaGlzIGNoYXIgc2hvdWxkIGJlIGZpbmUgYnkgaXRzZWxmLlxuXHRcdFx0cmV0dXJuIGNoYXI7XG5cdFx0fSkuam9pbihcIlwiKTtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyByZWd1bGFyIGV4cHJlc3Npb24gZnJvbSBhIFwibm9ybWFsXCIgc3RyaW5nLCBlc2NhcGluZyBzcGVjaWFsIGNoYXJhY3RlcnMgYXMgbmVjZXNzYXJ5LlxuXHRzdGF0aWMgUmVnRXhwRnJvbVN0cmluZyhzdHJpbmcsIGZsYWdzKSB7XG5cdFx0cmV0dXJuIG5ldyBSZWdFeHAoUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSwgZmxhZ3MpO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHN0cmVhbSwgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBzdHJlYW1gXHRcdFN0cmVhbSB3aGljaCB3YXMgbWF0Y2hlZCB3aXRoIGBzdGFydEluZGV4YCBhdCB0aGUgc3RhcnQgb2YgdGhlIG1hdGNoXG4vL1x0XHRcdC0gYGVuZEluZGV4YFx0Tm9uLWluY2x1c2l2ZSBlbmQgaW5kZXggaW4gc3RyZWFtIHdoZXJlIG1hdGNoIGVuZHMuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5yZXN1bHRzYFx0XHRcdFJldHVybiBtYXRjaGVkIGFyZ3VtZW50cyBpbiBhIGZvcm1hdCBzdWl0YWJsZSB0byBkbzpcbi8vXHRcdC0gYHJ1bGUudG9Tb3VyY2UoY29udGV4dClgXHRSZXR1cm4gamF2YXNjcmlwdCBzb3VyY2UgdG8gaW50ZXJwcmV0IHRoZSBydWxlLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gUnVsZSB8fCAhdGhpcy5jb25zdHJ1Y3Rvci5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkoXCJjb25zdHJ1Y3RvclwiKSkge1xuLy9jb25zb2xlLndhcm4oXCJub3QgcnVsZVwiLCB0aGlzKTtcblx0XHR9XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdC8vIENsb25lIHRoaXMgcnVsZSBhbmQgYWRkIGFueSBgcHJvcHNgIHBhc3NlZCBpbi5cblx0Y2xvbmUoLi4ucHJvcHMpIHtcblx0XHRsZXQgY2xvbmUgPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xuXHRcdE9iamVjdC5hc3NpZ24oY2xvbmUsIC4uLnByb3BzKTtcblx0XHRyZXR1cm4gY2xvbmU7XG5cdH1cblxuXHQvLyBGb3IgYSBydWxlIGluc3RhbmNlIGFzc29jaWF0ZWQgd2l0aCBhIHN0cmVhbSxcblx0Ly8gcmV0dXJuIGEgbmV3IHN0cmVhbSBBRlRFUiB0aGlzIHJ1bGUncyBlbmQuXG5cdG5leHQoKSB7XG5cdFx0aWYgKCF0aGlzLnN0cmVhbSB8fCB0aGlzLmVuZEluZGV4ID09PSB1bmRlZmluZWQpXG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBydWxlLm5leHQoKSBjYWxsZWQgb24gcnVsZSB3aXRob3V0IGEgc3RyZWFtYCwgdGhpcyk7XG5cdFx0cmV0dXJuIHRoaXMuc3RyZWFtLmFkdmFuY2VUbyh0aGlzLmVuZEluZGV4KTtcblx0fVxuXG4vL1xuLy9cdFBhcnNpbmcgcHJpbWl0aXZlcyAtLSB5b3UgTVVTVCBpbXBsZW1lbnQgdGhlc2UgaW4geW91ciBzdWJjbGFzc2VzIVxuLy9cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcnVsZSBpbiB0aGUgYHN0cmVhbWAuXG5cdC8vIFJldHVybnMgcmVzdWx0cyBvZiB0aGUgcGFyc2Ugb3IgYHVuZGVmaW5lZGAuXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBJcyB0aGlzIHJ1bGUgZGV0ZXJtaW5pc3RpYywgZWc6IGNhbiBpdCBiZSBxdWlja2x5IGFuZCB1bmFtYmlndW91c2x5IHNhdGlzZmllZD9cblx0Ly8gUmV0dXJuaW5nIGB0cnVlYCBjYW4gc3BlZWQgdXAgc2VxdWVuY2UgcHJvY2Vzc2luZyxcblx0Ly9cdGJ1dCBpZiB5b3UncmUgcmVhbGx5IG5vdCBzdXJlLCByZXR1cm4gYHVuZGVmaW5lZGAuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBEb2VzIHRoZSBwYXJzZSBgc3RhY2tgIGFscmVhZHkgY29udGFpbiBgcnVsZWA/XG5cdHN0YXRpYyBzdGFja0NvbnRhaW5zKHN0YWNrLCBydWxlLCBzdHJlYW0pIHtcblx0XHRpZiAoc3RhY2subGVuZ3RoID09PSAwKSByZXR1cm4gZmFsc2U7XG5cbi8vY29uc29sZS5pbmZvKHN0YWNrKTtcblx0XHQvLyBnbyBiYWNrd2FyZHNcblx0XHRmb3IgKHZhciBpID0gc3RhY2subGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGxldCBbIG5leHRSdWxlLCBuZXh0U3RyZWFtIF0gPSBzdGFja1tpXTtcblx0XHRcdGlmIChuZXh0UnVsZSA9PT0gcnVsZSkge1xuXHRcdFx0XHRpZiAobmV4dFN0cmVhbS5zdGFydEluZGV4ID09PSBzdHJlYW0uc3RhcnRJbmRleCkge1xuLy9cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiZm91bmQgdW5wcm9kdWN0aXZlIHJ1bGUgXCIsIHJ1bGUsIFwiIG9uIHN0YWNrXCIsIHN0YWNrKTtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcbi8vXHRcdFx0XHRcdGNvbnNvbGUud2FybihcImZvdW5kIHByb2R1Y3RpdmUgcnVsZSBcIiwgcnVsZSwgXCIgb24gc3RhY2tcIiwgc3RhY2spO1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIE5PVEU6IHlvdSBtYXkgd2FudCB0byBtZW1vaXplIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkO1xuXHR9XG5cbi8vXG4vLyAjIyBncm91cDogcmVmbGVjdGlvblxuLy9cblx0Z2V0IHJ1bGVUeXBlKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdH1cbn1cblxuXG5cblxuLy8gUmVnZXggcGF0dGVybi5cbi8vIGBydWxlLnBhdHRlcm5gIGlzIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2guXG4vL1xuLy8gTk9URVx0VG8gbWFrZSB0aGlzIG1vcmUgZ2VuZXJhbGx5IGFwcGxpY2FibGUsIGRvIE5PVCBzdGFydCB0aGUgcGF0dGVybiB3aXRoIGEgYF5gLlxuLy9cdFx0V2UnbGwgYXV0b21hdGljYWxseSBtYWtlIGEgY29weSBvZiB0aGUgUmVnRXhwIHdpdGggdGhlIHN0YXJ0IHBvaW50IGF0dGFjaGVkXG4vL1x0XHRhbmQgdXNlIHRoYXQgYXMgYXBwcm9wcmlhdGUuXG4vL1xuLy9cdFx0VGhpcyB3YXkgd2UgY2FuIHJlLXVzZSB0aGUgcmVnZXggdG8gY2hlY2sgZm9yIGEgbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLi4uXG4vL1xuLy8gWW91IGNhbiBvcHRpb25hbGx5IHNwZWNpZnkgYSBgcnVsZS5ibGFja2xpc3RgLCBhIHNldCBvZiBtYXRjaGVzIHdoaWNoIHdpbGwgc3BlY2lmaWNhbGx5IE5PVCB3b3JrLFxuLy9cdGVnIGZvciBgaWRlbnRpZmllci5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBwYXR0ZXJuYCBpcyByZXF1aXJlZFxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuUGF0dGVybigpOiBZb3UgbXVzdCBwYXNzIGEgYHBhdHRlcm5gIHBhcmFtZXRlclwiKTtcblxuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ3JlYXRlIGEgYHN0YXJ0UGF0dGVybmAgdG8gbWF0Y2ggYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3Ryb25nXG5cdFx0Ly8gQ3JlYXRlIG5vbi1lbnVtZXJhYmx5LlxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInN0YXJ0UGF0dGVyblwiLCB7IHZhbHVlOiBuZXcgUmVnRXhwKFwiXlwiICsgdGhpcy5wYXR0ZXJuLnNvdXJjZSkgfSk7XG5cdH1cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcGF0dGVybiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdGxldCBtYXRjaCA9IHN0cmVhbS5tYXRjaCh0aGlzLnN0YXJ0UGF0dGVybik7XG5cdFx0aWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGJhaWwgaWYgcHJlc2VudCBpbiBibGFja2xpc3Rcblx0XHRsZXQgbWF0Y2hlZCA9IG1hdGNoWzBdO1xuXHRcdGlmICh0aGlzLmJsYWNrbGlzdCAmJiB0aGlzLmJsYWNrbGlzdFttYXRjaGVkXSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXggKyBtYXRjaGVkLmxlbmd0aCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUGF0dGVybnMgYXJlIEFMV0FZUyBkZXRlcm1pbmlzdGljLlxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGFkZFRvQmxhY2tsaXN0KC4uLndvcmRzKSB7XG5cdFx0aWYgKCF0aGlzLmJsYWNrbGlzdCkgdGhpcy5ibGFja2xpc3QgPSB7fTtcblx0XHR3b3Jkcy5mb3JFYWNoKHdvcmQgPT4gdGhpcy5ibGFja2xpc3Rbd29yZF0gPSB0cnVlKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm4uc291cmNlO1xuXHR9XG59XG5cbi8vIFJ1bGUgZm9yIGxpdGVyYWwgc3RyaW5nIHZhbHVlLCB3aGljaCBpbmNsdWRlIHB1bmN0dWF0aW9uIHN1Y2ggYXMgYChgIGV0Yy5cbi8vIGBTeW1ib2xgcyBhcmUgZGlmZmVyZW50IGZyb20gYEtleXdvcmRzYCBpbiB0aGF0IHRoZXkgZG8gbm90IHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5LlxuLy9UT0RPOiByZW5hbWUgYFN5bWJvbGA/Pz9cblJ1bGUuU3ltYm9sID0gY2xhc3MgU3ltYm9sIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLlN5bWJvbCgpOiBFeHBlY3RlZCBzdHJpbmcgcHJvcGVydHlcIik7XG5cblx0XHQvLyBjb252ZXJ0IHN0cmluZyB0byBwYXR0ZXJuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdHByb3BlcnRpZXMucGF0dGVybiA9IFBhcnNlci5SZWdFeHBGcm9tU3RyaW5nKHByb3BlcnRpZXMuc3RyaW5nKTtcbi8vY29uc29sZS5pbmZvKHByb3BlcnRpZXMuc3RyaW5nLCBwcm9wZXJ0aWVzLnBhdHRlcm4pO1xuXHRcdH1cblxuLy9cdFx0Y29uc29sZS5pbmZvKFwiY3JlYXRpbmcgc3RyaW5nXCIsIHByb3BlcnRpZXMpO1xuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHR9XG5cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG4vLyBNZXJnZSB0d28gU3ltYm9sIHJ1bGVzIHRvZ2V0aGVyLCByZXR1cm5pbmcgYSBuZXcgcnVsZSB0aGF0IG1hdGNoZXMgYm90aC5cblJ1bGUubWVyZ2VTeW1ib2xzID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuXHRyZXR1cm4gbmV3IFJ1bGUuU3ltYm9sKHsgc3RyaW5nOiBmaXJzdC5zdHJpbmcgKyBzZWNvbmQuc3RyaW5nIH0pO1xufVxuXG4vLyBLZXl3b3JkIHBhdHRlcm4uXG4vLyBQcm9wZXJ0aWVzOlxuLy9cdC0gYHJ1bGUuc3RyaW5nYCBcdChyZXF1aXJlZCkgXHRLZXl3b3JkIHN0cmluZyB0byBtYXRjaC5cbi8vXHQtIGBydWxlLnBhdHRlcm5gXHQob3B0aW9uYWwpIFx0UmVnRXhwIGZvciB0aGUgbWF0Y2guXG4vL1x0XHRcdFx0XHRcdFx0XHRcdFdlJ2xsIGNyZWF0ZSBvbmUgZnJvbSBgc3RyaW5nYCBpZiBuZWNlc3NhcnkuXG4vL1x0XHRcdFx0XHRcdFx0XHRcdE5PVEU6IGRvIE5PVCBzdGFydCB0aGUgYHBhdHRlcm5gIHdpdGggYF5gLlxuUnVsZS5LZXl3b3JkID0gY2xhc3MgS2V5d29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgc3RyaW5nYCBpcyByZXF1aWVkLlxuXHRcdGlmICghcHJvcGVydGllcy5zdHJpbmcpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5LZXl3b3JkKCk6IEV4cGVjdGVkIHN0cmluZyBwcm9wZXJ0eVwiKTtcblxuXHRcdC8vIGRlcml2ZSBgcGF0dGVybmAgaWYgbmVjZXNzYXJ5LlxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB7XG5cdFx0XHQvLyBlbmZvcmNlIHdvcmQgYm91bmRhcmllcyBhbmQgYWxsb3cgYXJiaXRyYXJ5IHNwYWNlIGJldHdlZW4gd29yZHNcblx0XHRcdGxldCBwYXR0ZXJuU3RyaW5nID0gUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMocHJvcGVydGllcy5zdHJpbmcpO1xuXHRcdFx0cHJvcGVydGllcy5wYXR0ZXJuID0gbmV3IFJlZ0V4cChcIlxcXFxiXCIgKyBwYXR0ZXJuU3RyaW5nICsgXCJcXFxcYlwiKTtcblx0XHR9XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cbi8vIE1lcmdlIHR3byBLZXl3b3JkIHJ1bGVzIHRvZ2V0aGVyLCBhZGRpbmcgdGhlIHNlY29uZCB0byB0aGUgZmlyc3QuXG5SdWxlLm1lcmdlS2V5d29yZHMgPSBmdW5jdGlvbihmaXJzdCwgc2Vjb25kKSB7XG5cdHJldHVybiBuZXcgUnVsZS5LZXl3b3JkKHsgc3RyaW5nOiBmaXJzdC5zdHJpbmcgKyBcIiBcIiArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cblxuLy8gU3VicnVsZSAtLSBuYW1lIG9mIGFub3RoZXIgcnVsZSB0byBiZSBjYWxsZWQuXG4vLyBgcnVsZS5ydWxlYCBpcyB0aGUgbmFtZSBvZiB0aGUgcnVsZSBpbiBgcGFyc2VyLnJ1bGVzYC5cblJ1bGUuU3VicnVsZSA9IGNsYXNzIFN1YnJ1bGUgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZSh0aGlzLnJ1bGUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBBdHRlbXB0aW5nIHRvIHBhcnNlIHVua25vd24gcnVsZSAnJHt0aGlzLnJ1bGV9J2ApO1xuXHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIG1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gbWF0Y2g7XG5cdH1cblxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlKHRoaXMucnVsZSk7XG5cdFx0aWYgKCFydWxlKSByZXR1cm4gZmFsc2U7XG5cdFx0cmV0dXJuIHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgeyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlfX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuXG4vLyBBYnN0cmFjdDogIGBOZXN0ZWRgIHJ1bGUgLS0gY29tcG9zZWQgb2YgYSBzZXJpZXMgb2Ygb3RoZXIgYHJ1bGVzYC5cblJ1bGUuTmVzdGVkID0gY2xhc3MgTmVzdGVkIGV4dGVuZHMgUnVsZSB7XG5cblx0Ly8gSXMgdGhpcyBkZXRlcm1pbmlzdGljLCBlZzogYXJlIG91ciBzdWJydWxlcyB1bmFtYmlnb3VzbHkgZGV0ZXJtaW5hYmxlP1xuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlcy5ldmVyeShydWxlID0+IHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSk7XG5cdH1cbn1cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaCAoYXV0by1leGNsdWRpbmcgd2hpdGVzcGFjZSkuXG5SdWxlLlNlcXVlbmNlID0gY2xhc3MgU2VxdWVuY2UgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCBzdHJlYW1dKTtcblx0XHR9XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghbWF0Y2ggJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdFx0bmV4dCA9IG1hdGNoLm5leHQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuLy9UT0RPQ1xuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGBtYXRjaGVkYCBhcnJheSBpbmRleGVkIGJ5XG5cdC8vXHRcdC0gYG1hdGNoLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYG1hdGNoLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIGBydWxlIHR5cGVgOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRpZiAoIXRoaXMuX3Jlc3VsdHMpIHtcblx0XHRcdGxldCByZXN1bHRzID0gdGhpcy5fcmVzdWx0cyA9IHt9O1xuXHRcdFx0Zm9yIChsZXQgbWF0Y2ggb2YgdGhpcy5tYXRjaGVkKSB7XG5cdFx0XHRcdGxldCBhcmdOYW1lID0gbWF0Y2guYXJndW1lbnQgfHwgbWF0Y2gucnVsZU5hbWUgfHwgbWF0Y2guY29uc3RydWN0b3IubmFtZTtcblxuXHRcdFx0XHQvLyBJZiBhcmcgYWxyZWFkeSBleGlzdHMsIGNvbnZlcnQgdG8gYW4gYXJyYXlcblx0XHRcdFx0aWYgKGFyZ05hbWUgaW4gcmVzdWx0cykge1xuXHRcdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShyZXN1bHRzW2FyZ05hbWVdKSkgcmVzdWx0c1thcmdOYW1lXSA9IFtyZXN1bHRzW2FyZ05hbWVdXTtcblx0XHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdLnB1c2gobWF0Y2gpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0gPSBtYXRjaDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5fcmVzdWx0cztcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnJ1bGVzLmpvaW4oXCIgXCIpfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cblxufVxuXG4vLyBTeW50YWN0aWMgc3VnYXIgZm9yIGRlYnVnZ2luZ1xuUnVsZS5FeHByZXNzaW9uID0gY2xhc3MgZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBTdGF0ZW1lbnRzIHRha2UgdXAgdGhlIGVudGlyZSBsaW5lLlxuUnVsZS5TdGF0ZW1lbnQgPSBjbGFzcyBzdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gQWx0ZXJuYXRpdmUgc3ludGF4LCBtYXRjaGluZyBvbmUgb2YgYSBudW1iZXIgb2YgZGlmZmVyZW50IHJ1bGVzLlxuLy8gVGhlIHJlc3VsdCBvZiBhIHBhcnNlIGlzIHRoZSBsb25nZXN0IHJ1bGUgdGhhdCBhY3R1YWxseSBtYXRjaGVkLlxuLy8gTk9URTogQ3VycmVudGx5IHRha2VzIHRoZSBsb25nZXN0IHZhbGlkIG1hdGNoLlxuLy8gVE9ETzogbWF0Y2ggYWxsIHZhbGlkIGFsdGVybmF0aXZlc1xuLy8gVE9ETzogcmVuYW1lP1xuUnVsZS5BbHRlcm5hdGl2ZXMgPSBjbGFzcyBBbHRlcm5hdGl2ZXMgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpO1xuXHRcdGlmICghdGhpcy5ydWxlcykgdGhpcy5ydWxlcyA9IFtdO1xuXHR9XG5cblx0Ly8gRmluZCB0aGUgTE9OR0VTVCBtYXRjaFxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHQvL0RFQlVHXG5cdFx0bGV0IG1hdGNoZXMgPSBbXTtcblxuXHRcdGxldCBiZXN0TWF0Y2g7XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayk7XG5cdFx0XHRpZiAoIW1hdGNoKSBjb250aW51ZTtcblxuXHRcdFx0Ly8gdGFrZSB0aGUgbG9uZ2VzdCBtYXRjaFxuXHRcdFx0aWYgKCFiZXN0TWF0Y2ggfHwgbWF0Y2guZW5kSW5kZXggPiBiZXN0TWF0Y2guZW5kSW5kZXgpXG5cdFx0XHRcdGJlc3RNYXRjaCA9IG1hdGNoO1xuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZXMucHVzaChtYXRjaCk7XG5cdFx0fVxuXG5cdFx0Ly8gREVCVUdcbi8vIFx0XHRpZiAobWF0Y2hlcy5sZW5ndGggPiAxKSB7XG4vLyBcdFx0XHRsZXQgc3RhY2tDb250ZW50cyA9IHN0YWNrLm1hcChpdGVtID0+IGl0ZW1bMF0pO1xuLy8gXHRcdFx0Y29uc29sZS5ncm91cCh0aGlzLnJ1bGVOYW1lICsgXCIgbWF0Y2hlZCBcIittYXRjaGVzLmxlbmd0aCtcIiB0aW1lczpcIiwgc3RhY2tDb250ZW50cyk7XG4vLyBcdFx0XHRtYXRjaGVzLmZvckVhY2gobWF0Y2ggPT4gY29uc29sZS5sb2coXCIgIFwiLCBtYXRjaC50b1NvdXJjZSgpKSk7XG4vLyBcdFx0XHRjb25zb2xlLmdyb3VwRW5kKCk7XG4vLyBcdFx0fVxuXG5cdFx0aWYgKCFiZXN0TWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBhc3NpZ24gYGFyZ05hbWVgIG9yIGBydWxlTmFtZWAgZm9yIGByZXN1bHRzYFxuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSBiZXN0TWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdGVsc2UgaWYgKHRoaXMucnVsZU5hbWUpIGJlc3RNYXRjaC5ydWxlTmFtZSA9IHRoaXMucnVsZU5hbWU7XG5cbi8vVE9ETzogb3RoZXIgdGhpbmdzIHRvIGNvcHkgaGVyZT8/P1xuXHRcdHJldHVybiBiZXN0TWF0Y2g7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZShjb250ZXh0KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5tYXRjaGVkYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrID0gW10pIHtcblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHRpZiAoUnVsZS5zdGFja0NvbnRhaW5zKHN0YWNrLCB0aGlzLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0c3RhY2sgPSBzdGFjay5jb25jYXQoKTtcblx0XHRcdHN0YWNrLnB1c2goW3RoaXMsIHN0cmVhbV0pO1xuXHRcdH1cblxuXHRcdGxldCBuZXh0ID0gc3RyZWFtO1xuXHRcdGxldCBtYXRjaGVkID0gW107XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCBtYXRjaCA9IHRoaXMucnVsZS5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghbWF0Y2gpIGJyZWFrO1xuXG5cdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0bmV4dCA9IG1hdGNoLm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAobWF0Y2hlZC5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBhcnJheSB3aXRoIGFyZ3VtZW50cyBvZiBhbGwgcmVzdWx0cy5cblx0Ly8gTk9URTogbWVtb2l6ZXMgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLl9yZXN1bHRzIHx8ICh0aGlzLl9yZXN1bHRzID0gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gucmVzdWx0cyApKTtcblxuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0dGhyb3cgXCJEb24ndCB1bmRlcnN0YW5kIGhvdyB0byBzb3VyY2UgUnVsZS5SZXBlYXQhXCI7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRjb25zdCBydWxlID0gKHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UgfHwgdGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHRoaXMucnVsZS5zdHJpbmcuaW5jbHVkZXMoXCIgXCIpXG5cdFx0XHRcdCAgID8gYCgke3RoaXMucnVsZX0pYFxuXHRcdFx0XHQgICA6IGAke3RoaXMucnVsZX1gXG5cdFx0XHRcdCk7XG5cdFx0cmV0dXJuIGAke3J1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe251bWJlcn0sXWAgdG8gbWF0Y2ggYDEsMiwzYFxuLy9cdGBydWxlLml0ZW1gIGlzIHRoZSBydWxlIGZvciBlYWNoIGl0ZW0sXG4vL1x0YHJ1bGUuZGVsaW1pdGVyYCBpcyB0aGUgZGVsaW1pdGVyIGJldHdlZW4gZWFjaCBpdGVtLlxuLy8gXHRgcnVsZS5tYXRjaGVkYCBpbiB0aGUgb3V0cHV0IGlzIHRoZSBsaXN0IG9mIHZhbHVlcy5cbi8vXG4vL1xuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYSBMaXN0IHJ1bGUgd2lsbCBOT1QgcmVwZWF0ICg/Pz8/KVxuUnVsZS5MaXN0ID0gY2xhc3MgTGlzdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2sgPSBbXSkge1xuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdGlmIChSdWxlLnN0YWNrQ29udGFpbnMoc3RhY2ssIHRoaXMsIHN0cmVhbSkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRzdGFjayA9IHN0YWNrLmNvbmNhdCgpO1xuXHRcdFx0c3RhY2sucHVzaChbdGhpcywgc3RyZWFtXSk7XG5cdFx0fVxuXG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFpdGVtKSBicmVhaztcbi8vY29uc29sZS5sb2coaXRlbSk7XG5cdFx0XHRtYXRjaGVkLnB1c2goaXRlbSk7XG5cdFx0XHRuZXh0ID0gaXRlbS5uZXh0KCk7XG5cblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBkZWxpbWl0ZXIsIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgZGVsaW1pdGVyID0gdGhpcy5kZWxpbWl0ZXIucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0ID0gZGVsaW1pdGVyLm5leHQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogbWF0Y2hlZFswXSA/IG1hdGNoZWRbMF0uc3RhcnRJbmRleCA6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIG1hdGNoZWQgaXRlbSBieSBpbmRleFxuXHRnZXRJdGVtKGluZGV4KSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZFtpbmRleF07XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XHRcdC8vIFRPRE86IHRocm93Pz8/XG5cdFx0bGV0IG1hdGNoZWQgPSB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC50b1NvdXJjZShjb250ZXh0KSApLmpvaW4oXCIsIFwiKTtcblx0XHRyZXR1cm4gYFske21hdGNoZWR9XWA7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYFske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMuaXRlbX0gJHt0aGlzLmRlbGltaXRlcn1dJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGUuanMiLCJpbXBvcnQgeyBkZWZpbmVNZW1vaXplZCB9IGZyb20gXCIuL21lbW9pemUuanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIHJlLWV4cG9ydCBSdWxlIGZvciB0ZXN0aW5nXG5leHBvcnQgZGVmYXVsdCBSdWxlO1xuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbi8vIFRPRE86XHRVc2Uga2V5d29yZHMgaW4gc3ludGF4IHRvIG1ha2UgYSBxdWljayByZWdleC1iYXNlZCBgdGVzdGAgZnVuY3Rpb24gZm9yIHRoZSBlbnRpcmUgcnVsZVxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cbi8vIFRPRE86IGNvbnZlcnQgdG8gVGV4dFN0cmVhbSBwYXR0ZXJuIGFsYSBub3JtYWwgcGFyc2VyIG9uY2UgdGhhdCBzZXR0bGVzIGRvd24/Pz9cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHR2YXIgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IGxhc3RJbmRleCA9IHN5bnRheFN0cmVhbS5sZW5ndGg7XG5cdFx0d2hpbGUgKHN0YXJ0SW5kZXggPCBsYXN0SW5kZXgpIHtcblx0XHRcdGxldCBbIHJ1bGUsIGVuZEluZGV4IF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGlmIChydWxlKSB7XG5cdFx0XHRcdHZhciBsYXN0ID0gcnVsZXNbcnVsZXMubGVuZ3RoLTFdO1xuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYFN0cmluZ2AgYW5kIGxhc3Qgd2FzIGEgYFN0cmluZ2AsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5TeW1ib2wpIHtcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuXHRcdFx0XHRcdC8vIGFuZCByZXBsYWNlIHdpdGggYSBydWxlIHRoYXQgbWVyZ2VzIHRoZSBrZXl3b3Jkc1xuXHRcdFx0XHRcdHJ1bGUgPSBSdWxlLm1lcmdlU3ltYm9scyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYEtleXdvcmRgIGFuZCBsYXN0IHdhcyBhbHNvIGEgYEtleXdvcmRgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRlbHNlIGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG5cdFx0XHRcdFx0cnVsZXMucG9wKCk7XG5cdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG5cdFx0XHRcdFx0cnVsZSA9IFJ1bGUubWVyZ2VLZXl3b3JkcyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRydWxlcy5wdXNoKHJ1bGUpO1xuXHRcdFx0fVxuXHRcdFx0c3RhcnRJbmRleCA9IGVuZEluZGV4ICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHZhciBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdC8vIGlmIHdlIGdvdCBhIFwiXFxcXFwiICh3aGljaCBhbHNvIGhhcyB0byBnbyBpbnRvIHRoZSBzb3VyY2Ugc3RyaW5nIGFzIFwiXFxcXFwiKVxuXHRcdC8vIHRyZWF0IHRoZSBuZXh0IHRva2VuIGFzIGEgbGl0ZXJhbCBzdHJpbmcgcmF0aGVyIHRoYW4gYXMgYSBzcGVjaWFsIGNoYXJhY3Rlci5cblx0XHRpZiAoc3ludGF4VG9rZW4gPT09IFwiXFxcXFwiKSB7XG5cdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggKyAxKTtcblx0XHR9XG5cblx0XHRzd2l0Y2ggKHN5bnRheFRva2VuKSB7XG5cdFx0XHRjYXNlIFwie1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIipcIjpcblx0XHRcdGNhc2UgXCIrXCI6XG5cdFx0XHRjYXNlIFwiP1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblxuXHRcdFx0Ly8gdGhlIGZvbGxvd2luZyBzaG91bGQgQUxXQVlTIGJlIGNvbnN1bWVkIGJ5IHRoZSBhYm92ZVxuXHRcdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGNhc2UgXCIpXCI6XG5cdFx0XHRjYXNlIFwiXVwiOlxuXHRcdFx0Y2FzZSBcInxcIjpcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7c3ludGF4VG9rZW59IGZvdW5kIGFzIGl0ZW0gJHtzdGFydEluZGV4fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdLCBydWxlO1xuXHRcdC8vIElmIGxldHRlcnMgb25seSwgbWF0Y2ggYXMgYSBLZXl3b3JkIChzbyB3ZSByZXF1aXJlIGEgd29yZCBib3VuZGFyeSBhZnRlciB0aGUgc3RyaW5nKS5cblx0XHRpZiAoc3RyaW5nLm1hdGNoKC9bQS1aYS16XSsvKSkge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLktleXdvcmQoeyBzdHJpbmcgfSk7XG5cdFx0fVxuXHRcdC8vIE90aGVyd2lzZSBtYXRjaCBhcyBhIFN0cmluZywgd2hpY2ggZG9lc24ndCByZXF1aXJlIG5vbi13b3JkIGNoYXJzIGFmdGVyIHRoZSB0ZXh0LlxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlN5bWJvbCh7IHN0cmluZzogc3RyaW5nIH0pO1xuXHRcdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRcdGlmIChzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIikpIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIGxlYWRpbmcgc2xhc2ggaW4gbWF0Y2ggc3RyaW5nLi4uXG5cdFx0XHRcdHJ1bGUuc3RyaW5nID0gcnVsZS5zdHJpbmcuc3Vic3RyKDEpO1xuXHRcdFx0XHQvLyBidXQgbGVhdmUgaXQgaW4gdG9TdHJpbmdcblx0XHRcdFx0cnVsZS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnRJbmRleCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdC8vIE5PVEU6IG5lc3RlZCBwYXJlbnMgbWF5IG5vdCBoYXZlIGFsdGVybmF0aXZlcy4uLiA6LSggICBgKGF8KGJ8YykpYCB3b24ndCB3b3JrPz8/XG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiKFwiLCBcIilcIiwgc3RhcnRJbmRleCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0Ly8gc3BsaXQgaW50byBncm91cHMsIGluY2x1ZGluZyBuZXN0ZWQgcGFyZW5zXG5cdFx0bGV0IGFsdGVybmF0aXZlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0aXZlcyhzbGljZSlcblx0XHRcdC5tYXAoZnVuY3Rpb24oZ3JvdXApIHtcblx0XHRcdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoZ3JvdXAsIFtdKTtcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHNbMF07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSdWxlLlNlcXVlbmNlKHsgcnVsZXM6IHJlc3VsdHMgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0bGV0IHJ1bGUgPSBhbHRlcm5hdGl2ZXMubGVuZ3RoID09PSAxID8gYWx0ZXJuYXRpdmVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0aXZlcyB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXG5cdFx0ZnVuY3Rpb24gZ3JvdXBBbHRlcm5hdGl2ZXModG9rZW5zKSB7XG5cdFx0XHR2YXIgYWx0ZXJuYXRpdmVzID0gW107XG5cdFx0XHR2YXIgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XHRjdXJyZW50ID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaGFuZGxlIG5lc3RlZCBwYXJlbnNcblx0XHRcdFx0ZWxzZSBpZiAodG9rZW4gPT09IFwiKFwiKSB7XG5cdFx0XHRcdFx0bGV0IHsgZW5kSW5kZXggfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHRva2VucywgXCIoXCIsIFwiKVwiLCBpKTtcblx0XHRcdFx0XHRjdXJyZW50ID0gY3VycmVudC5jb25jYXQodG9rZW5zLnNsaWNlKGksIGVuZEluZGV4ICsgMSkpO1xuXHRcdFx0XHRcdGkgPSBlbmRJbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdXJyZW50LnB1c2godG9rZW4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoY3VycmVudC5sZW5ndGgpIGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0cmV0dXJuIGFsdGVybmF0aXZlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdHZhciBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblxuXHRcdHZhciBwYXJhbXMgPSB7IHJ1bGU6IG1hdGNoLnNsaWNlWzBdIH07XG5cblx0XHQvLyBzZWUgaWYgdGhlcmUncyBhIGBub3RgIHJ1bGUgaW4gdGhlcmVcblx0XHRsZXQgYmFuZ1Bvc2l0aW9uID0gcGFyYW1zLnJ1bGUuaW5kZXhPZihcIiFcIik7XG5cdFx0aWYgKGJhbmdQb3NpdGlvbiAhPT0gLTEpIHtcblx0XHRcdHBhcmFtcy5ub3QgPSBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSk7IC8vWyBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSkgXTtcblx0XHRcdHBhcmFtcy5ydWxlID0gcGFyYW1zLnJ1bGUuc3Vic3RyKDAsIGJhbmdQb3NpdGlvbik7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5TdWJydWxlKHBhcmFtcyk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgbWF0Y2guZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBsaXN0IGV4cHJlc3Npb24gYFs8aXRlbT48ZGVsaW1pdGVyPl1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIltcIiwgXCJdXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHRpZiAocmVzdWx0cy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCBzdHVmZiBhdCBlbmQgb2YgbGlzdDogWyR7c2xpY2Uuam9pbihcIiBcIil9XWApO1xuXHRcdH1cblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLkxpc3QoKTtcblx0XHRydWxlLml0ZW0gPSByZXN1bHRzWzBdXG5cdFx0cnVsZS5kZWxpbWl0ZXIgPSByZXN1bHRzWzFdXG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxufSk7XG5cblxuXG4vLyAjIyAgQWRkIG1ldGhvZHMgdG8gUGFyc2VyIHRvIGRlZmluZSBydWxlcyB1c2luZyB0aGUgYWJvdmUgc3ludGF4LlxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUGFyc2VyLnByb3RvdHlwZSwge1xuXG5cdC8vIFBhcnNlIGEgYHJ1bGVTeW50YXhgIHJ1bGUgYW5kIGFkZCBpdCB0byBvdXIgbGlzdCBvZiBydWxlcy5cblx0Ly8gUmV0dXJucyB0aGUgbmV3IHJ1bGUuXG5cdC8vIExvZ3MgcGFyc2luZyBlcnJvcnMgYnV0IGFsbG93cyB0aGluZ3MgdG8gY29udGludWUuXG5cdGFkZFN5bnRheDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgY29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0Ly8gSWYgd2Ugb25seSBnb3QgMyBhcmdzLCBhbmQgMm5kIGlzIGEgZnVuY3Rpb24sIHVzZSBpdCBhcyBjb25zdHJ1Y3RvciBpbnN0ZWFkXG5cdFx0aWYgKHByb3BlcnRpZXMgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuXHRcdFx0Y29uc3RydWN0b3IgPSBwcm9wZXJ0aWVzO1xuXHRcdFx0cHJvcGVydGllcyA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgY29uc3RydWN0b3IpO1xuXHRcdFx0Ly8gUmVmbGVjdCB0aGUgcnVsZSBiYWNrIG91dCB0byBtYWtlIHN1cmUgaXQgbG9va3MgKG1vcmUgb3IgbGVzcykgdGhlIHNhbWVcblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRlZCBydWxlICcke25hbWV9JzpcXG4gIElOUFVUOiAke3J1bGVTeW50YXh9IFxcbiBPVVRQVVQ6ICR7cnVsZX1gKTtcblxuXHRcdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0fVxuXHR9fSxcblxuXHRhZGRTdGF0ZW1lbnQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIGNvbnN0cnVjdG9yID0gUnVsZS5TdGF0ZW1lbnQpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIGNvbnN0cnVjdG9yKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkRXhwcmVzc2lvbjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgY29uc3RydWN0b3IgPSBSdWxlLkV4cHJlc3Npb24pIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIGNvbnN0cnVjdG9yKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcnVsZSk7XG5cdH19LFxuXG5cdC8vIEFkZCBpbmZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgb3IgYlwiLlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZEluZml4T3BlcmF0b3I6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSkge1xuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRJbmZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50b0pTKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIGluZml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYClcblx0XHRcdH1cblx0XHRcdC8vIGNsZWFyIGxpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGZvciBnZXR0ZXIgYmVsb3dcblx0XHRcdGRlbGV0ZSB0aGlzLl9faW5maXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwiaW5maXhfb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIGluZml4IG9wZXJhdG9ycyBhcyBzdHJpbmdzLlxuXHQvLyBSZS1tZW1vaXplZCBhZnRlciBgYWRkSW5maXhPcGVyYXRvcmAgYWJvdmUuXG5cdGluZml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9faW5maXhPcGVyYXRvcnNcIixcblx0XHRmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucnVsZXNbXCJpbmZpeF9vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0ICYmIHRoaXMucnVsZXNbXCJpbmZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZylcblx0fSksXG5cblx0Ly8gQWRkIHBvc3RmaXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIGlzIGRlZmluZWRcIlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZFBvc3RmaXhPcGVyYXRvcjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKSB7XG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFBvc3RmaXhPcGVyYXRvcihuYW1lLCBzeW50YXgsIHByb3BlcnRpZXMpKTtcblx0XHR9XG5cblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudG9KUykge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBwb3N0Zml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBjbGVhciBsaXN0IG9mIGluZml4IG9wZXJhdG9ycyBmb3IgZ2V0dGVyIGJlbG93XG5cdFx0XHRkZWxldGUgdGhpcy5fX3Bvc3RmaXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwicG9zdGZpeF9vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH19LFxuXG5cdC8vIExpc3Qgb2YgcG9zdGZpeCBvcGVyYXRvcnMgYXMgc3RyaW5ncy5cblx0Ly8gUmUtbWVtb2l6ZWQgYWZ0ZXIgYGFkZEluZml4T3BlcmF0b3JgIGFib3ZlLlxuXHRwb3N0Zml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9fcG9zZml4T3BlcmF0b3JzXCIsXG5cdFx0ZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXMucnVsZXNbXCJwb3N0Zml4X29wZXJhdG9yXCJdXG5cdFx0XHRcdFx0XHQmJiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZyk7XG5cdH0pXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlU3ludGF4LmpzIiwiLy9cbi8vXHQjIENvcmUgYHJ1bGVzYCAtLSBzaW1wbGUgZGF0YXR5cGVzLCBldGMuXG4vL1xuLy8gTk9URTogbWFueSBvZiB0aGUgYmVsb3cgYXJlIGNyZWF0ZWQgYXMgY3VzdG9tIFBhdHRlcm4gc3ViY2xhc3NlcyBmb3IgZGVidWdnaW5nLlxuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gYHdoaXRlc3BhY2VgIHJ1bGUuXG4vLyBOT1RFIGBwYXJzZXIucGFyc2UoXCJ3aGl0ZXNwYWNlXCIsIFwiICAgXCIpYCB3aWxsIHJldHVybiBgdW5kZWZpbmVkYFxuLy9cdFx0IGJlY2F1c2UgYHBhcnNlci5wYXJzZSgpYCBhdXRvbWF0aWNhbGx5IGVhdHMgd2hpdGVzcGFjZSBhdCB0aGUgc3RhcnQgb2YgYSBydWxlLlxuUnVsZS5XaGl0ZXNwYWNlID0gY2xhc3Mgd2hpdGVzcGFjZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fVxucGFyc2VyLmFkZFJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIG5ldyBSdWxlLldoaXRlc3BhY2UoeyBwYXR0ZXJuOiAvXFxzKy8sIG9wdGlvbmFsOiB0cnVlIH0pKTtcblxuLy8gYGlkZW50aWZpZXJgID0gdmFyaWFibGVzIG9yIHByb3BlcnR5IG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcblJ1bGUuSWRlbnRpZmllciA9IGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgaWRlbnRpZmllciA9IHBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgUnVsZS5JZGVudGlmaWVyKHtcblx0cGF0dGVybjogL1thLXpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGlkZW50aWZpZXIpO1xuXG4vLyBBZGQgRW5nbGlzaCBwcmVwb3NpdGlvbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vL1xuLy8gV2lraXBlZGlhIFwiUHJlcG9zaXRpb25cIjpcbi8vXHRcIlByZXBvc2l0aW9ucy4uLmFyZSBhIGNsYXNzIG9mIHdvcmRzIHRoYXRcbi8vXHRleHByZXNzIHNwYXRpYWwgb3IgdGVtcG9yYWwgcmVsYXRpb25zICAoaW4sIHVuZGVyLCB0b3dhcmRzLCBiZWZvcmUpXG4vL1x0b3IgbWFyayB2YXJpb3VzIHNlbWFudGljIHJvbGVzIChvZiwgZm9yKS5cbi8vIFRFU1RNRVxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYWJvdXRcIiwgXCJhYm92ZVwiLCBcImFmdGVyXCIsIFwiYW5kXCIsIFwiYXNcIiwgXCJhdFwiLFxuXHRcImJlZm9yZVwiLCBcImJlaGluZFwiLCBcImJlbG93XCIsIFwiYmVuZWF0aFwiLCBcImJlc2lkZVwiLCBcImJldHdlZW5cIiwgXCJiZXlvbmRcIiwgXCJieVwiLFxuXHRcImRlZmluZWRcIiwgXCJkb3duXCIsIFwiZHVyaW5nXCIsXG5cdFwiZWFjaFwiLCBcImVtcHR5XCIsIFwiZXhhY3RseVwiLCBcImV4Y2VwdFwiLFxuXHRcImZvclwiLCBcImZyb21cIixcblx0XCJncmVhdGVyXCIsXG5cdFwiaW5cIiwgXCJpbnRvXCIsXG5cdFwibGVzc1wiLCBcImxvbmdcIixcblx0XCJtaW51c1wiLCBcIm1vcmVcIixcblx0XCJuZWFyXCIsIFwibm90XCIsXG5cdFwib2ZcIiwgXCJvZmZcIiwgXCJvblwiLCBcIm9udG9cIiwgXCJvcHBvc2l0ZVwiLCBcIm91dFwiLCBcIm91dHNpZGVcIiwgXCJvdmVyXCIsXG5cdFwic2hvcnRcIiwgXCJzaW5jZVwiLFxuXHRcInRoYW5cIiwgXCJ0aGVcIiwgXCJ0aGVuXCIsIFwidGhyb3VnaFwiLCBcInRocnVcIiwgXCJ0b1wiLCBcInRvd2FyZFwiLCBcInRvd2FyZHNcIixcblx0XCJ1bmRlZmluZWRcIiwgXCJ1bmRlclwiLCBcInVuZGVybmVhdGhcIiwgXCJ1bmlxdWVcIiwgXCJ1bnRpbFwiLCBcInVwXCIsIFwidXBvblwiLCBcInVwc2lkZVwiLFxuXHRcInZlcnN1c1wiLCBcInZzXCIsXG5cdFwid2l0aFwiLCBcIndpdGhpblwiLCBcIndpdGhvdXRcIixcbik7XG5cbi8vIEFkZCBjb21tb24gZW5nbGlzaCB2ZXJicyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFyZVwiLFxuXHRcImRvXCIsIFwiZG9lc1wiLFxuXHRcImNvbnRhaW5zXCIsXG5cdFwiaGFzXCIsIFwiaGF2ZVwiLFxuXHRcImlzXCIsXG5cdFwicmVwZWF0XCIsXG5cdFwid2FzXCIsIFwid2VyZVwiXG4pO1xuXG4vLyBBZGQgc3BlY2lhbCBjb250cm9sIGtleXdvcmRzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiZWxzZVwiLFxuXHRcImlmXCIsXG5cdFwib3RoZXJ3aXNlXCIsXG5cdFwid2hpbGVcIlxuKTtcblxuLy8gYFR5cGVgID0gdHlwZSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGFuIHVwcGVyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5UeXBlID0gY2xhc3MgdHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoXCJ0eXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvW0EtWl1bXFx3XFwtXSovLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdHlwZSk7XG5cblxuLy8gYG51bWJlcmAgYXMgZWl0aGVyIGZsb2F0IG9yIGludGVnZXIsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cblJ1bGUuTnVtYmVyID0gY2xhc3MgbnVtYmVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IG51bWJlciA9IHBhcnNlci5hZGRSdWxlKFwibnVtYmVyXCIsIG5ldyBSdWxlLk51bWJlcih7XG5cdHBhdHRlcm46IC8tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gbnVtYmVyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlRmxvYXQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBudW1iZXIpO1xuXG5cbi8vIE51bWVyaWMgYGludGVnZXJgIG9ubHksIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHRoaXMgV0lMTCBtYXRjaCBhIGZsb2F0LCBidXQgdGhlIHJldHVybmVkIHZhbHVlIHdpbGwgY29lcmNlIHRvIGFuIGludGVnZXIuXG4vLyBSRVZJRVc6IGlzIHRoaXMgcmlnaHQ/ICBCZXR0ZXIgdG8gbm90IG1hdGNoIGEgZmxvYXQ/XG5SdWxlLkludGVnZXIgPSBjbGFzcyBpbnRlZ2VyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJpbnRlZ2VyXCIsIG5ldyBSdWxlLkludGVnZXIoe1xuXHRwYXR0ZXJuOiAvLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0ZXh0ID0gcGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyBSdWxlLlRleHQoe1xuXHRwYXR0ZXJuOiAvKD86XCJbXlwiXSpcInwnW14nXSonKS9cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCB0ZXh0KTtcblxuXG4vLyBCb29sZWFuIGxpdGVyYWwsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFRPRE86IGJldHRlciBuYW1lIGZvciB0aGlzPz8/XG5SdWxlLkJvb2xlYW4gPSBjbGFzcyBib29sZWFuIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IGJvb2wgPSBwYXJzZXIuYWRkUnVsZShcImJvb2xlYW5cIiwgbmV3IFJ1bGUuQm9vbGVhbih7XG5cdHBhdHRlcm46IC8odHJ1ZXxmYWxzZXx5ZXN8bm98b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgYm9vbCk7XG4vLyBBZGQgYm9vbGVhbiB0b2tlbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcInRydWVcIiwgXCJmYWxzZVwiLFxuXHRcInllc1wiLCBcIm5vXCIsXG5cdFwib2tcIiwgXCJjYW5jZWxcIlxuKTtcblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxubGV0IGxpc3QgPSBwYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsX2xpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdGNsYXNzIGxpdGVyYWxfbGlzdCBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cbi8vVE9ETzogc3F1aXJyZWx5Li4uXG5cdFx0Ly8gV2hlbiBnYXRoZXJpbmcgYXJndW1lbnRzLCByZXR1cm4ganVzdCB0aGUgbWF0Y2hlZCBsaXN0IGRhdGEsIGlnbm9yaW5nIHRoZSBicmFja2V0cy5cblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiB0aGlzLm1hdGNoZWRbMV07XG5cdFx0fVxuXG5cdFx0Ly8gcmV0dXJuIGp1c3QgdGhlIGxpc3QgYXMgb3VyIHNvdXJjZVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcbiBcdFx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBQYXJlbnRoZXNpemVkIGV4cHJlc3Npb25cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwYXJlbnRoZXNpemVkX2V4cHJlc3Npb25cIixcblx0XCJcXFxcKHtleHByZXNzaW9ufVxcXFwpXCIsXG5cdGNsYXNzIHBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkWzFdO1xuXHRcdH1cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgZXhwcmVzc2lvbiA9IHRoaXMucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIGRvbid0IGRvdWJsZSBwYXJlbnMgaWYgbm90IG5lY2Vzc2FyeVxuXHRcdFx0aWYgKHR5cGVvZiBleHByZXNzaW9uID09PSBcInN0cmluZ1wiICYmIGV4cHJlc3Npb24uc3RhcnRzV2l0aChcIihcIikgJiYgZXhwcmVzc2lvbi5lbmRzV2l0aChcIilcIikpIHJldHVybiBleHByZXNzaW9uO1xuXHRcdFx0cmV0dXJuIGAoJHtleHByZXNzaW9ufSlgO1xuXHRcdH1cblx0fVxuKVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJcbi8vIFRPRE86IGNvbnZlcnQgdG8gbGluZS1hd2FyZSBzdHJlYW0/Pz9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRTdHJlYW0ge1xuXHQvLyBZb3UgY2FuIGNvbnN0cnVjdCB3aXRoIGEgdGV4dCBzdHJpbmcgb3IgYSBzZXQgb2YgcHJvcGVydGllcyAoaW5jbHVkaW5nIGB0ZXh0YCkuXG5cdGNvbnN0cnVjdG9yKC4uLnRleHRPclByb3BzKSB7XG5cdFx0dGV4dE9yUHJvcHMuZm9yRWFjaCgoYXJnKSA9PiB7XG5cdFx0XHRpZiAodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHR0aGlzLnRleHQgPSBhcmc7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChhcmcpIHtcblx0XHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBhcmcpO1xuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvLyBNYWtlIHN1cmUgYHRleHRgIGFuZCBgc3RhcnRJbmRleGAgYXJlIGRlZmluZWQuXG5cdFx0aWYgKCEoXCJ0ZXh0XCIgaW4gdGhpcykpIHRoaXMudGV4dCA9IFwiXCI7XG5cdFx0aWYgKCEoXCJzdGFydEluZGV4XCIgaW4gdGhpcykpIHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdH1cblxuXHQvLyBSZXR1cm4gYW4gaW1tdXRhYmxlIGNsb25lIG9mIHRoZSBzdHJlYW0uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0cmV0dXJuIG5ldyBUZXh0U3RyZWFtKHRoaXMsIHByb3BzKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2VkIHRvIG5ldyBzdGFydEluZGV4LlxuXHRhZHZhbmNlVG8oc3RhcnRJbmRleCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleCB9KTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2luZyBzdGFydEluZGV4IEJZIGBsZW5ndGhgXG5cdGFkdmFuY2VCeShsZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcblx0fVxuXG4vLyBcdC8vIFJldHVybiBjbG9uZSBvZiB0aGlzIHN0cmVhbSB3aXRoIGVuZEluZGV4IHNldCB0byBzdGFydCArIGBsZW5ndGhgXG4vLyBcdGVuZEFmdGVyKGxlbmd0aCkge1xuLy8gXHRcdHJldHVybiB0aGlzLmNsb25lKHsgZW5kSW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcbi8vIFx0fVxuXG4vL1xuLy8gIyMgTWF0Y2hpbmdcbi8vXG5cdC8vIE1hdGNoIGBwYXR0ZXJuYCBhcyByZWdleCBpbiB0aGlzIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBtYXRjaCBvciBgdW5kZWZpbmVkYC5cblx0Ly8gSWYgeW91IHdhbnQgdG8gdGVzdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmVhbSxcblx0Ly9cdG1ha2Ugc3VyZSB5b3VyIHJlZ2V4IHN0YXJ0cyB3aXRoIGBeYC5cblx0Ly8gVEVTVE1FOiB0aGlzIGxpa2VseSBicmVha3Mgd2l0aCBhIGBnYCBvbiB0aGUgcGF0dGVybj9cblx0bWF0Y2gocGF0dGVybikge1xuXHRcdGlmICghKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBUZXh0U3RyZWFtLm1hdGNoKCR7cGF0dGVybn0pOiBleHBlY3RlZCBSZWdFeHBgKTtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQubWF0Y2gocGF0dGVybikgfHwgdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGlzIHN0cmVhbSBJTkNMVURFIGEgcmVnZXggd2l0aGluIGl0P1xuXHQvLyBSZXR1cm5zIGB0cnVlYCBvciBgZmFsc2VgLlxuXHQvLyBOT1RFOiBQYXR0ZXJuIG11c3QgTk9UIHN0YXJ0IHdpdGggYF5gIGZvciB0aGlzIHRvIG1hdGNoIGluIHRoZSBtaWRkbGUgb2YgdGhlIHN0cmVhbS5cblx0dGVzdChwYXR0ZXJuKSB7XG5cdFx0cmV0dXJuIHBhdHRlcm4udGVzdCh0aGlzLmhlYWQpO1xuXHR9XG5cbi8vXG4vLyAjIyBSZWZsZWN0aW9uXG4vL1xuXHQvLyBSZXR1cm4gdGV4dCBvZiBzdHJpbmcgc3RhcnRpbmcgYXQgb3VyIGBzdGFydEluZGV4YFxuXHRnZXQgaGVhZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5yYW5nZSgpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgcmFuZ2Ugb2YgdGhlIHN0cmluZyBmcm9tIGBzdGFydEluZGV4YCB0byBgZW5kSW5kZXhgIE5PTi1pbmNsdXNpdmUuXG5cdHJhbmdlKHN0YXJ0SW5kZXggPSB0aGlzLnN0YXJ0SW5kZXgsIGVuZEluZGV4ID0gdGhpcy5lbmRJbmRleCB8fCB0aGlzLnRleHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5zdWJzdHJpbmcoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xuXHR9XG5cblx0Ly8gTGVuZ3RoIG9mIHRoZSBzdHJlYW0uXG5cdGdldCBsZW5ndGgoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5sZW5ndGg7XG5cdH1cblxuXHQvLyBBcmUgd2UgYXQgdGhlIGVuZCBvZiB0aGUgc3RyZWFtP1xuXHRnZXQgaXNFbXB0eSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGFydEluZGV4ID09PSB0aGlzLmxlbmd0aDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHRcblx0fTtcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9UZXh0U3RyZWFtLmpzIiwiaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGxvYWQgc3RhbmRhcmQgcnVsZXMgZmlsZXMgaGVyZVxuaW1wb3J0IFwiLi9jb3JlXCI7XG5pbXBvcnQgXCIuL251bWJlcnNcIjtcbmltcG9ydCBcIi4vb3BlcmF0b3JzXCI7XG5pbXBvcnQgXCIuL2lmXCI7XG5pbXBvcnQgXCIuL3N0YXRlbWVudHNcIjtcbmltcG9ydCBcIi4vY2xhc3NcIjtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9pbmRleC5qcyIsIi8vIE1lbW9pemUvZm9yZ2V0IHNlbWFudGljcy5cblxuLy8gUmV0dXJuIGEgbWVtb2l6aW5nIGdldHRlciBmdW5jdGlvbi5cbi8vIFRFU1RNRVxuZXhwb3J0IGZ1bmN0aW9uIG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0aGlzW3Byb3BlcnR5XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSBnZXR0ZXIuYXBwbHkodGhpcyk7XG5cdFx0XHRpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHQvLyBEZWZpbmUgc28gdGhhdCB3ZSBjYW4gYmUgZGVsZXRlZCBhbmQgcmUtZGVmaW5lZCwgYnV0IG5vdCBzZXQgb3IgZW51bWVyYXRlZC5cblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHByb3BlcnR5LCB7IHZhbHVlLCBjb25maWd1cmFibGU6IHRydWUgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzW3Byb3BlcnR5XTtcblx0fVxufVxuXG5cbi8vIFJldHVybiBhIG1lbW9pemUgZnVuY3Rpb24gZm9yIHVzZSBhcyBhIGdldHRlciBpbiBhIGBPYmplY3QuZGVmaW5lUHJvcGVydHkoKWBcbi8vIFRFU1RNRVxuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZU1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpIHtcblx0cmV0dXJuIHtcblx0XHRnZXQgOiBtZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKVxuXHR9XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvbWVtb2l6ZS5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVmaW5pbmcgY2xhc3NlcyAoa25vd24gYXMgYHR5cGVzYClcbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIocHJvcGVydGllczp0aGUge2lkZW50aWZpZXJ9IG9mKSsgdGhlPyB7ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgcHJvcGVydGllcyB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRwcm9wZXJ0aWVzID0gcHJvcGVydGllcy5yZXN1bHRzXG5cdFx0XHRcdFx0XHRcdC5yZXZlcnNlKClcblx0XHRcdFx0XHRcdFx0Lm1hcCggcHJvcGVydHkgPT4gcHJvcGVydHkuaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSApXG5cdFx0XHRcdFx0XHRcdC5qb2luKFwiLlwiKTtcblx0XHRcdHJldHVybiBgJHtleHByZXNzaW9ufS4ke3Byb3BlcnRpZXN9YDtcbi8vIE5PVEU6IHRoZSBmb2xsb3dpbmcgaXMgc2FmZXIsIGJ1dCB1Z2x5IGZvciBkZW1vIHB1cnBvc2VzXG4vL1x0XHRcdHJldHVybiBgc3BlbGwuZ2V0KCR7ZXhwcmVzc2lvbn0sIFsnJHtwcm9wZXJ0aWVzfSddKWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbnBhcnNlci5hZGRTeW50YXgoXCJzY29wZV9tb2RpZmllclwiLCBcIihzY29wZTpnbG9iYWx8Y29uc3RhbnR8c2hhcmVkfGxvY2FsKVwiKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwie3Njb3BlX21vZGlmaWVyfT8ge2Fzc2lnbm1lbnR9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBhc3NpZ25tZW50LCBzY29wZV9tb2RpZmllciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0YXNzaWdubWVudCA9IGFzc2lnbm1lbnQudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgc2NvcGUgPSBzY29wZSAmJiBzY29wZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN3aXRjaCAoc2NvcGUpIHtcblx0XHRcdFx0Y2FzZSBcImdsb2JhbFwiOlxuXHRcdFx0XHRcdHJldHVybiBgZ2xvYmFsLiR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZFwiOlxuXHRcdFx0XHRcdHJldHVybiBgc3RhdGljICR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJsb2NhbFwiOlxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBhc3NpZ25tZW50O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuLy8gVE9ETzogd2FybiBvbiBpbnZhbGlkIHNldD8gIHNoYXJlZD8gIHVuZGVmaW5lZD8gc29tZXRoaW5nIG90aGVyIHRoYW4gdGhlIGZpcnN0IHZhbHVlIGFzIGRlZmF1bHQ/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlfYXNfb25lX29mXCIsXG5cdFwie3Njb3BlX21vZGlmaWVyfT8ge2lkZW50aWZpZXJ9IGFzIG9uZSBvZiB7bGlzdDpsaXRlcmFsX2xpc3R9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzY29wZV9tb2RpZmllciwgaWRlbnRpZmllciwgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuLy9UT0RPOiBub3QgaGFuZGxpbmcgc2NvcGVfbW9kaWZpZXJcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHBsdXJhbCA9IChpZGVudGlmaWVyICsgXCJfVkFMVUVTXCIpLnRvVXBwZXJDYXNlKCk7XG5cdFx0XHRsZXQgdmFsdWVzID0gbGlzdC50b1NvdXJjZShjb250ZXh0KTtcbi8vVE9ETzogbGlzdC5nZXRJdGVtKDApXG5cdFx0XHRsZXQgZmlyc3QgPSBsaXN0LnJlc3VsdHMubWF0Y2hlZFswXTtcblx0XHRcdGxldCBmaXJzdFZhbHVlID0gZmlyc3QgPyBmaXJzdC50b1NvdXJjZShjb250ZXh0KSA6IFwidW5kZWZpbmVkXCI7XG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke3BsdXJhbH0gPSAke3ZhbHVlc307XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0geyByZXR1cm4gKFwiX18ke2lkZW50aWZpZXJ9XCIgaW4gdGhpcyA/IHRoaXMuX18ke2lkZW50aWZpZXJ9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfVxcbmA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY2xhc3MuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBudW1iZXJzXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vLyBUT0RPOiBpZiBgaWRlbnRpZmllcmAgaXMgXCJ3b3JkXCIsIG91dHB1dCBgZ2V0V29yZCgpYCBldGNcbmNsYXNzIGluZGV4X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb257XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgeyBpZGVudGlmaWVyLCBudW1iZXIsIGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRudW1iZXIgPSBudW1iZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7bnVtYmVyfSlgO1xuXHR9XG59XG5cbi8vIE51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmc6XG4vL1x0LSBgaXRlbSAxIG9mIC4uLmBcbi8vXHQtIGBpdGVtICMyIG9mIC4uLmBcbi8vIE5PVEU6IHRoZXNlIGluZGljZXMgYXJlIE9ORSBiYXNlZCwgTk9UIHplcm8gYmFzZWQgYXMgaXMgSmF2YXNjcmlwdC5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFwiaW5kZXhfZXhwcmVzc2lvblwiLCBcIntpZGVudGlmaWVyfSAoIyk/e251bWJlcjppbnRlZ2VyfSBvZiB7ZXhwcmVzc2lvbn1cIiwgaW5kZXhfZXhwcmVzc2lvbik7XG5cblxucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJmaXJzdFwiLCB7IHRvU291cmNlOiAoKSA9PiAxIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJzZWNvbmRcIiwgeyB0b1NvdXJjZTogKCkgPT4gMiB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwidGhpcmRcIiwgeyB0b1NvdXJjZTogKCkgPT4gMyB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZm91cnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDQgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImZpZnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDUgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInNpeHRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDYgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInNldmVudGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gNyB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZWlnaHRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDggfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcIm5pbnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDkgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInRlbnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDEwIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJwZW51bHRpbWF0ZVwiLCB7IHRvU291cmNlOiAoKSA9PiAtMiB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZmluYWxcIiwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImxhc3RcIiwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cbi8vIFRPRE86IHNpeHR5LWZpZnRoLCB0d28gaHVuZHJlZCBmb3J0eSBuaW50aC4uLlxuXG4vLyBBbHRlcm5hdGl2ZSBmb3JtIGZvciBudW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nLlxuLy8gTk9URTogZG9uJ3QgYWRkIGFzIGFuIGV4cHJlc3Npb24gc2luY2Ugd2UncmUgYXV0by1tZXJnZWQgd2l0aCBgaW5kZXhfZXhwcmVzc2lvbmAgYWJvdmUuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4X2V4cHJlc3Npb25cIiwgXCJ0aGUge251bWJlcjpvcmRpbmFsfSB7aWRlbnRpZmllcn0gb2Yge2V4cHJlc3Npb259XCIsIGluZGV4X2V4cHJlc3Npb24pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvbnVtYmVycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgaW5maXggYW5kIHByZWZpeCBvcGVyYXRvcnMuXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8jIyBJbmZpeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj4ge3Joc31gLCBlZzogYGEgaXMgMWBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgdHdvIGFyZ3VtZW50cyAoYGxoc2AgYW5kIGByaHNgKSBpbnRvIG91dHB1dC5cblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJhbmRcIiwgXCJhbmRcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICYmICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcIm9yXCIsIFwib3JcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9IHx8ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNcIiwgXCJpc1wiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90XCIsIFwiaXMgbm90XCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPSAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX2V4YWN0bHlcIiwgXCJpcyBleGFjdGx5XCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90X2V4YWN0bHlcIiwgXCJpcyBub3QgZXhhY3RseVwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT09ICR7Yn0pYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzT2ZUeXBlKHRoaW5nLCB0eXBlKWBcbi8vVE9ETzogYGlzIHNhbWUgdHlwZSBhc2AgP1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc190eXBlX29mXCIsIFtcImlzIGFcIiwgXCJpcyBhblwiXSwgeyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90X3R5cGVfb2ZcIiwgW1wiaXMgbm90IGFcIiwgXCJpcyBub3QgYW5cIl0sIHsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5jb250YWlucyhjb2xsZWN0aW9uLCB0aGluZylgXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX2luXCIsIFtcImlzIGluXCIsIFwiaXMgb25lIG9mXCJdLCB7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGBzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90X2luXCIsIFtcImlzIG5vdCBpblwiLCBcImlzIG5vdCBvbmUgb2ZcIl0sIHsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCFzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcbi8vVEVTVE1FXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImluY2x1ZGVzXCIsIFtcImluY2x1ZGVzXCIsIFwiY29udGFpbnNcIl0sIHsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYHNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJkb2VzbnRfaW5jbHVkZVwiLCBbXCJkb2VzIG5vdCBpbmNsdWRlXCIsIFwiZG9lc250IGluY2x1ZGVcIiwgXCJkb2VzIG5vdCBjb250YWluXCIsIFwiZG9lc250IGNvbnRhaW5cIl0sIHsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCFzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndFwiLCBbXCI+XCIsIFwiaXMgZ3JlYXRlciB0aGFuXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0ZVwiLCBbXCI+PVwiLCBcImlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0b1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibHRcIiwgW1wiPFwiLCBcImlzIGxlc3MgdGhhblwiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJsdGVcIiwgW1wiPD1cIiwgXCJpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG9cIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9fSk7XG5cbi8vVE9ETzogIGNhbid0IGFkZCBgK2AgYXMgYSBydWxlLCBmaXggdGhpcyB0aGVuIGFkZCB0aGVzZVxuLy9UT0RPOiAgb3BlcmF0b3IgcHJlY2VkZW5jZT8/P1xuLy9URVNUTUVcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwicGx1c1wiLCBbXCJcXFxcK1wiLCBcInBsdXNcIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKyAke2J9YCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcIm1pbnVzXCIsIFtcIi1cIiwgXCJtaW51c1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAtICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwidGltZXNcIiwgW1wiXFxcXCpcIiwgXCJ0aW1lc1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZGl2aWRlZF9ieVwiLCBbXCIvXCIsIFwiZGl2aWRlZCBieVwiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH19KTtcblxuLy9UT0RPOiAgYCs9YCBldGM/ICBvdGhlciBtYXRoIGZ1bmN0aW9ucz9cblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwiaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntsaHM6ZXhwcmVzc2lvbn0ge29wZXJhdG9yOmluZml4X29wZXJhdG9yfSB7cmhzOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGluZml4X29wZXJhdG9yX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxocywgcmhzLCBvcGVyYXRvciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIG9wZXJhdG9yLnRvSlMobGhzLnRvU291cmNlKGNvbnRleHQpLCByaHMudG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8jIyBQb3N0aWZ4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPmAsIGUuZy4gYGEgaXMgZGVmaW5lZGBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgYXJndW1lbnQgKGBsaHNgKSBpbnRvIEpTIG91dHB1dC5cblxucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX2RlZmluZWRcIiwgXCJpcyBkZWZpbmVkXCIsIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gIT09ICd1bmRlZmluZWQnKWAgfX0pO1xucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX25vdF9kZWZpbmVkXCIsIFtcImlzIG5vdCBkZWZpbmVkXCIsIFwiaXMgdW5kZWZpbmVkXCJdLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXNfZW1wdHlcIiwgXCJpcyBlbXB0eVwiLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX25vdF9lbXB0eVwiLCBcImlzIG5vdCBlbXB0eVwiLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAhc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicG9zdGZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2V4cHJlc3Npb259IHtvcGVyYXRvcjpwb3N0Zml4X29wZXJhdG9yfVwiLFxuXHRjbGFzcyBwb3N0Zml4X29wZXJhdG9yX2V4cHJlc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG4vL3BhcnNlci5hZGRTeW50YXgoXCJvcGVyYXRvcl9leHByZXNzaW9uXCIsIFwiKGV4cHJlc3Npb246e3Bvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvbn18e2luZml4X29wZXJhdG9yX2V4cHJlc3Npb259KVwiKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJpbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuaW1wb3J0IFwiLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL3J1bGVzL2luZGV4LmpzXCI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHR3aW5kb3cuVGV4dFN0cmVhbSA9IFRleHRTdHJlYW07XG5cdHdpbmRvdy5QYXJzZXIgPSBQYXJzZXI7XG5cdHdpbmRvdy5SdWxlID0gUnVsZTtcblx0d2luZG93LnBhcnNlciA9IHBhcnNlcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuXHRUZXh0U3RyZWFtLCBQYXJzZXIsIFJ1bGUsIHBhcnNlclxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvaW5kZXguanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5jbGFzcyBhc3NpZ25tZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnR7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgeyB0aGluZywgdmFsdWUgfSA9IHRoaXMucmVzdWx0cztcblx0XHRpZiAodGhpbmcgaW5zdGFuY2VvZiBSdWxlLklkZW50aWZpZXIpIHtcblx0XHRcdC8vIFRPRE86IGRlY2xhcmUgaWRlbnRpZmllciBpZiBub3QgaW4gc2NvcGUsIGV0Y1xuXHRcdH1cblxuXHRcdHJldHVybiBgJHt0aGluZy50b1NvdXJjZShjb250ZXh0KX0gPSAke3ZhbHVlLnRvU291cmNlKGNvbnRleHQpfWA7XG5cdH1cbn1cblxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJ7dGhpbmc6ZXhwcmVzc2lvbn0gPSB7dmFsdWU6ZXhwcmVzc2lvbn1cIiwgYXNzaWdubWVudCk7XG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYXNzaWdubWVudFwiLCBcInNldCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8ge3ZhbHVlOmV4cHJlc3Npb259XCIsIGFzc2lnbm1lbnQpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlXCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5jbGFzcyBpZl9zdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7fVxuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJpZlwiLFxuXHRcImlmIHtleHByZXNzaW9ufSAodGhlbnw6KSB7c3RhdGVtZW50fT9cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgaWYgKCR7ZXhwcmVzc2lvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0cmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSlgXG5cdFx0fSxcblx0fSxcblx0aWZfc3RhdGVtZW50XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImlmXCIsXG5cdFwie3N0YXRlbWVudH0gaWYge2V4cHJlc3Npb259IChlbHNlUGhyYXNlOihlbHNlfG90aGVyd2lzZSkge3N0YXRlbWVudH0pP1wiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgc3RhdGVtZW50LCBlbHNlUGhyYXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblx0XHRcdGxldCBlbHNlU3RhdGVtZW50ID0gZWxzZVBocmFzZSAmJiBlbHNlUGhyYXNlLnJlc3VsdHMuc3RhdGVtZW50LnRvU291cmNlKCk7XG5cblx0XHRcdGlmIChlbHNlU3RhdGVtZW50KSByZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9IGVsc2UgeyAke2Vsc2VTdGF0ZW1lbnR9IH1gXG5cdFx0XHRyZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHR9LFxuXHR9LFxuXHRpZl9zdGF0ZW1lbnRcbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiaWZcIixcblx0XCIoZWxzZXxvdGhlcndpc2UpIGlmIHtleHByZXNzaW9ufSAodGhlbnw6KSB7c3RhdGVtZW50fT9cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGVsc2UgaWYgKCR7ZXhwcmVzc2lvbn0pYFxuXHRcdH0sXG5cdH0sXG5cdGlmX3N0YXRlbWVudFxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJpZlwiLFxuXHRcIihlbHNlfG90aGVyd2lzZSkge3N0YXRlbWVudH0/XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblxuXHRcdFx0aWYgKHN0YXRlbWVudCkgcmV0dXJuIGBlbHNlIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0cmV0dXJuIGBlbHNlYFxuXHRcdH0sXG5cdH0sXG5cdGlmX3N0YXRlbWVudFxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9pZi5qcyJdLCJzb3VyY2VSb290IjoiIn0=