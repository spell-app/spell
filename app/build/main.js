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
		value: function parse(name, stream, atHead) {
			if (typeof stream === "string") stream = new _TextStream2.default(stream);
			var rule = this.getRule(name);
			if (!rule) throw new SyntaxError("parser.parse(" + name + "): Rule not found");
			stream = this.eatWhitespace(stream);
			return rule.parse(this, stream, atHead);
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

		// Add a rule to our list of rules!
		// Converts to `alternatives` on re-defining the same rule.

	}, {
		key: "addRule",
		value: function addRule(name, rule) {
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
				// don't override ruleName
				if (!rule.ruleName) rule.ruleName = name;
				this.rules[name] = rule;
			}
			return rule;
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
//		- `rule.gatherArguments()`		Return matched arguments in a format suitable to do:
//		- `rule.toSource()`				Return javascript source to interpret the rule.
//


var _Parser = __webpack_require__(1);

var _Parser2 = _interopRequireDefault(_Parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

//TODO: make gatherArguments() static and call on this

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
		value: function clone(props) {
			var clone = Object.create(this);
			Object.assign(clone, props);
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
		// If `atHead` is `true`, we'll only accept a match at the beginning of the stream.
		// Returns results of the parse or `undefined`.

	}, {
		key: "parse",
		value: function parse(parser, stream) {
			var atHead = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

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

		//
		// ## output as source
		//

	}, {
		key: "gatherArguments",
		value: function gatherArguments() {
			return this.constructor.gatherArguments(this);
		}

		// Output value for this INSTANTIATED rule as source.

	}, {
		key: "toSource",
		value: function toSource() {
			return this.matched;
		}

		//
		// ## group: reflection
		//

	}, {
		key: "_arg",
		get: function get() {
			return this.argument || this.ruleName || this.constructor.name;
		}

		// "gather" arguments in preparation to call `toSource()`
		// Note that we define `gatherArguments()` statically on each subclass
		//	and then instance method calls it on itself.

	}, {
		key: "ruleType",
		get: function get() {
			return this.constructor.name;
		}
	}], [{
		key: "gatherArguments",
		value: function gatherArguments(rule) {
			return rule;
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
		value: function parse(parser, stream) {
			var atHead = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

			// If `atHead` is true, use `startPattern` defined in constructor above, much more efficient!
			var match = stream.match(atHead ? this.startPattern : this.pattern);
			if (!match) return undefined;

			// bail if present in blacklist
			var matched = match[0];
			if (this.blacklist && this.blacklist[matched]) return undefined;

			var matchStream = stream.advanceBy(match.index);
			return this.clone({
				matched: matched,
				startIndex: matchStream.startIndex,
				endIndex: matchStream.startIndex + matched.length,
				stream: matchStream
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

			for (var _len = arguments.length, words = Array(_len), _key = 0; _key < _len; _key++) {
				words[_key] = arguments[_key];
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
		value: function parse(parser, stream, atHead) {
			var rule = parser.getRule(this.rule);
			if (!rule) throw new SyntaxError("Attempting to parse unknown rule '" + this.name + "'", this);
			var result = rule.parse(parser, stream, atHead);
			if (!result) return undefined;

			if (this.argument) result.argument = this.argument;
			return result;
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
		value: function parse(parser, stream, atHead) {
			var results = [],
			    next = stream;
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = this.rules[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var rule = _step.value;

					next = parser.eatWhitespace(next);
					var result = rule.parse(parser, next, atHead);
					if (!result && !rule.optional) return undefined;
					if (result) {
						results.push(result);
						next = result.next();
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
				results: results,
				endIndex: next.startIndex,
				stream: stream
			});
		}

		//TODOC
		// Gather arguments from our parsed `results` array.
		// Returns an object with properties from the `values` array indexed by
		//		- `results.argument`:		argument set when rule was declared, eg: `{value:literal}` => `value`
		//		- `results.ruleName`:		name of rule when defined
		//		- rule type:				name of the rule type

	}, {
		key: "toString",
		value: function toString() {
			return "" + this.rules.join(" ") + (this.optional ? '?' : '');
		}
	}], [{
		key: "gatherArguments",
		value: function gatherArguments(sequence) {
			if (!sequence.results) return undefined;
			var args = {};
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = sequence.results[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var next = _step2.value;

					var argName = next._arg;
					// For nested rules, recurse to get their arguments
					var result = next.gatherArguments();

					// If arg already exists, convert to an array
					if (argName in args) {
						if (!Array.isArray(args[argName])) args[argName] = [args[argName]];
						args[argName].push(result);
					} else {
						args[argName] = result;
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

			return args;
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

// Alternative syntax.
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
		value: function parse(parser, stream, atHead) {
			var bestMatch = void 0;
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = this.rules[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var rule = _step3.value;

					var match = rule.parse(parser, stream, atHead);
					if (!match) continue;

					// take the longest match
					if (!bestMatch || match.endIndex > bestMatch.endIndex) bestMatch = match;
				}
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

			// assign argName
			// console.info(this);
			// console.info(bestMatch);
			if (this.argument) bestMatch.argument = this.argument;else if (this.ruleName) bestMatch.ruleName = this.ruleName;
			return bestMatch;

			return this.clone({
				matched: bestMatch,
				startIndex: bestMatch.stream.startIndex,
				endIndex: bestMatch.endIndex,
				stream: bestMatch.stream
			});
		}
	}, {
		key: "addRule",
		value: function addRule(rule) {
			this.rules.push(rule);
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			return this.matched.toSource();
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
//	`this.results` is array of results of matches.
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
		value: function parse(parser, stream, atHead) {
			var next = stream;
			var results = [];
			while (true) {
				next = parser.eatWhitespace(next);
				var result = this.rule.parse(parser, next, atHead);
				if (!result) break;

				results.push(result);
				next = result.next();
			}

			if (results.length === 0) return undefined;

			return this.clone({
				results: results,
				endIndex: next.startIndex,
				stream: stream
			});
		}
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
	}], [{
		key: "gatherArguments",
		value: function gatherArguments(repeat) {
			if (!repeat.results) return undefined;
			return repeat.results.map(function (result) {
				return result.gatherArguments();
			});
		}
	}]);

	return Repeat;
}(Rule.Nested);

// List match rule:   `[<item><delimiter>]`. eg" `[{number},]` to match `1,2,3`
//	`rule.item` is the rule for each item,
//	`rule.delimiter` is the delimiter between each item.
// 	`rule.results` in the output is the list of values.
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
		value: function parse(parser, stream, atHead) {
			// ensure item and delimiter are optional so we don't barf in `parseRule`
			this.item.optional = true;
			this.delimiter.optional = true;

			var results = [],
			    next = stream;
			while (true) {
				next = parser.eatWhitespace(next);
				// get next item, exiting if not found
				var item = this.item.parse(parser, next, atHead);
				if (!item) break;
				//console.log(item);
				results.push(item);
				next = item.next();

				next = parser.eatWhitespace(next);
				// get delimiter, exiting if not found
				var delimiter = this.delimiter.parse(parser, next, atHead);
				if (!delimiter) break;
				next = delimiter.next();
			}

			return this.clone({
				results: results,
				startIndex: results[0] ? results[0].startIndex : stream.startIndex,
				endIndex: next.startIndex,
				stream: stream
			});
		}

		// Return matched item by index

	}, {
		key: "getItem",
		value: function getItem(index) {
			if (!this.results) return undefined;
			return this.results[index];
		}
	}, {
		key: "toSource",
		value: function toSource() {
			if (!this.results) return undefined; // TODO: throw???
			var results = this.results.map(function (result) {
				return result.toSource();
			}).join(", ");
			return "[" + results + "]";
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
		var rule = new _Rule2.default.Subrule({ rule: match.slice[0] });
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
			var SequenceConstructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.Sequence;

			try {
				var rule = _Rule2.default.parseRuleSyntax(ruleSyntax, SequenceConstructor);

				// Reflect the rule back out to make sure it looks (more or less) the same
				if (_Parser2.default.debug) console.log("Added rule '" + name + "':\n  INPUT: " + ruleSyntax + " \n OUTPUT: " + rule);

				Object.assign(rule, properties);
				return this.addRule(name, rule);
			} catch (e) {
				console.group("Error parsing syntax for rule '" + name + "':");
				console.log("syntax: " + ruleSyntax);
				console.error(e);
			}
		} },

	addStatement: { value: function value(name, ruleSyntax, properties) {
			var rule = this.addSyntax(name, ruleSyntax, properties, _Rule2.default.Statement);
			if (rule) return this.addRule("statement", rule);
		} },

	addExpression: { value: function value(name, ruleSyntax, properties) {
			var rule = this.addSyntax(name, ruleSyntax, properties, _Rule2.default.Expression);
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
_parser2.default.rules.identifier.addToBlacklist("about", "above", "after", "and", "as", "at", "before", "behind", "below", "beneath", "beside", "between", "beyond", "by", "defined", "down", "during", "each", "empty", "exactly", "except", "for", "from", "greater", "in", "into", "less", "long", "minus", "more", "near", "not", "of", "off", "on", "onto", "opposite", "out", "outside", "over", "short", "since", "than", "then", "through", "thru", "to", "toward", "towards", "undefined", "under", "underneath", "unique", "until", "up", "upon", "upside", "versus", "vs", "with", "within", "without");

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
var list = _parser2.default.addExpression("literal_list", "\\[[list:{expression},]?\\]", {
	// When gathering arguments, return just the matched list data.
	gatherArguments: function gatherArguments() {
		return this.results[1];
	},

	// return just the list as our source
	toSource: function toSource(context) {
		return this.gatherArguments().toSource();
	}
});

// Literal value as number, text or boolean.
//TODO: this is an expression... but installing it that way breaks parsing...?
//TESTME: add literal-list to this?
_parser2.default.addSyntax("literal", "(literal:{number}|{text}|{boolean}|{literal_list})");

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

__webpack_require__(13);

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

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(4);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// re-export parser for testing.
//
//	# Rules for creating variables, property access, etc
//

exports.default = _parser2.default;

// TODO: {property-expression} also works... {assignable-expression} ???

_parser2.default.addStatement("assignment", "{identifier} = {expression}", {
	toSource: function toSource(context) {
		var args = this.gatherArguments();
		var identifier = args.identifier.toSource();
		var value = args.expression.toSource();
		// TODO: declare identifier if not in scope, etc
		return identifier + " = " + value;
	}
});

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// re-export parser for testing.
exports.default = _parser2.default;

//parser.addExpression("property_expression", "{property:property_name}+ {expression}", {
//
//	# Rules for defining classes (known as `types`)
//

_parser2.default.addExpression("property_expression", "(properties:the {identifier} of)+ {expression}", {
	gatherArguments: function gatherArguments() {
		var args = Rule.Expression.gatherArguments(this);
		// transform properties and reverse order
		args.properties = args.properties.map(function (sequence) {
			return sequence.identifier;
		}).reverse();
		return args;
	},
	toSource: function toSource(context) {
		var args = this.gatherArguments();
		var thing = args.expression.toSource();
		var properties = args.properties.map(function (identifier) {
			return identifier.toSource();
		}).join(".");
		return "spell.get(" + thing + ", '" + properties + "')";
	}
});

_parser2.default.addSyntax("scope_modifier", "(scope:global|constant|shared)");

_parser2.default.addStatement("declare_property", "{scope_modifier}? {assignment}", {
	toSource: function toSource(context) {
		var args = this.gatherArguments();
		var identifier = args.assignment.identifier.toSource();
		var value = args.assignment.expression.toSource();
		var assignment = identifier + " = " + value;

		var scope = args.scope ? args.scope.toSource() : "local";
		switch (scope) {
			case "global":
				return "global." + assignment;

			case "constant":
				return "const " + assignment;

			case "shared":
				return "static " + assignment;

			default:
				return assignment;
		}
	}
});

// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
_parser2.default.addStatement("declare_property_as_one_of", "{identifier} as one of {list:literal_list}", {
	toSource: function toSource(context) {
		var args = this.gatherArguments();
		var identifier = args.identifier.toSource();
		var plural = (identifier + "_VALUES").toUpperCase();
		var list = args.list.list;
		var values = list.toSource();
		var first = list.results[0];
		var firstValue = first ? first.toSource() : "undefined";

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

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// re-export parser for testing.
exports.default = _parser2.default;

// Numeric index in a list-like thing.
//
//	# Rules for dealing with numbers
//

_parser2.default.addExpression("index_expression", "item {number:integer} of {expression}", {
	toSource: function toSource() {
		var args = this.gatherArguments();
		var number = args.number.toSource();
		var expression = args.expression.toSource();
		return "spell.getItem(" + expression + ", " + number + ")";
	}
});

// English words used for position of something in a list.
// TODO: `seventy-seventh`, `third-to-last`...
_parser2.default.addSyntax("ordinal", "(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|penultimate|last|final)", {
	toSource: function toSource(context) {
		var ordinal = this.matched.toSource();
		switch (ordinal) {
			case "first":
				return 1;
			case "second":
				return 2;
			case "third":
				return 3;
			case "fourth":
				return 4;
			case "fifth":
				return 5;
			case "sixth":
				return 6;
			case "seventh":
				return 7;
			case "eighth":
				return 8;
			case "ninth":
				return 9;
			case "tenth":
				return 10;
			case "penultimate":
				return -2;
			case "last":
				return -1;
			case "final":
				return -1;
		}
	}
});

// Alternative form for numeric index in a list-like thing.
_parser2.default.addExpression("index_expression", "the {ordinal} item of {expression}", {
	toSource: function toSource() {
		var args = this.gatherArguments();
		var ordinal = args.ordinal.toSource();
		var expression = args.expression.toSource();
		return "spell.getItem(" + expression + ", " + ordinal + ")";
	}
});

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(4);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// re-export parser for testing.
//
//	# Rules for infix and prefix operators.
//

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

_parser2.default.addSyntax("infix_operator_expression", "{lhs:expression} {operator:infix_operator} {rhs:expression}", {
	toSource: function toSource(context) {
		var args = this.gatherArguments();
		var lhs = args.lhs.toSource(context);
		var rhs = args.rhs.toSource(context);

		var toJS = args.operator.toJS;
		return toJS(lhs, rhs);
	}
});

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

_parser2.default.addSyntax("postfix_operator_expression", "{lhs:expression} {operator:postfix_operator}", {
	toSource: function toSource(context) {
		var args = this.gatherArguments();
		var lhs = args.lhs.toSource(context);
		var toJS = args.operator.toJS;
		return toJS(lhs);
	}
});

// TODO: this should really be a general "expression"...
_parser2.default.addSyntax("operator_expression", "(expression:{postfix_operator_expression}|{infix_operator_expression})");

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

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(4);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// re-export parser for testing.
//
//	# Rules for creating variables, property access, etc
//

exports.default = _parser2.default;

//TESTME

_parser2.default.addStatement("if", "if {expression} then {number}?", {
	toSource: function toSource(context) {}
});

/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgNDE4NmVhYjA1NjY1YzRhNTdjN2MiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZVN5bnRheC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIl0sIm5hbWVzIjpbInBhcnNlciIsIndpbmRvdyIsImNvbnNvbGUiLCJncm91cCIsImxvZyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInJ1bGVzIiwiY3JlYXRlIiwibmFtZSIsInN0cmVhbSIsImF0SGVhZCIsInJ1bGUiLCJnZXRSdWxlIiwiU3ludGF4RXJyb3IiLCJlYXRXaGl0ZXNwYWNlIiwicGFyc2UiLCJyZXN1bHQiLCJ3aGl0ZXNwYWNlIiwiYWR2YW5jZUJ5IiwibWF0Y2hlZCIsImxlbmd0aCIsImV4aXN0aW5nIiwiQWx0ZXJuYXRpdmVzIiwiZGVidWciLCJydWxlTmFtZSIsImFyZ3VtZW50IiwiYWRkUnVsZSIsInRva2VucyIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsInN0YXJ0SW5kZXgiLCJuZXN0aW5nIiwibmVzdGVkIiwiZW5kSW5kZXgiLCJsYXN0SW5kZXgiLCJ0b2tlbiIsInNsaWNlIiwic3RyaW5nIiwic3BsaXQiLCJtYXAiLCJjaGFyIiwiaW5kZXgiLCJsaXN0IiwiUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyIsImpvaW4iLCJmbGFncyIsIlJlZ0V4cCIsImVzY2FwZVJlZ0V4cENoYXJhY3RlcnMiLCJERUJVRyIsImNoYXJzIiwiZm9yRWFjaCIsIlJ1bGUiLCJjb25zdHJ1Y3RvciIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwicHJvcHMiLCJjbG9uZSIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsImdhdGhlckFyZ3VtZW50cyIsIlBhdHRlcm4iLCJwYXR0ZXJuIiwiZGVmaW5lUHJvcGVydHkiLCJ2YWx1ZSIsInNvdXJjZSIsIm1hdGNoIiwic3RhcnRQYXR0ZXJuIiwiYmxhY2tsaXN0IiwibWF0Y2hTdHJlYW0iLCJ3b3JkcyIsIndvcmQiLCJTeW1ib2wiLCJSZWdFeHBGcm9tU3RyaW5nIiwib3B0aW9uYWwiLCJtZXJnZVN5bWJvbHMiLCJmaXJzdCIsInNlY29uZCIsIktleXdvcmQiLCJwYXR0ZXJuU3RyaW5nIiwibWVyZ2VLZXl3b3JkcyIsIlN1YnJ1bGUiLCJpc0RldGVybWluaXN0aWMiLCJOZXN0ZWQiLCJldmVyeSIsIlNlcXVlbmNlIiwicmVzdWx0cyIsIm5leHQiLCJwdXNoIiwic2VxdWVuY2UiLCJhcmdzIiwiYXJnTmFtZSIsIl9hcmciLCJBcnJheSIsImlzQXJyYXkiLCJFeHByZXNzaW9uIiwiU3RhdGVtZW50IiwiYmVzdE1hdGNoIiwiY29udGV4dCIsInRvU291cmNlIiwiUmVwZWF0IiwiaW5jbHVkZXMiLCJyZXBlYXQiLCJMaXN0IiwiaXRlbSIsImRlbGltaXRlciIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJsYXN0IiwicG9wIiwic3ludGF4VG9rZW4iLCJwYXJzZVJ1bGVTeW50YXhfc3RyaW5nIiwicGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUiLCJwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMiLCJwYXJzZVJ1bGVTeW50YXhfbGlzdCIsInBhcnNlUnVsZVN5bnRheF9yZXBlYXQiLCJzdGFydHNXaXRoIiwic3Vic3RyIiwidG9TdHJpbmciLCJmaW5kTmVzdGVkVG9rZW5zIiwiYWx0ZXJuYXRpdmVzIiwiZ3JvdXBBbHRlcm5hdGl2ZXMiLCJjdXJyZW50IiwiaSIsImNvbmNhdCIsInN5bWJvbCIsImRlZmluZVByb3BlcnRpZXMiLCJhZGRTeW50YXgiLCJydWxlU3ludGF4IiwiZSIsImVycm9yIiwiYWRkU3RhdGVtZW50IiwiYWRkRXhwcmVzc2lvbiIsImFkZEluZml4T3BlcmF0b3IiLCJ0b0pTIiwiX19pbmZpeE9wZXJhdG9ycyIsImluZml4T3BlcmF0b3JzIiwiYWRkUG9zdGZpeE9wZXJhdG9yIiwiX19wb3N0Zml4T3BlcmF0b3JzIiwicG9zdGZpeE9wZXJhdG9ycyIsIldoaXRlc3BhY2UiLCJJZGVudGlmaWVyIiwiaWRlbnRpZmllciIsInJlcGxhY2UiLCJhZGRUb0JsYWNrbGlzdCIsIlR5cGUiLCJ0eXBlIiwiTnVtYmVyIiwibnVtYmVyIiwicGFyc2VGbG9hdCIsIkludGVnZXIiLCJwYXJzZUludCIsIlRleHQiLCJ0ZXh0IiwiQm9vbGVhbiIsImJvb2wiLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJhcmciLCJoZWFkIiwidGVzdCIsInN1YnN0cmluZyIsInJhbmdlIiwibWVtb2l6ZWQiLCJkZWZpbmVNZW1vaXplZCIsInByb3BlcnR5IiwiZ2V0dGVyIiwiYXBwbHkiLCJjb25maWd1cmFibGUiLCJnZXQiLCJleHByZXNzaW9uIiwicmV2ZXJzZSIsInRoaW5nIiwiYXNzaWdubWVudCIsInNjb3BlIiwicGx1cmFsIiwidG9VcHBlckNhc2UiLCJ2YWx1ZXMiLCJmaXJzdFZhbHVlIiwib3JkaW5hbCIsImEiLCJiIiwibGhzIiwicmhzIiwib3BlcmF0b3IiXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxtREFBMkMsY0FBYzs7QUFFekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7OztBQzdEQTs7OztBQUNBOzs7Ozs7QUFFQTtBQU5BO0FBQ0E7QUFDQTtBQUtBLElBQU1BLFNBQVMsc0JBQWY7a0JBQ2VBLE07O0FBRWY7O0FBQ0FDLE9BQU9ELE1BQVAsR0FBZ0JBLE1BQWhCLEM7Ozs7Ozs7Ozs7Ozs7cWpCQ1hBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUE7QUFDQSxJQUFJLENBQUNFLFFBQVFDLEtBQWIsRUFBb0JELFFBQVFDLEtBQVIsR0FBZ0JELFFBQVFFLEdBQXhCO0FBQ3BCLElBQUksQ0FBQ0YsUUFBUUcsUUFBYixFQUF1QkgsUUFBUUcsUUFBUixHQUFtQkgsUUFBUUUsR0FBM0I7O0lBRUZFLE07QUFJcEIsaUJBQVlDLFVBQVosRUFBd0I7QUFBQTs7QUFDdkJDLFNBQU9DLE1BQVAsQ0FBYyxJQUFkLEVBQW9CRixVQUFwQjs7QUFFQTtBQUNBLE9BQUtHLEtBQUwsR0FBYUYsT0FBT0csTUFBUCxDQUFjLEtB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REQsb0JBQ1VELE9BRFYsRUFDbUI7QUFDakIsTUFBSVIsT0FBTyxLQUFLOUIsZUFBTCxFQUFYO0FBQ0EsTUFBSWdJLE1BQU1sRyxLQUFLa0csR0FBTCxDQUFTekYsUUFBVCxDQUFrQkQsT0FBbEIsQ0FBVjtBQUNBLE1BQUkwQyxPQUFPbEQsS0FBS29HLFFBQUwsQ0FBY2xELElBQXpCO0FBQ0EsU0FBT0EsS0FBS2dELEdBQUwsQ0FBUDtBQUNBO0FBTkYsQ0FIRDs7QUFjQTtBQUNBLGlCQUFPdkQsU0FBUCxDQUFpQixxQkFBakIsRUFBd0Msd0VBQXhDLEU7Ozs7Ozs7Ozs7Ozs7QUN6RkE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7OztBQUVBO0FBQ0EsSUFBSSxPQUFPeEksTUFBUCxLQUFrQixXQUF0QixFQUFtQztBQUNsQ0EsUUFBT3FLLFVBQVA7QUFDQXJLLFFBQU9LLE1BQVA7QUFDQUwsUUFBT3NELElBQVA7QUFDQXRELFFBQU9ELE1BQVA7QUFDQTs7a0JBRWM7QUFDZHNLLGlDQURjLEVBQ0ZoSyx3QkFERSxFQUNNaUQsb0JBRE4sRUFDWXZEO0FBRFosQzs7Ozs7Ozs7Ozs7OztBQ1ZmOzs7O0FBQ0E7Ozs7QUFFQTtBQVBBO0FBQ0E7QUFDQTs7OztBQVFBOztBQUNBLGlCQUFPNkksWUFBUCxDQUFvQixJQUFwQixFQUEwQixnQ0FBMUIsRUFBNEQ7QUFFM0R0QyxTQUYyRCxvQkFFbERELE9BRmtELEVBRXpDLENBQ2pCO0FBSDBELENBQTVELEUiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBpZGVudGl0eSBmdW5jdGlvbiBmb3IgY2FsbGluZyBoYXJtb255IGltcG9ydHMgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAxMik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay9ib290c3RyYXAgNDE4NmVhYjA1NjY1YzRhNTdjN2MiLCIvL1xuLy9cdCMgQ3JlYXRlIGEgYHBhcnNlcmAgc2luZ2xldG9uIHRvIHVzZSB0byBzZXQgdXAgcnVsZXMgYW5kIGR1cmluZyB0ZXN0cy5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5cbi8vIENyZWF0ZSBwYXJzZXIgaW5zdGFuY2UuXG5jb25zdCBwYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG53aW5kb3cucGFyc2VyID0gcGFyc2VyO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvX3BhcnNlci5qcyIsIi8vIFNwZWxsIFwiRW5nbGlzaFwiIHBhcnNlciBzdHJhd21hblxuXG4vLyBUT0RPOlx0YHRlc3RgIGZ1bmN0aW9uIGZvciBxdWljayBuby1nb29kIGhpdCBvbiBge2F9IGJsYWggYmxhaCB7Yn1gP1xuLy8gVE9ETzpcdHRoaXMgZG9lc24ndCB3b3JrOiAgIGB7ZXhwcmVzc2lvbn0gaXMge2V4cHJlc3Npb259YFxuLy8gVE9ETzpcdGJyZWFrIGBmaWxlYCBpbnRvIGxpbmVzIGFuZCBwcm9jZXNzIGVhY2ggKGluY2wuIHN1YnN0ci9tYXRjaCBub3QgZ29pbmcgYmV5b25kIHRoZSBlbmQpXG4vLyBUT0RPOlx0bmVzdGluZyAtLSBpcyB0aGlzIGp1c3QgaW5kZW50ID0gXCJhZGQgYmxvY2sgc2NvcGVcIlxuLy8gVE9ETzpcdHByb21vdGlvbiBwYXR0ZXJuIGZvciBnYXRoZXIgYXJndW1lbnRzIChlZzogbGl0ZXJhbC1saXN0KSA/Pz9cbi8vIFRPRE86XHRXaGF0IGRvZXMgc3ludGF4IHRyZWUgbG9vayBsaWtlPyAgSG93IGRvIHdlIGV4dHJhY3QgbWVhbmluZyBvdXQgb2YgdGhlIG5lc3Q/XG4vLyBUT0RPOlx0UGFzcyBgY29udGV4dGAgdG8gdG9Tb3VyY2UoKSwgYWRkIHByb3BlcnR5IGRlc2NyaXB0b3JzIHRvIGBjbGFzc2AsIHZhcmlhYmxlcyBhbmQgY29kZSB0byBgbWV0aG9kYCwgYGdsb2JhbGAgc3R1ZmYgZXRjXG5cbmltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gR1JSUi4uLiB3aWxsIFNPTUVPTkUgb24gdGhlIG5vZGUgdGVhbSBwbGVhc2UgaW1wbGVtZW50IGNvbnNvbGUuZ3JvdXAgPz8/XG5pZiAoIWNvbnNvbGUuZ3JvdXApIGNvbnNvbGUuZ3JvdXAgPSBjb25zb2xlLmxvZztcbmlmICghY29uc29sZS5ncm91cEVuZCkgY29uc29sZS5ncm91cEVuZCA9IGNvbnNvbGUubG9nO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYXJzZXIge1xuXHQvLyBTZXQgdG8gYHRydWVgIHRvIG91dHB1dCBkZWJ1ZyBpbmZvIHdoaWxlIGFkZGluZyBydWxlc1xuXHRzdGF0aWMgREVCVUcgPSBmYWxzZTtcblxuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblxuXHRcdC8vIENsb25lIHJ1bGVzLCBzdGFydGluZyB3aXRoIGEgY29tcGxldGVseSBlbXB0eSBtYXAgaWYgbm90IGRlZmluZWQgKG5vIHN0YW5kYXJkIG9iamVjdCBrZXlzKVxuXHRcdHRoaXMucnVsZXMgPSBPYmplY3QuY3JlYXRlKHRoaXMucnVsZXMgfHwgbnVsbCk7XG5cdH1cblxuXHRnZXRSdWxlKG5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlc1tuYW1lXTtcblx0fVxuXG4vL1xuLy8jIyMgUGFyc2luZ1xuLy9cblx0Ly8gUGFyc2UgYG5hbWVgZCBydWxlIGF0IGhlYWQgb2YgYHN0cmVhbWAgKGBzdHJpbmdgIG9yIGBUZXh0U3RyZWFtYCkuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cblx0cGFyc2UobmFtZSwgc3RyZWFtLCBhdEhlYWQpIHtcblx0XHRpZiAodHlwZW9mIHN0cmVhbSA9PT0gXCJzdHJpbmdcIikgc3RyZWFtID0gbmV3IFRleHRTdHJlYW0oc3RyZWFtKTtcblx0XHRsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShuYW1lKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2VyLnBhcnNlKCR7bmFtZX0pOiBSdWxlIG5vdCBmb3VuZGApO1xuXHRcdHN0cmVhbSA9IHRoaXMuZWF0V2hpdGVzcGFjZShzdHJlYW0pO1xuXHRcdHJldHVybiBydWxlLnBhcnNlKHRoaXMsIHN0cmVhbSwgYXRIZWFkKTtcblx0fVxuXG5cdC8vIEVhdCB3aGl0ZXNwYWNlIChhY2NvcmRpbmcgdG8gYHJ1bGVzLndoaXRlc3BhY2VgKSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnMgbmV3IHN0cmVhbSBpZiB3ZSBtYXRjaGVkIHdoaXRlc3BhY2UsIG90aGVyd2lzZSB0aGUgc2FtZSBzdHJlYW0uXG5cdGVhdFdoaXRlc3BhY2Uoc3RyZWFtKSB7XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMucnVsZXMud2hpdGVzcGFjZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gc3RyZWFtO1xuXHRcdHJldHVybiBzdHJlYW0uYWR2YW5jZUJ5KHJlc3VsdC5tYXRjaGVkLmxlbmd0aCk7XG5cdH1cblxuXHQvLyBBZGQgYSBydWxlIHRvIG91ciBsaXN0IG9mIHJ1bGVzIVxuXHQvLyBDb252ZXJ0cyB0byBgYWx0ZXJuYXRpdmVzYCBvbiByZS1kZWZpbmluZyB0aGUgc2FtZSBydWxlLlxuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLnJ1bGVzW25hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtuYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZTogbmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdC8vIGNvcHkgYXJndW1lbnQgbmFtZSBvdmVyICg/Pz8pXG5cdFx0XHRcdGlmIChleGlzdGluZy5hcmd1bWVudCkgdGhpcy5ydWxlc1tuYW1lXS5hcmd1bWVudCA9IGV4aXN0aW5nLmFyZ3VtZW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JyB0byAnJHtuYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXS5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdC8vIGRvbid0IG92ZXJyaWRlIHJ1bGVOYW1lXG5cdFx0XHRpZiAoIXJ1bGUucnVsZU5hbWUpIHJ1bGUucnVsZU5hbWUgPSBuYW1lO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IHJ1bGU7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cblxuLy9cbi8vICMjIFV0aWxpdHkgbWV0aG9kc1xuLy9cblxuXHQvLyBGaW5kIHRoZSBtYXRjaGluZyBpbnN0YW5jZSBvZiBwb3NzaWJseSBuZXN0ZWQgYGVuZFRva2VuYCB0byBiYWxhbmNlIGBzdGFydFRva2VuYFxuXHQvL1x0aW4gYXJyYXkgb2YgYHRva2Vuc2AgKHN0cmluZ3MpLlxuXHQvLyBJZiBzdWNjZXNzZnVsLCByZXR1cm5zIGB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZSB9YFxuXHQvLyBUaHJvd3MgaWYgdW5zdWNlc3NmdWwuXG5cdHN0YXRpYyBmaW5kTmVzdGVkVG9rZW5zKHRva2Vucywgc3RhcnRUb2tlbiwgZW5kVG9rZW4sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0aWYgKHRva2Vuc1tzdGFydEluZGV4XSAhPT0gc3RhcnRUb2tlbikgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBFeHBlY3RlZCAnJHtzdGFydFRva2VufScgYXQgaW5kZXggJHtzdGFydEluZGV4fSBvZiB0b2tlbnNgKTtcblx0XHRsZXQgbmVzdGluZyA9IDA7XG5cdFx0bGV0IG5lc3RlZCA9IGZhbHNlO1xuXHRcdGZvciAobGV0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIDEsIGxhc3RJbmRleCA9IHRva2Vucy5sZW5ndGg7IGVuZEluZGV4IDwgbGFzdEluZGV4OyBlbmRJbmRleCsrKSB7XG5cdFx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbZW5kSW5kZXhdO1xuXHRcdFx0aWYgKHRva2VuID09PSBzdGFydFRva2VuKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdFx0bmVzdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b2tlbiA9PT0gZW5kVG9rZW4pIHtcblx0XHRcdFx0aWYgKG5lc3RpbmcgPT09IDApXG5cdFx0XHRcdFx0cmV0dXJuIHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlOiB0b2tlbnMuc2xpY2Uoc3RhcnRJbmRleCsxLCBlbmRJbmRleCksIG5lc3RlZCB9O1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgQ291bGRuJ3QgZmluZCBtYXRjaGluZyAnJHtlbmRUb2tlbn0ncyBzdGFydGluZyBhdCBpdGVtICR7c3RhcnRJbmRleH1gKTtcblx0fVxuXG5cblx0Ly8gTGlzdCBvZiBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gcmVndWxhciBleHByZXNzaW9ucy5cblx0Ly8gVXNlZCB0byBlc2NhcGUgdGhvc2UgY2hhcnMgd2hlbiBjcmVhdGluZyByZWd1bGFyIGV4cHJlc3Npb25zIGZyb20gc3RyaW5ncy5cblx0c3RhdGljIFJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlMgPSAoZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgY2hhcnMgPSB7fTtcblx0XHRcIlxcXFwvXiQqKz8uKCl8e30sW11cIi5zcGxpdChcIlwiKS5mb3JFYWNoKGNoYXIgPT4gY2hhcnNbY2hhcl0gPSB0cnVlKTtcblx0XHRyZXR1cm4gY2hhcnM7XG5cdH0pKClcblxuXHQvLyBHaXZlbiBhIFwibm9ybWFsXCIgYHN0cmluZ2AsIGVzY2FwZSBhbnkgcmVndWxhciBleHByZXNzaW9uIHNwZWNpYWwgY2hhcmFjdGVyc1xuXHQvL1x0c28gd2UgY2FuIGNyZWF0ZSBhIGBuZXcgUmVnRXhwKClgLlxuXHQvLyBBbHNvIGNvbnZlcnRzIGEgc2luZ2xlIHNwYWNlIHRvIGFyYml0cmFyeSBzZXQgb2Ygc3BhY2VzIHdpdGggXCJcXHMrXCJcblx0c3RhdGljIGVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSB7XG5cdFx0cmV0dXJuIHN0cmluZy5zcGxpdChcIlwiKS5tYXAoZnVuY3Rpb24gKGNoYXIsIGluZGV4LCBsaXN0KSB7XG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIGJhY2tzbGFzaFxuXHRcdFx0aWYgKGNoYXIgPT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCI7XG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIHNwYWNlXG5cdFx0XHRpZiAoY2hhciA9PT0gXCIgXCIpIHJldHVybiBcIlxcXFxzK1wiO1xuXHRcdFx0Ly8gSWYgYSBzcGVjaWFsIGNoYXIgYW5kIHByZXZpb3VzIGNoYXJhY3RlciB3YXMgbm90IGFuIGVzY2FwZSwgZXNjYXBlIHRoZSByZXN1bHQuXG5cdFx0XHRpZiAoUGFyc2VyLlJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlNbY2hhcl0gJiYgbGlzdFtpbmRleC0xXSAhPT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIitjaGFyO1xuXHRcdFx0Ly8gVGhpcyBjaGFyIHNob3VsZCBiZSBmaW5lIGJ5IGl0c2VsZi5cblx0XHRcdHJldHVybiBjaGFyO1xuXHRcdH0pLmpvaW4oXCJcIik7XG5cdH1cblxuXHQvLyBDcmVhdGUgYSBuZXcgcmVndWxhciBleHByZXNzaW9uIGZyb20gYSBcIm5vcm1hbFwiIHN0cmluZywgZXNjYXBpbmcgc3BlY2lhbCBjaGFyYWN0ZXJzIGFzIG5lY2Vzc2FyeS5cblx0c3RhdGljIFJlZ0V4cEZyb21TdHJpbmcoc3RyaW5nLCBmbGFncykge1xuXHRcdHJldHVybiBuZXcgUmVnRXhwKFBhcnNlci5lc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZyksIGZsYWdzKTtcblx0fVxuXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9QYXJzZXIuanMiLCIvL1x0IyBQYXJzZXIgUnVsZXNcbi8vXHRSdWxlcyBjYW4gYmUgYXMgc2ltcGxlIGFzIGEgc3RyaW5nIGBLZXl3b3JkYCBvciBhIGNvbXBsZXggc2VxdWVuY2Ugb2YgKG5lc3RlZCkgcnVsZXMuXG4vL1xuLy9cdFBhcnNlIGEgcnVsZSB3aXRoIGBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKWAsIHRoaXMgd2lsbCBlaXRoZXI6XG4vL1x0XHQtIHJldHVybiBgdW5kZWZpbmVkYCBpZiB0aGUgcnVsZSBkb2Vzbid0IG1hdGNoIHRoZSBoZWFkIG9mIHRoZSBzdHJlYW0sIG9yXG4vL1x0XHQtIHJldHVybiBhIENMT05FIG9mIHRoZSBydWxlIHdpdGggYXQgbGVhc3QgdGhlIGZvbGxvd2luZzpcbi8vXHRcdFx0LSBgc3RyZWFtYFx0XHRTdHJlYW0gd2hpY2ggd2FzIG1hdGNoZWQgd2l0aCBgc3RhcnRJbmRleGAgYXQgdGhlIHN0YXJ0IG9mIHRoZSBtYXRjaFxuLy9cdFx0XHQtIGBlbmRJbmRleGBcdE5vbi1pbmNsdXNpdmUgZW5kIGluZGV4IGluIHN0cmVhbSB3aGVyZSBtYXRjaCBlbmRzLlxuLy9cbi8vXHRUaGUgY2xvbmUgcmV0dXJuZWQgYWJvdmUgY2FuIGJlIG1hbmlwdWxhdGVkIHdpdGhcbi8vXHRcdC0gYHJ1bGUuZ2F0aGVyQXJndW1lbnRzKClgXHRcdFJldHVybiBtYXRjaGVkIGFyZ3VtZW50cyBpbiBhIGZvcm1hdCBzdWl0YWJsZSB0byBkbzpcbi8vXHRcdC0gYHJ1bGUudG9Tb3VyY2UoKWBcdFx0XHRcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcblxuXG4vL1RPRE86IG1ha2UgZ2F0aGVyQXJndW1lbnRzKCkgc3RhdGljIGFuZCBjYWxsIG9uIHRoaXNcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gUnVsZSB8fCAhdGhpcy5jb25zdHJ1Y3Rvci5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkoXCJjb25zdHJ1Y3RvclwiKSkge1xuLy9jb25zb2xlLndhcm4oXCJub3QgcnVsZVwiLCB0aGlzKTtcblx0XHR9XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdC8vIENsb25lIHRoaXMgcnVsZSBhbmQgYWRkIGFueSBgcHJvcHNgIHBhc3NlZCBpbi5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRsZXQgY2xvbmUgPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xuXHRcdE9iamVjdC5hc3NpZ24oY2xvbmUsIHByb3BzKTtcblx0XHRyZXR1cm4gY2xvbmU7XG5cdH1cblxuXHQvLyBGb3IgYSBydWxlIGluc3RhbmNlIGFzc29jaWF0ZWQgd2l0aCBhIHN0cmVhbSxcblx0Ly8gcmV0dXJuIGEgbmV3IHN0cmVhbSBBRlRFUiB0aGlzIHJ1bGUncyBlbmQuXG5cdG5leHQoKSB7XG5cdFx0aWYgKCF0aGlzLnN0cmVhbSB8fCB0aGlzLmVuZEluZGV4ID09PSB1bmRlZmluZWQpXG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBydWxlLm5leHQoKSBjYWxsZWQgb24gcnVsZSB3aXRob3V0IGEgc3RyZWFtYCwgdGhpcyk7XG5cdFx0cmV0dXJuIHRoaXMuc3RyZWFtLmFkdmFuY2VUbyh0aGlzLmVuZEluZGV4KTtcblx0fVxuXG4vL1xuLy9cdFBhcnNpbmcgcHJpbWl0aXZlcyAtLSB5b3UgTVVTVCBpbXBsZW1lbnQgdGhlc2UgaW4geW91ciBzdWJjbGFzc2VzIVxuLy9cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcnVsZSBpbiB0aGUgYHN0cmVhbWAuXG5cdC8vIElmIGBhdEhlYWRgIGlzIGB0cnVlYCwgd2UnbGwgb25seSBhY2NlcHQgYSBtYXRjaCBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnMgcmVzdWx0cyBvZiB0aGUgcGFyc2Ugb3IgYHVuZGVmaW5lZGAuXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBhdEhlYWQgPSB0cnVlKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIElzIHRoaXMgcnVsZSBkZXRlcm1pbmlzdGljLCBlZzogY2FuIGl0IGJlIHF1aWNrbHkgYW5kIHVuYW1iaWd1b3VzbHkgc2F0aXNmaWVkP1xuXHQvLyBSZXR1cm5pbmcgYHRydWVgIGNhbiBzcGVlZCB1cCBzZXF1ZW5jZSBwcm9jZXNzaW5nLFxuXHQvL1x0YnV0IGlmIHlvdSdyZSByZWFsbHkgbm90IHN1cmUsIHJldHVybiBgdW5kZWZpbmVkYC5cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG4vL1xuLy8gIyMgb3V0cHV0IGFzIHNvdXJjZVxuLy9cblx0Z2V0IF9hcmcoKSB7IHJldHVybiB0aGlzLmFyZ3VtZW50IHx8IHRoaXMucnVsZU5hbWUgfHwgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lIH1cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBOb3RlIHRoYXQgd2UgZGVmaW5lIGBnYXRoZXJBcmd1bWVudHMoKWAgc3RhdGljYWxseSBvbiBlYWNoIHN1YmNsYXNzXG5cdC8vXHRhbmQgdGhlbiBpbnN0YW5jZSBtZXRob2QgY2FsbHMgaXQgb24gaXRzZWxmLlxuXHRzdGF0aWMgZ2F0aGVyQXJndW1lbnRzKHJ1bGUpIHtcblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IuZ2F0aGVyQXJndW1lbnRzKHRoaXMpO1xuXHR9XG5cblx0Ly8gT3V0cHV0IHZhbHVlIGZvciB0aGlzIElOU1RBTlRJQVRFRCBydWxlIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG5cblxuXG5cbi8vIFJlZ2V4IHBhdHRlcm4uXG4vLyBgcnVsZS5wYXR0ZXJuYCBpcyB0aGUgcmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoLlxuLy9cbi8vIE5PVEVcdFRvIG1ha2UgdGhpcyBtb3JlIGdlbmVyYWxseSBhcHBsaWNhYmxlLCBkbyBOT1Qgc3RhcnQgdGhlIHBhdHRlcm4gd2l0aCBhIGBeYC5cbi8vXHRcdFdlJ2xsIGF1dG9tYXRpY2FsbHkgbWFrZSBhIGNvcHkgb2YgdGhlIFJlZ0V4cCB3aXRoIHRoZSBzdGFydCBwb2ludCBhdHRhY2hlZFxuLy9cdFx0YW5kIHVzZSB0aGF0IGFzIGFwcHJvcHJpYXRlLlxuLy9cbi8vXHRcdFRoaXMgd2F5IHdlIGNhbiByZS11c2UgdGhlIHJlZ2V4IHRvIGNoZWNrIGZvciBhIG1hdGNoIGluIHRoZSBtaWRkbGUgb2YgdGhlIHN0cmVhbS4uLlxuLy9cbi8vIFlvdSBjYW4gb3B0aW9uYWxseSBzcGVjaWZ5IGEgYHJ1bGUuYmxhY2tsaXN0YCwgYSBzZXQgb2YgbWF0Y2hlcyB3aGljaCB3aWxsIHNwZWNpZmljYWxseSBOT1Qgd29yayxcbi8vXHRlZyBmb3IgYGlkZW50aWZpZXIuXG5SdWxlLlBhdHRlcm4gPSBjbGFzcyBQYXR0ZXJuIGV4dGVuZHMgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgcGF0dGVybmAgaXMgcmVxdWlyZWRcblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLlBhdHRlcm4oKTogWW91IG11c3QgcGFzcyBhIGBwYXR0ZXJuYCBwYXJhbWV0ZXJcIik7XG5cblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblxuXHRcdC8vIENyZWF0ZSBhIGBzdGFydFBhdHRlcm5gIHRvIG1hdGNoIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cm9uZ1xuXHRcdC8vIENyZWF0ZSBub24tZW51bWVyYWJseS5cblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJzdGFydFBhdHRlcm5cIiwgeyB2YWx1ZTogbmV3IFJlZ0V4cChcIl5cIiArIHRoaXMucGF0dGVybi5zb3VyY2UpIH0pO1xuXHR9XG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHBhdHRlcm4gYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgYXRIZWFkID0gdHJ1ZSkge1xuXHRcdC8vIElmIGBhdEhlYWRgIGlzIHRydWUsIHVzZSBgc3RhcnRQYXR0ZXJuYCBkZWZpbmVkIGluIGNvbnN0cnVjdG9yIGFib3ZlLCBtdWNoIG1vcmUgZWZmaWNpZW50IVxuXHRcdGxldCBtYXRjaCA9IHN0cmVhbS5tYXRjaChhdEhlYWQgPyB0aGlzLnN0YXJ0UGF0dGVybiA6IHRoaXMucGF0dGVybik7XG5cdFx0aWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGJhaWwgaWYgcHJlc2VudCBpbiBibGFja2xpc3Rcblx0XHRsZXQgbWF0Y2hlZCA9IG1hdGNoWzBdO1xuXHRcdGlmICh0aGlzLmJsYWNrbGlzdCAmJiB0aGlzLmJsYWNrbGlzdFttYXRjaGVkXSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBtYXRjaFN0cmVhbSA9IHN0cmVhbS5hZHZhbmNlQnkobWF0Y2guaW5kZXgpO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IG1hdGNoZWQsXG5cdFx0XHRzdGFydEluZGV4OiBtYXRjaFN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG1hdGNoU3RyZWFtLnN0YXJ0SW5kZXggKyBtYXRjaGVkLmxlbmd0aCxcblx0XHRcdHN0cmVhbTogbWF0Y2hTdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFBhdHRlcm5zIGFyZSBBTFdBWVMgZGV0ZXJtaW5pc3RpYy5cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRhZGRUb0JsYWNrbGlzdCguLi53b3Jkcykge1xuXHRcdGlmICghdGhpcy5ibGFja2xpc3QpIHRoaXMuYmxhY2tsaXN0ID0ge307XG5cdFx0d29yZHMuZm9yRWFjaCh3b3JkID0+IHRoaXMuYmxhY2tsaXN0W3dvcmRdID0gdHJ1ZSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5wYXR0ZXJuLnNvdXJjZTtcblx0fVxufVxuXG4vLyBSdWxlIGZvciBsaXRlcmFsIHN0cmluZyB2YWx1ZSwgd2hpY2ggaW5jbHVkZSBwdW5jdHVhdGlvbiBzdWNoIGFzIGAoYCBldGMuXG4vLyBgU3ltYm9sYHMgYXJlIGRpZmZlcmVudCBmcm9tIGBLZXl3b3Jkc2AgaW4gdGhhdCB0aGV5IGRvIG5vdCByZXF1aXJlIGEgd29yZCBib3VuZGFyeS5cbi8vVE9ETzogcmVuYW1lIGBTeW1ib2xgPz8/XG5SdWxlLlN5bWJvbCA9IGNsYXNzIFN5bWJvbCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgc3RyaW5nYCBpcyByZXF1aWVkLlxuXHRcdGlmICghcHJvcGVydGllcy5zdHJpbmcpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5TeW1ib2woKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gY29udmVydCBzdHJpbmcgdG8gcGF0dGVyblxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBQYXJzZXIuUmVnRXhwRnJvbVN0cmluZyhwcm9wZXJ0aWVzLnN0cmluZyk7XG4vL2NvbnNvbGUuaW5mbyhwcm9wZXJ0aWVzLnN0cmluZywgcHJvcGVydGllcy5wYXR0ZXJuKTtcblx0XHR9XG5cbi8vXHRcdGNvbnNvbGUuaW5mbyhcImNyZWF0aW5nIHN0cmluZ1wiLCBwcm9wZXJ0aWVzKTtcblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMuc3RyaW5nfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuLy8gTWVyZ2UgdHdvIFN5bWJvbCBydWxlcyB0b2dldGhlciwgcmV0dXJuaW5nIGEgbmV3IHJ1bGUgdGhhdCBtYXRjaGVzIGJvdGguXG5SdWxlLm1lcmdlU3ltYm9scyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0cmV0dXJuIG5ldyBSdWxlLlN5bWJvbCh7IHN0cmluZzogZmlyc3Quc3RyaW5nICsgc2Vjb25kLnN0cmluZyB9KTtcbn1cblxuLy8gS2V5d29yZCBwYXR0ZXJuLlxuLy8gUHJvcGVydGllczpcbi8vXHQtIGBydWxlLnN0cmluZ2AgXHQocmVxdWlyZWQpIFx0S2V5d29yZCBzdHJpbmcgdG8gbWF0Y2guXG4vL1x0LSBgcnVsZS5wYXR0ZXJuYFx0KG9wdGlvbmFsKSBcdFJlZ0V4cCBmb3IgdGhlIG1hdGNoLlxuLy9cdFx0XHRcdFx0XHRcdFx0XHRXZSdsbCBjcmVhdGUgb25lIGZyb20gYHN0cmluZ2AgaWYgbmVjZXNzYXJ5LlxuLy9cdFx0XHRcdFx0XHRcdFx0XHROT1RFOiBkbyBOT1Qgc3RhcnQgdGhlIGBwYXR0ZXJuYCB3aXRoIGBeYC5cblJ1bGUuS2V5d29yZCA9IGNsYXNzIEtleXdvcmQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHN0cmluZ2AgaXMgcmVxdWllZC5cblx0XHRpZiAoIXByb3BlcnRpZXMuc3RyaW5nKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuS2V5d29yZCgpOiBFeHBlY3RlZCBzdHJpbmcgcHJvcGVydHlcIik7XG5cblx0XHQvLyBkZXJpdmUgYHBhdHRlcm5gIGlmIG5lY2Vzc2FyeS5cblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikge1xuXHRcdFx0Ly8gZW5mb3JjZSB3b3JkIGJvdW5kYXJpZXMgYW5kIGFsbG93IGFyYml0cmFyeSBzcGFjZSBiZXR3ZWVuIHdvcmRzXG5cdFx0XHRsZXQgcGF0dGVyblN0cmluZyA9IFBhcnNlci5lc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHByb3BlcnRpZXMuc3RyaW5nKTtcblx0XHRcdHByb3BlcnRpZXMucGF0dGVybiA9IG5ldyBSZWdFeHAoXCJcXFxcYlwiICsgcGF0dGVyblN0cmluZyArIFwiXFxcXGJcIik7XG5cdFx0fVxuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMuc3RyaW5nfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG4vLyBNZXJnZSB0d28gS2V5d29yZCBydWxlcyB0b2dldGhlciwgYWRkaW5nIHRoZSBzZWNvbmQgdG8gdGhlIGZpcnN0LlxuUnVsZS5tZXJnZUtleXdvcmRzID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuXHRyZXR1cm4gbmV3IFJ1bGUuS2V5d29yZCh7IHN0cmluZzogZmlyc3Quc3RyaW5nICsgXCIgXCIgKyBzZWNvbmQuc3RyaW5nIH0pO1xufVxuXG5cbi8vIFN1YnJ1bGUgLS0gbmFtZSBvZiBhbm90aGVyIHJ1bGUgdG8gYmUgY2FsbGVkLlxuLy8gYHJ1bGUucnVsZWAgaXMgdGhlIG5hbWUgb2YgdGhlIHJ1bGUgaW4gYHBhcnNlci5ydWxlc2AuXG5SdWxlLlN1YnJ1bGUgPSBjbGFzcyBTdWJydWxlIGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBhdEhlYWQpIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlKHRoaXMucnVsZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEF0dGVtcHRpbmcgdG8gcGFyc2UgdW5rbm93biBydWxlICcke3RoaXMubmFtZX0nYCwgdGhpcyk7XG5cdFx0bGV0IHJlc3VsdCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0sIGF0SGVhZCk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgcmVzdWx0LmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZSh0aGlzLnJ1bGUpO1xuXHRcdGlmICghcnVsZSkgcmV0dXJuIGZhbHNlO1xuXHRcdHJldHVybiBydWxlLmlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYHske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZX19JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cblxuLy8gQWJzdHJhY3Q6ICBgTmVzdGVkYCBydWxlIC0tIGNvbXBvc2VkIG9mIGEgc2VyaWVzIG9mIG90aGVyIGBydWxlc2AuXG5SdWxlLk5lc3RlZCA9IGNsYXNzIE5lc3RlZCBleHRlbmRzIFJ1bGUge1xuXG5cdC8vIElzIHRoaXMgZGV0ZXJtaW5pc3RpYywgZWc6IGFyZSBvdXIgc3VicnVsZXMgdW5hbWJpZ291c2x5IGRldGVybWluYWJsZT9cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXMuZXZlcnkocnVsZSA9PiBydWxlLmlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkpO1xuXHR9XG59XG5cblxuLy8gU2VxdWVuY2Ugb2YgcnVsZXMgdG8gbWF0Y2ggKGF1dG8tZXhjbHVkaW5nIHdoaXRlc3BhY2UpLlxuUnVsZS5TZXF1ZW5jZSA9IGNsYXNzIFNlcXVlbmNlIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgYXRIZWFkKSB7XG5cdFx0bGV0IHJlc3VsdHMgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCByZXN1bHQgPSBydWxlLnBhcnNlKHBhcnNlciwgbmV4dCwgYXRIZWFkKTtcblx0XHRcdGlmICghcmVzdWx0ICYmICFydWxlLm9wdGlvbmFsKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKHJlc3VsdCkge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2gocmVzdWx0KTtcblx0XHRcdFx0bmV4dCA9IHJlc3VsdC5uZXh0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGlmIHdlIGdldCBoZXJlLCB3ZSBtYXRjaGVkIGFsbCB0aGUgcnVsZXMhXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG4vL1RPRE9DXG5cdC8vIEdhdGhlciBhcmd1bWVudHMgZnJvbSBvdXIgcGFyc2VkIGByZXN1bHRzYCBhcnJheS5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGB2YWx1ZXNgIGFycmF5IGluZGV4ZWQgYnlcblx0Ly9cdFx0LSBgcmVzdWx0cy5hcmd1bWVudGA6XHRcdGFyZ3VtZW50IHNldCB3aGVuIHJ1bGUgd2FzIGRlY2xhcmVkLCBlZzogYHt2YWx1ZTpsaXRlcmFsfWAgPT4gYHZhbHVlYFxuXHQvL1x0XHQtIGByZXN1bHRzLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIHJ1bGUgdHlwZTpcdFx0XHRcdG5hbWUgb2YgdGhlIHJ1bGUgdHlwZVxuXHRzdGF0aWMgZ2F0aGVyQXJndW1lbnRzKHNlcXVlbmNlKSB7XG5cdFx0aWYgKCFzZXF1ZW5jZS5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCBhcmdzID0ge307XG5cdFx0Zm9yIChsZXQgbmV4dCBvZiBzZXF1ZW5jZS5yZXN1bHRzKSB7XG5cdFx0XHRsZXQgYXJnTmFtZSA9IG5leHQuX2FyZztcblx0XHRcdC8vIEZvciBuZXN0ZWQgcnVsZXMsIHJlY3Vyc2UgdG8gZ2V0IHRoZWlyIGFyZ3VtZW50c1xuXHRcdFx0bGV0IHJlc3VsdCA9IG5leHQuZ2F0aGVyQXJndW1lbnRzKCk7XG5cblx0XHRcdC8vIElmIGFyZyBhbHJlYWR5IGV4aXN0cywgY29udmVydCB0byBhbiBhcnJheVxuXHRcdFx0aWYgKGFyZ05hbWUgaW4gYXJncykge1xuXHRcdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkoYXJnc1thcmdOYW1lXSkpIGFyZ3NbYXJnTmFtZV0gPSBbYXJnc1thcmdOYW1lXV07XG5cdFx0XHRcdGFyZ3NbYXJnTmFtZV0ucHVzaChyZXN1bHQpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGFyZ3NbYXJnTmFtZV0gPSByZXN1bHQ7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBhcmdzO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBleHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIFN0YXRlbWVudHMgdGFrZSB1cCB0aGUgZW50aXJlIGxpbmUuXG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXguXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBGaW5kIHRoZSBMT05HRVNUIG1hdGNoXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBhdEhlYWQpIHtcblx0XHRsZXQgYmVzdE1hdGNoO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSwgYXRIZWFkKTtcblx0XHRcdGlmICghbWF0Y2gpIGNvbnRpbnVlO1xuXG5cdFx0XHQvLyB0YWtlIHRoZSBsb25nZXN0IG1hdGNoXG5cdFx0XHRpZiAoIWJlc3RNYXRjaCB8fCBtYXRjaC5lbmRJbmRleCA+IGJlc3RNYXRjaC5lbmRJbmRleClcblx0XHRcdFx0YmVzdE1hdGNoID0gbWF0Y2g7XG5cdFx0fVxuXHRcdGlmICghYmVzdE1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYXNzaWduIGFyZ05hbWVcbi8vIGNvbnNvbGUuaW5mbyh0aGlzKTtcbi8vIGNvbnNvbGUuaW5mbyhiZXN0TWF0Y2gpO1xuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSBiZXN0TWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdGVsc2UgaWYgKHRoaXMucnVsZU5hbWUpIGJlc3RNYXRjaC5ydWxlTmFtZSA9IHRoaXMucnVsZU5hbWU7XG5cdFx0cmV0dXJuIGJlc3RNYXRjaDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IGJlc3RNYXRjaCxcblx0XHRcdHN0YXJ0SW5kZXg6IGJlc3RNYXRjaC5zdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBiZXN0TWF0Y2guZW5kSW5kZXgsXG5cdFx0XHRzdHJlYW06IGJlc3RNYXRjaC5zdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdGFkZFJ1bGUocnVsZSkge1xuXHRcdHRoaXMucnVsZXMucHVzaChydWxlKTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnRvU291cmNlKCk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCgke3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZXMuam9pbihcInxcIil9KSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBSZXBlYXRpbmcgcnVsZS5cbi8vXHRgdGhpcy5ydWxlYCBpcyB0aGUgcnVsZSB0aGF0IHJlcGVhdHMuXG4vL1xuLy8gQWZ0ZXIgbWF0Y2hpbmc6XG4vL1x0YHRoaXMucmVzdWx0c2AgaXMgYXJyYXkgb2YgcmVzdWx0cyBvZiBtYXRjaGVzLlxuLy9cbi8vXHRBdXRvbWF0aWNhbGx5IGNvbnN1bWVzIHdoaXRlc3BhY2UgYmVmb3JlIHJ1bGVzLlxuLy9cdElmIGRvZXNuJ3QgbWF0Y2ggYXQgbGVhc3Qgb25lLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuUnVsZS5SZXBlYXQgPSBjbGFzcyBSZXBlYXQgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBhdEhlYWQpIHtcblx0XHRsZXQgbmV4dCA9IHN0cmVhbTtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5ydWxlLnBhcnNlKHBhcnNlciwgbmV4dCwgYXRIZWFkKTtcblx0XHRcdGlmICghcmVzdWx0KSBicmVhaztcblxuXHRcdFx0cmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0c3RhdGljIGdhdGhlckFyZ3VtZW50cyhyZXBlYXQpIHtcblx0XHRpZiAoIXJlcGVhdC5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiByZXBlYXQucmVzdWx0cy5tYXAoIHJlc3VsdCA9PiByZXN1bHQuZ2F0aGVyQXJndW1lbnRzKCkgKTtcblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdHRocm93IFwiRG9uJ3QgdW5kZXJzdGFuZCBob3cgdG8gc291cmNlIFJ1bGUuUmVwZWF0IVwiO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0Y29uc3QgcnVsZSA9ICh0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlIHx8IHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiB0aGlzLnJ1bGUuc3RyaW5nLmluY2x1ZGVzKFwiIFwiKVxuXHRcdFx0XHQgICA/IGAoJHt0aGlzLnJ1bGV9KWBcblx0XHRcdFx0ICAgOiBgJHt0aGlzLnJ1bGV9YFxuXHRcdFx0XHQpO1xuXHRcdHJldHVybiBgJHtydWxlfSR7dGhpcy5vcHRpb25hbCA/ICcqJyA6ICcrJ31gO1xuXHR9XG59XG5cblxuLy8gTGlzdCBtYXRjaCBydWxlOiAgIGBbPGl0ZW0+PGRlbGltaXRlcj5dYC4gZWdcIiBgW3tudW1iZXJ9LF1gIHRvIG1hdGNoIGAxLDIsM2Bcbi8vXHRgcnVsZS5pdGVtYCBpcyB0aGUgcnVsZSBmb3IgZWFjaCBpdGVtLFxuLy9cdGBydWxlLmRlbGltaXRlcmAgaXMgdGhlIGRlbGltaXRlciBiZXR3ZWVuIGVhY2ggaXRlbS5cbi8vIFx0YHJ1bGUucmVzdWx0c2AgaW4gdGhlIG91dHB1dCBpcyB0aGUgbGlzdCBvZiB2YWx1ZXMuXG4vL1xuLy9cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGEgTGlzdCBydWxlIHdpbGwgTk9UIHJlcGVhdCAoPz8/PylcblJ1bGUuTGlzdCA9IGNsYXNzIExpc3QgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIGF0SGVhZCkge1xuXHRcdC8vIGVuc3VyZSBpdGVtIGFuZCBkZWxpbWl0ZXIgYXJlIG9wdGlvbmFsIHNvIHdlIGRvbid0IGJhcmYgaW4gYHBhcnNlUnVsZWBcblx0XHR0aGlzLml0ZW0ub3B0aW9uYWwgPSB0cnVlO1xuXHRcdHRoaXMuZGVsaW1pdGVyLm9wdGlvbmFsID0gdHJ1ZTtcblxuXHRcdGxldCByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBuZXh0IGl0ZW0sIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgaXRlbSA9IHRoaXMuaXRlbS5wYXJzZShwYXJzZXIsIG5leHQsIGF0SGVhZCk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdHJlc3VsdHMucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQsIGF0SGVhZCk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0ID0gZGVsaW1pdGVyLm5leHQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0c3RhcnRJbmRleDogcmVzdWx0c1swXSA/IHJlc3VsdHNbMF0uc3RhcnRJbmRleCA6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIG1hdGNoZWQgaXRlbSBieSBpbmRleFxuXHRnZXRJdGVtKGluZGV4KSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMucmVzdWx0c1tpbmRleF07XG5cdH1cblxuXHR0b1NvdXJjZSgpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcdFx0Ly8gVE9ETzogdGhyb3c/Pz9cblx0XHRsZXQgcmVzdWx0cyA9IHRoaXMucmVzdWx0cy5tYXAoIHJlc3VsdCA9PiByZXN1bHQudG9Tb3VyY2UoKSApLmpvaW4oXCIsIFwiKTtcblx0XHRyZXR1cm4gYFske3Jlc3VsdHN9XWA7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYFske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMuaXRlbX0gJHt0aGlzLmRlbGltaXRlcn1dJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGUuanMiLCJpbXBvcnQgeyBkZWZpbmVNZW1vaXplZCB9IGZyb20gXCIuL21lbW9pemUuanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIHJlLWV4cG9ydCBSdWxlIGZvciB0ZXN0aW5nXG5leHBvcnQgZGVmYXVsdCBSdWxlO1xuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbi8vIFRPRE86XHRVc2Uga2V5d29yZHMgaW4gc3ludGF4IHRvIG1ha2UgYSBxdWljayByZWdleC1iYXNlZCBgdGVzdGAgZnVuY3Rpb24gZm9yIHRoZSBlbnRpcmUgcnVsZVxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cbi8vIFRPRE86IGNvbnZlcnQgdG8gVGV4dFN0cmVhbSBwYXR0ZXJuIGFsYSBub3JtYWwgcGFyc2VyIG9uY2UgdGhhdCBzZXR0bGVzIGRvd24/Pz9cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHR2YXIgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IGxhc3RJbmRleCA9IHN5bnRheFN0cmVhbS5sZW5ndGg7XG5cdFx0d2hpbGUgKHN0YXJ0SW5kZXggPCBsYXN0SW5kZXgpIHtcblx0XHRcdGxldCBbIHJ1bGUsIGVuZEluZGV4IF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGlmIChydWxlKSB7XG5cdFx0XHRcdHZhciBsYXN0ID0gcnVsZXNbcnVsZXMubGVuZ3RoLTFdO1xuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYFN0cmluZ2AgYW5kIGxhc3Qgd2FzIGEgYFN0cmluZ2AsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5TeW1ib2wpIHtcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuXHRcdFx0XHRcdC8vIGFuZCByZXBsYWNlIHdpdGggYSBydWxlIHRoYXQgbWVyZ2VzIHRoZSBrZXl3b3Jkc1xuXHRcdFx0XHRcdHJ1bGUgPSBSdWxlLm1lcmdlU3ltYm9scyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYEtleXdvcmRgIGFuZCBsYXN0IHdhcyBhbHNvIGEgYEtleXdvcmRgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRlbHNlIGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG5cdFx0XHRcdFx0cnVsZXMucG9wKCk7XG5cdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG5cdFx0XHRcdFx0cnVsZSA9IFJ1bGUubWVyZ2VLZXl3b3JkcyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRydWxlcy5wdXNoKHJ1bGUpO1xuXHRcdFx0fVxuXHRcdFx0c3RhcnRJbmRleCA9IGVuZEluZGV4ICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHZhciBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdC8vIGlmIHdlIGdvdCBhIFwiXFxcXFwiICh3aGljaCBhbHNvIGhhcyB0byBnbyBpbnRvIHRoZSBzb3VyY2Ugc3RyaW5nIGFzIFwiXFxcXFwiKVxuXHRcdC8vIHRyZWF0IHRoZSBuZXh0IHRva2VuIGFzIGEgbGl0ZXJhbCBzdHJpbmcgcmF0aGVyIHRoYW4gYXMgYSBzcGVjaWFsIGNoYXJhY3Rlci5cblx0XHRpZiAoc3ludGF4VG9rZW4gPT09IFwiXFxcXFwiKSB7XG5cdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggKyAxKTtcblx0XHR9XG5cblx0XHRzd2l0Y2ggKHN5bnRheFRva2VuKSB7XG5cdFx0XHRjYXNlIFwie1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIipcIjpcblx0XHRcdGNhc2UgXCIrXCI6XG5cdFx0XHRjYXNlIFwiP1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblxuXHRcdFx0Ly8gdGhlIGZvbGxvd2luZyBzaG91bGQgQUxXQVlTIGJlIGNvbnN1bWVkIGJ5IHRoZSBhYm92ZVxuXHRcdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGNhc2UgXCIpXCI6XG5cdFx0XHRjYXNlIFwiXVwiOlxuXHRcdFx0Y2FzZSBcInxcIjpcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7c3ludGF4VG9rZW59IGZvdW5kIGFzIGl0ZW0gJHtzdGFydEluZGV4fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdLCBydWxlO1xuXHRcdC8vIElmIGxldHRlcnMgb25seSwgbWF0Y2ggYXMgYSBLZXl3b3JkIChzbyB3ZSByZXF1aXJlIGEgd29yZCBib3VuZGFyeSBhZnRlciB0aGUgc3RyaW5nKS5cblx0XHRpZiAoc3RyaW5nLm1hdGNoKC9bQS1aYS16XSsvKSkge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLktleXdvcmQoeyBzdHJpbmcgfSk7XG5cdFx0fVxuXHRcdC8vIE90aGVyd2lzZSBtYXRjaCBhcyBhIFN0cmluZywgd2hpY2ggZG9lc24ndCByZXF1aXJlIG5vbi13b3JkIGNoYXJzIGFmdGVyIHRoZSB0ZXh0LlxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlN5bWJvbCh7IHN0cmluZzogc3RyaW5nIH0pO1xuXHRcdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRcdGlmIChzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIikpIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIGxlYWRpbmcgc2xhc2ggaW4gbWF0Y2ggc3RyaW5nLi4uXG5cdFx0XHRcdHJ1bGUuc3RyaW5nID0gcnVsZS5zdHJpbmcuc3Vic3RyKDEpO1xuXHRcdFx0XHQvLyBidXQgbGVhdmUgaXQgaW4gdG9TdHJpbmdcblx0XHRcdFx0cnVsZS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnRJbmRleCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdC8vIE5PVEU6IG5lc3RlZCBwYXJlbnMgbWF5IG5vdCBoYXZlIGFsdGVybmF0aXZlcy4uLiA6LSggICBgKGF8KGJ8YykpYCB3b24ndCB3b3JrPz8/XG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiKFwiLCBcIilcIiwgc3RhcnRJbmRleCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0Ly8gc3BsaXQgaW50byBncm91cHMsIGluY2x1ZGluZyBuZXN0ZWQgcGFyZW5zXG5cdFx0bGV0IGFsdGVybmF0aXZlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0aXZlcyhzbGljZSlcblx0XHRcdC5tYXAoZnVuY3Rpb24oZ3JvdXApIHtcblx0XHRcdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoZ3JvdXAsIFtdKTtcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHNbMF07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSdWxlLlNlcXVlbmNlKHsgcnVsZXM6IHJlc3VsdHMgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0bGV0IHJ1bGUgPSBhbHRlcm5hdGl2ZXMubGVuZ3RoID09PSAxID8gYWx0ZXJuYXRpdmVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0aXZlcyB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXG5cdFx0ZnVuY3Rpb24gZ3JvdXBBbHRlcm5hdGl2ZXModG9rZW5zKSB7XG5cdFx0XHR2YXIgYWx0ZXJuYXRpdmVzID0gW107XG5cdFx0XHR2YXIgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XHRjdXJyZW50ID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaGFuZGxlIG5lc3RlZCBwYXJlbnNcblx0XHRcdFx0ZWxzZSBpZiAodG9rZW4gPT09IFwiKFwiKSB7XG5cdFx0XHRcdFx0bGV0IHsgZW5kSW5kZXggfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHRva2VucywgXCIoXCIsIFwiKVwiLCBpKTtcblx0XHRcdFx0XHRjdXJyZW50ID0gY3VycmVudC5jb25jYXQodG9rZW5zLnNsaWNlKGksIGVuZEluZGV4ICsgMSkpO1xuXHRcdFx0XHRcdGkgPSBlbmRJbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdXJyZW50LnB1c2godG9rZW4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoY3VycmVudC5sZW5ndGgpIGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0cmV0dXJuIGFsdGVybmF0aXZlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdHZhciBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlN1YnJ1bGUoeyBydWxlOiBtYXRjaC5zbGljZVswXSB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBtYXRjaC5lbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuTGlzdCgpO1xuXHRcdHJ1bGUuaXRlbSA9IHJlc3VsdHNbMF1cblx0XHRydWxlLmRlbGltaXRlciA9IHJlc3VsdHNbMV1cblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG59KTtcblxuXG5cbi8vICMjICBBZGQgbWV0aG9kcyB0byBQYXJzZXIgdG8gZGVmaW5lIHJ1bGVzIHVzaW5nIHRoZSBhYm92ZSBzeW50YXguXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhQYXJzZXIucHJvdG90eXBlLCB7XG5cblx0Ly8gUGFyc2UgYSBgcnVsZVN5bnRheGAgcnVsZSBhbmQgYWRkIGl0IHRvIG91ciBsaXN0IG9mIHJ1bGVzLlxuXHQvLyBSZXR1cm5zIHRoZSBuZXcgcnVsZS5cblx0Ly8gTG9ncyBwYXJzaW5nIGVycm9ycyBidXQgYWxsb3dzIHRoaW5ncyB0byBjb250aW51ZS5cblx0YWRkU3ludGF4OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdHRyeSB7XG5cdFx0XHRsZXQgcnVsZSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IpO1xuXG5cdFx0XHQvLyBSZWZsZWN0IHRoZSBydWxlIGJhY2sgb3V0IHRvIG1ha2Ugc3VyZSBpdCBsb29rcyAobW9yZSBvciBsZXNzKSB0aGUgc2FtZVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGVkIHJ1bGUgJyR7bmFtZX0nOlxcbiAgSU5QVVQ6ICR7cnVsZVN5bnRheH0gXFxuIE9VVFBVVDogJHtydWxlfWApO1xuXG5cdFx0XHRPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmdyb3VwKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgc3ludGF4OiAke3J1bGVTeW50YXh9YCk7XG5cdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdH1cblx0fX0sXG5cblx0YWRkU3RhdGVtZW50OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBSdWxlLlN0YXRlbWVudCk7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJzdGF0ZW1lbnRcIiwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZEV4cHJlc3Npb246IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFJ1bGUuRXhwcmVzc2lvbik7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHJ1bGUpO1xuXHR9fSxcblxuXHQvLyBBZGQgaW5maXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIG9yIGJcIi5cblx0Ly8gTk9URTogaWYgeW91IGhhdmUgbW9yZSB0aGFuIG9uZSBtYXRjaGluZyBvcGVyYXRvcixcblx0Ly9cdFx0IHBhc3MgaW4gYW4gYXJyYXkgb2Ygc2ltcGxlIHN0cmluZ3Mgc28gYWxsIG9mIG91ciBvcGVyYXRvcnMgYXJlIHNpbXBsZSBzdHJpbmdzLlxuXHRhZGRJbmZpeE9wZXJhdG9yOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpIHtcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkSW5maXhPcGVyYXRvcihuYW1lLCBzeW50YXgsIHByb3BlcnRpZXMpKTtcblx0XHR9XG5cblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudG9KUykge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBpbmZpeCBvcGVyYXRvciBydWxlICcke25hbWV9JyB0byBzcGVjaWZ5ICd0b0pTJyBmdW5jdGlvbmApXG5cdFx0XHR9XG5cdFx0XHQvLyBjbGVhciBsaXN0IG9mIGluZml4IG9wZXJhdG9ycyBmb3IgZ2V0dGVyIGJlbG93XG5cdFx0XHRkZWxldGUgdGhpcy5fX2luZml4T3BlcmF0b3JzO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcImluZml4X29wZXJhdG9yXCIsIHJ1bGUpO1xuXHRcdH1cblx0fX0sXG5cblx0Ly8gTGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgYXMgc3RyaW5ncy5cblx0Ly8gUmUtbWVtb2l6ZWQgYWZ0ZXIgYGFkZEluZml4T3BlcmF0b3JgIGFib3ZlLlxuXHRpbmZpeE9wZXJhdG9yczogZGVmaW5lTWVtb2l6ZWQoXCJfX2luZml4T3BlcmF0b3JzXCIsXG5cdFx0ZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnJ1bGVzW1wiaW5maXhfb3BlcmF0b3JcIl1cblx0XHRcdFx0XHRcdCAmJiB0aGlzLnJ1bGVzW1wiaW5maXhfb3BlcmF0b3JcIl0ucnVsZXMubWFwKHJ1bGUgPT4gcnVsZS5zdHJpbmcpXG5cdH0pLFxuXG5cdC8vIEFkZCBwb3N0Zml4IG9wZXJhdG9yLCBzdWNoIGFzIFwiYSBpcyBkZWZpbmVkXCJcblx0Ly8gTk9URTogaWYgeW91IGhhdmUgbW9yZSB0aGFuIG9uZSBtYXRjaGluZyBvcGVyYXRvcixcblx0Ly9cdFx0IHBhc3MgaW4gYW4gYXJyYXkgb2Ygc2ltcGxlIHN0cmluZ3Mgc28gYWxsIG9mIG91ciBvcGVyYXRvcnMgYXJlIHNpbXBsZSBzdHJpbmdzLlxuXHRhZGRQb3N0Zml4T3BlcmF0b3I6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSkge1xuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRQb3N0Zml4T3BlcmF0b3IobmFtZSwgc3ludGF4LCBwcm9wZXJ0aWVzKSk7XG5cdFx0fVxuXG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkge1xuXHRcdFx0aWYgKCFydWxlLnRvSlMpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgcG9zdGZpeCBvcGVyYXRvciBydWxlICcke25hbWV9JyB0byBzcGVjaWZ5ICd0b0pTJyBmdW5jdGlvbmApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gY2xlYXIgbGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgZm9yIGdldHRlciBiZWxvd1xuXHRcdFx0ZGVsZXRlIHRoaXMuX19wb3N0Zml4T3BlcmF0b3JzO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcInBvc3RmaXhfb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIHBvc3RmaXggb3BlcmF0b3JzIGFzIHN0cmluZ3MuXG5cdC8vIFJlLW1lbW9pemVkIGFmdGVyIGBhZGRJbmZpeE9wZXJhdG9yYCBhYm92ZS5cblx0cG9zdGZpeE9wZXJhdG9yczogZGVmaW5lTWVtb2l6ZWQoXCJfX3Bvc2ZpeE9wZXJhdG9yc1wiLFxuXHRcdGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0JiYgdGhpcy5ydWxlc1tcInBvc3RmaXhfb3BlcmF0b3JcIl0ucnVsZXMubWFwKHJ1bGUgPT4gcnVsZS5zdHJpbmcpO1xuXHR9KVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZVN5bnRheC5qcyIsIi8vXG4vL1x0IyBDb3JlIGBydWxlc2AgLS0gc2ltcGxlIGRhdGF0eXBlcywgZXRjLlxuLy9cbi8vIE5PVEU6IG1hbnkgb2YgdGhlIGJlbG93IGFyZSBjcmVhdGVkIGFzIGN1c3RvbSBQYXR0ZXJuIHN1YmNsYXNzZXMgZm9yIGRlYnVnZ2luZy5cbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGB3aGl0ZXNwYWNlYCBydWxlLlxuLy8gTk9URSBgcGFyc2VyLnBhcnNlKFwid2hpdGVzcGFjZVwiLCBcIiAgIFwiKWAgd2lsbCByZXR1cm4gYHVuZGVmaW5lZGBcbi8vXHRcdCBiZWNhdXNlIGBwYXJzZXIucGFyc2UoKWAgYXV0b21hdGljYWxseSBlYXRzIHdoaXRlc3BhY2UgYXQgdGhlIHN0YXJ0IG9mIGEgcnVsZS5cblJ1bGUuV2hpdGVzcGFjZSA9IGNsYXNzIHdoaXRlc3BhY2UgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge31cbnBhcnNlci5hZGRSdWxlKFwid2hpdGVzcGFjZVwiLCBuZXcgUnVsZS5XaGl0ZXNwYWNlKHsgcGF0dGVybjogL1xccysvLCBvcHRpb25hbDogdHJ1ZSB9KSk7XG5cbi8vIGBpZGVudGlmaWVyYCA9IHZhcmlhYmxlcyBvciBwcm9wZXJ0eSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGEgbG93ZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLklkZW50aWZpZXIgPSBjbGFzcyBpZGVudGlmaWVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IGlkZW50aWZpZXIgPSBwYXJzZXIuYWRkUnVsZShcImlkZW50aWZpZXJcIiwgbmV3IFJ1bGUuSWRlbnRpZmllcih7XG5cdHBhdHRlcm46IC9bYS16XVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBpZGVudGlmaWVyKTtcblxuLy8gQWRkIEVuZ2xpc2ggcHJlcG9zaXRpb25zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy9cbi8vIFdpa2lwZWRpYSBcIlByZXBvc2l0aW9uXCI6XG4vL1x0XCJQcmVwb3NpdGlvbnMuLi5hcmUgYSBjbGFzcyBvZiB3b3JkcyB0aGF0XG4vL1x0ZXhwcmVzcyBzcGF0aWFsIG9yIHRlbXBvcmFsIHJlbGF0aW9ucyAgKGluLCB1bmRlciwgdG93YXJkcywgYmVmb3JlKVxuLy9cdG9yIG1hcmsgdmFyaW91cyBzZW1hbnRpYyByb2xlcyAob2YsIGZvcikuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFib3V0XCIsIFwiYWJvdmVcIiwgXCJhZnRlclwiLCBcImFuZFwiLCBcImFzXCIsIFwiYXRcIixcblx0XCJiZWZvcmVcIiwgXCJiZWhpbmRcIiwgXCJiZWxvd1wiLCBcImJlbmVhdGhcIiwgXCJiZXNpZGVcIiwgXCJiZXR3ZWVuXCIsIFwiYmV5b25kXCIsIFwiYnlcIixcblx0XCJkZWZpbmVkXCIsIFwiZG93blwiLCBcImR1cmluZ1wiLFxuXHRcImVhY2hcIiwgXCJlbXB0eVwiLCBcImV4YWN0bHlcIiwgXCJleGNlcHRcIixcblx0XCJmb3JcIiwgXCJmcm9tXCIsXG5cdFwiZ3JlYXRlclwiLFxuXHRcImluXCIsIFwiaW50b1wiLFxuXHRcImxlc3NcIiwgXCJsb25nXCIsXG5cdFwibWludXNcIiwgXCJtb3JlXCIsXG5cdFwibmVhclwiLCBcIm5vdFwiLFxuXHRcIm9mXCIsIFwib2ZmXCIsIFwib25cIiwgXCJvbnRvXCIsIFwib3Bwb3NpdGVcIiwgXCJvdXRcIiwgXCJvdXRzaWRlXCIsIFwib3ZlclwiLFxuXHRcInNob3J0XCIsIFwic2luY2VcIixcblx0XCJ0aGFuXCIsIFwidGhlblwiLCBcInRocm91Z2hcIiwgXCJ0aHJ1XCIsIFwidG9cIiwgXCJ0b3dhcmRcIiwgXCJ0b3dhcmRzXCIsXG5cdFwidW5kZWZpbmVkXCIsIFwidW5kZXJcIiwgXCJ1bmRlcm5lYXRoXCIsIFwidW5pcXVlXCIsIFwidW50aWxcIiwgXCJ1cFwiLCBcInVwb25cIiwgXCJ1cHNpZGVcIixcblx0XCJ2ZXJzdXNcIiwgXCJ2c1wiLFxuXHRcIndpdGhcIiwgXCJ3aXRoaW5cIiwgXCJ3aXRob3V0XCIsXG4pO1xuXG4vLyBBZGQgY29tbW9uIGVuZ2xpc2ggdmVyYnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhcmVcIixcblx0XCJkb1wiLCBcImRvZXNcIixcblx0XCJjb250YWluc1wiLFxuXHRcImhhc1wiLCBcImhhdmVcIixcblx0XCJpc1wiLFxuXHRcInJlcGVhdFwiLFxuXHRcIndhc1wiLCBcIndlcmVcIlxuKTtcblxuLy8gQWRkIHNwZWNpYWwgY29udHJvbCBrZXl3b3JkcyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImVsc2VcIixcblx0XCJpZlwiLFxuXHRcIm90aGVyd2lzZVwiLFxuXHRcIndoaWxlXCJcbik7XG5cbi8vIGBUeXBlYCA9IHR5cGUgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhbiB1cHBlci1jYXNlIGxldHRlciAoPylcblJ1bGUuVHlwZSA9IGNsYXNzIHR5cGUgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgdHlwZSA9IHBhcnNlci5hZGRSdWxlKFwidHlwZVwiLCBuZXcgUnVsZS5UeXBlKHtcblx0cGF0dGVybjogL1tBLVpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHR5cGUpO1xuXG5cbi8vIGBudW1iZXJgIGFzIGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG5SdWxlLk51bWJlciA9IGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBudW1iZXIgPSBwYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgUnVsZS5OdW1iZXIoe1xuXHRwYXR0ZXJuOiAvLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIG51bWJlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUZsb2F0KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgbnVtYmVyKTtcblxuXG4vLyBOdW1lcmljIGBpbnRlZ2VyYCBvbmx5LCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBOT1RFOiB0aGlzIFdJTEwgbWF0Y2ggYSBmbG9hdCwgYnV0IHRoZSByZXR1cm5lZCB2YWx1ZSB3aWxsIGNvZXJjZSB0byBhbiBpbnRlZ2VyLlxuLy8gUkVWSUVXOiBpcyB0aGlzIHJpZ2h0PyAgQmV0dGVyIHRvIG5vdCBtYXRjaCBhIGZsb2F0P1xuUnVsZS5JbnRlZ2VyID0gY2xhc3MgaW50ZWdlciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbnBhcnNlci5hZGRSdWxlKFwiaW50ZWdlclwiLCBuZXcgUnVsZS5JbnRlZ2VyKHtcblx0cGF0dGVybjogLy0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBpbnRlZ2VyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlSW50KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5cblxuLy8gTGl0ZXJhbCBgdGV4dGAgc3RyaW5nLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBZb3UgY2FuIHVzZSBlaXRoZXIgc2luZ2xlIG9yIGRvdWJsZSBxdW90ZXMgb24gdGhlIG91dHNpZGUgKGFsdGhvdWdoIGRvdWJsZSBxdW90ZXMgYXJlIHByZWZlcnJlZCkuXG4vLyBSZXR1cm5lZCB2YWx1ZSBoYXMgZW5jbG9zaW5nIHF1b3Rlcy5cbi8vIFRPRE86IGVzY2FwZWQgcXVvdGVzIGluc2lkZSBzdHJpbmdcblJ1bGUuVGV4dCA9IGNsYXNzIHRleHQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgdGV4dCA9IHBhcnNlci5hZGRSdWxlKFwidGV4dFwiLCBuZXcgUnVsZS5UZXh0KHtcblx0cGF0dGVybjogLyg/OlwiW15cIl0qXCJ8J1teJ10qJykvXG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdGV4dCk7XG5cblxuLy8gQm9vbGVhbiBsaXRlcmFsLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBUT0RPOiBiZXR0ZXIgbmFtZSBmb3IgdGhpcz8/P1xuUnVsZS5Cb29sZWFuID0gY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBib29sID0gcGFyc2VyLmFkZFJ1bGUoXCJib29sZWFuXCIsIG5ldyBSdWxlLkJvb2xlYW4oe1xuXHRwYXR0ZXJuOiAvKHRydWV8ZmFsc2V8eWVzfG5vfG9rfGNhbmNlbClcXGIvLFxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHN3aXRjaCAodGhpcy5tYXRjaGVkKSB7XG5cdFx0XHRjYXNlIFwidHJ1ZVwiOlxuXHRcdFx0Y2FzZSBcInllc1wiOlxuXHRcdFx0Y2FzZSBcIm9rXCI6XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGJvb2wpO1xuLy8gQWRkIGJvb2xlYW4gdG9rZW5zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy8gVEVTVE1FXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJ0cnVlXCIsIFwiZmFsc2VcIixcblx0XCJ5ZXNcIiwgXCJub1wiLFxuXHRcIm9rXCIsIFwiY2FuY2VsXCJcbik7XG5cbi8vIExpdGVyYWwgbGlzdCAoYXJyYXkpLCBlZzogIGBbMSwyLHRydWUsZmFsc2UgXWBcbmxldCBsaXN0ID0gcGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGl0ZXJhbF9saXN0XCIsXG5cdFwiXFxcXFtbbGlzdDp7ZXhwcmVzc2lvbn0sXT9cXFxcXVwiLFxuXHR7XG5cdFx0Ly8gV2hlbiBnYXRoZXJpbmcgYXJndW1lbnRzLCByZXR1cm4ganVzdCB0aGUgbWF0Y2hlZCBsaXN0IGRhdGEuXG5cdFx0Z2F0aGVyQXJndW1lbnRzKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMucmVzdWx0c1sxXTtcblx0XHR9LFxuXHRcdC8vIHJldHVybiBqdXN0IHRoZSBsaXN0IGFzIG91ciBzb3VyY2Vcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG4gXHRcdFx0cmV0dXJuIHRoaXMuZ2F0aGVyQXJndW1lbnRzKCkudG9Tb3VyY2UoKTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIExpdGVyYWwgdmFsdWUgYXMgbnVtYmVyLCB0ZXh0IG9yIGJvb2xlYW4uXG4vL1RPRE86IHRoaXMgaXMgYW4gZXhwcmVzc2lvbi4uLiBidXQgaW5zdGFsbGluZyBpdCB0aGF0IHdheSBicmVha3MgcGFyc2luZy4uLj9cbi8vVEVTVE1FOiBhZGQgbGl0ZXJhbC1saXN0IHRvIHRoaXM/XG5wYXJzZXIuYWRkU3ludGF4KFwibGl0ZXJhbFwiLCBcIihsaXRlcmFsOntudW1iZXJ9fHt0ZXh0fXx7Ym9vbGVhbn18e2xpdGVyYWxfbGlzdH0pXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJcbi8vIFRPRE86IGNvbnZlcnQgdG8gbGluZS1hd2FyZSBzdHJlYW0/Pz9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRTdHJlYW0ge1xuXHQvLyBZb3UgY2FuIGNvbnN0cnVjdCB3aXRoIGEgdGV4dCBzdHJpbmcgb3IgYSBzZXQgb2YgcHJvcGVydGllcyAoaW5jbHVkaW5nIGB0ZXh0YCkuXG5cdGNvbnN0cnVjdG9yKC4uLnRleHRPclByb3BzKSB7XG5cdFx0dGV4dE9yUHJvcHMuZm9yRWFjaCgoYXJnKSA9PiB7XG5cdFx0XHRpZiAodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHR0aGlzLnRleHQgPSBhcmc7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChhcmcpIHtcblx0XHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBhcmcpO1xuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvLyBNYWtlIHN1cmUgYHRleHRgIGFuZCBgc3RhcnRJbmRleGAgYXJlIGRlZmluZWQuXG5cdFx0aWYgKCEoXCJ0ZXh0XCIgaW4gdGhpcykpIHRoaXMudGV4dCA9IFwiXCI7XG5cdFx0aWYgKCEoXCJzdGFydEluZGV4XCIgaW4gdGhpcykpIHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdH1cblxuXHQvLyBSZXR1cm4gYW4gaW1tdXRhYmxlIGNsb25lIG9mIHRoZSBzdHJlYW0uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0cmV0dXJuIG5ldyBUZXh0U3RyZWFtKHRoaXMsIHByb3BzKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2VkIHRvIG5ldyBzdGFydEluZGV4LlxuXHRhZHZhbmNlVG8oc3RhcnRJbmRleCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleCB9KTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2luZyBzdGFydEluZGV4IEJZIGBsZW5ndGhgXG5cdGFkdmFuY2VCeShsZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcblx0fVxuXG4vLyBcdC8vIFJldHVybiBjbG9uZSBvZiB0aGlzIHN0cmVhbSB3aXRoIGVuZEluZGV4IHNldCB0byBzdGFydCArIGBsZW5ndGhgXG4vLyBcdGVuZEFmdGVyKGxlbmd0aCkge1xuLy8gXHRcdHJldHVybiB0aGlzLmNsb25lKHsgZW5kSW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcbi8vIFx0fVxuXG4vL1xuLy8gIyMgTWF0Y2hpbmdcbi8vXG5cdC8vIE1hdGNoIGBwYXR0ZXJuYCBhcyByZWdleCBpbiB0aGlzIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBtYXRjaCBvciBgdW5kZWZpbmVkYC5cblx0Ly8gSWYgeW91IHdhbnQgdG8gdGVzdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmVhbSxcblx0Ly9cdG1ha2Ugc3VyZSB5b3VyIHJlZ2V4IHN0YXJ0cyB3aXRoIGBeYC5cblx0Ly8gVEVTVE1FOiB0aGlzIGxpa2VseSBicmVha3Mgd2l0aCBhIGBnYCBvbiB0aGUgcGF0dGVybj9cblx0bWF0Y2gocGF0dGVybikge1xuXHRcdGlmICghKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBUZXh0U3RyZWFtLm1hdGNoKCR7cGF0dGVybn0pOiBleHBlY3RlZCBSZWdFeHBgKTtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQubWF0Y2gocGF0dGVybikgfHwgdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGlzIHN0cmVhbSBJTkNMVURFIGEgcmVnZXggd2l0aGluIGl0P1xuXHQvLyBSZXR1cm5zIGB0cnVlYCBvciBgZmFsc2VgLlxuXHQvLyBOT1RFOiBQYXR0ZXJuIG11c3QgTk9UIHN0YXJ0IHdpdGggYF5gIGZvciB0aGlzIHRvIG1hdGNoIGluIHRoZSBtaWRkbGUgb2YgdGhlIHN0cmVhbS5cblx0dGVzdChwYXR0ZXJuKSB7XG5cdFx0cmV0dXJuIHBhdHRlcm4udGVzdCh0aGlzLmhlYWQpO1xuXHR9XG5cbi8vXG4vLyAjIyBSZWZsZWN0aW9uXG4vL1xuXHQvLyBSZXR1cm4gdGV4dCBvZiBzdHJpbmcgc3RhcnRpbmcgYXQgb3VyIGBzdGFydEluZGV4YFxuXHRnZXQgaGVhZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5yYW5nZSgpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgcmFuZ2Ugb2YgdGhlIHN0cmluZyBmcm9tIGBzdGFydEluZGV4YCB0byBgZW5kSW5kZXhgIE5PTi1pbmNsdXNpdmUuXG5cdHJhbmdlKHN0YXJ0SW5kZXggPSB0aGlzLnN0YXJ0SW5kZXgsIGVuZEluZGV4ID0gdGhpcy5lbmRJbmRleCB8fCB0aGlzLnRleHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5zdWJzdHJpbmcoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xuXHR9XG5cblx0Ly8gTGVuZ3RoIG9mIHRoZSBzdHJlYW0uXG5cdGdldCBsZW5ndGgoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5sZW5ndGg7XG5cdH1cblxuXHQvLyBBcmUgd2UgYXQgdGhlIGVuZCBvZiB0aGUgc3RyZWFtP1xuXHRnZXQgaXNFbXB0eSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGFydEluZGV4ID09PSB0aGlzLmxlbmd0aDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHRcblx0fTtcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9UZXh0U3RyZWFtLmpzIiwiaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGxvYWQgc3RhbmRhcmQgcnVsZXMgZmlsZXMgaGVyZVxuaW1wb3J0IFwiLi9jb3JlXCI7XG5pbXBvcnQgXCIuL251bWJlcnNcIjtcbmltcG9ydCBcIi4vb3BlcmF0b3JzXCI7XG5pbXBvcnQgXCIuL3N0YXRlbWVudHNcIjtcbmltcG9ydCBcIi4vYXNzaWdubWVudFwiO1xuaW1wb3J0IFwiLi9jbGFzc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiLy8gTWVtb2l6ZS9mb3JnZXQgc2VtYW50aWNzLlxuXG4vLyBSZXR1cm4gYSBtZW1vaXppbmcgZ2V0dGVyIGZ1bmN0aW9uLlxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXNbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGdldHRlci5hcHBseSh0aGlzKTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIERlZmluZSBzbyB0aGF0IHdlIGNhbiBiZSBkZWxldGVkIGFuZCByZS1kZWZpbmVkLCBidXQgbm90IHNldCBvciBlbnVtZXJhdGVkLlxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcGVydHksIHsgdmFsdWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXNbcHJvcGVydHldO1xuXHR9XG59XG5cblxuLy8gUmV0dXJuIGEgbWVtb2l6ZSBmdW5jdGlvbiBmb3IgdXNlIGFzIGEgZ2V0dGVyIGluIGEgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYFxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4ge1xuXHRcdGdldCA6IG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpXG5cdH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9tZW1vaXplLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBUT0RPOiB7cHJvcGVydHktZXhwcmVzc2lvbn0gYWxzbyB3b3Jrcy4uLiB7YXNzaWduYWJsZS1leHByZXNzaW9ufSA/Pz9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsIFwie2lkZW50aWZpZXJ9ID0ge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdGxldCB2YWx1ZSA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdC8vIFRPRE86IGRlY2xhcmUgaWRlbnRpZmllciBpZiBub3QgaW4gc2NvcGUsIGV0Y1xuXHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSA9ICR7dmFsdWV9YDtcblx0fVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvYXNzaWdubWVudC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVmaW5pbmcgY2xhc3NlcyAoa25vd24gYXMgYHR5cGVzYClcbi8vXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy9wYXJzZXIuYWRkRXhwcmVzc2lvbihcInByb3BlcnR5X2V4cHJlc3Npb25cIiwgXCJ7cHJvcGVydHk6cHJvcGVydHlfbmFtZX0rIHtleHByZXNzaW9ufVwiLCB7XG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcInByb3BlcnR5X2V4cHJlc3Npb25cIiwgXCIocHJvcGVydGllczp0aGUge2lkZW50aWZpZXJ9IG9mKSsge2V4cHJlc3Npb259XCIsIHtcbiBcdGdhdGhlckFyZ3VtZW50cygpIHtcblx0XHRsZXQgYXJncyA9IFJ1bGUuRXhwcmVzc2lvbi5nYXRoZXJBcmd1bWVudHModGhpcyk7XG5cdFx0Ly8gdHJhbnNmb3JtIHByb3BlcnRpZXMgYW5kIHJldmVyc2Ugb3JkZXJcblx0XHRhcmdzLnByb3BlcnRpZXMgPSBhcmdzLnByb3BlcnRpZXMubWFwKCBzZXF1ZW5jZSA9PiBzZXF1ZW5jZS5pZGVudGlmaWVyICkucmV2ZXJzZSgpO1xuXHRcdHJldHVybiBhcmdzO1xuIFx0fSxcblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCB0aGluZyA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdGxldCBwcm9wZXJ0aWVzID0gYXJncy5wcm9wZXJ0aWVzLm1hcCggaWRlbnRpZmllciA9PiBpZGVudGlmaWVyLnRvU291cmNlKCkgKS5qb2luKFwiLlwiKTtcblx0XHRyZXR1cm4gYHNwZWxsLmdldCgke3RoaW5nfSwgJyR7cHJvcGVydGllc30nKWA7XG5cdH1cbn0pO1xuXG5cblxucGFyc2VyLmFkZFN5bnRheChcInNjb3BlX21vZGlmaWVyXCIsIFwiKHNjb3BlOmdsb2JhbHxjb25zdGFudHxzaGFyZWQpXCIpO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlcIixcblx0XCJ7c2NvcGVfbW9kaWZpZXJ9PyB7YXNzaWdubWVudH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5hc3NpZ25tZW50LmlkZW50aWZpZXIudG9Tb3VyY2UoKTtcblx0XHRcdGxldCB2YWx1ZSA9IGFyZ3MuYXNzaWdubWVudC5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgYXNzaWdubWVudCA9IGAke2lkZW50aWZpZXJ9ID0gJHt2YWx1ZX1gO1xuXG5cdFx0XHR2YXIgc2NvcGUgPSBhcmdzLnNjb3BlID8gYXJncy5zY29wZS50b1NvdXJjZSgpIDogXCJsb2NhbFwiO1xuXHRcdFx0c3dpdGNoIChzY29wZSkge1xuXHRcdFx0XHRjYXNlIFwiZ2xvYmFsXCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBnbG9iYWwuJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcImNvbnN0YW50XCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBjb25zdCAke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwic2hhcmVkXCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBzdGF0aWMgJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRyZXR1cm4gYXNzaWdubWVudDtcblx0XHRcdH1cblx0XHR9XG5cdH1cbik7XG5cbi8vIFRPRE86IHdhcm4gb24gaW52YWxpZCBzZXQ/ICBzaGFyZWQ/ICB1bmRlZmluZWQ/IHNvbWV0aGluZyBvdGhlciB0aGFuIHRoZSBmaXJzdCB2YWx1ZSBhcyBkZWZhdWx0P1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5X2FzX29uZV9vZlwiLFxuXHRcIntpZGVudGlmaWVyfSBhcyBvbmUgb2Yge2xpc3Q6bGl0ZXJhbF9saXN0fVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGlkZW50aWZpZXIgPSBhcmdzLmlkZW50aWZpZXIudG9Tb3VyY2UoKTtcblx0XHRcdGxldCBwbHVyYWwgPSAoaWRlbnRpZmllciArIFwiX1ZBTFVFU1wiKS50b1VwcGVyQ2FzZSgpO1xuXHRcdFx0bGV0IGxpc3QgPSBhcmdzLmxpc3QubGlzdDtcblx0XHRcdGxldCB2YWx1ZXMgPSBsaXN0LnRvU291cmNlKCk7XG5cdFx0XHRsZXQgZmlyc3QgPSBsaXN0LnJlc3VsdHNbMF07XG5cdFx0XHRsZXQgZmlyc3RWYWx1ZSA9IGZpcnN0ID8gZmlyc3QudG9Tb3VyY2UoKSA6IFwidW5kZWZpbmVkXCI7XG5cblx0XHRcdHJldHVybiBgc3RhdGljICR7cGx1cmFsfSA9ICR7dmFsdWVzfTtcXG5gXG5cdFx0XHRcdCArIGBnZXQgJHtpZGVudGlmaWVyfSB7IHJldHVybiAoXCJfXyR7aWRlbnRpZmllcn1cIiBpbiB0aGlzID8gdGhpcy5fXyR7aWRlbnRpZmllcn0gOiAke2ZpcnN0VmFsdWV9KSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuY29uc3RydWN0b3IuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9XFxuYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9jbGFzcy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVhbGluZyB3aXRoIG51bWJlcnNcbi8vXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy8gTnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZy5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFwiaW5kZXhfZXhwcmVzc2lvblwiLCBcIml0ZW0ge251bWJlcjppbnRlZ2VyfSBvZiB7ZXhwcmVzc2lvbn1cIiwge1xuXHR0b1NvdXJjZSgpIHtcblx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0bGV0IG51bWJlciA9IGFyZ3MubnVtYmVyLnRvU291cmNlKCk7XG5cdFx0bGV0IGV4cHJlc3Npb24gPSBhcmdzLmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtudW1iZXJ9KWA7XG5cdH1cbn0pO1xuXG4vLyBFbmdsaXNoIHdvcmRzIHVzZWQgZm9yIHBvc2l0aW9uIG9mIHNvbWV0aGluZyBpbiBhIGxpc3QuXG4vLyBUT0RPOiBgc2V2ZW50eS1zZXZlbnRoYCwgYHRoaXJkLXRvLWxhc3RgLi4uXG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcIihmaXJzdHxzZWNvbmR8dGhpcmR8Zm91cnRofGZpZnRofHNpeHRofHNldmVudGh8ZWlnaHRofG5pbnRofHRlbnRofHBlbnVsdGltYXRlfGxhc3R8ZmluYWwpXCIsIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCBvcmRpbmFsID0gdGhpcy5tYXRjaGVkLnRvU291cmNlKCk7XG5cdFx0c3dpdGNoIChvcmRpbmFsKSB7XG5cdFx0XHRjYXNlIFwiZmlyc3RcIjpcdFx0cmV0dXJuIDE7XG5cdFx0XHRjYXNlIFwic2Vjb25kXCI6XHRcdHJldHVybiAyO1xuXHRcdFx0Y2FzZSBcInRoaXJkXCI6XHRcdHJldHVybiAzO1xuXHRcdFx0Y2FzZSBcImZvdXJ0aFwiOlx0XHRyZXR1cm4gNDtcblx0XHRcdGNhc2UgXCJmaWZ0aFwiOlx0XHRyZXR1cm4gNTtcblx0XHRcdGNhc2UgXCJzaXh0aFwiOlx0XHRyZXR1cm4gNjtcblx0XHRcdGNhc2UgXCJzZXZlbnRoXCI6XHRcdHJldHVybiA3O1xuXHRcdFx0Y2FzZSBcImVpZ2h0aFwiOlx0XHRyZXR1cm4gODtcblx0XHRcdGNhc2UgXCJuaW50aFwiOlx0XHRyZXR1cm4gOTtcblx0XHRcdGNhc2UgXCJ0ZW50aFwiOlx0XHRyZXR1cm4gMTA7XG5cdFx0XHRjYXNlIFwicGVudWx0aW1hdGVcIjpcdHJldHVybiAtMjtcblx0XHRcdGNhc2UgXCJsYXN0XCI6XHRcdHJldHVybiAtMTtcblx0XHRcdGNhc2UgXCJmaW5hbFwiOlx0XHRyZXR1cm4gLTE7XG5cdFx0fVxuXHR9XG59KTtcblxuLy8gQWx0ZXJuYXRpdmUgZm9ybSBmb3IgbnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZy5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFwiaW5kZXhfZXhwcmVzc2lvblwiLCBcInRoZSB7b3JkaW5hbH0gaXRlbSBvZiB7ZXhwcmVzc2lvbn1cIiwge1xuXHR0b1NvdXJjZSgpIHtcblx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0bGV0IG9yZGluYWwgPSBhcmdzLm9yZGluYWwudG9Tb3VyY2UoKTtcblx0XHRsZXQgZXhwcmVzc2lvbiA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke29yZGluYWx9KWA7XG5cdH1cbn0pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvbnVtYmVycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgaW5maXggYW5kIHByZWZpeCBvcGVyYXRvcnMuXG4vL1xuXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyMjIEluZml4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPiB7cmhzfWAsIGVnOiBgYSBpcyAxYFxuLy8gTk9URTogYG9wZXJhdG9yLnRvSlNgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyB0d28gYXJndW1lbnRzIChgbGhzYCBhbmQgYHJoc2ApIGludG8gb3V0cHV0LlxuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImFuZFwiLCBcImFuZFwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gJiYgJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwib3JcIiwgXCJvclwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gfHwgJHtifSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc1wiLCBcImlzXCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RcIiwgXCJpcyBub3RcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfZXhhY3RseVwiLCBcImlzIGV4YWN0bHlcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RfZXhhY3RseVwiLCBcImlzIG5vdCBleGFjdGx5XCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPT0gJHtifSlgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNPZlR5cGUodGhpbmcsIHR5cGUpYFxuLy9UT0RPOiBgaXMgc2FtZSB0eXBlIGFzYCA/XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX3R5cGVfb2ZcIiwgW1wiaXMgYVwiLCBcImlzIGFuXCJdLCB7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGBzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RfdHlwZV9vZlwiLCBbXCJpcyBub3QgYVwiLCBcImlzIG5vdCBhblwiXSwgeyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmNvbnRhaW5zKGNvbGxlY3Rpb24sIHRoaW5nKWBcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfaW5cIiwgW1wiaXMgaW5cIiwgXCJpcyBvbmUgb2ZcIl0sIHsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYHNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RfaW5cIiwgW1wiaXMgbm90IGluXCIsIFwiaXMgbm90IG9uZSBvZlwiXSwgeyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgIXNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xuLy9URVNUTUVcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaW5jbHVkZXNcIiwgW1wiaW5jbHVkZXNcIiwgXCJjb250YWluc1wiXSwgeyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgc3BlbGwuY29udGFpbnMoJHtsaXN0fSwgJHt0aGluZ30pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImRvZXNudF9pbmNsdWRlXCIsIFtcImRvZXMgbm90IGluY2x1ZGVcIiwgXCJkb2VzbnQgaW5jbHVkZVwiLCBcImRvZXMgbm90IGNvbnRhaW5cIiwgXCJkb2VzbnQgY29udGFpblwiXSwgeyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0XCIsIFtcIj5cIiwgXCJpcyBncmVhdGVyIHRoYW5cIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZ3RlXCIsIFtcIj49XCIsIFwiaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJsdFwiLCBbXCI8XCIsIFwiaXMgbGVzcyB0aGFuXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0ZVwiLCBbXCI8PVwiLCBcImlzIGxlc3MgdGhhbiBvciBlcXVhbCB0b1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPD0gJHtifSlgIH19KTtcblxuLy9UT0RPOiAgY2FuJ3QgYWRkIGArYCBhcyBhIHJ1bGUsIGZpeCB0aGlzIHRoZW4gYWRkIHRoZXNlXG4vL1RPRE86ICBvcGVyYXRvciBwcmVjZWRlbmNlPz8/XG4vL1RFU1RNRVxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJwbHVzXCIsIFtcIlxcXFwrXCIsIFwicGx1c1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSArICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibWludXNcIiwgW1wiLVwiLCBcIm1pbnVzXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJ0aW1lc1wiLCBbXCJcXFxcKlwiLCBcInRpbWVzXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICogJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJkaXZpZGVkX2J5XCIsIFtcIi9cIiwgXCJkaXZpZGVkIGJ5XCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC8gJHtifWAgfX0pO1xuXG4vL1RPRE86ICBgKz1gIGV0Yz8gIG90aGVyIG1hdGggZnVuY3Rpb25zP1xuXG5wYXJzZXIuYWRkU3ludGF4KFxuXHRcImluZml4X29wZXJhdG9yX2V4cHJlc3Npb25cIixcblx0XCJ7bGhzOmV4cHJlc3Npb259IHtvcGVyYXRvcjppbmZpeF9vcGVyYXRvcn0ge3JoczpleHByZXNzaW9ufVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGxocyA9IGFyZ3MubGhzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHJocyA9IGFyZ3MucmhzLnRvU291cmNlKGNvbnRleHQpO1xuXG5cdFx0XHRsZXQgdG9KUyA9IGFyZ3Mub3BlcmF0b3IudG9KUztcblx0XHRcdHJldHVybiB0b0pTKGxocywgcmhzKTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIyMgUG9zdGlmeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj5gLCBlLmcuIGBhIGlzIGRlZmluZWRgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBKUyBvdXRwdXQuXG5cbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19kZWZpbmVkXCIsIFwiaXMgZGVmaW5lZFwiLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ICE9PSAndW5kZWZpbmVkJylgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19ub3RfZGVmaW5lZFwiLCBbXCJpcyBub3QgZGVmaW5lZFwiLCBcImlzIHVuZGVmaW5lZFwiXSwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzRW1wdHkodGhpbmcpYFxucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX2VtcHR5XCIsIFwiaXMgZW1wdHlcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19ub3RfZW1wdHlcIiwgXCJpcyBub3QgZW1wdHlcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9fSk7XG5cbnBhcnNlci5hZGRTeW50YXgoXG5cdFwicG9zdGZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeF9vcGVyYXRvcn1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBsaHMgPSBhcmdzLmxocy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCB0b0pTID0gYXJncy5vcGVyYXRvci50b0pTO1xuXHRcdFx0cmV0dXJuIHRvSlMobGhzKTtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gVE9ETzogdGhpcyBzaG91bGQgcmVhbGx5IGJlIGEgZ2VuZXJhbCBcImV4cHJlc3Npb25cIi4uLlxucGFyc2VyLmFkZFN5bnRheChcIm9wZXJhdG9yX2V4cHJlc3Npb25cIiwgXCIoZXhwcmVzc2lvbjp7cG9zdGZpeF9vcGVyYXRvcl9leHByZXNzaW9ufXx7aW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvbn0pXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyIsImltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5pbXBvcnQgXCIuL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vcnVsZXMvaW5kZXguanNcIjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdHdpbmRvdy5UZXh0U3RyZWFtID0gVGV4dFN0cmVhbTtcblx0d2luZG93LlBhcnNlciA9IFBhcnNlcjtcblx0d2luZG93LlJ1bGUgPSBSdWxlO1xuXHR3aW5kb3cucGFyc2VyID0gcGFyc2VyO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7XG5cdFRleHRTdHJlYW0sIFBhcnNlciwgUnVsZSwgcGFyc2VyXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9pbmRleC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJpZlwiLCBcImlmIHtleHByZXNzaW9ufSB0aGVuIHtudW1iZXJ9P1wiLCB7XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHR9XG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIl0sInNvdXJjZVJvb3QiOiIifQ==