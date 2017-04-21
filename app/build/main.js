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

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

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

		// "gather" arguments in preparation to call `toSource()`
		// Only callable after parse is completed.
		// NOTE: you may want to memoize the results.

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
		get: function get() {
			return this;
		}
	}, {
		key: "ruleType",
		get: function get() {
			return this.constructor.name;
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
		value: function parse(parser, stream) {
			var rule = parser.getRule(this.rule);
			if (!rule) throw new SyntaxError("Attempting to parse unknown rule '" + this.rule + "'");
			var match = rule.parse(parser, stream);
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
			var matched = [],
			    next = stream;
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = this.rules[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var rule = _step.value;

					next = parser.eatWhitespace(next);
					var match = rule.parse(parser, next);
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

	_createClass(expression, [{
		key: "parse",
		value: function parse(parser, stream) {
			if (this.dontRecurse) {
				//console.warn("NOT recursing into ", this);
				return undefined;
			}
			// If the expression is leftRecursive, set a flag so we don't attempt to recurse into it again.
			//TODO: this is dangerous: an exception will leave the flag set...
			if (this.leftRecursive) {
				this.dontRecurse = true;
				//console.warn("Setting dontRecurse for", this);
			}
			var match = _get(expression.prototype.__proto__ || Object.getPrototypeOf(expression.prototype), "parse", this).call(this, parser, stream);
			if (this.leftRecursive) delete this.dontRecurse;
			return match;
		}
	}]);

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
			var next = stream;
			var matched = [];
			while (true) {
				next = parser.eatWhitespace(next);
				var match = this.rule.parse(parser, next);
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
			// ensure item and delimiter are optional so we don't barf in `parseRule`
			this.item.optional = true;
			this.delimiter.optional = true;

			var matched = [],
			    next = stream;
			while (true) {
				next = parser.eatWhitespace(next);
				// get next item, exiting if not found
				var item = this.item.parse(parser, next);
				if (!item) break;
				//console.log(item);
				matched.push(item);
				next = item.next();

				next = parser.eatWhitespace(next);
				// get delimiter, exiting if not found
				var delimiter = this.delimiter.parse(parser, next);
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
			var SequenceConstructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.Statement;

			var rule = this.addSyntax(name, ruleSyntax, properties, SequenceConstructor);
			if (rule) return this.addRule("statement", rule);
		} },

	addExpression: { value: function value(name, ruleSyntax, properties) {
			var SequenceConstructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.Expression;

			var rule = this.addSyntax(name, ruleSyntax, properties, SequenceConstructor);
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
var list = _parser2.default.addExpression("literal_list", "\\[[list:{expression},]?\\]", undefined, function (_Rule$Expression) {
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
		var identifier = this.results.identifier.toSource(context);
		var value = this.results.expression.toSource(context);
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

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

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


_parser2.default.addExpression("property_expression", "(property_names:the {identifier} of)+ {expression}", undefined, function (_Rule$Expression) {
	_inherits(property_expression, _Rule$Expression);

	function property_expression() {
		_classCallCheck(this, property_expression);

		return _possibleConstructorReturn(this, (property_expression.__proto__ || Object.getPrototypeOf(property_expression)).apply(this, arguments));
	}

	_createClass(property_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var thing = this.results.expression.toSource(context);
			var property_names = this.results.property_names.reverse().map(function (identifier) {
				return identifier.toSource(context);
			}).join(".");
			return "spell.get(" + thing + ", '" + property_names + "')";
		}
	}, {
		key: "results",
		get: function get() {
			if (!this._results) {
				this._results = _get(property_expression.prototype.__proto__ || Object.getPrototypeOf(property_expression.prototype), "results", this);
				// transform property_names and pull out identifiers
				this._results.property_names = this._results.property_names.results.map(function (sequence) {
					return sequence.identifier;
				});
			}
			return this._results;
		}
	}]);

	return property_expression;
}(_RuleSyntax2.default.Expression));

_parser2.default.addSyntax("scope_modifier", "(scope:global|constant|shared|local)");

_parser2.default.addStatement("declare_property", "{scope_modifier}? {assignment}", {
	toSource: function toSource(context) {
		var assignment = this.results.assignment.toSource(context);
		var scope = this.results.scope && this.results.scope.toSource(context);
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
		var scope = this.results.scope.toSource(context);
		var identifier = this.results.identifier.toSource(context);
		var plural = (identifier + "_VALUES").toUpperCase();
		var list = this.results.list;
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


var index_expression = _parser2.default.addRule("index_expression", new (function (_Rule$Alternatives) {
	_inherits(index_expression, _Rule$Alternatives);

	function index_expression() {
		_classCallCheck(this, index_expression);

		return _possibleConstructorReturn(this, (index_expression.__proto__ || Object.getPrototypeOf(index_expression)).apply(this, arguments));
	}

	return index_expression;
}(_Rule2.default.Alternatives))());
_parser2.default.addRule("expression", index_expression);

// Numeric index in a list-like thing:
//	- `item 1 of ...`
//	- `item #2 of ...`
// NOTE: these indices are ONE based, NOT zero based as is Javascript.
// TODO: allow any identifier instead of `{item}` ?
_parser2.default.addSyntax("index_expression", "{identifier} (#)?{number:integer} of {expression}", undefined, function (_Rule$Expression) {
	_inherits(index_expression, _Rule$Expression);

	function index_expression() {
		_classCallCheck(this, index_expression);

		return _possibleConstructorReturn(this, (index_expression.__proto__ || Object.getPrototypeOf(index_expression)).apply(this, arguments));
	}

	_createClass(index_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var number = this.results.number.toSource(context);
			var expression = this.results.expression.toSource(context);
			return "spell.getItem(" + expression + ", " + number + ")";
		}
	}]);

	return index_expression;
}(_Rule2.default.Expression));

// Ordinal numbers: first, second, etc.
_parser2.default.addRule("ordinal", new (function (_Rule$Alternatives2) {
	_inherits(ordinal, _Rule$Alternatives2);

	function ordinal() {
		_classCallCheck(this, ordinal);

		return _possibleConstructorReturn(this, (ordinal.__proto__ || Object.getPrototypeOf(ordinal)).apply(this, arguments));
	}

	return ordinal;
}(_Rule2.default.Alternatives))());

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
_parser2.default.addSyntax("index_expression", "the {ordinal} {identifier} of {expression}", undefined, function (_Rule$Expression2) {
	_inherits(index_expression, _Rule$Expression2);

	function index_expression() {
		_classCallCheck(this, index_expression);

		return _possibleConstructorReturn(this, (index_expression.__proto__ || Object.getPrototypeOf(index_expression)).apply(this, arguments));
	}

	_createClass(index_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var ordinal = this.results.ordinal.toSource(context);
			var expression = this.results.expression.toSource(context);
			return "spell.getItem(" + expression + ", " + ordinal + ")";
		}
	}]);

	return index_expression;
}(_Rule2.default.Expression));

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

_parser2.default.addExpression("infix_operator_expression", "{lhs:expression} {operator:infix_operator} {rhs:expression}", undefined, function (_Rule$Expression) {
	_inherits(infix_operator_expression, _Rule$Expression);

	function infix_operator_expression() {
		var _ref;

		var _temp, _this, _ret;

		_classCallCheck(this, infix_operator_expression);

		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = infix_operator_expression.__proto__ || Object.getPrototypeOf(infix_operator_expression)).call.apply(_ref, [this].concat(args))), _this), _this.leftRecursive = true, _temp), _possibleConstructorReturn(_this, _ret);
	}

	_createClass(infix_operator_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var lhs = this.results.lhs.toSource(context);
			var rhs = this.results.rhs.toSource(context);

			var toJS = this.results.operator.toJS;
			return toJS(lhs, rhs);
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

_parser2.default.addExpression("postfix_operator_expression", "{expression} {operator:postfix_operator}", undefined, function (_Rule$Expression2) {
	_inherits(postfix_operator_expresion, _Rule$Expression2);

	function postfix_operator_expresion() {
		var _ref2;

		var _temp2, _this2, _ret2;

		_classCallCheck(this, postfix_operator_expresion);

		for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
			args[_key2] = arguments[_key2];
		}

		return _ret2 = (_temp2 = (_this2 = _possibleConstructorReturn(this, (_ref2 = postfix_operator_expresion.__proto__ || Object.getPrototypeOf(postfix_operator_expresion)).call.apply(_ref2, [this].concat(args))), _this2), _this2.leftRecursive = true, _temp2), _possibleConstructorReturn(_this2, _ret2);
	}

	_createClass(postfix_operator_expresion, [{
		key: "toSource",
		value: function toSource(context) {
			var lhs = this.results.expression.toSource(context);
			var toJS = this.results.operator.toJS;
			return toJS(lhs);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgNDhiN2QwZGVhNDViY2ZkNmJjYWIiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZVN5bnRheC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIl0sIm5hbWVzIjpbInBhcnNlciIsIndpbmRvdyIsImNvbnNvbGUiLCJncm91cCIsImxvZyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInJ1bGVzIiwiY3JlYXRlIiwibmFtZSIsInN0cmVhbSIsInJ1bGUiLCJnZXRSdWxlIiwiU3ludGF4RXJyb3IiLCJlYXRXaGl0ZXNwYWNlIiwicGFyc2UiLCJyZXN1bHQiLCJ3aGl0ZXNwYWNlIiwiYWR2YW5jZUJ5IiwibWF0Y2hlZCIsImxlbmd0aCIsImV4aXN0aW5nIiwiQWx0ZXJuYXRpdmVzIiwiZGVidWciLCJydWxlTmFtZSIsImFyZ3VtZW50IiwiYWRkUnVsZSIsInRva2VucyIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsInN0YXJ0SW5kZXgiLCJuZXN0aW5nIiwibmVzdGVkIiwiZW5kSW5kZXgiLCJsYXN0SW5kZXgiLCJ0b2tlbiIsInNsaWNlIiwic3RyaW5nIiwic3BsaXQiLCJtYXAiLCJjaGFyIiwiaW5kZXgiLCJsaXN0IiwiUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyIsImpvaW4iLCJmbGFncyIsIlJlZ0V4cCIsImVzY2FwZVJlZ0V4cENoYXJhY3RlcnMiLCJERUJVRyIsImNoYXJzIiwiZm9yRWFjaCIsIlJ1bGUiLCJjb25zdHJ1Y3RvciIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2xvbmUiLCJwcm9wcyIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsImNvbnRleHQiLCJQYXR0ZXJuIiwicGF0dGVybiIsImRlZmluZVByb3BlcnR5IiwidmFsdWUiLCJzb3VyY2UiLCJtYXRjaCIsInN0YXJ0UGF0dGVybiIsImJsYWNrbGlzdCIsIndvcmRzIiwid29yZCIsIlN5bWJvbCIsIlJlZ0V4cEZyb21TdHJpbmciLCJvcHRpb25hbCIsIm1lcmdlU3ltYm9scyIsImZpcnN0Iiwic2Vjb25kIiwiS2V5d29yZCIsInBhdHRlcm5TdHJpbmciLCJtZXJnZUtleXdvcmRzIiwiU3VicnVsZSIsImlzRGV0ZXJtaW5pc3RpYyIsIk5lc3RlZCIsImV2ZXJ5IiwiU2VxdWVuY2UiLCJuZXh0IiwicHVzaCIsIm1hdGNoZWRUZXh0IiwicmFuZ2UiLCJfcmVzdWx0cyIsInJlc3VsdHMiLCJhcmdOYW1lIiwiQXJyYXkiLCJpc0FycmF5IiwiRXhwcmVzc2lvbiIsImRvbnRSZWN1cnNlIiwibGVmdFJlY3Vyc2l2ZSIsIlN0YXRlbWVudCIsImJlc3RNYXRjaCIsInRvU291cmNlIiwiUmVwZWF0IiwiaW5jbHVkZXMiLCJMaXN0IiwiaXRlbSIsImRlbGltaXRlciIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJsYXN0IiwicG9wIiwic3ludGF4VG9rZW4iLCJwYXJzZVJ1bGVTeW50YXhfc3RyaW5nIiwicGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUiLCJwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMiLCJwYXJzZVJ1bGVTeW50YXhfbGlzdCIsInBhcnNlUnVsZVN5bnRheF9yZXBlYXQiLCJzdGFydHNXaXRoIiwic3Vic3RyIiwidG9TdHJpbmciLCJmaW5kTmVzdGVkVG9rZW5zIiwiYWx0ZXJuYXRpdmVzIiwiZ3JvdXBBbHRlcm5hdGl2ZXMiLCJjdXJyZW50IiwiaSIsImNvbmNhdCIsInN5bWJvbCIsInBhcmFtcyIsImJhbmdQb3NpdGlvbiIsImluZGV4T2YiLCJub3QiLCJkZWZpbmVQcm9wZXJ0aWVzIiwiYWRkU3ludGF4IiwicnVsZVN5bnRheCIsImUiLCJlcnJvciIsImFkZFN0YXRlbWVudCIsImFkZEV4cHJlc3Npb24iLCJhZGRJbmZpeE9wZXJhdG9yIiwidG9KUyIsIl9faW5maXhPcGVyYXRvcnMiLCJpbmZpeE9wZXJhdG9ycyIsImFkZFBvc3RmaXhPcGVyYXRvciIsIl9fcG9zdGZpeE9wZXJhdG9ycyIsInBvc3RmaXhPcGVyYXRvcnMiLCJXaGl0ZXNwYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJyZXBsYWNlIiwiYWRkVG9CbGFja2xpc3QiLCJUeXBlIiwidHlwZSIsIk51bWJlciIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJJbnRlZ2VyIiwicGFyc2VJbnQiLCJUZXh0IiwidGV4dCIsIkJvb2xlYW4iLCJib29sIiwiVGV4dFN0cmVhbSIsInRleHRPclByb3BzIiwiYXJnIiwiaGVhZCIsInRlc3QiLCJzdWJzdHJpbmciLCJtZW1vaXplZCIsImRlZmluZU1lbW9pemVkIiwicHJvcGVydHkiLCJnZXR0ZXIiLCJhcHBseSIsImNvbmZpZ3VyYWJsZSIsImdldCIsImV4cHJlc3Npb24iLCJ0aGluZyIsInByb3BlcnR5X25hbWVzIiwicmV2ZXJzZSIsInNlcXVlbmNlIiwiYXNzaWdubWVudCIsInNjb3BlIiwicGx1cmFsIiwidG9VcHBlckNhc2UiLCJ2YWx1ZXMiLCJmaXJzdFZhbHVlIiwiaW5kZXhfZXhwcmVzc2lvbiIsIm9yZGluYWwiLCJhIiwiYiIsImxocyIsInJocyIsIm9wZXJhdG9yIl0sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsbURBQTJDLGNBQWM7O0FBRXpEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsbUNBQTJCLDBCQUEwQixFQUFFO0FBQ3ZELHlDQUFpQyxlQUFlO0FBQ2hEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDhEQUFzRCwrREFBK0Q7O0FBRXJIO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7Ozs7Ozs7Ozs7QUM3REE7Ozs7QUFDQTs7Ozs7O0FBRUE7QUFOQTtBQUNBO0FBQ0E7QUFLQSxJQUFNQSxTQUFTLHNCQUFmO2tCQUNlQSxNOztBQUVmOztBQUNBQyxPQUFPRCxNQUFQLEdBQWdCQSxNQUFoQixDOzs7Ozs7Ozs7Ozs7O3FqQkNYQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7OztBQUNBOzs7Ozs7OztBQUVBO0FBQ0EsSUFBSSxDQUFDRSxRQUFRQyxLQUFiLEVBQW9CRCxRQUFRQyxLQUFSLEdBQWdCRCxRQUFRRSxHQUF4QjtBQUNwQixJQUFJLENBQUNGLFFBQVFHLFFBQWIsRUFBdUJILFFBQVFHLFFBQVIsR0FBbUJILFFBQVFFLEdBQTNCOztJQUVGRSxNO0FBSXBCLGlCQUFZQyxVQUFaLEVBQXdCO0FBQUE7O0FBQ3ZCQyxTQUFPQyxNQUFQLENB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QkFFbER2QyxPQUZrRCxFQUV6QyxDQUNqQjtBQUgwRCxDQUE1RCxFIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMTIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDQ4YjdkMGRlYTQ1YmNmZDZiY2FiIiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCIvLyBTcGVsbCBcIkVuZ2xpc2hcIiBwYXJzZXIgc3RyYXdtYW5cblxuLy8gVE9ETzpcdGB0ZXN0YCBmdW5jdGlvbiBmb3IgcXVpY2sgbm8tZ29vZCBoaXQgb24gYHthfSBibGFoIGJsYWgge2J9YD9cbi8vIFRPRE86XHR0aGlzIGRvZXNuJ3Qgd29yazogICBge2V4cHJlc3Npb259IGlzIHtleHByZXNzaW9ufWBcbi8vIFRPRE86XHRicmVhayBgZmlsZWAgaW50byBsaW5lcyBhbmQgcHJvY2VzcyBlYWNoIChpbmNsLiBzdWJzdHIvbWF0Y2ggbm90IGdvaW5nIGJleW9uZCB0aGUgZW5kKVxuLy8gVE9ETzpcdG5lc3RpbmcgLS0gaXMgdGhpcyBqdXN0IGluZGVudCA9IFwiYWRkIGJsb2NrIHNjb3BlXCJcbi8vIFRPRE86XHRwcm9tb3Rpb24gcGF0dGVybiBmb3IgZ2F0aGVyIGFyZ3VtZW50cyAoZWc6IGxpdGVyYWwtbGlzdCkgPz8/XG4vLyBUT0RPOlx0V2hhdCBkb2VzIHN5bnRheCB0cmVlIGxvb2sgbGlrZT8gIEhvdyBkbyB3ZSBleHRyYWN0IG1lYW5pbmcgb3V0IG9mIHRoZSBuZXN0P1xuLy8gVE9ETzpcdFBhc3MgYGNvbnRleHRgIHRvIHRvU291cmNlKCksIGFkZCBwcm9wZXJ0eSBkZXNjcmlwdG9ycyB0byBgY2xhc3NgLCB2YXJpYWJsZXMgYW5kIGNvZGUgdG8gYG1ldGhvZGAsIGBnbG9iYWxgIHN0dWZmIGV0Y1xuXG5pbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIEdSUlIuLi4gd2lsbCBTT01FT05FIG9uIHRoZSBub2RlIHRlYW0gcGxlYXNlIGltcGxlbWVudCBjb25zb2xlLmdyb3VwID8/P1xuaWYgKCFjb25zb2xlLmdyb3VwKSBjb25zb2xlLmdyb3VwID0gY29uc29sZS5sb2c7XG5pZiAoIWNvbnNvbGUuZ3JvdXBFbmQpIGNvbnNvbGUuZ3JvdXBFbmQgPSBjb25zb2xlLmxvZztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblx0Ly8gU2V0IHRvIGB0cnVlYCB0byBvdXRwdXQgZGVidWcgaW5mbyB3aGlsZSBhZGRpbmcgcnVsZXNcblx0c3RhdGljIERFQlVHID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cblx0XHQvLyBDbG9uZSBydWxlcywgc3RhcnRpbmcgd2l0aCBhIGNvbXBsZXRlbHkgZW1wdHkgbWFwIGlmIG5vdCBkZWZpbmVkIChubyBzdGFuZGFyZCBvYmplY3Qga2V5cylcblx0XHR0aGlzLnJ1bGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnJ1bGVzIHx8IG51bGwpO1xuXHR9XG5cblx0Z2V0UnVsZShuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXNbbmFtZV07XG5cdH1cblxuLy9cbi8vIyMjIFBhcnNpbmdcbi8vXG5cdC8vIFBhcnNlIGBuYW1lYGQgcnVsZSBhdCBoZWFkIG9mIGBzdHJlYW1gIChgc3RyaW5nYCBvciBgVGV4dFN0cmVhbWApLlxuXHQvLyBIYW5kbGVzIG9wdGlvbmFsIGFuZCByZXBlYXRpbmcgcnVsZXMgYXMgd2VsbCBhcyBlYXRpbmcgd2hpdGVzcGFjZS5cblx0Ly8gUmV0dXJucyByZXN1bHQgb2YgcGFyc2UuXG5cdHBhcnNlKG5hbWUsIHN0cmVhbSkge1xuXHRcdGlmICh0eXBlb2Ygc3RyZWFtID09PSBcInN0cmluZ1wiKSBzdHJlYW0gPSBuZXcgVGV4dFN0cmVhbShzdHJlYW0pO1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZXIucGFyc2UoJHtuYW1lfSk6IFJ1bGUgbm90IGZvdW5kYCk7XG5cdFx0c3RyZWFtID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJ1bGUucGFyc2UodGhpcywgc3RyZWFtKTtcblx0fVxuXG5cdC8vIEVhdCB3aGl0ZXNwYWNlIChhY2NvcmRpbmcgdG8gYHJ1bGVzLndoaXRlc3BhY2VgKSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnMgbmV3IHN0cmVhbSBpZiB3ZSBtYXRjaGVkIHdoaXRlc3BhY2UsIG90aGVyd2lzZSB0aGUgc2FtZSBzdHJlYW0uXG5cdGVhdFdoaXRlc3BhY2Uoc3RyZWFtKSB7XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMucnVsZXMud2hpdGVzcGFjZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gc3RyZWFtO1xuXHRcdHJldHVybiBzdHJlYW0uYWR2YW5jZUJ5KHJlc3VsdC5tYXRjaGVkLmxlbmd0aCk7XG5cdH1cblxuXHQvLyBBZGQgYSBydWxlIHRvIG91ciBsaXN0IG9mIHJ1bGVzIVxuXHQvLyBDb252ZXJ0cyB0byBgYWx0ZXJuYXRpdmVzYCBvbiByZS1kZWZpbmluZyB0aGUgc2FtZSBydWxlLlxuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLnJ1bGVzW25hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtuYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZTogbmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdC8vIGNvcHkgYXJndW1lbnQgbmFtZSBvdmVyICg/Pz8pXG5cdFx0XHRcdGlmIChleGlzdGluZy5hcmd1bWVudCkgdGhpcy5ydWxlc1tuYW1lXS5hcmd1bWVudCA9IGV4aXN0aW5nLmFyZ3VtZW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JyB0byAnJHtuYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXS5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdC8vIGRvbid0IG92ZXJyaWRlIHJ1bGVOYW1lXG5cdFx0XHRpZiAoIXJ1bGUucnVsZU5hbWUpIHJ1bGUucnVsZU5hbWUgPSBuYW1lO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IHJ1bGU7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cblxuLy9cbi8vICMjIFV0aWxpdHkgbWV0aG9kc1xuLy9cblxuXHQvLyBGaW5kIHRoZSBtYXRjaGluZyBpbnN0YW5jZSBvZiBwb3NzaWJseSBuZXN0ZWQgYGVuZFRva2VuYCB0byBiYWxhbmNlIGBzdGFydFRva2VuYFxuXHQvL1x0aW4gYXJyYXkgb2YgYHRva2Vuc2AgKHN0cmluZ3MpLlxuXHQvLyBJZiBzdWNjZXNzZnVsLCByZXR1cm5zIGB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZSB9YFxuXHQvLyBUaHJvd3MgaWYgdW5zdWNlc3NmdWwuXG5cdHN0YXRpYyBmaW5kTmVzdGVkVG9rZW5zKHRva2Vucywgc3RhcnRUb2tlbiwgZW5kVG9rZW4sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0aWYgKHRva2Vuc1tzdGFydEluZGV4XSAhPT0gc3RhcnRUb2tlbikgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBFeHBlY3RlZCAnJHtzdGFydFRva2VufScgYXQgaW5kZXggJHtzdGFydEluZGV4fSBvZiB0b2tlbnNgKTtcblx0XHRsZXQgbmVzdGluZyA9IDA7XG5cdFx0bGV0IG5lc3RlZCA9IGZhbHNlO1xuXHRcdGZvciAobGV0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIDEsIGxhc3RJbmRleCA9IHRva2Vucy5sZW5ndGg7IGVuZEluZGV4IDwgbGFzdEluZGV4OyBlbmRJbmRleCsrKSB7XG5cdFx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbZW5kSW5kZXhdO1xuXHRcdFx0aWYgKHRva2VuID09PSBzdGFydFRva2VuKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdFx0bmVzdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b2tlbiA9PT0gZW5kVG9rZW4pIHtcblx0XHRcdFx0aWYgKG5lc3RpbmcgPT09IDApXG5cdFx0XHRcdFx0cmV0dXJuIHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlOiB0b2tlbnMuc2xpY2Uoc3RhcnRJbmRleCsxLCBlbmRJbmRleCksIG5lc3RlZCB9O1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgQ291bGRuJ3QgZmluZCBtYXRjaGluZyAnJHtlbmRUb2tlbn0ncyBzdGFydGluZyBhdCBpdGVtICR7c3RhcnRJbmRleH1gKTtcblx0fVxuXG5cblx0Ly8gTGlzdCBvZiBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gcmVndWxhciBleHByZXNzaW9ucy5cblx0Ly8gVXNlZCB0byBlc2NhcGUgdGhvc2UgY2hhcnMgd2hlbiBjcmVhdGluZyByZWd1bGFyIGV4cHJlc3Npb25zIGZyb20gc3RyaW5ncy5cblx0c3RhdGljIFJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlMgPSAoZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgY2hhcnMgPSB7fTtcblx0XHRcIlxcXFwvXiQqKz8uKCl8e30sW11cIi5zcGxpdChcIlwiKS5mb3JFYWNoKGNoYXIgPT4gY2hhcnNbY2hhcl0gPSB0cnVlKTtcblx0XHRyZXR1cm4gY2hhcnM7XG5cdH0pKClcblxuXHQvLyBHaXZlbiBhIFwibm9ybWFsXCIgYHN0cmluZ2AsIGVzY2FwZSBhbnkgcmVndWxhciBleHByZXNzaW9uIHNwZWNpYWwgY2hhcmFjdGVyc1xuXHQvL1x0c28gd2UgY2FuIGNyZWF0ZSBhIGBuZXcgUmVnRXhwKClgLlxuXHQvLyBBbHNvIGNvbnZlcnRzIGEgc2luZ2xlIHNwYWNlIHRvIGFyYml0cmFyeSBzZXQgb2Ygc3BhY2VzIHdpdGggXCJcXHMrXCJcblx0c3RhdGljIGVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSB7XG5cdFx0cmV0dXJuIHN0cmluZy5zcGxpdChcIlwiKS5tYXAoZnVuY3Rpb24gKGNoYXIsIGluZGV4LCBsaXN0KSB7XG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIGJhY2tzbGFzaFxuXHRcdFx0aWYgKGNoYXIgPT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCI7XG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIHNwYWNlXG5cdFx0XHRpZiAoY2hhciA9PT0gXCIgXCIpIHJldHVybiBcIlxcXFxzK1wiO1xuXHRcdFx0Ly8gSWYgYSBzcGVjaWFsIGNoYXIgYW5kIHByZXZpb3VzIGNoYXJhY3RlciB3YXMgbm90IGFuIGVzY2FwZSwgZXNjYXBlIHRoZSByZXN1bHQuXG5cdFx0XHRpZiAoUGFyc2VyLlJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlNbY2hhcl0gJiYgbGlzdFtpbmRleC0xXSAhPT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIitjaGFyO1xuXHRcdFx0Ly8gVGhpcyBjaGFyIHNob3VsZCBiZSBmaW5lIGJ5IGl0c2VsZi5cblx0XHRcdHJldHVybiBjaGFyO1xuXHRcdH0pLmpvaW4oXCJcIik7XG5cdH1cblxuXHQvLyBDcmVhdGUgYSBuZXcgcmVndWxhciBleHByZXNzaW9uIGZyb20gYSBcIm5vcm1hbFwiIHN0cmluZywgZXNjYXBpbmcgc3BlY2lhbCBjaGFyYWN0ZXJzIGFzIG5lY2Vzc2FyeS5cblx0c3RhdGljIFJlZ0V4cEZyb21TdHJpbmcoc3RyaW5nLCBmbGFncykge1xuXHRcdHJldHVybiBuZXcgUmVnRXhwKFBhcnNlci5lc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZyksIGZsYWdzKTtcblx0fVxuXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9QYXJzZXIuanMiLCIvL1x0IyBQYXJzZXIgUnVsZXNcbi8vXHRSdWxlcyBjYW4gYmUgYXMgc2ltcGxlIGFzIGEgc3RyaW5nIGBLZXl3b3JkYCBvciBhIGNvbXBsZXggc2VxdWVuY2Ugb2YgKG5lc3RlZCkgcnVsZXMuXG4vL1xuLy9cdFBhcnNlIGEgcnVsZSB3aXRoIGBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKWAsIHRoaXMgd2lsbCBlaXRoZXI6XG4vL1x0XHQtIHJldHVybiBgdW5kZWZpbmVkYCBpZiB0aGUgcnVsZSBkb2Vzbid0IG1hdGNoIHRoZSBoZWFkIG9mIHRoZSBzdHJlYW0sIG9yXG4vL1x0XHQtIHJldHVybiBhIENMT05FIG9mIHRoZSBydWxlIHdpdGggYXQgbGVhc3QgdGhlIGZvbGxvd2luZzpcbi8vXHRcdFx0LSBgc3RyZWFtYFx0XHRTdHJlYW0gd2hpY2ggd2FzIG1hdGNoZWQgd2l0aCBgc3RhcnRJbmRleGAgYXQgdGhlIHN0YXJ0IG9mIHRoZSBtYXRjaFxuLy9cdFx0XHQtIGBlbmRJbmRleGBcdE5vbi1pbmNsdXNpdmUgZW5kIGluZGV4IGluIHN0cmVhbSB3aGVyZSBtYXRjaCBlbmRzLlxuLy9cbi8vXHRUaGUgY2xvbmUgcmV0dXJuZWQgYWJvdmUgY2FuIGJlIG1hbmlwdWxhdGVkIHdpdGhcbi8vXHRcdC0gYHJ1bGUucmVzdWx0c2BcdFx0XHRSZXR1cm4gbWF0Y2hlZCBhcmd1bWVudHMgaW4gYSBmb3JtYXQgc3VpdGFibGUgdG8gZG86XG4vL1x0XHQtIGBydWxlLnRvU291cmNlKGNvbnRleHQpYFx0UmV0dXJuIGphdmFzY3JpcHQgc291cmNlIHRvIGludGVycHJldCB0aGUgcnVsZS5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKHRoaXMuY29uc3RydWN0b3IgIT09IFJ1bGUgfHwgIXRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLmhhc093blByb3BlcnR5KFwiY29uc3RydWN0b3JcIikpIHtcbi8vY29uc29sZS53YXJuKFwibm90IHJ1bGVcIiwgdGhpcyk7XG5cdFx0fVxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKC4uLnByb3BzKSB7XG5cdFx0bGV0IGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCAuLi5wcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuLy9cbi8vXHRQYXJzaW5nIHByaW1pdGl2ZXMgLS0geW91IE1VU1QgaW1wbGVtZW50IHRoZXNlIGluIHlvdXIgc3ViY2xhc3NlcyFcbi8vXG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHJ1bGUgaW4gdGhlIGBzdHJlYW1gLlxuXHQvLyBSZXR1cm5zIHJlc3VsdHMgb2YgdGhlIHBhcnNlIG9yIGB1bmRlZmluZWRgLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBJcyB0aGlzIHJ1bGUgZGV0ZXJtaW5pc3RpYywgZWc6IGNhbiBpdCBiZSBxdWlja2x5IGFuZCB1bmFtYmlndW91c2x5IHNhdGlzZmllZD9cblx0Ly8gUmV0dXJuaW5nIGB0cnVlYCBjYW4gc3BlZWQgdXAgc2VxdWVuY2UgcHJvY2Vzc2luZyxcblx0Ly9cdGJ1dCBpZiB5b3UncmUgcmVhbGx5IG5vdCBzdXJlLCByZXR1cm4gYHVuZGVmaW5lZGAuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIE5PVEU6IHlvdSBtYXkgd2FudCB0byBtZW1vaXplIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkO1xuXHR9XG5cbi8vXG4vLyAjIyBncm91cDogcmVmbGVjdGlvblxuLy9cblx0Z2V0IHJ1bGVUeXBlKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdH1cbn1cblxuXG5cblxuLy8gUmVnZXggcGF0dGVybi5cbi8vIGBydWxlLnBhdHRlcm5gIGlzIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2guXG4vL1xuLy8gTk9URVx0VG8gbWFrZSB0aGlzIG1vcmUgZ2VuZXJhbGx5IGFwcGxpY2FibGUsIGRvIE5PVCBzdGFydCB0aGUgcGF0dGVybiB3aXRoIGEgYF5gLlxuLy9cdFx0V2UnbGwgYXV0b21hdGljYWxseSBtYWtlIGEgY29weSBvZiB0aGUgUmVnRXhwIHdpdGggdGhlIHN0YXJ0IHBvaW50IGF0dGFjaGVkXG4vL1x0XHRhbmQgdXNlIHRoYXQgYXMgYXBwcm9wcmlhdGUuXG4vL1xuLy9cdFx0VGhpcyB3YXkgd2UgY2FuIHJlLXVzZSB0aGUgcmVnZXggdG8gY2hlY2sgZm9yIGEgbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLi4uXG4vL1xuLy8gWW91IGNhbiBvcHRpb25hbGx5IHNwZWNpZnkgYSBgcnVsZS5ibGFja2xpc3RgLCBhIHNldCBvZiBtYXRjaGVzIHdoaWNoIHdpbGwgc3BlY2lmaWNhbGx5IE5PVCB3b3JrLFxuLy9cdGVnIGZvciBgaWRlbnRpZmllci5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBwYXR0ZXJuYCBpcyByZXF1aXJlZFxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuUGF0dGVybigpOiBZb3UgbXVzdCBwYXNzIGEgYHBhdHRlcm5gIHBhcmFtZXRlclwiKTtcblxuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ3JlYXRlIGEgYHN0YXJ0UGF0dGVybmAgdG8gbWF0Y2ggYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3Ryb25nXG5cdFx0Ly8gQ3JlYXRlIG5vbi1lbnVtZXJhYmx5LlxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInN0YXJ0UGF0dGVyblwiLCB7IHZhbHVlOiBuZXcgUmVnRXhwKFwiXlwiICsgdGhpcy5wYXR0ZXJuLnNvdXJjZSkgfSk7XG5cdH1cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcGF0dGVybiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IG1hdGNoID0gc3RyZWFtLm1hdGNoKHRoaXMuc3RhcnRQYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYmFpbCBpZiBwcmVzZW50IGluIGJsYWNrbGlzdFxuXHRcdGxldCBtYXRjaGVkID0gbWF0Y2hbMF07XG5cdFx0aWYgKHRoaXMuYmxhY2tsaXN0ICYmIHRoaXMuYmxhY2tsaXN0W21hdGNoZWRdKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCArIG1hdGNoZWQubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBQYXR0ZXJucyBhcmUgQUxXQVlTIGRldGVybWluaXN0aWMuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0YWRkVG9CbGFja2xpc3QoLi4ud29yZHMpIHtcblx0XHRpZiAoIXRoaXMuYmxhY2tsaXN0KSB0aGlzLmJsYWNrbGlzdCA9IHt9O1xuXHRcdHdvcmRzLmZvckVhY2god29yZCA9PiB0aGlzLmJsYWNrbGlzdFt3b3JkXSA9IHRydWUpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMucGF0dGVybi5zb3VyY2U7XG5cdH1cbn1cblxuLy8gUnVsZSBmb3IgbGl0ZXJhbCBzdHJpbmcgdmFsdWUsIHdoaWNoIGluY2x1ZGUgcHVuY3R1YXRpb24gc3VjaCBhcyBgKGAgZXRjLlxuLy8gYFN5bWJvbGBzIGFyZSBkaWZmZXJlbnQgZnJvbSBgS2V5d29yZHNgIGluIHRoYXQgdGhleSBkbyBub3QgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkuXG4vL1RPRE86IHJlbmFtZSBgU3ltYm9sYD8/P1xuUnVsZS5TeW1ib2wgPSBjbGFzcyBTeW1ib2wgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHN0cmluZ2AgaXMgcmVxdWllZC5cblx0XHRpZiAoIXByb3BlcnRpZXMuc3RyaW5nKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuU3ltYm9sKCk6IEV4cGVjdGVkIHN0cmluZyBwcm9wZXJ0eVwiKTtcblxuXHRcdC8vIGNvbnZlcnQgc3RyaW5nIHRvIHBhdHRlcm5cblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikge1xuXHRcdFx0cHJvcGVydGllcy5wYXR0ZXJuID0gUGFyc2VyLlJlZ0V4cEZyb21TdHJpbmcocHJvcGVydGllcy5zdHJpbmcpO1xuLy9jb25zb2xlLmluZm8ocHJvcGVydGllcy5zdHJpbmcsIHByb3BlcnRpZXMucGF0dGVybik7XG5cdFx0fVxuXG4vL1x0XHRjb25zb2xlLmluZm8oXCJjcmVhdGluZyBzdHJpbmdcIiwgcHJvcGVydGllcyk7XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdH1cblxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cbi8vIE1lcmdlIHR3byBTeW1ib2wgcnVsZXMgdG9nZXRoZXIsIHJldHVybmluZyBhIG5ldyBydWxlIHRoYXQgbWF0Y2hlcyBib3RoLlxuUnVsZS5tZXJnZVN5bWJvbHMgPSBmdW5jdGlvbihmaXJzdCwgc2Vjb25kKSB7XG5cdHJldHVybiBuZXcgUnVsZS5TeW1ib2woeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cbi8vIEtleXdvcmQgcGF0dGVybi5cbi8vIFByb3BlcnRpZXM6XG4vL1x0LSBgcnVsZS5zdHJpbmdgIFx0KHJlcXVpcmVkKSBcdEtleXdvcmQgc3RyaW5nIHRvIG1hdGNoLlxuLy9cdC0gYHJ1bGUucGF0dGVybmBcdChvcHRpb25hbCkgXHRSZWdFeHAgZm9yIHRoZSBtYXRjaC5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0V2UnbGwgY3JlYXRlIG9uZSBmcm9tIGBzdHJpbmdgIGlmIG5lY2Vzc2FyeS5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0Tk9URTogZG8gTk9UIHN0YXJ0IHRoZSBgcGF0dGVybmAgd2l0aCBgXmAuXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLktleXdvcmQoKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gZGVyaXZlIGBwYXR0ZXJuYCBpZiBuZWNlc3NhcnkuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdC8vIGVuZm9yY2Ugd29yZCBib3VuZGFyaWVzIGFuZCBhbGxvdyBhcmJpdHJhcnkgc3BhY2UgYmV0d2VlbiB3b3Jkc1xuXHRcdFx0bGV0IHBhdHRlcm5TdHJpbmcgPSBQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhwcm9wZXJ0aWVzLnN0cmluZyk7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKFwiXFxcXGJcIiArIHBhdHRlcm5TdHJpbmcgKyBcIlxcXFxiXCIpO1xuXHRcdH1cblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuLy8gTWVyZ2UgdHdvIEtleXdvcmQgcnVsZXMgdG9nZXRoZXIsIGFkZGluZyB0aGUgc2Vjb25kIHRvIHRoZSBmaXJzdC5cblJ1bGUubWVyZ2VLZXl3b3JkcyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0cmV0dXJuIG5ldyBSdWxlLktleXdvcmQoeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIFwiIFwiICsgc2Vjb25kLnN0cmluZyB9KTtcbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGUodGhpcy5ydWxlKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQXR0ZW1wdGluZyB0byBwYXJzZSB1bmtub3duIHJ1bGUgJyR7dGhpcy5ydWxlfSdgKTtcblx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIG1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gbWF0Y2g7XG5cdH1cblxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlKHRoaXMucnVsZSk7XG5cdFx0aWYgKCFydWxlKSByZXR1cm4gZmFsc2U7XG5cdFx0cmV0dXJuIHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgeyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlfX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuXG4vLyBBYnN0cmFjdDogIGBOZXN0ZWRgIHJ1bGUgLS0gY29tcG9zZWQgb2YgYSBzZXJpZXMgb2Ygb3RoZXIgYHJ1bGVzYC5cblJ1bGUuTmVzdGVkID0gY2xhc3MgTmVzdGVkIGV4dGVuZHMgUnVsZSB7XG5cblx0Ly8gSXMgdGhpcyBkZXRlcm1pbmlzdGljLCBlZzogYXJlIG91ciBzdWJydWxlcyB1bmFtYmlnb3VzbHkgZGV0ZXJtaW5hYmxlP1xuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlcy5ldmVyeShydWxlID0+IHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSk7XG5cdH1cbn1cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaCAoYXV0by1leGNsdWRpbmcgd2hpdGVzcGFjZSkuXG5SdWxlLlNlcXVlbmNlID0gY2xhc3MgU2VxdWVuY2UgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IG1hdGNoZWQgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghbWF0Y2ggJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdFx0bmV4dCA9IG1hdGNoLm5leHQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuLy9UT0RPQ1xuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGBtYXRjaGVkYCBhcnJheSBpbmRleGVkIGJ5XG5cdC8vXHRcdC0gYG1hdGNoLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYG1hdGNoLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIGBydWxlIHR5cGVgOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRpZiAoIXRoaXMuX3Jlc3VsdHMpIHtcblx0XHRcdGxldCByZXN1bHRzID0gdGhpcy5fcmVzdWx0cyA9IHt9O1xuXHRcdFx0Zm9yIChsZXQgbWF0Y2ggb2YgdGhpcy5tYXRjaGVkKSB7XG5cdFx0XHRcdGxldCBhcmdOYW1lID0gbWF0Y2guYXJndW1lbnQgfHwgbWF0Y2gucnVsZU5hbWUgfHwgbWF0Y2guY29uc3RydWN0b3IubmFtZTtcblxuXHRcdFx0XHQvLyBJZiBhcmcgYWxyZWFkeSBleGlzdHMsIGNvbnZlcnQgdG8gYW4gYXJyYXlcblx0XHRcdFx0aWYgKGFyZ05hbWUgaW4gcmVzdWx0cykge1xuXHRcdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShyZXN1bHRzW2FyZ05hbWVdKSkgcmVzdWx0c1thcmdOYW1lXSA9IFtyZXN1bHRzW2FyZ05hbWVdXTtcblx0XHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdLnB1c2gobWF0Y2gpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0gPSBtYXRjaDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5fcmVzdWx0cztcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnJ1bGVzLmpvaW4oXCIgXCIpfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cblxufVxuXG4vLyBTeW50YWN0aWMgc3VnYXIgZm9yIGRlYnVnZ2luZ1xuUnVsZS5FeHByZXNzaW9uID0gY2xhc3MgZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICh0aGlzLmRvbnRSZWN1cnNlKSB7XG4vL2NvbnNvbGUud2FybihcIk5PVCByZWN1cnNpbmcgaW50byBcIiwgdGhpcyk7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHQvLyBJZiB0aGUgZXhwcmVzc2lvbiBpcyBsZWZ0UmVjdXJzaXZlLCBzZXQgYSBmbGFnIHNvIHdlIGRvbid0IGF0dGVtcHQgdG8gcmVjdXJzZSBpbnRvIGl0IGFnYWluLlxuLy9UT0RPOiB0aGlzIGlzIGRhbmdlcm91czogYW4gZXhjZXB0aW9uIHdpbGwgbGVhdmUgdGhlIGZsYWcgc2V0Li4uXG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0dGhpcy5kb250UmVjdXJzZSA9IHRydWU7XG4vL2NvbnNvbGUud2FybihcIlNldHRpbmcgZG9udFJlY3Vyc2UgZm9yXCIsIHRoaXMpO1xuXHRcdH1cblx0XHRsZXQgbWF0Y2ggPSBzdXBlci5wYXJzZShwYXJzZXIsIHN0cmVhbSk7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkgZGVsZXRlIHRoaXMuZG9udFJlY3Vyc2U7XG5cdFx0cmV0dXJuIG1hdGNoO1xuXHR9XG59XG5cblxuLy8gU3RhdGVtZW50cyB0YWtlIHVwIHRoZSBlbnRpcmUgbGluZS5cblJ1bGUuU3RhdGVtZW50ID0gY2xhc3Mgc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIEFsdGVybmF0aXZlIHN5bnRheCwgbWF0Y2hpbmcgb25lIG9mIGEgbnVtYmVyIG9mIGRpZmZlcmVudCBydWxlcy5cbi8vIFRoZSByZXN1bHQgb2YgYSBwYXJzZSBpcyB0aGUgbG9uZ2VzdCBydWxlIHRoYXQgYWN0dWFsbHkgbWF0Y2hlZC5cbi8vIE5PVEU6IEN1cnJlbnRseSB0YWtlcyB0aGUgbG9uZ2VzdCB2YWxpZCBtYXRjaC5cbi8vIFRPRE86IG1hdGNoIGFsbCB2YWxpZCBhbHRlcm5hdGl2ZXNcbi8vIFRPRE86IHJlbmFtZT9cblJ1bGUuQWx0ZXJuYXRpdmVzID0gY2xhc3MgQWx0ZXJuYXRpdmVzIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKTtcblx0XHRpZiAoIXRoaXMucnVsZXMpIHRoaXMucnVsZXMgPSBbXTtcblx0fVxuXG5cdC8vIEZpbmQgdGhlIExPTkdFU1QgbWF0Y2hcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgYmVzdE1hdGNoO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSk7XG5cdFx0XHRpZiAoIW1hdGNoKSBjb250aW51ZTtcblxuXHRcdFx0Ly8gdGFrZSB0aGUgbG9uZ2VzdCBtYXRjaFxuXHRcdFx0aWYgKCFiZXN0TWF0Y2ggfHwgbWF0Y2guZW5kSW5kZXggPiBiZXN0TWF0Y2guZW5kSW5kZXgpXG5cdFx0XHRcdGJlc3RNYXRjaCA9IG1hdGNoO1xuXHRcdH1cblx0XHRpZiAoIWJlc3RNYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGFzc2lnbiBgYXJnTmFtZWAgb3IgYHJ1bGVOYW1lYCBmb3IgYHJlc3VsdHNgXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIGJlc3RNYXRjaC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0ZWxzZSBpZiAodGhpcy5ydWxlTmFtZSkgYmVzdE1hdGNoLnJ1bGVOYW1lID0gdGhpcy5ydWxlTmFtZTtcbi8vVE9ETzogb3RoZXIgdGhpbmdzIHRvIGNvcHkgaGVyZT8/P1xuXHRcdHJldHVybiBiZXN0TWF0Y2g7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZShjb250ZXh0KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5tYXRjaGVkYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgbmV4dCA9IHN0cmVhbTtcblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgbWF0Y2ggPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghbWF0Y2gpIGJyZWFrO1xuXG5cdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0bmV4dCA9IG1hdGNoLm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAobWF0Y2hlZC5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBhcnJheSB3aXRoIGFyZ3VtZW50cyBvZiBhbGwgcmVzdWx0cy5cblx0Ly8gTk9URTogbWVtb2l6ZXMgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLl9yZXN1bHRzIHx8ICh0aGlzLl9yZXN1bHRzID0gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gucmVzdWx0cyApKTtcblxuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0dGhyb3cgXCJEb24ndCB1bmRlcnN0YW5kIGhvdyB0byBzb3VyY2UgUnVsZS5SZXBlYXQhXCI7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRjb25zdCBydWxlID0gKHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UgfHwgdGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHRoaXMucnVsZS5zdHJpbmcuaW5jbHVkZXMoXCIgXCIpXG5cdFx0XHRcdCAgID8gYCgke3RoaXMucnVsZX0pYFxuXHRcdFx0XHQgICA6IGAke3RoaXMucnVsZX1gXG5cdFx0XHRcdCk7XG5cdFx0cmV0dXJuIGAke3J1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe251bWJlcn0sXWAgdG8gbWF0Y2ggYDEsMiwzYFxuLy9cdGBydWxlLml0ZW1gIGlzIHRoZSBydWxlIGZvciBlYWNoIGl0ZW0sXG4vL1x0YHJ1bGUuZGVsaW1pdGVyYCBpcyB0aGUgZGVsaW1pdGVyIGJldHdlZW4gZWFjaCBpdGVtLlxuLy8gXHRgcnVsZS5tYXRjaGVkYCBpbiB0aGUgb3V0cHV0IGlzIHRoZSBsaXN0IG9mIHZhbHVlcy5cbi8vXG4vL1xuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYSBMaXN0IHJ1bGUgd2lsbCBOT1QgcmVwZWF0ICg/Pz8/KVxuUnVsZS5MaXN0ID0gY2xhc3MgTGlzdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdC8vIGVuc3VyZSBpdGVtIGFuZCBkZWxpbWl0ZXIgYXJlIG9wdGlvbmFsIHNvIHdlIGRvbid0IGJhcmYgaW4gYHBhcnNlUnVsZWBcblx0XHR0aGlzLml0ZW0ub3B0aW9uYWwgPSB0cnVlO1xuXHRcdHRoaXMuZGVsaW1pdGVyLm9wdGlvbmFsID0gdHJ1ZTtcblxuXHRcdGxldCBtYXRjaGVkID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBuZXh0IGl0ZW0sIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgaXRlbSA9IHRoaXMuaXRlbS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFpdGVtKSBicmVhaztcbi8vY29uc29sZS5sb2coaXRlbSk7XG5cdFx0XHRtYXRjaGVkLnB1c2goaXRlbSk7XG5cdFx0XHRuZXh0ID0gaXRlbS5uZXh0KCk7XG5cblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBkZWxpbWl0ZXIsIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgZGVsaW1pdGVyID0gdGhpcy5kZWxpbWl0ZXIucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghZGVsaW1pdGVyKSBicmVhaztcblx0XHRcdG5leHQgPSBkZWxpbWl0ZXIubmV4dCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBtYXRjaGVkWzBdID8gbWF0Y2hlZFswXS5zdGFydEluZGV4IDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gbWF0Y2hlZCBpdGVtIGJ5IGluZGV4XG5cdGdldEl0ZW0oaW5kZXgpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkW2luZGV4XTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcdFx0Ly8gVE9ETzogdGhyb3c/Pz9cblx0XHRsZXQgbWF0Y2hlZCA9IHRoaXMubWF0Y2hlZC5tYXAoIG1hdGNoID0+IG1hdGNoLnRvU291cmNlKGNvbnRleHQpICkuam9pbihcIiwgXCIpO1xuXHRcdHJldHVybiBgWyR7bWF0Y2hlZH1dYDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgWyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5pdGVtfSAke3RoaXMuZGVsaW1pdGVyfV0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZS5qcyIsImltcG9ydCB7IGRlZmluZU1lbW9pemVkIH0gZnJvbSBcIi4vbWVtb2l6ZS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gcmUtZXhwb3J0IFJ1bGUgZm9yIHRlc3RpbmdcbmV4cG9ydCBkZWZhdWx0IFJ1bGU7XG5cbi8vXG4vL1x0IyBQYXJzaW5nIGBydWxlU3ludGF4YCB0byBjcmVhdGUgcnVsZXMgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUT0RPOlx0UHVsbCBgcGFyc2VSdWxlU3ludGF4YCBzdHVmZiBvdXQgaW50byBzZXBhcmF0ZSBtb2R1bGU/XG4vLyBUT0RPOlx0QmV0dGVyIG5hbWUgZm9yIGBydWxlU3ludGF4YFxuLy8gVE9ETzpcdFVzZSBrZXl3b3JkcyBpbiBzeW50YXggdG8gbWFrZSBhIHF1aWNrIHJlZ2V4LWJhc2VkIGB0ZXN0YCBmdW5jdGlvbiBmb3IgdGhlIGVudGlyZSBydWxlXG5PYmplY3QuYXNzaWduKFJ1bGUsIHtcblxuLy9cbi8vICMjIGdyb3VwOiBwYXJzaW5nIHN5bnRheFxuLy9cblxuLy8gVE9ETzogY29udmVydCB0byBUZXh0U3RyZWFtIHBhdHRlcm4gYWxhIG5vcm1hbCBwYXJzZXIgb25jZSB0aGF0IHNldHRsZXMgZG93bj8/P1xuXHRwYXJzZVJ1bGVTeW50YXgoc3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIFtdKTtcblxuXHRcdGxldCBydWxlO1xuXHRcdC8vIElmIHdlIG9ubHkgZ290IG9uZSB0aGluZywgcmV0dXJuIHRoYXQgYXMgdGhlIHJlc3VsdFxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSBydWxlc1swXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFNlcXVlbmNlQ29uc3RydWN0b3IoeyBydWxlcyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fSxcblxuXHR0b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KSB7XG5cdFx0Y29uc3QgU1lOVEFYX0VYUFJFU1NJT04gPSAvKD86W1xcd1xcLV0rfFxcXFxbXFxbXFwoXFx7XFwpXFx9XFxdXXxbXlxcc1xcd118XFx8KS9nO1xuXHRcdHZhciBzeW50YXhTdHJlYW0gPSBzeW50YXgubWF0Y2goU1lOVEFYX0VYUFJFU1NJT04pO1xuXHRcdGlmICghc3ludGF4U3RyZWFtKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHRva2VuaXplIHBhcnNlIHJ1bGUgc3ludGF4ID4+JHtzeW50YXh9PDxgKTtcblx0XHRyZXR1cm4gc3ludGF4U3RyZWFtO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbGFzdEluZGV4ID0gc3ludGF4U3RyZWFtLmxlbmd0aDtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKHJ1bGUpIHtcblx0XHRcdFx0dmFyIGxhc3QgPSBydWxlc1tydWxlcy5sZW5ndGgtMV07XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgU3RyaW5nYCBhbmQgbGFzdCB3YXMgYSBgU3RyaW5nYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0aWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG5cdFx0XHRcdFx0cnVsZXMucG9wKCk7XG5cdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG5cdFx0XHRcdFx0cnVsZSA9IFJ1bGUubWVyZ2VTeW1ib2xzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgS2V5d29yZGAgYW5kIGxhc3Qgd2FzIGFsc28gYSBgS2V5d29yZGAsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGVsc2UgaWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkKSB7XG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBsYXN0IHJ1bGVcblx0XHRcdFx0XHRydWxlcy5wb3AoKTtcblx0XHRcdFx0XHQvLyBhbmQgcmVwbGFjZSB3aXRoIGEgcnVsZSB0aGF0IG1lcmdlcyB0aGUga2V5d29yZHNcblx0XHRcdFx0XHRydWxlID0gUnVsZS5tZXJnZUtleXdvcmRzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJ1bGVzLnB1c2gocnVsZSk7XG5cdFx0XHR9XG5cdFx0XHRzdGFydEluZGV4ID0gZW5kSW5kZXggKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZXM7XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0dmFyIHN5bnRheFRva2VuID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXG5cdFx0Ly8gaWYgd2UgZ290IGEgXCJcXFxcXCIgKHdoaWNoIGFsc28gaGFzIHRvIGdvIGludG8gdGhlIHNvdXJjZSBzdHJpbmcgYXMgXCJcXFxcXCIpXG5cdFx0Ly8gdHJlYXQgdGhlIG5leHQgdG9rZW4gYXMgYSBsaXRlcmFsIHN0cmluZyByYXRoZXIgdGhhbiBhcyBhIHNwZWNpYWwgY2hhcmFjdGVyLlxuXHRcdGlmIChzeW50YXhUb2tlbiA9PT0gXCJcXFxcXCIpIHtcblx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCArIDEpO1xuXHRcdH1cblxuXHRcdHN3aXRjaCAoc3ludGF4VG9rZW4pIHtcblx0XHRcdGNhc2UgXCJ7XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIoXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiW1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKlwiOlxuXHRcdFx0Y2FzZSBcIitcIjpcblx0XHRcdGNhc2UgXCI/XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0XHQvLyB0aGUgZm9sbG93aW5nIHNob3VsZCBBTFdBWVMgYmUgY29uc3VtZWQgYnkgdGhlIGFib3ZlXG5cdFx0XHRjYXNlIFwifVwiOlxuXHRcdFx0Y2FzZSBcIilcIjpcblx0XHRcdGNhc2UgXCJdXCI6XG5cdFx0XHRjYXNlIFwifFwiOlxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgJHtzeW50YXhUb2tlbn0gZm91bmQgYXMgaXRlbSAke3N0YXJ0SW5kZXh9IG9mICR7dGhpcy5zeW50YXh9YCk7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzdHJpbmcgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF0sIHJ1bGU7XG5cdFx0Ly8gSWYgbGV0dGVycyBvbmx5LCBtYXRjaCBhcyBhIEtleXdvcmQgKHNvIHdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGFmdGVyIHRoZSBzdHJpbmcpLlxuXHRcdGlmIChzdHJpbmcubWF0Y2goL1tBLVphLXpdKy8pKSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuS2V5d29yZCh7IHN0cmluZyB9KTtcblx0XHR9XG5cdFx0Ly8gT3RoZXJ3aXNlIG1hdGNoIGFzIGEgU3RyaW5nLCB3aGljaCBkb2Vzbid0IHJlcXVpcmUgbm9uLXdvcmQgY2hhcnMgYWZ0ZXIgdGhlIHRleHQuXG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuU3ltYm9sKHsgc3RyaW5nOiBzdHJpbmcgfSk7XG5cdFx0XHQvLyBJZiBzdHJpbmcgc3RhcnRzIHdpdGggYFxcXFxgLCBpdCdzIGFuIGVzY2FwZWQgbGl0ZXJhbCAoZWc6IGBcXFtgIG5lZWRzIHRvIGlucHV0IGFzIGBcXFxcW2ApLlxuXHRcdFx0aWYgKHN0cmluZy5zdGFydHNXaXRoKFwiXFxcXFwiKSkge1xuXHRcdFx0XHQvLyByZW1vdmUgbGVhZGluZyBzbGFzaCBpbiBtYXRjaCBzdHJpbmcuLi5cblx0XHRcdFx0cnVsZS5zdHJpbmcgPSBydWxlLnN0cmluZy5zdWJzdHIoMSk7XG5cdFx0XHRcdC8vIGJ1dCBsZWF2ZSBpdCBpbiB0b1N0cmluZ1xuXHRcdFx0XHRydWxlLnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gWyBydWxlLCBzdGFydEluZGV4IF07XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBncm91cGluZyBleHByZXNzaW9uIGAoLi4ufC4uLilgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0Ly8gTk9URTogbmVzdGVkIHBhcmVucyBtYXkgbm90IGhhdmUgYWx0ZXJuYXRpdmVzLi4uIDotKCAgIGAoYXwoYnxjKSlgIHdvbid0IHdvcms/Pz9cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCIoXCIsIFwiKVwiLCBzdGFydEluZGV4KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHQvLyBzcGxpdCBpbnRvIGdyb3VwcywgaW5jbHVkaW5nIG5lc3RlZCBwYXJlbnNcblx0XHRsZXQgYWx0ZXJuYXRpdmVzID1cblx0XHRcdGdyb3VwQWx0ZXJuYXRpdmVzKHNsaWNlKVxuXHRcdFx0Lm1hcChmdW5jdGlvbihncm91cCkge1xuXHRcdFx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2Vucyhncm91cCwgW10pO1xuXHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0c1swXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IFJ1bGUuU2VxdWVuY2UoeyBydWxlczogcmVzdWx0cyB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRsZXQgcnVsZSA9IGFsdGVybmF0aXZlcy5sZW5ndGggPT09IDEgPyBhbHRlcm5hdGl2ZXNbMF0gOiBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlczogYWx0ZXJuYXRpdmVzIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cblx0XHRmdW5jdGlvbiBncm91cEFsdGVybmF0aXZlcyh0b2tlbnMpIHtcblx0XHRcdHZhciBhbHRlcm5hdGl2ZXMgPSBbXTtcblx0XHRcdHZhciBjdXJyZW50ID0gW107XG5cdFx0XHRmb3IgKHZhciBpID0gMCwgdG9rZW47IHRva2VuID0gdG9rZW5zW2ldOyBpKyspIHtcblx0XHRcdFx0Ly8gaGFuZGxlIGFsdGVybmF0ZSBtYXJrZXJcblx0XHRcdFx0aWYgKHRva2VuID09PSBcInxcIikge1xuXHRcdFx0XHRcdGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBbXTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBoYW5kbGUgbmVzdGVkIHBhcmVuc1xuXHRcdFx0XHRlbHNlIGlmICh0b2tlbiA9PT0gXCIoXCIpIHtcblx0XHRcdFx0XHRsZXQgeyBlbmRJbmRleCB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBcIihcIiwgXCIpXCIsIGkpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBjdXJyZW50LmNvbmNhdCh0b2tlbnMuc2xpY2UoaSwgZW5kSW5kZXggKyAxKSk7XG5cdFx0XHRcdFx0aSA9IGVuZEluZGV4O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGN1cnJlbnQucHVzaCh0b2tlbik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChjdXJyZW50Lmxlbmd0aCkgYWx0ZXJuYXRpdmVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRyZXR1cm4gYWx0ZXJuYXRpdmVzO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCByZXBlYXQgaW5kaWNhdG9yIGA/YCwgYCtgIG9yIGAqYCBieSBhdHRhY2hpbmcgaXQgdG8gdGhlIHByZXZpb3VzIHJ1bGUuXG5cdHBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzeW1ib2wgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cdFx0dmFyIHJ1bGUgPSBydWxlc1tydWxlcy5sZW5ndGggLSAxXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgYXR0YWNoIHJlcGVhdCBzeW1ib2wgJHtzeW1ib2x9IHRvIGVtcHR5IHJ1bGUhYCk7XG5cblx0XHQvLyBUcmFuc2Zvcm0gbGFzdCBydWxlIGludG8gYSByZXBlYXQgZm9yIGAqYCBhbmQgYCtgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiKlwiIHx8IHN5bWJvbCA9PT0gXCIrXCIpIHtcblx0XHRcdGxldCBhcmd1bWVudCA9IHJ1bGUuYXJndW1lbnQ7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuUmVwZWF0KHsgcnVsZSB9KTtcblx0XHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdFx0Ly8gcHVzaCBpbnRvIHJ1bGUgc3RhY2sgaW4gcGxhY2Ugb2Ygb2xkIHJ1bGVcblx0XHRcdHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdID0gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBSdWxlIGlzIG9wdGlvbmFsIGZvciBgP2AgYW5kIGAqYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIj9cIiB8fCBzeW1ib2wgPT09IFwiKlwiKSB7XG5cdFx0XHRydWxlLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gWyB1bmRlZmluZWQsIHN0YXJ0SW5kZXggXVxuXHR9LFxuXG5cdC8vIE1hdGNoIGB7PHJ1bGVOYW1lPn1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCBtYXRjaCA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJ7XCIsIFwifVwiLCBzdGFydEluZGV4KTtcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA9PT0gMyAmJiBtYXRjaC5zbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gbWF0Y2guc2xpY2VbMF07XG5cdFx0XHRtYXRjaC5zbGljZSA9IG1hdGNoLnNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID4gMSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBwcm9jZXNzIHJ1bGVzIHdpdGggbW9yZSB0aGFuIG9uZSBydWxlIG5hbWU6IHske21hdGNoLnNsaWNlLmpvaW4oXCJcIil9fWApO1xuXG5cdFx0dmFyIHBhcmFtcyA9IHsgcnVsZTogbWF0Y2guc2xpY2VbMF0gfTtcblxuXHRcdC8vIHNlZSBpZiB0aGVyZSdzIGEgYG5vdGAgcnVsZSBpbiB0aGVyZVxuXHRcdGxldCBiYW5nUG9zaXRpb24gPSBwYXJhbXMucnVsZS5pbmRleE9mKFwiIVwiKTtcblx0XHRpZiAoYmFuZ1Bvc2l0aW9uICE9PSAtMSkge1xuXHRcdFx0cGFyYW1zLm5vdCA9IHBhcmFtcy5ydWxlLnN1YnN0cihiYW5nUG9zaXRpb24gKyAxKTsgLy9bIHBhcmFtcy5ydWxlLnN1YnN0cihiYW5nUG9zaXRpb24gKyAxKSBdO1xuXHRcdFx0cGFyYW1zLnJ1bGUgPSBwYXJhbXMucnVsZS5zdWJzdHIoMCwgYmFuZ1Bvc2l0aW9uKTtcblx0XHR9XG5cblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlN1YnJ1bGUocGFyYW1zKTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBtYXRjaC5lbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuTGlzdCgpO1xuXHRcdHJ1bGUuaXRlbSA9IHJlc3VsdHNbMF1cblx0XHRydWxlLmRlbGltaXRlciA9IHJlc3VsdHNbMV1cblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG59KTtcblxuXG5cbi8vICMjICBBZGQgbWV0aG9kcyB0byBQYXJzZXIgdG8gZGVmaW5lIHJ1bGVzIHVzaW5nIHRoZSBhYm92ZSBzeW50YXguXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhQYXJzZXIucHJvdG90eXBlLCB7XG5cblx0Ly8gUGFyc2UgYSBgcnVsZVN5bnRheGAgcnVsZSBhbmQgYWRkIGl0IHRvIG91ciBsaXN0IG9mIHJ1bGVzLlxuXHQvLyBSZXR1cm5zIHRoZSBuZXcgcnVsZS5cblx0Ly8gTG9ncyBwYXJzaW5nIGVycm9ycyBidXQgYWxsb3dzIHRoaW5ncyB0byBjb250aW51ZS5cblx0YWRkU3ludGF4OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdHRyeSB7XG5cdFx0XHRsZXQgcnVsZSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IpO1xuXHRcdFx0Ly8gUmVmbGVjdCB0aGUgcnVsZSBiYWNrIG91dCB0byBtYWtlIHN1cmUgaXQgbG9va3MgKG1vcmUgb3IgbGVzcykgdGhlIHNhbWVcblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRlZCBydWxlICcke25hbWV9JzpcXG4gIElOUFVUOiAke3J1bGVTeW50YXh9IFxcbiBPVVRQVVQ6ICR7cnVsZX1gKTtcblxuXHRcdFx0T2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5ncm91cChgRXJyb3IgcGFyc2luZyBzeW50YXggZm9yIHJ1bGUgJyR7bmFtZX0nOmApO1xuXHRcdFx0Y29uc29sZS5sb2coYHN5bnRheDogJHtydWxlU3ludGF4fWApO1xuXHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHR9XG5cdH19LFxuXG5cdGFkZFN0YXRlbWVudDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU3RhdGVtZW50KSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBTZXF1ZW5jZUNvbnN0cnVjdG9yKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkRXhwcmVzc2lvbjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuRXhwcmVzc2lvbikge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgU2VxdWVuY2VDb25zdHJ1Y3Rvcik7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHJ1bGUpO1xuXHR9fSxcblxuXHQvLyBBZGQgaW5maXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIG9yIGJcIi5cblx0Ly8gTk9URTogaWYgeW91IGhhdmUgbW9yZSB0aGFuIG9uZSBtYXRjaGluZyBvcGVyYXRvcixcblx0Ly9cdFx0IHBhc3MgaW4gYW4gYXJyYXkgb2Ygc2ltcGxlIHN0cmluZ3Mgc28gYWxsIG9mIG91ciBvcGVyYXRvcnMgYXJlIHNpbXBsZSBzdHJpbmdzLlxuXHRhZGRJbmZpeE9wZXJhdG9yOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpIHtcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkSW5maXhPcGVyYXRvcihuYW1lLCBzeW50YXgsIHByb3BlcnRpZXMpKTtcblx0XHR9XG5cblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudG9KUykge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBpbmZpeCBvcGVyYXRvciBydWxlICcke25hbWV9JyB0byBzcGVjaWZ5ICd0b0pTJyBmdW5jdGlvbmApXG5cdFx0XHR9XG5cdFx0XHQvLyBjbGVhciBsaXN0IG9mIGluZml4IG9wZXJhdG9ycyBmb3IgZ2V0dGVyIGJlbG93XG5cdFx0XHRkZWxldGUgdGhpcy5fX2luZml4T3BlcmF0b3JzO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcImluZml4X29wZXJhdG9yXCIsIHJ1bGUpO1xuXHRcdH1cblx0fX0sXG5cblx0Ly8gTGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgYXMgc3RyaW5ncy5cblx0Ly8gUmUtbWVtb2l6ZWQgYWZ0ZXIgYGFkZEluZml4T3BlcmF0b3JgIGFib3ZlLlxuXHRpbmZpeE9wZXJhdG9yczogZGVmaW5lTWVtb2l6ZWQoXCJfX2luZml4T3BlcmF0b3JzXCIsXG5cdFx0ZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnJ1bGVzW1wiaW5maXhfb3BlcmF0b3JcIl1cblx0XHRcdFx0XHRcdCAmJiB0aGlzLnJ1bGVzW1wiaW5maXhfb3BlcmF0b3JcIl0ucnVsZXMubWFwKHJ1bGUgPT4gcnVsZS5zdHJpbmcpXG5cdH0pLFxuXG5cdC8vIEFkZCBwb3N0Zml4IG9wZXJhdG9yLCBzdWNoIGFzIFwiYSBpcyBkZWZpbmVkXCJcblx0Ly8gTk9URTogaWYgeW91IGhhdmUgbW9yZSB0aGFuIG9uZSBtYXRjaGluZyBvcGVyYXRvcixcblx0Ly9cdFx0IHBhc3MgaW4gYW4gYXJyYXkgb2Ygc2ltcGxlIHN0cmluZ3Mgc28gYWxsIG9mIG91ciBvcGVyYXRvcnMgYXJlIHNpbXBsZSBzdHJpbmdzLlxuXHRhZGRQb3N0Zml4T3BlcmF0b3I6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSkge1xuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRQb3N0Zml4T3BlcmF0b3IobmFtZSwgc3ludGF4LCBwcm9wZXJ0aWVzKSk7XG5cdFx0fVxuXG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkge1xuXHRcdFx0aWYgKCFydWxlLnRvSlMpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgcG9zdGZpeCBvcGVyYXRvciBydWxlICcke25hbWV9JyB0byBzcGVjaWZ5ICd0b0pTJyBmdW5jdGlvbmApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gY2xlYXIgbGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgZm9yIGdldHRlciBiZWxvd1xuXHRcdFx0ZGVsZXRlIHRoaXMuX19wb3N0Zml4T3BlcmF0b3JzO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcInBvc3RmaXhfb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIHBvc3RmaXggb3BlcmF0b3JzIGFzIHN0cmluZ3MuXG5cdC8vIFJlLW1lbW9pemVkIGFmdGVyIGBhZGRJbmZpeE9wZXJhdG9yYCBhYm92ZS5cblx0cG9zdGZpeE9wZXJhdG9yczogZGVmaW5lTWVtb2l6ZWQoXCJfX3Bvc2ZpeE9wZXJhdG9yc1wiLFxuXHRcdGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0JiYgdGhpcy5ydWxlc1tcInBvc3RmaXhfb3BlcmF0b3JcIl0ucnVsZXMubWFwKHJ1bGUgPT4gcnVsZS5zdHJpbmcpO1xuXHR9KVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZVN5bnRheC5qcyIsIi8vXG4vL1x0IyBDb3JlIGBydWxlc2AgLS0gc2ltcGxlIGRhdGF0eXBlcywgZXRjLlxuLy9cbi8vIE5PVEU6IG1hbnkgb2YgdGhlIGJlbG93IGFyZSBjcmVhdGVkIGFzIGN1c3RvbSBQYXR0ZXJuIHN1YmNsYXNzZXMgZm9yIGRlYnVnZ2luZy5cbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGB3aGl0ZXNwYWNlYCBydWxlLlxuLy8gTk9URSBgcGFyc2VyLnBhcnNlKFwid2hpdGVzcGFjZVwiLCBcIiAgIFwiKWAgd2lsbCByZXR1cm4gYHVuZGVmaW5lZGBcbi8vXHRcdCBiZWNhdXNlIGBwYXJzZXIucGFyc2UoKWAgYXV0b21hdGljYWxseSBlYXRzIHdoaXRlc3BhY2UgYXQgdGhlIHN0YXJ0IG9mIGEgcnVsZS5cblJ1bGUuV2hpdGVzcGFjZSA9IGNsYXNzIHdoaXRlc3BhY2UgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge31cbnBhcnNlci5hZGRSdWxlKFwid2hpdGVzcGFjZVwiLCBuZXcgUnVsZS5XaGl0ZXNwYWNlKHsgcGF0dGVybjogL1xccysvLCBvcHRpb25hbDogdHJ1ZSB9KSk7XG5cbi8vIGBpZGVudGlmaWVyYCA9IHZhcmlhYmxlcyBvciBwcm9wZXJ0eSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGEgbG93ZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLklkZW50aWZpZXIgPSBjbGFzcyBpZGVudGlmaWVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IGlkZW50aWZpZXIgPSBwYXJzZXIuYWRkUnVsZShcImlkZW50aWZpZXJcIiwgbmV3IFJ1bGUuSWRlbnRpZmllcih7XG5cdHBhdHRlcm46IC9bYS16XVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBpZGVudGlmaWVyKTtcblxuLy8gQWRkIEVuZ2xpc2ggcHJlcG9zaXRpb25zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy9cbi8vIFdpa2lwZWRpYSBcIlByZXBvc2l0aW9uXCI6XG4vL1x0XCJQcmVwb3NpdGlvbnMuLi5hcmUgYSBjbGFzcyBvZiB3b3JkcyB0aGF0XG4vL1x0ZXhwcmVzcyBzcGF0aWFsIG9yIHRlbXBvcmFsIHJlbGF0aW9ucyAgKGluLCB1bmRlciwgdG93YXJkcywgYmVmb3JlKVxuLy9cdG9yIG1hcmsgdmFyaW91cyBzZW1hbnRpYyByb2xlcyAob2YsIGZvcikuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFib3V0XCIsIFwiYWJvdmVcIiwgXCJhZnRlclwiLCBcImFuZFwiLCBcImFzXCIsIFwiYXRcIixcblx0XCJiZWZvcmVcIiwgXCJiZWhpbmRcIiwgXCJiZWxvd1wiLCBcImJlbmVhdGhcIiwgXCJiZXNpZGVcIiwgXCJiZXR3ZWVuXCIsIFwiYmV5b25kXCIsIFwiYnlcIixcblx0XCJkZWZpbmVkXCIsIFwiZG93blwiLCBcImR1cmluZ1wiLFxuXHRcImVhY2hcIiwgXCJlbXB0eVwiLCBcImV4YWN0bHlcIiwgXCJleGNlcHRcIixcblx0XCJmb3JcIiwgXCJmcm9tXCIsXG5cdFwiZ3JlYXRlclwiLFxuXHRcImluXCIsIFwiaW50b1wiLFxuXHRcImxlc3NcIiwgXCJsb25nXCIsXG5cdFwibWludXNcIiwgXCJtb3JlXCIsXG5cdFwibmVhclwiLCBcIm5vdFwiLFxuXHRcIm9mXCIsIFwib2ZmXCIsIFwib25cIiwgXCJvbnRvXCIsIFwib3Bwb3NpdGVcIiwgXCJvdXRcIiwgXCJvdXRzaWRlXCIsIFwib3ZlclwiLFxuXHRcInNob3J0XCIsIFwic2luY2VcIixcblx0XCJ0aGFuXCIsIFwidGhlblwiLCBcInRocm91Z2hcIiwgXCJ0aHJ1XCIsIFwidG9cIiwgXCJ0b3dhcmRcIiwgXCJ0b3dhcmRzXCIsXG5cdFwidW5kZWZpbmVkXCIsIFwidW5kZXJcIiwgXCJ1bmRlcm5lYXRoXCIsIFwidW5pcXVlXCIsIFwidW50aWxcIiwgXCJ1cFwiLCBcInVwb25cIiwgXCJ1cHNpZGVcIixcblx0XCJ2ZXJzdXNcIiwgXCJ2c1wiLFxuXHRcIndpdGhcIiwgXCJ3aXRoaW5cIiwgXCJ3aXRob3V0XCIsXG4pO1xuXG4vLyBBZGQgY29tbW9uIGVuZ2xpc2ggdmVyYnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhcmVcIixcblx0XCJkb1wiLCBcImRvZXNcIixcblx0XCJjb250YWluc1wiLFxuXHRcImhhc1wiLCBcImhhdmVcIixcblx0XCJpc1wiLFxuXHRcInJlcGVhdFwiLFxuXHRcIndhc1wiLCBcIndlcmVcIlxuKTtcblxuLy8gQWRkIHNwZWNpYWwgY29udHJvbCBrZXl3b3JkcyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImVsc2VcIixcblx0XCJpZlwiLFxuXHRcIm90aGVyd2lzZVwiLFxuXHRcIndoaWxlXCJcbik7XG5cbi8vIGBUeXBlYCA9IHR5cGUgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhbiB1cHBlci1jYXNlIGxldHRlciAoPylcblJ1bGUuVHlwZSA9IGNsYXNzIHR5cGUgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgdHlwZSA9IHBhcnNlci5hZGRSdWxlKFwidHlwZVwiLCBuZXcgUnVsZS5UeXBlKHtcblx0cGF0dGVybjogL1tBLVpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHR5cGUpO1xuXG5cbi8vIGBudW1iZXJgIGFzIGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG5SdWxlLk51bWJlciA9IGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBudW1iZXIgPSBwYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgUnVsZS5OdW1iZXIoe1xuXHRwYXR0ZXJuOiAvLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIG51bWJlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUZsb2F0KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgbnVtYmVyKTtcblxuXG4vLyBOdW1lcmljIGBpbnRlZ2VyYCBvbmx5LCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBOT1RFOiB0aGlzIFdJTEwgbWF0Y2ggYSBmbG9hdCwgYnV0IHRoZSByZXR1cm5lZCB2YWx1ZSB3aWxsIGNvZXJjZSB0byBhbiBpbnRlZ2VyLlxuLy8gUkVWSUVXOiBpcyB0aGlzIHJpZ2h0PyAgQmV0dGVyIHRvIG5vdCBtYXRjaCBhIGZsb2F0P1xuUnVsZS5JbnRlZ2VyID0gY2xhc3MgaW50ZWdlciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbnBhcnNlci5hZGRSdWxlKFwiaW50ZWdlclwiLCBuZXcgUnVsZS5JbnRlZ2VyKHtcblx0cGF0dGVybjogLy0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBpbnRlZ2VyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlSW50KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5cblxuLy8gTGl0ZXJhbCBgdGV4dGAgc3RyaW5nLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBZb3UgY2FuIHVzZSBlaXRoZXIgc2luZ2xlIG9yIGRvdWJsZSBxdW90ZXMgb24gdGhlIG91dHNpZGUgKGFsdGhvdWdoIGRvdWJsZSBxdW90ZXMgYXJlIHByZWZlcnJlZCkuXG4vLyBSZXR1cm5lZCB2YWx1ZSBoYXMgZW5jbG9zaW5nIHF1b3Rlcy5cbi8vIFRPRE86IGVzY2FwZWQgcXVvdGVzIGluc2lkZSBzdHJpbmdcblJ1bGUuVGV4dCA9IGNsYXNzIHRleHQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgdGV4dCA9IHBhcnNlci5hZGRSdWxlKFwidGV4dFwiLCBuZXcgUnVsZS5UZXh0KHtcblx0cGF0dGVybjogLyg/OlwiW15cIl0qXCJ8J1teJ10qJykvXG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdGV4dCk7XG5cblxuLy8gQm9vbGVhbiBsaXRlcmFsLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBUT0RPOiBiZXR0ZXIgbmFtZSBmb3IgdGhpcz8/P1xuUnVsZS5Cb29sZWFuID0gY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBib29sID0gcGFyc2VyLmFkZFJ1bGUoXCJib29sZWFuXCIsIG5ldyBSdWxlLkJvb2xlYW4oe1xuXHRwYXR0ZXJuOiAvKHRydWV8ZmFsc2V8eWVzfG5vfG9rfGNhbmNlbClcXGIvLFxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHN3aXRjaCAodGhpcy5tYXRjaGVkKSB7XG5cdFx0XHRjYXNlIFwidHJ1ZVwiOlxuXHRcdFx0Y2FzZSBcInllc1wiOlxuXHRcdFx0Y2FzZSBcIm9rXCI6XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGJvb2wpO1xuLy8gQWRkIGJvb2xlYW4gdG9rZW5zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy8gVEVTVE1FXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJ0cnVlXCIsIFwiZmFsc2VcIixcblx0XCJ5ZXNcIiwgXCJub1wiLFxuXHRcIm9rXCIsIFwiY2FuY2VsXCJcbik7XG5cbi8vIExpdGVyYWwgbGlzdCAoYXJyYXkpLCBlZzogIGBbMSwyLHRydWUsZmFsc2UgXWBcbmxldCBsaXN0ID0gcGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGl0ZXJhbF9saXN0XCIsXG5cdFwiXFxcXFtbbGlzdDp7ZXhwcmVzc2lvbn0sXT9cXFxcXVwiLFxuXHR1bmRlZmluZWQsXG5cdGNsYXNzIGxpdGVyYWxfbGlzdCBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cbi8vVE9ETzogc3F1aXJyZWx5Li4uXG5cdFx0Ly8gV2hlbiBnYXRoZXJpbmcgYXJndW1lbnRzLCByZXR1cm4ganVzdCB0aGUgbWF0Y2hlZCBsaXN0IGRhdGEsIGlnbm9yaW5nIHRoZSBicmFja2V0cy5cblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiB0aGlzLm1hdGNoZWRbMV07XG5cdFx0fVxuXG5cdFx0Ly8gcmV0dXJuIGp1c3QgdGhlIGxpc3QgYXMgb3VyIHNvdXJjZVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcbiBcdFx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gTGl0ZXJhbCB2YWx1ZSBhcyBudW1iZXIsIHRleHQgb3IgYm9vbGVhbi5cbi8vVE9ETzogdGhpcyBpcyBhbiBleHByZXNzaW9uLi4uIGJ1dCBpbnN0YWxsaW5nIGl0IHRoYXQgd2F5IGJyZWFrcyBwYXJzaW5nLi4uP1xuLy9URVNUTUU6IGFkZCBsaXRlcmFsLWxpc3QgdG8gdGhpcz9cbnBhcnNlci5hZGRTeW50YXgoXCJsaXRlcmFsXCIsIFwiKGxpdGVyYWw6e251bWJlcn18e3RleHR9fHtib29sZWFufXx7bGl0ZXJhbF9saXN0fSlcIik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY29yZS5qcyIsIlxuLy8gVE9ETzogY29udmVydCB0byBsaW5lLWF3YXJlIHN0cmVhbT8/P1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFN0cmVhbSB7XG5cdC8vIFlvdSBjYW4gY29uc3RydWN0IHdpdGggYSB0ZXh0IHN0cmluZyBvciBhIHNldCBvZiBwcm9wZXJ0aWVzIChpbmNsdWRpbmcgYHRleHRgKS5cblx0Y29uc3RydWN0b3IoLi4udGV4dE9yUHJvcHMpIHtcblx0XHR0ZXh0T3JQcm9wcy5mb3JFYWNoKChhcmcpID0+IHtcblx0XHRcdGlmICh0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdHRoaXMudGV4dCA9IGFyZztcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGFyZykge1xuXHRcdFx0XHRPYmplY3QuYXNzaWduKHRoaXMsIGFyZyk7XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8vIE1ha2Ugc3VyZSBgdGV4dGAgYW5kIGBzdGFydEluZGV4YCBhcmUgZGVmaW5lZC5cblx0XHRpZiAoIShcInRleHRcIiBpbiB0aGlzKSkgdGhpcy50ZXh0ID0gXCJcIjtcblx0XHRpZiAoIShcInN0YXJ0SW5kZXhcIiBpbiB0aGlzKSkgdGhpcy5zdGFydEluZGV4ID0gMDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBpbW11dGFibGUgY2xvbmUgb2YgdGhlIHN0cmVhbS5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRyZXR1cm4gbmV3IFRleHRTdHJlYW0odGhpcywgcHJvcHMpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jZWQgdG8gbmV3IHN0YXJ0SW5kZXguXG5cdGFkdmFuY2VUbyhzdGFydEluZGV4KSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4IH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jaW5nIHN0YXJ0SW5kZXggQlkgYGxlbmd0aGBcblx0YWR2YW5jZUJ5KGxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuXHR9XG5cbi8vIFx0Ly8gUmV0dXJuIGNsb25lIG9mIHRoaXMgc3RyZWFtIHdpdGggZW5kSW5kZXggc2V0IHRvIHN0YXJ0ICsgYGxlbmd0aGBcbi8vIFx0ZW5kQWZ0ZXIobGVuZ3RoKSB7XG4vLyBcdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBlbmRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuLy8gXHR9XG5cbi8vXG4vLyAjIyBNYXRjaGluZ1xuLy9cblx0Ly8gTWF0Y2ggYHBhdHRlcm5gIGFzIHJlZ2V4IGluIHRoaXMgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG1hdGNoIG9yIGB1bmRlZmluZWRgLlxuXHQvLyBJZiB5b3Ugd2FudCB0byB0ZXN0IHRoZSBzdGFydCBvZiB0aGUgc3RyZWFtLFxuXHQvL1x0bWFrZSBzdXJlIHlvdXIgcmVnZXggc3RhcnRzIHdpdGggYF5gLlxuXHQvLyBURVNUTUU6IHRoaXMgbGlrZWx5IGJyZWFrcyB3aXRoIGEgYGdgIG9uIHRoZSBwYXR0ZXJuP1xuXHRtYXRjaChwYXR0ZXJuKSB7XG5cdFx0aWYgKCEocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHRocm93IG5ldyBUeXBlRXJyb3IoYFRleHRTdHJlYW0ubWF0Y2goJHtwYXR0ZXJufSk6IGV4cGVjdGVkIFJlZ0V4cGApO1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5tYXRjaChwYXR0ZXJuKSB8fCB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBEb2VzIHRoaXMgc3RyZWFtIElOQ0xVREUgYSByZWdleCB3aXRoaW4gaXQ/XG5cdC8vIFJldHVybnMgYHRydWVgIG9yIGBmYWxzZWAuXG5cdC8vIE5PVEU6IFBhdHRlcm4gbXVzdCBOT1Qgc3RhcnQgd2l0aCBgXmAgZm9yIHRoaXMgdG8gbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLlxuXHR0ZXN0KHBhdHRlcm4pIHtcblx0XHRyZXR1cm4gcGF0dGVybi50ZXN0KHRoaXMuaGVhZCk7XG5cdH1cblxuLy9cbi8vICMjIFJlZmxlY3Rpb25cbi8vXG5cdC8vIFJldHVybiB0ZXh0IG9mIHN0cmluZyBzdGFydGluZyBhdCBvdXIgYHN0YXJ0SW5kZXhgXG5cdGdldCBoZWFkKCkge1xuXHRcdHJldHVybiB0aGlzLnJhbmdlKCk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSByYW5nZSBvZiB0aGUgc3RyaW5nIGZyb20gYHN0YXJ0SW5kZXhgIHRvIGBlbmRJbmRleGAgTk9OLWluY2x1c2l2ZS5cblx0cmFuZ2Uoc3RhcnRJbmRleCA9IHRoaXMuc3RhcnRJbmRleCwgZW5kSW5kZXggPSB0aGlzLmVuZEluZGV4IHx8IHRoaXMudGV4dC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0LnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmRJbmRleCk7XG5cdH1cblxuXHQvLyBMZW5ndGggb2YgdGhlIHN0cmVhbS5cblx0Z2V0IGxlbmd0aCgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0Lmxlbmd0aDtcblx0fVxuXG5cdC8vIEFyZSB3ZSBhdCB0aGUgZW5kIG9mIHRoZSBzdHJlYW0/XG5cdGdldCBpc0VtcHR5KCkge1xuXHRcdHJldHVybiB0aGlzLnN0YXJ0SW5kZXggPT09IHRoaXMubGVuZ3RoO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dFxuXHR9O1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1RleHRTdHJlYW0uanMiLCJpbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gbG9hZCBzdGFuZGFyZCBydWxlcyBmaWxlcyBoZXJlXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbnVtYmVyc1wiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vc3RhdGVtZW50c1wiO1xuaW1wb3J0IFwiLi9hc3NpZ25tZW50XCI7XG5pbXBvcnQgXCIuL2NsYXNzXCI7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaW5kZXguanMiLCIvLyBNZW1vaXplL2ZvcmdldCBzZW1hbnRpY3MuXG5cbi8vIFJldHVybiBhIG1lbW9pemluZyBnZXR0ZXIgZnVuY3Rpb24uXG4vLyBURVNUTUVcbmV4cG9ydCBmdW5jdGlvbiBtZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKSB7XG5cdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRpZiAodGhpc1twcm9wZXJ0eV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dmFyIHZhbHVlID0gZ2V0dGVyLmFwcGx5KHRoaXMpO1xuXHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Ly8gRGVmaW5lIHNvIHRoYXQgd2UgY2FuIGJlIGRlbGV0ZWQgYW5kIHJlLWRlZmluZWQsIGJ1dCBub3Qgc2V0IG9yIGVudW1lcmF0ZWQuXG5cdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBwcm9wZXJ0eSwgeyB2YWx1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdGhpc1twcm9wZXJ0eV07XG5cdH1cbn1cblxuXG4vLyBSZXR1cm4gYSBtZW1vaXplIGZ1bmN0aW9uIGZvciB1c2UgYXMgYSBnZXR0ZXIgaW4gYSBgT2JqZWN0LmRlZmluZVByb3BlcnR5KClgXG4vLyBURVNUTUVcbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVNZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKSB7XG5cdHJldHVybiB7XG5cdFx0Z2V0IDogbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcilcblx0fVxufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL21lbW9pemUuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFRPRE86IHtwcm9wZXJ0eS1leHByZXNzaW9ufSBhbHNvIHdvcmtzLi4uIHthc3NpZ25hYmxlLWV4cHJlc3Npb259ID8/P1xucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJ7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cIiwge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IGlkZW50aWZpZXIgPSB0aGlzLnJlc3VsdHMuaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRsZXQgdmFsdWUgPSB0aGlzLnJlc3VsdHMuZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHQvLyBUT0RPOiBkZWNsYXJlIGlkZW50aWZpZXIgaWYgbm90IGluIHNjb3BlLCBldGNcblx0XHRyZXR1cm4gYCR7aWRlbnRpZmllcn0gPSAke3ZhbHVlfWA7XG5cdH1cbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlZmluaW5nIGNsYXNzZXMgKGtub3duIGFzIGB0eXBlc2ApXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwcm9wZXJ0eV9leHByZXNzaW9uXCIsXG5cdFwiKHByb3BlcnR5X25hbWVzOnRoZSB7aWRlbnRpZmllcn0gb2YpKyB7ZXhwcmVzc2lvbn1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBwcm9wZXJ0eV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdGlmICghdGhpcy5fcmVzdWx0cykge1xuXHRcdFx0XHR0aGlzLl9yZXN1bHRzID0gc3VwZXIucmVzdWx0cztcblx0XHRcdFx0Ly8gdHJhbnNmb3JtIHByb3BlcnR5X25hbWVzIGFuZCBwdWxsIG91dCBpZGVudGlmaWVyc1xuXHRcdFx0XHR0aGlzLl9yZXN1bHRzLnByb3BlcnR5X25hbWVzID0gdGhpcy5fcmVzdWx0cy5wcm9wZXJ0eV9uYW1lcy5yZXN1bHRzLm1hcCggc2VxdWVuY2UgPT4gc2VxdWVuY2UuaWRlbnRpZmllciApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXMuX3Jlc3VsdHM7XG5cdFx0fVxuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHRoaW5nID0gdGhpcy5yZXN1bHRzLmV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgcHJvcGVydHlfbmFtZXMgPSB0aGlzLnJlc3VsdHMucHJvcGVydHlfbmFtZXMucmV2ZXJzZSgpLm1hcCggaWRlbnRpZmllciA9PiBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpICkuam9pbihcIi5cIik7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldCgke3RoaW5nfSwgJyR7cHJvcGVydHlfbmFtZXN9JylgO1xuXHRcdH1cblx0fVxuKTtcblxuXG5wYXJzZXIuYWRkU3ludGF4KFwic2NvcGVfbW9kaWZpZXJcIiwgXCIoc2NvcGU6Z2xvYmFsfGNvbnN0YW50fHNoYXJlZHxsb2NhbClcIik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eVwiLFxuXHRcIntzY29wZV9tb2RpZmllcn0/IHthc3NpZ25tZW50fVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFzc2lnbm1lbnQgPSB0aGlzLnJlc3VsdHMuYXNzaWdubWVudC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBzY29wZSA9IHRoaXMucmVzdWx0cy5zY29wZSAmJiB0aGlzLnJlc3VsdHMuc2NvcGUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJnbG9iYWxcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGdsb2JhbC4ke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwiY29uc3RhbnRcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGNvbnN0ICR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJzaGFyZWRcIjpcblx0XHRcdFx0XHRyZXR1cm4gYHN0YXRpYyAke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwibG9jYWxcIjpcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRyZXR1cm4gYXNzaWdubWVudDtcblx0XHRcdH1cblx0XHR9XG5cdH1cbik7XG5cbi8vIFRPRE86IHdhcm4gb24gaW52YWxpZCBzZXQ/ICBzaGFyZWQ/ICB1bmRlZmluZWQ/IHNvbWV0aGluZyBvdGhlciB0aGFuIHRoZSBmaXJzdCB2YWx1ZSBhcyBkZWZhdWx0P1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5X2FzX29uZV9vZlwiLFxuXHRcIntzY29wZV9tb2RpZmllcn0/IHtpZGVudGlmaWVyfSBhcyBvbmUgb2Yge2xpc3Q6bGl0ZXJhbF9saXN0fVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHNjb3BlID0gdGhpcy5yZXN1bHRzLnNjb3BlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGlkZW50aWZpZXIgPSB0aGlzLnJlc3VsdHMuaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBwbHVyYWwgPSAoaWRlbnRpZmllciArIFwiX1ZBTFVFU1wiKS50b1VwcGVyQ2FzZSgpO1xuXHRcdFx0bGV0IGxpc3QgPSB0aGlzLnJlc3VsdHMubGlzdDtcblx0XHRcdGxldCB2YWx1ZXMgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuLy9UT0RPOiBsaXN0LmdldEl0ZW0oMClcblx0XHRcdGxldCBmaXJzdCA9IGxpc3QucmVzdWx0cy5tYXRjaGVkWzBdO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKGNvbnRleHQpIDogXCJ1bmRlZmluZWRcIjtcblx0XHRcdHJldHVybiBgc3RhdGljICR7cGx1cmFsfSA9ICR7dmFsdWVzfTtcXG5gXG5cdFx0XHRcdCArIGBnZXQgJHtpZGVudGlmaWVyfSB7IHJldHVybiAoXCJfXyR7aWRlbnRpZmllcn1cIiBpbiB0aGlzID8gdGhpcy5fXyR7aWRlbnRpZmllcn0gOiAke2ZpcnN0VmFsdWV9KSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuY29uc3RydWN0b3IuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9XFxuYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9jbGFzcy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVhbGluZyB3aXRoIG51bWJlcnNcbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5sZXQgaW5kZXhfZXhwcmVzc2lvbiA9IHBhcnNlci5hZGRSdWxlKFwiaW5kZXhfZXhwcmVzc2lvblwiLCBuZXcgKGNsYXNzIGluZGV4X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkFsdGVybmF0aXZlc3t9KSgpKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBpbmRleF9leHByZXNzaW9uKTtcblxuLy8gTnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZzpcbi8vXHQtIGBpdGVtIDEgb2YgLi4uYFxuLy9cdC0gYGl0ZW0gIzIgb2YgLi4uYFxuLy8gTk9URTogdGhlc2UgaW5kaWNlcyBhcmUgT05FIGJhc2VkLCBOT1QgemVybyBiYXNlZCBhcyBpcyBKYXZhc2NyaXB0LlxuLy8gVE9ETzogYWxsb3cgYW55IGlkZW50aWZpZXIgaW5zdGVhZCBvZiBge2l0ZW19YCA/XG5wYXJzZXIuYWRkU3ludGF4KFwiaW5kZXhfZXhwcmVzc2lvblwiLFxuXHRcIntpZGVudGlmaWVyfSAoIyk/e251bWJlcjppbnRlZ2VyfSBvZiB7ZXhwcmVzc2lvbn1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBpbmRleF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgbnVtYmVyID0gdGhpcy5yZXN1bHRzLm51bWJlci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBleHByZXNzaW9uID0gdGhpcy5yZXN1bHRzLmV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtudW1iZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIE9yZGluYWwgbnVtYmVyczogZmlyc3QsIHNlY29uZCwgZXRjLlxucGFyc2VyLmFkZFJ1bGUoXCJvcmRpbmFsXCIsIG5ldyAoY2xhc3Mgb3JkaW5hbCBleHRlbmRzIFJ1bGUuQWx0ZXJuYXRpdmVzIHt9KSgpKTtcblxucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJmaXJzdFwiLCB7IHRvU291cmNlOiAoKSA9PiAxIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJzZWNvbmRcIiwgeyB0b1NvdXJjZTogKCkgPT4gMiB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwidGhpcmRcIiwgeyB0b1NvdXJjZTogKCkgPT4gMyB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZm91cnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDQgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImZpZnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDUgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInNpeHRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDYgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInNldmVudGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gNyB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZWlnaHRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDggfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcIm5pbnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDkgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInRlbnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDEwIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJwZW51bHRpbWF0ZVwiLCB7IHRvU291cmNlOiAoKSA9PiAtMiB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZmluYWxcIiwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImxhc3RcIiwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cbi8vIFRPRE86IHNpeHR5LWZpZnRoLCB0d28gaHVuZHJlZCBmb3J0eSBuaW50aC4uLlxuXG4vLyBBbHRlcm5hdGl2ZSBmb3JtIGZvciBudW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nLlxuLy8gTk9URTogZG9uJ3QgYWRkIGFzIGFuIGV4cHJlc3Npb24gc2luY2Ugd2UncmUgYXV0by1tZXJnZWQgd2l0aCBgaW5kZXhfZXhwcmVzc2lvbmAgYWJvdmUuXG5wYXJzZXIuYWRkU3ludGF4KFxuXHRcImluZGV4X2V4cHJlc3Npb25cIixcblx0XCJ0aGUge29yZGluYWx9IHtpZGVudGlmaWVyfSBvZiB7ZXhwcmVzc2lvbn1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBpbmRleF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgb3JkaW5hbCA9IHRoaXMucmVzdWx0cy5vcmRpbmFsLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGV4cHJlc3Npb24gPSB0aGlzLnJlc3VsdHMuZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke29yZGluYWx9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvbnVtYmVycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgaW5maXggYW5kIHByZWZpeCBvcGVyYXRvcnMuXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8jIyBJbmZpeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj4ge3Joc31gLCBlZzogYGEgaXMgMWBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgdHdvIGFyZ3VtZW50cyAoYGxoc2AgYW5kIGByaHNgKSBpbnRvIG91dHB1dC5cblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJhbmRcIiwgXCJhbmRcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICYmICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcIm9yXCIsIFwib3JcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9IHx8ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNcIiwgXCJpc1wiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90XCIsIFwiaXMgbm90XCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPSAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX2V4YWN0bHlcIiwgXCJpcyBleGFjdGx5XCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90X2V4YWN0bHlcIiwgXCJpcyBub3QgZXhhY3RseVwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT09ICR7Yn0pYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzT2ZUeXBlKHRoaW5nLCB0eXBlKWBcbi8vVE9ETzogYGlzIHNhbWUgdHlwZSBhc2AgP1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc190eXBlX29mXCIsIFtcImlzIGFcIiwgXCJpcyBhblwiXSwgeyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90X3R5cGVfb2ZcIiwgW1wiaXMgbm90IGFcIiwgXCJpcyBub3QgYW5cIl0sIHsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5jb250YWlucyhjb2xsZWN0aW9uLCB0aGluZylgXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX2luXCIsIFtcImlzIGluXCIsIFwiaXMgb25lIG9mXCJdLCB7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGBzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90X2luXCIsIFtcImlzIG5vdCBpblwiLCBcImlzIG5vdCBvbmUgb2ZcIl0sIHsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCFzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcbi8vVEVTVE1FXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImluY2x1ZGVzXCIsIFtcImluY2x1ZGVzXCIsIFwiY29udGFpbnNcIl0sIHsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYHNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJkb2VzbnRfaW5jbHVkZVwiLCBbXCJkb2VzIG5vdCBpbmNsdWRlXCIsIFwiZG9lc250IGluY2x1ZGVcIiwgXCJkb2VzIG5vdCBjb250YWluXCIsIFwiZG9lc250IGNvbnRhaW5cIl0sIHsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCFzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndFwiLCBbXCI+XCIsIFwiaXMgZ3JlYXRlciB0aGFuXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0ZVwiLCBbXCI+PVwiLCBcImlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0b1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibHRcIiwgW1wiPFwiLCBcImlzIGxlc3MgdGhhblwiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJsdGVcIiwgW1wiPD1cIiwgXCJpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG9cIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9fSk7XG5cbi8vVE9ETzogIGNhbid0IGFkZCBgK2AgYXMgYSBydWxlLCBmaXggdGhpcyB0aGVuIGFkZCB0aGVzZVxuLy9UT0RPOiAgb3BlcmF0b3IgcHJlY2VkZW5jZT8/P1xuLy9URVNUTUVcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwicGx1c1wiLCBbXCJcXFxcK1wiLCBcInBsdXNcIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKyAke2J9YCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcIm1pbnVzXCIsIFtcIi1cIiwgXCJtaW51c1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAtICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwidGltZXNcIiwgW1wiXFxcXCpcIiwgXCJ0aW1lc1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZGl2aWRlZF9ieVwiLCBbXCIvXCIsIFwiZGl2aWRlZCBieVwiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH19KTtcblxuLy9UT0RPOiAgYCs9YCBldGM/ICBvdGhlciBtYXRoIGZ1bmN0aW9ucz9cblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwiaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntsaHM6ZXhwcmVzc2lvbn0ge29wZXJhdG9yOmluZml4X29wZXJhdG9yfSB7cmhzOmV4cHJlc3Npb259XCIsXG5cdHVuZGVmaW5lZCxcblx0Y2xhc3MgaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0bGVmdFJlY3Vyc2l2ZSA9IHRydWU7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGxocyA9IHRoaXMucmVzdWx0cy5saHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgcmhzID0gdGhpcy5yZXN1bHRzLnJocy50b1NvdXJjZShjb250ZXh0KTtcblxuXHRcdFx0bGV0IHRvSlMgPSB0aGlzLnJlc3VsdHMub3BlcmF0b3IudG9KUztcblx0XHRcdHJldHVybiB0b0pTKGxocywgcmhzKTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIyMgUG9zdGlmeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj5gLCBlLmcuIGBhIGlzIGRlZmluZWRgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBKUyBvdXRwdXQuXG5cbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19kZWZpbmVkXCIsIFwiaXMgZGVmaW5lZFwiLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ICE9PSAndW5kZWZpbmVkJylgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19ub3RfZGVmaW5lZFwiLCBbXCJpcyBub3QgZGVmaW5lZFwiLCBcImlzIHVuZGVmaW5lZFwiXSwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzRW1wdHkodGhpbmcpYFxucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX2VtcHR5XCIsIFwiaXMgZW1wdHlcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19ub3RfZW1wdHlcIiwgXCJpcyBub3QgZW1wdHlcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9fSk7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeF9vcGVyYXRvcn1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBwb3N0Zml4X29wZXJhdG9yX2V4cHJlc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0bGVmdFJlY3Vyc2l2ZSA9IHRydWU7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGxocyA9IHRoaXMucmVzdWx0cy5leHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHRvSlMgPSB0aGlzLnJlc3VsdHMub3BlcmF0b3IudG9KUztcblx0XHRcdHJldHVybiB0b0pTKGxocyk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFRPRE86IHRoaXMgc2hvdWxkIHJlYWxseSBiZSBhIGdlbmVyYWwgXCJleHByZXNzaW9uXCIuLi5cbi8vcGFyc2VyLmFkZFN5bnRheChcIm9wZXJhdG9yX2V4cHJlc3Npb25cIiwgXCIoZXhwcmVzc2lvbjp7cG9zdGZpeF9vcGVyYXRvcl9leHByZXNzaW9ufXx7aW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvbn0pXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyIsImltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5pbXBvcnQgXCIuL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vcnVsZXMvaW5kZXguanNcIjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdHdpbmRvdy5UZXh0U3RyZWFtID0gVGV4dFN0cmVhbTtcblx0d2luZG93LlBhcnNlciA9IFBhcnNlcjtcblx0d2luZG93LlJ1bGUgPSBSdWxlO1xuXHR3aW5kb3cucGFyc2VyID0gcGFyc2VyO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7XG5cdFRleHRTdHJlYW0sIFBhcnNlciwgUnVsZSwgcGFyc2VyXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9pbmRleC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJpZlwiLCBcImlmIHtleHByZXNzaW9ufSB0aGVuIHtudW1iZXJ9P1wiLCB7XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHR9XG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIl0sInNvdXJjZVJvb3QiOiIifQ==