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
	pattern: /\b[a-z][\w\-]*\b/,
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
	pattern: /\b[a-z][\w\-]*\b/,

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

			// If we got a positive number literal, compensate for JS 0-based arrays now.
			if (typeof index === "number" && index > 0) {
				return expression + "[" + (index - 1) + "]";
			}
			return "spell.getItem(" + expression + ", " + index + ")";

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgMjVhNzc4MTZkNDQxZWQ1ODdhMmEiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGVTeW50YXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2lmLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy90eXBlcy5qcyIsIndlYnBhY2s6Ly8vKHdlYnBhY2spL2J1aWxkaW4vZ2xvYmFsLmpzIiwid2VicGFjazovLy8uL3NyYy9nbG9iYWwuanMiXSwibmFtZXMiOlsicGFyc2VyIiwid2luZG93IiwiT2JqZWN0IiwiYXNzaWduIiwicGFyc2VSdWxlU3ludGF4Iiwic3ludGF4IiwiU2VxdWVuY2VDb25zdHJ1Y3RvciIsIlNlcXVlbmNlIiwic3ludGF4U3RyZWFtIiwidG9rZW5pc2VSdWxlU3ludGF4IiwicnVsZXMiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwicnVsZSIsImxlbmd0aCIsIlNZTlRBWF9FWFBSRVNTSU9OIiwibWF0Y2giLCJTeW50YXhFcnJvciIsInN0YXJ0SW5kZXgiLCJsYXN0SW5kZXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJlbmRJbmRleCIsImxhc3QiLCJTeW1ib2wiLCJwb3AiLCJtZXJnZVN5bWJvbHMiLCJLZXl3b3JkIiwibWVyZ2VLZXl3b3JkcyIsInB1c2giLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zeW1ib2wiLCJwYXJzZVJ1bGVTeW50YXhfc3VicnVsZSIsInBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyIsInBhcnNlUnVsZVN5bnRheF9saXN0IiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsIktFWVdPUkRfUEFUVEVSTiIsInBhcnNlUnVsZVN5bnRheF9rZXl3b3JkIiwiY29uc3RydWN0b3IiLCJ3b3JkcyIsImkiLCJuZXh0Iiwic3RyaW5nIiwiam9pbiIsInN0YXJ0c1dpdGgiLCJzdWJzdHIiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJzbGljZSIsImFyZ3VtZW50IiwiYWx0ZXJuYXRpdmVzIiwiZ3JvdXBBbHRlcm5hdGl2ZXMiLCJtYXAiLCJncm91cCIsInJlc3VsdHMiLCJBbHRlcm5hdGl2ZXMiLCJ0b2tlbnMiLCJjdXJyZW50IiwidG9rZW4iLCJjb25jYXQiLCJzeW1ib2wiLCJSZXBlYXQiLCJvcHRpb25hbCIsInVuZGVmaW5lZCIsInBhcmFtcyIsImJhbmdQb3NpdGlvbiIsImluZGV4T2YiLCJub3QiLCJTdWJydWxlIiwiTGlzdCIsIml0ZW0iLCJkZWxpbWl0ZXIiLCJkZWZpbmVQcm9wZXJ0aWVzIiwicHJvdG90eXBlIiwiYWRkU2VxdWVuY2UiLCJ2YWx1ZSIsIm5hbWUiLCJydWxlU3ludGF4IiwicHJvcGVydGllcyIsImRlYnVnIiwiY29uc29sZSIsImxvZyIsImFkZFJ1bGUiLCJlIiwiZXJyb3IiLCJhZGRTdGF0ZW1lbnQiLCJTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiRXhwcmVzc2lvbiIsImFkZExpc3QiLCJzdHJlYW0iLCJhZGRLZXl3b3JkIiwiYWRkU3ltYm9sIiwiYWRkUG9zdGZpeE9wZXJhdG9yIiwiQXJyYXkiLCJpc0FycmF5IiwiZm9yRWFjaCIsInRvSlMiLCJUeXBlRXJyb3IiLCJfX3Bvc3RmaXhPcGVyYXRvcnMiLCJwb3N0Zml4T3BlcmF0b3JzIiwiUnVsZSIsImhhc093blByb3BlcnR5IiwiY2xvbmUiLCJjcmVhdGUiLCJwcm9wcyIsImFkdmFuY2VUbyIsInN0YWNrIiwiY29udGV4dCIsIm1hdGNoZWQiLCJuZXh0UnVsZSIsIm5leHRTdHJlYW0iLCJQYXR0ZXJuIiwic3RhcnRQYXR0ZXJuIiwiYmxhY2tsaXN0IiwibWF0Y2hlZFRleHQiLCJyYW5nZSIsInBhdHRlcm4iLCJpbmRleCIsIndvcmQiLCJzb3VyY2UiLCJfX3N0YXJ0UGF0dGVybiIsImRlZmluZVByb3BlcnR5IiwiUmVnRXhwIiwiUmVnRXhwRnJvbVN0cmluZyIsImZpcnN0Iiwic2Vjb25kIiwicGF0dGVyblN0cmluZyIsImVzY2FwZVJlZ0V4cENoYXJhY3RlcnMiLCJnZXRSdWxlT3JEaWUiLCJwYXJzZSIsImlzRGV0ZXJtaW5pc3RpYyIsInRlc3QiLCJOZXN0ZWQiLCJldmVyeSIsInRlc3RSdWxlIiwibGVmdFJlY3Vyc2l2ZSIsInN0YWNrQ29udGFpbnMiLCJjaHVua2l0IiwicGFyc2VJbkNodW5rcyIsImVhdFdoaXRlc3BhY2UiLCJhcmdOYW1lIiwicnVsZU5hbWUiLCJiZXN0TWF0Y2giLCJtYXRjaGVzIiwiZ2V0QmVzdE1hdGNoIiwicmVkdWNlIiwiYmVzdCIsInRvU291cmNlIiwiaW5jbHVkZXMiLCJncm91cEVuZCIsIlBhcnNlciIsInByb3BlcnR5TmFtZSIsImdldFJ1bGUiLCJhcmd1bWVudHMiLCJjb21waWxlU3RhdGVtZW50cyIsInJlc3VsdCIsInN0YXRlbWVudHMiLCJ0aW1lIiwiY3VycmVudEluZGVudCIsInRhYnMiLCJzcGxpdCIsInN0YXRlbWVudCIsInRyaW0iLCJsaW5lU3RhcnQiLCJsaW5lSW5kZW50IiwiaW5kZW50ZWRTdGFydCIsImNsb3NlcnMiLCJsYXN0QmxhbmtMaW5lIiwiX2dldExhc3RCbGFua0xpbmUiLCJzcGxpY2UiLCJsaW5lIiwid2FybiIsInRpbWVFbmQiLCJ3aGl0ZXNwYWNlIiwiYWR2YW5jZUJ5IiwiZXhpc3RpbmciLCJydWxlSXNMZWZ0UmVjdXJzaXZlIiwic3VicnVsZSIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsIm5lc3RpbmciLCJuZXN0ZWQiLCJjaGFyIiwibGlzdCIsIlJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlMiLCJmbGFncyIsIkRFQlVHIiwiY2hhcnMiLCJXaGl0ZXNwYWNlIiwiV29yZCIsInJlcGxhY2UiLCJJZGVudGlmaWVyIiwiaWRlbnRpZmllciIsImFkZFRvQmxhY2tsaXN0IiwiVHlwZSIsInR5cGUiLCJOdW1iZXIiLCJudW1iZXIiLCJwYXJzZUZsb2F0IiwiSW50ZWdlciIsInBhcnNlSW50IiwiVGV4dCIsInRleHQiLCJCb29sZWFuIiwiYm9vbCIsImV4cHJlc3Npb24iLCJlbmRzV2l0aCIsIlRleHRTdHJlYW0iLCJ0ZXh0T3JQcm9wcyIsImFyZyIsImhlYWQiLCJzdWJzdHJpbmciLCJtZW1vaXplZCIsImRlZmluZU1lbW9pemVkIiwicHJvcGVydHkiLCJnZXR0ZXIiLCJhcHBseSIsImNvbmZpZ3VyYWJsZSIsImdldCIsImVsc2VQaHJhc2UiLCJlbHNlU3RhdGVtZW50IiwiaW5kZXhfZXhwcmVzc2lvbiIsIm9yZGluYWwiLCJpbmZpeF9vcGVyYXRvciIsInByZWNlZGVuY2UiLCJhIiwiYiIsInRoaW5nIiwibGhzIiwicmhzIiwib3BlcmF0b3IiLCJhc3NpZ25tZW50IiwibWVzc2FnZSIsImJ1dHRvbkNsYXVzZSIsImJ1dHRvbk5hbWUiLCJva0J1dHRvbiIsImNhbmNlbEJ1dHRvbiIsImNhbmNlbENsYXVzZSIsInBsdXJhbGl6ZSIsInByb3AiLCJrZXkiLCJwcm9wc19jbGF1c2UiLCJuZXdfdGhpbmciLCJleHRlbmRzX2NsYXVzZSIsInN1cGVyVHlwZSIsImFyZ05hbWVzIiwiYXJncyIsImFyZ3NfY2xhdXNlIiwid29yZF9jbGF1c2UiLCJ0eXBlcyIsInRvTG93ZXJDYXNlIiwibWV0aG9kTmFtZSIsImNvbmRpdGlvbnMiLCJzY29wZSIsInZhbHVlX2NsYXVzZSIsImRlY2xhcmF0aW9uIiwicGx1cmFsIiwidmFsdWVzIiwiZ2V0SXRlbSIsImZpcnN0VmFsdWUiLCJtZSIsIkkiLCJyZXZlcnNlIiwiZ2xvYmFsX2lkZW50aWZpZXIiLCJnbG9iYWwiLCJzZWxmIl0sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsbURBQTJDLGNBQWM7O0FBRXpEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsbUNBQTJCLDBCQUEwQixFQUFFO0FBQ3ZELHlDQUFpQyxlQUFlO0FBQ2hEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDhEQUFzRCwrREFBK0Q7O0FBRXJIO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7Ozs7Ozs7Ozs7QUM3REE7Ozs7QUFDQTs7Ozs7O0FBRUE7QUFOQTtBQUNBO0FBQ0E7QUFLQSxJQUFNQSxTQUFTLHNCQUFmO2tCQUNlQSxNOztBQUVmOztBQUNBQyxPQUFPRCxNQUFQLEdBQWdCQSxNQUFoQixDOzs7Ozs7Ozs7Ozs7Ozs7QUNYQTs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBRSxPQUFPQyxNQUFQLGlCQUFvQjs7QUFFcEI7QUFDQTtBQUNBOztBQUVBO0FBQ0NDLGdCQVBtQiwyQkFPSEMsTUFQRyxFQU8wQztBQUFBLE1BQXJDQyxtQkFBcUMsdUVBQWYsZUFBS0MsUUFBVTs7QUFDNUQsTUFBSUMsZUFBZSxlQUFLQyxrQkFBTCxDQUF3QkosTUFBeEIsQ0FBbkI7QUFDQSxNQUFJSyxRQUFRLGVBQUtDLHNCQUFMLENBQTRCSCxZQUE1QixFQUEwQyxFQUExQyxDQUFaOztBQUVBLE1BQUlJLGFBQUo7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QUF1Q29JLE9BQXZDLEVBQWdELEVBQUUzRSxVQUFVO0FBQUEsU0FBTSxDQUFOO0FBQUEsRUFBWixFQUFoRDtBQUNBLGlCQUFPekQsVUFBUCxDQUFrQixTQUFsQixFQUE2QixPQUE3QixFQUFzQ29JLE9BQXRDLEVBQStDLEVBQUUzRSxVQUFVO0FBQUEsU0FBTSxDQUFOO0FBQUEsRUFBWixFQUEvQztBQUNBLGlCQUFPekQsVUFBUCxDQUFrQixTQUFsQixFQUE2QixRQUE3QixFQUF1Q29JLE9BQXZDLEVBQWdELEVBQUUzRSxVQUFVO0FBQUEsU0FBTSxDQUFOO0FBQUEsRUFBWixFQUFoRDtBQUNBLGlCQUFPekQsVUFBUCxDQUFrQixTQUFsQixFQUE2QixPQUE3QixFQUFzQ29JLE9BQXRDLEVBQStDLEVBQUUzRSxVQUFVO0FBQUEsU0FBTSxDQUFOO0FBQUEsRUFBWixFQUEvQztBQUNBLGlCQUFPekQsVUFBUCxDQUFrQixTQUFsQixFQUE2QixPQUE3QixFQUFzQ29JLE9BQXRDLEVBQStDLEVBQUUzRSxVQUFVO0FBQUEsU0FBTSxDQUFOO0FBQUEsRUFBWixFQUEvQztBQUNBLGlCQUFPekQsVUFBUCxDQUFrQixTQUFsQixFQUE2QixTQUE3QixFQUF3Q29JLE9BQXhDLEVBQWlELEVBQUUzRSxVQUFVO0FBQUEsU0FBTSxDQUFOO0FBQUEsRUFBWixFQUFqRDtBQUNBLGlCQUFPekQsVUFBUCxDQUFrQixTQUFsQixFQUE2QixRQUE3QixFQUF1Q29JLE9BQXZDLEVBQWdELEVBQUUzRSxVQUFVO0FBQUEsU0FBTSxDQUFOO0FBQUEsRUFBWixFQUFoRDtBQUNBLGlCQUFPekQsVUFBUCxDQUFrQixTQUFsQixFQUE2QixPQUE3QixFQUFzQ29JLE9BQXRDLEVBQStDLEVBQUUzRSxVQUFVO0FBQUEsU0FBTSxDQUFOO0FBQUEsRUFBWixFQUEvQztBQUNBLGlCQUFPekQsVUFBUCxDQUFrQixTQUFsQixFQUE2QixPQUE3QixFQUFzQ29JLE9BQXRDLEVBQStDLEVBQUUzRSxVQUFVO0FBQUEsU0FBTSxFQUFOO0FBQUEsRUFBWixFQUEv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eEI7QUFDSDtBQUNBO0FBQ0c7QUFkSDs7QUFBQTtBQUFBLEVBR21DLHFCQUFLVSxVQUh4Qzs7QUFrQkEsaUJBQU9ELGFBQVAsQ0FDQyxxQkFERCxFQUVDLHdCQUZEO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSwyQkFJV3FCLE9BSlgsRUFJb0I7QUFBQSxPQUNYcUYsVUFEVyxHQUNJLEtBQUszSSxPQURULENBQ1gySSxVQURXOztBQUVqQkEsZ0JBQWFBLFdBQVc3QyxRQUFYLENBQW9CeEMsT0FBcEIsQ0FBYjtBQUNBLG9CQUFlcUYsVUFBZjtBQUNBO0FBUkg7O0FBQUE7QUFBQSxFQUdtQyxxQkFBS3pHLFVBSHhDLEc7Ozs7OztBQ3BZQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsNENBQTRDOztBQUU1Qzs7Ozs7Ozs7Ozs7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxJQUFJZ0wsMEJBQUo7QUFDQSxJQUFJLE9BQU9DLE1BQVAsS0FBa0IsV0FBdEIsRUFBbUM7QUFDbkM7QUFDQ0QscUJBQW9CQyxNQUFwQjtBQUNBOztBQUVELElBQUksT0FBT3RRLE1BQVAsS0FBa0IsV0FBdEIsRUFBbUM7QUFDbkM7QUFDQ0EsUUFBT3NRLE1BQVAsR0FBZ0J0USxNQUFoQjtBQUNBcVEscUJBQW9CclEsTUFBcEI7QUFDQTs7QUFFRCxJQUFJLE9BQU91USxJQUFQLEtBQWdCLFdBQXBCLEVBQWlDO0FBQ2pDO0FBQ0NBLE1BQUtELE1BQUwsR0FBY0MsSUFBZDtBQUNBRixxQkFBb0JFLElBQXBCO0FBQ0E7O0FBRUQ7a0JBQ2VGLGlCIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMTMpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDI1YTc3ODE2ZDQ0MWVkNTg3YTJhIiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJpbXBvcnQgeyBkZWZpbmVNZW1vaXplZCB9IGZyb20gXCIuL21lbW9pemUuanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIHJlLWV4cG9ydCBSdWxlIGZvciB0ZXN0aW5nXG5leHBvcnQgZGVmYXVsdCBSdWxlO1xuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbi8vIFRPRE86XHRVc2Uga2V5d29yZHMgaW4gc3ludGF4IHRvIG1ha2UgYSBxdWljayByZWdleC1iYXNlZCBgdGVzdGAgZnVuY3Rpb24gZm9yIHRoZSBlbnRpcmUgcnVsZVxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cbi8vIFRPRE86IGNvbnZlcnQgdG8gVGV4dFN0cmVhbSBwYXR0ZXJuIGFsYSBub3JtYWwgcGFyc2VyIG9uY2UgdGhhdCBzZXR0bGVzIGRvd24/Pz9cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbGFzdEluZGV4ID0gc3ludGF4U3RyZWFtLmxlbmd0aDtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKHJ1bGUpIHtcblx0XHRcdFx0bGV0IGxhc3QgPSBydWxlc1tydWxlcy5sZW5ndGgtMV07XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgU3RyaW5nYCBhbmQgbGFzdCB3YXMgYSBgU3RyaW5nYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0aWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG5cdFx0XHRcdFx0cnVsZXMucG9wKCk7XG5cdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG5cdFx0XHRcdFx0cnVsZSA9IFJ1bGUubWVyZ2VTeW1ib2xzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgS2V5d29yZGAgYW5kIGxhc3Qgd2FzIGFsc28gYSBgS2V5d29yZGAsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGVsc2UgaWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkKSB7XG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBsYXN0IHJ1bGVcblx0XHRcdFx0XHRydWxlcy5wb3AoKTtcblx0XHRcdFx0XHQvLyBhbmQgcmVwbGFjZSB3aXRoIGEgcnVsZSB0aGF0IG1lcmdlcyB0aGUga2V5d29yZHNcblx0XHRcdFx0XHRydWxlID0gUnVsZS5tZXJnZUtleXdvcmRzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJ1bGVzLnB1c2gocnVsZSk7XG5cdFx0XHR9XG5cdFx0XHRzdGFydEluZGV4ID0gZW5kSW5kZXggKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZXM7XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgc3ludGF4VG9rZW4gPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHQvLyBpZiB3ZSBnb3QgYSBcIlxcXFxcIiAod2hpY2ggYWxzbyBoYXMgdG8gZ28gaW50byB0aGUgc291cmNlIHN0cmluZyBhcyBcIlxcXFxcIilcblx0XHQvLyB0cmVhdCB0aGUgbmV4dCB0b2tlbiBhcyBhIGxpdGVyYWwgc3RyaW5nIHJhdGhlciB0aGFuIGFzIGEgc3BlY2lhbCBjaGFyYWN0ZXIuXG5cdFx0aWYgKHN5bnRheFRva2VuID09PSBcIlxcXFxcIikge1xuXHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N5bWJvbChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ICsgMSk7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChzeW50YXhUb2tlbikge1xuXHRcdFx0Y2FzZSBcIntcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIihcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCJbXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIqXCI6XG5cdFx0XHRjYXNlIFwiK1wiOlxuXHRcdFx0Y2FzZSBcIj9cIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cblx0XHRcdC8vIHRoZSBmb2xsb3dpbmcgc2hvdWxkIEFMV0FZUyBiZSBjb25zdW1lZCBieSB0aGUgYWJvdmVcblx0XHRcdGNhc2UgXCJ9XCI6XG5cdFx0XHRjYXNlIFwiKVwiOlxuXHRcdFx0Y2FzZSBcIl1cIjpcblx0XHRcdGNhc2UgXCJ8XCI6XG5cdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCAke3N5bnRheFRva2VufSBmb3VuZCBhcyBpdGVtICR7c3RhcnRJbmRleH0gb2YgJHt0aGlzLnN5bnRheH1gKTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0aWYgKHN5bnRheFRva2VuLm1hdGNoKFJ1bGUuS0VZV09SRF9QQVRURVJOKSkge1xuXHRcdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9rZXl3b3JkKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0S0VZV09SRF9QQVRURVJOIDogL1tBLVphLXpdKy8sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCwgY29uc3RydWN0b3IpIHtcblx0XHRsZXQgd29yZHMgPSBbXSwgZW5kSW5kZXg7XG5cdFx0Zm9yICh2YXIgaSA9IHN0YXJ0SW5kZXg7IGkgPCBzeW50YXhTdHJlYW0ubGVuZ3RoOyBpKyspIHtcblx0XHRcdGxldCBuZXh0ID0gc3ludGF4U3RyZWFtW2ldO1xuXHRcdFx0aWYgKG5leHQubWF0Y2goUnVsZS5LRVlXT1JEX1BBVFRFUk4pKSB7XG5cdFx0XHRcdHdvcmRzLnB1c2gobmV4dCk7XG5cdFx0XHRcdGVuZEluZGV4ID0gaTtcblx0XHRcdH1cblx0XHRcdGVsc2UgYnJlYWs7XG5cdFx0fVxuXG5cdFx0aWYgKCFjb25zdHJ1Y3RvcikgY29uc3RydWN0b3IgPSBSdWxlLktleXdvcmQ7XG5cdFx0bGV0IHJ1bGUgPSBuZXcgY29uc3RydWN0b3IoeyBzdHJpbmc6IHdvcmRzLmpvaW4oXCIgXCIpIH0pO1xuXG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3ltYm9sKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDAsIGNvbnN0cnVjdG9yID0gUnVsZS5TeW1ib2wpIHtcblx0XHRsZXQgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdGlmICghY29uc3RydWN0b3IpIGNvbnN0cnVjdG9yID0gUnVsZS5TeW1ib2w7XG5cdFx0bGV0IHJ1bGUgPSBuZXcgY29uc3RydWN0b3IoeyBzdHJpbmc6IHN0cmluZyB9KTtcblxuXHRcdC8vIElmIHN0cmluZyBzdGFydHMgd2l0aCBgXFxcXGAsIGl0J3MgYW4gZXNjYXBlZCBsaXRlcmFsIChlZzogYFxcW2AgbmVlZHMgdG8gaW5wdXQgYXMgYFxcXFxbYCkuXG5cdFx0aWYgKHN0cmluZy5zdGFydHNXaXRoKFwiXFxcXFwiKSkge1xuXHRcdFx0Ly8gcmVtb3ZlIGxlYWRpbmcgc2xhc2ggaW4gbWF0Y2ggc3RyaW5nLi4uXG5cdFx0XHRydWxlLnN0cmluZyA9IHJ1bGUuc3RyaW5nLnN1YnN0cigxKTtcblx0XHRcdC8vIGJ1dCBsZWF2ZSBpdCBpbiB0b1N0cmluZ1xuXHRcdFx0cnVsZS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcblx0XHR9XG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnRJbmRleCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdC8vIE5PVEU6IG5lc3RlZCBwYXJlbnMgbWF5IG5vdCBoYXZlIGFsdGVybmF0aXZlcy4uLiA6LSggICBgKGF8KGJ8YykpYCB3b24ndCB3b3JrPz8/XG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiKFwiLCBcIilcIiwgc3RhcnRJbmRleCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0Ly8gc3BsaXQgaW50byBncm91cHMsIGluY2x1ZGluZyBuZXN0ZWQgcGFyZW5zXG5cdFx0bGV0IGFsdGVybmF0aXZlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0aXZlcyhzbGljZSlcblx0XHRcdC5tYXAoZnVuY3Rpb24oZ3JvdXApIHtcblx0XHRcdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoZ3JvdXAsIFtdKTtcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHNbMF07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSdWxlLlNlcXVlbmNlKHsgcnVsZXM6IHJlc3VsdHMgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0bGV0IHJ1bGUgPSBhbHRlcm5hdGl2ZXMubGVuZ3RoID09PSAxID8gYWx0ZXJuYXRpdmVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0aXZlcyB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXG5cdFx0ZnVuY3Rpb24gZ3JvdXBBbHRlcm5hdGl2ZXModG9rZW5zKSB7XG5cdFx0XHRsZXQgYWx0ZXJuYXRpdmVzID0gW107XG5cdFx0XHRsZXQgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yIChsZXQgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XHRjdXJyZW50ID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaGFuZGxlIG5lc3RlZCBwYXJlbnNcblx0XHRcdFx0ZWxzZSBpZiAodG9rZW4gPT09IFwiKFwiKSB7XG5cdFx0XHRcdFx0bGV0IHsgZW5kSW5kZXggfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHRva2VucywgXCIoXCIsIFwiKVwiLCBpKTtcblx0XHRcdFx0XHRjdXJyZW50ID0gY3VycmVudC5jb25jYXQodG9rZW5zLnNsaWNlKGksIGVuZEluZGV4ICsgMSkpO1xuXHRcdFx0XHRcdGkgPSBlbmRJbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdXJyZW50LnB1c2godG9rZW4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoY3VycmVudC5sZW5ndGgpIGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0cmV0dXJuIGFsdGVybmF0aXZlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdGxldCBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblxuXHRcdGxldCBwYXJhbXMgPSB7IHJ1bGU6IG1hdGNoLnNsaWNlWzBdIH07XG5cblx0XHQvLyBzZWUgaWYgdGhlcmUncyBhIGBub3RgIHJ1bGUgaW4gdGhlcmVcblx0XHRsZXQgYmFuZ1Bvc2l0aW9uID0gcGFyYW1zLnJ1bGUuaW5kZXhPZihcIiFcIik7XG5cdFx0aWYgKGJhbmdQb3NpdGlvbiAhPT0gLTEpIHtcblx0XHRcdHBhcmFtcy5ub3QgPSBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSk7IC8vWyBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSkgXTtcblx0XHRcdHBhcmFtcy5ydWxlID0gcGFyYW1zLnJ1bGUuc3Vic3RyKDAsIGJhbmdQb3NpdGlvbik7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5TdWJydWxlKHBhcmFtcyk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgbWF0Y2guZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBsaXN0IGV4cHJlc3Npb24gYFs8aXRlbT48ZGVsaW1pdGVyPl1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCwgY29uc3RydWN0b3IgPSBSdWxlLkxpc3QpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJbXCIsIFwiXVwiLCBzdGFydEluZGV4KTtcblxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHNsaWNlLCBbXSk7XG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoICE9PSAyKSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgc3R1ZmYgYXQgZW5kIG9mIGxpc3Q6IFske3NsaWNlLmpvaW4oXCIgXCIpfV1gKTtcblx0XHR9XG5cdFx0bGV0IFsgaXRlbSwgZGVsaW1pdGVyIF0gPSByZXN1bHRzO1xuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgY29uc3RydWN0b3IoeyBpdGVtLCBkZWxpbWl0ZXIgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxufSk7XG5cblxuXG4vLyAjIyAgQWRkIG1ldGhvZHMgdG8gUGFyc2VyIHRvIGRlZmluZSBydWxlcyB1c2luZyB0aGUgYWJvdmUgc3ludGF4LlxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUGFyc2VyLnByb3RvdHlwZSwge1xuXG5cdC8vIFBhcnNlIGEgYHJ1bGVTeW50YXhgIHJ1bGUgYW5kIGFkZCBpdCB0byBvdXIgbGlzdCBvZiBydWxlcy5cblx0Ly8gUmV0dXJucyB0aGUgbmV3IHJ1bGUuXG5cdC8vIExvZ3MgcGFyc2luZyBlcnJvcnMgYnV0IGFsbG93cyB0aGluZ3MgdG8gY29udGludWUuXG5cdGFkZFNlcXVlbmNlOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAodHlwZW9mIGNvbnN0cnVjdG9yICE9PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHByb3BlcnRpZXMgPSBjb25zdHJ1Y3Rvcjtcblx0XHRcdGNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZTtcblx0XHR9XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgY29uc3RydWN0b3IpO1xuXHRcdFx0Ly8gUmVmbGVjdCB0aGUgcnVsZSBiYWNrIG91dCB0byBtYWtlIHN1cmUgaXQgbG9va3MgKG1vcmUgb3IgbGVzcykgdGhlIHNhbWVcblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRlZCBydWxlICcke25hbWV9JzpcXG4gIElOUFVUOiAke3J1bGVTeW50YXh9IFxcbiBPVVRQVVQ6ICR7cnVsZX1gKTtcblxuLy9jb25zb2xlLmluZm8obmFtZSwgY29uc3RydWN0b3IsIHJ1bGUpO1xuXHRcdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0fVxuXHR9fSxcblxuXHRhZGRTdGF0ZW1lbnQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5TdGF0ZW1lbnQsIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgcnVsZSA9IHRoaXMuYWRkU2VxdWVuY2UobmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRFeHByZXNzaW9uOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuRXhwcmVzc2lvbiwgcHJvcGVydGllcykge1xuXHRcdGxldCBydWxlID0gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRMaXN0OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuTGlzdCwgcHJvcGVydGllcykge1xuXHRcdGxldCBzdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChydWxlU3ludGF4KTtcblx0XHRsZXQgcnVsZSA9IChSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN0cmVhbSwgW10sIDAsIGNvbnN0cnVjdG9yKSB8fCBbXSlbMF07XG5cdFx0aWYgKCFydWxlKSByZXR1cm47XG5cdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fX0sXG5cblx0YWRkS2V5d29yZDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLktleXdvcmQsIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgc3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgocnVsZVN5bnRheCk7XG5cdFx0bGV0IHJ1bGUgPSAoUnVsZS5wYXJzZVJ1bGVTeW50YXhfa2V5d29yZChzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pWzBdO1xuXHRcdGlmICghcnVsZSkgcmV0dXJuO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZFN5bWJvbDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlN5bWJvbCwgcHJvcGVydGllcykge1xuXHRcdC8vIFRPRE86IGFzc3VtZSB3ZSBqdXN0IGhhdmUgb25lIHN5bWJvbCBvZiBtYW55IGxldHRlcnMuLi5cblx0XHRsZXQgc3RyZWFtID0gW3J1bGVTeW50YXhdO1xuXHRcdGxldCBydWxlID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X3N5bWJvbChzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pWzBdO1xuXHRcdGlmICghcnVsZSkgcmV0dXJuO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdC8vIEFkZCBwb3N0Zml4IG9wZXJhdG9yLCBzdWNoIGFzIFwiYSBpcyBkZWZpbmVkXCJcblx0Ly8gTk9URTogaWYgeW91IGhhdmUgbW9yZSB0aGFuIG9uZSBtYXRjaGluZyBvcGVyYXRvcixcblx0Ly9cdFx0IHBhc3MgaW4gYW4gYXJyYXkgb2Ygc2ltcGxlIHN0cmluZ3Mgc28gYWxsIG9mIG91ciBvcGVyYXRvcnMgYXJlIHNpbXBsZSBzdHJpbmdzLlxuXHRhZGRQb3N0Zml4T3BlcmF0b3I6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSkge1xuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRQb3N0Zml4T3BlcmF0b3IobmFtZSwgc3ludGF4LCBwcm9wZXJ0aWVzKSk7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmFkZFNlcXVlbmNlKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudG9KUykge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBwb3N0Zml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBjbGVhciBsaXN0IG9mIGluZml4IG9wZXJhdG9ycyBmb3IgZ2V0dGVyIGJlbG93XG5cdFx0XHRkZWxldGUgdGhpcy5fX3Bvc3RmaXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwicG9zdGZpeF9vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH19LFxuXG5cdC8vIExpc3Qgb2YgcG9zdGZpeCBvcGVyYXRvcnMgYXMgc3RyaW5ncy5cblx0Ly8gUmUtbWVtb2l6ZWQgYWZ0ZXIgYGFkZEluZml4T3BlcmF0b3JgIGFib3ZlLlxuXHRwb3N0Zml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9fcG9zZml4T3BlcmF0b3JzXCIsXG5cdFx0ZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXMucnVsZXNbXCJwb3N0Zml4X29wZXJhdG9yXCJdXG5cdFx0XHRcdFx0XHQmJiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZyk7XG5cdH0pXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlU3ludGF4LmpzIiwiLy9cdCMgUGFyc2VyIFJ1bGVzXG4vL1x0UnVsZXMgY2FuIGJlIGFzIHNpbXBsZSBhcyBhIHN0cmluZyBgS2V5d29yZGAgb3IgYSBjb21wbGV4IHNlcXVlbmNlIG9mIChuZXN0ZWQpIHJ1bGVzLlxuLy9cbi8vXHRQYXJzZSBhIHJ1bGUgd2l0aCBgcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSlgLCB0aGlzIHdpbGwgZWl0aGVyOlxuLy9cdFx0LSByZXR1cm4gYHVuZGVmaW5lZGAgaWYgdGhlIHJ1bGUgZG9lc24ndCBtYXRjaCB0aGUgaGVhZCBvZiB0aGUgc3RyZWFtLCBvclxuLy9cdFx0LSByZXR1cm4gYSBDTE9ORSBvZiB0aGUgcnVsZSB3aXRoIGF0IGxlYXN0IHRoZSBmb2xsb3dpbmc6XG4vL1x0XHRcdC0gYHN0cmVhbWBcdFx0U3RyZWFtIHdoaWNoIHdhcyBtYXRjaGVkIHdpdGggYHN0YXJ0SW5kZXhgIGF0IHRoZSBzdGFydCBvZiB0aGUgbWF0Y2hcbi8vXHRcdFx0LSBgZW5kSW5kZXhgXHROb24taW5jbHVzaXZlIGVuZCBpbmRleCBpbiBzdHJlYW0gd2hlcmUgbWF0Y2ggZW5kcy5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLnJlc3VsdHNgXHRcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZShjb250ZXh0KWBcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IGdsb2JhbCBmcm9tIFwiLi9nbG9iYWxcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gUnVsZSB8fCAhdGhpcy5jb25zdHJ1Y3Rvci5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkoXCJjb25zdHJ1Y3RvclwiKSkge1xuLy9jb25zb2xlLndhcm4oXCJub3QgcnVsZVwiLCB0aGlzKTtcblx0XHR9XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdC8vIENsb25lIHRoaXMgcnVsZSBhbmQgYWRkIGFueSBgcHJvcHNgIHBhc3NlZCBpbi5cblx0Y2xvbmUoLi4ucHJvcHMpIHtcblx0XHRsZXQgY2xvbmUgPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xuXHRcdE9iamVjdC5hc3NpZ24oY2xvbmUsIC4uLnByb3BzKTtcblx0XHRyZXR1cm4gY2xvbmU7XG5cdH1cblxuXHQvLyBGb3IgYSBydWxlIGluc3RhbmNlIGFzc29jaWF0ZWQgd2l0aCBhIHN0cmVhbSxcblx0Ly8gcmV0dXJuIGEgbmV3IHN0cmVhbSBBRlRFUiB0aGlzIHJ1bGUncyBlbmQuXG5cdG5leHQoKSB7XG5cdFx0aWYgKCF0aGlzLnN0cmVhbSB8fCB0aGlzLmVuZEluZGV4ID09PSB1bmRlZmluZWQpXG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBydWxlLm5leHQoKSBjYWxsZWQgb24gcnVsZSB3aXRob3V0IGEgc3RyZWFtYCwgdGhpcyk7XG5cdFx0cmV0dXJuIHRoaXMuc3RyZWFtLmFkdmFuY2VUbyh0aGlzLmVuZEluZGV4KTtcblx0fVxuXG4vL1xuLy9cdFBhcnNpbmcgcHJpbWl0aXZlcyAtLSB5b3UgTVVTVCBpbXBsZW1lbnQgdGhlc2UgaW4geW91ciBzdWJjbGFzc2VzIVxuLy9cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcnVsZSBpbiB0aGUgYHN0cmVhbWAuXG5cdC8vIFJldHVybnMgcmVzdWx0cyBvZiB0aGUgcGFyc2Ugb3IgYHVuZGVmaW5lZGAuXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBJcyB0aGlzIHJ1bGUgZGV0ZXJtaW5pc3RpYywgZWc6IGNhbiBpdCBiZSBxdWlja2x5IGFuZCB1bmFtYmlndW91c2x5IHNhdGlzZmllZD9cblx0Ly8gUmV0dXJuaW5nIGB0cnVlYCBjYW4gc3BlZWQgdXAgc2VxdWVuY2UgcHJvY2Vzc2luZyxcblx0Ly9cdGJ1dCBpZiB5b3UncmUgcmVhbGx5IG5vdCBzdXJlLCByZXR1cm4gYHVuZGVmaW5lZGAuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBiaXRzIG9mIG91ciBydWxlIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljIChidXQgYWxsIHBhdHRlcm5zIGFyZSBkZXRlcm1pbmlzdGljKVxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmRcblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBEb2VzIHRoZSBwYXJzZSBgc3RhY2tgIGFscmVhZHkgY29udGFpbiBgcnVsZWA/XG5cdHN0YXRpYyBzdGFja0NvbnRhaW5zKHN0YWNrLCBydWxlLCBzdHJlYW0pIHtcblx0XHRpZiAoc3RhY2subGVuZ3RoID09PSAwKSByZXR1cm4gZmFsc2U7XG5cbi8vY29uc29sZS5pbmZvKHN0YWNrKTtcblx0XHQvLyBnbyBiYWNrd2FyZHNcblx0XHRmb3IgKHZhciBpID0gc3RhY2subGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGxldCBbIG5leHRSdWxlLCBuZXh0U3RyZWFtIF0gPSBzdGFja1tpXTtcblx0XHRcdGlmIChuZXh0UnVsZSA9PT0gcnVsZSkge1xuXHRcdFx0XHRpZiAobmV4dFN0cmVhbS5zdGFydEluZGV4ID09PSBzdHJlYW0uc3RhcnRJbmRleCkge1xuLy9cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiZm91bmQgdW5wcm9kdWN0aXZlIHJ1bGUgXCIsIHJ1bGUsIFwiIG9uIHN0YWNrXCIsIHN0YWNrKTtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcbi8vXHRcdFx0XHRcdGNvbnNvbGUud2FybihcImZvdW5kIHByb2R1Y3RpdmUgcnVsZSBcIiwgcnVsZSwgXCIgb24gc3RhY2tcIiwgc3RhY2spO1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIE5PVEU6IHlvdSBtYXkgd2FudCB0byBtZW1vaXplIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkO1xuXHR9XG5cbi8vXG4vLyAjIyBncm91cDogcmVmbGVjdGlvblxuLy9cblx0Z2V0IHJ1bGVUeXBlKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdH1cbn1cblxuXG4vLyBERUJVRzogbWFrZSBgUnVsZWAgZ2xvYmFsIGZvciBkZWJ1Z2dpbmcuXG5nbG9iYWwuUnVsZSA9IFJ1bGU7XG5cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vXG4vLyBOT1RFXHRUbyBtYWtlIHRoaXMgbW9yZSBnZW5lcmFsbHkgYXBwbGljYWJsZSwgZG8gTk9UIHN0YXJ0IHRoZSBwYXR0ZXJuIHdpdGggYSBgXmAuXG4vL1x0XHRXZSdsbCBhdXRvbWF0aWNhbGx5IG1ha2UgYSBjb3B5IG9mIHRoZSBSZWdFeHAgd2l0aCB0aGUgc3RhcnQgcG9pbnQgYXR0YWNoZWRcbi8vXHRcdGFuZCB1c2UgdGhhdCBhcyBhcHByb3ByaWF0ZS5cbi8vXG4vL1x0XHRUaGlzIHdheSB3ZSBjYW4gcmUtdXNlIHRoZSByZWdleCB0byBjaGVjayBmb3IgYSBtYXRjaCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBzdHJlYW0uLi5cbi8vXG4vLyBZb3UgY2FuIG9wdGlvbmFsbHkgc3BlY2lmeSBhIGBydWxlLmJsYWNrbGlzdGAsIGEgc2V0IG9mIG1hdGNoZXMgd2hpY2ggd2lsbCBzcGVjaWZpY2FsbHkgTk9UIHdvcmssXG4vL1x0ZWcgZm9yIGBpZGVudGlmaWVyLlxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHQvLyBgc3RhcnRQYXR0ZXJuYCBpcyB0aGUgc2FtZSBhcyBvdXIgcGF0dGVybiBleGNlcHQgaXQgd2lsbCBvbmx5IG1hdGNoIGF0IHRoZSBCRUdJTk5JTkcgb2YgYSBzdHJpbmcuXG5cdGdldCBzdGFydFBhdHRlcm4oKSB7XG5cdFx0aWYgKCF0aGlzLl9fc3RhcnRQYXR0ZXJuKSB7XG5cdFx0XHQvLyBgcGF0dGVybmAgaXMgcmVxdWlyZWRcblx0XHRcdGlmICghdGhpcy5wYXR0ZXJuKSB0aHJvdyBuZXcgVHlwZUVycm9yKHRoaXMrXCI6IFlvdSBtdXN0IHNwZWNpZnkgYSBgcGF0dGVybmAgcGFyYW1ldGVyXCIpO1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiX19zdGFydFBhdHRlcm5cIiwge1xuXHRcdFx0XHR2YWx1ZTogbmV3IFJlZ0V4cChcIl5cIiArIHRoaXMucGF0dGVybi5zb3VyY2UpXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX19zdGFydFBhdHRlcm47XG5cdH1cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcGF0dGVybiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdGxldCBtYXRjaCA9IHN0cmVhbS5tYXRjaCh0aGlzLnN0YXJ0UGF0dGVybik7XG5cdFx0aWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGJhaWwgaWYgcHJlc2VudCBpbiBibGFja2xpc3Rcblx0XHRsZXQgbWF0Y2hlZCA9IG1hdGNoWzBdO1xuXHRcdGlmICh0aGlzLmJsYWNrbGlzdCAmJiB0aGlzLmJsYWNrbGlzdFttYXRjaGVkXSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBlbmRJbmRleCA9IHN0cmVhbS5zdGFydEluZGV4ICsgbWF0Y2hlZC5sZW5ndGg7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBlbmRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUGF0dGVybnMgYXJlIEFMV0FZUyBkZXRlcm1pbmlzdGljLlxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgcGF0dGVybmlzIGZvdW5kIEFOWVdIRVJFIGluIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIGB1bmRlZmluZWRgIGlmIG5vdCBkZXRlcm1pbnN0aWMgKGJ1dCBhbGwgcGF0dGVybnMgYXJlIGRldGVybWluaXN0aWMpXG5cdC8vXHQtIHJlZ2V4IG1hdGNoIGlmIGZvdW5kLFxuXHQvL1x0LSBgZmFsc2VgIGlmIG5vdCBmb3VuZFxuXHR0ZXN0KHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IG1hdGNoID0gc3RyZWFtLm1hdGNoKHRoaXMucGF0dGVybik7XG5cdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRtYXRjaC5lbmRJbmRleCA9IChtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCk7XG5cdFx0XHRyZXR1cm4gbWF0Y2g7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGFkZFRvQmxhY2tsaXN0KC4uLndvcmRzKSB7XG5cdFx0aWYgKCF0aGlzLmJsYWNrbGlzdCkgdGhpcy5ibGFja2xpc3QgPSB7fTtcblx0XHR3b3Jkcy5mb3JFYWNoKHdvcmQgPT4gdGhpcy5ibGFja2xpc3Rbd29yZF0gPSB0cnVlKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm4uc291cmNlO1xuXHR9XG59XG5cbi8vIFJ1bGUgZm9yIGxpdGVyYWwgc3RyaW5nIHZhbHVlLCB3aGljaCBpbmNsdWRlIHB1bmN0dWF0aW9uIHN1Y2ggYXMgYChgIGV0Yy5cbi8vIGBTeW1ib2xgcyBhcmUgZGlmZmVyZW50IGZyb20gYEtleXdvcmRzYCBpbiB0aGF0IHRoZXkgZG8gbm90IHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5LlxuLy9UT0RPOiByZW5hbWUgYFN5bWJvbGA/Pz9cblJ1bGUuU3ltYm9sID0gY2xhc3MgU3ltYm9sIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLlN5bWJvbCgpOiBFeHBlY3RlZCBzdHJpbmcgcHJvcGVydHlcIik7XG5cblx0XHQvLyBjb252ZXJ0IHN0cmluZyB0byBwYXR0ZXJuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdHByb3BlcnRpZXMucGF0dGVybiA9IFBhcnNlci5SZWdFeHBGcm9tU3RyaW5nKHByb3BlcnRpZXMuc3RyaW5nKTtcbi8vY29uc29sZS5pbmZvKHByb3BlcnRpZXMuc3RyaW5nLCBwcm9wZXJ0aWVzLnBhdHRlcm4pO1xuXHRcdH1cblxuLy9cdFx0Y29uc29sZS5pbmZvKFwiY3JlYXRpbmcgc3RyaW5nXCIsIHByb3BlcnRpZXMpO1xuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHR9XG5cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG4vLyBNZXJnZSB0d28gU3ltYm9sIHJ1bGVzIHRvZ2V0aGVyLCByZXR1cm5pbmcgYSBuZXcgcnVsZSB0aGF0IG1hdGNoZXMgYm90aC5cblJ1bGUubWVyZ2VTeW1ib2xzID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuXHQvLyBHZXQgY3VzdG9tIGNvbnN0cnVjdG9yIGlmIHRoZXJlIGlzIG9uZS4uLlxuXHRsZXQgY29uc3RydWN0b3IgPSBmaXJzdC5jb25zdHJ1Y3RvciAhPT0gUnVsZS5TeW1ib2wgPyBmaXJzdC5jb25zdHJ1Y3RvciA6IHNlY29uZC5jb25zdHJ1Y3Rvcjtcblx0cmV0dXJuIG5ldyBjb25zdHJ1Y3Rvcih7IHN0cmluZzogZmlyc3Quc3RyaW5nICsgc2Vjb25kLnN0cmluZyB9KTtcbn1cblxuLy8gS2V5d29yZCBwYXR0ZXJuLlxuLy8gUHJvcGVydGllczpcbi8vXHQtIGBydWxlLnN0cmluZ2AgXHQocmVxdWlyZWQpIFx0S2V5d29yZCBzdHJpbmcgdG8gbWF0Y2guXG4vL1x0LSBgcnVsZS5wYXR0ZXJuYFx0KG9wdGlvbmFsKSBcdFJlZ0V4cCBmb3IgdGhlIG1hdGNoLlxuLy9cdFx0XHRcdFx0XHRcdFx0XHRXZSdsbCBjcmVhdGUgb25lIGZyb20gYHN0cmluZ2AgaWYgbmVjZXNzYXJ5LlxuLy9cdFx0XHRcdFx0XHRcdFx0XHROT1RFOiBkbyBOT1Qgc3RhcnQgdGhlIGBwYXR0ZXJuYCB3aXRoIGBeYC5cblJ1bGUuS2V5d29yZCA9IGNsYXNzIEtleXdvcmQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHN0cmluZ2AgaXMgcmVxdWllZC5cblx0XHRpZiAoIXByb3BlcnRpZXMuc3RyaW5nKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuS2V5d29yZCgpOiBFeHBlY3RlZCBzdHJpbmcgcHJvcGVydHlcIik7XG5cblx0XHQvLyBkZXJpdmUgYHBhdHRlcm5gIGlmIG5lY2Vzc2FyeS5cblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikge1xuXHRcdFx0Ly8gZW5mb3JjZSB3b3JkIGJvdW5kYXJpZXMgYW5kIGFsbG93IGFyYml0cmFyeSBzcGFjZSBiZXR3ZWVuIHdvcmRzXG5cdFx0XHRsZXQgcGF0dGVyblN0cmluZyA9IFBhcnNlci5lc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHByb3BlcnRpZXMuc3RyaW5nKTtcblx0XHRcdHByb3BlcnRpZXMucGF0dGVybiA9IG5ldyBSZWdFeHAoXCJcXFxcYlwiICsgcGF0dGVyblN0cmluZyArIFwiXFxcXGJcIik7XG5cdFx0fVxuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMuc3RyaW5nfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG4vLyBNZXJnZSB0d28gS2V5d29yZCBydWxlcyB0b2dldGhlciwgYWRkaW5nIHRoZSBzZWNvbmQgdG8gdGhlIGZpcnN0LlxuUnVsZS5tZXJnZUtleXdvcmRzID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuXHQvLyBHZXQgY3VzdG9tIGNvbnN0cnVjdG9yIGlmIHRoZXJlIGlzIG9uZS4uLlxuXHRsZXQgY29uc3RydWN0b3IgPSBmaXJzdC5jb25zdHJ1Y3RvciAhPT0gUnVsZS5LZXl3b3JkID8gZmlyc3QuY29uc3RydWN0b3IgOiBzZWNvbmQuY29uc3RydWN0b3I7XG5cdHJldHVybiBuZXcgY29uc3RydWN0b3IoeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIFwiIFwiICsgc2Vjb25kLnN0cmluZyB9KTtcbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy5ydWxlLCBcInJ1bGVcIik7XG5cdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgbWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdHJldHVybiBtYXRjaDtcblx0fVxuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnJ1bGUsIFwicnVsZVwiKTtcblx0XHRyZXR1cm4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYW55IG9mIG91ciBhbHRlcm5hdGl2ZXMgYXJlIGZvdW5kIEFOWVdIRVJFIGluIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIHJlZ2V4IG1hdGNoIGlmIGZvdW5kLFxuXHQvL1x0LSBgZmFsc2VgIGlmIG5vdCBmb3VuZCBvclxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljLlxuXHR0ZXN0KHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZU9yRGllKHRoaXMucnVsZSwgXCJydWxlXCIpO1xuXHRcdHJldHVybiBydWxlLnRlc3QocGFyc2VyLCBzdHJlYW0pO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHtcblxuXHQvLyBJcyB0aGlzIGRldGVybWluaXN0aWMsIGVnOiBhcmUgb3VyIHN1YnJ1bGVzIHVuYW1iaWdvdXNseSBkZXRlcm1pbmFibGU/XG4vL1RPRE86IG1lbW9pemU/XG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzLmV2ZXJ5KHJ1bGUgPT4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pKTtcblx0fVxufVxuXG5cbi8vIFNlcXVlbmNlIG9mIHJ1bGVzIHRvIG1hdGNoIChhdXRvLWV4Y2x1ZGluZyB3aGl0ZXNwYWNlKS5cblJ1bGUuU2VxdWVuY2UgPSBjbGFzcyBTZXF1ZW5jZSBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrID0gW10pIHtcblx0XHQvLyBJZiB3ZSBoYXZlIGEgYHRlc3RSdWxlYCBkZWZpbmVkXG5cdFx0aWYgKHRoaXMudGVzdFJ1bGUpIHtcblx0XHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnRlc3RSdWxlLCBcInRlc3RSdWxlXCIpO1xuXHRcdFx0aWYgKHJ1bGUudGVzdChwYXJzZXIsIHN0cmVhbSkgPT09IGZhbHNlKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdGlmIChSdWxlLnN0YWNrQ29udGFpbnMoc3RhY2ssIHRoaXMsIHN0cmVhbSkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRzdGFjayA9IHN0YWNrLmNvbmNhdCgpO1xuXHRcdFx0c3RhY2sucHVzaChbdGhpcywgc3RyZWFtXSk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2h1bmtpdCkgcmV0dXJuIHRoaXMucGFyc2VJbkNodW5rcyhwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIW1hdGNoICYmICFydWxlLm9wdGlvbmFsKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdG1hdGNoZWQucHVzaChtYXRjaCk7XG5cdFx0XHRcdG5leHQgPSBtYXRjaC5uZXh0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGlmIHdlIGdldCBoZXJlLCB3ZSBtYXRjaGVkIGFsbCB0aGUgcnVsZXMhXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vIFx0cGFyc2VJbkNodW5rcyhwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcbi8vXG4vLyBcdH1cblxuLy9UT0RPQ1xuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGBtYXRjaGVkYCBhcnJheSBpbmRleGVkIGJ5XG5cdC8vXHRcdC0gYG1hdGNoLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYG1hdGNoLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIGBydWxlIHR5cGVgOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRsZXQgcmVzdWx0cyA9IHt9O1xuXHRcdGZvciAobGV0IG1hdGNoIG9mIHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0bGV0IGFyZ05hbWUgPSBtYXRjaC5hcmd1bWVudCB8fCBtYXRjaC5ydWxlTmFtZSB8fCBtYXRjaC5jb25zdHJ1Y3Rvci5uYW1lO1xuXG5cdFx0XHQvLyBJZiBhcmcgYWxyZWFkeSBleGlzdHMsIGNvbnZlcnQgdG8gYW4gYXJyYXlcblx0XHRcdGlmIChhcmdOYW1lIGluIHJlc3VsdHMpIHtcblx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KHJlc3VsdHNbYXJnTmFtZV0pKSByZXN1bHRzW2FyZ05hbWVdID0gW3Jlc3VsdHNbYXJnTmFtZV1dO1xuXHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdLnB1c2gobWF0Y2gpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0gPSBtYXRjaDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlcy5qb2luKFwiIFwiKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG5cbn1cblxuLy8gU3ludGFjdGljIHN1Z2FyIGZvciBkZWJ1Z2dpbmdcblJ1bGUuRXhwcmVzc2lvbiA9IGNsYXNzIGV4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gU3RhdGVtZW50cyB0YWtlIHVwIHRoZSBlbnRpcmUgbGluZS5cblJ1bGUuU3RhdGVtZW50ID0gY2xhc3Mgc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIEFsdGVybmF0aXZlIHN5bnRheCwgbWF0Y2hpbmcgb25lIG9mIGEgbnVtYmVyIG9mIGRpZmZlcmVudCBydWxlcy5cbi8vIFRoZSByZXN1bHQgb2YgYSBwYXJzZSBpcyB0aGUgbG9uZ2VzdCBydWxlIHRoYXQgYWN0dWFsbHkgbWF0Y2hlZC5cbi8vIE5PVEU6IEN1cnJlbnRseSB0YWtlcyB0aGUgbG9uZ2VzdCB2YWxpZCBtYXRjaC5cbi8vIFRPRE86IG1hdGNoIGFsbCB2YWxpZCBhbHRlcm5hdGl2ZXNcbi8vIFRPRE86IHJlbmFtZT9cblJ1bGUuQWx0ZXJuYXRpdmVzID0gY2xhc3MgQWx0ZXJuYXRpdmVzIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKTtcblx0XHRpZiAoIXRoaXMucnVsZXMpIHRoaXMucnVsZXMgPSBbXTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljLlxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmQgb3Jcblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICghdGhpcy5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCBiZXN0TWF0Y2g7XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnRlc3QocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdG1hdGNoLmVuZEluZGV4ID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG5cdFx0XHRcdHJldHVybiBtYXRjaDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gRmluZCBhbGwgcnVsZXMgd2hpY2ggbWF0Y2ggYW5kIGRlbGVnYXRlIHRvIGBnZXRCZXN0TWF0Y2goKWAgdG8gcGljayB0aGUgYmVzdCBvbmUuXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdGxldCBtYXRjaGVzID0gW107XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayk7XG5cdFx0XHRpZiAobWF0Y2gpIG1hdGNoZXMucHVzaChtYXRjaCk7XG5cdFx0fVxuXG5cdFx0aWYgKCFtYXRjaGVzLmxlbmd0aCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIHVuY29tbWVudCB0aGUgYmVsb3cgdG8gcHJpbnQgYWx0ZXJuYXRpdmVzXG5cdFx0Ly8gaWYgKG1hdGNoZXMubGVuZ3RoID4gMSkge1xuXHRcdC8vXHRjb25zb2xlLmluZm8odGhpcy5hcmd1bWVudCB8fCB0aGlzLnJ1bGVOYW1lLCBtYXRjaGVzLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5tYXRjaGVkVGV4dCkpO1xuXHRcdC8vIH1cblxuXHRcdGxldCBiZXN0TWF0Y2ggPSAobWF0Y2hlcy5sZW5ndGggPT09IDEgPyBtYXRjaGVzWzBdIDogdGhpcy5nZXRCZXN0TWF0Y2gobWF0Y2hlcykpO1xuXG5cdFx0Ly8gYXNzaWduIGBhcmdOYW1lYCBvciBgcnVsZU5hbWVgIGZvciBgcmVzdWx0c2Bcblx0XHRpZiAodGhpcy5hcmd1bWVudCkgYmVzdE1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRlbHNlIGlmICh0aGlzLnJ1bGVOYW1lKSBiZXN0TWF0Y2gucnVsZU5hbWUgPSB0aGlzLnJ1bGVOYW1lO1xuLy9UT0RPOiBvdGhlciB0aGluZ3MgdG8gY29weSBoZXJlPz8/XG5cblx0XHRyZXR1cm4gYmVzdE1hdGNoO1xuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBcImJlc3RcIiBtYXRjaCBnaXZlbiBtb3JlIHRoYW4gb25lIG1hdGNoZXMgYXQgdGhlIGhlYWQgb2YgdGhlIHN0cmVhbS5cblx0Ly8gRGVmYXVsdCBpcyB0byByZXR1cm4gdGhlIGxvbmdlc3QgbWF0Y2guXG5cdC8vIEltcGxlbWVudCBzb21ldGhpbmcgZWxzZSB0byBkbywgZWcsIHByZWNlZGVuY2UgcnVsZXMuXG5cdGdldEJlc3RNYXRjaChtYXRjaGVzKSB7XG5cdFx0cmV0dXJuIG1hdGNoZXMucmVkdWNlKGZ1bmN0aW9uIChiZXN0LCBuZXh0KSB7XG5cdFx0XHRpZiAobmV4dC5lbmRJbmRleCA+IGJlc3QuZW5kSW5kZXgpIHJldHVybiBuZXh0O1xuXHRcdFx0cmV0dXJuIGJlc3Q7XG5cdFx0fSwgbWF0Y2hlc1swXSk7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZShjb250ZXh0KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5tYXRjaGVkYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrID0gW10pIHtcblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHRpZiAoUnVsZS5zdGFja0NvbnRhaW5zKHN0YWNrLCB0aGlzLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0c3RhY2sgPSBzdGFjay5jb25jYXQoKTtcblx0XHRcdHN0YWNrLnB1c2goW3RoaXMsIHN0cmVhbV0pO1xuXHRcdH1cblxuXHRcdGxldCBuZXh0ID0gc3RyZWFtO1xuXHRcdGxldCBtYXRjaGVkID0gW107XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCBtYXRjaCA9IHRoaXMucnVsZS5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghbWF0Y2gpIGJyZWFrO1xuXG5cdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0bmV4dCA9IG1hdGNoLm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAobWF0Y2hlZC5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBhcnJheSB3aXRoIGFyZ3VtZW50cyBvZiBhbGwgcmVzdWx0cy5cblx0Ly8gTk9URTogbWVtb2l6ZXMgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC5yZXN1bHRzICk7XG5cdH1cblxuXHR0b1NvdXJjZSgpIHtcblx0XHR0aHJvdyBcIkRvbid0IHVuZGVyc3RhbmQgaG93IHRvIHNvdXJjZSBSdWxlLlJlcGVhdCFcIjtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdGNvbnN0IHJ1bGUgPSAodGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSB8fCB0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQgJiYgdGhpcy5ydWxlLnN0cmluZy5pbmNsdWRlcyhcIiBcIilcblx0XHRcdFx0ICAgPyBgKCR7dGhpcy5ydWxlfSlgXG5cdFx0XHRcdCAgIDogYCR7dGhpcy5ydWxlfWBcblx0XHRcdFx0KTtcblx0XHRyZXR1cm4gYCR7cnVsZX0ke3RoaXMub3B0aW9uYWwgPyAnKicgOiAnKyd9YDtcblx0fVxufVxuXG5cbi8vIExpc3QgbWF0Y2ggcnVsZTogICBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAuIGVnXCIgYFt7bnVtYmVyfSxdYCB0byBtYXRjaCBgMSwyLDNgXG4vL1x0YHJ1bGUuaXRlbWAgaXMgdGhlIHJ1bGUgZm9yIGVhY2ggaXRlbSxcbi8vXHRgcnVsZS5kZWxpbWl0ZXJgIGlzIHRoZSBkZWxpbWl0ZXIgYmV0d2VlbiBlYWNoIGl0ZW0uXG4vLyBcdGBydWxlLm1hdGNoZWRgIGluIHRoZSBvdXRwdXQgaXMgdGhlIGxpc3Qgb2YgdmFsdWVzLlxuLy9cbi8vXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhIExpc3QgcnVsZSB3aWxsIE5PVCByZXBlYXQgKD8/Pz8pXG5SdWxlLkxpc3QgPSBjbGFzcyBMaXN0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCBzdHJlYW1dKTtcblx0XHR9XG5cblx0XHQvLyBlbnN1cmUgaXRlbSBhbmQgZGVsaW1pdGVyIGFyZSBvcHRpb25hbCBzbyB3ZSBkb24ndCBiYXJmIGluIGBwYXJzZVJ1bGVgXG5cdFx0dGhpcy5pdGVtLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR0aGlzLmRlbGltaXRlci5vcHRpb25hbCA9IHRydWU7XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHQvLyBnZXQgbmV4dCBpdGVtLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGl0ZW0gPSB0aGlzLml0ZW0ucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdG1hdGNoZWQucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghZGVsaW1pdGVyKSBicmVhaztcblx0XHRcdG5leHQgPSBkZWxpbWl0ZXIubmV4dCgpO1xuXHRcdH1cblxuXHRcdC8vIElmIHdlIGRpZG4ndCBnZXQgYW55IG1hdGNoZXMsIGZvcmdldCBpdC5cblx0XHRpZiAobWF0Y2hlZC5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogbWF0Y2hlZFswXSA/IG1hdGNoZWRbMF0uc3RhcnRJbmRleCA6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIG1hdGNoZWQgaXRlbSBieSBpbmRleFxuXHRnZXRJdGVtKGluZGV4KSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZFtpbmRleF07XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XHRcdC8vIFRPRE86IHRocm93Pz8/XG5cdFx0bGV0IG1hdGNoZWQgPSB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC50b1NvdXJjZShjb250ZXh0KSApLmpvaW4oXCIsIFwiKTtcblx0XHRyZXR1cm4gYFske21hdGNoZWR9XWA7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYFske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMuaXRlbX0gJHt0aGlzLmRlbGltaXRlcn1dJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGUuanMiLCIvLyBTcGVsbCBcIkVuZ2xpc2hcIiBwYXJzZXIgc3RyYXdtYW5cblxuLy8gVE9ETzpcdGB0ZXN0YCBmdW5jdGlvbiBmb3IgcXVpY2sgbm8tZ29vZCBoaXQgb24gYHthfSBibGFoIGJsYWgge2J9YD9cbi8vIFRPRE86XHR0aGlzIGRvZXNuJ3Qgd29yazogICBge2V4cHJlc3Npb259IGlzIHtleHByZXNzaW9ufWBcbi8vIFRPRE86XHRicmVhayBgZmlsZWAgaW50byBsaW5lcyBhbmQgcHJvY2VzcyBlYWNoIChpbmNsLiBzdWJzdHIvbWF0Y2ggbm90IGdvaW5nIGJleW9uZCB0aGUgZW5kKVxuLy8gVE9ETzpcdG5lc3RpbmcgLS0gaXMgdGhpcyBqdXN0IGluZGVudCA9IFwiYWRkIGJsb2NrIHNjb3BlXCJcbi8vIFRPRE86XHRwcm9tb3Rpb24gcGF0dGVybiBmb3IgZ2F0aGVyIGFyZ3VtZW50cyAoZWc6IGxpdGVyYWwtbGlzdCkgPz8/XG4vLyBUT0RPOlx0V2hhdCBkb2VzIHN5bnRheCB0cmVlIGxvb2sgbGlrZT8gIEhvdyBkbyB3ZSBleHRyYWN0IG1lYW5pbmcgb3V0IG9mIHRoZSBuZXN0P1xuLy8gVE9ETzpcdFBhc3MgYGNvbnRleHRgIHRvIHRvU291cmNlKCksIGFkZCBwcm9wZXJ0eSBkZXNjcmlwdG9ycyB0byBgY2xhc3NgLCB2YXJpYWJsZXMgYW5kIGNvZGUgdG8gYG1ldGhvZGAsIGBnbG9iYWxgIHN0dWZmIGV0Y1xuXG5pbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIEdSUlIuLi4gd2lsbCBTT01FT05FIG9uIHRoZSBub2RlIHRlYW0gcGxlYXNlIGltcGxlbWVudCBjb25zb2xlLmdyb3VwID8/P1xuaWYgKCFjb25zb2xlLmdyb3VwKSBjb25zb2xlLmdyb3VwID0gY29uc29sZS5sb2c7XG5pZiAoIWNvbnNvbGUuZ3JvdXBFbmQpIGNvbnNvbGUuZ3JvdXBFbmQgPSBjb25zb2xlLmxvZztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblx0Ly8gU2V0IHRvIGB0cnVlYCB0byBvdXRwdXQgZGVidWcgaW5mbyB3aGlsZSBhZGRpbmcgcnVsZXNcblx0c3RhdGljIERFQlVHID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cblx0XHQvLyBDbG9uZSBydWxlcywgc3RhcnRpbmcgd2l0aCBhIGNvbXBsZXRlbHkgZW1wdHkgbWFwIGlmIG5vdCBkZWZpbmVkIChubyBzdGFuZGFyZCBvYmplY3Qga2V5cylcblx0XHR0aGlzLnJ1bGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnJ1bGVzIHx8IG51bGwpO1xuXHR9XG5cblx0Z2V0UnVsZShuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXNbbmFtZV07XG5cdH1cblxuXHRnZXRSdWxlT3JEaWUobmFtZSwgcHJvcGVydHlOYW1lKSB7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUobmFtZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYCR7cHJvcGVydHlOYW1lfSBydWxlICcke25hbWV9JyBub3QgZm91bmRgKTtcblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG4vL1xuLy8jIyMgUGFyc2luZ1xuLy9cblx0Ly8gUGFyc2Ugc29tZXRoaW5nOlxuXHQvL1x0LSBpZiBvbmUgc3RyaW5nIGFyZ3VtZW50LCBkb2VzIGEgYHBhcnNlU3RhdGVtZW50KClgXG5cdC8vXHQtIGlmIHR3bywgZG9lcyBhIGBwYXJzZVJ1bGUoKWBcblx0Ly8gUmV0dXJucyBgcGFyc2UudG9TdHJpbmcoKWAgb3IgdGhyb3dzLlxuLy9URVNUTUVcblx0Y29tcGlsZSgpIHtcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0bGV0IHN0cmluZyA9IGFyZ3VtZW50c1swXTtcblx0XHRcdHJldHVybiB0aGlzLmNvbXBpbGVTdGF0ZW1lbnRzKHN0cmluZyk7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcblx0XHRcdGxldCBuYW1lID0gYXJndW1lbnRzWzBdLCBzdHJpbmcgPSBhcmd1bWVudHNbMV07XG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5wYXJzZShuYW1lLCBzdHJpbmcpO1xuXHRcdFx0aWYgKCFyZXN1bHQpIHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2VyLnBhcnNlKCcke25hbWV9JywgJyR7c3RyaW5nfScpOiBjYW4ndCBwYXJzZSB0aGlzYCk7XG5cdFx0XHRyZXR1cm4gcmVzdWx0LnRvU291cmNlKHRoaXMpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihcInBhcnNlci5wYXJzZSgpOiBleHBlY3RzIG9uZSBvciB0d28gYXJndW1lbnRzXCIpO1xuXHRcdH1cblx0fVxuXG5cdC8vIFBhcnNlIGBuYW1lYGQgcnVsZSBhdCBoZWFkIG9mIGBzdHJlYW1gIChgc3RyaW5nYCBvciBgVGV4dFN0cmVhbWApLlxuXHQvLyBIYW5kbGVzIG9wdGlvbmFsIGFuZCByZXBlYXRpbmcgcnVsZXMgYXMgd2VsbCBhcyBlYXRpbmcgd2hpdGVzcGFjZS5cblx0Ly8gUmV0dXJucyByZXN1bHQgb2YgcGFyc2UuXG4vL1RFU1RNRVxuXHRwYXJzZShuYW1lLCBzdHJlYW0pIHtcblx0XHRpZiAodHlwZW9mIHN0cmVhbSA9PT0gXCJzdHJpbmdcIikgc3RyZWFtID0gbmV3IFRleHRTdHJlYW0oc3RyZWFtKTtcblx0XHRsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShuYW1lKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2VyLnBhcnNlKCR7bmFtZX0pOiBSdWxlIG5vdCBmb3VuZGApO1xuXHRcdHN0cmVhbSA9IHRoaXMuZWF0V2hpdGVzcGFjZShzdHJlYW0pO1xuXHRcdHJldHVybiBydWxlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdH1cblxuXHQvLyBQYXJzZSBhIHNldCBvZiBzdGF0ZW1lbnRzIGxpbmUtYnktbGluZS5cbi8vVEVTVE1FXG5cdGNvbXBpbGVTdGF0ZW1lbnRzKHN0YXRlbWVudHMpIHtcblx0XHRjb25zb2xlLnRpbWUoXCJwYXJzZVN0YXRlbWVudHNcIik7XG5cdFx0bGV0IHJlc3VsdHMgPSBbXTtcblx0XHRsZXQgY3VycmVudEluZGVudCA9IDA7XG5cdFx0Y29uc3QgdGFicyA9IFwiXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XCI7XG5cdFx0c3RhdGVtZW50cy5zcGxpdCgvXFxuL2cpLmZvckVhY2goc3RhdGVtZW50ID0+IHtcblx0XHRcdC8vIHNraXAgbGluZXMgdGhhdCBhcmUgYWxsIHdoaXRlc3BhY2Vcblx0XHRcdGlmIChzdGF0ZW1lbnQudHJpbSgpID09PSBcIlwiKSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChcIlwiKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBmaWd1cmUgb3V0IGluZGVudCBsZXZlbCBvZiB0aGlzIGxpbmVcblx0XHRcdGxldCBsaW5lU3RhcnQgPSBzdGF0ZW1lbnQubWF0Y2goL15cXHQqLylbMF07XG5cdFx0XHRsZXQgbGluZUluZGVudCA9IGxpbmVTdGFydC5sZW5ndGg7XG5cdFx0XHRpZiAobGluZUluZGVudCA+IGN1cnJlbnRJbmRlbnQpIHtcblx0XHRcdFx0Ly8gYWRkIHRvIGVuZCBvZiBwcmV2aW91cyBsaW5lIGlmIHBvc3NpYmxlXG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCkge1xuXHRcdFx0XHRcdC8vIGJ1dCBvbmx5IGlmIG91dHB1dCBpcyBub3QgYWxyZWFkeSBpbmRlbnRlZCB0byB0aGF0IGxldmVsXG5cdFx0XHRcdFx0bGV0IGluZGVudGVkU3RhcnQgPSBsaW5lU3RhcnQgKyBcIlxcdFwiO1xuXHRcdFx0XHRcdGlmICghcmVzdWx0c1tyZXN1bHRzLmxlbmd0aCAtIDFdLnN0YXJ0c1dpdGgoaW5kZW50ZWRTdGFydCkpIHtcblx0XHRcdFx0XHRcdHJlc3VsdHNbcmVzdWx0cy5sZW5ndGggLSAxXSArPSBcIiB7XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuLy9jb25zb2xlLmluZm8oXCJhbHJlYWR5IGluZGVudGVkXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHJlc3VsdHMucHVzaCh0YWJzLnN1YnN0cigwLCBsaW5lSW5kZW50LTEpICsgXCJ7XCIpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAobGluZUluZGVudCA8IGN1cnJlbnRJbmRlbnQpIHtcblx0XHRcdFx0bGV0IGNsb3NlcnMgPSBbXTtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IGN1cnJlbnRJbmRlbnQ7IGkgPiBsaW5lSW5kZW50OyBpLS0pIHtcblx0XHRcdFx0XHRjbG9zZXJzLnB1c2godGFicy5zdWJzdHIoMCwgaS0xKSArIFwifVwiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBwdXQgcGFyZW5zIEJFRk9SRSBhbnkgYmxhbmsgbGluZXMhXG5cdFx0XHRcdGxldCBsYXN0QmxhbmtMaW5lID0gdGhpcy5fZ2V0TGFzdEJsYW5rTGluZShyZXN1bHRzKTtcblx0XHRcdFx0cmVzdWx0cy5zcGxpY2UobGFzdEJsYW5rTGluZSwgMCwgLi4uY2xvc2Vycyk7XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50SW5kZW50ID0gbGluZUluZGVudDtcblxuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMucGFyc2UoXCJzdGF0ZW1lbnRcIiwgc3RhdGVtZW50KTtcbi8vVE9ETzogY29tcGxhaW4gaWYgY2FuJ3QgcGFyc2UgdGhlIGVudGlyZSBsaW5lIVxuXHRcdFx0aWYgKHJlc3VsdCkge1xuXHRcdFx0XHQvLyBzcGxpdCBieSBsaW5lcyBhbmQgYWRkIGluZGVudFxuXHRcdFx0XHRsZXQgc291cmNlID0gcmVzdWx0LnRvU291cmNlKHRoaXMpLnNwbGl0KFwiXFxuXCIpXG5cdFx0XHRcdFx0XHRcdFx0Lm1hcCggbGluZSA9PiBsaW5lU3RhcnQgKyBsaW5lICk7XG5cdFx0XHRcdHJlc3VsdHMgPSByZXN1bHRzLmNvbmNhdChzb3VyY2UpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGNvbnNvbGUud2FybihcIkNvdWxkbid0IHBhcnNlIHN0YXRlbWVudDpcIiwgc3RhdGVtZW50KTtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKFwiLy8gRVJST1I6IFwiK3N0YXRlbWVudCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR3aGlsZSAoY3VycmVudEluZGVudCA+IDApIHtcblx0XHRcdHJlc3VsdHMucHVzaCh0YWJzLnN1YnN0cigwLCBjdXJyZW50SW5kZW50LTEpICsgXCJ9XCIpO1xuXHRcdFx0Y3VycmVudEluZGVudC0tO1xuXHRcdH1cblxuXHRcdGNvbnNvbGUudGltZUVuZChcInBhcnNlU3RhdGVtZW50c1wiKTtcblx0XHRyZXR1cm4gcmVzdWx0cy5qb2luKFwiXFxuXCIpO1xuXHR9XG5cblx0Ly8gRmlndXJlIG91dCB0aGUgbGFzdCBibGFuayBsaW5lIGluIHRoZSByZXN1bHRzXG5cdF9nZXRMYXN0QmxhbmtMaW5lKHJlc3VsdHMpIHtcblx0XHRmb3IgKGxldCBpID0gcmVzdWx0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0aWYgKHJlc3VsdHNbaV0gPT09IFwiXCIpIGNvbnRpbnVlO1xuXHRcdFx0cmV0dXJuIGkgKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gMDtcblx0fVxuXG5cdC8vIEVhdCB3aGl0ZXNwYWNlIChhY2NvcmRpbmcgdG8gYHJ1bGVzLndoaXRlc3BhY2VgKSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnMgbmV3IHN0cmVhbSBpZiB3ZSBtYXRjaGVkIHdoaXRlc3BhY2UsIG90aGVyd2lzZSB0aGUgc2FtZSBzdHJlYW0uXG5cdGVhdFdoaXRlc3BhY2Uoc3RyZWFtKSB7XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMucnVsZXMud2hpdGVzcGFjZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gc3RyZWFtO1xuXHRcdHJldHVybiBzdHJlYW0uYWR2YW5jZUJ5KHJlc3VsdC5tYXRjaGVkLmxlbmd0aCk7XG5cdH1cblxuLy9cbi8vXHRSdWxlc1xuLy9cblxuXHQvLyBBZGQgYSBydWxlIHRvIG91ciBsaXN0IG9mIHJ1bGVzIVxuXHQvLyBDb252ZXJ0cyB0byBgYWx0ZXJuYXRpdmVzYCBvbiByZS1kZWZpbmluZyB0aGUgc2FtZSBydWxlLlxuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHQvLyBkb24ndCBvdmVycmlkZSBydWxlTmFtZVxuXHRcdGlmICghcnVsZS5ydWxlTmFtZSkgcnVsZS5ydWxlTmFtZSA9IG5hbWU7XG5cblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLnJ1bGVzW25hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtuYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZTogbmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdC8vIGNvcHkgYXJndW1lbnQgbmFtZSBvdmVyICg/Pz8pXG5cdFx0XHRcdGlmIChleGlzdGluZy5hcmd1bWVudCkgdGhpcy5ydWxlc1tuYW1lXS5hcmd1bWVudCA9IGV4aXN0aW5nLmFyZ3VtZW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JyB0byAnJHtuYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXS5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBydWxlO1xuXHRcdH1cblxuXG5cdFx0Ly8gbWFrZSBhIG5vdGUgaWYgd2UncmUgYWRkaW5nIGEgbGVmdC1yZWN1cnNpdmUgcnVsZVxuXHRcdGlmICh0aGlzLnJ1bGVJc0xlZnRSZWN1cnNpdmUobmFtZSwgcnVsZSkpIHtcbi8vY29uc29sZS5pbmZvKFwibWFya2luZyBcIiwgcnVsZSwgXCIgYXMgbGVmdCByZWN1cnNpdmUhXCIpO1xuXHRcdFx0cnVsZS5sZWZ0UmVjdXJzaXZlID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cdC8vIElzIHRoZSBzcGVjaWZpZWQgcnVsZSBsZWZ0LXJlY3Vyc2l2ZT9cblx0cnVsZUlzTGVmdFJlY3Vyc2l2ZShuYW1lLCBydWxlKSB7XG5cdFx0aWYgKCEocnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UpKSByZXR1cm4gZmFsc2U7XG4vL2NvbnNvbGUubG9nKG5hbWUsIHJ1bGUpO1xuXHRcdGZvciAobGV0IHN1YnJ1bGUgb2YgcnVsZS5ydWxlcykge1xuXHRcdFx0Ly8gaWdub3JlIG9wdGlvbmFsIHJ1bGVzXG5cdFx0XHRpZiAoc3VicnVsZS5vcHRpb25hbCkgY29udGludWU7XG5cdFx0XHRpZiAoc3VicnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3VicnVsZSAmJiBzdWJydWxlLnJ1bGUgPT09IG5hbWUpIHJldHVybiB0cnVlO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXG4vL1xuLy8gIyMgVXRpbGl0eSBtZXRob2RzXG4vL1xuXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gXG5cdC8vXHRpbiBhcnJheSBvZiBgdG9rZW5zYCAoc3RyaW5ncykuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cblxuXHQvLyBMaXN0IG9mIHNwZWNpYWwgY2hhcmFjdGVycyBpbiByZWd1bGFyIGV4cHJlc3Npb25zLlxuXHQvLyBVc2VkIHRvIGVzY2FwZSB0aG9zZSBjaGFycyB3aGVuIGNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbnMgZnJvbSBzdHJpbmdzLlxuXHRzdGF0aWMgUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyA9IChmdW5jdGlvbigpIHtcblx0XHRjb25zdCBjaGFycyA9IHt9O1xuXHRcdFwiXFxcXC9eJCorPy4oKXx7fSxbXVwiLnNwbGl0KFwiXCIpLmZvckVhY2goY2hhciA9PiBjaGFyc1tjaGFyXSA9IHRydWUpO1xuXHRcdHJldHVybiBjaGFycztcblx0fSkoKVxuXG5cdC8vIEdpdmVuIGEgXCJub3JtYWxcIiBgc3RyaW5nYCwgZXNjYXBlIGFueSByZWd1bGFyIGV4cHJlc3Npb24gc3BlY2lhbCBjaGFyYWN0ZXJzXG5cdC8vXHRzbyB3ZSBjYW4gY3JlYXRlIGEgYG5ldyBSZWdFeHAoKWAuXG5cdC8vIEFsc28gY29udmVydHMgYSBzaW5nbGUgc3BhY2UgdG8gYXJiaXRyYXJ5IHNldCBvZiBzcGFjZXMgd2l0aCBcIlxccytcIlxuXHRzdGF0aWMgZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpIHtcblx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KFwiXCIpLm1hcChmdW5jdGlvbiAoY2hhciwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3IgYmFja3NsYXNoXG5cdFx0XHRpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIjtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igc3BhY2Vcblx0XHRcdGlmIChjaGFyID09PSBcIiBcIikgcmV0dXJuIFwiXFxcXHMrXCI7XG5cdFx0XHQvLyBJZiBhIHNwZWNpYWwgY2hhciBhbmQgcHJldmlvdXMgY2hhcmFjdGVyIHdhcyBub3QgYW4gZXNjYXBlLCBlc2NhcGUgdGhlIHJlc3VsdC5cblx0XHRcdGlmIChQYXJzZXIuUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSU1tjaGFyXSAmJiBsaXN0W2luZGV4LTFdICE9PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiK2NoYXI7XG5cdFx0XHQvLyBUaGlzIGNoYXIgc2hvdWxkIGJlIGZpbmUgYnkgaXRzZWxmLlxuXHRcdFx0cmV0dXJuIGNoYXI7XG5cdFx0fSkuam9pbihcIlwiKTtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyByZWd1bGFyIGV4cHJlc3Npb24gZnJvbSBhIFwibm9ybWFsXCIgc3RyaW5nLCBlc2NhcGluZyBzcGVjaWFsIGNoYXJhY3RlcnMgYXMgbmVjZXNzYXJ5LlxuXHRzdGF0aWMgUmVnRXhwRnJvbVN0cmluZyhzdHJpbmcsIGZsYWdzKSB7XG5cdFx0cmV0dXJuIG5ldyBSZWdFeHAoUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSwgZmxhZ3MpO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXG4vL1x0IyBDb3JlIGBydWxlc2AgLS0gc2ltcGxlIGRhdGF0eXBlcywgZXRjLlxuLy9cbi8vIE5PVEU6IG1hbnkgb2YgdGhlIGJlbG93IGFyZSBjcmVhdGVkIGFzIGN1c3RvbSBQYXR0ZXJuIHN1YmNsYXNzZXMgZm9yIGRlYnVnZ2luZy5cbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGB3aGl0ZXNwYWNlYCBydWxlLlxuLy8gTk9URSBgcGFyc2VyLnBhcnNlUnVsZShcIndoaXRlc3BhY2VcIiwgXCIgICBcIilgIHdpbGwgcmV0dXJuIGB1bmRlZmluZWRgXG4vL1x0XHQgYmVjYXVzZSBgcGFyc2VyLnBhcnNlUnVsZSgpYCBhdXRvbWF0aWNhbGx5IGVhdHMgd2hpdGVzcGFjZSBhdCB0aGUgc3RhcnQgb2YgYSBydWxlLlxuUnVsZS5XaGl0ZXNwYWNlID0gY2xhc3Mgd2hpdGVzcGFjZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fVxucGFyc2VyLmFkZFJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIG5ldyBSdWxlLldoaXRlc3BhY2UoeyBwYXR0ZXJuOiAvXFxzKy8sIG9wdGlvbmFsOiB0cnVlIH0pKTtcblxuXG4vLyBgd29yZGAgPSBpcyBhIHNpbmdsZSBhbHBoYW51bWVyaWMgd29yZC5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5Xb3JkID0gY2xhc3Mgd29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB3b3JkID0gcGFyc2VyLmFkZFJ1bGUoXCJ3b3JkXCIsIG5ldyBSdWxlLldvcmQoe1xuXHRwYXR0ZXJuOiAvXFxiW2Etel1bXFx3XFwtXSpcXGIvLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5cblxuLy8gYGlkZW50aWZpZXJgID0gdmFyaWFibGVzIG9yIHByb3BlcnR5IG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcblJ1bGUuSWRlbnRpZmllciA9IGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgaWRlbnRpZmllciA9IHBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgUnVsZS5JZGVudGlmaWVyKHtcblx0cGF0dGVybjogL1xcYlthLXpdW1xcd1xcLV0qXFxiLyxcblxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBpZGVudGlmaWVyKTtcblxuLy8gQWRkIEVuZ2xpc2ggcHJlcG9zaXRpb25zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy9cbi8vIFdpa2lwZWRpYSBcIlByZXBvc2l0aW9uXCI6XG4vL1x0XCJQcmVwb3NpdGlvbnMuLi5hcmUgYSBjbGFzcyBvZiB3b3JkcyB0aGF0XG4vL1x0ZXhwcmVzcyBzcGF0aWFsIG9yIHRlbXBvcmFsIHJlbGF0aW9ucyAgKGluLCB1bmRlciwgdG93YXJkcywgYmVmb3JlKVxuLy9cdG9yIG1hcmsgdmFyaW91cyBzZW1hbnRpYyByb2xlcyAob2YsIGZvcikuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFib3V0XCIsIFwiYWJvdmVcIiwgXCJhZnRlclwiLCBcImFuZFwiLCBcImFzXCIsIFwiYXRcIixcblx0XCJiZWZvcmVcIiwgXCJiZWhpbmRcIiwgXCJiZWxvd1wiLCBcImJlbmVhdGhcIiwgXCJiZXNpZGVcIiwgXCJiZXR3ZWVuXCIsIFwiYmV5b25kXCIsIFwiYnlcIixcblx0XCJkZWZpbmVkXCIsIFwiZG93blwiLCBcImR1cmluZ1wiLFxuXHRcImVhY2hcIiwgXCJlbXB0eVwiLCBcImV4YWN0bHlcIiwgXCJleGNlcHRcIixcblx0XCJmb3JcIiwgXCJmcm9tXCIsXG5cdFwiZ3JlYXRlclwiLFxuXHRcIklcIiwgXCJpblwiLCBcImludG9cIixcblx0XCJsZXNzXCIsIFwibG9uZ1wiLFxuXHRcIm1lXCIsIFwibWludXNcIiwgXCJtb3JlXCIsXG5cdFwibmVhclwiLCBcIm5vdFwiLFxuXHRcIm9mXCIsIFwib2ZmXCIsIFwib25cIiwgXCJvbnRvXCIsIFwib3Bwb3NpdGVcIiwgXCJvdXRcIiwgXCJvdXRzaWRlXCIsIFwib3ZlclwiLFxuXHRcInNob3J0XCIsIFwic2luY2VcIixcblx0XCJ0aGFuXCIsIFwidGhlXCIsIFwidGhlblwiLCBcInRocm91Z2hcIiwgXCJ0aHJ1XCIsIFwidG9cIiwgXCJ0b3dhcmRcIiwgXCJ0b3dhcmRzXCIsXG5cdFwidW5kZWZpbmVkXCIsIFwidW5kZXJcIiwgXCJ1bmRlcm5lYXRoXCIsIFwidW5pcXVlXCIsIFwidW50aWxcIiwgXCJ1cFwiLCBcInVwb25cIiwgXCJ1cHNpZGVcIixcblx0XCJ2ZXJzdXNcIiwgXCJ2c1wiLFxuXHRcIndpdGhcIiwgXCJ3aXRoaW5cIiwgXCJ3aXRob3V0XCIsXG4pO1xuXG4vLyBBZGQgY29tbW9uIGVuZ2xpc2ggdmVyYnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhcmVcIixcblx0XCJkb1wiLCBcImRvZXNcIixcblx0XCJjb250YWluc1wiLFxuXHRcImhhc1wiLCBcImhhdmVcIixcblx0XCJpc1wiLFxuXHRcInJlcGVhdFwiLFxuXHRcIndhc1wiLCBcIndlcmVcIlxuKTtcblxuLy8gQWRkIHNwZWNpYWwgY29udHJvbCBrZXl3b3JkcyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImVsc2VcIixcblx0XCJpZlwiLFxuXHRcIm90aGVyd2lzZVwiLFxuXHRcIndoaWxlXCJcbik7XG5cbi8vIGBUeXBlYCA9IHR5cGUgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhbiB1cHBlci1jYXNlIGxldHRlciAoPylcblJ1bGUuVHlwZSA9IGNsYXNzIHR5cGUgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcInR5cGVcIiwgbmV3IFJ1bGUuVHlwZSh7XG5cdHBhdHRlcm46IC8oW0EtWl1bXFx3XFwtXSp8dGV4dHxudW1iZXJ8aW50ZWdlcnxkZWNpbWFsfGNoYXJhY3Rlcnxib29sZWFufG9iamVjdCkvLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0bGV0IHZhbHVlID0gdGhpcy5tYXRjaGVkO1xuXHRcdHN3aXRjaCh2YWx1ZSkge1xuXHRcdFx0Ly8gc3BlY2lhbCBjYXNlIHRvIHRha2UgdGhlIGZvbGxvd2luZyBhcyBsb3dlcmNhc2Vcblx0XHRcdGNhc2UgXCJ0ZXh0XCI6XHRcdHJldHVybiBcIlN0cmluZ1wiO1xuXHRcdFx0Y2FzZSBcImNoYXJhY3RlclwiOlx0cmV0dXJuIFwiQ2hhcmFjdGVyXCI7XG5cdFx0XHRjYXNlIFwibnVtYmVyXCI6XHRcdHJldHVybiBcIk51bWJlclwiO1xuXHRcdFx0Y2FzZSBcImludGVnZXJcIjpcdFx0cmV0dXJuIFwiSW50ZWdlclwiO1xuXHRcdFx0Y2FzZSBcImRlY2ltYWxcIjpcdFx0cmV0dXJuIFwiRGVjaW1hbFwiO1xuXHRcdFx0Y2FzZSBcImJvb2xlYW5cIjpcdFx0cmV0dXJuIFwiQm9vbGVhblwiO1xuXHRcdFx0Y2FzZSBcIm9iamVjdFwiOlx0XHRyZXR1cm4gXCJPYmplY3RcIjtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiB2YWx1ZS5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHRcdH1cblx0fVxufSkpO1xucGFyc2VyLnJ1bGVzLnR5cGUuYWRkVG9CbGFja2xpc3QoXCJJXCIpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHBhcnNlci5ydWxlcy50eXBlKTtcblxuXG4vLyBgbnVtYmVyYCBhcyBlaXRoZXIgZmxvYXQgb3IgaW50ZWdlciwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuUnVsZS5OdW1iZXIgPSBjbGFzcyBudW1iZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgbnVtYmVyID0gcGFyc2VyLmFkZFJ1bGUoXCJudW1iZXJcIiwgbmV3IFJ1bGUuTnVtYmVyKHtcblx0cGF0dGVybjogLy0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VGbG9hdCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG51bWJlcik7XG5cblxuLy8gTnVtZXJpYyBgaW50ZWdlcmAgb25seSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gTk9URTogdGhpcyBXSUxMIG1hdGNoIGEgZmxvYXQsIGJ1dCB0aGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBjb2VyY2UgdG8gYW4gaW50ZWdlci5cbi8vIFJFVklFVzogaXMgdGhpcyByaWdodD8gIEJldHRlciB0byBub3QgbWF0Y2ggYSBmbG9hdD9cblJ1bGUuSW50ZWdlciA9IGNsYXNzIGludGVnZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImludGVnZXJcIiwgbmV3IFJ1bGUuSW50ZWdlcih7XG5cdHBhdHRlcm46IC8tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gaW50ZWdlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUludCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xuXG5cbi8vIExpdGVyYWwgYHRleHRgIHN0cmluZywgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gWW91IGNhbiB1c2UgZWl0aGVyIHNpbmdsZSBvciBkb3VibGUgcXVvdGVzIG9uIHRoZSBvdXRzaWRlIChhbHRob3VnaCBkb3VibGUgcXVvdGVzIGFyZSBwcmVmZXJyZWQpLlxuLy8gUmV0dXJuZWQgdmFsdWUgaGFzIGVuY2xvc2luZyBxdW90ZXMuXG4vLyBUT0RPOiBlc2NhcGVkIHF1b3RlcyBpbnNpZGUgc3RyaW5nXG5SdWxlLlRleHQgPSBjbGFzcyB0ZXh0IGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IHRleHQgPSBwYXJzZXIuYWRkUnVsZShcInRleHRcIiwgbmV3IFJ1bGUuVGV4dCh7XG5cdHBhdHRlcm46IC8oPzpcIlteXCJdKlwifCdbXiddKicpL1xufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHRleHQpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cblJ1bGUuQm9vbGVhbiA9IGNsYXNzIGJvb2xlYW4gZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgYm9vbCA9IHBhcnNlci5hZGRSdWxlKFwiYm9vbGVhblwiLCBuZXcgUnVsZS5Cb29sZWFuKHtcblx0cGF0dGVybjogLyh0cnVlfGZhbHNlfHllc3xub3xva3xjYW5jZWwpXFxiLyxcblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0Y2FzZSBcInRydWVcIjpcblx0XHRcdGNhc2UgXCJ5ZXNcIjpcblx0XHRcdGNhc2UgXCJva1wiOlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBib29sKTtcbi8vIEFkZCBib29sZWFuIHRva2VucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vIFRFU1RNRVxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwidHJ1ZVwiLCBcImZhbHNlXCIsXG5cdFwieWVzXCIsIFwibm9cIixcblx0XCJva1wiLCBcImNhbmNlbFwiLFxuKTtcblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxubGV0IGxpc3QgPSBwYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsX2xpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdGNsYXNzIGxpdGVyYWxfbGlzdCBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0XHRyZXR1cm4gc3VwZXIucmVzdWx0cy5saXN0O1xuXHRcdH1cblxuXHRcdGdldEl0ZW0oaW5kZXgpIHtcblx0XHRcdGxldCBsaXN0ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWYgKGxpc3QpIHJldHVybiBsaXN0Lm1hdGNoZWRbaW5kZXhdO1xuXHRcdH1cblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBsaXN0ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWYgKCFsaXN0KSByZXR1cm4gXCJbXVwiO1xuIFx0XHRcdHJldHVybiBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBQYXJlbnRoZXNpemVkIGV4cHJlc3Npb25cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwYXJlbnRoZXNpemVkX2V4cHJlc3Npb25cIixcblx0XCJcXFxcKHtleHByZXNzaW9ufVxcXFwpXCIsXG5cdGNsYXNzIHBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkWzFdO1xuXHRcdH1cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgZXhwcmVzc2lvbiA9IHRoaXMucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIGRvbid0IGRvdWJsZSBwYXJlbnMgaWYgbm90IG5lY2Vzc2FyeVxuXHRcdFx0aWYgKHR5cGVvZiBleHByZXNzaW9uID09PSBcInN0cmluZ1wiICYmIGV4cHJlc3Npb24uc3RhcnRzV2l0aChcIihcIikgJiYgZXhwcmVzc2lvbi5lbmRzV2l0aChcIilcIikpIHJldHVybiBleHByZXNzaW9uO1xuXHRcdFx0cmV0dXJuIGAoJHtleHByZXNzaW9ufSlgO1xuXHRcdH1cblx0fVxuKVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJcbi8vIFRPRE86IGNvbnZlcnQgdG8gbGluZS1hd2FyZSBzdHJlYW0/Pz9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRTdHJlYW0ge1xuXHQvLyBZb3UgY2FuIGNvbnN0cnVjdCB3aXRoIGEgdGV4dCBzdHJpbmcgb3IgYSBzZXQgb2YgcHJvcGVydGllcyAoaW5jbHVkaW5nIGB0ZXh0YCkuXG5cdGNvbnN0cnVjdG9yKC4uLnRleHRPclByb3BzKSB7XG5cdFx0dGV4dE9yUHJvcHMuZm9yRWFjaCgoYXJnKSA9PiB7XG5cdFx0XHRpZiAodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHR0aGlzLnRleHQgPSBhcmc7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChhcmcpIHtcblx0XHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBhcmcpO1xuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvLyBNYWtlIHN1cmUgYHRleHRgIGFuZCBgc3RhcnRJbmRleGAgYXJlIGRlZmluZWQuXG5cdFx0aWYgKCEoXCJ0ZXh0XCIgaW4gdGhpcykpIHRoaXMudGV4dCA9IFwiXCI7XG5cdFx0aWYgKCEoXCJzdGFydEluZGV4XCIgaW4gdGhpcykpIHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdH1cblxuXHQvLyBSZXR1cm4gYW4gaW1tdXRhYmxlIGNsb25lIG9mIHRoZSBzdHJlYW0uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0cmV0dXJuIG5ldyBUZXh0U3RyZWFtKHRoaXMsIHByb3BzKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2VkIHRvIG5ldyBzdGFydEluZGV4LlxuXHRhZHZhbmNlVG8oc3RhcnRJbmRleCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleCB9KTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2luZyBzdGFydEluZGV4IEJZIGBsZW5ndGhgXG5cdGFkdmFuY2VCeShsZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcblx0fVxuXG4vLyBcdC8vIFJldHVybiBjbG9uZSBvZiB0aGlzIHN0cmVhbSB3aXRoIGVuZEluZGV4IHNldCB0byBzdGFydCArIGBsZW5ndGhgXG4vLyBcdGVuZEFmdGVyKGxlbmd0aCkge1xuLy8gXHRcdHJldHVybiB0aGlzLmNsb25lKHsgZW5kSW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcbi8vIFx0fVxuXG4vL1xuLy8gIyMgTWF0Y2hpbmdcbi8vXG5cdC8vIE1hdGNoIGBwYXR0ZXJuYCBhcyByZWdleCBpbiB0aGlzIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBtYXRjaCBvciBgdW5kZWZpbmVkYC5cblx0Ly8gSWYgeW91IHdhbnQgdG8gdGVzdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmVhbSxcblx0Ly9cdG1ha2Ugc3VyZSB5b3VyIHJlZ2V4IHN0YXJ0cyB3aXRoIGBeYC5cblx0Ly8gVEVTVE1FOiB0aGlzIGxpa2VseSBicmVha3Mgd2l0aCBhIGBnYCBvbiB0aGUgcGF0dGVybj9cblx0bWF0Y2gocGF0dGVybikge1xuXHRcdGlmICghKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBUZXh0U3RyZWFtLm1hdGNoKCR7cGF0dGVybn0pOiBleHBlY3RlZCBSZWdFeHBgKTtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQubWF0Y2gocGF0dGVybikgfHwgdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGlzIHN0cmVhbSBJTkNMVURFIGEgcmVnZXggd2l0aGluIGl0P1xuXHQvLyBSZXR1cm5zIGB0cnVlYCBvciBgZmFsc2VgLlxuXHQvLyBOT1RFOiBQYXR0ZXJuIG11c3QgTk9UIHN0YXJ0IHdpdGggYF5gIGZvciB0aGlzIHRvIG1hdGNoIGluIHRoZSBtaWRkbGUgb2YgdGhlIHN0cmVhbS5cblx0dGVzdChwYXR0ZXJuKSB7XG5cdFx0cmV0dXJuIHBhdHRlcm4udGVzdCh0aGlzLmhlYWQpO1xuXHR9XG5cbi8vXG4vLyAjIyBSZWZsZWN0aW9uXG4vL1xuXHQvLyBSZXR1cm4gdGV4dCBvZiBzdHJpbmcgc3RhcnRpbmcgYXQgb3VyIGBzdGFydEluZGV4YFxuXHRnZXQgaGVhZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5yYW5nZSgpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgcmFuZ2Ugb2YgdGhlIHN0cmluZyBmcm9tIGBzdGFydEluZGV4YCB0byBgZW5kSW5kZXhgIE5PTi1pbmNsdXNpdmUuXG5cdHJhbmdlKHN0YXJ0SW5kZXggPSB0aGlzLnN0YXJ0SW5kZXgsIGVuZEluZGV4ID0gdGhpcy5lbmRJbmRleCB8fCB0aGlzLnRleHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5zdWJzdHJpbmcoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xuXHR9XG5cblx0Ly8gTGVuZ3RoIG9mIHRoZSBzdHJlYW0uXG5cdGdldCBsZW5ndGgoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5sZW5ndGg7XG5cdH1cblxuXHQvLyBBcmUgd2UgYXQgdGhlIGVuZCBvZiB0aGUgc3RyZWFtP1xuXHRnZXQgaXNFbXB0eSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGFydEluZGV4ID09PSB0aGlzLmxlbmd0aDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHRcblx0fTtcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9UZXh0U3RyZWFtLmpzIiwiaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGxvYWQgc3RhbmRhcmQgcnVsZXMgZmlsZXMgaGVyZVxuaW1wb3J0IFwiLi9jb3JlXCI7XG5pbXBvcnQgXCIuL251bWJlcnNcIjtcbmltcG9ydCBcIi4vb3BlcmF0b3JzXCI7XG5pbXBvcnQgXCIuL2lmXCI7XG5pbXBvcnQgXCIuL3N0YXRlbWVudHNcIjtcbmltcG9ydCBcIi4vdHlwZXNcIjtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9pbmRleC5qcyIsIi8vIE1lbW9pemUvZm9yZ2V0IHNlbWFudGljcy5cblxuLy8gUmV0dXJuIGEgbWVtb2l6aW5nIGdldHRlciBmdW5jdGlvbi5cbi8vIFRFU1RNRVxuZXhwb3J0IGZ1bmN0aW9uIG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0aGlzW3Byb3BlcnR5XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSBnZXR0ZXIuYXBwbHkodGhpcyk7XG5cdFx0XHRpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHQvLyBEZWZpbmUgc28gdGhhdCB3ZSBjYW4gYmUgZGVsZXRlZCBhbmQgcmUtZGVmaW5lZCwgYnV0IG5vdCBzZXQgb3IgZW51bWVyYXRlZC5cblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHByb3BlcnR5LCB7IHZhbHVlLCBjb25maWd1cmFibGU6IHRydWUgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzW3Byb3BlcnR5XTtcblx0fVxufVxuXG5cbi8vIFJldHVybiBhIG1lbW9pemUgZnVuY3Rpb24gZm9yIHVzZSBhcyBhIGdldHRlciBpbiBhIGBPYmplY3QuZGVmaW5lUHJvcGVydHkoKWBcbi8vIFRFU1RNRVxuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZU1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpIHtcblx0cmV0dXJuIHtcblx0XHRnZXQgOiBtZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKVxuXHR9XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvbWVtb2l6ZS5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImlmXCIsXG5cdFwiaWYge2V4cHJlc3Npb259ICh0aGVufDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgaWZfIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgaWYgKCR7ZXhwcmVzc2lvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0cmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSlgXG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImJhY2t3YXJkc19pZlwiLFxuXHRcIntzdGF0ZW1lbnR9IGlmIHtleHByZXNzaW9ufSAoZWxzZVBocmFzZTooZWxzZXxvdGhlcndpc2UpIHtzdGF0ZW1lbnR9KT9cIixcblx0Y2xhc3MgYmFja3dhcmRzX2lmIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCwgZWxzZVBocmFzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cdFx0XHRsZXQgZWxzZVN0YXRlbWVudCA9IGVsc2VQaHJhc2UgJiYgZWxzZVBocmFzZS5yZXN1bHRzLnN0YXRlbWVudC50b1NvdXJjZSgpO1xuXG5cdFx0XHRpZiAoZWxzZVN0YXRlbWVudCkgcmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfSBlbHNlIHsgJHtlbHNlU3RhdGVtZW50fSB9YFxuXHRcdFx0cmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImVsc2VfaWZcIixcblx0XCIoZWxzZXxvdGhlcndpc2UpIGlmIHtleHByZXNzaW9ufSAodGhlbnw6KSB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZWxzZV9pZiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0c3RhdGVtZW50ID0gc3RhdGVtZW50ID8gc3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpIDogdW5kZWZpbmVkO1xuXG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGVsc2UgaWYgKCR7ZXhwcmVzc2lvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0cmV0dXJuIGBlbHNlIGlmICgke2V4cHJlc3Npb259KWBcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZWxzZVwiLFxuXHRcIihlbHNlfG90aGVyd2lzZSkge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGVsc2VfIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0c3RhdGVtZW50ID0gc3RhdGVtZW50ID8gc3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpIDogdW5kZWZpbmVkO1xuXG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGVsc2UgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGVsc2VgXG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2lmLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWFsaW5nIHdpdGggbnVtYmVyc1xuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlXCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy8gSW5kZXggZXhwcmVzc2lvbjogbnVtZXJpYyBpbmRleCBpbiBzb21lIGxpc3QuXG4vLyBOT1RFOiBPdXIgaW5kZXhlcyBhcmUgKioxLWJhc2VkKiogYW5kIEphdmFzY3JpcHQgaXMgKiowLWJhc2VkKiouXG4vL1x0XHQgZS5nLiBgaXRlbSAxIG9mIHRoZSBhcnJheWAgID0gYGFycmF5WzBdYFxuLy9cbi8vIFRPRE86IGlmIGBpZGVudGlmaWVyYCBpcyBcIndvcmRcIiwgb3V0cHV0IGBnZXRXb3JkKClgIGV0Y1xuY2xhc3MgaW5kZXhfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbntcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCB7IGlkZW50aWZpZXIsIGluZGV4LCBleHByZXNzaW9uIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0aW5kZXggPSBpbmRleC50b1NvdXJjZShjb250ZXh0KTtcblxuXHRcdC8vIElmIHdlIGdvdCBhIHBvc2l0aXZlIG51bWJlciBsaXRlcmFsLCBjb21wZW5zYXRlIGZvciBKUyAwLWJhc2VkIGFycmF5cyBub3cuXG5cdFx0aWYgKHR5cGVvZiBpbmRleCA9PT0gXCJudW1iZXJcIiAmJiBpbmRleCA+IDApIHtcblx0XHRcdHJldHVybiBgJHtleHByZXNzaW9ufVske2luZGV4IC0gMX1dYDtcblx0XHR9XG5cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7aW5kZXh9KWA7XG5cbi8vIFRoaXMgaXMgc2FmZXIsIGJ1dCB1c2luZyB0aGUgYWJvdmUgZm9yIGRlbW8gcHVycG9zZXNcbi8vXHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke2luZGV4fSlgO1xuXHR9XG59XG5cbi8vIE51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmc6XG4vL1x0LSBgaXRlbSAxIG9mIC4uLmBcbi8vXHQtIGBpdGVtICMyIG9mIC4uLmBcbi8vIE5PVEU6IHRoZXNlIGluZGljZXMgYXJlIE9ORSBiYXNlZCwgTk9UIHplcm8gYmFzZWQgYXMgaXMgSmF2YXNjcmlwdC5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFwiaW5kZXhfZXhwcmVzc2lvblwiLCBcIntpZGVudGlmaWVyfSAoIyk/e2luZGV4OmV4cHJlc3Npb259IG9mIHtleHByZXNzaW9ufVwiLCBpbmRleF9leHByZXNzaW9uKTtcblxuY2xhc3Mgb3JkaW5hbCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7fVxucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZmlyc3RcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gMSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNlY29uZFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAyIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwidGhpcmRcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gMyB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImZvdXJ0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA0IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZmlmdGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNpeHRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDYgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJzZXZlbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDcgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJlaWdodGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gOCB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcIm5pbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDkgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJ0ZW50aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxMCB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInBlbnVsdGltYXRlXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IC0yIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZmluYWxcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJsYXN0XCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IC0xIH0pO1xuXG4vLyBUT0RPOiBzaXh0eS1maWZ0aCwgdHdvIGh1bmRyZWQgZm9ydHkgbmludGguLi5cblxuLy8gQWx0ZXJuYXRpdmUgZm9ybSBmb3IgbnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZy5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFwiaW5kZXhfZXhwcmVzc2lvblwiLCBcInRoZSB7aW5kZXg6b3JkaW5hbH0ge2lkZW50aWZpZXJ9IG9mIHtleHByZXNzaW9ufVwiLCBpbmRleF9leHByZXNzaW9uKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL251bWJlcnMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGluZml4IGFuZCBwcmVmaXggb3BlcmF0b3JzLlxuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIyMgSW5maXggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+IHtyaHN9YCwgZWc6IGBhIGlzIDFgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHR3byBhcmd1bWVudHMgKGBsaHNgIGFuZCBgcmhzYCkgaW50byBvdXRwdXQuXG5cbi8vIE5PVEU6IGBwcmVjZWRlbmNlYCBudW1iZXJzIGNvbWUgZnJvbSBKYXZhc2NyaXB0IGVxdWl2YWxlbnRzXG4vL1x0XHQgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvT3BlcmF0b3JzL09wZXJhdG9yX1ByZWNlZGVuY2VcblxuY2xhc3MgaW5maXhfb3BlcmF0b3IgZXh0ZW5kcyBSdWxlLkFsdGVybmF0aXZlcyB7XG5cbi8vIE5PVEU6IEZvciB0aGUgb3BlcmF0b3JzIHRoZW1zZWx2ZXMsIHdlIHJlYWxseSB3YW50IHRvIGp1c3QgdXNlIGxvbmdlc3QgbWF0Y2guXG4vLyBcdFx0IFdlIHdhbnQgdG8gcHVzaCB0aGUgcHJlY2VkZW5jZSB1cCB0byB0aGUgZXhwcmVzc2lvbiBhbmQgZXZhbHVhdGUgZGlmZmVyZW50IGV4cHJlc3Npb25zIGJhc2VkIG9uIHRoYXQuXG4vLyBcdC8vIEZpbmQgYmVzdCBtYXRjaCBhY2NvcmRpbmcgdG8gb3BlcmF0b3IgcHJlY2VkZW5jZSBhcyBkZWZpbmVkIGJlbG93LlxuLy8gXHRnZXRCZXN0TWF0Y2gobWF0Y2hlcykge1xuLy8gXHRcdGNvbnNvbGUud2FybihcIkdCTVwiLCBtYXRjaGVzLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5wcmVjZWRlbmNlKSwgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gubWF0Y2hlZFRleHQpKTtcbi8vIFx0XHRyZXR1cm4gbWF0Y2hlcy5yZWR1Y2UoZnVuY3Rpb24gKGJlc3QsIG5leHQpIHtcbi8vIFx0XHRcdC8vIHRha2UgaGlnaGVzdCBwcmVjZWRlbmNlIG1hdGNoIGZpcnN0XG4vLyBcdFx0XHRpZiAobmV4dC5wcmVjZWRlbmNlID4gYmVzdC5wcmVjZWRlbmNlKSByZXR1cm4gbmV4dDtcbi8vIFx0XHRcdC8vIHRha2UgbG9uZ2VzdCBtYXRjaCBpZiBzYW1lIHByZWNlZGVuY2Vcbi8vIFx0XHRcdGlmIChuZXh0LnByZWNlZGVuY2UgPT09IGJlc3QucHJlY2VkZW5jZSkge1xuLy8gXHRcdFx0XHRpZiAobmV4dC5lbmRJbmRleCA+IGJlc3QuZW5kSW5kZXgpIHJldHVybiBuZXh0O1xuLy8gXHRcdFx0fVxuLy8gXHRcdFx0cmV0dXJuIGJlc3Q7XG4vLyBcdFx0fSwgbWF0Y2hlc1swXSk7XG4vLyBcdH1cbn1cblxucGFyc2VyLmFkZFJ1bGUoXCJpbmZpeF9vcGVyYXRvclwiLCBuZXcgaW5maXhfb3BlcmF0b3IoKSk7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJhbmRcIixcblx0Y2xhc3MgYW5kIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDY7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gJiYgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcIm9yXCIsXG5cdGNsYXNzIG9yIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDU7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gfHwgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzXCIsXG5cdCBjbGFzcyBpcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdFwiLFxuXHQgY2xhc3MgaXNfbm90IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBleGFjdGx5XCIsXG5cdGNsYXNzIGlzX2V4YWN0bHkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT09ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGV4YWN0bHlcIixcblx0IGNsYXNzICBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPT0gJHtifSlgIH0gfVxuKTtcblxuLy9UT0RPOiBgc3BlbGwuaXNPZlR5cGUodGhpbmcsIHR5cGUpYFxuLy9UT0RPOiBgaXMgc2FtZSB0eXBlIGFzYCA/XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgYVwiLFxuXHQgY2xhc3MgaXNfYSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgYW5cIixcblx0IGNsYXNzIGlzX2FuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBhXCIsXG5cdCBjbGFzcyBpc19ub3RfYSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBhblwiLFxuXHQgY2xhc3MgaXNfbm90X2FuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5cbi8vVE9ETzogYHNwZWxsLmNvbnRhaW5zKGNvbGxlY3Rpb24sIHRoaW5nKWBcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBpblwiLFxuXHQgY2xhc3MgaXNfaW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG9uZSBvZlwiLFxuXHQgY2xhc3MgaXNfb25lX29mIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBpblwiLFxuXHQgY2xhc3MgaXNfbm90X2luIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IG9uZSBvZlwiLFxuXHQgY2xhc3MgaXNfbm90X29uZV9vZiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5cblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImluY2x1ZGVzXCIsXG5cdCBjbGFzcyBpbmNsdWRlcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiY29udGFpbnNcIixcblx0IGNsYXNzIGNvbnRhaW5zIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImRvZXMgbm90IGluY2x1ZGVcIixcblx0IGNsYXNzIGRvZXNfbm90X2luY2x1ZGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkb2VzIG5vdCBjb250YWluXCIsXG5cdCBjbGFzcyBkb2VzX25vdF9jb250YWluIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPlwiLFxuXHQgY2xhc3MgZ3QgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBncmVhdGVyIHRoYW5cIixcblx0IGNsYXNzIGlzX2dyZWF0ZXJfdGhhbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPj1cIixcblx0IGNsYXNzIGd0ZSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG9cIixcblx0IGNsYXNzIGlzX2d0ZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIjxcIixcblx0IGNsYXNzIGx0IGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbGVzcyB0aGFuXCIsXG5cdCBjbGFzcyBpc19sZXNzX3RoYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIjw9XCIsXG5cdCBjbGFzcyBsdGUgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvXCIsXG5cdCBjbGFzcyBpc19sdGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfSB9XG4pO1xuXG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIlxcXFwrXCIsXG5cdCBjbGFzcyBwbHVzIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcInBsdXNcIixcblx0IGNsYXNzIHBsdXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCItXCIsXG5cdCBjbGFzcyBtaW51cyBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAtICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJtaW51c1wiLFxuXHQgY2xhc3MgbWludXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJcXFxcKlwiLFxuXHQgY2xhc3MgdGltZXMgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKiAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwidGltZXNcIixcblx0IGNsYXNzIHRpbWVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiL1wiLFxuXHQgY2xhc3MgZGl2aWRlZF9ieSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkaXZpZGVkIGJ5XCIsXG5cdCBjbGFzcyBkaXZpZGVkX2J5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH0gfVxuKTtcblxuLy9UT0RPOiAgYCs9YCBldGM/ICBvdGhlciBtYXRoIGZ1bmN0aW9ucz9cblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwiaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntsaHM6ZXhwcmVzc2lvbn0ge29wZXJhdG9yOmluZml4X29wZXJhdG9yfSB7cmhzOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGluZml4X29wZXJhdG9yX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdC8vIFdlIENBTk5PVCBtYXRjaCBpZiBgaW5maXhfb3BlcmF0b3JgIGlzbid0IGZvdW5kIGluIHRoZSBleHByZXNzaW9uLlxuXHRcdHRlc3RSdWxlID0gXCJpbmZpeF9vcGVyYXRvclwiO1xuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGhzLCByaHMsIG9wZXJhdG9yIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gb3BlcmF0b3IudG9KUyhsaHMudG9Tb3VyY2UoY29udGV4dCksIHJocy50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyMjIFBvc3RpZnggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+YCwgZS5nLiBgYSBpcyBkZWZpbmVkYFxuLy8gTk9URTogYG9wZXJhdG9yLnRvSlNgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyBhcmd1bWVudCAoYGxoc2ApIGludG8gSlMgb3V0cHV0LlxuXG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBkZWZpbmVkXCIsXG5cdGNsYXNzIGlzX2RlZmluZWQgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSAhPT0gJ3VuZGVmaW5lZCcpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgZGVmaW5lZFwiLFxuXHRjbGFzcyBpc19ub3RfZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIHVuZGVmaW5lZFwiLFxuXHRjbGFzcyBpc191bmRlZmluZWQgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9IH1cbik7XG5cblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBlbXB0eVwiLFxuXHRjbGFzcyBpc19lbXB0eSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGVtcHR5XCIsXG5cdGNsYXNzIGlzX25vdF9lbXB0eSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAhc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicG9zdGZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2V4cHJlc3Npb259IHtvcGVyYXRvcjpwb3N0Zml4X29wZXJhdG9yfVwiLFxuXHRjbGFzcyBwb3N0Zml4X29wZXJhdG9yX2V4cHJlc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Ly8gV2UgQ0FOTk9UIG1hdGNoIGlmIGBwb3N0Zml4X29wZXJhdG9yYCBpc24ndCBmb3VuZCBpbiB0aGUgZXhwcmVzc2lvbi5cblx0XHR0ZXN0UnVsZSA9IFwicG9zdGZpeF9vcGVyYXRvclwiO1xuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vXG4vL1x0IyMgUmV0dXJuc1xuLy9cblxuLy8gUmV0dXJuIGEgdmFsdWVcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwicmV0dXJuX3N0YXRlbWVudFwiLCBcInJldHVybiB7ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcmV0dXJuX3N0YXRlbWVudCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gYHJldHVybiAke2V4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCl9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vL1xuLy9cdCMjIEFzc2lnbm1lbnRcbi8vXG5jbGFzcyBhc3NpZ25tZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnR7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgeyB0aGluZywgdmFsdWUgfSA9IHRoaXMucmVzdWx0cztcblx0XHRpZiAodGhpbmcgaW5zdGFuY2VvZiBSdWxlLklkZW50aWZpZXIpIHtcblx0XHRcdC8vIFRPRE86IGRlY2xhcmUgaWRlbnRpZmllciBpZiBub3QgaW4gc2NvcGUsIGV0Y1xuXHRcdH1cblxuXHRcdHJldHVybiBgJHt0aGluZy50b1NvdXJjZShjb250ZXh0KX0gPSAke3ZhbHVlLnRvU291cmNlKGNvbnRleHQpfWA7XG5cdH1cbn1cblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsIFwie3RoaW5nOmV4cHJlc3Npb259ID0ge3ZhbHVlOmV4cHJlc3Npb259XCIsIGFzc2lnbm1lbnQpO1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsIFwic2V0IHt0aGluZzpleHByZXNzaW9ufSB0byB7dmFsdWU6ZXhwcmVzc2lvbn1cIiwgYXNzaWdubWVudCk7XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJwdXQge3ZhbHVlOmV4cHJlc3Npb259IGludG8ge3RoaW5nOmV4cHJlc3Npb259XCIsIGFzc2lnbm1lbnQpO1xuXG5cbi8vXG4vL1x0IyMgVXNlciBpbnRlcmFjdGlvblxuLy9cblxuLy8gQWxlcnQgYSBtZXNzYWdlLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhbGVydFwiLCBcImFsZXJ0IHttZXNzYWdlOmV4cHJlc3Npb259IChidXR0b25DbGF1c2U6d2l0aCB7dGV4dH0pP1wiLFxuXHRjbGFzcyBhbGVydCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBidXR0b25DbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGJ1dHRvbk5hbWUgPSBidXR0b25DbGF1c2UgPyBidXR0b25DbGF1c2UucmVzdWx0cy50ZXh0LnRvU291cmNlKGNvbnRleHQpIDogJ1wiT0tcIic7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLmFsZXJ0KCR7bWVzc2FnZX0sICR7YnV0dG9uTmFtZX0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFdhcm5pbmcgbWVzc2FnZSAtLSBsaWtlIGFsZXJ0IGJ1dCBmYW5jaWVyLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJ3YXJuXCIsIFwid2FybiB7ZXhwcmVzc2lvbjpleHByZXNzaW9ufSAoYnV0dG9uQ2xhdXNlOndpdGgge3RleHR9KT9cIixcblx0Y2xhc3Mgd2FybiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBidXR0b25DbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGJ1dHRvbk5hbWUgPSBidXR0b25DbGF1c2UgPyBidXR0b25DbGF1c2UucmVzdWx0cy50ZXh0LnRvU291cmNlKGNvbnRleHQpIDogJ1wiT0tcIic7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLndhcm4oJHttZXNzYWdlfSwgJHtidXR0b25OYW1lfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBDb25maXJtIG1lc3NhZ2UgLS0gcHJlc2VudCBhIHF1ZXN0aW9uIHdpdGggdHdvIGFuc3dlcnMuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImNvbmZpcm1cIiwgXCJjb25maXJtIHttZXNzYWdlOmV4cHJlc3Npb259IChidXR0b25DbGF1c2U6d2l0aCB7b2tCdXR0b246dGV4dH0gKGNhbmNlbENsYXVzZTogKGFuZHxvcikge2NhbmNlbEJ1dHRvbjp0ZXh0fSk/ICk/XCIsXG5cdGNsYXNzIGNvbmZpcm0gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgYnV0dG9uQ2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBva0J1dHRvbiA9ICdcIk9LXCInLCBjYW5jZWxCdXR0b24gPSAnXCJDYW5jZWxcIic7XG5cblx0XHRcdGlmIChidXR0b25DbGF1c2UpIHtcblx0XHRcdFx0b2tCdXR0b24gPSBidXR0b25DbGF1c2UucmVzdWx0cy5va0J1dHRvbi5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0XHRsZXQgY2FuY2VsQ2xhdXNlID0gYnV0dG9uQ2xhdXNlLnJlc3VsdHMuY2FuY2VsQ2xhdXNlO1xuXHRcdFx0XHRpZiAoY2FuY2VsQ2xhdXNlKSBjYW5jZWxCdXR0b24gPSBjYW5jZWxDbGF1c2UucmVzdWx0cy5jYW5jZWxCdXR0b24ucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwuY29uZmlybSgke21lc3NhZ2V9LCAke29rQnV0dG9ufSwgJHtjYW5jZWxCdXR0b259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCJpbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuaW1wb3J0IFwiLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL3J1bGVzL2luZGV4LmpzXCI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHR3aW5kb3cuVGV4dFN0cmVhbSA9IFRleHRTdHJlYW07XG5cdHdpbmRvdy5QYXJzZXIgPSBQYXJzZXI7XG5cdHdpbmRvdy5SdWxlID0gUnVsZTtcblx0d2luZG93LnBhcnNlciA9IHBhcnNlcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuXHRUZXh0U3RyZWFtLCBQYXJzZXIsIFJ1bGUsIHBhcnNlclxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvaW5kZXguanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlZmluaW5nIGNsYXNzZXMgKGtub3duIGFzIGB0eXBlc2ApXG4vL1xuaW1wb3J0IGdsb2JhbCBmcm9tIFwiLi4vZ2xvYmFsXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy8gREVBRCBTSU1QTEUgUExVUkFMSVpFUi4uLiBSRUFMTFkgTk9UIFZFUlkgR09PRFxuZnVuY3Rpb24gcGx1cmFsaXplKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQgKyBcInNcIjtcbn1cblxuXG4vL01PVkUgVE8gYG9iamVjdHNgP1xuLy8gUHJvcGVydGllcyBjbGF1c2U6IGNyZWF0ZXMgYW4gb2JqZWN0IHdpdGggb25lIG9yIG1vcmUgcHJvcGVydHkgdmFsdWVzLlxuLy9cdGBmb28gPSAxLCBiYXIgPSAyYFxuLy9UT0RPOiB3b3VsZCBsaWtlIHRvIHVzZSBgYW5kYCBidXQgdGhhdCB3aWxsIGJhcmYgb24gZXhwcmVzc2lvbnMuLi5cbi8vVE9ETzogaG93IHRvIGRvIHByb3BlcnRpZXMgb24gbXVsdGlwbGUgbGluZXM/XG5wYXJzZXIuYWRkTGlzdChcblx0XCJvYmplY3RfbGl0ZXJhbF9wcm9wZXJ0aWVzXCIsXG5cdFwiWyh7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn0pICxdXCIsXG5cdGNsYXNzIG9iamVjdF9saXRlcmFsX3Byb3BlcnRpZXMgZXh0ZW5kcyBSdWxlLkxpc3Qge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBwcm9wcyA9IHRoaXMucmVzdWx0cy5tYXRjaGVkLm1hcChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGV4cHJlc3Npb24gfSA9IHByb3AucmVzdWx0cztcblx0XHRcdFx0XHRsZXQga2V5ID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0XHRsZXQgdmFsdWUgPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0XHRcdHJldHVybiBgXCIke2tleX1cIjogJHt2YWx1ZX1gXG5cdFx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGB7ICR7cHJvcHMuam9pbihcIiwgXCIpfSB9YDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIGBuZXdgXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhbGwgdHlwZXMgdGFrZSBhbiBvYmplY3Qgb2YgcHJvcGVydGllcz8/Pz9cbnBhcnNlci5hZGRTZXF1ZW5jZShcblx0XCJuZXdfdGhpbmdcIixcblx0XCIoY3JlYXRlfG5ldykge3R5cGV9IChwcm9wc19jbGF1c2U6d2l0aCB7cHJvcHM6b2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc30pP1wiLFxuXHRjbGFzcyBuZXdfdGhpbmcgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBwcm9wc19jbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHR5cGUgPSB0eXBlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHByb3BzID0gcHJvcHNfY2xhdXNlICYmIHByb3BzX2NsYXVzZS5yZXN1bHRzLnByb3BzLnRvU291cmNlKGNvbnRleHQpIHx8IFwiXCI7XG5cblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igb2JqZWN0LCB3aGljaCB3ZSdsbCBjcmVhdGUgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbC5cblx0XHRcdGlmICh0eXBlID09PSBcIk9iamVjdFwiKSB7XG5cdFx0XHRcdGlmICghcHJvcHNfY2xhdXNlKSByZXR1cm4gXCJ7fVwiO1xuXHRcdFx0XHRyZXR1cm4gYCR7cHJvcHN9YDtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGBuZXcgJHt0eXBlfSgke3Byb3BzfSlgO1xuXHRcdH1cblx0fVxuKTtcbi8vIFRoaXMgd29ya3MgYXMgYW4gZXhwcmVzc2lvbiBPUiBhIHN0YXRlbWVudC5cbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMubmV3X3RoaW5nKTtcbnBhcnNlci5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHBhcnNlci5ydWxlcy5uZXdfdGhpbmcpO1xuXG5cblxuXG4vLyBEZWZpbmUgY2xhc3MuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlZmluZV90eXBlXCIsXG5cdFwiZGVmaW5lIHR5cGUge3R5cGV9IChleHRlbmRzX2NsYXVzZTphcyAoYXxhbikge3N1cGVyVHlwZTp0eXBlfSk/XCIsXG5cdGNsYXNzIGRlZmluZV90eXBlIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHR5cGUsIGV4dGVuZHNfY2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHR0eXBlID0gdHlwZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBzdXBlclR5cGUgPSBleHRlbmRzX2NsYXVzZSAmJiBleHRlbmRzX2NsYXVzZS5yZXN1bHRzLnN1cGVyVHlwZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGlmIChzdXBlclR5cGUpIHtcblx0XHRcdFx0cmV0dXJuIGBjbGFzcyAke3R5cGV9IGV4dGVuZHMgJHtzdXBlclR5cGV9YDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBgY2xhc3MgJHt0eXBlfWA7XG5cblx0XHR9XG5cdH1cbik7XG5cbi8vVE9ETzogY29uc3RydWN0b3JcblxuXG5cbi8vTU9WRSBUTyBgZnVuY3Rpb25zYD9cbi8vIEFyZ3VtZW50cyBjbGF1c2UgZm9yIG1ldGhvZHNcbi8vXHRgd2l0aCBmb29gIG9yIGB3aXRoIGZvbyBhbmQgYmFyIGFuZCBiYXpgXG4vL1RPRE86IHtpZGVudGlmaWVyfSA9IHtleHByZXNzaW9ufVx0PT4gcmVxdWlyZXMgYCxgIGluc3RlYWQgb2YgYGFuZGBcbi8vVE9ETzogYHdpdGggZm9vIGFzIFR5cGVgXG4vL1RPRE86XHRgd2l0aCBmb28uLi5gIGZvciBzcGxhdD9cbnBhcnNlci5hZGRTZXF1ZW5jZShcblx0XCJhcmdzX2NsYXVzZVwiLFxuXHRcIndpdGggW2FyZ3M6e2lkZW50aWZpZXJ9ICxdXCIsXG5cdGNsYXNzIGFyZ3NfY2xhdXNlIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7XG5cdFx0Ly8gUmV0dXJuIGp1c3QgdGhlIGFyZ3VtZW50cyBhcyB0aGUgcmVzdWx0c1xuXHRcdGdldCByZXN1bHRzKCkge1xuXHRcdFx0cmV0dXJuIHN1cGVyLnJlc3VsdHMuYXJncztcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4ganVzdCB0aGUgYXJndW1lbnQgbmFtZXMgYXMgYW4gYXJyYXlcblx0XHRnZXQgYXJnTmFtZXMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzLm1hdGNoZWQubWFwKGFyZyA9PiBhcmcubWF0Y2hlZCk7XG5cdFx0fVxuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuYXJnTmFtZXMuam9pbihcIiwgXCIpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBEZWNsYXJlIGluc3RhbmNlIG1ldGhvZCBvciBub3JtYWwgZnVuY3Rpb24uXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfbWV0aG9kXCIsXG5cdFwiKHRvfG9uKSB7aWRlbnRpZmllcn0ge2FyZ3NfY2xhdXNlfT8gKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGRlY2xhcmVfbWV0aG9kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3NfY2xhdXNlLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblxuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgYXJncyA9IChhcmdzX2NsYXVzZSAmJiBhcmdzX2NsYXVzZS50b1NvdXJjZShjb250ZXh0KSkgfHwgXCJcIjtcblx0XHRcdHN0YXRlbWVudCA9IChzdGF0ZW1lbnQgPyBgIHsgJHtzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCl9IH1gIDogXCJcIik7XG5cblx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KSR7c3RhdGVtZW50fWBcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gRGVjbGFyZSBcImFjdGlvblwiLCB3aGljaCBjYW4gYmUgY2FsbGVkIGdsb2JhbGx5IGFuZCBhZmZlY3RzIHRoZSBwYXJzZXIuXG4vLyBUT0RPOiBgd2l0aGAgY2xhdXNlICh3aWxsIGNvbmZsaWN0IHdpdGggYHdvcmRgKVxuLy8gVE9ETzogaW5zdGFsbCBpbiBwYXJzZXIgc29tZWhvd1xuLy8gVE9ETzogY3JlYXRlIGluc3RhbmNlIGZ1bmN0aW9uPyAgb3IgbWF5YmUgd2UgZG9uJ3QgbmVlZCBpdDpcbi8vXHRcdFx0YGFjdGlvbiB0dXJuIENhcmQgb3ZlcmAgZm9yIGFuIGluc3RhbmNlIGlzIGp1c3QgYHR1cm4gbWUgb3ZlcmBcbi8vXHRcdFx0YGFjdGlvbiBhZGQgY2FyZCB0byBkZWNrYCA9PiBgYWRkIG1lIHRvIGRlY2tgXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX2FjdGlvblwiLFxuXHRcImFjdGlvbiAod29yZF9jbGF1c2U6e3dvcmR9fHt0eXBlfSkrIChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBkZWNsYXJlX2FjdGlvbiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHdvcmRfY2xhdXNlLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGxldCB3b3JkcyA9IHdvcmRfY2xhdXNlLm1hdGNoZWQubWFwKCB3b3JkID0+IHdvcmQudG9Tb3VyY2UoY29udGV4dCkgKTtcblx0XHRcdC8vIGlmIHRoZXJlJ3Mgb25seSBvbmUgd29yZCwgaXQgY2FuJ3QgYmUgYSBibGFja2xpc3RlZCBpZGVudGlmaWVyIG9yIGEgdHlwZVxuXHRcdFx0aWYgKHdvcmRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHR2YXIgd29yZCA9IHdvcmRzWzBdO1xuXHRcdFx0XHRpZiAod29yZF9jbGF1c2UubWF0Y2hlZCBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSB0eXBlczogJHt3b3JkfWApO1xuXHRcdFx0XHR9XG5cbi8vIEhBQ0s6IGBnbG9iYWwucGFyc2VyYCBpcyBhIGhhY2sgaGVyZSBmb3IgY29udmVuaWVuY2UgaW4gdGVzdGluZy4uLlxuXHRcdFx0XHRsZXQgcGFyc2VyID0gY29udGV4dCA/IGNvbnRleHQucGFyc2VyIDogZ2xvYmFsLnBhcnNlcjtcblx0XHRcdFx0aWYgKHBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmJsYWNrbGlzdFt3b3JkXSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSBibGFja2xpc3RlZCBpZGVudGlmaWVyc1wiOiAke3dvcmR9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBhcmd1bWVudHMgYW5kL29yIHR5cGVzXG5cdFx0XHR2YXIgYXJncyA9IFtdO1xuXHRcdFx0dmFyIHR5cGVzID0gW107XG5cdFx0XHQvLyBpZiBhbnkgb2YgdGhlIHdvcmRzIGFyZSB0eXBlcyAoY2FwaXRhbCBsZXR0ZXIpIG1ha2UgdGhhdCBhbiBhcmd1bWVudCBvZiB0aGUgc2FtZSBuYW1lLlxuXHRcdFx0d29yZF9jbGF1c2UubWF0Y2hlZC5tYXAoIChpdGVtLCBpbmRleCkgPT4ge1xuXHRcdFx0XHRpZiAoaXRlbSBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdGxldCB0eXBlID0gd29yZHNbaW5kZXhdO1xuXHRcdFx0XHRcdGxldCB3b3JkID0gdHlwZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdHR5cGVzLnB1c2goW3R5cGUsIHdvcmRdKTtcblx0XHRcdFx0XHR3b3Jkc1tpbmRleF0gPSB3b3JkO1xuXHRcdFx0XHRcdGFyZ3MucHVzaCh3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQvLyBnZXQgc3RhdGljIG1ldGhvZCBuYW1lIGFuZCBhcmd1bWVudHMgZm9yIG91dHB1dFxuXHRcdFx0bGV0IG1ldGhvZE5hbWUgPSB3b3Jkcy5qb2luKFwiX1wiKTtcblx0XHRcdGFyZ3MgPSBhcmdzLmpvaW4oXCIsIFwiKTtcblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpZiB0aGVyZSBhcmUgYW55IGNvbmRpdGlvbnMgb24gdGhlIGFib3ZlXG5cdFx0XHRsZXQgY29uZGl0aW9ucyA9IHR5cGVzLm1hcCggKFt0eXBlLCB3b3JkXSkgPT4ge1xuXHRcdFx0XHRyZXR1cm4gYFxcdGlmICghc3BlbGwuaXNBKCR7d29yZH0sICR7dHlwZX0pKSByZXR1cm4gdW5kZWZpbmVkYDtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBnZXQgc3RhdGVtZW50cywgYWRkaW5nIGNvbmRpdGlvbnMgaWYgbmVjZXNzYXJ5XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiBcIlwiO1xuXHRcdFx0bGV0IHN0YXRlbWVudHMgPSBcIlwiO1xuXHRcdFx0aWYgKHN0YXRlbWVudCkge1xuXHRcdFx0XHRzdGF0ZW1lbnRzID0gW107XG5cdFx0XHRcdGlmIChjb25kaXRpb25zLmxlbmd0aCkgc3RhdGVtZW50cyA9IHN0YXRlbWVudHMuY29uY2F0KGNvbmRpdGlvbnMpO1xuXHRcdFx0XHRpZiAoc3RhdGVtZW50KSBzdGF0ZW1lbnRzLnB1c2goXCJcXHRcIiArIHN0YXRlbWVudCk7XG5cdFx0XHRcdHN0YXRlbWVudHMgPSBgIHtcXG4ke3N0YXRlbWVudHMuam9pbihcIlxcblwiKX1cXG4gfVxcbmA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChjb25kaXRpb25zLmxlbmd0aCkge1xuXHRcdFx0XHRzdGF0ZW1lbnRzID0gYCB7XFxuJHtjb25kaXRpb25zLmpvaW4oXCJcXG5cIil9YDtcblx0XHRcdH1cbi8vZGVidWdnZXI7XG5cdFx0XHQvLyBDcmVhdGUgYXMgYSBTVEFUSUMgZnVuY3Rpb25cblx0Ly9UT0RPOiBjcmVhdGUgYXMgYW4gaW5zdGFuY2UgZnVuY3Rpb24gd2UgY2FuIGNhbGwgb24gb3Vyc2VsZiFcblx0XHRcdHJldHVybiBgc3RhdGljICR7bWV0aG9kTmFtZX0oJHthcmdzfSkke3N0YXRlbWVudHN9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gR2V0dGVyIGVpdGhlciB3aXRoIG9yIHdpdGhvdXQgYXJndW1lbnRzLlxuLy8gSWYgeW91IHNwZWNpZnkgYXJndW1lbnRzLCB5aWVsZHMgYSBub3JtYWwgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhIHZhbHVlLlxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJnZXR0ZXJcIixcblx0XCJnZXQge2lkZW50aWZpZXJ9IHthcmdzX2NsYXVzZX0/IChcXFxcOik/IHtleHByZXNzaW9ufT9cIixcblx0Y2xhc3MgZ2V0dGVyIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3NfY2xhdXNlLCBleHByZXNzaW9uIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBhcmdzID0gYXJnc19jbGF1c2UgJiYgYXJnc19jbGF1c2UudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRleHByZXNzaW9uID0gKGV4cHJlc3Npb24gPyBgIHsgcmV0dXJuICgke2V4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCl9KSB9YCA6IFwiXCIpO1xuXG5cdFx0XHRpZiAoYXJncyAmJiBleHByZXNzaW9uKSB7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KSR7ZXhwcmVzc2lvbn1gO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoYXJncykge1xuXHRcdFx0XHRyZXR1cm4gYCR7aWRlbnRpZmllcn0oJHthcmdzfSlgO1xuXG5cdFx0XHR9IGVsc2UgaWYgKGV4cHJlc3Npb24pIHtcblx0XHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSgpJHtleHByZXNzaW9ufWA7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gYGdldCAke2lkZW50aWZpZXJ9KClgO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFNldHRlci5cbi8vIENvbXBsYWlucyBpZiB5b3Ugc3BlY2lmeSBtb3JlIHRoYW4gb25lIGFyZ3VtZW50LlxuLy8gSWYgeW91IGRvbid0IHBhc3MgYW4gZXhwbGljaXQgYXJndW1lbnQsIHdlJ2xsIGFzc3VtZSBpdCdzIHRoZSBzYW1lIGFzIHRoZSBpZGVudGlmaWVyLlxuLy8gZWc7XHRgc2V0IGNvbG9yOiBzZXQgdGhlIGNvbG9yIG9mIG15IHRleHQgdG8gY29sb3JgXG4vL1xuLy8gVE9ETzogaW50ZXJuYWwgZ2V0dGVyL3NldHRlciBzZW1hbnRpY3MgYWxhIG9iamVjdGl2ZSBDXG4vL1x0XHRcdGBzZXQgY29sb3I6IGlmIGNvbG9yIGlzIGluIFtcInJlZFwiLCBcImJsdWVcIl0gdGhlbiBzZXQgbXkgY29sb3IgdG8gY29sb3JgXG4vL1x0XHQgPT4gYG15IGNvbG9yYCB3aXRoaW4gc2V0dGVyIHNob3VsZCBhdXRvbWF0aWNhbGx5IHRyYW5zbGF0ZSB0byBgdGhpcy5fY29sb3JgID8/P1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJzZXR0ZXJcIixcblx0XCJzZXQge2lkZW50aWZpZXJ9IHthcmdzX2NsYXVzZX0/IChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBnZXR0ZXIgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJnc19jbGF1c2UsIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cblx0XHRcdC8vIEFzc3VtZSB3ZSB3YW50IHRoZSBzYW1lIG5hbWUgYXMgdGhlIGlkZW50aWZpZXIgaWYgbm8gYXJndW1lbnNcblx0XHRcdGxldCBhcmdzID0gKGFyZ3NfY2xhdXNlICYmIGFyZ3NfY2xhdXNlLmFyZ05hbWVzKSB8fCBbaWRlbnRpZmllcl07XG5cdFx0XHQvLyBDb21wbGFpbiBpZiBtb3JlIHRoYW4gb25lIGFyZ3VtZW50XG5cdFx0XHRpZiAoYXJncy5sZW5ndGggPiAxKVxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJwYXJzZSgnc2V0dGVyJyk6IG9ubHkgb25lIGFyZ3VtZW50IGFsbG93ZWQgaW4gc2V0dGVyOiAgXCIsIHRoaXMubWF0Y2hlZFRleHQpO1xuXG5cdFx0XHRzdGF0ZW1lbnQgPSAoc3RhdGVtZW50ID8gYCB7ICR7c3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpfSB9YCA6IFwiXCIpO1xuXG5cdFx0XHRyZXR1cm4gYHNldCAke2lkZW50aWZpZXJ9KCR7YXJnc1swXX0pJHtzdGF0ZW1lbnR9YDtcblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vXG4vL1x0ZGVjbGFyZSBwcm9wZXJ0aWVzXG4vL1xuXG4vL1RPRE86IGFub3RoZXIgbmFtZSBmb3IgYGNvbnN0YW50YCA/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlcIixcblx0XCIoc2NvcGU6cHJvcGVydHl8Y29uc3RhbnR8c2hhcmVkIHByb3BlcnR5KSB7aWRlbnRpZmllcn0gKHZhbHVlX2NsYXVzZTo9IHtleHByZXNzaW9ufSk/XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHkgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc2NvcGUsIGlkZW50aWZpZXIsIHZhbHVlX2NsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0c2NvcGUgPSBzY29wZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHZhbHVlID0gdmFsdWVfY2xhdXNlICYmIFwiID0gXCIgKyB2YWx1ZV9jbGF1c2UucmVzdWx0cy5leHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpIHx8IFwiXCI7XG5cblx0XHRcdGxldCBkZWNsYXJhdGlvbiA9IGAke2lkZW50aWZpZXJ9JHt2YWx1ZX1gO1xuXHRcdFx0c3dpdGNoIChzY29wZSkge1xuXHRcdFx0XHRjYXNlIFwiY29uc3RhbnRcIjpcblx0XHRcdFx0XHRpZiAoIXZhbHVlKSBjb25zb2xlLndhcm4oXCJwYXJzZSgnZGVjbGFyZV9wcm9wZXJ0eScpOiBjb25zdGFudCBwcm9wZXJ0aWVzIG11c3QgZGVjbGFyZSBhIHZhbHVlOiAgXCIsIHRoaXMubWF0Y2hlZFRleHQpO1xuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHtkZWNsYXJhdGlvbn1gO1xuXG5cdFx0XHRcdGNhc2UgXCJzaGFyZWQgcHJvcGVydHlcIjpcblx0XHRcdFx0XHRyZXR1cm4gYEBwcm90b1xcbiR7ZGVjbGFyYXRpb259YDtcblxuXHRcdFx0XHRjYXNlIFwicHJvcGVydHlcIjpcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRyZXR1cm4gZGVjbGFyYXRpb247XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiBzY29wZV9tb2RpZmllcj8/P1xuLy8gVE9ETzogaW5pdGlhbCB2YWx1ZVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwicHJvcGVydHkge2lkZW50aWZpZXJ9IGFzIChhfGFuKT8ge3R5cGV9XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHkgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgdHlwZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHR0eXBlID0gdHlwZS50b1NvdXJjZShjb250ZXh0KTtcblxuXHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSgpIHsgcmV0dXJuIHRoaXMuX18ke2lkZW50aWZpZXJ9IH1cXG5gXG5cdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAoc3BlbGwuaXNBKHZhbHVlLCAke3R5cGV9KSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eVwiLFxuXHRcInByb3BlcnR5IHtpZGVudGlmaWVyfSBhcyBvbmUgb2Yge2xpc3Q6bGl0ZXJhbF9saXN0fVwiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5X2FzX29uZV9vZiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBsaXN0IH0gPSB0aGlzLnJlc3VsdHM7XG5cblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHBsdXJhbCA9IHBsdXJhbGl6ZShpZGVudGlmaWVyKTtcblxuXHRcdFx0bGV0IHZhbHVlcyA9IGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgZmlyc3QgPSBsaXN0LmdldEl0ZW0oMCk7XG5cdFx0XHRsZXQgZmlyc3RWYWx1ZSA9IGZpcnN0ID8gZmlyc3QudG9Tb3VyY2UoY29udGV4dCkgOiBcInVuZGVmaW5lZFwiO1xuXG5cdFx0XHRyZXR1cm4gYEBwcm90b1xcbmBcblx0XHRcdFx0ICsgYCR7cGx1cmFsfSA9ICR7dmFsdWVzfVxcbmBcblx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9KCkgeyByZXR1cm4gdGhpcy5fXyR7aWRlbnRpZmllcn0gPT09IHVuZGVmaW5lZCA/ICR7Zmlyc3RWYWx1ZX0gOiB0aGlzLl9fJHtpZGVudGlmaWVyfSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblxuLy8gTU9SRSBFRkZJQ0lFTlQgQlVUIFVHTElFUlxuLy8gXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9O1xcbmBcbi8vIFx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9IHsgcmV0dXJuIChcIl9fJHtpZGVudGlmaWVyfVwiIGluIHRoaXMgPyB0aGlzLl9fJHtpZGVudGlmaWVyfSA6ICR7Zmlyc3RWYWx1ZX0pIH1cXG5gXG4vLyBcdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy5jb25zdHJ1Y3Rvci4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdFNlbGYtcmVmZXJlbmNlXG4vL1xucGFyc2VyLmFkZEtleXdvcmQoXCJtZVwiLCBcIm1lXCIsXG5cdGNsYXNzIG1lIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gXCJ0aGlzXCI7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB0aGlzIHJlYWxseSBtYWtlcyBtZSB3YW50IHRvIG1ha2UgYEkgYW0gZW1wdHlgIGV0YyB3b3JrLi4uXG5wYXJzZXIuYWRkS2V5d29yZChcIklcIiwgXCJJXCIsXG5cdGNsYXNzIEkgZXh0ZW5kcyBSdWxlLktleXdvcmQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiBcInRoaXNcIjtcblx0XHR9XG5cdH1cbik7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLm1lKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMuSSk7XG5cblxuLy9cbi8vXHRQcm9wZXJ0eSBhY2Nlc3Ncbi8vXG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIocHJvcGVydGllczp0aGUge2lkZW50aWZpZXJ9IG9mKSsgdGhlPyB7ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgcHJvcGVydGllcyB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRwcm9wZXJ0aWVzID0gcHJvcGVydGllcy5yZXN1bHRzXG5cdFx0XHRcdFx0XHRcdC5yZXZlcnNlKClcblx0XHRcdFx0XHRcdFx0Lm1hcCggcHJvcGVydHkgPT4gcHJvcGVydHkuaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSApXG5cdFx0XHRcdFx0XHRcdC5qb2luKFwiLlwiKTtcblx0XHRcdHJldHVybiBgJHtleHByZXNzaW9ufS4ke3Byb3BlcnRpZXN9YDtcbi8vIE5PVEU6IHRoZSBmb2xsb3dpbmcgaXMgc2FmZXIsIGJ1dCB1Z2x5IGZvciBkZW1vIHB1cnBvc2VzXG4vL1x0XHRcdHJldHVybiBgc3BlbGwuZ2V0KCR7ZXhwcmVzc2lvbn0sIFsnJHtwcm9wZXJ0aWVzfSddKWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwcm9wZXJ0eV9leHByZXNzaW9uXCIsXG5cdFwiKG15fHRoaXMpIHtpZGVudGlmaWVyfVwiLFxuXHRjbGFzcyBwcm9wZXJ0eV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgdGhpcy4ke2lkZW50aWZpZXJ9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvdHlwZXMuanMiLCJ2YXIgZztcclxuXHJcbi8vIFRoaXMgd29ya3MgaW4gbm9uLXN0cmljdCBtb2RlXHJcbmcgPSAoZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHRoaXM7XHJcbn0pKCk7XHJcblxyXG50cnkge1xyXG5cdC8vIFRoaXMgd29ya3MgaWYgZXZhbCBpcyBhbGxvd2VkIChzZWUgQ1NQKVxyXG5cdGcgPSBnIHx8IEZ1bmN0aW9uKFwicmV0dXJuIHRoaXNcIikoKSB8fCAoMSxldmFsKShcInRoaXNcIik7XHJcbn0gY2F0Y2goZSkge1xyXG5cdC8vIFRoaXMgd29ya3MgaWYgdGhlIHdpbmRvdyByZWZlcmVuY2UgaXMgYXZhaWxhYmxlXHJcblx0aWYodHlwZW9mIHdpbmRvdyA9PT0gXCJvYmplY3RcIilcclxuXHRcdGcgPSB3aW5kb3c7XHJcbn1cclxuXHJcbi8vIGcgY2FuIHN0aWxsIGJlIHVuZGVmaW5lZCwgYnV0IG5vdGhpbmcgdG8gZG8gYWJvdXQgaXQuLi5cclxuLy8gV2UgcmV0dXJuIHVuZGVmaW5lZCwgaW5zdGVhZCBvZiBub3RoaW5nIGhlcmUsIHNvIGl0J3NcclxuLy8gZWFzaWVyIHRvIGhhbmRsZSB0aGlzIGNhc2UuIGlmKCFnbG9iYWwpIHsgLi4ufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBnO1xyXG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAod2VicGFjaykvYnVpbGRpbi9nbG9iYWwuanNcbi8vIG1vZHVsZSBpZCA9IDE1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIE1ha2Ugc3VyZSBgZ2xvYmFsYCBpcyBkZWZpbmVkIGdsb2JhbGx5OlxuLy9cdC0gZWl0aGVyIGFzIHRoZSBub2RlanMgYGdsb2JhbGAsIG9yXG4vL1x0LSBhcyBhbiBhbGlhcyBmb3IgYHdpbmRvd2AgaW4gYnJvd3NlcnMsIG9yXG4vL1x0LSBmb3IgdGhlIGBzZWxmYCBjb250ZXh0IGluIHdlYiB3b3JrZXJzLlxuLy9cbi8vIE5PVEU6IHRoaXMgbW9kaWZpZXMgdGhlIFwiZ2xvYmFsXCIgZW52aXJvbm1lbnQgYnkgbWFraW5nIHN1cmUgXCJnbG9iYWxcIiBpcyBzZXQuIVxuLy9cblxubGV0IGdsb2JhbF9pZGVudGlmaWVyO1xuaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gbm9kZVwiKTtcblx0Z2xvYmFsX2lkZW50aWZpZXIgPSBnbG9iYWw7XG59XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4vL1x0Y29uc29sZS5sb2coXCJSdW5uaW5nIGluIGEgd2ViIGJyb3dzZXJcIik7XG5cdHdpbmRvdy5nbG9iYWwgPSB3aW5kb3c7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gd2luZG93O1xufVxuXG5pZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gYSB3ZWIgd29ya2VyXCIpO1xuXHRzZWxmLmdsb2JhbCA9IHNlbGY7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gc2VsZjtcbn1cblxuLy8gRXhwb3J0IGZvciBjb25zdW1wdGlvbiBieSBpbXBvcnQuXG5leHBvcnQgZGVmYXVsdCBnbG9iYWxfaWRlbnRpZmllcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2dsb2JhbC5qcyJdLCJzb3VyY2VSb290IjoiIn0=