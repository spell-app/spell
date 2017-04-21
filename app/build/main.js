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
//		- `rule.args`				Return matched arguments in a format suitable to do:
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
		// NOTE: you may want to memoize the args.

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
		key: "args",
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
				// DEBUG
				matched: stream.range(stream.startIndex, next.startIndex),
				// DEBUG
				startIndex: stream.startIndex,
				endIndex: next.startIndex,
				stream: stream
			});
		}

		//TODOC
		// "gather" arguments in preparation to call `toSource()`
		// Only callable after parse is completed.
		// Returns an object with properties from the `values` array indexed by
		//		- `results.argument`:		argument set when rule was declared, eg: `{value:literal}` => `value`
		//		- `results.ruleName`:		name of rule when defined
		//		- `rule type`:				name of the rule type
		// NOTE: memoizes the args.

	}, {
		key: "toString",
		value: function toString() {
			return "" + this.rules.join(" ") + (this.optional ? '?' : '');
		}
	}, {
		key: "args",
		get: function get() {
			if (!this.results) return undefined;
			if (!this._args) {
				var args = this._args = {};
				var _iteratorNormalCompletion2 = true;
				var _didIteratorError2 = false;
				var _iteratorError2 = undefined;

				try {
					for (var _iterator2 = this.results[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
						var result = _step2.value;

						var argName = result.argument || result.ruleName || result.constructor.name;

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
			}
			return this._args;
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
			var result = _get(expression.prototype.__proto__ || Object.getPrototypeOf(expression.prototype), "parse", this).call(this, parser, stream);
			if (this.leftRecursive) delete this.dontRecurse;
			return result;
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

			// assign `argName` or `ruleName` for `args`
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
				// DEBUG
				matched: stream.range(stream.startIndex, next.startIndex),
				// DEBUG
				startIndex: stream.startIndex,
				endIndex: next.startIndex,
				stream: stream
			});
		}

		// "gather" arguments in preparation to call `toSource()`
		// Only callable after parse is completed.
		// Returns an array with arguments of all results.
		// NOTE: memoizes the args.

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
		key: "args",
		get: function get() {
			if (!this.results) return undefined;
			return this._args || (this._args = this.results.map(function (result) {
				return result.args;
			}));
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
				// DEBUG
				matched: stream.range(stream.startIndex, next.startIndex),
				// DEBUG
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
		value: function toSource(context) {
			if (!this.results) return undefined; // TODO: throw???
			var results = this.results.map(function (result) {
				return result.toSource(context);
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
			return this.args.toSource(context);
		}
	}, {
		key: "args",

		// When gathering arguments, return just the matched list data, ignoring the brackets.
		get: function get() {
			return this.results[1];
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
		var identifier = this.args.identifier.toSource(context);
		var value = this.args.expression.toSource(context);
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
			var thing = this.args.expression.toSource(context);
			var property_names = this.args.property_names.reverse().map(function (identifier) {
				return identifier.toSource(context);
			}).join(".");
			return "spell.get(" + thing + ", '" + property_names + "')";
		}
	}, {
		key: "args",
		get: function get() {
			if (!this._args) {
				this._args = _get(property_expression.prototype.__proto__ || Object.getPrototypeOf(property_expression.prototype), "args", this);
				// transform property_names and pull out identifiers
				this._args.property_names = this._args.property_names.args.map(function (sequence) {
					return sequence.identifier;
				});
			}
			return this._args;
		}
	}]);

	return property_expression;
}(_RuleSyntax2.default.Expression));

_parser2.default.addSyntax("scope_modifier", "(scope:global|constant|shared|local)");

_parser2.default.addStatement("declare_property", "{scope_modifier}? {assignment}", {
	toSource: function toSource(context) {
		var assignment = this.args.assignment.toSource(context);
		var scope = this.args.scope && this.args.scope.toSource(context);
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
		var scope = this.args.scope.toSource(context);
		var identifier = this.args.identifier.toSource(context);
		var plural = (identifier + "_VALUES").toUpperCase();
		var list = this.args.list;
		var values = list.toSource(context);
		var first = list.args.results[0];
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
			var number = this.args.number.toSource(context);
			var expression = this.args.expression.toSource(context);
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
			var ordinal = this.args.ordinal.toSource(context);
			var expression = this.args.expression.toSource(context);
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
			var lhs = this.args.lhs.toSource(context);
			var rhs = this.args.rhs.toSource(context);

			var toJS = this.args.operator.toJS;
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
			var lhs = this.args.expression.toSource(context);
			var toJS = this.args.operator.toJS;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgMmY2ZjZkMWI1ZTE0MTZkMTc3YTIiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZVN5bnRheC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIl0sIm5hbWVzIjpbInBhcnNlciIsIndpbmRvdyIsImNvbnNvbGUiLCJncm91cCIsImxvZyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInJ1bGVzIiwiY3JlYXRlIiwibmFtZSIsInN0cmVhbSIsInJ1bGUiLCJnZXRSdWxlIiwiU3ludGF4RXJyb3IiLCJlYXRXaGl0ZXNwYWNlIiwicGFyc2UiLCJyZXN1bHQiLCJ3aGl0ZXNwYWNlIiwiYWR2YW5jZUJ5IiwibWF0Y2hlZCIsImxlbmd0aCIsImV4aXN0aW5nIiwiQWx0ZXJuYXRpdmVzIiwiZGVidWciLCJydWxlTmFtZSIsImFyZ3VtZW50IiwiYWRkUnVsZSIsInRva2VucyIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsInN0YXJ0SW5kZXgiLCJuZXN0aW5nIiwibmVzdGVkIiwiZW5kSW5kZXgiLCJsYXN0SW5kZXgiLCJ0b2tlbiIsInNsaWNlIiwic3RyaW5nIiwic3BsaXQiLCJtYXAiLCJjaGFyIiwiaW5kZXgiLCJsaXN0IiwiUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyIsImpvaW4iLCJmbGFncyIsIlJlZ0V4cCIsImVzY2FwZVJlZ0V4cENoYXJhY3RlcnMiLCJERUJVRyIsImNoYXJzIiwiZm9yRWFjaCIsIlJ1bGUiLCJjb25zdHJ1Y3RvciIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2xvbmUiLCJwcm9wcyIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsImNvbnRleHQiLCJQYXR0ZXJuIiwicGF0dGVybiIsImRlZmluZVByb3BlcnR5IiwidmFsdWUiLCJzb3VyY2UiLCJtYXRjaCIsInN0YXJ0UGF0dGVybiIsImJsYWNrbGlzdCIsIndvcmRzIiwid29yZCIsIlN5bWJvbCIsIlJlZ0V4cEZyb21TdHJpbmciLCJvcHRpb25hbCIsIm1lcmdlU3ltYm9scyIsImZpcnN0Iiwic2Vjb25kIiwiS2V5d29yZCIsInBhdHRlcm5TdHJpbmciLCJtZXJnZUtleXdvcmRzIiwiU3VicnVsZSIsImlzRGV0ZXJtaW5pc3RpYyIsIk5lc3RlZCIsImV2ZXJ5IiwiU2VxdWVuY2UiLCJyZXN1bHRzIiwibmV4dCIsInB1c2giLCJyYW5nZSIsIl9hcmdzIiwiYXJncyIsImFyZ05hbWUiLCJBcnJheSIsImlzQXJyYXkiLCJFeHByZXNzaW9uIiwiZG9udFJlY3Vyc2UiLCJsZWZ0UmVjdXJzaXZlIiwiU3RhdGVtZW50IiwiYmVzdE1hdGNoIiwidG9Tb3VyY2UiLCJSZXBlYXQiLCJpbmNsdWRlcyIsIkxpc3QiLCJpdGVtIiwiZGVsaW1pdGVyIiwicGFyc2VSdWxlU3ludGF4Iiwic3ludGF4IiwiU2VxdWVuY2VDb25zdHJ1Y3RvciIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInBhcnNlUnVsZVN5bnRheF90b2tlbnMiLCJTWU5UQVhfRVhQUkVTU0lPTiIsInBhcnNlUnVsZVN5bnRheF90b2tlbiIsImxhc3QiLCJwb3AiLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zdHJpbmciLCJwYXJzZVJ1bGVTeW50YXhfc3VicnVsZSIsInBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyIsInBhcnNlUnVsZVN5bnRheF9saXN0IiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsInN0YXJ0c1dpdGgiLCJzdWJzdHIiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJhbHRlcm5hdGl2ZXMiLCJncm91cEFsdGVybmF0aXZlcyIsImN1cnJlbnQiLCJpIiwiY29uY2F0Iiwic3ltYm9sIiwicGFyYW1zIiwiYmFuZ1Bvc2l0aW9uIiwiaW5kZXhPZiIsIm5vdCIsImRlZmluZVByb3BlcnRpZXMiLCJhZGRTeW50YXgiLCJydWxlU3ludGF4IiwiZSIsImVycm9yIiwiYWRkU3RhdGVtZW50IiwiYWRkRXhwcmVzc2lvbiIsImFkZEluZml4T3BlcmF0b3IiLCJ0b0pTIiwiX19pbmZpeE9wZXJhdG9ycyIsImluZml4T3BlcmF0b3JzIiwiYWRkUG9zdGZpeE9wZXJhdG9yIiwiX19wb3N0Zml4T3BlcmF0b3JzIiwicG9zdGZpeE9wZXJhdG9ycyIsIldoaXRlc3BhY2UiLCJJZGVudGlmaWVyIiwiaWRlbnRpZmllciIsInJlcGxhY2UiLCJhZGRUb0JsYWNrbGlzdCIsIlR5cGUiLCJ0eXBlIiwiTnVtYmVyIiwibnVtYmVyIiwicGFyc2VGbG9hdCIsIkludGVnZXIiLCJwYXJzZUludCIsIlRleHQiLCJ0ZXh0IiwiQm9vbGVhbiIsImJvb2wiLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJhcmciLCJoZWFkIiwidGVzdCIsInN1YnN0cmluZyIsIm1lbW9pemVkIiwiZGVmaW5lTWVtb2l6ZWQiLCJwcm9wZXJ0eSIsImdldHRlciIsImFwcGx5IiwiY29uZmlndXJhYmxlIiwiZ2V0IiwiZXhwcmVzc2lvbiIsInRoaW5nIiwicHJvcGVydHlfbmFtZXMiLCJyZXZlcnNlIiwic2VxdWVuY2UiLCJhc3NpZ25tZW50Iiwic2NvcGUiLCJwbHVyYWwiLCJ0b1VwcGVyQ2FzZSIsInZhbHVlcyIsImZpcnN0VmFsdWUiLCJpbmRleF9leHByZXNzaW9uIiwib3JkaW5hbCIsImEiLCJiIiwibGhzIiwicmhzIiwib3BlcmF0b3IiXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxtREFBMkMsY0FBYzs7QUFFekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7OztBQzdEQTs7OztBQUNBOzs7Ozs7QUFFQTtBQU5BO0FBQ0E7QUFDQTtBQUtBLElBQU1BLFNBQVMsc0JBQWY7a0JBQ2VBLE07O0FBRWY7O0FBQ0FDLE9BQU9ELE1BQVAsR0FBZ0JBLE1BQWhCLEM7Ozs7Ozs7Ozs7Ozs7cWpCQ1hBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUE7QUFDQSxJQUFJLENBQUNFLFFBQVFDLEtBQWIsRUFBb0JELFFBQVFDLEtBQVIsR0FBZ0JELFFBQVFFLEdBQXhCO0FBQ3BCLElBQUksQ0FBQ0YsUUFBUUcsUUFBYixFQUF1QkgsUUFBUUcsUUFBUixHQUFtQkgsUUFBUUUsR0FBM0I7O0lBRUZFLE07QUFJcEIsaUJBQVlDLFVBQVosRUFBd0I7QUFBQTs7QUFDdkJDLFNBQU9DLE1BQVAsQ0FBYyxJQUFkLEVB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IjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBpZGVudGl0eSBmdW5jdGlvbiBmb3IgY2FsbGluZyBoYXJtb255IGltcG9ydHMgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAxMik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay9ib290c3RyYXAgMmY2ZjZkMWI1ZTE0MTZkMTc3YTIiLCIvL1xuLy9cdCMgQ3JlYXRlIGEgYHBhcnNlcmAgc2luZ2xldG9uIHRvIHVzZSB0byBzZXQgdXAgcnVsZXMgYW5kIGR1cmluZyB0ZXN0cy5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5cbi8vIENyZWF0ZSBwYXJzZXIgaW5zdGFuY2UuXG5jb25zdCBwYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG53aW5kb3cucGFyc2VyID0gcGFyc2VyO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvX3BhcnNlci5qcyIsIi8vIFNwZWxsIFwiRW5nbGlzaFwiIHBhcnNlciBzdHJhd21hblxuXG4vLyBUT0RPOlx0YHRlc3RgIGZ1bmN0aW9uIGZvciBxdWljayBuby1nb29kIGhpdCBvbiBge2F9IGJsYWggYmxhaCB7Yn1gP1xuLy8gVE9ETzpcdHRoaXMgZG9lc24ndCB3b3JrOiAgIGB7ZXhwcmVzc2lvbn0gaXMge2V4cHJlc3Npb259YFxuLy8gVE9ETzpcdGJyZWFrIGBmaWxlYCBpbnRvIGxpbmVzIGFuZCBwcm9jZXNzIGVhY2ggKGluY2wuIHN1YnN0ci9tYXRjaCBub3QgZ29pbmcgYmV5b25kIHRoZSBlbmQpXG4vLyBUT0RPOlx0bmVzdGluZyAtLSBpcyB0aGlzIGp1c3QgaW5kZW50ID0gXCJhZGQgYmxvY2sgc2NvcGVcIlxuLy8gVE9ETzpcdHByb21vdGlvbiBwYXR0ZXJuIGZvciBnYXRoZXIgYXJndW1lbnRzIChlZzogbGl0ZXJhbC1saXN0KSA/Pz9cbi8vIFRPRE86XHRXaGF0IGRvZXMgc3ludGF4IHRyZWUgbG9vayBsaWtlPyAgSG93IGRvIHdlIGV4dHJhY3QgbWVhbmluZyBvdXQgb2YgdGhlIG5lc3Q/XG4vLyBUT0RPOlx0UGFzcyBgY29udGV4dGAgdG8gdG9Tb3VyY2UoKSwgYWRkIHByb3BlcnR5IGRlc2NyaXB0b3JzIHRvIGBjbGFzc2AsIHZhcmlhYmxlcyBhbmQgY29kZSB0byBgbWV0aG9kYCwgYGdsb2JhbGAgc3R1ZmYgZXRjXG5cbmltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gR1JSUi4uLiB3aWxsIFNPTUVPTkUgb24gdGhlIG5vZGUgdGVhbSBwbGVhc2UgaW1wbGVtZW50IGNvbnNvbGUuZ3JvdXAgPz8/XG5pZiAoIWNvbnNvbGUuZ3JvdXApIGNvbnNvbGUuZ3JvdXAgPSBjb25zb2xlLmxvZztcbmlmICghY29uc29sZS5ncm91cEVuZCkgY29uc29sZS5ncm91cEVuZCA9IGNvbnNvbGUubG9nO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYXJzZXIge1xuXHQvLyBTZXQgdG8gYHRydWVgIHRvIG91dHB1dCBkZWJ1ZyBpbmZvIHdoaWxlIGFkZGluZyBydWxlc1xuXHRzdGF0aWMgREVCVUcgPSBmYWxzZTtcblxuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblxuXHRcdC8vIENsb25lIHJ1bGVzLCBzdGFydGluZyB3aXRoIGEgY29tcGxldGVseSBlbXB0eSBtYXAgaWYgbm90IGRlZmluZWQgKG5vIHN0YW5kYXJkIG9iamVjdCBrZXlzKVxuXHRcdHRoaXMucnVsZXMgPSBPYmplY3QuY3JlYXRlKHRoaXMucnVsZXMgfHwgbnVsbCk7XG5cdH1cblxuXHRnZXRSdWxlKG5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlc1tuYW1lXTtcblx0fVxuXG4vL1xuLy8jIyMgUGFyc2luZ1xuLy9cblx0Ly8gUGFyc2UgYG5hbWVgZCBydWxlIGF0IGhlYWQgb2YgYHN0cmVhbWAgKGBzdHJpbmdgIG9yIGBUZXh0U3RyZWFtYCkuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cblx0cGFyc2UobmFtZSwgc3RyZWFtKSB7XG5cdFx0aWYgKHR5cGVvZiBzdHJlYW0gPT09IFwic3RyaW5nXCIpIHN0cmVhbSA9IG5ldyBUZXh0U3RyZWFtKHN0cmVhbSk7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUobmFtZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYHBhcnNlci5wYXJzZSgke25hbWV9KTogUnVsZSBub3QgZm91bmRgKTtcblx0XHRzdHJlYW0gPSB0aGlzLmVhdFdoaXRlc3BhY2Uoc3RyZWFtKTtcblx0XHRyZXR1cm4gcnVsZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHR9XG5cblx0Ly8gRWF0IHdoaXRlc3BhY2UgKGFjY29yZGluZyB0byBgcnVsZXMud2hpdGVzcGFjZWApIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBuZXcgc3RyZWFtIGlmIHdlIG1hdGNoZWQgd2hpdGVzcGFjZSwgb3RoZXJ3aXNlIHRoZSBzYW1lIHN0cmVhbS5cblx0ZWF0V2hpdGVzcGFjZShzdHJlYW0pIHtcblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5ydWxlcy53aGl0ZXNwYWNlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiBzdHJlYW07XG5cdFx0cmV0dXJuIHN0cmVhbS5hZHZhbmNlQnkocmVzdWx0Lm1hdGNoZWQubGVuZ3RoKTtcblx0fVxuXG5cdC8vIEFkZCBhIHJ1bGUgdG8gb3VyIGxpc3Qgb2YgcnVsZXMhXG5cdC8vIENvbnZlcnRzIHRvIGBhbHRlcm5hdGl2ZXNgIG9uIHJlLWRlZmluaW5nIHRoZSBzYW1lIHJ1bGUuXG5cdGFkZFJ1bGUobmFtZSwgcnVsZSkge1xuXHRcdGxldCBleGlzdGluZyA9IHRoaXMucnVsZXNbbmFtZV07XG5cdFx0aWYgKGV4aXN0aW5nKSB7XG5cdFx0XHRpZiAoIShleGlzdGluZyBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzKSkge1xuXHRcdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQ29udmVydGluZyBydWxlICcke25hbWV9JyB0byBhbHRlcm5hdGl2ZXNgKTtcblx0XHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVOYW1lOiBuYW1lLCBydWxlczogW2V4aXN0aW5nXSB9KTtcblx0XHRcdFx0Ly8gY29weSBhcmd1bWVudCBuYW1lIG92ZXIgKD8/Pylcblx0XHRcdFx0aWYgKGV4aXN0aW5nLmFyZ3VtZW50KSB0aGlzLnJ1bGVzW25hbWVdLmFyZ3VtZW50ID0gZXhpc3RpbmcuYXJndW1lbnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkaW5nIHJ1bGUgJyR7cnVsZS5ydWxlTmFtZX0nIHRvICcke25hbWV9JzogYCwgcnVsZSk7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdLmFkZFJ1bGUocnVsZSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0Ly8gZG9uJ3Qgb3ZlcnJpZGUgcnVsZU5hbWVcblx0XHRcdGlmICghcnVsZS5ydWxlTmFtZSkgcnVsZS5ydWxlTmFtZSA9IG5hbWU7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gcnVsZTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblxuXG4vL1xuLy8gIyMgVXRpbGl0eSBtZXRob2RzXG4vL1xuXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gXG5cdC8vXHRpbiBhcnJheSBvZiBgdG9rZW5zYCAoc3RyaW5ncykuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cblxuXHQvLyBMaXN0IG9mIHNwZWNpYWwgY2hhcmFjdGVycyBpbiByZWd1bGFyIGV4cHJlc3Npb25zLlxuXHQvLyBVc2VkIHRvIGVzY2FwZSB0aG9zZSBjaGFycyB3aGVuIGNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbnMgZnJvbSBzdHJpbmdzLlxuXHRzdGF0aWMgUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyA9IChmdW5jdGlvbigpIHtcblx0XHRjb25zdCBjaGFycyA9IHt9O1xuXHRcdFwiXFxcXC9eJCorPy4oKXx7fSxbXVwiLnNwbGl0KFwiXCIpLmZvckVhY2goY2hhciA9PiBjaGFyc1tjaGFyXSA9IHRydWUpO1xuXHRcdHJldHVybiBjaGFycztcblx0fSkoKVxuXG5cdC8vIEdpdmVuIGEgXCJub3JtYWxcIiBgc3RyaW5nYCwgZXNjYXBlIGFueSByZWd1bGFyIGV4cHJlc3Npb24gc3BlY2lhbCBjaGFyYWN0ZXJzXG5cdC8vXHRzbyB3ZSBjYW4gY3JlYXRlIGEgYG5ldyBSZWdFeHAoKWAuXG5cdC8vIEFsc28gY29udmVydHMgYSBzaW5nbGUgc3BhY2UgdG8gYXJiaXRyYXJ5IHNldCBvZiBzcGFjZXMgd2l0aCBcIlxccytcIlxuXHRzdGF0aWMgZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpIHtcblx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KFwiXCIpLm1hcChmdW5jdGlvbiAoY2hhciwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3IgYmFja3NsYXNoXG5cdFx0XHRpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIjtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igc3BhY2Vcblx0XHRcdGlmIChjaGFyID09PSBcIiBcIikgcmV0dXJuIFwiXFxcXHMrXCI7XG5cdFx0XHQvLyBJZiBhIHNwZWNpYWwgY2hhciBhbmQgcHJldmlvdXMgY2hhcmFjdGVyIHdhcyBub3QgYW4gZXNjYXBlLCBlc2NhcGUgdGhlIHJlc3VsdC5cblx0XHRcdGlmIChQYXJzZXIuUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSU1tjaGFyXSAmJiBsaXN0W2luZGV4LTFdICE9PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiK2NoYXI7XG5cdFx0XHQvLyBUaGlzIGNoYXIgc2hvdWxkIGJlIGZpbmUgYnkgaXRzZWxmLlxuXHRcdFx0cmV0dXJuIGNoYXI7XG5cdFx0fSkuam9pbihcIlwiKTtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyByZWd1bGFyIGV4cHJlc3Npb24gZnJvbSBhIFwibm9ybWFsXCIgc3RyaW5nLCBlc2NhcGluZyBzcGVjaWFsIGNoYXJhY3RlcnMgYXMgbmVjZXNzYXJ5LlxuXHRzdGF0aWMgUmVnRXhwRnJvbVN0cmluZyhzdHJpbmcsIGZsYWdzKSB7XG5cdFx0cmV0dXJuIG5ldyBSZWdFeHAoUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSwgZmxhZ3MpO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHN0cmVhbSwgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBzdHJlYW1gXHRcdFN0cmVhbSB3aGljaCB3YXMgbWF0Y2hlZCB3aXRoIGBzdGFydEluZGV4YCBhdCB0aGUgc3RhcnQgb2YgdGhlIG1hdGNoXG4vL1x0XHRcdC0gYGVuZEluZGV4YFx0Tm9uLWluY2x1c2l2ZSBlbmQgaW5kZXggaW4gc3RyZWFtIHdoZXJlIG1hdGNoIGVuZHMuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5hcmdzYFx0XHRcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZShjb250ZXh0KWBcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBSdWxlIHx8ICF0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShcImNvbnN0cnVjdG9yXCIpKSB7XG4vL2NvbnNvbGUud2FybihcIm5vdCBydWxlXCIsIHRoaXMpO1xuXHRcdH1cblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXHR9XG5cblx0Ly8gQ2xvbmUgdGhpcyBydWxlIGFuZCBhZGQgYW55IGBwcm9wc2AgcGFzc2VkIGluLlxuXHRjbG9uZSguLi5wcm9wcykge1xuXHRcdGxldCBjbG9uZSA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG5cdFx0T2JqZWN0LmFzc2lnbihjbG9uZSwgLi4ucHJvcHMpO1xuXHRcdHJldHVybiBjbG9uZTtcblx0fVxuXG5cdC8vIEZvciBhIHJ1bGUgaW5zdGFuY2UgYXNzb2NpYXRlZCB3aXRoIGEgc3RyZWFtLFxuXHQvLyByZXR1cm4gYSBuZXcgc3RyZWFtIEFGVEVSIHRoaXMgcnVsZSdzIGVuZC5cblx0bmV4dCgpIHtcblx0XHRpZiAoIXRoaXMuc3RyZWFtIHx8IHRoaXMuZW5kSW5kZXggPT09IHVuZGVmaW5lZClcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYHJ1bGUubmV4dCgpIGNhbGxlZCBvbiBydWxlIHdpdGhvdXQgYSBzdHJlYW1gLCB0aGlzKTtcblx0XHRyZXR1cm4gdGhpcy5zdHJlYW0uYWR2YW5jZVRvKHRoaXMuZW5kSW5kZXgpO1xuXHR9XG5cbi8vXG4vL1x0UGFyc2luZyBwcmltaXRpdmVzIC0tIHlvdSBNVVNUIGltcGxlbWVudCB0aGVzZSBpbiB5b3VyIHN1YmNsYXNzZXMhXG4vL1xuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBydWxlIGluIHRoZSBgc3RyZWFtYC5cblx0Ly8gUmV0dXJucyByZXN1bHRzIG9mIHRoZSBwYXJzZSBvciBgdW5kZWZpbmVkYC5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gSXMgdGhpcyBydWxlIGRldGVybWluaXN0aWMsIGVnOiBjYW4gaXQgYmUgcXVpY2tseSBhbmQgdW5hbWJpZ3VvdXNseSBzYXRpc2ZpZWQ/XG5cdC8vIFJldHVybmluZyBgdHJ1ZWAgY2FuIHNwZWVkIHVwIHNlcXVlbmNlIHByb2Nlc3NpbmcsXG5cdC8vXHRidXQgaWYgeW91J3JlIHJlYWxseSBub3Qgc3VyZSwgcmV0dXJuIGB1bmRlZmluZWRgLlxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cbi8vXG4vLyAjIyBvdXRwdXQgYXMgc291cmNlXG4vL1xuXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBOT1RFOiB5b3UgbWF5IHdhbnQgdG8gbWVtb2l6ZSB0aGUgYXJncy5cblx0Z2V0IGFyZ3MoKSB7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvLyBPdXRwdXQgdmFsdWUgZm9yIHRoaXMgSU5TVEFOVElBVEVEIHJ1bGUgYXMgc291cmNlLlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG5cblxuXG5cbi8vIFJlZ2V4IHBhdHRlcm4uXG4vLyBgcnVsZS5wYXR0ZXJuYCBpcyB0aGUgcmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoLlxuLy9cbi8vIE5PVEVcdFRvIG1ha2UgdGhpcyBtb3JlIGdlbmVyYWxseSBhcHBsaWNhYmxlLCBkbyBOT1Qgc3RhcnQgdGhlIHBhdHRlcm4gd2l0aCBhIGBeYC5cbi8vXHRcdFdlJ2xsIGF1dG9tYXRpY2FsbHkgbWFrZSBhIGNvcHkgb2YgdGhlIFJlZ0V4cCB3aXRoIHRoZSBzdGFydCBwb2ludCBhdHRhY2hlZFxuLy9cdFx0YW5kIHVzZSB0aGF0IGFzIGFwcHJvcHJpYXRlLlxuLy9cbi8vXHRcdFRoaXMgd2F5IHdlIGNhbiByZS11c2UgdGhlIHJlZ2V4IHRvIGNoZWNrIGZvciBhIG1hdGNoIGluIHRoZSBtaWRkbGUgb2YgdGhlIHN0cmVhbS4uLlxuLy9cbi8vIFlvdSBjYW4gb3B0aW9uYWxseSBzcGVjaWZ5IGEgYHJ1bGUuYmxhY2tsaXN0YCwgYSBzZXQgb2YgbWF0Y2hlcyB3aGljaCB3aWxsIHNwZWNpZmljYWxseSBOT1Qgd29yayxcbi8vXHRlZyBmb3IgYGlkZW50aWZpZXIuXG5SdWxlLlBhdHRlcm4gPSBjbGFzcyBQYXR0ZXJuIGV4dGVuZHMgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgcGF0dGVybmAgaXMgcmVxdWlyZWRcblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLlBhdHRlcm4oKTogWW91IG11c3QgcGFzcyBhIGBwYXR0ZXJuYCBwYXJhbWV0ZXJcIik7XG5cblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblxuXHRcdC8vIENyZWF0ZSBhIGBzdGFydFBhdHRlcm5gIHRvIG1hdGNoIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cm9uZ1xuXHRcdC8vIENyZWF0ZSBub24tZW51bWVyYWJseS5cblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJzdGFydFBhdHRlcm5cIiwgeyB2YWx1ZTogbmV3IFJlZ0V4cChcIl5cIiArIHRoaXMucGF0dGVybi5zb3VyY2UpIH0pO1xuXHR9XG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHBhdHRlcm4gYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBtYXRjaCA9IHN0cmVhbS5tYXRjaCh0aGlzLnN0YXJ0UGF0dGVybik7XG5cdFx0aWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGJhaWwgaWYgcHJlc2VudCBpbiBibGFja2xpc3Rcblx0XHRsZXQgbWF0Y2hlZCA9IG1hdGNoWzBdO1xuXHRcdGlmICh0aGlzLmJsYWNrbGlzdCAmJiB0aGlzLmJsYWNrbGlzdFttYXRjaGVkXSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXggKyBtYXRjaGVkLmxlbmd0aCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUGF0dGVybnMgYXJlIEFMV0FZUyBkZXRlcm1pbmlzdGljLlxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGFkZFRvQmxhY2tsaXN0KC4uLndvcmRzKSB7XG5cdFx0aWYgKCF0aGlzLmJsYWNrbGlzdCkgdGhpcy5ibGFja2xpc3QgPSB7fTtcblx0XHR3b3Jkcy5mb3JFYWNoKHdvcmQgPT4gdGhpcy5ibGFja2xpc3Rbd29yZF0gPSB0cnVlKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm4uc291cmNlO1xuXHR9XG59XG5cbi8vIFJ1bGUgZm9yIGxpdGVyYWwgc3RyaW5nIHZhbHVlLCB3aGljaCBpbmNsdWRlIHB1bmN0dWF0aW9uIHN1Y2ggYXMgYChgIGV0Yy5cbi8vIGBTeW1ib2xgcyBhcmUgZGlmZmVyZW50IGZyb20gYEtleXdvcmRzYCBpbiB0aGF0IHRoZXkgZG8gbm90IHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5LlxuLy9UT0RPOiByZW5hbWUgYFN5bWJvbGA/Pz9cblJ1bGUuU3ltYm9sID0gY2xhc3MgU3ltYm9sIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLlN5bWJvbCgpOiBFeHBlY3RlZCBzdHJpbmcgcHJvcGVydHlcIik7XG5cblx0XHQvLyBjb252ZXJ0IHN0cmluZyB0byBwYXR0ZXJuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdHByb3BlcnRpZXMucGF0dGVybiA9IFBhcnNlci5SZWdFeHBGcm9tU3RyaW5nKHByb3BlcnRpZXMuc3RyaW5nKTtcbi8vY29uc29sZS5pbmZvKHByb3BlcnRpZXMuc3RyaW5nLCBwcm9wZXJ0aWVzLnBhdHRlcm4pO1xuXHRcdH1cblxuLy9cdFx0Y29uc29sZS5pbmZvKFwiY3JlYXRpbmcgc3RyaW5nXCIsIHByb3BlcnRpZXMpO1xuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHR9XG5cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG4vLyBNZXJnZSB0d28gU3ltYm9sIHJ1bGVzIHRvZ2V0aGVyLCByZXR1cm5pbmcgYSBuZXcgcnVsZSB0aGF0IG1hdGNoZXMgYm90aC5cblJ1bGUubWVyZ2VTeW1ib2xzID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuXHRyZXR1cm4gbmV3IFJ1bGUuU3ltYm9sKHsgc3RyaW5nOiBmaXJzdC5zdHJpbmcgKyBzZWNvbmQuc3RyaW5nIH0pO1xufVxuXG4vLyBLZXl3b3JkIHBhdHRlcm4uXG4vLyBQcm9wZXJ0aWVzOlxuLy9cdC0gYHJ1bGUuc3RyaW5nYCBcdChyZXF1aXJlZCkgXHRLZXl3b3JkIHN0cmluZyB0byBtYXRjaC5cbi8vXHQtIGBydWxlLnBhdHRlcm5gXHQob3B0aW9uYWwpIFx0UmVnRXhwIGZvciB0aGUgbWF0Y2guXG4vL1x0XHRcdFx0XHRcdFx0XHRcdFdlJ2xsIGNyZWF0ZSBvbmUgZnJvbSBgc3RyaW5nYCBpZiBuZWNlc3NhcnkuXG4vL1x0XHRcdFx0XHRcdFx0XHRcdE5PVEU6IGRvIE5PVCBzdGFydCB0aGUgYHBhdHRlcm5gIHdpdGggYF5gLlxuUnVsZS5LZXl3b3JkID0gY2xhc3MgS2V5d29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgc3RyaW5nYCBpcyByZXF1aWVkLlxuXHRcdGlmICghcHJvcGVydGllcy5zdHJpbmcpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5LZXl3b3JkKCk6IEV4cGVjdGVkIHN0cmluZyBwcm9wZXJ0eVwiKTtcblxuXHRcdC8vIGRlcml2ZSBgcGF0dGVybmAgaWYgbmVjZXNzYXJ5LlxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB7XG5cdFx0XHQvLyBlbmZvcmNlIHdvcmQgYm91bmRhcmllcyBhbmQgYWxsb3cgYXJiaXRyYXJ5IHNwYWNlIGJldHdlZW4gd29yZHNcblx0XHRcdGxldCBwYXR0ZXJuU3RyaW5nID0gUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMocHJvcGVydGllcy5zdHJpbmcpO1xuXHRcdFx0cHJvcGVydGllcy5wYXR0ZXJuID0gbmV3IFJlZ0V4cChcIlxcXFxiXCIgKyBwYXR0ZXJuU3RyaW5nICsgXCJcXFxcYlwiKTtcblx0XHR9XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cbi8vIE1lcmdlIHR3byBLZXl3b3JkIHJ1bGVzIHRvZ2V0aGVyLCBhZGRpbmcgdGhlIHNlY29uZCB0byB0aGUgZmlyc3QuXG5SdWxlLm1lcmdlS2V5d29yZHMgPSBmdW5jdGlvbihmaXJzdCwgc2Vjb25kKSB7XG5cdHJldHVybiBuZXcgUnVsZS5LZXl3b3JkKHsgc3RyaW5nOiBmaXJzdC5zdHJpbmcgKyBcIiBcIiArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cblxuLy8gU3VicnVsZSAtLSBuYW1lIG9mIGFub3RoZXIgcnVsZSB0byBiZSBjYWxsZWQuXG4vLyBgcnVsZS5ydWxlYCBpcyB0aGUgbmFtZSBvZiB0aGUgcnVsZSBpbiBgcGFyc2VyLnJ1bGVzYC5cblJ1bGUuU3VicnVsZSA9IGNsYXNzIFN1YnJ1bGUgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlKHRoaXMucnVsZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEF0dGVtcHRpbmcgdG8gcGFyc2UgdW5rbm93biBydWxlICcke3RoaXMucnVsZX0nYCk7XG5cdFx0bGV0IHJlc3VsdCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIHJlc3VsdC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGUodGhpcy5ydWxlKTtcblx0XHRpZiAoIXJ1bGUpIHJldHVybiBmYWxzZTtcblx0XHRyZXR1cm4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHtcblxuXHQvLyBJcyB0aGlzIGRldGVybWluaXN0aWMsIGVnOiBhcmUgb3VyIHN1YnJ1bGVzIHVuYW1iaWdvdXNseSBkZXRlcm1pbmFibGU/XG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzLmV2ZXJ5KHJ1bGUgPT4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pKTtcblx0fVxufVxuXG5cbi8vIFNlcXVlbmNlIG9mIHJ1bGVzIHRvIG1hdGNoIChhdXRvLWV4Y2x1ZGluZyB3aGl0ZXNwYWNlKS5cblJ1bGUuU2VxdWVuY2UgPSBjbGFzcyBTZXF1ZW5jZSBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcmVzdWx0cyA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IHJlc3VsdCA9IHJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghcmVzdWx0ICYmICFydWxlLm9wdGlvbmFsKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKHJlc3VsdCkge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2gocmVzdWx0KTtcblx0XHRcdFx0bmV4dCA9IHJlc3VsdC5uZXh0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGlmIHdlIGdldCBoZXJlLCB3ZSBtYXRjaGVkIGFsbCB0aGUgcnVsZXMhXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkOiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuLy9UT0RPQ1xuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGB2YWx1ZXNgIGFycmF5IGluZGV4ZWQgYnlcblx0Ly9cdFx0LSBgcmVzdWx0cy5hcmd1bWVudGA6XHRcdGFyZ3VtZW50IHNldCB3aGVuIHJ1bGUgd2FzIGRlY2xhcmVkLCBlZzogYHt2YWx1ZTpsaXRlcmFsfWAgPT4gYHZhbHVlYFxuXHQvL1x0XHQtIGByZXN1bHRzLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIGBydWxlIHR5cGVgOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSBhcmdzLlxuXHRnZXQgYXJncygpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRpZiAoIXRoaXMuX2FyZ3MpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5fYXJncyA9IHt9O1xuXHRcdFx0Zm9yIChsZXQgcmVzdWx0IG9mIHRoaXMucmVzdWx0cykge1xuXHRcdFx0XHRsZXQgYXJnTmFtZSA9IHJlc3VsdC5hcmd1bWVudCB8fCByZXN1bHQucnVsZU5hbWUgfHwgcmVzdWx0LmNvbnN0cnVjdG9yLm5hbWU7XG5cblx0XHRcdFx0Ly8gSWYgYXJnIGFscmVhZHkgZXhpc3RzLCBjb252ZXJ0IHRvIGFuIGFycmF5XG5cdFx0XHRcdGlmIChhcmdOYW1lIGluIGFyZ3MpIHtcblx0XHRcdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkoYXJnc1thcmdOYW1lXSkpIGFyZ3NbYXJnTmFtZV0gPSBbYXJnc1thcmdOYW1lXV07XG5cdFx0XHRcdFx0YXJnc1thcmdOYW1lXS5wdXNoKHJlc3VsdCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0YXJnc1thcmdOYW1lXSA9IHJlc3VsdDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5fYXJncztcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnJ1bGVzLmpvaW4oXCIgXCIpfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cblxufVxuXG4vLyBTeW50YWN0aWMgc3VnYXIgZm9yIGRlYnVnZ2luZ1xuUnVsZS5FeHByZXNzaW9uID0gY2xhc3MgZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICh0aGlzLmRvbnRSZWN1cnNlKSB7XG4vL2NvbnNvbGUud2FybihcIk5PVCByZWN1cnNpbmcgaW50byBcIiwgdGhpcyk7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHQvLyBJZiB0aGUgZXhwcmVzc2lvbiBpcyBsZWZ0UmVjdXJzaXZlLCBzZXQgYSBmbGFnIHNvIHdlIGRvbid0IGF0dGVtcHQgdG8gcmVjdXJzZSBpbnRvIGl0IGFnYWluLlxuLy9UT0RPOiB0aGlzIGlzIGRhbmdlcm91czogYW4gZXhjZXB0aW9uIHdpbGwgbGVhdmUgdGhlIGZsYWcgc2V0Li4uXG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0dGhpcy5kb250UmVjdXJzZSA9IHRydWU7XG4vL2NvbnNvbGUud2FybihcIlNldHRpbmcgZG9udFJlY3Vyc2UgZm9yXCIsIHRoaXMpO1xuXHRcdH1cblx0XHRsZXQgcmVzdWx0ID0gc3VwZXIucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIGRlbGV0ZSB0aGlzLmRvbnRSZWN1cnNlO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cbn1cblxuXG4vLyBTdGF0ZW1lbnRzIHRha2UgdXAgdGhlIGVudGlyZSBsaW5lLlxuUnVsZS5TdGF0ZW1lbnQgPSBjbGFzcyBzdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gQWx0ZXJuYXRpdmUgc3ludGF4LCBtYXRjaGluZyBvbmUgb2YgYSBudW1iZXIgb2YgZGlmZmVyZW50IHJ1bGVzLlxuLy8gVGhlIHJlc3VsdCBvZiBhIHBhcnNlIGlzIHRoZSBsb25nZXN0IHJ1bGUgdGhhdCBhY3R1YWxseSBtYXRjaGVkLlxuLy8gTk9URTogQ3VycmVudGx5IHRha2VzIHRoZSBsb25nZXN0IHZhbGlkIG1hdGNoLlxuLy8gVE9ETzogbWF0Y2ggYWxsIHZhbGlkIGFsdGVybmF0aXZlc1xuLy8gVE9ETzogcmVuYW1lP1xuUnVsZS5BbHRlcm5hdGl2ZXMgPSBjbGFzcyBBbHRlcm5hdGl2ZXMgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpO1xuXHRcdGlmICghdGhpcy5ydWxlcykgdGhpcy5ydWxlcyA9IFtdO1xuXHR9XG5cblx0Ly8gRmluZCB0aGUgTE9OR0VTVCBtYXRjaFxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBiZXN0TWF0Y2g7XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKTtcblx0XHRcdGlmICghbWF0Y2gpIGNvbnRpbnVlO1xuXG5cdFx0XHQvLyB0YWtlIHRoZSBsb25nZXN0IG1hdGNoXG5cdFx0XHRpZiAoIWJlc3RNYXRjaCB8fCBtYXRjaC5lbmRJbmRleCA+IGJlc3RNYXRjaC5lbmRJbmRleClcblx0XHRcdFx0YmVzdE1hdGNoID0gbWF0Y2g7XG5cdFx0fVxuXHRcdGlmICghYmVzdE1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYXNzaWduIGBhcmdOYW1lYCBvciBgcnVsZU5hbWVgIGZvciBgYXJnc2Bcblx0XHRpZiAodGhpcy5hcmd1bWVudCkgYmVzdE1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRlbHNlIGlmICh0aGlzLnJ1bGVOYW1lKSBiZXN0TWF0Y2gucnVsZU5hbWUgPSB0aGlzLnJ1bGVOYW1lO1xuLy9UT0RPOiBvdGhlciB0aGluZ3MgdG8gY29weSBoZXJlPz8/XG5cdFx0cmV0dXJuIGJlc3RNYXRjaDtcblx0fVxuXG5cdGFkZFJ1bGUocnVsZSkge1xuXHRcdHRoaXMucnVsZXMucHVzaChydWxlKTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnRvU291cmNlKGNvbnRleHQpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAoJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGVzLmpvaW4oXCJ8XCIpfSkke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuLy8gUmVwZWF0aW5nIHJ1bGUuXG4vL1x0YHRoaXMucnVsZWAgaXMgdGhlIHJ1bGUgdGhhdCByZXBlYXRzLlxuLy9cbi8vIEFmdGVyIG1hdGNoaW5nOlxuLy9cdGB0aGlzLnJlc3VsdHNgIGlzIGFycmF5IG9mIHJlc3VsdHMgb2YgbWF0Y2hlcy5cbi8vXG4vL1x0QXV0b21hdGljYWxseSBjb25zdW1lcyB3aGl0ZXNwYWNlIGJlZm9yZSBydWxlcy5cbi8vXHRJZiBkb2Vzbid0IG1hdGNoIGF0IGxlYXN0IG9uZSwgcmV0dXJucyBgdW5kZWZpbmVkYC5cblJ1bGUuUmVwZWF0ID0gY2xhc3MgUmVwZWF0IGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBuZXh0ID0gc3RyZWFtO1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghcmVzdWx0KSBicmVhaztcblxuXHRcdFx0cmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBSZXR1cm5zIGFuIGFycmF5IHdpdGggYXJndW1lbnRzIG9mIGFsbCByZXN1bHRzLlxuXHQvLyBOT1RFOiBtZW1vaXplcyB0aGUgYXJncy5cblx0Z2V0IGFyZ3MoKSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuX2FyZ3MgfHwgKHRoaXMuX2FyZ3MgPSB0aGlzLnJlc3VsdHMubWFwKCByZXN1bHQgPT4gcmVzdWx0LmFyZ3MgKSk7XG5cblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdHRocm93IFwiRG9uJ3QgdW5kZXJzdGFuZCBob3cgdG8gc291cmNlIFJ1bGUuUmVwZWF0IVwiO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0Y29uc3QgcnVsZSA9ICh0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlIHx8IHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiB0aGlzLnJ1bGUuc3RyaW5nLmluY2x1ZGVzKFwiIFwiKVxuXHRcdFx0XHQgICA/IGAoJHt0aGlzLnJ1bGV9KWBcblx0XHRcdFx0ICAgOiBgJHt0aGlzLnJ1bGV9YFxuXHRcdFx0XHQpO1xuXHRcdHJldHVybiBgJHtydWxlfSR7dGhpcy5vcHRpb25hbCA/ICcqJyA6ICcrJ31gO1xuXHR9XG59XG5cblxuLy8gTGlzdCBtYXRjaCBydWxlOiAgIGBbPGl0ZW0+PGRlbGltaXRlcj5dYC4gZWdcIiBgW3tudW1iZXJ9LF1gIHRvIG1hdGNoIGAxLDIsM2Bcbi8vXHRgcnVsZS5pdGVtYCBpcyB0aGUgcnVsZSBmb3IgZWFjaCBpdGVtLFxuLy9cdGBydWxlLmRlbGltaXRlcmAgaXMgdGhlIGRlbGltaXRlciBiZXR3ZWVuIGVhY2ggaXRlbS5cbi8vIFx0YHJ1bGUucmVzdWx0c2AgaW4gdGhlIG91dHB1dCBpcyB0aGUgbGlzdCBvZiB2YWx1ZXMuXG4vL1xuLy9cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGEgTGlzdCBydWxlIHdpbGwgTk9UIHJlcGVhdCAoPz8/PylcblJ1bGUuTGlzdCA9IGNsYXNzIExpc3QgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHQvLyBlbnN1cmUgaXRlbSBhbmQgZGVsaW1pdGVyIGFyZSBvcHRpb25hbCBzbyB3ZSBkb24ndCBiYXJmIGluIGBwYXJzZVJ1bGVgXG5cdFx0dGhpcy5pdGVtLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR0aGlzLmRlbGltaXRlci5vcHRpb25hbCA9IHRydWU7XG5cblx0XHRsZXQgcmVzdWx0cyA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHQvLyBnZXQgbmV4dCBpdGVtLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGl0ZW0gPSB0aGlzLml0ZW0ucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghaXRlbSkgYnJlYWs7XG4vL2NvbnNvbGUubG9nKGl0ZW0pO1xuXHRcdFx0cmVzdWx0cy5wdXNoKGl0ZW0pO1xuXHRcdFx0bmV4dCA9IGl0ZW0ubmV4dCgpO1xuXG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHQvLyBnZXQgZGVsaW1pdGVyLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGRlbGltaXRlciA9IHRoaXMuZGVsaW1pdGVyLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0ID0gZGVsaW1pdGVyLm5leHQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiByZXN1bHRzWzBdID8gcmVzdWx0c1swXS5zdGFydEluZGV4IDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gbWF0Y2hlZCBpdGVtIGJ5IGluZGV4XG5cdGdldEl0ZW0oaW5kZXgpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzW2luZGV4XTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcdFx0Ly8gVE9ETzogdGhyb3c/Pz9cblx0XHRsZXQgcmVzdWx0cyA9IHRoaXMucmVzdWx0cy5tYXAoIHJlc3VsdCA9PiByZXN1bHQudG9Tb3VyY2UoY29udGV4dCkgKS5qb2luKFwiLCBcIik7XG5cdFx0cmV0dXJuIGBbJHtyZXN1bHRzfV1gO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiaW1wb3J0IHsgZGVmaW5lTWVtb2l6ZWQgfSBmcm9tIFwiLi9tZW1vaXplLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyByZS1leHBvcnQgUnVsZSBmb3IgdGVzdGluZ1xuZXhwb3J0IGRlZmF1bHQgUnVsZTtcblxuLy9cbi8vXHQjIFBhcnNpbmcgYHJ1bGVTeW50YXhgIHRvIGNyZWF0ZSBydWxlcyBhdXRvbWF0aWNhbGx5LlxuLy9cbi8vIFRPRE86XHRQdWxsIGBwYXJzZVJ1bGVTeW50YXhgIHN0dWZmIG91dCBpbnRvIHNlcGFyYXRlIG1vZHVsZT9cbi8vIFRPRE86XHRCZXR0ZXIgbmFtZSBmb3IgYHJ1bGVTeW50YXhgXG4vLyBUT0RPOlx0VXNlIGtleXdvcmRzIGluIHN5bnRheCB0byBtYWtlIGEgcXVpY2sgcmVnZXgtYmFzZWQgYHRlc3RgIGZ1bmN0aW9uIGZvciB0aGUgZW50aXJlIHJ1bGVcbk9iamVjdC5hc3NpZ24oUnVsZSwge1xuXG4vL1xuLy8gIyMgZ3JvdXA6IHBhcnNpbmcgc3ludGF4XG4vL1xuXG4vLyBUT0RPOiBjb252ZXJ0IHRvIFRleHRTdHJlYW0gcGF0dGVybiBhbGEgbm9ybWFsIHBhcnNlciBvbmNlIHRoYXQgc2V0dGxlcyBkb3duPz8/XG5cdHBhcnNlUnVsZVN5bnRheChzeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0bGV0IHN5bnRheFN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCk7XG5cdFx0bGV0IHJ1bGVzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgW10pO1xuXG5cdFx0bGV0IHJ1bGU7XG5cdFx0Ly8gSWYgd2Ugb25seSBnb3Qgb25lIHRoaW5nLCByZXR1cm4gdGhhdCBhcyB0aGUgcmVzdWx0XG5cdFx0aWYgKHJ1bGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cnVsZSA9IHJ1bGVzWzBdO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgU2VxdWVuY2VDb25zdHJ1Y3Rvcih7IHJ1bGVzIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9LFxuXG5cdHRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpIHtcblx0XHRjb25zdCBTWU5UQVhfRVhQUkVTU0lPTiA9IC8oPzpbXFx3XFwtXSt8XFxcXFtcXFtcXChcXHtcXClcXH1cXF1dfFteXFxzXFx3XXxcXHwpL2c7XG5cdFx0dmFyIHN5bnRheFN0cmVhbSA9IHN5bnRheC5tYXRjaChTWU5UQVhfRVhQUkVTU0lPTik7XG5cdFx0aWYgKCFzeW50YXhTdHJlYW0pIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgdG9rZW5pemUgcGFyc2UgcnVsZSBzeW50YXggPj4ke3N5bnRheH08PGApO1xuXHRcdHJldHVybiBzeW50YXhTdHJlYW07XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBsYXN0SW5kZXggPSBzeW50YXhTdHJlYW0ubGVuZ3RoO1xuXHRcdHdoaWxlIChzdGFydEluZGV4IDwgbGFzdEluZGV4KSB7XG5cdFx0XHRsZXQgWyBydWxlLCBlbmRJbmRleCBdID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRpZiAocnVsZSkge1xuXHRcdFx0XHR2YXIgbGFzdCA9IHJ1bGVzW3J1bGVzLmxlbmd0aC0xXTtcblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBTdHJpbmdgIGFuZCBsYXN0IHdhcyBhIGBTdHJpbmdgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5TeW1ib2wgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sKSB7XG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBsYXN0IHJ1bGVcblx0XHRcdFx0XHRydWxlcy5wb3AoKTtcblx0XHRcdFx0XHQvLyBhbmQgcmVwbGFjZSB3aXRoIGEgcnVsZSB0aGF0IG1lcmdlcyB0aGUga2V5d29yZHNcblx0XHRcdFx0XHRydWxlID0gUnVsZS5tZXJnZVN5bWJvbHMobGFzdCwgcnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBLZXl3b3JkYCBhbmQgbGFzdCB3YXMgYWxzbyBhIGBLZXl3b3JkYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0ZWxzZSBpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQpIHtcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuXHRcdFx0XHRcdC8vIGFuZCByZXBsYWNlIHdpdGggYSBydWxlIHRoYXQgbWVyZ2VzIHRoZSBrZXl3b3Jkc1xuXHRcdFx0XHRcdHJ1bGUgPSBSdWxlLm1lcmdlS2V5d29yZHMobGFzdCwgcnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cnVsZXMucHVzaChydWxlKTtcblx0XHRcdH1cblx0XHRcdHN0YXJ0SW5kZXggPSBlbmRJbmRleCArIDE7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlcztcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDApIHtcblx0XHR2YXIgc3ludGF4VG9rZW4gPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHQvLyBpZiB3ZSBnb3QgYSBcIlxcXFxcIiAod2hpY2ggYWxzbyBoYXMgdG8gZ28gaW50byB0aGUgc291cmNlIHN0cmluZyBhcyBcIlxcXFxcIilcblx0XHQvLyB0cmVhdCB0aGUgbmV4dCB0b2tlbiBhcyBhIGxpdGVyYWwgc3RyaW5nIHJhdGhlciB0aGFuIGFzIGEgc3BlY2lhbCBjaGFyYWN0ZXIuXG5cdFx0aWYgKHN5bnRheFRva2VuID09PSBcIlxcXFxcIikge1xuXHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ICsgMSk7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChzeW50YXhUb2tlbikge1xuXHRcdFx0Y2FzZSBcIntcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIihcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCJbXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIqXCI6XG5cdFx0XHRjYXNlIFwiK1wiOlxuXHRcdFx0Y2FzZSBcIj9cIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cblx0XHRcdC8vIHRoZSBmb2xsb3dpbmcgc2hvdWxkIEFMV0FZUyBiZSBjb25zdW1lZCBieSB0aGUgYWJvdmVcblx0XHRcdGNhc2UgXCJ9XCI6XG5cdFx0XHRjYXNlIFwiKVwiOlxuXHRcdFx0Y2FzZSBcIl1cIjpcblx0XHRcdGNhc2UgXCJ8XCI6XG5cdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCAke3N5bnRheFRva2VufSBmb3VuZCBhcyBpdGVtICR7c3RhcnRJbmRleH0gb2YgJHt0aGlzLnN5bnRheH1gKTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0dmFyIHN0cmluZyA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XSwgcnVsZTtcblx0XHQvLyBJZiBsZXR0ZXJzIG9ubHksIG1hdGNoIGFzIGEgS2V5d29yZCAoc28gd2UgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkgYWZ0ZXIgdGhlIHN0cmluZykuXG5cdFx0aWYgKHN0cmluZy5tYXRjaCgvW0EtWmEtel0rLykpIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5LZXl3b3JkKHsgc3RyaW5nIH0pO1xuXHRcdH1cblx0XHQvLyBPdGhlcndpc2UgbWF0Y2ggYXMgYSBTdHJpbmcsIHdoaWNoIGRvZXNuJ3QgcmVxdWlyZSBub24td29yZCBjaGFycyBhZnRlciB0aGUgdGV4dC5cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5TeW1ib2woeyBzdHJpbmc6IHN0cmluZyB9KTtcblx0XHRcdC8vIElmIHN0cmluZyBzdGFydHMgd2l0aCBgXFxcXGAsIGl0J3MgYW4gZXNjYXBlZCBsaXRlcmFsIChlZzogYFxcW2AgbmVlZHMgdG8gaW5wdXQgYXMgYFxcXFxbYCkuXG5cdFx0XHRpZiAoc3RyaW5nLnN0YXJ0c1dpdGgoXCJcXFxcXCIpKSB7XG5cdFx0XHRcdC8vIHJlbW92ZSBsZWFkaW5nIHNsYXNoIGluIG1hdGNoIHN0cmluZy4uLlxuXHRcdFx0XHRydWxlLnN0cmluZyA9IHJ1bGUuc3RyaW5nLnN1YnN0cigxKTtcblx0XHRcdFx0Ly8gYnV0IGxlYXZlIGl0IGluIHRvU3RyaW5nXG5cdFx0XHRcdHJ1bGUudG9TdHJpbmcgPSAoKSA9PiBzdHJpbmc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBbIHJ1bGUsIHN0YXJ0SW5kZXggXTtcblx0fSxcblxuXG5cdC8vIE1hdGNoIGdyb3VwaW5nIGV4cHJlc3Npb24gYCguLi58Li4uKWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHQvLyBOT1RFOiBuZXN0ZWQgcGFyZW5zIG1heSBub3QgaGF2ZSBhbHRlcm5hdGl2ZXMuLi4gOi0oICAgYChhfChifGMpKWAgd29uJ3Qgd29yaz8/P1xuXHRwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIihcIiwgXCIpXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0Ly8gcHVsbCBvdXQgZXhwbGljaXQgYXJndW1lbnQgbmFtZVxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdC8vIHNwbGl0IGludG8gZ3JvdXBzLCBpbmNsdWRpbmcgbmVzdGVkIHBhcmVuc1xuXHRcdGxldCBhbHRlcm5hdGl2ZXMgPVxuXHRcdFx0Z3JvdXBBbHRlcm5hdGl2ZXMoc2xpY2UpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0XHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKGdyb3VwLCBbXSk7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHRzWzBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdGxldCBydWxlID0gYWx0ZXJuYXRpdmVzLmxlbmd0aCA9PT0gMSA/IGFsdGVybmF0aXZlc1swXSA6IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVzOiBhbHRlcm5hdGl2ZXMgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblxuXHRcdGZ1bmN0aW9uIGdyb3VwQWx0ZXJuYXRpdmVzKHRva2Vucykge1xuXHRcdFx0dmFyIGFsdGVybmF0aXZlcyA9IFtdO1xuXHRcdFx0dmFyIGN1cnJlbnQgPSBbXTtcblx0XHRcdGZvciAodmFyIGkgPSAwLCB0b2tlbjsgdG9rZW4gPSB0b2tlbnNbaV07IGkrKykge1xuXHRcdFx0XHQvLyBoYW5kbGUgYWx0ZXJuYXRlIG1hcmtlclxuXHRcdFx0XHRpZiAodG9rZW4gPT09IFwifFwiKSB7XG5cdFx0XHRcdFx0YWx0ZXJuYXRpdmVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGhhbmRsZSBuZXN0ZWQgcGFyZW5zXG5cdFx0XHRcdGVsc2UgaWYgKHRva2VuID09PSBcIihcIikge1xuXHRcdFx0XHRcdGxldCB7IGVuZEluZGV4IH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmRJbmRleCArIDEpKTtcblx0XHRcdFx0XHRpID0gZW5kSW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3VycmVudC5wdXNoKHRva2VuKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGN1cnJlbnQubGVuZ3RoKSBhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdHJldHVybiBhbHRlcm5hdGl2ZXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIHJlcGVhdCBpbmRpY2F0b3IgYD9gLCBgK2Agb3IgYCpgIGJ5IGF0dGFjaGluZyBpdCB0byB0aGUgcHJldmlvdXMgcnVsZS5cblx0cGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0dmFyIHN5bWJvbCA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblx0XHR2YXIgcnVsZSA9IHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBhdHRhY2ggcmVwZWF0IHN5bWJvbCAke3N5bWJvbH0gdG8gZW1wdHkgcnVsZSFgKTtcblxuXHRcdC8vIFRyYW5zZm9ybSBsYXN0IHJ1bGUgaW50byBhIHJlcGVhdCBmb3IgYCpgIGFuZCBgK2AuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCIqXCIgfHwgc3ltYm9sID09PSBcIitcIikge1xuXHRcdFx0bGV0IGFyZ3VtZW50ID0gcnVsZS5hcmd1bWVudDtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5SZXBlYXQoeyBydWxlIH0pO1xuXHRcdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0XHQvLyBwdXNoIGludG8gcnVsZSBzdGFjayBpbiBwbGFjZSBvZiBvbGQgcnVsZVxuXHRcdFx0cnVsZXNbcnVsZXMubGVuZ3RoIC0gMV0gPSBydWxlO1xuXHRcdH1cblxuXHRcdC8vIFJ1bGUgaXMgb3B0aW9uYWwgZm9yIGA/YCBhbmQgYCpgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiP1wiIHx8IHN5bWJvbCA9PT0gXCIqXCIpIHtcblx0XHRcdHJ1bGUub3B0aW9uYWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBbIHVuZGVmaW5lZCwgc3RhcnRJbmRleCBdXG5cdH0sXG5cblx0Ly8gTWF0Y2ggYHs8cnVsZU5hbWU+fWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IG1hdGNoID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIntcIiwgXCJ9XCIsIHN0YXJ0SW5kZXgpO1xuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID09PSAzICYmIG1hdGNoLnNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBtYXRjaC5zbGljZVswXTtcblx0XHRcdG1hdGNoLnNsaWNlID0gbWF0Y2guc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPiAxKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHByb2Nlc3MgcnVsZXMgd2l0aCBtb3JlIHRoYW4gb25lIHJ1bGUgbmFtZTogeyR7bWF0Y2guc2xpY2Uuam9pbihcIlwiKX19YCk7XG5cblx0XHR2YXIgcGFyYW1zID0geyBydWxlOiBtYXRjaC5zbGljZVswXSB9O1xuXG5cdFx0Ly8gc2VlIGlmIHRoZXJlJ3MgYSBgbm90YCBydWxlIGluIHRoZXJlXG5cdFx0bGV0IGJhbmdQb3NpdGlvbiA9IHBhcmFtcy5ydWxlLmluZGV4T2YoXCIhXCIpO1xuXHRcdGlmIChiYW5nUG9zaXRpb24gIT09IC0xKSB7XG5cdFx0XHRwYXJhbXMubm90ID0gcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpOyAvL1sgcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpIF07XG5cdFx0XHRwYXJhbXMucnVsZSA9IHBhcmFtcy5ydWxlLnN1YnN0cigwLCBiYW5nUG9zaXRpb24pO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuU3VicnVsZShwYXJhbXMpO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIG1hdGNoLmVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggbGlzdCBleHByZXNzaW9uIGBbPGl0ZW0+PGRlbGltaXRlcj5dYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJbXCIsIFwiXVwiLCBzdGFydEluZGV4KTtcblxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHNsaWNlLCBbXSk7XG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoICE9PSAyKSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgc3R1ZmYgYXQgZW5kIG9mIGxpc3Q6IFske3NsaWNlLmpvaW4oXCIgXCIpfV1gKTtcblx0XHR9XG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5MaXN0KCk7XG5cdFx0cnVsZS5pdGVtID0gcmVzdWx0c1swXVxuXHRcdHJ1bGUuZGVsaW1pdGVyID0gcmVzdWx0c1sxXVxuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cdH0sXG5cbn0pO1xuXG5cblxuLy8gIyMgIEFkZCBtZXRob2RzIHRvIFBhcnNlciB0byBkZWZpbmUgcnVsZXMgdXNpbmcgdGhlIGFib3ZlIHN5bnRheC5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFBhcnNlci5wcm90b3R5cGUsIHtcblxuXHQvLyBQYXJzZSBhIGBydWxlU3ludGF4YCBydWxlIGFuZCBhZGQgaXQgdG8gb3VyIGxpc3Qgb2YgcnVsZXMuXG5cdC8vIFJldHVybnMgdGhlIG5ldyBydWxlLlxuXHQvLyBMb2dzIHBhcnNpbmcgZXJyb3JzIGJ1dCBhbGxvd3MgdGhpbmdzIHRvIGNvbnRpbnVlLlxuXHRhZGRTeW50YXg6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3Rvcik7XG5cdFx0XHQvLyBSZWZsZWN0IHRoZSBydWxlIGJhY2sgb3V0IHRvIG1ha2Ugc3VyZSBpdCBsb29rcyAobW9yZSBvciBsZXNzKSB0aGUgc2FtZVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGVkIHJ1bGUgJyR7bmFtZX0nOlxcbiAgSU5QVVQ6ICR7cnVsZVN5bnRheH0gXFxuIE9VVFBVVDogJHtydWxlfWApO1xuXG5cdFx0XHRPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmdyb3VwKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgc3ludGF4OiAke3J1bGVTeW50YXh9YCk7XG5cdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdH1cblx0fX0sXG5cblx0YWRkU3RhdGVtZW50OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TdGF0ZW1lbnQpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRFeHByZXNzaW9uOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5FeHByZXNzaW9uKSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBTZXF1ZW5jZUNvbnN0cnVjdG9yKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcnVsZSk7XG5cdH19LFxuXG5cdC8vIEFkZCBpbmZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgb3IgYlwiLlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZEluZml4T3BlcmF0b3I6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSkge1xuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRJbmZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50b0pTKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIGluZml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYClcblx0XHRcdH1cblx0XHRcdC8vIGNsZWFyIGxpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGZvciBnZXR0ZXIgYmVsb3dcblx0XHRcdGRlbGV0ZSB0aGlzLl9faW5maXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwiaW5maXhfb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIGluZml4IG9wZXJhdG9ycyBhcyBzdHJpbmdzLlxuXHQvLyBSZS1tZW1vaXplZCBhZnRlciBgYWRkSW5maXhPcGVyYXRvcmAgYWJvdmUuXG5cdGluZml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9faW5maXhPcGVyYXRvcnNcIixcblx0XHRmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucnVsZXNbXCJpbmZpeF9vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0ICYmIHRoaXMucnVsZXNbXCJpbmZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZylcblx0fSksXG5cblx0Ly8gQWRkIHBvc3RmaXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIGlzIGRlZmluZWRcIlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZFBvc3RmaXhPcGVyYXRvcjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKSB7XG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFBvc3RmaXhPcGVyYXRvcihuYW1lLCBzeW50YXgsIHByb3BlcnRpZXMpKTtcblx0XHR9XG5cblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudG9KUykge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBwb3N0Zml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBjbGVhciBsaXN0IG9mIGluZml4IG9wZXJhdG9ycyBmb3IgZ2V0dGVyIGJlbG93XG5cdFx0XHRkZWxldGUgdGhpcy5fX3Bvc3RmaXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwicG9zdGZpeF9vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH19LFxuXG5cdC8vIExpc3Qgb2YgcG9zdGZpeCBvcGVyYXRvcnMgYXMgc3RyaW5ncy5cblx0Ly8gUmUtbWVtb2l6ZWQgYWZ0ZXIgYGFkZEluZml4T3BlcmF0b3JgIGFib3ZlLlxuXHRwb3N0Zml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9fcG9zZml4T3BlcmF0b3JzXCIsXG5cdFx0ZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXMucnVsZXNbXCJwb3N0Zml4X29wZXJhdG9yXCJdXG5cdFx0XHRcdFx0XHQmJiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZyk7XG5cdH0pXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlU3ludGF4LmpzIiwiLy9cbi8vXHQjIENvcmUgYHJ1bGVzYCAtLSBzaW1wbGUgZGF0YXR5cGVzLCBldGMuXG4vL1xuLy8gTk9URTogbWFueSBvZiB0aGUgYmVsb3cgYXJlIGNyZWF0ZWQgYXMgY3VzdG9tIFBhdHRlcm4gc3ViY2xhc3NlcyBmb3IgZGVidWdnaW5nLlxuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gYHdoaXRlc3BhY2VgIHJ1bGUuXG4vLyBOT1RFIGBwYXJzZXIucGFyc2UoXCJ3aGl0ZXNwYWNlXCIsIFwiICAgXCIpYCB3aWxsIHJldHVybiBgdW5kZWZpbmVkYFxuLy9cdFx0IGJlY2F1c2UgYHBhcnNlci5wYXJzZSgpYCBhdXRvbWF0aWNhbGx5IGVhdHMgd2hpdGVzcGFjZSBhdCB0aGUgc3RhcnQgb2YgYSBydWxlLlxuUnVsZS5XaGl0ZXNwYWNlID0gY2xhc3Mgd2hpdGVzcGFjZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fVxucGFyc2VyLmFkZFJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIG5ldyBSdWxlLldoaXRlc3BhY2UoeyBwYXR0ZXJuOiAvXFxzKy8sIG9wdGlvbmFsOiB0cnVlIH0pKTtcblxuLy8gYGlkZW50aWZpZXJgID0gdmFyaWFibGVzIG9yIHByb3BlcnR5IG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcblJ1bGUuSWRlbnRpZmllciA9IGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgaWRlbnRpZmllciA9IHBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgUnVsZS5JZGVudGlmaWVyKHtcblx0cGF0dGVybjogL1thLXpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGlkZW50aWZpZXIpO1xuXG4vLyBBZGQgRW5nbGlzaCBwcmVwb3NpdGlvbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vL1xuLy8gV2lraXBlZGlhIFwiUHJlcG9zaXRpb25cIjpcbi8vXHRcIlByZXBvc2l0aW9ucy4uLmFyZSBhIGNsYXNzIG9mIHdvcmRzIHRoYXRcbi8vXHRleHByZXNzIHNwYXRpYWwgb3IgdGVtcG9yYWwgcmVsYXRpb25zICAoaW4sIHVuZGVyLCB0b3dhcmRzLCBiZWZvcmUpXG4vL1x0b3IgbWFyayB2YXJpb3VzIHNlbWFudGljIHJvbGVzIChvZiwgZm9yKS5cbi8vIFRFU1RNRVxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYWJvdXRcIiwgXCJhYm92ZVwiLCBcImFmdGVyXCIsIFwiYW5kXCIsIFwiYXNcIiwgXCJhdFwiLFxuXHRcImJlZm9yZVwiLCBcImJlaGluZFwiLCBcImJlbG93XCIsIFwiYmVuZWF0aFwiLCBcImJlc2lkZVwiLCBcImJldHdlZW5cIiwgXCJiZXlvbmRcIiwgXCJieVwiLFxuXHRcImRlZmluZWRcIiwgXCJkb3duXCIsIFwiZHVyaW5nXCIsXG5cdFwiZWFjaFwiLCBcImVtcHR5XCIsIFwiZXhhY3RseVwiLCBcImV4Y2VwdFwiLFxuXHRcImZvclwiLCBcImZyb21cIixcblx0XCJncmVhdGVyXCIsXG5cdFwiaW5cIiwgXCJpbnRvXCIsXG5cdFwibGVzc1wiLCBcImxvbmdcIixcblx0XCJtaW51c1wiLCBcIm1vcmVcIixcblx0XCJuZWFyXCIsIFwibm90XCIsXG5cdFwib2ZcIiwgXCJvZmZcIiwgXCJvblwiLCBcIm9udG9cIiwgXCJvcHBvc2l0ZVwiLCBcIm91dFwiLCBcIm91dHNpZGVcIiwgXCJvdmVyXCIsXG5cdFwic2hvcnRcIiwgXCJzaW5jZVwiLFxuXHRcInRoYW5cIiwgXCJ0aGVuXCIsIFwidGhyb3VnaFwiLCBcInRocnVcIiwgXCJ0b1wiLCBcInRvd2FyZFwiLCBcInRvd2FyZHNcIixcblx0XCJ1bmRlZmluZWRcIiwgXCJ1bmRlclwiLCBcInVuZGVybmVhdGhcIiwgXCJ1bmlxdWVcIiwgXCJ1bnRpbFwiLCBcInVwXCIsIFwidXBvblwiLCBcInVwc2lkZVwiLFxuXHRcInZlcnN1c1wiLCBcInZzXCIsXG5cdFwid2l0aFwiLCBcIndpdGhpblwiLCBcIndpdGhvdXRcIixcbik7XG5cbi8vIEFkZCBjb21tb24gZW5nbGlzaCB2ZXJicyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFyZVwiLFxuXHRcImRvXCIsIFwiZG9lc1wiLFxuXHRcImNvbnRhaW5zXCIsXG5cdFwiaGFzXCIsIFwiaGF2ZVwiLFxuXHRcImlzXCIsXG5cdFwicmVwZWF0XCIsXG5cdFwid2FzXCIsIFwid2VyZVwiXG4pO1xuXG4vLyBBZGQgc3BlY2lhbCBjb250cm9sIGtleXdvcmRzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiZWxzZVwiLFxuXHRcImlmXCIsXG5cdFwib3RoZXJ3aXNlXCIsXG5cdFwid2hpbGVcIlxuKTtcblxuLy8gYFR5cGVgID0gdHlwZSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGFuIHVwcGVyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5UeXBlID0gY2xhc3MgdHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoXCJ0eXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvW0EtWl1bXFx3XFwtXSovLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdHlwZSk7XG5cblxuLy8gYG51bWJlcmAgYXMgZWl0aGVyIGZsb2F0IG9yIGludGVnZXIsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cblJ1bGUuTnVtYmVyID0gY2xhc3MgbnVtYmVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IG51bWJlciA9IHBhcnNlci5hZGRSdWxlKFwibnVtYmVyXCIsIG5ldyBSdWxlLk51bWJlcih7XG5cdHBhdHRlcm46IC8tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gbnVtYmVyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlRmxvYXQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBudW1iZXIpO1xuXG5cbi8vIE51bWVyaWMgYGludGVnZXJgIG9ubHksIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHRoaXMgV0lMTCBtYXRjaCBhIGZsb2F0LCBidXQgdGhlIHJldHVybmVkIHZhbHVlIHdpbGwgY29lcmNlIHRvIGFuIGludGVnZXIuXG4vLyBSRVZJRVc6IGlzIHRoaXMgcmlnaHQ/ICBCZXR0ZXIgdG8gbm90IG1hdGNoIGEgZmxvYXQ/XG5SdWxlLkludGVnZXIgPSBjbGFzcyBpbnRlZ2VyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJpbnRlZ2VyXCIsIG5ldyBSdWxlLkludGVnZXIoe1xuXHRwYXR0ZXJuOiAvLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0ZXh0ID0gcGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyBSdWxlLlRleHQoe1xuXHRwYXR0ZXJuOiAvKD86XCJbXlwiXSpcInwnW14nXSonKS9cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCB0ZXh0KTtcblxuXG4vLyBCb29sZWFuIGxpdGVyYWwsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFRPRE86IGJldHRlciBuYW1lIGZvciB0aGlzPz8/XG5SdWxlLkJvb2xlYW4gPSBjbGFzcyBib29sZWFuIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IGJvb2wgPSBwYXJzZXIuYWRkUnVsZShcImJvb2xlYW5cIiwgbmV3IFJ1bGUuQm9vbGVhbih7XG5cdHBhdHRlcm46IC8odHJ1ZXxmYWxzZXx5ZXN8bm98b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgYm9vbCk7XG4vLyBBZGQgYm9vbGVhbiB0b2tlbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcInRydWVcIiwgXCJmYWxzZVwiLFxuXHRcInllc1wiLCBcIm5vXCIsXG5cdFwib2tcIiwgXCJjYW5jZWxcIlxuKTtcblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxubGV0IGxpc3QgPSBwYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsX2xpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdHVuZGVmaW5lZCxcblx0Y2xhc3MgbGl0ZXJhbF9saXN0IGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHQvLyBXaGVuIGdhdGhlcmluZyBhcmd1bWVudHMsIHJldHVybiBqdXN0IHRoZSBtYXRjaGVkIGxpc3QgZGF0YSwgaWdub3JpbmcgdGhlIGJyYWNrZXRzLlxuXHRcdGdldCBhcmdzKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMucmVzdWx0c1sxXTtcblx0XHR9XG5cblx0XHQvLyByZXR1cm4ganVzdCB0aGUgbGlzdCBhcyBvdXIgc291cmNlXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuIFx0XHRcdHJldHVybiB0aGlzLmFyZ3MudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBMaXRlcmFsIHZhbHVlIGFzIG51bWJlciwgdGV4dCBvciBib29sZWFuLlxuLy9UT0RPOiB0aGlzIGlzIGFuIGV4cHJlc3Npb24uLi4gYnV0IGluc3RhbGxpbmcgaXQgdGhhdCB3YXkgYnJlYWtzIHBhcnNpbmcuLi4/XG4vL1RFU1RNRTogYWRkIGxpdGVyYWwtbGlzdCB0byB0aGlzP1xucGFyc2VyLmFkZFN5bnRheChcImxpdGVyYWxcIiwgXCIobGl0ZXJhbDp7bnVtYmVyfXx7dGV4dH18e2Jvb2xlYW59fHtsaXRlcmFsX2xpc3R9KVwiKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9jb3JlLmpzIiwiXG4vLyBUT0RPOiBjb252ZXJ0IHRvIGxpbmUtYXdhcmUgc3RyZWFtPz8/XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXh0U3RyZWFtIHtcblx0Ly8gWW91IGNhbiBjb25zdHJ1Y3Qgd2l0aCBhIHRleHQgc3RyaW5nIG9yIGEgc2V0IG9mIHByb3BlcnRpZXMgKGluY2x1ZGluZyBgdGV4dGApLlxuXHRjb25zdHJ1Y3RvciguLi50ZXh0T3JQcm9wcykge1xuXHRcdHRleHRPclByb3BzLmZvckVhY2goKGFyZykgPT4ge1xuXHRcdFx0aWYgKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0dGhpcy50ZXh0ID0gYXJnO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoYXJnKSB7XG5cdFx0XHRcdE9iamVjdC5hc3NpZ24odGhpcywgYXJnKTtcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0Ly8gTWFrZSBzdXJlIGB0ZXh0YCBhbmQgYHN0YXJ0SW5kZXhgIGFyZSBkZWZpbmVkLlxuXHRcdGlmICghKFwidGV4dFwiIGluIHRoaXMpKSB0aGlzLnRleHQgPSBcIlwiO1xuXHRcdGlmICghKFwic3RhcnRJbmRleFwiIGluIHRoaXMpKSB0aGlzLnN0YXJ0SW5kZXggPSAwO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGFuIGltbXV0YWJsZSBjbG9uZSBvZiB0aGUgc3RyZWFtLlxuXHRjbG9uZShwcm9wcykge1xuXHRcdHJldHVybiBuZXcgVGV4dFN0cmVhbSh0aGlzLCBwcm9wcyk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNlZCB0byBuZXcgc3RhcnRJbmRleC5cblx0YWR2YW5jZVRvKHN0YXJ0SW5kZXgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXggfSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNpbmcgc3RhcnRJbmRleCBCWSBgbGVuZ3RoYFxuXHRhZHZhbmNlQnkobGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG5cdH1cblxuLy8gXHQvLyBSZXR1cm4gY2xvbmUgb2YgdGhpcyBzdHJlYW0gd2l0aCBlbmRJbmRleCBzZXQgdG8gc3RhcnQgKyBgbGVuZ3RoYFxuLy8gXHRlbmRBZnRlcihsZW5ndGgpIHtcbi8vIFx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IGVuZEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG4vLyBcdH1cblxuLy9cbi8vICMjIE1hdGNoaW5nXG4vL1xuXHQvLyBNYXRjaCBgcGF0dGVybmAgYXMgcmVnZXggaW4gdGhpcyBzdHJlYW0uXG5cdC8vIFJldHVybnMgbWF0Y2ggb3IgYHVuZGVmaW5lZGAuXG5cdC8vIElmIHlvdSB3YW50IHRvIHRlc3QgdGhlIHN0YXJ0IG9mIHRoZSBzdHJlYW0sXG5cdC8vXHRtYWtlIHN1cmUgeW91ciByZWdleCBzdGFydHMgd2l0aCBgXmAuXG5cdC8vIFRFU1RNRTogdGhpcyBsaWtlbHkgYnJlYWtzIHdpdGggYSBgZ2Agb24gdGhlIHBhdHRlcm4/XG5cdG1hdGNoKHBhdHRlcm4pIHtcblx0XHRpZiAoIShwYXR0ZXJuIGluc3RhbmNlb2YgUmVnRXhwKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGV4dFN0cmVhbS5tYXRjaCgke3BhdHRlcm59KTogZXhwZWN0ZWQgUmVnRXhwYCk7XG4vL1RPRE86IHVzZSBgc3RyZWFtLnJhbmdlYCB0byBlbnN1cmUgbWF0Y2ggaXMgbm90IG5vdCBiZXlvbmQgYHN0cmluZy5lbmRJbmRleGBcblx0XHRyZXR1cm4gdGhpcy5oZWFkLm1hdGNoKHBhdHRlcm4pIHx8IHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIERvZXMgdGhpcyBzdHJlYW0gSU5DTFVERSBhIHJlZ2V4IHdpdGhpbiBpdD9cblx0Ly8gUmV0dXJucyBgdHJ1ZWAgb3IgYGZhbHNlYC5cblx0Ly8gTk9URTogUGF0dGVybiBtdXN0IE5PVCBzdGFydCB3aXRoIGBeYCBmb3IgdGhpcyB0byBtYXRjaCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBzdHJlYW0uXG5cdHRlc3QocGF0dGVybikge1xuXHRcdHJldHVybiBwYXR0ZXJuLnRlc3QodGhpcy5oZWFkKTtcblx0fVxuXG4vL1xuLy8gIyMgUmVmbGVjdGlvblxuLy9cblx0Ly8gUmV0dXJuIHRleHQgb2Ygc3RyaW5nIHN0YXJ0aW5nIGF0IG91ciBgc3RhcnRJbmRleGBcblx0Z2V0IGhlYWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMucmFuZ2UoKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIHJhbmdlIG9mIHRoZSBzdHJpbmcgZnJvbSBgc3RhcnRJbmRleGAgdG8gYGVuZEluZGV4YCBOT04taW5jbHVzaXZlLlxuXHRyYW5nZShzdGFydEluZGV4ID0gdGhpcy5zdGFydEluZGV4LCBlbmRJbmRleCA9IHRoaXMuZW5kSW5kZXggfHwgdGhpcy50ZXh0Lmxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQuc3Vic3RyaW5nKHN0YXJ0SW5kZXgsIGVuZEluZGV4KTtcblx0fVxuXG5cdC8vIExlbmd0aCBvZiB0aGUgc3RyZWFtLlxuXHRnZXQgbGVuZ3RoKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQubGVuZ3RoO1xuXHR9XG5cblx0Ly8gQXJlIHdlIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmVhbT9cblx0Z2V0IGlzRW1wdHkoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3RhcnRJbmRleCA9PT0gdGhpcy5sZW5ndGg7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0XG5cdH07XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvVGV4dFN0cmVhbS5qcyIsImltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBsb2FkIHN0YW5kYXJkIHJ1bGVzIGZpbGVzIGhlcmVcbmltcG9ydCBcIi4vY29yZVwiO1xuaW1wb3J0IFwiLi9udW1iZXJzXCI7XG5pbXBvcnQgXCIuL29wZXJhdG9yc1wiO1xuaW1wb3J0IFwiLi9zdGF0ZW1lbnRzXCI7XG5pbXBvcnQgXCIuL2Fzc2lnbm1lbnRcIjtcbmltcG9ydCBcIi4vY2xhc3NcIjtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9pbmRleC5qcyIsIi8vIE1lbW9pemUvZm9yZ2V0IHNlbWFudGljcy5cblxuLy8gUmV0dXJuIGEgbWVtb2l6aW5nIGdldHRlciBmdW5jdGlvbi5cbi8vIFRFU1RNRVxuZXhwb3J0IGZ1bmN0aW9uIG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0aGlzW3Byb3BlcnR5XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSBnZXR0ZXIuYXBwbHkodGhpcyk7XG5cdFx0XHRpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHQvLyBEZWZpbmUgc28gdGhhdCB3ZSBjYW4gYmUgZGVsZXRlZCBhbmQgcmUtZGVmaW5lZCwgYnV0IG5vdCBzZXQgb3IgZW51bWVyYXRlZC5cblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHByb3BlcnR5LCB7IHZhbHVlLCBjb25maWd1cmFibGU6IHRydWUgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzW3Byb3BlcnR5XTtcblx0fVxufVxuXG5cbi8vIFJldHVybiBhIG1lbW9pemUgZnVuY3Rpb24gZm9yIHVzZSBhcyBhIGdldHRlciBpbiBhIGBPYmplY3QuZGVmaW5lUHJvcGVydHkoKWBcbi8vIFRFU1RNRVxuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZU1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpIHtcblx0cmV0dXJuIHtcblx0XHRnZXQgOiBtZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKVxuXHR9XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvbWVtb2l6ZS5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gVE9ETzoge3Byb3BlcnR5LWV4cHJlc3Npb259IGFsc28gd29ya3MuLi4ge2Fzc2lnbmFibGUtZXhwcmVzc2lvbn0gPz8/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYXNzaWdubWVudFwiLCBcIntpZGVudGlmaWVyfSA9IHtleHByZXNzaW9ufVwiLCB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgaWRlbnRpZmllciA9IHRoaXMuYXJncy5pZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdGxldCB2YWx1ZSA9IHRoaXMuYXJncy5leHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdC8vIFRPRE86IGRlY2xhcmUgaWRlbnRpZmllciBpZiBub3QgaW4gc2NvcGUsIGV0Y1xuXHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSA9ICR7dmFsdWV9YDtcblx0fVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvYXNzaWdubWVudC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVmaW5pbmcgY2xhc3NlcyAoa25vd24gYXMgYHR5cGVzYClcbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIocHJvcGVydHlfbmFtZXM6dGhlIHtpZGVudGlmaWVyfSBvZikrIHtleHByZXNzaW9ufVwiLFxuXHR1bmRlZmluZWQsXG5cdGNsYXNzIHByb3BlcnR5X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdGdldCBhcmdzKCkge1xuXHRcdFx0aWYgKCF0aGlzLl9hcmdzKSB7XG5cdFx0XHRcdHRoaXMuX2FyZ3MgPSBzdXBlci5hcmdzO1xuXHRcdFx0XHQvLyB0cmFuc2Zvcm0gcHJvcGVydHlfbmFtZXMgYW5kIHB1bGwgb3V0IGlkZW50aWZpZXJzXG5cdFx0XHRcdHRoaXMuX2FyZ3MucHJvcGVydHlfbmFtZXMgPSB0aGlzLl9hcmdzLnByb3BlcnR5X25hbWVzLmFyZ3MubWFwKCBzZXF1ZW5jZSA9PiBzZXF1ZW5jZS5pZGVudGlmaWVyICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcy5fYXJncztcblx0XHR9XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgdGhpbmcgPSB0aGlzLmFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBwcm9wZXJ0eV9uYW1lcyA9IHRoaXMuYXJncy5wcm9wZXJ0eV9uYW1lcy5yZXZlcnNlKCkubWFwKCBpZGVudGlmaWVyID0+IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCkgKS5qb2luKFwiLlwiKTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0KCR7dGhpbmd9LCAnJHtwcm9wZXJ0eV9uYW1lc30nKWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbnBhcnNlci5hZGRTeW50YXgoXCJzY29wZV9tb2RpZmllclwiLCBcIihzY29wZTpnbG9iYWx8Y29uc3RhbnR8c2hhcmVkfGxvY2FsKVwiKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwie3Njb3BlX21vZGlmaWVyfT8ge2Fzc2lnbm1lbnR9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXNzaWdubWVudCA9IHRoaXMuYXJncy5hc3NpZ25tZW50LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHNjb3BlID0gdGhpcy5hcmdzLnNjb3BlICYmIHRoaXMuYXJncy5zY29wZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN3aXRjaCAoc2NvcGUpIHtcblx0XHRcdFx0Y2FzZSBcImdsb2JhbFwiOlxuXHRcdFx0XHRcdHJldHVybiBgZ2xvYmFsLiR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZFwiOlxuXHRcdFx0XHRcdHJldHVybiBgc3RhdGljICR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJsb2NhbFwiOlxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBhc3NpZ25tZW50O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuLy8gVE9ETzogd2FybiBvbiBpbnZhbGlkIHNldD8gIHNoYXJlZD8gIHVuZGVmaW5lZD8gc29tZXRoaW5nIG90aGVyIHRoYW4gdGhlIGZpcnN0IHZhbHVlIGFzIGRlZmF1bHQ/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlfYXNfb25lX29mXCIsXG5cdFwie3Njb3BlX21vZGlmaWVyfT8ge2lkZW50aWZpZXJ9IGFzIG9uZSBvZiB7bGlzdDpsaXRlcmFsX2xpc3R9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgc2NvcGUgPSB0aGlzLmFyZ3Muc2NvcGUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgaWRlbnRpZmllciA9IHRoaXMuYXJncy5pZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHBsdXJhbCA9IChpZGVudGlmaWVyICsgXCJfVkFMVUVTXCIpLnRvVXBwZXJDYXNlKCk7XG5cdFx0XHRsZXQgbGlzdCA9IHRoaXMuYXJncy5saXN0O1xuXHRcdFx0bGV0IHZhbHVlcyA9IGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgZmlyc3QgPSBsaXN0LmFyZ3MucmVzdWx0c1swXTtcblx0XHRcdGxldCBmaXJzdFZhbHVlID0gZmlyc3QgPyBmaXJzdC50b1NvdXJjZShjb250ZXh0KSA6IFwidW5kZWZpbmVkXCI7XG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke3BsdXJhbH0gPSAke3ZhbHVlc307XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0geyByZXR1cm4gKFwiX18ke2lkZW50aWZpZXJ9XCIgaW4gdGhpcyA/IHRoaXMuX18ke2lkZW50aWZpZXJ9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfVxcbmA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY2xhc3MuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBudW1iZXJzXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxubGV0IGluZGV4X2V4cHJlc3Npb24gPSBwYXJzZXIuYWRkUnVsZShcImluZGV4X2V4cHJlc3Npb25cIiwgbmV3IChjbGFzcyBpbmRleF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXN7fSkoKSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgaW5kZXhfZXhwcmVzc2lvbik7XG5cbi8vIE51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmc6XG4vL1x0LSBgaXRlbSAxIG9mIC4uLmBcbi8vXHQtIGBpdGVtICMyIG9mIC4uLmBcbi8vIE5PVEU6IHRoZXNlIGluZGljZXMgYXJlIE9ORSBiYXNlZCwgTk9UIHplcm8gYmFzZWQgYXMgaXMgSmF2YXNjcmlwdC5cbi8vIFRPRE86IGFsbG93IGFueSBpZGVudGlmaWVyIGluc3RlYWQgb2YgYHtpdGVtfWAgP1xucGFyc2VyLmFkZFN5bnRheChcImluZGV4X2V4cHJlc3Npb25cIixcblx0XCJ7aWRlbnRpZmllcn0gKCMpP3tudW1iZXI6aW50ZWdlcn0gb2Yge2V4cHJlc3Npb259XCIsXG5cdHVuZGVmaW5lZCxcblx0Y2xhc3MgaW5kZXhfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IG51bWJlciA9IHRoaXMuYXJncy5udW1iZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgZXhwcmVzc2lvbiA9IHRoaXMuYXJncy5leHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7bnVtYmVyfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBPcmRpbmFsIG51bWJlcnM6IGZpcnN0LCBzZWNvbmQsIGV0Yy5cbnBhcnNlci5hZGRSdWxlKFwib3JkaW5hbFwiLCBuZXcgKGNsYXNzIG9yZGluYWwgZXh0ZW5kcyBSdWxlLkFsdGVybmF0aXZlcyB7fSkoKSk7XG5cbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZmlyc3RcIiwgeyB0b1NvdXJjZTogKCkgPT4gMSB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwic2Vjb25kXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDIgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInRoaXJkXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDMgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImZvdXJ0aFwiLCB7IHRvU291cmNlOiAoKSA9PiA0IH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJmaWZ0aFwiLCB7IHRvU291cmNlOiAoKSA9PiA1IH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJzaXh0aFwiLCB7IHRvU291cmNlOiAoKSA9PiA2IH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJzZXZlbnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDcgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImVpZ2h0aFwiLCB7IHRvU291cmNlOiAoKSA9PiA4IH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJuaW50aFwiLCB7IHRvU291cmNlOiAoKSA9PiA5IH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJ0ZW50aFwiLCB7IHRvU291cmNlOiAoKSA9PiAxMCB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwicGVudWx0aW1hdGVcIiwgeyB0b1NvdXJjZTogKCkgPT4gLTIgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImZpbmFsXCIsIHsgdG9Tb3VyY2U6ICgpID0+IC0xIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJsYXN0XCIsIHsgdG9Tb3VyY2U6ICgpID0+IC0xIH0pO1xuXG4vLyBUT0RPOiBzaXh0eS1maWZ0aCwgdHdvIGh1bmRyZWQgZm9ydHkgbmludGguLi5cblxuLy8gQWx0ZXJuYXRpdmUgZm9ybSBmb3IgbnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZy5cbi8vIE5PVEU6IGRvbid0IGFkZCBhcyBhbiBleHByZXNzaW9uIHNpbmNlIHdlJ3JlIGF1dG8tbWVyZ2VkIHdpdGggYGluZGV4X2V4cHJlc3Npb25gIGFib3ZlLlxucGFyc2VyLmFkZFN5bnRheChcblx0XCJpbmRleF9leHByZXNzaW9uXCIsXG5cdFwidGhlIHtvcmRpbmFsfSB7aWRlbnRpZmllcn0gb2Yge2V4cHJlc3Npb259XCIsXG5cdHVuZGVmaW5lZCxcblx0Y2xhc3MgaW5kZXhfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IG9yZGluYWwgPSB0aGlzLmFyZ3Mub3JkaW5hbC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBleHByZXNzaW9uID0gdGhpcy5hcmdzLmV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtvcmRpbmFsfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL251bWJlcnMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGluZml4IGFuZCBwcmVmaXggb3BlcmF0b3JzLlxuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIyMgSW5maXggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+IHtyaHN9YCwgZWc6IGBhIGlzIDFgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHR3byBhcmd1bWVudHMgKGBsaHNgIGFuZCBgcmhzYCkgaW50byBvdXRwdXQuXG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiYW5kXCIsIFwiYW5kXCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAmJiAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJvclwiLCBcIm9yXCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSB8fCAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzXCIsIFwiaXNcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX25vdFwiLCBcImlzIG5vdFwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT0gJHtifSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19leGFjdGx5XCIsIFwiaXMgZXhhY3RseVwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT09ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX25vdF9leGFjdGx5XCIsIFwiaXMgbm90IGV4YWN0bHlcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9PSAke2J9KWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5pc09mVHlwZSh0aGluZywgdHlwZSlgXG4vL1RPRE86IGBpcyBzYW1lIHR5cGUgYXNgID9cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfdHlwZV9vZlwiLCBbXCJpcyBhXCIsIFwiaXMgYW5cIl0sIHsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX25vdF90eXBlX29mXCIsIFtcImlzIG5vdCBhXCIsIFwiaXMgbm90IGFuXCJdLCB7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGAhc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuY29udGFpbnMoY29sbGVjdGlvbiwgdGhpbmcpYFxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19pblwiLCBbXCJpcyBpblwiLCBcImlzIG9uZSBvZlwiXSwgeyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgc3BlbGwuY29udGFpbnMoJHtsaXN0fSwgJHt0aGluZ30pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX25vdF9pblwiLCBbXCJpcyBub3QgaW5cIiwgXCJpcyBub3Qgb25lIG9mXCJdLCB7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAhc3BlbGwuY29udGFpbnMoJHtsaXN0fSwgJHt0aGluZ30pYCB9fSk7XG4vL1RFU1RNRVxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpbmNsdWRlc1wiLCBbXCJpbmNsdWRlc1wiLCBcImNvbnRhaW5zXCJdLCB7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZG9lc250X2luY2x1ZGVcIiwgW1wiZG9lcyBub3QgaW5jbHVkZVwiLCBcImRvZXNudCBpbmNsdWRlXCIsIFwiZG9lcyBub3QgY29udGFpblwiLCBcImRvZXNudCBjb250YWluXCJdLCB7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAhc3BlbGwuY29udGFpbnMoJHtsaXN0fSwgJHt0aGluZ30pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZ3RcIiwgW1wiPlwiLCBcImlzIGdyZWF0ZXIgdGhhblwiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndGVcIiwgW1wiPj1cIiwgXCJpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG9cIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0XCIsIFtcIjxcIiwgXCJpcyBsZXNzIHRoYW5cIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDwgJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibHRlXCIsIFtcIjw9XCIsIFwiaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfX0pO1xuXG4vL1RPRE86ICBjYW4ndCBhZGQgYCtgIGFzIGEgcnVsZSwgZml4IHRoaXMgdGhlbiBhZGQgdGhlc2Vcbi8vVE9ETzogIG9wZXJhdG9yIHByZWNlZGVuY2U/Pz9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcInBsdXNcIiwgW1wiXFxcXCtcIiwgXCJwbHVzXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJtaW51c1wiLCBbXCItXCIsIFwibWludXNcIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLSAke2J9YCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcInRpbWVzXCIsIFtcIlxcXFwqXCIsIFwidGltZXNcIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKiAke2J9YCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImRpdmlkZWRfYnlcIiwgW1wiL1wiLCBcImRpdmlkZWQgYnlcIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLyAke2J9YCB9fSk7XG5cbi8vVE9ETzogIGArPWAgZXRjPyAgb3RoZXIgbWF0aCBmdW5jdGlvbnM/XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImluZml4X29wZXJhdG9yX2V4cHJlc3Npb25cIixcblx0XCJ7bGhzOmV4cHJlc3Npb259IHtvcGVyYXRvcjppbmZpeF9vcGVyYXRvcn0ge3JoczpleHByZXNzaW9ufVwiLFxuXHR1bmRlZmluZWQsXG5cdGNsYXNzIGluZml4X29wZXJhdG9yX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdGxlZnRSZWN1cnNpdmUgPSB0cnVlO1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBsaHMgPSB0aGlzLmFyZ3MubGhzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHJocyA9IHRoaXMuYXJncy5yaHMudG9Tb3VyY2UoY29udGV4dCk7XG5cblx0XHRcdGxldCB0b0pTID0gdGhpcy5hcmdzLm9wZXJhdG9yLnRvSlM7XG5cdFx0XHRyZXR1cm4gdG9KUyhsaHMsIHJocyk7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyMjIFBvc3RpZnggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+YCwgZS5nLiBgYSBpcyBkZWZpbmVkYFxuLy8gTk9URTogYG9wZXJhdG9yLnRvSlNgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyBhcmd1bWVudCAoYGxoc2ApIGludG8gSlMgb3V0cHV0LlxuXG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXNfZGVmaW5lZFwiLCBcImlzIGRlZmluZWRcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSAhPT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXNfbm90X2RlZmluZWRcIiwgW1wiaXMgbm90IGRlZmluZWRcIiwgXCJpcyB1bmRlZmluZWRcIl0sIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gPT09ICd1bmRlZmluZWQnKWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5pc0VtcHR5KHRoaW5nKWBcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19lbXB0eVwiLCBcImlzIGVtcHR5XCIsIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYHNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXNfbm90X2VtcHR5XCIsIFwiaXMgbm90IGVtcHR5XCIsIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCFzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfX0pO1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwb3N0Zml4X29wZXJhdG9yX2V4cHJlc3Npb25cIixcblx0XCJ7ZXhwcmVzc2lvbn0ge29wZXJhdG9yOnBvc3RmaXhfb3BlcmF0b3J9XCIsXG5cdHVuZGVmaW5lZCxcblx0Y2xhc3MgcG9zdGZpeF9vcGVyYXRvcl9leHByZXNpb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdGxlZnRSZWN1cnNpdmUgPSB0cnVlO1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBsaHMgPSB0aGlzLmFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCB0b0pTID0gdGhpcy5hcmdzLm9wZXJhdG9yLnRvSlM7XG5cdFx0XHRyZXR1cm4gdG9KUyhsaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG4vL3BhcnNlci5hZGRTeW50YXgoXCJvcGVyYXRvcl9leHByZXNzaW9uXCIsIFwiKGV4cHJlc3Npb246e3Bvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvbn18e2luZml4X29wZXJhdG9yX2V4cHJlc3Npb259KVwiKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJpbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuaW1wb3J0IFwiLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL3J1bGVzL2luZGV4LmpzXCI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHR3aW5kb3cuVGV4dFN0cmVhbSA9IFRleHRTdHJlYW07XG5cdHdpbmRvdy5QYXJzZXIgPSBQYXJzZXI7XG5cdHdpbmRvdy5SdWxlID0gUnVsZTtcblx0d2luZG93LnBhcnNlciA9IHBhcnNlcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuXHRUZXh0U3RyZWFtLCBQYXJzZXIsIFJ1bGUsIHBhcnNlclxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvaW5kZXguanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiaWZcIiwgXCJpZiB7ZXhwcmVzc2lvbn0gdGhlbiB7bnVtYmVyfT9cIiwge1xuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0fVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvc3RhdGVtZW50cy5qcyJdLCJzb3VyY2VSb290IjoiIn0=