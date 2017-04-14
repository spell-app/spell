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
/******/ 	return __webpack_require__(__webpack_require__.s = 11);
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

// TODO:	consolidate subsequent literal words / strings into a single regex?
// TODO:	`test` function for quick no-good hit on `{a} blah blah {b}`?
// TODO:	this doesn't work:   `{expression} is {expression}`
// TODO:	custom SyntaxError etc which understand streams
// TODO:	break `file` into lines and process each (incl. substr/match not going beyond the end)
// TODO:	nesting -- is this just indent = "add block scope"
// TODO:	promotion pattern for gather arguments (eg: literal-list) ???
// TODO:	What does syntax tree look like?  How do we extract meaning out of the nest?
// TODO:	Recycle word/string/pattern rules to more easily see commonality...
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

		//### Parsing

		// Parse `name`d rule at head of `stream`.
		// Handles optional and repeating rules as well as eating whitespace.
		// Returns result of parse.

	}, {
		key: "parse",
		value: function parse(name, stream) {
			if (typeof stream === "string") stream = new _TextStream2.default(stream);
			var rule = this.getRule(name);
			if (!rule) throw new SyntaxError("Rule " + name + " not understood", name, stream);
			stream = this.eatWhitespace(stream);
			return rule.parse(this, stream);
		}

		// Eat whitespace (according to `rules.whitespace`) at the beginning of the stream.
		// Returns new stream if we matched whitespace, otherwise the same stream.
		// Otherwise returns this same stream.

	}, {
		key: "eatWhitespace",
		value: function eatWhitespace(stream) {
			var result = this.rules.whitespace.parse(this, stream);
			return result ? result.next() : stream;
		}

		//### Rule factories

		// Add a rule to our list of rules!
		// TODO: convert to `alternatives` on overwrite?

	}, {
		key: "addRule",
		value: function addRule(name, rule) {
			var existing = this.rules[name];
			if (existing) {
				if (!(existing instanceof _Rule2.default.Alternatives)) {
					if (Parser.debug) console.log("Converting rule '" + name + "' to alternatives");
					existing = new _Rule2.default.Alternatives({ name: existing.name || name, rules: [existing] });
					this.rules[name] = existing;
				}
				if (Parser.debug) console.log("Adding rule '" + rule.ruleName + "' to '" + name + "': ", rule);
				existing.addRule(rule);
			} else {
				rule.ruleName = name;
				this.rules[name] = rule;
			}
			return rule;
		}

		// Add regex as a pattern to our list of rules

	}, {
		key: "addPattern",
		value: function addPattern(name, pattern, properties) {
			var rule = new _Rule2.default.Pattern(properties);
			rule.pattern = pattern;
			return this.addRule(name, rule);
		}

		//
		// ## Utility methods
		//
		// Find the matching instance of possibly nested `endToken` to balance `startToken`.
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
	}]);

	return Parser;
}();

Parser.DEBUG = false;
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

		Object.assign(this, properties);
	}

	// Clone this rule and add any `props` passed in.


	_createClass(Rule, [{
		key: 'clone',
		value: function clone(props) {
			var clone = Object.create(this);
			Object.assign(clone, props);
			return clone;
		}

		// For a rule instance associated with a stream,
		// return a new stream AFTER this rule's end.

	}, {
		key: 'next',
		value: function next() {
			if (!this.stream || this.endIndex === undefined) throw new TypeError('rule.next() called on rule without a stream', this);
			return this.stream.advanceTo(this.endIndex);
		}

		//
		// ## output as source
		//

	}, {
		key: 'gatherArguments',
		value: function gatherArguments() {
			return this.constructor.gatherArguments(this);
		}

		// Output value for this INSTANTIATED rule as source.

	}, {
		key: 'toSource',
		value: function toSource() {
			return this.matched;
		}

		//
		// ## group: reflection
		//

	}, {
		key: '_arg',
		get: function get() {
			return this.argument || this.ruleName || this.constructor.name;
		}

		// "gather" arguments in preparation to call `toSource()`
		// Note that we define `gatherArguments()` statically on each subclass
		//	and then instance method calls it on itself.

	}, {
		key: 'ruleType',
		get: function get() {
			return this.constructor.name;
		}
	}], [{
		key: 'gatherArguments',
		value: function gatherArguments(rule) {
			return rule;
		}
	}]);

	return Rule;
}();

// Rule for literal string value, which include punctuation such as `(` etc.
//TODO: rename `Symbol`???


exports.default = Rule;
Rule.String = function (_Rule) {
	_inherits(String, _Rule);

	function String() {
		_classCallCheck(this, String);

		return _possibleConstructorReturn(this, (String.__proto__ || Object.getPrototypeOf(String)).apply(this, arguments));
	}

	_createClass(String, [{
		key: 'parse',

		//TODO: throw if `string` is not defined?
		// Parse this rule at the beginning of `stream`, assuming no whitespace before.
		// Default is that `rule.string` is literal string to match.
		// On match, returns clone of rule with `value`, `stream` and `endIndex`.
		// Returns `undefined` if no match.
		value: function parse(parser, stream) {
			if (!stream.startsWith(this.string)) return undefined;
			return this.clone({
				matched: this.string,
				endIndex: stream.startIndex + this.string.length,
				stream: stream
			});
		}
	}, {
		key: 'toString',
		value: function toString() {
			return '' + this.string + (this.optional ? '?' : '');
		}
	}]);

	return String;
}(Rule);

// Merge two String rules together, adding the second to the first.
Rule.mergeStrings = function (first, second) {
	first.string += second.string;
	return first;
};

// Regex pattern.
// `rule.pattern` is the regular expression to match.
// NOTE: the regex should start with `/^...` to match at the beginning of the stream.
// You can specify a `rule.blacklist` of matches that will specifically NOT work, eg for `identifier.
Rule.Pattern = function (_Rule2) {
	_inherits(Pattern, _Rule2);

	function Pattern() {
		_classCallCheck(this, Pattern);

		return _possibleConstructorReturn(this, (Pattern.__proto__ || Object.getPrototypeOf(Pattern)).apply(this, arguments));
	}

	_createClass(Pattern, [{
		key: 'parse',
		value: function parse(parser, stream) {
			var match = stream.match(this.pattern);
			if (!match) return undefined;

			// bail if not in blacklist
			var matched = match[0];
			if (this.blacklist && this.blacklist[matched]) return undefined;

			return this.clone({
				matched: matched,
				endIndex: stream.startIndex + matched.length,
				stream: stream
			});
		}
	}, {
		key: 'addToBlacklist',
		value: function addToBlacklist() {
			var _this3 = this;

			if (!this.blacklist) this.blacklist = {};

			for (var _len = arguments.length, words = Array(_len), _key = 0; _key < _len; _key++) {
				words[_key] = arguments[_key];
			}

			words.forEach(function (word) {
				return _this3.blacklist[word] = true;
			});
		}
	}, {
		key: 'toString',
		value: function toString() {
			return this.pattern;
		}
	}]);

	return Pattern;
}(Rule);

// Keyword pattern
//	`rule.string` is the keyword string to match.
Rule.Keyword = function (_Rule$Pattern) {
	_inherits(Keyword, _Rule$Pattern);

	function Keyword(properties) {
		_classCallCheck(this, Keyword);

		// create pattern which matches at word boundary
		var _this4 = _possibleConstructorReturn(this, (Keyword.__proto__ || Object.getPrototypeOf(Keyword)).call(this, properties));

		if (!_this4.pattern) {
			if (!_this4.string) throw new TypeError("Expected keyword property");
			_this4.pattern = new RegExp('^' + _this4.string + '\\b');
		}
		return _this4;
	}

	_createClass(Keyword, [{
		key: 'toString',
		value: function toString() {
			return '' + this.string + (this.optional ? '?' : '');
		}
	}]);

	return Keyword;
}(Rule.Pattern);

// Merge two Keyword rules together, adding the second to the first.
Rule.mergeKeywords = function (first, second) {
	first.string += " " + second.string;
	first.pattern = new RegExp("^" + first.string.split(" ").join("\\s+") + "\\b");
	return first;
};

// Subrule -- name of another rule to be called.
// `rule.rule` is the name of the rule in `parser.rules`.
Rule.Subrule = function (_Rule3) {
	_inherits(Subrule, _Rule3);

	function Subrule() {
		_classCallCheck(this, Subrule);

		return _possibleConstructorReturn(this, (Subrule.__proto__ || Object.getPrototypeOf(Subrule)).apply(this, arguments));
	}

	_createClass(Subrule, [{
		key: 'parse',
		value: function parse(parser, stream) {
			var rule = parser.getRule(this.rule);
			if (!rule) throw new SyntaxError('Attempting to parse unknown rule \'' + this.name + '\'', this);
			var result = rule.parse(parser, stream);
			if (!result) return undefined;

			if (this.argument) result.argument = this.argument;
			return result;
		}
	}, {
		key: 'toString',
		value: function toString() {
			return '{' + (this.argument ? this.argument + ":" : "") + this.rule + '}' + (this.optional ? '?' : '');
		}
	}]);

	return Subrule;
}(Rule);

// Abstract:  `Nested` rule -- composed of a series of other `rules`.
Rule.Nested = function (_Rule4) {
	_inherits(Nested, _Rule4);

	function Nested() {
		_classCallCheck(this, Nested);

		return _possibleConstructorReturn(this, (Nested.__proto__ || Object.getPrototypeOf(Nested)).apply(this, arguments));
	}

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
		key: 'parse',
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
		key: 'toString',
		value: function toString() {
			return '' + this.rules.join(" ") + (this.optional ? '?' : '');
		}
	}], [{
		key: 'gatherArguments',
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
		key: 'parse',
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

			return this.clone({
				matched: bestMatch,
				endIndex: bestMatch.endIndex,
				stream: stream
			});
		}
	}, {
		key: 'addRule',
		value: function addRule(rule) {
			this.rules.push(rule);
		}
	}, {
		key: 'toSource',
		value: function toSource(context) {
			return this.matched.toSource();
		}
	}, {
		key: 'toString',
		value: function toString() {
			return '(' + (this.argument ? this.argument + ":" : "") + this.rules.join("|") + ')' + (this.optional ? '?' : '');
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
		key: 'parse',
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
		key: 'toSource',
		value: function toSource() {
			throw "Don't understand how to source Rule.Repeat!";
		}
	}, {
		key: 'toString',
		value: function toString() {
			var rule = this.rule instanceof Rule.Sequence || this.rule instanceof Rule.Keyword && this.rule.string.includes(" ") ? '(' + this.rule + ')' : '' + this.rule;
			return '' + rule + (this.optional ? '*' : '+');
		}
	}], [{
		key: 'gatherArguments',
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
Rule.List = function (_Rule5) {
	_inherits(List, _Rule5);

	function List() {
		_classCallCheck(this, List);

		return _possibleConstructorReturn(this, (List.__proto__ || Object.getPrototypeOf(List)).apply(this, arguments));
	}

	_createClass(List, [{
		key: 'parse',
		value: function parse(parser, stream) {
			// ensure item and delimiter are optional so we don't barf in `parseRule`
			this.item.optional = true;
			this.delimiter.optional = true;

			var results = [],
			    next = stream;
			while (true) {
				// get next item, exiting if not found
				var item = this.item.parse(parser, next);
				if (!item) break;
				//console.log(item);
				results.push(item);
				next = item.next();

				// get delimiter, exiting if not found
				var delimiter = this.delimiter.parse(parser, next);
				if (!delimiter) break;
				next = delimiter.next();
			}

			return this.clone({
				results: results,
				endIndex: next.startIndex,
				stream: stream
			});
		}

		// Return matched item by index

	}, {
		key: 'getItem',
		value: function getItem(index) {
			if (!this.results) return undefined;
			return this.results[index];
		}
	}, {
		key: 'toSource',
		value: function toSource() {
			if (!this.results) return undefined; // TODO: throw???
			var results = this.results.map(function (result) {
				return result.toSource();
			}).join(", ");
			return '[' + results + ']';
		}
	}, {
		key: 'toString',
		value: function toString() {
			return '[' + (this.argument ? this.argument + ":" : "") + this.item + ' ' + this.delimiter + ']' + (this.optional ? '?' : '');
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
				if (last && last instanceof _Rule2.default.String && rule instanceof _Rule2.default.String) {
					_Rule2.default.mergeStrings(last, rule);
				}
				// If this is a `Keyword` and last was also a `Keyword`, merge together
				else if (last && last instanceof _Rule2.default.Keyword && rule instanceof _Rule2.default.Keyword) {
						_Rule2.default.mergeKeywords(last, rule);
					} else {
						rules.push(rule);
					}
			}
			startIndex = endIndex + 1;
		}
		return rules;
	},
	parseRuleSyntax_token: function parseRuleSyntax_token(syntaxStream, rules) {
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

		var syntaxToken = syntaxStream[startIndex];

		// if we got a "\\" (which also has to go into the source string as "\\")
		// treat the next bit as a literal string rather than as a special character.
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
				rule = new _Rule2.default.String({ string: string });
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
		var alternates = groupAlternates(slice).map(function (group) {
			var results = _Rule2.default.parseRuleSyntax_tokens(group, []);
			if (results.length === 1) {
				return results[0];
			} else {
				return new _Rule2.default.Sequence({ rules: results });
			}
		});

		var rule = alternates.length === 1 ? alternates[0] : new _Rule2.default.Alternatives({ rules: alternates });
		if (argument) rule.argument = argument;
		return [rule, endIndex];

		function groupAlternates(tokens) {
			var alternates = [];
			var current = [];
			for (var i = 0, token; token = tokens[i]; i++) {
				// handle alternate marker
				if (token === "|") {
					alternates.push(current);
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
			if (current.length) alternates.push(current);
			return alternates;
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
				if (!rule.transformer) {
					throw new TypeError("Expected infix operator rule '" + name + "' to specify 'transformer' function");
				}
				// clear list of infix operators for getter below
				delete this.__infixOperators;
				return this.addRule("infix-operator", rule);
			}
		} },

	// List of infix operators as strings.
	// Re-memoized after `addInfixOperator` above.
	//TODO: make a pattern for this???
	infixOperators: { get: function get() {
			if (!this.__infixOperators) {
				var operators = this.rules["infix-operator"] && this.rules["infix-operator"].rules.map(function (rule) {
					return rule.string;
				});
				if (operators) {
					Object.defineProperty(this, "__infixOperators", {
						configurable: true,
						value: operators
					});
				}
			}
			return this.__infixOperators;
		} },

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
				if (!rule.transformer) {
					throw new TypeError("Expected postfix operator rule '" + name + "' to specify 'transformer' function");
				}
				// clear list of infix operators for getter below
				delete this.__postfixOperators;
				return this.addRule("postfix-operator", rule);
			}
		} },

	// List of postfix operators as strings.
	// Re-memoized after `addInfixOperator` above.
	//TODO: make a memoization pattern for this???
	postfixOperators: { get: function get() {
			if (!this.__postfixOperators) {
				var operators = this.rules["postfix-operator"] && this.rules["postfix-operator"].rules.map(function (rule) {
					return rule.string;
				});
				if (operators) {
					Object.defineProperty(this, "__postfixOperators", {
						configurable: true,
						value: operators
					});
				}
			}
			return this.__postfixOperators;
		} }

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


// re-export parser for testing.
exports.default = _parser2.default;

//
// Regex pattern rules with custom constructors for debugging
//
//parser.addPattern("whitespace", /^\s+/);

_RuleSyntax2.default.Whitespace = function (_Rule$Pattern) {
	_inherits(whitespace, _Rule$Pattern);

	function whitespace() {
		_classCallCheck(this, whitespace);

		return _possibleConstructorReturn(this, (whitespace.__proto__ || Object.getPrototypeOf(whitespace)).apply(this, arguments));
	}

	return whitespace;
}(_RuleSyntax2.default.Pattern);
_parser2.default.addRule("whitespace", new _RuleSyntax2.default.Whitespace({ pattern: /^\s+/, optional: true }));

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
//parser.addPattern("identifier", /^[a-z][\w\d\-_]*/);
_RuleSyntax2.default.Identifier = function (_Rule$Pattern2) {
	_inherits(identifier, _Rule$Pattern2);

	function identifier() {
		_classCallCheck(this, identifier);

		return _possibleConstructorReturn(this, (identifier.__proto__ || Object.getPrototypeOf(identifier)).apply(this, arguments));
	}

	return identifier;
}(_RuleSyntax2.default.Pattern);
var identifier = _parser2.default.addRule("identifier", new _RuleSyntax2.default.Identifier({
	pattern: /^[a-z][\w\-]*/,
	// Convert "-" to "_" in source output.
	toSource: function toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));
_parser2.default.addRule("expression", identifier);

// Stick `identifier` on `parser` so we can add to its blacklist easily.
_parser2.default.identifier = identifier;

// Add English prepositions to identifier blacklist.
//
// Wikipedia "Preposition":
//	"Prepositions...are a class of words that
//	express spatial or temporal relations  (in, under, towards, before)
//	or mark various semantic roles (of, for).
// TESTME
_parser2.default.identifier.addToBlacklist("about", "above", "after", "and", "as", "at", "before", "behind", "below", "beneath", "beside", "between", "beyond", "by", "defined", "down", "during", "empty", "exactly", "except", "for", "from", "greater", "in", "into", "less", "long", "minus", "more", "near", "not", "of", "off", "on", "onto", "opposite", "out", "outside", "over", "short", "since", "than", "then", "through", "thru", "to", "toward", "towards", "undefined", "under", "underneath", "unique", "until", "up", "upon", "upside", "versus", "vs", "with", "within", "without");

// Add common english verbs to identifier blacklist.
_parser2.default.identifier.addToBlacklist("are", "do", "does", "contains", "has", "have", "is");

// `Type` = type name.
// MUST start with an upper-case letter (?)
//parser.addPattern("typename", /^[A-Z][\w\d\-_]*/);
_RuleSyntax2.default.Type = function (_Rule$Pattern3) {
	_inherits(Type, _Rule$Pattern3);

	function Type() {
		_classCallCheck(this, Type);

		return _possibleConstructorReturn(this, (Type.__proto__ || Object.getPrototypeOf(Type)).apply(this, arguments));
	}

	return Type;
}(_RuleSyntax2.default.Pattern);
var type = _parser2.default.addRule("Type", new _RuleSyntax2.default.Type({
	pattern: /^[A-Z][\w\-]*/,
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
	pattern: /^-?([0-9]*[.])?[0-9]+/,
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
	pattern: /^-?([0-9]*[.])?[0-9]+/,
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
	pattern: /^(?:"[^"]*"|'[^']*')/
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
	pattern: /^(true|false|yes|no|ok|cancel)\b/,
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
// Add tokens identifier blacklist.
// TESTME
_parser2.default.identifier.addToBlacklist("true", "false", "yes", "no", "ok", "cancel");

// Literal list (array), eg:  `[1,2,true,false ]`
var list = _parser2.default.addExpression("literal-list", "\\[[list:{expression},]?\\]", {
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
_parser2.default.addSyntax("literal", "(literal:{number}|{text}|{boolean}|{literal-list})");

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
	function TextStream(textOrProps) {
		_classCallCheck(this, TextStream);

		if (typeof textOrProps === "string") this.text = textOrProps;else Object.assign(this, textOrProps);

		// Make sure `text` is defined.
		if (!("text" in this)) this.text = "";
		if (!("startIndex" in this)) this.startIndex = 0;
	}

	// Return an immutable clone of the stream.


	_createClass(TextStream, [{
		key: "clone",
		value: function clone(props) {
			var clone = new TextStream(this);
			Object.assign(clone, props);
			return clone;
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
		// Match `pattern` as regex at head of stream.
		// NOTE: regexes should start with `^`!
		// Returns match or undefined.

	}, {
		key: "match",
		value: function match(pattern) {
			if (!(pattern instanceof RegExp)) throw new TypeError("TextStream.match(" + pattern + "): expected RegExp");
			//TODO: use `stream.range` to ensure match is not not beyond `string.endIndex`
			return this.head.match(pattern);
		}
	}, {
		key: "startsWith",
		value: function startsWith(string) {
			//TODO: use `stream.range` to ensure match is not not beyond `string.endIndex`
			return this.head.startsWith(string);
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
			var endIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.text.length;

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

__webpack_require__(9);

__webpack_require__(10);

__webpack_require__(7);

__webpack_require__(8);

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
/* 8 */
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

//parser.addExpression("property-expression", "{property:property-name}+ {expression}", {
//
//	# Rules for defining classes (known as `types`)
//

_parser2.default.addExpression("property-expression", "(properties:the {identifier} of)+ {expression}", {
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

_parser2.default.addSyntax("scope-modifier", "(scope:global|constant|shared)");

_parser2.default.addStatement("declare-property", "{scope-modifier}? {assignment}", {
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
_parser2.default.addStatement("declare-property-as-one-of", "{identifier} as one of {list:literal-list}", {
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

// Numeric index in a list-like thing.
//
//	# Rules for dealing with numbers
//

_parser2.default.addExpression("index-expression", "item {number:integer} of {expression}", {
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
_parser2.default.addExpression("index-expression", "the {ordinal} item of {expression}", {
	toSource: function toSource() {
		var args = this.gatherArguments();
		var ordinal = args.ordinal.toSource();
		var expression = args.expression.toSource();
		return "spell.getItem(" + expression + ", " + ordinal + ")";
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

__webpack_require__(4);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// re-export parser for testing.
//
//	# Rules for infix and prefix operators.
//

exports.default = _parser2.default;

//## Infix operators:   `{lhs} <operator> {rhs}`, eg: `a is 1`
// NOTE: `operator.transformer` MUST return a function which transforms two arguments (`lhs` and `rhs`) into output.

_parser2.default.addInfixOperator("and", "and", {
	transformer: function transformer(a, b) {
		return "(" + a + " && " + b + ")";
	}
});
_parser2.default.addInfixOperator("or", "or", {
	transformer: function transformer(a, b) {
		return "(" + a + " || " + b + ")";
	}
});

_parser2.default.addInfixOperator("is", "is", {
	transformer: function transformer(a, b) {
		return "(" + a + " == " + b + ")";
	}
});
_parser2.default.addInfixOperator("is-not", "is not", {
	transformer: function transformer(a, b) {
		return "(" + a + " != " + b + ")";
	}
});

_parser2.default.addInfixOperator("is-exactly", "is exactly", {
	transformer: function transformer(a, b) {
		return "(" + a + " === " + b + ")";
	}
});
_parser2.default.addInfixOperator("is-not-exactly", "is not exactly", {
	transformer: function transformer(a, b) {
		return "(" + a + " !== " + b + ")";
	}
});

//TODO: `spell.isOfType(thing, type)`
//TODO: `is same type as` ?
_parser2.default.addInfixOperator("is-type-of", ["is a", "is an"], {
	transformer: function transformer(thing, type) {
		return "spell.isOfType(" + thing + ", '" + type + "')";
	}
});
_parser2.default.addInfixOperator("is-not-type-of", ["is not a", "is not an"], {
	transformer: function transformer(thing, type) {
		return "!spell.isOfType(" + thing + ", '" + type + "')";
	}
});

//TODO: `spell.contains(collection, thing)`
_parser2.default.addInfixOperator("is-in", ["is in", "is one of"], {
	transformer: function transformer(thing, list) {
		return "spell.contains(" + list + ", " + thing + ")";
	}
});
_parser2.default.addInfixOperator("is-not-in", ["is not in", "is not one of"], {
	transformer: function transformer(thing, list) {
		return "!spell.contains(" + list + ", " + thing + ")";
	}
});
//TESTME
_parser2.default.addInfixOperator("includes", ["includes", "contains"], {
	transformer: function transformer(list, thing) {
		return "spell.contains(" + list + ", " + thing + ")";
	}
});
_parser2.default.addInfixOperator("doesnt-include", ["does not include", "doesnt include", "does not contain", "doesnt contain"], {
	transformer: function transformer(list, thing) {
		return "!spell.contains(" + list + ", " + thing + ")";
	}
});

_parser2.default.addInfixOperator("gt", [">", "is greater than"], {
	transformer: function transformer(a, b) {
		return "(" + a + " > " + b + ")";
	}
});
_parser2.default.addInfixOperator("gte", [">=", "is greater than or equal to"], {
	transformer: function transformer(a, b) {
		return "(" + a + " >= " + b + ")";
	}
});
_parser2.default.addInfixOperator("lt", ["<", "is less than"], {
	transformer: function transformer(a, b) {
		return "(" + a + " < " + b + ")";
	}
});
_parser2.default.addInfixOperator("lte", ["<=", "is less than or equal to"], {
	transformer: function transformer(a, b) {
		return "(" + a + " <= " + b + ")";
	}
});

//TODO:  can't add `+` as a rule, fix this then add these
//TODO:  operator precedence???
//TESTME
_parser2.default.addInfixOperator("plus", ["\\+", "plus"], {
	transformer: function transformer(a, b) {
		return a + " + " + b;
	}
});
_parser2.default.addInfixOperator("minus", ["-", "minus"], {
	transformer: function transformer(a, b) {
		return a + " - " + b;
	}
});
_parser2.default.addInfixOperator("times", ["\\*", "times"], {
	transformer: function transformer(a, b) {
		return a + " * " + b;
	}
});
_parser2.default.addInfixOperator("divided-by", ["/", "divided by"], {
	transformer: function transformer(a, b) {
		return a + " / " + b;
	}
});

//TODO:  `+=` etc?  other math functions?

_parser2.default.addSyntax("infix-operator-expression", "{lhs:expression} {operator:infix-operator} {rhs:expression}", {
	toSource: function toSource(context) {
		var args = this.gatherArguments();
		var lhs = args.lhs.toSource(context);
		var rhs = args.rhs.toSource(context);

		var transformer = args.operator.matched.transformer;
		return transformer(lhs, rhs);
	}
});

//## Postifx operators:   `{lhs} <operator>`, e.g. `a is defined`
// NOTE: `operator.transformer` MUST return a function which transforms argument (`lhs`) into output.

_parser2.default.addPostfixOperator("is-defined", "is defined", {
	transformer: function transformer(thing) {
		return "(typeof " + thing + " !== 'undefined')";
	}
});
_parser2.default.addPostfixOperator("is-not-defined", ["is not defined", "is undefined"], {
	transformer: function transformer(thing) {
		return "(typeof " + thing + " === 'undefined')";
	}
});

//TODO: `spell.isEmpty(thing)`
_parser2.default.addPostfixOperator("is-empty", "is empty", {
	transformer: function transformer(thing) {
		return "spell.isEmpty(" + thing + ")";
	}
});
_parser2.default.addPostfixOperator("is-not-empty", "is not empty", {
	transformer: function transformer(thing) {
		return "!spell.isEmpty(" + thing + ")";
	}
});

_parser2.default.addSyntax("postfix-operator-expression", "{lhs:expression} {operator:postfix-operator}", {
	toSource: function toSource(context) {
		var args = this.gatherArguments();
		var lhs = args.lhs.toSource(context);
		var transformer = args.operator.matched.transformer;
		return transformer(lhs);
	}
});

// TODO: this should really be a general "expression"...
_parser2.default.addSyntax("operator-expression", "(expression:{postfix-operator-expression}|{infix-operator-expression})");

/***/ }),
/* 11 */
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

/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgMDFmMmI0MTVjNGZhNzY5ODhiMzQiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZVN5bnRheC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbInBhcnNlciIsIndpbmRvdyIsImNvbnNvbGUiLCJncm91cCIsImxvZyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInJ1bGVzIiwiY3JlYXRlIiwibmFtZSIsInN0cmVhbSIsInJ1bGUiLCJnZXRSdWxlIiwiU3ludGF4RXJyb3IiLCJlYXRXaGl0ZXNwYWNlIiwicGFyc2UiLCJyZXN1bHQiLCJ3aGl0ZXNwYWNlIiwibmV4dCIsImV4aXN0aW5nIiwiQWx0ZXJuYXRpdmVzIiwiZGVidWciLCJydWxlTmFtZSIsImFkZFJ1bGUiLCJwYXR0ZXJuIiwiUGF0dGVybiIsInRva2VucyIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsInN0YXJ0SW5kZXgiLCJuZXN0aW5nIiwibmVzdGVkIiwiZW5kSW5kZXgiLCJsYXN0SW5kZXgiLCJsZW5ndGgiLCJ0b2tlbiIsInNsaWNlIiwiREVCVUciLCJSdWxlIiwicHJvcHMiLCJjbG9uZSIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsImNvbnN0cnVjdG9yIiwiZ2F0aGVyQXJndW1lbnRzIiwibWF0Y2hlZCIsImFyZ3VtZW50IiwiU3RyaW5nIiwic3RhcnRzV2l0aCIsInN0cmluZyIsIm9wdGlvbmFsIiwibWVyZ2VTdHJpbmdzIiwiZmlyc3QiLCJzZWNvbmQiLCJtYXRjaCIsImJsYWNrbGlzdCIsIndvcmRzIiwiZm9yRWFjaCIsIndvcmQiLCJLZXl3b3JkIiwiUmVnRXhwIiwibWVyZ2VLZXl3b3JkcyIsInNwbGl0Iiwiam9pbiIsIlN1YnJ1bGUiLCJOZXN0ZWQiLCJTZXF1ZW5jZSIsInJlc3VsdHMiLCJwdXNoIiwic2VxdWVuY2UiLCJhcmdzIiwiYXJnTmFtZSIsIl9hcmciLCJBcnJheSIsImlzQXJyYXkiLCJFeHByZXNzaW9uIiwiU3RhdGVtZW50IiwiYmVzdE1hdGNoIiwiY29udGV4dCIsInRvU291cmNlIiwiUmVwZWF0IiwiaW5jbHVkZXMiLCJyZXBlYXQiLCJtYXAiLCJMaXN0IiwiaXRlbSIsImRlbGltaXRlciIsImluZGV4IiwicGFyc2VSdWxlU3ludGF4Iiwic3ludGF4IiwiU2VxdWVuY2VDb25zdHJ1Y3RvciIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInBhcnNlUnVsZVN5bnRheF90b2tlbnMiLCJTWU5UQVhfRVhQUkVTU0lPTiIsInBhcnNlUnVsZVN5bnRheF90b2tlbiIsImxhc3QiLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zdHJpbmciLCJwYXJzZVJ1bGVTeW50YXhfc3VicnVsZSIsInBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyIsInBhcnNlUnVsZVN5bnRheF9saXN0IiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsInN1YnN0ciIsInRvU3RyaW5nIiwiZmluZE5lc3RlZFRva2VucyIsImFsdGVybmF0ZXMiLCJncm91cEFsdGVybmF0ZXMiLCJjdXJyZW50IiwiaSIsImNvbmNhdCIsInN5bWJvbCIsImRlZmluZVByb3BlcnRpZXMiLCJwcm90b3R5cGUiLCJhZGRTeW50YXgiLCJ2YWx1ZSIsInJ1bGVTeW50YXgiLCJlIiwiZXJyb3IiLCJhZGRTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiYWRkSW5maXhPcGVyYXRvciIsInRyYW5zZm9ybWVyIiwiX19pbmZpeE9wZXJhdG9ycyIsImluZml4T3BlcmF0b3JzIiwiZ2V0Iiwib3BlcmF0b3JzIiwiZGVmaW5lUHJvcGVydHkiLCJjb25maWd1cmFibGUiLCJhZGRQb3N0Zml4T3BlcmF0b3IiLCJfX3Bvc3RmaXhPcGVyYXRvcnMiLCJwb3N0Zml4T3BlcmF0b3JzIiwiV2hpdGVzcGFjZSIsIklkZW50aWZpZXIiLCJpZGVudGlmaWVyIiwicmVwbGFjZSIsImFkZFRvQmxhY2tsaXN0IiwiVHlwZSIsInR5cGUiLCJOdW1iZXIiLCJudW1iZXIiLCJwYXJzZUZsb2F0IiwiSW50ZWdlciIsInBhcnNlSW50IiwiVGV4dCIsInRleHQiLCJCb29sZWFuIiwiYm9vbCIsImxpc3QiLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJoZWFkIiwic3Vic3RyaW5nIiwicmFuZ2UiLCJleHByZXNzaW9uIiwicmV2ZXJzZSIsInRoaW5nIiwiYXNzaWdubWVudCIsInNjb3BlIiwicGx1cmFsIiwidG9VcHBlckNhc2UiLCJ2YWx1ZXMiLCJmaXJzdFZhbHVlIiwib3JkaW5hbCIsImEiLCJiIiwibGhzIiwicmhzIiwib3BlcmF0b3IiXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxtREFBMkMsY0FBYzs7QUFFekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxt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LEVBQ01tQyxvQkFETixFQUNZekM7QUFEWixDIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMTEpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDAxZjJiNDE1YzRmYTc2OTg4YjM0IiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCIvLyBTcGVsbCBcIkVuZ2xpc2hcIiBwYXJzZXIgc3RyYXdtYW5cblxuLy8gVE9ETzpcdGNvbnNvbGlkYXRlIHN1YnNlcXVlbnQgbGl0ZXJhbCB3b3JkcyAvIHN0cmluZ3MgaW50byBhIHNpbmdsZSByZWdleD9cbi8vIFRPRE86XHRgdGVzdGAgZnVuY3Rpb24gZm9yIHF1aWNrIG5vLWdvb2QgaGl0IG9uIGB7YX0gYmxhaCBibGFoIHtifWA/XG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcms6ICAgYHtleHByZXNzaW9ufSBpcyB7ZXhwcmVzc2lvbn1gXG4vLyBUT0RPOlx0Y3VzdG9tIFN5bnRheEVycm9yIGV0YyB3aGljaCB1bmRlcnN0YW5kIHN0cmVhbXNcbi8vIFRPRE86XHRicmVhayBgZmlsZWAgaW50byBsaW5lcyBhbmQgcHJvY2VzcyBlYWNoIChpbmNsLiBzdWJzdHIvbWF0Y2ggbm90IGdvaW5nIGJleW9uZCB0aGUgZW5kKVxuLy8gVE9ETzpcdG5lc3RpbmcgLS0gaXMgdGhpcyBqdXN0IGluZGVudCA9IFwiYWRkIGJsb2NrIHNjb3BlXCJcbi8vIFRPRE86XHRwcm9tb3Rpb24gcGF0dGVybiBmb3IgZ2F0aGVyIGFyZ3VtZW50cyAoZWc6IGxpdGVyYWwtbGlzdCkgPz8/XG4vLyBUT0RPOlx0V2hhdCBkb2VzIHN5bnRheCB0cmVlIGxvb2sgbGlrZT8gIEhvdyBkbyB3ZSBleHRyYWN0IG1lYW5pbmcgb3V0IG9mIHRoZSBuZXN0P1xuLy8gVE9ETzpcdFJlY3ljbGUgd29yZC9zdHJpbmcvcGF0dGVybiBydWxlcyB0byBtb3JlIGVhc2lseSBzZWUgY29tbW9uYWxpdHkuLi5cbi8vIFRPRE86XHRQYXNzIGBjb250ZXh0YCB0byB0b1NvdXJjZSgpLCBhZGQgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYGNsYXNzYCwgdmFyaWFibGVzIGFuZCBjb2RlIHRvIGBtZXRob2RgLCBgZ2xvYmFsYCBzdHVmZiBldGNcblxuaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ2xvbmUgcnVsZXMsIHN0YXJ0aW5nIHdpdGggYSBjb21wbGV0ZWx5IGVtcHR5IG1hcCBpZiBub3QgZGVmaW5lZCAobm8gc3RhbmRhcmQgb2JqZWN0IGtleXMpXG5cdFx0dGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5ydWxlcyB8fCBudWxsKTtcblx0fVxuXG5cdGdldFJ1bGUobmFtZSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzW25hbWVdO1xuXHR9XG5cbi8vIyMjIFBhcnNpbmdcblxuXHQvLyBQYXJzZSBgbmFtZWBkIHJ1bGUgYXQgaGVhZCBvZiBgc3RyZWFtYC5cblx0Ly8gSGFuZGxlcyBvcHRpb25hbCBhbmQgcmVwZWF0aW5nIHJ1bGVzIGFzIHdlbGwgYXMgZWF0aW5nIHdoaXRlc3BhY2UuXG5cdC8vIFJldHVybnMgcmVzdWx0IG9mIHBhcnNlLlxuXHRwYXJzZShuYW1lLCBzdHJlYW0pIHtcblx0XHRpZiAodHlwZW9mIHN0cmVhbSA9PT0gXCJzdHJpbmdcIikgc3RyZWFtID0gbmV3IFRleHRTdHJlYW0oc3RyZWFtKTtcblx0XHRsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShuYW1lKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZSAke25hbWV9IG5vdCB1bmRlcnN0b29kYCwgbmFtZSwgc3RyZWFtKTtcblx0XHRzdHJlYW0gPSB0aGlzLmVhdFdoaXRlc3BhY2Uoc3RyZWFtKTtcblx0XHRyZXR1cm4gcnVsZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHR9XG5cblx0Ly8gRWF0IHdoaXRlc3BhY2UgKGFjY29yZGluZyB0byBgcnVsZXMud2hpdGVzcGFjZWApIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBuZXcgc3RyZWFtIGlmIHdlIG1hdGNoZWQgd2hpdGVzcGFjZSwgb3RoZXJ3aXNlIHRoZSBzYW1lIHN0cmVhbS5cblx0Ly8gT3RoZXJ3aXNlIHJldHVybnMgdGhpcyBzYW1lIHN0cmVhbS5cblx0ZWF0V2hpdGVzcGFjZShzdHJlYW0pIHtcblx0XHR2YXIgcmVzdWx0ID0gdGhpcy5ydWxlcy53aGl0ZXNwYWNlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJlc3VsdCA/IHJlc3VsdC5uZXh0KCkgOiBzdHJlYW07XG5cdH1cblxuLy8jIyMgUnVsZSBmYWN0b3JpZXNcblxuXHQvLyBBZGQgYSBydWxlIHRvIG91ciBsaXN0IG9mIHJ1bGVzIVxuXHQvLyBUT0RPOiBjb252ZXJ0IHRvIGBhbHRlcm5hdGl2ZXNgIG9uIG92ZXJ3cml0ZT9cblx0YWRkUnVsZShuYW1lLCBydWxlKSB7XG5cdFx0bGV0IGV4aXN0aW5nID0gdGhpcy5ydWxlc1tuYW1lXTtcblx0XHRpZiAoZXhpc3RpbmcpIHtcblx0XHRcdGlmICghKGV4aXN0aW5nIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpKSB7XG5cdFx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBDb252ZXJ0aW5nIHJ1bGUgJyR7bmFtZX0nIHRvIGFsdGVybmF0aXZlc2ApO1xuXHRcdFx0XHRleGlzdGluZyA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IG5hbWU6IGV4aXN0aW5nLm5hbWUgfHwgbmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBleGlzdGluZztcblx0XHRcdH1cblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRpbmcgcnVsZSAnJHtydWxlLnJ1bGVOYW1lfScgdG8gJyR7bmFtZX0nOiBgLCBydWxlKTtcblx0XHRcdGV4aXN0aW5nLmFkZFJ1bGUocnVsZSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZS5ydWxlTmFtZSA9IG5hbWU7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gcnVsZTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblxuXHQvLyBBZGQgcmVnZXggYXMgYSBwYXR0ZXJuIHRvIG91ciBsaXN0IG9mIHJ1bGVzXG5cdGFkZFBhdHRlcm4obmFtZSwgcGF0dGVybiwgcHJvcGVydGllcykge1xuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuUGF0dGVybihwcm9wZXJ0aWVzKTtcblx0XHRydWxlLnBhdHRlcm4gPSBwYXR0ZXJuO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH1cblxuXG4vL1xuLy8gIyMgVXRpbGl0eSBtZXRob2RzXG4vL1xuXHQvLyBGaW5kIHRoZSBtYXRjaGluZyBpbnN0YW5jZSBvZiBwb3NzaWJseSBuZXN0ZWQgYGVuZFRva2VuYCB0byBiYWxhbmNlIGBzdGFydFRva2VuYC5cblx0Ly8gSWYgc3VjY2Vzc2Z1bCwgcmV0dXJucyBgeyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2UgfWBcblx0Ly8gVGhyb3dzIGlmIHVuc3VjZXNzZnVsLlxuXHRzdGF0aWMgZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIHN0YXJ0VG9rZW4sIGVuZFRva2VuLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGlmICh0b2tlbnNbc3RhcnRJbmRleF0gIT09IHN0YXJ0VG9rZW4pIHRocm93IG5ldyBTeW50YXhFcnJvcihgRXhwZWN0ZWQgJyR7c3RhcnRUb2tlbn0nIGF0IGluZGV4ICR7c3RhcnRJbmRleH0gb2YgdG9rZW5zYCk7XG5cdFx0bGV0IG5lc3RpbmcgPSAwO1xuXHRcdGxldCBuZXN0ZWQgPSBmYWxzZTtcblx0XHRmb3IgKGxldCBlbmRJbmRleCA9IHN0YXJ0SW5kZXggKyAxLCBsYXN0SW5kZXggPSB0b2tlbnMubGVuZ3RoOyBlbmRJbmRleCA8IGxhc3RJbmRleDsgZW5kSW5kZXgrKykge1xuXHRcdFx0bGV0IHRva2VuID0gdG9rZW5zW2VuZEluZGV4XTtcblx0XHRcdGlmICh0b2tlbiA9PT0gc3RhcnRUb2tlbikge1xuXHRcdFx0XHRuZXN0aW5nKys7XG5cdFx0XHRcdG5lc3RlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodG9rZW4gPT09IGVuZFRva2VuKSB7XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKVxuXHRcdFx0XHRcdHJldHVybiB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZTogdG9rZW5zLnNsaWNlKHN0YXJ0SW5kZXgrMSwgZW5kSW5kZXgpLCBuZXN0ZWQgfTtcblx0XHRcdFx0bmVzdGluZy0tO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENvdWxkbid0IGZpbmQgbWF0Y2hpbmcgJyR7ZW5kVG9rZW59J3Mgc3RhcnRpbmcgYXQgaXRlbSAke3N0YXJ0SW5kZXh9YCk7XG5cdH1cblxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUGFyc2VyLmpzIiwiLy9cdCMgUGFyc2VyIFJ1bGVzXG4vL1x0UnVsZXMgY2FuIGJlIGFzIHNpbXBsZSBhcyBhIHN0cmluZyBgS2V5d29yZGAgb3IgYSBjb21wbGV4IHNlcXVlbmNlIG9mIChuZXN0ZWQpIHJ1bGVzLlxuLy9cbi8vXHRQYXJzZSBhIHJ1bGUgd2l0aCBgcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSlgLCB0aGlzIHdpbGwgZWl0aGVyOlxuLy9cdFx0LSByZXR1cm4gYHVuZGVmaW5lZGAgaWYgdGhlIHJ1bGUgZG9lc24ndCBtYXRjaCB0aGUgaGVhZCBvZiB0aGUgc3RyZWFtLCBvclxuLy9cdFx0LSByZXR1cm4gYSBDTE9ORSBvZiB0aGUgcnVsZSB3aXRoIGF0IGxlYXN0IHRoZSBmb2xsb3dpbmc6XG4vL1x0XHRcdC0gYHN0cmVhbWBcdFx0U3RyZWFtIHdoaWNoIHdhcyBtYXRjaGVkIHdpdGggYHN0YXJ0SW5kZXhgIGF0IHRoZSBzdGFydCBvZiB0aGUgbWF0Y2hcbi8vXHRcdFx0LSBgZW5kSW5kZXhgXHROb24taW5jbHVzaXZlIGVuZCBpbmRleCBpbiBzdHJlYW0gd2hlcmUgbWF0Y2ggZW5kcy5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLmdhdGhlckFyZ3VtZW50cygpYFx0XHRSZXR1cm4gbWF0Y2hlZCBhcmd1bWVudHMgaW4gYSBmb3JtYXQgc3VpdGFibGUgdG8gZG86XG4vL1x0XHQtIGBydWxlLnRvU291cmNlKClgXHRcdFx0XHRSZXR1cm4gamF2YXNjcmlwdCBzb3VyY2UgdG8gaW50ZXJwcmV0IHRoZSBydWxlLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5cblxuLy9UT0RPOiBtYWtlIGdhdGhlckFyZ3VtZW50cygpIHN0YXRpYyBhbmQgY2FsbCBvbiB0aGlzXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdC8vIENsb25lIHRoaXMgcnVsZSBhbmQgYWRkIGFueSBgcHJvcHNgIHBhc3NlZCBpbi5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHR2YXIgY2xvbmUgPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xuXHRcdE9iamVjdC5hc3NpZ24oY2xvbmUsIHByb3BzKTtcblx0XHRyZXR1cm4gY2xvbmU7XG5cdH1cblxuXHQvLyBGb3IgYSBydWxlIGluc3RhbmNlIGFzc29jaWF0ZWQgd2l0aCBhIHN0cmVhbSxcblx0Ly8gcmV0dXJuIGEgbmV3IHN0cmVhbSBBRlRFUiB0aGlzIHJ1bGUncyBlbmQuXG5cdG5leHQoKSB7XG5cdFx0aWYgKCF0aGlzLnN0cmVhbSB8fCB0aGlzLmVuZEluZGV4ID09PSB1bmRlZmluZWQpXG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBydWxlLm5leHQoKSBjYWxsZWQgb24gcnVsZSB3aXRob3V0IGEgc3RyZWFtYCwgdGhpcyk7XG5cdFx0cmV0dXJuIHRoaXMuc3RyZWFtLmFkdmFuY2VUbyh0aGlzLmVuZEluZGV4KTtcblx0fVxuXG5cbi8vXG4vLyAjIyBvdXRwdXQgYXMgc291cmNlXG4vL1xuXHRnZXQgX2FyZygpIHsgcmV0dXJuIHRoaXMuYXJndW1lbnQgfHwgdGhpcy5ydWxlTmFtZSB8fCB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgfVxuXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE5vdGUgdGhhdCB3ZSBkZWZpbmUgYGdhdGhlckFyZ3VtZW50cygpYCBzdGF0aWNhbGx5IG9uIGVhY2ggc3ViY2xhc3Ncblx0Ly9cdGFuZCB0aGVuIGluc3RhbmNlIG1ldGhvZCBjYWxscyBpdCBvbiBpdHNlbGYuXG5cdHN0YXRpYyBnYXRoZXJBcmd1bWVudHMocnVsZSkge1xuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cdGdhdGhlckFyZ3VtZW50cygpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5nYXRoZXJBcmd1bWVudHModGhpcyk7XG5cdH1cblxuXHQvLyBPdXRwdXQgdmFsdWUgZm9yIHRoaXMgSU5TVEFOVElBVEVEIHJ1bGUgYXMgc291cmNlLlxuXHR0b1NvdXJjZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkO1xuXHR9XG5cbi8vXG4vLyAjIyBncm91cDogcmVmbGVjdGlvblxuLy9cblx0Z2V0IHJ1bGVUeXBlKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdH1cbn1cblxuXG5cbi8vIFJ1bGUgZm9yIGxpdGVyYWwgc3RyaW5nIHZhbHVlLCB3aGljaCBpbmNsdWRlIHB1bmN0dWF0aW9uIHN1Y2ggYXMgYChgIGV0Yy5cbi8vVE9ETzogcmVuYW1lIGBTeW1ib2xgPz8/XG5SdWxlLlN0cmluZyA9IGNsYXNzIFN0cmluZyBleHRlbmRzIFJ1bGUge1xuLy9UT0RPOiB0aHJvdyBpZiBgc3RyaW5nYCBpcyBub3QgZGVmaW5lZD9cblx0Ly8gUGFyc2UgdGhpcyBydWxlIGF0IHRoZSBiZWdpbm5pbmcgb2YgYHN0cmVhbWAsIGFzc3VtaW5nIG5vIHdoaXRlc3BhY2UgYmVmb3JlLlxuXHQvLyBEZWZhdWx0IGlzIHRoYXQgYHJ1bGUuc3RyaW5nYCBpcyBsaXRlcmFsIHN0cmluZyB0byBtYXRjaC5cblx0Ly8gT24gbWF0Y2gsIHJldHVybnMgY2xvbmUgb2YgcnVsZSB3aXRoIGB2YWx1ZWAsIGBzdHJlYW1gIGFuZCBgZW5kSW5kZXhgLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICghc3RyZWFtLnN0YXJ0c1dpdGgodGhpcy5zdHJpbmcpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRoaXMuc3RyaW5nLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgdGhpcy5zdHJpbmcubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG4vLyBNZXJnZSB0d28gU3RyaW5nIHJ1bGVzIHRvZ2V0aGVyLCBhZGRpbmcgdGhlIHNlY29uZCB0byB0aGUgZmlyc3QuXG5SdWxlLm1lcmdlU3RyaW5ncyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0Zmlyc3Quc3RyaW5nICs9IHNlY29uZC5zdHJpbmc7XG5cdHJldHVybiBmaXJzdDtcbn1cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vIE5PVEU6IHRoZSByZWdleCBzaG91bGQgc3RhcnQgd2l0aCBgL14uLi5gIHRvIG1hdGNoIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cbi8vIFlvdSBjYW4gc3BlY2lmeSBhIGBydWxlLmJsYWNrbGlzdGAgb2YgbWF0Y2hlcyB0aGF0IHdpbGwgc3BlY2lmaWNhbGx5IE5PVCB3b3JrLCBlZyBmb3IgYGlkZW50aWZpZXIuXG5SdWxlLlBhdHRlcm4gPSBjbGFzcyBQYXR0ZXJuIGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0dmFyIG1hdGNoID0gc3RyZWFtLm1hdGNoKHRoaXMucGF0dGVybik7XG5cdFx0aWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGJhaWwgaWYgbm90IGluIGJsYWNrbGlzdFxuXHRcdHZhciBtYXRjaGVkID0gbWF0Y2hbMF07XG5cdFx0aWYgKHRoaXMuYmxhY2tsaXN0ICYmIHRoaXMuYmxhY2tsaXN0W21hdGNoZWRdKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogbWF0Y2hlZCxcblx0XHRcdGVuZEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCArIG1hdGNoZWQubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHRhZGRUb0JsYWNrbGlzdCguLi53b3Jkcykge1xuXHRcdGlmICghdGhpcy5ibGFja2xpc3QpIHRoaXMuYmxhY2tsaXN0ID0ge307XG5cdFx0d29yZHMuZm9yRWFjaCh3b3JkID0+IHRoaXMuYmxhY2tsaXN0W3dvcmRdID0gdHJ1ZSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5wYXR0ZXJuO1xuXHR9XG59XG5cblxuLy8gS2V5d29yZCBwYXR0ZXJuXG4vL1x0YHJ1bGUuc3RyaW5nYCBpcyB0aGUga2V5d29yZCBzdHJpbmcgdG8gbWF0Y2guXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHRcdC8vIGNyZWF0ZSBwYXR0ZXJuIHdoaWNoIG1hdGNoZXMgYXQgd29yZCBib3VuZGFyeVxuXHRcdGlmICghdGhpcy5wYXR0ZXJuKSB7XG5cdFx0XHRpZiAoIXRoaXMuc3RyaW5nKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQga2V5d29yZCBwcm9wZXJ0eVwiKTtcblx0XHRcdHRoaXMucGF0dGVybiA9IG5ldyBSZWdFeHAoYF4ke3RoaXMuc3RyaW5nfVxcXFxiYCk7XG5cdFx0fVxuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMuc3RyaW5nfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuLy8gTWVyZ2UgdHdvIEtleXdvcmQgcnVsZXMgdG9nZXRoZXIsIGFkZGluZyB0aGUgc2Vjb25kIHRvIHRoZSBmaXJzdC5cblJ1bGUubWVyZ2VLZXl3b3JkcyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0Zmlyc3Quc3RyaW5nICs9IFwiIFwiICsgc2Vjb25kLnN0cmluZztcblx0Zmlyc3QucGF0dGVybiA9IG5ldyBSZWdFeHAoXCJeXCIgKyBmaXJzdC5zdHJpbmcuc3BsaXQoXCIgXCIpLmpvaW4oXCJcXFxccytcIikgKyBcIlxcXFxiXCIpO1xuXHRyZXR1cm4gZmlyc3Q7XG59XG5cblxuLy8gU3VicnVsZSAtLSBuYW1lIG9mIGFub3RoZXIgcnVsZSB0byBiZSBjYWxsZWQuXG4vLyBgcnVsZS5ydWxlYCBpcyB0aGUgbmFtZSBvZiB0aGUgcnVsZSBpbiBgcGFyc2VyLnJ1bGVzYC5cblJ1bGUuU3VicnVsZSA9IGNsYXNzIFN1YnJ1bGUgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHR2YXIgcnVsZSA9IHBhcnNlci5nZXRSdWxlKHRoaXMucnVsZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEF0dGVtcHRpbmcgdG8gcGFyc2UgdW5rbm93biBydWxlICcke3RoaXMubmFtZX0nYCwgdGhpcyk7XG5cdFx0dmFyIHJlc3VsdCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIHJlc3VsdC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgeyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlfX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuXG4vLyBBYnN0cmFjdDogIGBOZXN0ZWRgIHJ1bGUgLS0gY29tcG9zZWQgb2YgYSBzZXJpZXMgb2Ygb3RoZXIgYHJ1bGVzYC5cblJ1bGUuTmVzdGVkID0gY2xhc3MgTmVzdGVkIGV4dGVuZHMgUnVsZSB7fVxuXG5cbi8vIFNlcXVlbmNlIG9mIHJ1bGVzIHRvIG1hdGNoIChhdXRvLWV4Y2x1ZGluZyB3aGl0ZXNwYWNlKS5cblJ1bGUuU2VxdWVuY2UgPSBjbGFzcyBTZXF1ZW5jZSBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcmVzdWx0cyA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IHJlc3VsdCA9IHJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghcmVzdWx0ICYmICFydWxlLm9wdGlvbmFsKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKHJlc3VsdCkge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2gocmVzdWx0KTtcblx0XHRcdFx0bmV4dCA9IHJlc3VsdC5uZXh0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGlmIHdlIGdldCBoZXJlLCB3ZSBtYXRjaGVkIGFsbCB0aGUgcnVsZXMhXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG4vL1RPRE9DXG5cdC8vIEdhdGhlciBhcmd1bWVudHMgZnJvbSBvdXIgcGFyc2VkIGByZXN1bHRzYCBhcnJheS5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGB2YWx1ZXNgIGFycmF5IGluZGV4ZWQgYnlcblx0Ly9cdFx0LSBgcmVzdWx0cy5hcmd1bWVudGA6XHRcdGFyZ3VtZW50IHNldCB3aGVuIHJ1bGUgd2FzIGRlY2xhcmVkLCBlZzogYHt2YWx1ZTpsaXRlcmFsfWAgPT4gYHZhbHVlYFxuXHQvL1x0XHQtIGByZXN1bHRzLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIHJ1bGUgdHlwZTpcdFx0XHRcdG5hbWUgb2YgdGhlIHJ1bGUgdHlwZVxuXHRzdGF0aWMgZ2F0aGVyQXJndW1lbnRzKHNlcXVlbmNlKSB7XG5cdFx0aWYgKCFzZXF1ZW5jZS5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCBhcmdzID0ge307XG5cdFx0Zm9yIChsZXQgbmV4dCBvZiBzZXF1ZW5jZS5yZXN1bHRzKSB7XG5cdFx0XHRsZXQgYXJnTmFtZSA9IG5leHQuX2FyZztcblx0XHRcdC8vIEZvciBuZXN0ZWQgcnVsZXMsIHJlY3Vyc2UgdG8gZ2V0IHRoZWlyIGFyZ3VtZW50c1xuXHRcdFx0bGV0IHJlc3VsdCA9IG5leHQuZ2F0aGVyQXJndW1lbnRzKCk7XG5cblx0XHRcdC8vIElmIGFyZyBhbHJlYWR5IGV4aXN0cywgY29udmVydCB0byBhbiBhcnJheVxuXHRcdFx0aWYgKGFyZ05hbWUgaW4gYXJncykge1xuXHRcdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkoYXJnc1thcmdOYW1lXSkpIGFyZ3NbYXJnTmFtZV0gPSBbYXJnc1thcmdOYW1lXV07XG5cdFx0XHRcdGFyZ3NbYXJnTmFtZV0ucHVzaChyZXN1bHQpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGFyZ3NbYXJnTmFtZV0gPSByZXN1bHQ7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBhcmdzO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBleHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuUnVsZS5TdGF0ZW1lbnQgPSBjbGFzcyBzdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gQWx0ZXJuYXRpdmUgc3ludGF4LlxuLy8gTk9URTogQ3VycmVudGx5IHRha2VzIHRoZSBsb25nZXN0IHZhbGlkIG1hdGNoLlxuLy8gVE9ETzogbWF0Y2ggYWxsIHZhbGlkIGFsdGVybmF0aXZlc1xuLy8gVE9ETzogcmVuYW1lP1xuUnVsZS5BbHRlcm5hdGl2ZXMgPSBjbGFzcyBBbHRlcm5hdGl2ZXMgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpO1xuXHRcdGlmICghdGhpcy5ydWxlcykgdGhpcy5ydWxlcyA9IFtdO1xuXHR9XG5cblx0Ly8gRmluZCB0aGUgTE9OR0VTVCBtYXRjaFxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBiZXN0TWF0Y2g7XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKTtcblx0XHRcdGlmICghbWF0Y2gpIGNvbnRpbnVlO1xuXG5cdFx0XHQvLyB0YWtlIHRoZSBsb25nZXN0IG1hdGNoXG5cdFx0XHRpZiAoIWJlc3RNYXRjaCB8fCBtYXRjaC5lbmRJbmRleCA+IGJlc3RNYXRjaC5lbmRJbmRleClcblx0XHRcdFx0YmVzdE1hdGNoID0gbWF0Y2g7XG5cdFx0fVxuXHRcdGlmICghYmVzdE1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogYmVzdE1hdGNoLFxuXHRcdFx0ZW5kSW5kZXg6IGJlc3RNYXRjaC5lbmRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0YWRkUnVsZShydWxlKSB7XG5cdFx0dGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5yZXN1bHRzYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgbmV4dCA9IHN0cmVhbTtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5ydWxlLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgYnJlYWs7XG5cblx0XHRcdHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0bmV4dCA9IHJlc3VsdC5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdHN0YXRpYyBnYXRoZXJBcmd1bWVudHMocmVwZWF0KSB7XG5cdFx0aWYgKCFyZXBlYXQucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gcmVwZWF0LnJlc3VsdHMubWFwKCByZXN1bHQgPT4gcmVzdWx0LmdhdGhlckFyZ3VtZW50cygpICk7XG5cdH1cblxuXHR0b1NvdXJjZSgpIHtcblx0XHR0aHJvdyBcIkRvbid0IHVuZGVyc3RhbmQgaG93IHRvIHNvdXJjZSBSdWxlLlJlcGVhdCFcIjtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdGNvbnN0IHJ1bGUgPSAodGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSB8fCB0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQgJiYgdGhpcy5ydWxlLnN0cmluZy5pbmNsdWRlcyhcIiBcIilcblx0XHRcdFx0ICAgPyBgKCR7dGhpcy5ydWxlfSlgXG5cdFx0XHRcdCAgIDogYCR7dGhpcy5ydWxlfWBcblx0XHRcdFx0KTtcblx0XHRyZXR1cm4gYCR7cnVsZX0ke3RoaXMub3B0aW9uYWwgPyAnKicgOiAnKyd9YDtcblx0fVxufVxuXG5cbi8vIExpc3QgbWF0Y2ggcnVsZTogICBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAuIGVnXCIgYFt7bnVtYmVyfSxdYCB0byBtYXRjaCBgMSwyLDNgXG4vL1x0YHJ1bGUuaXRlbWAgaXMgdGhlIHJ1bGUgZm9yIGVhY2ggaXRlbSxcbi8vXHRgcnVsZS5kZWxpbWl0ZXJgIGlzIHRoZSBkZWxpbWl0ZXIgYmV0d2VlbiBlYWNoIGl0ZW0uXG4vLyBcdGBydWxlLnJlc3VsdHNgIGluIHRoZSBvdXRwdXQgaXMgdGhlIGxpc3Qgb2YgdmFsdWVzLlxuLy9cbi8vXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhIExpc3QgcnVsZSB3aWxsIE5PVCByZXBlYXQgKD8/Pz8pXG5SdWxlLkxpc3QgPSBjbGFzcyBMaXN0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0dmFyIHJlc3VsdHMgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdHJlc3VsdHMucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFkZWxpbWl0ZXIpIGJyZWFrO1xuXHRcdFx0bmV4dCA9IGRlbGltaXRlci5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybiBtYXRjaGVkIGl0ZW0gYnkgaW5kZXhcblx0Z2V0SXRlbShpbmRleCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLnJlc3VsdHNbaW5kZXhdO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XHRcdC8vIFRPRE86IHRocm93Pz8/XG5cdFx0bGV0IHJlc3VsdHMgPSB0aGlzLnJlc3VsdHMubWFwKCByZXN1bHQgPT4gcmVzdWx0LnRvU291cmNlKCkgKS5qb2luKFwiLCBcIik7XG5cdFx0cmV0dXJuIGBbJHtyZXN1bHRzfV1gO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gcmUtZXhwb3J0IFJ1bGUgZm9yIHRlc3RpbmdcbmV4cG9ydCBkZWZhdWx0IFJ1bGU7XG5cbi8vXG4vL1x0IyBQYXJzaW5nIGBydWxlU3ludGF4YCB0byBjcmVhdGUgcnVsZXMgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUT0RPOlx0UHVsbCBgcGFyc2VSdWxlU3ludGF4YCBzdHVmZiBvdXQgaW50byBzZXBhcmF0ZSBtb2R1bGU/XG4vLyBUT0RPOlx0QmV0dGVyIG5hbWUgZm9yIGBydWxlU3ludGF4YFxuLy8gVE9ETzpcdFVzZSBrZXl3b3JkcyBpbiBzeW50YXggdG8gbWFrZSBhIHF1aWNrIHJlZ2V4LWJhc2VkIGB0ZXN0YCBmdW5jdGlvbiBmb3IgdGhlIGVudGlyZSBydWxlXG5PYmplY3QuYXNzaWduKFJ1bGUsIHtcblxuLy9cbi8vICMjIGdyb3VwOiBwYXJzaW5nIHN5bnRheFxuLy9cblxuLy8gVE9ETzogY29udmVydCB0byBUZXh0U3RyZWFtIHBhdHRlcm4gYWxhIG5vcm1hbCBwYXJzZXIgb25jZSB0aGF0IHNldHRsZXMgZG93bj8/P1xuXHRwYXJzZVJ1bGVTeW50YXgoc3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIFtdKTtcblxuXHRcdGxldCBydWxlO1xuXHRcdC8vIElmIHdlIG9ubHkgZ290IG9uZSB0aGluZywgcmV0dXJuIHRoYXQgYXMgdGhlIHJlc3VsdFxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSBydWxlc1swXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFNlcXVlbmNlQ29uc3RydWN0b3IoeyBydWxlcyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fSxcblxuXHR0b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KSB7XG5cdFx0Y29uc3QgU1lOVEFYX0VYUFJFU1NJT04gPSAvKD86W1xcd1xcLV0rfFxcXFxbXFxbXFwoXFx7XFwpXFx9XFxdXXxbXlxcc1xcd118XFx8KS9nO1xuXHRcdHZhciBzeW50YXhTdHJlYW0gPSBzeW50YXgubWF0Y2goU1lOVEFYX0VYUFJFU1NJT04pO1xuXHRcdGlmICghc3ludGF4U3RyZWFtKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHRva2VuaXplIHBhcnNlIHJ1bGUgc3ludGF4ID4+JHtzeW50YXh9PDxgKTtcblx0XHRyZXR1cm4gc3ludGF4U3RyZWFtO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbGFzdEluZGV4ID0gc3ludGF4U3RyZWFtLmxlbmd0aDtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKHJ1bGUpIHtcblx0XHRcdFx0dmFyIGxhc3QgPSBydWxlc1tydWxlcy5sZW5ndGgtMV07XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgU3RyaW5nYCBhbmQgbGFzdCB3YXMgYSBgU3RyaW5nYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0aWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuU3RyaW5nICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN0cmluZykge1xuXHRcdFx0XHRcdFJ1bGUubWVyZ2VTdHJpbmdzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgS2V5d29yZGAgYW5kIGxhc3Qgd2FzIGFsc28gYSBgS2V5d29yZGAsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGVsc2UgaWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkKSB7XG5cdFx0XHRcdFx0UnVsZS5tZXJnZUtleXdvcmRzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJ1bGVzLnB1c2gocnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHN0YXJ0SW5kZXggPSBlbmRJbmRleCArIDE7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlcztcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDApIHtcblx0XHR2YXIgc3ludGF4VG9rZW4gPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHQvLyBpZiB3ZSBnb3QgYSBcIlxcXFxcIiAod2hpY2ggYWxzbyBoYXMgdG8gZ28gaW50byB0aGUgc291cmNlIHN0cmluZyBhcyBcIlxcXFxcIilcblx0XHQvLyB0cmVhdCB0aGUgbmV4dCBiaXQgYXMgYSBsaXRlcmFsIHN0cmluZyByYXRoZXIgdGhhbiBhcyBhIHNwZWNpYWwgY2hhcmFjdGVyLlxuXHRcdGlmIChzeW50YXhUb2tlbiA9PT0gXCJcXFxcXCIpIHtcblx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCArIDEpO1xuXHRcdH1cblxuXHRcdHN3aXRjaCAoc3ludGF4VG9rZW4pIHtcblx0XHRcdGNhc2UgXCJ7XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIoXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiW1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKlwiOlxuXHRcdFx0Y2FzZSBcIitcIjpcblx0XHRcdGNhc2UgXCI/XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0XHQvLyB0aGUgZm9sbG93aW5nIHNob3VsZCBBTFdBWVMgYmUgY29uc3VtZWQgYnkgdGhlIGFib3ZlXG5cdFx0XHRjYXNlIFwifVwiOlxuXHRcdFx0Y2FzZSBcIilcIjpcblx0XHRcdGNhc2UgXCJdXCI6XG5cdFx0XHRjYXNlIFwifFwiOlxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgJHtzeW50YXhUb2tlbn0gZm91bmQgYXMgaXRlbSAke3N0YXJ0SW5kZXh9IG9mICR7dGhpcy5zeW50YXh9YCk7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzdHJpbmcgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF0sIHJ1bGU7XG5cdFx0Ly8gSWYgbGV0dGVycyBvbmx5LCBtYXRjaCBhcyBhIEtleXdvcmQgKHNvIHdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGFmdGVyIHRoZSBzdHJpbmcpLlxuXHRcdGlmIChzdHJpbmcubWF0Y2goL1tBLVphLXpdKy8pKSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuS2V5d29yZCh7IHN0cmluZyB9KTtcblx0XHR9XG5cdFx0Ly8gT3RoZXJ3aXNlIG1hdGNoIGFzIGEgU3RyaW5nLCB3aGljaCBkb2Vzbid0IHJlcXVpcmUgbm9uLXdvcmQgY2hhcnMgYWZ0ZXIgdGhlIHRleHQuXG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuU3RyaW5nKHsgc3RyaW5nOiBzdHJpbmcgfSk7XG5cdFx0XHQvLyBJZiBzdHJpbmcgc3RhcnRzIHdpdGggYFxcXFxgLCBpdCdzIGFuIGVzY2FwZWQgbGl0ZXJhbCAoZWc6IGBcXFtgIG5lZWRzIHRvIGlucHV0IGFzIGBcXFxcW2ApLlxuXHRcdFx0aWYgKHN0cmluZy5zdGFydHNXaXRoKFwiXFxcXFwiKSkge1xuXHRcdFx0XHQvLyByZW1vdmUgbGVhZGluZyBzbGFzaCBpbiBtYXRjaCBzdHJpbmcuLi5cblx0XHRcdFx0cnVsZS5zdHJpbmcgPSBydWxlLnN0cmluZy5zdWJzdHIoMSk7XG5cdFx0XHRcdC8vIGJ1dCBsZWF2ZSBpdCBpbiB0b1N0cmluZ1xuXHRcdFx0XHRydWxlLnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gWyBydWxlLCBzdGFydEluZGV4IF07XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBncm91cGluZyBleHByZXNzaW9uIGAoLi4ufC4uLilgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0Ly8gTk9URTogbmVzdGVkIHBhcmVucyBtYXkgbm90IGhhdmUgYWx0ZXJuYXRpdmVzLi4uIDotKCAgIGAoYXwoYnxjKSlgIHdvbid0IHdvcms/Pz9cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCIoXCIsIFwiKVwiLCBzdGFydEluZGV4KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHQvLyBzcGxpdCBpbnRvIGdyb3VwcywgaW5jbHVkaW5nIG5lc3RlZCBwYXJlbnNcblx0XHRsZXQgYWx0ZXJuYXRlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0ZXMoc2xpY2UpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0XHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKGdyb3VwLCBbXSk7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHRzWzBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdGxldCBydWxlID0gYWx0ZXJuYXRlcy5sZW5ndGggPT09IDEgPyBhbHRlcm5hdGVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0ZXMgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblxuXHRcdGZ1bmN0aW9uIGdyb3VwQWx0ZXJuYXRlcyh0b2tlbnMpIHtcblx0XHRcdHZhciBhbHRlcm5hdGVzID0gW107XG5cdFx0XHR2YXIgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGhhbmRsZSBuZXN0ZWQgcGFyZW5zXG5cdFx0XHRcdGVsc2UgaWYgKHRva2VuID09PSBcIihcIikge1xuXHRcdFx0XHRcdGxldCB7IGVuZEluZGV4IH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmRJbmRleCArIDEpKTtcblx0XHRcdFx0XHRpID0gZW5kSW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3VycmVudC5wdXNoKHRva2VuKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGN1cnJlbnQubGVuZ3RoKSBhbHRlcm5hdGVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRyZXR1cm4gYWx0ZXJuYXRlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdHZhciBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlN1YnJ1bGUoeyBydWxlOiBtYXRjaC5zbGljZVswXSB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBtYXRjaC5lbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuTGlzdCgpO1xuXHRcdHJ1bGUuaXRlbSA9IHJlc3VsdHNbMF1cblx0XHRydWxlLmRlbGltaXRlciA9IHJlc3VsdHNbMV1cblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG59KTtcblxuXG5cbi8vICMjICBBZGQgbWV0aG9kcyB0byBQYXJzZXIgdG8gZGVmaW5lIHJ1bGVzIHVzaW5nIHRoZSBhYm92ZSBzeW50YXguXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhQYXJzZXIucHJvdG90eXBlLCB7XG5cblx0Ly8gUGFyc2UgYSBgcnVsZVN5bnRheGAgcnVsZSBhbmQgYWRkIGl0IHRvIG91ciBsaXN0IG9mIHJ1bGVzLlxuXHQvLyBSZXR1cm5zIHRoZSBuZXcgcnVsZS5cblx0Ly8gTG9ncyBwYXJzaW5nIGVycm9ycyBidXQgYWxsb3dzIHRoaW5ncyB0byBjb250aW51ZS5cblx0YWRkU3ludGF4OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdHRyeSB7XG5cdFx0XHRsZXQgcnVsZSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IpO1xuXG5cdFx0XHQvLyBSZWZsZWN0IHRoZSBydWxlIGJhY2sgb3V0IHRvIG1ha2Ugc3VyZSBpdCBsb29rcyAobW9yZSBvciBsZXNzKSB0aGUgc2FtZVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGVkIHJ1bGUgJyR7bmFtZX0nOlxcbiAgSU5QVVQ6ICR7cnVsZVN5bnRheH0gXFxuIE9VVFBVVDogJHtydWxlfWApO1xuXG5cdFx0XHRPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmdyb3VwKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgc3ludGF4OiAke3J1bGVTeW50YXh9YCk7XG5cdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdH1cblx0fX0sXG5cblx0YWRkU3RhdGVtZW50OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBSdWxlLlN0YXRlbWVudCk7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJzdGF0ZW1lbnRcIiwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZEV4cHJlc3Npb246IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFJ1bGUuRXhwcmVzc2lvbik7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHJ1bGUpO1xuXHR9fSxcblxuXHQvLyBBZGQgaW5maXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIG9yIGJcIi5cblx0Ly8gTk9URTogaWYgeW91IGhhdmUgbW9yZSB0aGFuIG9uZSBtYXRjaGluZyBvcGVyYXRvcixcblx0Ly9cdFx0IHBhc3MgaW4gYW4gYXJyYXkgb2Ygc2ltcGxlIHN0cmluZ3Mgc28gYWxsIG9mIG91ciBvcGVyYXRvcnMgYXJlIHNpbXBsZSBzdHJpbmdzLlxuXHRhZGRJbmZpeE9wZXJhdG9yOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpIHtcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkSW5maXhPcGVyYXRvcihuYW1lLCBzeW50YXgsIHByb3BlcnRpZXMpKTtcblx0XHR9XG5cblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudHJhbnNmb3JtZXIpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgaW5maXggb3BlcmF0b3IgcnVsZSAnJHtuYW1lfScgdG8gc3BlY2lmeSAndHJhbnNmb3JtZXInIGZ1bmN0aW9uYClcblx0XHRcdH1cblx0XHRcdC8vIGNsZWFyIGxpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGZvciBnZXR0ZXIgYmVsb3dcblx0XHRcdGRlbGV0ZSB0aGlzLl9faW5maXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwiaW5maXgtb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIGluZml4IG9wZXJhdG9ycyBhcyBzdHJpbmdzLlxuXHQvLyBSZS1tZW1vaXplZCBhZnRlciBgYWRkSW5maXhPcGVyYXRvcmAgYWJvdmUuXG4vL1RPRE86IG1ha2UgYSBwYXR0ZXJuIGZvciB0aGlzPz8/XG5cdGluZml4T3BlcmF0b3JzOiB7IGdldDogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCF0aGlzLl9faW5maXhPcGVyYXRvcnMpIHtcblx0XHRcdHZhciBvcGVyYXRvcnMgPSB0aGlzLnJ1bGVzW1wiaW5maXgtb3BlcmF0b3JcIl1cblx0XHRcdFx0XHRcdCAmJiB0aGlzLnJ1bGVzW1wiaW5maXgtb3BlcmF0b3JcIl0ucnVsZXMubWFwKHJ1bGUgPT4gcnVsZS5zdHJpbmcpO1xuXHRcdFx0aWYgKG9wZXJhdG9ycykge1xuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJfX2luZml4T3BlcmF0b3JzXCIsIHtcblx0XHRcdFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0XHRcdFx0dmFsdWU6IG9wZXJhdG9yc1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX19pbmZpeE9wZXJhdG9ycztcblx0fX0sXG5cblx0Ly8gQWRkIHBvc3RmaXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIGlzIGRlZmluZWRcIlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZFBvc3RmaXhPcGVyYXRvcjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKSB7XG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFBvc3RmaXhPcGVyYXRvcihuYW1lLCBzeW50YXgsIHByb3BlcnRpZXMpKTtcblx0XHR9XG5cblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudHJhbnNmb3JtZXIpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgcG9zdGZpeCBvcGVyYXRvciBydWxlICcke25hbWV9JyB0byBzcGVjaWZ5ICd0cmFuc2Zvcm1lcicgZnVuY3Rpb25gKTtcblx0XHRcdH1cblx0XHRcdC8vIGNsZWFyIGxpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGZvciBnZXR0ZXIgYmVsb3dcblx0XHRcdGRlbGV0ZSB0aGlzLl9fcG9zdGZpeE9wZXJhdG9ycztcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJwb3N0Zml4LW9wZXJhdG9yXCIsIHJ1bGUpO1xuXHRcdH1cblx0fX0sXG5cblx0Ly8gTGlzdCBvZiBwb3N0Zml4IG9wZXJhdG9ycyBhcyBzdHJpbmdzLlxuXHQvLyBSZS1tZW1vaXplZCBhZnRlciBgYWRkSW5maXhPcGVyYXRvcmAgYWJvdmUuXG4vL1RPRE86IG1ha2UgYSBtZW1vaXphdGlvbiBwYXR0ZXJuIGZvciB0aGlzPz8/XG5cdHBvc3RmaXhPcGVyYXRvcnM6IHsgZ2V0OiBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMuX19wb3N0Zml4T3BlcmF0b3JzKSB7XG5cdFx0XHR2YXIgb3BlcmF0b3JzID0gdGhpcy5ydWxlc1tcInBvc3RmaXgtb3BlcmF0b3JcIl1cblx0XHRcdFx0XHRcdCAmJiB0aGlzLnJ1bGVzW1wicG9zdGZpeC1vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZyk7XG5cdFx0XHRpZiAob3BlcmF0b3JzKSB7XG5cdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcIl9fcG9zdGZpeE9wZXJhdG9yc1wiLCB7XG5cdFx0XHRcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdFx0XHRcdHZhbHVlOiBvcGVyYXRvcnNcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLl9fcG9zdGZpeE9wZXJhdG9ycztcblx0fX0sXG5cbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGVTeW50YXguanMiLCIvL1xuLy9cdCMgQ29yZSBgcnVsZXNgIC0tIHNpbXBsZSBkYXRhdHlwZXMsIGV0Yy5cbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vXG4vLyBSZWdleCBwYXR0ZXJuIHJ1bGVzIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9ycyBmb3IgZGVidWdnaW5nXG4vL1xuLy9wYXJzZXIuYWRkUGF0dGVybihcIndoaXRlc3BhY2VcIiwgL15cXHMrLyk7XG5SdWxlLldoaXRlc3BhY2UgPSBjbGFzcyB3aGl0ZXNwYWNlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9XG5wYXJzZXIuYWRkUnVsZShcIndoaXRlc3BhY2VcIiwgbmV3IFJ1bGUuV2hpdGVzcGFjZSh7IHBhdHRlcm46IC9eXFxzKy8sIG9wdGlvbmFsOiB0cnVlIH0pKTtcblxuLy8gYGlkZW50aWZpZXJgID0gdmFyaWFibGVzIG9yIHByb3BlcnR5IG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJpZGVudGlmaWVyXCIsIC9eW2Etel1bXFx3XFxkXFwtX10qLyk7XG5SdWxlLklkZW50aWZpZXIgPSBjbGFzcyBpZGVudGlmaWVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IGlkZW50aWZpZXIgPSBwYXJzZXIuYWRkUnVsZShcImlkZW50aWZpZXJcIiwgbmV3IFJ1bGUuSWRlbnRpZmllcih7XG5cdHBhdHRlcm46IC9eW2Etel1bXFx3XFwtXSovLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgaWRlbnRpZmllcik7XG5cbi8vIFN0aWNrIGBpZGVudGlmaWVyYCBvbiBgcGFyc2VyYCBzbyB3ZSBjYW4gYWRkIHRvIGl0cyBibGFja2xpc3QgZWFzaWx5LlxucGFyc2VyLmlkZW50aWZpZXIgPSBpZGVudGlmaWVyO1xuXG4vLyBBZGQgRW5nbGlzaCBwcmVwb3NpdGlvbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vL1xuLy8gV2lraXBlZGlhIFwiUHJlcG9zaXRpb25cIjpcbi8vXHRcIlByZXBvc2l0aW9ucy4uLmFyZSBhIGNsYXNzIG9mIHdvcmRzIHRoYXRcbi8vXHRleHByZXNzIHNwYXRpYWwgb3IgdGVtcG9yYWwgcmVsYXRpb25zICAoaW4sIHVuZGVyLCB0b3dhcmRzLCBiZWZvcmUpXG4vL1x0b3IgbWFyayB2YXJpb3VzIHNlbWFudGljIHJvbGVzIChvZiwgZm9yKS5cbi8vIFRFU1RNRVxucGFyc2VyLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYWJvdXRcIiwgXCJhYm92ZVwiLCBcImFmdGVyXCIsIFwiYW5kXCIsIFwiYXNcIiwgXCJhdFwiLFxuXHRcImJlZm9yZVwiLCBcImJlaGluZFwiLCBcImJlbG93XCIsIFwiYmVuZWF0aFwiLCBcImJlc2lkZVwiLCBcImJldHdlZW5cIiwgXCJiZXlvbmRcIiwgXCJieVwiLFxuXHRcImRlZmluZWRcIiwgXCJkb3duXCIsIFwiZHVyaW5nXCIsXG5cdFwiZW1wdHlcIiwgXCJleGFjdGx5XCIsIFwiZXhjZXB0XCIsXG5cdFwiZm9yXCIsIFwiZnJvbVwiLFxuXHRcImdyZWF0ZXJcIixcblx0XCJpblwiLCBcImludG9cIixcblx0XCJsZXNzXCIsIFwibG9uZ1wiLFxuXHRcIm1pbnVzXCIsIFwibW9yZVwiLFxuXHRcIm5lYXJcIiwgXCJub3RcIixcblx0XCJvZlwiLCBcIm9mZlwiLCBcIm9uXCIsIFwib250b1wiLCBcIm9wcG9zaXRlXCIsIFwib3V0XCIsIFwib3V0c2lkZVwiLCBcIm92ZXJcIixcblx0XCJzaG9ydFwiLCBcInNpbmNlXCIsXG5cdFwidGhhblwiLCBcInRoZW5cIiwgXCJ0aHJvdWdoXCIsIFwidGhydVwiLCBcInRvXCIsIFwidG93YXJkXCIsIFwidG93YXJkc1wiLFxuXHRcInVuZGVmaW5lZFwiLCBcInVuZGVyXCIsIFwidW5kZXJuZWF0aFwiLCBcInVuaXF1ZVwiLCBcInVudGlsXCIsIFwidXBcIiwgXCJ1cG9uXCIsIFwidXBzaWRlXCIsXG5cdFwidmVyc3VzXCIsIFwidnNcIixcblx0XCJ3aXRoXCIsIFwid2l0aGluXCIsIFwid2l0aG91dFwiLFxuKTtcblxuLy8gQWRkIGNvbW1vbiBlbmdsaXNoIHZlcmJzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYXJlXCIsXG5cdFwiZG9cIiwgXCJkb2VzXCIsXG5cdFwiY29udGFpbnNcIixcblx0XCJoYXNcIiwgXCJoYXZlXCIsXG5cdFwiaXNcIixcbik7XG5cbi8vIGBUeXBlYCA9IHR5cGUgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhbiB1cHBlci1jYXNlIGxldHRlciAoPylcbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJ0eXBlbmFtZVwiLCAvXltBLVpdW1xcd1xcZFxcLV9dKi8pO1xuUnVsZS5UeXBlID0gY2xhc3MgVHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoXCJUeXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvXltBLVpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHR5cGUpO1xuXG5cbi8vIGBudW1iZXJgIGFzIGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG5SdWxlLk51bWJlciA9IGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBudW1iZXIgPSBwYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgUnVsZS5OdW1iZXIoe1xuXHRwYXR0ZXJuOiAvXi0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VGbG9hdCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG51bWJlcik7XG5cblxuLy8gTnVtZXJpYyBgaW50ZWdlcmAgb25seSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gTk9URTogdGhpcyBXSUxMIG1hdGNoIGEgZmxvYXQsIGJ1dCB0aGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBjb2VyY2UgdG8gYW4gaW50ZWdlci5cbi8vIFJFVklFVzogaXMgdGhpcyByaWdodD8gIEJldHRlciB0byBub3QgbWF0Y2ggYSBmbG9hdD9cblJ1bGUuSW50ZWdlciA9IGNsYXNzIGludGVnZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImludGVnZXJcIiwgbmV3IFJ1bGUuSW50ZWdlcih7XG5cdHBhdHRlcm46IC9eLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0ZXh0ID0gcGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyBSdWxlLlRleHQoe1xuXHRwYXR0ZXJuOiAvXig/OlwiW15cIl0qXCJ8J1teJ10qJykvXG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdGV4dCk7XG5cblxuLy8gQm9vbGVhbiBsaXRlcmFsLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBUT0RPOiBiZXR0ZXIgbmFtZSBmb3IgdGhpcz8/P1xuUnVsZS5Cb29sZWFuID0gY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBib29sID0gcGFyc2VyLmFkZFJ1bGUoXCJib29sZWFuXCIsIG5ldyBSdWxlLkJvb2xlYW4oe1xuXHRwYXR0ZXJuOiAvXih0cnVlfGZhbHNlfHllc3xub3xva3xjYW5jZWwpXFxiLyxcblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0Y2FzZSBcInRydWVcIjpcblx0XHRcdGNhc2UgXCJ5ZXNcIjpcblx0XHRcdGNhc2UgXCJva1wiOlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBib29sKTtcbi8vIEFkZCB0b2tlbnMgaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbnBhcnNlci5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcInRydWVcIiwgXCJmYWxzZVwiLFxuXHRcInllc1wiLCBcIm5vXCIsXG5cdFwib2tcIiwgXCJjYW5jZWxcIlxuKTtcblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxubGV0IGxpc3QgPSBwYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsLWxpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdHtcblx0XHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzWzFdO1xuXHRcdH0sXG5cdFx0Ly8gcmV0dXJuIGp1c3QgdGhlIGxpc3QgYXMgb3VyIHNvdXJjZVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcbiBcdFx0XHRyZXR1cm4gdGhpcy5nYXRoZXJBcmd1bWVudHMoKS50b1NvdXJjZSgpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gTGl0ZXJhbCB2YWx1ZSBhcyBudW1iZXIsIHRleHQgb3IgYm9vbGVhbi5cbi8vVE9ETzogdGhpcyBpcyBhbiBleHByZXNzaW9uLi4uIGJ1dCBpbnN0YWxsaW5nIGl0IHRoYXQgd2F5IGJyZWFrcyBwYXJzaW5nLi4uP1xuLy9URVNUTUU6IGFkZCBsaXRlcmFsLWxpc3QgdG8gdGhpcz9cbnBhcnNlci5hZGRTeW50YXgoXCJsaXRlcmFsXCIsIFwiKGxpdGVyYWw6e251bWJlcn18e3RleHR9fHtib29sZWFufXx7bGl0ZXJhbC1saXN0fSlcIik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY29yZS5qcyIsIlxuLy8gVE9ETzogY29udmVydCB0byBsaW5lLWF3YXJlIHN0cmVhbT8/P1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFN0cmVhbSB7XG5cdC8vIFlvdSBjYW4gY29uc3RydWN0IHdpdGggYSB0ZXh0IHN0cmluZyBvciBhIHNldCBvZiBwcm9wZXJ0aWVzIChpbmNsdWRpbmcgYHRleHRgKS5cblx0Y29uc3RydWN0b3IodGV4dE9yUHJvcHMpIHtcblx0XHRpZiAodHlwZW9mIHRleHRPclByb3BzID09PSBcInN0cmluZ1wiKVxuXHRcdFx0dGhpcy50ZXh0ID0gdGV4dE9yUHJvcHM7XG5cdFx0ZWxzZVxuXHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCB0ZXh0T3JQcm9wcyk7XG5cblx0XHQvLyBNYWtlIHN1cmUgYHRleHRgIGlzIGRlZmluZWQuXG5cdFx0aWYgKCEoXCJ0ZXh0XCIgaW4gdGhpcykpIHRoaXMudGV4dCA9IFwiXCI7XG5cdFx0aWYgKCEoXCJzdGFydEluZGV4XCIgaW4gdGhpcykpIHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdH1cblxuXHQvLyBSZXR1cm4gYW4gaW1tdXRhYmxlIGNsb25lIG9mIHRoZSBzdHJlYW0uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0bGV0IGNsb25lID0gbmV3IFRleHRTdHJlYW0odGhpcyk7XG5cdFx0T2JqZWN0LmFzc2lnbihjbG9uZSwgcHJvcHMpO1xuXHRcdHJldHVybiBjbG9uZTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2VkIHRvIG5ldyBzdGFydEluZGV4LlxuXHRhZHZhbmNlVG8oc3RhcnRJbmRleCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleCB9KTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2luZyBzdGFydEluZGV4IEJZIGBsZW5ndGhgXG5cdGFkdmFuY2VCeShsZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcblx0fVxuXG4vLyBcdC8vIFJldHVybiBjbG9uZSBvZiB0aGlzIHN0cmVhbSB3aXRoIGVuZEluZGV4IHNldCB0byBzdGFydCArIGBsZW5ndGhgXG4vLyBcdGVuZEFmdGVyKGxlbmd0aCkge1xuLy8gXHRcdHJldHVybiB0aGlzLmNsb25lKHsgZW5kSW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcbi8vIFx0fVxuXG4vL1xuLy8gIyMgTWF0Y2hpbmdcbi8vXG5cdC8vIE1hdGNoIGBwYXR0ZXJuYCBhcyByZWdleCBhdCBoZWFkIG9mIHN0cmVhbS5cblx0Ly8gTk9URTogcmVnZXhlcyBzaG91bGQgc3RhcnQgd2l0aCBgXmAhXG5cdC8vIFJldHVybnMgbWF0Y2ggb3IgdW5kZWZpbmVkLlxuXHRtYXRjaChwYXR0ZXJuKSB7XG5cdFx0aWYgKCEocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHRocm93IG5ldyBUeXBlRXJyb3IoYFRleHRTdHJlYW0ubWF0Y2goJHtwYXR0ZXJufSk6IGV4cGVjdGVkIFJlZ0V4cGApO1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5tYXRjaChwYXR0ZXJuKTtcblx0fVxuXG5cdHN0YXJ0c1dpdGgoc3RyaW5nKSB7XG4vL1RPRE86IHVzZSBgc3RyZWFtLnJhbmdlYCB0byBlbnN1cmUgbWF0Y2ggaXMgbm90IG5vdCBiZXlvbmQgYHN0cmluZy5lbmRJbmRleGBcblx0XHRyZXR1cm4gdGhpcy5oZWFkLnN0YXJ0c1dpdGgoc3RyaW5nKTtcblx0fVxuXG5cbi8vXG4vLyAjIyBSZWZsZWN0aW9uXG4vL1xuXHQvLyBSZXR1cm4gdGV4dCBvZiBzdHJpbmcgc3RhcnRpbmcgYXQgb3VyIGBzdGFydEluZGV4YFxuXHRnZXQgaGVhZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5yYW5nZSgpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgcmFuZ2Ugb2YgdGhlIHN0cmluZyBmcm9tIGBzdGFydEluZGV4YCB0byBgZW5kSW5kZXhgIE5PTi1pbmNsdXNpdmUuXG5cdHJhbmdlKHN0YXJ0SW5kZXggPSB0aGlzLnN0YXJ0SW5kZXgsIGVuZEluZGV4ID0gdGhpcy50ZXh0Lmxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQuc3Vic3RyaW5nKHN0YXJ0SW5kZXgsIGVuZEluZGV4KTtcblx0fVxuXG5cdC8vIExlbmd0aCBvZiB0aGUgc3RyZWFtLlxuXHRnZXQgbGVuZ3RoKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQubGVuZ3RoO1xuXHR9XG5cblx0Ly8gQXJlIHdlIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmVhbT9cblx0Z2V0IGlzRW1wdHkoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3RhcnRJbmRleCA9PT0gdGhpcy5sZW5ndGg7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0XG5cdH07XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvVGV4dFN0cmVhbS5qcyIsImltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBsb2FkIHN0YW5kYXJkIHJ1bGVzIGZpbGVzIGhlcmVcbmltcG9ydCBcIi4vY29yZVwiO1xuaW1wb3J0IFwiLi9udW1iZXJzXCI7XG5pbXBvcnQgXCIuL29wZXJhdG9yc1wiO1xuaW1wb3J0IFwiLi9hc3NpZ25tZW50XCI7XG5pbXBvcnQgXCIuL2NsYXNzXCI7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaW5kZXguanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFRPRE86IHtwcm9wZXJ0eS1leHByZXNzaW9ufSBhbHNvIHdvcmtzLi4uIHthc3NpZ25hYmxlLWV4cHJlc3Npb259ID8/P1xucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJ7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cIiwge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0bGV0IHZhbHVlID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0Ly8gVE9ETzogZGVjbGFyZSBpZGVudGlmaWVyIGlmIG5vdCBpbiBzY29wZSwgZXRjXG5cdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9ID0gJHt2YWx1ZX1gO1xuXHR9XG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9hc3NpZ25tZW50LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vL3BhcnNlci5hZGRFeHByZXNzaW9uKFwicHJvcGVydHktZXhwcmVzc2lvblwiLCBcIntwcm9wZXJ0eTpwcm9wZXJ0eS1uYW1lfSsge2V4cHJlc3Npb259XCIsIHtcbnBhcnNlci5hZGRFeHByZXNzaW9uKFwicHJvcGVydHktZXhwcmVzc2lvblwiLCBcIihwcm9wZXJ0aWVzOnRoZSB7aWRlbnRpZmllcn0gb2YpKyB7ZXhwcmVzc2lvbn1cIiwge1xuIFx0Z2F0aGVyQXJndW1lbnRzKCkge1xuXHRcdGxldCBhcmdzID0gUnVsZS5FeHByZXNzaW9uLmdhdGhlckFyZ3VtZW50cyh0aGlzKTtcblx0XHQvLyB0cmFuc2Zvcm0gcHJvcGVydGllcyBhbmQgcmV2ZXJzZSBvcmRlclxuXHRcdGFyZ3MucHJvcGVydGllcyA9IGFyZ3MucHJvcGVydGllcy5tYXAoIHNlcXVlbmNlID0+IHNlcXVlbmNlLmlkZW50aWZpZXIgKS5yZXZlcnNlKCk7XG5cdFx0cmV0dXJuIGFyZ3M7XG4gXHR9LFxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0bGV0IHRoaW5nID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0bGV0IHByb3BlcnRpZXMgPSBhcmdzLnByb3BlcnRpZXMubWFwKCBpZGVudGlmaWVyID0+IGlkZW50aWZpZXIudG9Tb3VyY2UoKSApLmpvaW4oXCIuXCIpO1xuXHRcdHJldHVybiBgc3BlbGwuZ2V0KCR7dGhpbmd9LCAnJHtwcm9wZXJ0aWVzfScpYDtcblx0fVxufSk7XG5cblxuXG5wYXJzZXIuYWRkU3ludGF4KFwic2NvcGUtbW9kaWZpZXJcIiwgXCIoc2NvcGU6Z2xvYmFsfGNvbnN0YW50fHNoYXJlZClcIik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZS1wcm9wZXJ0eVwiLFxuXHRcIntzY29wZS1tb2RpZmllcn0/IHthc3NpZ25tZW50fVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGlkZW50aWZpZXIgPSBhcmdzLmFzc2lnbm1lbnQuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IHZhbHVlID0gYXJncy5hc3NpZ25tZW50LmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRcdGxldCBhc3NpZ25tZW50ID0gYCR7aWRlbnRpZmllcn0gPSAke3ZhbHVlfWA7XG5cblx0XHRcdHZhciBzY29wZSA9IGFyZ3Muc2NvcGUgPyBhcmdzLnNjb3BlLnRvU291cmNlKCkgOiBcImxvY2FsXCI7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJnbG9iYWxcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGdsb2JhbC4ke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwiY29uc3RhbnRcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGNvbnN0ICR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJzaGFyZWRcIjpcblx0XHRcdFx0XHRyZXR1cm4gYHN0YXRpYyAke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBhc3NpZ25tZW50O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuLy8gVE9ETzogd2FybiBvbiBpbnZhbGlkIHNldD8gIHNoYXJlZD8gIHVuZGVmaW5lZD8gc29tZXRoaW5nIG90aGVyIHRoYW4gdGhlIGZpcnN0IHZhbHVlIGFzIGRlZmF1bHQ/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmUtcHJvcGVydHktYXMtb25lLW9mXCIsXG5cdFwie2lkZW50aWZpZXJ9IGFzIG9uZSBvZiB7bGlzdDpsaXRlcmFsLWxpc3R9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IHBsdXJhbCA9IChpZGVudGlmaWVyICsgXCJfVkFMVUVTXCIpLnRvVXBwZXJDYXNlKCk7XG5cdFx0XHRsZXQgbGlzdCA9IGFyZ3MubGlzdC5saXN0O1xuXHRcdFx0bGV0IHZhbHVlcyA9IGxpc3QudG9Tb3VyY2UoKTtcblx0XHRcdGxldCBmaXJzdCA9IGxpc3QucmVzdWx0c1swXTtcblx0XHRcdGxldCBmaXJzdFZhbHVlID0gZmlyc3QgPyBmaXJzdC50b1NvdXJjZSgpIDogXCJ1bmRlZmluZWRcIjtcblxuXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9O1xcbmBcblx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9IHsgcmV0dXJuIChcIl9fJHtpZGVudGlmaWVyfVwiIGluIHRoaXMgPyB0aGlzLl9fJHtpZGVudGlmaWVyfSA6ICR7Zmlyc3RWYWx1ZX0pIH1cXG5gXG5cdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy5jb25zdHJ1Y3Rvci4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1cXG5gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NsYXNzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWFsaW5nIHdpdGggbnVtYmVyc1xuLy9cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vLyBOdW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nLlxucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJpbmRleC1leHByZXNzaW9uXCIsIFwiaXRlbSB7bnVtYmVyOmludGVnZXJ9IG9mIHtleHByZXNzaW9ufVwiLCB7XG5cdHRvU291cmNlKCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgbnVtYmVyID0gYXJncy5udW1iZXIudG9Tb3VyY2UoKTtcblx0XHRsZXQgZXhwcmVzc2lvbiA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke251bWJlcn0pYDtcblx0fVxufSk7XG5cbi8vIEVuZ2xpc2ggd29yZHMgdXNlZCBmb3IgcG9zaXRpb24gb2Ygc29tZXRoaW5nIGluIGEgbGlzdC5cbi8vIFRPRE86IGBzZXZlbnR5LXNldmVudGhgLCBgdGhpcmQtdG8tbGFzdGAuLi5cbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiKGZpcnN0fHNlY29uZHx0aGlyZHxmb3VydGh8ZmlmdGh8c2l4dGh8c2V2ZW50aHxlaWdodGh8bmludGh8dGVudGh8cGVudWx0aW1hdGV8bGFzdHxmaW5hbClcIiwge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IG9yZGluYWwgPSB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoKTtcblx0XHRzd2l0Y2ggKG9yZGluYWwpIHtcblx0XHRcdGNhc2UgXCJmaXJzdFwiOlx0XHRyZXR1cm4gMTtcblx0XHRcdGNhc2UgXCJzZWNvbmRcIjpcdFx0cmV0dXJuIDI7XG5cdFx0XHRjYXNlIFwidGhpcmRcIjpcdFx0cmV0dXJuIDM7XG5cdFx0XHRjYXNlIFwiZm91cnRoXCI6XHRcdHJldHVybiA0O1xuXHRcdFx0Y2FzZSBcImZpZnRoXCI6XHRcdHJldHVybiA1O1xuXHRcdFx0Y2FzZSBcInNpeHRoXCI6XHRcdHJldHVybiA2O1xuXHRcdFx0Y2FzZSBcInNldmVudGhcIjpcdFx0cmV0dXJuIDc7XG5cdFx0XHRjYXNlIFwiZWlnaHRoXCI6XHRcdHJldHVybiA4O1xuXHRcdFx0Y2FzZSBcIm5pbnRoXCI6XHRcdHJldHVybiA5O1xuXHRcdFx0Y2FzZSBcInRlbnRoXCI6XHRcdHJldHVybiAxMDtcblx0XHRcdGNhc2UgXCJwZW51bHRpbWF0ZVwiOlx0cmV0dXJuIC0yO1xuXHRcdFx0Y2FzZSBcImxhc3RcIjpcdFx0cmV0dXJuIC0xO1xuXHRcdFx0Y2FzZSBcImZpbmFsXCI6XHRcdHJldHVybiAtMTtcblx0XHR9XG5cdH1cbn0pO1xuXG4vLyBBbHRlcm5hdGl2ZSBmb3JtIGZvciBudW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nLlxucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJpbmRleC1leHByZXNzaW9uXCIsIFwidGhlIHtvcmRpbmFsfSBpdGVtIG9mIHtleHByZXNzaW9ufVwiLCB7XG5cdHRvU291cmNlKCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgb3JkaW5hbCA9IGFyZ3Mub3JkaW5hbC50b1NvdXJjZSgpO1xuXHRcdGxldCBleHByZXNzaW9uID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7b3JkaW5hbH0pYDtcblx0fVxufSk7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBpbmZpeCBhbmQgcHJlZml4IG9wZXJhdG9ycy5cbi8vXG5cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIyMgSW5maXggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+IHtyaHN9YCwgZWc6IGBhIGlzIDFgXG4vLyBOT1RFOiBgb3BlcmF0b3IudHJhbnNmb3JtZXJgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyB0d28gYXJndW1lbnRzIChgbGhzYCBhbmQgYHJoc2ApIGludG8gb3V0cHV0LlxuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImFuZFwiLCBcImFuZFwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ICYmICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcIm9yXCIsIFwib3JcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSB8fCAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzXCIsIFwiaXNcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSA9PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1ub3RcIiwgXCJpcyBub3RcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSAhPSAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLWV4YWN0bHlcIiwgXCJpcyBleGFjdGx5XCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybiBgKCR7YX0gPT09ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdC1leGFjdGx5XCIsIFwiaXMgbm90IGV4YWN0bHlcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSAhPT0gJHtifSlgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNPZlR5cGUodGhpbmcsIHR5cGUpYFxuLy9UT0RPOiBgaXMgc2FtZSB0eXBlIGFzYCA/XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLXR5cGUtb2ZcIiwgW1wiaXMgYVwiLCBcImlzIGFuXCJdLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXMtbm90LXR5cGUtb2ZcIiwgW1wiaXMgbm90IGFcIiwgXCJpcyBub3QgYW5cIl0sIHsgdHJhbnNmb3JtZXIodGhpbmcsIHR5cGUpIHsgcmV0dXJuIGAhc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuY29udGFpbnMoY29sbGVjdGlvbiwgdGhpbmcpYFxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1pblwiLCBbXCJpcyBpblwiLCBcImlzIG9uZSBvZlwiXSwgeyB0cmFuc2Zvcm1lcih0aGluZywgbGlzdCkgeyByZXR1cm4gYHNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1ub3QtaW5cIiwgW1wiaXMgbm90IGluXCIsIFwiaXMgbm90IG9uZSBvZlwiXSwgeyB0cmFuc2Zvcm1lcih0aGluZywgbGlzdCkgeyByZXR1cm4gYCFzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcbi8vVEVTVE1FXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImluY2x1ZGVzXCIsIFtcImluY2x1ZGVzXCIsIFwiY29udGFpbnNcIl0sIHsgdHJhbnNmb3JtZXIobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5jb250YWlucygke2xpc3R9LCAke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZG9lc250LWluY2x1ZGVcIiwgW1wiZG9lcyBub3QgaW5jbHVkZVwiLCBcImRvZXNudCBpbmNsdWRlXCIsIFwiZG9lcyBub3QgY29udGFpblwiLCBcImRvZXNudCBjb250YWluXCJdLCB7IHRyYW5zZm9ybWVyKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmNvbnRhaW5zKCR7bGlzdH0sICR7dGhpbmd9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0XCIsIFtcIj5cIiwgXCJpcyBncmVhdGVyIHRoYW5cIl0sIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA+ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0ZVwiLCBbXCI+PVwiLCBcImlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0b1wiXSwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0XCIsIFtcIjxcIiwgXCJpcyBsZXNzIHRoYW5cIl0sIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0ZVwiLCBbXCI8PVwiLCBcImlzIGxlc3MgdGhhbiBvciBlcXVhbCB0b1wiXSwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9fSk7XG5cbi8vVE9ETzogIGNhbid0IGFkZCBgK2AgYXMgYSBydWxlLCBmaXggdGhpcyB0aGVuIGFkZCB0aGVzZVxuLy9UT0RPOiAgb3BlcmF0b3IgcHJlY2VkZW5jZT8/P1xuLy9URVNUTUVcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwicGx1c1wiLCBbXCJcXFxcK1wiLCBcInBsdXNcIl0sIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJtaW51c1wiLCBbXCItXCIsIFwibWludXNcIl0sIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJ0aW1lc1wiLCBbXCJcXFxcKlwiLCBcInRpbWVzXCJdLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZGl2aWRlZC1ieVwiLCBbXCIvXCIsIFwiZGl2aWRlZCBieVwiXSwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuYCR7YX0gLyAke2J9YCB9fSk7XG5cbi8vVE9ETzogIGArPWAgZXRjPyAgb3RoZXIgbWF0aCBmdW5jdGlvbnM/XG5cbnBhcnNlci5hZGRTeW50YXgoXG5cdFwiaW5maXgtb3BlcmF0b3ItZXhwcmVzc2lvblwiLFxuXHRcIntsaHM6ZXhwcmVzc2lvbn0ge29wZXJhdG9yOmluZml4LW9wZXJhdG9yfSB7cmhzOmV4cHJlc3Npb259XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgbGhzID0gYXJncy5saHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgcmhzID0gYXJncy5yaHMudG9Tb3VyY2UoY29udGV4dCk7XG5cblx0XHRcdGxldCB0cmFuc2Zvcm1lciA9IGFyZ3Mub3BlcmF0b3IubWF0Y2hlZC50cmFuc2Zvcm1lcjtcblx0XHRcdHJldHVybiB0cmFuc2Zvcm1lcihsaHMsIHJocyk7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyMjIFBvc3RpZnggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+YCwgZS5nLiBgYSBpcyBkZWZpbmVkYFxuLy8gTk9URTogYG9wZXJhdG9yLnRyYW5zZm9ybWVyYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgYXJndW1lbnQgKGBsaHNgKSBpbnRvIG91dHB1dC5cblxucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzLWRlZmluZWRcIiwgXCJpcyBkZWZpbmVkXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ICE9PSAndW5kZWZpbmVkJylgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpcy1ub3QtZGVmaW5lZFwiLCBbXCJpcyBub3QgZGVmaW5lZFwiLCBcImlzIHVuZGVmaW5lZFwiXSwgeyB0cmFuc2Zvcm1lcih0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gPT09ICd1bmRlZmluZWQnKWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5pc0VtcHR5KHRoaW5nKWBcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpcy1lbXB0eVwiLCBcImlzIGVtcHR5XCIsIHsgdHJhbnNmb3JtZXIodGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzLW5vdC1lbXB0eVwiLCBcImlzIG5vdCBlbXB0eVwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9fSk7XG5cbnBhcnNlci5hZGRTeW50YXgoXG5cdFwicG9zdGZpeC1vcGVyYXRvci1leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeC1vcGVyYXRvcn1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBsaHMgPSBhcmdzLmxocy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCB0cmFuc2Zvcm1lciA9IGFyZ3Mub3BlcmF0b3IubWF0Y2hlZC50cmFuc2Zvcm1lcjtcblx0XHRcdHJldHVybiB0cmFuc2Zvcm1lcihsaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG5wYXJzZXIuYWRkU3ludGF4KFwib3BlcmF0b3ItZXhwcmVzc2lvblwiLCBcIihleHByZXNzaW9uOntwb3N0Zml4LW9wZXJhdG9yLWV4cHJlc3Npb259fHtpbmZpeC1vcGVyYXRvci1leHByZXNzaW9ufSlcIik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIl0sInNvdXJjZVJvb3QiOiIifQ==