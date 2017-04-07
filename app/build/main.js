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
		var lastIndex = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : syntaxStream.length;

		while (startIndex < lastIndex) {
			var _Rule$parseRuleSyntax = _Rule2.default.parseRuleSyntax_token(syntaxStream, rules, startIndex),
			    _Rule$parseRuleSyntax2 = _slicedToArray(_Rule$parseRuleSyntax, 2),
			    rule = _Rule$parseRuleSyntax2[0],
			    endIndex = _Rule$parseRuleSyntax2[1];

			if (endIndex >= lastIndex) throw new SyntaxError("Past lastIndex");

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
			case "|":
				return _Rule2.default.parseRuleSyntax_alternatives(syntaxStream, rules, startIndex);
			case "*":
			case "+":
			case "?":
				return _Rule2.default.parseRuleSyntax_repeat(syntaxStream, rules, startIndex);

			// the following should ALWAYS be consumed by the above
			case "}":
			case ")":
			case "]":
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
	},


	// Match alternate `( a | b | c )`.
	// NOTE: this should only happen inside a group...
	parseRuleSyntax_alternatives: function parseRuleSyntax_alternatives(syntaxStream, rules, startIndex) {
		var _Rule$parseRuleSyntax3 = _Rule2.default.parseRuleSyntax_token(syntaxStream, rules, startIndex + 1),
		    _Rule$parseRuleSyntax4 = _slicedToArray(_Rule$parseRuleSyntax3, 2),
		    rule = _Rule$parseRuleSyntax4[0],
		    endIndex = _Rule$parseRuleSyntax4[1];

		// create alternates rule with lastToken, or re-use existing alternates rile


		var alternates = void 0;
		var lastToken = rules.pop();
		if (lastToken instanceof _Rule2.default.Alternatives) {
			alternates = lastToken;
		} else {
			alternates = new _Rule2.default.Alternatives({ rules: [] });

			// if no last rule, we have a rule like  `( | abc)` which means that the alternates is optional
			if (!lastToken) alternates.optional = true;else alternates.rules.push(lastToken);
		}
		// add parsed rule to the alternatess
		alternates.rules.push(rule);

		// add back to the end of rules
		rules.push(alternates);

		return [undefined, endIndex];
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

// TODO:	this doesn't worky:   `{a} (is|is not) {b}`
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
				if (console.group) {
					console.group("Error parsing syntax for rule '" + name + "':");
					console.log("syntax: " + ruleSyntax);
					console.error(e);
					console.groupEnd();
				} else {
					console.warn("Error parsing syntax for rule '" + name + "':", e);
				}
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


		//
		//## Reflection
		//
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
//TODO: this is an expression... ?
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

// TODO: {property-expression} also works...

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgODQ5MTEwZWY0ZWZhZGQyNDFkZWUiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGVTeW50YXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImFzc2lnbiIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJTZXF1ZW5jZSIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInJ1bGVzIiwicGFyc2VSdWxlU3ludGF4X3Rva2VucyIsInJ1bGUiLCJsZW5ndGgiLCJTWU5UQVhfRVhQUkVTU0lPTiIsIm1hdGNoIiwiU3ludGF4RXJyb3IiLCJzdGFydEluZGV4IiwibGFzdEluZGV4IiwicGFyc2VSdWxlU3ludGF4X3Rva2VuIiwiZW5kSW5kZXgiLCJsYXN0IiwiU3RyaW5nIiwic3RyaW5nIiwicHVzaCIsInN5bnRheFRva2VuIiwicGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUiLCJwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMiLCJwYXJzZVJ1bGVTeW50YXhfbGlzdCIsInBhcnNlUnVsZVN5bnRheF9hbHRlcm5hdGl2ZXMiLCJwYXJzZVJ1bGVTeW50YXhfcmVwZWF0IiwicGFyc2VSdWxlU3ludGF4X3N0cmluZyIsIktleXdvcmQiLCJrZXl3b3JkIiwic3RhcnRzV2l0aCIsInN1YnN0ciIsInRvU3RyaW5nIiwiZmluZE5lc3RlZFRva2VucyIsInNsaWNlIiwiYXJndW1lbnQiLCJhbHRlcm5hdGVzIiwiZ3JvdXBBbHRlcm5hdGVzIiwibWFwIiwiZ3JvdXAiLCJyZXN1bHRzIiwiQWx0ZXJuYXRpdmVzIiwidG9rZW5zIiwiY3VycmVudCIsImkiLCJ0b2tlbiIsImNvbmNhdCIsInN5bWJvbCIsIlJlcGVhdCIsIm9wdGlvbmFsIiwidW5kZWZpbmVkIiwiam9pbiIsIlN1YnJ1bGUiLCJMaXN0IiwiaXRlbSIsImRlbGltaXRlciIsImxhc3RUb2tlbiIsInBvcCIsInBhcnNlciIsIndpbmRvdyIsIlBhcnNlciIsInByb3BlcnRpZXMiLCJjcmVhdGUiLCJhZGRSdWxlIiwibmFtZSIsInN0cmVhbSIsImdldFJ1bGUiLCJlYXRXaGl0ZXNwYWNlIiwicGFyc2UiLCJyZXN1bHQiLCJ3aGl0ZXNwYWNlIiwibmV4dCIsImV4aXN0aW5nIiwiZGVidWciLCJjb25zb2xlIiwibG9nIiwicnVsZU5hbWUiLCJwYXR0ZXJuIiwiUGF0dGVybiIsInJ1bGVTeW50YXgiLCJlIiwiZXJyb3IiLCJncm91cEVuZCIsIndhcm4iLCJhZGRTeW50YXgiLCJTdGF0ZW1lbnQiLCJFeHByZXNzaW9uIiwidHJhbnNmb3JtZXIiLCJUeXBlRXJyb3IiLCJzdGFydFRva2VuIiwiZW5kVG9rZW4iLCJuZXN0aW5nIiwibmVzdGVkIiwiREVCVUciLCJSdWxlIiwicHJvcHMiLCJjbG9uZSIsImFkdmFuY2VUbyIsImNvbnN0cnVjdG9yIiwiZ2F0aGVyQXJndW1lbnRzIiwibWF0Y2hlZCIsIlJlZ0V4cCIsIk5lc3RlZCIsInNlcXVlbmNlIiwiYXJncyIsImFyZ05hbWUiLCJfYXJnIiwiQXJyYXkiLCJpc0FycmF5IiwiYmVzdE1hdGNoIiwiY29udGV4dCIsInRvU291cmNlIiwicmVwZWF0IiwiaW5kZXgiLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJ0ZXh0IiwiaGVhZCIsInN1YnN0cmluZyIsInJhbmdlIiwiV2hpdGVzcGFjZSIsIlR5cGUiLCJ0eXBlIiwicmVwbGFjZSIsIk51bWJlciIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJJbnRlZ2VyIiwicGFyc2VJbnQiLCJUZXh0IiwiQm9vbGVhbiIsImJvb2wiLCJJZGVudGlmaWVyIiwiaWRlbnRpZmllciIsImxpc3QiLCJhZGRFeHByZXNzaW9uIiwiYWRkU3RhdGVtZW50IiwidmFsdWUiLCJleHByZXNzaW9uIiwicmV2ZXJzZSIsInRoaW5nIiwiYXNzaWdubWVudCIsInNjb3BlIiwicGx1cmFsIiwidG9VcHBlckNhc2UiLCJ2YWx1ZXMiLCJmaXJzdCIsImZpcnN0VmFsdWUiLCJvcmRpbmFsIiwiYWRkSW5maXhPcGVyYXRvciIsImEiLCJiIiwibGlzdHkiLCJsaHMiLCJyaHMiLCJvcGVyYXRvciIsImFkZFBvc3RmaXhPcGVyYXRvciJdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLG1EQUEyQyxjQUFjOztBQUV6RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7QUNoRUE7Ozs7QUFDQTs7Ozs7O0FBRUE7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQUEsT0FBT0MsTUFBUCxpQkFBb0I7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QUFBRXJFLFlBQUYsdUJBQWNxRCxLQUFkLEVBQXFCO0FBQUUsNkJBQXlCQSxLQUF6QjtBQUFtQztBQUExRCxDQUExRDs7QUFHQSxpQkFBT3hELFNBQVAsQ0FDQyw2QkFERCxFQUVDLDhDQUZELEVBR0M7QUFDQzJCLFNBREQsb0JBQ1VELE9BRFYsRUFDbUI7QUFDakIsTUFBSU4sT0FBTyxLQUFLTCxlQUFMLEVBQVg7QUFDQSxNQUFJc0QsTUFBTWpELEtBQUtpRCxHQUFMLENBQVMxQyxRQUFULENBQWtCRCxPQUFsQixDQUFWO0FBQ0EsTUFBSXZCLGNBQWNpQixLQUFLbUQsUUFBTCxDQUFjdkQsT0FBZCxDQUFzQmIsV0FBeEM7QUFDQSxTQUFPQSxZQUFZa0UsR0FBWixDQUFQO0FBQ0E7QUFORixDQUhEOztBQWNBO0FBQ0EsaUJBQU9yRSxTQUFQLENBQWlCLHFCQUFqQixFQUF3Qyx3RUFBeEMsRTs7Ozs7Ozs7Ozs7OztBQzVFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7Ozs7O0FBRUE7QUFDQSxJQUFJLE9BQU96QixNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQ2xDQSxRQUFPdUQsVUFBUDtBQUNBdkQsUUFBT0MsTUFBUDtBQUNBRCxRQUFPbUMsSUFBUDtBQUNBbkMsUUFBT0QsTUFBUDtBQUNBOztrQkFFYztBQUNkd0QsaUNBRGMsRUFDRnRELHdCQURFLEVBQ01rQyxvQkFETixFQUNZcEM7QUFEWixDIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMTEpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDg0OTExMGVmNGVmYWRkMjQxZGVlIiwiaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gcmUtZXhwb3J0IFJ1bGUgZm9yIHRlc3RpbmdcbmV4cG9ydCBkZWZhdWx0IFJ1bGU7XG5cbi8vXG4vL1x0IyBQYXJzaW5nIGBydWxlU3ludGF4YCB0byBjcmVhdGUgcnVsZXMgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUT0RPOlx0UHVsbCBgcGFyc2VSdWxlU3ludGF4YCBzdHVmZiBvdXQgaW50byBzZXBhcmF0ZSBtb2R1bGU/XG4vLyBUT0RPOlx0QmV0dGVyIG5hbWUgZm9yIGBydWxlU3ludGF4YFxuLy8gVE9ETzpcdFVzZSBrZXl3b3JkcyBpbiBzeW50YXggdG8gbWFrZSBhIHF1aWNrIHJlZ2V4LWJhc2VkIGB0ZXN0YCBmdW5jdGlvbiBmb3IgdGhlIGVudGlyZSBydWxlXG5PYmplY3QuYXNzaWduKFJ1bGUsIHtcblxuLy9cbi8vICMjIGdyb3VwOiBwYXJzaW5nIHN5bnRheFxuLy9cblxuLy8gVE9ETzogY29udmVydCB0byBUZXh0U3RyZWFtIHBhdHRlcm4gYWxhIG5vcm1hbCBwYXJzZXIgb25jZSB0aGF0IHNldHRsZXMgZG93bj8/P1xuXHRwYXJzZVJ1bGVTeW50YXgoc3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIFtdKTtcblxuXHRcdGxldCBydWxlO1xuXHRcdC8vIElmIHdlIG9ubHkgZ290IG9uZSB0aGluZywgcmV0dXJuIHRoYXQgYXMgdGhlIHJlc3VsdFxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSBydWxlc1swXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFNlcXVlbmNlQ29uc3RydWN0b3IoeyBydWxlcyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fSxcblxuXHR0b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KSB7XG5cdFx0Y29uc3QgU1lOVEFYX0VYUFJFU1NJT04gPSAvKD86W1xcd1xcLV0rfFxcXFxbXFxbXFwoXFx7XFwpXFx9XFxdXXxbXlxcc1xcd118XFx8KS9nO1xuXHRcdHZhciBzeW50YXhTdHJlYW0gPSBzeW50YXgubWF0Y2goU1lOVEFYX0VYUFJFU1NJT04pO1xuXHRcdGlmICghc3ludGF4U3RyZWFtKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHRva2VuaXplIHBhcnNlIHJ1bGUgc3ludGF4ID4+JHtzeW50YXh9PDxgKTtcblx0XHRyZXR1cm4gc3ludGF4U3RyZWFtO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDAsIGxhc3RJbmRleCA9IHN5bnRheFN0cmVhbS5sZW5ndGgpIHtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKGVuZEluZGV4ID49IGxhc3RJbmRleClcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKFwiUGFzdCBsYXN0SW5kZXhcIik7XG5cblx0XHRcdGlmIChydWxlKSB7XG5cdFx0XHRcdHZhciBsYXN0ID0gcnVsZXNbcnVsZXMubGVuZ3RoLTFdO1xuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYFN0cmluZ2AgYW5kIGxhc3Qgd2FzIGEgYFN0cmluZ2AsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLlN0cmluZyAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5TdHJpbmcpIHtcblx0XHRcdFx0XHRsYXN0LnN0cmluZyArPSBydWxlLnN0cmluZztcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRydWxlcy5wdXNoKHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRzdGFydEluZGV4ID0gZW5kSW5kZXggKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZXM7XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0dmFyIHN5bnRheFRva2VuID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXG5cdFx0c3dpdGNoIChzeW50YXhUb2tlbikge1xuXHRcdFx0Y2FzZSBcIntcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIihcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCJbXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCJ8XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfYWx0ZXJuYXRpdmVzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIipcIjpcblx0XHRcdGNhc2UgXCIrXCI6XG5cdFx0XHRjYXNlIFwiP1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblxuXHRcdFx0Ly8gdGhlIGZvbGxvd2luZyBzaG91bGQgQUxXQVlTIGJlIGNvbnN1bWVkIGJ5IHRoZSBhYm92ZVxuXHRcdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGNhc2UgXCIpXCI6XG5cdFx0XHRjYXNlIFwiXVwiOlxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgJHtzeW50YXhUb2tlbn0gZm91bmQgYXMgaXRlbSAke3N0YXJ0SW5kZXh9IG9mICR7dGhpcy5zeW50YXh9YCk7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzdHJpbmcgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF0sIHJ1bGU7XG5cdFx0Ly8gSWYgbGV0dGVycyBvbmx5LCBtYXRjaCBhcyBhIEtleXdvcmQgKHNvIHdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGFmdGVyIHRoZSBzdHJpbmcpLlxuXHRcdGlmIChzdHJpbmcubWF0Y2goL1tBLVphLXpdKy8pKSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuS2V5d29yZCh7IGtleXdvcmQ6IHN0cmluZyB9KTtcblx0XHR9XG5cdFx0Ly8gT3RoZXJ3aXNlIG1hdGNoIGFzIGEgU3RyaW5nLCB3aGljaCBkb2Vzbid0IHJlcXVpcmUgbm9uLXdvcmQgY2hhcnMgYWZ0ZXIgdGhlIHRleHQuXG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuU3RyaW5nKHsgc3RyaW5nOiBzdHJpbmcgfSk7XG5cdFx0XHQvLyBJZiBzdHJpbmcgc3RhcnRzIHdpdGggYFxcXFxgLCBpdCdzIGFuIGVzY2FwZWQgbGl0ZXJhbCAoZWc6IGBcXFtgIG5lZWRzIHRvIGlucHV0IGFzIGBcXFxcW2ApLlxuXHRcdFx0aWYgKHN0cmluZy5zdGFydHNXaXRoKFwiXFxcXFwiKSkge1xuXHRcdFx0XHQvLyByZW1vdmUgbGVhZGluZyBzbGFzaCBpbiBtYXRjaCBzdHJpbmcuLi5cblx0XHRcdFx0cnVsZS5zdHJpbmcgPSBydWxlLnN0cmluZy5zdWJzdHIoMSk7XG5cdFx0XHRcdC8vIGJ1dCBsZWF2ZSBpdCBpbiB0b1N0cmluZ1xuXHRcdFx0XHRydWxlLnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gWyBydWxlLCBzdGFydEluZGV4IF07XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBncm91cGluZyBleHByZXNzaW9uIGAoLi4ufC4uLilgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0Ly8gTk9URTogbmVzdGVkIHBhcmVucyBtYXkgbm90IGhhdmUgYWx0ZXJuYXRpdmVzLi4uIDotKCAgIGAoYXwoYnxjKSlgIHdvbid0IHdvcms/Pz9cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCIoXCIsIFwiKVwiLCBzdGFydEluZGV4KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHQvLyBzcGxpdCBpbnRvIGdyb3VwcywgaW5jbHVkaW5nIG5lc3RlZCBwYXJlbnNcblx0XHRsZXQgYWx0ZXJuYXRlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0ZXMoc2xpY2UpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0XHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKGdyb3VwLCBbXSk7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHRzWzBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdGxldCBydWxlID0gYWx0ZXJuYXRlcy5sZW5ndGggPT09IDEgPyBhbHRlcm5hdGVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0ZXMgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblxuXHRcdGZ1bmN0aW9uIGdyb3VwQWx0ZXJuYXRlcyh0b2tlbnMpIHtcblx0XHRcdHZhciBhbHRlcm5hdGVzID0gW107XG5cdFx0XHR2YXIgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGhhbmRsZSBuZXN0ZWQgcGFyZW5zXG5cdFx0XHRcdGVsc2UgaWYgKHRva2VuID09PSBcIihcIikge1xuXHRcdFx0XHRcdGxldCB7IGVuZEluZGV4IH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmRJbmRleCArIDEpKTtcblx0XHRcdFx0XHRpID0gZW5kSW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3VycmVudC5wdXNoKHRva2VuKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGN1cnJlbnQubGVuZ3RoKSBhbHRlcm5hdGVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRyZXR1cm4gYWx0ZXJuYXRlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdHZhciBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlN1YnJ1bGUoeyBydWxlOiBtYXRjaC5zbGljZVswXSB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBtYXRjaC5lbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuTGlzdCgpO1xuXHRcdHJ1bGUuaXRlbSA9IHJlc3VsdHNbMF1cblx0XHRydWxlLmRlbGltaXRlciA9IHJlc3VsdHNbMV1cblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGFsdGVybmF0ZSBgKCBhIHwgYiB8IGMgKWAuXG5cdC8vIE5PVEU6IHRoaXMgc2hvdWxkIG9ubHkgaGFwcGVuIGluc2lkZSBhIGdyb3VwLi4uXG5cdHBhcnNlUnVsZVN5bnRheF9hbHRlcm5hdGl2ZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCBbIHJ1bGUsIGVuZEluZGV4IF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ICsgMSk7XG5cblx0XHQvLyBjcmVhdGUgYWx0ZXJuYXRlcyBydWxlIHdpdGggbGFzdFRva2VuLCBvciByZS11c2UgZXhpc3RpbmcgYWx0ZXJuYXRlcyByaWxlXG5cdFx0bGV0IGFsdGVybmF0ZXM7XG5cdFx0bGV0IGxhc3RUb2tlbiA9IHJ1bGVzLnBvcCgpO1xuXHRcdGlmIChsYXN0VG9rZW4gaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykge1xuXHRcdFx0YWx0ZXJuYXRlcyA9IGxhc3RUb2tlbjtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRhbHRlcm5hdGVzID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IFtdIH0pO1xuXG5cdFx0XHQvLyBpZiBubyBsYXN0IHJ1bGUsIHdlIGhhdmUgYSBydWxlIGxpa2UgIGAoIHwgYWJjKWAgd2hpY2ggbWVhbnMgdGhhdCB0aGUgYWx0ZXJuYXRlcyBpcyBvcHRpb25hbFxuXHRcdFx0aWYgKCFsYXN0VG9rZW4pXG5cdFx0XHRcdGFsdGVybmF0ZXMub3B0aW9uYWwgPSB0cnVlO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRhbHRlcm5hdGVzLnJ1bGVzLnB1c2gobGFzdFRva2VuKTtcblx0XHR9XG5cdFx0Ly8gYWRkIHBhcnNlZCBydWxlIHRvIHRoZSBhbHRlcm5hdGVzc1xuXHRcdGFsdGVybmF0ZXMucnVsZXMucHVzaChydWxlKTtcblxuXHRcdC8vIGFkZCBiYWNrIHRvIHRoZSBlbmQgb2YgcnVsZXNcblx0XHRydWxlcy5wdXNoKGFsdGVybmF0ZXMpO1xuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBlbmRJbmRleCBdO1xuXHR9LFxuXG5cbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGVTeW50YXguanMiLCIvL1xuLy9cdCMgQ3JlYXRlIGEgYHBhcnNlcmAgc2luZ2xldG9uIHRvIHVzZSB0byBzZXQgdXAgcnVsZXMgYW5kIGR1cmluZyB0ZXN0cy5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5cbi8vIENyZWF0ZSBwYXJzZXIgaW5zdGFuY2UuXG5jb25zdCBwYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG53aW5kb3cucGFyc2VyID0gcGFyc2VyO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvX3BhcnNlci5qcyIsIi8vIFNwZWxsIFwiRW5nbGlzaFwiIHBhcnNlciBzdHJhd21hblxuXG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcmt5OiAgIGB7YX0gKGlzfGlzIG5vdCkge2J9YFxuLy8gVE9ETzpcdGN1c3RvbSBTeW50YXhFcnJvciBldGMgd2hpY2ggdW5kZXJzdGFuZCBzdHJlYW1zXG4vLyBUT0RPOlx0YnJlYWsgYGZpbGVgIGludG8gbGluZXMgYW5kIHByb2Nlc3MgZWFjaCAoaW5jbC4gc3Vic3RyL21hdGNoIG5vdCBnb2luZyBiZXlvbmQgdGhlIGVuZClcbi8vIFRPRE86XHRuZXN0aW5nIC0tIGlzIHRoaXMganVzdCBpbmRlbnQgPSBcImFkZCBibG9jayBzY29wZVwiXG4vLyBUT0RPOlx0cHJvbW90aW9uIHBhdHRlcm4gZm9yIGdhdGhlciBhcmd1bWVudHMgKGVnOiBsaXRlcmFsLWxpc3QpID8/P1xuLy8gVE9ETzpcdFdoYXQgZG9lcyBzeW50YXggdHJlZSBsb29rIGxpa2U/ICBIb3cgZG8gd2UgZXh0cmFjdCBtZWFuaW5nIG91dCBvZiB0aGUgbmVzdD9cbi8vIFRPRE86XHRSZWN5Y2xlIHdvcmQvc3RyaW5nL3BhdHRlcm4gcnVsZXMgdG8gbW9yZSBlYXNpbHkgc2VlIGNvbW1vbmFsaXR5Li4uXG4vLyBUT0RPOlx0UGFzcyBgY29udGV4dGAgdG8gdG9Tb3VyY2UoKSwgYWRkIHByb3BlcnR5IGRlc2NyaXB0b3JzIHRvIGBjbGFzc2AsIHZhcmlhYmxlcyBhbmQgY29kZSB0byBgbWV0aG9kYCwgYGdsb2JhbGAgc3R1ZmYgZXRjXG5cbmltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblx0Ly8gU2V0IHRvIGB0cnVlYCB0byBvdXRwdXQgZGVidWcgaW5mbyB3aGlsZSBhZGRpbmcgcnVsZXNcblx0c3RhdGljIERFQlVHID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cblx0XHQvLyBDbG9uZSBydWxlcywgc3RhcnRpbmcgd2l0aCBhIGNvbXBsZXRlbHkgZW1wdHkgbWFwIGlmIG5vdCBkZWZpbmVkIChubyBzdGFuZGFyZCBvYmplY3Qga2V5cylcblx0XHR0aGlzLnJ1bGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnJ1bGVzIHx8IG51bGwpO1xuXG5cdFx0Ly8gU2V0IHVwIHN0YW5kYXJkIHJ1bGUgY2xhc3NlcyBhcyBhbHRlcm5hdGVzXG5cdFx0dGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIG5ldyBSdWxlLkFsdGVybmF0aXZlcygpKTtcblx0XHR0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG5ldyBSdWxlLkFsdGVybmF0aXZlcygpKTtcblx0XHR0aGlzLmFkZFJ1bGUoXCJpbmZpeC1vcGVyYXRvclwiLCBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoKSk7XG5cdFx0dGhpcy5hZGRSdWxlKFwicG9zdGZpeC1vcGVyYXRvclwiLCBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoKSk7XG5cdH1cblxuXHRnZXRSdWxlKG5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlc1tuYW1lXTtcblx0fVxuXG4vLyMjIyBQYXJzaW5nXG5cblx0Ly8gUGFyc2UgYG5hbWVgZCBydWxlIGF0IGhlYWQgb2YgYHN0cmVhbWAuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cblx0cGFyc2UobmFtZSwgc3RyZWFtKSB7XG5cdFx0aWYgKHR5cGVvZiBzdHJlYW0gPT09IFwic3RyaW5nXCIpIHN0cmVhbSA9IG5ldyBUZXh0U3RyZWFtKHN0cmVhbSk7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUobmFtZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFJ1bGUgJHtuYW1lfSBub3QgdW5kZXJzdG9vZGAsIG5hbWUsIHN0cmVhbSk7XG5cdFx0c3RyZWFtID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJ1bGUucGFyc2UodGhpcywgc3RyZWFtKTtcblx0fVxuXG5cdC8vIEVhdCB3aGl0ZXNwYWNlIChhY2NvcmRpbmcgdG8gYHJ1bGVzLndoaXRlc3BhY2VgKSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnMgbmV3IHN0cmVhbSBpZiB3ZSBtYXRjaGVkIHdoaXRlc3BhY2UsIG90aGVyd2lzZSB0aGUgc2FtZSBzdHJlYW0uXG5cdC8vIE90aGVyd2lzZSByZXR1cm5zIHRoaXMgc2FtZSBzdHJlYW0uXG5cdGVhdFdoaXRlc3BhY2Uoc3RyZWFtKSB7XG5cdFx0dmFyIHJlc3VsdCA9IHRoaXMucnVsZXMud2hpdGVzcGFjZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHRcdHJldHVybiByZXN1bHQgPyByZXN1bHQubmV4dCgpIDogc3RyZWFtO1xuXHR9XG5cbi8vIyMjIFJ1bGUgZmFjdG9yaWVzXG5cblx0Ly8gQWRkIGEgcnVsZSB0byBvdXIgbGlzdCBvZiBydWxlcyFcblx0Ly8gVE9ETzogY29udmVydCB0byBgYWx0ZXJuYXRpdmVzYCBvbiBvdmVyd3JpdGU/XG5cdGFkZFJ1bGUobmFtZSwgcnVsZSkge1xuXHRcdGxldCBleGlzdGluZyA9IHRoaXMucnVsZXNbbmFtZV07XG5cdFx0aWYgKGV4aXN0aW5nKSB7XG5cdFx0XHRpZiAoIShleGlzdGluZyBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzKSkge1xuXHRcdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQ29udmVydGluZyBydWxlICcke25hbWV9JyB0byBhbHRlcm5hdGl2ZXNgKTtcblx0XHRcdFx0ZXhpc3RpbmcgPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBuYW1lOiBleGlzdGluZy5uYW1lLCBydWxlczogW2V4aXN0aW5nXSB9KTtcblx0XHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IGV4aXN0aW5nO1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JyB0byAnJHtuYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0ZXhpc3RpbmcuYWRkUnVsZShydWxlKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlLnJ1bGVOYW1lID0gbmFtZTtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBydWxlO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cdC8vIEFkZCByZWdleCBhcyBhIHBhdHRlcm4gdG8gb3VyIGxpc3Qgb2YgcnVsZXNcblx0YWRkUGF0dGVybihuYW1lLCBwYXR0ZXJuLCBwcm9wZXJ0aWVzKSB7XG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5QYXR0ZXJuKHByb3BlcnRpZXMpO1xuXHRcdHJ1bGUucGF0dGVybiA9IHBhdHRlcm47XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fVxuXG4vL1RPRE86IG1vdmUgdG8gYHJ1bGVTeW50YXguanNgXG5cblx0Ly8gUGFyc2UgYSBgcnVsZVN5bnRheGAgcnVsZSBhbmQgYWRkIGl0IHRvIG91ciBsaXN0IG9mIHJ1bGVzLlxuXHQvLyBSZXR1cm5zIHRoZSBuZXcgcnVsZS5cblx0Ly8gTG9ncyBwYXJzaW5nIGVycm9ycyBidXQgYWxsb3dzIHRoaW5ncyB0byBjb250aW51ZS5cblx0YWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3Rvcik7XG5cblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGlmIChjb25zb2xlLmdyb3VwKSB7XG5cdFx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdFx0Y29uc29sZS5sb2coYHN5bnRheDogJHtydWxlU3ludGF4fWApO1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdFx0XHRjb25zb2xlLmdyb3VwRW5kKCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCwgZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0YWRkU3RhdGVtZW50KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFJ1bGUuU3RhdGVtZW50KTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fVxuXG5cdGFkZEV4cHJlc3Npb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgUnVsZS5FeHByZXNzaW9uKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcnVsZSk7XG5cdH1cblxuXHRhZGRJbmZpeE9wZXJhdG9yKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudHJhbnNmb3JtZXIpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgaW5maXggb3BlcmF0b3IgcnVsZSAnJHtuYW1lfScgdG8gc3BlY2lmeSAndHJhbnNmb3JtZXInIGZ1bmN0aW9uYClcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJpbmZpeC1vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH1cblxuXHRhZGRQb3N0Zml4T3BlcmF0b3IobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50cmFuc2Zvcm1lcikge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBwb3N0Zml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RyYW5zZm9ybWVyJyBmdW5jdGlvbmApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcInBvc3RmaXgtb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9XG5cblxuLy9cbi8vICMjIFV0aWxpdHkgbWV0aG9kc1xuLy9cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmAuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHN0cmVhbSwgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBzdHJlYW1gXHRcdFN0cmVhbSB3aGljaCB3YXMgbWF0Y2hlZCB3aXRoIGBzdGFydEluZGV4YCBhdCB0aGUgc3RhcnQgb2YgdGhlIG1hdGNoXG4vL1x0XHRcdC0gYGVuZEluZGV4YFx0Tm9uLWluY2x1c2l2ZSBlbmQgaW5kZXggaW4gc3RyZWFtIHdoZXJlIG1hdGNoIGVuZHMuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5nYXRoZXJBcmd1bWVudHMoKWBcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZSgpYFx0XHRcdFx0UmV0dXJuIGphdmFzY3JpcHQgc291cmNlIHRvIGludGVycHJldCB0aGUgcnVsZS5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5cbi8vVE9ETzogbWFrZSBnYXRoZXJBcmd1bWVudHMoKSBzdGF0aWMgYW5kIGNhbGwgb24gdGhpc1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0dmFyIGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCBwcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuXG4vL1xuLy8gIyMgb3V0cHV0IGFzIHNvdXJjZVxuLy9cblx0Z2V0IF9hcmcoKSB7IHJldHVybiB0aGlzLmFyZ3VtZW50IHx8IHRoaXMucnVsZU5hbWUgfHwgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lIH1cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBOb3RlIHRoYXQgd2UgZGVmaW5lIGBnYXRoZXJBcmd1bWVudHMoKWAgc3RhdGljYWxseSBvbiBlYWNoIHN1YmNsYXNzXG5cdC8vXHRhbmQgdGhlbiBpbnN0YW5jZSBtZXRob2QgY2FsbHMgaXQgb24gaXRzZWxmLlxuXHRzdGF0aWMgZ2F0aGVyQXJndW1lbnRzKHJ1bGUpIHtcblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IuZ2F0aGVyQXJndW1lbnRzKHRoaXMpO1xuXHR9XG5cblx0Ly8gT3V0cHV0IHZhbHVlIGZvciB0aGlzIElOU1RBTlRJQVRFRCBydWxlIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG5cblxuXG4vLyBSdWxlIGZvciBsaXRlcmFsIHN0cmluZyB2YWx1ZSwgd2hpY2ggaW5jbHVkZSBwdW5jdHVhdGlvbiBzdWNoIGFzIGAoYCBldGMuXG4vL1RPRE86IHJlbmFtZSBgU3ltYm9sYD8/P1xuUnVsZS5TdHJpbmcgPSBjbGFzcyBTdHJpbmcgZXh0ZW5kcyBSdWxlIHtcblx0Ly8gUGFyc2UgdGhpcyBydWxlIGF0IHRoZSBiZWdpbm5pbmcgb2YgYHN0cmVhbWAsIGFzc3VtaW5nIG5vIHdoaXRlc3BhY2UgYmVmb3JlLlxuXHQvLyBEZWZhdWx0IGlzIHRoYXQgYHJ1bGUuc3RyaW5nYCBpcyBsaXRlcmFsIHN0cmluZyB0byBtYXRjaC5cblx0Ly8gT24gbWF0Y2gsIHJldHVybnMgY2xvbmUgb2YgcnVsZSB3aXRoIGB2YWx1ZWAsIGBzdHJlYW1gIGFuZCBgZW5kSW5kZXhgLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICghc3RyZWFtLnN0YXJ0c1dpdGgodGhpcy5zdHJpbmcpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRoaXMuc3RyaW5nLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgdGhpcy5zdHJpbmcubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cbi8vIFJlZ2V4IHBhdHRlcm4uXG4vLyBgcnVsZS5wYXR0ZXJuYCBpcyB0aGUgcmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoLlxuLy8gTk9URTogdGhlIHJlZ2V4IHNob3VsZCBzdGFydCB3aXRoIGAvXi4uLmAgdG8gbWF0Y2ggYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHZhciBtYXRjaCA9IHN0cmVhbS5tYXRjaCh0aGlzLnBhdHRlcm4pO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogbWF0Y2hbMF0sXG5cdFx0XHRlbmRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXggKyBtYXRjaFswXS5sZW5ndGgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm47XG5cdH1cbn1cblxuXG4vLyBLZXl3b3JkIHBhdHRlcm5cbi8vXHRgcnVsZS5rZXl3b3JkYCBpcyB0aGUga2V5d29yZCBzdHJpbmcgdG8gbWF0Y2guXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHRcdC8vIGNyZWF0ZSBwYXR0ZXJuIHdoaWNoIG1hdGNoZXMgYXQgd29yZCBib3VuZGFyeVxuXHRcdGlmICghdGhpcy5wYXR0ZXJuKSB7XG5cdFx0XHRpZiAoIXRoaXMua2V5d29yZCkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIGtleXdvcmQgcHJvcGVydHlcIik7XG5cdFx0XHR0aGlzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKGBeJHt0aGlzLmtleXdvcmR9XFxcXGJgKTtcblx0XHR9XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5rZXl3b3JkfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHZhciBydWxlID0gcGFyc2VyLmdldFJ1bGUodGhpcy5ydWxlKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQXR0ZW1wdGluZyB0byBwYXJzZSB1bmtub3duIHJ1bGUgJyR7dGhpcy5uYW1lfSdgLCB0aGlzKTtcblx0XHR2YXIgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgcmVzdWx0LmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHt9XG5cblxuLy8gU2VxdWVuY2Ugb2YgcnVsZXMgdG8gbWF0Y2ggKGF1dG8tZXhjbHVkaW5nIHdoaXRlc3BhY2UpLlxuUnVsZS5TZXF1ZW5jZSA9IGNsYXNzIFNlcXVlbmNlIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFyZXN1bHQgJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vVE9ET0Ncblx0Ly8gR2F0aGVyIGFyZ3VtZW50cyBmcm9tIG91ciBwYXJzZWQgYHJlc3VsdHNgIGFycmF5LlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYHZhbHVlc2AgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGByZXN1bHRzLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYHJlc3VsdHMucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gcnVsZSB0eXBlOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdHN0YXRpYyBnYXRoZXJBcmd1bWVudHMoc2VxdWVuY2UpIHtcblx0XHRpZiAoIXNlcXVlbmNlLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IGFyZ3MgPSB7fTtcblx0XHRmb3IgKGxldCBuZXh0IG9mIHNlcXVlbmNlLnJlc3VsdHMpIHtcblx0XHRcdGxldCBhcmdOYW1lID0gbmV4dC5fYXJnO1xuXHRcdFx0Ly8gRm9yIG5lc3RlZCBydWxlcywgcmVjdXJzZSB0byBnZXQgdGhlaXIgYXJndW1lbnRzXG5cdFx0XHRsZXQgcmVzdWx0ID0gbmV4dC5nYXRoZXJBcmd1bWVudHMoKTtcblxuXHRcdFx0Ly8gSWYgYXJnIGFscmVhZHkgZXhpc3RzLCBjb252ZXJ0IHRvIGFuIGFycmF5XG5cdFx0XHRpZiAoYXJnTmFtZSBpbiBhcmdzKSB7XG5cdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShhcmdzW2FyZ05hbWVdKSkgYXJnc1thcmdOYW1lXSA9IFthcmdzW2FyZ05hbWVdXTtcblx0XHRcdFx0YXJnc1thcmdOYW1lXS5wdXNoKHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0YXJnc1thcmdOYW1lXSA9IHJlc3VsdDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGFyZ3M7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlcy5qb2luKFwiIFwiKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG5cbn1cblxuLy8gU3ludGFjdGljIHN1Z2FyIGZvciBkZWJ1Z2dpbmdcblJ1bGUuRXhwcmVzc2lvbiA9IGNsYXNzIGV4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXguXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBGaW5kIHRoZSBMT05HRVNUIG1hdGNoXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IGJlc3RNYXRjaDtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKCFtYXRjaCkgY29udGludWU7XG5cblx0XHRcdC8vIHRha2UgdGhlIGxvbmdlc3QgbWF0Y2hcblx0XHRcdGlmICghYmVzdE1hdGNoIHx8IG1hdGNoLmVuZEluZGV4ID4gYmVzdE1hdGNoLmVuZEluZGV4KVxuXHRcdFx0XHRiZXN0TWF0Y2ggPSBtYXRjaDtcblx0XHR9XG5cdFx0aWYgKCFiZXN0TWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiBiZXN0TWF0Y2gsXG5cdFx0XHRlbmRJbmRleDogYmVzdE1hdGNoLmVuZEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZSgpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAoJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGVzLmpvaW4oXCJ8XCIpfSkke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuLy8gUmVwZWF0aW5nIHJ1bGUuXG4vL1x0YHRoaXMucnVsZWAgaXMgdGhlIHJ1bGUgdGhhdCByZXBlYXRzLlxuLy9cbi8vIEFmdGVyIG1hdGNoaW5nOlxuLy9cdGB0aGlzLnJlc3VsdHNgIGlzIGFycmF5IG9mIHJlc3VsdHMgb2YgbWF0Y2hlcy5cbi8vXG4vL1x0QXV0b21hdGljYWxseSBjb25zdW1lcyB3aGl0ZXNwYWNlIGJlZm9yZSBydWxlcy5cbi8vXHRJZiBkb2Vzbid0IG1hdGNoIGF0IGxlYXN0IG9uZSwgcmV0dXJucyBgdW5kZWZpbmVkYC5cblJ1bGUuUmVwZWF0ID0gY2xhc3MgUmVwZWF0IGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBuZXh0ID0gc3RyZWFtO1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghcmVzdWx0KSBicmVhaztcblxuXHRcdFx0cmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0c3RhdGljIGdhdGhlckFyZ3VtZW50cyhyZXBlYXQpIHtcblx0XHRpZiAoIXJlcGVhdC5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiByZXBlYXQucmVzdWx0cy5tYXAoIHJlc3VsdCA9PiByZXN1bHQuZ2F0aGVyQXJndW1lbnRzKCkgKTtcblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdHRocm93IFwiRG9uJ3QgdW5kZXJzdGFuZCBob3cgdG8gc291cmNlIFJ1bGUuUmVwZWF0IVwiO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0Y29uc3QgcnVsZSA9ICh0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlID8gYCgke3RoaXMucnVsZX0pYCA6IGAke3RoaXMucnVsZX1gKTtcblx0XHRyZXR1cm4gYCR7cnVsZX0ke3RoaXMub3B0aW9uYWwgPyAnKicgOiAnKyd9YDtcblx0fVxufVxuXG5cbi8vIExpc3QgbWF0Y2ggcnVsZTogICBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAuIGVnXCIgYFt7bnVtYmVyfSxdYCB0byBtYXRjaCBgMSwyLDNgXG4vL1x0YHJ1bGUuaXRlbWAgaXMgdGhlIHJ1bGUgZm9yIGVhY2ggaXRlbSxcbi8vXHRgcnVsZS5kZWxpbWl0ZXJgIGlzIHRoZSBkZWxpbWl0ZXIgYmV0d2VlbiBlYWNoIGl0ZW0uXG4vLyBcdGBydWxlLnJlc3VsdHNgIGluIHRoZSBvdXRwdXQgaXMgdGhlIGxpc3Qgb2YgdmFsdWVzLlxuLy9cbi8vXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhIExpc3QgcnVsZSB3aWxsIE5PVCByZXBlYXQgKD8/Pz8pXG5SdWxlLkxpc3QgPSBjbGFzcyBMaXN0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0dmFyIHJlc3VsdHMgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdHJlc3VsdHMucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFkZWxpbWl0ZXIpIGJyZWFrO1xuXHRcdFx0bmV4dCA9IGRlbGltaXRlci5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybiBtYXRjaGVkIGl0ZW0gYnkgaW5kZXhcblx0Z2V0SXRlbShpbmRleCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLnJlc3VsdHNbaW5kZXhdO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XHRcdC8vIFRPRE86IHRocm93Pz8/XG5cdFx0bGV0IHJlc3VsdHMgPSB0aGlzLnJlc3VsdHMubWFwKCByZXN1bHQgPT4gcmVzdWx0LnRvU291cmNlKCkgKS5qb2luKFwiLCBcIik7XG5cdFx0cmV0dXJuIGBbJHtyZXN1bHRzfV1gO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiXG4vLyBUT0RPOiBjb252ZXJ0IHRvIGxpbmUtYXdhcmUgc3RyZWFtPz8/XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXh0U3RyZWFtIHtcblx0Ly8gWW91IGNhbiBjb25zdHJ1Y3Qgd2l0aCBhIHRleHQgc3RyaW5nIG9yIGEgc2V0IG9mIHByb3BlcnRpZXMgKGluY2x1ZGluZyBgdGV4dGApLlxuXHRjb25zdHJ1Y3Rvcih0ZXh0T3JQcm9wcykge1xuXHRcdGlmICh0eXBlb2YgdGV4dE9yUHJvcHMgPT09IFwic3RyaW5nXCIpXG5cdFx0XHR0aGlzLnRleHQgPSB0ZXh0T3JQcm9wcztcblx0XHRlbHNlXG5cdFx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHRleHRPclByb3BzKTtcblxuXHRcdC8vIE1ha2Ugc3VyZSBgdGV4dGAgaXMgZGVmaW5lZC5cblx0XHRpZiAoIShcInRleHRcIiBpbiB0aGlzKSkgdGhpcy50ZXh0ID0gXCJcIjtcblx0XHRpZiAoIShcInN0YXJ0SW5kZXhcIiBpbiB0aGlzKSkgdGhpcy5zdGFydEluZGV4ID0gMDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBpbW11dGFibGUgY2xvbmUgb2YgdGhlIHN0cmVhbS5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRsZXQgY2xvbmUgPSBuZXcgVGV4dFN0cmVhbSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCBwcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jZWQgdG8gbmV3IHN0YXJ0SW5kZXguXG5cdGFkdmFuY2VUbyhzdGFydEluZGV4KSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4IH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jaW5nIHN0YXJ0SW5kZXggQlkgYGxlbmd0aGBcblx0YWR2YW5jZUJ5KGxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuXHR9XG5cbi8vIFx0Ly8gUmV0dXJuIGNsb25lIG9mIHRoaXMgc3RyZWFtIHdpdGggZW5kSW5kZXggc2V0IHRvIHN0YXJ0ICsgYGxlbmd0aGBcbi8vIFx0ZW5kQWZ0ZXIobGVuZ3RoKSB7XG4vLyBcdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBlbmRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuLy8gXHR9XG5cblx0Ly8gTWF0Y2ggYHBhdHRlcm5gIGFzIHJlZ2V4IGF0IGhlYWQgb2Ygc3RyZWFtLlxuXHQvLyBOT1RFOiByZWdleGVzIHNob3VsZCBzdGFydCB3aXRoIGBeYCFcblx0Ly8gUmV0dXJucyBtYXRjaCBvciB1bmRlZmluZWQuXG5cdG1hdGNoKHBhdHRlcm4pIHtcblx0XHRpZiAoIShwYXR0ZXJuIGluc3RhbmNlb2YgUmVnRXhwKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGV4dFN0cmVhbS5tYXRjaCgke3BhdHRlcm59KTogZXhwZWN0ZWQgUmVnRXhwYCk7XG4vL1RPRE86IHVzZSBgc3RyZWFtLnJhbmdlYCB0byBlbnN1cmUgbWF0Y2ggaXMgbm90IG5vdCBiZXlvbmQgYHN0cmluZy5lbmRJbmRleGBcblx0XHRyZXR1cm4gdGhpcy5oZWFkLm1hdGNoKHBhdHRlcm4pO1xuXHR9XG5cblx0c3RhcnRzV2l0aChzdHJpbmcpIHtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQuc3RhcnRzV2l0aChzdHJpbmcpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIHRleHQgb2Ygc3RyaW5nIHN0YXJ0aW5nIGF0IG91ciBgc3RhcnRJbmRleGBcblx0Z2V0IGhlYWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMucmFuZ2UoKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIHJhbmdlIG9mIHRoZSBzdHJpbmcgZnJvbSBgc3RhcnRJbmRleGAgdG8gYGVuZEluZGV4YCBOT04taW5jbHVzaXZlLlxuXHRyYW5nZShzdGFydEluZGV4ID0gdGhpcy5zdGFydEluZGV4LCBlbmRJbmRleCA9IHRoaXMudGV4dC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0LnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmRJbmRleCk7XG5cdH1cblxuXHQvLyBMZW5ndGggb2YgdGhlIHN0cmVhbS5cblx0Z2V0IGxlbmd0aCgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0Lmxlbmd0aDtcblx0fVxuXG5cdC8vIEFyZSB3ZSBhdCB0aGUgZW5kIG9mIHRoZSBzdHJlYW0/XG5cdGdldCBpc0VtcHR5KCkge1xuXHRcdHJldHVybiB0aGlzLnN0YXJ0SW5kZXggPT09IHRoaXMubGVuZ3RoO1xuXHR9XG5cblxuXG5cblx0Ly9cblx0Ly8jIyBSZWZsZWN0aW9uXG5cdC8vXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHRcblx0fTtcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9UZXh0U3RyZWFtLmpzIiwiLy9cbi8vXHQjIENvcmUgYHJ1bGVzYCAtLSBzaW1wbGUgZGF0YXR5cGVzLCBldGMuXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vL1xuLy8gUmVnZXggcGF0dGVybiBydWxlcyB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvcnMgZm9yIGRlYnVnZ2luZ1xuLy9cbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJ3aGl0ZXNwYWNlXCIsIC9eXFxzKy8pO1xuUnVsZS5XaGl0ZXNwYWNlID0gY2xhc3Mgd2hpdGVzcGFjZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fVxucGFyc2VyLmFkZFJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIG5ldyBSdWxlLldoaXRlc3BhY2UoeyBwYXR0ZXJuOiAvXlxccysvLCBvcHRpb25hbDogdHJ1ZSB9KSk7XG5cbi8vIGBUeXBlYCA9IHR5cGUgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhbiB1cHBlci1jYXNlIGxldHRlciAoPylcbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJ0eXBlbmFtZVwiLCAvXltBLVpdW1xcd1xcZFxcLV9dKi8pO1xuUnVsZS5UeXBlID0gY2xhc3MgVHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoXCJUeXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvXltBLVpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHR5cGUpO1xuXG5cbi8vIGBudW1iZXJgIGFzIGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG5SdWxlLk51bWJlciA9IGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBudW1iZXIgPSBwYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgUnVsZS5OdW1iZXIoe1xuXHRwYXR0ZXJuOiAvXi0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VGbG9hdCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG51bWJlcik7XG5cblxuLy8gTnVtZXJpYyBgaW50ZWdlcmAgb25seSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gTk9URTogdGhpcyBXSUxMIG1hdGNoIGEgZmxvYXQsIGJ1dCB0aGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBjb2VyY2UgdG8gYW4gaW50ZWdlci5cbi8vIFJFVklFVzogaXMgdGhpcyByaWdodD8gIEJldHRlciB0byBub3QgbWF0Y2ggYSBmbG9hdD9cblJ1bGUuSW50ZWdlciA9IGNsYXNzIGludGVnZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImludGVnZXJcIiwgbmV3IFJ1bGUuSW50ZWdlcih7XG5cdHBhdHRlcm46IC9eLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0ZXh0ID0gcGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyBSdWxlLlRleHQoe1xuXHRwYXR0ZXJuOiAvXig/OlwiW15cIl0qXCJ8J1teJ10qJykvXG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdGV4dCk7XG5cblxuLy8gQm9vbGVhbiBsaXRlcmFsLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBUT0RPOiBiZXR0ZXIgbmFtZSBmb3IgdGhpcz8/P1xuUnVsZS5Cb29sZWFuID0gY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBib29sID0gcGFyc2VyLmFkZFJ1bGUoXCJib29sZWFuXCIsIG5ldyBSdWxlLkJvb2xlYW4oe1xuXHRwYXR0ZXJuOiAvXih0cnVlfGZhbHNlfHllc3xub3xzdWNjZXNzfGZhaWx1cmV8b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwic3VjY2Vzc1wiOlxuXHRcdFx0Y2FzZSBcIm9rXCI6XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGJvb2wpO1xuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuLy9wYXJzZXIuYWRkUGF0dGVybihcImlkZW50aWZpZXJcIiwgL15bYS16XVtcXHdcXGRcXC1fXSovKTtcbi8vVE9ETzogZG9uJ3QgYWNjZXB0IGNlcnRhaW4ga2V5d29yZHM/Pz9cblJ1bGUuSWRlbnRpZmllciA9IGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgaWRlbnRpZmllciA9IHBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgUnVsZS5JZGVudGlmaWVyKHtcblx0cGF0dGVybjogL15bYS16XVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBpZGVudGlmaWVyKTtcblxuLy8gTGl0ZXJhbCB2YWx1ZSBhcyBudW1iZXIsIHRleHQgb3IgYm9vbGVhbi5cbi8vVE9ETzogdGhpcyBpcyBhbiBleHByZXNzaW9uLi4uID9cbnBhcnNlci5hZGRTeW50YXgoXCJsaXRlcmFsXCIsIFwiKGxpdGVyYWw6e251bWJlcn18e3RleHR9fHtib29sZWFufSlcIik7XG5cblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxubGV0IGxpc3QgPSBwYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsLWxpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdHtcblx0XHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzWzFdO1xuXHRcdH0sXG5cdFx0Ly8gcmV0dXJuIGp1c3QgdGhlIGxpc3QgYXMgb3VyIHNvdXJjZVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcbiBcdFx0XHRyZXR1cm4gdGhpcy5nYXRoZXJBcmd1bWVudHMoKS50b1NvdXJjZSgpO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJpbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gbG9hZCBzdGFuZGFyZCBydWxlcyBmaWxlcyBoZXJlXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbnVtYmVyc1wiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vYXNzaWdubWVudFwiO1xuaW1wb3J0IFwiLi9jbGFzc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBUT0RPOiB7cHJvcGVydHktZXhwcmVzc2lvbn0gYWxzbyB3b3Jrcy4uLlxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJ7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cIiwge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0bGV0IHZhbHVlID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0Ly8gVE9ETzogZGVjbGFyZSBpZGVudGlmaWVyIGlmIG5vdCBpbiBzY29wZSwgZXRjXG5cdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9ID0gJHt2YWx1ZX1gO1xuXHR9XG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9hc3NpZ25tZW50LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vL3BhcnNlci5hZGRFeHByZXNzaW9uKFwicHJvcGVydHktb2ZcIiwgXCJ7cHJvcGVydHk6cHJvcGVydHktbmFtZX0rIHtleHByZXNzaW9ufVwiLCB7XG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcInByb3BlcnR5LW9mXCIsIFwiKHByb3BlcnRpZXM6dGhlIHtpZGVudGlmaWVyfSBvZikrIHtleHByZXNzaW9ufVwiLCB7XG4gXHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0bGV0IGFyZ3MgPSBSdWxlLkV4cHJlc3Npb24uZ2F0aGVyQXJndW1lbnRzKHRoaXMpO1xuXHRcdC8vIHRyYW5zZm9ybSBwcm9wZXJ0aWVzIGFuZCByZXZlcnNlIG9yZGVyXG5cdFx0YXJncy5wcm9wZXJ0aWVzID0gYXJncy5wcm9wZXJ0aWVzLm1hcCggc2VxdWVuY2UgPT4gc2VxdWVuY2UuaWRlbnRpZmllciApLnJldmVyc2UoKTtcblx0XHRyZXR1cm4gYXJncztcbiBcdH0sXG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgdGhpbmcgPSBhcmdzLmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRsZXQgcHJvcGVydGllcyA9IGFyZ3MucHJvcGVydGllcy5tYXAoIGlkZW50aWZpZXIgPT4gaWRlbnRpZmllci50b1NvdXJjZSgpICkuam9pbihcIi5cIik7XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXQoJHt0aGluZ30sICcke3Byb3BlcnRpZXN9JylgO1xuXHR9XG59KTtcblxuXG5cbnBhcnNlci5hZGRTeW50YXgoXCJzY29wZS1tb2RpZmllclwiLCBcIihzY29wZTpnbG9iYWx8Y29uc3RhbnR8c2hhcmVkKVwiKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlLXByb3BlcnR5XCIsXG5cdFwie3Njb3BlLW1vZGlmaWVyfT8ge2Fzc2lnbm1lbnR9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuYXNzaWdubWVudC5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgdmFsdWUgPSBhcmdzLmFzc2lnbm1lbnQuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGFzc2lnbm1lbnQgPSBgJHtpZGVudGlmaWVyfSA9ICR7dmFsdWV9YDtcblxuXHRcdFx0dmFyIHNjb3BlID0gYXJncy5zY29wZSA/IGFyZ3Muc2NvcGUudG9Tb3VyY2UoKSA6IFwibG9jYWxcIjtcblx0XHRcdHN3aXRjaCAoc2NvcGUpIHtcblx0XHRcdFx0Y2FzZSBcImdsb2JhbFwiOlxuXHRcdFx0XHRcdHJldHVybiBgZ2xvYmFsLiR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZFwiOlxuXHRcdFx0XHRcdHJldHVybiBgc3RhdGljICR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0cmV0dXJuIGFzc2lnbm1lbnQ7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZS1wcm9wZXJ0eS1hcy1vbmUtb2ZcIixcblx0XCJ7aWRlbnRpZmllcn0gYXMgb25lIG9mIHtsaXN0OmxpdGVyYWwtbGlzdH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgcGx1cmFsID0gKGlkZW50aWZpZXIgKyBcIl9WQUxVRVNcIikudG9VcHBlckNhc2UoKTtcblx0XHRcdGxldCBsaXN0ID0gYXJncy5saXN0Lmxpc3Q7XG5cdFx0XHRsZXQgdmFsdWVzID0gbGlzdC50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGZpcnN0ID0gbGlzdC5yZXN1bHRzWzBdO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKCkgOiBcInVuZGVmaW5lZFwiO1xuXG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke3BsdXJhbH0gPSAke3ZhbHVlc307XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0geyByZXR1cm4gKFwiX18ke2lkZW50aWZpZXJ9XCIgaW4gdGhpcyA/IHRoaXMuX18ke2lkZW50aWZpZXJ9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfVxcbmA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY2xhc3MuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBudW1iZXJzXG4vL1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vIE51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmcuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4LWV4cHJlc3Npb25cIiwgXCJpdGVtIHtudW1iZXI6aW50ZWdlcn0gb2Yge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoKSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBudW1iZXIgPSBhcmdzLm51bWJlci50b1NvdXJjZSgpO1xuXHRcdGxldCBleHByZXNzaW9uID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7bnVtYmVyfSlgO1xuXHR9XG59KTtcblxuLy8gRW5nbGlzaCB3b3JkcyB1c2VkIGZvciBwb3NpdGlvbiBvZiBzb21ldGhpbmcgaW4gYSBsaXN0LlxuLy8gVE9ETzogYHNldmVudHktc2V2ZW50aGAsIGB0aGlyZC10by1sYXN0YC4uLlxucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCIoZmlyc3R8c2Vjb25kfHRoaXJkfGZvdXJ0aHxmaWZ0aHxzaXh0aHxzZXZlbnRofGVpZ2h0aHxuaW50aHx0ZW50aHxwZW51bHRpbWF0ZXxsYXN0fGZpbmFsKVwiLCB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgb3JkaW5hbCA9IHRoaXMubWF0Y2hlZC50b1NvdXJjZSgpO1xuXHRcdHN3aXRjaCAob3JkaW5hbCkge1xuXHRcdFx0Y2FzZSBcImZpcnN0XCI6XHRcdHJldHVybiAxO1xuXHRcdFx0Y2FzZSBcInNlY29uZFwiOlx0XHRyZXR1cm4gMjtcblx0XHRcdGNhc2UgXCJ0aGlyZFwiOlx0XHRyZXR1cm4gMztcblx0XHRcdGNhc2UgXCJmb3VydGhcIjpcdFx0cmV0dXJuIDQ7XG5cdFx0XHRjYXNlIFwiZmlmdGhcIjpcdFx0cmV0dXJuIDU7XG5cdFx0XHRjYXNlIFwic2l4dGhcIjpcdFx0cmV0dXJuIDY7XG5cdFx0XHRjYXNlIFwic2V2ZW50aFwiOlx0XHRyZXR1cm4gNztcblx0XHRcdGNhc2UgXCJlaWdodGhcIjpcdFx0cmV0dXJuIDg7XG5cdFx0XHRjYXNlIFwibmludGhcIjpcdFx0cmV0dXJuIDk7XG5cdFx0XHRjYXNlIFwidGVudGhcIjpcdFx0cmV0dXJuIDEwO1xuXHRcdFx0Y2FzZSBcInBlbnVsdGltYXRlXCI6XHRyZXR1cm4gLTI7XG5cdFx0XHRjYXNlIFwibGFzdFwiOlx0XHRyZXR1cm4gLTE7XG5cdFx0XHRjYXNlIFwiZmluYWxcIjpcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0fVxufSk7XG5cbi8vIEFsdGVybmF0aXZlIGZvcm0gZm9yIG51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmcuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4LWV4cHJlc3Npb25cIiwgXCJ0aGUge29yZGluYWx9IGl0ZW0gb2Yge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoKSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBvcmRpbmFsID0gYXJncy5vcmRpbmFsLnRvU291cmNlKCk7XG5cdFx0bGV0IGV4cHJlc3Npb24gPSBhcmdzLmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtvcmRpbmFsfSlgO1xuXHR9XG59KTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL251bWJlcnMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGluZml4IGFuZCBwcmVmaXggb3BlcmF0b3JzLlxuLy9cblxuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8jIyBJbmZpeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj4ge3Joc31gLCBlZzogYGEgaXMgMWBcbi8vIE5PVEU6IGBvcGVyYXRvci50cmFuc2Zvcm1lcmAgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHR3byBhcmd1bWVudHMgKGBsaHNgIGFuZCBgcmhzYCkgaW50byBvdXRwdXQuXG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNcIiwgXCJpc1wiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ID09ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdFwiLCBcImlzIG5vdFwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXMtZXhhY3RseVwiLCBcImlzIGV4YWN0bHlcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSA9PT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXMtbm90LWV4YWN0bHlcIiwgXCJpcyBub3QgZXhhY3RseVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ICE9PSAke2J9KWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5pc09mVHlwZSh0aGluZywgdHlwZSlgXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLXR5cGUtb2ZcIiwgXCJpcyAoYXxhbilcIiwgeyB0cmFuc2Zvcm1lcih0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdC10eXBlLW9mXCIsIFwiaXMgbm90IChhfGFuKVwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzSW4odGhpbmcsIGNvbGxlY3Rpb24pYFxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1pblwiLCBcImlzIGluXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcsIGxpc3R5KSB7IHJldHVybiBgc3BlbGwuaXNJbigke3RoaW5nfSwgJHtsaXN0eX0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW9uZS1vZlwiLCBcImlzIG9uZSBvZlwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCBsaXN0eSkgeyByZXR1cm4gYHNwZWxsLmlzSW4oJHt0aGluZ30sICR7bGlzdHl9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1ub3QtaW5cIiwgXCJpcyBub3QgaW5cIiwgeyB0cmFuc2Zvcm1lcih0aGluZywgbGlzdHkpIHsgcmV0dXJuIGAhc3BlbGwuaXNJbigke3RoaW5nfSwgJHtsaXN0eX0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdC1vbmUtb2ZcIiwgXCJpcyBub3Qgb25lIG9mXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcsIGxpc3R5KSB7IHJldHVybiBgIXNwZWxsLmlzSW4oJHt0aGluZ30sICR7bGlzdHl9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0XCIsIFwiKD58aXMgZ3JlYXRlciB0aGFuKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndGVcIiwgXCIoPj18aXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibHRcIiwgXCIoPHxpcyBsZXNzIHRoYW4pXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0ZVwiLCBcIig8PXxpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8pXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkU3ludGF4KFxuXHRcImluZml4LW9wZXJhdG9yLWV4cHJlc3Npb25cIixcblx0XCJ7bGhzOmV4cHJlc3Npb259IHtvcGVyYXRvcjppbmZpeC1vcGVyYXRvcn0ge3JoczpleHByZXNzaW9ufVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGxocyA9IGFyZ3MubGhzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHJocyA9IGFyZ3MucmhzLnRvU291cmNlKGNvbnRleHQpO1xuXG5cdFx0XHRsZXQgdHJhbnNmb3JtZXIgPSBhcmdzLm9wZXJhdG9yLm1hdGNoZWQudHJhbnNmb3JtZXI7XG5cdFx0XHRyZXR1cm4gdHJhbnNmb3JtZXIobGhzLCByaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8jIyBQb3N0aWZ4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPmAsIGUuZy4gYGEgaXMgZGVmaW5lZGBcbi8vIE5PVEU6IGBvcGVyYXRvci50cmFuc2Zvcm1lcmAgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBvdXRwdXQuXG5cbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpcy1kZWZpbmVkXCIsIFwiaXMgZGVmaW5lZFwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSAhPT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtbm90LWRlZmluZWRcIiwgXCJpcyBub3QgZGVmaW5lZFwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtdW5kZWZpbmVkXCIsIFwiaXMgdW5kZWZpbmVkXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtZW1wdHlcIiwgXCJpcyBlbXB0eVwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpcy1ub3QtZW1wdHlcIiwgXCJpcyBub3QgZW1wdHlcIiwgeyB0cmFuc2Zvcm1lcih0aGluZykgeyByZXR1cm4gYCFzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfX0pO1xuXG5cbnBhcnNlci5hZGRTeW50YXgoXG5cdFwicG9zdGZpeC1vcGVyYXRvci1leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeC1vcGVyYXRvcn1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBsaHMgPSBhcmdzLmxocy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCB0cmFuc2Zvcm1lciA9IGFyZ3Mub3BlcmF0b3IubWF0Y2hlZC50cmFuc2Zvcm1lcjtcblx0XHRcdHJldHVybiB0cmFuc2Zvcm1lcihsaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG5wYXJzZXIuYWRkU3ludGF4KFwib3BlcmF0b3ItZXhwcmVzc2lvblwiLCBcIihleHByZXNzaW9uOntwb3N0Zml4LW9wZXJhdG9yLWV4cHJlc3Npb259fHtpbmZpeC1vcGVyYXRvci1leHByZXNzaW9ufSlcIik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIl0sInNvdXJjZVJvb3QiOiIifQ==