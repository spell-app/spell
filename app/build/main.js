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
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_keyword: function parseRuleSyntax_keyword(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var constructor = arguments[3];

		var words = [],
		    endIndex = void 0;
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
		//	- if one string argument, does a `parseStatement()`
		//	- if two, does a `parseRule()`
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
				//TODO: complain if can't parse the entire line!
				if (result) {
					// split by lines and add indent
					var source = result.toSource(_this).split("\n").map(function (line) {
						return lineStart + line;
					});
					results = results.concat(source);
				} else {
					console.warn("Couldn't parse statement:", statement);
					results.push("// ERROR: " + statement);
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
_parser2.default.addRule("whitespace", new _RuleSyntax2.default.Whitespace({ pattern: /\s+/, optional: true }));

// `word` = is a single alphanumeric word.
// MUST start with a lower-case letter (?)
_RuleSyntax2.default.Word = function (_Rule$Pattern2) {
	_inherits(word, _Rule$Pattern2);

	function word() {
		_classCallCheck(this, word);

		return _possibleConstructorReturn(this, (word.__proto__ || Object.getPrototypeOf(word)).apply(this, arguments));
	}

	return word;
}(_RuleSyntax2.default.Pattern);
var word = _parser2.default.addRule("word", new _RuleSyntax2.default.Word({
	pattern: /[a-z][\w\-]*/,
	// Convert "-" to "_" in source output.
	toSource: function toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
_RuleSyntax2.default.Identifier = function (_Rule$Pattern3) {
	_inherits(identifier, _Rule$Pattern3);

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
_parser2.default.rules.identifier.addToBlacklist("about", "above", "after", "and", "as", "at", "before", "behind", "below", "beneath", "beside", "between", "beyond", "by", "defined", "down", "during", "each", "empty", "exactly", "except", "for", "from", "greater", "I", "in", "into", "less", "long", "me", "minus", "more", "near", "not", "of", "off", "on", "onto", "opposite", "out", "outside", "over", "short", "since", "than", "the", "then", "through", "thru", "to", "toward", "towards", "undefined", "under", "underneath", "unique", "until", "up", "upon", "upside", "versus", "vs", "with", "within", "without");

// Add common english verbs to identifier blacklist.
_parser2.default.rules.identifier.addToBlacklist("are", "do", "does", "contains", "has", "have", "is", "repeat", "was", "were");

// Add special control keywords to identifier blacklist.
_parser2.default.rules.identifier.addToBlacklist("else", "if", "otherwise", "while");

// `Type` = type name.
// MUST start with an upper-case letter (?)
_RuleSyntax2.default.Type = function (_Rule$Pattern4) {
	_inherits(type, _Rule$Pattern4);

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
_RuleSyntax2.default.Number = function (_Rule$Pattern5) {
	_inherits(number, _Rule$Pattern5);

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
_RuleSyntax2.default.Integer = function (_Rule$Pattern6) {
	_inherits(integer, _Rule$Pattern6);

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
_RuleSyntax2.default.Text = function (_Rule$Pattern7) {
	_inherits(text, _Rule$Pattern7);

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
_RuleSyntax2.default.Boolean = function (_Rule$Pattern8) {
	_inherits(boolean, _Rule$Pattern8);

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
var list = _parser2.default.addExpression("literal_list", "\\[[list:{expression},]?\\]", function (_Rule$Expression) {
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

__webpack_require__(10);

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
			if (typeof index === "number") {
				if (index > 0) {
					return expression + "[" + (index - 1) + "]";
				} else {
					return "spell.getItem(" + expression + ", " + index + ")";
				}
			}
			return expression + "[" + index + " - 1]";

			// This is safer, but using the above for demo purposes
			//		return `spell.getItem(${expression}, ${index})`;
		}
	}]);

	return index_expression;
}(_Rule2.default.Expression);

// Numeric index in a list-like thing:
//	- `item 1 of ...`
//	- `item #2 of ...`
// NOTE: these indices are ONE based, NOT zero based as is Javascript.


_parser2.default.addExpression("index_expression", "{identifier} (#)?{index:expression} of {expression}", index_expression);

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
// NOTE: don't add as an expression since we're auto-merged with `index_expression` above.
_parser2.default.addExpression("index_expression", "the {index:ordinal} {identifier} of {expression}", index_expression);

/***/ }),
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

			return "@proto\n" + (plural + " = " + values + "\n") + ("get " + identifier + "() { return this.__" + identifier + " === undefined ? " + firstValue + ") : this.__" + identifier + "}\n") + ("set " + identifier + "(value) { if (this." + plural + ".includes(value)) this.__" + identifier + " = value }");

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
_parser3.default.addRule("expression", _parser3.default.rules.me);
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

/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgNTdmNmM1YzUxMGQ1YTNmNmY5ZTkiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGVTeW50YXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2lmLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy90eXBlcy5qcyIsIndlYnBhY2s6Ly8vKHdlYnBhY2spL2J1aWxkaW4vZ2xvYmFsLmpzIiwid2VicGFjazovLy8uL3NyYy9nbG9iYWwuanMiXSwibmFtZXMiOlsicGFyc2VyIiwid2luZG93IiwiT2JqZWN0IiwiYXNzaWduIiwicGFyc2VSdWxlU3ludGF4Iiwic3ludGF4IiwiU2VxdWVuY2VDb25zdHJ1Y3RvciIsIlNlcXVlbmNlIiwic3ludGF4U3RyZWFtIiwidG9rZW5pc2VSdWxlU3ludGF4IiwicnVsZXMiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwicnVsZSIsImxlbmd0aCIsIlNZTlRBWF9FWFBSRVNTSU9OIiwibWF0Y2giLCJTeW50YXhFcnJvciIsInN0YXJ0SW5kZXgiLCJsYXN0SW5kZXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJlbmRJbmRleCIsImxhc3QiLCJTeW1ib2wiLCJwb3AiLCJtZXJnZVN5bWJvbHMiLCJLZXl3b3JkIiwibWVyZ2VLZXl3b3JkcyIsInB1c2giLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zeW1ib2wiLCJwYXJzZVJ1bGVTeW50YXhfc3VicnVsZSIsInBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyIsInBhcnNlUnVsZVN5bnRheF9saXN0IiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsIktFWVdPUkRfUEFUVEVSTiIsInBhcnNlUnVsZVN5bnRheF9rZXl3b3JkIiwiY29uc3RydWN0b3IiLCJ3b3JkcyIsImkiLCJuZXh0Iiwic3RyaW5nIiwiam9pbiIsInN0YXJ0c1dpdGgiLCJzdWJzdHIiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJzbGljZSIsImFyZ3VtZW50IiwiYWx0ZXJuYXRpdmVzIiwiZ3JvdXBBbHRlcm5hdGl2ZXMiLCJtYXAiLCJncm91cCIsInJlc3VsdHMiLCJBbHRlcm5hdGl2ZXMiLCJ0b2tlbnMiLCJjdXJyZW50IiwidG9rZW4iLCJjb25jYXQiLCJzeW1ib2wiLCJSZXBlYXQiLCJvcHRpb25hbCIsInVuZGVmaW5lZCIsInBhcmFtcyIsImJhbmdQb3NpdGlvbiIsImluZGV4T2YiLCJub3QiLCJTdWJydWxlIiwiTGlzdCIsIml0ZW0iLCJkZWxpbWl0ZXIiLCJkZWZpbmVQcm9wZXJ0aWVzIiwicHJvdG90eXBlIiwiYWRkU2VxdWVuY2UiLCJ2YWx1ZSIsIm5hbWUiLCJydWxlU3ludGF4IiwicHJvcGVydGllcyIsImRlYnVnIiwiY29uc29sZSIsImxvZyIsImFkZFJ1bGUiLCJlIiwiZXJyb3IiLCJhZGRTdGF0ZW1lbnQiLCJTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiRXhwcmVzc2lvbiIsImFkZExpc3QiLCJzdHJlYW0iLCJhZGRLZXl3b3JkIiwiYWRkU3ltYm9sIiwiYWRkUG9zdGZpeE9wZXJhdG9yIiwiQXJyYXkiLCJpc0FycmF5IiwiZm9yRWFjaCIsInRvSlMiLCJUeXBlRXJyb3IiLCJfX3Bvc3RmaXhPcGVyYXRvcnMiLCJwb3N0Zml4T3BlcmF0b3JzIiwiUnVsZSIsImhhc093blByb3BlcnR5IiwiY2xvbmUiLCJjcmVhdGUiLCJwcm9wcyIsImFkdmFuY2VUbyIsInN0YWNrIiwiY29udGV4dCIsIm1hdGNoZWQiLCJuZXh0UnVsZSIsIm5leHRTdHJlYW0iLCJQYXR0ZXJuIiwicGF0dGVybiIsImRlZmluZVByb3BlcnR5IiwiUmVnRXhwIiwic291cmNlIiwic3RhcnRQYXR0ZXJuIiwiYmxhY2tsaXN0IiwibWF0Y2hlZFRleHQiLCJyYW5nZSIsImluZGV4Iiwid29yZCIsIlJlZ0V4cEZyb21TdHJpbmciLCJmaXJzdCIsInNlY29uZCIsInBhdHRlcm5TdHJpbmciLCJlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzIiwiZ2V0UnVsZU9yRGllIiwicGFyc2UiLCJpc0RldGVybWluaXN0aWMiLCJ0ZXN0IiwiTmVzdGVkIiwiZXZlcnkiLCJ0ZXN0UnVsZSIsImxlZnRSZWN1cnNpdmUiLCJzdGFja0NvbnRhaW5zIiwiY2h1bmtpdCIsInBhcnNlSW5DaHVua3MiLCJlYXRXaGl0ZXNwYWNlIiwiYXJnTmFtZSIsInJ1bGVOYW1lIiwiYmVzdE1hdGNoIiwibWF0Y2hlcyIsImdldEJlc3RNYXRjaCIsInJlZHVjZSIsImJlc3QiLCJ0b1NvdXJjZSIsImluY2x1ZGVzIiwiZ3JvdXBFbmQiLCJQYXJzZXIiLCJwcm9wZXJ0eU5hbWUiLCJnZXRSdWxlIiwiYXJndW1lbnRzIiwiY29tcGlsZVN0YXRlbWVudHMiLCJyZXN1bHQiLCJzdGF0ZW1lbnRzIiwidGltZSIsImN1cnJlbnRJbmRlbnQiLCJ0YWJzIiwic3BsaXQiLCJzdGF0ZW1lbnQiLCJ0cmltIiwibGluZVN0YXJ0IiwibGluZUluZGVudCIsImluZGVudGVkU3RhcnQiLCJjbG9zZXJzIiwibGFzdEJsYW5rTGluZSIsIl9nZXRMYXN0QmxhbmtMaW5lIiwic3BsaWNlIiwibGluZSIsIndhcm4iLCJ0aW1lRW5kIiwid2hpdGVzcGFjZSIsImFkdmFuY2VCeSIsImV4aXN0aW5nIiwicnVsZUlzTGVmdFJlY3Vyc2l2ZSIsInN1YnJ1bGUiLCJzdGFydFRva2VuIiwiZW5kVG9rZW4iLCJuZXN0aW5nIiwibmVzdGVkIiwiY2hhciIsImxpc3QiLCJSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTIiwiZmxhZ3MiLCJERUJVRyIsImNoYXJzIiwiV2hpdGVzcGFjZSIsIldvcmQiLCJyZXBsYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJhZGRUb0JsYWNrbGlzdCIsIlR5cGUiLCJ0eXBlIiwiTnVtYmVyIiwibnVtYmVyIiwicGFyc2VGbG9hdCIsIkludGVnZXIiLCJwYXJzZUludCIsIlRleHQiLCJ0ZXh0IiwiQm9vbGVhbiIsImJvb2wiLCJleHByZXNzaW9uIiwiZW5kc1dpdGgiLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJhcmciLCJoZWFkIiwic3Vic3RyaW5nIiwibWVtb2l6ZWQiLCJkZWZpbmVNZW1vaXplZCIsInByb3BlcnR5IiwiZ2V0dGVyIiwiYXBwbHkiLCJjb25maWd1cmFibGUiLCJnZXQiLCJlbHNlUGhyYXNlIiwiZWxzZVN0YXRlbWVudCIsImluZGV4X2V4cHJlc3Npb24iLCJvcmRpbmFsIiwiaW5maXhfb3BlcmF0b3IiLCJwcmVjZWRlbmNlIiwiYSIsImIiLCJ0aGluZyIsImxocyIsInJocyIsIm9wZXJhdG9yIiwiYXNzaWdubWVudCIsIm1lc3NhZ2UiLCJidXR0b25DbGF1c2UiLCJidXR0b25OYW1lIiwib2tCdXR0b24iLCJjYW5jZWxCdXR0b24iLCJjYW5jZWxDbGF1c2UiLCJwbHVyYWxpemUiLCJwcm9wIiwia2V5IiwicHJvcHNfY2xhdXNlIiwibmV3X3RoaW5nIiwiZXh0ZW5kc19jbGF1c2UiLCJzdXBlclR5cGUiLCJhcmdOYW1lcyIsImFyZ3MiLCJhcmdzX2NsYXVzZSIsIndvcmRfY2xhdXNlIiwidHlwZXMiLCJ0b0xvd2VyQ2FzZSIsIm1ldGhvZE5hbWUiLCJjb25kaXRpb25zIiwic2NvcGUiLCJ2YWx1ZV9jbGF1c2UiLCJkZWNsYXJhdGlvbiIsInBsdXJhbCIsInZhbHVlcyIsImdldEl0ZW0iLCJmaXJzdFZhbHVlIiwibWUiLCJJIiwicmV2ZXJzZSIsImdsb2JhbF9pZGVudGlmaWVyIiwiZ2xvYmFsIiwic2VsZiJdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLG1EQUEyQyxjQUFjOztBQUV6RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOzs7O0FBQ0E7Ozs7OztBQUVBO0FBTkE7QUFDQTtBQUNBO0FBS0EsSUFBTUEsU0FBUyxzQkFBZjtrQkFDZUEsTTs7QUFFZjs7QUFDQUMsT0FBT0QsTUFBUCxHQUFnQkEsTUFBaEIsQzs7Ozs7Ozs7Ozs7Ozs7O0FDWEE7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUE7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQUUsT0FBT0MsTUFBUCxpQkFBb0I7O0FBRXBCO0FBQ0E7QUFDQTs7QUFFQTtBQUNDQyxnQkFQbUIsMkJBT0hDLE1BUEcsRUFPMEM7QUFBQSxNQUFyQ0MsbUJBQXFDLHVFQUFmLGVBQUtDLFFBQVU7O0FBQzVELE1BQUlDLGVBQWUsZUFBS0Msa0JBQUwsQ0FBd0JKLE1BQXhCLENBQW5CO0FBQ0EsTUFBSUssUUFBUSxlQUFLQyxzQkFBTCxDQUE0QkgsWUFBNUIsRUFBMEMsRUFBMUMsQ0FBWjs7QUFFQSxNQUFJSSxhQUFKO0FBQ0E7QUFDQSxNQUFJRixN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QWxCLEVBQTZCLE9BQTdCLEVBQXNDbUksT0FBdEMsRUFBK0MsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLFFBQTdCLEVBQXVDbUksT0FBdkMsRUFBZ0QsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQWhEO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDbUksT0FBdEMsRUFBK0MsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDbUksT0FBdEMsRUFBK0MsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLFNBQTdCLEVBQXdDbUksT0FBeEMsRUFBaUQsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQWpEO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLFFBQTdCLEVBQXVDbUksT0FBdkMsRUFBZ0QsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQWhEO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDbUksT0FBdEMsRUFBK0MsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDbUksT0FBdEMsRUFBK0MsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLEVBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLGFBQTdCLEVBQTRDbUksT0FBNUMsRUFBcUQsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENB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T0FKWCxFQUlvQjtBQUFBLE9BQ1hvRixVQURXLEdBQ0ksS0FBSzFJLE9BRFQsQ0FDWDBJLFVBRFc7O0FBRWpCQSxnQkFBYUEsV0FBVzdDLFFBQVgsQ0FBb0J2QyxPQUFwQixDQUFiO0FBQ0Esb0JBQWVvRixVQUFmO0FBQ0E7QUFSSDs7QUFBQTtBQUFBLEVBR21DLHFCQUFLeEcsVUFIeEMsRzs7Ozs7O0FDcFlBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLENBQUM7O0FBRUQ7QUFDQTtBQUNBO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSw0Q0FBNEM7O0FBRTVDOzs7Ozs7Ozs7Ozs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLElBQUkrSywwQkFBSjtBQUNBLElBQUksT0FBT0MsTUFBUCxLQUFrQixXQUF0QixFQUFtQztBQUNuQztBQUNDRCxxQkFBb0JDLE1BQXBCO0FBQ0E7O0FBRUQsSUFBSSxPQUFPclEsTUFBUCxLQUFrQixXQUF0QixFQUFtQztBQUNuQztBQUNDQSxRQUFPcVEsTUFBUCxHQUFnQnJRLE1BQWhCO0FBQ0FvUSxxQkFBb0JwUSxNQUFwQjtBQUNBOztBQUVELElBQUksT0FBT3NRLElBQVAsS0FBZ0IsV0FBcEIsRUFBaUM7QUFDakM7QUFDQ0EsTUFBS0QsTUFBTCxHQUFjQyxJQUFkO0FBQ0FGLHFCQUFvQkUsSUFBcEI7QUFDQTs7QUFFRDtrQkFDZUYsaUIiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBpZGVudGl0eSBmdW5jdGlvbiBmb3IgY2FsbGluZyBoYXJtb255IGltcG9ydHMgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAxMyk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay9ib290c3RyYXAgNTdmNmM1YzUxMGQ1YTNmNmY5ZTkiLCIvL1xuLy9cdCMgQ3JlYXRlIGEgYHBhcnNlcmAgc2luZ2xldG9uIHRvIHVzZSB0byBzZXQgdXAgcnVsZXMgYW5kIGR1cmluZyB0ZXN0cy5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5cbi8vIENyZWF0ZSBwYXJzZXIgaW5zdGFuY2UuXG5jb25zdCBwYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG53aW5kb3cucGFyc2VyID0gcGFyc2VyO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvX3BhcnNlci5qcyIsImltcG9ydCB7IGRlZmluZU1lbW9pemVkIH0gZnJvbSBcIi4vbWVtb2l6ZS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gcmUtZXhwb3J0IFJ1bGUgZm9yIHRlc3RpbmdcbmV4cG9ydCBkZWZhdWx0IFJ1bGU7XG5cbi8vXG4vL1x0IyBQYXJzaW5nIGBydWxlU3ludGF4YCB0byBjcmVhdGUgcnVsZXMgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUT0RPOlx0UHVsbCBgcGFyc2VSdWxlU3ludGF4YCBzdHVmZiBvdXQgaW50byBzZXBhcmF0ZSBtb2R1bGU/XG4vLyBUT0RPOlx0QmV0dGVyIG5hbWUgZm9yIGBydWxlU3ludGF4YFxuLy8gVE9ETzpcdFVzZSBrZXl3b3JkcyBpbiBzeW50YXggdG8gbWFrZSBhIHF1aWNrIHJlZ2V4LWJhc2VkIGB0ZXN0YCBmdW5jdGlvbiBmb3IgdGhlIGVudGlyZSBydWxlXG5PYmplY3QuYXNzaWduKFJ1bGUsIHtcblxuLy9cbi8vICMjIGdyb3VwOiBwYXJzaW5nIHN5bnRheFxuLy9cblxuLy8gVE9ETzogY29udmVydCB0byBUZXh0U3RyZWFtIHBhdHRlcm4gYWxhIG5vcm1hbCBwYXJzZXIgb25jZSB0aGF0IHNldHRsZXMgZG93bj8/P1xuXHRwYXJzZVJ1bGVTeW50YXgoc3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIFtdKTtcblxuXHRcdGxldCBydWxlO1xuXHRcdC8vIElmIHdlIG9ubHkgZ290IG9uZSB0aGluZywgcmV0dXJuIHRoYXQgYXMgdGhlIHJlc3VsdFxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSBydWxlc1swXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFNlcXVlbmNlQ29uc3RydWN0b3IoeyBydWxlcyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fSxcblxuXHR0b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KSB7XG5cdFx0Y29uc3QgU1lOVEFYX0VYUFJFU1NJT04gPSAvKD86W1xcd1xcLV0rfFxcXFxbXFxbXFwoXFx7XFwpXFx9XFxdXXxbXlxcc1xcd118XFx8KS9nO1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBzeW50YXgubWF0Y2goU1lOVEFYX0VYUFJFU1NJT04pO1xuXHRcdGlmICghc3ludGF4U3RyZWFtKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHRva2VuaXplIHBhcnNlIHJ1bGUgc3ludGF4ID4+JHtzeW50YXh9PDxgKTtcblx0XHRyZXR1cm4gc3ludGF4U3RyZWFtO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBsYXN0SW5kZXggPSBzeW50YXhTdHJlYW0ubGVuZ3RoO1xuXHRcdHdoaWxlIChzdGFydEluZGV4IDwgbGFzdEluZGV4KSB7XG5cdFx0XHRsZXQgWyBydWxlLCBlbmRJbmRleCBdID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRpZiAocnVsZSkge1xuXHRcdFx0XHRsZXQgbGFzdCA9IHJ1bGVzW3J1bGVzLmxlbmd0aC0xXTtcblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBTdHJpbmdgIGFuZCBsYXN0IHdhcyBhIGBTdHJpbmdgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5TeW1ib2wgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sKSB7XG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBsYXN0IHJ1bGVcblx0XHRcdFx0XHRydWxlcy5wb3AoKTtcblx0XHRcdFx0XHQvLyBhbmQgcmVwbGFjZSB3aXRoIGEgcnVsZSB0aGF0IG1lcmdlcyB0aGUga2V5d29yZHNcblx0XHRcdFx0XHRydWxlID0gUnVsZS5tZXJnZVN5bWJvbHMobGFzdCwgcnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBLZXl3b3JkYCBhbmQgbGFzdCB3YXMgYWxzbyBhIGBLZXl3b3JkYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0ZWxzZSBpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQpIHtcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuXHRcdFx0XHRcdC8vIGFuZCByZXBsYWNlIHdpdGggYSBydWxlIHRoYXQgbWVyZ2VzIHRoZSBrZXl3b3Jkc1xuXHRcdFx0XHRcdHJ1bGUgPSBSdWxlLm1lcmdlS2V5d29yZHMobGFzdCwgcnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cnVsZXMucHVzaChydWxlKTtcblx0XHRcdH1cblx0XHRcdHN0YXJ0SW5kZXggPSBlbmRJbmRleCArIDE7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlcztcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdC8vIGlmIHdlIGdvdCBhIFwiXFxcXFwiICh3aGljaCBhbHNvIGhhcyB0byBnbyBpbnRvIHRoZSBzb3VyY2Ugc3RyaW5nIGFzIFwiXFxcXFwiKVxuXHRcdC8vIHRyZWF0IHRoZSBuZXh0IHRva2VuIGFzIGEgbGl0ZXJhbCBzdHJpbmcgcmF0aGVyIHRoYW4gYXMgYSBzcGVjaWFsIGNoYXJhY3Rlci5cblx0XHRpZiAoc3ludGF4VG9rZW4gPT09IFwiXFxcXFwiKSB7XG5cdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3ltYm9sKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggKyAxKTtcblx0XHR9XG5cblx0XHRzd2l0Y2ggKHN5bnRheFRva2VuKSB7XG5cdFx0XHRjYXNlIFwie1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIipcIjpcblx0XHRcdGNhc2UgXCIrXCI6XG5cdFx0XHRjYXNlIFwiP1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblxuXHRcdFx0Ly8gdGhlIGZvbGxvd2luZyBzaG91bGQgQUxXQVlTIGJlIGNvbnN1bWVkIGJ5IHRoZSBhYm92ZVxuXHRcdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGNhc2UgXCIpXCI6XG5cdFx0XHRjYXNlIFwiXVwiOlxuXHRcdFx0Y2FzZSBcInxcIjpcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7c3ludGF4VG9rZW59IGZvdW5kIGFzIGl0ZW0gJHtzdGFydEluZGV4fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRpZiAoc3ludGF4VG9rZW4ubWF0Y2goUnVsZS5LRVlXT1JEX1BBVFRFUk4pKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N5bWJvbChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRLRVlXT1JEX1BBVFRFUk4gOiAvW0EtWmEtel0rLyxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfa2V5d29yZChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwLCBjb25zdHJ1Y3Rvcikge1xuXHRcdGxldCB3b3JkcyA9IFtdLCBlbmRJbmRleDtcblx0XHRmb3IgKHZhciBpID0gc3RhcnRJbmRleDsgaSA8IHN5bnRheFN0cmVhbS5sZW5ndGg7IGkrKykge1xuXHRcdFx0bGV0IG5leHQgPSBzeW50YXhTdHJlYW1baV07XG5cdFx0XHRpZiAobmV4dC5tYXRjaChSdWxlLktFWVdPUkRfUEFUVEVSTikpIHtcblx0XHRcdFx0d29yZHMucHVzaChuZXh0KTtcblx0XHRcdFx0ZW5kSW5kZXggPSBpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBicmVhaztcblx0XHR9XG5cblx0XHRpZiAoIWNvbnN0cnVjdG9yKSBjb25zdHJ1Y3RvciA9IFJ1bGUuS2V5d29yZDtcblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IHN0cmluZzogd29yZHMuam9pbihcIiBcIikgfSk7XG5cblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCwgY29uc3RydWN0b3IgPSBSdWxlLlN5bWJvbCkge1xuXHRcdGxldCBzdHJpbmcgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cdFx0aWYgKCFjb25zdHJ1Y3RvcikgY29uc3RydWN0b3IgPSBSdWxlLlN5bWJvbDtcblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IHN0cmluZzogc3RyaW5nIH0pO1xuXG5cdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRpZiAoc3RyaW5nLnN0YXJ0c1dpdGgoXCJcXFxcXCIpKSB7XG5cdFx0XHQvLyByZW1vdmUgbGVhZGluZyBzbGFzaCBpbiBtYXRjaCBzdHJpbmcuLi5cblx0XHRcdHJ1bGUuc3RyaW5nID0gcnVsZS5zdHJpbmcuc3Vic3RyKDEpO1xuXHRcdFx0Ly8gYnV0IGxlYXZlIGl0IGluIHRvU3RyaW5nXG5cdFx0XHRydWxlLnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuXHRcdH1cblx0XHRyZXR1cm4gWyBydWxlLCBzdGFydEluZGV4IF07XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBncm91cGluZyBleHByZXNzaW9uIGAoLi4ufC4uLilgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0Ly8gTk9URTogbmVzdGVkIHBhcmVucyBtYXkgbm90IGhhdmUgYWx0ZXJuYXRpdmVzLi4uIDotKCAgIGAoYXwoYnxjKSlgIHdvbid0IHdvcms/Pz9cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCIoXCIsIFwiKVwiLCBzdGFydEluZGV4KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHQvLyBzcGxpdCBpbnRvIGdyb3VwcywgaW5jbHVkaW5nIG5lc3RlZCBwYXJlbnNcblx0XHRsZXQgYWx0ZXJuYXRpdmVzID1cblx0XHRcdGdyb3VwQWx0ZXJuYXRpdmVzKHNsaWNlKVxuXHRcdFx0Lm1hcChmdW5jdGlvbihncm91cCkge1xuXHRcdFx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2Vucyhncm91cCwgW10pO1xuXHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0c1swXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IFJ1bGUuU2VxdWVuY2UoeyBydWxlczogcmVzdWx0cyB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRsZXQgcnVsZSA9IGFsdGVybmF0aXZlcy5sZW5ndGggPT09IDEgPyBhbHRlcm5hdGl2ZXNbMF0gOiBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlczogYWx0ZXJuYXRpdmVzIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cblx0XHRmdW5jdGlvbiBncm91cEFsdGVybmF0aXZlcyh0b2tlbnMpIHtcblx0XHRcdGxldCBhbHRlcm5hdGl2ZXMgPSBbXTtcblx0XHRcdGxldCBjdXJyZW50ID0gW107XG5cdFx0XHRmb3IgKGxldCBpID0gMCwgdG9rZW47IHRva2VuID0gdG9rZW5zW2ldOyBpKyspIHtcblx0XHRcdFx0Ly8gaGFuZGxlIGFsdGVybmF0ZSBtYXJrZXJcblx0XHRcdFx0aWYgKHRva2VuID09PSBcInxcIikge1xuXHRcdFx0XHRcdGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBbXTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBoYW5kbGUgbmVzdGVkIHBhcmVuc1xuXHRcdFx0XHRlbHNlIGlmICh0b2tlbiA9PT0gXCIoXCIpIHtcblx0XHRcdFx0XHRsZXQgeyBlbmRJbmRleCB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBcIihcIiwgXCIpXCIsIGkpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBjdXJyZW50LmNvbmNhdCh0b2tlbnMuc2xpY2UoaSwgZW5kSW5kZXggKyAxKSk7XG5cdFx0XHRcdFx0aSA9IGVuZEluZGV4O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGN1cnJlbnQucHVzaCh0b2tlbik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChjdXJyZW50Lmxlbmd0aCkgYWx0ZXJuYXRpdmVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRyZXR1cm4gYWx0ZXJuYXRpdmVzO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCByZXBlYXQgaW5kaWNhdG9yIGA/YCwgYCtgIG9yIGAqYCBieSBhdHRhY2hpbmcgaXQgdG8gdGhlIHByZXZpb3VzIHJ1bGUuXG5cdHBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBzeW1ib2wgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cdFx0bGV0IHJ1bGUgPSBydWxlc1tydWxlcy5sZW5ndGggLSAxXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgYXR0YWNoIHJlcGVhdCBzeW1ib2wgJHtzeW1ib2x9IHRvIGVtcHR5IHJ1bGUhYCk7XG5cblx0XHQvLyBUcmFuc2Zvcm0gbGFzdCBydWxlIGludG8gYSByZXBlYXQgZm9yIGAqYCBhbmQgYCtgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiKlwiIHx8IHN5bWJvbCA9PT0gXCIrXCIpIHtcblx0XHRcdGxldCBhcmd1bWVudCA9IHJ1bGUuYXJndW1lbnQ7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuUmVwZWF0KHsgcnVsZSB9KTtcblx0XHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdFx0Ly8gcHVzaCBpbnRvIHJ1bGUgc3RhY2sgaW4gcGxhY2Ugb2Ygb2xkIHJ1bGVcblx0XHRcdHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdID0gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBSdWxlIGlzIG9wdGlvbmFsIGZvciBgP2AgYW5kIGAqYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIj9cIiB8fCBzeW1ib2wgPT09IFwiKlwiKSB7XG5cdFx0XHRydWxlLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gWyB1bmRlZmluZWQsIHN0YXJ0SW5kZXggXVxuXHR9LFxuXG5cdC8vIE1hdGNoIGB7PHJ1bGVOYW1lPn1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBtYXRjaCA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJ7XCIsIFwifVwiLCBzdGFydEluZGV4KTtcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA9PT0gMyAmJiBtYXRjaC5zbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gbWF0Y2guc2xpY2VbMF07XG5cdFx0XHRtYXRjaC5zbGljZSA9IG1hdGNoLnNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID4gMSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBwcm9jZXNzIHJ1bGVzIHdpdGggbW9yZSB0aGFuIG9uZSBydWxlIG5hbWU6IHske21hdGNoLnNsaWNlLmpvaW4oXCJcIil9fWApO1xuXG5cdFx0bGV0IHBhcmFtcyA9IHsgcnVsZTogbWF0Y2guc2xpY2VbMF0gfTtcblxuXHRcdC8vIHNlZSBpZiB0aGVyZSdzIGEgYG5vdGAgcnVsZSBpbiB0aGVyZVxuXHRcdGxldCBiYW5nUG9zaXRpb24gPSBwYXJhbXMucnVsZS5pbmRleE9mKFwiIVwiKTtcblx0XHRpZiAoYmFuZ1Bvc2l0aW9uICE9PSAtMSkge1xuXHRcdFx0cGFyYW1zLm5vdCA9IHBhcmFtcy5ydWxlLnN1YnN0cihiYW5nUG9zaXRpb24gKyAxKTsgLy9bIHBhcmFtcy5ydWxlLnN1YnN0cihiYW5nUG9zaXRpb24gKyAxKSBdO1xuXHRcdFx0cGFyYW1zLnJ1bGUgPSBwYXJhbXMucnVsZS5zdWJzdHIoMCwgYmFuZ1Bvc2l0aW9uKTtcblx0XHR9XG5cblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlN1YnJ1bGUocGFyYW1zKTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBtYXRjaC5lbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwLCBjb25zdHJ1Y3RvciA9IFJ1bGUuTGlzdCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIltcIiwgXCJdXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHRpZiAocmVzdWx0cy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCBzdHVmZiBhdCBlbmQgb2YgbGlzdDogWyR7c2xpY2Uuam9pbihcIiBcIil9XWApO1xuXHRcdH1cblx0XHRsZXQgWyBpdGVtLCBkZWxpbWl0ZXIgXSA9IHJlc3VsdHM7XG5cblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IGl0ZW0sIGRlbGltaXRlciB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG59KTtcblxuXG5cbi8vICMjICBBZGQgbWV0aG9kcyB0byBQYXJzZXIgdG8gZGVmaW5lIHJ1bGVzIHVzaW5nIHRoZSBhYm92ZSBzeW50YXguXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhQYXJzZXIucHJvdG90eXBlLCB7XG5cblx0Ly8gUGFyc2UgYSBgcnVsZVN5bnRheGAgcnVsZSBhbmQgYWRkIGl0IHRvIG91ciBsaXN0IG9mIHJ1bGVzLlxuXHQvLyBSZXR1cm5zIHRoZSBuZXcgcnVsZS5cblx0Ly8gTG9ncyBwYXJzaW5nIGVycm9ycyBidXQgYWxsb3dzIHRoaW5ncyB0byBjb250aW51ZS5cblx0YWRkU2VxdWVuY2U6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSwgcHJvcGVydGllcykge1xuXHRcdGlmICh0eXBlb2YgY29uc3RydWN0b3IgIT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0cHJvcGVydGllcyA9IGNvbnN0cnVjdG9yO1xuXHRcdFx0Y29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlO1xuXHRcdH1cblx0XHR0cnkge1xuXHRcdFx0bGV0IHJ1bGUgPSBSdWxlLnBhcnNlUnVsZVN5bnRheChydWxlU3ludGF4LCBjb25zdHJ1Y3Rvcik7XG5cdFx0XHQvLyBSZWZsZWN0IHRoZSBydWxlIGJhY2sgb3V0IHRvIG1ha2Ugc3VyZSBpdCBsb29rcyAobW9yZSBvciBsZXNzKSB0aGUgc2FtZVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGVkIHJ1bGUgJyR7bmFtZX0nOlxcbiAgSU5QVVQ6ICR7cnVsZVN5bnRheH0gXFxuIE9VVFBVVDogJHtydWxlfWApO1xuXG4vL2NvbnNvbGUuaW5mbyhuYW1lLCBjb25zdHJ1Y3RvciwgcnVsZSk7XG5cdFx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5ncm91cChgRXJyb3IgcGFyc2luZyBzeW50YXggZm9yIHJ1bGUgJyR7bmFtZX0nOmApO1xuXHRcdFx0Y29uc29sZS5sb2coYHN5bnRheDogJHtydWxlU3ludGF4fWApO1xuXHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHR9XG5cdH19LFxuXG5cdGFkZFN0YXRlbWVudDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlN0YXRlbWVudCwgcHJvcGVydGllcykge1xuXHRcdGxldCBydWxlID0gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJzdGF0ZW1lbnRcIiwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZEV4cHJlc3Npb246IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5FeHByZXNzaW9uLCBwcm9wZXJ0aWVzKSB7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmFkZFNlcXVlbmNlKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZExpc3Q6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5MaXN0LCBwcm9wZXJ0aWVzKSB7XG5cdFx0bGV0IHN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgpO1xuXHRcdGxldCBydWxlID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKVswXTtcblx0XHRpZiAoIXJ1bGUpIHJldHVybjtcblx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRLZXl3b3JkOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuS2V5d29yZCwgcHJvcGVydGllcykge1xuXHRcdGxldCBzdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChydWxlU3ludGF4KTtcblx0XHRsZXQgcnVsZSA9IChSdWxlLnBhcnNlUnVsZVN5bnRheF9rZXl3b3JkKHN0cmVhbSwgW10sIDAsIGNvbnN0cnVjdG9yKSB8fCBbXSlbMF07XG5cdFx0aWYgKCFydWxlKSByZXR1cm47XG5cdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fX0sXG5cblx0YWRkU3ltYm9sOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuU3ltYm9sLCBwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gVE9ETzogYXNzdW1lIHdlIGp1c3QgaGF2ZSBvbmUgc3ltYm9sIG9mIG1hbnkgbGV0dGVycy4uLlxuXHRcdGxldCBzdHJlYW0gPSBbcnVsZVN5bnRheF07XG5cdFx0bGV0IHJ1bGUgPSAoUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3ltYm9sKHN0cmVhbSwgW10sIDAsIGNvbnN0cnVjdG9yKSB8fCBbXSlbMF07XG5cdFx0aWYgKCFydWxlKSByZXR1cm47XG5cdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fX0sXG5cblx0Ly8gQWRkIHBvc3RmaXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIGlzIGRlZmluZWRcIlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZFBvc3RmaXhPcGVyYXRvcjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKSB7XG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFBvc3RmaXhPcGVyYXRvcihuYW1lLCBzeW50YXgsIHByb3BlcnRpZXMpKTtcblx0XHR9XG5cblx0XHRsZXQgcnVsZSA9IHRoaXMuYWRkU2VxdWVuY2UobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50b0pTKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIHBvc3RmaXggb3BlcmF0b3IgcnVsZSAnJHtuYW1lfScgdG8gc3BlY2lmeSAndG9KUycgZnVuY3Rpb25gKTtcblx0XHRcdH1cblx0XHRcdC8vIGNsZWFyIGxpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGZvciBnZXR0ZXIgYmVsb3dcblx0XHRcdGRlbGV0ZSB0aGlzLl9fcG9zdGZpeE9wZXJhdG9ycztcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJwb3N0Zml4X29wZXJhdG9yXCIsIHJ1bGUpO1xuXHRcdH1cblx0fX0sXG5cblx0Ly8gTGlzdCBvZiBwb3N0Zml4IG9wZXJhdG9ycyBhcyBzdHJpbmdzLlxuXHQvLyBSZS1tZW1vaXplZCBhZnRlciBgYWRkSW5maXhPcGVyYXRvcmAgYWJvdmUuXG5cdHBvc3RmaXhPcGVyYXRvcnM6IGRlZmluZU1lbW9pemVkKFwiX19wb3NmaXhPcGVyYXRvcnNcIixcblx0XHRmdW5jdGlvbigpeyByZXR1cm4gdGhpcy5ydWxlc1tcInBvc3RmaXhfb3BlcmF0b3JcIl1cblx0XHRcdFx0XHRcdCYmIHRoaXMucnVsZXNbXCJwb3N0Zml4X29wZXJhdG9yXCJdLnJ1bGVzLm1hcChydWxlID0+IHJ1bGUuc3RyaW5nKTtcblx0fSlcbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGVTeW50YXguanMiLCIvL1x0IyBQYXJzZXIgUnVsZXNcbi8vXHRSdWxlcyBjYW4gYmUgYXMgc2ltcGxlIGFzIGEgc3RyaW5nIGBLZXl3b3JkYCBvciBhIGNvbXBsZXggc2VxdWVuY2Ugb2YgKG5lc3RlZCkgcnVsZXMuXG4vL1xuLy9cdFBhcnNlIGEgcnVsZSB3aXRoIGBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKWAsIHRoaXMgd2lsbCBlaXRoZXI6XG4vL1x0XHQtIHJldHVybiBgdW5kZWZpbmVkYCBpZiB0aGUgcnVsZSBkb2Vzbid0IG1hdGNoIHRoZSBoZWFkIG9mIHRoZSBzdHJlYW0sIG9yXG4vL1x0XHQtIHJldHVybiBhIENMT05FIG9mIHRoZSBydWxlIHdpdGggYXQgbGVhc3QgdGhlIGZvbGxvd2luZzpcbi8vXHRcdFx0LSBgc3RyZWFtYFx0XHRTdHJlYW0gd2hpY2ggd2FzIG1hdGNoZWQgd2l0aCBgc3RhcnRJbmRleGAgYXQgdGhlIHN0YXJ0IG9mIHRoZSBtYXRjaFxuLy9cdFx0XHQtIGBlbmRJbmRleGBcdE5vbi1pbmNsdXNpdmUgZW5kIGluZGV4IGluIHN0cmVhbSB3aGVyZSBtYXRjaCBlbmRzLlxuLy9cbi8vXHRUaGUgY2xvbmUgcmV0dXJuZWQgYWJvdmUgY2FuIGJlIG1hbmlwdWxhdGVkIHdpdGhcbi8vXHRcdC0gYHJ1bGUucmVzdWx0c2BcdFx0XHRSZXR1cm4gbWF0Y2hlZCBhcmd1bWVudHMgaW4gYSBmb3JtYXQgc3VpdGFibGUgdG8gZG86XG4vL1x0XHQtIGBydWxlLnRvU291cmNlKGNvbnRleHQpYFx0UmV0dXJuIGphdmFzY3JpcHQgc291cmNlIHRvIGludGVycHJldCB0aGUgcnVsZS5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKHRoaXMuY29uc3RydWN0b3IgIT09IFJ1bGUgfHwgIXRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLmhhc093blByb3BlcnR5KFwiY29uc3RydWN0b3JcIikpIHtcbi8vY29uc29sZS53YXJuKFwibm90IHJ1bGVcIiwgdGhpcyk7XG5cdFx0fVxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKC4uLnByb3BzKSB7XG5cdFx0bGV0IGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCAuLi5wcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuLy9cbi8vXHRQYXJzaW5nIHByaW1pdGl2ZXMgLS0geW91IE1VU1QgaW1wbGVtZW50IHRoZXNlIGluIHlvdXIgc3ViY2xhc3NlcyFcbi8vXG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHJ1bGUgaW4gdGhlIGBzdHJlYW1gLlxuXHQvLyBSZXR1cm5zIHJlc3VsdHMgb2YgdGhlIHBhcnNlIG9yIGB1bmRlZmluZWRgLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gSXMgdGhpcyBydWxlIGRldGVybWluaXN0aWMsIGVnOiBjYW4gaXQgYmUgcXVpY2tseSBhbmQgdW5hbWJpZ3VvdXNseSBzYXRpc2ZpZWQ/XG5cdC8vIFJldHVybmluZyBgdHJ1ZWAgY2FuIHNwZWVkIHVwIHNlcXVlbmNlIHByb2Nlc3NpbmcsXG5cdC8vXHRidXQgaWYgeW91J3JlIHJlYWxseSBub3Qgc3VyZSwgcmV0dXJuIGB1bmRlZmluZWRgLlxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYml0cyBvZiBvdXIgcnVsZSBhcmUgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYyAoYnV0IGFsbCBwYXR0ZXJucyBhcmUgZGV0ZXJtaW5pc3RpYylcblx0Ly9cdC0gcmVnZXggbWF0Y2ggaWYgZm91bmQsXG5cdC8vXHQtIGBmYWxzZWAgaWYgbm90IGZvdW5kXG5cdHRlc3QocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGUgcGFyc2UgYHN0YWNrYCBhbHJlYWR5IGNvbnRhaW4gYHJ1bGVgP1xuXHRzdGF0aWMgc3RhY2tDb250YWlucyhzdGFjaywgcnVsZSwgc3RyZWFtKSB7XG5cdFx0aWYgKHN0YWNrLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGZhbHNlO1xuXG4vL2NvbnNvbGUuaW5mbyhzdGFjayk7XG5cdFx0Ly8gZ28gYmFja3dhcmRzXG5cdFx0Zm9yICh2YXIgaSA9IHN0YWNrLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRsZXQgWyBuZXh0UnVsZSwgbmV4dFN0cmVhbSBdID0gc3RhY2tbaV07XG5cdFx0XHRpZiAobmV4dFJ1bGUgPT09IHJ1bGUpIHtcblx0XHRcdFx0aWYgKG5leHRTdHJlYW0uc3RhcnRJbmRleCA9PT0gc3RyZWFtLnN0YXJ0SW5kZXgpIHtcbi8vXHRcdFx0XHRcdGNvbnNvbGUud2FybihcImZvdW5kIHVucHJvZHVjdGl2ZSBydWxlIFwiLCBydWxlLCBcIiBvbiBzdGFja1wiLCBzdGFjayk7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG4vL1x0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJmb3VuZCBwcm9kdWN0aXZlIHJ1bGUgXCIsIHJ1bGUsIFwiIG9uIHN0YWNrXCIsIHN0YWNrKTtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cbi8vXG4vLyAjIyBvdXRwdXQgYXMgc291cmNlXG4vL1xuXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBOT1RFOiB5b3UgbWF5IHdhbnQgdG8gbWVtb2l6ZSB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvLyBPdXRwdXQgdmFsdWUgZm9yIHRoaXMgSU5TVEFOVElBVEVEIHJ1bGUgYXMgc291cmNlLlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG5cblxuXG5cbi8vIFJlZ2V4IHBhdHRlcm4uXG4vLyBgcnVsZS5wYXR0ZXJuYCBpcyB0aGUgcmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoLlxuLy9cbi8vIE5PVEVcdFRvIG1ha2UgdGhpcyBtb3JlIGdlbmVyYWxseSBhcHBsaWNhYmxlLCBkbyBOT1Qgc3RhcnQgdGhlIHBhdHRlcm4gd2l0aCBhIGBeYC5cbi8vXHRcdFdlJ2xsIGF1dG9tYXRpY2FsbHkgbWFrZSBhIGNvcHkgb2YgdGhlIFJlZ0V4cCB3aXRoIHRoZSBzdGFydCBwb2ludCBhdHRhY2hlZFxuLy9cdFx0YW5kIHVzZSB0aGF0IGFzIGFwcHJvcHJpYXRlLlxuLy9cbi8vXHRcdFRoaXMgd2F5IHdlIGNhbiByZS11c2UgdGhlIHJlZ2V4IHRvIGNoZWNrIGZvciBhIG1hdGNoIGluIHRoZSBtaWRkbGUgb2YgdGhlIHN0cmVhbS4uLlxuLy9cbi8vIFlvdSBjYW4gb3B0aW9uYWxseSBzcGVjaWZ5IGEgYHJ1bGUuYmxhY2tsaXN0YCwgYSBzZXQgb2YgbWF0Y2hlcyB3aGljaCB3aWxsIHNwZWNpZmljYWxseSBOT1Qgd29yayxcbi8vXHRlZyBmb3IgYGlkZW50aWZpZXIuXG5SdWxlLlBhdHRlcm4gPSBjbGFzcyBQYXR0ZXJuIGV4dGVuZHMgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgcGF0dGVybmAgaXMgcmVxdWlyZWRcblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLlBhdHRlcm4oKTogWW91IG11c3QgcGFzcyBhIGBwYXR0ZXJuYCBwYXJhbWV0ZXJcIik7XG5cblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblxuXHRcdC8vIENyZWF0ZSBhIGBzdGFydFBhdHRlcm5gIHRvIG1hdGNoIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cm9uZ1xuXHRcdC8vIENyZWF0ZSBub24tZW51bWVyYWJseS5cblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJzdGFydFBhdHRlcm5cIiwgeyB2YWx1ZTogbmV3IFJlZ0V4cChcIl5cIiArIHRoaXMucGF0dGVybi5zb3VyY2UpIH0pO1xuXHR9XG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHBhdHRlcm4gYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRsZXQgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5zdGFydFBhdHRlcm4pO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBiYWlsIGlmIHByZXNlbnQgaW4gYmxhY2tsaXN0XG5cdFx0bGV0IG1hdGNoZWQgPSBtYXRjaFswXTtcblx0XHRpZiAodGhpcy5ibGFja2xpc3QgJiYgdGhpcy5ibGFja2xpc3RbbWF0Y2hlZF0pIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgZW5kSW5kZXggPSBzdHJlYW0uc3RhcnRJbmRleCArIG1hdGNoZWQubGVuZ3RoO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgZW5kSW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFBhdHRlcm5zIGFyZSBBTFdBWVMgZGV0ZXJtaW5pc3RpYy5cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIHBhdHRlcm5pcyBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljIChidXQgYWxsIHBhdHRlcm5zIGFyZSBkZXRlcm1pbmlzdGljKVxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmRcblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBtYXRjaCA9IHN0cmVhbS5tYXRjaCh0aGlzLnBhdHRlcm4pO1xuXHRcdGlmIChtYXRjaCkge1xuXHRcdFx0bWF0Y2guZW5kSW5kZXggPSAobWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgpO1xuXHRcdFx0cmV0dXJuIG1hdGNoO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRhZGRUb0JsYWNrbGlzdCguLi53b3Jkcykge1xuXHRcdGlmICghdGhpcy5ibGFja2xpc3QpIHRoaXMuYmxhY2tsaXN0ID0ge307XG5cdFx0d29yZHMuZm9yRWFjaCh3b3JkID0+IHRoaXMuYmxhY2tsaXN0W3dvcmRdID0gdHJ1ZSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5wYXR0ZXJuLnNvdXJjZTtcblx0fVxufVxuXG4vLyBSdWxlIGZvciBsaXRlcmFsIHN0cmluZyB2YWx1ZSwgd2hpY2ggaW5jbHVkZSBwdW5jdHVhdGlvbiBzdWNoIGFzIGAoYCBldGMuXG4vLyBgU3ltYm9sYHMgYXJlIGRpZmZlcmVudCBmcm9tIGBLZXl3b3Jkc2AgaW4gdGhhdCB0aGV5IGRvIG5vdCByZXF1aXJlIGEgd29yZCBib3VuZGFyeS5cbi8vVE9ETzogcmVuYW1lIGBTeW1ib2xgPz8/XG5SdWxlLlN5bWJvbCA9IGNsYXNzIFN5bWJvbCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgc3RyaW5nYCBpcyByZXF1aWVkLlxuXHRcdGlmICghcHJvcGVydGllcy5zdHJpbmcpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5TeW1ib2woKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gY29udmVydCBzdHJpbmcgdG8gcGF0dGVyblxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBQYXJzZXIuUmVnRXhwRnJvbVN0cmluZyhwcm9wZXJ0aWVzLnN0cmluZyk7XG4vL2NvbnNvbGUuaW5mbyhwcm9wZXJ0aWVzLnN0cmluZywgcHJvcGVydGllcy5wYXR0ZXJuKTtcblx0XHR9XG5cbi8vXHRcdGNvbnNvbGUuaW5mbyhcImNyZWF0aW5nIHN0cmluZ1wiLCBwcm9wZXJ0aWVzKTtcblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMuc3RyaW5nfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuLy8gTWVyZ2UgdHdvIFN5bWJvbCBydWxlcyB0b2dldGhlciwgcmV0dXJuaW5nIGEgbmV3IHJ1bGUgdGhhdCBtYXRjaGVzIGJvdGguXG5SdWxlLm1lcmdlU3ltYm9scyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0Ly8gR2V0IGN1c3RvbSBjb25zdHJ1Y3RvciBpZiB0aGVyZSBpcyBvbmUuLi5cblx0bGV0IGNvbnN0cnVjdG9yID0gZmlyc3QuY29uc3RydWN0b3IgIT09IFJ1bGUuU3ltYm9sID8gZmlyc3QuY29uc3RydWN0b3IgOiBzZWNvbmQuY29uc3RydWN0b3I7XG5cdHJldHVybiBuZXcgY29uc3RydWN0b3IoeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cbi8vIEtleXdvcmQgcGF0dGVybi5cbi8vIFByb3BlcnRpZXM6XG4vL1x0LSBgcnVsZS5zdHJpbmdgIFx0KHJlcXVpcmVkKSBcdEtleXdvcmQgc3RyaW5nIHRvIG1hdGNoLlxuLy9cdC0gYHJ1bGUucGF0dGVybmBcdChvcHRpb25hbCkgXHRSZWdFeHAgZm9yIHRoZSBtYXRjaC5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0V2UnbGwgY3JlYXRlIG9uZSBmcm9tIGBzdHJpbmdgIGlmIG5lY2Vzc2FyeS5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0Tk9URTogZG8gTk9UIHN0YXJ0IHRoZSBgcGF0dGVybmAgd2l0aCBgXmAuXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLktleXdvcmQoKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gZGVyaXZlIGBwYXR0ZXJuYCBpZiBuZWNlc3NhcnkuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdC8vIGVuZm9yY2Ugd29yZCBib3VuZGFyaWVzIGFuZCBhbGxvdyBhcmJpdHJhcnkgc3BhY2UgYmV0d2VlbiB3b3Jkc1xuXHRcdFx0bGV0IHBhdHRlcm5TdHJpbmcgPSBQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhwcm9wZXJ0aWVzLnN0cmluZyk7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKFwiXFxcXGJcIiArIHBhdHRlcm5TdHJpbmcgKyBcIlxcXFxiXCIpO1xuXHRcdH1cblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuLy8gTWVyZ2UgdHdvIEtleXdvcmQgcnVsZXMgdG9nZXRoZXIsIGFkZGluZyB0aGUgc2Vjb25kIHRvIHRoZSBmaXJzdC5cblJ1bGUubWVyZ2VLZXl3b3JkcyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0Ly8gR2V0IGN1c3RvbSBjb25zdHJ1Y3RvciBpZiB0aGVyZSBpcyBvbmUuLi5cblx0bGV0IGNvbnN0cnVjdG9yID0gZmlyc3QuY29uc3RydWN0b3IgIT09IFJ1bGUuS2V5d29yZCA/IGZpcnN0LmNvbnN0cnVjdG9yIDogc2Vjb25kLmNvbnN0cnVjdG9yO1xuXHRyZXR1cm4gbmV3IGNvbnN0cnVjdG9yKHsgc3RyaW5nOiBmaXJzdC5zdHJpbmcgKyBcIiBcIiArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cblxuLy8gU3VicnVsZSAtLSBuYW1lIG9mIGFub3RoZXIgcnVsZSB0byBiZSBjYWxsZWQuXG4vLyBgcnVsZS5ydWxlYCBpcyB0aGUgbmFtZSBvZiB0aGUgcnVsZSBpbiBgcGFyc2VyLnJ1bGVzYC5cblJ1bGUuU3VicnVsZSA9IGNsYXNzIFN1YnJ1bGUgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZU9yRGllKHRoaXMucnVsZSwgXCJydWxlXCIpO1xuXHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIG1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gbWF0Y2g7XG5cdH1cblxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy5ydWxlLCBcInJ1bGVcIik7XG5cdFx0cmV0dXJuIHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmQgb3Jcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYy5cblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnJ1bGUsIFwicnVsZVwiKTtcblx0XHRyZXR1cm4gcnVsZS50ZXN0KHBhcnNlciwgc3RyZWFtKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgeyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlfX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuXG4vLyBBYnN0cmFjdDogIGBOZXN0ZWRgIHJ1bGUgLS0gY29tcG9zZWQgb2YgYSBzZXJpZXMgb2Ygb3RoZXIgYHJ1bGVzYC5cblJ1bGUuTmVzdGVkID0gY2xhc3MgTmVzdGVkIGV4dGVuZHMgUnVsZSB7XG5cblx0Ly8gSXMgdGhpcyBkZXRlcm1pbmlzdGljLCBlZzogYXJlIG91ciBzdWJydWxlcyB1bmFtYmlnb3VzbHkgZGV0ZXJtaW5hYmxlP1xuLy9UT0RPOiBtZW1vaXplP1xuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlcy5ldmVyeShydWxlID0+IHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSk7XG5cdH1cbn1cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaCAoYXV0by1leGNsdWRpbmcgd2hpdGVzcGFjZSkuXG5SdWxlLlNlcXVlbmNlID0gY2xhc3MgU2VxdWVuY2UgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0Ly8gSWYgd2UgaGF2ZSBhIGB0ZXN0UnVsZWAgZGVmaW5lZFxuXHRcdGlmICh0aGlzLnRlc3RSdWxlKSB7XG5cdFx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy50ZXN0UnVsZSwgXCJ0ZXN0UnVsZVwiKTtcblx0XHRcdGlmIChydWxlLnRlc3QocGFyc2VyLCBzdHJlYW0pID09PSBmYWxzZSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHRpZiAoUnVsZS5zdGFja0NvbnRhaW5zKHN0YWNrLCB0aGlzLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0c3RhY2sgPSBzdGFjay5jb25jYXQoKTtcblx0XHRcdHN0YWNrLnB1c2goW3RoaXMsIHN0cmVhbV0pO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNodW5raXQpIHJldHVybiB0aGlzLnBhcnNlSW5DaHVua3MocGFyc2VyLCBzdHJlYW0sIHN0YWNrKTtcblxuXHRcdGxldCBtYXRjaGVkID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFtYXRjaCAmJiAhcnVsZS5vcHRpb25hbCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0XHRuZXh0ID0gbWF0Y2gubmV4dCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBpZiB3ZSBnZXQgaGVyZSwgd2UgbWF0Y2hlZCBhbGwgdGhlIHJ1bGVzIVxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG4vLyBcdHBhcnNlSW5DaHVua3MocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG4vL1xuLy8gXHR9XG5cbi8vVE9ET0Ncblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gb2JqZWN0IHdpdGggcHJvcGVydGllcyBmcm9tIHRoZSBgbWF0Y2hlZGAgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGBtYXRjaC5hcmd1bWVudGA6XHRcdGFyZ3VtZW50IHNldCB3aGVuIHJ1bGUgd2FzIGRlY2xhcmVkLCBlZzogYHt2YWx1ZTpsaXRlcmFsfWAgPT4gYHZhbHVlYFxuXHQvL1x0XHQtIGBtYXRjaC5ydWxlTmFtZWA6XHRcdG5hbWUgb2YgcnVsZSB3aGVuIGRlZmluZWRcblx0Ly9cdFx0LSBgcnVsZSB0eXBlYDpcdFx0XHRcdG5hbWUgb2YgdGhlIHJ1bGUgdHlwZVxuXHQvLyBOT1RFOiBtZW1vaXplcyB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IHJlc3VsdHMgPSB7fTtcblx0XHRmb3IgKGxldCBtYXRjaCBvZiB0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGxldCBhcmdOYW1lID0gbWF0Y2guYXJndW1lbnQgfHwgbWF0Y2gucnVsZU5hbWUgfHwgbWF0Y2guY29uc3RydWN0b3IubmFtZTtcblxuXHRcdFx0Ly8gSWYgYXJnIGFscmVhZHkgZXhpc3RzLCBjb252ZXJ0IHRvIGFuIGFycmF5XG5cdFx0XHRpZiAoYXJnTmFtZSBpbiByZXN1bHRzKSB7XG5cdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShyZXN1bHRzW2FyZ05hbWVdKSkgcmVzdWx0c1thcmdOYW1lXSA9IFtyZXN1bHRzW2FyZ05hbWVdXTtcblx0XHRcdFx0cmVzdWx0c1thcmdOYW1lXS5wdXNoKG1hdGNoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdID0gbWF0Y2g7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBleHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIFN0YXRlbWVudHMgdGFrZSB1cCB0aGUgZW50aXJlIGxpbmUuXG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXgsIG1hdGNoaW5nIG9uZSBvZiBhIG51bWJlciBvZiBkaWZmZXJlbnQgcnVsZXMuXG4vLyBUaGUgcmVzdWx0IG9mIGEgcGFyc2UgaXMgdGhlIGxvbmdlc3QgcnVsZSB0aGF0IGFjdHVhbGx5IG1hdGNoZWQuXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIGFsdGVybmF0aXZlcyBhcmUgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYy5cblx0Ly9cdC0gcmVnZXggbWF0Y2ggaWYgZm91bmQsXG5cdC8vXHQtIGBmYWxzZWAgaWYgbm90IGZvdW5kIG9yXG5cdHRlc3QocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRpZiAoIXRoaXMuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRsZXQgYmVzdE1hdGNoO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS50ZXN0KHBhcnNlciwgc3RyZWFtKTtcblx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRtYXRjaC5lbmRJbmRleCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuXHRcdFx0XHRyZXR1cm4gbWF0Y2g7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIEZpbmQgYWxsIHJ1bGVzIHdoaWNoIG1hdGNoIGFuZCBkZWxlZ2F0ZSB0byBgZ2V0QmVzdE1hdGNoKClgIHRvIHBpY2sgdGhlIGJlc3Qgb25lLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRsZXQgbWF0Y2hlcyA9IFtdO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXHRcdFx0aWYgKG1hdGNoKSBtYXRjaGVzLnB1c2gobWF0Y2gpO1xuXHRcdH1cblxuXHRcdGlmICghbWF0Y2hlcy5sZW5ndGgpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyB1bmNvbW1lbnQgdGhlIGJlbG93IHRvIHByaW50IGFsdGVybmF0aXZlc1xuXHRcdC8vIGlmIChtYXRjaGVzLmxlbmd0aCA+IDEpIHtcblx0XHQvL1x0Y29uc29sZS5pbmZvKHRoaXMuYXJndW1lbnQgfHwgdGhpcy5ydWxlTmFtZSwgbWF0Y2hlcywgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gubWF0Y2hlZFRleHQpKTtcblx0XHQvLyB9XG5cblx0XHRsZXQgYmVzdE1hdGNoID0gKG1hdGNoZXMubGVuZ3RoID09PSAxID8gbWF0Y2hlc1swXSA6IHRoaXMuZ2V0QmVzdE1hdGNoKG1hdGNoZXMpKTtcblxuXHRcdC8vIGFzc2lnbiBgYXJnTmFtZWAgb3IgYHJ1bGVOYW1lYCBmb3IgYHJlc3VsdHNgXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIGJlc3RNYXRjaC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0ZWxzZSBpZiAodGhpcy5ydWxlTmFtZSkgYmVzdE1hdGNoLnJ1bGVOYW1lID0gdGhpcy5ydWxlTmFtZTtcbi8vVE9ETzogb3RoZXIgdGhpbmdzIHRvIGNvcHkgaGVyZT8/P1xuXG5cdFx0cmV0dXJuIGJlc3RNYXRjaDtcblx0fVxuXG5cdC8vIFJldHVybiB0aGUgXCJiZXN0XCIgbWF0Y2ggZ2l2ZW4gbW9yZSB0aGFuIG9uZSBtYXRjaGVzIGF0IHRoZSBoZWFkIG9mIHRoZSBzdHJlYW0uXG5cdC8vIERlZmF1bHQgaXMgdG8gcmV0dXJuIHRoZSBsb25nZXN0IG1hdGNoLlxuXHQvLyBJbXBsZW1lbnQgc29tZXRoaW5nIGVsc2UgdG8gZG8sIGVnLCBwcmVjZWRlbmNlIHJ1bGVzLlxuXHRnZXRCZXN0TWF0Y2gobWF0Y2hlcykge1xuXHRcdHJldHVybiBtYXRjaGVzLnJlZHVjZShmdW5jdGlvbiAoYmVzdCwgbmV4dCkge1xuXHRcdFx0aWYgKG5leHQuZW5kSW5kZXggPiBiZXN0LmVuZEluZGV4KSByZXR1cm4gbmV4dDtcblx0XHRcdHJldHVybiBiZXN0O1xuXHRcdH0sIG1hdGNoZXNbMF0pO1xuXHR9XG5cblx0YWRkUnVsZShydWxlKSB7XG5cdFx0dGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoY29udGV4dCk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCgke3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZXMuam9pbihcInxcIil9KSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBSZXBlYXRpbmcgcnVsZS5cbi8vXHRgdGhpcy5ydWxlYCBpcyB0aGUgcnVsZSB0aGF0IHJlcGVhdHMuXG4vL1xuLy8gQWZ0ZXIgbWF0Y2hpbmc6XG4vL1x0YHRoaXMubWF0Y2hlZGAgaXMgYXJyYXkgb2YgcmVzdWx0cyBvZiBtYXRjaGVzLlxuLy9cbi8vXHRBdXRvbWF0aWNhbGx5IGNvbnN1bWVzIHdoaXRlc3BhY2UgYmVmb3JlIHJ1bGVzLlxuLy9cdElmIGRvZXNuJ3QgbWF0Y2ggYXQgbGVhc3Qgb25lLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuUnVsZS5SZXBlYXQgPSBjbGFzcyBSZXBlYXQgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCBzdHJlYW1dKTtcblx0XHR9XG5cblx0XHRsZXQgbmV4dCA9IHN0cmVhbTtcblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgbWF0Y2ggPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIW1hdGNoKSBicmVhaztcblxuXHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdG5leHQgPSBtYXRjaC5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gYXJyYXkgd2l0aCBhcmd1bWVudHMgb2YgYWxsIHJlc3VsdHMuXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gucmVzdWx0cyApO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0dGhyb3cgXCJEb24ndCB1bmRlcnN0YW5kIGhvdyB0byBzb3VyY2UgUnVsZS5SZXBlYXQhXCI7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRjb25zdCBydWxlID0gKHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UgfHwgdGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHRoaXMucnVsZS5zdHJpbmcuaW5jbHVkZXMoXCIgXCIpXG5cdFx0XHRcdCAgID8gYCgke3RoaXMucnVsZX0pYFxuXHRcdFx0XHQgICA6IGAke3RoaXMucnVsZX1gXG5cdFx0XHRcdCk7XG5cdFx0cmV0dXJuIGAke3J1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe251bWJlcn0sXWAgdG8gbWF0Y2ggYDEsMiwzYFxuLy9cdGBydWxlLml0ZW1gIGlzIHRoZSBydWxlIGZvciBlYWNoIGl0ZW0sXG4vL1x0YHJ1bGUuZGVsaW1pdGVyYCBpcyB0aGUgZGVsaW1pdGVyIGJldHdlZW4gZWFjaCBpdGVtLlxuLy8gXHRgcnVsZS5tYXRjaGVkYCBpbiB0aGUgb3V0cHV0IGlzIHRoZSBsaXN0IG9mIHZhbHVlcy5cbi8vXG4vL1xuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYSBMaXN0IHJ1bGUgd2lsbCBOT1QgcmVwZWF0ICg/Pz8/KVxuUnVsZS5MaXN0ID0gY2xhc3MgTGlzdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2sgPSBbXSkge1xuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdGlmIChSdWxlLnN0YWNrQ29udGFpbnMoc3RhY2ssIHRoaXMsIHN0cmVhbSkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRzdGFjayA9IHN0YWNrLmNvbmNhdCgpO1xuXHRcdFx0c3RhY2sucHVzaChbdGhpcywgc3RyZWFtXSk7XG5cdFx0fVxuXG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFpdGVtKSBicmVhaztcbi8vY29uc29sZS5sb2coaXRlbSk7XG5cdFx0XHRtYXRjaGVkLnB1c2goaXRlbSk7XG5cdFx0XHRuZXh0ID0gaXRlbS5uZXh0KCk7XG5cblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBkZWxpbWl0ZXIsIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgZGVsaW1pdGVyID0gdGhpcy5kZWxpbWl0ZXIucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0ID0gZGVsaW1pdGVyLm5leHQoKTtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSBkaWRuJ3QgZ2V0IGFueSBtYXRjaGVzLCBmb3JnZXQgaXQuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IG1hdGNoZWRbMF0gPyBtYXRjaGVkWzBdLnN0YXJ0SW5kZXggOiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybiBtYXRjaGVkIGl0ZW0gYnkgaW5kZXhcblx0Z2V0SXRlbShpbmRleCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWRbaW5kZXhdO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1x0XHQvLyBUT0RPOiB0aHJvdz8/P1xuXHRcdGxldCBtYXRjaGVkID0gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gudG9Tb3VyY2UoY29udGV4dCkgKS5qb2luKFwiLCBcIik7XG5cdFx0cmV0dXJuIGBbJHttYXRjaGVkfV1gO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiLy8gU3BlbGwgXCJFbmdsaXNoXCIgcGFyc2VyIHN0cmF3bWFuXG5cbi8vIFRPRE86XHRgdGVzdGAgZnVuY3Rpb24gZm9yIHF1aWNrIG5vLWdvb2QgaGl0IG9uIGB7YX0gYmxhaCBibGFoIHtifWA/XG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcms6ICAgYHtleHByZXNzaW9ufSBpcyB7ZXhwcmVzc2lvbn1gXG4vLyBUT0RPOlx0YnJlYWsgYGZpbGVgIGludG8gbGluZXMgYW5kIHByb2Nlc3MgZWFjaCAoaW5jbC4gc3Vic3RyL21hdGNoIG5vdCBnb2luZyBiZXlvbmQgdGhlIGVuZClcbi8vIFRPRE86XHRuZXN0aW5nIC0tIGlzIHRoaXMganVzdCBpbmRlbnQgPSBcImFkZCBibG9jayBzY29wZVwiXG4vLyBUT0RPOlx0cHJvbW90aW9uIHBhdHRlcm4gZm9yIGdhdGhlciBhcmd1bWVudHMgKGVnOiBsaXRlcmFsLWxpc3QpID8/P1xuLy8gVE9ETzpcdFdoYXQgZG9lcyBzeW50YXggdHJlZSBsb29rIGxpa2U/ICBIb3cgZG8gd2UgZXh0cmFjdCBtZWFuaW5nIG91dCBvZiB0aGUgbmVzdD9cbi8vIFRPRE86XHRQYXNzIGBjb250ZXh0YCB0byB0b1NvdXJjZSgpLCBhZGQgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYGNsYXNzYCwgdmFyaWFibGVzIGFuZCBjb2RlIHRvIGBtZXRob2RgLCBgZ2xvYmFsYCBzdHVmZiBldGNcblxuaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ2xvbmUgcnVsZXMsIHN0YXJ0aW5nIHdpdGggYSBjb21wbGV0ZWx5IGVtcHR5IG1hcCBpZiBub3QgZGVmaW5lZCAobm8gc3RhbmRhcmQgb2JqZWN0IGtleXMpXG5cdFx0dGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5ydWxlcyB8fCBudWxsKTtcblx0fVxuXG5cdGdldFJ1bGUobmFtZSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzW25hbWVdO1xuXHR9XG5cblx0Z2V0UnVsZU9yRGllKG5hbWUsIHByb3BlcnR5TmFtZSkge1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGAke3Byb3BlcnR5TmFtZX0gcnVsZSAnJHtuYW1lfScgbm90IGZvdW5kYCk7XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblxuLy9cbi8vIyMjIFBhcnNpbmdcbi8vXG5cdC8vIFBhcnNlIHNvbWV0aGluZzpcblx0Ly9cdC0gaWYgb25lIHN0cmluZyBhcmd1bWVudCwgZG9lcyBhIGBwYXJzZVN0YXRlbWVudCgpYFxuXHQvL1x0LSBpZiB0d28sIGRvZXMgYSBgcGFyc2VSdWxlKClgXG5cdC8vIFJldHVybnMgYHBhcnNlLnRvU3RyaW5nKClgIG9yIHRocm93cy5cbi8vVEVTVE1FXG5cdGNvbXBpbGUoKSB7XG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdGxldCBzdHJpbmcgPSBhcmd1bWVudHNbMF07XG5cdFx0XHRyZXR1cm4gdGhpcy5jb21waWxlU3RhdGVtZW50cyhzdHJpbmcpO1xuXHRcdH1cblx0XHRlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG5cdFx0XHRsZXQgbmFtZSA9IGFyZ3VtZW50c1swXSwgc3RyaW5nID0gYXJndW1lbnRzWzFdO1xuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMucGFyc2UobmFtZSwgc3RyaW5nKTtcblx0XHRcdGlmICghcmVzdWx0KSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYHBhcnNlci5wYXJzZSgnJHtuYW1lfScsICcke3N0cmluZ30nKTogY2FuJ3QgcGFyc2UgdGhpc2ApO1xuXHRcdFx0cmV0dXJuIHJlc3VsdC50b1NvdXJjZSh0aGlzKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJwYXJzZXIucGFyc2UoKTogZXhwZWN0cyBvbmUgb3IgdHdvIGFyZ3VtZW50c1wiKTtcblx0XHR9XG5cdH1cblxuXHQvLyBQYXJzZSBgbmFtZWBkIHJ1bGUgYXQgaGVhZCBvZiBgc3RyZWFtYCAoYHN0cmluZ2Agb3IgYFRleHRTdHJlYW1gKS5cblx0Ly8gSGFuZGxlcyBvcHRpb25hbCBhbmQgcmVwZWF0aW5nIHJ1bGVzIGFzIHdlbGwgYXMgZWF0aW5nIHdoaXRlc3BhY2UuXG5cdC8vIFJldHVybnMgcmVzdWx0IG9mIHBhcnNlLlxuLy9URVNUTUVcblx0cGFyc2UobmFtZSwgc3RyZWFtKSB7XG5cdFx0aWYgKHR5cGVvZiBzdHJlYW0gPT09IFwic3RyaW5nXCIpIHN0cmVhbSA9IG5ldyBUZXh0U3RyZWFtKHN0cmVhbSk7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUobmFtZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYHBhcnNlci5wYXJzZSgke25hbWV9KTogUnVsZSBub3QgZm91bmRgKTtcblx0XHRzdHJlYW0gPSB0aGlzLmVhdFdoaXRlc3BhY2Uoc3RyZWFtKTtcblx0XHRyZXR1cm4gcnVsZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHR9XG5cblx0Ly8gUGFyc2UgYSBzZXQgb2Ygc3RhdGVtZW50cyBsaW5lLWJ5LWxpbmUuXG4vL1RFU1RNRVxuXHRjb21waWxlU3RhdGVtZW50cyhzdGF0ZW1lbnRzKSB7XG5cdFx0Y29uc29sZS50aW1lKFwicGFyc2VTdGF0ZW1lbnRzXCIpO1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0bGV0IGN1cnJlbnRJbmRlbnQgPSAwO1xuXHRcdGNvbnN0IHRhYnMgPSBcIlxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFwiO1xuXHRcdHN0YXRlbWVudHMuc3BsaXQoL1xcbi9nKS5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG5cdFx0XHQvLyBza2lwIGxpbmVzIHRoYXQgYXJlIGFsbCB3aGl0ZXNwYWNlXG5cdFx0XHRpZiAoc3RhdGVtZW50LnRyaW0oKSA9PT0gXCJcIikge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCJcIik7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpbmRlbnQgbGV2ZWwgb2YgdGhpcyBsaW5lXG5cdFx0XHRsZXQgbGluZVN0YXJ0ID0gc3RhdGVtZW50Lm1hdGNoKC9eXFx0Ki8pWzBdO1xuXHRcdFx0bGV0IGxpbmVJbmRlbnQgPSBsaW5lU3RhcnQubGVuZ3RoO1xuXHRcdFx0aWYgKGxpbmVJbmRlbnQgPiBjdXJyZW50SW5kZW50KSB7XG5cdFx0XHRcdC8vIGFkZCB0byBlbmQgb2YgcHJldmlvdXMgbGluZSBpZiBwb3NzaWJsZVxuXHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGgpIHtcblx0XHRcdFx0XHQvLyBidXQgb25seSBpZiBvdXRwdXQgaXMgbm90IGFscmVhZHkgaW5kZW50ZWQgdG8gdGhhdCBsZXZlbFxuXHRcdFx0XHRcdGxldCBpbmRlbnRlZFN0YXJ0ID0gbGluZVN0YXJ0ICsgXCJcXHRcIjtcblx0XHRcdFx0XHRpZiAoIXJlc3VsdHNbcmVzdWx0cy5sZW5ndGggLSAxXS5zdGFydHNXaXRoKGluZGVudGVkU3RhcnQpKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHRzW3Jlc3VsdHMubGVuZ3RoIC0gMV0gKz0gXCIge1wiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcbi8vY29uc29sZS5pbmZvKFwiYWxyZWFkeSBpbmRlbnRlZFwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSByZXN1bHRzLnB1c2godGFicy5zdWJzdHIoMCwgbGluZUluZGVudC0xKSArIFwie1wiKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGxpbmVJbmRlbnQgPCBjdXJyZW50SW5kZW50KSB7XG5cdFx0XHRcdGxldCBjbG9zZXJzID0gW107XG5cdFx0XHRcdGZvciAobGV0IGkgPSBjdXJyZW50SW5kZW50OyBpID4gbGluZUluZGVudDsgaS0tKSB7XG5cdFx0XHRcdFx0Y2xvc2Vycy5wdXNoKHRhYnMuc3Vic3RyKDAsIGktMSkgKyBcIn1cIik7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gcHV0IHBhcmVucyBCRUZPUkUgYW55IGJsYW5rIGxpbmVzIVxuXHRcdFx0XHRsZXQgbGFzdEJsYW5rTGluZSA9IHRoaXMuX2dldExhc3RCbGFua0xpbmUocmVzdWx0cyk7XG5cdFx0XHRcdHJlc3VsdHMuc3BsaWNlKGxhc3RCbGFua0xpbmUsIDAsIC4uLmNsb3NlcnMpO1xuXHRcdFx0fVxuXHRcdFx0Y3VycmVudEluZGVudCA9IGxpbmVJbmRlbnQ7XG5cblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnBhcnNlKFwic3RhdGVtZW50XCIsIHN0YXRlbWVudCk7XG4vL1RPRE86IGNvbXBsYWluIGlmIGNhbid0IHBhcnNlIHRoZSBlbnRpcmUgbGluZSFcblx0XHRcdGlmIChyZXN1bHQpIHtcblx0XHRcdFx0Ly8gc3BsaXQgYnkgbGluZXMgYW5kIGFkZCBpbmRlbnRcblx0XHRcdFx0bGV0IHNvdXJjZSA9IHJlc3VsdC50b1NvdXJjZSh0aGlzKS5zcGxpdChcIlxcblwiKVxuXHRcdFx0XHRcdFx0XHRcdC5tYXAoIGxpbmUgPT4gbGluZVN0YXJ0ICsgbGluZSApO1xuXHRcdFx0XHRyZXN1bHRzID0gcmVzdWx0cy5jb25jYXQoc291cmNlKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJDb3VsZG4ndCBwYXJzZSBzdGF0ZW1lbnQ6XCIsIHN0YXRlbWVudCk7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChcIi8vIEVSUk9SOiBcIitzdGF0ZW1lbnQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0d2hpbGUgKGN1cnJlbnRJbmRlbnQgPiAwKSB7XG5cdFx0XHRyZXN1bHRzLnB1c2godGFicy5zdWJzdHIoMCwgY3VycmVudEluZGVudC0xKSArIFwifVwiKTtcblx0XHRcdGN1cnJlbnRJbmRlbnQtLTtcblx0XHR9XG5cblx0XHRjb25zb2xlLnRpbWVFbmQoXCJwYXJzZVN0YXRlbWVudHNcIik7XG5cdFx0cmV0dXJuIHJlc3VsdHMuam9pbihcIlxcblwiKTtcblx0fVxuXG5cdC8vIEZpZ3VyZSBvdXQgdGhlIGxhc3QgYmxhbmsgbGluZSBpbiB0aGUgcmVzdWx0c1xuXHRfZ2V0TGFzdEJsYW5rTGluZShyZXN1bHRzKSB7XG5cdFx0Zm9yIChsZXQgaSA9IHJlc3VsdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGlmIChyZXN1bHRzW2ldID09PSBcIlwiKSBjb250aW51ZTtcblx0XHRcdHJldHVybiBpICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIDA7XG5cdH1cblxuXHQvLyBFYXQgd2hpdGVzcGFjZSAoYWNjb3JkaW5nIHRvIGBydWxlcy53aGl0ZXNwYWNlYCkgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG5ldyBzdHJlYW0gaWYgd2UgbWF0Y2hlZCB3aGl0ZXNwYWNlLCBvdGhlcndpc2UgdGhlIHNhbWUgc3RyZWFtLlxuXHRlYXRXaGl0ZXNwYWNlKHN0cmVhbSkge1xuXHRcdGxldCByZXN1bHQgPSB0aGlzLnJ1bGVzLndoaXRlc3BhY2UucGFyc2UodGhpcywgc3RyZWFtKTtcblx0XHRpZiAoIXJlc3VsdCkgcmV0dXJuIHN0cmVhbTtcblx0XHRyZXR1cm4gc3RyZWFtLmFkdmFuY2VCeShyZXN1bHQubWF0Y2hlZC5sZW5ndGgpO1xuXHR9XG5cbi8vXG4vL1x0UnVsZXNcbi8vXG5cblx0Ly8gQWRkIGEgcnVsZSB0byBvdXIgbGlzdCBvZiBydWxlcyFcblx0Ly8gQ29udmVydHMgdG8gYGFsdGVybmF0aXZlc2Agb24gcmUtZGVmaW5pbmcgdGhlIHNhbWUgcnVsZS5cblx0YWRkUnVsZShuYW1lLCBydWxlKSB7XG5cdFx0Ly8gZG9uJ3Qgb3ZlcnJpZGUgcnVsZU5hbWVcblx0XHRpZiAoIXJ1bGUucnVsZU5hbWUpIHJ1bGUucnVsZU5hbWUgPSBuYW1lO1xuXG5cdFx0bGV0IGV4aXN0aW5nID0gdGhpcy5ydWxlc1tuYW1lXTtcblx0XHRpZiAoZXhpc3RpbmcpIHtcblx0XHRcdGlmICghKGV4aXN0aW5nIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpKSB7XG5cdFx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBDb252ZXJ0aW5nIHJ1bGUgJyR7bmFtZX0nIHRvIGFsdGVybmF0aXZlc2ApO1xuXHRcdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZU5hbWU6IG5hbWUsIHJ1bGVzOiBbZXhpc3RpbmddIH0pO1xuXHRcdFx0XHQvLyBjb3B5IGFyZ3VtZW50IG5hbWUgb3ZlciAoPz8/KVxuXHRcdFx0XHRpZiAoZXhpc3RpbmcuYXJndW1lbnQpIHRoaXMucnVsZXNbbmFtZV0uYXJndW1lbnQgPSBleGlzdGluZy5hcmd1bWVudDtcblx0XHRcdH1cblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRpbmcgcnVsZSAnJHtydWxlLnJ1bGVOYW1lfScgdG8gJyR7bmFtZX0nOiBgLCBydWxlKTtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0uYWRkUnVsZShydWxlKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gcnVsZTtcblx0XHR9XG5cblxuXHRcdC8vIG1ha2UgYSBub3RlIGlmIHdlJ3JlIGFkZGluZyBhIGxlZnQtcmVjdXJzaXZlIHJ1bGVcblx0XHRpZiAodGhpcy5ydWxlSXNMZWZ0UmVjdXJzaXZlKG5hbWUsIHJ1bGUpKSB7XG4vL2NvbnNvbGUuaW5mbyhcIm1hcmtpbmcgXCIsIHJ1bGUsIFwiIGFzIGxlZnQgcmVjdXJzaXZlIVwiKTtcblx0XHRcdHJ1bGUubGVmdFJlY3Vyc2l2ZSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblxuXHQvLyBJcyB0aGUgc3BlY2lmaWVkIHJ1bGUgbGVmdC1yZWN1cnNpdmU/XG5cdHJ1bGVJc0xlZnRSZWN1cnNpdmUobmFtZSwgcnVsZSkge1xuXHRcdGlmICghKHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlKSkgcmV0dXJuIGZhbHNlO1xuLy9jb25zb2xlLmxvZyhuYW1lLCBydWxlKTtcblx0XHRmb3IgKGxldCBzdWJydWxlIG9mIHJ1bGUucnVsZXMpIHtcblx0XHRcdC8vIGlnbm9yZSBvcHRpb25hbCBydWxlc1xuXHRcdFx0aWYgKHN1YnJ1bGUub3B0aW9uYWwpIGNvbnRpbnVlO1xuXHRcdFx0aWYgKHN1YnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN1YnJ1bGUgJiYgc3VicnVsZS5ydWxlID09PSBuYW1lKSByZXR1cm4gdHJ1ZTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblxuLy9cbi8vICMjIFV0aWxpdHkgbWV0aG9kc1xuLy9cblxuXHQvLyBGaW5kIHRoZSBtYXRjaGluZyBpbnN0YW5jZSBvZiBwb3NzaWJseSBuZXN0ZWQgYGVuZFRva2VuYCB0byBiYWxhbmNlIGBzdGFydFRva2VuYFxuXHQvL1x0aW4gYXJyYXkgb2YgYHRva2Vuc2AgKHN0cmluZ3MpLlxuXHQvLyBJZiBzdWNjZXNzZnVsLCByZXR1cm5zIGB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZSB9YFxuXHQvLyBUaHJvd3MgaWYgdW5zdWNlc3NmdWwuXG5cdHN0YXRpYyBmaW5kTmVzdGVkVG9rZW5zKHRva2Vucywgc3RhcnRUb2tlbiwgZW5kVG9rZW4sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0aWYgKHRva2Vuc1tzdGFydEluZGV4XSAhPT0gc3RhcnRUb2tlbikgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBFeHBlY3RlZCAnJHtzdGFydFRva2VufScgYXQgaW5kZXggJHtzdGFydEluZGV4fSBvZiB0b2tlbnNgKTtcblx0XHRsZXQgbmVzdGluZyA9IDA7XG5cdFx0bGV0IG5lc3RlZCA9IGZhbHNlO1xuXHRcdGZvciAobGV0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIDEsIGxhc3RJbmRleCA9IHRva2Vucy5sZW5ndGg7IGVuZEluZGV4IDwgbGFzdEluZGV4OyBlbmRJbmRleCsrKSB7XG5cdFx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbZW5kSW5kZXhdO1xuXHRcdFx0aWYgKHRva2VuID09PSBzdGFydFRva2VuKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdFx0bmVzdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b2tlbiA9PT0gZW5kVG9rZW4pIHtcblx0XHRcdFx0aWYgKG5lc3RpbmcgPT09IDApXG5cdFx0XHRcdFx0cmV0dXJuIHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlOiB0b2tlbnMuc2xpY2Uoc3RhcnRJbmRleCsxLCBlbmRJbmRleCksIG5lc3RlZCB9O1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgQ291bGRuJ3QgZmluZCBtYXRjaGluZyAnJHtlbmRUb2tlbn0ncyBzdGFydGluZyBhdCBpdGVtICR7c3RhcnRJbmRleH1gKTtcblx0fVxuXG5cblx0Ly8gTGlzdCBvZiBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gcmVndWxhciBleHByZXNzaW9ucy5cblx0Ly8gVXNlZCB0byBlc2NhcGUgdGhvc2UgY2hhcnMgd2hlbiBjcmVhdGluZyByZWd1bGFyIGV4cHJlc3Npb25zIGZyb20gc3RyaW5ncy5cblx0c3RhdGljIFJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlMgPSAoZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgY2hhcnMgPSB7fTtcblx0XHRcIlxcXFwvXiQqKz8uKCl8e30sW11cIi5zcGxpdChcIlwiKS5mb3JFYWNoKGNoYXIgPT4gY2hhcnNbY2hhcl0gPSB0cnVlKTtcblx0XHRyZXR1cm4gY2hhcnM7XG5cdH0pKClcblxuXHQvLyBHaXZlbiBhIFwibm9ybWFsXCIgYHN0cmluZ2AsIGVzY2FwZSBhbnkgcmVndWxhciBleHByZXNzaW9uIHNwZWNpYWwgY2hhcmFjdGVyc1xuXHQvL1x0c28gd2UgY2FuIGNyZWF0ZSBhIGBuZXcgUmVnRXhwKClgLlxuXHQvLyBBbHNvIGNvbnZlcnRzIGEgc2luZ2xlIHNwYWNlIHRvIGFyYml0cmFyeSBzZXQgb2Ygc3BhY2VzIHdpdGggXCJcXHMrXCJcblx0c3RhdGljIGVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSB7XG5cdFx0cmV0dXJuIHN0cmluZy5zcGxpdChcIlwiKS5tYXAoZnVuY3Rpb24gKGNoYXIsIGluZGV4LCBsaXN0KSB7XG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIGJhY2tzbGFzaFxuXHRcdFx0aWYgKGNoYXIgPT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCI7XG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIHNwYWNlXG5cdFx0XHRpZiAoY2hhciA9PT0gXCIgXCIpIHJldHVybiBcIlxcXFxzK1wiO1xuXHRcdFx0Ly8gSWYgYSBzcGVjaWFsIGNoYXIgYW5kIHByZXZpb3VzIGNoYXJhY3RlciB3YXMgbm90IGFuIGVzY2FwZSwgZXNjYXBlIHRoZSByZXN1bHQuXG5cdFx0XHRpZiAoUGFyc2VyLlJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlNbY2hhcl0gJiYgbGlzdFtpbmRleC0xXSAhPT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIitjaGFyO1xuXHRcdFx0Ly8gVGhpcyBjaGFyIHNob3VsZCBiZSBmaW5lIGJ5IGl0c2VsZi5cblx0XHRcdHJldHVybiBjaGFyO1xuXHRcdH0pLmpvaW4oXCJcIik7XG5cdH1cblxuXHQvLyBDcmVhdGUgYSBuZXcgcmVndWxhciBleHByZXNzaW9uIGZyb20gYSBcIm5vcm1hbFwiIHN0cmluZywgZXNjYXBpbmcgc3BlY2lhbCBjaGFyYWN0ZXJzIGFzIG5lY2Vzc2FyeS5cblx0c3RhdGljIFJlZ0V4cEZyb21TdHJpbmcoc3RyaW5nLCBmbGFncykge1xuXHRcdHJldHVybiBuZXcgUmVnRXhwKFBhcnNlci5lc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZyksIGZsYWdzKTtcblx0fVxuXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9QYXJzZXIuanMiLCIvL1xuLy9cdCMgQ29yZSBgcnVsZXNgIC0tIHNpbXBsZSBkYXRhdHlwZXMsIGV0Yy5cbi8vXG4vLyBOT1RFOiBtYW55IG9mIHRoZSBiZWxvdyBhcmUgY3JlYXRlZCBhcyBjdXN0b20gUGF0dGVybiBzdWJjbGFzc2VzIGZvciBkZWJ1Z2dpbmcuXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBgd2hpdGVzcGFjZWAgcnVsZS5cbi8vIE5PVEUgYHBhcnNlci5wYXJzZVJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIFwiICAgXCIpYCB3aWxsIHJldHVybiBgdW5kZWZpbmVkYFxuLy9cdFx0IGJlY2F1c2UgYHBhcnNlci5wYXJzZVJ1bGUoKWAgYXV0b21hdGljYWxseSBlYXRzIHdoaXRlc3BhY2UgYXQgdGhlIHN0YXJ0IG9mIGEgcnVsZS5cblJ1bGUuV2hpdGVzcGFjZSA9IGNsYXNzIHdoaXRlc3BhY2UgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge31cbnBhcnNlci5hZGRSdWxlKFwid2hpdGVzcGFjZVwiLCBuZXcgUnVsZS5XaGl0ZXNwYWNlKHsgcGF0dGVybjogL1xccysvLCBvcHRpb25hbDogdHJ1ZSB9KSk7XG5cblxuLy8gYHdvcmRgID0gaXMgYSBzaW5nbGUgYWxwaGFudW1lcmljIHdvcmQuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcblJ1bGUuV29yZCA9IGNsYXNzIHdvcmQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgd29yZCA9IHBhcnNlci5hZGRSdWxlKFwid29yZFwiLCBuZXcgUnVsZS5Xb3JkKHtcblx0cGF0dGVybjogL1thLXpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xuXG5cbi8vIGBpZGVudGlmaWVyYCA9IHZhcmlhYmxlcyBvciBwcm9wZXJ0eSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGEgbG93ZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLklkZW50aWZpZXIgPSBjbGFzcyBpZGVudGlmaWVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IGlkZW50aWZpZXIgPSBwYXJzZXIuYWRkUnVsZShcImlkZW50aWZpZXJcIiwgbmV3IFJ1bGUuSWRlbnRpZmllcih7XG5cdHBhdHRlcm46IC9bYS16XVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBpZGVudGlmaWVyKTtcblxuLy8gQWRkIEVuZ2xpc2ggcHJlcG9zaXRpb25zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy9cbi8vIFdpa2lwZWRpYSBcIlByZXBvc2l0aW9uXCI6XG4vL1x0XCJQcmVwb3NpdGlvbnMuLi5hcmUgYSBjbGFzcyBvZiB3b3JkcyB0aGF0XG4vL1x0ZXhwcmVzcyBzcGF0aWFsIG9yIHRlbXBvcmFsIHJlbGF0aW9ucyAgKGluLCB1bmRlciwgdG93YXJkcywgYmVmb3JlKVxuLy9cdG9yIG1hcmsgdmFyaW91cyBzZW1hbnRpYyByb2xlcyAob2YsIGZvcikuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFib3V0XCIsIFwiYWJvdmVcIiwgXCJhZnRlclwiLCBcImFuZFwiLCBcImFzXCIsIFwiYXRcIixcblx0XCJiZWZvcmVcIiwgXCJiZWhpbmRcIiwgXCJiZWxvd1wiLCBcImJlbmVhdGhcIiwgXCJiZXNpZGVcIiwgXCJiZXR3ZWVuXCIsIFwiYmV5b25kXCIsIFwiYnlcIixcblx0XCJkZWZpbmVkXCIsIFwiZG93blwiLCBcImR1cmluZ1wiLFxuXHRcImVhY2hcIiwgXCJlbXB0eVwiLCBcImV4YWN0bHlcIiwgXCJleGNlcHRcIixcblx0XCJmb3JcIiwgXCJmcm9tXCIsXG5cdFwiZ3JlYXRlclwiLFxuXHRcIklcIiwgXCJpblwiLCBcImludG9cIixcblx0XCJsZXNzXCIsIFwibG9uZ1wiLFxuXHRcIm1lXCIsIFwibWludXNcIiwgXCJtb3JlXCIsXG5cdFwibmVhclwiLCBcIm5vdFwiLFxuXHRcIm9mXCIsIFwib2ZmXCIsIFwib25cIiwgXCJvbnRvXCIsIFwib3Bwb3NpdGVcIiwgXCJvdXRcIiwgXCJvdXRzaWRlXCIsIFwib3ZlclwiLFxuXHRcInNob3J0XCIsIFwic2luY2VcIixcblx0XCJ0aGFuXCIsIFwidGhlXCIsIFwidGhlblwiLCBcInRocm91Z2hcIiwgXCJ0aHJ1XCIsIFwidG9cIiwgXCJ0b3dhcmRcIiwgXCJ0b3dhcmRzXCIsXG5cdFwidW5kZWZpbmVkXCIsIFwidW5kZXJcIiwgXCJ1bmRlcm5lYXRoXCIsIFwidW5pcXVlXCIsIFwidW50aWxcIiwgXCJ1cFwiLCBcInVwb25cIiwgXCJ1cHNpZGVcIixcblx0XCJ2ZXJzdXNcIiwgXCJ2c1wiLFxuXHRcIndpdGhcIiwgXCJ3aXRoaW5cIiwgXCJ3aXRob3V0XCIsXG4pO1xuXG4vLyBBZGQgY29tbW9uIGVuZ2xpc2ggdmVyYnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhcmVcIixcblx0XCJkb1wiLCBcImRvZXNcIixcblx0XCJjb250YWluc1wiLFxuXHRcImhhc1wiLCBcImhhdmVcIixcblx0XCJpc1wiLFxuXHRcInJlcGVhdFwiLFxuXHRcIndhc1wiLCBcIndlcmVcIlxuKTtcblxuLy8gQWRkIHNwZWNpYWwgY29udHJvbCBrZXl3b3JkcyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImVsc2VcIixcblx0XCJpZlwiLFxuXHRcIm90aGVyd2lzZVwiLFxuXHRcIndoaWxlXCJcbik7XG5cbi8vIGBUeXBlYCA9IHR5cGUgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhbiB1cHBlci1jYXNlIGxldHRlciAoPylcblJ1bGUuVHlwZSA9IGNsYXNzIHR5cGUgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcInR5cGVcIiwgbmV3IFJ1bGUuVHlwZSh7XG5cdHBhdHRlcm46IC8oW0EtWl1bXFx3XFwtXSp8dGV4dHxudW1iZXJ8aW50ZWdlcnxkZWNpbWFsfGNoYXJhY3Rlcnxib29sZWFufG9iamVjdCkvLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0bGV0IHZhbHVlID0gdGhpcy5tYXRjaGVkO1xuXHRcdHN3aXRjaCh2YWx1ZSkge1xuXHRcdFx0Ly8gc3BlY2lhbCBjYXNlIHRvIHRha2UgdGhlIGZvbGxvd2luZyBhcyBsb3dlcmNhc2Vcblx0XHRcdGNhc2UgXCJ0ZXh0XCI6XHRcdHJldHVybiBcIlN0cmluZ1wiO1xuXHRcdFx0Y2FzZSBcImNoYXJhY3RlclwiOlx0cmV0dXJuIFwiQ2hhcmFjdGVyXCI7XG5cdFx0XHRjYXNlIFwibnVtYmVyXCI6XHRcdHJldHVybiBcIk51bWJlclwiO1xuXHRcdFx0Y2FzZSBcImludGVnZXJcIjpcdFx0cmV0dXJuIFwiSW50ZWdlclwiO1xuXHRcdFx0Y2FzZSBcImRlY2ltYWxcIjpcdFx0cmV0dXJuIFwiRGVjaW1hbFwiO1xuXHRcdFx0Y2FzZSBcImJvb2xlYW5cIjpcdFx0cmV0dXJuIFwiQm9vbGVhblwiO1xuXHRcdFx0Y2FzZSBcIm9iamVjdFwiOlx0XHRyZXR1cm4gXCJPYmplY3RcIjtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiB2YWx1ZS5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHRcdH1cblx0fVxufSkpO1xucGFyc2VyLnJ1bGVzLnR5cGUuYWRkVG9CbGFja2xpc3QoXCJJXCIpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHBhcnNlci5ydWxlcy50eXBlKTtcblxuXG4vLyBgbnVtYmVyYCBhcyBlaXRoZXIgZmxvYXQgb3IgaW50ZWdlciwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuUnVsZS5OdW1iZXIgPSBjbGFzcyBudW1iZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgbnVtYmVyID0gcGFyc2VyLmFkZFJ1bGUoXCJudW1iZXJcIiwgbmV3IFJ1bGUuTnVtYmVyKHtcblx0cGF0dGVybjogLy0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VGbG9hdCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG51bWJlcik7XG5cblxuLy8gTnVtZXJpYyBgaW50ZWdlcmAgb25seSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gTk9URTogdGhpcyBXSUxMIG1hdGNoIGEgZmxvYXQsIGJ1dCB0aGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBjb2VyY2UgdG8gYW4gaW50ZWdlci5cbi8vIFJFVklFVzogaXMgdGhpcyByaWdodD8gIEJldHRlciB0byBub3QgbWF0Y2ggYSBmbG9hdD9cblJ1bGUuSW50ZWdlciA9IGNsYXNzIGludGVnZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImludGVnZXJcIiwgbmV3IFJ1bGUuSW50ZWdlcih7XG5cdHBhdHRlcm46IC8tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gaW50ZWdlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUludCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xuXG5cbi8vIExpdGVyYWwgYHRleHRgIHN0cmluZywgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gWW91IGNhbiB1c2UgZWl0aGVyIHNpbmdsZSBvciBkb3VibGUgcXVvdGVzIG9uIHRoZSBvdXRzaWRlIChhbHRob3VnaCBkb3VibGUgcXVvdGVzIGFyZSBwcmVmZXJyZWQpLlxuLy8gUmV0dXJuZWQgdmFsdWUgaGFzIGVuY2xvc2luZyBxdW90ZXMuXG4vLyBUT0RPOiBlc2NhcGVkIHF1b3RlcyBpbnNpZGUgc3RyaW5nXG5SdWxlLlRleHQgPSBjbGFzcyB0ZXh0IGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IHRleHQgPSBwYXJzZXIuYWRkUnVsZShcInRleHRcIiwgbmV3IFJ1bGUuVGV4dCh7XG5cdHBhdHRlcm46IC8oPzpcIlteXCJdKlwifCdbXiddKicpL1xufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHRleHQpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cblJ1bGUuQm9vbGVhbiA9IGNsYXNzIGJvb2xlYW4gZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgYm9vbCA9IHBhcnNlci5hZGRSdWxlKFwiYm9vbGVhblwiLCBuZXcgUnVsZS5Cb29sZWFuKHtcblx0cGF0dGVybjogLyh0cnVlfGZhbHNlfHllc3xub3xva3xjYW5jZWwpXFxiLyxcblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0Y2FzZSBcInRydWVcIjpcblx0XHRcdGNhc2UgXCJ5ZXNcIjpcblx0XHRcdGNhc2UgXCJva1wiOlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBib29sKTtcbi8vIEFkZCBib29sZWFuIHRva2VucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vIFRFU1RNRVxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwidHJ1ZVwiLCBcImZhbHNlXCIsXG5cdFwieWVzXCIsIFwibm9cIixcblx0XCJva1wiLCBcImNhbmNlbFwiXG4pO1xuXG4vLyBMaXRlcmFsIGxpc3QgKGFycmF5KSwgZWc6ICBgWzEsMix0cnVlLGZhbHNlIF1gXG5sZXQgbGlzdCA9IHBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpdGVyYWxfbGlzdFwiLFxuXHRcIlxcXFxbW2xpc3Q6e2V4cHJlc3Npb259LF0/XFxcXF1cIixcblx0Y2xhc3MgbGl0ZXJhbF9saXN0IGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiBzdXBlci5yZXN1bHRzLmxpc3Q7XG5cdFx0fVxuXG5cdFx0Z2V0SXRlbShpbmRleCkge1xuXHRcdFx0bGV0IGxpc3QgPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZiAobGlzdCkgcmV0dXJuIGxpc3QubWF0Y2hlZFtpbmRleF07XG5cdFx0fVxuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGxpc3QgPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZiAoIWxpc3QpIHJldHVybiBcIltdXCI7XG4gXHRcdFx0cmV0dXJuIGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvblxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvblwiLFxuXHRcIlxcXFwoe2V4cHJlc3Npb259XFxcXClcIixcblx0Y2xhc3MgcGFyZW50aGVzaXplZF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiB0aGlzLm1hdGNoZWRbMV07XG5cdFx0fVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBleHByZXNzaW9uID0gdGhpcy5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gZG9uJ3QgZG91YmxlIHBhcmVucyBpZiBub3QgbmVjZXNzYXJ5XG5cdFx0XHRpZiAodHlwZW9mIGV4cHJlc3Npb24gPT09IFwic3RyaW5nXCIgJiYgZXhwcmVzc2lvbi5zdGFydHNXaXRoKFwiKFwiKSAmJiBleHByZXNzaW9uLmVuZHNXaXRoKFwiKVwiKSkgcmV0dXJuIGV4cHJlc3Npb247XG5cdFx0XHRyZXR1cm4gYCgke2V4cHJlc3Npb259KWA7XG5cdFx0fVxuXHR9XG4pXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY29yZS5qcyIsIlxuLy8gVE9ETzogY29udmVydCB0byBsaW5lLWF3YXJlIHN0cmVhbT8/P1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFN0cmVhbSB7XG5cdC8vIFlvdSBjYW4gY29uc3RydWN0IHdpdGggYSB0ZXh0IHN0cmluZyBvciBhIHNldCBvZiBwcm9wZXJ0aWVzIChpbmNsdWRpbmcgYHRleHRgKS5cblx0Y29uc3RydWN0b3IoLi4udGV4dE9yUHJvcHMpIHtcblx0XHR0ZXh0T3JQcm9wcy5mb3JFYWNoKChhcmcpID0+IHtcblx0XHRcdGlmICh0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdHRoaXMudGV4dCA9IGFyZztcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGFyZykge1xuXHRcdFx0XHRPYmplY3QuYXNzaWduKHRoaXMsIGFyZyk7XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8vIE1ha2Ugc3VyZSBgdGV4dGAgYW5kIGBzdGFydEluZGV4YCBhcmUgZGVmaW5lZC5cblx0XHRpZiAoIShcInRleHRcIiBpbiB0aGlzKSkgdGhpcy50ZXh0ID0gXCJcIjtcblx0XHRpZiAoIShcInN0YXJ0SW5kZXhcIiBpbiB0aGlzKSkgdGhpcy5zdGFydEluZGV4ID0gMDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBpbW11dGFibGUgY2xvbmUgb2YgdGhlIHN0cmVhbS5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRyZXR1cm4gbmV3IFRleHRTdHJlYW0odGhpcywgcHJvcHMpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jZWQgdG8gbmV3IHN0YXJ0SW5kZXguXG5cdGFkdmFuY2VUbyhzdGFydEluZGV4KSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4IH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jaW5nIHN0YXJ0SW5kZXggQlkgYGxlbmd0aGBcblx0YWR2YW5jZUJ5KGxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuXHR9XG5cbi8vIFx0Ly8gUmV0dXJuIGNsb25lIG9mIHRoaXMgc3RyZWFtIHdpdGggZW5kSW5kZXggc2V0IHRvIHN0YXJ0ICsgYGxlbmd0aGBcbi8vIFx0ZW5kQWZ0ZXIobGVuZ3RoKSB7XG4vLyBcdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBlbmRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuLy8gXHR9XG5cbi8vXG4vLyAjIyBNYXRjaGluZ1xuLy9cblx0Ly8gTWF0Y2ggYHBhdHRlcm5gIGFzIHJlZ2V4IGluIHRoaXMgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG1hdGNoIG9yIGB1bmRlZmluZWRgLlxuXHQvLyBJZiB5b3Ugd2FudCB0byB0ZXN0IHRoZSBzdGFydCBvZiB0aGUgc3RyZWFtLFxuXHQvL1x0bWFrZSBzdXJlIHlvdXIgcmVnZXggc3RhcnRzIHdpdGggYF5gLlxuXHQvLyBURVNUTUU6IHRoaXMgbGlrZWx5IGJyZWFrcyB3aXRoIGEgYGdgIG9uIHRoZSBwYXR0ZXJuP1xuXHRtYXRjaChwYXR0ZXJuKSB7XG5cdFx0aWYgKCEocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHRocm93IG5ldyBUeXBlRXJyb3IoYFRleHRTdHJlYW0ubWF0Y2goJHtwYXR0ZXJufSk6IGV4cGVjdGVkIFJlZ0V4cGApO1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5tYXRjaChwYXR0ZXJuKSB8fCB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBEb2VzIHRoaXMgc3RyZWFtIElOQ0xVREUgYSByZWdleCB3aXRoaW4gaXQ/XG5cdC8vIFJldHVybnMgYHRydWVgIG9yIGBmYWxzZWAuXG5cdC8vIE5PVEU6IFBhdHRlcm4gbXVzdCBOT1Qgc3RhcnQgd2l0aCBgXmAgZm9yIHRoaXMgdG8gbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLlxuXHR0ZXN0KHBhdHRlcm4pIHtcblx0XHRyZXR1cm4gcGF0dGVybi50ZXN0KHRoaXMuaGVhZCk7XG5cdH1cblxuLy9cbi8vICMjIFJlZmxlY3Rpb25cbi8vXG5cdC8vIFJldHVybiB0ZXh0IG9mIHN0cmluZyBzdGFydGluZyBhdCBvdXIgYHN0YXJ0SW5kZXhgXG5cdGdldCBoZWFkKCkge1xuXHRcdHJldHVybiB0aGlzLnJhbmdlKCk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSByYW5nZSBvZiB0aGUgc3RyaW5nIGZyb20gYHN0YXJ0SW5kZXhgIHRvIGBlbmRJbmRleGAgTk9OLWluY2x1c2l2ZS5cblx0cmFuZ2Uoc3RhcnRJbmRleCA9IHRoaXMuc3RhcnRJbmRleCwgZW5kSW5kZXggPSB0aGlzLmVuZEluZGV4IHx8IHRoaXMudGV4dC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0LnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmRJbmRleCk7XG5cdH1cblxuXHQvLyBMZW5ndGggb2YgdGhlIHN0cmVhbS5cblx0Z2V0IGxlbmd0aCgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0Lmxlbmd0aDtcblx0fVxuXG5cdC8vIEFyZSB3ZSBhdCB0aGUgZW5kIG9mIHRoZSBzdHJlYW0/XG5cdGdldCBpc0VtcHR5KCkge1xuXHRcdHJldHVybiB0aGlzLnN0YXJ0SW5kZXggPT09IHRoaXMubGVuZ3RoO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dFxuXHR9O1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1RleHRTdHJlYW0uanMiLCJpbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gbG9hZCBzdGFuZGFyZCBydWxlcyBmaWxlcyBoZXJlXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbnVtYmVyc1wiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vaWZcIjtcbmltcG9ydCBcIi4vc3RhdGVtZW50c1wiO1xuaW1wb3J0IFwiLi90eXBlc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiLy8gTWVtb2l6ZS9mb3JnZXQgc2VtYW50aWNzLlxuXG4vLyBSZXR1cm4gYSBtZW1vaXppbmcgZ2V0dGVyIGZ1bmN0aW9uLlxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXNbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGdldHRlci5hcHBseSh0aGlzKTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIERlZmluZSBzbyB0aGF0IHdlIGNhbiBiZSBkZWxldGVkIGFuZCByZS1kZWZpbmVkLCBidXQgbm90IHNldCBvciBlbnVtZXJhdGVkLlxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcGVydHksIHsgdmFsdWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXNbcHJvcGVydHldO1xuXHR9XG59XG5cblxuLy8gUmV0dXJuIGEgbWVtb2l6ZSBmdW5jdGlvbiBmb3IgdXNlIGFzIGEgZ2V0dGVyIGluIGEgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYFxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4ge1xuXHRcdGdldCA6IG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpXG5cdH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9tZW1vaXplLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiaWZcIixcblx0XCJpZiB7ZXhwcmVzc2lvbn0gKHRoZW58Oik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBpZl8gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblxuXHRcdFx0aWYgKHN0YXRlbWVudCkgcmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGlmICgke2V4cHJlc3Npb259KWBcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiYmFja3dhcmRzX2lmXCIsXG5cdFwie3N0YXRlbWVudH0gaWYge2V4cHJlc3Npb259IChlbHNlUGhyYXNlOihlbHNlfG90aGVyd2lzZSkge3N0YXRlbWVudH0pP1wiLFxuXHRjbGFzcyBiYWNrd2FyZHNfaWYgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgc3RhdGVtZW50LCBlbHNlUGhyYXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblx0XHRcdGxldCBlbHNlU3RhdGVtZW50ID0gZWxzZVBocmFzZSAmJiBlbHNlUGhyYXNlLnJlc3VsdHMuc3RhdGVtZW50LnRvU291cmNlKCk7XG5cblx0XHRcdGlmIChlbHNlU3RhdGVtZW50KSByZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9IGVsc2UgeyAke2Vsc2VTdGF0ZW1lbnR9IH1gXG5cdFx0XHRyZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZWxzZV9pZlwiLFxuXHRcIihlbHNlfG90aGVyd2lzZSkgaWYge2V4cHJlc3Npb259ICh0aGVufDopIHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBlbHNlX2lmIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGVsc2UgaWYgKCR7ZXhwcmVzc2lvbn0pYFxuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJlbHNlXCIsXG5cdFwiKGVsc2V8b3RoZXJ3aXNlKSB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZWxzZV8gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgZWxzZWBcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaWYuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBudW1iZXJzXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vLyBUT0RPOiBpZiBgaWRlbnRpZmllcmAgaXMgXCJ3b3JkXCIsIG91dHB1dCBgZ2V0V29yZCgpYCBldGNcbmNsYXNzIGluZGV4X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb257XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgeyBpZGVudGlmaWVyLCBpbmRleCwgZXhwcmVzc2lvbiB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdGluZGV4ID0gaW5kZXgudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0aWYgKHR5cGVvZiBpbmRleCA9PT0gXCJudW1iZXJcIikge1xuXHRcdFx0aWYgKGluZGV4ID4gMCkge1xuXHRcdFx0XHRyZXR1cm4gYCR7ZXhwcmVzc2lvbn1bJHtpbmRleCAtIDF9XWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7aW5kZXh9KWA7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBgJHtleHByZXNzaW9ufVske2luZGV4fSAtIDFdYDtcblxuLy8gVGhpcyBpcyBzYWZlciwgYnV0IHVzaW5nIHRoZSBhYm92ZSBmb3IgZGVtbyBwdXJwb3Nlc1xuLy9cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7aW5kZXh9KWA7XG5cdH1cbn1cblxuLy8gTnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZzpcbi8vXHQtIGBpdGVtIDEgb2YgLi4uYFxuLy9cdC0gYGl0ZW0gIzIgb2YgLi4uYFxuLy8gTk9URTogdGhlc2UgaW5kaWNlcyBhcmUgT05FIGJhc2VkLCBOT1QgemVybyBiYXNlZCBhcyBpcyBKYXZhc2NyaXB0LlxucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJpbmRleF9leHByZXNzaW9uXCIsIFwie2lkZW50aWZpZXJ9ICgjKT97aW5kZXg6ZXhwcmVzc2lvbn0gb2Yge2V4cHJlc3Npb259XCIsIGluZGV4X2V4cHJlc3Npb24pO1xuXG5jbGFzcyBvcmRpbmFsIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHt9XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaXJzdFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2Vjb25kXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJ0aGlyZFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAzIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZm91cnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDQgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaWZ0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA1IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2l4dGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNiB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNldmVudGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNyB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImVpZ2h0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA4IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwibmludGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gOSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInRlbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDEwIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwicGVudWx0aW1hdGVcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaW5hbFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAtMSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImxhc3RcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cbi8vIFRPRE86IHNpeHR5LWZpZnRoLCB0d28gaHVuZHJlZCBmb3J0eSBuaW50aC4uLlxuXG4vLyBBbHRlcm5hdGl2ZSBmb3JtIGZvciBudW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nLlxuLy8gTk9URTogZG9uJ3QgYWRkIGFzIGFuIGV4cHJlc3Npb24gc2luY2Ugd2UncmUgYXV0by1tZXJnZWQgd2l0aCBgaW5kZXhfZXhwcmVzc2lvbmAgYWJvdmUuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4X2V4cHJlc3Npb25cIiwgXCJ0aGUge2luZGV4Om9yZGluYWx9IHtpZGVudGlmaWVyfSBvZiB7ZXhwcmVzc2lvbn1cIiwgaW5kZXhfZXhwcmVzc2lvbik7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBpbmZpeCBhbmQgcHJlZml4IG9wZXJhdG9ycy5cbi8vXG5cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyMjIEluZml4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPiB7cmhzfWAsIGVnOiBgYSBpcyAxYFxuLy8gTk9URTogYG9wZXJhdG9yLnRvSlNgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyB0d28gYXJndW1lbnRzIChgbGhzYCBhbmQgYHJoc2ApIGludG8gb3V0cHV0LlxuXG4vLyBOT1RFOiBgcHJlY2VkZW5jZWAgbnVtYmVycyBjb21lIGZyb20gSmF2YXNjcmlwdCBlcXVpdmFsZW50c1xuLy9cdFx0IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL09wZXJhdG9ycy9PcGVyYXRvcl9QcmVjZWRlbmNlXG5cbmNsYXNzIGluZml4X29wZXJhdG9yIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXMge1xuXG4vLyBOT1RFOiBGb3IgdGhlIG9wZXJhdG9ycyB0aGVtc2VsdmVzLCB3ZSByZWFsbHkgd2FudCB0byBqdXN0IHVzZSBsb25nZXN0IG1hdGNoLlxuLy8gXHRcdCBXZSB3YW50IHRvIHB1c2ggdGhlIHByZWNlZGVuY2UgdXAgdG8gdGhlIGV4cHJlc3Npb24gYW5kIGV2YWx1YXRlIGRpZmZlcmVudCBleHByZXNzaW9ucyBiYXNlZCBvbiB0aGF0LlxuLy8gXHQvLyBGaW5kIGJlc3QgbWF0Y2ggYWNjb3JkaW5nIHRvIG9wZXJhdG9yIHByZWNlZGVuY2UgYXMgZGVmaW5lZCBiZWxvdy5cbi8vIFx0Z2V0QmVzdE1hdGNoKG1hdGNoZXMpIHtcbi8vIFx0XHRjb25zb2xlLndhcm4oXCJHQk1cIiwgbWF0Y2hlcywgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gucHJlY2VkZW5jZSksIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLm1hdGNoZWRUZXh0KSk7XG4vLyBcdFx0cmV0dXJuIG1hdGNoZXMucmVkdWNlKGZ1bmN0aW9uIChiZXN0LCBuZXh0KSB7XG4vLyBcdFx0XHQvLyB0YWtlIGhpZ2hlc3QgcHJlY2VkZW5jZSBtYXRjaCBmaXJzdFxuLy8gXHRcdFx0aWYgKG5leHQucHJlY2VkZW5jZSA+IGJlc3QucHJlY2VkZW5jZSkgcmV0dXJuIG5leHQ7XG4vLyBcdFx0XHQvLyB0YWtlIGxvbmdlc3QgbWF0Y2ggaWYgc2FtZSBwcmVjZWRlbmNlXG4vLyBcdFx0XHRpZiAobmV4dC5wcmVjZWRlbmNlID09PSBiZXN0LnByZWNlZGVuY2UpIHtcbi8vIFx0XHRcdFx0aWYgKG5leHQuZW5kSW5kZXggPiBiZXN0LmVuZEluZGV4KSByZXR1cm4gbmV4dDtcbi8vIFx0XHRcdH1cbi8vIFx0XHRcdHJldHVybiBiZXN0O1xuLy8gXHRcdH0sIG1hdGNoZXNbMF0pO1xuLy8gXHR9XG59XG5cbnBhcnNlci5hZGRSdWxlKFwiaW5maXhfb3BlcmF0b3JcIiwgbmV3IGluZml4X29wZXJhdG9yKCkpO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiYW5kXCIsXG5cdGNsYXNzIGFuZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSA2OyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICYmICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJvclwiLFxuXHRjbGFzcyBvciBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSA1OyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9IHx8ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpc1wiLFxuXHQgY2xhc3MgaXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3RcIixcblx0IGNsYXNzIGlzX25vdCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPSAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgZXhhY3RseVwiLFxuXHRjbGFzcyBpc19leGFjdGx5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBleGFjdGx5XCIsXG5cdCBjbGFzcyAgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT09ICR7Yn0pYCB9IH1cbik7XG5cbi8vVE9ETzogYHNwZWxsLmlzT2ZUeXBlKHRoaW5nLCB0eXBlKWBcbi8vVE9ETzogYGlzIHNhbWUgdHlwZSBhc2AgP1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGFcIixcblx0IGNsYXNzIGlzX2EgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGBzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGFuXCIsXG5cdCBjbGFzcyBpc19hbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgYVwiLFxuXHQgY2xhc3MgaXNfbm90X2EgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGAhc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgYW5cIixcblx0IGNsYXNzIGlzX25vdF9hbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xuXG4vL1RPRE86IGBzcGVsbC5jb250YWlucyhjb2xsZWN0aW9uLCB0aGluZylgXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgaW5cIixcblx0IGNsYXNzIGlzX2luIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBvbmUgb2ZcIixcblx0IGNsYXNzIGlzX29uZV9vZiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgaW5cIixcblx0IGNsYXNzIGlzX25vdF9pbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBvbmUgb2ZcIixcblx0IGNsYXNzIGlzX25vdF9vbmVfb2YgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxuXG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpbmNsdWRlc1wiLFxuXHQgY2xhc3MgaW5jbHVkZXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImNvbnRhaW5zXCIsXG5cdCBjbGFzcyBjb250YWlucyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkb2VzIG5vdCBpbmNsdWRlXCIsXG5cdCBjbGFzcyBkb2VzX25vdF9pbmNsdWRlIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiZG9lcyBub3QgY29udGFpblwiLFxuXHQgY2xhc3MgZG9lc19ub3RfY29udGFpbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIj5cIixcblx0IGNsYXNzIGd0IGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgZ3JlYXRlciB0aGFuXCIsXG5cdCBjbGFzcyBpc19ncmVhdGVyX3RoYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIj49XCIsXG5cdCBjbGFzcyBndGUgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvXCIsXG5cdCBjbGFzcyBpc19ndGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+PSAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCI8XCIsXG5cdCBjbGFzcyBsdCBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGxlc3MgdGhhblwiLFxuXHQgY2xhc3MgaXNfbGVzc190aGFuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCI8PVwiLFxuXHQgY2xhc3MgbHRlIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGxlc3MgdGhhbiBvciBlcXVhbCB0b1wiLFxuXHQgY2xhc3MgaXNfbHRlIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPD0gJHtifSlgIH0gfVxuKTtcblxuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJcXFxcK1wiLFxuXHQgY2xhc3MgcGx1cyBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSArICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJwbHVzXCIsXG5cdCBjbGFzcyBwbHVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSArICR7Yn1gIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiLVwiLFxuXHQgY2xhc3MgbWludXMgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMzsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLSAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwibWludXNcIixcblx0IGNsYXNzIG1pbnVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAtICR7Yn1gIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiXFxcXCpcIixcblx0IGNsYXNzIHRpbWVzIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTQ7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICogJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcInRpbWVzXCIsXG5cdCBjbGFzcyB0aW1lcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKiAke2J9YCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIi9cIixcblx0IGNsYXNzIGRpdmlkZWRfYnkgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLyAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiZGl2aWRlZCBieVwiLFxuXHQgY2xhc3MgZGl2aWRlZF9ieSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLyAke2J9YCB9IH1cbik7XG5cbi8vVE9ETzogIGArPWAgZXRjPyAgb3RoZXIgbWF0aCBmdW5jdGlvbnM/XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImluZml4X29wZXJhdG9yX2V4cHJlc3Npb25cIixcblx0XCJ7bGhzOmV4cHJlc3Npb259IHtvcGVyYXRvcjppbmZpeF9vcGVyYXRvcn0ge3JoczpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHQvLyBXZSBDQU5OT1QgbWF0Y2ggaWYgYGluZml4X29wZXJhdG9yYCBpc24ndCBmb3VuZCBpbiB0aGUgZXhwcmVzc2lvbi5cblx0XHR0ZXN0UnVsZSA9IFwiaW5maXhfb3BlcmF0b3JcIjtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxocywgcmhzLCBvcGVyYXRvciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIG9wZXJhdG9yLnRvSlMobGhzLnRvU291cmNlKGNvbnRleHQpLCByaHMudG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8jIyBQb3N0aWZ4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPmAsIGUuZy4gYGEgaXMgZGVmaW5lZGBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgYXJndW1lbnQgKGBsaHNgKSBpbnRvIEpTIG91dHB1dC5cblxucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgZGVmaW5lZFwiLFxuXHRjbGFzcyBpc19kZWZpbmVkIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gIT09ICd1bmRlZmluZWQnKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGRlZmluZWRcIixcblx0Y2xhc3MgaXNfbm90X2RlZmluZWQgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyB1bmRlZmluZWRcIixcblx0Y2xhc3MgaXNfdW5kZWZpbmVkIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gPT09ICd1bmRlZmluZWQnKWAgfSB9XG4pO1xuXG5cbi8vVE9ETzogYHNwZWxsLmlzRW1wdHkodGhpbmcpYFxucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgZW1wdHlcIixcblx0Y2xhc3MgaXNfZW1wdHkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBlbXB0eVwiLFxuXHRjbGFzcyBpc19ub3RfZW1wdHkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeF9vcGVyYXRvcn1cIixcblx0Y2xhc3MgcG9zdGZpeF9vcGVyYXRvcl9leHByZXNpb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdC8vIFdlIENBTk5PVCBtYXRjaCBpZiBgcG9zdGZpeF9vcGVyYXRvcmAgaXNuJ3QgZm91bmQgaW4gdGhlIGV4cHJlc3Npb24uXG5cdFx0dGVzdFJ1bGUgPSBcInBvc3RmaXhfb3BlcmF0b3JcIjtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIG9wZXJhdG9yIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gb3BlcmF0b3IudG9KUyhleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vL1xuLy9cdCMjIFJldHVybnNcbi8vXG5cbi8vIFJldHVybiBhIHZhbHVlXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcInJldHVybl9zdGF0ZW1lbnRcIiwgXCJyZXR1cm4ge2V4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJldHVybl9zdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIGByZXR1cm4gJHtleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHQjIyBBc3NpZ25tZW50XG4vL1xuY2xhc3MgYXNzaWdubWVudCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50e1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IHsgdGhpbmcsIHZhbHVlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0aWYgKHRoaW5nIGluc3RhbmNlb2YgUnVsZS5JZGVudGlmaWVyKSB7XG5cdFx0XHQvLyBUT0RPOiBkZWNsYXJlIGlkZW50aWZpZXIgaWYgbm90IGluIHNjb3BlLCBldGNcblx0XHR9XG5cblx0XHRyZXR1cm4gYCR7dGhpbmcudG9Tb3VyY2UoY29udGV4dCl9ID0gJHt2YWx1ZS50b1NvdXJjZShjb250ZXh0KX1gO1xuXHR9XG59XG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYXNzaWdubWVudFwiLCBcInt0aGluZzpleHByZXNzaW9ufSA9IHt2YWx1ZTpleHByZXNzaW9ufVwiLCBhc3NpZ25tZW50KTtcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYXNzaWdubWVudFwiLCBcInNldCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8ge3ZhbHVlOmV4cHJlc3Npb259XCIsIGFzc2lnbm1lbnQpO1xuXG5cbi8vXG4vL1x0IyMgVXNlciBpbnRlcmFjdGlvblxuLy9cblxuLy8gQWxlcnQgYSBtZXNzYWdlLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhbGVydFwiLCBcImFsZXJ0IHttZXNzYWdlOmV4cHJlc3Npb259IChidXR0b25DbGF1c2U6d2l0aCB7dGV4dH0pP1wiLFxuXHRjbGFzcyBhbGVydCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBidXR0b25DbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGJ1dHRvbk5hbWUgPSBidXR0b25DbGF1c2UgPyBidXR0b25DbGF1c2UucmVzdWx0cy50ZXh0LnRvU291cmNlKGNvbnRleHQpIDogJ1wiT0tcIic7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLmFsZXJ0KCR7bWVzc2FnZX0sICR7YnV0dG9uTmFtZX0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFdhcm5pbmcgbWVzc2FnZSAtLSBsaWtlIGFsZXJ0IGJ1dCBmYW5jaWVyLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJ3YXJuXCIsIFwid2FybiB7ZXhwcmVzc2lvbjpleHByZXNzaW9ufSAoYnV0dG9uQ2xhdXNlOndpdGgge3RleHR9KT9cIixcblx0Y2xhc3Mgd2FybiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBidXR0b25DbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGJ1dHRvbk5hbWUgPSBidXR0b25DbGF1c2UgPyBidXR0b25DbGF1c2UucmVzdWx0cy50ZXh0LnRvU291cmNlKGNvbnRleHQpIDogJ1wiT0tcIic7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLndhcm4oJHttZXNzYWdlfSwgJHtidXR0b25OYW1lfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBDb25maXJtIG1lc3NhZ2UgLS0gcHJlc2VudCBhIHF1ZXN0aW9uIHdpdGggdHdvIGFuc3dlcnMuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImNvbmZpcm1cIiwgXCJjb25maXJtIHttZXNzYWdlOmV4cHJlc3Npb259IChidXR0b25DbGF1c2U6d2l0aCB7b2tCdXR0b246dGV4dH0gKGNhbmNlbENsYXVzZTogKGFuZHxvcikge2NhbmNlbEJ1dHRvbjp0ZXh0fSk/ICk/XCIsXG5cdGNsYXNzIGNvbmZpcm0gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgYnV0dG9uQ2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBva0J1dHRvbiA9ICdcIk9LXCInLCBjYW5jZWxCdXR0b24gPSAnXCJDYW5jZWxcIic7XG5cblx0XHRcdGlmIChidXR0b25DbGF1c2UpIHtcblx0XHRcdFx0b2tCdXR0b24gPSBidXR0b25DbGF1c2UucmVzdWx0cy5va0J1dHRvbi5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0XHRsZXQgY2FuY2VsQ2xhdXNlID0gYnV0dG9uQ2xhdXNlLnJlc3VsdHMuY2FuY2VsQ2xhdXNlO1xuXHRcdFx0XHRpZiAoY2FuY2VsQ2xhdXNlKSBjYW5jZWxCdXR0b24gPSBjYW5jZWxDbGF1c2UucmVzdWx0cy5jYW5jZWxCdXR0b24ucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwuY29uZmlybSgke21lc3NhZ2V9LCAke29rQnV0dG9ufSwgJHtjYW5jZWxCdXR0b259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCJpbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuaW1wb3J0IFwiLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL3J1bGVzL2luZGV4LmpzXCI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHR3aW5kb3cuVGV4dFN0cmVhbSA9IFRleHRTdHJlYW07XG5cdHdpbmRvdy5QYXJzZXIgPSBQYXJzZXI7XG5cdHdpbmRvdy5SdWxlID0gUnVsZTtcblx0d2luZG93LnBhcnNlciA9IHBhcnNlcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuXHRUZXh0U3RyZWFtLCBQYXJzZXIsIFJ1bGUsIHBhcnNlclxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvaW5kZXguanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlZmluaW5nIGNsYXNzZXMgKGtub3duIGFzIGB0eXBlc2ApXG4vL1xuaW1wb3J0IGdsb2JhbCBmcm9tIFwiLi4vZ2xvYmFsXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy8gREVBRCBTSU1QTEUgUExVUkFMSVpFUi4uLiBSRUFMTFkgTk9UIFZFUlkgR09PRFxuZnVuY3Rpb24gcGx1cmFsaXplKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQgKyBcInNcIjtcbn1cblxuXG4vL01PVkUgVE8gYG9iamVjdHNgP1xuLy8gUHJvcGVydGllcyBjbGF1c2U6IGNyZWF0ZXMgYW4gb2JqZWN0IHdpdGggb25lIG9yIG1vcmUgcHJvcGVydHkgdmFsdWVzLlxuLy9cdGBmb28gPSAxLCBiYXIgPSAyYFxuLy9UT0RPOiB3b3VsZCBsaWtlIHRvIHVzZSBgYW5kYCBidXQgdGhhdCB3aWxsIGJhcmYgb24gZXhwcmVzc2lvbnMuLi5cbi8vVE9ETzogaG93IHRvIGRvIHByb3BlcnRpZXMgb24gbXVsdGlwbGUgbGluZXM/XG5wYXJzZXIuYWRkTGlzdChcblx0XCJvYmplY3RfbGl0ZXJhbF9wcm9wZXJ0aWVzXCIsXG5cdFwiWyh7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn0pICxdXCIsXG5cdGNsYXNzIG9iamVjdF9saXRlcmFsX3Byb3BlcnRpZXMgZXh0ZW5kcyBSdWxlLkxpc3Qge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBwcm9wcyA9IHRoaXMucmVzdWx0cy5tYXRjaGVkLm1hcChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGV4cHJlc3Npb24gfSA9IHByb3AucmVzdWx0cztcblx0XHRcdFx0XHRsZXQga2V5ID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0XHRsZXQgdmFsdWUgPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0XHRcdHJldHVybiBgXCIke2tleX1cIjogJHt2YWx1ZX1gXG5cdFx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGB7ICR7cHJvcHMuam9pbihcIiwgXCIpfSB9YDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIGBuZXdgXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhbGwgdHlwZXMgdGFrZSBhbiBvYmplY3Qgb2YgcHJvcGVydGllcz8/Pz9cbnBhcnNlci5hZGRTZXF1ZW5jZShcblx0XCJuZXdfdGhpbmdcIixcblx0XCIoY3JlYXRlfG5ldykge3R5cGV9IChwcm9wc19jbGF1c2U6d2l0aCB7cHJvcHM6b2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc30pP1wiLFxuXHRjbGFzcyBuZXdfdGhpbmcgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBwcm9wc19jbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHR5cGUgPSB0eXBlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHByb3BzID0gcHJvcHNfY2xhdXNlICYmIHByb3BzX2NsYXVzZS5yZXN1bHRzLnByb3BzLnRvU291cmNlKGNvbnRleHQpIHx8IFwiXCI7XG5cblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igb2JqZWN0LCB3aGljaCB3ZSdsbCBjcmVhdGUgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbC5cblx0XHRcdGlmICh0eXBlID09PSBcIk9iamVjdFwiKSB7XG5cdFx0XHRcdGlmICghcHJvcHNfY2xhdXNlKSByZXR1cm4gXCJ7fVwiO1xuXHRcdFx0XHRyZXR1cm4gYCR7cHJvcHN9YDtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGBuZXcgJHt0eXBlfSgke3Byb3BzfSlgO1xuXHRcdH1cblx0fVxuKTtcbi8vIFRoaXMgd29ya3MgYXMgYW4gZXhwcmVzc2lvbiBPUiBhIHN0YXRlbWVudC5cbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMubmV3X3RoaW5nKTtcbnBhcnNlci5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHBhcnNlci5ydWxlcy5uZXdfdGhpbmcpO1xuXG5cblxuXG4vLyBEZWZpbmUgY2xhc3MuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlZmluZV90eXBlXCIsXG5cdFwiZGVmaW5lIHR5cGUge3R5cGV9IChleHRlbmRzX2NsYXVzZTphcyAoYXxhbikge3N1cGVyVHlwZTp0eXBlfSk/XCIsXG5cdGNsYXNzIGRlZmluZV90eXBlIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHR5cGUsIGV4dGVuZHNfY2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHR0eXBlID0gdHlwZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBzdXBlclR5cGUgPSBleHRlbmRzX2NsYXVzZSAmJiBleHRlbmRzX2NsYXVzZS5yZXN1bHRzLnN1cGVyVHlwZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGlmIChzdXBlclR5cGUpIHtcblx0XHRcdFx0cmV0dXJuIGBjbGFzcyAke3R5cGV9IGV4dGVuZHMgJHtzdXBlclR5cGV9YDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBgY2xhc3MgJHt0eXBlfWA7XG5cblx0XHR9XG5cdH1cbik7XG5cbi8vVE9ETzogY29uc3RydWN0b3JcblxuXG5cbi8vTU9WRSBUTyBgZnVuY3Rpb25zYD9cbi8vIEFyZ3VtZW50cyBjbGF1c2UgZm9yIG1ldGhvZHNcbi8vXHRgd2l0aCBmb29gIG9yIGB3aXRoIGZvbyBhbmQgYmFyIGFuZCBiYXpgXG4vL1RPRE86IHtpZGVudGlmaWVyfSA9IHtleHByZXNzaW9ufVx0PT4gcmVxdWlyZXMgYCxgIGluc3RlYWQgb2YgYGFuZGBcbi8vVE9ETzogYHdpdGggZm9vIGFzIFR5cGVgXG4vL1RPRE86XHRgd2l0aCBmb28uLi5gIGZvciBzcGxhdD9cbnBhcnNlci5hZGRTZXF1ZW5jZShcblx0XCJhcmdzX2NsYXVzZVwiLFxuXHRcIndpdGggW2FyZ3M6e2lkZW50aWZpZXJ9ICxdXCIsXG5cdGNsYXNzIGFyZ3NfY2xhdXNlIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7XG5cdFx0Ly8gUmV0dXJuIGp1c3QgdGhlIGFyZ3VtZW50cyBhcyB0aGUgcmVzdWx0c1xuXHRcdGdldCByZXN1bHRzKCkge1xuXHRcdFx0cmV0dXJuIHN1cGVyLnJlc3VsdHMuYXJncztcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4ganVzdCB0aGUgYXJndW1lbnQgbmFtZXMgYXMgYW4gYXJyYXlcblx0XHRnZXQgYXJnTmFtZXMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzLm1hdGNoZWQubWFwKGFyZyA9PiBhcmcubWF0Y2hlZCk7XG5cdFx0fVxuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuYXJnTmFtZXMuam9pbihcIiwgXCIpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBEZWNsYXJlIGluc3RhbmNlIG1ldGhvZCBvciBub3JtYWwgZnVuY3Rpb24uXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfbWV0aG9kXCIsXG5cdFwiKHRvfG9uKSB7aWRlbnRpZmllcn0ge2FyZ3NfY2xhdXNlfT8gKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGRlY2xhcmVfbWV0aG9kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3NfY2xhdXNlLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblxuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgYXJncyA9IChhcmdzX2NsYXVzZSAmJiBhcmdzX2NsYXVzZS50b1NvdXJjZShjb250ZXh0KSkgfHwgXCJcIjtcblx0XHRcdHN0YXRlbWVudCA9IChzdGF0ZW1lbnQgPyBgIHsgJHtzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCl9IH1gIDogXCJcIik7XG5cblx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KSR7c3RhdGVtZW50fWBcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gRGVjbGFyZSBcImFjdGlvblwiLCB3aGljaCBjYW4gYmUgY2FsbGVkIGdsb2JhbGx5IGFuZCBhZmZlY3RzIHRoZSBwYXJzZXIuXG4vLyBUT0RPOiBgd2l0aGAgY2xhdXNlICh3aWxsIGNvbmZsaWN0IHdpdGggYHdvcmRgKVxuLy8gVE9ETzogaW5zdGFsbCBpbiBwYXJzZXIgc29tZWhvd1xuLy8gVE9ETzogY3JlYXRlIGluc3RhbmNlIGZ1bmN0aW9uPyAgb3IgbWF5YmUgd2UgZG9uJ3QgbmVlZCBpdDpcbi8vXHRcdFx0YGFjdGlvbiB0dXJuIENhcmQgb3ZlcmAgZm9yIGFuIGluc3RhbmNlIGlzIGp1c3QgYHR1cm4gbWUgb3ZlcmBcbi8vXHRcdFx0YGFjdGlvbiBhZGQgY2FyZCB0byBkZWNrYCA9PiBgYWRkIG1lIHRvIGRlY2tgXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX2FjdGlvblwiLFxuXHRcImFjdGlvbiAod29yZF9jbGF1c2U6e3dvcmR9fHt0eXBlfSkrIChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBkZWNsYXJlX2FjdGlvbiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHdvcmRfY2xhdXNlLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGxldCB3b3JkcyA9IHdvcmRfY2xhdXNlLm1hdGNoZWQubWFwKCB3b3JkID0+IHdvcmQudG9Tb3VyY2UoY29udGV4dCkgKTtcblx0XHRcdC8vIGlmIHRoZXJlJ3Mgb25seSBvbmUgd29yZCwgaXQgY2FuJ3QgYmUgYSBibGFja2xpc3RlZCBpZGVudGlmaWVyIG9yIGEgdHlwZVxuXHRcdFx0aWYgKHdvcmRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHR2YXIgd29yZCA9IHdvcmRzWzBdO1xuXHRcdFx0XHRpZiAod29yZF9jbGF1c2UubWF0Y2hlZCBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSB0eXBlczogJHt3b3JkfWApO1xuXHRcdFx0XHR9XG5cbi8vIEhBQ0s6IGBnbG9iYWwucGFyc2VyYCBpcyBhIGhhY2sgaGVyZSBmb3IgY29udmVuaWVuY2UgaW4gdGVzdGluZy4uLlxuXHRcdFx0XHRsZXQgcGFyc2VyID0gY29udGV4dCA/IGNvbnRleHQucGFyc2VyIDogZ2xvYmFsLnBhcnNlcjtcblx0XHRcdFx0aWYgKHBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmJsYWNrbGlzdFt3b3JkXSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSBibGFja2xpc3RlZCBpZGVudGlmaWVyc1wiOiAke3dvcmR9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBhcmd1bWVudHMgYW5kL29yIHR5cGVzXG5cdFx0XHR2YXIgYXJncyA9IFtdO1xuXHRcdFx0dmFyIHR5cGVzID0gW107XG5cdFx0XHQvLyBpZiBhbnkgb2YgdGhlIHdvcmRzIGFyZSB0eXBlcyAoY2FwaXRhbCBsZXR0ZXIpIG1ha2UgdGhhdCBhbiBhcmd1bWVudCBvZiB0aGUgc2FtZSBuYW1lLlxuXHRcdFx0d29yZF9jbGF1c2UubWF0Y2hlZC5tYXAoIChpdGVtLCBpbmRleCkgPT4ge1xuXHRcdFx0XHRpZiAoaXRlbSBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdGxldCB0eXBlID0gd29yZHNbaW5kZXhdO1xuXHRcdFx0XHRcdGxldCB3b3JkID0gdHlwZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdHR5cGVzLnB1c2goW3R5cGUsIHdvcmRdKTtcblx0XHRcdFx0XHR3b3Jkc1tpbmRleF0gPSB3b3JkO1xuXHRcdFx0XHRcdGFyZ3MucHVzaCh3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQvLyBnZXQgc3RhdGljIG1ldGhvZCBuYW1lIGFuZCBhcmd1bWVudHMgZm9yIG91dHB1dFxuXHRcdFx0bGV0IG1ldGhvZE5hbWUgPSB3b3Jkcy5qb2luKFwiX1wiKTtcblx0XHRcdGFyZ3MgPSBhcmdzLmpvaW4oXCIsIFwiKTtcblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpZiB0aGVyZSBhcmUgYW55IGNvbmRpdGlvbnMgb24gdGhlIGFib3ZlXG5cdFx0XHRsZXQgY29uZGl0aW9ucyA9IHR5cGVzLm1hcCggKFt0eXBlLCB3b3JkXSkgPT4ge1xuXHRcdFx0XHRyZXR1cm4gYFxcdGlmICghc3BlbGwuaXNBKCR7d29yZH0sICR7dHlwZX0pKSByZXR1cm4gdW5kZWZpbmVkYDtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBnZXQgc3RhdGVtZW50cywgYWRkaW5nIGNvbmRpdGlvbnMgaWYgbmVjZXNzYXJ5XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiBcIlwiO1xuXHRcdFx0bGV0IHN0YXRlbWVudHMgPSBcIlwiO1xuXHRcdFx0aWYgKHN0YXRlbWVudCkge1xuXHRcdFx0XHRzdGF0ZW1lbnRzID0gW107XG5cdFx0XHRcdGlmIChjb25kaXRpb25zLmxlbmd0aCkgc3RhdGVtZW50cyA9IHN0YXRlbWVudHMuY29uY2F0KGNvbmRpdGlvbnMpO1xuXHRcdFx0XHRpZiAoc3RhdGVtZW50KSBzdGF0ZW1lbnRzLnB1c2goXCJcXHRcIiArIHN0YXRlbWVudCk7XG5cdFx0XHRcdHN0YXRlbWVudHMgPSBgIHtcXG4ke3N0YXRlbWVudHMuam9pbihcIlxcblwiKX1cXG4gfVxcbmA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChjb25kaXRpb25zLmxlbmd0aCkge1xuXHRcdFx0XHRzdGF0ZW1lbnRzID0gYCB7XFxuJHtjb25kaXRpb25zLmpvaW4oXCJcXG5cIil9YDtcblx0XHRcdH1cbi8vZGVidWdnZXI7XG5cdFx0XHQvLyBDcmVhdGUgYXMgYSBTVEFUSUMgZnVuY3Rpb25cblx0Ly9UT0RPOiBjcmVhdGUgYXMgYW4gaW5zdGFuY2UgZnVuY3Rpb24gd2UgY2FuIGNhbGwgb24gb3Vyc2VsZiFcblx0XHRcdHJldHVybiBgc3RhdGljICR7bWV0aG9kTmFtZX0oJHthcmdzfSkke3N0YXRlbWVudHN9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gR2V0dGVyIGVpdGhlciB3aXRoIG9yIHdpdGhvdXQgYXJndW1lbnRzLlxuLy8gSWYgeW91IHNwZWNpZnkgYXJndW1lbnRzLCB5aWVsZHMgYSBub3JtYWwgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhIHZhbHVlLlxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJnZXR0ZXJcIixcblx0XCJnZXQge2lkZW50aWZpZXJ9IHthcmdzX2NsYXVzZX0/IChcXFxcOik/IHtleHByZXNzaW9ufT9cIixcblx0Y2xhc3MgZ2V0dGVyIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3NfY2xhdXNlLCBleHByZXNzaW9uIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBhcmdzID0gYXJnc19jbGF1c2UgJiYgYXJnc19jbGF1c2UudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRleHByZXNzaW9uID0gKGV4cHJlc3Npb24gPyBgIHsgcmV0dXJuICgke2V4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCl9KSB9YCA6IFwiXCIpO1xuXG5cdFx0XHRpZiAoYXJncyAmJiBleHByZXNzaW9uKSB7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KSR7ZXhwcmVzc2lvbn1gO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoYXJncykge1xuXHRcdFx0XHRyZXR1cm4gYCR7aWRlbnRpZmllcn0oJHthcmdzfSlgO1xuXG5cdFx0XHR9IGVsc2UgaWYgKGV4cHJlc3Npb24pIHtcblx0XHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSgpJHtleHByZXNzaW9ufWA7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gYGdldCAke2lkZW50aWZpZXJ9KClgO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFNldHRlci5cbi8vIENvbXBsYWlucyBpZiB5b3Ugc3BlY2lmeSBtb3JlIHRoYW4gb25lIGFyZ3VtZW50LlxuLy8gSWYgeW91IGRvbid0IHBhc3MgYW4gZXhwbGljaXQgYXJndW1lbnQsIHdlJ2xsIGFzc3VtZSBpdCdzIHRoZSBzYW1lIGFzIHRoZSBpZGVudGlmaWVyLlxuLy8gZWc7XHRgc2V0IGNvbG9yOiBzZXQgdGhlIGNvbG9yIG9mIG15IHRleHQgdG8gY29sb3JgXG4vL1xuLy8gVE9ETzogaW50ZXJuYWwgZ2V0dGVyL3NldHRlciBzZW1hbnRpY3MgYWxhIG9iamVjdGl2ZSBDXG4vL1x0XHRcdGBzZXQgY29sb3I6IGlmIGNvbG9yIGlzIGluIFtcInJlZFwiLCBcImJsdWVcIl0gdGhlbiBzZXQgbXkgY29sb3IgdG8gY29sb3JgXG4vL1x0XHQgPT4gYG15IGNvbG9yYCB3aXRoaW4gc2V0dGVyIHNob3VsZCBhdXRvbWF0aWNhbGx5IHRyYW5zbGF0ZSB0byBgdGhpcy5fY29sb3JgID8/P1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJzZXR0ZXJcIixcblx0XCJzZXQge2lkZW50aWZpZXJ9IHthcmdzX2NsYXVzZX0/IChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBnZXR0ZXIgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJnc19jbGF1c2UsIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cblx0XHRcdC8vIEFzc3VtZSB3ZSB3YW50IHRoZSBzYW1lIG5hbWUgYXMgdGhlIGlkZW50aWZpZXIgaWYgbm8gYXJndW1lbnNcblx0XHRcdGxldCBhcmdzID0gKGFyZ3NfY2xhdXNlICYmIGFyZ3NfY2xhdXNlLmFyZ05hbWVzKSB8fCBbaWRlbnRpZmllcl07XG5cdFx0XHQvLyBDb21wbGFpbiBpZiBtb3JlIHRoYW4gb25lIGFyZ3VtZW50XG5cdFx0XHRpZiAoYXJncy5sZW5ndGggPiAxKVxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJwYXJzZSgnc2V0dGVyJyk6IG9ubHkgb25lIGFyZ3VtZW50IGFsbG93ZWQgaW4gc2V0dGVyOiAgXCIsIHRoaXMubWF0Y2hlZFRleHQpO1xuXG5cdFx0XHRzdGF0ZW1lbnQgPSAoc3RhdGVtZW50ID8gYCB7ICR7c3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpfSB9YCA6IFwiXCIpO1xuXG5cdFx0XHRyZXR1cm4gYHNldCAke2lkZW50aWZpZXJ9KCR7YXJnc1swXX0pJHtzdGF0ZW1lbnR9YDtcblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vXG4vL1x0ZGVjbGFyZSBwcm9wZXJ0aWVzXG4vL1xuXG4vL1RPRE86IGFub3RoZXIgbmFtZSBmb3IgYGNvbnN0YW50YCA/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlcIixcblx0XCIoc2NvcGU6cHJvcGVydHl8Y29uc3RhbnR8c2hhcmVkIHByb3BlcnR5KSB7aWRlbnRpZmllcn0gKHZhbHVlX2NsYXVzZTo9IHtleHByZXNzaW9ufSk/XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHkgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc2NvcGUsIGlkZW50aWZpZXIsIHZhbHVlX2NsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0c2NvcGUgPSBzY29wZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHZhbHVlID0gdmFsdWVfY2xhdXNlICYmIFwiID0gXCIgKyB2YWx1ZV9jbGF1c2UucmVzdWx0cy5leHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpIHx8IFwiXCI7XG5cblx0XHRcdGxldCBkZWNsYXJhdGlvbiA9IGAke2lkZW50aWZpZXJ9JHt2YWx1ZX1gO1xuXHRcdFx0c3dpdGNoIChzY29wZSkge1xuXHRcdFx0XHRjYXNlIFwiY29uc3RhbnRcIjpcblx0XHRcdFx0XHRpZiAoIXZhbHVlKSBjb25zb2xlLndhcm4oXCJwYXJzZSgnZGVjbGFyZV9wcm9wZXJ0eScpOiBjb25zdGFudCBwcm9wZXJ0aWVzIG11c3QgZGVjbGFyZSBhIHZhbHVlOiAgXCIsIHRoaXMubWF0Y2hlZFRleHQpO1xuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHtkZWNsYXJhdGlvbn1gO1xuXG5cdFx0XHRcdGNhc2UgXCJzaGFyZWQgcHJvcGVydHlcIjpcblx0XHRcdFx0XHRyZXR1cm4gYEBwcm90b1xcbiR7ZGVjbGFyYXRpb259YDtcblxuXHRcdFx0XHRjYXNlIFwicHJvcGVydHlcIjpcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRyZXR1cm4gZGVjbGFyYXRpb247XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiBzY29wZV9tb2RpZmllcj8/P1xuLy8gVE9ETzogaW5pdGlhbCB2YWx1ZVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwicHJvcGVydHkge2lkZW50aWZpZXJ9IGFzIChhfGFuKT8ge3R5cGV9XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHkgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgdHlwZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHR0eXBlID0gdHlwZS50b1NvdXJjZShjb250ZXh0KTtcblxuXHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSgpIHsgcmV0dXJuIHRoaXMuX18ke2lkZW50aWZpZXJ9IH1cXG5gXG5cdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAoc3BlbGwuaXNBKHZhbHVlLCAke3R5cGV9KSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eVwiLFxuXHRcInByb3BlcnR5IHtpZGVudGlmaWVyfSBhcyBvbmUgb2Yge2xpc3Q6bGl0ZXJhbF9saXN0fVwiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5X2FzX29uZV9vZiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBsaXN0IH0gPSB0aGlzLnJlc3VsdHM7XG5cblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHBsdXJhbCA9IHBsdXJhbGl6ZShpZGVudGlmaWVyKTtcblxuXHRcdFx0bGV0IHZhbHVlcyA9IGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgZmlyc3QgPSBsaXN0LmdldEl0ZW0oMCk7XG5cdFx0XHRsZXQgZmlyc3RWYWx1ZSA9IGZpcnN0ID8gZmlyc3QudG9Tb3VyY2UoY29udGV4dCkgOiBcInVuZGVmaW5lZFwiO1xuXG5cdFx0XHRyZXR1cm4gYEBwcm90b1xcbmBcblx0XHRcdFx0ICsgYCR7cGx1cmFsfSA9ICR7dmFsdWVzfVxcbmBcblx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9KCkgeyByZXR1cm4gdGhpcy5fXyR7aWRlbnRpZmllcn0gPT09IHVuZGVmaW5lZCA/ICR7Zmlyc3RWYWx1ZX0pIDogdGhpcy5fXyR7aWRlbnRpZmllcn19XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblxuLy8gTU9SRSBFRkZJQ0lFTlQgQlVUIFVHTElFUlxuLy8gXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9O1xcbmBcbi8vIFx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9IHsgcmV0dXJuIChcIl9fJHtpZGVudGlmaWVyfVwiIGluIHRoaXMgPyB0aGlzLl9fJHtpZGVudGlmaWVyfSA6ICR7Zmlyc3RWYWx1ZX0pIH1cXG5gXG4vLyBcdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy5jb25zdHJ1Y3Rvci4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdFNlbGYtcmVmZXJlbmNlXG4vL1xucGFyc2VyLmFkZEtleXdvcmQoXCJtZVwiLCBcIm1lXCIsXG5cdGNsYXNzIG1lIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gXCJ0aGlzXCI7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB0aGlzIHJlYWxseSBtYWtlcyBtZSB3YW50IHRvIG1ha2UgYEkgYW0gZW1wdHlgIGV0YyB3b3JrLi4uXG5wYXJzZXIuYWRkS2V5d29yZChcIklcIiwgXCJJXCIsXG5cdGNsYXNzIEkgZXh0ZW5kcyBSdWxlLktleXdvcmQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiBcInRoaXNcIjtcblx0XHR9XG5cdH1cbik7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLm1lKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMuSSk7XG5cblxuLy9cbi8vXHRQcm9wZXJ0eSBhY2Nlc3Ncbi8vXG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIocHJvcGVydGllczp0aGUge2lkZW50aWZpZXJ9IG9mKSsgdGhlPyB7ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgcHJvcGVydGllcyB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRwcm9wZXJ0aWVzID0gcHJvcGVydGllcy5yZXN1bHRzXG5cdFx0XHRcdFx0XHRcdC5yZXZlcnNlKClcblx0XHRcdFx0XHRcdFx0Lm1hcCggcHJvcGVydHkgPT4gcHJvcGVydHkuaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSApXG5cdFx0XHRcdFx0XHRcdC5qb2luKFwiLlwiKTtcblx0XHRcdHJldHVybiBgJHtleHByZXNzaW9ufS4ke3Byb3BlcnRpZXN9YDtcbi8vIE5PVEU6IHRoZSBmb2xsb3dpbmcgaXMgc2FmZXIsIGJ1dCB1Z2x5IGZvciBkZW1vIHB1cnBvc2VzXG4vL1x0XHRcdHJldHVybiBgc3BlbGwuZ2V0KCR7ZXhwcmVzc2lvbn0sIFsnJHtwcm9wZXJ0aWVzfSddKWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwcm9wZXJ0eV9leHByZXNzaW9uXCIsXG5cdFwiKG15fHRoaXMpIHtpZGVudGlmaWVyfVwiLFxuXHRjbGFzcyBwcm9wZXJ0eV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgdGhpcy4ke2lkZW50aWZpZXJ9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvdHlwZXMuanMiLCJ2YXIgZztcclxuXHJcbi8vIFRoaXMgd29ya3MgaW4gbm9uLXN0cmljdCBtb2RlXHJcbmcgPSAoZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHRoaXM7XHJcbn0pKCk7XHJcblxyXG50cnkge1xyXG5cdC8vIFRoaXMgd29ya3MgaWYgZXZhbCBpcyBhbGxvd2VkIChzZWUgQ1NQKVxyXG5cdGcgPSBnIHx8IEZ1bmN0aW9uKFwicmV0dXJuIHRoaXNcIikoKSB8fCAoMSxldmFsKShcInRoaXNcIik7XHJcbn0gY2F0Y2goZSkge1xyXG5cdC8vIFRoaXMgd29ya3MgaWYgdGhlIHdpbmRvdyByZWZlcmVuY2UgaXMgYXZhaWxhYmxlXHJcblx0aWYodHlwZW9mIHdpbmRvdyA9PT0gXCJvYmplY3RcIilcclxuXHRcdGcgPSB3aW5kb3c7XHJcbn1cclxuXHJcbi8vIGcgY2FuIHN0aWxsIGJlIHVuZGVmaW5lZCwgYnV0IG5vdGhpbmcgdG8gZG8gYWJvdXQgaXQuLi5cclxuLy8gV2UgcmV0dXJuIHVuZGVmaW5lZCwgaW5zdGVhZCBvZiBub3RoaW5nIGhlcmUsIHNvIGl0J3NcclxuLy8gZWFzaWVyIHRvIGhhbmRsZSB0aGlzIGNhc2UuIGlmKCFnbG9iYWwpIHsgLi4ufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBnO1xyXG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAod2VicGFjaykvYnVpbGRpbi9nbG9iYWwuanNcbi8vIG1vZHVsZSBpZCA9IDE1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIE1ha2Ugc3VyZSBgZ2xvYmFsYCBpcyBkZWZpbmVkIGdsb2JhbGx5OlxuLy9cdC0gZWl0aGVyIGFzIHRoZSBub2RlanMgYGdsb2JhbGAsIG9yXG4vL1x0LSBhcyBhbiBhbGlhcyBmb3IgYHdpbmRvd2AgaW4gYnJvd3NlcnMsIG9yXG4vL1x0LSBmb3IgdGhlIGBzZWxmYCBjb250ZXh0IGluIHdlYiB3b3JrZXJzLlxuLy9cbi8vIE5PVEU6IHRoaXMgbW9kaWZpZXMgdGhlIFwiZ2xvYmFsXCIgZW52aXJvbm1lbnQgYnkgbWFraW5nIHN1cmUgXCJnbG9iYWxcIiBpcyBzZXQuIVxuLy9cblxubGV0IGdsb2JhbF9pZGVudGlmaWVyO1xuaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gbm9kZVwiKTtcblx0Z2xvYmFsX2lkZW50aWZpZXIgPSBnbG9iYWw7XG59XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4vL1x0Y29uc29sZS5sb2coXCJSdW5uaW5nIGluIGEgd2ViIGJyb3dzZXJcIik7XG5cdHdpbmRvdy5nbG9iYWwgPSB3aW5kb3c7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gd2luZG93O1xufVxuXG5pZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gYSB3ZWIgd29ya2VyXCIpO1xuXHRzZWxmLmdsb2JhbCA9IHNlbGY7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gc2VsZjtcbn1cblxuLy8gRXhwb3J0IGZvciBjb25zdW1wdGlvbiBieSBpbXBvcnQuXG5leHBvcnQgZGVmYXVsdCBnbG9iYWxfaWRlbnRpZmllcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2dsb2JhbC5qcyJdLCJzb3VyY2VSb290IjoiIn0=