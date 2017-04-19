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
		// Returns results of the parse or `undefined`.

	}, {
		key: "parse",
		value: function parse(parser, stream) {
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
			var match = stream.match(this.startPattern);
			if (!match) return undefined;

			// bail if present in blacklist
			var matched = match[0];
			if (this.blacklist && this.blacklist[matched]) return undefined;

			return this.clone({
				matched: matched,
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
		value: function parse(parser, stream) {
			var rule = parser.getRule(this.rule);
			if (!rule) throw new SyntaxError("Attempting to parse unknown rule '" + this.name + "'", this);
			var result = rule.parse(parser, stream);
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
		value: function parse(parser, stream) {
			var results = [],
			    next = stream;
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = this.rules[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var rule = _step.value;

					next = parser.eatWhitespace(next);
					var result = rule.parse(parser, next);
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
		value: function parse(parser, stream) {
			var bestMatch = void 0;
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = this.rules[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var rule = _step3.value;

					var match = rule.parse(parser, stream);
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

			// assign `argName` or `ruleName` for `gatherArguments()`
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
		value: function parse(parser, stream) {
			var next = stream;
			var results = [];
			while (true) {
				next = parser.eatWhitespace(next);
				var result = this.rule.parse(parser, next);
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
		value: function parse(parser, stream) {
			// ensure item and delimiter are optional so we don't barf in `parseRule`
			this.item.optional = true;
			this.delimiter.optional = true;

			var results = [],
			    next = stream;
			while (true) {
				next = parser.eatWhitespace(next);
				// get next item, exiting if not found
				var item = this.item.parse(parser, next);
				if (!item) break;
				//console.log(item);
				results.push(item);
				next = item.next();

				next = parser.eatWhitespace(next);
				// get delimiter, exiting if not found
				var delimiter = this.delimiter.parse(parser, next);
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
		var SYNTAX_EXPRESSION = /(?:[\w\-!]+|\\[\[\(\{\)\}\]]|[^\s\w]|\|)/g;
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
// NOTE: don't add as an expression since we're auto-merged with `index_expression` above.
_parser2.default.addSyntax("index_expression", "the {ordinal} item of {expression}", {
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

var _RuleSyntax = __webpack_require__(3);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(4);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// re-export parser for testing.
exports.default = _parser2.default;

//## Infix operators:   `{lhs} <operator> {rhs}`, eg: `a is 1`
// NOTE: `operator.toJS` MUST return a function which transforms two arguments (`lhs` and `rhs`) into output.

//
//	# Rules for infix and prefix operators.
//

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

_parser2.default.addSyntax("postfix_operator_expression", "{lhs:expression!postfix_operator_expression} {operator:postfix_operator}", {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgNTIxMGM0NTdkNTU2OTNlZmI4NDAiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZVN5bnRheC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIl0sIm5hbWVzIjpbInBhcnNlciIsIndpbmRvdyIsImNvbnNvbGUiLCJncm91cCIsImxvZyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInJ1bGVzIiwiY3JlYXRlIiwibmFtZSIsInN0cmVhbSIsInJ1bGUiLCJnZXRSdWxlIiwiU3ludGF4RXJyb3IiLCJlYXRXaGl0ZXNwYWNlIiwicGFyc2UiLCJyZXN1bHQiLCJ3aGl0ZXNwYWNlIiwiYWR2YW5jZUJ5IiwibWF0Y2hlZCIsImxlbmd0aCIsImV4aXN0aW5nIiwiQWx0ZXJuYXRpdmVzIiwiZGVidWciLCJydWxlTmFtZSIsImFyZ3VtZW50IiwiYWRkUnVsZSIsInRva2VucyIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsInN0YXJ0SW5kZXgiLCJuZXN0aW5nIiwibmVzdGVkIiwiZW5kSW5kZXgiLCJsYXN0SW5kZXgiLCJ0b2tlbiIsInNsaWNlIiwic3RyaW5nIiwic3BsaXQiLCJtYXAiLCJjaGFyIiwiaW5kZXgiLCJsaXN0IiwiUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyIsImpvaW4iLCJmbGFncyIsIlJlZ0V4cCIsImVzY2FwZVJlZ0V4cENoYXJhY3RlcnMiLCJERUJVRyIsImNoYXJzIiwiZm9yRWFjaCIsIlJ1bGUiLCJjb25zdHJ1Y3RvciIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwicHJvcHMiLCJjbG9uZSIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsImdhdGhlckFyZ3VtZW50cyIsIlBhdHRlcm4iLCJwYXR0ZXJuIiwiZGVmaW5lUHJvcGVydHkiLCJ2YWx1ZSIsInNvdXJjZSIsIm1hdGNoIiwic3RhcnRQYXR0ZXJuIiwiYmxhY2tsaXN0Iiwid29yZHMiLCJ3b3JkIiwiU3ltYm9sIiwiUmVnRXhwRnJvbVN0cmluZyIsIm9wdGlvbmFsIiwibWVyZ2VTeW1ib2xzIiwiZmlyc3QiLCJzZWNvbmQiLCJLZXl3b3JkIiwicGF0dGVyblN0cmluZyIsIm1lcmdlS2V5d29yZHMiLCJTdWJydWxlIiwiaXNEZXRlcm1pbmlzdGljIiwiTmVzdGVkIiwiZXZlcnkiLCJTZXF1ZW5jZSIsInJlc3VsdHMiLCJuZXh0IiwicHVzaCIsInNlcXVlbmNlIiwiYXJncyIsImFyZ05hbWUiLCJfYXJnIiwiQXJyYXkiLCJpc0FycmF5IiwiRXhwcmVzc2lvbiIsIlN0YXRlbWVudCIsImJlc3RNYXRjaCIsImNvbnRleHQiLCJ0b1NvdXJjZSIsIlJlcGVhdCIsImluY2x1ZGVzIiwicmVwZWF0IiwiTGlzdCIsIml0ZW0iLCJkZWxpbWl0ZXIiLCJwYXJzZVJ1bGVTeW50YXgiLCJzeW50YXgiLCJTZXF1ZW5jZUNvbnN0cnVjdG9yIiwic3ludGF4U3RyZWFtIiwidG9rZW5pc2VSdWxlU3ludGF4IiwicGFyc2VSdWxlU3ludGF4X3Rva2VucyIsIlNZTlRBWF9FWFBSRVNTSU9OIiwicGFyc2VSdWxlU3ludGF4X3Rva2VuIiwibGFzdCIsInBvcCIsInN5bnRheFRva2VuIiwicGFyc2VSdWxlU3ludGF4X3N0cmluZyIsInBhcnNlUnVsZVN5bnRheF9zdWJydWxlIiwicGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzIiwicGFyc2VSdWxlU3ludGF4X2xpc3QiLCJwYXJzZVJ1bGVTeW50YXhfcmVwZWF0Iiwic3RhcnRzV2l0aCIsInN1YnN0ciIsInRvU3RyaW5nIiwiZmluZE5lc3RlZFRva2VucyIsImFsdGVybmF0aXZlcyIsImdyb3VwQWx0ZXJuYXRpdmVzIiwiY3VycmVudCIsImkiLCJjb25jYXQiLCJzeW1ib2wiLCJwYXJhbXMiLCJiYW5nUG9zaXRpb24iLCJpbmRleE9mIiwibm90IiwiZGVmaW5lUHJvcGVydGllcyIsImFkZFN5bnRheCIsInJ1bGVTeW50YXgiLCJlIiwiZXJyb3IiLCJhZGRTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiYWRkSW5maXhPcGVyYXRvciIsInRvSlMiLCJfX2luZml4T3BlcmF0b3JzIiwiaW5maXhPcGVyYXRvcnMiLCJhZGRQb3N0Zml4T3BlcmF0b3IiLCJfX3Bvc3RmaXhPcGVyYXRvcnMiLCJwb3N0Zml4T3BlcmF0b3JzIiwiV2hpdGVzcGFjZSIsIklkZW50aWZpZXIiLCJpZGVudGlmaWVyIiwicmVwbGFjZSIsImFkZFRvQmxhY2tsaXN0IiwiVHlwZSIsInR5cGUiLCJOdW1iZXIiLCJudW1iZXIiLCJwYXJzZUZsb2F0IiwiSW50ZWdlciIsInBhcnNlSW50IiwiVGV4dCIsInRleHQiLCJCb29sZWFuIiwiYm9vbCIsIlRleHRTdHJlYW0iLCJ0ZXh0T3JQcm9wcyIsImFyZyIsImhlYWQiLCJ0ZXN0Iiwic3Vic3RyaW5nIiwicmFuZ2UiLCJtZW1vaXplZCIsImRlZmluZU1lbW9pemVkIiwicHJvcGVydHkiLCJnZXR0ZXIiLCJhcHBseSIsImNvbmZpZ3VyYWJsZSIsImdldCIsImV4cHJlc3Npb24iLCJyZXZlcnNlIiwidGhpbmciLCJhc3NpZ25tZW50Iiwic2NvcGUiLCJwbHVyYWwiLCJ0b1VwcGVyQ2FzZSIsInZhbHVlcyIsImZpcnN0VmFsdWUiLCJvcmRpbmFsIiwiYSIsImIiLCJsaHMiLCJyaHMiLCJvcGVyYXRvciJdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLG1EQUEyQyxjQUFjOztBQUV6RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOzs7O0FBQ0E7Ozs7OztBQUVBO0FBTkE7QUFDQTtBQUNBO0FBS0EsSUFBTUEsU0FBUyxzQkFBZjtrQkFDZUEsTTs7QUFFZjs7QUFDQUMsT0FBT0QsTUFBUCxHQUFnQkEsTUFBaEIsQzs7Ozs7Ozs7Ozs7OztxakJDWEE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7QUFDQTs7Ozs7Ozs7QUFFQTtBQUNBLElBQUksQ0FBQ0UsUUFBUUMsS0FBYixFQUFvQkQsUUFBUUMsS0FBUixHQUFnQkQsUUFBUUUsR0FBeEI7QUFDcEIsSUFBSSxDQUFDRixRQUFRRyxRQUFiLEVBQXVCSCxRQUFRRyxRQUFSLEdBQW1CSCxRQUFRRSxHQUEzQjs7SUFFRkUsTTtBQUlwQixpQkFBWUMsVUFBWixFQUF3QjtBQUFBOztBQUN2QkMsU0FBT0MsTUFBUCxDQUFjLElBQWQsRUFBb0JGLFVBQXBCOztBQUVBO0FBQ0EsT0FBS0csS0FBTCxHQUFhRixP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SUFBekI7QUFDQSxTQUFPQSxLQUFLZ0QsR0FBTCxDQUFQO0FBQ0E7QUFORixDQUhEOztBQWNBO0FBQ0EsaUJBQU92RCxTQUFQLENBQWlCLHFCQUFqQixFQUF3Qyx3RUFBeEMsRTs7Ozs7Ozs7Ozs7OztBQzFGQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7Ozs7O0FBRUE7QUFDQSxJQUFJLE9BQU8xSSxNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQ2xDQSxRQUFPdUssVUFBUDtBQUNBdkssUUFBT0ssTUFBUDtBQUNBTCxRQUFPcUQsSUFBUDtBQUNBckQsUUFBT0QsTUFBUDtBQUNBOztrQkFFYztBQUNkd0ssaUNBRGMsRUFDRmxLLHdCQURFLEVBQ01nRCxvQkFETixFQUNZdEQ7QUFEWixDOzs7Ozs7Ozs7Ozs7O0FDVmY7Ozs7QUFDQTs7OztBQUVBO0FBUEE7QUFDQTtBQUNBOzs7O0FBUUE7O0FBQ0EsaUJBQU8rSSxZQUFQLENBQW9CLElBQXBCLEVBQTBCLGdDQUExQixFQUE0RDtBQUUzRDFDLFNBRjJELG9CQUVsREQsT0FGa0QsRUFFekMsQ0FDakI7QUFIMEQsQ0FBNUQsRSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGlkZW50aXR5IGZ1bmN0aW9uIGZvciBjYWxsaW5nIGhhcm1vbnkgaW1wb3J0cyB3aXRoIHRoZSBjb3JyZWN0IGNvbnRleHRcbiBcdF9fd2VicGFja19yZXF1aXJlX18uaSA9IGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiB2YWx1ZTsgfTtcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7XG4gXHRcdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuIFx0XHRcdFx0ZW51bWVyYWJsZTogdHJ1ZSxcbiBcdFx0XHRcdGdldDogZ2V0dGVyXG4gXHRcdFx0fSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiL1wiO1xuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IDEyKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCA1MjEwYzQ1N2Q1NTY5M2VmYjg0MCIsIi8vXG4vL1x0IyBDcmVhdGUgYSBgcGFyc2VyYCBzaW5nbGV0b24gdG8gdXNlIHRvIHNldCB1cCBydWxlcyBhbmQgZHVyaW5nIHRlc3RzLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcblxuLy8gQ3JlYXRlIHBhcnNlciBpbnN0YW5jZS5cbmNvbnN0IHBhcnNlciA9IG5ldyBQYXJzZXIoKTtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbndpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9fcGFyc2VyLmpzIiwiLy8gU3BlbGwgXCJFbmdsaXNoXCIgcGFyc2VyIHN0cmF3bWFuXG5cbi8vIFRPRE86XHRgdGVzdGAgZnVuY3Rpb24gZm9yIHF1aWNrIG5vLWdvb2QgaGl0IG9uIGB7YX0gYmxhaCBibGFoIHtifWA/XG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcms6ICAgYHtleHByZXNzaW9ufSBpcyB7ZXhwcmVzc2lvbn1gXG4vLyBUT0RPOlx0YnJlYWsgYGZpbGVgIGludG8gbGluZXMgYW5kIHByb2Nlc3MgZWFjaCAoaW5jbC4gc3Vic3RyL21hdGNoIG5vdCBnb2luZyBiZXlvbmQgdGhlIGVuZClcbi8vIFRPRE86XHRuZXN0aW5nIC0tIGlzIHRoaXMganVzdCBpbmRlbnQgPSBcImFkZCBibG9jayBzY29wZVwiXG4vLyBUT0RPOlx0cHJvbW90aW9uIHBhdHRlcm4gZm9yIGdhdGhlciBhcmd1bWVudHMgKGVnOiBsaXRlcmFsLWxpc3QpID8/P1xuLy8gVE9ETzpcdFdoYXQgZG9lcyBzeW50YXggdHJlZSBsb29rIGxpa2U/ICBIb3cgZG8gd2UgZXh0cmFjdCBtZWFuaW5nIG91dCBvZiB0aGUgbmVzdD9cbi8vIFRPRE86XHRQYXNzIGBjb250ZXh0YCB0byB0b1NvdXJjZSgpLCBhZGQgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYGNsYXNzYCwgdmFyaWFibGVzIGFuZCBjb2RlIHRvIGBtZXRob2RgLCBgZ2xvYmFsYCBzdHVmZiBldGNcblxuaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ2xvbmUgcnVsZXMsIHN0YXJ0aW5nIHdpdGggYSBjb21wbGV0ZWx5IGVtcHR5IG1hcCBpZiBub3QgZGVmaW5lZCAobm8gc3RhbmRhcmQgb2JqZWN0IGtleXMpXG5cdFx0dGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5ydWxlcyB8fCBudWxsKTtcblx0fVxuXG5cdGdldFJ1bGUobmFtZSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzW25hbWVdO1xuXHR9XG5cbi8vXG4vLyMjIyBQYXJzaW5nXG4vL1xuXHQvLyBQYXJzZSBgbmFtZWBkIHJ1bGUgYXQgaGVhZCBvZiBgc3RyZWFtYCAoYHN0cmluZ2Agb3IgYFRleHRTdHJlYW1gKS5cblx0Ly8gSGFuZGxlcyBvcHRpb25hbCBhbmQgcmVwZWF0aW5nIHJ1bGVzIGFzIHdlbGwgYXMgZWF0aW5nIHdoaXRlc3BhY2UuXG5cdC8vIFJldHVybnMgcmVzdWx0IG9mIHBhcnNlLlxuXHRwYXJzZShuYW1lLCBzdHJlYW0pIHtcblx0XHRpZiAodHlwZW9mIHN0cmVhbSA9PT0gXCJzdHJpbmdcIikgc3RyZWFtID0gbmV3IFRleHRTdHJlYW0oc3RyZWFtKTtcblx0XHRsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShuYW1lKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2VyLnBhcnNlKCR7bmFtZX0pOiBSdWxlIG5vdCBmb3VuZGApO1xuXHRcdHN0cmVhbSA9IHRoaXMuZWF0V2hpdGVzcGFjZShzdHJlYW0pO1xuXHRcdHJldHVybiBydWxlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdH1cblxuXHQvLyBFYXQgd2hpdGVzcGFjZSAoYWNjb3JkaW5nIHRvIGBydWxlcy53aGl0ZXNwYWNlYCkgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG5ldyBzdHJlYW0gaWYgd2UgbWF0Y2hlZCB3aGl0ZXNwYWNlLCBvdGhlcndpc2UgdGhlIHNhbWUgc3RyZWFtLlxuXHRlYXRXaGl0ZXNwYWNlKHN0cmVhbSkge1xuXHRcdGxldCByZXN1bHQgPSB0aGlzLnJ1bGVzLndoaXRlc3BhY2UucGFyc2UodGhpcywgc3RyZWFtKTtcblx0XHRpZiAoIXJlc3VsdCkgcmV0dXJuIHN0cmVhbTtcblx0XHRyZXR1cm4gc3RyZWFtLmFkdmFuY2VCeShyZXN1bHQubWF0Y2hlZC5sZW5ndGgpO1xuXHR9XG5cblx0Ly8gQWRkIGEgcnVsZSB0byBvdXIgbGlzdCBvZiBydWxlcyFcblx0Ly8gQ29udmVydHMgdG8gYGFsdGVybmF0aXZlc2Agb24gcmUtZGVmaW5pbmcgdGhlIHNhbWUgcnVsZS5cblx0YWRkUnVsZShuYW1lLCBydWxlKSB7XG5cdFx0bGV0IGV4aXN0aW5nID0gdGhpcy5ydWxlc1tuYW1lXTtcblx0XHRpZiAoZXhpc3RpbmcpIHtcblx0XHRcdGlmICghKGV4aXN0aW5nIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpKSB7XG5cdFx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBDb252ZXJ0aW5nIHJ1bGUgJyR7bmFtZX0nIHRvIGFsdGVybmF0aXZlc2ApO1xuXHRcdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZU5hbWU6IG5hbWUsIHJ1bGVzOiBbZXhpc3RpbmddIH0pO1xuXHRcdFx0XHQvLyBjb3B5IGFyZ3VtZW50IG5hbWUgb3ZlciAoPz8/KVxuXHRcdFx0XHRpZiAoZXhpc3RpbmcuYXJndW1lbnQpIHRoaXMucnVsZXNbbmFtZV0uYXJndW1lbnQgPSBleGlzdGluZy5hcmd1bWVudDtcblx0XHRcdH1cblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRpbmcgcnVsZSAnJHtydWxlLnJ1bGVOYW1lfScgdG8gJyR7bmFtZX0nOiBgLCBydWxlKTtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0uYWRkUnVsZShydWxlKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHQvLyBkb24ndCBvdmVycmlkZSBydWxlTmFtZVxuXHRcdFx0aWYgKCFydWxlLnJ1bGVOYW1lKSBydWxlLnJ1bGVOYW1lID0gbmFtZTtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBydWxlO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cbi8vXG4vLyAjIyBVdGlsaXR5IG1ldGhvZHNcbi8vXG5cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmBcblx0Ly9cdGluIGFycmF5IG9mIGB0b2tlbnNgIChzdHJpbmdzKS5cblx0Ly8gSWYgc3VjY2Vzc2Z1bCwgcmV0dXJucyBgeyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2UgfWBcblx0Ly8gVGhyb3dzIGlmIHVuc3VjZXNzZnVsLlxuXHRzdGF0aWMgZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIHN0YXJ0VG9rZW4sIGVuZFRva2VuLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGlmICh0b2tlbnNbc3RhcnRJbmRleF0gIT09IHN0YXJ0VG9rZW4pIHRocm93IG5ldyBTeW50YXhFcnJvcihgRXhwZWN0ZWQgJyR7c3RhcnRUb2tlbn0nIGF0IGluZGV4ICR7c3RhcnRJbmRleH0gb2YgdG9rZW5zYCk7XG5cdFx0bGV0IG5lc3RpbmcgPSAwO1xuXHRcdGxldCBuZXN0ZWQgPSBmYWxzZTtcblx0XHRmb3IgKGxldCBlbmRJbmRleCA9IHN0YXJ0SW5kZXggKyAxLCBsYXN0SW5kZXggPSB0b2tlbnMubGVuZ3RoOyBlbmRJbmRleCA8IGxhc3RJbmRleDsgZW5kSW5kZXgrKykge1xuXHRcdFx0bGV0IHRva2VuID0gdG9rZW5zW2VuZEluZGV4XTtcblx0XHRcdGlmICh0b2tlbiA9PT0gc3RhcnRUb2tlbikge1xuXHRcdFx0XHRuZXN0aW5nKys7XG5cdFx0XHRcdG5lc3RlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodG9rZW4gPT09IGVuZFRva2VuKSB7XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKVxuXHRcdFx0XHRcdHJldHVybiB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZTogdG9rZW5zLnNsaWNlKHN0YXJ0SW5kZXgrMSwgZW5kSW5kZXgpLCBuZXN0ZWQgfTtcblx0XHRcdFx0bmVzdGluZy0tO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENvdWxkbid0IGZpbmQgbWF0Y2hpbmcgJyR7ZW5kVG9rZW59J3Mgc3RhcnRpbmcgYXQgaXRlbSAke3N0YXJ0SW5kZXh9YCk7XG5cdH1cblxuXG5cdC8vIExpc3Qgb2Ygc3BlY2lhbCBjaGFyYWN0ZXJzIGluIHJlZ3VsYXIgZXhwcmVzc2lvbnMuXG5cdC8vIFVzZWQgdG8gZXNjYXBlIHRob3NlIGNoYXJzIHdoZW4gY3JlYXRpbmcgcmVndWxhciBleHByZXNzaW9ucyBmcm9tIHN0cmluZ3MuXG5cdHN0YXRpYyBSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTID0gKGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IGNoYXJzID0ge307XG5cdFx0XCJcXFxcL14kKis/LigpfHt9LFtdXCIuc3BsaXQoXCJcIikuZm9yRWFjaChjaGFyID0+IGNoYXJzW2NoYXJdID0gdHJ1ZSk7XG5cdFx0cmV0dXJuIGNoYXJzO1xuXHR9KSgpXG5cblx0Ly8gR2l2ZW4gYSBcIm5vcm1hbFwiIGBzdHJpbmdgLCBlc2NhcGUgYW55IHJlZ3VsYXIgZXhwcmVzc2lvbiBzcGVjaWFsIGNoYXJhY3RlcnNcblx0Ly9cdHNvIHdlIGNhbiBjcmVhdGUgYSBgbmV3IFJlZ0V4cCgpYC5cblx0Ly8gQWxzbyBjb252ZXJ0cyBhIHNpbmdsZSBzcGFjZSB0byBhcmJpdHJhcnkgc2V0IG9mIHNwYWNlcyB3aXRoIFwiXFxzK1wiXG5cdHN0YXRpYyBlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZykge1xuXHRcdHJldHVybiBzdHJpbmcuc3BsaXQoXCJcIikubWFwKGZ1bmN0aW9uIChjaGFyLCBpbmRleCwgbGlzdCkge1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBiYWNrc2xhc2hcblx0XHRcdGlmIChjaGFyID09PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiO1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBzcGFjZVxuXHRcdFx0aWYgKGNoYXIgPT09IFwiIFwiKSByZXR1cm4gXCJcXFxccytcIjtcblx0XHRcdC8vIElmIGEgc3BlY2lhbCBjaGFyIGFuZCBwcmV2aW91cyBjaGFyYWN0ZXIgd2FzIG5vdCBhbiBlc2NhcGUsIGVzY2FwZSB0aGUgcmVzdWx0LlxuXHRcdFx0aWYgKFBhcnNlci5SRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTW2NoYXJdICYmIGxpc3RbaW5kZXgtMV0gIT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCIrY2hhcjtcblx0XHRcdC8vIFRoaXMgY2hhciBzaG91bGQgYmUgZmluZSBieSBpdHNlbGYuXG5cdFx0XHRyZXR1cm4gY2hhcjtcblx0XHR9KS5qb2luKFwiXCIpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgbmV3IHJlZ3VsYXIgZXhwcmVzc2lvbiBmcm9tIGEgXCJub3JtYWxcIiBzdHJpbmcsIGVzY2FwaW5nIHNwZWNpYWwgY2hhcmFjdGVycyBhcyBuZWNlc3NhcnkuXG5cdHN0YXRpYyBSZWdFeHBGcm9tU3RyaW5nKHN0cmluZywgZmxhZ3MpIHtcblx0XHRyZXR1cm4gbmV3IFJlZ0V4cChQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpLCBmbGFncyk7XG5cdH1cblxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUGFyc2VyLmpzIiwiLy9cdCMgUGFyc2VyIFJ1bGVzXG4vL1x0UnVsZXMgY2FuIGJlIGFzIHNpbXBsZSBhcyBhIHN0cmluZyBgS2V5d29yZGAgb3IgYSBjb21wbGV4IHNlcXVlbmNlIG9mIChuZXN0ZWQpIHJ1bGVzLlxuLy9cbi8vXHRQYXJzZSBhIHJ1bGUgd2l0aCBgcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSlgLCB0aGlzIHdpbGwgZWl0aGVyOlxuLy9cdFx0LSByZXR1cm4gYHVuZGVmaW5lZGAgaWYgdGhlIHJ1bGUgZG9lc24ndCBtYXRjaCB0aGUgaGVhZCBvZiB0aGUgc3RyZWFtLCBvclxuLy9cdFx0LSByZXR1cm4gYSBDTE9ORSBvZiB0aGUgcnVsZSB3aXRoIGF0IGxlYXN0IHRoZSBmb2xsb3dpbmc6XG4vL1x0XHRcdC0gYHN0cmVhbWBcdFx0U3RyZWFtIHdoaWNoIHdhcyBtYXRjaGVkIHdpdGggYHN0YXJ0SW5kZXhgIGF0IHRoZSBzdGFydCBvZiB0aGUgbWF0Y2hcbi8vXHRcdFx0LSBgZW5kSW5kZXhgXHROb24taW5jbHVzaXZlIGVuZCBpbmRleCBpbiBzdHJlYW0gd2hlcmUgbWF0Y2ggZW5kcy5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLmdhdGhlckFyZ3VtZW50cygpYFx0XHRSZXR1cm4gbWF0Y2hlZCBhcmd1bWVudHMgaW4gYSBmb3JtYXQgc3VpdGFibGUgdG8gZG86XG4vL1x0XHQtIGBydWxlLnRvU291cmNlKClgXHRcdFx0XHRSZXR1cm4gamF2YXNjcmlwdCBzb3VyY2UgdG8gaW50ZXJwcmV0IHRoZSBydWxlLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5cblxuLy9UT0RPOiBtYWtlIGdhdGhlckFyZ3VtZW50cygpIHN0YXRpYyBhbmQgY2FsbCBvbiB0aGlzXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKHRoaXMuY29uc3RydWN0b3IgIT09IFJ1bGUgfHwgIXRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLmhhc093blByb3BlcnR5KFwiY29uc3RydWN0b3JcIikpIHtcbi8vY29uc29sZS53YXJuKFwibm90IHJ1bGVcIiwgdGhpcyk7XG5cdFx0fVxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0bGV0IGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCBwcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuLy9cbi8vXHRQYXJzaW5nIHByaW1pdGl2ZXMgLS0geW91IE1VU1QgaW1wbGVtZW50IHRoZXNlIGluIHlvdXIgc3ViY2xhc3NlcyFcbi8vXG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHJ1bGUgaW4gdGhlIGBzdHJlYW1gLlxuXHQvLyBSZXR1cm5zIHJlc3VsdHMgb2YgdGhlIHBhcnNlIG9yIGB1bmRlZmluZWRgLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBJcyB0aGlzIHJ1bGUgZGV0ZXJtaW5pc3RpYywgZWc6IGNhbiBpdCBiZSBxdWlja2x5IGFuZCB1bmFtYmlndW91c2x5IHNhdGlzZmllZD9cblx0Ly8gUmV0dXJuaW5nIGB0cnVlYCBjYW4gc3BlZWQgdXAgc2VxdWVuY2UgcHJvY2Vzc2luZyxcblx0Ly9cdGJ1dCBpZiB5b3UncmUgcmVhbGx5IG5vdCBzdXJlLCByZXR1cm4gYHVuZGVmaW5lZGAuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cdGdldCBfYXJnKCkgeyByZXR1cm4gdGhpcy5hcmd1bWVudCB8fCB0aGlzLnJ1bGVOYW1lIHx8IHRoaXMuY29uc3RydWN0b3IubmFtZSB9XG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gTm90ZSB0aGF0IHdlIGRlZmluZSBgZ2F0aGVyQXJndW1lbnRzKClgIHN0YXRpY2FsbHkgb24gZWFjaCBzdWJjbGFzc1xuXHQvL1x0YW5kIHRoZW4gaW5zdGFuY2UgbWV0aG9kIGNhbGxzIGl0IG9uIGl0c2VsZi5cblx0c3RhdGljIGdhdGhlckFyZ3VtZW50cyhydWxlKSB7XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblx0Z2F0aGVyQXJndW1lbnRzKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLmdhdGhlckFyZ3VtZW50cyh0aGlzKTtcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQ7XG5cdH1cblxuLy9cbi8vICMjIGdyb3VwOiByZWZsZWN0aW9uXG4vL1xuXHRnZXQgcnVsZVR5cGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0fVxufVxuXG5cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vXG4vLyBOT1RFXHRUbyBtYWtlIHRoaXMgbW9yZSBnZW5lcmFsbHkgYXBwbGljYWJsZSwgZG8gTk9UIHN0YXJ0IHRoZSBwYXR0ZXJuIHdpdGggYSBgXmAuXG4vL1x0XHRXZSdsbCBhdXRvbWF0aWNhbGx5IG1ha2UgYSBjb3B5IG9mIHRoZSBSZWdFeHAgd2l0aCB0aGUgc3RhcnQgcG9pbnQgYXR0YWNoZWRcbi8vXHRcdGFuZCB1c2UgdGhhdCBhcyBhcHByb3ByaWF0ZS5cbi8vXG4vL1x0XHRUaGlzIHdheSB3ZSBjYW4gcmUtdXNlIHRoZSByZWdleCB0byBjaGVjayBmb3IgYSBtYXRjaCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBzdHJlYW0uLi5cbi8vXG4vLyBZb3UgY2FuIG9wdGlvbmFsbHkgc3BlY2lmeSBhIGBydWxlLmJsYWNrbGlzdGAsIGEgc2V0IG9mIG1hdGNoZXMgd2hpY2ggd2lsbCBzcGVjaWZpY2FsbHkgTk9UIHdvcmssXG4vL1x0ZWcgZm9yIGBpZGVudGlmaWVyLlxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHBhdHRlcm5gIGlzIHJlcXVpcmVkXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5QYXR0ZXJuKCk6IFlvdSBtdXN0IHBhc3MgYSBgcGF0dGVybmAgcGFyYW1ldGVyXCIpO1xuXG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cblx0XHQvLyBDcmVhdGUgYSBgc3RhcnRQYXR0ZXJuYCB0byBtYXRjaCBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJvbmdcblx0XHQvLyBDcmVhdGUgbm9uLWVudW1lcmFibHkuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic3RhcnRQYXR0ZXJuXCIsIHsgdmFsdWU6IG5ldyBSZWdFeHAoXCJeXCIgKyB0aGlzLnBhdHRlcm4uc291cmNlKSB9KTtcblx0fVxuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBwYXR0ZXJuIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5zdGFydFBhdHRlcm4pO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBiYWlsIGlmIHByZXNlbnQgaW4gYmxhY2tsaXN0XG5cdFx0bGV0IG1hdGNoZWQgPSBtYXRjaFswXTtcblx0XHRpZiAodGhpcy5ibGFja2xpc3QgJiYgdGhpcy5ibGFja2xpc3RbbWF0Y2hlZF0pIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiBtYXRjaGVkLFxuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXggKyBtYXRjaGVkLmxlbmd0aCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUGF0dGVybnMgYXJlIEFMV0FZUyBkZXRlcm1pbmlzdGljLlxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGFkZFRvQmxhY2tsaXN0KC4uLndvcmRzKSB7XG5cdFx0aWYgKCF0aGlzLmJsYWNrbGlzdCkgdGhpcy5ibGFja2xpc3QgPSB7fTtcblx0XHR3b3Jkcy5mb3JFYWNoKHdvcmQgPT4gdGhpcy5ibGFja2xpc3Rbd29yZF0gPSB0cnVlKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm4uc291cmNlO1xuXHR9XG59XG5cbi8vIFJ1bGUgZm9yIGxpdGVyYWwgc3RyaW5nIHZhbHVlLCB3aGljaCBpbmNsdWRlIHB1bmN0dWF0aW9uIHN1Y2ggYXMgYChgIGV0Yy5cbi8vIGBTeW1ib2xgcyBhcmUgZGlmZmVyZW50IGZyb20gYEtleXdvcmRzYCBpbiB0aGF0IHRoZXkgZG8gbm90IHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5LlxuLy9UT0RPOiByZW5hbWUgYFN5bWJvbGA/Pz9cblJ1bGUuU3ltYm9sID0gY2xhc3MgU3ltYm9sIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLlN5bWJvbCgpOiBFeHBlY3RlZCBzdHJpbmcgcHJvcGVydHlcIik7XG5cblx0XHQvLyBjb252ZXJ0IHN0cmluZyB0byBwYXR0ZXJuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdHByb3BlcnRpZXMucGF0dGVybiA9IFBhcnNlci5SZWdFeHBGcm9tU3RyaW5nKHByb3BlcnRpZXMuc3RyaW5nKTtcbi8vY29uc29sZS5pbmZvKHByb3BlcnRpZXMuc3RyaW5nLCBwcm9wZXJ0aWVzLnBhdHRlcm4pO1xuXHRcdH1cblxuLy9cdFx0Y29uc29sZS5pbmZvKFwiY3JlYXRpbmcgc3RyaW5nXCIsIHByb3BlcnRpZXMpO1xuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHR9XG5cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG4vLyBNZXJnZSB0d28gU3ltYm9sIHJ1bGVzIHRvZ2V0aGVyLCByZXR1cm5pbmcgYSBuZXcgcnVsZSB0aGF0IG1hdGNoZXMgYm90aC5cblJ1bGUubWVyZ2VTeW1ib2xzID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuXHRyZXR1cm4gbmV3IFJ1bGUuU3ltYm9sKHsgc3RyaW5nOiBmaXJzdC5zdHJpbmcgKyBzZWNvbmQuc3RyaW5nIH0pO1xufVxuXG4vLyBLZXl3b3JkIHBhdHRlcm4uXG4vLyBQcm9wZXJ0aWVzOlxuLy9cdC0gYHJ1bGUuc3RyaW5nYCBcdChyZXF1aXJlZCkgXHRLZXl3b3JkIHN0cmluZyB0byBtYXRjaC5cbi8vXHQtIGBydWxlLnBhdHRlcm5gXHQob3B0aW9uYWwpIFx0UmVnRXhwIGZvciB0aGUgbWF0Y2guXG4vL1x0XHRcdFx0XHRcdFx0XHRcdFdlJ2xsIGNyZWF0ZSBvbmUgZnJvbSBgc3RyaW5nYCBpZiBuZWNlc3NhcnkuXG4vL1x0XHRcdFx0XHRcdFx0XHRcdE5PVEU6IGRvIE5PVCBzdGFydCB0aGUgYHBhdHRlcm5gIHdpdGggYF5gLlxuUnVsZS5LZXl3b3JkID0gY2xhc3MgS2V5d29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgc3RyaW5nYCBpcyByZXF1aWVkLlxuXHRcdGlmICghcHJvcGVydGllcy5zdHJpbmcpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5LZXl3b3JkKCk6IEV4cGVjdGVkIHN0cmluZyBwcm9wZXJ0eVwiKTtcblxuXHRcdC8vIGRlcml2ZSBgcGF0dGVybmAgaWYgbmVjZXNzYXJ5LlxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB7XG5cdFx0XHQvLyBlbmZvcmNlIHdvcmQgYm91bmRhcmllcyBhbmQgYWxsb3cgYXJiaXRyYXJ5IHNwYWNlIGJldHdlZW4gd29yZHNcblx0XHRcdGxldCBwYXR0ZXJuU3RyaW5nID0gUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMocHJvcGVydGllcy5zdHJpbmcpO1xuXHRcdFx0cHJvcGVydGllcy5wYXR0ZXJuID0gbmV3IFJlZ0V4cChcIlxcXFxiXCIgKyBwYXR0ZXJuU3RyaW5nICsgXCJcXFxcYlwiKTtcblx0XHR9XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cbi8vIE1lcmdlIHR3byBLZXl3b3JkIHJ1bGVzIHRvZ2V0aGVyLCBhZGRpbmcgdGhlIHNlY29uZCB0byB0aGUgZmlyc3QuXG5SdWxlLm1lcmdlS2V5d29yZHMgPSBmdW5jdGlvbihmaXJzdCwgc2Vjb25kKSB7XG5cdHJldHVybiBuZXcgUnVsZS5LZXl3b3JkKHsgc3RyaW5nOiBmaXJzdC5zdHJpbmcgKyBcIiBcIiArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cblxuLy8gU3VicnVsZSAtLSBuYW1lIG9mIGFub3RoZXIgcnVsZSB0byBiZSBjYWxsZWQuXG4vLyBgcnVsZS5ydWxlYCBpcyB0aGUgbmFtZSBvZiB0aGUgcnVsZSBpbiBgcGFyc2VyLnJ1bGVzYC5cblJ1bGUuU3VicnVsZSA9IGNsYXNzIFN1YnJ1bGUgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlKHRoaXMucnVsZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEF0dGVtcHRpbmcgdG8gcGFyc2UgdW5rbm93biBydWxlICcke3RoaXMubmFtZX0nYCwgdGhpcyk7XG5cdFx0bGV0IHJlc3VsdCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIHJlc3VsdC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGUodGhpcy5ydWxlKTtcblx0XHRpZiAoIXJ1bGUpIHJldHVybiBmYWxzZTtcblx0XHRyZXR1cm4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHtcblxuXHQvLyBJcyB0aGlzIGRldGVybWluaXN0aWMsIGVnOiBhcmUgb3VyIHN1YnJ1bGVzIHVuYW1iaWdvdXNseSBkZXRlcm1pbmFibGU/XG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzLmV2ZXJ5KHJ1bGUgPT4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pKTtcblx0fVxufVxuXG5cbi8vIFNlcXVlbmNlIG9mIHJ1bGVzIHRvIG1hdGNoIChhdXRvLWV4Y2x1ZGluZyB3aGl0ZXNwYWNlKS5cblJ1bGUuU2VxdWVuY2UgPSBjbGFzcyBTZXF1ZW5jZSBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcmVzdWx0cyA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IHJlc3VsdCA9IHJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghcmVzdWx0ICYmICFydWxlLm9wdGlvbmFsKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKHJlc3VsdCkge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2gocmVzdWx0KTtcblx0XHRcdFx0bmV4dCA9IHJlc3VsdC5uZXh0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGlmIHdlIGdldCBoZXJlLCB3ZSBtYXRjaGVkIGFsbCB0aGUgcnVsZXMhXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG4vL1RPRE9DXG5cdC8vIEdhdGhlciBhcmd1bWVudHMgZnJvbSBvdXIgcGFyc2VkIGByZXN1bHRzYCBhcnJheS5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGB2YWx1ZXNgIGFycmF5IGluZGV4ZWQgYnlcblx0Ly9cdFx0LSBgcmVzdWx0cy5hcmd1bWVudGA6XHRcdGFyZ3VtZW50IHNldCB3aGVuIHJ1bGUgd2FzIGRlY2xhcmVkLCBlZzogYHt2YWx1ZTpsaXRlcmFsfWAgPT4gYHZhbHVlYFxuXHQvL1x0XHQtIGByZXN1bHRzLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIHJ1bGUgdHlwZTpcdFx0XHRcdG5hbWUgb2YgdGhlIHJ1bGUgdHlwZVxuXHRzdGF0aWMgZ2F0aGVyQXJndW1lbnRzKHNlcXVlbmNlKSB7XG5cdFx0aWYgKCFzZXF1ZW5jZS5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCBhcmdzID0ge307XG5cdFx0Zm9yIChsZXQgbmV4dCBvZiBzZXF1ZW5jZS5yZXN1bHRzKSB7XG5cdFx0XHRsZXQgYXJnTmFtZSA9IG5leHQuX2FyZztcblx0XHRcdC8vIEZvciBuZXN0ZWQgcnVsZXMsIHJlY3Vyc2UgdG8gZ2V0IHRoZWlyIGFyZ3VtZW50c1xuXHRcdFx0bGV0IHJlc3VsdCA9IG5leHQuZ2F0aGVyQXJndW1lbnRzKCk7XG5cblx0XHRcdC8vIElmIGFyZyBhbHJlYWR5IGV4aXN0cywgY29udmVydCB0byBhbiBhcnJheVxuXHRcdFx0aWYgKGFyZ05hbWUgaW4gYXJncykge1xuXHRcdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkoYXJnc1thcmdOYW1lXSkpIGFyZ3NbYXJnTmFtZV0gPSBbYXJnc1thcmdOYW1lXV07XG5cdFx0XHRcdGFyZ3NbYXJnTmFtZV0ucHVzaChyZXN1bHQpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGFyZ3NbYXJnTmFtZV0gPSByZXN1bHQ7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBhcmdzO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBleHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIFN0YXRlbWVudHMgdGFrZSB1cCB0aGUgZW50aXJlIGxpbmUuXG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXgsIG1hdGNoaW5nIG9uZSBvZiBhIG51bWJlciBvZiBkaWZmZXJlbnQgcnVsZXMuXG4vLyBUaGUgcmVzdWx0IG9mIGEgcGFyc2UgaXMgdGhlIGxvbmdlc3QgcnVsZSB0aGF0IGFjdHVhbGx5IG1hdGNoZWQuXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBGaW5kIHRoZSBMT05HRVNUIG1hdGNoXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IGJlc3RNYXRjaDtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKCFtYXRjaCkgY29udGludWU7XG5cblx0XHRcdC8vIHRha2UgdGhlIGxvbmdlc3QgbWF0Y2hcblx0XHRcdGlmICghYmVzdE1hdGNoIHx8IG1hdGNoLmVuZEluZGV4ID4gYmVzdE1hdGNoLmVuZEluZGV4KVxuXHRcdFx0XHRiZXN0TWF0Y2ggPSBtYXRjaDtcblx0XHR9XG5cdFx0aWYgKCFiZXN0TWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBhc3NpZ24gYGFyZ05hbWVgIG9yIGBydWxlTmFtZWAgZm9yIGBnYXRoZXJBcmd1bWVudHMoKWBcblx0XHRpZiAodGhpcy5hcmd1bWVudCkgYmVzdE1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRlbHNlIGlmICh0aGlzLnJ1bGVOYW1lKSBiZXN0TWF0Y2gucnVsZU5hbWUgPSB0aGlzLnJ1bGVOYW1lO1xuLy9UT0RPOiBvdGhlciB0aGluZ3MgdG8gY29weSBoZXJlPz8/XG5cdFx0cmV0dXJuIGJlc3RNYXRjaDtcblx0fVxuXG5cdGFkZFJ1bGUocnVsZSkge1xuXHRcdHRoaXMucnVsZXMucHVzaChydWxlKTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnRvU291cmNlKCk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCgke3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZXMuam9pbihcInxcIil9KSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBSZXBlYXRpbmcgcnVsZS5cbi8vXHRgdGhpcy5ydWxlYCBpcyB0aGUgcnVsZSB0aGF0IHJlcGVhdHMuXG4vL1xuLy8gQWZ0ZXIgbWF0Y2hpbmc6XG4vL1x0YHRoaXMucmVzdWx0c2AgaXMgYXJyYXkgb2YgcmVzdWx0cyBvZiBtYXRjaGVzLlxuLy9cbi8vXHRBdXRvbWF0aWNhbGx5IGNvbnN1bWVzIHdoaXRlc3BhY2UgYmVmb3JlIHJ1bGVzLlxuLy9cdElmIGRvZXNuJ3QgbWF0Y2ggYXQgbGVhc3Qgb25lLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuUnVsZS5SZXBlYXQgPSBjbGFzcyBSZXBlYXQgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IG5leHQgPSBzdHJlYW07XG5cdFx0bGV0IHJlc3VsdHMgPSBbXTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMucnVsZS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFyZXN1bHQpIGJyZWFrO1xuXG5cdFx0XHRyZXN1bHRzLnB1c2gocmVzdWx0KTtcblx0XHRcdG5leHQgPSByZXN1bHQubmV4dCgpO1xuXHRcdH1cblxuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdHJlc3VsdHMsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgZ2F0aGVyQXJndW1lbnRzKHJlcGVhdCkge1xuXHRcdGlmICghcmVwZWF0LnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHJlcGVhdC5yZXN1bHRzLm1hcCggcmVzdWx0ID0+IHJlc3VsdC5nYXRoZXJBcmd1bWVudHMoKSApO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0dGhyb3cgXCJEb24ndCB1bmRlcnN0YW5kIGhvdyB0byBzb3VyY2UgUnVsZS5SZXBlYXQhXCI7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRjb25zdCBydWxlID0gKHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UgfHwgdGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHRoaXMucnVsZS5zdHJpbmcuaW5jbHVkZXMoXCIgXCIpXG5cdFx0XHRcdCAgID8gYCgke3RoaXMucnVsZX0pYFxuXHRcdFx0XHQgICA6IGAke3RoaXMucnVsZX1gXG5cdFx0XHRcdCk7XG5cdFx0cmV0dXJuIGAke3J1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe251bWJlcn0sXWAgdG8gbWF0Y2ggYDEsMiwzYFxuLy9cdGBydWxlLml0ZW1gIGlzIHRoZSBydWxlIGZvciBlYWNoIGl0ZW0sXG4vL1x0YHJ1bGUuZGVsaW1pdGVyYCBpcyB0aGUgZGVsaW1pdGVyIGJldHdlZW4gZWFjaCBpdGVtLlxuLy8gXHRgcnVsZS5yZXN1bHRzYCBpbiB0aGUgb3V0cHV0IGlzIHRoZSBsaXN0IG9mIHZhbHVlcy5cbi8vXG4vL1xuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYSBMaXN0IHJ1bGUgd2lsbCBOT1QgcmVwZWF0ICg/Pz8/KVxuUnVsZS5MaXN0ID0gY2xhc3MgTGlzdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdC8vIGVuc3VyZSBpdGVtIGFuZCBkZWxpbWl0ZXIgYXJlIG9wdGlvbmFsIHNvIHdlIGRvbid0IGJhcmYgaW4gYHBhcnNlUnVsZWBcblx0XHR0aGlzLml0ZW0ub3B0aW9uYWwgPSB0cnVlO1xuXHRcdHRoaXMuZGVsaW1pdGVyLm9wdGlvbmFsID0gdHJ1ZTtcblxuXHRcdGxldCByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBuZXh0IGl0ZW0sIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgaXRlbSA9IHRoaXMuaXRlbS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFpdGVtKSBicmVhaztcbi8vY29uc29sZS5sb2coaXRlbSk7XG5cdFx0XHRyZXN1bHRzLnB1c2goaXRlbSk7XG5cdFx0XHRuZXh0ID0gaXRlbS5uZXh0KCk7XG5cblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBkZWxpbWl0ZXIsIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgZGVsaW1pdGVyID0gdGhpcy5kZWxpbWl0ZXIucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghZGVsaW1pdGVyKSBicmVhaztcblx0XHRcdG5leHQgPSBkZWxpbWl0ZXIubmV4dCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdHJlc3VsdHMsXG5cdFx0XHRzdGFydEluZGV4OiByZXN1bHRzWzBdID8gcmVzdWx0c1swXS5zdGFydEluZGV4IDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gbWF0Y2hlZCBpdGVtIGJ5IGluZGV4XG5cdGdldEl0ZW0oaW5kZXgpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzW2luZGV4XTtcblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1x0XHQvLyBUT0RPOiB0aHJvdz8/P1xuXHRcdGxldCByZXN1bHRzID0gdGhpcy5yZXN1bHRzLm1hcCggcmVzdWx0ID0+IHJlc3VsdC50b1NvdXJjZSgpICkuam9pbihcIiwgXCIpO1xuXHRcdHJldHVybiBgWyR7cmVzdWx0c31dYDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgWyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5pdGVtfSAke3RoaXMuZGVsaW1pdGVyfV0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZS5qcyIsImltcG9ydCB7IGRlZmluZU1lbW9pemVkIH0gZnJvbSBcIi4vbWVtb2l6ZS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gcmUtZXhwb3J0IFJ1bGUgZm9yIHRlc3RpbmdcbmV4cG9ydCBkZWZhdWx0IFJ1bGU7XG5cbi8vXG4vL1x0IyBQYXJzaW5nIGBydWxlU3ludGF4YCB0byBjcmVhdGUgcnVsZXMgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUT0RPOlx0UHVsbCBgcGFyc2VSdWxlU3ludGF4YCBzdHVmZiBvdXQgaW50byBzZXBhcmF0ZSBtb2R1bGU/XG4vLyBUT0RPOlx0QmV0dGVyIG5hbWUgZm9yIGBydWxlU3ludGF4YFxuLy8gVE9ETzpcdFVzZSBrZXl3b3JkcyBpbiBzeW50YXggdG8gbWFrZSBhIHF1aWNrIHJlZ2V4LWJhc2VkIGB0ZXN0YCBmdW5jdGlvbiBmb3IgdGhlIGVudGlyZSBydWxlXG5PYmplY3QuYXNzaWduKFJ1bGUsIHtcblxuLy9cbi8vICMjIGdyb3VwOiBwYXJzaW5nIHN5bnRheFxuLy9cblxuLy8gVE9ETzogY29udmVydCB0byBUZXh0U3RyZWFtIHBhdHRlcm4gYWxhIG5vcm1hbCBwYXJzZXIgb25jZSB0aGF0IHNldHRsZXMgZG93bj8/P1xuXHRwYXJzZVJ1bGVTeW50YXgoc3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIFtdKTtcblxuXHRcdGxldCBydWxlO1xuXHRcdC8vIElmIHdlIG9ubHkgZ290IG9uZSB0aGluZywgcmV0dXJuIHRoYXQgYXMgdGhlIHJlc3VsdFxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSBydWxlc1swXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFNlcXVlbmNlQ29uc3RydWN0b3IoeyBydWxlcyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fSxcblxuXHR0b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KSB7XG5cdFx0Y29uc3QgU1lOVEFYX0VYUFJFU1NJT04gPSAvKD86W1xcd1xcLSFdK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHR2YXIgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IGxhc3RJbmRleCA9IHN5bnRheFN0cmVhbS5sZW5ndGg7XG5cdFx0d2hpbGUgKHN0YXJ0SW5kZXggPCBsYXN0SW5kZXgpIHtcblx0XHRcdGxldCBbIHJ1bGUsIGVuZEluZGV4IF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGlmIChydWxlKSB7XG5cdFx0XHRcdHZhciBsYXN0ID0gcnVsZXNbcnVsZXMubGVuZ3RoLTFdO1xuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYFN0cmluZ2AgYW5kIGxhc3Qgd2FzIGEgYFN0cmluZ2AsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5TeW1ib2wpIHtcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuXHRcdFx0XHRcdC8vIGFuZCByZXBsYWNlIHdpdGggYSBydWxlIHRoYXQgbWVyZ2VzIHRoZSBrZXl3b3Jkc1xuXHRcdFx0XHRcdHJ1bGUgPSBSdWxlLm1lcmdlU3ltYm9scyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYEtleXdvcmRgIGFuZCBsYXN0IHdhcyBhbHNvIGEgYEtleXdvcmRgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRlbHNlIGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG5cdFx0XHRcdFx0cnVsZXMucG9wKCk7XG5cdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG5cdFx0XHRcdFx0cnVsZSA9IFJ1bGUubWVyZ2VLZXl3b3JkcyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRydWxlcy5wdXNoKHJ1bGUpO1xuXHRcdFx0fVxuXHRcdFx0c3RhcnRJbmRleCA9IGVuZEluZGV4ICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHZhciBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdC8vIGlmIHdlIGdvdCBhIFwiXFxcXFwiICh3aGljaCBhbHNvIGhhcyB0byBnbyBpbnRvIHRoZSBzb3VyY2Ugc3RyaW5nIGFzIFwiXFxcXFwiKVxuXHRcdC8vIHRyZWF0IHRoZSBuZXh0IHRva2VuIGFzIGEgbGl0ZXJhbCBzdHJpbmcgcmF0aGVyIHRoYW4gYXMgYSBzcGVjaWFsIGNoYXJhY3Rlci5cblx0XHRpZiAoc3ludGF4VG9rZW4gPT09IFwiXFxcXFwiKSB7XG5cdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggKyAxKTtcblx0XHR9XG5cblx0XHRzd2l0Y2ggKHN5bnRheFRva2VuKSB7XG5cdFx0XHRjYXNlIFwie1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIipcIjpcblx0XHRcdGNhc2UgXCIrXCI6XG5cdFx0XHRjYXNlIFwiP1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblxuXHRcdFx0Ly8gdGhlIGZvbGxvd2luZyBzaG91bGQgQUxXQVlTIGJlIGNvbnN1bWVkIGJ5IHRoZSBhYm92ZVxuXHRcdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGNhc2UgXCIpXCI6XG5cdFx0XHRjYXNlIFwiXVwiOlxuXHRcdFx0Y2FzZSBcInxcIjpcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7c3ludGF4VG9rZW59IGZvdW5kIGFzIGl0ZW0gJHtzdGFydEluZGV4fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdLCBydWxlO1xuXHRcdC8vIElmIGxldHRlcnMgb25seSwgbWF0Y2ggYXMgYSBLZXl3b3JkIChzbyB3ZSByZXF1aXJlIGEgd29yZCBib3VuZGFyeSBhZnRlciB0aGUgc3RyaW5nKS5cblx0XHRpZiAoc3RyaW5nLm1hdGNoKC9bQS1aYS16XSsvKSkge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLktleXdvcmQoeyBzdHJpbmcgfSk7XG5cdFx0fVxuXHRcdC8vIE90aGVyd2lzZSBtYXRjaCBhcyBhIFN0cmluZywgd2hpY2ggZG9lc24ndCByZXF1aXJlIG5vbi13b3JkIGNoYXJzIGFmdGVyIHRoZSB0ZXh0LlxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlN5bWJvbCh7IHN0cmluZzogc3RyaW5nIH0pO1xuXHRcdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRcdGlmIChzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIikpIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIGxlYWRpbmcgc2xhc2ggaW4gbWF0Y2ggc3RyaW5nLi4uXG5cdFx0XHRcdHJ1bGUuc3RyaW5nID0gcnVsZS5zdHJpbmcuc3Vic3RyKDEpO1xuXHRcdFx0XHQvLyBidXQgbGVhdmUgaXQgaW4gdG9TdHJpbmdcblx0XHRcdFx0cnVsZS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnRJbmRleCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdC8vIE5PVEU6IG5lc3RlZCBwYXJlbnMgbWF5IG5vdCBoYXZlIGFsdGVybmF0aXZlcy4uLiA6LSggICBgKGF8KGJ8YykpYCB3b24ndCB3b3JrPz8/XG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiKFwiLCBcIilcIiwgc3RhcnRJbmRleCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0Ly8gc3BsaXQgaW50byBncm91cHMsIGluY2x1ZGluZyBuZXN0ZWQgcGFyZW5zXG5cdFx0bGV0IGFsdGVybmF0aXZlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0aXZlcyhzbGljZSlcblx0XHRcdC5tYXAoZnVuY3Rpb24oZ3JvdXApIHtcblx0XHRcdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoZ3JvdXAsIFtdKTtcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHNbMF07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSdWxlLlNlcXVlbmNlKHsgcnVsZXM6IHJlc3VsdHMgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0bGV0IHJ1bGUgPSBhbHRlcm5hdGl2ZXMubGVuZ3RoID09PSAxID8gYWx0ZXJuYXRpdmVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0aXZlcyB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXG5cdFx0ZnVuY3Rpb24gZ3JvdXBBbHRlcm5hdGl2ZXModG9rZW5zKSB7XG5cdFx0XHR2YXIgYWx0ZXJuYXRpdmVzID0gW107XG5cdFx0XHR2YXIgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XHRjdXJyZW50ID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaGFuZGxlIG5lc3RlZCBwYXJlbnNcblx0XHRcdFx0ZWxzZSBpZiAodG9rZW4gPT09IFwiKFwiKSB7XG5cdFx0XHRcdFx0bGV0IHsgZW5kSW5kZXggfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHRva2VucywgXCIoXCIsIFwiKVwiLCBpKTtcblx0XHRcdFx0XHRjdXJyZW50ID0gY3VycmVudC5jb25jYXQodG9rZW5zLnNsaWNlKGksIGVuZEluZGV4ICsgMSkpO1xuXHRcdFx0XHRcdGkgPSBlbmRJbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdXJyZW50LnB1c2godG9rZW4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoY3VycmVudC5sZW5ndGgpIGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0cmV0dXJuIGFsdGVybmF0aXZlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdHZhciBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblxuXHRcdHZhciBwYXJhbXMgPSB7IHJ1bGU6IG1hdGNoLnNsaWNlWzBdIH07XG5cblx0XHQvLyBzZWUgaWYgdGhlcmUncyBhIGBub3RgIHJ1bGUgaW4gdGhlcmVcblx0XHRsZXQgYmFuZ1Bvc2l0aW9uID0gcGFyYW1zLnJ1bGUuaW5kZXhPZihcIiFcIik7XG5cdFx0aWYgKGJhbmdQb3NpdGlvbiAhPT0gLTEpIHtcblx0XHRcdHBhcmFtcy5ub3QgPSBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSk7IC8vWyBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSkgXTtcblx0XHRcdHBhcmFtcy5ydWxlID0gcGFyYW1zLnJ1bGUuc3Vic3RyKDAsIGJhbmdQb3NpdGlvbik7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5TdWJydWxlKHBhcmFtcyk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgbWF0Y2guZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBsaXN0IGV4cHJlc3Npb24gYFs8aXRlbT48ZGVsaW1pdGVyPl1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIltcIiwgXCJdXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHRpZiAocmVzdWx0cy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCBzdHVmZiBhdCBlbmQgb2YgbGlzdDogWyR7c2xpY2Uuam9pbihcIiBcIil9XWApO1xuXHRcdH1cblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLkxpc3QoKTtcblx0XHRydWxlLml0ZW0gPSByZXN1bHRzWzBdXG5cdFx0cnVsZS5kZWxpbWl0ZXIgPSByZXN1bHRzWzFdXG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxufSk7XG5cblxuXG4vLyAjIyAgQWRkIG1ldGhvZHMgdG8gUGFyc2VyIHRvIGRlZmluZSBydWxlcyB1c2luZyB0aGUgYWJvdmUgc3ludGF4LlxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUGFyc2VyLnByb3RvdHlwZSwge1xuXG5cdC8vIFBhcnNlIGEgYHJ1bGVTeW50YXhgIHJ1bGUgYW5kIGFkZCBpdCB0byBvdXIgbGlzdCBvZiBydWxlcy5cblx0Ly8gUmV0dXJucyB0aGUgbmV3IHJ1bGUuXG5cdC8vIExvZ3MgcGFyc2luZyBlcnJvcnMgYnV0IGFsbG93cyB0aGluZ3MgdG8gY29udGludWUuXG5cdGFkZFN5bnRheDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHR0cnkge1xuXHRcdFx0bGV0IHJ1bGUgPSBSdWxlLnBhcnNlUnVsZVN5bnRheChydWxlU3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yKTtcblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0fVxuXHR9fSxcblxuXHRhZGRTdGF0ZW1lbnQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFJ1bGUuU3RhdGVtZW50KTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkRXhwcmVzc2lvbjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgUnVsZS5FeHByZXNzaW9uKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcnVsZSk7XG5cdH19LFxuXG5cdC8vIEFkZCBpbmZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgb3IgYlwiLlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZEluZml4T3BlcmF0b3I6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSkge1xuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRJbmZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50b0pTKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIGluZml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYClcblx0XHRcdH1cblx0XHRcdC8vIGNsZWFyIGxpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGZvciBnZXR0ZXIgYmVsb3dcblx0XHRcdGRlbGV0ZSB0aGlzLl9faW5maXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwiaW5maXhfb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIGluZml4IG9wZXJhdG9ycyBhcyBzdHJpbmdzLlxuXHQvLyBSZS1tZW1vaXplZCBhZnRlciBgYWRkSW5maXhPcGVyYXRvcmAgYWJvdmUuXG5cdGluZml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9faW5maXhPcGVyYXRvcnNcIixcblx0XHRmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucnVsZXNbXCJpbmZpeF9vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0ICYmIHRoaXMucnVsZXNbXCJpbmZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZylcblx0fSksXG5cblx0Ly8gQWRkIHBvc3RmaXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIGlzIGRlZmluZWRcIlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZFBvc3RmaXhPcGVyYXRvcjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKSB7XG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFBvc3RmaXhPcGVyYXRvcihuYW1lLCBzeW50YXgsIHByb3BlcnRpZXMpKTtcblx0XHR9XG5cblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudG9KUykge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBwb3N0Zml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBjbGVhciBsaXN0IG9mIGluZml4IG9wZXJhdG9ycyBmb3IgZ2V0dGVyIGJlbG93XG5cdFx0XHRkZWxldGUgdGhpcy5fX3Bvc3RmaXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwicG9zdGZpeF9vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH19LFxuXG5cdC8vIExpc3Qgb2YgcG9zdGZpeCBvcGVyYXRvcnMgYXMgc3RyaW5ncy5cblx0Ly8gUmUtbWVtb2l6ZWQgYWZ0ZXIgYGFkZEluZml4T3BlcmF0b3JgIGFib3ZlLlxuXHRwb3N0Zml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9fcG9zZml4T3BlcmF0b3JzXCIsXG5cdFx0ZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXMucnVsZXNbXCJwb3N0Zml4X29wZXJhdG9yXCJdXG5cdFx0XHRcdFx0XHQmJiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZyk7XG5cdH0pXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlU3ludGF4LmpzIiwiLy9cbi8vXHQjIENvcmUgYHJ1bGVzYCAtLSBzaW1wbGUgZGF0YXR5cGVzLCBldGMuXG4vL1xuLy8gTk9URTogbWFueSBvZiB0aGUgYmVsb3cgYXJlIGNyZWF0ZWQgYXMgY3VzdG9tIFBhdHRlcm4gc3ViY2xhc3NlcyBmb3IgZGVidWdnaW5nLlxuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gYHdoaXRlc3BhY2VgIHJ1bGUuXG4vLyBOT1RFIGBwYXJzZXIucGFyc2UoXCJ3aGl0ZXNwYWNlXCIsIFwiICAgXCIpYCB3aWxsIHJldHVybiBgdW5kZWZpbmVkYFxuLy9cdFx0IGJlY2F1c2UgYHBhcnNlci5wYXJzZSgpYCBhdXRvbWF0aWNhbGx5IGVhdHMgd2hpdGVzcGFjZSBhdCB0aGUgc3RhcnQgb2YgYSBydWxlLlxuUnVsZS5XaGl0ZXNwYWNlID0gY2xhc3Mgd2hpdGVzcGFjZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fVxucGFyc2VyLmFkZFJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIG5ldyBSdWxlLldoaXRlc3BhY2UoeyBwYXR0ZXJuOiAvXFxzKy8sIG9wdGlvbmFsOiB0cnVlIH0pKTtcblxuLy8gYGlkZW50aWZpZXJgID0gdmFyaWFibGVzIG9yIHByb3BlcnR5IG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcblJ1bGUuSWRlbnRpZmllciA9IGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgaWRlbnRpZmllciA9IHBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgUnVsZS5JZGVudGlmaWVyKHtcblx0cGF0dGVybjogL1thLXpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGlkZW50aWZpZXIpO1xuXG4vLyBBZGQgRW5nbGlzaCBwcmVwb3NpdGlvbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vL1xuLy8gV2lraXBlZGlhIFwiUHJlcG9zaXRpb25cIjpcbi8vXHRcIlByZXBvc2l0aW9ucy4uLmFyZSBhIGNsYXNzIG9mIHdvcmRzIHRoYXRcbi8vXHRleHByZXNzIHNwYXRpYWwgb3IgdGVtcG9yYWwgcmVsYXRpb25zICAoaW4sIHVuZGVyLCB0b3dhcmRzLCBiZWZvcmUpXG4vL1x0b3IgbWFyayB2YXJpb3VzIHNlbWFudGljIHJvbGVzIChvZiwgZm9yKS5cbi8vIFRFU1RNRVxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYWJvdXRcIiwgXCJhYm92ZVwiLCBcImFmdGVyXCIsIFwiYW5kXCIsIFwiYXNcIiwgXCJhdFwiLFxuXHRcImJlZm9yZVwiLCBcImJlaGluZFwiLCBcImJlbG93XCIsIFwiYmVuZWF0aFwiLCBcImJlc2lkZVwiLCBcImJldHdlZW5cIiwgXCJiZXlvbmRcIiwgXCJieVwiLFxuXHRcImRlZmluZWRcIiwgXCJkb3duXCIsIFwiZHVyaW5nXCIsXG5cdFwiZWFjaFwiLCBcImVtcHR5XCIsIFwiZXhhY3RseVwiLCBcImV4Y2VwdFwiLFxuXHRcImZvclwiLCBcImZyb21cIixcblx0XCJncmVhdGVyXCIsXG5cdFwiaW5cIiwgXCJpbnRvXCIsXG5cdFwibGVzc1wiLCBcImxvbmdcIixcblx0XCJtaW51c1wiLCBcIm1vcmVcIixcblx0XCJuZWFyXCIsIFwibm90XCIsXG5cdFwib2ZcIiwgXCJvZmZcIiwgXCJvblwiLCBcIm9udG9cIiwgXCJvcHBvc2l0ZVwiLCBcIm91dFwiLCBcIm91dHNpZGVcIiwgXCJvdmVyXCIsXG5cdFwic2hvcnRcIiwgXCJzaW5jZVwiLFxuXHRcInRoYW5cIiwgXCJ0aGVuXCIsIFwidGhyb3VnaFwiLCBcInRocnVcIiwgXCJ0b1wiLCBcInRvd2FyZFwiLCBcInRvd2FyZHNcIixcblx0XCJ1bmRlZmluZWRcIiwgXCJ1bmRlclwiLCBcInVuZGVybmVhdGhcIiwgXCJ1bmlxdWVcIiwgXCJ1bnRpbFwiLCBcInVwXCIsIFwidXBvblwiLCBcInVwc2lkZVwiLFxuXHRcInZlcnN1c1wiLCBcInZzXCIsXG5cdFwid2l0aFwiLCBcIndpdGhpblwiLCBcIndpdGhvdXRcIixcbik7XG5cbi8vIEFkZCBjb21tb24gZW5nbGlzaCB2ZXJicyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFyZVwiLFxuXHRcImRvXCIsIFwiZG9lc1wiLFxuXHRcImNvbnRhaW5zXCIsXG5cdFwiaGFzXCIsIFwiaGF2ZVwiLFxuXHRcImlzXCIsXG5cdFwicmVwZWF0XCIsXG5cdFwid2FzXCIsIFwid2VyZVwiXG4pO1xuXG4vLyBBZGQgc3BlY2lhbCBjb250cm9sIGtleXdvcmRzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiZWxzZVwiLFxuXHRcImlmXCIsXG5cdFwib3RoZXJ3aXNlXCIsXG5cdFwid2hpbGVcIlxuKTtcblxuLy8gYFR5cGVgID0gdHlwZSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGFuIHVwcGVyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5UeXBlID0gY2xhc3MgdHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoXCJ0eXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvW0EtWl1bXFx3XFwtXSovLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdHlwZSk7XG5cblxuLy8gYG51bWJlcmAgYXMgZWl0aGVyIGZsb2F0IG9yIGludGVnZXIsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cblJ1bGUuTnVtYmVyID0gY2xhc3MgbnVtYmVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IG51bWJlciA9IHBhcnNlci5hZGRSdWxlKFwibnVtYmVyXCIsIG5ldyBSdWxlLk51bWJlcih7XG5cdHBhdHRlcm46IC8tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gbnVtYmVyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlRmxvYXQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBudW1iZXIpO1xuXG5cbi8vIE51bWVyaWMgYGludGVnZXJgIG9ubHksIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHRoaXMgV0lMTCBtYXRjaCBhIGZsb2F0LCBidXQgdGhlIHJldHVybmVkIHZhbHVlIHdpbGwgY29lcmNlIHRvIGFuIGludGVnZXIuXG4vLyBSRVZJRVc6IGlzIHRoaXMgcmlnaHQ/ICBCZXR0ZXIgdG8gbm90IG1hdGNoIGEgZmxvYXQ/XG5SdWxlLkludGVnZXIgPSBjbGFzcyBpbnRlZ2VyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJpbnRlZ2VyXCIsIG5ldyBSdWxlLkludGVnZXIoe1xuXHRwYXR0ZXJuOiAvLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0ZXh0ID0gcGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyBSdWxlLlRleHQoe1xuXHRwYXR0ZXJuOiAvKD86XCJbXlwiXSpcInwnW14nXSonKS9cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCB0ZXh0KTtcblxuXG4vLyBCb29sZWFuIGxpdGVyYWwsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFRPRE86IGJldHRlciBuYW1lIGZvciB0aGlzPz8/XG5SdWxlLkJvb2xlYW4gPSBjbGFzcyBib29sZWFuIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IGJvb2wgPSBwYXJzZXIuYWRkUnVsZShcImJvb2xlYW5cIiwgbmV3IFJ1bGUuQm9vbGVhbih7XG5cdHBhdHRlcm46IC8odHJ1ZXxmYWxzZXx5ZXN8bm98b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgYm9vbCk7XG4vLyBBZGQgYm9vbGVhbiB0b2tlbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcInRydWVcIiwgXCJmYWxzZVwiLFxuXHRcInllc1wiLCBcIm5vXCIsXG5cdFwib2tcIiwgXCJjYW5jZWxcIlxuKTtcblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxubGV0IGxpc3QgPSBwYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsX2xpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdHtcblx0XHQvLyBXaGVuIGdhdGhlcmluZyBhcmd1bWVudHMsIHJldHVybiBqdXN0IHRoZSBtYXRjaGVkIGxpc3QgZGF0YS5cblx0XHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzWzFdO1xuXHRcdH0sXG5cdFx0Ly8gcmV0dXJuIGp1c3QgdGhlIGxpc3QgYXMgb3VyIHNvdXJjZVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcbiBcdFx0XHRyZXR1cm4gdGhpcy5nYXRoZXJBcmd1bWVudHMoKS50b1NvdXJjZSgpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gTGl0ZXJhbCB2YWx1ZSBhcyBudW1iZXIsIHRleHQgb3IgYm9vbGVhbi5cbi8vVE9ETzogdGhpcyBpcyBhbiBleHByZXNzaW9uLi4uIGJ1dCBpbnN0YWxsaW5nIGl0IHRoYXQgd2F5IGJyZWFrcyBwYXJzaW5nLi4uP1xuLy9URVNUTUU6IGFkZCBsaXRlcmFsLWxpc3QgdG8gdGhpcz9cbnBhcnNlci5hZGRTeW50YXgoXCJsaXRlcmFsXCIsIFwiKGxpdGVyYWw6e251bWJlcn18e3RleHR9fHtib29sZWFufXx7bGl0ZXJhbF9saXN0fSlcIik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY29yZS5qcyIsIlxuLy8gVE9ETzogY29udmVydCB0byBsaW5lLWF3YXJlIHN0cmVhbT8/P1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFN0cmVhbSB7XG5cdC8vIFlvdSBjYW4gY29uc3RydWN0IHdpdGggYSB0ZXh0IHN0cmluZyBvciBhIHNldCBvZiBwcm9wZXJ0aWVzIChpbmNsdWRpbmcgYHRleHRgKS5cblx0Y29uc3RydWN0b3IoLi4udGV4dE9yUHJvcHMpIHtcblx0XHR0ZXh0T3JQcm9wcy5mb3JFYWNoKChhcmcpID0+IHtcblx0XHRcdGlmICh0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdHRoaXMudGV4dCA9IGFyZztcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGFyZykge1xuXHRcdFx0XHRPYmplY3QuYXNzaWduKHRoaXMsIGFyZyk7XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8vIE1ha2Ugc3VyZSBgdGV4dGAgYW5kIGBzdGFydEluZGV4YCBhcmUgZGVmaW5lZC5cblx0XHRpZiAoIShcInRleHRcIiBpbiB0aGlzKSkgdGhpcy50ZXh0ID0gXCJcIjtcblx0XHRpZiAoIShcInN0YXJ0SW5kZXhcIiBpbiB0aGlzKSkgdGhpcy5zdGFydEluZGV4ID0gMDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBpbW11dGFibGUgY2xvbmUgb2YgdGhlIHN0cmVhbS5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRyZXR1cm4gbmV3IFRleHRTdHJlYW0odGhpcywgcHJvcHMpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jZWQgdG8gbmV3IHN0YXJ0SW5kZXguXG5cdGFkdmFuY2VUbyhzdGFydEluZGV4KSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4IH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jaW5nIHN0YXJ0SW5kZXggQlkgYGxlbmd0aGBcblx0YWR2YW5jZUJ5KGxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuXHR9XG5cbi8vIFx0Ly8gUmV0dXJuIGNsb25lIG9mIHRoaXMgc3RyZWFtIHdpdGggZW5kSW5kZXggc2V0IHRvIHN0YXJ0ICsgYGxlbmd0aGBcbi8vIFx0ZW5kQWZ0ZXIobGVuZ3RoKSB7XG4vLyBcdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBlbmRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuLy8gXHR9XG5cbi8vXG4vLyAjIyBNYXRjaGluZ1xuLy9cblx0Ly8gTWF0Y2ggYHBhdHRlcm5gIGFzIHJlZ2V4IGluIHRoaXMgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG1hdGNoIG9yIGB1bmRlZmluZWRgLlxuXHQvLyBJZiB5b3Ugd2FudCB0byB0ZXN0IHRoZSBzdGFydCBvZiB0aGUgc3RyZWFtLFxuXHQvL1x0bWFrZSBzdXJlIHlvdXIgcmVnZXggc3RhcnRzIHdpdGggYF5gLlxuXHQvLyBURVNUTUU6IHRoaXMgbGlrZWx5IGJyZWFrcyB3aXRoIGEgYGdgIG9uIHRoZSBwYXR0ZXJuP1xuXHRtYXRjaChwYXR0ZXJuKSB7XG5cdFx0aWYgKCEocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHRocm93IG5ldyBUeXBlRXJyb3IoYFRleHRTdHJlYW0ubWF0Y2goJHtwYXR0ZXJufSk6IGV4cGVjdGVkIFJlZ0V4cGApO1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5tYXRjaChwYXR0ZXJuKSB8fCB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBEb2VzIHRoaXMgc3RyZWFtIElOQ0xVREUgYSByZWdleCB3aXRoaW4gaXQ/XG5cdC8vIFJldHVybnMgYHRydWVgIG9yIGBmYWxzZWAuXG5cdC8vIE5PVEU6IFBhdHRlcm4gbXVzdCBOT1Qgc3RhcnQgd2l0aCBgXmAgZm9yIHRoaXMgdG8gbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLlxuXHR0ZXN0KHBhdHRlcm4pIHtcblx0XHRyZXR1cm4gcGF0dGVybi50ZXN0KHRoaXMuaGVhZCk7XG5cdH1cblxuLy9cbi8vICMjIFJlZmxlY3Rpb25cbi8vXG5cdC8vIFJldHVybiB0ZXh0IG9mIHN0cmluZyBzdGFydGluZyBhdCBvdXIgYHN0YXJ0SW5kZXhgXG5cdGdldCBoZWFkKCkge1xuXHRcdHJldHVybiB0aGlzLnJhbmdlKCk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSByYW5nZSBvZiB0aGUgc3RyaW5nIGZyb20gYHN0YXJ0SW5kZXhgIHRvIGBlbmRJbmRleGAgTk9OLWluY2x1c2l2ZS5cblx0cmFuZ2Uoc3RhcnRJbmRleCA9IHRoaXMuc3RhcnRJbmRleCwgZW5kSW5kZXggPSB0aGlzLmVuZEluZGV4IHx8IHRoaXMudGV4dC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0LnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmRJbmRleCk7XG5cdH1cblxuXHQvLyBMZW5ndGggb2YgdGhlIHN0cmVhbS5cblx0Z2V0IGxlbmd0aCgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0Lmxlbmd0aDtcblx0fVxuXG5cdC8vIEFyZSB3ZSBhdCB0aGUgZW5kIG9mIHRoZSBzdHJlYW0/XG5cdGdldCBpc0VtcHR5KCkge1xuXHRcdHJldHVybiB0aGlzLnN0YXJ0SW5kZXggPT09IHRoaXMubGVuZ3RoO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dFxuXHR9O1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1RleHRTdHJlYW0uanMiLCJpbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gbG9hZCBzdGFuZGFyZCBydWxlcyBmaWxlcyBoZXJlXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbnVtYmVyc1wiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vc3RhdGVtZW50c1wiO1xuaW1wb3J0IFwiLi9hc3NpZ25tZW50XCI7XG5pbXBvcnQgXCIuL2NsYXNzXCI7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaW5kZXguanMiLCIvLyBNZW1vaXplL2ZvcmdldCBzZW1hbnRpY3MuXG5cbi8vIFJldHVybiBhIG1lbW9pemluZyBnZXR0ZXIgZnVuY3Rpb24uXG4vLyBURVNUTUVcbmV4cG9ydCBmdW5jdGlvbiBtZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKSB7XG5cdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRpZiAodGhpc1twcm9wZXJ0eV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dmFyIHZhbHVlID0gZ2V0dGVyLmFwcGx5KHRoaXMpO1xuXHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Ly8gRGVmaW5lIHNvIHRoYXQgd2UgY2FuIGJlIGRlbGV0ZWQgYW5kIHJlLWRlZmluZWQsIGJ1dCBub3Qgc2V0IG9yIGVudW1lcmF0ZWQuXG5cdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBwcm9wZXJ0eSwgeyB2YWx1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdGhpc1twcm9wZXJ0eV07XG5cdH1cbn1cblxuXG4vLyBSZXR1cm4gYSBtZW1vaXplIGZ1bmN0aW9uIGZvciB1c2UgYXMgYSBnZXR0ZXIgaW4gYSBgT2JqZWN0LmRlZmluZVByb3BlcnR5KClgXG4vLyBURVNUTUVcbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVNZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKSB7XG5cdHJldHVybiB7XG5cdFx0Z2V0IDogbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcilcblx0fVxufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL21lbW9pemUuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFRPRE86IHtwcm9wZXJ0eS1leHByZXNzaW9ufSBhbHNvIHdvcmtzLi4uIHthc3NpZ25hYmxlLWV4cHJlc3Npb259ID8/P1xucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJ7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cIiwge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0bGV0IHZhbHVlID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0Ly8gVE9ETzogZGVjbGFyZSBpZGVudGlmaWVyIGlmIG5vdCBpbiBzY29wZSwgZXRjXG5cdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9ID0gJHt2YWx1ZX1gO1xuXHR9XG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9hc3NpZ25tZW50LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vL3BhcnNlci5hZGRFeHByZXNzaW9uKFwicHJvcGVydHlfZXhwcmVzc2lvblwiLCBcIntwcm9wZXJ0eTpwcm9wZXJ0eV9uYW1lfSsge2V4cHJlc3Npb259XCIsIHtcbnBhcnNlci5hZGRFeHByZXNzaW9uKFwicHJvcGVydHlfZXhwcmVzc2lvblwiLCBcIihwcm9wZXJ0aWVzOnRoZSB7aWRlbnRpZmllcn0gb2YpKyB7ZXhwcmVzc2lvbn1cIiwge1xuIFx0Z2F0aGVyQXJndW1lbnRzKCkge1xuXHRcdGxldCBhcmdzID0gUnVsZS5FeHByZXNzaW9uLmdhdGhlckFyZ3VtZW50cyh0aGlzKTtcblx0XHQvLyB0cmFuc2Zvcm0gcHJvcGVydGllcyBhbmQgcmV2ZXJzZSBvcmRlclxuXHRcdGFyZ3MucHJvcGVydGllcyA9IGFyZ3MucHJvcGVydGllcy5tYXAoIHNlcXVlbmNlID0+IHNlcXVlbmNlLmlkZW50aWZpZXIgKS5yZXZlcnNlKCk7XG5cdFx0cmV0dXJuIGFyZ3M7XG4gXHR9LFxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0bGV0IHRoaW5nID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0bGV0IHByb3BlcnRpZXMgPSBhcmdzLnByb3BlcnRpZXMubWFwKCBpZGVudGlmaWVyID0+IGlkZW50aWZpZXIudG9Tb3VyY2UoKSApLmpvaW4oXCIuXCIpO1xuXHRcdHJldHVybiBgc3BlbGwuZ2V0KCR7dGhpbmd9LCAnJHtwcm9wZXJ0aWVzfScpYDtcblx0fVxufSk7XG5cblxuXG5wYXJzZXIuYWRkU3ludGF4KFwic2NvcGVfbW9kaWZpZXJcIiwgXCIoc2NvcGU6Z2xvYmFsfGNvbnN0YW50fHNoYXJlZClcIik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eVwiLFxuXHRcIntzY29wZV9tb2RpZmllcn0/IHthc3NpZ25tZW50fVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGlkZW50aWZpZXIgPSBhcmdzLmFzc2lnbm1lbnQuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IHZhbHVlID0gYXJncy5hc3NpZ25tZW50LmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRcdGxldCBhc3NpZ25tZW50ID0gYCR7aWRlbnRpZmllcn0gPSAke3ZhbHVlfWA7XG5cblx0XHRcdHZhciBzY29wZSA9IGFyZ3Muc2NvcGUgPyBhcmdzLnNjb3BlLnRvU291cmNlKCkgOiBcImxvY2FsXCI7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJnbG9iYWxcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGdsb2JhbC4ke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwiY29uc3RhbnRcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGNvbnN0ICR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJzaGFyZWRcIjpcblx0XHRcdFx0XHRyZXR1cm4gYHN0YXRpYyAke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBhc3NpZ25tZW50O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuLy8gVE9ETzogd2FybiBvbiBpbnZhbGlkIHNldD8gIHNoYXJlZD8gIHVuZGVmaW5lZD8gc29tZXRoaW5nIG90aGVyIHRoYW4gdGhlIGZpcnN0IHZhbHVlIGFzIGRlZmF1bHQ/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlfYXNfb25lX29mXCIsXG5cdFwie2lkZW50aWZpZXJ9IGFzIG9uZSBvZiB7bGlzdDpsaXRlcmFsX2xpc3R9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IHBsdXJhbCA9IChpZGVudGlmaWVyICsgXCJfVkFMVUVTXCIpLnRvVXBwZXJDYXNlKCk7XG5cdFx0XHRsZXQgbGlzdCA9IGFyZ3MubGlzdC5saXN0O1xuXHRcdFx0bGV0IHZhbHVlcyA9IGxpc3QudG9Tb3VyY2UoKTtcblx0XHRcdGxldCBmaXJzdCA9IGxpc3QucmVzdWx0c1swXTtcblx0XHRcdGxldCBmaXJzdFZhbHVlID0gZmlyc3QgPyBmaXJzdC50b1NvdXJjZSgpIDogXCJ1bmRlZmluZWRcIjtcblxuXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9O1xcbmBcblx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9IHsgcmV0dXJuIChcIl9fJHtpZGVudGlmaWVyfVwiIGluIHRoaXMgPyB0aGlzLl9fJHtpZGVudGlmaWVyfSA6ICR7Zmlyc3RWYWx1ZX0pIH1cXG5gXG5cdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy5jb25zdHJ1Y3Rvci4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1cXG5gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NsYXNzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWFsaW5nIHdpdGggbnVtYmVyc1xuLy9cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vLyBOdW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nLlxucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJpbmRleF9leHByZXNzaW9uXCIsIFwiaXRlbSB7bnVtYmVyOmludGVnZXJ9IG9mIHtleHByZXNzaW9ufVwiLCB7XG5cdHRvU291cmNlKCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgbnVtYmVyID0gYXJncy5udW1iZXIudG9Tb3VyY2UoKTtcblx0XHRsZXQgZXhwcmVzc2lvbiA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke251bWJlcn0pYDtcblx0fVxufSk7XG5cbi8vIEVuZ2xpc2ggd29yZHMgdXNlZCBmb3IgcG9zaXRpb24gb2Ygc29tZXRoaW5nIGluIGEgbGlzdC5cbi8vIFRPRE86IGBzZXZlbnR5LXNldmVudGhgLCBgdGhpcmQtdG8tbGFzdGAuLi5cbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiKGZpcnN0fHNlY29uZHx0aGlyZHxmb3VydGh8ZmlmdGh8c2l4dGh8c2V2ZW50aHxlaWdodGh8bmludGh8dGVudGh8cGVudWx0aW1hdGV8bGFzdHxmaW5hbClcIiwge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IG9yZGluYWwgPSB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoKTtcblx0XHRzd2l0Y2ggKG9yZGluYWwpIHtcblx0XHRcdGNhc2UgXCJmaXJzdFwiOlx0XHRyZXR1cm4gMTtcblx0XHRcdGNhc2UgXCJzZWNvbmRcIjpcdFx0cmV0dXJuIDI7XG5cdFx0XHRjYXNlIFwidGhpcmRcIjpcdFx0cmV0dXJuIDM7XG5cdFx0XHRjYXNlIFwiZm91cnRoXCI6XHRcdHJldHVybiA0O1xuXHRcdFx0Y2FzZSBcImZpZnRoXCI6XHRcdHJldHVybiA1O1xuXHRcdFx0Y2FzZSBcInNpeHRoXCI6XHRcdHJldHVybiA2O1xuXHRcdFx0Y2FzZSBcInNldmVudGhcIjpcdFx0cmV0dXJuIDc7XG5cdFx0XHRjYXNlIFwiZWlnaHRoXCI6XHRcdHJldHVybiA4O1xuXHRcdFx0Y2FzZSBcIm5pbnRoXCI6XHRcdHJldHVybiA5O1xuXHRcdFx0Y2FzZSBcInRlbnRoXCI6XHRcdHJldHVybiAxMDtcblx0XHRcdGNhc2UgXCJwZW51bHRpbWF0ZVwiOlx0cmV0dXJuIC0yO1xuXHRcdFx0Y2FzZSBcImxhc3RcIjpcdFx0cmV0dXJuIC0xO1xuXHRcdFx0Y2FzZSBcImZpbmFsXCI6XHRcdHJldHVybiAtMTtcblx0XHR9XG5cdH1cbn0pO1xuXG4vLyBBbHRlcm5hdGl2ZSBmb3JtIGZvciBudW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nLlxuLy8gTk9URTogZG9uJ3QgYWRkIGFzIGFuIGV4cHJlc3Npb24gc2luY2Ugd2UncmUgYXV0by1tZXJnZWQgd2l0aCBgaW5kZXhfZXhwcmVzc2lvbmAgYWJvdmUuXG5wYXJzZXIuYWRkU3ludGF4KFwiaW5kZXhfZXhwcmVzc2lvblwiLCBcInRoZSB7b3JkaW5hbH0gaXRlbSBvZiB7ZXhwcmVzc2lvbn1cIiwge1xuXHR0b1NvdXJjZSgpIHtcblx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0bGV0IG9yZGluYWwgPSBhcmdzLm9yZGluYWwudG9Tb3VyY2UoKTtcblx0XHRsZXQgZXhwcmVzc2lvbiA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke29yZGluYWx9KWA7XG5cdH1cbn0pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvbnVtYmVycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgaW5maXggYW5kIHByZWZpeCBvcGVyYXRvcnMuXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8jIyBJbmZpeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj4ge3Joc31gLCBlZzogYGEgaXMgMWBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgdHdvIGFyZ3VtZW50cyAoYGxoc2AgYW5kIGByaHNgKSBpbnRvIG91dHB1dC5cblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJhbmRcIiwgXCJhbmRcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICYmICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcIm9yXCIsIFwib3JcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9IHx8ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNcIiwgXCJpc1wiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90XCIsIFwiaXMgbm90XCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPSAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX2V4YWN0bHlcIiwgXCJpcyBleGFjdGx5XCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90X2V4YWN0bHlcIiwgXCJpcyBub3QgZXhhY3RseVwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT09ICR7Yn0pYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzT2ZUeXBlKHRoaW5nLCB0eXBlKWBcbi8vVE9ETzogYGlzIHNhbWUgdHlwZSBhc2AgP1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc190eXBlX29mXCIsIFtcImlzIGFcIiwgXCJpcyBhblwiXSwgeyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90X3R5cGVfb2ZcIiwgW1wiaXMgbm90IGFcIiwgXCJpcyBub3QgYW5cIl0sIHsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5jb250YWlucyhjb2xsZWN0aW9uLCB0aGluZylgXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX2luXCIsIFtcImlzIGluXCIsIFwiaXMgb25lIG9mXCJdLCB7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGBzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90X2luXCIsIFtcImlzIG5vdCBpblwiLCBcImlzIG5vdCBvbmUgb2ZcIl0sIHsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCFzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcbi8vVEVTVE1FXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImluY2x1ZGVzXCIsIFtcImluY2x1ZGVzXCIsIFwiY29udGFpbnNcIl0sIHsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYHNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJkb2VzbnRfaW5jbHVkZVwiLCBbXCJkb2VzIG5vdCBpbmNsdWRlXCIsIFwiZG9lc250IGluY2x1ZGVcIiwgXCJkb2VzIG5vdCBjb250YWluXCIsIFwiZG9lc250IGNvbnRhaW5cIl0sIHsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCFzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndFwiLCBbXCI+XCIsIFwiaXMgZ3JlYXRlciB0aGFuXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0ZVwiLCBbXCI+PVwiLCBcImlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0b1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibHRcIiwgW1wiPFwiLCBcImlzIGxlc3MgdGhhblwiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJsdGVcIiwgW1wiPD1cIiwgXCJpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG9cIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9fSk7XG5cbi8vVE9ETzogIGNhbid0IGFkZCBgK2AgYXMgYSBydWxlLCBmaXggdGhpcyB0aGVuIGFkZCB0aGVzZVxuLy9UT0RPOiAgb3BlcmF0b3IgcHJlY2VkZW5jZT8/P1xuLy9URVNUTUVcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwicGx1c1wiLCBbXCJcXFxcK1wiLCBcInBsdXNcIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKyAke2J9YCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcIm1pbnVzXCIsIFtcIi1cIiwgXCJtaW51c1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAtICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwidGltZXNcIiwgW1wiXFxcXCpcIiwgXCJ0aW1lc1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZGl2aWRlZF9ieVwiLCBbXCIvXCIsIFwiZGl2aWRlZCBieVwiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH19KTtcblxuLy9UT0RPOiAgYCs9YCBldGM/ICBvdGhlciBtYXRoIGZ1bmN0aW9ucz9cblxucGFyc2VyLmFkZFN5bnRheChcblx0XCJpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6aW5maXhfb3BlcmF0b3J9IHtyaHM6ZXhwcmVzc2lvbn1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBsaHMgPSBhcmdzLmxocy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCByaHMgPSBhcmdzLnJocy50b1NvdXJjZShjb250ZXh0KTtcblxuXHRcdFx0bGV0IHRvSlMgPSBhcmdzLm9wZXJhdG9yLnRvSlM7XG5cdFx0XHRyZXR1cm4gdG9KUyhsaHMsIHJocyk7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyMjIFBvc3RpZnggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+YCwgZS5nLiBgYSBpcyBkZWZpbmVkYFxuLy8gTk9URTogYG9wZXJhdG9yLnRvSlNgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyBhcmd1bWVudCAoYGxoc2ApIGludG8gSlMgb3V0cHV0LlxuXG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXNfZGVmaW5lZFwiLCBcImlzIGRlZmluZWRcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSAhPT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXNfbm90X2RlZmluZWRcIiwgW1wiaXMgbm90IGRlZmluZWRcIiwgXCJpcyB1bmRlZmluZWRcIl0sIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gPT09ICd1bmRlZmluZWQnKWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5pc0VtcHR5KHRoaW5nKWBcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19lbXB0eVwiLCBcImlzIGVtcHR5XCIsIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYHNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXNfbm90X2VtcHR5XCIsIFwiaXMgbm90IGVtcHR5XCIsIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCFzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfX0pO1xuXG5wYXJzZXIuYWRkU3ludGF4KFxuXHRcInBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntsaHM6ZXhwcmVzc2lvbiFwb3N0Zml4X29wZXJhdG9yX2V4cHJlc3Npb259IHtvcGVyYXRvcjpwb3N0Zml4X29wZXJhdG9yfVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGxocyA9IGFyZ3MubGhzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHRvSlMgPSBhcmdzLm9wZXJhdG9yLnRvSlM7XG5cdFx0XHRyZXR1cm4gdG9KUyhsaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG5wYXJzZXIuYWRkU3ludGF4KFwib3BlcmF0b3JfZXhwcmVzc2lvblwiLCBcIihleHByZXNzaW9uOntwb3N0Zml4X29wZXJhdG9yX2V4cHJlc3Npb259fHtpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9ufSlcIik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImlmXCIsIFwiaWYge2V4cHJlc3Npb259IHRoZW4ge251bWJlcn0/XCIsIHtcblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdH1cbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiXSwic291cmNlUm9vdCI6IiJ9