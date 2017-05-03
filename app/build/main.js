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
/******/ 	return __webpack_require__(__webpack_require__.s = 13);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Parser = __webpack_require__(3);

var _Parser2 = _interopRequireDefault(_Parser);

var _RuleSyntax = __webpack_require__(1);

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

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _memoize = __webpack_require__(7);

var _Parser = __webpack_require__(3);

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
	parseRuleSyntax_tokens: function parseRuleSyntax_tokens(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
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
				rules.push(rule);
			}
			startIndex = endIndex + 1;
		}
		return rules;
	},
	parseRuleSyntax_token: function parseRuleSyntax_token(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

		var syntaxToken = syntaxStream[startIndex];

		// if we got a "\\" (which also has to go into the source string as "\\")
		// treat the next token as a literal string rather than as a special character.
		if (syntaxToken === "\\") {
			return _Rule2.default.parseRuleSyntax_symbol(syntaxStream, rules, startIndex + 1);
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
				if (syntaxToken.match(_Rule2.default.KEYWORD_PATTERN)) {
					return _Rule2.default.parseRuleSyntax_keyword(syntaxStream, rules, startIndex);
				} else {
					return _Rule2.default.parseRuleSyntax_symbol(syntaxStream, rules, startIndex);
				}
		}
	},


	KEYWORD_PATTERN: /[A-Za-z]+/,

	// Match `keyword` in syntax rules.
	// If more than one keyword appears in a row, combines them into a single `Keyword` object.
	// This is pretty safe, unless you have an optional keyword like
	//		`the {identifier} of the? {expression}`
	// in which case you can put the optional keyword in parens
	//		`the {identifier} of (the?) {expression}`
	//
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_keyword: function parseRuleSyntax_keyword(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var constructor = arguments[3];

		var words = [],
		    endIndex = void 0;
		// eat keywords while they last
		for (var i = startIndex; i < syntaxStream.length; i++) {
			var next = syntaxStream[i];
			if (next.match(_Rule2.default.KEYWORD_PATTERN)) {
				words.push(next);
				endIndex = i;
			} else break;
		}

		if (!constructor) constructor = _Rule2.default.Keyword;
		var rule = new constructor({ string: words.join(" ") });

		return [rule, endIndex];
	},


	// Match `keyword` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_symbol: function parseRuleSyntax_symbol(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var constructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.Symbol;

		var string = syntaxStream[startIndex];
		if (!constructor) constructor = _Rule2.default.Symbol;
		var rule = new constructor({ string: string });

		// If string starts with `\\`, it's an escaped literal (eg: `\[` needs to input as `\\[`).
		if (string.startsWith("\\")) {
			// remove leading slash in match string...
			rule.string = rule.string.substr(1);
			// but leave it in toString
			rule.toString = function () {
				return string;
			};
		}
		return [rule, startIndex];
	},


	// Match grouping expression `(...|...)` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	// NOTE: nested parens may not have alternatives... :-(   `(a|(b|c))` won't work???
	parseRuleSyntax_parentheses: function parseRuleSyntax_parentheses(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

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
	parseRuleSyntax_repeat: function parseRuleSyntax_repeat(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

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
	parseRuleSyntax_subrule: function parseRuleSyntax_subrule(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

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
	parseRuleSyntax_list: function parseRuleSyntax_list(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var constructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.List;

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

		var _results = _slicedToArray(results, 2),
		    item = _results[0],
		    delimiter = _results[1];

		var rule = new constructor({ item: item, delimiter: delimiter });
		if (argument) rule.argument = argument;
		return [rule, endIndex];
	}
});

// ##  Add methods to Parser to define rules using the above syntax.
Object.defineProperties(_Parser2.default.prototype, {

	// Parse a `ruleSyntax` rule and add it to our list of rules.
	// Returns the new rule.
	// Logs parsing errors but allows things to continue.
	addSequence: { value: function value(name, ruleSyntax) {
			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Sequence;
			var properties = arguments[3];

			if (typeof constructor !== "function") {
				properties = constructor;
				constructor = _Rule2.default.Sequence;
			}
			try {
				var rule = _Rule2.default.parseRuleSyntax(ruleSyntax, constructor);
				// Reflect the rule back out to make sure it looks (more or less) the same
				if (_Parser2.default.debug) console.log("Added rule '" + name + "':\n  INPUT: " + ruleSyntax + " \n OUTPUT: " + rule);

				//console.info(name, constructor, rule);
				if (properties) Object.assign(rule, properties);
				return this.addRule(name, rule);
			} catch (e) {
				console.group("Error parsing syntax for rule '" + name + "':");
				console.log("syntax: " + ruleSyntax);
				console.error(e);
			}
		} },

	addStatement: { value: function value(name, ruleSyntax) {
			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Statement;
			var properties = arguments[3];

			var rule = this.addSequence(name, ruleSyntax, constructor, properties);
			if (rule) return this.addRule("statement", rule);
		} },

	addExpression: { value: function value(name, ruleSyntax) {
			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Expression;
			var properties = arguments[3];

			var rule = this.addSequence(name, ruleSyntax, constructor, properties);
			if (rule) return this.addRule("expression", rule);
		} },

	addList: { value: function value(name, ruleSyntax) {
			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.List;
			var properties = arguments[3];

			var stream = _Rule2.default.tokeniseRuleSyntax(ruleSyntax);
			var rule = (_Rule2.default.parseRuleSyntax_list(stream, [], 0, constructor) || [])[0];
			if (!rule) return;
			if (properties) Object.assign(rule, properties);
			return this.addRule(name, rule);
		} },

	addKeyword: { value: function value(name, ruleSyntax) {
			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Keyword;
			var properties = arguments[3];

			var stream = _Rule2.default.tokeniseRuleSyntax(ruleSyntax);
			var rule = (_Rule2.default.parseRuleSyntax_keyword(stream, [], 0, constructor) || [])[0];
			if (!rule) return;
			if (properties) Object.assign(rule, properties);
			return this.addRule(name, rule);
		} },

	addSymbol: { value: function value(name, ruleSyntax) {
			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Symbol;
			var properties = arguments[3];

			// TODO: assume we just have one symbol of many letters...
			var stream = [ruleSyntax];
			var rule = (_Rule2.default.parseRuleSyntax_symbol(stream, [], 0, constructor) || [])[0];
			if (!rule) return;
			if (properties) Object.assign(rule, properties);
			return this.addRule(name, rule);
		} },

	// Add postfix operator, such as "a is defined"
	// NOTE: if you have more than one matching operator,
	//		 pass in an array of simple strings so all of our operators are simple strings.
	addPostfixOperator: { value: function value(name, ruleSyntax, properties) {
			var _this = this;

			if (Array.isArray(ruleSyntax)) {
				return ruleSyntax.forEach(function (syntax) {
					return _this.addPostfixOperator(name, syntax, properties);
				});
			}

			var rule = this.addSequence(name, ruleSyntax, properties);
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
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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


var _global = __webpack_require__(16);

var _global2 = _interopRequireDefault(_global);

var _Parser = __webpack_require__(3);

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
		value: function parse(parser, stream, stack) {
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

		// Test to see if bits of our rule are found ANYWHERE in the stream.
		// Returns:
		//	- `undefined` if not determinstic (but all patterns are deterministic)
		//	- regex match if found,
		//	- `false` if not found

	}, {
		key: "test",
		value: function test(parser, stream) {
			return undefined;
		}

		// Does the parse `stack` already contain `rule`?

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


		//
		// ## output as source
		//

		// "gather" arguments in preparation to call `toSource()`
		// Only callable after parse is completed.
		// NOTE: you may want to memoize the results.
		get: function get() {
			return this;
		}
	}, {
		key: "ruleType",
		get: function get() {
			return this.constructor.name;
		}
	}], [{
		key: "stackContains",
		value: function stackContains(stack, rule, stream) {
			if (stack.length === 0) return false;

			//console.info(stack);
			// go backwards
			for (var i = stack.length - 1; i >= 0; i--) {
				var _stack$i = _slicedToArray(stack[i], 2),
				    nextRule = _stack$i[0],
				    nextStream = _stack$i[1];

				if (nextRule === rule) {
					if (nextStream.startIndex === stream.startIndex) {
						//					console.warn("found unproductive rule ", rule, " on stack", stack);
						return true;
					} else {
						//					console.warn("found productive rule ", rule, " on stack", stack);
						return false;
					}
				}
			}
			return false;
		}
	}]);

	return Rule;
}();

// DEBUG: make `Rule` global for debugging.


exports.default = Rule;
_global2.default.Rule = Rule;

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
Rule.Pattern = function (_Rule) {
	_inherits(Pattern, _Rule);

	function Pattern() {
		_classCallCheck(this, Pattern);

		return _possibleConstructorReturn(this, (Pattern.__proto__ || Object.getPrototypeOf(Pattern)).apply(this, arguments));
	}

	_createClass(Pattern, [{
		key: "parse",


		// Attempt to match this pattern at the beginning of the stream.
		value: function parse(parser, stream, stack) {
			var match = stream.match(this.startPattern);
			if (!match) return undefined;

			// bail if present in blacklist
			var matched = match[0];
			if (this.blacklist && this.blacklist[matched]) return undefined;

			var endIndex = stream.startIndex + matched.length;
			return this.clone({
				matched: matched,
				// DEBUG
				matchedText: stream.range(stream.startIndex, endIndex),
				// DEBUG
				startIndex: stream.startIndex,
				endIndex: endIndex,
				stream: stream
			});
		}

		// Patterns are ALWAYS deterministic.

	}, {
		key: "isDeterministic",
		value: function isDeterministic(parser, stream) {
			return true;
		}

		// Test to see if any of our patternis found ANYWHERE in the stream.
		// Returns:
		//	- `undefined` if not determinstic (but all patterns are deterministic)
		//	- regex match if found,
		//	- `false` if not found

	}, {
		key: "test",
		value: function test(parser, stream) {
			var match = stream.match(this.pattern);
			if (match) {
				match.endIndex = match.index + match[0].length;
				return match;
			}
			return false;
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
	}, {
		key: "startPattern",

		// `startPattern` is the same as our pattern except it will only match at the BEGINNING of a string.
		get: function get() {
			if (!this.__startPattern) {
				// `pattern` is required
				if (!this.pattern) throw new TypeError(this + ": You must specify a `pattern` parameter");
				Object.defineProperty(this, "__startPattern", {
					value: new RegExp("^" + this.pattern.source)
				});
			}
			return this.__startPattern;
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
	// Get custom constructor if there is one...
	var constructor = first.constructor !== Rule.Symbol ? first.constructor : second.constructor;
	return new constructor({ string: first.string + second.string });
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
	// Get custom constructor if there is one...
	var constructor = first.constructor !== Rule.Keyword ? first.constructor : second.constructor;
	return new constructor({ string: first.string + " " + second.string });
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
		value: function parse(parser, stream, stack) {
			var rule = parser.getRuleOrDie(this.rule, "rule");
			var match = rule.parse(parser, stream, stack);
			if (!match) return undefined;

			if (this.argument) match.argument = this.argument;
			return match;
		}
	}, {
		key: "isDeterministic",
		value: function isDeterministic(parser, stream) {
			var rule = parser.getRuleOrDie(this.rule, "rule");
			return rule.isDeterministic(parser, stream);
		}

		// Test to see if any of our alternatives are found ANYWHERE in the stream.
		// Returns:
		//	- regex match if found,
		//	- `false` if not found or
		//	- `undefined` if not determinstic.

	}, {
		key: "test",
		value: function test(parser, stream) {
			var rule = parser.getRuleOrDie(this.rule, "rule");
			return rule.test(parser, stream);
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
		//TODO: memoize?
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
			var stack = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

			// If we have a `testRule` defined
			if (this.testRule) {
				var rule = parser.getRuleOrDie(this.testRule, "testRule");
				if (rule.test(parser, stream) === false) return undefined;
			}

			if (this.leftRecursive) {
				if (Rule.stackContains(stack, this, stream)) return undefined;
				stack = stack.concat();
				stack.push([this, stream]);
			}

			if (this.chunkit) return this.parseInChunks(parser, stream, stack);

			var matched = [],
			    next = stream;
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = this.rules[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var _rule = _step.value;

					next = parser.eatWhitespace(next);
					var match = _rule.parse(parser, next, stack);
					if (!match && !_rule.optional) return undefined;
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

		// 	parseInChunks(parser, stream, stack) {
		//
		// 	}

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
			var results = {};
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

			return results;
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

	// Test to see if any of our alternatives are found ANYWHERE in the stream.
	// Returns:
	//	- `undefined` if not determinstic.
	//	- regex match if found,
	//	- `false` if not found or


	_createClass(Alternatives, [{
		key: "test",
		value: function test(parser, stream) {
			if (!this.isDeterministic(parser, stream)) return undefined;
			var bestMatch = void 0;
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = this.rules[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var rule = _step3.value;

					var match = rule.test(parser, stream);
					if (match) {
						match.endIndex = match.index + match[0].length;
						return match;
					}
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

			return false;
		}

		// Find all rules which match and delegate to `getBestMatch()` to pick the best one.

	}, {
		key: "parse",
		value: function parse(parser, stream, stack) {
			var matches = [];
			var _iteratorNormalCompletion4 = true;
			var _didIteratorError4 = false;
			var _iteratorError4 = undefined;

			try {
				for (var _iterator4 = this.rules[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
					var rule = _step4.value;

					var match = rule.parse(parser, stream, stack);
					if (match) matches.push(match);
				}
			} catch (err) {
				_didIteratorError4 = true;
				_iteratorError4 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion4 && _iterator4.return) {
						_iterator4.return();
					}
				} finally {
					if (_didIteratorError4) {
						throw _iteratorError4;
					}
				}
			}

			if (!matches.length) return undefined;

			// uncomment the below to print alternatives
			// if (matches.length > 1) {
			//	console.info(this.argument || this.ruleName, matches, matches.map(match => match.matchedText));
			// }

			var bestMatch = matches.length === 1 ? matches[0] : this.getBestMatch(matches);

			// assign `argName` or `ruleName` for `results`
			if (this.argument) bestMatch.argument = this.argument;else if (this.ruleName) bestMatch.ruleName = this.ruleName;
			//TODO: other things to copy here???

			return bestMatch;
		}

		// Return the "best" match given more than one matches at the head of the stream.
		// Default is to return the longest match.
		// Implement something else to do, eg, precedence rules.

	}, {
		key: "getBestMatch",
		value: function getBestMatch(matches) {
			return matches.reduce(function (best, next) {
				if (next.endIndex > best.endIndex) return next;
				return best;
			}, matches[0]);
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
			var stack = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

			if (this.leftRecursive) {
				if (Rule.stackContains(stack, this, stream)) return undefined;
				stack = stack.concat();
				stack.push([this, stream]);
			}

			var next = stream;
			var matched = [];
			while (true) {
				next = parser.eatWhitespace(next);
				var match = this.rule.parse(parser, next, stack);
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
			return this.matched.map(function (match) {
				return match.results;
			});
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
			var stack = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

			if (this.leftRecursive) {
				if (Rule.stackContains(stack, this, stream)) return undefined;
				stack = stack.concat();
				stack.push([this, stream]);
			}

			// ensure item and delimiter are optional so we don't barf in `parseRule`
			this.item.optional = true;
			this.delimiter.optional = true;

			var matched = [],
			    next = stream;
			while (true) {
				next = parser.eatWhitespace(next);
				// get next item, exiting if not found
				var item = this.item.parse(parser, next, stack);
				if (!item) break;
				//console.log(item);
				matched.push(item);
				next = item.next();

				next = parser.eatWhitespace(next);
				// get delimiter, exiting if not found
				var delimiter = this.delimiter.parse(parser, next, stack);
				if (!delimiter) break;
				next = delimiter.next();
			}

			// If we didn't get any matches, forget it.
			if (matched.length === 0) return undefined;

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
	}, {
		key: "getRuleOrDie",
		value: function getRuleOrDie(name, propertyName) {
			var rule = this.getRule(name);
			if (!rule) throw new SyntaxError(propertyName + " rule '" + name + "' not found");
			return rule;
		}

		//
		//### Parsing
		//
		// Parse something:
		//	- if one string argument, does a `compileStatements()`
		//	- if two, does a `parseRule()` and outputs the results.
		// Returns `parse.toString()` or throws.
		//TESTME

	}, {
		key: "compile",
		value: function compile() {
			if (arguments.length === 1) {
				var string = arguments[0];
				return this.compileStatements(string);
			} else if (arguments.length === 2) {
				var name = arguments[0],
				    _string = arguments[1];
				var result = this.parse(name, _string);
				if (!result) throw new SyntaxError("parser.parse('" + name + "', '" + _string + "'): can't parse this");
				return result.toSource(this);
			} else {
				throw new SyntaxError("parser.parse(): expects one or two arguments");
			}
		}

		// Parse `name`d rule at head of `stream` (`string` or `TextStream`).
		// Handles optional and repeating rules as well as eating whitespace.
		// Returns result of parse.
		//TESTME

	}, {
		key: "parse",
		value: function parse(name, stream) {
			if (typeof stream === "string") stream = new _TextStream2.default(stream);
			var rule = this.getRule(name);
			if (!rule) throw new SyntaxError("parser.parse(" + name + "): Rule not found");
			stream = this.eatWhitespace(stream);
			return rule.parse(this, stream);
		}

		// Parse a set of statements line-by-line.
		//TESTME

	}, {
		key: "compileStatements",
		value: function compileStatements(statements) {
			var _this = this;

			console.time("parseStatements");
			var results = [];
			var currentIndent = 0;
			var tabs = "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t";
			//
			statements.split(/\n/g).forEach(function (statement) {
				// skip lines that are all whitespace
				if (statement.trim() === "") {
					results.push("");
					return;
				}

				// figure out indent level of this line
				var lineStart = statement.match(/^\t*/)[0];
				var lineIndent = lineStart.length;
				if (lineIndent > currentIndent) {
					// add to end of previous line if possible
					if (results.length) {
						// but only if output is not already indented to that level
						//TODO: backtrack for comments!!!
						var indentedStart = lineStart + "\t";
						if (!results[results.length - 1].startsWith(indentedStart)) {
							results[results.length - 1] += " {";
						} else {
							//console.info("already indented");
						}
					} else results.push(tabs.substr(0, lineIndent - 1) + "{");
				} else if (lineIndent < currentIndent) {
					var _results;

					var closers = [];
					for (var i = currentIndent; i > lineIndent; i--) {
						closers.push(tabs.substr(0, i - 1) + "}");
					}
					// put parens BEFORE any blank lines!
					var lastBlankLine = _this._getLastBlankLine(results);
					(_results = results).splice.apply(_results, [lastBlankLine, 0].concat(closers));
				}
				currentIndent = lineIndent;

				var result = _this.parse("statement", statement);
				// complain if no result
				if (!result) {
					console.warn("Couldn't parse statement:\n\t" + statement.trim());
					results.push("// CANT PARSE: " + statement);
				}
				// complain can't parse the entire line!
				else if (result.endIndex !== statement.length) {
						var unparsed = statement.substr(result.endIndex);
						console.warn("Couldn't parse entire statement:", "\n\t\"" + statement.trim() + "\"", "\nunparsed:", "\n\t\"" + unparsed + "\"");
						results.push("// CANT PARSE ENTIRE STATEMENT");
						results.push("// PARSED    : " + result.matchedText);
						results.push("// CANT PARSE: " + unparsed);
					} else {
						// split by lines and add indent
						var source = result.toSource(_this).split("\n").map(function (line) {
							return lineStart + line;
						});
						results = results.concat(source);
					}
			});

			while (currentIndent > 0) {
				results.push(tabs.substr(0, currentIndent - 1) + "}");
				currentIndent--;
			}

			console.timeEnd("parseStatements");
			return results.join("\n");
		}

		// Figure out the last blank line in the results

	}, {
		key: "_getLastBlankLine",
		value: function _getLastBlankLine(results) {
			for (var i = results.length - 1; i >= 0; i--) {
				if (results[i] === "") continue;
				return i + 1;
			}
			return 0;
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

		//
		//	Rules
		//

		// Add a rule to our list of rules!
		// Converts to `alternatives` on re-defining the same rule.

	}, {
		key: "addRule",
		value: function addRule(name, rule) {
			// don't override ruleName
			if (!rule.ruleName) rule.ruleName = name;

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
				this.rules[name] = rule;
			}

			// make a note if we're adding a left-recursive rule
			if (this.ruleIsLeftRecursive(name, rule)) {
				//console.info("marking ", rule, " as left recursive!");
				rule.leftRecursive = true;
			}

			return rule;
		}

		// Is the specified rule left-recursive?

	}, {
		key: "ruleIsLeftRecursive",
		value: function ruleIsLeftRecursive(name, rule) {
			if (!(rule instanceof _Rule2.default.Sequence)) return false;
			//console.log(name, rule);
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = rule.rules[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var subrule = _step.value;

					// ignore optional rules
					if (subrule.optional) continue;
					if (subrule instanceof _Rule2.default.Subrule && subrule.rule === name) return true;
					return false;
				}
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

			return false;
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
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _RuleSyntax = __webpack_require__(1);

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
// NOTE `parser.parseRule("whitespace", "   ")` will return `undefined`
//		 because `parser.parseRule()` automatically eats whitespace at the start of a rule.

_RuleSyntax2.default.Whitespace = function (_Rule$Pattern) {
	_inherits(whitespace, _Rule$Pattern);

	function whitespace() {
		_classCallCheck(this, whitespace);

		return _possibleConstructorReturn(this, (whitespace.__proto__ || Object.getPrototypeOf(whitespace)).apply(this, arguments));
	}

	return whitespace;
}(_RuleSyntax2.default.Pattern);
_parser2.default.addRule("whitespace", new _RuleSyntax2.default.Whitespace({ pattern: /\s+/ }));

// Comment
_RuleSyntax2.default.Comment = function (_Rule$Pattern2) {
	_inherits(comment, _Rule$Pattern2);

	function comment() {
		_classCallCheck(this, comment);

		return _possibleConstructorReturn(this, (comment.__proto__ || Object.getPrototypeOf(comment)).apply(this, arguments));
	}

	return comment;
}(_RuleSyntax2.default.Pattern);

// `word` = is a single alphanumeric word.
// MUST start with a lower-case letter (?)
_RuleSyntax2.default.Word = function (_Rule$Pattern3) {
	_inherits(word, _Rule$Pattern3);

	function word() {
		_classCallCheck(this, word);

		return _possibleConstructorReturn(this, (word.__proto__ || Object.getPrototypeOf(word)).apply(this, arguments));
	}

	return word;
}(_RuleSyntax2.default.Pattern);
_parser2.default.addRule("word", new _RuleSyntax2.default.Word({
	pattern: /\b[a-z][\w\-]*\b/,
	// Convert "-" to "_" in source output.
	toSource: function toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
_RuleSyntax2.default.Identifier = function (_Rule$Pattern4) {
	_inherits(identifier, _Rule$Pattern4);

	function identifier() {
		_classCallCheck(this, identifier);

		return _possibleConstructorReturn(this, (identifier.__proto__ || Object.getPrototypeOf(identifier)).apply(this, arguments));
	}

	return identifier;
}(_RuleSyntax2.default.Pattern);
_parser2.default.addRule("identifier", new _RuleSyntax2.default.Identifier({
	pattern: /\b[a-z][\w\-]*\b/,

	// Convert "-" to "_" in source output.
	toSource: function toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));
_parser2.default.addRule("expression", _parser2.default.rules.identifier);

// Add English prepositions to identifier blacklist.
//
// Wikipedia "Preposition":
//	"Prepositions...are a class of words that
//	express spatial or temporal relations  (in, under, towards, before)
//	or mark various semantic roles (of, for).
// TESTME
_parser2.default.rules.identifier.addToBlacklist("about", "above", "after", "and", "as", "at", "before", "behind", "below", "beneath", "beside", "between", "beyond", "by", "defined", "down", "during", "each", "empty", "exactly", "except", "for", "from", "greater", "I", "in", "into", "less", "long", "me", "minus", "more", "near", "not", "of", "off", "on", "onto", "opposite", "out", "outside", "over", "short", "since", "than", "the", "then", "through", "thru", "to", "toward", "towards", "undefined", "under", "underneath", "unique", "until", "up", "upon", "upside", "versus", "vs", "with", "within", "without");

// Add common english verbs to identifier blacklist.
_parser2.default.rules.identifier.addToBlacklist("are", "do", "does", "contains", "has", "have", "is", "repeat", "was", "were");

// Add special control keywords to identifier blacklist.
_parser2.default.rules.identifier.addToBlacklist("else", "if", "otherwise", "while");

// `Type` = type name.
// MUST start with an upper-case letter (?)
_RuleSyntax2.default.Type = function (_Rule$Pattern5) {
	_inherits(type, _Rule$Pattern5);

	function type() {
		_classCallCheck(this, type);

		return _possibleConstructorReturn(this, (type.__proto__ || Object.getPrototypeOf(type)).apply(this, arguments));
	}

	return type;
}(_RuleSyntax2.default.Pattern);
_parser2.default.addRule("type", new _RuleSyntax2.default.Type({
	pattern: /([A-Z][\w\-]*|text|number|integer|decimal|character|boolean|object)/,
	// Convert "-" to "_" in source output.
	toSource: function toSource(context) {
		var value = this.matched;
		switch (value) {
			// special case to take the following as lowercase
			case "text":
				return "String";
			case "character":
				return "Character";
			case "number":
				return "Number";
			case "integer":
				return "Integer";
			case "decimal":
				return "Decimal";
			case "boolean":
				return "Boolean";
			case "object":
				return "Object";
			default:
				return value.replace(/\-/g, "_");
		}
	}
}));
_parser2.default.rules.type.addToBlacklist("I");
_parser2.default.addRule("expression", _parser2.default.rules.type);

// `number` as either float or integer, created with custom constructor for debugging.
_RuleSyntax2.default.Number = function (_Rule$Pattern6) {
	_inherits(number, _Rule$Pattern6);

	function number() {
		_classCallCheck(this, number);

		return _possibleConstructorReturn(this, (number.__proto__ || Object.getPrototypeOf(number)).apply(this, arguments));
	}

	return number;
}(_RuleSyntax2.default.Pattern);
_parser2.default.addRule("number", new _RuleSyntax2.default.Number({
	pattern: /-?([0-9]*[.])?[0-9]+/,
	// Convert to number on source output.
	toSource: function toSource(context) {
		return parseFloat(this.matched, 10);
	}
}));
_parser2.default.addRule("expression", _parser2.default.rules.number);

// Numeric `integer` only, created with custom constructor for debugging.
// NOTE: this WILL match a float, but the returned value will coerce to an integer.
// REVIEW: is this right?  Better to not match a float?
_RuleSyntax2.default.Integer = function (_Rule$Pattern7) {
	_inherits(integer, _Rule$Pattern7);

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
_RuleSyntax2.default.Text = function (_Rule$Pattern8) {
	_inherits(text, _Rule$Pattern8);

	function text() {
		_classCallCheck(this, text);

		return _possibleConstructorReturn(this, (text.__proto__ || Object.getPrototypeOf(text)).apply(this, arguments));
	}

	return text;
}(_RuleSyntax2.default.Pattern);
_parser2.default.addRule("text", new _RuleSyntax2.default.Text({
	pattern: /(?:"[^"]*"|'[^']*')/
}));
_parser2.default.addRule("expression", _parser2.default.rules.text);

// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
_RuleSyntax2.default.Boolean = function (_Rule$Pattern9) {
	_inherits(boolean, _Rule$Pattern9);

	function boolean() {
		_classCallCheck(this, boolean);

		return _possibleConstructorReturn(this, (boolean.__proto__ || Object.getPrototypeOf(boolean)).apply(this, arguments));
	}

	return boolean;
}(_RuleSyntax2.default.Pattern);
_parser2.default.addRule("boolean", new _RuleSyntax2.default.Boolean({
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
_parser2.default.addRule("expression", _parser2.default.rules.boolean);
// Add boolean tokens to identifier blacklist.
// TESTME
_parser2.default.rules.identifier.addToBlacklist("true", "false", "yes", "no", "ok", "cancel");

// Literal list (array), eg:  `[1,2,true,false ]`
_parser2.default.addExpression("literal_list", "\\[[list:{expression},]?\\]", function (_Rule$Expression) {
	_inherits(literal_list, _Rule$Expression);

	function literal_list() {
		_classCallCheck(this, literal_list);

		return _possibleConstructorReturn(this, (literal_list.__proto__ || Object.getPrototypeOf(literal_list)).apply(this, arguments));
	}

	_createClass(literal_list, [{
		key: "getItem",
		value: function getItem(index) {
			var list = this.results;
			if (list) return list.matched[index];
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			var list = this.results;
			if (!list) return "[]";
			return list.toSource(context);
		}
	}, {
		key: "results",
		get: function get() {
			return _get(literal_list.prototype.__proto__ || Object.getPrototypeOf(literal_list.prototype), "results", this).list;
		}
	}]);

	return literal_list;
}(_RuleSyntax2.default.Expression));

// Parenthesized expression
//TESTME
_parser2.default.addExpression("parenthesized_expression", "\\({expression}\\)", function (_Rule$Expression2) {
	_inherits(parenthesized_expression, _Rule$Expression2);

	function parenthesized_expression() {
		_classCallCheck(this, parenthesized_expression);

		return _possibleConstructorReturn(this, (parenthesized_expression.__proto__ || Object.getPrototypeOf(parenthesized_expression)).apply(this, arguments));
	}

	_createClass(parenthesized_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var expression = this.results.toSource(context);
			// don't double parens if not necessary
			if (typeof expression === "string" && expression.startsWith("(") && expression.endsWith(")")) return expression;
			return "(" + expression + ")";
		}
	}, {
		key: "results",
		get: function get() {
			return this.matched[1];
		}
	}]);

	return parenthesized_expression;
}(_RuleSyntax2.default.Expression));

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

__webpack_require__(17);

__webpack_require__(11);

__webpack_require__(9);

__webpack_require__(12);

__webpack_require__(14);

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
/* 8 */,
/* 9 */
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

__webpack_require__(4);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for creating variables, property access, etc
//

// re-export parser for testing.
exports.default = _parser2.default;

//TESTME

_parser2.default.addStatement("if", "if {expression} (then|:)? {statement}?", function (_Rule$Statement) {
	_inherits(if_, _Rule$Statement);

	function if_() {
		_classCallCheck(this, if_);

		return _possibleConstructorReturn(this, (if_.__proto__ || Object.getPrototypeOf(if_)).apply(this, arguments));
	}

	_createClass(if_, [{
		key: "toSource",
		value: function toSource(context) {
			var _results = this.results,
			    expression = _results.expression,
			    statement = _results.statement;

			expression = expression.toSource(context);
			statement = statement ? statement.toSource(context) : undefined;

			if (statement) return "if (" + expression + ") { " + statement + " }";
			return "if (" + expression + ")";
		}
	}]);

	return if_;
}(_Rule2.default.Statement));

_parser2.default.addStatement("backwards_if", "{statement} if {expression} (elsePhrase:(else|otherwise) {statement})?", function (_Rule$Statement2) {
	_inherits(backwards_if, _Rule$Statement2);

	function backwards_if() {
		_classCallCheck(this, backwards_if);

		return _possibleConstructorReturn(this, (backwards_if.__proto__ || Object.getPrototypeOf(backwards_if)).apply(this, arguments));
	}

	_createClass(backwards_if, [{
		key: "toSource",
		value: function toSource(context) {
			var _results2 = this.results,
			    expression = _results2.expression,
			    statement = _results2.statement,
			    elsePhrase = _results2.elsePhrase;

			expression = expression.toSource(context);
			statement = statement ? statement.toSource(context) : undefined;
			var elseStatement = elsePhrase && elsePhrase.results.statement.toSource();

			if (elseStatement) return "if (" + expression + ") { " + statement + " } else { " + elseStatement + " }";
			return "if (" + expression + ") { " + statement + " }";
		}
	}]);

	return backwards_if;
}(_Rule2.default.Statement));

_parser2.default.addStatement("else_if", "(else|otherwise) if {expression} (then|:) {statement}?", function (_Rule$Statement3) {
	_inherits(else_if, _Rule$Statement3);

	function else_if() {
		_classCallCheck(this, else_if);

		return _possibleConstructorReturn(this, (else_if.__proto__ || Object.getPrototypeOf(else_if)).apply(this, arguments));
	}

	_createClass(else_if, [{
		key: "toSource",
		value: function toSource(context) {
			var _results3 = this.results,
			    expression = _results3.expression,
			    statement = _results3.statement;

			expression = expression.toSource(context);
			statement = statement ? statement.toSource(context) : undefined;

			if (statement) return "else if (" + expression + ") { " + statement + " }";
			return "else if (" + expression + ")";
		}
	}]);

	return else_if;
}(_Rule2.default.Statement));

_parser2.default.addStatement("else", "(else|otherwise) {statement}?", function (_Rule$Statement4) {
	_inherits(else_, _Rule$Statement4);

	function else_() {
		_classCallCheck(this, else_);

		return _possibleConstructorReturn(this, (else_.__proto__ || Object.getPrototypeOf(else_)).apply(this, arguments));
	}

	_createClass(else_, [{
		key: "toSource",
		value: function toSource(context) {
			var statement = this.results.statement;

			statement = statement ? statement.toSource(context) : undefined;

			if (statement) return "else { " + statement + " }";
			return "else";
		}
	}]);

	return else_;
}(_Rule2.default.Statement));

/***/ }),
/* 10 */,
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _RuleSyntax = __webpack_require__(1);

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

// NOTE: `precedence` numbers come from Javascript equivalents
//		 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence

var infix_operator = function (_Rule$Alternatives) {
	_inherits(infix_operator, _Rule$Alternatives);

	function infix_operator() {
		_classCallCheck(this, infix_operator);

		return _possibleConstructorReturn(this, (infix_operator.__proto__ || Object.getPrototypeOf(infix_operator)).apply(this, arguments));
	}

	return infix_operator;
}(_RuleSyntax2.default.Alternatives);

_parser2.default.addRule("infix_operator", new infix_operator());

_parser2.default.addKeyword("infix_operator", "and", function (_Rule$Keyword) {
	_inherits(and, _Rule$Keyword);

	function and() {
		var _ref;

		var _temp, _this2, _ret;

		_classCallCheck(this, and);

		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		return _ret = (_temp = (_this2 = _possibleConstructorReturn(this, (_ref = and.__proto__ || Object.getPrototypeOf(and)).call.apply(_ref, [this].concat(args))), _this2), _this2.precedence = 6, _temp), _possibleConstructorReturn(_this2, _ret);
	}

	_createClass(and, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " && " + b + ")";
		}
	}]);

	return and;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addKeyword("infix_operator", "or", function (_Rule$Keyword2) {
	_inherits(or, _Rule$Keyword2);

	function or() {
		var _ref2;

		var _temp2, _this3, _ret2;

		_classCallCheck(this, or);

		for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
			args[_key2] = arguments[_key2];
		}

		return _ret2 = (_temp2 = (_this3 = _possibleConstructorReturn(this, (_ref2 = or.__proto__ || Object.getPrototypeOf(or)).call.apply(_ref2, [this].concat(args))), _this3), _this3.precedence = 5, _temp2), _possibleConstructorReturn(_this3, _ret2);
	}

	_createClass(or, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " || " + b + ")";
		}
	}]);

	return or;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addKeyword("infix_operator", "is", function (_Rule$Keyword3) {
	_inherits(is, _Rule$Keyword3);

	function is() {
		var _ref3;

		var _temp3, _this4, _ret3;

		_classCallCheck(this, is);

		for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
			args[_key3] = arguments[_key3];
		}

		return _ret3 = (_temp3 = (_this4 = _possibleConstructorReturn(this, (_ref3 = is.__proto__ || Object.getPrototypeOf(is)).call.apply(_ref3, [this].concat(args))), _this4), _this4.precedence = 10, _temp3), _possibleConstructorReturn(_this4, _ret3);
	}

	_createClass(is, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " == " + b + ")";
		}
	}]);

	return is;
}(_RuleSyntax2.default.Keyword));
_parser2.default.addKeyword("infix_operator", "is not", function (_Rule$Keyword4) {
	_inherits(is_not, _Rule$Keyword4);

	function is_not() {
		var _ref4;

		var _temp4, _this5, _ret4;

		_classCallCheck(this, is_not);

		for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
			args[_key4] = arguments[_key4];
		}

		return _ret4 = (_temp4 = (_this5 = _possibleConstructorReturn(this, (_ref4 = is_not.__proto__ || Object.getPrototypeOf(is_not)).call.apply(_ref4, [this].concat(args))), _this5), _this5.precedence = 10, _temp4), _possibleConstructorReturn(_this5, _ret4);
	}

	_createClass(is_not, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " != " + b + ")";
		}
	}]);

	return is_not;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addKeyword("infix_operator", "is exactly", function (_Rule$Keyword5) {
	_inherits(is_exactly, _Rule$Keyword5);

	function is_exactly() {
		var _ref5;

		var _temp5, _this6, _ret5;

		_classCallCheck(this, is_exactly);

		for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
			args[_key5] = arguments[_key5];
		}

		return _ret5 = (_temp5 = (_this6 = _possibleConstructorReturn(this, (_ref5 = is_exactly.__proto__ || Object.getPrototypeOf(is_exactly)).call.apply(_ref5, [this].concat(args))), _this6), _this6.precedence = 10, _temp5), _possibleConstructorReturn(_this6, _ret5);
	}

	_createClass(is_exactly, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " === " + b + ")";
		}
	}]);

	return is_exactly;
}(_RuleSyntax2.default.Keyword));
_parser2.default.addKeyword("infix_operator", "is not exactly", function (_Rule$Keyword6) {
	_inherits(_class7, _Rule$Keyword6);

	function _class7() {
		var _ref6;

		var _temp6, _this7, _ret6;

		_classCallCheck(this, _class7);

		for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
			args[_key6] = arguments[_key6];
		}

		return _ret6 = (_temp6 = (_this7 = _possibleConstructorReturn(this, (_ref6 = _class7.__proto__ || Object.getPrototypeOf(_class7)).call.apply(_ref6, [this].concat(args))), _this7), _this7.precedence = 10, _temp6), _possibleConstructorReturn(_this7, _ret6);
	}

	_createClass(_class7, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " !== " + b + ")";
		}
	}]);

	return _class7;
}(_RuleSyntax2.default.Keyword));

//TODO: `spell.isOfType(thing, type)`
//TODO: `is same type as` ?
_parser2.default.addKeyword("infix_operator", "is a", function (_Rule$Keyword7) {
	_inherits(is_a, _Rule$Keyword7);

	function is_a() {
		var _ref7;

		var _temp7, _this8, _ret7;

		_classCallCheck(this, is_a);

		for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
			args[_key7] = arguments[_key7];
		}

		return _ret7 = (_temp7 = (_this8 = _possibleConstructorReturn(this, (_ref7 = is_a.__proto__ || Object.getPrototypeOf(is_a)).call.apply(_ref7, [this].concat(args))), _this8), _this8.precedence = 11, _temp7), _possibleConstructorReturn(_this8, _ret7);
	}

	_createClass(is_a, [{
		key: "toJS",
		value: function toJS(thing, type) {
			return "spell.isOfType(" + thing + ", '" + type + "')";
		}
	}]);

	return is_a;
}(_RuleSyntax2.default.Keyword));
_parser2.default.addKeyword("infix_operator", "is an", function (_Rule$Keyword8) {
	_inherits(is_an, _Rule$Keyword8);

	function is_an() {
		var _ref8;

		var _temp8, _this9, _ret8;

		_classCallCheck(this, is_an);

		for (var _len8 = arguments.length, args = Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
			args[_key8] = arguments[_key8];
		}

		return _ret8 = (_temp8 = (_this9 = _possibleConstructorReturn(this, (_ref8 = is_an.__proto__ || Object.getPrototypeOf(is_an)).call.apply(_ref8, [this].concat(args))), _this9), _this9.precedence = 11, _temp8), _possibleConstructorReturn(_this9, _ret8);
	}

	_createClass(is_an, [{
		key: "toJS",
		value: function toJS(thing, type) {
			return "spell.isOfType(" + thing + ", '" + type + "')";
		}
	}]);

	return is_an;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addKeyword("infix_operator", "is not a", function (_Rule$Keyword9) {
	_inherits(is_not_a, _Rule$Keyword9);

	function is_not_a() {
		var _ref9;

		var _temp9, _this10, _ret9;

		_classCallCheck(this, is_not_a);

		for (var _len9 = arguments.length, args = Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
			args[_key9] = arguments[_key9];
		}

		return _ret9 = (_temp9 = (_this10 = _possibleConstructorReturn(this, (_ref9 = is_not_a.__proto__ || Object.getPrototypeOf(is_not_a)).call.apply(_ref9, [this].concat(args))), _this10), _this10.precedence = 11, _temp9), _possibleConstructorReturn(_this10, _ret9);
	}

	_createClass(is_not_a, [{
		key: "toJS",
		value: function toJS(thing, type) {
			return "!spell.isOfType(" + thing + ", '" + type + "')";
		}
	}]);

	return is_not_a;
}(_RuleSyntax2.default.Keyword));
_parser2.default.addKeyword("infix_operator", "is not an", function (_Rule$Keyword10) {
	_inherits(is_not_an, _Rule$Keyword10);

	function is_not_an() {
		var _ref10;

		var _temp10, _this11, _ret10;

		_classCallCheck(this, is_not_an);

		for (var _len10 = arguments.length, args = Array(_len10), _key10 = 0; _key10 < _len10; _key10++) {
			args[_key10] = arguments[_key10];
		}

		return _ret10 = (_temp10 = (_this11 = _possibleConstructorReturn(this, (_ref10 = is_not_an.__proto__ || Object.getPrototypeOf(is_not_an)).call.apply(_ref10, [this].concat(args))), _this11), _this11.precedence = 11, _temp10), _possibleConstructorReturn(_this11, _ret10);
	}

	_createClass(is_not_an, [{
		key: "toJS",
		value: function toJS(thing, type) {
			return "!spell.isOfType(" + thing + ", '" + type + "')";
		}
	}]);

	return is_not_an;
}(_RuleSyntax2.default.Keyword));

//TODO: `spell.contains(collection, thing)`
_parser2.default.addKeyword("infix_operator", "is in", function (_Rule$Keyword11) {
	_inherits(is_in, _Rule$Keyword11);

	function is_in() {
		var _ref11;

		var _temp11, _this12, _ret11;

		_classCallCheck(this, is_in);

		for (var _len11 = arguments.length, args = Array(_len11), _key11 = 0; _key11 < _len11; _key11++) {
			args[_key11] = arguments[_key11];
		}

		return _ret11 = (_temp11 = (_this12 = _possibleConstructorReturn(this, (_ref11 = is_in.__proto__ || Object.getPrototypeOf(is_in)).call.apply(_ref11, [this].concat(args))), _this12), _this12.precedence = 11, _temp11), _possibleConstructorReturn(_this12, _ret11);
	}

	_createClass(is_in, [{
		key: "toJS",
		value: function toJS(thing, list) {
			return list + ".includes(" + thing + ")";
		}
	}]);

	return is_in;
}(_RuleSyntax2.default.Keyword));
_parser2.default.addKeyword("infix_operator", "is one of", function (_Rule$Keyword12) {
	_inherits(is_one_of, _Rule$Keyword12);

	function is_one_of() {
		var _ref12;

		var _temp12, _this13, _ret12;

		_classCallCheck(this, is_one_of);

		for (var _len12 = arguments.length, args = Array(_len12), _key12 = 0; _key12 < _len12; _key12++) {
			args[_key12] = arguments[_key12];
		}

		return _ret12 = (_temp12 = (_this13 = _possibleConstructorReturn(this, (_ref12 = is_one_of.__proto__ || Object.getPrototypeOf(is_one_of)).call.apply(_ref12, [this].concat(args))), _this13), _this13.precedence = 11, _temp12), _possibleConstructorReturn(_this13, _ret12);
	}

	_createClass(is_one_of, [{
		key: "toJS",
		value: function toJS(thing, list) {
			return list + ".includes(" + thing + ")";
		}
	}]);

	return is_one_of;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addKeyword("infix_operator", "is not in", function (_Rule$Keyword13) {
	_inherits(is_not_in, _Rule$Keyword13);

	function is_not_in() {
		var _ref13;

		var _temp13, _this14, _ret13;

		_classCallCheck(this, is_not_in);

		for (var _len13 = arguments.length, args = Array(_len13), _key13 = 0; _key13 < _len13; _key13++) {
			args[_key13] = arguments[_key13];
		}

		return _ret13 = (_temp13 = (_this14 = _possibleConstructorReturn(this, (_ref13 = is_not_in.__proto__ || Object.getPrototypeOf(is_not_in)).call.apply(_ref13, [this].concat(args))), _this14), _this14.precedence = 11, _temp13), _possibleConstructorReturn(_this14, _ret13);
	}

	_createClass(is_not_in, [{
		key: "toJS",
		value: function toJS(thing, list) {
			return "!" + list + ".includes(" + thing + ")";
		}
	}]);

	return is_not_in;
}(_RuleSyntax2.default.Keyword));
_parser2.default.addKeyword("infix_operator", "is not one of", function (_Rule$Keyword14) {
	_inherits(is_not_one_of, _Rule$Keyword14);

	function is_not_one_of() {
		var _ref14;

		var _temp14, _this15, _ret14;

		_classCallCheck(this, is_not_one_of);

		for (var _len14 = arguments.length, args = Array(_len14), _key14 = 0; _key14 < _len14; _key14++) {
			args[_key14] = arguments[_key14];
		}

		return _ret14 = (_temp14 = (_this15 = _possibleConstructorReturn(this, (_ref14 = is_not_one_of.__proto__ || Object.getPrototypeOf(is_not_one_of)).call.apply(_ref14, [this].concat(args))), _this15), _this15.precedence = 11, _temp14), _possibleConstructorReturn(_this15, _ret14);
	}

	_createClass(is_not_one_of, [{
		key: "toJS",
		value: function toJS(thing, list) {
			return "!" + list + ".includes(" + thing + ")";
		}
	}]);

	return is_not_one_of;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addKeyword("infix_operator", "includes", function (_Rule$Keyword15) {
	_inherits(includes, _Rule$Keyword15);

	function includes() {
		var _ref15;

		var _temp15, _this16, _ret15;

		_classCallCheck(this, includes);

		for (var _len15 = arguments.length, args = Array(_len15), _key15 = 0; _key15 < _len15; _key15++) {
			args[_key15] = arguments[_key15];
		}

		return _ret15 = (_temp15 = (_this16 = _possibleConstructorReturn(this, (_ref15 = includes.__proto__ || Object.getPrototypeOf(includes)).call.apply(_ref15, [this].concat(args))), _this16), _this16.precedence = 11, _temp15), _possibleConstructorReturn(_this16, _ret15);
	}

	_createClass(includes, [{
		key: "toJS",
		value: function toJS(list, thing) {
			return list + ".includes(" + thing + ")";
		}
	}]);

	return includes;
}(_RuleSyntax2.default.Keyword));
_parser2.default.addKeyword("infix_operator", "contains", function (_Rule$Keyword16) {
	_inherits(contains, _Rule$Keyword16);

	function contains() {
		var _ref16;

		var _temp16, _this17, _ret16;

		_classCallCheck(this, contains);

		for (var _len16 = arguments.length, args = Array(_len16), _key16 = 0; _key16 < _len16; _key16++) {
			args[_key16] = arguments[_key16];
		}

		return _ret16 = (_temp16 = (_this17 = _possibleConstructorReturn(this, (_ref16 = contains.__proto__ || Object.getPrototypeOf(contains)).call.apply(_ref16, [this].concat(args))), _this17), _this17.precedence = 11, _temp16), _possibleConstructorReturn(_this17, _ret16);
	}

	_createClass(contains, [{
		key: "toJS",
		value: function toJS(list, thing) {
			return list + ".includes(" + thing + ")";
		}
	}]);

	return contains;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addKeyword("infix_operator", "does not include", function (_Rule$Keyword17) {
	_inherits(does_not_include, _Rule$Keyword17);

	function does_not_include() {
		var _ref17;

		var _temp17, _this18, _ret17;

		_classCallCheck(this, does_not_include);

		for (var _len17 = arguments.length, args = Array(_len17), _key17 = 0; _key17 < _len17; _key17++) {
			args[_key17] = arguments[_key17];
		}

		return _ret17 = (_temp17 = (_this18 = _possibleConstructorReturn(this, (_ref17 = does_not_include.__proto__ || Object.getPrototypeOf(does_not_include)).call.apply(_ref17, [this].concat(args))), _this18), _this18.precedence = 11, _temp17), _possibleConstructorReturn(_this18, _ret17);
	}

	_createClass(does_not_include, [{
		key: "toJS",
		value: function toJS(list, thing) {
			return "!" + list + ".includes(" + thing + ")";
		}
	}]);

	return does_not_include;
}(_RuleSyntax2.default.Keyword));
_parser2.default.addKeyword("infix_operator", "does not contain", function (_Rule$Keyword18) {
	_inherits(does_not_contain, _Rule$Keyword18);

	function does_not_contain() {
		var _ref18;

		var _temp18, _this19, _ret18;

		_classCallCheck(this, does_not_contain);

		for (var _len18 = arguments.length, args = Array(_len18), _key18 = 0; _key18 < _len18; _key18++) {
			args[_key18] = arguments[_key18];
		}

		return _ret18 = (_temp18 = (_this19 = _possibleConstructorReturn(this, (_ref18 = does_not_contain.__proto__ || Object.getPrototypeOf(does_not_contain)).call.apply(_ref18, [this].concat(args))), _this19), _this19.precedence = 11, _temp18), _possibleConstructorReturn(_this19, _ret18);
	}

	_createClass(does_not_contain, [{
		key: "toJS",
		value: function toJS(list, thing) {
			return "!" + list + ".includes(" + thing + ")";
		}
	}]);

	return does_not_contain;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addSymbol("infix_operator", ">", function (_Rule$Symbol) {
	_inherits(gt, _Rule$Symbol);

	function gt() {
		var _ref19;

		var _temp19, _this20, _ret19;

		_classCallCheck(this, gt);

		for (var _len19 = arguments.length, args = Array(_len19), _key19 = 0; _key19 < _len19; _key19++) {
			args[_key19] = arguments[_key19];
		}

		return _ret19 = (_temp19 = (_this20 = _possibleConstructorReturn(this, (_ref19 = gt.__proto__ || Object.getPrototypeOf(gt)).call.apply(_ref19, [this].concat(args))), _this20), _this20.precedence = 11, _temp19), _possibleConstructorReturn(_this20, _ret19);
	}

	_createClass(gt, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " > " + b + ")";
		}
	}]);

	return gt;
}(_RuleSyntax2.default.Symbol));
_parser2.default.addKeyword("infix_operator", "is greater than", function (_Rule$Keyword19) {
	_inherits(is_greater_than, _Rule$Keyword19);

	function is_greater_than() {
		var _ref20;

		var _temp20, _this21, _ret20;

		_classCallCheck(this, is_greater_than);

		for (var _len20 = arguments.length, args = Array(_len20), _key20 = 0; _key20 < _len20; _key20++) {
			args[_key20] = arguments[_key20];
		}

		return _ret20 = (_temp20 = (_this21 = _possibleConstructorReturn(this, (_ref20 = is_greater_than.__proto__ || Object.getPrototypeOf(is_greater_than)).call.apply(_ref20, [this].concat(args))), _this21), _this21.precedence = 11, _temp20), _possibleConstructorReturn(_this21, _ret20);
	}

	_createClass(is_greater_than, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " > " + b + ")";
		}
	}]);

	return is_greater_than;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addSymbol("infix_operator", ">=", function (_Rule$Symbol2) {
	_inherits(gte, _Rule$Symbol2);

	function gte() {
		var _ref21;

		var _temp21, _this22, _ret21;

		_classCallCheck(this, gte);

		for (var _len21 = arguments.length, args = Array(_len21), _key21 = 0; _key21 < _len21; _key21++) {
			args[_key21] = arguments[_key21];
		}

		return _ret21 = (_temp21 = (_this22 = _possibleConstructorReturn(this, (_ref21 = gte.__proto__ || Object.getPrototypeOf(gte)).call.apply(_ref21, [this].concat(args))), _this22), _this22.precedence = 11, _temp21), _possibleConstructorReturn(_this22, _ret21);
	}

	_createClass(gte, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " >= " + b + ")";
		}
	}]);

	return gte;
}(_RuleSyntax2.default.Symbol));
_parser2.default.addKeyword("infix_operator", "is greater than or equal to", function (_Rule$Keyword20) {
	_inherits(is_gte, _Rule$Keyword20);

	function is_gte() {
		var _ref22;

		var _temp22, _this23, _ret22;

		_classCallCheck(this, is_gte);

		for (var _len22 = arguments.length, args = Array(_len22), _key22 = 0; _key22 < _len22; _key22++) {
			args[_key22] = arguments[_key22];
		}

		return _ret22 = (_temp22 = (_this23 = _possibleConstructorReturn(this, (_ref22 = is_gte.__proto__ || Object.getPrototypeOf(is_gte)).call.apply(_ref22, [this].concat(args))), _this23), _this23.precedence = 11, _temp22), _possibleConstructorReturn(_this23, _ret22);
	}

	_createClass(is_gte, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " >= " + b + ")";
		}
	}]);

	return is_gte;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addSymbol("infix_operator", "<", function (_Rule$Symbol3) {
	_inherits(lt, _Rule$Symbol3);

	function lt() {
		var _ref23;

		var _temp23, _this24, _ret23;

		_classCallCheck(this, lt);

		for (var _len23 = arguments.length, args = Array(_len23), _key23 = 0; _key23 < _len23; _key23++) {
			args[_key23] = arguments[_key23];
		}

		return _ret23 = (_temp23 = (_this24 = _possibleConstructorReturn(this, (_ref23 = lt.__proto__ || Object.getPrototypeOf(lt)).call.apply(_ref23, [this].concat(args))), _this24), _this24.precedence = 11, _temp23), _possibleConstructorReturn(_this24, _ret23);
	}

	_createClass(lt, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " < " + b + ")";
		}
	}]);

	return lt;
}(_RuleSyntax2.default.Symbol));
_parser2.default.addKeyword("infix_operator", "is less than", function (_Rule$Keyword21) {
	_inherits(is_less_than, _Rule$Keyword21);

	function is_less_than() {
		var _ref24;

		var _temp24, _this25, _ret24;

		_classCallCheck(this, is_less_than);

		for (var _len24 = arguments.length, args = Array(_len24), _key24 = 0; _key24 < _len24; _key24++) {
			args[_key24] = arguments[_key24];
		}

		return _ret24 = (_temp24 = (_this25 = _possibleConstructorReturn(this, (_ref24 = is_less_than.__proto__ || Object.getPrototypeOf(is_less_than)).call.apply(_ref24, [this].concat(args))), _this25), _this25.precedence = 11, _temp24), _possibleConstructorReturn(_this25, _ret24);
	}

	_createClass(is_less_than, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " < " + b + ")";
		}
	}]);

	return is_less_than;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addSymbol("infix_operator", "<=", function (_Rule$Symbol4) {
	_inherits(lte, _Rule$Symbol4);

	function lte() {
		var _ref25;

		var _temp25, _this26, _ret25;

		_classCallCheck(this, lte);

		for (var _len25 = arguments.length, args = Array(_len25), _key25 = 0; _key25 < _len25; _key25++) {
			args[_key25] = arguments[_key25];
		}

		return _ret25 = (_temp25 = (_this26 = _possibleConstructorReturn(this, (_ref25 = lte.__proto__ || Object.getPrototypeOf(lte)).call.apply(_ref25, [this].concat(args))), _this26), _this26.precedence = 11, _temp25), _possibleConstructorReturn(_this26, _ret25);
	}

	_createClass(lte, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " <= " + b + ")";
		}
	}]);

	return lte;
}(_RuleSyntax2.default.Symbol));
_parser2.default.addKeyword("infix_operator", "is less than or equal to", function (_Rule$Keyword22) {
	_inherits(is_lte, _Rule$Keyword22);

	function is_lte() {
		var _ref26;

		var _temp26, _this27, _ret26;

		_classCallCheck(this, is_lte);

		for (var _len26 = arguments.length, args = Array(_len26), _key26 = 0; _key26 < _len26; _key26++) {
			args[_key26] = arguments[_key26];
		}

		return _ret26 = (_temp26 = (_this27 = _possibleConstructorReturn(this, (_ref26 = is_lte.__proto__ || Object.getPrototypeOf(is_lte)).call.apply(_ref26, [this].concat(args))), _this27), _this27.precedence = 11, _temp26), _possibleConstructorReturn(_this27, _ret26);
	}

	_createClass(is_lte, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " <= " + b + ")";
		}
	}]);

	return is_lte;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addSymbol("infix_operator", "\\+", function (_Rule$Symbol5) {
	_inherits(plus, _Rule$Symbol5);

	function plus() {
		var _ref27;

		var _temp27, _this28, _ret27;

		_classCallCheck(this, plus);

		for (var _len27 = arguments.length, args = Array(_len27), _key27 = 0; _key27 < _len27; _key27++) {
			args[_key27] = arguments[_key27];
		}

		return _ret27 = (_temp27 = (_this28 = _possibleConstructorReturn(this, (_ref27 = plus.__proto__ || Object.getPrototypeOf(plus)).call.apply(_ref27, [this].concat(args))), _this28), _this28.precedence = 13, _temp27), _possibleConstructorReturn(_this28, _ret27);
	}

	_createClass(plus, [{
		key: "toJS",
		value: function toJS(a, b) {
			return a + " + " + b;
		}
	}]);

	return plus;
}(_RuleSyntax2.default.Symbol));
_parser2.default.addKeyword("infix_operator", "plus", function (_Rule$Keyword23) {
	_inherits(plus, _Rule$Keyword23);

	function plus() {
		var _ref28;

		var _temp28, _this29, _ret28;

		_classCallCheck(this, plus);

		for (var _len28 = arguments.length, args = Array(_len28), _key28 = 0; _key28 < _len28; _key28++) {
			args[_key28] = arguments[_key28];
		}

		return _ret28 = (_temp28 = (_this29 = _possibleConstructorReturn(this, (_ref28 = plus.__proto__ || Object.getPrototypeOf(plus)).call.apply(_ref28, [this].concat(args))), _this29), _this29.precedence = 13, _temp28), _possibleConstructorReturn(_this29, _ret28);
	}

	_createClass(plus, [{
		key: "toJS",
		value: function toJS(a, b) {
			return a + " + " + b;
		}
	}]);

	return plus;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addSymbol("infix_operator", "-", function (_Rule$Symbol6) {
	_inherits(minus, _Rule$Symbol6);

	function minus() {
		var _ref29;

		var _temp29, _this30, _ret29;

		_classCallCheck(this, minus);

		for (var _len29 = arguments.length, args = Array(_len29), _key29 = 0; _key29 < _len29; _key29++) {
			args[_key29] = arguments[_key29];
		}

		return _ret29 = (_temp29 = (_this30 = _possibleConstructorReturn(this, (_ref29 = minus.__proto__ || Object.getPrototypeOf(minus)).call.apply(_ref29, [this].concat(args))), _this30), _this30.precedence = 13, _temp29), _possibleConstructorReturn(_this30, _ret29);
	}

	_createClass(minus, [{
		key: "toJS",
		value: function toJS(a, b) {
			return a + " - " + b;
		}
	}]);

	return minus;
}(_RuleSyntax2.default.Symbol));
_parser2.default.addKeyword("infix_operator", "minus", function (_Rule$Keyword24) {
	_inherits(minus, _Rule$Keyword24);

	function minus() {
		var _ref30;

		var _temp30, _this31, _ret30;

		_classCallCheck(this, minus);

		for (var _len30 = arguments.length, args = Array(_len30), _key30 = 0; _key30 < _len30; _key30++) {
			args[_key30] = arguments[_key30];
		}

		return _ret30 = (_temp30 = (_this31 = _possibleConstructorReturn(this, (_ref30 = minus.__proto__ || Object.getPrototypeOf(minus)).call.apply(_ref30, [this].concat(args))), _this31), _this31.precedence = 13, _temp30), _possibleConstructorReturn(_this31, _ret30);
	}

	_createClass(minus, [{
		key: "toJS",
		value: function toJS(a, b) {
			return a + " - " + b;
		}
	}]);

	return minus;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addSymbol("infix_operator", "\\*", function (_Rule$Symbol7) {
	_inherits(times, _Rule$Symbol7);

	function times() {
		var _ref31;

		var _temp31, _this32, _ret31;

		_classCallCheck(this, times);

		for (var _len31 = arguments.length, args = Array(_len31), _key31 = 0; _key31 < _len31; _key31++) {
			args[_key31] = arguments[_key31];
		}

		return _ret31 = (_temp31 = (_this32 = _possibleConstructorReturn(this, (_ref31 = times.__proto__ || Object.getPrototypeOf(times)).call.apply(_ref31, [this].concat(args))), _this32), _this32.precedence = 14, _temp31), _possibleConstructorReturn(_this32, _ret31);
	}

	_createClass(times, [{
		key: "toJS",
		value: function toJS(a, b) {
			return a + " * " + b;
		}
	}]);

	return times;
}(_RuleSyntax2.default.Symbol));
_parser2.default.addKeyword("infix_operator", "times", function (_Rule$Keyword25) {
	_inherits(times, _Rule$Keyword25);

	function times() {
		var _ref32;

		var _temp32, _this33, _ret32;

		_classCallCheck(this, times);

		for (var _len32 = arguments.length, args = Array(_len32), _key32 = 0; _key32 < _len32; _key32++) {
			args[_key32] = arguments[_key32];
		}

		return _ret32 = (_temp32 = (_this33 = _possibleConstructorReturn(this, (_ref32 = times.__proto__ || Object.getPrototypeOf(times)).call.apply(_ref32, [this].concat(args))), _this33), _this33.precedence = 14, _temp32), _possibleConstructorReturn(_this33, _ret32);
	}

	_createClass(times, [{
		key: "toJS",
		value: function toJS(a, b) {
			return a + " * " + b;
		}
	}]);

	return times;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addSymbol("infix_operator", "/", function (_Rule$Symbol8) {
	_inherits(divided_by, _Rule$Symbol8);

	function divided_by() {
		var _ref33;

		var _temp33, _this34, _ret33;

		_classCallCheck(this, divided_by);

		for (var _len33 = arguments.length, args = Array(_len33), _key33 = 0; _key33 < _len33; _key33++) {
			args[_key33] = arguments[_key33];
		}

		return _ret33 = (_temp33 = (_this34 = _possibleConstructorReturn(this, (_ref33 = divided_by.__proto__ || Object.getPrototypeOf(divided_by)).call.apply(_ref33, [this].concat(args))), _this34), _this34.precedence = 14, _temp33), _possibleConstructorReturn(_this34, _ret33);
	}

	_createClass(divided_by, [{
		key: "toJS",
		value: function toJS(a, b) {
			return a + " / " + b;
		}
	}]);

	return divided_by;
}(_RuleSyntax2.default.Symbol));
_parser2.default.addKeyword("infix_operator", "divided by", function (_Rule$Keyword26) {
	_inherits(divided_by, _Rule$Keyword26);

	function divided_by() {
		var _ref34;

		var _temp34, _this35, _ret34;

		_classCallCheck(this, divided_by);

		for (var _len34 = arguments.length, args = Array(_len34), _key34 = 0; _key34 < _len34; _key34++) {
			args[_key34] = arguments[_key34];
		}

		return _ret34 = (_temp34 = (_this35 = _possibleConstructorReturn(this, (_ref34 = divided_by.__proto__ || Object.getPrototypeOf(divided_by)).call.apply(_ref34, [this].concat(args))), _this35), _this35.precedence = 14, _temp34), _possibleConstructorReturn(_this35, _ret34);
	}

	_createClass(divided_by, [{
		key: "toJS",
		value: function toJS(a, b) {
			return a + " / " + b;
		}
	}]);

	return divided_by;
}(_RuleSyntax2.default.Keyword));

//TODO:  `+=` etc?  other math functions?

_parser2.default.addExpression("infix_operator_expression", "{lhs:expression} {operator:infix_operator} {rhs:expression}", function (_Rule$Expression) {
	_inherits(infix_operator_expression, _Rule$Expression);

	function infix_operator_expression() {
		var _ref35;

		var _temp35, _this36, _ret35;

		_classCallCheck(this, infix_operator_expression);

		for (var _len35 = arguments.length, args = Array(_len35), _key35 = 0; _key35 < _len35; _key35++) {
			args[_key35] = arguments[_key35];
		}

		return _ret35 = (_temp35 = (_this36 = _possibleConstructorReturn(this, (_ref35 = infix_operator_expression.__proto__ || Object.getPrototypeOf(infix_operator_expression)).call.apply(_ref35, [this].concat(args))), _this36), _this36.testRule = "infix_operator", _temp35), _possibleConstructorReturn(_this36, _ret35);
	}
	// We CANNOT match if `infix_operator` isn't found in the expression.


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

_parser2.default.addKeyword("postfix_operator", "is defined", function (_Rule$Keyword27) {
	_inherits(is_defined, _Rule$Keyword27);

	function is_defined() {
		_classCallCheck(this, is_defined);

		return _possibleConstructorReturn(this, (is_defined.__proto__ || Object.getPrototypeOf(is_defined)).apply(this, arguments));
	}

	_createClass(is_defined, [{
		key: "toJS",
		value: function toJS(thing) {
			return "(typeof " + thing + " !== 'undefined')";
		}
	}]);

	return is_defined;
}(_RuleSyntax2.default.Keyword));
_parser2.default.addKeyword("postfix_operator", "is not defined", function (_Rule$Keyword28) {
	_inherits(is_not_defined, _Rule$Keyword28);

	function is_not_defined() {
		_classCallCheck(this, is_not_defined);

		return _possibleConstructorReturn(this, (is_not_defined.__proto__ || Object.getPrototypeOf(is_not_defined)).apply(this, arguments));
	}

	_createClass(is_not_defined, [{
		key: "toJS",
		value: function toJS(thing) {
			return "(typeof " + thing + " === 'undefined')";
		}
	}]);

	return is_not_defined;
}(_RuleSyntax2.default.Keyword));
_parser2.default.addKeyword("postfix_operator", "is undefined", function (_Rule$Keyword29) {
	_inherits(is_undefined, _Rule$Keyword29);

	function is_undefined() {
		_classCallCheck(this, is_undefined);

		return _possibleConstructorReturn(this, (is_undefined.__proto__ || Object.getPrototypeOf(is_undefined)).apply(this, arguments));
	}

	_createClass(is_undefined, [{
		key: "toJS",
		value: function toJS(thing) {
			return "(typeof " + thing + " === 'undefined')";
		}
	}]);

	return is_undefined;
}(_RuleSyntax2.default.Keyword));

//TODO: `spell.isEmpty(thing)`
_parser2.default.addKeyword("postfix_operator", "is empty", function (_Rule$Keyword30) {
	_inherits(is_empty, _Rule$Keyword30);

	function is_empty() {
		_classCallCheck(this, is_empty);

		return _possibleConstructorReturn(this, (is_empty.__proto__ || Object.getPrototypeOf(is_empty)).apply(this, arguments));
	}

	_createClass(is_empty, [{
		key: "toJS",
		value: function toJS(thing) {
			return "spell.isEmpty(" + thing + ")";
		}
	}]);

	return is_empty;
}(_RuleSyntax2.default.Keyword));
_parser2.default.addKeyword("postfix_operator", "is not empty", function (_Rule$Keyword31) {
	_inherits(is_not_empty, _Rule$Keyword31);

	function is_not_empty() {
		_classCallCheck(this, is_not_empty);

		return _possibleConstructorReturn(this, (is_not_empty.__proto__ || Object.getPrototypeOf(is_not_empty)).apply(this, arguments));
	}

	_createClass(is_not_empty, [{
		key: "toJS",
		value: function toJS(thing) {
			return "!spell.isEmpty(" + thing + ")";
		}
	}]);

	return is_not_empty;
}(_RuleSyntax2.default.Keyword));

_parser2.default.addExpression("postfix_operator_expression", "{expression} {operator:postfix_operator}", function (_Rule$Expression2) {
	_inherits(postfix_operator_expresion, _Rule$Expression2);

	function postfix_operator_expresion() {
		var _ref36;

		var _temp36, _this42, _ret36;

		_classCallCheck(this, postfix_operator_expresion);

		for (var _len36 = arguments.length, args = Array(_len36), _key36 = 0; _key36 < _len36; _key36++) {
			args[_key36] = arguments[_key36];
		}

		return _ret36 = (_temp36 = (_this42 = _possibleConstructorReturn(this, (_ref36 = postfix_operator_expresion.__proto__ || Object.getPrototypeOf(postfix_operator_expresion)).call.apply(_ref36, [this].concat(args))), _this42), _this42.testRule = "postfix_operator", _temp36), _possibleConstructorReturn(_this42, _ret36);
	}
	// We CANNOT match if `postfix_operator` isn't found in the expression.


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

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _RuleSyntax = __webpack_require__(1);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(4);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for creating variables, property access, etc
//

// re-export parser for testing.
exports.default = _parser2.default;

//
//	## Returns
//

// Return a value
//TESTME

_parser2.default.addStatement("return_statement", "return {expression}", function (_Rule$Statement) {
	_inherits(return_statement, _Rule$Statement);

	function return_statement() {
		_classCallCheck(this, return_statement);

		return _possibleConstructorReturn(this, (return_statement.__proto__ || Object.getPrototypeOf(return_statement)).apply(this, arguments));
	}

	_createClass(return_statement, [{
		key: "toSource",
		value: function toSource(context) {
			var expression = this.results.expression;

			return "return " + expression.toSource(context);
		}
	}]);

	return return_statement;
}(_RuleSyntax2.default.Statement));

//
//	## Assignment
//

var assignment = function (_Rule$Statement2) {
	_inherits(assignment, _Rule$Statement2);

	function assignment() {
		_classCallCheck(this, assignment);

		return _possibleConstructorReturn(this, (assignment.__proto__ || Object.getPrototypeOf(assignment)).apply(this, arguments));
	}

	_createClass(assignment, [{
		key: "toSource",
		value: function toSource(context) {
			var _results = this.results,
			    thing = _results.thing,
			    value = _results.value;

			if (thing instanceof _RuleSyntax2.default.Identifier) {
				// TODO: declare identifier if not in scope, etc
			}

			return thing.toSource(context) + " = " + value.toSource(context);
		}
	}]);

	return assignment;
}(_RuleSyntax2.default.Statement);

//TESTME


_parser2.default.addStatement("assignment", "{thing:expression} = {value:expression}", assignment);
//TESTME
_parser2.default.addStatement("assignment", "set {thing:expression} to {value:expression}", assignment);
//TESTME
_parser2.default.addStatement("assignment", "put {value:expression} into {thing:expression}", assignment);

//
//	## User interaction
//

// Alert a message.
// TODO: need some fancy promise juju here?
//TESTME
_parser2.default.addStatement("alert", "alert {message:expression} (buttonClause:with {text})?", function (_Rule$Statement3) {
	_inherits(alert, _Rule$Statement3);

	function alert() {
		_classCallCheck(this, alert);

		return _possibleConstructorReturn(this, (alert.__proto__ || Object.getPrototypeOf(alert)).apply(this, arguments));
	}

	_createClass(alert, [{
		key: "toSource",
		value: function toSource(context) {
			var _results2 = this.results,
			    message = _results2.message,
			    buttonClause = _results2.buttonClause;

			message = message.toSource(context);
			var buttonName = buttonClause ? buttonClause.results.text.toSource(context) : '"OK"';
			return "await spell.alert(" + message + ", " + buttonName + ")";
		}
	}]);

	return alert;
}(_RuleSyntax2.default.Statement));

// Warning message -- like alert but fancier.
// TODO: need some fancy promise juju here?
//TESTME
_parser2.default.addStatement("warn", "warn {expression:expression} (buttonClause:with {text})?", function (_Rule$Statement4) {
	_inherits(warn, _Rule$Statement4);

	function warn() {
		_classCallCheck(this, warn);

		return _possibleConstructorReturn(this, (warn.__proto__ || Object.getPrototypeOf(warn)).apply(this, arguments));
	}

	_createClass(warn, [{
		key: "toSource",
		value: function toSource(context) {
			var _results3 = this.results,
			    message = _results3.message,
			    buttonClause = _results3.buttonClause;

			message = message.toSource(context);
			var buttonName = buttonClause ? buttonClause.results.text.toSource(context) : '"OK"';
			return "await spell.warn(" + message + ", " + buttonName + ")";
		}
	}]);

	return warn;
}(_RuleSyntax2.default.Statement));

// Confirm message -- present a question with two answers.
// TODO: need some fancy promise juju here?
//TESTME
_parser2.default.addStatement("confirm", "confirm {message:expression} (buttonClause:with {okButton:text} (cancelClause: (and|or) {cancelButton:text})? )?", function (_Rule$Statement5) {
	_inherits(confirm, _Rule$Statement5);

	function confirm() {
		_classCallCheck(this, confirm);

		return _possibleConstructorReturn(this, (confirm.__proto__ || Object.getPrototypeOf(confirm)).apply(this, arguments));
	}

	_createClass(confirm, [{
		key: "toSource",
		value: function toSource(context) {
			var _results4 = this.results,
			    message = _results4.message,
			    buttonClause = _results4.buttonClause;

			message = message.toSource(context);
			var okButton = '"OK"',
			    cancelButton = '"Cancel"';

			if (buttonClause) {
				okButton = buttonClause.results.okButton.results.toSource(context);
				var cancelClause = buttonClause.results.cancelClause;
				if (cancelClause) cancelButton = cancelClause.results.cancelButton.results.toSource(context);
			}
			return "await spell.confirm(" + message + ", " + okButton + ", " + cancelButton + ")";
		}
	}]);

	return confirm;
}(_RuleSyntax2.default.Statement));

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _TextStream = __webpack_require__(5);

var _TextStream2 = _interopRequireDefault(_TextStream);

var _Parser = __webpack_require__(3);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(2);

var _Rule2 = _interopRequireDefault(_Rule);

__webpack_require__(1);

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
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _global = __webpack_require__(16);

var _global2 = _interopRequireDefault(_global);

var _RuleSyntax = __webpack_require__(1);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser2 = __webpack_require__(0);

var _parser3 = _interopRequireDefault(_parser2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for defining classes (known as `types`)
//


// re-export parser for testing.
exports.default = _parser3.default;

// DEAD SIMPLE PLURALIZER... REALLY NOT VERY GOOD

function pluralize(word) {
	return word + "s";
}

//MOVE TO `objects`?
// Properties clause: creates an object with one or more property values.
//	`foo = 1, bar = 2`
//TODO: would like to use `and` but that will barf on expressions...
//TODO: how to do properties on multiple lines?
_parser3.default.addList("object_literal_properties", "[({identifier} = {expression}) ,]", function (_Rule$List) {
	_inherits(object_literal_properties, _Rule$List);

	function object_literal_properties() {
		_classCallCheck(this, object_literal_properties);

		return _possibleConstructorReturn(this, (object_literal_properties.__proto__ || Object.getPrototypeOf(object_literal_properties)).apply(this, arguments));
	}

	_createClass(object_literal_properties, [{
		key: "toSource",
		value: function toSource(context) {
			var props = this.results.matched.map(function (prop) {
				var _prop$results = prop.results,
				    identifier = _prop$results.identifier,
				    expression = _prop$results.expression;

				var key = identifier.toSource(context);
				var value = expression.toSource(context);
				return "\"" + key + "\": " + value;
			});
			return "{ " + props.join(", ") + " }";
		}
	}]);

	return object_literal_properties;
}(_RuleSyntax2.default.List));

// `new`
// NOTE: we assume that all types take an object of properties????
_parser3.default.addSequence("new_thing", "(create|new) {type} (props_clause:with {props:object_literal_properties})?", function (_Rule$Sequence) {
	_inherits(new_thing, _Rule$Sequence);

	function new_thing() {
		_classCallCheck(this, new_thing);

		return _possibleConstructorReturn(this, (new_thing.__proto__ || Object.getPrototypeOf(new_thing)).apply(this, arguments));
	}

	_createClass(new_thing, [{
		key: "toSource",
		value: function toSource(context) {
			var _results = this.results,
			    type = _results.type,
			    props_clause = _results.props_clause;

			type = type.toSource(context);
			var props = props_clause && props_clause.results.props.toSource(context) || "";

			// Special case for object, which we'll create with an object literal.
			if (type === "Object") {
				if (!props_clause) return "{}";
				return "" + props;
			}

			return "new " + type + "(" + props + ")";
		}
	}]);

	return new_thing;
}(_RuleSyntax2.default.Sequence));
// This works as an expression OR a statement.
_parser3.default.addRule("expression", _parser3.default.rules.new_thing);
_parser3.default.addRule("statement", _parser3.default.rules.new_thing);

// Define class.
_parser3.default.addStatement("define_type", "define type {type} (extends_clause:as (a|an) {superType:type})?", function (_Rule$Statement) {
	_inherits(define_type, _Rule$Statement);

	function define_type() {
		_classCallCheck(this, define_type);

		return _possibleConstructorReturn(this, (define_type.__proto__ || Object.getPrototypeOf(define_type)).apply(this, arguments));
	}

	_createClass(define_type, [{
		key: "toSource",
		value: function toSource(context) {
			var _results2 = this.results,
			    type = _results2.type,
			    extends_clause = _results2.extends_clause;

			type = type.toSource(context);
			var superType = extends_clause && extends_clause.results.superType.toSource(context);
			if (superType) {
				return "class " + type + " extends " + superType;
			}
			return "class " + type;
		}
	}]);

	return define_type;
}(_RuleSyntax2.default.Statement));

//TODO: constructor


//MOVE TO `functions`?
// Arguments clause for methods
//	`with foo` or `with foo and bar and baz`
//TODO: {identifier} = {expression}	=> requires `,` instead of `and`
//TODO: `with foo as Type`
//TODO:	`with foo...` for splat?
_parser3.default.addSequence("args_clause", "with [args:{identifier} ,]", function (_Rule$Sequence2) {
	_inherits(args_clause, _Rule$Sequence2);

	function args_clause() {
		_classCallCheck(this, args_clause);

		return _possibleConstructorReturn(this, (args_clause.__proto__ || Object.getPrototypeOf(args_clause)).apply(this, arguments));
	}

	_createClass(args_clause, [{
		key: "toSource",
		value: function toSource(context) {
			return this.argNames.join(", ");
		}
	}, {
		key: "results",

		// Return just the arguments as the results
		get: function get() {
			return _get(args_clause.prototype.__proto__ || Object.getPrototypeOf(args_clause.prototype), "results", this).args;
		}

		// Return just the argument names as an array

	}, {
		key: "argNames",
		get: function get() {
			return this.results.matched.map(function (arg) {
				return arg.matched;
			});
		}
	}]);

	return args_clause;
}(_RuleSyntax2.default.Sequence));

// Declare instance method or normal function.
_parser3.default.addStatement("declare_method", "(to|on) {identifier} {args_clause}? (\\:)? {statement}?", function (_Rule$Statement2) {
	_inherits(declare_method, _Rule$Statement2);

	function declare_method() {
		_classCallCheck(this, declare_method);

		return _possibleConstructorReturn(this, (declare_method.__proto__ || Object.getPrototypeOf(declare_method)).apply(this, arguments));
	}

	_createClass(declare_method, [{
		key: "toSource",
		value: function toSource(context) {
			var _results3 = this.results,
			    identifier = _results3.identifier,
			    args_clause = _results3.args_clause,
			    statement = _results3.statement;


			identifier = identifier.toSource(context);
			var args = args_clause && args_clause.toSource(context) || "";
			statement = statement ? " { " + statement.toSource(context) + " }" : "";

			return identifier + "(" + args + ")" + statement;
		}
	}]);

	return declare_method;
}(_RuleSyntax2.default.Statement));

// Declare "action", which can be called globally and affects the parser.
// TODO: `with` clause (will conflict with `word`)
// TODO: install in parser somehow
// TODO: create instance function?  or maybe we don't need it:
//			`action turn Card over` for an instance is just `turn me over`
//			`action add card to deck` => `add me to deck`
//TESTME
_parser3.default.addStatement("declare_action", "action (word_clause:{word}|{type})+ (\\:)? {statement}?", function (_Rule$Statement3) {
	_inherits(declare_action, _Rule$Statement3);

	function declare_action() {
		_classCallCheck(this, declare_action);

		return _possibleConstructorReturn(this, (declare_action.__proto__ || Object.getPrototypeOf(declare_action)).apply(this, arguments));
	}

	_createClass(declare_action, [{
		key: "toSource",
		value: function toSource(context) {
			var _results4 = this.results,
			    word_clause = _results4.word_clause,
			    statement = _results4.statement;

			var words = word_clause.matched.map(function (word) {
				return word.toSource(context);
			});
			// if there's only one word, it can't be a blacklisted identifier or a type
			if (words.length === 1) {
				var word = words[0];
				if (word_clause.matched instanceof _RuleSyntax2.default.Type) {
					throw new SyntaxError("parse('declare_action'): one-word actions may not be types: " + word);
				}

				// HACK: `global.parser` is a hack here for convenience in testing...
				var _parser = context ? context.parser : _global2.default.parser;
				if (_parser.rules.identifier.blacklist[word]) {
					throw new SyntaxError("parse('declare_action'): one-word actions may not be blacklisted identifiers\": " + word);
				}
			}

			// figure out arguments and/or types
			var args = [];
			var types = [];
			// if any of the words are types (capital letter) make that an argument of the same name.
			word_clause.matched.map(function (item, index) {
				if (item instanceof _RuleSyntax2.default.Type) {
					var type = words[index];
					var _word = type.toLowerCase();
					types.push([type, _word]);
					words[index] = _word;
					args.push(_word);
				}
			});
			// get static method name and arguments for output
			var methodName = words.join("_");
			args = args.join(", ");

			// figure out if there are any conditions on the above
			var conditions = types.map(function (_ref) {
				var _ref2 = _slicedToArray(_ref, 2),
				    type = _ref2[0],
				    word = _ref2[1];

				return "\tif (!spell.isA(" + word + ", " + type + ")) return undefined";
			});

			// get statements, adding conditions if necessary
			statement = statement ? statement.toSource(context) : "";
			var statements = "";
			if (statement) {
				statements = [];
				if (conditions.length) statements = statements.concat(conditions);
				if (statement) statements.push("\t" + statement);
				statements = " {\n" + statements.join("\n") + "\n }\n";
			} else if (conditions.length) {
				statements = " {\n" + conditions.join("\n");
			}
			//debugger;
			// Create as a STATIC function
			//TODO: create as an instance function we can call on ourself!
			return "static " + methodName + "(" + args + ")" + statements;
		}
	}]);

	return declare_action;
}(_RuleSyntax2.default.Statement));

// Getter either with or without arguments.
// If you specify arguments, yields a normal function which returns a value.
_parser3.default.addStatement("getter", "get {identifier} {args_clause}? (\\:)? {expression}?", function (_Rule$Statement4) {
	_inherits(getter, _Rule$Statement4);

	function getter() {
		_classCallCheck(this, getter);

		return _possibleConstructorReturn(this, (getter.__proto__ || Object.getPrototypeOf(getter)).apply(this, arguments));
	}

	_createClass(getter, [{
		key: "toSource",
		value: function toSource(context) {
			var _results5 = this.results,
			    identifier = _results5.identifier,
			    args_clause = _results5.args_clause,
			    expression = _results5.expression;

			identifier = identifier.toSource(context);
			var args = args_clause && args_clause.toSource(context);
			expression = expression ? " { return (" + expression.toSource(context) + ") }" : "";

			if (args && expression) {
				return identifier + "(" + args + ")" + expression;
			} else if (args) {
				return identifier + "(" + args + ")";
			} else if (expression) {
				return "get " + identifier + "()" + expression;
			} else {
				return "get " + identifier + "()";
			}
			return result;
		}
	}]);

	return getter;
}(_RuleSyntax2.default.Statement));

// Setter.
// Complains if you specify more than one argument.
// If you don't pass an explicit argument, we'll assume it's the same as the identifier.
// eg;	`set color: set the color of my text to color`
//
// TODO: internal getter/setter semantics ala objective C
//			`set color: if color is in ["red", "blue"] then set my color to color`
//		 => `my color` within setter should automatically translate to `this._color` ???
_parser3.default.addStatement("setter", "set {identifier} {args_clause}? (\\:)? {statement}?", function (_Rule$Statement5) {
	_inherits(getter, _Rule$Statement5);

	function getter() {
		_classCallCheck(this, getter);

		return _possibleConstructorReturn(this, (getter.__proto__ || Object.getPrototypeOf(getter)).apply(this, arguments));
	}

	_createClass(getter, [{
		key: "toSource",
		value: function toSource(context) {
			var _results6 = this.results,
			    identifier = _results6.identifier,
			    args_clause = _results6.args_clause,
			    statement = _results6.statement;

			identifier = identifier.toSource(context);

			// Assume we want the same name as the identifier if no argumens
			var args = args_clause && args_clause.argNames || [identifier];
			// Complain if more than one argument
			if (args.length > 1) console.warn("parse('setter'): only one argument allowed in setter:  ", this.matchedText);

			statement = statement ? " { " + statement.toSource(context) + " }" : "";

			return "set " + identifier + "(" + args[0] + ")" + statement;
			return result;
		}
	}]);

	return getter;
}(_RuleSyntax2.default.Statement));

//
//	declare properties
//

//TODO: another name for `constant` ?
_parser3.default.addStatement("declare_property", "(scope:property|constant|shared property) {identifier} (value_clause:= {expression})?", function (_Rule$Statement6) {
	_inherits(declare_property, _Rule$Statement6);

	function declare_property() {
		_classCallCheck(this, declare_property);

		return _possibleConstructorReturn(this, (declare_property.__proto__ || Object.getPrototypeOf(declare_property)).apply(this, arguments));
	}

	_createClass(declare_property, [{
		key: "toSource",
		value: function toSource(context) {
			var _results7 = this.results,
			    scope = _results7.scope,
			    identifier = _results7.identifier,
			    value_clause = _results7.value_clause;

			scope = scope.toSource(context);
			identifier = identifier.toSource(context);
			var value = value_clause && " = " + value_clause.results.expression.toSource(context) || "";

			var declaration = "" + identifier + value;
			switch (scope) {
				case "constant":
					if (!value) console.warn("parse('declare_property'): constant properties must declare a value:  ", this.matchedText);
					return "const " + declaration;

				case "shared property":
					return "@proto\n" + declaration;

				case "property":
				default:
					return declaration;
			}
		}
	}]);

	return declare_property;
}(_RuleSyntax2.default.Statement));

// TODO: scope_modifier???
// TODO: initial value
_parser3.default.addStatement("declare_property", "property {identifier} as (a|an)? {type}", function (_Rule$Statement7) {
	_inherits(declare_property, _Rule$Statement7);

	function declare_property() {
		_classCallCheck(this, declare_property);

		return _possibleConstructorReturn(this, (declare_property.__proto__ || Object.getPrototypeOf(declare_property)).apply(this, arguments));
	}

	_createClass(declare_property, [{
		key: "toSource",
		value: function toSource(context) {
			var _results8 = this.results,
			    identifier = _results8.identifier,
			    type = _results8.type;

			identifier = identifier.toSource(context);
			type = type.toSource(context);

			return "get " + identifier + "() { return this.__" + identifier + " }\n" + ("set " + identifier + "(value) { if (spell.isA(value, " + type + ") this.__" + identifier + " = value }");
		}
	}]);

	return declare_property;
}(_RuleSyntax2.default.Statement));

// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
_parser3.default.addStatement("declare_property", "property {identifier} as one of {list:literal_list}", function (_Rule$Statement8) {
	_inherits(declare_property_as_one_of, _Rule$Statement8);

	function declare_property_as_one_of() {
		_classCallCheck(this, declare_property_as_one_of);

		return _possibleConstructorReturn(this, (declare_property_as_one_of.__proto__ || Object.getPrototypeOf(declare_property_as_one_of)).apply(this, arguments));
	}

	_createClass(declare_property_as_one_of, [{
		key: "toSource",
		value: function toSource(context) {
			var _results9 = this.results,
			    identifier = _results9.identifier,
			    list = _results9.list;


			identifier = identifier.toSource(context);
			var plural = pluralize(identifier);

			var values = list.toSource(context);
			var first = list.getItem(0);
			var firstValue = first ? first.toSource(context) : "undefined";

			return "@proto\n" + (plural + " = " + values + "\n") + ("get " + identifier + "() { return this.__" + identifier + " === undefined ? " + firstValue + " : this.__" + identifier + " }\n") + ("set " + identifier + "(value) { if (this." + plural + ".includes(value)) this.__" + identifier + " = value }");

			// MORE EFFICIENT BUT UGLIER
			// 			return `static ${plural} = ${values};\n`
			// 				 + `get ${identifier} { return ("__${identifier}" in this ? this.__${identifier} : ${firstValue}) }\n`
			// 				 + `set ${identifier}(value) { if (this.constructor.${plural}.includes(value)) this.__${identifier} = value }`;
		}
	}]);

	return declare_property_as_one_of;
}(_RuleSyntax2.default.Statement));

//
//	Self-reference
//
_parser3.default.addKeyword("me", "me", function (_Rule$Keyword) {
	_inherits(me, _Rule$Keyword);

	function me() {
		_classCallCheck(this, me);

		return _possibleConstructorReturn(this, (me.__proto__ || Object.getPrototypeOf(me)).apply(this, arguments));
	}

	_createClass(me, [{
		key: "toSource",
		value: function toSource(context) {
			return "this";
		}
	}]);

	return me;
}(_RuleSyntax2.default.Keyword));
_parser3.default.addRule("expression", _parser3.default.rules.me);

// TODO: this really makes me want to make `I am empty` etc work...
_parser3.default.addKeyword("I", "I", function (_Rule$Keyword2) {
	_inherits(I, _Rule$Keyword2);

	function I() {
		_classCallCheck(this, I);

		return _possibleConstructorReturn(this, (I.__proto__ || Object.getPrototypeOf(I)).apply(this, arguments));
	}

	_createClass(I, [{
		key: "toSource",
		value: function toSource(context) {
			return "this";
		}
	}]);

	return I;
}(_RuleSyntax2.default.Keyword));
_parser3.default.addRule("expression", _parser3.default.rules.I);

//
//	Property access
//

_parser3.default.addExpression("property_expression", "(properties:the {identifier} of)+ the? {expression}", function (_Rule$Expression) {
	_inherits(property_expression, _Rule$Expression);

	function property_expression() {
		_classCallCheck(this, property_expression);

		return _possibleConstructorReturn(this, (property_expression.__proto__ || Object.getPrototypeOf(property_expression)).apply(this, arguments));
	}

	_createClass(property_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _results10 = this.results,
			    expression = _results10.expression,
			    properties = _results10.properties;

			expression = expression.toSource(context);
			properties = properties.results.reverse().map(function (property) {
				return property.identifier.toSource(context);
			}).join(".");
			return expression + "." + properties;
			// NOTE: the following is safer, but ugly for demo purposes
			//			return `spell.get(${expression}, ['${properties}'])`;
		}
	}]);

	return property_expression;
}(_RuleSyntax2.default.Expression));

_parser3.default.addExpression("property_expression", "(my|this) {identifier}", function (_Rule$Expression2) {
	_inherits(property_expression, _Rule$Expression2);

	function property_expression() {
		_classCallCheck(this, property_expression);

		return _possibleConstructorReturn(this, (property_expression.__proto__ || Object.getPrototypeOf(property_expression)).apply(this, arguments));
	}

	_createClass(property_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var identifier = this.results.identifier;

			identifier = identifier.toSource(context);
			return "this." + identifier;
		}
	}]);

	return property_expression;
}(_RuleSyntax2.default.Expression));

/***/ }),
/* 15 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {

Object.defineProperty(exports, "__esModule", {
	value: true
});
// Make sure `global` is defined globally:
//	- either as the nodejs `global`, or
//	- as an alias for `window` in browsers, or
//	- for the `self` context in web workers.
//
// NOTE: this modifies the "global" environment by making sure "global" is set.!
//

var global_identifier = void 0;
if (typeof global !== "undefined") {
	//	console.log("Running in node");
	global_identifier = global;
}

if (typeof window !== "undefined") {
	//	console.log("Running in a web browser");
	window.global = window;
	global_identifier = window;
}

if (typeof self !== "undefined") {
	//	console.log("Running in a web worker");
	self.global = self;
	global_identifier = self;
}

// Export for consumption by import.
exports.default = global_identifier;
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(15)))

/***/ }),
/* 17 */
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

// Index expression: numeric index in some list.
// NOTE: Our indexes are **1-based** and Javascript is **0-based**.
//		 e.g. `item 1 of the array`  = `array[0]`
//
// TODO: if `identifier` is "word", output `getWord()` etc

var index_expression = function (_Rule$Expression) {
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
			    index = _results.index,
			    expression = _results.expression;

			expression = expression.toSource(context);
			index = index.toSource(context);

			// If we got a positive number literal, compensate for JS 0-based arrays now,
			// for nicer output.
			if (typeof index === "number" && index > 0) {
				return expression + "[" + (index - 1) + "]";
			}
			return "spell.getItem(" + expression + ", " + index + ")";

			// This is safer, but using the above sometimes for demo purposes
			//		return `spell.getItem(${expression}, ${index})`;
		}
	}]);

	return index_expression;
}(_Rule2.default.Expression);

// Numeric index in a list-like thing:
//	- `item 1 of ...`
//	- `item #2 of ...`
// NOTE: these indices are ONE based, NOT zero based as is Javascript.


_parser2.default.addExpression("index_expression", "{identifier} (#)?{index:expression} of (the?) {expression}", index_expression);

var ordinal = function (_Rule$Keyword) {
	_inherits(ordinal, _Rule$Keyword);

	function ordinal() {
		_classCallCheck(this, ordinal);

		return _possibleConstructorReturn(this, (ordinal.__proto__ || Object.getPrototypeOf(ordinal)).apply(this, arguments));
	}

	return ordinal;
}(_Rule2.default.Keyword);

_parser2.default.addKeyword("ordinal", "first", ordinal, { toSource: function toSource() {
		return 1;
	} });
_parser2.default.addKeyword("ordinal", "second", ordinal, { toSource: function toSource() {
		return 2;
	} });
_parser2.default.addKeyword("ordinal", "third", ordinal, { toSource: function toSource() {
		return 3;
	} });
_parser2.default.addKeyword("ordinal", "fourth", ordinal, { toSource: function toSource() {
		return 4;
	} });
_parser2.default.addKeyword("ordinal", "fifth", ordinal, { toSource: function toSource() {
		return 5;
	} });
_parser2.default.addKeyword("ordinal", "sixth", ordinal, { toSource: function toSource() {
		return 6;
	} });
_parser2.default.addKeyword("ordinal", "seventh", ordinal, { toSource: function toSource() {
		return 7;
	} });
_parser2.default.addKeyword("ordinal", "eighth", ordinal, { toSource: function toSource() {
		return 8;
	} });
_parser2.default.addKeyword("ordinal", "ninth", ordinal, { toSource: function toSource() {
		return 9;
	} });
_parser2.default.addKeyword("ordinal", "tenth", ordinal, { toSource: function toSource() {
		return 10;
	} });
_parser2.default.addKeyword("ordinal", "penultimate", ordinal, { toSource: function toSource() {
		return -2;
	} });
_parser2.default.addKeyword("ordinal", "final", ordinal, { toSource: function toSource() {
		return -1;
	} });
_parser2.default.addKeyword("ordinal", "last", ordinal, { toSource: function toSource() {
		return -1;
	} });

// TODO: sixty-fifth, two hundred forty ninth...

// Alternative form for numeric index in a list-like thing.
_parser2.default.addExpression("index_expression", "the {index:ordinal} {identifier} of (the)? {expression}", index_expression);

/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgN2RjMTEwZDZkMTQyYzJiNTYwYzMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGVTeW50YXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2lmLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy90eXBlcy5qcyIsIndlYnBhY2s6Ly8vKHdlYnBhY2spL2J1aWxkaW4vZ2xvYmFsLmpzIiwid2VicGFjazovLy8uL3NyYy9nbG9iYWwuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2xpc3RzLmpzIl0sIm5hbWVzIjpbInBhcnNlciIsIndpbmRvdyIsIk9iamVjdCIsImFzc2lnbiIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJTZXF1ZW5jZSIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInJ1bGVzIiwicGFyc2VSdWxlU3ludGF4X3Rva2VucyIsInJ1bGUiLCJsZW5ndGgiLCJTWU5UQVhfRVhQUkVTU0lPTiIsIm1hdGNoIiwiU3ludGF4RXJyb3IiLCJzdGFydEluZGV4IiwibGFzdEluZGV4IiwicGFyc2VSdWxlU3ludGF4X3Rva2VuIiwiZW5kSW5kZXgiLCJsYXN0IiwiU3ltYm9sIiwicG9wIiwibWVyZ2VTeW1ib2xzIiwicHVzaCIsInN5bnRheFRva2VuIiwicGFyc2VSdWxlU3ludGF4X3N5bWJvbCIsInBhcnNlUnVsZVN5bnRheF9zdWJydWxlIiwicGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzIiwicGFyc2VSdWxlU3ludGF4X2xpc3QiLCJwYXJzZVJ1bGVTeW50YXhfcmVwZWF0IiwiS0VZV09SRF9QQVRURVJOIiwicGFyc2VSdWxlU3ludGF4X2tleXdvcmQiLCJjb25zdHJ1Y3RvciIsIndvcmRzIiwiaSIsIm5leHQiLCJLZXl3b3JkIiwic3RyaW5nIiwiam9pbiIsInN0YXJ0c1dpdGgiLCJzdWJzdHIiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJzbGljZSIsImFyZ3VtZW50IiwiYWx0ZXJuYXRpdmVzIiwiZ3JvdXBBbHRlcm5hdGl2ZXMiLCJtYXAiLCJncm91cCIsInJlc3VsdHMiLCJBbHRlcm5hdGl2ZXMiLCJ0b2tlbnMiLCJjdXJyZW50IiwidG9rZW4iLCJjb25jYXQiLCJzeW1ib2wiLCJSZXBlYXQiLCJvcHRpb25hbCIsInVuZGVmaW5lZCIsInBhcmFtcyIsImJhbmdQb3NpdGlvbiIsImluZGV4T2YiLCJub3QiLCJTdWJydWxlIiwiTGlzdCIsIml0ZW0iLCJkZWxpbWl0ZXIiLCJkZWZpbmVQcm9wZXJ0aWVzIiwicHJvdG90eXBlIiwiYWRkU2VxdWVuY2UiLCJ2YWx1ZSIsIm5hbWUiLCJydWxlU3ludGF4IiwicHJvcGVydGllcyIsImRlYnVnIiwiY29uc29sZSIsImxvZyIsImFkZFJ1bGUiLCJlIiwiZXJyb3IiLCJhZGRTdGF0ZW1lbnQiLCJTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiRXhwcmVzc2lvbiIsImFkZExpc3QiLCJzdHJlYW0iLCJhZGRLZXl3b3JkIiwiYWRkU3ltYm9sIiwiYWRkUG9zdGZpeE9wZXJhdG9yIiwiQXJyYXkiLCJpc0FycmF5IiwiZm9yRWFjaCIsInRvSlMiLCJUeXBlRXJyb3IiLCJfX3Bvc3RmaXhPcGVyYXRvcnMiLCJwb3N0Zml4T3BlcmF0b3JzIiwiUnVsZSIsImhhc093blByb3BlcnR5IiwiY2xvbmUiLCJjcmVhdGUiLCJwcm9wcyIsImFkdmFuY2VUbyIsInN0YWNrIiwiY29udGV4dCIsIm1hdGNoZWQiLCJuZXh0UnVsZSIsIm5leHRTdHJlYW0iLCJQYXR0ZXJuIiwic3RhcnRQYXR0ZXJuIiwiYmxhY2tsaXN0IiwibWF0Y2hlZFRleHQiLCJyYW5nZSIsInBhdHRlcm4iLCJpbmRleCIsIndvcmQiLCJzb3VyY2UiLCJfX3N0YXJ0UGF0dGVybiIsImRlZmluZVByb3BlcnR5IiwiUmVnRXhwIiwiUmVnRXhwRnJvbVN0cmluZyIsImZpcnN0Iiwic2Vjb25kIiwicGF0dGVyblN0cmluZyIsImVzY2FwZVJlZ0V4cENoYXJhY3RlcnMiLCJtZXJnZUtleXdvcmRzIiwiZ2V0UnVsZU9yRGllIiwicGFyc2UiLCJpc0RldGVybWluaXN0aWMiLCJ0ZXN0IiwiTmVzdGVkIiwiZXZlcnkiLCJ0ZXN0UnVsZSIsImxlZnRSZWN1cnNpdmUiLCJzdGFja0NvbnRhaW5zIiwiY2h1bmtpdCIsInBhcnNlSW5DaHVua3MiLCJlYXRXaGl0ZXNwYWNlIiwiYXJnTmFtZSIsInJ1bGVOYW1lIiwiYmVzdE1hdGNoIiwibWF0Y2hlcyIsImdldEJlc3RNYXRjaCIsInJlZHVjZSIsImJlc3QiLCJ0b1NvdXJjZSIsImluY2x1ZGVzIiwiZ3JvdXBFbmQiLCJQYXJzZXIiLCJwcm9wZXJ0eU5hbWUiLCJnZXRSdWxlIiwiYXJndW1lbnRzIiwiY29tcGlsZVN0YXRlbWVudHMiLCJyZXN1bHQiLCJzdGF0ZW1lbnRzIiwidGltZSIsImN1cnJlbnRJbmRlbnQiLCJ0YWJzIiwic3BsaXQiLCJzdGF0ZW1lbnQiLCJ0cmltIiwibGluZVN0YXJ0IiwibGluZUluZGVudCIsImluZGVudGVkU3RhcnQiLCJjbG9zZXJzIiwibGFzdEJsYW5rTGluZSIsIl9nZXRMYXN0QmxhbmtMaW5lIiwic3BsaWNlIiwid2FybiIsInVucGFyc2VkIiwibGluZSIsInRpbWVFbmQiLCJ3aGl0ZXNwYWNlIiwiYWR2YW5jZUJ5IiwiZXhpc3RpbmciLCJydWxlSXNMZWZ0UmVjdXJzaXZlIiwic3VicnVsZSIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsIm5lc3RpbmciLCJuZXN0ZWQiLCJjaGFyIiwibGlzdCIsIlJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlMiLCJmbGFncyIsIkRFQlVHIiwiY2hhcnMiLCJXaGl0ZXNwYWNlIiwiQ29tbWVudCIsIldvcmQiLCJyZXBsYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJhZGRUb0JsYWNrbGlzdCIsIlR5cGUiLCJ0eXBlIiwiTnVtYmVyIiwicGFyc2VGbG9hdCIsIm51bWJlciIsIkludGVnZXIiLCJwYXJzZUludCIsIlRleHQiLCJ0ZXh0IiwiQm9vbGVhbiIsImJvb2xlYW4iLCJleHByZXNzaW9uIiwiZW5kc1dpdGgiLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJhcmciLCJoZWFkIiwic3Vic3RyaW5nIiwibWVtb2l6ZWQiLCJkZWZpbmVNZW1vaXplZCIsInByb3BlcnR5IiwiZ2V0dGVyIiwiYXBwbHkiLCJjb25maWd1cmFibGUiLCJnZXQiLCJlbHNlUGhyYXNlIiwiZWxzZVN0YXRlbWVudCIsImluZml4X29wZXJhdG9yIiwicHJlY2VkZW5jZSIsImEiLCJiIiwidGhpbmciLCJsaHMiLCJyaHMiLCJvcGVyYXRvciIsImFzc2lnbm1lbnQiLCJtZXNzYWdlIiwiYnV0dG9uQ2xhdXNlIiwiYnV0dG9uTmFtZSIsIm9rQnV0dG9uIiwiY2FuY2VsQnV0dG9uIiwiY2FuY2VsQ2xhdXNlIiwicGx1cmFsaXplIiwicHJvcCIsImtleSIsInByb3BzX2NsYXVzZSIsIm5ld190aGluZyIsImV4dGVuZHNfY2xhdXNlIiwic3VwZXJUeXBlIiwiYXJnTmFtZXMiLCJhcmdzIiwiYXJnc19jbGF1c2UiLCJ3b3JkX2NsYXVzZSIsInR5cGVzIiwidG9Mb3dlckNhc2UiLCJtZXRob2ROYW1lIiwiY29uZGl0aW9ucyIsInNjb3BlIiwidmFsdWVfY2xhdXNlIiwiZGVjbGFyYXRpb24iLCJwbHVyYWwiLCJ2YWx1ZXMiLCJnZXRJdGVtIiwiZmlyc3RWYWx1ZSIsIm1lIiwiSSIsInJldmVyc2UiLCJnbG9iYWxfaWRlbnRpZmllciIsImdsb2JhbCIsInNlbGYiLCJpbmRleF9leHByZXNzaW9uIiwib3JkaW5hbCJdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLG1EQUEyQyxjQUFjOztBQUV6RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOzs7O0FBQ0E7Ozs7OztBQUVBO0FBTkE7QUFDQTtBQUNBO0FBS0EsSUFBTUEsU0FBUyxzQkFBZjtrQkFDZUEsTTs7QUFFZjs7QUFDQUMsT0FBT0QsTUFBUCxHQUFnQkEsTUFBaEIsQzs7Ozs7Ozs7Ozs7Ozs7O0FDWEE7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUE7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQUUsT0FBT0MsTUFBUCxpQkFBb0I7O0FBRXBCO0FBQ0E7QUFDQTs7QUFFQTtBQUNDQyxnQkFQbUIsMkJBT0hDLE1BUEcsRUFPMEM7QUFBQSxNQUFyQ0MsbUJBQXFDLHVFQUFmLGVBQUtDLFFBQVU7O0FBQzVELE1BQUlDLGVBQWUsZUFBS0Msa0JBQUwsQ0FBd0JKLE1BQXhCLENBQW5CO0FBQ0EsTUFBSUssUUFBUSxlQUFLQyxzQkFBTCxDQUE0QkgsWUFBNUIsRUFBMEMsRUFBMUMs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a0wsT0FBckMsRUFBOEMsRUFBRXhILFVBQVU7QUFBQSxTQUFNLENBQUMsQ0FBUDtBQUFBLEVBQVosRUFBOUM7O0FBRUE7O0FBRUE7QUFDQSxpQkFBTzlELGFBQVAsQ0FBcUIsa0JBQXJCLEVBQXlDLHlEQUF6QyxFQUFvR3FMLGdCQUFwRyxFIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMTMpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDdkYzExMGQ2ZDE0MmMyYjU2MGMzIiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJpbXBvcnQgeyBkZWZpbmVNZW1vaXplZCB9IGZyb20gXCIuL21lbW9pemUuanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIHJlLWV4cG9ydCBSdWxlIGZvciB0ZXN0aW5nXG5leHBvcnQgZGVmYXVsdCBSdWxlO1xuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbi8vIFRPRE86XHRVc2Uga2V5d29yZHMgaW4gc3ludGF4IHRvIG1ha2UgYSBxdWljayByZWdleC1iYXNlZCBgdGVzdGAgZnVuY3Rpb24gZm9yIHRoZSBlbnRpcmUgcnVsZVxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cbi8vIFRPRE86IGNvbnZlcnQgdG8gVGV4dFN0cmVhbSBwYXR0ZXJuIGFsYSBub3JtYWwgcGFyc2VyIG9uY2UgdGhhdCBzZXR0bGVzIGRvd24/Pz9cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbGFzdEluZGV4ID0gc3ludGF4U3RyZWFtLmxlbmd0aDtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKHJ1bGUpIHtcblx0XHRcdFx0bGV0IGxhc3QgPSBydWxlc1tydWxlcy5sZW5ndGgtMV07XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgU3RyaW5nYCBhbmQgbGFzdCB3YXMgYSBgU3RyaW5nYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0aWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG5cdFx0XHRcdFx0cnVsZXMucG9wKCk7XG5cdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG5cdFx0XHRcdFx0cnVsZSA9IFJ1bGUubWVyZ2VTeW1ib2xzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJ1bGVzLnB1c2gocnVsZSk7XG5cdFx0XHR9XG5cdFx0XHRzdGFydEluZGV4ID0gZW5kSW5kZXggKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZXM7XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgc3ludGF4VG9rZW4gPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHQvLyBpZiB3ZSBnb3QgYSBcIlxcXFxcIiAod2hpY2ggYWxzbyBoYXMgdG8gZ28gaW50byB0aGUgc291cmNlIHN0cmluZyBhcyBcIlxcXFxcIilcblx0XHQvLyB0cmVhdCB0aGUgbmV4dCB0b2tlbiBhcyBhIGxpdGVyYWwgc3RyaW5nIHJhdGhlciB0aGFuIGFzIGEgc3BlY2lhbCBjaGFyYWN0ZXIuXG5cdFx0aWYgKHN5bnRheFRva2VuID09PSBcIlxcXFxcIikge1xuXHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N5bWJvbChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ICsgMSk7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChzeW50YXhUb2tlbikge1xuXHRcdFx0Y2FzZSBcIntcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIihcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCJbXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIqXCI6XG5cdFx0XHRjYXNlIFwiK1wiOlxuXHRcdFx0Y2FzZSBcIj9cIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cblx0XHRcdC8vIHRoZSBmb2xsb3dpbmcgc2hvdWxkIEFMV0FZUyBiZSBjb25zdW1lZCBieSB0aGUgYWJvdmVcblx0XHRcdGNhc2UgXCJ9XCI6XG5cdFx0XHRjYXNlIFwiKVwiOlxuXHRcdFx0Y2FzZSBcIl1cIjpcblx0XHRcdGNhc2UgXCJ8XCI6XG5cdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCAke3N5bnRheFRva2VufSBmb3VuZCBhcyBpdGVtICR7c3RhcnRJbmRleH0gb2YgJHt0aGlzLnN5bnRheH1gKTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0aWYgKHN5bnRheFRva2VuLm1hdGNoKFJ1bGUuS0VZV09SRF9QQVRURVJOKSkge1xuXHRcdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9rZXl3b3JkKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0S0VZV09SRF9QQVRURVJOIDogL1tBLVphLXpdKy8sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gSWYgbW9yZSB0aGFuIG9uZSBrZXl3b3JkIGFwcGVhcnMgaW4gYSByb3csIGNvbWJpbmVzIHRoZW0gaW50byBhIHNpbmdsZSBgS2V5d29yZGAgb2JqZWN0LlxuXHQvLyBUaGlzIGlzIHByZXR0eSBzYWZlLCB1bmxlc3MgeW91IGhhdmUgYW4gb3B0aW9uYWwga2V5d29yZCBsaWtlXG5cdC8vXHRcdGB0aGUge2lkZW50aWZpZXJ9IG9mIHRoZT8ge2V4cHJlc3Npb259YFxuXHQvLyBpbiB3aGljaCBjYXNlIHlvdSBjYW4gcHV0IHRoZSBvcHRpb25hbCBrZXl3b3JkIGluIHBhcmVuc1xuXHQvL1x0XHRgdGhlIHtpZGVudGlmaWVyfSBvZiAodGhlPykge2V4cHJlc3Npb259YFxuXHQvL1xuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfa2V5d29yZChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwLCBjb25zdHJ1Y3Rvcikge1xuXHRcdGxldCB3b3JkcyA9IFtdLCBlbmRJbmRleDtcbiBcdFx0Ly8gZWF0IGtleXdvcmRzIHdoaWxlIHRoZXkgbGFzdFxuXHRcdGZvciAodmFyIGkgPSBzdGFydEluZGV4OyBpIDwgc3ludGF4U3RyZWFtLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXQgbmV4dCA9IHN5bnRheFN0cmVhbVtpXTtcblx0XHRcdGlmIChuZXh0Lm1hdGNoKFJ1bGUuS0VZV09SRF9QQVRURVJOKSkge1xuXHRcdFx0XHR3b3Jkcy5wdXNoKG5leHQpO1xuXHRcdFx0XHRlbmRJbmRleCA9IGk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGJyZWFrO1xuXHRcdH1cblxuXHRcdGlmICghY29uc3RydWN0b3IpIGNvbnN0cnVjdG9yID0gUnVsZS5LZXl3b3JkO1xuXHRcdGxldCBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHsgc3RyaW5nOiB3b3Jkcy5qb2luKFwiIFwiKSB9KTtcblxuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N5bWJvbChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwLCBjb25zdHJ1Y3RvciA9IFJ1bGUuU3ltYm9sKSB7XG5cdFx0bGV0IHN0cmluZyA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblx0XHRpZiAoIWNvbnN0cnVjdG9yKSBjb25zdHJ1Y3RvciA9IFJ1bGUuU3ltYm9sO1xuXHRcdGxldCBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHsgc3RyaW5nOiBzdHJpbmcgfSk7XG5cblx0XHQvLyBJZiBzdHJpbmcgc3RhcnRzIHdpdGggYFxcXFxgLCBpdCdzIGFuIGVzY2FwZWQgbGl0ZXJhbCAoZWc6IGBcXFtgIG5lZWRzIHRvIGlucHV0IGFzIGBcXFxcW2ApLlxuXHRcdGlmIChzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIikpIHtcblx0XHRcdC8vIHJlbW92ZSBsZWFkaW5nIHNsYXNoIGluIG1hdGNoIHN0cmluZy4uLlxuXHRcdFx0cnVsZS5zdHJpbmcgPSBydWxlLnN0cmluZy5zdWJzdHIoMSk7XG5cdFx0XHQvLyBidXQgbGVhdmUgaXQgaW4gdG9TdHJpbmdcblx0XHRcdHJ1bGUudG9TdHJpbmcgPSAoKSA9PiBzdHJpbmc7XG5cdFx0fVxuXHRcdHJldHVybiBbIHJ1bGUsIHN0YXJ0SW5kZXggXTtcblx0fSxcblxuXG5cdC8vIE1hdGNoIGdyb3VwaW5nIGV4cHJlc3Npb24gYCguLi58Li4uKWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHQvLyBOT1RFOiBuZXN0ZWQgcGFyZW5zIG1heSBub3QgaGF2ZSBhbHRlcm5hdGl2ZXMuLi4gOi0oICAgYChhfChifGMpKWAgd29uJ3Qgd29yaz8/P1xuXHRwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIihcIiwgXCIpXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0Ly8gcHVsbCBvdXQgZXhwbGljaXQgYXJndW1lbnQgbmFtZVxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdC8vIHNwbGl0IGludG8gZ3JvdXBzLCBpbmNsdWRpbmcgbmVzdGVkIHBhcmVuc1xuXHRcdGxldCBhbHRlcm5hdGl2ZXMgPVxuXHRcdFx0Z3JvdXBBbHRlcm5hdGl2ZXMoc2xpY2UpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0XHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKGdyb3VwLCBbXSk7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHRzWzBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdGxldCBydWxlID0gYWx0ZXJuYXRpdmVzLmxlbmd0aCA9PT0gMSA/IGFsdGVybmF0aXZlc1swXSA6IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVzOiBhbHRlcm5hdGl2ZXMgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblxuXHRcdGZ1bmN0aW9uIGdyb3VwQWx0ZXJuYXRpdmVzKHRva2Vucykge1xuXHRcdFx0bGV0IGFsdGVybmF0aXZlcyA9IFtdO1xuXHRcdFx0bGV0IGN1cnJlbnQgPSBbXTtcblx0XHRcdGZvciAobGV0IGkgPSAwLCB0b2tlbjsgdG9rZW4gPSB0b2tlbnNbaV07IGkrKykge1xuXHRcdFx0XHQvLyBoYW5kbGUgYWx0ZXJuYXRlIG1hcmtlclxuXHRcdFx0XHRpZiAodG9rZW4gPT09IFwifFwiKSB7XG5cdFx0XHRcdFx0YWx0ZXJuYXRpdmVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGhhbmRsZSBuZXN0ZWQgcGFyZW5zXG5cdFx0XHRcdGVsc2UgaWYgKHRva2VuID09PSBcIihcIikge1xuXHRcdFx0XHRcdGxldCB7IGVuZEluZGV4IH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmRJbmRleCArIDEpKTtcblx0XHRcdFx0XHRpID0gZW5kSW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3VycmVudC5wdXNoKHRva2VuKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGN1cnJlbnQubGVuZ3RoKSBhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdHJldHVybiBhbHRlcm5hdGl2ZXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIHJlcGVhdCBpbmRpY2F0b3IgYD9gLCBgK2Agb3IgYCpgIGJ5IGF0dGFjaGluZyBpdCB0byB0aGUgcHJldmlvdXMgcnVsZS5cblx0cGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IHN5bWJvbCA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblx0XHRsZXQgcnVsZSA9IHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBhdHRhY2ggcmVwZWF0IHN5bWJvbCAke3N5bWJvbH0gdG8gZW1wdHkgcnVsZSFgKTtcblxuXHRcdC8vIFRyYW5zZm9ybSBsYXN0IHJ1bGUgaW50byBhIHJlcGVhdCBmb3IgYCpgIGFuZCBgK2AuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCIqXCIgfHwgc3ltYm9sID09PSBcIitcIikge1xuXHRcdFx0bGV0IGFyZ3VtZW50ID0gcnVsZS5hcmd1bWVudDtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5SZXBlYXQoeyBydWxlIH0pO1xuXHRcdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0XHQvLyBwdXNoIGludG8gcnVsZSBzdGFjayBpbiBwbGFjZSBvZiBvbGQgcnVsZVxuXHRcdFx0cnVsZXNbcnVsZXMubGVuZ3RoIC0gMV0gPSBydWxlO1xuXHRcdH1cblxuXHRcdC8vIFJ1bGUgaXMgb3B0aW9uYWwgZm9yIGA/YCBhbmQgYCpgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiP1wiIHx8IHN5bWJvbCA9PT0gXCIqXCIpIHtcblx0XHRcdHJ1bGUub3B0aW9uYWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBbIHVuZGVmaW5lZCwgc3RhcnRJbmRleCBdXG5cdH0sXG5cblx0Ly8gTWF0Y2ggYHs8cnVsZU5hbWU+fWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IG1hdGNoID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIntcIiwgXCJ9XCIsIHN0YXJ0SW5kZXgpO1xuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID09PSAzICYmIG1hdGNoLnNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBtYXRjaC5zbGljZVswXTtcblx0XHRcdG1hdGNoLnNsaWNlID0gbWF0Y2guc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPiAxKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHByb2Nlc3MgcnVsZXMgd2l0aCBtb3JlIHRoYW4gb25lIHJ1bGUgbmFtZTogeyR7bWF0Y2guc2xpY2Uuam9pbihcIlwiKX19YCk7XG5cblx0XHRsZXQgcGFyYW1zID0geyBydWxlOiBtYXRjaC5zbGljZVswXSB9O1xuXG5cdFx0Ly8gc2VlIGlmIHRoZXJlJ3MgYSBgbm90YCBydWxlIGluIHRoZXJlXG5cdFx0bGV0IGJhbmdQb3NpdGlvbiA9IHBhcmFtcy5ydWxlLmluZGV4T2YoXCIhXCIpO1xuXHRcdGlmIChiYW5nUG9zaXRpb24gIT09IC0xKSB7XG5cdFx0XHRwYXJhbXMubm90ID0gcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpOyAvL1sgcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpIF07XG5cdFx0XHRwYXJhbXMucnVsZSA9IHBhcmFtcy5ydWxlLnN1YnN0cigwLCBiYW5nUG9zaXRpb24pO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuU3VicnVsZShwYXJhbXMpO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIG1hdGNoLmVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggbGlzdCBleHByZXNzaW9uIGBbPGl0ZW0+PGRlbGltaXRlcj5dYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDAsIGNvbnN0cnVjdG9yID0gUnVsZS5MaXN0KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBbIGl0ZW0sIGRlbGltaXRlciBdID0gcmVzdWx0cztcblxuXHRcdGxldCBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHsgaXRlbSwgZGVsaW1pdGVyIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cdH0sXG5cbn0pO1xuXG5cblxuLy8gIyMgIEFkZCBtZXRob2RzIHRvIFBhcnNlciB0byBkZWZpbmUgcnVsZXMgdXNpbmcgdGhlIGFib3ZlIHN5bnRheC5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFBhcnNlci5wcm90b3R5cGUsIHtcblxuXHQvLyBQYXJzZSBhIGBydWxlU3ludGF4YCBydWxlIGFuZCBhZGQgaXQgdG8gb3VyIGxpc3Qgb2YgcnVsZXMuXG5cdC8vIFJldHVybnMgdGhlIG5ldyBydWxlLlxuXHQvLyBMb2dzIHBhcnNpbmcgZXJyb3JzIGJ1dCBhbGxvd3MgdGhpbmdzIHRvIGNvbnRpbnVlLlxuXHRhZGRTZXF1ZW5jZTogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlLCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKHR5cGVvZiBjb25zdHJ1Y3RvciAhPT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRwcm9wZXJ0aWVzID0gY29uc3RydWN0b3I7XG5cdFx0XHRjb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2U7XG5cdFx0fVxuXHRcdHRyeSB7XG5cdFx0XHRsZXQgcnVsZSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yKTtcblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cbi8vY29uc29sZS5pbmZvKG5hbWUsIGNvbnN0cnVjdG9yLCBydWxlKTtcblx0XHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmdyb3VwKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgc3ludGF4OiAke3J1bGVTeW50YXh9YCk7XG5cdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdH1cblx0fX0sXG5cblx0YWRkU3RhdGVtZW50OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuU3RhdGVtZW50LCBwcm9wZXJ0aWVzKSB7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmFkZFNlcXVlbmNlKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkRXhwcmVzc2lvbjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLkV4cHJlc3Npb24sIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgcnVsZSA9IHRoaXMuYWRkU2VxdWVuY2UobmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkTGlzdDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLkxpc3QsIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgc3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgocnVsZVN5bnRheCk7XG5cdFx0bGV0IHJ1bGUgPSAoUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pWzBdO1xuXHRcdGlmICghcnVsZSkgcmV0dXJuO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZEtleXdvcmQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5LZXl3b3JkLCBwcm9wZXJ0aWVzKSB7XG5cdFx0bGV0IHN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgpO1xuXHRcdGxldCBydWxlID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKVswXTtcblx0XHRpZiAoIXJ1bGUpIHJldHVybjtcblx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRTeW1ib2w6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5TeW1ib2wsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBUT0RPOiBhc3N1bWUgd2UganVzdCBoYXZlIG9uZSBzeW1ib2wgb2YgbWFueSBsZXR0ZXJzLi4uXG5cdFx0bGV0IHN0cmVhbSA9IFtydWxlU3ludGF4XTtcblx0XHRsZXQgcnVsZSA9IChSdWxlLnBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKVswXTtcblx0XHRpZiAoIXJ1bGUpIHJldHVybjtcblx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHR9fSxcblxuXHQvLyBBZGQgcG9zdGZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgaXMgZGVmaW5lZFwiXG5cdC8vIE5PVEU6IGlmIHlvdSBoYXZlIG1vcmUgdGhhbiBvbmUgbWF0Y2hpbmcgb3BlcmF0b3IsXG5cdC8vXHRcdCBwYXNzIGluIGFuIGFycmF5IG9mIHNpbXBsZSBzdHJpbmdzIHNvIGFsbCBvZiBvdXIgb3BlcmF0b3JzIGFyZSBzaW1wbGUgc3RyaW5ncy5cblx0YWRkUG9zdGZpeE9wZXJhdG9yOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpIHtcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkUG9zdGZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkge1xuXHRcdFx0aWYgKCFydWxlLnRvSlMpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgcG9zdGZpeCBvcGVyYXRvciBydWxlICcke25hbWV9JyB0byBzcGVjaWZ5ICd0b0pTJyBmdW5jdGlvbmApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gY2xlYXIgbGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgZm9yIGdldHRlciBiZWxvd1xuXHRcdFx0ZGVsZXRlIHRoaXMuX19wb3N0Zml4T3BlcmF0b3JzO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcInBvc3RmaXhfb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIHBvc3RmaXggb3BlcmF0b3JzIGFzIHN0cmluZ3MuXG5cdC8vIFJlLW1lbW9pemVkIGFmdGVyIGBhZGRJbmZpeE9wZXJhdG9yYCBhYm92ZS5cblx0cG9zdGZpeE9wZXJhdG9yczogZGVmaW5lTWVtb2l6ZWQoXCJfX3Bvc2ZpeE9wZXJhdG9yc1wiLFxuXHRcdGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0JiYgdGhpcy5ydWxlc1tcInBvc3RmaXhfb3BlcmF0b3JcIl0ucnVsZXMubWFwKHJ1bGUgPT4gcnVsZS5zdHJpbmcpO1xuXHR9KVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZVN5bnRheC5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHN0cmVhbSwgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBzdHJlYW1gXHRcdFN0cmVhbSB3aGljaCB3YXMgbWF0Y2hlZCB3aXRoIGBzdGFydEluZGV4YCBhdCB0aGUgc3RhcnQgb2YgdGhlIG1hdGNoXG4vL1x0XHRcdC0gYGVuZEluZGV4YFx0Tm9uLWluY2x1c2l2ZSBlbmQgaW5kZXggaW4gc3RyZWFtIHdoZXJlIG1hdGNoIGVuZHMuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5yZXN1bHRzYFx0XHRcdFJldHVybiBtYXRjaGVkIGFyZ3VtZW50cyBpbiBhIGZvcm1hdCBzdWl0YWJsZSB0byBkbzpcbi8vXHRcdC0gYHJ1bGUudG9Tb3VyY2UoY29udGV4dClgXHRSZXR1cm4gamF2YXNjcmlwdCBzb3VyY2UgdG8gaW50ZXJwcmV0IHRoZSBydWxlLlxuLy9cbmltcG9ydCBnbG9iYWwgZnJvbSBcIi4vZ2xvYmFsXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKHRoaXMuY29uc3RydWN0b3IgIT09IFJ1bGUgfHwgIXRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLmhhc093blByb3BlcnR5KFwiY29uc3RydWN0b3JcIikpIHtcbi8vY29uc29sZS53YXJuKFwibm90IHJ1bGVcIiwgdGhpcyk7XG5cdFx0fVxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKC4uLnByb3BzKSB7XG5cdFx0bGV0IGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCAuLi5wcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuLy9cbi8vXHRQYXJzaW5nIHByaW1pdGl2ZXMgLS0geW91IE1VU1QgaW1wbGVtZW50IHRoZXNlIGluIHlvdXIgc3ViY2xhc3NlcyFcbi8vXG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHJ1bGUgaW4gdGhlIGBzdHJlYW1gLlxuXHQvLyBSZXR1cm5zIHJlc3VsdHMgb2YgdGhlIHBhcnNlIG9yIGB1bmRlZmluZWRgLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gSXMgdGhpcyBydWxlIGRldGVybWluaXN0aWMsIGVnOiBjYW4gaXQgYmUgcXVpY2tseSBhbmQgdW5hbWJpZ3VvdXNseSBzYXRpc2ZpZWQ/XG5cdC8vIFJldHVybmluZyBgdHJ1ZWAgY2FuIHNwZWVkIHVwIHNlcXVlbmNlIHByb2Nlc3NpbmcsXG5cdC8vXHRidXQgaWYgeW91J3JlIHJlYWxseSBub3Qgc3VyZSwgcmV0dXJuIGB1bmRlZmluZWRgLlxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYml0cyBvZiBvdXIgcnVsZSBhcmUgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYyAoYnV0IGFsbCBwYXR0ZXJucyBhcmUgZGV0ZXJtaW5pc3RpYylcblx0Ly9cdC0gcmVnZXggbWF0Y2ggaWYgZm91bmQsXG5cdC8vXHQtIGBmYWxzZWAgaWYgbm90IGZvdW5kXG5cdHRlc3QocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGUgcGFyc2UgYHN0YWNrYCBhbHJlYWR5IGNvbnRhaW4gYHJ1bGVgP1xuXHRzdGF0aWMgc3RhY2tDb250YWlucyhzdGFjaywgcnVsZSwgc3RyZWFtKSB7XG5cdFx0aWYgKHN0YWNrLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGZhbHNlO1xuXG4vL2NvbnNvbGUuaW5mbyhzdGFjayk7XG5cdFx0Ly8gZ28gYmFja3dhcmRzXG5cdFx0Zm9yICh2YXIgaSA9IHN0YWNrLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRsZXQgWyBuZXh0UnVsZSwgbmV4dFN0cmVhbSBdID0gc3RhY2tbaV07XG5cdFx0XHRpZiAobmV4dFJ1bGUgPT09IHJ1bGUpIHtcblx0XHRcdFx0aWYgKG5leHRTdHJlYW0uc3RhcnRJbmRleCA9PT0gc3RyZWFtLnN0YXJ0SW5kZXgpIHtcbi8vXHRcdFx0XHRcdGNvbnNvbGUud2FybihcImZvdW5kIHVucHJvZHVjdGl2ZSBydWxlIFwiLCBydWxlLCBcIiBvbiBzdGFja1wiLCBzdGFjayk7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG4vL1x0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJmb3VuZCBwcm9kdWN0aXZlIHJ1bGUgXCIsIHJ1bGUsIFwiIG9uIHN0YWNrXCIsIHN0YWNrKTtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cbi8vXG4vLyAjIyBvdXRwdXQgYXMgc291cmNlXG4vL1xuXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBOT1RFOiB5b3UgbWF5IHdhbnQgdG8gbWVtb2l6ZSB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvLyBPdXRwdXQgdmFsdWUgZm9yIHRoaXMgSU5TVEFOVElBVEVEIHJ1bGUgYXMgc291cmNlLlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG5cblxuLy8gREVCVUc6IG1ha2UgYFJ1bGVgIGdsb2JhbCBmb3IgZGVidWdnaW5nLlxuZ2xvYmFsLlJ1bGUgPSBSdWxlO1xuXG5cblxuLy8gUmVnZXggcGF0dGVybi5cbi8vIGBydWxlLnBhdHRlcm5gIGlzIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2guXG4vL1xuLy8gTk9URVx0VG8gbWFrZSB0aGlzIG1vcmUgZ2VuZXJhbGx5IGFwcGxpY2FibGUsIGRvIE5PVCBzdGFydCB0aGUgcGF0dGVybiB3aXRoIGEgYF5gLlxuLy9cdFx0V2UnbGwgYXV0b21hdGljYWxseSBtYWtlIGEgY29weSBvZiB0aGUgUmVnRXhwIHdpdGggdGhlIHN0YXJ0IHBvaW50IGF0dGFjaGVkXG4vL1x0XHRhbmQgdXNlIHRoYXQgYXMgYXBwcm9wcmlhdGUuXG4vL1xuLy9cdFx0VGhpcyB3YXkgd2UgY2FuIHJlLXVzZSB0aGUgcmVnZXggdG8gY2hlY2sgZm9yIGEgbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLi4uXG4vL1xuLy8gWW91IGNhbiBvcHRpb25hbGx5IHNwZWNpZnkgYSBgcnVsZS5ibGFja2xpc3RgLCBhIHNldCBvZiBtYXRjaGVzIHdoaWNoIHdpbGwgc3BlY2lmaWNhbGx5IE5PVCB3b3JrLFxuLy9cdGVnIGZvciBgaWRlbnRpZmllci5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0Ly8gYHN0YXJ0UGF0dGVybmAgaXMgdGhlIHNhbWUgYXMgb3VyIHBhdHRlcm4gZXhjZXB0IGl0IHdpbGwgb25seSBtYXRjaCBhdCB0aGUgQkVHSU5OSU5HIG9mIGEgc3RyaW5nLlxuXHRnZXQgc3RhcnRQYXR0ZXJuKCkge1xuXHRcdGlmICghdGhpcy5fX3N0YXJ0UGF0dGVybikge1xuXHRcdFx0Ly8gYHBhdHRlcm5gIGlzIHJlcXVpcmVkXG5cdFx0XHRpZiAoIXRoaXMucGF0dGVybikgdGhyb3cgbmV3IFR5cGVFcnJvcih0aGlzK1wiOiBZb3UgbXVzdCBzcGVjaWZ5IGEgYHBhdHRlcm5gIHBhcmFtZXRlclwiKTtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcIl9fc3RhcnRQYXR0ZXJuXCIsIHtcblx0XHRcdFx0dmFsdWU6IG5ldyBSZWdFeHAoXCJeXCIgKyB0aGlzLnBhdHRlcm4uc291cmNlKVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLl9fc3RhcnRQYXR0ZXJuO1xuXHR9XG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHBhdHRlcm4gYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRsZXQgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5zdGFydFBhdHRlcm4pO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBiYWlsIGlmIHByZXNlbnQgaW4gYmxhY2tsaXN0XG5cdFx0bGV0IG1hdGNoZWQgPSBtYXRjaFswXTtcblx0XHRpZiAodGhpcy5ibGFja2xpc3QgJiYgdGhpcy5ibGFja2xpc3RbbWF0Y2hlZF0pIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgZW5kSW5kZXggPSBzdHJlYW0uc3RhcnRJbmRleCArIG1hdGNoZWQubGVuZ3RoO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgZW5kSW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFBhdHRlcm5zIGFyZSBBTFdBWVMgZGV0ZXJtaW5pc3RpYy5cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIHBhdHRlcm5pcyBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljIChidXQgYWxsIHBhdHRlcm5zIGFyZSBkZXRlcm1pbmlzdGljKVxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmRcblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBtYXRjaCA9IHN0cmVhbS5tYXRjaCh0aGlzLnBhdHRlcm4pO1xuXHRcdGlmIChtYXRjaCkge1xuXHRcdFx0bWF0Y2guZW5kSW5kZXggPSAobWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgpO1xuXHRcdFx0cmV0dXJuIG1hdGNoO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRhZGRUb0JsYWNrbGlzdCguLi53b3Jkcykge1xuXHRcdGlmICghdGhpcy5ibGFja2xpc3QpIHRoaXMuYmxhY2tsaXN0ID0ge307XG5cdFx0d29yZHMuZm9yRWFjaCh3b3JkID0+IHRoaXMuYmxhY2tsaXN0W3dvcmRdID0gdHJ1ZSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5wYXR0ZXJuLnNvdXJjZTtcblx0fVxufVxuXG4vLyBSdWxlIGZvciBsaXRlcmFsIHN0cmluZyB2YWx1ZSwgd2hpY2ggaW5jbHVkZSBwdW5jdHVhdGlvbiBzdWNoIGFzIGAoYCBldGMuXG4vLyBgU3ltYm9sYHMgYXJlIGRpZmZlcmVudCBmcm9tIGBLZXl3b3Jkc2AgaW4gdGhhdCB0aGV5IGRvIG5vdCByZXF1aXJlIGEgd29yZCBib3VuZGFyeS5cbi8vVE9ETzogcmVuYW1lIGBTeW1ib2xgPz8/XG5SdWxlLlN5bWJvbCA9IGNsYXNzIFN5bWJvbCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgc3RyaW5nYCBpcyByZXF1aWVkLlxuXHRcdGlmICghcHJvcGVydGllcy5zdHJpbmcpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5TeW1ib2woKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gY29udmVydCBzdHJpbmcgdG8gcGF0dGVyblxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBQYXJzZXIuUmVnRXhwRnJvbVN0cmluZyhwcm9wZXJ0aWVzLnN0cmluZyk7XG4vL2NvbnNvbGUuaW5mbyhwcm9wZXJ0aWVzLnN0cmluZywgcHJvcGVydGllcy5wYXR0ZXJuKTtcblx0XHR9XG5cbi8vXHRcdGNvbnNvbGUuaW5mbyhcImNyZWF0aW5nIHN0cmluZ1wiLCBwcm9wZXJ0aWVzKTtcblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMuc3RyaW5nfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuLy8gTWVyZ2UgdHdvIFN5bWJvbCBydWxlcyB0b2dldGhlciwgcmV0dXJuaW5nIGEgbmV3IHJ1bGUgdGhhdCBtYXRjaGVzIGJvdGguXG5SdWxlLm1lcmdlU3ltYm9scyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0Ly8gR2V0IGN1c3RvbSBjb25zdHJ1Y3RvciBpZiB0aGVyZSBpcyBvbmUuLi5cblx0bGV0IGNvbnN0cnVjdG9yID0gZmlyc3QuY29uc3RydWN0b3IgIT09IFJ1bGUuU3ltYm9sID8gZmlyc3QuY29uc3RydWN0b3IgOiBzZWNvbmQuY29uc3RydWN0b3I7XG5cdHJldHVybiBuZXcgY29uc3RydWN0b3IoeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cbi8vIEtleXdvcmQgcGF0dGVybi5cbi8vIFByb3BlcnRpZXM6XG4vL1x0LSBgcnVsZS5zdHJpbmdgIFx0KHJlcXVpcmVkKSBcdEtleXdvcmQgc3RyaW5nIHRvIG1hdGNoLlxuLy9cdC0gYHJ1bGUucGF0dGVybmBcdChvcHRpb25hbCkgXHRSZWdFeHAgZm9yIHRoZSBtYXRjaC5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0V2UnbGwgY3JlYXRlIG9uZSBmcm9tIGBzdHJpbmdgIGlmIG5lY2Vzc2FyeS5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0Tk9URTogZG8gTk9UIHN0YXJ0IHRoZSBgcGF0dGVybmAgd2l0aCBgXmAuXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLktleXdvcmQoKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gZGVyaXZlIGBwYXR0ZXJuYCBpZiBuZWNlc3NhcnkuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdC8vIGVuZm9yY2Ugd29yZCBib3VuZGFyaWVzIGFuZCBhbGxvdyBhcmJpdHJhcnkgc3BhY2UgYmV0d2VlbiB3b3Jkc1xuXHRcdFx0bGV0IHBhdHRlcm5TdHJpbmcgPSBQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhwcm9wZXJ0aWVzLnN0cmluZyk7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKFwiXFxcXGJcIiArIHBhdHRlcm5TdHJpbmcgKyBcIlxcXFxiXCIpO1xuXHRcdH1cblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuLy8gTWVyZ2UgdHdvIEtleXdvcmQgcnVsZXMgdG9nZXRoZXIsIGFkZGluZyB0aGUgc2Vjb25kIHRvIHRoZSBmaXJzdC5cblJ1bGUubWVyZ2VLZXl3b3JkcyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0Ly8gR2V0IGN1c3RvbSBjb25zdHJ1Y3RvciBpZiB0aGVyZSBpcyBvbmUuLi5cblx0bGV0IGNvbnN0cnVjdG9yID0gZmlyc3QuY29uc3RydWN0b3IgIT09IFJ1bGUuS2V5d29yZCA/IGZpcnN0LmNvbnN0cnVjdG9yIDogc2Vjb25kLmNvbnN0cnVjdG9yO1xuXHRyZXR1cm4gbmV3IGNvbnN0cnVjdG9yKHsgc3RyaW5nOiBmaXJzdC5zdHJpbmcgKyBcIiBcIiArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cblxuLy8gU3VicnVsZSAtLSBuYW1lIG9mIGFub3RoZXIgcnVsZSB0byBiZSBjYWxsZWQuXG4vLyBgcnVsZS5ydWxlYCBpcyB0aGUgbmFtZSBvZiB0aGUgcnVsZSBpbiBgcGFyc2VyLnJ1bGVzYC5cblJ1bGUuU3VicnVsZSA9IGNsYXNzIFN1YnJ1bGUgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZU9yRGllKHRoaXMucnVsZSwgXCJydWxlXCIpO1xuXHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIG1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gbWF0Y2g7XG5cdH1cblxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy5ydWxlLCBcInJ1bGVcIik7XG5cdFx0cmV0dXJuIHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmQgb3Jcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYy5cblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnJ1bGUsIFwicnVsZVwiKTtcblx0XHRyZXR1cm4gcnVsZS50ZXN0KHBhcnNlciwgc3RyZWFtKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgeyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlfX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuXG4vLyBBYnN0cmFjdDogIGBOZXN0ZWRgIHJ1bGUgLS0gY29tcG9zZWQgb2YgYSBzZXJpZXMgb2Ygb3RoZXIgYHJ1bGVzYC5cblJ1bGUuTmVzdGVkID0gY2xhc3MgTmVzdGVkIGV4dGVuZHMgUnVsZSB7XG5cblx0Ly8gSXMgdGhpcyBkZXRlcm1pbmlzdGljLCBlZzogYXJlIG91ciBzdWJydWxlcyB1bmFtYmlnb3VzbHkgZGV0ZXJtaW5hYmxlP1xuLy9UT0RPOiBtZW1vaXplP1xuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlcy5ldmVyeShydWxlID0+IHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSk7XG5cdH1cbn1cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaCAoYXV0by1leGNsdWRpbmcgd2hpdGVzcGFjZSkuXG5SdWxlLlNlcXVlbmNlID0gY2xhc3MgU2VxdWVuY2UgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0Ly8gSWYgd2UgaGF2ZSBhIGB0ZXN0UnVsZWAgZGVmaW5lZFxuXHRcdGlmICh0aGlzLnRlc3RSdWxlKSB7XG5cdFx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy50ZXN0UnVsZSwgXCJ0ZXN0UnVsZVwiKTtcblx0XHRcdGlmIChydWxlLnRlc3QocGFyc2VyLCBzdHJlYW0pID09PSBmYWxzZSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHRpZiAoUnVsZS5zdGFja0NvbnRhaW5zKHN0YWNrLCB0aGlzLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0c3RhY2sgPSBzdGFjay5jb25jYXQoKTtcblx0XHRcdHN0YWNrLnB1c2goW3RoaXMsIHN0cmVhbV0pO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNodW5raXQpIHJldHVybiB0aGlzLnBhcnNlSW5DaHVua3MocGFyc2VyLCBzdHJlYW0sIHN0YWNrKTtcblxuXHRcdGxldCBtYXRjaGVkID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFtYXRjaCAmJiAhcnVsZS5vcHRpb25hbCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0XHRuZXh0ID0gbWF0Y2gubmV4dCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBpZiB3ZSBnZXQgaGVyZSwgd2UgbWF0Y2hlZCBhbGwgdGhlIHJ1bGVzIVxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG4vLyBcdHBhcnNlSW5DaHVua3MocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG4vL1xuLy8gXHR9XG5cbi8vVE9ET0Ncblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gb2JqZWN0IHdpdGggcHJvcGVydGllcyBmcm9tIHRoZSBgbWF0Y2hlZGAgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGBtYXRjaC5hcmd1bWVudGA6XHRcdGFyZ3VtZW50IHNldCB3aGVuIHJ1bGUgd2FzIGRlY2xhcmVkLCBlZzogYHt2YWx1ZTpsaXRlcmFsfWAgPT4gYHZhbHVlYFxuXHQvL1x0XHQtIGBtYXRjaC5ydWxlTmFtZWA6XHRcdG5hbWUgb2YgcnVsZSB3aGVuIGRlZmluZWRcblx0Ly9cdFx0LSBgcnVsZSB0eXBlYDpcdFx0XHRcdG5hbWUgb2YgdGhlIHJ1bGUgdHlwZVxuXHQvLyBOT1RFOiBtZW1vaXplcyB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IHJlc3VsdHMgPSB7fTtcblx0XHRmb3IgKGxldCBtYXRjaCBvZiB0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGxldCBhcmdOYW1lID0gbWF0Y2guYXJndW1lbnQgfHwgbWF0Y2gucnVsZU5hbWUgfHwgbWF0Y2guY29uc3RydWN0b3IubmFtZTtcblxuXHRcdFx0Ly8gSWYgYXJnIGFscmVhZHkgZXhpc3RzLCBjb252ZXJ0IHRvIGFuIGFycmF5XG5cdFx0XHRpZiAoYXJnTmFtZSBpbiByZXN1bHRzKSB7XG5cdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShyZXN1bHRzW2FyZ05hbWVdKSkgcmVzdWx0c1thcmdOYW1lXSA9IFtyZXN1bHRzW2FyZ05hbWVdXTtcblx0XHRcdFx0cmVzdWx0c1thcmdOYW1lXS5wdXNoKG1hdGNoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdID0gbWF0Y2g7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBleHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIFN0YXRlbWVudHMgdGFrZSB1cCB0aGUgZW50aXJlIGxpbmUuXG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXgsIG1hdGNoaW5nIG9uZSBvZiBhIG51bWJlciBvZiBkaWZmZXJlbnQgcnVsZXMuXG4vLyBUaGUgcmVzdWx0IG9mIGEgcGFyc2UgaXMgdGhlIGxvbmdlc3QgcnVsZSB0aGF0IGFjdHVhbGx5IG1hdGNoZWQuXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIGFsdGVybmF0aXZlcyBhcmUgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYy5cblx0Ly9cdC0gcmVnZXggbWF0Y2ggaWYgZm91bmQsXG5cdC8vXHQtIGBmYWxzZWAgaWYgbm90IGZvdW5kIG9yXG5cdHRlc3QocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRpZiAoIXRoaXMuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRsZXQgYmVzdE1hdGNoO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS50ZXN0KHBhcnNlciwgc3RyZWFtKTtcblx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRtYXRjaC5lbmRJbmRleCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuXHRcdFx0XHRyZXR1cm4gbWF0Y2g7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIEZpbmQgYWxsIHJ1bGVzIHdoaWNoIG1hdGNoIGFuZCBkZWxlZ2F0ZSB0byBgZ2V0QmVzdE1hdGNoKClgIHRvIHBpY2sgdGhlIGJlc3Qgb25lLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRsZXQgbWF0Y2hlcyA9IFtdO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXHRcdFx0aWYgKG1hdGNoKSBtYXRjaGVzLnB1c2gobWF0Y2gpO1xuXHRcdH1cblxuXHRcdGlmICghbWF0Y2hlcy5sZW5ndGgpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyB1bmNvbW1lbnQgdGhlIGJlbG93IHRvIHByaW50IGFsdGVybmF0aXZlc1xuXHRcdC8vIGlmIChtYXRjaGVzLmxlbmd0aCA+IDEpIHtcblx0XHQvL1x0Y29uc29sZS5pbmZvKHRoaXMuYXJndW1lbnQgfHwgdGhpcy5ydWxlTmFtZSwgbWF0Y2hlcywgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gubWF0Y2hlZFRleHQpKTtcblx0XHQvLyB9XG5cblx0XHRsZXQgYmVzdE1hdGNoID0gKG1hdGNoZXMubGVuZ3RoID09PSAxID8gbWF0Y2hlc1swXSA6IHRoaXMuZ2V0QmVzdE1hdGNoKG1hdGNoZXMpKTtcblxuXHRcdC8vIGFzc2lnbiBgYXJnTmFtZWAgb3IgYHJ1bGVOYW1lYCBmb3IgYHJlc3VsdHNgXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIGJlc3RNYXRjaC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0ZWxzZSBpZiAodGhpcy5ydWxlTmFtZSkgYmVzdE1hdGNoLnJ1bGVOYW1lID0gdGhpcy5ydWxlTmFtZTtcbi8vVE9ETzogb3RoZXIgdGhpbmdzIHRvIGNvcHkgaGVyZT8/P1xuXG5cdFx0cmV0dXJuIGJlc3RNYXRjaDtcblx0fVxuXG5cdC8vIFJldHVybiB0aGUgXCJiZXN0XCIgbWF0Y2ggZ2l2ZW4gbW9yZSB0aGFuIG9uZSBtYXRjaGVzIGF0IHRoZSBoZWFkIG9mIHRoZSBzdHJlYW0uXG5cdC8vIERlZmF1bHQgaXMgdG8gcmV0dXJuIHRoZSBsb25nZXN0IG1hdGNoLlxuXHQvLyBJbXBsZW1lbnQgc29tZXRoaW5nIGVsc2UgdG8gZG8sIGVnLCBwcmVjZWRlbmNlIHJ1bGVzLlxuXHRnZXRCZXN0TWF0Y2gobWF0Y2hlcykge1xuXHRcdHJldHVybiBtYXRjaGVzLnJlZHVjZShmdW5jdGlvbiAoYmVzdCwgbmV4dCkge1xuXHRcdFx0aWYgKG5leHQuZW5kSW5kZXggPiBiZXN0LmVuZEluZGV4KSByZXR1cm4gbmV4dDtcblx0XHRcdHJldHVybiBiZXN0O1xuXHRcdH0sIG1hdGNoZXNbMF0pO1xuXHR9XG5cblx0YWRkUnVsZShydWxlKSB7XG5cdFx0dGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoY29udGV4dCk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCgke3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZXMuam9pbihcInxcIil9KSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBSZXBlYXRpbmcgcnVsZS5cbi8vXHRgdGhpcy5ydWxlYCBpcyB0aGUgcnVsZSB0aGF0IHJlcGVhdHMuXG4vL1xuLy8gQWZ0ZXIgbWF0Y2hpbmc6XG4vL1x0YHRoaXMubWF0Y2hlZGAgaXMgYXJyYXkgb2YgcmVzdWx0cyBvZiBtYXRjaGVzLlxuLy9cbi8vXHRBdXRvbWF0aWNhbGx5IGNvbnN1bWVzIHdoaXRlc3BhY2UgYmVmb3JlIHJ1bGVzLlxuLy9cdElmIGRvZXNuJ3QgbWF0Y2ggYXQgbGVhc3Qgb25lLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuUnVsZS5SZXBlYXQgPSBjbGFzcyBSZXBlYXQgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCBzdHJlYW1dKTtcblx0XHR9XG5cblx0XHRsZXQgbmV4dCA9IHN0cmVhbTtcblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgbWF0Y2ggPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIW1hdGNoKSBicmVhaztcblxuXHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdG5leHQgPSBtYXRjaC5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gYXJyYXkgd2l0aCBhcmd1bWVudHMgb2YgYWxsIHJlc3VsdHMuXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gucmVzdWx0cyApO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0dGhyb3cgXCJEb24ndCB1bmRlcnN0YW5kIGhvdyB0byBzb3VyY2UgUnVsZS5SZXBlYXQhXCI7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRjb25zdCBydWxlID0gKHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UgfHwgdGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHRoaXMucnVsZS5zdHJpbmcuaW5jbHVkZXMoXCIgXCIpXG5cdFx0XHRcdCAgID8gYCgke3RoaXMucnVsZX0pYFxuXHRcdFx0XHQgICA6IGAke3RoaXMucnVsZX1gXG5cdFx0XHRcdCk7XG5cdFx0cmV0dXJuIGAke3J1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe251bWJlcn0sXWAgdG8gbWF0Y2ggYDEsMiwzYFxuLy9cdGBydWxlLml0ZW1gIGlzIHRoZSBydWxlIGZvciBlYWNoIGl0ZW0sXG4vL1x0YHJ1bGUuZGVsaW1pdGVyYCBpcyB0aGUgZGVsaW1pdGVyIGJldHdlZW4gZWFjaCBpdGVtLlxuLy8gXHRgcnVsZS5tYXRjaGVkYCBpbiB0aGUgb3V0cHV0IGlzIHRoZSBsaXN0IG9mIHZhbHVlcy5cbi8vXG4vL1xuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYSBMaXN0IHJ1bGUgd2lsbCBOT1QgcmVwZWF0ICg/Pz8/KVxuUnVsZS5MaXN0ID0gY2xhc3MgTGlzdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2sgPSBbXSkge1xuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdGlmIChSdWxlLnN0YWNrQ29udGFpbnMoc3RhY2ssIHRoaXMsIHN0cmVhbSkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRzdGFjayA9IHN0YWNrLmNvbmNhdCgpO1xuXHRcdFx0c3RhY2sucHVzaChbdGhpcywgc3RyZWFtXSk7XG5cdFx0fVxuXG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFpdGVtKSBicmVhaztcbi8vY29uc29sZS5sb2coaXRlbSk7XG5cdFx0XHRtYXRjaGVkLnB1c2goaXRlbSk7XG5cdFx0XHRuZXh0ID0gaXRlbS5uZXh0KCk7XG5cblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBkZWxpbWl0ZXIsIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgZGVsaW1pdGVyID0gdGhpcy5kZWxpbWl0ZXIucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0ID0gZGVsaW1pdGVyLm5leHQoKTtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSBkaWRuJ3QgZ2V0IGFueSBtYXRjaGVzLCBmb3JnZXQgaXQuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IG1hdGNoZWRbMF0gPyBtYXRjaGVkWzBdLnN0YXJ0SW5kZXggOiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybiBtYXRjaGVkIGl0ZW0gYnkgaW5kZXhcblx0Z2V0SXRlbShpbmRleCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWRbaW5kZXhdO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1x0XHQvLyBUT0RPOiB0aHJvdz8/P1xuXHRcdGxldCBtYXRjaGVkID0gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gudG9Tb3VyY2UoY29udGV4dCkgKS5qb2luKFwiLCBcIik7XG5cdFx0cmV0dXJuIGBbJHttYXRjaGVkfV1gO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiLy8gU3BlbGwgXCJFbmdsaXNoXCIgcGFyc2VyIHN0cmF3bWFuXG5cbi8vIFRPRE86XHRgdGVzdGAgZnVuY3Rpb24gZm9yIHF1aWNrIG5vLWdvb2QgaGl0IG9uIGB7YX0gYmxhaCBibGFoIHtifWA/XG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcms6ICAgYHtleHByZXNzaW9ufSBpcyB7ZXhwcmVzc2lvbn1gXG4vLyBUT0RPOlx0YnJlYWsgYGZpbGVgIGludG8gbGluZXMgYW5kIHByb2Nlc3MgZWFjaCAoaW5jbC4gc3Vic3RyL21hdGNoIG5vdCBnb2luZyBiZXlvbmQgdGhlIGVuZClcbi8vIFRPRE86XHRuZXN0aW5nIC0tIGlzIHRoaXMganVzdCBpbmRlbnQgPSBcImFkZCBibG9jayBzY29wZVwiXG4vLyBUT0RPOlx0cHJvbW90aW9uIHBhdHRlcm4gZm9yIGdhdGhlciBhcmd1bWVudHMgKGVnOiBsaXRlcmFsLWxpc3QpID8/P1xuLy8gVE9ETzpcdFdoYXQgZG9lcyBzeW50YXggdHJlZSBsb29rIGxpa2U/ICBIb3cgZG8gd2UgZXh0cmFjdCBtZWFuaW5nIG91dCBvZiB0aGUgbmVzdD9cbi8vIFRPRE86XHRQYXNzIGBjb250ZXh0YCB0byB0b1NvdXJjZSgpLCBhZGQgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYGNsYXNzYCwgdmFyaWFibGVzIGFuZCBjb2RlIHRvIGBtZXRob2RgLCBgZ2xvYmFsYCBzdHVmZiBldGNcblxuaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ2xvbmUgcnVsZXMsIHN0YXJ0aW5nIHdpdGggYSBjb21wbGV0ZWx5IGVtcHR5IG1hcCBpZiBub3QgZGVmaW5lZCAobm8gc3RhbmRhcmQgb2JqZWN0IGtleXMpXG5cdFx0dGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5ydWxlcyB8fCBudWxsKTtcblx0fVxuXG5cdGdldFJ1bGUobmFtZSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzW25hbWVdO1xuXHR9XG5cblx0Z2V0UnVsZU9yRGllKG5hbWUsIHByb3BlcnR5TmFtZSkge1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGAke3Byb3BlcnR5TmFtZX0gcnVsZSAnJHtuYW1lfScgbm90IGZvdW5kYCk7XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblxuLy9cbi8vIyMjIFBhcnNpbmdcbi8vXG5cdC8vIFBhcnNlIHNvbWV0aGluZzpcblx0Ly9cdC0gaWYgb25lIHN0cmluZyBhcmd1bWVudCwgZG9lcyBhIGBjb21waWxlU3RhdGVtZW50cygpYFxuXHQvL1x0LSBpZiB0d28sIGRvZXMgYSBgcGFyc2VSdWxlKClgIGFuZCBvdXRwdXRzIHRoZSByZXN1bHRzLlxuXHQvLyBSZXR1cm5zIGBwYXJzZS50b1N0cmluZygpYCBvciB0aHJvd3MuXG4vL1RFU1RNRVxuXHRjb21waWxlKCkge1xuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRsZXQgc3RyaW5nID0gYXJndW1lbnRzWzBdO1xuXHRcdFx0cmV0dXJuIHRoaXMuY29tcGlsZVN0YXRlbWVudHMoc3RyaW5nKTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0bGV0IG5hbWUgPSBhcmd1bWVudHNbMF0sIHN0cmluZyA9IGFyZ3VtZW50c1sxXTtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnBhcnNlKG5hbWUsIHN0cmluZyk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZXIucGFyc2UoJyR7bmFtZX0nLCAnJHtzdHJpbmd9Jyk6IGNhbid0IHBhcnNlIHRoaXNgKTtcblx0XHRcdHJldHVybiByZXN1bHQudG9Tb3VyY2UodGhpcyk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKFwicGFyc2VyLnBhcnNlKCk6IGV4cGVjdHMgb25lIG9yIHR3byBhcmd1bWVudHNcIik7XG5cdFx0fVxuXHR9XG5cblx0Ly8gUGFyc2UgYG5hbWVgZCBydWxlIGF0IGhlYWQgb2YgYHN0cmVhbWAgKGBzdHJpbmdgIG9yIGBUZXh0U3RyZWFtYCkuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cbi8vVEVTVE1FXG5cdHBhcnNlKG5hbWUsIHN0cmVhbSkge1xuXHRcdGlmICh0eXBlb2Ygc3RyZWFtID09PSBcInN0cmluZ1wiKSBzdHJlYW0gPSBuZXcgVGV4dFN0cmVhbShzdHJlYW0pO1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZXIucGFyc2UoJHtuYW1lfSk6IFJ1bGUgbm90IGZvdW5kYCk7XG5cdFx0c3RyZWFtID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJ1bGUucGFyc2UodGhpcywgc3RyZWFtKTtcblx0fVxuXG5cdC8vIFBhcnNlIGEgc2V0IG9mIHN0YXRlbWVudHMgbGluZS1ieS1saW5lLlxuLy9URVNUTUVcblx0Y29tcGlsZVN0YXRlbWVudHMoc3RhdGVtZW50cykge1xuXHRcdGNvbnNvbGUudGltZShcInBhcnNlU3RhdGVtZW50c1wiKTtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdGxldCBjdXJyZW50SW5kZW50ID0gMDtcblx0XHRjb25zdCB0YWJzID0gXCJcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcIjtcblx0XHQvL1xuXHRcdHN0YXRlbWVudHMuc3BsaXQoL1xcbi9nKS5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG5cdFx0XHQvLyBza2lwIGxpbmVzIHRoYXQgYXJlIGFsbCB3aGl0ZXNwYWNlXG5cdFx0XHRpZiAoc3RhdGVtZW50LnRyaW0oKSA9PT0gXCJcIikge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCJcIik7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpbmRlbnQgbGV2ZWwgb2YgdGhpcyBsaW5lXG5cdFx0XHRsZXQgbGluZVN0YXJ0ID0gc3RhdGVtZW50Lm1hdGNoKC9eXFx0Ki8pWzBdO1xuXHRcdFx0bGV0IGxpbmVJbmRlbnQgPSBsaW5lU3RhcnQubGVuZ3RoO1xuXHRcdFx0aWYgKGxpbmVJbmRlbnQgPiBjdXJyZW50SW5kZW50KSB7XG5cdFx0XHRcdC8vIGFkZCB0byBlbmQgb2YgcHJldmlvdXMgbGluZSBpZiBwb3NzaWJsZVxuXHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGgpIHtcblx0XHRcdFx0XHQvLyBidXQgb25seSBpZiBvdXRwdXQgaXMgbm90IGFscmVhZHkgaW5kZW50ZWQgdG8gdGhhdCBsZXZlbFxuLy9UT0RPOiBiYWNrdHJhY2sgZm9yIGNvbW1lbnRzISEhXG5cdFx0XHRcdFx0bGV0IGluZGVudGVkU3RhcnQgPSBsaW5lU3RhcnQgKyBcIlxcdFwiO1xuXHRcdFx0XHRcdGlmICghcmVzdWx0c1tyZXN1bHRzLmxlbmd0aCAtIDFdLnN0YXJ0c1dpdGgoaW5kZW50ZWRTdGFydCkpIHtcblx0XHRcdFx0XHRcdHJlc3VsdHNbcmVzdWx0cy5sZW5ndGggLSAxXSArPSBcIiB7XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuLy9jb25zb2xlLmluZm8oXCJhbHJlYWR5IGluZGVudGVkXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHJlc3VsdHMucHVzaCh0YWJzLnN1YnN0cigwLCBsaW5lSW5kZW50LTEpICsgXCJ7XCIpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAobGluZUluZGVudCA8IGN1cnJlbnRJbmRlbnQpIHtcblx0XHRcdFx0bGV0IGNsb3NlcnMgPSBbXTtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IGN1cnJlbnRJbmRlbnQ7IGkgPiBsaW5lSW5kZW50OyBpLS0pIHtcblx0XHRcdFx0XHRjbG9zZXJzLnB1c2godGFicy5zdWJzdHIoMCwgaS0xKSArIFwifVwiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBwdXQgcGFyZW5zIEJFRk9SRSBhbnkgYmxhbmsgbGluZXMhXG5cdFx0XHRcdGxldCBsYXN0QmxhbmtMaW5lID0gdGhpcy5fZ2V0TGFzdEJsYW5rTGluZShyZXN1bHRzKTtcblx0XHRcdFx0cmVzdWx0cy5zcGxpY2UobGFzdEJsYW5rTGluZSwgMCwgLi4uY2xvc2Vycyk7XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50SW5kZW50ID0gbGluZUluZGVudDtcblxuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMucGFyc2UoXCJzdGF0ZW1lbnRcIiwgc3RhdGVtZW50KTtcblx0XHRcdC8vIGNvbXBsYWluIGlmIG5vIHJlc3VsdFxuXHRcdFx0aWYgKCFyZXN1bHQpIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKGBDb3VsZG4ndCBwYXJzZSBzdGF0ZW1lbnQ6XFxuXFx0JHtzdGF0ZW1lbnQudHJpbSgpfWApO1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCIvLyBDQU5UIFBBUlNFOiBcIitzdGF0ZW1lbnQpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gY29tcGxhaW4gY2FuJ3QgcGFyc2UgdGhlIGVudGlyZSBsaW5lIVxuXHRcdFx0ZWxzZSBpZiAocmVzdWx0LmVuZEluZGV4ICE9PSBzdGF0ZW1lbnQubGVuZ3RoKSB7XG5cdFx0XHRcdGxldCB1bnBhcnNlZCA9IHN0YXRlbWVudC5zdWJzdHIocmVzdWx0LmVuZEluZGV4KTtcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiQ291bGRuJ3QgcGFyc2UgZW50aXJlIHN0YXRlbWVudDpcIixcblx0XHRcdFx0XHRcdFx0XHRgXFxuXFx0XCIke3N0YXRlbWVudC50cmltKCl9XCJgLFxuXHRcdFx0XHRcdFx0XHRcdGBcXG51bnBhcnNlZDpgLFxuXHRcdFx0XHRcdFx0XHRcdGBcXG5cXHRcIiR7dW5wYXJzZWR9XCJgKTtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKFwiLy8gQ0FOVCBQQVJTRSBFTlRJUkUgU1RBVEVNRU5UXCIpO1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCIvLyBQQVJTRUQgICAgOiBcIiArIHJlc3VsdC5tYXRjaGVkVGV4dCk7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChcIi8vIENBTlQgUEFSU0U6IFwiICsgdW5wYXJzZWQpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdC8vIHNwbGl0IGJ5IGxpbmVzIGFuZCBhZGQgaW5kZW50XG5cdFx0XHRcdGxldCBzb3VyY2UgPSByZXN1bHQudG9Tb3VyY2UodGhpcykuc3BsaXQoXCJcXG5cIilcblx0XHRcdFx0XHRcdFx0XHQubWFwKCBsaW5lID0+IGxpbmVTdGFydCArIGxpbmUgKTtcblx0XHRcdFx0cmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KHNvdXJjZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR3aGlsZSAoY3VycmVudEluZGVudCA+IDApIHtcblx0XHRcdHJlc3VsdHMucHVzaCh0YWJzLnN1YnN0cigwLCBjdXJyZW50SW5kZW50LTEpICsgXCJ9XCIpO1xuXHRcdFx0Y3VycmVudEluZGVudC0tO1xuXHRcdH1cblxuXHRcdGNvbnNvbGUudGltZUVuZChcInBhcnNlU3RhdGVtZW50c1wiKTtcblx0XHRyZXR1cm4gcmVzdWx0cy5qb2luKFwiXFxuXCIpO1xuXHR9XG5cblx0Ly8gRmlndXJlIG91dCB0aGUgbGFzdCBibGFuayBsaW5lIGluIHRoZSByZXN1bHRzXG5cdF9nZXRMYXN0QmxhbmtMaW5lKHJlc3VsdHMpIHtcblx0XHRmb3IgKGxldCBpID0gcmVzdWx0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0aWYgKHJlc3VsdHNbaV0gPT09IFwiXCIpIGNvbnRpbnVlO1xuXHRcdFx0cmV0dXJuIGkgKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gMDtcblx0fVxuXG5cdC8vIEVhdCB3aGl0ZXNwYWNlIChhY2NvcmRpbmcgdG8gYHJ1bGVzLndoaXRlc3BhY2VgKSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnMgbmV3IHN0cmVhbSBpZiB3ZSBtYXRjaGVkIHdoaXRlc3BhY2UsIG90aGVyd2lzZSB0aGUgc2FtZSBzdHJlYW0uXG5cdGVhdFdoaXRlc3BhY2Uoc3RyZWFtKSB7XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMucnVsZXMud2hpdGVzcGFjZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gc3RyZWFtO1xuXHRcdHJldHVybiBzdHJlYW0uYWR2YW5jZUJ5KHJlc3VsdC5tYXRjaGVkLmxlbmd0aCk7XG5cdH1cblxuLy9cbi8vXHRSdWxlc1xuLy9cblxuXHQvLyBBZGQgYSBydWxlIHRvIG91ciBsaXN0IG9mIHJ1bGVzIVxuXHQvLyBDb252ZXJ0cyB0byBgYWx0ZXJuYXRpdmVzYCBvbiByZS1kZWZpbmluZyB0aGUgc2FtZSBydWxlLlxuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHQvLyBkb24ndCBvdmVycmlkZSBydWxlTmFtZVxuXHRcdGlmICghcnVsZS5ydWxlTmFtZSkgcnVsZS5ydWxlTmFtZSA9IG5hbWU7XG5cblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLnJ1bGVzW25hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtuYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZTogbmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdC8vIGNvcHkgYXJndW1lbnQgbmFtZSBvdmVyICg/Pz8pXG5cdFx0XHRcdGlmIChleGlzdGluZy5hcmd1bWVudCkgdGhpcy5ydWxlc1tuYW1lXS5hcmd1bWVudCA9IGV4aXN0aW5nLmFyZ3VtZW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JyB0byAnJHtuYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXS5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBydWxlO1xuXHRcdH1cblxuXG5cdFx0Ly8gbWFrZSBhIG5vdGUgaWYgd2UncmUgYWRkaW5nIGEgbGVmdC1yZWN1cnNpdmUgcnVsZVxuXHRcdGlmICh0aGlzLnJ1bGVJc0xlZnRSZWN1cnNpdmUobmFtZSwgcnVsZSkpIHtcbi8vY29uc29sZS5pbmZvKFwibWFya2luZyBcIiwgcnVsZSwgXCIgYXMgbGVmdCByZWN1cnNpdmUhXCIpO1xuXHRcdFx0cnVsZS5sZWZ0UmVjdXJzaXZlID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cdC8vIElzIHRoZSBzcGVjaWZpZWQgcnVsZSBsZWZ0LXJlY3Vyc2l2ZT9cblx0cnVsZUlzTGVmdFJlY3Vyc2l2ZShuYW1lLCBydWxlKSB7XG5cdFx0aWYgKCEocnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UpKSByZXR1cm4gZmFsc2U7XG4vL2NvbnNvbGUubG9nKG5hbWUsIHJ1bGUpO1xuXHRcdGZvciAobGV0IHN1YnJ1bGUgb2YgcnVsZS5ydWxlcykge1xuXHRcdFx0Ly8gaWdub3JlIG9wdGlvbmFsIHJ1bGVzXG5cdFx0XHRpZiAoc3VicnVsZS5vcHRpb25hbCkgY29udGludWU7XG5cdFx0XHRpZiAoc3VicnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3VicnVsZSAmJiBzdWJydWxlLnJ1bGUgPT09IG5hbWUpIHJldHVybiB0cnVlO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXG4vL1xuLy8gIyMgVXRpbGl0eSBtZXRob2RzXG4vL1xuXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gXG5cdC8vXHRpbiBhcnJheSBvZiBgdG9rZW5zYCAoc3RyaW5ncykuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cblxuXHQvLyBMaXN0IG9mIHNwZWNpYWwgY2hhcmFjdGVycyBpbiByZWd1bGFyIGV4cHJlc3Npb25zLlxuXHQvLyBVc2VkIHRvIGVzY2FwZSB0aG9zZSBjaGFycyB3aGVuIGNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbnMgZnJvbSBzdHJpbmdzLlxuXHRzdGF0aWMgUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyA9IChmdW5jdGlvbigpIHtcblx0XHRjb25zdCBjaGFycyA9IHt9O1xuXHRcdFwiXFxcXC9eJCorPy4oKXx7fSxbXVwiLnNwbGl0KFwiXCIpLmZvckVhY2goY2hhciA9PiBjaGFyc1tjaGFyXSA9IHRydWUpO1xuXHRcdHJldHVybiBjaGFycztcblx0fSkoKVxuXG5cdC8vIEdpdmVuIGEgXCJub3JtYWxcIiBgc3RyaW5nYCwgZXNjYXBlIGFueSByZWd1bGFyIGV4cHJlc3Npb24gc3BlY2lhbCBjaGFyYWN0ZXJzXG5cdC8vXHRzbyB3ZSBjYW4gY3JlYXRlIGEgYG5ldyBSZWdFeHAoKWAuXG5cdC8vIEFsc28gY29udmVydHMgYSBzaW5nbGUgc3BhY2UgdG8gYXJiaXRyYXJ5IHNldCBvZiBzcGFjZXMgd2l0aCBcIlxccytcIlxuXHRzdGF0aWMgZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpIHtcblx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KFwiXCIpLm1hcChmdW5jdGlvbiAoY2hhciwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3IgYmFja3NsYXNoXG5cdFx0XHRpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIjtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igc3BhY2Vcblx0XHRcdGlmIChjaGFyID09PSBcIiBcIikgcmV0dXJuIFwiXFxcXHMrXCI7XG5cdFx0XHQvLyBJZiBhIHNwZWNpYWwgY2hhciBhbmQgcHJldmlvdXMgY2hhcmFjdGVyIHdhcyBub3QgYW4gZXNjYXBlLCBlc2NhcGUgdGhlIHJlc3VsdC5cblx0XHRcdGlmIChQYXJzZXIuUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSU1tjaGFyXSAmJiBsaXN0W2luZGV4LTFdICE9PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiK2NoYXI7XG5cdFx0XHQvLyBUaGlzIGNoYXIgc2hvdWxkIGJlIGZpbmUgYnkgaXRzZWxmLlxuXHRcdFx0cmV0dXJuIGNoYXI7XG5cdFx0fSkuam9pbihcIlwiKTtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyByZWd1bGFyIGV4cHJlc3Npb24gZnJvbSBhIFwibm9ybWFsXCIgc3RyaW5nLCBlc2NhcGluZyBzcGVjaWFsIGNoYXJhY3RlcnMgYXMgbmVjZXNzYXJ5LlxuXHRzdGF0aWMgUmVnRXhwRnJvbVN0cmluZyhzdHJpbmcsIGZsYWdzKSB7XG5cdFx0cmV0dXJuIG5ldyBSZWdFeHAoUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSwgZmxhZ3MpO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXG4vL1x0IyBDb3JlIGBydWxlc2AgLS0gc2ltcGxlIGRhdGF0eXBlcywgZXRjLlxuLy9cbi8vIE5PVEU6IG1hbnkgb2YgdGhlIGJlbG93IGFyZSBjcmVhdGVkIGFzIGN1c3RvbSBQYXR0ZXJuIHN1YmNsYXNzZXMgZm9yIGRlYnVnZ2luZy5cbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGB3aGl0ZXNwYWNlYCBydWxlLlxuLy8gTk9URSBgcGFyc2VyLnBhcnNlUnVsZShcIndoaXRlc3BhY2VcIiwgXCIgICBcIilgIHdpbGwgcmV0dXJuIGB1bmRlZmluZWRgXG4vL1x0XHQgYmVjYXVzZSBgcGFyc2VyLnBhcnNlUnVsZSgpYCBhdXRvbWF0aWNhbGx5IGVhdHMgd2hpdGVzcGFjZSBhdCB0aGUgc3RhcnQgb2YgYSBydWxlLlxuUnVsZS5XaGl0ZXNwYWNlID0gY2xhc3Mgd2hpdGVzcGFjZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fVxucGFyc2VyLmFkZFJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIG5ldyBSdWxlLldoaXRlc3BhY2UoeyBwYXR0ZXJuOiAvXFxzKy8gfSkpO1xuXG5cbi8vIENvbW1lbnRcblJ1bGUuQ29tbWVudCA9IGNsYXNzIGNvbW1lbnQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge31cblxuXG4vLyBgd29yZGAgPSBpcyBhIHNpbmdsZSBhbHBoYW51bWVyaWMgd29yZC5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5Xb3JkID0gY2xhc3Mgd29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbnBhcnNlci5hZGRSdWxlKFwid29yZFwiLCBuZXcgUnVsZS5Xb3JkKHtcblx0cGF0dGVybjogL1xcYlthLXpdW1xcd1xcLV0qXFxiLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xuXG5cbi8vIGBpZGVudGlmaWVyYCA9IHZhcmlhYmxlcyBvciBwcm9wZXJ0eSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGEgbG93ZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLklkZW50aWZpZXIgPSBjbGFzcyBpZGVudGlmaWVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJpZGVudGlmaWVyXCIsIG5ldyBSdWxlLklkZW50aWZpZXIoe1xuXHRwYXR0ZXJuOiAvXFxiW2Etel1bXFx3XFwtXSpcXGIvLFxuXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHBhcnNlci5ydWxlcy5pZGVudGlmaWVyKTtcblxuLy8gQWRkIEVuZ2xpc2ggcHJlcG9zaXRpb25zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy9cbi8vIFdpa2lwZWRpYSBcIlByZXBvc2l0aW9uXCI6XG4vL1x0XCJQcmVwb3NpdGlvbnMuLi5hcmUgYSBjbGFzcyBvZiB3b3JkcyB0aGF0XG4vL1x0ZXhwcmVzcyBzcGF0aWFsIG9yIHRlbXBvcmFsIHJlbGF0aW9ucyAgKGluLCB1bmRlciwgdG93YXJkcywgYmVmb3JlKVxuLy9cdG9yIG1hcmsgdmFyaW91cyBzZW1hbnRpYyByb2xlcyAob2YsIGZvcikuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFib3V0XCIsIFwiYWJvdmVcIiwgXCJhZnRlclwiLCBcImFuZFwiLCBcImFzXCIsIFwiYXRcIixcblx0XCJiZWZvcmVcIiwgXCJiZWhpbmRcIiwgXCJiZWxvd1wiLCBcImJlbmVhdGhcIiwgXCJiZXNpZGVcIiwgXCJiZXR3ZWVuXCIsIFwiYmV5b25kXCIsIFwiYnlcIixcblx0XCJkZWZpbmVkXCIsIFwiZG93blwiLCBcImR1cmluZ1wiLFxuXHRcImVhY2hcIiwgXCJlbXB0eVwiLCBcImV4YWN0bHlcIiwgXCJleGNlcHRcIixcblx0XCJmb3JcIiwgXCJmcm9tXCIsXG5cdFwiZ3JlYXRlclwiLFxuXHRcIklcIiwgXCJpblwiLCBcImludG9cIixcblx0XCJsZXNzXCIsIFwibG9uZ1wiLFxuXHRcIm1lXCIsIFwibWludXNcIiwgXCJtb3JlXCIsXG5cdFwibmVhclwiLCBcIm5vdFwiLFxuXHRcIm9mXCIsIFwib2ZmXCIsIFwib25cIiwgXCJvbnRvXCIsIFwib3Bwb3NpdGVcIiwgXCJvdXRcIiwgXCJvdXRzaWRlXCIsIFwib3ZlclwiLFxuXHRcInNob3J0XCIsIFwic2luY2VcIixcblx0XCJ0aGFuXCIsIFwidGhlXCIsIFwidGhlblwiLCBcInRocm91Z2hcIiwgXCJ0aHJ1XCIsIFwidG9cIiwgXCJ0b3dhcmRcIiwgXCJ0b3dhcmRzXCIsXG5cdFwidW5kZWZpbmVkXCIsIFwidW5kZXJcIiwgXCJ1bmRlcm5lYXRoXCIsIFwidW5pcXVlXCIsIFwidW50aWxcIiwgXCJ1cFwiLCBcInVwb25cIiwgXCJ1cHNpZGVcIixcblx0XCJ2ZXJzdXNcIiwgXCJ2c1wiLFxuXHRcIndpdGhcIiwgXCJ3aXRoaW5cIiwgXCJ3aXRob3V0XCIsXG4pO1xuXG4vLyBBZGQgY29tbW9uIGVuZ2xpc2ggdmVyYnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhcmVcIixcblx0XCJkb1wiLCBcImRvZXNcIixcblx0XCJjb250YWluc1wiLFxuXHRcImhhc1wiLCBcImhhdmVcIixcblx0XCJpc1wiLFxuXHRcInJlcGVhdFwiLFxuXHRcIndhc1wiLCBcIndlcmVcIlxuKTtcblxuLy8gQWRkIHNwZWNpYWwgY29udHJvbCBrZXl3b3JkcyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImVsc2VcIixcblx0XCJpZlwiLFxuXHRcIm90aGVyd2lzZVwiLFxuXHRcIndoaWxlXCJcbik7XG5cbi8vIGBUeXBlYCA9IHR5cGUgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhbiB1cHBlci1jYXNlIGxldHRlciAoPylcblJ1bGUuVHlwZSA9IGNsYXNzIHR5cGUgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcInR5cGVcIiwgbmV3IFJ1bGUuVHlwZSh7XG5cdHBhdHRlcm46IC8oW0EtWl1bXFx3XFwtXSp8dGV4dHxudW1iZXJ8aW50ZWdlcnxkZWNpbWFsfGNoYXJhY3Rlcnxib29sZWFufG9iamVjdCkvLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0bGV0IHZhbHVlID0gdGhpcy5tYXRjaGVkO1xuXHRcdHN3aXRjaCh2YWx1ZSkge1xuXHRcdFx0Ly8gc3BlY2lhbCBjYXNlIHRvIHRha2UgdGhlIGZvbGxvd2luZyBhcyBsb3dlcmNhc2Vcblx0XHRcdGNhc2UgXCJ0ZXh0XCI6XHRcdHJldHVybiBcIlN0cmluZ1wiO1xuXHRcdFx0Y2FzZSBcImNoYXJhY3RlclwiOlx0cmV0dXJuIFwiQ2hhcmFjdGVyXCI7XG5cdFx0XHRjYXNlIFwibnVtYmVyXCI6XHRcdHJldHVybiBcIk51bWJlclwiO1xuXHRcdFx0Y2FzZSBcImludGVnZXJcIjpcdFx0cmV0dXJuIFwiSW50ZWdlclwiO1xuXHRcdFx0Y2FzZSBcImRlY2ltYWxcIjpcdFx0cmV0dXJuIFwiRGVjaW1hbFwiO1xuXHRcdFx0Y2FzZSBcImJvb2xlYW5cIjpcdFx0cmV0dXJuIFwiQm9vbGVhblwiO1xuXHRcdFx0Y2FzZSBcIm9iamVjdFwiOlx0XHRyZXR1cm4gXCJPYmplY3RcIjtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiB2YWx1ZS5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHRcdH1cblx0fVxufSkpO1xucGFyc2VyLnJ1bGVzLnR5cGUuYWRkVG9CbGFja2xpc3QoXCJJXCIpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHBhcnNlci5ydWxlcy50eXBlKTtcblxuXG4vLyBgbnVtYmVyYCBhcyBlaXRoZXIgZmxvYXQgb3IgaW50ZWdlciwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuUnVsZS5OdW1iZXIgPSBjbGFzcyBudW1iZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgUnVsZS5OdW1iZXIoe1xuXHRwYXR0ZXJuOiAvLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIG51bWJlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUZsb2F0KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLm51bWJlcik7XG5cblxuLy8gTnVtZXJpYyBgaW50ZWdlcmAgb25seSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gTk9URTogdGhpcyBXSUxMIG1hdGNoIGEgZmxvYXQsIGJ1dCB0aGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBjb2VyY2UgdG8gYW4gaW50ZWdlci5cbi8vIFJFVklFVzogaXMgdGhpcyByaWdodD8gIEJldHRlciB0byBub3QgbWF0Y2ggYSBmbG9hdD9cblJ1bGUuSW50ZWdlciA9IGNsYXNzIGludGVnZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImludGVnZXJcIiwgbmV3IFJ1bGUuSW50ZWdlcih7XG5cdHBhdHRlcm46IC8tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gaW50ZWdlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUludCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xuXG5cbi8vIExpdGVyYWwgYHRleHRgIHN0cmluZywgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gWW91IGNhbiB1c2UgZWl0aGVyIHNpbmdsZSBvciBkb3VibGUgcXVvdGVzIG9uIHRoZSBvdXRzaWRlIChhbHRob3VnaCBkb3VibGUgcXVvdGVzIGFyZSBwcmVmZXJyZWQpLlxuLy8gUmV0dXJuZWQgdmFsdWUgaGFzIGVuY2xvc2luZyBxdW90ZXMuXG4vLyBUT0RPOiBlc2NhcGVkIHF1b3RlcyBpbnNpZGUgc3RyaW5nXG5SdWxlLlRleHQgPSBjbGFzcyB0ZXh0IGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyBSdWxlLlRleHQoe1xuXHRwYXR0ZXJuOiAvKD86XCJbXlwiXSpcInwnW14nXSonKS9cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMudGV4dCk7XG5cblxuLy8gQm9vbGVhbiBsaXRlcmFsLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBUT0RPOiBiZXR0ZXIgbmFtZSBmb3IgdGhpcz8/P1xuUnVsZS5Cb29sZWFuID0gY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbnBhcnNlci5hZGRSdWxlKFwiYm9vbGVhblwiLCBuZXcgUnVsZS5Cb29sZWFuKHtcblx0cGF0dGVybjogLyh0cnVlfGZhbHNlfHllc3xub3xva3xjYW5jZWwpXFxiLyxcblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0Y2FzZSBcInRydWVcIjpcblx0XHRcdGNhc2UgXCJ5ZXNcIjpcblx0XHRcdGNhc2UgXCJva1wiOlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMuYm9vbGVhbik7XG4vLyBBZGQgYm9vbGVhbiB0b2tlbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcInRydWVcIiwgXCJmYWxzZVwiLFxuXHRcInllc1wiLCBcIm5vXCIsXG5cdFwib2tcIiwgXCJjYW5jZWxcIlxuKTtcblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGl0ZXJhbF9saXN0XCIsXG5cdFwiXFxcXFtbbGlzdDp7ZXhwcmVzc2lvbn0sXT9cXFxcXVwiLFxuXHRjbGFzcyBsaXRlcmFsX2xpc3QgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdGdldCByZXN1bHRzKCkge1xuXHRcdFx0cmV0dXJuIHN1cGVyLnJlc3VsdHMubGlzdDtcblx0XHR9XG5cblx0XHRnZXRJdGVtKGluZGV4KSB7XG5cdFx0XHRsZXQgbGlzdCA9IHRoaXMucmVzdWx0cztcblx0XHRcdGlmIChsaXN0KSByZXR1cm4gbGlzdC5tYXRjaGVkW2luZGV4XTtcblx0XHR9XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgbGlzdCA9IHRoaXMucmVzdWx0cztcblx0XHRcdGlmICghbGlzdCkgcmV0dXJuIFwiW11cIjtcbiBcdFx0XHRyZXR1cm4gbGlzdC50b1NvdXJjZShjb250ZXh0KTtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gUGFyZW50aGVzaXplZCBleHByZXNzaW9uXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicGFyZW50aGVzaXplZF9leHByZXNzaW9uXCIsXG5cdFwiXFxcXCh7ZXhwcmVzc2lvbn1cXFxcKVwiLFxuXHRjbGFzcyBwYXJlbnRoZXNpemVkX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdGdldCByZXN1bHRzKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMubWF0Y2hlZFsxXTtcblx0XHR9XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGV4cHJlc3Npb24gPSB0aGlzLnJlc3VsdHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyBkb24ndCBkb3VibGUgcGFyZW5zIGlmIG5vdCBuZWNlc3Nhcnlcblx0XHRcdGlmICh0eXBlb2YgZXhwcmVzc2lvbiA9PT0gXCJzdHJpbmdcIiAmJiBleHByZXNzaW9uLnN0YXJ0c1dpdGgoXCIoXCIpICYmIGV4cHJlc3Npb24uZW5kc1dpdGgoXCIpXCIpKSByZXR1cm4gZXhwcmVzc2lvbjtcblx0XHRcdHJldHVybiBgKCR7ZXhwcmVzc2lvbn0pYDtcblx0XHR9XG5cdH1cbilcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9jb3JlLmpzIiwiXG4vLyBUT0RPOiBjb252ZXJ0IHRvIGxpbmUtYXdhcmUgc3RyZWFtPz8/XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXh0U3RyZWFtIHtcblx0Ly8gWW91IGNhbiBjb25zdHJ1Y3Qgd2l0aCBhIHRleHQgc3RyaW5nIG9yIGEgc2V0IG9mIHByb3BlcnRpZXMgKGluY2x1ZGluZyBgdGV4dGApLlxuXHRjb25zdHJ1Y3RvciguLi50ZXh0T3JQcm9wcykge1xuXHRcdHRleHRPclByb3BzLmZvckVhY2goKGFyZykgPT4ge1xuXHRcdFx0aWYgKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0dGhpcy50ZXh0ID0gYXJnO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoYXJnKSB7XG5cdFx0XHRcdE9iamVjdC5hc3NpZ24odGhpcywgYXJnKTtcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0Ly8gTWFrZSBzdXJlIGB0ZXh0YCBhbmQgYHN0YXJ0SW5kZXhgIGFyZSBkZWZpbmVkLlxuXHRcdGlmICghKFwidGV4dFwiIGluIHRoaXMpKSB0aGlzLnRleHQgPSBcIlwiO1xuXHRcdGlmICghKFwic3RhcnRJbmRleFwiIGluIHRoaXMpKSB0aGlzLnN0YXJ0SW5kZXggPSAwO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGFuIGltbXV0YWJsZSBjbG9uZSBvZiB0aGUgc3RyZWFtLlxuXHRjbG9uZShwcm9wcykge1xuXHRcdHJldHVybiBuZXcgVGV4dFN0cmVhbSh0aGlzLCBwcm9wcyk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNlZCB0byBuZXcgc3RhcnRJbmRleC5cblx0YWR2YW5jZVRvKHN0YXJ0SW5kZXgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXggfSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNpbmcgc3RhcnRJbmRleCBCWSBgbGVuZ3RoYFxuXHRhZHZhbmNlQnkobGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG5cdH1cblxuLy8gXHQvLyBSZXR1cm4gY2xvbmUgb2YgdGhpcyBzdHJlYW0gd2l0aCBlbmRJbmRleCBzZXQgdG8gc3RhcnQgKyBgbGVuZ3RoYFxuLy8gXHRlbmRBZnRlcihsZW5ndGgpIHtcbi8vIFx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IGVuZEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG4vLyBcdH1cblxuLy9cbi8vICMjIE1hdGNoaW5nXG4vL1xuXHQvLyBNYXRjaCBgcGF0dGVybmAgYXMgcmVnZXggaW4gdGhpcyBzdHJlYW0uXG5cdC8vIFJldHVybnMgbWF0Y2ggb3IgYHVuZGVmaW5lZGAuXG5cdC8vIElmIHlvdSB3YW50IHRvIHRlc3QgdGhlIHN0YXJ0IG9mIHRoZSBzdHJlYW0sXG5cdC8vXHRtYWtlIHN1cmUgeW91ciByZWdleCBzdGFydHMgd2l0aCBgXmAuXG5cdC8vIFRFU1RNRTogdGhpcyBsaWtlbHkgYnJlYWtzIHdpdGggYSBgZ2Agb24gdGhlIHBhdHRlcm4/XG5cdG1hdGNoKHBhdHRlcm4pIHtcblx0XHRpZiAoIShwYXR0ZXJuIGluc3RhbmNlb2YgUmVnRXhwKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGV4dFN0cmVhbS5tYXRjaCgke3BhdHRlcm59KTogZXhwZWN0ZWQgUmVnRXhwYCk7XG4vL1RPRE86IHVzZSBgc3RyZWFtLnJhbmdlYCB0byBlbnN1cmUgbWF0Y2ggaXMgbm90IG5vdCBiZXlvbmQgYHN0cmluZy5lbmRJbmRleGBcblx0XHRyZXR1cm4gdGhpcy5oZWFkLm1hdGNoKHBhdHRlcm4pIHx8IHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIERvZXMgdGhpcyBzdHJlYW0gSU5DTFVERSBhIHJlZ2V4IHdpdGhpbiBpdD9cblx0Ly8gUmV0dXJucyBgdHJ1ZWAgb3IgYGZhbHNlYC5cblx0Ly8gTk9URTogUGF0dGVybiBtdXN0IE5PVCBzdGFydCB3aXRoIGBeYCBmb3IgdGhpcyB0byBtYXRjaCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBzdHJlYW0uXG5cdHRlc3QocGF0dGVybikge1xuXHRcdHJldHVybiBwYXR0ZXJuLnRlc3QodGhpcy5oZWFkKTtcblx0fVxuXG4vL1xuLy8gIyMgUmVmbGVjdGlvblxuLy9cblx0Ly8gUmV0dXJuIHRleHQgb2Ygc3RyaW5nIHN0YXJ0aW5nIGF0IG91ciBgc3RhcnRJbmRleGBcblx0Z2V0IGhlYWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMucmFuZ2UoKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIHJhbmdlIG9mIHRoZSBzdHJpbmcgZnJvbSBgc3RhcnRJbmRleGAgdG8gYGVuZEluZGV4YCBOT04taW5jbHVzaXZlLlxuXHRyYW5nZShzdGFydEluZGV4ID0gdGhpcy5zdGFydEluZGV4LCBlbmRJbmRleCA9IHRoaXMuZW5kSW5kZXggfHwgdGhpcy50ZXh0Lmxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQuc3Vic3RyaW5nKHN0YXJ0SW5kZXgsIGVuZEluZGV4KTtcblx0fVxuXG5cdC8vIExlbmd0aCBvZiB0aGUgc3RyZWFtLlxuXHRnZXQgbGVuZ3RoKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQubGVuZ3RoO1xuXHR9XG5cblx0Ly8gQXJlIHdlIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmVhbT9cblx0Z2V0IGlzRW1wdHkoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3RhcnRJbmRleCA9PT0gdGhpcy5sZW5ndGg7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0XG5cdH07XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvVGV4dFN0cmVhbS5qcyIsImltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBsb2FkIHN0YW5kYXJkIHJ1bGVzIGZpbGVzIGhlcmVcbmltcG9ydCBcIi4vY29yZVwiO1xuaW1wb3J0IFwiLi9saXN0c1wiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vaWZcIjtcbmltcG9ydCBcIi4vc3RhdGVtZW50c1wiO1xuaW1wb3J0IFwiLi90eXBlc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiLy8gTWVtb2l6ZS9mb3JnZXQgc2VtYW50aWNzLlxuXG4vLyBSZXR1cm4gYSBtZW1vaXppbmcgZ2V0dGVyIGZ1bmN0aW9uLlxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXNbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGdldHRlci5hcHBseSh0aGlzKTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIERlZmluZSBzbyB0aGF0IHdlIGNhbiBiZSBkZWxldGVkIGFuZCByZS1kZWZpbmVkLCBidXQgbm90IHNldCBvciBlbnVtZXJhdGVkLlxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcGVydHksIHsgdmFsdWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXNbcHJvcGVydHldO1xuXHR9XG59XG5cblxuLy8gUmV0dXJuIGEgbWVtb2l6ZSBmdW5jdGlvbiBmb3IgdXNlIGFzIGEgZ2V0dGVyIGluIGEgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYFxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4ge1xuXHRcdGdldCA6IG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpXG5cdH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9tZW1vaXplLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiaWZcIixcblx0XCJpZiB7ZXhwcmVzc2lvbn0gKHRoZW58Oik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBpZl8gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblxuXHRcdFx0aWYgKHN0YXRlbWVudCkgcmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGlmICgke2V4cHJlc3Npb259KWBcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiYmFja3dhcmRzX2lmXCIsXG5cdFwie3N0YXRlbWVudH0gaWYge2V4cHJlc3Npb259IChlbHNlUGhyYXNlOihlbHNlfG90aGVyd2lzZSkge3N0YXRlbWVudH0pP1wiLFxuXHRjbGFzcyBiYWNrd2FyZHNfaWYgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgc3RhdGVtZW50LCBlbHNlUGhyYXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblx0XHRcdGxldCBlbHNlU3RhdGVtZW50ID0gZWxzZVBocmFzZSAmJiBlbHNlUGhyYXNlLnJlc3VsdHMuc3RhdGVtZW50LnRvU291cmNlKCk7XG5cblx0XHRcdGlmIChlbHNlU3RhdGVtZW50KSByZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9IGVsc2UgeyAke2Vsc2VTdGF0ZW1lbnR9IH1gXG5cdFx0XHRyZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZWxzZV9pZlwiLFxuXHRcIihlbHNlfG90aGVyd2lzZSkgaWYge2V4cHJlc3Npb259ICh0aGVufDopIHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBlbHNlX2lmIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGVsc2UgaWYgKCR7ZXhwcmVzc2lvbn0pYFxuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJlbHNlXCIsXG5cdFwiKGVsc2V8b3RoZXJ3aXNlKSB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZWxzZV8gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgZWxzZWBcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaWYuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGluZml4IGFuZCBwcmVmaXggb3BlcmF0b3JzLlxuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIyMgSW5maXggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+IHtyaHN9YCwgZWc6IGBhIGlzIDFgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHR3byBhcmd1bWVudHMgKGBsaHNgIGFuZCBgcmhzYCkgaW50byBvdXRwdXQuXG5cbi8vIE5PVEU6IGBwcmVjZWRlbmNlYCBudW1iZXJzIGNvbWUgZnJvbSBKYXZhc2NyaXB0IGVxdWl2YWxlbnRzXG4vL1x0XHQgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvT3BlcmF0b3JzL09wZXJhdG9yX1ByZWNlZGVuY2VcblxuY2xhc3MgaW5maXhfb3BlcmF0b3IgZXh0ZW5kcyBSdWxlLkFsdGVybmF0aXZlcyB7XG5cbi8vIE5PVEU6IEZvciB0aGUgb3BlcmF0b3JzIHRoZW1zZWx2ZXMsIHdlIHJlYWxseSB3YW50IHRvIGp1c3QgdXNlIGxvbmdlc3QgbWF0Y2guXG4vLyBcdFx0IFdlIHdhbnQgdG8gcHVzaCB0aGUgcHJlY2VkZW5jZSB1cCB0byB0aGUgZXhwcmVzc2lvbiBhbmQgZXZhbHVhdGUgZGlmZmVyZW50IGV4cHJlc3Npb25zIGJhc2VkIG9uIHRoYXQuXG4vLyBcdC8vIEZpbmQgYmVzdCBtYXRjaCBhY2NvcmRpbmcgdG8gb3BlcmF0b3IgcHJlY2VkZW5jZSBhcyBkZWZpbmVkIGJlbG93LlxuLy8gXHRnZXRCZXN0TWF0Y2gobWF0Y2hlcykge1xuLy8gXHRcdGNvbnNvbGUud2FybihcIkdCTVwiLCBtYXRjaGVzLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5wcmVjZWRlbmNlKSwgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gubWF0Y2hlZFRleHQpKTtcbi8vIFx0XHRyZXR1cm4gbWF0Y2hlcy5yZWR1Y2UoZnVuY3Rpb24gKGJlc3QsIG5leHQpIHtcbi8vIFx0XHRcdC8vIHRha2UgaGlnaGVzdCBwcmVjZWRlbmNlIG1hdGNoIGZpcnN0XG4vLyBcdFx0XHRpZiAobmV4dC5wcmVjZWRlbmNlID4gYmVzdC5wcmVjZWRlbmNlKSByZXR1cm4gbmV4dDtcbi8vIFx0XHRcdC8vIHRha2UgbG9uZ2VzdCBtYXRjaCBpZiBzYW1lIHByZWNlZGVuY2Vcbi8vIFx0XHRcdGlmIChuZXh0LnByZWNlZGVuY2UgPT09IGJlc3QucHJlY2VkZW5jZSkge1xuLy8gXHRcdFx0XHRpZiAobmV4dC5lbmRJbmRleCA+IGJlc3QuZW5kSW5kZXgpIHJldHVybiBuZXh0O1xuLy8gXHRcdFx0fVxuLy8gXHRcdFx0cmV0dXJuIGJlc3Q7XG4vLyBcdFx0fSwgbWF0Y2hlc1swXSk7XG4vLyBcdH1cbn1cblxucGFyc2VyLmFkZFJ1bGUoXCJpbmZpeF9vcGVyYXRvclwiLCBuZXcgaW5maXhfb3BlcmF0b3IoKSk7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJhbmRcIixcblx0Y2xhc3MgYW5kIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDY7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gJiYgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcIm9yXCIsXG5cdGNsYXNzIG9yIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDU7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gfHwgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzXCIsXG5cdCBjbGFzcyBpcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdFwiLFxuXHQgY2xhc3MgaXNfbm90IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBleGFjdGx5XCIsXG5cdGNsYXNzIGlzX2V4YWN0bHkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT09ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGV4YWN0bHlcIixcblx0IGNsYXNzICBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPT0gJHtifSlgIH0gfVxuKTtcblxuLy9UT0RPOiBgc3BlbGwuaXNPZlR5cGUodGhpbmcsIHR5cGUpYFxuLy9UT0RPOiBgaXMgc2FtZSB0eXBlIGFzYCA/XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgYVwiLFxuXHQgY2xhc3MgaXNfYSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgYW5cIixcblx0IGNsYXNzIGlzX2FuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBhXCIsXG5cdCBjbGFzcyBpc19ub3RfYSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBhblwiLFxuXHQgY2xhc3MgaXNfbm90X2FuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5cbi8vVE9ETzogYHNwZWxsLmNvbnRhaW5zKGNvbGxlY3Rpb24sIHRoaW5nKWBcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBpblwiLFxuXHQgY2xhc3MgaXNfaW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG9uZSBvZlwiLFxuXHQgY2xhc3MgaXNfb25lX29mIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBpblwiLFxuXHQgY2xhc3MgaXNfbm90X2luIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IG9uZSBvZlwiLFxuXHQgY2xhc3MgaXNfbm90X29uZV9vZiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5cblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImluY2x1ZGVzXCIsXG5cdCBjbGFzcyBpbmNsdWRlcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiY29udGFpbnNcIixcblx0IGNsYXNzIGNvbnRhaW5zIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImRvZXMgbm90IGluY2x1ZGVcIixcblx0IGNsYXNzIGRvZXNfbm90X2luY2x1ZGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkb2VzIG5vdCBjb250YWluXCIsXG5cdCBjbGFzcyBkb2VzX25vdF9jb250YWluIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPlwiLFxuXHQgY2xhc3MgZ3QgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBncmVhdGVyIHRoYW5cIixcblx0IGNsYXNzIGlzX2dyZWF0ZXJfdGhhbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPj1cIixcblx0IGNsYXNzIGd0ZSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG9cIixcblx0IGNsYXNzIGlzX2d0ZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIjxcIixcblx0IGNsYXNzIGx0IGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbGVzcyB0aGFuXCIsXG5cdCBjbGFzcyBpc19sZXNzX3RoYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIjw9XCIsXG5cdCBjbGFzcyBsdGUgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvXCIsXG5cdCBjbGFzcyBpc19sdGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfSB9XG4pO1xuXG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIlxcXFwrXCIsXG5cdCBjbGFzcyBwbHVzIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcInBsdXNcIixcblx0IGNsYXNzIHBsdXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCItXCIsXG5cdCBjbGFzcyBtaW51cyBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAtICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJtaW51c1wiLFxuXHQgY2xhc3MgbWludXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJcXFxcKlwiLFxuXHQgY2xhc3MgdGltZXMgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKiAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwidGltZXNcIixcblx0IGNsYXNzIHRpbWVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiL1wiLFxuXHQgY2xhc3MgZGl2aWRlZF9ieSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkaXZpZGVkIGJ5XCIsXG5cdCBjbGFzcyBkaXZpZGVkX2J5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH0gfVxuKTtcblxuLy9UT0RPOiAgYCs9YCBldGM/ICBvdGhlciBtYXRoIGZ1bmN0aW9ucz9cblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwiaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntsaHM6ZXhwcmVzc2lvbn0ge29wZXJhdG9yOmluZml4X29wZXJhdG9yfSB7cmhzOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGluZml4X29wZXJhdG9yX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdC8vIFdlIENBTk5PVCBtYXRjaCBpZiBgaW5maXhfb3BlcmF0b3JgIGlzbid0IGZvdW5kIGluIHRoZSBleHByZXNzaW9uLlxuXHRcdHRlc3RSdWxlID0gXCJpbmZpeF9vcGVyYXRvclwiO1xuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGhzLCByaHMsIG9wZXJhdG9yIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gb3BlcmF0b3IudG9KUyhsaHMudG9Tb3VyY2UoY29udGV4dCksIHJocy50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyMjIFBvc3RpZnggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+YCwgZS5nLiBgYSBpcyBkZWZpbmVkYFxuLy8gTk9URTogYG9wZXJhdG9yLnRvSlNgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyBhcmd1bWVudCAoYGxoc2ApIGludG8gSlMgb3V0cHV0LlxuXG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBkZWZpbmVkXCIsXG5cdGNsYXNzIGlzX2RlZmluZWQgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSAhPT0gJ3VuZGVmaW5lZCcpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgZGVmaW5lZFwiLFxuXHRjbGFzcyBpc19ub3RfZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIHVuZGVmaW5lZFwiLFxuXHRjbGFzcyBpc191bmRlZmluZWQgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9IH1cbik7XG5cblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBlbXB0eVwiLFxuXHRjbGFzcyBpc19lbXB0eSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGVtcHR5XCIsXG5cdGNsYXNzIGlzX25vdF9lbXB0eSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAhc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicG9zdGZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2V4cHJlc3Npb259IHtvcGVyYXRvcjpwb3N0Zml4X29wZXJhdG9yfVwiLFxuXHRjbGFzcyBwb3N0Zml4X29wZXJhdG9yX2V4cHJlc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Ly8gV2UgQ0FOTk9UIG1hdGNoIGlmIGBwb3N0Zml4X29wZXJhdG9yYCBpc24ndCBmb3VuZCBpbiB0aGUgZXhwcmVzc2lvbi5cblx0XHR0ZXN0UnVsZSA9IFwicG9zdGZpeF9vcGVyYXRvclwiO1xuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vXG4vL1x0IyMgUmV0dXJuc1xuLy9cblxuLy8gUmV0dXJuIGEgdmFsdWVcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwicmV0dXJuX3N0YXRlbWVudFwiLCBcInJldHVybiB7ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcmV0dXJuX3N0YXRlbWVudCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gYHJldHVybiAke2V4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCl9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vL1xuLy9cdCMjIEFzc2lnbm1lbnRcbi8vXG5jbGFzcyBhc3NpZ25tZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnR7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgeyB0aGluZywgdmFsdWUgfSA9IHRoaXMucmVzdWx0cztcblx0XHRpZiAodGhpbmcgaW5zdGFuY2VvZiBSdWxlLklkZW50aWZpZXIpIHtcblx0XHRcdC8vIFRPRE86IGRlY2xhcmUgaWRlbnRpZmllciBpZiBub3QgaW4gc2NvcGUsIGV0Y1xuXHRcdH1cblxuXHRcdHJldHVybiBgJHt0aGluZy50b1NvdXJjZShjb250ZXh0KX0gPSAke3ZhbHVlLnRvU291cmNlKGNvbnRleHQpfWA7XG5cdH1cbn1cblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsIFwie3RoaW5nOmV4cHJlc3Npb259ID0ge3ZhbHVlOmV4cHJlc3Npb259XCIsIGFzc2lnbm1lbnQpO1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsIFwic2V0IHt0aGluZzpleHByZXNzaW9ufSB0byB7dmFsdWU6ZXhwcmVzc2lvbn1cIiwgYXNzaWdubWVudCk7XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJwdXQge3ZhbHVlOmV4cHJlc3Npb259IGludG8ge3RoaW5nOmV4cHJlc3Npb259XCIsIGFzc2lnbm1lbnQpO1xuXG5cbi8vXG4vL1x0IyMgVXNlciBpbnRlcmFjdGlvblxuLy9cblxuLy8gQWxlcnQgYSBtZXNzYWdlLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhbGVydFwiLCBcImFsZXJ0IHttZXNzYWdlOmV4cHJlc3Npb259IChidXR0b25DbGF1c2U6d2l0aCB7dGV4dH0pP1wiLFxuXHRjbGFzcyBhbGVydCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBidXR0b25DbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGJ1dHRvbk5hbWUgPSBidXR0b25DbGF1c2UgPyBidXR0b25DbGF1c2UucmVzdWx0cy50ZXh0LnRvU291cmNlKGNvbnRleHQpIDogJ1wiT0tcIic7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLmFsZXJ0KCR7bWVzc2FnZX0sICR7YnV0dG9uTmFtZX0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFdhcm5pbmcgbWVzc2FnZSAtLSBsaWtlIGFsZXJ0IGJ1dCBmYW5jaWVyLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJ3YXJuXCIsIFwid2FybiB7ZXhwcmVzc2lvbjpleHByZXNzaW9ufSAoYnV0dG9uQ2xhdXNlOndpdGgge3RleHR9KT9cIixcblx0Y2xhc3Mgd2FybiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBidXR0b25DbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGJ1dHRvbk5hbWUgPSBidXR0b25DbGF1c2UgPyBidXR0b25DbGF1c2UucmVzdWx0cy50ZXh0LnRvU291cmNlKGNvbnRleHQpIDogJ1wiT0tcIic7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLndhcm4oJHttZXNzYWdlfSwgJHtidXR0b25OYW1lfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBDb25maXJtIG1lc3NhZ2UgLS0gcHJlc2VudCBhIHF1ZXN0aW9uIHdpdGggdHdvIGFuc3dlcnMuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImNvbmZpcm1cIiwgXCJjb25maXJtIHttZXNzYWdlOmV4cHJlc3Npb259IChidXR0b25DbGF1c2U6d2l0aCB7b2tCdXR0b246dGV4dH0gKGNhbmNlbENsYXVzZTogKGFuZHxvcikge2NhbmNlbEJ1dHRvbjp0ZXh0fSk/ICk/XCIsXG5cdGNsYXNzIGNvbmZpcm0gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgYnV0dG9uQ2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBva0J1dHRvbiA9ICdcIk9LXCInLCBjYW5jZWxCdXR0b24gPSAnXCJDYW5jZWxcIic7XG5cblx0XHRcdGlmIChidXR0b25DbGF1c2UpIHtcblx0XHRcdFx0b2tCdXR0b24gPSBidXR0b25DbGF1c2UucmVzdWx0cy5va0J1dHRvbi5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0XHRsZXQgY2FuY2VsQ2xhdXNlID0gYnV0dG9uQ2xhdXNlLnJlc3VsdHMuY2FuY2VsQ2xhdXNlO1xuXHRcdFx0XHRpZiAoY2FuY2VsQ2xhdXNlKSBjYW5jZWxCdXR0b24gPSBjYW5jZWxDbGF1c2UucmVzdWx0cy5jYW5jZWxCdXR0b24ucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwuY29uZmlybSgke21lc3NhZ2V9LCAke29rQnV0dG9ufSwgJHtjYW5jZWxCdXR0b259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCJpbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuaW1wb3J0IFwiLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL3J1bGVzL2luZGV4LmpzXCI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHR3aW5kb3cuVGV4dFN0cmVhbSA9IFRleHRTdHJlYW07XG5cdHdpbmRvdy5QYXJzZXIgPSBQYXJzZXI7XG5cdHdpbmRvdy5SdWxlID0gUnVsZTtcblx0d2luZG93LnBhcnNlciA9IHBhcnNlcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuXHRUZXh0U3RyZWFtLCBQYXJzZXIsIFJ1bGUsIHBhcnNlclxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvaW5kZXguanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlZmluaW5nIGNsYXNzZXMgKGtub3duIGFzIGB0eXBlc2ApXG4vL1xuaW1wb3J0IGdsb2JhbCBmcm9tIFwiLi4vZ2xvYmFsXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy8gREVBRCBTSU1QTEUgUExVUkFMSVpFUi4uLiBSRUFMTFkgTk9UIFZFUlkgR09PRFxuZnVuY3Rpb24gcGx1cmFsaXplKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQgKyBcInNcIjtcbn1cblxuXG4vL01PVkUgVE8gYG9iamVjdHNgP1xuLy8gUHJvcGVydGllcyBjbGF1c2U6IGNyZWF0ZXMgYW4gb2JqZWN0IHdpdGggb25lIG9yIG1vcmUgcHJvcGVydHkgdmFsdWVzLlxuLy9cdGBmb28gPSAxLCBiYXIgPSAyYFxuLy9UT0RPOiB3b3VsZCBsaWtlIHRvIHVzZSBgYW5kYCBidXQgdGhhdCB3aWxsIGJhcmYgb24gZXhwcmVzc2lvbnMuLi5cbi8vVE9ETzogaG93IHRvIGRvIHByb3BlcnRpZXMgb24gbXVsdGlwbGUgbGluZXM/XG5wYXJzZXIuYWRkTGlzdChcblx0XCJvYmplY3RfbGl0ZXJhbF9wcm9wZXJ0aWVzXCIsXG5cdFwiWyh7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn0pICxdXCIsXG5cdGNsYXNzIG9iamVjdF9saXRlcmFsX3Byb3BlcnRpZXMgZXh0ZW5kcyBSdWxlLkxpc3Qge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBwcm9wcyA9IHRoaXMucmVzdWx0cy5tYXRjaGVkLm1hcChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGV4cHJlc3Npb24gfSA9IHByb3AucmVzdWx0cztcblx0XHRcdFx0XHRsZXQga2V5ID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0XHRsZXQgdmFsdWUgPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0XHRcdHJldHVybiBgXCIke2tleX1cIjogJHt2YWx1ZX1gXG5cdFx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGB7ICR7cHJvcHMuam9pbihcIiwgXCIpfSB9YDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIGBuZXdgXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhbGwgdHlwZXMgdGFrZSBhbiBvYmplY3Qgb2YgcHJvcGVydGllcz8/Pz9cbnBhcnNlci5hZGRTZXF1ZW5jZShcblx0XCJuZXdfdGhpbmdcIixcblx0XCIoY3JlYXRlfG5ldykge3R5cGV9IChwcm9wc19jbGF1c2U6d2l0aCB7cHJvcHM6b2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc30pP1wiLFxuXHRjbGFzcyBuZXdfdGhpbmcgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBwcm9wc19jbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHR5cGUgPSB0eXBlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHByb3BzID0gcHJvcHNfY2xhdXNlICYmIHByb3BzX2NsYXVzZS5yZXN1bHRzLnByb3BzLnRvU291cmNlKGNvbnRleHQpIHx8IFwiXCI7XG5cblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igb2JqZWN0LCB3aGljaCB3ZSdsbCBjcmVhdGUgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbC5cblx0XHRcdGlmICh0eXBlID09PSBcIk9iamVjdFwiKSB7XG5cdFx0XHRcdGlmICghcHJvcHNfY2xhdXNlKSByZXR1cm4gXCJ7fVwiO1xuXHRcdFx0XHRyZXR1cm4gYCR7cHJvcHN9YDtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGBuZXcgJHt0eXBlfSgke3Byb3BzfSlgO1xuXHRcdH1cblx0fVxuKTtcbi8vIFRoaXMgd29ya3MgYXMgYW4gZXhwcmVzc2lvbiBPUiBhIHN0YXRlbWVudC5cbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMubmV3X3RoaW5nKTtcbnBhcnNlci5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHBhcnNlci5ydWxlcy5uZXdfdGhpbmcpO1xuXG5cblxuXG4vLyBEZWZpbmUgY2xhc3MuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlZmluZV90eXBlXCIsXG5cdFwiZGVmaW5lIHR5cGUge3R5cGV9IChleHRlbmRzX2NsYXVzZTphcyAoYXxhbikge3N1cGVyVHlwZTp0eXBlfSk/XCIsXG5cdGNsYXNzIGRlZmluZV90eXBlIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHR5cGUsIGV4dGVuZHNfY2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHR0eXBlID0gdHlwZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBzdXBlclR5cGUgPSBleHRlbmRzX2NsYXVzZSAmJiBleHRlbmRzX2NsYXVzZS5yZXN1bHRzLnN1cGVyVHlwZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGlmIChzdXBlclR5cGUpIHtcblx0XHRcdFx0cmV0dXJuIGBjbGFzcyAke3R5cGV9IGV4dGVuZHMgJHtzdXBlclR5cGV9YDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBgY2xhc3MgJHt0eXBlfWA7XG5cblx0XHR9XG5cdH1cbik7XG5cbi8vVE9ETzogY29uc3RydWN0b3JcblxuXG5cbi8vTU9WRSBUTyBgZnVuY3Rpb25zYD9cbi8vIEFyZ3VtZW50cyBjbGF1c2UgZm9yIG1ldGhvZHNcbi8vXHRgd2l0aCBmb29gIG9yIGB3aXRoIGZvbyBhbmQgYmFyIGFuZCBiYXpgXG4vL1RPRE86IHtpZGVudGlmaWVyfSA9IHtleHByZXNzaW9ufVx0PT4gcmVxdWlyZXMgYCxgIGluc3RlYWQgb2YgYGFuZGBcbi8vVE9ETzogYHdpdGggZm9vIGFzIFR5cGVgXG4vL1RPRE86XHRgd2l0aCBmb28uLi5gIGZvciBzcGxhdD9cbnBhcnNlci5hZGRTZXF1ZW5jZShcblx0XCJhcmdzX2NsYXVzZVwiLFxuXHRcIndpdGggW2FyZ3M6e2lkZW50aWZpZXJ9ICxdXCIsXG5cdGNsYXNzIGFyZ3NfY2xhdXNlIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7XG5cdFx0Ly8gUmV0dXJuIGp1c3QgdGhlIGFyZ3VtZW50cyBhcyB0aGUgcmVzdWx0c1xuXHRcdGdldCByZXN1bHRzKCkge1xuXHRcdFx0cmV0dXJuIHN1cGVyLnJlc3VsdHMuYXJncztcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4ganVzdCB0aGUgYXJndW1lbnQgbmFtZXMgYXMgYW4gYXJyYXlcblx0XHRnZXQgYXJnTmFtZXMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzLm1hdGNoZWQubWFwKGFyZyA9PiBhcmcubWF0Y2hlZCk7XG5cdFx0fVxuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuYXJnTmFtZXMuam9pbihcIiwgXCIpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBEZWNsYXJlIGluc3RhbmNlIG1ldGhvZCBvciBub3JtYWwgZnVuY3Rpb24uXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfbWV0aG9kXCIsXG5cdFwiKHRvfG9uKSB7aWRlbnRpZmllcn0ge2FyZ3NfY2xhdXNlfT8gKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGRlY2xhcmVfbWV0aG9kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3NfY2xhdXNlLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblxuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgYXJncyA9IChhcmdzX2NsYXVzZSAmJiBhcmdzX2NsYXVzZS50b1NvdXJjZShjb250ZXh0KSkgfHwgXCJcIjtcblx0XHRcdHN0YXRlbWVudCA9IChzdGF0ZW1lbnQgPyBgIHsgJHtzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCl9IH1gIDogXCJcIik7XG5cblx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KSR7c3RhdGVtZW50fWBcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gRGVjbGFyZSBcImFjdGlvblwiLCB3aGljaCBjYW4gYmUgY2FsbGVkIGdsb2JhbGx5IGFuZCBhZmZlY3RzIHRoZSBwYXJzZXIuXG4vLyBUT0RPOiBgd2l0aGAgY2xhdXNlICh3aWxsIGNvbmZsaWN0IHdpdGggYHdvcmRgKVxuLy8gVE9ETzogaW5zdGFsbCBpbiBwYXJzZXIgc29tZWhvd1xuLy8gVE9ETzogY3JlYXRlIGluc3RhbmNlIGZ1bmN0aW9uPyAgb3IgbWF5YmUgd2UgZG9uJ3QgbmVlZCBpdDpcbi8vXHRcdFx0YGFjdGlvbiB0dXJuIENhcmQgb3ZlcmAgZm9yIGFuIGluc3RhbmNlIGlzIGp1c3QgYHR1cm4gbWUgb3ZlcmBcbi8vXHRcdFx0YGFjdGlvbiBhZGQgY2FyZCB0byBkZWNrYCA9PiBgYWRkIG1lIHRvIGRlY2tgXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX2FjdGlvblwiLFxuXHRcImFjdGlvbiAod29yZF9jbGF1c2U6e3dvcmR9fHt0eXBlfSkrIChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBkZWNsYXJlX2FjdGlvbiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHdvcmRfY2xhdXNlLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGxldCB3b3JkcyA9IHdvcmRfY2xhdXNlLm1hdGNoZWQubWFwKCB3b3JkID0+IHdvcmQudG9Tb3VyY2UoY29udGV4dCkgKTtcblx0XHRcdC8vIGlmIHRoZXJlJ3Mgb25seSBvbmUgd29yZCwgaXQgY2FuJ3QgYmUgYSBibGFja2xpc3RlZCBpZGVudGlmaWVyIG9yIGEgdHlwZVxuXHRcdFx0aWYgKHdvcmRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHR2YXIgd29yZCA9IHdvcmRzWzBdO1xuXHRcdFx0XHRpZiAod29yZF9jbGF1c2UubWF0Y2hlZCBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSB0eXBlczogJHt3b3JkfWApO1xuXHRcdFx0XHR9XG5cbi8vIEhBQ0s6IGBnbG9iYWwucGFyc2VyYCBpcyBhIGhhY2sgaGVyZSBmb3IgY29udmVuaWVuY2UgaW4gdGVzdGluZy4uLlxuXHRcdFx0XHRsZXQgcGFyc2VyID0gY29udGV4dCA/IGNvbnRleHQucGFyc2VyIDogZ2xvYmFsLnBhcnNlcjtcblx0XHRcdFx0aWYgKHBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmJsYWNrbGlzdFt3b3JkXSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSBibGFja2xpc3RlZCBpZGVudGlmaWVyc1wiOiAke3dvcmR9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBhcmd1bWVudHMgYW5kL29yIHR5cGVzXG5cdFx0XHR2YXIgYXJncyA9IFtdO1xuXHRcdFx0dmFyIHR5cGVzID0gW107XG5cdFx0XHQvLyBpZiBhbnkgb2YgdGhlIHdvcmRzIGFyZSB0eXBlcyAoY2FwaXRhbCBsZXR0ZXIpIG1ha2UgdGhhdCBhbiBhcmd1bWVudCBvZiB0aGUgc2FtZSBuYW1lLlxuXHRcdFx0d29yZF9jbGF1c2UubWF0Y2hlZC5tYXAoIChpdGVtLCBpbmRleCkgPT4ge1xuXHRcdFx0XHRpZiAoaXRlbSBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdGxldCB0eXBlID0gd29yZHNbaW5kZXhdO1xuXHRcdFx0XHRcdGxldCB3b3JkID0gdHlwZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdHR5cGVzLnB1c2goW3R5cGUsIHdvcmRdKTtcblx0XHRcdFx0XHR3b3Jkc1tpbmRleF0gPSB3b3JkO1xuXHRcdFx0XHRcdGFyZ3MucHVzaCh3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQvLyBnZXQgc3RhdGljIG1ldGhvZCBuYW1lIGFuZCBhcmd1bWVudHMgZm9yIG91dHB1dFxuXHRcdFx0bGV0IG1ldGhvZE5hbWUgPSB3b3Jkcy5qb2luKFwiX1wiKTtcblx0XHRcdGFyZ3MgPSBhcmdzLmpvaW4oXCIsIFwiKTtcblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpZiB0aGVyZSBhcmUgYW55IGNvbmRpdGlvbnMgb24gdGhlIGFib3ZlXG5cdFx0XHRsZXQgY29uZGl0aW9ucyA9IHR5cGVzLm1hcCggKFt0eXBlLCB3b3JkXSkgPT4ge1xuXHRcdFx0XHRyZXR1cm4gYFxcdGlmICghc3BlbGwuaXNBKCR7d29yZH0sICR7dHlwZX0pKSByZXR1cm4gdW5kZWZpbmVkYDtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBnZXQgc3RhdGVtZW50cywgYWRkaW5nIGNvbmRpdGlvbnMgaWYgbmVjZXNzYXJ5XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiBcIlwiO1xuXHRcdFx0bGV0IHN0YXRlbWVudHMgPSBcIlwiO1xuXHRcdFx0aWYgKHN0YXRlbWVudCkge1xuXHRcdFx0XHRzdGF0ZW1lbnRzID0gW107XG5cdFx0XHRcdGlmIChjb25kaXRpb25zLmxlbmd0aCkgc3RhdGVtZW50cyA9IHN0YXRlbWVudHMuY29uY2F0KGNvbmRpdGlvbnMpO1xuXHRcdFx0XHRpZiAoc3RhdGVtZW50KSBzdGF0ZW1lbnRzLnB1c2goXCJcXHRcIiArIHN0YXRlbWVudCk7XG5cdFx0XHRcdHN0YXRlbWVudHMgPSBgIHtcXG4ke3N0YXRlbWVudHMuam9pbihcIlxcblwiKX1cXG4gfVxcbmA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChjb25kaXRpb25zLmxlbmd0aCkge1xuXHRcdFx0XHRzdGF0ZW1lbnRzID0gYCB7XFxuJHtjb25kaXRpb25zLmpvaW4oXCJcXG5cIil9YDtcblx0XHRcdH1cbi8vZGVidWdnZXI7XG5cdFx0XHQvLyBDcmVhdGUgYXMgYSBTVEFUSUMgZnVuY3Rpb25cblx0Ly9UT0RPOiBjcmVhdGUgYXMgYW4gaW5zdGFuY2UgZnVuY3Rpb24gd2UgY2FuIGNhbGwgb24gb3Vyc2VsZiFcblx0XHRcdHJldHVybiBgc3RhdGljICR7bWV0aG9kTmFtZX0oJHthcmdzfSkke3N0YXRlbWVudHN9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gR2V0dGVyIGVpdGhlciB3aXRoIG9yIHdpdGhvdXQgYXJndW1lbnRzLlxuLy8gSWYgeW91IHNwZWNpZnkgYXJndW1lbnRzLCB5aWVsZHMgYSBub3JtYWwgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhIHZhbHVlLlxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJnZXR0ZXJcIixcblx0XCJnZXQge2lkZW50aWZpZXJ9IHthcmdzX2NsYXVzZX0/IChcXFxcOik/IHtleHByZXNzaW9ufT9cIixcblx0Y2xhc3MgZ2V0dGVyIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3NfY2xhdXNlLCBleHByZXNzaW9uIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBhcmdzID0gYXJnc19jbGF1c2UgJiYgYXJnc19jbGF1c2UudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRleHByZXNzaW9uID0gKGV4cHJlc3Npb24gPyBgIHsgcmV0dXJuICgke2V4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCl9KSB9YCA6IFwiXCIpO1xuXG5cdFx0XHRpZiAoYXJncyAmJiBleHByZXNzaW9uKSB7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KSR7ZXhwcmVzc2lvbn1gO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoYXJncykge1xuXHRcdFx0XHRyZXR1cm4gYCR7aWRlbnRpZmllcn0oJHthcmdzfSlgO1xuXG5cdFx0XHR9IGVsc2UgaWYgKGV4cHJlc3Npb24pIHtcblx0XHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSgpJHtleHByZXNzaW9ufWA7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gYGdldCAke2lkZW50aWZpZXJ9KClgO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFNldHRlci5cbi8vIENvbXBsYWlucyBpZiB5b3Ugc3BlY2lmeSBtb3JlIHRoYW4gb25lIGFyZ3VtZW50LlxuLy8gSWYgeW91IGRvbid0IHBhc3MgYW4gZXhwbGljaXQgYXJndW1lbnQsIHdlJ2xsIGFzc3VtZSBpdCdzIHRoZSBzYW1lIGFzIHRoZSBpZGVudGlmaWVyLlxuLy8gZWc7XHRgc2V0IGNvbG9yOiBzZXQgdGhlIGNvbG9yIG9mIG15IHRleHQgdG8gY29sb3JgXG4vL1xuLy8gVE9ETzogaW50ZXJuYWwgZ2V0dGVyL3NldHRlciBzZW1hbnRpY3MgYWxhIG9iamVjdGl2ZSBDXG4vL1x0XHRcdGBzZXQgY29sb3I6IGlmIGNvbG9yIGlzIGluIFtcInJlZFwiLCBcImJsdWVcIl0gdGhlbiBzZXQgbXkgY29sb3IgdG8gY29sb3JgXG4vL1x0XHQgPT4gYG15IGNvbG9yYCB3aXRoaW4gc2V0dGVyIHNob3VsZCBhdXRvbWF0aWNhbGx5IHRyYW5zbGF0ZSB0byBgdGhpcy5fY29sb3JgID8/P1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJzZXR0ZXJcIixcblx0XCJzZXQge2lkZW50aWZpZXJ9IHthcmdzX2NsYXVzZX0/IChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBnZXR0ZXIgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJnc19jbGF1c2UsIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cblx0XHRcdC8vIEFzc3VtZSB3ZSB3YW50IHRoZSBzYW1lIG5hbWUgYXMgdGhlIGlkZW50aWZpZXIgaWYgbm8gYXJndW1lbnNcblx0XHRcdGxldCBhcmdzID0gKGFyZ3NfY2xhdXNlICYmIGFyZ3NfY2xhdXNlLmFyZ05hbWVzKSB8fCBbaWRlbnRpZmllcl07XG5cdFx0XHQvLyBDb21wbGFpbiBpZiBtb3JlIHRoYW4gb25lIGFyZ3VtZW50XG5cdFx0XHRpZiAoYXJncy5sZW5ndGggPiAxKVxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJwYXJzZSgnc2V0dGVyJyk6IG9ubHkgb25lIGFyZ3VtZW50IGFsbG93ZWQgaW4gc2V0dGVyOiAgXCIsIHRoaXMubWF0Y2hlZFRleHQpO1xuXG5cdFx0XHRzdGF0ZW1lbnQgPSAoc3RhdGVtZW50ID8gYCB7ICR7c3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpfSB9YCA6IFwiXCIpO1xuXG5cdFx0XHRyZXR1cm4gYHNldCAke2lkZW50aWZpZXJ9KCR7YXJnc1swXX0pJHtzdGF0ZW1lbnR9YDtcblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vXG4vL1x0ZGVjbGFyZSBwcm9wZXJ0aWVzXG4vL1xuXG4vL1RPRE86IGFub3RoZXIgbmFtZSBmb3IgYGNvbnN0YW50YCA/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlcIixcblx0XCIoc2NvcGU6cHJvcGVydHl8Y29uc3RhbnR8c2hhcmVkIHByb3BlcnR5KSB7aWRlbnRpZmllcn0gKHZhbHVlX2NsYXVzZTo9IHtleHByZXNzaW9ufSk/XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHkgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc2NvcGUsIGlkZW50aWZpZXIsIHZhbHVlX2NsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0c2NvcGUgPSBzY29wZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHZhbHVlID0gdmFsdWVfY2xhdXNlICYmIFwiID0gXCIgKyB2YWx1ZV9jbGF1c2UucmVzdWx0cy5leHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpIHx8IFwiXCI7XG5cblx0XHRcdGxldCBkZWNsYXJhdGlvbiA9IGAke2lkZW50aWZpZXJ9JHt2YWx1ZX1gO1xuXHRcdFx0c3dpdGNoIChzY29wZSkge1xuXHRcdFx0XHRjYXNlIFwiY29uc3RhbnRcIjpcblx0XHRcdFx0XHRpZiAoIXZhbHVlKSBjb25zb2xlLndhcm4oXCJwYXJzZSgnZGVjbGFyZV9wcm9wZXJ0eScpOiBjb25zdGFudCBwcm9wZXJ0aWVzIG11c3QgZGVjbGFyZSBhIHZhbHVlOiAgXCIsIHRoaXMubWF0Y2hlZFRleHQpO1xuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHtkZWNsYXJhdGlvbn1gO1xuXG5cdFx0XHRcdGNhc2UgXCJzaGFyZWQgcHJvcGVydHlcIjpcblx0XHRcdFx0XHRyZXR1cm4gYEBwcm90b1xcbiR7ZGVjbGFyYXRpb259YDtcblxuXHRcdFx0XHRjYXNlIFwicHJvcGVydHlcIjpcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRyZXR1cm4gZGVjbGFyYXRpb247XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiBzY29wZV9tb2RpZmllcj8/P1xuLy8gVE9ETzogaW5pdGlhbCB2YWx1ZVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwicHJvcGVydHkge2lkZW50aWZpZXJ9IGFzIChhfGFuKT8ge3R5cGV9XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHkgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgdHlwZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHR0eXBlID0gdHlwZS50b1NvdXJjZShjb250ZXh0KTtcblxuXHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSgpIHsgcmV0dXJuIHRoaXMuX18ke2lkZW50aWZpZXJ9IH1cXG5gXG5cdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAoc3BlbGwuaXNBKHZhbHVlLCAke3R5cGV9KSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eVwiLFxuXHRcInByb3BlcnR5IHtpZGVudGlmaWVyfSBhcyBvbmUgb2Yge2xpc3Q6bGl0ZXJhbF9saXN0fVwiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5X2FzX29uZV9vZiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBsaXN0IH0gPSB0aGlzLnJlc3VsdHM7XG5cblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHBsdXJhbCA9IHBsdXJhbGl6ZShpZGVudGlmaWVyKTtcblxuXHRcdFx0bGV0IHZhbHVlcyA9IGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgZmlyc3QgPSBsaXN0LmdldEl0ZW0oMCk7XG5cdFx0XHRsZXQgZmlyc3RWYWx1ZSA9IGZpcnN0ID8gZmlyc3QudG9Tb3VyY2UoY29udGV4dCkgOiBcInVuZGVmaW5lZFwiO1xuXG5cdFx0XHRyZXR1cm4gYEBwcm90b1xcbmBcblx0XHRcdFx0ICsgYCR7cGx1cmFsfSA9ICR7dmFsdWVzfVxcbmBcblx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9KCkgeyByZXR1cm4gdGhpcy5fXyR7aWRlbnRpZmllcn0gPT09IHVuZGVmaW5lZCA/ICR7Zmlyc3RWYWx1ZX0gOiB0aGlzLl9fJHtpZGVudGlmaWVyfSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblxuLy8gTU9SRSBFRkZJQ0lFTlQgQlVUIFVHTElFUlxuLy8gXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9O1xcbmBcbi8vIFx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9IHsgcmV0dXJuIChcIl9fJHtpZGVudGlmaWVyfVwiIGluIHRoaXMgPyB0aGlzLl9fJHtpZGVudGlmaWVyfSA6ICR7Zmlyc3RWYWx1ZX0pIH1cXG5gXG4vLyBcdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy5jb25zdHJ1Y3Rvci4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdFNlbGYtcmVmZXJlbmNlXG4vL1xucGFyc2VyLmFkZEtleXdvcmQoXCJtZVwiLCBcIm1lXCIsXG5cdGNsYXNzIG1lIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gXCJ0aGlzXCI7XG5cdFx0fVxuXHR9XG4pO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHBhcnNlci5ydWxlcy5tZSk7XG5cbi8vIFRPRE86IHRoaXMgcmVhbGx5IG1ha2VzIG1lIHdhbnQgdG8gbWFrZSBgSSBhbSBlbXB0eWAgZXRjIHdvcmsuLi5cbnBhcnNlci5hZGRLZXl3b3JkKFwiSVwiLCBcIklcIixcblx0Y2xhc3MgSSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0cmV0dXJuIFwidGhpc1wiO1xuXHRcdH1cblx0fVxuKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMuSSk7XG5cblxuLy9cbi8vXHRQcm9wZXJ0eSBhY2Nlc3Ncbi8vXG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIocHJvcGVydGllczp0aGUge2lkZW50aWZpZXJ9IG9mKSsgdGhlPyB7ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgcHJvcGVydGllcyB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRwcm9wZXJ0aWVzID0gcHJvcGVydGllcy5yZXN1bHRzXG5cdFx0XHRcdFx0XHRcdC5yZXZlcnNlKClcblx0XHRcdFx0XHRcdFx0Lm1hcCggcHJvcGVydHkgPT4gcHJvcGVydHkuaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSApXG5cdFx0XHRcdFx0XHRcdC5qb2luKFwiLlwiKTtcblx0XHRcdHJldHVybiBgJHtleHByZXNzaW9ufS4ke3Byb3BlcnRpZXN9YDtcbi8vIE5PVEU6IHRoZSBmb2xsb3dpbmcgaXMgc2FmZXIsIGJ1dCB1Z2x5IGZvciBkZW1vIHB1cnBvc2VzXG4vL1x0XHRcdHJldHVybiBgc3BlbGwuZ2V0KCR7ZXhwcmVzc2lvbn0sIFsnJHtwcm9wZXJ0aWVzfSddKWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwcm9wZXJ0eV9leHByZXNzaW9uXCIsXG5cdFwiKG15fHRoaXMpIHtpZGVudGlmaWVyfVwiLFxuXHRjbGFzcyBwcm9wZXJ0eV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgdGhpcy4ke2lkZW50aWZpZXJ9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvdHlwZXMuanMiLCJ2YXIgZztcclxuXHJcbi8vIFRoaXMgd29ya3MgaW4gbm9uLXN0cmljdCBtb2RlXHJcbmcgPSAoZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHRoaXM7XHJcbn0pKCk7XHJcblxyXG50cnkge1xyXG5cdC8vIFRoaXMgd29ya3MgaWYgZXZhbCBpcyBhbGxvd2VkIChzZWUgQ1NQKVxyXG5cdGcgPSBnIHx8IEZ1bmN0aW9uKFwicmV0dXJuIHRoaXNcIikoKSB8fCAoMSxldmFsKShcInRoaXNcIik7XHJcbn0gY2F0Y2goZSkge1xyXG5cdC8vIFRoaXMgd29ya3MgaWYgdGhlIHdpbmRvdyByZWZlcmVuY2UgaXMgYXZhaWxhYmxlXHJcblx0aWYodHlwZW9mIHdpbmRvdyA9PT0gXCJvYmplY3RcIilcclxuXHRcdGcgPSB3aW5kb3c7XHJcbn1cclxuXHJcbi8vIGcgY2FuIHN0aWxsIGJlIHVuZGVmaW5lZCwgYnV0IG5vdGhpbmcgdG8gZG8gYWJvdXQgaXQuLi5cclxuLy8gV2UgcmV0dXJuIHVuZGVmaW5lZCwgaW5zdGVhZCBvZiBub3RoaW5nIGhlcmUsIHNvIGl0J3NcclxuLy8gZWFzaWVyIHRvIGhhbmRsZSB0aGlzIGNhc2UuIGlmKCFnbG9iYWwpIHsgLi4ufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBnO1xyXG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAod2VicGFjaykvYnVpbGRpbi9nbG9iYWwuanNcbi8vIG1vZHVsZSBpZCA9IDE1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIE1ha2Ugc3VyZSBgZ2xvYmFsYCBpcyBkZWZpbmVkIGdsb2JhbGx5OlxuLy9cdC0gZWl0aGVyIGFzIHRoZSBub2RlanMgYGdsb2JhbGAsIG9yXG4vL1x0LSBhcyBhbiBhbGlhcyBmb3IgYHdpbmRvd2AgaW4gYnJvd3NlcnMsIG9yXG4vL1x0LSBmb3IgdGhlIGBzZWxmYCBjb250ZXh0IGluIHdlYiB3b3JrZXJzLlxuLy9cbi8vIE5PVEU6IHRoaXMgbW9kaWZpZXMgdGhlIFwiZ2xvYmFsXCIgZW52aXJvbm1lbnQgYnkgbWFraW5nIHN1cmUgXCJnbG9iYWxcIiBpcyBzZXQuIVxuLy9cblxubGV0IGdsb2JhbF9pZGVudGlmaWVyO1xuaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gbm9kZVwiKTtcblx0Z2xvYmFsX2lkZW50aWZpZXIgPSBnbG9iYWw7XG59XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4vL1x0Y29uc29sZS5sb2coXCJSdW5uaW5nIGluIGEgd2ViIGJyb3dzZXJcIik7XG5cdHdpbmRvdy5nbG9iYWwgPSB3aW5kb3c7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gd2luZG93O1xufVxuXG5pZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gYSB3ZWIgd29ya2VyXCIpO1xuXHRzZWxmLmdsb2JhbCA9IHNlbGY7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gc2VsZjtcbn1cblxuLy8gRXhwb3J0IGZvciBjb25zdW1wdGlvbiBieSBpbXBvcnQuXG5leHBvcnQgZGVmYXVsdCBnbG9iYWxfaWRlbnRpZmllcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2dsb2JhbC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVhbGluZyB3aXRoIG51bWJlcnNcbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vIEluZGV4IGV4cHJlc3Npb246IG51bWVyaWMgaW5kZXggaW4gc29tZSBsaXN0LlxuLy8gTk9URTogT3VyIGluZGV4ZXMgYXJlICoqMS1iYXNlZCoqIGFuZCBKYXZhc2NyaXB0IGlzICoqMC1iYXNlZCoqLlxuLy9cdFx0IGUuZy4gYGl0ZW0gMSBvZiB0aGUgYXJyYXlgICA9IGBhcnJheVswXWBcbi8vXG4vLyBUT0RPOiBpZiBgaWRlbnRpZmllcmAgaXMgXCJ3b3JkXCIsIG91dHB1dCBgZ2V0V29yZCgpYCBldGNcbmNsYXNzIGluZGV4X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb257XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgeyBpZGVudGlmaWVyLCBpbmRleCwgZXhwcmVzc2lvbiB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdGluZGV4ID0gaW5kZXgudG9Tb3VyY2UoY29udGV4dCk7XG5cblx0XHQvLyBJZiB3ZSBnb3QgYSBwb3NpdGl2ZSBudW1iZXIgbGl0ZXJhbCwgY29tcGVuc2F0ZSBmb3IgSlMgMC1iYXNlZCBhcnJheXMgbm93LFxuXHRcdC8vIGZvciBuaWNlciBvdXRwdXQuXG5cdFx0aWYgKHR5cGVvZiBpbmRleCA9PT0gXCJudW1iZXJcIiAmJiBpbmRleCA+IDApIHtcblx0XHRcdHJldHVybiBgJHtleHByZXNzaW9ufVske2luZGV4IC0gMX1dYDtcblx0XHR9XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7aW5kZXh9KWA7XG5cbi8vIFRoaXMgaXMgc2FmZXIsIGJ1dCB1c2luZyB0aGUgYWJvdmUgc29tZXRpbWVzIGZvciBkZW1vIHB1cnBvc2VzXG4vL1x0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtpbmRleH0pYDtcblx0fVxufVxuXG4vLyBOdW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nOlxuLy9cdC0gYGl0ZW0gMSBvZiAuLi5gXG4vL1x0LSBgaXRlbSAjMiBvZiAuLi5gXG4vLyBOT1RFOiB0aGVzZSBpbmRpY2VzIGFyZSBPTkUgYmFzZWQsIE5PVCB6ZXJvIGJhc2VkIGFzIGlzIEphdmFzY3JpcHQuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4X2V4cHJlc3Npb25cIiwgXCJ7aWRlbnRpZmllcn0gKCMpP3tpbmRleDpleHByZXNzaW9ufSBvZiAodGhlPykge2V4cHJlc3Npb259XCIsIGluZGV4X2V4cHJlc3Npb24pO1xuXG5jbGFzcyBvcmRpbmFsIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHt9XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaXJzdFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2Vjb25kXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJ0aGlyZFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAzIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZm91cnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDQgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaWZ0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA1IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2l4dGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNiB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNldmVudGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNyB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImVpZ2h0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA4IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwibmludGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gOSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInRlbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDEwIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwicGVudWx0aW1hdGVcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaW5hbFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAtMSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImxhc3RcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cbi8vIFRPRE86IHNpeHR5LWZpZnRoLCB0d28gaHVuZHJlZCBmb3J0eSBuaW50aC4uLlxuXG4vLyBBbHRlcm5hdGl2ZSBmb3JtIGZvciBudW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nLlxucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJpbmRleF9leHByZXNzaW9uXCIsIFwidGhlIHtpbmRleDpvcmRpbmFsfSB7aWRlbnRpZmllcn0gb2YgKHRoZSk/IHtleHByZXNzaW9ufVwiLCBpbmRleF9leHByZXNzaW9uKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2xpc3RzLmpzIl0sInNvdXJjZVJvb3QiOiIifQ==