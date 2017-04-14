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

		// Set up standard rule classes as alternates
		this.addRule("statement", new _Rule2.default.Alternatives());
		this.addRule("expression", new _Rule2.default.Alternatives());
		this.addRule("infix-operator", new _Rule2.default.Alternatives());
		this.addRule("postfix-operator", new _Rule2.default.Alternatives());
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
					existing = new _Rule2.default.Alternatives({ name: existing.name, rules: [existing] });
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
//	`rule.keyword` is the keyword string to match.
Rule.Keyword = function (_Rule$Pattern) {
	_inherits(Keyword, _Rule$Pattern);

	function Keyword(properties) {
		_classCallCheck(this, Keyword);

		// create pattern which matches at word boundary
		var _this4 = _possibleConstructorReturn(this, (Keyword.__proto__ || Object.getPrototypeOf(Keyword)).call(this, properties));

		if (!_this4.pattern) {
			if (!_this4.keyword) throw new TypeError("Expected keyword property");
			_this4.pattern = new RegExp('^' + _this4.keyword + '\\b');
		}
		return _this4;
	}

	_createClass(Keyword, [{
		key: 'toString',
		value: function toString() {
			return '' + this.keyword + (this.optional ? '?' : '');
		}
	}]);

	return Keyword;
}(Rule.Pattern);

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
			var rule = this.rule instanceof Rule.Sequence ? '(' + this.rule + ')' : '' + this.rule;
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
					last.string += rule.string;
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
			rule = new _Rule2.default.Keyword({ keyword: string });
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
Object.assign(_Parser2.default.prototype, {

	// Parse a `ruleSyntax` rule and add it to our list of rules.
	// Returns the new rule.
	// Logs parsing errors but allows things to continue.
	addSyntax: function addSyntax(name, ruleSyntax, properties) {
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
	},
	addStatement: function addStatement(name, ruleSyntax, properties) {
		var rule = this.addSyntax(name, ruleSyntax, properties, _Rule2.default.Statement);
		if (rule) return this.addRule("statement", rule);
	},
	addExpression: function addExpression(name, ruleSyntax, properties) {
		var rule = this.addSyntax(name, ruleSyntax, properties, _Rule2.default.Expression);
		if (rule) return this.addRule("expression", rule);
	},


	// Add infix operator, such as "a or b"
	addInfixOperator: function addInfixOperator(name, ruleSyntax, properties) {
		var rule = this.addSyntax(name, ruleSyntax, properties);
		if (rule) {
			if (!rule.transformer) {
				throw new TypeError("Expected infix operator rule '" + name + "' to specify 'transformer' function");
			}
			return this.addRule("infix-operator", rule);
		}
	},


	// Add postfix operator, such as "a is defined"
	addPostfixOperator: function addPostfixOperator(name, ruleSyntax, properties) {
		var rule = this.addSyntax(name, ruleSyntax, properties);
		if (rule) {
			if (!rule.transformer) {
				throw new TypeError("Expected postfix operator rule '" + name + "' to specify 'transformer' function");
			}
			return this.addRule("postfix-operator", rule);
		}
	}
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
_parser2.default.addInfixOperator("is-type-of", "is (a|an)", {
	transformer: function transformer(thing, type) {
		return "spell.isOfType(" + thing + ", '" + type + "')";
	}
});
_parser2.default.addInfixOperator("is-not-type-of", "is not (a|an)", {
	transformer: function transformer(thing, type) {
		return "!spell.isOfType(" + thing + ", '" + type + "')";
	}
});

//TODO: `spell.isIn(thing, collection)`
_parser2.default.addInfixOperator("is-in", "is in", {
	transformer: function transformer(thing, listy) {
		return "spell.isIn(" + thing + ", " + listy + ")";
	}
});
_parser2.default.addInfixOperator("is-one-of", "is one of", {
	transformer: function transformer(thing, listy) {
		return "spell.isIn(" + thing + ", " + listy + ")";
	}
});
_parser2.default.addInfixOperator("is-not-in", "is not in", {
	transformer: function transformer(thing, listy) {
		return "!spell.isIn(" + thing + ", " + listy + ")";
	}
});
_parser2.default.addInfixOperator("is-not-one-of", "is not one of", {
	transformer: function transformer(thing, listy) {
		return "!spell.isIn(" + thing + ", " + listy + ")";
	}
});

_parser2.default.addInfixOperator("gt", "(>|is greater than)", {
	transformer: function transformer(a, b) {
		return "(" + a + " > " + b + ")";
	}
});
_parser2.default.addInfixOperator("gte", "(>=|is greater than or equal to)", {
	transformer: function transformer(a, b) {
		return "(" + a + " >= " + b + ")";
	}
});
_parser2.default.addInfixOperator("lt", "(<|is less than)", {
	transformer: function transformer(a, b) {
		return "(" + a + " < " + b + ")";
	}
});
_parser2.default.addInfixOperator("lte", "(<=|is less than or equal to)", {
	transformer: function transformer(a, b) {
		return "(" + a + " <= " + b + ")";
	}
});

//TODO:  can't add `+` as a rule, fix this then add these
_parser2.default.addInfixOperator("plus", "(\\+|plus)", {
	transformer: function transformer(a, b) {
		return "(" + a + " + " + b + ")";
	}
});
_parser2.default.addInfixOperator("minus", "(-|minus)", {
	transformer: function transformer(a, b) {
		return "(" + a + " - " + b + ")";
	}
});
_parser2.default.addInfixOperator("times", "(\\*|times)", {
	transformer: function transformer(a, b) {
		return "(" + a + " * " + b + ")";
	}
});
_parser2.default.addInfixOperator("divided-by", "(/|divided by)", {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgMmI5MTU1YmY4YWEzNWNhYTdmYTMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZVN5bnRheC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbInBhcnNlciIsIndpbmRvdyIsImNvbnNvbGUiLCJncm91cCIsImxvZyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInJ1bGVzIiwiY3JlYXRlIiwiYWRkUnVsZSIsIkFsdGVybmF0aXZlcyIsIm5hbWUiLCJzdHJlYW0iLCJydWxlIiwiZ2V0UnVsZSIsIlN5bnRheEVycm9yIiwiZWF0V2hpdGVzcGFjZSIsInBhcnNlIiwicmVzdWx0Iiwid2hpdGVzcGFjZSIsIm5leHQiLCJleGlzdGluZyIsImRlYnVnIiwicnVsZU5hbWUiLCJwYXR0ZXJuIiwiUGF0dGVybiIsInRva2VucyIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsInN0YXJ0SW5kZXgiLCJuZXN0aW5nIiwibmVzdGVkIiwiZW5kSW5kZXgiLCJsYXN0SW5kZXgiLCJsZW5ndGgiLCJ0b2tlbiIsInNsaWNlIiwiREVCVUciLCJSdWxlIiwicHJvcHMiLCJjbG9uZSIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsImNvbnN0cnVjdG9yIiwiZ2F0aGVyQXJndW1lbnRzIiwibWF0Y2hlZCIsImFyZ3VtZW50IiwiU3RyaW5nIiwic3RhcnRzV2l0aCIsInN0cmluZyIsIm9wdGlvbmFsIiwibWF0Y2giLCJibGFja2xpc3QiLCJ3b3JkcyIsImZvckVhY2giLCJ3b3JkIiwiS2V5d29yZCIsImtleXdvcmQiLCJSZWdFeHAiLCJTdWJydWxlIiwiTmVzdGVkIiwiU2VxdWVuY2UiLCJyZXN1bHRzIiwicHVzaCIsImpvaW4iLCJzZXF1ZW5jZSIsImFyZ3MiLCJhcmdOYW1lIiwiX2FyZyIsIkFycmF5IiwiaXNBcnJheSIsIkV4cHJlc3Npb24iLCJTdGF0ZW1lbnQiLCJiZXN0TWF0Y2giLCJjb250ZXh0IiwidG9Tb3VyY2UiLCJSZXBlYXQiLCJyZXBlYXQiLCJtYXAiLCJMaXN0IiwiaXRlbSIsImRlbGltaXRlciIsImluZGV4IiwicGFyc2VSdWxlU3ludGF4Iiwic3ludGF4IiwiU2VxdWVuY2VDb25zdHJ1Y3RvciIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInBhcnNlUnVsZVN5bnRheF90b2tlbnMiLCJTWU5UQVhfRVhQUkVTU0lPTiIsInBhcnNlUnVsZVN5bnRheF90b2tlbiIsImxhc3QiLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zdHJpbmciLCJwYXJzZVJ1bGVTeW50YXhfc3VicnVsZSIsInBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyIsInBhcnNlUnVsZVN5bnRheF9saXN0IiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsInN1YnN0ciIsInRvU3RyaW5nIiwiZmluZE5lc3RlZFRva2VucyIsImFsdGVybmF0ZXMiLCJncm91cEFsdGVybmF0ZXMiLCJjdXJyZW50IiwiaSIsImNvbmNhdCIsInN5bWJvbCIsInByb3RvdHlwZSIsImFkZFN5bnRheCIsInJ1bGVTeW50YXgiLCJlIiwiZXJyb3IiLCJhZGRTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiYWRkSW5maXhPcGVyYXRvciIsInRyYW5zZm9ybWVyIiwiYWRkUG9zdGZpeE9wZXJhdG9yIiwiV2hpdGVzcGFjZSIsIklkZW50aWZpZXIiLCJpZGVudGlmaWVyIiwicmVwbGFjZSIsImFkZFRvQmxhY2tsaXN0IiwiVHlwZSIsInR5cGUiLCJOdW1iZXIiLCJudW1iZXIiLCJwYXJzZUZsb2F0IiwiSW50ZWdlciIsInBhcnNlSW50IiwiVGV4dCIsInRleHQiLCJCb29sZWFuIiwiYm9vbCIsImxpc3QiLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJoZWFkIiwic3Vic3RyaW5nIiwicmFuZ2UiLCJ2YWx1ZSIsImV4cHJlc3Npb24iLCJyZXZlcnNlIiwidGhpbmciLCJhc3NpZ25tZW50Iiwic2NvcGUiLCJwbHVyYWwiLCJ0b1VwcGVyQ2FzZSIsInZhbHVlcyIsImZpcnN0IiwiZmlyc3RWYWx1ZSIsIm9yZGluYWwiLCJhIiwiYiIsImxpc3R5IiwibGhzIiwicmhzIiwib3BlcmF0b3IiXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxtREFBMkMsY0FBYzs7QUFFekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7OztBQzdEQTs7OztBQUNBOzs7Ozs7QUFFQTtBQU5BO0FBQ0E7QUFDQTtBQUtBLElBQU1BLFNBQVMsc0JBQWY7a0JBQ2VBLE07O0FB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a0M7QUFBekQsQ0FBbEQ7QUFDQSxpQkFBTzFCLGtCQUFQLENBQTBCLGNBQTFCLEVBQTBDLGNBQTFDLEVBQTBEO0FBQUVELFlBQUYsdUJBQWMyQixLQUFkLEVBQXFCO0FBQUUsNkJBQXlCQSxLQUF6QjtBQUFtQztBQUExRCxDQUExRDs7QUFFQTtBQUNBO0FBQ0EsaUJBQU92QixVQUFQLENBQWtCRSxjQUFsQixDQUNDLFNBREQsRUFDWSxXQURaLEVBQ3lCLE9BRHpCOztBQUlBLGlCQUFPYixTQUFQLENBQ0MsNkJBREQsRUFFQyw4Q0FGRCxFQUdDO0FBQ0NqQyxTQURELG9CQUNVRCxPQURWLEVBQ21CO0FBQ2pCLE1BQUlSLE9BQU8sS0FBS3RCLGVBQUwsRUFBWDtBQUNBLE1BQUk4RyxNQUFNeEYsS0FBS3dGLEdBQUwsQ0FBUy9FLFFBQVQsQ0FBa0JELE9BQWxCLENBQVY7QUFDQSxNQUFJeUMsY0FBY2pELEtBQUswRixRQUFMLENBQWMvRyxPQUFkLENBQXNCc0UsV0FBeEM7QUFDQSxTQUFPQSxZQUFZdUMsR0FBWixDQUFQO0FBQ0E7QUFORixDQUhEOztBQWNBO0FBQ0EsaUJBQU85QyxTQUFQLENBQWlCLHFCQUFqQixFQUF3Qyx3RUFBeEMsRTs7Ozs7Ozs7Ozs7OztBQ3RHQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7Ozs7O0FBRUE7QUFDQSxJQUFJLE9BQU8vRyxNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQ2xDQSxRQUFPeUksVUFBUDtBQUNBekksUUFBT0ssTUFBUDtBQUNBTCxRQUFPd0MsSUFBUDtBQUNBeEMsUUFBT0QsTUFBUDtBQUNBOztrQkFFYztBQUNkMEksaUNBRGMsRUFDRnBJLHdCQURFLEVBQ01tQyxvQkFETixFQUNZekM7QUFEWixDIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMTEpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDJiOTE1NWJmOGFhMzVjYWE3ZmEzIiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCIvLyBTcGVsbCBcIkVuZ2xpc2hcIiBwYXJzZXIgc3RyYXdtYW5cblxuLy8gVE9ETzpcdGNvbnNvbGlkYXRlIHN1YnNlcXVlbnQgbGl0ZXJhbCB3b3JkcyAvIHN0cmluZ3MgaW50byBhIHNpbmdsZSByZWdleD9cbi8vIFRPRE86XHRgdGVzdGAgZnVuY3Rpb24gZm9yIHF1aWNrIG5vLWdvb2QgaGl0IG9uIGB7YX0gYmxhaCBibGFoIHtifWA/XG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcms6ICAgYHtleHByZXNzaW9ufSBpcyB7ZXhwcmVzc2lvbn1gXG4vLyBUT0RPOlx0Y3VzdG9tIFN5bnRheEVycm9yIGV0YyB3aGljaCB1bmRlcnN0YW5kIHN0cmVhbXNcbi8vIFRPRE86XHRicmVhayBgZmlsZWAgaW50byBsaW5lcyBhbmQgcHJvY2VzcyBlYWNoIChpbmNsLiBzdWJzdHIvbWF0Y2ggbm90IGdvaW5nIGJleW9uZCB0aGUgZW5kKVxuLy8gVE9ETzpcdG5lc3RpbmcgLS0gaXMgdGhpcyBqdXN0IGluZGVudCA9IFwiYWRkIGJsb2NrIHNjb3BlXCJcbi8vIFRPRE86XHRwcm9tb3Rpb24gcGF0dGVybiBmb3IgZ2F0aGVyIGFyZ3VtZW50cyAoZWc6IGxpdGVyYWwtbGlzdCkgPz8/XG4vLyBUT0RPOlx0V2hhdCBkb2VzIHN5bnRheCB0cmVlIGxvb2sgbGlrZT8gIEhvdyBkbyB3ZSBleHRyYWN0IG1lYW5pbmcgb3V0IG9mIHRoZSBuZXN0P1xuLy8gVE9ETzpcdFJlY3ljbGUgd29yZC9zdHJpbmcvcGF0dGVybiBydWxlcyB0byBtb3JlIGVhc2lseSBzZWUgY29tbW9uYWxpdHkuLi5cbi8vIFRPRE86XHRQYXNzIGBjb250ZXh0YCB0byB0b1NvdXJjZSgpLCBhZGQgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYGNsYXNzYCwgdmFyaWFibGVzIGFuZCBjb2RlIHRvIGBtZXRob2RgLCBgZ2xvYmFsYCBzdHVmZiBldGNcblxuaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ2xvbmUgcnVsZXMsIHN0YXJ0aW5nIHdpdGggYSBjb21wbGV0ZWx5IGVtcHR5IG1hcCBpZiBub3QgZGVmaW5lZCAobm8gc3RhbmRhcmQgb2JqZWN0IGtleXMpXG5cdFx0dGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5ydWxlcyB8fCBudWxsKTtcblxuXHRcdC8vIFNldCB1cCBzdGFuZGFyZCBydWxlIGNsYXNzZXMgYXMgYWx0ZXJuYXRlc1xuXHRcdHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoKSk7XG5cdFx0dGhpcy5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoKSk7XG5cdFx0dGhpcy5hZGRSdWxlKFwiaW5maXgtb3BlcmF0b3JcIiwgbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKCkpO1xuXHRcdHRoaXMuYWRkUnVsZShcInBvc3RmaXgtb3BlcmF0b3JcIiwgbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKCkpO1xuXHR9XG5cblx0Z2V0UnVsZShuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXNbbmFtZV07XG5cdH1cblxuLy8jIyMgUGFyc2luZ1xuXG5cdC8vIFBhcnNlIGBuYW1lYGQgcnVsZSBhdCBoZWFkIG9mIGBzdHJlYW1gLlxuXHQvLyBIYW5kbGVzIG9wdGlvbmFsIGFuZCByZXBlYXRpbmcgcnVsZXMgYXMgd2VsbCBhcyBlYXRpbmcgd2hpdGVzcGFjZS5cblx0Ly8gUmV0dXJucyByZXN1bHQgb2YgcGFyc2UuXG5cdHBhcnNlKG5hbWUsIHN0cmVhbSkge1xuXHRcdGlmICh0eXBlb2Ygc3RyZWFtID09PSBcInN0cmluZ1wiKSBzdHJlYW0gPSBuZXcgVGV4dFN0cmVhbShzdHJlYW0pO1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBSdWxlICR7bmFtZX0gbm90IHVuZGVyc3Rvb2RgLCBuYW1lLCBzdHJlYW0pO1xuXHRcdHN0cmVhbSA9IHRoaXMuZWF0V2hpdGVzcGFjZShzdHJlYW0pO1xuXHRcdHJldHVybiBydWxlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdH1cblxuXHQvLyBFYXQgd2hpdGVzcGFjZSAoYWNjb3JkaW5nIHRvIGBydWxlcy53aGl0ZXNwYWNlYCkgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG5ldyBzdHJlYW0gaWYgd2UgbWF0Y2hlZCB3aGl0ZXNwYWNlLCBvdGhlcndpc2UgdGhlIHNhbWUgc3RyZWFtLlxuXHQvLyBPdGhlcndpc2UgcmV0dXJucyB0aGlzIHNhbWUgc3RyZWFtLlxuXHRlYXRXaGl0ZXNwYWNlKHN0cmVhbSkge1xuXHRcdHZhciByZXN1bHQgPSB0aGlzLnJ1bGVzLndoaXRlc3BhY2UucGFyc2UodGhpcywgc3RyZWFtKTtcblx0XHRyZXR1cm4gcmVzdWx0ID8gcmVzdWx0Lm5leHQoKSA6IHN0cmVhbTtcblx0fVxuXG4vLyMjIyBSdWxlIGZhY3Rvcmllc1xuXG5cdC8vIEFkZCBhIHJ1bGUgdG8gb3VyIGxpc3Qgb2YgcnVsZXMhXG5cdC8vIFRPRE86IGNvbnZlcnQgdG8gYGFsdGVybmF0aXZlc2Agb24gb3ZlcndyaXRlP1xuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLnJ1bGVzW25hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtuYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdGV4aXN0aW5nID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgbmFtZTogZXhpc3RpbmcubmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBleGlzdGluZztcblx0XHRcdH1cblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRpbmcgcnVsZSAnJHtydWxlLnJ1bGVOYW1lfScgdG8gJyR7bmFtZX0nOiBgLCBydWxlKTtcblx0XHRcdGV4aXN0aW5nLmFkZFJ1bGUocnVsZSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZS5ydWxlTmFtZSA9IG5hbWU7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gcnVsZTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblxuXHQvLyBBZGQgcmVnZXggYXMgYSBwYXR0ZXJuIHRvIG91ciBsaXN0IG9mIHJ1bGVzXG5cdGFkZFBhdHRlcm4obmFtZSwgcGF0dGVybiwgcHJvcGVydGllcykge1xuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuUGF0dGVybihwcm9wZXJ0aWVzKTtcblx0XHRydWxlLnBhdHRlcm4gPSBwYXR0ZXJuO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH1cblxuLy9cbi8vICMjIFV0aWxpdHkgbWV0aG9kc1xuLy9cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmAuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHN0cmVhbSwgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBzdHJlYW1gXHRcdFN0cmVhbSB3aGljaCB3YXMgbWF0Y2hlZCB3aXRoIGBzdGFydEluZGV4YCBhdCB0aGUgc3RhcnQgb2YgdGhlIG1hdGNoXG4vL1x0XHRcdC0gYGVuZEluZGV4YFx0Tm9uLWluY2x1c2l2ZSBlbmQgaW5kZXggaW4gc3RyZWFtIHdoZXJlIG1hdGNoIGVuZHMuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5nYXRoZXJBcmd1bWVudHMoKWBcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZSgpYFx0XHRcdFx0UmV0dXJuIGphdmFzY3JpcHQgc291cmNlIHRvIGludGVycHJldCB0aGUgcnVsZS5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5cbi8vVE9ETzogbWFrZSBnYXRoZXJBcmd1bWVudHMoKSBzdGF0aWMgYW5kIGNhbGwgb24gdGhpc1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0dmFyIGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCBwcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuXG4vL1xuLy8gIyMgb3V0cHV0IGFzIHNvdXJjZVxuLy9cblx0Z2V0IF9hcmcoKSB7IHJldHVybiB0aGlzLmFyZ3VtZW50IHx8IHRoaXMucnVsZU5hbWUgfHwgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lIH1cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBOb3RlIHRoYXQgd2UgZGVmaW5lIGBnYXRoZXJBcmd1bWVudHMoKWAgc3RhdGljYWxseSBvbiBlYWNoIHN1YmNsYXNzXG5cdC8vXHRhbmQgdGhlbiBpbnN0YW5jZSBtZXRob2QgY2FsbHMgaXQgb24gaXRzZWxmLlxuXHRzdGF0aWMgZ2F0aGVyQXJndW1lbnRzKHJ1bGUpIHtcblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IuZ2F0aGVyQXJndW1lbnRzKHRoaXMpO1xuXHR9XG5cblx0Ly8gT3V0cHV0IHZhbHVlIGZvciB0aGlzIElOU1RBTlRJQVRFRCBydWxlIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG5cblxuXG4vLyBSdWxlIGZvciBsaXRlcmFsIHN0cmluZyB2YWx1ZSwgd2hpY2ggaW5jbHVkZSBwdW5jdHVhdGlvbiBzdWNoIGFzIGAoYCBldGMuXG4vL1RPRE86IHJlbmFtZSBgU3ltYm9sYD8/P1xuUnVsZS5TdHJpbmcgPSBjbGFzcyBTdHJpbmcgZXh0ZW5kcyBSdWxlIHtcblx0Ly8gUGFyc2UgdGhpcyBydWxlIGF0IHRoZSBiZWdpbm5pbmcgb2YgYHN0cmVhbWAsIGFzc3VtaW5nIG5vIHdoaXRlc3BhY2UgYmVmb3JlLlxuXHQvLyBEZWZhdWx0IGlzIHRoYXQgYHJ1bGUuc3RyaW5nYCBpcyBsaXRlcmFsIHN0cmluZyB0byBtYXRjaC5cblx0Ly8gT24gbWF0Y2gsIHJldHVybnMgY2xvbmUgb2YgcnVsZSB3aXRoIGB2YWx1ZWAsIGBzdHJlYW1gIGFuZCBgZW5kSW5kZXhgLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICghc3RyZWFtLnN0YXJ0c1dpdGgodGhpcy5zdHJpbmcpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRoaXMuc3RyaW5nLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgdGhpcy5zdHJpbmcubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cbi8vIFJlZ2V4IHBhdHRlcm4uXG4vLyBgcnVsZS5wYXR0ZXJuYCBpcyB0aGUgcmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoLlxuLy8gTk9URTogdGhlIHJlZ2V4IHNob3VsZCBzdGFydCB3aXRoIGAvXi4uLmAgdG8gbWF0Y2ggYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuLy8gWW91IGNhbiBzcGVjaWZ5IGEgYHJ1bGUuYmxhY2tsaXN0YCBvZiBtYXRjaGVzIHRoYXQgd2lsbCBzcGVjaWZpY2FsbHkgTk9UIHdvcmssIGVnIGZvciBgaWRlbnRpZmllci5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHR2YXIgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5wYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYmFpbCBpZiBub3QgaW4gYmxhY2tsaXN0XG5cdFx0dmFyIG1hdGNoZWQgPSBtYXRjaFswXTtcblx0XHRpZiAodGhpcy5ibGFja2xpc3QgJiYgdGhpcy5ibGFja2xpc3RbbWF0Y2hlZF0pIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiBtYXRjaGVkLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgbWF0Y2hlZC5sZW5ndGgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdGFkZFRvQmxhY2tsaXN0KC4uLndvcmRzKSB7XG5cdFx0aWYgKCF0aGlzLmJsYWNrbGlzdCkgdGhpcy5ibGFja2xpc3QgPSB7fTtcblx0XHR3b3Jkcy5mb3JFYWNoKHdvcmQgPT4gdGhpcy5ibGFja2xpc3Rbd29yZF0gPSB0cnVlKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm47XG5cdH1cbn1cblxuXG4vLyBLZXl3b3JkIHBhdHRlcm5cbi8vXHRgcnVsZS5rZXl3b3JkYCBpcyB0aGUga2V5d29yZCBzdHJpbmcgdG8gbWF0Y2guXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHRcdC8vIGNyZWF0ZSBwYXR0ZXJuIHdoaWNoIG1hdGNoZXMgYXQgd29yZCBib3VuZGFyeVxuXHRcdGlmICghdGhpcy5wYXR0ZXJuKSB7XG5cdFx0XHRpZiAoIXRoaXMua2V5d29yZCkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIGtleXdvcmQgcHJvcGVydHlcIik7XG5cdFx0XHR0aGlzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKGBeJHt0aGlzLmtleXdvcmR9XFxcXGJgKTtcblx0XHR9XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5rZXl3b3JkfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHZhciBydWxlID0gcGFyc2VyLmdldFJ1bGUodGhpcy5ydWxlKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQXR0ZW1wdGluZyB0byBwYXJzZSB1bmtub3duIHJ1bGUgJyR7dGhpcy5uYW1lfSdgLCB0aGlzKTtcblx0XHR2YXIgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgcmVzdWx0LmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHt9XG5cblxuLy8gU2VxdWVuY2Ugb2YgcnVsZXMgdG8gbWF0Y2ggKGF1dG8tZXhjbHVkaW5nIHdoaXRlc3BhY2UpLlxuUnVsZS5TZXF1ZW5jZSA9IGNsYXNzIFNlcXVlbmNlIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFyZXN1bHQgJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vVE9ET0Ncblx0Ly8gR2F0aGVyIGFyZ3VtZW50cyBmcm9tIG91ciBwYXJzZWQgYHJlc3VsdHNgIGFycmF5LlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYHZhbHVlc2AgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGByZXN1bHRzLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYHJlc3VsdHMucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gcnVsZSB0eXBlOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdHN0YXRpYyBnYXRoZXJBcmd1bWVudHMoc2VxdWVuY2UpIHtcblx0XHRpZiAoIXNlcXVlbmNlLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IGFyZ3MgPSB7fTtcblx0XHRmb3IgKGxldCBuZXh0IG9mIHNlcXVlbmNlLnJlc3VsdHMpIHtcblx0XHRcdGxldCBhcmdOYW1lID0gbmV4dC5fYXJnO1xuXHRcdFx0Ly8gRm9yIG5lc3RlZCBydWxlcywgcmVjdXJzZSB0byBnZXQgdGhlaXIgYXJndW1lbnRzXG5cdFx0XHRsZXQgcmVzdWx0ID0gbmV4dC5nYXRoZXJBcmd1bWVudHMoKTtcblxuXHRcdFx0Ly8gSWYgYXJnIGFscmVhZHkgZXhpc3RzLCBjb252ZXJ0IHRvIGFuIGFycmF5XG5cdFx0XHRpZiAoYXJnTmFtZSBpbiBhcmdzKSB7XG5cdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShhcmdzW2FyZ05hbWVdKSkgYXJnc1thcmdOYW1lXSA9IFthcmdzW2FyZ05hbWVdXTtcblx0XHRcdFx0YXJnc1thcmdOYW1lXS5wdXNoKHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0YXJnc1thcmdOYW1lXSA9IHJlc3VsdDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGFyZ3M7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlcy5qb2luKFwiIFwiKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG5cbn1cblxuLy8gU3ludGFjdGljIHN1Z2FyIGZvciBkZWJ1Z2dpbmdcblJ1bGUuRXhwcmVzc2lvbiA9IGNsYXNzIGV4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXguXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBGaW5kIHRoZSBMT05HRVNUIG1hdGNoXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IGJlc3RNYXRjaDtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKCFtYXRjaCkgY29udGludWU7XG5cblx0XHRcdC8vIHRha2UgdGhlIGxvbmdlc3QgbWF0Y2hcblx0XHRcdGlmICghYmVzdE1hdGNoIHx8IG1hdGNoLmVuZEluZGV4ID4gYmVzdE1hdGNoLmVuZEluZGV4KVxuXHRcdFx0XHRiZXN0TWF0Y2ggPSBtYXRjaDtcblx0XHR9XG5cdFx0aWYgKCFiZXN0TWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiBiZXN0TWF0Y2gsXG5cdFx0XHRlbmRJbmRleDogYmVzdE1hdGNoLmVuZEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZSgpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAoJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGVzLmpvaW4oXCJ8XCIpfSkke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuLy8gUmVwZWF0aW5nIHJ1bGUuXG4vL1x0YHRoaXMucnVsZWAgaXMgdGhlIHJ1bGUgdGhhdCByZXBlYXRzLlxuLy9cbi8vIEFmdGVyIG1hdGNoaW5nOlxuLy9cdGB0aGlzLnJlc3VsdHNgIGlzIGFycmF5IG9mIHJlc3VsdHMgb2YgbWF0Y2hlcy5cbi8vXG4vL1x0QXV0b21hdGljYWxseSBjb25zdW1lcyB3aGl0ZXNwYWNlIGJlZm9yZSBydWxlcy5cbi8vXHRJZiBkb2Vzbid0IG1hdGNoIGF0IGxlYXN0IG9uZSwgcmV0dXJucyBgdW5kZWZpbmVkYC5cblJ1bGUuUmVwZWF0ID0gY2xhc3MgUmVwZWF0IGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBuZXh0ID0gc3RyZWFtO1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghcmVzdWx0KSBicmVhaztcblxuXHRcdFx0cmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0c3RhdGljIGdhdGhlckFyZ3VtZW50cyhyZXBlYXQpIHtcblx0XHRpZiAoIXJlcGVhdC5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiByZXBlYXQucmVzdWx0cy5tYXAoIHJlc3VsdCA9PiByZXN1bHQuZ2F0aGVyQXJndW1lbnRzKCkgKTtcblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdHRocm93IFwiRG9uJ3QgdW5kZXJzdGFuZCBob3cgdG8gc291cmNlIFJ1bGUuUmVwZWF0IVwiO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0Y29uc3QgcnVsZSA9ICh0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlID8gYCgke3RoaXMucnVsZX0pYCA6IGAke3RoaXMucnVsZX1gKTtcblx0XHRyZXR1cm4gYCR7cnVsZX0ke3RoaXMub3B0aW9uYWwgPyAnKicgOiAnKyd9YDtcblx0fVxufVxuXG5cbi8vIExpc3QgbWF0Y2ggcnVsZTogICBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAuIGVnXCIgYFt7bnVtYmVyfSxdYCB0byBtYXRjaCBgMSwyLDNgXG4vL1x0YHJ1bGUuaXRlbWAgaXMgdGhlIHJ1bGUgZm9yIGVhY2ggaXRlbSxcbi8vXHRgcnVsZS5kZWxpbWl0ZXJgIGlzIHRoZSBkZWxpbWl0ZXIgYmV0d2VlbiBlYWNoIGl0ZW0uXG4vLyBcdGBydWxlLnJlc3VsdHNgIGluIHRoZSBvdXRwdXQgaXMgdGhlIGxpc3Qgb2YgdmFsdWVzLlxuLy9cbi8vXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhIExpc3QgcnVsZSB3aWxsIE5PVCByZXBlYXQgKD8/Pz8pXG5SdWxlLkxpc3QgPSBjbGFzcyBMaXN0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0dmFyIHJlc3VsdHMgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdHJlc3VsdHMucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFkZWxpbWl0ZXIpIGJyZWFrO1xuXHRcdFx0bmV4dCA9IGRlbGltaXRlci5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybiBtYXRjaGVkIGl0ZW0gYnkgaW5kZXhcblx0Z2V0SXRlbShpbmRleCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLnJlc3VsdHNbaW5kZXhdO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XHRcdC8vIFRPRE86IHRocm93Pz8/XG5cdFx0bGV0IHJlc3VsdHMgPSB0aGlzLnJlc3VsdHMubWFwKCByZXN1bHQgPT4gcmVzdWx0LnRvU291cmNlKCkgKS5qb2luKFwiLCBcIik7XG5cdFx0cmV0dXJuIGBbJHtyZXN1bHRzfV1gO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gcmUtZXhwb3J0IFJ1bGUgZm9yIHRlc3RpbmdcbmV4cG9ydCBkZWZhdWx0IFJ1bGU7XG5cbi8vXG4vL1x0IyBQYXJzaW5nIGBydWxlU3ludGF4YCB0byBjcmVhdGUgcnVsZXMgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUT0RPOlx0UHVsbCBgcGFyc2VSdWxlU3ludGF4YCBzdHVmZiBvdXQgaW50byBzZXBhcmF0ZSBtb2R1bGU/XG4vLyBUT0RPOlx0QmV0dGVyIG5hbWUgZm9yIGBydWxlU3ludGF4YFxuLy8gVE9ETzpcdFVzZSBrZXl3b3JkcyBpbiBzeW50YXggdG8gbWFrZSBhIHF1aWNrIHJlZ2V4LWJhc2VkIGB0ZXN0YCBmdW5jdGlvbiBmb3IgdGhlIGVudGlyZSBydWxlXG5PYmplY3QuYXNzaWduKFJ1bGUsIHtcblxuLy9cbi8vICMjIGdyb3VwOiBwYXJzaW5nIHN5bnRheFxuLy9cblxuLy8gVE9ETzogY29udmVydCB0byBUZXh0U3RyZWFtIHBhdHRlcm4gYWxhIG5vcm1hbCBwYXJzZXIgb25jZSB0aGF0IHNldHRsZXMgZG93bj8/P1xuXHRwYXJzZVJ1bGVTeW50YXgoc3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIFtdKTtcblxuXHRcdGxldCBydWxlO1xuXHRcdC8vIElmIHdlIG9ubHkgZ290IG9uZSB0aGluZywgcmV0dXJuIHRoYXQgYXMgdGhlIHJlc3VsdFxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSBydWxlc1swXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFNlcXVlbmNlQ29uc3RydWN0b3IoeyBydWxlcyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fSxcblxuXHR0b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KSB7XG5cdFx0Y29uc3QgU1lOVEFYX0VYUFJFU1NJT04gPSAvKD86W1xcd1xcLV0rfFxcXFxbXFxbXFwoXFx7XFwpXFx9XFxdXXxbXlxcc1xcd118XFx8KS9nO1xuXHRcdHZhciBzeW50YXhTdHJlYW0gPSBzeW50YXgubWF0Y2goU1lOVEFYX0VYUFJFU1NJT04pO1xuXHRcdGlmICghc3ludGF4U3RyZWFtKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHRva2VuaXplIHBhcnNlIHJ1bGUgc3ludGF4ID4+JHtzeW50YXh9PDxgKTtcblx0XHRyZXR1cm4gc3ludGF4U3RyZWFtO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbGFzdEluZGV4ID0gc3ludGF4U3RyZWFtLmxlbmd0aDtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKHJ1bGUpIHtcblx0XHRcdFx0dmFyIGxhc3QgPSBydWxlc1tydWxlcy5sZW5ndGgtMV07XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgU3RyaW5nYCBhbmQgbGFzdCB3YXMgYSBgU3RyaW5nYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0aWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuU3RyaW5nICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN0cmluZykge1xuXHRcdFx0XHRcdGxhc3Quc3RyaW5nICs9IHJ1bGUuc3RyaW5nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJ1bGVzLnB1c2gocnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHN0YXJ0SW5kZXggPSBlbmRJbmRleCArIDE7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlcztcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDApIHtcblx0XHR2YXIgc3ludGF4VG9rZW4gPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHQvLyBpZiB3ZSBnb3QgYSBcIlxcXFxcIiAod2hpY2ggYWxzbyBoYXMgdG8gZ28gaW50byB0aGUgc291cmNlIHN0cmluZyBhcyBcIlxcXFxcIilcblx0XHQvLyB0cmVhdCB0aGUgbmV4dCBiaXQgYXMgYSBsaXRlcmFsIHN0cmluZyByYXRoZXIgdGhhbiBhcyBhIHNwZWNpYWwgY2hhcmFjdGVyLlxuXHRcdGlmIChzeW50YXhUb2tlbiA9PT0gXCJcXFxcXCIpIHtcblx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCArIDEpO1xuXHRcdH1cblxuXHRcdHN3aXRjaCAoc3ludGF4VG9rZW4pIHtcblx0XHRcdGNhc2UgXCJ7XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIoXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiW1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKlwiOlxuXHRcdFx0Y2FzZSBcIitcIjpcblx0XHRcdGNhc2UgXCI/XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0XHQvLyB0aGUgZm9sbG93aW5nIHNob3VsZCBBTFdBWVMgYmUgY29uc3VtZWQgYnkgdGhlIGFib3ZlXG5cdFx0XHRjYXNlIFwifVwiOlxuXHRcdFx0Y2FzZSBcIilcIjpcblx0XHRcdGNhc2UgXCJdXCI6XG5cdFx0XHRjYXNlIFwifFwiOlxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgJHtzeW50YXhUb2tlbn0gZm91bmQgYXMgaXRlbSAke3N0YXJ0SW5kZXh9IG9mICR7dGhpcy5zeW50YXh9YCk7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzdHJpbmcgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF0sIHJ1bGU7XG5cdFx0Ly8gSWYgbGV0dGVycyBvbmx5LCBtYXRjaCBhcyBhIEtleXdvcmQgKHNvIHdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGFmdGVyIHRoZSBzdHJpbmcpLlxuXHRcdGlmIChzdHJpbmcubWF0Y2goL1tBLVphLXpdKy8pKSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuS2V5d29yZCh7IGtleXdvcmQ6IHN0cmluZyB9KTtcblx0XHR9XG5cdFx0Ly8gT3RoZXJ3aXNlIG1hdGNoIGFzIGEgU3RyaW5nLCB3aGljaCBkb2Vzbid0IHJlcXVpcmUgbm9uLXdvcmQgY2hhcnMgYWZ0ZXIgdGhlIHRleHQuXG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuU3RyaW5nKHsgc3RyaW5nOiBzdHJpbmcgfSk7XG5cdFx0XHQvLyBJZiBzdHJpbmcgc3RhcnRzIHdpdGggYFxcXFxgLCBpdCdzIGFuIGVzY2FwZWQgbGl0ZXJhbCAoZWc6IGBcXFtgIG5lZWRzIHRvIGlucHV0IGFzIGBcXFxcW2ApLlxuXHRcdFx0aWYgKHN0cmluZy5zdGFydHNXaXRoKFwiXFxcXFwiKSkge1xuXHRcdFx0XHQvLyByZW1vdmUgbGVhZGluZyBzbGFzaCBpbiBtYXRjaCBzdHJpbmcuLi5cblx0XHRcdFx0cnVsZS5zdHJpbmcgPSBydWxlLnN0cmluZy5zdWJzdHIoMSk7XG5cdFx0XHRcdC8vIGJ1dCBsZWF2ZSBpdCBpbiB0b1N0cmluZ1xuXHRcdFx0XHRydWxlLnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gWyBydWxlLCBzdGFydEluZGV4IF07XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBncm91cGluZyBleHByZXNzaW9uIGAoLi4ufC4uLilgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0Ly8gTk9URTogbmVzdGVkIHBhcmVucyBtYXkgbm90IGhhdmUgYWx0ZXJuYXRpdmVzLi4uIDotKCAgIGAoYXwoYnxjKSlgIHdvbid0IHdvcms/Pz9cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCIoXCIsIFwiKVwiLCBzdGFydEluZGV4KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHQvLyBzcGxpdCBpbnRvIGdyb3VwcywgaW5jbHVkaW5nIG5lc3RlZCBwYXJlbnNcblx0XHRsZXQgYWx0ZXJuYXRlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0ZXMoc2xpY2UpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0XHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKGdyb3VwLCBbXSk7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHRzWzBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdGxldCBydWxlID0gYWx0ZXJuYXRlcy5sZW5ndGggPT09IDEgPyBhbHRlcm5hdGVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0ZXMgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblxuXHRcdGZ1bmN0aW9uIGdyb3VwQWx0ZXJuYXRlcyh0b2tlbnMpIHtcblx0XHRcdHZhciBhbHRlcm5hdGVzID0gW107XG5cdFx0XHR2YXIgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGhhbmRsZSBuZXN0ZWQgcGFyZW5zXG5cdFx0XHRcdGVsc2UgaWYgKHRva2VuID09PSBcIihcIikge1xuXHRcdFx0XHRcdGxldCB7IGVuZEluZGV4IH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmRJbmRleCArIDEpKTtcblx0XHRcdFx0XHRpID0gZW5kSW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3VycmVudC5wdXNoKHRva2VuKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGN1cnJlbnQubGVuZ3RoKSBhbHRlcm5hdGVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRyZXR1cm4gYWx0ZXJuYXRlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdHZhciBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlN1YnJ1bGUoeyBydWxlOiBtYXRjaC5zbGljZVswXSB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBtYXRjaC5lbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuTGlzdCgpO1xuXHRcdHJ1bGUuaXRlbSA9IHJlc3VsdHNbMF1cblx0XHRydWxlLmRlbGltaXRlciA9IHJlc3VsdHNbMV1cblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG59KTtcblxuXG5cbi8vICMjICBBZGQgbWV0aG9kcyB0byBQYXJzZXIgdG8gZGVmaW5lIHJ1bGVzIHVzaW5nIHRoZSBhYm92ZSBzeW50YXguXG5PYmplY3QuYXNzaWduKFBhcnNlci5wcm90b3R5cGUsIHtcblxuXHQvLyBQYXJzZSBhIGBydWxlU3ludGF4YCBydWxlIGFuZCBhZGQgaXQgdG8gb3VyIGxpc3Qgb2YgcnVsZXMuXG5cdC8vIFJldHVybnMgdGhlIG5ldyBydWxlLlxuXHQvLyBMb2dzIHBhcnNpbmcgZXJyb3JzIGJ1dCBhbGxvd3MgdGhpbmdzIHRvIGNvbnRpbnVlLlxuXHRhZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHR0cnkge1xuXHRcdFx0bGV0IHJ1bGUgPSBSdWxlLnBhcnNlUnVsZVN5bnRheChydWxlU3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yKTtcblxuXHRcdFx0Ly8gUmVmbGVjdCB0aGUgcnVsZSBiYWNrIG91dCB0byBtYWtlIHN1cmUgaXQgbG9va3MgKG1vcmUgb3IgbGVzcykgdGhlIHNhbWVcblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRlZCBydWxlICcke25hbWV9JzpcXG4gIElOUFVUOiAke3J1bGVTeW50YXh9IFxcbiBPVVRQVVQ6ICR7cnVsZX1gKTtcblxuXHRcdFx0T2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5ncm91cChgRXJyb3IgcGFyc2luZyBzeW50YXggZm9yIHJ1bGUgJyR7bmFtZX0nOmApO1xuXHRcdFx0Y29uc29sZS5sb2coYHN5bnRheDogJHtydWxlU3ludGF4fWApO1xuXHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHR9XG5cdH0sXG5cblx0YWRkU3RhdGVtZW50KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFJ1bGUuU3RhdGVtZW50KTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fSxcblxuXHRhZGRFeHByZXNzaW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFJ1bGUuRXhwcmVzc2lvbik7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHJ1bGUpO1xuXHR9LFxuXG5cdC8vIEFkZCBpbmZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgb3IgYlwiXG5cdGFkZEluZml4T3BlcmF0b3IobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50cmFuc2Zvcm1lcikge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBpbmZpeCBvcGVyYXRvciBydWxlICcke25hbWV9JyB0byBzcGVjaWZ5ICd0cmFuc2Zvcm1lcicgZnVuY3Rpb25gKVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcImluZml4LW9wZXJhdG9yXCIsIHJ1bGUpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBBZGQgcG9zdGZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgaXMgZGVmaW5lZFwiXG5cdGFkZFBvc3RmaXhPcGVyYXRvcihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkge1xuXHRcdFx0aWYgKCFydWxlLnRyYW5zZm9ybWVyKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIHBvc3RmaXggb3BlcmF0b3IgcnVsZSAnJHtuYW1lfScgdG8gc3BlY2lmeSAndHJhbnNmb3JtZXInIGZ1bmN0aW9uYCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwicG9zdGZpeC1vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH1cbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGVTeW50YXguanMiLCIvL1xuLy9cdCMgQ29yZSBgcnVsZXNgIC0tIHNpbXBsZSBkYXRhdHlwZXMsIGV0Yy5cbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vXG4vLyBSZWdleCBwYXR0ZXJuIHJ1bGVzIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9ycyBmb3IgZGVidWdnaW5nXG4vL1xuLy9wYXJzZXIuYWRkUGF0dGVybihcIndoaXRlc3BhY2VcIiwgL15cXHMrLyk7XG5SdWxlLldoaXRlc3BhY2UgPSBjbGFzcyB3aGl0ZXNwYWNlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9XG5wYXJzZXIuYWRkUnVsZShcIndoaXRlc3BhY2VcIiwgbmV3IFJ1bGUuV2hpdGVzcGFjZSh7IHBhdHRlcm46IC9eXFxzKy8sIG9wdGlvbmFsOiB0cnVlIH0pKTtcblxuLy8gYGlkZW50aWZpZXJgID0gdmFyaWFibGVzIG9yIHByb3BlcnR5IG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJpZGVudGlmaWVyXCIsIC9eW2Etel1bXFx3XFxkXFwtX10qLyk7XG5SdWxlLklkZW50aWZpZXIgPSBjbGFzcyBpZGVudGlmaWVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IGlkZW50aWZpZXIgPSBwYXJzZXIuYWRkUnVsZShcImlkZW50aWZpZXJcIiwgbmV3IFJ1bGUuSWRlbnRpZmllcih7XG5cdHBhdHRlcm46IC9eW2Etel1bXFx3XFwtXSovLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgaWRlbnRpZmllcik7XG5cbi8vIFN0aWNrIGBpZGVudGlmaWVyYCBvbiBgcGFyc2VyYCBzbyB3ZSBjYW4gYWRkIHRvIGl0cyBibGFja2xpc3QgZWFzaWx5LlxucGFyc2VyLmlkZW50aWZpZXIgPSBpZGVudGlmaWVyO1xuXG4vLyBBZGQgRW5nbGlzaCBwcmVwb3NpdGlvbnMgYXMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbnBhcnNlci5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFib3V0XCIsIFwiYWJvdmVcIiwgXCJhZnRlclwiLCBcImFzXCIsIFwiYXRcIixcblx0XCJiZWZvcmVcIiwgXCJiZWhpbmRcIiwgXCJiZWxvd1wiLCBcImJlbmVhdGhcIiwgXCJiZXNpZGVcIiwgXCJiZXR3ZWVuXCIsIFwiYmV5b25kXCIsIFwiYnlcIixcblx0XCJkb3duXCIsIFwiZHVyaW5nXCIsXG5cdFwiZXhjZXB0XCIsXG5cdFwiZm9yXCIsIFwiZnJvbVwiLFxuXHRcImluXCIsIFwiaW50b1wiLFxuXHRcImxlc3NcIiwgXCJsb25nXCIsXG5cdFwibWludXNcIiwgXCJtb3JlXCIsXG5cdFwibmVhclwiLFxuXHRcIm9mXCIsIFwib2ZmXCIsIFwib25cIiwgXCJvbnRvXCIsIFwib3Bwb3NpdGVcIiwgXCJvdXRcIiwgXCJvdXRzaWRlXCIsIFwib3ZlclwiLFxuXHRcInNob3J0XCIsIFwic2luY2VcIixcblx0XCJ0aGFuXCIsIFwidGhlblwiLCBcInRocm91Z2hcIiwgXCJ0aHJ1XCIsIFwidG9cIiwgXCJ0b3dhcmRcIiwgXCJ0b3dhcmRzXCIsXG5cdFwidW5kZXJcIiwgXCJ1bmRlcm5lYXRoXCIsIFwidW50aWxcIiwgXCJ1cFwiLCBcInVwb25cIiwgXCJ1cHNpZGVcIixcblx0XCJ2ZXJzdXNcIiwgXCJ2c1wiLFxuXHRcIndpdGhcIiwgXCJ3aXRoaW5cIiwgXCJ3aXRob3V0XCIsXG4pO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG4vL3BhcnNlci5hZGRQYXR0ZXJuKFwidHlwZW5hbWVcIiwgL15bQS1aXVtcXHdcXGRcXC1fXSovKTtcblJ1bGUuVHlwZSA9IGNsYXNzIFR5cGUgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgdHlwZSA9IHBhcnNlci5hZGRSdWxlKFwiVHlwZVwiLCBuZXcgUnVsZS5UeXBlKHtcblx0cGF0dGVybjogL15bQS1aXVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCB0eXBlKTtcblxuXG4vLyBgbnVtYmVyYCBhcyBlaXRoZXIgZmxvYXQgb3IgaW50ZWdlciwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuUnVsZS5OdW1iZXIgPSBjbGFzcyBudW1iZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgbnVtYmVyID0gcGFyc2VyLmFkZFJ1bGUoXCJudW1iZXJcIiwgbmV3IFJ1bGUuTnVtYmVyKHtcblx0cGF0dGVybjogL14tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gbnVtYmVyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlRmxvYXQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBudW1iZXIpO1xuXG5cbi8vIE51bWVyaWMgYGludGVnZXJgIG9ubHksIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHRoaXMgV0lMTCBtYXRjaCBhIGZsb2F0LCBidXQgdGhlIHJldHVybmVkIHZhbHVlIHdpbGwgY29lcmNlIHRvIGFuIGludGVnZXIuXG4vLyBSRVZJRVc6IGlzIHRoaXMgcmlnaHQ/ICBCZXR0ZXIgdG8gbm90IG1hdGNoIGEgZmxvYXQ/XG5SdWxlLkludGVnZXIgPSBjbGFzcyBpbnRlZ2VyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJpbnRlZ2VyXCIsIG5ldyBSdWxlLkludGVnZXIoe1xuXHRwYXR0ZXJuOiAvXi0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBpbnRlZ2VyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlSW50KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5cblxuLy8gTGl0ZXJhbCBgdGV4dGAgc3RyaW5nLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBZb3UgY2FuIHVzZSBlaXRoZXIgc2luZ2xlIG9yIGRvdWJsZSBxdW90ZXMgb24gdGhlIG91dHNpZGUgKGFsdGhvdWdoIGRvdWJsZSBxdW90ZXMgYXJlIHByZWZlcnJlZCkuXG4vLyBSZXR1cm5lZCB2YWx1ZSBoYXMgZW5jbG9zaW5nIHF1b3Rlcy5cbi8vIFRPRE86IGVzY2FwZWQgcXVvdGVzIGluc2lkZSBzdHJpbmdcblJ1bGUuVGV4dCA9IGNsYXNzIHRleHQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgdGV4dCA9IHBhcnNlci5hZGRSdWxlKFwidGV4dFwiLCBuZXcgUnVsZS5UZXh0KHtcblx0cGF0dGVybjogL14oPzpcIlteXCJdKlwifCdbXiddKicpL1xufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHRleHQpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cblJ1bGUuQm9vbGVhbiA9IGNsYXNzIGJvb2xlYW4gZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgYm9vbCA9IHBhcnNlci5hZGRSdWxlKFwiYm9vbGVhblwiLCBuZXcgUnVsZS5Cb29sZWFuKHtcblx0cGF0dGVybjogL14odHJ1ZXxmYWxzZXx5ZXN8bm98c3VjY2Vzc3xmYWlsdXJlfG9rfGNhbmNlbClcXGIvLFxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHN3aXRjaCAodGhpcy5tYXRjaGVkKSB7XG5cdFx0XHRjYXNlIFwidHJ1ZVwiOlxuXHRcdFx0Y2FzZSBcInllc1wiOlxuXHRcdFx0Y2FzZSBcInN1Y2Nlc3NcIjpcblx0XHRcdGNhc2UgXCJva1wiOlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBib29sKTtcbi8vIEFkZCB0b2tlbnMgaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbnBhcnNlci5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFwidHJ1ZVwiLCBcImZhbHNlXCIsIFwieWVzXCIsIFwibm9cIiwgXCJzdWNjZXNzXCIsIFwiZmFpbHVyZVwiLCBcIm9rXCIsIFwiY2FuY2VsXCIpO1xuXG4vLyBMaXRlcmFsIGxpc3QgKGFycmF5KSwgZWc6ICBgWzEsMix0cnVlLGZhbHNlIF1gXG5sZXQgbGlzdCA9IHBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpdGVyYWwtbGlzdFwiLFxuXHRcIlxcXFxbW2xpc3Q6e2V4cHJlc3Npb259LF0/XFxcXF1cIixcblx0e1xuXHRcdGdhdGhlckFyZ3VtZW50cygpIHtcblx0XHRcdHJldHVybiB0aGlzLnJlc3VsdHNbMV07XG5cdFx0fSxcblx0XHQvLyByZXR1cm4ganVzdCB0aGUgbGlzdCBhcyBvdXIgc291cmNlXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuIFx0XHRcdHJldHVybiB0aGlzLmdhdGhlckFyZ3VtZW50cygpLnRvU291cmNlKCk7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBMaXRlcmFsIHZhbHVlIGFzIG51bWJlciwgdGV4dCBvciBib29sZWFuLlxuLy9UT0RPOiB0aGlzIGlzIGFuIGV4cHJlc3Npb24uLi4gYnV0IGluc3RhbGxpbmcgaXQgdGhhdCB3YXkgYnJlYWtzIHBhcnNpbmcuLi4/XG4vL1RFU1RNRTogYWRkIGxpdGVyYWwtbGlzdCB0byB0aGlzP1xucGFyc2VyLmFkZFN5bnRheChcImxpdGVyYWxcIiwgXCIobGl0ZXJhbDp7bnVtYmVyfXx7dGV4dH18e2Jvb2xlYW59fHtsaXRlcmFsLWxpc3R9KVwiKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9jb3JlLmpzIiwiXG4vLyBUT0RPOiBjb252ZXJ0IHRvIGxpbmUtYXdhcmUgc3RyZWFtPz8/XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXh0U3RyZWFtIHtcblx0Ly8gWW91IGNhbiBjb25zdHJ1Y3Qgd2l0aCBhIHRleHQgc3RyaW5nIG9yIGEgc2V0IG9mIHByb3BlcnRpZXMgKGluY2x1ZGluZyBgdGV4dGApLlxuXHRjb25zdHJ1Y3Rvcih0ZXh0T3JQcm9wcykge1xuXHRcdGlmICh0eXBlb2YgdGV4dE9yUHJvcHMgPT09IFwic3RyaW5nXCIpXG5cdFx0XHR0aGlzLnRleHQgPSB0ZXh0T3JQcm9wcztcblx0XHRlbHNlXG5cdFx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHRleHRPclByb3BzKTtcblxuXHRcdC8vIE1ha2Ugc3VyZSBgdGV4dGAgaXMgZGVmaW5lZC5cblx0XHRpZiAoIShcInRleHRcIiBpbiB0aGlzKSkgdGhpcy50ZXh0ID0gXCJcIjtcblx0XHRpZiAoIShcInN0YXJ0SW5kZXhcIiBpbiB0aGlzKSkgdGhpcy5zdGFydEluZGV4ID0gMDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBpbW11dGFibGUgY2xvbmUgb2YgdGhlIHN0cmVhbS5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRsZXQgY2xvbmUgPSBuZXcgVGV4dFN0cmVhbSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCBwcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jZWQgdG8gbmV3IHN0YXJ0SW5kZXguXG5cdGFkdmFuY2VUbyhzdGFydEluZGV4KSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4IH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jaW5nIHN0YXJ0SW5kZXggQlkgYGxlbmd0aGBcblx0YWR2YW5jZUJ5KGxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuXHR9XG5cbi8vIFx0Ly8gUmV0dXJuIGNsb25lIG9mIHRoaXMgc3RyZWFtIHdpdGggZW5kSW5kZXggc2V0IHRvIHN0YXJ0ICsgYGxlbmd0aGBcbi8vIFx0ZW5kQWZ0ZXIobGVuZ3RoKSB7XG4vLyBcdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBlbmRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuLy8gXHR9XG5cbi8vXG4vLyAjIyBNYXRjaGluZ1xuLy9cblx0Ly8gTWF0Y2ggYHBhdHRlcm5gIGFzIHJlZ2V4IGF0IGhlYWQgb2Ygc3RyZWFtLlxuXHQvLyBOT1RFOiByZWdleGVzIHNob3VsZCBzdGFydCB3aXRoIGBeYCFcblx0Ly8gUmV0dXJucyBtYXRjaCBvciB1bmRlZmluZWQuXG5cdG1hdGNoKHBhdHRlcm4pIHtcblx0XHRpZiAoIShwYXR0ZXJuIGluc3RhbmNlb2YgUmVnRXhwKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGV4dFN0cmVhbS5tYXRjaCgke3BhdHRlcm59KTogZXhwZWN0ZWQgUmVnRXhwYCk7XG4vL1RPRE86IHVzZSBgc3RyZWFtLnJhbmdlYCB0byBlbnN1cmUgbWF0Y2ggaXMgbm90IG5vdCBiZXlvbmQgYHN0cmluZy5lbmRJbmRleGBcblx0XHRyZXR1cm4gdGhpcy5oZWFkLm1hdGNoKHBhdHRlcm4pO1xuXHR9XG5cblx0c3RhcnRzV2l0aChzdHJpbmcpIHtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQuc3RhcnRzV2l0aChzdHJpbmcpO1xuXHR9XG5cblxuLy9cbi8vICMjIFJlZmxlY3Rpb25cbi8vXG5cdC8vIFJldHVybiB0ZXh0IG9mIHN0cmluZyBzdGFydGluZyBhdCBvdXIgYHN0YXJ0SW5kZXhgXG5cdGdldCBoZWFkKCkge1xuXHRcdHJldHVybiB0aGlzLnJhbmdlKCk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSByYW5nZSBvZiB0aGUgc3RyaW5nIGZyb20gYHN0YXJ0SW5kZXhgIHRvIGBlbmRJbmRleGAgTk9OLWluY2x1c2l2ZS5cblx0cmFuZ2Uoc3RhcnRJbmRleCA9IHRoaXMuc3RhcnRJbmRleCwgZW5kSW5kZXggPSB0aGlzLnRleHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5zdWJzdHJpbmcoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xuXHR9XG5cblx0Ly8gTGVuZ3RoIG9mIHRoZSBzdHJlYW0uXG5cdGdldCBsZW5ndGgoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5sZW5ndGg7XG5cdH1cblxuXHQvLyBBcmUgd2UgYXQgdGhlIGVuZCBvZiB0aGUgc3RyZWFtP1xuXHRnZXQgaXNFbXB0eSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGFydEluZGV4ID09PSB0aGlzLmxlbmd0aDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHRcblx0fTtcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9UZXh0U3RyZWFtLmpzIiwiaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGxvYWQgc3RhbmRhcmQgcnVsZXMgZmlsZXMgaGVyZVxuaW1wb3J0IFwiLi9jb3JlXCI7XG5pbXBvcnQgXCIuL251bWJlcnNcIjtcbmltcG9ydCBcIi4vb3BlcmF0b3JzXCI7XG5pbXBvcnQgXCIuL2Fzc2lnbm1lbnRcIjtcbmltcG9ydCBcIi4vY2xhc3NcIjtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9pbmRleC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gVE9ETzoge3Byb3BlcnR5LWV4cHJlc3Npb259IGFsc28gd29ya3MuLi4ge2Fzc2lnbmFibGUtZXhwcmVzc2lvbn0gPz8/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYXNzaWdubWVudFwiLCBcIntpZGVudGlmaWVyfSA9IHtleHByZXNzaW9ufVwiLCB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0bGV0IGlkZW50aWZpZXIgPSBhcmdzLmlkZW50aWZpZXIudG9Tb3VyY2UoKTtcblx0XHRsZXQgdmFsdWUgPSBhcmdzLmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHQvLyBUT0RPOiBkZWNsYXJlIGlkZW50aWZpZXIgaWYgbm90IGluIHNjb3BlLCBldGNcblx0XHRyZXR1cm4gYCR7aWRlbnRpZmllcn0gPSAke3ZhbHVlfWA7XG5cdH1cbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlZmluaW5nIGNsYXNzZXMgKGtub3duIGFzIGB0eXBlc2ApXG4vL1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vcGFyc2VyLmFkZEV4cHJlc3Npb24oXCJwcm9wZXJ0eS1leHByZXNzaW9uXCIsIFwie3Byb3BlcnR5OnByb3BlcnR5LW5hbWV9KyB7ZXhwcmVzc2lvbn1cIiwge1xucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJwcm9wZXJ0eS1leHByZXNzaW9uXCIsIFwiKHByb3BlcnRpZXM6dGhlIHtpZGVudGlmaWVyfSBvZikrIHtleHByZXNzaW9ufVwiLCB7XG4gXHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0bGV0IGFyZ3MgPSBSdWxlLkV4cHJlc3Npb24uZ2F0aGVyQXJndW1lbnRzKHRoaXMpO1xuXHRcdC8vIHRyYW5zZm9ybSBwcm9wZXJ0aWVzIGFuZCByZXZlcnNlIG9yZGVyXG5cdFx0YXJncy5wcm9wZXJ0aWVzID0gYXJncy5wcm9wZXJ0aWVzLm1hcCggc2VxdWVuY2UgPT4gc2VxdWVuY2UuaWRlbnRpZmllciApLnJldmVyc2UoKTtcblx0XHRyZXR1cm4gYXJncztcbiBcdH0sXG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgdGhpbmcgPSBhcmdzLmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRsZXQgcHJvcGVydGllcyA9IGFyZ3MucHJvcGVydGllcy5tYXAoIGlkZW50aWZpZXIgPT4gaWRlbnRpZmllci50b1NvdXJjZSgpICkuam9pbihcIi5cIik7XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXQoJHt0aGluZ30sICcke3Byb3BlcnRpZXN9JylgO1xuXHR9XG59KTtcblxuXG5cbnBhcnNlci5hZGRTeW50YXgoXCJzY29wZS1tb2RpZmllclwiLCBcIihzY29wZTpnbG9iYWx8Y29uc3RhbnR8c2hhcmVkKVwiKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlLXByb3BlcnR5XCIsXG5cdFwie3Njb3BlLW1vZGlmaWVyfT8ge2Fzc2lnbm1lbnR9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuYXNzaWdubWVudC5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgdmFsdWUgPSBhcmdzLmFzc2lnbm1lbnQuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGFzc2lnbm1lbnQgPSBgJHtpZGVudGlmaWVyfSA9ICR7dmFsdWV9YDtcblxuXHRcdFx0dmFyIHNjb3BlID0gYXJncy5zY29wZSA/IGFyZ3Muc2NvcGUudG9Tb3VyY2UoKSA6IFwibG9jYWxcIjtcblx0XHRcdHN3aXRjaCAoc2NvcGUpIHtcblx0XHRcdFx0Y2FzZSBcImdsb2JhbFwiOlxuXHRcdFx0XHRcdHJldHVybiBgZ2xvYmFsLiR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZFwiOlxuXHRcdFx0XHRcdHJldHVybiBgc3RhdGljICR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0cmV0dXJuIGFzc2lnbm1lbnQ7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZS1wcm9wZXJ0eS1hcy1vbmUtb2ZcIixcblx0XCJ7aWRlbnRpZmllcn0gYXMgb25lIG9mIHtsaXN0OmxpdGVyYWwtbGlzdH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgcGx1cmFsID0gKGlkZW50aWZpZXIgKyBcIl9WQUxVRVNcIikudG9VcHBlckNhc2UoKTtcblx0XHRcdGxldCBsaXN0ID0gYXJncy5saXN0Lmxpc3Q7XG5cdFx0XHRsZXQgdmFsdWVzID0gbGlzdC50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGZpcnN0ID0gbGlzdC5yZXN1bHRzWzBdO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKCkgOiBcInVuZGVmaW5lZFwiO1xuXG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke3BsdXJhbH0gPSAke3ZhbHVlc307XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0geyByZXR1cm4gKFwiX18ke2lkZW50aWZpZXJ9XCIgaW4gdGhpcyA/IHRoaXMuX18ke2lkZW50aWZpZXJ9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfVxcbmA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY2xhc3MuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBudW1iZXJzXG4vL1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vIE51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmcuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4LWV4cHJlc3Npb25cIiwgXCJpdGVtIHtudW1iZXI6aW50ZWdlcn0gb2Yge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoKSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBudW1iZXIgPSBhcmdzLm51bWJlci50b1NvdXJjZSgpO1xuXHRcdGxldCBleHByZXNzaW9uID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7bnVtYmVyfSlgO1xuXHR9XG59KTtcblxuLy8gRW5nbGlzaCB3b3JkcyB1c2VkIGZvciBwb3NpdGlvbiBvZiBzb21ldGhpbmcgaW4gYSBsaXN0LlxuLy8gVE9ETzogYHNldmVudHktc2V2ZW50aGAsIGB0aGlyZC10by1sYXN0YC4uLlxucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCIoZmlyc3R8c2Vjb25kfHRoaXJkfGZvdXJ0aHxmaWZ0aHxzaXh0aHxzZXZlbnRofGVpZ2h0aHxuaW50aHx0ZW50aHxwZW51bHRpbWF0ZXxsYXN0fGZpbmFsKVwiLCB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgb3JkaW5hbCA9IHRoaXMubWF0Y2hlZC50b1NvdXJjZSgpO1xuXHRcdHN3aXRjaCAob3JkaW5hbCkge1xuXHRcdFx0Y2FzZSBcImZpcnN0XCI6XHRcdHJldHVybiAxO1xuXHRcdFx0Y2FzZSBcInNlY29uZFwiOlx0XHRyZXR1cm4gMjtcblx0XHRcdGNhc2UgXCJ0aGlyZFwiOlx0XHRyZXR1cm4gMztcblx0XHRcdGNhc2UgXCJmb3VydGhcIjpcdFx0cmV0dXJuIDQ7XG5cdFx0XHRjYXNlIFwiZmlmdGhcIjpcdFx0cmV0dXJuIDU7XG5cdFx0XHRjYXNlIFwic2l4dGhcIjpcdFx0cmV0dXJuIDY7XG5cdFx0XHRjYXNlIFwic2V2ZW50aFwiOlx0XHRyZXR1cm4gNztcblx0XHRcdGNhc2UgXCJlaWdodGhcIjpcdFx0cmV0dXJuIDg7XG5cdFx0XHRjYXNlIFwibmludGhcIjpcdFx0cmV0dXJuIDk7XG5cdFx0XHRjYXNlIFwidGVudGhcIjpcdFx0cmV0dXJuIDEwO1xuXHRcdFx0Y2FzZSBcInBlbnVsdGltYXRlXCI6XHRyZXR1cm4gLTI7XG5cdFx0XHRjYXNlIFwibGFzdFwiOlx0XHRyZXR1cm4gLTE7XG5cdFx0XHRjYXNlIFwiZmluYWxcIjpcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0fVxufSk7XG5cbi8vIEFsdGVybmF0aXZlIGZvcm0gZm9yIG51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmcuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4LWV4cHJlc3Npb25cIiwgXCJ0aGUge29yZGluYWx9IGl0ZW0gb2Yge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoKSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBvcmRpbmFsID0gYXJncy5vcmRpbmFsLnRvU291cmNlKCk7XG5cdFx0bGV0IGV4cHJlc3Npb24gPSBhcmdzLmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtvcmRpbmFsfSlgO1xuXHR9XG59KTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL251bWJlcnMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGluZml4IGFuZCBwcmVmaXggb3BlcmF0b3JzLlxuLy9cblxuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8jIyBJbmZpeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj4ge3Joc31gLCBlZzogYGEgaXMgMWBcbi8vIE5PVEU6IGBvcGVyYXRvci50cmFuc2Zvcm1lcmAgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHR3byBhcmd1bWVudHMgKGBsaHNgIGFuZCBgcmhzYCkgaW50byBvdXRwdXQuXG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiYW5kXCIsIFwiYW5kXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybiBgKCR7YX0gJiYgJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwib3JcIiwgXCJvclwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9IHx8ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNcIiwgXCJpc1wiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ID09ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdFwiLCBcImlzIG5vdFwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXMtZXhhY3RseVwiLCBcImlzIGV4YWN0bHlcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSA9PT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXMtbm90LWV4YWN0bHlcIiwgXCJpcyBub3QgZXhhY3RseVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ICE9PSAke2J9KWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5pc09mVHlwZSh0aGluZywgdHlwZSlgXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLXR5cGUtb2ZcIiwgXCJpcyAoYXxhbilcIiwgeyB0cmFuc2Zvcm1lcih0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdC10eXBlLW9mXCIsIFwiaXMgbm90IChhfGFuKVwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzSW4odGhpbmcsIGNvbGxlY3Rpb24pYFxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1pblwiLCBcImlzIGluXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcsIGxpc3R5KSB7IHJldHVybiBgc3BlbGwuaXNJbigke3RoaW5nfSwgJHtsaXN0eX0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW9uZS1vZlwiLCBcImlzIG9uZSBvZlwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCBsaXN0eSkgeyByZXR1cm4gYHNwZWxsLmlzSW4oJHt0aGluZ30sICR7bGlzdHl9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1ub3QtaW5cIiwgXCJpcyBub3QgaW5cIiwgeyB0cmFuc2Zvcm1lcih0aGluZywgbGlzdHkpIHsgcmV0dXJuIGAhc3BlbGwuaXNJbigke3RoaW5nfSwgJHtsaXN0eX0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdC1vbmUtb2ZcIiwgXCJpcyBub3Qgb25lIG9mXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcsIGxpc3R5KSB7IHJldHVybiBgIXNwZWxsLmlzSW4oJHt0aGluZ30sICR7bGlzdHl9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0XCIsIFwiKD58aXMgZ3JlYXRlciB0aGFuKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndGVcIiwgXCIoPj18aXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibHRcIiwgXCIoPHxpcyBsZXNzIHRoYW4pXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0ZVwiLCBcIig8PXxpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8pXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfX0pO1xuXG4vL1RPRE86ICBjYW4ndCBhZGQgYCtgIGFzIGEgcnVsZSwgZml4IHRoaXMgdGhlbiBhZGQgdGhlc2VcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwicGx1c1wiLCBcIihcXFxcK3xwbHVzKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gKyAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJtaW51c1wiLCBcIigtfG1pbnVzKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gLSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJ0aW1lc1wiLCBcIihcXFxcKnx0aW1lcylcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuYCgke2F9ICogJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZGl2aWRlZC1ieVwiLCBcIigvfGRpdmlkZWQgYnkpXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSAvICR7Yn0pYCB9fSk7XG5cbi8vVE9ETzogIGArPWAgZXRjPyAgb3RoZXIgbWF0aCBmdW5jdGlvbnM/XG5cbi8vIEFkZCBpbmZpeCBvcGVyYXRvcnMgdG8gaWRlbnRpZmllciBibGFja2xpc3Rcbi8vIEhNTS4uLiBmb2xrcyBtaWdodCBjb21wbGFpbiBhYm91dCBub3QgYmVpbmcgYWJsZSB0byB1c2UgXCJhXCIgYXMgYSBzaW5nbGUgdmFyaWFibGUgbmFtZS4uLlxuLy8gVE9ETzogbWFrZSB0aGlzIHBhcnQgb2YgYGFkZEluZml4T3BlcmF0b3JgID8/P1xuLy8gVEVTVE1FXG5wYXJzZXIuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhbmRcIiwgXCJvclwiLCBcImlzXCIsIFwibm90XCIsIFwiZXhhY3RseVwiLFxuXHRcImFcIiwgXCJhblwiLCBcIm9uZVwiLCBcImdyZWF0ZXJcIiwgXCJsZXNzXCIsIFwiZXF1YWxcIixcblx0XCJwbHVzXCIsIFwibWludXNcIiwgXCJ0aW1lc1wiLCBcImRpdmlkZWRcIlxuKTtcblxucGFyc2VyLmFkZFN5bnRheChcblx0XCJpbmZpeC1vcGVyYXRvci1leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6aW5maXgtb3BlcmF0b3J9IHtyaHM6ZXhwcmVzc2lvbn1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBsaHMgPSBhcmdzLmxocy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCByaHMgPSBhcmdzLnJocy50b1NvdXJjZShjb250ZXh0KTtcblxuXHRcdFx0bGV0IHRyYW5zZm9ybWVyID0gYXJncy5vcGVyYXRvci5tYXRjaGVkLnRyYW5zZm9ybWVyO1xuXHRcdFx0cmV0dXJuIHRyYW5zZm9ybWVyKGxocywgcmhzKTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIyMgUG9zdGlmeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj5gLCBlLmcuIGBhIGlzIGRlZmluZWRgXG4vLyBOT1RFOiBgb3BlcmF0b3IudHJhbnNmb3JtZXJgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyBhcmd1bWVudCAoYGxoc2ApIGludG8gb3V0cHV0LlxuXG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtZGVmaW5lZFwiLCBcImlzIGRlZmluZWRcIiwgeyB0cmFuc2Zvcm1lcih0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gIT09ICd1bmRlZmluZWQnKWAgfX0pO1xucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzLW5vdC1kZWZpbmVkXCIsIFwiaXMgbm90IGRlZmluZWRcIiwgeyB0cmFuc2Zvcm1lcih0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gPT09ICd1bmRlZmluZWQnKWAgfX0pO1xucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzLXVuZGVmaW5lZFwiLCBcImlzIHVuZGVmaW5lZFwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzRW1wdHkodGhpbmcpYFxucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzLWVtcHR5XCIsIFwiaXMgZW1wdHlcIiwgeyB0cmFuc2Zvcm1lcih0aGluZykgeyByZXR1cm4gYHNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtbm90LWVtcHR5XCIsIFwiaXMgbm90IGVtcHR5XCIsIHsgdHJhbnNmb3JtZXIodGhpbmcpIHsgcmV0dXJuIGAhc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcblxuLy8gQWRkIHBvc3RmaXggb3BlcmF0b3JzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0XG4vLyBURVNUTUVcbnBhcnNlci5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImRlZmluZWRcIiwgXCJ1bmRlZmluZWRcIiwgXCJlbXB0eVwiXG4pO1xuXG5wYXJzZXIuYWRkU3ludGF4KFxuXHRcInBvc3RmaXgtb3BlcmF0b3ItZXhwcmVzc2lvblwiLFxuXHRcIntsaHM6ZXhwcmVzc2lvbn0ge29wZXJhdG9yOnBvc3RmaXgtb3BlcmF0b3J9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgbGhzID0gYXJncy5saHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgdHJhbnNmb3JtZXIgPSBhcmdzLm9wZXJhdG9yLm1hdGNoZWQudHJhbnNmb3JtZXI7XG5cdFx0XHRyZXR1cm4gdHJhbnNmb3JtZXIobGhzKTtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gVE9ETzogdGhpcyBzaG91bGQgcmVhbGx5IGJlIGEgZ2VuZXJhbCBcImV4cHJlc3Npb25cIi4uLlxucGFyc2VyLmFkZFN5bnRheChcIm9wZXJhdG9yLWV4cHJlc3Npb25cIiwgXCIoZXhwcmVzc2lvbjp7cG9zdGZpeC1vcGVyYXRvci1leHByZXNzaW9ufXx7aW5maXgtb3BlcmF0b3ItZXhwcmVzc2lvbn0pXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyIsImltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5pbXBvcnQgXCIuL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vcnVsZXMvaW5kZXguanNcIjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdHdpbmRvdy5UZXh0U3RyZWFtID0gVGV4dFN0cmVhbTtcblx0d2luZG93LlBhcnNlciA9IFBhcnNlcjtcblx0d2luZG93LlJ1bGUgPSBSdWxlO1xuXHR3aW5kb3cucGFyc2VyID0gcGFyc2VyO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7XG5cdFRleHRTdHJlYW0sIFBhcnNlciwgUnVsZSwgcGFyc2VyXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9pbmRleC5qcyJdLCJzb3VyY2VSb290IjoiIn0=