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
				//console.info("NOT recursing into ", this);
				return undefined;
			}
			// If the expression is leftRecursive, set a flag so we don't attempt to recurse into it again.
			//TODO: this is dangerous: an exception will leave the flag set...
			if (this.leftRecursive) {
				this.dontRecurse = true;
				//console.warn("Setting dontRecurse for", this);
			}
			var match = _get(expression.prototype.__proto__ || Object.getPrototypeOf(expression.prototype), "parse", this).call(this, parser, stream);
			if (this.leftRecursive) {
				//console.info("clearing dontRecurse for ", this);
				delete this.dontRecurse;
			}
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
		var _results = this.results,
		    identifier = _results.identifier,
		    expression = _results.expression;
		// TODO: declare identifier if not in scope, etc

		return identifier.toSource(context) + " = " + expression.toSource(context);
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


_parser2.default.addExpression("property_expression", "(properties:the {identifier} of)+ the? {expression}", undefined, function (_Rule$Expression) {
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
// TODO: if `identifier` is "word", output `getWord()` etc
_parser2.default.addSyntax("index_expression", "{identifier} (#)?{number:integer} of {expression}", undefined, function (_Rule$Expression) {
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

			return "spell.getItem(" + expression.toSource(context) + ", " + number.toSource(context) + ")";
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
// TODO: if `identifier` is "word", output `getWord()` etc
_parser2.default.addSyntax("index_expression", "the {ordinal} {identifier} of {expression}", undefined, function (_Rule$Expression2) {
	_inherits(index_expression, _Rule$Expression2);

	function index_expression() {
		_classCallCheck(this, index_expression);

		return _possibleConstructorReturn(this, (index_expression.__proto__ || Object.getPrototypeOf(index_expression)).apply(this, arguments));
	}

	_createClass(index_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _results2 = this.results,
			    identifier = _results2.identifier,
			    ordinal = _results2.ordinal,
			    expression = _results2.expression;

			return "spell.getItem(" + expression.toSource(context) + ", " + ordinal.toSource(context) + ")";
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

_parser2.default.addStatement("if", "if {expression} (then|:) {statement}?", {
	toSource: function toSource(context) {}
});

/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgNzBmMWYzODE2YTFmNmRiYmNkNzgiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZVN5bnRheC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIl0sIm5hbWVzIjpbInBhcnNlciIsIndpbmRvdyIsImNvbnNvbGUiLCJncm91cCIsImxvZyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInJ1bGVzIiwiY3JlYXRlIiwibmFtZSIsInN0cmVhbSIsInJ1bGUiLCJnZXRSdWxlIiwiU3ludGF4RXJyb3IiLCJlYXRXaGl0ZXNwYWNlIiwicGFyc2UiLCJyZXN1bHQiLCJ3aGl0ZXNwYWNlIiwiYWR2YW5jZUJ5IiwibWF0Y2hlZCIsImxlbmd0aCIsImV4aXN0aW5nIiwiQWx0ZXJuYXRpdmVzIiwiZGVidWciLCJydWxlTmFtZSIsImFyZ3VtZW50IiwiYWRkUnVsZSIsInRva2VucyIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsInN0YXJ0SW5kZXgiLCJuZXN0aW5nIiwibmVzdGVkIiwiZW5kSW5kZXgiLCJsYXN0SW5kZXgiLCJ0b2tlbiIsInNsaWNlIiwic3RyaW5nIiwic3BsaXQiLCJtYXAiLCJjaGFyIiwiaW5kZXgiLCJsaXN0IiwiUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyIsImpvaW4iLCJmbGFncyIsIlJlZ0V4cCIsImVzY2FwZVJlZ0V4cENoYXJhY3RlcnMiLCJERUJVRyIsImNoYXJzIiwiZm9yRWFjaCIsIlJ1bGUiLCJjb25zdHJ1Y3RvciIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2xvbmUiLCJwcm9wcyIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsImNvbnRleHQiLCJQYXR0ZXJuIiwicGF0dGVybiIsImRlZmluZVByb3BlcnR5IiwidmFsdWUiLCJzb3VyY2UiLCJtYXRjaCIsInN0YXJ0UGF0dGVybiIsImJsYWNrbGlzdCIsIndvcmRzIiwid29yZCIsIlN5bWJvbCIsIlJlZ0V4cEZyb21TdHJpbmciLCJvcHRpb25hbCIsIm1lcmdlU3ltYm9scyIsImZpcnN0Iiwic2Vjb25kIiwiS2V5d29yZCIsInBhdHRlcm5TdHJpbmciLCJtZXJnZUtleXdvcmRzIiwiU3VicnVsZSIsImlzRGV0ZXJtaW5pc3RpYyIsIk5lc3RlZCIsImV2ZXJ5IiwiU2VxdWVuY2UiLCJuZXh0IiwicHVzaCIsIm1hdGNoZWRUZXh0IiwicmFuZ2UiLCJfcmVzdWx0cyIsInJlc3VsdHMiLCJhcmdOYW1lIiwiQXJyYXkiLCJpc0FycmF5IiwiRXhwcmVzc2lvbiIsImRvbnRSZWN1cnNlIiwibGVmdFJlY3Vyc2l2ZSIsIlN0YXRlbWVudCIsImJlc3RNYXRjaCIsInRvU291cmNlIiwiUmVwZWF0IiwiaW5jbHVkZXMiLCJMaXN0IiwiaXRlbSIsImRlbGltaXRlciIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJsYXN0IiwicG9wIiwic3ludGF4VG9rZW4iLCJwYXJzZVJ1bGVTeW50YXhfc3RyaW5nIiwicGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUiLCJwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMiLCJwYXJzZVJ1bGVTeW50YXhfbGlzdCIsInBhcnNlUnVsZVN5bnRheF9yZXBlYXQiLCJzdGFydHNXaXRoIiwic3Vic3RyIiwidG9TdHJpbmciLCJmaW5kTmVzdGVkVG9rZW5zIiwiYWx0ZXJuYXRpdmVzIiwiZ3JvdXBBbHRlcm5hdGl2ZXMiLCJjdXJyZW50IiwiaSIsImNvbmNhdCIsInN5bWJvbCIsInBhcmFtcyIsImJhbmdQb3NpdGlvbiIsImluZGV4T2YiLCJub3QiLCJkZWZpbmVQcm9wZXJ0aWVzIiwiYWRkU3ludGF4IiwicnVsZVN5bnRheCIsImUiLCJlcnJvciIsImFkZFN0YXRlbWVudCIsImFkZEV4cHJlc3Npb24iLCJhZGRJbmZpeE9wZXJhdG9yIiwidG9KUyIsIl9faW5maXhPcGVyYXRvcnMiLCJpbmZpeE9wZXJhdG9ycyIsImFkZFBvc3RmaXhPcGVyYXRvciIsIl9fcG9zdGZpeE9wZXJhdG9ycyIsInBvc3RmaXhPcGVyYXRvcnMiLCJXaGl0ZXNwYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJyZXBsYWNlIiwiYWRkVG9CbGFja2xpc3QiLCJUeXBlIiwidHlwZSIsIk51bWJlciIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJJbnRlZ2VyIiwicGFyc2VJbnQiLCJUZXh0IiwidGV4dCIsIkJvb2xlYW4iLCJib29sIiwiVGV4dFN0cmVhbSIsInRleHRPclByb3BzIiwiYXJnIiwiaGVhZCIsInRlc3QiLCJzdWJzdHJpbmciLCJtZW1vaXplZCIsImRlZmluZU1lbW9pemVkIiwicHJvcGVydHkiLCJnZXR0ZXIiLCJhcHBseSIsImNvbmZpZ3VyYWJsZSIsImdldCIsImV4cHJlc3Npb24iLCJyZXZlcnNlIiwiYXNzaWdubWVudCIsInNjb3BlX21vZGlmaWVyIiwic2NvcGUiLCJwbHVyYWwiLCJ0b1VwcGVyQ2FzZSIsInZhbHVlcyIsImZpcnN0VmFsdWUiLCJpbmRleF9leHByZXNzaW9uIiwib3JkaW5hbCIsImEiLCJiIiwidGhpbmciLCJsaHMiLCJyaHMiLCJvcGVyYXRvciJdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLG1EQUEyQyxjQUFjOztBQUV6RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOzs7O0FBQ0E7Ozs7OztBQUVBO0FBTkE7QUFDQTtBQUNBO0FBS0EsSUFBTUEsU0FBUyxzQkFBZjtrQkFDZUEsTTs7QUFFZjs7QUFDQUMsT0FBT0QsTUFBUCxHQUFnQkEsTUFBaEIsQzs7Ozs7Ozs7Ozs7OztxakJDWEE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7QUFDQTs7Ozs7Ozs7QUFFQTtBQUNBLElBQUksQ0FBQ0UsUUFBUUMsS0FBYixFQUFvQkQsUUFBUUMsS0FBUixHQUFnQkQsUUFBUUUsR0FBeEI7QUFDcEIsSUFBSSxDQUFDRixRQUFRRyxRQUFiLEVBQXVCSCxRQUFRRyxRQUFSLEdBQW1CSCxRQUFRRSxHQUEzQjs7SUFFRkUsTTtBQUlwQixpQkFBWUMsVUFBWixFQUF3QjtBQUFBOztBQUN2QkMsU0FBT0MsTUFBUCxDQUFjLElBQWQsRUFBb0JGLFVBQXBCOztBQUVBO0FBQ0EsT0FBS0csS0FBTCxHQUFhRixPQUFPRyxNQUFQLENBQWMsS0FBS0QsS0FBTCxJQUFjLElBQTVCLENBQWI7QUFDQTtBQVJEOzs7OzswQkFVUUUsSSxFQUFNO0FBQ2IsVUFBTyxLQUFLRixLQUFMLENBQVdFLElBQVgsQ0FBUDtBQUNBOztBQUVGO0FBQ0E7QUFDQTtBQUNDO0FBQ0E7QUFDQTs7Ozt3QkFDTUEsSSxFQUFNQyxNLEVBQVE7QUFDbkIsT0FBSSxPQUFPQSxNQUFQLEtBQWtCLFFBQXRCLEVBQWdDQSxTQUFTLHlCQUFlQSxNQUFmLENBQVQ7QUFDaEMsT0FBSUMsT0FBTyxLQUFLQyxPQUFMLENBQWFILElBQWIsQ0FBWDtBQUNBLE9BQUksQ0FBQ0UsSUFBTCxFQUFXLE1BQU0sSUFBSUUsV0FBSixtQkFBZ0NKLElBQWhDLHVCQUFOO0FBQ1hDLFlBQVMsS0FBS0ksYUFBTCxDQUFtQkosTUFBbkIsQ0FBVDtBQUNBLFVBQU9DLEtBQUtJLEtBQUwsQ0FBVyxJQUFYLEVBQWlCTCxNQUFqQixDQUFQO0FBQ0E7O0FBRUQ7QUFDQTs7OztnQ0FDY0EsTSxFQUFRO0FBQ3JCLE9BQUlNLFNBQVMsS0FBS1QsS0FBTCxDQUFXVSxVQUFYLENBQXNCRixLQUF0QixDQUE0QixJQUE1QixFQUFrQ0wsTUFBbEMsQ0FBYjtBQUNBLE9BQUksQ0FBQ00sTUFBTCxFQUFhLE9BQU9OLE1BQVA7QUFDYixVQUFPQSxPQUFPUSxTQUFQLENBQWlCRixPQUFPRyxPQUFQLENBQWVDLE1BQWhDLENBQVA7QUFDQTs7QUFFRDtBQUNBOzs7OzBCQUNRWCxJLEVBQU1FLEksRUFBTTtBQUNuQixPQUFJVSxXQUFXLEtBQUtkLEtBQUwsQ0FBV0UsSUFBWCxDQUFmO0FBQ0EsT0FBSVksUUFBSixFQUFjO0FBQ2IsUUFBSSxFQUFFQSxvQkFBb0IsZUFBS0MsWUFBM0IsQ0FBSixFQUE4QztBQUM3QyxTQUFJbkIsT0FBT29CLEtBQVgsRUFBa0J4QixRQUFRRSxHQUFSLHVCQUFnQ1EsSUFBaEM7QUFDbEIsVUFBS0YsS0FBTCxDQUFXRSxJQUFYLElBQW1CLElBQUksZUFBS2EsWUFBVCxDQUFzQixFQUFFRSxVQUFVZixJQUFaLEVBQWtCRixPQUFPLENBQUNjLFFBQUQsQ0FBekIsRUFBdEIsQ0FBbkI7QUFDQTtBQUNBLFNBQUlBLFNBQVNJLFFBQWIsRUFBdUIsS0FBS2xCLEtBQUwsQ0FBV0UsSUFBWCxFQUFpQmdCLFFBQWpCLEdBQTRCSixTQUFTSSxRQUFyQztBQUN2QjtBQUNELFFBQUl0QixPQUFPb0IsS0FBWCxFQUFrQnhCLFFBQVFFLEdBQVIsbUJBQTRCVSxLQUFLYSxRQUFqQyxjQUFrRGYsSUFBbEQsVUFBNkRFLElBQTdEO0FBQ2xCLFNBQUtKLEtBQUwsQ0FBV0UsSUFBWCxFQUFpQmlCLE9BQWpCLENBQXlCZixJQUF6QjtBQUNBLElBVEQsTUFVSztBQUNKO0FBQ0EsUUFBSSxDQUFDQSxLQUFLYSxRQUFWLEVBQW9CYixLQUFLYSxRQUFMLEdBQWdCZixJQUFoQjtBQUNwQixTQUFLRixLQUFMLENBQVdFLElBQVgsSUFBbUJFLElBQW5CO0FBQ0E7QUFDRCxVQUFPQSxJQUFQO0FBQ0E7O0FBR0Y7QUFDQTtBQUNBOztBQUVDO0FBQ0E7QUFDQTtBQUNBOzs7O21DQUN3QmdCLE0sRUFBUUMsVSxFQUFZQyxRLEVBQTBCO0FBQUEsT0FBaEJDLFVBQWdCLHVFQUFILENBQUc7O0FBQ3JFLE9BQUlILE9BQU9HLFVBQVAsTUFBdUJGLFVBQTNCLEVBQXVDLE1BQU0sSUFBSWYsV0FBSixnQkFBNkJlLFVBQTdCLG1CQUFxREUsVUFBckQsZ0JBQU47QUFDdkMsT0FBSUMsVUFBVSxDQUFkO0FBQ0EsT0FBSUMsU0FBUyxLQUFiO0FBQ0EsUUFBSyxJQUFJQyxXQUFXSCxhQUFhLENBQTVCLEVBQStCSSxZQUFZUCxPQUFPUCxNQUF2RCxFQUErRGEsV0FBV0MsU0FBMUUsRUFBcUZELFVBQXJGLEVBQWlHO0FBQ2hHLFFBQUlFLFFBQVFSLE9BQU9NLFFBQVAsQ0FBWjtBQUNBLFFBQUlFLFVBQVVQLFVBQWQsRUFBMEI7QUFDekJHO0FBQ0FDLGNBQVMsSUFBVDtBQUNBO0FBQ0QsUUFBSUcsVUFBVU4sUUFBZCxFQUF3QjtBQUN2QixTQUFJRSxZQUFZLENBQWhCLEVBQ0MsT0FBTyxFQUFFRCxzQkFBRixFQUFjRyxrQkFBZCxFQUF3QkcsT0FBT1QsT0FBT1MsS0FBUCxDQUFhTixhQUFXLENBQXhCLEVBQTJCRyxRQUEzQixDQUEvQixFQUFxRUQsY0FBckUsRUFBUDtBQUNERDtBQUNBO0FBQ0Q7QUFDRCxTQUFNLElBQUlsQixXQUFKLDhCQUEyQ2dCLFFBQTNDLDRCQUEwRUMsVUFBMUUsQ0FBTjtBQUNBOztBQUdEO0FBQ0E7Ozs7OztBQU9BO0FBQ0E7QUFDQTt5Q0FDOEJPLE0sRUFBUTtBQUNyQyxVQUFPQSxPQUFPQyxLQUFQLENBQWEsRUFBYixFQUFpQkMsR0FBakIsQ0FBcUIsVUFBVUMsSUFBVixFQUFnQkMsS0FBaEIsRUFBdUJDLElBQXZCLEVBQTZCO0FBQ3hEO0FBQ0EsUUFBSUYsU0FBUyxJQUFiLEVBQW1CLE9BQU8sSUFBUDtBQUNuQjtBQUNBLFFBQUlBLFNBQVMsR0FBYixFQUFrQixPQUFPLE1BQVA7QUFDbEI7QUFDQSxRQUFJckMsT0FBT3dDLHlCQUFQLENBQWlDSCxJQUFqQyxLQUEwQ0UsS0FBS0QsUUFBTSxDQUFYLE1BQWtCLElBQWhFLEVBQXNFLE9BQU8sT0FBS0QsSUFBWjtBQUN0RTtBQUNBLFdBQU9BLElBQVA7QUFDQSxJQVRNLEVBU0pJLElBVEksQ0FTQyxFQVRELENBQVA7QUFVQTs7QUFFRDs7OzttQ0FDd0JQLE0sRUFBUVEsSyxFQUFPO0FBQ3RDLFVBQU8sSUFBSUMsTUFBSixDQUFXM0MsT0FBTzRDLHNCQUFQLENBQThCVixNQUE5QixDQUFYLEVBQWtEUSxLQUFsRCxDQUFQO0FBQ0E7Ozs7OztBQW5IbUIxQyxNLENBRWI2QyxLLEdBQVEsSzs7QUFGSzdDLE0sQ0EwRmJ3Qyx5QixHQUE2QixZQUFXO0FBQzlDLEtBQU1NLFFBQVEsRUFBZDtBQUNBLHFCQUFvQlgsS0FBcEIsQ0FBMEIsRUFBMUIsRUFBOEJZLE9BQTlCLENBQXNDO0FBQUEsU0FBUUQsTUFBTVQsSUFBTixJQUFjLElBQXRCO0FBQUEsRUFBdEM7QUFDQSxRQUFPUyxLQUFQO0FBQ0EsQ0FKa0MsRTs7a0JBMUZmOUMsTTs7Ozs7Ozs7Ozs7Ozs7O3FqQkNqQnJCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQTs7Ozs7Ozs7Ozs7O0lBR3FCZ0QsSTtBQUNwQixlQUFZL0MsVUFBWixFQUF3QjtBQUFBOztBQUN2QixNQUFJLEtBQUtnRCxXQUFMLEtBQXFCRCxJQUFyQixJQUE2QixDQUFDLEtBQUtDLFdBQUwsQ0FBaUJDLFNBQWpCLENBQTJCQyxjQUEzQixDQUEwQyxhQUExQyxDQUFsQyxFQUE0RjtBQUM5RjtBQUNHO0FBQ0RqRCxTQUFPQyxNQUFQLENBQWMsSUFBZCxFQUFvQkYsVUFBcEI7QUFDQTs7QUFFRDs7Ozs7MEJBQ2dCO0FBQ2YsT0FBSW1ELFFBQVFsRCxPQUFPRyxNQUFQLENBQWMsSUFBZCxDQUFaOztBQURlLHFDQUFQZ0QsS0FBTztBQUFQQSxTQUFPO0FBQUE7O0FBRWZuRCxVQUFPQyxNQUFQLGdCQUFjaUQsS0FBZCxTQUF3QkMsS0FBeEI7QUFDQSxVQUFPRCxLQUFQO0FBQ0E7O0FBRUQ7QUFDQTs7Ozt5QkFDTztBQUNOLE9BQUksQ0FBQyxLQUFLN0MsTUFBTixJQUFnQixLQUFLdUIsUUFBTCxLQUFrQndCLFNBQXRDLEVBQ0MsTUFBTSxJQUFJQyxTQUFKLGdEQUE2RCxJQUE3RCxDQUFOO0FBQ0QsVUFBTyxLQUFLaEQsTUFBTCxDQUFZaUQsU0FBWixDQUFzQixLQUFLMUIsUUFBM0IsQ0FBUDtBQUNBOztBQUVGO0FBQ0E7QUFDQTs7QUFFQztBQUNBOzs7O3dCQUNNcEMsTSxFQUFRYSxNLEVBQVE7QUFDckIsVUFBTytDLFNBQVA7QUFDQTs7QUFFRDtBQUNBO0FBQ0E7Ozs7a0NBQ2dCNUQsTSxFQUFRYSxNLEVBQVE7QUFDL0IsVUFBTytDLFNBQVA7QUFDQTs7QUFFRjtBQUNBO0FBQ0E7O0FBRUM7QUFDQTtBQUNBOzs7Ozs7QUFLQTsyQkFDU0csTyxFQUFTO0FBQ2pCLFVBQU8sS0FBS3pDLE9BQVo7QUFDQTs7QUFFRjtBQUNBO0FBQ0E7Ozs7c0JBWGU7QUFDYixVQUFPLElBQVA7QUFDQTs7O3NCQVVjO0FBQ2QsVUFBTyxLQUFLaUMsV0FBTCxDQUFpQjNDLElBQXhCO0FBQ0E7Ozs7OztBQU1GO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztrQkE3RXFCMEMsSTtBQThFckJBLEtBQUtVLE9BQUw7QUFBQTs7QUFDQyxrQkFBWXpELFVBQVosRUFBd0I7QUFBQTs7QUFDdkI7QUFDQSxNQUFJLENBQUNBLFdBQVcwRCxPQUFoQixFQUF5QixNQUFNLElBQUlKLFNBQUosQ0FBYyx5REFBZCxDQUFOOztBQUl6QjtBQUNBO0FBUHVCLGdIQUlqQnRELFVBSmlCOztBQVF2QkMsU0FBTzBELGNBQVAsUUFBNEIsY0FBNUIsRUFBNEMsRUFBRUMsT0FBTyxJQUFJbEIsTUFBSixDQUFXLE1BQU0sTUFBS2dCLE9BQUwsQ0FBYUcsTUFBOUIsQ0FBVCxFQUE1QztBQVJ1QjtBQVN2Qjs7QUFFRDs7O0FBWkQ7QUFBQTtBQUFBLHdCQWFPcEUsTUFiUCxFQWFlYSxNQWJmLEVBYXVCO0FBQ3JCLE9BQUl3RCxRQUFReEQsT0FBT3dELEtBQVAsQ0FBYSxLQUFLQyxZQUFsQixDQUFaO0FBQ0EsT0FBSSxDQUFDRCxLQUFMLEVBQVksT0FBT1QsU0FBUDs7QUFFWjtBQUNBLE9BQUl0QyxVQUFVK0MsTUFBTSxDQUFOLENBQWQ7QUFDQSxPQUFJLEtBQUtFLFNBQUwsSUFBa0IsS0FBS0EsU0FBTCxDQUFlakQsT0FBZixDQUF0QixFQUErQyxPQUFPc0MsU0FBUDs7QUFFL0MsVUFBTyxLQUFLRixLQUFMLENBQVc7QUFDakJwQyxvQkFEaUI7QUFFakI7QUFDQVcsZ0JBQVlwQixPQUFPb0IsVUFIRjtBQUlqQkcsY0FBVXZCLE9BQU9vQixVQUFQLEdBQW9CWCxRQUFRQyxNQUpyQjtBQUtqQlY7QUFMaUIsSUFBWCxDQUFQO0FBT0E7O0FBRUQ7O0FBOUJEO0FBQUE7QUFBQSxrQ0ErQmlCYixNQS9CakIsRUErQnlCYSxNQS9CekIsRUErQmlDO0FBQy9CLFVBQU8sSUFBUDtBQUNBO0FBakNGO0FBQUE7QUFBQSxtQ0FtQzBCO0FBQUE7O0FBQ3hCLE9BQUksQ0FBQyxLQUFLMEQsU0FBVixFQUFxQixLQUFLQSxTQUFMLEdBQWlCLEVBQWpCOztBQURHLHNDQUFQQyxLQUFPO0FBQVBBLFNBQU87QUFBQTs7QUFFeEJBLFNBQU1uQixPQUFOLENBQWM7QUFBQSxXQUFRLE9BQUtrQixTQUFMLENBQWVFLElBQWYsSUFBdUIsSUFBL0I7QUFBQSxJQUFkO0FBQ0E7QUF0Q0Y7QUFBQTtBQUFBLDZCQXdDWTtBQUNWLFVBQU8sS0FBS1IsT0FBTCxDQUFhRyxNQUFwQjtBQUNBO0FBMUNGOztBQUFBO0FBQUEsRUFBcUNkLElBQXJDOztBQTZDQTtBQUNBO0FBQ0E7QUFDQUEsS0FBS29CLE1BQUw7QUFBQTs7QUFDQyxrQkFBWW5FLFVBQVosRUFBd0I7QUFBQTs7QUFDdkI7QUFDQSxNQUFJLENBQUNBLFdBQVdpQyxNQUFoQixFQUF3QixNQUFNLElBQUlxQixTQUFKLENBQWMsNkNBQWQsQ0FBTjs7QUFFeEI7QUFDQSxNQUFJLENBQUN0RCxXQUFXMEQsT0FBaEIsRUFBeUI7QUFDeEIxRCxjQUFXMEQsT0FBWCxHQUFxQixpQkFBT1UsZ0JBQVAsQ0FBd0JwRSxXQUFXaUMsTUFBbkMsQ0FBckI7QUFDSDtBQUNHOztBQUVIO0FBVnlCLDJHQVdqQmpDLFVBWGlCO0FBWXZCOztBQWJGO0FBQUE7QUFBQSw2QkFnQlk7QUFDVixlQUFVLEtBQUtpQyxNQUFmLElBQXdCLEtBQUtvQyxRQUFMLEdBQWdCLEdBQWhCLEdBQXNCLEVBQTlDO0FBQ0E7QUFsQkY7O0FBQUE7QUFBQSxFQUFtQ3RCLEtBQUtVLE9BQXhDOztBQXFCQTtBQUNBVixLQUFLdUIsWUFBTCxHQUFvQixVQUFTQyxLQUFULEVBQWdCQyxNQUFoQixFQUF3QjtBQUMzQyxRQUFPLElBQUl6QixLQUFLb0IsTUFBVCxDQUFnQixFQUFFbEMsUUFBUXNDLE1BQU10QyxNQUFOLEdBQWV1QyxPQUFPdkMsTUFBaEMsRUFBaEIsQ0FBUDtBQUNBLENBRkQ7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0FjLEtBQUswQixPQUFMO0FBQUE7O0FBQ0Msa0JBQVl6RSxVQUFaLEVBQXdCO0FBQUE7O0FBQ3ZCO0FBQ0EsTUFBSSxDQUFDQSxXQUFXaUMsTUFBaEIsRUFBd0IsTUFBTSxJQUFJcUIsU0FBSixDQUFjLDhDQUFkLENBQU47O0FBRXhCO0FBQ0EsTUFBSSxDQUFDdEQsV0FBVzBELE9BQWhCLEVBQXlCO0FBQ3hCO0FBQ0EsT0FBSWdCLGdCQUFnQixpQkFBTy9CLHNCQUFQLENBQThCM0MsV0FBV2lDLE1BQXpDLENBQXBCO0FBQ0FqQyxjQUFXMEQsT0FBWCxHQUFxQixJQUFJaEIsTUFBSixDQUFXLFFBQVFnQyxhQUFSLEdBQXdCLEtBQW5DLENBQXJCO0FBQ0E7QUFUc0IsMkdBVWpCMUUsVUFWaUI7QUFXdkI7O0FBWkY7QUFBQTtBQUFBLDZCQWNZO0FBQ1YsZUFBVSxLQUFLaUMsTUFBZixJQUF3QixLQUFLb0MsUUFBTCxHQUFnQixHQUFoQixHQUFzQixFQUE5QztBQUNBO0FBaEJGOztBQUFBO0FBQUEsRUFBcUN0QixLQUFLVSxPQUExQzs7QUFvQkE7QUFDQVYsS0FBSzRCLGFBQUwsR0FBcUIsVUFBU0osS0FBVCxFQUFnQkMsTUFBaEIsRUFBd0I7QUFDNUMsUUFBTyxJQUFJekIsS0FBSzBCLE9BQVQsQ0FBaUIsRUFBRXhDLFFBQVFzQyxNQUFNdEMsTUFBTixHQUFlLEdBQWYsR0FBcUJ1QyxPQUFPdkMsTUFBdEMsRUFBakIsQ0FBUDtBQUNBLENBRkQ7O0FBS0E7QUFDQTtBQUNBYyxLQUFLNkIsT0FBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBO0FBQUEsd0JBQ09uRixNQURQLEVBQ2VhLE1BRGYsRUFDdUI7QUFDckIsT0FBSUMsT0FBT2QsT0FBT2UsT0FBUCxDQUFlLEtBQUtELElBQXBCLENBQVg7QUFDQSxPQUFJLENBQUNBLElBQUwsRUFBVyxNQUFNLElBQUlFLFdBQUosd0NBQXFELEtBQUtGLElBQTFELE9BQU47QUFDWCxPQUFJdUQsUUFBUXZELEtBQUtJLEtBQUwsQ0FBV2xCLE1BQVgsRUFBbUJhLE1BQW5CLENBQVo7QUFDQSxPQUFJLENBQUN3RCxLQUFMLEVBQVksT0FBT1QsU0FBUDs7QUFFWixPQUFJLEtBQUtoQyxRQUFULEVBQW1CeUMsTUFBTXpDLFFBQU4sR0FBaUIsS0FBS0EsUUFBdEI7QUFDbkIsVUFBT3lDLEtBQVA7QUFDQTtBQVRGO0FBQUE7QUFBQSxrQ0FXaUJyRSxNQVhqQixFQVd5QmEsTUFYekIsRUFXaUM7QUFDL0IsT0FBSUMsT0FBT2QsT0FBT2UsT0FBUCxDQUFlLEtBQUtELElBQXBCLENBQVg7QUFDQSxPQUFJLENBQUNBLElBQUwsRUFBVyxPQUFPLEtBQVA7QUFDWCxVQUFPQSxLQUFLc0UsZUFBTCxDQUFxQnBGLE1BQXJCLEVBQTZCYSxNQUE3QixDQUFQO0FBQ0E7QUFmRjtBQUFBO0FBQUEsNkJBaUJZO0FBQ1YsaUJBQVcsS0FBS2UsUUFBTCxHQUFnQixLQUFLQSxRQUFMLEdBQWMsR0FBOUIsR0FBb0MsRUFBL0MsSUFBb0QsS0FBS2QsSUFBekQsVUFBaUUsS0FBSzhELFFBQUwsR0FBZ0IsR0FBaEIsR0FBc0IsRUFBdkY7QUFDQTtBQW5CRjs7QUFBQTtBQUFBLEVBQXFDdEIsSUFBckM7O0FBd0JBO0FBQ0FBLEtBQUsrQixNQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7OztBQUVDO0FBRkQsa0NBR2lCckYsTUFIakIsRUFHeUJhLE1BSHpCLEVBR2lDO0FBQy9CLFVBQU8sS0FBS0gsS0FBTCxDQUFXNEUsS0FBWCxDQUFpQjtBQUFBLFdBQVF4RSxLQUFLc0UsZUFBTCxDQUFxQnBGLE1BQXJCLEVBQTZCYSxNQUE3QixDQUFSO0FBQUEsSUFBakIsQ0FBUDtBQUNBO0FBTEY7O0FBQUE7QUFBQSxFQUFtQ3lDLElBQW5DOztBQVNBO0FBQ0FBLEtBQUtpQyxRQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSx3QkFDT3ZGLE1BRFAsRUFDZWEsTUFEZixFQUN1QjtBQUNyQixPQUFJUyxVQUFVLEVBQWQ7QUFBQSxPQUFrQmtFLE9BQU8zRSxNQUF6QjtBQURxQjtBQUFBO0FBQUE7O0FBQUE7QUFFckIseUJBQWlCLEtBQUtILEtBQXRCLDhIQUE2QjtBQUFBLFNBQXBCSSxJQUFvQjs7QUFDNUIwRSxZQUFPeEYsT0FBT2lCLGFBQVAsQ0FBcUJ1RSxJQUFyQixDQUFQO0FBQ0EsU0FBSW5CLFFBQVF2RCxLQUFLSSxLQUFMLENBQVdsQixNQUFYLEVBQW1Cd0YsSUFBbkIsQ0FBWjtBQUNBLFNBQUksQ0FBQ25CLEtBQUQsSUFBVSxDQUFDdkQsS0FBSzhELFFBQXBCLEVBQThCLE9BQU9oQixTQUFQO0FBQzlCLFNBQUlTLEtBQUosRUFBVztBQUNWL0MsY0FBUW1FLElBQVIsQ0FBYXBCLEtBQWI7QUFDQW1CLGFBQU9uQixNQUFNbUIsSUFBTixFQUFQO0FBQ0E7QUFDRDtBQUNEO0FBWHFCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBWXJCLFVBQU8sS0FBSzlCLEtBQUwsQ0FBVztBQUNqQnBDLG9CQURpQjtBQUVqQjtBQUNBb0UsaUJBQWE3RSxPQUFPOEUsS0FBUCxDQUFhOUUsT0FBT29CLFVBQXBCLEVBQWdDdUQsS0FBS3ZELFVBQXJDLENBSEk7QUFJakI7QUFDQUEsZ0JBQVlwQixPQUFPb0IsVUFMRjtBQU1qQkcsY0FBVW9ELEtBQUt2RCxVQU5FO0FBT2pCcEI7QUFQaUIsSUFBWCxDQUFQO0FBU0E7O0FBRUY7QUFDQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUEvQkQ7QUFBQTtBQUFBLDZCQW9EWTtBQUNWLGVBQVUsS0FBS0gsS0FBTCxDQUFXcUMsSUFBWCxDQUFnQixHQUFoQixDQUFWLElBQWlDLEtBQUs2QixRQUFMLEdBQWdCLEdBQWhCLEdBQXNCLEVBQXZEO0FBQ0E7QUF0REY7QUFBQTtBQUFBLHNCQWdDZTtBQUNiLE9BQUksQ0FBQyxLQUFLdEQsT0FBVixFQUFtQixPQUFPc0MsU0FBUDtBQUNuQixPQUFJLENBQUMsS0FBS2dDLFFBQVYsRUFBb0I7QUFDbkIsUUFBSUMsVUFBVSxLQUFLRCxRQUFMLEdBQWdCLEVBQTlCO0FBRG1CO0FBQUE7QUFBQTs7QUFBQTtBQUVuQiwyQkFBa0IsS0FBS3RFLE9BQXZCLG1JQUFnQztBQUFBLFVBQXZCK0MsS0FBdUI7O0FBQy9CLFVBQUl5QixVQUFVekIsTUFBTXpDLFFBQU4sSUFBa0J5QyxNQUFNMUMsUUFBeEIsSUFBb0MwQyxNQUFNZCxXQUFOLENBQWtCM0MsSUFBcEU7O0FBRUE7QUFDQSxVQUFJa0YsV0FBV0QsT0FBZixFQUF3QjtBQUN2QixXQUFJLENBQUNFLE1BQU1DLE9BQU4sQ0FBY0gsUUFBUUMsT0FBUixDQUFkLENBQUwsRUFBc0NELFFBQVFDLE9BQVIsSUFBbUIsQ0FBQ0QsUUFBUUMsT0FBUixDQUFELENBQW5CO0FBQ3RDRCxlQUFRQyxPQUFSLEVBQWlCTCxJQUFqQixDQUFzQnBCLEtBQXRCO0FBQ0EsT0FIRCxNQUlLO0FBQ0p3QixlQUFRQyxPQUFSLElBQW1CekIsS0FBbkI7QUFDQTtBQUNEO0FBYmtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFjbkI7QUFDRCxVQUFPLEtBQUt1QixRQUFaO0FBQ0E7QUFsREY7O0FBQUE7QUFBQSxFQUF1Q3RDLEtBQUsrQixNQUE1Qzs7QUEwREE7QUFDQS9CLEtBQUsyQyxVQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSx3QkFDT2pHLE1BRFAsRUFDZWEsTUFEZixFQUN1QjtBQUNyQixPQUFJLEtBQUtxRixXQUFULEVBQXNCO0FBQ3hCO0FBQ0csV0FBT3RDLFNBQVA7QUFDQTtBQUNEO0FBQ0Y7QUFDRSxPQUFJLEtBQUt1QyxhQUFULEVBQXdCO0FBQ3ZCLFNBQUtELFdBQUwsR0FBbUIsSUFBbkI7QUFDSDtBQUNHO0FBQ0QsT0FBSTdCLHNIQUFvQnJFLE1BQXBCLEVBQTRCYSxNQUE1QixDQUFKO0FBQ0EsT0FBSSxLQUFLc0YsYUFBVCxFQUF3QjtBQUMxQjtBQUNHLFdBQU8sS0FBS0QsV0FBWjtBQUNBO0FBQ0QsVUFBTzdCLEtBQVA7QUFDQTtBQWxCRjs7QUFBQTtBQUFBLEVBQTJDZixLQUFLaUMsUUFBaEQ7O0FBc0JBO0FBQ0FqQyxLQUFLOEMsU0FBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQXlDOUMsS0FBS2lDLFFBQTlDOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQWpDLEtBQUs3QixZQUFMO0FBQUE7O0FBQ0MsdUJBQVlrQyxLQUFaLEVBQW1CO0FBQUE7O0FBQUEsNEhBQ1pBLEtBRFk7O0FBRWxCLE1BQUksQ0FBQyxRQUFLakQsS0FBVixFQUFpQixRQUFLQSxLQUFMLEdBQWEsRUFBYjtBQUZDO0FBR2xCOztBQUVEOzs7QUFORDtBQUFBO0FBQUEsd0JBT09WLE1BUFAsRUFPZWEsTUFQZixFQU91QjtBQUNyQixPQUFJd0Ysa0JBQUo7QUFEcUI7QUFBQTtBQUFBOztBQUFBO0FBRXJCLDBCQUFpQixLQUFLM0YsS0FBdEIsbUlBQTZCO0FBQUEsU0FBcEJJLElBQW9COztBQUM1QixTQUFJdUQsUUFBUXZELEtBQUtJLEtBQUwsQ0FBV2xCLE1BQVgsRUFBbUJhLE1BQW5CLENBQVo7QUFDQSxTQUFJLENBQUN3RCxLQUFMLEVBQVk7O0FBRVo7QUFDQSxTQUFJLENBQUNnQyxTQUFELElBQWNoQyxNQUFNakMsUUFBTixHQUFpQmlFLFVBQVVqRSxRQUE3QyxFQUNDaUUsWUFBWWhDLEtBQVo7QUFDRDtBQVRvQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOztBQVVyQixPQUFJLENBQUNnQyxTQUFMLEVBQWdCLE9BQU96QyxTQUFQOztBQUVoQjtBQUNBLE9BQUksS0FBS2hDLFFBQVQsRUFBbUJ5RSxVQUFVekUsUUFBVixHQUFxQixLQUFLQSxRQUExQixDQUFuQixLQUNLLElBQUksS0FBS0QsUUFBVCxFQUFtQjBFLFVBQVUxRSxRQUFWLEdBQXFCLEtBQUtBLFFBQTFCO0FBQzFCO0FBQ0UsVUFBTzBFLFNBQVA7QUFDQTtBQXhCRjtBQUFBO0FBQUEsMEJBMEJTdkYsSUExQlQsRUEwQmU7QUFDYixRQUFLSixLQUFMLENBQVcrRSxJQUFYLENBQWdCM0UsSUFBaEI7QUFDQTtBQTVCRjtBQUFBO0FBQUEsMkJBOEJVaUQsT0E5QlYsRUE4Qm1CO0FBQ2pCLFVBQU8sS0FBS3pDLE9BQUwsQ0FBYWdGLFFBQWIsQ0FBc0J2QyxPQUF0QixDQUFQO0FBQ0E7QUFoQ0Y7QUFBQTtBQUFBLDZCQWtDWTtBQUNWLGlCQUFXLEtBQUtuQyxRQUFMLEdBQWdCLEtBQUtBLFFBQUwsR0FBYyxHQUE5QixHQUFvQyxFQUEvQyxJQUFvRCxLQUFLbEIsS0FBTCxDQUFXcUMsSUFBWCxDQUFnQixHQUFoQixDQUFwRCxVQUE0RSxLQUFLNkIsUUFBTCxHQUFnQixHQUFoQixHQUFzQixFQUFsRztBQUNBO0FBcENGOztBQUFBO0FBQUEsRUFBK0N0QixLQUFLK0IsTUFBcEQ7O0FBeUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQS9CLEtBQUtpRCxNQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSx3QkFDT3ZHLE1BRFAsRUFDZWEsTUFEZixFQUN1QjtBQUNyQixPQUFJMkUsT0FBTzNFLE1BQVg7QUFDQSxPQUFJUyxVQUFVLEVBQWQ7QUFDQSxVQUFPLElBQVAsRUFBYTtBQUNaa0UsV0FBT3hGLE9BQU9pQixhQUFQLENBQXFCdUUsSUFBckIsQ0FBUDtBQUNBLFFBQUluQixRQUFRLEtBQUt2RCxJQUFMLENBQVVJLEtBQVYsQ0FBZ0JsQixNQUFoQixFQUF3QndGLElBQXhCLENBQVo7QUFDQSxRQUFJLENBQUNuQixLQUFMLEVBQVk7O0FBRVovQyxZQUFRbUUsSUFBUixDQUFhcEIsS0FBYjtBQUNBbUIsV0FBT25CLE1BQU1tQixJQUFOLEVBQVA7QUFDQTs7QUFFRCxPQUFJbEUsUUFBUUMsTUFBUixLQUFtQixDQUF2QixFQUEwQixPQUFPcUMsU0FBUDs7QUFFMUIsVUFBTyxLQUFLRixLQUFMLENBQVc7QUFDakJwQyxvQkFEaUI7QUFFakI7QUFDQW9FLGlCQUFhN0UsT0FBTzhFLEtBQVAsQ0FBYTlFLE9BQU9vQixVQUFwQixFQUFnQ3VELEtBQUt2RCxVQUFyQyxDQUhJO0FBSWpCO0FBQ0FBLGdCQUFZcEIsT0FBT29CLFVBTEY7QUFNakJHLGNBQVVvRCxLQUFLdkQsVUFORTtBQU9qQnBCO0FBUGlCLElBQVgsQ0FBUDtBQVNBOztBQUVEO0FBQ0E7QUFDQTtBQUNBOztBQTdCRDtBQUFBO0FBQUEsNkJBb0NZO0FBQ1YsU0FBTSw2Q0FBTjtBQUNBO0FBdENGO0FBQUE7QUFBQSw2QkF3Q1k7QUFDVixPQUFNQyxPQUFRLEtBQUtBLElBQUwsWUFBcUJ3QyxLQUFLaUMsUUFBMUIsSUFBc0MsS0FBS3pFLElBQUwsWUFBcUJ3QyxLQUFLMEIsT0FBMUIsSUFBcUMsS0FBS2xFLElBQUwsQ0FBVTBCLE1BQVYsQ0FBaUJnRSxRQUFqQixDQUEwQixHQUExQixDQUEzRSxTQUNILEtBQUsxRixJQURGLGNBRUosS0FBS0EsSUFGZjtBQUlBLGVBQVVBLElBQVYsSUFBaUIsS0FBSzhELFFBQUwsR0FBZ0IsR0FBaEIsR0FBc0IsR0FBdkM7QUFDQTtBQTlDRjtBQUFBO0FBQUEsc0JBOEJlO0FBQ2IsT0FBSSxDQUFDLEtBQUt0RCxPQUFWLEVBQW1CLE9BQU9zQyxTQUFQO0FBQ25CLFVBQU8sS0FBS2dDLFFBQUwsS0FBa0IsS0FBS0EsUUFBTCxHQUFnQixLQUFLdEUsT0FBTCxDQUFhb0IsR0FBYixDQUFrQjtBQUFBLFdBQVMyQixNQUFNd0IsT0FBZjtBQUFBLElBQWxCLENBQWxDLENBQVA7QUFFQTtBQWxDRjs7QUFBQTtBQUFBLEVBQW1DdkMsS0FBSytCLE1BQXhDOztBQWtEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBL0IsS0FBS21ELElBQUw7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLHdCQUNPekcsTUFEUCxFQUNlYSxNQURmLEVBQ3VCO0FBQ3JCO0FBQ0EsUUFBSzZGLElBQUwsQ0FBVTlCLFFBQVYsR0FBcUIsSUFBckI7QUFDQSxRQUFLK0IsU0FBTCxDQUFlL0IsUUFBZixHQUEwQixJQUExQjs7QUFFQSxPQUFJdEQsVUFBVSxFQUFkO0FBQUEsT0FBa0JrRSxPQUFPM0UsTUFBekI7QUFDQSxVQUFPLElBQVAsRUFBYTtBQUNaMkUsV0FBT3hGLE9BQU9pQixhQUFQLENBQXFCdUUsSUFBckIsQ0FBUDtBQUNBO0FBQ0EsUUFBSWtCLE9BQU8sS0FBS0EsSUFBTCxDQUFVeEYsS0FBVixDQUFnQmxCLE1BQWhCLEVBQXdCd0YsSUFBeEIsQ0FBWDtBQUNBLFFBQUksQ0FBQ2tCLElBQUwsRUFBVztBQUNkO0FBQ0dwRixZQUFRbUUsSUFBUixDQUFhaUIsSUFBYjtBQUNBbEIsV0FBT2tCLEtBQUtsQixJQUFMLEVBQVA7O0FBRUFBLFdBQU94RixPQUFPaUIsYUFBUCxDQUFxQnVFLElBQXJCLENBQVA7QUFDQTtBQUNBLFFBQUltQixZQUFZLEtBQUtBLFNBQUwsQ0FBZXpGLEtBQWYsQ0FBcUJsQixNQUFyQixFQUE2QndGLElBQTdCLENBQWhCO0FBQ0EsUUFBSSxDQUFDbUIsU0FBTCxFQUFnQjtBQUNoQm5CLFdBQU9tQixVQUFVbkIsSUFBVixFQUFQO0FBQ0E7O0FBRUQsVUFBTyxLQUFLOUIsS0FBTCxDQUFXO0FBQ2pCcEMsb0JBRGlCO0FBRWpCO0FBQ0FvRSxpQkFBYTdFLE9BQU84RSxLQUFQLENBQWE5RSxPQUFPb0IsVUFBcEIsRUFBZ0N1RCxLQUFLdkQsVUFBckMsQ0FISTtBQUlqQjtBQUNBQSxnQkFBWVgsUUFBUSxDQUFSLElBQWFBLFFBQVEsQ0FBUixFQUFXVyxVQUF4QixHQUFxQ3BCLE9BQU9vQixVQUx2QztBQU1qQkcsY0FBVW9ELEtBQUt2RCxVQU5FO0FBT2pCcEI7QUFQaUIsSUFBWCxDQUFQO0FBU0E7O0FBRUQ7O0FBbENEO0FBQUE7QUFBQSwwQkFtQ1MrQixLQW5DVCxFQW1DZ0I7QUFDZCxPQUFJLENBQUMsS0FBS3RCLE9BQVYsRUFBbUIsT0FBT3NDLFNBQVA7QUFDbkIsVUFBTyxLQUFLdEMsT0FBTCxDQUFhc0IsS0FBYixDQUFQO0FBQ0E7QUF0Q0Y7QUFBQTtBQUFBLDJCQXdDVW1CLE9BeENWLEVBd0NtQjtBQUNqQixPQUFJLENBQUMsS0FBS3pDLE9BQVYsRUFBbUIsT0FBT3NDLFNBQVAsQ0FERixDQUNxQjtBQUN0QyxPQUFJdEMsVUFBVSxLQUFLQSxPQUFMLENBQWFvQixHQUFiLENBQWtCO0FBQUEsV0FBUzJCLE1BQU1pQyxRQUFOLENBQWV2QyxPQUFmLENBQVQ7QUFBQSxJQUFsQixFQUFxRGhCLElBQXJELENBQTBELElBQTFELENBQWQ7QUFDQSxnQkFBV3pCLE9BQVg7QUFDQTtBQTVDRjtBQUFBO0FBQUEsNkJBOENZO0FBQ1YsaUJBQVcsS0FBS00sUUFBTCxHQUFnQixLQUFLQSxRQUFMLEdBQWMsR0FBOUIsR0FBb0MsRUFBL0MsSUFBb0QsS0FBSzhFLElBQXpELFNBQWlFLEtBQUtDLFNBQXRFLFVBQW1GLEtBQUsvQixRQUFMLEdBQWdCLEdBQWhCLEdBQXNCLEVBQXpHO0FBQ0E7QUFoREY7O0FBQUE7QUFBQSxFQUErQnRCLElBQS9CLEU7Ozs7Ozs7Ozs7Ozs7OztBQ2piQTs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOUMsT0FBT0MsTUFBUCxpQkFBb0I7O0FBRXBCO0FBQ0E7QUFDQTs7QUFFQTtBQUNDbUcsZ0JBUG1CLDJCQU9IQyxNQVBHLEVBTzBDO0FBQUEsTUFBckNDLG1CQUFxQyx1RUFBZixlQUFLdkIsUUFBVTs7QUFDNUQsTUFBSXdCLGVBQWUsZUFBS0Msa0JBQUwsQ0FBd0JILE1BQXhCLENBQW5CO0FBQ0EsTUFBSW5HLFFBQVEsZUFBS3VHLHNCQUFMLENBQTRCRixZQUE1QixFQUEwQyxFQUExQyxDQUFaOztBQUVBLE1BQUlqRyxhQUFKO0FBQ0E7QUFDQSxNQUFJSixNQUFNYSxNQUFOLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3ZCVCxVQUFPSixNQUFNLENBQU4sQ0FBUDtBQUNBLEdBRkQsTUFHSztBQUNKSSxVQUFPLElBQUlnRyxtQkFBSixDQUF3QixFQUFFcEcsWUFBRixFQUF4QixDQUFQO0FBQ0E7O0FBRUQsU0FBT0ksSUFBUDtBQUNBLEVBckJrQjtBQXVCbkJrRyxtQkF2Qm1CLDhCQXVCQUgsTUF2QkEsRUF1QlE7QUFDMUIsTUFBTUssb0JBQW9CLDBDQUExQjtBQUNBLE1BQUlILGVBQWVGLE9BQU94QyxLQUFQLENBQWE2QyxpQkFBYixDQUFuQjtBQUNBLE1BQUksQ0FBQ0gsWUFBTCxFQUFtQixNQUFNLElBQUkvRixXQUFKLHlDQUFzRDZGLE1BQXRELFFBQU47QUFDbkIsU0FBT0UsWUFBUDtBQUNBLEVBNUJrQjtBQThCbkJFLHVCQTlCbUIsa0NBOEJJRixZQTlCSixFQThCa0JyRyxLQTlCbEIsRUE4QnlDO0FBQUEsTUFBaEJ1QixVQUFnQix1RUFBSCxDQUFHOztBQUMzRCxNQUFJSSxZQUFZMEUsYUFBYXhGLE1BQTdCO0FBQ0EsU0FBT1UsYUFBYUksU0FBcEIsRUFBK0I7QUFBQSwrQkFDTCxlQUFLOEUscUJBQUwsQ0FBMkJKLFlBQTNCLEVBQXlDckcsS0FBekMsRUFBZ0R1QixVQUFoRCxDQURLO0FBQUE7QUFBQSxPQUN4Qm5CLElBRHdCO0FBQUEsT0FDbEJzQixRQURrQjs7QUFFOUIsT0FBSXRCLElBQUosRUFBVTtBQUNULFFBQUlzRyxPQUFPMUcsTUFBTUEsTUFBTWEsTUFBTixHQUFhLENBQW5CLENBQVg7QUFDQTtBQUNBLFFBQUk2RixRQUFRQSxnQkFBZ0IsZUFBSzFDLE1BQTdCLElBQXVDNUQsZ0JBQWdCLGVBQUs0RCxNQUFoRSxFQUF3RTtBQUN2RTtBQUNBaEUsV0FBTTJHLEdBQU47QUFDQTtBQUNBdkcsWUFBTyxlQUFLK0QsWUFBTCxDQUFrQnVDLElBQWxCLEVBQXdCdEcsSUFBeEIsQ0FBUDtBQUNBO0FBQ0Q7QUFOQSxTQU9LLElBQUlzRyxRQUFRQSxnQkFBZ0IsZUFBS3BDLE9BQTdCLElBQXdDbEUsZ0JBQWdCLGVBQUtrRSxPQUFqRSxFQUEwRTtBQUM5RTtBQUNBdEUsWUFBTTJHLEdBQU47QUFDQTtBQUNBdkcsYUFBTyxlQUFLb0UsYUFBTCxDQUFtQmtDLElBQW5CLEVBQXlCdEcsSUFBekIsQ0FBUDtBQUNBO0FBQ0RKLFVBQU0rRSxJQUFOLENBQVczRSxJQUFYO0FBQ0E7QUFDRG1CLGdCQUFhRyxXQUFXLENBQXhCO0FBQ0E7QUFDRCxTQUFPMUIsS0FBUDtBQUNBLEVBdkRrQjtBQXlEbkJ5RyxzQkF6RG1CLGlDQXlER0osWUF6REgsRUF5RGlCckcsS0F6RGpCLEVBeUR3QztBQUFBLE1BQWhCdUIsVUFBZ0IsdUVBQUgsQ0FBRzs7QUFDMUQsTUFBSXFGLGNBQWNQLGFBQWE5RSxVQUFiLENBQWxCOztBQUVBO0FBQ0E7QUFDQSxNQUFJcUYsZ0JBQWdCLElBQXBCLEVBQTBCO0FBQ3pCLFVBQU8sZUFBS0Msc0JBQUwsQ0FBNEJSLFlBQTVCLEVBQTBDckcsS0FBMUMsRUFBaUR1QixhQUFhLENBQTlELENBQVA7QUFDQTs7QUFFRCxVQUFRcUYsV0FBUjtBQUNDLFFBQUssR0FBTDtBQUFVLFdBQU8sZUFBS0UsdUJBQUwsQ0FBNkJULFlBQTdCLEVBQTJDckcsS0FBM0MsRUFBa0R1QixVQUFsRCxDQUFQO0FBQ1YsUUFBSyxHQUFMO0FBQVUsV0FBTyxlQUFLd0YsMkJBQUwsQ0FBaUNWLFlBQWpDLEVBQStDckcsS0FBL0MsRUFBc0R1QixVQUF0RCxDQUFQO0FBQ1YsUUFBSyxHQUFMO0FBQVUsV0FBTyxlQUFLeUYsb0JBQUwsQ0FBMEJYLFlBQTFCLEVBQXdDckcsS0FBeEMsRUFBK0N1QixVQUEvQyxDQUFQO0FBQ1YsUUFBSyxHQUFMO0FBQ0EsUUFBSyxHQUFMO0FBQ0EsUUFBSyxHQUFMO0FBQVUsV0FBTyxlQUFLMEYsc0JBQUwsQ0FBNEJaLFlBQTVCLEVBQTBDckcsS0FBMUMsRUFBaUR1QixVQUFqRCxDQUFQOztBQUVWO0FBQ0EsUUFBSyxHQUFMO0FBQ0EsUUFBSyxHQUFMO0FBQ0EsUUFBSyxHQUFMO0FBQ0EsUUFBSyxHQUFMO0FBQ0MsVUFBTSxJQUFJakIsV0FBSixpQkFBOEJzRyxXQUE5Qix1QkFBMkRyRixVQUEzRCxZQUE0RSxLQUFLNEUsTUFBakYsQ0FBTjs7QUFFRDtBQUNDLFdBQU8sZUFBS1Usc0JBQUwsQ0FBNEJSLFlBQTVCLEVBQTBDckcsS0FBMUMsRUFBaUR1QixVQUFqRCxDQUFQO0FBaEJGO0FBa0JBLEVBcEZrQjs7O0FBc0ZuQjtBQUNBO0FBQ0E7QUFDQXNGLHVCQXpGbUIsa0NBeUZJUixZQXpGSixFQXlGa0JyRyxLQXpGbEIsRUF5RnlCdUIsVUF6RnpCLEVBeUZxQztBQUN2RCxNQUFJTyxTQUFTdUUsYUFBYTlFLFVBQWIsQ0FBYjtBQUFBLE1BQXVDbkIsSUFBdkM7QUFDQTtBQUNBLE1BQUkwQixPQUFPNkIsS0FBUCxDQUFhLFdBQWIsQ0FBSixFQUErQjtBQUM5QnZELFVBQU8sSUFBSSxlQUFLa0UsT0FBVCxDQUFpQixFQUFFeEMsY0FBRixFQUFqQixDQUFQO0FBQ0E7QUFDRDtBQUhBLE9BSUs7QUFDSjFCLFdBQU8sSUFBSSxlQUFLNEQsTUFBVCxDQUFnQixFQUFFbEMsUUFBUUEsTUFBVixFQUFoQixDQUFQO0FBQ0E7QUFDQSxRQUFJQSxPQUFPb0YsVUFBUCxDQUFrQixJQUFsQixDQUFKLEVBQTZCO0FBQzVCO0FBQ0E5RyxVQUFLMEIsTUFBTCxHQUFjMUIsS0FBSzBCLE1BQUwsQ0FBWXFGLE1BQVosQ0FBbUIsQ0FBbkIsQ0FBZDtBQUNBO0FBQ0EvRyxVQUFLZ0gsUUFBTCxHQUFnQjtBQUFBLGFBQU10RixNQUFOO0FBQUEsTUFBaEI7QUFDQTtBQUNEO0FBQ0QsU0FBTyxDQUFFMUIsSUFBRixFQUFRbUIsVUFBUixDQUFQO0FBQ0EsRUEzR2tCOzs7QUE4R25CO0FBQ0E7QUFDQTtBQUNBO0FBQ0F3Riw0QkFsSG1CLHVDQWtIU1YsWUFsSFQsRUFrSHVCckcsS0FsSHZCLEVBa0g4QnVCLFVBbEg5QixFQWtIMEM7QUFBQSw4QkFDbEMsaUJBQU84RixnQkFBUCxDQUF3QmhCLFlBQXhCLEVBQXNDLEdBQXRDLEVBQTJDLEdBQTNDLEVBQWdEOUUsVUFBaEQsQ0FEa0M7QUFBQSxNQUN0REcsUUFEc0QseUJBQ3REQSxRQURzRDtBQUFBLE1BQzVDRyxLQUQ0Qyx5QkFDNUNBLEtBRDRDOztBQUc1RDs7O0FBQ0EsTUFBSVgsaUJBQUo7QUFDQSxNQUFJVyxNQUFNaEIsTUFBTixHQUFlLENBQWYsSUFBb0JnQixNQUFNLENBQU4sTUFBYSxHQUFyQyxFQUEwQztBQUN6Q1gsY0FBV1csTUFBTSxDQUFOLENBQVg7QUFDQUEsV0FBUUEsTUFBTUEsS0FBTixDQUFZLENBQVosQ0FBUjtBQUNBOztBQUVEO0FBQ0EsTUFBSXlGLGVBQ0hDLGtCQUFrQjFGLEtBQWxCLEVBQ0NHLEdBREQsQ0FDSyxVQUFTdkMsS0FBVCxFQUFnQjtBQUNwQixPQUFJMEYsVUFBVSxlQUFLb0Isc0JBQUwsQ0FBNEI5RyxLQUE1QixFQUFtQyxFQUFuQyxDQUFkO0FBQ0EsT0FBSTBGLFFBQVF0RSxNQUFSLEtBQW1CLENBQXZCLEVBQTBCO0FBQ3pCLFdBQU9zRSxRQUFRLENBQVIsQ0FBUDtBQUNBLElBRkQsTUFHSztBQUNKLFdBQU8sSUFBSSxlQUFLTixRQUFULENBQWtCLEVBQUU3RSxPQUFPbUYsT0FBVCxFQUFsQixDQUFQO0FBQ0E7QUFDRCxHQVRELENBREQ7O0FBWUEsTUFBSS9FLE9BQU9rSCxhQUFhekcsTUFBYixLQUF3QixDQUF4QixHQUE0QnlHLGFBQWEsQ0FBYixDQUE1QixHQUE4QyxJQUFJLGVBQUt2RyxZQUFULENBQXNCLEVBQUVmLE9BQU9zSCxZQUFULEVBQXRCLENBQXpEO0FBQ0EsTUFBSXBHLFFBQUosRUFBY2QsS0FBS2MsUUFBTCxHQUFnQkEsUUFBaEI7QUFDZCxTQUFPLENBQUVkLElBQUYsRUFBUXNCLFFBQVIsQ0FBUDs7QUFFQSxXQUFTNkYsaUJBQVQsQ0FBMkJuRyxNQUEzQixFQUFtQztBQUNsQyxPQUFJa0csZUFBZSxFQUFuQjtBQUNBLE9BQUlFLFVBQVUsRUFBZDtBQUNBLFFBQUssSUFBSUMsSUFBSSxDQUFSLEVBQVc3RixLQUFoQixFQUF1QkEsUUFBUVIsT0FBT3FHLENBQVAsQ0FBL0IsRUFBMENBLEdBQTFDLEVBQStDO0FBQzlDO0FBQ0EsUUFBSTdGLFVBQVUsR0FBZCxFQUFtQjtBQUNsQjBGLGtCQUFhdkMsSUFBYixDQUFrQnlDLE9BQWxCO0FBQ0FBLGVBQVUsRUFBVjtBQUNBO0FBQ0Q7QUFKQSxTQUtLLElBQUk1RixVQUFVLEdBQWQsRUFBbUI7QUFBQSxtQ0FDSixpQkFBT3lGLGdCQUFQLENBQXdCakcsTUFBeEIsRUFBZ0MsR0FBaEMsRUFBcUMsR0FBckMsRUFBMENxRyxDQUExQyxDQURJO0FBQUEsVUFDakIvRixTQURpQiwwQkFDakJBLFFBRGlCOztBQUV2QjhGLGdCQUFVQSxRQUFRRSxNQUFSLENBQWV0RyxPQUFPUyxLQUFQLENBQWE0RixDQUFiLEVBQWdCL0YsWUFBVyxDQUEzQixDQUFmLENBQVY7QUFDQStGLFVBQUkvRixTQUFKO0FBQ0EsTUFKSSxNQUtBO0FBQ0o4RixjQUFRekMsSUFBUixDQUFhbkQsS0FBYjtBQUNBO0FBQ0Q7QUFDRCxPQUFJNEYsUUFBUTNHLE1BQVosRUFBb0J5RyxhQUFhdkMsSUFBYixDQUFrQnlDLE9BQWxCO0FBQ3BCLFVBQU9GLFlBQVA7QUFDQTtBQUNELEVBbktrQjs7O0FBcUtuQjtBQUNBTCx1QkF0S21CLGtDQXNLSVosWUF0S0osRUFzS2tCckcsS0F0S2xCLEVBc0t5QnVCLFVBdEt6QixFQXNLcUM7QUFDdkQsTUFBSW9HLFNBQVN0QixhQUFhOUUsVUFBYixDQUFiO0FBQ0EsTUFBSW5CLE9BQU9KLE1BQU1BLE1BQU1hLE1BQU4sR0FBZSxDQUFyQixDQUFYO0FBQ0EsTUFBSSxDQUFDVCxJQUFMLEVBQVcsTUFBTSxJQUFJRSxXQUFKLGlDQUE4Q3FILE1BQTlDLHFCQUFOOztBQUVYO0FBQ0EsTUFBSUEsV0FBVyxHQUFYLElBQWtCQSxXQUFXLEdBQWpDLEVBQXNDO0FBQ3JDLE9BQUl6RyxXQUFXZCxLQUFLYyxRQUFwQjtBQUNBZCxVQUFPLElBQUksZUFBS3lGLE1BQVQsQ0FBZ0IsRUFBRXpGLFVBQUYsRUFBaEIsQ0FBUDtBQUNBLE9BQUljLFFBQUosRUFBY2QsS0FBS2MsUUFBTCxHQUFnQkEsUUFBaEI7QUFDZDtBQUNBbEIsU0FBTUEsTUFBTWEsTUFBTixHQUFlLENBQXJCLElBQTBCVCxJQUExQjtBQUNBOztBQUVEO0FBQ0EsTUFBSXVILFdBQVcsR0FBWCxJQUFrQkEsV0FBVyxHQUFqQyxFQUFzQztBQUNyQ3ZILFFBQUs4RCxRQUFMLEdBQWdCLElBQWhCO0FBQ0E7O0FBRUQsU0FBTyxDQUFFaEIsU0FBRixFQUFhM0IsVUFBYixDQUFQO0FBQ0EsRUExTGtCOzs7QUE0TG5CO0FBQ0E7QUFDQTtBQUNBdUYsd0JBL0xtQixtQ0ErTEtULFlBL0xMLEVBK0xtQnJHLEtBL0xuQixFQStMMEJ1QixVQS9MMUIsRUErTHNDO0FBQ3hELE1BQUlvQyxRQUFRLGlCQUFPMEQsZ0JBQVAsQ0FBd0JoQixZQUF4QixFQUFzQyxHQUF0QyxFQUEyQyxHQUEzQyxFQUFnRDlFLFVBQWhELENBQVo7QUFDQSxNQUFJTCxpQkFBSjtBQUNBLE1BQUl5QyxNQUFNOUIsS0FBTixDQUFZaEIsTUFBWixLQUF1QixDQUF2QixJQUE0QjhDLE1BQU05QixLQUFOLENBQVksQ0FBWixNQUFtQixHQUFuRCxFQUF3RDtBQUN2RFgsY0FBV3lDLE1BQU05QixLQUFOLENBQVksQ0FBWixDQUFYO0FBQ0E4QixTQUFNOUIsS0FBTixHQUFjOEIsTUFBTTlCLEtBQU4sQ0FBWUEsS0FBWixDQUFrQixDQUFsQixDQUFkO0FBQ0E7QUFDRCxNQUFJOEIsTUFBTTlCLEtBQU4sQ0FBWWhCLE1BQVosR0FBcUIsQ0FBekIsRUFBNEIsTUFBTSxJQUFJUCxXQUFKLHlEQUFzRXFELE1BQU05QixLQUFOLENBQVlRLElBQVosQ0FBaUIsRUFBakIsQ0FBdEUsT0FBTjs7QUFFNUIsTUFBSXVGLFNBQVMsRUFBRXhILE1BQU11RCxNQUFNOUIsS0FBTixDQUFZLENBQVosQ0FBUixFQUFiOztBQUVBO0FBQ0EsTUFBSWdHLGVBQWVELE9BQU94SCxJQUFQLENBQVkwSCxPQUFaLENBQW9CLEdBQXBCLENBQW5CO0FBQ0EsTUFBSUQsaUJBQWlCLENBQUMsQ0FBdEIsRUFBeUI7QUFDeEJELFVBQU9HLEdBQVAsR0FBYUgsT0FBT3hILElBQVAsQ0FBWStHLE1BQVosQ0FBbUJVLGVBQWUsQ0FBbEMsQ0FBYixDQUR3QixDQUMyQjtBQUNuREQsVUFBT3hILElBQVAsR0FBY3dILE9BQU94SCxJQUFQLENBQVkrRyxNQUFaLENBQW1CLENBQW5CLEVBQXNCVSxZQUF0QixDQUFkO0FBQ0E7O0FBRUQsTUFBSXpILE9BQU8sSUFBSSxlQUFLcUUsT0FBVCxDQUFpQm1ELE1BQWpCLENBQVg7QUFDQSxNQUFJMUcsUUFBSixFQUFjZCxLQUFLYyxRQUFMLEdBQWdCQSxRQUFoQjtBQUNkLFNBQU8sQ0FBRWQsSUFBRixFQUFRdUQsTUFBTWpDLFFBQWQsQ0FBUDtBQUNBLEVBcE5rQjs7O0FBc05uQjtBQUNBO0FBQ0E7QUFDQXNGLHFCQXpObUIsZ0NBeU5FWCxZQXpORixFQXlOZ0JyRyxLQXpOaEIsRUF5TnVCdUIsVUF6TnZCLEVBeU5tQztBQUFBLCtCQUMzQixpQkFBTzhGLGdCQUFQLENBQXdCaEIsWUFBeEIsRUFBc0MsR0FBdEMsRUFBMkMsR0FBM0MsRUFBZ0Q5RSxVQUFoRCxDQUQyQjtBQUFBLE1BQy9DRyxRQUQrQywwQkFDL0NBLFFBRCtDO0FBQUEsTUFDckNHLEtBRHFDLDBCQUNyQ0EsS0FEcUM7O0FBR3JELE1BQUlYLGlCQUFKO0FBQ0EsTUFBSVcsTUFBTWhCLE1BQU4sR0FBZSxDQUFmLElBQW9CZ0IsTUFBTSxDQUFOLE1BQWEsR0FBckMsRUFBMEM7QUFDekNYLGNBQVdXLE1BQU0sQ0FBTixDQUFYO0FBQ0FBLFdBQVFBLE1BQU1BLEtBQU4sQ0FBWSxDQUFaLENBQVI7QUFDQTs7QUFFRCxNQUFJc0QsVUFBVSxlQUFLb0Isc0JBQUwsQ0FBNEIxRSxLQUE1QixFQUFtQyxFQUFuQyxDQUFkO0FBQ0EsTUFBSXNELFFBQVF0RSxNQUFSLEtBQW1CLENBQXZCLEVBQTBCO0FBQ3pCLFNBQU0sSUFBSVAsV0FBSix3Q0FBcUR1QixNQUFNUSxJQUFOLENBQVcsR0FBWCxDQUFyRCxPQUFOO0FBQ0E7QUFDRCxNQUFJakMsT0FBTyxJQUFJLGVBQUsyRixJQUFULEVBQVg7QUFDQTNGLE9BQUs0RixJQUFMLEdBQVliLFFBQVEsQ0FBUixDQUFaO0FBQ0EvRSxPQUFLNkYsU0FBTCxHQUFpQmQsUUFBUSxDQUFSLENBQWpCO0FBQ0EsTUFBSWpFLFFBQUosRUFBY2QsS0FBS2MsUUFBTCxHQUFnQkEsUUFBaEI7QUFDZCxTQUFPLENBQUVkLElBQUYsRUFBUXNCLFFBQVIsQ0FBUDtBQUNBO0FBM09rQixDQUFwQjs7QUFpUEE7QUFDQTVCLE9BQU9rSSxnQkFBUCxDQUF3QixpQkFBT2xGLFNBQS9CLEVBQTBDOztBQUV6QztBQUNBO0FBQ0E7QUFDQW1GLFlBQVcsRUFBRXhFLE9BQU8sZUFBU3ZELElBQVQsRUFBZWdJLFVBQWYsRUFBMkJySSxVQUEzQixFQUE0RTtBQUFBLE9BQXJDdUcsbUJBQXFDLHVFQUFmLGVBQUt2QixRQUFVOztBQUMvRixPQUFJO0FBQ0gsUUFBSXpFLE9BQU8sZUFBSzhGLGVBQUwsQ0FBcUJnQyxVQUFyQixFQUFpQzlCLG1CQUFqQyxDQUFYO0FBQ0E7QUFDQSxRQUFJLGlCQUFPcEYsS0FBWCxFQUFrQnhCLFFBQVFFLEdBQVIsa0JBQTJCUSxJQUEzQixxQkFBK0NnSSxVQUEvQyxvQkFBd0U5SCxJQUF4RTs7QUFFbEJOLFdBQU9DLE1BQVAsQ0FBY0ssSUFBZCxFQUFvQlAsVUFBcEI7QUFDQSxXQUFPLEtBQUtzQixPQUFMLENBQWFqQixJQUFiLEVBQW1CRSxJQUFuQixDQUFQO0FBQ0EsSUFQRCxDQU9FLE9BQU8rSCxDQUFQLEVBQVU7QUFDWDNJLFlBQVFDLEtBQVIscUNBQWdEUyxJQUFoRDtBQUNBVixZQUFRRSxHQUFSLGNBQXVCd0ksVUFBdkI7QUFDQTFJLFlBQVE0SSxLQUFSLENBQWNELENBQWQ7QUFDQTtBQUNELEdBYlUsRUFMOEI7O0FBb0J6Q0UsZUFBYyxFQUFFNUUsT0FBTyxlQUFTdkQsSUFBVCxFQUFlZ0ksVUFBZixFQUEyQnJJLFVBQTNCLEVBQTZFO0FBQUEsT0FBdEN1RyxtQkFBc0MsdUVBQWhCLGVBQUtWLFNBQVc7O0FBQ25HLE9BQUl0RixPQUFPLEtBQUs2SCxTQUFMLENBQWUvSCxJQUFmLEVBQXFCZ0ksVUFBckIsRUFBaUNySSxVQUFqQyxFQUE2Q3VHLG1CQUE3QyxDQUFYO0FBQ0EsT0FBSWhHLElBQUosRUFBVSxPQUFPLEtBQUtlLE9BQUwsQ0FBYSxXQUFiLEVBQTBCZixJQUExQixDQUFQO0FBQ1YsR0FIYSxFQXBCMkI7O0FBeUJ6Q2tJLGdCQUFlLEVBQUU3RSxPQUFPLGVBQVN2RCxJQUFULEVBQWVnSSxVQUFmLEVBQTJCckksVUFBM0IsRUFBOEU7QUFBQSxPQUF2Q3VHLG1CQUF1Qyx1RUFBakIsZUFBS2IsVUFBWTs7QUFDckcsT0FBSW5GLE9BQU8sS0FBSzZILFNBQUwsQ0FBZS9ILElBQWYsRUFBcUJnSSxVQUFyQixFQUFpQ3JJLFVBQWpDLEVBQTZDdUcsbUJBQTdDLENBQVg7QUFDQSxPQUFJaEcsSUFBSixFQUFVLE9BQU8sS0FBS2UsT0FBTCxDQUFhLFlBQWIsRUFBMkJmLElBQTNCLENBQVA7QUFDVixHQUhjLEVBekIwQjs7QUE4QnpDO0FBQ0E7QUFDQTtBQUNBbUksbUJBQWtCLEVBQUU5RSxPQUFPLGVBQVN2RCxJQUFULEVBQWVnSSxVQUFmLEVBQTJCckksVUFBM0IsRUFBdUM7QUFBQTs7QUFDakUsT0FBSXdGLE1BQU1DLE9BQU4sQ0FBYzRDLFVBQWQsQ0FBSixFQUErQjtBQUM5QixXQUFPQSxXQUFXdkYsT0FBWCxDQUFtQjtBQUFBLFlBQVUsTUFBSzRGLGdCQUFMLENBQXNCckksSUFBdEIsRUFBNEJpRyxNQUE1QixFQUFvQ3RHLFVBQXBDLENBQVY7QUFBQSxLQUFuQixDQUFQO0FBQ0E7O0FBRUQsT0FBSU8sT0FBTyxLQUFLNkgsU0FBTCxDQUFlL0gsSUFBZixFQUFxQmdJLFVBQXJCLEVBQWlDckksVUFBakMsQ0FBWDtBQUNBLE9BQUlPLElBQUosRUFBVTtBQUNULFFBQUksQ0FBQ0EsS0FBS29JLElBQVYsRUFBZ0I7QUFDZixXQUFNLElBQUlyRixTQUFKLG9DQUErQ2pELElBQS9DLGtDQUFOO0FBQ0E7QUFDRDtBQUNBLFdBQU8sS0FBS3VJLGdCQUFaO0FBQ0EsV0FBTyxLQUFLdEgsT0FBTCxDQUFhLGdCQUFiLEVBQStCZixJQUEvQixDQUFQO0FBQ0E7QUFDRCxHQWRpQixFQWpDdUI7O0FBaUR6QztBQUNBO0FBQ0FzSSxpQkFBZ0IsNkJBQWUsa0JBQWYsRUFDZixZQUFXO0FBQUUsU0FBTyxLQUFLMUksS0FBTCxDQUFXLGdCQUFYLEtBQ1osS0FBS0EsS0FBTCxDQUFXLGdCQUFYLEVBQTZCQSxLQUE3QixDQUFtQ2dDLEdBQW5DLENBQXVDO0FBQUEsVUFBUTVCLEtBQUswQixNQUFiO0FBQUEsR0FBdkMsQ0FESztBQUViLEVBSGUsQ0FuRHlCOztBQXdEekM7QUFDQTtBQUNBO0FBQ0E2RyxxQkFBb0IsRUFBRWxGLE9BQU8sZUFBU3ZELElBQVQsRUFBZWdJLFVBQWYsRUFBMkJySSxVQUEzQixFQUF1QztBQUFBOztBQUNuRSxPQUFJd0YsTUFBTUMsT0FBTixDQUFjNEMsVUFBZCxDQUFKLEVBQStCO0FBQzlCLFdBQU9BLFdBQVd2RixPQUFYLENBQW1CO0FBQUEsWUFBVSxPQUFLZ0csa0JBQUwsQ0FBd0J6SSxJQUF4QixFQUE4QmlHLE1BQTlCLEVBQXNDdEcsVUFBdEMsQ0FBVjtBQUFBLEtBQW5CLENBQVA7QUFDQTs7QUFFRCxPQUFJTyxPQUFPLEtBQUs2SCxTQUFMLENBQWUvSCxJQUFmLEVBQXFCZ0ksVUFBckIsRUFBaUNySSxVQUFqQyxDQUFYO0FBQ0EsT0FBSU8sSUFBSixFQUFVO0FBQ1QsUUFBSSxDQUFDQSxLQUFLb0ksSUFBVixFQUFnQjtBQUNmLFdBQU0sSUFBSXJGLFNBQUosc0NBQWlEakQsSUFBakQsa0NBQU47QUFDQTtBQUNEO0FBQ0EsV0FBTyxLQUFLMEksa0JBQVo7QUFDQSxXQUFPLEtBQUt6SCxPQUFMLENBQWEsa0JBQWIsRUFBaUNmLElBQWpDLENBQVA7QUFDQTtBQUNELEdBZG1CLEVBM0RxQjs7QUEyRXpDO0FBQ0E7QUFDQXlJLG1CQUFrQiw2QkFBZSxtQkFBZixFQUNqQixZQUFVO0FBQUUsU0FBTyxLQUFLN0ksS0FBTCxDQUFXLGtCQUFYLEtBQ1osS0FBS0EsS0FBTCxDQUFXLGtCQUFYLEVBQStCQSxLQUEvQixDQUFxQ2dDLEdBQXJDLENBQXlDO0FBQUEsVUFBUTVCLEtBQUswQixNQUFiO0FBQUEsR0FBekMsQ0FESztBQUVaLEVBSGlCO0FBN0V1QixDQUExQyxFOzs7Ozs7Ozs7Ozs7Ozs7QUMxUEE7Ozs7QUFDQTs7Ozs7Ozs7OzsrZUFOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFJQTs7O0FBR0E7QUFDQTtBQUNBOztBQUNBLHFCQUFLZ0gsVUFBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQTJDLHFCQUFLeEYsT0FBaEQ7QUFDQSxpQkFBT25DLE9BQVAsQ0FBZSxZQUFmLEVBQTZCLElBQUkscUJBQUsySCxVQUFULENBQW9CLEVBQUV2RixTQUFTLEtBQVgsRUFBa0JXLFVBQVUsSUFBNUIsRUFBcEIsQ0FBN0I7O0FBRUE7QUFDQTtBQUNBLHFCQUFLNkUsVUFBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQTJDLHFCQUFLekYsT0FBaEQ7QUFDQSxJQUFJMEYsYUFBYSxpQkFBTzdILE9BQVAsQ0FBZSxZQUFmLEVBQTZCLElBQUkscUJBQUs0SCxVQUFULENBQW9CO0FBQ2pFeEYsVUFBUyxjQUR3RDtBQUVqRTtBQUNBcUMsV0FBVSxrQkFBU3ZDLE9BQVQsRUFBa0I7QUFDM0IsU0FBTyxLQUFLekMsT0FBTCxDQUFhcUksT0FBYixDQUFxQixLQUFyQixFQUE0QixHQUE1QixDQUFQO0FBQ0E7QUFMZ0UsQ0FBcEIsQ0FBN0IsQ0FBakI7QUFPQSxpQkFBTzlILE9BQVAsQ0FBZSxZQUFmLEVBQTZCNkgsVUFBN0I7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBT2hKLEtBQVAsQ0FBYWdKLFVBQWIsQ0FBd0JFLGNBQXhCLENBQ0MsT0FERCxFQUNVLE9BRFYsRUFDbUIsT0FEbkIsRUFDNEIsS0FENUIsRUFDbUMsSUFEbkMsRUFDeUMsSUFEekMsRUFFQyxRQUZELEVBRVcsUUFGWCxFQUVxQixPQUZyQixFQUU4QixTQUY5QixFQUV5QyxRQUZ6QyxFQUVtRCxTQUZuRCxFQUU4RCxRQUY5RCxFQUV3RSxJQUZ4RSxFQUdDLFNBSEQsRUFHWSxNQUhaLEVBR29CLFFBSHBCLEVBSUMsTUFKRCxFQUlTLE9BSlQsRUFJa0IsU0FKbEIsRUFJNkIsUUFKN0IsRUFLQyxLQUxELEVBS1EsTUFMUixFQU1DLFNBTkQsRUFPQyxJQVBELEVBT08sTUFQUCxFQVFDLE1BUkQsRUFRUyxNQVJULEVBU0MsT0FURCxFQVNVLE1BVFYsRUFVQyxNQVZELEVBVVMsS0FWVCxFQVdDLElBWEQsRUFXTyxLQVhQLEVBV2MsSUFYZCxFQVdvQixNQVhwQixFQVc0QixVQVg1QixFQVd3QyxLQVh4QyxFQVcrQyxTQVgvQyxFQVcwRCxNQVgxRCxFQVlDLE9BWkQsRUFZVSxPQVpWLEVBYUMsTUFiRCxFQWFTLEtBYlQsRUFhZ0IsTUFiaEIsRUFhd0IsU0FieEIsRUFhbUMsTUFibkMsRUFhMkMsSUFiM0MsRUFhaUQsUUFiakQsRUFhMkQsU0FiM0QsRUFjQyxXQWRELEVBY2MsT0FkZCxFQWN1QixZQWR2QixFQWNxQyxRQWRyQyxFQWMrQyxPQWQvQyxFQWN3RCxJQWR4RCxFQWM4RCxNQWQ5RCxFQWNzRSxRQWR0RSxFQWVDLFFBZkQsRUFlVyxJQWZYLEVBZ0JDLE1BaEJELEVBZ0JTLFFBaEJULEVBZ0JtQixTQWhCbkI7O0FBbUJBO0FBQ0EsaUJBQU9sSixLQUFQLENBQWFnSixVQUFiLENBQXdCRSxjQUF4QixDQUNDLEtBREQsRUFFQyxJQUZELEVBRU8sTUFGUCxFQUdDLFVBSEQsRUFJQyxLQUpELEVBSVEsTUFKUixFQUtDLElBTEQsRUFNQyxRQU5ELEVBT0MsS0FQRCxFQU9RLE1BUFI7O0FBVUE7QUFDQSxpQkFBT2xKLEtBQVAsQ0FBYWdKLFVBQWIsQ0FBd0JFLGNBQXhCLENBQ0MsTUFERCxFQUVDLElBRkQsRUFHQyxXQUhELEVBSUMsT0FKRDs7QUFPQTtBQUNBO0FBQ0EscUJBQUtDLElBQUw7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQSxFQUErQixxQkFBSzdGLE9BQXBDO0FBQ0EsSUFBSThGLE9BQU8saUJBQU9qSSxPQUFQLENBQWUsTUFBZixFQUF1QixJQUFJLHFCQUFLZ0ksSUFBVCxDQUFjO0FBQy9DNUYsVUFBUyxjQURzQztBQUUvQztBQUNBcUMsV0FBVSxrQkFBU3ZDLE9BQVQsRUFBa0I7QUFDM0IsU0FBTyxLQUFLekMsT0FBTCxDQUFhcUksT0FBYixDQUFxQixLQUFyQixFQUE0QixHQUE1QixDQUFQO0FBQ0E7QUFMOEMsQ0FBZCxDQUF2QixDQUFYO0FBT0EsaUJBQU85SCxPQUFQLENBQWUsWUFBZixFQUE2QmlJLElBQTdCOztBQUdBO0FBQ0EscUJBQUtDLE1BQUw7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQSxFQUFtQyxxQkFBSy9GLE9BQXhDO0FBQ0EsSUFBSWdHLFNBQVMsaUJBQU9uSSxPQUFQLENBQWUsUUFBZixFQUF5QixJQUFJLHFCQUFLa0ksTUFBVCxDQUFnQjtBQUNyRDlGLFVBQVMsc0JBRDRDO0FBRXJEO0FBQ0FxQyxXQUFVLGtCQUFTdkMsT0FBVCxFQUFrQjtBQUMzQixTQUFPa0csV0FBVyxLQUFLM0ksT0FBaEIsRUFBeUIsRUFBekIsQ0FBUDtBQUNBO0FBTG9ELENBQWhCLENBQXpCLENBQWI7QUFPQSxpQkFBT08sT0FBUCxDQUFlLFlBQWYsRUFBNkJtSSxNQUE3Qjs7QUFHQTtBQUNBO0FBQ0E7QUFDQSxxQkFBS0UsT0FBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQXFDLHFCQUFLbEcsT0FBMUM7QUFDQSxpQkFBT25DLE9BQVAsQ0FBZSxTQUFmLEVBQTBCLElBQUkscUJBQUtxSSxPQUFULENBQWlCO0FBQzFDakcsVUFBUyxzQkFEaUM7QUFFMUM7QUFDQXFDLFdBQVUsa0JBQVN2QyxPQUFULEVBQWtCO0FBQzNCLFNBQU9vRyxTQUFTLEtBQUs3SSxPQUFkLEVBQXVCLEVBQXZCLENBQVA7QUFDQTtBQUx5QyxDQUFqQixDQUExQjs7QUFTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFLOEksSUFBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQStCLHFCQUFLcEcsT0FBcEM7QUFDQSxJQUFJcUcsT0FBTyxpQkFBT3hJLE9BQVAsQ0FBZSxNQUFmLEVBQXVCLElBQUkscUJBQUt1SSxJQUFULENBQWM7QUFDL0NuRyxVQUFTO0FBRHNDLENBQWQsQ0FBdkIsQ0FBWDtBQUdBLGlCQUFPcEMsT0FBUCxDQUFlLFlBQWYsRUFBNkJ3SSxJQUE3Qjs7QUFHQTtBQUNBO0FBQ0EscUJBQUtDLE9BQUw7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQSxFQUFxQyxxQkFBS3RHLE9BQTFDO0FBQ0EsSUFBSXVHLE9BQU8saUJBQU8xSSxPQUFQLENBQWUsU0FBZixFQUEwQixJQUFJLHFCQUFLeUksT0FBVCxDQUFpQjtBQUNyRHJHLFVBQVMsaUNBRDRDO0FBRXJEcUMsV0FBVSxrQkFBU3ZDLE9BQVQsRUFBa0I7QUFDM0IsVUFBUSxLQUFLekMsT0FBYjtBQUNDLFFBQUssTUFBTDtBQUNBLFFBQUssS0FBTDtBQUNBLFFBQUssSUFBTDtBQUNDLFdBQU8sSUFBUDtBQUNEO0FBQ0MsV0FBTyxLQUFQO0FBTkY7QUFRQTtBQVhvRCxDQUFqQixDQUExQixDQUFYO0FBYUEsaUJBQU9PLE9BQVAsQ0FBZSxZQUFmLEVBQTZCMEksSUFBN0I7QUFDQTtBQUNBO0FBQ0EsaUJBQU83SixLQUFQLENBQWFnSixVQUFiLENBQXdCRSxjQUF4QixDQUNDLE1BREQsRUFDUyxPQURULEVBRUMsS0FGRCxFQUVRLElBRlIsRUFHQyxJQUhELEVBR08sUUFIUDs7QUFNQTtBQUNBLElBQUkvRyxPQUFPLGlCQUFPbUcsYUFBUCxDQUNWLGNBRFUsRUFFViw2QkFGVSxFQUdWcEYsU0FIVTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOzs7QUFZVDtBQVpTLDJCQWFBRyxPQWJBLEVBYVM7QUFDaEIsVUFBTyxLQUFLOEIsT0FBTCxDQUFhUyxRQUFiLENBQXNCdkMsT0FBdEIsQ0FBUDtBQUNEO0FBZlE7QUFBQTs7O0FBTVg7QUFDRTtBQVBTLHNCQVFLO0FBQ2IsVUFBTyxLQUFLekMsT0FBTCxDQUFhLENBQWIsQ0FBUDtBQUNBO0FBVlE7O0FBQUE7QUFBQSxFQUlpQixxQkFBSzJFLFVBSnRCLEVBQVg7O0FBbUJBO0FBQ0E7QUFDQTtBQUNBLGlCQUFPMEMsU0FBUCxDQUFpQixTQUFqQixFQUE0QixvREFBNUIsRTs7Ozs7Ozs7Ozs7Ozs7Ozs7QUMxS0E7SUFDcUI2QixVO0FBQ3BCO0FBQ0EsdUJBQTRCO0FBQUE7O0FBQUE7O0FBQUEsb0NBQWJDLFdBQWE7QUFBYkEsY0FBYTtBQUFBOztBQUMzQkEsY0FBWXBILE9BQVosQ0FBb0IsVUFBQ3FILEdBQUQsRUFBUztBQUM1QixPQUFJLE9BQU9BLEdBQVAsS0FBZSxRQUFuQixFQUE2QjtBQUM1QixVQUFLTCxJQUFMLEdBQVlLLEdBQVo7QUFDQSxJQUZELE1BR0ssSUFBSUEsR0FBSixFQUFTO0FBQ2JsSyxXQUFPQyxNQUFQLFFBQW9CaUssR0FBcEI7QUFDQTtBQUNELEdBUEQ7O0FBU0E7QUFDQSxNQUFJLEVBQUUsVUFBVSxJQUFaLENBQUosRUFBdUIsS0FBS0wsSUFBTCxHQUFZLEVBQVo7QUFDdkIsTUFBSSxFQUFFLGdCQUFnQixJQUFsQixDQUFKLEVBQTZCLEtBQUtwSSxVQUFMLEdBQWtCLENBQWxCO0FBQzdCOztBQUVEOzs7Ozt3QkFDTTBCLEssRUFBTztBQUNaLFVBQU8sSUFBSTZHLFVBQUosQ0FBZSxJQUFmLEVBQXFCN0csS0FBckIsQ0FBUDtBQUNBOztBQUVEOzs7OzRCQUNVMUIsVSxFQUFZO0FBQ3JCLFVBQU8sS0FBS3lCLEtBQUwsQ0FBVyxFQUFFekIsc0JBQUYsRUFBWCxDQUFQO0FBQ0E7O0FBRUQ7Ozs7NEJBQ1VWLE0sRUFBUTtBQUNqQixVQUFPLEtBQUttQyxLQUFMLENBQVcsRUFBRXpCLFlBQVksS0FBS0EsVUFBTCxHQUFrQlYsTUFBaEMsRUFBWCxDQUFQO0FBQ0E7O0FBRUY7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozt3QkFDTTBDLE8sRUFBUztBQUNkLE9BQUksRUFBRUEsbUJBQW1CaEIsTUFBckIsQ0FBSixFQUFrQyxNQUFNLElBQUlZLFNBQUosdUJBQWtDSSxPQUFsQyx3QkFBTjtBQUNwQztBQUNFLFVBQU8sS0FBSzBHLElBQUwsQ0FBVXRHLEtBQVYsQ0FBZ0JKLE9BQWhCLEtBQTRCTCxTQUFuQztBQUNBOztBQUVEO0FBQ0E7QUFDQTs7Ozt1QkFDS0ssTyxFQUFTO0FBQ2IsVUFBT0EsUUFBUTJHLElBQVIsQ0FBYSxLQUFLRCxJQUFsQixDQUFQO0FBQ0E7O0FBRUY7QUFDQTtBQUNBO0FBQ0M7Ozs7OztBQUtBOzBCQUNrRjtBQUFBLE9BQTVFMUksVUFBNEUsdUVBQS9ELEtBQUtBLFVBQTBEO0FBQUEsT0FBOUNHLFFBQThDLHVFQUFuQyxLQUFLQSxRQUFMLElBQWlCLEtBQUtpSSxJQUFMLENBQVU5SSxNQUFROztBQUNqRixVQUFPLEtBQUs4SSxJQUFMLENBQVVRLFNBQVYsQ0FBb0I1SSxVQUFwQixFQUFnQ0csUUFBaEMsQ0FBUDtBQUNBOztBQUVEOzs7OzZCQVVXO0FBQ1YsVUFBTyxLQUFLaUksSUFBWjtBQUNBOzs7c0JBckJVO0FBQ1YsVUFBTyxLQUFLMUUsS0FBTCxFQUFQO0FBQ0E7OztzQkFRWTtBQUNaLFVBQU8sS0FBSzBFLElBQUwsQ0FBVTlJLE1BQWpCO0FBQ0E7O0FBRUQ7Ozs7c0JBQ2M7QUFDYixVQUFPLEtBQUtVLFVBQUwsS0FBb0IsS0FBS1YsTUFBaEM7QUFDQTs7Ozs7O2tCQS9FbUJpSixVOzs7Ozs7Ozs7Ozs7O0FDRnJCOzs7O0FBSUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7OztBQU5BLGlDOzs7Ozs7Ozs7Ozs7UUNDZ0JNLFEsR0FBQUEsUTtRQWdCQUMsYyxHQUFBQSxjO0FBcEJoQjs7QUFFQTtBQUNBO0FBQ08sU0FBU0QsUUFBVCxDQUFrQkUsUUFBbEIsRUFBNEJDLE1BQTVCLEVBQW9DO0FBQzFDLFFBQU8sWUFBVztBQUNqQixNQUFJLEtBQUtELFFBQUwsTUFBbUJwSCxTQUF2QixFQUFrQztBQUNqQyxPQUFJTyxRQUFROEcsT0FBT0MsS0FBUCxDQUFhLElBQWIsQ0FBWjtBQUNBLE9BQUkvRyxVQUFVUCxTQUFkLEVBQXlCO0FBQ3hCO0FBQ0FwRCxXQUFPMEQsY0FBUCxDQUFzQixJQUF0QixFQUE0QjhHLFFBQTVCLEVBQXNDLEVBQUU3RyxZQUFGLEVBQVNnSCxjQUFjLElBQXZCLEVBQXRDO0FBQ0E7QUFDRDtBQUNELFNBQU8sS0FBS0gsUUFBTCxDQUFQO0FBQ0EsRUFURDtBQVVBOztBQUdEO0FBQ0E7QUFDTyxTQUFTRCxjQUFULENBQXdCQyxRQUF4QixFQUFrQ0MsTUFBbEMsRUFBMEM7QUFDaEQsUUFBTztBQUNORyxPQUFNTixTQUFTRSxRQUFULEVBQW1CQyxNQUFuQjtBQURBLEVBQVA7QUFHQSxDOzs7Ozs7Ozs7Ozs7O0FDcEJEOzs7O0FBQ0E7Ozs7QUFFQTtBQVBBO0FBQ0E7QUFDQTs7OztBQVFBOztBQUNBLGlCQUFPbEMsWUFBUCxDQUFvQixZQUFwQixFQUFrQyw2QkFBbEMsRUFBaUU7QUFDaEV6QyxTQURnRSxvQkFDdkR2QyxPQUR1RCxFQUM5QztBQUFBLGlCQUNnQixLQUFLOEIsT0FEckI7QUFBQSxNQUNYNkQsVUFEVyxZQUNYQSxVQURXO0FBQUEsTUFDQzJCLFVBREQsWUFDQ0EsVUFERDtBQUVqQjs7QUFDQSxTQUFVM0IsV0FBV3BELFFBQVgsQ0FBb0J2QyxPQUFwQixDQUFWLFdBQTRDc0gsV0FBVy9FLFFBQVgsQ0FBb0J2QyxPQUFwQixDQUE1QztBQUNBO0FBTCtELENBQWpFLEU7Ozs7Ozs7Ozs7Ozs7OztBQ1JBOzs7O0FBQ0E7Ozs7Ozs7Ozs7K2VBSkE7QUFDQTtBQUNBOzs7QUFHQTs7OztBQUlBLGlCQUFPaUYsYUFBUCxDQUNDLHFCQURELEVBRUMscURBRkQsRUFHQ3BGLFNBSEQ7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLDJCQUtXRyxPQUxYLEVBS29CO0FBQUEsa0JBQ2dCLEtBQUs4QixPQURyQjtBQUFBLE9BQ1h3RixVQURXLFlBQ1hBLFVBRFc7QUFBQSxPQUNDOUssVUFERCxZQUNDQSxVQUREOztBQUVqQjhLLGdCQUFhQSxXQUFXL0UsUUFBWCxDQUFvQnZDLE9BQXBCLENBQWI7QUFDQXhELGdCQUFhQSxXQUFXc0YsT0FBWCxDQUNSeUYsT0FEUSxHQUVSNUksR0FGUSxDQUVIO0FBQUEsV0FBWXNJLFNBQVN0QixVQUFULENBQW9CcEQsUUFBcEIsQ0FBNkJ2QyxPQUE3QixDQUFaO0FBQUEsSUFGRyxFQUdSaEIsSUFIUSxDQUdILE1BSEcsQ0FBYjtBQUlBLHlCQUFvQnNJLFVBQXBCLFlBQXFDOUssVUFBckM7QUFDQTtBQWJIOztBQUFBO0FBQUEsRUFJbUMscUJBQUswRixVQUp4Qzs7QUFrQkEsaUJBQU8wQyxTQUFQLENBQWlCLGdCQUFqQixFQUFtQyxzQ0FBbkM7O0FBRUEsaUJBQU9JLFlBQVAsQ0FDQyxrQkFERCxFQUVDLGdDQUZELEVBR0M7QUFDQ3pDLFNBREQsb0JBQ1V2QyxPQURWLEVBQ21CO0FBQUEsa0JBQ29CLEtBQUs4QixPQUR6QjtBQUFBLE1BQ1gwRixVQURXLGFBQ1hBLFVBRFc7QUFBQSxNQUNDQyxjQURELGFBQ0NBLGNBREQ7O0FBRWpCRCxlQUFhQSxXQUFXakYsUUFBWCxDQUFvQnZDLE9BQXBCLENBQWI7QUFDQSxNQUFJMEgsUUFBUUEsU0FBU0EsTUFBTW5GLFFBQU4sQ0FBZXZDLE9BQWYsQ0FBckI7QUFDQSxVQUFRMEgsS0FBUjtBQUNDLFFBQUssUUFBTDtBQUNDLHVCQUFpQkYsVUFBakI7O0FBRUQsUUFBSyxVQUFMO0FBQ0Msc0JBQWdCQSxVQUFoQjs7QUFFRCxRQUFLLFFBQUw7QUFDQyx1QkFBaUJBLFVBQWpCOztBQUVELFFBQUssT0FBTDtBQUNBO0FBQ0MsV0FBT0EsVUFBUDtBQVpGO0FBY0E7QUFuQkYsQ0FIRDs7QUEwQkE7QUFDQSxpQkFBT3hDLFlBQVAsQ0FDQyw0QkFERCxFQUVDLDhEQUZELEVBR0M7QUFDQ3pDLFNBREQsb0JBQ1V2QyxPQURWLEVBQ21CO0FBQUEsa0JBQzBCLEtBQUs4QixPQUQvQjtBQUFBLE1BQ1gyRixjQURXLGFBQ1hBLGNBRFc7QUFBQSxNQUNLOUIsVUFETCxhQUNLQSxVQURMO0FBQUEsTUFDaUI3RyxJQURqQixhQUNpQkEsSUFEakI7QUFFcEI7O0FBQ0c2RyxlQUFhQSxXQUFXcEQsUUFBWCxDQUFvQnZDLE9BQXBCLENBQWI7QUFDQSxNQUFJMkgsU0FBUyxDQUFDaEMsYUFBYSxTQUFkLEVBQXlCaUMsV0FBekIsRUFBYjtBQUNBLE1BQUlDLFNBQVMvSSxLQUFLeUQsUUFBTCxDQUFjdkMsT0FBZCxDQUFiO0FBQ0g7QUFDRyxNQUFJZSxRQUFRakMsS0FBS2dELE9BQUwsQ0FBYXZFLE9BQWIsQ0FBcUIsQ0FBckIsQ0FBWjtBQUNBLE1BQUl1SyxhQUFhL0csUUFBUUEsTUFBTXdCLFFBQU4sQ0FBZXZDLE9BQWYsQ0FBUixHQUFrQyxXQUFuRDtBQUNBLFNBQU8sWUFBVTJILE1BQVYsV0FBc0JFLE1BQXRCLHFCQUNJbEMsVUFESix1QkFDK0JBLFVBRC9CLDRCQUMrREEsVUFEL0QsV0FDK0VtQyxVQUQvRSx3QkFFSW5DLFVBRkosdUNBRWdEZ0MsTUFGaEQsaUNBRWtGaEMsVUFGbEYsa0JBQVA7QUFHQTtBQWJGLENBSEQsRTs7Ozs7Ozs7Ozs7Ozs7O0FDckRBOzs7O0FBQ0E7Ozs7Ozs7Ozs7K2VBSkE7QUFDQTtBQUNBOzs7QUFHQTs7OztBQUdBLElBQUlvQyxtQkFBbUIsaUJBQU9qSyxPQUFQLENBQWUsa0JBQWYsRUFBbUM7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQSxFQUFvQyxlQUFLSixZQUF6QyxJQUFuQyxDQUF2QjtBQUNBLGlCQUFPSSxPQUFQLENBQWUsWUFBZixFQUE2QmlLLGdCQUE3Qjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQU9uRCxTQUFQLENBQWlCLGtCQUFqQixFQUNDLG1EQURELEVBRUMvRSxTQUZEO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSwyQkFJV0csT0FKWCxFQUlvQjtBQUFBLGtCQUN3QixLQUFLOEIsT0FEN0I7QUFBQSxPQUNYNkQsVUFEVyxZQUNYQSxVQURXO0FBQUEsT0FDQ00sTUFERCxZQUNDQSxNQUREO0FBQUEsT0FDU3FCLFVBRFQsWUFDU0EsVUFEVDs7QUFFakIsNkJBQXdCQSxXQUFXL0UsUUFBWCxDQUFvQnZDLE9BQXBCLENBQXhCLFVBQXlEaUcsT0FBTzFELFFBQVAsQ0FBZ0J2QyxPQUFoQixDQUF6RDtBQUNBO0FBUEg7O0FBQUE7QUFBQSxFQUdnQyxlQUFLa0MsVUFIckM7O0FBWUE7QUFDQSxpQkFBT3BFLE9BQVAsQ0FBZSxTQUFmLEVBQTBCO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUEsRUFBMkIsZUFBS0osWUFBaEMsSUFBMUI7O0FBRUEsaUJBQU9rSCxTQUFQLENBQWlCLFNBQWpCLEVBQTRCLE9BQTVCLEVBQXFDLEVBQUVyQyxVQUFVO0FBQUEsU0FBTSxDQUFOO0FBQUEsRUFBWixFQUFyQztBQUNBLGlCQUFPcUMsU0FBUCxDQUFpQixTQUFqQixFQUE0QixRQUE1QixFQUFzQyxFQUFFckMsVUFBVTtBQUFBLFNBQU0sQ0FBTjtBQUFBLEVBQVosRUFBdEM7QUFDQSxpQkFBT3FDLFNBQVAsQ0FBaUIsU0FBakIsRUFBNEIsT0FBNUIsRUFBcUMsRUFBRXJDLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQXJDO0FBQ0EsaUJBQU9xQyxTQUFQLENBQWlCLFNBQWpCLEVBQTRCLFFBQTVCLEVBQXNDLEVBQUVyQyxVQUFVO0FBQUEsU0FBTSxDQUFOO0FBQUEsRUFBWixFQUF0QztBQUNBLGlCQUFPcUMsU0FBUCxDQUFpQixTQUFqQixFQUE0QixPQUE1QixFQUFxQyxFQUFFckMsVUFBVTtBQUFBLFNBQU0sQ0FBTjtBQUFBLEVBQVosRUFBckM7QUFDQSxpQkFBT3FDLFNBQVAsQ0FBaUIsU0FBakIsRUFBNEIsT0FBNUIsRUFBcUMsRUFBRXJDLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQXJDO0FBQ0EsaUJBQU9xQyxTQUFQLENBQWlCLFNBQWpCLEVBQTRCLFNBQTVCLEVBQXVDLEVBQUVyQyxVQUFVO0FBQUEsU0FBTSxDQUFOO0FBQUEsRUFBWixFQUF2QztBQUNBLGlCQUFPcUMsU0FBUCxDQUFpQixTQUFqQixFQUE0QixRQUE1QixFQUFzQyxFQUFFckMsVUFBVTtBQUFBLFNBQU0sQ0FBTjtBQUFBLEVBQVosRUFBdEM7QUFDQSxpQkFBT3FDLFNBQVAsQ0FBaUIsU0FBakIsRUFBNEIsT0FBNUIsRUFBcUMsRUFBRXJDLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQXJDO0FBQ0EsaUJBQU9xQyxTQUFQLENBQWlCLFNBQWpCLEVBQTRCLE9BQTVCLEVBQXFDLEVBQUVyQyxVQUFVO0FBQUEsU0FBTSxFQUFOO0FBQUEsRUFBWixFQUFyQztBQUNBLGlCQUFPcUMsU0FBUCxDQUFpQixTQUFqQixFQUE0QixhQUE1QixFQUEyQyxFQUFFckMsVUFBVTtBQUFBLFNBQU0sQ0FBQyxDQUFQO0FBQUEsRUFBWixFQUEzQztBQUNBLGlCQUFPcUMsU0FBUCxDQUFpQixTQUFqQixFQUE0QixPQUE1QixFQUFxQyxFQUFFckMsVUFBVTtBQUFBLFNBQU0sQ0FBQyxDQUFQO0FBQUEsRUFBWixFQUFyQztBQUNBLGlCQUFPcUMsU0FBUCxDQUFpQixTQUFqQixFQUE0QixNQUE1QixFQUFvQyxFQUFFckMsVUFBVTtBQUFBLFNBQU0sQ0FBQyxDQUFQO0FBQUEsRUFBWixFQUFwQzs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxpQkFBT3FDLFNBQVAsQ0FDQyxrQkFERCxFQUVDLDRDQUZELEVBR0MvRSxTQUhEO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSwyQkFLV0csT0FMWCxFQUtvQjtBQUFBLG1CQUN5QixLQUFLOEIsT0FEOUI7QUFBQSxPQUNYNkQsVUFEVyxhQUNYQSxVQURXO0FBQUEsT0FDQ3FDLE9BREQsYUFDQ0EsT0FERDtBQUFBLE9BQ1VWLFVBRFYsYUFDVUEsVUFEVjs7QUFFakIsNkJBQXdCQSxXQUFXL0UsUUFBWCxDQUFvQnZDLE9BQXBCLENBQXhCLFVBQXlEZ0ksUUFBUXpGLFFBQVIsQ0FBaUJ2QyxPQUFqQixDQUF6RDtBQUNBO0FBUkg7O0FBQUE7QUFBQSxFQUlnQyxlQUFLa0MsVUFKckMsRzs7Ozs7Ozs7Ozs7Ozs7O0FDOUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7K2VBTkE7QUFDQTtBQUNBOztBQU1BOzs7QUFHQTtBQUNBOztBQUVBLGlCQUFPZ0QsZ0JBQVAsQ0FBd0IsS0FBeEIsRUFBK0IsS0FBL0IsRUFBc0M7QUFBRUMsS0FBRixnQkFBTzhDLENBQVAsRUFBU0MsQ0FBVCxFQUFZO0FBQUUsZUFBV0QsQ0FBWCxZQUFtQkMsQ0FBbkI7QUFBeUI7QUFBdkMsQ0FBdEM7QUFDQSxpQkFBT2hELGdCQUFQLENBQXdCLElBQXhCLEVBQThCLElBQTlCLEVBQW9DO0FBQUVDLEtBQUYsZ0JBQU84QyxDQUFQLEVBQVNDLENBQVQsRUFBWTtBQUFFLGVBQVdELENBQVgsWUFBbUJDLENBQW5CO0FBQXlCO0FBQXZDLENBQXBDOztBQUVBLGlCQUFPaEQsZ0JBQVAsQ0FBd0IsSUFBeEIsRUFBOEIsSUFBOUIsRUFBb0M7QUFBRUMsS0FBRixnQkFBTzhDLENBQVAsRUFBU0MsQ0FBVCxFQUFZO0FBQUUsZUFBV0QsQ0FBWCxZQUFtQkMsQ0FBbkI7QUFBeUI7QUFBdkMsQ0FBcEM7QUFDQSxpQkFBT2hELGdCQUFQLENBQXdCLFFBQXhCLEVBQWtDLFFBQWxDLEVBQTRDO0FBQUVDLEtBQUYsZ0JBQU84QyxDQUFQLEVBQVNDLENBQVQsRUFBWTtBQUFFLGVBQVdELENBQVgsWUFBbUJDLENBQW5CO0FBQXlCO0FBQXZDLENBQTVDOztBQUVBLGlCQUFPaEQsZ0JBQVAsQ0FBd0IsWUFBeEIsRUFBc0MsWUFBdEMsRUFBb0Q7QUFBRUMsS0FBRixnQkFBTzhDLENBQVAsRUFBU0MsQ0FBVCxFQUFZO0FBQUUsZUFBV0QsQ0FBWCxhQUFvQkMsQ0FBcEI7QUFBMEI7QUFBeEMsQ0FBcEQ7QUFDQSxpQkFBT2hELGdCQUFQLENBQXdCLGdCQUF4QixFQUEwQyxnQkFBMUMsRUFBNEQ7QUFBRUMsS0FBRixnQkFBTzhDLENBQVAsRUFBU0MsQ0FBVCxFQUFZO0FBQUUsZUFBV0QsQ0FBWCxhQUFvQkMsQ0FBcEI7QUFBMEI7QUFBeEMsQ0FBNUQ7O0FBRUE7QUFDQTtBQUNBLGlCQUFPaEQsZ0JBQVAsQ0FBd0IsWUFBeEIsRUFBc0MsQ0FBQyxNQUFELEVBQVMsT0FBVCxDQUF0QyxFQUF5RDtBQUFFQyxLQUFGLGdCQUFPZ0QsS0FBUCxFQUFjcEMsSUFBZCxFQUFvQjtBQUFFLDZCQUF5Qm9DLEtBQXpCLFdBQW9DcEMsSUFBcEM7QUFBOEM7QUFBcEUsQ0FBekQ7QUFDQSxpQkFBT2IsZ0JBQVAsQ0FBd0IsZ0JBQXhCLEVBQTBDLENBQUMsVUFBRCxFQUFhLFdBQWIsQ0FBMUMsRUFBcUU7QUFBRUMsS0FBRixnQkFBT2dELEtBQVAsRUFBY3BDLElBQWQsRUFBb0I7QUFBRSw4QkFBMEJvQyxLQUExQixXQUFxQ3BDLElBQXJDO0FBQStDO0FBQXJFLENBQXJFOztBQUVBO0FBQ0EsaUJBQU9iLGdCQUFQLENBQXdCLE9BQXhCLEVBQWlDLENBQUMsT0FBRCxFQUFVLFdBQVYsQ0FBakMsRUFBeUQ7QUFBRUMsS0FBRixnQkFBT2dELEtBQVAsRUFBY3JKLElBQWQsRUFBb0I7QUFBRSw2QkFBeUJBLElBQXpCLFVBQWtDcUosS0FBbEM7QUFBNEM7QUFBbEUsQ0FBekQ7QUFDQSxpQkFBT2pELGdCQUFQLENBQXdCLFdBQXhCLEVBQXFDLENBQUMsV0FBRCxFQUFjLGVBQWQsQ0FBckMsRUFBcUU7QUFBRUMsS0FBRixnQkFBT2dELEtBQVAsRUFBY3JKLElBQWQsRUFBb0I7QUFBRSw4QkFBMEJBLElBQTFCLFVBQW1DcUosS0FBbkM7QUFBNkM7QUFBbkUsQ0FBckU7QUFDQTtBQUNBLGlCQUFPakQsZ0JBQVAsQ0FBd0IsVUFBeEIsRUFBb0MsQ0FBQyxVQUFELEVBQWEsVUFBYixDQUFwQyxFQUE4RDtBQUFFQyxLQUFGLGdCQUFPckcsSUFBUCxFQUFhcUosS0FBYixFQUFvQjtBQUFFLDZCQUF5QnJKLElBQXpCLFVBQWtDcUosS0FBbEM7QUFBNEM7QUFBbEUsQ0FBOUQ7QUFDQSxpQkFBT2pELGdCQUFQLENBQXdCLGdCQUF4QixFQUEwQyxDQUFDLGtCQUFELEVBQXFCLGdCQUFyQixFQUF1QyxrQkFBdkMsRUFBMkQsZ0JBQTNELENBQTFDLEVBQXdIO0FBQUVDLEtBQUYsZ0JBQU9yRyxJQUFQLEVBQWFxSixLQUFiLEVBQW9CO0FBQUUsOEJBQTBCckosSUFBMUIsVUFBbUNxSixLQUFuQztBQUE2QztBQUFuRSxDQUF4SDs7QUFFQSxpQkFBT2pELGdCQUFQLENBQXdCLElBQXhCLEVBQThCLENBQUMsR0FBRCxFQUFNLGlCQUFOLENBQTlCLEVBQXdEO0FBQUVDLEtBQUYsZ0JBQU84QyxDQUFQLEVBQVNDLENBQVQsRUFBWTtBQUFFLGVBQVVELENBQVYsV0FBaUJDLENBQWpCO0FBQXVCO0FBQXJDLENBQXhEO0FBQ0EsaUJBQU9oRCxnQkFBUCxDQUF3QixLQUF4QixFQUErQixDQUFDLElBQUQsRUFBTyw2QkFBUCxDQUEvQixFQUFzRTtBQUFFQyxLQUFGLGdCQUFPOEMsQ0FBUCxFQUFTQyxDQUFULEVBQVk7QUFBRSxlQUFVRCxDQUFWLFlBQWtCQyxDQUFsQjtBQUF3QjtBQUF0QyxDQUF0RTtBQUNBLGlCQUFPaEQsZ0JBQVAsQ0FBd0IsSUFBeEIsRUFBOEIsQ0FBQyxHQUFELEVBQU0sY0FBTixDQUE5QixFQUFxRDtBQUFFQyxLQUFGLGdCQUFPOEMsQ0FBUCxFQUFTQyxDQUFULEVBQVk7QUFBRSxlQUFVRCxDQUFWLFdBQWlCQyxDQUFqQjtBQUF1QjtBQUFyQyxDQUFyRDtBQUNBLGlCQUFPaEQsZ0JBQVAsQ0FBd0IsS0FBeEIsRUFBK0IsQ0FBQyxJQUFELEVBQU8sMEJBQVAsQ0FBL0IsRUFBbUU7QUFBRUMsS0FBRixnQkFBTzhDLENBQVAsRUFBU0MsQ0FBVCxFQUFZO0FBQUUsZUFBVUQsQ0FBVixZQUFrQkMsQ0FBbEI7QUFBd0I7QUFBdEMsQ0FBbkU7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsaUJBQU9oRCxnQkFBUCxDQUF3QixNQUF4QixFQUFnQyxDQUFDLEtBQUQsRUFBUSxNQUFSLENBQWhDLEVBQWlEO0FBQUVDLEtBQUYsZ0JBQU84QyxDQUFQLEVBQVNDLENBQVQsRUFBWTtBQUFFLFNBQVNELENBQVQsV0FBZ0JDLENBQWhCO0FBQXFCO0FBQW5DLENBQWpEO0FBQ0EsaUJBQU9oRCxnQkFBUCxDQUF3QixPQUF4QixFQUFpQyxDQUFDLEdBQUQsRUFBTSxPQUFOLENBQWpDLEVBQWlEO0FBQUVDLEtBQUYsZ0JBQU84QyxDQUFQLEVBQVNDLENBQVQsRUFBWTtBQUFFLFNBQVNELENBQVQsV0FBZ0JDLENBQWhCO0FBQXFCO0FBQW5DLENBQWpEO0FBQ0EsaUJBQU9oRCxnQkFBUCxDQUF3QixPQUF4QixFQUFpQyxDQUFDLEtBQUQsRUFBUSxPQUFSLENBQWpDLEVBQW1EO0FBQUVDLEtBQUYsZ0JBQU84QyxDQUFQLEVBQVNDLENBQVQsRUFBWTtBQUFFLFNBQVNELENBQVQsV0FBZ0JDLENBQWhCO0FBQXFCO0FBQW5DLENBQW5EO0FBQ0EsaUJBQU9oRCxnQkFBUCxDQUF3QixZQUF4QixFQUFzQyxDQUFDLEdBQUQsRUFBTSxZQUFOLENBQXRDLEVBQTJEO0FBQUVDLEtBQUYsZ0JBQU84QyxDQUFQLEVBQVNDLENBQVQsRUFBWTtBQUFFLFNBQVNELENBQVQsV0FBZ0JDLENBQWhCO0FBQXFCO0FBQW5DLENBQTNEOztBQUVBOztBQUVBLGlCQUFPakQsYUFBUCxDQUNDLDJCQURELEVBRUMsNkRBRkQsRUFHQ3BGLFNBSEQ7QUFBQTs7QUFBQTtBQUFBOztBQUFBOztBQUFBOztBQUFBO0FBQUE7QUFBQTs7QUFBQSwwTkFLRXVDLGFBTEYsR0FLa0IsSUFMbEI7QUFBQTs7QUFBQTtBQUFBO0FBQUEsMkJBTVdwQyxPQU5YLEVBTW9CO0FBQUEsa0JBQ1ksS0FBSzhCLE9BRGpCO0FBQUEsT0FDWHNHLEdBRFcsWUFDWEEsR0FEVztBQUFBLE9BQ05DLEdBRE0sWUFDTkEsR0FETTtBQUFBLE9BQ0RDLFFBREMsWUFDREEsUUFEQzs7QUFFakIsVUFBT0EsU0FBU25ELElBQVQsQ0FBY2lELElBQUk3RixRQUFKLENBQWF2QyxPQUFiLENBQWQsRUFBcUNxSSxJQUFJOUYsUUFBSixDQUFhdkMsT0FBYixDQUFyQyxDQUFQO0FBQ0E7QUFUSDs7QUFBQTtBQUFBLEVBSXlDLHFCQUFLa0MsVUFKOUM7O0FBYUE7QUFDQTs7QUFFQSxpQkFBT29ELGtCQUFQLENBQTBCLFlBQTFCLEVBQXdDLFlBQXhDLEVBQXNEO0FBQUVILEtBQUYsZ0JBQU9nRCxLQUFQLEVBQWM7QUFBRSxzQkFBa0JBLEtBQWxCO0FBQTRDO0FBQTVELENBQXREO0FBQ0EsaUJBQU83QyxrQkFBUCxDQUEwQixnQkFBMUIsRUFBNEMsQ0FBQyxnQkFBRCxFQUFtQixjQUFuQixDQUE1QyxFQUFnRjtBQUFFSCxLQUFGLGdCQUFPZ0QsS0FBUCxFQUFjO0FBQUUsc0JBQWtCQSxLQUFsQjtBQUE0QztBQUE1RCxDQUFoRjs7QUFFQTtBQUNBLGlCQUFPN0Msa0JBQVAsQ0FBMEIsVUFBMUIsRUFBc0MsVUFBdEMsRUFBa0Q7QUFBRUgsS0FBRixnQkFBT2dELEtBQVAsRUFBYztBQUFFLDRCQUF3QkEsS0FBeEI7QUFBa0M7QUFBbEQsQ0FBbEQ7QUFDQSxpQkFBTzdDLGtCQUFQLENBQTBCLGNBQTFCLEVBQTBDLGNBQTFDLEVBQTBEO0FBQUVILEtBQUYsZ0JBQU9nRCxLQUFQLEVBQWM7QUFBRSw2QkFBeUJBLEtBQXpCO0FBQW1DO0FBQW5ELENBQTFEOztBQUVBLGlCQUFPbEQsYUFBUCxDQUNDLDZCQURELEVBRUMsMENBRkQsRUFHQ3BGLFNBSEQ7QUFBQTs7QUFBQTtBQUFBOztBQUFBOztBQUFBOztBQUFBO0FBQUE7QUFBQTs7QUFBQSxtT0FLRXVDLGFBTEYsR0FLa0IsSUFMbEI7QUFBQTs7QUFBQTtBQUFBO0FBQUEsMkJBTVdwQyxPQU5YLEVBTW9CO0FBQUEsbUJBQ2MsS0FBSzhCLE9BRG5CO0FBQUEsT0FDWHdGLFVBRFcsYUFDWEEsVUFEVztBQUFBLE9BQ0NnQixRQURELGFBQ0NBLFFBREQ7O0FBRWpCLFVBQU9BLFNBQVNuRCxJQUFULENBQWNtQyxXQUFXL0UsUUFBWCxDQUFvQnZDLE9BQXBCLENBQWQsQ0FBUDtBQUNBO0FBVEg7O0FBQUE7QUFBQSxFQUkwQyxxQkFBS2tDLFVBSi9DOztBQWNBO0FBQ0Esb0g7Ozs7Ozs7Ozs7Ozs7QUN4RkE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7OztBQUVBO0FBQ0EsSUFBSSxPQUFPaEcsTUFBUCxLQUFrQixXQUF0QixFQUFtQztBQUNsQ0EsUUFBT3VLLFVBQVA7QUFDQXZLLFFBQU9LLE1BQVA7QUFDQUwsUUFBT3FELElBQVA7QUFDQXJELFFBQU9ELE1BQVA7QUFDQTs7a0JBRWM7QUFDZHdLLGlDQURjLEVBQ0ZsSyx3QkFERSxFQUNNZ0Qsb0JBRE4sRUFDWXREO0FBRFosQzs7Ozs7Ozs7Ozs7OztBQ1ZmOzs7O0FBQ0E7Ozs7QUFFQTtBQVBBO0FBQ0E7QUFDQTs7OztBQVFBOztBQUNBLGlCQUFPK0ksWUFBUCxDQUFvQixJQUFwQixFQUEwQix1Q0FBMUIsRUFBbUU7QUFFbEV6QyxTQUZrRSxvQkFFekR2QyxPQUZ5RCxFQUVoRCxDQUNqQjtBQUhpRSxDQUFuRSxFIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMTIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDcwZjFmMzgxNmExZjZkYmJjZDc4IiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCIvLyBTcGVsbCBcIkVuZ2xpc2hcIiBwYXJzZXIgc3RyYXdtYW5cblxuLy8gVE9ETzpcdGB0ZXN0YCBmdW5jdGlvbiBmb3IgcXVpY2sgbm8tZ29vZCBoaXQgb24gYHthfSBibGFoIGJsYWgge2J9YD9cbi8vIFRPRE86XHR0aGlzIGRvZXNuJ3Qgd29yazogICBge2V4cHJlc3Npb259IGlzIHtleHByZXNzaW9ufWBcbi8vIFRPRE86XHRicmVhayBgZmlsZWAgaW50byBsaW5lcyBhbmQgcHJvY2VzcyBlYWNoIChpbmNsLiBzdWJzdHIvbWF0Y2ggbm90IGdvaW5nIGJleW9uZCB0aGUgZW5kKVxuLy8gVE9ETzpcdG5lc3RpbmcgLS0gaXMgdGhpcyBqdXN0IGluZGVudCA9IFwiYWRkIGJsb2NrIHNjb3BlXCJcbi8vIFRPRE86XHRwcm9tb3Rpb24gcGF0dGVybiBmb3IgZ2F0aGVyIGFyZ3VtZW50cyAoZWc6IGxpdGVyYWwtbGlzdCkgPz8/XG4vLyBUT0RPOlx0V2hhdCBkb2VzIHN5bnRheCB0cmVlIGxvb2sgbGlrZT8gIEhvdyBkbyB3ZSBleHRyYWN0IG1lYW5pbmcgb3V0IG9mIHRoZSBuZXN0P1xuLy8gVE9ETzpcdFBhc3MgYGNvbnRleHRgIHRvIHRvU291cmNlKCksIGFkZCBwcm9wZXJ0eSBkZXNjcmlwdG9ycyB0byBgY2xhc3NgLCB2YXJpYWJsZXMgYW5kIGNvZGUgdG8gYG1ldGhvZGAsIGBnbG9iYWxgIHN0dWZmIGV0Y1xuXG5pbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIEdSUlIuLi4gd2lsbCBTT01FT05FIG9uIHRoZSBub2RlIHRlYW0gcGxlYXNlIGltcGxlbWVudCBjb25zb2xlLmdyb3VwID8/P1xuaWYgKCFjb25zb2xlLmdyb3VwKSBjb25zb2xlLmdyb3VwID0gY29uc29sZS5sb2c7XG5pZiAoIWNvbnNvbGUuZ3JvdXBFbmQpIGNvbnNvbGUuZ3JvdXBFbmQgPSBjb25zb2xlLmxvZztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblx0Ly8gU2V0IHRvIGB0cnVlYCB0byBvdXRwdXQgZGVidWcgaW5mbyB3aGlsZSBhZGRpbmcgcnVsZXNcblx0c3RhdGljIERFQlVHID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cblx0XHQvLyBDbG9uZSBydWxlcywgc3RhcnRpbmcgd2l0aCBhIGNvbXBsZXRlbHkgZW1wdHkgbWFwIGlmIG5vdCBkZWZpbmVkIChubyBzdGFuZGFyZCBvYmplY3Qga2V5cylcblx0XHR0aGlzLnJ1bGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnJ1bGVzIHx8IG51bGwpO1xuXHR9XG5cblx0Z2V0UnVsZShuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXNbbmFtZV07XG5cdH1cblxuLy9cbi8vIyMjIFBhcnNpbmdcbi8vXG5cdC8vIFBhcnNlIGBuYW1lYGQgcnVsZSBhdCBoZWFkIG9mIGBzdHJlYW1gIChgc3RyaW5nYCBvciBgVGV4dFN0cmVhbWApLlxuXHQvLyBIYW5kbGVzIG9wdGlvbmFsIGFuZCByZXBlYXRpbmcgcnVsZXMgYXMgd2VsbCBhcyBlYXRpbmcgd2hpdGVzcGFjZS5cblx0Ly8gUmV0dXJucyByZXN1bHQgb2YgcGFyc2UuXG5cdHBhcnNlKG5hbWUsIHN0cmVhbSkge1xuXHRcdGlmICh0eXBlb2Ygc3RyZWFtID09PSBcInN0cmluZ1wiKSBzdHJlYW0gPSBuZXcgVGV4dFN0cmVhbShzdHJlYW0pO1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZXIucGFyc2UoJHtuYW1lfSk6IFJ1bGUgbm90IGZvdW5kYCk7XG5cdFx0c3RyZWFtID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJ1bGUucGFyc2UodGhpcywgc3RyZWFtKTtcblx0fVxuXG5cdC8vIEVhdCB3aGl0ZXNwYWNlIChhY2NvcmRpbmcgdG8gYHJ1bGVzLndoaXRlc3BhY2VgKSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnMgbmV3IHN0cmVhbSBpZiB3ZSBtYXRjaGVkIHdoaXRlc3BhY2UsIG90aGVyd2lzZSB0aGUgc2FtZSBzdHJlYW0uXG5cdGVhdFdoaXRlc3BhY2Uoc3RyZWFtKSB7XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMucnVsZXMud2hpdGVzcGFjZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gc3RyZWFtO1xuXHRcdHJldHVybiBzdHJlYW0uYWR2YW5jZUJ5KHJlc3VsdC5tYXRjaGVkLmxlbmd0aCk7XG5cdH1cblxuXHQvLyBBZGQgYSBydWxlIHRvIG91ciBsaXN0IG9mIHJ1bGVzIVxuXHQvLyBDb252ZXJ0cyB0byBgYWx0ZXJuYXRpdmVzYCBvbiByZS1kZWZpbmluZyB0aGUgc2FtZSBydWxlLlxuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLnJ1bGVzW25hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtuYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZTogbmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdC8vIGNvcHkgYXJndW1lbnQgbmFtZSBvdmVyICg/Pz8pXG5cdFx0XHRcdGlmIChleGlzdGluZy5hcmd1bWVudCkgdGhpcy5ydWxlc1tuYW1lXS5hcmd1bWVudCA9IGV4aXN0aW5nLmFyZ3VtZW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JyB0byAnJHtuYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXS5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdC8vIGRvbid0IG92ZXJyaWRlIHJ1bGVOYW1lXG5cdFx0XHRpZiAoIXJ1bGUucnVsZU5hbWUpIHJ1bGUucnVsZU5hbWUgPSBuYW1lO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IHJ1bGU7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cblxuLy9cbi8vICMjIFV0aWxpdHkgbWV0aG9kc1xuLy9cblxuXHQvLyBGaW5kIHRoZSBtYXRjaGluZyBpbnN0YW5jZSBvZiBwb3NzaWJseSBuZXN0ZWQgYGVuZFRva2VuYCB0byBiYWxhbmNlIGBzdGFydFRva2VuYFxuXHQvL1x0aW4gYXJyYXkgb2YgYHRva2Vuc2AgKHN0cmluZ3MpLlxuXHQvLyBJZiBzdWNjZXNzZnVsLCByZXR1cm5zIGB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZSB9YFxuXHQvLyBUaHJvd3MgaWYgdW5zdWNlc3NmdWwuXG5cdHN0YXRpYyBmaW5kTmVzdGVkVG9rZW5zKHRva2Vucywgc3RhcnRUb2tlbiwgZW5kVG9rZW4sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0aWYgKHRva2Vuc1tzdGFydEluZGV4XSAhPT0gc3RhcnRUb2tlbikgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBFeHBlY3RlZCAnJHtzdGFydFRva2VufScgYXQgaW5kZXggJHtzdGFydEluZGV4fSBvZiB0b2tlbnNgKTtcblx0XHRsZXQgbmVzdGluZyA9IDA7XG5cdFx0bGV0IG5lc3RlZCA9IGZhbHNlO1xuXHRcdGZvciAobGV0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIDEsIGxhc3RJbmRleCA9IHRva2Vucy5sZW5ndGg7IGVuZEluZGV4IDwgbGFzdEluZGV4OyBlbmRJbmRleCsrKSB7XG5cdFx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbZW5kSW5kZXhdO1xuXHRcdFx0aWYgKHRva2VuID09PSBzdGFydFRva2VuKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdFx0bmVzdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b2tlbiA9PT0gZW5kVG9rZW4pIHtcblx0XHRcdFx0aWYgKG5lc3RpbmcgPT09IDApXG5cdFx0XHRcdFx0cmV0dXJuIHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlOiB0b2tlbnMuc2xpY2Uoc3RhcnRJbmRleCsxLCBlbmRJbmRleCksIG5lc3RlZCB9O1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgQ291bGRuJ3QgZmluZCBtYXRjaGluZyAnJHtlbmRUb2tlbn0ncyBzdGFydGluZyBhdCBpdGVtICR7c3RhcnRJbmRleH1gKTtcblx0fVxuXG5cblx0Ly8gTGlzdCBvZiBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gcmVndWxhciBleHByZXNzaW9ucy5cblx0Ly8gVXNlZCB0byBlc2NhcGUgdGhvc2UgY2hhcnMgd2hlbiBjcmVhdGluZyByZWd1bGFyIGV4cHJlc3Npb25zIGZyb20gc3RyaW5ncy5cblx0c3RhdGljIFJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlMgPSAoZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgY2hhcnMgPSB7fTtcblx0XHRcIlxcXFwvXiQqKz8uKCl8e30sW11cIi5zcGxpdChcIlwiKS5mb3JFYWNoKGNoYXIgPT4gY2hhcnNbY2hhcl0gPSB0cnVlKTtcblx0XHRyZXR1cm4gY2hhcnM7XG5cdH0pKClcblxuXHQvLyBHaXZlbiBhIFwibm9ybWFsXCIgYHN0cmluZ2AsIGVzY2FwZSBhbnkgcmVndWxhciBleHByZXNzaW9uIHNwZWNpYWwgY2hhcmFjdGVyc1xuXHQvL1x0c28gd2UgY2FuIGNyZWF0ZSBhIGBuZXcgUmVnRXhwKClgLlxuXHQvLyBBbHNvIGNvbnZlcnRzIGEgc2luZ2xlIHNwYWNlIHRvIGFyYml0cmFyeSBzZXQgb2Ygc3BhY2VzIHdpdGggXCJcXHMrXCJcblx0c3RhdGljIGVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSB7XG5cdFx0cmV0dXJuIHN0cmluZy5zcGxpdChcIlwiKS5tYXAoZnVuY3Rpb24gKGNoYXIsIGluZGV4LCBsaXN0KSB7XG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIGJhY2tzbGFzaFxuXHRcdFx0aWYgKGNoYXIgPT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCI7XG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIHNwYWNlXG5cdFx0XHRpZiAoY2hhciA9PT0gXCIgXCIpIHJldHVybiBcIlxcXFxzK1wiO1xuXHRcdFx0Ly8gSWYgYSBzcGVjaWFsIGNoYXIgYW5kIHByZXZpb3VzIGNoYXJhY3RlciB3YXMgbm90IGFuIGVzY2FwZSwgZXNjYXBlIHRoZSByZXN1bHQuXG5cdFx0XHRpZiAoUGFyc2VyLlJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlNbY2hhcl0gJiYgbGlzdFtpbmRleC0xXSAhPT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIitjaGFyO1xuXHRcdFx0Ly8gVGhpcyBjaGFyIHNob3VsZCBiZSBmaW5lIGJ5IGl0c2VsZi5cblx0XHRcdHJldHVybiBjaGFyO1xuXHRcdH0pLmpvaW4oXCJcIik7XG5cdH1cblxuXHQvLyBDcmVhdGUgYSBuZXcgcmVndWxhciBleHByZXNzaW9uIGZyb20gYSBcIm5vcm1hbFwiIHN0cmluZywgZXNjYXBpbmcgc3BlY2lhbCBjaGFyYWN0ZXJzIGFzIG5lY2Vzc2FyeS5cblx0c3RhdGljIFJlZ0V4cEZyb21TdHJpbmcoc3RyaW5nLCBmbGFncykge1xuXHRcdHJldHVybiBuZXcgUmVnRXhwKFBhcnNlci5lc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZyksIGZsYWdzKTtcblx0fVxuXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9QYXJzZXIuanMiLCIvL1x0IyBQYXJzZXIgUnVsZXNcbi8vXHRSdWxlcyBjYW4gYmUgYXMgc2ltcGxlIGFzIGEgc3RyaW5nIGBLZXl3b3JkYCBvciBhIGNvbXBsZXggc2VxdWVuY2Ugb2YgKG5lc3RlZCkgcnVsZXMuXG4vL1xuLy9cdFBhcnNlIGEgcnVsZSB3aXRoIGBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKWAsIHRoaXMgd2lsbCBlaXRoZXI6XG4vL1x0XHQtIHJldHVybiBgdW5kZWZpbmVkYCBpZiB0aGUgcnVsZSBkb2Vzbid0IG1hdGNoIHRoZSBoZWFkIG9mIHRoZSBzdHJlYW0sIG9yXG4vL1x0XHQtIHJldHVybiBhIENMT05FIG9mIHRoZSBydWxlIHdpdGggYXQgbGVhc3QgdGhlIGZvbGxvd2luZzpcbi8vXHRcdFx0LSBgc3RyZWFtYFx0XHRTdHJlYW0gd2hpY2ggd2FzIG1hdGNoZWQgd2l0aCBgc3RhcnRJbmRleGAgYXQgdGhlIHN0YXJ0IG9mIHRoZSBtYXRjaFxuLy9cdFx0XHQtIGBlbmRJbmRleGBcdE5vbi1pbmNsdXNpdmUgZW5kIGluZGV4IGluIHN0cmVhbSB3aGVyZSBtYXRjaCBlbmRzLlxuLy9cbi8vXHRUaGUgY2xvbmUgcmV0dXJuZWQgYWJvdmUgY2FuIGJlIG1hbmlwdWxhdGVkIHdpdGhcbi8vXHRcdC0gYHJ1bGUucmVzdWx0c2BcdFx0XHRSZXR1cm4gbWF0Y2hlZCBhcmd1bWVudHMgaW4gYSBmb3JtYXQgc3VpdGFibGUgdG8gZG86XG4vL1x0XHQtIGBydWxlLnRvU291cmNlKGNvbnRleHQpYFx0UmV0dXJuIGphdmFzY3JpcHQgc291cmNlIHRvIGludGVycHJldCB0aGUgcnVsZS5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKHRoaXMuY29uc3RydWN0b3IgIT09IFJ1bGUgfHwgIXRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLmhhc093blByb3BlcnR5KFwiY29uc3RydWN0b3JcIikpIHtcbi8vY29uc29sZS53YXJuKFwibm90IHJ1bGVcIiwgdGhpcyk7XG5cdFx0fVxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKC4uLnByb3BzKSB7XG5cdFx0bGV0IGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCAuLi5wcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuLy9cbi8vXHRQYXJzaW5nIHByaW1pdGl2ZXMgLS0geW91IE1VU1QgaW1wbGVtZW50IHRoZXNlIGluIHlvdXIgc3ViY2xhc3NlcyFcbi8vXG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHJ1bGUgaW4gdGhlIGBzdHJlYW1gLlxuXHQvLyBSZXR1cm5zIHJlc3VsdHMgb2YgdGhlIHBhcnNlIG9yIGB1bmRlZmluZWRgLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBJcyB0aGlzIHJ1bGUgZGV0ZXJtaW5pc3RpYywgZWc6IGNhbiBpdCBiZSBxdWlja2x5IGFuZCB1bmFtYmlndW91c2x5IHNhdGlzZmllZD9cblx0Ly8gUmV0dXJuaW5nIGB0cnVlYCBjYW4gc3BlZWQgdXAgc2VxdWVuY2UgcHJvY2Vzc2luZyxcblx0Ly9cdGJ1dCBpZiB5b3UncmUgcmVhbGx5IG5vdCBzdXJlLCByZXR1cm4gYHVuZGVmaW5lZGAuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIE5PVEU6IHlvdSBtYXkgd2FudCB0byBtZW1vaXplIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkO1xuXHR9XG5cbi8vXG4vLyAjIyBncm91cDogcmVmbGVjdGlvblxuLy9cblx0Z2V0IHJ1bGVUeXBlKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdH1cbn1cblxuXG5cblxuLy8gUmVnZXggcGF0dGVybi5cbi8vIGBydWxlLnBhdHRlcm5gIGlzIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2guXG4vL1xuLy8gTk9URVx0VG8gbWFrZSB0aGlzIG1vcmUgZ2VuZXJhbGx5IGFwcGxpY2FibGUsIGRvIE5PVCBzdGFydCB0aGUgcGF0dGVybiB3aXRoIGEgYF5gLlxuLy9cdFx0V2UnbGwgYXV0b21hdGljYWxseSBtYWtlIGEgY29weSBvZiB0aGUgUmVnRXhwIHdpdGggdGhlIHN0YXJ0IHBvaW50IGF0dGFjaGVkXG4vL1x0XHRhbmQgdXNlIHRoYXQgYXMgYXBwcm9wcmlhdGUuXG4vL1xuLy9cdFx0VGhpcyB3YXkgd2UgY2FuIHJlLXVzZSB0aGUgcmVnZXggdG8gY2hlY2sgZm9yIGEgbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLi4uXG4vL1xuLy8gWW91IGNhbiBvcHRpb25hbGx5IHNwZWNpZnkgYSBgcnVsZS5ibGFja2xpc3RgLCBhIHNldCBvZiBtYXRjaGVzIHdoaWNoIHdpbGwgc3BlY2lmaWNhbGx5IE5PVCB3b3JrLFxuLy9cdGVnIGZvciBgaWRlbnRpZmllci5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBwYXR0ZXJuYCBpcyByZXF1aXJlZFxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuUGF0dGVybigpOiBZb3UgbXVzdCBwYXNzIGEgYHBhdHRlcm5gIHBhcmFtZXRlclwiKTtcblxuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ3JlYXRlIGEgYHN0YXJ0UGF0dGVybmAgdG8gbWF0Y2ggYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3Ryb25nXG5cdFx0Ly8gQ3JlYXRlIG5vbi1lbnVtZXJhYmx5LlxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInN0YXJ0UGF0dGVyblwiLCB7IHZhbHVlOiBuZXcgUmVnRXhwKFwiXlwiICsgdGhpcy5wYXR0ZXJuLnNvdXJjZSkgfSk7XG5cdH1cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcGF0dGVybiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IG1hdGNoID0gc3RyZWFtLm1hdGNoKHRoaXMuc3RhcnRQYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYmFpbCBpZiBwcmVzZW50IGluIGJsYWNrbGlzdFxuXHRcdGxldCBtYXRjaGVkID0gbWF0Y2hbMF07XG5cdFx0aWYgKHRoaXMuYmxhY2tsaXN0ICYmIHRoaXMuYmxhY2tsaXN0W21hdGNoZWRdKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCArIG1hdGNoZWQubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBQYXR0ZXJucyBhcmUgQUxXQVlTIGRldGVybWluaXN0aWMuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0YWRkVG9CbGFja2xpc3QoLi4ud29yZHMpIHtcblx0XHRpZiAoIXRoaXMuYmxhY2tsaXN0KSB0aGlzLmJsYWNrbGlzdCA9IHt9O1xuXHRcdHdvcmRzLmZvckVhY2god29yZCA9PiB0aGlzLmJsYWNrbGlzdFt3b3JkXSA9IHRydWUpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMucGF0dGVybi5zb3VyY2U7XG5cdH1cbn1cblxuLy8gUnVsZSBmb3IgbGl0ZXJhbCBzdHJpbmcgdmFsdWUsIHdoaWNoIGluY2x1ZGUgcHVuY3R1YXRpb24gc3VjaCBhcyBgKGAgZXRjLlxuLy8gYFN5bWJvbGBzIGFyZSBkaWZmZXJlbnQgZnJvbSBgS2V5d29yZHNgIGluIHRoYXQgdGhleSBkbyBub3QgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkuXG4vL1RPRE86IHJlbmFtZSBgU3ltYm9sYD8/P1xuUnVsZS5TeW1ib2wgPSBjbGFzcyBTeW1ib2wgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHN0cmluZ2AgaXMgcmVxdWllZC5cblx0XHRpZiAoIXByb3BlcnRpZXMuc3RyaW5nKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuU3ltYm9sKCk6IEV4cGVjdGVkIHN0cmluZyBwcm9wZXJ0eVwiKTtcblxuXHRcdC8vIGNvbnZlcnQgc3RyaW5nIHRvIHBhdHRlcm5cblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikge1xuXHRcdFx0cHJvcGVydGllcy5wYXR0ZXJuID0gUGFyc2VyLlJlZ0V4cEZyb21TdHJpbmcocHJvcGVydGllcy5zdHJpbmcpO1xuLy9jb25zb2xlLmluZm8ocHJvcGVydGllcy5zdHJpbmcsIHByb3BlcnRpZXMucGF0dGVybik7XG5cdFx0fVxuXG4vL1x0XHRjb25zb2xlLmluZm8oXCJjcmVhdGluZyBzdHJpbmdcIiwgcHJvcGVydGllcyk7XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdH1cblxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cbi8vIE1lcmdlIHR3byBTeW1ib2wgcnVsZXMgdG9nZXRoZXIsIHJldHVybmluZyBhIG5ldyBydWxlIHRoYXQgbWF0Y2hlcyBib3RoLlxuUnVsZS5tZXJnZVN5bWJvbHMgPSBmdW5jdGlvbihmaXJzdCwgc2Vjb25kKSB7XG5cdHJldHVybiBuZXcgUnVsZS5TeW1ib2woeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cbi8vIEtleXdvcmQgcGF0dGVybi5cbi8vIFByb3BlcnRpZXM6XG4vL1x0LSBgcnVsZS5zdHJpbmdgIFx0KHJlcXVpcmVkKSBcdEtleXdvcmQgc3RyaW5nIHRvIG1hdGNoLlxuLy9cdC0gYHJ1bGUucGF0dGVybmBcdChvcHRpb25hbCkgXHRSZWdFeHAgZm9yIHRoZSBtYXRjaC5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0V2UnbGwgY3JlYXRlIG9uZSBmcm9tIGBzdHJpbmdgIGlmIG5lY2Vzc2FyeS5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0Tk9URTogZG8gTk9UIHN0YXJ0IHRoZSBgcGF0dGVybmAgd2l0aCBgXmAuXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLktleXdvcmQoKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gZGVyaXZlIGBwYXR0ZXJuYCBpZiBuZWNlc3NhcnkuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdC8vIGVuZm9yY2Ugd29yZCBib3VuZGFyaWVzIGFuZCBhbGxvdyBhcmJpdHJhcnkgc3BhY2UgYmV0d2VlbiB3b3Jkc1xuXHRcdFx0bGV0IHBhdHRlcm5TdHJpbmcgPSBQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhwcm9wZXJ0aWVzLnN0cmluZyk7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKFwiXFxcXGJcIiArIHBhdHRlcm5TdHJpbmcgKyBcIlxcXFxiXCIpO1xuXHRcdH1cblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuLy8gTWVyZ2UgdHdvIEtleXdvcmQgcnVsZXMgdG9nZXRoZXIsIGFkZGluZyB0aGUgc2Vjb25kIHRvIHRoZSBmaXJzdC5cblJ1bGUubWVyZ2VLZXl3b3JkcyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0cmV0dXJuIG5ldyBSdWxlLktleXdvcmQoeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIFwiIFwiICsgc2Vjb25kLnN0cmluZyB9KTtcbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGUodGhpcy5ydWxlKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQXR0ZW1wdGluZyB0byBwYXJzZSB1bmtub3duIHJ1bGUgJyR7dGhpcy5ydWxlfSdgKTtcblx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIG1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gbWF0Y2g7XG5cdH1cblxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlKHRoaXMucnVsZSk7XG5cdFx0aWYgKCFydWxlKSByZXR1cm4gZmFsc2U7XG5cdFx0cmV0dXJuIHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgeyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlfX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuXG4vLyBBYnN0cmFjdDogIGBOZXN0ZWRgIHJ1bGUgLS0gY29tcG9zZWQgb2YgYSBzZXJpZXMgb2Ygb3RoZXIgYHJ1bGVzYC5cblJ1bGUuTmVzdGVkID0gY2xhc3MgTmVzdGVkIGV4dGVuZHMgUnVsZSB7XG5cblx0Ly8gSXMgdGhpcyBkZXRlcm1pbmlzdGljLCBlZzogYXJlIG91ciBzdWJydWxlcyB1bmFtYmlnb3VzbHkgZGV0ZXJtaW5hYmxlP1xuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlcy5ldmVyeShydWxlID0+IHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSk7XG5cdH1cbn1cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaCAoYXV0by1leGNsdWRpbmcgd2hpdGVzcGFjZSkuXG5SdWxlLlNlcXVlbmNlID0gY2xhc3MgU2VxdWVuY2UgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IG1hdGNoZWQgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghbWF0Y2ggJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdFx0bmV4dCA9IG1hdGNoLm5leHQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuLy9UT0RPQ1xuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGBtYXRjaGVkYCBhcnJheSBpbmRleGVkIGJ5XG5cdC8vXHRcdC0gYG1hdGNoLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYG1hdGNoLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIGBydWxlIHR5cGVgOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRpZiAoIXRoaXMuX3Jlc3VsdHMpIHtcblx0XHRcdGxldCByZXN1bHRzID0gdGhpcy5fcmVzdWx0cyA9IHt9O1xuXHRcdFx0Zm9yIChsZXQgbWF0Y2ggb2YgdGhpcy5tYXRjaGVkKSB7XG5cdFx0XHRcdGxldCBhcmdOYW1lID0gbWF0Y2guYXJndW1lbnQgfHwgbWF0Y2gucnVsZU5hbWUgfHwgbWF0Y2guY29uc3RydWN0b3IubmFtZTtcblxuXHRcdFx0XHQvLyBJZiBhcmcgYWxyZWFkeSBleGlzdHMsIGNvbnZlcnQgdG8gYW4gYXJyYXlcblx0XHRcdFx0aWYgKGFyZ05hbWUgaW4gcmVzdWx0cykge1xuXHRcdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShyZXN1bHRzW2FyZ05hbWVdKSkgcmVzdWx0c1thcmdOYW1lXSA9IFtyZXN1bHRzW2FyZ05hbWVdXTtcblx0XHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdLnB1c2gobWF0Y2gpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0gPSBtYXRjaDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5fcmVzdWx0cztcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnJ1bGVzLmpvaW4oXCIgXCIpfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cblxufVxuXG4vLyBTeW50YWN0aWMgc3VnYXIgZm9yIGRlYnVnZ2luZ1xuUnVsZS5FeHByZXNzaW9uID0gY2xhc3MgZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICh0aGlzLmRvbnRSZWN1cnNlKSB7XG4vL2NvbnNvbGUuaW5mbyhcIk5PVCByZWN1cnNpbmcgaW50byBcIiwgdGhpcyk7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHQvLyBJZiB0aGUgZXhwcmVzc2lvbiBpcyBsZWZ0UmVjdXJzaXZlLCBzZXQgYSBmbGFnIHNvIHdlIGRvbid0IGF0dGVtcHQgdG8gcmVjdXJzZSBpbnRvIGl0IGFnYWluLlxuLy9UT0RPOiB0aGlzIGlzIGRhbmdlcm91czogYW4gZXhjZXB0aW9uIHdpbGwgbGVhdmUgdGhlIGZsYWcgc2V0Li4uXG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0dGhpcy5kb250UmVjdXJzZSA9IHRydWU7XG4vL2NvbnNvbGUud2FybihcIlNldHRpbmcgZG9udFJlY3Vyc2UgZm9yXCIsIHRoaXMpO1xuXHRcdH1cblx0XHRsZXQgbWF0Y2ggPSBzdXBlci5wYXJzZShwYXJzZXIsIHN0cmVhbSk7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuLy9jb25zb2xlLmluZm8oXCJjbGVhcmluZyBkb250UmVjdXJzZSBmb3IgXCIsIHRoaXMpO1xuXHRcdFx0ZGVsZXRlIHRoaXMuZG9udFJlY3Vyc2U7XG5cdFx0fVxuXHRcdHJldHVybiBtYXRjaDtcblx0fVxufVxuXG5cbi8vIFN0YXRlbWVudHMgdGFrZSB1cCB0aGUgZW50aXJlIGxpbmUuXG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXgsIG1hdGNoaW5nIG9uZSBvZiBhIG51bWJlciBvZiBkaWZmZXJlbnQgcnVsZXMuXG4vLyBUaGUgcmVzdWx0IG9mIGEgcGFyc2UgaXMgdGhlIGxvbmdlc3QgcnVsZSB0aGF0IGFjdHVhbGx5IG1hdGNoZWQuXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBGaW5kIHRoZSBMT05HRVNUIG1hdGNoXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IGJlc3RNYXRjaDtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKCFtYXRjaCkgY29udGludWU7XG5cblx0XHRcdC8vIHRha2UgdGhlIGxvbmdlc3QgbWF0Y2hcblx0XHRcdGlmICghYmVzdE1hdGNoIHx8IG1hdGNoLmVuZEluZGV4ID4gYmVzdE1hdGNoLmVuZEluZGV4KVxuXHRcdFx0XHRiZXN0TWF0Y2ggPSBtYXRjaDtcblx0XHR9XG5cdFx0aWYgKCFiZXN0TWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBhc3NpZ24gYGFyZ05hbWVgIG9yIGBydWxlTmFtZWAgZm9yIGByZXN1bHRzYFxuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSBiZXN0TWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdGVsc2UgaWYgKHRoaXMucnVsZU5hbWUpIGJlc3RNYXRjaC5ydWxlTmFtZSA9IHRoaXMucnVsZU5hbWU7XG4vL1RPRE86IG90aGVyIHRoaW5ncyB0byBjb3B5IGhlcmU/Pz9cblx0XHRyZXR1cm4gYmVzdE1hdGNoO1xuXHR9XG5cblx0YWRkUnVsZShydWxlKSB7XG5cdFx0dGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoY29udGV4dCk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCgke3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZXMuam9pbihcInxcIil9KSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBSZXBlYXRpbmcgcnVsZS5cbi8vXHRgdGhpcy5ydWxlYCBpcyB0aGUgcnVsZSB0aGF0IHJlcGVhdHMuXG4vL1xuLy8gQWZ0ZXIgbWF0Y2hpbmc6XG4vL1x0YHRoaXMubWF0Y2hlZGAgaXMgYXJyYXkgb2YgcmVzdWx0cyBvZiBtYXRjaGVzLlxuLy9cbi8vXHRBdXRvbWF0aWNhbGx5IGNvbnN1bWVzIHdoaXRlc3BhY2UgYmVmb3JlIHJ1bGVzLlxuLy9cdElmIGRvZXNuJ3QgbWF0Y2ggYXQgbGVhc3Qgb25lLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuUnVsZS5SZXBlYXQgPSBjbGFzcyBSZXBlYXQgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IG5leHQgPSBzdHJlYW07XG5cdFx0bGV0IG1hdGNoZWQgPSBbXTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IG1hdGNoID0gdGhpcy5ydWxlLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIW1hdGNoKSBicmVhaztcblxuXHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdG5leHQgPSBtYXRjaC5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gYXJyYXkgd2l0aCBhcmd1bWVudHMgb2YgYWxsIHJlc3VsdHMuXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5fcmVzdWx0cyB8fCAodGhpcy5fcmVzdWx0cyA9IHRoaXMubWF0Y2hlZC5tYXAoIG1hdGNoID0+IG1hdGNoLnJlc3VsdHMgKSk7XG5cblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdHRocm93IFwiRG9uJ3QgdW5kZXJzdGFuZCBob3cgdG8gc291cmNlIFJ1bGUuUmVwZWF0IVwiO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0Y29uc3QgcnVsZSA9ICh0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlIHx8IHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiB0aGlzLnJ1bGUuc3RyaW5nLmluY2x1ZGVzKFwiIFwiKVxuXHRcdFx0XHQgICA/IGAoJHt0aGlzLnJ1bGV9KWBcblx0XHRcdFx0ICAgOiBgJHt0aGlzLnJ1bGV9YFxuXHRcdFx0XHQpO1xuXHRcdHJldHVybiBgJHtydWxlfSR7dGhpcy5vcHRpb25hbCA/ICcqJyA6ICcrJ31gO1xuXHR9XG59XG5cblxuLy8gTGlzdCBtYXRjaCBydWxlOiAgIGBbPGl0ZW0+PGRlbGltaXRlcj5dYC4gZWdcIiBgW3tudW1iZXJ9LF1gIHRvIG1hdGNoIGAxLDIsM2Bcbi8vXHRgcnVsZS5pdGVtYCBpcyB0aGUgcnVsZSBmb3IgZWFjaCBpdGVtLFxuLy9cdGBydWxlLmRlbGltaXRlcmAgaXMgdGhlIGRlbGltaXRlciBiZXR3ZWVuIGVhY2ggaXRlbS5cbi8vIFx0YHJ1bGUubWF0Y2hlZGAgaW4gdGhlIG91dHB1dCBpcyB0aGUgbGlzdCBvZiB2YWx1ZXMuXG4vL1xuLy9cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGEgTGlzdCBydWxlIHdpbGwgTk9UIHJlcGVhdCAoPz8/PylcblJ1bGUuTGlzdCA9IGNsYXNzIExpc3QgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHQvLyBlbnN1cmUgaXRlbSBhbmQgZGVsaW1pdGVyIGFyZSBvcHRpb25hbCBzbyB3ZSBkb24ndCBiYXJmIGluIGBwYXJzZVJ1bGVgXG5cdFx0dGhpcy5pdGVtLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR0aGlzLmRlbGltaXRlci5vcHRpb25hbCA9IHRydWU7XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHQvLyBnZXQgbmV4dCBpdGVtLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGl0ZW0gPSB0aGlzLml0ZW0ucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghaXRlbSkgYnJlYWs7XG4vL2NvbnNvbGUubG9nKGl0ZW0pO1xuXHRcdFx0bWF0Y2hlZC5wdXNoKGl0ZW0pO1xuXHRcdFx0bmV4dCA9IGl0ZW0ubmV4dCgpO1xuXG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHQvLyBnZXQgZGVsaW1pdGVyLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGRlbGltaXRlciA9IHRoaXMuZGVsaW1pdGVyLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0ID0gZGVsaW1pdGVyLm5leHQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogbWF0Y2hlZFswXSA/IG1hdGNoZWRbMF0uc3RhcnRJbmRleCA6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIG1hdGNoZWQgaXRlbSBieSBpbmRleFxuXHRnZXRJdGVtKGluZGV4KSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZFtpbmRleF07XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XHRcdC8vIFRPRE86IHRocm93Pz8/XG5cdFx0bGV0IG1hdGNoZWQgPSB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC50b1NvdXJjZShjb250ZXh0KSApLmpvaW4oXCIsIFwiKTtcblx0XHRyZXR1cm4gYFske21hdGNoZWR9XWA7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYFske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMuaXRlbX0gJHt0aGlzLmRlbGltaXRlcn1dJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGUuanMiLCJpbXBvcnQgeyBkZWZpbmVNZW1vaXplZCB9IGZyb20gXCIuL21lbW9pemUuanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIHJlLWV4cG9ydCBSdWxlIGZvciB0ZXN0aW5nXG5leHBvcnQgZGVmYXVsdCBSdWxlO1xuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbi8vIFRPRE86XHRVc2Uga2V5d29yZHMgaW4gc3ludGF4IHRvIG1ha2UgYSBxdWljayByZWdleC1iYXNlZCBgdGVzdGAgZnVuY3Rpb24gZm9yIHRoZSBlbnRpcmUgcnVsZVxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cbi8vIFRPRE86IGNvbnZlcnQgdG8gVGV4dFN0cmVhbSBwYXR0ZXJuIGFsYSBub3JtYWwgcGFyc2VyIG9uY2UgdGhhdCBzZXR0bGVzIGRvd24/Pz9cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHR2YXIgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IGxhc3RJbmRleCA9IHN5bnRheFN0cmVhbS5sZW5ndGg7XG5cdFx0d2hpbGUgKHN0YXJ0SW5kZXggPCBsYXN0SW5kZXgpIHtcblx0XHRcdGxldCBbIHJ1bGUsIGVuZEluZGV4IF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGlmIChydWxlKSB7XG5cdFx0XHRcdHZhciBsYXN0ID0gcnVsZXNbcnVsZXMubGVuZ3RoLTFdO1xuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYFN0cmluZ2AgYW5kIGxhc3Qgd2FzIGEgYFN0cmluZ2AsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5TeW1ib2wpIHtcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuXHRcdFx0XHRcdC8vIGFuZCByZXBsYWNlIHdpdGggYSBydWxlIHRoYXQgbWVyZ2VzIHRoZSBrZXl3b3Jkc1xuXHRcdFx0XHRcdHJ1bGUgPSBSdWxlLm1lcmdlU3ltYm9scyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYEtleXdvcmRgIGFuZCBsYXN0IHdhcyBhbHNvIGEgYEtleXdvcmRgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRlbHNlIGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG5cdFx0XHRcdFx0cnVsZXMucG9wKCk7XG5cdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG5cdFx0XHRcdFx0cnVsZSA9IFJ1bGUubWVyZ2VLZXl3b3JkcyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRydWxlcy5wdXNoKHJ1bGUpO1xuXHRcdFx0fVxuXHRcdFx0c3RhcnRJbmRleCA9IGVuZEluZGV4ICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHZhciBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdC8vIGlmIHdlIGdvdCBhIFwiXFxcXFwiICh3aGljaCBhbHNvIGhhcyB0byBnbyBpbnRvIHRoZSBzb3VyY2Ugc3RyaW5nIGFzIFwiXFxcXFwiKVxuXHRcdC8vIHRyZWF0IHRoZSBuZXh0IHRva2VuIGFzIGEgbGl0ZXJhbCBzdHJpbmcgcmF0aGVyIHRoYW4gYXMgYSBzcGVjaWFsIGNoYXJhY3Rlci5cblx0XHRpZiAoc3ludGF4VG9rZW4gPT09IFwiXFxcXFwiKSB7XG5cdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggKyAxKTtcblx0XHR9XG5cblx0XHRzd2l0Y2ggKHN5bnRheFRva2VuKSB7XG5cdFx0XHRjYXNlIFwie1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIipcIjpcblx0XHRcdGNhc2UgXCIrXCI6XG5cdFx0XHRjYXNlIFwiP1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblxuXHRcdFx0Ly8gdGhlIGZvbGxvd2luZyBzaG91bGQgQUxXQVlTIGJlIGNvbnN1bWVkIGJ5IHRoZSBhYm92ZVxuXHRcdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGNhc2UgXCIpXCI6XG5cdFx0XHRjYXNlIFwiXVwiOlxuXHRcdFx0Y2FzZSBcInxcIjpcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7c3ludGF4VG9rZW59IGZvdW5kIGFzIGl0ZW0gJHtzdGFydEluZGV4fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdLCBydWxlO1xuXHRcdC8vIElmIGxldHRlcnMgb25seSwgbWF0Y2ggYXMgYSBLZXl3b3JkIChzbyB3ZSByZXF1aXJlIGEgd29yZCBib3VuZGFyeSBhZnRlciB0aGUgc3RyaW5nKS5cblx0XHRpZiAoc3RyaW5nLm1hdGNoKC9bQS1aYS16XSsvKSkge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLktleXdvcmQoeyBzdHJpbmcgfSk7XG5cdFx0fVxuXHRcdC8vIE90aGVyd2lzZSBtYXRjaCBhcyBhIFN0cmluZywgd2hpY2ggZG9lc24ndCByZXF1aXJlIG5vbi13b3JkIGNoYXJzIGFmdGVyIHRoZSB0ZXh0LlxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlN5bWJvbCh7IHN0cmluZzogc3RyaW5nIH0pO1xuXHRcdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRcdGlmIChzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIikpIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIGxlYWRpbmcgc2xhc2ggaW4gbWF0Y2ggc3RyaW5nLi4uXG5cdFx0XHRcdHJ1bGUuc3RyaW5nID0gcnVsZS5zdHJpbmcuc3Vic3RyKDEpO1xuXHRcdFx0XHQvLyBidXQgbGVhdmUgaXQgaW4gdG9TdHJpbmdcblx0XHRcdFx0cnVsZS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnRJbmRleCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdC8vIE5PVEU6IG5lc3RlZCBwYXJlbnMgbWF5IG5vdCBoYXZlIGFsdGVybmF0aXZlcy4uLiA6LSggICBgKGF8KGJ8YykpYCB3b24ndCB3b3JrPz8/XG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiKFwiLCBcIilcIiwgc3RhcnRJbmRleCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0Ly8gc3BsaXQgaW50byBncm91cHMsIGluY2x1ZGluZyBuZXN0ZWQgcGFyZW5zXG5cdFx0bGV0IGFsdGVybmF0aXZlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0aXZlcyhzbGljZSlcblx0XHRcdC5tYXAoZnVuY3Rpb24oZ3JvdXApIHtcblx0XHRcdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoZ3JvdXAsIFtdKTtcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHNbMF07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSdWxlLlNlcXVlbmNlKHsgcnVsZXM6IHJlc3VsdHMgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0bGV0IHJ1bGUgPSBhbHRlcm5hdGl2ZXMubGVuZ3RoID09PSAxID8gYWx0ZXJuYXRpdmVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0aXZlcyB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXG5cdFx0ZnVuY3Rpb24gZ3JvdXBBbHRlcm5hdGl2ZXModG9rZW5zKSB7XG5cdFx0XHR2YXIgYWx0ZXJuYXRpdmVzID0gW107XG5cdFx0XHR2YXIgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XHRjdXJyZW50ID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaGFuZGxlIG5lc3RlZCBwYXJlbnNcblx0XHRcdFx0ZWxzZSBpZiAodG9rZW4gPT09IFwiKFwiKSB7XG5cdFx0XHRcdFx0bGV0IHsgZW5kSW5kZXggfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHRva2VucywgXCIoXCIsIFwiKVwiLCBpKTtcblx0XHRcdFx0XHRjdXJyZW50ID0gY3VycmVudC5jb25jYXQodG9rZW5zLnNsaWNlKGksIGVuZEluZGV4ICsgMSkpO1xuXHRcdFx0XHRcdGkgPSBlbmRJbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdXJyZW50LnB1c2godG9rZW4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoY3VycmVudC5sZW5ndGgpIGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0cmV0dXJuIGFsdGVybmF0aXZlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdHZhciBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblxuXHRcdHZhciBwYXJhbXMgPSB7IHJ1bGU6IG1hdGNoLnNsaWNlWzBdIH07XG5cblx0XHQvLyBzZWUgaWYgdGhlcmUncyBhIGBub3RgIHJ1bGUgaW4gdGhlcmVcblx0XHRsZXQgYmFuZ1Bvc2l0aW9uID0gcGFyYW1zLnJ1bGUuaW5kZXhPZihcIiFcIik7XG5cdFx0aWYgKGJhbmdQb3NpdGlvbiAhPT0gLTEpIHtcblx0XHRcdHBhcmFtcy5ub3QgPSBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSk7IC8vWyBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSkgXTtcblx0XHRcdHBhcmFtcy5ydWxlID0gcGFyYW1zLnJ1bGUuc3Vic3RyKDAsIGJhbmdQb3NpdGlvbik7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5TdWJydWxlKHBhcmFtcyk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgbWF0Y2guZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBsaXN0IGV4cHJlc3Npb24gYFs8aXRlbT48ZGVsaW1pdGVyPl1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIltcIiwgXCJdXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHRpZiAocmVzdWx0cy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCBzdHVmZiBhdCBlbmQgb2YgbGlzdDogWyR7c2xpY2Uuam9pbihcIiBcIil9XWApO1xuXHRcdH1cblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLkxpc3QoKTtcblx0XHRydWxlLml0ZW0gPSByZXN1bHRzWzBdXG5cdFx0cnVsZS5kZWxpbWl0ZXIgPSByZXN1bHRzWzFdXG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxufSk7XG5cblxuXG4vLyAjIyAgQWRkIG1ldGhvZHMgdG8gUGFyc2VyIHRvIGRlZmluZSBydWxlcyB1c2luZyB0aGUgYWJvdmUgc3ludGF4LlxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUGFyc2VyLnByb3RvdHlwZSwge1xuXG5cdC8vIFBhcnNlIGEgYHJ1bGVTeW50YXhgIHJ1bGUgYW5kIGFkZCBpdCB0byBvdXIgbGlzdCBvZiBydWxlcy5cblx0Ly8gUmV0dXJucyB0aGUgbmV3IHJ1bGUuXG5cdC8vIExvZ3MgcGFyc2luZyBlcnJvcnMgYnV0IGFsbG93cyB0aGluZ3MgdG8gY29udGludWUuXG5cdGFkZFN5bnRheDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHR0cnkge1xuXHRcdFx0bGV0IHJ1bGUgPSBSdWxlLnBhcnNlUnVsZVN5bnRheChydWxlU3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yKTtcblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0fVxuXHR9fSxcblxuXHRhZGRTdGF0ZW1lbnQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlN0YXRlbWVudCkge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgU2VxdWVuY2VDb25zdHJ1Y3Rvcik7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJzdGF0ZW1lbnRcIiwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZEV4cHJlc3Npb246IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLkV4cHJlc3Npb24pIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBydWxlKTtcblx0fX0sXG5cblx0Ly8gQWRkIGluZml4IG9wZXJhdG9yLCBzdWNoIGFzIFwiYSBvciBiXCIuXG5cdC8vIE5PVEU6IGlmIHlvdSBoYXZlIG1vcmUgdGhhbiBvbmUgbWF0Y2hpbmcgb3BlcmF0b3IsXG5cdC8vXHRcdCBwYXNzIGluIGFuIGFycmF5IG9mIHNpbXBsZSBzdHJpbmdzIHNvIGFsbCBvZiBvdXIgb3BlcmF0b3JzIGFyZSBzaW1wbGUgc3RyaW5ncy5cblx0YWRkSW5maXhPcGVyYXRvcjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKSB7XG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZEluZml4T3BlcmF0b3IobmFtZSwgc3ludGF4LCBwcm9wZXJ0aWVzKSk7XG5cdFx0fVxuXG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkge1xuXHRcdFx0aWYgKCFydWxlLnRvSlMpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgaW5maXggb3BlcmF0b3IgcnVsZSAnJHtuYW1lfScgdG8gc3BlY2lmeSAndG9KUycgZnVuY3Rpb25gKVxuXHRcdFx0fVxuXHRcdFx0Ly8gY2xlYXIgbGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgZm9yIGdldHRlciBiZWxvd1xuXHRcdFx0ZGVsZXRlIHRoaXMuX19pbmZpeE9wZXJhdG9ycztcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJpbmZpeF9vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH19LFxuXG5cdC8vIExpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGFzIHN0cmluZ3MuXG5cdC8vIFJlLW1lbW9pemVkIGFmdGVyIGBhZGRJbmZpeE9wZXJhdG9yYCBhYm92ZS5cblx0aW5maXhPcGVyYXRvcnM6IGRlZmluZU1lbW9pemVkKFwiX19pbmZpeE9wZXJhdG9yc1wiLFxuXHRcdGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ydWxlc1tcImluZml4X29wZXJhdG9yXCJdXG5cdFx0XHRcdFx0XHQgJiYgdGhpcy5ydWxlc1tcImluZml4X29wZXJhdG9yXCJdLnJ1bGVzLm1hcChydWxlID0+IHJ1bGUuc3RyaW5nKVxuXHR9KSxcblxuXHQvLyBBZGQgcG9zdGZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgaXMgZGVmaW5lZFwiXG5cdC8vIE5PVEU6IGlmIHlvdSBoYXZlIG1vcmUgdGhhbiBvbmUgbWF0Y2hpbmcgb3BlcmF0b3IsXG5cdC8vXHRcdCBwYXNzIGluIGFuIGFycmF5IG9mIHNpbXBsZSBzdHJpbmdzIHNvIGFsbCBvZiBvdXIgb3BlcmF0b3JzIGFyZSBzaW1wbGUgc3RyaW5ncy5cblx0YWRkUG9zdGZpeE9wZXJhdG9yOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpIHtcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkUG9zdGZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50b0pTKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIHBvc3RmaXggb3BlcmF0b3IgcnVsZSAnJHtuYW1lfScgdG8gc3BlY2lmeSAndG9KUycgZnVuY3Rpb25gKTtcblx0XHRcdH1cblx0XHRcdC8vIGNsZWFyIGxpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGZvciBnZXR0ZXIgYmVsb3dcblx0XHRcdGRlbGV0ZSB0aGlzLl9fcG9zdGZpeE9wZXJhdG9ycztcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJwb3N0Zml4X29wZXJhdG9yXCIsIHJ1bGUpO1xuXHRcdH1cblx0fX0sXG5cblx0Ly8gTGlzdCBvZiBwb3N0Zml4IG9wZXJhdG9ycyBhcyBzdHJpbmdzLlxuXHQvLyBSZS1tZW1vaXplZCBhZnRlciBgYWRkSW5maXhPcGVyYXRvcmAgYWJvdmUuXG5cdHBvc3RmaXhPcGVyYXRvcnM6IGRlZmluZU1lbW9pemVkKFwiX19wb3NmaXhPcGVyYXRvcnNcIixcblx0XHRmdW5jdGlvbigpeyByZXR1cm4gdGhpcy5ydWxlc1tcInBvc3RmaXhfb3BlcmF0b3JcIl1cblx0XHRcdFx0XHRcdCYmIHRoaXMucnVsZXNbXCJwb3N0Zml4X29wZXJhdG9yXCJdLnJ1bGVzLm1hcChydWxlID0+IHJ1bGUuc3RyaW5nKTtcblx0fSlcbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGVTeW50YXguanMiLCIvL1xuLy9cdCMgQ29yZSBgcnVsZXNgIC0tIHNpbXBsZSBkYXRhdHlwZXMsIGV0Yy5cbi8vXG4vLyBOT1RFOiBtYW55IG9mIHRoZSBiZWxvdyBhcmUgY3JlYXRlZCBhcyBjdXN0b20gUGF0dGVybiBzdWJjbGFzc2VzIGZvciBkZWJ1Z2dpbmcuXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBgd2hpdGVzcGFjZWAgcnVsZS5cbi8vIE5PVEUgYHBhcnNlci5wYXJzZShcIndoaXRlc3BhY2VcIiwgXCIgICBcIilgIHdpbGwgcmV0dXJuIGB1bmRlZmluZWRgXG4vL1x0XHQgYmVjYXVzZSBgcGFyc2VyLnBhcnNlKClgIGF1dG9tYXRpY2FsbHkgZWF0cyB3aGl0ZXNwYWNlIGF0IHRoZSBzdGFydCBvZiBhIHJ1bGUuXG5SdWxlLldoaXRlc3BhY2UgPSBjbGFzcyB3aGl0ZXNwYWNlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9XG5wYXJzZXIuYWRkUnVsZShcIndoaXRlc3BhY2VcIiwgbmV3IFJ1bGUuV2hpdGVzcGFjZSh7IHBhdHRlcm46IC9cXHMrLywgb3B0aW9uYWw6IHRydWUgfSkpO1xuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5JZGVudGlmaWVyID0gY2xhc3MgaWRlbnRpZmllciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBpZGVudGlmaWVyID0gcGFyc2VyLmFkZFJ1bGUoXCJpZGVudGlmaWVyXCIsIG5ldyBSdWxlLklkZW50aWZpZXIoe1xuXHRwYXR0ZXJuOiAvW2Etel1bXFx3XFwtXSovLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgaWRlbnRpZmllcik7XG5cbi8vIEFkZCBFbmdsaXNoIHByZXBvc2l0aW9ucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vXG4vLyBXaWtpcGVkaWEgXCJQcmVwb3NpdGlvblwiOlxuLy9cdFwiUHJlcG9zaXRpb25zLi4uYXJlIGEgY2xhc3Mgb2Ygd29yZHMgdGhhdFxuLy9cdGV4cHJlc3Mgc3BhdGlhbCBvciB0ZW1wb3JhbCByZWxhdGlvbnMgIChpbiwgdW5kZXIsIHRvd2FyZHMsIGJlZm9yZSlcbi8vXHRvciBtYXJrIHZhcmlvdXMgc2VtYW50aWMgcm9sZXMgKG9mLCBmb3IpLlxuLy8gVEVTVE1FXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhYm91dFwiLCBcImFib3ZlXCIsIFwiYWZ0ZXJcIiwgXCJhbmRcIiwgXCJhc1wiLCBcImF0XCIsXG5cdFwiYmVmb3JlXCIsIFwiYmVoaW5kXCIsIFwiYmVsb3dcIiwgXCJiZW5lYXRoXCIsIFwiYmVzaWRlXCIsIFwiYmV0d2VlblwiLCBcImJleW9uZFwiLCBcImJ5XCIsXG5cdFwiZGVmaW5lZFwiLCBcImRvd25cIiwgXCJkdXJpbmdcIixcblx0XCJlYWNoXCIsIFwiZW1wdHlcIiwgXCJleGFjdGx5XCIsIFwiZXhjZXB0XCIsXG5cdFwiZm9yXCIsIFwiZnJvbVwiLFxuXHRcImdyZWF0ZXJcIixcblx0XCJpblwiLCBcImludG9cIixcblx0XCJsZXNzXCIsIFwibG9uZ1wiLFxuXHRcIm1pbnVzXCIsIFwibW9yZVwiLFxuXHRcIm5lYXJcIiwgXCJub3RcIixcblx0XCJvZlwiLCBcIm9mZlwiLCBcIm9uXCIsIFwib250b1wiLCBcIm9wcG9zaXRlXCIsIFwib3V0XCIsIFwib3V0c2lkZVwiLCBcIm92ZXJcIixcblx0XCJzaG9ydFwiLCBcInNpbmNlXCIsXG5cdFwidGhhblwiLCBcInRoZVwiLCBcInRoZW5cIiwgXCJ0aHJvdWdoXCIsIFwidGhydVwiLCBcInRvXCIsIFwidG93YXJkXCIsIFwidG93YXJkc1wiLFxuXHRcInVuZGVmaW5lZFwiLCBcInVuZGVyXCIsIFwidW5kZXJuZWF0aFwiLCBcInVuaXF1ZVwiLCBcInVudGlsXCIsIFwidXBcIiwgXCJ1cG9uXCIsIFwidXBzaWRlXCIsXG5cdFwidmVyc3VzXCIsIFwidnNcIixcblx0XCJ3aXRoXCIsIFwid2l0aGluXCIsIFwid2l0aG91dFwiLFxuKTtcblxuLy8gQWRkIGNvbW1vbiBlbmdsaXNoIHZlcmJzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYXJlXCIsXG5cdFwiZG9cIiwgXCJkb2VzXCIsXG5cdFwiY29udGFpbnNcIixcblx0XCJoYXNcIiwgXCJoYXZlXCIsXG5cdFwiaXNcIixcblx0XCJyZXBlYXRcIixcblx0XCJ3YXNcIiwgXCJ3ZXJlXCJcbik7XG5cbi8vIEFkZCBzcGVjaWFsIGNvbnRyb2wga2V5d29yZHMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJlbHNlXCIsXG5cdFwiaWZcIixcblx0XCJvdGhlcndpc2VcIixcblx0XCJ3aGlsZVwiXG4pO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLlR5cGUgPSBjbGFzcyB0eXBlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IHR5cGUgPSBwYXJzZXIuYWRkUnVsZShcInR5cGVcIiwgbmV3IFJ1bGUuVHlwZSh7XG5cdHBhdHRlcm46IC9bQS1aXVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCB0eXBlKTtcblxuXG4vLyBgbnVtYmVyYCBhcyBlaXRoZXIgZmxvYXQgb3IgaW50ZWdlciwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuUnVsZS5OdW1iZXIgPSBjbGFzcyBudW1iZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgbnVtYmVyID0gcGFyc2VyLmFkZFJ1bGUoXCJudW1iZXJcIiwgbmV3IFJ1bGUuTnVtYmVyKHtcblx0cGF0dGVybjogLy0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VGbG9hdCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG51bWJlcik7XG5cblxuLy8gTnVtZXJpYyBgaW50ZWdlcmAgb25seSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gTk9URTogdGhpcyBXSUxMIG1hdGNoIGEgZmxvYXQsIGJ1dCB0aGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBjb2VyY2UgdG8gYW4gaW50ZWdlci5cbi8vIFJFVklFVzogaXMgdGhpcyByaWdodD8gIEJldHRlciB0byBub3QgbWF0Y2ggYSBmbG9hdD9cblJ1bGUuSW50ZWdlciA9IGNsYXNzIGludGVnZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImludGVnZXJcIiwgbmV3IFJ1bGUuSW50ZWdlcih7XG5cdHBhdHRlcm46IC8tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gaW50ZWdlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUludCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xuXG5cbi8vIExpdGVyYWwgYHRleHRgIHN0cmluZywgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gWW91IGNhbiB1c2UgZWl0aGVyIHNpbmdsZSBvciBkb3VibGUgcXVvdGVzIG9uIHRoZSBvdXRzaWRlIChhbHRob3VnaCBkb3VibGUgcXVvdGVzIGFyZSBwcmVmZXJyZWQpLlxuLy8gUmV0dXJuZWQgdmFsdWUgaGFzIGVuY2xvc2luZyBxdW90ZXMuXG4vLyBUT0RPOiBlc2NhcGVkIHF1b3RlcyBpbnNpZGUgc3RyaW5nXG5SdWxlLlRleHQgPSBjbGFzcyB0ZXh0IGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IHRleHQgPSBwYXJzZXIuYWRkUnVsZShcInRleHRcIiwgbmV3IFJ1bGUuVGV4dCh7XG5cdHBhdHRlcm46IC8oPzpcIlteXCJdKlwifCdbXiddKicpL1xufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHRleHQpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cblJ1bGUuQm9vbGVhbiA9IGNsYXNzIGJvb2xlYW4gZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgYm9vbCA9IHBhcnNlci5hZGRSdWxlKFwiYm9vbGVhblwiLCBuZXcgUnVsZS5Cb29sZWFuKHtcblx0cGF0dGVybjogLyh0cnVlfGZhbHNlfHllc3xub3xva3xjYW5jZWwpXFxiLyxcblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0Y2FzZSBcInRydWVcIjpcblx0XHRcdGNhc2UgXCJ5ZXNcIjpcblx0XHRcdGNhc2UgXCJva1wiOlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBib29sKTtcbi8vIEFkZCBib29sZWFuIHRva2VucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vIFRFU1RNRVxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwidHJ1ZVwiLCBcImZhbHNlXCIsXG5cdFwieWVzXCIsIFwibm9cIixcblx0XCJva1wiLCBcImNhbmNlbFwiXG4pO1xuXG4vLyBMaXRlcmFsIGxpc3QgKGFycmF5KSwgZWc6ICBgWzEsMix0cnVlLGZhbHNlIF1gXG5sZXQgbGlzdCA9IHBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpdGVyYWxfbGlzdFwiLFxuXHRcIlxcXFxbW2xpc3Q6e2V4cHJlc3Npb259LF0/XFxcXF1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBsaXRlcmFsX2xpc3QgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXG4vL1RPRE86IHNxdWlycmVseS4uLlxuXHRcdC8vIFdoZW4gZ2F0aGVyaW5nIGFyZ3VtZW50cywgcmV0dXJuIGp1c3QgdGhlIG1hdGNoZWQgbGlzdCBkYXRhLCBpZ25vcmluZyB0aGUgYnJhY2tldHMuXG5cdFx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkWzFdO1xuXHRcdH1cblxuXHRcdC8vIHJldHVybiBqdXN0IHRoZSBsaXN0IGFzIG91ciBzb3VyY2Vcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG4gXHRcdFx0cmV0dXJuIHRoaXMucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIExpdGVyYWwgdmFsdWUgYXMgbnVtYmVyLCB0ZXh0IG9yIGJvb2xlYW4uXG4vL1RPRE86IHRoaXMgaXMgYW4gZXhwcmVzc2lvbi4uLiBidXQgaW5zdGFsbGluZyBpdCB0aGF0IHdheSBicmVha3MgcGFyc2luZy4uLj9cbi8vVEVTVE1FOiBhZGQgbGl0ZXJhbC1saXN0IHRvIHRoaXM/XG5wYXJzZXIuYWRkU3ludGF4KFwibGl0ZXJhbFwiLCBcIihsaXRlcmFsOntudW1iZXJ9fHt0ZXh0fXx7Ym9vbGVhbn18e2xpdGVyYWxfbGlzdH0pXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJcbi8vIFRPRE86IGNvbnZlcnQgdG8gbGluZS1hd2FyZSBzdHJlYW0/Pz9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRTdHJlYW0ge1xuXHQvLyBZb3UgY2FuIGNvbnN0cnVjdCB3aXRoIGEgdGV4dCBzdHJpbmcgb3IgYSBzZXQgb2YgcHJvcGVydGllcyAoaW5jbHVkaW5nIGB0ZXh0YCkuXG5cdGNvbnN0cnVjdG9yKC4uLnRleHRPclByb3BzKSB7XG5cdFx0dGV4dE9yUHJvcHMuZm9yRWFjaCgoYXJnKSA9PiB7XG5cdFx0XHRpZiAodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHR0aGlzLnRleHQgPSBhcmc7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChhcmcpIHtcblx0XHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBhcmcpO1xuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvLyBNYWtlIHN1cmUgYHRleHRgIGFuZCBgc3RhcnRJbmRleGAgYXJlIGRlZmluZWQuXG5cdFx0aWYgKCEoXCJ0ZXh0XCIgaW4gdGhpcykpIHRoaXMudGV4dCA9IFwiXCI7XG5cdFx0aWYgKCEoXCJzdGFydEluZGV4XCIgaW4gdGhpcykpIHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdH1cblxuXHQvLyBSZXR1cm4gYW4gaW1tdXRhYmxlIGNsb25lIG9mIHRoZSBzdHJlYW0uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0cmV0dXJuIG5ldyBUZXh0U3RyZWFtKHRoaXMsIHByb3BzKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2VkIHRvIG5ldyBzdGFydEluZGV4LlxuXHRhZHZhbmNlVG8oc3RhcnRJbmRleCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleCB9KTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2luZyBzdGFydEluZGV4IEJZIGBsZW5ndGhgXG5cdGFkdmFuY2VCeShsZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcblx0fVxuXG4vLyBcdC8vIFJldHVybiBjbG9uZSBvZiB0aGlzIHN0cmVhbSB3aXRoIGVuZEluZGV4IHNldCB0byBzdGFydCArIGBsZW5ndGhgXG4vLyBcdGVuZEFmdGVyKGxlbmd0aCkge1xuLy8gXHRcdHJldHVybiB0aGlzLmNsb25lKHsgZW5kSW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcbi8vIFx0fVxuXG4vL1xuLy8gIyMgTWF0Y2hpbmdcbi8vXG5cdC8vIE1hdGNoIGBwYXR0ZXJuYCBhcyByZWdleCBpbiB0aGlzIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBtYXRjaCBvciBgdW5kZWZpbmVkYC5cblx0Ly8gSWYgeW91IHdhbnQgdG8gdGVzdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmVhbSxcblx0Ly9cdG1ha2Ugc3VyZSB5b3VyIHJlZ2V4IHN0YXJ0cyB3aXRoIGBeYC5cblx0Ly8gVEVTVE1FOiB0aGlzIGxpa2VseSBicmVha3Mgd2l0aCBhIGBnYCBvbiB0aGUgcGF0dGVybj9cblx0bWF0Y2gocGF0dGVybikge1xuXHRcdGlmICghKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBUZXh0U3RyZWFtLm1hdGNoKCR7cGF0dGVybn0pOiBleHBlY3RlZCBSZWdFeHBgKTtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQubWF0Y2gocGF0dGVybikgfHwgdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGlzIHN0cmVhbSBJTkNMVURFIGEgcmVnZXggd2l0aGluIGl0P1xuXHQvLyBSZXR1cm5zIGB0cnVlYCBvciBgZmFsc2VgLlxuXHQvLyBOT1RFOiBQYXR0ZXJuIG11c3QgTk9UIHN0YXJ0IHdpdGggYF5gIGZvciB0aGlzIHRvIG1hdGNoIGluIHRoZSBtaWRkbGUgb2YgdGhlIHN0cmVhbS5cblx0dGVzdChwYXR0ZXJuKSB7XG5cdFx0cmV0dXJuIHBhdHRlcm4udGVzdCh0aGlzLmhlYWQpO1xuXHR9XG5cbi8vXG4vLyAjIyBSZWZsZWN0aW9uXG4vL1xuXHQvLyBSZXR1cm4gdGV4dCBvZiBzdHJpbmcgc3RhcnRpbmcgYXQgb3VyIGBzdGFydEluZGV4YFxuXHRnZXQgaGVhZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5yYW5nZSgpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgcmFuZ2Ugb2YgdGhlIHN0cmluZyBmcm9tIGBzdGFydEluZGV4YCB0byBgZW5kSW5kZXhgIE5PTi1pbmNsdXNpdmUuXG5cdHJhbmdlKHN0YXJ0SW5kZXggPSB0aGlzLnN0YXJ0SW5kZXgsIGVuZEluZGV4ID0gdGhpcy5lbmRJbmRleCB8fCB0aGlzLnRleHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5zdWJzdHJpbmcoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xuXHR9XG5cblx0Ly8gTGVuZ3RoIG9mIHRoZSBzdHJlYW0uXG5cdGdldCBsZW5ndGgoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5sZW5ndGg7XG5cdH1cblxuXHQvLyBBcmUgd2UgYXQgdGhlIGVuZCBvZiB0aGUgc3RyZWFtP1xuXHRnZXQgaXNFbXB0eSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGFydEluZGV4ID09PSB0aGlzLmxlbmd0aDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHRcblx0fTtcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9UZXh0U3RyZWFtLmpzIiwiaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGxvYWQgc3RhbmRhcmQgcnVsZXMgZmlsZXMgaGVyZVxuaW1wb3J0IFwiLi9jb3JlXCI7XG5pbXBvcnQgXCIuL251bWJlcnNcIjtcbmltcG9ydCBcIi4vb3BlcmF0b3JzXCI7XG5pbXBvcnQgXCIuL3N0YXRlbWVudHNcIjtcbmltcG9ydCBcIi4vYXNzaWdubWVudFwiO1xuaW1wb3J0IFwiLi9jbGFzc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiLy8gTWVtb2l6ZS9mb3JnZXQgc2VtYW50aWNzLlxuXG4vLyBSZXR1cm4gYSBtZW1vaXppbmcgZ2V0dGVyIGZ1bmN0aW9uLlxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXNbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGdldHRlci5hcHBseSh0aGlzKTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIERlZmluZSBzbyB0aGF0IHdlIGNhbiBiZSBkZWxldGVkIGFuZCByZS1kZWZpbmVkLCBidXQgbm90IHNldCBvciBlbnVtZXJhdGVkLlxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcGVydHksIHsgdmFsdWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXNbcHJvcGVydHldO1xuXHR9XG59XG5cblxuLy8gUmV0dXJuIGEgbWVtb2l6ZSBmdW5jdGlvbiBmb3IgdXNlIGFzIGEgZ2V0dGVyIGluIGEgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYFxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4ge1xuXHRcdGdldCA6IG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpXG5cdH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9tZW1vaXplLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBUT0RPOiB7cHJvcGVydHktZXhwcmVzc2lvbn0gYWxzbyB3b3Jrcy4uLiB7YXNzaWduYWJsZS1leHByZXNzaW9ufSA/Pz9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsIFwie2lkZW50aWZpZXJ9ID0ge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCB7IGlkZW50aWZpZXIsIGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHQvLyBUT0RPOiBkZWNsYXJlIGlkZW50aWZpZXIgaWYgbm90IGluIHNjb3BlLCBldGNcblx0XHRyZXR1cm4gYCR7aWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KX0gPSAke2V4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCl9YDtcblx0fVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvYXNzaWdubWVudC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVmaW5pbmcgY2xhc3NlcyAoa25vd24gYXMgYHR5cGVzYClcbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIocHJvcGVydGllczp0aGUge2lkZW50aWZpZXJ9IG9mKSsgdGhlPyB7ZXhwcmVzc2lvbn1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBwcm9wZXJ0eV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBwcm9wZXJ0aWVzIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHByb3BlcnRpZXMgPSBwcm9wZXJ0aWVzLnJlc3VsdHNcblx0XHRcdFx0XHRcdFx0LnJldmVyc2UoKVxuXHRcdFx0XHRcdFx0XHQubWFwKCBwcm9wZXJ0eSA9PiBwcm9wZXJ0eS5pZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpIClcblx0XHRcdFx0XHRcdFx0LmpvaW4oXCInLCAnXCIpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXQoJHtleHByZXNzaW9ufSwgWycke3Byb3BlcnRpZXN9J10pYDtcblx0XHR9XG5cdH1cbik7XG5cblxucGFyc2VyLmFkZFN5bnRheChcInNjb3BlX21vZGlmaWVyXCIsIFwiKHNjb3BlOmdsb2JhbHxjb25zdGFudHxzaGFyZWR8bG9jYWwpXCIpO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlcIixcblx0XCJ7c2NvcGVfbW9kaWZpZXJ9PyB7YXNzaWdubWVudH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGFzc2lnbm1lbnQsIHNjb3BlX21vZGlmaWVyIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRhc3NpZ25tZW50ID0gYXNzaWdubWVudC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBzY29wZSA9IHNjb3BlICYmIHNjb3BlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0c3dpdGNoIChzY29wZSkge1xuXHRcdFx0XHRjYXNlIFwiZ2xvYmFsXCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBnbG9iYWwuJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcImNvbnN0YW50XCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBjb25zdCAke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwic2hhcmVkXCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBzdGF0aWMgJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcImxvY2FsXCI6XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0cmV0dXJuIGFzc2lnbm1lbnQ7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eV9hc19vbmVfb2ZcIixcblx0XCJ7c2NvcGVfbW9kaWZpZXJ9PyB7aWRlbnRpZmllcn0gYXMgb25lIG9mIHtsaXN0OmxpdGVyYWxfbGlzdH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHNjb3BlX21vZGlmaWVyLCBpZGVudGlmaWVyLCBsaXN0IH0gPSB0aGlzLnJlc3VsdHM7XG4vL1RPRE86IG5vdCBoYW5kbGluZyBzY29wZV9tb2RpZmllclxuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgcGx1cmFsID0gKGlkZW50aWZpZXIgKyBcIl9WQUxVRVNcIikudG9VcHBlckNhc2UoKTtcblx0XHRcdGxldCB2YWx1ZXMgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuLy9UT0RPOiBsaXN0LmdldEl0ZW0oMClcblx0XHRcdGxldCBmaXJzdCA9IGxpc3QucmVzdWx0cy5tYXRjaGVkWzBdO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKGNvbnRleHQpIDogXCJ1bmRlZmluZWRcIjtcblx0XHRcdHJldHVybiBgc3RhdGljICR7cGx1cmFsfSA9ICR7dmFsdWVzfTtcXG5gXG5cdFx0XHRcdCArIGBnZXQgJHtpZGVudGlmaWVyfSB7IHJldHVybiAoXCJfXyR7aWRlbnRpZmllcn1cIiBpbiB0aGlzID8gdGhpcy5fXyR7aWRlbnRpZmllcn0gOiAke2ZpcnN0VmFsdWV9KSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuY29uc3RydWN0b3IuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9XFxuYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9jbGFzcy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVhbGluZyB3aXRoIG51bWJlcnNcbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5sZXQgaW5kZXhfZXhwcmVzc2lvbiA9IHBhcnNlci5hZGRSdWxlKFwiaW5kZXhfZXhwcmVzc2lvblwiLCBuZXcgKGNsYXNzIGluZGV4X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkFsdGVybmF0aXZlc3t9KSgpKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBpbmRleF9leHByZXNzaW9uKTtcblxuLy8gTnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZzpcbi8vXHQtIGBpdGVtIDEgb2YgLi4uYFxuLy9cdC0gYGl0ZW0gIzIgb2YgLi4uYFxuLy8gTk9URTogdGhlc2UgaW5kaWNlcyBhcmUgT05FIGJhc2VkLCBOT1QgemVybyBiYXNlZCBhcyBpcyBKYXZhc2NyaXB0LlxuLy8gVE9ETzogaWYgYGlkZW50aWZpZXJgIGlzIFwid29yZFwiLCBvdXRwdXQgYGdldFdvcmQoKWAgZXRjXG5wYXJzZXIuYWRkU3ludGF4KFwiaW5kZXhfZXhwcmVzc2lvblwiLFxuXHRcIntpZGVudGlmaWVyfSAoIyk/e251bWJlcjppbnRlZ2VyfSBvZiB7ZXhwcmVzc2lvbn1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBpbmRleF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBudW1iZXIsIGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCl9LCAke251bWJlci50b1NvdXJjZShjb250ZXh0KX0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gT3JkaW5hbCBudW1iZXJzOiBmaXJzdCwgc2Vjb25kLCBldGMuXG5wYXJzZXIuYWRkUnVsZShcIm9yZGluYWxcIiwgbmV3IChjbGFzcyBvcmRpbmFsIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXMge30pKCkpO1xuXG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImZpcnN0XCIsIHsgdG9Tb3VyY2U6ICgpID0+IDEgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInNlY29uZFwiLCB7IHRvU291cmNlOiAoKSA9PiAyIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJ0aGlyZFwiLCB7IHRvU291cmNlOiAoKSA9PiAzIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJmb3VydGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gNCB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZmlmdGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gNSB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwic2l4dGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gNiB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwic2V2ZW50aFwiLCB7IHRvU291cmNlOiAoKSA9PiA3IH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJlaWdodGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gOCB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwibmludGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gOSB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwidGVudGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gMTAgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInBlbnVsdGltYXRlXCIsIHsgdG9Tb3VyY2U6ICgpID0+IC0yIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJmaW5hbFwiLCB7IHRvU291cmNlOiAoKSA9PiAtMSB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwibGFzdFwiLCB7IHRvU291cmNlOiAoKSA9PiAtMSB9KTtcblxuLy8gVE9ETzogc2l4dHktZmlmdGgsIHR3byBodW5kcmVkIGZvcnR5IG5pbnRoLi4uXG5cbi8vIEFsdGVybmF0aXZlIGZvcm0gZm9yIG51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmcuXG4vLyBOT1RFOiBkb24ndCBhZGQgYXMgYW4gZXhwcmVzc2lvbiBzaW5jZSB3ZSdyZSBhdXRvLW1lcmdlZCB3aXRoIGBpbmRleF9leHByZXNzaW9uYCBhYm92ZS5cbi8vIFRPRE86IGlmIGBpZGVudGlmaWVyYCBpcyBcIndvcmRcIiwgb3V0cHV0IGBnZXRXb3JkKClgIGV0Y1xucGFyc2VyLmFkZFN5bnRheChcblx0XCJpbmRleF9leHByZXNzaW9uXCIsXG5cdFwidGhlIHtvcmRpbmFsfSB7aWRlbnRpZmllcn0gb2Yge2V4cHJlc3Npb259XCIsXG5cdHVuZGVmaW5lZCxcblx0Y2xhc3MgaW5kZXhfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgb3JkaW5hbCwgZXhwcmVzc2lvbiB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KX0sICR7b3JkaW5hbC50b1NvdXJjZShjb250ZXh0KX0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBpbmZpeCBhbmQgcHJlZml4IG9wZXJhdG9ycy5cbi8vXG5cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyMjIEluZml4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPiB7cmhzfWAsIGVnOiBgYSBpcyAxYFxuLy8gTk9URTogYG9wZXJhdG9yLnRvSlNgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyB0d28gYXJndW1lbnRzIChgbGhzYCBhbmQgYHJoc2ApIGludG8gb3V0cHV0LlxuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImFuZFwiLCBcImFuZFwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gJiYgJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwib3JcIiwgXCJvclwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gfHwgJHtifSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc1wiLCBcImlzXCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RcIiwgXCJpcyBub3RcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfZXhhY3RseVwiLCBcImlzIGV4YWN0bHlcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RfZXhhY3RseVwiLCBcImlzIG5vdCBleGFjdGx5XCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPT0gJHtifSlgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNPZlR5cGUodGhpbmcsIHR5cGUpYFxuLy9UT0RPOiBgaXMgc2FtZSB0eXBlIGFzYCA/XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX3R5cGVfb2ZcIiwgW1wiaXMgYVwiLCBcImlzIGFuXCJdLCB7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGBzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RfdHlwZV9vZlwiLCBbXCJpcyBub3QgYVwiLCBcImlzIG5vdCBhblwiXSwgeyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmNvbnRhaW5zKGNvbGxlY3Rpb24sIHRoaW5nKWBcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfaW5cIiwgW1wiaXMgaW5cIiwgXCJpcyBvbmUgb2ZcIl0sIHsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYHNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RfaW5cIiwgW1wiaXMgbm90IGluXCIsIFwiaXMgbm90IG9uZSBvZlwiXSwgeyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgIXNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xuLy9URVNUTUVcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaW5jbHVkZXNcIiwgW1wiaW5jbHVkZXNcIiwgXCJjb250YWluc1wiXSwgeyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgc3BlbGwuY29udGFpbnMoJHtsaXN0fSwgJHt0aGluZ30pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImRvZXNudF9pbmNsdWRlXCIsIFtcImRvZXMgbm90IGluY2x1ZGVcIiwgXCJkb2VzbnQgaW5jbHVkZVwiLCBcImRvZXMgbm90IGNvbnRhaW5cIiwgXCJkb2VzbnQgY29udGFpblwiXSwgeyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0XCIsIFtcIj5cIiwgXCJpcyBncmVhdGVyIHRoYW5cIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZ3RlXCIsIFtcIj49XCIsIFwiaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJsdFwiLCBbXCI8XCIsIFwiaXMgbGVzcyB0aGFuXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0ZVwiLCBbXCI8PVwiLCBcImlzIGxlc3MgdGhhbiBvciBlcXVhbCB0b1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPD0gJHtifSlgIH19KTtcblxuLy9UT0RPOiAgY2FuJ3QgYWRkIGArYCBhcyBhIHJ1bGUsIGZpeCB0aGlzIHRoZW4gYWRkIHRoZXNlXG4vL1RPRE86ICBvcGVyYXRvciBwcmVjZWRlbmNlPz8/XG4vL1RFU1RNRVxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJwbHVzXCIsIFtcIlxcXFwrXCIsIFwicGx1c1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSArICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibWludXNcIiwgW1wiLVwiLCBcIm1pbnVzXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJ0aW1lc1wiLCBbXCJcXFxcKlwiLCBcInRpbWVzXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICogJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJkaXZpZGVkX2J5XCIsIFtcIi9cIiwgXCJkaXZpZGVkIGJ5XCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC8gJHtifWAgfX0pO1xuXG4vL1RPRE86ICBgKz1gIGV0Yz8gIG90aGVyIG1hdGggZnVuY3Rpb25zP1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6aW5maXhfb3BlcmF0b3J9IHtyaHM6ZXhwcmVzc2lvbn1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRsZWZ0UmVjdXJzaXZlID0gdHJ1ZTtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaHMsIHJocywgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGxocy50b1NvdXJjZShjb250ZXh0KSwgcmhzLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIyMgUG9zdGlmeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj5gLCBlLmcuIGBhIGlzIGRlZmluZWRgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBKUyBvdXRwdXQuXG5cbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19kZWZpbmVkXCIsIFwiaXMgZGVmaW5lZFwiLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ICE9PSAndW5kZWZpbmVkJylgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19ub3RfZGVmaW5lZFwiLCBbXCJpcyBub3QgZGVmaW5lZFwiLCBcImlzIHVuZGVmaW5lZFwiXSwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzRW1wdHkodGhpbmcpYFxucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX2VtcHR5XCIsIFwiaXMgZW1wdHlcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19ub3RfZW1wdHlcIiwgXCJpcyBub3QgZW1wdHlcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9fSk7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeF9vcGVyYXRvcn1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBwb3N0Zml4X29wZXJhdG9yX2V4cHJlc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0bGVmdFJlY3Vyc2l2ZSA9IHRydWU7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG4vL3BhcnNlci5hZGRTeW50YXgoXCJvcGVyYXRvcl9leHByZXNzaW9uXCIsIFwiKGV4cHJlc3Npb246e3Bvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvbn18e2luZml4X29wZXJhdG9yX2V4cHJlc3Npb259KVwiKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJpbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuaW1wb3J0IFwiLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL3J1bGVzL2luZGV4LmpzXCI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHR3aW5kb3cuVGV4dFN0cmVhbSA9IFRleHRTdHJlYW07XG5cdHdpbmRvdy5QYXJzZXIgPSBQYXJzZXI7XG5cdHdpbmRvdy5SdWxlID0gUnVsZTtcblx0d2luZG93LnBhcnNlciA9IHBhcnNlcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuXHRUZXh0U3RyZWFtLCBQYXJzZXIsIFJ1bGUsIHBhcnNlclxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvaW5kZXguanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiaWZcIiwgXCJpZiB7ZXhwcmVzc2lvbn0gKHRoZW58Oikge3N0YXRlbWVudH0/XCIsIHtcblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdH1cbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiXSwic291cmNlUm9vdCI6IiJ9