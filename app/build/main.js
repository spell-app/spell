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

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _Parser = __webpack_require__(2);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(3);

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

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Parser = __webpack_require__(2);

var _Parser2 = _interopRequireDefault(_Parser);

var _RuleSyntax = __webpack_require__(0);

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
/* 2 */
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

var _TextStream = __webpack_require__(4);

var _TextStream2 = _interopRequireDefault(_TextStream);

var _Rule = __webpack_require__(3);

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

		//TODO: move to `ruleSyntax.js`

		// Parse a `ruleSyntax` rule and add it to our list of rules.
		// Returns the new rule.
		// Logs parsing errors but allows things to continue.

	}, {
		key: "addSyntax",
		value: function addSyntax(name, ruleSyntax, properties) {
			var SequenceConstructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.Sequence;

			try {
				var rule = _Rule2.default.parseRuleSyntax(ruleSyntax, SequenceConstructor);

				// Reflect the rule back out to make sure it looks (more or less) the same
				if (Parser.debug) console.log("Added rule '" + name + "':\n  INPUT: " + ruleSyntax + " \n OUTPUT: " + rule);

				Object.assign(rule, properties);
				return this.addRule(name, rule);
			} catch (e) {
				console.group("Error parsing syntax for rule '" + name + "':");
				console.log("syntax: " + ruleSyntax);
				console.error(e);
			}
		}
	}, {
		key: "addStatement",
		value: function addStatement(name, ruleSyntax, properties) {
			var rule = this.addSyntax(name, ruleSyntax, properties, _Rule2.default.Statement);
			if (rule) return this.addRule("statement", rule);
		}
	}, {
		key: "addExpression",
		value: function addExpression(name, ruleSyntax, properties) {
			var rule = this.addSyntax(name, ruleSyntax, properties, _Rule2.default.Expression);
			if (rule) return this.addRule("expression", rule);
		}
	}, {
		key: "addInfixOperator",
		value: function addInfixOperator(name, ruleSyntax, properties) {
			var rule = this.addSyntax(name, ruleSyntax, properties);
			if (rule) {
				if (!rule.transformer) {
					throw new TypeError("Expected infix operator rule '" + name + "' to specify 'transformer' function");
				}
				return this.addRule("infix-operator", rule);
			}
		}
	}, {
		key: "addPostfixOperator",
		value: function addPostfixOperator(name, ruleSyntax, properties) {
			var rule = this.addSyntax(name, ruleSyntax, properties);
			if (rule) {
				if (!rule.transformer) {
					throw new TypeError("Expected postfix operator rule '" + name + "' to specify 'transformer' function");
				}
				return this.addRule("postfix-operator", rule);
			}
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
/* 3 */
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


var _Parser = __webpack_require__(2);

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
			return this.clone({
				matched: match[0],
				endIndex: stream.startIndex + match[0].length,
				stream: stream
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
		var _this3 = _possibleConstructorReturn(this, (Keyword.__proto__ || Object.getPrototypeOf(Keyword)).call(this, properties));

		if (!_this3.pattern) {
			if (!_this3.keyword) throw new TypeError("Expected keyword property");
			_this3.pattern = new RegExp('^' + _this3.keyword + '\\b');
		}
		return _this3;
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

		var _this9 = _possibleConstructorReturn(this, (Alternatives.__proto__ || Object.getPrototypeOf(Alternatives)).call(this, props));

		if (!_this9.rules) _this9.rules = [];
		return _this9;
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
/* 4 */
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
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _RuleSyntax = __webpack_require__(0);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser = __webpack_require__(1);

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
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _parser = __webpack_require__(1);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(5);

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

var _parser = __webpack_require__(1);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(5);

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

var _parser = __webpack_require__(1);

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

var _parser = __webpack_require__(1);

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

var _parser = __webpack_require__(1);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(5);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// re-export parser for testing.
//
//	# Rules for infix and prefix operators.
//

exports.default = _parser2.default;

//## Infix operators:   `{lhs} <operator> {rhs}`, eg: `a is 1`
// NOTE: `operator.transformer` MUST return a function which transforms two arguments (`lhs` and `rhs`) into output.

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

var _TextStream = __webpack_require__(4);

var _TextStream2 = _interopRequireDefault(_TextStream);

var _Parser = __webpack_require__(2);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(3);

var _Rule2 = _interopRequireDefault(_Rule);

__webpack_require__(0);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgOThlZDE5ZDI4ZWExZmRlOWI2NjgiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGVTeW50YXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImFzc2lnbiIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJTZXF1ZW5jZSIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInJ1bGVzIiwicGFyc2VSdWxlU3ludGF4X3Rva2VucyIsInJ1bGUiLCJsZW5ndGgiLCJTWU5UQVhfRVhQUkVTU0lPTiIsIm1hdGNoIiwiU3ludGF4RXJyb3IiLCJzdGFydEluZGV4IiwibGFzdEluZGV4IiwicGFyc2VSdWxlU3ludGF4X3Rva2VuIiwiZW5kSW5kZXgiLCJsYXN0IiwiU3RyaW5nIiwic3RyaW5nIiwicHVzaCIsInN5bnRheFRva2VuIiwicGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUiLCJwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMiLCJwYXJzZVJ1bGVTeW50YXhfbGlzdCIsInBhcnNlUnVsZVN5bnRheF9yZXBlYXQiLCJwYXJzZVJ1bGVTeW50YXhfc3RyaW5nIiwiS2V5d29yZCIsImtleXdvcmQiLCJzdGFydHNXaXRoIiwic3Vic3RyIiwidG9TdHJpbmciLCJmaW5kTmVzdGVkVG9rZW5zIiwic2xpY2UiLCJhcmd1bWVudCIsImFsdGVybmF0ZXMiLCJncm91cEFsdGVybmF0ZXMiLCJtYXAiLCJncm91cCIsInJlc3VsdHMiLCJBbHRlcm5hdGl2ZXMiLCJ0b2tlbnMiLCJjdXJyZW50IiwiaSIsInRva2VuIiwiY29uY2F0Iiwic3ltYm9sIiwiUmVwZWF0Iiwib3B0aW9uYWwiLCJ1bmRlZmluZWQiLCJqb2luIiwiU3VicnVsZSIsIkxpc3QiLCJpdGVtIiwiZGVsaW1pdGVyIiwicGFyc2VyIiwid2luZG93IiwiY29uc29sZSIsImxvZyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydGllcyIsImNyZWF0ZSIsImFkZFJ1bGUiLCJuYW1lIiwic3RyZWFtIiwiZ2V0UnVsZSIsImVhdFdoaXRlc3BhY2UiLCJwYXJzZSIsInJlc3VsdCIsIndoaXRlc3BhY2UiLCJuZXh0IiwiZXhpc3RpbmciLCJkZWJ1ZyIsInJ1bGVOYW1lIiwicGF0dGVybiIsIlBhdHRlcm4iLCJydWxlU3ludGF4IiwiZSIsImVycm9yIiwiYWRkU3ludGF4IiwiU3RhdGVtZW50IiwiRXhwcmVzc2lvbiIsInRyYW5zZm9ybWVyIiwiVHlwZUVycm9yIiwic3RhcnRUb2tlbiIsImVuZFRva2VuIiwibmVzdGluZyIsIm5lc3RlZCIsIkRFQlVHIiwiUnVsZSIsInByb3BzIiwiY2xvbmUiLCJhZHZhbmNlVG8iLCJjb25zdHJ1Y3RvciIsImdhdGhlckFyZ3VtZW50cyIsIm1hdGNoZWQiLCJSZWdFeHAiLCJOZXN0ZWQiLCJzZXF1ZW5jZSIsImFyZ3MiLCJhcmdOYW1lIiwiX2FyZyIsIkFycmF5IiwiaXNBcnJheSIsImJlc3RNYXRjaCIsImNvbnRleHQiLCJ0b1NvdXJjZSIsInJlcGVhdCIsImluZGV4IiwiVGV4dFN0cmVhbSIsInRleHRPclByb3BzIiwidGV4dCIsImhlYWQiLCJzdWJzdHJpbmciLCJyYW5nZSIsIldoaXRlc3BhY2UiLCJUeXBlIiwidHlwZSIsInJlcGxhY2UiLCJOdW1iZXIiLCJudW1iZXIiLCJwYXJzZUZsb2F0IiwiSW50ZWdlciIsInBhcnNlSW50IiwiVGV4dCIsIkJvb2xlYW4iLCJib29sIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJsaXN0IiwiYWRkRXhwcmVzc2lvbiIsImFkZFN0YXRlbWVudCIsInZhbHVlIiwiZXhwcmVzc2lvbiIsInJldmVyc2UiLCJ0aGluZyIsImFzc2lnbm1lbnQiLCJzY29wZSIsInBsdXJhbCIsInRvVXBwZXJDYXNlIiwidmFsdWVzIiwiZmlyc3QiLCJmaXJzdFZhbHVlIiwib3JkaW5hbCIsImFkZEluZml4T3BlcmF0b3IiLCJhIiwiYiIsImxpc3R5IiwibGhzIiwicmhzIiwib3BlcmF0b3IiLCJhZGRQb3N0Zml4T3BlcmF0b3IiXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxtREFBMkMsY0FBYzs7QUFFekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7O0FDaEVBOzs7O0FBQ0E7Ozs7OztBQUVBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FBLE9BQU9DLE1BQVAsaUJBQW9COztBQUVwQjtBQUNBO0FBQ0E7O0FBRUE7QUFDQ0MsZ0JBUG1CLDJCQU9IQyxNQVBHLEVBTzBDO0FB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ckUsWUFBRix1QkFBY3FELEtBQWQsRUFBcUI7QUFBRSw0QkFBd0JBLEtBQXhCO0FBQWtDO0FBQXpELENBQWxEO0FBQ0EsaUJBQU9nQixrQkFBUCxDQUEwQixjQUExQixFQUEwQyxjQUExQyxFQUEwRDtBQUFFckUsWUFBRix1QkFBY3FELEtBQWQsRUFBcUI7QUFBRSw2QkFBeUJBLEtBQXpCO0FBQW1DO0FBQTFELENBQTFEOztBQUdBLGlCQUFPeEQsU0FBUCxDQUNDLDZCQURELEVBRUMsOENBRkQsRUFHQztBQUNDMkIsU0FERCxvQkFDVUQsT0FEVixFQUNtQjtBQUNqQixNQUFJTixPQUFPLEtBQUtMLGVBQUwsRUFBWDtBQUNBLE1BQUlzRCxNQUFNakQsS0FBS2lELEdBQUwsQ0FBUzFDLFFBQVQsQ0FBa0JELE9BQWxCLENBQVY7QUFDQSxNQUFJdkIsY0FBY2lCLEtBQUttRCxRQUFMLENBQWN2RCxPQUFkLENBQXNCYixXQUF4QztBQUNBLFNBQU9BLFlBQVlrRSxHQUFaLENBQVA7QUFDQTtBQU5GLENBSEQ7O0FBY0E7QUFDQSxpQkFBT3JFLFNBQVAsQ0FBaUIscUJBQWpCLEVBQXdDLHdFQUF4QyxFOzs7Ozs7Ozs7Ozs7O0FDNUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7Ozs7QUFFQTtBQUNBLElBQUksT0FBT3hCLE1BQVAsS0FBa0IsV0FBdEIsRUFBbUM7QUFDbENBLFFBQU9zRCxVQUFQO0FBQ0F0RCxRQUFPSSxNQUFQO0FBQ0FKLFFBQU9rQyxJQUFQO0FBQ0FsQyxRQUFPRCxNQUFQO0FBQ0E7O2tCQUVjO0FBQ2R1RCxpQ0FEYyxFQUNGbEQsd0JBREUsRUFDTThCLG9CQUROLEVBQ1luQztBQURaLEMiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBpZGVudGl0eSBmdW5jdGlvbiBmb3IgY2FsbGluZyBoYXJtb255IGltcG9ydHMgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAxMSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay9ib290c3RyYXAgOThlZDE5ZDI4ZWExZmRlOWI2NjgiLCJpbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyByZS1leHBvcnQgUnVsZSBmb3IgdGVzdGluZ1xuZXhwb3J0IGRlZmF1bHQgUnVsZTtcblxuLy9cbi8vXHQjIFBhcnNpbmcgYHJ1bGVTeW50YXhgIHRvIGNyZWF0ZSBydWxlcyBhdXRvbWF0aWNhbGx5LlxuLy9cbi8vIFRPRE86XHRQdWxsIGBwYXJzZVJ1bGVTeW50YXhgIHN0dWZmIG91dCBpbnRvIHNlcGFyYXRlIG1vZHVsZT9cbi8vIFRPRE86XHRCZXR0ZXIgbmFtZSBmb3IgYHJ1bGVTeW50YXhgXG4vLyBUT0RPOlx0VXNlIGtleXdvcmRzIGluIHN5bnRheCB0byBtYWtlIGEgcXVpY2sgcmVnZXgtYmFzZWQgYHRlc3RgIGZ1bmN0aW9uIGZvciB0aGUgZW50aXJlIHJ1bGVcbk9iamVjdC5hc3NpZ24oUnVsZSwge1xuXG4vL1xuLy8gIyMgZ3JvdXA6IHBhcnNpbmcgc3ludGF4XG4vL1xuXG4vLyBUT0RPOiBjb252ZXJ0IHRvIFRleHRTdHJlYW0gcGF0dGVybiBhbGEgbm9ybWFsIHBhcnNlciBvbmNlIHRoYXQgc2V0dGxlcyBkb3duPz8/XG5cdHBhcnNlUnVsZVN5bnRheChzeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0bGV0IHN5bnRheFN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCk7XG5cdFx0bGV0IHJ1bGVzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgW10pO1xuXG5cdFx0bGV0IHJ1bGU7XG5cdFx0Ly8gSWYgd2Ugb25seSBnb3Qgb25lIHRoaW5nLCByZXR1cm4gdGhhdCBhcyB0aGUgcmVzdWx0XG5cdFx0aWYgKHJ1bGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cnVsZSA9IHJ1bGVzWzBdO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgU2VxdWVuY2VDb25zdHJ1Y3Rvcih7IHJ1bGVzIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9LFxuXG5cdHRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpIHtcblx0XHRjb25zdCBTWU5UQVhfRVhQUkVTU0lPTiA9IC8oPzpbXFx3XFwtXSt8XFxcXFtcXFtcXChcXHtcXClcXH1cXF1dfFteXFxzXFx3XXxcXHwpL2c7XG5cdFx0dmFyIHN5bnRheFN0cmVhbSA9IHN5bnRheC5tYXRjaChTWU5UQVhfRVhQUkVTU0lPTik7XG5cdFx0aWYgKCFzeW50YXhTdHJlYW0pIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgdG9rZW5pemUgcGFyc2UgcnVsZSBzeW50YXggPj4ke3N5bnRheH08PGApO1xuXHRcdHJldHVybiBzeW50YXhTdHJlYW07XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBsYXN0SW5kZXggPSBzeW50YXhTdHJlYW0ubGVuZ3RoO1xuXHRcdHdoaWxlIChzdGFydEluZGV4IDwgbGFzdEluZGV4KSB7XG5cdFx0XHRsZXQgWyBydWxlLCBlbmRJbmRleCBdID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRpZiAocnVsZSkge1xuXHRcdFx0XHR2YXIgbGFzdCA9IHJ1bGVzW3J1bGVzLmxlbmd0aC0xXTtcblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBTdHJpbmdgIGFuZCBsYXN0IHdhcyBhIGBTdHJpbmdgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5TdHJpbmcgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3RyaW5nKSB7XG5cdFx0XHRcdFx0bGFzdC5zdHJpbmcgKz0gcnVsZS5zdHJpbmc7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cnVsZXMucHVzaChydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0c3RhcnRJbmRleCA9IGVuZEluZGV4ICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHZhciBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdHN3aXRjaCAoc3ludGF4VG9rZW4pIHtcblx0XHRcdGNhc2UgXCJ7XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIoXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiW1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKlwiOlxuXHRcdFx0Y2FzZSBcIitcIjpcblx0XHRcdGNhc2UgXCI/XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0XHQvLyB0aGUgZm9sbG93aW5nIHNob3VsZCBBTFdBWVMgYmUgY29uc3VtZWQgYnkgdGhlIGFib3ZlXG5cdFx0XHRjYXNlIFwifVwiOlxuXHRcdFx0Y2FzZSBcIilcIjpcblx0XHRcdGNhc2UgXCJdXCI6XG5cdFx0XHRjYXNlIFwifFwiOlxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgJHtzeW50YXhUb2tlbn0gZm91bmQgYXMgaXRlbSAke3N0YXJ0SW5kZXh9IG9mICR7dGhpcy5zeW50YXh9YCk7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzdHJpbmcgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF0sIHJ1bGU7XG5cdFx0Ly8gSWYgbGV0dGVycyBvbmx5LCBtYXRjaCBhcyBhIEtleXdvcmQgKHNvIHdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGFmdGVyIHRoZSBzdHJpbmcpLlxuXHRcdGlmIChzdHJpbmcubWF0Y2goL1tBLVphLXpdKy8pKSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuS2V5d29yZCh7IGtleXdvcmQ6IHN0cmluZyB9KTtcblx0XHR9XG5cdFx0Ly8gT3RoZXJ3aXNlIG1hdGNoIGFzIGEgU3RyaW5nLCB3aGljaCBkb2Vzbid0IHJlcXVpcmUgbm9uLXdvcmQgY2hhcnMgYWZ0ZXIgdGhlIHRleHQuXG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuU3RyaW5nKHsgc3RyaW5nOiBzdHJpbmcgfSk7XG5cdFx0XHQvLyBJZiBzdHJpbmcgc3RhcnRzIHdpdGggYFxcXFxgLCBpdCdzIGFuIGVzY2FwZWQgbGl0ZXJhbCAoZWc6IGBcXFtgIG5lZWRzIHRvIGlucHV0IGFzIGBcXFxcW2ApLlxuXHRcdFx0aWYgKHN0cmluZy5zdGFydHNXaXRoKFwiXFxcXFwiKSkge1xuXHRcdFx0XHQvLyByZW1vdmUgbGVhZGluZyBzbGFzaCBpbiBtYXRjaCBzdHJpbmcuLi5cblx0XHRcdFx0cnVsZS5zdHJpbmcgPSBydWxlLnN0cmluZy5zdWJzdHIoMSk7XG5cdFx0XHRcdC8vIGJ1dCBsZWF2ZSBpdCBpbiB0b1N0cmluZ1xuXHRcdFx0XHRydWxlLnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gWyBydWxlLCBzdGFydEluZGV4IF07XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBncm91cGluZyBleHByZXNzaW9uIGAoLi4ufC4uLilgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0Ly8gTk9URTogbmVzdGVkIHBhcmVucyBtYXkgbm90IGhhdmUgYWx0ZXJuYXRpdmVzLi4uIDotKCAgIGAoYXwoYnxjKSlgIHdvbid0IHdvcms/Pz9cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCIoXCIsIFwiKVwiLCBzdGFydEluZGV4KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHQvLyBzcGxpdCBpbnRvIGdyb3VwcywgaW5jbHVkaW5nIG5lc3RlZCBwYXJlbnNcblx0XHRsZXQgYWx0ZXJuYXRlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0ZXMoc2xpY2UpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0XHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKGdyb3VwLCBbXSk7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHRzWzBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdGxldCBydWxlID0gYWx0ZXJuYXRlcy5sZW5ndGggPT09IDEgPyBhbHRlcm5hdGVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0ZXMgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblxuXHRcdGZ1bmN0aW9uIGdyb3VwQWx0ZXJuYXRlcyh0b2tlbnMpIHtcblx0XHRcdHZhciBhbHRlcm5hdGVzID0gW107XG5cdFx0XHR2YXIgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGhhbmRsZSBuZXN0ZWQgcGFyZW5zXG5cdFx0XHRcdGVsc2UgaWYgKHRva2VuID09PSBcIihcIikge1xuXHRcdFx0XHRcdGxldCB7IGVuZEluZGV4IH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmRJbmRleCArIDEpKTtcblx0XHRcdFx0XHRpID0gZW5kSW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3VycmVudC5wdXNoKHRva2VuKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGN1cnJlbnQubGVuZ3RoKSBhbHRlcm5hdGVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRyZXR1cm4gYWx0ZXJuYXRlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdHZhciBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlN1YnJ1bGUoeyBydWxlOiBtYXRjaC5zbGljZVswXSB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBtYXRjaC5lbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuTGlzdCgpO1xuXHRcdHJ1bGUuaXRlbSA9IHJlc3VsdHNbMF1cblx0XHRydWxlLmRlbGltaXRlciA9IHJlc3VsdHNbMV1cblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlU3ludGF4LmpzIiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCIvLyBTcGVsbCBcIkVuZ2xpc2hcIiBwYXJzZXIgc3RyYXdtYW5cblxuLy8gVE9ETzpcdGNvbnNvbGlkYXRlIHN1YnNlcXVlbnQgbGl0ZXJhbCB3b3JkcyAvIHN0cmluZ3MgaW50byBhIHNpbmdsZSByZWdleD9cbi8vIFRPRE86XHRgdGVzdGAgZnVuY3Rpb24gZm9yIHF1aWNrIG5vLWdvb2QgaGl0IG9uIGB7YX0gYmxhaCBibGFoIHtifWA/XG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcms6ICAgYHtleHByZXNzaW9ufSBpcyB7ZXhwcmVzc2lvbn1gXG4vLyBUT0RPOlx0Y3VzdG9tIFN5bnRheEVycm9yIGV0YyB3aGljaCB1bmRlcnN0YW5kIHN0cmVhbXNcbi8vIFRPRE86XHRicmVhayBgZmlsZWAgaW50byBsaW5lcyBhbmQgcHJvY2VzcyBlYWNoIChpbmNsLiBzdWJzdHIvbWF0Y2ggbm90IGdvaW5nIGJleW9uZCB0aGUgZW5kKVxuLy8gVE9ETzpcdG5lc3RpbmcgLS0gaXMgdGhpcyBqdXN0IGluZGVudCA9IFwiYWRkIGJsb2NrIHNjb3BlXCJcbi8vIFRPRE86XHRwcm9tb3Rpb24gcGF0dGVybiBmb3IgZ2F0aGVyIGFyZ3VtZW50cyAoZWc6IGxpdGVyYWwtbGlzdCkgPz8/XG4vLyBUT0RPOlx0V2hhdCBkb2VzIHN5bnRheCB0cmVlIGxvb2sgbGlrZT8gIEhvdyBkbyB3ZSBleHRyYWN0IG1lYW5pbmcgb3V0IG9mIHRoZSBuZXN0P1xuLy8gVE9ETzpcdFJlY3ljbGUgd29yZC9zdHJpbmcvcGF0dGVybiBydWxlcyB0byBtb3JlIGVhc2lseSBzZWUgY29tbW9uYWxpdHkuLi5cbi8vIFRPRE86XHRQYXNzIGBjb250ZXh0YCB0byB0b1NvdXJjZSgpLCBhZGQgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYGNsYXNzYCwgdmFyaWFibGVzIGFuZCBjb2RlIHRvIGBtZXRob2RgLCBgZ2xvYmFsYCBzdHVmZiBldGNcblxuaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ2xvbmUgcnVsZXMsIHN0YXJ0aW5nIHdpdGggYSBjb21wbGV0ZWx5IGVtcHR5IG1hcCBpZiBub3QgZGVmaW5lZCAobm8gc3RhbmRhcmQgb2JqZWN0IGtleXMpXG5cdFx0dGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5ydWxlcyB8fCBudWxsKTtcblxuXHRcdC8vIFNldCB1cCBzdGFuZGFyZCBydWxlIGNsYXNzZXMgYXMgYWx0ZXJuYXRlc1xuXHRcdHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoKSk7XG5cdFx0dGhpcy5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoKSk7XG5cdFx0dGhpcy5hZGRSdWxlKFwiaW5maXgtb3BlcmF0b3JcIiwgbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKCkpO1xuXHRcdHRoaXMuYWRkUnVsZShcInBvc3RmaXgtb3BlcmF0b3JcIiwgbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKCkpO1xuXHR9XG5cblx0Z2V0UnVsZShuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXNbbmFtZV07XG5cdH1cblxuLy8jIyMgUGFyc2luZ1xuXG5cdC8vIFBhcnNlIGBuYW1lYGQgcnVsZSBhdCBoZWFkIG9mIGBzdHJlYW1gLlxuXHQvLyBIYW5kbGVzIG9wdGlvbmFsIGFuZCByZXBlYXRpbmcgcnVsZXMgYXMgd2VsbCBhcyBlYXRpbmcgd2hpdGVzcGFjZS5cblx0Ly8gUmV0dXJucyByZXN1bHQgb2YgcGFyc2UuXG5cdHBhcnNlKG5hbWUsIHN0cmVhbSkge1xuXHRcdGlmICh0eXBlb2Ygc3RyZWFtID09PSBcInN0cmluZ1wiKSBzdHJlYW0gPSBuZXcgVGV4dFN0cmVhbShzdHJlYW0pO1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBSdWxlICR7bmFtZX0gbm90IHVuZGVyc3Rvb2RgLCBuYW1lLCBzdHJlYW0pO1xuXHRcdHN0cmVhbSA9IHRoaXMuZWF0V2hpdGVzcGFjZShzdHJlYW0pO1xuXHRcdHJldHVybiBydWxlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdH1cblxuXHQvLyBFYXQgd2hpdGVzcGFjZSAoYWNjb3JkaW5nIHRvIGBydWxlcy53aGl0ZXNwYWNlYCkgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG5ldyBzdHJlYW0gaWYgd2UgbWF0Y2hlZCB3aGl0ZXNwYWNlLCBvdGhlcndpc2UgdGhlIHNhbWUgc3RyZWFtLlxuXHQvLyBPdGhlcndpc2UgcmV0dXJucyB0aGlzIHNhbWUgc3RyZWFtLlxuXHRlYXRXaGl0ZXNwYWNlKHN0cmVhbSkge1xuXHRcdHZhciByZXN1bHQgPSB0aGlzLnJ1bGVzLndoaXRlc3BhY2UucGFyc2UodGhpcywgc3RyZWFtKTtcblx0XHRyZXR1cm4gcmVzdWx0ID8gcmVzdWx0Lm5leHQoKSA6IHN0cmVhbTtcblx0fVxuXG4vLyMjIyBSdWxlIGZhY3Rvcmllc1xuXG5cdC8vIEFkZCBhIHJ1bGUgdG8gb3VyIGxpc3Qgb2YgcnVsZXMhXG5cdC8vIFRPRE86IGNvbnZlcnQgdG8gYGFsdGVybmF0aXZlc2Agb24gb3ZlcndyaXRlP1xuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLnJ1bGVzW25hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtuYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdGV4aXN0aW5nID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgbmFtZTogZXhpc3RpbmcubmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBleGlzdGluZztcblx0XHRcdH1cblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRpbmcgcnVsZSAnJHtydWxlLnJ1bGVOYW1lfScgdG8gJyR7bmFtZX0nOiBgLCBydWxlKTtcblx0XHRcdGV4aXN0aW5nLmFkZFJ1bGUocnVsZSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZS5ydWxlTmFtZSA9IG5hbWU7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gcnVsZTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblxuXHQvLyBBZGQgcmVnZXggYXMgYSBwYXR0ZXJuIHRvIG91ciBsaXN0IG9mIHJ1bGVzXG5cdGFkZFBhdHRlcm4obmFtZSwgcGF0dGVybiwgcHJvcGVydGllcykge1xuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuUGF0dGVybihwcm9wZXJ0aWVzKTtcblx0XHRydWxlLnBhdHRlcm4gPSBwYXR0ZXJuO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH1cblxuLy9UT0RPOiBtb3ZlIHRvIGBydWxlU3ludGF4LmpzYFxuXG5cdC8vIFBhcnNlIGEgYHJ1bGVTeW50YXhgIHJ1bGUgYW5kIGFkZCBpdCB0byBvdXIgbGlzdCBvZiBydWxlcy5cblx0Ly8gUmV0dXJucyB0aGUgbmV3IHJ1bGUuXG5cdC8vIExvZ3MgcGFyc2luZyBlcnJvcnMgYnV0IGFsbG93cyB0aGluZ3MgdG8gY29udGludWUuXG5cdGFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdHRyeSB7XG5cdFx0XHRsZXQgcnVsZSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IpO1xuXG5cdFx0XHQvLyBSZWZsZWN0IHRoZSBydWxlIGJhY2sgb3V0IHRvIG1ha2Ugc3VyZSBpdCBsb29rcyAobW9yZSBvciBsZXNzKSB0aGUgc2FtZVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGVkIHJ1bGUgJyR7bmFtZX0nOlxcbiAgSU5QVVQ6ICR7cnVsZVN5bnRheH0gXFxuIE9VVFBVVDogJHtydWxlfWApO1xuXG5cdFx0XHRPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmdyb3VwKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgc3ludGF4OiAke3J1bGVTeW50YXh9YCk7XG5cdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdH1cblx0fVxuXG5cdGFkZFN0YXRlbWVudChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBSdWxlLlN0YXRlbWVudCk7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJzdGF0ZW1lbnRcIiwgcnVsZSk7XG5cdH1cblxuXHRhZGRFeHByZXNzaW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFJ1bGUuRXhwcmVzc2lvbik7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHJ1bGUpO1xuXHR9XG5cblx0YWRkSW5maXhPcGVyYXRvcihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkge1xuXHRcdFx0aWYgKCFydWxlLnRyYW5zZm9ybWVyKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIGluZml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RyYW5zZm9ybWVyJyBmdW5jdGlvbmApXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwiaW5maXgtb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9XG5cblx0YWRkUG9zdGZpeE9wZXJhdG9yKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudHJhbnNmb3JtZXIpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgcG9zdGZpeCBvcGVyYXRvciBydWxlICcke25hbWV9JyB0byBzcGVjaWZ5ICd0cmFuc2Zvcm1lcicgZnVuY3Rpb25gKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJwb3N0Zml4LW9wZXJhdG9yXCIsIHJ1bGUpO1xuXHRcdH1cblx0fVxuXG5cbi8vXG4vLyAjIyBVdGlsaXR5IG1ldGhvZHNcbi8vXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gLlxuXHQvLyBJZiBzdWNjZXNzZnVsLCByZXR1cm5zIGB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZSB9YFxuXHQvLyBUaHJvd3MgaWYgdW5zdWNlc3NmdWwuXG5cdHN0YXRpYyBmaW5kTmVzdGVkVG9rZW5zKHRva2Vucywgc3RhcnRUb2tlbiwgZW5kVG9rZW4sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0aWYgKHRva2Vuc1tzdGFydEluZGV4XSAhPT0gc3RhcnRUb2tlbikgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBFeHBlY3RlZCAnJHtzdGFydFRva2VufScgYXQgaW5kZXggJHtzdGFydEluZGV4fSBvZiB0b2tlbnNgKTtcblx0XHRsZXQgbmVzdGluZyA9IDA7XG5cdFx0bGV0IG5lc3RlZCA9IGZhbHNlO1xuXHRcdGZvciAobGV0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIDEsIGxhc3RJbmRleCA9IHRva2Vucy5sZW5ndGg7IGVuZEluZGV4IDwgbGFzdEluZGV4OyBlbmRJbmRleCsrKSB7XG5cdFx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbZW5kSW5kZXhdO1xuXHRcdFx0aWYgKHRva2VuID09PSBzdGFydFRva2VuKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdFx0bmVzdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b2tlbiA9PT0gZW5kVG9rZW4pIHtcblx0XHRcdFx0aWYgKG5lc3RpbmcgPT09IDApXG5cdFx0XHRcdFx0cmV0dXJuIHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlOiB0b2tlbnMuc2xpY2Uoc3RhcnRJbmRleCsxLCBlbmRJbmRleCksIG5lc3RlZCB9O1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgQ291bGRuJ3QgZmluZCBtYXRjaGluZyAnJHtlbmRUb2tlbn0ncyBzdGFydGluZyBhdCBpdGVtICR7c3RhcnRJbmRleH1gKTtcblx0fVxuXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9QYXJzZXIuanMiLCIvL1x0IyBQYXJzZXIgUnVsZXNcbi8vXHRSdWxlcyBjYW4gYmUgYXMgc2ltcGxlIGFzIGEgc3RyaW5nIGBLZXl3b3JkYCBvciBhIGNvbXBsZXggc2VxdWVuY2Ugb2YgKG5lc3RlZCkgcnVsZXMuXG4vL1xuLy9cdFBhcnNlIGEgcnVsZSB3aXRoIGBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKWAsIHRoaXMgd2lsbCBlaXRoZXI6XG4vL1x0XHQtIHJldHVybiBgdW5kZWZpbmVkYCBpZiB0aGUgcnVsZSBkb2Vzbid0IG1hdGNoIHRoZSBoZWFkIG9mIHRoZSBzdHJlYW0sIG9yXG4vL1x0XHQtIHJldHVybiBhIENMT05FIG9mIHRoZSBydWxlIHdpdGggYXQgbGVhc3QgdGhlIGZvbGxvd2luZzpcbi8vXHRcdFx0LSBgc3RyZWFtYFx0XHRTdHJlYW0gd2hpY2ggd2FzIG1hdGNoZWQgd2l0aCBgc3RhcnRJbmRleGAgYXQgdGhlIHN0YXJ0IG9mIHRoZSBtYXRjaFxuLy9cdFx0XHQtIGBlbmRJbmRleGBcdE5vbi1pbmNsdXNpdmUgZW5kIGluZGV4IGluIHN0cmVhbSB3aGVyZSBtYXRjaCBlbmRzLlxuLy9cbi8vXHRUaGUgY2xvbmUgcmV0dXJuZWQgYWJvdmUgY2FuIGJlIG1hbmlwdWxhdGVkIHdpdGhcbi8vXHRcdC0gYHJ1bGUuZ2F0aGVyQXJndW1lbnRzKClgXHRcdFJldHVybiBtYXRjaGVkIGFyZ3VtZW50cyBpbiBhIGZvcm1hdCBzdWl0YWJsZSB0byBkbzpcbi8vXHRcdC0gYHJ1bGUudG9Tb3VyY2UoKWBcdFx0XHRcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcblxuXG4vL1RPRE86IG1ha2UgZ2F0aGVyQXJndW1lbnRzKCkgc3RhdGljIGFuZCBjYWxsIG9uIHRoaXNcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXHR9XG5cblx0Ly8gQ2xvbmUgdGhpcyBydWxlIGFuZCBhZGQgYW55IGBwcm9wc2AgcGFzc2VkIGluLlxuXHRjbG9uZShwcm9wcykge1xuXHRcdHZhciBjbG9uZSA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG5cdFx0T2JqZWN0LmFzc2lnbihjbG9uZSwgcHJvcHMpO1xuXHRcdHJldHVybiBjbG9uZTtcblx0fVxuXG5cdC8vIEZvciBhIHJ1bGUgaW5zdGFuY2UgYXNzb2NpYXRlZCB3aXRoIGEgc3RyZWFtLFxuXHQvLyByZXR1cm4gYSBuZXcgc3RyZWFtIEFGVEVSIHRoaXMgcnVsZSdzIGVuZC5cblx0bmV4dCgpIHtcblx0XHRpZiAoIXRoaXMuc3RyZWFtIHx8IHRoaXMuZW5kSW5kZXggPT09IHVuZGVmaW5lZClcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYHJ1bGUubmV4dCgpIGNhbGxlZCBvbiBydWxlIHdpdGhvdXQgYSBzdHJlYW1gLCB0aGlzKTtcblx0XHRyZXR1cm4gdGhpcy5zdHJlYW0uYWR2YW5jZVRvKHRoaXMuZW5kSW5kZXgpO1xuXHR9XG5cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cdGdldCBfYXJnKCkgeyByZXR1cm4gdGhpcy5hcmd1bWVudCB8fCB0aGlzLnJ1bGVOYW1lIHx8IHRoaXMuY29uc3RydWN0b3IubmFtZSB9XG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gTm90ZSB0aGF0IHdlIGRlZmluZSBgZ2F0aGVyQXJndW1lbnRzKClgIHN0YXRpY2FsbHkgb24gZWFjaCBzdWJjbGFzc1xuXHQvL1x0YW5kIHRoZW4gaW5zdGFuY2UgbWV0aG9kIGNhbGxzIGl0IG9uIGl0c2VsZi5cblx0c3RhdGljIGdhdGhlckFyZ3VtZW50cyhydWxlKSB7XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblx0Z2F0aGVyQXJndW1lbnRzKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLmdhdGhlckFyZ3VtZW50cyh0aGlzKTtcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQ7XG5cdH1cblxuLy9cbi8vICMjIGdyb3VwOiByZWZsZWN0aW9uXG4vL1xuXHRnZXQgcnVsZVR5cGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0fVxufVxuXG5cblxuLy8gUnVsZSBmb3IgbGl0ZXJhbCBzdHJpbmcgdmFsdWUsIHdoaWNoIGluY2x1ZGUgcHVuY3R1YXRpb24gc3VjaCBhcyBgKGAgZXRjLlxuLy9UT0RPOiByZW5hbWUgYFN5bWJvbGA/Pz9cblJ1bGUuU3RyaW5nID0gY2xhc3MgU3RyaW5nIGV4dGVuZHMgUnVsZSB7XG5cdC8vIFBhcnNlIHRoaXMgcnVsZSBhdCB0aGUgYmVnaW5uaW5nIG9mIGBzdHJlYW1gLCBhc3N1bWluZyBubyB3aGl0ZXNwYWNlIGJlZm9yZS5cblx0Ly8gRGVmYXVsdCBpcyB0aGF0IGBydWxlLnN0cmluZ2AgaXMgbGl0ZXJhbCBzdHJpbmcgdG8gbWF0Y2guXG5cdC8vIE9uIG1hdGNoLCByZXR1cm5zIGNsb25lIG9mIHJ1bGUgd2l0aCBgdmFsdWVgLCBgc3RyZWFtYCBhbmQgYGVuZEluZGV4YC5cblx0Ly8gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiBubyBtYXRjaC5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRpZiAoIXN0cmVhbS5zdGFydHNXaXRoKHRoaXMuc3RyaW5nKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiB0aGlzLnN0cmluZyxcblx0XHRcdGVuZEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCArIHRoaXMuc3RyaW5nLmxlbmd0aCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMuc3RyaW5nfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vIE5PVEU6IHRoZSByZWdleCBzaG91bGQgc3RhcnQgd2l0aCBgL14uLi5gIHRvIG1hdGNoIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHR2YXIgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5wYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IG1hdGNoWzBdLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5wYXR0ZXJuO1xuXHR9XG59XG5cblxuLy8gS2V5d29yZCBwYXR0ZXJuXG4vL1x0YHJ1bGUua2V5d29yZGAgaXMgdGhlIGtleXdvcmQgc3RyaW5nIHRvIG1hdGNoLlxuUnVsZS5LZXl3b3JkID0gY2xhc3MgS2V5d29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0XHQvLyBjcmVhdGUgcGF0dGVybiB3aGljaCBtYXRjaGVzIGF0IHdvcmQgYm91bmRhcnlcblx0XHRpZiAoIXRoaXMucGF0dGVybikge1xuXHRcdFx0aWYgKCF0aGlzLmtleXdvcmQpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBrZXl3b3JkIHByb3BlcnR5XCIpO1xuXHRcdFx0dGhpcy5wYXR0ZXJuID0gbmV3IFJlZ0V4cChgXiR7dGhpcy5rZXl3b3JkfVxcXFxiYCk7XG5cdFx0fVxuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMua2V5d29yZH0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuLy8gU3VicnVsZSAtLSBuYW1lIG9mIGFub3RoZXIgcnVsZSB0byBiZSBjYWxsZWQuXG4vLyBgcnVsZS5ydWxlYCBpcyB0aGUgbmFtZSBvZiB0aGUgcnVsZSBpbiBgcGFyc2VyLnJ1bGVzYC5cblJ1bGUuU3VicnVsZSA9IGNsYXNzIFN1YnJ1bGUgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHR2YXIgcnVsZSA9IHBhcnNlci5nZXRSdWxlKHRoaXMucnVsZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEF0dGVtcHRpbmcgdG8gcGFyc2UgdW5rbm93biBydWxlICcke3RoaXMubmFtZX0nYCwgdGhpcyk7XG5cdFx0dmFyIHJlc3VsdCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIHJlc3VsdC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgeyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlfX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuXG4vLyBBYnN0cmFjdDogIGBOZXN0ZWRgIHJ1bGUgLS0gY29tcG9zZWQgb2YgYSBzZXJpZXMgb2Ygb3RoZXIgYHJ1bGVzYC5cblJ1bGUuTmVzdGVkID0gY2xhc3MgTmVzdGVkIGV4dGVuZHMgUnVsZSB7fVxuXG5cbi8vIFNlcXVlbmNlIG9mIHJ1bGVzIHRvIG1hdGNoIChhdXRvLWV4Y2x1ZGluZyB3aGl0ZXNwYWNlKS5cblJ1bGUuU2VxdWVuY2UgPSBjbGFzcyBTZXF1ZW5jZSBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcmVzdWx0cyA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IHJlc3VsdCA9IHJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghcmVzdWx0ICYmICFydWxlLm9wdGlvbmFsKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKHJlc3VsdCkge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2gocmVzdWx0KTtcblx0XHRcdFx0bmV4dCA9IHJlc3VsdC5uZXh0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGlmIHdlIGdldCBoZXJlLCB3ZSBtYXRjaGVkIGFsbCB0aGUgcnVsZXMhXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG4vL1RPRE9DXG5cdC8vIEdhdGhlciBhcmd1bWVudHMgZnJvbSBvdXIgcGFyc2VkIGByZXN1bHRzYCBhcnJheS5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGB2YWx1ZXNgIGFycmF5IGluZGV4ZWQgYnlcblx0Ly9cdFx0LSBgcmVzdWx0cy5hcmd1bWVudGA6XHRcdGFyZ3VtZW50IHNldCB3aGVuIHJ1bGUgd2FzIGRlY2xhcmVkLCBlZzogYHt2YWx1ZTpsaXRlcmFsfWAgPT4gYHZhbHVlYFxuXHQvL1x0XHQtIGByZXN1bHRzLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIHJ1bGUgdHlwZTpcdFx0XHRcdG5hbWUgb2YgdGhlIHJ1bGUgdHlwZVxuXHRzdGF0aWMgZ2F0aGVyQXJndW1lbnRzKHNlcXVlbmNlKSB7XG5cdFx0aWYgKCFzZXF1ZW5jZS5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCBhcmdzID0ge307XG5cdFx0Zm9yIChsZXQgbmV4dCBvZiBzZXF1ZW5jZS5yZXN1bHRzKSB7XG5cdFx0XHRsZXQgYXJnTmFtZSA9IG5leHQuX2FyZztcblx0XHRcdC8vIEZvciBuZXN0ZWQgcnVsZXMsIHJlY3Vyc2UgdG8gZ2V0IHRoZWlyIGFyZ3VtZW50c1xuXHRcdFx0bGV0IHJlc3VsdCA9IG5leHQuZ2F0aGVyQXJndW1lbnRzKCk7XG5cblx0XHRcdC8vIElmIGFyZyBhbHJlYWR5IGV4aXN0cywgY29udmVydCB0byBhbiBhcnJheVxuXHRcdFx0aWYgKGFyZ05hbWUgaW4gYXJncykge1xuXHRcdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkoYXJnc1thcmdOYW1lXSkpIGFyZ3NbYXJnTmFtZV0gPSBbYXJnc1thcmdOYW1lXV07XG5cdFx0XHRcdGFyZ3NbYXJnTmFtZV0ucHVzaChyZXN1bHQpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGFyZ3NbYXJnTmFtZV0gPSByZXN1bHQ7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBhcmdzO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBleHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuUnVsZS5TdGF0ZW1lbnQgPSBjbGFzcyBzdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gQWx0ZXJuYXRpdmUgc3ludGF4LlxuLy8gTk9URTogQ3VycmVudGx5IHRha2VzIHRoZSBsb25nZXN0IHZhbGlkIG1hdGNoLlxuLy8gVE9ETzogbWF0Y2ggYWxsIHZhbGlkIGFsdGVybmF0aXZlc1xuLy8gVE9ETzogcmVuYW1lP1xuUnVsZS5BbHRlcm5hdGl2ZXMgPSBjbGFzcyBBbHRlcm5hdGl2ZXMgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpO1xuXHRcdGlmICghdGhpcy5ydWxlcykgdGhpcy5ydWxlcyA9IFtdO1xuXHR9XG5cblx0Ly8gRmluZCB0aGUgTE9OR0VTVCBtYXRjaFxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBiZXN0TWF0Y2g7XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKTtcblx0XHRcdGlmICghbWF0Y2gpIGNvbnRpbnVlO1xuXG5cdFx0XHQvLyB0YWtlIHRoZSBsb25nZXN0IG1hdGNoXG5cdFx0XHRpZiAoIWJlc3RNYXRjaCB8fCBtYXRjaC5lbmRJbmRleCA+IGJlc3RNYXRjaC5lbmRJbmRleClcblx0XHRcdFx0YmVzdE1hdGNoID0gbWF0Y2g7XG5cdFx0fVxuXHRcdGlmICghYmVzdE1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogYmVzdE1hdGNoLFxuXHRcdFx0ZW5kSW5kZXg6IGJlc3RNYXRjaC5lbmRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0YWRkUnVsZShydWxlKSB7XG5cdFx0dGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5yZXN1bHRzYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgbmV4dCA9IHN0cmVhbTtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5ydWxlLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgYnJlYWs7XG5cblx0XHRcdHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0bmV4dCA9IHJlc3VsdC5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdHN0YXRpYyBnYXRoZXJBcmd1bWVudHMocmVwZWF0KSB7XG5cdFx0aWYgKCFyZXBlYXQucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gcmVwZWF0LnJlc3VsdHMubWFwKCByZXN1bHQgPT4gcmVzdWx0LmdhdGhlckFyZ3VtZW50cygpICk7XG5cdH1cblxuXHR0b1NvdXJjZSgpIHtcblx0XHR0aHJvdyBcIkRvbid0IHVuZGVyc3RhbmQgaG93IHRvIHNvdXJjZSBSdWxlLlJlcGVhdCFcIjtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdGNvbnN0IHJ1bGUgPSAodGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSA/IGAoJHt0aGlzLnJ1bGV9KWAgOiBgJHt0aGlzLnJ1bGV9YCk7XG5cdFx0cmV0dXJuIGAke3J1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe251bWJlcn0sXWAgdG8gbWF0Y2ggYDEsMiwzYFxuLy9cdGBydWxlLml0ZW1gIGlzIHRoZSBydWxlIGZvciBlYWNoIGl0ZW0sXG4vL1x0YHJ1bGUuZGVsaW1pdGVyYCBpcyB0aGUgZGVsaW1pdGVyIGJldHdlZW4gZWFjaCBpdGVtLlxuLy8gXHRgcnVsZS5yZXN1bHRzYCBpbiB0aGUgb3V0cHV0IGlzIHRoZSBsaXN0IG9mIHZhbHVlcy5cbi8vXG4vL1xuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYSBMaXN0IHJ1bGUgd2lsbCBOT1QgcmVwZWF0ICg/Pz8/KVxuUnVsZS5MaXN0ID0gY2xhc3MgTGlzdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdC8vIGVuc3VyZSBpdGVtIGFuZCBkZWxpbWl0ZXIgYXJlIG9wdGlvbmFsIHNvIHdlIGRvbid0IGJhcmYgaW4gYHBhcnNlUnVsZWBcblx0XHR0aGlzLml0ZW0ub3B0aW9uYWwgPSB0cnVlO1xuXHRcdHRoaXMuZGVsaW1pdGVyLm9wdGlvbmFsID0gdHJ1ZTtcblxuXHRcdHZhciByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdC8vIGdldCBuZXh0IGl0ZW0sIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgaXRlbSA9IHRoaXMuaXRlbS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFpdGVtKSBicmVhaztcbi8vY29uc29sZS5sb2coaXRlbSk7XG5cdFx0XHRyZXN1bHRzLnB1c2goaXRlbSk7XG5cdFx0XHRuZXh0ID0gaXRlbS5uZXh0KCk7XG5cblx0XHRcdC8vIGdldCBkZWxpbWl0ZXIsIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgZGVsaW1pdGVyID0gdGhpcy5kZWxpbWl0ZXIucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghZGVsaW1pdGVyKSBicmVhaztcblx0XHRcdG5leHQgPSBkZWxpbWl0ZXIubmV4dCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdHJlc3VsdHMsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gbWF0Y2hlZCBpdGVtIGJ5IGluZGV4XG5cdGdldEl0ZW0oaW5kZXgpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzW2luZGV4XTtcblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1x0XHQvLyBUT0RPOiB0aHJvdz8/P1xuXHRcdGxldCByZXN1bHRzID0gdGhpcy5yZXN1bHRzLm1hcCggcmVzdWx0ID0+IHJlc3VsdC50b1NvdXJjZSgpICkuam9pbihcIiwgXCIpO1xuXHRcdHJldHVybiBgWyR7cmVzdWx0c31dYDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgWyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5pdGVtfSAke3RoaXMuZGVsaW1pdGVyfV0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZS5qcyIsIlxuLy8gVE9ETzogY29udmVydCB0byBsaW5lLWF3YXJlIHN0cmVhbT8/P1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFN0cmVhbSB7XG5cdC8vIFlvdSBjYW4gY29uc3RydWN0IHdpdGggYSB0ZXh0IHN0cmluZyBvciBhIHNldCBvZiBwcm9wZXJ0aWVzIChpbmNsdWRpbmcgYHRleHRgKS5cblx0Y29uc3RydWN0b3IodGV4dE9yUHJvcHMpIHtcblx0XHRpZiAodHlwZW9mIHRleHRPclByb3BzID09PSBcInN0cmluZ1wiKVxuXHRcdFx0dGhpcy50ZXh0ID0gdGV4dE9yUHJvcHM7XG5cdFx0ZWxzZVxuXHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCB0ZXh0T3JQcm9wcyk7XG5cblx0XHQvLyBNYWtlIHN1cmUgYHRleHRgIGlzIGRlZmluZWQuXG5cdFx0aWYgKCEoXCJ0ZXh0XCIgaW4gdGhpcykpIHRoaXMudGV4dCA9IFwiXCI7XG5cdFx0aWYgKCEoXCJzdGFydEluZGV4XCIgaW4gdGhpcykpIHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdH1cblxuXHQvLyBSZXR1cm4gYW4gaW1tdXRhYmxlIGNsb25lIG9mIHRoZSBzdHJlYW0uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0bGV0IGNsb25lID0gbmV3IFRleHRTdHJlYW0odGhpcyk7XG5cdFx0T2JqZWN0LmFzc2lnbihjbG9uZSwgcHJvcHMpO1xuXHRcdHJldHVybiBjbG9uZTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2VkIHRvIG5ldyBzdGFydEluZGV4LlxuXHRhZHZhbmNlVG8oc3RhcnRJbmRleCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleCB9KTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2luZyBzdGFydEluZGV4IEJZIGBsZW5ndGhgXG5cdGFkdmFuY2VCeShsZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcblx0fVxuXG4vLyBcdC8vIFJldHVybiBjbG9uZSBvZiB0aGlzIHN0cmVhbSB3aXRoIGVuZEluZGV4IHNldCB0byBzdGFydCArIGBsZW5ndGhgXG4vLyBcdGVuZEFmdGVyKGxlbmd0aCkge1xuLy8gXHRcdHJldHVybiB0aGlzLmNsb25lKHsgZW5kSW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcbi8vIFx0fVxuXG4vL1xuLy8gIyMgTWF0Y2hpbmdcbi8vXG5cdC8vIE1hdGNoIGBwYXR0ZXJuYCBhcyByZWdleCBhdCBoZWFkIG9mIHN0cmVhbS5cblx0Ly8gTk9URTogcmVnZXhlcyBzaG91bGQgc3RhcnQgd2l0aCBgXmAhXG5cdC8vIFJldHVybnMgbWF0Y2ggb3IgdW5kZWZpbmVkLlxuXHRtYXRjaChwYXR0ZXJuKSB7XG5cdFx0aWYgKCEocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHRocm93IG5ldyBUeXBlRXJyb3IoYFRleHRTdHJlYW0ubWF0Y2goJHtwYXR0ZXJufSk6IGV4cGVjdGVkIFJlZ0V4cGApO1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5tYXRjaChwYXR0ZXJuKTtcblx0fVxuXG5cdHN0YXJ0c1dpdGgoc3RyaW5nKSB7XG4vL1RPRE86IHVzZSBgc3RyZWFtLnJhbmdlYCB0byBlbnN1cmUgbWF0Y2ggaXMgbm90IG5vdCBiZXlvbmQgYHN0cmluZy5lbmRJbmRleGBcblx0XHRyZXR1cm4gdGhpcy5oZWFkLnN0YXJ0c1dpdGgoc3RyaW5nKTtcblx0fVxuXG5cbi8vXG4vLyAjIyBSZWZsZWN0aW9uXG4vL1xuXHQvLyBSZXR1cm4gdGV4dCBvZiBzdHJpbmcgc3RhcnRpbmcgYXQgb3VyIGBzdGFydEluZGV4YFxuXHRnZXQgaGVhZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5yYW5nZSgpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgcmFuZ2Ugb2YgdGhlIHN0cmluZyBmcm9tIGBzdGFydEluZGV4YCB0byBgZW5kSW5kZXhgIE5PTi1pbmNsdXNpdmUuXG5cdHJhbmdlKHN0YXJ0SW5kZXggPSB0aGlzLnN0YXJ0SW5kZXgsIGVuZEluZGV4ID0gdGhpcy50ZXh0Lmxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQuc3Vic3RyaW5nKHN0YXJ0SW5kZXgsIGVuZEluZGV4KTtcblx0fVxuXG5cdC8vIExlbmd0aCBvZiB0aGUgc3RyZWFtLlxuXHRnZXQgbGVuZ3RoKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQubGVuZ3RoO1xuXHR9XG5cblx0Ly8gQXJlIHdlIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmVhbT9cblx0Z2V0IGlzRW1wdHkoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3RhcnRJbmRleCA9PT0gdGhpcy5sZW5ndGg7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0XG5cdH07XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvVGV4dFN0cmVhbS5qcyIsIi8vXG4vL1x0IyBDb3JlIGBydWxlc2AgLS0gc2ltcGxlIGRhdGF0eXBlcywgZXRjLlxuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy9cbi8vIFJlZ2V4IHBhdHRlcm4gcnVsZXMgd2l0aCBjdXN0b20gY29uc3RydWN0b3JzIGZvciBkZWJ1Z2dpbmdcbi8vXG4vL3BhcnNlci5hZGRQYXR0ZXJuKFwid2hpdGVzcGFjZVwiLCAvXlxccysvKTtcblJ1bGUuV2hpdGVzcGFjZSA9IGNsYXNzIHdoaXRlc3BhY2UgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge31cbnBhcnNlci5hZGRSdWxlKFwid2hpdGVzcGFjZVwiLCBuZXcgUnVsZS5XaGl0ZXNwYWNlKHsgcGF0dGVybjogL15cXHMrLywgb3B0aW9uYWw6IHRydWUgfSkpO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG4vL3BhcnNlci5hZGRQYXR0ZXJuKFwidHlwZW5hbWVcIiwgL15bQS1aXVtcXHdcXGRcXC1fXSovKTtcblJ1bGUuVHlwZSA9IGNsYXNzIFR5cGUgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgdHlwZSA9IHBhcnNlci5hZGRSdWxlKFwiVHlwZVwiLCBuZXcgUnVsZS5UeXBlKHtcblx0cGF0dGVybjogL15bQS1aXVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCB0eXBlKTtcblxuXG4vLyBgbnVtYmVyYCBhcyBlaXRoZXIgZmxvYXQgb3IgaW50ZWdlciwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuUnVsZS5OdW1iZXIgPSBjbGFzcyBudW1iZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgbnVtYmVyID0gcGFyc2VyLmFkZFJ1bGUoXCJudW1iZXJcIiwgbmV3IFJ1bGUuTnVtYmVyKHtcblx0cGF0dGVybjogL14tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gbnVtYmVyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlRmxvYXQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBudW1iZXIpO1xuXG5cbi8vIE51bWVyaWMgYGludGVnZXJgIG9ubHksIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHRoaXMgV0lMTCBtYXRjaCBhIGZsb2F0LCBidXQgdGhlIHJldHVybmVkIHZhbHVlIHdpbGwgY29lcmNlIHRvIGFuIGludGVnZXIuXG4vLyBSRVZJRVc6IGlzIHRoaXMgcmlnaHQ/ICBCZXR0ZXIgdG8gbm90IG1hdGNoIGEgZmxvYXQ/XG5SdWxlLkludGVnZXIgPSBjbGFzcyBpbnRlZ2VyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJpbnRlZ2VyXCIsIG5ldyBSdWxlLkludGVnZXIoe1xuXHRwYXR0ZXJuOiAvXi0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBpbnRlZ2VyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlSW50KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5cblxuLy8gTGl0ZXJhbCBgdGV4dGAgc3RyaW5nLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBZb3UgY2FuIHVzZSBlaXRoZXIgc2luZ2xlIG9yIGRvdWJsZSBxdW90ZXMgb24gdGhlIG91dHNpZGUgKGFsdGhvdWdoIGRvdWJsZSBxdW90ZXMgYXJlIHByZWZlcnJlZCkuXG4vLyBSZXR1cm5lZCB2YWx1ZSBoYXMgZW5jbG9zaW5nIHF1b3Rlcy5cbi8vIFRPRE86IGVzY2FwZWQgcXVvdGVzIGluc2lkZSBzdHJpbmdcblJ1bGUuVGV4dCA9IGNsYXNzIHRleHQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgdGV4dCA9IHBhcnNlci5hZGRSdWxlKFwidGV4dFwiLCBuZXcgUnVsZS5UZXh0KHtcblx0cGF0dGVybjogL14oPzpcIlteXCJdKlwifCdbXiddKicpL1xufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHRleHQpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cblJ1bGUuQm9vbGVhbiA9IGNsYXNzIGJvb2xlYW4gZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgYm9vbCA9IHBhcnNlci5hZGRSdWxlKFwiYm9vbGVhblwiLCBuZXcgUnVsZS5Cb29sZWFuKHtcblx0cGF0dGVybjogL14odHJ1ZXxmYWxzZXx5ZXN8bm98c3VjY2Vzc3xmYWlsdXJlfG9rfGNhbmNlbClcXGIvLFxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHN3aXRjaCAodGhpcy5tYXRjaGVkKSB7XG5cdFx0XHRjYXNlIFwidHJ1ZVwiOlxuXHRcdFx0Y2FzZSBcInllc1wiOlxuXHRcdFx0Y2FzZSBcInN1Y2Nlc3NcIjpcblx0XHRcdGNhc2UgXCJva1wiOlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBib29sKTtcblxuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuLy9wYXJzZXIuYWRkUGF0dGVybihcImlkZW50aWZpZXJcIiwgL15bYS16XVtcXHdcXGRcXC1fXSovKTtcbi8vVE9ETzogZG9uJ3QgYWNjZXB0IGNlcnRhaW4ga2V5d29yZHM/Pz9cblJ1bGUuSWRlbnRpZmllciA9IGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgaWRlbnRpZmllciA9IHBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgUnVsZS5JZGVudGlmaWVyKHtcblx0cGF0dGVybjogL15bYS16XVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBpZGVudGlmaWVyKTtcblxuLy8gTGl0ZXJhbCB2YWx1ZSBhcyBudW1iZXIsIHRleHQgb3IgYm9vbGVhbi5cbi8vVE9ETzogdGhpcyBpcyBhbiBleHByZXNzaW9uLi4uIGJ1dCBpbnN0YWxsaW5nIGl0IHRoYXQgd2F5IGJyZWFrcyBwYXJzaW5nLi4uP1xucGFyc2VyLmFkZFN5bnRheChcImxpdGVyYWxcIiwgXCIobGl0ZXJhbDp7bnVtYmVyfXx7dGV4dH18e2Jvb2xlYW59KVwiKTtcblxuXG4vLyBMaXRlcmFsIGxpc3QgKGFycmF5KSwgZWc6ICBgWzEsMix0cnVlLGZhbHNlIF1gXG5sZXQgbGlzdCA9IHBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpdGVyYWwtbGlzdFwiLFxuXHRcIlxcXFxbW2xpc3Q6e2V4cHJlc3Npb259LF0/XFxcXF1cIixcblx0e1xuXHRcdGdhdGhlckFyZ3VtZW50cygpIHtcblx0XHRcdHJldHVybiB0aGlzLnJlc3VsdHNbMV07XG5cdFx0fSxcblx0XHQvLyByZXR1cm4ganVzdCB0aGUgbGlzdCBhcyBvdXIgc291cmNlXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuIFx0XHRcdHJldHVybiB0aGlzLmdhdGhlckFyZ3VtZW50cygpLnRvU291cmNlKCk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY29yZS5qcyIsImltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBsb2FkIHN0YW5kYXJkIHJ1bGVzIGZpbGVzIGhlcmVcbmltcG9ydCBcIi4vY29yZVwiO1xuaW1wb3J0IFwiLi9udW1iZXJzXCI7XG5pbXBvcnQgXCIuL29wZXJhdG9yc1wiO1xuaW1wb3J0IFwiLi9hc3NpZ25tZW50XCI7XG5pbXBvcnQgXCIuL2NsYXNzXCI7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaW5kZXguanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFRPRE86IHtwcm9wZXJ0eS1leHByZXNzaW9ufSBhbHNvIHdvcmtzLi4uIHthc3NpZ25hYmxlLWV4cHJlc3Npb259ID8/P1xucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJ7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cIiwge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0bGV0IHZhbHVlID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0Ly8gVE9ETzogZGVjbGFyZSBpZGVudGlmaWVyIGlmIG5vdCBpbiBzY29wZSwgZXRjXG5cdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9ID0gJHt2YWx1ZX1gO1xuXHR9XG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9hc3NpZ25tZW50LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vL3BhcnNlci5hZGRFeHByZXNzaW9uKFwicHJvcGVydHktb2ZcIiwgXCJ7cHJvcGVydHk6cHJvcGVydHktbmFtZX0rIHtleHByZXNzaW9ufVwiLCB7XG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcInByb3BlcnR5LW9mXCIsIFwiKHByb3BlcnRpZXM6dGhlIHtpZGVudGlmaWVyfSBvZikrIHtleHByZXNzaW9ufVwiLCB7XG4gXHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0bGV0IGFyZ3MgPSBSdWxlLkV4cHJlc3Npb24uZ2F0aGVyQXJndW1lbnRzKHRoaXMpO1xuXHRcdC8vIHRyYW5zZm9ybSBwcm9wZXJ0aWVzIGFuZCByZXZlcnNlIG9yZGVyXG5cdFx0YXJncy5wcm9wZXJ0aWVzID0gYXJncy5wcm9wZXJ0aWVzLm1hcCggc2VxdWVuY2UgPT4gc2VxdWVuY2UuaWRlbnRpZmllciApLnJldmVyc2UoKTtcblx0XHRyZXR1cm4gYXJncztcbiBcdH0sXG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgdGhpbmcgPSBhcmdzLmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRsZXQgcHJvcGVydGllcyA9IGFyZ3MucHJvcGVydGllcy5tYXAoIGlkZW50aWZpZXIgPT4gaWRlbnRpZmllci50b1NvdXJjZSgpICkuam9pbihcIi5cIik7XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXQoJHt0aGluZ30sICcke3Byb3BlcnRpZXN9JylgO1xuXHR9XG59KTtcblxuXG5cbnBhcnNlci5hZGRTeW50YXgoXCJzY29wZS1tb2RpZmllclwiLCBcIihzY29wZTpnbG9iYWx8Y29uc3RhbnR8c2hhcmVkKVwiKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlLXByb3BlcnR5XCIsXG5cdFwie3Njb3BlLW1vZGlmaWVyfT8ge2Fzc2lnbm1lbnR9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuYXNzaWdubWVudC5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgdmFsdWUgPSBhcmdzLmFzc2lnbm1lbnQuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGFzc2lnbm1lbnQgPSBgJHtpZGVudGlmaWVyfSA9ICR7dmFsdWV9YDtcblxuXHRcdFx0dmFyIHNjb3BlID0gYXJncy5zY29wZSA/IGFyZ3Muc2NvcGUudG9Tb3VyY2UoKSA6IFwibG9jYWxcIjtcblx0XHRcdHN3aXRjaCAoc2NvcGUpIHtcblx0XHRcdFx0Y2FzZSBcImdsb2JhbFwiOlxuXHRcdFx0XHRcdHJldHVybiBgZ2xvYmFsLiR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZFwiOlxuXHRcdFx0XHRcdHJldHVybiBgc3RhdGljICR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0cmV0dXJuIGFzc2lnbm1lbnQ7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZS1wcm9wZXJ0eS1hcy1vbmUtb2ZcIixcblx0XCJ7aWRlbnRpZmllcn0gYXMgb25lIG9mIHtsaXN0OmxpdGVyYWwtbGlzdH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgcGx1cmFsID0gKGlkZW50aWZpZXIgKyBcIl9WQUxVRVNcIikudG9VcHBlckNhc2UoKTtcblx0XHRcdGxldCBsaXN0ID0gYXJncy5saXN0Lmxpc3Q7XG5cdFx0XHRsZXQgdmFsdWVzID0gbGlzdC50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGZpcnN0ID0gbGlzdC5yZXN1bHRzWzBdO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKCkgOiBcInVuZGVmaW5lZFwiO1xuXG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke3BsdXJhbH0gPSAke3ZhbHVlc307XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0geyByZXR1cm4gKFwiX18ke2lkZW50aWZpZXJ9XCIgaW4gdGhpcyA/IHRoaXMuX18ke2lkZW50aWZpZXJ9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfVxcbmA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY2xhc3MuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBudW1iZXJzXG4vL1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vIE51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmcuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4LWV4cHJlc3Npb25cIiwgXCJpdGVtIHtudW1iZXI6aW50ZWdlcn0gb2Yge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoKSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBudW1iZXIgPSBhcmdzLm51bWJlci50b1NvdXJjZSgpO1xuXHRcdGxldCBleHByZXNzaW9uID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7bnVtYmVyfSlgO1xuXHR9XG59KTtcblxuLy8gRW5nbGlzaCB3b3JkcyB1c2VkIGZvciBwb3NpdGlvbiBvZiBzb21ldGhpbmcgaW4gYSBsaXN0LlxuLy8gVE9ETzogYHNldmVudHktc2V2ZW50aGAsIGB0aGlyZC10by1sYXN0YC4uLlxucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCIoZmlyc3R8c2Vjb25kfHRoaXJkfGZvdXJ0aHxmaWZ0aHxzaXh0aHxzZXZlbnRofGVpZ2h0aHxuaW50aHx0ZW50aHxwZW51bHRpbWF0ZXxsYXN0fGZpbmFsKVwiLCB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgb3JkaW5hbCA9IHRoaXMubWF0Y2hlZC50b1NvdXJjZSgpO1xuXHRcdHN3aXRjaCAob3JkaW5hbCkge1xuXHRcdFx0Y2FzZSBcImZpcnN0XCI6XHRcdHJldHVybiAxO1xuXHRcdFx0Y2FzZSBcInNlY29uZFwiOlx0XHRyZXR1cm4gMjtcblx0XHRcdGNhc2UgXCJ0aGlyZFwiOlx0XHRyZXR1cm4gMztcblx0XHRcdGNhc2UgXCJmb3VydGhcIjpcdFx0cmV0dXJuIDQ7XG5cdFx0XHRjYXNlIFwiZmlmdGhcIjpcdFx0cmV0dXJuIDU7XG5cdFx0XHRjYXNlIFwic2l4dGhcIjpcdFx0cmV0dXJuIDY7XG5cdFx0XHRjYXNlIFwic2V2ZW50aFwiOlx0XHRyZXR1cm4gNztcblx0XHRcdGNhc2UgXCJlaWdodGhcIjpcdFx0cmV0dXJuIDg7XG5cdFx0XHRjYXNlIFwibmludGhcIjpcdFx0cmV0dXJuIDk7XG5cdFx0XHRjYXNlIFwidGVudGhcIjpcdFx0cmV0dXJuIDEwO1xuXHRcdFx0Y2FzZSBcInBlbnVsdGltYXRlXCI6XHRyZXR1cm4gLTI7XG5cdFx0XHRjYXNlIFwibGFzdFwiOlx0XHRyZXR1cm4gLTE7XG5cdFx0XHRjYXNlIFwiZmluYWxcIjpcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0fVxufSk7XG5cbi8vIEFsdGVybmF0aXZlIGZvcm0gZm9yIG51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmcuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4LWV4cHJlc3Npb25cIiwgXCJ0aGUge29yZGluYWx9IGl0ZW0gb2Yge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoKSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBvcmRpbmFsID0gYXJncy5vcmRpbmFsLnRvU291cmNlKCk7XG5cdFx0bGV0IGV4cHJlc3Npb24gPSBhcmdzLmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtvcmRpbmFsfSlgO1xuXHR9XG59KTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL251bWJlcnMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGluZml4IGFuZCBwcmVmaXggb3BlcmF0b3JzLlxuLy9cblxuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8jIyBJbmZpeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj4ge3Joc31gLCBlZzogYGEgaXMgMWBcbi8vIE5PVEU6IGBvcGVyYXRvci50cmFuc2Zvcm1lcmAgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHR3byBhcmd1bWVudHMgKGBsaHNgIGFuZCBgcmhzYCkgaW50byBvdXRwdXQuXG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNcIiwgXCJpc1wiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ID09ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdFwiLCBcImlzIG5vdFwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXMtZXhhY3RseVwiLCBcImlzIGV4YWN0bHlcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSA9PT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXMtbm90LWV4YWN0bHlcIiwgXCJpcyBub3QgZXhhY3RseVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ICE9PSAke2J9KWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5pc09mVHlwZSh0aGluZywgdHlwZSlgXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLXR5cGUtb2ZcIiwgXCJpcyAoYXxhbilcIiwgeyB0cmFuc2Zvcm1lcih0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdC10eXBlLW9mXCIsIFwiaXMgbm90IChhfGFuKVwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzSW4odGhpbmcsIGNvbGxlY3Rpb24pYFxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1pblwiLCBcImlzIGluXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcsIGxpc3R5KSB7IHJldHVybiBgc3BlbGwuaXNJbigke3RoaW5nfSwgJHtsaXN0eX0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW9uZS1vZlwiLCBcImlzIG9uZSBvZlwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCBsaXN0eSkgeyByZXR1cm4gYHNwZWxsLmlzSW4oJHt0aGluZ30sICR7bGlzdHl9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1ub3QtaW5cIiwgXCJpcyBub3QgaW5cIiwgeyB0cmFuc2Zvcm1lcih0aGluZywgbGlzdHkpIHsgcmV0dXJuIGAhc3BlbGwuaXNJbigke3RoaW5nfSwgJHtsaXN0eX0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdC1vbmUtb2ZcIiwgXCJpcyBub3Qgb25lIG9mXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcsIGxpc3R5KSB7IHJldHVybiBgIXNwZWxsLmlzSW4oJHt0aGluZ30sICR7bGlzdHl9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0XCIsIFwiKD58aXMgZ3JlYXRlciB0aGFuKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndGVcIiwgXCIoPj18aXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibHRcIiwgXCIoPHxpcyBsZXNzIHRoYW4pXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0ZVwiLCBcIig8PXxpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8pXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkU3ludGF4KFxuXHRcImluZml4LW9wZXJhdG9yLWV4cHJlc3Npb25cIixcblx0XCJ7bGhzOmV4cHJlc3Npb259IHtvcGVyYXRvcjppbmZpeC1vcGVyYXRvcn0ge3JoczpleHByZXNzaW9ufVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGxocyA9IGFyZ3MubGhzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHJocyA9IGFyZ3MucmhzLnRvU291cmNlKGNvbnRleHQpO1xuXG5cdFx0XHRsZXQgdHJhbnNmb3JtZXIgPSBhcmdzLm9wZXJhdG9yLm1hdGNoZWQudHJhbnNmb3JtZXI7XG5cdFx0XHRyZXR1cm4gdHJhbnNmb3JtZXIobGhzLCByaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8jIyBQb3N0aWZ4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPmAsIGUuZy4gYGEgaXMgZGVmaW5lZGBcbi8vIE5PVEU6IGBvcGVyYXRvci50cmFuc2Zvcm1lcmAgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBvdXRwdXQuXG5cbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpcy1kZWZpbmVkXCIsIFwiaXMgZGVmaW5lZFwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSAhPT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtbm90LWRlZmluZWRcIiwgXCJpcyBub3QgZGVmaW5lZFwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtdW5kZWZpbmVkXCIsIFwiaXMgdW5kZWZpbmVkXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtZW1wdHlcIiwgXCJpcyBlbXB0eVwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpcy1ub3QtZW1wdHlcIiwgXCJpcyBub3QgZW1wdHlcIiwgeyB0cmFuc2Zvcm1lcih0aGluZykgeyByZXR1cm4gYCFzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfX0pO1xuXG5cbnBhcnNlci5hZGRTeW50YXgoXG5cdFwicG9zdGZpeC1vcGVyYXRvci1leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeC1vcGVyYXRvcn1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBsaHMgPSBhcmdzLmxocy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCB0cmFuc2Zvcm1lciA9IGFyZ3Mub3BlcmF0b3IubWF0Y2hlZC50cmFuc2Zvcm1lcjtcblx0XHRcdHJldHVybiB0cmFuc2Zvcm1lcihsaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG5wYXJzZXIuYWRkU3ludGF4KFwib3BlcmF0b3ItZXhwcmVzc2lvblwiLCBcIihleHByZXNzaW9uOntwb3N0Zml4LW9wZXJhdG9yLWV4cHJlc3Npb259fHtpbmZpeC1vcGVyYXRvci1leHByZXNzaW9ufSlcIik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIl0sInNvdXJjZVJvb3QiOiIifQ==