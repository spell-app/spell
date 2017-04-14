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

// `Type` = type name.
// MUST start with an upper-case letter (?)
//parser.addPattern("typename", /^[A-Z][\w\d\-_]*/);
_RuleSyntax2.default.Type = function (_Rule$Pattern2) {
	_inherits(Type, _Rule$Pattern2);

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
_RuleSyntax2.default.Number = function (_Rule$Pattern3) {
	_inherits(number, _Rule$Pattern3);

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
_RuleSyntax2.default.Integer = function (_Rule$Pattern4) {
	_inherits(integer, _Rule$Pattern4);

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
_RuleSyntax2.default.Text = function (_Rule$Pattern5) {
	_inherits(text, _Rule$Pattern5);

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
_RuleSyntax2.default.Boolean = function (_Rule$Pattern6) {
	_inherits(boolean, _Rule$Pattern6);

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

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
//parser.addPattern("identifier", /^[a-z][\w\d\-_]*/);
//TODO: don't accept certain keywords???
_RuleSyntax2.default.Identifier = function (_Rule$Pattern7) {
	_inherits(identifier, _Rule$Pattern7);

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
_parser2.default.identifier.addToBlacklist("about", "above", "after", "as", "at", "before", "behind", "below", "beneath", "beside", "between", "beyond", "by", "down", "during", "except", "for", "from", "in", "into", "less", "long", "minus", "more", "near", "of", "off", "on", "onto", "opposite", "out", "outside", "over", "short", "since", "than", "then", "through", "thru", "to", "toward", "towards", "under", "underneath", "until", "up", "upon", "upside", "versus", "vs", "with", "within", "without");

// Literal value as number, text or boolean.
//TODO: this is an expression... but installing it that way breaks parsing...?
_parser2.default.addSyntax("literal", "(literal:{number}|{text}|{boolean})");

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

//parser.addExpression("property-of", "{property:property-name}+ {expression}", {
//
//	# Rules for defining classes (known as `types`)
//

_parser2.default.addExpression("property-of", "(properties:the {identifier} of)+ {expression}", {
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
// parser.addInfixOperator("plus", "(\\+|plus)", { transformer(a,b) { return`(${a} + ${b})` }});
// parser.addInfixOperator("minus", "(-|minus)", { transformer(a,b) { return`(${a} - ${b})` }});
// parser.addInfixOperator("times", "(\\*|times)", { transformer(a,b) { return`(${a} * ${b})` }});
// parser.addInfixOperator("divided-by", "(/|divided by)", { transformer(a,b) { return`(${a} / ${b})` }});

// Add infix operators to identifier blacklist
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgZTVjZTZhZThmZjI2NzZiNDljZGQiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZVN5bnRheC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbInBhcnNlciIsIndpbmRvdyIsImNvbnNvbGUiLCJncm91cCIsImxvZyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInJ1bGVzIiwiY3JlYXRlIiwiYWRkUnVsZSIsIkFsdGVybmF0aXZlcyIsIm5hbWUiLCJzdHJlYW0iLCJydWxlIiwiZ2V0UnVsZSIsIlN5bnRheEVycm9yIiwiZWF0V2hpdGVzcGFjZSIsInBhcnNlIiwicmVzdWx0Iiwid2hpdGVzcGFjZSIsIm5leHQiLCJleGlzdGluZyIsImRlYnVnIiwicnVsZU5hbWUiLCJwYXR0ZXJuIiwiUGF0dGVybiIsInRva2VucyIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsInN0YXJ0SW5kZXgiLCJuZXN0aW5nIiwibmVzdGVkIiwiZW5kSW5kZXgiLCJsYXN0SW5kZXgiLCJsZW5ndGgiLCJ0b2tlbiIsInNsaWNlIiwiREVCVUciLCJSdWxlIiwicHJvcHMiLCJjbG9uZSIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsImNvbnN0cnVjdG9yIiwiZ2F0aGVyQXJndW1lbnRzIiwibWF0Y2hlZCIsImFyZ3VtZW50IiwiU3RyaW5nIiwic3RhcnRzV2l0aCIsInN0cmluZyIsIm9wdGlvbmFsIiwibWF0Y2giLCJibGFja2xpc3QiLCJ3b3JkcyIsImZvckVhY2giLCJ3b3JkIiwiS2V5d29yZCIsImtleXdvcmQiLCJSZWdFeHAiLCJTdWJydWxlIiwiTmVzdGVkIiwiU2VxdWVuY2UiLCJyZXN1bHRzIiwicHVzaCIsImpvaW4iLCJzZXF1ZW5jZSIsImFyZ3MiLCJhcmdOYW1lIiwiX2FyZyIsIkFycmF5IiwiaXNBcnJheSIsIkV4cHJlc3Npb24iLCJTdGF0ZW1lbnQiLCJiZXN0TWF0Y2giLCJjb250ZXh0IiwidG9Tb3VyY2UiLCJSZXBlYXQiLCJyZXBlYXQiLCJtYXAiLCJMaXN0IiwiaXRlbSIsImRlbGltaXRlciIsImluZGV4IiwicGFyc2VSdWxlU3ludGF4Iiwic3ludGF4IiwiU2VxdWVuY2VDb25zdHJ1Y3RvciIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInBhcnNlUnVsZVN5bnRheF90b2tlbnMiLCJTWU5UQVhfRVhQUkVTU0lPTiIsInBhcnNlUnVsZVN5bnRheF90b2tlbiIsImxhc3QiLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zdWJydWxlIiwicGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzIiwicGFyc2VSdWxlU3ludGF4X2xpc3QiLCJwYXJzZVJ1bGVTeW50YXhfcmVwZWF0IiwicGFyc2VSdWxlU3ludGF4X3N0cmluZyIsInN1YnN0ciIsInRvU3RyaW5nIiwiZmluZE5lc3RlZFRva2VucyIsImFsdGVybmF0ZXMiLCJncm91cEFsdGVybmF0ZXMiLCJjdXJyZW50IiwiaSIsImNvbmNhdCIsInN5bWJvbCIsInByb3RvdHlwZSIsImFkZFN5bnRheCIsInJ1bGVTeW50YXgiLCJlIiwiZXJyb3IiLCJhZGRTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiYWRkSW5maXhPcGVyYXRvciIsInRyYW5zZm9ybWVyIiwiYWRkUG9zdGZpeE9wZXJhdG9yIiwiV2hpdGVzcGFjZSIsIlR5cGUiLCJ0eXBlIiwicmVwbGFjZSIsIk51bWJlciIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJJbnRlZ2VyIiwicGFyc2VJbnQiLCJUZXh0IiwidGV4dCIsIkJvb2xlYW4iLCJib29sIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJhZGRUb0JsYWNrbGlzdCIsImxpc3QiLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJoZWFkIiwic3Vic3RyaW5nIiwicmFuZ2UiLCJ2YWx1ZSIsImV4cHJlc3Npb24iLCJyZXZlcnNlIiwidGhpbmciLCJhc3NpZ25tZW50Iiwic2NvcGUiLCJwbHVyYWwiLCJ0b1VwcGVyQ2FzZSIsInZhbHVlcyIsImZpcnN0IiwiZmlyc3RWYWx1ZSIsIm9yZGluYWwiLCJhIiwiYiIsImxpc3R5IiwibGhzIiwicmhzIiwib3BlcmF0b3IiXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxtREFBMkMsY0FBYzs7QUFFekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7OztBQzdEQTs7OztBQUNBOzs7Ozs7QUFFQTtBQU5BO0FBQ0E7QUFDQTtBQUtBLElBQU1BLFNBQVMsc0JBQWY7a0JBQ2VBLE07O0FB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XG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMTEpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIGU1Y2U2YWU4ZmYyNjc2YjQ5Y2RkIiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCIvLyBTcGVsbCBcIkVuZ2xpc2hcIiBwYXJzZXIgc3RyYXdtYW5cblxuLy8gVE9ETzpcdGNvbnNvbGlkYXRlIHN1YnNlcXVlbnQgbGl0ZXJhbCB3b3JkcyAvIHN0cmluZ3MgaW50byBhIHNpbmdsZSByZWdleD9cbi8vIFRPRE86XHRgdGVzdGAgZnVuY3Rpb24gZm9yIHF1aWNrIG5vLWdvb2QgaGl0IG9uIGB7YX0gYmxhaCBibGFoIHtifWA/XG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcms6ICAgYHtleHByZXNzaW9ufSBpcyB7ZXhwcmVzc2lvbn1gXG4vLyBUT0RPOlx0Y3VzdG9tIFN5bnRheEVycm9yIGV0YyB3aGljaCB1bmRlcnN0YW5kIHN0cmVhbXNcbi8vIFRPRE86XHRicmVhayBgZmlsZWAgaW50byBsaW5lcyBhbmQgcHJvY2VzcyBlYWNoIChpbmNsLiBzdWJzdHIvbWF0Y2ggbm90IGdvaW5nIGJleW9uZCB0aGUgZW5kKVxuLy8gVE9ETzpcdG5lc3RpbmcgLS0gaXMgdGhpcyBqdXN0IGluZGVudCA9IFwiYWRkIGJsb2NrIHNjb3BlXCJcbi8vIFRPRE86XHRwcm9tb3Rpb24gcGF0dGVybiBmb3IgZ2F0aGVyIGFyZ3VtZW50cyAoZWc6IGxpdGVyYWwtbGlzdCkgPz8/XG4vLyBUT0RPOlx0V2hhdCBkb2VzIHN5bnRheCB0cmVlIGxvb2sgbGlrZT8gIEhvdyBkbyB3ZSBleHRyYWN0IG1lYW5pbmcgb3V0IG9mIHRoZSBuZXN0P1xuLy8gVE9ETzpcdFJlY3ljbGUgd29yZC9zdHJpbmcvcGF0dGVybiBydWxlcyB0byBtb3JlIGVhc2lseSBzZWUgY29tbW9uYWxpdHkuLi5cbi8vIFRPRE86XHRQYXNzIGBjb250ZXh0YCB0byB0b1NvdXJjZSgpLCBhZGQgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYGNsYXNzYCwgdmFyaWFibGVzIGFuZCBjb2RlIHRvIGBtZXRob2RgLCBgZ2xvYmFsYCBzdHVmZiBldGNcblxuaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ2xvbmUgcnVsZXMsIHN0YXJ0aW5nIHdpdGggYSBjb21wbGV0ZWx5IGVtcHR5IG1hcCBpZiBub3QgZGVmaW5lZCAobm8gc3RhbmRhcmQgb2JqZWN0IGtleXMpXG5cdFx0dGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5ydWxlcyB8fCBudWxsKTtcblxuXHRcdC8vIFNldCB1cCBzdGFuZGFyZCBydWxlIGNsYXNzZXMgYXMgYWx0ZXJuYXRlc1xuXHRcdHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoKSk7XG5cdFx0dGhpcy5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoKSk7XG5cdFx0dGhpcy5hZGRSdWxlKFwiaW5maXgtb3BlcmF0b3JcIiwgbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKCkpO1xuXHRcdHRoaXMuYWRkUnVsZShcInBvc3RmaXgtb3BlcmF0b3JcIiwgbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKCkpO1xuXHR9XG5cblx0Z2V0UnVsZShuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXNbbmFtZV07XG5cdH1cblxuLy8jIyMgUGFyc2luZ1xuXG5cdC8vIFBhcnNlIGBuYW1lYGQgcnVsZSBhdCBoZWFkIG9mIGBzdHJlYW1gLlxuXHQvLyBIYW5kbGVzIG9wdGlvbmFsIGFuZCByZXBlYXRpbmcgcnVsZXMgYXMgd2VsbCBhcyBlYXRpbmcgd2hpdGVzcGFjZS5cblx0Ly8gUmV0dXJucyByZXN1bHQgb2YgcGFyc2UuXG5cdHBhcnNlKG5hbWUsIHN0cmVhbSkge1xuXHRcdGlmICh0eXBlb2Ygc3RyZWFtID09PSBcInN0cmluZ1wiKSBzdHJlYW0gPSBuZXcgVGV4dFN0cmVhbShzdHJlYW0pO1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBSdWxlICR7bmFtZX0gbm90IHVuZGVyc3Rvb2RgLCBuYW1lLCBzdHJlYW0pO1xuXHRcdHN0cmVhbSA9IHRoaXMuZWF0V2hpdGVzcGFjZShzdHJlYW0pO1xuXHRcdHJldHVybiBydWxlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdH1cblxuXHQvLyBFYXQgd2hpdGVzcGFjZSAoYWNjb3JkaW5nIHRvIGBydWxlcy53aGl0ZXNwYWNlYCkgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG5ldyBzdHJlYW0gaWYgd2UgbWF0Y2hlZCB3aGl0ZXNwYWNlLCBvdGhlcndpc2UgdGhlIHNhbWUgc3RyZWFtLlxuXHQvLyBPdGhlcndpc2UgcmV0dXJucyB0aGlzIHNhbWUgc3RyZWFtLlxuXHRlYXRXaGl0ZXNwYWNlKHN0cmVhbSkge1xuXHRcdHZhciByZXN1bHQgPSB0aGlzLnJ1bGVzLndoaXRlc3BhY2UucGFyc2UodGhpcywgc3RyZWFtKTtcblx0XHRyZXR1cm4gcmVzdWx0ID8gcmVzdWx0Lm5leHQoKSA6IHN0cmVhbTtcblx0fVxuXG4vLyMjIyBSdWxlIGZhY3Rvcmllc1xuXG5cdC8vIEFkZCBhIHJ1bGUgdG8gb3VyIGxpc3Qgb2YgcnVsZXMhXG5cdC8vIFRPRE86IGNvbnZlcnQgdG8gYGFsdGVybmF0aXZlc2Agb24gb3ZlcndyaXRlP1xuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLnJ1bGVzW25hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtuYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdGV4aXN0aW5nID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgbmFtZTogZXhpc3RpbmcubmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBleGlzdGluZztcblx0XHRcdH1cblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRpbmcgcnVsZSAnJHtydWxlLnJ1bGVOYW1lfScgdG8gJyR7bmFtZX0nOiBgLCBydWxlKTtcblx0XHRcdGV4aXN0aW5nLmFkZFJ1bGUocnVsZSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZS5ydWxlTmFtZSA9IG5hbWU7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gcnVsZTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblxuXHQvLyBBZGQgcmVnZXggYXMgYSBwYXR0ZXJuIHRvIG91ciBsaXN0IG9mIHJ1bGVzXG5cdGFkZFBhdHRlcm4obmFtZSwgcGF0dGVybiwgcHJvcGVydGllcykge1xuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuUGF0dGVybihwcm9wZXJ0aWVzKTtcblx0XHRydWxlLnBhdHRlcm4gPSBwYXR0ZXJuO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH1cblxuLy9cbi8vICMjIFV0aWxpdHkgbWV0aG9kc1xuLy9cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmAuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHN0cmVhbSwgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBzdHJlYW1gXHRcdFN0cmVhbSB3aGljaCB3YXMgbWF0Y2hlZCB3aXRoIGBzdGFydEluZGV4YCBhdCB0aGUgc3RhcnQgb2YgdGhlIG1hdGNoXG4vL1x0XHRcdC0gYGVuZEluZGV4YFx0Tm9uLWluY2x1c2l2ZSBlbmQgaW5kZXggaW4gc3RyZWFtIHdoZXJlIG1hdGNoIGVuZHMuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5nYXRoZXJBcmd1bWVudHMoKWBcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZSgpYFx0XHRcdFx0UmV0dXJuIGphdmFzY3JpcHQgc291cmNlIHRvIGludGVycHJldCB0aGUgcnVsZS5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5cbi8vVE9ETzogbWFrZSBnYXRoZXJBcmd1bWVudHMoKSBzdGF0aWMgYW5kIGNhbGwgb24gdGhpc1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0dmFyIGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCBwcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuXG4vL1xuLy8gIyMgb3V0cHV0IGFzIHNvdXJjZVxuLy9cblx0Z2V0IF9hcmcoKSB7IHJldHVybiB0aGlzLmFyZ3VtZW50IHx8IHRoaXMucnVsZU5hbWUgfHwgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lIH1cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBOb3RlIHRoYXQgd2UgZGVmaW5lIGBnYXRoZXJBcmd1bWVudHMoKWAgc3RhdGljYWxseSBvbiBlYWNoIHN1YmNsYXNzXG5cdC8vXHRhbmQgdGhlbiBpbnN0YW5jZSBtZXRob2QgY2FsbHMgaXQgb24gaXRzZWxmLlxuXHRzdGF0aWMgZ2F0aGVyQXJndW1lbnRzKHJ1bGUpIHtcblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IuZ2F0aGVyQXJndW1lbnRzKHRoaXMpO1xuXHR9XG5cblx0Ly8gT3V0cHV0IHZhbHVlIGZvciB0aGlzIElOU1RBTlRJQVRFRCBydWxlIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG5cblxuXG4vLyBSdWxlIGZvciBsaXRlcmFsIHN0cmluZyB2YWx1ZSwgd2hpY2ggaW5jbHVkZSBwdW5jdHVhdGlvbiBzdWNoIGFzIGAoYCBldGMuXG4vL1RPRE86IHJlbmFtZSBgU3ltYm9sYD8/P1xuUnVsZS5TdHJpbmcgPSBjbGFzcyBTdHJpbmcgZXh0ZW5kcyBSdWxlIHtcblx0Ly8gUGFyc2UgdGhpcyBydWxlIGF0IHRoZSBiZWdpbm5pbmcgb2YgYHN0cmVhbWAsIGFzc3VtaW5nIG5vIHdoaXRlc3BhY2UgYmVmb3JlLlxuXHQvLyBEZWZhdWx0IGlzIHRoYXQgYHJ1bGUuc3RyaW5nYCBpcyBsaXRlcmFsIHN0cmluZyB0byBtYXRjaC5cblx0Ly8gT24gbWF0Y2gsIHJldHVybnMgY2xvbmUgb2YgcnVsZSB3aXRoIGB2YWx1ZWAsIGBzdHJlYW1gIGFuZCBgZW5kSW5kZXhgLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICghc3RyZWFtLnN0YXJ0c1dpdGgodGhpcy5zdHJpbmcpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRoaXMuc3RyaW5nLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgdGhpcy5zdHJpbmcubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cbi8vIFJlZ2V4IHBhdHRlcm4uXG4vLyBgcnVsZS5wYXR0ZXJuYCBpcyB0aGUgcmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoLlxuLy8gTk9URTogdGhlIHJlZ2V4IHNob3VsZCBzdGFydCB3aXRoIGAvXi4uLmAgdG8gbWF0Y2ggYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuLy8gWW91IGNhbiBzcGVjaWZ5IGEgYHJ1bGUuYmxhY2tsaXN0YCBvZiBtYXRjaGVzIHRoYXQgd2lsbCBzcGVjaWZpY2FsbHkgTk9UIHdvcmssIGVnIGZvciBgaWRlbnRpZmllci5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHR2YXIgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5wYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYmFpbCBpZiBub3QgaW4gYmxhY2tsaXN0XG5cdFx0dmFyIG1hdGNoZWQgPSBtYXRjaFswXTtcblx0XHRpZiAodGhpcy5ibGFja2xpc3QgJiYgdGhpcy5ibGFja2xpc3RbbWF0Y2hlZF0pIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiBtYXRjaGVkLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgbWF0Y2hlZC5sZW5ndGgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdGFkZFRvQmxhY2tsaXN0KC4uLndvcmRzKSB7XG5cdFx0aWYgKCF0aGlzLmJsYWNrbGlzdCkgdGhpcy5ibGFja2xpc3QgPSB7fTtcblx0XHR3b3Jkcy5mb3JFYWNoKHdvcmQgPT4gdGhpcy5ibGFja2xpc3Rbd29yZF0gPSB0cnVlKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm47XG5cdH1cbn1cblxuXG4vLyBLZXl3b3JkIHBhdHRlcm5cbi8vXHRgcnVsZS5rZXl3b3JkYCBpcyB0aGUga2V5d29yZCBzdHJpbmcgdG8gbWF0Y2guXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHRcdC8vIGNyZWF0ZSBwYXR0ZXJuIHdoaWNoIG1hdGNoZXMgYXQgd29yZCBib3VuZGFyeVxuXHRcdGlmICghdGhpcy5wYXR0ZXJuKSB7XG5cdFx0XHRpZiAoIXRoaXMua2V5d29yZCkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIGtleXdvcmQgcHJvcGVydHlcIik7XG5cdFx0XHR0aGlzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKGBeJHt0aGlzLmtleXdvcmR9XFxcXGJgKTtcblx0XHR9XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5rZXl3b3JkfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHZhciBydWxlID0gcGFyc2VyLmdldFJ1bGUodGhpcy5ydWxlKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQXR0ZW1wdGluZyB0byBwYXJzZSB1bmtub3duIHJ1bGUgJyR7dGhpcy5uYW1lfSdgLCB0aGlzKTtcblx0XHR2YXIgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgcmVzdWx0LmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHt9XG5cblxuLy8gU2VxdWVuY2Ugb2YgcnVsZXMgdG8gbWF0Y2ggKGF1dG8tZXhjbHVkaW5nIHdoaXRlc3BhY2UpLlxuUnVsZS5TZXF1ZW5jZSA9IGNsYXNzIFNlcXVlbmNlIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFyZXN1bHQgJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vVE9ET0Ncblx0Ly8gR2F0aGVyIGFyZ3VtZW50cyBmcm9tIG91ciBwYXJzZWQgYHJlc3VsdHNgIGFycmF5LlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYHZhbHVlc2AgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGByZXN1bHRzLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYHJlc3VsdHMucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gcnVsZSB0eXBlOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdHN0YXRpYyBnYXRoZXJBcmd1bWVudHMoc2VxdWVuY2UpIHtcblx0XHRpZiAoIXNlcXVlbmNlLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IGFyZ3MgPSB7fTtcblx0XHRmb3IgKGxldCBuZXh0IG9mIHNlcXVlbmNlLnJlc3VsdHMpIHtcblx0XHRcdGxldCBhcmdOYW1lID0gbmV4dC5fYXJnO1xuXHRcdFx0Ly8gRm9yIG5lc3RlZCBydWxlcywgcmVjdXJzZSB0byBnZXQgdGhlaXIgYXJndW1lbnRzXG5cdFx0XHRsZXQgcmVzdWx0ID0gbmV4dC5nYXRoZXJBcmd1bWVudHMoKTtcblxuXHRcdFx0Ly8gSWYgYXJnIGFscmVhZHkgZXhpc3RzLCBjb252ZXJ0IHRvIGFuIGFycmF5XG5cdFx0XHRpZiAoYXJnTmFtZSBpbiBhcmdzKSB7XG5cdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShhcmdzW2FyZ05hbWVdKSkgYXJnc1thcmdOYW1lXSA9IFthcmdzW2FyZ05hbWVdXTtcblx0XHRcdFx0YXJnc1thcmdOYW1lXS5wdXNoKHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0YXJnc1thcmdOYW1lXSA9IHJlc3VsdDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGFyZ3M7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlcy5qb2luKFwiIFwiKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG5cbn1cblxuLy8gU3ludGFjdGljIHN1Z2FyIGZvciBkZWJ1Z2dpbmdcblJ1bGUuRXhwcmVzc2lvbiA9IGNsYXNzIGV4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXguXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBGaW5kIHRoZSBMT05HRVNUIG1hdGNoXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IGJlc3RNYXRjaDtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKCFtYXRjaCkgY29udGludWU7XG5cblx0XHRcdC8vIHRha2UgdGhlIGxvbmdlc3QgbWF0Y2hcblx0XHRcdGlmICghYmVzdE1hdGNoIHx8IG1hdGNoLmVuZEluZGV4ID4gYmVzdE1hdGNoLmVuZEluZGV4KVxuXHRcdFx0XHRiZXN0TWF0Y2ggPSBtYXRjaDtcblx0XHR9XG5cdFx0aWYgKCFiZXN0TWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiBiZXN0TWF0Y2gsXG5cdFx0XHRlbmRJbmRleDogYmVzdE1hdGNoLmVuZEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZSgpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAoJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGVzLmpvaW4oXCJ8XCIpfSkke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuLy8gUmVwZWF0aW5nIHJ1bGUuXG4vL1x0YHRoaXMucnVsZWAgaXMgdGhlIHJ1bGUgdGhhdCByZXBlYXRzLlxuLy9cbi8vIEFmdGVyIG1hdGNoaW5nOlxuLy9cdGB0aGlzLnJlc3VsdHNgIGlzIGFycmF5IG9mIHJlc3VsdHMgb2YgbWF0Y2hlcy5cbi8vXG4vL1x0QXV0b21hdGljYWxseSBjb25zdW1lcyB3aGl0ZXNwYWNlIGJlZm9yZSBydWxlcy5cbi8vXHRJZiBkb2Vzbid0IG1hdGNoIGF0IGxlYXN0IG9uZSwgcmV0dXJucyBgdW5kZWZpbmVkYC5cblJ1bGUuUmVwZWF0ID0gY2xhc3MgUmVwZWF0IGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBuZXh0ID0gc3RyZWFtO1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghcmVzdWx0KSBicmVhaztcblxuXHRcdFx0cmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0c3RhdGljIGdhdGhlckFyZ3VtZW50cyhyZXBlYXQpIHtcblx0XHRpZiAoIXJlcGVhdC5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiByZXBlYXQucmVzdWx0cy5tYXAoIHJlc3VsdCA9PiByZXN1bHQuZ2F0aGVyQXJndW1lbnRzKCkgKTtcblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdHRocm93IFwiRG9uJ3QgdW5kZXJzdGFuZCBob3cgdG8gc291cmNlIFJ1bGUuUmVwZWF0IVwiO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0Y29uc3QgcnVsZSA9ICh0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlID8gYCgke3RoaXMucnVsZX0pYCA6IGAke3RoaXMucnVsZX1gKTtcblx0XHRyZXR1cm4gYCR7cnVsZX0ke3RoaXMub3B0aW9uYWwgPyAnKicgOiAnKyd9YDtcblx0fVxufVxuXG5cbi8vIExpc3QgbWF0Y2ggcnVsZTogICBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAuIGVnXCIgYFt7bnVtYmVyfSxdYCB0byBtYXRjaCBgMSwyLDNgXG4vL1x0YHJ1bGUuaXRlbWAgaXMgdGhlIHJ1bGUgZm9yIGVhY2ggaXRlbSxcbi8vXHRgcnVsZS5kZWxpbWl0ZXJgIGlzIHRoZSBkZWxpbWl0ZXIgYmV0d2VlbiBlYWNoIGl0ZW0uXG4vLyBcdGBydWxlLnJlc3VsdHNgIGluIHRoZSBvdXRwdXQgaXMgdGhlIGxpc3Qgb2YgdmFsdWVzLlxuLy9cbi8vXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhIExpc3QgcnVsZSB3aWxsIE5PVCByZXBlYXQgKD8/Pz8pXG5SdWxlLkxpc3QgPSBjbGFzcyBMaXN0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0dmFyIHJlc3VsdHMgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdHJlc3VsdHMucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFkZWxpbWl0ZXIpIGJyZWFrO1xuXHRcdFx0bmV4dCA9IGRlbGltaXRlci5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybiBtYXRjaGVkIGl0ZW0gYnkgaW5kZXhcblx0Z2V0SXRlbShpbmRleCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLnJlc3VsdHNbaW5kZXhdO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XHRcdC8vIFRPRE86IHRocm93Pz8/XG5cdFx0bGV0IHJlc3VsdHMgPSB0aGlzLnJlc3VsdHMubWFwKCByZXN1bHQgPT4gcmVzdWx0LnRvU291cmNlKCkgKS5qb2luKFwiLCBcIik7XG5cdFx0cmV0dXJuIGBbJHtyZXN1bHRzfV1gO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gcmUtZXhwb3J0IFJ1bGUgZm9yIHRlc3RpbmdcbmV4cG9ydCBkZWZhdWx0IFJ1bGU7XG5cbi8vXG4vL1x0IyBQYXJzaW5nIGBydWxlU3ludGF4YCB0byBjcmVhdGUgcnVsZXMgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUT0RPOlx0UHVsbCBgcGFyc2VSdWxlU3ludGF4YCBzdHVmZiBvdXQgaW50byBzZXBhcmF0ZSBtb2R1bGU/XG4vLyBUT0RPOlx0QmV0dGVyIG5hbWUgZm9yIGBydWxlU3ludGF4YFxuLy8gVE9ETzpcdFVzZSBrZXl3b3JkcyBpbiBzeW50YXggdG8gbWFrZSBhIHF1aWNrIHJlZ2V4LWJhc2VkIGB0ZXN0YCBmdW5jdGlvbiBmb3IgdGhlIGVudGlyZSBydWxlXG5PYmplY3QuYXNzaWduKFJ1bGUsIHtcblxuLy9cbi8vICMjIGdyb3VwOiBwYXJzaW5nIHN5bnRheFxuLy9cblxuLy8gVE9ETzogY29udmVydCB0byBUZXh0U3RyZWFtIHBhdHRlcm4gYWxhIG5vcm1hbCBwYXJzZXIgb25jZSB0aGF0IHNldHRsZXMgZG93bj8/P1xuXHRwYXJzZVJ1bGVTeW50YXgoc3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIFtdKTtcblxuXHRcdGxldCBydWxlO1xuXHRcdC8vIElmIHdlIG9ubHkgZ290IG9uZSB0aGluZywgcmV0dXJuIHRoYXQgYXMgdGhlIHJlc3VsdFxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSBydWxlc1swXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFNlcXVlbmNlQ29uc3RydWN0b3IoeyBydWxlcyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fSxcblxuXHR0b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KSB7XG5cdFx0Y29uc3QgU1lOVEFYX0VYUFJFU1NJT04gPSAvKD86W1xcd1xcLV0rfFxcXFxbXFxbXFwoXFx7XFwpXFx9XFxdXXxbXlxcc1xcd118XFx8KS9nO1xuXHRcdHZhciBzeW50YXhTdHJlYW0gPSBzeW50YXgubWF0Y2goU1lOVEFYX0VYUFJFU1NJT04pO1xuXHRcdGlmICghc3ludGF4U3RyZWFtKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHRva2VuaXplIHBhcnNlIHJ1bGUgc3ludGF4ID4+JHtzeW50YXh9PDxgKTtcblx0XHRyZXR1cm4gc3ludGF4U3RyZWFtO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbGFzdEluZGV4ID0gc3ludGF4U3RyZWFtLmxlbmd0aDtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKHJ1bGUpIHtcblx0XHRcdFx0dmFyIGxhc3QgPSBydWxlc1tydWxlcy5sZW5ndGgtMV07XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgU3RyaW5nYCBhbmQgbGFzdCB3YXMgYSBgU3RyaW5nYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0aWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuU3RyaW5nICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN0cmluZykge1xuXHRcdFx0XHRcdGxhc3Quc3RyaW5nICs9IHJ1bGUuc3RyaW5nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJ1bGVzLnB1c2gocnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHN0YXJ0SW5kZXggPSBlbmRJbmRleCArIDE7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlcztcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDApIHtcblx0XHR2YXIgc3ludGF4VG9rZW4gPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHRzd2l0Y2ggKHN5bnRheFRva2VuKSB7XG5cdFx0XHRjYXNlIFwie1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIipcIjpcblx0XHRcdGNhc2UgXCIrXCI6XG5cdFx0XHRjYXNlIFwiP1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblxuXHRcdFx0Ly8gdGhlIGZvbGxvd2luZyBzaG91bGQgQUxXQVlTIGJlIGNvbnN1bWVkIGJ5IHRoZSBhYm92ZVxuXHRcdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGNhc2UgXCIpXCI6XG5cdFx0XHRjYXNlIFwiXVwiOlxuXHRcdFx0Y2FzZSBcInxcIjpcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7c3ludGF4VG9rZW59IGZvdW5kIGFzIGl0ZW0gJHtzdGFydEluZGV4fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdLCBydWxlO1xuXHRcdC8vIElmIGxldHRlcnMgb25seSwgbWF0Y2ggYXMgYSBLZXl3b3JkIChzbyB3ZSByZXF1aXJlIGEgd29yZCBib3VuZGFyeSBhZnRlciB0aGUgc3RyaW5nKS5cblx0XHRpZiAoc3RyaW5nLm1hdGNoKC9bQS1aYS16XSsvKSkge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLktleXdvcmQoeyBrZXl3b3JkOiBzdHJpbmcgfSk7XG5cdFx0fVxuXHRcdC8vIE90aGVyd2lzZSBtYXRjaCBhcyBhIFN0cmluZywgd2hpY2ggZG9lc24ndCByZXF1aXJlIG5vbi13b3JkIGNoYXJzIGFmdGVyIHRoZSB0ZXh0LlxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlN0cmluZyh7IHN0cmluZzogc3RyaW5nIH0pO1xuXHRcdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRcdGlmIChzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIikpIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIGxlYWRpbmcgc2xhc2ggaW4gbWF0Y2ggc3RyaW5nLi4uXG5cdFx0XHRcdHJ1bGUuc3RyaW5nID0gcnVsZS5zdHJpbmcuc3Vic3RyKDEpO1xuXHRcdFx0XHQvLyBidXQgbGVhdmUgaXQgaW4gdG9TdHJpbmdcblx0XHRcdFx0cnVsZS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnRJbmRleCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdC8vIE5PVEU6IG5lc3RlZCBwYXJlbnMgbWF5IG5vdCBoYXZlIGFsdGVybmF0aXZlcy4uLiA6LSggICBgKGF8KGJ8YykpYCB3b24ndCB3b3JrPz8/XG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiKFwiLCBcIilcIiwgc3RhcnRJbmRleCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0Ly8gc3BsaXQgaW50byBncm91cHMsIGluY2x1ZGluZyBuZXN0ZWQgcGFyZW5zXG5cdFx0bGV0IGFsdGVybmF0ZXMgPVxuXHRcdFx0Z3JvdXBBbHRlcm5hdGVzKHNsaWNlKVxuXHRcdFx0Lm1hcChmdW5jdGlvbihncm91cCkge1xuXHRcdFx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2Vucyhncm91cCwgW10pO1xuXHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0c1swXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IFJ1bGUuU2VxdWVuY2UoeyBydWxlczogcmVzdWx0cyB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRsZXQgcnVsZSA9IGFsdGVybmF0ZXMubGVuZ3RoID09PSAxID8gYWx0ZXJuYXRlc1swXSA6IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVzOiBhbHRlcm5hdGVzIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cblx0XHRmdW5jdGlvbiBncm91cEFsdGVybmF0ZXModG9rZW5zKSB7XG5cdFx0XHR2YXIgYWx0ZXJuYXRlcyA9IFtdO1xuXHRcdFx0dmFyIGN1cnJlbnQgPSBbXTtcblx0XHRcdGZvciAodmFyIGkgPSAwLCB0b2tlbjsgdG9rZW4gPSB0b2tlbnNbaV07IGkrKykge1xuXHRcdFx0XHQvLyBoYW5kbGUgYWx0ZXJuYXRlIG1hcmtlclxuXHRcdFx0XHRpZiAodG9rZW4gPT09IFwifFwiKSB7XG5cdFx0XHRcdFx0YWx0ZXJuYXRlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBbXTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBoYW5kbGUgbmVzdGVkIHBhcmVuc1xuXHRcdFx0XHRlbHNlIGlmICh0b2tlbiA9PT0gXCIoXCIpIHtcblx0XHRcdFx0XHRsZXQgeyBlbmRJbmRleCB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBcIihcIiwgXCIpXCIsIGkpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBjdXJyZW50LmNvbmNhdCh0b2tlbnMuc2xpY2UoaSwgZW5kSW5kZXggKyAxKSk7XG5cdFx0XHRcdFx0aSA9IGVuZEluZGV4O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGN1cnJlbnQucHVzaCh0b2tlbik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChjdXJyZW50Lmxlbmd0aCkgYWx0ZXJuYXRlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0cmV0dXJuIGFsdGVybmF0ZXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIHJlcGVhdCBpbmRpY2F0b3IgYD9gLCBgK2Agb3IgYCpgIGJ5IGF0dGFjaGluZyBpdCB0byB0aGUgcHJldmlvdXMgcnVsZS5cblx0cGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0dmFyIHN5bWJvbCA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblx0XHR2YXIgcnVsZSA9IHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBhdHRhY2ggcmVwZWF0IHN5bWJvbCAke3N5bWJvbH0gdG8gZW1wdHkgcnVsZSFgKTtcblxuXHRcdC8vIFRyYW5zZm9ybSBsYXN0IHJ1bGUgaW50byBhIHJlcGVhdCBmb3IgYCpgIGFuZCBgK2AuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCIqXCIgfHwgc3ltYm9sID09PSBcIitcIikge1xuXHRcdFx0bGV0IGFyZ3VtZW50ID0gcnVsZS5hcmd1bWVudDtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5SZXBlYXQoeyBydWxlIH0pO1xuXHRcdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0XHQvLyBwdXNoIGludG8gcnVsZSBzdGFjayBpbiBwbGFjZSBvZiBvbGQgcnVsZVxuXHRcdFx0cnVsZXNbcnVsZXMubGVuZ3RoIC0gMV0gPSBydWxlO1xuXHRcdH1cblxuXHRcdC8vIFJ1bGUgaXMgb3B0aW9uYWwgZm9yIGA/YCBhbmQgYCpgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiP1wiIHx8IHN5bWJvbCA9PT0gXCIqXCIpIHtcblx0XHRcdHJ1bGUub3B0aW9uYWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBbIHVuZGVmaW5lZCwgc3RhcnRJbmRleCBdXG5cdH0sXG5cblx0Ly8gTWF0Y2ggYHs8cnVsZU5hbWU+fWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IG1hdGNoID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIntcIiwgXCJ9XCIsIHN0YXJ0SW5kZXgpO1xuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID09PSAzICYmIG1hdGNoLnNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBtYXRjaC5zbGljZVswXTtcblx0XHRcdG1hdGNoLnNsaWNlID0gbWF0Y2guc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPiAxKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHByb2Nlc3MgcnVsZXMgd2l0aCBtb3JlIHRoYW4gb25lIHJ1bGUgbmFtZTogeyR7bWF0Y2guc2xpY2Uuam9pbihcIlwiKX19YCk7XG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5TdWJydWxlKHsgcnVsZTogbWF0Y2guc2xpY2VbMF0gfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgbWF0Y2guZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBsaXN0IGV4cHJlc3Npb24gYFs8aXRlbT48ZGVsaW1pdGVyPl1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIltcIiwgXCJdXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHRpZiAocmVzdWx0cy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCBzdHVmZiBhdCBlbmQgb2YgbGlzdDogWyR7c2xpY2Uuam9pbihcIiBcIil9XWApO1xuXHRcdH1cblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLkxpc3QoKTtcblx0XHRydWxlLml0ZW0gPSByZXN1bHRzWzBdXG5cdFx0cnVsZS5kZWxpbWl0ZXIgPSByZXN1bHRzWzFdXG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxufSk7XG5cblxuXG4vLyAjIyAgQWRkIG1ldGhvZHMgdG8gUGFyc2VyIHRvIGRlZmluZSBydWxlcyB1c2luZyB0aGUgYWJvdmUgc3ludGF4LlxuT2JqZWN0LmFzc2lnbihQYXJzZXIucHJvdG90eXBlLCB7XG5cblx0Ly8gUGFyc2UgYSBgcnVsZVN5bnRheGAgcnVsZSBhbmQgYWRkIGl0IHRvIG91ciBsaXN0IG9mIHJ1bGVzLlxuXHQvLyBSZXR1cm5zIHRoZSBuZXcgcnVsZS5cblx0Ly8gTG9ncyBwYXJzaW5nIGVycm9ycyBidXQgYWxsb3dzIHRoaW5ncyB0byBjb250aW51ZS5cblx0YWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3Rvcik7XG5cblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0fVxuXHR9LFxuXG5cdGFkZFN0YXRlbWVudChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBSdWxlLlN0YXRlbWVudCk7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJzdGF0ZW1lbnRcIiwgcnVsZSk7XG5cdH0sXG5cblx0YWRkRXhwcmVzc2lvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBSdWxlLkV4cHJlc3Npb24pO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBydWxlKTtcblx0fSxcblxuXHQvLyBBZGQgaW5maXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIG9yIGJcIlxuXHRhZGRJbmZpeE9wZXJhdG9yKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudHJhbnNmb3JtZXIpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgaW5maXggb3BlcmF0b3IgcnVsZSAnJHtuYW1lfScgdG8gc3BlY2lmeSAndHJhbnNmb3JtZXInIGZ1bmN0aW9uYClcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJpbmZpeC1vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gQWRkIHBvc3RmaXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIGlzIGRlZmluZWRcIlxuXHRhZGRQb3N0Zml4T3BlcmF0b3IobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50cmFuc2Zvcm1lcikge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBwb3N0Zml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RyYW5zZm9ybWVyJyBmdW5jdGlvbmApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcInBvc3RmaXgtb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9XG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlU3ludGF4LmpzIiwiLy9cbi8vXHQjIENvcmUgYHJ1bGVzYCAtLSBzaW1wbGUgZGF0YXR5cGVzLCBldGMuXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vL1xuLy8gUmVnZXggcGF0dGVybiBydWxlcyB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvcnMgZm9yIGRlYnVnZ2luZ1xuLy9cbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJ3aGl0ZXNwYWNlXCIsIC9eXFxzKy8pO1xuUnVsZS5XaGl0ZXNwYWNlID0gY2xhc3Mgd2hpdGVzcGFjZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fVxucGFyc2VyLmFkZFJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIG5ldyBSdWxlLldoaXRlc3BhY2UoeyBwYXR0ZXJuOiAvXlxccysvLCBvcHRpb25hbDogdHJ1ZSB9KSk7XG5cbi8vIGBUeXBlYCA9IHR5cGUgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhbiB1cHBlci1jYXNlIGxldHRlciAoPylcbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJ0eXBlbmFtZVwiLCAvXltBLVpdW1xcd1xcZFxcLV9dKi8pO1xuUnVsZS5UeXBlID0gY2xhc3MgVHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoXCJUeXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvXltBLVpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHR5cGUpO1xuXG5cbi8vIGBudW1iZXJgIGFzIGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG5SdWxlLk51bWJlciA9IGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBudW1iZXIgPSBwYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgUnVsZS5OdW1iZXIoe1xuXHRwYXR0ZXJuOiAvXi0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VGbG9hdCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG51bWJlcik7XG5cblxuLy8gTnVtZXJpYyBgaW50ZWdlcmAgb25seSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gTk9URTogdGhpcyBXSUxMIG1hdGNoIGEgZmxvYXQsIGJ1dCB0aGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBjb2VyY2UgdG8gYW4gaW50ZWdlci5cbi8vIFJFVklFVzogaXMgdGhpcyByaWdodD8gIEJldHRlciB0byBub3QgbWF0Y2ggYSBmbG9hdD9cblJ1bGUuSW50ZWdlciA9IGNsYXNzIGludGVnZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImludGVnZXJcIiwgbmV3IFJ1bGUuSW50ZWdlcih7XG5cdHBhdHRlcm46IC9eLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0ZXh0ID0gcGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyBSdWxlLlRleHQoe1xuXHRwYXR0ZXJuOiAvXig/OlwiW15cIl0qXCJ8J1teJ10qJykvXG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdGV4dCk7XG5cblxuLy8gQm9vbGVhbiBsaXRlcmFsLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBUT0RPOiBiZXR0ZXIgbmFtZSBmb3IgdGhpcz8/P1xuUnVsZS5Cb29sZWFuID0gY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBib29sID0gcGFyc2VyLmFkZFJ1bGUoXCJib29sZWFuXCIsIG5ldyBSdWxlLkJvb2xlYW4oe1xuXHRwYXR0ZXJuOiAvXih0cnVlfGZhbHNlfHllc3xub3xzdWNjZXNzfGZhaWx1cmV8b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwic3VjY2Vzc1wiOlxuXHRcdFx0Y2FzZSBcIm9rXCI6XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGJvb2wpO1xuXG5cbi8vIGBpZGVudGlmaWVyYCA9IHZhcmlhYmxlcyBvciBwcm9wZXJ0eSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGEgbG93ZXItY2FzZSBsZXR0ZXIgKD8pXG4vL3BhcnNlci5hZGRQYXR0ZXJuKFwiaWRlbnRpZmllclwiLCAvXlthLXpdW1xcd1xcZFxcLV9dKi8pO1xuLy9UT0RPOiBkb24ndCBhY2NlcHQgY2VydGFpbiBrZXl3b3Jkcz8/P1xuUnVsZS5JZGVudGlmaWVyID0gY2xhc3MgaWRlbnRpZmllciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBpZGVudGlmaWVyID0gcGFyc2VyLmFkZFJ1bGUoXCJpZGVudGlmaWVyXCIsIG5ldyBSdWxlLklkZW50aWZpZXIoe1xuXHRwYXR0ZXJuOiAvXlthLXpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGlkZW50aWZpZXIpO1xuXG4vLyBTdGljayBgaWRlbnRpZmllcmAgb24gYHBhcnNlcmAgc28gd2UgY2FuIGFkZCB0byBpdHMgYmxhY2tsaXN0IGVhc2lseS5cbnBhcnNlci5pZGVudGlmaWVyID0gaWRlbnRpZmllcjtcblxuLy8gQWRkIEVuZ2xpc2ggcHJlcG9zaXRpb25zIGFzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYWJvdXRcIiwgXCJhYm92ZVwiLCBcImFmdGVyXCIsIFwiYXNcIiwgXCJhdFwiLFxuXHRcImJlZm9yZVwiLCBcImJlaGluZFwiLCBcImJlbG93XCIsIFwiYmVuZWF0aFwiLCBcImJlc2lkZVwiLCBcImJldHdlZW5cIiwgXCJiZXlvbmRcIiwgXCJieVwiLFxuXHRcImRvd25cIiwgXCJkdXJpbmdcIixcblx0XCJleGNlcHRcIixcblx0XCJmb3JcIiwgXCJmcm9tXCIsXG5cdFwiaW5cIiwgXCJpbnRvXCIsXG5cdFwibGVzc1wiLCBcImxvbmdcIixcblx0XCJtaW51c1wiLCBcIm1vcmVcIixcblx0XCJuZWFyXCIsXG5cdFwib2ZcIiwgXCJvZmZcIiwgXCJvblwiLCBcIm9udG9cIiwgXCJvcHBvc2l0ZVwiLCBcIm91dFwiLCBcIm91dHNpZGVcIiwgXCJvdmVyXCIsXG5cdFwic2hvcnRcIiwgXCJzaW5jZVwiLFxuXHRcInRoYW5cIiwgXCJ0aGVuXCIsIFwidGhyb3VnaFwiLCBcInRocnVcIiwgXCJ0b1wiLCBcInRvd2FyZFwiLCBcInRvd2FyZHNcIixcblx0XCJ1bmRlclwiLCBcInVuZGVybmVhdGhcIiwgXCJ1bnRpbFwiLCBcInVwXCIsIFwidXBvblwiLCBcInVwc2lkZVwiLFxuXHRcInZlcnN1c1wiLCBcInZzXCIsXG5cdFwid2l0aFwiLCBcIndpdGhpblwiLCBcIndpdGhvdXRcIixcbik7XG5cbi8vIExpdGVyYWwgdmFsdWUgYXMgbnVtYmVyLCB0ZXh0IG9yIGJvb2xlYW4uXG4vL1RPRE86IHRoaXMgaXMgYW4gZXhwcmVzc2lvbi4uLiBidXQgaW5zdGFsbGluZyBpdCB0aGF0IHdheSBicmVha3MgcGFyc2luZy4uLj9cbnBhcnNlci5hZGRTeW50YXgoXCJsaXRlcmFsXCIsIFwiKGxpdGVyYWw6e251bWJlcn18e3RleHR9fHtib29sZWFufSlcIik7XG5cblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxubGV0IGxpc3QgPSBwYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsLWxpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdHtcblx0XHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzWzFdO1xuXHRcdH0sXG5cdFx0Ly8gcmV0dXJuIGp1c3QgdGhlIGxpc3QgYXMgb3VyIHNvdXJjZVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcbiBcdFx0XHRyZXR1cm4gdGhpcy5nYXRoZXJBcmd1bWVudHMoKS50b1NvdXJjZSgpO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJcbi8vIFRPRE86IGNvbnZlcnQgdG8gbGluZS1hd2FyZSBzdHJlYW0/Pz9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRTdHJlYW0ge1xuXHQvLyBZb3UgY2FuIGNvbnN0cnVjdCB3aXRoIGEgdGV4dCBzdHJpbmcgb3IgYSBzZXQgb2YgcHJvcGVydGllcyAoaW5jbHVkaW5nIGB0ZXh0YCkuXG5cdGNvbnN0cnVjdG9yKHRleHRPclByb3BzKSB7XG5cdFx0aWYgKHR5cGVvZiB0ZXh0T3JQcm9wcyA9PT0gXCJzdHJpbmdcIilcblx0XHRcdHRoaXMudGV4dCA9IHRleHRPclByb3BzO1xuXHRcdGVsc2Vcblx0XHRcdE9iamVjdC5hc3NpZ24odGhpcywgdGV4dE9yUHJvcHMpO1xuXG5cdFx0Ly8gTWFrZSBzdXJlIGB0ZXh0YCBpcyBkZWZpbmVkLlxuXHRcdGlmICghKFwidGV4dFwiIGluIHRoaXMpKSB0aGlzLnRleHQgPSBcIlwiO1xuXHRcdGlmICghKFwic3RhcnRJbmRleFwiIGluIHRoaXMpKSB0aGlzLnN0YXJ0SW5kZXggPSAwO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGFuIGltbXV0YWJsZSBjbG9uZSBvZiB0aGUgc3RyZWFtLlxuXHRjbG9uZShwcm9wcykge1xuXHRcdGxldCBjbG9uZSA9IG5ldyBUZXh0U3RyZWFtKHRoaXMpO1xuXHRcdE9iamVjdC5hc3NpZ24oY2xvbmUsIHByb3BzKTtcblx0XHRyZXR1cm4gY2xvbmU7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNlZCB0byBuZXcgc3RhcnRJbmRleC5cblx0YWR2YW5jZVRvKHN0YXJ0SW5kZXgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXggfSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNpbmcgc3RhcnRJbmRleCBCWSBgbGVuZ3RoYFxuXHRhZHZhbmNlQnkobGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG5cdH1cblxuLy8gXHQvLyBSZXR1cm4gY2xvbmUgb2YgdGhpcyBzdHJlYW0gd2l0aCBlbmRJbmRleCBzZXQgdG8gc3RhcnQgKyBgbGVuZ3RoYFxuLy8gXHRlbmRBZnRlcihsZW5ndGgpIHtcbi8vIFx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IGVuZEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG4vLyBcdH1cblxuLy9cbi8vICMjIE1hdGNoaW5nXG4vL1xuXHQvLyBNYXRjaCBgcGF0dGVybmAgYXMgcmVnZXggYXQgaGVhZCBvZiBzdHJlYW0uXG5cdC8vIE5PVEU6IHJlZ2V4ZXMgc2hvdWxkIHN0YXJ0IHdpdGggYF5gIVxuXHQvLyBSZXR1cm5zIG1hdGNoIG9yIHVuZGVmaW5lZC5cblx0bWF0Y2gocGF0dGVybikge1xuXHRcdGlmICghKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBUZXh0U3RyZWFtLm1hdGNoKCR7cGF0dGVybn0pOiBleHBlY3RlZCBSZWdFeHBgKTtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQubWF0Y2gocGF0dGVybik7XG5cdH1cblxuXHRzdGFydHNXaXRoKHN0cmluZykge1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5zdGFydHNXaXRoKHN0cmluZyk7XG5cdH1cblxuXG4vL1xuLy8gIyMgUmVmbGVjdGlvblxuLy9cblx0Ly8gUmV0dXJuIHRleHQgb2Ygc3RyaW5nIHN0YXJ0aW5nIGF0IG91ciBgc3RhcnRJbmRleGBcblx0Z2V0IGhlYWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMucmFuZ2UoKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIHJhbmdlIG9mIHRoZSBzdHJpbmcgZnJvbSBgc3RhcnRJbmRleGAgdG8gYGVuZEluZGV4YCBOT04taW5jbHVzaXZlLlxuXHRyYW5nZShzdGFydEluZGV4ID0gdGhpcy5zdGFydEluZGV4LCBlbmRJbmRleCA9IHRoaXMudGV4dC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0LnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmRJbmRleCk7XG5cdH1cblxuXHQvLyBMZW5ndGggb2YgdGhlIHN0cmVhbS5cblx0Z2V0IGxlbmd0aCgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0Lmxlbmd0aDtcblx0fVxuXG5cdC8vIEFyZSB3ZSBhdCB0aGUgZW5kIG9mIHRoZSBzdHJlYW0/XG5cdGdldCBpc0VtcHR5KCkge1xuXHRcdHJldHVybiB0aGlzLnN0YXJ0SW5kZXggPT09IHRoaXMubGVuZ3RoO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dFxuXHR9O1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1RleHRTdHJlYW0uanMiLCJpbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gbG9hZCBzdGFuZGFyZCBydWxlcyBmaWxlcyBoZXJlXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbnVtYmVyc1wiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vYXNzaWdubWVudFwiO1xuaW1wb3J0IFwiLi9jbGFzc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBUT0RPOiB7cHJvcGVydHktZXhwcmVzc2lvbn0gYWxzbyB3b3Jrcy4uLiB7YXNzaWduYWJsZS1leHByZXNzaW9ufSA/Pz9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsIFwie2lkZW50aWZpZXJ9ID0ge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdGxldCB2YWx1ZSA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdC8vIFRPRE86IGRlY2xhcmUgaWRlbnRpZmllciBpZiBub3QgaW4gc2NvcGUsIGV0Y1xuXHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSA9ICR7dmFsdWV9YDtcblx0fVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvYXNzaWdubWVudC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVmaW5pbmcgY2xhc3NlcyAoa25vd24gYXMgYHR5cGVzYClcbi8vXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy9wYXJzZXIuYWRkRXhwcmVzc2lvbihcInByb3BlcnR5LW9mXCIsIFwie3Byb3BlcnR5OnByb3BlcnR5LW5hbWV9KyB7ZXhwcmVzc2lvbn1cIiwge1xucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJwcm9wZXJ0eS1vZlwiLCBcIihwcm9wZXJ0aWVzOnRoZSB7aWRlbnRpZmllcn0gb2YpKyB7ZXhwcmVzc2lvbn1cIiwge1xuIFx0Z2F0aGVyQXJndW1lbnRzKCkge1xuXHRcdGxldCBhcmdzID0gUnVsZS5FeHByZXNzaW9uLmdhdGhlckFyZ3VtZW50cyh0aGlzKTtcblx0XHQvLyB0cmFuc2Zvcm0gcHJvcGVydGllcyBhbmQgcmV2ZXJzZSBvcmRlclxuXHRcdGFyZ3MucHJvcGVydGllcyA9IGFyZ3MucHJvcGVydGllcy5tYXAoIHNlcXVlbmNlID0+IHNlcXVlbmNlLmlkZW50aWZpZXIgKS5yZXZlcnNlKCk7XG5cdFx0cmV0dXJuIGFyZ3M7XG4gXHR9LFxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0bGV0IHRoaW5nID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0bGV0IHByb3BlcnRpZXMgPSBhcmdzLnByb3BlcnRpZXMubWFwKCBpZGVudGlmaWVyID0+IGlkZW50aWZpZXIudG9Tb3VyY2UoKSApLmpvaW4oXCIuXCIpO1xuXHRcdHJldHVybiBgc3BlbGwuZ2V0KCR7dGhpbmd9LCAnJHtwcm9wZXJ0aWVzfScpYDtcblx0fVxufSk7XG5cblxuXG5wYXJzZXIuYWRkU3ludGF4KFwic2NvcGUtbW9kaWZpZXJcIiwgXCIoc2NvcGU6Z2xvYmFsfGNvbnN0YW50fHNoYXJlZClcIik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZS1wcm9wZXJ0eVwiLFxuXHRcIntzY29wZS1tb2RpZmllcn0/IHthc3NpZ25tZW50fVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGlkZW50aWZpZXIgPSBhcmdzLmFzc2lnbm1lbnQuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IHZhbHVlID0gYXJncy5hc3NpZ25tZW50LmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRcdGxldCBhc3NpZ25tZW50ID0gYCR7aWRlbnRpZmllcn0gPSAke3ZhbHVlfWA7XG5cblx0XHRcdHZhciBzY29wZSA9IGFyZ3Muc2NvcGUgPyBhcmdzLnNjb3BlLnRvU291cmNlKCkgOiBcImxvY2FsXCI7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJnbG9iYWxcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGdsb2JhbC4ke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwiY29uc3RhbnRcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGNvbnN0ICR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJzaGFyZWRcIjpcblx0XHRcdFx0XHRyZXR1cm4gYHN0YXRpYyAke2Fzc2lnbm1lbnR9YDtcblxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBhc3NpZ25tZW50O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuLy8gVE9ETzogd2FybiBvbiBpbnZhbGlkIHNldD8gIHNoYXJlZD8gIHVuZGVmaW5lZD8gc29tZXRoaW5nIG90aGVyIHRoYW4gdGhlIGZpcnN0IHZhbHVlIGFzIGRlZmF1bHQ/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmUtcHJvcGVydHktYXMtb25lLW9mXCIsXG5cdFwie2lkZW50aWZpZXJ9IGFzIG9uZSBvZiB7bGlzdDpsaXRlcmFsLWxpc3R9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IHBsdXJhbCA9IChpZGVudGlmaWVyICsgXCJfVkFMVUVTXCIpLnRvVXBwZXJDYXNlKCk7XG5cdFx0XHRsZXQgbGlzdCA9IGFyZ3MubGlzdC5saXN0O1xuXHRcdFx0bGV0IHZhbHVlcyA9IGxpc3QudG9Tb3VyY2UoKTtcblx0XHRcdGxldCBmaXJzdCA9IGxpc3QucmVzdWx0c1swXTtcblx0XHRcdGxldCBmaXJzdFZhbHVlID0gZmlyc3QgPyBmaXJzdC50b1NvdXJjZSgpIDogXCJ1bmRlZmluZWRcIjtcblxuXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9O1xcbmBcblx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9IHsgcmV0dXJuIChcIl9fJHtpZGVudGlmaWVyfVwiIGluIHRoaXMgPyB0aGlzLl9fJHtpZGVudGlmaWVyfSA6ICR7Zmlyc3RWYWx1ZX0pIH1cXG5gXG5cdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy5jb25zdHJ1Y3Rvci4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1cXG5gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NsYXNzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWFsaW5nIHdpdGggbnVtYmVyc1xuLy9cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vLyBOdW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nLlxucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJpbmRleC1leHByZXNzaW9uXCIsIFwiaXRlbSB7bnVtYmVyOmludGVnZXJ9IG9mIHtleHByZXNzaW9ufVwiLCB7XG5cdHRvU291cmNlKCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgbnVtYmVyID0gYXJncy5udW1iZXIudG9Tb3VyY2UoKTtcblx0XHRsZXQgZXhwcmVzc2lvbiA9IGFyZ3MuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke251bWJlcn0pYDtcblx0fVxufSk7XG5cbi8vIEVuZ2xpc2ggd29yZHMgdXNlZCBmb3IgcG9zaXRpb24gb2Ygc29tZXRoaW5nIGluIGEgbGlzdC5cbi8vIFRPRE86IGBzZXZlbnR5LXNldmVudGhgLCBgdGhpcmQtdG8tbGFzdGAuLi5cbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiKGZpcnN0fHNlY29uZHx0aGlyZHxmb3VydGh8ZmlmdGh8c2l4dGh8c2V2ZW50aHxlaWdodGh8bmludGh8dGVudGh8cGVudWx0aW1hdGV8bGFzdHxmaW5hbClcIiwge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IG9yZGluYWwgPSB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoKTtcblx0XHRzd2l0Y2ggKG9yZGluYWwpIHtcblx0XHRcdGNhc2UgXCJmaXJzdFwiOlx0XHRyZXR1cm4gMTtcblx0XHRcdGNhc2UgXCJzZWNvbmRcIjpcdFx0cmV0dXJuIDI7XG5cdFx0XHRjYXNlIFwidGhpcmRcIjpcdFx0cmV0dXJuIDM7XG5cdFx0XHRjYXNlIFwiZm91cnRoXCI6XHRcdHJldHVybiA0O1xuXHRcdFx0Y2FzZSBcImZpZnRoXCI6XHRcdHJldHVybiA1O1xuXHRcdFx0Y2FzZSBcInNpeHRoXCI6XHRcdHJldHVybiA2O1xuXHRcdFx0Y2FzZSBcInNldmVudGhcIjpcdFx0cmV0dXJuIDc7XG5cdFx0XHRjYXNlIFwiZWlnaHRoXCI6XHRcdHJldHVybiA4O1xuXHRcdFx0Y2FzZSBcIm5pbnRoXCI6XHRcdHJldHVybiA5O1xuXHRcdFx0Y2FzZSBcInRlbnRoXCI6XHRcdHJldHVybiAxMDtcblx0XHRcdGNhc2UgXCJwZW51bHRpbWF0ZVwiOlx0cmV0dXJuIC0yO1xuXHRcdFx0Y2FzZSBcImxhc3RcIjpcdFx0cmV0dXJuIC0xO1xuXHRcdFx0Y2FzZSBcImZpbmFsXCI6XHRcdHJldHVybiAtMTtcblx0XHR9XG5cdH1cbn0pO1xuXG4vLyBBbHRlcm5hdGl2ZSBmb3JtIGZvciBudW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nLlxucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJpbmRleC1leHByZXNzaW9uXCIsIFwidGhlIHtvcmRpbmFsfSBpdGVtIG9mIHtleHByZXNzaW9ufVwiLCB7XG5cdHRvU291cmNlKCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgb3JkaW5hbCA9IGFyZ3Mub3JkaW5hbC50b1NvdXJjZSgpO1xuXHRcdGxldCBleHByZXNzaW9uID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7b3JkaW5hbH0pYDtcblx0fVxufSk7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBpbmZpeCBhbmQgcHJlZml4IG9wZXJhdG9ycy5cbi8vXG5cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIyMgSW5maXggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+IHtyaHN9YCwgZWc6IGBhIGlzIDFgXG4vLyBOT1RFOiBgb3BlcmF0b3IudHJhbnNmb3JtZXJgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyB0d28gYXJndW1lbnRzIChgbGhzYCBhbmQgYHJoc2ApIGludG8gb3V0cHV0LlxuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImFuZFwiLCBcImFuZFwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ICYmICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcIm9yXCIsIFwib3JcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSB8fCAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzXCIsIFwiaXNcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSA9PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1ub3RcIiwgXCJpcyBub3RcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSAhPSAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLWV4YWN0bHlcIiwgXCJpcyBleGFjdGx5XCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybiBgKCR7YX0gPT09ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdC1leGFjdGx5XCIsIFwiaXMgbm90IGV4YWN0bHlcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSAhPT0gJHtifSlgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNPZlR5cGUodGhpbmcsIHR5cGUpYFxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy10eXBlLW9mXCIsIFwiaXMgKGF8YW4pXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcsIHR5cGUpIHsgcmV0dXJuIGBzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1ub3QtdHlwZS1vZlwiLCBcImlzIG5vdCAoYXxhbilcIiwgeyB0cmFuc2Zvcm1lcih0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5pc0luKHRoaW5nLCBjb2xsZWN0aW9uKWBcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXMtaW5cIiwgXCJpcyBpblwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCBsaXN0eSkgeyByZXR1cm4gYHNwZWxsLmlzSW4oJHt0aGluZ30sICR7bGlzdHl9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1vbmUtb2ZcIiwgXCJpcyBvbmUgb2ZcIiwgeyB0cmFuc2Zvcm1lcih0aGluZywgbGlzdHkpIHsgcmV0dXJuIGBzcGVsbC5pc0luKCR7dGhpbmd9LCAke2xpc3R5fSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXMtbm90LWluXCIsIFwiaXMgbm90IGluXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcsIGxpc3R5KSB7IHJldHVybiBgIXNwZWxsLmlzSW4oJHt0aGluZ30sICR7bGlzdHl9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1ub3Qtb25lLW9mXCIsIFwiaXMgbm90IG9uZSBvZlwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCBsaXN0eSkgeyByZXR1cm4gYCFzcGVsbC5pc0luKCR7dGhpbmd9LCAke2xpc3R5fSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndFwiLCBcIig+fGlzIGdyZWF0ZXIgdGhhbilcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZ3RlXCIsIFwiKD49fGlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0bylcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0XCIsIFwiKDx8aXMgbGVzcyB0aGFuKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJsdGVcIiwgXCIoPD18aXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPD0gJHtifSlgIH19KTtcblxuLy9UT0RPOiAgY2FuJ3QgYWRkIGArYCBhcyBhIHJ1bGUsIGZpeCB0aGlzIHRoZW4gYWRkIHRoZXNlXG4vLyBwYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcInBsdXNcIiwgXCIoXFxcXCt8cGx1cylcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuYCgke2F9ICsgJHtifSlgIH19KTtcbi8vIHBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibWludXNcIiwgXCIoLXxtaW51cylcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuYCgke2F9IC0gJHtifSlgIH19KTtcbi8vIHBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwidGltZXNcIiwgXCIoXFxcXCp8dGltZXMpXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSAqICR7Yn0pYCB9fSk7XG4vLyBwYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImRpdmlkZWQtYnlcIiwgXCIoL3xkaXZpZGVkIGJ5KVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gLyAke2J9KWAgfX0pO1xuXG4vLyBBZGQgaW5maXggb3BlcmF0b3JzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0XG4vLyBURVNUTUVcbnBhcnNlci5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFuZFwiLCBcIm9yXCIsIFwiaXNcIiwgXCJub3RcIiwgXCJleGFjdGx5XCIsXG5cdFwiYVwiLCBcImFuXCIsIFwib25lXCIsIFwiZ3JlYXRlclwiLCBcImxlc3NcIiwgXCJlcXVhbFwiLFxuXHRcInBsdXNcIiwgXCJtaW51c1wiLCBcInRpbWVzXCIsIFwiZGl2aWRlZFwiXG4pO1xuXG5wYXJzZXIuYWRkU3ludGF4KFxuXHRcImluZml4LW9wZXJhdG9yLWV4cHJlc3Npb25cIixcblx0XCJ7bGhzOmV4cHJlc3Npb259IHtvcGVyYXRvcjppbmZpeC1vcGVyYXRvcn0ge3JoczpleHByZXNzaW9ufVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGxocyA9IGFyZ3MubGhzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHJocyA9IGFyZ3MucmhzLnRvU291cmNlKGNvbnRleHQpO1xuXG5cdFx0XHRsZXQgdHJhbnNmb3JtZXIgPSBhcmdzLm9wZXJhdG9yLm1hdGNoZWQudHJhbnNmb3JtZXI7XG5cdFx0XHRyZXR1cm4gdHJhbnNmb3JtZXIobGhzLCByaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8jIyBQb3N0aWZ4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPmAsIGUuZy4gYGEgaXMgZGVmaW5lZGBcbi8vIE5PVEU6IGBvcGVyYXRvci50cmFuc2Zvcm1lcmAgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBvdXRwdXQuXG5cbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpcy1kZWZpbmVkXCIsIFwiaXMgZGVmaW5lZFwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSAhPT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtbm90LWRlZmluZWRcIiwgXCJpcyBub3QgZGVmaW5lZFwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtdW5kZWZpbmVkXCIsIFwiaXMgdW5kZWZpbmVkXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtZW1wdHlcIiwgXCJpcyBlbXB0eVwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpcy1ub3QtZW1wdHlcIiwgXCJpcyBub3QgZW1wdHlcIiwgeyB0cmFuc2Zvcm1lcih0aGluZykgeyByZXR1cm4gYCFzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfX0pO1xuXG4vLyBBZGQgcG9zdGZpeCBvcGVyYXRvcnMgdG8gaWRlbnRpZmllciBibGFja2xpc3Rcbi8vIFRFU1RNRVxucGFyc2VyLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiZGVmaW5lZFwiLCBcInVuZGVmaW5lZFwiLCBcImVtcHR5XCJcbik7XG5cbnBhcnNlci5hZGRTeW50YXgoXG5cdFwicG9zdGZpeC1vcGVyYXRvci1leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeC1vcGVyYXRvcn1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBsaHMgPSBhcmdzLmxocy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCB0cmFuc2Zvcm1lciA9IGFyZ3Mub3BlcmF0b3IubWF0Y2hlZC50cmFuc2Zvcm1lcjtcblx0XHRcdHJldHVybiB0cmFuc2Zvcm1lcihsaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG5wYXJzZXIuYWRkU3ludGF4KFwib3BlcmF0b3ItZXhwcmVzc2lvblwiLCBcIihleHByZXNzaW9uOntwb3N0Zml4LW9wZXJhdG9yLWV4cHJlc3Npb259fHtpbmZpeC1vcGVyYXRvci1leHByZXNzaW9ufSlcIik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIl0sInNvdXJjZVJvb3QiOiIifQ==