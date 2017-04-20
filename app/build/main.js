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
				// DEBUG
				matched: stream.range(stream.startIndex, next.startIndex),
				// DEBUG
				startIndex: stream.startIndex,
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
		key: "gatherArguments",

		// When gathering arguments, return just the matched list data.
		value: function gatherArguments() {
			return this.results[1];
		}

		// return just the list as our source

	}, {
		key: "toSource",
		value: function toSource(context) {
			return this.gatherArguments().toSource();
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

//parser.addExpression("property_expression", "{property:property_name}+ {expression}", {

_parser2.default.addExpression("property_expression", "(properties:the {identifier} of)+ {expression}", undefined, function (_Rule$Expression) {
	_inherits(property_expression, _Rule$Expression);

	function property_expression() {
		_classCallCheck(this, property_expression);

		return _possibleConstructorReturn(this, (property_expression.__proto__ || Object.getPrototypeOf(property_expression)).apply(this, arguments));
	}

	_createClass(property_expression, [{
		key: "gatherArguments",
		value: function gatherArguments() {
			var args = _RuleSyntax2.default.Expression.gatherArguments(this);
			// transform properties and reverse order
			args.properties = args.properties.map(function (sequence) {
				return sequence.identifier;
			}).reverse();
			return args;
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			var args = this.gatherArguments();
			var thing = args.expression.toSource();
			var properties = args.properties.map(function (identifier) {
				return identifier.toSource();
			}).join(".");
			return "spell.get(" + thing + ", '" + properties + "')";
		}
	}]);

	return property_expression;
}(_RuleSyntax2.default.Expression));

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
_parser2.default.addSyntax("index_expression", "item (#)?{number:integer} of {expression}", undefined, function (_Rule$Expression) {
	_inherits(index_expression, _Rule$Expression);

	function index_expression() {
		_classCallCheck(this, index_expression);

		return _possibleConstructorReturn(this, (index_expression.__proto__ || Object.getPrototypeOf(index_expression)).apply(this, arguments));
	}

	_createClass(index_expression, [{
		key: "toSource",
		value: function toSource() {
			var args = this.gatherArguments();
			var number = args.number.toSource();
			var expression = args.expression.toSource();
			return "spell.getItem(" + expression + ", " + number + ")";
		}
	}]);

	return index_expression;
}(_Rule2.default.Expression));

// `item # 1 of...`:  Numeric index in a list-like thing

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
_parser2.default.addSyntax("index_expression", "the {ordinal} item of {expression}", undefined, function (_Rule$Expression2) {
	_inherits(index_expression, _Rule$Expression2);

	function index_expression() {
		_classCallCheck(this, index_expression);

		return _possibleConstructorReturn(this, (index_expression.__proto__ || Object.getPrototypeOf(index_expression)).apply(this, arguments));
	}

	_createClass(index_expression, [{
		key: "toSource",
		value: function toSource() {
			var args = this.gatherArguments();
			var ordinal = args.ordinal.toSource();
			var expression = args.expression.toSource();
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
			var args = this.gatherArguments();
			var lhs = args.lhs.toSource(context);
			var rhs = args.rhs.toSource(context);

			var toJS = args.operator.toJS;
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

_parser2.default.addExpression("postfix_operator_expression", "{lhs:expression} {operator:postfix_operator}", undefined, function (_Rule$Expression2) {
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
			var args = this.gatherArguments();
			var lhs = args.lhs.toSource(context);
			var toJS = args.operator.toJS;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgMDI1ZTc1YTc4NDVhZTNhZjUzNTciLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZVN5bnRheC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIl0sIm5hbWVzIjpbInBhcnNlciIsIndpbmRvdyIsImNvbnNvbGUiLCJncm91cCIsImxvZyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInJ1bGVzIiwiY3JlYXRlIiwibmFtZSIsInN0cmVhbSIsInJ1bGUiLCJnZXRSdWxlIiwiU3ludGF4RXJyb3IiLCJlYXRXaGl0ZXNwYWNlIiwicGFyc2UiLCJyZXN1bHQiLCJ3aGl0ZXNwYWNlIiwiYWR2YW5jZUJ5IiwibWF0Y2hlZCIsImxlbmd0aCIsImV4aXN0aW5nIiwiQWx0ZXJuYXRpdmVzIiwiZGVidWciLCJydWxlTmFtZSIsImFyZ3VtZW50IiwiYWRkUnVsZSIsInRva2VucyIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsInN0YXJ0SW5kZXgiLCJuZXN0aW5nIiwibmVzdGVkIiwiZW5kSW5kZXgiLCJsYXN0SW5kZXgiLCJ0b2tlbiIsInNsaWNlIiwic3RyaW5nIiwic3BsaXQiLCJtYXAiLCJjaGFyIiwiaW5kZXgiLCJsaXN0IiwiUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyIsImpvaW4iLCJmbGFncyIsIlJlZ0V4cCIsImVzY2FwZVJlZ0V4cENoYXJhY3RlcnMiLCJERUJVRyIsImNoYXJzIiwiZm9yRWFjaCIsIlJ1bGUiLCJjb25zdHJ1Y3RvciIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2xvbmUiLCJwcm9wcyIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsImdhdGhlckFyZ3VtZW50cyIsIlBhdHRlcm4iLCJwYXR0ZXJuIiwiZGVmaW5lUHJvcGVydHkiLCJ2YWx1ZSIsInNvdXJjZSIsIm1hdGNoIiwic3RhcnRQYXR0ZXJuIiwiYmxhY2tsaXN0Iiwid29yZHMiLCJ3b3JkIiwiU3ltYm9sIiwiUmVnRXhwRnJvbVN0cmluZyIsIm9wdGlvbmFsIiwibWVyZ2VTeW1ib2xzIiwiZmlyc3QiLCJzZWNvbmQiLCJLZXl3b3JkIiwicGF0dGVyblN0cmluZyIsIm1lcmdlS2V5d29yZHMiLCJTdWJydWxlIiwiaXNEZXRlcm1pbmlzdGljIiwiTmVzdGVkIiwiZXZlcnkiLCJTZXF1ZW5jZSIsInJlc3VsdHMiLCJuZXh0IiwicHVzaCIsInJhbmdlIiwic2VxdWVuY2UiLCJhcmdzIiwiYXJnTmFtZSIsIl9hcmciLCJBcnJheSIsImlzQXJyYXkiLCJFeHByZXNzaW9uIiwiZG9udFJlY3Vyc2UiLCJsZWZ0UmVjdXJzaXZlIiwiU3RhdGVtZW50IiwiYmVzdE1hdGNoIiwiY29udGV4dCIsInRvU291cmNlIiwiUmVwZWF0IiwiaW5jbHVkZXMiLCJyZXBlYXQiLCJMaXN0IiwiaXRlbSIsImRlbGltaXRlciIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJsYXN0IiwicG9wIiwic3ludGF4VG9rZW4iLCJwYXJzZVJ1bGVTeW50YXhfc3RyaW5nIiwicGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUiLCJwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMiLCJwYXJzZVJ1bGVTeW50YXhfbGlzdCIsInBhcnNlUnVsZVN5bnRheF9yZXBlYXQiLCJzdGFydHNXaXRoIiwic3Vic3RyIiwidG9TdHJpbmciLCJmaW5kTmVzdGVkVG9rZW5zIiwiYWx0ZXJuYXRpdmVzIiwiZ3JvdXBBbHRlcm5hdGl2ZXMiLCJjdXJyZW50IiwiaSIsImNvbmNhdCIsInN5bWJvbCIsInBhcmFtcyIsImJhbmdQb3NpdGlvbiIsImluZGV4T2YiLCJub3QiLCJkZWZpbmVQcm9wZXJ0aWVzIiwiYWRkU3ludGF4IiwicnVsZVN5bnRheCIsImUiLCJlcnJvciIsImFkZFN0YXRlbWVudCIsImFkZEV4cHJlc3Npb24iLCJhZGRJbmZpeE9wZXJhdG9yIiwidG9KUyIsIl9faW5maXhPcGVyYXRvcnMiLCJpbmZpeE9wZXJhdG9ycyIsImFkZFBvc3RmaXhPcGVyYXRvciIsIl9fcG9zdGZpeE9wZXJhdG9ycyIsInBvc3RmaXhPcGVyYXRvcnMiLCJXaGl0ZXNwYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJyZXBsYWNlIiwiYWRkVG9CbGFja2xpc3QiLCJUeXBlIiwidHlwZSIsIk51bWJlciIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJJbnRlZ2VyIiwicGFyc2VJbnQiLCJUZXh0IiwidGV4dCIsIkJvb2xlYW4iLCJib29sIiwiVGV4dFN0cmVhbSIsInRleHRPclByb3BzIiwiYXJnIiwiaGVhZCIsInRlc3QiLCJzdWJzdHJpbmciLCJtZW1vaXplZCIsImRlZmluZU1lbW9pemVkIiwicHJvcGVydHkiLCJnZXR0ZXIiLCJhcHBseSIsImNvbmZpZ3VyYWJsZSIsImdldCIsImV4cHJlc3Npb24iLCJyZXZlcnNlIiwidGhpbmciLCJhc3NpZ25tZW50Iiwic2NvcGUiLCJwbHVyYWwiLCJ0b1VwcGVyQ2FzZSIsInZhbHVlcyIsImZpcnN0VmFsdWUiLCJpbmRleF9leHByZXNzaW9uIiwib3JkaW5hbCIsImEiLCJiIiwibGhzIiwicmhzIiwib3BlcmF0b3IiXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxtREFBMkMsY0FBYzs7QUFFekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7OztBQzdEQTs7OztBQUNBOzs7Ozs7QUFFQTtBQU5BO0FBQ0E7QUFDQTtBQUtBLElBQU1BLFNBQVMsc0JBQWY7a0JBQ2VBLE07O0FBRWY7O0FBQ0FDLE9BQU9ELE1BQVAsR0FBZ0JBLE1BQWhCLEM7Ozs7Ozs7Ozs7Ozs7cWpCQ1hBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUE7QUFDQSxJQUFJLENBQUNFLFFBQVFDLEtBQWIsRUFBb0JELFFBQVFDLEtBQVIsR0FBZ0JELFFBQVFFLEdBQXhCO0FBQ3BCLElBQUksQ0FBQ0YsUUFBUUcsUUFBYixFQUF1QkgsUUFBUUcsUUFBUixHQUFtQkgsUUFBUUUsR0FBM0I7O0lBRUZFLE07QUFJcEIsaUJBQVlDLFVBQVosRUFBd0I7QUFBQTs7QUFDdkJDLFNBQU9DLE1BQVAsQ0FB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QUFQLENBQW9CLElBQXBCLEVBQTBCLGdDQUExQixFQUE0RDtBQUUzRDFDLFNBRjJELG9CQUVsREQsT0FGa0QsRUFFekMsQ0FDakI7QUFIMEQsQ0FBNUQsRSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGlkZW50aXR5IGZ1bmN0aW9uIGZvciBjYWxsaW5nIGhhcm1vbnkgaW1wb3J0cyB3aXRoIHRoZSBjb3JyZWN0IGNvbnRleHRcbiBcdF9fd2VicGFja19yZXF1aXJlX18uaSA9IGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiB2YWx1ZTsgfTtcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7XG4gXHRcdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuIFx0XHRcdFx0ZW51bWVyYWJsZTogdHJ1ZSxcbiBcdFx0XHRcdGdldDogZ2V0dGVyXG4gXHRcdFx0fSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiL1wiO1xuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IDEyKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCAwMjVlNzVhNzg0NWFlM2FmNTM1NyIsIi8vXG4vL1x0IyBDcmVhdGUgYSBgcGFyc2VyYCBzaW5nbGV0b24gdG8gdXNlIHRvIHNldCB1cCBydWxlcyBhbmQgZHVyaW5nIHRlc3RzLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcblxuLy8gQ3JlYXRlIHBhcnNlciBpbnN0YW5jZS5cbmNvbnN0IHBhcnNlciA9IG5ldyBQYXJzZXIoKTtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbndpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9fcGFyc2VyLmpzIiwiLy8gU3BlbGwgXCJFbmdsaXNoXCIgcGFyc2VyIHN0cmF3bWFuXG5cbi8vIFRPRE86XHRgdGVzdGAgZnVuY3Rpb24gZm9yIHF1aWNrIG5vLWdvb2QgaGl0IG9uIGB7YX0gYmxhaCBibGFoIHtifWA/XG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcms6ICAgYHtleHByZXNzaW9ufSBpcyB7ZXhwcmVzc2lvbn1gXG4vLyBUT0RPOlx0YnJlYWsgYGZpbGVgIGludG8gbGluZXMgYW5kIHByb2Nlc3MgZWFjaCAoaW5jbC4gc3Vic3RyL21hdGNoIG5vdCBnb2luZyBiZXlvbmQgdGhlIGVuZClcbi8vIFRPRE86XHRuZXN0aW5nIC0tIGlzIHRoaXMganVzdCBpbmRlbnQgPSBcImFkZCBibG9jayBzY29wZVwiXG4vLyBUT0RPOlx0cHJvbW90aW9uIHBhdHRlcm4gZm9yIGdhdGhlciBhcmd1bWVudHMgKGVnOiBsaXRlcmFsLWxpc3QpID8/P1xuLy8gVE9ETzpcdFdoYXQgZG9lcyBzeW50YXggdHJlZSBsb29rIGxpa2U/ICBIb3cgZG8gd2UgZXh0cmFjdCBtZWFuaW5nIG91dCBvZiB0aGUgbmVzdD9cbi8vIFRPRE86XHRQYXNzIGBjb250ZXh0YCB0byB0b1NvdXJjZSgpLCBhZGQgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYGNsYXNzYCwgdmFyaWFibGVzIGFuZCBjb2RlIHRvIGBtZXRob2RgLCBgZ2xvYmFsYCBzdHVmZiBldGNcblxuaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ2xvbmUgcnVsZXMsIHN0YXJ0aW5nIHdpdGggYSBjb21wbGV0ZWx5IGVtcHR5IG1hcCBpZiBub3QgZGVmaW5lZCAobm8gc3RhbmRhcmQgb2JqZWN0IGtleXMpXG5cdFx0dGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5ydWxlcyB8fCBudWxsKTtcblx0fVxuXG5cdGdldFJ1bGUobmFtZSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzW25hbWVdO1xuXHR9XG5cbi8vXG4vLyMjIyBQYXJzaW5nXG4vL1xuXHQvLyBQYXJzZSBgbmFtZWBkIHJ1bGUgYXQgaGVhZCBvZiBgc3RyZWFtYCAoYHN0cmluZ2Agb3IgYFRleHRTdHJlYW1gKS5cblx0Ly8gSGFuZGxlcyBvcHRpb25hbCBhbmQgcmVwZWF0aW5nIHJ1bGVzIGFzIHdlbGwgYXMgZWF0aW5nIHdoaXRlc3BhY2UuXG5cdC8vIFJldHVybnMgcmVzdWx0IG9mIHBhcnNlLlxuXHRwYXJzZShuYW1lLCBzdHJlYW0pIHtcblx0XHRpZiAodHlwZW9mIHN0cmVhbSA9PT0gXCJzdHJpbmdcIikgc3RyZWFtID0gbmV3IFRleHRTdHJlYW0oc3RyZWFtKTtcblx0XHRsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShuYW1lKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2VyLnBhcnNlKCR7bmFtZX0pOiBSdWxlIG5vdCBmb3VuZGApO1xuXHRcdHN0cmVhbSA9IHRoaXMuZWF0V2hpdGVzcGFjZShzdHJlYW0pO1xuXHRcdHJldHVybiBydWxlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdH1cblxuXHQvLyBFYXQgd2hpdGVzcGFjZSAoYWNjb3JkaW5nIHRvIGBydWxlcy53aGl0ZXNwYWNlYCkgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG5ldyBzdHJlYW0gaWYgd2UgbWF0Y2hlZCB3aGl0ZXNwYWNlLCBvdGhlcndpc2UgdGhlIHNhbWUgc3RyZWFtLlxuXHRlYXRXaGl0ZXNwYWNlKHN0cmVhbSkge1xuXHRcdGxldCByZXN1bHQgPSB0aGlzLnJ1bGVzLndoaXRlc3BhY2UucGFyc2UodGhpcywgc3RyZWFtKTtcblx0XHRpZiAoIXJlc3VsdCkgcmV0dXJuIHN0cmVhbTtcblx0XHRyZXR1cm4gc3RyZWFtLmFkdmFuY2VCeShyZXN1bHQubWF0Y2hlZC5sZW5ndGgpO1xuXHR9XG5cblx0Ly8gQWRkIGEgcnVsZSB0byBvdXIgbGlzdCBvZiBydWxlcyFcblx0Ly8gQ29udmVydHMgdG8gYGFsdGVybmF0aXZlc2Agb24gcmUtZGVmaW5pbmcgdGhlIHNhbWUgcnVsZS5cblx0YWRkUnVsZShuYW1lLCBydWxlKSB7XG5cdFx0bGV0IGV4aXN0aW5nID0gdGhpcy5ydWxlc1tuYW1lXTtcblx0XHRpZiAoZXhpc3RpbmcpIHtcblx0XHRcdGlmICghKGV4aXN0aW5nIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpKSB7XG5cdFx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBDb252ZXJ0aW5nIHJ1bGUgJyR7bmFtZX0nIHRvIGFsdGVybmF0aXZlc2ApO1xuXHRcdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZU5hbWU6IG5hbWUsIHJ1bGVzOiBbZXhpc3RpbmddIH0pO1xuXHRcdFx0XHQvLyBjb3B5IGFyZ3VtZW50IG5hbWUgb3ZlciAoPz8/KVxuXHRcdFx0XHRpZiAoZXhpc3RpbmcuYXJndW1lbnQpIHRoaXMucnVsZXNbbmFtZV0uYXJndW1lbnQgPSBleGlzdGluZy5hcmd1bWVudDtcblx0XHRcdH1cblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRpbmcgcnVsZSAnJHtydWxlLnJ1bGVOYW1lfScgdG8gJyR7bmFtZX0nOiBgLCBydWxlKTtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0uYWRkUnVsZShydWxlKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHQvLyBkb24ndCBvdmVycmlkZSBydWxlTmFtZVxuXHRcdFx0aWYgKCFydWxlLnJ1bGVOYW1lKSBydWxlLnJ1bGVOYW1lID0gbmFtZTtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBydWxlO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cbi8vXG4vLyAjIyBVdGlsaXR5IG1ldGhvZHNcbi8vXG5cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmBcblx0Ly9cdGluIGFycmF5IG9mIGB0b2tlbnNgIChzdHJpbmdzKS5cblx0Ly8gSWYgc3VjY2Vzc2Z1bCwgcmV0dXJucyBgeyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2UgfWBcblx0Ly8gVGhyb3dzIGlmIHVuc3VjZXNzZnVsLlxuXHRzdGF0aWMgZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIHN0YXJ0VG9rZW4sIGVuZFRva2VuLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGlmICh0b2tlbnNbc3RhcnRJbmRleF0gIT09IHN0YXJ0VG9rZW4pIHRocm93IG5ldyBTeW50YXhFcnJvcihgRXhwZWN0ZWQgJyR7c3RhcnRUb2tlbn0nIGF0IGluZGV4ICR7c3RhcnRJbmRleH0gb2YgdG9rZW5zYCk7XG5cdFx0bGV0IG5lc3RpbmcgPSAwO1xuXHRcdGxldCBuZXN0ZWQgPSBmYWxzZTtcblx0XHRmb3IgKGxldCBlbmRJbmRleCA9IHN0YXJ0SW5kZXggKyAxLCBsYXN0SW5kZXggPSB0b2tlbnMubGVuZ3RoOyBlbmRJbmRleCA8IGxhc3RJbmRleDsgZW5kSW5kZXgrKykge1xuXHRcdFx0bGV0IHRva2VuID0gdG9rZW5zW2VuZEluZGV4XTtcblx0XHRcdGlmICh0b2tlbiA9PT0gc3RhcnRUb2tlbikge1xuXHRcdFx0XHRuZXN0aW5nKys7XG5cdFx0XHRcdG5lc3RlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodG9rZW4gPT09IGVuZFRva2VuKSB7XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKVxuXHRcdFx0XHRcdHJldHVybiB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZTogdG9rZW5zLnNsaWNlKHN0YXJ0SW5kZXgrMSwgZW5kSW5kZXgpLCBuZXN0ZWQgfTtcblx0XHRcdFx0bmVzdGluZy0tO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENvdWxkbid0IGZpbmQgbWF0Y2hpbmcgJyR7ZW5kVG9rZW59J3Mgc3RhcnRpbmcgYXQgaXRlbSAke3N0YXJ0SW5kZXh9YCk7XG5cdH1cblxuXG5cdC8vIExpc3Qgb2Ygc3BlY2lhbCBjaGFyYWN0ZXJzIGluIHJlZ3VsYXIgZXhwcmVzc2lvbnMuXG5cdC8vIFVzZWQgdG8gZXNjYXBlIHRob3NlIGNoYXJzIHdoZW4gY3JlYXRpbmcgcmVndWxhciBleHByZXNzaW9ucyBmcm9tIHN0cmluZ3MuXG5cdHN0YXRpYyBSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTID0gKGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IGNoYXJzID0ge307XG5cdFx0XCJcXFxcL14kKis/LigpfHt9LFtdXCIuc3BsaXQoXCJcIikuZm9yRWFjaChjaGFyID0+IGNoYXJzW2NoYXJdID0gdHJ1ZSk7XG5cdFx0cmV0dXJuIGNoYXJzO1xuXHR9KSgpXG5cblx0Ly8gR2l2ZW4gYSBcIm5vcm1hbFwiIGBzdHJpbmdgLCBlc2NhcGUgYW55IHJlZ3VsYXIgZXhwcmVzc2lvbiBzcGVjaWFsIGNoYXJhY3RlcnNcblx0Ly9cdHNvIHdlIGNhbiBjcmVhdGUgYSBgbmV3IFJlZ0V4cCgpYC5cblx0Ly8gQWxzbyBjb252ZXJ0cyBhIHNpbmdsZSBzcGFjZSB0byBhcmJpdHJhcnkgc2V0IG9mIHNwYWNlcyB3aXRoIFwiXFxzK1wiXG5cdHN0YXRpYyBlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZykge1xuXHRcdHJldHVybiBzdHJpbmcuc3BsaXQoXCJcIikubWFwKGZ1bmN0aW9uIChjaGFyLCBpbmRleCwgbGlzdCkge1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBiYWNrc2xhc2hcblx0XHRcdGlmIChjaGFyID09PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiO1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBzcGFjZVxuXHRcdFx0aWYgKGNoYXIgPT09IFwiIFwiKSByZXR1cm4gXCJcXFxccytcIjtcblx0XHRcdC8vIElmIGEgc3BlY2lhbCBjaGFyIGFuZCBwcmV2aW91cyBjaGFyYWN0ZXIgd2FzIG5vdCBhbiBlc2NhcGUsIGVzY2FwZSB0aGUgcmVzdWx0LlxuXHRcdFx0aWYgKFBhcnNlci5SRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTW2NoYXJdICYmIGxpc3RbaW5kZXgtMV0gIT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCIrY2hhcjtcblx0XHRcdC8vIFRoaXMgY2hhciBzaG91bGQgYmUgZmluZSBieSBpdHNlbGYuXG5cdFx0XHRyZXR1cm4gY2hhcjtcblx0XHR9KS5qb2luKFwiXCIpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgbmV3IHJlZ3VsYXIgZXhwcmVzc2lvbiBmcm9tIGEgXCJub3JtYWxcIiBzdHJpbmcsIGVzY2FwaW5nIHNwZWNpYWwgY2hhcmFjdGVycyBhcyBuZWNlc3NhcnkuXG5cdHN0YXRpYyBSZWdFeHBGcm9tU3RyaW5nKHN0cmluZywgZmxhZ3MpIHtcblx0XHRyZXR1cm4gbmV3IFJlZ0V4cChQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpLCBmbGFncyk7XG5cdH1cblxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUGFyc2VyLmpzIiwiLy9cdCMgUGFyc2VyIFJ1bGVzXG4vL1x0UnVsZXMgY2FuIGJlIGFzIHNpbXBsZSBhcyBhIHN0cmluZyBgS2V5d29yZGAgb3IgYSBjb21wbGV4IHNlcXVlbmNlIG9mIChuZXN0ZWQpIHJ1bGVzLlxuLy9cbi8vXHRQYXJzZSBhIHJ1bGUgd2l0aCBgcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSlgLCB0aGlzIHdpbGwgZWl0aGVyOlxuLy9cdFx0LSByZXR1cm4gYHVuZGVmaW5lZGAgaWYgdGhlIHJ1bGUgZG9lc24ndCBtYXRjaCB0aGUgaGVhZCBvZiB0aGUgc3RyZWFtLCBvclxuLy9cdFx0LSByZXR1cm4gYSBDTE9ORSBvZiB0aGUgcnVsZSB3aXRoIGF0IGxlYXN0IHRoZSBmb2xsb3dpbmc6XG4vL1x0XHRcdC0gYHN0cmVhbWBcdFx0U3RyZWFtIHdoaWNoIHdhcyBtYXRjaGVkIHdpdGggYHN0YXJ0SW5kZXhgIGF0IHRoZSBzdGFydCBvZiB0aGUgbWF0Y2hcbi8vXHRcdFx0LSBgZW5kSW5kZXhgXHROb24taW5jbHVzaXZlIGVuZCBpbmRleCBpbiBzdHJlYW0gd2hlcmUgbWF0Y2ggZW5kcy5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLmdhdGhlckFyZ3VtZW50cygpYFx0XHRSZXR1cm4gbWF0Y2hlZCBhcmd1bWVudHMgaW4gYSBmb3JtYXQgc3VpdGFibGUgdG8gZG86XG4vL1x0XHQtIGBydWxlLnRvU291cmNlKClgXHRcdFx0XHRSZXR1cm4gamF2YXNjcmlwdCBzb3VyY2UgdG8gaW50ZXJwcmV0IHRoZSBydWxlLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5cblxuLy9UT0RPOiBtYWtlIGdhdGhlckFyZ3VtZW50cygpIHN0YXRpYyBhbmQgY2FsbCBvbiB0aGlzXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKHRoaXMuY29uc3RydWN0b3IgIT09IFJ1bGUgfHwgIXRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLmhhc093blByb3BlcnR5KFwiY29uc3RydWN0b3JcIikpIHtcbi8vY29uc29sZS53YXJuKFwibm90IHJ1bGVcIiwgdGhpcyk7XG5cdFx0fVxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKC4uLnByb3BzKSB7XG5cdFx0bGV0IGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCAuLi5wcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuLy9cbi8vXHRQYXJzaW5nIHByaW1pdGl2ZXMgLS0geW91IE1VU1QgaW1wbGVtZW50IHRoZXNlIGluIHlvdXIgc3ViY2xhc3NlcyFcbi8vXG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHJ1bGUgaW4gdGhlIGBzdHJlYW1gLlxuXHQvLyBSZXR1cm5zIHJlc3VsdHMgb2YgdGhlIHBhcnNlIG9yIGB1bmRlZmluZWRgLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBJcyB0aGlzIHJ1bGUgZGV0ZXJtaW5pc3RpYywgZWc6IGNhbiBpdCBiZSBxdWlja2x5IGFuZCB1bmFtYmlndW91c2x5IHNhdGlzZmllZD9cblx0Ly8gUmV0dXJuaW5nIGB0cnVlYCBjYW4gc3BlZWQgdXAgc2VxdWVuY2UgcHJvY2Vzc2luZyxcblx0Ly9cdGJ1dCBpZiB5b3UncmUgcmVhbGx5IG5vdCBzdXJlLCByZXR1cm4gYHVuZGVmaW5lZGAuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cdGdldCBfYXJnKCkgeyByZXR1cm4gdGhpcy5hcmd1bWVudCB8fCB0aGlzLnJ1bGVOYW1lIHx8IHRoaXMuY29uc3RydWN0b3IubmFtZSB9XG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gTm90ZSB0aGF0IHdlIGRlZmluZSBgZ2F0aGVyQXJndW1lbnRzKClgIHN0YXRpY2FsbHkgb24gZWFjaCBzdWJjbGFzc1xuXHQvL1x0YW5kIHRoZW4gaW5zdGFuY2UgbWV0aG9kIGNhbGxzIGl0IG9uIGl0c2VsZi5cblx0c3RhdGljIGdhdGhlckFyZ3VtZW50cyhydWxlKSB7XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblx0Z2F0aGVyQXJndW1lbnRzKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLmdhdGhlckFyZ3VtZW50cyh0aGlzKTtcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQ7XG5cdH1cblxuLy9cbi8vICMjIGdyb3VwOiByZWZsZWN0aW9uXG4vL1xuXHRnZXQgcnVsZVR5cGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0fVxufVxuXG5cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vXG4vLyBOT1RFXHRUbyBtYWtlIHRoaXMgbW9yZSBnZW5lcmFsbHkgYXBwbGljYWJsZSwgZG8gTk9UIHN0YXJ0IHRoZSBwYXR0ZXJuIHdpdGggYSBgXmAuXG4vL1x0XHRXZSdsbCBhdXRvbWF0aWNhbGx5IG1ha2UgYSBjb3B5IG9mIHRoZSBSZWdFeHAgd2l0aCB0aGUgc3RhcnQgcG9pbnQgYXR0YWNoZWRcbi8vXHRcdGFuZCB1c2UgdGhhdCBhcyBhcHByb3ByaWF0ZS5cbi8vXG4vL1x0XHRUaGlzIHdheSB3ZSBjYW4gcmUtdXNlIHRoZSByZWdleCB0byBjaGVjayBmb3IgYSBtYXRjaCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBzdHJlYW0uLi5cbi8vXG4vLyBZb3UgY2FuIG9wdGlvbmFsbHkgc3BlY2lmeSBhIGBydWxlLmJsYWNrbGlzdGAsIGEgc2V0IG9mIG1hdGNoZXMgd2hpY2ggd2lsbCBzcGVjaWZpY2FsbHkgTk9UIHdvcmssXG4vL1x0ZWcgZm9yIGBpZGVudGlmaWVyLlxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHBhdHRlcm5gIGlzIHJlcXVpcmVkXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5QYXR0ZXJuKCk6IFlvdSBtdXN0IHBhc3MgYSBgcGF0dGVybmAgcGFyYW1ldGVyXCIpO1xuXG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cblx0XHQvLyBDcmVhdGUgYSBgc3RhcnRQYXR0ZXJuYCB0byBtYXRjaCBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJvbmdcblx0XHQvLyBDcmVhdGUgbm9uLWVudW1lcmFibHkuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic3RhcnRQYXR0ZXJuXCIsIHsgdmFsdWU6IG5ldyBSZWdFeHAoXCJeXCIgKyB0aGlzLnBhdHRlcm4uc291cmNlKSB9KTtcblx0fVxuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBwYXR0ZXJuIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5zdGFydFBhdHRlcm4pO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBiYWlsIGlmIHByZXNlbnQgaW4gYmxhY2tsaXN0XG5cdFx0bGV0IG1hdGNoZWQgPSBtYXRjaFswXTtcblx0XHRpZiAodGhpcy5ibGFja2xpc3QgJiYgdGhpcy5ibGFja2xpc3RbbWF0Y2hlZF0pIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiBtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgbWF0Y2hlZC5sZW5ndGgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFBhdHRlcm5zIGFyZSBBTFdBWVMgZGV0ZXJtaW5pc3RpYy5cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRhZGRUb0JsYWNrbGlzdCguLi53b3Jkcykge1xuXHRcdGlmICghdGhpcy5ibGFja2xpc3QpIHRoaXMuYmxhY2tsaXN0ID0ge307XG5cdFx0d29yZHMuZm9yRWFjaCh3b3JkID0+IHRoaXMuYmxhY2tsaXN0W3dvcmRdID0gdHJ1ZSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5wYXR0ZXJuLnNvdXJjZTtcblx0fVxufVxuXG4vLyBSdWxlIGZvciBsaXRlcmFsIHN0cmluZyB2YWx1ZSwgd2hpY2ggaW5jbHVkZSBwdW5jdHVhdGlvbiBzdWNoIGFzIGAoYCBldGMuXG4vLyBgU3ltYm9sYHMgYXJlIGRpZmZlcmVudCBmcm9tIGBLZXl3b3Jkc2AgaW4gdGhhdCB0aGV5IGRvIG5vdCByZXF1aXJlIGEgd29yZCBib3VuZGFyeS5cbi8vVE9ETzogcmVuYW1lIGBTeW1ib2xgPz8/XG5SdWxlLlN5bWJvbCA9IGNsYXNzIFN5bWJvbCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgc3RyaW5nYCBpcyByZXF1aWVkLlxuXHRcdGlmICghcHJvcGVydGllcy5zdHJpbmcpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5TeW1ib2woKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gY29udmVydCBzdHJpbmcgdG8gcGF0dGVyblxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBQYXJzZXIuUmVnRXhwRnJvbVN0cmluZyhwcm9wZXJ0aWVzLnN0cmluZyk7XG4vL2NvbnNvbGUuaW5mbyhwcm9wZXJ0aWVzLnN0cmluZywgcHJvcGVydGllcy5wYXR0ZXJuKTtcblx0XHR9XG5cbi8vXHRcdGNvbnNvbGUuaW5mbyhcImNyZWF0aW5nIHN0cmluZ1wiLCBwcm9wZXJ0aWVzKTtcblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMuc3RyaW5nfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuLy8gTWVyZ2UgdHdvIFN5bWJvbCBydWxlcyB0b2dldGhlciwgcmV0dXJuaW5nIGEgbmV3IHJ1bGUgdGhhdCBtYXRjaGVzIGJvdGguXG5SdWxlLm1lcmdlU3ltYm9scyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0cmV0dXJuIG5ldyBSdWxlLlN5bWJvbCh7IHN0cmluZzogZmlyc3Quc3RyaW5nICsgc2Vjb25kLnN0cmluZyB9KTtcbn1cblxuLy8gS2V5d29yZCBwYXR0ZXJuLlxuLy8gUHJvcGVydGllczpcbi8vXHQtIGBydWxlLnN0cmluZ2AgXHQocmVxdWlyZWQpIFx0S2V5d29yZCBzdHJpbmcgdG8gbWF0Y2guXG4vL1x0LSBgcnVsZS5wYXR0ZXJuYFx0KG9wdGlvbmFsKSBcdFJlZ0V4cCBmb3IgdGhlIG1hdGNoLlxuLy9cdFx0XHRcdFx0XHRcdFx0XHRXZSdsbCBjcmVhdGUgb25lIGZyb20gYHN0cmluZ2AgaWYgbmVjZXNzYXJ5LlxuLy9cdFx0XHRcdFx0XHRcdFx0XHROT1RFOiBkbyBOT1Qgc3RhcnQgdGhlIGBwYXR0ZXJuYCB3aXRoIGBeYC5cblJ1bGUuS2V5d29yZCA9IGNsYXNzIEtleXdvcmQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHN0cmluZ2AgaXMgcmVxdWllZC5cblx0XHRpZiAoIXByb3BlcnRpZXMuc3RyaW5nKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuS2V5d29yZCgpOiBFeHBlY3RlZCBzdHJpbmcgcHJvcGVydHlcIik7XG5cblx0XHQvLyBkZXJpdmUgYHBhdHRlcm5gIGlmIG5lY2Vzc2FyeS5cblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikge1xuXHRcdFx0Ly8gZW5mb3JjZSB3b3JkIGJvdW5kYXJpZXMgYW5kIGFsbG93IGFyYml0cmFyeSBzcGFjZSBiZXR3ZWVuIHdvcmRzXG5cdFx0XHRsZXQgcGF0dGVyblN0cmluZyA9IFBhcnNlci5lc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHByb3BlcnRpZXMuc3RyaW5nKTtcblx0XHRcdHByb3BlcnRpZXMucGF0dGVybiA9IG5ldyBSZWdFeHAoXCJcXFxcYlwiICsgcGF0dGVyblN0cmluZyArIFwiXFxcXGJcIik7XG5cdFx0fVxuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMuc3RyaW5nfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG4vLyBNZXJnZSB0d28gS2V5d29yZCBydWxlcyB0b2dldGhlciwgYWRkaW5nIHRoZSBzZWNvbmQgdG8gdGhlIGZpcnN0LlxuUnVsZS5tZXJnZUtleXdvcmRzID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuXHRyZXR1cm4gbmV3IFJ1bGUuS2V5d29yZCh7IHN0cmluZzogZmlyc3Quc3RyaW5nICsgXCIgXCIgKyBzZWNvbmQuc3RyaW5nIH0pO1xufVxuXG5cbi8vIFN1YnJ1bGUgLS0gbmFtZSBvZiBhbm90aGVyIHJ1bGUgdG8gYmUgY2FsbGVkLlxuLy8gYHJ1bGUucnVsZWAgaXMgdGhlIG5hbWUgb2YgdGhlIHJ1bGUgaW4gYHBhcnNlci5ydWxlc2AuXG5SdWxlLlN1YnJ1bGUgPSBjbGFzcyBTdWJydWxlIGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZSh0aGlzLnJ1bGUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBBdHRlbXB0aW5nIHRvIHBhcnNlIHVua25vd24gcnVsZSAnJHt0aGlzLnJ1bGV9J2ApO1xuXHRcdGxldCByZXN1bHQgPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKTtcblx0XHRpZiAoIXJlc3VsdCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSByZXN1bHQuYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlKHRoaXMucnVsZSk7XG5cdFx0aWYgKCFydWxlKSByZXR1cm4gZmFsc2U7XG5cdFx0cmV0dXJuIHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgeyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlfX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuXG4vLyBBYnN0cmFjdDogIGBOZXN0ZWRgIHJ1bGUgLS0gY29tcG9zZWQgb2YgYSBzZXJpZXMgb2Ygb3RoZXIgYHJ1bGVzYC5cblJ1bGUuTmVzdGVkID0gY2xhc3MgTmVzdGVkIGV4dGVuZHMgUnVsZSB7XG5cblx0Ly8gSXMgdGhpcyBkZXRlcm1pbmlzdGljLCBlZzogYXJlIG91ciBzdWJydWxlcyB1bmFtYmlnb3VzbHkgZGV0ZXJtaW5hYmxlP1xuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlcy5ldmVyeShydWxlID0+IHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSk7XG5cdH1cbn1cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaCAoYXV0by1leGNsdWRpbmcgd2hpdGVzcGFjZSkuXG5SdWxlLlNlcXVlbmNlID0gY2xhc3MgU2VxdWVuY2UgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IHJlc3VsdHMgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCByZXN1bHQgPSBydWxlLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIXJlc3VsdCAmJiAhcnVsZS5vcHRpb25hbCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdGlmIChyZXN1bHQpIHtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cdFx0XHRcdG5leHQgPSByZXN1bHQubmV4dCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBpZiB3ZSBnZXQgaGVyZSwgd2UgbWF0Y2hlZCBhbGwgdGhlIHJ1bGVzIVxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdHJlc3VsdHMsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vVE9ET0Ncblx0Ly8gR2F0aGVyIGFyZ3VtZW50cyBmcm9tIG91ciBwYXJzZWQgYHJlc3VsdHNgIGFycmF5LlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYHZhbHVlc2AgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGByZXN1bHRzLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYHJlc3VsdHMucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gcnVsZSB0eXBlOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdHN0YXRpYyBnYXRoZXJBcmd1bWVudHMoc2VxdWVuY2UpIHtcblx0XHRpZiAoIXNlcXVlbmNlLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IGFyZ3MgPSB7fTtcblx0XHRmb3IgKGxldCBuZXh0IG9mIHNlcXVlbmNlLnJlc3VsdHMpIHtcblx0XHRcdGxldCBhcmdOYW1lID0gbmV4dC5fYXJnO1xuXHRcdFx0Ly8gRm9yIG5lc3RlZCBydWxlcywgcmVjdXJzZSB0byBnZXQgdGhlaXIgYXJndW1lbnRzXG5cdFx0XHRsZXQgcmVzdWx0ID0gbmV4dC5nYXRoZXJBcmd1bWVudHMoKTtcblxuXHRcdFx0Ly8gSWYgYXJnIGFscmVhZHkgZXhpc3RzLCBjb252ZXJ0IHRvIGFuIGFycmF5XG5cdFx0XHRpZiAoYXJnTmFtZSBpbiBhcmdzKSB7XG5cdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShhcmdzW2FyZ05hbWVdKSkgYXJnc1thcmdOYW1lXSA9IFthcmdzW2FyZ05hbWVdXTtcblx0XHRcdFx0YXJnc1thcmdOYW1lXS5wdXNoKHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0YXJnc1thcmdOYW1lXSA9IHJlc3VsdDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGFyZ3M7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlcy5qb2luKFwiIFwiKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG5cbn1cblxuLy8gU3ludGFjdGljIHN1Z2FyIGZvciBkZWJ1Z2dpbmdcblJ1bGUuRXhwcmVzc2lvbiA9IGNsYXNzIGV4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRpZiAodGhpcy5kb250UmVjdXJzZSkge1xuLy9jb25zb2xlLndhcm4oXCJOT1QgcmVjdXJzaW5nIGludG8gXCIsIHRoaXMpO1xuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cdFx0Ly8gSWYgdGhlIGV4cHJlc3Npb24gaXMgbGVmdFJlY3Vyc2l2ZSwgc2V0IGEgZmxhZyBzbyB3ZSBkb24ndCBhdHRlbXB0IHRvIHJlY3Vyc2UgaW50byBpdCBhZ2Fpbi5cbi8vVE9ETzogdGhpcyBpcyBkYW5nZXJvdXM6IGFuIGV4Y2VwdGlvbiB3aWxsIGxlYXZlIHRoZSBmbGFnIHNldC4uLlxuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdHRoaXMuZG9udFJlY3Vyc2UgPSB0cnVlO1xuLy9jb25zb2xlLndhcm4oXCJTZXR0aW5nIGRvbnRSZWN1cnNlIGZvclwiLCB0aGlzKTtcblx0XHR9XG5cdFx0bGV0IHJlc3VsdCA9IHN1cGVyLnBhcnNlKHBhcnNlciwgc3RyZWFtKTtcblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSBkZWxldGUgdGhpcy5kb250UmVjdXJzZTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG59XG5cblxuLy8gU3RhdGVtZW50cyB0YWtlIHVwIHRoZSBlbnRpcmUgbGluZS5cblJ1bGUuU3RhdGVtZW50ID0gY2xhc3Mgc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIEFsdGVybmF0aXZlIHN5bnRheCwgbWF0Y2hpbmcgb25lIG9mIGEgbnVtYmVyIG9mIGRpZmZlcmVudCBydWxlcy5cbi8vIFRoZSByZXN1bHQgb2YgYSBwYXJzZSBpcyB0aGUgbG9uZ2VzdCBydWxlIHRoYXQgYWN0dWFsbHkgbWF0Y2hlZC5cbi8vIE5PVEU6IEN1cnJlbnRseSB0YWtlcyB0aGUgbG9uZ2VzdCB2YWxpZCBtYXRjaC5cbi8vIFRPRE86IG1hdGNoIGFsbCB2YWxpZCBhbHRlcm5hdGl2ZXNcbi8vIFRPRE86IHJlbmFtZT9cblJ1bGUuQWx0ZXJuYXRpdmVzID0gY2xhc3MgQWx0ZXJuYXRpdmVzIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKTtcblx0XHRpZiAoIXRoaXMucnVsZXMpIHRoaXMucnVsZXMgPSBbXTtcblx0fVxuXG5cdC8vIEZpbmQgdGhlIExPTkdFU1QgbWF0Y2hcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgYmVzdE1hdGNoO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSk7XG5cdFx0XHRpZiAoIW1hdGNoKSBjb250aW51ZTtcblxuXHRcdFx0Ly8gdGFrZSB0aGUgbG9uZ2VzdCBtYXRjaFxuXHRcdFx0aWYgKCFiZXN0TWF0Y2ggfHwgbWF0Y2guZW5kSW5kZXggPiBiZXN0TWF0Y2guZW5kSW5kZXgpXG5cdFx0XHRcdGJlc3RNYXRjaCA9IG1hdGNoO1xuXHRcdH1cblx0XHRpZiAoIWJlc3RNYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGFzc2lnbiBgYXJnTmFtZWAgb3IgYHJ1bGVOYW1lYCBmb3IgYGdhdGhlckFyZ3VtZW50cygpYFxuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSBiZXN0TWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdGVsc2UgaWYgKHRoaXMucnVsZU5hbWUpIGJlc3RNYXRjaC5ydWxlTmFtZSA9IHRoaXMucnVsZU5hbWU7XG4vL1RPRE86IG90aGVyIHRoaW5ncyB0byBjb3B5IGhlcmU/Pz9cblx0XHRyZXR1cm4gYmVzdE1hdGNoO1xuXHR9XG5cblx0YWRkUnVsZShydWxlKSB7XG5cdFx0dGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5yZXN1bHRzYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgbmV4dCA9IHN0cmVhbTtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5ydWxlLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgYnJlYWs7XG5cblx0XHRcdHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0bmV4dCA9IHJlc3VsdC5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkOiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgZ2F0aGVyQXJndW1lbnRzKHJlcGVhdCkge1xuXHRcdGlmICghcmVwZWF0LnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHJlcGVhdC5yZXN1bHRzLm1hcCggcmVzdWx0ID0+IHJlc3VsdC5nYXRoZXJBcmd1bWVudHMoKSApO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0dGhyb3cgXCJEb24ndCB1bmRlcnN0YW5kIGhvdyB0byBzb3VyY2UgUnVsZS5SZXBlYXQhXCI7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRjb25zdCBydWxlID0gKHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UgfHwgdGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHRoaXMucnVsZS5zdHJpbmcuaW5jbHVkZXMoXCIgXCIpXG5cdFx0XHRcdCAgID8gYCgke3RoaXMucnVsZX0pYFxuXHRcdFx0XHQgICA6IGAke3RoaXMucnVsZX1gXG5cdFx0XHRcdCk7XG5cdFx0cmV0dXJuIGAke3J1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe251bWJlcn0sXWAgdG8gbWF0Y2ggYDEsMiwzYFxuLy9cdGBydWxlLml0ZW1gIGlzIHRoZSBydWxlIGZvciBlYWNoIGl0ZW0sXG4vL1x0YHJ1bGUuZGVsaW1pdGVyYCBpcyB0aGUgZGVsaW1pdGVyIGJldHdlZW4gZWFjaCBpdGVtLlxuLy8gXHRgcnVsZS5yZXN1bHRzYCBpbiB0aGUgb3V0cHV0IGlzIHRoZSBsaXN0IG9mIHZhbHVlcy5cbi8vXG4vL1xuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYSBMaXN0IHJ1bGUgd2lsbCBOT1QgcmVwZWF0ICg/Pz8/KVxuUnVsZS5MaXN0ID0gY2xhc3MgTGlzdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdC8vIGVuc3VyZSBpdGVtIGFuZCBkZWxpbWl0ZXIgYXJlIG9wdGlvbmFsIHNvIHdlIGRvbid0IGJhcmYgaW4gYHBhcnNlUnVsZWBcblx0XHR0aGlzLml0ZW0ub3B0aW9uYWwgPSB0cnVlO1xuXHRcdHRoaXMuZGVsaW1pdGVyLm9wdGlvbmFsID0gdHJ1ZTtcblxuXHRcdGxldCByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBuZXh0IGl0ZW0sIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgaXRlbSA9IHRoaXMuaXRlbS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFpdGVtKSBicmVhaztcbi8vY29uc29sZS5sb2coaXRlbSk7XG5cdFx0XHRyZXN1bHRzLnB1c2goaXRlbSk7XG5cdFx0XHRuZXh0ID0gaXRlbS5uZXh0KCk7XG5cblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBkZWxpbWl0ZXIsIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgZGVsaW1pdGVyID0gdGhpcy5kZWxpbWl0ZXIucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghZGVsaW1pdGVyKSBicmVhaztcblx0XHRcdG5leHQgPSBkZWxpbWl0ZXIubmV4dCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdHJlc3VsdHMsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHJlc3VsdHNbMF0gPyByZXN1bHRzWzBdLnN0YXJ0SW5kZXggOiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybiBtYXRjaGVkIGl0ZW0gYnkgaW5kZXhcblx0Z2V0SXRlbShpbmRleCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLnJlc3VsdHNbaW5kZXhdO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XHRcdC8vIFRPRE86IHRocm93Pz8/XG5cdFx0bGV0IHJlc3VsdHMgPSB0aGlzLnJlc3VsdHMubWFwKCByZXN1bHQgPT4gcmVzdWx0LnRvU291cmNlKCkgKS5qb2luKFwiLCBcIik7XG5cdFx0cmV0dXJuIGBbJHtyZXN1bHRzfV1gO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiaW1wb3J0IHsgZGVmaW5lTWVtb2l6ZWQgfSBmcm9tIFwiLi9tZW1vaXplLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyByZS1leHBvcnQgUnVsZSBmb3IgdGVzdGluZ1xuZXhwb3J0IGRlZmF1bHQgUnVsZTtcblxuLy9cbi8vXHQjIFBhcnNpbmcgYHJ1bGVTeW50YXhgIHRvIGNyZWF0ZSBydWxlcyBhdXRvbWF0aWNhbGx5LlxuLy9cbi8vIFRPRE86XHRQdWxsIGBwYXJzZVJ1bGVTeW50YXhgIHN0dWZmIG91dCBpbnRvIHNlcGFyYXRlIG1vZHVsZT9cbi8vIFRPRE86XHRCZXR0ZXIgbmFtZSBmb3IgYHJ1bGVTeW50YXhgXG4vLyBUT0RPOlx0VXNlIGtleXdvcmRzIGluIHN5bnRheCB0byBtYWtlIGEgcXVpY2sgcmVnZXgtYmFzZWQgYHRlc3RgIGZ1bmN0aW9uIGZvciB0aGUgZW50aXJlIHJ1bGVcbk9iamVjdC5hc3NpZ24oUnVsZSwge1xuXG4vL1xuLy8gIyMgZ3JvdXA6IHBhcnNpbmcgc3ludGF4XG4vL1xuXG4vLyBUT0RPOiBjb252ZXJ0IHRvIFRleHRTdHJlYW0gcGF0dGVybiBhbGEgbm9ybWFsIHBhcnNlciBvbmNlIHRoYXQgc2V0dGxlcyBkb3duPz8/XG5cdHBhcnNlUnVsZVN5bnRheChzeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0bGV0IHN5bnRheFN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCk7XG5cdFx0bGV0IHJ1bGVzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgW10pO1xuXG5cdFx0bGV0IHJ1bGU7XG5cdFx0Ly8gSWYgd2Ugb25seSBnb3Qgb25lIHRoaW5nLCByZXR1cm4gdGhhdCBhcyB0aGUgcmVzdWx0XG5cdFx0aWYgKHJ1bGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cnVsZSA9IHJ1bGVzWzBdO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgU2VxdWVuY2VDb25zdHJ1Y3Rvcih7IHJ1bGVzIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9LFxuXG5cdHRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpIHtcblx0XHRjb25zdCBTWU5UQVhfRVhQUkVTU0lPTiA9IC8oPzpbXFx3XFwtXSt8XFxcXFtcXFtcXChcXHtcXClcXH1cXF1dfFteXFxzXFx3XXxcXHwpL2c7XG5cdFx0dmFyIHN5bnRheFN0cmVhbSA9IHN5bnRheC5tYXRjaChTWU5UQVhfRVhQUkVTU0lPTik7XG5cdFx0aWYgKCFzeW50YXhTdHJlYW0pIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgdG9rZW5pemUgcGFyc2UgcnVsZSBzeW50YXggPj4ke3N5bnRheH08PGApO1xuXHRcdHJldHVybiBzeW50YXhTdHJlYW07XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBsYXN0SW5kZXggPSBzeW50YXhTdHJlYW0ubGVuZ3RoO1xuXHRcdHdoaWxlIChzdGFydEluZGV4IDwgbGFzdEluZGV4KSB7XG5cdFx0XHRsZXQgWyBydWxlLCBlbmRJbmRleCBdID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRpZiAocnVsZSkge1xuXHRcdFx0XHR2YXIgbGFzdCA9IHJ1bGVzW3J1bGVzLmxlbmd0aC0xXTtcblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBTdHJpbmdgIGFuZCBsYXN0IHdhcyBhIGBTdHJpbmdgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5TeW1ib2wgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sKSB7XG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBsYXN0IHJ1bGVcblx0XHRcdFx0XHRydWxlcy5wb3AoKTtcblx0XHRcdFx0XHQvLyBhbmQgcmVwbGFjZSB3aXRoIGEgcnVsZSB0aGF0IG1lcmdlcyB0aGUga2V5d29yZHNcblx0XHRcdFx0XHRydWxlID0gUnVsZS5tZXJnZVN5bWJvbHMobGFzdCwgcnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBLZXl3b3JkYCBhbmQgbGFzdCB3YXMgYWxzbyBhIGBLZXl3b3JkYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0ZWxzZSBpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQpIHtcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuXHRcdFx0XHRcdC8vIGFuZCByZXBsYWNlIHdpdGggYSBydWxlIHRoYXQgbWVyZ2VzIHRoZSBrZXl3b3Jkc1xuXHRcdFx0XHRcdHJ1bGUgPSBSdWxlLm1lcmdlS2V5d29yZHMobGFzdCwgcnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cnVsZXMucHVzaChydWxlKTtcblx0XHRcdH1cblx0XHRcdHN0YXJ0SW5kZXggPSBlbmRJbmRleCArIDE7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlcztcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDApIHtcblx0XHR2YXIgc3ludGF4VG9rZW4gPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHQvLyBpZiB3ZSBnb3QgYSBcIlxcXFxcIiAod2hpY2ggYWxzbyBoYXMgdG8gZ28gaW50byB0aGUgc291cmNlIHN0cmluZyBhcyBcIlxcXFxcIilcblx0XHQvLyB0cmVhdCB0aGUgbmV4dCB0b2tlbiBhcyBhIGxpdGVyYWwgc3RyaW5nIHJhdGhlciB0aGFuIGFzIGEgc3BlY2lhbCBjaGFyYWN0ZXIuXG5cdFx0aWYgKHN5bnRheFRva2VuID09PSBcIlxcXFxcIikge1xuXHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ICsgMSk7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChzeW50YXhUb2tlbikge1xuXHRcdFx0Y2FzZSBcIntcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIihcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCJbXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIqXCI6XG5cdFx0XHRjYXNlIFwiK1wiOlxuXHRcdFx0Y2FzZSBcIj9cIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cblx0XHRcdC8vIHRoZSBmb2xsb3dpbmcgc2hvdWxkIEFMV0FZUyBiZSBjb25zdW1lZCBieSB0aGUgYWJvdmVcblx0XHRcdGNhc2UgXCJ9XCI6XG5cdFx0XHRjYXNlIFwiKVwiOlxuXHRcdFx0Y2FzZSBcIl1cIjpcblx0XHRcdGNhc2UgXCJ8XCI6XG5cdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCAke3N5bnRheFRva2VufSBmb3VuZCBhcyBpdGVtICR7c3RhcnRJbmRleH0gb2YgJHt0aGlzLnN5bnRheH1gKTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0dmFyIHN0cmluZyA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XSwgcnVsZTtcblx0XHQvLyBJZiBsZXR0ZXJzIG9ubHksIG1hdGNoIGFzIGEgS2V5d29yZCAoc28gd2UgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkgYWZ0ZXIgdGhlIHN0cmluZykuXG5cdFx0aWYgKHN0cmluZy5tYXRjaCgvW0EtWmEtel0rLykpIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5LZXl3b3JkKHsgc3RyaW5nIH0pO1xuXHRcdH1cblx0XHQvLyBPdGhlcndpc2UgbWF0Y2ggYXMgYSBTdHJpbmcsIHdoaWNoIGRvZXNuJ3QgcmVxdWlyZSBub24td29yZCBjaGFycyBhZnRlciB0aGUgdGV4dC5cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5TeW1ib2woeyBzdHJpbmc6IHN0cmluZyB9KTtcblx0XHRcdC8vIElmIHN0cmluZyBzdGFydHMgd2l0aCBgXFxcXGAsIGl0J3MgYW4gZXNjYXBlZCBsaXRlcmFsIChlZzogYFxcW2AgbmVlZHMgdG8gaW5wdXQgYXMgYFxcXFxbYCkuXG5cdFx0XHRpZiAoc3RyaW5nLnN0YXJ0c1dpdGgoXCJcXFxcXCIpKSB7XG5cdFx0XHRcdC8vIHJlbW92ZSBsZWFkaW5nIHNsYXNoIGluIG1hdGNoIHN0cmluZy4uLlxuXHRcdFx0XHRydWxlLnN0cmluZyA9IHJ1bGUuc3RyaW5nLnN1YnN0cigxKTtcblx0XHRcdFx0Ly8gYnV0IGxlYXZlIGl0IGluIHRvU3RyaW5nXG5cdFx0XHRcdHJ1bGUudG9TdHJpbmcgPSAoKSA9PiBzdHJpbmc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBbIHJ1bGUsIHN0YXJ0SW5kZXggXTtcblx0fSxcblxuXG5cdC8vIE1hdGNoIGdyb3VwaW5nIGV4cHJlc3Npb24gYCguLi58Li4uKWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHQvLyBOT1RFOiBuZXN0ZWQgcGFyZW5zIG1heSBub3QgaGF2ZSBhbHRlcm5hdGl2ZXMuLi4gOi0oICAgYChhfChifGMpKWAgd29uJ3Qgd29yaz8/P1xuXHRwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIihcIiwgXCIpXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0Ly8gcHVsbCBvdXQgZXhwbGljaXQgYXJndW1lbnQgbmFtZVxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdC8vIHNwbGl0IGludG8gZ3JvdXBzLCBpbmNsdWRpbmcgbmVzdGVkIHBhcmVuc1xuXHRcdGxldCBhbHRlcm5hdGl2ZXMgPVxuXHRcdFx0Z3JvdXBBbHRlcm5hdGl2ZXMoc2xpY2UpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0XHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKGdyb3VwLCBbXSk7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHRzWzBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdGxldCBydWxlID0gYWx0ZXJuYXRpdmVzLmxlbmd0aCA9PT0gMSA/IGFsdGVybmF0aXZlc1swXSA6IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVzOiBhbHRlcm5hdGl2ZXMgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblxuXHRcdGZ1bmN0aW9uIGdyb3VwQWx0ZXJuYXRpdmVzKHRva2Vucykge1xuXHRcdFx0dmFyIGFsdGVybmF0aXZlcyA9IFtdO1xuXHRcdFx0dmFyIGN1cnJlbnQgPSBbXTtcblx0XHRcdGZvciAodmFyIGkgPSAwLCB0b2tlbjsgdG9rZW4gPSB0b2tlbnNbaV07IGkrKykge1xuXHRcdFx0XHQvLyBoYW5kbGUgYWx0ZXJuYXRlIG1hcmtlclxuXHRcdFx0XHRpZiAodG9rZW4gPT09IFwifFwiKSB7XG5cdFx0XHRcdFx0YWx0ZXJuYXRpdmVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGhhbmRsZSBuZXN0ZWQgcGFyZW5zXG5cdFx0XHRcdGVsc2UgaWYgKHRva2VuID09PSBcIihcIikge1xuXHRcdFx0XHRcdGxldCB7IGVuZEluZGV4IH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmRJbmRleCArIDEpKTtcblx0XHRcdFx0XHRpID0gZW5kSW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3VycmVudC5wdXNoKHRva2VuKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGN1cnJlbnQubGVuZ3RoKSBhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdHJldHVybiBhbHRlcm5hdGl2ZXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIHJlcGVhdCBpbmRpY2F0b3IgYD9gLCBgK2Agb3IgYCpgIGJ5IGF0dGFjaGluZyBpdCB0byB0aGUgcHJldmlvdXMgcnVsZS5cblx0cGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0dmFyIHN5bWJvbCA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblx0XHR2YXIgcnVsZSA9IHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBhdHRhY2ggcmVwZWF0IHN5bWJvbCAke3N5bWJvbH0gdG8gZW1wdHkgcnVsZSFgKTtcblxuXHRcdC8vIFRyYW5zZm9ybSBsYXN0IHJ1bGUgaW50byBhIHJlcGVhdCBmb3IgYCpgIGFuZCBgK2AuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCIqXCIgfHwgc3ltYm9sID09PSBcIitcIikge1xuXHRcdFx0bGV0IGFyZ3VtZW50ID0gcnVsZS5hcmd1bWVudDtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5SZXBlYXQoeyBydWxlIH0pO1xuXHRcdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0XHQvLyBwdXNoIGludG8gcnVsZSBzdGFjayBpbiBwbGFjZSBvZiBvbGQgcnVsZVxuXHRcdFx0cnVsZXNbcnVsZXMubGVuZ3RoIC0gMV0gPSBydWxlO1xuXHRcdH1cblxuXHRcdC8vIFJ1bGUgaXMgb3B0aW9uYWwgZm9yIGA/YCBhbmQgYCpgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiP1wiIHx8IHN5bWJvbCA9PT0gXCIqXCIpIHtcblx0XHRcdHJ1bGUub3B0aW9uYWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBbIHVuZGVmaW5lZCwgc3RhcnRJbmRleCBdXG5cdH0sXG5cblx0Ly8gTWF0Y2ggYHs8cnVsZU5hbWU+fWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IG1hdGNoID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIntcIiwgXCJ9XCIsIHN0YXJ0SW5kZXgpO1xuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID09PSAzICYmIG1hdGNoLnNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBtYXRjaC5zbGljZVswXTtcblx0XHRcdG1hdGNoLnNsaWNlID0gbWF0Y2guc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPiAxKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHByb2Nlc3MgcnVsZXMgd2l0aCBtb3JlIHRoYW4gb25lIHJ1bGUgbmFtZTogeyR7bWF0Y2guc2xpY2Uuam9pbihcIlwiKX19YCk7XG5cblx0XHR2YXIgcGFyYW1zID0geyBydWxlOiBtYXRjaC5zbGljZVswXSB9O1xuXG5cdFx0Ly8gc2VlIGlmIHRoZXJlJ3MgYSBgbm90YCBydWxlIGluIHRoZXJlXG5cdFx0bGV0IGJhbmdQb3NpdGlvbiA9IHBhcmFtcy5ydWxlLmluZGV4T2YoXCIhXCIpO1xuXHRcdGlmIChiYW5nUG9zaXRpb24gIT09IC0xKSB7XG5cdFx0XHRwYXJhbXMubm90ID0gcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpOyAvL1sgcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpIF07XG5cdFx0XHRwYXJhbXMucnVsZSA9IHBhcmFtcy5ydWxlLnN1YnN0cigwLCBiYW5nUG9zaXRpb24pO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuU3VicnVsZShwYXJhbXMpO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIG1hdGNoLmVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggbGlzdCBleHByZXNzaW9uIGBbPGl0ZW0+PGRlbGltaXRlcj5dYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJbXCIsIFwiXVwiLCBzdGFydEluZGV4KTtcblxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHNsaWNlLCBbXSk7XG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoICE9PSAyKSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgc3R1ZmYgYXQgZW5kIG9mIGxpc3Q6IFske3NsaWNlLmpvaW4oXCIgXCIpfV1gKTtcblx0XHR9XG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5MaXN0KCk7XG5cdFx0cnVsZS5pdGVtID0gcmVzdWx0c1swXVxuXHRcdHJ1bGUuZGVsaW1pdGVyID0gcmVzdWx0c1sxXVxuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cdH0sXG5cbn0pO1xuXG5cblxuLy8gIyMgIEFkZCBtZXRob2RzIHRvIFBhcnNlciB0byBkZWZpbmUgcnVsZXMgdXNpbmcgdGhlIGFib3ZlIHN5bnRheC5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFBhcnNlci5wcm90b3R5cGUsIHtcblxuXHQvLyBQYXJzZSBhIGBydWxlU3ludGF4YCBydWxlIGFuZCBhZGQgaXQgdG8gb3VyIGxpc3Qgb2YgcnVsZXMuXG5cdC8vIFJldHVybnMgdGhlIG5ldyBydWxlLlxuXHQvLyBMb2dzIHBhcnNpbmcgZXJyb3JzIGJ1dCBhbGxvd3MgdGhpbmdzIHRvIGNvbnRpbnVlLlxuXHRhZGRTeW50YXg6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3Rvcik7XG5cdFx0XHQvLyBSZWZsZWN0IHRoZSBydWxlIGJhY2sgb3V0IHRvIG1ha2Ugc3VyZSBpdCBsb29rcyAobW9yZSBvciBsZXNzKSB0aGUgc2FtZVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGVkIHJ1bGUgJyR7bmFtZX0nOlxcbiAgSU5QVVQ6ICR7cnVsZVN5bnRheH0gXFxuIE9VVFBVVDogJHtydWxlfWApO1xuXG5cdFx0XHRPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmdyb3VwKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgc3ludGF4OiAke3J1bGVTeW50YXh9YCk7XG5cdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdH1cblx0fX0sXG5cblx0YWRkU3RhdGVtZW50OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TdGF0ZW1lbnQpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRFeHByZXNzaW9uOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5FeHByZXNzaW9uKSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBTZXF1ZW5jZUNvbnN0cnVjdG9yKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcnVsZSk7XG5cdH19LFxuXG5cdC8vIEFkZCBpbmZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgb3IgYlwiLlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZEluZml4T3BlcmF0b3I6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSkge1xuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRJbmZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50b0pTKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIGluZml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYClcblx0XHRcdH1cblx0XHRcdC8vIGNsZWFyIGxpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGZvciBnZXR0ZXIgYmVsb3dcblx0XHRcdGRlbGV0ZSB0aGlzLl9faW5maXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwiaW5maXhfb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIGluZml4IG9wZXJhdG9ycyBhcyBzdHJpbmdzLlxuXHQvLyBSZS1tZW1vaXplZCBhZnRlciBgYWRkSW5maXhPcGVyYXRvcmAgYWJvdmUuXG5cdGluZml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9faW5maXhPcGVyYXRvcnNcIixcblx0XHRmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucnVsZXNbXCJpbmZpeF9vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0ICYmIHRoaXMucnVsZXNbXCJpbmZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZylcblx0fSksXG5cblx0Ly8gQWRkIHBvc3RmaXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIGlzIGRlZmluZWRcIlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZFBvc3RmaXhPcGVyYXRvcjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKSB7XG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFBvc3RmaXhPcGVyYXRvcihuYW1lLCBzeW50YXgsIHByb3BlcnRpZXMpKTtcblx0XHR9XG5cblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudG9KUykge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBwb3N0Zml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBjbGVhciBsaXN0IG9mIGluZml4IG9wZXJhdG9ycyBmb3IgZ2V0dGVyIGJlbG93XG5cdFx0XHRkZWxldGUgdGhpcy5fX3Bvc3RmaXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwicG9zdGZpeF9vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH19LFxuXG5cdC8vIExpc3Qgb2YgcG9zdGZpeCBvcGVyYXRvcnMgYXMgc3RyaW5ncy5cblx0Ly8gUmUtbWVtb2l6ZWQgYWZ0ZXIgYGFkZEluZml4T3BlcmF0b3JgIGFib3ZlLlxuXHRwb3N0Zml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9fcG9zZml4T3BlcmF0b3JzXCIsXG5cdFx0ZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXMucnVsZXNbXCJwb3N0Zml4X29wZXJhdG9yXCJdXG5cdFx0XHRcdFx0XHQmJiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZyk7XG5cdH0pXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlU3ludGF4LmpzIiwiLy9cbi8vXHQjIENvcmUgYHJ1bGVzYCAtLSBzaW1wbGUgZGF0YXR5cGVzLCBldGMuXG4vL1xuLy8gTk9URTogbWFueSBvZiB0aGUgYmVsb3cgYXJlIGNyZWF0ZWQgYXMgY3VzdG9tIFBhdHRlcm4gc3ViY2xhc3NlcyBmb3IgZGVidWdnaW5nLlxuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gYHdoaXRlc3BhY2VgIHJ1bGUuXG4vLyBOT1RFIGBwYXJzZXIucGFyc2UoXCJ3aGl0ZXNwYWNlXCIsIFwiICAgXCIpYCB3aWxsIHJldHVybiBgdW5kZWZpbmVkYFxuLy9cdFx0IGJlY2F1c2UgYHBhcnNlci5wYXJzZSgpYCBhdXRvbWF0aWNhbGx5IGVhdHMgd2hpdGVzcGFjZSBhdCB0aGUgc3RhcnQgb2YgYSBydWxlLlxuUnVsZS5XaGl0ZXNwYWNlID0gY2xhc3Mgd2hpdGVzcGFjZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fVxucGFyc2VyLmFkZFJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIG5ldyBSdWxlLldoaXRlc3BhY2UoeyBwYXR0ZXJuOiAvXFxzKy8sIG9wdGlvbmFsOiB0cnVlIH0pKTtcblxuLy8gYGlkZW50aWZpZXJgID0gdmFyaWFibGVzIG9yIHByb3BlcnR5IG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcblJ1bGUuSWRlbnRpZmllciA9IGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgaWRlbnRpZmllciA9IHBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgUnVsZS5JZGVudGlmaWVyKHtcblx0cGF0dGVybjogL1thLXpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGlkZW50aWZpZXIpO1xuXG4vLyBBZGQgRW5nbGlzaCBwcmVwb3NpdGlvbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vL1xuLy8gV2lraXBlZGlhIFwiUHJlcG9zaXRpb25cIjpcbi8vXHRcIlByZXBvc2l0aW9ucy4uLmFyZSBhIGNsYXNzIG9mIHdvcmRzIHRoYXRcbi8vXHRleHByZXNzIHNwYXRpYWwgb3IgdGVtcG9yYWwgcmVsYXRpb25zICAoaW4sIHVuZGVyLCB0b3dhcmRzLCBiZWZvcmUpXG4vL1x0b3IgbWFyayB2YXJpb3VzIHNlbWFudGljIHJvbGVzIChvZiwgZm9yKS5cbi8vIFRFU1RNRVxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYWJvdXRcIiwgXCJhYm92ZVwiLCBcImFmdGVyXCIsIFwiYW5kXCIsIFwiYXNcIiwgXCJhdFwiLFxuXHRcImJlZm9yZVwiLCBcImJlaGluZFwiLCBcImJlbG93XCIsIFwiYmVuZWF0aFwiLCBcImJlc2lkZVwiLCBcImJldHdlZW5cIiwgXCJiZXlvbmRcIiwgXCJieVwiLFxuXHRcImRlZmluZWRcIiwgXCJkb3duXCIsIFwiZHVyaW5nXCIsXG5cdFwiZWFjaFwiLCBcImVtcHR5XCIsIFwiZXhhY3RseVwiLCBcImV4Y2VwdFwiLFxuXHRcImZvclwiLCBcImZyb21cIixcblx0XCJncmVhdGVyXCIsXG5cdFwiaW5cIiwgXCJpbnRvXCIsXG5cdFwibGVzc1wiLCBcImxvbmdcIixcblx0XCJtaW51c1wiLCBcIm1vcmVcIixcblx0XCJuZWFyXCIsIFwibm90XCIsXG5cdFwib2ZcIiwgXCJvZmZcIiwgXCJvblwiLCBcIm9udG9cIiwgXCJvcHBvc2l0ZVwiLCBcIm91dFwiLCBcIm91dHNpZGVcIiwgXCJvdmVyXCIsXG5cdFwic2hvcnRcIiwgXCJzaW5jZVwiLFxuXHRcInRoYW5cIiwgXCJ0aGVuXCIsIFwidGhyb3VnaFwiLCBcInRocnVcIiwgXCJ0b1wiLCBcInRvd2FyZFwiLCBcInRvd2FyZHNcIixcblx0XCJ1bmRlZmluZWRcIiwgXCJ1bmRlclwiLCBcInVuZGVybmVhdGhcIiwgXCJ1bmlxdWVcIiwgXCJ1bnRpbFwiLCBcInVwXCIsIFwidXBvblwiLCBcInVwc2lkZVwiLFxuXHRcInZlcnN1c1wiLCBcInZzXCIsXG5cdFwid2l0aFwiLCBcIndpdGhpblwiLCBcIndpdGhvdXRcIixcbik7XG5cbi8vIEFkZCBjb21tb24gZW5nbGlzaCB2ZXJicyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFyZVwiLFxuXHRcImRvXCIsIFwiZG9lc1wiLFxuXHRcImNvbnRhaW5zXCIsXG5cdFwiaGFzXCIsIFwiaGF2ZVwiLFxuXHRcImlzXCIsXG5cdFwicmVwZWF0XCIsXG5cdFwid2FzXCIsIFwid2VyZVwiXG4pO1xuXG4vLyBBZGQgc3BlY2lhbCBjb250cm9sIGtleXdvcmRzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiZWxzZVwiLFxuXHRcImlmXCIsXG5cdFwib3RoZXJ3aXNlXCIsXG5cdFwid2hpbGVcIlxuKTtcblxuLy8gYFR5cGVgID0gdHlwZSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGFuIHVwcGVyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5UeXBlID0gY2xhc3MgdHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoXCJ0eXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvW0EtWl1bXFx3XFwtXSovLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdHlwZSk7XG5cblxuLy8gYG51bWJlcmAgYXMgZWl0aGVyIGZsb2F0IG9yIGludGVnZXIsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cblJ1bGUuTnVtYmVyID0gY2xhc3MgbnVtYmVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IG51bWJlciA9IHBhcnNlci5hZGRSdWxlKFwibnVtYmVyXCIsIG5ldyBSdWxlLk51bWJlcih7XG5cdHBhdHRlcm46IC8tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gbnVtYmVyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlRmxvYXQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBudW1iZXIpO1xuXG5cbi8vIE51bWVyaWMgYGludGVnZXJgIG9ubHksIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHRoaXMgV0lMTCBtYXRjaCBhIGZsb2F0LCBidXQgdGhlIHJldHVybmVkIHZhbHVlIHdpbGwgY29lcmNlIHRvIGFuIGludGVnZXIuXG4vLyBSRVZJRVc6IGlzIHRoaXMgcmlnaHQ/ICBCZXR0ZXIgdG8gbm90IG1hdGNoIGEgZmxvYXQ/XG5SdWxlLkludGVnZXIgPSBjbGFzcyBpbnRlZ2VyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJpbnRlZ2VyXCIsIG5ldyBSdWxlLkludGVnZXIoe1xuXHRwYXR0ZXJuOiAvLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0ZXh0ID0gcGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyBSdWxlLlRleHQoe1xuXHRwYXR0ZXJuOiAvKD86XCJbXlwiXSpcInwnW14nXSonKS9cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCB0ZXh0KTtcblxuXG4vLyBCb29sZWFuIGxpdGVyYWwsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFRPRE86IGJldHRlciBuYW1lIGZvciB0aGlzPz8/XG5SdWxlLkJvb2xlYW4gPSBjbGFzcyBib29sZWFuIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IGJvb2wgPSBwYXJzZXIuYWRkUnVsZShcImJvb2xlYW5cIiwgbmV3IFJ1bGUuQm9vbGVhbih7XG5cdHBhdHRlcm46IC8odHJ1ZXxmYWxzZXx5ZXN8bm98b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgYm9vbCk7XG4vLyBBZGQgYm9vbGVhbiB0b2tlbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcInRydWVcIiwgXCJmYWxzZVwiLFxuXHRcInllc1wiLCBcIm5vXCIsXG5cdFwib2tcIiwgXCJjYW5jZWxcIlxuKTtcblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxubGV0IGxpc3QgPSBwYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsX2xpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdHVuZGVmaW5lZCxcblx0Y2xhc3MgbGl0ZXJhbF9saXN0IGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHQvLyBXaGVuIGdhdGhlcmluZyBhcmd1bWVudHMsIHJldHVybiBqdXN0IHRoZSBtYXRjaGVkIGxpc3QgZGF0YS5cblx0XHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzWzFdO1xuXHRcdH1cblxuXHRcdC8vIHJldHVybiBqdXN0IHRoZSBsaXN0IGFzIG91ciBzb3VyY2Vcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG4gXHRcdFx0cmV0dXJuIHRoaXMuZ2F0aGVyQXJndW1lbnRzKCkudG9Tb3VyY2UoKTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIExpdGVyYWwgdmFsdWUgYXMgbnVtYmVyLCB0ZXh0IG9yIGJvb2xlYW4uXG4vL1RPRE86IHRoaXMgaXMgYW4gZXhwcmVzc2lvbi4uLiBidXQgaW5zdGFsbGluZyBpdCB0aGF0IHdheSBicmVha3MgcGFyc2luZy4uLj9cbi8vVEVTVE1FOiBhZGQgbGl0ZXJhbC1saXN0IHRvIHRoaXM/XG5wYXJzZXIuYWRkU3ludGF4KFwibGl0ZXJhbFwiLCBcIihsaXRlcmFsOntudW1iZXJ9fHt0ZXh0fXx7Ym9vbGVhbn18e2xpdGVyYWxfbGlzdH0pXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJcbi8vIFRPRE86IGNvbnZlcnQgdG8gbGluZS1hd2FyZSBzdHJlYW0/Pz9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRTdHJlYW0ge1xuXHQvLyBZb3UgY2FuIGNvbnN0cnVjdCB3aXRoIGEgdGV4dCBzdHJpbmcgb3IgYSBzZXQgb2YgcHJvcGVydGllcyAoaW5jbHVkaW5nIGB0ZXh0YCkuXG5cdGNvbnN0cnVjdG9yKC4uLnRleHRPclByb3BzKSB7XG5cdFx0dGV4dE9yUHJvcHMuZm9yRWFjaCgoYXJnKSA9PiB7XG5cdFx0XHRpZiAodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHR0aGlzLnRleHQgPSBhcmc7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChhcmcpIHtcblx0XHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBhcmcpO1xuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvLyBNYWtlIHN1cmUgYHRleHRgIGFuZCBgc3RhcnRJbmRleGAgYXJlIGRlZmluZWQuXG5cdFx0aWYgKCEoXCJ0ZXh0XCIgaW4gdGhpcykpIHRoaXMudGV4dCA9IFwiXCI7XG5cdFx0aWYgKCEoXCJzdGFydEluZGV4XCIgaW4gdGhpcykpIHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdH1cblxuXHQvLyBSZXR1cm4gYW4gaW1tdXRhYmxlIGNsb25lIG9mIHRoZSBzdHJlYW0uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0cmV0dXJuIG5ldyBUZXh0U3RyZWFtKHRoaXMsIHByb3BzKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2VkIHRvIG5ldyBzdGFydEluZGV4LlxuXHRhZHZhbmNlVG8oc3RhcnRJbmRleCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleCB9KTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2luZyBzdGFydEluZGV4IEJZIGBsZW5ndGhgXG5cdGFkdmFuY2VCeShsZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcblx0fVxuXG4vLyBcdC8vIFJldHVybiBjbG9uZSBvZiB0aGlzIHN0cmVhbSB3aXRoIGVuZEluZGV4IHNldCB0byBzdGFydCArIGBsZW5ndGhgXG4vLyBcdGVuZEFmdGVyKGxlbmd0aCkge1xuLy8gXHRcdHJldHVybiB0aGlzLmNsb25lKHsgZW5kSW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcbi8vIFx0fVxuXG4vL1xuLy8gIyMgTWF0Y2hpbmdcbi8vXG5cdC8vIE1hdGNoIGBwYXR0ZXJuYCBhcyByZWdleCBpbiB0aGlzIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBtYXRjaCBvciBgdW5kZWZpbmVkYC5cblx0Ly8gSWYgeW91IHdhbnQgdG8gdGVzdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmVhbSxcblx0Ly9cdG1ha2Ugc3VyZSB5b3VyIHJlZ2V4IHN0YXJ0cyB3aXRoIGBeYC5cblx0Ly8gVEVTVE1FOiB0aGlzIGxpa2VseSBicmVha3Mgd2l0aCBhIGBnYCBvbiB0aGUgcGF0dGVybj9cblx0bWF0Y2gocGF0dGVybikge1xuXHRcdGlmICghKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBUZXh0U3RyZWFtLm1hdGNoKCR7cGF0dGVybn0pOiBleHBlY3RlZCBSZWdFeHBgKTtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQubWF0Y2gocGF0dGVybikgfHwgdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGlzIHN0cmVhbSBJTkNMVURFIGEgcmVnZXggd2l0aGluIGl0P1xuXHQvLyBSZXR1cm5zIGB0cnVlYCBvciBgZmFsc2VgLlxuXHQvLyBOT1RFOiBQYXR0ZXJuIG11c3QgTk9UIHN0YXJ0IHdpdGggYF5gIGZvciB0aGlzIHRvIG1hdGNoIGluIHRoZSBtaWRkbGUgb2YgdGhlIHN0cmVhbS5cblx0dGVzdChwYXR0ZXJuKSB7XG5cdFx0cmV0dXJuIHBhdHRlcm4udGVzdCh0aGlzLmhlYWQpO1xuXHR9XG5cbi8vXG4vLyAjIyBSZWZsZWN0aW9uXG4vL1xuXHQvLyBSZXR1cm4gdGV4dCBvZiBzdHJpbmcgc3RhcnRpbmcgYXQgb3VyIGBzdGFydEluZGV4YFxuXHRnZXQgaGVhZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5yYW5nZSgpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgcmFuZ2Ugb2YgdGhlIHN0cmluZyBmcm9tIGBzdGFydEluZGV4YCB0byBgZW5kSW5kZXhgIE5PTi1pbmNsdXNpdmUuXG5cdHJhbmdlKHN0YXJ0SW5kZXggPSB0aGlzLnN0YXJ0SW5kZXgsIGVuZEluZGV4ID0gdGhpcy5lbmRJbmRleCB8fCB0aGlzLnRleHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5zdWJzdHJpbmcoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xuXHR9XG5cblx0Ly8gTGVuZ3RoIG9mIHRoZSBzdHJlYW0uXG5cdGdldCBsZW5ndGgoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5sZW5ndGg7XG5cdH1cblxuXHQvLyBBcmUgd2UgYXQgdGhlIGVuZCBvZiB0aGUgc3RyZWFtP1xuXHRnZXQgaXNFbXB0eSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGFydEluZGV4ID09PSB0aGlzLmxlbmd0aDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHRcblx0fTtcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9UZXh0U3RyZWFtLmpzIiwiaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGxvYWQgc3RhbmRhcmQgcnVsZXMgZmlsZXMgaGVyZVxuaW1wb3J0IFwiLi9jb3JlXCI7XG5pbXBvcnQgXCIuL251bWJlcnNcIjtcbmltcG9ydCBcIi4vb3BlcmF0b3JzXCI7XG5pbXBvcnQgXCIuL3N0YXRlbWVudHNcIjtcbmltcG9ydCBcIi4vYXNzaWdubWVudFwiO1xuaW1wb3J0IFwiLi9jbGFzc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiLy8gTWVtb2l6ZS9mb3JnZXQgc2VtYW50aWNzLlxuXG4vLyBSZXR1cm4gYSBtZW1vaXppbmcgZ2V0dGVyIGZ1bmN0aW9uLlxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXNbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGdldHRlci5hcHBseSh0aGlzKTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIERlZmluZSBzbyB0aGF0IHdlIGNhbiBiZSBkZWxldGVkIGFuZCByZS1kZWZpbmVkLCBidXQgbm90IHNldCBvciBlbnVtZXJhdGVkLlxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcGVydHksIHsgdmFsdWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXNbcHJvcGVydHldO1xuXHR9XG59XG5cblxuLy8gUmV0dXJuIGEgbWVtb2l6ZSBmdW5jdGlvbiBmb3IgdXNlIGFzIGEgZ2V0dGVyIGluIGEgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYFxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4ge1xuXHRcdGdldCA6IG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpXG5cdH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9tZW1vaXplLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBUT0RPOiB7cHJvcGVydHktZXhwcmVzc2lvbn0gYWxzbyB3b3Jrcy4uLiB7YXNzaWduYWJsZS1leHByZXNzaW9ufSA/Pz9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsIFwie2lkZW50aWZpZXJ9ID0ge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdGxldCB2YWx1ZSA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdC8vIFRPRE86IGRlY2xhcmUgaWRlbnRpZmllciBpZiBub3QgaW4gc2NvcGUsIGV0Y1xuXHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSA9ICR7dmFsdWV9YDtcblx0fVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvYXNzaWdubWVudC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVmaW5pbmcgY2xhc3NlcyAoa25vd24gYXMgYHR5cGVzYClcbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vcGFyc2VyLmFkZEV4cHJlc3Npb24oXCJwcm9wZXJ0eV9leHByZXNzaW9uXCIsIFwie3Byb3BlcnR5OnByb3BlcnR5X25hbWV9KyB7ZXhwcmVzc2lvbn1cIiwge1xucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicHJvcGVydHlfZXhwcmVzc2lvblwiLFxuXHRcIihwcm9wZXJ0aWVzOnRoZSB7aWRlbnRpZmllcn0gb2YpKyB7ZXhwcmVzc2lvbn1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBwcm9wZXJ0eV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0XHRsZXQgYXJncyA9IFJ1bGUuRXhwcmVzc2lvbi5nYXRoZXJBcmd1bWVudHModGhpcyk7XG5cdFx0XHQvLyB0cmFuc2Zvcm0gcHJvcGVydGllcyBhbmQgcmV2ZXJzZSBvcmRlclxuXHRcdFx0YXJncy5wcm9wZXJ0aWVzID0gYXJncy5wcm9wZXJ0aWVzLm1hcCggc2VxdWVuY2UgPT4gc2VxdWVuY2UuaWRlbnRpZmllciApLnJldmVyc2UoKTtcblx0XHRcdHJldHVybiBhcmdzO1xuXHRcdH1cblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCB0aGluZyA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IHByb3BlcnRpZXMgPSBhcmdzLnByb3BlcnRpZXMubWFwKCBpZGVudGlmaWVyID0+IGlkZW50aWZpZXIudG9Tb3VyY2UoKSApLmpvaW4oXCIuXCIpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXQoJHt0aGluZ30sICcke3Byb3BlcnRpZXN9JylgO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbnBhcnNlci5hZGRTeW50YXgoXCJzY29wZV9tb2RpZmllclwiLCBcIihzY29wZTpnbG9iYWx8Y29uc3RhbnR8c2hhcmVkKVwiKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwie3Njb3BlX21vZGlmaWVyfT8ge2Fzc2lnbm1lbnR9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuYXNzaWdubWVudC5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgdmFsdWUgPSBhcmdzLmFzc2lnbm1lbnQuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGFzc2lnbm1lbnQgPSBgJHtpZGVudGlmaWVyfSA9ICR7dmFsdWV9YDtcblxuXHRcdFx0dmFyIHNjb3BlID0gYXJncy5zY29wZSA/IGFyZ3Muc2NvcGUudG9Tb3VyY2UoKSA6IFwibG9jYWxcIjtcblx0XHRcdHN3aXRjaCAoc2NvcGUpIHtcblx0XHRcdFx0Y2FzZSBcImdsb2JhbFwiOlxuXHRcdFx0XHRcdHJldHVybiBgZ2xvYmFsLiR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZFwiOlxuXHRcdFx0XHRcdHJldHVybiBgc3RhdGljICR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0cmV0dXJuIGFzc2lnbm1lbnQ7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eV9hc19vbmVfb2ZcIixcblx0XCJ7aWRlbnRpZmllcn0gYXMgb25lIG9mIHtsaXN0OmxpdGVyYWxfbGlzdH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgcGx1cmFsID0gKGlkZW50aWZpZXIgKyBcIl9WQUxVRVNcIikudG9VcHBlckNhc2UoKTtcblx0XHRcdGxldCBsaXN0ID0gYXJncy5saXN0Lmxpc3Q7XG5cdFx0XHRsZXQgdmFsdWVzID0gbGlzdC50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGZpcnN0ID0gbGlzdC5yZXN1bHRzWzBdO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKCkgOiBcInVuZGVmaW5lZFwiO1xuXG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke3BsdXJhbH0gPSAke3ZhbHVlc307XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0geyByZXR1cm4gKFwiX18ke2lkZW50aWZpZXJ9XCIgaW4gdGhpcyA/IHRoaXMuX18ke2lkZW50aWZpZXJ9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfVxcbmA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY2xhc3MuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBudW1iZXJzXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxubGV0IGluZGV4X2V4cHJlc3Npb24gPSBwYXJzZXIuYWRkUnVsZShcImluZGV4X2V4cHJlc3Npb25cIiwgbmV3IChjbGFzcyBpbmRleF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXN7fSkoKSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgaW5kZXhfZXhwcmVzc2lvbik7XG5cbi8vIE51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmc6XG4vL1x0LSBgaXRlbSAxIG9mIC4uLmBcbi8vXHQtIGBpdGVtICMyIG9mIC4uLmBcbi8vIE5PVEU6IHRoZXNlIGluZGljZXMgYXJlIE9ORSBiYXNlZCwgTk9UIHplcm8gYmFzZWQgYXMgaXMgSmF2YXNjcmlwdC5cbi8vIFRPRE86IGFsbG93IGFueSBpZGVudGlmaWVyIGluc3RlYWQgb2YgYHtpdGVtfWAgP1xucGFyc2VyLmFkZFN5bnRheChcImluZGV4X2V4cHJlc3Npb25cIixcblx0XCJpdGVtICgjKT97bnVtYmVyOmludGVnZXJ9IG9mIHtleHByZXNzaW9ufVwiLFxuXHR1bmRlZmluZWQsXG5cdGNsYXNzIGluZGV4X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IG51bWJlciA9IGFyZ3MubnVtYmVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgZXhwcmVzc2lvbiA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7bnVtYmVyfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gYGl0ZW0gIyAxIG9mLi4uYDogIE51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmdcblxuLy8gRW5nbGlzaCB3b3JkcyB1c2VkIGZvciBwb3NpdGlvbiBvZiBzb21ldGhpbmcgaW4gYSBsaXN0LlxuLy8gVE9ETzogYHNldmVudHktc2V2ZW50aGAsIGB0aGlyZC10by1sYXN0YC4uLlxucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCIoZmlyc3R8c2Vjb25kfHRoaXJkfGZvdXJ0aHxmaWZ0aHxzaXh0aHxzZXZlbnRofGVpZ2h0aHxuaW50aHx0ZW50aHxwZW51bHRpbWF0ZXxsYXN0fGZpbmFsKVwiLCB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgb3JkaW5hbCA9IHRoaXMubWF0Y2hlZC50b1NvdXJjZSgpO1xuXHRcdHN3aXRjaCAob3JkaW5hbCkge1xuXHRcdFx0Y2FzZSBcImZpcnN0XCI6XHRcdHJldHVybiAxO1xuXHRcdFx0Y2FzZSBcInNlY29uZFwiOlx0XHRyZXR1cm4gMjtcblx0XHRcdGNhc2UgXCJ0aGlyZFwiOlx0XHRyZXR1cm4gMztcblx0XHRcdGNhc2UgXCJmb3VydGhcIjpcdFx0cmV0dXJuIDQ7XG5cdFx0XHRjYXNlIFwiZmlmdGhcIjpcdFx0cmV0dXJuIDU7XG5cdFx0XHRjYXNlIFwic2l4dGhcIjpcdFx0cmV0dXJuIDY7XG5cdFx0XHRjYXNlIFwic2V2ZW50aFwiOlx0XHRyZXR1cm4gNztcblx0XHRcdGNhc2UgXCJlaWdodGhcIjpcdFx0cmV0dXJuIDg7XG5cdFx0XHRjYXNlIFwibmludGhcIjpcdFx0cmV0dXJuIDk7XG5cdFx0XHRjYXNlIFwidGVudGhcIjpcdFx0cmV0dXJuIDEwO1xuXHRcdFx0Y2FzZSBcInBlbnVsdGltYXRlXCI6XHRyZXR1cm4gLTI7XG5cdFx0XHRjYXNlIFwibGFzdFwiOlx0XHRyZXR1cm4gLTE7XG5cdFx0XHRjYXNlIFwiZmluYWxcIjpcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0fVxufSk7XG5cbi8vIEFsdGVybmF0aXZlIGZvcm0gZm9yIG51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmcuXG4vLyBOT1RFOiBkb24ndCBhZGQgYXMgYW4gZXhwcmVzc2lvbiBzaW5jZSB3ZSdyZSBhdXRvLW1lcmdlZCB3aXRoIGBpbmRleF9leHByZXNzaW9uYCBhYm92ZS5cbnBhcnNlci5hZGRTeW50YXgoXG5cdFwiaW5kZXhfZXhwcmVzc2lvblwiLFxuXHRcInRoZSB7b3JkaW5hbH0gaXRlbSBvZiB7ZXhwcmVzc2lvbn1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBpbmRleF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZSgpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBvcmRpbmFsID0gYXJncy5vcmRpbmFsLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgZXhwcmVzc2lvbiA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7b3JkaW5hbH0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBpbmZpeCBhbmQgcHJlZml4IG9wZXJhdG9ycy5cbi8vXG5cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyMjIEluZml4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPiB7cmhzfWAsIGVnOiBgYSBpcyAxYFxuLy8gTk9URTogYG9wZXJhdG9yLnRvSlNgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyB0d28gYXJndW1lbnRzIChgbGhzYCBhbmQgYHJoc2ApIGludG8gb3V0cHV0LlxuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImFuZFwiLCBcImFuZFwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gJiYgJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwib3JcIiwgXCJvclwiLCB7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gfHwgJHtifSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc1wiLCBcImlzXCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RcIiwgXCJpcyBub3RcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfZXhhY3RseVwiLCBcImlzIGV4YWN0bHlcIiwgeyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RfZXhhY3RseVwiLCBcImlzIG5vdCBleGFjdGx5XCIsIHsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPT0gJHtifSlgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNPZlR5cGUodGhpbmcsIHR5cGUpYFxuLy9UT0RPOiBgaXMgc2FtZSB0eXBlIGFzYCA/XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX3R5cGVfb2ZcIiwgW1wiaXMgYVwiLCBcImlzIGFuXCJdLCB7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGBzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RfdHlwZV9vZlwiLCBbXCJpcyBub3QgYVwiLCBcImlzIG5vdCBhblwiXSwgeyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmNvbnRhaW5zKGNvbGxlY3Rpb24sIHRoaW5nKWBcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfaW5cIiwgW1wiaXMgaW5cIiwgXCJpcyBvbmUgb2ZcIl0sIHsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYHNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RfaW5cIiwgW1wiaXMgbm90IGluXCIsIFwiaXMgbm90IG9uZSBvZlwiXSwgeyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgIXNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xuLy9URVNUTUVcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaW5jbHVkZXNcIiwgW1wiaW5jbHVkZXNcIiwgXCJjb250YWluc1wiXSwgeyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgc3BlbGwuY29udGFpbnMoJHtsaXN0fSwgJHt0aGluZ30pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImRvZXNudF9pbmNsdWRlXCIsIFtcImRvZXMgbm90IGluY2x1ZGVcIiwgXCJkb2VzbnQgaW5jbHVkZVwiLCBcImRvZXMgbm90IGNvbnRhaW5cIiwgXCJkb2VzbnQgY29udGFpblwiXSwgeyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0XCIsIFtcIj5cIiwgXCJpcyBncmVhdGVyIHRoYW5cIl0sIHsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZ3RlXCIsIFtcIj49XCIsIFwiaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJsdFwiLCBbXCI8XCIsIFwiaXMgbGVzcyB0aGFuXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0ZVwiLCBbXCI8PVwiLCBcImlzIGxlc3MgdGhhbiBvciBlcXVhbCB0b1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPD0gJHtifSlgIH19KTtcblxuLy9UT0RPOiAgY2FuJ3QgYWRkIGArYCBhcyBhIHJ1bGUsIGZpeCB0aGlzIHRoZW4gYWRkIHRoZXNlXG4vL1RPRE86ICBvcGVyYXRvciBwcmVjZWRlbmNlPz8/XG4vL1RFU1RNRVxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJwbHVzXCIsIFtcIlxcXFwrXCIsIFwicGx1c1wiXSwgeyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSArICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibWludXNcIiwgW1wiLVwiLCBcIm1pbnVzXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJ0aW1lc1wiLCBbXCJcXFxcKlwiLCBcInRpbWVzXCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICogJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJkaXZpZGVkX2J5XCIsIFtcIi9cIiwgXCJkaXZpZGVkIGJ5XCJdLCB7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC8gJHtifWAgfX0pO1xuXG4vL1RPRE86ICBgKz1gIGV0Yz8gIG90aGVyIG1hdGggZnVuY3Rpb25zP1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6aW5maXhfb3BlcmF0b3J9IHtyaHM6ZXhwcmVzc2lvbn1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRsZWZ0UmVjdXJzaXZlID0gdHJ1ZTtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgbGhzID0gYXJncy5saHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgcmhzID0gYXJncy5yaHMudG9Tb3VyY2UoY29udGV4dCk7XG5cblx0XHRcdGxldCB0b0pTID0gYXJncy5vcGVyYXRvci50b0pTO1xuXHRcdFx0cmV0dXJuIHRvSlMobGhzLCByaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8jIyBQb3N0aWZ4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPmAsIGUuZy4gYGEgaXMgZGVmaW5lZGBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgYXJndW1lbnQgKGBsaHNgKSBpbnRvIEpTIG91dHB1dC5cblxucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX2RlZmluZWRcIiwgXCJpcyBkZWZpbmVkXCIsIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gIT09ICd1bmRlZmluZWQnKWAgfX0pO1xucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX25vdF9kZWZpbmVkXCIsIFtcImlzIG5vdCBkZWZpbmVkXCIsIFwiaXMgdW5kZWZpbmVkXCJdLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXNfZW1wdHlcIiwgXCJpcyBlbXB0eVwiLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX25vdF9lbXB0eVwiLCBcImlzIG5vdCBlbXB0eVwiLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAhc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicG9zdGZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeF9vcGVyYXRvcn1cIixcblx0dW5kZWZpbmVkLFxuXHRjbGFzcyBwb3N0Zml4X29wZXJhdG9yX2V4cHJlc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0bGVmdFJlY3Vyc2l2ZSA9IHRydWU7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGxocyA9IGFyZ3MubGhzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHRvSlMgPSBhcmdzLm9wZXJhdG9yLnRvSlM7XG5cdFx0XHRyZXR1cm4gdG9KUyhsaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG4vL3BhcnNlci5hZGRTeW50YXgoXCJvcGVyYXRvcl9leHByZXNzaW9uXCIsIFwiKGV4cHJlc3Npb246e3Bvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvbn18e2luZml4X29wZXJhdG9yX2V4cHJlc3Npb259KVwiKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJpbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuaW1wb3J0IFwiLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL3J1bGVzL2luZGV4LmpzXCI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHR3aW5kb3cuVGV4dFN0cmVhbSA9IFRleHRTdHJlYW07XG5cdHdpbmRvdy5QYXJzZXIgPSBQYXJzZXI7XG5cdHdpbmRvdy5SdWxlID0gUnVsZTtcblx0d2luZG93LnBhcnNlciA9IHBhcnNlcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuXHRUZXh0U3RyZWFtLCBQYXJzZXIsIFJ1bGUsIHBhcnNlclxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvaW5kZXguanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiaWZcIiwgXCJpZiB7ZXhwcmVzc2lvbn0gdGhlbiB7bnVtYmVyfT9cIiwge1xuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0fVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvc3RhdGVtZW50cy5qcyJdLCJzb3VyY2VSb290IjoiIn0=