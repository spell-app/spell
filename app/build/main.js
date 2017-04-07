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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgNjljNmM0ZjYyOTMzOTRjN2IxNTUiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGVTeW50YXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2Fzc2lnbm1lbnQuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NsYXNzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbIk9iamVjdCIsImFzc2lnbiIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJTZXF1ZW5jZSIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInJ1bGVzIiwicGFyc2VSdWxlU3ludGF4X3Rva2VucyIsInJ1bGUiLCJsZW5ndGgiLCJTWU5UQVhfRVhQUkVTU0lPTiIsIm1hdGNoIiwiU3ludGF4RXJyb3IiLCJzdGFydEluZGV4IiwibGFzdEluZGV4IiwicGFyc2VSdWxlU3ludGF4X3Rva2VuIiwiZW5kSW5kZXgiLCJsYXN0IiwiU3RyaW5nIiwic3RyaW5nIiwicHVzaCIsInN5bnRheFRva2VuIiwicGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUiLCJwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMiLCJwYXJzZVJ1bGVTeW50YXhfbGlzdCIsInBhcnNlUnVsZVN5bnRheF9yZXBlYXQiLCJwYXJzZVJ1bGVTeW50YXhfc3RyaW5nIiwiS2V5d29yZCIsImtleXdvcmQiLCJzdGFydHNXaXRoIiwic3Vic3RyIiwidG9TdHJpbmciLCJmaW5kTmVzdGVkVG9rZW5zIiwic2xpY2UiLCJhcmd1bWVudCIsImFsdGVybmF0ZXMiLCJncm91cEFsdGVybmF0ZXMiLCJtYXAiLCJncm91cCIsInJlc3VsdHMiLCJBbHRlcm5hdGl2ZXMiLCJ0b2tlbnMiLCJjdXJyZW50IiwiaSIsInRva2VuIiwiY29uY2F0Iiwic3ltYm9sIiwiUmVwZWF0Iiwib3B0aW9uYWwiLCJ1bmRlZmluZWQiLCJqb2luIiwiU3VicnVsZSIsIkxpc3QiLCJpdGVtIiwiZGVsaW1pdGVyIiwicGFyc2VyIiwid2luZG93IiwiUGFyc2VyIiwicHJvcGVydGllcyIsImNyZWF0ZSIsImFkZFJ1bGUiLCJuYW1lIiwic3RyZWFtIiwiZ2V0UnVsZSIsImVhdFdoaXRlc3BhY2UiLCJwYXJzZSIsInJlc3VsdCIsIndoaXRlc3BhY2UiLCJuZXh0IiwiZXhpc3RpbmciLCJkZWJ1ZyIsImNvbnNvbGUiLCJsb2ciLCJydWxlTmFtZSIsInBhdHRlcm4iLCJQYXR0ZXJuIiwicnVsZVN5bnRheCIsImUiLCJlcnJvciIsImdyb3VwRW5kIiwid2FybiIsImFkZFN5bnRheCIsIlN0YXRlbWVudCIsIkV4cHJlc3Npb24iLCJ0cmFuc2Zvcm1lciIsIlR5cGVFcnJvciIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsIm5lc3RpbmciLCJuZXN0ZWQiLCJERUJVRyIsIlJ1bGUiLCJwcm9wcyIsImNsb25lIiwiYWR2YW5jZVRvIiwiY29uc3RydWN0b3IiLCJnYXRoZXJBcmd1bWVudHMiLCJtYXRjaGVkIiwiUmVnRXhwIiwiTmVzdGVkIiwic2VxdWVuY2UiLCJhcmdzIiwiYXJnTmFtZSIsIl9hcmciLCJBcnJheSIsImlzQXJyYXkiLCJiZXN0TWF0Y2giLCJjb250ZXh0IiwidG9Tb3VyY2UiLCJyZXBlYXQiLCJpbmRleCIsIlRleHRTdHJlYW0iLCJ0ZXh0T3JQcm9wcyIsInRleHQiLCJoZWFkIiwic3Vic3RyaW5nIiwicmFuZ2UiLCJXaGl0ZXNwYWNlIiwiVHlwZSIsInR5cGUiLCJyZXBsYWNlIiwiTnVtYmVyIiwibnVtYmVyIiwicGFyc2VGbG9hdCIsIkludGVnZXIiLCJwYXJzZUludCIsIlRleHQiLCJCb29sZWFuIiwiYm9vbCIsIklkZW50aWZpZXIiLCJpZGVudGlmaWVyIiwibGlzdCIsImFkZEV4cHJlc3Npb24iLCJhZGRTdGF0ZW1lbnQiLCJ2YWx1ZSIsImV4cHJlc3Npb24iLCJyZXZlcnNlIiwidGhpbmciLCJhc3NpZ25tZW50Iiwic2NvcGUiLCJwbHVyYWwiLCJ0b1VwcGVyQ2FzZSIsInZhbHVlcyIsImZpcnN0IiwiZmlyc3RWYWx1ZSIsIm9yZGluYWwiLCJhZGRJbmZpeE9wZXJhdG9yIiwiYSIsImIiLCJsaXN0eSIsImxocyIsInJocyIsIm9wZXJhdG9yIiwiYWRkUG9zdGZpeE9wZXJhdG9yIl0sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsbURBQTJDLGNBQWM7O0FBRXpEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsbUNBQTJCLDBCQUEwQixFQUFFO0FBQ3ZELHlDQUFpQyxlQUFlO0FBQ2hEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDhEQUFzRCwrREFBK0Q7O0FBRXJIO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7Ozs7Ozs7Ozs7OztBQ2hFQTs7OztBQUNBOzs7Ozs7QUFFQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBQSxPQUFPQyxNQUFQLGlCQUFvQjs7QUFFcEI7QUFDQTtBQUNBOztBQUVBO0FBQ0NDLGdCQVBtQiwyQkFPSEMsTUFQRyxF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QXhCO0FBQWtDO0FBQXpELENBQWxEO0FBQ0EsaUJBQU9nQixrQkFBUCxDQUEwQixjQUExQixFQUEwQyxjQUExQyxFQUEwRDtBQUFFckUsWUFBRix1QkFBY3FELEtBQWQsRUFBcUI7QUFBRSw2QkFBeUJBLEtBQXpCO0FBQW1DO0FBQTFELENBQTFEOztBQUdBLGlCQUFPeEQsU0FBUCxDQUNDLDZCQURELEVBRUMsOENBRkQsRUFHQztBQUNDMkIsU0FERCxvQkFDVUQsT0FEVixFQUNtQjtBQUNqQixNQUFJTixPQUFPLEtBQUtMLGVBQUwsRUFBWDtBQUNBLE1BQUlzRCxNQUFNakQsS0FBS2lELEdBQUwsQ0FBUzFDLFFBQVQsQ0FBa0JELE9BQWxCLENBQVY7QUFDQSxNQUFJdkIsY0FBY2lCLEtBQUttRCxRQUFMLENBQWN2RCxPQUFkLENBQXNCYixXQUF4QztBQUNBLFNBQU9BLFlBQVlrRSxHQUFaLENBQVA7QUFDQTtBQU5GLENBSEQ7O0FBY0E7QUFDQSxpQkFBT3JFLFNBQVAsQ0FBaUIscUJBQWpCLEVBQXdDLHdFQUF4QyxFOzs7Ozs7Ozs7Ozs7O0FDNUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7Ozs7QUFFQTtBQUNBLElBQUksT0FBT3pCLE1BQVAsS0FBa0IsV0FBdEIsRUFBbUM7QUFDbENBLFFBQU91RCxVQUFQO0FBQ0F2RCxRQUFPQyxNQUFQO0FBQ0FELFFBQU9tQyxJQUFQO0FBQ0FuQyxRQUFPRCxNQUFQO0FBQ0E7O2tCQUVjO0FBQ2R3RCxpQ0FEYyxFQUNGdEQsd0JBREUsRUFDTWtDLG9CQUROLEVBQ1lwQztBQURaLEMiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBpZGVudGl0eSBmdW5jdGlvbiBmb3IgY2FsbGluZyBoYXJtb255IGltcG9ydHMgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAxMSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay9ib290c3RyYXAgNjljNmM0ZjYyOTMzOTRjN2IxNTUiLCJpbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyByZS1leHBvcnQgUnVsZSBmb3IgdGVzdGluZ1xuZXhwb3J0IGRlZmF1bHQgUnVsZTtcblxuLy9cbi8vXHQjIFBhcnNpbmcgYHJ1bGVTeW50YXhgIHRvIGNyZWF0ZSBydWxlcyBhdXRvbWF0aWNhbGx5LlxuLy9cbi8vIFRPRE86XHRQdWxsIGBwYXJzZVJ1bGVTeW50YXhgIHN0dWZmIG91dCBpbnRvIHNlcGFyYXRlIG1vZHVsZT9cbi8vIFRPRE86XHRCZXR0ZXIgbmFtZSBmb3IgYHJ1bGVTeW50YXhgXG4vLyBUT0RPOlx0VXNlIGtleXdvcmRzIGluIHN5bnRheCB0byBtYWtlIGEgcXVpY2sgcmVnZXgtYmFzZWQgYHRlc3RgIGZ1bmN0aW9uIGZvciB0aGUgZW50aXJlIHJ1bGVcbk9iamVjdC5hc3NpZ24oUnVsZSwge1xuXG4vL1xuLy8gIyMgZ3JvdXA6IHBhcnNpbmcgc3ludGF4XG4vL1xuXG4vLyBUT0RPOiBjb252ZXJ0IHRvIFRleHRTdHJlYW0gcGF0dGVybiBhbGEgbm9ybWFsIHBhcnNlciBvbmNlIHRoYXQgc2V0dGxlcyBkb3duPz8/XG5cdHBhcnNlUnVsZVN5bnRheChzeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0bGV0IHN5bnRheFN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCk7XG5cdFx0bGV0IHJ1bGVzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgW10pO1xuXG5cdFx0bGV0IHJ1bGU7XG5cdFx0Ly8gSWYgd2Ugb25seSBnb3Qgb25lIHRoaW5nLCByZXR1cm4gdGhhdCBhcyB0aGUgcmVzdWx0XG5cdFx0aWYgKHJ1bGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cnVsZSA9IHJ1bGVzWzBdO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgU2VxdWVuY2VDb25zdHJ1Y3Rvcih7IHJ1bGVzIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9LFxuXG5cdHRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpIHtcblx0XHRjb25zdCBTWU5UQVhfRVhQUkVTU0lPTiA9IC8oPzpbXFx3XFwtXSt8XFxcXFtcXFtcXChcXHtcXClcXH1cXF1dfFteXFxzXFx3XXxcXHwpL2c7XG5cdFx0dmFyIHN5bnRheFN0cmVhbSA9IHN5bnRheC5tYXRjaChTWU5UQVhfRVhQUkVTU0lPTik7XG5cdFx0aWYgKCFzeW50YXhTdHJlYW0pIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgdG9rZW5pemUgcGFyc2UgcnVsZSBzeW50YXggPj4ke3N5bnRheH08PGApO1xuXHRcdHJldHVybiBzeW50YXhTdHJlYW07XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBsYXN0SW5kZXggPSBzeW50YXhTdHJlYW0ubGVuZ3RoO1xuXHRcdHdoaWxlIChzdGFydEluZGV4IDwgbGFzdEluZGV4KSB7XG5cdFx0XHRsZXQgWyBydWxlLCBlbmRJbmRleCBdID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRpZiAocnVsZSkge1xuXHRcdFx0XHR2YXIgbGFzdCA9IHJ1bGVzW3J1bGVzLmxlbmd0aC0xXTtcblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBTdHJpbmdgIGFuZCBsYXN0IHdhcyBhIGBTdHJpbmdgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5TdHJpbmcgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3RyaW5nKSB7XG5cdFx0XHRcdFx0bGFzdC5zdHJpbmcgKz0gcnVsZS5zdHJpbmc7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cnVsZXMucHVzaChydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0c3RhcnRJbmRleCA9IGVuZEluZGV4ICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHZhciBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdHN3aXRjaCAoc3ludGF4VG9rZW4pIHtcblx0XHRcdGNhc2UgXCJ7XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIoXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiW1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKlwiOlxuXHRcdFx0Y2FzZSBcIitcIjpcblx0XHRcdGNhc2UgXCI/XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0XHQvLyB0aGUgZm9sbG93aW5nIHNob3VsZCBBTFdBWVMgYmUgY29uc3VtZWQgYnkgdGhlIGFib3ZlXG5cdFx0XHRjYXNlIFwifVwiOlxuXHRcdFx0Y2FzZSBcIilcIjpcblx0XHRcdGNhc2UgXCJdXCI6XG5cdFx0XHRjYXNlIFwifFwiOlxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgJHtzeW50YXhUb2tlbn0gZm91bmQgYXMgaXRlbSAke3N0YXJ0SW5kZXh9IG9mICR7dGhpcy5zeW50YXh9YCk7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzdHJpbmcgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF0sIHJ1bGU7XG5cdFx0Ly8gSWYgbGV0dGVycyBvbmx5LCBtYXRjaCBhcyBhIEtleXdvcmQgKHNvIHdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGFmdGVyIHRoZSBzdHJpbmcpLlxuXHRcdGlmIChzdHJpbmcubWF0Y2goL1tBLVphLXpdKy8pKSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuS2V5d29yZCh7IGtleXdvcmQ6IHN0cmluZyB9KTtcblx0XHR9XG5cdFx0Ly8gT3RoZXJ3aXNlIG1hdGNoIGFzIGEgU3RyaW5nLCB3aGljaCBkb2Vzbid0IHJlcXVpcmUgbm9uLXdvcmQgY2hhcnMgYWZ0ZXIgdGhlIHRleHQuXG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuU3RyaW5nKHsgc3RyaW5nOiBzdHJpbmcgfSk7XG5cdFx0XHQvLyBJZiBzdHJpbmcgc3RhcnRzIHdpdGggYFxcXFxgLCBpdCdzIGFuIGVzY2FwZWQgbGl0ZXJhbCAoZWc6IGBcXFtgIG5lZWRzIHRvIGlucHV0IGFzIGBcXFxcW2ApLlxuXHRcdFx0aWYgKHN0cmluZy5zdGFydHNXaXRoKFwiXFxcXFwiKSkge1xuXHRcdFx0XHQvLyByZW1vdmUgbGVhZGluZyBzbGFzaCBpbiBtYXRjaCBzdHJpbmcuLi5cblx0XHRcdFx0cnVsZS5zdHJpbmcgPSBydWxlLnN0cmluZy5zdWJzdHIoMSk7XG5cdFx0XHRcdC8vIGJ1dCBsZWF2ZSBpdCBpbiB0b1N0cmluZ1xuXHRcdFx0XHRydWxlLnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gWyBydWxlLCBzdGFydEluZGV4IF07XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBncm91cGluZyBleHByZXNzaW9uIGAoLi4ufC4uLilgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0Ly8gTk9URTogbmVzdGVkIHBhcmVucyBtYXkgbm90IGhhdmUgYWx0ZXJuYXRpdmVzLi4uIDotKCAgIGAoYXwoYnxjKSlgIHdvbid0IHdvcms/Pz9cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCIoXCIsIFwiKVwiLCBzdGFydEluZGV4KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHQvLyBzcGxpdCBpbnRvIGdyb3VwcywgaW5jbHVkaW5nIG5lc3RlZCBwYXJlbnNcblx0XHRsZXQgYWx0ZXJuYXRlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0ZXMoc2xpY2UpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0XHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKGdyb3VwLCBbXSk7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHRzWzBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdGxldCBydWxlID0gYWx0ZXJuYXRlcy5sZW5ndGggPT09IDEgPyBhbHRlcm5hdGVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0ZXMgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblxuXHRcdGZ1bmN0aW9uIGdyb3VwQWx0ZXJuYXRlcyh0b2tlbnMpIHtcblx0XHRcdHZhciBhbHRlcm5hdGVzID0gW107XG5cdFx0XHR2YXIgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGhhbmRsZSBuZXN0ZWQgcGFyZW5zXG5cdFx0XHRcdGVsc2UgaWYgKHRva2VuID09PSBcIihcIikge1xuXHRcdFx0XHRcdGxldCB7IGVuZEluZGV4IH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmRJbmRleCArIDEpKTtcblx0XHRcdFx0XHRpID0gZW5kSW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3VycmVudC5wdXNoKHRva2VuKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGN1cnJlbnQubGVuZ3RoKSBhbHRlcm5hdGVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRyZXR1cm4gYWx0ZXJuYXRlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdHZhciBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlN1YnJ1bGUoeyBydWxlOiBtYXRjaC5zbGljZVswXSB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBtYXRjaC5lbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuTGlzdCgpO1xuXHRcdHJ1bGUuaXRlbSA9IHJlc3VsdHNbMF1cblx0XHRydWxlLmRlbGltaXRlciA9IHJlc3VsdHNbMV1cblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG4vKlxuXHQvLyBNYXRjaCBhbHRlcm5hdGUgYCggYSB8IGIgfCBjIClgLlxuXHQvLyBOT1RFOiB0aGlzIHNob3VsZCBvbmx5IGhhcHBlbiBpbnNpZGUgYSBncm91cC4uLlxuXHRwYXJzZVJ1bGVTeW50YXhfYWx0ZXJuYXRpdmVzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgWyBydWxlLCBlbmRJbmRleCBdID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCArIDEpO1xuY29uc29sZS5pbmZvKHJ1bGUpO1xuXHRcdC8vIGNyZWF0ZSBhbHRlcm5hdGVzIHJ1bGUgd2l0aCBsYXN0VG9rZW4sIG9yIHJlLXVzZSBleGlzdGluZyBhbHRlcm5hdGVzIHJ1bGVcblx0XHRsZXQgYWx0ZXJuYXRlcztcblx0XHRsZXQgbGFzdFRva2VuID0gcnVsZXMucG9wKCk7XG5jb25zb2xlLmluZm8obGFzdFRva2VuKTtcblx0XHRpZiAobGFzdFRva2VuIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpIHtcblx0XHRcdGFsdGVybmF0ZXMgPSBsYXN0VG9rZW47XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0YWx0ZXJuYXRlcyA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVzOiBbXSB9KTtcblxuXHRcdFx0Ly8gaWYgbm8gbGFzdCBydWxlLCB3ZSBoYXZlIGEgcnVsZSBsaWtlICBgKCB8IGFiYylgIHdoaWNoIG1lYW5zIHRoYXQgdGhlIGFsdGVybmF0ZXMgaXMgb3B0aW9uYWxcblx0XHRcdGlmICghbGFzdFRva2VuKVxuXHRcdFx0XHRhbHRlcm5hdGVzLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0YWx0ZXJuYXRlcy5ydWxlcy5wdXNoKGxhc3RUb2tlbik7XG5cdFx0fVxuXHRcdC8vIGFkZCBwYXJzZWQgcnVsZSB0byB0aGUgYWx0ZXJuYXRlc3Ncblx0XHRhbHRlcm5hdGVzLnJ1bGVzLnB1c2gocnVsZSk7XG5cblx0XHQvLyBhZGQgYmFjayB0byB0aGUgZW5kIG9mIHJ1bGVzXG5cdFx0cnVsZXMucHVzaChhbHRlcm5hdGVzKTtcblxuXHRcdHJldHVybiBbIHVuZGVmaW5lZCwgZW5kSW5kZXggXTtcblx0fSxcbiovXG5cbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGVTeW50YXguanMiLCIvL1xuLy9cdCMgQ3JlYXRlIGEgYHBhcnNlcmAgc2luZ2xldG9uIHRvIHVzZSB0byBzZXQgdXAgcnVsZXMgYW5kIGR1cmluZyB0ZXN0cy5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5cbi8vIENyZWF0ZSBwYXJzZXIgaW5zdGFuY2UuXG5jb25zdCBwYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG53aW5kb3cucGFyc2VyID0gcGFyc2VyO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvX3BhcnNlci5qcyIsIi8vIFNwZWxsIFwiRW5nbGlzaFwiIHBhcnNlciBzdHJhd21hblxuXG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcmt5OiAgIGB7YX0gKGlzfGlzIG5vdCkge2J9YFxuLy8gVE9ETzpcdGN1c3RvbSBTeW50YXhFcnJvciBldGMgd2hpY2ggdW5kZXJzdGFuZCBzdHJlYW1zXG4vLyBUT0RPOlx0YnJlYWsgYGZpbGVgIGludG8gbGluZXMgYW5kIHByb2Nlc3MgZWFjaCAoaW5jbC4gc3Vic3RyL21hdGNoIG5vdCBnb2luZyBiZXlvbmQgdGhlIGVuZClcbi8vIFRPRE86XHRuZXN0aW5nIC0tIGlzIHRoaXMganVzdCBpbmRlbnQgPSBcImFkZCBibG9jayBzY29wZVwiXG4vLyBUT0RPOlx0cHJvbW90aW9uIHBhdHRlcm4gZm9yIGdhdGhlciBhcmd1bWVudHMgKGVnOiBsaXRlcmFsLWxpc3QpID8/P1xuLy8gVE9ETzpcdFdoYXQgZG9lcyBzeW50YXggdHJlZSBsb29rIGxpa2U/ICBIb3cgZG8gd2UgZXh0cmFjdCBtZWFuaW5nIG91dCBvZiB0aGUgbmVzdD9cbi8vIFRPRE86XHRSZWN5Y2xlIHdvcmQvc3RyaW5nL3BhdHRlcm4gcnVsZXMgdG8gbW9yZSBlYXNpbHkgc2VlIGNvbW1vbmFsaXR5Li4uXG4vLyBUT0RPOlx0UGFzcyBgY29udGV4dGAgdG8gdG9Tb3VyY2UoKSwgYWRkIHByb3BlcnR5IGRlc2NyaXB0b3JzIHRvIGBjbGFzc2AsIHZhcmlhYmxlcyBhbmQgY29kZSB0byBgbWV0aG9kYCwgYGdsb2JhbGAgc3R1ZmYgZXRjXG5cbmltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblx0Ly8gU2V0IHRvIGB0cnVlYCB0byBvdXRwdXQgZGVidWcgaW5mbyB3aGlsZSBhZGRpbmcgcnVsZXNcblx0c3RhdGljIERFQlVHID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cblx0XHQvLyBDbG9uZSBydWxlcywgc3RhcnRpbmcgd2l0aCBhIGNvbXBsZXRlbHkgZW1wdHkgbWFwIGlmIG5vdCBkZWZpbmVkIChubyBzdGFuZGFyZCBvYmplY3Qga2V5cylcblx0XHR0aGlzLnJ1bGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnJ1bGVzIHx8IG51bGwpO1xuXG5cdFx0Ly8gU2V0IHVwIHN0YW5kYXJkIHJ1bGUgY2xhc3NlcyBhcyBhbHRlcm5hdGVzXG5cdFx0dGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIG5ldyBSdWxlLkFsdGVybmF0aXZlcygpKTtcblx0XHR0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG5ldyBSdWxlLkFsdGVybmF0aXZlcygpKTtcblx0XHR0aGlzLmFkZFJ1bGUoXCJpbmZpeC1vcGVyYXRvclwiLCBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoKSk7XG5cdFx0dGhpcy5hZGRSdWxlKFwicG9zdGZpeC1vcGVyYXRvclwiLCBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoKSk7XG5cdH1cblxuXHRnZXRSdWxlKG5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlc1tuYW1lXTtcblx0fVxuXG4vLyMjIyBQYXJzaW5nXG5cblx0Ly8gUGFyc2UgYG5hbWVgZCBydWxlIGF0IGhlYWQgb2YgYHN0cmVhbWAuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cblx0cGFyc2UobmFtZSwgc3RyZWFtKSB7XG5cdFx0aWYgKHR5cGVvZiBzdHJlYW0gPT09IFwic3RyaW5nXCIpIHN0cmVhbSA9IG5ldyBUZXh0U3RyZWFtKHN0cmVhbSk7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUobmFtZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFJ1bGUgJHtuYW1lfSBub3QgdW5kZXJzdG9vZGAsIG5hbWUsIHN0cmVhbSk7XG5cdFx0c3RyZWFtID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJ1bGUucGFyc2UodGhpcywgc3RyZWFtKTtcblx0fVxuXG5cdC8vIEVhdCB3aGl0ZXNwYWNlIChhY2NvcmRpbmcgdG8gYHJ1bGVzLndoaXRlc3BhY2VgKSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnMgbmV3IHN0cmVhbSBpZiB3ZSBtYXRjaGVkIHdoaXRlc3BhY2UsIG90aGVyd2lzZSB0aGUgc2FtZSBzdHJlYW0uXG5cdC8vIE90aGVyd2lzZSByZXR1cm5zIHRoaXMgc2FtZSBzdHJlYW0uXG5cdGVhdFdoaXRlc3BhY2Uoc3RyZWFtKSB7XG5cdFx0dmFyIHJlc3VsdCA9IHRoaXMucnVsZXMud2hpdGVzcGFjZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHRcdHJldHVybiByZXN1bHQgPyByZXN1bHQubmV4dCgpIDogc3RyZWFtO1xuXHR9XG5cbi8vIyMjIFJ1bGUgZmFjdG9yaWVzXG5cblx0Ly8gQWRkIGEgcnVsZSB0byBvdXIgbGlzdCBvZiBydWxlcyFcblx0Ly8gVE9ETzogY29udmVydCB0byBgYWx0ZXJuYXRpdmVzYCBvbiBvdmVyd3JpdGU/XG5cdGFkZFJ1bGUobmFtZSwgcnVsZSkge1xuXHRcdGxldCBleGlzdGluZyA9IHRoaXMucnVsZXNbbmFtZV07XG5cdFx0aWYgKGV4aXN0aW5nKSB7XG5cdFx0XHRpZiAoIShleGlzdGluZyBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzKSkge1xuXHRcdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQ29udmVydGluZyBydWxlICcke25hbWV9JyB0byBhbHRlcm5hdGl2ZXNgKTtcblx0XHRcdFx0ZXhpc3RpbmcgPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBuYW1lOiBleGlzdGluZy5uYW1lLCBydWxlczogW2V4aXN0aW5nXSB9KTtcblx0XHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IGV4aXN0aW5nO1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JyB0byAnJHtuYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0ZXhpc3RpbmcuYWRkUnVsZShydWxlKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlLnJ1bGVOYW1lID0gbmFtZTtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBydWxlO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cdC8vIEFkZCByZWdleCBhcyBhIHBhdHRlcm4gdG8gb3VyIGxpc3Qgb2YgcnVsZXNcblx0YWRkUGF0dGVybihuYW1lLCBwYXR0ZXJuLCBwcm9wZXJ0aWVzKSB7XG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5QYXR0ZXJuKHByb3BlcnRpZXMpO1xuXHRcdHJ1bGUucGF0dGVybiA9IHBhdHRlcm47XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fVxuXG4vL1RPRE86IG1vdmUgdG8gYHJ1bGVTeW50YXguanNgXG5cblx0Ly8gUGFyc2UgYSBgcnVsZVN5bnRheGAgcnVsZSBhbmQgYWRkIGl0IHRvIG91ciBsaXN0IG9mIHJ1bGVzLlxuXHQvLyBSZXR1cm5zIHRoZSBuZXcgcnVsZS5cblx0Ly8gTG9ncyBwYXJzaW5nIGVycm9ycyBidXQgYWxsb3dzIHRoaW5ncyB0byBjb250aW51ZS5cblx0YWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3Rvcik7XG5cblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGlmIChjb25zb2xlLmdyb3VwKSB7XG5cdFx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdFx0Y29uc29sZS5sb2coYHN5bnRheDogJHtydWxlU3ludGF4fWApO1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdFx0XHRjb25zb2xlLmdyb3VwRW5kKCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCwgZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0YWRkU3RhdGVtZW50KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFJ1bGUuU3RhdGVtZW50KTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fVxuXG5cdGFkZEV4cHJlc3Npb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgUnVsZS5FeHByZXNzaW9uKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcnVsZSk7XG5cdH1cblxuXHRhZGRJbmZpeE9wZXJhdG9yKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudHJhbnNmb3JtZXIpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgaW5maXggb3BlcmF0b3IgcnVsZSAnJHtuYW1lfScgdG8gc3BlY2lmeSAndHJhbnNmb3JtZXInIGZ1bmN0aW9uYClcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJpbmZpeC1vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH1cblxuXHRhZGRQb3N0Zml4T3BlcmF0b3IobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50cmFuc2Zvcm1lcikge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBwb3N0Zml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RyYW5zZm9ybWVyJyBmdW5jdGlvbmApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcInBvc3RmaXgtb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9XG5cblxuLy9cbi8vICMjIFV0aWxpdHkgbWV0aG9kc1xuLy9cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmAuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHN0cmVhbSwgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBzdHJlYW1gXHRcdFN0cmVhbSB3aGljaCB3YXMgbWF0Y2hlZCB3aXRoIGBzdGFydEluZGV4YCBhdCB0aGUgc3RhcnQgb2YgdGhlIG1hdGNoXG4vL1x0XHRcdC0gYGVuZEluZGV4YFx0Tm9uLWluY2x1c2l2ZSBlbmQgaW5kZXggaW4gc3RyZWFtIHdoZXJlIG1hdGNoIGVuZHMuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5nYXRoZXJBcmd1bWVudHMoKWBcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZSgpYFx0XHRcdFx0UmV0dXJuIGphdmFzY3JpcHQgc291cmNlIHRvIGludGVycHJldCB0aGUgcnVsZS5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5cbi8vVE9ETzogbWFrZSBnYXRoZXJBcmd1bWVudHMoKSBzdGF0aWMgYW5kIGNhbGwgb24gdGhpc1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0dmFyIGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCBwcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuXG4vL1xuLy8gIyMgb3V0cHV0IGFzIHNvdXJjZVxuLy9cblx0Z2V0IF9hcmcoKSB7IHJldHVybiB0aGlzLmFyZ3VtZW50IHx8IHRoaXMucnVsZU5hbWUgfHwgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lIH1cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBOb3RlIHRoYXQgd2UgZGVmaW5lIGBnYXRoZXJBcmd1bWVudHMoKWAgc3RhdGljYWxseSBvbiBlYWNoIHN1YmNsYXNzXG5cdC8vXHRhbmQgdGhlbiBpbnN0YW5jZSBtZXRob2QgY2FsbHMgaXQgb24gaXRzZWxmLlxuXHRzdGF0aWMgZ2F0aGVyQXJndW1lbnRzKHJ1bGUpIHtcblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IuZ2F0aGVyQXJndW1lbnRzKHRoaXMpO1xuXHR9XG5cblx0Ly8gT3V0cHV0IHZhbHVlIGZvciB0aGlzIElOU1RBTlRJQVRFRCBydWxlIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG5cblxuXG4vLyBSdWxlIGZvciBsaXRlcmFsIHN0cmluZyB2YWx1ZSwgd2hpY2ggaW5jbHVkZSBwdW5jdHVhdGlvbiBzdWNoIGFzIGAoYCBldGMuXG4vL1RPRE86IHJlbmFtZSBgU3ltYm9sYD8/P1xuUnVsZS5TdHJpbmcgPSBjbGFzcyBTdHJpbmcgZXh0ZW5kcyBSdWxlIHtcblx0Ly8gUGFyc2UgdGhpcyBydWxlIGF0IHRoZSBiZWdpbm5pbmcgb2YgYHN0cmVhbWAsIGFzc3VtaW5nIG5vIHdoaXRlc3BhY2UgYmVmb3JlLlxuXHQvLyBEZWZhdWx0IGlzIHRoYXQgYHJ1bGUuc3RyaW5nYCBpcyBsaXRlcmFsIHN0cmluZyB0byBtYXRjaC5cblx0Ly8gT24gbWF0Y2gsIHJldHVybnMgY2xvbmUgb2YgcnVsZSB3aXRoIGB2YWx1ZWAsIGBzdHJlYW1gIGFuZCBgZW5kSW5kZXhgLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICghc3RyZWFtLnN0YXJ0c1dpdGgodGhpcy5zdHJpbmcpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRoaXMuc3RyaW5nLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgdGhpcy5zdHJpbmcubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cbi8vIFJlZ2V4IHBhdHRlcm4uXG4vLyBgcnVsZS5wYXR0ZXJuYCBpcyB0aGUgcmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoLlxuLy8gTk9URTogdGhlIHJlZ2V4IHNob3VsZCBzdGFydCB3aXRoIGAvXi4uLmAgdG8gbWF0Y2ggYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHZhciBtYXRjaCA9IHN0cmVhbS5tYXRjaCh0aGlzLnBhdHRlcm4pO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogbWF0Y2hbMF0sXG5cdFx0XHRlbmRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXggKyBtYXRjaFswXS5sZW5ndGgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm47XG5cdH1cbn1cblxuXG4vLyBLZXl3b3JkIHBhdHRlcm5cbi8vXHRgcnVsZS5rZXl3b3JkYCBpcyB0aGUga2V5d29yZCBzdHJpbmcgdG8gbWF0Y2guXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHRcdC8vIGNyZWF0ZSBwYXR0ZXJuIHdoaWNoIG1hdGNoZXMgYXQgd29yZCBib3VuZGFyeVxuXHRcdGlmICghdGhpcy5wYXR0ZXJuKSB7XG5cdFx0XHRpZiAoIXRoaXMua2V5d29yZCkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIGtleXdvcmQgcHJvcGVydHlcIik7XG5cdFx0XHR0aGlzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKGBeJHt0aGlzLmtleXdvcmR9XFxcXGJgKTtcblx0XHR9XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5rZXl3b3JkfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHZhciBydWxlID0gcGFyc2VyLmdldFJ1bGUodGhpcy5ydWxlKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQXR0ZW1wdGluZyB0byBwYXJzZSB1bmtub3duIHJ1bGUgJyR7dGhpcy5uYW1lfSdgLCB0aGlzKTtcblx0XHR2YXIgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgcmVzdWx0LmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHt9XG5cblxuLy8gU2VxdWVuY2Ugb2YgcnVsZXMgdG8gbWF0Y2ggKGF1dG8tZXhjbHVkaW5nIHdoaXRlc3BhY2UpLlxuUnVsZS5TZXF1ZW5jZSA9IGNsYXNzIFNlcXVlbmNlIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFyZXN1bHQgJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vVE9ET0Ncblx0Ly8gR2F0aGVyIGFyZ3VtZW50cyBmcm9tIG91ciBwYXJzZWQgYHJlc3VsdHNgIGFycmF5LlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYHZhbHVlc2AgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGByZXN1bHRzLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYHJlc3VsdHMucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gcnVsZSB0eXBlOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdHN0YXRpYyBnYXRoZXJBcmd1bWVudHMoc2VxdWVuY2UpIHtcblx0XHRpZiAoIXNlcXVlbmNlLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IGFyZ3MgPSB7fTtcblx0XHRmb3IgKGxldCBuZXh0IG9mIHNlcXVlbmNlLnJlc3VsdHMpIHtcblx0XHRcdGxldCBhcmdOYW1lID0gbmV4dC5fYXJnO1xuXHRcdFx0Ly8gRm9yIG5lc3RlZCBydWxlcywgcmVjdXJzZSB0byBnZXQgdGhlaXIgYXJndW1lbnRzXG5cdFx0XHRsZXQgcmVzdWx0ID0gbmV4dC5nYXRoZXJBcmd1bWVudHMoKTtcblxuXHRcdFx0Ly8gSWYgYXJnIGFscmVhZHkgZXhpc3RzLCBjb252ZXJ0IHRvIGFuIGFycmF5XG5cdFx0XHRpZiAoYXJnTmFtZSBpbiBhcmdzKSB7XG5cdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShhcmdzW2FyZ05hbWVdKSkgYXJnc1thcmdOYW1lXSA9IFthcmdzW2FyZ05hbWVdXTtcblx0XHRcdFx0YXJnc1thcmdOYW1lXS5wdXNoKHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0YXJnc1thcmdOYW1lXSA9IHJlc3VsdDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGFyZ3M7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlcy5qb2luKFwiIFwiKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG5cbn1cblxuLy8gU3ludGFjdGljIHN1Z2FyIGZvciBkZWJ1Z2dpbmdcblJ1bGUuRXhwcmVzc2lvbiA9IGNsYXNzIGV4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXguXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBGaW5kIHRoZSBMT05HRVNUIG1hdGNoXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IGJlc3RNYXRjaDtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKCFtYXRjaCkgY29udGludWU7XG5cblx0XHRcdC8vIHRha2UgdGhlIGxvbmdlc3QgbWF0Y2hcblx0XHRcdGlmICghYmVzdE1hdGNoIHx8IG1hdGNoLmVuZEluZGV4ID4gYmVzdE1hdGNoLmVuZEluZGV4KVxuXHRcdFx0XHRiZXN0TWF0Y2ggPSBtYXRjaDtcblx0XHR9XG5cdFx0aWYgKCFiZXN0TWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiBiZXN0TWF0Y2gsXG5cdFx0XHRlbmRJbmRleDogYmVzdE1hdGNoLmVuZEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZSgpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAoJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGVzLmpvaW4oXCJ8XCIpfSkke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuLy8gUmVwZWF0aW5nIHJ1bGUuXG4vL1x0YHRoaXMucnVsZWAgaXMgdGhlIHJ1bGUgdGhhdCByZXBlYXRzLlxuLy9cbi8vIEFmdGVyIG1hdGNoaW5nOlxuLy9cdGB0aGlzLnJlc3VsdHNgIGlzIGFycmF5IG9mIHJlc3VsdHMgb2YgbWF0Y2hlcy5cbi8vXG4vL1x0QXV0b21hdGljYWxseSBjb25zdW1lcyB3aGl0ZXNwYWNlIGJlZm9yZSBydWxlcy5cbi8vXHRJZiBkb2Vzbid0IG1hdGNoIGF0IGxlYXN0IG9uZSwgcmV0dXJucyBgdW5kZWZpbmVkYC5cblJ1bGUuUmVwZWF0ID0gY2xhc3MgUmVwZWF0IGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBuZXh0ID0gc3RyZWFtO1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghcmVzdWx0KSBicmVhaztcblxuXHRcdFx0cmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0c3RhdGljIGdhdGhlckFyZ3VtZW50cyhyZXBlYXQpIHtcblx0XHRpZiAoIXJlcGVhdC5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiByZXBlYXQucmVzdWx0cy5tYXAoIHJlc3VsdCA9PiByZXN1bHQuZ2F0aGVyQXJndW1lbnRzKCkgKTtcblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdHRocm93IFwiRG9uJ3QgdW5kZXJzdGFuZCBob3cgdG8gc291cmNlIFJ1bGUuUmVwZWF0IVwiO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0Y29uc3QgcnVsZSA9ICh0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlID8gYCgke3RoaXMucnVsZX0pYCA6IGAke3RoaXMucnVsZX1gKTtcblx0XHRyZXR1cm4gYCR7cnVsZX0ke3RoaXMub3B0aW9uYWwgPyAnKicgOiAnKyd9YDtcblx0fVxufVxuXG5cbi8vIExpc3QgbWF0Y2ggcnVsZTogICBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAuIGVnXCIgYFt7bnVtYmVyfSxdYCB0byBtYXRjaCBgMSwyLDNgXG4vL1x0YHJ1bGUuaXRlbWAgaXMgdGhlIHJ1bGUgZm9yIGVhY2ggaXRlbSxcbi8vXHRgcnVsZS5kZWxpbWl0ZXJgIGlzIHRoZSBkZWxpbWl0ZXIgYmV0d2VlbiBlYWNoIGl0ZW0uXG4vLyBcdGBydWxlLnJlc3VsdHNgIGluIHRoZSBvdXRwdXQgaXMgdGhlIGxpc3Qgb2YgdmFsdWVzLlxuLy9cbi8vXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhIExpc3QgcnVsZSB3aWxsIE5PVCByZXBlYXQgKD8/Pz8pXG5SdWxlLkxpc3QgPSBjbGFzcyBMaXN0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0dmFyIHJlc3VsdHMgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdHJlc3VsdHMucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFkZWxpbWl0ZXIpIGJyZWFrO1xuXHRcdFx0bmV4dCA9IGRlbGltaXRlci5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybiBtYXRjaGVkIGl0ZW0gYnkgaW5kZXhcblx0Z2V0SXRlbShpbmRleCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLnJlc3VsdHNbaW5kZXhdO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XHRcdC8vIFRPRE86IHRocm93Pz8/XG5cdFx0bGV0IHJlc3VsdHMgPSB0aGlzLnJlc3VsdHMubWFwKCByZXN1bHQgPT4gcmVzdWx0LnRvU291cmNlKCkgKS5qb2luKFwiLCBcIik7XG5cdFx0cmV0dXJuIGBbJHtyZXN1bHRzfV1gO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiXG4vLyBUT0RPOiBjb252ZXJ0IHRvIGxpbmUtYXdhcmUgc3RyZWFtPz8/XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXh0U3RyZWFtIHtcblx0Ly8gWW91IGNhbiBjb25zdHJ1Y3Qgd2l0aCBhIHRleHQgc3RyaW5nIG9yIGEgc2V0IG9mIHByb3BlcnRpZXMgKGluY2x1ZGluZyBgdGV4dGApLlxuXHRjb25zdHJ1Y3Rvcih0ZXh0T3JQcm9wcykge1xuXHRcdGlmICh0eXBlb2YgdGV4dE9yUHJvcHMgPT09IFwic3RyaW5nXCIpXG5cdFx0XHR0aGlzLnRleHQgPSB0ZXh0T3JQcm9wcztcblx0XHRlbHNlXG5cdFx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHRleHRPclByb3BzKTtcblxuXHRcdC8vIE1ha2Ugc3VyZSBgdGV4dGAgaXMgZGVmaW5lZC5cblx0XHRpZiAoIShcInRleHRcIiBpbiB0aGlzKSkgdGhpcy50ZXh0ID0gXCJcIjtcblx0XHRpZiAoIShcInN0YXJ0SW5kZXhcIiBpbiB0aGlzKSkgdGhpcy5zdGFydEluZGV4ID0gMDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBpbW11dGFibGUgY2xvbmUgb2YgdGhlIHN0cmVhbS5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRsZXQgY2xvbmUgPSBuZXcgVGV4dFN0cmVhbSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCBwcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jZWQgdG8gbmV3IHN0YXJ0SW5kZXguXG5cdGFkdmFuY2VUbyhzdGFydEluZGV4KSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4IH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jaW5nIHN0YXJ0SW5kZXggQlkgYGxlbmd0aGBcblx0YWR2YW5jZUJ5KGxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuXHR9XG5cbi8vIFx0Ly8gUmV0dXJuIGNsb25lIG9mIHRoaXMgc3RyZWFtIHdpdGggZW5kSW5kZXggc2V0IHRvIHN0YXJ0ICsgYGxlbmd0aGBcbi8vIFx0ZW5kQWZ0ZXIobGVuZ3RoKSB7XG4vLyBcdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBlbmRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuLy8gXHR9XG5cbi8vXG4vLyAjIyBNYXRjaGluZ1xuLy9cblx0Ly8gTWF0Y2ggYHBhdHRlcm5gIGFzIHJlZ2V4IGF0IGhlYWQgb2Ygc3RyZWFtLlxuXHQvLyBOT1RFOiByZWdleGVzIHNob3VsZCBzdGFydCB3aXRoIGBeYCFcblx0Ly8gUmV0dXJucyBtYXRjaCBvciB1bmRlZmluZWQuXG5cdG1hdGNoKHBhdHRlcm4pIHtcblx0XHRpZiAoIShwYXR0ZXJuIGluc3RhbmNlb2YgUmVnRXhwKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGV4dFN0cmVhbS5tYXRjaCgke3BhdHRlcm59KTogZXhwZWN0ZWQgUmVnRXhwYCk7XG4vL1RPRE86IHVzZSBgc3RyZWFtLnJhbmdlYCB0byBlbnN1cmUgbWF0Y2ggaXMgbm90IG5vdCBiZXlvbmQgYHN0cmluZy5lbmRJbmRleGBcblx0XHRyZXR1cm4gdGhpcy5oZWFkLm1hdGNoKHBhdHRlcm4pO1xuXHR9XG5cblx0c3RhcnRzV2l0aChzdHJpbmcpIHtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQuc3RhcnRzV2l0aChzdHJpbmcpO1xuXHR9XG5cblxuLy9cbi8vICMjIFJlZmxlY3Rpb25cbi8vXG5cdC8vIFJldHVybiB0ZXh0IG9mIHN0cmluZyBzdGFydGluZyBhdCBvdXIgYHN0YXJ0SW5kZXhgXG5cdGdldCBoZWFkKCkge1xuXHRcdHJldHVybiB0aGlzLnJhbmdlKCk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSByYW5nZSBvZiB0aGUgc3RyaW5nIGZyb20gYHN0YXJ0SW5kZXhgIHRvIGBlbmRJbmRleGAgTk9OLWluY2x1c2l2ZS5cblx0cmFuZ2Uoc3RhcnRJbmRleCA9IHRoaXMuc3RhcnRJbmRleCwgZW5kSW5kZXggPSB0aGlzLnRleHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5zdWJzdHJpbmcoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xuXHR9XG5cblx0Ly8gTGVuZ3RoIG9mIHRoZSBzdHJlYW0uXG5cdGdldCBsZW5ndGgoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5sZW5ndGg7XG5cdH1cblxuXHQvLyBBcmUgd2UgYXQgdGhlIGVuZCBvZiB0aGUgc3RyZWFtP1xuXHRnZXQgaXNFbXB0eSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGFydEluZGV4ID09PSB0aGlzLmxlbmd0aDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHRcblx0fTtcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9UZXh0U3RyZWFtLmpzIiwiLy9cbi8vXHQjIENvcmUgYHJ1bGVzYCAtLSBzaW1wbGUgZGF0YXR5cGVzLCBldGMuXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vL1xuLy8gUmVnZXggcGF0dGVybiBydWxlcyB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvcnMgZm9yIGRlYnVnZ2luZ1xuLy9cbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJ3aGl0ZXNwYWNlXCIsIC9eXFxzKy8pO1xuUnVsZS5XaGl0ZXNwYWNlID0gY2xhc3Mgd2hpdGVzcGFjZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fVxucGFyc2VyLmFkZFJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIG5ldyBSdWxlLldoaXRlc3BhY2UoeyBwYXR0ZXJuOiAvXlxccysvLCBvcHRpb25hbDogdHJ1ZSB9KSk7XG5cbi8vIGBUeXBlYCA9IHR5cGUgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhbiB1cHBlci1jYXNlIGxldHRlciAoPylcbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJ0eXBlbmFtZVwiLCAvXltBLVpdW1xcd1xcZFxcLV9dKi8pO1xuUnVsZS5UeXBlID0gY2xhc3MgVHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoXCJUeXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvXltBLVpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHR5cGUpO1xuXG5cbi8vIGBudW1iZXJgIGFzIGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG5SdWxlLk51bWJlciA9IGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBudW1iZXIgPSBwYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgUnVsZS5OdW1iZXIoe1xuXHRwYXR0ZXJuOiAvXi0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VGbG9hdCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG51bWJlcik7XG5cblxuLy8gTnVtZXJpYyBgaW50ZWdlcmAgb25seSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gTk9URTogdGhpcyBXSUxMIG1hdGNoIGEgZmxvYXQsIGJ1dCB0aGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBjb2VyY2UgdG8gYW4gaW50ZWdlci5cbi8vIFJFVklFVzogaXMgdGhpcyByaWdodD8gIEJldHRlciB0byBub3QgbWF0Y2ggYSBmbG9hdD9cblJ1bGUuSW50ZWdlciA9IGNsYXNzIGludGVnZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImludGVnZXJcIiwgbmV3IFJ1bGUuSW50ZWdlcih7XG5cdHBhdHRlcm46IC9eLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0ZXh0ID0gcGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyBSdWxlLlRleHQoe1xuXHRwYXR0ZXJuOiAvXig/OlwiW15cIl0qXCJ8J1teJ10qJykvXG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdGV4dCk7XG5cblxuLy8gQm9vbGVhbiBsaXRlcmFsLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBUT0RPOiBiZXR0ZXIgbmFtZSBmb3IgdGhpcz8/P1xuUnVsZS5Cb29sZWFuID0gY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBib29sID0gcGFyc2VyLmFkZFJ1bGUoXCJib29sZWFuXCIsIG5ldyBSdWxlLkJvb2xlYW4oe1xuXHRwYXR0ZXJuOiAvXih0cnVlfGZhbHNlfHllc3xub3xzdWNjZXNzfGZhaWx1cmV8b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwic3VjY2Vzc1wiOlxuXHRcdFx0Y2FzZSBcIm9rXCI6XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGJvb2wpO1xuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuLy9wYXJzZXIuYWRkUGF0dGVybihcImlkZW50aWZpZXJcIiwgL15bYS16XVtcXHdcXGRcXC1fXSovKTtcbi8vVE9ETzogZG9uJ3QgYWNjZXB0IGNlcnRhaW4ga2V5d29yZHM/Pz9cblJ1bGUuSWRlbnRpZmllciA9IGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgaWRlbnRpZmllciA9IHBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgUnVsZS5JZGVudGlmaWVyKHtcblx0cGF0dGVybjogL15bYS16XVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBpZGVudGlmaWVyKTtcblxuLy8gTGl0ZXJhbCB2YWx1ZSBhcyBudW1iZXIsIHRleHQgb3IgYm9vbGVhbi5cbi8vVE9ETzogdGhpcyBpcyBhbiBleHByZXNzaW9uLi4uID9cbnBhcnNlci5hZGRTeW50YXgoXCJsaXRlcmFsXCIsIFwiKGxpdGVyYWw6e251bWJlcn18e3RleHR9fHtib29sZWFufSlcIik7XG5cblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxubGV0IGxpc3QgPSBwYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsLWxpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdHtcblx0XHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzWzFdO1xuXHRcdH0sXG5cdFx0Ly8gcmV0dXJuIGp1c3QgdGhlIGxpc3QgYXMgb3VyIHNvdXJjZVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcbiBcdFx0XHRyZXR1cm4gdGhpcy5nYXRoZXJBcmd1bWVudHMoKS50b1NvdXJjZSgpO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJpbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gbG9hZCBzdGFuZGFyZCBydWxlcyBmaWxlcyBoZXJlXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbnVtYmVyc1wiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vYXNzaWdubWVudFwiO1xuaW1wb3J0IFwiLi9jbGFzc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBUT0RPOiB7cHJvcGVydHktZXhwcmVzc2lvbn0gYWxzbyB3b3Jrcy4uLlxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJ7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cIiwge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0bGV0IHZhbHVlID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0Ly8gVE9ETzogZGVjbGFyZSBpZGVudGlmaWVyIGlmIG5vdCBpbiBzY29wZSwgZXRjXG5cdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9ID0gJHt2YWx1ZX1gO1xuXHR9XG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9hc3NpZ25tZW50LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vL3BhcnNlci5hZGRFeHByZXNzaW9uKFwicHJvcGVydHktb2ZcIiwgXCJ7cHJvcGVydHk6cHJvcGVydHktbmFtZX0rIHtleHByZXNzaW9ufVwiLCB7XG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcInByb3BlcnR5LW9mXCIsIFwiKHByb3BlcnRpZXM6dGhlIHtpZGVudGlmaWVyfSBvZikrIHtleHByZXNzaW9ufVwiLCB7XG4gXHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0bGV0IGFyZ3MgPSBSdWxlLkV4cHJlc3Npb24uZ2F0aGVyQXJndW1lbnRzKHRoaXMpO1xuXHRcdC8vIHRyYW5zZm9ybSBwcm9wZXJ0aWVzIGFuZCByZXZlcnNlIG9yZGVyXG5cdFx0YXJncy5wcm9wZXJ0aWVzID0gYXJncy5wcm9wZXJ0aWVzLm1hcCggc2VxdWVuY2UgPT4gc2VxdWVuY2UuaWRlbnRpZmllciApLnJldmVyc2UoKTtcblx0XHRyZXR1cm4gYXJncztcbiBcdH0sXG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRsZXQgdGhpbmcgPSBhcmdzLmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRsZXQgcHJvcGVydGllcyA9IGFyZ3MucHJvcGVydGllcy5tYXAoIGlkZW50aWZpZXIgPT4gaWRlbnRpZmllci50b1NvdXJjZSgpICkuam9pbihcIi5cIik7XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXQoJHt0aGluZ30sICcke3Byb3BlcnRpZXN9JylgO1xuXHR9XG59KTtcblxuXG5cbnBhcnNlci5hZGRTeW50YXgoXCJzY29wZS1tb2RpZmllclwiLCBcIihzY29wZTpnbG9iYWx8Y29uc3RhbnR8c2hhcmVkKVwiKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlLXByb3BlcnR5XCIsXG5cdFwie3Njb3BlLW1vZGlmaWVyfT8ge2Fzc2lnbm1lbnR9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuYXNzaWdubWVudC5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgdmFsdWUgPSBhcmdzLmFzc2lnbm1lbnQuZXhwcmVzc2lvbi50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGFzc2lnbm1lbnQgPSBgJHtpZGVudGlmaWVyfSA9ICR7dmFsdWV9YDtcblxuXHRcdFx0dmFyIHNjb3BlID0gYXJncy5zY29wZSA/IGFyZ3Muc2NvcGUudG9Tb3VyY2UoKSA6IFwibG9jYWxcIjtcblx0XHRcdHN3aXRjaCAoc2NvcGUpIHtcblx0XHRcdFx0Y2FzZSBcImdsb2JhbFwiOlxuXHRcdFx0XHRcdHJldHVybiBgZ2xvYmFsLiR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHthc3NpZ25tZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZFwiOlxuXHRcdFx0XHRcdHJldHVybiBgc3RhdGljICR7YXNzaWdubWVudH1gO1xuXG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0cmV0dXJuIGFzc2lnbm1lbnQ7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZS1wcm9wZXJ0eS1hcy1vbmUtb2ZcIixcblx0XCJ7aWRlbnRpZmllcn0gYXMgb25lIG9mIHtsaXN0OmxpdGVyYWwtbGlzdH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgcGx1cmFsID0gKGlkZW50aWZpZXIgKyBcIl9WQUxVRVNcIikudG9VcHBlckNhc2UoKTtcblx0XHRcdGxldCBsaXN0ID0gYXJncy5saXN0Lmxpc3Q7XG5cdFx0XHRsZXQgdmFsdWVzID0gbGlzdC50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGZpcnN0ID0gbGlzdC5yZXN1bHRzWzBdO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKCkgOiBcInVuZGVmaW5lZFwiO1xuXG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke3BsdXJhbH0gPSAke3ZhbHVlc307XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0geyByZXR1cm4gKFwiX18ke2lkZW50aWZpZXJ9XCIgaW4gdGhpcyA/IHRoaXMuX18ke2lkZW50aWZpZXJ9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfVxcbmA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY2xhc3MuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBudW1iZXJzXG4vL1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vIE51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmcuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4LWV4cHJlc3Npb25cIiwgXCJpdGVtIHtudW1iZXI6aW50ZWdlcn0gb2Yge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoKSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBudW1iZXIgPSBhcmdzLm51bWJlci50b1NvdXJjZSgpO1xuXHRcdGxldCBleHByZXNzaW9uID0gYXJncy5leHByZXNzaW9uLnRvU291cmNlKCk7XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7bnVtYmVyfSlgO1xuXHR9XG59KTtcblxuLy8gRW5nbGlzaCB3b3JkcyB1c2VkIGZvciBwb3NpdGlvbiBvZiBzb21ldGhpbmcgaW4gYSBsaXN0LlxuLy8gVE9ETzogYHNldmVudHktc2V2ZW50aGAsIGB0aGlyZC10by1sYXN0YC4uLlxucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCIoZmlyc3R8c2Vjb25kfHRoaXJkfGZvdXJ0aHxmaWZ0aHxzaXh0aHxzZXZlbnRofGVpZ2h0aHxuaW50aHx0ZW50aHxwZW51bHRpbWF0ZXxsYXN0fGZpbmFsKVwiLCB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgb3JkaW5hbCA9IHRoaXMubWF0Y2hlZC50b1NvdXJjZSgpO1xuXHRcdHN3aXRjaCAob3JkaW5hbCkge1xuXHRcdFx0Y2FzZSBcImZpcnN0XCI6XHRcdHJldHVybiAxO1xuXHRcdFx0Y2FzZSBcInNlY29uZFwiOlx0XHRyZXR1cm4gMjtcblx0XHRcdGNhc2UgXCJ0aGlyZFwiOlx0XHRyZXR1cm4gMztcblx0XHRcdGNhc2UgXCJmb3VydGhcIjpcdFx0cmV0dXJuIDQ7XG5cdFx0XHRjYXNlIFwiZmlmdGhcIjpcdFx0cmV0dXJuIDU7XG5cdFx0XHRjYXNlIFwic2l4dGhcIjpcdFx0cmV0dXJuIDY7XG5cdFx0XHRjYXNlIFwic2V2ZW50aFwiOlx0XHRyZXR1cm4gNztcblx0XHRcdGNhc2UgXCJlaWdodGhcIjpcdFx0cmV0dXJuIDg7XG5cdFx0XHRjYXNlIFwibmludGhcIjpcdFx0cmV0dXJuIDk7XG5cdFx0XHRjYXNlIFwidGVudGhcIjpcdFx0cmV0dXJuIDEwO1xuXHRcdFx0Y2FzZSBcInBlbnVsdGltYXRlXCI6XHRyZXR1cm4gLTI7XG5cdFx0XHRjYXNlIFwibGFzdFwiOlx0XHRyZXR1cm4gLTE7XG5cdFx0XHRjYXNlIFwiZmluYWxcIjpcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0fVxufSk7XG5cbi8vIEFsdGVybmF0aXZlIGZvcm0gZm9yIG51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmcuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4LWV4cHJlc3Npb25cIiwgXCJ0aGUge29yZGluYWx9IGl0ZW0gb2Yge2V4cHJlc3Npb259XCIsIHtcblx0dG9Tb3VyY2UoKSB7XG5cdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdGxldCBvcmRpbmFsID0gYXJncy5vcmRpbmFsLnRvU291cmNlKCk7XG5cdFx0bGV0IGV4cHJlc3Npb24gPSBhcmdzLmV4cHJlc3Npb24udG9Tb3VyY2UoKTtcblx0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtvcmRpbmFsfSlgO1xuXHR9XG59KTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL251bWJlcnMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGluZml4IGFuZCBwcmVmaXggb3BlcmF0b3JzLlxuLy9cblxuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8jIyBJbmZpeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj4ge3Joc31gLCBlZzogYGEgaXMgMWBcbi8vIE5PVEU6IGBvcGVyYXRvci50cmFuc2Zvcm1lcmAgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHR3byBhcmd1bWVudHMgKGBsaHNgIGFuZCBgcmhzYCkgaW50byBvdXRwdXQuXG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNcIiwgXCJpc1wiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ID09ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdFwiLCBcImlzIG5vdFwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXMtZXhhY3RseVwiLCBcImlzIGV4YWN0bHlcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSA9PT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXMtbm90LWV4YWN0bHlcIiwgXCJpcyBub3QgZXhhY3RseVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm4gYCgke2F9ICE9PSAke2J9KWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5pc09mVHlwZSh0aGluZywgdHlwZSlgXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLXR5cGUtb2ZcIiwgXCJpcyAoYXxhbilcIiwgeyB0cmFuc2Zvcm1lcih0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdC10eXBlLW9mXCIsIFwiaXMgbm90IChhfGFuKVwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzSW4odGhpbmcsIGNvbGxlY3Rpb24pYFxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1pblwiLCBcImlzIGluXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcsIGxpc3R5KSB7IHJldHVybiBgc3BlbGwuaXNJbigke3RoaW5nfSwgJHtsaXN0eX0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW9uZS1vZlwiLCBcImlzIG9uZSBvZlwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCBsaXN0eSkgeyByZXR1cm4gYHNwZWxsLmlzSW4oJHt0aGluZ30sICR7bGlzdHl9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpcy1ub3QtaW5cIiwgXCJpcyBub3QgaW5cIiwgeyB0cmFuc2Zvcm1lcih0aGluZywgbGlzdHkpIHsgcmV0dXJuIGAhc3BlbGwuaXNJbigke3RoaW5nfSwgJHtsaXN0eX0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzLW5vdC1vbmUtb2ZcIiwgXCJpcyBub3Qgb25lIG9mXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcsIGxpc3R5KSB7IHJldHVybiBgIXNwZWxsLmlzSW4oJHt0aGluZ30sICR7bGlzdHl9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0XCIsIFwiKD58aXMgZ3JlYXRlciB0aGFuKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndGVcIiwgXCIoPj18aXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibHRcIiwgXCIoPHxpcyBsZXNzIHRoYW4pXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0ZVwiLCBcIig8PXxpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8pXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkU3ludGF4KFxuXHRcImluZml4LW9wZXJhdG9yLWV4cHJlc3Npb25cIixcblx0XCJ7bGhzOmV4cHJlc3Npb259IHtvcGVyYXRvcjppbmZpeC1vcGVyYXRvcn0ge3JoczpleHByZXNzaW9ufVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IGxocyA9IGFyZ3MubGhzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHJocyA9IGFyZ3MucmhzLnRvU291cmNlKGNvbnRleHQpO1xuXG5cdFx0XHRsZXQgdHJhbnNmb3JtZXIgPSBhcmdzLm9wZXJhdG9yLm1hdGNoZWQudHJhbnNmb3JtZXI7XG5cdFx0XHRyZXR1cm4gdHJhbnNmb3JtZXIobGhzLCByaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8jIyBQb3N0aWZ4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPmAsIGUuZy4gYGEgaXMgZGVmaW5lZGBcbi8vIE5PVEU6IGBvcGVyYXRvci50cmFuc2Zvcm1lcmAgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBvdXRwdXQuXG5cbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpcy1kZWZpbmVkXCIsIFwiaXMgZGVmaW5lZFwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSAhPT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtbm90LWRlZmluZWRcIiwgXCJpcyBub3QgZGVmaW5lZFwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtdW5kZWZpbmVkXCIsIFwiaXMgdW5kZWZpbmVkXCIsIHsgdHJhbnNmb3JtZXIodGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXMtZW1wdHlcIiwgXCJpcyBlbXB0eVwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpcy1ub3QtZW1wdHlcIiwgXCJpcyBub3QgZW1wdHlcIiwgeyB0cmFuc2Zvcm1lcih0aGluZykgeyByZXR1cm4gYCFzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfX0pO1xuXG5cbnBhcnNlci5hZGRTeW50YXgoXG5cdFwicG9zdGZpeC1vcGVyYXRvci1leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeC1vcGVyYXRvcn1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBsaHMgPSBhcmdzLmxocy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCB0cmFuc2Zvcm1lciA9IGFyZ3Mub3BlcmF0b3IubWF0Y2hlZC50cmFuc2Zvcm1lcjtcblx0XHRcdHJldHVybiB0cmFuc2Zvcm1lcihsaHMpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG5wYXJzZXIuYWRkU3ludGF4KFwib3BlcmF0b3ItZXhwcmVzc2lvblwiLCBcIihleHByZXNzaW9uOntwb3N0Zml4LW9wZXJhdG9yLWV4cHJlc3Npb259fHtpbmZpeC1vcGVyYXRvci1leHByZXNzaW9ufSlcIik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIl0sInNvdXJjZVJvb3QiOiIifQ==