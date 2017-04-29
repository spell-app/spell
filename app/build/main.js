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

			return "@proto\n" + (plural + " = " + values + "\n") + ("get " + identifier + "() { return (\"__" + identifier + "\" in this ? this.__" + identifier + " : " + firstValue + ") }\n") + ("set " + identifier + "(value) { if (this." + plural + ".includes(value)) this.__" + identifier + " = value }");

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgYjZhZjI0ZGY0M2NkMjg5NTdmMmUiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGVTeW50YXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2lmLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy90eXBlcy5qcyIsIndlYnBhY2s6Ly8vKHdlYnBhY2spL2J1aWxkaW4vZ2xvYmFsLmpzIiwid2VicGFjazovLy8uL3NyYy9nbG9iYWwuanMiXSwibmFtZXMiOlsicGFyc2VyIiwid2luZG93IiwiT2JqZWN0IiwiYXNzaWduIiwicGFyc2VSdWxlU3ludGF4Iiwic3ludGF4IiwiU2VxdWVuY2VDb25zdHJ1Y3RvciIsIlNlcXVlbmNlIiwic3ludGF4U3RyZWFtIiwidG9rZW5pc2VSdWxlU3ludGF4IiwicnVsZXMiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwicnVsZSIsImxlbmd0aCIsIlNZTlRBWF9FWFBSRVNTSU9OIiwibWF0Y2giLCJTeW50YXhFcnJvciIsInN0YXJ0SW5kZXgiLCJsYXN0SW5kZXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJlbmRJbmRleCIsImxhc3QiLCJTeW1ib2wiLCJwb3AiLCJtZXJnZVN5bWJvbHMiLCJLZXl3b3JkIiwibWVyZ2VLZXl3b3JkcyIsInB1c2giLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zeW1ib2wiLCJwYXJzZVJ1bGVTeW50YXhfc3VicnVsZSIsInBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyIsInBhcnNlUnVsZVN5bnRheF9saXN0IiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsIktFWVdPUkRfUEFUVEVSTiIsInBhcnNlUnVsZVN5bnRheF9rZXl3b3JkIiwiY29uc3RydWN0b3IiLCJ3b3JkcyIsImkiLCJuZXh0Iiwic3RyaW5nIiwiam9pbiIsInN0YXJ0c1dpdGgiLCJzdWJzdHIiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJzbGljZSIsImFyZ3VtZW50IiwiYWx0ZXJuYXRpdmVzIiwiZ3JvdXBBbHRlcm5hdGl2ZXMiLCJtYXAiLCJncm91cCIsInJlc3VsdHMiLCJBbHRlcm5hdGl2ZXMiLCJ0b2tlbnMiLCJjdXJyZW50IiwidG9rZW4iLCJjb25jYXQiLCJzeW1ib2wiLCJSZXBlYXQiLCJvcHRpb25hbCIsInVuZGVmaW5lZCIsInBhcmFtcyIsImJhbmdQb3NpdGlvbiIsImluZGV4T2YiLCJub3QiLCJTdWJydWxlIiwiTGlzdCIsIml0ZW0iLCJkZWxpbWl0ZXIiLCJkZWZpbmVQcm9wZXJ0aWVzIiwicHJvdG90eXBlIiwiYWRkU2VxdWVuY2UiLCJ2YWx1ZSIsIm5hbWUiLCJydWxlU3ludGF4IiwicHJvcGVydGllcyIsImRlYnVnIiwiY29uc29sZSIsImxvZyIsImFkZFJ1bGUiLCJlIiwiZXJyb3IiLCJhZGRTdGF0ZW1lbnQiLCJTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiRXhwcmVzc2lvbiIsImFkZExpc3QiLCJzdHJlYW0iLCJhZGRLZXl3b3JkIiwiYWRkU3ltYm9sIiwiYWRkUG9zdGZpeE9wZXJhdG9yIiwiQXJyYXkiLCJpc0FycmF5IiwiZm9yRWFjaCIsInRvSlMiLCJUeXBlRXJyb3IiLCJfX3Bvc3RmaXhPcGVyYXRvcnMiLCJwb3N0Zml4T3BlcmF0b3JzIiwiUnVsZSIsImhhc093blByb3BlcnR5IiwiY2xvbmUiLCJjcmVhdGUiLCJwcm9wcyIsImFkdmFuY2VUbyIsInN0YWNrIiwiY29udGV4dCIsIm1hdGNoZWQiLCJuZXh0UnVsZSIsIm5leHRTdHJlYW0iLCJQYXR0ZXJuIiwicGF0dGVybiIsImRlZmluZVByb3BlcnR5IiwiUmVnRXhwIiwic291cmNlIiwic3RhcnRQYXR0ZXJuIiwiYmxhY2tsaXN0IiwibWF0Y2hlZFRleHQiLCJyYW5nZSIsImluZGV4Iiwid29yZCIsIlJlZ0V4cEZyb21TdHJpbmciLCJmaXJzdCIsInNlY29uZCIsInBhdHRlcm5TdHJpbmciLCJlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzIiwiZ2V0UnVsZU9yRGllIiwicGFyc2UiLCJpc0RldGVybWluaXN0aWMiLCJ0ZXN0IiwiTmVzdGVkIiwiZXZlcnkiLCJ0ZXN0UnVsZSIsImxlZnRSZWN1cnNpdmUiLCJzdGFja0NvbnRhaW5zIiwiY2h1bmtpdCIsInBhcnNlSW5DaHVua3MiLCJlYXRXaGl0ZXNwYWNlIiwiYXJnTmFtZSIsInJ1bGVOYW1lIiwiYmVzdE1hdGNoIiwibWF0Y2hlcyIsImdldEJlc3RNYXRjaCIsInJlZHVjZSIsImJlc3QiLCJ0b1NvdXJjZSIsImluY2x1ZGVzIiwiZ3JvdXBFbmQiLCJQYXJzZXIiLCJwcm9wZXJ0eU5hbWUiLCJnZXRSdWxlIiwiYXJndW1lbnRzIiwiY29tcGlsZVN0YXRlbWVudHMiLCJyZXN1bHQiLCJzdGF0ZW1lbnRzIiwidGltZSIsImN1cnJlbnRJbmRlbnQiLCJ0YWJzIiwic3BsaXQiLCJzdGF0ZW1lbnQiLCJ0cmltIiwibGluZVN0YXJ0IiwibGluZUluZGVudCIsImluZGVudGVkU3RhcnQiLCJjbG9zZXJzIiwibGFzdEJsYW5rTGluZSIsIl9nZXRMYXN0QmxhbmtMaW5lIiwic3BsaWNlIiwibGluZSIsIndhcm4iLCJ0aW1lRW5kIiwid2hpdGVzcGFjZSIsImFkdmFuY2VCeSIsImV4aXN0aW5nIiwicnVsZUlzTGVmdFJlY3Vyc2l2ZSIsInN1YnJ1bGUiLCJzdGFydFRva2VuIiwiZW5kVG9rZW4iLCJuZXN0aW5nIiwibmVzdGVkIiwiY2hhciIsImxpc3QiLCJSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTIiwiZmxhZ3MiLCJERUJVRyIsImNoYXJzIiwiV2hpdGVzcGFjZSIsIldvcmQiLCJyZXBsYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJhZGRUb0JsYWNrbGlzdCIsIlR5cGUiLCJ0eXBlIiwiTnVtYmVyIiwibnVtYmVyIiwicGFyc2VGbG9hdCIsIkludGVnZXIiLCJwYXJzZUludCIsIlRleHQiLCJ0ZXh0IiwiQm9vbGVhbiIsImJvb2wiLCJleHByZXNzaW9uIiwiZW5kc1dpdGgiLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJhcmciLCJoZWFkIiwic3Vic3RyaW5nIiwibWVtb2l6ZWQiLCJkZWZpbmVNZW1vaXplZCIsInByb3BlcnR5IiwiZ2V0dGVyIiwiYXBwbHkiLCJjb25maWd1cmFibGUiLCJnZXQiLCJlbHNlUGhyYXNlIiwiZWxzZVN0YXRlbWVudCIsImluZGV4X2V4cHJlc3Npb24iLCJvcmRpbmFsIiwiaW5maXhfb3BlcmF0b3IiLCJwcmVjZWRlbmNlIiwiYSIsImIiLCJ0aGluZyIsImxocyIsInJocyIsIm9wZXJhdG9yIiwiYXNzaWdubWVudCIsIm1lc3NhZ2UiLCJidXR0b25DbGF1c2UiLCJidXR0b25OYW1lIiwib2tCdXR0b24iLCJjYW5jZWxCdXR0b24iLCJjYW5jZWxDbGF1c2UiLCJwbHVyYWxpemUiLCJwcm9wIiwia2V5IiwicHJvcHNfY2xhdXNlIiwibmV3X3RoaW5nIiwiZXh0ZW5kc19jbGF1c2UiLCJzdXBlclR5cGUiLCJhcmdOYW1lcyIsImFyZ3MiLCJhcmdzX2NsYXVzZSIsIndvcmRfY2xhdXNlIiwidHlwZXMiLCJ0b0xvd2VyQ2FzZSIsIm1ldGhvZE5hbWUiLCJjb25kaXRpb25zIiwic2NvcGUiLCJ2YWx1ZV9jbGF1c2UiLCJkZWNsYXJhdGlvbiIsInBsdXJhbCIsInZhbHVlcyIsImdldEl0ZW0iLCJmaXJzdFZhbHVlIiwibWUiLCJJIiwicmV2ZXJzZSIsImdsb2JhbF9pZGVudGlmaWVyIiwiZ2xvYmFsIiwic2VsZiJdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLG1EQUEyQyxjQUFjOztBQUV6RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDN0RBOzs7O0FBQ0E7Ozs7OztBQUVBO0FBTkE7QUFDQTtBQUNBO0FBS0EsSUFBTUEsU0FBUyxzQkFBZjtrQkFDZUEsTTs7QUFFZjs7QUFDQUMsT0FBT0QsTUFBUCxHQUFnQkEsTUFBaEIsQzs7Ozs7Ozs7Ozs7Ozs7O0FDWEE7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUE7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQUUsT0FBT0MsTUFBUCxpQkFBb0I7O0FBRXBCO0FBQ0E7QUFDQTs7QUFFQTtBQUNDQyxnQkFQbUIsMkJBT0hDLE1BUEcsRUFPMEM7QUFBQSxNQUFyQ0MsbUJBQXFDLHVFQUFmLGVBQUtDLFFBQVU7O0FBQzVELE1BQUlDLGVBQWUsZUFBS0Msa0JBQUwsQ0FBd0JKLE1BQXhCLENBQW5CO0FBQ0EsTUFBSUssUUFBUSxlQUFLQyxzQkFBTCxDQUE0QkgsWUFBNUIsRUFBMEMsRUFBMUMsQ0FBWjs7QUFFQSxNQUFJSSxhQUFKO0FBQ0E7QUFDQSxNQUFJRixNQUFNRyxNQUFOLEtBQWlCLENBQXJCLEVBQXdCO0FBQ3ZCRCxVQUFPRixNQUFNLENBQU4sQ0FBUDtBQUNBLEdBRkQsTUFHSztBQUNKRSxVQUFPLElBQUlOLG1CQUFKLENBQXdCLEVBQUVJLFlBQUYsRUFBeEIsQ0FBUDtBQUNBOztBQUVELFNBQU9FLElBQVA7QUFDQSxFQXJCa0I7QUF1Qm5CSCxtQkF2Qm1CLDhCQXVCQUosTUF2QkEsRUF1QlE7QUFDMUIsTUFBTVMsb0JBQW9CLDBDQUExQjtBQUNBLE1BQUlOLGVBQWVILE9BQU9VLEtBQVAsQ0FBYUQsaUJBQWIsQ0FBbkI7QUFDQSxNQUFJLENBQUNOLFlBQUwsRUFBbUIsTUFBTSxJQUFJUSxXQUFKLHlDQUFzRFgsTUFBdEQsUUFBTjtBQUNuQixTQUFPRyxZQUFQO0FBQ0EsRUE1QmtCO0FBOEJuQkcsdUJBOUJtQixrQ0E4QklILFlBOUJKLEVBOEI4QztBQUFBLE1BQTVCRSxLQUE0Qix1RUFBcEIsRUFBb0I7QUFBQSxNQUFoQk8sVUFBZ0IsdUVBQUgsQ0FBRzs7QUFDaEUsTUFBSUMsWUFBWVYsYUFBYUssTUFBN0I7QUFDQSxTQUFPSSxhQUFhQyxTQUFwQixFQUErQjtBQUFBLCtCQUNMLGVBQUtDLHFCQUFMLENBQTJCWCxZQUEzQixFQUF5Q0UsS0FBekMsRUFBZ0RPLFVBQWhELENBREs7QUFBQTtBQUFBLE9BQ3hCTCxJQUR3QjtBQUFBLE9BQ2xCUSxRQURrQjs7QUFFOUIsT0FBSVIsSUFBSixFQUFVO0FBQ1QsUUFBSVMsT0FBT1gsTUFBTUEsTUFBTUcsTUFBTixHQUFhLENBQW5CLENBQVg7QUFDQTtBQUNBLFFBQUlRLFFBQVFBLGdCQUFnQixlQUFLQyxNQUE3QixJQUF1Q1YsZ0JBQWdCLGVBQUtVLE1BQWhFLEVBQXdFO0FBQ3ZFO0FBQ0FaLFdBQU1hLEdBQU47QUFDQTtBQUNBWCxZQUFPLGVBQUtZLFlBQUwsQ0FBa0JILElBQWxCLEVBQXdCVCxJQUF4QixDQUFQO0FBQ0E7QUFDRDtBQU5BLFNBT0ssSUFBSVMsUUFBUUEsZ0JBQWdCLGVBQUtJLE9BQTdCLElBQXdDYixnQkFBZ0IsZUFBS2EsT0FBakUsRUFBMEU7QUFDOUU7QUFDQWYsWUFBTWEsR0FBTjtBQUNBO0FBQ0FYLGFBQU8sZUFBS2MsYUFBTCxDQUFtQkwsSUFBbkIsRUFBeUJULElBQXpCLENBQVA7QUFDQTtBQUNERixVQUFNaUIsSUFBTixDQUFXZixJQUFYO0FBQ0E7QUFDREssZ0JBQWFHLFdBQVcsQ0FBeEI7QUFDQTtBQUNELFNBQU9WLEtBQVA7QUFDQSxFQXZEa0I7QUF5RG5CUyxzQkF6RG1CLGlDQXlER1gsWUF6REgsRUF5RDZDO0FBQUEsTUFBNUJFLEtBQTRCLHVFQUFwQixFQUFvQjtBQUFBLE1BQWhCTyxVQUFnQix1RUFBSCxDQUFHOztBQUMvRCxNQUFJVyxjQUFjcEIsYUFBYVMsVUFBYixDQUFsQjs7QUFFQTtBQUNBO0FBQ0EsTUFBSVcsZ0JBQWdCLElBQXBCLEVBQTBCO0FBQ3pCLFVBQU8sZUFBS0Msc0JBQUwsQ0FBNEJyQixZQUE1QixFQUEwQ0UsS0FBMUMsRUFBaURPLGFBQWEsQ0FBOUQsQ0FBUDtBQUNBOztBQUVELFVBQVFXLFdBQVI7QUFDQyxRQUFLLEdBQUw7QUFBVSxXQUFPLGVBQUtFLHVCQUFMLENBQTZCdEIsWUFBN0IsRUFBMkNFLEtBQTNDLEVBQWtETyxVQUFsRCxDQUFQO0FBQ1YsUUFBSyxHQUFMO0FBQVUsV0FBTyxlQUFLYywyQkFBTCxDQUFpQ3ZCLFlBQWpDLEVBQStDRSxLQUEvQyxFQUFzRE8sVUFBdEQsQ0FBUDtBQUNWLFFBQUssR0FBTDtBQUFVLFdBQU8sZUFBS2Usb0JBQUwsQ0FBMEJ4QixZQUExQixFQUF3Q0UsS0FBeEMsRUFBK0NPLFVBQS9DLENBQVA7QUFDVixRQUFLLEdBQUw7QUFDQSxRQUFLLEdBQUw7QUFDQSxRQUFLLEdBQUw7QUFBVSxXQUFPLGVBQUtnQixzQkFBTCxDQUE0QnpCLFlBQTVCLEVBQTBDRSxLQUExQyxFQUFpRE8sVUFBakQsQ0FBUDs7QUFFVjtBQUNBLFFBQUssR0FBTDtBQUNBLFFBQUssR0FBTDtBQUNBLFFBQUssR0FBTDtBQUNBLFFBQUssR0FBTDtBQUNDLFVBQU0sSUFBSUQsV0FBSixpQkFBOEJZLFdBQTlCLHVCQUEyRFgsVUFBM0QsWUFBNEUsS0FBS1osTUFBakYsQ0FBTjs7QUFFRDtBQUNDLFFBQUl1QixZQUFZYixLQUFaLENBQWtCLGVBQUttQixlQUF2QixDQUFKLEVBQTZDO0FBQzVDLFlBQU8sZUFBS0MsdUJBQUwsQ0FBNkIzQixZQUE3QixFQUEyQ0UsS0FBM0MsRUFBa0RPLFVBQWxELENBQVA7QUFDQSxLQUZELE1BR0s7QUFDSixZQUFPLGVBQUtZLHNCQUFMLENBQTRCckIsWUFBNUIsRUFBMENFLEtBQTFDLEVBQWlETyxVQUFqRCxDQUFQO0FBQ0E7QUFyQkg7QUF1QkEsRUF6RmtCOzs7QUEyRm5CaUIsa0JBQWtCLFdBM0ZDOztBQTZGbkI7QUFDQTtBQUNBO0FBQ0FDLHdCQWhHbUIsbUNBZ0dLM0IsWUFoR0wsRUFnRzREO0FBQUEsTUFBekNFLEtBQXlDLHVFQUFqQyxFQUFpQztBQUFBLE1BQTdCTyxVQUE2Qix1RUFBaEIsQ0FBZ0I7QUFBQSxNQUFibUIsV0FBYTs7QUFDOUUsTUFBSUMsUUFBUSxFQUFaO0FBQUEsTUFBZ0JqQixpQkFBaEI7QUFDQSxPQUFLLElBQUlrQixJQUFJckIsVUFBYixFQUF5QnFCLElBQUk5QixhQUFhSyxNQUExQyxFQUFrRHlCLEdBQWxELEVBQXVEO0FBQ3RELE9BQUlDLE9BQU8vQixhQUFhOEIsQ0FBYixDQUFYO0FBQ0EsT0FBSUMsS0FBS3hCLEtBQUwsQ0FBVyxlQUFLbUIsZUFBaEIsQ0FBSixFQUFzQztBQUNyQ0csVUFBTVYsSUFBTixDQUFXWSxJQUFYO0FBQ0FuQixlQUFXa0IsQ0FBWDtBQUNBLElBSEQsTUFJSztBQUNMOztBQUVELE1BQUksQ0FBQ0YsV0FBTCxFQUFrQkEsY0FBYyxlQUFLWCxPQUFuQjtBQUNsQixNQUFJYixPQUFPLElBQUl3QixXQUFKLENBQWdCLEVBQUVJLFFBQVFILE1BQU1JLElBQU4sQ0FBVyxHQUFYLENBQVYsRUFBaEIsQ0FBWDs7QUFFQSxTQUFPLENBQUU3QixJQUFGLEVBQVFRLFFBQVIsQ0FBUDtBQUNBLEVBL0drQjs7O0FBaUhuQjtBQUNBO0FBQ0E7QUFDQVMsdUJBcEhtQixrQ0FvSElyQixZQXBISixFQW9IeUU7QUFBQSxNQUF2REUsS0FBdUQsdUVBQS9DLEVBQStDO0FBQUEsTUFBM0NPLFVBQTJDLHVFQUE5QixDQUE4QjtBQUFBLE1BQTNCbUIsV0FBMkIsdUVBQWIsZUFBS2QsTUFBUTs7QUFDM0YsTUFBSWtCLFNBQVNoQyxhQUFhUyxVQUFiLENBQWI7QUFDQSxNQUFJLENBQUNtQixXQUFMLEVBQWtCQSxjQUFjLGVBQUtkLE1BQW5CO0FBQ2xCLE1BQUlWLE9BQU8sSUFBSXdCLFdBQUosQ0FBZ0IsRUFBRUksUUFBUUEsTUFBVixFQUFoQixDQUFYOztBQUVBO0FBQ0EsTUFBSUEsT0FBT0UsVUFBUCxDQUFrQixJQUFsQixDQUFKLEVBQTZCO0FBQzVCO0FBQ0E5QixRQUFLNEIsTUFBTCxHQUFjNUIsS0FBSzRCLE1BQUwsQ0FBWUcsTUFBWixDQUFtQixDQUFuQixDQUFkO0FBQ0E7QUFDQS9CLFFBQUtnQyxRQUFMLEdBQWdCO0FBQUEsV0FBTUosTUFBTjtBQUFBLElBQWhCO0FBQ0E7QUFDRCxTQUFPLENBQUU1QixJQUFGLEVBQVFLLFVBQVIsQ0FBUDtBQUNBLEVBaklrQjs7O0FBb0luQjtBQUNBO0FBQ0E7QUFDQTtBQUNBYyw0QkF4SW1CLHVDQXdJU3ZCLFlBeElULEVBd0ltRDtBQUFBLE1BQTVCRSxLQUE0Qix1RUFBcEIsRUFBb0I7QUFBQSxNQUFoQk8sVUFBZ0IsdUVBQUgsQ0FBRzs7QUFBQSw4QkFDM0MsaUJBQU80QixnQkFBUCxDQUF3QnJDLFlBQXhCLEVBQXNDLEdBQXRDLEVBQTJDLEdBQTNDLEVBQWdEUyxVQUFoRCxDQUQyQztBQUFBLE1BQy9ERyxRQUQrRCx5QkFDL0RBLFFBRCtEO0FBQUEsTUFDckQwQixLQURxRCx5QkFDckRBLEtBRHFEOztBQUdyRTs7O0FBQ0EsTUFBSUMsaUJBQUo7QUFDQSxNQUFJRCxNQUFNakMsTUFBTixHQUFlLENBQWYsSUFBb0JpQyxNQUFNLENBQU4sTUFBYSxHQUFyQyxFQUEwQztBQUN6Q0MsY0FBV0QsTUFBTSxDQUFOLENBQVg7QUFDQUEsV0FBUUEsTUFBTUEsS0FBTixDQUFZLENBQVosQ0FBUjtBQUNBOztBQUVEO0FBQ0EsTUFBSUUsZUFDSEMsa0JBQWtCSCxLQUFsQixFQUNDSSxHQURELENBQ0ssVUFBU0MsS0FBVCxFQUFnQjtBQUNwQixPQUFJQyxVQUFVLGVBQUt6QyxzQkFBTCxDQUE0QndDLEtBQTVCLEVBQW1DLEVBQW5DLENBQWQ7QUFDQSxPQUFJQyxRQUFRdkMsTUFBUixLQUFtQixDQUF2QixFQUEwQjtBQUN6QixXQUFPdUMsUUFBUSxDQUFSLENBQVA7QUFDQSxJQUZELE1BR0s7QUFDSixXQUFPLElBQUksZUFBSzdDLFFBQVQsQ0FBa0IsRUFBRUcsT0FBTzBDLE9BQVQsRUFBbEIsQ0FBUDtBQUNBO0FBQ0QsR0FURCxDQUREOztBQVlBLE1BQUl4QyxPQUFPb0MsYUFBYW5DLE1BQWIsS0FBd0IsQ0FBeEIsR0FBNEJtQyxhQUFhLENBQWIsQ0FBNUIsR0FBOEMsSUFBSSxlQUFLSyxZQUFULENBQXNCLEVBQUUzQyxPQUFPc0MsWUFBVCxFQUF0QixDQUF6RDtBQUNBLE1BQUlELFFBQUosRUFBY25DLEtBQUttQyxRQUFMLEdBQWdCQSxRQUFoQjtBQUNkLFNBQU8sQ0FBRW5DLElBQUYsRUFBUVEsUUFBUixDQUFQOztBQUVBLFdBQVM2QixpQkFBVCxDQUEyQkssTUFBM0IsRUFBbUM7QUFDbEMsT0FBSU4sZUFBZSxFQUFuQjtBQUNBLE9BQUlPLFVBQVUsRUFBZDtBQUNBLFFBQUssSUFBSWpCLElBQUksQ0FBUixFQUFXa0IsS0FBaEIsRUFBdUJBLFFBQVFGLE9BQU9oQixDQUFQLENBQS9CLEVBQTBDQSxHQUExQyxFQUErQztBQUM5QztBQUNBLFFBQUlrQixVQUFVLEdBQWQsRUFBbUI7QUFDbEJSLGtCQUFhckIsSUFBYixDQUFrQjRCLE9BQWxCO0FBQ0FBLGVBQVUsRUFBVjtBQUNBO0FBQ0Q7QUFKQSxTQUtLLElBQUlDLFVBQVUsR0FBZCxFQUFtQjtBQUFBLG1DQUNKLGlCQUFPWCxnQkFBUCxDQUF3QlMsTUFBeEIsRUFBZ0MsR0FBaEMsRUFBcUMsR0FBckMsRUFBMENoQixDQUExQyxDQURJO0FBQUEsVUFDakJsQixTQURpQiwwQkFDakJBLFFBRGlCOztBQUV2Qm1DLGdCQUFVQSxRQUFRRSxNQUFSLENBQWVILE9BQU9SLEtBQVAsQ0FBYVIsQ0FBYixFQUFnQmxCLFlBQVcsQ0FBM0IsQ0FBZixDQUFWO0FBQ0FrQixVQUFJbEIsU0FBSjtBQUNBLE1BSkksTUFLQTtBQUNKbUMsY0FBUTVCLElBQVIsQ0FBYTZCLEtBQWI7QUFDQTtBQUNEO0FBQ0QsT0FBSUQsUUFBUTFDLE1BQVosRUFBb0JtQyxhQUFhckIsSUFBYixDQUFrQjRCLE9BQWxCO0FBQ3BCLFVBQU9QLFlBQVA7QUFDQTtBQUNELEVBekxrQjs7O0FBMkxuQjtBQUNBZix1QkE1TG1CLGtDQTRMSXpCLFlBNUxKLEVBNEw4QztBQUFBLE1BQTVCRSxLQUE0Qix1RUFBcEIsRUFBb0I7QUFBQSxNQUFoQk8sVUFBZ0IsdUVBQUgsQ0FBRzs7QUFDaEUsTUFBSXlDLFNBQVNsRCxhQUFhUyxVQUFiLENBQWI7QUFDQSxNQUFJTCxPQUFPRixNQUFNQSxNQUFNRyxNQUFOLEdBQWUsQ0FBckIsQ0FBWDtBQUNBLE1BQUksQ0FBQ0QsSUFBTCxFQUFXLE1BQU0sSUFBSUksV0FBSixpQ0FBOEMwQyxNQUE5QyxxQkFBTjs7QUFFWDtBQUNBLE1BQUlBLFdBQVcsR0FBWCxJQUFrQkEsV0FBVyxHQUFqQyxFQUFzQztBQUNyQyxPQUFJWCxXQUFXbkMsS0FBS21DLFFBQXBCO0FBQ0FuQyxVQUFPLElBQUksZUFBSytDLE1BQVQsQ0FBZ0IsRUFBRS9DLFVBQUYsRUFBaEIsQ0FBUDtBQUNBLE9BQUltQyxRQUFKLEVBQWNuQyxLQUFLbUMsUUFBTCxHQUFnQkEsUUFBaEI7QUFDZDtBQUNBckMsU0FBTUEsTUFBTUcsTUFBTixHQUFlLENBQXJCLElBQTBCRCxJQUExQjtBQUNBOztBQUVEO0FBQ0EsTUFBSThDLFdBQVcsR0FBWCxJQUFrQkEsV0FBVyxHQUFqQyxFQUFzQztBQUNyQzlDLFFBQUtnRCxRQUFMLEdBQWdCLElBQWhCO0FBQ0E7O0FBRUQsU0FBTyxDQUFFQyxTQUFGLEVBQWE1QyxVQUFiLENBQVA7QUFDQSxFQWhOa0I7OztBQWtObkI7QUFDQTtBQUNBO0FBQ0FhLHdCQXJObUIsbUNBcU5LdEIsWUFyTkwsRUFxTitDO0FBQUEsTUFBNUJFLEtBQTRCLHVFQUFwQixFQUFvQjtBQUFBLE1BQWhCTyxVQUFnQix1RUFBSCxDQUFHOztBQUNqRSxNQUFJRixRQUFRLGlCQUFPOEIsZ0JBQVAsQ0FBd0JyQyxZQUF4QixFQUFzQyxHQUF0QyxFQUEyQyxHQUEzQyxFQUFnRFMsVUFBaEQsQ0FBWjtBQUNBLE1BQUk4QixpQkFBSjtBQUNBLE1BQUloQyxNQUFNK0IsS0FBTixDQUFZakMsTUFBWixLQUF1QixDQUF2QixJQUE0QkUsTUFBTStCLEtBQU4sQ0FBWSxDQUFaLE1BQW1CLEdBQW5ELEVBQXdEO0FBQ3ZEQyxjQUFXaEMsTUFBTStCLEtBQU4sQ0FBWSxDQUFaLENBQVg7QUFDQS9CLFNBQU0rQixLQUFOLEdBQWMvQixNQUFNK0IsS0FBTixDQUFZQSxLQUFaLENBQWtCLENBQWxCLENBQWQ7QUFDQTtBQUNELE1BQUkvQixNQUFNK0IsS0FBTixDQUFZakMsTUFBWixHQUFxQixDQUF6QixFQUE0QixNQUFNLElBQUlHLFdBQUoseURBQXNFRCxNQUFNK0IsS0FBTixDQUFZTCxJQUFaLENBQWlCLEVBQWpCLENBQXRFLE9BQU47O0FBRTVCLE1BQUlxQixTQUFTLEVBQUVsRCxNQUFNRyxNQUFNK0IsS0FBTixDQUFZLENBQVosQ0FBUixFQUFiOztBQUVBO0FBQ0EsTUFBSWlCLGVBQWVELE9BQU9sRCxJQUFQLENBQVlvRCxPQUFaLENBQW9CLEdBQXBCLENBQW5CO0FBQ0EsTUFBSUQsaUJBQWlCLENBQUMsQ0FBdEIsRUFBeUI7QUFDeEJELFVBQU9HLEdBQVAsR0FBYUgsT0FBT2xELElBQVAsQ0FBWStCLE1BQVosQ0FBbUJvQixlQUFlLENBQWxDLENBQWIsQ0FEd0IsQ0FDMkI7QUFDbkRELFVBQU9sRCxJQUFQLEdBQWNrRCxPQUFPbEQsSUFBUCxDQUFZK0IsTUFBWixDQUFtQixDQUFuQixFQUFzQm9CLFlBQXRCLENBQWQ7QUFDQTs7QUFFRCxNQUFJbkQsT0FBTyxJQUFJLGVBQUtzRCxPQUFULENBQWlCSixNQUFqQixDQUFYO0FBQ0EsTUFBSWYsUUFBSixFQUFjbkMsS0FBS21DLFFBQUwsR0FBZ0JBLFFBQWhCO0FBQ2QsU0FBTyxDQUFFbkMsSUFBRixFQUFRRyxNQUFNSyxRQUFkLENBQVA7QUFDQSxFQTFPa0I7OztBQTRPbkI7QUFDQTtBQUNBO0FBQ0FZLHFCQS9PbUIsZ0NBK09FeEIsWUEvT0YsRUErT3FFO0FBQUEsTUFBckRFLEtBQXFELHVFQUE3QyxFQUE2QztBQUFBLE1BQXpDTyxVQUF5Qyx1RUFBNUIsQ0FBNEI7QUFBQSxNQUF6Qm1CLFdBQXlCLHVFQUFYLGVBQUsrQixJQUFNOztBQUFBLCtCQUM3RCxpQkFBT3RCLGdCQUFQLENBQXdCckMsWUFBeEIsRUFBc0MsR0FBdEMsRUFBMkMsR0FBM0MsRUFBZ0RTLFVBQWhELENBRDZEO0FBQUEsTUFDakZHLFFBRGlGLDBCQUNqRkEsUUFEaUY7QUFBQSxNQUN2RTBCLEtBRHVFLDBCQUN2RUEsS0FEdUU7O0FBR3ZGLE1BQUlDLGlCQUFKO0FBQ0EsTUFBSUQsTUFBTWpDLE1BQU4sR0FBZSxDQUFmLElBQW9CaUMsTUFBTSxDQUFOLE1BQWEsR0FBckMsRUFBMEM7QUFDekNDLGNBQVdELE1BQU0sQ0FBTixDQUFYO0FBQ0FBLFdBQVFBLE1BQU1BLEtBQU4sQ0FBWSxDQUFaLENBQVI7QUFDQTs7QUFFRCxNQUFJTSxVQUFVLGVBQUt6QyxzQkFBTCxDQUE0Qm1DLEtBQTVCLEVBQW1DLEVBQW5DLENBQWQ7QUFDQSxNQUFJTSxRQUFRdkMsTUFBUixLQUFtQixDQUF2QixFQUEwQjtBQUN6QixTQUFNLElBQUlHLFdBQUosd0NBQXFEOEIsTUFBTUwsSUFBTixDQUFXLEdBQVgsQ0FBckQsT0FBTjtBQUNBOztBQVpzRixnQ0FhN0RXLE9BYjZEO0FBQUEsTUFhakZnQixJQWJpRjtBQUFBLE1BYTNFQyxTQWIyRTs7QUFldkYsTUFBSXpELE9BQU8sSUFBSXdCLFdBQUosQ0FBZ0IsRUFBRWdDLFVBQUYsRUFBUUMsb0JBQVIsRUFBaEIsQ0FBWDtBQUNBLE1BQUl0QixRQUFKLEVBQWNuQyxLQUFLbUMsUUFBTCxHQUFnQkEsUUFBaEI7QUFDZCxTQUFPLENBQUVuQyxJQUFGLEVBQVFRLFFBQVIsQ0FBUDtBQUNBO0FBalFrQixDQUFwQjs7QUF1UUE7QUFDQWxCLE9BQU9vRSxnQkFBUCxDQUF3QixpQkFBT0MsU0FBL0IsRUFBMEM7O0FBRXpDO0FBQ0E7QUFDQTtBQUNBQyxjQUFhLEVBQUVDLE9BQU8sZUFBU0MsSUFBVCxFQUFlQyxVQUFmLEVBQW9FO0FBQUEsT0FBekN2QyxXQUF5Qyx1RUFBM0IsZUFBSzdCLFFBQXNCO0FBQUEsT0FBWnFFLFVBQVk7O0FBQ3pGLE9BQUksT0FBT3hDLFdBQVAsS0FBdUIsVUFBM0IsRUFBdUM7QUFDdEN3QyxpQkFBYXhDLFdBQWI7QUFDQUEsa0JBQWMsZUFBSzdCLFFBQW5CO0FBQ0E7QUFDRCxPQUFJO0FBQ0gsUUFBSUssT0FBTyxlQUFLUixlQUFMLENBQXFCdUUsVUFBckIsRUFBaUN2QyxXQUFqQyxDQUFYO0FBQ0E7QUFDQSxRQUFJLGlCQUFPeUMsS0FBWCxFQUFrQkMsUUFBUUMsR0FBUixrQkFBMkJMLElBQTNCLHFCQUErQ0MsVUFBL0Msb0JBQXdFL0QsSUFBeEU7O0FBRXJCO0FBQ0csUUFBSWdFLFVBQUosRUFBZ0IxRSxPQUFPQyxNQUFQLENBQWNTLElBQWQsRUFBb0JnRSxVQUFwQjtBQUNoQixXQUFPLEtBQUtJLE9BQUwsQ0FBYU4sSUFBYixFQUFtQjlELElBQW5CLENBQVA7QUFDQSxJQVJELENBUUUsT0FBT3FFLENBQVAsRUFBVTtBQUNYSCxZQUFRM0IsS0FBUixxQ0FBZ0R1QixJQUFoRDtBQUNBSSxZQUFRQyxHQUFSLGNBQXVCSixVQUF2QjtBQUNBRyxZQUFRSSxLQUFSLENBQWNELENBQWQ7QUFDQTtBQUNELEdBbEJZLEVBTDRCOztBQXlCekNFLGVBQWMsRUFBRVYsT0FBTyxlQUFTQyxJQUFULEVBQWVDLFVBQWYsRUFBcUU7QUFBQSxPQUExQ3ZDLFdBQTBDLHVFQUE1QixlQUFLZ0QsU0FBdUI7QUFBQSxPQUFaUixVQUFZOztBQUMzRixPQUFJaEUsT0FBTyxLQUFLNEQsV0FBTCxDQUFpQkUsSUFBakIsRUFBdUJDLFVBQXZCLEVBQW1DdkMsV0FBbkMsRUFBZ0R3QyxVQUFoRCxDQUFYO0FBQ0EsT0FBSWhFLElBQUosRUFBVSxPQUFPLEtBQUtvRSxPQUFMLENBQWEsV0FBYixFQUEwQnBFLElBQTFCLENBQVA7QUFDVixHQUhhLEVBekIyQjs7QUE4QnpDeUUsZ0JBQWUsRUFBRVosT0FBTyxlQUFTQyxJQUFULEVBQWVDLFVBQWYsRUFBc0U7QUFBQSxPQUEzQ3ZDLFdBQTJDLHVFQUE3QixlQUFLa0QsVUFBd0I7QUFBQSxPQUFaVixVQUFZOztBQUM3RixPQUFJaEUsT0FBTyxLQUFLNEQsV0FBTCxDQUFpQkUsSUFBakIsRUFBdUJDLFVBQXZCLEVBQW1DdkMsV0FBbkMsRUFBZ0R3QyxVQUFoRCxDQUFYO0FBQ0EsT0FBSWhFLElBQUosRUFBVSxPQUFPLEtBQUtvRSxPQUFMLENBQWEsWUFBYixFQUEyQnBFLElBQTNCLENBQVA7QUFDVixHQUhjLEVBOUIwQjs7QUFtQ3pDMkUsVUFBUyxFQUFFZCxPQUFPLGVBQVNDLElBQVQsRUFBZUMsVUFBZixFQUFnRTtBQUFBLE9BQXJDdkMsV0FBcUMsdUVBQXZCLGVBQUsrQixJQUFrQjtBQUFBLE9BQVpTLFVBQVk7O0FBQ2pGLE9BQUlZLFNBQVMsZUFBSy9FLGtCQUFMLENBQXdCa0UsVUFBeEIsQ0FBYjtBQUNBLE9BQUkvRCxPQUFPLENBQUMsZUFBS29CLG9CQUFMLENBQTBCd0QsTUFBMUIsRUFBa0MsRUFBbEMsRUFBc0MsQ0FBdEMsRUFBeUNwRCxXQUF6QyxLQUF5RCxFQUExRCxFQUE4RCxDQUE5RCxDQUFYO0FBQ0EsT0FBSSxDQUFDeEIsSUFBTCxFQUFXO0FBQ1gsT0FBSWdFLFVBQUosRUFBZ0IxRSxPQUFPQyxNQUFQLENBQWNTLElBQWQsRUFBb0JnRSxVQUFwQjtBQUNoQixVQUFPLEtBQUtJLE9BQUwsQ0FBYU4sSUFBYixFQUFtQjlELElBQW5CLENBQVA7QUFDQSxHQU5RLEVBbkNnQzs7QUEyQ3pDNkUsYUFBWSxFQUFFaEIsT0FBTyxlQUFTQyxJQUFULEVBQWVDLFVBQWYsRUFBbUU7QUFBQSxPQUF4Q3ZDLFdBQXdDLHVFQUExQixlQUFLWCxPQUFxQjtBQUFBLE9BQVptRCxVQUFZOztBQUN2RixPQUFJWSxTQUFTLGVBQUsvRSxrQkFBTCxDQUF3QmtFLFVBQXhCLENBQWI7QUFDQSxPQUFJL0QsT0FBTyxDQUFDLGVBQUt1Qix1QkFBTCxDQUE2QnFELE1BQTdCLEVBQXFDLEVBQXJDLEVBQXlDLENBQXpDLEVBQTRDcEQsV0FBNUMsS0FBNEQsRUFBN0QsRUFBaUUsQ0FBakUsQ0FBWDtBQUNBLE9BQUksQ0FBQ3hCLElBQUwsRUFBVztBQUNYLE9BQUlnRSxVQUFKLEVBQWdCMUUsT0FBT0MsTUFBUCxDQUFjUyxJQUFkLEVBQW9CZ0UsVUFBcEI7QUFDaEIsVUFBTyxLQUFLSSxPQUFMLENBQWFOLElBQWIsRUFBbUI5RCxJQUFuQixDQUFQO0FBQ0EsR0FOVyxFQTNDNkI7O0FBbUR6QzhFLFlBQVcsRUFBRWpCLE9BQU8sZUFBU0MsSUFBVCxFQUFlQyxVQUFmLEVBQWtFO0FBQUEsT0FBdkN2QyxXQUF1Qyx1RUFBekIsZUFBS2QsTUFBb0I7QUFBQSxPQUFac0QsVUFBWTs7QUFDckY7QUFDQSxPQUFJWSxTQUFTLENBQUNiLFVBQUQsQ0FBYjtBQUNBLE9BQUkvRCxPQUFPLENBQUMsZUFBS2lCLHNCQUFMLENBQTRCMkQsTUFBNUIsRUFBb0MsRUFBcEMsRUFBd0MsQ0FBeEMsRUFBMkNwRCxXQUEzQyxLQUEyRCxFQUE1RCxFQUFnRSxDQUFoRSxDQUFYO0FBQ0EsT0FBSSxDQUFDeEIsSUFBTCxFQUFXO0FBQ1gsT0FBSWdFLFVBQUosRUFBZ0IxRSxPQUFPQyxNQUFQLENBQWNTLElBQWQsRUFBb0JnRSxVQUFwQjtBQUNoQixVQUFPLEtBQUtJLE9BQUwsQ0FBYU4sSUFBYixFQUFtQjlELElBQW5CLENBQVA7QUFDQSxHQVBVLEVBbkQ4Qjs7QUE0RHpDO0FBQ0E7QUFDQTtBQUNBK0UscUJBQW9CLEVBQUVsQixPQUFPLGVBQVNDLElBQVQsRUFBZUMsVUFBZixFQUEyQkMsVUFBM0IsRUFBdUM7QUFBQTs7QUFDbkUsT0FBSWdCLE1BQU1DLE9BQU4sQ0FBY2xCLFVBQWQsQ0FBSixFQUErQjtBQUM5QixXQUFPQSxXQUFXbUIsT0FBWCxDQUFtQjtBQUFBLFlBQVUsTUFBS0gsa0JBQUwsQ0FBd0JqQixJQUF4QixFQUE4QnJFLE1BQTlCLEVBQXNDdUUsVUFBdEMsQ0FBVjtBQUFBLEtBQW5CLENBQVA7QUFDQTs7QUFFRCxPQUFJaEUsT0FBTyxLQUFLNEQsV0FBTCxDQUFpQkUsSUFBakIsRUFBdUJDLFVBQXZCLEVBQW1DQyxVQUFuQyxDQUFYO0FBQ0EsT0FBSWhFLElBQUosRUFBVTtBQUNULFFBQUksQ0FBQ0EsS0FBS21GLElBQVYsRUFBZ0I7QUFDZixXQUFNLElBQUlDLFNBQUosc0NBQWlEdEIsSUFBakQsa0NBQU47QUFDQTtBQUNEO0FBQ0EsV0FBTyxLQUFLdUIsa0JBQVo7QUFDQSxXQUFPLEtBQUtqQixPQUFMLENBQWEsa0JBQWIsRUFBaUNwRSxJQUFqQyxDQUFQO0FBQ0E7QUFDRCxHQWRtQixFQS9EcUI7O0FBK0V6QztBQUNBO0FBQ0FzRixtQkFBa0IsNkJBQWUsbUJBQWYsRUFDakIsWUFBVTtBQUFFLFNBQU8sS0FBS3hGLEtBQUwsQ0FBVyxrQkFBWCxLQUNaLEtBQUtBLEtBQUwsQ0FBVyxrQkFBWCxFQUErQkEsS0FBL0IsQ0FBcUN3QyxHQUFyQyxDQUF5QztBQUFBLFVBQVF0QyxLQUFLNEIsTUFBYjtBQUFBLEdBQXpDLENBREs7QUFFWixFQUhpQjtBQWpGdUIsQ0FBMUMsRTs7Ozs7Ozs7Ozs7Ozs7O3FqQkNyUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBOzs7Ozs7Ozs7Ozs7SUFHcUIyRCxJO0FBQ3BCLGVBQVl2QixVQUFaLEVBQXdCO0FBQUE7O0FBQ3ZCLE1BQUksS0FBS3hDLFdBQUwsS0FBcUIrRCxJQUFyQixJQUE2QixDQUFDLEtBQUsvRCxXQUFMLENBQWlCbUMsU0FBakIsQ0FBMkI2QixjQUEzQixDQUEwQyxhQUExQyxDQUFsQyxFQUE0RjtBQUM5RjtBQUNHO0FBQ0RsRyxTQUFPQyxNQUFQLENBQWMsSUFBZCxFQUFvQnlFLFVBQXBCO0FBQ0E7O0FBRUQ7Ozs7OzBCQUNnQjtBQUNmLE9BQUl5QixRQUFRbkcsT0FBT29HLE1BQVAsQ0FBYyxJQUFkLENBQVo7O0FBRGUscUNBQVBDLEtBQU87QUFBUEEsU0FBTztBQUFBOztBQUVmckcsVUFBT0MsTUFBUCxnQkFBY2tHLEtBQWQsU0FBd0JFLEtBQXhCO0FBQ0EsVUFBT0YsS0FBUDtBQUNBOztBQUVEO0FBQ0E7Ozs7eUJBQ087QUFDTixPQUFJLENBQUMsS0FBS2IsTUFBTixJQUFnQixLQUFLcEUsUUFBTCxLQUFrQnlDLFNBQXRDLEVBQ0MsTUFBTSxJQUFJbUMsU0FBSixnREFBNkQsSUFBN0QsQ0FBTjtBQUNELFVBQU8sS0FBS1IsTUFBTCxDQUFZZ0IsU0FBWixDQUFzQixLQUFLcEYsUUFBM0IsQ0FBUDtBQUNBOztBQUVGO0FBQ0E7QUFDQTs7QUFFQztBQUNBOzs7O3dCQUNNcEIsTSxFQUFRd0YsTSxFQUFRaUIsSyxFQUFPO0FBQzVCLFVBQU81QyxTQUFQO0FBQ0E7O0FBRUQ7QUFDQTtBQUNBOzs7O2tDQUNnQjdELE0sRUFBUXdGLE0sRUFBUTtBQUMvQixVQUFPM0IsU0FBUDtBQUNBOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7dUJBQ0s3RCxNLEVBQVF3RixNLEVBQVE7QUFDcEIsVUFBTzNCLFNBQVA7QUFDQTs7QUFFRDs7Ozs7O0FBaUNBOzJCQUNTNkMsTyxFQUFTO0FBQ2pCLFVBQU8sS0FBS0MsT0FBWjtBQUNBOztBQUVGO0FBQ0E7QUFDQTs7Ozs7O0FBbEJBO0FBQ0E7QUFDQTs7QUFFQztBQUNBO0FBQ0E7c0JBQ2M7QUFDYixVQUFPLElBQVA7QUFDQTs7O3NCQVVjO0FBQ2QsVUFBTyxLQUFLdkUsV0FBTCxDQUFpQnNDLElBQXhCO0FBQ0E7OztnQ0ExQ29CK0IsSyxFQUFPN0YsSSxFQUFNNEUsTSxFQUFRO0FBQ3pDLE9BQUlpQixNQUFNNUYsTUFBTixLQUFpQixDQUFyQixFQUF3QixPQUFPLEtBQVA7O0FBRTFCO0FBQ0U7QUFDQSxRQUFLLElBQUl5QixJQUFJbUUsTUFBTTVGLE1BQU4sR0FBZSxDQUE1QixFQUErQnlCLEtBQUssQ0FBcEMsRUFBdUNBLEdBQXZDLEVBQTRDO0FBQUEsa0NBQ1ptRSxNQUFNbkUsQ0FBTixDQURZO0FBQUEsUUFDckNzRSxRQURxQztBQUFBLFFBQzNCQyxVQUQyQjs7QUFFM0MsUUFBSUQsYUFBYWhHLElBQWpCLEVBQXVCO0FBQ3RCLFNBQUlpRyxXQUFXNUYsVUFBWCxLQUEwQnVFLE9BQU92RSxVQUFyQyxFQUFpRDtBQUNyRDtBQUNLLGFBQU8sSUFBUDtBQUNBLE1BSEQsTUFJSztBQUNUO0FBQ0ssYUFBTyxLQUFQO0FBQ0E7QUFDRDtBQUNEO0FBQ0QsVUFBTyxLQUFQO0FBQ0E7Ozs7OztBQTZCRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7a0JBNUdxQmtGLEk7QUE2R3JCQSxLQUFLVyxPQUFMO0FBQUE7O0FBQ0Msa0JBQVlsQyxVQUFaLEVBQXdCO0FBQUE7O0FBQ3ZCO0FBQ0EsTUFBSSxDQUFDQSxXQUFXbUMsT0FBaEIsRUFBeUIsTUFBTSxJQUFJZixTQUFKLENBQWMseURBQWQsQ0FBTjs7QUFJekI7QUFDQTtBQVB1QixnSEFJakJwQixVQUppQjs7QUFRdkIxRSxTQUFPOEcsY0FBUCxRQUE0QixjQUE1QixFQUE0QyxFQUFFdkMsT0FBTyxJQUFJd0MsTUFBSixDQUFXLE1BQU0sTUFBS0YsT0FBTCxDQUFhRyxNQUE5QixDQUFULEVBQTVDO0FBUnVCO0FBU3ZCOztBQUVEOzs7QUFaRDtBQUFBO0FBQUEsd0JBYU9sSCxNQWJQLEVBYWV3RixNQWJmLEVBYXVCaUIsS0FidkIsRUFhOEI7QUFDNUIsT0FBSTFGLFFBQVF5RSxPQUFPekUsS0FBUCxDQUFhLEtBQUtvRyxZQUFsQixDQUFaO0FBQ0EsT0FBSSxDQUFDcEcsS0FBTCxFQUFZLE9BQU84QyxTQUFQOztBQUVaO0FBQ0EsT0FBSThDLFVBQVU1RixNQUFNLENBQU4sQ0FBZDtBQUNBLE9BQUksS0FBS3FHLFNBQUwsSUFBa0IsS0FBS0EsU0FBTCxDQUFlVCxPQUFmLENBQXRCLEVBQStDLE9BQU85QyxTQUFQOztBQUUvQyxPQUFJekMsV0FBV29FLE9BQU92RSxVQUFQLEdBQW9CMEYsUUFBUTlGLE1BQTNDO0FBQ0EsVUFBTyxLQUFLd0YsS0FBTCxDQUFXO0FBQ2pCTSxvQkFEaUI7QUFFakI7QUFDQVUsaUJBQWE3QixPQUFPOEIsS0FBUCxDQUFhOUIsT0FBT3ZFLFVBQXBCLEVBQWdDRyxRQUFoQyxDQUhJO0FBSWpCO0FBQ0FILGdCQUFZdUUsT0FBT3ZFLFVBTEY7QUFNakJHLHNCQU5pQjtBQU9qQm9FO0FBUGlCLElBQVgsQ0FBUDtBQVNBOztBQUVEOztBQWpDRDtBQUFBO0FBQUEsa0NBa0NpQnhGLE1BbENqQixFQWtDeUJ3RixNQWxDekIsRUFrQ2lDO0FBQy9CLFVBQU8sSUFBUDtBQUNBOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBMUNEO0FBQUE7QUFBQSx1QkEyQ014RixNQTNDTixFQTJDY3dGLE1BM0NkLEVBMkNzQjtBQUNwQixPQUFJekUsUUFBUXlFLE9BQU96RSxLQUFQLENBQWEsS0FBS2dHLE9BQWxCLENBQVo7QUFDQSxPQUFJaEcsS0FBSixFQUFXO0FBQ1ZBLFVBQU1LLFFBQU4sR0FBa0JMLE1BQU13RyxLQUFOLEdBQWN4RyxNQUFNLENBQU4sRUFBU0YsTUFBekM7QUFDQSxXQUFPRSxLQUFQO0FBQ0E7QUFDRCxVQUFPLEtBQVA7QUFDQTtBQWxERjtBQUFBO0FBQUEsbUNBb0QwQjtBQUFBOztBQUN4QixPQUFJLENBQUMsS0FBS3FHLFNBQVYsRUFBcUIsS0FBS0EsU0FBTCxHQUFpQixFQUFqQjs7QUFERyxzQ0FBUC9FLEtBQU87QUFBUEEsU0FBTztBQUFBOztBQUV4QkEsU0FBTXlELE9BQU4sQ0FBYztBQUFBLFdBQVEsT0FBS3NCLFNBQUwsQ0FBZUksSUFBZixJQUF1QixJQUEvQjtBQUFBLElBQWQ7QUFDQTtBQXZERjtBQUFBO0FBQUEsNkJBeURZO0FBQ1YsVUFBTyxLQUFLVCxPQUFMLENBQWFHLE1BQXBCO0FBQ0E7QUEzREY7O0FBQUE7QUFBQSxFQUFxQ2YsSUFBckM7O0FBOERBO0FBQ0E7QUFDQTtBQUNBQSxLQUFLN0UsTUFBTDtBQUFBOztBQUNDLGtCQUFZc0QsVUFBWixFQUF3QjtBQUFBOztBQUN2QjtBQUNBLE1BQUksQ0FBQ0EsV0FBV3BDLE1BQWhCLEVBQXdCLE1BQU0sSUFBSXdELFNBQUosQ0FBYyw2Q0FBZCxDQUFOOztBQUV4QjtBQUNBLE1BQUksQ0FBQ3BCLFdBQVdtQyxPQUFoQixFQUF5QjtBQUN4Qm5DLGNBQVdtQyxPQUFYLEdBQXFCLGlCQUFPVSxnQkFBUCxDQUF3QjdDLFdBQVdwQyxNQUFuQyxDQUFyQjtBQUNIO0FBQ0c7O0FBRUg7QUFWeUIsMkdBV2pCb0MsVUFYaUI7QUFZdkI7O0FBYkY7QUFBQTtBQUFBLDZCQWdCWTtBQUNWLGVBQVUsS0FBS3BDLE1BQWYsSUFBd0IsS0FBS29CLFFBQUwsR0FBZ0IsR0FBaEIsR0FBc0IsRUFBOUM7QUFDQTtBQWxCRjs7QUFBQTtBQUFBLEVBQW1DdUMsS0FBS1csT0FBeEM7O0FBcUJBO0FBQ0FYLEtBQUszRSxZQUFMLEdBQW9CLFVBQVNrRyxLQUFULEVBQWdCQyxNQUFoQixFQUF3QjtBQUMzQztBQUNBLEtBQUl2RixjQUFjc0YsTUFBTXRGLFdBQU4sS0FBc0IrRCxLQUFLN0UsTUFBM0IsR0FBb0NvRyxNQUFNdEYsV0FBMUMsR0FBd0R1RixPQUFPdkYsV0FBakY7QUFDQSxRQUFPLElBQUlBLFdBQUosQ0FBZ0IsRUFBRUksUUFBUWtGLE1BQU1sRixNQUFOLEdBQWVtRixPQUFPbkYsTUFBaEMsRUFBaEIsQ0FBUDtBQUNBLENBSkQ7O0FBTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EyRCxLQUFLMUUsT0FBTDtBQUFBOztBQUNDLGtCQUFZbUQsVUFBWixFQUF3QjtBQUFBOztBQUN2QjtBQUNBLE1BQUksQ0FBQ0EsV0FBV3BDLE1BQWhCLEVBQXdCLE1BQU0sSUFBSXdELFNBQUosQ0FBYyw4Q0FBZCxDQUFOOztBQUV4QjtBQUNBLE1BQUksQ0FBQ3BCLFdBQVdtQyxPQUFoQixFQUF5QjtBQUN4QjtBQUNBLE9BQUlhLGdCQUFnQixpQkFBT0Msc0JBQVAsQ0FBOEJqRCxXQUFXcEMsTUFBekMsQ0FBcEI7QUFDQW9DLGNBQVdtQyxPQUFYLEdBQXFCLElBQUlFLE1BQUosQ0FBVyxRQUFRVyxhQUFSLEdBQXdCLEtBQW5DLENBQXJCO0FBQ0E7QUFUc0IsMkdBVWpCaEQsVUFWaUI7QUFXdkI7O0FBWkY7QUFBQTtBQUFBLDZCQWNZO0FBQ1YsZUFBVSxLQUFLcEMsTUFBZixJQUF3QixLQUFLb0IsUUFBTCxHQUFnQixHQUFoQixHQUFzQixFQUE5QztBQUNBO0FBaEJGOztBQUFBO0FBQUEsRUFBcUN1QyxLQUFLVyxPQUExQzs7QUFvQkE7QUFDQVgsS0FBS3pFLGFBQUwsR0FBcUIsVUFBU2dHLEtBQVQsRUFBZ0JDLE1BQWhCLEVBQXdCO0FBQzVDO0FBQ0EsS0FBSXZGLGNBQWNzRixNQUFNdEYsV0FBTixLQUFzQitELEtBQUsxRSxPQUEzQixHQUFxQ2lHLE1BQU10RixXQUEzQyxHQUF5RHVGLE9BQU92RixXQUFsRjtBQUNBLFFBQU8sSUFBSUEsV0FBSixDQUFnQixFQUFFSSxRQUFRa0YsTUFBTWxGLE1BQU4sR0FBZSxHQUFmLEdBQXFCbUYsT0FBT25GLE1BQXRDLEVBQWhCLENBQVA7QUFDQSxDQUpEOztBQU9BO0FBQ0E7QUFDQTJELEtBQUtqQyxPQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSx3QkFDT2xFLE1BRFAsRUFDZXdGLE1BRGYsRUFDdUJpQixLQUR2QixFQUM4QjtBQUM1QixPQUFJN0YsT0FBT1osT0FBTzhILFlBQVAsQ0FBb0IsS0FBS2xILElBQXpCLEVBQStCLE1BQS9CLENBQVg7QUFDQSxPQUFJRyxRQUFRSCxLQUFLbUgsS0FBTCxDQUFXL0gsTUFBWCxFQUFtQndGLE1BQW5CLEVBQTJCaUIsS0FBM0IsQ0FBWjtBQUNBLE9BQUksQ0FBQzFGLEtBQUwsRUFBWSxPQUFPOEMsU0FBUDs7QUFFWixPQUFJLEtBQUtkLFFBQVQsRUFBbUJoQyxNQUFNZ0MsUUFBTixHQUFpQixLQUFLQSxRQUF0QjtBQUNuQixVQUFPaEMsS0FBUDtBQUNBO0FBUkY7QUFBQTtBQUFBLGtDQVVpQmYsTUFWakIsRUFVeUJ3RixNQVZ6QixFQVVpQztBQUMvQixPQUFJNUUsT0FBT1osT0FBTzhILFlBQVAsQ0FBb0IsS0FBS2xILElBQXpCLEVBQStCLE1BQS9CLENBQVg7QUFDQSxVQUFPQSxLQUFLb0gsZUFBTCxDQUFxQmhJLE1BQXJCLEVBQTZCd0YsTUFBN0IsQ0FBUDtBQUNBOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBbkJEO0FBQUE7QUFBQSx1QkFvQk14RixNQXBCTixFQW9CY3dGLE1BcEJkLEVBb0JzQjtBQUNwQixPQUFJNUUsT0FBT1osT0FBTzhILFlBQVAsQ0FBb0IsS0FBS2xILElBQXpCLEVBQStCLE1BQS9CLENBQVg7QUFDQSxVQUFPQSxLQUFLcUgsSUFBTCxDQUFVakksTUFBVixFQUFrQndGLE1BQWxCLENBQVA7QUFDQTtBQXZCRjtBQUFBO0FBQUEsNkJBeUJZO0FBQ1YsaUJBQVcsS0FBS3pDLFFBQUwsR0FBZ0IsS0FBS0EsUUFBTCxHQUFjLEdBQTlCLEdBQW9DLEVBQS9DLElBQW9ELEtBQUtuQyxJQUF6RCxVQUFpRSxLQUFLZ0QsUUFBTCxHQUFnQixHQUFoQixHQUFzQixFQUF2RjtBQUNBO0FBM0JGOztBQUFBO0FBQUEsRUFBcUN1QyxJQUFyQzs7QUFnQ0E7QUFDQUEsS0FBSytCLE1BQUw7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7O0FBRUM7QUFDRDtBQUhBLGtDQUlpQmxJLE1BSmpCLEVBSXlCd0YsTUFKekIsRUFJaUM7QUFDL0IsVUFBTyxLQUFLOUUsS0FBTCxDQUFXeUgsS0FBWCxDQUFpQjtBQUFBLFdBQVF2SCxLQUFLb0gsZUFBTCxDQUFxQmhJLE1BQXJCLEVBQTZCd0YsTUFBN0IsQ0FBUjtBQUFBLElBQWpCLENBQVA7QUFDQTtBQU5GOztBQUFBO0FBQUEsRUFBbUNXLElBQW5DOztBQVVBO0FBQ0FBLEtBQUs1RixRQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSx3QkFDT1AsTUFEUCxFQUNld0YsTUFEZixFQUNtQztBQUFBLE9BQVppQixLQUFZLHVFQUFKLEVBQUk7O0FBQ2pDO0FBQ0EsT0FBSSxLQUFLMkIsUUFBVCxFQUFtQjtBQUNsQixRQUFJeEgsT0FBT1osT0FBTzhILFlBQVAsQ0FBb0IsS0FBS00sUUFBekIsRUFBbUMsVUFBbkMsQ0FBWDtBQUNBLFFBQUl4SCxLQUFLcUgsSUFBTCxDQUFVakksTUFBVixFQUFrQndGLE1BQWxCLE1BQThCLEtBQWxDLEVBQXlDLE9BQU8zQixTQUFQO0FBQ3pDOztBQUVELE9BQUksS0FBS3dFLGFBQVQsRUFBd0I7QUFDdkIsUUFBSWxDLEtBQUttQyxhQUFMLENBQW1CN0IsS0FBbkIsRUFBMEIsSUFBMUIsRUFBZ0NqQixNQUFoQyxDQUFKLEVBQTZDLE9BQU8zQixTQUFQO0FBQzdDNEMsWUFBUUEsTUFBTWhELE1BQU4sRUFBUjtBQUNBZ0QsVUFBTTlFLElBQU4sQ0FBVyxDQUFDLElBQUQsRUFBTzZELE1BQVAsQ0FBWDtBQUNBOztBQUVELE9BQUksS0FBSytDLE9BQVQsRUFBa0IsT0FBTyxLQUFLQyxhQUFMLENBQW1CeEksTUFBbkIsRUFBMkJ3RixNQUEzQixFQUFtQ2lCLEtBQW5DLENBQVA7O0FBRWxCLE9BQUlFLFVBQVUsRUFBZDtBQUFBLE9BQWtCcEUsT0FBT2lELE1BQXpCO0FBZmlDO0FBQUE7QUFBQTs7QUFBQTtBQWdCakMseUJBQWlCLEtBQUs5RSxLQUF0Qiw4SEFBNkI7QUFBQSxTQUFwQkUsS0FBb0I7O0FBQzVCMkIsWUFBT3ZDLE9BQU95SSxhQUFQLENBQXFCbEcsSUFBckIsQ0FBUDtBQUNBLFNBQUl4QixRQUFRSCxNQUFLbUgsS0FBTCxDQUFXL0gsTUFBWCxFQUFtQnVDLElBQW5CLEVBQXlCa0UsS0FBekIsQ0FBWjtBQUNBLFNBQUksQ0FBQzFGLEtBQUQsSUFBVSxDQUFDSCxNQUFLZ0QsUUFBcEIsRUFBOEIsT0FBT0MsU0FBUDtBQUM5QixTQUFJOUMsS0FBSixFQUFXO0FBQ1Y0RixjQUFRaEYsSUFBUixDQUFhWixLQUFiO0FBQ0F3QixhQUFPeEIsTUFBTXdCLElBQU4sRUFBUDtBQUNBO0FBQ0Q7QUFDRDtBQXpCaUM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUEwQmpDLFVBQU8sS0FBSzhELEtBQUwsQ0FBVztBQUNqQk0sb0JBRGlCO0FBRWpCO0FBQ0FVLGlCQUFhN0IsT0FBTzhCLEtBQVAsQ0FBYTlCLE9BQU92RSxVQUFwQixFQUFnQ3NCLEtBQUt0QixVQUFyQyxDQUhJO0FBSWpCO0FBQ0FBLGdCQUFZdUUsT0FBT3ZFLFVBTEY7QUFNakJHLGNBQVVtQixLQUFLdEIsVUFORTtBQU9qQnVFO0FBUGlCLElBQVgsQ0FBUDtBQVNBOztBQUVGO0FBQ0E7QUFDQTs7QUFFQTtBQUNDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQWpERDtBQUFBO0FBQUEsNkJBb0VZO0FBQ1YsZUFBVSxLQUFLOUUsS0FBTCxDQUFXK0IsSUFBWCxDQUFnQixHQUFoQixDQUFWLElBQWlDLEtBQUttQixRQUFMLEdBQWdCLEdBQWhCLEdBQXNCLEVBQXZEO0FBQ0E7QUF0RUY7QUFBQTtBQUFBLHNCQWtEZTtBQUNiLE9BQUksQ0FBQyxLQUFLK0MsT0FBVixFQUFtQixPQUFPOUMsU0FBUDtBQUNuQixPQUFJVCxVQUFVLEVBQWQ7QUFGYTtBQUFBO0FBQUE7O0FBQUE7QUFHYiwwQkFBa0IsS0FBS3VELE9BQXZCLG1JQUFnQztBQUFBLFNBQXZCNUYsS0FBdUI7O0FBQy9CLFNBQUkySCxVQUFVM0gsTUFBTWdDLFFBQU4sSUFBa0JoQyxNQUFNNEgsUUFBeEIsSUFBb0M1SCxNQUFNcUIsV0FBTixDQUFrQnNDLElBQXBFOztBQUVBO0FBQ0EsU0FBSWdFLFdBQVd0RixPQUFmLEVBQXdCO0FBQ3ZCLFVBQUksQ0FBQ3dDLE1BQU1DLE9BQU4sQ0FBY3pDLFFBQVFzRixPQUFSLENBQWQsQ0FBTCxFQUFzQ3RGLFFBQVFzRixPQUFSLElBQW1CLENBQUN0RixRQUFRc0YsT0FBUixDQUFELENBQW5CO0FBQ3RDdEYsY0FBUXNGLE9BQVIsRUFBaUIvRyxJQUFqQixDQUFzQlosS0FBdEI7QUFDQSxNQUhELE1BSUs7QUFDSnFDLGNBQVFzRixPQUFSLElBQW1CM0gsS0FBbkI7QUFDQTtBQUNEO0FBZFk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFlYixVQUFPcUMsT0FBUDtBQUNBO0FBbEVGOztBQUFBO0FBQUEsRUFBdUMrQyxLQUFLK0IsTUFBNUM7O0FBMEVBO0FBQ0EvQixLQUFLYixVQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUEsRUFBMkNhLEtBQUs1RixRQUFoRDs7QUFHQTtBQUNBNEYsS0FBS2YsU0FBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQXlDZSxLQUFLNUYsUUFBOUM7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBNEYsS0FBSzlDLFlBQUw7QUFBQTs7QUFDQyx1QkFBWWtELEtBQVosRUFBbUI7QUFBQTs7QUFBQSw0SEFDWkEsS0FEWTs7QUFFbEIsTUFBSSxDQUFDLFFBQUs3RixLQUFWLEVBQWlCLFFBQUtBLEtBQUwsR0FBYSxFQUFiO0FBRkM7QUFHbEI7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBVkQ7QUFBQTtBQUFBLHVCQVdNVixNQVhOLEVBV2N3RixNQVhkLEVBV3NCO0FBQ3BCLE9BQUksQ0FBQyxLQUFLd0MsZUFBTCxDQUFxQmhJLE1BQXJCLEVBQTZCd0YsTUFBN0IsQ0FBTCxFQUEyQyxPQUFPM0IsU0FBUDtBQUMzQyxPQUFJK0Usa0JBQUo7QUFGb0I7QUFBQTtBQUFBOztBQUFBO0FBR3BCLDBCQUFpQixLQUFLbEksS0FBdEIsbUlBQTZCO0FBQUEsU0FBcEJFLElBQW9COztBQUM1QixTQUFJRyxRQUFRSCxLQUFLcUgsSUFBTCxDQUFVakksTUFBVixFQUFrQndGLE1BQWxCLENBQVo7QUFDQSxTQUFJekUsS0FBSixFQUFXO0FBQ1ZBLFlBQU1LLFFBQU4sR0FBaUJMLE1BQU13RyxLQUFOLEdBQWN4RyxNQUFNLENBQU4sRUFBU0YsTUFBeEM7QUFDQSxhQUFPRSxLQUFQO0FBQ0E7QUFDRDtBQVRtQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOztBQVVwQixVQUFPLEtBQVA7QUFDQTs7QUFFRDs7QUF4QkQ7QUFBQTtBQUFBLHdCQXlCT2YsTUF6QlAsRUF5QmV3RixNQXpCZixFQXlCdUJpQixLQXpCdkIsRUF5QjhCO0FBQzVCLE9BQUlvQyxVQUFVLEVBQWQ7QUFENEI7QUFBQTtBQUFBOztBQUFBO0FBRTVCLDBCQUFpQixLQUFLbkksS0FBdEIsbUlBQTZCO0FBQUEsU0FBcEJFLElBQW9COztBQUM1QixTQUFJRyxRQUFRSCxLQUFLbUgsS0FBTCxDQUFXL0gsTUFBWCxFQUFtQndGLE1BQW5CLEVBQTJCaUIsS0FBM0IsQ0FBWjtBQUNBLFNBQUkxRixLQUFKLEVBQVc4SCxRQUFRbEgsSUFBUixDQUFhWixLQUFiO0FBQ1g7QUFMMkI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFPNUIsT0FBSSxDQUFDOEgsUUFBUWhJLE1BQWIsRUFBcUIsT0FBT2dELFNBQVA7O0FBRXJCO0FBQ0E7QUFDQTtBQUNBOztBQUVBLE9BQUkrRSxZQUFhQyxRQUFRaEksTUFBUixLQUFtQixDQUFuQixHQUF1QmdJLFFBQVEsQ0FBUixDQUF2QixHQUFvQyxLQUFLQyxZQUFMLENBQWtCRCxPQUFsQixDQUFyRDs7QUFFQTtBQUNBLE9BQUksS0FBSzlGLFFBQVQsRUFBbUI2RixVQUFVN0YsUUFBVixHQUFxQixLQUFLQSxRQUExQixDQUFuQixLQUNLLElBQUksS0FBSzRGLFFBQVQsRUFBbUJDLFVBQVVELFFBQVYsR0FBcUIsS0FBS0EsUUFBMUI7QUFDMUI7O0FBRUUsVUFBT0MsU0FBUDtBQUNBOztBQUVEO0FBQ0E7QUFDQTs7QUFuREQ7QUFBQTtBQUFBLCtCQW9EY0MsT0FwRGQsRUFvRHVCO0FBQ3JCLFVBQU9BLFFBQVFFLE1BQVIsQ0FBZSxVQUFVQyxJQUFWLEVBQWdCekcsSUFBaEIsRUFBc0I7QUFDM0MsUUFBSUEsS0FBS25CLFFBQUwsR0FBZ0I0SCxLQUFLNUgsUUFBekIsRUFBbUMsT0FBT21CLElBQVA7QUFDbkMsV0FBT3lHLElBQVA7QUFDQSxJQUhNLEVBR0pILFFBQVEsQ0FBUixDQUhJLENBQVA7QUFJQTtBQXpERjtBQUFBO0FBQUEsMEJBMkRTakksSUEzRFQsRUEyRGU7QUFDYixRQUFLRixLQUFMLENBQVdpQixJQUFYLENBQWdCZixJQUFoQjtBQUNBO0FBN0RGO0FBQUE7QUFBQSwyQkErRFU4RixPQS9EVixFQStEbUI7QUFDakIsVUFBTyxLQUFLQyxPQUFMLENBQWFzQyxRQUFiLENBQXNCdkMsT0FBdEIsQ0FBUDtBQUNBO0FBakVGO0FBQUE7QUFBQSw2QkFtRVk7QUFDVixpQkFBVyxLQUFLM0QsUUFBTCxHQUFnQixLQUFLQSxRQUFMLEdBQWMsR0FBOUIsR0FBb0MsRUFBL0MsSUFBb0QsS0FBS3JDLEtBQUwsQ0FBVytCLElBQVgsQ0FBZ0IsR0FBaEIsQ0FBcEQsVUFBNEUsS0FBS21CLFFBQUwsR0FBZ0IsR0FBaEIsR0FBc0IsRUFBbEc7QUFDQTtBQXJFRjs7QUFBQTtBQUFBLEVBQStDdUMsS0FBSytCLE1BQXBEOztBQTBFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EvQixLQUFLeEMsTUFBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBO0FBQUEsd0JBQ08zRCxNQURQLEVBQ2V3RixNQURmLEVBQ21DO0FBQUEsT0FBWmlCLEtBQVksdUVBQUosRUFBSTs7QUFDakMsT0FBSSxLQUFLNEIsYUFBVCxFQUF3QjtBQUN2QixRQUFJbEMsS0FBS21DLGFBQUwsQ0FBbUI3QixLQUFuQixFQUEwQixJQUExQixFQUFnQ2pCLE1BQWhDLENBQUosRUFBNkMsT0FBTzNCLFNBQVA7QUFDN0M0QyxZQUFRQSxNQUFNaEQsTUFBTixFQUFSO0FBQ0FnRCxVQUFNOUUsSUFBTixDQUFXLENBQUMsSUFBRCxFQUFPNkQsTUFBUCxDQUFYO0FBQ0E7O0FBRUQsT0FBSWpELE9BQU9pRCxNQUFYO0FBQ0EsT0FBSW1CLFVBQVUsRUFBZDtBQUNBLFVBQU8sSUFBUCxFQUFhO0FBQ1pwRSxXQUFPdkMsT0FBT3lJLGFBQVAsQ0FBcUJsRyxJQUFyQixDQUFQO0FBQ0EsUUFBSXhCLFFBQVEsS0FBS0gsSUFBTCxDQUFVbUgsS0FBVixDQUFnQi9ILE1BQWhCLEVBQXdCdUMsSUFBeEIsRUFBOEJrRSxLQUE5QixDQUFaO0FBQ0EsUUFBSSxDQUFDMUYsS0FBTCxFQUFZOztBQUVaNEYsWUFBUWhGLElBQVIsQ0FBYVosS0FBYjtBQUNBd0IsV0FBT3hCLE1BQU13QixJQUFOLEVBQVA7QUFDQTs7QUFFRCxPQUFJb0UsUUFBUTlGLE1BQVIsS0FBbUIsQ0FBdkIsRUFBMEIsT0FBT2dELFNBQVA7O0FBRTFCLFVBQU8sS0FBS3dDLEtBQUwsQ0FBVztBQUNqQk0sb0JBRGlCO0FBRWpCO0FBQ0FVLGlCQUFhN0IsT0FBTzhCLEtBQVAsQ0FBYTlCLE9BQU92RSxVQUFwQixFQUFnQ3NCLEtBQUt0QixVQUFyQyxDQUhJO0FBSWpCO0FBQ0FBLGdCQUFZdUUsT0FBT3ZFLFVBTEY7QUFNakJHLGNBQVVtQixLQUFLdEIsVUFORTtBQU9qQnVFO0FBUGlCLElBQVgsQ0FBUDtBQVNBOztBQUVEO0FBQ0E7QUFDQTtBQUNBOztBQW5DRDtBQUFBO0FBQUEsNkJBeUNZO0FBQ1YsU0FBTSw2Q0FBTjtBQUNBO0FBM0NGO0FBQUE7QUFBQSw2QkE2Q1k7QUFDVixPQUFNNUUsT0FBUSxLQUFLQSxJQUFMLFlBQXFCdUYsS0FBSzVGLFFBQTFCLElBQXNDLEtBQUtLLElBQUwsWUFBcUJ1RixLQUFLMUUsT0FBMUIsSUFBcUMsS0FBS2IsSUFBTCxDQUFVNEIsTUFBVixDQUFpQjBHLFFBQWpCLENBQTBCLEdBQTFCLENBQTNFLFNBQ0gsS0FBS3RJLElBREYsY0FFSixLQUFLQSxJQUZmO0FBSUEsZUFBVUEsSUFBVixJQUFpQixLQUFLZ0QsUUFBTCxHQUFnQixHQUFoQixHQUFzQixHQUF2QztBQUNBO0FBbkRGO0FBQUE7QUFBQSxzQkFvQ2U7QUFDYixPQUFJLENBQUMsS0FBSytDLE9BQVYsRUFBbUIsT0FBTzlDLFNBQVA7QUFDbkIsVUFBTyxLQUFLOEMsT0FBTCxDQUFhekQsR0FBYixDQUFrQjtBQUFBLFdBQVNuQyxNQUFNcUMsT0FBZjtBQUFBLElBQWxCLENBQVA7QUFDQTtBQXZDRjs7QUFBQTtBQUFBLEVBQW1DK0MsS0FBSytCLE1BQXhDOztBQXVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBL0IsS0FBS2hDLElBQUw7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLHdCQUNPbkUsTUFEUCxFQUNld0YsTUFEZixFQUNtQztBQUFBLE9BQVppQixLQUFZLHVFQUFKLEVBQUk7O0FBQ2pDLE9BQUksS0FBSzRCLGFBQVQsRUFBd0I7QUFDdkIsUUFBSWxDLEtBQUttQyxhQUFMLENBQW1CN0IsS0FBbkIsRUFBMEIsSUFBMUIsRUFBZ0NqQixNQUFoQyxDQUFKLEVBQTZDLE9BQU8zQixTQUFQO0FBQzdDNEMsWUFBUUEsTUFBTWhELE1BQU4sRUFBUjtBQUNBZ0QsVUFBTTlFLElBQU4sQ0FBVyxDQUFDLElBQUQsRUFBTzZELE1BQVAsQ0FBWDtBQUNBOztBQUVEO0FBQ0EsUUFBS3BCLElBQUwsQ0FBVVIsUUFBVixHQUFxQixJQUFyQjtBQUNBLFFBQUtTLFNBQUwsQ0FBZVQsUUFBZixHQUEwQixJQUExQjs7QUFFQSxPQUFJK0MsVUFBVSxFQUFkO0FBQUEsT0FBa0JwRSxPQUFPaUQsTUFBekI7QUFDQSxVQUFPLElBQVAsRUFBYTtBQUNaakQsV0FBT3ZDLE9BQU95SSxhQUFQLENBQXFCbEcsSUFBckIsQ0FBUDtBQUNBO0FBQ0EsUUFBSTZCLE9BQU8sS0FBS0EsSUFBTCxDQUFVMkQsS0FBVixDQUFnQi9ILE1BQWhCLEVBQXdCdUMsSUFBeEIsRUFBOEJrRSxLQUE5QixDQUFYO0FBQ0EsUUFBSSxDQUFDckMsSUFBTCxFQUFXO0FBQ2Q7QUFDR3VDLFlBQVFoRixJQUFSLENBQWF5QyxJQUFiO0FBQ0E3QixXQUFPNkIsS0FBSzdCLElBQUwsRUFBUDs7QUFFQUEsV0FBT3ZDLE9BQU95SSxhQUFQLENBQXFCbEcsSUFBckIsQ0FBUDtBQUNBO0FBQ0EsUUFBSThCLFlBQVksS0FBS0EsU0FBTCxDQUFlMEQsS0FBZixDQUFxQi9ILE1BQXJCLEVBQTZCdUMsSUFBN0IsRUFBbUNrRSxLQUFuQyxDQUFoQjtBQUNBLFFBQUksQ0FBQ3BDLFNBQUwsRUFBZ0I7QUFDaEI5QixXQUFPOEIsVUFBVTlCLElBQVYsRUFBUDtBQUNBOztBQUVEO0FBQ0EsT0FBSW9FLFFBQVE5RixNQUFSLEtBQW1CLENBQXZCLEVBQTBCLE9BQU9nRCxTQUFQOztBQUUxQixVQUFPLEtBQUt3QyxLQUFMLENBQVc7QUFDakJNLG9CQURpQjtBQUVqQjtBQUNBVSxpQkFBYTdCLE9BQU84QixLQUFQLENBQWE5QixPQUFPdkUsVUFBcEIsRUFBZ0NzQixLQUFLdEIsVUFBckMsQ0FISTtBQUlqQjtBQUNBQSxnQkFBWTBGLFFBQVEsQ0FBUixJQUFhQSxRQUFRLENBQVIsRUFBVzFGLFVBQXhCLEdBQXFDdUUsT0FBT3ZFLFVBTHZDO0FBTWpCRyxjQUFVbUIsS0FBS3RCLFVBTkU7QUFPakJ1RTtBQVBpQixJQUFYLENBQVA7QUFTQTs7QUFFRDs7QUEzQ0Q7QUFBQTtBQUFBLDBCQTRDUytCLEtBNUNULEVBNENnQjtBQUNkLE9BQUksQ0FBQyxLQUFLWixPQUFWLEVBQW1CLE9BQU85QyxTQUFQO0FBQ25CLFVBQU8sS0FBSzhDLE9BQUwsQ0FBYVksS0FBYixDQUFQO0FBQ0E7QUEvQ0Y7QUFBQTtBQUFBLDJCQWlEVWIsT0FqRFYsRUFpRG1CO0FBQ2pCLE9BQUksQ0FBQyxLQUFLQyxPQUFWLEVBQW1CLE9BQU85QyxTQUFQLENBREYsQ0FDcUI7QUFDdEMsT0FBSThDLFVBQVUsS0FBS0EsT0FBTCxDQUFhekQsR0FBYixDQUFrQjtBQUFBLFdBQVNuQyxNQUFNa0ksUUFBTixDQUFldkMsT0FBZixDQUFUO0FBQUEsSUFBbEIsRUFBcURqRSxJQUFyRCxDQUEwRCxJQUExRCxDQUFkO0FBQ0EsZ0JBQVdrRSxPQUFYO0FBQ0E7QUFyREY7QUFBQTtBQUFBLDZCQXVEWTtBQUNWLGlCQUFXLEtBQUs1RCxRQUFMLEdBQWdCLEtBQUtBLFFBQUwsR0FBYyxHQUE5QixHQUFvQyxFQUEvQyxJQUFvRCxLQUFLcUIsSUFBekQsU0FBaUUsS0FBS0MsU0FBdEUsVUFBbUYsS0FBS1QsUUFBTCxHQUFnQixHQUFoQixHQUFzQixFQUF6RztBQUNBO0FBekRGOztBQUFBO0FBQUEsRUFBK0J1QyxJQUEvQixFOzs7Ozs7Ozs7Ozs7O3FqQkNqaEJBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUE7QUFDQSxJQUFJLENBQUNyQixRQUFRM0IsS0FBYixFQUFvQjJCLFFBQVEzQixLQUFSLEdBQWdCMkIsUUFBUUMsR0FBeEI7QUFDcEIsSUFBSSxDQUFDRCxRQUFRcUUsUUFBYixFQUF1QnJFLFFBQVFxRSxRQUFSLEdBQW1CckUsUUFBUUMsR0FBM0I7O0lBRUZxRSxNO0FBSXBCLGlCQUFZeEUsVUFBWixFQUF3QjtBQUFBOztBQUN2QjFFLFNBQU9DLE1BQVAsQ0FBYyxJQUFkLEVBQW9CeUUsVUFBcEI7O0FBRUE7QUFDQSxPQUFLbEUsS0FBTCxHQUFhUixPQUFPb0csTUFBUCxDQUFjLEtBQUs1RixLQUFMLElBQWMsSUFBNUIsQ0FBYjtBQUNBO0FBUkQ7Ozs7OzBCQVVRZ0UsSSxFQUFNO0FBQ2IsVUFBTyxLQUFLaEUsS0FBTCxDQUFXZ0UsSUFBWCxDQUFQO0FBQ0E7OzsrQkFFWUEsSSxFQUFNMkUsWSxFQUFjO0FBQ2hDLE9BQUl6SSxPQUFPLEtBQUswSSxPQUFMLENBQWE1RSxJQUFiLENBQVg7QUFDQSxPQUFJLENBQUM5RCxJQUFMLEVBQVcsTUFBTSxJQUFJSSxXQUFKLENBQW1CcUksWUFBbkIsZUFBeUMzRSxJQUF6QyxpQkFBTjtBQUNYLFVBQU85RCxJQUFQO0FBQ0E7O0FBRUY7QUFDQTtBQUNBO0FBQ0M7QUFDQTtBQUNBO0FBQ0E7QUFDRDs7Ozs0QkFDVztBQUNULE9BQUkySSxVQUFVMUksTUFBVixLQUFxQixDQUF6QixFQUE0QjtBQUMzQixRQUFJMkIsU0FBUytHLFVBQVUsQ0FBVixDQUFiO0FBQ0EsV0FBTyxLQUFLQyxpQkFBTCxDQUF1QmhILE1BQXZCLENBQVA7QUFDQSxJQUhELE1BSUssSUFBSStHLFVBQVUxSSxNQUFWLEtBQXFCLENBQXpCLEVBQTRCO0FBQ2hDLFFBQUk2RCxPQUFPNkUsVUFBVSxDQUFWLENBQVg7QUFBQSxRQUF5Qi9HLFVBQVMrRyxVQUFVLENBQVYsQ0FBbEM7QUFDQSxRQUFJRSxTQUFTLEtBQUsxQixLQUFMLENBQVdyRCxJQUFYLEVBQWlCbEMsT0FBakIsQ0FBYjtBQUNBLFFBQUksQ0FBQ2lILE1BQUwsRUFBYSxNQUFNLElBQUl6SSxXQUFKLG9CQUFpQzBELElBQWpDLFlBQTRDbEMsT0FBNUMsMEJBQU47QUFDYixXQUFPaUgsT0FBT1IsUUFBUCxDQUFnQixJQUFoQixDQUFQO0FBQ0EsSUFMSSxNQU1BO0FBQ0osVUFBTSxJQUFJakksV0FBSixDQUFnQiw4Q0FBaEIsQ0FBTjtBQUNBO0FBQ0Q7O0FBRUQ7QUFDQTtBQUNBO0FBQ0Q7Ozs7d0JBQ08wRCxJLEVBQU1jLE0sRUFBUTtBQUNuQixPQUFJLE9BQU9BLE1BQVAsS0FBa0IsUUFBdEIsRUFBZ0NBLFNBQVMseUJBQWVBLE1BQWYsQ0FBVDtBQUNoQyxPQUFJNUUsT0FBTyxLQUFLMEksT0FBTCxDQUFhNUUsSUFBYixDQUFYO0FBQ0EsT0FBSSxDQUFDOUQsSUFBTCxFQUFXLE1BQU0sSUFBSUksV0FBSixtQkFBZ0MwRCxJQUFoQyx1QkFBTjtBQUNYYyxZQUFTLEtBQUtpRCxhQUFMLENBQW1CakQsTUFBbkIsQ0FBVDtBQUNBLFVBQU81RSxLQUFLbUgsS0FBTCxDQUFXLElBQVgsRUFBaUJ2QyxNQUFqQixDQUFQO0FBQ0E7O0FBRUQ7QUFDRDs7OztvQ0FDbUJrRSxVLEVBQVk7QUFBQTs7QUFDN0I1RSxXQUFRNkUsSUFBUixDQUFhLGlCQUFiO0FBQ0EsT0FBSXZHLFVBQVUsRUFBZDtBQUNBLE9BQUl3RyxnQkFBZ0IsQ0FBcEI7QUFDQSxPQUFNQyxPQUFPLG9DQUFiO0FBQ0FILGNBQVdJLEtBQVgsQ0FBaUIsS0FBakIsRUFBd0JoRSxPQUF4QixDQUFnQyxxQkFBYTtBQUM1QztBQUNBLFFBQUlpRSxVQUFVQyxJQUFWLE9BQXFCLEVBQXpCLEVBQTZCO0FBQzVCNUcsYUFBUXpCLElBQVIsQ0FBYSxFQUFiO0FBQ0E7QUFDQTs7QUFFRDtBQUNBLFFBQUlzSSxZQUFZRixVQUFVaEosS0FBVixDQUFnQixNQUFoQixFQUF3QixDQUF4QixDQUFoQjtBQUNBLFFBQUltSixhQUFhRCxVQUFVcEosTUFBM0I7QUFDQSxRQUFJcUosYUFBYU4sYUFBakIsRUFBZ0M7QUFDL0I7QUFDQSxTQUFJeEcsUUFBUXZDLE1BQVosRUFBb0I7QUFDbkI7QUFDQSxVQUFJc0osZ0JBQWdCRixZQUFZLElBQWhDO0FBQ0EsVUFBSSxDQUFDN0csUUFBUUEsUUFBUXZDLE1BQVIsR0FBaUIsQ0FBekIsRUFBNEI2QixVQUE1QixDQUF1Q3lILGFBQXZDLENBQUwsRUFBNEQ7QUFDM0QvRyxlQUFRQSxRQUFRdkMsTUFBUixHQUFpQixDQUF6QixLQUErQixJQUEvQjtBQUNBLE9BRkQsTUFHSztBQUNWO0FBQ007QUFDRCxNQVRELE1BVUt1QyxRQUFRekIsSUFBUixDQUFha0ksS0FBS2xILE1BQUwsQ0FBWSxDQUFaLEVBQWV1SCxhQUFXLENBQTFCLElBQStCLEdBQTVDO0FBQ0wsS0FiRCxNQWNLLElBQUlBLGFBQWFOLGFBQWpCLEVBQWdDO0FBQUE7O0FBQ3BDLFNBQUlRLFVBQVUsRUFBZDtBQUNBLFVBQUssSUFBSTlILElBQUlzSCxhQUFiLEVBQTRCdEgsSUFBSTRILFVBQWhDLEVBQTRDNUgsR0FBNUMsRUFBaUQ7QUFDaEQ4SCxjQUFRekksSUFBUixDQUFha0ksS0FBS2xILE1BQUwsQ0FBWSxDQUFaLEVBQWVMLElBQUUsQ0FBakIsSUFBc0IsR0FBbkM7QUFDQTtBQUNEO0FBQ0EsU0FBSStILGdCQUFnQixNQUFLQyxpQkFBTCxDQUF1QmxILE9BQXZCLENBQXBCO0FBQ0EsMEJBQVFtSCxNQUFSLGtCQUFlRixhQUFmLEVBQThCLENBQTlCLFNBQW9DRCxPQUFwQztBQUNBO0FBQ0RSLG9CQUFnQk0sVUFBaEI7O0FBRUEsUUFBSVQsU0FBUyxNQUFLMUIsS0FBTCxDQUFXLFdBQVgsRUFBd0JnQyxTQUF4QixDQUFiO0FBQ0g7QUFDRyxRQUFJTixNQUFKLEVBQVk7QUFDWDtBQUNBLFNBQUl2QyxTQUFTdUMsT0FBT1IsUUFBUCxRQUFzQmEsS0FBdEIsQ0FBNEIsSUFBNUIsRUFDUjVHLEdBRFEsQ0FDSDtBQUFBLGFBQVErRyxZQUFZTyxJQUFwQjtBQUFBLE1BREcsQ0FBYjtBQUVBcEgsZUFBVUEsUUFBUUssTUFBUixDQUFleUQsTUFBZixDQUFWO0FBQ0EsS0FMRCxNQU1LO0FBQ0pwQyxhQUFRMkYsSUFBUixDQUFhLDJCQUFiLEVBQTBDVixTQUExQztBQUNBM0csYUFBUXpCLElBQVIsQ0FBYSxlQUFhb0ksU0FBMUI7QUFDQTtBQUNELElBL0NEOztBQWlEQSxVQUFPSCxnQkFBZ0IsQ0FBdkIsRUFBMEI7QUFDekJ4RyxZQUFRekIsSUFBUixDQUFha0ksS0FBS2xILE1BQUwsQ0FBWSxDQUFaLEVBQWVpSCxnQkFBYyxDQUE3QixJQUFrQyxHQUEvQztBQUNBQTtBQUNBOztBQUVEOUUsV0FBUTRGLE9BQVIsQ0FBZ0IsaUJBQWhCO0FBQ0EsVUFBT3RILFFBQVFYLElBQVIsQ0FBYSxJQUFiLENBQVA7QUFDQTs7QUFFRDs7OztvQ0FDa0JXLE8sRUFBUztBQUMxQixRQUFLLElBQUlkLElBQUljLFFBQVF2QyxNQUFSLEdBQWlCLENBQTlCLEVBQWlDeUIsS0FBSyxDQUF0QyxFQUF5Q0EsR0FBekMsRUFBOEM7QUFDN0MsUUFBSWMsUUFBUWQsQ0FBUixNQUFlLEVBQW5CLEVBQXVCO0FBQ3ZCLFdBQU9BLElBQUksQ0FBWDtBQUNBO0FBQ0QsVUFBTyxDQUFQO0FBQ0E7O0FBRUQ7QUFDQTs7OztnQ0FDY2tELE0sRUFBUTtBQUNyQixPQUFJaUUsU0FBUyxLQUFLL0ksS0FBTCxDQUFXaUssVUFBWCxDQUFzQjVDLEtBQXRCLENBQTRCLElBQTVCLEVBQWtDdkMsTUFBbEMsQ0FBYjtBQUNBLE9BQUksQ0FBQ2lFLE1BQUwsRUFBYSxPQUFPakUsTUFBUDtBQUNiLFVBQU9BLE9BQU9vRixTQUFQLENBQWlCbkIsT0FBTzlDLE9BQVAsQ0FBZTlGLE1BQWhDLENBQVA7QUFDQTs7QUFFRjtBQUNBO0FBQ0E7O0FBRUM7QUFDQTs7OzswQkFDUTZELEksRUFBTTlELEksRUFBTTtBQUNuQjtBQUNBLE9BQUksQ0FBQ0EsS0FBSytILFFBQVYsRUFBb0IvSCxLQUFLK0gsUUFBTCxHQUFnQmpFLElBQWhCOztBQUVwQixPQUFJbUcsV0FBVyxLQUFLbkssS0FBTCxDQUFXZ0UsSUFBWCxDQUFmO0FBQ0EsT0FBSW1HLFFBQUosRUFBYztBQUNiLFFBQUksRUFBRUEsb0JBQW9CLGVBQUt4SCxZQUEzQixDQUFKLEVBQThDO0FBQzdDLFNBQUkrRixPQUFPdkUsS0FBWCxFQUFrQkMsUUFBUUMsR0FBUix1QkFBZ0NMLElBQWhDO0FBQ2xCLFVBQUtoRSxLQUFMLENBQVdnRSxJQUFYLElBQW1CLElBQUksZUFBS3JCLFlBQVQsQ0FBc0IsRUFBRXNGLFVBQVVqRSxJQUFaLEVBQWtCaEUsT0FBTyxDQUFDbUssUUFBRCxDQUF6QixFQUF0QixDQUFuQjtBQUNBO0FBQ0EsU0FBSUEsU0FBUzlILFFBQWIsRUFBdUIsS0FBS3JDLEtBQUwsQ0FBV2dFLElBQVgsRUFBaUIzQixRQUFqQixHQUE0QjhILFNBQVM5SCxRQUFyQztBQUN2QjtBQUNELFFBQUlxRyxPQUFPdkUsS0FBWCxFQUFrQkMsUUFBUUMsR0FBUixtQkFBNEJuRSxLQUFLK0gsUUFBakMsY0FBa0RqRSxJQUFsRCxVQUE2RDlELElBQTdEO0FBQ2xCLFNBQUtGLEtBQUwsQ0FBV2dFLElBQVgsRUFBaUJNLE9BQWpCLENBQXlCcEUsSUFBekI7QUFDQSxJQVRELE1BVUs7QUFDSixTQUFLRixLQUFMLENBQVdnRSxJQUFYLElBQW1COUQsSUFBbkI7QUFDQTs7QUFHRDtBQUNBLE9BQUksS0FBS2tLLG1CQUFMLENBQXlCcEcsSUFBekIsRUFBK0I5RCxJQUEvQixDQUFKLEVBQTBDO0FBQzVDO0FBQ0dBLFNBQUt5SCxhQUFMLEdBQXFCLElBQXJCO0FBQ0E7O0FBRUQsVUFBT3pILElBQVA7QUFDQTs7QUFFRDs7OztzQ0FDb0I4RCxJLEVBQU05RCxJLEVBQU07QUFDL0IsT0FBSSxFQUFFQSxnQkFBZ0IsZUFBS0wsUUFBdkIsQ0FBSixFQUFzQyxPQUFPLEtBQVA7QUFDeEM7QUFGaUM7QUFBQTtBQUFBOztBQUFBO0FBRy9CLHlCQUFvQkssS0FBS0YsS0FBekIsOEhBQWdDO0FBQUEsU0FBdkJxSyxPQUF1Qjs7QUFDL0I7QUFDQSxTQUFJQSxRQUFRbkgsUUFBWixFQUFzQjtBQUN0QixTQUFJbUgsbUJBQW1CLGVBQUs3RyxPQUF4QixJQUFtQzZHLFFBQVFuSyxJQUFSLEtBQWlCOEQsSUFBeEQsRUFBOEQsT0FBTyxJQUFQO0FBQzlELFlBQU8sS0FBUDtBQUNBO0FBUjhCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBUy9CLFVBQU8sS0FBUDtBQUNBOztBQUdGO0FBQ0E7QUFDQTs7QUFFQztBQUNBO0FBQ0E7QUFDQTs7OzttQ0FDd0JwQixNLEVBQVEwSCxVLEVBQVlDLFEsRUFBMEI7QUFBQSxPQUFoQmhLLFVBQWdCLHVFQUFILENBQUc7O0FBQ3JFLE9BQUlxQyxPQUFPckMsVUFBUCxNQUF1QitKLFVBQTNCLEVBQXVDLE1BQU0sSUFBSWhLLFdBQUosZ0JBQTZCZ0ssVUFBN0IsbUJBQXFEL0osVUFBckQsZ0JBQU47QUFDdkMsT0FBSWlLLFVBQVUsQ0FBZDtBQUNBLE9BQUlDLFNBQVMsS0FBYjtBQUNBLFFBQUssSUFBSS9KLFdBQVdILGFBQWEsQ0FBNUIsRUFBK0JDLFlBQVlvQyxPQUFPekMsTUFBdkQsRUFBK0RPLFdBQVdGLFNBQTFFLEVBQXFGRSxVQUFyRixFQUFpRztBQUNoRyxRQUFJb0MsUUFBUUYsT0FBT2xDLFFBQVAsQ0FBWjtBQUNBLFFBQUlvQyxVQUFVd0gsVUFBZCxFQUEwQjtBQUN6QkU7QUFDQUMsY0FBUyxJQUFUO0FBQ0E7QUFDRCxRQUFJM0gsVUFBVXlILFFBQWQsRUFBd0I7QUFDdkIsU0FBSUMsWUFBWSxDQUFoQixFQUNDLE9BQU8sRUFBRWpLLHNCQUFGLEVBQWNHLGtCQUFkLEVBQXdCMEIsT0FBT1EsT0FBT1IsS0FBUCxDQUFhN0IsYUFBVyxDQUF4QixFQUEyQkcsUUFBM0IsQ0FBL0IsRUFBcUUrSixjQUFyRSxFQUFQO0FBQ0REO0FBQ0E7QUFDRDtBQUNELFNBQU0sSUFBSWxLLFdBQUosOEJBQTJDaUssUUFBM0MsNEJBQTBFaEssVUFBMUUsQ0FBTjtBQUNBOztBQUdEO0FBQ0E7Ozs7OztBQU9BO0FBQ0E7QUFDQTt5Q0FDOEJ1QixNLEVBQVE7QUFDckMsVUFBT0EsT0FBT3NILEtBQVAsQ0FBYSxFQUFiLEVBQWlCNUcsR0FBakIsQ0FBcUIsVUFBVWtJLElBQVYsRUFBZ0I3RCxLQUFoQixFQUF1QjhELElBQXZCLEVBQTZCO0FBQ3hEO0FBQ0EsUUFBSUQsU0FBUyxJQUFiLEVBQW1CLE9BQU8sSUFBUDtBQUNuQjtBQUNBLFFBQUlBLFNBQVMsR0FBYixFQUFrQixPQUFPLE1BQVA7QUFDbEI7QUFDQSxRQUFJaEMsT0FBT2tDLHlCQUFQLENBQWlDRixJQUFqQyxLQUEwQ0MsS0FBSzlELFFBQU0sQ0FBWCxNQUFrQixJQUFoRSxFQUFzRSxPQUFPLE9BQUs2RCxJQUFaO0FBQ3RFO0FBQ0EsV0FBT0EsSUFBUDtBQUNBLElBVE0sRUFTSjNJLElBVEksQ0FTQyxFQVRELENBQVA7QUFVQTs7QUFFRDs7OzttQ0FDd0JELE0sRUFBUStJLEssRUFBTztBQUN0QyxVQUFPLElBQUl0RSxNQUFKLENBQVdtQyxPQUFPdkIsc0JBQVAsQ0FBOEJyRixNQUE5QixDQUFYLEVBQWtEK0ksS0FBbEQsQ0FBUDtBQUNBOzs7Ozs7QUFuUG1CbkMsTSxDQUVib0MsSyxHQUFRLEs7O0FBRktwQyxNLENBME5ia0MseUIsR0FBNkIsWUFBVztBQUM5QyxLQUFNRyxRQUFRLEVBQWQ7QUFDQSxxQkFBb0IzQixLQUFwQixDQUEwQixFQUExQixFQUE4QmhFLE9BQTlCLENBQXNDO0FBQUEsU0FBUTJGLE1BQU1MLElBQU4sSUFBYyxJQUF0QjtBQUFBLEVBQXRDO0FBQ0EsUUFBT0ssS0FBUDtBQUNBLENBSmtDLEU7O2tCQTFOZnJDLE07Ozs7Ozs7Ozs7Ozs7Ozs7O0FDWnJCOzs7O0FBQ0E7Ozs7Ozs7Ozs7K2VBTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBSUE7OztBQUdBO0FBQ0E7QUFDQTs7QUFDQSxxQkFBS3NDLFVBQUw7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQSxFQUEyQyxxQkFBSzVFLE9BQWhEO0FBQ0EsaUJBQU85QixPQUFQLENBQWUsWUFBZixFQUE2QixJQUFJLHFCQUFLMEcsVUFBVCxDQUFvQixFQUFFM0UsU0FBUyxLQUFYLEVBQWtCbkQsVUFBVSxJQUE1QixFQUFwQixDQUE3Qjs7QUFHQTtBQUNBO0FBQ0EscUJBQUsrSCxJQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUEsRUFBK0IscUJBQUs3RSxPQUFwQztBQUNBLElBQUlVLE9BQU8saUJBQU94QyxPQUFQLENBQWUsTUFBZixFQUF1QixJQUFJLHFCQUFLMkcsSUFBVCxDQUFjO0FBQy9DNUUsVUFBUyxjQURzQztBQUUvQztBQUNBa0MsV0FBVSxrQkFBU3ZDLE9BQVQsRUFBa0I7QUFDM0IsU0FBTyxLQUFLQyxPQUFMLENBQWFpRixPQUFiLENBQXFCLEtBQXJCLEVBQTRCLEdBQTVCLENBQVA7QUFDQTtBQUw4QyxDQUFkLENBQXZCLENBQVg7O0FBU0E7QUFDQTtBQUNBLHFCQUFLQyxVQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUEsRUFBMkMscUJBQUsvRSxPQUFoRDtBQUNBLElBQUlnRixhQUFhLGlCQUFPOUcsT0FBUCxDQUFlLFlBQWYsRUFBNkIsSUFBSSxxQkFBSzZHLFVBQVQsQ0FBb0I7QUFDakU5RSxVQUFTLGNBRHdEO0FBRWpFO0FBQ0FrQyxXQUFVLGtCQUFTdkMsT0FBVCxFQUFrQjtBQUMzQixTQUFPLEtBQUtDLE9BQUwsQ0FBYWlGLE9BQWIsQ0FBcUIsS0FBckIsRUFBNEIsR0FBNUIsQ0FBUDtBQUNBO0FBTGdFLENBQXBCLENBQTdCLENBQWpCO0FBT0EsaUJBQU81RyxPQUFQLENBQWUsWUFBZixFQUE2QjhHLFVBQTdCOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQU9wTCxLQUFQLENBQWFvTCxVQUFiLENBQXdCQyxjQUF4QixDQUNDLE9BREQsRUFDVSxPQURWLEVBQ21CLE9BRG5CLEVBQzRCLEtBRDVCLEVBQ21DLElBRG5DLEVBQ3lDLElBRHpDLEVBRUMsUUFGRCxFQUVXLFFBRlgsRUFFcUIsT0FGckIsRUFFOEIsU0FGOUIsRUFFeUMsUUFGekMsRUFFbUQsU0FGbkQsRUFFOEQsUUFGOUQsRUFFd0UsSUFGeEUsRUFHQyxTQUhELEVBR1ksTUFIWixFQUdvQixRQUhwQixFQUlDLE1BSkQsRUFJUyxPQUpULEVBSWtCLFNBSmxCLEVBSTZCLFFBSjdCLEVBS0MsS0FMRCxFQUtRLE1BTFIsRUFNQyxTQU5ELEVBT0MsR0FQRCxFQU9NLElBUE4sRUFPWSxNQVBaLEVBUUMsTUFSRCxFQVFTLE1BUlQsRUFTQyxJQVRELEVBU08sT0FUUCxFQVNnQixNQVRoQixFQVVDLE1BVkQsRUFVUyxLQVZULEVBV0MsSUFYRCxFQVdPLEtBWFAsRUFXYyxJQVhkLEVBV29CLE1BWHBCLEVBVzRCLFVBWDVCLEVBV3dDLEtBWHhDLEVBVytDLFNBWC9DLEVBVzBELE1BWDFELEVBWUMsT0FaRCxFQVlVLE9BWlYsRUFhQyxNQWJELEVBYVMsS0FiVCxFQWFnQixNQWJoQixFQWF3QixTQWJ4QixFQWFtQyxNQWJuQyxFQWEyQyxJQWIzQyxFQWFpRCxRQWJqRCxFQWEyRCxTQWIzRCxFQWNDLFdBZEQsRUFjYyxPQWRkLEVBY3VCLFlBZHZCLEVBY3FDLFFBZHJDLEVBYytDLE9BZC9DLEVBY3dELElBZHhELEVBYzhELE1BZDlELEVBY3NFLFFBZHRFLEVBZUMsUUFmRCxFQWVXLElBZlgsRUFnQkMsTUFoQkQsRUFnQlMsUUFoQlQsRUFnQm1CLFNBaEJuQjs7QUFtQkE7QUFDQSxpQkFBT3JMLEtBQVAsQ0FBYW9MLFVBQWIsQ0FBd0JDLGNBQXhCLENBQ0MsS0FERCxFQUVDLElBRkQsRUFFTyxNQUZQLEVBR0MsVUFIRCxFQUlDLEtBSkQsRUFJUSxNQUpSLEVBS0MsSUFMRCxFQU1DLFFBTkQsRUFPQyxLQVBELEVBT1EsTUFQUjs7QUFVQTtBQUNBLGlCQUFPckwsS0FBUCxDQUFhb0wsVUFBYixDQUF3QkMsY0FBeEIsQ0FDQyxNQURELEVBRUMsSUFGRCxFQUdDLFdBSEQsRUFJQyxPQUpEOztBQU9BO0FBQ0E7QUFDQSxxQkFBS0MsSUFBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQStCLHFCQUFLbEYsT0FBcEM7QUFDQSxpQkFBTzlCLE9BQVAsQ0FBZSxNQUFmLEVBQXVCLElBQUkscUJBQUtnSCxJQUFULENBQWM7QUFDcENqRixVQUFTLHFFQUQyQjtBQUVwQztBQUNBa0MsV0FBVSxrQkFBU3ZDLE9BQVQsRUFBa0I7QUFDM0IsTUFBSWpDLFFBQVEsS0FBS2tDLE9BQWpCO0FBQ0EsVUFBT2xDLEtBQVA7QUFDQztBQUNBLFFBQUssTUFBTDtBQUFjLFdBQU8sUUFBUDtBQUNkLFFBQUssV0FBTDtBQUFrQixXQUFPLFdBQVA7QUFDbEIsUUFBSyxRQUFMO0FBQWdCLFdBQU8sUUFBUDtBQUNoQixRQUFLLFNBQUw7QUFBaUIsV0FBTyxTQUFQO0FBQ2pCLFFBQUssU0FBTDtBQUFpQixXQUFPLFNBQVA7QUFDakIsUUFBSyxTQUFMO0FBQWlCLFdBQU8sU0FBUDtBQUNqQixRQUFLLFFBQUw7QUFBZ0IsV0FBTyxRQUFQO0FBQ2hCO0FBQ0MsV0FBT0EsTUFBTW1ILE9BQU4sQ0FBYyxLQUFkLEVBQXFCLEdBQXJCLENBQVA7QUFWRjtBQVlBO0FBakJtQyxDQUFkLENBQXZCO0FBbUJBLGlCQUFPbEwsS0FBUCxDQUFhdUwsSUFBYixDQUFrQkYsY0FBbEIsQ0FBaUMsR0FBakM7QUFDQSxpQkFBTy9HLE9BQVAsQ0FBZSxZQUFmLEVBQTZCLGlCQUFPdEUsS0FBUCxDQUFhdUwsSUFBMUM7O0FBR0E7QUFDQSxxQkFBS0MsTUFBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQW1DLHFCQUFLcEYsT0FBeEM7QUFDQSxJQUFJcUYsU0FBUyxpQkFBT25ILE9BQVAsQ0FBZSxRQUFmLEVBQXlCLElBQUkscUJBQUtrSCxNQUFULENBQWdCO0FBQ3JEbkYsVUFBUyxzQkFENEM7QUFFckQ7QUFDQWtDLFdBQVUsa0JBQVN2QyxPQUFULEVBQWtCO0FBQzNCLFNBQU8wRixXQUFXLEtBQUt6RixPQUFoQixFQUF5QixFQUF6QixDQUFQO0FBQ0E7QUFMb0QsQ0FBaEIsQ0FBekIsQ0FBYjtBQU9BLGlCQUFPM0IsT0FBUCxDQUFlLFlBQWYsRUFBNkJtSCxNQUE3Qjs7QUFHQTtBQUNBO0FBQ0E7QUFDQSxxQkFBS0UsT0FBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQXFDLHFCQUFLdkYsT0FBMUM7QUFDQSxpQkFBTzlCLE9BQVAsQ0FBZSxTQUFmLEVBQTBCLElBQUkscUJBQUtxSCxPQUFULENBQWlCO0FBQzFDdEYsVUFBUyxzQkFEaUM7QUFFMUM7QUFDQWtDLFdBQVUsa0JBQVN2QyxPQUFULEVBQWtCO0FBQzNCLFNBQU80RixTQUFTLEtBQUszRixPQUFkLEVBQXVCLEVBQXZCLENBQVA7QUFDQTtBQUx5QyxDQUFqQixDQUExQjs7QUFTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFLNEYsSUFBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQStCLHFCQUFLekYsT0FBcEM7QUFDQSxJQUFJMEYsT0FBTyxpQkFBT3hILE9BQVAsQ0FBZSxNQUFmLEVBQXVCLElBQUkscUJBQUt1SCxJQUFULENBQWM7QUFDL0N4RixVQUFTO0FBRHNDLENBQWQsQ0FBdkIsQ0FBWDtBQUdBLGlCQUFPL0IsT0FBUCxDQUFlLFlBQWYsRUFBNkJ3SCxJQUE3Qjs7QUFHQTtBQUNBO0FBQ0EscUJBQUtDLE9BQUw7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQSxFQUFxQyxxQkFBSzNGLE9BQTFDO0FBQ0EsSUFBSTRGLE9BQU8saUJBQU8xSCxPQUFQLENBQWUsU0FBZixFQUEwQixJQUFJLHFCQUFLeUgsT0FBVCxDQUFpQjtBQUNyRDFGLFVBQVMsaUNBRDRDO0FBRXJEa0MsV0FBVSxrQkFBU3ZDLE9BQVQsRUFBa0I7QUFDM0IsVUFBUSxLQUFLQyxPQUFiO0FBQ0MsUUFBSyxNQUFMO0FBQ0EsUUFBSyxLQUFMO0FBQ0EsUUFBSyxJQUFMO0FBQ0MsV0FBTyxJQUFQO0FBQ0Q7QUFDQyxXQUFPLEtBQVA7QUFORjtBQVFBO0FBWG9ELENBQWpCLENBQTFCLENBQVg7QUFhQSxpQkFBTzNCLE9BQVAsQ0FBZSxZQUFmLEVBQTZCMEgsSUFBN0I7QUFDQTtBQUNBO0FBQ0EsaUJBQU9oTSxLQUFQLENBQWFvTCxVQUFiLENBQXdCQyxjQUF4QixDQUNDLE1BREQsRUFDUyxPQURULEVBRUMsS0FGRCxFQUVRLElBRlIsRUFHQyxJQUhELEVBR08sUUFIUDs7QUFNQTtBQUNBLElBQUlWLE9BQU8saUJBQU9oRyxhQUFQLENBQ1YsY0FEVSxFQUVWLDZCQUZVO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSwwQkFRRGtDLEtBUkMsRUFRTTtBQUNkLE9BQUk4RCxPQUFPLEtBQUtqSSxPQUFoQjtBQUNBLE9BQUlpSSxJQUFKLEVBQVUsT0FBT0EsS0FBSzFFLE9BQUwsQ0FBYVksS0FBYixDQUFQO0FBQ1Y7QUFYUTtBQUFBO0FBQUEsMkJBYUFiLE9BYkEsRUFhUztBQUNqQixPQUFJMkUsT0FBTyxLQUFLakksT0FBaEI7QUFDQSxPQUFJLENBQUNpSSxJQUFMLEVBQVcsT0FBTyxJQUFQO0FBQ1YsVUFBT0EsS0FBS3BDLFFBQUwsQ0FBY3ZDLE9BQWQsQ0FBUDtBQUNEO0FBakJRO0FBQUE7QUFBQSxzQkFJSztBQUNiLFVBQU8seUdBQWMyRSxJQUFyQjtBQUNBO0FBTlE7O0FBQUE7QUFBQSxFQUdpQixxQkFBSy9GLFVBSHRCLEVBQVg7O0FBc0JBO0FBQ0E7QUFDQSxpQkFBT0QsYUFBUCxDQUNDLDBCQURELEVBRUMsb0JBRkQ7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLDJCQU9XcUIsT0FQWCxFQU9vQjtBQUNqQixPQUFJaUcsYUFBYSxLQUFLdkosT0FBTCxDQUFhNkYsUUFBYixDQUFzQnZDLE9BQXRCLENBQWpCO0FBQ0E7QUFDQSxPQUFJLE9BQU9pRyxVQUFQLEtBQXNCLFFBQXRCLElBQWtDQSxXQUFXakssVUFBWCxDQUFzQixHQUF0QixDQUFsQyxJQUFnRWlLLFdBQVdDLFFBQVgsQ0FBb0IsR0FBcEIsQ0FBcEUsRUFBOEYsT0FBT0QsVUFBUDtBQUM5RixnQkFBV0EsVUFBWDtBQUNBO0FBWkg7QUFBQTtBQUFBLHNCQUlnQjtBQUNiLFVBQU8sS0FBS2hHLE9BQUwsQ0FBYSxDQUFiLENBQVA7QUFDQTtBQU5IOztBQUFBO0FBQUEsRUFHd0MscUJBQUtyQixVQUg3QyxHOzs7Ozs7Ozs7Ozs7Ozs7OztBQ3RNQTtJQUNxQnVILFU7QUFDcEI7QUFDQSx1QkFBNEI7QUFBQTs7QUFBQTs7QUFBQSxvQ0FBYkMsV0FBYTtBQUFiQSxjQUFhO0FBQUE7O0FBQzNCQSxjQUFZaEgsT0FBWixDQUFvQixVQUFDaUgsR0FBRCxFQUFTO0FBQzVCLE9BQUksT0FBT0EsR0FBUCxLQUFlLFFBQW5CLEVBQTZCO0FBQzVCLFVBQUtQLElBQUwsR0FBWU8sR0FBWjtBQUNBLElBRkQsTUFHSyxJQUFJQSxHQUFKLEVBQVM7QUFDYjdNLFdBQU9DLE1BQVAsUUFBb0I0TSxHQUFwQjtBQUNBO0FBQ0QsR0FQRDs7QUFTQTtBQUNBLE1BQUksRUFBRSxVQUFVLElBQVosQ0FBSixFQUF1QixLQUFLUCxJQUFMLEdBQVksRUFBWjtBQUN2QixNQUFJLEVBQUUsZ0JBQWdCLElBQWxCLENBQUosRUFBNkIsS0FBS3ZMLFVBQUwsR0FBa0IsQ0FBbEI7QUFDN0I7O0FBRUQ7Ozs7O3dCQUNNc0YsSyxFQUFPO0FBQ1osVUFBTyxJQUFJc0csVUFBSixDQUFlLElBQWYsRUFBcUJ0RyxLQUFyQixDQUFQO0FBQ0E7O0FBRUQ7Ozs7NEJBQ1V0RixVLEVBQVk7QUFDckIsVUFBTyxLQUFLb0YsS0FBTCxDQUFXLEVBQUVwRixzQkFBRixFQUFYLENBQVA7QUFDQTs7QUFFRDs7Ozs0QkFDVUosTSxFQUFRO0FBQ2pCLFVBQU8sS0FBS3dGLEtBQUwsQ0FBVyxFQUFFcEYsWUFBWSxLQUFLQSxVQUFMLEdBQWtCSixNQUFoQyxFQUFYLENBQVA7QUFDQTs7QUFFRjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQztBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O3dCQUNNa0csTyxFQUFTO0FBQ2QsT0FBSSxFQUFFQSxtQkFBbUJFLE1BQXJCLENBQUosRUFBa0MsTUFBTSxJQUFJakIsU0FBSix1QkFBa0NlLE9BQWxDLHdCQUFOO0FBQ3BDO0FBQ0UsVUFBTyxLQUFLaUcsSUFBTCxDQUFVak0sS0FBVixDQUFnQmdHLE9BQWhCLEtBQTRCbEQsU0FBbkM7QUFDQTs7QUFFRDtBQUNBO0FBQ0E7Ozs7dUJBQ0trRCxPLEVBQVM7QUFDYixVQUFPQSxRQUFRa0IsSUFBUixDQUFhLEtBQUsrRSxJQUFsQixDQUFQO0FBQ0E7O0FBRUY7QUFDQTtBQUNBO0FBQ0M7Ozs7OztBQUtBOzBCQUNrRjtBQUFBLE9BQTVFL0wsVUFBNEUsdUVBQS9ELEtBQUtBLFVBQTBEO0FBQUEsT0FBOUNHLFFBQThDLHVFQUFuQyxLQUFLQSxRQUFMLElBQWlCLEtBQUtvTCxJQUFMLENBQVUzTCxNQUFROztBQUNqRixVQUFPLEtBQUsyTCxJQUFMLENBQVVTLFNBQVYsQ0FBb0JoTSxVQUFwQixFQUFnQ0csUUFBaEMsQ0FBUDtBQUNBOztBQUVEOzs7OzZCQVVXO0FBQ1YsVUFBTyxLQUFLb0wsSUFBWjtBQUNBOzs7c0JBckJVO0FBQ1YsVUFBTyxLQUFLbEYsS0FBTCxFQUFQO0FBQ0E7OztzQkFRWTtBQUNaLFVBQU8sS0FBS2tGLElBQUwsQ0FBVTNMLE1BQWpCO0FBQ0E7O0FBRUQ7Ozs7c0JBQ2M7QUFDYixVQUFPLEtBQUtJLFVBQUwsS0FBb0IsS0FBS0osTUFBaEM7QUFDQTs7Ozs7O2tCQS9FbUJnTSxVOzs7Ozs7Ozs7Ozs7O0FDRnJCOzs7O0FBSUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7OztBQU5BLGlDOzs7Ozs7Ozs7Ozs7UUNDZ0JLLFEsR0FBQUEsUTtRQWdCQUMsYyxHQUFBQSxjO0FBcEJoQjs7QUFFQTtBQUNBO0FBQ08sU0FBU0QsUUFBVCxDQUFrQkUsUUFBbEIsRUFBNEJDLE1BQTVCLEVBQW9DO0FBQzFDLFFBQU8sWUFBVztBQUNqQixNQUFJLEtBQUtELFFBQUwsTUFBbUJ2SixTQUF2QixFQUFrQztBQUNqQyxPQUFJWSxRQUFRNEksT0FBT0MsS0FBUCxDQUFhLElBQWIsQ0FBWjtBQUNBLE9BQUk3SSxVQUFVWixTQUFkLEVBQXlCO0FBQ3hCO0FBQ0EzRCxXQUFPOEcsY0FBUCxDQUFzQixJQUF0QixFQUE0Qm9HLFFBQTVCLEVBQXNDLEVBQUUzSSxZQUFGLEVBQVM4SSxjQUFjLElBQXZCLEVBQXRDO0FBQ0E7QUFDRDtBQUNELFNBQU8sS0FBS0gsUUFBTCxDQUFQO0FBQ0EsRUFURDtBQVVBOztBQUdEO0FBQ0E7QUFDTyxTQUFTRCxjQUFULENBQXdCQyxRQUF4QixFQUFrQ0MsTUFBbEMsRUFBMEM7QUFDaEQsUUFBTztBQUNORyxPQUFNTixTQUFTRSxRQUFULEVBQW1CQyxNQUFuQjtBQURBLEVBQVA7QUFHQSxDOzs7Ozs7Ozs7Ozs7Ozs7O0FDcEJEOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7K2VBTkE7QUFDQTtBQUNBOztBQU1BOzs7QUFHQTs7QUFDQSxpQkFBT2xJLFlBQVAsQ0FDQyxJQURELEVBRUMsd0NBRkQ7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLDJCQUlXdUIsT0FKWCxFQUlvQjtBQUFBLGtCQUNlLEtBQUt0RCxPQURwQjtBQUFBLE9BQ1h1SixVQURXLFlBQ1hBLFVBRFc7QUFBQSxPQUNDNUMsU0FERCxZQUNDQSxTQUREOztBQUVqQjRDLGdCQUFhQSxXQUFXMUQsUUFBWCxDQUFvQnZDLE9BQXBCLENBQWI7QUFDQXFELGVBQVlBLFlBQVlBLFVBQVVkLFFBQVYsQ0FBbUJ2QyxPQUFuQixDQUFaLEdBQTBDN0MsU0FBdEQ7O0FBRUEsT0FBSWtHLFNBQUosRUFBZSxnQkFBYzRDLFVBQWQsWUFBK0I1QyxTQUEvQjtBQUNmLG1CQUFjNEMsVUFBZDtBQUNBO0FBWEg7O0FBQUE7QUFBQSxFQUdtQixlQUFLdkgsU0FIeEI7O0FBZUEsaUJBQU9ELFlBQVAsQ0FDQyxjQURELEVBRUMsd0VBRkQ7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLDJCQUlXdUIsT0FKWCxFQUlvQjtBQUFBLG1CQUMyQixLQUFLdEQsT0FEaEM7QUFBQSxPQUNYdUosVUFEVyxhQUNYQSxVQURXO0FBQUEsT0FDQzVDLFNBREQsYUFDQ0EsU0FERDtBQUFBLE9BQ1kwRCxVQURaLGFBQ1lBLFVBRFo7O0FBRWpCZCxnQkFBYUEsV0FBVzFELFFBQVgsQ0FBb0J2QyxPQUFwQixDQUFiO0FBQ0FxRCxlQUFZQSxZQUFZQSxVQUFVZCxRQUFWLENBQW1CdkMsT0FBbkIsQ0FBWixHQUEwQzdDLFNBQXREO0FBQ0EsT0FBSTZKLGdCQUFnQkQsY0FBY0EsV0FBV3JLLE9BQVgsQ0FBbUIyRyxTQUFuQixDQUE2QmQsUUFBN0IsRUFBbEM7O0FBRUEsT0FBSXlFLGFBQUosRUFBbUIsZ0JBQWNmLFVBQWQsWUFBK0I1QyxTQUEvQixrQkFBcUQyRCxhQUFyRDtBQUNuQixtQkFBY2YsVUFBZCxZQUErQjVDLFNBQS9CO0FBQ0E7QUFaSDs7QUFBQTtBQUFBLEVBRzRCLGVBQUszRSxTQUhqQzs7QUFnQkEsaUJBQU9ELFlBQVAsQ0FDQyxTQURELEVBRUMsd0RBRkQ7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLDJCQUlXdUIsT0FKWCxFQUlvQjtBQUFBLG1CQUNlLEtBQUt0RCxPQURwQjtBQUFBLE9BQ1h1SixVQURXLGFBQ1hBLFVBRFc7QUFBQSxPQUNDNUMsU0FERCxhQUNDQSxTQUREOztBQUVqQjRDLGdCQUFhQSxXQUFXMUQsUUFBWCxDQUFvQnZDLE9BQXBCLENBQWI7QUFDQXFELGVBQVlBLFlBQVlBLFVBQVVkLFFBQVYsQ0FBbUJ2QyxPQUFuQixDQUFaLEdBQTBDN0MsU0FBdEQ7O0FBRUEsT0FBSWtHLFNBQUosRUFBZSxxQkFBbUI0QyxVQUFuQixZQUFvQzVDLFNBQXBDO0FBQ2Ysd0JBQW1CNEMsVUFBbkI7QUFDQTtBQVhIOztBQUFBO0FBQUEsRUFHdUIsZUFBS3ZILFNBSDVCOztBQWVBLGlCQUFPRCxZQUFQLENBQ0MsTUFERCxFQUVDLCtCQUZEO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSwyQkFJV3VCLE9BSlgsRUFJb0I7QUFBQSxPQUNYcUQsU0FEVyxHQUNHLEtBQUszRyxPQURSLENBQ1gyRyxTQURXOztBQUVqQkEsZUFBWUEsWUFBWUEsVUFBVWQsUUFBVixDQUFtQnZDLE9BQW5CLENBQVosR0FBMEM3QyxTQUF0RDs7QUFFQSxPQUFJa0csU0FBSixFQUFlLG1CQUFpQkEsU0FBakI7QUFDZjtBQUNBO0FBVkg7O0FBQUE7QUFBQSxFQUdxQixlQUFLM0UsU0FIMUIsRzs7Ozs7Ozs7Ozs7Ozs7O0FDdkRBOzs7O0FBQ0E7Ozs7Ozs7Ozs7K2VBSkE7QUFDQTtBQUNBOzs7QUFHQTs7O0FBSUE7O0lBQ011SSxnQjs7Ozs7Ozs7Ozs7MkJBQ0lqSCxPLEVBQVM7QUFBQSxrQkFDdUIsS0FBS3RELE9BRDVCO0FBQUEsT0FDWDBJLFVBRFcsWUFDWEEsVUFEVztBQUFBLE9BQ0N2RSxLQURELFlBQ0NBLEtBREQ7QUFBQSxPQUNRb0YsVUFEUixZQUNRQSxVQURSOztBQUVqQkEsZ0JBQWFBLFdBQVcxRCxRQUFYLENBQW9CdkMsT0FBcEIsQ0FBYjtBQUNBYSxXQUFRQSxNQUFNMEIsUUFBTixDQUFldkMsT0FBZixDQUFSO0FBQ0EsT0FBSSxPQUFPYSxLQUFQLEtBQWlCLFFBQXJCLEVBQStCO0FBQzlCLFFBQUlBLFFBQVEsQ0FBWixFQUFlO0FBQ2QsWUFBVW9GLFVBQVYsVUFBd0JwRixRQUFRLENBQWhDO0FBQ0EsS0FGRCxNQUdLO0FBQ0osK0JBQXdCb0YsVUFBeEIsVUFBdUNwRixLQUF2QztBQUNBO0FBQ0Q7QUFDRCxVQUFVb0YsVUFBVixTQUF3QnBGLEtBQXhCOztBQUVGO0FBQ0E7QUFDRTs7OztFQWpCNkIsZUFBS2pDLFU7O0FBb0JwQztBQUNBO0FBQ0E7QUFDQTs7O0FBQ0EsaUJBQU9ELGFBQVAsQ0FBcUIsa0JBQXJCLEVBQXlDLHFEQUF6QyxFQUFnR3NJLGdCQUFoRzs7SUFFTUMsTzs7Ozs7Ozs7OztFQUFnQixlQUFLbk0sTzs7QUFDM0IsaUJBQU9nRSxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDbUksT0FBdEMsRUFBK0MsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLFFBQTdCLEVBQXVDbUksT0FBdkMsRUFBZ0QsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQWhEO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDbUksT0FBdEMsRUFBK0MsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLFFBQTdCLEVBQXVDbUksT0FBdkMsRUFBZ0QsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQWhEO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDbUksT0FBdEMsRUFBK0MsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDbUksT0FBdEMsRUFBK0MsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLFNBQTdCLEVBQXdDbUksT0FBeEMsRUFBaUQsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQWpEO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLFFBQTdCLEVBQXVDbUksT0FBdkMsRUFBZ0QsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQWhEO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDbUksT0FBdEMsRUFBK0MsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDbUksT0FBdEMsRUFBK0MsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLEVBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0EsaUJBQU94RCxVQUFQLENBQWtCLFNBQWxCLEVBQTZCLGFBQTdCLEVBQTRDbUksT0FBNUMsRUFBcUQsRUFBRTNFLFVBQVU7QUFBQSxTQUFNLENB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QUFBQSxPQUNYb0YsVUFEVyxHQUNJLEtBQUsxSSxPQURULENBQ1gwSSxVQURXOztBQUVqQkEsZ0JBQWFBLFdBQVc3QyxRQUFYLENBQW9CdkMsT0FBcEIsQ0FBYjtBQUNBLG9CQUFlb0YsVUFBZjtBQUNBO0FBUkg7O0FBQUE7QUFBQSxFQUdtQyxxQkFBS3hHLFVBSHhDLEc7Ozs7OztBQ2xZQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsNENBQTRDOztBQUU1Qzs7Ozs7Ozs7Ozs7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxJQUFJK0ssMEJBQUo7QUFDQSxJQUFJLE9BQU9DLE1BQVAsS0FBa0IsV0FBdEIsRUFBbUM7QUFDbkM7QUFDQ0QscUJBQW9CQyxNQUFwQjtBQUNBOztBQUVELElBQUksT0FBT3JRLE1BQVAsS0FBa0IsV0FBdEIsRUFBbUM7QUFDbkM7QUFDQ0EsUUFBT3FRLE1BQVAsR0FBZ0JyUSxNQUFoQjtBQUNBb1EscUJBQW9CcFEsTUFBcEI7QUFDQTs7QUFFRCxJQUFJLE9BQU9zUSxJQUFQLEtBQWdCLFdBQXBCLEVBQWlDO0FBQ2pDO0FBQ0NBLE1BQUtELE1BQUwsR0FBY0MsSUFBZDtBQUNBRixxQkFBb0JFLElBQXBCO0FBQ0E7O0FBRUQ7a0JBQ2VGLGlCIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMTMpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIGI2YWYyNGRmNDNjZDI4OTU3ZjJlIiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJpbXBvcnQgeyBkZWZpbmVNZW1vaXplZCB9IGZyb20gXCIuL21lbW9pemUuanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIHJlLWV4cG9ydCBSdWxlIGZvciB0ZXN0aW5nXG5leHBvcnQgZGVmYXVsdCBSdWxlO1xuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbi8vIFRPRE86XHRVc2Uga2V5d29yZHMgaW4gc3ludGF4IHRvIG1ha2UgYSBxdWljayByZWdleC1iYXNlZCBgdGVzdGAgZnVuY3Rpb24gZm9yIHRoZSBlbnRpcmUgcnVsZVxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cbi8vIFRPRE86IGNvbnZlcnQgdG8gVGV4dFN0cmVhbSBwYXR0ZXJuIGFsYSBub3JtYWwgcGFyc2VyIG9uY2UgdGhhdCBzZXR0bGVzIGRvd24/Pz9cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbGFzdEluZGV4ID0gc3ludGF4U3RyZWFtLmxlbmd0aDtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKHJ1bGUpIHtcblx0XHRcdFx0bGV0IGxhc3QgPSBydWxlc1tydWxlcy5sZW5ndGgtMV07XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgU3RyaW5nYCBhbmQgbGFzdCB3YXMgYSBgU3RyaW5nYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0aWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG5cdFx0XHRcdFx0cnVsZXMucG9wKCk7XG5cdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG5cdFx0XHRcdFx0cnVsZSA9IFJ1bGUubWVyZ2VTeW1ib2xzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgS2V5d29yZGAgYW5kIGxhc3Qgd2FzIGFsc28gYSBgS2V5d29yZGAsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGVsc2UgaWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkKSB7XG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBsYXN0IHJ1bGVcblx0XHRcdFx0XHRydWxlcy5wb3AoKTtcblx0XHRcdFx0XHQvLyBhbmQgcmVwbGFjZSB3aXRoIGEgcnVsZSB0aGF0IG1lcmdlcyB0aGUga2V5d29yZHNcblx0XHRcdFx0XHRydWxlID0gUnVsZS5tZXJnZUtleXdvcmRzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJ1bGVzLnB1c2gocnVsZSk7XG5cdFx0XHR9XG5cdFx0XHRzdGFydEluZGV4ID0gZW5kSW5kZXggKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZXM7XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgc3ludGF4VG9rZW4gPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHQvLyBpZiB3ZSBnb3QgYSBcIlxcXFxcIiAod2hpY2ggYWxzbyBoYXMgdG8gZ28gaW50byB0aGUgc291cmNlIHN0cmluZyBhcyBcIlxcXFxcIilcblx0XHQvLyB0cmVhdCB0aGUgbmV4dCB0b2tlbiBhcyBhIGxpdGVyYWwgc3RyaW5nIHJhdGhlciB0aGFuIGFzIGEgc3BlY2lhbCBjaGFyYWN0ZXIuXG5cdFx0aWYgKHN5bnRheFRva2VuID09PSBcIlxcXFxcIikge1xuXHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N5bWJvbChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ICsgMSk7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChzeW50YXhUb2tlbikge1xuXHRcdFx0Y2FzZSBcIntcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIihcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCJbXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIqXCI6XG5cdFx0XHRjYXNlIFwiK1wiOlxuXHRcdFx0Y2FzZSBcIj9cIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cblx0XHRcdC8vIHRoZSBmb2xsb3dpbmcgc2hvdWxkIEFMV0FZUyBiZSBjb25zdW1lZCBieSB0aGUgYWJvdmVcblx0XHRcdGNhc2UgXCJ9XCI6XG5cdFx0XHRjYXNlIFwiKVwiOlxuXHRcdFx0Y2FzZSBcIl1cIjpcblx0XHRcdGNhc2UgXCJ8XCI6XG5cdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCAke3N5bnRheFRva2VufSBmb3VuZCBhcyBpdGVtICR7c3RhcnRJbmRleH0gb2YgJHt0aGlzLnN5bnRheH1gKTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0aWYgKHN5bnRheFRva2VuLm1hdGNoKFJ1bGUuS0VZV09SRF9QQVRURVJOKSkge1xuXHRcdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9rZXl3b3JkKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0S0VZV09SRF9QQVRURVJOIDogL1tBLVphLXpdKy8sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCwgY29uc3RydWN0b3IpIHtcblx0XHRsZXQgd29yZHMgPSBbXSwgZW5kSW5kZXg7XG5cdFx0Zm9yICh2YXIgaSA9IHN0YXJ0SW5kZXg7IGkgPCBzeW50YXhTdHJlYW0ubGVuZ3RoOyBpKyspIHtcblx0XHRcdGxldCBuZXh0ID0gc3ludGF4U3RyZWFtW2ldO1xuXHRcdFx0aWYgKG5leHQubWF0Y2goUnVsZS5LRVlXT1JEX1BBVFRFUk4pKSB7XG5cdFx0XHRcdHdvcmRzLnB1c2gobmV4dCk7XG5cdFx0XHRcdGVuZEluZGV4ID0gaTtcblx0XHRcdH1cblx0XHRcdGVsc2UgYnJlYWs7XG5cdFx0fVxuXG5cdFx0aWYgKCFjb25zdHJ1Y3RvcikgY29uc3RydWN0b3IgPSBSdWxlLktleXdvcmQ7XG5cdFx0bGV0IHJ1bGUgPSBuZXcgY29uc3RydWN0b3IoeyBzdHJpbmc6IHdvcmRzLmpvaW4oXCIgXCIpIH0pO1xuXG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3ltYm9sKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDAsIGNvbnN0cnVjdG9yID0gUnVsZS5TeW1ib2wpIHtcblx0XHRsZXQgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdGlmICghY29uc3RydWN0b3IpIGNvbnN0cnVjdG9yID0gUnVsZS5TeW1ib2w7XG5cdFx0bGV0IHJ1bGUgPSBuZXcgY29uc3RydWN0b3IoeyBzdHJpbmc6IHN0cmluZyB9KTtcblxuXHRcdC8vIElmIHN0cmluZyBzdGFydHMgd2l0aCBgXFxcXGAsIGl0J3MgYW4gZXNjYXBlZCBsaXRlcmFsIChlZzogYFxcW2AgbmVlZHMgdG8gaW5wdXQgYXMgYFxcXFxbYCkuXG5cdFx0aWYgKHN0cmluZy5zdGFydHNXaXRoKFwiXFxcXFwiKSkge1xuXHRcdFx0Ly8gcmVtb3ZlIGxlYWRpbmcgc2xhc2ggaW4gbWF0Y2ggc3RyaW5nLi4uXG5cdFx0XHRydWxlLnN0cmluZyA9IHJ1bGUuc3RyaW5nLnN1YnN0cigxKTtcblx0XHRcdC8vIGJ1dCBsZWF2ZSBpdCBpbiB0b1N0cmluZ1xuXHRcdFx0cnVsZS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcblx0XHR9XG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnRJbmRleCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdC8vIE5PVEU6IG5lc3RlZCBwYXJlbnMgbWF5IG5vdCBoYXZlIGFsdGVybmF0aXZlcy4uLiA6LSggICBgKGF8KGJ8YykpYCB3b24ndCB3b3JrPz8/XG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiKFwiLCBcIilcIiwgc3RhcnRJbmRleCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0Ly8gc3BsaXQgaW50byBncm91cHMsIGluY2x1ZGluZyBuZXN0ZWQgcGFyZW5zXG5cdFx0bGV0IGFsdGVybmF0aXZlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0aXZlcyhzbGljZSlcblx0XHRcdC5tYXAoZnVuY3Rpb24oZ3JvdXApIHtcblx0XHRcdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoZ3JvdXAsIFtdKTtcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHNbMF07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSdWxlLlNlcXVlbmNlKHsgcnVsZXM6IHJlc3VsdHMgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0bGV0IHJ1bGUgPSBhbHRlcm5hdGl2ZXMubGVuZ3RoID09PSAxID8gYWx0ZXJuYXRpdmVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0aXZlcyB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXG5cdFx0ZnVuY3Rpb24gZ3JvdXBBbHRlcm5hdGl2ZXModG9rZW5zKSB7XG5cdFx0XHRsZXQgYWx0ZXJuYXRpdmVzID0gW107XG5cdFx0XHRsZXQgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yIChsZXQgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XHRjdXJyZW50ID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaGFuZGxlIG5lc3RlZCBwYXJlbnNcblx0XHRcdFx0ZWxzZSBpZiAodG9rZW4gPT09IFwiKFwiKSB7XG5cdFx0XHRcdFx0bGV0IHsgZW5kSW5kZXggfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHRva2VucywgXCIoXCIsIFwiKVwiLCBpKTtcblx0XHRcdFx0XHRjdXJyZW50ID0gY3VycmVudC5jb25jYXQodG9rZW5zLnNsaWNlKGksIGVuZEluZGV4ICsgMSkpO1xuXHRcdFx0XHRcdGkgPSBlbmRJbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdXJyZW50LnB1c2godG9rZW4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoY3VycmVudC5sZW5ndGgpIGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0cmV0dXJuIGFsdGVybmF0aXZlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdGxldCBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblxuXHRcdGxldCBwYXJhbXMgPSB7IHJ1bGU6IG1hdGNoLnNsaWNlWzBdIH07XG5cblx0XHQvLyBzZWUgaWYgdGhlcmUncyBhIGBub3RgIHJ1bGUgaW4gdGhlcmVcblx0XHRsZXQgYmFuZ1Bvc2l0aW9uID0gcGFyYW1zLnJ1bGUuaW5kZXhPZihcIiFcIik7XG5cdFx0aWYgKGJhbmdQb3NpdGlvbiAhPT0gLTEpIHtcblx0XHRcdHBhcmFtcy5ub3QgPSBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSk7IC8vWyBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSkgXTtcblx0XHRcdHBhcmFtcy5ydWxlID0gcGFyYW1zLnJ1bGUuc3Vic3RyKDAsIGJhbmdQb3NpdGlvbik7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5TdWJydWxlKHBhcmFtcyk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgbWF0Y2guZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBsaXN0IGV4cHJlc3Npb24gYFs8aXRlbT48ZGVsaW1pdGVyPl1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCwgY29uc3RydWN0b3IgPSBSdWxlLkxpc3QpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJbXCIsIFwiXVwiLCBzdGFydEluZGV4KTtcblxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHNsaWNlLCBbXSk7XG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoICE9PSAyKSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgc3R1ZmYgYXQgZW5kIG9mIGxpc3Q6IFske3NsaWNlLmpvaW4oXCIgXCIpfV1gKTtcblx0XHR9XG5cdFx0bGV0IFsgaXRlbSwgZGVsaW1pdGVyIF0gPSByZXN1bHRzO1xuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgY29uc3RydWN0b3IoeyBpdGVtLCBkZWxpbWl0ZXIgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxufSk7XG5cblxuXG4vLyAjIyAgQWRkIG1ldGhvZHMgdG8gUGFyc2VyIHRvIGRlZmluZSBydWxlcyB1c2luZyB0aGUgYWJvdmUgc3ludGF4LlxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUGFyc2VyLnByb3RvdHlwZSwge1xuXG5cdC8vIFBhcnNlIGEgYHJ1bGVTeW50YXhgIHJ1bGUgYW5kIGFkZCBpdCB0byBvdXIgbGlzdCBvZiBydWxlcy5cblx0Ly8gUmV0dXJucyB0aGUgbmV3IHJ1bGUuXG5cdC8vIExvZ3MgcGFyc2luZyBlcnJvcnMgYnV0IGFsbG93cyB0aGluZ3MgdG8gY29udGludWUuXG5cdGFkZFNlcXVlbmNlOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAodHlwZW9mIGNvbnN0cnVjdG9yICE9PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHByb3BlcnRpZXMgPSBjb25zdHJ1Y3Rvcjtcblx0XHRcdGNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZTtcblx0XHR9XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgY29uc3RydWN0b3IpO1xuXHRcdFx0Ly8gUmVmbGVjdCB0aGUgcnVsZSBiYWNrIG91dCB0byBtYWtlIHN1cmUgaXQgbG9va3MgKG1vcmUgb3IgbGVzcykgdGhlIHNhbWVcblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRlZCBydWxlICcke25hbWV9JzpcXG4gIElOUFVUOiAke3J1bGVTeW50YXh9IFxcbiBPVVRQVVQ6ICR7cnVsZX1gKTtcblxuLy9jb25zb2xlLmluZm8obmFtZSwgY29uc3RydWN0b3IsIHJ1bGUpO1xuXHRcdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0fVxuXHR9fSxcblxuXHRhZGRTdGF0ZW1lbnQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5TdGF0ZW1lbnQsIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgcnVsZSA9IHRoaXMuYWRkU2VxdWVuY2UobmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRFeHByZXNzaW9uOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuRXhwcmVzc2lvbiwgcHJvcGVydGllcykge1xuXHRcdGxldCBydWxlID0gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRMaXN0OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuTGlzdCwgcHJvcGVydGllcykge1xuXHRcdGxldCBzdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChydWxlU3ludGF4KTtcblx0XHRsZXQgcnVsZSA9IChSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN0cmVhbSwgW10sIDAsIGNvbnN0cnVjdG9yKSB8fCBbXSlbMF07XG5cdFx0aWYgKCFydWxlKSByZXR1cm47XG5cdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fX0sXG5cblx0YWRkS2V5d29yZDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLktleXdvcmQsIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgc3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgocnVsZVN5bnRheCk7XG5cdFx0bGV0IHJ1bGUgPSAoUnVsZS5wYXJzZVJ1bGVTeW50YXhfa2V5d29yZChzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pWzBdO1xuXHRcdGlmICghcnVsZSkgcmV0dXJuO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZFN5bWJvbDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlN5bWJvbCwgcHJvcGVydGllcykge1xuXHRcdC8vIFRPRE86IGFzc3VtZSB3ZSBqdXN0IGhhdmUgb25lIHN5bWJvbCBvZiBtYW55IGxldHRlcnMuLi5cblx0XHRsZXQgc3RyZWFtID0gW3J1bGVTeW50YXhdO1xuXHRcdGxldCBydWxlID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X3N5bWJvbChzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pWzBdO1xuXHRcdGlmICghcnVsZSkgcmV0dXJuO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdC8vIEFkZCBwb3N0Zml4IG9wZXJhdG9yLCBzdWNoIGFzIFwiYSBpcyBkZWZpbmVkXCJcblx0Ly8gTk9URTogaWYgeW91IGhhdmUgbW9yZSB0aGFuIG9uZSBtYXRjaGluZyBvcGVyYXRvcixcblx0Ly9cdFx0IHBhc3MgaW4gYW4gYXJyYXkgb2Ygc2ltcGxlIHN0cmluZ3Mgc28gYWxsIG9mIG91ciBvcGVyYXRvcnMgYXJlIHNpbXBsZSBzdHJpbmdzLlxuXHRhZGRQb3N0Zml4T3BlcmF0b3I6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSkge1xuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRQb3N0Zml4T3BlcmF0b3IobmFtZSwgc3ludGF4LCBwcm9wZXJ0aWVzKSk7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmFkZFNlcXVlbmNlKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudG9KUykge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBwb3N0Zml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBjbGVhciBsaXN0IG9mIGluZml4IG9wZXJhdG9ycyBmb3IgZ2V0dGVyIGJlbG93XG5cdFx0XHRkZWxldGUgdGhpcy5fX3Bvc3RmaXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwicG9zdGZpeF9vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH19LFxuXG5cdC8vIExpc3Qgb2YgcG9zdGZpeCBvcGVyYXRvcnMgYXMgc3RyaW5ncy5cblx0Ly8gUmUtbWVtb2l6ZWQgYWZ0ZXIgYGFkZEluZml4T3BlcmF0b3JgIGFib3ZlLlxuXHRwb3N0Zml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9fcG9zZml4T3BlcmF0b3JzXCIsXG5cdFx0ZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXMucnVsZXNbXCJwb3N0Zml4X29wZXJhdG9yXCJdXG5cdFx0XHRcdFx0XHQmJiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZyk7XG5cdH0pXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlU3ludGF4LmpzIiwiLy9cdCMgUGFyc2VyIFJ1bGVzXG4vL1x0UnVsZXMgY2FuIGJlIGFzIHNpbXBsZSBhcyBhIHN0cmluZyBgS2V5d29yZGAgb3IgYSBjb21wbGV4IHNlcXVlbmNlIG9mIChuZXN0ZWQpIHJ1bGVzLlxuLy9cbi8vXHRQYXJzZSBhIHJ1bGUgd2l0aCBgcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSlgLCB0aGlzIHdpbGwgZWl0aGVyOlxuLy9cdFx0LSByZXR1cm4gYHVuZGVmaW5lZGAgaWYgdGhlIHJ1bGUgZG9lc24ndCBtYXRjaCB0aGUgaGVhZCBvZiB0aGUgc3RyZWFtLCBvclxuLy9cdFx0LSByZXR1cm4gYSBDTE9ORSBvZiB0aGUgcnVsZSB3aXRoIGF0IGxlYXN0IHRoZSBmb2xsb3dpbmc6XG4vL1x0XHRcdC0gYHN0cmVhbWBcdFx0U3RyZWFtIHdoaWNoIHdhcyBtYXRjaGVkIHdpdGggYHN0YXJ0SW5kZXhgIGF0IHRoZSBzdGFydCBvZiB0aGUgbWF0Y2hcbi8vXHRcdFx0LSBgZW5kSW5kZXhgXHROb24taW5jbHVzaXZlIGVuZCBpbmRleCBpbiBzdHJlYW0gd2hlcmUgbWF0Y2ggZW5kcy5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLnJlc3VsdHNgXHRcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZShjb250ZXh0KWBcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBSdWxlIHx8ICF0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShcImNvbnN0cnVjdG9yXCIpKSB7XG4vL2NvbnNvbGUud2FybihcIm5vdCBydWxlXCIsIHRoaXMpO1xuXHRcdH1cblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXHR9XG5cblx0Ly8gQ2xvbmUgdGhpcyBydWxlIGFuZCBhZGQgYW55IGBwcm9wc2AgcGFzc2VkIGluLlxuXHRjbG9uZSguLi5wcm9wcykge1xuXHRcdGxldCBjbG9uZSA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG5cdFx0T2JqZWN0LmFzc2lnbihjbG9uZSwgLi4ucHJvcHMpO1xuXHRcdHJldHVybiBjbG9uZTtcblx0fVxuXG5cdC8vIEZvciBhIHJ1bGUgaW5zdGFuY2UgYXNzb2NpYXRlZCB3aXRoIGEgc3RyZWFtLFxuXHQvLyByZXR1cm4gYSBuZXcgc3RyZWFtIEFGVEVSIHRoaXMgcnVsZSdzIGVuZC5cblx0bmV4dCgpIHtcblx0XHRpZiAoIXRoaXMuc3RyZWFtIHx8IHRoaXMuZW5kSW5kZXggPT09IHVuZGVmaW5lZClcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYHJ1bGUubmV4dCgpIGNhbGxlZCBvbiBydWxlIHdpdGhvdXQgYSBzdHJlYW1gLCB0aGlzKTtcblx0XHRyZXR1cm4gdGhpcy5zdHJlYW0uYWR2YW5jZVRvKHRoaXMuZW5kSW5kZXgpO1xuXHR9XG5cbi8vXG4vL1x0UGFyc2luZyBwcmltaXRpdmVzIC0tIHlvdSBNVVNUIGltcGxlbWVudCB0aGVzZSBpbiB5b3VyIHN1YmNsYXNzZXMhXG4vL1xuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBydWxlIGluIHRoZSBgc3RyZWFtYC5cblx0Ly8gUmV0dXJucyByZXN1bHRzIG9mIHRoZSBwYXJzZSBvciBgdW5kZWZpbmVkYC5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIElzIHRoaXMgcnVsZSBkZXRlcm1pbmlzdGljLCBlZzogY2FuIGl0IGJlIHF1aWNrbHkgYW5kIHVuYW1iaWd1b3VzbHkgc2F0aXNmaWVkP1xuXHQvLyBSZXR1cm5pbmcgYHRydWVgIGNhbiBzcGVlZCB1cCBzZXF1ZW5jZSBwcm9jZXNzaW5nLFxuXHQvL1x0YnV0IGlmIHlvdSdyZSByZWFsbHkgbm90IHN1cmUsIHJldHVybiBgdW5kZWZpbmVkYC5cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGJpdHMgb2Ygb3VyIHJ1bGUgYXJlIGZvdW5kIEFOWVdIRVJFIGluIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIGB1bmRlZmluZWRgIGlmIG5vdCBkZXRlcm1pbnN0aWMgKGJ1dCBhbGwgcGF0dGVybnMgYXJlIGRldGVybWluaXN0aWMpXG5cdC8vXHQtIHJlZ2V4IG1hdGNoIGlmIGZvdW5kLFxuXHQvL1x0LSBgZmFsc2VgIGlmIG5vdCBmb3VuZFxuXHR0ZXN0KHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIERvZXMgdGhlIHBhcnNlIGBzdGFja2AgYWxyZWFkeSBjb250YWluIGBydWxlYD9cblx0c3RhdGljIHN0YWNrQ29udGFpbnMoc3RhY2ssIHJ1bGUsIHN0cmVhbSkge1xuXHRcdGlmIChzdGFjay5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcblxuLy9jb25zb2xlLmluZm8oc3RhY2spO1xuXHRcdC8vIGdvIGJhY2t3YXJkc1xuXHRcdGZvciAodmFyIGkgPSBzdGFjay5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0bGV0IFsgbmV4dFJ1bGUsIG5leHRTdHJlYW0gXSA9IHN0YWNrW2ldO1xuXHRcdFx0aWYgKG5leHRSdWxlID09PSBydWxlKSB7XG5cdFx0XHRcdGlmIChuZXh0U3RyZWFtLnN0YXJ0SW5kZXggPT09IHN0cmVhbS5zdGFydEluZGV4KSB7XG4vL1x0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJmb3VuZCB1bnByb2R1Y3RpdmUgcnVsZSBcIiwgcnVsZSwgXCIgb24gc3RhY2tcIiwgc3RhY2spO1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuLy9cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiZm91bmQgcHJvZHVjdGl2ZSBydWxlIFwiLCBydWxlLCBcIiBvbiBzdGFja1wiLCBzdGFjayk7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG4vL1xuLy8gIyMgb3V0cHV0IGFzIHNvdXJjZVxuLy9cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gTk9URTogeW91IG1heSB3YW50IHRvIG1lbW9pemUgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0Ly8gT3V0cHV0IHZhbHVlIGZvciB0aGlzIElOU1RBTlRJQVRFRCBydWxlIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQ7XG5cdH1cblxuLy9cbi8vICMjIGdyb3VwOiByZWZsZWN0aW9uXG4vL1xuXHRnZXQgcnVsZVR5cGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0fVxufVxuXG5cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vXG4vLyBOT1RFXHRUbyBtYWtlIHRoaXMgbW9yZSBnZW5lcmFsbHkgYXBwbGljYWJsZSwgZG8gTk9UIHN0YXJ0IHRoZSBwYXR0ZXJuIHdpdGggYSBgXmAuXG4vL1x0XHRXZSdsbCBhdXRvbWF0aWNhbGx5IG1ha2UgYSBjb3B5IG9mIHRoZSBSZWdFeHAgd2l0aCB0aGUgc3RhcnQgcG9pbnQgYXR0YWNoZWRcbi8vXHRcdGFuZCB1c2UgdGhhdCBhcyBhcHByb3ByaWF0ZS5cbi8vXG4vL1x0XHRUaGlzIHdheSB3ZSBjYW4gcmUtdXNlIHRoZSByZWdleCB0byBjaGVjayBmb3IgYSBtYXRjaCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBzdHJlYW0uLi5cbi8vXG4vLyBZb3UgY2FuIG9wdGlvbmFsbHkgc3BlY2lmeSBhIGBydWxlLmJsYWNrbGlzdGAsIGEgc2V0IG9mIG1hdGNoZXMgd2hpY2ggd2lsbCBzcGVjaWZpY2FsbHkgTk9UIHdvcmssXG4vL1x0ZWcgZm9yIGBpZGVudGlmaWVyLlxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHBhdHRlcm5gIGlzIHJlcXVpcmVkXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5QYXR0ZXJuKCk6IFlvdSBtdXN0IHBhc3MgYSBgcGF0dGVybmAgcGFyYW1ldGVyXCIpO1xuXG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cblx0XHQvLyBDcmVhdGUgYSBgc3RhcnRQYXR0ZXJuYCB0byBtYXRjaCBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJvbmdcblx0XHQvLyBDcmVhdGUgbm9uLWVudW1lcmFibHkuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic3RhcnRQYXR0ZXJuXCIsIHsgdmFsdWU6IG5ldyBSZWdFeHAoXCJeXCIgKyB0aGlzLnBhdHRlcm4uc291cmNlKSB9KTtcblx0fVxuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBwYXR0ZXJuIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0bGV0IG1hdGNoID0gc3RyZWFtLm1hdGNoKHRoaXMuc3RhcnRQYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYmFpbCBpZiBwcmVzZW50IGluIGJsYWNrbGlzdFxuXHRcdGxldCBtYXRjaGVkID0gbWF0Y2hbMF07XG5cdFx0aWYgKHRoaXMuYmxhY2tsaXN0ICYmIHRoaXMuYmxhY2tsaXN0W21hdGNoZWRdKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IGVuZEluZGV4ID0gc3RyZWFtLnN0YXJ0SW5kZXggKyBtYXRjaGVkLmxlbmd0aDtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIGVuZEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBQYXR0ZXJucyBhcmUgQUxXQVlTIGRldGVybWluaXN0aWMuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYW55IG9mIG91ciBwYXR0ZXJuaXMgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYyAoYnV0IGFsbCBwYXR0ZXJucyBhcmUgZGV0ZXJtaW5pc3RpYylcblx0Ly9cdC0gcmVnZXggbWF0Y2ggaWYgZm91bmQsXG5cdC8vXHQtIGBmYWxzZWAgaWYgbm90IGZvdW5kXG5cdHRlc3QocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5wYXR0ZXJuKTtcblx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdG1hdGNoLmVuZEluZGV4ID0gKG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoKTtcblx0XHRcdHJldHVybiBtYXRjaDtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0YWRkVG9CbGFja2xpc3QoLi4ud29yZHMpIHtcblx0XHRpZiAoIXRoaXMuYmxhY2tsaXN0KSB0aGlzLmJsYWNrbGlzdCA9IHt9O1xuXHRcdHdvcmRzLmZvckVhY2god29yZCA9PiB0aGlzLmJsYWNrbGlzdFt3b3JkXSA9IHRydWUpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMucGF0dGVybi5zb3VyY2U7XG5cdH1cbn1cblxuLy8gUnVsZSBmb3IgbGl0ZXJhbCBzdHJpbmcgdmFsdWUsIHdoaWNoIGluY2x1ZGUgcHVuY3R1YXRpb24gc3VjaCBhcyBgKGAgZXRjLlxuLy8gYFN5bWJvbGBzIGFyZSBkaWZmZXJlbnQgZnJvbSBgS2V5d29yZHNgIGluIHRoYXQgdGhleSBkbyBub3QgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkuXG4vL1RPRE86IHJlbmFtZSBgU3ltYm9sYD8/P1xuUnVsZS5TeW1ib2wgPSBjbGFzcyBTeW1ib2wgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHN0cmluZ2AgaXMgcmVxdWllZC5cblx0XHRpZiAoIXByb3BlcnRpZXMuc3RyaW5nKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuU3ltYm9sKCk6IEV4cGVjdGVkIHN0cmluZyBwcm9wZXJ0eVwiKTtcblxuXHRcdC8vIGNvbnZlcnQgc3RyaW5nIHRvIHBhdHRlcm5cblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikge1xuXHRcdFx0cHJvcGVydGllcy5wYXR0ZXJuID0gUGFyc2VyLlJlZ0V4cEZyb21TdHJpbmcocHJvcGVydGllcy5zdHJpbmcpO1xuLy9jb25zb2xlLmluZm8ocHJvcGVydGllcy5zdHJpbmcsIHByb3BlcnRpZXMucGF0dGVybik7XG5cdFx0fVxuXG4vL1x0XHRjb25zb2xlLmluZm8oXCJjcmVhdGluZyBzdHJpbmdcIiwgcHJvcGVydGllcyk7XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdH1cblxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cbi8vIE1lcmdlIHR3byBTeW1ib2wgcnVsZXMgdG9nZXRoZXIsIHJldHVybmluZyBhIG5ldyBydWxlIHRoYXQgbWF0Y2hlcyBib3RoLlxuUnVsZS5tZXJnZVN5bWJvbHMgPSBmdW5jdGlvbihmaXJzdCwgc2Vjb25kKSB7XG5cdC8vIEdldCBjdXN0b20gY29uc3RydWN0b3IgaWYgdGhlcmUgaXMgb25lLi4uXG5cdGxldCBjb25zdHJ1Y3RvciA9IGZpcnN0LmNvbnN0cnVjdG9yICE9PSBSdWxlLlN5bWJvbCA/IGZpcnN0LmNvbnN0cnVjdG9yIDogc2Vjb25kLmNvbnN0cnVjdG9yO1xuXHRyZXR1cm4gbmV3IGNvbnN0cnVjdG9yKHsgc3RyaW5nOiBmaXJzdC5zdHJpbmcgKyBzZWNvbmQuc3RyaW5nIH0pO1xufVxuXG4vLyBLZXl3b3JkIHBhdHRlcm4uXG4vLyBQcm9wZXJ0aWVzOlxuLy9cdC0gYHJ1bGUuc3RyaW5nYCBcdChyZXF1aXJlZCkgXHRLZXl3b3JkIHN0cmluZyB0byBtYXRjaC5cbi8vXHQtIGBydWxlLnBhdHRlcm5gXHQob3B0aW9uYWwpIFx0UmVnRXhwIGZvciB0aGUgbWF0Y2guXG4vL1x0XHRcdFx0XHRcdFx0XHRcdFdlJ2xsIGNyZWF0ZSBvbmUgZnJvbSBgc3RyaW5nYCBpZiBuZWNlc3NhcnkuXG4vL1x0XHRcdFx0XHRcdFx0XHRcdE5PVEU6IGRvIE5PVCBzdGFydCB0aGUgYHBhdHRlcm5gIHdpdGggYF5gLlxuUnVsZS5LZXl3b3JkID0gY2xhc3MgS2V5d29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgc3RyaW5nYCBpcyByZXF1aWVkLlxuXHRcdGlmICghcHJvcGVydGllcy5zdHJpbmcpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5LZXl3b3JkKCk6IEV4cGVjdGVkIHN0cmluZyBwcm9wZXJ0eVwiKTtcblxuXHRcdC8vIGRlcml2ZSBgcGF0dGVybmAgaWYgbmVjZXNzYXJ5LlxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB7XG5cdFx0XHQvLyBlbmZvcmNlIHdvcmQgYm91bmRhcmllcyBhbmQgYWxsb3cgYXJiaXRyYXJ5IHNwYWNlIGJldHdlZW4gd29yZHNcblx0XHRcdGxldCBwYXR0ZXJuU3RyaW5nID0gUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMocHJvcGVydGllcy5zdHJpbmcpO1xuXHRcdFx0cHJvcGVydGllcy5wYXR0ZXJuID0gbmV3IFJlZ0V4cChcIlxcXFxiXCIgKyBwYXR0ZXJuU3RyaW5nICsgXCJcXFxcYlwiKTtcblx0XHR9XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cbi8vIE1lcmdlIHR3byBLZXl3b3JkIHJ1bGVzIHRvZ2V0aGVyLCBhZGRpbmcgdGhlIHNlY29uZCB0byB0aGUgZmlyc3QuXG5SdWxlLm1lcmdlS2V5d29yZHMgPSBmdW5jdGlvbihmaXJzdCwgc2Vjb25kKSB7XG5cdC8vIEdldCBjdXN0b20gY29uc3RydWN0b3IgaWYgdGhlcmUgaXMgb25lLi4uXG5cdGxldCBjb25zdHJ1Y3RvciA9IGZpcnN0LmNvbnN0cnVjdG9yICE9PSBSdWxlLktleXdvcmQgPyBmaXJzdC5jb25zdHJ1Y3RvciA6IHNlY29uZC5jb25zdHJ1Y3Rvcjtcblx0cmV0dXJuIG5ldyBjb25zdHJ1Y3Rvcih7IHN0cmluZzogZmlyc3Quc3RyaW5nICsgXCIgXCIgKyBzZWNvbmQuc3RyaW5nIH0pO1xufVxuXG5cbi8vIFN1YnJ1bGUgLS0gbmFtZSBvZiBhbm90aGVyIHJ1bGUgdG8gYmUgY2FsbGVkLlxuLy8gYHJ1bGUucnVsZWAgaXMgdGhlIG5hbWUgb2YgdGhlIHJ1bGUgaW4gYHBhcnNlci5ydWxlc2AuXG5SdWxlLlN1YnJ1bGUgPSBjbGFzcyBTdWJydWxlIGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnJ1bGUsIFwicnVsZVwiKTtcblx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayk7XG5cdFx0aWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSBtYXRjaC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0cmV0dXJuIG1hdGNoO1xuXHR9XG5cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZU9yRGllKHRoaXMucnVsZSwgXCJydWxlXCIpO1xuXHRcdHJldHVybiBydWxlLmlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSk7XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIGFsdGVybmF0aXZlcyBhcmUgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gcmVnZXggbWF0Y2ggaWYgZm91bmQsXG5cdC8vXHQtIGBmYWxzZWAgaWYgbm90IGZvdW5kIG9yXG5cdC8vXHQtIGB1bmRlZmluZWRgIGlmIG5vdCBkZXRlcm1pbnN0aWMuXG5cdHRlc3QocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy5ydWxlLCBcInJ1bGVcIik7XG5cdFx0cmV0dXJuIHJ1bGUudGVzdChwYXJzZXIsIHN0cmVhbSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYHske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZX19JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cblxuLy8gQWJzdHJhY3Q6ICBgTmVzdGVkYCBydWxlIC0tIGNvbXBvc2VkIG9mIGEgc2VyaWVzIG9mIG90aGVyIGBydWxlc2AuXG5SdWxlLk5lc3RlZCA9IGNsYXNzIE5lc3RlZCBleHRlbmRzIFJ1bGUge1xuXG5cdC8vIElzIHRoaXMgZGV0ZXJtaW5pc3RpYywgZWc6IGFyZSBvdXIgc3VicnVsZXMgdW5hbWJpZ291c2x5IGRldGVybWluYWJsZT9cbi8vVE9ETzogbWVtb2l6ZT9cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXMuZXZlcnkocnVsZSA9PiBydWxlLmlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkpO1xuXHR9XG59XG5cblxuLy8gU2VxdWVuY2Ugb2YgcnVsZXMgdG8gbWF0Y2ggKGF1dG8tZXhjbHVkaW5nIHdoaXRlc3BhY2UpLlxuUnVsZS5TZXF1ZW5jZSA9IGNsYXNzIFNlcXVlbmNlIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2sgPSBbXSkge1xuXHRcdC8vIElmIHdlIGhhdmUgYSBgdGVzdFJ1bGVgIGRlZmluZWRcblx0XHRpZiAodGhpcy50ZXN0UnVsZSkge1xuXHRcdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZU9yRGllKHRoaXMudGVzdFJ1bGUsIFwidGVzdFJ1bGVcIik7XG5cdFx0XHRpZiAocnVsZS50ZXN0KHBhcnNlciwgc3RyZWFtKSA9PT0gZmFsc2UpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCBzdHJlYW1dKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaHVua2l0KSByZXR1cm4gdGhpcy5wYXJzZUluQ2h1bmtzKHBhcnNlciwgc3RyZWFtLCBzdGFjayk7XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghbWF0Y2ggJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdFx0bmV4dCA9IG1hdGNoLm5leHQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuLy8gXHRwYXJzZUluQ2h1bmtzKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuLy9cbi8vIFx0fVxuXG4vL1RPRE9DXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYG1hdGNoZWRgIGFycmF5IGluZGV4ZWQgYnlcblx0Ly9cdFx0LSBgbWF0Y2guYXJndW1lbnRgOlx0XHRhcmd1bWVudCBzZXQgd2hlbiBydWxlIHdhcyBkZWNsYXJlZCwgZWc6IGB7dmFsdWU6bGl0ZXJhbH1gID0+IGB2YWx1ZWBcblx0Ly9cdFx0LSBgbWF0Y2gucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gYHJ1bGUgdHlwZWA6XHRcdFx0XHRuYW1lIG9mIHRoZSBydWxlIHR5cGVcblx0Ly8gTk9URTogbWVtb2l6ZXMgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCByZXN1bHRzID0ge307XG5cdFx0Zm9yIChsZXQgbWF0Y2ggb2YgdGhpcy5tYXRjaGVkKSB7XG5cdFx0XHRsZXQgYXJnTmFtZSA9IG1hdGNoLmFyZ3VtZW50IHx8IG1hdGNoLnJ1bGVOYW1lIHx8IG1hdGNoLmNvbnN0cnVjdG9yLm5hbWU7XG5cblx0XHRcdC8vIElmIGFyZyBhbHJlYWR5IGV4aXN0cywgY29udmVydCB0byBhbiBhcnJheVxuXHRcdFx0aWYgKGFyZ05hbWUgaW4gcmVzdWx0cykge1xuXHRcdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkocmVzdWx0c1thcmdOYW1lXSkpIHJlc3VsdHNbYXJnTmFtZV0gPSBbcmVzdWx0c1thcmdOYW1lXV07XG5cdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0ucHVzaChtYXRjaCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0cmVzdWx0c1thcmdOYW1lXSA9IG1hdGNoO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0cztcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnJ1bGVzLmpvaW4oXCIgXCIpfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cblxufVxuXG4vLyBTeW50YWN0aWMgc3VnYXIgZm9yIGRlYnVnZ2luZ1xuUnVsZS5FeHByZXNzaW9uID0gY2xhc3MgZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBTdGF0ZW1lbnRzIHRha2UgdXAgdGhlIGVudGlyZSBsaW5lLlxuUnVsZS5TdGF0ZW1lbnQgPSBjbGFzcyBzdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gQWx0ZXJuYXRpdmUgc3ludGF4LCBtYXRjaGluZyBvbmUgb2YgYSBudW1iZXIgb2YgZGlmZmVyZW50IHJ1bGVzLlxuLy8gVGhlIHJlc3VsdCBvZiBhIHBhcnNlIGlzIHRoZSBsb25nZXN0IHJ1bGUgdGhhdCBhY3R1YWxseSBtYXRjaGVkLlxuLy8gTk9URTogQ3VycmVudGx5IHRha2VzIHRoZSBsb25nZXN0IHZhbGlkIG1hdGNoLlxuLy8gVE9ETzogbWF0Y2ggYWxsIHZhbGlkIGFsdGVybmF0aXZlc1xuLy8gVE9ETzogcmVuYW1lP1xuUnVsZS5BbHRlcm5hdGl2ZXMgPSBjbGFzcyBBbHRlcm5hdGl2ZXMgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpO1xuXHRcdGlmICghdGhpcy5ydWxlcykgdGhpcy5ydWxlcyA9IFtdO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYW55IG9mIG91ciBhbHRlcm5hdGl2ZXMgYXJlIGZvdW5kIEFOWVdIRVJFIGluIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIGB1bmRlZmluZWRgIGlmIG5vdCBkZXRlcm1pbnN0aWMuXG5cdC8vXHQtIHJlZ2V4IG1hdGNoIGlmIGZvdW5kLFxuXHQvL1x0LSBgZmFsc2VgIGlmIG5vdCBmb3VuZCBvclxuXHR0ZXN0KHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0aWYgKCF0aGlzLmlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IGJlc3RNYXRjaDtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUudGVzdChwYXJzZXIsIHN0cmVhbSk7XG5cdFx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdFx0bWF0Y2guZW5kSW5kZXggPSBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aDtcblx0XHRcdFx0cmV0dXJuIG1hdGNoO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBGaW5kIGFsbCBydWxlcyB3aGljaCBtYXRjaCBhbmQgZGVsZWdhdGUgdG8gYGdldEJlc3RNYXRjaCgpYCB0byBwaWNrIHRoZSBiZXN0IG9uZS5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0bGV0IG1hdGNoZXMgPSBbXTtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKTtcblx0XHRcdGlmIChtYXRjaCkgbWF0Y2hlcy5wdXNoKG1hdGNoKTtcblx0XHR9XG5cblx0XHRpZiAoIW1hdGNoZXMubGVuZ3RoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gdW5jb21tZW50IHRoZSBiZWxvdyB0byBwcmludCBhbHRlcm5hdGl2ZXNcblx0XHQvLyBpZiAobWF0Y2hlcy5sZW5ndGggPiAxKSB7XG5cdFx0Ly9cdGNvbnNvbGUuaW5mbyh0aGlzLmFyZ3VtZW50IHx8IHRoaXMucnVsZU5hbWUsIG1hdGNoZXMsIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLm1hdGNoZWRUZXh0KSk7XG5cdFx0Ly8gfVxuXG5cdFx0bGV0IGJlc3RNYXRjaCA9IChtYXRjaGVzLmxlbmd0aCA9PT0gMSA/IG1hdGNoZXNbMF0gOiB0aGlzLmdldEJlc3RNYXRjaChtYXRjaGVzKSk7XG5cblx0XHQvLyBhc3NpZ24gYGFyZ05hbWVgIG9yIGBydWxlTmFtZWAgZm9yIGByZXN1bHRzYFxuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSBiZXN0TWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdGVsc2UgaWYgKHRoaXMucnVsZU5hbWUpIGJlc3RNYXRjaC5ydWxlTmFtZSA9IHRoaXMucnVsZU5hbWU7XG4vL1RPRE86IG90aGVyIHRoaW5ncyB0byBjb3B5IGhlcmU/Pz9cblxuXHRcdHJldHVybiBiZXN0TWF0Y2g7XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIFwiYmVzdFwiIG1hdGNoIGdpdmVuIG1vcmUgdGhhbiBvbmUgbWF0Y2hlcyBhdCB0aGUgaGVhZCBvZiB0aGUgc3RyZWFtLlxuXHQvLyBEZWZhdWx0IGlzIHRvIHJldHVybiB0aGUgbG9uZ2VzdCBtYXRjaC5cblx0Ly8gSW1wbGVtZW50IHNvbWV0aGluZyBlbHNlIHRvIGRvLCBlZywgcHJlY2VkZW5jZSBydWxlcy5cblx0Z2V0QmVzdE1hdGNoKG1hdGNoZXMpIHtcblx0XHRyZXR1cm4gbWF0Y2hlcy5yZWR1Y2UoZnVuY3Rpb24gKGJlc3QsIG5leHQpIHtcblx0XHRcdGlmIChuZXh0LmVuZEluZGV4ID4gYmVzdC5lbmRJbmRleCkgcmV0dXJuIG5leHQ7XG5cdFx0XHRyZXR1cm4gYmVzdDtcblx0XHR9LCBtYXRjaGVzWzBdKTtcblx0fVxuXG5cdGFkZFJ1bGUocnVsZSkge1xuXHRcdHRoaXMucnVsZXMucHVzaChydWxlKTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnRvU291cmNlKGNvbnRleHQpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAoJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGVzLmpvaW4oXCJ8XCIpfSkke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuLy8gUmVwZWF0aW5nIHJ1bGUuXG4vL1x0YHRoaXMucnVsZWAgaXMgdGhlIHJ1bGUgdGhhdCByZXBlYXRzLlxuLy9cbi8vIEFmdGVyIG1hdGNoaW5nOlxuLy9cdGB0aGlzLm1hdGNoZWRgIGlzIGFycmF5IG9mIHJlc3VsdHMgb2YgbWF0Y2hlcy5cbi8vXG4vL1x0QXV0b21hdGljYWxseSBjb25zdW1lcyB3aGl0ZXNwYWNlIGJlZm9yZSBydWxlcy5cbi8vXHRJZiBkb2Vzbid0IG1hdGNoIGF0IGxlYXN0IG9uZSwgcmV0dXJucyBgdW5kZWZpbmVkYC5cblJ1bGUuUmVwZWF0ID0gY2xhc3MgUmVwZWF0IGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2sgPSBbXSkge1xuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdGlmIChSdWxlLnN0YWNrQ29udGFpbnMoc3RhY2ssIHRoaXMsIHN0cmVhbSkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRzdGFjayA9IHN0YWNrLmNvbmNhdCgpO1xuXHRcdFx0c3RhY2sucHVzaChbdGhpcywgc3RyZWFtXSk7XG5cdFx0fVxuXG5cdFx0bGV0IG5leHQgPSBzdHJlYW07XG5cdFx0bGV0IG1hdGNoZWQgPSBbXTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IG1hdGNoID0gdGhpcy5ydWxlLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFtYXRjaCkgYnJlYWs7XG5cblx0XHRcdG1hdGNoZWQucHVzaChtYXRjaCk7XG5cdFx0XHRuZXh0ID0gbWF0Y2gubmV4dCgpO1xuXHRcdH1cblxuXHRcdGlmIChtYXRjaGVkLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBSZXR1cm5zIGFuIGFycmF5IHdpdGggYXJndW1lbnRzIG9mIGFsbCByZXN1bHRzLlxuXHQvLyBOT1RFOiBtZW1vaXplcyB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5tYXAoIG1hdGNoID0+IG1hdGNoLnJlc3VsdHMgKTtcblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdHRocm93IFwiRG9uJ3QgdW5kZXJzdGFuZCBob3cgdG8gc291cmNlIFJ1bGUuUmVwZWF0IVwiO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0Y29uc3QgcnVsZSA9ICh0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlIHx8IHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiB0aGlzLnJ1bGUuc3RyaW5nLmluY2x1ZGVzKFwiIFwiKVxuXHRcdFx0XHQgICA/IGAoJHt0aGlzLnJ1bGV9KWBcblx0XHRcdFx0ICAgOiBgJHt0aGlzLnJ1bGV9YFxuXHRcdFx0XHQpO1xuXHRcdHJldHVybiBgJHtydWxlfSR7dGhpcy5vcHRpb25hbCA/ICcqJyA6ICcrJ31gO1xuXHR9XG59XG5cblxuLy8gTGlzdCBtYXRjaCBydWxlOiAgIGBbPGl0ZW0+PGRlbGltaXRlcj5dYC4gZWdcIiBgW3tudW1iZXJ9LF1gIHRvIG1hdGNoIGAxLDIsM2Bcbi8vXHRgcnVsZS5pdGVtYCBpcyB0aGUgcnVsZSBmb3IgZWFjaCBpdGVtLFxuLy9cdGBydWxlLmRlbGltaXRlcmAgaXMgdGhlIGRlbGltaXRlciBiZXR3ZWVuIGVhY2ggaXRlbS5cbi8vIFx0YHJ1bGUubWF0Y2hlZGAgaW4gdGhlIG91dHB1dCBpcyB0aGUgbGlzdCBvZiB2YWx1ZXMuXG4vL1xuLy9cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGEgTGlzdCBydWxlIHdpbGwgTk9UIHJlcGVhdCAoPz8/PylcblJ1bGUuTGlzdCA9IGNsYXNzIExpc3QgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrID0gW10pIHtcblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHRpZiAoUnVsZS5zdGFja0NvbnRhaW5zKHN0YWNrLCB0aGlzLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0c3RhY2sgPSBzdGFjay5jb25jYXQoKTtcblx0XHRcdHN0YWNrLnB1c2goW3RoaXMsIHN0cmVhbV0pO1xuXHRcdH1cblxuXHRcdC8vIGVuc3VyZSBpdGVtIGFuZCBkZWxpbWl0ZXIgYXJlIG9wdGlvbmFsIHNvIHdlIGRvbid0IGJhcmYgaW4gYHBhcnNlUnVsZWBcblx0XHR0aGlzLml0ZW0ub3B0aW9uYWwgPSB0cnVlO1xuXHRcdHRoaXMuZGVsaW1pdGVyLm9wdGlvbmFsID0gdHJ1ZTtcblxuXHRcdGxldCBtYXRjaGVkID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBuZXh0IGl0ZW0sIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgaXRlbSA9IHRoaXMuaXRlbS5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghaXRlbSkgYnJlYWs7XG4vL2NvbnNvbGUubG9nKGl0ZW0pO1xuXHRcdFx0bWF0Y2hlZC5wdXNoKGl0ZW0pO1xuXHRcdFx0bmV4dCA9IGl0ZW0ubmV4dCgpO1xuXG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHQvLyBnZXQgZGVsaW1pdGVyLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGRlbGltaXRlciA9IHRoaXMuZGVsaW1pdGVyLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFkZWxpbWl0ZXIpIGJyZWFrO1xuXHRcdFx0bmV4dCA9IGRlbGltaXRlci5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgd2UgZGlkbid0IGdldCBhbnkgbWF0Y2hlcywgZm9yZ2V0IGl0LlxuXHRcdGlmIChtYXRjaGVkLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBtYXRjaGVkWzBdID8gbWF0Y2hlZFswXS5zdGFydEluZGV4IDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gbWF0Y2hlZCBpdGVtIGJ5IGluZGV4XG5cdGdldEl0ZW0oaW5kZXgpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkW2luZGV4XTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcdFx0Ly8gVE9ETzogdGhyb3c/Pz9cblx0XHRsZXQgbWF0Y2hlZCA9IHRoaXMubWF0Y2hlZC5tYXAoIG1hdGNoID0+IG1hdGNoLnRvU291cmNlKGNvbnRleHQpICkuam9pbihcIiwgXCIpO1xuXHRcdHJldHVybiBgWyR7bWF0Y2hlZH1dYDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgWyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5pdGVtfSAke3RoaXMuZGVsaW1pdGVyfV0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZS5qcyIsIi8vIFNwZWxsIFwiRW5nbGlzaFwiIHBhcnNlciBzdHJhd21hblxuXG4vLyBUT0RPOlx0YHRlc3RgIGZ1bmN0aW9uIGZvciBxdWljayBuby1nb29kIGhpdCBvbiBge2F9IGJsYWggYmxhaCB7Yn1gP1xuLy8gVE9ETzpcdHRoaXMgZG9lc24ndCB3b3JrOiAgIGB7ZXhwcmVzc2lvbn0gaXMge2V4cHJlc3Npb259YFxuLy8gVE9ETzpcdGJyZWFrIGBmaWxlYCBpbnRvIGxpbmVzIGFuZCBwcm9jZXNzIGVhY2ggKGluY2wuIHN1YnN0ci9tYXRjaCBub3QgZ29pbmcgYmV5b25kIHRoZSBlbmQpXG4vLyBUT0RPOlx0bmVzdGluZyAtLSBpcyB0aGlzIGp1c3QgaW5kZW50ID0gXCJhZGQgYmxvY2sgc2NvcGVcIlxuLy8gVE9ETzpcdHByb21vdGlvbiBwYXR0ZXJuIGZvciBnYXRoZXIgYXJndW1lbnRzIChlZzogbGl0ZXJhbC1saXN0KSA/Pz9cbi8vIFRPRE86XHRXaGF0IGRvZXMgc3ludGF4IHRyZWUgbG9vayBsaWtlPyAgSG93IGRvIHdlIGV4dHJhY3QgbWVhbmluZyBvdXQgb2YgdGhlIG5lc3Q/XG4vLyBUT0RPOlx0UGFzcyBgY29udGV4dGAgdG8gdG9Tb3VyY2UoKSwgYWRkIHByb3BlcnR5IGRlc2NyaXB0b3JzIHRvIGBjbGFzc2AsIHZhcmlhYmxlcyBhbmQgY29kZSB0byBgbWV0aG9kYCwgYGdsb2JhbGAgc3R1ZmYgZXRjXG5cbmltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gR1JSUi4uLiB3aWxsIFNPTUVPTkUgb24gdGhlIG5vZGUgdGVhbSBwbGVhc2UgaW1wbGVtZW50IGNvbnNvbGUuZ3JvdXAgPz8/XG5pZiAoIWNvbnNvbGUuZ3JvdXApIGNvbnNvbGUuZ3JvdXAgPSBjb25zb2xlLmxvZztcbmlmICghY29uc29sZS5ncm91cEVuZCkgY29uc29sZS5ncm91cEVuZCA9IGNvbnNvbGUubG9nO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYXJzZXIge1xuXHQvLyBTZXQgdG8gYHRydWVgIHRvIG91dHB1dCBkZWJ1ZyBpbmZvIHdoaWxlIGFkZGluZyBydWxlc1xuXHRzdGF0aWMgREVCVUcgPSBmYWxzZTtcblxuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblxuXHRcdC8vIENsb25lIHJ1bGVzLCBzdGFydGluZyB3aXRoIGEgY29tcGxldGVseSBlbXB0eSBtYXAgaWYgbm90IGRlZmluZWQgKG5vIHN0YW5kYXJkIG9iamVjdCBrZXlzKVxuXHRcdHRoaXMucnVsZXMgPSBPYmplY3QuY3JlYXRlKHRoaXMucnVsZXMgfHwgbnVsbCk7XG5cdH1cblxuXHRnZXRSdWxlKG5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlc1tuYW1lXTtcblx0fVxuXG5cdGdldFJ1bGVPckRpZShuYW1lLCBwcm9wZXJ0eU5hbWUpIHtcblx0XHRsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShuYW1lKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgJHtwcm9wZXJ0eU5hbWV9IHJ1bGUgJyR7bmFtZX0nIG5vdCBmb3VuZGApO1xuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cbi8vXG4vLyMjIyBQYXJzaW5nXG4vL1xuXHQvLyBQYXJzZSBzb21ldGhpbmc6XG5cdC8vXHQtIGlmIG9uZSBzdHJpbmcgYXJndW1lbnQsIGRvZXMgYSBgcGFyc2VTdGF0ZW1lbnQoKWBcblx0Ly9cdC0gaWYgdHdvLCBkb2VzIGEgYHBhcnNlUnVsZSgpYFxuXHQvLyBSZXR1cm5zIGBwYXJzZS50b1N0cmluZygpYCBvciB0aHJvd3MuXG4vL1RFU1RNRVxuXHRjb21waWxlKCkge1xuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRsZXQgc3RyaW5nID0gYXJndW1lbnRzWzBdO1xuXHRcdFx0cmV0dXJuIHRoaXMuY29tcGlsZVN0YXRlbWVudHMoc3RyaW5nKTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0bGV0IG5hbWUgPSBhcmd1bWVudHNbMF0sIHN0cmluZyA9IGFyZ3VtZW50c1sxXTtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnBhcnNlKG5hbWUsIHN0cmluZyk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZXIucGFyc2UoJyR7bmFtZX0nLCAnJHtzdHJpbmd9Jyk6IGNhbid0IHBhcnNlIHRoaXNgKTtcblx0XHRcdHJldHVybiByZXN1bHQudG9Tb3VyY2UodGhpcyk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKFwicGFyc2VyLnBhcnNlKCk6IGV4cGVjdHMgb25lIG9yIHR3byBhcmd1bWVudHNcIik7XG5cdFx0fVxuXHR9XG5cblx0Ly8gUGFyc2UgYG5hbWVgZCBydWxlIGF0IGhlYWQgb2YgYHN0cmVhbWAgKGBzdHJpbmdgIG9yIGBUZXh0U3RyZWFtYCkuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cbi8vVEVTVE1FXG5cdHBhcnNlKG5hbWUsIHN0cmVhbSkge1xuXHRcdGlmICh0eXBlb2Ygc3RyZWFtID09PSBcInN0cmluZ1wiKSBzdHJlYW0gPSBuZXcgVGV4dFN0cmVhbShzdHJlYW0pO1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZXIucGFyc2UoJHtuYW1lfSk6IFJ1bGUgbm90IGZvdW5kYCk7XG5cdFx0c3RyZWFtID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJ1bGUucGFyc2UodGhpcywgc3RyZWFtKTtcblx0fVxuXG5cdC8vIFBhcnNlIGEgc2V0IG9mIHN0YXRlbWVudHMgbGluZS1ieS1saW5lLlxuLy9URVNUTUVcblx0Y29tcGlsZVN0YXRlbWVudHMoc3RhdGVtZW50cykge1xuXHRcdGNvbnNvbGUudGltZShcInBhcnNlU3RhdGVtZW50c1wiKTtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdGxldCBjdXJyZW50SW5kZW50ID0gMDtcblx0XHRjb25zdCB0YWJzID0gXCJcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcIjtcblx0XHRzdGF0ZW1lbnRzLnNwbGl0KC9cXG4vZykuZm9yRWFjaChzdGF0ZW1lbnQgPT4ge1xuXHRcdFx0Ly8gc2tpcCBsaW5lcyB0aGF0IGFyZSBhbGwgd2hpdGVzcGFjZVxuXHRcdFx0aWYgKHN0YXRlbWVudC50cmltKCkgPT09IFwiXCIpIHtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKFwiXCIpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGZpZ3VyZSBvdXQgaW5kZW50IGxldmVsIG9mIHRoaXMgbGluZVxuXHRcdFx0bGV0IGxpbmVTdGFydCA9IHN0YXRlbWVudC5tYXRjaCgvXlxcdCovKVswXTtcblx0XHRcdGxldCBsaW5lSW5kZW50ID0gbGluZVN0YXJ0Lmxlbmd0aDtcblx0XHRcdGlmIChsaW5lSW5kZW50ID4gY3VycmVudEluZGVudCkge1xuXHRcdFx0XHQvLyBhZGQgdG8gZW5kIG9mIHByZXZpb3VzIGxpbmUgaWYgcG9zc2libGVcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0Ly8gYnV0IG9ubHkgaWYgb3V0cHV0IGlzIG5vdCBhbHJlYWR5IGluZGVudGVkIHRvIHRoYXQgbGV2ZWxcblx0XHRcdFx0XHRsZXQgaW5kZW50ZWRTdGFydCA9IGxpbmVTdGFydCArIFwiXFx0XCI7XG5cdFx0XHRcdFx0aWYgKCFyZXN1bHRzW3Jlc3VsdHMubGVuZ3RoIC0gMV0uc3RhcnRzV2l0aChpbmRlbnRlZFN0YXJ0KSkge1xuXHRcdFx0XHRcdFx0cmVzdWx0c1tyZXN1bHRzLmxlbmd0aCAtIDFdICs9IFwiIHtcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG4vL2NvbnNvbGUuaW5mbyhcImFscmVhZHkgaW5kZW50ZWRcIik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgcmVzdWx0cy5wdXNoKHRhYnMuc3Vic3RyKDAsIGxpbmVJbmRlbnQtMSkgKyBcIntcIik7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChsaW5lSW5kZW50IDwgY3VycmVudEluZGVudCkge1xuXHRcdFx0XHRsZXQgY2xvc2VycyA9IFtdO1xuXHRcdFx0XHRmb3IgKGxldCBpID0gY3VycmVudEluZGVudDsgaSA+IGxpbmVJbmRlbnQ7IGktLSkge1xuXHRcdFx0XHRcdGNsb3NlcnMucHVzaCh0YWJzLnN1YnN0cigwLCBpLTEpICsgXCJ9XCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIHB1dCBwYXJlbnMgQkVGT1JFIGFueSBibGFuayBsaW5lcyFcblx0XHRcdFx0bGV0IGxhc3RCbGFua0xpbmUgPSB0aGlzLl9nZXRMYXN0QmxhbmtMaW5lKHJlc3VsdHMpO1xuXHRcdFx0XHRyZXN1bHRzLnNwbGljZShsYXN0QmxhbmtMaW5lLCAwLCAuLi5jbG9zZXJzKTtcblx0XHRcdH1cblx0XHRcdGN1cnJlbnRJbmRlbnQgPSBsaW5lSW5kZW50O1xuXG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5wYXJzZShcInN0YXRlbWVudFwiLCBzdGF0ZW1lbnQpO1xuLy9UT0RPOiBjb21wbGFpbiBpZiBjYW4ndCBwYXJzZSB0aGUgZW50aXJlIGxpbmUhXG5cdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdC8vIHNwbGl0IGJ5IGxpbmVzIGFuZCBhZGQgaW5kZW50XG5cdFx0XHRcdGxldCBzb3VyY2UgPSByZXN1bHQudG9Tb3VyY2UodGhpcykuc3BsaXQoXCJcXG5cIilcblx0XHRcdFx0XHRcdFx0XHQubWFwKCBsaW5lID0+IGxpbmVTdGFydCArIGxpbmUgKTtcblx0XHRcdFx0cmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KHNvdXJjZSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiQ291bGRuJ3QgcGFyc2Ugc3RhdGVtZW50OlwiLCBzdGF0ZW1lbnQpO1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCIvLyBFUlJPUjogXCIrc3RhdGVtZW50KTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHdoaWxlIChjdXJyZW50SW5kZW50ID4gMCkge1xuXHRcdFx0cmVzdWx0cy5wdXNoKHRhYnMuc3Vic3RyKDAsIGN1cnJlbnRJbmRlbnQtMSkgKyBcIn1cIik7XG5cdFx0XHRjdXJyZW50SW5kZW50LS07XG5cdFx0fVxuXG5cdFx0Y29uc29sZS50aW1lRW5kKFwicGFyc2VTdGF0ZW1lbnRzXCIpO1xuXHRcdHJldHVybiByZXN1bHRzLmpvaW4oXCJcXG5cIik7XG5cdH1cblxuXHQvLyBGaWd1cmUgb3V0IHRoZSBsYXN0IGJsYW5rIGxpbmUgaW4gdGhlIHJlc3VsdHNcblx0X2dldExhc3RCbGFua0xpbmUocmVzdWx0cykge1xuXHRcdGZvciAobGV0IGkgPSByZXN1bHRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRpZiAocmVzdWx0c1tpXSA9PT0gXCJcIikgY29udGludWU7XG5cdFx0XHRyZXR1cm4gaSArIDE7XG5cdFx0fVxuXHRcdHJldHVybiAwO1xuXHR9XG5cblx0Ly8gRWF0IHdoaXRlc3BhY2UgKGFjY29yZGluZyB0byBgcnVsZXMud2hpdGVzcGFjZWApIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBuZXcgc3RyZWFtIGlmIHdlIG1hdGNoZWQgd2hpdGVzcGFjZSwgb3RoZXJ3aXNlIHRoZSBzYW1lIHN0cmVhbS5cblx0ZWF0V2hpdGVzcGFjZShzdHJlYW0pIHtcblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5ydWxlcy53aGl0ZXNwYWNlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiBzdHJlYW07XG5cdFx0cmV0dXJuIHN0cmVhbS5hZHZhbmNlQnkocmVzdWx0Lm1hdGNoZWQubGVuZ3RoKTtcblx0fVxuXG4vL1xuLy9cdFJ1bGVzXG4vL1xuXG5cdC8vIEFkZCBhIHJ1bGUgdG8gb3VyIGxpc3Qgb2YgcnVsZXMhXG5cdC8vIENvbnZlcnRzIHRvIGBhbHRlcm5hdGl2ZXNgIG9uIHJlLWRlZmluaW5nIHRoZSBzYW1lIHJ1bGUuXG5cdGFkZFJ1bGUobmFtZSwgcnVsZSkge1xuXHRcdC8vIGRvbid0IG92ZXJyaWRlIHJ1bGVOYW1lXG5cdFx0aWYgKCFydWxlLnJ1bGVOYW1lKSBydWxlLnJ1bGVOYW1lID0gbmFtZTtcblxuXHRcdGxldCBleGlzdGluZyA9IHRoaXMucnVsZXNbbmFtZV07XG5cdFx0aWYgKGV4aXN0aW5nKSB7XG5cdFx0XHRpZiAoIShleGlzdGluZyBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzKSkge1xuXHRcdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQ29udmVydGluZyBydWxlICcke25hbWV9JyB0byBhbHRlcm5hdGl2ZXNgKTtcblx0XHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVOYW1lOiBuYW1lLCBydWxlczogW2V4aXN0aW5nXSB9KTtcblx0XHRcdFx0Ly8gY29weSBhcmd1bWVudCBuYW1lIG92ZXIgKD8/Pylcblx0XHRcdFx0aWYgKGV4aXN0aW5nLmFyZ3VtZW50KSB0aGlzLnJ1bGVzW25hbWVdLmFyZ3VtZW50ID0gZXhpc3RpbmcuYXJndW1lbnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkaW5nIHJ1bGUgJyR7cnVsZS5ydWxlTmFtZX0nIHRvICcke25hbWV9JzogYCwgcnVsZSk7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdLmFkZFJ1bGUocnVsZSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IHJ1bGU7XG5cdFx0fVxuXG5cblx0XHQvLyBtYWtlIGEgbm90ZSBpZiB3ZSdyZSBhZGRpbmcgYSBsZWZ0LXJlY3Vyc2l2ZSBydWxlXG5cdFx0aWYgKHRoaXMucnVsZUlzTGVmdFJlY3Vyc2l2ZShuYW1lLCBydWxlKSkge1xuLy9jb25zb2xlLmluZm8oXCJtYXJraW5nIFwiLCBydWxlLCBcIiBhcyBsZWZ0IHJlY3Vyc2l2ZSFcIik7XG5cdFx0XHRydWxlLmxlZnRSZWN1cnNpdmUgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cblx0Ly8gSXMgdGhlIHNwZWNpZmllZCBydWxlIGxlZnQtcmVjdXJzaXZlP1xuXHRydWxlSXNMZWZ0UmVjdXJzaXZlKG5hbWUsIHJ1bGUpIHtcblx0XHRpZiAoIShydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSkpIHJldHVybiBmYWxzZTtcbi8vY29uc29sZS5sb2cobmFtZSwgcnVsZSk7XG5cdFx0Zm9yIChsZXQgc3VicnVsZSBvZiBydWxlLnJ1bGVzKSB7XG5cdFx0XHQvLyBpZ25vcmUgb3B0aW9uYWwgcnVsZXNcblx0XHRcdGlmIChzdWJydWxlLm9wdGlvbmFsKSBjb250aW51ZTtcblx0XHRcdGlmIChzdWJydWxlIGluc3RhbmNlb2YgUnVsZS5TdWJydWxlICYmIHN1YnJ1bGUucnVsZSA9PT0gbmFtZSkgcmV0dXJuIHRydWU7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cbi8vXG4vLyAjIyBVdGlsaXR5IG1ldGhvZHNcbi8vXG5cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmBcblx0Ly9cdGluIGFycmF5IG9mIGB0b2tlbnNgIChzdHJpbmdzKS5cblx0Ly8gSWYgc3VjY2Vzc2Z1bCwgcmV0dXJucyBgeyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2UgfWBcblx0Ly8gVGhyb3dzIGlmIHVuc3VjZXNzZnVsLlxuXHRzdGF0aWMgZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIHN0YXJ0VG9rZW4sIGVuZFRva2VuLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGlmICh0b2tlbnNbc3RhcnRJbmRleF0gIT09IHN0YXJ0VG9rZW4pIHRocm93IG5ldyBTeW50YXhFcnJvcihgRXhwZWN0ZWQgJyR7c3RhcnRUb2tlbn0nIGF0IGluZGV4ICR7c3RhcnRJbmRleH0gb2YgdG9rZW5zYCk7XG5cdFx0bGV0IG5lc3RpbmcgPSAwO1xuXHRcdGxldCBuZXN0ZWQgPSBmYWxzZTtcblx0XHRmb3IgKGxldCBlbmRJbmRleCA9IHN0YXJ0SW5kZXggKyAxLCBsYXN0SW5kZXggPSB0b2tlbnMubGVuZ3RoOyBlbmRJbmRleCA8IGxhc3RJbmRleDsgZW5kSW5kZXgrKykge1xuXHRcdFx0bGV0IHRva2VuID0gdG9rZW5zW2VuZEluZGV4XTtcblx0XHRcdGlmICh0b2tlbiA9PT0gc3RhcnRUb2tlbikge1xuXHRcdFx0XHRuZXN0aW5nKys7XG5cdFx0XHRcdG5lc3RlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodG9rZW4gPT09IGVuZFRva2VuKSB7XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKVxuXHRcdFx0XHRcdHJldHVybiB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZTogdG9rZW5zLnNsaWNlKHN0YXJ0SW5kZXgrMSwgZW5kSW5kZXgpLCBuZXN0ZWQgfTtcblx0XHRcdFx0bmVzdGluZy0tO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENvdWxkbid0IGZpbmQgbWF0Y2hpbmcgJyR7ZW5kVG9rZW59J3Mgc3RhcnRpbmcgYXQgaXRlbSAke3N0YXJ0SW5kZXh9YCk7XG5cdH1cblxuXG5cdC8vIExpc3Qgb2Ygc3BlY2lhbCBjaGFyYWN0ZXJzIGluIHJlZ3VsYXIgZXhwcmVzc2lvbnMuXG5cdC8vIFVzZWQgdG8gZXNjYXBlIHRob3NlIGNoYXJzIHdoZW4gY3JlYXRpbmcgcmVndWxhciBleHByZXNzaW9ucyBmcm9tIHN0cmluZ3MuXG5cdHN0YXRpYyBSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTID0gKGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IGNoYXJzID0ge307XG5cdFx0XCJcXFxcL14kKis/LigpfHt9LFtdXCIuc3BsaXQoXCJcIikuZm9yRWFjaChjaGFyID0+IGNoYXJzW2NoYXJdID0gdHJ1ZSk7XG5cdFx0cmV0dXJuIGNoYXJzO1xuXHR9KSgpXG5cblx0Ly8gR2l2ZW4gYSBcIm5vcm1hbFwiIGBzdHJpbmdgLCBlc2NhcGUgYW55IHJlZ3VsYXIgZXhwcmVzc2lvbiBzcGVjaWFsIGNoYXJhY3RlcnNcblx0Ly9cdHNvIHdlIGNhbiBjcmVhdGUgYSBgbmV3IFJlZ0V4cCgpYC5cblx0Ly8gQWxzbyBjb252ZXJ0cyBhIHNpbmdsZSBzcGFjZSB0byBhcmJpdHJhcnkgc2V0IG9mIHNwYWNlcyB3aXRoIFwiXFxzK1wiXG5cdHN0YXRpYyBlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZykge1xuXHRcdHJldHVybiBzdHJpbmcuc3BsaXQoXCJcIikubWFwKGZ1bmN0aW9uIChjaGFyLCBpbmRleCwgbGlzdCkge1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBiYWNrc2xhc2hcblx0XHRcdGlmIChjaGFyID09PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiO1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBzcGFjZVxuXHRcdFx0aWYgKGNoYXIgPT09IFwiIFwiKSByZXR1cm4gXCJcXFxccytcIjtcblx0XHRcdC8vIElmIGEgc3BlY2lhbCBjaGFyIGFuZCBwcmV2aW91cyBjaGFyYWN0ZXIgd2FzIG5vdCBhbiBlc2NhcGUsIGVzY2FwZSB0aGUgcmVzdWx0LlxuXHRcdFx0aWYgKFBhcnNlci5SRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTW2NoYXJdICYmIGxpc3RbaW5kZXgtMV0gIT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCIrY2hhcjtcblx0XHRcdC8vIFRoaXMgY2hhciBzaG91bGQgYmUgZmluZSBieSBpdHNlbGYuXG5cdFx0XHRyZXR1cm4gY2hhcjtcblx0XHR9KS5qb2luKFwiXCIpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgbmV3IHJlZ3VsYXIgZXhwcmVzc2lvbiBmcm9tIGEgXCJub3JtYWxcIiBzdHJpbmcsIGVzY2FwaW5nIHNwZWNpYWwgY2hhcmFjdGVycyBhcyBuZWNlc3NhcnkuXG5cdHN0YXRpYyBSZWdFeHBGcm9tU3RyaW5nKHN0cmluZywgZmxhZ3MpIHtcblx0XHRyZXR1cm4gbmV3IFJlZ0V4cChQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpLCBmbGFncyk7XG5cdH1cblxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUGFyc2VyLmpzIiwiLy9cbi8vXHQjIENvcmUgYHJ1bGVzYCAtLSBzaW1wbGUgZGF0YXR5cGVzLCBldGMuXG4vL1xuLy8gTk9URTogbWFueSBvZiB0aGUgYmVsb3cgYXJlIGNyZWF0ZWQgYXMgY3VzdG9tIFBhdHRlcm4gc3ViY2xhc3NlcyBmb3IgZGVidWdnaW5nLlxuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gYHdoaXRlc3BhY2VgIHJ1bGUuXG4vLyBOT1RFIGBwYXJzZXIucGFyc2VSdWxlKFwid2hpdGVzcGFjZVwiLCBcIiAgIFwiKWAgd2lsbCByZXR1cm4gYHVuZGVmaW5lZGBcbi8vXHRcdCBiZWNhdXNlIGBwYXJzZXIucGFyc2VSdWxlKClgIGF1dG9tYXRpY2FsbHkgZWF0cyB3aGl0ZXNwYWNlIGF0IHRoZSBzdGFydCBvZiBhIHJ1bGUuXG5SdWxlLldoaXRlc3BhY2UgPSBjbGFzcyB3aGl0ZXNwYWNlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9XG5wYXJzZXIuYWRkUnVsZShcIndoaXRlc3BhY2VcIiwgbmV3IFJ1bGUuV2hpdGVzcGFjZSh7IHBhdHRlcm46IC9cXHMrLywgb3B0aW9uYWw6IHRydWUgfSkpO1xuXG5cbi8vIGB3b3JkYCA9IGlzIGEgc2luZ2xlIGFscGhhbnVtZXJpYyB3b3JkLlxuLy8gTVVTVCBzdGFydCB3aXRoIGEgbG93ZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLldvcmQgPSBjbGFzcyB3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IHdvcmQgPSBwYXJzZXIuYWRkUnVsZShcIndvcmRcIiwgbmV3IFJ1bGUuV29yZCh7XG5cdHBhdHRlcm46IC9bYS16XVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcblxuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5JZGVudGlmaWVyID0gY2xhc3MgaWRlbnRpZmllciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBpZGVudGlmaWVyID0gcGFyc2VyLmFkZFJ1bGUoXCJpZGVudGlmaWVyXCIsIG5ldyBSdWxlLklkZW50aWZpZXIoe1xuXHRwYXR0ZXJuOiAvW2Etel1bXFx3XFwtXSovLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgaWRlbnRpZmllcik7XG5cbi8vIEFkZCBFbmdsaXNoIHByZXBvc2l0aW9ucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vXG4vLyBXaWtpcGVkaWEgXCJQcmVwb3NpdGlvblwiOlxuLy9cdFwiUHJlcG9zaXRpb25zLi4uYXJlIGEgY2xhc3Mgb2Ygd29yZHMgdGhhdFxuLy9cdGV4cHJlc3Mgc3BhdGlhbCBvciB0ZW1wb3JhbCByZWxhdGlvbnMgIChpbiwgdW5kZXIsIHRvd2FyZHMsIGJlZm9yZSlcbi8vXHRvciBtYXJrIHZhcmlvdXMgc2VtYW50aWMgcm9sZXMgKG9mLCBmb3IpLlxuLy8gVEVTVE1FXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhYm91dFwiLCBcImFib3ZlXCIsIFwiYWZ0ZXJcIiwgXCJhbmRcIiwgXCJhc1wiLCBcImF0XCIsXG5cdFwiYmVmb3JlXCIsIFwiYmVoaW5kXCIsIFwiYmVsb3dcIiwgXCJiZW5lYXRoXCIsIFwiYmVzaWRlXCIsIFwiYmV0d2VlblwiLCBcImJleW9uZFwiLCBcImJ5XCIsXG5cdFwiZGVmaW5lZFwiLCBcImRvd25cIiwgXCJkdXJpbmdcIixcblx0XCJlYWNoXCIsIFwiZW1wdHlcIiwgXCJleGFjdGx5XCIsIFwiZXhjZXB0XCIsXG5cdFwiZm9yXCIsIFwiZnJvbVwiLFxuXHRcImdyZWF0ZXJcIixcblx0XCJJXCIsIFwiaW5cIiwgXCJpbnRvXCIsXG5cdFwibGVzc1wiLCBcImxvbmdcIixcblx0XCJtZVwiLCBcIm1pbnVzXCIsIFwibW9yZVwiLFxuXHRcIm5lYXJcIiwgXCJub3RcIixcblx0XCJvZlwiLCBcIm9mZlwiLCBcIm9uXCIsIFwib250b1wiLCBcIm9wcG9zaXRlXCIsIFwib3V0XCIsIFwib3V0c2lkZVwiLCBcIm92ZXJcIixcblx0XCJzaG9ydFwiLCBcInNpbmNlXCIsXG5cdFwidGhhblwiLCBcInRoZVwiLCBcInRoZW5cIiwgXCJ0aHJvdWdoXCIsIFwidGhydVwiLCBcInRvXCIsIFwidG93YXJkXCIsIFwidG93YXJkc1wiLFxuXHRcInVuZGVmaW5lZFwiLCBcInVuZGVyXCIsIFwidW5kZXJuZWF0aFwiLCBcInVuaXF1ZVwiLCBcInVudGlsXCIsIFwidXBcIiwgXCJ1cG9uXCIsIFwidXBzaWRlXCIsXG5cdFwidmVyc3VzXCIsIFwidnNcIixcblx0XCJ3aXRoXCIsIFwid2l0aGluXCIsIFwid2l0aG91dFwiLFxuKTtcblxuLy8gQWRkIGNvbW1vbiBlbmdsaXNoIHZlcmJzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYXJlXCIsXG5cdFwiZG9cIiwgXCJkb2VzXCIsXG5cdFwiY29udGFpbnNcIixcblx0XCJoYXNcIiwgXCJoYXZlXCIsXG5cdFwiaXNcIixcblx0XCJyZXBlYXRcIixcblx0XCJ3YXNcIiwgXCJ3ZXJlXCJcbik7XG5cbi8vIEFkZCBzcGVjaWFsIGNvbnRyb2wga2V5d29yZHMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJlbHNlXCIsXG5cdFwiaWZcIixcblx0XCJvdGhlcndpc2VcIixcblx0XCJ3aGlsZVwiXG4pO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLlR5cGUgPSBjbGFzcyB0eXBlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJ0eXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvKFtBLVpdW1xcd1xcLV0qfHRleHR8bnVtYmVyfGludGVnZXJ8ZGVjaW1hbHxjaGFyYWN0ZXJ8Ym9vbGVhbnxvYmplY3QpLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdGxldCB2YWx1ZSA9IHRoaXMubWF0Y2hlZDtcblx0XHRzd2l0Y2godmFsdWUpIHtcblx0XHRcdC8vIHNwZWNpYWwgY2FzZSB0byB0YWtlIHRoZSBmb2xsb3dpbmcgYXMgbG93ZXJjYXNlXG5cdFx0XHRjYXNlIFwidGV4dFwiOlx0XHRyZXR1cm4gXCJTdHJpbmdcIjtcblx0XHRcdGNhc2UgXCJjaGFyYWN0ZXJcIjpcdHJldHVybiBcIkNoYXJhY3RlclwiO1xuXHRcdFx0Y2FzZSBcIm51bWJlclwiOlx0XHRyZXR1cm4gXCJOdW1iZXJcIjtcblx0XHRcdGNhc2UgXCJpbnRlZ2VyXCI6XHRcdHJldHVybiBcIkludGVnZXJcIjtcblx0XHRcdGNhc2UgXCJkZWNpbWFsXCI6XHRcdHJldHVybiBcIkRlY2ltYWxcIjtcblx0XHRcdGNhc2UgXCJib29sZWFuXCI6XHRcdHJldHVybiBcIkJvb2xlYW5cIjtcblx0XHRcdGNhc2UgXCJvYmplY3RcIjpcdFx0cmV0dXJuIFwiT2JqZWN0XCI7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gdmFsdWUucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0XHR9XG5cdH1cbn0pKTtcbnBhcnNlci5ydWxlcy50eXBlLmFkZFRvQmxhY2tsaXN0KFwiSVwiKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMudHlwZSk7XG5cblxuLy8gYG51bWJlcmAgYXMgZWl0aGVyIGZsb2F0IG9yIGludGVnZXIsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cblJ1bGUuTnVtYmVyID0gY2xhc3MgbnVtYmVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IG51bWJlciA9IHBhcnNlci5hZGRSdWxlKFwibnVtYmVyXCIsIG5ldyBSdWxlLk51bWJlcih7XG5cdHBhdHRlcm46IC8tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gbnVtYmVyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlRmxvYXQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBudW1iZXIpO1xuXG5cbi8vIE51bWVyaWMgYGludGVnZXJgIG9ubHksIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHRoaXMgV0lMTCBtYXRjaCBhIGZsb2F0LCBidXQgdGhlIHJldHVybmVkIHZhbHVlIHdpbGwgY29lcmNlIHRvIGFuIGludGVnZXIuXG4vLyBSRVZJRVc6IGlzIHRoaXMgcmlnaHQ/ICBCZXR0ZXIgdG8gbm90IG1hdGNoIGEgZmxvYXQ/XG5SdWxlLkludGVnZXIgPSBjbGFzcyBpbnRlZ2VyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJpbnRlZ2VyXCIsIG5ldyBSdWxlLkludGVnZXIoe1xuXHRwYXR0ZXJuOiAvLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0ZXh0ID0gcGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyBSdWxlLlRleHQoe1xuXHRwYXR0ZXJuOiAvKD86XCJbXlwiXSpcInwnW14nXSonKS9cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCB0ZXh0KTtcblxuXG4vLyBCb29sZWFuIGxpdGVyYWwsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFRPRE86IGJldHRlciBuYW1lIGZvciB0aGlzPz8/XG5SdWxlLkJvb2xlYW4gPSBjbGFzcyBib29sZWFuIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IGJvb2wgPSBwYXJzZXIuYWRkUnVsZShcImJvb2xlYW5cIiwgbmV3IFJ1bGUuQm9vbGVhbih7XG5cdHBhdHRlcm46IC8odHJ1ZXxmYWxzZXx5ZXN8bm98b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgYm9vbCk7XG4vLyBBZGQgYm9vbGVhbiB0b2tlbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcInRydWVcIiwgXCJmYWxzZVwiLFxuXHRcInllc1wiLCBcIm5vXCIsXG5cdFwib2tcIiwgXCJjYW5jZWxcIlxuKTtcblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxubGV0IGxpc3QgPSBwYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsX2xpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdGNsYXNzIGxpdGVyYWxfbGlzdCBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0XHRyZXR1cm4gc3VwZXIucmVzdWx0cy5saXN0O1xuXHRcdH1cblxuXHRcdGdldEl0ZW0oaW5kZXgpIHtcblx0XHRcdGxldCBsaXN0ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWYgKGxpc3QpIHJldHVybiBsaXN0Lm1hdGNoZWRbaW5kZXhdO1xuXHRcdH1cblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBsaXN0ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWYgKCFsaXN0KSByZXR1cm4gXCJbXVwiO1xuIFx0XHRcdHJldHVybiBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBQYXJlbnRoZXNpemVkIGV4cHJlc3Npb25cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwYXJlbnRoZXNpemVkX2V4cHJlc3Npb25cIixcblx0XCJcXFxcKHtleHByZXNzaW9ufVxcXFwpXCIsXG5cdGNsYXNzIHBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkWzFdO1xuXHRcdH1cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgZXhwcmVzc2lvbiA9IHRoaXMucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIGRvbid0IGRvdWJsZSBwYXJlbnMgaWYgbm90IG5lY2Vzc2FyeVxuXHRcdFx0aWYgKHR5cGVvZiBleHByZXNzaW9uID09PSBcInN0cmluZ1wiICYmIGV4cHJlc3Npb24uc3RhcnRzV2l0aChcIihcIikgJiYgZXhwcmVzc2lvbi5lbmRzV2l0aChcIilcIikpIHJldHVybiBleHByZXNzaW9uO1xuXHRcdFx0cmV0dXJuIGAoJHtleHByZXNzaW9ufSlgO1xuXHRcdH1cblx0fVxuKVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJcbi8vIFRPRE86IGNvbnZlcnQgdG8gbGluZS1hd2FyZSBzdHJlYW0/Pz9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRTdHJlYW0ge1xuXHQvLyBZb3UgY2FuIGNvbnN0cnVjdCB3aXRoIGEgdGV4dCBzdHJpbmcgb3IgYSBzZXQgb2YgcHJvcGVydGllcyAoaW5jbHVkaW5nIGB0ZXh0YCkuXG5cdGNvbnN0cnVjdG9yKC4uLnRleHRPclByb3BzKSB7XG5cdFx0dGV4dE9yUHJvcHMuZm9yRWFjaCgoYXJnKSA9PiB7XG5cdFx0XHRpZiAodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHR0aGlzLnRleHQgPSBhcmc7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChhcmcpIHtcblx0XHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBhcmcpO1xuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvLyBNYWtlIHN1cmUgYHRleHRgIGFuZCBgc3RhcnRJbmRleGAgYXJlIGRlZmluZWQuXG5cdFx0aWYgKCEoXCJ0ZXh0XCIgaW4gdGhpcykpIHRoaXMudGV4dCA9IFwiXCI7XG5cdFx0aWYgKCEoXCJzdGFydEluZGV4XCIgaW4gdGhpcykpIHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdH1cblxuXHQvLyBSZXR1cm4gYW4gaW1tdXRhYmxlIGNsb25lIG9mIHRoZSBzdHJlYW0uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0cmV0dXJuIG5ldyBUZXh0U3RyZWFtKHRoaXMsIHByb3BzKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2VkIHRvIG5ldyBzdGFydEluZGV4LlxuXHRhZHZhbmNlVG8oc3RhcnRJbmRleCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleCB9KTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2luZyBzdGFydEluZGV4IEJZIGBsZW5ndGhgXG5cdGFkdmFuY2VCeShsZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcblx0fVxuXG4vLyBcdC8vIFJldHVybiBjbG9uZSBvZiB0aGlzIHN0cmVhbSB3aXRoIGVuZEluZGV4IHNldCB0byBzdGFydCArIGBsZW5ndGhgXG4vLyBcdGVuZEFmdGVyKGxlbmd0aCkge1xuLy8gXHRcdHJldHVybiB0aGlzLmNsb25lKHsgZW5kSW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcbi8vIFx0fVxuXG4vL1xuLy8gIyMgTWF0Y2hpbmdcbi8vXG5cdC8vIE1hdGNoIGBwYXR0ZXJuYCBhcyByZWdleCBpbiB0aGlzIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBtYXRjaCBvciBgdW5kZWZpbmVkYC5cblx0Ly8gSWYgeW91IHdhbnQgdG8gdGVzdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmVhbSxcblx0Ly9cdG1ha2Ugc3VyZSB5b3VyIHJlZ2V4IHN0YXJ0cyB3aXRoIGBeYC5cblx0Ly8gVEVTVE1FOiB0aGlzIGxpa2VseSBicmVha3Mgd2l0aCBhIGBnYCBvbiB0aGUgcGF0dGVybj9cblx0bWF0Y2gocGF0dGVybikge1xuXHRcdGlmICghKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBUZXh0U3RyZWFtLm1hdGNoKCR7cGF0dGVybn0pOiBleHBlY3RlZCBSZWdFeHBgKTtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQubWF0Y2gocGF0dGVybikgfHwgdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGlzIHN0cmVhbSBJTkNMVURFIGEgcmVnZXggd2l0aGluIGl0P1xuXHQvLyBSZXR1cm5zIGB0cnVlYCBvciBgZmFsc2VgLlxuXHQvLyBOT1RFOiBQYXR0ZXJuIG11c3QgTk9UIHN0YXJ0IHdpdGggYF5gIGZvciB0aGlzIHRvIG1hdGNoIGluIHRoZSBtaWRkbGUgb2YgdGhlIHN0cmVhbS5cblx0dGVzdChwYXR0ZXJuKSB7XG5cdFx0cmV0dXJuIHBhdHRlcm4udGVzdCh0aGlzLmhlYWQpO1xuXHR9XG5cbi8vXG4vLyAjIyBSZWZsZWN0aW9uXG4vL1xuXHQvLyBSZXR1cm4gdGV4dCBvZiBzdHJpbmcgc3RhcnRpbmcgYXQgb3VyIGBzdGFydEluZGV4YFxuXHRnZXQgaGVhZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5yYW5nZSgpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgcmFuZ2Ugb2YgdGhlIHN0cmluZyBmcm9tIGBzdGFydEluZGV4YCB0byBgZW5kSW5kZXhgIE5PTi1pbmNsdXNpdmUuXG5cdHJhbmdlKHN0YXJ0SW5kZXggPSB0aGlzLnN0YXJ0SW5kZXgsIGVuZEluZGV4ID0gdGhpcy5lbmRJbmRleCB8fCB0aGlzLnRleHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5zdWJzdHJpbmcoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xuXHR9XG5cblx0Ly8gTGVuZ3RoIG9mIHRoZSBzdHJlYW0uXG5cdGdldCBsZW5ndGgoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5sZW5ndGg7XG5cdH1cblxuXHQvLyBBcmUgd2UgYXQgdGhlIGVuZCBvZiB0aGUgc3RyZWFtP1xuXHRnZXQgaXNFbXB0eSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGFydEluZGV4ID09PSB0aGlzLmxlbmd0aDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHRcblx0fTtcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9UZXh0U3RyZWFtLmpzIiwiaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGxvYWQgc3RhbmRhcmQgcnVsZXMgZmlsZXMgaGVyZVxuaW1wb3J0IFwiLi9jb3JlXCI7XG5pbXBvcnQgXCIuL251bWJlcnNcIjtcbmltcG9ydCBcIi4vb3BlcmF0b3JzXCI7XG5pbXBvcnQgXCIuL2lmXCI7XG5pbXBvcnQgXCIuL3N0YXRlbWVudHNcIjtcbmltcG9ydCBcIi4vdHlwZXNcIjtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9pbmRleC5qcyIsIi8vIE1lbW9pemUvZm9yZ2V0IHNlbWFudGljcy5cblxuLy8gUmV0dXJuIGEgbWVtb2l6aW5nIGdldHRlciBmdW5jdGlvbi5cbi8vIFRFU1RNRVxuZXhwb3J0IGZ1bmN0aW9uIG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0aGlzW3Byb3BlcnR5XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSBnZXR0ZXIuYXBwbHkodGhpcyk7XG5cdFx0XHRpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHQvLyBEZWZpbmUgc28gdGhhdCB3ZSBjYW4gYmUgZGVsZXRlZCBhbmQgcmUtZGVmaW5lZCwgYnV0IG5vdCBzZXQgb3IgZW51bWVyYXRlZC5cblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHByb3BlcnR5LCB7IHZhbHVlLCBjb25maWd1cmFibGU6IHRydWUgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzW3Byb3BlcnR5XTtcblx0fVxufVxuXG5cbi8vIFJldHVybiBhIG1lbW9pemUgZnVuY3Rpb24gZm9yIHVzZSBhcyBhIGdldHRlciBpbiBhIGBPYmplY3QuZGVmaW5lUHJvcGVydHkoKWBcbi8vIFRFU1RNRVxuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZU1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpIHtcblx0cmV0dXJuIHtcblx0XHRnZXQgOiBtZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKVxuXHR9XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvbWVtb2l6ZS5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImlmXCIsXG5cdFwiaWYge2V4cHJlc3Npb259ICh0aGVufDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgaWZfIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgaWYgKCR7ZXhwcmVzc2lvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0cmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSlgXG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImJhY2t3YXJkc19pZlwiLFxuXHRcIntzdGF0ZW1lbnR9IGlmIHtleHByZXNzaW9ufSAoZWxzZVBocmFzZTooZWxzZXxvdGhlcndpc2UpIHtzdGF0ZW1lbnR9KT9cIixcblx0Y2xhc3MgYmFja3dhcmRzX2lmIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCwgZWxzZVBocmFzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cdFx0XHRsZXQgZWxzZVN0YXRlbWVudCA9IGVsc2VQaHJhc2UgJiYgZWxzZVBocmFzZS5yZXN1bHRzLnN0YXRlbWVudC50b1NvdXJjZSgpO1xuXG5cdFx0XHRpZiAoZWxzZVN0YXRlbWVudCkgcmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfSBlbHNlIHsgJHtlbHNlU3RhdGVtZW50fSB9YFxuXHRcdFx0cmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImVsc2VfaWZcIixcblx0XCIoZWxzZXxvdGhlcndpc2UpIGlmIHtleHByZXNzaW9ufSAodGhlbnw6KSB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZWxzZV9pZiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0c3RhdGVtZW50ID0gc3RhdGVtZW50ID8gc3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpIDogdW5kZWZpbmVkO1xuXG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGVsc2UgaWYgKCR7ZXhwcmVzc2lvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0cmV0dXJuIGBlbHNlIGlmICgke2V4cHJlc3Npb259KWBcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZWxzZVwiLFxuXHRcIihlbHNlfG90aGVyd2lzZSkge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGVsc2VfIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0c3RhdGVtZW50ID0gc3RhdGVtZW50ID8gc3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpIDogdW5kZWZpbmVkO1xuXG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGVsc2UgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGVsc2VgXG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2lmLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWFsaW5nIHdpdGggbnVtYmVyc1xuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlXCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy8gVE9ETzogaWYgYGlkZW50aWZpZXJgIGlzIFwid29yZFwiLCBvdXRwdXQgYGdldFdvcmQoKWAgZXRjXG5jbGFzcyBpbmRleF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9ue1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IHsgaWRlbnRpZmllciwgaW5kZXgsIGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRpbmRleCA9IGluZGV4LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdGlmICh0eXBlb2YgaW5kZXggPT09IFwibnVtYmVyXCIpIHtcblx0XHRcdGlmIChpbmRleCA+IDApIHtcblx0XHRcdFx0cmV0dXJuIGAke2V4cHJlc3Npb259WyR7aW5kZXggLSAxfV1gO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke2luZGV4fSlgO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gYCR7ZXhwcmVzc2lvbn1bJHtpbmRleH0gLSAxXWA7XG5cbi8vIFRoaXMgaXMgc2FmZXIsIGJ1dCB1c2luZyB0aGUgYWJvdmUgZm9yIGRlbW8gcHVycG9zZXNcbi8vXHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke2luZGV4fSlgO1xuXHR9XG59XG5cbi8vIE51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmc6XG4vL1x0LSBgaXRlbSAxIG9mIC4uLmBcbi8vXHQtIGBpdGVtICMyIG9mIC4uLmBcbi8vIE5PVEU6IHRoZXNlIGluZGljZXMgYXJlIE9ORSBiYXNlZCwgTk9UIHplcm8gYmFzZWQgYXMgaXMgSmF2YXNjcmlwdC5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFwiaW5kZXhfZXhwcmVzc2lvblwiLCBcIntpZGVudGlmaWVyfSAoIyk/e2luZGV4OmV4cHJlc3Npb259IG9mIHtleHByZXNzaW9ufVwiLCBpbmRleF9leHByZXNzaW9uKTtcblxuY2xhc3Mgb3JkaW5hbCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7fVxucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZmlyc3RcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gMSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNlY29uZFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAyIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwidGhpcmRcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gMyB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImZvdXJ0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA0IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZmlmdGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNpeHRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDYgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJzZXZlbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDcgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJlaWdodGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gOCB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcIm5pbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDkgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJ0ZW50aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxMCB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInBlbnVsdGltYXRlXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IC0yIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZmluYWxcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJsYXN0XCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IC0xIH0pO1xuXG4vLyBUT0RPOiBzaXh0eS1maWZ0aCwgdHdvIGh1bmRyZWQgZm9ydHkgbmludGguLi5cblxuLy8gQWx0ZXJuYXRpdmUgZm9ybSBmb3IgbnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZy5cbi8vIE5PVEU6IGRvbid0IGFkZCBhcyBhbiBleHByZXNzaW9uIHNpbmNlIHdlJ3JlIGF1dG8tbWVyZ2VkIHdpdGggYGluZGV4X2V4cHJlc3Npb25gIGFib3ZlLlxucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJpbmRleF9leHByZXNzaW9uXCIsIFwidGhlIHtpbmRleDpvcmRpbmFsfSB7aWRlbnRpZmllcn0gb2Yge2V4cHJlc3Npb259XCIsIGluZGV4X2V4cHJlc3Npb24pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvbnVtYmVycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgaW5maXggYW5kIHByZWZpeCBvcGVyYXRvcnMuXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8jIyBJbmZpeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj4ge3Joc31gLCBlZzogYGEgaXMgMWBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgdHdvIGFyZ3VtZW50cyAoYGxoc2AgYW5kIGByaHNgKSBpbnRvIG91dHB1dC5cblxuLy8gTk9URTogYHByZWNlZGVuY2VgIG51bWJlcnMgY29tZSBmcm9tIEphdmFzY3JpcHQgZXF1aXZhbGVudHNcbi8vXHRcdCBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9PcGVyYXRvcnMvT3BlcmF0b3JfUHJlY2VkZW5jZVxuXG5jbGFzcyBpbmZpeF9vcGVyYXRvciBleHRlbmRzIFJ1bGUuQWx0ZXJuYXRpdmVzIHtcblxuLy8gTk9URTogRm9yIHRoZSBvcGVyYXRvcnMgdGhlbXNlbHZlcywgd2UgcmVhbGx5IHdhbnQgdG8ganVzdCB1c2UgbG9uZ2VzdCBtYXRjaC5cbi8vIFx0XHQgV2Ugd2FudCB0byBwdXNoIHRoZSBwcmVjZWRlbmNlIHVwIHRvIHRoZSBleHByZXNzaW9uIGFuZCBldmFsdWF0ZSBkaWZmZXJlbnQgZXhwcmVzc2lvbnMgYmFzZWQgb24gdGhhdC5cbi8vIFx0Ly8gRmluZCBiZXN0IG1hdGNoIGFjY29yZGluZyB0byBvcGVyYXRvciBwcmVjZWRlbmNlIGFzIGRlZmluZWQgYmVsb3cuXG4vLyBcdGdldEJlc3RNYXRjaChtYXRjaGVzKSB7XG4vLyBcdFx0Y29uc29sZS53YXJuKFwiR0JNXCIsIG1hdGNoZXMsIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLnByZWNlZGVuY2UpLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5tYXRjaGVkVGV4dCkpO1xuLy8gXHRcdHJldHVybiBtYXRjaGVzLnJlZHVjZShmdW5jdGlvbiAoYmVzdCwgbmV4dCkge1xuLy8gXHRcdFx0Ly8gdGFrZSBoaWdoZXN0IHByZWNlZGVuY2UgbWF0Y2ggZmlyc3Rcbi8vIFx0XHRcdGlmIChuZXh0LnByZWNlZGVuY2UgPiBiZXN0LnByZWNlZGVuY2UpIHJldHVybiBuZXh0O1xuLy8gXHRcdFx0Ly8gdGFrZSBsb25nZXN0IG1hdGNoIGlmIHNhbWUgcHJlY2VkZW5jZVxuLy8gXHRcdFx0aWYgKG5leHQucHJlY2VkZW5jZSA9PT0gYmVzdC5wcmVjZWRlbmNlKSB7XG4vLyBcdFx0XHRcdGlmIChuZXh0LmVuZEluZGV4ID4gYmVzdC5lbmRJbmRleCkgcmV0dXJuIG5leHQ7XG4vLyBcdFx0XHR9XG4vLyBcdFx0XHRyZXR1cm4gYmVzdDtcbi8vIFx0XHR9LCBtYXRjaGVzWzBdKTtcbi8vIFx0fVxufVxuXG5wYXJzZXIuYWRkUnVsZShcImluZml4X29wZXJhdG9yXCIsIG5ldyBpbmZpeF9vcGVyYXRvcigpKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImFuZFwiLFxuXHRjbGFzcyBhbmQgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gNjsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAmJiAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwib3JcIixcblx0Y2xhc3Mgb3IgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gNTsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSB8fCAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXNcIixcblx0IGNsYXNzIGlzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90XCIsXG5cdCBjbGFzcyBpc19ub3QgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT0gJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGV4YWN0bHlcIixcblx0Y2xhc3MgaXNfZXhhY3RseSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PT0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgZXhhY3RseVwiLFxuXHQgY2xhc3MgIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9PSAke2J9KWAgfSB9XG4pO1xuXG4vL1RPRE86IGBzcGVsbC5pc09mVHlwZSh0aGluZywgdHlwZSlgXG4vL1RPRE86IGBpcyBzYW1lIHR5cGUgYXNgID9cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBhXCIsXG5cdCBjbGFzcyBpc19hIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBhblwiLFxuXHQgY2xhc3MgaXNfYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGBzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGFcIixcblx0IGNsYXNzIGlzX25vdF9hIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGFuXCIsXG5cdCBjbGFzcyBpc19ub3RfYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGAhc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcblxuLy9UT0RPOiBgc3BlbGwuY29udGFpbnMoY29sbGVjdGlvbiwgdGhpbmcpYFxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGluXCIsXG5cdCBjbGFzcyBpc19pbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgb25lIG9mXCIsXG5cdCBjbGFzcyBpc19vbmVfb2YgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGluXCIsXG5cdCBjbGFzcyBpc19ub3RfaW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3Qgb25lIG9mXCIsXG5cdCBjbGFzcyBpc19ub3Rfb25lX29mIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cblxuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaW5jbHVkZXNcIixcblx0IGNsYXNzIGluY2x1ZGVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJjb250YWluc1wiLFxuXHQgY2xhc3MgY29udGFpbnMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiZG9lcyBub3QgaW5jbHVkZVwiLFxuXHQgY2xhc3MgZG9lc19ub3RfaW5jbHVkZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImRvZXMgbm90IGNvbnRhaW5cIixcblx0IGNsYXNzIGRvZXNfbm90X2NvbnRhaW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCI+XCIsXG5cdCBjbGFzcyBndCBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGdyZWF0ZXIgdGhhblwiLFxuXHQgY2xhc3MgaXNfZ3JlYXRlcl90aGFuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCI+PVwiLFxuXHQgY2xhc3MgZ3RlIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0b1wiLFxuXHQgY2xhc3MgaXNfZ3RlIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPFwiLFxuXHQgY2xhc3MgbHQgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDwgJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBsZXNzIHRoYW5cIixcblx0IGNsYXNzIGlzX2xlc3NfdGhhbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDwgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPD1cIixcblx0IGNsYXNzIGx0ZSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPD0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG9cIixcblx0IGNsYXNzIGlzX2x0ZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9IH1cbik7XG5cblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiXFxcXCtcIixcblx0IGNsYXNzIHBsdXMgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMzsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKyAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwicGx1c1wiLFxuXHQgY2xhc3MgcGx1cyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMzsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKyAke2J9YCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIi1cIixcblx0IGNsYXNzIG1pbnVzIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcIm1pbnVzXCIsXG5cdCBjbGFzcyBtaW51cyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMzsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLSAke2J9YCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIlxcXFwqXCIsXG5cdCBjbGFzcyB0aW1lcyBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJ0aW1lc1wiLFxuXHQgY2xhc3MgdGltZXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTQ7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICogJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCIvXCIsXG5cdCBjbGFzcyBkaXZpZGVkX2J5IGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTQ7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC8gJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImRpdmlkZWQgYnlcIixcblx0IGNsYXNzIGRpdmlkZWRfYnkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTQ7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC8gJHtifWAgfSB9XG4pO1xuXG4vL1RPRE86ICBgKz1gIGV0Yz8gIG90aGVyIG1hdGggZnVuY3Rpb25zP1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6aW5maXhfb3BlcmF0b3J9IHtyaHM6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Ly8gV2UgQ0FOTk9UIG1hdGNoIGlmIGBpbmZpeF9vcGVyYXRvcmAgaXNuJ3QgZm91bmQgaW4gdGhlIGV4cHJlc3Npb24uXG5cdFx0dGVzdFJ1bGUgPSBcImluZml4X29wZXJhdG9yXCI7XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaHMsIHJocywgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGxocy50b1NvdXJjZShjb250ZXh0KSwgcmhzLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIyMgUG9zdGlmeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj5gLCBlLmcuIGBhIGlzIGRlZmluZWRgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBKUyBvdXRwdXQuXG5cbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIGRlZmluZWRcIixcblx0Y2xhc3MgaXNfZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ICE9PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBkZWZpbmVkXCIsXG5cdGNsYXNzIGlzX25vdF9kZWZpbmVkIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gPT09ICd1bmRlZmluZWQnKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgdW5kZWZpbmVkXCIsXG5cdGNsYXNzIGlzX3VuZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcblxuXG4vL1RPRE86IGBzcGVsbC5pc0VtcHR5KHRoaW5nKWBcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIGVtcHR5XCIsXG5cdGNsYXNzIGlzX2VtcHR5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYHNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgZW1wdHlcIixcblx0Y2xhc3MgaXNfbm90X2VtcHR5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCFzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwb3N0Zml4X29wZXJhdG9yX2V4cHJlc3Npb25cIixcblx0XCJ7ZXhwcmVzc2lvbn0ge29wZXJhdG9yOnBvc3RmaXhfb3BlcmF0b3J9XCIsXG5cdGNsYXNzIHBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHQvLyBXZSBDQU5OT1QgbWF0Y2ggaWYgYHBvc3RmaXhfb3BlcmF0b3JgIGlzbid0IGZvdW5kIGluIHRoZSBleHByZXNzaW9uLlxuXHRcdHRlc3RSdWxlID0gXCJwb3N0Zml4X29wZXJhdG9yXCI7XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBvcGVyYXRvciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIG9wZXJhdG9yLnRvSlMoZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy9cbi8vXHQjIyBSZXR1cm5zXG4vL1xuXG4vLyBSZXR1cm4gYSB2YWx1ZVxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJyZXR1cm5fc3RhdGVtZW50XCIsIFwicmV0dXJuIHtleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByZXR1cm5fc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBgcmV0dXJuICR7ZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KX1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vXG4vL1x0IyMgQXNzaWdubWVudFxuLy9cbmNsYXNzIGFzc2lnbm1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCB7IHRoaW5nLCB2YWx1ZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdGlmICh0aGluZyBpbnN0YW5jZW9mIFJ1bGUuSWRlbnRpZmllcikge1xuXHRcdFx0Ly8gVE9ETzogZGVjbGFyZSBpZGVudGlmaWVyIGlmIG5vdCBpbiBzY29wZSwgZXRjXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGAke3RoaW5nLnRvU291cmNlKGNvbnRleHQpfSA9ICR7dmFsdWUudG9Tb3VyY2UoY29udGV4dCl9YDtcblx0fVxufVxuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJ7dGhpbmc6ZXhwcmVzc2lvbn0gPSB7dmFsdWU6ZXhwcmVzc2lvbn1cIiwgYXNzaWdubWVudCk7XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJzZXQge3RoaW5nOmV4cHJlc3Npb259IHRvIHt2YWx1ZTpleHByZXNzaW9ufVwiLCBhc3NpZ25tZW50KTtcblxuXG4vL1xuLy9cdCMjIFVzZXIgaW50ZXJhY3Rpb25cbi8vXG5cbi8vIEFsZXJ0IGEgbWVzc2FnZS5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYWxlcnRcIiwgXCJhbGVydCB7bWVzc2FnZTpleHByZXNzaW9ufSAoYnV0dG9uQ2xhdXNlOndpdGgge3RleHR9KT9cIixcblx0Y2xhc3MgYWxlcnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgYnV0dG9uQ2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBidXR0b25OYW1lID0gYnV0dG9uQ2xhdXNlID8gYnV0dG9uQ2xhdXNlLnJlc3VsdHMudGV4dC50b1NvdXJjZShjb250ZXh0KSA6ICdcIk9LXCInO1xuXHRcdFx0cmV0dXJuIGBhd2FpdCBzcGVsbC5hbGVydCgke21lc3NhZ2V9LCAke2J1dHRvbk5hbWV9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBXYXJuaW5nIG1lc3NhZ2UgLS0gbGlrZSBhbGVydCBidXQgZmFuY2llci5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwid2FyblwiLCBcIndhcm4ge2V4cHJlc3Npb246ZXhwcmVzc2lvbn0gKGJ1dHRvbkNsYXVzZTp3aXRoIHt0ZXh0fSk/XCIsXG5cdGNsYXNzIHdhcm4gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgYnV0dG9uQ2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBidXR0b25OYW1lID0gYnV0dG9uQ2xhdXNlID8gYnV0dG9uQ2xhdXNlLnJlc3VsdHMudGV4dC50b1NvdXJjZShjb250ZXh0KSA6ICdcIk9LXCInO1xuXHRcdFx0cmV0dXJuIGBhd2FpdCBzcGVsbC53YXJuKCR7bWVzc2FnZX0sICR7YnV0dG9uTmFtZX0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gQ29uZmlybSBtZXNzYWdlIC0tIHByZXNlbnQgYSBxdWVzdGlvbiB3aXRoIHR3byBhbnN3ZXJzLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJjb25maXJtXCIsIFwiY29uZmlybSB7bWVzc2FnZTpleHByZXNzaW9ufSAoYnV0dG9uQ2xhdXNlOndpdGgge29rQnV0dG9uOnRleHR9IChjYW5jZWxDbGF1c2U6IChhbmR8b3IpIHtjYW5jZWxCdXR0b246dGV4dH0pPyApP1wiLFxuXHRjbGFzcyBjb25maXJtIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG1lc3NhZ2UsIGJ1dHRvbkNsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bWVzc2FnZSA9IG1lc3NhZ2UudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgb2tCdXR0b24gPSAnXCJPS1wiJywgY2FuY2VsQnV0dG9uID0gJ1wiQ2FuY2VsXCInO1xuXG5cdFx0XHRpZiAoYnV0dG9uQ2xhdXNlKSB7XG5cdFx0XHRcdG9rQnV0dG9uID0gYnV0dG9uQ2xhdXNlLnJlc3VsdHMub2tCdXR0b24ucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0bGV0IGNhbmNlbENsYXVzZSA9IGJ1dHRvbkNsYXVzZS5yZXN1bHRzLmNhbmNlbENsYXVzZTtcblx0XHRcdFx0aWYgKGNhbmNlbENsYXVzZSkgY2FuY2VsQnV0dG9uID0gY2FuY2VsQ2xhdXNlLnJlc3VsdHMuY2FuY2VsQnV0dG9uLnJlc3VsdHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLmNvbmZpcm0oJHttZXNzYWdlfSwgJHtva0J1dHRvbn0sICR7Y2FuY2VsQnV0dG9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cbmltcG9ydCBnbG9iYWwgZnJvbSBcIi4uL2dsb2JhbFwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vIERFQUQgU0lNUExFIFBMVVJBTElaRVIuLi4gUkVBTExZIE5PVCBWRVJZIEdPT0RcbmZ1bmN0aW9uIHBsdXJhbGl6ZSh3b3JkKSB7XG5cdHJldHVybiB3b3JkICsgXCJzXCI7XG59XG5cblxuLy9NT1ZFIFRPIGBvYmplY3RzYD9cbi8vIFByb3BlcnRpZXMgY2xhdXNlOiBjcmVhdGVzIGFuIG9iamVjdCB3aXRoIG9uZSBvciBtb3JlIHByb3BlcnR5IHZhbHVlcy5cbi8vXHRgZm9vID0gMSwgYmFyID0gMmBcbi8vVE9ETzogd291bGQgbGlrZSB0byB1c2UgYGFuZGAgYnV0IHRoYXQgd2lsbCBiYXJmIG9uIGV4cHJlc3Npb25zLi4uXG4vL1RPRE86IGhvdyB0byBkbyBwcm9wZXJ0aWVzIG9uIG11bHRpcGxlIGxpbmVzP1xucGFyc2VyLmFkZExpc3QoXG5cdFwib2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc1wiLFxuXHRcIlsoe2lkZW50aWZpZXJ9ID0ge2V4cHJlc3Npb259KSAsXVwiLFxuXHRjbGFzcyBvYmplY3RfbGl0ZXJhbF9wcm9wZXJ0aWVzIGV4dGVuZHMgUnVsZS5MaXN0IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgcHJvcHMgPSB0aGlzLnJlc3VsdHMubWF0Y2hlZC5tYXAoZnVuY3Rpb24gKHByb3ApIHtcblx0XHRcdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBleHByZXNzaW9uIH0gPSBwcm9wLnJlc3VsdHM7XG5cdFx0XHRcdFx0bGV0IGtleSA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRcdFx0bGV0IHZhbHVlID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0XHRyZXR1cm4gYFwiJHtrZXl9XCI6ICR7dmFsdWV9YFxuXHRcdFx0XHR9KTtcblx0XHRcdHJldHVybiBgeyAke3Byb3BzLmpvaW4oXCIsIFwiKX0gfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBgbmV3YFxuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYWxsIHR5cGVzIHRha2UgYW4gb2JqZWN0IG9mIHByb3BlcnRpZXM/Pz8/XG5wYXJzZXIuYWRkU2VxdWVuY2UoXG5cdFwibmV3X3RoaW5nXCIsXG5cdFwiKGNyZWF0ZXxuZXcpIHt0eXBlfSAocHJvcHNfY2xhdXNlOndpdGgge3Byb3BzOm9iamVjdF9saXRlcmFsX3Byb3BlcnRpZXN9KT9cIixcblx0Y2xhc3MgbmV3X3RoaW5nIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdHlwZSwgcHJvcHNfY2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHR0eXBlID0gdHlwZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBwcm9wcyA9IHByb3BzX2NsYXVzZSAmJiBwcm9wc19jbGF1c2UucmVzdWx0cy5wcm9wcy50b1NvdXJjZShjb250ZXh0KSB8fCBcIlwiO1xuXG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIG9iamVjdCwgd2hpY2ggd2UnbGwgY3JlYXRlIHdpdGggYW4gb2JqZWN0IGxpdGVyYWwuXG5cdFx0XHRpZiAodHlwZSA9PT0gXCJPYmplY3RcIikge1xuXHRcdFx0XHRpZiAoIXByb3BzX2NsYXVzZSkgcmV0dXJuIFwie31cIjtcblx0XHRcdFx0cmV0dXJuIGAke3Byb3BzfWA7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBgbmV3ICR7dHlwZX0oJHtwcm9wc30pYDtcblx0XHR9XG5cdH1cbik7XG4vLyBUaGlzIHdvcmtzIGFzIGFuIGV4cHJlc3Npb24gT1IgYSBzdGF0ZW1lbnQuXG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLm5ld190aGluZyk7XG5wYXJzZXIuYWRkUnVsZShcInN0YXRlbWVudFwiLCBwYXJzZXIucnVsZXMubmV3X3RoaW5nKTtcblxuXG5cblxuLy8gRGVmaW5lIGNsYXNzLlxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWZpbmVfdHlwZVwiLFxuXHRcImRlZmluZSB0eXBlIHt0eXBlfSAoZXh0ZW5kc19jbGF1c2U6YXMgKGF8YW4pIHtzdXBlclR5cGU6dHlwZX0pP1wiLFxuXHRjbGFzcyBkZWZpbmVfdHlwZSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBleHRlbmRzX2NsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0dHlwZSA9IHR5cGUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgc3VwZXJUeXBlID0gZXh0ZW5kc19jbGF1c2UgJiYgZXh0ZW5kc19jbGF1c2UucmVzdWx0cy5zdXBlclR5cGUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAoc3VwZXJUeXBlKSB7XG5cdFx0XHRcdHJldHVybiBgY2xhc3MgJHt0eXBlfSBleHRlbmRzICR7c3VwZXJUeXBlfWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYGNsYXNzICR7dHlwZX1gO1xuXG5cdFx0fVxuXHR9XG4pO1xuXG4vL1RPRE86IGNvbnN0cnVjdG9yXG5cblxuXG4vL01PVkUgVE8gYGZ1bmN0aW9uc2A/XG4vLyBBcmd1bWVudHMgY2xhdXNlIGZvciBtZXRob2RzXG4vL1x0YHdpdGggZm9vYCBvciBgd2l0aCBmb28gYW5kIGJhciBhbmQgYmF6YFxuLy9UT0RPOiB7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cdD0+IHJlcXVpcmVzIGAsYCBpbnN0ZWFkIG9mIGBhbmRgXG4vL1RPRE86IGB3aXRoIGZvbyBhcyBUeXBlYFxuLy9UT0RPOlx0YHdpdGggZm9vLi4uYCBmb3Igc3BsYXQ/XG5wYXJzZXIuYWRkU2VxdWVuY2UoXG5cdFwiYXJnc19jbGF1c2VcIixcblx0XCJ3aXRoIFthcmdzOntpZGVudGlmaWVyfSAsXVwiLFxuXHRjbGFzcyBhcmdzX2NsYXVzZSBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRcdC8vIFJldHVybiBqdXN0IHRoZSBhcmd1bWVudHMgYXMgdGhlIHJlc3VsdHNcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiBzdXBlci5yZXN1bHRzLmFyZ3M7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIGp1c3QgdGhlIGFyZ3VtZW50IG5hbWVzIGFzIGFuIGFycmF5XG5cdFx0Z2V0IGFyZ05hbWVzKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMucmVzdWx0cy5tYXRjaGVkLm1hcChhcmcgPT4gYXJnLm1hdGNoZWQpO1xuXHRcdH1cblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiB0aGlzLmFyZ05hbWVzLmpvaW4oXCIsIFwiKTtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gRGVjbGFyZSBpbnN0YW5jZSBtZXRob2Qgb3Igbm9ybWFsIGZ1bmN0aW9uLlxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX21ldGhvZFwiLFxuXHRcIih0b3xvbikge2lkZW50aWZpZXJ9IHthcmdzX2NsYXVzZX0/IChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBkZWNsYXJlX21ldGhvZCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBhcmdzX2NsYXVzZSwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGFyZ3MgPSAoYXJnc19jbGF1c2UgJiYgYXJnc19jbGF1c2UudG9Tb3VyY2UoY29udGV4dCkpIHx8IFwiXCI7XG5cdFx0XHRzdGF0ZW1lbnQgPSAoc3RhdGVtZW50ID8gYCB7ICR7c3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpfSB9YCA6IFwiXCIpO1xuXG5cdFx0XHRyZXR1cm4gYCR7aWRlbnRpZmllcn0oJHthcmdzfSkke3N0YXRlbWVudH1gXG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIERlY2xhcmUgXCJhY3Rpb25cIiwgd2hpY2ggY2FuIGJlIGNhbGxlZCBnbG9iYWxseSBhbmQgYWZmZWN0cyB0aGUgcGFyc2VyLlxuLy8gVE9ETzogYHdpdGhgIGNsYXVzZSAod2lsbCBjb25mbGljdCB3aXRoIGB3b3JkYClcbi8vIFRPRE86IGluc3RhbGwgaW4gcGFyc2VyIHNvbWVob3dcbi8vIFRPRE86IGNyZWF0ZSBpbnN0YW5jZSBmdW5jdGlvbj8gIG9yIG1heWJlIHdlIGRvbid0IG5lZWQgaXQ6XG4vL1x0XHRcdGBhY3Rpb24gdHVybiBDYXJkIG92ZXJgIGZvciBhbiBpbnN0YW5jZSBpcyBqdXN0IGB0dXJuIG1lIG92ZXJgXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfYWN0aW9uXCIsXG5cdFwiYWN0aW9uICh3b3JkX2NsYXVzZTp7d29yZH18e3R5cGV9KSsgKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGRlY2xhcmVfYWN0aW9uIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgd29yZF9jbGF1c2UsIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bGV0IHdvcmRzID0gd29yZF9jbGF1c2UubWF0Y2hlZC5tYXAoIHdvcmQgPT4gd29yZC50b1NvdXJjZShjb250ZXh0KSApO1xuXHRcdFx0Ly8gaWYgdGhlcmUncyBvbmx5IG9uZSB3b3JkLCBpdCBjYW4ndCBiZSBhIGJsYWNrbGlzdGVkIGlkZW50aWZpZXIgb3IgYSB0eXBlXG5cdFx0XHRpZiAod29yZHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdHZhciB3b3JkID0gd29yZHNbMF07XG5cdFx0XHRcdGlmICh3b3JkX2NsYXVzZS5tYXRjaGVkIGluc3RhbmNlb2YgUnVsZS5UeXBlKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZSgnZGVjbGFyZV9hY3Rpb24nKTogb25lLXdvcmQgYWN0aW9ucyBtYXkgbm90IGJlIHR5cGVzOiAke3dvcmR9YCk7XG5cdFx0XHRcdH1cblxuLy8gSEFDSzogYGdsb2JhbC5wYXJzZXJgIGlzIGEgaGFjayBoZXJlIGZvciBjb252ZW5pZW5jZSBpbiB0ZXN0aW5nLi4uXG5cdFx0XHRcdGxldCBwYXJzZXIgPSBjb250ZXh0ID8gY29udGV4dC5wYXJzZXIgOiBnbG9iYWwucGFyc2VyO1xuXHRcdFx0XHRpZiAocGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYmxhY2tsaXN0W3dvcmRdKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZSgnZGVjbGFyZV9hY3Rpb24nKTogb25lLXdvcmQgYWN0aW9ucyBtYXkgbm90IGJlIGJsYWNrbGlzdGVkIGlkZW50aWZpZXJzXCI6ICR7d29yZH1gKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBmaWd1cmUgb3V0IGFyZ3VtZW50cyBhbmQvb3IgdHlwZXNcblx0XHRcdHZhciBhcmdzID0gW107XG5cdFx0XHR2YXIgdHlwZXMgPSBbXTtcblx0XHRcdC8vIGlmIGFueSBvZiB0aGUgd29yZHMgYXJlIHR5cGVzIChjYXBpdGFsIGxldHRlcikgbWFrZSB0aGF0IGFuIGFyZ3VtZW50IG9mIHRoZSBzYW1lIG5hbWUuXG5cdFx0XHR3b3JkX2NsYXVzZS5tYXRjaGVkLm1hcCggKGl0ZW0sIGluZGV4KSA9PiB7XG5cdFx0XHRcdGlmIChpdGVtIGluc3RhbmNlb2YgUnVsZS5UeXBlKSB7XG5cdFx0XHRcdFx0bGV0IHR5cGUgPSB3b3Jkc1tpbmRleF07XG5cdFx0XHRcdFx0bGV0IHdvcmQgPSB0eXBlLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFx0dHlwZXMucHVzaChbdHlwZSwgd29yZF0pO1xuXHRcdFx0XHRcdHdvcmRzW2luZGV4XSA9IHdvcmQ7XG5cdFx0XHRcdFx0YXJncy5wdXNoKHdvcmQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdC8vIGdldCBzdGF0aWMgbWV0aG9kIG5hbWUgYW5kIGFyZ3VtZW50cyBmb3Igb3V0cHV0XG5cdFx0XHRsZXQgbWV0aG9kTmFtZSA9IHdvcmRzLmpvaW4oXCJfXCIpO1xuXHRcdFx0YXJncyA9IGFyZ3Muam9pbihcIiwgXCIpO1xuXG5cdFx0XHQvLyBmaWd1cmUgb3V0IGlmIHRoZXJlIGFyZSBhbnkgY29uZGl0aW9ucyBvbiB0aGUgYWJvdmVcblx0XHRcdGxldCBjb25kaXRpb25zID0gdHlwZXMubWFwKCAoW3R5cGUsIHdvcmRdKSA9PiB7XG5cdFx0XHRcdHJldHVybiBgXFx0aWYgKCFzcGVsbC5pc0EoJHt3b3JkfSwgJHt0eXBlfSkpIHJldHVybiB1bmRlZmluZWRgO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIGdldCBzdGF0ZW1lbnRzLCBhZGRpbmcgY29uZGl0aW9ucyBpZiBuZWNlc3Nhcnlcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IFwiXCI7XG5cdFx0XHRsZXQgc3RhdGVtZW50cyA9IFwiXCI7XG5cdFx0XHRpZiAoc3RhdGVtZW50KSB7XG5cdFx0XHRcdHN0YXRlbWVudHMgPSBbXTtcblx0XHRcdFx0aWYgKGNvbmRpdGlvbnMubGVuZ3RoKSBzdGF0ZW1lbnRzID0gc3RhdGVtZW50cy5jb25jYXQoY29uZGl0aW9ucyk7XG5cdFx0XHRcdGlmIChzdGF0ZW1lbnQpIHN0YXRlbWVudHMucHVzaChcIlxcdFwiICsgc3RhdGVtZW50KTtcblx0XHRcdFx0c3RhdGVtZW50cyA9IGAge1xcbiR7c3RhdGVtZW50cy5qb2luKFwiXFxuXCIpfVxcbiB9XFxuYDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGNvbmRpdGlvbnMubGVuZ3RoKSB7XG5cdFx0XHRcdHN0YXRlbWVudHMgPSBgIHtcXG4ke2NvbmRpdGlvbnMuam9pbihcIlxcblwiKX1gO1xuXHRcdFx0fVxuLy9kZWJ1Z2dlcjtcblx0XHRcdC8vIENyZWF0ZSBhcyBhIFNUQVRJQyBmdW5jdGlvblxuXHQvL1RPRE86IGNyZWF0ZSBhcyBhbiBpbnN0YW5jZSBmdW5jdGlvbiB3ZSBjYW4gY2FsbCBvbiBvdXJzZWxmIVxuXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHttZXRob2ROYW1lfSgke2FyZ3N9KSR7c3RhdGVtZW50c31gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBHZXR0ZXIgZWl0aGVyIHdpdGggb3Igd2l0aG91dCBhcmd1bWVudHMuXG4vLyBJZiB5b3Ugc3BlY2lmeSBhcmd1bWVudHMsIHlpZWxkcyBhIG5vcm1hbCBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGEgdmFsdWUuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImdldHRlclwiLFxuXHRcImdldCB7aWRlbnRpZmllcn0ge2FyZ3NfY2xhdXNlfT8gKFxcXFw6KT8ge2V4cHJlc3Npb259P1wiLFxuXHRjbGFzcyBnZXR0ZXIgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJnc19jbGF1c2UsIGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGFyZ3MgPSBhcmdzX2NsYXVzZSAmJiBhcmdzX2NsYXVzZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGV4cHJlc3Npb24gPSAoZXhwcmVzc2lvbiA/IGAgeyByZXR1cm4gKCR7ZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KX0pIH1gIDogXCJcIik7XG5cblx0XHRcdGlmIChhcmdzICYmIGV4cHJlc3Npb24pIHtcblx0XHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pJHtleHByZXNzaW9ufWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChhcmdzKSB7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KWA7XG5cblx0XHRcdH0gZWxzZSBpZiAoZXhwcmVzc2lvbikge1xuXHRcdFx0XHRyZXR1cm4gYGdldCAke2lkZW50aWZpZXJ9KCkke2V4cHJlc3Npb259YDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBgZ2V0ICR7aWRlbnRpZmllcn0oKWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fVxuKTtcblxuLy8gU2V0dGVyLlxuLy8gQ29tcGxhaW5zIGlmIHlvdSBzcGVjaWZ5IG1vcmUgdGhhbiBvbmUgYXJndW1lbnQuXG4vLyBJZiB5b3UgZG9uJ3QgcGFzcyBhbiBleHBsaWNpdCBhcmd1bWVudCwgd2UnbGwgYXNzdW1lIGl0J3MgdGhlIHNhbWUgYXMgdGhlIGlkZW50aWZpZXIuXG4vLyBlZztcdGBzZXQgY29sb3I6IHNldCB0aGUgY29sb3Igb2YgbXkgdGV4dCB0byBjb2xvcmBcbi8vXG4vLyBUT0RPOiBpbnRlcm5hbCBnZXR0ZXIvc2V0dGVyIHNlbWFudGljcyBhbGEgb2JqZWN0aXZlIENcbi8vXHRcdFx0YHNldCBjb2xvcjogaWYgY29sb3IgaXMgaW4gW1wicmVkXCIsIFwiYmx1ZVwiXSB0aGVuIHNldCBteSBjb2xvciB0byBjb2xvcmBcbi8vXHRcdCA9PiBgbXkgY29sb3JgIHdpdGhpbiBzZXR0ZXIgc2hvdWxkIGF1dG9tYXRpY2FsbHkgdHJhbnNsYXRlIHRvIGB0aGlzLl9jb2xvcmAgPz8/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcInNldHRlclwiLFxuXHRcInNldCB7aWRlbnRpZmllcn0ge2FyZ3NfY2xhdXNlfT8gKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGdldHRlciBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBhcmdzX2NsYXVzZSwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblxuXHRcdFx0Ly8gQXNzdW1lIHdlIHdhbnQgdGhlIHNhbWUgbmFtZSBhcyB0aGUgaWRlbnRpZmllciBpZiBubyBhcmd1bWVuc1xuXHRcdFx0bGV0IGFyZ3MgPSAoYXJnc19jbGF1c2UgJiYgYXJnc19jbGF1c2UuYXJnTmFtZXMpIHx8IFtpZGVudGlmaWVyXTtcblx0XHRcdC8vIENvbXBsYWluIGlmIG1vcmUgdGhhbiBvbmUgYXJndW1lbnRcblx0XHRcdGlmIChhcmdzLmxlbmd0aCA+IDEpXG5cdFx0XHRcdGNvbnNvbGUud2FybihcInBhcnNlKCdzZXR0ZXInKTogb25seSBvbmUgYXJndW1lbnQgYWxsb3dlZCBpbiBzZXR0ZXI6ICBcIiwgdGhpcy5tYXRjaGVkVGV4dCk7XG5cblx0XHRcdHN0YXRlbWVudCA9IChzdGF0ZW1lbnQgPyBgIHsgJHtzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCl9IH1gIDogXCJcIik7XG5cblx0XHRcdHJldHVybiBgc2V0ICR7aWRlbnRpZmllcn0oJHthcmdzWzBdfSkke3N0YXRlbWVudH1gO1xuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRkZWNsYXJlIHByb3BlcnRpZXNcbi8vXG5cbi8vVE9ETzogYW5vdGhlciBuYW1lIGZvciBgY29uc3RhbnRgID9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eVwiLFxuXHRcIihzY29wZTpwcm9wZXJ0eXxjb25zdGFudHxzaGFyZWQgcHJvcGVydHkpIHtpZGVudGlmaWVyfSAodmFsdWVfY2xhdXNlOj0ge2V4cHJlc3Npb259KT9cIixcblx0Y2xhc3MgZGVjbGFyZV9wcm9wZXJ0eSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzY29wZSwgaWRlbnRpZmllciwgdmFsdWVfY2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRzY29wZSA9IHNjb3BlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgdmFsdWUgPSB2YWx1ZV9jbGF1c2UgJiYgXCIgPSBcIiArIHZhbHVlX2NsYXVzZS5yZXN1bHRzLmV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCkgfHwgXCJcIjtcblxuXHRcdFx0bGV0IGRlY2xhcmF0aW9uID0gYCR7aWRlbnRpZmllcn0ke3ZhbHVlfWA7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdGlmICghdmFsdWUpIGNvbnNvbGUud2FybihcInBhcnNlKCdkZWNsYXJlX3Byb3BlcnR5Jyk6IGNvbnN0YW50IHByb3BlcnRpZXMgbXVzdCBkZWNsYXJlIGEgdmFsdWU6ICBcIiwgdGhpcy5tYXRjaGVkVGV4dCk7XG5cdFx0XHRcdFx0cmV0dXJuIGBjb25zdCAke2RlY2xhcmF0aW9ufWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZCBwcm9wZXJ0eVwiOlxuXHRcdFx0XHRcdHJldHVybiBgQHByb3RvXFxuJHtkZWNsYXJhdGlvbn1gO1xuXG5cdFx0XHRcdGNhc2UgXCJwcm9wZXJ0eVwiOlxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBkZWNsYXJhdGlvbjtcblx0XHRcdH1cblx0XHR9XG5cdH1cbik7XG5cbi8vIFRPRE86IHNjb3BlX21vZGlmaWVyPz8/XG4vLyBUT0RPOiBpbml0aWFsIHZhbHVlXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlcIixcblx0XCJwcm9wZXJ0eSB7aWRlbnRpZmllcn0gYXMgKGF8YW4pPyB7dHlwZX1cIixcblx0Y2xhc3MgZGVjbGFyZV9wcm9wZXJ0eSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCB0eXBlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHR5cGUgPSB0eXBlLnRvU291cmNlKGNvbnRleHQpO1xuXG5cdFx0XHRyZXR1cm4gYGdldCAke2lkZW50aWZpZXJ9KCkgeyByZXR1cm4gdGhpcy5fXyR7aWRlbnRpZmllcn0gfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmIChzcGVsbC5pc0EodmFsdWUsICR7dHlwZX0pIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFRPRE86IHdhcm4gb24gaW52YWxpZCBzZXQ/ICBzaGFyZWQ/ICB1bmRlZmluZWQ/IHNvbWV0aGluZyBvdGhlciB0aGFuIHRoZSBmaXJzdCB2YWx1ZSBhcyBkZWZhdWx0P1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwicHJvcGVydHkge2lkZW50aWZpZXJ9IGFzIG9uZSBvZiB7bGlzdDpsaXRlcmFsX2xpc3R9XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHlfYXNfb25lX29mIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGxpc3QgfSA9IHRoaXMucmVzdWx0cztcblxuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgcGx1cmFsID0gcGx1cmFsaXplKGlkZW50aWZpZXIpO1xuXG5cdFx0XHRsZXQgdmFsdWVzID0gbGlzdC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBmaXJzdCA9IGxpc3QuZ2V0SXRlbSgwKTtcblx0XHRcdGxldCBmaXJzdFZhbHVlID0gZmlyc3QgPyBmaXJzdC50b1NvdXJjZShjb250ZXh0KSA6IFwidW5kZWZpbmVkXCI7XG5cblx0XHRcdHJldHVybiBgQHByb3RvXFxuYFxuXHRcdFx0XHQgKyBgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0oKSB7IHJldHVybiAoXCJfXyR7aWRlbnRpZmllcn1cIiBpbiB0aGlzID8gdGhpcy5fXyR7aWRlbnRpZmllcn0gOiAke2ZpcnN0VmFsdWV9KSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblxuLy8gTU9SRSBFRkZJQ0lFTlQgQlVUIFVHTElFUlxuLy8gXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9O1xcbmBcbi8vIFx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9IHsgcmV0dXJuIChcIl9fJHtpZGVudGlmaWVyfVwiIGluIHRoaXMgPyB0aGlzLl9fJHtpZGVudGlmaWVyfSA6ICR7Zmlyc3RWYWx1ZX0pIH1cXG5gXG4vLyBcdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy5jb25zdHJ1Y3Rvci4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdFNlbGYtcmVmZXJlbmNlXG4vL1xucGFyc2VyLmFkZEtleXdvcmQoXCJtZVwiLCBcIm1lXCIsXG5cdGNsYXNzIG1lIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gXCJ0aGlzXCI7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB0aGlzIHJlYWxseSBtYWtlcyBtZSB3YW50IHRvIG1ha2UgYEkgYW0gZW1wdHlgIGV0YyB3b3JrLi4uXG5wYXJzZXIuYWRkS2V5d29yZChcIklcIiwgXCJJXCIsXG5cdGNsYXNzIEkgZXh0ZW5kcyBSdWxlLktleXdvcmQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiBcInRoaXNcIjtcblx0XHR9XG5cdH1cbik7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLm1lKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMuSSk7XG5cblxuLy9cbi8vXHRQcm9wZXJ0eSBhY2Nlc3Ncbi8vXG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIocHJvcGVydGllczp0aGUge2lkZW50aWZpZXJ9IG9mKSsgdGhlPyB7ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgcHJvcGVydGllcyB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRwcm9wZXJ0aWVzID0gcHJvcGVydGllcy5yZXN1bHRzXG5cdFx0XHRcdFx0XHRcdC5yZXZlcnNlKClcblx0XHRcdFx0XHRcdFx0Lm1hcCggcHJvcGVydHkgPT4gcHJvcGVydHkuaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSApXG5cdFx0XHRcdFx0XHRcdC5qb2luKFwiLlwiKTtcblx0XHRcdHJldHVybiBgJHtleHByZXNzaW9ufS4ke3Byb3BlcnRpZXN9YDtcbi8vIE5PVEU6IHRoZSBmb2xsb3dpbmcgaXMgc2FmZXIsIGJ1dCB1Z2x5IGZvciBkZW1vIHB1cnBvc2VzXG4vL1x0XHRcdHJldHVybiBgc3BlbGwuZ2V0KCR7ZXhwcmVzc2lvbn0sIFsnJHtwcm9wZXJ0aWVzfSddKWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwcm9wZXJ0eV9leHByZXNzaW9uXCIsXG5cdFwiKG15fHRoaXMpIHtpZGVudGlmaWVyfVwiLFxuXHRjbGFzcyBwcm9wZXJ0eV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgdGhpcy4ke2lkZW50aWZpZXJ9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvdHlwZXMuanMiLCJ2YXIgZztcclxuXHJcbi8vIFRoaXMgd29ya3MgaW4gbm9uLXN0cmljdCBtb2RlXHJcbmcgPSAoZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHRoaXM7XHJcbn0pKCk7XHJcblxyXG50cnkge1xyXG5cdC8vIFRoaXMgd29ya3MgaWYgZXZhbCBpcyBhbGxvd2VkIChzZWUgQ1NQKVxyXG5cdGcgPSBnIHx8IEZ1bmN0aW9uKFwicmV0dXJuIHRoaXNcIikoKSB8fCAoMSxldmFsKShcInRoaXNcIik7XHJcbn0gY2F0Y2goZSkge1xyXG5cdC8vIFRoaXMgd29ya3MgaWYgdGhlIHdpbmRvdyByZWZlcmVuY2UgaXMgYXZhaWxhYmxlXHJcblx0aWYodHlwZW9mIHdpbmRvdyA9PT0gXCJvYmplY3RcIilcclxuXHRcdGcgPSB3aW5kb3c7XHJcbn1cclxuXHJcbi8vIGcgY2FuIHN0aWxsIGJlIHVuZGVmaW5lZCwgYnV0IG5vdGhpbmcgdG8gZG8gYWJvdXQgaXQuLi5cclxuLy8gV2UgcmV0dXJuIHVuZGVmaW5lZCwgaW5zdGVhZCBvZiBub3RoaW5nIGhlcmUsIHNvIGl0J3NcclxuLy8gZWFzaWVyIHRvIGhhbmRsZSB0aGlzIGNhc2UuIGlmKCFnbG9iYWwpIHsgLi4ufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBnO1xyXG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAod2VicGFjaykvYnVpbGRpbi9nbG9iYWwuanNcbi8vIG1vZHVsZSBpZCA9IDE1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIE1ha2Ugc3VyZSBgZ2xvYmFsYCBpcyBkZWZpbmVkIGdsb2JhbGx5OlxuLy9cdC0gZWl0aGVyIGFzIHRoZSBub2RlanMgYGdsb2JhbGAsIG9yXG4vL1x0LSBhcyBhbiBhbGlhcyBmb3IgYHdpbmRvd2AgaW4gYnJvd3NlcnMsIG9yXG4vL1x0LSBmb3IgdGhlIGBzZWxmYCBjb250ZXh0IGluIHdlYiB3b3JrZXJzLlxuLy9cbi8vIE5PVEU6IHRoaXMgbW9kaWZpZXMgdGhlIFwiZ2xvYmFsXCIgZW52aXJvbm1lbnQgYnkgbWFraW5nIHN1cmUgXCJnbG9iYWxcIiBpcyBzZXQuIVxuLy9cblxubGV0IGdsb2JhbF9pZGVudGlmaWVyO1xuaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gbm9kZVwiKTtcblx0Z2xvYmFsX2lkZW50aWZpZXIgPSBnbG9iYWw7XG59XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4vL1x0Y29uc29sZS5sb2coXCJSdW5uaW5nIGluIGEgd2ViIGJyb3dzZXJcIik7XG5cdHdpbmRvdy5nbG9iYWwgPSB3aW5kb3c7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gd2luZG93O1xufVxuXG5pZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gYSB3ZWIgd29ya2VyXCIpO1xuXHRzZWxmLmdsb2JhbCA9IHNlbGY7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gc2VsZjtcbn1cblxuLy8gRXhwb3J0IGZvciBjb25zdW1wdGlvbiBieSBpbXBvcnQuXG5leHBvcnQgZGVmYXVsdCBnbG9iYWxfaWRlbnRpZmllcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2dsb2JhbC5qcyJdLCJzb3VyY2VSb290IjoiIn0=