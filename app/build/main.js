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
	parseRuleSyntax_string: function parseRuleSyntax_string(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var constructor = arguments[3];

		var string = syntaxStream[startIndex],
		    rule = void 0;
		// If letters only, match as a Keyword (so we require a word boundary after the string).
		if (string.match(/[A-Za-z]+/)) {
			if (!constructor) constructor = _Rule2.default.Keyword;
			rule = new constructor({ string: string });
		}
		// Otherwise match as a String, which doesn't require non-word chars after the text.
		else {
				if (!constructor) constructor = _Rule2.default.Symbol;
				rule = new constructor({ string: string });
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
			var rule = (_Rule2.default.parseRuleSyntax_string(stream, [], 0, constructor) || [])[0];
			if (!rule) return;
			if (properties) Object.assign(rule, properties);
			return this.addRule(name, rule);
		} },

	// Add infix operator, such as "a or b".
	// NOTE: if you have more than one matching operator,
	//		 pass in an array of simple strings so all of our operators are simple strings.
	addInfixOperator: { value: function value(name, ruleSyntax, properties) {
			var _this = this;

			if (Array.isArray(ruleSyntax)) {
				return ruleSyntax.forEach(function (syntax) {
					return _this.addInfixOperator(name, syntax, properties);
				});
			}

			var rule = this.addSequence(name, ruleSyntax, properties);
			if (rule) {
				if (!rule.toJS) {
					throw new TypeError("Expected infix operator rule '" + name + "' to specify 'toJS' function");
				}
				// clear list of infix operators for getter below
				delete this.__infixOperators;
				return this.addRule("infix_operator", rule);
			}
		} },

	// List of infix operators as strings.
	// Re-memoized after `addInfixOperator` above.
	infixOperators: (0, _memoize.defineMemoized)("__infixOperators", function () {
		return this.rules["infix_operator"] && this.rules["infix_operator"].rules.map(function (rule) {
			return rule.string;
		});
	}),

	// Add postfix operator, such as "a is defined"
	// NOTE: if you have more than one matching operator,
	//		 pass in an array of simple strings so all of our operators are simple strings.
	addPostfixOperator: { value: function value(name, ruleSyntax, properties) {
			var _this2 = this;

			if (Array.isArray(ruleSyntax)) {
				return ruleSyntax.forEach(function (syntax) {
					return _this2.addPostfixOperator(name, syntax, properties);
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
	return new Rule.Symbol({ string: first.string + second.string });
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
	return new Rule.Keyword({ string: first.string + " " + second.string });
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
				return result.toSource();
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
					if (results.length) results[results.length - 1] += " {";else results.push(tabs.substr(0, lineIndent - 1) + "{");
				} else if (lineIndent < currentIndent) {
					var closers = [];
					for (var i = currentIndent; i > lineIndent; i--) {
						closers.push(tabs.substr(0, i - 1) + "}");
					}
					// put parens BEFORE any blank lines!
					var lastBlankLine = _this._getLastBlankLine(results);
					results.splice.apply(results, [lastBlankLine, 0].concat(closers));
				}
				currentIndent = lineIndent;

				var result = _this.parse("statement", statement);
				//TODO: complain if can't parse the entire line!
				if (result) {
					var source = result.toSource().split("\n");
					results.push(lineStart + source.join("\n" + lineStart));
				} else {
					console.warn("Couldn't parse statement:", statement);
					results.push("ERROR: " + statement);
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

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
_RuleSyntax2.default.Identifier = function (_Rule$Pattern2) {
	_inherits(identifier, _Rule$Pattern2);

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
_parser2.default.rules.identifier.addToBlacklist("about", "above", "after", "and", "as", "at", "before", "behind", "below", "beneath", "beside", "between", "beyond", "by", "defined", "down", "during", "each", "empty", "exactly", "except", "for", "from", "greater", "in", "into", "less", "long", "minus", "more", "near", "not", "of", "off", "on", "onto", "opposite", "out", "outside", "over", "short", "since", "than", "the", "then", "through", "thru", "to", "toward", "towards", "undefined", "under", "underneath", "unique", "until", "up", "upon", "upside", "versus", "vs", "with", "within", "without");

// Add common english verbs to identifier blacklist.
_parser2.default.rules.identifier.addToBlacklist("are", "do", "does", "contains", "has", "have", "is", "repeat", "was", "were");

// Add special control keywords to identifier blacklist.
_parser2.default.rules.identifier.addToBlacklist("else", "if", "otherwise", "while");

// `Type` = type name.
// MUST start with an upper-case letter (?)
_RuleSyntax2.default.Type = function (_Rule$Pattern3) {
	_inherits(type, _Rule$Pattern3);

	function type() {
		_classCallCheck(this, type);

		return _possibleConstructorReturn(this, (type.__proto__ || Object.getPrototypeOf(type)).apply(this, arguments));
	}

	return type;
}(_RuleSyntax2.default.Pattern);
_parser2.default.addRule("type", new _RuleSyntax2.default.Type({
	pattern: /([A-Z][\w\-]*|text|number|integer|decimal|character|boolean)/,
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
			default:
				return value.replace(/\-/g, "_");
		}
	}
}));

_parser2.default.addRule("expression", _parser2.default.rules.type);

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
_RuleSyntax2.default.Integer = function (_Rule$Pattern5) {
	_inherits(integer, _Rule$Pattern5);

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
_RuleSyntax2.default.Text = function (_Rule$Pattern6) {
	_inherits(text, _Rule$Pattern6);

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
_RuleSyntax2.default.Boolean = function (_Rule$Pattern7) {
	_inherits(boolean, _Rule$Pattern7);

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
		key: "toSource",
		value: function toSource(context) {
			var list = this.results.list;

			if (!list) return "[]";
			return list.toSource(context);
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

_parser2.default.addInfixOperator("and", "and", { precedence: 6, toJS: function toJS(a, b) {
		return "(" + a + " && " + b + ")";
	}
});
_parser2.default.addInfixOperator("or", "or", { precedence: 5, toJS: function toJS(a, b) {
		return "(" + a + " || " + b + ")";
	}
});

_parser2.default.addInfixOperator("is", "is", { precedence: 10, toJS: function toJS(a, b) {
		return "(" + a + " == " + b + ")";
	}
});
_parser2.default.addInfixOperator("is_not", "is not", { precedence: 10, toJS: function toJS(a, b) {
		return "(" + a + " != " + b + ")";
	}
});

_parser2.default.addInfixOperator("is_exactly", "is exactly", { precedence: 10, toJS: function toJS(a, b) {
		return "(" + a + " === " + b + ")";
	}
});
_parser2.default.addInfixOperator("is_not_exactly", "is not exactly", { precedence: 10, toJS: function toJS(a, b) {
		return "(" + a + " !== " + b + ")";
	}
});

//TODO: `spell.isOfType(thing, type)`
//TODO: `is same type as` ?
_parser2.default.addInfixOperator("is_type_of", ["is a", "is an"], { precedence: 11, toJS: function toJS(thing, type) {
		return "spell.isOfType(" + thing + ", '" + type + "')";
	}
});
_parser2.default.addInfixOperator("is_not_type_of", ["is not a", "is not an"], { precedence: 11, toJS: function toJS(thing, type) {
		return "!spell.isOfType(" + thing + ", '" + type + "')";
	}
});

//TODO: `spell.contains(collection, thing)`
_parser2.default.addInfixOperator("is_in", ["is in", "is one of"], { precedence: 11, toJS: function toJS(thing, list) {
		return list + ".includes(" + thing + ")";
	}
});
_parser2.default.addInfixOperator("is_not_in", ["is not in", "is not one of"], { precedence: 11, toJS: function toJS(thing, list) {
		return "!" + list + ".includes(" + thing + ")";
	}
});
//TESTME
_parser2.default.addInfixOperator("includes", ["includes", "contains"], { precedence: 11, toJS: function toJS(list, thing) {
		return list + ".includes(" + thing + ")";
	}
});
_parser2.default.addInfixOperator("doesnt_include", ["does not include", "doesnt include", "does not contain", "doesnt contain"], { precedence: 11, toJS: function toJS(list, thing) {
		return list + ".includes(" + thing + ")";
	}
});

_parser2.default.addInfixOperator("gt", [">", "is greater than"], { precedence: 11, toJS: function toJS(a, b) {
		return "(" + a + " > " + b + ")";
	}
});
_parser2.default.addInfixOperator("gte", [">=", "is greater than or equal to"], { precedence: 11, toJS: function toJS(a, b) {
		return "(" + a + " >= " + b + ")";
	}
});
_parser2.default.addInfixOperator("lt", ["<", "is less than"], { precedence: 11, toJS: function toJS(a, b) {
		return "(" + a + " < " + b + ")";
	}
});
_parser2.default.addInfixOperator("lte", ["<=", "is less than or equal to"], { precedence: 11, toJS: function toJS(a, b) {
		return "(" + a + " <= " + b + ")";
	}
});

//TODO:  can't add `+` as a rule, fix this then add these
//TODO:  operator precedence???
//TESTME
_parser2.default.addInfixOperator("plus", ["\\+", "plus"], { precedence: 13, toJS: function toJS(a, b) {
		return a + " + " + b;
	}
});
_parser2.default.addInfixOperator("minus", ["-", "minus"], { precedence: 13, toJS: function toJS(a, b) {
		return a + " - " + b;
	}
});
_parser2.default.addInfixOperator("times", ["\\*", "times"], { precedence: 14, toJS: function toJS(a, b) {
		return a + " * " + b;
	}
});
_parser2.default.addInfixOperator("divided_by", ["/", "divided by"], { precedence: 14, toJS: function toJS(a, b) {
		return a + " / " + b;
	}
});

//TODO:  `+=` etc?  other math functions?

_parser2.default.addExpression("infix_operator_expression", "{lhs:expression} {operator:infix_operator} {rhs:expression}", function (_Rule$Expression) {
	_inherits(infix_operator_expression, _Rule$Expression);

	function infix_operator_expression() {
		var _ref;

		var _temp, _this2, _ret;

		_classCallCheck(this, infix_operator_expression);

		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		return _ret = (_temp = (_this2 = _possibleConstructorReturn(this, (_ref = infix_operator_expression.__proto__ || Object.getPrototypeOf(infix_operator_expression)).call.apply(_ref, [this].concat(args))), _this2), _this2.testRule = "infix_operator", _temp), _possibleConstructorReturn(_this2, _ret);
	}

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

_parser2.default.addPostfixOperator("is_defined", "is defined", {
	toJS: function toJS(thing) {
		return "(typeof " + thing + " !== 'undefined')";
	}
});
_parser2.default.addPostfixOperator("is_not_defined", ["is not defined", "is undefined"], {
	toJS: function toJS(thing) {
		return "(typeof " + thing + " === 'undefined')";
	}
});

//TODO: `spell.isEmpty(thing)`
_parser2.default.addPostfixOperator("is_empty", "is empty", {
	toJS: function toJS(thing) {
		return "spell.isEmpty(" + thing + ")";
	}
});
_parser2.default.addPostfixOperator("is_not_empty", "is not empty", {
	toJS: function toJS(thing) {
		return "!spell.isEmpty(" + thing + ")";
	}
});

_parser2.default.addExpression("postfix_operator_expression", "{expression} {operator:postfix_operator}", function (_Rule$Expression2) {
	_inherits(postfix_operator_expresion, _Rule$Expression2);

	function postfix_operator_expresion() {
		var _ref2;

		var _temp2, _this3, _ret2;

		_classCallCheck(this, postfix_operator_expresion);

		for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
			args[_key2] = arguments[_key2];
		}

		return _ret2 = (_temp2 = (_this3 = _possibleConstructorReturn(this, (_ref2 = postfix_operator_expresion.__proto__ || Object.getPrototypeOf(postfix_operator_expresion)).call.apply(_ref2, [this].concat(args))), _this3), _this3.testRule = "postfix_operator", _temp2), _possibleConstructorReturn(_this3, _ret2);
	}

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

// TODO: this should really be a general "expression"...
//parser.addSequence("operator_expression", "(expression:{postfix_operator_expression}|{infix_operator_expression})");

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

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _RuleSyntax = __webpack_require__(1);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser = __webpack_require__(0);

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for defining classes (known as `types`)
//


// re-export parser for testing.
exports.default = _parser2.default;

// DEAD SIMPLE PLURALIZER... REALLY NOT VERY GOOD

function pluralize(word) {
	return word + "s";
}

//TESTME
//MOVE TO `objects`?
// Properties clause: creates an object with one or more property values.
//	`foo = 1, bar = 2`
//TODO: would like to use `and` but that will barf on expressions...
//TODO: how to do properties on multiple lines?
_parser2.default.addList("object_literal", "[({identifier} = {expression}) ,]", function (_Rule$List) {
	_inherits(object_literal, _Rule$List);

	function object_literal() {
		_classCallCheck(this, object_literal);

		return _possibleConstructorReturn(this, (object_literal.__proto__ || Object.getPrototypeOf(object_literal)).apply(this, arguments));
	}

	_createClass(object_literal, [{
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

	return object_literal;
}(_RuleSyntax2.default.List));
_parser2.default.addRule("expression", _parser2.default.rules.object_literal);

//TESTME
//MOVE TO `functions`?
// Arguments clause for methods
//	`with foo` or `with foo and bar and baz`
//TODO: {identifier} = {expression}	=> requires `,` instead of `and`
//TODO: `with foo as Type`
//TODO:	`with foo...` for splat?
_parser2.default.addSequence("argsClause", "with [args:{identifier} and]", function (_Rule$Sequence) {
	_inherits(argsClause, _Rule$Sequence);

	function argsClause() {
		_classCallCheck(this, argsClause);

		return _possibleConstructorReturn(this, (argsClause.__proto__ || Object.getPrototypeOf(argsClause)).apply(this, arguments));
	}

	_createClass(argsClause, [{
		key: "toSource",
		value: function toSource(context) {
			return this.argNames.join(", ");
		}
	}, {
		key: "results",

		// Return just the arguments as the results
		get: function get() {
			return _get(argsClause.prototype.__proto__ || Object.getPrototypeOf(argsClause.prototype), "results", this).args;
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

	return argsClause;
}(_RuleSyntax2.default.Sequence));

// TESTME
// Define class.
_parser2.default.addStatement("define_type", "define type {type} (extendsClause:as (a|an) {superType:type})?", function (_Rule$Statement) {
	_inherits(define_type, _Rule$Statement);

	function define_type() {
		_classCallCheck(this, define_type);

		return _possibleConstructorReturn(this, (define_type.__proto__ || Object.getPrototypeOf(define_type)).apply(this, arguments));
	}

	_createClass(define_type, [{
		key: "toSource",
		value: function toSource(context) {
			var _results = this.results,
			    type = _results.type,
			    extendsClause = _results.extendsClause;

			type = type.toSource(context);
			var superType = extendsClause && extendsClause.results.superType.toSource(context);
			if (superType) {
				return "class " + type + " extends " + superType;
			}
			return "class " + type;
		}
	}]);

	return define_type;
}(_RuleSyntax2.default.Statement));

//TODO: constructor

//TESTME
// `new`
// NOTE: we assume that all types take an object of properties????
_parser2.default.addSequence("new_thing", "(create|new) {type} (propsClause:with {props:object_literal})?", function (_Rule$Sequence2) {
	_inherits(new_thing, _Rule$Sequence2);

	function new_thing() {
		_classCallCheck(this, new_thing);

		return _possibleConstructorReturn(this, (new_thing.__proto__ || Object.getPrototypeOf(new_thing)).apply(this, arguments));
	}

	_createClass(new_thing, [{
		key: "toSource",
		value: function toSource(context) {
			var _results2 = this.results,
			    type = _results2.type,
			    propsClause = _results2.propsClause;

			type = type.toSource(context);
			var props = propsClause && propsClause.results.props.toSource(context) || "";
			return "new " + type + "(" + props + ")";
		}
	}]);

	return new_thing;
}(_RuleSyntax2.default.Sequence));
// This works as an expression OR a statement.
_parser2.default.addRule("expression", _parser2.default.rules.new_thing);
_parser2.default.addRule("statement", _parser2.default.rules.new_thing);

// TESTME
_parser2.default.addStatement("declare_method", "(to|on) {identifier} {argsClause}? (\\:)? {statement}?", function (_Rule$Statement2) {
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
			    argsClause = _results3.argsClause,
			    statement = _results3.statement;


			identifier = identifier.toSource(context);
			var args = argsClause && argsClause.toSource(context) || "";
			statement = statement ? " { " + statement.toSource(context) + " }" : "";

			return identifier + "(" + args + ")" + statement;
		}
	}]);

	return declare_method;
}(_RuleSyntax2.default.Statement));

// TESTME
// Getter either with or without arguments.
// If you specify arguments, yields a normal function which returns a value.
_parser2.default.addStatement("getter", "get {identifier} {argsClause}? (\\:)? {X:expression}?", function (_Rule$Statement3) {
	_inherits(getter, _Rule$Statement3);

	function getter() {
		_classCallCheck(this, getter);

		return _possibleConstructorReturn(this, (getter.__proto__ || Object.getPrototypeOf(getter)).apply(this, arguments));
	}

	_createClass(getter, [{
		key: "toSource",
		value: function toSource(context) {
			var _results4 = this.results,
			    identifier = _results4.identifier,
			    argsClause = _results4.argsClause,
			    expression = _results4.expression;

			identifier = identifier.toSource(context);
			var args = argsClause && argsClause.toSource(context);
			expression = expression ? " { return (" + expression.toSource(context) + ") }" : "";

			if (args && expression) {
				return identifier + "(" + args + ")" + expression;
			} else if (args) {
				return identifier + "(" + args + ")";
			} else if (expression) {
				return "get " + identifier + "()" + expression;
			} else {
				return "get " + identifier;
			}
			return result;
		}
	}]);

	return getter;
}(_RuleSyntax2.default.Statement));

// TESTME
// Setter.
// Complains if you specify more than one argument.
// If you don't pass an explicit argument, we'll assume it's the same as the identifier.
// eg;	`set color: set the color of my text to color`
//
// TODO: internal getter/setter semantics ala objective C
//			`set color: if color is in ["red", "blue"] then set my color to color`
//		 => `my color` within setter should automatically translate to `this._color` ???
_parser2.default.addStatement("setter", "set {identifier} {argsClause}? (\\:)? {statement}?", function (_Rule$Statement4) {
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
			    argsClause = _results5.argsClause,
			    statement = _results5.statement;

			identifier = identifier.toSource(context);

			// Assume we want the same name as the identifier if no argumens
			var args = argsClause && argsClause.argNames || [identifier];
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

_parser2.default.addSequence("scope_modifier", "(scope:global|constant|shared|property)");

//TESTME
_parser2.default.addStatement("declare_property", "(scope:constant|shared property|property) {identifier} (valueClause:= {expression})?", function (_Rule$Statement5) {
	_inherits(declare_property, _Rule$Statement5);

	function declare_property() {
		_classCallCheck(this, declare_property);

		return _possibleConstructorReturn(this, (declare_property.__proto__ || Object.getPrototypeOf(declare_property)).apply(this, arguments));
	}

	_createClass(declare_property, [{
		key: "toSource",
		value: function toSource(context) {
			var _results6 = this.results,
			    scope = _results6.scope,
			    identifier = _results6.identifier,
			    valueClause = _results6.valueClause;

			scope = scope.toSource(context);
			identifier = identifier.toSource(context);
			var value = valueClause && " = " + valueClause.results.expression.toSource(context) || "";

			var declaration = "" + identifier + value;
			switch (scope) {
				case "constant":
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

//TESTME
_parser2.default.addStatement("declare_property",
// TODO: scope_modifier???
"property {identifier} as (a|an)? {type}", function (_Rule$Statement6) {
	_inherits(declare_property, _Rule$Statement6);

	function declare_property() {
		_classCallCheck(this, declare_property);

		return _possibleConstructorReturn(this, (declare_property.__proto__ || Object.getPrototypeOf(declare_property)).apply(this, arguments));
	}

	_createClass(declare_property, [{
		key: "toSource",
		value: function toSource(context) {
			var _results7 = this.results,
			    identifier = _results7.identifier,
			    type = _results7.type;

			identifier = identifier.toSource(context);
			type = type.toSource(context);

			return "get " + identifier + " { return this.__" + identifier + " }\n" + ("set " + identifier + "(value) { if (spell.isA(value, " + type + ") this.__" + identifier + " = value }");
		}
	}]);

	return declare_property;
}(_RuleSyntax2.default.Statement));

// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
//TESTME
_parser2.default.addStatement("declare_property_as_one_of", "property {identifier} as one of {list:literal_list}", function (_Rule$Statement7) {
	_inherits(declare_property_as_one_of, _Rule$Statement7);

	function declare_property_as_one_of() {
		_classCallCheck(this, declare_property_as_one_of);

		return _possibleConstructorReturn(this, (declare_property_as_one_of.__proto__ || Object.getPrototypeOf(declare_property_as_one_of)).apply(this, arguments));
	}

	_createClass(declare_property_as_one_of, [{
		key: "toSource",
		value: function toSource(context) {
			var _results8 = this.results,
			    scope_modifier = _results8.scope_modifier,
			    identifier = _results8.identifier,
			    list = _results8.list;
			//TODO: not handling scope_modifier

			identifier = identifier.toSource(context);
			var plural = pluralize(identifier);
			var values = list.toSource(context);
			//TODO: list.getItem(0)
			var first = list.results.matched[0];
			var firstValue = first ? first.toSource(context) : "undefined";

			return "@proto\n" + (plural + " = " + values + "\n") + ("get " + identifier + " { return (\"__" + identifier + "\" in this ? this.__" + identifier + " : " + firstValue + ") }\n") + ("set " + identifier + "(value) { if (this." + plural + ".includes(value)) this.__" + identifier + " = value }");

			// MORE EFFICIENT BUT UGLIER
			// 			return `static ${plural} = ${values};\n`
			// 				 + `get ${identifier} { return ("__${identifier}" in this ? this.__${identifier} : ${firstValue}) }\n`
			// 				 + `set ${identifier}(value) { if (this.constructor.${plural}.includes(value)) this.__${identifier} = value }`;
		}
	}]);

	return declare_property_as_one_of;
}(_RuleSyntax2.default.Statement));

//
//	Property access
//

//TESTME
_parser2.default.addExpression("property_expression", "(properties:the {identifier} of)+ the? {expression}", function (_Rule$Expression) {
	_inherits(property_expression, _Rule$Expression);

	function property_expression() {
		_classCallCheck(this, property_expression);

		return _possibleConstructorReturn(this, (property_expression.__proto__ || Object.getPrototypeOf(property_expression)).apply(this, arguments));
	}

	_createClass(property_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _results9 = this.results,
			    expression = _results9.expression,
			    properties = _results9.properties;

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

//TESTME
_parser2.default.addExpression("property_expression", "(my|this) {identifier}", function (_Rule$Expression2) {
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

/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgODViZTkyZTAyY2FkMmFkZGM5MjIiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGVTeW50YXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2lmLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy90eXBlcy5qcyJdLCJuYW1lcyI6WyJwYXJzZXIiLCJ3aW5kb3ciLCJPYmplY3QiLCJhc3NpZ24iLCJwYXJzZVJ1bGVTeW50YXgiLCJzeW50YXgiLCJTZXF1ZW5jZUNvbnN0cnVjdG9yIiwiU2VxdWVuY2UiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJydWxlcyIsInBhcnNlUnVsZVN5bnRheF90b2tlbnMiLCJydWxlIiwibGVuZ3RoIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJtYXRjaCIsIlN5bnRheEVycm9yIiwic3RhcnRJbmRleCIsImxhc3RJbmRleCIsInBhcnNlUnVsZVN5bnRheF90b2tlbiIsImVuZEluZGV4IiwibGFzdCIsIlN5bWJvbCIsInBvcCIsIm1lcmdlU3ltYm9scyIsIktleXdvcmQiLCJtZXJnZUtleXdvcmRzIiwicHVzaCIsInN5bnRheFRva2VuIiwicGFyc2VSdWxlU3ludGF4X3N0cmluZyIsInBhcnNlUnVsZVN5bnRheF9zdWJydWxlIiwicGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzIiwicGFyc2VSdWxlU3ludGF4X2xpc3QiLCJwYXJzZVJ1bGVTeW50YXhfcmVwZWF0IiwiY29uc3RydWN0b3IiLCJzdHJpbmciLCJzdGFydHNXaXRoIiwic3Vic3RyIiwidG9TdHJpbmciLCJmaW5kTmVzdGVkVG9rZW5zIiwic2xpY2UiLCJhcmd1bWVudCIsImFsdGVybmF0aXZlcyIsImdyb3VwQWx0ZXJuYXRpdmVzIiwibWFwIiwiZ3JvdXAiLCJyZXN1bHRzIiwiQWx0ZXJuYXRpdmVzIiwidG9rZW5zIiwiY3VycmVudCIsImkiLCJ0b2tlbiIsImNvbmNhdCIsInN5bWJvbCIsIlJlcGVhdCIsIm9wdGlvbmFsIiwidW5kZWZpbmVkIiwiam9pbiIsInBhcmFtcyIsImJhbmdQb3NpdGlvbiIsImluZGV4T2YiLCJub3QiLCJTdWJydWxlIiwiTGlzdCIsIml0ZW0iLCJkZWxpbWl0ZXIiLCJkZWZpbmVQcm9wZXJ0aWVzIiwicHJvdG90eXBlIiwiYWRkU2VxdWVuY2UiLCJ2YWx1ZSIsIm5hbWUiLCJydWxlU3ludGF4IiwicHJvcGVydGllcyIsImRlYnVnIiwiY29uc29sZSIsImxvZyIsImFkZFJ1bGUiLCJlIiwiZXJyb3IiLCJhZGRTdGF0ZW1lbnQiLCJTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiRXhwcmVzc2lvbiIsImFkZExpc3QiLCJzdHJlYW0iLCJhZGRLZXl3b3JkIiwiYWRkSW5maXhPcGVyYXRvciIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJ0b0pTIiwiVHlwZUVycm9yIiwiX19pbmZpeE9wZXJhdG9ycyIsImluZml4T3BlcmF0b3JzIiwiYWRkUG9zdGZpeE9wZXJhdG9yIiwiX19wb3N0Zml4T3BlcmF0b3JzIiwicG9zdGZpeE9wZXJhdG9ycyIsIlJ1bGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNsb25lIiwiY3JlYXRlIiwicHJvcHMiLCJhZHZhbmNlVG8iLCJzdGFjayIsImNvbnRleHQiLCJtYXRjaGVkIiwibmV4dFJ1bGUiLCJuZXh0U3RyZWFtIiwiUGF0dGVybiIsInBhdHRlcm4iLCJkZWZpbmVQcm9wZXJ0eSIsIlJlZ0V4cCIsInNvdXJjZSIsInN0YXJ0UGF0dGVybiIsImJsYWNrbGlzdCIsIm1hdGNoZWRUZXh0IiwicmFuZ2UiLCJpbmRleCIsIndvcmRzIiwid29yZCIsIlJlZ0V4cEZyb21TdHJpbmciLCJmaXJzdCIsInNlY29uZCIsInBhdHRlcm5TdHJpbmciLCJlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzIiwiZ2V0UnVsZU9yRGllIiwicGFyc2UiLCJpc0RldGVybWluaXN0aWMiLCJ0ZXN0IiwiTmVzdGVkIiwiZXZlcnkiLCJ0ZXN0UnVsZSIsImxlZnRSZWN1cnNpdmUiLCJzdGFja0NvbnRhaW5zIiwiY2h1bmtpdCIsInBhcnNlSW5DaHVua3MiLCJuZXh0IiwiZWF0V2hpdGVzcGFjZSIsImFyZ05hbWUiLCJydWxlTmFtZSIsImJlc3RNYXRjaCIsIm1hdGNoZXMiLCJnZXRCZXN0TWF0Y2giLCJyZWR1Y2UiLCJiZXN0IiwidG9Tb3VyY2UiLCJpbmNsdWRlcyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydHlOYW1lIiwiZ2V0UnVsZSIsImFyZ3VtZW50cyIsImNvbXBpbGVTdGF0ZW1lbnRzIiwicmVzdWx0Iiwic3RhdGVtZW50cyIsInRpbWUiLCJjdXJyZW50SW5kZW50IiwidGFicyIsInNwbGl0Iiwic3RhdGVtZW50IiwidHJpbSIsImxpbmVTdGFydCIsImxpbmVJbmRlbnQiLCJjbG9zZXJzIiwibGFzdEJsYW5rTGluZSIsIl9nZXRMYXN0QmxhbmtMaW5lIiwic3BsaWNlIiwid2FybiIsInRpbWVFbmQiLCJ3aGl0ZXNwYWNlIiwiYWR2YW5jZUJ5IiwiZXhpc3RpbmciLCJydWxlSXNMZWZ0UmVjdXJzaXZlIiwic3VicnVsZSIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsIm5lc3RpbmciLCJuZXN0ZWQiLCJjaGFyIiwibGlzdCIsIlJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlMiLCJmbGFncyIsIkRFQlVHIiwiY2hhcnMiLCJXaGl0ZXNwYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJyZXBsYWNlIiwiYWRkVG9CbGFja2xpc3QiLCJUeXBlIiwidHlwZSIsIk51bWJlciIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJJbnRlZ2VyIiwicGFyc2VJbnQiLCJUZXh0IiwidGV4dCIsIkJvb2xlYW4iLCJib29sIiwiZXhwcmVzc2lvbiIsImVuZHNXaXRoIiwiVGV4dFN0cmVhbSIsInRleHRPclByb3BzIiwiYXJnIiwiaGVhZCIsInN1YnN0cmluZyIsIm1lbW9pemVkIiwiZGVmaW5lTWVtb2l6ZWQiLCJwcm9wZXJ0eSIsImdldHRlciIsImFwcGx5IiwiY29uZmlndXJhYmxlIiwiZ2V0IiwiZWxzZVBocmFzZSIsImVsc2VTdGF0ZW1lbnQiLCJpbmRleF9leHByZXNzaW9uIiwib3JkaW5hbCIsImluZml4X29wZXJhdG9yIiwicHJlY2VkZW5jZSIsImEiLCJiIiwidGhpbmciLCJsaHMiLCJyaHMiLCJvcGVyYXRvciIsImFzc2lnbm1lbnQiLCJtZXNzYWdlIiwiYnV0dG9uQ2xhdXNlIiwiYnV0dG9uTmFtZSIsIm9rQnV0dG9uIiwiY2FuY2VsQnV0dG9uIiwiY2FuY2VsQ2xhdXNlIiwicGx1cmFsaXplIiwicHJvcCIsImtleSIsIm9iamVjdF9saXRlcmFsIiwiYXJnTmFtZXMiLCJhcmdzIiwiZXh0ZW5kc0NsYXVzZSIsInN1cGVyVHlwZSIsInByb3BzQ2xhdXNlIiwibmV3X3RoaW5nIiwiYXJnc0NsYXVzZSIsInNjb3BlIiwidmFsdWVDbGF1c2UiLCJkZWNsYXJhdGlvbiIsInNjb3BlX21vZGlmaWVyIiwicGx1cmFsIiwidmFsdWVzIiwiZmlyc3RWYWx1ZSIsInJldmVyc2UiXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFF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QUtVLFVBSHhDOztBQWtCQTtBQUNBLGlCQUFPRCxhQUFQLENBQ0MscUJBREQsRUFFQyx3QkFGRDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBO0FBQUEsMkJBSVd1QixPQUpYLEVBSW9CO0FBQUEsT0FDWGtGLFVBRFcsR0FDSSxLQUFLNUksT0FEVCxDQUNYNEksVUFEVzs7QUFFakJBLGdCQUFhQSxXQUFXekMsUUFBWCxDQUFvQnpDLE9BQXBCLENBQWI7QUFDQSxvQkFBZWtGLFVBQWY7QUFDQTtBQVJIOztBQUFBO0FBQUEsRUFHbUMscUJBQUt4RyxVQUh4QyxHIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMTMpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDg1YmU5MmUwMmNhZDJhZGRjOTIyIiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJpbXBvcnQgeyBkZWZpbmVNZW1vaXplZCB9IGZyb20gXCIuL21lbW9pemUuanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIHJlLWV4cG9ydCBSdWxlIGZvciB0ZXN0aW5nXG5leHBvcnQgZGVmYXVsdCBSdWxlO1xuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbi8vIFRPRE86XHRVc2Uga2V5d29yZHMgaW4gc3ludGF4IHRvIG1ha2UgYSBxdWljayByZWdleC1iYXNlZCBgdGVzdGAgZnVuY3Rpb24gZm9yIHRoZSBlbnRpcmUgcnVsZVxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cbi8vIFRPRE86IGNvbnZlcnQgdG8gVGV4dFN0cmVhbSBwYXR0ZXJuIGFsYSBub3JtYWwgcGFyc2VyIG9uY2UgdGhhdCBzZXR0bGVzIGRvd24/Pz9cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbGFzdEluZGV4ID0gc3ludGF4U3RyZWFtLmxlbmd0aDtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKHJ1bGUpIHtcblx0XHRcdFx0bGV0IGxhc3QgPSBydWxlc1tydWxlcy5sZW5ndGgtMV07XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgU3RyaW5nYCBhbmQgbGFzdCB3YXMgYSBgU3RyaW5nYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0aWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG5cdFx0XHRcdFx0cnVsZXMucG9wKCk7XG5cdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG5cdFx0XHRcdFx0cnVsZSA9IFJ1bGUubWVyZ2VTeW1ib2xzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgS2V5d29yZGAgYW5kIGxhc3Qgd2FzIGFsc28gYSBgS2V5d29yZGAsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGVsc2UgaWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkKSB7XG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBsYXN0IHJ1bGVcblx0XHRcdFx0XHRydWxlcy5wb3AoKTtcblx0XHRcdFx0XHQvLyBhbmQgcmVwbGFjZSB3aXRoIGEgcnVsZSB0aGF0IG1lcmdlcyB0aGUga2V5d29yZHNcblx0XHRcdFx0XHRydWxlID0gUnVsZS5tZXJnZUtleXdvcmRzKGxhc3QsIHJ1bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJ1bGVzLnB1c2gocnVsZSk7XG5cdFx0XHR9XG5cdFx0XHRzdGFydEluZGV4ID0gZW5kSW5kZXggKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZXM7XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgc3ludGF4VG9rZW4gPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHQvLyBpZiB3ZSBnb3QgYSBcIlxcXFxcIiAod2hpY2ggYWxzbyBoYXMgdG8gZ28gaW50byB0aGUgc291cmNlIHN0cmluZyBhcyBcIlxcXFxcIilcblx0XHQvLyB0cmVhdCB0aGUgbmV4dCB0b2tlbiBhcyBhIGxpdGVyYWwgc3RyaW5nIHJhdGhlciB0aGFuIGFzIGEgc3BlY2lhbCBjaGFyYWN0ZXIuXG5cdFx0aWYgKHN5bnRheFRva2VuID09PSBcIlxcXFxcIikge1xuXHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ICsgMSk7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChzeW50YXhUb2tlbikge1xuXHRcdFx0Y2FzZSBcIntcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIihcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCJbXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIqXCI6XG5cdFx0XHRjYXNlIFwiK1wiOlxuXHRcdFx0Y2FzZSBcIj9cIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cblx0XHRcdC8vIHRoZSBmb2xsb3dpbmcgc2hvdWxkIEFMV0FZUyBiZSBjb25zdW1lZCBieSB0aGUgYWJvdmVcblx0XHRcdGNhc2UgXCJ9XCI6XG5cdFx0XHRjYXNlIFwiKVwiOlxuXHRcdFx0Y2FzZSBcIl1cIjpcblx0XHRcdGNhc2UgXCJ8XCI6XG5cdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCAke3N5bnRheFRva2VufSBmb3VuZCBhcyBpdGVtICR7c3RhcnRJbmRleH0gb2YgJHt0aGlzLnN5bnRheH1gKTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwLCBjb25zdHJ1Y3Rvcikge1xuXHRcdGxldCBzdHJpbmcgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF0sIHJ1bGU7XG5cdFx0Ly8gSWYgbGV0dGVycyBvbmx5LCBtYXRjaCBhcyBhIEtleXdvcmQgKHNvIHdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGFmdGVyIHRoZSBzdHJpbmcpLlxuXHRcdGlmIChzdHJpbmcubWF0Y2goL1tBLVphLXpdKy8pKSB7XG5cdFx0XHRpZiAoIWNvbnN0cnVjdG9yKSBjb25zdHJ1Y3RvciA9IFJ1bGUuS2V5d29yZDtcblx0XHRcdHJ1bGUgPSBuZXcgY29uc3RydWN0b3IoeyBzdHJpbmcgfSk7XG5cdFx0fVxuXHRcdC8vIE90aGVyd2lzZSBtYXRjaCBhcyBhIFN0cmluZywgd2hpY2ggZG9lc24ndCByZXF1aXJlIG5vbi13b3JkIGNoYXJzIGFmdGVyIHRoZSB0ZXh0LlxuXHRcdGVsc2Uge1xuXHRcdFx0aWYgKCFjb25zdHJ1Y3RvcikgY29uc3RydWN0b3IgPSBSdWxlLlN5bWJvbDtcblx0XHRcdHJ1bGUgPSBuZXcgY29uc3RydWN0b3IoeyBzdHJpbmc6IHN0cmluZyB9KTtcblx0XHRcdC8vIElmIHN0cmluZyBzdGFydHMgd2l0aCBgXFxcXGAsIGl0J3MgYW4gZXNjYXBlZCBsaXRlcmFsIChlZzogYFxcW2AgbmVlZHMgdG8gaW5wdXQgYXMgYFxcXFxbYCkuXG5cdFx0XHRpZiAoc3RyaW5nLnN0YXJ0c1dpdGgoXCJcXFxcXCIpKSB7XG5cdFx0XHRcdC8vIHJlbW92ZSBsZWFkaW5nIHNsYXNoIGluIG1hdGNoIHN0cmluZy4uLlxuXHRcdFx0XHRydWxlLnN0cmluZyA9IHJ1bGUuc3RyaW5nLnN1YnN0cigxKTtcblx0XHRcdFx0Ly8gYnV0IGxlYXZlIGl0IGluIHRvU3RyaW5nXG5cdFx0XHRcdHJ1bGUudG9TdHJpbmcgPSAoKSA9PiBzdHJpbmc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBbIHJ1bGUsIHN0YXJ0SW5kZXggXTtcblx0fSxcblxuXG5cdC8vIE1hdGNoIGdyb3VwaW5nIGV4cHJlc3Npb24gYCguLi58Li4uKWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHQvLyBOT1RFOiBuZXN0ZWQgcGFyZW5zIG1heSBub3QgaGF2ZSBhbHRlcm5hdGl2ZXMuLi4gOi0oICAgYChhfChifGMpKWAgd29uJ3Qgd29yaz8/P1xuXHRwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIihcIiwgXCIpXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0Ly8gcHVsbCBvdXQgZXhwbGljaXQgYXJndW1lbnQgbmFtZVxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdC8vIHNwbGl0IGludG8gZ3JvdXBzLCBpbmNsdWRpbmcgbmVzdGVkIHBhcmVuc1xuXHRcdGxldCBhbHRlcm5hdGl2ZXMgPVxuXHRcdFx0Z3JvdXBBbHRlcm5hdGl2ZXMoc2xpY2UpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0XHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKGdyb3VwLCBbXSk7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHRzWzBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdGxldCBydWxlID0gYWx0ZXJuYXRpdmVzLmxlbmd0aCA9PT0gMSA/IGFsdGVybmF0aXZlc1swXSA6IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVzOiBhbHRlcm5hdGl2ZXMgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblxuXHRcdGZ1bmN0aW9uIGdyb3VwQWx0ZXJuYXRpdmVzKHRva2Vucykge1xuXHRcdFx0bGV0IGFsdGVybmF0aXZlcyA9IFtdO1xuXHRcdFx0bGV0IGN1cnJlbnQgPSBbXTtcblx0XHRcdGZvciAobGV0IGkgPSAwLCB0b2tlbjsgdG9rZW4gPSB0b2tlbnNbaV07IGkrKykge1xuXHRcdFx0XHQvLyBoYW5kbGUgYWx0ZXJuYXRlIG1hcmtlclxuXHRcdFx0XHRpZiAodG9rZW4gPT09IFwifFwiKSB7XG5cdFx0XHRcdFx0YWx0ZXJuYXRpdmVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGhhbmRsZSBuZXN0ZWQgcGFyZW5zXG5cdFx0XHRcdGVsc2UgaWYgKHRva2VuID09PSBcIihcIikge1xuXHRcdFx0XHRcdGxldCB7IGVuZEluZGV4IH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmRJbmRleCArIDEpKTtcblx0XHRcdFx0XHRpID0gZW5kSW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3VycmVudC5wdXNoKHRva2VuKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGN1cnJlbnQubGVuZ3RoKSBhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdHJldHVybiBhbHRlcm5hdGl2ZXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIHJlcGVhdCBpbmRpY2F0b3IgYD9gLCBgK2Agb3IgYCpgIGJ5IGF0dGFjaGluZyBpdCB0byB0aGUgcHJldmlvdXMgcnVsZS5cblx0cGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IHN5bWJvbCA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblx0XHRsZXQgcnVsZSA9IHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBhdHRhY2ggcmVwZWF0IHN5bWJvbCAke3N5bWJvbH0gdG8gZW1wdHkgcnVsZSFgKTtcblxuXHRcdC8vIFRyYW5zZm9ybSBsYXN0IHJ1bGUgaW50byBhIHJlcGVhdCBmb3IgYCpgIGFuZCBgK2AuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCIqXCIgfHwgc3ltYm9sID09PSBcIitcIikge1xuXHRcdFx0bGV0IGFyZ3VtZW50ID0gcnVsZS5hcmd1bWVudDtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5SZXBlYXQoeyBydWxlIH0pO1xuXHRcdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0XHQvLyBwdXNoIGludG8gcnVsZSBzdGFjayBpbiBwbGFjZSBvZiBvbGQgcnVsZVxuXHRcdFx0cnVsZXNbcnVsZXMubGVuZ3RoIC0gMV0gPSBydWxlO1xuXHRcdH1cblxuXHRcdC8vIFJ1bGUgaXMgb3B0aW9uYWwgZm9yIGA/YCBhbmQgYCpgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiP1wiIHx8IHN5bWJvbCA9PT0gXCIqXCIpIHtcblx0XHRcdHJ1bGUub3B0aW9uYWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBbIHVuZGVmaW5lZCwgc3RhcnRJbmRleCBdXG5cdH0sXG5cblx0Ly8gTWF0Y2ggYHs8cnVsZU5hbWU+fWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IG1hdGNoID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIntcIiwgXCJ9XCIsIHN0YXJ0SW5kZXgpO1xuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID09PSAzICYmIG1hdGNoLnNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBtYXRjaC5zbGljZVswXTtcblx0XHRcdG1hdGNoLnNsaWNlID0gbWF0Y2guc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPiAxKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHByb2Nlc3MgcnVsZXMgd2l0aCBtb3JlIHRoYW4gb25lIHJ1bGUgbmFtZTogeyR7bWF0Y2guc2xpY2Uuam9pbihcIlwiKX19YCk7XG5cblx0XHRsZXQgcGFyYW1zID0geyBydWxlOiBtYXRjaC5zbGljZVswXSB9O1xuXG5cdFx0Ly8gc2VlIGlmIHRoZXJlJ3MgYSBgbm90YCBydWxlIGluIHRoZXJlXG5cdFx0bGV0IGJhbmdQb3NpdGlvbiA9IHBhcmFtcy5ydWxlLmluZGV4T2YoXCIhXCIpO1xuXHRcdGlmIChiYW5nUG9zaXRpb24gIT09IC0xKSB7XG5cdFx0XHRwYXJhbXMubm90ID0gcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpOyAvL1sgcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpIF07XG5cdFx0XHRwYXJhbXMucnVsZSA9IHBhcmFtcy5ydWxlLnN1YnN0cigwLCBiYW5nUG9zaXRpb24pO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuU3VicnVsZShwYXJhbXMpO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIG1hdGNoLmVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggbGlzdCBleHByZXNzaW9uIGBbPGl0ZW0+PGRlbGltaXRlcj5dYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDAsIGNvbnN0cnVjdG9yID0gUnVsZS5MaXN0KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBbIGl0ZW0sIGRlbGltaXRlciBdID0gcmVzdWx0cztcblxuXHRcdGxldCBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHsgaXRlbSwgZGVsaW1pdGVyIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cdH0sXG5cbn0pO1xuXG5cblxuLy8gIyMgIEFkZCBtZXRob2RzIHRvIFBhcnNlciB0byBkZWZpbmUgcnVsZXMgdXNpbmcgdGhlIGFib3ZlIHN5bnRheC5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFBhcnNlci5wcm90b3R5cGUsIHtcblxuXHQvLyBQYXJzZSBhIGBydWxlU3ludGF4YCBydWxlIGFuZCBhZGQgaXQgdG8gb3VyIGxpc3Qgb2YgcnVsZXMuXG5cdC8vIFJldHVybnMgdGhlIG5ldyBydWxlLlxuXHQvLyBMb2dzIHBhcnNpbmcgZXJyb3JzIGJ1dCBhbGxvd3MgdGhpbmdzIHRvIGNvbnRpbnVlLlxuXHRhZGRTZXF1ZW5jZTogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlLCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKHR5cGVvZiBjb25zdHJ1Y3RvciAhPT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRwcm9wZXJ0aWVzID0gY29uc3RydWN0b3I7XG5cdFx0XHRjb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2U7XG5cdFx0fVxuXHRcdHRyeSB7XG5cdFx0XHRsZXQgcnVsZSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yKTtcblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cbi8vY29uc29sZS5pbmZvKG5hbWUsIGNvbnN0cnVjdG9yLCBydWxlKTtcblx0XHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmdyb3VwKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgc3ludGF4OiAke3J1bGVTeW50YXh9YCk7XG5cdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdH1cblx0fX0sXG5cblx0YWRkU3RhdGVtZW50OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuU3RhdGVtZW50LCBwcm9wZXJ0aWVzKSB7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmFkZFNlcXVlbmNlKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkRXhwcmVzc2lvbjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLkV4cHJlc3Npb24sIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgcnVsZSA9IHRoaXMuYWRkU2VxdWVuY2UobmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkTGlzdDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLkxpc3QsIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgc3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgocnVsZVN5bnRheCk7XG5cdFx0bGV0IHJ1bGUgPSAoUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pWzBdO1xuXHRcdGlmICghcnVsZSkgcmV0dXJuO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZEtleXdvcmQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5LZXl3b3JkLCBwcm9wZXJ0aWVzKSB7XG5cdFx0bGV0IHN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgpO1xuXHRcdGxldCBydWxlID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X3N0cmluZyhzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pWzBdO1xuXHRcdGlmICghcnVsZSkgcmV0dXJuO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdC8vIEFkZCBpbmZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgb3IgYlwiLlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZEluZml4T3BlcmF0b3I6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSkge1xuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRJbmZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkge1xuXHRcdFx0aWYgKCFydWxlLnRvSlMpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgaW5maXggb3BlcmF0b3IgcnVsZSAnJHtuYW1lfScgdG8gc3BlY2lmeSAndG9KUycgZnVuY3Rpb25gKVxuXHRcdFx0fVxuXHRcdFx0Ly8gY2xlYXIgbGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgZm9yIGdldHRlciBiZWxvd1xuXHRcdFx0ZGVsZXRlIHRoaXMuX19pbmZpeE9wZXJhdG9ycztcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJpbmZpeF9vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH19LFxuXG5cdC8vIExpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGFzIHN0cmluZ3MuXG5cdC8vIFJlLW1lbW9pemVkIGFmdGVyIGBhZGRJbmZpeE9wZXJhdG9yYCBhYm92ZS5cblx0aW5maXhPcGVyYXRvcnM6IGRlZmluZU1lbW9pemVkKFwiX19pbmZpeE9wZXJhdG9yc1wiLFxuXHRcdGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ydWxlc1tcImluZml4X29wZXJhdG9yXCJdXG5cdFx0XHRcdFx0XHQgJiYgdGhpcy5ydWxlc1tcImluZml4X29wZXJhdG9yXCJdLnJ1bGVzLm1hcChydWxlID0+IHJ1bGUuc3RyaW5nKVxuXHR9KSxcblxuXHQvLyBBZGQgcG9zdGZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgaXMgZGVmaW5lZFwiXG5cdC8vIE5PVEU6IGlmIHlvdSBoYXZlIG1vcmUgdGhhbiBvbmUgbWF0Y2hpbmcgb3BlcmF0b3IsXG5cdC8vXHRcdCBwYXNzIGluIGFuIGFycmF5IG9mIHNpbXBsZSBzdHJpbmdzIHNvIGFsbCBvZiBvdXIgb3BlcmF0b3JzIGFyZSBzaW1wbGUgc3RyaW5ncy5cblx0YWRkUG9zdGZpeE9wZXJhdG9yOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpIHtcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkUG9zdGZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkge1xuXHRcdFx0aWYgKCFydWxlLnRvSlMpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgcG9zdGZpeCBvcGVyYXRvciBydWxlICcke25hbWV9JyB0byBzcGVjaWZ5ICd0b0pTJyBmdW5jdGlvbmApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gY2xlYXIgbGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgZm9yIGdldHRlciBiZWxvd1xuXHRcdFx0ZGVsZXRlIHRoaXMuX19wb3N0Zml4T3BlcmF0b3JzO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcInBvc3RmaXhfb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIHBvc3RmaXggb3BlcmF0b3JzIGFzIHN0cmluZ3MuXG5cdC8vIFJlLW1lbW9pemVkIGFmdGVyIGBhZGRJbmZpeE9wZXJhdG9yYCBhYm92ZS5cblx0cG9zdGZpeE9wZXJhdG9yczogZGVmaW5lTWVtb2l6ZWQoXCJfX3Bvc2ZpeE9wZXJhdG9yc1wiLFxuXHRcdGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0JiYgdGhpcy5ydWxlc1tcInBvc3RmaXhfb3BlcmF0b3JcIl0ucnVsZXMubWFwKHJ1bGUgPT4gcnVsZS5zdHJpbmcpO1xuXHR9KVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZVN5bnRheC5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHN0cmVhbSwgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBzdHJlYW1gXHRcdFN0cmVhbSB3aGljaCB3YXMgbWF0Y2hlZCB3aXRoIGBzdGFydEluZGV4YCBhdCB0aGUgc3RhcnQgb2YgdGhlIG1hdGNoXG4vL1x0XHRcdC0gYGVuZEluZGV4YFx0Tm9uLWluY2x1c2l2ZSBlbmQgaW5kZXggaW4gc3RyZWFtIHdoZXJlIG1hdGNoIGVuZHMuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5yZXN1bHRzYFx0XHRcdFJldHVybiBtYXRjaGVkIGFyZ3VtZW50cyBpbiBhIGZvcm1hdCBzdWl0YWJsZSB0byBkbzpcbi8vXHRcdC0gYHJ1bGUudG9Tb3VyY2UoY29udGV4dClgXHRSZXR1cm4gamF2YXNjcmlwdCBzb3VyY2UgdG8gaW50ZXJwcmV0IHRoZSBydWxlLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gUnVsZSB8fCAhdGhpcy5jb25zdHJ1Y3Rvci5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkoXCJjb25zdHJ1Y3RvclwiKSkge1xuLy9jb25zb2xlLndhcm4oXCJub3QgcnVsZVwiLCB0aGlzKTtcblx0XHR9XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdC8vIENsb25lIHRoaXMgcnVsZSBhbmQgYWRkIGFueSBgcHJvcHNgIHBhc3NlZCBpbi5cblx0Y2xvbmUoLi4ucHJvcHMpIHtcblx0XHRsZXQgY2xvbmUgPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xuXHRcdE9iamVjdC5hc3NpZ24oY2xvbmUsIC4uLnByb3BzKTtcblx0XHRyZXR1cm4gY2xvbmU7XG5cdH1cblxuXHQvLyBGb3IgYSBydWxlIGluc3RhbmNlIGFzc29jaWF0ZWQgd2l0aCBhIHN0cmVhbSxcblx0Ly8gcmV0dXJuIGEgbmV3IHN0cmVhbSBBRlRFUiB0aGlzIHJ1bGUncyBlbmQuXG5cdG5leHQoKSB7XG5cdFx0aWYgKCF0aGlzLnN0cmVhbSB8fCB0aGlzLmVuZEluZGV4ID09PSB1bmRlZmluZWQpXG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBydWxlLm5leHQoKSBjYWxsZWQgb24gcnVsZSB3aXRob3V0IGEgc3RyZWFtYCwgdGhpcyk7XG5cdFx0cmV0dXJuIHRoaXMuc3RyZWFtLmFkdmFuY2VUbyh0aGlzLmVuZEluZGV4KTtcblx0fVxuXG4vL1xuLy9cdFBhcnNpbmcgcHJpbWl0aXZlcyAtLSB5b3UgTVVTVCBpbXBsZW1lbnQgdGhlc2UgaW4geW91ciBzdWJjbGFzc2VzIVxuLy9cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcnVsZSBpbiB0aGUgYHN0cmVhbWAuXG5cdC8vIFJldHVybnMgcmVzdWx0cyBvZiB0aGUgcGFyc2Ugb3IgYHVuZGVmaW5lZGAuXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBJcyB0aGlzIHJ1bGUgZGV0ZXJtaW5pc3RpYywgZWc6IGNhbiBpdCBiZSBxdWlja2x5IGFuZCB1bmFtYmlndW91c2x5IHNhdGlzZmllZD9cblx0Ly8gUmV0dXJuaW5nIGB0cnVlYCBjYW4gc3BlZWQgdXAgc2VxdWVuY2UgcHJvY2Vzc2luZyxcblx0Ly9cdGJ1dCBpZiB5b3UncmUgcmVhbGx5IG5vdCBzdXJlLCByZXR1cm4gYHVuZGVmaW5lZGAuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBiaXRzIG9mIG91ciBydWxlIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljIChidXQgYWxsIHBhdHRlcm5zIGFyZSBkZXRlcm1pbmlzdGljKVxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmRcblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBEb2VzIHRoZSBwYXJzZSBgc3RhY2tgIGFscmVhZHkgY29udGFpbiBgcnVsZWA/XG5cdHN0YXRpYyBzdGFja0NvbnRhaW5zKHN0YWNrLCBydWxlLCBzdHJlYW0pIHtcblx0XHRpZiAoc3RhY2subGVuZ3RoID09PSAwKSByZXR1cm4gZmFsc2U7XG5cbi8vY29uc29sZS5pbmZvKHN0YWNrKTtcblx0XHQvLyBnbyBiYWNrd2FyZHNcblx0XHRmb3IgKHZhciBpID0gc3RhY2subGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGxldCBbIG5leHRSdWxlLCBuZXh0U3RyZWFtIF0gPSBzdGFja1tpXTtcblx0XHRcdGlmIChuZXh0UnVsZSA9PT0gcnVsZSkge1xuXHRcdFx0XHRpZiAobmV4dFN0cmVhbS5zdGFydEluZGV4ID09PSBzdHJlYW0uc3RhcnRJbmRleCkge1xuLy9cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiZm91bmQgdW5wcm9kdWN0aXZlIHJ1bGUgXCIsIHJ1bGUsIFwiIG9uIHN0YWNrXCIsIHN0YWNrKTtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcbi8vXHRcdFx0XHRcdGNvbnNvbGUud2FybihcImZvdW5kIHByb2R1Y3RpdmUgcnVsZSBcIiwgcnVsZSwgXCIgb24gc3RhY2tcIiwgc3RhY2spO1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIE5PVEU6IHlvdSBtYXkgd2FudCB0byBtZW1vaXplIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkO1xuXHR9XG5cbi8vXG4vLyAjIyBncm91cDogcmVmbGVjdGlvblxuLy9cblx0Z2V0IHJ1bGVUeXBlKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdH1cbn1cblxuXG5cblxuLy8gUmVnZXggcGF0dGVybi5cbi8vIGBydWxlLnBhdHRlcm5gIGlzIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2guXG4vL1xuLy8gTk9URVx0VG8gbWFrZSB0aGlzIG1vcmUgZ2VuZXJhbGx5IGFwcGxpY2FibGUsIGRvIE5PVCBzdGFydCB0aGUgcGF0dGVybiB3aXRoIGEgYF5gLlxuLy9cdFx0V2UnbGwgYXV0b21hdGljYWxseSBtYWtlIGEgY29weSBvZiB0aGUgUmVnRXhwIHdpdGggdGhlIHN0YXJ0IHBvaW50IGF0dGFjaGVkXG4vL1x0XHRhbmQgdXNlIHRoYXQgYXMgYXBwcm9wcmlhdGUuXG4vL1xuLy9cdFx0VGhpcyB3YXkgd2UgY2FuIHJlLXVzZSB0aGUgcmVnZXggdG8gY2hlY2sgZm9yIGEgbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLi4uXG4vL1xuLy8gWW91IGNhbiBvcHRpb25hbGx5IHNwZWNpZnkgYSBgcnVsZS5ibGFja2xpc3RgLCBhIHNldCBvZiBtYXRjaGVzIHdoaWNoIHdpbGwgc3BlY2lmaWNhbGx5IE5PVCB3b3JrLFxuLy9cdGVnIGZvciBgaWRlbnRpZmllci5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBwYXR0ZXJuYCBpcyByZXF1aXJlZFxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuUGF0dGVybigpOiBZb3UgbXVzdCBwYXNzIGEgYHBhdHRlcm5gIHBhcmFtZXRlclwiKTtcblxuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ3JlYXRlIGEgYHN0YXJ0UGF0dGVybmAgdG8gbWF0Y2ggYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3Ryb25nXG5cdFx0Ly8gQ3JlYXRlIG5vbi1lbnVtZXJhYmx5LlxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInN0YXJ0UGF0dGVyblwiLCB7IHZhbHVlOiBuZXcgUmVnRXhwKFwiXlwiICsgdGhpcy5wYXR0ZXJuLnNvdXJjZSkgfSk7XG5cdH1cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcGF0dGVybiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdGxldCBtYXRjaCA9IHN0cmVhbS5tYXRjaCh0aGlzLnN0YXJ0UGF0dGVybik7XG5cdFx0aWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGJhaWwgaWYgcHJlc2VudCBpbiBibGFja2xpc3Rcblx0XHRsZXQgbWF0Y2hlZCA9IG1hdGNoWzBdO1xuXHRcdGlmICh0aGlzLmJsYWNrbGlzdCAmJiB0aGlzLmJsYWNrbGlzdFttYXRjaGVkXSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBlbmRJbmRleCA9IHN0cmVhbS5zdGFydEluZGV4ICsgbWF0Y2hlZC5sZW5ndGg7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBlbmRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUGF0dGVybnMgYXJlIEFMV0FZUyBkZXRlcm1pbmlzdGljLlxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgcGF0dGVybmlzIGZvdW5kIEFOWVdIRVJFIGluIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIGB1bmRlZmluZWRgIGlmIG5vdCBkZXRlcm1pbnN0aWMgKGJ1dCBhbGwgcGF0dGVybnMgYXJlIGRldGVybWluaXN0aWMpXG5cdC8vXHQtIHJlZ2V4IG1hdGNoIGlmIGZvdW5kLFxuXHQvL1x0LSBgZmFsc2VgIGlmIG5vdCBmb3VuZFxuXHR0ZXN0KHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IG1hdGNoID0gc3RyZWFtLm1hdGNoKHRoaXMucGF0dGVybik7XG5cdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRtYXRjaC5lbmRJbmRleCA9IChtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCk7XG5cdFx0XHRyZXR1cm4gbWF0Y2g7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGFkZFRvQmxhY2tsaXN0KC4uLndvcmRzKSB7XG5cdFx0aWYgKCF0aGlzLmJsYWNrbGlzdCkgdGhpcy5ibGFja2xpc3QgPSB7fTtcblx0XHR3b3Jkcy5mb3JFYWNoKHdvcmQgPT4gdGhpcy5ibGFja2xpc3Rbd29yZF0gPSB0cnVlKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm4uc291cmNlO1xuXHR9XG59XG5cbi8vIFJ1bGUgZm9yIGxpdGVyYWwgc3RyaW5nIHZhbHVlLCB3aGljaCBpbmNsdWRlIHB1bmN0dWF0aW9uIHN1Y2ggYXMgYChgIGV0Yy5cbi8vIGBTeW1ib2xgcyBhcmUgZGlmZmVyZW50IGZyb20gYEtleXdvcmRzYCBpbiB0aGF0IHRoZXkgZG8gbm90IHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5LlxuLy9UT0RPOiByZW5hbWUgYFN5bWJvbGA/Pz9cblJ1bGUuU3ltYm9sID0gY2xhc3MgU3ltYm9sIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLlN5bWJvbCgpOiBFeHBlY3RlZCBzdHJpbmcgcHJvcGVydHlcIik7XG5cblx0XHQvLyBjb252ZXJ0IHN0cmluZyB0byBwYXR0ZXJuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdHByb3BlcnRpZXMucGF0dGVybiA9IFBhcnNlci5SZWdFeHBGcm9tU3RyaW5nKHByb3BlcnRpZXMuc3RyaW5nKTtcbi8vY29uc29sZS5pbmZvKHByb3BlcnRpZXMuc3RyaW5nLCBwcm9wZXJ0aWVzLnBhdHRlcm4pO1xuXHRcdH1cblxuLy9cdFx0Y29uc29sZS5pbmZvKFwiY3JlYXRpbmcgc3RyaW5nXCIsIHByb3BlcnRpZXMpO1xuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHR9XG5cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG4vLyBNZXJnZSB0d28gU3ltYm9sIHJ1bGVzIHRvZ2V0aGVyLCByZXR1cm5pbmcgYSBuZXcgcnVsZSB0aGF0IG1hdGNoZXMgYm90aC5cblJ1bGUubWVyZ2VTeW1ib2xzID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuXHRyZXR1cm4gbmV3IFJ1bGUuU3ltYm9sKHsgc3RyaW5nOiBmaXJzdC5zdHJpbmcgKyBzZWNvbmQuc3RyaW5nIH0pO1xufVxuXG4vLyBLZXl3b3JkIHBhdHRlcm4uXG4vLyBQcm9wZXJ0aWVzOlxuLy9cdC0gYHJ1bGUuc3RyaW5nYCBcdChyZXF1aXJlZCkgXHRLZXl3b3JkIHN0cmluZyB0byBtYXRjaC5cbi8vXHQtIGBydWxlLnBhdHRlcm5gXHQob3B0aW9uYWwpIFx0UmVnRXhwIGZvciB0aGUgbWF0Y2guXG4vL1x0XHRcdFx0XHRcdFx0XHRcdFdlJ2xsIGNyZWF0ZSBvbmUgZnJvbSBgc3RyaW5nYCBpZiBuZWNlc3NhcnkuXG4vL1x0XHRcdFx0XHRcdFx0XHRcdE5PVEU6IGRvIE5PVCBzdGFydCB0aGUgYHBhdHRlcm5gIHdpdGggYF5gLlxuUnVsZS5LZXl3b3JkID0gY2xhc3MgS2V5d29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHQvLyBgc3RyaW5nYCBpcyByZXF1aWVkLlxuXHRcdGlmICghcHJvcGVydGllcy5zdHJpbmcpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5LZXl3b3JkKCk6IEV4cGVjdGVkIHN0cmluZyBwcm9wZXJ0eVwiKTtcblxuXHRcdC8vIGRlcml2ZSBgcGF0dGVybmAgaWYgbmVjZXNzYXJ5LlxuXHRcdGlmICghcHJvcGVydGllcy5wYXR0ZXJuKSB7XG5cdFx0XHQvLyBlbmZvcmNlIHdvcmQgYm91bmRhcmllcyBhbmQgYWxsb3cgYXJiaXRyYXJ5IHNwYWNlIGJldHdlZW4gd29yZHNcblx0XHRcdGxldCBwYXR0ZXJuU3RyaW5nID0gUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMocHJvcGVydGllcy5zdHJpbmcpO1xuXHRcdFx0cHJvcGVydGllcy5wYXR0ZXJuID0gbmV3IFJlZ0V4cChcIlxcXFxiXCIgKyBwYXR0ZXJuU3RyaW5nICsgXCJcXFxcYlwiKTtcblx0XHR9XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cbi8vIE1lcmdlIHR3byBLZXl3b3JkIHJ1bGVzIHRvZ2V0aGVyLCBhZGRpbmcgdGhlIHNlY29uZCB0byB0aGUgZmlyc3QuXG5SdWxlLm1lcmdlS2V5d29yZHMgPSBmdW5jdGlvbihmaXJzdCwgc2Vjb25kKSB7XG5cdHJldHVybiBuZXcgUnVsZS5LZXl3b3JkKHsgc3RyaW5nOiBmaXJzdC5zdHJpbmcgKyBcIiBcIiArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cblxuLy8gU3VicnVsZSAtLSBuYW1lIG9mIGFub3RoZXIgcnVsZSB0byBiZSBjYWxsZWQuXG4vLyBgcnVsZS5ydWxlYCBpcyB0aGUgbmFtZSBvZiB0aGUgcnVsZSBpbiBgcGFyc2VyLnJ1bGVzYC5cblJ1bGUuU3VicnVsZSA9IGNsYXNzIFN1YnJ1bGUgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZU9yRGllKHRoaXMucnVsZSwgXCJydWxlXCIpO1xuXHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIG1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gbWF0Y2g7XG5cdH1cblxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy5ydWxlLCBcInJ1bGVcIik7XG5cdFx0cmV0dXJuIHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmQgb3Jcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYy5cblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnJ1bGUsIFwicnVsZVwiKTtcblx0XHRyZXR1cm4gcnVsZS50ZXN0KHBhcnNlciwgc3RyZWFtKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgeyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlfX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuXG4vLyBBYnN0cmFjdDogIGBOZXN0ZWRgIHJ1bGUgLS0gY29tcG9zZWQgb2YgYSBzZXJpZXMgb2Ygb3RoZXIgYHJ1bGVzYC5cblJ1bGUuTmVzdGVkID0gY2xhc3MgTmVzdGVkIGV4dGVuZHMgUnVsZSB7XG5cblx0Ly8gSXMgdGhpcyBkZXRlcm1pbmlzdGljLCBlZzogYXJlIG91ciBzdWJydWxlcyB1bmFtYmlnb3VzbHkgZGV0ZXJtaW5hYmxlP1xuLy9UT0RPOiBtZW1vaXplP1xuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlcy5ldmVyeShydWxlID0+IHJ1bGUuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSk7XG5cdH1cbn1cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaCAoYXV0by1leGNsdWRpbmcgd2hpdGVzcGFjZSkuXG5SdWxlLlNlcXVlbmNlID0gY2xhc3MgU2VxdWVuY2UgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0Ly8gSWYgd2UgaGF2ZSBhIGB0ZXN0UnVsZWAgZGVmaW5lZFxuXHRcdGlmICh0aGlzLnRlc3RSdWxlKSB7XG5cdFx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy50ZXN0UnVsZSwgXCJ0ZXN0UnVsZVwiKTtcblx0XHRcdGlmIChydWxlLnRlc3QocGFyc2VyLCBzdHJlYW0pID09PSBmYWxzZSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHRpZiAoUnVsZS5zdGFja0NvbnRhaW5zKHN0YWNrLCB0aGlzLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0c3RhY2sgPSBzdGFjay5jb25jYXQoKTtcblx0XHRcdHN0YWNrLnB1c2goW3RoaXMsIHN0cmVhbV0pO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNodW5raXQpIHJldHVybiB0aGlzLnBhcnNlSW5DaHVua3MocGFyc2VyLCBzdHJlYW0sIHN0YWNrKTtcblxuXHRcdGxldCBtYXRjaGVkID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFtYXRjaCAmJiAhcnVsZS5vcHRpb25hbCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0XHRuZXh0ID0gbWF0Y2gubmV4dCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBpZiB3ZSBnZXQgaGVyZSwgd2UgbWF0Y2hlZCBhbGwgdGhlIHJ1bGVzIVxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG4vLyBcdHBhcnNlSW5DaHVua3MocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG4vL1xuLy8gXHR9XG5cbi8vVE9ET0Ncblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gb2JqZWN0IHdpdGggcHJvcGVydGllcyBmcm9tIHRoZSBgbWF0Y2hlZGAgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGBtYXRjaC5hcmd1bWVudGA6XHRcdGFyZ3VtZW50IHNldCB3aGVuIHJ1bGUgd2FzIGRlY2xhcmVkLCBlZzogYHt2YWx1ZTpsaXRlcmFsfWAgPT4gYHZhbHVlYFxuXHQvL1x0XHQtIGBtYXRjaC5ydWxlTmFtZWA6XHRcdG5hbWUgb2YgcnVsZSB3aGVuIGRlZmluZWRcblx0Ly9cdFx0LSBgcnVsZSB0eXBlYDpcdFx0XHRcdG5hbWUgb2YgdGhlIHJ1bGUgdHlwZVxuXHQvLyBOT1RFOiBtZW1vaXplcyB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IHJlc3VsdHMgPSB7fTtcblx0XHRmb3IgKGxldCBtYXRjaCBvZiB0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGxldCBhcmdOYW1lID0gbWF0Y2guYXJndW1lbnQgfHwgbWF0Y2gucnVsZU5hbWUgfHwgbWF0Y2guY29uc3RydWN0b3IubmFtZTtcblxuXHRcdFx0Ly8gSWYgYXJnIGFscmVhZHkgZXhpc3RzLCBjb252ZXJ0IHRvIGFuIGFycmF5XG5cdFx0XHRpZiAoYXJnTmFtZSBpbiByZXN1bHRzKSB7XG5cdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShyZXN1bHRzW2FyZ05hbWVdKSkgcmVzdWx0c1thcmdOYW1lXSA9IFtyZXN1bHRzW2FyZ05hbWVdXTtcblx0XHRcdFx0cmVzdWx0c1thcmdOYW1lXS5wdXNoKG1hdGNoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdID0gbWF0Y2g7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBleHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIFN0YXRlbWVudHMgdGFrZSB1cCB0aGUgZW50aXJlIGxpbmUuXG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXgsIG1hdGNoaW5nIG9uZSBvZiBhIG51bWJlciBvZiBkaWZmZXJlbnQgcnVsZXMuXG4vLyBUaGUgcmVzdWx0IG9mIGEgcGFyc2UgaXMgdGhlIGxvbmdlc3QgcnVsZSB0aGF0IGFjdHVhbGx5IG1hdGNoZWQuXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIGFsdGVybmF0aXZlcyBhcmUgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYy5cblx0Ly9cdC0gcmVnZXggbWF0Y2ggaWYgZm91bmQsXG5cdC8vXHQtIGBmYWxzZWAgaWYgbm90IGZvdW5kIG9yXG5cdHRlc3QocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRpZiAoIXRoaXMuaXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRsZXQgYmVzdE1hdGNoO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS50ZXN0KHBhcnNlciwgc3RyZWFtKTtcblx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRtYXRjaC5lbmRJbmRleCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuXHRcdFx0XHRyZXR1cm4gbWF0Y2g7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIEZpbmQgYWxsIHJ1bGVzIHdoaWNoIG1hdGNoIGFuZCBkZWxlZ2F0ZSB0byBgZ2V0QmVzdE1hdGNoKClgIHRvIHBpY2sgdGhlIGJlc3Qgb25lLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRsZXQgbWF0Y2hlcyA9IFtdO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXHRcdFx0aWYgKG1hdGNoKSBtYXRjaGVzLnB1c2gobWF0Y2gpO1xuXHRcdH1cblxuXHRcdGlmICghbWF0Y2hlcy5sZW5ndGgpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyB1bmNvbW1lbnQgdGhlIGJlbG93IHRvIHByaW50IGFsdGVybmF0aXZlc1xuXHRcdC8vIGlmIChtYXRjaGVzLmxlbmd0aCA+IDEpIHtcblx0XHQvL1x0Y29uc29sZS5pbmZvKHRoaXMuYXJndW1lbnQgfHwgdGhpcy5ydWxlTmFtZSwgbWF0Y2hlcywgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gubWF0Y2hlZFRleHQpKTtcblx0XHQvLyB9XG5cblx0XHRsZXQgYmVzdE1hdGNoID0gKG1hdGNoZXMubGVuZ3RoID09PSAxID8gbWF0Y2hlc1swXSA6IHRoaXMuZ2V0QmVzdE1hdGNoKG1hdGNoZXMpKTtcblxuXHRcdC8vIGFzc2lnbiBgYXJnTmFtZWAgb3IgYHJ1bGVOYW1lYCBmb3IgYHJlc3VsdHNgXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIGJlc3RNYXRjaC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0ZWxzZSBpZiAodGhpcy5ydWxlTmFtZSkgYmVzdE1hdGNoLnJ1bGVOYW1lID0gdGhpcy5ydWxlTmFtZTtcbi8vVE9ETzogb3RoZXIgdGhpbmdzIHRvIGNvcHkgaGVyZT8/P1xuXG5cdFx0cmV0dXJuIGJlc3RNYXRjaDtcblx0fVxuXG5cdC8vIFJldHVybiB0aGUgXCJiZXN0XCIgbWF0Y2ggZ2l2ZW4gbW9yZSB0aGFuIG9uZSBtYXRjaGVzIGF0IHRoZSBoZWFkIG9mIHRoZSBzdHJlYW0uXG5cdC8vIERlZmF1bHQgaXMgdG8gcmV0dXJuIHRoZSBsb25nZXN0IG1hdGNoLlxuXHQvLyBJbXBsZW1lbnQgc29tZXRoaW5nIGVsc2UgdG8gZG8sIGVnLCBwcmVjZWRlbmNlIHJ1bGVzLlxuXHRnZXRCZXN0TWF0Y2gobWF0Y2hlcykge1xuXHRcdHJldHVybiBtYXRjaGVzLnJlZHVjZShmdW5jdGlvbiAoYmVzdCwgbmV4dCkge1xuXHRcdFx0aWYgKG5leHQuZW5kSW5kZXggPiBiZXN0LmVuZEluZGV4KSByZXR1cm4gbmV4dDtcblx0XHRcdHJldHVybiBiZXN0O1xuXHRcdH0sIG1hdGNoZXNbMF0pO1xuXHR9XG5cblx0YWRkUnVsZShydWxlKSB7XG5cdFx0dGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoY29udGV4dCk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCgke3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZXMuam9pbihcInxcIil9KSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBSZXBlYXRpbmcgcnVsZS5cbi8vXHRgdGhpcy5ydWxlYCBpcyB0aGUgcnVsZSB0aGF0IHJlcGVhdHMuXG4vL1xuLy8gQWZ0ZXIgbWF0Y2hpbmc6XG4vL1x0YHRoaXMubWF0Y2hlZGAgaXMgYXJyYXkgb2YgcmVzdWx0cyBvZiBtYXRjaGVzLlxuLy9cbi8vXHRBdXRvbWF0aWNhbGx5IGNvbnN1bWVzIHdoaXRlc3BhY2UgYmVmb3JlIHJ1bGVzLlxuLy9cdElmIGRvZXNuJ3QgbWF0Y2ggYXQgbGVhc3Qgb25lLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuUnVsZS5SZXBlYXQgPSBjbGFzcyBSZXBlYXQgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCBzdHJlYW1dKTtcblx0XHR9XG5cblx0XHRsZXQgbmV4dCA9IHN0cmVhbTtcblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgbWF0Y2ggPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIW1hdGNoKSBicmVhaztcblxuXHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdG5leHQgPSBtYXRjaC5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gYXJyYXkgd2l0aCBhcmd1bWVudHMgb2YgYWxsIHJlc3VsdHMuXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gucmVzdWx0cyApO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0dGhyb3cgXCJEb24ndCB1bmRlcnN0YW5kIGhvdyB0byBzb3VyY2UgUnVsZS5SZXBlYXQhXCI7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRjb25zdCBydWxlID0gKHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UgfHwgdGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHRoaXMucnVsZS5zdHJpbmcuaW5jbHVkZXMoXCIgXCIpXG5cdFx0XHRcdCAgID8gYCgke3RoaXMucnVsZX0pYFxuXHRcdFx0XHQgICA6IGAke3RoaXMucnVsZX1gXG5cdFx0XHRcdCk7XG5cdFx0cmV0dXJuIGAke3J1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe251bWJlcn0sXWAgdG8gbWF0Y2ggYDEsMiwzYFxuLy9cdGBydWxlLml0ZW1gIGlzIHRoZSBydWxlIGZvciBlYWNoIGl0ZW0sXG4vL1x0YHJ1bGUuZGVsaW1pdGVyYCBpcyB0aGUgZGVsaW1pdGVyIGJldHdlZW4gZWFjaCBpdGVtLlxuLy8gXHRgcnVsZS5tYXRjaGVkYCBpbiB0aGUgb3V0cHV0IGlzIHRoZSBsaXN0IG9mIHZhbHVlcy5cbi8vXG4vL1xuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYSBMaXN0IHJ1bGUgd2lsbCBOT1QgcmVwZWF0ICg/Pz8/KVxuUnVsZS5MaXN0ID0gY2xhc3MgTGlzdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2sgPSBbXSkge1xuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdGlmIChSdWxlLnN0YWNrQ29udGFpbnMoc3RhY2ssIHRoaXMsIHN0cmVhbSkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRzdGFjayA9IHN0YWNrLmNvbmNhdCgpO1xuXHRcdFx0c3RhY2sucHVzaChbdGhpcywgc3RyZWFtXSk7XG5cdFx0fVxuXG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgbmV4dCwgc3RhY2spO1xuXHRcdFx0aWYgKCFpdGVtKSBicmVhaztcbi8vY29uc29sZS5sb2coaXRlbSk7XG5cdFx0XHRtYXRjaGVkLnB1c2goaXRlbSk7XG5cdFx0XHRuZXh0ID0gaXRlbS5uZXh0KCk7XG5cblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdC8vIGdldCBkZWxpbWl0ZXIsIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgZGVsaW1pdGVyID0gdGhpcy5kZWxpbWl0ZXIucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0ID0gZGVsaW1pdGVyLm5leHQoKTtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSBkaWRuJ3QgZ2V0IGFueSBtYXRjaGVzLCBmb3JnZXQgaXQuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IG1hdGNoZWRbMF0gPyBtYXRjaGVkWzBdLnN0YXJ0SW5kZXggOiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybiBtYXRjaGVkIGl0ZW0gYnkgaW5kZXhcblx0Z2V0SXRlbShpbmRleCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWRbaW5kZXhdO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1x0XHQvLyBUT0RPOiB0aHJvdz8/P1xuXHRcdGxldCBtYXRjaGVkID0gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gudG9Tb3VyY2UoY29udGV4dCkgKS5qb2luKFwiLCBcIik7XG5cdFx0cmV0dXJuIGBbJHttYXRjaGVkfV1gO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiLy8gU3BlbGwgXCJFbmdsaXNoXCIgcGFyc2VyIHN0cmF3bWFuXG5cbi8vIFRPRE86XHRgdGVzdGAgZnVuY3Rpb24gZm9yIHF1aWNrIG5vLWdvb2QgaGl0IG9uIGB7YX0gYmxhaCBibGFoIHtifWA/XG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcms6ICAgYHtleHByZXNzaW9ufSBpcyB7ZXhwcmVzc2lvbn1gXG4vLyBUT0RPOlx0YnJlYWsgYGZpbGVgIGludG8gbGluZXMgYW5kIHByb2Nlc3MgZWFjaCAoaW5jbC4gc3Vic3RyL21hdGNoIG5vdCBnb2luZyBiZXlvbmQgdGhlIGVuZClcbi8vIFRPRE86XHRuZXN0aW5nIC0tIGlzIHRoaXMganVzdCBpbmRlbnQgPSBcImFkZCBibG9jayBzY29wZVwiXG4vLyBUT0RPOlx0cHJvbW90aW9uIHBhdHRlcm4gZm9yIGdhdGhlciBhcmd1bWVudHMgKGVnOiBsaXRlcmFsLWxpc3QpID8/P1xuLy8gVE9ETzpcdFdoYXQgZG9lcyBzeW50YXggdHJlZSBsb29rIGxpa2U/ICBIb3cgZG8gd2UgZXh0cmFjdCBtZWFuaW5nIG91dCBvZiB0aGUgbmVzdD9cbi8vIFRPRE86XHRQYXNzIGBjb250ZXh0YCB0byB0b1NvdXJjZSgpLCBhZGQgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYGNsYXNzYCwgdmFyaWFibGVzIGFuZCBjb2RlIHRvIGBtZXRob2RgLCBgZ2xvYmFsYCBzdHVmZiBldGNcblxuaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXG5cdFx0Ly8gQ2xvbmUgcnVsZXMsIHN0YXJ0aW5nIHdpdGggYSBjb21wbGV0ZWx5IGVtcHR5IG1hcCBpZiBub3QgZGVmaW5lZCAobm8gc3RhbmRhcmQgb2JqZWN0IGtleXMpXG5cdFx0dGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5ydWxlcyB8fCBudWxsKTtcblx0fVxuXG5cdGdldFJ1bGUobmFtZSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzW25hbWVdO1xuXHR9XG5cblx0Z2V0UnVsZU9yRGllKG5hbWUsIHByb3BlcnR5TmFtZSkge1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGAke3Byb3BlcnR5TmFtZX0gcnVsZSAnJHtuYW1lfScgbm90IGZvdW5kYCk7XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblxuLy9cbi8vIyMjIFBhcnNpbmdcbi8vXG5cdC8vIFBhcnNlIHNvbWV0aGluZzpcblx0Ly9cdC0gaWYgb25lIHN0cmluZyBhcmd1bWVudCwgZG9lcyBhIGBwYXJzZVN0YXRlbWVudCgpYFxuXHQvL1x0LSBpZiB0d28sIGRvZXMgYSBgcGFyc2VSdWxlKClgXG5cdC8vIFJldHVybnMgYHBhcnNlLnRvU3RyaW5nKClgIG9yIHRocm93cy5cbi8vVEVTVE1FXG5cdGNvbXBpbGUoKSB7XG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdGxldCBzdHJpbmcgPSBhcmd1bWVudHNbMF07XG5cdFx0XHRyZXR1cm4gdGhpcy5jb21waWxlU3RhdGVtZW50cyhzdHJpbmcpO1xuXHRcdH1cblx0XHRlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG5cdFx0XHRsZXQgbmFtZSA9IGFyZ3VtZW50c1swXSwgc3RyaW5nID0gYXJndW1lbnRzWzFdO1xuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMucGFyc2UobmFtZSwgc3RyaW5nKTtcblx0XHRcdGlmICghcmVzdWx0KSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYHBhcnNlci5wYXJzZSgnJHtuYW1lfScsICcke3N0cmluZ30nKTogY2FuJ3QgcGFyc2UgdGhpc2ApO1xuXHRcdFx0cmV0dXJuIHJlc3VsdC50b1NvdXJjZSgpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihcInBhcnNlci5wYXJzZSgpOiBleHBlY3RzIG9uZSBvciB0d28gYXJndW1lbnRzXCIpO1xuXHRcdH1cblx0fVxuXG5cdC8vIFBhcnNlIGBuYW1lYGQgcnVsZSBhdCBoZWFkIG9mIGBzdHJlYW1gIChgc3RyaW5nYCBvciBgVGV4dFN0cmVhbWApLlxuXHQvLyBIYW5kbGVzIG9wdGlvbmFsIGFuZCByZXBlYXRpbmcgcnVsZXMgYXMgd2VsbCBhcyBlYXRpbmcgd2hpdGVzcGFjZS5cblx0Ly8gUmV0dXJucyByZXN1bHQgb2YgcGFyc2UuXG4vL1RFU1RNRVxuXHRwYXJzZShuYW1lLCBzdHJlYW0pIHtcblx0XHRpZiAodHlwZW9mIHN0cmVhbSA9PT0gXCJzdHJpbmdcIikgc3RyZWFtID0gbmV3IFRleHRTdHJlYW0oc3RyZWFtKTtcblx0XHRsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShuYW1lKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2VyLnBhcnNlKCR7bmFtZX0pOiBSdWxlIG5vdCBmb3VuZGApO1xuXHRcdHN0cmVhbSA9IHRoaXMuZWF0V2hpdGVzcGFjZShzdHJlYW0pO1xuXHRcdHJldHVybiBydWxlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdH1cblxuXHQvLyBQYXJzZSBhIHNldCBvZiBzdGF0ZW1lbnRzIGxpbmUtYnktbGluZS5cbi8vVEVTVE1FXG5cdGNvbXBpbGVTdGF0ZW1lbnRzKHN0YXRlbWVudHMpIHtcblx0XHRjb25zb2xlLnRpbWUoXCJwYXJzZVN0YXRlbWVudHNcIik7XG5cdFx0bGV0IHJlc3VsdHMgPSBbXTtcblx0XHRsZXQgY3VycmVudEluZGVudCA9IDA7XG5cdFx0Y29uc3QgdGFicyA9IFwiXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XCI7XG5cdFx0c3RhdGVtZW50cy5zcGxpdCgvXFxuL2cpLmZvckVhY2goc3RhdGVtZW50ID0+IHtcblx0XHRcdC8vIHNraXAgbGluZXMgdGhhdCBhcmUgYWxsIHdoaXRlc3BhY2Vcblx0XHRcdGlmIChzdGF0ZW1lbnQudHJpbSgpID09PSBcIlwiKSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChcIlwiKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBmaWd1cmUgb3V0IGluZGVudCBsZXZlbCBvZiB0aGlzIGxpbmVcblx0XHRcdGxldCBsaW5lU3RhcnQgPSBzdGF0ZW1lbnQubWF0Y2goL15cXHQqLylbMF07XG5cdFx0XHRsZXQgbGluZUluZGVudCA9IGxpbmVTdGFydC5sZW5ndGg7XG5cdFx0XHRpZiAobGluZUluZGVudCA+IGN1cnJlbnRJbmRlbnQpIHtcblx0XHRcdFx0Ly8gYWRkIHRvIGVuZCBvZiBwcmV2aW91cyBsaW5lIGlmIHBvc3NpYmxlXG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCkgcmVzdWx0c1tyZXN1bHRzLmxlbmd0aCAtIDFdICs9IFwiIHtcIjtcblx0XHRcdFx0ZWxzZSByZXN1bHRzLnB1c2godGFicy5zdWJzdHIoMCwgbGluZUluZGVudC0xKSArIFwie1wiKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGxpbmVJbmRlbnQgPCBjdXJyZW50SW5kZW50KSB7XG5cdFx0XHRcdGxldCBjbG9zZXJzID0gW107XG5cdFx0XHRcdGZvciAobGV0IGkgPSBjdXJyZW50SW5kZW50OyBpID4gbGluZUluZGVudDsgaS0tKSB7XG5cdFx0XHRcdFx0Y2xvc2Vycy5wdXNoKHRhYnMuc3Vic3RyKDAsIGktMSkgKyBcIn1cIik7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gcHV0IHBhcmVucyBCRUZPUkUgYW55IGJsYW5rIGxpbmVzIVxuXHRcdFx0XHRsZXQgbGFzdEJsYW5rTGluZSA9IHRoaXMuX2dldExhc3RCbGFua0xpbmUocmVzdWx0cyk7XG5cdFx0XHRcdHJlc3VsdHMuc3BsaWNlKGxhc3RCbGFua0xpbmUsIDAsIC4uLmNsb3NlcnMpO1xuXHRcdFx0fVxuXHRcdFx0Y3VycmVudEluZGVudCA9IGxpbmVJbmRlbnQ7XG5cblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnBhcnNlKFwic3RhdGVtZW50XCIsIHN0YXRlbWVudCk7XG4vL1RPRE86IGNvbXBsYWluIGlmIGNhbid0IHBhcnNlIHRoZSBlbnRpcmUgbGluZSFcblx0XHRcdGlmIChyZXN1bHQpIHtcblx0XHRcdFx0bGV0IHNvdXJjZSA9IHJlc3VsdC50b1NvdXJjZSgpLnNwbGl0KFwiXFxuXCIpO1xuXHRcdFx0XHRyZXN1bHRzLnB1c2gobGluZVN0YXJ0ICsgc291cmNlLmpvaW4oXCJcXG5cIiArIGxpbmVTdGFydCkpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGNvbnNvbGUud2FybihcIkNvdWxkbid0IHBhcnNlIHN0YXRlbWVudDpcIiwgc3RhdGVtZW50KTtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKFwiRVJST1I6IFwiK3N0YXRlbWVudCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR3aGlsZSAoY3VycmVudEluZGVudCA+IDApIHtcblx0XHRcdHJlc3VsdHMucHVzaCh0YWJzLnN1YnN0cigwLCBjdXJyZW50SW5kZW50LTEpICsgXCJ9XCIpO1xuXHRcdFx0Y3VycmVudEluZGVudC0tO1xuXHRcdH1cblxuXHRcdGNvbnNvbGUudGltZUVuZChcInBhcnNlU3RhdGVtZW50c1wiKTtcblx0XHRyZXR1cm4gcmVzdWx0cy5qb2luKFwiXFxuXCIpO1xuXHR9XG5cblx0Ly8gRmlndXJlIG91dCB0aGUgbGFzdCBibGFuayBsaW5lIGluIHRoZSByZXN1bHRzXG5cdF9nZXRMYXN0QmxhbmtMaW5lKHJlc3VsdHMpIHtcblx0XHRmb3IgKGxldCBpID0gcmVzdWx0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0aWYgKHJlc3VsdHNbaV0gPT09IFwiXCIpIGNvbnRpbnVlO1xuXHRcdFx0cmV0dXJuIGkgKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gMDtcblx0fVxuXG5cdC8vIEVhdCB3aGl0ZXNwYWNlIChhY2NvcmRpbmcgdG8gYHJ1bGVzLndoaXRlc3BhY2VgKSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnMgbmV3IHN0cmVhbSBpZiB3ZSBtYXRjaGVkIHdoaXRlc3BhY2UsIG90aGVyd2lzZSB0aGUgc2FtZSBzdHJlYW0uXG5cdGVhdFdoaXRlc3BhY2Uoc3RyZWFtKSB7XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMucnVsZXMud2hpdGVzcGFjZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gc3RyZWFtO1xuXHRcdHJldHVybiBzdHJlYW0uYWR2YW5jZUJ5KHJlc3VsdC5tYXRjaGVkLmxlbmd0aCk7XG5cdH1cblxuLy9cbi8vXHRSdWxlc1xuLy9cblxuXHQvLyBBZGQgYSBydWxlIHRvIG91ciBsaXN0IG9mIHJ1bGVzIVxuXHQvLyBDb252ZXJ0cyB0byBgYWx0ZXJuYXRpdmVzYCBvbiByZS1kZWZpbmluZyB0aGUgc2FtZSBydWxlLlxuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHQvLyBkb24ndCBvdmVycmlkZSBydWxlTmFtZVxuXHRcdGlmICghcnVsZS5ydWxlTmFtZSkgcnVsZS5ydWxlTmFtZSA9IG5hbWU7XG5cblx0XHRsZXQgZXhpc3RpbmcgPSB0aGlzLnJ1bGVzW25hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtuYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZTogbmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdC8vIGNvcHkgYXJndW1lbnQgbmFtZSBvdmVyICg/Pz8pXG5cdFx0XHRcdGlmIChleGlzdGluZy5hcmd1bWVudCkgdGhpcy5ydWxlc1tuYW1lXS5hcmd1bWVudCA9IGV4aXN0aW5nLmFyZ3VtZW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JyB0byAnJHtuYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXS5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBydWxlO1xuXHRcdH1cblxuXG5cdFx0Ly8gbWFrZSBhIG5vdGUgaWYgd2UncmUgYWRkaW5nIGEgbGVmdC1yZWN1cnNpdmUgcnVsZVxuXHRcdGlmICh0aGlzLnJ1bGVJc0xlZnRSZWN1cnNpdmUobmFtZSwgcnVsZSkpIHtcbi8vY29uc29sZS5pbmZvKFwibWFya2luZyBcIiwgcnVsZSwgXCIgYXMgbGVmdCByZWN1cnNpdmUhXCIpO1xuXHRcdFx0cnVsZS5sZWZ0UmVjdXJzaXZlID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cdC8vIElzIHRoZSBzcGVjaWZpZWQgcnVsZSBsZWZ0LXJlY3Vyc2l2ZT9cblx0cnVsZUlzTGVmdFJlY3Vyc2l2ZShuYW1lLCBydWxlKSB7XG5cdFx0aWYgKCEocnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UpKSByZXR1cm4gZmFsc2U7XG4vL2NvbnNvbGUubG9nKG5hbWUsIHJ1bGUpO1xuXHRcdGZvciAobGV0IHN1YnJ1bGUgb2YgcnVsZS5ydWxlcykge1xuXHRcdFx0Ly8gaWdub3JlIG9wdGlvbmFsIHJ1bGVzXG5cdFx0XHRpZiAoc3VicnVsZS5vcHRpb25hbCkgY29udGludWU7XG5cdFx0XHRpZiAoc3VicnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3VicnVsZSAmJiBzdWJydWxlLnJ1bGUgPT09IG5hbWUpIHJldHVybiB0cnVlO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXG4vL1xuLy8gIyMgVXRpbGl0eSBtZXRob2RzXG4vL1xuXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gXG5cdC8vXHRpbiBhcnJheSBvZiBgdG9rZW5zYCAoc3RyaW5ncykuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cblxuXHQvLyBMaXN0IG9mIHNwZWNpYWwgY2hhcmFjdGVycyBpbiByZWd1bGFyIGV4cHJlc3Npb25zLlxuXHQvLyBVc2VkIHRvIGVzY2FwZSB0aG9zZSBjaGFycyB3aGVuIGNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbnMgZnJvbSBzdHJpbmdzLlxuXHRzdGF0aWMgUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyA9IChmdW5jdGlvbigpIHtcblx0XHRjb25zdCBjaGFycyA9IHt9O1xuXHRcdFwiXFxcXC9eJCorPy4oKXx7fSxbXVwiLnNwbGl0KFwiXCIpLmZvckVhY2goY2hhciA9PiBjaGFyc1tjaGFyXSA9IHRydWUpO1xuXHRcdHJldHVybiBjaGFycztcblx0fSkoKVxuXG5cdC8vIEdpdmVuIGEgXCJub3JtYWxcIiBgc3RyaW5nYCwgZXNjYXBlIGFueSByZWd1bGFyIGV4cHJlc3Npb24gc3BlY2lhbCBjaGFyYWN0ZXJzXG5cdC8vXHRzbyB3ZSBjYW4gY3JlYXRlIGEgYG5ldyBSZWdFeHAoKWAuXG5cdC8vIEFsc28gY29udmVydHMgYSBzaW5nbGUgc3BhY2UgdG8gYXJiaXRyYXJ5IHNldCBvZiBzcGFjZXMgd2l0aCBcIlxccytcIlxuXHRzdGF0aWMgZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpIHtcblx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KFwiXCIpLm1hcChmdW5jdGlvbiAoY2hhciwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3IgYmFja3NsYXNoXG5cdFx0XHRpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIjtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igc3BhY2Vcblx0XHRcdGlmIChjaGFyID09PSBcIiBcIikgcmV0dXJuIFwiXFxcXHMrXCI7XG5cdFx0XHQvLyBJZiBhIHNwZWNpYWwgY2hhciBhbmQgcHJldmlvdXMgY2hhcmFjdGVyIHdhcyBub3QgYW4gZXNjYXBlLCBlc2NhcGUgdGhlIHJlc3VsdC5cblx0XHRcdGlmIChQYXJzZXIuUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSU1tjaGFyXSAmJiBsaXN0W2luZGV4LTFdICE9PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiK2NoYXI7XG5cdFx0XHQvLyBUaGlzIGNoYXIgc2hvdWxkIGJlIGZpbmUgYnkgaXRzZWxmLlxuXHRcdFx0cmV0dXJuIGNoYXI7XG5cdFx0fSkuam9pbihcIlwiKTtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyByZWd1bGFyIGV4cHJlc3Npb24gZnJvbSBhIFwibm9ybWFsXCIgc3RyaW5nLCBlc2NhcGluZyBzcGVjaWFsIGNoYXJhY3RlcnMgYXMgbmVjZXNzYXJ5LlxuXHRzdGF0aWMgUmVnRXhwRnJvbVN0cmluZyhzdHJpbmcsIGZsYWdzKSB7XG5cdFx0cmV0dXJuIG5ldyBSZWdFeHAoUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSwgZmxhZ3MpO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXG4vL1x0IyBDb3JlIGBydWxlc2AgLS0gc2ltcGxlIGRhdGF0eXBlcywgZXRjLlxuLy9cbi8vIE5PVEU6IG1hbnkgb2YgdGhlIGJlbG93IGFyZSBjcmVhdGVkIGFzIGN1c3RvbSBQYXR0ZXJuIHN1YmNsYXNzZXMgZm9yIGRlYnVnZ2luZy5cbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGB3aGl0ZXNwYWNlYCBydWxlLlxuLy8gTk9URSBgcGFyc2VyLnBhcnNlUnVsZShcIndoaXRlc3BhY2VcIiwgXCIgICBcIilgIHdpbGwgcmV0dXJuIGB1bmRlZmluZWRgXG4vL1x0XHQgYmVjYXVzZSBgcGFyc2VyLnBhcnNlUnVsZSgpYCBhdXRvbWF0aWNhbGx5IGVhdHMgd2hpdGVzcGFjZSBhdCB0aGUgc3RhcnQgb2YgYSBydWxlLlxuUnVsZS5XaGl0ZXNwYWNlID0gY2xhc3Mgd2hpdGVzcGFjZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fVxucGFyc2VyLmFkZFJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIG5ldyBSdWxlLldoaXRlc3BhY2UoeyBwYXR0ZXJuOiAvXFxzKy8sIG9wdGlvbmFsOiB0cnVlIH0pKTtcblxuLy8gYGlkZW50aWZpZXJgID0gdmFyaWFibGVzIG9yIHByb3BlcnR5IG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcblJ1bGUuSWRlbnRpZmllciA9IGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgaWRlbnRpZmllciA9IHBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgUnVsZS5JZGVudGlmaWVyKHtcblx0cGF0dGVybjogL1thLXpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGlkZW50aWZpZXIpO1xuXG4vLyBBZGQgRW5nbGlzaCBwcmVwb3NpdGlvbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vL1xuLy8gV2lraXBlZGlhIFwiUHJlcG9zaXRpb25cIjpcbi8vXHRcIlByZXBvc2l0aW9ucy4uLmFyZSBhIGNsYXNzIG9mIHdvcmRzIHRoYXRcbi8vXHRleHByZXNzIHNwYXRpYWwgb3IgdGVtcG9yYWwgcmVsYXRpb25zICAoaW4sIHVuZGVyLCB0b3dhcmRzLCBiZWZvcmUpXG4vL1x0b3IgbWFyayB2YXJpb3VzIHNlbWFudGljIHJvbGVzIChvZiwgZm9yKS5cbi8vIFRFU1RNRVxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYWJvdXRcIiwgXCJhYm92ZVwiLCBcImFmdGVyXCIsIFwiYW5kXCIsIFwiYXNcIiwgXCJhdFwiLFxuXHRcImJlZm9yZVwiLCBcImJlaGluZFwiLCBcImJlbG93XCIsIFwiYmVuZWF0aFwiLCBcImJlc2lkZVwiLCBcImJldHdlZW5cIiwgXCJiZXlvbmRcIiwgXCJieVwiLFxuXHRcImRlZmluZWRcIiwgXCJkb3duXCIsIFwiZHVyaW5nXCIsXG5cdFwiZWFjaFwiLCBcImVtcHR5XCIsIFwiZXhhY3RseVwiLCBcImV4Y2VwdFwiLFxuXHRcImZvclwiLCBcImZyb21cIixcblx0XCJncmVhdGVyXCIsXG5cdFwiaW5cIiwgXCJpbnRvXCIsXG5cdFwibGVzc1wiLCBcImxvbmdcIixcblx0XCJtaW51c1wiLCBcIm1vcmVcIixcblx0XCJuZWFyXCIsIFwibm90XCIsXG5cdFwib2ZcIiwgXCJvZmZcIiwgXCJvblwiLCBcIm9udG9cIiwgXCJvcHBvc2l0ZVwiLCBcIm91dFwiLCBcIm91dHNpZGVcIiwgXCJvdmVyXCIsXG5cdFwic2hvcnRcIiwgXCJzaW5jZVwiLFxuXHRcInRoYW5cIiwgXCJ0aGVcIiwgXCJ0aGVuXCIsIFwidGhyb3VnaFwiLCBcInRocnVcIiwgXCJ0b1wiLCBcInRvd2FyZFwiLCBcInRvd2FyZHNcIixcblx0XCJ1bmRlZmluZWRcIiwgXCJ1bmRlclwiLCBcInVuZGVybmVhdGhcIiwgXCJ1bmlxdWVcIiwgXCJ1bnRpbFwiLCBcInVwXCIsIFwidXBvblwiLCBcInVwc2lkZVwiLFxuXHRcInZlcnN1c1wiLCBcInZzXCIsXG5cdFwid2l0aFwiLCBcIndpdGhpblwiLCBcIndpdGhvdXRcIixcbik7XG5cbi8vIEFkZCBjb21tb24gZW5nbGlzaCB2ZXJicyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFyZVwiLFxuXHRcImRvXCIsIFwiZG9lc1wiLFxuXHRcImNvbnRhaW5zXCIsXG5cdFwiaGFzXCIsIFwiaGF2ZVwiLFxuXHRcImlzXCIsXG5cdFwicmVwZWF0XCIsXG5cdFwid2FzXCIsIFwid2VyZVwiXG4pO1xuXG4vLyBBZGQgc3BlY2lhbCBjb250cm9sIGtleXdvcmRzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiZWxzZVwiLFxuXHRcImlmXCIsXG5cdFwib3RoZXJ3aXNlXCIsXG5cdFwid2hpbGVcIlxuKTtcblxuLy8gYFR5cGVgID0gdHlwZSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGFuIHVwcGVyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5UeXBlID0gY2xhc3MgdHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbnBhcnNlci5hZGRSdWxlKFwidHlwZVwiLCBuZXcgUnVsZS5UeXBlKHtcblx0cGF0dGVybjogLyhbQS1aXVtcXHdcXC1dKnx0ZXh0fG51bWJlcnxpbnRlZ2VyfGRlY2ltYWx8Y2hhcmFjdGVyfGJvb2xlYW4pLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdGxldCB2YWx1ZSA9IHRoaXMubWF0Y2hlZDtcblx0XHRzd2l0Y2godmFsdWUpIHtcblx0XHRcdC8vIHNwZWNpYWwgY2FzZSB0byB0YWtlIHRoZSBmb2xsb3dpbmcgYXMgbG93ZXJjYXNlXG5cdFx0XHRjYXNlIFwidGV4dFwiOlx0XHRyZXR1cm4gXCJTdHJpbmdcIjtcblx0XHRcdGNhc2UgXCJjaGFyYWN0ZXJcIjpcdHJldHVybiBcIkNoYXJhY3RlclwiO1xuXHRcdFx0Y2FzZSBcIm51bWJlclwiOlx0XHRyZXR1cm4gXCJOdW1iZXJcIjtcblx0XHRcdGNhc2UgXCJpbnRlZ2VyXCI6XHRcdHJldHVybiBcIkludGVnZXJcIjtcblx0XHRcdGNhc2UgXCJkZWNpbWFsXCI6XHRcdHJldHVybiBcIkRlY2ltYWxcIjtcblx0XHRcdGNhc2UgXCJib29sZWFuXCI6XHRcdHJldHVybiBcIkJvb2xlYW5cIjtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiB2YWx1ZS5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHRcdH1cblx0fVxufSkpO1xuXG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLnR5cGUpO1xuXG5cbi8vIGBudW1iZXJgIGFzIGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG5SdWxlLk51bWJlciA9IGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBudW1iZXIgPSBwYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgUnVsZS5OdW1iZXIoe1xuXHRwYXR0ZXJuOiAvLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIG51bWJlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUZsb2F0KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgbnVtYmVyKTtcblxuXG4vLyBOdW1lcmljIGBpbnRlZ2VyYCBvbmx5LCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBOT1RFOiB0aGlzIFdJTEwgbWF0Y2ggYSBmbG9hdCwgYnV0IHRoZSByZXR1cm5lZCB2YWx1ZSB3aWxsIGNvZXJjZSB0byBhbiBpbnRlZ2VyLlxuLy8gUkVWSUVXOiBpcyB0aGlzIHJpZ2h0PyAgQmV0dGVyIHRvIG5vdCBtYXRjaCBhIGZsb2F0P1xuUnVsZS5JbnRlZ2VyID0gY2xhc3MgaW50ZWdlciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbnBhcnNlci5hZGRSdWxlKFwiaW50ZWdlclwiLCBuZXcgUnVsZS5JbnRlZ2VyKHtcblx0cGF0dGVybjogLy0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBpbnRlZ2VyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlSW50KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5cblxuLy8gTGl0ZXJhbCBgdGV4dGAgc3RyaW5nLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBZb3UgY2FuIHVzZSBlaXRoZXIgc2luZ2xlIG9yIGRvdWJsZSBxdW90ZXMgb24gdGhlIG91dHNpZGUgKGFsdGhvdWdoIGRvdWJsZSBxdW90ZXMgYXJlIHByZWZlcnJlZCkuXG4vLyBSZXR1cm5lZCB2YWx1ZSBoYXMgZW5jbG9zaW5nIHF1b3Rlcy5cbi8vIFRPRE86IGVzY2FwZWQgcXVvdGVzIGluc2lkZSBzdHJpbmdcblJ1bGUuVGV4dCA9IGNsYXNzIHRleHQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgdGV4dCA9IHBhcnNlci5hZGRSdWxlKFwidGV4dFwiLCBuZXcgUnVsZS5UZXh0KHtcblx0cGF0dGVybjogLyg/OlwiW15cIl0qXCJ8J1teJ10qJykvXG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdGV4dCk7XG5cblxuLy8gQm9vbGVhbiBsaXRlcmFsLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBUT0RPOiBiZXR0ZXIgbmFtZSBmb3IgdGhpcz8/P1xuUnVsZS5Cb29sZWFuID0gY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBib29sID0gcGFyc2VyLmFkZFJ1bGUoXCJib29sZWFuXCIsIG5ldyBSdWxlLkJvb2xlYW4oe1xuXHRwYXR0ZXJuOiAvKHRydWV8ZmFsc2V8eWVzfG5vfG9rfGNhbmNlbClcXGIvLFxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHN3aXRjaCAodGhpcy5tYXRjaGVkKSB7XG5cdFx0XHRjYXNlIFwidHJ1ZVwiOlxuXHRcdFx0Y2FzZSBcInllc1wiOlxuXHRcdFx0Y2FzZSBcIm9rXCI6XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGJvb2wpO1xuLy8gQWRkIGJvb2xlYW4gdG9rZW5zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy8gVEVTVE1FXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJ0cnVlXCIsIFwiZmFsc2VcIixcblx0XCJ5ZXNcIiwgXCJub1wiLFxuXHRcIm9rXCIsIFwiY2FuY2VsXCJcbik7XG5cbi8vIExpdGVyYWwgbGlzdCAoYXJyYXkpLCBlZzogIGBbMSwyLHRydWUsZmFsc2UgXWBcbmxldCBsaXN0ID0gcGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGl0ZXJhbF9saXN0XCIsXG5cdFwiXFxcXFtbbGlzdDp7ZXhwcmVzc2lvbn0sXT9cXFxcXVwiLFxuXHRjbGFzcyBsaXRlcmFsX2xpc3QgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGlmICghbGlzdCkgcmV0dXJuIFwiW11cIjtcbiBcdFx0XHRyZXR1cm4gbGlzdC50b1NvdXJjZShjb250ZXh0KTtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gUGFyZW50aGVzaXplZCBleHByZXNzaW9uXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicGFyZW50aGVzaXplZF9leHByZXNzaW9uXCIsXG5cdFwiXFxcXCh7ZXhwcmVzc2lvbn1cXFxcKVwiLFxuXHRjbGFzcyBwYXJlbnRoZXNpemVkX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdGdldCByZXN1bHRzKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMubWF0Y2hlZFsxXTtcblx0XHR9XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGV4cHJlc3Npb24gPSB0aGlzLnJlc3VsdHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyBkb24ndCBkb3VibGUgcGFyZW5zIGlmIG5vdCBuZWNlc3Nhcnlcblx0XHRcdGlmICh0eXBlb2YgZXhwcmVzc2lvbiA9PT0gXCJzdHJpbmdcIiAmJiBleHByZXNzaW9uLnN0YXJ0c1dpdGgoXCIoXCIpICYmIGV4cHJlc3Npb24uZW5kc1dpdGgoXCIpXCIpKSByZXR1cm4gZXhwcmVzc2lvbjtcblx0XHRcdHJldHVybiBgKCR7ZXhwcmVzc2lvbn0pYDtcblx0XHR9XG5cdH1cbilcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9jb3JlLmpzIiwiXG4vLyBUT0RPOiBjb252ZXJ0IHRvIGxpbmUtYXdhcmUgc3RyZWFtPz8/XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXh0U3RyZWFtIHtcblx0Ly8gWW91IGNhbiBjb25zdHJ1Y3Qgd2l0aCBhIHRleHQgc3RyaW5nIG9yIGEgc2V0IG9mIHByb3BlcnRpZXMgKGluY2x1ZGluZyBgdGV4dGApLlxuXHRjb25zdHJ1Y3RvciguLi50ZXh0T3JQcm9wcykge1xuXHRcdHRleHRPclByb3BzLmZvckVhY2goKGFyZykgPT4ge1xuXHRcdFx0aWYgKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0dGhpcy50ZXh0ID0gYXJnO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoYXJnKSB7XG5cdFx0XHRcdE9iamVjdC5hc3NpZ24odGhpcywgYXJnKTtcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0Ly8gTWFrZSBzdXJlIGB0ZXh0YCBhbmQgYHN0YXJ0SW5kZXhgIGFyZSBkZWZpbmVkLlxuXHRcdGlmICghKFwidGV4dFwiIGluIHRoaXMpKSB0aGlzLnRleHQgPSBcIlwiO1xuXHRcdGlmICghKFwic3RhcnRJbmRleFwiIGluIHRoaXMpKSB0aGlzLnN0YXJ0SW5kZXggPSAwO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGFuIGltbXV0YWJsZSBjbG9uZSBvZiB0aGUgc3RyZWFtLlxuXHRjbG9uZShwcm9wcykge1xuXHRcdHJldHVybiBuZXcgVGV4dFN0cmVhbSh0aGlzLCBwcm9wcyk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNlZCB0byBuZXcgc3RhcnRJbmRleC5cblx0YWR2YW5jZVRvKHN0YXJ0SW5kZXgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXggfSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNpbmcgc3RhcnRJbmRleCBCWSBgbGVuZ3RoYFxuXHRhZHZhbmNlQnkobGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG5cdH1cblxuLy8gXHQvLyBSZXR1cm4gY2xvbmUgb2YgdGhpcyBzdHJlYW0gd2l0aCBlbmRJbmRleCBzZXQgdG8gc3RhcnQgKyBgbGVuZ3RoYFxuLy8gXHRlbmRBZnRlcihsZW5ndGgpIHtcbi8vIFx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IGVuZEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG4vLyBcdH1cblxuLy9cbi8vICMjIE1hdGNoaW5nXG4vL1xuXHQvLyBNYXRjaCBgcGF0dGVybmAgYXMgcmVnZXggaW4gdGhpcyBzdHJlYW0uXG5cdC8vIFJldHVybnMgbWF0Y2ggb3IgYHVuZGVmaW5lZGAuXG5cdC8vIElmIHlvdSB3YW50IHRvIHRlc3QgdGhlIHN0YXJ0IG9mIHRoZSBzdHJlYW0sXG5cdC8vXHRtYWtlIHN1cmUgeW91ciByZWdleCBzdGFydHMgd2l0aCBgXmAuXG5cdC8vIFRFU1RNRTogdGhpcyBsaWtlbHkgYnJlYWtzIHdpdGggYSBgZ2Agb24gdGhlIHBhdHRlcm4/XG5cdG1hdGNoKHBhdHRlcm4pIHtcblx0XHRpZiAoIShwYXR0ZXJuIGluc3RhbmNlb2YgUmVnRXhwKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGV4dFN0cmVhbS5tYXRjaCgke3BhdHRlcm59KTogZXhwZWN0ZWQgUmVnRXhwYCk7XG4vL1RPRE86IHVzZSBgc3RyZWFtLnJhbmdlYCB0byBlbnN1cmUgbWF0Y2ggaXMgbm90IG5vdCBiZXlvbmQgYHN0cmluZy5lbmRJbmRleGBcblx0XHRyZXR1cm4gdGhpcy5oZWFkLm1hdGNoKHBhdHRlcm4pIHx8IHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIERvZXMgdGhpcyBzdHJlYW0gSU5DTFVERSBhIHJlZ2V4IHdpdGhpbiBpdD9cblx0Ly8gUmV0dXJucyBgdHJ1ZWAgb3IgYGZhbHNlYC5cblx0Ly8gTk9URTogUGF0dGVybiBtdXN0IE5PVCBzdGFydCB3aXRoIGBeYCBmb3IgdGhpcyB0byBtYXRjaCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBzdHJlYW0uXG5cdHRlc3QocGF0dGVybikge1xuXHRcdHJldHVybiBwYXR0ZXJuLnRlc3QodGhpcy5oZWFkKTtcblx0fVxuXG4vL1xuLy8gIyMgUmVmbGVjdGlvblxuLy9cblx0Ly8gUmV0dXJuIHRleHQgb2Ygc3RyaW5nIHN0YXJ0aW5nIGF0IG91ciBgc3RhcnRJbmRleGBcblx0Z2V0IGhlYWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMucmFuZ2UoKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIHJhbmdlIG9mIHRoZSBzdHJpbmcgZnJvbSBgc3RhcnRJbmRleGAgdG8gYGVuZEluZGV4YCBOT04taW5jbHVzaXZlLlxuXHRyYW5nZShzdGFydEluZGV4ID0gdGhpcy5zdGFydEluZGV4LCBlbmRJbmRleCA9IHRoaXMuZW5kSW5kZXggfHwgdGhpcy50ZXh0Lmxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQuc3Vic3RyaW5nKHN0YXJ0SW5kZXgsIGVuZEluZGV4KTtcblx0fVxuXG5cdC8vIExlbmd0aCBvZiB0aGUgc3RyZWFtLlxuXHRnZXQgbGVuZ3RoKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQubGVuZ3RoO1xuXHR9XG5cblx0Ly8gQXJlIHdlIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmVhbT9cblx0Z2V0IGlzRW1wdHkoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3RhcnRJbmRleCA9PT0gdGhpcy5sZW5ndGg7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0XG5cdH07XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvVGV4dFN0cmVhbS5qcyIsImltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBsb2FkIHN0YW5kYXJkIHJ1bGVzIGZpbGVzIGhlcmVcbmltcG9ydCBcIi4vY29yZVwiO1xuaW1wb3J0IFwiLi9udW1iZXJzXCI7XG5pbXBvcnQgXCIuL29wZXJhdG9yc1wiO1xuaW1wb3J0IFwiLi9pZlwiO1xuaW1wb3J0IFwiLi9zdGF0ZW1lbnRzXCI7XG5pbXBvcnQgXCIuL3R5cGVzXCI7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaW5kZXguanMiLCIvLyBNZW1vaXplL2ZvcmdldCBzZW1hbnRpY3MuXG5cbi8vIFJldHVybiBhIG1lbW9pemluZyBnZXR0ZXIgZnVuY3Rpb24uXG4vLyBURVNUTUVcbmV4cG9ydCBmdW5jdGlvbiBtZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKSB7XG5cdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRpZiAodGhpc1twcm9wZXJ0eV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dmFyIHZhbHVlID0gZ2V0dGVyLmFwcGx5KHRoaXMpO1xuXHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Ly8gRGVmaW5lIHNvIHRoYXQgd2UgY2FuIGJlIGRlbGV0ZWQgYW5kIHJlLWRlZmluZWQsIGJ1dCBub3Qgc2V0IG9yIGVudW1lcmF0ZWQuXG5cdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBwcm9wZXJ0eSwgeyB2YWx1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdGhpc1twcm9wZXJ0eV07XG5cdH1cbn1cblxuXG4vLyBSZXR1cm4gYSBtZW1vaXplIGZ1bmN0aW9uIGZvciB1c2UgYXMgYSBnZXR0ZXIgaW4gYSBgT2JqZWN0LmRlZmluZVByb3BlcnR5KClgXG4vLyBURVNUTUVcbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVNZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKSB7XG5cdHJldHVybiB7XG5cdFx0Z2V0IDogbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcilcblx0fVxufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL21lbW9pemUuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlXCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJpZlwiLFxuXHRcImlmIHtleHByZXNzaW9ufSAodGhlbnw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGlmXyBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0c3RhdGVtZW50ID0gc3RhdGVtZW50ID8gc3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpIDogdW5kZWZpbmVkO1xuXG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgaWYgKCR7ZXhwcmVzc2lvbn0pYFxuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJiYWNrd2FyZHNfaWZcIixcblx0XCJ7c3RhdGVtZW50fSBpZiB7ZXhwcmVzc2lvbn0gKGVsc2VQaHJhc2U6KGVsc2V8b3RoZXJ3aXNlKSB7c3RhdGVtZW50fSk/XCIsXG5cdGNsYXNzIGJhY2t3YXJkc19pZiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBzdGF0ZW1lbnQsIGVsc2VQaHJhc2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0c3RhdGVtZW50ID0gc3RhdGVtZW50ID8gc3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpIDogdW5kZWZpbmVkO1xuXHRcdFx0bGV0IGVsc2VTdGF0ZW1lbnQgPSBlbHNlUGhyYXNlICYmIGVsc2VQaHJhc2UucmVzdWx0cy5zdGF0ZW1lbnQudG9Tb3VyY2UoKTtcblxuXHRcdFx0aWYgKGVsc2VTdGF0ZW1lbnQpIHJldHVybiBgaWYgKCR7ZXhwcmVzc2lvbn0pIHsgJHtzdGF0ZW1lbnR9IH0gZWxzZSB7ICR7ZWxzZVN0YXRlbWVudH0gfWBcblx0XHRcdHJldHVybiBgaWYgKCR7ZXhwcmVzc2lvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJlbHNlX2lmXCIsXG5cdFwiKGVsc2V8b3RoZXJ3aXNlKSBpZiB7ZXhwcmVzc2lvbn0gKHRoZW58Oikge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGVsc2VfaWYgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblxuXHRcdFx0aWYgKHN0YXRlbWVudCkgcmV0dXJuIGBlbHNlIGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgZWxzZSBpZiAoJHtleHByZXNzaW9ufSlgXG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImVsc2VcIixcblx0XCIoZWxzZXxvdGhlcndpc2UpIHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBlbHNlXyBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblxuXHRcdFx0aWYgKHN0YXRlbWVudCkgcmV0dXJuIGBlbHNlIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0cmV0dXJuIGBlbHNlYFxuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9pZi5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVhbGluZyB3aXRoIG51bWJlcnNcbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vIFRPRE86IGlmIGBpZGVudGlmaWVyYCBpcyBcIndvcmRcIiwgb3V0cHV0IGBnZXRXb3JkKClgIGV0Y1xuY2xhc3MgaW5kZXhfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbntcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCB7IGlkZW50aWZpZXIsIGluZGV4LCBleHByZXNzaW9uIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0aW5kZXggPSBpbmRleC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRpZiAodHlwZW9mIGluZGV4ID09PSBcIm51bWJlclwiKSB7XG5cdFx0XHRpZiAoaW5kZXggPiAwKSB7XG5cdFx0XHRcdHJldHVybiBgJHtleHByZXNzaW9ufVske2luZGV4IC0gMX1dYDtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtpbmRleH0pYDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGAke2V4cHJlc3Npb259WyR7aW5kZXh9IC0gMV1gO1xuXG4vLyBUaGlzIGlzIHNhZmVyLCBidXQgdXNpbmcgdGhlIGFib3ZlIGZvciBkZW1vIHB1cnBvc2VzXG4vL1x0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtpbmRleH0pYDtcblx0fVxufVxuXG4vLyBOdW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nOlxuLy9cdC0gYGl0ZW0gMSBvZiAuLi5gXG4vL1x0LSBgaXRlbSAjMiBvZiAuLi5gXG4vLyBOT1RFOiB0aGVzZSBpbmRpY2VzIGFyZSBPTkUgYmFzZWQsIE5PVCB6ZXJvIGJhc2VkIGFzIGlzIEphdmFzY3JpcHQuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4X2V4cHJlc3Npb25cIiwgXCJ7aWRlbnRpZmllcn0gKCMpP3tpbmRleDpleHByZXNzaW9ufSBvZiB7ZXhwcmVzc2lvbn1cIiwgaW5kZXhfZXhwcmVzc2lvbik7XG5cbmNsYXNzIG9yZGluYWwgZXh0ZW5kcyBSdWxlLktleXdvcmQge31cbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImZpcnN0XCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDEgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJzZWNvbmRcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gMiB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInRoaXJkXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDMgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmb3VydGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNCB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImZpZnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDUgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJzaXh0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA2IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2V2ZW50aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA3IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZWlnaHRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDggfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJuaW50aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA5IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwidGVudGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gMTAgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJwZW51bHRpbWF0ZVwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAtMiB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImZpbmFsXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IC0xIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwibGFzdFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAtMSB9KTtcblxuLy8gVE9ETzogc2l4dHktZmlmdGgsIHR3byBodW5kcmVkIGZvcnR5IG5pbnRoLi4uXG5cbi8vIEFsdGVybmF0aXZlIGZvcm0gZm9yIG51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmcuXG4vLyBOT1RFOiBkb24ndCBhZGQgYXMgYW4gZXhwcmVzc2lvbiBzaW5jZSB3ZSdyZSBhdXRvLW1lcmdlZCB3aXRoIGBpbmRleF9leHByZXNzaW9uYCBhYm92ZS5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFwiaW5kZXhfZXhwcmVzc2lvblwiLCBcInRoZSB7aW5kZXg6b3JkaW5hbH0ge2lkZW50aWZpZXJ9IG9mIHtleHByZXNzaW9ufVwiLCBpbmRleF9leHByZXNzaW9uKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL251bWJlcnMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGluZml4IGFuZCBwcmVmaXggb3BlcmF0b3JzLlxuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIyMgSW5maXggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+IHtyaHN9YCwgZWc6IGBhIGlzIDFgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHR3byBhcmd1bWVudHMgKGBsaHNgIGFuZCBgcmhzYCkgaW50byBvdXRwdXQuXG5cbi8vIE5PVEU6IGBwcmVjZWRlbmNlYCBudW1iZXJzIGNvbWUgZnJvbSBKYXZhc2NyaXB0IGVxdWl2YWxlbnRzXG4vL1x0XHQgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvT3BlcmF0b3JzL09wZXJhdG9yX1ByZWNlZGVuY2VcblxuY2xhc3MgaW5maXhfb3BlcmF0b3IgZXh0ZW5kcyBSdWxlLkFsdGVybmF0aXZlcyB7XG5cbi8vIE5PVEU6IEZvciB0aGUgb3BlcmF0b3JzIHRoZW1zZWx2ZXMsIHdlIHJlYWxseSB3YW50IHRvIGp1c3QgdXNlIGxvbmdlc3QgbWF0Y2guXG4vLyBcdFx0IFdlIHdhbnQgdG8gcHVzaCB0aGUgcHJlY2VkZW5jZSB1cCB0byB0aGUgZXhwcmVzc2lvbiBhbmQgZXZhbHVhdGUgZGlmZmVyZW50IGV4cHJlc3Npb25zIGJhc2VkIG9uIHRoYXQuXG4vLyBcdC8vIEZpbmQgYmVzdCBtYXRjaCBhY2NvcmRpbmcgdG8gb3BlcmF0b3IgcHJlY2VkZW5jZSBhcyBkZWZpbmVkIGJlbG93LlxuLy8gXHRnZXRCZXN0TWF0Y2gobWF0Y2hlcykge1xuLy8gXHRcdGNvbnNvbGUud2FybihcIkdCTVwiLCBtYXRjaGVzLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5wcmVjZWRlbmNlKSwgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gubWF0Y2hlZFRleHQpKTtcbi8vIFx0XHRyZXR1cm4gbWF0Y2hlcy5yZWR1Y2UoZnVuY3Rpb24gKGJlc3QsIG5leHQpIHtcbi8vIFx0XHRcdC8vIHRha2UgaGlnaGVzdCBwcmVjZWRlbmNlIG1hdGNoIGZpcnN0XG4vLyBcdFx0XHRpZiAobmV4dC5wcmVjZWRlbmNlID4gYmVzdC5wcmVjZWRlbmNlKSByZXR1cm4gbmV4dDtcbi8vIFx0XHRcdC8vIHRha2UgbG9uZ2VzdCBtYXRjaCBpZiBzYW1lIHByZWNlZGVuY2Vcbi8vIFx0XHRcdGlmIChuZXh0LnByZWNlZGVuY2UgPT09IGJlc3QucHJlY2VkZW5jZSkge1xuLy8gXHRcdFx0XHRpZiAobmV4dC5lbmRJbmRleCA+IGJlc3QuZW5kSW5kZXgpIHJldHVybiBuZXh0O1xuLy8gXHRcdFx0fVxuLy8gXHRcdFx0cmV0dXJuIGJlc3Q7XG4vLyBcdFx0fSwgbWF0Y2hlc1swXSk7XG4vLyBcdH1cbn1cblxucGFyc2VyLmFkZFJ1bGUoXCJpbmZpeF9vcGVyYXRvclwiLCBuZXcgaW5maXhfb3BlcmF0b3IoKSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiYW5kXCIsIFwiYW5kXCIsIHsgcHJlY2VkZW5jZTogNiwgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAmJiAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJvclwiLCBcIm9yXCIsIHsgcHJlY2VkZW5jZTogNSwgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSB8fCAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzXCIsIFwiaXNcIiwgeyBwcmVjZWRlbmNlOiAxMCwgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RcIiwgXCJpcyBub3RcIiwgeyBwcmVjZWRlbmNlOiAxMCwgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPSAke2J9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX2V4YWN0bHlcIiwgXCJpcyBleGFjdGx5XCIsIHsgcHJlY2VkZW5jZTogMTAsIHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT09ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX25vdF9leGFjdGx5XCIsIFwiaXMgbm90IGV4YWN0bHlcIiwgeyBwcmVjZWRlbmNlOiAxMCwgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPT0gJHtifSlgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNPZlR5cGUodGhpbmcsIHR5cGUpYFxuLy9UT0RPOiBgaXMgc2FtZSB0eXBlIGFzYCA/XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX3R5cGVfb2ZcIiwgW1wiaXMgYVwiLCBcImlzIGFuXCJdLCB7IHByZWNlZGVuY2U6IDExLCB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90X3R5cGVfb2ZcIiwgW1wiaXMgbm90IGFcIiwgXCJpcyBub3QgYW5cIl0sIHsgcHJlY2VkZW5jZTogMTEsIHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGAhc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuY29udGFpbnMoY29sbGVjdGlvbiwgdGhpbmcpYFxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19pblwiLCBbXCJpcyBpblwiLCBcImlzIG9uZSBvZlwiXSwgeyBwcmVjZWRlbmNlOiAxMSwgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX25vdF9pblwiLCBbXCJpcyBub3QgaW5cIiwgXCJpcyBub3Qgb25lIG9mXCJdLCB7IHByZWNlZGVuY2U6IDExLCB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9fSk7XG4vL1RFU1RNRVxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpbmNsdWRlc1wiLCBbXCJpbmNsdWRlc1wiLCBcImNvbnRhaW5zXCJdLCB7IHByZWNlZGVuY2U6IDExLCB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZG9lc250X2luY2x1ZGVcIiwgW1wiZG9lcyBub3QgaW5jbHVkZVwiLCBcImRvZXNudCBpbmNsdWRlXCIsIFwiZG9lcyBub3QgY29udGFpblwiLCBcImRvZXNudCBjb250YWluXCJdLCB7IHByZWNlZGVuY2U6IDExLCB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndFwiLCBbXCI+XCIsIFwiaXMgZ3JlYXRlciB0aGFuXCJdLCB7IHByZWNlZGVuY2U6IDExLCB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJndGVcIiwgW1wiPj1cIiwgXCJpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG9cIl0sIHsgcHJlY2VkZW5jZTogMTEsIHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJsdFwiLCBbXCI8XCIsIFwiaXMgbGVzcyB0aGFuXCJdLCB7IHByZWNlZGVuY2U6IDExLCB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJsdGVcIiwgW1wiPD1cIiwgXCJpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG9cIl0sIHsgcHJlY2VkZW5jZTogMTEsIHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfX0pO1xuXG4vL1RPRE86ICBjYW4ndCBhZGQgYCtgIGFzIGEgcnVsZSwgZml4IHRoaXMgdGhlbiBhZGQgdGhlc2Vcbi8vVE9ETzogIG9wZXJhdG9yIHByZWNlZGVuY2U/Pz9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcInBsdXNcIiwgW1wiXFxcXCtcIiwgXCJwbHVzXCJdLCB7IHByZWNlZGVuY2U6IDEzLCB0b0pTKGEsYikgeyByZXR1cm5gJHthfSArICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibWludXNcIiwgW1wiLVwiLCBcIm1pbnVzXCJdLCB7IHByZWNlZGVuY2U6IDEzLCB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAtICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwidGltZXNcIiwgW1wiXFxcXCpcIiwgXCJ0aW1lc1wiXSwgeyBwcmVjZWRlbmNlOiAxNCwgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKiAke2J9YCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImRpdmlkZWRfYnlcIiwgW1wiL1wiLCBcImRpdmlkZWQgYnlcIl0sIHsgcHJlY2VkZW5jZTogMTQsIHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC8gJHtifWAgfX0pO1xuXG4vL1RPRE86ICBgKz1gIGV0Yz8gIG90aGVyIG1hdGggZnVuY3Rpb25zP1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6aW5maXhfb3BlcmF0b3J9IHtyaHM6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dGVzdFJ1bGUgPSBcImluZml4X29wZXJhdG9yXCI7XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaHMsIHJocywgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGxocy50b1NvdXJjZShjb250ZXh0KSwgcmhzLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIyMgUG9zdGlmeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj5gLCBlLmcuIGBhIGlzIGRlZmluZWRgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBKUyBvdXRwdXQuXG5cbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19kZWZpbmVkXCIsIFwiaXMgZGVmaW5lZFwiLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ICE9PSAndW5kZWZpbmVkJylgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19ub3RfZGVmaW5lZFwiLCBbXCJpcyBub3QgZGVmaW5lZFwiLCBcImlzIHVuZGVmaW5lZFwiXSwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzRW1wdHkodGhpbmcpYFxucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX2VtcHR5XCIsIFwiaXMgZW1wdHlcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19ub3RfZW1wdHlcIiwgXCJpcyBub3QgZW1wdHlcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9fSk7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeF9vcGVyYXRvcn1cIixcblx0Y2xhc3MgcG9zdGZpeF9vcGVyYXRvcl9leHByZXNpb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRlc3RSdWxlID0gXCJwb3N0Zml4X29wZXJhdG9yXCI7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG4vL3BhcnNlci5hZGRTZXF1ZW5jZShcIm9wZXJhdG9yX2V4cHJlc3Npb25cIiwgXCIoZXhwcmVzc2lvbjp7cG9zdGZpeF9vcGVyYXRvcl9leHByZXNzaW9ufXx7aW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvbn0pXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy9cbi8vXHQjIyBSZXR1cm5zXG4vL1xuXG4vLyBSZXR1cm4gYSB2YWx1ZVxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJyZXR1cm5fc3RhdGVtZW50XCIsIFwicmV0dXJuIHtleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByZXR1cm5fc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBgcmV0dXJuICR7ZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KX1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vXG4vL1x0IyMgQXNzaWdubWVudFxuLy9cbmNsYXNzIGFzc2lnbm1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCB7IHRoaW5nLCB2YWx1ZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdGlmICh0aGluZyBpbnN0YW5jZW9mIFJ1bGUuSWRlbnRpZmllcikge1xuXHRcdFx0Ly8gVE9ETzogZGVjbGFyZSBpZGVudGlmaWVyIGlmIG5vdCBpbiBzY29wZSwgZXRjXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGAke3RoaW5nLnRvU291cmNlKGNvbnRleHQpfSA9ICR7dmFsdWUudG9Tb3VyY2UoY29udGV4dCl9YDtcblx0fVxufVxuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJ7dGhpbmc6ZXhwcmVzc2lvbn0gPSB7dmFsdWU6ZXhwcmVzc2lvbn1cIiwgYXNzaWdubWVudCk7XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJzZXQge3RoaW5nOmV4cHJlc3Npb259IHRvIHt2YWx1ZTpleHByZXNzaW9ufVwiLCBhc3NpZ25tZW50KTtcblxuXG4vL1xuLy9cdCMjIFVzZXIgaW50ZXJhY3Rpb25cbi8vXG5cbi8vIEFsZXJ0IGEgbWVzc2FnZS5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYWxlcnRcIiwgXCJhbGVydCB7bWVzc2FnZTpleHByZXNzaW9ufSAoYnV0dG9uQ2xhdXNlOndpdGgge3RleHR9KT9cIixcblx0Y2xhc3MgYWxlcnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgYnV0dG9uQ2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBidXR0b25OYW1lID0gYnV0dG9uQ2xhdXNlID8gYnV0dG9uQ2xhdXNlLnJlc3VsdHMudGV4dC50b1NvdXJjZShjb250ZXh0KSA6ICdcIk9LXCInO1xuXHRcdFx0cmV0dXJuIGBhd2FpdCBzcGVsbC5hbGVydCgke21lc3NhZ2V9LCAke2J1dHRvbk5hbWV9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBXYXJuaW5nIG1lc3NhZ2UgLS0gbGlrZSBhbGVydCBidXQgZmFuY2llci5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwid2FyblwiLCBcIndhcm4ge2V4cHJlc3Npb246ZXhwcmVzc2lvbn0gKGJ1dHRvbkNsYXVzZTp3aXRoIHt0ZXh0fSk/XCIsXG5cdGNsYXNzIHdhcm4gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgYnV0dG9uQ2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBidXR0b25OYW1lID0gYnV0dG9uQ2xhdXNlID8gYnV0dG9uQ2xhdXNlLnJlc3VsdHMudGV4dC50b1NvdXJjZShjb250ZXh0KSA6ICdcIk9LXCInO1xuXHRcdFx0cmV0dXJuIGBhd2FpdCBzcGVsbC53YXJuKCR7bWVzc2FnZX0sICR7YnV0dG9uTmFtZX0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gQ29uZmlybSBtZXNzYWdlIC0tIHByZXNlbnQgYSBxdWVzdGlvbiB3aXRoIHR3byBhbnN3ZXJzLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJjb25maXJtXCIsIFwiY29uZmlybSB7bWVzc2FnZTpleHByZXNzaW9ufSAoYnV0dG9uQ2xhdXNlOndpdGgge29rQnV0dG9uOnRleHR9IChjYW5jZWxDbGF1c2U6IChhbmR8b3IpIHtjYW5jZWxCdXR0b246dGV4dH0pPyApP1wiLFxuXHRjbGFzcyBjb25maXJtIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG1lc3NhZ2UsIGJ1dHRvbkNsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bWVzc2FnZSA9IG1lc3NhZ2UudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgb2tCdXR0b24gPSAnXCJPS1wiJywgY2FuY2VsQnV0dG9uID0gJ1wiQ2FuY2VsXCInO1xuXG5cdFx0XHRpZiAoYnV0dG9uQ2xhdXNlKSB7XG5cdFx0XHRcdG9rQnV0dG9uID0gYnV0dG9uQ2xhdXNlLnJlc3VsdHMub2tCdXR0b24ucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0bGV0IGNhbmNlbENsYXVzZSA9IGJ1dHRvbkNsYXVzZS5yZXN1bHRzLmNhbmNlbENsYXVzZTtcblx0XHRcdFx0aWYgKGNhbmNlbENsYXVzZSkgY2FuY2VsQnV0dG9uID0gY2FuY2VsQ2xhdXNlLnJlc3VsdHMuY2FuY2VsQnV0dG9uLnJlc3VsdHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLmNvbmZpcm0oJHttZXNzYWdlfSwgJHtva0J1dHRvbn0sICR7Y2FuY2VsQnV0dG9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vLyBERUFEIFNJTVBMRSBQTFVSQUxJWkVSLi4uIFJFQUxMWSBOT1QgVkVSWSBHT09EXG5mdW5jdGlvbiBwbHVyYWxpemUod29yZCkge1xuXHRyZXR1cm4gd29yZCArIFwic1wiO1xufVxuXG5cbi8vVEVTVE1FXG4vL01PVkUgVE8gYG9iamVjdHNgP1xuLy8gUHJvcGVydGllcyBjbGF1c2U6IGNyZWF0ZXMgYW4gb2JqZWN0IHdpdGggb25lIG9yIG1vcmUgcHJvcGVydHkgdmFsdWVzLlxuLy9cdGBmb28gPSAxLCBiYXIgPSAyYFxuLy9UT0RPOiB3b3VsZCBsaWtlIHRvIHVzZSBgYW5kYCBidXQgdGhhdCB3aWxsIGJhcmYgb24gZXhwcmVzc2lvbnMuLi5cbi8vVE9ETzogaG93IHRvIGRvIHByb3BlcnRpZXMgb24gbXVsdGlwbGUgbGluZXM/XG5wYXJzZXIuYWRkTGlzdChcblx0XCJvYmplY3RfbGl0ZXJhbFwiLFxuXHRcIlsoe2lkZW50aWZpZXJ9ID0ge2V4cHJlc3Npb259KSAsXVwiLFxuXHRjbGFzcyBvYmplY3RfbGl0ZXJhbCBleHRlbmRzIFJ1bGUuTGlzdCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHByb3BzID0gdGhpcy5yZXN1bHRzLm1hdGNoZWQubWFwKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRcdFx0bGV0IHsgaWRlbnRpZmllciwgZXhwcmVzc2lvbiB9ID0gcHJvcC5yZXN1bHRzO1xuXHRcdFx0XHRcdGxldCBrZXkgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0XHRcdGxldCB2YWx1ZSA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRcdFx0cmV0dXJuIGBcIiR7a2V5fVwiOiAke3ZhbHVlfWBcblx0XHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYHsgJHtwcm9wcy5qb2luKFwiLCBcIil9IH1gO1xuXHRcdH1cblx0fVxuKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMub2JqZWN0X2xpdGVyYWwpO1xuXG5cbi8vVEVTVE1FXG4vL01PVkUgVE8gYGZ1bmN0aW9uc2A/XG4vLyBBcmd1bWVudHMgY2xhdXNlIGZvciBtZXRob2RzXG4vL1x0YHdpdGggZm9vYCBvciBgd2l0aCBmb28gYW5kIGJhciBhbmQgYmF6YFxuLy9UT0RPOiB7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cdD0+IHJlcXVpcmVzIGAsYCBpbnN0ZWFkIG9mIGBhbmRgXG4vL1RPRE86IGB3aXRoIGZvbyBhcyBUeXBlYFxuLy9UT0RPOlx0YHdpdGggZm9vLi4uYCBmb3Igc3BsYXQ/XG5wYXJzZXIuYWRkU2VxdWVuY2UoXG5cdFwiYXJnc0NsYXVzZVwiLFxuXHRcIndpdGggW2FyZ3M6e2lkZW50aWZpZXJ9IGFuZF1cIixcblx0Y2xhc3MgYXJnc0NsYXVzZSBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRcdC8vIFJldHVybiBqdXN0IHRoZSBhcmd1bWVudHMgYXMgdGhlIHJlc3VsdHNcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiBzdXBlci5yZXN1bHRzLmFyZ3M7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIGp1c3QgdGhlIGFyZ3VtZW50IG5hbWVzIGFzIGFuIGFycmF5XG5cdFx0Z2V0IGFyZ05hbWVzKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMucmVzdWx0cy5tYXRjaGVkLm1hcChhcmcgPT4gYXJnLm1hdGNoZWQpO1xuXHRcdH1cblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiB0aGlzLmFyZ05hbWVzLmpvaW4oXCIsIFwiKTtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBURVNUTUVcbi8vIERlZmluZSBjbGFzcy5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVmaW5lX3R5cGVcIixcblx0XCJkZWZpbmUgdHlwZSB7dHlwZX0gKGV4dGVuZHNDbGF1c2U6YXMgKGF8YW4pIHtzdXBlclR5cGU6dHlwZX0pP1wiLFxuXHRjbGFzcyBkZWZpbmVfdHlwZSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBleHRlbmRzQ2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHR0eXBlID0gdHlwZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBzdXBlclR5cGUgPSBleHRlbmRzQ2xhdXNlICYmIGV4dGVuZHNDbGF1c2UucmVzdWx0cy5zdXBlclR5cGUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAoc3VwZXJUeXBlKSB7XG5cdFx0XHRcdHJldHVybiBgY2xhc3MgJHt0eXBlfSBleHRlbmRzICR7c3VwZXJUeXBlfWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYGNsYXNzICR7dHlwZX1gO1xuXG5cdFx0fVxuXHR9XG4pO1xuXG4vL1RPRE86IGNvbnN0cnVjdG9yXG5cbi8vVEVTVE1FXG4vLyBgbmV3YFxuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYWxsIHR5cGVzIHRha2UgYW4gb2JqZWN0IG9mIHByb3BlcnRpZXM/Pz8/XG5wYXJzZXIuYWRkU2VxdWVuY2UoXG5cdFwibmV3X3RoaW5nXCIsXG5cdFwiKGNyZWF0ZXxuZXcpIHt0eXBlfSAocHJvcHNDbGF1c2U6d2l0aCB7cHJvcHM6b2JqZWN0X2xpdGVyYWx9KT9cIixcblx0Y2xhc3MgbmV3X3RoaW5nIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdHlwZSwgcHJvcHNDbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHR5cGUgPSB0eXBlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHByb3BzID0gcHJvcHNDbGF1c2UgJiYgcHJvcHNDbGF1c2UucmVzdWx0cy5wcm9wcy50b1NvdXJjZShjb250ZXh0KSB8fCBcIlwiO1xuXHRcdFx0cmV0dXJuIGBuZXcgJHt0eXBlfSgke3Byb3BzfSlgO1xuXHRcdH1cblx0fVxuKTtcbi8vIFRoaXMgd29ya3MgYXMgYW4gZXhwcmVzc2lvbiBPUiBhIHN0YXRlbWVudC5cbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMubmV3X3RoaW5nKTtcbnBhcnNlci5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHBhcnNlci5ydWxlcy5uZXdfdGhpbmcpO1xuXG5cbi8vIFRFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX21ldGhvZFwiLFxuXHRcIih0b3xvbikge2lkZW50aWZpZXJ9IHthcmdzQ2xhdXNlfT8gKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGRlY2xhcmVfbWV0aG9kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3NDbGF1c2UsIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBhcmdzID0gKGFyZ3NDbGF1c2UgJiYgYXJnc0NsYXVzZS50b1NvdXJjZShjb250ZXh0KSkgfHwgXCJcIjtcblx0XHRcdHN0YXRlbWVudCA9IChzdGF0ZW1lbnQgPyBgIHsgJHtzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCl9IH1gIDogXCJcIik7XG5cblx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KSR7c3RhdGVtZW50fWBcblx0XHR9XG5cdH1cbik7XG5cbi8vIFRFU1RNRVxuLy8gR2V0dGVyIGVpdGhlciB3aXRoIG9yIHdpdGhvdXQgYXJndW1lbnRzLlxuLy8gSWYgeW91IHNwZWNpZnkgYXJndW1lbnRzLCB5aWVsZHMgYSBub3JtYWwgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhIHZhbHVlLlxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJnZXR0ZXJcIixcblx0XCJnZXQge2lkZW50aWZpZXJ9IHthcmdzQ2xhdXNlfT8gKFxcXFw6KT8ge1g6ZXhwcmVzc2lvbn0/XCIsXG5cdGNsYXNzIGdldHRlciBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBhcmdzQ2xhdXNlLCBleHByZXNzaW9uIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBhcmdzID0gYXJnc0NsYXVzZSAmJiBhcmdzQ2xhdXNlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IChleHByZXNzaW9uID8gYCB7IHJldHVybiAoJHtleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpfSkgfWAgOiBcIlwiKTtcblxuXHRcdFx0aWYgKGFyZ3MgJiYgZXhwcmVzc2lvbikge1xuXHRcdFx0XHRyZXR1cm4gYCR7aWRlbnRpZmllcn0oJHthcmdzfSkke2V4cHJlc3Npb259YDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGFyZ3MpIHtcblx0XHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pYDtcblxuXHRcdFx0fSBlbHNlIGlmIChleHByZXNzaW9uKSB7XG5cdFx0XHRcdHJldHVybiBgZ2V0ICR7aWRlbnRpZmllcn0oKSR7ZXhwcmVzc2lvbn1gO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fVxuKTtcblxuLy8gVEVTVE1FXG4vLyBTZXR0ZXIuXG4vLyBDb21wbGFpbnMgaWYgeW91IHNwZWNpZnkgbW9yZSB0aGFuIG9uZSBhcmd1bWVudC5cbi8vIElmIHlvdSBkb24ndCBwYXNzIGFuIGV4cGxpY2l0IGFyZ3VtZW50LCB3ZSdsbCBhc3N1bWUgaXQncyB0aGUgc2FtZSBhcyB0aGUgaWRlbnRpZmllci5cbi8vIGVnO1x0YHNldCBjb2xvcjogc2V0IHRoZSBjb2xvciBvZiBteSB0ZXh0IHRvIGNvbG9yYFxuLy9cbi8vIFRPRE86IGludGVybmFsIGdldHRlci9zZXR0ZXIgc2VtYW50aWNzIGFsYSBvYmplY3RpdmUgQ1xuLy9cdFx0XHRgc2V0IGNvbG9yOiBpZiBjb2xvciBpcyBpbiBbXCJyZWRcIiwgXCJibHVlXCJdIHRoZW4gc2V0IG15IGNvbG9yIHRvIGNvbG9yYFxuLy9cdFx0ID0+IGBteSBjb2xvcmAgd2l0aGluIHNldHRlciBzaG91bGQgYXV0b21hdGljYWxseSB0cmFuc2xhdGUgdG8gYHRoaXMuX2NvbG9yYCA/Pz9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwic2V0dGVyXCIsXG5cdFwic2V0IHtpZGVudGlmaWVyfSB7YXJnc0NsYXVzZX0/IChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBnZXR0ZXIgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJnc0NsYXVzZSwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblxuXHRcdFx0Ly8gQXNzdW1lIHdlIHdhbnQgdGhlIHNhbWUgbmFtZSBhcyB0aGUgaWRlbnRpZmllciBpZiBubyBhcmd1bWVuc1xuXHRcdFx0bGV0IGFyZ3MgPSAoYXJnc0NsYXVzZSAmJiBhcmdzQ2xhdXNlLmFyZ05hbWVzKSB8fCBbaWRlbnRpZmllcl07XG5cdFx0XHQvLyBDb21wbGFpbiBpZiBtb3JlIHRoYW4gb25lIGFyZ3VtZW50XG5cdFx0XHRpZiAoYXJncy5sZW5ndGggPiAxKVxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJwYXJzZSgnc2V0dGVyJyk6IG9ubHkgb25lIGFyZ3VtZW50IGFsbG93ZWQgaW4gc2V0dGVyOiAgXCIsIHRoaXMubWF0Y2hlZFRleHQpO1xuXG5cdFx0XHRzdGF0ZW1lbnQgPSAoc3RhdGVtZW50ID8gYCB7ICR7c3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpfSB9YCA6IFwiXCIpO1xuXG5cdFx0XHRyZXR1cm4gYHNldCAke2lkZW50aWZpZXJ9KCR7YXJnc1swXX0pJHtzdGF0ZW1lbnR9YDtcblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vXG4vL1x0ZGVjbGFyZSBwcm9wZXJ0aWVzXG4vL1xuXG5wYXJzZXIuYWRkU2VxdWVuY2UoXCJzY29wZV9tb2RpZmllclwiLCBcIihzY29wZTpnbG9iYWx8Y29uc3RhbnR8c2hhcmVkfHByb3BlcnR5KVwiKTtcblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eVwiLFxuXHRcIihzY29wZTpjb25zdGFudHxzaGFyZWQgcHJvcGVydHl8cHJvcGVydHkpIHtpZGVudGlmaWVyfSAodmFsdWVDbGF1c2U6PSB7ZXhwcmVzc2lvbn0pP1wiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHNjb3BlLCBpZGVudGlmaWVyLCB2YWx1ZUNsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0c2NvcGUgPSBzY29wZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHZhbHVlID0gdmFsdWVDbGF1c2UgJiYgXCIgPSBcIiArIHZhbHVlQ2xhdXNlLnJlc3VsdHMuZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KSB8fCBcIlwiO1xuXG5cdFx0XHRsZXQgZGVjbGFyYXRpb24gPSBgJHtpZGVudGlmaWVyfSR7dmFsdWV9YDtcblx0XHRcdHN3aXRjaCAoc2NvcGUpIHtcblx0XHRcdFx0Y2FzZSBcImNvbnN0YW50XCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBjb25zdCAke2RlY2xhcmF0aW9ufWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZCBwcm9wZXJ0eVwiOlxuXHRcdFx0XHRcdHJldHVybiBgQHByb3RvXFxuJHtkZWNsYXJhdGlvbn1gO1xuXG5cdFx0XHRcdGNhc2UgXCJwcm9wZXJ0eVwiOlxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBkZWNsYXJhdGlvbjtcblx0XHRcdH1cblx0XHR9XG5cdH1cbik7XG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlcIixcbi8vIFRPRE86IHNjb3BlX21vZGlmaWVyPz8/XG5cdFwicHJvcGVydHkge2lkZW50aWZpZXJ9IGFzIChhfGFuKT8ge3R5cGV9XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHkgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgdHlwZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHR0eXBlID0gdHlwZS50b1NvdXJjZShjb250ZXh0KTtcblxuXHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSB7IHJldHVybiB0aGlzLl9fJHtpZGVudGlmaWVyfSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHNwZWxsLmlzQSh2YWx1ZSwgJHt0eXBlfSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gVE9ETzogd2FybiBvbiBpbnZhbGlkIHNldD8gIHNoYXJlZD8gIHVuZGVmaW5lZD8gc29tZXRoaW5nIG90aGVyIHRoYW4gdGhlIGZpcnN0IHZhbHVlIGFzIGRlZmF1bHQ/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5X2FzX29uZV9vZlwiLFxuXHRcInByb3BlcnR5IHtpZGVudGlmaWVyfSBhcyBvbmUgb2Yge2xpc3Q6bGl0ZXJhbF9saXN0fVwiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5X2FzX29uZV9vZiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzY29wZV9tb2RpZmllciwgaWRlbnRpZmllciwgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuLy9UT0RPOiBub3QgaGFuZGxpbmcgc2NvcGVfbW9kaWZpZXJcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHBsdXJhbCA9IHBsdXJhbGl6ZShpZGVudGlmaWVyKTtcblx0XHRcdGxldCB2YWx1ZXMgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuLy9UT0RPOiBsaXN0LmdldEl0ZW0oMClcblx0XHRcdGxldCBmaXJzdCA9IGxpc3QucmVzdWx0cy5tYXRjaGVkWzBdO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKGNvbnRleHQpIDogXCJ1bmRlZmluZWRcIjtcblxuXHRcdFx0cmV0dXJuIGBAcHJvdG9cXG5gXG5cdFx0XHRcdCArIGAke3BsdXJhbH0gPSAke3ZhbHVlc31cXG5gXG5cdFx0XHRcdCArIGBnZXQgJHtpZGVudGlmaWVyfSB7IHJldHVybiAoXCJfXyR7aWRlbnRpZmllcn1cIiBpbiB0aGlzID8gdGhpcy5fXyR7aWRlbnRpZmllcn0gOiAke2ZpcnN0VmFsdWV9KSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblxuLy8gTU9SRSBFRkZJQ0lFTlQgQlVUIFVHTElFUlxuLy8gXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9O1xcbmBcbi8vIFx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9IHsgcmV0dXJuIChcIl9fJHtpZGVudGlmaWVyfVwiIGluIHRoaXMgPyB0aGlzLl9fJHtpZGVudGlmaWVyfSA6ICR7Zmlyc3RWYWx1ZX0pIH1cXG5gXG4vLyBcdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy5jb25zdHJ1Y3Rvci4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdFByb3BlcnR5IGFjY2Vzc1xuLy9cblxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIocHJvcGVydGllczp0aGUge2lkZW50aWZpZXJ9IG9mKSsgdGhlPyB7ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgcHJvcGVydGllcyB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRwcm9wZXJ0aWVzID0gcHJvcGVydGllcy5yZXN1bHRzXG5cdFx0XHRcdFx0XHRcdC5yZXZlcnNlKClcblx0XHRcdFx0XHRcdFx0Lm1hcCggcHJvcGVydHkgPT4gcHJvcGVydHkuaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSApXG5cdFx0XHRcdFx0XHRcdC5qb2luKFwiLlwiKTtcblx0XHRcdHJldHVybiBgJHtleHByZXNzaW9ufS4ke3Byb3BlcnRpZXN9YDtcbi8vIE5PVEU6IHRoZSBmb2xsb3dpbmcgaXMgc2FmZXIsIGJ1dCB1Z2x5IGZvciBkZW1vIHB1cnBvc2VzXG4vL1x0XHRcdHJldHVybiBgc3BlbGwuZ2V0KCR7ZXhwcmVzc2lvbn0sIFsnJHtwcm9wZXJ0aWVzfSddKWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicHJvcGVydHlfZXhwcmVzc2lvblwiLFxuXHRcIihteXx0aGlzKSB7aWRlbnRpZmllcn1cIixcblx0Y2xhc3MgcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHRoaXMuJHtpZGVudGlmaWVyfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3R5cGVzLmpzIl0sInNvdXJjZVJvb3QiOiIifQ==