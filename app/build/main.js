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
	parseRuleSyntax_token: function parseRuleSyntax_token(syntaxStream, rules) {
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
	parseRuleSyntax_string: function parseRuleSyntax_string(syntaxStream, rules, startIndex) {
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

// ##  Add methods to Parser to define rules using the above syntax.
Object.defineProperties(_Parser2.default.prototype, {

	// Parse a `ruleSyntax` rule and add it to our list of rules.
	// Returns the new rule.
	// Logs parsing errors but allows things to continue.
	addSyntax: { value: function value(name, ruleSyntax, properties) {
			var constructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.Sequence;

			// If we only got 3 args, and 2nd is a function, use it as constructor instead
			if (properties instanceof Function) {
				constructor = properties;
				properties = undefined;
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

	addStatement: { value: function value(name, ruleSyntax, properties) {
			var constructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.Statement;

			var rule = this.addSyntax(name, ruleSyntax, properties, constructor);
			if (rule) return this.addRule("statement", rule);
		} },

	addExpression: { value: function value(name, ruleSyntax, properties) {
			var constructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.Expression;

			var rule = this.addSyntax(name, ruleSyntax, properties, constructor);
			if (rule) return this.addRule("expression", rule);
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


		// return just the list as our source
		value: function toSource(context) {
			return this.results.toSource(context);
		}
	}, {
		key: "results",


		//TODO: squirrely...
		// When gathering arguments, return just the matched list data, ignoring the brackets.
		get: function get() {
			return this.matched[1];
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
		_classCallCheck(this, infix_operator_expression);

		return _possibleConstructorReturn(this, (infix_operator_expression.__proto__ || Object.getPrototypeOf(infix_operator_expression)).apply(this, arguments));
	}

	_createClass(infix_operator_expression, [{
		key: "toSource",

		//		testRule = "infix_operator";

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
		var _ref;

		var _temp, _this3, _ret;

		_classCallCheck(this, postfix_operator_expresion);

		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		return _ret = (_temp = (_this3 = _possibleConstructorReturn(this, (_ref = postfix_operator_expresion.__proto__ || Object.getPrototypeOf(postfix_operator_expresion)).call.apply(_ref, [this].concat(args))), _this3), _this3.testRule = "postfix_operator", _temp), _possibleConstructorReturn(_this3, _ret);
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
/***/ (function(module, exports) {

"use strict";
throw new Error("Module build failed: SyntaxError: Unterminated string constant (17:51)\n\n\u001b[0m \u001b[90m 15 | \u001b[39m\n \u001b[90m 16 | \u001b[39m\n\u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m 17 | \u001b[39mconsole\u001b[33m.\u001b[39mwarn(\u001b[32m\"object_literal is broken -- matches \"\u001b[39m\u001b[32m\");\u001b[39m\n \u001b[90m    | \u001b[39m                                                   \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n \u001b[90m 18 | \u001b[39m\u001b[90m//TESTME\u001b[39m\n \u001b[90m 19 | \u001b[39m\u001b[90m//MOVE TO `objects`?\u001b[39m\n \u001b[90m 20 | \u001b[39m\u001b[90m// Properties clause: creates an object with one or more property values.\u001b[39m\u001b[0m\n");

/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgMTExYzdmYjUxOWRhYWI3OGZkZDkiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGVTeW50YXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2lmLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbInBhcnNlciIsIndpbmRvdyIsIk9iamVjdCIsImFzc2lnbiIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJTZXF1ZW5jZSIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInJ1bGVzIiwicGFyc2VSdWxlU3ludGF4X3Rva2VucyIsInJ1bGUiLCJsZW5ndGgiLCJTWU5UQVhfRVhQUkVTU0lPTiIsIm1hdGNoIiwiU3ludGF4RXJyb3IiLCJzdGFydEluZGV4IiwibGFzdEluZGV4IiwicGFyc2VSdWxlU3ludGF4X3Rva2VuIiwiZW5kSW5kZXgiLCJsYXN0IiwiU3ltYm9sIiwicG9wIiwibWVyZ2VTeW1ib2xzIiwiS2V5d29yZCIsIm1lcmdlS2V5d29yZHMiLCJwdXNoIiwic3ludGF4VG9rZW4iLCJwYXJzZVJ1bGVTeW50YXhfc3RyaW5nIiwicGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUiLCJwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMiLCJwYXJzZVJ1bGVTeW50YXhfbGlzdCIsInBhcnNlUnVsZVN5bnRheF9yZXBlYXQiLCJzdHJpbmciLCJzdGFydHNXaXRoIiwic3Vic3RyIiwidG9TdHJpbmciLCJmaW5kTmVzdGVkVG9rZW5zIiwic2xpY2UiLCJhcmd1bWVudCIsImFsdGVybmF0aXZlcyIsImdyb3VwQWx0ZXJuYXRpdmVzIiwibWFwIiwiZ3JvdXAiLCJyZXN1bHRzIiwiQWx0ZXJuYXRpdmVzIiwidG9rZW5zIiwiY3VycmVudCIsImkiLCJ0b2tlbiIsImNvbmNhdCIsInN5bWJvbCIsIlJlcGVhdCIsIm9wdGlvbmFsIiwidW5kZWZpbmVkIiwiam9pbiIsInBhcmFtcyIsImJhbmdQb3NpdGlvbiIsImluZGV4T2YiLCJub3QiLCJTdWJydWxlIiwiTGlzdCIsIml0ZW0iLCJkZWxpbWl0ZXIiLCJkZWZpbmVQcm9wZXJ0aWVzIiwicHJvdG90eXBlIiwiYWRkU3ludGF4IiwidmFsdWUiLCJuYW1lIiwicnVsZVN5bnRheCIsInByb3BlcnRpZXMiLCJjb25zdHJ1Y3RvciIsIkZ1bmN0aW9uIiwiZGVidWciLCJjb25zb2xlIiwibG9nIiwiYWRkUnVsZSIsImUiLCJlcnJvciIsImFkZFN0YXRlbWVudCIsIlN0YXRlbWVudCIsImFkZEV4cHJlc3Npb24iLCJFeHByZXNzaW9uIiwiYWRkSW5maXhPcGVyYXRvciIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJ0b0pTIiwiVHlwZUVycm9yIiwiX19pbmZpeE9wZXJhdG9ycyIsImluZml4T3BlcmF0b3JzIiwiYWRkUG9zdGZpeE9wZXJhdG9yIiwiX19wb3N0Zml4T3BlcmF0b3JzIiwicG9zdGZpeE9wZXJhdG9ycyIsIlJ1bGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNsb25lIiwiY3JlYXRlIiwicHJvcHMiLCJzdHJlYW0iLCJhZHZhbmNlVG8iLCJzdGFjayIsImNvbnRleHQiLCJtYXRjaGVkIiwibmV4dFJ1bGUiLCJuZXh0U3RyZWFtIiwiUGF0dGVybiIsInBhdHRlcm4iLCJkZWZpbmVQcm9wZXJ0eSIsIlJlZ0V4cCIsInNvdXJjZSIsInN0YXJ0UGF0dGVybiIsImJsYWNrbGlzdCIsIm1hdGNoZWRUZXh0IiwicmFuZ2UiLCJpbmRleCIsIndvcmRzIiwid29yZCIsIlJlZ0V4cEZyb21TdHJpbmciLCJmaXJzdCIsInNlY29uZCIsInBhdHRlcm5TdHJpbmciLCJlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzIiwiZ2V0UnVsZU9yRGllIiwicGFyc2UiLCJpc0RldGVybWluaXN0aWMiLCJ0ZXN0IiwiTmVzdGVkIiwiZXZlcnkiLCJ0ZXN0UnVsZSIsImxlZnRSZWN1cnNpdmUiLCJzdGFja0NvbnRhaW5zIiwiY2h1bmtpdCIsInBhcnNlSW5DaHVua3MiLCJuZXh0IiwiZWF0V2hpdGVzcGFjZSIsImFyZ05hbWUiLCJydWxlTmFtZSIsImJlc3RNYXRjaCIsIm1hdGNoZXMiLCJnZXRCZXN0TWF0Y2giLCJyZWR1Y2UiLCJiZXN0IiwidG9Tb3VyY2UiLCJpbmNsdWRlcyIsImdyb3VwRW5kIiwiUGFyc2VyIiwicHJvcGVydHlOYW1lIiwiZ2V0UnVsZSIsImFyZ3VtZW50cyIsImNvbXBpbGVTdGF0ZW1lbnRzIiwicmVzdWx0Iiwic3RhdGVtZW50cyIsInRpbWUiLCJjdXJyZW50SW5kZW50IiwidGFicyIsInNwbGl0Iiwic3RhdGVtZW50IiwidHJpbSIsImxpbmVTdGFydCIsImxpbmVJbmRlbnQiLCJjbG9zZXJzIiwibGFzdEJsYW5rTGluZSIsIl9nZXRMYXN0QmxhbmtMaW5lIiwic3BsaWNlIiwid2FybiIsInRpbWVFbmQiLCJ3aGl0ZXNwYWNlIiwiYWR2YW5jZUJ5IiwiZXhpc3RpbmciLCJydWxlSXNMZWZ0UmVjdXJzaXZlIiwic3VicnVsZSIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsIm5lc3RpbmciLCJuZXN0ZWQiLCJjaGFyIiwibGlzdCIsIlJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlMiLCJmbGFncyIsIkRFQlVHIiwiY2hhcnMiLCJXaGl0ZXNwYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJyZXBsYWNlIiwiYWRkVG9CbGFja2xpc3QiLCJUeXBlIiwidHlwZSIsIk51bWJlciIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJJbnRlZ2VyIiwicGFyc2VJbnQiLCJUZXh0IiwidGV4dCIsIkJvb2xlYW4iLCJib29sIiwiZXhwcmVzc2lvbiIsImVuZHNXaXRoIiwiVGV4dFN0cmVhbSIsInRleHRPclByb3BzIiwiYXJnIiwiaGVhZCIsInN1YnN0cmluZyIsIm1lbW9pemVkIiwiZGVmaW5lTWVtb2l6ZWQiLCJwcm9wZXJ0eSIsImdldHRlciIsImFwcGx5IiwiY29uZmlndXJhYmxlIiwiZ2V0IiwiZWxzZVBocmFzZSIsImVsc2VTdGF0ZW1lbnQiLCJpbmRleF9leHByZXNzaW9uIiwiaW5maXhfb3BlcmF0b3IiLCJwcmVjZWRlbmNlIiwiYSIsImIiLCJ0aGluZyIsImxocyIsInJocyIsIm9wZXJhdG9yIiwiYXNzaWdubWVudCIsIm1lc3NhZ2UiLCJidXR0b25DbGF1c2UiLCJidXR0b25OYW1lIiwib2tCdXR0b24iLCJjYW5jZWxCdXR0b24iLCJjYW5jZWxDbGF1c2UiXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxtREFBMkMsY0FBYzs7QUFFekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7OztBQzdEQTs7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aUNBRGMsRUFDRnRELHdCQURFLEVBQ01wRCxvQkFETixFQUNZL0Y7QUFEWixDIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gMTMpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDExMWM3ZmI1MTlkYWFiNzhmZGQ5IiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJpbXBvcnQgeyBkZWZpbmVNZW1vaXplZCB9IGZyb20gXCIuL21lbW9pemUuanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIHJlLWV4cG9ydCBSdWxlIGZvciB0ZXN0aW5nXG5leHBvcnQgZGVmYXVsdCBSdWxlO1xuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbi8vIFRPRE86XHRVc2Uga2V5d29yZHMgaW4gc3ludGF4IHRvIG1ha2UgYSBxdWljayByZWdleC1iYXNlZCBgdGVzdGAgZnVuY3Rpb24gZm9yIHRoZSBlbnRpcmUgcnVsZVxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cbi8vIFRPRE86IGNvbnZlcnQgdG8gVGV4dFN0cmVhbSBwYXR0ZXJuIGFsYSBub3JtYWwgcGFyc2VyIG9uY2UgdGhhdCBzZXR0bGVzIGRvd24/Pz9cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHR2YXIgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IGxhc3RJbmRleCA9IHN5bnRheFN0cmVhbS5sZW5ndGg7XG5cdFx0d2hpbGUgKHN0YXJ0SW5kZXggPCBsYXN0SW5kZXgpIHtcblx0XHRcdGxldCBbIHJ1bGUsIGVuZEluZGV4IF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGlmIChydWxlKSB7XG5cdFx0XHRcdHZhciBsYXN0ID0gcnVsZXNbcnVsZXMubGVuZ3RoLTFdO1xuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYFN0cmluZ2AgYW5kIGxhc3Qgd2FzIGEgYFN0cmluZ2AsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5TeW1ib2wpIHtcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuXHRcdFx0XHRcdC8vIGFuZCByZXBsYWNlIHdpdGggYSBydWxlIHRoYXQgbWVyZ2VzIHRoZSBrZXl3b3Jkc1xuXHRcdFx0XHRcdHJ1bGUgPSBSdWxlLm1lcmdlU3ltYm9scyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYEtleXdvcmRgIGFuZCBsYXN0IHdhcyBhbHNvIGEgYEtleXdvcmRgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRlbHNlIGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG5cdFx0XHRcdFx0cnVsZXMucG9wKCk7XG5cdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG5cdFx0XHRcdFx0cnVsZSA9IFJ1bGUubWVyZ2VLZXl3b3JkcyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRydWxlcy5wdXNoKHJ1bGUpO1xuXHRcdFx0fVxuXHRcdFx0c3RhcnRJbmRleCA9IGVuZEluZGV4ICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHZhciBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdC8vIGlmIHdlIGdvdCBhIFwiXFxcXFwiICh3aGljaCBhbHNvIGhhcyB0byBnbyBpbnRvIHRoZSBzb3VyY2Ugc3RyaW5nIGFzIFwiXFxcXFwiKVxuXHRcdC8vIHRyZWF0IHRoZSBuZXh0IHRva2VuIGFzIGEgbGl0ZXJhbCBzdHJpbmcgcmF0aGVyIHRoYW4gYXMgYSBzcGVjaWFsIGNoYXJhY3Rlci5cblx0XHRpZiAoc3ludGF4VG9rZW4gPT09IFwiXFxcXFwiKSB7XG5cdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggKyAxKTtcblx0XHR9XG5cblx0XHRzd2l0Y2ggKHN5bnRheFRva2VuKSB7XG5cdFx0XHRjYXNlIFwie1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIipcIjpcblx0XHRcdGNhc2UgXCIrXCI6XG5cdFx0XHRjYXNlIFwiP1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblxuXHRcdFx0Ly8gdGhlIGZvbGxvd2luZyBzaG91bGQgQUxXQVlTIGJlIGNvbnN1bWVkIGJ5IHRoZSBhYm92ZVxuXHRcdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGNhc2UgXCIpXCI6XG5cdFx0XHRjYXNlIFwiXVwiOlxuXHRcdFx0Y2FzZSBcInxcIjpcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7c3ludGF4VG9rZW59IGZvdW5kIGFzIGl0ZW0gJHtzdGFydEluZGV4fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdLCBydWxlO1xuXHRcdC8vIElmIGxldHRlcnMgb25seSwgbWF0Y2ggYXMgYSBLZXl3b3JkIChzbyB3ZSByZXF1aXJlIGEgd29yZCBib3VuZGFyeSBhZnRlciB0aGUgc3RyaW5nKS5cblx0XHRpZiAoc3RyaW5nLm1hdGNoKC9bQS1aYS16XSsvKSkge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLktleXdvcmQoeyBzdHJpbmcgfSk7XG5cdFx0fVxuXHRcdC8vIE90aGVyd2lzZSBtYXRjaCBhcyBhIFN0cmluZywgd2hpY2ggZG9lc24ndCByZXF1aXJlIG5vbi13b3JkIGNoYXJzIGFmdGVyIHRoZSB0ZXh0LlxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlN5bWJvbCh7IHN0cmluZzogc3RyaW5nIH0pO1xuXHRcdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRcdGlmIChzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIikpIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIGxlYWRpbmcgc2xhc2ggaW4gbWF0Y2ggc3RyaW5nLi4uXG5cdFx0XHRcdHJ1bGUuc3RyaW5nID0gcnVsZS5zdHJpbmcuc3Vic3RyKDEpO1xuXHRcdFx0XHQvLyBidXQgbGVhdmUgaXQgaW4gdG9TdHJpbmdcblx0XHRcdFx0cnVsZS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnRJbmRleCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdC8vIE5PVEU6IG5lc3RlZCBwYXJlbnMgbWF5IG5vdCBoYXZlIGFsdGVybmF0aXZlcy4uLiA6LSggICBgKGF8KGJ8YykpYCB3b24ndCB3b3JrPz8/XG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiKFwiLCBcIilcIiwgc3RhcnRJbmRleCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0Ly8gc3BsaXQgaW50byBncm91cHMsIGluY2x1ZGluZyBuZXN0ZWQgcGFyZW5zXG5cdFx0bGV0IGFsdGVybmF0aXZlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0aXZlcyhzbGljZSlcblx0XHRcdC5tYXAoZnVuY3Rpb24oZ3JvdXApIHtcblx0XHRcdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoZ3JvdXAsIFtdKTtcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHNbMF07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSdWxlLlNlcXVlbmNlKHsgcnVsZXM6IHJlc3VsdHMgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0bGV0IHJ1bGUgPSBhbHRlcm5hdGl2ZXMubGVuZ3RoID09PSAxID8gYWx0ZXJuYXRpdmVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0aXZlcyB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXG5cdFx0ZnVuY3Rpb24gZ3JvdXBBbHRlcm5hdGl2ZXModG9rZW5zKSB7XG5cdFx0XHR2YXIgYWx0ZXJuYXRpdmVzID0gW107XG5cdFx0XHR2YXIgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XHRjdXJyZW50ID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaGFuZGxlIG5lc3RlZCBwYXJlbnNcblx0XHRcdFx0ZWxzZSBpZiAodG9rZW4gPT09IFwiKFwiKSB7XG5cdFx0XHRcdFx0bGV0IHsgZW5kSW5kZXggfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHRva2VucywgXCIoXCIsIFwiKVwiLCBpKTtcblx0XHRcdFx0XHRjdXJyZW50ID0gY3VycmVudC5jb25jYXQodG9rZW5zLnNsaWNlKGksIGVuZEluZGV4ICsgMSkpO1xuXHRcdFx0XHRcdGkgPSBlbmRJbmRleDtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdXJyZW50LnB1c2godG9rZW4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoY3VycmVudC5sZW5ndGgpIGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0cmV0dXJuIGFsdGVybmF0aXZlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdHZhciBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblxuXHRcdHZhciBwYXJhbXMgPSB7IHJ1bGU6IG1hdGNoLnNsaWNlWzBdIH07XG5cblx0XHQvLyBzZWUgaWYgdGhlcmUncyBhIGBub3RgIHJ1bGUgaW4gdGhlcmVcblx0XHRsZXQgYmFuZ1Bvc2l0aW9uID0gcGFyYW1zLnJ1bGUuaW5kZXhPZihcIiFcIik7XG5cdFx0aWYgKGJhbmdQb3NpdGlvbiAhPT0gLTEpIHtcblx0XHRcdHBhcmFtcy5ub3QgPSBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSk7IC8vWyBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSkgXTtcblx0XHRcdHBhcmFtcy5ydWxlID0gcGFyYW1zLnJ1bGUuc3Vic3RyKDAsIGJhbmdQb3NpdGlvbik7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5TdWJydWxlKHBhcmFtcyk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgbWF0Y2guZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBsaXN0IGV4cHJlc3Npb24gYFs8aXRlbT48ZGVsaW1pdGVyPl1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIltcIiwgXCJdXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHRpZiAocmVzdWx0cy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCBzdHVmZiBhdCBlbmQgb2YgbGlzdDogWyR7c2xpY2Uuam9pbihcIiBcIil9XWApO1xuXHRcdH1cblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLkxpc3QoKTtcblx0XHRydWxlLml0ZW0gPSByZXN1bHRzWzBdXG5cdFx0cnVsZS5kZWxpbWl0ZXIgPSByZXN1bHRzWzFdXG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxufSk7XG5cblxuXG4vLyAjIyAgQWRkIG1ldGhvZHMgdG8gUGFyc2VyIHRvIGRlZmluZSBydWxlcyB1c2luZyB0aGUgYWJvdmUgc3ludGF4LlxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUGFyc2VyLnByb3RvdHlwZSwge1xuXG5cdC8vIFBhcnNlIGEgYHJ1bGVTeW50YXhgIHJ1bGUgYW5kIGFkZCBpdCB0byBvdXIgbGlzdCBvZiBydWxlcy5cblx0Ly8gUmV0dXJucyB0aGUgbmV3IHJ1bGUuXG5cdC8vIExvZ3MgcGFyc2luZyBlcnJvcnMgYnV0IGFsbG93cyB0aGluZ3MgdG8gY29udGludWUuXG5cdGFkZFN5bnRheDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgY29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0Ly8gSWYgd2Ugb25seSBnb3QgMyBhcmdzLCBhbmQgMm5kIGlzIGEgZnVuY3Rpb24sIHVzZSBpdCBhcyBjb25zdHJ1Y3RvciBpbnN0ZWFkXG5cdFx0aWYgKHByb3BlcnRpZXMgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuXHRcdFx0Y29uc3RydWN0b3IgPSBwcm9wZXJ0aWVzO1xuXHRcdFx0cHJvcGVydGllcyA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgY29uc3RydWN0b3IpO1xuXHRcdFx0Ly8gUmVmbGVjdCB0aGUgcnVsZSBiYWNrIG91dCB0byBtYWtlIHN1cmUgaXQgbG9va3MgKG1vcmUgb3IgbGVzcykgdGhlIHNhbWVcblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRlZCBydWxlICcke25hbWV9JzpcXG4gIElOUFVUOiAke3J1bGVTeW50YXh9IFxcbiBPVVRQVVQ6ICR7cnVsZX1gKTtcblxuLy9jb25zb2xlLmluZm8obmFtZSwgY29uc3RydWN0b3IsIHJ1bGUpO1xuXHRcdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0fVxuXHR9fSxcblxuXHRhZGRTdGF0ZW1lbnQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIGNvbnN0cnVjdG9yID0gUnVsZS5TdGF0ZW1lbnQpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIGNvbnN0cnVjdG9yKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkRXhwcmVzc2lvbjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgY29uc3RydWN0b3IgPSBSdWxlLkV4cHJlc3Npb24pIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIGNvbnN0cnVjdG9yKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcnVsZSk7XG5cdH19LFxuXG5cdC8vIEFkZCBpbmZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgb3IgYlwiLlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZEluZml4T3BlcmF0b3I6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSkge1xuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRJbmZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHtcblx0XHRcdGlmICghcnVsZS50b0pTKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIGluZml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYClcblx0XHRcdH1cblx0XHRcdC8vIGNsZWFyIGxpc3Qgb2YgaW5maXggb3BlcmF0b3JzIGZvciBnZXR0ZXIgYmVsb3dcblx0XHRcdGRlbGV0ZSB0aGlzLl9faW5maXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwiaW5maXhfb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIGluZml4IG9wZXJhdG9ycyBhcyBzdHJpbmdzLlxuXHQvLyBSZS1tZW1vaXplZCBhZnRlciBgYWRkSW5maXhPcGVyYXRvcmAgYWJvdmUuXG5cdGluZml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9faW5maXhPcGVyYXRvcnNcIixcblx0XHRmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucnVsZXNbXCJpbmZpeF9vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0ICYmIHRoaXMucnVsZXNbXCJpbmZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZylcblx0fSksXG5cblx0Ly8gQWRkIHBvc3RmaXggb3BlcmF0b3IsIHN1Y2ggYXMgXCJhIGlzIGRlZmluZWRcIlxuXHQvLyBOT1RFOiBpZiB5b3UgaGF2ZSBtb3JlIHRoYW4gb25lIG1hdGNoaW5nIG9wZXJhdG9yLFxuXHQvL1x0XHQgcGFzcyBpbiBhbiBhcnJheSBvZiBzaW1wbGUgc3RyaW5ncyBzbyBhbGwgb2Ygb3VyIG9wZXJhdG9ycyBhcmUgc2ltcGxlIHN0cmluZ3MuXG5cdGFkZFBvc3RmaXhPcGVyYXRvcjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKSB7XG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFBvc3RmaXhPcGVyYXRvcihuYW1lLCBzeW50YXgsIHByb3BlcnRpZXMpKTtcblx0XHR9XG5cblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSB7XG5cdFx0XHRpZiAoIXJ1bGUudG9KUykge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBwb3N0Zml4IG9wZXJhdG9yIHJ1bGUgJyR7bmFtZX0nIHRvIHNwZWNpZnkgJ3RvSlMnIGZ1bmN0aW9uYCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBjbGVhciBsaXN0IG9mIGluZml4IG9wZXJhdG9ycyBmb3IgZ2V0dGVyIGJlbG93XG5cdFx0XHRkZWxldGUgdGhpcy5fX3Bvc3RmaXhPcGVyYXRvcnM7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwicG9zdGZpeF9vcGVyYXRvclwiLCBydWxlKTtcblx0XHR9XG5cdH19LFxuXG5cdC8vIExpc3Qgb2YgcG9zdGZpeCBvcGVyYXRvcnMgYXMgc3RyaW5ncy5cblx0Ly8gUmUtbWVtb2l6ZWQgYWZ0ZXIgYGFkZEluZml4T3BlcmF0b3JgIGFib3ZlLlxuXHRwb3N0Zml4T3BlcmF0b3JzOiBkZWZpbmVNZW1vaXplZChcIl9fcG9zZml4T3BlcmF0b3JzXCIsXG5cdFx0ZnVuY3Rpb24oKXsgcmV0dXJuIHRoaXMucnVsZXNbXCJwb3N0Zml4X29wZXJhdG9yXCJdXG5cdFx0XHRcdFx0XHQmJiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXS5ydWxlcy5tYXAocnVsZSA9PiBydWxlLnN0cmluZyk7XG5cdH0pXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlU3ludGF4LmpzIiwiLy9cdCMgUGFyc2VyIFJ1bGVzXG4vL1x0UnVsZXMgY2FuIGJlIGFzIHNpbXBsZSBhcyBhIHN0cmluZyBgS2V5d29yZGAgb3IgYSBjb21wbGV4IHNlcXVlbmNlIG9mIChuZXN0ZWQpIHJ1bGVzLlxuLy9cbi8vXHRQYXJzZSBhIHJ1bGUgd2l0aCBgcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSlgLCB0aGlzIHdpbGwgZWl0aGVyOlxuLy9cdFx0LSByZXR1cm4gYHVuZGVmaW5lZGAgaWYgdGhlIHJ1bGUgZG9lc24ndCBtYXRjaCB0aGUgaGVhZCBvZiB0aGUgc3RyZWFtLCBvclxuLy9cdFx0LSByZXR1cm4gYSBDTE9ORSBvZiB0aGUgcnVsZSB3aXRoIGF0IGxlYXN0IHRoZSBmb2xsb3dpbmc6XG4vL1x0XHRcdC0gYHN0cmVhbWBcdFx0U3RyZWFtIHdoaWNoIHdhcyBtYXRjaGVkIHdpdGggYHN0YXJ0SW5kZXhgIGF0IHRoZSBzdGFydCBvZiB0aGUgbWF0Y2hcbi8vXHRcdFx0LSBgZW5kSW5kZXhgXHROb24taW5jbHVzaXZlIGVuZCBpbmRleCBpbiBzdHJlYW0gd2hlcmUgbWF0Y2ggZW5kcy5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLnJlc3VsdHNgXHRcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZShjb250ZXh0KWBcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBSdWxlIHx8ICF0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShcImNvbnN0cnVjdG9yXCIpKSB7XG4vL2NvbnNvbGUud2FybihcIm5vdCBydWxlXCIsIHRoaXMpO1xuXHRcdH1cblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXHR9XG5cblx0Ly8gQ2xvbmUgdGhpcyBydWxlIGFuZCBhZGQgYW55IGBwcm9wc2AgcGFzc2VkIGluLlxuXHRjbG9uZSguLi5wcm9wcykge1xuXHRcdGxldCBjbG9uZSA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG5cdFx0T2JqZWN0LmFzc2lnbihjbG9uZSwgLi4ucHJvcHMpO1xuXHRcdHJldHVybiBjbG9uZTtcblx0fVxuXG5cdC8vIEZvciBhIHJ1bGUgaW5zdGFuY2UgYXNzb2NpYXRlZCB3aXRoIGEgc3RyZWFtLFxuXHQvLyByZXR1cm4gYSBuZXcgc3RyZWFtIEFGVEVSIHRoaXMgcnVsZSdzIGVuZC5cblx0bmV4dCgpIHtcblx0XHRpZiAoIXRoaXMuc3RyZWFtIHx8IHRoaXMuZW5kSW5kZXggPT09IHVuZGVmaW5lZClcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYHJ1bGUubmV4dCgpIGNhbGxlZCBvbiBydWxlIHdpdGhvdXQgYSBzdHJlYW1gLCB0aGlzKTtcblx0XHRyZXR1cm4gdGhpcy5zdHJlYW0uYWR2YW5jZVRvKHRoaXMuZW5kSW5kZXgpO1xuXHR9XG5cbi8vXG4vL1x0UGFyc2luZyBwcmltaXRpdmVzIC0tIHlvdSBNVVNUIGltcGxlbWVudCB0aGVzZSBpbiB5b3VyIHN1YmNsYXNzZXMhXG4vL1xuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBydWxlIGluIHRoZSBgc3RyZWFtYC5cblx0Ly8gUmV0dXJucyByZXN1bHRzIG9mIHRoZSBwYXJzZSBvciBgdW5kZWZpbmVkYC5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIElzIHRoaXMgcnVsZSBkZXRlcm1pbmlzdGljLCBlZzogY2FuIGl0IGJlIHF1aWNrbHkgYW5kIHVuYW1iaWd1b3VzbHkgc2F0aXNmaWVkP1xuXHQvLyBSZXR1cm5pbmcgYHRydWVgIGNhbiBzcGVlZCB1cCBzZXF1ZW5jZSBwcm9jZXNzaW5nLFxuXHQvL1x0YnV0IGlmIHlvdSdyZSByZWFsbHkgbm90IHN1cmUsIHJldHVybiBgdW5kZWZpbmVkYC5cblx0aXNEZXRlcm1pbmlzdGljKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGJpdHMgb2Ygb3VyIHJ1bGUgYXJlIGZvdW5kIEFOWVdIRVJFIGluIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIGB1bmRlZmluZWRgIGlmIG5vdCBkZXRlcm1pbnN0aWMgKGJ1dCBhbGwgcGF0dGVybnMgYXJlIGRldGVybWluaXN0aWMpXG5cdC8vXHQtIHJlZ2V4IG1hdGNoIGlmIGZvdW5kLFxuXHQvL1x0LSBgZmFsc2VgIGlmIG5vdCBmb3VuZFxuXHR0ZXN0KHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIERvZXMgdGhlIHBhcnNlIGBzdGFja2AgYWxyZWFkeSBjb250YWluIGBydWxlYD9cblx0c3RhdGljIHN0YWNrQ29udGFpbnMoc3RhY2ssIHJ1bGUsIHN0cmVhbSkge1xuXHRcdGlmIChzdGFjay5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcblxuLy9jb25zb2xlLmluZm8oc3RhY2spO1xuXHRcdC8vIGdvIGJhY2t3YXJkc1xuXHRcdGZvciAodmFyIGkgPSBzdGFjay5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0bGV0IFsgbmV4dFJ1bGUsIG5leHRTdHJlYW0gXSA9IHN0YWNrW2ldO1xuXHRcdFx0aWYgKG5leHRSdWxlID09PSBydWxlKSB7XG5cdFx0XHRcdGlmIChuZXh0U3RyZWFtLnN0YXJ0SW5kZXggPT09IHN0cmVhbS5zdGFydEluZGV4KSB7XG4vL1x0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJmb3VuZCB1bnByb2R1Y3RpdmUgcnVsZSBcIiwgcnVsZSwgXCIgb24gc3RhY2tcIiwgc3RhY2spO1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuLy9cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiZm91bmQgcHJvZHVjdGl2ZSBydWxlIFwiLCBydWxlLCBcIiBvbiBzdGFja1wiLCBzdGFjayk7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG4vL1xuLy8gIyMgb3V0cHV0IGFzIHNvdXJjZVxuLy9cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gTk9URTogeW91IG1heSB3YW50IHRvIG1lbW9pemUgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0Ly8gT3V0cHV0IHZhbHVlIGZvciB0aGlzIElOU1RBTlRJQVRFRCBydWxlIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQ7XG5cdH1cblxuLy9cbi8vICMjIGdyb3VwOiByZWZsZWN0aW9uXG4vL1xuXHRnZXQgcnVsZVR5cGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0fVxufVxuXG5cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vXG4vLyBOT1RFXHRUbyBtYWtlIHRoaXMgbW9yZSBnZW5lcmFsbHkgYXBwbGljYWJsZSwgZG8gTk9UIHN0YXJ0IHRoZSBwYXR0ZXJuIHdpdGggYSBgXmAuXG4vL1x0XHRXZSdsbCBhdXRvbWF0aWNhbGx5IG1ha2UgYSBjb3B5IG9mIHRoZSBSZWdFeHAgd2l0aCB0aGUgc3RhcnQgcG9pbnQgYXR0YWNoZWRcbi8vXHRcdGFuZCB1c2UgdGhhdCBhcyBhcHByb3ByaWF0ZS5cbi8vXG4vL1x0XHRUaGlzIHdheSB3ZSBjYW4gcmUtdXNlIHRoZSByZWdleCB0byBjaGVjayBmb3IgYSBtYXRjaCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBzdHJlYW0uLi5cbi8vXG4vLyBZb3UgY2FuIG9wdGlvbmFsbHkgc3BlY2lmeSBhIGBydWxlLmJsYWNrbGlzdGAsIGEgc2V0IG9mIG1hdGNoZXMgd2hpY2ggd2lsbCBzcGVjaWZpY2FsbHkgTk9UIHdvcmssXG4vL1x0ZWcgZm9yIGBpZGVudGlmaWVyLlxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHBhdHRlcm5gIGlzIHJlcXVpcmVkXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXcgUnVsZS5QYXR0ZXJuKCk6IFlvdSBtdXN0IHBhc3MgYSBgcGF0dGVybmAgcGFyYW1ldGVyXCIpO1xuXG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cblx0XHQvLyBDcmVhdGUgYSBgc3RhcnRQYXR0ZXJuYCB0byBtYXRjaCBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJvbmdcblx0XHQvLyBDcmVhdGUgbm9uLWVudW1lcmFibHkuXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic3RhcnRQYXR0ZXJuXCIsIHsgdmFsdWU6IG5ldyBSZWdFeHAoXCJeXCIgKyB0aGlzLnBhdHRlcm4uc291cmNlKSB9KTtcblx0fVxuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBwYXR0ZXJuIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrKSB7XG5cdFx0bGV0IG1hdGNoID0gc3RyZWFtLm1hdGNoKHRoaXMuc3RhcnRQYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYmFpbCBpZiBwcmVzZW50IGluIGJsYWNrbGlzdFxuXHRcdGxldCBtYXRjaGVkID0gbWF0Y2hbMF07XG5cdFx0aWYgKHRoaXMuYmxhY2tsaXN0ICYmIHRoaXMuYmxhY2tsaXN0W21hdGNoZWRdKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IGVuZEluZGV4ID0gc3RyZWFtLnN0YXJ0SW5kZXggKyBtYXRjaGVkLmxlbmd0aDtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIGVuZEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCxcblx0XHRcdGVuZEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBQYXR0ZXJucyBhcmUgQUxXQVlTIGRldGVybWluaXN0aWMuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYW55IG9mIG91ciBwYXR0ZXJuaXMgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYyAoYnV0IGFsbCBwYXR0ZXJucyBhcmUgZGV0ZXJtaW5pc3RpYylcblx0Ly9cdC0gcmVnZXggbWF0Y2ggaWYgZm91bmQsXG5cdC8vXHQtIGBmYWxzZWAgaWYgbm90IGZvdW5kXG5cdHRlc3QocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5wYXR0ZXJuKTtcblx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdG1hdGNoLmVuZEluZGV4ID0gKG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoKTtcblx0XHRcdHJldHVybiBtYXRjaDtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0YWRkVG9CbGFja2xpc3QoLi4ud29yZHMpIHtcblx0XHRpZiAoIXRoaXMuYmxhY2tsaXN0KSB0aGlzLmJsYWNrbGlzdCA9IHt9O1xuXHRcdHdvcmRzLmZvckVhY2god29yZCA9PiB0aGlzLmJsYWNrbGlzdFt3b3JkXSA9IHRydWUpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMucGF0dGVybi5zb3VyY2U7XG5cdH1cbn1cblxuLy8gUnVsZSBmb3IgbGl0ZXJhbCBzdHJpbmcgdmFsdWUsIHdoaWNoIGluY2x1ZGUgcHVuY3R1YXRpb24gc3VjaCBhcyBgKGAgZXRjLlxuLy8gYFN5bWJvbGBzIGFyZSBkaWZmZXJlbnQgZnJvbSBgS2V5d29yZHNgIGluIHRoYXQgdGhleSBkbyBub3QgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkuXG4vL1RPRE86IHJlbmFtZSBgU3ltYm9sYD8/P1xuUnVsZS5TeW1ib2wgPSBjbGFzcyBTeW1ib2wgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHN0cmluZ2AgaXMgcmVxdWllZC5cblx0XHRpZiAoIXByb3BlcnRpZXMuc3RyaW5nKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuU3ltYm9sKCk6IEV4cGVjdGVkIHN0cmluZyBwcm9wZXJ0eVwiKTtcblxuXHRcdC8vIGNvbnZlcnQgc3RyaW5nIHRvIHBhdHRlcm5cblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikge1xuXHRcdFx0cHJvcGVydGllcy5wYXR0ZXJuID0gUGFyc2VyLlJlZ0V4cEZyb21TdHJpbmcocHJvcGVydGllcy5zdHJpbmcpO1xuLy9jb25zb2xlLmluZm8ocHJvcGVydGllcy5zdHJpbmcsIHByb3BlcnRpZXMucGF0dGVybik7XG5cdFx0fVxuXG4vL1x0XHRjb25zb2xlLmluZm8oXCJjcmVhdGluZyBzdHJpbmdcIiwgcHJvcGVydGllcyk7XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdH1cblxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cbi8vIE1lcmdlIHR3byBTeW1ib2wgcnVsZXMgdG9nZXRoZXIsIHJldHVybmluZyBhIG5ldyBydWxlIHRoYXQgbWF0Y2hlcyBib3RoLlxuUnVsZS5tZXJnZVN5bWJvbHMgPSBmdW5jdGlvbihmaXJzdCwgc2Vjb25kKSB7XG5cdHJldHVybiBuZXcgUnVsZS5TeW1ib2woeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIHNlY29uZC5zdHJpbmcgfSk7XG59XG5cbi8vIEtleXdvcmQgcGF0dGVybi5cbi8vIFByb3BlcnRpZXM6XG4vL1x0LSBgcnVsZS5zdHJpbmdgIFx0KHJlcXVpcmVkKSBcdEtleXdvcmQgc3RyaW5nIHRvIG1hdGNoLlxuLy9cdC0gYHJ1bGUucGF0dGVybmBcdChvcHRpb25hbCkgXHRSZWdFeHAgZm9yIHRoZSBtYXRjaC5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0V2UnbGwgY3JlYXRlIG9uZSBmcm9tIGBzdHJpbmdgIGlmIG5lY2Vzc2FyeS5cbi8vXHRcdFx0XHRcdFx0XHRcdFx0Tk9URTogZG8gTk9UIHN0YXJ0IHRoZSBgcGF0dGVybmAgd2l0aCBgXmAuXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLktleXdvcmQoKTogRXhwZWN0ZWQgc3RyaW5nIHByb3BlcnR5XCIpO1xuXG5cdFx0Ly8gZGVyaXZlIGBwYXR0ZXJuYCBpZiBuZWNlc3NhcnkuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdC8vIGVuZm9yY2Ugd29yZCBib3VuZGFyaWVzIGFuZCBhbGxvdyBhcmJpdHJhcnkgc3BhY2UgYmV0d2VlbiB3b3Jkc1xuXHRcdFx0bGV0IHBhdHRlcm5TdHJpbmcgPSBQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhwcm9wZXJ0aWVzLnN0cmluZyk7XG5cdFx0XHRwcm9wZXJ0aWVzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKFwiXFxcXGJcIiArIHBhdHRlcm5TdHJpbmcgKyBcIlxcXFxiXCIpO1xuXHRcdH1cblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnN0cmluZ30ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuLy8gTWVyZ2UgdHdvIEtleXdvcmQgcnVsZXMgdG9nZXRoZXIsIGFkZGluZyB0aGUgc2Vjb25kIHRvIHRoZSBmaXJzdC5cblJ1bGUubWVyZ2VLZXl3b3JkcyA9IGZ1bmN0aW9uKGZpcnN0LCBzZWNvbmQpIHtcblx0cmV0dXJuIG5ldyBSdWxlLktleXdvcmQoeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIFwiIFwiICsgc2Vjb25kLnN0cmluZyB9KTtcbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy5ydWxlLCBcInJ1bGVcIik7XG5cdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgbWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdHJldHVybiBtYXRjaDtcblx0fVxuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnJ1bGUsIFwicnVsZVwiKTtcblx0XHRyZXR1cm4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYW55IG9mIG91ciBhbHRlcm5hdGl2ZXMgYXJlIGZvdW5kIEFOWVdIRVJFIGluIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIHJlZ2V4IG1hdGNoIGlmIGZvdW5kLFxuXHQvL1x0LSBgZmFsc2VgIGlmIG5vdCBmb3VuZCBvclxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljLlxuXHR0ZXN0KHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZU9yRGllKHRoaXMucnVsZSwgXCJydWxlXCIpO1xuXHRcdHJldHVybiBydWxlLnRlc3QocGFyc2VyLCBzdHJlYW0pO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHtcblxuXHQvLyBJcyB0aGlzIGRldGVybWluaXN0aWMsIGVnOiBhcmUgb3VyIHN1YnJ1bGVzIHVuYW1iaWdvdXNseSBkZXRlcm1pbmFibGU/XG4vL1RPRE86IG1lbW9pemU/XG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzLmV2ZXJ5KHJ1bGUgPT4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pKTtcblx0fVxufVxuXG5cbi8vIFNlcXVlbmNlIG9mIHJ1bGVzIHRvIG1hdGNoIChhdXRvLWV4Y2x1ZGluZyB3aGl0ZXNwYWNlKS5cblJ1bGUuU2VxdWVuY2UgPSBjbGFzcyBTZXF1ZW5jZSBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrID0gW10pIHtcblx0XHQvLyBJZiB3ZSBoYXZlIGEgYHRlc3RSdWxlYCBkZWZpbmVkXG5cdFx0aWYgKHRoaXMudGVzdFJ1bGUpIHtcblx0XHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnRlc3RSdWxlLCBcInRlc3RSdWxlXCIpO1xuXHRcdFx0aWYgKHJ1bGUudGVzdChwYXJzZXIsIHN0cmVhbSkgPT09IGZhbHNlKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdGlmIChSdWxlLnN0YWNrQ29udGFpbnMoc3RhY2ssIHRoaXMsIHN0cmVhbSkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRzdGFjayA9IHN0YWNrLmNvbmNhdCgpO1xuXHRcdFx0c3RhY2sucHVzaChbdGhpcywgc3RyZWFtXSk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2h1bmtpdCkgcmV0dXJuIHRoaXMucGFyc2VJbkNodW5rcyhwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIW1hdGNoICYmICFydWxlLm9wdGlvbmFsKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdG1hdGNoZWQucHVzaChtYXRjaCk7XG5cdFx0XHRcdG5leHQgPSBtYXRjaC5uZXh0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGlmIHdlIGdldCBoZXJlLCB3ZSBtYXRjaGVkIGFsbCB0aGUgcnVsZXMhXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vIFx0cGFyc2VJbkNodW5rcyhwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcbi8vXG4vLyBcdH1cblxuLy9UT0RPQ1xuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGBtYXRjaGVkYCBhcnJheSBpbmRleGVkIGJ5XG5cdC8vXHRcdC0gYG1hdGNoLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYG1hdGNoLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIGBydWxlIHR5cGVgOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRsZXQgcmVzdWx0cyA9IHt9O1xuXHRcdGZvciAobGV0IG1hdGNoIG9mIHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0bGV0IGFyZ05hbWUgPSBtYXRjaC5hcmd1bWVudCB8fCBtYXRjaC5ydWxlTmFtZSB8fCBtYXRjaC5jb25zdHJ1Y3Rvci5uYW1lO1xuXG5cdFx0XHQvLyBJZiBhcmcgYWxyZWFkeSBleGlzdHMsIGNvbnZlcnQgdG8gYW4gYXJyYXlcblx0XHRcdGlmIChhcmdOYW1lIGluIHJlc3VsdHMpIHtcblx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KHJlc3VsdHNbYXJnTmFtZV0pKSByZXN1bHRzW2FyZ05hbWVdID0gW3Jlc3VsdHNbYXJnTmFtZV1dO1xuXHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdLnB1c2gobWF0Y2gpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0gPSBtYXRjaDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlcy5qb2luKFwiIFwiKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG5cbn1cblxuLy8gU3ludGFjdGljIHN1Z2FyIGZvciBkZWJ1Z2dpbmdcblJ1bGUuRXhwcmVzc2lvbiA9IGNsYXNzIGV4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gU3RhdGVtZW50cyB0YWtlIHVwIHRoZSBlbnRpcmUgbGluZS5cblJ1bGUuU3RhdGVtZW50ID0gY2xhc3Mgc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIEFsdGVybmF0aXZlIHN5bnRheCwgbWF0Y2hpbmcgb25lIG9mIGEgbnVtYmVyIG9mIGRpZmZlcmVudCBydWxlcy5cbi8vIFRoZSByZXN1bHQgb2YgYSBwYXJzZSBpcyB0aGUgbG9uZ2VzdCBydWxlIHRoYXQgYWN0dWFsbHkgbWF0Y2hlZC5cbi8vIE5PVEU6IEN1cnJlbnRseSB0YWtlcyB0aGUgbG9uZ2VzdCB2YWxpZCBtYXRjaC5cbi8vIFRPRE86IG1hdGNoIGFsbCB2YWxpZCBhbHRlcm5hdGl2ZXNcbi8vIFRPRE86IHJlbmFtZT9cblJ1bGUuQWx0ZXJuYXRpdmVzID0gY2xhc3MgQWx0ZXJuYXRpdmVzIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKTtcblx0XHRpZiAoIXRoaXMucnVsZXMpIHRoaXMucnVsZXMgPSBbXTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljLlxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmQgb3Jcblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICghdGhpcy5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCBiZXN0TWF0Y2g7XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnRlc3QocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdG1hdGNoLmVuZEluZGV4ID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG5cdFx0XHRcdHJldHVybiBtYXRjaDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gRmluZCBhbGwgcnVsZXMgd2hpY2ggbWF0Y2ggYW5kIGRlbGVnYXRlIHRvIGBnZXRCZXN0TWF0Y2goKWAgdG8gcGljayB0aGUgYmVzdCBvbmUuXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdGxldCBtYXRjaGVzID0gW107XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayk7XG5cdFx0XHRpZiAobWF0Y2gpIG1hdGNoZXMucHVzaChtYXRjaCk7XG5cdFx0fVxuXG5cdFx0aWYgKCFtYXRjaGVzLmxlbmd0aCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIHVuY29tbWVudCB0aGUgYmVsb3cgdG8gcHJpbnQgYWx0ZXJuYXRpdmVzXG5cdFx0Ly8gaWYgKG1hdGNoZXMubGVuZ3RoID4gMSkge1xuXHRcdC8vXHRjb25zb2xlLmluZm8odGhpcy5hcmd1bWVudCB8fCB0aGlzLnJ1bGVOYW1lLCBtYXRjaGVzLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5tYXRjaGVkVGV4dCkpO1xuXHRcdC8vIH1cblxuXHRcdGxldCBiZXN0TWF0Y2ggPSAobWF0Y2hlcy5sZW5ndGggPT09IDEgPyBtYXRjaGVzWzBdIDogdGhpcy5nZXRCZXN0TWF0Y2gobWF0Y2hlcykpO1xuXG5cdFx0Ly8gYXNzaWduIGBhcmdOYW1lYCBvciBgcnVsZU5hbWVgIGZvciBgcmVzdWx0c2Bcblx0XHRpZiAodGhpcy5hcmd1bWVudCkgYmVzdE1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRlbHNlIGlmICh0aGlzLnJ1bGVOYW1lKSBiZXN0TWF0Y2gucnVsZU5hbWUgPSB0aGlzLnJ1bGVOYW1lO1xuLy9UT0RPOiBvdGhlciB0aGluZ3MgdG8gY29weSBoZXJlPz8/XG5cblx0XHRyZXR1cm4gYmVzdE1hdGNoO1xuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBcImJlc3RcIiBtYXRjaCBnaXZlbiBtb3JlIHRoYW4gb25lIG1hdGNoZXMgYXQgdGhlIGhlYWQgb2YgdGhlIHN0cmVhbS5cblx0Ly8gRGVmYXVsdCBpcyB0byByZXR1cm4gdGhlIGxvbmdlc3QgbWF0Y2guXG5cdC8vIEltcGxlbWVudCBzb21ldGhpbmcgZWxzZSB0byBkbywgZWcsIHByZWNlZGVuY2UgcnVsZXMuXG5cdGdldEJlc3RNYXRjaChtYXRjaGVzKSB7XG5cdFx0cmV0dXJuIG1hdGNoZXMucmVkdWNlKGZ1bmN0aW9uIChiZXN0LCBuZXh0KSB7XG5cdFx0XHRpZiAobmV4dC5lbmRJbmRleCA+IGJlc3QuZW5kSW5kZXgpIHJldHVybiBuZXh0O1xuXHRcdFx0cmV0dXJuIGJlc3Q7XG5cdFx0fSwgbWF0Y2hlc1swXSk7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZShjb250ZXh0KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5tYXRjaGVkYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrID0gW10pIHtcblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHRpZiAoUnVsZS5zdGFja0NvbnRhaW5zKHN0YWNrLCB0aGlzLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0c3RhY2sgPSBzdGFjay5jb25jYXQoKTtcblx0XHRcdHN0YWNrLnB1c2goW3RoaXMsIHN0cmVhbV0pO1xuXHRcdH1cblxuXHRcdGxldCBuZXh0ID0gc3RyZWFtO1xuXHRcdGxldCBtYXRjaGVkID0gW107XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCBtYXRjaCA9IHRoaXMucnVsZS5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghbWF0Y2gpIGJyZWFrO1xuXG5cdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0bmV4dCA9IG1hdGNoLm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAobWF0Y2hlZC5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBhcnJheSB3aXRoIGFyZ3VtZW50cyBvZiBhbGwgcmVzdWx0cy5cblx0Ly8gTk9URTogbWVtb2l6ZXMgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC5yZXN1bHRzICk7XG5cdH1cblxuXHR0b1NvdXJjZSgpIHtcblx0XHR0aHJvdyBcIkRvbid0IHVuZGVyc3RhbmQgaG93IHRvIHNvdXJjZSBSdWxlLlJlcGVhdCFcIjtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdGNvbnN0IHJ1bGUgPSAodGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSB8fCB0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQgJiYgdGhpcy5ydWxlLnN0cmluZy5pbmNsdWRlcyhcIiBcIilcblx0XHRcdFx0ICAgPyBgKCR7dGhpcy5ydWxlfSlgXG5cdFx0XHRcdCAgIDogYCR7dGhpcy5ydWxlfWBcblx0XHRcdFx0KTtcblx0XHRyZXR1cm4gYCR7cnVsZX0ke3RoaXMub3B0aW9uYWwgPyAnKicgOiAnKyd9YDtcblx0fVxufVxuXG5cbi8vIExpc3QgbWF0Y2ggcnVsZTogICBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAuIGVnXCIgYFt7bnVtYmVyfSxdYCB0byBtYXRjaCBgMSwyLDNgXG4vL1x0YHJ1bGUuaXRlbWAgaXMgdGhlIHJ1bGUgZm9yIGVhY2ggaXRlbSxcbi8vXHRgcnVsZS5kZWxpbWl0ZXJgIGlzIHRoZSBkZWxpbWl0ZXIgYmV0d2VlbiBlYWNoIGl0ZW0uXG4vLyBcdGBydWxlLm1hdGNoZWRgIGluIHRoZSBvdXRwdXQgaXMgdGhlIGxpc3Qgb2YgdmFsdWVzLlxuLy9cbi8vXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhIExpc3QgcnVsZSB3aWxsIE5PVCByZXBlYXQgKD8/Pz8pXG5SdWxlLkxpc3QgPSBjbGFzcyBMaXN0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCBzdHJlYW1dKTtcblx0XHR9XG5cblx0XHQvLyBlbnN1cmUgaXRlbSBhbmQgZGVsaW1pdGVyIGFyZSBvcHRpb25hbCBzbyB3ZSBkb24ndCBiYXJmIGluIGBwYXJzZVJ1bGVgXG5cdFx0dGhpcy5pdGVtLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR0aGlzLmRlbGltaXRlci5vcHRpb25hbCA9IHRydWU7XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHQvLyBnZXQgbmV4dCBpdGVtLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGl0ZW0gPSB0aGlzLml0ZW0ucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdG1hdGNoZWQucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghZGVsaW1pdGVyKSBicmVhaztcblx0XHRcdG5leHQgPSBkZWxpbWl0ZXIubmV4dCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0bWF0Y2hlZFRleHQ6IHN0cmVhbS5yYW5nZShzdHJlYW0uc3RhcnRJbmRleCwgbmV4dC5zdGFydEluZGV4KSxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRzdGFydEluZGV4OiBtYXRjaGVkWzBdID8gbWF0Y2hlZFswXS5zdGFydEluZGV4IDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gbWF0Y2hlZCBpdGVtIGJ5IGluZGV4XG5cdGdldEl0ZW0oaW5kZXgpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkW2luZGV4XTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcdFx0Ly8gVE9ETzogdGhyb3c/Pz9cblx0XHRsZXQgbWF0Y2hlZCA9IHRoaXMubWF0Y2hlZC5tYXAoIG1hdGNoID0+IG1hdGNoLnRvU291cmNlKGNvbnRleHQpICkuam9pbihcIiwgXCIpO1xuXHRcdHJldHVybiBgWyR7bWF0Y2hlZH1dYDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgWyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5pdGVtfSAke3RoaXMuZGVsaW1pdGVyfV0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZS5qcyIsIi8vIFNwZWxsIFwiRW5nbGlzaFwiIHBhcnNlciBzdHJhd21hblxuXG4vLyBUT0RPOlx0YHRlc3RgIGZ1bmN0aW9uIGZvciBxdWljayBuby1nb29kIGhpdCBvbiBge2F9IGJsYWggYmxhaCB7Yn1gP1xuLy8gVE9ETzpcdHRoaXMgZG9lc24ndCB3b3JrOiAgIGB7ZXhwcmVzc2lvbn0gaXMge2V4cHJlc3Npb259YFxuLy8gVE9ETzpcdGJyZWFrIGBmaWxlYCBpbnRvIGxpbmVzIGFuZCBwcm9jZXNzIGVhY2ggKGluY2wuIHN1YnN0ci9tYXRjaCBub3QgZ29pbmcgYmV5b25kIHRoZSBlbmQpXG4vLyBUT0RPOlx0bmVzdGluZyAtLSBpcyB0aGlzIGp1c3QgaW5kZW50ID0gXCJhZGQgYmxvY2sgc2NvcGVcIlxuLy8gVE9ETzpcdHByb21vdGlvbiBwYXR0ZXJuIGZvciBnYXRoZXIgYXJndW1lbnRzIChlZzogbGl0ZXJhbC1saXN0KSA/Pz9cbi8vIFRPRE86XHRXaGF0IGRvZXMgc3ludGF4IHRyZWUgbG9vayBsaWtlPyAgSG93IGRvIHdlIGV4dHJhY3QgbWVhbmluZyBvdXQgb2YgdGhlIG5lc3Q/XG4vLyBUT0RPOlx0UGFzcyBgY29udGV4dGAgdG8gdG9Tb3VyY2UoKSwgYWRkIHByb3BlcnR5IGRlc2NyaXB0b3JzIHRvIGBjbGFzc2AsIHZhcmlhYmxlcyBhbmQgY29kZSB0byBgbWV0aG9kYCwgYGdsb2JhbGAgc3R1ZmYgZXRjXG5cbmltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gR1JSUi4uLiB3aWxsIFNPTUVPTkUgb24gdGhlIG5vZGUgdGVhbSBwbGVhc2UgaW1wbGVtZW50IGNvbnNvbGUuZ3JvdXAgPz8/XG5pZiAoIWNvbnNvbGUuZ3JvdXApIGNvbnNvbGUuZ3JvdXAgPSBjb25zb2xlLmxvZztcbmlmICghY29uc29sZS5ncm91cEVuZCkgY29uc29sZS5ncm91cEVuZCA9IGNvbnNvbGUubG9nO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYXJzZXIge1xuXHQvLyBTZXQgdG8gYHRydWVgIHRvIG91dHB1dCBkZWJ1ZyBpbmZvIHdoaWxlIGFkZGluZyBydWxlc1xuXHRzdGF0aWMgREVCVUcgPSBmYWxzZTtcblxuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblxuXHRcdC8vIENsb25lIHJ1bGVzLCBzdGFydGluZyB3aXRoIGEgY29tcGxldGVseSBlbXB0eSBtYXAgaWYgbm90IGRlZmluZWQgKG5vIHN0YW5kYXJkIG9iamVjdCBrZXlzKVxuXHRcdHRoaXMucnVsZXMgPSBPYmplY3QuY3JlYXRlKHRoaXMucnVsZXMgfHwgbnVsbCk7XG5cdH1cblxuXHRnZXRSdWxlKG5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlc1tuYW1lXTtcblx0fVxuXG5cdGdldFJ1bGVPckRpZShuYW1lLCBwcm9wZXJ0eU5hbWUpIHtcblx0XHRsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShuYW1lKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgJHtwcm9wZXJ0eU5hbWV9IHJ1bGUgJyR7bmFtZX0nIG5vdCBmb3VuZGApO1xuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cbi8vXG4vLyMjIyBQYXJzaW5nXG4vL1xuXHQvLyBQYXJzZSBzb21ldGhpbmc6XG5cdC8vXHQtIGlmIG9uZSBzdHJpbmcgYXJndW1lbnQsIGRvZXMgYSBgcGFyc2VTdGF0ZW1lbnQoKWBcblx0Ly9cdC0gaWYgdHdvLCBkb2VzIGEgYHBhcnNlUnVsZSgpYFxuXHQvLyBSZXR1cm5zIGBwYXJzZS50b1N0cmluZygpYCBvciB0aHJvd3MuXG4vL1RFU1RNRVxuXHRjb21waWxlKCkge1xuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRsZXQgc3RyaW5nID0gYXJndW1lbnRzWzBdO1xuXHRcdFx0cmV0dXJuIHRoaXMuY29tcGlsZVN0YXRlbWVudHMoc3RyaW5nKTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuXHRcdFx0bGV0IG5hbWUgPSBhcmd1bWVudHNbMF0sIHN0cmluZyA9IGFyZ3VtZW50c1sxXTtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnBhcnNlKG5hbWUsIHN0cmluZyk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBwYXJzZXIucGFyc2UoJyR7bmFtZX0nLCAnJHtzdHJpbmd9Jyk6IGNhbid0IHBhcnNlIHRoaXNgKTtcblx0XHRcdHJldHVybiByZXN1bHQudG9Tb3VyY2UoKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJwYXJzZXIucGFyc2UoKTogZXhwZWN0cyBvbmUgb3IgdHdvIGFyZ3VtZW50c1wiKTtcblx0XHR9XG5cdH1cblxuXHQvLyBQYXJzZSBgbmFtZWBkIHJ1bGUgYXQgaGVhZCBvZiBgc3RyZWFtYCAoYHN0cmluZ2Agb3IgYFRleHRTdHJlYW1gKS5cblx0Ly8gSGFuZGxlcyBvcHRpb25hbCBhbmQgcmVwZWF0aW5nIHJ1bGVzIGFzIHdlbGwgYXMgZWF0aW5nIHdoaXRlc3BhY2UuXG5cdC8vIFJldHVybnMgcmVzdWx0IG9mIHBhcnNlLlxuLy9URVNUTUVcblx0cGFyc2UobmFtZSwgc3RyZWFtKSB7XG5cdFx0aWYgKHR5cGVvZiBzdHJlYW0gPT09IFwic3RyaW5nXCIpIHN0cmVhbSA9IG5ldyBUZXh0U3RyZWFtKHN0cmVhbSk7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUobmFtZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYHBhcnNlci5wYXJzZSgke25hbWV9KTogUnVsZSBub3QgZm91bmRgKTtcblx0XHRzdHJlYW0gPSB0aGlzLmVhdFdoaXRlc3BhY2Uoc3RyZWFtKTtcblx0XHRyZXR1cm4gcnVsZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHR9XG5cblx0Ly8gUGFyc2UgYSBzZXQgb2Ygc3RhdGVtZW50cyBsaW5lLWJ5LWxpbmUuXG4vL1RFU1RNRVxuXHRjb21waWxlU3RhdGVtZW50cyhzdGF0ZW1lbnRzKSB7XG5cdFx0Y29uc29sZS50aW1lKFwicGFyc2VTdGF0ZW1lbnRzXCIpO1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0bGV0IGN1cnJlbnRJbmRlbnQgPSAwO1xuXHRcdGNvbnN0IHRhYnMgPSBcIlxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFwiO1xuXHRcdHN0YXRlbWVudHMuc3BsaXQoL1xcbi9nKS5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG5cdFx0XHQvLyBza2lwIGxpbmVzIHRoYXQgYXJlIGFsbCB3aGl0ZXNwYWNlXG5cdFx0XHRpZiAoc3RhdGVtZW50LnRyaW0oKSA9PT0gXCJcIikge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCJcIik7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpbmRlbnQgbGV2ZWwgb2YgdGhpcyBsaW5lXG5cdFx0XHRsZXQgbGluZVN0YXJ0ID0gc3RhdGVtZW50Lm1hdGNoKC9eXFx0Ki8pWzBdO1xuXHRcdFx0bGV0IGxpbmVJbmRlbnQgPSBsaW5lU3RhcnQubGVuZ3RoO1xuXHRcdFx0aWYgKGxpbmVJbmRlbnQgPiBjdXJyZW50SW5kZW50KSB7XG5cdFx0XHRcdC8vIGFkZCB0byBlbmQgb2YgcHJldmlvdXMgbGluZSBpZiBwb3NzaWJsZVxuXHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGgpIHJlc3VsdHNbcmVzdWx0cy5sZW5ndGggLSAxXSArPSBcIiB7XCI7XG5cdFx0XHRcdGVsc2UgcmVzdWx0cy5wdXNoKHRhYnMuc3Vic3RyKDAsIGxpbmVJbmRlbnQtMSkgKyBcIntcIik7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChsaW5lSW5kZW50IDwgY3VycmVudEluZGVudCkge1xuXHRcdFx0XHRsZXQgY2xvc2VycyA9IFtdO1xuXHRcdFx0XHRmb3IgKGxldCBpID0gY3VycmVudEluZGVudDsgaSA+IGxpbmVJbmRlbnQ7IGktLSkge1xuXHRcdFx0XHRcdGNsb3NlcnMucHVzaCh0YWJzLnN1YnN0cigwLCBpLTEpICsgXCJ9XCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIHB1dCBwYXJlbnMgQkVGT1JFIGFueSBibGFuayBsaW5lcyFcblx0XHRcdFx0bGV0IGxhc3RCbGFua0xpbmUgPSB0aGlzLl9nZXRMYXN0QmxhbmtMaW5lKHJlc3VsdHMpO1xuXHRcdFx0XHRyZXN1bHRzLnNwbGljZShsYXN0QmxhbmtMaW5lLCAwLCAuLi5jbG9zZXJzKTtcblx0XHRcdH1cblx0XHRcdGN1cnJlbnRJbmRlbnQgPSBsaW5lSW5kZW50O1xuXG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5wYXJzZShcInN0YXRlbWVudFwiLCBzdGF0ZW1lbnQpO1xuLy9UT0RPOiBjb21wbGFpbiBpZiBjYW4ndCBwYXJzZSB0aGUgZW50aXJlIGxpbmUhXG5cdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdGxldCBzb3VyY2UgPSByZXN1bHQudG9Tb3VyY2UoKS5zcGxpdChcIlxcblwiKTtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKGxpbmVTdGFydCArIHNvdXJjZS5qb2luKFwiXFxuXCIgKyBsaW5lU3RhcnQpKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJDb3VsZG4ndCBwYXJzZSBzdGF0ZW1lbnQ6XCIsIHN0YXRlbWVudCk7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChcIkVSUk9SOiBcIitzdGF0ZW1lbnQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0d2hpbGUgKGN1cnJlbnRJbmRlbnQgPiAwKSB7XG5cdFx0XHRyZXN1bHRzLnB1c2godGFicy5zdWJzdHIoMCwgY3VycmVudEluZGVudC0xKSArIFwifVwiKTtcblx0XHRcdGN1cnJlbnRJbmRlbnQtLTtcblx0XHR9XG5cblx0XHRjb25zb2xlLnRpbWVFbmQoXCJwYXJzZVN0YXRlbWVudHNcIik7XG5cdFx0cmV0dXJuIHJlc3VsdHMuam9pbihcIlxcblwiKTtcblx0fVxuXG5cdC8vIEZpZ3VyZSBvdXQgdGhlIGxhc3QgYmxhbmsgbGluZSBpbiB0aGUgcmVzdWx0c1xuXHRfZ2V0TGFzdEJsYW5rTGluZShyZXN1bHRzKSB7XG5cdFx0Zm9yIChsZXQgaSA9IHJlc3VsdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGlmIChyZXN1bHRzW2ldID09PSBcIlwiKSBjb250aW51ZTtcblx0XHRcdHJldHVybiBpICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIDA7XG5cdH1cblxuXHQvLyBFYXQgd2hpdGVzcGFjZSAoYWNjb3JkaW5nIHRvIGBydWxlcy53aGl0ZXNwYWNlYCkgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG5ldyBzdHJlYW0gaWYgd2UgbWF0Y2hlZCB3aGl0ZXNwYWNlLCBvdGhlcndpc2UgdGhlIHNhbWUgc3RyZWFtLlxuXHRlYXRXaGl0ZXNwYWNlKHN0cmVhbSkge1xuXHRcdGxldCByZXN1bHQgPSB0aGlzLnJ1bGVzLndoaXRlc3BhY2UucGFyc2UodGhpcywgc3RyZWFtKTtcblx0XHRpZiAoIXJlc3VsdCkgcmV0dXJuIHN0cmVhbTtcblx0XHRyZXR1cm4gc3RyZWFtLmFkdmFuY2VCeShyZXN1bHQubWF0Y2hlZC5sZW5ndGgpO1xuXHR9XG5cbi8vXG4vL1x0UnVsZXNcbi8vXG5cblx0Ly8gQWRkIGEgcnVsZSB0byBvdXIgbGlzdCBvZiBydWxlcyFcblx0Ly8gQ29udmVydHMgdG8gYGFsdGVybmF0aXZlc2Agb24gcmUtZGVmaW5pbmcgdGhlIHNhbWUgcnVsZS5cblx0YWRkUnVsZShuYW1lLCBydWxlKSB7XG5cdFx0Ly8gZG9uJ3Qgb3ZlcnJpZGUgcnVsZU5hbWVcblx0XHRpZiAoIXJ1bGUucnVsZU5hbWUpIHJ1bGUucnVsZU5hbWUgPSBuYW1lO1xuXG5cdFx0bGV0IGV4aXN0aW5nID0gdGhpcy5ydWxlc1tuYW1lXTtcblx0XHRpZiAoZXhpc3RpbmcpIHtcblx0XHRcdGlmICghKGV4aXN0aW5nIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpKSB7XG5cdFx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBDb252ZXJ0aW5nIHJ1bGUgJyR7bmFtZX0nIHRvIGFsdGVybmF0aXZlc2ApO1xuXHRcdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZU5hbWU6IG5hbWUsIHJ1bGVzOiBbZXhpc3RpbmddIH0pO1xuXHRcdFx0XHQvLyBjb3B5IGFyZ3VtZW50IG5hbWUgb3ZlciAoPz8/KVxuXHRcdFx0XHRpZiAoZXhpc3RpbmcuYXJndW1lbnQpIHRoaXMucnVsZXNbbmFtZV0uYXJndW1lbnQgPSBleGlzdGluZy5hcmd1bWVudDtcblx0XHRcdH1cblx0XHRcdGlmIChQYXJzZXIuZGVidWcpIGNvbnNvbGUubG9nKGBBZGRpbmcgcnVsZSAnJHtydWxlLnJ1bGVOYW1lfScgdG8gJyR7bmFtZX0nOiBgLCBydWxlKTtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0uYWRkUnVsZShydWxlKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gcnVsZTtcblx0XHR9XG5cblxuXHRcdC8vIG1ha2UgYSBub3RlIGlmIHdlJ3JlIGFkZGluZyBhIGxlZnQtcmVjdXJzaXZlIHJ1bGVcblx0XHRpZiAodGhpcy5ydWxlSXNMZWZ0UmVjdXJzaXZlKG5hbWUsIHJ1bGUpKSB7XG4vL2NvbnNvbGUuaW5mbyhcIm1hcmtpbmcgXCIsIHJ1bGUsIFwiIGFzIGxlZnQgcmVjdXJzaXZlIVwiKTtcblx0XHRcdHJ1bGUubGVmdFJlY3Vyc2l2ZSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblxuXHQvLyBJcyB0aGUgc3BlY2lmaWVkIHJ1bGUgbGVmdC1yZWN1cnNpdmU/XG5cdHJ1bGVJc0xlZnRSZWN1cnNpdmUobmFtZSwgcnVsZSkge1xuXHRcdGlmICghKHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlKSkgcmV0dXJuIGZhbHNlO1xuLy9jb25zb2xlLmxvZyhuYW1lLCBydWxlKTtcblx0XHRmb3IgKGxldCBzdWJydWxlIG9mIHJ1bGUucnVsZXMpIHtcblx0XHRcdC8vIGlnbm9yZSBvcHRpb25hbCBydWxlc1xuXHRcdFx0aWYgKHN1YnJ1bGUub3B0aW9uYWwpIGNvbnRpbnVlO1xuXHRcdFx0aWYgKHN1YnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN1YnJ1bGUgJiYgc3VicnVsZS5ydWxlID09PSBuYW1lKSByZXR1cm4gdHJ1ZTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblxuLy9cbi8vICMjIFV0aWxpdHkgbWV0aG9kc1xuLy9cblxuXHQvLyBGaW5kIHRoZSBtYXRjaGluZyBpbnN0YW5jZSBvZiBwb3NzaWJseSBuZXN0ZWQgYGVuZFRva2VuYCB0byBiYWxhbmNlIGBzdGFydFRva2VuYFxuXHQvL1x0aW4gYXJyYXkgb2YgYHRva2Vuc2AgKHN0cmluZ3MpLlxuXHQvLyBJZiBzdWNjZXNzZnVsLCByZXR1cm5zIGB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZSB9YFxuXHQvLyBUaHJvd3MgaWYgdW5zdWNlc3NmdWwuXG5cdHN0YXRpYyBmaW5kTmVzdGVkVG9rZW5zKHRva2Vucywgc3RhcnRUb2tlbiwgZW5kVG9rZW4sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0aWYgKHRva2Vuc1tzdGFydEluZGV4XSAhPT0gc3RhcnRUb2tlbikgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBFeHBlY3RlZCAnJHtzdGFydFRva2VufScgYXQgaW5kZXggJHtzdGFydEluZGV4fSBvZiB0b2tlbnNgKTtcblx0XHRsZXQgbmVzdGluZyA9IDA7XG5cdFx0bGV0IG5lc3RlZCA9IGZhbHNlO1xuXHRcdGZvciAobGV0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIDEsIGxhc3RJbmRleCA9IHRva2Vucy5sZW5ndGg7IGVuZEluZGV4IDwgbGFzdEluZGV4OyBlbmRJbmRleCsrKSB7XG5cdFx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbZW5kSW5kZXhdO1xuXHRcdFx0aWYgKHRva2VuID09PSBzdGFydFRva2VuKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdFx0bmVzdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b2tlbiA9PT0gZW5kVG9rZW4pIHtcblx0XHRcdFx0aWYgKG5lc3RpbmcgPT09IDApXG5cdFx0XHRcdFx0cmV0dXJuIHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlOiB0b2tlbnMuc2xpY2Uoc3RhcnRJbmRleCsxLCBlbmRJbmRleCksIG5lc3RlZCB9O1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgQ291bGRuJ3QgZmluZCBtYXRjaGluZyAnJHtlbmRUb2tlbn0ncyBzdGFydGluZyBhdCBpdGVtICR7c3RhcnRJbmRleH1gKTtcblx0fVxuXG5cblx0Ly8gTGlzdCBvZiBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gcmVndWxhciBleHByZXNzaW9ucy5cblx0Ly8gVXNlZCB0byBlc2NhcGUgdGhvc2UgY2hhcnMgd2hlbiBjcmVhdGluZyByZWd1bGFyIGV4cHJlc3Npb25zIGZyb20gc3RyaW5ncy5cblx0c3RhdGljIFJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlMgPSAoZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgY2hhcnMgPSB7fTtcblx0XHRcIlxcXFwvXiQqKz8uKCl8e30sW11cIi5zcGxpdChcIlwiKS5mb3JFYWNoKGNoYXIgPT4gY2hhcnNbY2hhcl0gPSB0cnVlKTtcblx0XHRyZXR1cm4gY2hhcnM7XG5cdH0pKClcblxuXHQvLyBHaXZlbiBhIFwibm9ybWFsXCIgYHN0cmluZ2AsIGVzY2FwZSBhbnkgcmVndWxhciBleHByZXNzaW9uIHNwZWNpYWwgY2hhcmFjdGVyc1xuXHQvL1x0c28gd2UgY2FuIGNyZWF0ZSBhIGBuZXcgUmVnRXhwKClgLlxuXHQvLyBBbHNvIGNvbnZlcnRzIGEgc2luZ2xlIHNwYWNlIHRvIGFyYml0cmFyeSBzZXQgb2Ygc3BhY2VzIHdpdGggXCJcXHMrXCJcblx0c3RhdGljIGVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSB7XG5cdFx0cmV0dXJuIHN0cmluZy5zcGxpdChcIlwiKS5tYXAoZnVuY3Rpb24gKGNoYXIsIGluZGV4LCBsaXN0KSB7XG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIGJhY2tzbGFzaFxuXHRcdFx0aWYgKGNoYXIgPT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCI7XG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIHNwYWNlXG5cdFx0XHRpZiAoY2hhciA9PT0gXCIgXCIpIHJldHVybiBcIlxcXFxzK1wiO1xuXHRcdFx0Ly8gSWYgYSBzcGVjaWFsIGNoYXIgYW5kIHByZXZpb3VzIGNoYXJhY3RlciB3YXMgbm90IGFuIGVzY2FwZSwgZXNjYXBlIHRoZSByZXN1bHQuXG5cdFx0XHRpZiAoUGFyc2VyLlJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlNbY2hhcl0gJiYgbGlzdFtpbmRleC0xXSAhPT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIitjaGFyO1xuXHRcdFx0Ly8gVGhpcyBjaGFyIHNob3VsZCBiZSBmaW5lIGJ5IGl0c2VsZi5cblx0XHRcdHJldHVybiBjaGFyO1xuXHRcdH0pLmpvaW4oXCJcIik7XG5cdH1cblxuXHQvLyBDcmVhdGUgYSBuZXcgcmVndWxhciBleHByZXNzaW9uIGZyb20gYSBcIm5vcm1hbFwiIHN0cmluZywgZXNjYXBpbmcgc3BlY2lhbCBjaGFyYWN0ZXJzIGFzIG5lY2Vzc2FyeS5cblx0c3RhdGljIFJlZ0V4cEZyb21TdHJpbmcoc3RyaW5nLCBmbGFncykge1xuXHRcdHJldHVybiBuZXcgUmVnRXhwKFBhcnNlci5lc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZyksIGZsYWdzKTtcblx0fVxuXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9QYXJzZXIuanMiLCIvL1xuLy9cdCMgQ29yZSBgcnVsZXNgIC0tIHNpbXBsZSBkYXRhdHlwZXMsIGV0Yy5cbi8vXG4vLyBOT1RFOiBtYW55IG9mIHRoZSBiZWxvdyBhcmUgY3JlYXRlZCBhcyBjdXN0b20gUGF0dGVybiBzdWJjbGFzc2VzIGZvciBkZWJ1Z2dpbmcuXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBgd2hpdGVzcGFjZWAgcnVsZS5cbi8vIE5PVEUgYHBhcnNlci5wYXJzZVJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIFwiICAgXCIpYCB3aWxsIHJldHVybiBgdW5kZWZpbmVkYFxuLy9cdFx0IGJlY2F1c2UgYHBhcnNlci5wYXJzZVJ1bGUoKWAgYXV0b21hdGljYWxseSBlYXRzIHdoaXRlc3BhY2UgYXQgdGhlIHN0YXJ0IG9mIGEgcnVsZS5cblJ1bGUuV2hpdGVzcGFjZSA9IGNsYXNzIHdoaXRlc3BhY2UgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge31cbnBhcnNlci5hZGRSdWxlKFwid2hpdGVzcGFjZVwiLCBuZXcgUnVsZS5XaGl0ZXNwYWNlKHsgcGF0dGVybjogL1xccysvLCBvcHRpb25hbDogdHJ1ZSB9KSk7XG5cbi8vIGBpZGVudGlmaWVyYCA9IHZhcmlhYmxlcyBvciBwcm9wZXJ0eSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGEgbG93ZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLklkZW50aWZpZXIgPSBjbGFzcyBpZGVudGlmaWVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IGlkZW50aWZpZXIgPSBwYXJzZXIuYWRkUnVsZShcImlkZW50aWZpZXJcIiwgbmV3IFJ1bGUuSWRlbnRpZmllcih7XG5cdHBhdHRlcm46IC9bYS16XVtcXHdcXC1dKi8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBpZGVudGlmaWVyKTtcblxuLy8gQWRkIEVuZ2xpc2ggcHJlcG9zaXRpb25zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy9cbi8vIFdpa2lwZWRpYSBcIlByZXBvc2l0aW9uXCI6XG4vL1x0XCJQcmVwb3NpdGlvbnMuLi5hcmUgYSBjbGFzcyBvZiB3b3JkcyB0aGF0XG4vL1x0ZXhwcmVzcyBzcGF0aWFsIG9yIHRlbXBvcmFsIHJlbGF0aW9ucyAgKGluLCB1bmRlciwgdG93YXJkcywgYmVmb3JlKVxuLy9cdG9yIG1hcmsgdmFyaW91cyBzZW1hbnRpYyByb2xlcyAob2YsIGZvcikuXG4vLyBURVNUTUVcbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFib3V0XCIsIFwiYWJvdmVcIiwgXCJhZnRlclwiLCBcImFuZFwiLCBcImFzXCIsIFwiYXRcIixcblx0XCJiZWZvcmVcIiwgXCJiZWhpbmRcIiwgXCJiZWxvd1wiLCBcImJlbmVhdGhcIiwgXCJiZXNpZGVcIiwgXCJiZXR3ZWVuXCIsIFwiYmV5b25kXCIsIFwiYnlcIixcblx0XCJkZWZpbmVkXCIsIFwiZG93blwiLCBcImR1cmluZ1wiLFxuXHRcImVhY2hcIiwgXCJlbXB0eVwiLCBcImV4YWN0bHlcIiwgXCJleGNlcHRcIixcblx0XCJmb3JcIiwgXCJmcm9tXCIsXG5cdFwiZ3JlYXRlclwiLFxuXHRcImluXCIsIFwiaW50b1wiLFxuXHRcImxlc3NcIiwgXCJsb25nXCIsXG5cdFwibWludXNcIiwgXCJtb3JlXCIsXG5cdFwibmVhclwiLCBcIm5vdFwiLFxuXHRcIm9mXCIsIFwib2ZmXCIsIFwib25cIiwgXCJvbnRvXCIsIFwib3Bwb3NpdGVcIiwgXCJvdXRcIiwgXCJvdXRzaWRlXCIsIFwib3ZlclwiLFxuXHRcInNob3J0XCIsIFwic2luY2VcIixcblx0XCJ0aGFuXCIsIFwidGhlXCIsIFwidGhlblwiLCBcInRocm91Z2hcIiwgXCJ0aHJ1XCIsIFwidG9cIiwgXCJ0b3dhcmRcIiwgXCJ0b3dhcmRzXCIsXG5cdFwidW5kZWZpbmVkXCIsIFwidW5kZXJcIiwgXCJ1bmRlcm5lYXRoXCIsIFwidW5pcXVlXCIsIFwidW50aWxcIiwgXCJ1cFwiLCBcInVwb25cIiwgXCJ1cHNpZGVcIixcblx0XCJ2ZXJzdXNcIiwgXCJ2c1wiLFxuXHRcIndpdGhcIiwgXCJ3aXRoaW5cIiwgXCJ3aXRob3V0XCIsXG4pO1xuXG4vLyBBZGQgY29tbW9uIGVuZ2xpc2ggdmVyYnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhcmVcIixcblx0XCJkb1wiLCBcImRvZXNcIixcblx0XCJjb250YWluc1wiLFxuXHRcImhhc1wiLCBcImhhdmVcIixcblx0XCJpc1wiLFxuXHRcInJlcGVhdFwiLFxuXHRcIndhc1wiLCBcIndlcmVcIlxuKTtcblxuLy8gQWRkIHNwZWNpYWwgY29udHJvbCBrZXl3b3JkcyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbnBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImVsc2VcIixcblx0XCJpZlwiLFxuXHRcIm90aGVyd2lzZVwiLFxuXHRcIndoaWxlXCJcbik7XG5cbi8vIGBUeXBlYCA9IHR5cGUgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhbiB1cHBlci1jYXNlIGxldHRlciAoPylcblJ1bGUuVHlwZSA9IGNsYXNzIHR5cGUgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcInR5cGVcIiwgbmV3IFJ1bGUuVHlwZSh7XG5cdHBhdHRlcm46IC8oW0EtWl1bXFx3XFwtXSp8dGV4dHxudW1iZXJ8aW50ZWdlcnxkZWNpbWFsfGNoYXJhY3Rlcnxib29sZWFuKS8sXG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRsZXQgdmFsdWUgPSB0aGlzLm1hdGNoZWQ7XG5cdFx0c3dpdGNoKHZhbHVlKSB7XG5cdFx0XHQvLyBzcGVjaWFsIGNhc2UgdG8gdGFrZSB0aGUgZm9sbG93aW5nIGFzIGxvd2VyY2FzZVxuXHRcdFx0Y2FzZSBcInRleHRcIjpcdFx0cmV0dXJuIFwiU3RyaW5nXCI7XG5cdFx0XHRjYXNlIFwiY2hhcmFjdGVyXCI6XHRyZXR1cm4gXCJDaGFyYWN0ZXJcIjtcblx0XHRcdGNhc2UgXCJudW1iZXJcIjpcdFx0cmV0dXJuIFwiTnVtYmVyXCI7XG5cdFx0XHRjYXNlIFwiaW50ZWdlclwiOlx0XHRyZXR1cm4gXCJJbnRlZ2VyXCI7XG5cdFx0XHRjYXNlIFwiZGVjaW1hbFwiOlx0XHRyZXR1cm4gXCJEZWNpbWFsXCI7XG5cdFx0XHRjYXNlIFwiYm9vbGVhblwiOlx0XHRyZXR1cm4gXCJCb29sZWFuXCI7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gdmFsdWUucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0XHR9XG5cdH1cbn0pKTtcblxucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHBhcnNlci5ydWxlcy50eXBlKTtcblxuXG4vLyBgbnVtYmVyYCBhcyBlaXRoZXIgZmxvYXQgb3IgaW50ZWdlciwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuUnVsZS5OdW1iZXIgPSBjbGFzcyBudW1iZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgbnVtYmVyID0gcGFyc2VyLmFkZFJ1bGUoXCJudW1iZXJcIiwgbmV3IFJ1bGUuTnVtYmVyKHtcblx0cGF0dGVybjogLy0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VGbG9hdCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG51bWJlcik7XG5cblxuLy8gTnVtZXJpYyBgaW50ZWdlcmAgb25seSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gTk9URTogdGhpcyBXSUxMIG1hdGNoIGEgZmxvYXQsIGJ1dCB0aGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBjb2VyY2UgdG8gYW4gaW50ZWdlci5cbi8vIFJFVklFVzogaXMgdGhpcyByaWdodD8gIEJldHRlciB0byBub3QgbWF0Y2ggYSBmbG9hdD9cblJ1bGUuSW50ZWdlciA9IGNsYXNzIGludGVnZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImludGVnZXJcIiwgbmV3IFJ1bGUuSW50ZWdlcih7XG5cdHBhdHRlcm46IC8tPyhbMC05XSpbLl0pP1swLTldKy8sXG5cdC8vIENvbnZlcnQgdG8gaW50ZWdlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUludCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xuXG5cbi8vIExpdGVyYWwgYHRleHRgIHN0cmluZywgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gWW91IGNhbiB1c2UgZWl0aGVyIHNpbmdsZSBvciBkb3VibGUgcXVvdGVzIG9uIHRoZSBvdXRzaWRlIChhbHRob3VnaCBkb3VibGUgcXVvdGVzIGFyZSBwcmVmZXJyZWQpLlxuLy8gUmV0dXJuZWQgdmFsdWUgaGFzIGVuY2xvc2luZyBxdW90ZXMuXG4vLyBUT0RPOiBlc2NhcGVkIHF1b3RlcyBpbnNpZGUgc3RyaW5nXG5SdWxlLlRleHQgPSBjbGFzcyB0ZXh0IGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xubGV0IHRleHQgPSBwYXJzZXIuYWRkUnVsZShcInRleHRcIiwgbmV3IFJ1bGUuVGV4dCh7XG5cdHBhdHRlcm46IC8oPzpcIlteXCJdKlwifCdbXiddKicpL1xufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHRleHQpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cblJ1bGUuQm9vbGVhbiA9IGNsYXNzIGJvb2xlYW4gZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5sZXQgYm9vbCA9IHBhcnNlci5hZGRSdWxlKFwiYm9vbGVhblwiLCBuZXcgUnVsZS5Cb29sZWFuKHtcblx0cGF0dGVybjogLyh0cnVlfGZhbHNlfHllc3xub3xva3xjYW5jZWwpXFxiLyxcblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0Y2FzZSBcInRydWVcIjpcblx0XHRcdGNhc2UgXCJ5ZXNcIjpcblx0XHRcdGNhc2UgXCJva1wiOlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cbn0pKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBib29sKTtcbi8vIEFkZCBib29sZWFuIHRva2VucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vIFRFU1RNRVxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwidHJ1ZVwiLCBcImZhbHNlXCIsXG5cdFwieWVzXCIsIFwibm9cIixcblx0XCJva1wiLCBcImNhbmNlbFwiXG4pO1xuXG4vLyBMaXRlcmFsIGxpc3QgKGFycmF5KSwgZWc6ICBgWzEsMix0cnVlLGZhbHNlIF1gXG5sZXQgbGlzdCA9IHBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpdGVyYWxfbGlzdFwiLFxuXHRcIlxcXFxbW2xpc3Q6e2V4cHJlc3Npb259LF0/XFxcXF1cIixcblx0Y2xhc3MgbGl0ZXJhbF9saXN0IGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblxuLy9UT0RPOiBzcXVpcnJlbHkuLi5cblx0XHQvLyBXaGVuIGdhdGhlcmluZyBhcmd1bWVudHMsIHJldHVybiBqdXN0IHRoZSBtYXRjaGVkIGxpc3QgZGF0YSwgaWdub3JpbmcgdGhlIGJyYWNrZXRzLlxuXHRcdGdldCByZXN1bHRzKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMubWF0Y2hlZFsxXTtcblx0XHR9XG5cblx0XHQvLyByZXR1cm4ganVzdCB0aGUgbGlzdCBhcyBvdXIgc291cmNlXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuIFx0XHRcdHJldHVybiB0aGlzLnJlc3VsdHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvblxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvblwiLFxuXHRcIlxcXFwoe2V4cHJlc3Npb259XFxcXClcIixcblx0Y2xhc3MgcGFyZW50aGVzaXplZF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiB0aGlzLm1hdGNoZWRbMV07XG5cdFx0fVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBleHByZXNzaW9uID0gdGhpcy5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gZG9uJ3QgZG91YmxlIHBhcmVucyBpZiBub3QgbmVjZXNzYXJ5XG5cdFx0XHRpZiAodHlwZW9mIGV4cHJlc3Npb24gPT09IFwic3RyaW5nXCIgJiYgZXhwcmVzc2lvbi5zdGFydHNXaXRoKFwiKFwiKSAmJiBleHByZXNzaW9uLmVuZHNXaXRoKFwiKVwiKSkgcmV0dXJuIGV4cHJlc3Npb247XG5cdFx0XHRyZXR1cm4gYCgke2V4cHJlc3Npb259KWA7XG5cdFx0fVxuXHR9XG4pXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY29yZS5qcyIsIlxuLy8gVE9ETzogY29udmVydCB0byBsaW5lLWF3YXJlIHN0cmVhbT8/P1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFN0cmVhbSB7XG5cdC8vIFlvdSBjYW4gY29uc3RydWN0IHdpdGggYSB0ZXh0IHN0cmluZyBvciBhIHNldCBvZiBwcm9wZXJ0aWVzIChpbmNsdWRpbmcgYHRleHRgKS5cblx0Y29uc3RydWN0b3IoLi4udGV4dE9yUHJvcHMpIHtcblx0XHR0ZXh0T3JQcm9wcy5mb3JFYWNoKChhcmcpID0+IHtcblx0XHRcdGlmICh0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdHRoaXMudGV4dCA9IGFyZztcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGFyZykge1xuXHRcdFx0XHRPYmplY3QuYXNzaWduKHRoaXMsIGFyZyk7XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8vIE1ha2Ugc3VyZSBgdGV4dGAgYW5kIGBzdGFydEluZGV4YCBhcmUgZGVmaW5lZC5cblx0XHRpZiAoIShcInRleHRcIiBpbiB0aGlzKSkgdGhpcy50ZXh0ID0gXCJcIjtcblx0XHRpZiAoIShcInN0YXJ0SW5kZXhcIiBpbiB0aGlzKSkgdGhpcy5zdGFydEluZGV4ID0gMDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBpbW11dGFibGUgY2xvbmUgb2YgdGhlIHN0cmVhbS5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRyZXR1cm4gbmV3IFRleHRTdHJlYW0odGhpcywgcHJvcHMpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jZWQgdG8gbmV3IHN0YXJ0SW5kZXguXG5cdGFkdmFuY2VUbyhzdGFydEluZGV4KSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4IH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jaW5nIHN0YXJ0SW5kZXggQlkgYGxlbmd0aGBcblx0YWR2YW5jZUJ5KGxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuXHR9XG5cbi8vIFx0Ly8gUmV0dXJuIGNsb25lIG9mIHRoaXMgc3RyZWFtIHdpdGggZW5kSW5kZXggc2V0IHRvIHN0YXJ0ICsgYGxlbmd0aGBcbi8vIFx0ZW5kQWZ0ZXIobGVuZ3RoKSB7XG4vLyBcdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBlbmRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuLy8gXHR9XG5cbi8vXG4vLyAjIyBNYXRjaGluZ1xuLy9cblx0Ly8gTWF0Y2ggYHBhdHRlcm5gIGFzIHJlZ2V4IGluIHRoaXMgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG1hdGNoIG9yIGB1bmRlZmluZWRgLlxuXHQvLyBJZiB5b3Ugd2FudCB0byB0ZXN0IHRoZSBzdGFydCBvZiB0aGUgc3RyZWFtLFxuXHQvL1x0bWFrZSBzdXJlIHlvdXIgcmVnZXggc3RhcnRzIHdpdGggYF5gLlxuXHQvLyBURVNUTUU6IHRoaXMgbGlrZWx5IGJyZWFrcyB3aXRoIGEgYGdgIG9uIHRoZSBwYXR0ZXJuP1xuXHRtYXRjaChwYXR0ZXJuKSB7XG5cdFx0aWYgKCEocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHRocm93IG5ldyBUeXBlRXJyb3IoYFRleHRTdHJlYW0ubWF0Y2goJHtwYXR0ZXJufSk6IGV4cGVjdGVkIFJlZ0V4cGApO1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5tYXRjaChwYXR0ZXJuKSB8fCB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBEb2VzIHRoaXMgc3RyZWFtIElOQ0xVREUgYSByZWdleCB3aXRoaW4gaXQ/XG5cdC8vIFJldHVybnMgYHRydWVgIG9yIGBmYWxzZWAuXG5cdC8vIE5PVEU6IFBhdHRlcm4gbXVzdCBOT1Qgc3RhcnQgd2l0aCBgXmAgZm9yIHRoaXMgdG8gbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLlxuXHR0ZXN0KHBhdHRlcm4pIHtcblx0XHRyZXR1cm4gcGF0dGVybi50ZXN0KHRoaXMuaGVhZCk7XG5cdH1cblxuLy9cbi8vICMjIFJlZmxlY3Rpb25cbi8vXG5cdC8vIFJldHVybiB0ZXh0IG9mIHN0cmluZyBzdGFydGluZyBhdCBvdXIgYHN0YXJ0SW5kZXhgXG5cdGdldCBoZWFkKCkge1xuXHRcdHJldHVybiB0aGlzLnJhbmdlKCk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSByYW5nZSBvZiB0aGUgc3RyaW5nIGZyb20gYHN0YXJ0SW5kZXhgIHRvIGBlbmRJbmRleGAgTk9OLWluY2x1c2l2ZS5cblx0cmFuZ2Uoc3RhcnRJbmRleCA9IHRoaXMuc3RhcnRJbmRleCwgZW5kSW5kZXggPSB0aGlzLmVuZEluZGV4IHx8IHRoaXMudGV4dC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0LnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmRJbmRleCk7XG5cdH1cblxuXHQvLyBMZW5ndGggb2YgdGhlIHN0cmVhbS5cblx0Z2V0IGxlbmd0aCgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0Lmxlbmd0aDtcblx0fVxuXG5cdC8vIEFyZSB3ZSBhdCB0aGUgZW5kIG9mIHRoZSBzdHJlYW0/XG5cdGdldCBpc0VtcHR5KCkge1xuXHRcdHJldHVybiB0aGlzLnN0YXJ0SW5kZXggPT09IHRoaXMubGVuZ3RoO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dFxuXHR9O1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1RleHRTdHJlYW0uanMiLCJpbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gbG9hZCBzdGFuZGFyZCBydWxlcyBmaWxlcyBoZXJlXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbnVtYmVyc1wiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vaWZcIjtcbmltcG9ydCBcIi4vc3RhdGVtZW50c1wiO1xuaW1wb3J0IFwiLi90eXBlc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiLy8gTWVtb2l6ZS9mb3JnZXQgc2VtYW50aWNzLlxuXG4vLyBSZXR1cm4gYSBtZW1vaXppbmcgZ2V0dGVyIGZ1bmN0aW9uLlxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXNbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGdldHRlci5hcHBseSh0aGlzKTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIERlZmluZSBzbyB0aGF0IHdlIGNhbiBiZSBkZWxldGVkIGFuZCByZS1kZWZpbmVkLCBidXQgbm90IHNldCBvciBlbnVtZXJhdGVkLlxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcGVydHksIHsgdmFsdWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXNbcHJvcGVydHldO1xuXHR9XG59XG5cblxuLy8gUmV0dXJuIGEgbWVtb2l6ZSBmdW5jdGlvbiBmb3IgdXNlIGFzIGEgZ2V0dGVyIGluIGEgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYFxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4ge1xuXHRcdGdldCA6IG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpXG5cdH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9tZW1vaXplLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiaWZcIixcblx0XCJpZiB7ZXhwcmVzc2lvbn0gKHRoZW58Oik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBpZl8gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblxuXHRcdFx0aWYgKHN0YXRlbWVudCkgcmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGlmICgke2V4cHJlc3Npb259KWBcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiYmFja3dhcmRzX2lmXCIsXG5cdFwie3N0YXRlbWVudH0gaWYge2V4cHJlc3Npb259IChlbHNlUGhyYXNlOihlbHNlfG90aGVyd2lzZSkge3N0YXRlbWVudH0pP1wiLFxuXHRjbGFzcyBiYWNrd2FyZHNfaWYgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgc3RhdGVtZW50LCBlbHNlUGhyYXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblx0XHRcdGxldCBlbHNlU3RhdGVtZW50ID0gZWxzZVBocmFzZSAmJiBlbHNlUGhyYXNlLnJlc3VsdHMuc3RhdGVtZW50LnRvU291cmNlKCk7XG5cblx0XHRcdGlmIChlbHNlU3RhdGVtZW50KSByZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9IGVsc2UgeyAke2Vsc2VTdGF0ZW1lbnR9IH1gXG5cdFx0XHRyZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZWxzZV9pZlwiLFxuXHRcIihlbHNlfG90aGVyd2lzZSkgaWYge2V4cHJlc3Npb259ICh0aGVufDopIHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBlbHNlX2lmIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGVsc2UgaWYgKCR7ZXhwcmVzc2lvbn0pYFxuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJlbHNlXCIsXG5cdFwiKGVsc2V8b3RoZXJ3aXNlKSB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZWxzZV8gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgZWxzZWBcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaWYuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBudW1iZXJzXG4vL1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vLyBUT0RPOiBpZiBgaWRlbnRpZmllcmAgaXMgXCJ3b3JkXCIsIG91dHB1dCBgZ2V0V29yZCgpYCBldGNcbmNsYXNzIGluZGV4X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb257XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgeyBpZGVudGlmaWVyLCBudW1iZXIsIGV4cHJlc3Npb24gfSA9IHRoaXMucmVzdWx0cztcblx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRudW1iZXIgPSBudW1iZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0aWYgKHR5cGVvZiBudW1iZXIgPT09IFwibnVtYmVyXCIpIHtcblx0XHRcdGlmIChudW1iZXIgPiAwKSB7XG5cdFx0XHRcdHJldHVybiBgJHtleHByZXNzaW9ufVske251bWJlciAtIDF9XWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7bnVtYmVyfSlgO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gYCR7ZXhwcmVzc2lvbn1bJHtudW1iZXJ9IC0gMV1gO1xuXG4vLyBUaGlzIGlzIHNhZmVyLCBidXQgdXNpbmcgdGhlIGFib3ZlIGZvciBkZW1vIHB1cnBvc2VzXG4vL1x0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtudW1iZXJ9KWA7XG5cdH1cbn1cblxuLy8gTnVtZXJpYyBpbmRleCBpbiBhIGxpc3QtbGlrZSB0aGluZzpcbi8vXHQtIGBpdGVtIDEgb2YgLi4uYFxuLy9cdC0gYGl0ZW0gIzIgb2YgLi4uYFxuLy8gTk9URTogdGhlc2UgaW5kaWNlcyBhcmUgT05FIGJhc2VkLCBOT1QgemVybyBiYXNlZCBhcyBpcyBKYXZhc2NyaXB0LlxucGFyc2VyLmFkZEV4cHJlc3Npb24oXCJpbmRleF9leHByZXNzaW9uXCIsIFwie2lkZW50aWZpZXJ9ICgjKT97bnVtYmVyOmV4cHJlc3Npb259IG9mIHtleHByZXNzaW9ufVwiLCBpbmRleF9leHByZXNzaW9uKTtcblxuXG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcImZpcnN0XCIsIHsgdG9Tb3VyY2U6ICgpID0+IDEgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInNlY29uZFwiLCB7IHRvU291cmNlOiAoKSA9PiAyIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJ0aGlyZFwiLCB7IHRvU291cmNlOiAoKSA9PiAzIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJmb3VydGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gNCB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwiZmlmdGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gNSB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwic2l4dGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gNiB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwic2V2ZW50aFwiLCB7IHRvU291cmNlOiAoKSA9PiA3IH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJlaWdodGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gOCB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwibmludGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gOSB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwidGVudGhcIiwgeyB0b1NvdXJjZTogKCkgPT4gMTAgfSk7XG5wYXJzZXIuYWRkU3ludGF4KFwib3JkaW5hbFwiLCBcInBlbnVsdGltYXRlXCIsIHsgdG9Tb3VyY2U6ICgpID0+IC0yIH0pO1xucGFyc2VyLmFkZFN5bnRheChcIm9yZGluYWxcIiwgXCJmaW5hbFwiLCB7IHRvU291cmNlOiAoKSA9PiAtMSB9KTtcbnBhcnNlci5hZGRTeW50YXgoXCJvcmRpbmFsXCIsIFwibGFzdFwiLCB7IHRvU291cmNlOiAoKSA9PiAtMSB9KTtcblxuLy8gVE9ETzogc2l4dHktZmlmdGgsIHR3byBodW5kcmVkIGZvcnR5IG5pbnRoLi4uXG5cbi8vIEFsdGVybmF0aXZlIGZvcm0gZm9yIG51bWVyaWMgaW5kZXggaW4gYSBsaXN0LWxpa2UgdGhpbmcuXG4vLyBOT1RFOiBkb24ndCBhZGQgYXMgYW4gZXhwcmVzc2lvbiBzaW5jZSB3ZSdyZSBhdXRvLW1lcmdlZCB3aXRoIGBpbmRleF9leHByZXNzaW9uYCBhYm92ZS5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFwiaW5kZXhfZXhwcmVzc2lvblwiLCBcInRoZSB7bnVtYmVyOm9yZGluYWx9IHtpZGVudGlmaWVyfSBvZiB7ZXhwcmVzc2lvbn1cIiwgaW5kZXhfZXhwcmVzc2lvbik7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9udW1iZXJzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBpbmZpeCBhbmQgcHJlZml4IG9wZXJhdG9ycy5cbi8vXG5cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyMjIEluZml4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPiB7cmhzfWAsIGVnOiBgYSBpcyAxYFxuLy8gTk9URTogYG9wZXJhdG9yLnRvSlNgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyB0d28gYXJndW1lbnRzIChgbGhzYCBhbmQgYHJoc2ApIGludG8gb3V0cHV0LlxuXG4vLyBOT1RFOiBgcHJlY2VkZW5jZWAgbnVtYmVycyBjb21lIGZyb20gSmF2YXNjcmlwdCBlcXVpdmFsZW50c1xuLy9cdFx0IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL09wZXJhdG9ycy9PcGVyYXRvcl9QcmVjZWRlbmNlXG5cbmNsYXNzIGluZml4X29wZXJhdG9yIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXMge1xuXG4vLyBOT1RFOiBGb3IgdGhlIG9wZXJhdG9ycyB0aGVtc2VsdmVzLCB3ZSByZWFsbHkgd2FudCB0byBqdXN0IHVzZSBsb25nZXN0IG1hdGNoLlxuLy8gXHRcdCBXZSB3YW50IHRvIHB1c2ggdGhlIHByZWNlZGVuY2UgdXAgdG8gdGhlIGV4cHJlc3Npb24gYW5kIGV2YWx1YXRlIGRpZmZlcmVudCBleHByZXNzaW9ucyBiYXNlZCBvbiB0aGF0LlxuLy8gXHQvLyBGaW5kIGJlc3QgbWF0Y2ggYWNjb3JkaW5nIHRvIG9wZXJhdG9yIHByZWNlZGVuY2UgYXMgZGVmaW5lZCBiZWxvdy5cbi8vIFx0Z2V0QmVzdE1hdGNoKG1hdGNoZXMpIHtcbi8vIFx0XHRjb25zb2xlLndhcm4oXCJHQk1cIiwgbWF0Y2hlcywgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gucHJlY2VkZW5jZSksIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLm1hdGNoZWRUZXh0KSk7XG4vLyBcdFx0cmV0dXJuIG1hdGNoZXMucmVkdWNlKGZ1bmN0aW9uIChiZXN0LCBuZXh0KSB7XG4vLyBcdFx0XHQvLyB0YWtlIGhpZ2hlc3QgcHJlY2VkZW5jZSBtYXRjaCBmaXJzdFxuLy8gXHRcdFx0aWYgKG5leHQucHJlY2VkZW5jZSA+IGJlc3QucHJlY2VkZW5jZSkgcmV0dXJuIG5leHQ7XG4vLyBcdFx0XHQvLyB0YWtlIGxvbmdlc3QgbWF0Y2ggaWYgc2FtZSBwcmVjZWRlbmNlXG4vLyBcdFx0XHRpZiAobmV4dC5wcmVjZWRlbmNlID09PSBiZXN0LnByZWNlZGVuY2UpIHtcbi8vIFx0XHRcdFx0aWYgKG5leHQuZW5kSW5kZXggPiBiZXN0LmVuZEluZGV4KSByZXR1cm4gbmV4dDtcbi8vIFx0XHRcdH1cbi8vIFx0XHRcdHJldHVybiBiZXN0O1xuLy8gXHRcdH0sIG1hdGNoZXNbMF0pO1xuLy8gXHR9XG59XG5cbnBhcnNlci5hZGRSdWxlKFwiaW5maXhfb3BlcmF0b3JcIiwgbmV3IGluZml4X29wZXJhdG9yKCkpO1xuXG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImFuZFwiLCBcImFuZFwiLCB7IHByZWNlZGVuY2U6IDYsIHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gJiYgJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwib3JcIiwgXCJvclwiLCB7IHByZWNlZGVuY2U6IDUsIHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gfHwgJHtifSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc1wiLCBcImlzXCIsIHsgcHJlY2VkZW5jZTogMTAsIHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfbm90XCIsIFwiaXMgbm90XCIsIHsgcHJlY2VkZW5jZTogMTAsIHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT0gJHtifSlgIH19KTtcblxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19leGFjdGx5XCIsIFwiaXMgZXhhY3RseVwiLCB7IHByZWNlZGVuY2U6IDEwLCB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09PSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RfZXhhY3RseVwiLCBcImlzIG5vdCBleGFjdGx5XCIsIHsgcHJlY2VkZW5jZTogMTAsIHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT09ICR7Yn0pYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzT2ZUeXBlKHRoaW5nLCB0eXBlKWBcbi8vVE9ETzogYGlzIHNhbWUgdHlwZSBhc2AgP1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc190eXBlX29mXCIsIFtcImlzIGFcIiwgXCJpcyBhblwiXSwgeyBwcmVjZWRlbmNlOiAxMSwgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImlzX25vdF90eXBlX29mXCIsIFtcImlzIG5vdCBhXCIsIFwiaXMgbm90IGFuXCJdLCB7IHByZWNlZGVuY2U6IDExLCB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmNvbnRhaW5zKGNvbGxlY3Rpb24sIHRoaW5nKWBcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaXNfaW5cIiwgW1wiaXMgaW5cIiwgXCJpcyBvbmUgb2ZcIl0sIHsgcHJlY2VkZW5jZTogMTEsIHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJpc19ub3RfaW5cIiwgW1wiaXMgbm90IGluXCIsIFwiaXMgbm90IG9uZSBvZlwiXSwgeyBwcmVjZWRlbmNlOiAxMSwgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfX0pO1xuLy9URVNUTUVcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiaW5jbHVkZXNcIiwgW1wiaW5jbHVkZXNcIiwgXCJjb250YWluc1wiXSwgeyBwcmVjZWRlbmNlOiAxMSwgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcImRvZXNudF9pbmNsdWRlXCIsIFtcImRvZXMgbm90IGluY2x1ZGVcIiwgXCJkb2VzbnQgaW5jbHVkZVwiLCBcImRvZXMgbm90IGNvbnRhaW5cIiwgXCJkb2VzbnQgY29udGFpblwiXSwgeyBwcmVjZWRlbmNlOiAxMSwgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9fSk7XG5cbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZ3RcIiwgW1wiPlwiLCBcImlzIGdyZWF0ZXIgdGhhblwiXSwgeyBwcmVjZWRlbmNlOiAxMSwgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwiZ3RlXCIsIFtcIj49XCIsIFwiaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvXCJdLCB7IHByZWNlZGVuY2U6IDExLCB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibHRcIiwgW1wiPFwiLCBcImlzIGxlc3MgdGhhblwiXSwgeyBwcmVjZWRlbmNlOiAxMSwgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDwgJHtifSlgIH19KTtcbnBhcnNlci5hZGRJbmZpeE9wZXJhdG9yKFwibHRlXCIsIFtcIjw9XCIsIFwiaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvXCJdLCB7IHByZWNlZGVuY2U6IDExLCB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPD0gJHtifSlgIH19KTtcblxuLy9UT0RPOiAgY2FuJ3QgYWRkIGArYCBhcyBhIHJ1bGUsIGZpeCB0aGlzIHRoZW4gYWRkIHRoZXNlXG4vL1RPRE86ICBvcGVyYXRvciBwcmVjZWRlbmNlPz8/XG4vL1RFU1RNRVxucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJwbHVzXCIsIFtcIlxcXFwrXCIsIFwicGx1c1wiXSwgeyBwcmVjZWRlbmNlOiAxMywgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKyAke2J9YCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcIm1pbnVzXCIsIFtcIi1cIiwgXCJtaW51c1wiXSwgeyBwcmVjZWRlbmNlOiAxMywgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLSAke2J9YCB9fSk7XG5wYXJzZXIuYWRkSW5maXhPcGVyYXRvcihcInRpbWVzXCIsIFtcIlxcXFwqXCIsIFwidGltZXNcIl0sIHsgcHJlY2VkZW5jZTogMTQsIHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICogJHtifWAgfX0pO1xucGFyc2VyLmFkZEluZml4T3BlcmF0b3IoXCJkaXZpZGVkX2J5XCIsIFtcIi9cIiwgXCJkaXZpZGVkIGJ5XCJdLCB7IHByZWNlZGVuY2U6IDE0LCB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH19KTtcblxuLy9UT0RPOiAgYCs9YCBldGM/ICBvdGhlciBtYXRoIGZ1bmN0aW9ucz9cblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwiaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntsaHM6ZXhwcmVzc2lvbn0ge29wZXJhdG9yOmluZml4X29wZXJhdG9yfSB7cmhzOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGluZml4X29wZXJhdG9yX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuLy9cdFx0dGVzdFJ1bGUgPSBcImluZml4X29wZXJhdG9yXCI7XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaHMsIHJocywgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGxocy50b1NvdXJjZShjb250ZXh0KSwgcmhzLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIyMgUG9zdGlmeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj5gLCBlLmcuIGBhIGlzIGRlZmluZWRgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBKUyBvdXRwdXQuXG5cbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19kZWZpbmVkXCIsIFwiaXMgZGVmaW5lZFwiLCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ICE9PSAndW5kZWZpbmVkJylgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19ub3RfZGVmaW5lZFwiLCBbXCJpcyBub3QgZGVmaW5lZFwiLCBcImlzIHVuZGVmaW5lZFwiXSwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9fSk7XG5cbi8vVE9ETzogYHNwZWxsLmlzRW1wdHkodGhpbmcpYFxucGFyc2VyLmFkZFBvc3RmaXhPcGVyYXRvcihcImlzX2VtcHR5XCIsIFwiaXMgZW1wdHlcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH19KTtcbnBhcnNlci5hZGRQb3N0Zml4T3BlcmF0b3IoXCJpc19ub3RfZW1wdHlcIiwgXCJpcyBub3QgZW1wdHlcIiwgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9fSk7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeF9vcGVyYXRvcn1cIixcblx0Y2xhc3MgcG9zdGZpeF9vcGVyYXRvcl9leHByZXNpb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRlc3RSdWxlID0gXCJwb3N0Zml4X29wZXJhdG9yXCI7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB0aGlzIHNob3VsZCByZWFsbHkgYmUgYSBnZW5lcmFsIFwiZXhwcmVzc2lvblwiLi4uXG4vL3BhcnNlci5hZGRTeW50YXgoXCJvcGVyYXRvcl9leHByZXNzaW9uXCIsIFwiKGV4cHJlc3Npb246e3Bvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvbn18e2luZml4X29wZXJhdG9yX2V4cHJlc3Npb259KVwiKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vXG4vL1x0IyMgUmV0dXJuc1xuLy9cblxuLy8gUmV0dXJuIGEgdmFsdWVcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwicmV0dXJuX3N0YXRlbWVudFwiLCBcInJldHVybiB7ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcmV0dXJuX3N0YXRlbWVudCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gYHJldHVybiAke2V4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCl9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vL1xuLy9cdCMjIEFzc2lnbm1lbnRcbi8vXG5jbGFzcyBhc3NpZ25tZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnR7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgeyB0aGluZywgdmFsdWUgfSA9IHRoaXMucmVzdWx0cztcblx0XHRpZiAodGhpbmcgaW5zdGFuY2VvZiBSdWxlLklkZW50aWZpZXIpIHtcblx0XHRcdC8vIFRPRE86IGRlY2xhcmUgaWRlbnRpZmllciBpZiBub3QgaW4gc2NvcGUsIGV0Y1xuXHRcdH1cblxuXHRcdHJldHVybiBgJHt0aGluZy50b1NvdXJjZShjb250ZXh0KX0gPSAke3ZhbHVlLnRvU291cmNlKGNvbnRleHQpfWA7XG5cdH1cbn1cblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsIFwie3RoaW5nOmV4cHJlc3Npb259ID0ge3ZhbHVlOmV4cHJlc3Npb259XCIsIGFzc2lnbm1lbnQpO1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsIFwic2V0IHt0aGluZzpleHByZXNzaW9ufSB0byB7dmFsdWU6ZXhwcmVzc2lvbn1cIiwgYXNzaWdubWVudCk7XG5cblxuLy9cbi8vXHQjIyBVc2VyIGludGVyYWN0aW9uXG4vL1xuXG4vLyBBbGVydCBhIG1lc3NhZ2UuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFsZXJ0XCIsIFwiYWxlcnQge21lc3NhZ2U6ZXhwcmVzc2lvbn0gKGJ1dHRvbkNsYXVzZTp3aXRoIHt0ZXh0fSk/XCIsXG5cdGNsYXNzIGFsZXJ0IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG1lc3NhZ2UsIGJ1dHRvbkNsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bWVzc2FnZSA9IG1lc3NhZ2UudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgYnV0dG9uTmFtZSA9IGJ1dHRvbkNsYXVzZSA/IGJ1dHRvbkNsYXVzZS5yZXN1bHRzLnRleHQudG9Tb3VyY2UoY29udGV4dCkgOiAnXCJPS1wiJztcblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwuYWxlcnQoJHttZXNzYWdlfSwgJHtidXR0b25OYW1lfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gV2FybmluZyBtZXNzYWdlIC0tIGxpa2UgYWxlcnQgYnV0IGZhbmNpZXIuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcIndhcm5cIiwgXCJ3YXJuIHtleHByZXNzaW9uOmV4cHJlc3Npb259IChidXR0b25DbGF1c2U6d2l0aCB7dGV4dH0pP1wiLFxuXHRjbGFzcyB3YXJuIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG1lc3NhZ2UsIGJ1dHRvbkNsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bWVzc2FnZSA9IG1lc3NhZ2UudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgYnV0dG9uTmFtZSA9IGJ1dHRvbkNsYXVzZSA/IGJ1dHRvbkNsYXVzZS5yZXN1bHRzLnRleHQudG9Tb3VyY2UoY29udGV4dCkgOiAnXCJPS1wiJztcblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwud2Fybigke21lc3NhZ2V9LCAke2J1dHRvbk5hbWV9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIENvbmZpcm0gbWVzc2FnZSAtLSBwcmVzZW50IGEgcXVlc3Rpb24gd2l0aCB0d28gYW5zd2Vycy5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiY29uZmlybVwiLCBcImNvbmZpcm0ge21lc3NhZ2U6ZXhwcmVzc2lvbn0gKGJ1dHRvbkNsYXVzZTp3aXRoIHtva0J1dHRvbjp0ZXh0fSAoY2FuY2VsQ2xhdXNlOiAoYW5kfG9yKSB7Y2FuY2VsQnV0dG9uOnRleHR9KT8gKT9cIixcblx0Y2xhc3MgY29uZmlybSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBidXR0b25DbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IG9rQnV0dG9uID0gJ1wiT0tcIicsIGNhbmNlbEJ1dHRvbiA9ICdcIkNhbmNlbFwiJztcblxuXHRcdFx0aWYgKGJ1dHRvbkNsYXVzZSkge1xuXHRcdFx0XHRva0J1dHRvbiA9IGJ1dHRvbkNsYXVzZS5yZXN1bHRzLm9rQnV0dG9uLnJlc3VsdHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRcdGxldCBjYW5jZWxDbGF1c2UgPSBidXR0b25DbGF1c2UucmVzdWx0cy5jYW5jZWxDbGF1c2U7XG5cdFx0XHRcdGlmIChjYW5jZWxDbGF1c2UpIGNhbmNlbEJ1dHRvbiA9IGNhbmNlbENsYXVzZS5yZXN1bHRzLmNhbmNlbEJ1dHRvbi5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGBhd2FpdCBzcGVsbC5jb25maXJtKCR7bWVzc2FnZX0sICR7b2tCdXR0b259LCAke2NhbmNlbEJ1dHRvbn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvc3RhdGVtZW50cy5qcyIsImltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5pbXBvcnQgXCIuL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vcnVsZXMvaW5kZXguanNcIjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdHdpbmRvdy5UZXh0U3RyZWFtID0gVGV4dFN0cmVhbTtcblx0d2luZG93LlBhcnNlciA9IFBhcnNlcjtcblx0d2luZG93LlJ1bGUgPSBSdWxlO1xuXHR3aW5kb3cucGFyc2VyID0gcGFyc2VyO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7XG5cdFRleHRTdHJlYW0sIFBhcnNlciwgUnVsZSwgcGFyc2VyXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9pbmRleC5qcyJdLCJzb3VyY2VSb290IjoiIn0=