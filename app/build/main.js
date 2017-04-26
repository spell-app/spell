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

		var string = syntaxStream[startIndex],
		    rule;
		// If letters only, match as a Keyword (so we require a word boundary after the string).
		if (string.match(/[A-Za-z]+/)) {
			rule = new _Rule2.default.Keyword({ string: string });
		}
		// Otherwise match as a String, which doesn't require non-word chars after the text.
		else {
				rule = new _Rule2.default.Symbol({ string: string });
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

		if (typeof syntaxStream === "string") syntaxStream = _Rule2.default.tokeniseRuleSyntax(syntaxStream);

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
	addSyntax: { value: function value(name, ruleSyntax) {
			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Sequence;

			var properties = void 0;
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

			var rule = this.addSyntax(name, ruleSyntax, constructor);
			if (rule) return this.addRule("statement", rule);
		} },

	addExpression: { value: function value(name, ruleSyntax) {
			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Expression;

			var rule = this.addSyntax(name, ruleSyntax, constructor);
			if (rule) return this.addRule("expression", rule);
		} },

	addList: { value: function value(name, ruleSyntax) {
			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.List;

			var _Rule$parseRuleSyntax3 = _Rule2.default.parseRuleSyntax_list(ruleSyntax, [], 0, constructor),
			    _Rule$parseRuleSyntax4 = _slicedToArray(_Rule$parseRuleSyntax3, 2),
			    rule = _Rule$parseRuleSyntax4[0],
			    endIndex = _Rule$parseRuleSyntax4[1];

			if (rule) return this.addRule(name, rule);
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

			var rule = this.addSyntax(name, ruleSyntax, properties);
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

			var rule = this.addSyntax(name, ruleSyntax, properties);
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
			    number = _results.number,
			    expression = _results.expression;

			expression = expression.toSource(context);
			number = number.toSource(context);
			if (typeof number === "number") {
				if (number > 0) {
					return expression + "[" + (number - 1) + "]";
				} else {
					return "spell.getItem(" + expression + ", " + number + ")";
				}
			}
			return expression + "[" + number + " - 1]";

			// This is safer, but using the above for demo purposes
			//		return `spell.getItem(${expression}, ${number})`;
		}
	}]);

	return index_expression;
}(_Rule2.default.Expression);

// Numeric index in a list-like thing:
//	- `item 1 of ...`
//	- `item #2 of ...`
// NOTE: these indices are ONE based, NOT zero based as is Javascript.


_parser2.default.addExpression("index_expression", "{identifier} (#)?{number:expression} of {expression}", index_expression);

_parser2.default.addSyntax("ordinal", "first", { toSource: function toSource() {
		return 1;
	} });
_parser2.default.addSyntax("ordinal", "second", { toSource: function toSource() {
		return 2;
	} });
_parser2.default.addSyntax("ordinal", "third", { toSource: function toSource() {
		return 3;
	} });
_parser2.default.addSyntax("ordinal", "fourth", { toSource: function toSource() {
		return 4;
	} });
_parser2.default.addSyntax("ordinal", "fifth", { toSource: function toSource() {
		return 5;
	} });
_parser2.default.addSyntax("ordinal", "sixth", { toSource: function toSource() {
		return 6;
	} });
_parser2.default.addSyntax("ordinal", "seventh", { toSource: function toSource() {
		return 7;
	} });
_parser2.default.addSyntax("ordinal", "eighth", { toSource: function toSource() {
		return 8;
	} });
_parser2.default.addSyntax("ordinal", "ninth", { toSource: function toSource() {
		return 9;
	} });
_parser2.default.addSyntax("ordinal", "tenth", { toSource: function toSource() {
		return 10;
	} });
_parser2.default.addSyntax("ordinal", "penultimate", { toSource: function toSource() {
		return -2;
	} });
_parser2.default.addSyntax("ordinal", "final", { toSource: function toSource() {
		return -1;
	} });
_parser2.default.addSyntax("ordinal", "last", { toSource: function toSource() {
		return -1;
	} });

// TODO: sixty-fifth, two hundred forty ninth...

// Alternative form for numeric index in a list-like thing.
// NOTE: don't add as an expression since we're auto-merged with `index_expression` above.
_parser2.default.addExpression("index_expression", "the {number:ordinal} {identifier} of {expression}", index_expression);

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
//parser.addSyntax("operator_expression", "(expression:{postfix_operator_expression}|{infix_operator_expression})");

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
_parser2.default.addSyntax("argsClause", "with [args:{identifier} and]", function (_Rule$Sequence) {
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
_parser2.default.addSyntax("new_thing", "(create|new) {type} (propsClause:with {props:object_literal})?", function (_Rule$Sequence2) {
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

_parser2.default.addSyntax("scope_modifier", "(scope:global|constant|shared|property)");

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgOGZjMDQ0Y2M1NTU4MGEzY2IwNDkiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGVTeW50YXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2lmLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy90eXBlcy5qcyJdLCJuYW1lcyI6WyJwYXJzZXIiLCJ3aW5kb3ciLCJPYmplY3QiLCJhc3NpZ24iLCJwYXJzZVJ1bGVTeW50YXgiLCJzeW50YXgiLCJTZXF1ZW5jZUNvbnN0cnVjdG9yIiwiU2VxdWVuY2UiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJydWxlcyIsInBhcnNlUnVsZVN5bnRheF90b2tlbnMiLCJydWxlIiwibGVuZ3RoIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJtYXRjaCIsIlN5bnRheEVycm9yIiwic3RhcnRJbmRleCIsImxhc3RJbmRleCIsInBhcnNlUnVsZVN5bnRheF90b2tlbiIsImVuZEluZGV4IiwibGFzdCIsIlN5bWJvbCIsInBvcCIsIm1lcmdlU3ltYm9scyIsIktleXdvcmQiLCJtZXJnZUtleXdvcmRzIiwicHVzaCIsInN5bnRheFRva2VuIiwicGFyc2VSdWxlU3ludGF4X3N0cmluZyIsInBhcnNlUnVsZVN5bnRheF9zdWJydWxlIiwicGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzIiwicGFyc2VSdWxlU3ludGF4X2xpc3QiLCJwYXJzZVJ1bGVTeW50YXhfcmVwZWF0Iiwic3RyaW5nIiwic3RhcnRzV2l0aCIsInN1YnN0ciIsInRvU3RyaW5nIiwiZmluZE5lc3RlZFRva2VucyIsInNsaWNlIiwiYXJndW1lbnQiLCJhbHRlcm5hdGl2ZXMiLCJncm91cEFsdGVybmF0aXZlcyIsIm1hcCIsImdyb3VwIiwicmVzdWx0cyIsIkFsdGVybmF0aXZlcyIsInRva2VucyIsImN1cnJlbnQiLCJpIiwidG9rZW4iLCJjb25jYXQiLCJzeW1ib2wiLCJSZXBlYXQiLCJvcHRpb25hbCIsInVuZGVmaW5lZCIsImpvaW4iLCJwYXJhbXMiLCJiYW5nUG9zaXRpb24iLCJpbmRleE9mIiwibm90IiwiU3VicnVsZSIsImNvbnN0cnVjdG9yIiwiTGlzdCIsIml0ZW0iLCJkZWxpbWl0ZXIiLCJkZWZpbmVQcm9wZXJ0aWVzIiwicHJvdG90eXBlIiwiYWRkU3ludGF4IiwidmFsdWUiLCJuYW1lIiwicnVsZVN5bnRheCIsInByb3BlcnRpZXMiLCJkZWJ1ZyIsImNvbnNvbGUiLCJsb2ciLCJhZGRSdWxlIiwiZSIsImVycm9yIiwiYWRkU3RhdGVtZW50IiwiU3RhdGVtZW50IiwiYWRkRXhwcmVzc2lvbiIsIkV4cHJlc3Npb24iLCJhZGRMaXN0IiwiYWRkSW5maXhPcGVyYXRvciIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJ0b0pTIiwiVHlwZUVycm9yIiwiX19pbmZpeE9wZXJhdG9ycyIsImluZml4T3BlcmF0b3JzIiwiYWRkUG9zdGZpeE9wZXJhdG9yIiwiX19wb3N0Zml4T3BlcmF0b3JzIiwicG9zdGZpeE9wZXJhdG9ycyIsIlJ1bGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNsb25lIiwiY3JlYXRlIiwicHJvcHMiLCJzdHJlYW0iLCJhZHZhbmNlVG8iLCJzdGFjayIsImNvbnRleHQiLCJtYXRjaGVkIiwibmV4dFJ1bGUiLCJuZXh0U3RyZWFtIiwiUGF0dGVybiIsInBhdHRlcm4iLCJkZWZpbmVQcm9wZXJ0eSIsIlJlZ0V4cCIsInNvdXJjZSIsInN0YXJ0UGF0dGVybiIsImJsYWNrbGlzdCIsIm1hdGNoZWRUZXh0IiwicmFuZ2UiLCJpbmRleCIsIndvcmRzIiwid29yZCIsIlJlZ0V4cEZyb21TdHJpbmciLCJmaXJzdCIsInNlY29uZCIsInBhdHRlcm5TdHJpbmciLCJlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzIiwiZ2V0UnVsZU9yRGllIiwicGFyc2UiLCJpc0RldGVybWluaXN0aWMiLCJ0ZXN0IiwiTmVzdGVkIiwiZXZlcnkiLCJ0ZXN0UnVsZSIsImxlZnRSZWN1cnNpdmUiLCJzdGFja0NvbnRhaW5zIiwiY2h1bmtpdCIsInBhcnNlSW5DaHVua3MiLCJuZXh0IiwiZWF0V2hpdGVzcGFjZSIsImFyZ05hbWUiLCJydWxlTmFtZSIsImJlc3RNYXRjaCIsIm1hdGNoZXMiLCJnZXRCZXN0TWF0Y2giLCJyZWR1Y2UiLCJiZXN0IiwidG9Tb3VyY2UiLCJpbmNsdWRlcyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydHlOYW1lIiwiZ2V0UnVsZSIsImFyZ3VtZW50cyIsImNvbXBpbGVTdGF0ZW1lbnRzIiwicmVzdWx0Iiwic3RhdGVtZW50cyIsInRpbWUiLCJjdXJyZW50SW5kZW50IiwidGFicyIsInNwbGl0Iiwic3RhdGVtZW50IiwidHJpbSIsImxpbmVTdGFydCIsImxpbmVJbmRlbnQiLCJjbG9zZXJzIiwibGFzdEJsYW5rTGluZSIsIl9nZXRMYXN0QmxhbmtMaW5lIiwic3BsaWNlIiwid2FybiIsInRpbWVFbmQiLCJ3aGl0ZXNwYWNlIiwiYWR2YW5jZUJ5IiwiZXhpc3RpbmciLCJydWxlSXNMZWZ0UmVjdXJzaXZlIiwic3VicnVsZSIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsIm5lc3RpbmciLCJuZXN0ZWQiLCJjaGFyIiwibGlzdCIsIlJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlMiLCJmbGFncyIsIkRFQlVHIiwiY2hhcnMiLCJXaGl0ZXNwYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJyZXBsYWNlIiwiYWRkVG9CbGFja2xpc3QiLCJUeXBlIiwidHlwZSIsIk51bWJlciIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJJbnRlZ2VyIiwicGFyc2VJbnQiLCJUZXh0IiwidGV4dCIsIkJvb2xlYW4iLCJib29sIiwiZXhwcmVzc2lvbiIsImVuZHNXaXRoIiwiVGV4dFN0cmVhbSIsInRleHRPclByb3BzIiwiYXJnIiwiaGVhZCIsInN1YnN0cmluZyIsIm1lbW9pemVkIiwiZGVmaW5lTWVtb2l6ZWQiLCJwcm9wZXJ0eSIsImdldHRlciIsImFwcGx5IiwiY29uZmlndXJhYmxlIiwiZ2V0IiwiZWxzZVBocmFzZSIsImVsc2VTdGF0ZW1lbnQiLCJpbmRleF9leHByZXNzaW9uIiwiaW5maXhfb3BlcmF0b3IiLCJwcmVjZWRlbmNlIiwiYSIsImIiLCJ0aGluZyIsImxocyIsInJocyIsIm9wZXJhdG9yIiwiYXNzaWdubWVudCIsIm1lc3NhZ2UiLCJidXR0b25DbGF1c2UiLCJidXR0b25OYW1lIiwib2tCdXR0b24iLCJjYW5jZWxCdXR0b24iLCJjYW5jZWxDbGF1c2UiLCJwbHVyYWxpemUiLCJwcm9wIiwia2V5Iiwib2JqZWN0X2xpdGVyYWwiLCJhcmdOYW1lcyIsImFyZ3MiLCJleHRlbmRzQ2xhdXNlIiwic3VwZXJUeXBlIiwicHJvcHNDbGF1c2UiLCJuZXdfdGhpbmciLCJhcmdzQ2xhdXNlIiwic2NvcGUiLCJ2YWx1ZUNsYXVzZSIsImRlY2xhcmF0aW9uIiwic2NvcGVfbW9kaWZpZXIiLCJwbHVyYWwiLCJ2YWx1ZXMiLCJmaXJzdFZhbHVlIiwicmV2ZXJzZSJdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtB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LHdCQUZEO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSwyQkFJV3NCLE9BSlgsRUFJb0I7QUFBQSxPQUNYa0YsVUFEVyxHQUNJLEtBQUs1SSxPQURULENBQ1g0SSxVQURXOztBQUVqQkEsZ0JBQWFBLFdBQVd6QyxRQUFYLENBQW9CekMsT0FBcEIsQ0FBYjtBQUNBLG9CQUFla0YsVUFBZjtBQUNBO0FBUkg7O0FBQUE7QUFBQSxFQUdtQyxxQkFBS3ZHLFVBSHhDLEciLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBpZGVudGl0eSBmdW5jdGlvbiBmb3IgY2FsbGluZyBoYXJtb255IGltcG9ydHMgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAxMyk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay9ib290c3RyYXAgOGZjMDQ0Y2M1NTU4MGEzY2IwNDkiLCIvL1xuLy9cdCMgQ3JlYXRlIGEgYHBhcnNlcmAgc2luZ2xldG9uIHRvIHVzZSB0byBzZXQgdXAgcnVsZXMgYW5kIGR1cmluZyB0ZXN0cy5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5cbi8vIENyZWF0ZSBwYXJzZXIgaW5zdGFuY2UuXG5jb25zdCBwYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG53aW5kb3cucGFyc2VyID0gcGFyc2VyO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvX3BhcnNlci5qcyIsImltcG9ydCB7IGRlZmluZU1lbW9pemVkIH0gZnJvbSBcIi4vbWVtb2l6ZS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gcmUtZXhwb3J0IFJ1bGUgZm9yIHRlc3RpbmdcbmV4cG9ydCBkZWZhdWx0IFJ1bGU7XG5cbi8vXG4vL1x0IyBQYXJzaW5nIGBydWxlU3ludGF4YCB0byBjcmVhdGUgcnVsZXMgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUT0RPOlx0UHVsbCBgcGFyc2VSdWxlU3ludGF4YCBzdHVmZiBvdXQgaW50byBzZXBhcmF0ZSBtb2R1bGU/XG4vLyBUT0RPOlx0QmV0dGVyIG5hbWUgZm9yIGBydWxlU3ludGF4YFxuLy8gVE9ETzpcdFVzZSBrZXl3b3JkcyBpbiBzeW50YXggdG8gbWFrZSBhIHF1aWNrIHJlZ2V4LWJhc2VkIGB0ZXN0YCBmdW5jdGlvbiBmb3IgdGhlIGVudGlyZSBydWxlXG5PYmplY3QuYXNzaWduKFJ1bGUsIHtcblxuLy9cbi8vICMjIGdyb3VwOiBwYXJzaW5nIHN5bnRheFxuLy9cblxuLy8gVE9ETzogY29udmVydCB0byBUZXh0U3RyZWFtIHBhdHRlcm4gYWxhIG5vcm1hbCBwYXJzZXIgb25jZSB0aGF0IHNldHRsZXMgZG93bj8/P1xuXHRwYXJzZVJ1bGVTeW50YXgoc3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIFtdKTtcblxuXHRcdGxldCBydWxlO1xuXHRcdC8vIElmIHdlIG9ubHkgZ290IG9uZSB0aGluZywgcmV0dXJuIHRoYXQgYXMgdGhlIHJlc3VsdFxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSBydWxlc1swXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFNlcXVlbmNlQ29uc3RydWN0b3IoeyBydWxlcyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fSxcblxuXHR0b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KSB7XG5cdFx0Y29uc3QgU1lOVEFYX0VYUFJFU1NJT04gPSAvKD86W1xcd1xcLV0rfFxcXFxbXFxbXFwoXFx7XFwpXFx9XFxdXXxbXlxcc1xcd118XFx8KS9nO1xuXHRcdHZhciBzeW50YXhTdHJlYW0gPSBzeW50YXgubWF0Y2goU1lOVEFYX0VYUFJFU1NJT04pO1xuXHRcdGlmICghc3ludGF4U3RyZWFtKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHRva2VuaXplIHBhcnNlIHJ1bGUgc3ludGF4ID4+JHtzeW50YXh9PDxgKTtcblx0XHRyZXR1cm4gc3ludGF4U3RyZWFtO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBsYXN0SW5kZXggPSBzeW50YXhTdHJlYW0ubGVuZ3RoO1xuXHRcdHdoaWxlIChzdGFydEluZGV4IDwgbGFzdEluZGV4KSB7XG5cdFx0XHRsZXQgWyBydWxlLCBlbmRJbmRleCBdID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRpZiAocnVsZSkge1xuXHRcdFx0XHR2YXIgbGFzdCA9IHJ1bGVzW3J1bGVzLmxlbmd0aC0xXTtcblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBTdHJpbmdgIGFuZCBsYXN0IHdhcyBhIGBTdHJpbmdgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5TeW1ib2wgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sKSB7XG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBsYXN0IHJ1bGVcblx0XHRcdFx0XHRydWxlcy5wb3AoKTtcblx0XHRcdFx0XHQvLyBhbmQgcmVwbGFjZSB3aXRoIGEgcnVsZSB0aGF0IG1lcmdlcyB0aGUga2V5d29yZHNcblx0XHRcdFx0XHRydWxlID0gUnVsZS5tZXJnZVN5bWJvbHMobGFzdCwgcnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBLZXl3b3JkYCBhbmQgbGFzdCB3YXMgYWxzbyBhIGBLZXl3b3JkYCwgbWVyZ2UgdG9nZXRoZXJcblx0XHRcdFx0ZWxzZSBpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQpIHtcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuXHRcdFx0XHRcdC8vIGFuZCByZXBsYWNlIHdpdGggYSBydWxlIHRoYXQgbWVyZ2VzIHRoZSBrZXl3b3Jkc1xuXHRcdFx0XHRcdHJ1bGUgPSBSdWxlLm1lcmdlS2V5d29yZHMobGFzdCwgcnVsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cnVsZXMucHVzaChydWxlKTtcblx0XHRcdH1cblx0XHRcdHN0YXJ0SW5kZXggPSBlbmRJbmRleCArIDE7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlcztcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHZhciBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdC8vIGlmIHdlIGdvdCBhIFwiXFxcXFwiICh3aGljaCBhbHNvIGhhcyB0byBnbyBpbnRvIHRoZSBzb3VyY2Ugc3RyaW5nIGFzIFwiXFxcXFwiKVxuXHRcdC8vIHRyZWF0IHRoZSBuZXh0IHRva2VuIGFzIGEgbGl0ZXJhbCBzdHJpbmcgcmF0aGVyIHRoYW4gYXMgYSBzcGVjaWFsIGNoYXJhY3Rlci5cblx0XHRpZiAoc3ludGF4VG9rZW4gPT09IFwiXFxcXFwiKSB7XG5cdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggKyAxKTtcblx0XHR9XG5cblx0XHRzd2l0Y2ggKHN5bnRheFRva2VuKSB7XG5cdFx0XHRjYXNlIFwie1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIipcIjpcblx0XHRcdGNhc2UgXCIrXCI6XG5cdFx0XHRjYXNlIFwiP1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblxuXHRcdFx0Ly8gdGhlIGZvbGxvd2luZyBzaG91bGQgQUxXQVlTIGJlIGNvbnN1bWVkIGJ5IHRoZSBhYm92ZVxuXHRcdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGNhc2UgXCIpXCI6XG5cdFx0XHRjYXNlIFwiXVwiOlxuXHRcdFx0Y2FzZSBcInxcIjpcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7c3ludGF4VG9rZW59IGZvdW5kIGFzIGl0ZW0gJHtzdGFydEluZGV4fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHR2YXIgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdLCBydWxlO1xuXHRcdC8vIElmIGxldHRlcnMgb25seSwgbWF0Y2ggYXMgYSBLZXl3b3JkIChzbyB3ZSByZXF1aXJlIGEgd29yZCBib3VuZGFyeSBhZnRlciB0aGUgc3RyaW5nKS5cblx0XHRpZiAoc3RyaW5nLm1hdGNoKC9bQS1aYS16XSsvKSkge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLktleXdvcmQoeyBzdHJpbmcgfSk7XG5cdFx0fVxuXHRcdC8vIE90aGVyd2lzZSBtYXRjaCBhcyBhIFN0cmluZywgd2hpY2ggZG9lc24ndCByZXF1aXJlIG5vbi13b3JkIGNoYXJzIGFmdGVyIHRoZSB0ZXh0LlxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlN5bWJvbCh7IHN0cmluZzogc3RyaW5nIH0pO1xuXHRcdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRcdGlmIChzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIikpIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIGxlYWRpbmcgc2xhc2ggaW4gbWF0Y2ggc3RyaW5nLi4uXG5cdFx0XHRcdHJ1bGUuc3RyaW5nID0gcnVsZS5zdHJpbmcuc3Vic3RyKDEpO1xuXHRcdFx0XHQvLyBidXQgbGVhdmUgaXQgaW4gdG9TdHJpbmdcblx0XHRcdFx0cnVsZS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnRJbmRleCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdC8vIE5PVEU6IG5lc3RlZCBwYXJlbnMgbWF5IG5vdCBoYXZlIGFsdGVybmF0aXZlcy4uLiA6LSggICBgKGF8KGJ8YykpYCB3b24ndCB3b3JrPz8/XG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiKFwiLCBcIilcIiwgc3RhcnRJbmRleCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0Ly8gc3BsaXQgaW50byBncm91cHMsIGluY2x1ZGluZyBuZXN0ZWQgcGFyZW5zXG5cdFx0bGV0IGFsdGVybmF0aXZlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0aXZlcyhzbGljZSlcblx0XHRcdC5tYXAoZnVuY3Rpb24oZ3JvdXApIHtcblx0XHRcdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoZ3JvdXAsIFtdKTtcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHNbMF07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSdWxlLlNlcXVlbmNlKHsgcnVsZXM6IHJlc3VsdHMgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0bGV0IHJ1bGUgPSBhbHRlcm5hdGl2ZXMubGVuZ3RoID09PSAxID8gYWx0ZXJuYXRpdmVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0aXZlcyB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXG5cdFx0ZnVuY3Rpb24gZ3JvdXBBbHRlcm5hdGl2ZXModG9rZW5zKSB7XG5cdFx0XHR2YXIgYWx0ZXJuYXRpdmVzID0gW107XG5cdFx0XHR2YXIgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XHRjdXJyZW50ID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaGFuZGxlIG5lc3RlZCBwYXJlbnNcblx0XHRcdFx0ZWxzZSBpZiAodG9rZW4gPT09IFwiKFwiKSB7XG5cdFx0XHRcdFx0bGV0IHsgZW5kSW5kZXggfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHRva2VucywgXCIoXCIsIFwiKVwiLCBpKTtcblx0XHRcdFx0XHRjdXJyZW50ID0gY3VycmVudC5jb25jYXQodG9rZW5zLnNsaWNlKGksIGVuZEluZGV4ICsgMSkpO1xuXHRcdFx0XHRcdGkgPSBlbmRJbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdXJyZW50LnB1c2godG9rZW4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoY3VycmVudC5sZW5ndGgpIGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0cmV0dXJuIGFsdGVybmF0aXZlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHR2YXIgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdHZhciBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblxuXHRcdHZhciBwYXJhbXMgPSB7IHJ1bGU6IG1hdGNoLnNsaWNlWzBdIH07XG5cblx0XHQvLyBzZWUgaWYgdGhlcmUncyBhIGBub3RgIHJ1bGUgaW4gdGhlcmVcblx0XHRsZXQgYmFuZ1Bvc2l0aW9uID0gcGFyYW1zLnJ1bGUuaW5kZXhPZihcIiFcIik7XG5cdFx0aWYgKGJhbmdQb3NpdGlvbiAhPT0gLTEpIHtcblx0XHRcdHBhcmFtcy5ub3QgPSBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSk7IC8vWyBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSkgXTtcblx0XHRcdHBhcmFtcy5ydWxlID0gcGFyYW1zLnJ1bGUuc3Vic3RyKDAsIGJhbmdQb3NpdGlvbik7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5TdWJydWxlKHBhcmFtcyk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgbWF0Y2guZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBsaXN0IGV4cHJlc3Npb24gYFs8aXRlbT48ZGVsaW1pdGVyPl1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCwgY29uc3RydWN0b3IgPSBSdWxlLkxpc3QpIHtcblx0XHRpZiAodHlwZW9mIHN5bnRheFN0cmVhbSA9PT0gXCJzdHJpbmdcIikgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4U3RyZWFtKTtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJbXCIsIFwiXVwiLCBzdGFydEluZGV4KTtcblxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHNsaWNlLCBbXSk7XG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoICE9PSAyKSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgc3R1ZmYgYXQgZW5kIG9mIGxpc3Q6IFske3NsaWNlLmpvaW4oXCIgXCIpfV1gKTtcblx0XHR9XG5cdFx0bGV0IFsgaXRlbSwgZGVsaW1pdGVyIF0gPSByZXN1bHRzO1xuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgY29uc3RydWN0b3IoeyBpdGVtLCBkZWxpbWl0ZXIgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxufSk7XG5cblxuXG4vLyAjIyAgQWRkIG1ldGhvZHMgdG8gUGFyc2VyIHRvIGRlZmluZSBydWxlcyB1c2luZyB0aGUgYWJvdmUgc3ludGF4LlxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUGFyc2VyLnByb3RvdHlwZSwge1xuXG5cdC8vIFBhcnNlIGEgYHJ1bGVTeW50YXhgIHJ1bGUgYW5kIGFkZCBpdCB0byBvdXIgbGlzdCBvZiBydWxlcy5cblx0Ly8gUmV0dXJucyB0aGUgbmV3IHJ1bGUuXG5cdC8vIExvZ3MgcGFyc2luZyBlcnJvcnMgYnV0IGFsbG93cyB0aGluZ3MgdG8gY29udGludWUuXG5cdGFkZFN5bnRheDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0bGV0IHByb3BlcnRpZXM7XG5cdFx0aWYgKHR5cGVvZiBjb25zdHJ1Y3RvciAhPT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRwcm9wZXJ0aWVzID0gY29uc3RydWN0b3I7XG5cdFx0XHRjb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2U7XG5cdFx0fVxuXHRcdHRyeSB7XG5cdFx0XHRsZXQgcnVsZSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yKTtcblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cbi8vY29uc29sZS5pbmZvKG5hbWUsIGNvbnN0cnVjdG9yLCBydWxlKTtcblx0XHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmdyb3VwKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgc3ludGF4OiAke3J1bGVTeW50YXh9YCk7XG5cdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdH1cblx0fX0sXG5cblx0YWRkU3RhdGVtZW50OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuU3RhdGVtZW50KSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3Rvcik7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJzdGF0ZW1lbnRcIiwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZEV4cHJlc3Npb246IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5FeHByZXNzaW9uKSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3Rvcik7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRMaXN0OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuTGlzdCkge1xuXHRcdGxldCBbIHJ1bGUsIGVuZEluZGV4IF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHJ1bGVTeW50YXgsIFtdLCAwLCBjb25zdHJ1Y3Rvcik7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdC8vIEFkZCBpbmZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgb3IgYlwiLlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZEluZml4T3BlcmF0b3I6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSkge1xuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRJbmZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50b0pTKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIGluZml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYClcblx0XHRcdH1cblx0XHRcdC8vIGNsZWFyIGxpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGZvciBnZXR0ZXIgYmVsb3dcblx0XHRcdGRlbGV0ZSB0aGlzLl9faW5maXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwiaW5maXhfb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIGluZml4IG9wZXJhdG9ycyBhcyBzdHJpbmdzLlxuXHQvLyBSZS1tZW1vaXplZCBhZnRlciBgYWRkSW5maXhPcGVyYXRvcmAgYWJvdmUuXG5cdGluZml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9faW5maXhPcGVyYXRvcnNcIixcblx0XHRmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucnVsZXNbXCJpbmZpeF9vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0ICYmIHRoaXMucnVsZXNbXCJpbmZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZylcblx0fSksXG5cblx0Ly8gQWRkIHBvc3RmaXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIGlzIGRlZmluZWRcIlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZFBvc3RmaXhPcGVyYXRvcjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKSB7XG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFBvc3RmaXhPcGVyYXRvcihuYW1lLCBzeW50YXgsIHByb3BlcnRpZXMpKTtcblx0XHR9XG5cblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudG9KUykge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBwb3N0Zml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBjbGVhciBsaXN0IG9mIGluZml4IG9wZXJhdG9ycyBmb3IgZ2V0dGVyIGJlbG93XG5cdFx0XHRkZWxldGUgdGhpcy5fX3Bvc3RmaXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwicG9zdGZpeF9vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH19LFxuXG5cdC8vIExpc3Qgb2YgcG9zdGZpeCBvcGVyYXRvcnMgYXMgc3RyaW5ncy5cblx0Ly8gUmUtbWVtb2l6ZWQgYWZ0ZXIgYGFkZEluZml4T3BlcmF0b3JgIGFib3ZlLlxuXHRwb3N0Zml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9fcG9zZml4T3BlcmF0b3JzXCIsXG5cdFx0ZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXMucnVsZXNbXCJwb3N0Zml4X29wZXJhdG9yXCJdXG5cdFx0XHRcdFx0XHQmJiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZyk7XG5cdH0pXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlU3ludGF4LmpzIiwiLy9cdCMgUGFyc2VyIFJ1bGVzXG4vL1x0UnVsZXMgY2FuIGJlIGFzIHNpbXBsZSBhcyBhIHN0cmluZyBgS2V5d29yZGAgb3IgYSBjb21wbGV4IHNlcXVlbmNlIG9mIChuZXN0ZWQpIHJ1bGVzLlxuLy9cbi8vXHRQYXJzZSBhIHJ1bGUgd2l0aCBgcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSlgLCB0aGlzIHdpbGwgZWl0aGVyOlxuLy9cdFx0LSByZXR1cm4gYHVuZGVmaW5lZGAgaWYgdGhlIHJ1bGUgZG9lc24ndCBtYXRjaCB0aGUgaGVhZCBvZiB0aGUgc3RyZWFtLCBvclxuLy9cdFx0LSByZXR1cm4gYSBDTE9ORSBvZiB0aGUgcnVsZSB3aXRoIGF0IGxlYXN0IHRoZSBmb2xsb3dpbmc6XG4vL1x0XHRcdC0gYHN0cmVhbWBcdFx0U3RyZWFtIHdoaWNoIHdhcyBtYXRjaGVkIHdpdGggYHN0YXJ0SW5kZXhgIGF0IHRoZSBzdGFydCBvZiB0aGUgbWF0Y2hcbi8vXHRcdFx0LSBgZW5kSW5kZXhgXHROb24taW5jbHVzaXZlIGVuZCBpbmRleCBpbiBzdHJlYW0gd2hlcmUgbWF0Y2ggZW5kcy5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLnJlc3VsdHNgXHRcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZShjb250ZXh0KWBcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBSdWxlIHx8ICF0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShcImNvbnN0cnVjdG9yXCIpKSB7XG4vL2NvbnNvbGUud2FybihcIm5vdCBydWxlXCIsIHRoaXMpO1xuXHRcdH1cblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXHR9XG5cblx0Ly8gQ2xvbmUgdGhpcyBydWxlIGFuZCBhZGQgYW55IGBwcm9wc2AgcGFzc2VkIGluLlxuXHRjbG9uZSguLi5wcm9wcykge1xuXHRcdGxldCBjbG9uZSA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG5cdFx0T2JqZWN0LmFzc2lnbihjbG9uZSwgLi4ucHJvcHMpO1xuXHRcdHJldHVybiBjbG9uZTtcblx0fVxuXG5cdC8vIEZvciBhIHJ1bGUgaW5zdGFuY2UgYXNzb2NpYXRlZCB3aXRoIGEgc3RyZWFtLFxuXHQvLyByZXR1cm4gYSBuZXcgc3RyZWFtIEFGVEVSIHRoaXMgcnVsZSdzIGVuZC5cblx0bmV4dCgpIHtcblx0XHRpZiAoIXRoaXMuc3RyZWFtIHx8IHRoaXMuZW5kSW5kZXggPT09IHVuZGVmaW5lZClcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYHJ1bGUubmV4dCgpIGNhbGxlZCBvbiBydWxlIHdpdGhvdXQgYSBzdHJlYW1gLCB0aGlzKTtcblx0XHRyZXR1cm4gdGhpcy5zdHJlYW0uYWR2YW5jZVRvKHRoaXMuZW5kSW5kZXgpO1xuXHR9XG5cbi8vXG4vL1x0UGFyc2luZyBwcmltaXRpdmVzIC0tIHlvdSBNVVNUIGltcGxlbWVudCB0aGVzZSBpbiB5b3VyIHN1YmNsYXNzZXMhXG4vL1xuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBydWxlIGluIHRoZSBgc3RyZWFtYC5cblx0Ly8gUmV0dXJucyByZXN1bHRzIG9mIHRoZSBwYXJzZSBvciBgdW5kZWZpbmVkYC5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIElzIHRoaXMgcnVsZSBkZXRlcm1pbmlzdGljLCBlZzogY2FuIGl0IGJlIHF1aWNrbHkgYW5kIHVuYW1iaWd1b3VzbHkgc2F0aXNmaWVkP1xuXHQvLyBSZXR1cm5pbmcgYHRydWVgIGNhbiBzcGVlZCB1cCBzZXF1ZW5jZSBwcm9jZXNzaW5nLFxuXHQvL1x0YnV0IGlmIHlvdSdyZSByZWFsbHkgbm90IHN1cmUsIHJldHVybiBgdW5kZWZpbmVkYC5cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGJpdHMgb2Ygb3VyIHJ1bGUgYXJlIGZvdW5kIEFOWVdIRVJFIGluIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIGB1bmRlZmluZWRgIGlmIG5vdCBkZXRlcm1pbnN0aWMgKGJ1dCBhbGwgcGF0dGVybnMgYXJlIGRldGVybWluaXN0aWMpXG5cdC8vXHQtIHJlZ2V4IG1hdGNoIGlmIGZvdW5kLFxuXHQvL1x0LSBgZmFsc2VgIGlmIG5vdCBmb3VuZFxuXHR0ZXN0KHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIERvZXMgdGhlIHBhcnNlIGBzdGFja2AgYWxyZWFkeSBjb250YWluIGBydWxlYD9cblx0c3RhdGljIHN0YWNrQ29udGFpbnMoc3RhY2ssIHJ1bGUsIHN0cmVhbSkge1xuXHRcdGlmIChzdGFjay5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcblxuLy9jb25zb2xlLmluZm8oc3RhY2spO1xuXHRcdC8vIGdvIGJhY2t3YXJkc1xuXHRcdGZvciAodmFyIGkgPSBzdGFjay5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0bGV0IFsgbmV4dFJ1bGUsIG5leHRTdHJlYW0gXSA9IHN0YWNrW2ldO1xuXHRcdFx0aWYgKG5leHRSdWxlID09PSBydWxlKSB7XG5cdFx0XHRcdGlmIChuZXh0U3RyZWFtLnN0YXJ0SW5kZXggPT09IHN0cmVhbS5zdGFydEluZGV4KSB7XG4vL1x0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJmb3VuZCB1bnByb2R1Y3RpdmUgcnVsZSBcIiwgcnVsZSwgXCIgb24gc3RhY2tcIiwgc3RhY2spO1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuLy9cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiZm91bmQgcHJvZHVjdGl2ZSBydWxlIFwiLCBydWxlLCBcIiBvbiBzdGFja1wiLCBzdGFjayk7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG4vL1xuLy8gIyMgb3V0cHV0IGFzIHNvdXJjZVxuLy9cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gTk9URTogeW91IG1heSB3YW50IHRvIG1lbW9pemUgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0Ly8gT3V0cHV0IHZhbHVlIGZvciB0aGlzIElOU1RBTlRJQVRFRCBydWxlIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQ7XG5cdH1cblxuLy9cbi8vICMjIGdyb3VwOiByZWZsZWN0aW9uXG4vL1xuXHRnZXQgcnVsZVR5cGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0fVxufVxuXG5cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vXG4vLyBOT1RFXHRUbyBtYWtlIHRoaXMgbW9yZSBnZW5lcmFsbHkgYXBwbGljYWJsZSwgZG8gTk9UIHN0YXJ0IHRoZSBwYXR0ZXJuIHdpdGggYSBgXmAuXG4vL1x0XHRXZSdsbCBhdXRvbWF0aWNhbGx5IG1ha2UgYSBjb3B5IG9mIHRoZSBSZWdFeHAgd2l0aCB0aGUgc3RhcnQgcG9pbnQgYXR0YWNoZWRcbi8vXHRcdGFuZCB1c2UgdGhhdCBhcyBhcHByb3ByaWF0ZS5cbi8vXG4vL1x0XHRUaGlzIHdheSB3ZSBjYW4gcmUtdXNlIHRoZSByZWdleCB0byBjaGVjayBmb3IgYSBtYXRjaCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBzdHJlYW0uLi5cbi8vXG4vLyBZb3UgY2FuIG9wdGlvbmFsbHkgc3BlY2lmeSBhIGBydWxlLmJsYWNrbGlzdGAsIGEgc2V0IG9mIG1hdGNoZXMgd2hpY2ggd2lsbCBzcGVjaWZpY2FsbHkgTk9UIHdvcmssXG4vL1x0ZWcgZm9yIGBpZGVudGlmaWVyLlxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHBhdHRlcm5gIGlzIHJlcXVpcmVkXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5QYXR0ZXJuKCk6IFlvdSBtdXN0IHBhc3MgYSBgcGF0dGVybmAgcGFyYW1ldGVyXCIpO1xuXG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cblx0XHQvLyBDcmVhdGUgYSBgc3RhcnRQYXR0ZXJuYCB0byBtYXRjaCBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJvbmdcblx0XHQvLyBDcmVhdGUgbm9uLWVudW1lcmFibHkuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic3RhcnRQYXR0ZXJuXCIsIHsgdmFsdWU6IG5ldyBSZWdFeHAoXCJeXCIgKyB0aGlzLnBhdHRlcm4uc291cmNlKSB9KTtcblx0fVxuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBwYXR0ZXJuIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0bGV0IG1hdGNoID0gc3RyZWFtLm1hdGNoKHRoaXMuc3RhcnRQYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYmFpbCBpZiBwcmVzZW50IGluIGJsYWNrbGlzdFxuXHRcdGxldCBtYXRjaGVkID0gbWF0Y2hbMF07XG5cdFx0aWYgKHRoaXMuYmxhY2tsaXN0ICYmIHRoaXMuYmxhY2tsaXN0W21hdGNoZWRdKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IGVuZEluZGV4ID0gc3RyZWFtLnN0YXJ0SW5kZXggKyBtYXRjaGVkLmxlbmd0aDtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIGVuZEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBQYXR0ZXJucyBhcmUgQUxXQVlTIGRldGVybWluaXN0aWMuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYW55IG9mIG91ciBwYXR0ZXJuaXMgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYyAoYnV0IGFsbCBwYXR0ZXJucyBhcmUgZGV0ZXJtaW5pc3RpYylcblx0Ly9cdC0gcmVnZXggbWF0Y2ggaWYgZm91bmQsXG5cdC8vXHQtIGBmYWxzZWAgaWYgbm90IGZvdW5kXG5cdHRlc3QocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5wYXR0ZXJuKTtcblx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdG1hdGNoLmVuZEluZGV4ID0gKG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoKTtcblx0XHRcdHJldHVybiBtYXRjaDtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0YWRkVG9CbGFja2xpc3QoLi4ud29yZHMpIHtcblx0XHRpZiAoIXRoaXMuYmxhY2tsaXN0KSB0aGlzLmJsYWNrbGlzdCA9IHt9O1xuXHRcdHdvcmRzLmZvckVhY2god29yZCA9PiB0aGlzLmJsYWNrbGlzdFt3b3JkXSA9IHRydWUpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMucGF0dGVybi5zb3VyY2U7XG5cdH1cbn1cblxuLy8gUnVsZSBmb3IgbGl0ZXJhbCBzdHJpbmcgdmFsdWUsIHdoaWNoIGluY2x1ZGUgcHVuY3R1YXRpb24gc3VjaCBhcyBgKGAgZXRjLlxuLy8gYFN5bWJvbGBzIGFyZSBkaWZmZXJlbnQgZnJvbSBgS2V5d29yZHNgIGluIHRoYXQgdGhleSBkbyBub3QgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkuXG4vL1RPRE86IHJlbmFtZSBgU3ltYm9sYD8/P1xuUnVsZS5TeW1ib2wgPSBjbGFzcyBTeW1ib2wgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHN0cmluZ2AgaXMgcmVxdWllZC5cblx0XHRpZiAoIXByb3BlcnRpZXMuc3RyaW5nKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuU3ltYm9sKCk6IEV4cGVjdGVkIHN0cmluZyBwcm9wZXJ0eVwiKTtcblxuXHRcdC8vIGNvbnZlcnQgc3RyaW5nIHRvIHBhdHRlcm5cblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikge1xuXHRcdFx0cHJvcGVydGllcy5wYXR0ZXJuID0gUGFyc2VyLlJlZ0V4cEZyb21TdHJpbmcocHJvcGVydGllcy5zdHJpbmcpO1xuLy9jb25zb2xlLmluZm8ocHJvcGVydGllcy5zdHJpbmcsIHByb3BlcnRpZXMucGF0dGVybik7XG5cdFx0fVxuXG4vL1x0XHRjb25zb2xlLmluZm8oXCJjcmVhdGluZyBzdHJpbmdcIiwgcHJvcGVydGllcyk7XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdH1cblxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cbi8vIE1lcmdlIHR3byBTeW1ib2wgcnVsZXMgdG9nZXRoZXIsIHJldHVybmluZyBhIG5ldyBydWxlIHRoYXQgbWF0Y2hlcyBib3RoLlxuUnVsZS5tZXJnZVN5bWJvbHMgPSBmdW5jdGlvbihmaXJzdCwgc2Vjb25kKSB7XG5cdHJldHVybiBuZXcgUnVsZS5TeW1ib2woeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cbi8vIEtleXdvcmQgcGF0dGVybi5cbi8vIFByb3BlcnRpZXM6XG4vL1x0LSBgcnVsZS5zdHJpbmdgIFx0KHJlcXVpcmVkKSBcdEtleXdvcmQgc3RyaW5nIHRvIG1hdGNoLlxuLy9cdC0gYHJ1bGUucGF0dGVybmBcdChvcHRpb25hbCkgXHRSZWdFeHAgZm9yIHRoZSBtYXRjaC5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0V2UnbGwgY3JlYXRlIG9uZSBmcm9tIGBzdHJpbmdgIGlmIG5lY2Vzc2FyeS5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0Tk9URTogZG8gTk9UIHN0YXJ0IHRoZSBgcGF0dGVybmAgd2l0aCBgXmAuXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLktleXdvcmQoKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gZGVyaXZlIGBwYXR0ZXJuYCBpZiBuZWNlc3NhcnkuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdC8vIGVuZm9yY2Ugd29yZCBib3VuZGFyaWVzIGFuZCBhbGxvdyBhcmJpdHJhcnkgc3BhY2UgYmV0d2VlbiB3b3Jkc1xuXHRcdFx0bGV0IHBhdHRlcm5TdHJpbmcgPSBQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhwcm9wZXJ0aWVzLnN0cmluZyk7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKFwiXFxcXGJcIiArIHBhdHRlcm5TdHJpbmcgKyBcIlxcXFxiXCIpO1xuXHRcdH1cblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuLy8gTWVyZ2UgdHdvIEtleXdvcmQgcnVsZXMgdG9nZXRoZXIsIGFkZGluZyB0aGUgc2Vjb25kIHRvIHRoZSBmaXJzdC5cblJ1bGUubWVyZ2VLZXl3b3JkcyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0cmV0dXJuIG5ldyBSdWxlLktleXdvcmQoeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIFwiIFwiICsgc2Vjb25kLnN0cmluZyB9KTtcbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy5ydWxlLCBcInJ1bGVcIik7XG5cdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgbWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdHJldHVybiBtYXRjaDtcblx0fVxuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnJ1bGUsIFwicnVsZVwiKTtcblx0XHRyZXR1cm4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYW55IG9mIG91ciBhbHRlcm5hdGl2ZXMgYXJlIGZvdW5kIEFOWVdIRVJFIGluIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIHJlZ2V4IG1hdGNoIGlmIGZvdW5kLFxuXHQvL1x0LSBgZmFsc2VgIGlmIG5vdCBmb3VuZCBvclxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljLlxuXHR0ZXN0KHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZU9yRGllKHRoaXMucnVsZSwgXCJydWxlXCIpO1xuXHRcdHJldHVybiBydWxlLnRlc3QocGFyc2VyLCBzdHJlYW0pO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHtcblxuXHQvLyBJcyB0aGlzIGRldGVybWluaXN0aWMsIGVnOiBhcmUgb3VyIHN1YnJ1bGVzIHVuYW1iaWdvdXNseSBkZXRlcm1pbmFibGU/XG4vL1RPRE86IG1lbW9pemU/XG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzLmV2ZXJ5KHJ1bGUgPT4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pKTtcblx0fVxufVxuXG5cbi8vIFNlcXVlbmNlIG9mIHJ1bGVzIHRvIG1hdGNoIChhdXRvLWV4Y2x1ZGluZyB3aGl0ZXNwYWNlKS5cblJ1bGUuU2VxdWVuY2UgPSBjbGFzcyBTZXF1ZW5jZSBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrID0gW10pIHtcblx0XHQvLyBJZiB3ZSBoYXZlIGEgYHRlc3RSdWxlYCBkZWZpbmVkXG5cdFx0aWYgKHRoaXMudGVzdFJ1bGUpIHtcblx0XHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnRlc3RSdWxlLCBcInRlc3RSdWxlXCIpO1xuXHRcdFx0aWYgKHJ1bGUudGVzdChwYXJzZXIsIHN0cmVhbSkgPT09IGZhbHNlKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdGlmIChSdWxlLnN0YWNrQ29udGFpbnMoc3RhY2ssIHRoaXMsIHN0cmVhbSkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRzdGFjayA9IHN0YWNrLmNvbmNhdCgpO1xuXHRcdFx0c3RhY2sucHVzaChbdGhpcywgc3RyZWFtXSk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2h1bmtpdCkgcmV0dXJuIHRoaXMucGFyc2VJbkNodW5rcyhwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIW1hdGNoICYmICFydWxlLm9wdGlvbmFsKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdG1hdGNoZWQucHVzaChtYXRjaCk7XG5cdFx0XHRcdG5leHQgPSBtYXRjaC5uZXh0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGlmIHdlIGdldCBoZXJlLCB3ZSBtYXRjaGVkIGFsbCB0aGUgcnVsZXMhXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vIFx0cGFyc2VJbkNodW5rcyhwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcbi8vXG4vLyBcdH1cblxuLy9UT0RPQ1xuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGBtYXRjaGVkYCBhcnJheSBpbmRleGVkIGJ5XG5cdC8vXHRcdC0gYG1hdGNoLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYG1hdGNoLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIGBydWxlIHR5cGVgOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRsZXQgcmVzdWx0cyA9IHt9O1xuXHRcdGZvciAobGV0IG1hdGNoIG9mIHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0bGV0IGFyZ05hbWUgPSBtYXRjaC5hcmd1bWVudCB8fCBtYXRjaC5ydWxlTmFtZSB8fCBtYXRjaC5jb25zdHJ1Y3Rvci5uYW1lO1xuXG5cdFx0XHQvLyBJZiBhcmcgYWxyZWFkeSBleGlzdHMsIGNvbnZlcnQgdG8gYW4gYXJyYXlcblx0XHRcdGlmIChhcmdOYW1lIGluIHJlc3VsdHMpIHtcblx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KHJlc3VsdHNbYXJnTmFtZV0pKSByZXN1bHRzW2FyZ05hbWVdID0gW3Jlc3VsdHNbYXJnTmFtZV1dO1xuXHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdLnB1c2gobWF0Y2gpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0gPSBtYXRjaDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlcy5qb2luKFwiIFwiKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG5cbn1cblxuLy8gU3ludGFjdGljIHN1Z2FyIGZvciBkZWJ1Z2dpbmdcblJ1bGUuRXhwcmVzc2lvbiA9IGNsYXNzIGV4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gU3RhdGVtZW50cyB0YWtlIHVwIHRoZSBlbnRpcmUgbGluZS5cblJ1bGUuU3RhdGVtZW50ID0gY2xhc3Mgc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIEFsdGVybmF0aXZlIHN5bnRheCwgbWF0Y2hpbmcgb25lIG9mIGEgbnVtYmVyIG9mIGRpZmZlcmVudCBydWxlcy5cbi8vIFRoZSByZXN1bHQgb2YgYSBwYXJzZSBpcyB0aGUgbG9uZ2VzdCBydWxlIHRoYXQgYWN0dWFsbHkgbWF0Y2hlZC5cbi8vIE5PVEU6IEN1cnJlbnRseSB0YWtlcyB0aGUgbG9uZ2VzdCB2YWxpZCBtYXRjaC5cbi8vIFRPRE86IG1hdGNoIGFsbCB2YWxpZCBhbHRlcm5hdGl2ZXNcbi8vIFRPRE86IHJlbmFtZT9cblJ1bGUuQWx0ZXJuYXRpdmVzID0gY2xhc3MgQWx0ZXJuYXRpdmVzIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKTtcblx0XHRpZiAoIXRoaXMucnVsZXMpIHRoaXMucnVsZXMgPSBbXTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljLlxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmQgb3Jcblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICghdGhpcy5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCBiZXN0TWF0Y2g7XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnRlc3QocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdG1hdGNoLmVuZEluZGV4ID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG5cdFx0XHRcdHJldHVybiBtYXRjaDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gRmluZCBhbGwgcnVsZXMgd2hpY2ggbWF0Y2ggYW5kIGRlbGVnYXRlIHRvIGBnZXRCZXN0TWF0Y2goKWAgdG8gcGljayB0aGUgYmVzdCBvbmUuXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdGxldCBtYXRjaGVzID0gW107XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayk7XG5cdFx0XHRpZiAobWF0Y2gpIG1hdGNoZXMucHVzaChtYXRjaCk7XG5cdFx0fVxuXG5cdFx0aWYgKCFtYXRjaGVzLmxlbmd0aCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIHVuY29tbWVudCB0aGUgYmVsb3cgdG8gcHJpbnQgYWx0ZXJuYXRpdmVzXG5cdFx0Ly8gaWYgKG1hdGNoZXMubGVuZ3RoID4gMSkge1xuXHRcdC8vXHRjb25zb2xlLmluZm8odGhpcy5hcmd1bWVudCB8fCB0aGlzLnJ1bGVOYW1lLCBtYXRjaGVzLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5tYXRjaGVkVGV4dCkpO1xuXHRcdC8vIH1cblxuXHRcdGxldCBiZXN0TWF0Y2ggPSAobWF0Y2hlcy5sZW5ndGggPT09IDEgPyBtYXRjaGVzWzBdIDogdGhpcy5nZXRCZXN0TWF0Y2gobWF0Y2hlcykpO1xuXG5cdFx0Ly8gYXNzaWduIGBhcmdOYW1lYCBvciBgcnVsZU5hbWVgIGZvciBgcmVzdWx0c2Bcblx0XHRpZiAodGhpcy5hcmd1bWVudCkgYmVzdE1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRlbHNlIGlmICh0aGlzLnJ1bGVOYW1lKSBiZXN0TWF0Y2gucnVsZU5hbWUgPSB0aGlzLnJ1bGVOYW1lO1xuLy9UT0RPOiBvdGhlciB0aGluZ3MgdG8gY29weSBoZXJlPz8/XG5cblx0XHRyZXR1cm4gYmVzdE1hdGNoO1xuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBcImJlc3RcIiBtYXRjaCBnaXZlbiBtb3JlIHRoYW4gb25lIG1hdGNoZXMgYXQgdGhlIGhlYWQgb2YgdGhlIHN0cmVhbS5cblx0Ly8gRGVmYXVsdCBpcyB0byByZXR1cm4gdGhlIGxvbmdlc3QgbWF0Y2guXG5cdC8vIEltcGxlbWVudCBzb21ldGhpbmcgZWxzZSB0byBkbywgZWcsIHByZWNlZGVuY2UgcnVsZXMuXG5cdGdldEJlc3RNYXRjaChtYXRjaGVzKSB7XG5cdFx0cmV0dXJuIG1hdGNoZXMucmVkdWNlKGZ1bmN0aW9uIChiZXN0LCBuZXh0KSB7XG5cdFx0XHRpZiAobmV4dC5lbmRJbmRleCA+IGJlc3QuZW5kSW5kZXgpIHJldHVybiBuZXh0O1xuXHRcdFx0cmV0dXJuIGJlc3Q7XG5cdFx0fSwgbWF0Y2hlc1swXSk7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZShjb250ZXh0KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5tYXRjaGVkYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrID0gW10pIHtcblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHRpZiAoUnVsZS5zdGFja0NvbnRhaW5zKHN0YWNrLCB0aGlzLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0c3RhY2sgPSBzdGFjay5jb25jYXQoKTtcblx0XHRcdHN0YWNrLnB1c2goW3RoaXMsIHN0cmVhbV0pO1xuXHRcdH1cblxuXHRcdGxldCBuZXh0ID0gc3RyZWFtO1xuXHRcdGxldCBtYXRjaGVkID0gW107XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCBtYXRjaCA9IHRoaXMucnVsZS5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghbWF0Y2gpIGJyZWFrO1xuXG5cdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0bmV4dCA9IG1hdGNoLm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAobWF0Y2hlZC5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBhcnJheSB3aXRoIGFyZ3VtZW50cyBvZiBhbGwgcmVzdWx0cy5cblx0Ly8gTk9URTogbWVtb2l6ZXMgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC5yZXN1bHRzICk7XG5cdH1cblxuXHR0b1NvdXJjZSgpIHtcblx0XHR0aHJvdyBcIkRvbid0IHVuZGVyc3RhbmQgaG93IHRvIHNvdXJjZSBSdWxlLlJlcGVhdCFcIjtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdGNvbnN0IHJ1bGUgPSAodGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSB8fCB0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQgJiYgdGhpcy5ydWxlLnN0cmluZy5pbmNsdWRlcyhcIiBcIilcblx0XHRcdFx0ICAgPyBgKCR7dGhpcy5ydWxlfSlgXG5cdFx0XHRcdCAgIDogYCR7dGhpcy5ydWxlfWBcblx0XHRcdFx0KTtcblx0XHRyZXR1cm4gYCR7cnVsZX0ke3RoaXMub3B0aW9uYWwgPyAnKicgOiAnKyd9YDtcblx0fVxufVxuXG5cbi8vIExpc3QgbWF0Y2ggcnVsZTogICBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAuIGVnXCIgYFt7bnVtYmVyfSxdYCB0byBtYXRjaCBgMSwyLDNgXG4vL1x0YHJ1bGUuaXRlbWAgaXMgdGhlIHJ1bGUgZm9yIGVhY2ggaXRlbSxcbi8vXHRgcnVsZS5kZWxpbWl0ZXJgIGlzIHRoZSBkZWxpbWl0ZXIgYmV0d2VlbiBlYWNoIGl0ZW0uXG4vLyBcdGBydWxlLm1hdGNoZWRgIGluIHRoZSBvdXRwdXQgaXMgdGhlIGxpc3Qgb2YgdmFsdWVzLlxuLy9cbi8vXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhIExpc3QgcnVsZSB3aWxsIE5PVCByZXBlYXQgKD8/Pz8pXG5SdWxlLkxpc3QgPSBjbGFzcyBMaXN0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCBzdHJlYW1dKTtcblx0XHR9XG5cblx0XHQvLyBlbnN1cmUgaXRlbSBhbmQgZGVsaW1pdGVyIGFyZSBvcHRpb25hbCBzbyB3ZSBkb24ndCBiYXJmIGluIGBwYXJzZVJ1bGVgXG5cdFx0dGhpcy5pdGVtLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR0aGlzLmRlbGltaXRlci5vcHRpb25hbCA9IHRydWU7XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHQvLyBnZXQgbmV4dCBpdGVtLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGl0ZW0gPSB0aGlzLml0ZW0ucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdG1hdGNoZWQucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghZGVsaW1pdGVyKSBicmVhaztcblx0XHRcdG5leHQgPSBkZWxpbWl0ZXIubmV4dCgpO1xuXHRcdH1cblxuXHRcdC8vIElmIHdlIGRpZG4ndCBnZXQgYW55IG1hdGNoZXMsIGZvcmdldCBpdC5cblx0XHRpZiAobWF0Y2hlZC5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogbWF0Y2hlZFswXSA/IG1hdGNoZWRbMF0uc3RhcnRJbmRleCA6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIG1hdGNoZWQgaXRlbSBieSBpbmRleFxuXHRnZXRJdGVtKGluZGV4KSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZFtpbmRleF07XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XHRcdC8vIFRPRE86IHRocm93Pz8/XG5cdFx0bGV0IG1hdGNoZWQgPSB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC50b1NvdXJjZShjb250ZXh0KSApLmpvaW4oXCIsIFwiKTtcblx0XHRyZXR1cm4gYFske21hdGNoZWR9XWA7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYFske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMuaXRlbX0gJHt0aGlzLmRlbGltaXRlcn1dJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGUuanMiLCIvLyBTcGVsbCBcIkVuZ2xpc2hcIiBwYXJzZXIgc3RyYXdtYW5cblxuLy8gVE9ETzpcdGB0ZXN0YCBmdW5jdGlvbiBmb3IgcXVpY2sgbm8tZ29vZCBoaXQgb24gYHthfSBibGFoIGJsYWgge2J9YD9cbi8vIFRPRE86XHR0aGlzIGRvZXNuJ3Qgd29yazogICBge2V4cHJlc3Npb259IGlzIHtleHByZXNzaW9ufWBcbi8vIFRPRE86XHRicmVhayBgZmlsZWAgaW50byBsaW5lcyBhbmQgcHJvY2VzcyBlYWNoIChpbmNsLiBzdWJzdHIvbWF0Y2ggbm90IGdvaW5nIGJleW9uZCB0aGUgZW5kKVxuLy8gVE9ETzpcdG5lc3RpbmcgLS0gaXMgdGhpcyBqdXN0IGluZGVudCA9IFwiYWRkIGJsb2NrIHNjb3BlXCJcbi8vIFRPRE86XHRwcm9tb3Rpb24gcGF0dGVybiBmb3IgZ2F0aGVyIGFyZ3VtZW50cyAoZWc6IGxpdGVyYWwtbGlzdCkgPz8/XG4vLyBUT0RPOlx0V2hhdCBkb2VzIHN5bnRheCB0cmVlIGxvb2sgbGlrZT8gIEhvdyBkbyB3ZSBleHRyYWN0IG1lYW5pbmcgb3V0IG9mIHRoZSBuZXN0P1xuLy8gVE9ETzpcdFBhc3MgYGNvbnRleHRgIHRvIHRvU291cmNlKCksIGFkZCBwcm9wZXJ0eSBkZXNjcmlwdG9ycyB0byBgY2xhc3NgLCB2YXJpYWJsZXMgYW5kIGNvZGUgdG8gYG1ldGhvZGAsIGBnbG9iYWxgIHN0dWZmIGV0Y1xuXG5pbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIEdSUlIuLi4gd2lsbCBTT01FT05FIG9uIHRoZSBub2RlIHRlYW0gcGxlYXNlIGltcGxlbWVudCBjb25zb2xlLmdyb3VwID8/P1xuaWYgKCFjb25zb2xlLmdyb3VwKSBjb25zb2xlLmdyb3VwID0gY29uc29sZS5sb2c7XG5pZiAoIWNvbnNvbGUuZ3JvdXBFbmQpIGNvbnNvbGUuZ3JvdXBFbmQgPSBjb25zb2xlLmxvZztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblx0Ly8gU2V0IHRvIGB0cnVlYCB0byBvdXRwdXQgZGVidWcgaW5mbyB3aGlsZSBhZGRpbmcgcnVsZXNcblx0c3RhdGljIERFQlVHID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cblx0XHQvLyBDbG9uZSBydWxlcywgc3RhcnRpbmcgd2l0aCBhIGNvbXBsZXRlbHkgZW1wdHkgbWFwIGlmIG5vdCBkZWZpbmVkIChubyBzdGFuZGFyZCBvYmplY3Qga2V5cylcblx0XHR0aGlzLnJ1bGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnJ1bGVzIHx8IG51bGwpO1xuXHR9XG5cblx0Z2V0UnVsZShuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXNbbmFtZV07XG5cdH1cblxuXHRnZXRSdWxlT3JEaWUobmFtZSwgcHJvcGVydHlOYW1lKSB7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUobmFtZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYCR7cHJvcGVydHlOYW1lfSBydWxlICcke25hbWV9JyBub3QgZm91bmRgKTtcblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG4vL1xuLy8jIyMgUGFyc2luZ1xuLy9cblx0Ly8gUGFyc2Ugc29tZXRoaW5nOlxuXHQvL1x0LSBpZiBvbmUgc3RyaW5nIGFyZ3VtZW50LCBkb2VzIGEgYHBhcnNlU3RhdGVtZW50KClgXG5cdC8vXHQtIGlmIHR3bywgZG9lcyBhIGBwYXJzZVJ1bGUoKWBcblx0Ly8gUmV0dXJucyBgcGFyc2UudG9TdHJpbmcoKWAgb3IgdGhyb3dzLlxuLy9URVNUTUVcblx0Y29tcGlsZSgpIHtcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0bGV0IHN0cmluZyA9IGFyZ3VtZW50c1swXTtcblx0XHRcdHJldHVybiB0aGlzLmNvbXBpbGVTdGF0ZW1lbnRzKHN0cmluZyk7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcblx0XHRcdGxldCBuYW1lID0gYXJndW1lbnRzWzBdLCBzdHJpbmcgPSBhcmd1bWVudHNbMV07XG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5wYXJzZShuYW1lLCBzdHJpbmcpO1xuXHRcdFx0aWYgKCFyZXN1bHQpIHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2VyLnBhcnNlKCcke25hbWV9JywgJyR7c3RyaW5nfScpOiBjYW4ndCBwYXJzZSB0aGlzYCk7XG5cdFx0XHRyZXR1cm4gcmVzdWx0LnRvU291cmNlKCk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKFwicGFyc2VyLnBhcnNlKCk6IGV4cGVjdHMgb25lIG9yIHR3byBhcmd1bWVudHNcIik7XG5cdFx0fVxuXHR9XG5cblx0Ly8gUGFyc2UgYG5hbWVgZCBydWxlIGF0IGhlYWQgb2YgYHN0cmVhbWAgKGBzdHJpbmdgIG9yIGBUZXh0U3RyZWFtYCkuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cbi8vVEVTVE1FXG5cdHBhcnNlKG5hbWUsIHN0cmVhbSkge1xuXHRcdGlmICh0eXBlb2Ygc3RyZWFtID09PSBcInN0cmluZ1wiKSBzdHJlYW0gPSBuZXcgVGV4dFN0cmVhbShzdHJlYW0pO1xuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZXIucGFyc2UoJHtuYW1lfSk6IFJ1bGUgbm90IGZvdW5kYCk7XG5cdFx0c3RyZWFtID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJ1bGUucGFyc2UodGhpcywgc3RyZWFtKTtcblx0fVxuXG5cdC8vIFBhcnNlIGEgc2V0IG9mIHN0YXRlbWVudHMgbGluZS1ieS1saW5lLlxuLy9URVNUTUVcblx0Y29tcGlsZVN0YXRlbWVudHMoc3RhdGVtZW50cykge1xuXHRcdGNvbnNvbGUudGltZShcInBhcnNlU3RhdGVtZW50c1wiKTtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdGxldCBjdXJyZW50SW5kZW50ID0gMDtcblx0XHRjb25zdCB0YWJzID0gXCJcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcIjtcblx0XHRzdGF0ZW1lbnRzLnNwbGl0KC9cXG4vZykuZm9yRWFjaChzdGF0ZW1lbnQgPT4ge1xuXHRcdFx0Ly8gc2tpcCBsaW5lcyB0aGF0IGFyZSBhbGwgd2hpdGVzcGFjZVxuXHRcdFx0aWYgKHN0YXRlbWVudC50cmltKCkgPT09IFwiXCIpIHtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKFwiXCIpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGZpZ3VyZSBvdXQgaW5kZW50IGxldmVsIG9mIHRoaXMgbGluZVxuXHRcdFx0bGV0IGxpbmVTdGFydCA9IHN0YXRlbWVudC5tYXRjaCgvXlxcdCovKVswXTtcblx0XHRcdGxldCBsaW5lSW5kZW50ID0gbGluZVN0YXJ0Lmxlbmd0aDtcblx0XHRcdGlmIChsaW5lSW5kZW50ID4gY3VycmVudEluZGVudCkge1xuXHRcdFx0XHQvLyBhZGQgdG8gZW5kIG9mIHByZXZpb3VzIGxpbmUgaWYgcG9zc2libGVcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoKSByZXN1bHRzW3Jlc3VsdHMubGVuZ3RoIC0gMV0gKz0gXCIge1wiO1xuXHRcdFx0XHRlbHNlIHJlc3VsdHMucHVzaCh0YWJzLnN1YnN0cigwLCBsaW5lSW5kZW50LTEpICsgXCJ7XCIpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAobGluZUluZGVudCA8IGN1cnJlbnRJbmRlbnQpIHtcblx0XHRcdFx0bGV0IGNsb3NlcnMgPSBbXTtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IGN1cnJlbnRJbmRlbnQ7IGkgPiBsaW5lSW5kZW50OyBpLS0pIHtcblx0XHRcdFx0XHRjbG9zZXJzLnB1c2godGFicy5zdWJzdHIoMCwgaS0xKSArIFwifVwiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBwdXQgcGFyZW5zIEJFRk9SRSBhbnkgYmxhbmsgbGluZXMhXG5cdFx0XHRcdGxldCBsYXN0QmxhbmtMaW5lID0gdGhpcy5fZ2V0TGFzdEJsYW5rTGluZShyZXN1bHRzKTtcblx0XHRcdFx0cmVzdWx0cy5zcGxpY2UobGFzdEJsYW5rTGluZSwgMCwgLi4uY2xvc2Vycyk7XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50SW5kZW50ID0gbGluZUluZGVudDtcblxuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMucGFyc2UoXCJzdGF0ZW1lbnRcIiwgc3RhdGVtZW50KTtcbi8vVE9ETzogY29tcGxhaW4gaWYgY2FuJ3QgcGFyc2UgdGhlIGVudGlyZSBsaW5lIVxuXHRcdFx0aWYgKHJlc3VsdCkge1xuXHRcdFx0XHRsZXQgc291cmNlID0gcmVzdWx0LnRvU291cmNlKCkuc3BsaXQoXCJcXG5cIik7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChsaW5lU3RhcnQgKyBzb3VyY2Uuam9pbihcIlxcblwiICsgbGluZVN0YXJ0KSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiQ291bGRuJ3QgcGFyc2Ugc3RhdGVtZW50OlwiLCBzdGF0ZW1lbnQpO1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCJFUlJPUjogXCIrc3RhdGVtZW50KTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHdoaWxlIChjdXJyZW50SW5kZW50ID4gMCkge1xuXHRcdFx0cmVzdWx0cy5wdXNoKHRhYnMuc3Vic3RyKDAsIGN1cnJlbnRJbmRlbnQtMSkgKyBcIn1cIik7XG5cdFx0XHRjdXJyZW50SW5kZW50LS07XG5cdFx0fVxuXG5cdFx0Y29uc29sZS50aW1lRW5kKFwicGFyc2VTdGF0ZW1lbnRzXCIpO1xuXHRcdHJldHVybiByZXN1bHRzLmpvaW4oXCJcXG5cIik7XG5cdH1cblxuXHQvLyBGaWd1cmUgb3V0IHRoZSBsYXN0IGJsYW5rIGxpbmUgaW4gdGhlIHJlc3VsdHNcblx0X2dldExhc3RCbGFua0xpbmUocmVzdWx0cykge1xuXHRcdGZvciAobGV0IGkgPSByZXN1bHRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRpZiAocmVzdWx0c1tpXSA9PT0gXCJcIikgY29udGludWU7XG5cdFx0XHRyZXR1cm4gaSArIDE7XG5cdFx0fVxuXHRcdHJldHVybiAwO1xuXHR9XG5cblx0Ly8gRWF0IHdoaXRlc3BhY2UgKGFjY29yZGluZyB0byBgcnVsZXMud2hpdGVzcGFjZWApIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBuZXcgc3RyZWFtIGlmIHdlIG1hdGNoZWQgd2hpdGVzcGFjZSwgb3RoZXJ3aXNlIHRoZSBzYW1lIHN0cmVhbS5cblx0ZWF0V2hpdGVzcGFjZShzdHJlYW0pIHtcblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5ydWxlcy53aGl0ZXNwYWNlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiBzdHJlYW07XG5cdFx0cmV0dXJuIHN0cmVhbS5hZHZhbmNlQnkocmVzdWx0Lm1hdGNoZWQubGVuZ3RoKTtcblx0fVxuXG4vL1xuLy9cdFJ1bGVzXG4vL1xuXG5cdC8vIEFkZCBhIHJ1bGUgdG8gb3VyIGxpc3Qgb2YgcnVsZXMhXG5cdC8vIENvbnZlcnRzIHRvIGBhbHRlcm5hdGl2ZXNgIG9uIHJlLWRlZmluaW5nIHRoZSBzYW1lIHJ1bGUuXG5cdGFkZFJ1bGUobmFtZSwgcnVsZSkge1xuXHRcdC8vIGRvbid0IG92ZXJyaWRlIHJ1bGVOYW1lXG5cdFx0aWYgKCFydWxlLnJ1bGVOYW1lKSBydWxlLnJ1bGVOYW1lID0gbmFtZTtcblxuXHRcdGxldCBleGlzdGluZyA9IHRoaXMucnVsZXNbbmFtZV07XG5cdFx0aWYgKGV4aXN0aW5nKSB7XG5cdFx0XHRpZiAoIShleGlzdGluZyBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzKSkge1xuXHRcdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQ29udmVydGluZyBydWxlICcke25hbWV9JyB0byBhbHRlcm5hdGl2ZXNgKTtcblx0XHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVOYW1lOiBuYW1lLCBydWxlczogW2V4aXN0aW5nXSB9KTtcblx0XHRcdFx0Ly8gY29weSBhcmd1bWVudCBuYW1lIG92ZXIgKD8/Pylcblx0XHRcdFx0aWYgKGV4aXN0aW5nLmFyZ3VtZW50KSB0aGlzLnJ1bGVzW25hbWVdLmFyZ3VtZW50ID0gZXhpc3RpbmcuYXJndW1lbnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkaW5nIHJ1bGUgJyR7cnVsZS5ydWxlTmFtZX0nIHRvICcke25hbWV9JzogYCwgcnVsZSk7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdLmFkZFJ1bGUocnVsZSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IHJ1bGU7XG5cdFx0fVxuXG5cblx0XHQvLyBtYWtlIGEgbm90ZSBpZiB3ZSdyZSBhZGRpbmcgYSBsZWZ0LXJlY3Vyc2l2ZSBydWxlXG5cdFx0aWYgKHRoaXMucnVsZUlzTGVmdFJlY3Vyc2l2ZShuYW1lLCBydWxlKSkge1xuLy9jb25zb2xlLmluZm8oXCJtYXJraW5nIFwiLCBydWxlLCBcIiBhcyBsZWZ0IHJlY3Vyc2l2ZSFcIik7XG5cdFx0XHRydWxlLmxlZnRSZWN1cnNpdmUgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cblx0Ly8gSXMgdGhlIHNwZWNpZmllZCBydWxlIGxlZnQtcmVjdXJzaXZlP1xuXHRydWxlSXNMZWZ0UmVjdXJzaXZlKG5hbWUsIHJ1bGUpIHtcblx0XHRpZiAoIShydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSkpIHJldHVybiBmYWxzZTtcbi8vY29uc29sZS5sb2cobmFtZSwgcnVsZSk7XG5cdFx0Zm9yIChsZXQgc3VicnVsZSBvZiBydWxlLnJ1bGVzKSB7XG5cdFx0XHQvLyBpZ25vcmUgb3B0aW9uYWwgcnVsZXNcblx0XHRcdGlmIChzdWJydWxlLm9wdGlvbmFsKSBjb250aW51ZTtcblx0XHRcdGlmIChzdWJydWxlIGluc3RhbmNlb2YgUnVsZS5TdWJydWxlICYmIHN1YnJ1bGUucnVsZSA9PT0gbmFtZSkgcmV0dXJuIHRydWU7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cbi8vXG4vLyAjIyBVdGlsaXR5IG1ldGhvZHNcbi8vXG5cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmBcblx0Ly9cdGluIGFycmF5IG9mIGB0b2tlbnNgIChzdHJpbmdzKS5cblx0Ly8gSWYgc3VjY2Vzc2Z1bCwgcmV0dXJucyBgeyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2UgfWBcblx0Ly8gVGhyb3dzIGlmIHVuc3VjZXNzZnVsLlxuXHRzdGF0aWMgZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIHN0YXJ0VG9rZW4sIGVuZFRva2VuLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGlmICh0b2tlbnNbc3RhcnRJbmRleF0gIT09IHN0YXJ0VG9rZW4pIHRocm93IG5ldyBTeW50YXhFcnJvcihgRXhwZWN0ZWQgJyR7c3RhcnRUb2tlbn0nIGF0IGluZGV4ICR7c3RhcnRJbmRleH0gb2YgdG9rZW5zYCk7XG5cdFx0bGV0IG5lc3RpbmcgPSAwO1xuXHRcdGxldCBuZXN0ZWQgPSBmYWxzZTtcblx0XHRmb3IgKGxldCBlbmRJbmRleCA9IHN0YXJ0SW5kZXggKyAxLCBsYXN0SW5kZXggPSB0b2tlbnMubGVuZ3RoOyBlbmRJbmRleCA8IGxhc3RJbmRleDsgZW5kSW5kZXgrKykge1xuXHRcdFx0bGV0IHRva2VuID0gdG9rZW5zW2VuZEluZGV4XTtcblx0XHRcdGlmICh0b2tlbiA9PT0gc3RhcnRUb2tlbikge1xuXHRcdFx0XHRuZXN0aW5nKys7XG5cdFx0XHRcdG5lc3RlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodG9rZW4gPT09IGVuZFRva2VuKSB7XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKVxuXHRcdFx0XHRcdHJldHVybiB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZTogdG9rZW5zLnNsaWNlKHN0YXJ0SW5kZXgrMSwgZW5kSW5kZXgpLCBuZXN0ZWQgfTtcblx0XHRcdFx0bmVzdGluZy0tO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENvdWxkbid0IGZpbmQgbWF0Y2hpbmcgJyR7ZW5kVG9rZW59J3Mgc3RhcnRpbmcgYXQgaXRlbSAke3N0YXJ0SW5kZXh9YCk7XG5cdH1cblxuXG5cdC8vIExpc3Qgb2Ygc3BlY2lhbCBjaGFyYWN0ZXJzIGluIHJlZ3VsYXIgZXhwcmVzc2lvbnMuXG5cdC8vIFVzZWQgdG8gZXNjYXBlIHRob3NlIGNoYXJzIHdoZW4gY3JlYXRpbmcgcmVndWxhciBleHByZXNzaW9ucyBmcm9tIHN0cmluZ3MuXG5cdHN0YXRpYyBSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTID0gKGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IGNoYXJzID0ge307XG5cdFx0XCJcXFxcL14kKis/LigpfHt9LFtdXCIuc3BsaXQoXCJcIikuZm9yRWFjaChjaGFyID0+IGNoYXJzW2NoYXJdID0gdHJ1ZSk7XG5cdFx0cmV0dXJuIGNoYXJzO1xuXHR9KSgpXG5cblx0Ly8gR2l2ZW4gYSBcIm5vcm1hbFwiIGBzdHJpbmdgLCBlc2NhcGUgYW55IHJlZ3VsYXIgZXhwcmVzc2lvbiBzcGVjaWFsIGNoYXJhY3RlcnNcblx0Ly9cdHNvIHdlIGNhbiBjcmVhdGUgYSBgbmV3IFJlZ0V4cCgpYC5cblx0Ly8gQWxzbyBjb252ZXJ0cyBhIHNpbmdsZSBzcGFjZSB0byBhcmJpdHJhcnkgc2V0IG9mIHNwYWNlcyB3aXRoIFwiXFxzK1wiXG5cdHN0YXRpYyBlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZykge1xuXHRcdHJldHVybiBzdHJpbmcuc3BsaXQoXCJcIikubWFwKGZ1bmN0aW9uIChjaGFyLCBpbmRleCwgbGlzdCkge1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBiYWNrc2xhc2hcblx0XHRcdGlmIChjaGFyID09PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiO1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBzcGFjZVxuXHRcdFx0aWYgKGNoYXIgPT09IFwiIFwiKSByZXR1cm4gXCJcXFxccytcIjtcblx0XHRcdC8vIElmIGEgc3BlY2lhbCBjaGFyIGFuZCBwcmV2aW91cyBjaGFyYWN0ZXIgd2FzIG5vdCBhbiBlc2NhcGUsIGVzY2FwZSB0aGUgcmVzdWx0LlxuXHRcdFx0aWYgKFBhcnNlci5SRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTW2NoYXJdICYmIGxpc3RbaW5kZXgtMV0gIT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCIrY2hhcjtcblx0XHRcdC8vIFRoaXMgY2hhciBzaG91bGQgYmUgZmluZSBieSBpdHNlbGYuXG5cdFx0XHRyZXR1cm4gY2hhcjtcblx0XHR9KS5qb2luKFwiXCIpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgbmV3IHJlZ3VsYXIgZXhwcmVzc2lvbiBmcm9tIGEgXCJub3JtYWxcIiBzdHJpbmcsIGVzY2FwaW5nIHNwZWNpYWwgY2hhcmFjdGVycyBhcyBuZWNlc3NhcnkuXG5cdHN0YXRpYyBSZWdFeHBGcm9tU3RyaW5nKHN0cmluZywgZmxhZ3MpIHtcblx0XHRyZXR1cm4gbmV3IFJlZ0V4cChQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpLCBmbGFncyk7XG5cdH1cblxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUGFyc2VyLmpzIiwiLy9cbi8vXHQjIENvcmUgYHJ1bGVzYCAtLSBzaW1wbGUgZGF0YXR5cGVzLCBldGMuXG4vL1xuLy8gTk9URTogbWFueSBvZiB0aGUgYmVsb3cgYXJlIGNyZWF0ZWQgYXMgY3VzdG9tIFBhdHRlcm4gc3ViY2xhc3NlcyBmb3IgZGVidWdnaW5nLlxuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gYHdoaXRlc3BhY2VgIHJ1bGUuXG4vLyBOT1RFIGBwYXJzZXIucGFyc2VSdWxlKFwid2hpdGVzcGFjZVwiLCBcIiAgIFwiKWAgd2lsbCByZXR1cm4gYHVuZGVmaW5lZGBcbi8vXHRcdCBiZWNhdXNlIGBwYXJzZXIucGFyc2VSdWxlKClgIGF1dG9tYXRpY2FsbHkgZWF0cyB3aGl0ZXNwYWNlIGF0IHRoZSBzdGFydCBvZiBhIHJ1bGUuXG5SdWxlLldoaXRlc3BhY2UgPSBjbGFzcyB3aGl0ZXNwYWNlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9XG5wYXJzZXIuYWRkUnVsZShcIndoaXRlc3BhY2VcIiwgbmV3IFJ1bGUuV2hpdGVzcGFjZSh7IHBhdHRlcm46IC9cXHMrLywgb3B0aW9uYWw6IHRydWUgfSkpO1xuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5JZGVudGlmaWVyID0gY2xhc3MgaWRlbnRpZmllciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCBpZGVudGlmaWVyID0gcGFyc2VyLmFkZFJ1bGUoXCJpZGVudGlmaWVyXCIsIG5ldyBSdWxlLklkZW50aWZpZXIoe1xuXHRwYXR0ZXJuOiAvW2Etel1bXFx3XFwtXSovLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgaWRlbnRpZmllcik7XG5cbi8vIEFkZCBFbmdsaXNoIHByZXBvc2l0aW9ucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vXG4vLyBXaWtpcGVkaWEgXCJQcmVwb3NpdGlvblwiOlxuLy9cdFwiUHJlcG9zaXRpb25zLi4uYXJlIGEgY2xhc3Mgb2Ygd29yZHMgdGhhdFxuLy9cdGV4cHJlc3Mgc3BhdGlhbCBvciB0ZW1wb3JhbCByZWxhdGlvbnMgIChpbiwgdW5kZXIsIHRvd2FyZHMsIGJlZm9yZSlcbi8vXHRvciBtYXJrIHZhcmlvdXMgc2VtYW50aWMgcm9sZXMgKG9mLCBmb3IpLlxuLy8gVEVTVE1FXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhYm91dFwiLCBcImFib3ZlXCIsIFwiYWZ0ZXJcIiwgXCJhbmRcIiwgXCJhc1wiLCBcImF0XCIsXG5cdFwiYmVmb3JlXCIsIFwiYmVoaW5kXCIsIFwiYmVsb3dcIiwgXCJiZW5lYXRoXCIsIFwiYmVzaWRlXCIsIFwiYmV0d2VlblwiLCBcImJleW9uZFwiLCBcImJ5XCIsXG5cdFwiZGVmaW5lZFwiLCBcImRvd25cIiwgXCJkdXJpbmdcIixcblx0XCJlYWNoXCIsIFwiZW1wdHlcIiwgXCJleGFjdGx5XCIsIFwiZXhjZXB0XCIsXG5cdFwiZm9yXCIsIFwiZnJvbVwiLFxuXHRcImdyZWF0ZXJcIixcblx0XCJpblwiLCBcImludG9cIixcblx0XCJsZXNzXCIsIFwibG9uZ1wiLFxuXHRcIm1pbnVzXCIsIFwibW9yZVwiLFxuXHRcIm5lYXJcIiwgXCJub3RcIixcblx0XCJvZlwiLCBcIm9mZlwiLCBcIm9uXCIsIFwib250b1wiLCBcIm9wcG9zaXRlXCIsIFwib3V0XCIsIFwib3V0c2lkZVwiLCBcIm92ZXJcIixcblx0XCJzaG9ydFwiLCBcInNpbmNlXCIsXG5cdFwidGhhblwiLCBcInRoZVwiLCBcInRoZW5cIiwgXCJ0aHJvdWdoXCIsIFwidGhydVwiLCBcInRvXCIsIFwidG93YXJkXCIsIFwidG93YXJkc1wiLFxuXHRcInVuZGVmaW5lZFwiLCBcInVuZGVyXCIsIFwidW5kZXJuZWF0aFwiLCBcInVuaXF1ZVwiLCBcInVudGlsXCIsIFwidXBcIiwgXCJ1cG9uXCIsIFwidXBzaWRlXCIsXG5cdFwidmVyc3VzXCIsIFwidnNcIixcblx0XCJ3aXRoXCIsIFwid2l0aGluXCIsIFwid2l0aG91dFwiLFxuKTtcblxuLy8gQWRkIGNvbW1vbiBlbmdsaXNoIHZlcmJzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYXJlXCIsXG5cdFwiZG9cIiwgXCJkb2VzXCIsXG5cdFwiY29udGFpbnNcIixcblx0XCJoYXNcIiwgXCJoYXZlXCIsXG5cdFwiaXNcIixcblx0XCJyZXBlYXRcIixcblx0XCJ3YXNcIiwgXCJ3ZXJlXCJcbik7XG5cbi8vIEFkZCBzcGVjaWFsIGNvbnRyb2wga2V5d29yZHMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJlbHNlXCIsXG5cdFwiaWZcIixcblx0XCJvdGhlcndpc2VcIixcblx0XCJ3aGlsZVwiXG4pO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLlR5cGUgPSBjbGFzcyB0eXBlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJ0eXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvKFtBLVpdW1xcd1xcLV0qfHRleHR8bnVtYmVyfGludGVnZXJ8ZGVjaW1hbHxjaGFyYWN0ZXJ8Ym9vbGVhbikvLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0bGV0IHZhbHVlID0gdGhpcy5tYXRjaGVkO1xuXHRcdHN3aXRjaCh2YWx1ZSkge1xuXHRcdFx0Ly8gc3BlY2lhbCBjYXNlIHRvIHRha2UgdGhlIGZvbGxvd2luZyBhcyBsb3dlcmNhc2Vcblx0XHRcdGNhc2UgXCJ0ZXh0XCI6XHRcdHJldHVybiBcIlN0cmluZ1wiO1xuXHRcdFx0Y2FzZSBcImNoYXJhY3RlclwiOlx0cmV0dXJuIFwiQ2hhcmFjdGVyXCI7XG5cdFx0XHRjYXNlIFwibnVtYmVyXCI6XHRcdHJldHVybiBcIk51bWJlclwiO1xuXHRcdFx0Y2FzZSBcImludGVnZXJcIjpcdFx0cmV0dXJuIFwiSW50ZWdlclwiO1xuXHRcdFx0Y2FzZSBcImRlY2ltYWxcIjpcdFx0cmV0dXJuIFwiRGVjaW1hbFwiO1xuXHRcdFx0Y2FzZSBcImJvb2xlYW5cIjpcdFx0cmV0dXJuIFwiQm9vbGVhblwiO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIHZhbHVlLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdFx0fVxuXHR9XG59KSk7XG5cbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMudHlwZSk7XG5cblxuLy8gYG51bWJlcmAgYXMgZWl0aGVyIGZsb2F0IG9yIGludGVnZXIsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cblJ1bGUuTnVtYmVyID0gY2xhc3MgbnVtYmVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IG51bWJlciA9IHBhcnNlci5hZGRSdWxlKFwibnVtYmVyXCIsIG5ldyBSdWxlLk51bWJlcih7XG5cdHBhdHRlcm46IC8tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gbnVtYmVyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlRmxvYXQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBudW1iZXIpO1xuXG5cbi8vIE51bWVyaWMgYGludGVnZXJgIG9ubHksIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHRoaXMgV0lMTCBtYXRjaCBhIGZsb2F0LCBidXQgdGhlIHJldHVybmVkIHZhbHVlIHdpbGwgY29lcmNlIHRvIGFuIGludGVnZXIuXG4vLyBSRVZJRVc6IGlzIHRoaXMgcmlnaHQ/ICBCZXR0ZXIgdG8gbm90IG1hdGNoIGEgZmxvYXQ/XG5SdWxlLkludGVnZXIgPSBjbGFzcyBpbnRlZ2VyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJpbnRlZ2VyXCIsIG5ldyBSdWxlLkludGVnZXIoe1xuXHRwYXR0ZXJuOiAvLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbmxldCB0ZXh0ID0gcGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyBSdWxlLlRleHQoe1xuXHRwYXR0ZXJuOiAvKD86XCJbXlwiXSpcInwnW14nXSonKS9cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCB0ZXh0KTtcblxuXG4vLyBCb29sZWFuIGxpdGVyYWwsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFRPRE86IGJldHRlciBuYW1lIGZvciB0aGlzPz8/XG5SdWxlLkJvb2xlYW4gPSBjbGFzcyBib29sZWFuIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IGJvb2wgPSBwYXJzZXIuYWRkUnVsZShcImJvb2xlYW5cIiwgbmV3IFJ1bGUuQm9vbGVhbih7XG5cdHBhdHRlcm46IC8odHJ1ZXxmYWxzZXx5ZXN8bm98b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgYm9vbCk7XG4vLyBBZGQgYm9vbGVhbiB0b2tlbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcInRydWVcIiwgXCJmYWxzZVwiLFxuXHRcInllc1wiLCBcIm5vXCIsXG5cdFwib2tcIiwgXCJjYW5jZWxcIlxuKTtcblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxubGV0IGxpc3QgPSBwYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsX2xpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdGNsYXNzIGxpdGVyYWxfbGlzdCBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWYgKCFsaXN0KSByZXR1cm4gXCJbXVwiO1xuIFx0XHRcdHJldHVybiBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBQYXJlbnRoZXNpemVkIGV4cHJlc3Npb25cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwYXJlbnRoZXNpemVkX2V4cHJlc3Npb25cIixcblx0XCJcXFxcKHtleHByZXNzaW9ufVxcXFwpXCIsXG5cdGNsYXNzIHBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkWzFdO1xuXHRcdH1cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgZXhwcmVzc2lvbiA9IHRoaXMucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIGRvbid0IGRvdWJsZSBwYXJlbnMgaWYgbm90IG5lY2Vzc2FyeVxuXHRcdFx0aWYgKHR5cGVvZiBleHByZXNzaW9uID09PSBcInN0cmluZ1wiICYmIGV4cHJlc3Npb24uc3RhcnRzV2l0aChcIihcIikgJiYgZXhwcmVzc2lvbi5lbmRzV2l0aChcIilcIikpIHJldHVybiBleHByZXNzaW9uO1xuXHRcdFx0cmV0dXJuIGAoJHtleHByZXNzaW9ufSlgO1xuXHRcdH1cblx0fVxuKVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJcbi8vIFRPRE86IGNvbnZlcnQgdG8gbGluZS1hd2FyZSBzdHJlYW0/Pz9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRTdHJlYW0ge1xuXHQvLyBZb3UgY2FuIGNvbnN0cnVjdCB3aXRoIGEgdGV4dCBzdHJpbmcgb3IgYSBzZXQgb2YgcHJvcGVydGllcyAoaW5jbHVkaW5nIGB0ZXh0YCkuXG5cdGNvbnN0cnVjdG9yKC4uLnRleHRPclByb3BzKSB7XG5cdFx0dGV4dE9yUHJvcHMuZm9yRWFjaCgoYXJnKSA9PiB7XG5cdFx0XHRpZiAodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHR0aGlzLnRleHQgPSBhcmc7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChhcmcpIHtcblx0XHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBhcmcpO1xuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHQvLyBNYWtlIHN1cmUgYHRleHRgIGFuZCBgc3RhcnRJbmRleGAgYXJlIGRlZmluZWQuXG5cdFx0aWYgKCEoXCJ0ZXh0XCIgaW4gdGhpcykpIHRoaXMudGV4dCA9IFwiXCI7XG5cdFx0aWYgKCEoXCJzdGFydEluZGV4XCIgaW4gdGhpcykpIHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdH1cblxuXHQvLyBSZXR1cm4gYW4gaW1tdXRhYmxlIGNsb25lIG9mIHRoZSBzdHJlYW0uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0cmV0dXJuIG5ldyBUZXh0U3RyZWFtKHRoaXMsIHByb3BzKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2VkIHRvIG5ldyBzdGFydEluZGV4LlxuXHRhZHZhbmNlVG8oc3RhcnRJbmRleCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleCB9KTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2luZyBzdGFydEluZGV4IEJZIGBsZW5ndGhgXG5cdGFkdmFuY2VCeShsZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcblx0fVxuXG4vLyBcdC8vIFJldHVybiBjbG9uZSBvZiB0aGlzIHN0cmVhbSB3aXRoIGVuZEluZGV4IHNldCB0byBzdGFydCArIGBsZW5ndGhgXG4vLyBcdGVuZEFmdGVyKGxlbmd0aCkge1xuLy8gXHRcdHJldHVybiB0aGlzLmNsb25lKHsgZW5kSW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcbi8vIFx0fVxuXG4vL1xuLy8gIyMgTWF0Y2hpbmdcbi8vXG5cdC8vIE1hdGNoIGBwYXR0ZXJuYCBhcyByZWdleCBpbiB0aGlzIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBtYXRjaCBvciBgdW5kZWZpbmVkYC5cblx0Ly8gSWYgeW91IHdhbnQgdG8gdGVzdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmVhbSxcblx0Ly9cdG1ha2Ugc3VyZSB5b3VyIHJlZ2V4IHN0YXJ0cyB3aXRoIGBeYC5cblx0Ly8gVEVTVE1FOiB0aGlzIGxpa2VseSBicmVha3Mgd2l0aCBhIGBnYCBvbiB0aGUgcGF0dGVybj9cblx0bWF0Y2gocGF0dGVybikge1xuXHRcdGlmICghKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBUZXh0U3RyZWFtLm1hdGNoKCR7cGF0dGVybn0pOiBleHBlY3RlZCBSZWdFeHBgKTtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQubWF0Y2gocGF0dGVybikgfHwgdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGlzIHN0cmVhbSBJTkNMVURFIGEgcmVnZXggd2l0aGluIGl0P1xuXHQvLyBSZXR1cm5zIGB0cnVlYCBvciBgZmFsc2VgLlxuXHQvLyBOT1RFOiBQYXR0ZXJuIG11c3QgTk9UIHN0YXJ0IHdpdGggYF5gIGZvciB0aGlzIHRvIG1hdGNoIGluIHRoZSBtaWRkbGUgb2YgdGhlIHN0cmVhbS5cblx0dGVzdChwYXR0ZXJuKSB7XG5cdFx0cmV0dXJuIHBhdHRlcm4udGVzdCh0aGlzLmhlYWQpO1xuXHR9XG5cbi8vXG4vLyAjIyBSZWZsZWN0aW9uXG4vL1xuXHQvLyBSZXR1cm4gdGV4dCBvZiBzdHJpbmcgc3RhcnRpbmcgYXQgb3VyIGBzdGFydEluZGV4YFxuXHRnZXQgaGVhZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5yYW5nZSgpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgcmFuZ2Ugb2YgdGhlIHN0cmluZyBmcm9tIGBzdGFydEluZGV4YCB0byBgZW5kSW5kZXhgIE5PTi1pbmNsdXNpdmUuXG5cdHJhbmdlKHN0YXJ0SW5kZXggPSB0aGlzLnN0YXJ0SW5kZXgsIGVuZEluZGV4ID0gdGhpcy5lbmRJbmRleCB8fCB0aGlzLnRleHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5zdWJzdHJpbmcoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xuXHR9XG5cblx0Ly8gTGVuZ3RoIG9mIHRoZSBzdHJlYW0uXG5cdGdldCBsZW5ndGgoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5sZW5ndGg7XG5cdH1cblxuXHQvLyBBcmUgd2UgYXQgdGhlIGVuZCBvZiB0aGUgc3RyZWFtP1xuXHRnZXQgaXNFbXB0eSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGFydEluZGV4ID09PSB0aGlzLmxlbmd0aDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHRcblx0fTtcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9UZXh0U3RyZWFtLmpzIiwiaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGxvYWQgc3RhbmRhcmQgcnVsZXMgZmlsZXMgaGVyZVxuaW1wb3J0IFwiLi9jb3JlXCI7XG5pbXBvcnQgXCIuL251bWJlcnNcIjtcbmltcG9ydCBcIi4vb3BlcmF0b3JzXCI7XG5pbXBvcnQgXCIuL2lmXCI7XG5pbXBvcnQgXCIuL3N0YXRlbWVudHNcIjtcbmltcG9ydCBcIi4vdHlwZXNcIjtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9pbmRleC5qcyIsIi8vIE1lbW9pemUvZm9yZ2V0IHNlbWFudGljcy5cblxuLy8gUmV0dXJuIGEgbWVtb2l6aW5nIGdldHRlciBmdW5jdGlvbi5cbi8vIFRFU1RNRVxuZXhwb3J0IGZ1bmN0aW9uIG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0aGlzW3Byb3BlcnR5XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSBnZXR0ZXIuYXBwbHkodGhpcyk7XG5cdFx0XHRpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHQvLyBEZWZpbmUgc28gdGhhdCB3ZSBjYW4gYmUgZGVsZXRlZCBhbmQgcmUtZGVmaW5lZCwgYnV0IG5vdCBzZXQgb3IgZW51bWVyYXRlZC5cblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHByb3BlcnR5LCB7IHZhbHVlLCBjb25maWd1cmFibGU6IHRydWUgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzW3Byb3BlcnR5XTtcblx0fVxufVxuXG5cbi8vIFJldHVybiBhIG1lbW9pemUgZnVuY3Rpb24gZm9yIHVzZSBhcyBhIGdldHRlciBpbiBhIGBPYmplY3QuZGVmaW5lUHJvcGVydHkoKWBcbi8vIFRFU1RNRVxuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZU1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpIHtcblx0cmV0dXJuIHtcblx0XHRnZXQgOiBtZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKVxuXHR9XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvbWVtb2l6ZS5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImlmXCIsXG5cdFwiaWYge2V4cHJlc3Npb259ICh0aGVufDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgaWZfIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgaWYgKCR7ZXhwcmVzc2lvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0cmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSlgXG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImJhY2t3YXJkc19pZlwiLFxuXHRcIntzdGF0ZW1lbnR9IGlmIHtleHByZXNzaW9ufSAoZWxzZVBocmFzZTooZWxzZXxvdGhlcndpc2UpIHtzdGF0ZW1lbnR9KT9cIixcblx0Y2xhc3MgYmFja3dhcmRzX2lmIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCwgZWxzZVBocmFzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cdFx0XHRsZXQgZWxzZVN0YXRlbWVudCA9IGVsc2VQaHJhc2UgJiYgZWxzZVBocmFzZS5yZXN1bHRzLnN0YXRlbWVudC50b1NvdXJjZSgpO1xuXG5cdFx0XHRpZiAoZWxzZVN0YXRlbWVudCkgcmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfSBlbHNlIHsgJHtlbHNlU3RhdGVtZW50fSB9YFxuXHRcdFx0cmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImVsc2VfaWZcIixcblx0XCIoZWxzZXxvdGhlcndpc2UpIGlmIHtleHByZXNzaW9ufSAodGhlbnw6KSB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZWxzZV9pZiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0c3RhdGVtZW50ID0gc3RhdGVtZW50ID8gc3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpIDogdW5kZWZpbmVkO1xuXG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGVsc2UgaWYgKCR7ZXhwcmVzc2lvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0cmV0dXJuIGBlbHNlIGlmICgke2V4cHJlc3Npb259KWBcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZWxzZVwiLFxuXHRcIihlbHNlfG90aGVyd2lzZSkge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGVsc2VfIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0c3RhdGVtZW50ID0gc3RhdGVtZW50ID8gc3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpIDogdW5kZWZpbmVkO1xuXG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGVsc2UgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGVsc2VgXG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2lmLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWFsaW5nIHdpdGggbnVtYmVyc1xuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlXCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy8gVE9ETzogaWYgYGlkZW50aWZpZXJgIGlzIFwid29yZFwiLCBvdXRwdXQgYGdldFdvcmQoKWAgZXRjXG5jbGFzcyBpbmRleF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9ue1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IHsgaWRlbnRpZmllciwgbnVtYmVyLCBleHByZXNzaW9uIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0bnVtYmVyID0gbnVtYmVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdGlmICh0eXBlb2YgbnVtYmVyID09PSBcIm51bWJlclwiKSB7XG5cdFx0XHRpZiAobnVtYmVyID4gMCkge1xuXHRcdFx0XHRyZXR1cm4gYCR7ZXhwcmVzc2lvbn1bJHtudW1iZXIgLSAxfV1gO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJldHVybiBgc3BlbGwuZ2V0SXRlbSgke2V4cHJlc3Npb259LCAke251bWJlcn0pYDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGAke2V4cHJlc3Npb259WyR7bnVtYmVyfSAtIDFdYDtcblxuLy8gVGhpcyBpcyBzYWZlciwgYnV0IHVzaW5nIHRoZSBhYm92ZSBmb3IgZGVtbyBwdXJwb3Nlc1xuLy9cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7bnVtYmVyfSlgO1xuXHR9XG59XG5cbi8vIE51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmc6XG4vL1x0LSBgaXRlbSAxIG9mIC4uLmBcbi8vXHQtIGBpdGVtICMyIG9mIC4uLmBcbi8vIE5PVEU6IHRoZXNlIGluZGljZXMgYXJlIE9ORSBiYXNlZCwgTk9UIHplcm8gYmFzZWQgYXMgaXMgSmF2YXNjcmlwdC5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFwiaW5kZXhfZXhwcmVzc2lvblwiLCBcIntpZGVudGlmaWVyfSAoIyk/e251bWJlcjpleHByZXNzaW9ufSBvZiB7ZXhwcmVzc2lvbn1cIiwgaW5kZXhfZXhwcmVzc2lvbik7XG5cblxucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJmaXJzdFwiLCB7IHRvU291cmNlOiAoKSA9PiAxIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJzZWNvbmRcIiwgeyB0b1NvdXJjZTogKCkgPT4gMiB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwidGhpcmRcIiwgeyB0b1NvdXJjZTogKCkgPT4gMyB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZm91cnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDQgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImZpZnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDUgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInNpeHRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDYgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInNldmVudGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gNyB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZWlnaHRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDggfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcIm5pbnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDkgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInRlbnRoXCIsIHsgdG9Tb3VyY2U6ICgpID0+IDEwIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJwZW51bHRpbWF0ZVwiLCB7IHRvU291cmNlOiAoKSA9PiAtMiB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZmluYWxcIiwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImxhc3RcIiwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cbi8vIFRPRE86IHNpeHR5LWZpZnRoLCB0d28gaHVuZHJlZCBmb3J0eSBuaW50aC4uLlxuXG4vLyBBbHRlcm5hdGl2ZSBmb3JtIGZvciBudW1lcmljIGluZGV4IGluIGEgbGlzdC1saWtlIHRoaW5nLlxuLy8gTk9URTogZG9uJ3QgYWRkIGFzIGFuIGV4cHJlc3Npb24gc2luY2Ugd2UncmUgYXV0by1tZXJnZWQgd2l0aCBgaW5kZXhfZXhwcmVzc2lvbmAgYWJvdmUuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcImluZGV4X2V4cHJlc3Npb25cIiwgXCJ0aGUge251bWJlcjpvcmRpbmFsfSB7aWRlbnRpZmllcn0gb2Yge2V4cHJlc3Npb259XCIsIGluZGV4X2V4cHJlc3Npb24pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvbnVtYmVycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgaW5maXggYW5kIHByZWZpeCBvcGVyYXRvcnMuXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8jIyBJbmZpeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj4ge3Joc31gLCBlZzogYGEgaXMgMWBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgdHdvIGFyZ3VtZW50cyAoYGxoc2AgYW5kIGByaHNgKSBpbnRvIG91dHB1dC5cblxuLy8gTk9URTogYHByZWNlZGVuY2VgIG51bWJlcnMgY29tZSBmcm9tIEphdmFzY3JpcHQgZXF1aXZhbGVudHNcbi8vXHRcdCBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9PcGVyYXRvcnMvT3BlcmF0b3JfUHJlY2VkZW5jZVxuXG5jbGFzcyBpbmZpeF9vcGVyYXRvciBleHRlbmRzIFJ1bGUuQWx0ZXJuYXRpdmVzIHtcblxuLy8gTk9URTogRm9yIHRoZSBvcGVyYXRvcnMgdGhlbXNlbHZlcywgd2UgcmVhbGx5IHdhbnQgdG8ganVzdCB1c2UgbG9uZ2VzdCBtYXRjaC5cbi8vIFx0XHQgV2Ugd2FudCB0byBwdXNoIHRoZSBwcmVjZWRlbmNlIHVwIHRvIHRoZSBleHByZXNzaW9uIGFuZCBldmFsdWF0ZSBkaWZmZXJlbnQgZXhwcmVzc2lvbnMgYmFzZWQgb24gdGhhdC5cbi8vIFx0Ly8gRmluZCBiZXN0IG1hdGNoIGFjY29yZGluZyB0byBvcGVyYXRvciBwcmVjZWRlbmNlIGFzIGRlZmluZWQgYmVsb3cuXG4vLyBcdGdldEJlc3RNYXRjaChtYXRjaGVzKSB7XG4vLyBcdFx0Y29uc29sZS53YXJuKFwiR0JNXCIsIG1hdGNoZXMsIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLnByZWNlZGVuY2UpLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5tYXRjaGVkVGV4dCkpO1xuLy8gXHRcdHJldHVybiBtYXRjaGVzLnJlZHVjZShmdW5jdGlvbiAoYmVzdCwgbmV4dCkge1xuLy8gXHRcdFx0Ly8gdGFrZSBoaWdoZXN0IHByZWNlZGVuY2UgbWF0Y2ggZmlyc3Rcbi8vIFx0XHRcdGlmIChuZXh0LnByZWNlZGVuY2UgPiBiZXN0LnByZWNlZGVuY2UpIHJldHVybiBuZXh0O1xuLy8gXHRcdFx0Ly8gdGFrZSBsb25nZXN0IG1hdGNoIGlmIHNhbWUgcHJlY2VkZW5jZVxuLy8gXHRcdFx0aWYgKG5leHQucHJlY2VkZW5jZSA9PT0gYmVzdC5wcmVjZWRlbmNlKSB7XG4vLyBcdFx0XHRcdGlmIChuZXh0LmVuZEluZGV4ID4gYmVzdC5lbmRJbmRleCkgcmV0dXJuIG5leHQ7XG4vLyBcdFx0XHR9XG4vLyBcdFx0XHRyZXR1cm4gYmVzdDtcbi8vIFx0XHR9LCBtYXRjaGVzWzBdKTtcbi8vIFx0fVxufVxuXG5wYXJzZXIuYWRkUnVsZShcImluZml4X29wZXJhdG9yXCIsIG5ldyBpbmZpeF9vcGVyYXRvcigpKTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJhbmRcIiwgXCJhbmRcIiwgeyBwcmVjZWRlbmNlOiA2LCB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICYmICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcIm9yXCIsIFwib3JcIiwgeyBwcmVjZWRlbmNlOiA1LCB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9IHx8ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNcIiwgXCJpc1wiLCB7IHByZWNlZGVuY2U6IDEwLCB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX25vdFwiLCBcImlzIG5vdFwiLCB7IHByZWNlZGVuY2U6IDEwLCB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfZXhhY3RseVwiLCBcImlzIGV4YWN0bHlcIiwgeyBwcmVjZWRlbmNlOiAxMCwgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90X2V4YWN0bHlcIiwgXCJpcyBub3QgZXhhY3RseVwiLCB7IHByZWNlZGVuY2U6IDEwLCB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9PSAke2J9KWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5pc09mVHlwZSh0aGluZywgdHlwZSlgXG4vL1RPRE86IGBpcyBzYW1lIHR5cGUgYXNgID9cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfdHlwZV9vZlwiLCBbXCJpcyBhXCIsIFwiaXMgYW5cIl0sIHsgcHJlY2VkZW5jZTogMTEsIHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGBzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RfdHlwZV9vZlwiLCBbXCJpcyBub3QgYVwiLCBcImlzIG5vdCBhblwiXSwgeyBwcmVjZWRlbmNlOiAxMSwgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfX0pO1xuXG4vL1RPRE86IGBzcGVsbC5jb250YWlucyhjb2xsZWN0aW9uLCB0aGluZylgXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX2luXCIsIFtcImlzIGluXCIsIFwiaXMgb25lIG9mXCJdLCB7IHByZWNlZGVuY2U6IDExLCB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90X2luXCIsIFtcImlzIG5vdCBpblwiLCBcImlzIG5vdCBvbmUgb2ZcIl0sIHsgcHJlY2VkZW5jZTogMTEsIHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH19KTtcbi8vVEVTVE1FXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImluY2x1ZGVzXCIsIFtcImluY2x1ZGVzXCIsIFwiY29udGFpbnNcIl0sIHsgcHJlY2VkZW5jZTogMTEsIHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJkb2VzbnRfaW5jbHVkZVwiLCBbXCJkb2VzIG5vdCBpbmNsdWRlXCIsIFwiZG9lc250IGluY2x1ZGVcIiwgXCJkb2VzIG5vdCBjb250YWluXCIsIFwiZG9lc250IGNvbnRhaW5cIl0sIHsgcHJlY2VkZW5jZTogMTEsIHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfX0pO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0XCIsIFtcIj5cIiwgXCJpcyBncmVhdGVyIHRoYW5cIl0sIHsgcHJlY2VkZW5jZTogMTEsIHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImd0ZVwiLCBbXCI+PVwiLCBcImlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0b1wiXSwgeyBwcmVjZWRlbmNlOiAxMSwgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0XCIsIFtcIjxcIiwgXCJpcyBsZXNzIHRoYW5cIl0sIHsgcHJlY2VkZW5jZTogMTEsIHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImx0ZVwiLCBbXCI8PVwiLCBcImlzIGxlc3MgdGhhbiBvciBlcXVhbCB0b1wiXSwgeyBwcmVjZWRlbmNlOiAxMSwgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9fSk7XG5cbi8vVE9ETzogIGNhbid0IGFkZCBgK2AgYXMgYSBydWxlLCBmaXggdGhpcyB0aGVuIGFkZCB0aGVzZVxuLy9UT0RPOiAgb3BlcmF0b3IgcHJlY2VkZW5jZT8/P1xuLy9URVNUTUVcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwicGx1c1wiLCBbXCJcXFxcK1wiLCBcInBsdXNcIl0sIHsgcHJlY2VkZW5jZTogMTMsIHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJtaW51c1wiLCBbXCItXCIsIFwibWludXNcIl0sIHsgcHJlY2VkZW5jZTogMTMsIHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJ0aW1lc1wiLCBbXCJcXFxcKlwiLCBcInRpbWVzXCJdLCB7IHByZWNlZGVuY2U6IDE0LCB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZGl2aWRlZF9ieVwiLCBbXCIvXCIsIFwiZGl2aWRlZCBieVwiXSwgeyBwcmVjZWRlbmNlOiAxNCwgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLyAke2J9YCB9fSk7XG5cbi8vVE9ETzogIGArPWAgZXRjPyAgb3RoZXIgbWF0aCBmdW5jdGlvbnM/XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImluZml4X29wZXJhdG9yX2V4cHJlc3Npb25cIixcblx0XCJ7bGhzOmV4cHJlc3Npb259IHtvcGVyYXRvcjppbmZpeF9vcGVyYXRvcn0ge3JoczpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0ZXN0UnVsZSA9IFwiaW5maXhfb3BlcmF0b3JcIjtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxocywgcmhzLCBvcGVyYXRvciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIG9wZXJhdG9yLnRvSlMobGhzLnRvU291cmNlKGNvbnRleHQpLCByaHMudG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8jIyBQb3N0aWZ4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPmAsIGUuZy4gYGEgaXMgZGVmaW5lZGBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgYXJndW1lbnQgKGBsaHNgKSBpbnRvIEpTIG91dHB1dC5cblxucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX2RlZmluZWRcIiwgXCJpcyBkZWZpbmVkXCIsIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gIT09ICd1bmRlZmluZWQnKWAgfX0pO1xucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX25vdF9kZWZpbmVkXCIsIFtcImlzIG5vdCBkZWZpbmVkXCIsIFwiaXMgdW5kZWZpbmVkXCJdLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH19KTtcblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkUG9zdGZpeE9wZXJhdG9yKFwiaXNfZW1wdHlcIiwgXCJpcyBlbXB0eVwiLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX25vdF9lbXB0eVwiLCBcImlzIG5vdCBlbXB0eVwiLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAhc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicG9zdGZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2V4cHJlc3Npb259IHtvcGVyYXRvcjpwb3N0Zml4X29wZXJhdG9yfVwiLFxuXHRjbGFzcyBwb3N0Zml4X29wZXJhdG9yX2V4cHJlc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dGVzdFJ1bGUgPSBcInBvc3RmaXhfb3BlcmF0b3JcIjtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBvcGVyYXRvciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIG9wZXJhdG9yLnRvSlMoZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFRPRE86IHRoaXMgc2hvdWxkIHJlYWxseSBiZSBhIGdlbmVyYWwgXCJleHByZXNzaW9uXCIuLi5cbi8vcGFyc2VyLmFkZFN5bnRheChcIm9wZXJhdG9yX2V4cHJlc3Npb25cIiwgXCIoZXhwcmVzc2lvbjp7cG9zdGZpeF9vcGVyYXRvcl9leHByZXNzaW9ufXx7aW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvbn0pXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuaW1wb3J0IFwiLi9jb3JlXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy9cbi8vXHQjIyBSZXR1cm5zXG4vL1xuXG4vLyBSZXR1cm4gYSB2YWx1ZVxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJyZXR1cm5fc3RhdGVtZW50XCIsIFwicmV0dXJuIHtleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByZXR1cm5fc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBgcmV0dXJuICR7ZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KX1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vXG4vL1x0IyMgQXNzaWdubWVudFxuLy9cbmNsYXNzIGFzc2lnbm1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCB7IHRoaW5nLCB2YWx1ZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdGlmICh0aGluZyBpbnN0YW5jZW9mIFJ1bGUuSWRlbnRpZmllcikge1xuXHRcdFx0Ly8gVE9ETzogZGVjbGFyZSBpZGVudGlmaWVyIGlmIG5vdCBpbiBzY29wZSwgZXRjXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGAke3RoaW5nLnRvU291cmNlKGNvbnRleHQpfSA9ICR7dmFsdWUudG9Tb3VyY2UoY29udGV4dCl9YDtcblx0fVxufVxuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJ7dGhpbmc6ZXhwcmVzc2lvbn0gPSB7dmFsdWU6ZXhwcmVzc2lvbn1cIiwgYXNzaWdubWVudCk7XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIiwgXCJzZXQge3RoaW5nOmV4cHJlc3Npb259IHRvIHt2YWx1ZTpleHByZXNzaW9ufVwiLCBhc3NpZ25tZW50KTtcblxuXG4vL1xuLy9cdCMjIFVzZXIgaW50ZXJhY3Rpb25cbi8vXG5cbi8vIEFsZXJ0IGEgbWVzc2FnZS5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYWxlcnRcIiwgXCJhbGVydCB7bWVzc2FnZTpleHByZXNzaW9ufSAoYnV0dG9uQ2xhdXNlOndpdGgge3RleHR9KT9cIixcblx0Y2xhc3MgYWxlcnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgYnV0dG9uQ2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBidXR0b25OYW1lID0gYnV0dG9uQ2xhdXNlID8gYnV0dG9uQ2xhdXNlLnJlc3VsdHMudGV4dC50b1NvdXJjZShjb250ZXh0KSA6ICdcIk9LXCInO1xuXHRcdFx0cmV0dXJuIGBhd2FpdCBzcGVsbC5hbGVydCgke21lc3NhZ2V9LCAke2J1dHRvbk5hbWV9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBXYXJuaW5nIG1lc3NhZ2UgLS0gbGlrZSBhbGVydCBidXQgZmFuY2llci5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwid2FyblwiLCBcIndhcm4ge2V4cHJlc3Npb246ZXhwcmVzc2lvbn0gKGJ1dHRvbkNsYXVzZTp3aXRoIHt0ZXh0fSk/XCIsXG5cdGNsYXNzIHdhcm4gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgYnV0dG9uQ2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBidXR0b25OYW1lID0gYnV0dG9uQ2xhdXNlID8gYnV0dG9uQ2xhdXNlLnJlc3VsdHMudGV4dC50b1NvdXJjZShjb250ZXh0KSA6ICdcIk9LXCInO1xuXHRcdFx0cmV0dXJuIGBhd2FpdCBzcGVsbC53YXJuKCR7bWVzc2FnZX0sICR7YnV0dG9uTmFtZX0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gQ29uZmlybSBtZXNzYWdlIC0tIHByZXNlbnQgYSBxdWVzdGlvbiB3aXRoIHR3byBhbnN3ZXJzLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJjb25maXJtXCIsIFwiY29uZmlybSB7bWVzc2FnZTpleHByZXNzaW9ufSAoYnV0dG9uQ2xhdXNlOndpdGgge29rQnV0dG9uOnRleHR9IChjYW5jZWxDbGF1c2U6IChhbmR8b3IpIHtjYW5jZWxCdXR0b246dGV4dH0pPyApP1wiLFxuXHRjbGFzcyBjb25maXJtIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG1lc3NhZ2UsIGJ1dHRvbkNsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bWVzc2FnZSA9IG1lc3NhZ2UudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgb2tCdXR0b24gPSAnXCJPS1wiJywgY2FuY2VsQnV0dG9uID0gJ1wiQ2FuY2VsXCInO1xuXG5cdFx0XHRpZiAoYnV0dG9uQ2xhdXNlKSB7XG5cdFx0XHRcdG9rQnV0dG9uID0gYnV0dG9uQ2xhdXNlLnJlc3VsdHMub2tCdXR0b24ucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0bGV0IGNhbmNlbENsYXVzZSA9IGJ1dHRvbkNsYXVzZS5yZXN1bHRzLmNhbmNlbENsYXVzZTtcblx0XHRcdFx0aWYgKGNhbmNlbENsYXVzZSkgY2FuY2VsQnV0dG9uID0gY2FuY2VsQ2xhdXNlLnJlc3VsdHMuY2FuY2VsQnV0dG9uLnJlc3VsdHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLmNvbmZpcm0oJHttZXNzYWdlfSwgJHtva0J1dHRvbn0sICR7Y2FuY2VsQnV0dG9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vLyBERUFEIFNJTVBMRSBQTFVSQUxJWkVSLi4uIFJFQUxMWSBOT1QgVkVSWSBHT09EXG5mdW5jdGlvbiBwbHVyYWxpemUod29yZCkge1xuXHRyZXR1cm4gd29yZCArIFwic1wiO1xufVxuXG5cbi8vVEVTVE1FXG4vL01PVkUgVE8gYG9iamVjdHNgP1xuLy8gUHJvcGVydGllcyBjbGF1c2U6IGNyZWF0ZXMgYW4gb2JqZWN0IHdpdGggb25lIG9yIG1vcmUgcHJvcGVydHkgdmFsdWVzLlxuLy9cdGBmb28gPSAxLCBiYXIgPSAyYFxuLy9UT0RPOiB3b3VsZCBsaWtlIHRvIHVzZSBgYW5kYCBidXQgdGhhdCB3aWxsIGJhcmYgb24gZXhwcmVzc2lvbnMuLi5cbi8vVE9ETzogaG93IHRvIGRvIHByb3BlcnRpZXMgb24gbXVsdGlwbGUgbGluZXM/XG5wYXJzZXIuYWRkTGlzdChcblx0XCJvYmplY3RfbGl0ZXJhbFwiLFxuXHRcIlsoe2lkZW50aWZpZXJ9ID0ge2V4cHJlc3Npb259KSAsXVwiLFxuXHRjbGFzcyBvYmplY3RfbGl0ZXJhbCBleHRlbmRzIFJ1bGUuTGlzdCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHByb3BzID0gdGhpcy5yZXN1bHRzLm1hdGNoZWQubWFwKGZ1bmN0aW9uIChwcm9wKSB7XG5cdFx0XHRcdFx0bGV0IHsgaWRlbnRpZmllciwgZXhwcmVzc2lvbiB9ID0gcHJvcC5yZXN1bHRzO1xuXHRcdFx0XHRcdGxldCBrZXkgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0XHRcdGxldCB2YWx1ZSA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRcdFx0cmV0dXJuIGBcIiR7a2V5fVwiOiAke3ZhbHVlfWBcblx0XHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYHsgJHtwcm9wcy5qb2luKFwiLCBcIil9IH1gO1xuXHRcdH1cblx0fVxuKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMub2JqZWN0X2xpdGVyYWwpO1xuXG5cbi8vVEVTVE1FXG4vL01PVkUgVE8gYGZ1bmN0aW9uc2A/XG4vLyBBcmd1bWVudHMgY2xhdXNlIGZvciBtZXRob2RzXG4vL1x0YHdpdGggZm9vYCBvciBgd2l0aCBmb28gYW5kIGJhciBhbmQgYmF6YFxuLy9UT0RPOiB7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cdD0+IHJlcXVpcmVzIGAsYCBpbnN0ZWFkIG9mIGBhbmRgXG4vL1RPRE86IGB3aXRoIGZvbyBhcyBUeXBlYFxuLy9UT0RPOlx0YHdpdGggZm9vLi4uYCBmb3Igc3BsYXQ/XG5wYXJzZXIuYWRkU3ludGF4KFxuXHRcImFyZ3NDbGF1c2VcIixcblx0XCJ3aXRoIFthcmdzOntpZGVudGlmaWVyfSBhbmRdXCIsXG5cdGNsYXNzIGFyZ3NDbGF1c2UgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHQvLyBSZXR1cm4ganVzdCB0aGUgYXJndW1lbnRzIGFzIHRoZSByZXN1bHRzXG5cdFx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0XHRyZXR1cm4gc3VwZXIucmVzdWx0cy5hcmdzO1xuXHRcdH1cblxuXHRcdC8vIFJldHVybiBqdXN0IHRoZSBhcmd1bWVudCBuYW1lcyBhcyBhbiBhcnJheVxuXHRcdGdldCBhcmdOYW1lcygpIHtcblx0XHRcdHJldHVybiB0aGlzLnJlc3VsdHMubWF0Y2hlZC5tYXAoYXJnID0+IGFyZy5tYXRjaGVkKTtcblx0XHR9XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5hcmdOYW1lcy5qb2luKFwiLCBcIik7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gVEVTVE1FXG4vLyBEZWZpbmUgY2xhc3MuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlZmluZV90eXBlXCIsXG5cdFwiZGVmaW5lIHR5cGUge3R5cGV9IChleHRlbmRzQ2xhdXNlOmFzIChhfGFuKSB7c3VwZXJUeXBlOnR5cGV9KT9cIixcblx0Y2xhc3MgZGVmaW5lX3R5cGUgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdHlwZSwgZXh0ZW5kc0NsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0dHlwZSA9IHR5cGUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgc3VwZXJUeXBlID0gZXh0ZW5kc0NsYXVzZSAmJiBleHRlbmRzQ2xhdXNlLnJlc3VsdHMuc3VwZXJUeXBlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0aWYgKHN1cGVyVHlwZSkge1xuXHRcdFx0XHRyZXR1cm4gYGNsYXNzICR7dHlwZX0gZXh0ZW5kcyAke3N1cGVyVHlwZX1gO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGBjbGFzcyAke3R5cGV9YDtcblxuXHRcdH1cblx0fVxuKTtcblxuLy9UT0RPOiBjb25zdHJ1Y3RvclxuXG4vL1RFU1RNRVxuLy8gYG5ld2Bcbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGFsbCB0eXBlcyB0YWtlIGFuIG9iamVjdCBvZiBwcm9wZXJ0aWVzPz8/P1xucGFyc2VyLmFkZFN5bnRheChcblx0XCJuZXdfdGhpbmdcIixcblx0XCIoY3JlYXRlfG5ldykge3R5cGV9IChwcm9wc0NsYXVzZTp3aXRoIHtwcm9wczpvYmplY3RfbGl0ZXJhbH0pP1wiLFxuXHRjbGFzcyBuZXdfdGhpbmcgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBwcm9wc0NsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0dHlwZSA9IHR5cGUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgcHJvcHMgPSBwcm9wc0NsYXVzZSAmJiBwcm9wc0NsYXVzZS5yZXN1bHRzLnByb3BzLnRvU291cmNlKGNvbnRleHQpIHx8IFwiXCI7XG5cdFx0XHRyZXR1cm4gYG5ldyAke3R5cGV9KCR7cHJvcHN9KWA7XG5cdFx0fVxuXHR9XG4pO1xuLy8gVGhpcyB3b3JrcyBhcyBhbiBleHByZXNzaW9uIE9SIGEgc3RhdGVtZW50LlxucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHBhcnNlci5ydWxlcy5uZXdfdGhpbmcpO1xucGFyc2VyLmFkZFJ1bGUoXCJzdGF0ZW1lbnRcIiwgcGFyc2VyLnJ1bGVzLm5ld190aGluZyk7XG5cblxuLy8gVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfbWV0aG9kXCIsXG5cdFwiKHRvfG9uKSB7aWRlbnRpZmllcn0ge2FyZ3NDbGF1c2V9PyAoXFxcXDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZGVjbGFyZV9tZXRob2QgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJnc0NsYXVzZSwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGFyZ3MgPSAoYXJnc0NsYXVzZSAmJiBhcmdzQ2xhdXNlLnRvU291cmNlKGNvbnRleHQpKSB8fCBcIlwiO1xuXHRcdFx0c3RhdGVtZW50ID0gKHN0YXRlbWVudCA/IGAgeyAke3N0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KX0gfWAgOiBcIlwiKTtcblxuXHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pJHtzdGF0ZW1lbnR9YFxuXHRcdH1cblx0fVxuKTtcblxuLy8gVEVTVE1FXG4vLyBHZXR0ZXIgZWl0aGVyIHdpdGggb3Igd2l0aG91dCBhcmd1bWVudHMuXG4vLyBJZiB5b3Ugc3BlY2lmeSBhcmd1bWVudHMsIHlpZWxkcyBhIG5vcm1hbCBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGEgdmFsdWUuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImdldHRlclwiLFxuXHRcImdldCB7aWRlbnRpZmllcn0ge2FyZ3NDbGF1c2V9PyAoXFxcXDopPyB7WDpleHByZXNzaW9ufT9cIixcblx0Y2xhc3MgZ2V0dGVyIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3NDbGF1c2UsIGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGFyZ3MgPSBhcmdzQ2xhdXNlICYmIGFyZ3NDbGF1c2UudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRleHByZXNzaW9uID0gKGV4cHJlc3Npb24gPyBgIHsgcmV0dXJuICgke2V4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCl9KSB9YCA6IFwiXCIpO1xuXG5cdFx0XHRpZiAoYXJncyAmJiBleHByZXNzaW9uKSB7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KSR7ZXhwcmVzc2lvbn1gO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoYXJncykge1xuXHRcdFx0XHRyZXR1cm4gYCR7aWRlbnRpZmllcn0oJHthcmdzfSlgO1xuXG5cdFx0XHR9IGVsc2UgaWYgKGV4cHJlc3Npb24pIHtcblx0XHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSgpJHtleHByZXNzaW9ufWA7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gYGdldCAke2lkZW50aWZpZXJ9YDtcblx0XHRcdH1cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBURVNUTUVcbi8vIFNldHRlci5cbi8vIENvbXBsYWlucyBpZiB5b3Ugc3BlY2lmeSBtb3JlIHRoYW4gb25lIGFyZ3VtZW50LlxuLy8gSWYgeW91IGRvbid0IHBhc3MgYW4gZXhwbGljaXQgYXJndW1lbnQsIHdlJ2xsIGFzc3VtZSBpdCdzIHRoZSBzYW1lIGFzIHRoZSBpZGVudGlmaWVyLlxuLy8gZWc7XHRgc2V0IGNvbG9yOiBzZXQgdGhlIGNvbG9yIG9mIG15IHRleHQgdG8gY29sb3JgXG4vL1xuLy8gVE9ETzogaW50ZXJuYWwgZ2V0dGVyL3NldHRlciBzZW1hbnRpY3MgYWxhIG9iamVjdGl2ZSBDXG4vL1x0XHRcdGBzZXQgY29sb3I6IGlmIGNvbG9yIGlzIGluIFtcInJlZFwiLCBcImJsdWVcIl0gdGhlbiBzZXQgbXkgY29sb3IgdG8gY29sb3JgXG4vL1x0XHQgPT4gYG15IGNvbG9yYCB3aXRoaW4gc2V0dGVyIHNob3VsZCBhdXRvbWF0aWNhbGx5IHRyYW5zbGF0ZSB0byBgdGhpcy5fY29sb3JgID8/P1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJzZXR0ZXJcIixcblx0XCJzZXQge2lkZW50aWZpZXJ9IHthcmdzQ2xhdXNlfT8gKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGdldHRlciBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBhcmdzQ2xhdXNlLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXG5cdFx0XHQvLyBBc3N1bWUgd2Ugd2FudCB0aGUgc2FtZSBuYW1lIGFzIHRoZSBpZGVudGlmaWVyIGlmIG5vIGFyZ3VtZW5zXG5cdFx0XHRsZXQgYXJncyA9IChhcmdzQ2xhdXNlICYmIGFyZ3NDbGF1c2UuYXJnTmFtZXMpIHx8IFtpZGVudGlmaWVyXTtcblx0XHRcdC8vIENvbXBsYWluIGlmIG1vcmUgdGhhbiBvbmUgYXJndW1lbnRcblx0XHRcdGlmIChhcmdzLmxlbmd0aCA+IDEpXG5cdFx0XHRcdGNvbnNvbGUud2FybihcInBhcnNlKCdzZXR0ZXInKTogb25seSBvbmUgYXJndW1lbnQgYWxsb3dlZCBpbiBzZXR0ZXI6ICBcIiwgdGhpcy5tYXRjaGVkVGV4dCk7XG5cblx0XHRcdHN0YXRlbWVudCA9IChzdGF0ZW1lbnQgPyBgIHsgJHtzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCl9IH1gIDogXCJcIik7XG5cblx0XHRcdHJldHVybiBgc2V0ICR7aWRlbnRpZmllcn0oJHthcmdzWzBdfSkke3N0YXRlbWVudH1gO1xuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRkZWNsYXJlIHByb3BlcnRpZXNcbi8vXG5cbnBhcnNlci5hZGRTeW50YXgoXCJzY29wZV9tb2RpZmllclwiLCBcIihzY29wZTpnbG9iYWx8Y29uc3RhbnR8c2hhcmVkfHByb3BlcnR5KVwiKTtcblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eVwiLFxuXHRcIihzY29wZTpjb25zdGFudHxzaGFyZWQgcHJvcGVydHl8cHJvcGVydHkpIHtpZGVudGlmaWVyfSAodmFsdWVDbGF1c2U6PSB7ZXhwcmVzc2lvbn0pP1wiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHNjb3BlLCBpZGVudGlmaWVyLCB2YWx1ZUNsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0c2NvcGUgPSBzY29wZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHZhbHVlID0gdmFsdWVDbGF1c2UgJiYgXCIgPSBcIiArIHZhbHVlQ2xhdXNlLnJlc3VsdHMuZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KSB8fCBcIlwiO1xuXG5cdFx0XHRsZXQgZGVjbGFyYXRpb24gPSBgJHtpZGVudGlmaWVyfSR7dmFsdWV9YDtcblx0XHRcdHN3aXRjaCAoc2NvcGUpIHtcblx0XHRcdFx0Y2FzZSBcImNvbnN0YW50XCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBjb25zdCAke2RlY2xhcmF0aW9ufWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZCBwcm9wZXJ0eVwiOlxuXHRcdFx0XHRcdHJldHVybiBgQHByb3RvXFxuJHtkZWNsYXJhdGlvbn1gO1xuXG5cdFx0XHRcdGNhc2UgXCJwcm9wZXJ0eVwiOlxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBkZWNsYXJhdGlvbjtcblx0XHRcdH1cblx0XHR9XG5cdH1cbik7XG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlcIixcbi8vIFRPRE86IHNjb3BlX21vZGlmaWVyPz8/XG5cdFwicHJvcGVydHkge2lkZW50aWZpZXJ9IGFzIChhfGFuKT8ge3R5cGV9XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHkgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgdHlwZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHR0eXBlID0gdHlwZS50b1NvdXJjZShjb250ZXh0KTtcblxuXHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSB7IHJldHVybiB0aGlzLl9fJHtpZGVudGlmaWVyfSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHNwZWxsLmlzQSh2YWx1ZSwgJHt0eXBlfSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gVE9ETzogd2FybiBvbiBpbnZhbGlkIHNldD8gIHNoYXJlZD8gIHVuZGVmaW5lZD8gc29tZXRoaW5nIG90aGVyIHRoYW4gdGhlIGZpcnN0IHZhbHVlIGFzIGRlZmF1bHQ/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5X2FzX29uZV9vZlwiLFxuXHRcInByb3BlcnR5IHtpZGVudGlmaWVyfSBhcyBvbmUgb2Yge2xpc3Q6bGl0ZXJhbF9saXN0fVwiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5X2FzX29uZV9vZiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzY29wZV9tb2RpZmllciwgaWRlbnRpZmllciwgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuLy9UT0RPOiBub3QgaGFuZGxpbmcgc2NvcGVfbW9kaWZpZXJcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHBsdXJhbCA9IHBsdXJhbGl6ZShpZGVudGlmaWVyKTtcblx0XHRcdGxldCB2YWx1ZXMgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuLy9UT0RPOiBsaXN0LmdldEl0ZW0oMClcblx0XHRcdGxldCBmaXJzdCA9IGxpc3QucmVzdWx0cy5tYXRjaGVkWzBdO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKGNvbnRleHQpIDogXCJ1bmRlZmluZWRcIjtcblxuXHRcdFx0cmV0dXJuIGBAcHJvdG9cXG5gXG5cdFx0XHRcdCArIGAke3BsdXJhbH0gPSAke3ZhbHVlc31cXG5gXG5cdFx0XHRcdCArIGBnZXQgJHtpZGVudGlmaWVyfSB7IHJldHVybiAoXCJfXyR7aWRlbnRpZmllcn1cIiBpbiB0aGlzID8gdGhpcy5fXyR7aWRlbnRpZmllcn0gOiAke2ZpcnN0VmFsdWV9KSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblxuLy8gTU9SRSBFRkZJQ0lFTlQgQlVUIFVHTElFUlxuLy8gXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9O1xcbmBcbi8vIFx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9IHsgcmV0dXJuIChcIl9fJHtpZGVudGlmaWVyfVwiIGluIHRoaXMgPyB0aGlzLl9fJHtpZGVudGlmaWVyfSA6ICR7Zmlyc3RWYWx1ZX0pIH1cXG5gXG4vLyBcdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy5jb25zdHJ1Y3Rvci4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdFByb3BlcnR5IGFjY2Vzc1xuLy9cblxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIocHJvcGVydGllczp0aGUge2lkZW50aWZpZXJ9IG9mKSsgdGhlPyB7ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgcHJvcGVydGllcyB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRwcm9wZXJ0aWVzID0gcHJvcGVydGllcy5yZXN1bHRzXG5cdFx0XHRcdFx0XHRcdC5yZXZlcnNlKClcblx0XHRcdFx0XHRcdFx0Lm1hcCggcHJvcGVydHkgPT4gcHJvcGVydHkuaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSApXG5cdFx0XHRcdFx0XHRcdC5qb2luKFwiLlwiKTtcblx0XHRcdHJldHVybiBgJHtleHByZXNzaW9ufS4ke3Byb3BlcnRpZXN9YDtcbi8vIE5PVEU6IHRoZSBmb2xsb3dpbmcgaXMgc2FmZXIsIGJ1dCB1Z2x5IGZvciBkZW1vIHB1cnBvc2VzXG4vL1x0XHRcdHJldHVybiBgc3BlbGwuZ2V0KCR7ZXhwcmVzc2lvbn0sIFsnJHtwcm9wZXJ0aWVzfSddKWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicHJvcGVydHlfZXhwcmVzc2lvblwiLFxuXHRcIihteXx0aGlzKSB7aWRlbnRpZmllcn1cIixcblx0Y2xhc3MgcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHRoaXMuJHtpZGVudGlmaWVyfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3R5cGVzLmpzIl0sInNvdXJjZVJvb3QiOiIifQ==