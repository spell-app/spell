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
_parser2.default.addRule("whitespace", new _RuleSyntax2.default.Whitespace({ pattern: /\s+/, optional: true }));

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

/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgYjllNTM1YmRmNzZhZWVmYjIyZjYiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGVTeW50YXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2lmLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy90eXBlcy5qcyIsIndlYnBhY2s6Ly8vKHdlYnBhY2spL2J1aWxkaW4vZ2xvYmFsLmpzIiwid2VicGFjazovLy8uL3NyYy9nbG9iYWwuanMiXSwibmFtZXMiOlsicGFyc2VyIiwid2luZG93IiwiT2JqZWN0IiwiYXNzaWduIiwicGFyc2VSdWxlU3ludGF4Iiwic3ludGF4IiwiU2VxdWVuY2VDb25zdHJ1Y3RvciIsIlNlcXVlbmNlIiwic3ludGF4U3RyZWFtIiwidG9rZW5pc2VSdWxlU3ludGF4IiwicnVsZXMiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwicnVsZSIsImxlbmd0aCIsIlNZTlRBWF9FWFBSRVNTSU9OIiwibWF0Y2giLCJTeW50YXhFcnJvciIsInN0YXJ0SW5kZXgiLCJsYXN0SW5kZXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJlbmRJbmRleCIsImxhc3QiLCJTeW1ib2wiLCJwb3AiLCJtZXJnZVN5bWJvbHMiLCJLZXl3b3JkIiwibWVyZ2VLZXl3b3JkcyIsInB1c2giLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zeW1ib2wiLCJwYXJzZVJ1bGVTeW50YXhfc3VicnVsZSIsInBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyIsInBhcnNlUnVsZVN5bnRheF9saXN0IiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsIktFWVdPUkRfUEFUVEVSTiIsInBhcnNlUnVsZVN5bnRheF9rZXl3b3JkIiwiY29uc3RydWN0b3IiLCJ3b3JkcyIsImkiLCJuZXh0Iiwic3RyaW5nIiwiam9pbiIsInN0YXJ0c1dpdGgiLCJzdWJzdHIiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJzbGljZSIsImFyZ3VtZW50IiwiYWx0ZXJuYXRpdmVzIiwiZ3JvdXBBbHRlcm5hdGl2ZXMiLCJtYXAiLCJncm91cCIsInJlc3VsdHMiLCJBbHRlcm5hdGl2ZXMiLCJ0b2tlbnMiLCJjdXJyZW50IiwidG9rZW4iLCJjb25jYXQiLCJzeW1ib2wiLCJSZXBlYXQiLCJvcHRpb25hbCIsInVuZGVmaW5lZCIsInBhcmFtcyIsImJhbmdQb3NpdGlvbiIsImluZGV4T2YiLCJub3QiLCJTdWJydWxlIiwiTGlzdCIsIml0ZW0iLCJkZWxpbWl0ZXIiLCJkZWZpbmVQcm9wZXJ0aWVzIiwicHJvdG90eXBlIiwiYWRkU2VxdWVuY2UiLCJ2YWx1ZSIsIm5hbWUiLCJydWxlU3ludGF4IiwicHJvcGVydGllcyIsImRlYnVnIiwiY29uc29sZSIsImxvZyIsImFkZFJ1bGUiLCJlIiwiZXJyb3IiLCJhZGRTdGF0ZW1lbnQiLCJTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiRXhwcmVzc2lvbiIsImFkZExpc3QiLCJzdHJlYW0iLCJhZGRLZXl3b3JkIiwiYWRkU3ltYm9sIiwiYWRkUG9zdGZpeE9wZXJhdG9yIiwiQXJyYXkiLCJpc0FycmF5IiwiZm9yRWFjaCIsInRvSlMiLCJUeXBlRXJyb3IiLCJfX3Bvc3RmaXhPcGVyYXRvcnMiLCJwb3N0Zml4T3BlcmF0b3JzIiwiUnVsZSIsImhhc093blByb3BlcnR5IiwiY2xvbmUiLCJjcmVhdGUiLCJwcm9wcyIsImFkdmFuY2VUbyIsInN0YWNrIiwiY29udGV4dCIsIm1hdGNoZWQiLCJuZXh0UnVsZSIsIm5leHRTdHJlYW0iLCJQYXR0ZXJuIiwic3RhcnRQYXR0ZXJuIiwiYmxhY2tsaXN0IiwibWF0Y2hlZFRleHQiLCJyYW5nZSIsInBhdHRlcm4iLCJpbmRleCIsIndvcmQiLCJzb3VyY2UiLCJfX3N0YXJ0UGF0dGVybiIsImRlZmluZVByb3BlcnR5IiwiUmVnRXhwIiwiUmVnRXhwRnJvbVN0cmluZyIsImZpcnN0Iiwic2Vjb25kIiwicGF0dGVyblN0cmluZyIsImVzY2FwZVJlZ0V4cENoYXJhY3RlcnMiLCJnZXRSdWxlT3JEaWUiLCJwYXJzZSIsImlzRGV0ZXJtaW5pc3RpYyIsInRlc3QiLCJOZXN0ZWQiLCJldmVyeSIsInRlc3RSdWxlIiwibGVmdFJlY3Vyc2l2ZSIsInN0YWNrQ29udGFpbnMiLCJjaHVua2l0IiwicGFyc2VJbkNodW5rcyIsImVhdFdoaXRlc3BhY2UiLCJhcmdOYW1lIiwicnVsZU5hbWUiLCJiZXN0TWF0Y2giLCJtYXRjaGVzIiwiZ2V0QmVzdE1hdGNoIiwicmVkdWNlIiwiYmVzdCIsInRvU291cmNlIiwiaW5jbHVkZXMiLCJncm91cEVuZCIsIlBhcnNlciIsInByb3BlcnR5TmFtZSIsImdldFJ1bGUiLCJhcmd1bWVudHMiLCJjb21waWxlU3RhdGVtZW50cyIsInJlc3VsdCIsInN0YXRlbWVudHMiLCJ0aW1lIiwiY3VycmVudEluZGVudCIsInRhYnMiLCJzcGxpdCIsInN0YXRlbWVudCIsInRyaW0iLCJsaW5lU3RhcnQiLCJsaW5lSW5kZW50IiwiaW5kZW50ZWRTdGFydCIsImNsb3NlcnMiLCJsYXN0QmxhbmtMaW5lIiwiX2dldExhc3RCbGFua0xpbmUiLCJzcGxpY2UiLCJ3YXJuIiwidW5wYXJzZWQiLCJsaW5lIiwidGltZUVuZCIsIndoaXRlc3BhY2UiLCJhZHZhbmNlQnkiLCJleGlzdGluZyIsInJ1bGVJc0xlZnRSZWN1cnNpdmUiLCJzdWJydWxlIiwic3RhcnRUb2tlbiIsImVuZFRva2VuIiwibmVzdGluZyIsIm5lc3RlZCIsImNoYXIiLCJsaXN0IiwiUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyIsImZsYWdzIiwiREVCVUciLCJjaGFycyIsIldoaXRlc3BhY2UiLCJDb21tZW50IiwiV29yZCIsInJlcGxhY2UiLCJJZGVudGlmaWVyIiwiaWRlbnRpZmllciIsImFkZFRvQmxhY2tsaXN0IiwiVHlwZSIsInR5cGUiLCJOdW1iZXIiLCJwYXJzZUZsb2F0IiwibnVtYmVyIiwiSW50ZWdlciIsInBhcnNlSW50IiwiVGV4dCIsInRleHQiLCJCb29sZWFuIiwiYm9vbGVhbiIsImV4cHJlc3Npb24iLCJlbmRzV2l0aCIsIlRleHRTdHJlYW0iLCJ0ZXh0T3JQcm9wcyIsImFyZyIsImhlYWQiLCJzdWJzdHJpbmciLCJtZW1vaXplZCIsImRlZmluZU1lbW9pemVkIiwicHJvcGVydHkiLCJnZXR0ZXIiLCJhcHBseSIsImNvbmZpZ3VyYWJsZSIsImdldCIsImVsc2VQaHJhc2UiLCJlbHNlU3RhdGVtZW50IiwiaW5kZXhfZXhwcmVzc2lvbiIsIm9yZGluYWwiLCJpbmZpeF9vcGVyYXRvciIsInByZWNlZGVuY2UiLCJhIiwiYiIsInRoaW5nIiwibGhzIiwicmhzIiwib3BlcmF0b3IiLCJhc3NpZ25tZW50IiwibWVzc2FnZSIsImJ1dHRvbkNsYXVzZSIsImJ1dHRvbk5hbWUiLCJva0J1dHRvbiIsImNhbmNlbEJ1dHRvbiIsImNhbmNlbENsYXVzZSIsInBsdXJhbGl6ZSIsInByb3AiLCJrZXkiLCJwcm9wc19jbGF1c2UiLCJuZXdfdGhpbmciLCJleHRlbmRzX2NsYXVzZSIsInN1cGVyVHlwZSIsImFyZ05hbWVzIiwiYXJncyIsImFyZ3NfY2xhdXNlIiwid29yZF9jbGF1c2UiLCJ0eXBlcyIsInRvTG93ZXJDYXNlIiwibWV0aG9kTmFtZSIsImNvbmRpdGlvbnMiLCJzY29wZSIsInZhbHVlX2NsYXVzZSIsImRlY2xhcmF0aW9uIiwicGx1cmFsIiwidmFsdWVzIiwiZ2V0SXRlbSIsImZpcnN0VmFsdWUiLCJtZSIsIkkiLCJyZXZlcnNlIiwiZ2xvYmFsX2lkZW50aWZpZXIiLCJnbG9iYWwiLCJzZWxmIl0sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsbURBQTJDLGNBQWM7O0FBRXpEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsbUNBQTJCLDBCQUEwQixFQUFFO0FBQ3ZELHlDQUFpQyxlQUFlO0FBQ2hEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDhEQUFzRCwrREFBK0Q7O0FBRXJIO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7Ozs7Ozs7Ozs7QUM3REE7Ozs7QUFDQTs7Ozs7O0FBRUE7QUFOQTtBQUNBO0FBQ0E7QUFLQSxJQUFNQSxTQUFTLHNCQUFmO2tCQUNlQSxNOztBQUVmOztBQUNBQyxPQUFPRCxNQUFQLEdBQWdCQSxNQUFoQixDOzs7Ozs7Ozs7Ozs7Ozs7QUNYQTs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBRSxPQUFPQyxNQUFQLGlCQUFvQjs7QUFFcEI7QUFDQTtBQUNBOztBQUVBO0FBQ0NDLGdCQVBtQiwyQkFPSEMsTUFQRyxFQU8wQztBQUFBLE1BQXJDQyxtQkFBcUMsdUVBQWYsZUFBS0MsUUFBVTs7QUFDNUQsTUFBSUMsZUFBZSxlQUFLQyxrQkFBTCxDQUF3QkosTUFBeEIsQ0FBbkI7QUFDQSxNQUFJSyxRQUFRLGVBQUtDLHNCQUFMLENBQTRCSCxZQUE1QixFQUEwQyxFQUEx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SUFBSSxPQUFPQyxNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQ25DO0FBQ0NELHFCQUFvQkMsTUFBcEI7QUFDQTs7QUFFRCxJQUFJLE9BQU94USxNQUFQLEtBQWtCLFdBQXRCLEVBQW1DO0FBQ25DO0FBQ0NBLFFBQU93USxNQUFQLEdBQWdCeFEsTUFBaEI7QUFDQXVRLHFCQUFvQnZRLE1BQXBCO0FBQ0E7O0FBRUQsSUFBSSxPQUFPeVEsSUFBUCxLQUFnQixXQUFwQixFQUFpQztBQUNqQztBQUNDQSxNQUFLRCxNQUFMLEdBQWNDLElBQWQ7QUFDQUYscUJBQW9CRSxJQUFwQjtBQUNBOztBQUVEO2tCQUNlRixpQiIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGlkZW50aXR5IGZ1bmN0aW9uIGZvciBjYWxsaW5nIGhhcm1vbnkgaW1wb3J0cyB3aXRoIHRoZSBjb3JyZWN0IGNvbnRleHRcbiBcdF9fd2VicGFja19yZXF1aXJlX18uaSA9IGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiB2YWx1ZTsgfTtcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7XG4gXHRcdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuIFx0XHRcdFx0ZW51bWVyYWJsZTogdHJ1ZSxcbiBcdFx0XHRcdGdldDogZ2V0dGVyXG4gXHRcdFx0fSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiL1wiO1xuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IDEzKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCBiOWU1MzViZGY3NmFlZWZiMjJmNiIsIi8vXG4vL1x0IyBDcmVhdGUgYSBgcGFyc2VyYCBzaW5nbGV0b24gdG8gdXNlIHRvIHNldCB1cCBydWxlcyBhbmQgZHVyaW5nIHRlc3RzLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcblxuLy8gQ3JlYXRlIHBhcnNlciBpbnN0YW5jZS5cbmNvbnN0IHBhcnNlciA9IG5ldyBQYXJzZXIoKTtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbndpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9fcGFyc2VyLmpzIiwiaW1wb3J0IHsgZGVmaW5lTWVtb2l6ZWQgfSBmcm9tIFwiLi9tZW1vaXplLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyByZS1leHBvcnQgUnVsZSBmb3IgdGVzdGluZ1xuZXhwb3J0IGRlZmF1bHQgUnVsZTtcblxuLy9cbi8vXHQjIFBhcnNpbmcgYHJ1bGVTeW50YXhgIHRvIGNyZWF0ZSBydWxlcyBhdXRvbWF0aWNhbGx5LlxuLy9cbi8vIFRPRE86XHRQdWxsIGBwYXJzZVJ1bGVTeW50YXhgIHN0dWZmIG91dCBpbnRvIHNlcGFyYXRlIG1vZHVsZT9cbi8vIFRPRE86XHRCZXR0ZXIgbmFtZSBmb3IgYHJ1bGVTeW50YXhgXG4vLyBUT0RPOlx0VXNlIGtleXdvcmRzIGluIHN5bnRheCB0byBtYWtlIGEgcXVpY2sgcmVnZXgtYmFzZWQgYHRlc3RgIGZ1bmN0aW9uIGZvciB0aGUgZW50aXJlIHJ1bGVcbk9iamVjdC5hc3NpZ24oUnVsZSwge1xuXG4vL1xuLy8gIyMgZ3JvdXA6IHBhcnNpbmcgc3ludGF4XG4vL1xuXG4vLyBUT0RPOiBjb252ZXJ0IHRvIFRleHRTdHJlYW0gcGF0dGVybiBhbGEgbm9ybWFsIHBhcnNlciBvbmNlIHRoYXQgc2V0dGxlcyBkb3duPz8/XG5cdHBhcnNlUnVsZVN5bnRheChzeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0bGV0IHN5bnRheFN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCk7XG5cdFx0bGV0IHJ1bGVzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgW10pO1xuXG5cdFx0bGV0IHJ1bGU7XG5cdFx0Ly8gSWYgd2Ugb25seSBnb3Qgb25lIHRoaW5nLCByZXR1cm4gdGhhdCBhcyB0aGUgcmVzdWx0XG5cdFx0aWYgKHJ1bGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cnVsZSA9IHJ1bGVzWzBdO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgU2VxdWVuY2VDb25zdHJ1Y3Rvcih7IHJ1bGVzIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9LFxuXG5cdHRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpIHtcblx0XHRjb25zdCBTWU5UQVhfRVhQUkVTU0lPTiA9IC8oPzpbXFx3XFwtXSt8XFxcXFtcXFtcXChcXHtcXClcXH1cXF1dfFteXFxzXFx3XXxcXHwpL2c7XG5cdFx0bGV0IHN5bnRheFN0cmVhbSA9IHN5bnRheC5tYXRjaChTWU5UQVhfRVhQUkVTU0lPTik7XG5cdFx0aWYgKCFzeW50YXhTdHJlYW0pIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgdG9rZW5pemUgcGFyc2UgcnVsZSBzeW50YXggPj4ke3N5bnRheH08PGApO1xuXHRcdHJldHVybiBzeW50YXhTdHJlYW07XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IGxhc3RJbmRleCA9IHN5bnRheFN0cmVhbS5sZW5ndGg7XG5cdFx0d2hpbGUgKHN0YXJ0SW5kZXggPCBsYXN0SW5kZXgpIHtcblx0XHRcdGxldCBbIHJ1bGUsIGVuZEluZGV4IF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGlmIChydWxlKSB7XG5cdFx0XHRcdGxldCBsYXN0ID0gcnVsZXNbcnVsZXMubGVuZ3RoLTFdO1xuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYFN0cmluZ2AgYW5kIGxhc3Qgd2FzIGEgYFN0cmluZ2AsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5TeW1ib2wpIHtcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuXHRcdFx0XHRcdC8vIGFuZCByZXBsYWNlIHdpdGggYSBydWxlIHRoYXQgbWVyZ2VzIHRoZSBrZXl3b3Jkc1xuXHRcdFx0XHRcdHJ1bGUgPSBSdWxlLm1lcmdlU3ltYm9scyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYEtleXdvcmRgIGFuZCBsYXN0IHdhcyBhbHNvIGEgYEtleXdvcmRgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRlbHNlIGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG5cdFx0XHRcdFx0cnVsZXMucG9wKCk7XG5cdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG5cdFx0XHRcdFx0cnVsZSA9IFJ1bGUubWVyZ2VLZXl3b3JkcyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRydWxlcy5wdXNoKHJ1bGUpO1xuXHRcdFx0fVxuXHRcdFx0c3RhcnRJbmRleCA9IGVuZEluZGV4ICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IHN5bnRheFRva2VuID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXG5cdFx0Ly8gaWYgd2UgZ290IGEgXCJcXFxcXCIgKHdoaWNoIGFsc28gaGFzIHRvIGdvIGludG8gdGhlIHNvdXJjZSBzdHJpbmcgYXMgXCJcXFxcXCIpXG5cdFx0Ly8gdHJlYXQgdGhlIG5leHQgdG9rZW4gYXMgYSBsaXRlcmFsIHN0cmluZyByYXRoZXIgdGhhbiBhcyBhIHNwZWNpYWwgY2hhcmFjdGVyLlxuXHRcdGlmIChzeW50YXhUb2tlbiA9PT0gXCJcXFxcXCIpIHtcblx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCArIDEpO1xuXHRcdH1cblxuXHRcdHN3aXRjaCAoc3ludGF4VG9rZW4pIHtcblx0XHRcdGNhc2UgXCJ7XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIoXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiW1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKlwiOlxuXHRcdFx0Y2FzZSBcIitcIjpcblx0XHRcdGNhc2UgXCI/XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0XHQvLyB0aGUgZm9sbG93aW5nIHNob3VsZCBBTFdBWVMgYmUgY29uc3VtZWQgYnkgdGhlIGFib3ZlXG5cdFx0XHRjYXNlIFwifVwiOlxuXHRcdFx0Y2FzZSBcIilcIjpcblx0XHRcdGNhc2UgXCJdXCI6XG5cdFx0XHRjYXNlIFwifFwiOlxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgJHtzeW50YXhUb2tlbn0gZm91bmQgYXMgaXRlbSAke3N0YXJ0SW5kZXh9IG9mICR7dGhpcy5zeW50YXh9YCk7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGlmIChzeW50YXhUb2tlbi5tYXRjaChSdWxlLktFWVdPUkRfUEFUVEVSTikpIHtcblx0XHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfa2V5d29yZChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3ltYm9sKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdEtFWVdPUkRfUEFUVEVSTiA6IC9bQS1aYS16XSsvLFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9rZXl3b3JkKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDAsIGNvbnN0cnVjdG9yKSB7XG5cdFx0bGV0IHdvcmRzID0gW10sIGVuZEluZGV4O1xuXHRcdGZvciAodmFyIGkgPSBzdGFydEluZGV4OyBpIDwgc3ludGF4U3RyZWFtLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXQgbmV4dCA9IHN5bnRheFN0cmVhbVtpXTtcblx0XHRcdGlmIChuZXh0Lm1hdGNoKFJ1bGUuS0VZV09SRF9QQVRURVJOKSkge1xuXHRcdFx0XHR3b3Jkcy5wdXNoKG5leHQpO1xuXHRcdFx0XHRlbmRJbmRleCA9IGk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGJyZWFrO1xuXHRcdH1cblxuXHRcdGlmICghY29uc3RydWN0b3IpIGNvbnN0cnVjdG9yID0gUnVsZS5LZXl3b3JkO1xuXHRcdGxldCBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHsgc3RyaW5nOiB3b3Jkcy5qb2luKFwiIFwiKSB9KTtcblxuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N5bWJvbChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwLCBjb25zdHJ1Y3RvciA9IFJ1bGUuU3ltYm9sKSB7XG5cdFx0bGV0IHN0cmluZyA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblx0XHRpZiAoIWNvbnN0cnVjdG9yKSBjb25zdHJ1Y3RvciA9IFJ1bGUuU3ltYm9sO1xuXHRcdGxldCBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHsgc3RyaW5nOiBzdHJpbmcgfSk7XG5cblx0XHQvLyBJZiBzdHJpbmcgc3RhcnRzIHdpdGggYFxcXFxgLCBpdCdzIGFuIGVzY2FwZWQgbGl0ZXJhbCAoZWc6IGBcXFtgIG5lZWRzIHRvIGlucHV0IGFzIGBcXFxcW2ApLlxuXHRcdGlmIChzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIikpIHtcblx0XHRcdC8vIHJlbW92ZSBsZWFkaW5nIHNsYXNoIGluIG1hdGNoIHN0cmluZy4uLlxuXHRcdFx0cnVsZS5zdHJpbmcgPSBydWxlLnN0cmluZy5zdWJzdHIoMSk7XG5cdFx0XHQvLyBidXQgbGVhdmUgaXQgaW4gdG9TdHJpbmdcblx0XHRcdHJ1bGUudG9TdHJpbmcgPSAoKSA9PiBzdHJpbmc7XG5cdFx0fVxuXHRcdHJldHVybiBbIHJ1bGUsIHN0YXJ0SW5kZXggXTtcblx0fSxcblxuXG5cdC8vIE1hdGNoIGdyb3VwaW5nIGV4cHJlc3Npb24gYCguLi58Li4uKWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHQvLyBOT1RFOiBuZXN0ZWQgcGFyZW5zIG1heSBub3QgaGF2ZSBhbHRlcm5hdGl2ZXMuLi4gOi0oICAgYChhfChifGMpKWAgd29uJ3Qgd29yaz8/P1xuXHRwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIihcIiwgXCIpXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0Ly8gcHVsbCBvdXQgZXhwbGljaXQgYXJndW1lbnQgbmFtZVxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdC8vIHNwbGl0IGludG8gZ3JvdXBzLCBpbmNsdWRpbmcgbmVzdGVkIHBhcmVuc1xuXHRcdGxldCBhbHRlcm5hdGl2ZXMgPVxuXHRcdFx0Z3JvdXBBbHRlcm5hdGl2ZXMoc2xpY2UpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0XHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKGdyb3VwLCBbXSk7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHRzWzBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdGxldCBydWxlID0gYWx0ZXJuYXRpdmVzLmxlbmd0aCA9PT0gMSA/IGFsdGVybmF0aXZlc1swXSA6IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVzOiBhbHRlcm5hdGl2ZXMgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblxuXHRcdGZ1bmN0aW9uIGdyb3VwQWx0ZXJuYXRpdmVzKHRva2Vucykge1xuXHRcdFx0bGV0IGFsdGVybmF0aXZlcyA9IFtdO1xuXHRcdFx0bGV0IGN1cnJlbnQgPSBbXTtcblx0XHRcdGZvciAobGV0IGkgPSAwLCB0b2tlbjsgdG9rZW4gPSB0b2tlbnNbaV07IGkrKykge1xuXHRcdFx0XHQvLyBoYW5kbGUgYWx0ZXJuYXRlIG1hcmtlclxuXHRcdFx0XHRpZiAodG9rZW4gPT09IFwifFwiKSB7XG5cdFx0XHRcdFx0YWx0ZXJuYXRpdmVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGhhbmRsZSBuZXN0ZWQgcGFyZW5zXG5cdFx0XHRcdGVsc2UgaWYgKHRva2VuID09PSBcIihcIikge1xuXHRcdFx0XHRcdGxldCB7IGVuZEluZGV4IH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmRJbmRleCArIDEpKTtcblx0XHRcdFx0XHRpID0gZW5kSW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3VycmVudC5wdXNoKHRva2VuKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGN1cnJlbnQubGVuZ3RoKSBhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdHJldHVybiBhbHRlcm5hdGl2ZXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIHJlcGVhdCBpbmRpY2F0b3IgYD9gLCBgK2Agb3IgYCpgIGJ5IGF0dGFjaGluZyBpdCB0byB0aGUgcHJldmlvdXMgcnVsZS5cblx0cGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IHN5bWJvbCA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblx0XHRsZXQgcnVsZSA9IHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBhdHRhY2ggcmVwZWF0IHN5bWJvbCAke3N5bWJvbH0gdG8gZW1wdHkgcnVsZSFgKTtcblxuXHRcdC8vIFRyYW5zZm9ybSBsYXN0IHJ1bGUgaW50byBhIHJlcGVhdCBmb3IgYCpgIGFuZCBgK2AuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCIqXCIgfHwgc3ltYm9sID09PSBcIitcIikge1xuXHRcdFx0bGV0IGFyZ3VtZW50ID0gcnVsZS5hcmd1bWVudDtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5SZXBlYXQoeyBydWxlIH0pO1xuXHRcdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0XHQvLyBwdXNoIGludG8gcnVsZSBzdGFjayBpbiBwbGFjZSBvZiBvbGQgcnVsZVxuXHRcdFx0cnVsZXNbcnVsZXMubGVuZ3RoIC0gMV0gPSBydWxlO1xuXHRcdH1cblxuXHRcdC8vIFJ1bGUgaXMgb3B0aW9uYWwgZm9yIGA/YCBhbmQgYCpgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiP1wiIHx8IHN5bWJvbCA9PT0gXCIqXCIpIHtcblx0XHRcdHJ1bGUub3B0aW9uYWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBbIHVuZGVmaW5lZCwgc3RhcnRJbmRleCBdXG5cdH0sXG5cblx0Ly8gTWF0Y2ggYHs8cnVsZU5hbWU+fWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IG1hdGNoID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIntcIiwgXCJ9XCIsIHN0YXJ0SW5kZXgpO1xuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID09PSAzICYmIG1hdGNoLnNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBtYXRjaC5zbGljZVswXTtcblx0XHRcdG1hdGNoLnNsaWNlID0gbWF0Y2guc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPiAxKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHByb2Nlc3MgcnVsZXMgd2l0aCBtb3JlIHRoYW4gb25lIHJ1bGUgbmFtZTogeyR7bWF0Y2guc2xpY2Uuam9pbihcIlwiKX19YCk7XG5cblx0XHRsZXQgcGFyYW1zID0geyBydWxlOiBtYXRjaC5zbGljZVswXSB9O1xuXG5cdFx0Ly8gc2VlIGlmIHRoZXJlJ3MgYSBgbm90YCBydWxlIGluIHRoZXJlXG5cdFx0bGV0IGJhbmdQb3NpdGlvbiA9IHBhcmFtcy5ydWxlLmluZGV4T2YoXCIhXCIpO1xuXHRcdGlmIChiYW5nUG9zaXRpb24gIT09IC0xKSB7XG5cdFx0XHRwYXJhbXMubm90ID0gcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpOyAvL1sgcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpIF07XG5cdFx0XHRwYXJhbXMucnVsZSA9IHBhcmFtcy5ydWxlLnN1YnN0cigwLCBiYW5nUG9zaXRpb24pO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuU3VicnVsZShwYXJhbXMpO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIG1hdGNoLmVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggbGlzdCBleHByZXNzaW9uIGBbPGl0ZW0+PGRlbGltaXRlcj5dYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDAsIGNvbnN0cnVjdG9yID0gUnVsZS5MaXN0KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBbIGl0ZW0sIGRlbGltaXRlciBdID0gcmVzdWx0cztcblxuXHRcdGxldCBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHsgaXRlbSwgZGVsaW1pdGVyIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cdH0sXG5cbn0pO1xuXG5cblxuLy8gIyMgIEFkZCBtZXRob2RzIHRvIFBhcnNlciB0byBkZWZpbmUgcnVsZXMgdXNpbmcgdGhlIGFib3ZlIHN5bnRheC5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFBhcnNlci5wcm90b3R5cGUsIHtcblxuXHQvLyBQYXJzZSBhIGBydWxlU3ludGF4YCBydWxlIGFuZCBhZGQgaXQgdG8gb3VyIGxpc3Qgb2YgcnVsZXMuXG5cdC8vIFJldHVybnMgdGhlIG5ldyBydWxlLlxuXHQvLyBMb2dzIHBhcnNpbmcgZXJyb3JzIGJ1dCBhbGxvd3MgdGhpbmdzIHRvIGNvbnRpbnVlLlxuXHRhZGRTZXF1ZW5jZTogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlLCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKHR5cGVvZiBjb25zdHJ1Y3RvciAhPT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRwcm9wZXJ0aWVzID0gY29uc3RydWN0b3I7XG5cdFx0XHRjb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2U7XG5cdFx0fVxuXHRcdHRyeSB7XG5cdFx0XHRsZXQgcnVsZSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yKTtcblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cbi8vY29uc29sZS5pbmZvKG5hbWUsIGNvbnN0cnVjdG9yLCBydWxlKTtcblx0XHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmdyb3VwKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgc3ludGF4OiAke3J1bGVTeW50YXh9YCk7XG5cdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdH1cblx0fX0sXG5cblx0YWRkU3RhdGVtZW50OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuU3RhdGVtZW50LCBwcm9wZXJ0aWVzKSB7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmFkZFNlcXVlbmNlKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkRXhwcmVzc2lvbjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLkV4cHJlc3Npb24sIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgcnVsZSA9IHRoaXMuYWRkU2VxdWVuY2UobmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkTGlzdDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLkxpc3QsIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgc3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgocnVsZVN5bnRheCk7XG5cdFx0bGV0IHJ1bGUgPSAoUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pWzBdO1xuXHRcdGlmICghcnVsZSkgcmV0dXJuO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZEtleXdvcmQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5LZXl3b3JkLCBwcm9wZXJ0aWVzKSB7XG5cdFx0bGV0IHN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgpO1xuXHRcdGxldCBydWxlID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKVswXTtcblx0XHRpZiAoIXJ1bGUpIHJldHVybjtcblx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRTeW1ib2w6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5TeW1ib2wsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBUT0RPOiBhc3N1bWUgd2UganVzdCBoYXZlIG9uZSBzeW1ib2wgb2YgbWFueSBsZXR0ZXJzLi4uXG5cdFx0bGV0IHN0cmVhbSA9IFtydWxlU3ludGF4XTtcblx0XHRsZXQgcnVsZSA9IChSdWxlLnBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKVswXTtcblx0XHRpZiAoIXJ1bGUpIHJldHVybjtcblx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHR9fSxcblxuXHQvLyBBZGQgcG9zdGZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgaXMgZGVmaW5lZFwiXG5cdC8vIE5PVEU6IGlmIHlvdSBoYXZlIG1vcmUgdGhhbiBvbmUgbWF0Y2hpbmcgb3BlcmF0b3IsXG5cdC8vXHRcdCBwYXNzIGluIGFuIGFycmF5IG9mIHNpbXBsZSBzdHJpbmdzIHNvIGFsbCBvZiBvdXIgb3BlcmF0b3JzIGFyZSBzaW1wbGUgc3RyaW5ncy5cblx0YWRkUG9zdGZpeE9wZXJhdG9yOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpIHtcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkUG9zdGZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkge1xuXHRcdFx0aWYgKCFydWxlLnRvSlMpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgcG9zdGZpeCBvcGVyYXRvciBydWxlICcke25hbWV9JyB0byBzcGVjaWZ5ICd0b0pTJyBmdW5jdGlvbmApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gY2xlYXIgbGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgZm9yIGdldHRlciBiZWxvd1xuXHRcdFx0ZGVsZXRlIHRoaXMuX19wb3N0Zml4T3BlcmF0b3JzO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcInBvc3RmaXhfb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIHBvc3RmaXggb3BlcmF0b3JzIGFzIHN0cmluZ3MuXG5cdC8vIFJlLW1lbW9pemVkIGFmdGVyIGBhZGRJbmZpeE9wZXJhdG9yYCBhYm92ZS5cblx0cG9zdGZpeE9wZXJhdG9yczogZGVmaW5lTWVtb2l6ZWQoXCJfX3Bvc2ZpeE9wZXJhdG9yc1wiLFxuXHRcdGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0JiYgdGhpcy5ydWxlc1tcInBvc3RmaXhfb3BlcmF0b3JcIl0ucnVsZXMubWFwKHJ1bGUgPT4gcnVsZS5zdHJpbmcpO1xuXHR9KVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZVN5bnRheC5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHN0cmVhbSwgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBzdHJlYW1gXHRcdFN0cmVhbSB3aGljaCB3YXMgbWF0Y2hlZCB3aXRoIGBzdGFydEluZGV4YCBhdCB0aGUgc3RhcnQgb2YgdGhlIG1hdGNoXG4vL1x0XHRcdC0gYGVuZEluZGV4YFx0Tm9uLWluY2x1c2l2ZSBlbmQgaW5kZXggaW4gc3RyZWFtIHdoZXJlIG1hdGNoIGVuZHMuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5yZXN1bHRzYFx0XHRcdFJldHVybiBtYXRjaGVkIGFyZ3VtZW50cyBpbiBhIGZvcm1hdCBzdWl0YWJsZSB0byBkbzpcbi8vXHRcdC0gYHJ1bGUudG9Tb3VyY2UoY29udGV4dClgXHRSZXR1cm4gamF2YXNjcmlwdCBzb3VyY2UgdG8gaW50ZXJwcmV0IHRoZSBydWxlLlxuLy9cbmltcG9ydCBnbG9iYWwgZnJvbSBcIi4vZ2xvYmFsXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKHRoaXMuY29uc3RydWN0b3IgIT09IFJ1bGUgfHwgIXRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLmhhc093blByb3BlcnR5KFwiY29uc3RydWN0b3JcIikpIHtcbi8vY29uc29sZS53YXJuKFwibm90IHJ1bGVcIiwgdGhpcyk7XG5cdFx0fVxuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKC4uLnByb3BzKSB7XG5cdFx0bGV0IGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCAuLi5wcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuLy9cbi8vXHRQYXJzaW5nIHByaW1pdGl2ZXMgLS0geW91IE1VU1QgaW1wbGVtZW50IHRoZXNlIGluIHlvdXIgc3ViY2xhc3NlcyFcbi8vXG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHJ1bGUgaW4gdGhlIGBzdHJlYW1gLlxuXHQvLyBSZXR1cm5zIHJlc3VsdHMgb2YgdGhlIHBhcnNlIG9yIGB1bmRlZmluZWRgLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gSXMgdGhpcyBydWxlIGRldGVybWluaXN0aWMsIGVnOiBjYW4gaXQgYmUgcXVpY2tseSBhbmQgdW5hbWJpZ3VvdXNseSBzYXRpc2ZpZWQ/XG5cdC8vIFJldHVybmluZyBgdHJ1ZWAgY2FuIHNwZWVkIHVwIHNlcXVlbmNlIHByb2Nlc3NpbmcsXG5cdC8vXHRidXQgaWYgeW91J3JlIHJlYWxseSBub3Qgc3VyZSwgcmV0dXJuIGB1bmRlZmluZWRgLlxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYml0cyBvZiBvdXIgcnVsZSBhcmUgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYyAoYnV0IGFsbCBwYXR0ZXJucyBhcmUgZGV0ZXJtaW5pc3RpYylcblx0Ly9cdC0gcmVnZXggbWF0Y2ggaWYgZm91bmQsXG5cdC8vXHQtIGBmYWxzZWAgaWYgbm90IGZvdW5kXG5cdHRlc3QocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGUgcGFyc2UgYHN0YWNrYCBhbHJlYWR5IGNvbnRhaW4gYHJ1bGVgP1xuXHRzdGF0aWMgc3RhY2tDb250YWlucyhzdGFjaywgcnVsZSwgc3RyZWFtKSB7XG5cdFx0aWYgKHN0YWNrLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGZhbHNlO1xuXG4vL2NvbnNvbGUuaW5mbyhzdGFjayk7XG5cdFx0Ly8gZ28gYmFja3dhcmRzXG5cdFx0Zm9yICh2YXIgaSA9IHN0YWNrLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRsZXQgWyBuZXh0UnVsZSwgbmV4dFN0cmVhbSBdID0gc3RhY2tbaV07XG5cdFx0XHRpZiAobmV4dFJ1bGUgPT09IHJ1bGUpIHtcblx0XHRcdFx0aWYgKG5leHRTdHJlYW0uc3RhcnRJbmRleCA9PT0gc3RyZWFtLnN0YXJ0SW5kZXgpIHtcbi8vXHRcdFx0XHRcdGNvbnNvbGUud2FybihcImZvdW5kIHVucHJvZHVjdGl2ZSBydWxlIFwiLCBydWxlLCBcIiBvbiBzdGFja1wiLCBzdGFjayk7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG4vL1x0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJmb3VuZCBwcm9kdWN0aXZlIHJ1bGUgXCIsIHJ1bGUsIFwiIG9uIHN0YWNrXCIsIHN0YWNrKTtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cbi8vXG4vLyAjIyBvdXRwdXQgYXMgc291cmNlXG4vL1xuXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBOT1RFOiB5b3UgbWF5IHdhbnQgdG8gbWVtb2l6ZSB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvLyBPdXRwdXQgdmFsdWUgZm9yIHRoaXMgSU5TVEFOVElBVEVEIHJ1bGUgYXMgc291cmNlLlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG5cblxuLy8gREVCVUc6IG1ha2UgYFJ1bGVgIGdsb2JhbCBmb3IgZGVidWdnaW5nLlxuZ2xvYmFsLlJ1bGUgPSBSdWxlO1xuXG5cblxuLy8gUmVnZXggcGF0dGVybi5cbi8vIGBydWxlLnBhdHRlcm5gIGlzIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2guXG4vL1xuLy8gTk9URVx0VG8gbWFrZSB0aGlzIG1vcmUgZ2VuZXJhbGx5IGFwcGxpY2FibGUsIGRvIE5PVCBzdGFydCB0aGUgcGF0dGVybiB3aXRoIGEgYF5gLlxuLy9cdFx0V2UnbGwgYXV0b21hdGljYWxseSBtYWtlIGEgY29weSBvZiB0aGUgUmVnRXhwIHdpdGggdGhlIHN0YXJ0IHBvaW50IGF0dGFjaGVkXG4vL1x0XHRhbmQgdXNlIHRoYXQgYXMgYXBwcm9wcmlhdGUuXG4vL1xuLy9cdFx0VGhpcyB3YXkgd2UgY2FuIHJlLXVzZSB0aGUgcmVnZXggdG8gY2hlY2sgZm9yIGEgbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLi4uXG4vL1xuLy8gWW91IGNhbiBvcHRpb25hbGx5IHNwZWNpZnkgYSBgcnVsZS5ibGFja2xpc3RgLCBhIHNldCBvZiBtYXRjaGVzIHdoaWNoIHdpbGwgc3BlY2lmaWNhbGx5IE5PVCB3b3JrLFxuLy9cdGVnIGZvciBgaWRlbnRpZmllci5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0Ly8gYHN0YXJ0UGF0dGVybmAgaXMgdGhlIHNhbWUgYXMgb3VyIHBhdHRlcm4gZXhjZXB0IGl0IHdpbGwgb25seSBtYXRjaCBhdCB0aGUgQkVHSU5OSU5HIG9mIGEgc3RyaW5nLlxuXHRnZXQgc3RhcnRQYXR0ZXJuKCkge1xuXHRcdGlmICghdGhpcy5fX3N0YXJ0UGF0dGVybikge1xuXHRcdFx0Ly8gYHBhdHRlcm5gIGlzIHJlcXVpcmVkXG5cdFx0XHRpZiAoIXRoaXMucGF0dGVybikgdGhyb3cgbmV3IFR5cGVFcnJvcih0aGlzK1wiOiBZb3UgbXVzdCBzcGVjaWZ5IGEgYHBhdHRlcm5gIHBhcmFtZXRlclwiKTtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcIl9fc3RhcnRQYXR0ZXJuXCIsIHtcblx0XHRcdFx0dmFsdWU6IG5ldyBSZWdFeHAoXCJeXCIgKyB0aGlzLnBhdHRlcm4uc291cmNlKVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLl9fc3RhcnRQYXR0ZXJuO1xuXHR9XG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHBhdHRlcm4gYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRsZXQgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5zdGFydFBhdHRlcm4pO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBiYWlsIGlmIHByZXNlbnQgaW4gYmxhY2tsaXN0XG5cdFx0bGV0IG1hdGNoZWQgPSBtYXRjaFswXTtcblx0XHRpZiAodGhpcy5ibGFja2xpc3QgJiYgdGhpcy5ibGFja2xpc3RbbWF0Y2hlZF0pIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgZW5kSW5kZXggPSBzdHJlYW0uc3RhcnRJbmRleCArIG1hdGNoZWQubGVuZ3RoO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgZW5kSW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFBhdHRlcm5zIGFyZSBBTFdBWVMgZGV0ZXJtaW5pc3RpYy5cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIHBhdHRlcm5pcyBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljIChidXQgYWxsIHBhdHRlcm5zIGFyZSBkZXRlcm1pbmlzdGljKVxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmRcblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBtYXRjaCA9IHN0cmVhbS5tYXRjaCh0aGlzLnBhdHRlcm4pO1xuXHRcdGlmIChtYXRjaCkge1xuXHRcdFx0bWF0Y2guZW5kSW5kZXggPSAobWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgpO1xuXHRcdFx0cmV0dXJuIG1hdGNoO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRhZGRUb0JsYWNrbGlzdCguLi53b3Jkcykge1xuXHRcdGlmICghdGhpcy5ibGFja2xpc3QpIHRoaXMuYmxhY2tsaXN0ID0ge307XG5cdFx0d29yZHMuZm9yRWFjaCh3b3JkID0+IHRoaXMuYmxhY2tsaXN0W3dvcmRdID0gdHJ1ZSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5wYXR0ZXJuLnNvdXJjZTtcblx0fVxufVxuXG4vLyBSdWxlIGZvciBsaXRlcmFsIHN0cmluZyB2YWx1ZSwgd2hpY2ggaW5jbHVkZSBwdW5jdHVhdGlvbiBzdWNoIGFzIGAoYCBldGMuXG4vLyBgU3ltYm9sYHMgYXJlIGRpZmZlcmVudCBmcm9tIGBLZXl3b3Jkc2AgaW4gdGhhdCB0aGV5IGRvIG5vdCByZXF1aXJlIGEgd29yZCBib3VuZGFyeS5cbi8vVE9ETzogcmVuYW1lIGBTeW1ib2xgPz8/XG5SdWxlLlN5bWJvbCA9IGNsYXNzIFN5bWJvbCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgc3RyaW5nYCBpcyByZXF1aWVkLlxuXHRcdGlmICghcHJvcGVydGllcy5zdHJpbmcpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5TeW1ib2woKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gY29udmVydCBzdHJpbmcgdG8gcGF0dGVyblxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBQYXJzZXIuUmVnRXhwRnJvbVN0cmluZyhwcm9wZXJ0aWVzLnN0cmluZyk7XG4vL2NvbnNvbGUuaW5mbyhwcm9wZXJ0aWVzLnN0cmluZywgcHJvcGVydGllcy5wYXR0ZXJuKTtcblx0XHR9XG5cbi8vXHRcdGNvbnNvbGUuaW5mbyhcImNyZWF0aW5nIHN0cmluZ1wiLCBwcm9wZXJ0aWVzKTtcblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMuc3RyaW5nfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuLy8gTWVyZ2UgdHdvIFN5bWJvbCBydWxlcyB0b2dldGhlciwgcmV0dXJuaW5nIGEgbmV3IHJ1bGUgdGhhdCBtYXRjaGVzIGJvdGguXG5SdWxlLm1lcmdlU3ltYm9scyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0Ly8gR2V0IGN1c3RvbSBjb25zdHJ1Y3RvciBpZiB0aGVyZSBpcyBvbmUuLi5cblx0bGV0IGNvbnN0cnVjdG9yID0gZmlyc3QuY29uc3RydWN0b3IgIT09IFJ1bGUuU3ltYm9sID8gZmlyc3QuY29uc3RydWN0b3IgOiBzZWNvbmQuY29uc3RydWN0b3I7XG5cdHJldHVybiBuZXcgY29uc3RydWN0b3IoeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cbi8vIEtleXdvcmQgcGF0dGVybi5cbi8vIFByb3BlcnRpZXM6XG4vL1x0LSBgcnVsZS5zdHJpbmdgIFx0KHJlcXVpcmVkKSBcdEtleXdvcmQgc3RyaW5nIHRvIG1hdGNoLlxuLy9cdC0gYHJ1bGUucGF0dGVybmBcdChvcHRpb25hbCkgXHRSZWdFeHAgZm9yIHRoZSBtYXRjaC5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0V2UnbGwgY3JlYXRlIG9uZSBmcm9tIGBzdHJpbmdgIGlmIG5lY2Vzc2FyeS5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0Tk9URTogZG8gTk9UIHN0YXJ0IHRoZSBgcGF0dGVybmAgd2l0aCBgXmAuXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLktleXdvcmQoKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gZGVyaXZlIGBwYXR0ZXJuYCBpZiBuZWNlc3NhcnkuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdC8vIGVuZm9yY2Ugd29yZCBib3VuZGFyaWVzIGFuZCBhbGxvdyBhcmJpdHJhcnkgc3BhY2UgYmV0d2VlbiB3b3Jkc1xuXHRcdFx0bGV0IHBhdHRlcm5TdHJpbmcgPSBQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhwcm9wZXJ0aWVzLnN0cmluZyk7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKFwiXFxcXGJcIiArIHBhdHRlcm5TdHJpbmcgKyBcIlxcXFxiXCIpO1xuXHRcdH1cblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuLy8gTWVyZ2UgdHdvIEtleXdvcmQgcnVsZXMgdG9nZXRoZXIsIGFkZGluZyB0aGUgc2Vjb25kIHRvIHRoZSBmaXJzdC5cblJ1bGUubWVyZ2VLZXl3b3JkcyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0Ly8gR2V0IGN1c3RvbSBjb25zdHJ1Y3RvciBpZiB0aGVyZSBpcyBvbmUuLi5cblx0bGV0IGNvbnN0cnVjdG9yID0gZmlyc3QuY29uc3RydWN0b3IgIT09IFJ1bGUuS2V5d29yZCA/IGZpcnN0LmNvbnN0cnVjdG9yIDogc2Vjb25kLmNvbnN0cnVjdG9yO1xuXHRyZXR1cm4gbmV3IGNvbnN0cnVjdG9yKHsgc3RyaW5nOiBmaXJzdC5zdHJpbmcgKyBcIiBcIiArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cblxuLy8gU3VicnVsZSAtLSBuYW1lIG9mIGFub3RoZXIgcnVsZSB0byBiZSBjYWxsZWQuXG4vLyBgcnVsZS5ydWxlYCBpcyB0aGUgbmFtZSBvZiB0aGUgcnVsZSBpbiBgcGFyc2VyLnJ1bGVzYC5cblJ1bGUuU3VicnVsZSA9IGNsYXNzIFN1YnJ1bGUgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZU9yRGllKHRoaXMucnVsZSwgXCJydWxlXCIpO1xuXHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIG1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gbWF0Y2g7XG5cdH1cblxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy5ydWxlLCBcInJ1bGVcIik7XG5cdFx0cmV0dXJuIHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmQgb3Jcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYy5cblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnJ1bGUsIFwicnVsZVwiKTtcblx0XHRyZXR1cm4gcnVsZS50ZXN0KHBhcnNlciwgc3RyZWFtKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgeyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlfX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuXG4vLyBBYnN0cmFjdDogIGBOZXN0ZWRgIHJ1bGUgLS0gY29tcG9zZWQgb2YgYSBzZXJpZXMgb2Ygb3RoZXIgYHJ1bGVzYC5cblJ1bGUuTmVzdGVkID0gY2xhc3MgTmVzdGVkIGV4dGVuZHMgUnVsZSB7XG5cblx0Ly8gSXMgdGhpcyBkZXRlcm1pbmlzdGljLCBlZzogYXJlIG91ciBzdWJydWxlcyB1bmFtYmlnb3VzbHkgZGV0ZXJtaW5hYmxlP1xuLy9UT0RPOiBtZW1vaXplP1xuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlcy5ldmVyeShydWxlID0+IHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSk7XG5cdH1cbn1cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaCAoYXV0by1leGNsdWRpbmcgd2hpdGVzcGFjZSkuXG5SdWxlLlNlcXVlbmNlID0gY2xhc3MgU2VxdWVuY2UgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0Ly8gSWYgd2UgaGF2ZSBhIGB0ZXN0UnVsZWAgZGVmaW5lZFxuXHRcdGlmICh0aGlzLnRlc3RSdWxlKSB7XG5cdFx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy50ZXN0UnVsZSwgXCJ0ZXN0UnVsZVwiKTtcblx0XHRcdGlmIChydWxlLnRlc3QocGFyc2VyLCBzdHJlYW0pID09PSBmYWxzZSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHRpZiAoUnVsZS5zdGFja0NvbnRhaW5zKHN0YWNrLCB0aGlzLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0c3RhY2sgPSBzdGFjay5jb25jYXQoKTtcblx0XHRcdHN0YWNrLnB1c2goW3RoaXMsIHN0cmVhbV0pO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNodW5raXQpIHJldHVybiB0aGlzLnBhcnNlSW5DaHVua3MocGFyc2VyLCBzdHJlYW0sIHN0YWNrKTtcblxuXHRcdGxldCBtYXRjaGVkID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFtYXRjaCAmJiAhcnVsZS5vcHRpb25hbCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0XHRuZXh0ID0gbWF0Y2gubmV4dCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBpZiB3ZSBnZXQgaGVyZSwgd2UgbWF0Y2hlZCBhbGwgdGhlIHJ1bGVzIVxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG4vLyBcdHBhcnNlSW5DaHVua3MocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG4vL1xuLy8gXHR9XG5cbi8vVE9ET0Ncblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gb2JqZWN0IHdpdGggcHJvcGVydGllcyBmcm9tIHRoZSBgbWF0Y2hlZGAgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGBtYXRjaC5hcmd1bWVudGA6XHRcdGFyZ3VtZW50IHNldCB3aGVuIHJ1bGUgd2FzIGRlY2xhcmVkLCBlZzogYHt2YWx1ZTpsaXRlcmFsfWAgPT4gYHZhbHVlYFxuXHQvL1x0XHQtIGBtYXRjaC5ydWxlTmFtZWA6XHRcdG5hbWUgb2YgcnVsZSB3aGVuIGRlZmluZWRcblx0Ly9cdFx0LSBgcnVsZSB0eXBlYDpcdFx0XHRcdG5hbWUgb2YgdGhlIHJ1bGUgdHlwZVxuXHQvLyBOT1RFOiBtZW1vaXplcyB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IHJlc3VsdHMgPSB7fTtcblx0XHRmb3IgKGxldCBtYXRjaCBvZiB0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGxldCBhcmdOYW1lID0gbWF0Y2guYXJndW1lbnQgfHwgbWF0Y2gucnVsZU5hbWUgfHwgbWF0Y2guY29uc3RydWN0b3IubmFtZTtcblxuXHRcdFx0Ly8gSWYgYXJnIGFscmVhZHkgZXhpc3RzLCBjb252ZXJ0IHRvIGFuIGFycmF5XG5cdFx0XHRpZiAoYXJnTmFtZSBpbiByZXN1bHRzKSB7XG5cdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShyZXN1bHRzW2FyZ05hbWVdKSkgcmVzdWx0c1thcmdOYW1lXSA9IFtyZXN1bHRzW2FyZ05hbWVdXTtcblx0XHRcdFx0cmVzdWx0c1thcmdOYW1lXS5wdXNoKG1hdGNoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdID0gbWF0Y2g7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBleHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIFN0YXRlbWVudHMgdGFrZSB1cCB0aGUgZW50aXJlIGxpbmUuXG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXgsIG1hdGNoaW5nIG9uZSBvZiBhIG51bWJlciBvZiBkaWZmZXJlbnQgcnVsZXMuXG4vLyBUaGUgcmVzdWx0IG9mIGEgcGFyc2UgaXMgdGhlIGxvbmdlc3QgcnVsZSB0aGF0IGFjdHVhbGx5IG1hdGNoZWQuXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIGFsdGVybmF0aXZlcyBhcmUgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYy5cblx0Ly9cdC0gcmVnZXggbWF0Y2ggaWYgZm91bmQsXG5cdC8vXHQtIGBmYWxzZWAgaWYgbm90IGZvdW5kIG9yXG5cdHRlc3QocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRpZiAoIXRoaXMuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRsZXQgYmVzdE1hdGNoO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS50ZXN0KHBhcnNlciwgc3RyZWFtKTtcblx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRtYXRjaC5lbmRJbmRleCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuXHRcdFx0XHRyZXR1cm4gbWF0Y2g7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIEZpbmQgYWxsIHJ1bGVzIHdoaWNoIG1hdGNoIGFuZCBkZWxlZ2F0ZSB0byBgZ2V0QmVzdE1hdGNoKClgIHRvIHBpY2sgdGhlIGJlc3Qgb25lLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRsZXQgbWF0Y2hlcyA9IFtdO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXHRcdFx0aWYgKG1hdGNoKSBtYXRjaGVzLnB1c2gobWF0Y2gpO1xuXHRcdH1cblxuXHRcdGlmICghbWF0Y2hlcy5sZW5ndGgpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyB1bmNvbW1lbnQgdGhlIGJlbG93IHRvIHByaW50IGFsdGVybmF0aXZlc1xuXHRcdC8vIGlmIChtYXRjaGVzLmxlbmd0aCA+IDEpIHtcblx0XHQvL1x0Y29uc29sZS5pbmZvKHRoaXMuYXJndW1lbnQgfHwgdGhpcy5ydWxlTmFtZSwgbWF0Y2hlcywgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gubWF0Y2hlZFRleHQpKTtcblx0XHQvLyB9XG5cblx0XHRsZXQgYmVzdE1hdGNoID0gKG1hdGNoZXMubGVuZ3RoID09PSAxID8gbWF0Y2hlc1swXSA6IHRoaXMuZ2V0QmVzdE1hdGNoKG1hdGNoZXMpKTtcblxuXHRcdC8vIGFzc2lnbiBgYXJnTmFtZWAgb3IgYHJ1bGVOYW1lYCBmb3IgYHJlc3VsdHNgXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIGJlc3RNYXRjaC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0ZWxzZSBpZiAodGhpcy5ydWxlTmFtZSkgYmVzdE1hdGNoLnJ1bGVOYW1lID0gdGhpcy5ydWxlTmFtZTtcbi8vVE9ETzogb3RoZXIgdGhpbmdzIHRvIGNvcHkgaGVyZT8/P1xuXG5cdFx0cmV0dXJuIGJlc3RNYXRjaDtcblx0fVxuXG5cdC8vIFJldHVybiB0aGUgXCJiZXN0XCIgbWF0Y2ggZ2l2ZW4gbW9yZSB0aGFuIG9uZSBtYXRjaGVzIGF0IHRoZSBoZWFkIG9mIHRoZSBzdHJlYW0uXG5cdC8vIERlZmF1bHQgaXMgdG8gcmV0dXJuIHRoZSBsb25nZXN0IG1hdGNoLlxuXHQvLyBJbXBsZW1lbnQgc29tZXRoaW5nIGVsc2UgdG8gZG8sIGVnLCBwcmVjZWRlbmNlIHJ1bGVzLlxuXHRnZXRCZXN0TWF0Y2gobWF0Y2hlcykge1xuXHRcdHJldHVybiBtYXRjaGVzLnJlZHVjZShmdW5jdGlvbiAoYmVzdCwgbmV4dCkge1xuXHRcdFx0aWYgKG5leHQuZW5kSW5kZXggPiBiZXN0LmVuZEluZGV4KSByZXR1cm4gbmV4dDtcblx0XHRcdHJldHVybiBiZXN0O1xuXHRcdH0sIG1hdGNoZXNbMF0pO1xuXHR9XG5cblx0YWRkUnVsZShydWxlKSB7XG5cdFx0dGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoY29udGV4dCk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCgke3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZXMuam9pbihcInxcIil9KSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBSZXBlYXRpbmcgcnVsZS5cbi8vXHRgdGhpcy5ydWxlYCBpcyB0aGUgcnVsZSB0aGF0IHJlcGVhdHMuXG4vL1xuLy8gQWZ0ZXIgbWF0Y2hpbmc6XG4vL1x0YHRoaXMubWF0Y2hlZGAgaXMgYXJyYXkgb2YgcmVzdWx0cyBvZiBtYXRjaGVzLlxuLy9cbi8vXHRBdXRvbWF0aWNhbGx5IGNvbnN1bWVzIHdoaXRlc3BhY2UgYmVmb3JlIHJ1bGVzLlxuLy9cdElmIGRvZXNuJ3QgbWF0Y2ggYXQgbGVhc3Qgb25lLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuUnVsZS5SZXBlYXQgPSBjbGFzcyBSZXBlYXQgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCBzdHJlYW1dKTtcblx0XHR9XG5cblx0XHRsZXQgbmV4dCA9IHN0cmVhbTtcblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgbWF0Y2ggPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIW1hdGNoKSBicmVhaztcblxuXHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdG5leHQgPSBtYXRjaC5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gYXJyYXkgd2l0aCBhcmd1bWVudHMgb2YgYWxsIHJlc3VsdHMuXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gucmVzdWx0cyApO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0dGhyb3cgXCJEb24ndCB1bmRlcnN0YW5kIGhvdyB0byBzb3VyY2UgUnVsZS5SZXBlYXQhXCI7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRjb25zdCBydWxlID0gKHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UgfHwgdGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHRoaXMucnVsZS5zdHJpbmcuaW5jbHVkZXMoXCIgXCIpXG5cdFx0XHRcdCAgID8gYCgke3RoaXMucnVsZX0pYFxuXHRcdFx0XHQgICA6IGAke3RoaXMucnVsZX1gXG5cdFx0XHRcdCk7XG5cdFx0cmV0dXJuIGAke3J1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe251bWJlcn0sXWAgdG8gbWF0Y2ggYDEsMiwzYFxuLy9cdGBydWxlLml0ZW1gIGlzIHRoZSBydWxlIGZvciBlYWNoIGl0ZW0sXG4vL1x0YHJ1bGUuZGVsaW1pdGVyYCBpcyB0aGUgZGVsaW1pdGVyIGJldHdlZW4gZWFjaCBpdGVtLlxuLy8gXHRgcnVsZS5tYXRjaGVkYCBpbiB0aGUgb3V0cHV0IGlzIHRoZSBsaXN0IG9mIHZhbHVlcy5cbi8vXG4vL1xuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYSBMaXN0IHJ1bGUgd2lsbCBOT1QgcmVwZWF0ICg/Pz8/KVxuUnVsZS5MaXN0ID0gY2xhc3MgTGlzdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2sgPSBbXSkge1xuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdGlmIChSdWxlLnN0YWNrQ29udGFpbnMoc3RhY2ssIHRoaXMsIHN0cmVhbSkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRzdGFjayA9IHN0YWNrLmNvbmNhdCgpO1xuXHRcdFx0c3RhY2sucHVzaChbdGhpcywgc3RyZWFtXSk7XG5cdFx0fVxuXG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFpdGVtKSBicmVhaztcbi8vY29uc29sZS5sb2coaXRlbSk7XG5cdFx0XHRtYXRjaGVkLnB1c2goaXRlbSk7XG5cdFx0XHRuZXh0ID0gaXRlbS5uZXh0KCk7XG5cblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBkZWxpbWl0ZXIsIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgZGVsaW1pdGVyID0gdGhpcy5kZWxpbWl0ZXIucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0ID0gZGVsaW1pdGVyLm5leHQoKTtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSBkaWRuJ3QgZ2V0IGFueSBtYXRjaGVzLCBmb3JnZXQgaXQuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IG1hdGNoZWRbMF0gPyBtYXRjaGVkWzBdLnN0YXJ0SW5kZXggOiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybiBtYXRjaGVkIGl0ZW0gYnkgaW5kZXhcblx0Z2V0SXRlbShpbmRleCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWRbaW5kZXhdO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1x0XHQvLyBUT0RPOiB0aHJvdz8/P1xuXHRcdGxldCBtYXRjaGVkID0gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gudG9Tb3VyY2UoY29udGV4dCkgKS5qb2luKFwiLCBcIik7XG5cdFx0cmV0dXJuIGBbJHttYXRjaGVkfV1gO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiLy8gU3BlbGwgXCJFbmdsaXNoXCIgcGFyc2VyIHN0cmF3bWFuXG5cbi8vIFRPRE86XHRgdGVzdGAgZnVuY3Rpb24gZm9yIHF1aWNrIG5vLWdvb2QgaGl0IG9uIGB7YX0gYmxhaCBibGFoIHtifWA/XG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcms6ICAgYHtleHByZXNzaW9ufSBpcyB7ZXhwcmVzc2lvbn1gXG4vLyBUT0RPOlx0YnJlYWsgYGZpbGVgIGludG8gbGluZXMgYW5kIHByb2Nlc3MgZWFjaCAoaW5jbC4gc3Vic3RyL21hdGNoIG5vdCBnb2luZyBiZXlvbmQgdGhlIGVuZClcbi8vIFRPRE86XHRuZXN0aW5nIC0tIGlzIHRoaXMganVzdCBpbmRlbnQgPSBcImFkZCBibG9jayBzY29wZVwiXG4vLyBUT0RPOlx0cHJvbW90aW9uIHBhdHRlcm4gZm9yIGdhdGhlciBhcmd1bWVudHMgKGVnOiBsaXRlcmFsLWxpc3QpID8/P1xuLy8gVE9ETzpcdFdoYXQgZG9lcyBzeW50YXggdHJlZSBsb29rIGxpa2U/ICBIb3cgZG8gd2UgZXh0cmFjdCBtZWFuaW5nIG91dCBvZiB0aGUgbmVzdD9cbi8vIFRPRE86XHRQYXNzIGBjb250ZXh0YCB0byB0b1NvdXJjZSgpLCBhZGQgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYGNsYXNzYCwgdmFyaWFibGVzIGFuZCBjb2RlIHRvIGBtZXRob2RgLCBgZ2xvYmFsYCBzdHVmZiBldGNcblxuaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ2xvbmUgcnVsZXMsIHN0YXJ0aW5nIHdpdGggYSBjb21wbGV0ZWx5IGVtcHR5IG1hcCBpZiBub3QgZGVmaW5lZCAobm8gc3RhbmRhcmQgb2JqZWN0IGtleXMpXG5cdFx0dGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5ydWxlcyB8fCBudWxsKTtcblx0fVxuXG5cdGdldFJ1bGUobmFtZSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzW25hbWVdO1xuXHR9XG5cblx0Z2V0UnVsZU9yRGllKG5hbWUsIHByb3BlcnR5TmFtZSkge1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGAke3Byb3BlcnR5TmFtZX0gcnVsZSAnJHtuYW1lfScgbm90IGZvdW5kYCk7XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblxuLy9cbi8vIyMjIFBhcnNpbmdcbi8vXG5cdC8vIFBhcnNlIHNvbWV0aGluZzpcblx0Ly9cdC0gaWYgb25lIHN0cmluZyBhcmd1bWVudCwgZG9lcyBhIGBjb21waWxlU3RhdGVtZW50cygpYFxuXHQvL1x0LSBpZiB0d28sIGRvZXMgYSBgcGFyc2VSdWxlKClgIGFuZCBvdXRwdXRzIHRoZSByZXN1bHRzLlxuXHQvLyBSZXR1cm5zIGBwYXJzZS50b1N0cmluZygpYCBvciB0aHJvd3MuXG4vL1RFU1RNRVxuXHRjb21waWxlKCkge1xuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRsZXQgc3RyaW5nID0gYXJndW1lbnRzWzBdO1xuXHRcdFx0cmV0dXJuIHRoaXMuY29tcGlsZVN0YXRlbWVudHMoc3RyaW5nKTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0bGV0IG5hbWUgPSBhcmd1bWVudHNbMF0sIHN0cmluZyA9IGFyZ3VtZW50c1sxXTtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnBhcnNlKG5hbWUsIHN0cmluZyk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZXIucGFyc2UoJyR7bmFtZX0nLCAnJHtzdHJpbmd9Jyk6IGNhbid0IHBhcnNlIHRoaXNgKTtcblx0XHRcdHJldHVybiByZXN1bHQudG9Tb3VyY2UodGhpcyk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKFwicGFyc2VyLnBhcnNlKCk6IGV4cGVjdHMgb25lIG9yIHR3byBhcmd1bWVudHNcIik7XG5cdFx0fVxuXHR9XG5cblx0Ly8gUGFyc2UgYG5hbWVgZCBydWxlIGF0IGhlYWQgb2YgYHN0cmVhbWAgKGBzdHJpbmdgIG9yIGBUZXh0U3RyZWFtYCkuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cbi8vVEVTVE1FXG5cdHBhcnNlKG5hbWUsIHN0cmVhbSkge1xuXHRcdGlmICh0eXBlb2Ygc3RyZWFtID09PSBcInN0cmluZ1wiKSBzdHJlYW0gPSBuZXcgVGV4dFN0cmVhbShzdHJlYW0pO1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZXIucGFyc2UoJHtuYW1lfSk6IFJ1bGUgbm90IGZvdW5kYCk7XG5cdFx0c3RyZWFtID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJ1bGUucGFyc2UodGhpcywgc3RyZWFtKTtcblx0fVxuXG5cdC8vIFBhcnNlIGEgc2V0IG9mIHN0YXRlbWVudHMgbGluZS1ieS1saW5lLlxuLy9URVNUTUVcblx0Y29tcGlsZVN0YXRlbWVudHMoc3RhdGVtZW50cykge1xuXHRcdGNvbnNvbGUudGltZShcInBhcnNlU3RhdGVtZW50c1wiKTtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdGxldCBjdXJyZW50SW5kZW50ID0gMDtcblx0XHRjb25zdCB0YWJzID0gXCJcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcIjtcblx0XHQvL1xuXHRcdHN0YXRlbWVudHMuc3BsaXQoL1xcbi9nKS5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG5cdFx0XHQvLyBza2lwIGxpbmVzIHRoYXQgYXJlIGFsbCB3aGl0ZXNwYWNlXG5cdFx0XHRpZiAoc3RhdGVtZW50LnRyaW0oKSA9PT0gXCJcIikge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCJcIik7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpbmRlbnQgbGV2ZWwgb2YgdGhpcyBsaW5lXG5cdFx0XHRsZXQgbGluZVN0YXJ0ID0gc3RhdGVtZW50Lm1hdGNoKC9eXFx0Ki8pWzBdO1xuXHRcdFx0bGV0IGxpbmVJbmRlbnQgPSBsaW5lU3RhcnQubGVuZ3RoO1xuXHRcdFx0aWYgKGxpbmVJbmRlbnQgPiBjdXJyZW50SW5kZW50KSB7XG5cdFx0XHRcdC8vIGFkZCB0byBlbmQgb2YgcHJldmlvdXMgbGluZSBpZiBwb3NzaWJsZVxuXHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGgpIHtcblx0XHRcdFx0XHQvLyBidXQgb25seSBpZiBvdXRwdXQgaXMgbm90IGFscmVhZHkgaW5kZW50ZWQgdG8gdGhhdCBsZXZlbFxuLy9UT0RPOiBiYWNrdHJhY2sgZm9yIGNvbW1lbnRzISEhXG5cdFx0XHRcdFx0bGV0IGluZGVudGVkU3RhcnQgPSBsaW5lU3RhcnQgKyBcIlxcdFwiO1xuXHRcdFx0XHRcdGlmICghcmVzdWx0c1tyZXN1bHRzLmxlbmd0aCAtIDFdLnN0YXJ0c1dpdGgoaW5kZW50ZWRTdGFydCkpIHtcblx0XHRcdFx0XHRcdHJlc3VsdHNbcmVzdWx0cy5sZW5ndGggLSAxXSArPSBcIiB7XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuLy9jb25zb2xlLmluZm8oXCJhbHJlYWR5IGluZGVudGVkXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHJlc3VsdHMucHVzaCh0YWJzLnN1YnN0cigwLCBsaW5lSW5kZW50LTEpICsgXCJ7XCIpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAobGluZUluZGVudCA8IGN1cnJlbnRJbmRlbnQpIHtcblx0XHRcdFx0bGV0IGNsb3NlcnMgPSBbXTtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IGN1cnJlbnRJbmRlbnQ7IGkgPiBsaW5lSW5kZW50OyBpLS0pIHtcblx0XHRcdFx0XHRjbG9zZXJzLnB1c2godGFicy5zdWJzdHIoMCwgaS0xKSArIFwifVwiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBwdXQgcGFyZW5zIEJFRk9SRSBhbnkgYmxhbmsgbGluZXMhXG5cdFx0XHRcdGxldCBsYXN0QmxhbmtMaW5lID0gdGhpcy5fZ2V0TGFzdEJsYW5rTGluZShyZXN1bHRzKTtcblx0XHRcdFx0cmVzdWx0cy5zcGxpY2UobGFzdEJsYW5rTGluZSwgMCwgLi4uY2xvc2Vycyk7XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50SW5kZW50ID0gbGluZUluZGVudDtcblxuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMucGFyc2UoXCJzdGF0ZW1lbnRcIiwgc3RhdGVtZW50KTtcblx0XHRcdC8vIGNvbXBsYWluIGlmIG5vIHJlc3VsdFxuXHRcdFx0aWYgKCFyZXN1bHQpIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKGBDb3VsZG4ndCBwYXJzZSBzdGF0ZW1lbnQ6XFxuXFx0JHtzdGF0ZW1lbnQudHJpbSgpfWApO1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCIvLyBDQU5UIFBBUlNFOiBcIitzdGF0ZW1lbnQpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gY29tcGxhaW4gY2FuJ3QgcGFyc2UgdGhlIGVudGlyZSBsaW5lIVxuXHRcdFx0ZWxzZSBpZiAocmVzdWx0LmVuZEluZGV4ICE9PSBzdGF0ZW1lbnQubGVuZ3RoKSB7XG5cdFx0XHRcdGxldCB1bnBhcnNlZCA9IHN0YXRlbWVudC5zdWJzdHIocmVzdWx0LmVuZEluZGV4KTtcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiQ291bGRuJ3QgcGFyc2UgZW50aXJlIHN0YXRlbWVudDpcIixcblx0XHRcdFx0XHRcdFx0XHRgXFxuXFx0XCIke3N0YXRlbWVudC50cmltKCl9XCJgLFxuXHRcdFx0XHRcdFx0XHRcdGBcXG51bnBhcnNlZDpgLFxuXHRcdFx0XHRcdFx0XHRcdGBcXG5cXHRcIiR7dW5wYXJzZWR9XCJgKTtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKFwiLy8gQ0FOVCBQQVJTRSBFTlRJUkUgU1RBVEVNRU5UXCIpO1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCIvLyBQQVJTRUQgICAgOiBcIiArIHJlc3VsdC5tYXRjaGVkVGV4dCk7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChcIi8vIENBTlQgUEFSU0U6IFwiICsgdW5wYXJzZWQpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdC8vIHNwbGl0IGJ5IGxpbmVzIGFuZCBhZGQgaW5kZW50XG5cdFx0XHRcdGxldCBzb3VyY2UgPSByZXN1bHQudG9Tb3VyY2UodGhpcykuc3BsaXQoXCJcXG5cIilcblx0XHRcdFx0XHRcdFx0XHQubWFwKCBsaW5lID0+IGxpbmVTdGFydCArIGxpbmUgKTtcblx0XHRcdFx0cmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KHNvdXJjZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR3aGlsZSAoY3VycmVudEluZGVudCA+IDApIHtcblx0XHRcdHJlc3VsdHMucHVzaCh0YWJzLnN1YnN0cigwLCBjdXJyZW50SW5kZW50LTEpICsgXCJ9XCIpO1xuXHRcdFx0Y3VycmVudEluZGVudC0tO1xuXHRcdH1cblxuXHRcdGNvbnNvbGUudGltZUVuZChcInBhcnNlU3RhdGVtZW50c1wiKTtcblx0XHRyZXR1cm4gcmVzdWx0cy5qb2luKFwiXFxuXCIpO1xuXHR9XG5cblx0Ly8gRmlndXJlIG91dCB0aGUgbGFzdCBibGFuayBsaW5lIGluIHRoZSByZXN1bHRzXG5cdF9nZXRMYXN0QmxhbmtMaW5lKHJlc3VsdHMpIHtcblx0XHRmb3IgKGxldCBpID0gcmVzdWx0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0aWYgKHJlc3VsdHNbaV0gPT09IFwiXCIpIGNvbnRpbnVlO1xuXHRcdFx0cmV0dXJuIGkgKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gMDtcblx0fVxuXG5cdC8vIEVhdCB3aGl0ZXNwYWNlIChhY2NvcmRpbmcgdG8gYHJ1bGVzLndoaXRlc3BhY2VgKSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnMgbmV3IHN0cmVhbSBpZiB3ZSBtYXRjaGVkIHdoaXRlc3BhY2UsIG90aGVyd2lzZSB0aGUgc2FtZSBzdHJlYW0uXG5cdGVhdFdoaXRlc3BhY2Uoc3RyZWFtKSB7XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMucnVsZXMud2hpdGVzcGFjZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gc3RyZWFtO1xuXHRcdHJldHVybiBzdHJlYW0uYWR2YW5jZUJ5KHJlc3VsdC5tYXRjaGVkLmxlbmd0aCk7XG5cdH1cblxuLy9cbi8vXHRSdWxlc1xuLy9cblxuXHQvLyBBZGQgYSBydWxlIHRvIG91ciBsaXN0IG9mIHJ1bGVzIVxuXHQvLyBDb252ZXJ0cyB0byBgYWx0ZXJuYXRpdmVzYCBvbiByZS1kZWZpbmluZyB0aGUgc2FtZSBydWxlLlxuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHQvLyBkb24ndCBvdmVycmlkZSBydWxlTmFtZVxuXHRcdGlmICghcnVsZS5ydWxlTmFtZSkgcnVsZS5ydWxlTmFtZSA9IG5hbWU7XG5cblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLnJ1bGVzW25hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtuYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZTogbmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdC8vIGNvcHkgYXJndW1lbnQgbmFtZSBvdmVyICg/Pz8pXG5cdFx0XHRcdGlmIChleGlzdGluZy5hcmd1bWVudCkgdGhpcy5ydWxlc1tuYW1lXS5hcmd1bWVudCA9IGV4aXN0aW5nLmFyZ3VtZW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JyB0byAnJHtuYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXS5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBydWxlO1xuXHRcdH1cblxuXG5cdFx0Ly8gbWFrZSBhIG5vdGUgaWYgd2UncmUgYWRkaW5nIGEgbGVmdC1yZWN1cnNpdmUgcnVsZVxuXHRcdGlmICh0aGlzLnJ1bGVJc0xlZnRSZWN1cnNpdmUobmFtZSwgcnVsZSkpIHtcbi8vY29uc29sZS5pbmZvKFwibWFya2luZyBcIiwgcnVsZSwgXCIgYXMgbGVmdCByZWN1cnNpdmUhXCIpO1xuXHRcdFx0cnVsZS5sZWZ0UmVjdXJzaXZlID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cdC8vIElzIHRoZSBzcGVjaWZpZWQgcnVsZSBsZWZ0LXJlY3Vyc2l2ZT9cblx0cnVsZUlzTGVmdFJlY3Vyc2l2ZShuYW1lLCBydWxlKSB7XG5cdFx0aWYgKCEocnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UpKSByZXR1cm4gZmFsc2U7XG4vL2NvbnNvbGUubG9nKG5hbWUsIHJ1bGUpO1xuXHRcdGZvciAobGV0IHN1YnJ1bGUgb2YgcnVsZS5ydWxlcykge1xuXHRcdFx0Ly8gaWdub3JlIG9wdGlvbmFsIHJ1bGVzXG5cdFx0XHRpZiAoc3VicnVsZS5vcHRpb25hbCkgY29udGludWU7XG5cdFx0XHRpZiAoc3VicnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3VicnVsZSAmJiBzdWJydWxlLnJ1bGUgPT09IG5hbWUpIHJldHVybiB0cnVlO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXG4vL1xuLy8gIyMgVXRpbGl0eSBtZXRob2RzXG4vL1xuXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gXG5cdC8vXHRpbiBhcnJheSBvZiBgdG9rZW5zYCAoc3RyaW5ncykuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cblxuXHQvLyBMaXN0IG9mIHNwZWNpYWwgY2hhcmFjdGVycyBpbiByZWd1bGFyIGV4cHJlc3Npb25zLlxuXHQvLyBVc2VkIHRvIGVzY2FwZSB0aG9zZSBjaGFycyB3aGVuIGNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbnMgZnJvbSBzdHJpbmdzLlxuXHRzdGF0aWMgUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyA9IChmdW5jdGlvbigpIHtcblx0XHRjb25zdCBjaGFycyA9IHt9O1xuXHRcdFwiXFxcXC9eJCorPy4oKXx7fSxbXVwiLnNwbGl0KFwiXCIpLmZvckVhY2goY2hhciA9PiBjaGFyc1tjaGFyXSA9IHRydWUpO1xuXHRcdHJldHVybiBjaGFycztcblx0fSkoKVxuXG5cdC8vIEdpdmVuIGEgXCJub3JtYWxcIiBgc3RyaW5nYCwgZXNjYXBlIGFueSByZWd1bGFyIGV4cHJlc3Npb24gc3BlY2lhbCBjaGFyYWN0ZXJzXG5cdC8vXHRzbyB3ZSBjYW4gY3JlYXRlIGEgYG5ldyBSZWdFeHAoKWAuXG5cdC8vIEFsc28gY29udmVydHMgYSBzaW5nbGUgc3BhY2UgdG8gYXJiaXRyYXJ5IHNldCBvZiBzcGFjZXMgd2l0aCBcIlxccytcIlxuXHRzdGF0aWMgZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpIHtcblx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KFwiXCIpLm1hcChmdW5jdGlvbiAoY2hhciwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3IgYmFja3NsYXNoXG5cdFx0XHRpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIjtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igc3BhY2Vcblx0XHRcdGlmIChjaGFyID09PSBcIiBcIikgcmV0dXJuIFwiXFxcXHMrXCI7XG5cdFx0XHQvLyBJZiBhIHNwZWNpYWwgY2hhciBhbmQgcHJldmlvdXMgY2hhcmFjdGVyIHdhcyBub3QgYW4gZXNjYXBlLCBlc2NhcGUgdGhlIHJlc3VsdC5cblx0XHRcdGlmIChQYXJzZXIuUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSU1tjaGFyXSAmJiBsaXN0W2luZGV4LTFdICE9PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiK2NoYXI7XG5cdFx0XHQvLyBUaGlzIGNoYXIgc2hvdWxkIGJlIGZpbmUgYnkgaXRzZWxmLlxuXHRcdFx0cmV0dXJuIGNoYXI7XG5cdFx0fSkuam9pbihcIlwiKTtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyByZWd1bGFyIGV4cHJlc3Npb24gZnJvbSBhIFwibm9ybWFsXCIgc3RyaW5nLCBlc2NhcGluZyBzcGVjaWFsIGNoYXJhY3RlcnMgYXMgbmVjZXNzYXJ5LlxuXHRzdGF0aWMgUmVnRXhwRnJvbVN0cmluZyhzdHJpbmcsIGZsYWdzKSB7XG5cdFx0cmV0dXJuIG5ldyBSZWdFeHAoUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSwgZmxhZ3MpO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXG4vL1x0IyBDb3JlIGBydWxlc2AgLS0gc2ltcGxlIGRhdGF0eXBlcywgZXRjLlxuLy9cbi8vIE5PVEU6IG1hbnkgb2YgdGhlIGJlbG93IGFyZSBjcmVhdGVkIGFzIGN1c3RvbSBQYXR0ZXJuIHN1YmNsYXNzZXMgZm9yIGRlYnVnZ2luZy5cbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGB3aGl0ZXNwYWNlYCBydWxlLlxuLy8gTk9URSBgcGFyc2VyLnBhcnNlUnVsZShcIndoaXRlc3BhY2VcIiwgXCIgICBcIilgIHdpbGwgcmV0dXJuIGB1bmRlZmluZWRgXG4vL1x0XHQgYmVjYXVzZSBgcGFyc2VyLnBhcnNlUnVsZSgpYCBhdXRvbWF0aWNhbGx5IGVhdHMgd2hpdGVzcGFjZSBhdCB0aGUgc3RhcnQgb2YgYSBydWxlLlxuUnVsZS5XaGl0ZXNwYWNlID0gY2xhc3Mgd2hpdGVzcGFjZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fVxucGFyc2VyLmFkZFJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIG5ldyBSdWxlLldoaXRlc3BhY2UoeyBwYXR0ZXJuOiAvXFxzKy8sIG9wdGlvbmFsOiB0cnVlIH0pKTtcblxuXG4vLyBDb21tZW50XG5SdWxlLkNvbW1lbnQgPSBjbGFzcyBjb21tZW50IGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9XG5cblxuLy8gYHdvcmRgID0gaXMgYSBzaW5nbGUgYWxwaGFudW1lcmljIHdvcmQuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcblJ1bGUuV29yZCA9IGNsYXNzIHdvcmQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcIndvcmRcIiwgbmV3IFJ1bGUuV29yZCh7XG5cdHBhdHRlcm46IC9cXGJbYS16XVtcXHdcXC1dKlxcYi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcblxuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5JZGVudGlmaWVyID0gY2xhc3MgaWRlbnRpZmllciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbnBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgUnVsZS5JZGVudGlmaWVyKHtcblx0cGF0dGVybjogL1xcYlthLXpdW1xcd1xcLV0qXFxiLyxcblxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMuaWRlbnRpZmllcik7XG5cbi8vIEFkZCBFbmdsaXNoIHByZXBvc2l0aW9ucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vXG4vLyBXaWtpcGVkaWEgXCJQcmVwb3NpdGlvblwiOlxuLy9cdFwiUHJlcG9zaXRpb25zLi4uYXJlIGEgY2xhc3Mgb2Ygd29yZHMgdGhhdFxuLy9cdGV4cHJlc3Mgc3BhdGlhbCBvciB0ZW1wb3JhbCByZWxhdGlvbnMgIChpbiwgdW5kZXIsIHRvd2FyZHMsIGJlZm9yZSlcbi8vXHRvciBtYXJrIHZhcmlvdXMgc2VtYW50aWMgcm9sZXMgKG9mLCBmb3IpLlxuLy8gVEVTVE1FXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhYm91dFwiLCBcImFib3ZlXCIsIFwiYWZ0ZXJcIiwgXCJhbmRcIiwgXCJhc1wiLCBcImF0XCIsXG5cdFwiYmVmb3JlXCIsIFwiYmVoaW5kXCIsIFwiYmVsb3dcIiwgXCJiZW5lYXRoXCIsIFwiYmVzaWRlXCIsIFwiYmV0d2VlblwiLCBcImJleW9uZFwiLCBcImJ5XCIsXG5cdFwiZGVmaW5lZFwiLCBcImRvd25cIiwgXCJkdXJpbmdcIixcblx0XCJlYWNoXCIsIFwiZW1wdHlcIiwgXCJleGFjdGx5XCIsIFwiZXhjZXB0XCIsXG5cdFwiZm9yXCIsIFwiZnJvbVwiLFxuXHRcImdyZWF0ZXJcIixcblx0XCJJXCIsIFwiaW5cIiwgXCJpbnRvXCIsXG5cdFwibGVzc1wiLCBcImxvbmdcIixcblx0XCJtZVwiLCBcIm1pbnVzXCIsIFwibW9yZVwiLFxuXHRcIm5lYXJcIiwgXCJub3RcIixcblx0XCJvZlwiLCBcIm9mZlwiLCBcIm9uXCIsIFwib250b1wiLCBcIm9wcG9zaXRlXCIsIFwib3V0XCIsIFwib3V0c2lkZVwiLCBcIm92ZXJcIixcblx0XCJzaG9ydFwiLCBcInNpbmNlXCIsXG5cdFwidGhhblwiLCBcInRoZVwiLCBcInRoZW5cIiwgXCJ0aHJvdWdoXCIsIFwidGhydVwiLCBcInRvXCIsIFwidG93YXJkXCIsIFwidG93YXJkc1wiLFxuXHRcInVuZGVmaW5lZFwiLCBcInVuZGVyXCIsIFwidW5kZXJuZWF0aFwiLCBcInVuaXF1ZVwiLCBcInVudGlsXCIsIFwidXBcIiwgXCJ1cG9uXCIsIFwidXBzaWRlXCIsXG5cdFwidmVyc3VzXCIsIFwidnNcIixcblx0XCJ3aXRoXCIsIFwid2l0aGluXCIsIFwid2l0aG91dFwiLFxuKTtcblxuLy8gQWRkIGNvbW1vbiBlbmdsaXNoIHZlcmJzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYXJlXCIsXG5cdFwiZG9cIiwgXCJkb2VzXCIsXG5cdFwiY29udGFpbnNcIixcblx0XCJoYXNcIiwgXCJoYXZlXCIsXG5cdFwiaXNcIixcblx0XCJyZXBlYXRcIixcblx0XCJ3YXNcIiwgXCJ3ZXJlXCJcbik7XG5cbi8vIEFkZCBzcGVjaWFsIGNvbnRyb2wga2V5d29yZHMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJlbHNlXCIsXG5cdFwiaWZcIixcblx0XCJvdGhlcndpc2VcIixcblx0XCJ3aGlsZVwiXG4pO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLlR5cGUgPSBjbGFzcyB0eXBlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJ0eXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvKFtBLVpdW1xcd1xcLV0qfHRleHR8bnVtYmVyfGludGVnZXJ8ZGVjaW1hbHxjaGFyYWN0ZXJ8Ym9vbGVhbnxvYmplY3QpLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdGxldCB2YWx1ZSA9IHRoaXMubWF0Y2hlZDtcblx0XHRzd2l0Y2godmFsdWUpIHtcblx0XHRcdC8vIHNwZWNpYWwgY2FzZSB0byB0YWtlIHRoZSBmb2xsb3dpbmcgYXMgbG93ZXJjYXNlXG5cdFx0XHRjYXNlIFwidGV4dFwiOlx0XHRyZXR1cm4gXCJTdHJpbmdcIjtcblx0XHRcdGNhc2UgXCJjaGFyYWN0ZXJcIjpcdHJldHVybiBcIkNoYXJhY3RlclwiO1xuXHRcdFx0Y2FzZSBcIm51bWJlclwiOlx0XHRyZXR1cm4gXCJOdW1iZXJcIjtcblx0XHRcdGNhc2UgXCJpbnRlZ2VyXCI6XHRcdHJldHVybiBcIkludGVnZXJcIjtcblx0XHRcdGNhc2UgXCJkZWNpbWFsXCI6XHRcdHJldHVybiBcIkRlY2ltYWxcIjtcblx0XHRcdGNhc2UgXCJib29sZWFuXCI6XHRcdHJldHVybiBcIkJvb2xlYW5cIjtcblx0XHRcdGNhc2UgXCJvYmplY3RcIjpcdFx0cmV0dXJuIFwiT2JqZWN0XCI7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gdmFsdWUucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0XHR9XG5cdH1cbn0pKTtcbnBhcnNlci5ydWxlcy50eXBlLmFkZFRvQmxhY2tsaXN0KFwiSVwiKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMudHlwZSk7XG5cblxuLy8gYG51bWJlcmAgYXMgZWl0aGVyIGZsb2F0IG9yIGludGVnZXIsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cblJ1bGUuTnVtYmVyID0gY2xhc3MgbnVtYmVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJudW1iZXJcIiwgbmV3IFJ1bGUuTnVtYmVyKHtcblx0cGF0dGVybjogLy0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VGbG9hdCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHBhcnNlci5ydWxlcy5udW1iZXIpO1xuXG5cbi8vIE51bWVyaWMgYGludGVnZXJgIG9ubHksIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHRoaXMgV0lMTCBtYXRjaCBhIGZsb2F0LCBidXQgdGhlIHJldHVybmVkIHZhbHVlIHdpbGwgY29lcmNlIHRvIGFuIGludGVnZXIuXG4vLyBSRVZJRVc6IGlzIHRoaXMgcmlnaHQ/ICBCZXR0ZXIgdG8gbm90IG1hdGNoIGEgZmxvYXQ/XG5SdWxlLkludGVnZXIgPSBjbGFzcyBpbnRlZ2VyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJpbnRlZ2VyXCIsIG5ldyBSdWxlLkludGVnZXIoe1xuXHRwYXR0ZXJuOiAvLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbnBhcnNlci5hZGRSdWxlKFwidGV4dFwiLCBuZXcgUnVsZS5UZXh0KHtcblx0cGF0dGVybjogLyg/OlwiW15cIl0qXCJ8J1teJ10qJykvXG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLnRleHQpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cblJ1bGUuQm9vbGVhbiA9IGNsYXNzIGJvb2xlYW4gZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImJvb2xlYW5cIiwgbmV3IFJ1bGUuQm9vbGVhbih7XG5cdHBhdHRlcm46IC8odHJ1ZXxmYWxzZXx5ZXN8bm98b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLmJvb2xlYW4pO1xuLy8gQWRkIGJvb2xlYW4gdG9rZW5zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy8gVEVTVE1FXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJ0cnVlXCIsIFwiZmFsc2VcIixcblx0XCJ5ZXNcIiwgXCJub1wiLFxuXHRcIm9rXCIsIFwiY2FuY2VsXCJcbik7XG5cbi8vIExpdGVyYWwgbGlzdCAoYXJyYXkpLCBlZzogIGBbMSwyLHRydWUsZmFsc2UgXWBcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpdGVyYWxfbGlzdFwiLFxuXHRcIlxcXFxbW2xpc3Q6e2V4cHJlc3Npb259LF0/XFxcXF1cIixcblx0Y2xhc3MgbGl0ZXJhbF9saXN0IGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiBzdXBlci5yZXN1bHRzLmxpc3Q7XG5cdFx0fVxuXG5cdFx0Z2V0SXRlbShpbmRleCkge1xuXHRcdFx0bGV0IGxpc3QgPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZiAobGlzdCkgcmV0dXJuIGxpc3QubWF0Y2hlZFtpbmRleF07XG5cdFx0fVxuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGxpc3QgPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZiAoIWxpc3QpIHJldHVybiBcIltdXCI7XG4gXHRcdFx0cmV0dXJuIGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvblxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvblwiLFxuXHRcIlxcXFwoe2V4cHJlc3Npb259XFxcXClcIixcblx0Y2xhc3MgcGFyZW50aGVzaXplZF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiB0aGlzLm1hdGNoZWRbMV07XG5cdFx0fVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBleHByZXNzaW9uID0gdGhpcy5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gZG9uJ3QgZG91YmxlIHBhcmVucyBpZiBub3QgbmVjZXNzYXJ5XG5cdFx0XHRpZiAodHlwZW9mIGV4cHJlc3Npb24gPT09IFwic3RyaW5nXCIgJiYgZXhwcmVzc2lvbi5zdGFydHNXaXRoKFwiKFwiKSAmJiBleHByZXNzaW9uLmVuZHNXaXRoKFwiKVwiKSkgcmV0dXJuIGV4cHJlc3Npb247XG5cdFx0XHRyZXR1cm4gYCgke2V4cHJlc3Npb259KWA7XG5cdFx0fVxuXHR9XG4pXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY29yZS5qcyIsIlxuLy8gVE9ETzogY29udmVydCB0byBsaW5lLWF3YXJlIHN0cmVhbT8/P1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFN0cmVhbSB7XG5cdC8vIFlvdSBjYW4gY29uc3RydWN0IHdpdGggYSB0ZXh0IHN0cmluZyBvciBhIHNldCBvZiBwcm9wZXJ0aWVzIChpbmNsdWRpbmcgYHRleHRgKS5cblx0Y29uc3RydWN0b3IoLi4udGV4dE9yUHJvcHMpIHtcblx0XHR0ZXh0T3JQcm9wcy5mb3JFYWNoKChhcmcpID0+IHtcblx0XHRcdGlmICh0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdHRoaXMudGV4dCA9IGFyZztcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGFyZykge1xuXHRcdFx0XHRPYmplY3QuYXNzaWduKHRoaXMsIGFyZyk7XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8vIE1ha2Ugc3VyZSBgdGV4dGAgYW5kIGBzdGFydEluZGV4YCBhcmUgZGVmaW5lZC5cblx0XHRpZiAoIShcInRleHRcIiBpbiB0aGlzKSkgdGhpcy50ZXh0ID0gXCJcIjtcblx0XHRpZiAoIShcInN0YXJ0SW5kZXhcIiBpbiB0aGlzKSkgdGhpcy5zdGFydEluZGV4ID0gMDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBpbW11dGFibGUgY2xvbmUgb2YgdGhlIHN0cmVhbS5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRyZXR1cm4gbmV3IFRleHRTdHJlYW0odGhpcywgcHJvcHMpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jZWQgdG8gbmV3IHN0YXJ0SW5kZXguXG5cdGFkdmFuY2VUbyhzdGFydEluZGV4KSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4IH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jaW5nIHN0YXJ0SW5kZXggQlkgYGxlbmd0aGBcblx0YWR2YW5jZUJ5KGxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuXHR9XG5cbi8vIFx0Ly8gUmV0dXJuIGNsb25lIG9mIHRoaXMgc3RyZWFtIHdpdGggZW5kSW5kZXggc2V0IHRvIHN0YXJ0ICsgYGxlbmd0aGBcbi8vIFx0ZW5kQWZ0ZXIobGVuZ3RoKSB7XG4vLyBcdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBlbmRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuLy8gXHR9XG5cbi8vXG4vLyAjIyBNYXRjaGluZ1xuLy9cblx0Ly8gTWF0Y2ggYHBhdHRlcm5gIGFzIHJlZ2V4IGluIHRoaXMgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG1hdGNoIG9yIGB1bmRlZmluZWRgLlxuXHQvLyBJZiB5b3Ugd2FudCB0byB0ZXN0IHRoZSBzdGFydCBvZiB0aGUgc3RyZWFtLFxuXHQvL1x0bWFrZSBzdXJlIHlvdXIgcmVnZXggc3RhcnRzIHdpdGggYF5gLlxuXHQvLyBURVNUTUU6IHRoaXMgbGlrZWx5IGJyZWFrcyB3aXRoIGEgYGdgIG9uIHRoZSBwYXR0ZXJuP1xuXHRtYXRjaChwYXR0ZXJuKSB7XG5cdFx0aWYgKCEocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHRocm93IG5ldyBUeXBlRXJyb3IoYFRleHRTdHJlYW0ubWF0Y2goJHtwYXR0ZXJufSk6IGV4cGVjdGVkIFJlZ0V4cGApO1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5tYXRjaChwYXR0ZXJuKSB8fCB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBEb2VzIHRoaXMgc3RyZWFtIElOQ0xVREUgYSByZWdleCB3aXRoaW4gaXQ/XG5cdC8vIFJldHVybnMgYHRydWVgIG9yIGBmYWxzZWAuXG5cdC8vIE5PVEU6IFBhdHRlcm4gbXVzdCBOT1Qgc3RhcnQgd2l0aCBgXmAgZm9yIHRoaXMgdG8gbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLlxuXHR0ZXN0KHBhdHRlcm4pIHtcblx0XHRyZXR1cm4gcGF0dGVybi50ZXN0KHRoaXMuaGVhZCk7XG5cdH1cblxuLy9cbi8vICMjIFJlZmxlY3Rpb25cbi8vXG5cdC8vIFJldHVybiB0ZXh0IG9mIHN0cmluZyBzdGFydGluZyBhdCBvdXIgYHN0YXJ0SW5kZXhgXG5cdGdldCBoZWFkKCkge1xuXHRcdHJldHVybiB0aGlzLnJhbmdlKCk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSByYW5nZSBvZiB0aGUgc3RyaW5nIGZyb20gYHN0YXJ0SW5kZXhgIHRvIGBlbmRJbmRleGAgTk9OLWluY2x1c2l2ZS5cblx0cmFuZ2Uoc3RhcnRJbmRleCA9IHRoaXMuc3RhcnRJbmRleCwgZW5kSW5kZXggPSB0aGlzLmVuZEluZGV4IHx8IHRoaXMudGV4dC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0LnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmRJbmRleCk7XG5cdH1cblxuXHQvLyBMZW5ndGggb2YgdGhlIHN0cmVhbS5cblx0Z2V0IGxlbmd0aCgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0Lmxlbmd0aDtcblx0fVxuXG5cdC8vIEFyZSB3ZSBhdCB0aGUgZW5kIG9mIHRoZSBzdHJlYW0/XG5cdGdldCBpc0VtcHR5KCkge1xuXHRcdHJldHVybiB0aGlzLnN0YXJ0SW5kZXggPT09IHRoaXMubGVuZ3RoO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dFxuXHR9O1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1RleHRTdHJlYW0uanMiLCJpbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gbG9hZCBzdGFuZGFyZCBydWxlcyBmaWxlcyBoZXJlXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbnVtYmVyc1wiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vaWZcIjtcbmltcG9ydCBcIi4vc3RhdGVtZW50c1wiO1xuaW1wb3J0IFwiLi90eXBlc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiLy8gTWVtb2l6ZS9mb3JnZXQgc2VtYW50aWNzLlxuXG4vLyBSZXR1cm4gYSBtZW1vaXppbmcgZ2V0dGVyIGZ1bmN0aW9uLlxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXNbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGdldHRlci5hcHBseSh0aGlzKTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIERlZmluZSBzbyB0aGF0IHdlIGNhbiBiZSBkZWxldGVkIGFuZCByZS1kZWZpbmVkLCBidXQgbm90IHNldCBvciBlbnVtZXJhdGVkLlxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcGVydHksIHsgdmFsdWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXNbcHJvcGVydHldO1xuXHR9XG59XG5cblxuLy8gUmV0dXJuIGEgbWVtb2l6ZSBmdW5jdGlvbiBmb3IgdXNlIGFzIGEgZ2V0dGVyIGluIGEgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYFxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4ge1xuXHRcdGdldCA6IG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpXG5cdH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9tZW1vaXplLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiaWZcIixcblx0XCJpZiB7ZXhwcmVzc2lvbn0gKHRoZW58Oik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBpZl8gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblxuXHRcdFx0aWYgKHN0YXRlbWVudCkgcmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGlmICgke2V4cHJlc3Npb259KWBcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiYmFja3dhcmRzX2lmXCIsXG5cdFwie3N0YXRlbWVudH0gaWYge2V4cHJlc3Npb259IChlbHNlUGhyYXNlOihlbHNlfG90aGVyd2lzZSkge3N0YXRlbWVudH0pP1wiLFxuXHRjbGFzcyBiYWNrd2FyZHNfaWYgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgc3RhdGVtZW50LCBlbHNlUGhyYXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblx0XHRcdGxldCBlbHNlU3RhdGVtZW50ID0gZWxzZVBocmFzZSAmJiBlbHNlUGhyYXNlLnJlc3VsdHMuc3RhdGVtZW50LnRvU291cmNlKCk7XG5cblx0XHRcdGlmIChlbHNlU3RhdGVtZW50KSByZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9IGVsc2UgeyAke2Vsc2VTdGF0ZW1lbnR9IH1gXG5cdFx0XHRyZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZWxzZV9pZlwiLFxuXHRcIihlbHNlfG90aGVyd2lzZSkgaWYge2V4cHJlc3Npb259ICh0aGVufDopIHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBlbHNlX2lmIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGVsc2UgaWYgKCR7ZXhwcmVzc2lvbn0pYFxuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJlbHNlXCIsXG5cdFwiKGVsc2V8b3RoZXJ3aXNlKSB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZWxzZV8gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgZWxzZWBcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaWYuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBudW1iZXJzXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vLyBJbmRleCBleHByZXNzaW9uOiBudW1lcmljIGluZGV4IGluIHNvbWUgbGlzdC5cbi8vIE5PVEU6IE91ciBpbmRleGVzIGFyZSAqKjEtYmFzZWQqKiBhbmQgSmF2YXNjcmlwdCBpcyAqKjAtYmFzZWQqKi5cbi8vXHRcdCBlLmcuIGBpdGVtIDEgb2YgdGhlIGFycmF5YCAgPSBgYXJyYXlbMF1gXG4vL1xuLy8gVE9ETzogaWYgYGlkZW50aWZpZXJgIGlzIFwid29yZFwiLCBvdXRwdXQgYGdldFdvcmQoKWAgZXRjXG5jbGFzcyBpbmRleF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9ue1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IHsgaWRlbnRpZmllciwgaW5kZXgsIGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRpbmRleCA9IGluZGV4LnRvU291cmNlKGNvbnRleHQpO1xuXG5cdFx0Ly8gSWYgd2UgZ290IGEgcG9zaXRpdmUgbnVtYmVyIGxpdGVyYWwsIGNvbXBlbnNhdGUgZm9yIEpTIDAtYmFzZWQgYXJyYXlzIG5vdyxcblx0XHQvLyBmb3IgbmljZXIgb3V0cHV0LlxuXHRcdGlmICh0eXBlb2YgaW5kZXggPT09IFwibnVtYmVyXCIgJiYgaW5kZXggPiAwKSB7XG5cdFx0XHRyZXR1cm4gYCR7ZXhwcmVzc2lvbn1bJHtpbmRleCAtIDF9XWA7XG5cdFx0fVxuXHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke2luZGV4fSlgO1xuXG4vLyBUaGlzIGlzIHNhZmVyLCBidXQgdXNpbmcgdGhlIGFib3ZlIHNvbWV0aW1lcyBmb3IgZGVtbyBwdXJwb3Nlc1xuLy9cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7aW5kZXh9KWA7XG5cdH1cbn1cblxuLy8gTnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZzpcbi8vXHQtIGBpdGVtIDEgb2YgLi4uYFxuLy9cdC0gYGl0ZW0gIzIgb2YgLi4uYFxuLy8gTk9URTogdGhlc2UgaW5kaWNlcyBhcmUgT05FIGJhc2VkLCBOT1QgemVybyBiYXNlZCBhcyBpcyBKYXZhc2NyaXB0LlxucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJpbmRleF9leHByZXNzaW9uXCIsIFwie2lkZW50aWZpZXJ9ICgjKT97aW5kZXg6ZXhwcmVzc2lvbn0gb2Yge2V4cHJlc3Npb259XCIsIGluZGV4X2V4cHJlc3Npb24pO1xuXG5jbGFzcyBvcmRpbmFsIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHt9XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaXJzdFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2Vjb25kXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJ0aGlyZFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAzIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZm91cnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDQgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaWZ0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA1IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2l4dGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNiB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNldmVudGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNyB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImVpZ2h0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA4IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwibmludGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gOSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInRlbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDEwIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwicGVudWx0aW1hdGVcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaW5hbFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAtMSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImxhc3RcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cbi8vIFRPRE86IHNpeHR5LWZpZnRoLCB0d28gaHVuZHJlZCBmb3J0eSBuaW50aC4uLlxuXG4vLyBBbHRlcm5hdGl2ZSBmb3JtIGZvciBudW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nLlxucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJpbmRleF9leHByZXNzaW9uXCIsIFwidGhlIHtpbmRleDpvcmRpbmFsfSB7aWRlbnRpZmllcn0gb2Yge2V4cHJlc3Npb259XCIsIGluZGV4X2V4cHJlc3Npb24pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvbnVtYmVycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgaW5maXggYW5kIHByZWZpeCBvcGVyYXRvcnMuXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8jIyBJbmZpeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj4ge3Joc31gLCBlZzogYGEgaXMgMWBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgdHdvIGFyZ3VtZW50cyAoYGxoc2AgYW5kIGByaHNgKSBpbnRvIG91dHB1dC5cblxuLy8gTk9URTogYHByZWNlZGVuY2VgIG51bWJlcnMgY29tZSBmcm9tIEphdmFzY3JpcHQgZXF1aXZhbGVudHNcbi8vXHRcdCBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9PcGVyYXRvcnMvT3BlcmF0b3JfUHJlY2VkZW5jZVxuXG5jbGFzcyBpbmZpeF9vcGVyYXRvciBleHRlbmRzIFJ1bGUuQWx0ZXJuYXRpdmVzIHtcblxuLy8gTk9URTogRm9yIHRoZSBvcGVyYXRvcnMgdGhlbXNlbHZlcywgd2UgcmVhbGx5IHdhbnQgdG8ganVzdCB1c2UgbG9uZ2VzdCBtYXRjaC5cbi8vIFx0XHQgV2Ugd2FudCB0byBwdXNoIHRoZSBwcmVjZWRlbmNlIHVwIHRvIHRoZSBleHByZXNzaW9uIGFuZCBldmFsdWF0ZSBkaWZmZXJlbnQgZXhwcmVzc2lvbnMgYmFzZWQgb24gdGhhdC5cbi8vIFx0Ly8gRmluZCBiZXN0IG1hdGNoIGFjY29yZGluZyB0byBvcGVyYXRvciBwcmVjZWRlbmNlIGFzIGRlZmluZWQgYmVsb3cuXG4vLyBcdGdldEJlc3RNYXRjaChtYXRjaGVzKSB7XG4vLyBcdFx0Y29uc29sZS53YXJuKFwiR0JNXCIsIG1hdGNoZXMsIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLnByZWNlZGVuY2UpLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5tYXRjaGVkVGV4dCkpO1xuLy8gXHRcdHJldHVybiBtYXRjaGVzLnJlZHVjZShmdW5jdGlvbiAoYmVzdCwgbmV4dCkge1xuLy8gXHRcdFx0Ly8gdGFrZSBoaWdoZXN0IHByZWNlZGVuY2UgbWF0Y2ggZmlyc3Rcbi8vIFx0XHRcdGlmIChuZXh0LnByZWNlZGVuY2UgPiBiZXN0LnByZWNlZGVuY2UpIHJldHVybiBuZXh0O1xuLy8gXHRcdFx0Ly8gdGFrZSBsb25nZXN0IG1hdGNoIGlmIHNhbWUgcHJlY2VkZW5jZVxuLy8gXHRcdFx0aWYgKG5leHQucHJlY2VkZW5jZSA9PT0gYmVzdC5wcmVjZWRlbmNlKSB7XG4vLyBcdFx0XHRcdGlmIChuZXh0LmVuZEluZGV4ID4gYmVzdC5lbmRJbmRleCkgcmV0dXJuIG5leHQ7XG4vLyBcdFx0XHR9XG4vLyBcdFx0XHRyZXR1cm4gYmVzdDtcbi8vIFx0XHR9LCBtYXRjaGVzWzBdKTtcbi8vIFx0fVxufVxuXG5wYXJzZXIuYWRkUnVsZShcImluZml4X29wZXJhdG9yXCIsIG5ldyBpbmZpeF9vcGVyYXRvcigpKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImFuZFwiLFxuXHRjbGFzcyBhbmQgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gNjsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAmJiAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwib3JcIixcblx0Y2xhc3Mgb3IgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gNTsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSB8fCAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXNcIixcblx0IGNsYXNzIGlzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90XCIsXG5cdCBjbGFzcyBpc19ub3QgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT0gJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGV4YWN0bHlcIixcblx0Y2xhc3MgaXNfZXhhY3RseSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PT0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgZXhhY3RseVwiLFxuXHQgY2xhc3MgIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9PSAke2J9KWAgfSB9XG4pO1xuXG4vL1RPRE86IGBzcGVsbC5pc09mVHlwZSh0aGluZywgdHlwZSlgXG4vL1RPRE86IGBpcyBzYW1lIHR5cGUgYXNgID9cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBhXCIsXG5cdCBjbGFzcyBpc19hIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBhblwiLFxuXHQgY2xhc3MgaXNfYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGBzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGFcIixcblx0IGNsYXNzIGlzX25vdF9hIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGFuXCIsXG5cdCBjbGFzcyBpc19ub3RfYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGAhc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcblxuLy9UT0RPOiBgc3BlbGwuY29udGFpbnMoY29sbGVjdGlvbiwgdGhpbmcpYFxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGluXCIsXG5cdCBjbGFzcyBpc19pbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgb25lIG9mXCIsXG5cdCBjbGFzcyBpc19vbmVfb2YgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGluXCIsXG5cdCBjbGFzcyBpc19ub3RfaW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3Qgb25lIG9mXCIsXG5cdCBjbGFzcyBpc19ub3Rfb25lX29mIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cblxuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaW5jbHVkZXNcIixcblx0IGNsYXNzIGluY2x1ZGVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJjb250YWluc1wiLFxuXHQgY2xhc3MgY29udGFpbnMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiZG9lcyBub3QgaW5jbHVkZVwiLFxuXHQgY2xhc3MgZG9lc19ub3RfaW5jbHVkZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImRvZXMgbm90IGNvbnRhaW5cIixcblx0IGNsYXNzIGRvZXNfbm90X2NvbnRhaW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCI+XCIsXG5cdCBjbGFzcyBndCBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGdyZWF0ZXIgdGhhblwiLFxuXHQgY2xhc3MgaXNfZ3JlYXRlcl90aGFuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCI+PVwiLFxuXHQgY2xhc3MgZ3RlIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0b1wiLFxuXHQgY2xhc3MgaXNfZ3RlIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPFwiLFxuXHQgY2xhc3MgbHQgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDwgJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBsZXNzIHRoYW5cIixcblx0IGNsYXNzIGlzX2xlc3NfdGhhbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDwgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPD1cIixcblx0IGNsYXNzIGx0ZSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPD0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG9cIixcblx0IGNsYXNzIGlzX2x0ZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9IH1cbik7XG5cblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiXFxcXCtcIixcblx0IGNsYXNzIHBsdXMgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMzsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKyAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwicGx1c1wiLFxuXHQgY2xhc3MgcGx1cyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMzsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKyAke2J9YCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIi1cIixcblx0IGNsYXNzIG1pbnVzIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcIm1pbnVzXCIsXG5cdCBjbGFzcyBtaW51cyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMzsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLSAke2J9YCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIlxcXFwqXCIsXG5cdCBjbGFzcyB0aW1lcyBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJ0aW1lc1wiLFxuXHQgY2xhc3MgdGltZXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTQ7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICogJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCIvXCIsXG5cdCBjbGFzcyBkaXZpZGVkX2J5IGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTQ7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC8gJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImRpdmlkZWQgYnlcIixcblx0IGNsYXNzIGRpdmlkZWRfYnkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTQ7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC8gJHtifWAgfSB9XG4pO1xuXG4vL1RPRE86ICBgKz1gIGV0Yz8gIG90aGVyIG1hdGggZnVuY3Rpb25zP1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6aW5maXhfb3BlcmF0b3J9IHtyaHM6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Ly8gV2UgQ0FOTk9UIG1hdGNoIGlmIGBpbmZpeF9vcGVyYXRvcmAgaXNuJ3QgZm91bmQgaW4gdGhlIGV4cHJlc3Npb24uXG5cdFx0dGVzdFJ1bGUgPSBcImluZml4X29wZXJhdG9yXCI7XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaHMsIHJocywgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGxocy50b1NvdXJjZShjb250ZXh0KSwgcmhzLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIyMgUG9zdGlmeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj5gLCBlLmcuIGBhIGlzIGRlZmluZWRgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBKUyBvdXRwdXQuXG5cbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIGRlZmluZWRcIixcblx0Y2xhc3MgaXNfZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ICE9PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBkZWZpbmVkXCIsXG5cdGNsYXNzIGlzX25vdF9kZWZpbmVkIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gPT09ICd1bmRlZmluZWQnKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgdW5kZWZpbmVkXCIsXG5cdGNsYXNzIGlzX3VuZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcblxuXG4vL1RPRE86IGBzcGVsbC5pc0VtcHR5KHRoaW5nKWBcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIGVtcHR5XCIsXG5cdGNsYXNzIGlzX2VtcHR5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYHNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgZW1wdHlcIixcblx0Y2xhc3MgaXNfbm90X2VtcHR5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCFzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwb3N0Zml4X29wZXJhdG9yX2V4cHJlc3Npb25cIixcblx0XCJ7ZXhwcmVzc2lvbn0ge29wZXJhdG9yOnBvc3RmaXhfb3BlcmF0b3J9XCIsXG5cdGNsYXNzIHBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHQvLyBXZSBDQU5OT1QgbWF0Y2ggaWYgYHBvc3RmaXhfb3BlcmF0b3JgIGlzbid0IGZvdW5kIGluIHRoZSBleHByZXNzaW9uLlxuXHRcdHRlc3RSdWxlID0gXCJwb3N0Zml4X29wZXJhdG9yXCI7XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBvcGVyYXRvciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIG9wZXJhdG9yLnRvSlMoZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy9cbi8vXHQjIyBSZXR1cm5zXG4vL1xuXG4vLyBSZXR1cm4gYSB2YWx1ZVxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJyZXR1cm5fc3RhdGVtZW50XCIsIFwicmV0dXJuIHtleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByZXR1cm5fc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBgcmV0dXJuICR7ZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KX1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vXG4vL1x0IyMgQXNzaWdubWVudFxuLy9cbmNsYXNzIGFzc2lnbm1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCB7IHRoaW5nLCB2YWx1ZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdGlmICh0aGluZyBpbnN0YW5jZW9mIFJ1bGUuSWRlbnRpZmllcikge1xuXHRcdFx0Ly8gVE9ETzogZGVjbGFyZSBpZGVudGlmaWVyIGlmIG5vdCBpbiBzY29wZSwgZXRjXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGAke3RoaW5nLnRvU291cmNlKGNvbnRleHQpfSA9ICR7dmFsdWUudG9Tb3VyY2UoY29udGV4dCl9YDtcblx0fVxufVxuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJ7dGhpbmc6ZXhwcmVzc2lvbn0gPSB7dmFsdWU6ZXhwcmVzc2lvbn1cIiwgYXNzaWdubWVudCk7XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJzZXQge3RoaW5nOmV4cHJlc3Npb259IHRvIHt2YWx1ZTpleHByZXNzaW9ufVwiLCBhc3NpZ25tZW50KTtcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYXNzaWdubWVudFwiLCBcInB1dCB7dmFsdWU6ZXhwcmVzc2lvbn0gaW50byB7dGhpbmc6ZXhwcmVzc2lvbn1cIiwgYXNzaWdubWVudCk7XG5cblxuLy9cbi8vXHQjIyBVc2VyIGludGVyYWN0aW9uXG4vL1xuXG4vLyBBbGVydCBhIG1lc3NhZ2UuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFsZXJ0XCIsIFwiYWxlcnQge21lc3NhZ2U6ZXhwcmVzc2lvbn0gKGJ1dHRvbkNsYXVzZTp3aXRoIHt0ZXh0fSk/XCIsXG5cdGNsYXNzIGFsZXJ0IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG1lc3NhZ2UsIGJ1dHRvbkNsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bWVzc2FnZSA9IG1lc3NhZ2UudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgYnV0dG9uTmFtZSA9IGJ1dHRvbkNsYXVzZSA/IGJ1dHRvbkNsYXVzZS5yZXN1bHRzLnRleHQudG9Tb3VyY2UoY29udGV4dCkgOiAnXCJPS1wiJztcblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwuYWxlcnQoJHttZXNzYWdlfSwgJHtidXR0b25OYW1lfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gV2FybmluZyBtZXNzYWdlIC0tIGxpa2UgYWxlcnQgYnV0IGZhbmNpZXIuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcIndhcm5cIiwgXCJ3YXJuIHtleHByZXNzaW9uOmV4cHJlc3Npb259IChidXR0b25DbGF1c2U6d2l0aCB7dGV4dH0pP1wiLFxuXHRjbGFzcyB3YXJuIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG1lc3NhZ2UsIGJ1dHRvbkNsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bWVzc2FnZSA9IG1lc3NhZ2UudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgYnV0dG9uTmFtZSA9IGJ1dHRvbkNsYXVzZSA/IGJ1dHRvbkNsYXVzZS5yZXN1bHRzLnRleHQudG9Tb3VyY2UoY29udGV4dCkgOiAnXCJPS1wiJztcblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwud2Fybigke21lc3NhZ2V9LCAke2J1dHRvbk5hbWV9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIENvbmZpcm0gbWVzc2FnZSAtLSBwcmVzZW50IGEgcXVlc3Rpb24gd2l0aCB0d28gYW5zd2Vycy5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiY29uZmlybVwiLCBcImNvbmZpcm0ge21lc3NhZ2U6ZXhwcmVzc2lvbn0gKGJ1dHRvbkNsYXVzZTp3aXRoIHtva0J1dHRvbjp0ZXh0fSAoY2FuY2VsQ2xhdXNlOiAoYW5kfG9yKSB7Y2FuY2VsQnV0dG9uOnRleHR9KT8gKT9cIixcblx0Y2xhc3MgY29uZmlybSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBidXR0b25DbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IG9rQnV0dG9uID0gJ1wiT0tcIicsIGNhbmNlbEJ1dHRvbiA9ICdcIkNhbmNlbFwiJztcblxuXHRcdFx0aWYgKGJ1dHRvbkNsYXVzZSkge1xuXHRcdFx0XHRva0J1dHRvbiA9IGJ1dHRvbkNsYXVzZS5yZXN1bHRzLm9rQnV0dG9uLnJlc3VsdHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRcdGxldCBjYW5jZWxDbGF1c2UgPSBidXR0b25DbGF1c2UucmVzdWx0cy5jYW5jZWxDbGF1c2U7XG5cdFx0XHRcdGlmIChjYW5jZWxDbGF1c2UpIGNhbmNlbEJ1dHRvbiA9IGNhbmNlbENsYXVzZS5yZXN1bHRzLmNhbmNlbEJ1dHRvbi5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGBhd2FpdCBzcGVsbC5jb25maXJtKCR7bWVzc2FnZX0sICR7b2tCdXR0b259LCAke2NhbmNlbEJ1dHRvbn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvc3RhdGVtZW50cy5qcyIsImltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5pbXBvcnQgXCIuL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vcnVsZXMvaW5kZXguanNcIjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdHdpbmRvdy5UZXh0U3RyZWFtID0gVGV4dFN0cmVhbTtcblx0d2luZG93LlBhcnNlciA9IFBhcnNlcjtcblx0d2luZG93LlJ1bGUgPSBSdWxlO1xuXHR3aW5kb3cucGFyc2VyID0gcGFyc2VyO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7XG5cdFRleHRTdHJlYW0sIFBhcnNlciwgUnVsZSwgcGFyc2VyXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9pbmRleC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVmaW5pbmcgY2xhc3NlcyAoa25vd24gYXMgYHR5cGVzYClcbi8vXG5pbXBvcnQgZ2xvYmFsIGZyb20gXCIuLi9nbG9iYWxcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vLyBERUFEIFNJTVBMRSBQTFVSQUxJWkVSLi4uIFJFQUxMWSBOT1QgVkVSWSBHT09EXG5mdW5jdGlvbiBwbHVyYWxpemUod29yZCkge1xuXHRyZXR1cm4gd29yZCArIFwic1wiO1xufVxuXG5cbi8vTU9WRSBUTyBgb2JqZWN0c2A/XG4vLyBQcm9wZXJ0aWVzIGNsYXVzZTogY3JlYXRlcyBhbiBvYmplY3Qgd2l0aCBvbmUgb3IgbW9yZSBwcm9wZXJ0eSB2YWx1ZXMuXG4vL1x0YGZvbyA9IDEsIGJhciA9IDJgXG4vL1RPRE86IHdvdWxkIGxpa2UgdG8gdXNlIGBhbmRgIGJ1dCB0aGF0IHdpbGwgYmFyZiBvbiBleHByZXNzaW9ucy4uLlxuLy9UT0RPOiBob3cgdG8gZG8gcHJvcGVydGllcyBvbiBtdWx0aXBsZSBsaW5lcz9cbnBhcnNlci5hZGRMaXN0KFxuXHRcIm9iamVjdF9saXRlcmFsX3Byb3BlcnRpZXNcIixcblx0XCJbKHtpZGVudGlmaWVyfSA9IHtleHByZXNzaW9ufSkgLF1cIixcblx0Y2xhc3Mgb2JqZWN0X2xpdGVyYWxfcHJvcGVydGllcyBleHRlbmRzIFJ1bGUuTGlzdCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHByb3BzID0gdGhpcy5yZXN1bHRzLm1hdGNoZWQubWFwKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRcdFx0bGV0IHsgaWRlbnRpZmllciwgZXhwcmVzc2lvbiB9ID0gcHJvcC5yZXN1bHRzO1xuXHRcdFx0XHRcdGxldCBrZXkgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0XHRcdGxldCB2YWx1ZSA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRcdFx0cmV0dXJuIGBcIiR7a2V5fVwiOiAke3ZhbHVlfWBcblx0XHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYHsgJHtwcm9wcy5qb2luKFwiLCBcIil9IH1gO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gYG5ld2Bcbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGFsbCB0eXBlcyB0YWtlIGFuIG9iamVjdCBvZiBwcm9wZXJ0aWVzPz8/P1xucGFyc2VyLmFkZFNlcXVlbmNlKFxuXHRcIm5ld190aGluZ1wiLFxuXHRcIihjcmVhdGV8bmV3KSB7dHlwZX0gKHByb3BzX2NsYXVzZTp3aXRoIHtwcm9wczpvYmplY3RfbGl0ZXJhbF9wcm9wZXJ0aWVzfSk/XCIsXG5cdGNsYXNzIG5ld190aGluZyBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHR5cGUsIHByb3BzX2NsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0dHlwZSA9IHR5cGUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgcHJvcHMgPSBwcm9wc19jbGF1c2UgJiYgcHJvcHNfY2xhdXNlLnJlc3VsdHMucHJvcHMudG9Tb3VyY2UoY29udGV4dCkgfHwgXCJcIjtcblxuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBvYmplY3QsIHdoaWNoIHdlJ2xsIGNyZWF0ZSB3aXRoIGFuIG9iamVjdCBsaXRlcmFsLlxuXHRcdFx0aWYgKHR5cGUgPT09IFwiT2JqZWN0XCIpIHtcblx0XHRcdFx0aWYgKCFwcm9wc19jbGF1c2UpIHJldHVybiBcInt9XCI7XG5cdFx0XHRcdHJldHVybiBgJHtwcm9wc31gO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYG5ldyAke3R5cGV9KCR7cHJvcHN9KWA7XG5cdFx0fVxuXHR9XG4pO1xuLy8gVGhpcyB3b3JrcyBhcyBhbiBleHByZXNzaW9uIE9SIGEgc3RhdGVtZW50LlxucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHBhcnNlci5ydWxlcy5uZXdfdGhpbmcpO1xucGFyc2VyLmFkZFJ1bGUoXCJzdGF0ZW1lbnRcIiwgcGFyc2VyLnJ1bGVzLm5ld190aGluZyk7XG5cblxuXG5cbi8vIERlZmluZSBjbGFzcy5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVmaW5lX3R5cGVcIixcblx0XCJkZWZpbmUgdHlwZSB7dHlwZX0gKGV4dGVuZHNfY2xhdXNlOmFzIChhfGFuKSB7c3VwZXJUeXBlOnR5cGV9KT9cIixcblx0Y2xhc3MgZGVmaW5lX3R5cGUgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdHlwZSwgZXh0ZW5kc19jbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHR5cGUgPSB0eXBlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHN1cGVyVHlwZSA9IGV4dGVuZHNfY2xhdXNlICYmIGV4dGVuZHNfY2xhdXNlLnJlc3VsdHMuc3VwZXJUeXBlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0aWYgKHN1cGVyVHlwZSkge1xuXHRcdFx0XHRyZXR1cm4gYGNsYXNzICR7dHlwZX0gZXh0ZW5kcyAke3N1cGVyVHlwZX1gO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGBjbGFzcyAke3R5cGV9YDtcblxuXHRcdH1cblx0fVxuKTtcblxuLy9UT0RPOiBjb25zdHJ1Y3RvclxuXG5cblxuLy9NT1ZFIFRPIGBmdW5jdGlvbnNgP1xuLy8gQXJndW1lbnRzIGNsYXVzZSBmb3IgbWV0aG9kc1xuLy9cdGB3aXRoIGZvb2Agb3IgYHdpdGggZm9vIGFuZCBiYXIgYW5kIGJhemBcbi8vVE9ETzoge2lkZW50aWZpZXJ9ID0ge2V4cHJlc3Npb259XHQ9PiByZXF1aXJlcyBgLGAgaW5zdGVhZCBvZiBgYW5kYFxuLy9UT0RPOiBgd2l0aCBmb28gYXMgVHlwZWBcbi8vVE9ETzpcdGB3aXRoIGZvby4uLmAgZm9yIHNwbGF0P1xucGFyc2VyLmFkZFNlcXVlbmNlKFxuXHRcImFyZ3NfY2xhdXNlXCIsXG5cdFwid2l0aCBbYXJnczp7aWRlbnRpZmllcn0gLF1cIixcblx0Y2xhc3MgYXJnc19jbGF1c2UgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHQvLyBSZXR1cm4ganVzdCB0aGUgYXJndW1lbnRzIGFzIHRoZSByZXN1bHRzXG5cdFx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0XHRyZXR1cm4gc3VwZXIucmVzdWx0cy5hcmdzO1xuXHRcdH1cblxuXHRcdC8vIFJldHVybiBqdXN0IHRoZSBhcmd1bWVudCBuYW1lcyBhcyBhbiBhcnJheVxuXHRcdGdldCBhcmdOYW1lcygpIHtcblx0XHRcdHJldHVybiB0aGlzLnJlc3VsdHMubWF0Y2hlZC5tYXAoYXJnID0+IGFyZy5tYXRjaGVkKTtcblx0XHR9XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5hcmdOYW1lcy5qb2luKFwiLCBcIik7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIERlY2xhcmUgaW5zdGFuY2UgbWV0aG9kIG9yIG5vcm1hbCBmdW5jdGlvbi5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9tZXRob2RcIixcblx0XCIodG98b24pIHtpZGVudGlmaWVyfSB7YXJnc19jbGF1c2V9PyAoXFxcXDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZGVjbGFyZV9tZXRob2QgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJnc19jbGF1c2UsIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBhcmdzID0gKGFyZ3NfY2xhdXNlICYmIGFyZ3NfY2xhdXNlLnRvU291cmNlKGNvbnRleHQpKSB8fCBcIlwiO1xuXHRcdFx0c3RhdGVtZW50ID0gKHN0YXRlbWVudCA/IGAgeyAke3N0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KX0gfWAgOiBcIlwiKTtcblxuXHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pJHtzdGF0ZW1lbnR9YFxuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBEZWNsYXJlIFwiYWN0aW9uXCIsIHdoaWNoIGNhbiBiZSBjYWxsZWQgZ2xvYmFsbHkgYW5kIGFmZmVjdHMgdGhlIHBhcnNlci5cbi8vIFRPRE86IGB3aXRoYCBjbGF1c2UgKHdpbGwgY29uZmxpY3Qgd2l0aCBgd29yZGApXG4vLyBUT0RPOiBpbnN0YWxsIGluIHBhcnNlciBzb21laG93XG4vLyBUT0RPOiBjcmVhdGUgaW5zdGFuY2UgZnVuY3Rpb24/ICBvciBtYXliZSB3ZSBkb24ndCBuZWVkIGl0OlxuLy9cdFx0XHRgYWN0aW9uIHR1cm4gQ2FyZCBvdmVyYCBmb3IgYW4gaW5zdGFuY2UgaXMganVzdCBgdHVybiBtZSBvdmVyYFxuLy9cdFx0XHRgYWN0aW9uIGFkZCBjYXJkIHRvIGRlY2tgID0+IGBhZGQgbWUgdG8gZGVja2Bcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfYWN0aW9uXCIsXG5cdFwiYWN0aW9uICh3b3JkX2NsYXVzZTp7d29yZH18e3R5cGV9KSsgKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGRlY2xhcmVfYWN0aW9uIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgd29yZF9jbGF1c2UsIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bGV0IHdvcmRzID0gd29yZF9jbGF1c2UubWF0Y2hlZC5tYXAoIHdvcmQgPT4gd29yZC50b1NvdXJjZShjb250ZXh0KSApO1xuXHRcdFx0Ly8gaWYgdGhlcmUncyBvbmx5IG9uZSB3b3JkLCBpdCBjYW4ndCBiZSBhIGJsYWNrbGlzdGVkIGlkZW50aWZpZXIgb3IgYSB0eXBlXG5cdFx0XHRpZiAod29yZHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdHZhciB3b3JkID0gd29yZHNbMF07XG5cdFx0XHRcdGlmICh3b3JkX2NsYXVzZS5tYXRjaGVkIGluc3RhbmNlb2YgUnVsZS5UeXBlKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZSgnZGVjbGFyZV9hY3Rpb24nKTogb25lLXdvcmQgYWN0aW9ucyBtYXkgbm90IGJlIHR5cGVzOiAke3dvcmR9YCk7XG5cdFx0XHRcdH1cblxuLy8gSEFDSzogYGdsb2JhbC5wYXJzZXJgIGlzIGEgaGFjayBoZXJlIGZvciBjb252ZW5pZW5jZSBpbiB0ZXN0aW5nLi4uXG5cdFx0XHRcdGxldCBwYXJzZXIgPSBjb250ZXh0ID8gY29udGV4dC5wYXJzZXIgOiBnbG9iYWwucGFyc2VyO1xuXHRcdFx0XHRpZiAocGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYmxhY2tsaXN0W3dvcmRdKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZSgnZGVjbGFyZV9hY3Rpb24nKTogb25lLXdvcmQgYWN0aW9ucyBtYXkgbm90IGJlIGJsYWNrbGlzdGVkIGlkZW50aWZpZXJzXCI6ICR7d29yZH1gKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBmaWd1cmUgb3V0IGFyZ3VtZW50cyBhbmQvb3IgdHlwZXNcblx0XHRcdHZhciBhcmdzID0gW107XG5cdFx0XHR2YXIgdHlwZXMgPSBbXTtcblx0XHRcdC8vIGlmIGFueSBvZiB0aGUgd29yZHMgYXJlIHR5cGVzIChjYXBpdGFsIGxldHRlcikgbWFrZSB0aGF0IGFuIGFyZ3VtZW50IG9mIHRoZSBzYW1lIG5hbWUuXG5cdFx0XHR3b3JkX2NsYXVzZS5tYXRjaGVkLm1hcCggKGl0ZW0sIGluZGV4KSA9PiB7XG5cdFx0XHRcdGlmIChpdGVtIGluc3RhbmNlb2YgUnVsZS5UeXBlKSB7XG5cdFx0XHRcdFx0bGV0IHR5cGUgPSB3b3Jkc1tpbmRleF07XG5cdFx0XHRcdFx0bGV0IHdvcmQgPSB0eXBlLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFx0dHlwZXMucHVzaChbdHlwZSwgd29yZF0pO1xuXHRcdFx0XHRcdHdvcmRzW2luZGV4XSA9IHdvcmQ7XG5cdFx0XHRcdFx0YXJncy5wdXNoKHdvcmQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdC8vIGdldCBzdGF0aWMgbWV0aG9kIG5hbWUgYW5kIGFyZ3VtZW50cyBmb3Igb3V0cHV0XG5cdFx0XHRsZXQgbWV0aG9kTmFtZSA9IHdvcmRzLmpvaW4oXCJfXCIpO1xuXHRcdFx0YXJncyA9IGFyZ3Muam9pbihcIiwgXCIpO1xuXG5cdFx0XHQvLyBmaWd1cmUgb3V0IGlmIHRoZXJlIGFyZSBhbnkgY29uZGl0aW9ucyBvbiB0aGUgYWJvdmVcblx0XHRcdGxldCBjb25kaXRpb25zID0gdHlwZXMubWFwKCAoW3R5cGUsIHdvcmRdKSA9PiB7XG5cdFx0XHRcdHJldHVybiBgXFx0aWYgKCFzcGVsbC5pc0EoJHt3b3JkfSwgJHt0eXBlfSkpIHJldHVybiB1bmRlZmluZWRgO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIGdldCBzdGF0ZW1lbnRzLCBhZGRpbmcgY29uZGl0aW9ucyBpZiBuZWNlc3Nhcnlcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IFwiXCI7XG5cdFx0XHRsZXQgc3RhdGVtZW50cyA9IFwiXCI7XG5cdFx0XHRpZiAoc3RhdGVtZW50KSB7XG5cdFx0XHRcdHN0YXRlbWVudHMgPSBbXTtcblx0XHRcdFx0aWYgKGNvbmRpdGlvbnMubGVuZ3RoKSBzdGF0ZW1lbnRzID0gc3RhdGVtZW50cy5jb25jYXQoY29uZGl0aW9ucyk7XG5cdFx0XHRcdGlmIChzdGF0ZW1lbnQpIHN0YXRlbWVudHMucHVzaChcIlxcdFwiICsgc3RhdGVtZW50KTtcblx0XHRcdFx0c3RhdGVtZW50cyA9IGAge1xcbiR7c3RhdGVtZW50cy5qb2luKFwiXFxuXCIpfVxcbiB9XFxuYDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGNvbmRpdGlvbnMubGVuZ3RoKSB7XG5cdFx0XHRcdHN0YXRlbWVudHMgPSBgIHtcXG4ke2NvbmRpdGlvbnMuam9pbihcIlxcblwiKX1gO1xuXHRcdFx0fVxuLy9kZWJ1Z2dlcjtcblx0XHRcdC8vIENyZWF0ZSBhcyBhIFNUQVRJQyBmdW5jdGlvblxuXHQvL1RPRE86IGNyZWF0ZSBhcyBhbiBpbnN0YW5jZSBmdW5jdGlvbiB3ZSBjYW4gY2FsbCBvbiBvdXJzZWxmIVxuXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHttZXRob2ROYW1lfSgke2FyZ3N9KSR7c3RhdGVtZW50c31gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBHZXR0ZXIgZWl0aGVyIHdpdGggb3Igd2l0aG91dCBhcmd1bWVudHMuXG4vLyBJZiB5b3Ugc3BlY2lmeSBhcmd1bWVudHMsIHlpZWxkcyBhIG5vcm1hbCBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGEgdmFsdWUuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImdldHRlclwiLFxuXHRcImdldCB7aWRlbnRpZmllcn0ge2FyZ3NfY2xhdXNlfT8gKFxcXFw6KT8ge2V4cHJlc3Npb259P1wiLFxuXHRjbGFzcyBnZXR0ZXIgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJnc19jbGF1c2UsIGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGFyZ3MgPSBhcmdzX2NsYXVzZSAmJiBhcmdzX2NsYXVzZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGV4cHJlc3Npb24gPSAoZXhwcmVzc2lvbiA/IGAgeyByZXR1cm4gKCR7ZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KX0pIH1gIDogXCJcIik7XG5cblx0XHRcdGlmIChhcmdzICYmIGV4cHJlc3Npb24pIHtcblx0XHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pJHtleHByZXNzaW9ufWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChhcmdzKSB7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KWA7XG5cblx0XHRcdH0gZWxzZSBpZiAoZXhwcmVzc2lvbikge1xuXHRcdFx0XHRyZXR1cm4gYGdldCAke2lkZW50aWZpZXJ9KCkke2V4cHJlc3Npb259YDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBgZ2V0ICR7aWRlbnRpZmllcn0oKWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fVxuKTtcblxuLy8gU2V0dGVyLlxuLy8gQ29tcGxhaW5zIGlmIHlvdSBzcGVjaWZ5IG1vcmUgdGhhbiBvbmUgYXJndW1lbnQuXG4vLyBJZiB5b3UgZG9uJ3QgcGFzcyBhbiBleHBsaWNpdCBhcmd1bWVudCwgd2UnbGwgYXNzdW1lIGl0J3MgdGhlIHNhbWUgYXMgdGhlIGlkZW50aWZpZXIuXG4vLyBlZztcdGBzZXQgY29sb3I6IHNldCB0aGUgY29sb3Igb2YgbXkgdGV4dCB0byBjb2xvcmBcbi8vXG4vLyBUT0RPOiBpbnRlcm5hbCBnZXR0ZXIvc2V0dGVyIHNlbWFudGljcyBhbGEgb2JqZWN0aXZlIENcbi8vXHRcdFx0YHNldCBjb2xvcjogaWYgY29sb3IgaXMgaW4gW1wicmVkXCIsIFwiYmx1ZVwiXSB0aGVuIHNldCBteSBjb2xvciB0byBjb2xvcmBcbi8vXHRcdCA9PiBgbXkgY29sb3JgIHdpdGhpbiBzZXR0ZXIgc2hvdWxkIGF1dG9tYXRpY2FsbHkgdHJhbnNsYXRlIHRvIGB0aGlzLl9jb2xvcmAgPz8/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcInNldHRlclwiLFxuXHRcInNldCB7aWRlbnRpZmllcn0ge2FyZ3NfY2xhdXNlfT8gKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGdldHRlciBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBhcmdzX2NsYXVzZSwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblxuXHRcdFx0Ly8gQXNzdW1lIHdlIHdhbnQgdGhlIHNhbWUgbmFtZSBhcyB0aGUgaWRlbnRpZmllciBpZiBubyBhcmd1bWVuc1xuXHRcdFx0bGV0IGFyZ3MgPSAoYXJnc19jbGF1c2UgJiYgYXJnc19jbGF1c2UuYXJnTmFtZXMpIHx8IFtpZGVudGlmaWVyXTtcblx0XHRcdC8vIENvbXBsYWluIGlmIG1vcmUgdGhhbiBvbmUgYXJndW1lbnRcblx0XHRcdGlmIChhcmdzLmxlbmd0aCA+IDEpXG5cdFx0XHRcdGNvbnNvbGUud2FybihcInBhcnNlKCdzZXR0ZXInKTogb25seSBvbmUgYXJndW1lbnQgYWxsb3dlZCBpbiBzZXR0ZXI6ICBcIiwgdGhpcy5tYXRjaGVkVGV4dCk7XG5cblx0XHRcdHN0YXRlbWVudCA9IChzdGF0ZW1lbnQgPyBgIHsgJHtzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCl9IH1gIDogXCJcIik7XG5cblx0XHRcdHJldHVybiBgc2V0ICR7aWRlbnRpZmllcn0oJHthcmdzWzBdfSkke3N0YXRlbWVudH1gO1xuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRkZWNsYXJlIHByb3BlcnRpZXNcbi8vXG5cbi8vVE9ETzogYW5vdGhlciBuYW1lIGZvciBgY29uc3RhbnRgID9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eVwiLFxuXHRcIihzY29wZTpwcm9wZXJ0eXxjb25zdGFudHxzaGFyZWQgcHJvcGVydHkpIHtpZGVudGlmaWVyfSAodmFsdWVfY2xhdXNlOj0ge2V4cHJlc3Npb259KT9cIixcblx0Y2xhc3MgZGVjbGFyZV9wcm9wZXJ0eSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzY29wZSwgaWRlbnRpZmllciwgdmFsdWVfY2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRzY29wZSA9IHNjb3BlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgdmFsdWUgPSB2YWx1ZV9jbGF1c2UgJiYgXCIgPSBcIiArIHZhbHVlX2NsYXVzZS5yZXN1bHRzLmV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCkgfHwgXCJcIjtcblxuXHRcdFx0bGV0IGRlY2xhcmF0aW9uID0gYCR7aWRlbnRpZmllcn0ke3ZhbHVlfWA7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdGlmICghdmFsdWUpIGNvbnNvbGUud2FybihcInBhcnNlKCdkZWNsYXJlX3Byb3BlcnR5Jyk6IGNvbnN0YW50IHByb3BlcnRpZXMgbXVzdCBkZWNsYXJlIGEgdmFsdWU6ICBcIiwgdGhpcy5tYXRjaGVkVGV4dCk7XG5cdFx0XHRcdFx0cmV0dXJuIGBjb25zdCAke2RlY2xhcmF0aW9ufWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZCBwcm9wZXJ0eVwiOlxuXHRcdFx0XHRcdHJldHVybiBgQHByb3RvXFxuJHtkZWNsYXJhdGlvbn1gO1xuXG5cdFx0XHRcdGNhc2UgXCJwcm9wZXJ0eVwiOlxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBkZWNsYXJhdGlvbjtcblx0XHRcdH1cblx0XHR9XG5cdH1cbik7XG5cbi8vIFRPRE86IHNjb3BlX21vZGlmaWVyPz8/XG4vLyBUT0RPOiBpbml0aWFsIHZhbHVlXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlcIixcblx0XCJwcm9wZXJ0eSB7aWRlbnRpZmllcn0gYXMgKGF8YW4pPyB7dHlwZX1cIixcblx0Y2xhc3MgZGVjbGFyZV9wcm9wZXJ0eSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCB0eXBlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHR5cGUgPSB0eXBlLnRvU291cmNlKGNvbnRleHQpO1xuXG5cdFx0XHRyZXR1cm4gYGdldCAke2lkZW50aWZpZXJ9KCkgeyByZXR1cm4gdGhpcy5fXyR7aWRlbnRpZmllcn0gfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmIChzcGVsbC5pc0EodmFsdWUsICR7dHlwZX0pIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFRPRE86IHdhcm4gb24gaW52YWxpZCBzZXQ/ICBzaGFyZWQ/ICB1bmRlZmluZWQ/IHNvbWV0aGluZyBvdGhlciB0aGFuIHRoZSBmaXJzdCB2YWx1ZSBhcyBkZWZhdWx0P1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwicHJvcGVydHkge2lkZW50aWZpZXJ9IGFzIG9uZSBvZiB7bGlzdDpsaXRlcmFsX2xpc3R9XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHlfYXNfb25lX29mIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGxpc3QgfSA9IHRoaXMucmVzdWx0cztcblxuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgcGx1cmFsID0gcGx1cmFsaXplKGlkZW50aWZpZXIpO1xuXG5cdFx0XHRsZXQgdmFsdWVzID0gbGlzdC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBmaXJzdCA9IGxpc3QuZ2V0SXRlbSgwKTtcblx0XHRcdGxldCBmaXJzdFZhbHVlID0gZmlyc3QgPyBmaXJzdC50b1NvdXJjZShjb250ZXh0KSA6IFwidW5kZWZpbmVkXCI7XG5cblx0XHRcdHJldHVybiBgQHByb3RvXFxuYFxuXHRcdFx0XHQgKyBgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0oKSB7IHJldHVybiB0aGlzLl9fJHtpZGVudGlmaWVyfSA9PT0gdW5kZWZpbmVkID8gJHtmaXJzdFZhbHVlfSA6IHRoaXMuX18ke2lkZW50aWZpZXJ9IH1cXG5gXG5cdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXG4vLyBNT1JFIEVGRklDSUVOVCBCVVQgVUdMSUVSXG4vLyBcdFx0XHRyZXR1cm4gYHN0YXRpYyAke3BsdXJhbH0gPSAke3ZhbHVlc307XFxuYFxuLy8gXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0geyByZXR1cm4gKFwiX18ke2lkZW50aWZpZXJ9XCIgaW4gdGhpcyA/IHRoaXMuX18ke2lkZW50aWZpZXJ9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcbi8vIFx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vXG4vL1x0U2VsZi1yZWZlcmVuY2Vcbi8vXG5wYXJzZXIuYWRkS2V5d29yZChcIm1lXCIsIFwibWVcIixcblx0Y2xhc3MgbWUgZXh0ZW5kcyBSdWxlLktleXdvcmQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiBcInRoaXNcIjtcblx0XHR9XG5cdH1cbik7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLm1lKTtcblxuLy8gVE9ETzogdGhpcyByZWFsbHkgbWFrZXMgbWUgd2FudCB0byBtYWtlIGBJIGFtIGVtcHR5YCBldGMgd29yay4uLlxucGFyc2VyLmFkZEtleXdvcmQoXCJJXCIsIFwiSVwiLFxuXHRjbGFzcyBJIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gXCJ0aGlzXCI7XG5cdFx0fVxuXHR9XG4pO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHBhcnNlci5ydWxlcy5JKTtcblxuXG4vL1xuLy9cdFByb3BlcnR5IGFjY2Vzc1xuLy9cblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicHJvcGVydHlfZXhwcmVzc2lvblwiLFxuXHRcIihwcm9wZXJ0aWVzOnRoZSB7aWRlbnRpZmllcn0gb2YpKyB0aGU/IHtleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBwcm9wZXJ0eV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBwcm9wZXJ0aWVzIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHByb3BlcnRpZXMgPSBwcm9wZXJ0aWVzLnJlc3VsdHNcblx0XHRcdFx0XHRcdFx0LnJldmVyc2UoKVxuXHRcdFx0XHRcdFx0XHQubWFwKCBwcm9wZXJ0eSA9PiBwcm9wZXJ0eS5pZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpIClcblx0XHRcdFx0XHRcdFx0LmpvaW4oXCIuXCIpO1xuXHRcdFx0cmV0dXJuIGAke2V4cHJlc3Npb259LiR7cHJvcGVydGllc31gO1xuLy8gTk9URTogdGhlIGZvbGxvd2luZyBpcyBzYWZlciwgYnV0IHVnbHkgZm9yIGRlbW8gcHVycG9zZXNcbi8vXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXQoJHtleHByZXNzaW9ufSwgWycke3Byb3BlcnRpZXN9J10pYDtcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIobXl8dGhpcykge2lkZW50aWZpZXJ9XCIsXG5cdGNsYXNzIHByb3BlcnR5X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGB0aGlzLiR7aWRlbnRpZmllcn1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy90eXBlcy5qcyIsInZhciBnO1xyXG5cclxuLy8gVGhpcyB3b3JrcyBpbiBub24tc3RyaWN0IG1vZGVcclxuZyA9IChmdW5jdGlvbigpIHtcclxuXHRyZXR1cm4gdGhpcztcclxufSkoKTtcclxuXHJcbnRyeSB7XHJcblx0Ly8gVGhpcyB3b3JrcyBpZiBldmFsIGlzIGFsbG93ZWQgKHNlZSBDU1ApXHJcblx0ZyA9IGcgfHwgRnVuY3Rpb24oXCJyZXR1cm4gdGhpc1wiKSgpIHx8ICgxLGV2YWwpKFwidGhpc1wiKTtcclxufSBjYXRjaChlKSB7XHJcblx0Ly8gVGhpcyB3b3JrcyBpZiB0aGUgd2luZG93IHJlZmVyZW5jZSBpcyBhdmFpbGFibGVcclxuXHRpZih0eXBlb2Ygd2luZG93ID09PSBcIm9iamVjdFwiKVxyXG5cdFx0ZyA9IHdpbmRvdztcclxufVxyXG5cclxuLy8gZyBjYW4gc3RpbGwgYmUgdW5kZWZpbmVkLCBidXQgbm90aGluZyB0byBkbyBhYm91dCBpdC4uLlxyXG4vLyBXZSByZXR1cm4gdW5kZWZpbmVkLCBpbnN0ZWFkIG9mIG5vdGhpbmcgaGVyZSwgc28gaXQnc1xyXG4vLyBlYXNpZXIgdG8gaGFuZGxlIHRoaXMgY2FzZS4gaWYoIWdsb2JhbCkgeyAuLi59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGc7XHJcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vICh3ZWJwYWNrKS9idWlsZGluL2dsb2JhbC5qc1xuLy8gbW9kdWxlIGlkID0gMTVcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gTWFrZSBzdXJlIGBnbG9iYWxgIGlzIGRlZmluZWQgZ2xvYmFsbHk6XG4vL1x0LSBlaXRoZXIgYXMgdGhlIG5vZGVqcyBgZ2xvYmFsYCwgb3Jcbi8vXHQtIGFzIGFuIGFsaWFzIGZvciBgd2luZG93YCBpbiBicm93c2Vycywgb3Jcbi8vXHQtIGZvciB0aGUgYHNlbGZgIGNvbnRleHQgaW4gd2ViIHdvcmtlcnMuXG4vL1xuLy8gTk9URTogdGhpcyBtb2RpZmllcyB0aGUgXCJnbG9iYWxcIiBlbnZpcm9ubWVudCBieSBtYWtpbmcgc3VyZSBcImdsb2JhbFwiIGlzIHNldC4hXG4vL1xuXG5sZXQgZ2xvYmFsX2lkZW50aWZpZXI7XG5pZiAodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuLy9cdGNvbnNvbGUubG9nKFwiUnVubmluZyBpbiBub2RlXCIpO1xuXHRnbG9iYWxfaWRlbnRpZmllciA9IGdsb2JhbDtcbn1cblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gYSB3ZWIgYnJvd3NlclwiKTtcblx0d2luZG93Lmdsb2JhbCA9IHdpbmRvdztcblx0Z2xvYmFsX2lkZW50aWZpZXIgPSB3aW5kb3c7XG59XG5cbmlmICh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIikge1xuLy9cdGNvbnNvbGUubG9nKFwiUnVubmluZyBpbiBhIHdlYiB3b3JrZXJcIik7XG5cdHNlbGYuZ2xvYmFsID0gc2VsZjtcblx0Z2xvYmFsX2lkZW50aWZpZXIgPSBzZWxmO1xufVxuXG4vLyBFeHBvcnQgZm9yIGNvbnN1bXB0aW9uIGJ5IGltcG9ydC5cbmV4cG9ydCBkZWZhdWx0IGdsb2JhbF9pZGVudGlmaWVyO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvZ2xvYmFsLmpzIl0sInNvdXJjZVJvb3QiOiIifQ==