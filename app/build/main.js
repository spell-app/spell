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

// Add English prepositions as to identifier blacklist.
// TESTME
_parser2.default.identifier.addToBlacklist("about", "above", "after", "as", "at", "before", "behind", "below", "beneath", "beside", "between", "beyond", "by", "down", "during", "except", "for", "from", "in", "into", "less", "long", "minus", "more", "near", "of", "off", "on", "onto", "opposite", "out", "outside", "over", "short", "since", "than", "then", "through", "thru", "to", "toward", "towards", "under", "underneath", "until", "up", "upon", "upside", "versus", "vs", "with", "within", "without");

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
	pattern: /^(true|false|yes|no|success|failure|ok|cancel)\b/,
	toSource: function toSource(context) {
		switch (this.matched) {
			case "true":
			case "yes":
			case "success":
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
_parser2.default.identifier.addToBlacklist("true", "false", "yes", "no", "success", "failure", "ok", "cancel");

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

//TODO: `spell.isIn(thing, collection)`
_parser2.default.addInfixOperator("is-in", ["is in", "is one of"], {
	transformer: function transformer(thing, listLikeThing) {
		return "spell.isIn(" + thing + ", " + listLikeThing + ")";
	}
});
_parser2.default.addInfixOperator("is-not-in", ["is not in", "is not one of"], {
	transformer: function transformer(thing, listLikeThing) {
		return "!spell.isIn(" + thing + ", " + listLikeThing + ")";
	}
});
_parser2.default.addInfixOperator("includes", ["includes", "contains"], {
	transformer: function transformer(listLikeThing, thing) {
		return "spell.isIn(" + thing + ", " + listLikeThing + ")";
	}
});
_parser2.default.addInfixOperator("doesnt-include", ["does not include", "doesnt include", "does not contain", "doesnt contain"], {
	transformer: function transformer(listLikeThing, thing) {
		return "!spell.isIn(" + thing + ", " + listLikeThing + ")";
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
_parser2.default.addInfixOperator("plus", ["\\+", "plus"], {
	transformer: function transformer(a, b) {
		return "(" + a + " + " + b + ")";
	}
});
_parser2.default.addInfixOperator("minus", ["-", "minus"], {
	transformer: function transformer(a, b) {
		return "(" + a + " - " + b + ")";
	}
});
_parser2.default.addInfixOperator("times", ["\\*", "times"], {
	transformer: function transformer(a, b) {
		return "(" + a + " * " + b + ")";
	}
});
_parser2.default.addInfixOperator("divided-by", ["/", "divided by"], {
	transformer: function transformer(a, b) {
		return "(" + a + " / " + b + ")";
	}
});

//TODO:  `+=` etc?  other math functions?

// Add infix operators to identifier blacklist
// HMM... folks might complain about not being able to use "a" as a single variable name...
// TODO: make this part of `addInfixOperator` ???
// TESTME
_parser2.default.identifier.addToBlacklist("and", "or", "is", "not", "exactly", "a", "an", "one", "greater", "less", "equal", "plus", "minus", "times", "divided");

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
_parser2.default.addPostfixOperator("is-not-defined", "is not defined", {
	transformer: function transformer(thing) {
		return "(typeof " + thing + " === 'undefined')";
	}
});
_parser2.default.addPostfixOperator("is-undefined", "is undefined", {
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

// Add postfix operators to identifier blacklist
// TESTME
_parser2.default.identifier.addToBlacklist("defined", "undefined", "empty");

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgYzYwNjk0OTMyMjQ1ZDNhYmZhZGUiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZVN5bnRheC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbInBhcnNlciIsIndpbmRvdyIsImNvbnNvbGUiLCJncm91cCIsImxvZyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInJ1bGVzIiwiY3JlYXRlIiwibmFtZSIsInN0cmVhbSIsInJ1bGUiLCJnZXRSdWxlIiwiU3ludGF4RXJyb3IiLCJlYXRXaGl0ZXNwYWNlIiwicGFyc2UiLCJyZXN1bHQiLCJ3aGl0ZXNwYWNlIiwibmV4dCIsImV4aXN0aW5nIiwiQWx0ZXJuYXRpdmVzIiwiZGVidWciLCJydWxlTmFtZSIsImFkZFJ1bGUiLCJwYXR0ZXJuIiwiUGF0dGVybiIsInRva2VucyIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsInN0YXJ0SW5kZXgiLCJuZXN0aW5nIiwibmVzdGVkIiwiZW5kSW5kZXgiLCJsYXN0SW5kZXgiLCJsZW5ndGgiLCJ0b2tlbiIsInNsaWNlIiwiREVCVUciLCJSdWxlIiwicHJvcHMiLCJjbG9uZSIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsImNvbnN0cnVjdG9yIiwiZ2F0aGVyQXJndW1lbnRzIiwibWF0Y2hlZCIsImFyZ3VtZW50IiwiU3RyaW5nIiwic3RhcnRzV2l0aCIsInN0cmluZyIsIm9wdGlvbmFsIiwibWVyZ2VTdHJpbmdzIiwiZmlyc3QiLCJzZWNvbmQiLCJtYXRjaCIsImJsYWNrbGlzdCIsIndvcmRzIiwiZm9yRWFjaCIsIndvcmQiLCJLZXl3b3JkIiwiUmVnRXhwIiwibWVyZ2VLZXl3b3JkcyIsInNwbGl0Iiwiam9pbiIsIlN1YnJ1bGUiLCJOZXN0ZWQiLCJTZXF1ZW5jZSIsInJlc3VsdHMiLCJwdXNoIiwic2VxdWVuY2UiLCJhcmdzIiwiYXJnTmFtZSIsIl9hcmciLCJBcnJheSIsImlzQXJyYXkiLCJFeHByZXNzaW9uIiwiU3RhdGVtZW50IiwiYmVzdE1hdGNoIiwiY29udGV4dCIsInRvU291cmNlIiwiUmVwZWF0IiwiaW5jbHVkZXMiLCJyZXBlYXQiLCJtYXAiLCJMaXN0IiwiaXRlbSIsImRlbGltaXRlciIsImluZGV4IiwicGFyc2VSdWxlU3ludGF4Iiwic3ludGF4IiwiU2VxdWVuY2VDb25zdHJ1Y3RvciIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInBhcnNlUnVsZVN5bnRheF90b2tlbnMiLCJTWU5UQVhfRVhQUkVTU0lPTiIsInBhcnNlUnVsZVN5bnRheF90b2tlbiIsImxhc3QiLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zdHJpbmciLCJwYXJzZVJ1bGVTeW50YXhfc3VicnVsZSIsInBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyIsInBhcnNlUnVsZVN5bnRheF9saXN0IiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsInN1YnN0ciIsInRvU3RyaW5nIiwiZmluZE5lc3RlZFRva2VucyIsImFsdGVybmF0ZXMiLCJncm91cEFsdGVybmF0ZXMiLCJjdXJyZW50IiwiaSIsImNvbmNhdCIsInN5bWJvbCIsImRlZmluZVByb3BlcnRpZXMiLCJwcm90b3R5cGUiLCJhZGRTeW50YXgiLCJ2YWx1ZSIsInJ1bGVTeW50YXgiLCJlIiwiZXJyb3IiLCJhZGRTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiYWRkSW5maXhPcGVyYXRvciIsInRyYW5zZm9ybWVyIiwiX19pbmZpeE9wZXJhdG9ycyIsImluZml4T3BlcmF0b3JzIiwiZ2V0Iiwib3BlcmF0b3JzIiwiZGVmaW5lUHJvcGVydHkiLCJjb25maWd1cmFibGUiLCJhZGRQb3N0Zml4T3BlcmF0b3IiLCJfX3Bvc3RmaXhPcGVyYXRvcnMiLCJwb3N0Zml4T3BlcmF0b3JzIiwiV2hpdGVzcGFjZSIsIklkZW50aWZpZXIiLCJpZGVudGlmaWVyIiwicmVwbGFjZSIsImFkZFRvQmxhY2tsaXN0IiwiVHlwZSIsInR5cGUiLCJOdW1iZXIiLCJudW1iZXIiLCJwYXJzZUZsb2F0IiwiSW50ZWdlciIsInBhcnNlSW50IiwiVGV4dCIsInRleHQiLCJCb29sZWFuIiwiYm9vbCIsImxpc3QiLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJoZWFkIiwic3Vic3RyaW5nIiwicmFuZ2UiLCJleHByZXNzaW9uIiwicmV2ZXJzZSIsInRoaW5nIiwiYXNzaWdubWVudCIsInNjb3BlIiwicGx1cmFsIiwidG9VcHBlckNhc2UiLCJ2YWx1ZXMiLCJmaXJzdFZhbHVlIiwib3JkaW5hbCIsImEiLCJiIiwibGlzdExpa2VUaGluZyIsImxocyIsInJocyIsIm9wZXJhdG9yIl0sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsbURBQTJDLGNBQWM7O0FBRXpEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBSztBQUNMO0FBQ0E7O0FBRUE7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Ozs7Ozs7Ozs7Ozs7O0FDdkdBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7Ozs7QUFFQTtBQUNBLElBQUksT0FBT3JILE1BQVAsS0FBa0IsV0FBdEIsRUFBbUM7QUFDbENBLFFBQU93SixVQUFQO0FBQ0F4SixRQUFPSyxNQUFQO0FBQ0FMLFFBQU93QyxJQUFQO0FBQ0F4QyxRQUFPRCxNQUFQO0FBQ0E7O2tCQUVjO0FBQ2R5SixpQ0FEYyxFQUNGbkosd0JBREUsRUFDTW1DLG9CQUROLEVBQ1l6QztBQURaLEMiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBpZGVudGl0eSBmdW5jdGlvbiBmb3IgY2FsbGluZyBoYXJtb255IGltcG9ydHMgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAxMSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay9ib290c3RyYXAgYzYwNjk0OTMyMjQ1ZDNhYmZhZGUiLCIvL1xuLy9cdCMgQ3JlYXRlIGEgYHBhcnNlcmAgc2luZ2xldG9uIHRvIHVzZSB0byBzZXQgdXAgcnVsZXMgYW5kIGR1cmluZyB0ZXN0cy5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5cbi8vIENyZWF0ZSBwYXJzZXIgaW5zdGFuY2UuXG5jb25zdCBwYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG53aW5kb3cucGFyc2VyID0gcGFyc2VyO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvX3BhcnNlci5qcyIsIi8vIFNwZWxsIFwiRW5nbGlzaFwiIHBhcnNlciBzdHJhd21hblxuXG4vLyBUT0RPOlx0Y29uc29saWRhdGUgc3Vic2VxdWVudCBsaXRlcmFsIHdvcmRzIC8gc3RyaW5ncyBpbnRvIGEgc2luZ2xlIHJlZ2V4P1xuLy8gVE9ETzpcdGB0ZXN0YCBmdW5jdGlvbiBmb3IgcXVpY2sgbm8tZ29vZCBoaXQgb24gYHthfSBibGFoIGJsYWgge2J9YD9cbi8vIFRPRE86XHR0aGlzIGRvZXNuJ3Qgd29yazogICBge2V4cHJlc3Npb259IGlzIHtleHByZXNzaW9ufWBcbi8vIFRPRE86XHRjdXN0b20gU3ludGF4RXJyb3IgZXRjIHdoaWNoIHVuZGVyc3RhbmQgc3RyZWFtc1xuLy8gVE9ETzpcdGJyZWFrIGBmaWxlYCBpbnRvIGxpbmVzIGFuZCBwcm9jZXNzIGVhY2ggKGluY2wuIHN1YnN0ci9tYXRjaCBub3QgZ29pbmcgYmV5b25kIHRoZSBlbmQpXG4vLyBUT0RPOlx0bmVzdGluZyAtLSBpcyB0aGlzIGp1c3QgaW5kZW50ID0gXCJhZGQgYmxvY2sgc2NvcGVcIlxuLy8gVE9ETzpcdHByb21vdGlvbiBwYXR0ZXJuIGZvciBnYXRoZXIgYXJndW1lbnRzIChlZzogbGl0ZXJhbC1saXN0KSA/Pz9cbi8vIFRPRE86XHRXaGF0IGRvZXMgc3ludGF4IHRyZWUgbG9vayBsaWtlPyAgSG93IGRvIHdlIGV4dHJhY3QgbWVhbmluZyBvdXQgb2YgdGhlIG5lc3Q/XG4vLyBUT0RPOlx0UmVjeWNsZSB3b3JkL3N0cmluZy9wYXR0ZXJuIHJ1bGVzIHRvIG1vcmUgZWFzaWx5IHNlZSBjb21tb25hbGl0eS4uLlxuLy8gVE9ETzpcdFBhc3MgYGNvbnRleHRgIHRvIHRvU291cmNlKCksIGFkZCBwcm9wZXJ0eSBkZXNjcmlwdG9ycyB0byBgY2xhc3NgLCB2YXJpYWJsZXMgYW5kIGNvZGUgdG8gYG1ldGhvZGAsIGBnbG9iYWxgIHN0dWZmIGV0Y1xuXG5pbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIEdSUlIuLi4gd2lsbCBTT01FT05FIG9uIHRoZSBub2RlIHRlYW0gcGxlYXNlIGltcGxlbWVudCBjb25zb2xlLmdyb3VwID8/P1xuaWYgKCFjb25zb2xlLmdyb3VwKSBjb25zb2xlLmdyb3VwID0gY29uc29sZS5sb2c7XG5pZiAoIWNvbnNvbGUuZ3JvdXBFbmQpIGNvbnNvbGUuZ3JvdXBFbmQgPSBjb25zb2xlLmxvZztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblx0Ly8gU2V0IHRvIGB0cnVlYCB0byBvdXRwdXQgZGVidWcgaW5mbyB3aGlsZSBhZGRpbmcgcnVsZXNcblx0c3RhdGljIERFQlVHID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cblx0XHQvLyBDbG9uZSBydWxlcywgc3RhcnRpbmcgd2l0aCBhIGNvbXBsZXRlbHkgZW1wdHkgbWFwIGlmIG5vdCBkZWZpbmVkIChubyBzdGFuZGFyZCBvYmplY3Qga2V5cylcblx0XHR0aGlzLnJ1bGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnJ1bGVzIHx8IG51bGwpO1xuXHR9XG5cblx0Z2V0UnVsZShuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXNbbmFtZV07XG5cdH1cblxuLy8jIyMgUGFyc2luZ1xuXG5cdC8vIFBhcnNlIGBuYW1lYGQgcnVsZSBhdCBoZWFkIG9mIGBzdHJlYW1gLlxuXHQvLyBIYW5kbGVzIG9wdGlvbmFsIGFuZCByZXBlYXRpbmcgcnVsZXMgYXMgd2VsbCBhcyBlYXRpbmcgd2hpdGVzcGFjZS5cblx0Ly8gUmV0dXJucyByZXN1bHQgb2YgcGFyc2UuXG5cdHBhcnNlKG5hbWUsIHN0cmVhbSkge1xuXHRcdGlmICh0eXBlb2Ygc3RyZWFtID09PSBcInN0cmluZ1wiKSBzdHJlYW0gPSBuZXcgVGV4dFN0cmVhbShzdHJlYW0pO1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBSdWxlICR7bmFtZX0gbm90IHVuZGVyc3Rvb2RgLCBuYW1lLCBzdHJlYW0pO1xuXHRcdHN0cmVhbSA9IHRoaXMuZWF0V2hpdGVzcGFjZShzdHJlYW0pO1xuXHRcdHJldHVybiBydWxlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdH1cblxuXHQvLyBFYXQgd2hpdGVzcGFjZSAoYWNjb3JkaW5nIHRvIGBydWxlcy53aGl0ZXNwYWNlYCkgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG5ldyBzdHJlYW0gaWYgd2UgbWF0Y2hlZCB3aGl0ZXNwYWNlLCBvdGhlcndpc2UgdGhlIHNhbWUgc3RyZWFtLlxuXHQvLyBPdGhlcndpc2UgcmV0dXJucyB0aGlzIHNhbWUgc3RyZWFtLlxuXHRlYXRXaGl0ZXNwYWNlKHN0cmVhbSkge1xuXHRcdHZhciByZXN1bHQgPSB0aGlzLnJ1bGVzLndoaXRlc3BhY2UucGFyc2UodGhpcywgc3RyZWFtKTtcblx0XHRyZXR1cm4gcmVzdWx0ID8gcmVzdWx0Lm5leHQoKSA6IHN0cmVhbTtcblx0fVxuXG4vLyMjIyBSdWxlIGZhY3Rvcmllc1xuXG5cdC8vIEFkZCBhIHJ1bGUgdG8gb3VyIGxpc3Qgb2YgcnVsZXMhXG5cdC8vIFRPRE86IGNvbnZlcnQgdG8gYGFsdGVybmF0aXZlc2Agb24gb3ZlcndyaXRlP1xuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLnJ1bGVzW25hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtuYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdGV4aXN0aW5nID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgbmFtZTogZXhpc3RpbmcubmFtZSB8fCBuYW1lLCBydWxlczogW2V4aXN0aW5nXSB9KTtcblx0XHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IGV4aXN0aW5nO1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JyB0byAnJHtuYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0ZXhpc3RpbmcuYWRkUnVsZShydWxlKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlLnJ1bGVOYW1lID0gbmFtZTtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBydWxlO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cdC8vIEFkZCByZWdleCBhcyBhIHBhdHRlcm4gdG8gb3VyIGxpc3Qgb2YgcnVsZXNcblx0YWRkUGF0dGVybihuYW1lLCBwYXR0ZXJuLCBwcm9wZXJ0aWVzKSB7XG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5QYXR0ZXJuKHByb3BlcnRpZXMpO1xuXHRcdHJ1bGUucGF0dGVybiA9IHBhdHRlcm47XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fVxuXG5cbi8vXG4vLyAjIyBVdGlsaXR5IG1ldGhvZHNcbi8vXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gLlxuXHQvLyBJZiBzdWNjZXNzZnVsLCByZXR1cm5zIGB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZSB9YFxuXHQvLyBUaHJvd3MgaWYgdW5zdWNlc3NmdWwuXG5cdHN0YXRpYyBmaW5kTmVzdGVkVG9rZW5zKHRva2Vucywgc3RhcnRUb2tlbiwgZW5kVG9rZW4sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0aWYgKHRva2Vuc1tzdGFydEluZGV4XSAhPT0gc3RhcnRUb2tlbikgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBFeHBlY3RlZCAnJHtzdGFydFRva2VufScgYXQgaW5kZXggJHtzdGFydEluZGV4fSBvZiB0b2tlbnNgKTtcblx0XHRsZXQgbmVzdGluZyA9IDA7XG5cdFx0bGV0IG5lc3RlZCA9IGZhbHNlO1xuXHRcdGZvciAobGV0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIDEsIGxhc3RJbmRleCA9IHRva2Vucy5sZW5ndGg7IGVuZEluZGV4IDwgbGFzdEluZGV4OyBlbmRJbmRleCsrKSB7XG5cdFx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbZW5kSW5kZXhdO1xuXHRcdFx0aWYgKHRva2VuID09PSBzdGFydFRva2VuKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdFx0bmVzdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b2tlbiA9PT0gZW5kVG9rZW4pIHtcblx0XHRcdFx0aWYgKG5lc3RpbmcgPT09IDApXG5cdFx0XHRcdFx0cmV0dXJuIHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlOiB0b2tlbnMuc2xpY2Uoc3RhcnRJbmRleCsxLCBlbmRJbmRleCksIG5lc3RlZCB9O1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgQ291bGRuJ3QgZmluZCBtYXRjaGluZyAnJHtlbmRUb2tlbn0ncyBzdGFydGluZyBhdCBpdGVtICR7c3RhcnRJbmRleH1gKTtcblx0fVxuXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9QYXJzZXIuanMiLCIvL1x0IyBQYXJzZXIgUnVsZXNcbi8vXHRSdWxlcyBjYW4gYmUgYXMgc2ltcGxlIGFzIGEgc3RyaW5nIGBLZXl3b3JkYCBvciBhIGNvbXBsZXggc2VxdWVuY2Ugb2YgKG5lc3RlZCkgcnVsZXMuXG4vL1xuLy9cdFBhcnNlIGEgcnVsZSB3aXRoIGBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKWAsIHRoaXMgd2lsbCBlaXRoZXI6XG4vL1x0XHQtIHJldHVybiBgdW5kZWZpbmVkYCBpZiB0aGUgcnVsZSBkb2Vzbid0IG1hdGNoIHRoZSBoZWFkIG9mIHRoZSBzdHJlYW0sIG9yXG4vL1x0XHQtIHJldHVybiBhIENMT05FIG9mIHRoZSBydWxlIHdpdGggYXQgbGVhc3QgdGhlIGZvbGxvd2luZzpcbi8vXHRcdFx0LSBgc3RyZWFtYFx0XHRTdHJlYW0gd2hpY2ggd2FzIG1hdGNoZWQgd2l0aCBgc3RhcnRJbmRleGAgYXQgdGhlIHN0YXJ0IG9mIHRoZSBtYXRjaFxuLy9cdFx0XHQtIGBlbmRJbmRleGBcdE5vbi1pbmNsdXNpdmUgZW5kIGluZGV4IGluIHN0cmVhbSB3aGVyZSBtYXRjaCBlbmRzLlxuLy9cbi8vXHRUaGUgY2xvbmUgcmV0dXJuZWQgYWJvdmUgY2FuIGJlIG1hbmlwdWxhdGVkIHdpdGhcbi8vXHRcdC0gYHJ1bGUuZ2F0aGVyQXJndW1lbnRzKClgXHRcdFJldHVybiBtYXRjaGVkIGFyZ3VtZW50cyBpbiBhIGZvcm1hdCBzdWl0YWJsZSB0byBkbzpcbi8vXHRcdC0gYHJ1bGUudG9Tb3VyY2UoKWBcdFx0XHRcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcblxuXG4vL1RPRE86IG1ha2UgZ2F0aGVyQXJndW1lbnRzKCkgc3RhdGljIGFuZCBjYWxsIG9uIHRoaXNcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXHR9XG5cblx0Ly8gQ2xvbmUgdGhpcyBydWxlIGFuZCBhZGQgYW55IGBwcm9wc2AgcGFzc2VkIGluLlxuXHRjbG9uZShwcm9wcykge1xuXHRcdHZhciBjbG9uZSA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG5cdFx0T2JqZWN0LmFzc2lnbihjbG9uZSwgcHJvcHMpO1xuXHRcdHJldHVybiBjbG9uZTtcblx0fVxuXG5cdC8vIEZvciBhIHJ1bGUgaW5zdGFuY2UgYXNzb2NpYXRlZCB3aXRoIGEgc3RyZWFtLFxuXHQvLyByZXR1cm4gYSBuZXcgc3RyZWFtIEFGVEVSIHRoaXMgcnVsZSdzIGVuZC5cblx0bmV4dCgpIHtcblx0XHRpZiAoIXRoaXMuc3RyZWFtIHx8IHRoaXMuZW5kSW5kZXggPT09IHVuZGVmaW5lZClcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYHJ1bGUubmV4dCgpIGNhbGxlZCBvbiBydWxlIHdpdGhvdXQgYSBzdHJlYW1gLCB0aGlzKTtcblx0XHRyZXR1cm4gdGhpcy5zdHJlYW0uYWR2YW5jZVRvKHRoaXMuZW5kSW5kZXgpO1xuXHR9XG5cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cdGdldCBfYXJnKCkgeyByZXR1cm4gdGhpcy5hcmd1bWVudCB8fCB0aGlzLnJ1bGVOYW1lIHx8IHRoaXMuY29uc3RydWN0b3IubmFtZSB9XG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gTm90ZSB0aGF0IHdlIGRlZmluZSBgZ2F0aGVyQXJndW1lbnRzKClgIHN0YXRpY2FsbHkgb24gZWFjaCBzdWJjbGFzc1xuXHQvL1x0YW5kIHRoZW4gaW5zdGFuY2UgbWV0aG9kIGNhbGxzIGl0IG9uIGl0c2VsZi5cblx0c3RhdGljIGdhdGhlckFyZ3VtZW50cyhydWxlKSB7XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblx0Z2F0aGVyQXJndW1lbnRzKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLmdhdGhlckFyZ3VtZW50cyh0aGlzKTtcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQ7XG5cdH1cblxuLy9cbi8vICMjIGdyb3VwOiByZWZsZWN0aW9uXG4vL1xuXHRnZXQgcnVsZVR5cGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0fVxufVxuXG5cblxuLy8gUnVsZSBmb3IgbGl0ZXJhbCBzdHJpbmcgdmFsdWUsIHdoaWNoIGluY2x1ZGUgcHVuY3R1YXRpb24gc3VjaCBhcyBgKGAgZXRjLlxuLy9UT0RPOiByZW5hbWUgYFN5bWJvbGA/Pz9cblJ1bGUuU3RyaW5nID0gY2xhc3MgU3RyaW5nIGV4dGVuZHMgUnVsZSB7XG4vL1RPRE86IHRocm93IGlmIGBzdHJpbmdgIGlzIG5vdCBkZWZpbmVkP1xuXHQvLyBQYXJzZSB0aGlzIHJ1bGUgYXQgdGhlIGJlZ2lubmluZyBvZiBgc3RyZWFtYCwgYXNzdW1pbmcgbm8gd2hpdGVzcGFjZSBiZWZvcmUuXG5cdC8vIERlZmF1bHQgaXMgdGhhdCBgcnVsZS5zdHJpbmdgIGlzIGxpdGVyYWwgc3RyaW5nIHRvIG1hdGNoLlxuXHQvLyBPbiBtYXRjaCwgcmV0dXJucyBjbG9uZSBvZiBydWxlIHdpdGggYHZhbHVlYCwgYHN0cmVhbWAgYW5kIGBlbmRJbmRleGAuXG5cdC8vIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgbm8gbWF0Y2guXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0aWYgKCFzdHJlYW0uc3RhcnRzV2l0aCh0aGlzLnN0cmluZykpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogdGhpcy5zdHJpbmcsXG5cdFx0XHRlbmRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXggKyB0aGlzLnN0cmluZy5sZW5ndGgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cbi8vIE1lcmdlIHR3byBTdHJpbmcgcnVsZXMgdG9nZXRoZXIsIGFkZGluZyB0aGUgc2Vjb25kIHRvIHRoZSBmaXJzdC5cblJ1bGUubWVyZ2VTdHJpbmdzID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuXHRmaXJzdC5zdHJpbmcgKz0gc2Vjb25kLnN0cmluZztcblx0cmV0dXJuIGZpcnN0O1xufVxuXG5cbi8vIFJlZ2V4IHBhdHRlcm4uXG4vLyBgcnVsZS5wYXR0ZXJuYCBpcyB0aGUgcmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoLlxuLy8gTk9URTogdGhlIHJlZ2V4IHNob3VsZCBzdGFydCB3aXRoIGAvXi4uLmAgdG8gbWF0Y2ggYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuLy8gWW91IGNhbiBzcGVjaWZ5IGEgYHJ1bGUuYmxhY2tsaXN0YCBvZiBtYXRjaGVzIHRoYXQgd2lsbCBzcGVjaWZpY2FsbHkgTk9UIHdvcmssIGVnIGZvciBgaWRlbnRpZmllci5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHR2YXIgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5wYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYmFpbCBpZiBub3QgaW4gYmxhY2tsaXN0XG5cdFx0dmFyIG1hdGNoZWQgPSBtYXRjaFswXTtcblx0XHRpZiAodGhpcy5ibGFja2xpc3QgJiYgdGhpcy5ibGFja2xpc3RbbWF0Y2hlZF0pIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiBtYXRjaGVkLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgbWF0Y2hlZC5sZW5ndGgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdGFkZFRvQmxhY2tsaXN0KC4uLndvcmRzKSB7XG5cdFx0aWYgKCF0aGlzLmJsYWNrbGlzdCkgdGhpcy5ibGFja2xpc3QgPSB7fTtcblx0XHR3b3Jkcy5mb3JFYWNoKHdvcmQgPT4gdGhpcy5ibGFja2xpc3Rbd29yZF0gPSB0cnVlKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm47XG5cdH1cbn1cblxuXG4vLyBLZXl3b3JkIHBhdHRlcm5cbi8vXHRgcnVsZS5zdHJpbmdgIGlzIHRoZSBrZXl3b3JkIHN0cmluZyB0byBtYXRjaC5cblJ1bGUuS2V5d29yZCA9IGNsYXNzIEtleXdvcmQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdFx0Ly8gY3JlYXRlIHBhdHRlcm4gd2hpY2ggbWF0Y2hlcyBhdCB3b3JkIGJvdW5kYXJ5XG5cdFx0aWYgKCF0aGlzLnBhdHRlcm4pIHtcblx0XHRcdGlmICghdGhpcy5zdHJpbmcpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBrZXl3b3JkIHByb3BlcnR5XCIpO1xuXHRcdFx0dGhpcy5wYXR0ZXJuID0gbmV3IFJlZ0V4cChgXiR7dGhpcy5zdHJpbmd9XFxcXGJgKTtcblx0XHR9XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG4vLyBNZXJnZSB0d28gS2V5d29yZCBydWxlcyB0b2dldGhlciwgYWRkaW5nIHRoZSBzZWNvbmQgdG8gdGhlIGZpcnN0LlxuUnVsZS5tZXJnZUtleXdvcmRzID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuXHRmaXJzdC5zdHJpbmcgKz0gXCIgXCIgKyBzZWNvbmQuc3RyaW5nO1xuXHRmaXJzdC5wYXR0ZXJuID0gbmV3IFJlZ0V4cChcIl5cIiArIGZpcnN0LnN0cmluZy5zcGxpdChcIiBcIikuam9pbihcIlxcXFxzK1wiKSArIFwiXFxcXGJcIik7XG5cdHJldHVybiBmaXJzdDtcbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHZhciBydWxlID0gcGFyc2VyLmdldFJ1bGUodGhpcy5ydWxlKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQXR0ZW1wdGluZyB0byBwYXJzZSB1bmtub3duIHJ1bGUgJyR7dGhpcy5uYW1lfSdgLCB0aGlzKTtcblx0XHR2YXIgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgcmVzdWx0LmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHt9XG5cblxuLy8gU2VxdWVuY2Ugb2YgcnVsZXMgdG8gbWF0Y2ggKGF1dG8tZXhjbHVkaW5nIHdoaXRlc3BhY2UpLlxuUnVsZS5TZXF1ZW5jZSA9IGNsYXNzIFNlcXVlbmNlIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFyZXN1bHQgJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vVE9ET0Ncblx0Ly8gR2F0aGVyIGFyZ3VtZW50cyBmcm9tIG91ciBwYXJzZWQgYHJlc3VsdHNgIGFycmF5LlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYHZhbHVlc2AgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGByZXN1bHRzLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYHJlc3VsdHMucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gcnVsZSB0eXBlOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdHN0YXRpYyBnYXRoZXJBcmd1bWVudHMoc2VxdWVuY2UpIHtcblx0XHRpZiAoIXNlcXVlbmNlLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IGFyZ3MgPSB7fTtcblx0XHRmb3IgKGxldCBuZXh0IG9mIHNlcXVlbmNlLnJlc3VsdHMpIHtcblx0XHRcdGxldCBhcmdOYW1lID0gbmV4dC5fYXJnO1xuXHRcdFx0Ly8gRm9yIG5lc3RlZCBydWxlcywgcmVjdXJzZSB0byBnZXQgdGhlaXIgYXJndW1lbnRzXG5cdFx0XHRsZXQgcmVzdWx0ID0gbmV4dC5nYXRoZXJBcmd1bWVudHMoKTtcblxuXHRcdFx0Ly8gSWYgYXJnIGFscmVhZHkgZXhpc3RzLCBjb252ZXJ0IHRvIGFuIGFycmF5XG5cdFx0XHRpZiAoYXJnTmFtZSBpbiBhcmdzKSB7XG5cdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShhcmdzW2FyZ05hbWVdKSkgYXJnc1thcmdOYW1lXSA9IFthcmdzW2FyZ05hbWVdXTtcblx0XHRcdFx0YXJnc1thcmdOYW1lXS5wdXNoKHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0YXJnc1thcmdOYW1lXSA9IHJlc3VsdDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGFyZ3M7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlcy5qb2luKFwiIFwiKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG5cbn1cblxuLy8gU3ludGFjdGljIHN1Z2FyIGZvciBkZWJ1Z2dpbmdcblJ1bGUuRXhwcmVzc2lvbiA9IGNsYXNzIGV4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXguXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBGaW5kIHRoZSBMT05HRVNUIG1hdGNoXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IGJlc3RNYXRjaDtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKCFtYXRjaCkgY29udGludWU7XG5cblx0XHRcdC8vIHRha2UgdGhlIGxvbmdlc3QgbWF0Y2hcblx0XHRcdGlmICghYmVzdE1hdGNoIHx8IG1hdGNoLmVuZEluZGV4ID4gYmVzdE1hdGNoLmVuZEluZGV4KVxuXHRcdFx0XHRiZXN0TWF0Y2ggPSBtYXRjaDtcblx0XHR9XG5cdFx0aWYgKCFiZXN0TWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiBiZXN0TWF0Y2gsXG5cdFx0XHRlbmRJbmRleDogYmVzdE1hdGNoLmVuZEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZSgpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAoJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGVzLmpvaW4oXCJ8XCIpfSkke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuLy8gUmVwZWF0aW5nIHJ1bGUuXG4vL1x0YHRoaXMucnVsZWAgaXMgdGhlIHJ1bGUgdGhhdCByZXBlYXRzLlxuLy9cbi8vIEFmdGVyIG1hdGNoaW5nOlxuLy9cdGB0aGlzLnJlc3VsdHNgIGlzIGFycmF5IG9mIHJlc3VsdHMgb2YgbWF0Y2hlcy5cbi8vXG4vL1x0QXV0b21hdGljYWxseSBjb25zdW1lcyB3aGl0ZXNwYWNlIGJlZm9yZSBydWxlcy5cbi8vXHRJZiBkb2Vzbid0IG1hdGNoIGF0IGxlYXN0IG9uZSwgcmV0dXJucyBgdW5kZWZpbmVkYC5cblJ1bGUuUmVwZWF0ID0gY2xhc3MgUmVwZWF0IGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBuZXh0ID0gc3RyZWFtO1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghcmVzdWx0KSBicmVhaztcblxuXHRcdFx0cmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0c3RhdGljIGdhdGhlckFyZ3VtZW50cyhyZXBlYXQpIHtcblx0XHRpZiAoIXJlcGVhdC5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiByZXBlYXQucmVzdWx0cy5tYXAoIHJlc3VsdCA9PiByZXN1bHQuZ2F0aGVyQXJndW1lbnRzKCkgKTtcblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdHRocm93IFwiRG9uJ3QgdW5kZXJzdGFuZCBob3cgdG8gc291cmNlIFJ1bGUuUmVwZWF0IVwiO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0Y29uc3QgcnVsZSA9ICh0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlIHx8IHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiB0aGlzLnJ1bGUuc3RyaW5nLmluY2x1ZGVzKFwiIFwiKVxuXHRcdFx0XHQgICA/IGAoJHt0aGlzLnJ1bGV9KWBcblx0XHRcdFx0ICAgOiBgJHt0aGlzLnJ1bGV9YFxuXHRcdFx0XHQpO1xuXHRcdHJldHVybiBgJHtydWxlfSR7dGhpcy5vcHRpb25hbCA/ICcqJyA6ICcrJ31gO1xuXHR9XG59XG5cblxuLy8gTGlzdCBtYXRjaCBydWxlOiAgIGBbPGl0ZW0+PGRlbGltaXRlcj5dYC4gZWdcIiBgW3tudW1iZXJ9LF1gIHRvIG1hdGNoIGAxLDIsM2Bcbi8vXHRgcnVsZS5pdGVtYCBpcyB0aGUgcnVsZSBmb3IgZWFjaCBpdGVtLFxuLy9cdGBydWxlLmRlbGltaXRlcmAgaXMgdGhlIGRlbGltaXRlciBiZXR3ZWVuIGVhY2ggaXRlbS5cbi8vIFx0YHJ1bGUucmVzdWx0c2AgaW4gdGhlIG91dHB1dCBpcyB0aGUgbGlzdCBvZiB2YWx1ZXMuXG4vL1xuLy9cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGEgTGlzdCBydWxlIHdpbGwgTk9UIHJlcGVhdCAoPz8/PylcblJ1bGUuTGlzdCA9IGNsYXNzIExpc3QgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHQvLyBlbnN1cmUgaXRlbSBhbmQgZGVsaW1pdGVyIGFyZSBvcHRpb25hbCBzbyB3ZSBkb24ndCBiYXJmIGluIGBwYXJzZVJ1bGVgXG5cdFx0dGhpcy5pdGVtLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR0aGlzLmRlbGltaXRlci5vcHRpb25hbCA9IHRydWU7XG5cblx0XHR2YXIgcmVzdWx0cyA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHQvLyBnZXQgbmV4dCBpdGVtLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGl0ZW0gPSB0aGlzLml0ZW0ucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghaXRlbSkgYnJlYWs7XG4vL2NvbnNvbGUubG9nKGl0ZW0pO1xuXHRcdFx0cmVzdWx0cy5wdXNoKGl0ZW0pO1xuXHRcdFx0bmV4dCA9IGl0ZW0ubmV4dCgpO1xuXG5cdFx0XHQvLyBnZXQgZGVsaW1pdGVyLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGRlbGltaXRlciA9IHRoaXMuZGVsaW1pdGVyLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0ID0gZGVsaW1pdGVyLm5leHQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIG1hdGNoZWQgaXRlbSBieSBpbmRleFxuXHRnZXRJdGVtKGluZGV4KSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMucmVzdWx0c1tpbmRleF07XG5cdH1cblxuXHR0b1NvdXJjZSgpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcdFx0Ly8gVE9ETzogdGhyb3c/Pz9cblx0XHRsZXQgcmVzdWx0cyA9IHRoaXMucmVzdWx0cy5tYXAoIHJlc3VsdCA9PiByZXN1bHQudG9Tb3VyY2UoKSApLmpvaW4oXCIsIFwiKTtcblx0XHRyZXR1cm4gYFske3Jlc3VsdHN9XWA7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYFske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMuaXRlbX0gJHt0aGlzLmRlbGltaXRlcn1dJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGUuanMiLCJpbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyByZS1leHBvcnQgUnVsZSBmb3IgdGVzdGluZ1xuZXhwb3J0IGRlZmF1bHQgUnVsZTtcblxuLy9cbi8vXHQjIFBhcnNpbmcgYHJ1bGVTeW50YXhgIHRvIGNyZWF0ZSBydWxlcyBhdXRvbWF0aWNhbGx5LlxuLy9cbi8vIFRPRE86XHRQdWxsIGBwYXJzZVJ1bGVTeW50YXhgIHN0dWZmIG91dCBpbnRvIHNlcGFyYXRlIG1vZHVsZT9cbi8vIFRPRE86XHRCZXR0ZXIgbmFtZSBmb3IgYHJ1bGVTeW50YXhgXG4vLyBUT0RPOlx0VXNlIGtleXdvcmRzIGluIHN5bnRheCB0byBtYWtlIGEgcXVpY2sgcmVnZXgtYmFzZWQgYHRlc3RgIGZ1bmN0aW9uIGZvciB0aGUgZW50aXJlIHJ1bGVcbk9iamVjdC5hc3NpZ24oUnVsZSwge1xuXG4vL1xuLy8gIyMgZ3JvdXA6IHBhcnNpbmcgc3ludGF4XG4vL1xuXG4vLyBUT0RPOiBjb252ZXJ0IHRvIFRleHRTdHJlYW0gcGF0dGVybiBhbGEgbm9ybWFsIHBhcnNlciBvbmNlIHRoYXQgc2V0dGxlcyBkb3duPz8/XG5cdHBhcnNlUnVsZVN5bnRheChzeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0bGV0IHN5bnRheFN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCk7XG5cdFx0bGV0IHJ1bGVzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgW10pO1xuXG5cdFx0bGV0IHJ1bGU7XG5cdFx0Ly8gSWYgd2Ugb25seSBnb3Qgb25lIHRoaW5nLCByZXR1cm4gdGhhdCBhcyB0aGUgcmVzdWx0XG5cdFx0aWYgKHJ1bGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cnVsZSA9IHJ1bGVzWzBdO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgU2VxdWVuY2VDb25zdHJ1Y3Rvcih7IHJ1bGVzIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9LFxuXG5cdHRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpIHtcblx0XHRjb25zdCBTWU5UQVhfRVhQUkVTU0lPTiA9IC8oPzpbXFx3XFwtXSt8XFxcXFtcXFtcXChcXHtcXClcXH1cXF1dfFteXFxzXFx3XXxcXHwpL2c7XG5cdFx0dmFyIHN5bnRheFN0cmVhbSA9IHN5bnRheC5tYXRjaChTWU5UQVhfRVhQUkVTU0lPTik7XG5cdFx0aWYgKCFzeW50YXhTdHJlYW0pIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgdG9rZW5pemUgcGFyc2UgcnVsZSBzeW50YXggPj4ke3N5bnRheH08PGApO1xuXHRcdHJldHVybiBzeW50YXhTdHJlYW07XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBsYXN0SW5kZXggPSBzeW50YXhTdHJlYW0ubGVuZ3RoO1xuXHRcdHdoaWxlIChzdGFydEluZGV4IDwgbGFzdEluZGV4KSB7XG5cdFx0XHRsZXQgWyBydWxlLCBlbmRJbmRleCBdID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRpZiAocnVsZSkge1xuXHRcdFx0XHR2YXIgbGFzdCA9IHJ1bGVzW3J1bGVzLmxlbmd0aC0xXTtcblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBTdHJpbmdgIGFuZCBsYXN0IHdhcyBhIGBTdHJpbmdgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5TdHJpbmcgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3RyaW5nKSB7XG5cdFx0XHRcdFx0UnVsZS5tZXJnZVN0cmluZ3MobGFzdCwgcnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBLZXl3b3JkYCBhbmQgbGFzdCB3YXMgYWxzbyBhIGBLZXl3b3JkYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0ZWxzZSBpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQpIHtcblx0XHRcdFx0XHRSdWxlLm1lcmdlS2V5d29yZHMobGFzdCwgcnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cnVsZXMucHVzaChydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0c3RhcnRJbmRleCA9IGVuZEluZGV4ICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHZhciBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdC8vIGlmIHdlIGdvdCBhIFwiXFxcXFwiICh3aGljaCBhbHNvIGhhcyB0byBnbyBpbnRvIHRoZSBzb3VyY2Ugc3RyaW5nIGFzIFwiXFxcXFwiKVxuXHRcdC8vIHRyZWF0IHRoZSBuZXh0IGJpdCBhcyBhIGxpdGVyYWwgc3RyaW5nIHJhdGhlciB0aGFuIGFzIGEgc3BlY2lhbCBjaGFyYWN0ZXIuXG5cdFx0aWYgKHN5bnRheFRva2VuID09PSBcIlxcXFxcIikge1xuXHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ICsgMSk7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChzeW50YXhUb2tlbikge1xuXHRcdFx0Y2FzZSBcIntcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIihcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCJbXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIqXCI6XG5cdFx0XHRjYXNlIFwiK1wiOlxuXHRcdFx0Y2FzZSBcIj9cIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cblx0XHRcdC8vIHRoZSBmb2xsb3dpbmcgc2hvdWxkIEFMV0FZUyBiZSBjb25zdW1lZCBieSB0aGUgYWJvdmVcblx0XHRcdGNhc2UgXCJ9XCI6XG5cdFx0XHRjYXNlIFwiKVwiOlxuXHRcdFx0Y2FzZSBcIl1cIjpcblx0XHRcdGNhc2UgXCJ8XCI6XG5cdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCAke3N5bnRheFRva2VufSBmb3VuZCBhcyBpdGVtICR7c3RhcnRJbmRleH0gb2YgJHt0aGlzLnN5bnRheH1gKTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0dmFyIHN0cmluZyA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XSwgcnVsZTtcblx0XHQvLyBJZiBsZXR0ZXJzIG9ubHksIG1hdGNoIGFzIGEgS2V5d29yZCAoc28gd2UgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkgYWZ0ZXIgdGhlIHN0cmluZykuXG5cdFx0aWYgKHN0cmluZy5tYXRjaCgvW0EtWmEtel0rLykpIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5LZXl3b3JkKHsgc3RyaW5nIH0pO1xuXHRcdH1cblx0XHQvLyBPdGhlcndpc2UgbWF0Y2ggYXMgYSBTdHJpbmcsIHdoaWNoIGRvZXNuJ3QgcmVxdWlyZSBub24td29yZCBjaGFycyBhZnRlciB0aGUgdGV4dC5cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5TdHJpbmcoeyBzdHJpbmc6IHN0cmluZyB9KTtcblx0XHRcdC8vIElmIHN0cmluZyBzdGFydHMgd2l0aCBgXFxcXGAsIGl0J3MgYW4gZXNjYXBlZCBsaXRlcmFsIChlZzogYFxcW2AgbmVlZHMgdG8gaW5wdXQgYXMgYFxcXFxbYCkuXG5cdFx0XHRpZiAoc3RyaW5nLnN0YXJ0c1dpdGgoXCJcXFxcXCIpKSB7XG5cdFx0XHRcdC8vIHJlbW92ZSBsZWFkaW5nIHNsYXNoIGluIG1hdGNoIHN0cmluZy4uLlxuXHRcdFx0XHRydWxlLnN0cmluZyA9IHJ1bGUuc3RyaW5nLnN1YnN0cigxKTtcblx0XHRcdFx0Ly8gYnV0IGxlYXZlIGl0IGluIHRvU3RyaW5nXG5cdFx0XHRcdHJ1bGUudG9TdHJpbmcgPSAoKSA9PiBzdHJpbmc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBbIHJ1bGUsIHN0YXJ0SW5kZXggXTtcblx0fSxcblxuXG5cdC8vIE1hdGNoIGdyb3VwaW5nIGV4cHJlc3Npb24gYCguLi58Li4uKWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHQvLyBOT1RFOiBuZXN0ZWQgcGFyZW5zIG1heSBub3QgaGF2ZSBhbHRlcm5hdGl2ZXMuLi4gOi0oICAgYChhfChifGMpKWAgd29uJ3Qgd29yaz8/P1xuXHRwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIihcIiwgXCIpXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0Ly8gcHVsbCBvdXQgZXhwbGljaXQgYXJndW1lbnQgbmFtZVxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdC8vIHNwbGl0IGludG8gZ3JvdXBzLCBpbmNsdWRpbmcgbmVzdGVkIHBhcmVuc1xuXHRcdGxldCBhbHRlcm5hdGVzID1cblx0XHRcdGdyb3VwQWx0ZXJuYXRlcyhzbGljZSlcblx0XHRcdC5tYXAoZnVuY3Rpb24oZ3JvdXApIHtcblx0XHRcdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoZ3JvdXAsIFtdKTtcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHNbMF07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSdWxlLlNlcXVlbmNlKHsgcnVsZXM6IHJlc3VsdHMgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0bGV0IHJ1bGUgPSBhbHRlcm5hdGVzLmxlbmd0aCA9PT0gMSA/IGFsdGVybmF0ZXNbMF0gOiBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlczogYWx0ZXJuYXRlcyB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXG5cdFx0ZnVuY3Rpb24gZ3JvdXBBbHRlcm5hdGVzKHRva2Vucykge1xuXHRcdFx0dmFyIGFsdGVybmF0ZXMgPSBbXTtcblx0XHRcdHZhciBjdXJyZW50ID0gW107XG5cdFx0XHRmb3IgKHZhciBpID0gMCwgdG9rZW47IHRva2VuID0gdG9rZW5zW2ldOyBpKyspIHtcblx0XHRcdFx0Ly8gaGFuZGxlIGFsdGVybmF0ZSBtYXJrZXJcblx0XHRcdFx0aWYgKHRva2VuID09PSBcInxcIikge1xuXHRcdFx0XHRcdGFsdGVybmF0ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XHRjdXJyZW50ID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaGFuZGxlIG5lc3RlZCBwYXJlbnNcblx0XHRcdFx0ZWxzZSBpZiAodG9rZW4gPT09IFwiKFwiKSB7XG5cdFx0XHRcdFx0bGV0IHsgZW5kSW5kZXggfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHRva2VucywgXCIoXCIsIFwiKVwiLCBpKTtcblx0XHRcdFx0XHRjdXJyZW50ID0gY3VycmVudC5jb25jYXQodG9rZW5zLnNsaWNlKGksIGVuZEluZGV4ICsgMSkpO1xuXHRcdFx0XHRcdGkgPSBlbmRJbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdXJyZW50LnB1c2godG9rZW4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoY3VycmVudC5sZW5ndGgpIGFsdGVybmF0ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdHJldHVybiBhbHRlcm5hdGVzO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCByZXBlYXQgaW5kaWNhdG9yIGA/YCwgYCtgIG9yIGAqYCBieSBhdHRhY2hpbmcgaXQgdG8gdGhlIHByZXZpb3VzIHJ1bGUuXG5cdHBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzeW1ib2wgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cdFx0dmFyIHJ1bGUgPSBydWxlc1tydWxlcy5sZW5ndGggLSAxXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgYXR0YWNoIHJlcGVhdCBzeW1ib2wgJHtzeW1ib2x9IHRvIGVtcHR5IHJ1bGUhYCk7XG5cblx0XHQvLyBUcmFuc2Zvcm0gbGFzdCBydWxlIGludG8gYSByZXBlYXQgZm9yIGAqYCBhbmQgYCtgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiKlwiIHx8IHN5bWJvbCA9PT0gXCIrXCIpIHtcblx0XHRcdGxldCBhcmd1bWVudCA9IHJ1bGUuYXJndW1lbnQ7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuUmVwZWF0KHsgcnVsZSB9KTtcblx0XHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdFx0Ly8gcHVzaCBpbnRvIHJ1bGUgc3RhY2sgaW4gcGxhY2Ugb2Ygb2xkIHJ1bGVcblx0XHRcdHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdID0gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBSdWxlIGlzIG9wdGlvbmFsIGZvciBgP2AgYW5kIGAqYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIj9cIiB8fCBzeW1ib2wgPT09IFwiKlwiKSB7XG5cdFx0XHRydWxlLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gWyB1bmRlZmluZWQsIHN0YXJ0SW5kZXggXVxuXHR9LFxuXG5cdC8vIE1hdGNoIGB7PHJ1bGVOYW1lPn1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCBtYXRjaCA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJ7XCIsIFwifVwiLCBzdGFydEluZGV4KTtcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA9PT0gMyAmJiBtYXRjaC5zbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gbWF0Y2guc2xpY2VbMF07XG5cdFx0XHRtYXRjaC5zbGljZSA9IG1hdGNoLnNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID4gMSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBwcm9jZXNzIHJ1bGVzIHdpdGggbW9yZSB0aGFuIG9uZSBydWxlIG5hbWU6IHske21hdGNoLnNsaWNlLmpvaW4oXCJcIil9fWApO1xuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuU3VicnVsZSh7IHJ1bGU6IG1hdGNoLnNsaWNlWzBdIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIG1hdGNoLmVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggbGlzdCBleHByZXNzaW9uIGBbPGl0ZW0+PGRlbGltaXRlcj5dYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJbXCIsIFwiXVwiLCBzdGFydEluZGV4KTtcblxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHNsaWNlLCBbXSk7XG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoICE9PSAyKSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgc3R1ZmYgYXQgZW5kIG9mIGxpc3Q6IFske3NsaWNlLmpvaW4oXCIgXCIpfV1gKTtcblx0XHR9XG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5MaXN0KCk7XG5cdFx0cnVsZS5pdGVtID0gcmVzdWx0c1swXVxuXHRcdHJ1bGUuZGVsaW1pdGVyID0gcmVzdWx0c1sxXVxuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cdH0sXG5cbn0pO1xuXG5cblxuLy8gIyMgIEFkZCBtZXRob2RzIHRvIFBhcnNlciB0byBkZWZpbmUgcnVsZXMgdXNpbmcgdGhlIGFib3ZlIHN5bnRheC5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFBhcnNlci5wcm90b3R5cGUsIHtcblxuXHQvLyBQYXJzZSBhIGBydWxlU3ludGF4YCBydWxlIGFuZCBhZGQgaXQgdG8gb3VyIGxpc3Qgb2YgcnVsZXMuXG5cdC8vIFJldHVybnMgdGhlIG5ldyBydWxlLlxuXHQvLyBMb2dzIHBhcnNpbmcgZXJyb3JzIGJ1dCBhbGxvd3MgdGhpbmdzIHRvIGNvbnRpbnVlLlxuXHRhZGRTeW50YXg6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3Rvcik7XG5cblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0fVxuXHR9fSxcblxuXHRhZGRTdGF0ZW1lbnQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFJ1bGUuU3RhdGVtZW50KTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkRXhwcmVzc2lvbjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgUnVsZS5FeHByZXNzaW9uKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcnVsZSk7XG5cdH19LFxuXG5cdC8vIEFkZCBpbmZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgb3IgYlwiLlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZEluZml4T3BlcmF0b3I6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSkge1xuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRJbmZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50cmFuc2Zvcm1lcikge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBpbmZpeCBvcGVyYXRvciBydWxlICcke25hbWV9JyB0byBzcGVjaWZ5ICd0cmFuc2Zvcm1lcicgZnVuY3Rpb25gKVxuXHRcdFx0fVxuXHRcdFx0Ly8gY2xlYXIgbGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgZm9yIGdldHRlciBiZWxvd1xuXHRcdFx0ZGVsZXRlIHRoaXMuX19pbmZpeE9wZXJhdG9ycztcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJpbmZpeC1vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH19LFxuXG5cdC8vIExpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGFzIHN0cmluZ3MuXG5cdC8vIFJlLW1lbW9pemVkIGFmdGVyIGBhZGRJbmZpeE9wZXJhdG9yYCBhYm92ZS5cbi8vVE9ETzogbWFrZSBhIHBhdHRlcm4gZm9yIHRoaXM/Pz9cblx0aW5maXhPcGVyYXRvcnM6IHsgZ2V0OiBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMuX19pbmZpeE9wZXJhdG9ycykge1xuXHRcdFx0dmFyIG9wZXJhdG9ycyA9IHRoaXMucnVsZXNbXCJpbmZpeC1vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0ICYmIHRoaXMucnVsZXNbXCJpbmZpeC1vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZyk7XG5cdFx0XHRpZiAob3BlcmF0b3JzKSB7XG5cdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcIl9faW5maXhPcGVyYXRvcnNcIiwge1xuXHRcdFx0XHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcblx0XHRcdFx0XHR2YWx1ZTogb3BlcmF0b3JzXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5fX2luZml4T3BlcmF0b3JzO1xuXHR9fSxcblxuXHQvLyBBZGQgcG9zdGZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgaXMgZGVmaW5lZFwiXG5cdC8vIE5PVEU6IGlmIHlvdSBoYXZlIG1vcmUgdGhhbiBvbmUgbWF0Y2hpbmcgb3BlcmF0b3IsXG5cdC8vXHRcdCBwYXNzIGluIGFuIGFycmF5IG9mIHNpbXBsZSBzdHJpbmdzIHNvIGFsbCBvZiBvdXIgb3BlcmF0b3JzIGFyZSBzaW1wbGUgc3RyaW5ncy5cblx0YWRkUG9zdGZpeE9wZXJhdG9yOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpIHtcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkUG9zdGZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50cmFuc2Zvcm1lcikge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBwb3N0Zml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RyYW5zZm9ybWVyJyBmdW5jdGlvbmApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gY2xlYXIgbGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgZm9yIGdldHRlciBiZWxvd1xuXHRcdFx0ZGVsZXRlIHRoaXMuX19wb3N0Zml4T3BlcmF0b3JzO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcInBvc3RmaXgtb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIHBvc3RmaXggb3BlcmF0b3JzIGFzIHN0cmluZ3MuXG5cdC8vIFJlLW1lbW9pemVkIGFmdGVyIGBhZGRJbmZpeE9wZXJhdG9yYCBhYm92ZS5cbi8vVE9ETzogbWFrZSBhIG1lbW9pemF0aW9uIHBhdHRlcm4gZm9yIHRoaXM/Pz9cblx0cG9zdGZpeE9wZXJhdG9yczogeyBnZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghdGhpcy5fX3Bvc3RmaXhPcGVyYXRvcnMpIHtcblx0XHRcdHZhciBvcGVyYXRvcnMgPSB0aGlzLnJ1bGVzW1wicG9zdGZpeC1vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0ICYmIHRoaXMucnVsZXNbXCJwb3N0Zml4LW9wZXJhdG9yXCJdLnJ1bGVzLm1hcChydWxlID0+IHJ1bGUuc3RyaW5nKTtcblx0XHRcdGlmIChvcGVyYXRvcnMpIHtcblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiX19wb3N0Zml4T3BlcmF0b3JzXCIsIHtcblx0XHRcdFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0XHRcdFx0dmFsdWU6IG9wZXJhdG9yc1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX19wb3N0Zml4T3BlcmF0b3JzO1xuXHR9fSxcblxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZVN5bnRheC5qcyIsIi8vXG4vL1x0IyBDb3JlIGBydWxlc2AgLS0gc2ltcGxlIGRhdGF0eXBlcywgZXRjLlxuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy9cbi8vIFJlZ2V4IHBhdHRlcm4gcnVsZXMgd2l0aCBjdXN0b20gY29uc3RydWN0b3JzIGZvciBkZWJ1Z2dpbmdcbi8vXG4vL3BhcnNlci5hZGRQYXR0ZXJuKFwid2hpdGVzcGFjZVwiLCAvXlxccysvKTtcblJ1bGUuV2hpdGVzcGFjZSA9IGNsYXNzIHdoaXRlc3BhY2UgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge31cbnBhcnNlci5hZGRSdWxlKFwid2hpdGVzcGFjZVwiLCBuZXcgUnVsZS5XaGl0ZXNwYWNlKHsgcGF0dGVybjogL15cXHMrLywgb3B0aW9uYWw6IHRydWUgfSkpO1xuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuLy9wYXJzZXIuYWRkUGF0dGVybihcImlkZW50aWZpZXJcIiwgL15bYS16XVtcXHdcXGRcXC1fXSovKTtcblJ1bGUuSWRlbnRpZmllciA9IGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgaWRlbnRpZmllciA9IHBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgUnVsZS5JZGVudGlmaWVyKHtcblx0cGF0dGVybjogL15bYS16XVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBpZGVudGlmaWVyKTtcblxuLy8gU3RpY2sgYGlkZW50aWZpZXJgIG9uIGBwYXJzZXJgIHNvIHdlIGNhbiBhZGQgdG8gaXRzIGJsYWNrbGlzdCBlYXNpbHkuXG5wYXJzZXIuaWRlbnRpZmllciA9IGlkZW50aWZpZXI7XG5cbi8vIEFkZCBFbmdsaXNoIHByZXBvc2l0aW9ucyBhcyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vIFRFU1RNRVxucGFyc2VyLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYWJvdXRcIiwgXCJhYm92ZVwiLCBcImFmdGVyXCIsIFwiYXNcIiwgXCJhdFwiLFxuXHRcImJlZm9yZVwiLCBcImJlaGluZFwiLCBcImJlbG93XCIsIFwiYmVuZWF0aFwiLCBcImJlc2lkZVwiLCBcImJldHdlZW5cIiwgXCJiZXlvbmRcIiwgXCJieVwiLFxuXHRcImRvd25cIiwgXCJkdXJpbmdcIixcblx0XCJleGNlcHRcIixcblx0XCJmb3JcIiwgXCJmcm9tXCIsXG5cdFwiaW5cIiwgXCJpbnRvXCIsXG5cdFwibGVzc1wiLCBcImxvbmdcIixcblx0XCJtaW51c1wiLCBcIm1vcmVcIixcblx0XCJuZWFyXCIsXG5cdFwib2ZcIiwgXCJvZmZcIiwgXCJvblwiLCBcIm9udG9cIiwgXCJvcHBvc2l0ZVwiLCBcIm91dFwiLCBcIm91dHNpZGVcIiwgXCJvdmVyXCIsXG5cdFwic2hvcnRcIiwgXCJzaW5jZVwiLFxuXHRcInRoYW5cIiwgXCJ0aGVuXCIsIFwidGhyb3VnaFwiLCBcInRocnVcIiwgXCJ0b1wiLCBcInRvd2FyZFwiLCBcInRvd2FyZHNcIixcblx0XCJ1bmRlclwiLCBcInVuZGVybmVhdGhcIiwgXCJ1bnRpbFwiLCBcInVwXCIsIFwidXBvblwiLCBcInVwc2lkZVwiLFxuXHRcInZlcnN1c1wiLCBcInZzXCIsXG5cdFwid2l0aFwiLCBcIndpdGhpblwiLCBcIndpdGhvdXRcIixcbik7XG5cbi8vIGBUeXBlYCA9IHR5cGUgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhbiB1cHBlci1jYXNlIGxldHRlciAoPylcbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJ0eXBlbmFtZVwiLCAvXltBLVpdW1xcd1xcZFxcLV9dKi8pO1xuUnVsZS5UeXBlID0gY2xhc3MgVHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoXCJUeXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvXltBLVpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHR5cGUpO1xuXG5cbi8vIGBudW1iZXJgIGFzIGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG5SdWxlLk51bWJlciA9IGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBudW1iZXIgPSBwYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgUnVsZS5OdW1iZXIoe1xuXHRwYXR0ZXJuOiAvXi0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VGbG9hdCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG51bWJlcik7XG5cblxuLy8gTnVtZXJpYyBgaW50ZWdlcmAgb25seSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gTk9URTogdGhpcyBXSUxMIG1hdGNoIGEgZmxvYXQsIGJ1dCB0aGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBjb2VyY2UgdG8gYW4gaW50ZWdlci5cbi8vIFJFVklFVzogaXMgdGhpcyByaWdodD8gIEJldHRlciB0byBub3QgbWF0Y2ggYSBmbG9hdD9cblJ1bGUuSW50ZWdlciA9IGNsYXNzIGludGVnZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImludGVnZXJcIiwgbmV3IFJ1bGUuSW50ZWdlcih7XG5cdHBhdHRlcm46IC9eLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0ZXh0ID0gcGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyBSdWxlLlRleHQoe1xuXHRwYXR0ZXJuOiAvXig/OlwiW15cIl0qXCJ8J1teJ10qJykvXG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdGV4dCk7XG5cblxuLy8gQm9vbGVhbiBsaXRlcmFsLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBUT0RPOiBiZXR0ZXIgbmFtZSBmb3IgdGhpcz8/P1xuUnVsZS5Cb29sZWFuID0gY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBib29sID0gcGFyc2VyLmFkZFJ1bGUoXCJib29sZWFuXCIsIG5ldyBSdWxlLkJvb2xlYW4oe1xuXHRwYXR0ZXJuOiAvXih0cnVlfGZhbHNlfHllc3xub3xzdWNjZXNzfGZhaWx1cmV8b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwic3VjY2Vzc1wiOlxuXHRcdFx0Y2FzZSBcIm9rXCI6XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGJvb2wpO1xuLy8gQWRkIHRva2VucyBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vIFRFU1RNRVxucGFyc2VyLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXCJ0cnVlXCIsIFwiZmFsc2VcIiwgXCJ5ZXNcIiwgXCJub1wiLCBcInN1Y2Nlc3NcIiwgXCJmYWlsdXJlXCIsIFwib2tcIiwgXCJjYW5jZWxcIik7XG5cbi8vIExpdGVyYWwgbGlzdCAoYXJyYXkpLCBlZzogIGBbMSwyLHRydWUsZmFsc2UgXWBcbmxldCBsaXN0ID0gcGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGl0ZXJhbC1saXN0XCIsXG5cdFwiXFxcXFtbbGlzdDp7ZXhwcmVzc2lvbn0sXT9cXFxcXVwiLFxuXHR7XG5cdFx0Z2F0aGVyQXJndW1lbnRzKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMucmVzdWx0c1sxXTtcblx0XHR9LFxuXHRcdC8vIHJldHVybiBqdXN0IHRoZSBsaXN0IGFzIG91ciBzb3VyY2Vcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG4gXHRcdFx0cmV0dXJuIHRoaXMuZ2F0aGVyQXJndW1lbnRzKCkudG9Tb3VyY2UoKTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIExpdGVyYWwgdmFsdWUgYXMgbnVtYmVyLCB0ZXh0IG9yIGJvb2xlYW4uXG4vL1RPRE86IHRoaXMgaXMgYW4gZXhwcmVzc2lvbi4uLiBidXQgaW5zdGFsbGluZyBpdCB0aGF0IHdheSBicmVha3MgcGFyc2luZy4uLj9cbi8vVEVTVE1FOiBhZGQgbGl0ZXJhbC1saXN0IHRvIHRoaXM/XG5wYXJzZXIuYWRkU3ludGF4KFwibGl0ZXJhbFwiLCBcIihsaXRlcmFsOntudW1iZXJ9fHt0ZXh0fXx7Ym9vbGVhbn18e2xpdGVyYWwtbGlzdH0pXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJcbi8vIFRPRE86IGNvbnZlcnQgdG8gbGluZS1hd2FyZSBzdHJlYW0/Pz9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRTdHJlYW0ge1xuXHQvLyBZb3UgY2FuIGNvbnN0cnVjdCB3aXRoIGEgdGV4dCBzdHJpbmcgb3IgYSBzZXQgb2YgcHJvcGVydGllcyAoaW5jbHVkaW5nIGB0ZXh0YCkuXG5cdGNvbnN0cnVjdG9yKHRleHRPclByb3BzKSB7XG5cdFx0aWYgKHR5cGVvZiB0ZXh0T3JQcm9wcyA9PT0gXCJzdHJpbmdcIilcblx0XHRcdHRoaXMudGV4dCA9IHRleHRPclByb3BzO1xuXHRcdGVsc2Vcblx0XHRcdE9iamVjdC5hc3NpZ24odGhpcywgdGV4dE9yUHJvcHMpO1xuXG5cdFx0Ly8gTWFrZSBzdXJlIGB0ZXh0YCBpcyBkZWZpbmVkLlxuXHRcdGlmICghKFwidGV4dFwiIGluIHRoaXMpKSB0aGlzLnRleHQgPSBcIlwiO1xuXHRcdGlmICghKFwic3RhcnRJbmRleFwiIGluIHRoaXMpKSB0aGlzLnN0YXJ0SW5kZXggPSAwO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGFuIGltbXV0YWJsZSBjbG9uZSBvZiB0aGUgc3RyZWFtLlxuXHRjbG9uZShwcm9wcykge1xuXHRcdGxldCBjbG9uZSA9IG5ldyBUZXh0U3RyZWFtKHRoaXMpO1xuXHRcdE9iamVjdC5hc3NpZ24oY2xvbmUsIHByb3BzKTtcblx0XHRyZXR1cm4gY2xvbmU7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNlZCB0byBuZXcgc3RhcnRJbmRleC5cblx0YWR2YW5jZVRvKHN0YXJ0SW5kZXgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXggfSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNpbmcgc3RhcnRJbmRleCBCWSBgbGVuZ3RoYFxuXHRhZHZhbmNlQnkobGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG5cdH1cblxuLy8gXHQvLyBSZXR1cm4gY2xvbmUgb2YgdGhpcyBzdHJlYW0gd2l0aCBlbmRJbmRleCBzZXQgdG8gc3RhcnQgKyBgbGVuZ3RoYFxuLy8gXHRlbmRBZnRlcihsZW5ndGgpIHtcbi8vIFx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IGVuZEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG4vLyBcdH1cblxuLy9cbi8vICMjIE1hdGNoaW5nXG4vL1xuXHQvLyBNYXRjaCBgcGF0dGVybmAgYXMgcmVnZXggYXQgaGVhZCBvZiBzdHJlYW0uXG5cdC8vIE5PVEU6IHJlZ2V4ZXMgc2hvdWxkIHN0YXJ0IHdpdGggYF5gIVxuXHQvLyBSZXR1cm5zIG1hdGNoIG9yIHVuZGVmaW5lZC5cblx0bWF0Y2gocGF0dGVybikge1xuXHRcdGlmICghKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBUZXh0U3RyZWFtLm1hdGNoKCR7cGF0dGVybn0pOiBleHBlY3RlZCBSZWdFeHBgKTtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQubWF0Y2gocGF0dGVybik7XG5cdH1cblxuXHRzdGFydHNXaXRoKHN0cmluZykge1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5zdGFydHNXaXRoKHN0cmluZyk7XG5cdH1cblxuXG4vL1xuLy8gIyMgUmVmbGVjdGlvblxuLy9cblx0Ly8gUmV0dXJuIHRleHQgb2Ygc3RyaW5nIHN0YXJ0aW5nIGF0IG91ciBgc3RhcnRJbmRleGBcblx0Z2V0IGhlYWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMucmFuZ2UoKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIHJhbmdlIG9mIHRoZSBzdHJpbmcgZnJvbSBgc3RhcnRJbmRleGAgdG8gYGVuZEluZGV4YCBOT04taW5jbHVzaXZlLlxuXHRyYW5nZShzdGFydEluZGV4ID0gdGhpcy5zdGFydEluZGV4LCBlbmRJbmRleCA9IHRoaXMudGV4dC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0LnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmRJbmRleCk7XG5cdH1cblxuXHQvLyBMZW5ndGggb2YgdGhlIHN0cmVhbS5cblx0Z2V0IGxlbmd0aCgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0Lmxlbmd0aDtcblx0fVxuXG5cdC8vIEFyZSB3ZSBhdCB0aGUgZW5kIG9mIHRoZSBzdHJlYW0/XG5cdGdldCBpc0VtcHR5KCkge1xuXHRcdHJldHVybiB0aGlzLnN0YXJ0SW5kZXggPT09IHRoaXMubGVuZ3RoO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dFxuXHR9O1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1RleHRTdHJlYW0uanMiLCJpbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gbG9hZCBzdGFuZGFyZCBydWxlcyBmaWxlcyBoZXJlXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbnVtYmVyc1wiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vYXNzaWdubWVudFwiO1xuaW1wb3J0IFwiLi9jbGFzc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBUT0RPOiB7cHJvcGVydHktZXhwcmVzc2lvbn0gYWxzbyB3b3Jrcy4uLiB7YXNzaWduYWJsZS1leHByZXNzaW9ufSA/Pz9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsIFwie2lkZW50aWZpZXJ9ID0ge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdGxldCB2YWx1ZSA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdC8vIFRPRE86IGRlY2xhcmUgaWRlbnRpZmllciBpZiBub3QgaW4gc2NvcGUsIGV0Y1xuXHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSA9ICR7dmFsdWV9YDtcblx0fVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvYXNzaWdubWVudC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVmaW5pbmcgY2xhc3NlcyAoa25vd24gYXMgYHR5cGVzYClcbi8vXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy9wYXJzZXIuYWRkRXhwcmVzc2lvbihcInByb3BlcnR5LWV4cHJlc3Npb25cIiwgXCJ7cHJvcGVydHk6cHJvcGVydHktbmFtZX0rIHtleHByZXNzaW9ufVwiLCB7XG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcInByb3BlcnR5LWV4cHJlc3Npb25cIiwgXCIocHJvcGVydGllczp0aGUge2lkZW50aWZpZXJ9IG9mKSsge2V4cHJlc3Npb259XCIsIHtcbiBcdGdhdGhlckFyZ3VtZW50cygpIHtcblx0XHRsZXQgYXJncyA9IFJ1bGUuRXhwcmVzc2lvbi5nYXRoZXJBcmd1bWVudHModGhpcyk7XG5cdFx0Ly8gdHJhbnNmb3JtIHByb3BlcnRpZXMgYW5kIHJldmVyc2Ugb3JkZXJcblx0XHRhcmdzLnByb3BlcnRpZXMgPSBhcmdzLnByb3BlcnRpZXMubWFwKCBzZXF1ZW5jZSA9PiBzZXF1ZW5jZS5pZGVudGlmaWVyICkucmV2ZXJzZSgpO1xuXHRcdHJldHVybiBhcmdzO1xuIFx0fSxcblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCB0aGluZyA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdGxldCBwcm9wZXJ0aWVzID0gYXJncy5wcm9wZXJ0aWVzLm1hcCggaWRlbnRpZmllciA9PiBpZGVudGlmaWVyLnRvU291cmNlKCkgKS5qb2luKFwiLlwiKTtcblx0XHRyZXR1cm4gYHNwZWxsLmdldCgke3RoaW5nfSwgJyR7cHJvcGVydGllc30nKWA7XG5cdH1cbn0pO1xuXG5cblxucGFyc2VyLmFkZFN5bnRheChcInNjb3BlLW1vZGlmaWVyXCIsIFwiKHNjb3BlOmdsb2JhbHxjb25zdGFudHxzaGFyZWQpXCIpO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmUtcHJvcGVydHlcIixcblx0XCJ7c2NvcGUtbW9kaWZpZXJ9PyB7YXNzaWdubWVudH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5hc3NpZ25tZW50LmlkZW50aWZpZXIudG9Tb3VyY2UoKTtcblx0XHRcdGxldCB2YWx1ZSA9IGFyZ3MuYXNzaWdubWVudC5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgYXNzaWdubWVudCA9IGAke2lkZW50aWZpZXJ9ID0gJHt2YWx1ZX1gO1xuXG5cdFx0XHR2YXIgc2NvcGUgPSBhcmdzLnNjb3BlID8gYXJncy5zY29wZS50b1NvdXJjZSgpIDogXCJsb2NhbFwiO1xuXHRcdFx0c3dpdGNoIChzY29wZSkge1xuXHRcdFx0XHRjYXNlIFwiZ2xvYmFsXCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBnbG9iYWwuJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcImNvbnN0YW50XCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBjb25zdCAke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwic2hhcmVkXCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBzdGF0aWMgJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRyZXR1cm4gYXNzaWdubWVudDtcblx0XHRcdH1cblx0XHR9XG5cdH1cbik7XG5cbi8vIFRPRE86IHdhcm4gb24gaW52YWxpZCBzZXQ/ICBzaGFyZWQ/ICB1bmRlZmluZWQ/IHNvbWV0aGluZyBvdGhlciB0aGFuIHRoZSBmaXJzdCB2YWx1ZSBhcyBkZWZhdWx0P1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlLXByb3BlcnR5LWFzLW9uZS1vZlwiLFxuXHRcIntpZGVudGlmaWVyfSBhcyBvbmUgb2Yge2xpc3Q6bGl0ZXJhbC1saXN0fVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGlkZW50aWZpZXIgPSBhcmdzLmlkZW50aWZpZXIudG9Tb3VyY2UoKTtcblx0XHRcdGxldCBwbHVyYWwgPSAoaWRlbnRpZmllciArIFwiX1ZBTFVFU1wiKS50b1VwcGVyQ2FzZSgpO1xuXHRcdFx0bGV0IGxpc3QgPSBhcmdzLmxpc3QubGlzdDtcblx0XHRcdGxldCB2YWx1ZXMgPSBsaXN0LnRvU291cmNlKCk7XG5cdFx0XHRsZXQgZmlyc3QgPSBsaXN0LnJlc3VsdHNbMF07XG5cdFx0XHRsZXQgZmlyc3RWYWx1ZSA9IGZpcnN0ID8gZmlyc3QudG9Tb3VyY2UoKSA6IFwidW5kZWZpbmVkXCI7XG5cblx0XHRcdHJldHVybiBgc3RhdGljICR7cGx1cmFsfSA9ICR7dmFsdWVzfTtcXG5gXG5cdFx0XHRcdCArIGBnZXQgJHtpZGVudGlmaWVyfSB7IHJldHVybiAoXCJfXyR7aWRlbnRpZmllcn1cIiBpbiB0aGlzID8gdGhpcy5fXyR7aWRlbnRpZmllcn0gOiAke2ZpcnN0VmFsdWV9KSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuY29uc3RydWN0b3IuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9XFxuYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9jbGFzcy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVhbGluZyB3aXRoIG51bWJlcnNcbi8vXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy8gTnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZy5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFwiaW5kZXgtZXhwcmVzc2lvblwiLCBcIml0ZW0ge251bWJlcjppbnRlZ2VyfSBvZiB7ZXhwcmVzc2lvbn1cIiwge1xuXHR0b1NvdXJjZSgpIHtcblx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0bGV0IG51bWJlciA9IGFyZ3MubnVtYmVyLnRvU291cmNlKCk7XG5cdFx0bGV0IGV4cHJlc3Npb24gPSBhcmdzLmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtudW1iZXJ9KWA7XG5cdH1cbn0pO1xuXG4vLyBFbmdsaXNoIHdvcmRzIHVzZWQgZm9yIHBvc2l0aW9uIG9mIHNvbWV0aGluZyBpbiBhIGxpc3QuXG4vLyBUT0RPOiBgc2V2ZW50eS1zZXZlbnRoYCwgYHRoaXJkLXRvLWxhc3RgLi4uXG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcIihmaXJzdHxzZWNvbmR8dGhpcmR8Zm91cnRofGZpZnRofHNpeHRofHNldmVudGh8ZWlnaHRofG5pbnRofHRlbnRofHBlbnVsdGltYXRlfGxhc3R8ZmluYWwpXCIsIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCBvcmRpbmFsID0gdGhpcy5tYXRjaGVkLnRvU291cmNlKCk7XG5cdFx0c3dpdGNoIChvcmRpbmFsKSB7XG5cdFx0XHRjYXNlIFwiZmlyc3RcIjpcdFx0cmV0dXJuIDE7XG5cdFx0XHRjYXNlIFwic2Vjb25kXCI6XHRcdHJldHVybiAyO1xuXHRcdFx0Y2FzZSBcInRoaXJkXCI6XHRcdHJldHVybiAzO1xuXHRcdFx0Y2FzZSBcImZvdXJ0aFwiOlx0XHRyZXR1cm4gNDtcblx0XHRcdGNhc2UgXCJmaWZ0aFwiOlx0XHRyZXR1cm4gNTtcblx0XHRcdGNhc2UgXCJzaXh0aFwiOlx0XHRyZXR1cm4gNjtcblx0XHRcdGNhc2UgXCJzZXZlbnRoXCI6XHRcdHJldHVybiA3O1xuXHRcdFx0Y2FzZSBcImVpZ2h0aFwiOlx0XHRyZXR1cm4gODtcblx0XHRcdGNhc2UgXCJuaW50aFwiOlx0XHRyZXR1cm4gOTtcblx0XHRcdGNhc2UgXCJ0ZW50aFwiOlx0XHRyZXR1cm4gMTA7XG5cdFx0XHRjYXNlIFwicGVudWx0aW1hdGVcIjpcdHJldHVybiAtMjtcblx0XHRcdGNhc2UgXCJsYXN0XCI6XHRcdHJldHVybiAtMTtcblx0XHRcdGNhc2UgXCJmaW5hbFwiOlx0XHRyZXR1cm4gLTE7XG5cdFx0fVxuXHR9XG59KTtcblxuLy8gQWx0ZXJuYXRpdmUgZm9ybSBmb3IgbnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZy5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFwiaW5kZXgtZXhwcmVzc2lvblwiLCBcInRoZSB7b3JkaW5hbH0gaXRlbSBvZiB7ZXhwcmVzc2lvbn1cIiwge1xuXHR0b1NvdXJjZSgpIHtcblx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0bGV0IG9yZGluYWwgPSBhcmdzLm9yZGluYWwudG9Tb3VyY2UoKTtcblx0XHRsZXQgZXhwcmVzc2lvbiA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke29yZGluYWx9KWA7XG5cdH1cbn0pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvbnVtYmVycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgaW5maXggYW5kIHByZWZpeCBvcGVyYXRvcnMuXG4vL1xuXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyMjIEluZml4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPiB7cmhzfWAsIGVnOiBgYSBpcyAxYFxuLy8gTk9URTogYG9wZXJhdG9yLnRyYW5zZm9ybWVyYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgdHdvIGFyZ3VtZW50cyAoYGxoc2AgYW5kIGByaHNgKSBpbnRvIG91dHB1dC5cblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJhbmRcIiwgXCJhbmRcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSAmJiAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJvclwiLCBcIm9yXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybiBgKCR7YX0gfHwgJHtifSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc1wiLCBcImlzXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybiBgKCR7YX0gPT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXMtbm90XCIsIFwiaXMgbm90XCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybiBgKCR7YX0gIT0gJHtifSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1leGFjdGx5XCIsIFwiaXMgZXhhY3RseVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ID09PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1ub3QtZXhhY3RseVwiLCBcImlzIG5vdCBleGFjdGx5XCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybiBgKCR7YX0gIT09ICR7Yn0pYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzT2ZUeXBlKHRoaW5nLCB0eXBlKWBcbi8vVE9ETzogYGlzIHNhbWUgdHlwZSBhc2AgP1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy10eXBlLW9mXCIsIFtcImlzIGFcIiwgXCJpcyBhblwiXSwgeyB0cmFuc2Zvcm1lcih0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdC10eXBlLW9mXCIsIFtcImlzIG5vdCBhXCIsIFwiaXMgbm90IGFuXCJdLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzSW4odGhpbmcsIGNvbGxlY3Rpb24pYFxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1pblwiLCBbXCJpcyBpblwiLCBcImlzIG9uZSBvZlwiXSwgeyB0cmFuc2Zvcm1lcih0aGluZywgbGlzdExpa2VUaGluZykgeyByZXR1cm4gYHNwZWxsLmlzSW4oJHt0aGluZ30sICR7bGlzdExpa2VUaGluZ30pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdC1pblwiLCBbXCJpcyBub3QgaW5cIiwgXCJpcyBub3Qgb25lIG9mXCJdLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCBsaXN0TGlrZVRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmlzSW4oJHt0aGluZ30sICR7bGlzdExpa2VUaGluZ30pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImluY2x1ZGVzXCIsIFtcImluY2x1ZGVzXCIsIFwiY29udGFpbnNcIl0sIHsgdHJhbnNmb3JtZXIobGlzdExpa2VUaGluZywgdGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5pc0luKCR7dGhpbmd9LCAke2xpc3RMaWtlVGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJkb2VzbnQtaW5jbHVkZVwiLCBbXCJkb2VzIG5vdCBpbmNsdWRlXCIsIFwiZG9lc250IGluY2x1ZGVcIiwgXCJkb2VzIG5vdCBjb250YWluXCIsIFwiZG9lc250IGNvbnRhaW5cIl0sIHsgdHJhbnNmb3JtZXIobGlzdExpa2VUaGluZywgdGhpbmcpIHsgcmV0dXJuIGAhc3BlbGwuaXNJbigke3RoaW5nfSwgJHtsaXN0TGlrZVRoaW5nfSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndFwiLCBbXCI+XCIsIFwiaXMgZ3JlYXRlciB0aGFuXCJdLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndGVcIiwgW1wiPj1cIiwgXCJpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG9cIl0sIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA+PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJsdFwiLCBbXCI8XCIsIFwiaXMgbGVzcyB0aGFuXCJdLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJsdGVcIiwgW1wiPD1cIiwgXCJpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG9cIl0sIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfX0pO1xuXG4vL1RPRE86ICBjYW4ndCBhZGQgYCtgIGFzIGEgcnVsZSwgZml4IHRoaXMgdGhlbiBhZGQgdGhlc2VcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwicGx1c1wiLCBbXCJcXFxcK1wiLCBcInBsdXNcIl0sIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSArICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcIm1pbnVzXCIsIFtcIi1cIiwgXCJtaW51c1wiXSwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuYCgke2F9IC0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwidGltZXNcIiwgW1wiXFxcXCpcIiwgXCJ0aW1lc1wiXSwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuYCgke2F9ICogJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZGl2aWRlZC1ieVwiLCBbXCIvXCIsIFwiZGl2aWRlZCBieVwiXSwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuYCgke2F9IC8gJHtifSlgIH19KTtcblxuLy9UT0RPOiAgYCs9YCBldGM/ICBvdGhlciBtYXRoIGZ1bmN0aW9ucz9cblxuLy8gQWRkIGluZml4IG9wZXJhdG9ycyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdFxuLy8gSE1NLi4uIGZvbGtzIG1pZ2h0IGNvbXBsYWluIGFib3V0IG5vdCBiZWluZyBhYmxlIHRvIHVzZSBcImFcIiBhcyBhIHNpbmdsZSB2YXJpYWJsZSBuYW1lLi4uXG4vLyBUT0RPOiBtYWtlIHRoaXMgcGFydCBvZiBgYWRkSW5maXhPcGVyYXRvcmAgPz8/XG4vLyBURVNUTUVcbnBhcnNlci5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFuZFwiLCBcIm9yXCIsIFwiaXNcIiwgXCJub3RcIiwgXCJleGFjdGx5XCIsXG5cdFwiYVwiLCBcImFuXCIsIFwib25lXCIsIFwiZ3JlYXRlclwiLCBcImxlc3NcIiwgXCJlcXVhbFwiLFxuXHRcInBsdXNcIiwgXCJtaW51c1wiLCBcInRpbWVzXCIsIFwiZGl2aWRlZFwiXG4pO1xuXG5wYXJzZXIuYWRkU3ludGF4KFxuXHRcImluZml4LW9wZXJhdG9yLWV4cHJlc3Npb25cIixcblx0XCJ7bGhzOmV4cHJlc3Npb259IHtvcGVyYXRvcjppbmZpeC1vcGVyYXRvcn0ge3JoczpleHByZXNzaW9ufVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGxocyA9IGFyZ3MubGhzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHJocyA9IGFyZ3MucmhzLnRvU291cmNlKGNvbnRleHQpO1xuXG5cdFx0XHRsZXQgdHJhbnNmb3JtZXIgPSBhcmdzLm9wZXJhdG9yLm1hdGNoZWQudHJhbnNmb3JtZXI7XG5cdFx0XHRyZXR1cm4gdHJhbnNmb3JtZXIobGhzLCByaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8jIyBQb3N0aWZ4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPmAsIGUuZy4gYGEgaXMgZGVmaW5lZGBcbi8vIE5PVEU6IGBvcGVyYXRvci50cmFuc2Zvcm1lcmAgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBvdXRwdXQuXG5cbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpcy1kZWZpbmVkXCIsIFwiaXMgZGVmaW5lZFwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSAhPT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtbm90LWRlZmluZWRcIiwgXCJpcyBub3QgZGVmaW5lZFwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtdW5kZWZpbmVkXCIsIFwiaXMgdW5kZWZpbmVkXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtZW1wdHlcIiwgXCJpcyBlbXB0eVwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpcy1ub3QtZW1wdHlcIiwgXCJpcyBub3QgZW1wdHlcIiwgeyB0cmFuc2Zvcm1lcih0aGluZykgeyByZXR1cm4gYCFzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfX0pO1xuXG4vLyBBZGQgcG9zdGZpeCBvcGVyYXRvcnMgdG8gaWRlbnRpZmllciBibGFja2xpc3Rcbi8vIFRFU1RNRVxucGFyc2VyLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiZGVmaW5lZFwiLCBcInVuZGVmaW5lZFwiLCBcImVtcHR5XCJcbik7XG5cbnBhcnNlci5hZGRTeW50YXgoXG5cdFwicG9zdGZpeC1vcGVyYXRvci1leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeC1vcGVyYXRvcn1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBsaHMgPSBhcmdzLmxocy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCB0cmFuc2Zvcm1lciA9IGFyZ3Mub3BlcmF0b3IubWF0Y2hlZC50cmFuc2Zvcm1lcjtcblx0XHRcdHJldHVybiB0cmFuc2Zvcm1lcihsaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG5wYXJzZXIuYWRkU3ludGF4KFwib3BlcmF0b3ItZXhwcmVzc2lvblwiLCBcIihleHByZXNzaW9uOntwb3N0Zml4LW9wZXJhdG9yLWV4cHJlc3Npb259fHtpbmZpeC1vcGVyYXRvci1leHByZXNzaW9ufSlcIik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIl0sInNvdXJjZVJvb3QiOiIifQ==