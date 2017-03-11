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
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
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


var _Parser = __webpack_require__(6);

var _Parser2 = _interopRequireDefault(_Parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Rule = function () {
	function Rule(properties) {
		_classCallCheck(this, Rule);

		Object.assign(this, properties);
	}

	// Clone this rule and add any `props` passed in.


	_createClass(Rule, [{
		key: "clone",
		value: function clone(props) {
			var clone = Object.create(this);
			Object.assign(clone, props);
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
		// ## output as source
		//
		// Output value for this INSTANTIATED rule as source.

	}, {
		key: "toSource",
		value: function toSource() {
			return this.matched;
		}

		//
		// ## group: reflection
		//

	}, {
		key: "ruleType",
		get: function get() {
			return this.constructor.name;
		}
	}]);

	return Rule;
}();

exports.default = Rule;

;

// Rule for literal string value, which include punctuation such as `(` etc.
Rule.String = function (_Rule) {
	_inherits(String, _Rule);

	function String() {
		_classCallCheck(this, String);

		return _possibleConstructorReturn(this, (String.__proto__ || Object.getPrototypeOf(String)).apply(this, arguments));
	}

	_createClass(String, [{
		key: "parse",

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
		key: "toString",
		value: function toString() {
			return this.string;
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
		key: "parse",
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
		key: "toString",
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
			_this3.pattern = new RegExp("^" + _this3.keyword + "\\b");
		}
		return _this3;
	}

	_createClass(Keyword, [{
		key: "toString",
		value: function toString() {
			return this.keyword;
		}
	}]);

	return Keyword;
}(Rule.Pattern);

// Subrule -- name of another rule to be called.
// `rule.name` is the name of the rule in `parser.rules`.
Rule.Subrule = function (_Rule3) {
	_inherits(Subrule, _Rule3);

	function Subrule() {
		_classCallCheck(this, Subrule);

		return _possibleConstructorReturn(this, (Subrule.__proto__ || Object.getPrototypeOf(Subrule)).apply(this, arguments));
	}

	_createClass(Subrule, [{
		key: "parse",
		value: function parse(parser, stream) {
			var rule = parser.getRule(this.rule);
			if (!rule) throw new SyntaxError("Attempting to parse unknown rule '" + this.name + "'", this);
			var result = rule.parse(parser, stream);
			if (!result) return undefined;

			if (this.argument) result.argument = this.argument;
			return result;
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
		key: "parse",

		// Throws of mandatory rule can't be matched.
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
		key: "gatherArguments",
		value: function gatherArguments() {
			if (!this.results) return undefined;
			var args = {};
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = this.results[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var next = _step2.value;

					var ruleName = next.argument || next.ruleName || next.constructor.name;
					// For nested rules, recurse to get their arguments
					var result = next instanceof Rule.Nested ? next.gatherArguments() : next;

					if (ruleName in args) {
						if (!Array.isArray(args[ruleName])) args[ruleName] = [args[ruleName]];
						args[ruleName].push(result);
					} else {
						args[ruleName] = result;
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
	}, {
		key: "toString",
		value: function toString() {
			return "" + this.rules.join(" ") + (this.optional ? '?' : '');
		}
	}]);

	return Sequence;
}(Rule.Nested);

// Syntactic sugar for debugging
Rule.Expression = function (_Rule$Sequence) {
	_inherits(Expression, _Rule$Sequence);

	function Expression() {
		_classCallCheck(this, Expression);

		return _possibleConstructorReturn(this, (Expression.__proto__ || Object.getPrototypeOf(Expression)).apply(this, arguments));
	}

	return Expression;
}(Rule.Sequence);
Rule.Statement = function (_Rule$Sequence2) {
	_inherits(Statement, _Rule$Sequence2);

	function Statement() {
		_classCallCheck(this, Statement);

		return _possibleConstructorReturn(this, (Statement.__proto__ || Object.getPrototypeOf(Statement)).apply(this, arguments));
	}

	return Statement;
}(Rule.Sequence);

// Alternative syntax.
// NOTE: Currently takes the first valid match.
// TODO: match all valid alternatives
// TODO: rename
Rule.Alternatives = function (_Rule$Nested2) {
	_inherits(Alternatives, _Rule$Nested2);

	function Alternatives() {
		_classCallCheck(this, Alternatives);

		return _possibleConstructorReturn(this, (Alternatives.__proto__ || Object.getPrototypeOf(Alternatives)).apply(this, arguments));
	}

	_createClass(Alternatives, [{
		key: "parse",
		value: function parse(parser, stream) {
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = this.rules[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var rule = _step3.value;

					var match = rule.parse(parser, stream);
					if (match) {
						if (this.argument) match.argument = this.argument;
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
		}
	}, {
		key: "addRule",
		value: function addRule(rule) {
			this.rules.push(rule);
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
		key: "parse",
		value: function parse(parser, stream) {
			var next = stream;
			var results = [];
			while (true) {
				next = parser.eatWhitespace(next);
				var result = this.rule.parse(parser, next);
				if (!result) break;

				results.push[result];
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
		key: "toSource",
		value: function toSource() {
			throw "Don't understand how to source Rule.Repeat!";
		}
	}, {
		key: "toString",
		value: function toString() {
			return "" + this.rule + (this.optional ? '*' : '+');
		}
	}]);

	return Repeat;
}(Rule.Nested);

// List match rule:   `[<item><delimiter>]`. eg" `[{literal},]` to match `a,b,c`
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
		key: "parse",
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
		key: "getItem",
		value: function getItem(index) {
			if (!this.results) return undefined;
			return this.results[index];
		}
	}, {
		key: "toSource",
		value: function toSource() {
			if (!this.results) return undefined; // TODO: throw???
			var results = this.results.map(function (result) {
				return result.toSource();
			}).join(", ");
			return "[" + results + "]";
		}
	}, {
		key: "toString",
		value: function toString() {
			return "[" + (this.argument ? this.argument + ":" : "") + this.item + " " + this.delimiter + "]";
		}
	}]);

	return List;
}(Rule);

//
//	# Parsing `ruleSyntax` to create rules automatically.
//
// TODO:	Pull `parseRuleSyntax` stuff out into separate module?
// TODO:	Better name for `ruleSyntax`
Object.assign(Rule, {

	//
	// ## group: parsing syntax
	//

	// TODO: convert to TextStream pattern ala normal parser once that settles down???
	parseRuleSyntax: function parseRuleSyntax(syntax) {
		var SequenceConstructor = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Rule.Sequence;

		var syntaxStream = Rule.tokeniseRuleSyntax(syntax);
		var rules = Rule.parseRuleSyntax_tokens(syntaxStream, []);

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
			var _Rule$parseRuleSyntax = Rule.parseRuleSyntax_token(syntaxStream, rules, startIndex),
			    _Rule$parseRuleSyntax2 = _slicedToArray(_Rule$parseRuleSyntax, 2),
			    rule = _Rule$parseRuleSyntax2[0],
			    endIndex = _Rule$parseRuleSyntax2[1];

			if (endIndex >= lastIndex) throw new SyntaxError("Past lastIndex");
			if (rule) rules.push(rule);
			startIndex = endIndex + 1;
		}
		return rules;
	},
	parseRuleSyntax_token: function parseRuleSyntax_token(syntaxStream, rules) {
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

		var syntaxToken = syntaxStream[startIndex];

		switch (syntaxToken) {
			case "{":
				return Rule.parseRuleSyntax_subrule(syntaxStream, rules, startIndex);
			case "(":
				return Rule.parseRuleSyntax_parentheses(syntaxStream, rules, startIndex);
			case "[":
				return Rule.parseRuleSyntax_list(syntaxStream, rules, startIndex);
			case "|":
				return Rule.parseRuleSyntax_alternatives(syntaxStream, rules, startIndex);
			case "*":
			case "+":
			case "?":
				return Rule.parseRuleSyntax_repeat(syntaxStream, rules, startIndex);

			// the following should ALWAYS be consumed by the above
			case "}":
			case ")":
			case "]":
				throw new SyntaxError("Unexpected " + syntaxToken + " found as item " + startIndex + " of " + this.syntax);

			default:
				return Rule.parseRuleSyntax_string(syntaxStream, rules, startIndex);
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
			rule = new Rule.Keyword({ keyword: string });
		}
		// Otherwise match as a String, which doesn't require non-word chars after the text.
		else {
				rule = new Rule.String({ string: string });
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


	// Match grouping expression `(...)` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
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

		var rule = void 0;
		var results = Rule.parseRuleSyntax_tokens(slice, []);
		// Single result means optional expression
		if (results.length === 1) {
			rule = results[0];
			if (!(rule instanceof Rule.Alternatives)) rule.optional = true;
		} else {
			rule = new Rule.Sequence({ rules: results });
		}
		if (argument) rule.argument = argument;

		return [rule, endIndex];
	},


	// Match repeat indicator `?`, `+` or `*` by attaching it to the previous rule.
	parseRuleSyntax_repeat: function parseRuleSyntax_repeat(syntaxStream, rules, startIndex) {
		var symbol = syntaxStream[startIndex];
		var rule = rules[rules.length - 1];
		if (!rule) throw new SyntaxError("Can't attach repeat symbol " + symbol + " to empty rule!");

		// Transform last rule into a repeat for `*` and `+`.
		if (symbol === "*" || symbol === "+") {
			rule = new Rule.Repeat({ rule: rule });
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
		var rule = new Rule.Subrule({ rule: match.slice[0] });
		if (argument) rule.argument = argument;
		return [rule, match.endIndex];
	},


	// Match list expression `[<item><delimiter>]` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_list: function parseRuleSyntax_list(syntaxStream, rules, startIndex) {
		var _Parser$findNestedTok2 = _Parser2.default.findNestedTokens(syntaxStream, "[", "]", startIndex),
		    endIndex = _Parser$findNestedTok2.endIndex,
		    slice = _Parser$findNestedTok2.slice;

		var argument = void 0;
		if (slice.length > 2 && slice[1] === ":") {
			argument = slice[0];
			slice = slice.slice(2);
		}

		var results = Rule.parseRuleSyntax_tokens(slice, []);
		if (results.length !== 2) {
			throw new SyntaxError("Unexpected stuff at end of list: [" + slice.join(" ") + "]");
		}
		var rule = new Rule.List();
		rule.item = results[0];
		rule.delimiter = results[1];
		if (argument) rule.argument = argument;
		return [rule, endIndex];
	},


	// Match alternate `( a | b | c )`.
	// NOTE: this should only happen inside a group...
	parseRuleSyntax_alternatives: function parseRuleSyntax_alternatives(syntaxStream, rules, startIndex) {
		var _Rule$parseRuleSyntax3 = Rule.parseRuleSyntax_token(syntaxStream, rules, startIndex + 1),
		    _Rule$parseRuleSyntax4 = _slicedToArray(_Rule$parseRuleSyntax3, 2),
		    rule = _Rule$parseRuleSyntax4[0],
		    endIndex = _Rule$parseRuleSyntax4[1];

		// create alternates rule with lastToken, or re-use existing alternates rile


		var alternates = void 0;
		var lastToken = rules.pop();
		if (lastToken instanceof Rule.Alternatives) {
			alternates = lastToken;
		} else {
			alternates = new Rule.Alternatives({ rules: [] });

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

var _Parser = __webpack_require__(6);

var _Parser2 = _interopRequireDefault(_Parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// TODO: convert to line-aware stream???
var TextStream = function () {
	function TextStream(textOrProps) {
		_classCallCheck(this, TextStream);

		if (typeof textOrProps === "string") this.text = textOrProps;else Object.assign(this, textOrProps);
		if (!this.startIndex) this.startIndex = 0;
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
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _parser = __webpack_require__(1);

var _parser2 = _interopRequireDefault(_parser);

var _rules = __webpack_require__(4);

var _rules2 = _interopRequireDefault(_rules);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _parser2.default;

// load standard rules files here

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _Rule = __webpack_require__(0);

var _Rule2 = _interopRequireDefault(_Rule);

var _parser = __webpack_require__(1);

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

//
// Regex pattern rules with custom constructors for debugging
//
//parser.addPattern("whitespace", /^\s+/);
_parser2.default.addRule("whitespace", new (function (_Rule$Pattern) {
	_inherits(whitespace, _Rule$Pattern);

	function whitespace() {
		_classCallCheck(this, whitespace);

		return _possibleConstructorReturn(this, (whitespace.__proto__ || Object.getPrototypeOf(whitespace)).apply(this, arguments));
	}

	return whitespace;
}(_Rule2.default.Pattern))({ pattern: /^\s+/, optional: true }));

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
//parser.addPattern("identifier", /^[a-z][\w\d\-_]*/);
_parser2.default.addRule("identifier", new (function (_Rule$Pattern2) {
	_inherits(identifier, _Rule$Pattern2);

	function identifier() {
		_classCallCheck(this, identifier);

		return _possibleConstructorReturn(this, (identifier.__proto__ || Object.getPrototypeOf(identifier)).apply(this, arguments));
	}

	return identifier;
}(_Rule2.default.Pattern))({ pattern: /^[a-z][\w\-]*/ }));

// `Type` = type name.
// MUST start with an upper-case letter (?)
//parser.addPattern("typename", /^[A-Z][\w\d\-_]*/);
_parser2.default.addRule("Type", new (function (_Rule$Pattern3) {
	_inherits(Type, _Rule$Pattern3);

	function Type() {
		_classCallCheck(this, Type);

		return _possibleConstructorReturn(this, (Type.__proto__ || Object.getPrototypeOf(Type)).apply(this, arguments));
	}

	return Type;
}(_Rule2.default.Pattern))({ pattern: /^[A-Z][\w\-]*/ }));

// Numeric literal (either float or integer), created with custom constructor for debugging.
_parser2.default.addRule("number", new (function (_Rule$Pattern4) {
	_inherits(number, _Rule$Pattern4);

	function number() {
		_classCallCheck(this, number);

		return _possibleConstructorReturn(this, (number.__proto__ || Object.getPrototypeOf(number)).apply(this, arguments));
	}

	return number;
}(_Rule2.default.Pattern))({
	pattern: /^-?\d+(?:\.\d+)?/,
	toSource: function toSource(context) {
		return parseFloat(this.matched, 10);
	}
}));

// Literal `text` string, created with custom constructor for debugging.
// Returned value has enclosing quotes.
_parser2.default.addRule("text", new (function (_Rule$Pattern5) {
	_inherits(text, _Rule$Pattern5);

	function text() {
		_classCallCheck(this, text);

		return _possibleConstructorReturn(this, (text.__proto__ || Object.getPrototypeOf(text)).apply(this, arguments));
	}

	return text;
}(_Rule2.default.Pattern))({
	pattern: /^(?:"[^"]*"|'[^']*')/
}));

// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
_parser2.default.addRule("boolean", new (function (_Rule$Pattern6) {
	_inherits(boolean, _Rule$Pattern6);

	function boolean() {
		_classCallCheck(this, boolean);

		return _possibleConstructorReturn(this, (boolean.__proto__ || Object.getPrototypeOf(boolean)).apply(this, arguments));
	}

	return boolean;
}(_Rule2.default.Pattern))({
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

//
// Rules auto-derived from our `rule syntax`.
//

// Literal value as number, text or boolean.
_parser2.default.addSyntax("literal", "(literal:{number}|{text}|{boolean})");

// Literal list (array), eg:  `[1,2,true,false ]`
_parser2.default.addSyntax("literal-list", "\\[[list:{literal},]?\\]", {
	// Modify `arguments` of this expression to just the list returned.
	gatherArguments: function gatherArguments() {
		var args = _Rule2.default.Sequence.prototype.gatherArguments.apply(this);
		if (!args) return undefined;
		return args.list;
	},
	toSource: function toSource(context) {
		var list = this.gatherArguments();
		return list.toSource();
	}
});

_parser2.default.addSyntax("scope-modifier", "(scope:global|constant|shared)");

_parser2.default.addStatement("declare-property", "{scope-modifier}? {identifier} = {literal}", {
	toSource: function toSource(context) {
		var args = this.gatherArguments();
		var statement = args.identifier.toSource() + " = " + args.literal.toSource() + ";";

		var scope = args.scope ? args.scope.toSource() : "local";
		switch (scope) {
			case "global":
				return "global." + statement;

			case "constant":
				return "const " + statement;

			case "shared":
				return "static " + statement;

			default:
				return statement;
		}
	}
});

// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
_parser2.default.addStatement("declare-property-as-one-of", "{identifier} as one of {list:literal-list}", {
	toSource: function toSource(context) {
		var args = this.gatherArguments();

		var identifier = args.identifier.toSource();
		var plural = (identifier + "_VALUES").toUpperCase();
		var values = args.list.toSource();
		var first = args.list.results[0];
		var firstValue = first ? first.toSource() : "undefined";

		return "static " + plural + " = " + values + ";\n" + ("get " + identifier + " { return (\"__" + identifier + "\" in this ? this.__" + identifier + " : " + firstValue + ") }\n") + ("set " + identifier + "(value) { if (this.constructor." + plural + ".includes(value)) this.__" + identifier + " = value }\n");
	}
});

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _TextStream = __webpack_require__(2);

var _TextStream2 = _interopRequireDefault(_TextStream);

var _Parser = __webpack_require__(6);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(0);

var _Rule2 = _interopRequireDefault(_Rule);

var _index = __webpack_require__(3);

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
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // Spell "English" parser strawman

// TODO:	custom SyntaxError etc which understand streams
// TODO:	add same named rule = make alternatives
// TODO:	`statement` vs `expression` vs `control structure` etc -- are these just named rules?
// TODO:	break `file` into lines and process each (incl. substr/match not going beyond the end)
// TODO:	nesting -- is this just indent = "add block scope"
// TODO:	promotion pattern for gather arguments (eg: literal-list)
// TODO:	What does syntax tree look like?  How do we extract meaning out of the nest?
// TODO:	Don't use `toJSON` for outputting rule...
// TODO:	Recycle word/string/pattern rules to more easily see commonality...
// TODO:	Pass `context` to toSource(), add property descriptors to `class`, variables and code to `method`, `global` stuff etc

var _TextStream = __webpack_require__(2);

var _TextStream2 = _interopRequireDefault(_TextStream);

var _Rule = __webpack_require__(0);

var _Rule2 = _interopRequireDefault(_Rule);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Parser = function () {
	function Parser(properties) {
		_classCallCheck(this, Parser);

		Object.assign(this, properties);
		// Clone rules, starting with a completely empty map if not defined (no standard object keys)
		this.rules = Object.create(this.rules || null);
	}

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
			if (this.rules[name]) console.warn("Overwriting rule " + name + " old: ", this.rules[name], "new: ", rule);
			rule.ruleName = name;
			this.rules[name] = rule;
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
				console.log("Added rule '" + name + "':\n  INPUT: " + ruleSyntax + " \n OUTPUT: " + rule);

				Object.assign(rule, properties);
				return this.addRule(name, rule);
			} catch (e) {
				console.group("Error parsing syntax for rule '" + name + "':");
				console.log("syntax: " + ruleSyntax);
				console.error(e);
				console.groupEnd();
			}
		}
	}, {
		key: "addStatement",
		value: function addStatement(name, ruleSyntax, properties) {
			return this.addSyntax(name, ruleSyntax, properties, _Rule2.default.Statement);
		}
	}, {
		key: "addExpression",
		value: function addExpression(name, ruleSyntax, properties) {
			return this.addSyntax(name, ruleSyntax, properties, _Rule2.default.Expression);
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

exports.default = Parser;

/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgOGU1MTY3MjY1NTQzNDE2ZDY0NGQiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1RleHRTdHJlYW0uanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9ydWxlcy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyJdLCJuYW1lcyI6WyJSdWxlIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInByb3BzIiwiY2xvbmUiLCJjcmVhdGUiLCJzdHJlYW0iLCJlbmRJbmRleCIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsIm1hdGNoZWQiLCJjb25zdHJ1Y3RvciIsIm5hbWUiLCJTdHJpbmciLCJwYXJzZXIiLCJzdGFydHNXaXRoIiwic3RyaW5nIiwic3RhcnRJbmRleCIsImxlbmd0aCIsIlBhdHRlcm4iLCJtYXRjaCIsInBhdHRlcm4iLCJLZXl3b3JkIiwia2V5d29yZCIsIlJlZ0V4cCIsIlN1YnJ1bGUiLCJydWxlIiwiZ2V0UnVsZSIsIlN5bnRheEVycm9yIiwicmVzdWx0IiwicGFyc2UiLCJhcmd1bWVudCIsIm9wdGlvbmFsIiwiTmVzdGVkIiwiU2VxdWVuY2UiLCJyZXN1bHRzIiwibmV4dCIsInJ1bGVzIiwiZWF0V2hpdGVzcGFjZSIsInB1c2giLCJhcmdzIiwicnVsZU5hbWUiLCJnYXRoZXJBcmd1bWVudHMiLCJBcnJheSIsImlzQXJyYXkiLCJqb2luIiwiRXhwcmVzc2lvbiIsIlN0YXRlbWVudCIsIkFsdGVybmF0aXZlcyIsIlJlcGVhdCIsIkxpc3QiLCJpdGVtIiwiZGVsaW1pdGVyIiwiaW5kZXgiLCJtYXAiLCJ0b1NvdXJjZSIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJsYXN0SW5kZXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zdWJydWxlIiwicGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzIiwicGFyc2VSdWxlU3ludGF4X2xpc3QiLCJwYXJzZVJ1bGVTeW50YXhfYWx0ZXJuYXRpdmVzIiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsInBhcnNlUnVsZVN5bnRheF9zdHJpbmciLCJzdWJzdHIiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJzbGljZSIsInN5bWJvbCIsImFsdGVybmF0ZXMiLCJsYXN0VG9rZW4iLCJwb3AiLCJ3aW5kb3ciLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJ0ZXh0IiwiaGVhZCIsInN1YnN0cmluZyIsInJhbmdlIiwiYWRkUnVsZSIsImNvbnRleHQiLCJwYXJzZUZsb2F0IiwiYWRkU3ludGF4IiwicHJvdG90eXBlIiwiYXBwbHkiLCJsaXN0IiwiYWRkU3RhdGVtZW50Iiwic3RhdGVtZW50IiwiaWRlbnRpZmllciIsImxpdGVyYWwiLCJzY29wZSIsInBsdXJhbCIsInRvVXBwZXJDYXNlIiwidmFsdWVzIiwiZmlyc3QiLCJmaXJzdFZhbHVlIiwiUGFyc2VyIiwid2hpdGVzcGFjZSIsImNvbnNvbGUiLCJ3YXJuIiwicnVsZVN5bnRheCIsImxvZyIsImUiLCJncm91cCIsImVycm9yIiwiZ3JvdXBFbmQiLCJ0b2tlbnMiLCJzdGFydFRva2VuIiwiZW5kVG9rZW4iLCJuZXN0aW5nIiwibmVzdGVkIiwidG9rZW4iXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFF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Z0gsY0FBckUsRUFBUDtBQUNERDtBQUNBO0FBQ0Q7QUFDRCxTQUFNLElBQUl6RixXQUFKLDhCQUEyQ3dGLFFBQTNDLDRCQUEwRW5HLFVBQTFFLENBQU47QUFDQTs7Ozs7O2tCQXhHbUJ1RixNIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gNSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gd2VicGFjay9ib290c3RyYXAgOGU1MTY3MjY1NTQzNDE2ZDY0NGQiLCIvL1x0IyBQYXJzZXIgUnVsZXNcbi8vXHRSdWxlcyBjYW4gYmUgYXMgc2ltcGxlIGFzIGEgc3RyaW5nIGBLZXl3b3JkYCBvciBhIGNvbXBsZXggc2VxdWVuY2Ugb2YgKG5lc3RlZCkgcnVsZXMuXG4vL1xuLy9cdFBhcnNlIGEgcnVsZSB3aXRoIGBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKWAsIHRoaXMgd2lsbCBlaXRoZXI6XG4vL1x0XHQtIHJldHVybiBgdW5kZWZpbmVkYCBpZiB0aGUgcnVsZSBkb2Vzbid0IG1hdGNoIHRoZSBoZWFkIG9mIHRoZSBzdHJlYW0sIG9yXG4vL1x0XHQtIHJldHVybiBhIENMT05FIG9mIHRoZSBydWxlIHdpdGggYXQgbGVhc3QgdGhlIGZvbGxvd2luZzpcbi8vXHRcdFx0LSBgc3RyZWFtYFx0XHRTdHJlYW0gd2hpY2ggd2FzIG1hdGNoZWQgd2l0aCBgc3RhcnRJbmRleGAgYXQgdGhlIHN0YXJ0IG9mIHRoZSBtYXRjaFxuLy9cdFx0XHQtIGBlbmRJbmRleGBcdE5vbi1pbmNsdXNpdmUgZW5kIGluZGV4IGluIHN0cmVhbSB3aGVyZSBtYXRjaCBlbmRzLlxuLy9cbi8vXHRUaGUgY2xvbmUgcmV0dXJuZWQgYWJvdmUgY2FuIGJlIG1hbmlwdWxhdGVkIHdpdGhcbi8vXHRcdC0gYHJ1bGUuZ2F0aGVyQXJndW1lbnRzKClgXHRcdFJldHVybiBtYXRjaGVkIGFyZ3VtZW50cyBpbiBhIGZvcm1hdCBzdWl0YWJsZSB0byBkbzpcbi8vXHRcdC0gYHJ1bGUudG9Tb3VyY2UoKWBcdFx0XHRcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXHR9XG5cblx0Ly8gQ2xvbmUgdGhpcyBydWxlIGFuZCBhZGQgYW55IGBwcm9wc2AgcGFzc2VkIGluLlxuXHRjbG9uZShwcm9wcykge1xuXHRcdHZhciBjbG9uZSA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG5cdFx0T2JqZWN0LmFzc2lnbihjbG9uZSwgcHJvcHMpO1xuXHRcdHJldHVybiBjbG9uZTtcblx0fVxuXG5cdC8vIEZvciBhIHJ1bGUgaW5zdGFuY2UgYXNzb2NpYXRlZCB3aXRoIGEgc3RyZWFtLFxuXHQvLyByZXR1cm4gYSBuZXcgc3RyZWFtIEFGVEVSIHRoaXMgcnVsZSdzIGVuZC5cblx0bmV4dCgpIHtcblx0XHRpZiAoIXRoaXMuc3RyZWFtIHx8IHRoaXMuZW5kSW5kZXggPT09IHVuZGVmaW5lZClcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYHJ1bGUubmV4dCgpIGNhbGxlZCBvbiBydWxlIHdpdGhvdXQgYSBzdHJlYW1gLCB0aGlzKTtcblx0XHRyZXR1cm4gdGhpcy5zdHJlYW0uYWR2YW5jZVRvKHRoaXMuZW5kSW5kZXgpO1xuXHR9XG5cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQ7XG5cdH1cblxuLy9cbi8vICMjIGdyb3VwOiByZWZsZWN0aW9uXG4vL1xuXHRnZXQgcnVsZVR5cGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0fVxufVxuO1xuXG5cbi8vIFJ1bGUgZm9yIGxpdGVyYWwgc3RyaW5nIHZhbHVlLCB3aGljaCBpbmNsdWRlIHB1bmN0dWF0aW9uIHN1Y2ggYXMgYChgIGV0Yy5cblJ1bGUuU3RyaW5nID0gY2xhc3MgU3RyaW5nIGV4dGVuZHMgUnVsZSB7XG5cdC8vIFBhcnNlIHRoaXMgcnVsZSBhdCB0aGUgYmVnaW5uaW5nIG9mIGBzdHJlYW1gLCBhc3N1bWluZyBubyB3aGl0ZXNwYWNlIGJlZm9yZS5cblx0Ly8gRGVmYXVsdCBpcyB0aGF0IGBydWxlLnN0cmluZ2AgaXMgbGl0ZXJhbCBzdHJpbmcgdG8gbWF0Y2guXG5cdC8vIE9uIG1hdGNoLCByZXR1cm5zIGNsb25lIG9mIHJ1bGUgd2l0aCBgdmFsdWVgLCBgc3RyZWFtYCBhbmQgYGVuZEluZGV4YC5cblx0Ly8gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiBubyBtYXRjaC5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRpZiAoIXN0cmVhbS5zdGFydHNXaXRoKHRoaXMuc3RyaW5nKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiB0aGlzLnN0cmluZyxcblx0XHRcdGVuZEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCArIHRoaXMuc3RyaW5nLmxlbmd0aCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3RyaW5nO1xuXHR9XG59XG5cblxuLy8gUmVnZXggcGF0dGVybi5cbi8vIGBydWxlLnBhdHRlcm5gIGlzIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2guXG4vLyBOT1RFOiB0aGUgcmVnZXggc2hvdWxkIHN0YXJ0IHdpdGggYC9eLi4uYCB0byBtYXRjaCBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5SdWxlLlBhdHRlcm4gPSBjbGFzcyBQYXR0ZXJuIGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0dmFyIG1hdGNoID0gc3RyZWFtLm1hdGNoKHRoaXMucGF0dGVybik7XG5cdFx0aWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiBtYXRjaFswXSxcblx0XHRcdGVuZEluZGV4OiBzdHJlYW0uc3RhcnRJbmRleCArIG1hdGNoWzBdLmxlbmd0aCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMucGF0dGVybjtcblx0fVxufVxuXG5cbi8vIEtleXdvcmQgcGF0dGVyblxuLy9cdGBydWxlLmtleXdvcmRgIGlzIHRoZSBrZXl3b3JkIHN0cmluZyB0byBtYXRjaC5cblJ1bGUuS2V5d29yZCA9IGNsYXNzIEtleXdvcmQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0c3VwZXIocHJvcGVydGllcyk7XG5cdFx0Ly8gY3JlYXRlIHBhdHRlcm4gd2hpY2ggbWF0Y2hlcyBhdCB3b3JkIGJvdW5kYXJ5XG5cdFx0aWYgKCF0aGlzLnBhdHRlcm4pIHtcblx0XHRcdGlmICghdGhpcy5rZXl3b3JkKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQga2V5d29yZCBwcm9wZXJ0eVwiKTtcblx0XHRcdHRoaXMucGF0dGVybiA9IG5ldyBSZWdFeHAoYF4ke3RoaXMua2V5d29yZH1cXFxcYmApO1xuXHRcdH1cblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLmtleXdvcmQ7XG5cdH1cbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLm5hbWVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHZhciBydWxlID0gcGFyc2VyLmdldFJ1bGUodGhpcy5ydWxlKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQXR0ZW1wdGluZyB0byBwYXJzZSB1bmtub3duIHJ1bGUgJyR7dGhpcy5uYW1lfSdgLCB0aGlzKTtcblx0XHR2YXIgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgcmVzdWx0LmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHt9XG5cblxuLy8gU2VxdWVuY2Ugb2YgcnVsZXMgdG8gbWF0Y2ggKGF1dG8tZXhjbHVkaW5nIHdoaXRlc3BhY2UpLlxuUnVsZS5TZXF1ZW5jZSA9IGNsYXNzIFNlcXVlbmNlIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHQvLyBUaHJvd3Mgb2YgbWFuZGF0b3J5IHJ1bGUgY2FuJ3QgYmUgbWF0Y2hlZC5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgcmVzdWx0cyA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IHJlc3VsdCA9IHJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghcmVzdWx0ICYmICFydWxlLm9wdGlvbmFsKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKHJlc3VsdCkge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2gocmVzdWx0KTtcblx0XHRcdFx0bmV4dCA9IHJlc3VsdC5uZXh0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGlmIHdlIGdldCBoZXJlLCB3ZSBtYXRjaGVkIGFsbCB0aGUgcnVsZXMhXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG4vL1RPRE9DXG5cdC8vIEdhdGhlciBhcmd1bWVudHMgZnJvbSBvdXIgcGFyc2VkIGByZXN1bHRzYCBhcnJheS5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGB2YWx1ZXNgIGFycmF5IGluZGV4ZWQgYnlcblx0Ly9cdFx0LSBgcmVzdWx0cy5hcmd1bWVudGA6XHRcdGFyZ3VtZW50IHNldCB3aGVuIHJ1bGUgd2FzIGRlY2xhcmVkLCBlZzogYHt2YWx1ZTpsaXRlcmFsfWAgPT4gYHZhbHVlYFxuXHQvL1x0XHQtIGByZXN1bHRzLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIHJ1bGUgdHlwZTpcdFx0XHRcdG5hbWUgb2YgdGhlIHJ1bGUgdHlwZVxuXHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IGFyZ3MgPSB7fTtcblx0XHRmb3IgKGxldCBuZXh0IG9mIHRoaXMucmVzdWx0cykge1xuXHRcdFx0bGV0IHJ1bGVOYW1lID0gbmV4dC5hcmd1bWVudCB8fCBuZXh0LnJ1bGVOYW1lIHx8IG5leHQuY29uc3RydWN0b3IubmFtZTtcblx0XHRcdC8vIEZvciBuZXN0ZWQgcnVsZXMsIHJlY3Vyc2UgdG8gZ2V0IHRoZWlyIGFyZ3VtZW50c1xuXHRcdFx0bGV0IHJlc3VsdCA9IChuZXh0IGluc3RhbmNlb2YgUnVsZS5OZXN0ZWQgPyBuZXh0LmdhdGhlckFyZ3VtZW50cygpIDogbmV4dCk7XG5cblx0XHRcdGlmIChydWxlTmFtZSBpbiBhcmdzKSB7XG5cdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShhcmdzW3J1bGVOYW1lXSkpIGFyZ3NbcnVsZU5hbWVdID0gW2FyZ3NbcnVsZU5hbWVdXTtcblx0XHRcdFx0YXJnc1tydWxlTmFtZV0ucHVzaChyZXN1bHQpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGFyZ3NbcnVsZU5hbWVdID0gcmVzdWx0O1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gYXJncztcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnJ1bGVzLmpvaW4oXCIgXCIpfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cblxufVxuXG4vLyBTeW50YWN0aWMgc3VnYXIgZm9yIGRlYnVnZ2luZ1xuUnVsZS5FeHByZXNzaW9uID0gY2xhc3MgRXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblJ1bGUuU3RhdGVtZW50ID0gY2xhc3MgU3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIEFsdGVybmF0aXZlIHN5bnRheC5cbi8vIE5PVEU6IEN1cnJlbnRseSB0YWtlcyB0aGUgZmlyc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWVcblJ1bGUuQWx0ZXJuYXRpdmVzID0gY2xhc3MgQWx0ZXJuYXRpdmVzIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGZvciAobGV0IHJ1bGUgb2YgdGhpcy5ydWxlcykge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSk7XG5cdFx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdFx0aWYgKHRoaXMuYXJndW1lbnQpIG1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRcdFx0cmV0dXJuIG1hdGNoO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGFkZFJ1bGUocnVsZSkge1xuXHRcdHRoaXMucnVsZXMucHVzaChydWxlKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5yZXN1bHRzYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgbmV4dCA9IHN0cmVhbTtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5ydWxlLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgYnJlYWs7XG5cblx0XHRcdHJlc3VsdHMucHVzaFtyZXN1bHRdO1xuXHRcdFx0bmV4dCA9IHJlc3VsdC5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdHRocm93IFwiRG9uJ3QgdW5kZXJzdGFuZCBob3cgdG8gc291cmNlIFJ1bGUuUmVwZWF0IVwiO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZX0ke3RoaXMub3B0aW9uYWwgPyAnKicgOiAnKyd9YDtcblx0fVxufVxuXG5cbi8vIExpc3QgbWF0Y2ggcnVsZTogICBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAuIGVnXCIgYFt7bGl0ZXJhbH0sXWAgdG8gbWF0Y2ggYGEsYixjYFxuLy9cdGBydWxlLml0ZW1gIGlzIHRoZSBydWxlIGZvciBlYWNoIGl0ZW0sXG4vL1x0YHJ1bGUuZGVsaW1pdGVyYCBpcyB0aGUgZGVsaW1pdGVyIGJldHdlZW4gZWFjaCBpdGVtLlxuLy8gXHRgcnVsZS5yZXN1bHRzYCBpbiB0aGUgb3V0cHV0IGlzIHRoZSBsaXN0IG9mIHZhbHVlcy5cbi8vXG4vL1xuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYSBMaXN0IHJ1bGUgd2lsbCBOT1QgcmVwZWF0ICg/Pz8/KVxuUnVsZS5MaXN0ID0gY2xhc3MgTGlzdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdC8vIGVuc3VyZSBpdGVtIGFuZCBkZWxpbWl0ZXIgYXJlIG9wdGlvbmFsIHNvIHdlIGRvbid0IGJhcmYgaW4gYHBhcnNlUnVsZWBcblx0XHR0aGlzLml0ZW0ub3B0aW9uYWwgPSB0cnVlO1xuXHRcdHRoaXMuZGVsaW1pdGVyLm9wdGlvbmFsID0gdHJ1ZTtcblxuXHRcdHZhciByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdC8vIGdldCBuZXh0IGl0ZW0sIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgaXRlbSA9IHRoaXMuaXRlbS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFpdGVtKSBicmVhaztcbi8vY29uc29sZS5sb2coaXRlbSk7XG5cdFx0XHRyZXN1bHRzLnB1c2goaXRlbSk7XG5cdFx0XHRuZXh0ID0gaXRlbS5uZXh0KCk7XG5cblx0XHRcdC8vIGdldCBkZWxpbWl0ZXIsIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgZGVsaW1pdGVyID0gdGhpcy5kZWxpbWl0ZXIucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghZGVsaW1pdGVyKSBicmVhaztcblx0XHRcdG5leHQgPSBkZWxpbWl0ZXIubmV4dCgpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdHJlc3VsdHMsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gbWF0Y2hlZCBpdGVtIGJ5IGluZGV4XG5cdGdldEl0ZW0oaW5kZXgpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzW2luZGV4XTtcblx0fVxuXG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XHRcdC8vIFRPRE86IHRocm93Pz8/XG5cdFx0bGV0IHJlc3VsdHMgPSB0aGlzLnJlc3VsdHMubWFwKCByZXN1bHQgPT4gcmVzdWx0LnRvU291cmNlKCkgKS5qb2luKFwiLCBcIik7XG5cdFx0cmV0dXJuIGBbJHtyZXN1bHRzfV1gO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XWA7XG5cdH1cbn07XG5cblxuXG5cblxuLy9cbi8vXHQjIFBhcnNpbmcgYHJ1bGVTeW50YXhgIHRvIGNyZWF0ZSBydWxlcyBhdXRvbWF0aWNhbGx5LlxuLy9cbi8vIFRPRE86XHRQdWxsIGBwYXJzZVJ1bGVTeW50YXhgIHN0dWZmIG91dCBpbnRvIHNlcGFyYXRlIG1vZHVsZT9cbi8vIFRPRE86XHRCZXR0ZXIgbmFtZSBmb3IgYHJ1bGVTeW50YXhgXG5PYmplY3QuYXNzaWduKFJ1bGUsIHtcblxuLy9cbi8vICMjIGdyb3VwOiBwYXJzaW5nIHN5bnRheFxuLy9cblxuLy8gVE9ETzogY29udmVydCB0byBUZXh0U3RyZWFtIHBhdHRlcm4gYWxhIG5vcm1hbCBwYXJzZXIgb25jZSB0aGF0IHNldHRsZXMgZG93bj8/P1xuXHRwYXJzZVJ1bGVTeW50YXgoc3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIFtdKTtcblxuXHRcdGxldCBydWxlO1xuXHRcdC8vIElmIHdlIG9ubHkgZ290IG9uZSB0aGluZywgcmV0dXJuIHRoYXQgYXMgdGhlIHJlc3VsdFxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSBydWxlc1swXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFNlcXVlbmNlQ29uc3RydWN0b3IoeyBydWxlcyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fSxcblxuXHR0b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KSB7XG5cdFx0Y29uc3QgU1lOVEFYX0VYUFJFU1NJT04gPSAvKD86W1xcd1xcLV0rfFxcXFxbXFxbXFwoXFx7XFwpXFx9XFxdXXxbXlxcc1xcd118XFx8KS9nO1xuXHRcdHZhciBzeW50YXhTdHJlYW0gPSBzeW50YXgubWF0Y2goU1lOVEFYX0VYUFJFU1NJT04pO1xuXHRcdGlmICghc3ludGF4U3RyZWFtKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHRva2VuaXplIHBhcnNlIHJ1bGUgc3ludGF4ID4+JHtzeW50YXh9PDxgKTtcblx0XHRyZXR1cm4gc3ludGF4U3RyZWFtO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDAsIGxhc3RJbmRleCA9IHN5bnRheFN0cmVhbS5sZW5ndGgpIHtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKGVuZEluZGV4ID49IGxhc3RJbmRleClcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKFwiUGFzdCBsYXN0SW5kZXhcIik7XG5cdFx0XHRpZiAocnVsZSkgcnVsZXMucHVzaChydWxlKTtcblx0XHRcdHN0YXJ0SW5kZXggPSBlbmRJbmRleCArIDE7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlcztcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDApIHtcblx0XHR2YXIgc3ludGF4VG9rZW4gPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHRzd2l0Y2ggKHN5bnRheFRva2VuKSB7XG5cdFx0XHRjYXNlIFwie1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcInxcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9hbHRlcm5hdGl2ZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKlwiOlxuXHRcdFx0Y2FzZSBcIitcIjpcblx0XHRcdGNhc2UgXCI/XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0XHQvLyB0aGUgZm9sbG93aW5nIHNob3VsZCBBTFdBWVMgYmUgY29uc3VtZWQgYnkgdGhlIGFib3ZlXG5cdFx0XHRjYXNlIFwifVwiOlxuXHRcdFx0Y2FzZSBcIilcIjpcblx0XHRcdGNhc2UgXCJdXCI6XG5cdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCAke3N5bnRheFRva2VufSBmb3VuZCBhcyBpdGVtICR7c3RhcnRJbmRleH0gb2YgJHt0aGlzLnN5bnRheH1gKTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0dmFyIHN0cmluZyA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XSwgcnVsZTtcblx0XHQvLyBJZiBsZXR0ZXJzIG9ubHksIG1hdGNoIGFzIGEgS2V5d29yZCAoc28gd2UgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkgYWZ0ZXIgdGhlIHN0cmluZykuXG5cdFx0aWYgKHN0cmluZy5tYXRjaCgvW0EtWmEtel0rLykpIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5LZXl3b3JkKHsga2V5d29yZDogc3RyaW5nIH0pO1xuXHRcdH1cblx0XHQvLyBPdGhlcndpc2UgbWF0Y2ggYXMgYSBTdHJpbmcsIHdoaWNoIGRvZXNuJ3QgcmVxdWlyZSBub24td29yZCBjaGFycyBhZnRlciB0aGUgdGV4dC5cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5TdHJpbmcoeyBzdHJpbmc6IHN0cmluZyB9KTtcblx0XHRcdC8vIElmIHN0cmluZyBzdGFydHMgd2l0aCBgXFxcXGAsIGl0J3MgYW4gZXNjYXBlZCBsaXRlcmFsIChlZzogYFxcW2AgbmVlZHMgdG8gaW5wdXQgYXMgYFxcXFxbYCkuXG5cdFx0XHRpZiAoc3RyaW5nLnN0YXJ0c1dpdGgoXCJcXFxcXCIpKSB7XG5cdFx0XHRcdC8vIHJlbW92ZSBsZWFkaW5nIHNsYXNoIGluIG1hdGNoIHN0cmluZy4uLlxuXHRcdFx0XHRydWxlLnN0cmluZyA9IHJ1bGUuc3RyaW5nLnN1YnN0cigxKTtcblx0XHRcdFx0Ly8gYnV0IGxlYXZlIGl0IGluIHRvU3RyaW5nXG5cdFx0XHRcdHJ1bGUudG9TdHJpbmcgPSAoKSA9PiBzdHJpbmc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBbIHJ1bGUsIHN0YXJ0SW5kZXggXTtcblx0fSxcblxuXG5cdC8vIE1hdGNoIGdyb3VwaW5nIGV4cHJlc3Npb24gYCguLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiKFwiLCBcIilcIiwgc3RhcnRJbmRleCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGU7XG5cdFx0dmFyIHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHQvLyBTaW5nbGUgcmVzdWx0IG1lYW5zIG9wdGlvbmFsIGV4cHJlc3Npb25cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSByZXN1bHRzWzBdO1xuXHRcdFx0aWYgKCEocnVsZSBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzKSkgcnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlNlcXVlbmNlKHsgcnVsZXM6IHJlc3VsdHMgfSk7XG5cdFx0fVxuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCByZXBlYXQgaW5kaWNhdG9yIGA/YCwgYCtgIG9yIGAqYCBieSBhdHRhY2hpbmcgaXQgdG8gdGhlIHByZXZpb3VzIHJ1bGUuXG5cdHBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzeW1ib2wgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cdFx0dmFyIHJ1bGUgPSBydWxlc1tydWxlcy5sZW5ndGggLSAxXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgYXR0YWNoIHJlcGVhdCBzeW1ib2wgJHtzeW1ib2x9IHRvIGVtcHR5IHJ1bGUhYCk7XG5cblx0XHQvLyBUcmFuc2Zvcm0gbGFzdCBydWxlIGludG8gYSByZXBlYXQgZm9yIGAqYCBhbmQgYCtgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiKlwiIHx8IHN5bWJvbCA9PT0gXCIrXCIpIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5SZXBlYXQoeyBydWxlIH0pO1xuXHRcdFx0Ly8gcHVzaCBpbnRvIHJ1bGUgc3RhY2sgaW4gcGxhY2Ugb2Ygb2xkIHJ1bGVcblx0XHRcdHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdID0gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBSdWxlIGlzIG9wdGlvbmFsIGZvciBgP2AgYW5kIGAqYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIj9cIiB8fCBzeW1ib2wgPT09IFwiKlwiKSB7XG5cdFx0XHRydWxlLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gWyB1bmRlZmluZWQsIHN0YXJ0SW5kZXggXVxuXHR9LFxuXG5cdC8vIE1hdGNoIGB7PHJ1bGVOYW1lPn1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCBtYXRjaCA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJ7XCIsIFwifVwiLCBzdGFydEluZGV4KTtcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA9PT0gMyAmJiBtYXRjaC5zbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gbWF0Y2guc2xpY2VbMF07XG5cdFx0XHRtYXRjaC5zbGljZSA9IG1hdGNoLnNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID4gMSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBwcm9jZXNzIHJ1bGVzIHdpdGggbW9yZSB0aGFuIG9uZSBydWxlIG5hbWU6IHske21hdGNoLnNsaWNlLmpvaW4oXCJcIil9fWApO1xuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuU3VicnVsZSh7IHJ1bGU6IG1hdGNoLnNsaWNlWzBdIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIG1hdGNoLmVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggbGlzdCBleHByZXNzaW9uIGBbPGl0ZW0+PGRlbGltaXRlcj5dYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJbXCIsIFwiXVwiLCBzdGFydEluZGV4KTtcblxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHNsaWNlLCBbXSk7XG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoICE9PSAyKSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgc3R1ZmYgYXQgZW5kIG9mIGxpc3Q6IFske3NsaWNlLmpvaW4oXCIgXCIpfV1gKTtcblx0XHR9XG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5MaXN0KCk7XG5cdFx0cnVsZS5pdGVtID0gcmVzdWx0c1swXVxuXHRcdHJ1bGUuZGVsaW1pdGVyID0gcmVzdWx0c1sxXVxuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYWx0ZXJuYXRlIGAoIGEgfCBiIHwgYyApYC5cblx0Ly8gTk9URTogdGhpcyBzaG91bGQgb25seSBoYXBwZW4gaW5zaWRlIGEgZ3JvdXAuLi5cblx0cGFyc2VSdWxlU3ludGF4X2FsdGVybmF0aXZlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggKyAxKTtcblxuXHRcdC8vIGNyZWF0ZSBhbHRlcm5hdGVzIHJ1bGUgd2l0aCBsYXN0VG9rZW4sIG9yIHJlLXVzZSBleGlzdGluZyBhbHRlcm5hdGVzIHJpbGVcblx0XHRsZXQgYWx0ZXJuYXRlcztcblx0XHRsZXQgbGFzdFRva2VuID0gcnVsZXMucG9wKCk7XG5cdFx0aWYgKGxhc3RUb2tlbiBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzKSB7XG5cdFx0XHRhbHRlcm5hdGVzID0gbGFzdFRva2VuO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGFsdGVybmF0ZXMgPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlczogW10gfSk7XG5cblx0XHRcdC8vIGlmIG5vIGxhc3QgcnVsZSwgd2UgaGF2ZSBhIHJ1bGUgbGlrZSAgYCggfCBhYmMpYCB3aGljaCBtZWFucyB0aGF0IHRoZSBhbHRlcm5hdGVzIGlzIG9wdGlvbmFsXG5cdFx0XHRpZiAoIWxhc3RUb2tlbilcblx0XHRcdFx0YWx0ZXJuYXRlcy5vcHRpb25hbCA9IHRydWU7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdGFsdGVybmF0ZXMucnVsZXMucHVzaChsYXN0VG9rZW4pO1xuXHRcdH1cblx0XHQvLyBhZGQgcGFyc2VkIHJ1bGUgdG8gdGhlIGFsdGVybmF0ZXNzXG5cdFx0YWx0ZXJuYXRlcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXG5cdFx0Ly8gYWRkIGJhY2sgdG8gdGhlIGVuZCBvZiBydWxlc1xuXHRcdHJ1bGVzLnB1c2goYWx0ZXJuYXRlcyk7XG5cblx0XHRyZXR1cm4gWyB1bmRlZmluZWQsIGVuZEluZGV4IF07XG5cdH0sXG5cblxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZS5qcyIsImltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJcbi8vIFRPRE86IGNvbnZlcnQgdG8gbGluZS1hd2FyZSBzdHJlYW0/Pz9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRTdHJlYW0ge1xuXHRjb25zdHJ1Y3Rvcih0ZXh0T3JQcm9wcykge1xuXHRcdGlmICh0eXBlb2YgdGV4dE9yUHJvcHMgPT09IFwic3RyaW5nXCIpIHRoaXMudGV4dCA9IHRleHRPclByb3BzO1xuXHRcdGVsc2UgT2JqZWN0LmFzc2lnbih0aGlzLCB0ZXh0T3JQcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnN0YXJ0SW5kZXgpIHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdH1cblxuXHQvLyBSZXR1cm4gYW4gaW1tdXRhYmxlIGNsb25lIG9mIHRoZSBzdHJlYW0uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0bGV0IGNsb25lID0gbmV3IFRleHRTdHJlYW0odGhpcyk7XG5cdFx0T2JqZWN0LmFzc2lnbihjbG9uZSwgcHJvcHMpO1xuXHRcdHJldHVybiBjbG9uZTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2VkIHRvIG5ldyBzdGFydEluZGV4LlxuXHRhZHZhbmNlVG8oc3RhcnRJbmRleCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleCB9KTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2luZyBzdGFydEluZGV4IEJZIGBsZW5ndGhgXG5cdGFkdmFuY2VCeShsZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcblx0fVxuXG4vLyBcdC8vIFJldHVybiBjbG9uZSBvZiB0aGlzIHN0cmVhbSB3aXRoIGVuZEluZGV4IHNldCB0byBzdGFydCArIGBsZW5ndGhgXG4vLyBcdGVuZEFmdGVyKGxlbmd0aCkge1xuLy8gXHRcdHJldHVybiB0aGlzLmNsb25lKHsgZW5kSW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcbi8vIFx0fVxuXG5cdC8vIE1hdGNoIGBwYXR0ZXJuYCBhcyByZWdleCBhdCBoZWFkIG9mIHN0cmVhbS5cblx0Ly8gTk9URTogcmVnZXhlcyBzaG91bGQgc3RhcnQgd2l0aCBgXmAhXG5cdC8vIFJldHVybnMgbWF0Y2ggb3IgdW5kZWZpbmVkLlxuXHRtYXRjaChwYXR0ZXJuKSB7XG5cdFx0aWYgKCEocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHRocm93IG5ldyBUeXBlRXJyb3IoYFRleHRTdHJlYW0ubWF0Y2goJHtwYXR0ZXJufSk6IGV4cGVjdGVkIFJlZ0V4cGApO1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5tYXRjaChwYXR0ZXJuKTtcblx0fVxuXG5cdHN0YXJ0c1dpdGgoc3RyaW5nKSB7XG4vL1RPRE86IHVzZSBgc3RyZWFtLnJhbmdlYCB0byBlbnN1cmUgbWF0Y2ggaXMgbm90IG5vdCBiZXlvbmQgYHN0cmluZy5lbmRJbmRleGBcblx0XHRyZXR1cm4gdGhpcy5oZWFkLnN0YXJ0c1dpdGgoc3RyaW5nKTtcblx0fVxuXG5cdC8vIFJldHVybiB0ZXh0IG9mIHN0cmluZyBzdGFydGluZyBhdCBvdXIgYHN0YXJ0SW5kZXhgXG5cdGdldCBoZWFkKCkge1xuXHRcdHJldHVybiB0aGlzLnJhbmdlKCk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSByYW5nZSBvZiB0aGUgc3RyaW5nIGZyb20gYHN0YXJ0SW5kZXhgIHRvIGBlbmRJbmRleGAgTk9OLWluY2x1c2l2ZS5cblx0cmFuZ2Uoc3RhcnRJbmRleCA9IHRoaXMuc3RhcnRJbmRleCwgZW5kSW5kZXggPSB0aGlzLnRleHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5zdWJzdHJpbmcoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xuXHR9XG5cblx0Ly8gTGVuZ3RoIG9mIHRoZSBzdHJlYW0uXG5cdGdldCBsZW5ndGgoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5sZW5ndGg7XG5cdH1cblxuXHQvLyBBcmUgd2UgYXQgdGhlIGVuZCBvZiB0aGUgc3RyZWFtP1xuXHRnZXQgaXNFbXB0eSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGFydEluZGV4ID09PSB0aGlzLmxlbmd0aDtcblx0fVxuXG5cblxuXG5cdC8vXG5cdC8vIyMgUmVmbGVjdGlvblxuXHQvL1xuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0XG5cdH07XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvVGV4dFN0cmVhbS5qcyIsImltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBsb2FkIHN0YW5kYXJkIHJ1bGVzIGZpbGVzIGhlcmVcbmltcG9ydCBfIGZyb20gXCIuL3J1bGVzXCI7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaW5kZXguanMiLCJpbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vXG4vLyBSZWdleCBwYXR0ZXJuIHJ1bGVzIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9ycyBmb3IgZGVidWdnaW5nXG4vL1xuLy9wYXJzZXIuYWRkUGF0dGVybihcIndoaXRlc3BhY2VcIiwgL15cXHMrLyk7XG5wYXJzZXIuYWRkUnVsZShcIndoaXRlc3BhY2VcIiwgbmV3IChjbGFzcyB3aGl0ZXNwYWNlIGV4dGVuZHMgUnVsZS5QYXR0ZXJue30pKHsgcGF0dGVybjogL15cXHMrLywgb3B0aW9uYWw6IHRydWUgfSkpO1xuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuLy9wYXJzZXIuYWRkUGF0dGVybihcImlkZW50aWZpZXJcIiwgL15bYS16XVtcXHdcXGRcXC1fXSovKTtcbnBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgKGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm57fSkoeyBwYXR0ZXJuOiAvXlthLXpdW1xcd1xcLV0qLyB9KSk7XG5cbi8vIGBUeXBlYCA9IHR5cGUgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhbiB1cHBlci1jYXNlIGxldHRlciAoPylcbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJ0eXBlbmFtZVwiLCAvXltBLVpdW1xcd1xcZFxcLV9dKi8pO1xucGFyc2VyLmFkZFJ1bGUoXCJUeXBlXCIsIG5ldyAoY2xhc3MgVHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7IHBhdHRlcm46IC9eW0EtWl1bXFx3XFwtXSovIH0pKTtcblxuXG4vLyBOdW1lcmljIGxpdGVyYWwgKGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyKSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxucGFyc2VyLmFkZFJ1bGUoXCJudW1iZXJcIiwgbmV3IChjbGFzcyBudW1iZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm57fSkoe1xuXHRwYXR0ZXJuOiAvXi0/XFxkKyg/OlxcLlxcZCspPy8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlRmxvYXQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxucGFyc2VyLmFkZFJ1bGUoXCJ0ZXh0XCIsIG5ldyAoY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7XG5cdHBhdHRlcm46IC9eKD86XCJbXlwiXSpcInwnW14nXSonKS9cbn0pKTtcblxuXG4vLyBCb29sZWFuIGxpdGVyYWwsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFRPRE86IGJldHRlciBuYW1lIGZvciB0aGlzPz8/XG5wYXJzZXIuYWRkUnVsZShcImJvb2xlYW5cIiwgbmV3IChjbGFzcyBib29sZWFuIGV4dGVuZHMgUnVsZS5QYXR0ZXJue30pKHtcblx0cGF0dGVybjogL14odHJ1ZXxmYWxzZXx5ZXN8bm98c3VjY2Vzc3xmYWlsdXJlfG9rfGNhbmNlbClcXGIvLFxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHN3aXRjaCAodGhpcy5tYXRjaGVkKSB7XG5cdFx0XHRjYXNlIFwidHJ1ZVwiOlxuXHRcdFx0Y2FzZSBcInllc1wiOlxuXHRcdFx0Y2FzZSBcInN1Y2Nlc3NcIjpcblx0XHRcdGNhc2UgXCJva1wiOlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cbn0pKTtcblxuXG4vL1xuLy8gUnVsZXMgYXV0by1kZXJpdmVkIGZyb20gb3VyIGBydWxlIHN5bnRheGAuXG4vL1xuXG4vLyBMaXRlcmFsIHZhbHVlIGFzIG51bWJlciwgdGV4dCBvciBib29sZWFuLlxucGFyc2VyLmFkZFN5bnRheChcImxpdGVyYWxcIiwgXCIobGl0ZXJhbDp7bnVtYmVyfXx7dGV4dH18e2Jvb2xlYW59KVwiKTtcblxuXG4vLyBMaXRlcmFsIGxpc3QgKGFycmF5KSwgZWc6ICBgWzEsMix0cnVlLGZhbHNlIF1gXG5wYXJzZXIuYWRkU3ludGF4KFxuXHRcImxpdGVyYWwtbGlzdFwiLFxuXHRcIlxcXFxbW2xpc3Q6e2xpdGVyYWx9LF0/XFxcXF1cIixcblx0e1xuXHRcdC8vIE1vZGlmeSBgYXJndW1lbnRzYCBvZiB0aGlzIGV4cHJlc3Npb24gdG8ganVzdCB0aGUgbGlzdCByZXR1cm5lZC5cblx0XHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0XHR2YXIgYXJncyA9IFJ1bGUuU2VxdWVuY2UucHJvdG90eXBlLmdhdGhlckFyZ3VtZW50cy5hcHBseSh0aGlzKTtcblx0XHRcdGlmICghYXJncykgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHJldHVybiBhcmdzLmxpc3Q7XG5cdFx0fSxcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHZhciBsaXN0ID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdHJldHVybiBsaXN0LnRvU291cmNlKCk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbnBhcnNlci5hZGRTeW50YXgoXCJzY29wZS1tb2RpZmllclwiLCBcIihzY29wZTpnbG9iYWx8Y29uc3RhbnR8c2hhcmVkKVwiKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlLXByb3BlcnR5XCIsXG5cdFwie3Njb3BlLW1vZGlmaWVyfT8ge2lkZW50aWZpZXJ9ID0ge2xpdGVyYWx9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgc3RhdGVtZW50ID0gYCR7YXJncy5pZGVudGlmaWVyLnRvU291cmNlKCl9ID0gJHthcmdzLmxpdGVyYWwudG9Tb3VyY2UoKX07YDtcblxuXHRcdFx0dmFyIHNjb3BlID0gKGFyZ3Muc2NvcGUgPyBhcmdzLnNjb3BlLnRvU291cmNlKCkgOiBcImxvY2FsXCIpO1xuXHRcdFx0c3dpdGNoIChzY29wZSkge1xuXHRcdFx0XHRjYXNlIFwiZ2xvYmFsXCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBnbG9iYWwuJHtzdGF0ZW1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwiY29uc3RhbnRcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGNvbnN0ICR7c3RhdGVtZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZFwiOlxuXHRcdFx0XHRcdHJldHVybiBgc3RhdGljICR7c3RhdGVtZW50fWA7XG5cblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRyZXR1cm4gc3RhdGVtZW50O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuLy8gVE9ETzogd2FybiBvbiBpbnZhbGlkIHNldD8gIHNoYXJlZD8gIHVuZGVmaW5lZD8gc29tZXRoaW5nIG90aGVyIHRoYW4gdGhlIGZpcnN0IHZhbHVlIGFzIGRlZmF1bHQ/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmUtcHJvcGVydHktYXMtb25lLW9mXCIsXG5cdFwie2lkZW50aWZpZXJ9IGFzIG9uZSBvZiB7bGlzdDpsaXRlcmFsLWxpc3R9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cblx0XHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgcGx1cmFsID0gKGlkZW50aWZpZXIgKyBcIl9WQUxVRVNcIikudG9VcHBlckNhc2UoKTtcblx0XHRcdGxldCB2YWx1ZXMgPSBhcmdzLmxpc3QudG9Tb3VyY2UoKTtcblx0XHRcdGxldCBmaXJzdCA9IGFyZ3MubGlzdC5yZXN1bHRzWzBdO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKCkgOiBcInVuZGVmaW5lZFwiO1xuXG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke3BsdXJhbH0gPSAke3ZhbHVlc307XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0geyByZXR1cm4gKFwiX18ke2lkZW50aWZpZXJ9XCIgaW4gdGhpcyA/IHRoaXMuX18ke2lkZW50aWZpZXJ9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfVxcbmA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvcnVsZXMuanMiLCJpbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIiwiLy8gU3BlbGwgXCJFbmdsaXNoXCIgcGFyc2VyIHN0cmF3bWFuXG5cbi8vIFRPRE86XHRjdXN0b20gU3ludGF4RXJyb3IgZXRjIHdoaWNoIHVuZGVyc3RhbmQgc3RyZWFtc1xuLy8gVE9ETzpcdGFkZCBzYW1lIG5hbWVkIHJ1bGUgPSBtYWtlIGFsdGVybmF0aXZlc1xuLy8gVE9ETzpcdGBzdGF0ZW1lbnRgIHZzIGBleHByZXNzaW9uYCB2cyBgY29udHJvbCBzdHJ1Y3R1cmVgIGV0YyAtLSBhcmUgdGhlc2UganVzdCBuYW1lZCBydWxlcz9cbi8vIFRPRE86XHRicmVhayBgZmlsZWAgaW50byBsaW5lcyBhbmQgcHJvY2VzcyBlYWNoIChpbmNsLiBzdWJzdHIvbWF0Y2ggbm90IGdvaW5nIGJleW9uZCB0aGUgZW5kKVxuLy8gVE9ETzpcdG5lc3RpbmcgLS0gaXMgdGhpcyBqdXN0IGluZGVudCA9IFwiYWRkIGJsb2NrIHNjb3BlXCJcbi8vIFRPRE86XHRwcm9tb3Rpb24gcGF0dGVybiBmb3IgZ2F0aGVyIGFyZ3VtZW50cyAoZWc6IGxpdGVyYWwtbGlzdClcbi8vIFRPRE86XHRXaGF0IGRvZXMgc3ludGF4IHRyZWUgbG9vayBsaWtlPyAgSG93IGRvIHdlIGV4dHJhY3QgbWVhbmluZyBvdXQgb2YgdGhlIG5lc3Q/XG4vLyBUT0RPOlx0RG9uJ3QgdXNlIGB0b0pTT05gIGZvciBvdXRwdXR0aW5nIHJ1bGUuLi5cbi8vIFRPRE86XHRSZWN5Y2xlIHdvcmQvc3RyaW5nL3BhdHRlcm4gcnVsZXMgdG8gbW9yZSBlYXNpbHkgc2VlIGNvbW1vbmFsaXR5Li4uXG4vLyBUT0RPOlx0UGFzcyBgY29udGV4dGAgdG8gdG9Tb3VyY2UoKSwgYWRkIHByb3BlcnR5IGRlc2NyaXB0b3JzIHRvIGBjbGFzc2AsIHZhcmlhYmxlcyBhbmQgY29kZSB0byBgbWV0aG9kYCwgYGdsb2JhbGAgc3R1ZmYgZXRjXG5cbmltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdFx0Ly8gQ2xvbmUgcnVsZXMsIHN0YXJ0aW5nIHdpdGggYSBjb21wbGV0ZWx5IGVtcHR5IG1hcCBpZiBub3QgZGVmaW5lZCAobm8gc3RhbmRhcmQgb2JqZWN0IGtleXMpXG5cdFx0dGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUodGhpcy5ydWxlcyB8fCBudWxsKTtcblx0fVxuXG5cdGdldFJ1bGUobmFtZSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzW25hbWVdO1xuXHR9XG5cbi8vIyMjIFBhcnNpbmdcblxuXHQvLyBQYXJzZSBgbmFtZWBkIHJ1bGUgYXQgaGVhZCBvZiBgc3RyZWFtYC5cblx0Ly8gSGFuZGxlcyBvcHRpb25hbCBhbmQgcmVwZWF0aW5nIHJ1bGVzIGFzIHdlbGwgYXMgZWF0aW5nIHdoaXRlc3BhY2UuXG5cdC8vIFJldHVybnMgcmVzdWx0IG9mIHBhcnNlLlxuXHRwYXJzZShuYW1lLCBzdHJlYW0pIHtcblx0XHRpZiAodHlwZW9mIHN0cmVhbSA9PT0gXCJzdHJpbmdcIikgc3RyZWFtID0gbmV3IFRleHRTdHJlYW0oc3RyZWFtKTtcblxuXHRcdGxldCBydWxlID0gdGhpcy5nZXRSdWxlKG5hbWUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBSdWxlICR7bmFtZX0gbm90IHVuZGVyc3Rvb2RgLCBuYW1lLCBzdHJlYW0pO1xuXHRcdHN0cmVhbSA9IHRoaXMuZWF0V2hpdGVzcGFjZShzdHJlYW0pO1xuXHRcdHJldHVybiBydWxlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdH1cblxuXHQvLyBFYXQgd2hpdGVzcGFjZSAoYWNjb3JkaW5nIHRvIGBydWxlcy53aGl0ZXNwYWNlYCkgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG5ldyBzdHJlYW0gaWYgd2UgbWF0Y2hlZCB3aGl0ZXNwYWNlLCBvdGhlcndpc2UgdGhlIHNhbWUgc3RyZWFtLlxuXHQvLyBPdGhlcndpc2UgcmV0dXJucyB0aGlzIHNhbWUgc3RyZWFtLlxuXHRlYXRXaGl0ZXNwYWNlKHN0cmVhbSkge1xuXHRcdHZhciByZXN1bHQgPSB0aGlzLnJ1bGVzLndoaXRlc3BhY2UucGFyc2UodGhpcywgc3RyZWFtKTtcblx0XHRyZXR1cm4gcmVzdWx0ID8gcmVzdWx0Lm5leHQoKSA6IHN0cmVhbTtcblx0fVxuXG4vLyMjIyBSdWxlIGZhY3Rvcmllc1xuXG5cdC8vIEFkZCBhIHJ1bGUgdG8gb3VyIGxpc3Qgb2YgcnVsZXMhXG5cdC8vIFRPRE86IGNvbnZlcnQgdG8gYGFsdGVybmF0aXZlc2Agb24gb3ZlcndyaXRlP1xuXHRhZGRSdWxlKG5hbWUsIHJ1bGUpIHtcblx0XHRpZiAodGhpcy5ydWxlc1tuYW1lXSkgY29uc29sZS53YXJuKGBPdmVyd3JpdGluZyBydWxlICR7bmFtZX0gb2xkOiBgLCB0aGlzLnJ1bGVzW25hbWVdLCBcIm5ldzogXCIsIHJ1bGUpO1xuXHRcdHJ1bGUucnVsZU5hbWUgPSBuYW1lO1xuXHRcdHRoaXMucnVsZXNbbmFtZV0gPSBydWxlO1xuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cblx0Ly8gQWRkIHJlZ2V4IGFzIGEgcGF0dGVybiB0byBvdXIgbGlzdCBvZiBydWxlc1xuXHRhZGRQYXR0ZXJuKG5hbWUsIHBhdHRlcm4sIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlBhdHRlcm4ocHJvcGVydGllcyk7XG5cdFx0cnVsZS5wYXR0ZXJuID0gcGF0dGVybjtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHR9XG5cblxuXHQvLyBQYXJzZSBhIGBydWxlU3ludGF4YCBydWxlIGFuZCBhZGQgaXQgdG8gb3VyIGxpc3Qgb2YgcnVsZXMuXG5cdC8vIFJldHVybnMgdGhlIG5ldyBydWxlLlxuXHQvLyBMb2dzIHBhcnNpbmcgZXJyb3JzIGJ1dCBhbGxvd3MgdGhpbmdzIHRvIGNvbnRpbnVlLlxuXHRhZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHR0cnkge1xuXHRcdFx0bGV0IHJ1bGUgPSBSdWxlLnBhcnNlUnVsZVN5bnRheChydWxlU3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yKTtcblxuXHRcdFx0Ly8gUmVmbGVjdCB0aGUgcnVsZSBiYWNrIG91dCB0byBtYWtlIHN1cmUgaXQgbG9va3MgKG1vcmUgb3IgbGVzcykgdGhlIHNhbWVcblx0XHRcdGNvbnNvbGUubG9nKGBBZGRlZCBydWxlICcke25hbWV9JzpcXG4gIElOUFVUOiAke3J1bGVTeW50YXh9IFxcbiBPVVRQVVQ6ICR7cnVsZX1gKTtcblxuXHRcdFx0T2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5ncm91cChgRXJyb3IgcGFyc2luZyBzeW50YXggZm9yIHJ1bGUgJyR7bmFtZX0nOmApO1xuXHRcdFx0Y29uc29sZS5sb2coYHN5bnRheDogJHtydWxlU3ludGF4fWApO1xuXHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHRcdGNvbnNvbGUuZ3JvdXBFbmQoKTtcblx0XHR9XG5cdH1cblxuXHRhZGRTdGF0ZW1lbnQobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdHJldHVybiB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBSdWxlLlN0YXRlbWVudCk7XG5cdH1cblxuXHRhZGRFeHByZXNzaW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHRyZXR1cm4gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgUnVsZS5FeHByZXNzaW9uKTtcblx0fVxuXG5cbi8vXG4vLyAjIyBVdGlsaXR5IG1ldGhvZHNcbi8vXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gLlxuXHQvLyBJZiBzdWNjZXNzZnVsLCByZXR1cm5zIGB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZSB9YFxuXHQvLyBUaHJvd3MgaWYgdW5zdWNlc3NmdWwuXG5cdHN0YXRpYyBmaW5kTmVzdGVkVG9rZW5zKHRva2Vucywgc3RhcnRUb2tlbiwgZW5kVG9rZW4sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0aWYgKHRva2Vuc1tzdGFydEluZGV4XSAhPT0gc3RhcnRUb2tlbikgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBFeHBlY3RlZCAnJHtzdGFydFRva2VufScgYXQgaW5kZXggJHtzdGFydEluZGV4fSBvZiB0b2tlbnNgKTtcblx0XHRsZXQgbmVzdGluZyA9IDA7XG5cdFx0bGV0IG5lc3RlZCA9IGZhbHNlO1xuXHRcdGZvciAobGV0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIDEsIGxhc3RJbmRleCA9IHRva2Vucy5sZW5ndGg7IGVuZEluZGV4IDwgbGFzdEluZGV4OyBlbmRJbmRleCsrKSB7XG5cdFx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbZW5kSW5kZXhdO1xuXHRcdFx0aWYgKHRva2VuID09PSBzdGFydFRva2VuKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdFx0bmVzdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b2tlbiA9PT0gZW5kVG9rZW4pIHtcblx0XHRcdFx0aWYgKG5lc3RpbmcgPT09IDApXG5cdFx0XHRcdFx0cmV0dXJuIHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlOiB0b2tlbnMuc2xpY2Uoc3RhcnRJbmRleCsxLCBlbmRJbmRleCksIG5lc3RlZCB9O1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgQ291bGRuJ3QgZmluZCBtYXRjaGluZyAnJHtlbmRUb2tlbn0ncyBzdGFydGluZyBhdCBpdGVtICR7c3RhcnRJbmRleH1gKTtcblx0fVxuXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9QYXJzZXIuanMiXSwic291cmNlUm9vdCI6IiJ9