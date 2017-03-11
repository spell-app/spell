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
			var existing = this.rules[name];
			if (existing) {
				console.warn("Converting rule '" + name + "' to alternatives");
				if (!(existing instanceof _Rule2.default.Alternatives)) {
					existing = new _Rule2.default.Alternatives({ name: existing.name, rules: [existing] });
					this.rules[name] = existing;
				}
				console.warn("Adding rule " + rule.name + " to " + name + ": ", rule);
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
			var statement = this.addSyntax(name, ruleSyntax, properties, _Rule2.default.Statement);
			return this.addRule("statement", statement);
		}
	}, {
		key: "addExpression",
		value: function addExpression(name, ruleSyntax, properties) {
			var expression = this.addSyntax(name, ruleSyntax, properties, _Rule2.default.Expression);
			return this.addRule("expression", expression);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgYjNlNzU1MmQ3YTY2ZDU4YmYyOTAiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1RleHRTdHJlYW0uanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9ydWxlcy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyJdLCJuYW1lcyI6WyJSdWxlIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInByb3BzIiwiY2xvbmUiLCJjcmVhdGUiLCJzdHJlYW0iLCJlbmRJbmRleCIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsIm1hdGNoZWQiLCJjb25zdHJ1Y3RvciIsIm5hbWUiLCJTdHJpbmciLCJwYXJzZXIiLCJzdGFydHNXaXRoIiwic3RyaW5nIiwic3RhcnRJbmRleCIsImxlbmd0aCIsIlBhdHRlcm4iLCJtYXRjaCIsInBhdHRlcm4iLCJLZXl3b3JkIiwia2V5d29yZCIsIlJlZ0V4cCIsIlN1YnJ1bGUiLCJydWxlIiwiZ2V0UnVsZSIsIlN5bnRheEVycm9yIiwicmVzdWx0IiwicGFyc2UiLCJhcmd1bWVudCIsIm9wdGlvbmFsIiwiTmVzdGVkIiwiU2VxdWVuY2UiLCJyZXN1bHRzIiwibmV4dCIsInJ1bGVzIiwiZWF0V2hpdGVzcGFjZSIsInB1c2giLCJhcmdzIiwicnVsZU5hbWUiLCJnYXRoZXJBcmd1bWVudHMiLCJBcnJheSIsImlzQXJyYXkiLCJqb2luIiwiRXhwcmVzc2lvbiIsIlN0YXRlbWVudCIsIkFsdGVybmF0aXZlcyIsIlJlcGVhdCIsIkxpc3QiLCJpdGVtIiwiZGVsaW1pdGVyIiwiaW5kZXgiLCJtYXAiLCJ0b1NvdXJjZSIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJsYXN0SW5kZXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zdWJydWxlIiwicGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzIiwicGFyc2VSdWxlU3ludGF4X2xpc3QiLCJwYXJzZVJ1bGVTeW50YXhfYWx0ZXJuYXRpdmVzIiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsInBhcnNlUnVsZVN5bnRheF9zdHJpbmciLCJzdWJzdHIiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJzbGljZSIsInN5bWJvbCIsImFsdGVybmF0ZXMiLCJsYXN0VG9rZW4iLCJwb3AiLCJ3aW5kb3ciLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJ0ZXh0IiwiaGVhZCIsInN1YnN0cmluZyIsInJhbmdlIiwiYWRkUnVsZSIsImNvbnRleHQiLCJwYXJzZUZsb2F0IiwiYWRkU3ludGF4IiwicHJvdG90eXBlIiwiYXBwbHkiLCJsaXN0IiwiYWRkU3RhdGVtZW50Iiwic3RhdGVtZW50IiwiaWRlbnRpZmllciIsImxpdGVyYWwiLCJzY29wZSIsInBsdXJhbCIsInRvVXBwZXJDYXNlIiwidmFsdWVzIiwiZmlyc3QiLCJmaXJzdFZhbHVlIiwiUGFyc2VyIiwid2hpdGVzcGFjZSIsImV4aXN0aW5nIiwiY29uc29sZSIsIndhcm4iLCJydWxlU3ludGF4IiwibG9nIiwiZSIsImdyb3VwIiwiZXJyb3IiLCJncm91cEVuZCIsImV4cHJlc3Npb24iLCJ0b2tlbnMiLCJzdGFydFRva2VuIiwiZW5kVG9rZW4iLCJuZXN0aW5nIiwibmVzdGVkIiwidG9rZW4iXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7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eUYsVUFBN0IsbUJBQXFEcEcsVUFBckQsZ0JBQU47QUFDdkMsT0FBSXNHLFVBQVUsQ0FBZDtBQUNBLE9BQUlDLFNBQVMsS0FBYjtBQUNBLFFBQUssSUFBSWxILFdBQVdXLGFBQWEsQ0FBNUIsRUFBK0I4QyxZQUFZcUQsT0FBT2xHLE1BQXZELEVBQStEWixXQUFXeUQsU0FBMUUsRUFBcUZ6RCxVQUFyRixFQUFpRztBQUNoRyxRQUFJbUgsUUFBUUwsT0FBTzlHLFFBQVAsQ0FBWjtBQUNBLFFBQUltSCxVQUFVSixVQUFkLEVBQTBCO0FBQ3pCRTtBQUNBQyxjQUFTLElBQVQ7QUFDQTtBQUNELFFBQUlDLFVBQVVILFFBQWQsRUFBd0I7QUFDdkIsU0FBSUMsWUFBWSxDQUFoQixFQUNDLE9BQU8sRUFBRXRHLHNCQUFGLEVBQWNYLGtCQUFkLEVBQXdCcUUsT0FBT3lDLE9BQU96QyxLQUFQLENBQWExRCxhQUFXLENBQXhCLEVBQTJCWCxRQUEzQixDQUEvQixFQUFxRWtILGNBQXJFLEVBQVA7QUFDREQ7QUFDQTtBQUNEO0FBQ0QsU0FBTSxJQUFJM0YsV0FBSiw4QkFBMkMwRixRQUEzQyw0QkFBMEVyRyxVQUExRSxDQUFOO0FBQ0E7Ozs7OztrQkFwSG1CdUYsTSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGlkZW50aXR5IGZ1bmN0aW9uIGZvciBjYWxsaW5nIGhhcm1vbnkgaW1wb3J0cyB3aXRoIHRoZSBjb3JyZWN0IGNvbnRleHRcbiBcdF9fd2VicGFja19yZXF1aXJlX18uaSA9IGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiB2YWx1ZTsgfTtcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7XG4gXHRcdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuIFx0XHRcdFx0ZW51bWVyYWJsZTogdHJ1ZSxcbiBcdFx0XHRcdGdldDogZ2V0dGVyXG4gXHRcdFx0fSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiL1wiO1xuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IDUpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIGIzZTc1NTJkN2E2NmQ1OGJmMjkwIiwiLy9cdCMgUGFyc2VyIFJ1bGVzXG4vL1x0UnVsZXMgY2FuIGJlIGFzIHNpbXBsZSBhcyBhIHN0cmluZyBgS2V5d29yZGAgb3IgYSBjb21wbGV4IHNlcXVlbmNlIG9mIChuZXN0ZWQpIHJ1bGVzLlxuLy9cbi8vXHRQYXJzZSBhIHJ1bGUgd2l0aCBgcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSlgLCB0aGlzIHdpbGwgZWl0aGVyOlxuLy9cdFx0LSByZXR1cm4gYHVuZGVmaW5lZGAgaWYgdGhlIHJ1bGUgZG9lc24ndCBtYXRjaCB0aGUgaGVhZCBvZiB0aGUgc3RyZWFtLCBvclxuLy9cdFx0LSByZXR1cm4gYSBDTE9ORSBvZiB0aGUgcnVsZSB3aXRoIGF0IGxlYXN0IHRoZSBmb2xsb3dpbmc6XG4vL1x0XHRcdC0gYHN0cmVhbWBcdFx0U3RyZWFtIHdoaWNoIHdhcyBtYXRjaGVkIHdpdGggYHN0YXJ0SW5kZXhgIGF0IHRoZSBzdGFydCBvZiB0aGUgbWF0Y2hcbi8vXHRcdFx0LSBgZW5kSW5kZXhgXHROb24taW5jbHVzaXZlIGVuZCBpbmRleCBpbiBzdHJlYW0gd2hlcmUgbWF0Y2ggZW5kcy5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLmdhdGhlckFyZ3VtZW50cygpYFx0XHRSZXR1cm4gbWF0Y2hlZCBhcmd1bWVudHMgaW4gYSBmb3JtYXQgc3VpdGFibGUgdG8gZG86XG4vL1x0XHQtIGBydWxlLnRvU291cmNlKClgXHRcdFx0XHRSZXR1cm4gamF2YXNjcmlwdCBzb3VyY2UgdG8gaW50ZXJwcmV0IHRoZSBydWxlLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJ1bGUge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdC8vIENsb25lIHRoaXMgcnVsZSBhbmQgYWRkIGFueSBgcHJvcHNgIHBhc3NlZCBpbi5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHR2YXIgY2xvbmUgPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xuXHRcdE9iamVjdC5hc3NpZ24oY2xvbmUsIHByb3BzKTtcblx0XHRyZXR1cm4gY2xvbmU7XG5cdH1cblxuXHQvLyBGb3IgYSBydWxlIGluc3RhbmNlIGFzc29jaWF0ZWQgd2l0aCBhIHN0cmVhbSxcblx0Ly8gcmV0dXJuIGEgbmV3IHN0cmVhbSBBRlRFUiB0aGlzIHJ1bGUncyBlbmQuXG5cdG5leHQoKSB7XG5cdFx0aWYgKCF0aGlzLnN0cmVhbSB8fCB0aGlzLmVuZEluZGV4ID09PSB1bmRlZmluZWQpXG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBydWxlLm5leHQoKSBjYWxsZWQgb24gcnVsZSB3aXRob3V0IGEgc3RyZWFtYCwgdGhpcyk7XG5cdFx0cmV0dXJuIHRoaXMuc3RyZWFtLmFkdmFuY2VUbyh0aGlzLmVuZEluZGV4KTtcblx0fVxuXG5cbi8vXG4vLyAjIyBvdXRwdXQgYXMgc291cmNlXG4vL1xuXHQvLyBPdXRwdXQgdmFsdWUgZm9yIHRoaXMgSU5TVEFOVElBVEVEIHJ1bGUgYXMgc291cmNlLlxuXHR0b1NvdXJjZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkO1xuXHR9XG5cbi8vXG4vLyAjIyBncm91cDogcmVmbGVjdGlvblxuLy9cblx0Z2V0IHJ1bGVUeXBlKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdH1cbn1cbjtcblxuXG4vLyBSdWxlIGZvciBsaXRlcmFsIHN0cmluZyB2YWx1ZSwgd2hpY2ggaW5jbHVkZSBwdW5jdHVhdGlvbiBzdWNoIGFzIGAoYCBldGMuXG5SdWxlLlN0cmluZyA9IGNsYXNzIFN0cmluZyBleHRlbmRzIFJ1bGUge1xuXHQvLyBQYXJzZSB0aGlzIHJ1bGUgYXQgdGhlIGJlZ2lubmluZyBvZiBgc3RyZWFtYCwgYXNzdW1pbmcgbm8gd2hpdGVzcGFjZSBiZWZvcmUuXG5cdC8vIERlZmF1bHQgaXMgdGhhdCBgcnVsZS5zdHJpbmdgIGlzIGxpdGVyYWwgc3RyaW5nIHRvIG1hdGNoLlxuXHQvLyBPbiBtYXRjaCwgcmV0dXJucyBjbG9uZSBvZiBydWxlIHdpdGggYHZhbHVlYCwgYHN0cmVhbWAgYW5kIGBlbmRJbmRleGAuXG5cdC8vIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgbm8gbWF0Y2guXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0aWYgKCFzdHJlYW0uc3RhcnRzV2l0aCh0aGlzLnN0cmluZykpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogdGhpcy5zdHJpbmcsXG5cdFx0XHRlbmRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXggKyB0aGlzLnN0cmluZy5sZW5ndGgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnN0cmluZztcblx0fVxufVxuXG5cbi8vIFJlZ2V4IHBhdHRlcm4uXG4vLyBgcnVsZS5wYXR0ZXJuYCBpcyB0aGUgcmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoLlxuLy8gTk9URTogdGhlIHJlZ2V4IHNob3VsZCBzdGFydCB3aXRoIGAvXi4uLmAgdG8gbWF0Y2ggYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHZhciBtYXRjaCA9IHN0cmVhbS5tYXRjaCh0aGlzLnBhdHRlcm4pO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogbWF0Y2hbMF0sXG5cdFx0XHRlbmRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXggKyBtYXRjaFswXS5sZW5ndGgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm47XG5cdH1cbn1cblxuXG4vLyBLZXl3b3JkIHBhdHRlcm5cbi8vXHRgcnVsZS5rZXl3b3JkYCBpcyB0aGUga2V5d29yZCBzdHJpbmcgdG8gbWF0Y2guXG5SdWxlLktleXdvcmQgPSBjbGFzcyBLZXl3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHRcdC8vIGNyZWF0ZSBwYXR0ZXJuIHdoaWNoIG1hdGNoZXMgYXQgd29yZCBib3VuZGFyeVxuXHRcdGlmICghdGhpcy5wYXR0ZXJuKSB7XG5cdFx0XHRpZiAoIXRoaXMua2V5d29yZCkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIGtleXdvcmQgcHJvcGVydHlcIik7XG5cdFx0XHR0aGlzLnBhdHRlcm4gPSBuZXcgUmVnRXhwKGBeJHt0aGlzLmtleXdvcmR9XFxcXGJgKTtcblx0XHR9XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5rZXl3b3JkO1xuXHR9XG59XG5cblxuLy8gU3VicnVsZSAtLSBuYW1lIG9mIGFub3RoZXIgcnVsZSB0byBiZSBjYWxsZWQuXG4vLyBgcnVsZS5uYW1lYCBpcyB0aGUgbmFtZSBvZiB0aGUgcnVsZSBpbiBgcGFyc2VyLnJ1bGVzYC5cblJ1bGUuU3VicnVsZSA9IGNsYXNzIFN1YnJ1bGUgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHR2YXIgcnVsZSA9IHBhcnNlci5nZXRSdWxlKHRoaXMucnVsZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEF0dGVtcHRpbmcgdG8gcGFyc2UgdW5rbm93biBydWxlICcke3RoaXMubmFtZX0nYCwgdGhpcyk7XG5cdFx0dmFyIHJlc3VsdCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIHJlc3VsdC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgeyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlfX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuXG4vLyBBYnN0cmFjdDogIGBOZXN0ZWRgIHJ1bGUgLS0gY29tcG9zZWQgb2YgYSBzZXJpZXMgb2Ygb3RoZXIgYHJ1bGVzYC5cblJ1bGUuTmVzdGVkID0gY2xhc3MgTmVzdGVkIGV4dGVuZHMgUnVsZSB7fVxuXG5cbi8vIFNlcXVlbmNlIG9mIHJ1bGVzIHRvIG1hdGNoIChhdXRvLWV4Y2x1ZGluZyB3aGl0ZXNwYWNlKS5cblJ1bGUuU2VxdWVuY2UgPSBjbGFzcyBTZXF1ZW5jZSBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0Ly8gVGhyb3dzIG9mIG1hbmRhdG9yeSBydWxlIGNhbid0IGJlIG1hdGNoZWQuXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IHJlc3VsdHMgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCByZXN1bHQgPSBydWxlLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIXJlc3VsdCAmJiAhcnVsZS5vcHRpb25hbCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdGlmIChyZXN1bHQpIHtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cdFx0XHRcdG5leHQgPSByZXN1bHQubmV4dCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBpZiB3ZSBnZXQgaGVyZSwgd2UgbWF0Y2hlZCBhbGwgdGhlIHJ1bGVzIVxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdHJlc3VsdHMsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuLy9UT0RPQ1xuXHQvLyBHYXRoZXIgYXJndW1lbnRzIGZyb20gb3VyIHBhcnNlZCBgcmVzdWx0c2AgYXJyYXkuXG5cdC8vIFJldHVybnMgYW4gb2JqZWN0IHdpdGggcHJvcGVydGllcyBmcm9tIHRoZSBgdmFsdWVzYCBhcnJheSBpbmRleGVkIGJ5XG5cdC8vXHRcdC0gYHJlc3VsdHMuYXJndW1lbnRgOlx0XHRhcmd1bWVudCBzZXQgd2hlbiBydWxlIHdhcyBkZWNsYXJlZCwgZWc6IGB7dmFsdWU6bGl0ZXJhbH1gID0+IGB2YWx1ZWBcblx0Ly9cdFx0LSBgcmVzdWx0cy5ydWxlTmFtZWA6XHRcdG5hbWUgb2YgcnVsZSB3aGVuIGRlZmluZWRcblx0Ly9cdFx0LSBydWxlIHR5cGU6XHRcdFx0XHRuYW1lIG9mIHRoZSBydWxlIHR5cGVcblx0Z2F0aGVyQXJndW1lbnRzKCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCBhcmdzID0ge307XG5cdFx0Zm9yIChsZXQgbmV4dCBvZiB0aGlzLnJlc3VsdHMpIHtcblx0XHRcdGxldCBydWxlTmFtZSA9IG5leHQuYXJndW1lbnQgfHwgbmV4dC5ydWxlTmFtZSB8fCBuZXh0LmNvbnN0cnVjdG9yLm5hbWU7XG5cdFx0XHQvLyBGb3IgbmVzdGVkIHJ1bGVzLCByZWN1cnNlIHRvIGdldCB0aGVpciBhcmd1bWVudHNcblx0XHRcdGxldCByZXN1bHQgPSAobmV4dCBpbnN0YW5jZW9mIFJ1bGUuTmVzdGVkID8gbmV4dC5nYXRoZXJBcmd1bWVudHMoKSA6IG5leHQpO1xuXG5cdFx0XHRpZiAocnVsZU5hbWUgaW4gYXJncykge1xuXHRcdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkoYXJnc1tydWxlTmFtZV0pKSBhcmdzW3J1bGVOYW1lXSA9IFthcmdzW3J1bGVOYW1lXV07XG5cdFx0XHRcdGFyZ3NbcnVsZU5hbWVdLnB1c2gocmVzdWx0KTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRhcmdzW3J1bGVOYW1lXSA9IHJlc3VsdDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGFyZ3M7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlcy5qb2luKFwiIFwiKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG5cbn1cblxuLy8gU3ludGFjdGljIHN1Z2FyIGZvciBkZWJ1Z2dpbmdcblJ1bGUuRXhwcmVzc2lvbiA9IGNsYXNzIEV4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIFN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXguXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGZpcnN0IHZhbGlkIG1hdGNoLlxuLy8gVE9ETzogbWF0Y2ggYWxsIHZhbGlkIGFsdGVybmF0aXZlc1xuLy8gVE9ETzogcmVuYW1lXG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdGlmICh0aGlzLmFyZ3VtZW50KSBtYXRjaC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0XHRcdHJldHVybiBtYXRjaDtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCgke3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZXMuam9pbihcInxcIil9KSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBSZXBlYXRpbmcgcnVsZS5cbi8vXHRgdGhpcy5ydWxlYCBpcyB0aGUgcnVsZSB0aGF0IHJlcGVhdHMuXG4vL1xuLy8gQWZ0ZXIgbWF0Y2hpbmc6XG4vL1x0YHRoaXMucmVzdWx0c2AgaXMgYXJyYXkgb2YgcmVzdWx0cyBvZiBtYXRjaGVzLlxuLy9cbi8vXHRBdXRvbWF0aWNhbGx5IGNvbnN1bWVzIHdoaXRlc3BhY2UgYmVmb3JlIHJ1bGVzLlxuLy9cdElmIGRvZXNuJ3QgbWF0Y2ggYXQgbGVhc3Qgb25lLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuUnVsZS5SZXBlYXQgPSBjbGFzcyBSZXBlYXQgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IG5leHQgPSBzdHJlYW07XG5cdFx0bGV0IHJlc3VsdHMgPSBbXTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMucnVsZS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFyZXN1bHQpIGJyZWFrO1xuXG5cdFx0XHRyZXN1bHRzLnB1c2hbcmVzdWx0XTtcblx0XHRcdG5leHQgPSByZXN1bHQubmV4dCgpO1xuXHRcdH1cblxuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdHJlc3VsdHMsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1NvdXJjZSgpIHtcblx0XHR0aHJvdyBcIkRvbid0IHVuZGVyc3RhbmQgaG93IHRvIHNvdXJjZSBSdWxlLlJlcGVhdCFcIjtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnJ1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe2xpdGVyYWx9LF1gIHRvIG1hdGNoIGBhLGIsY2Bcbi8vXHRgcnVsZS5pdGVtYCBpcyB0aGUgcnVsZSBmb3IgZWFjaCBpdGVtLFxuLy9cdGBydWxlLmRlbGltaXRlcmAgaXMgdGhlIGRlbGltaXRlciBiZXR3ZWVuIGVhY2ggaXRlbS5cbi8vIFx0YHJ1bGUucmVzdWx0c2AgaW4gdGhlIG91dHB1dCBpcyB0aGUgbGlzdCBvZiB2YWx1ZXMuXG4vL1xuLy9cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGEgTGlzdCBydWxlIHdpbGwgTk9UIHJlcGVhdCAoPz8/PylcblJ1bGUuTGlzdCA9IGNsYXNzIExpc3QgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHQvLyBlbnN1cmUgaXRlbSBhbmQgZGVsaW1pdGVyIGFyZSBvcHRpb25hbCBzbyB3ZSBkb24ndCBiYXJmIGluIGBwYXJzZVJ1bGVgXG5cdFx0dGhpcy5pdGVtLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR0aGlzLmRlbGltaXRlci5vcHRpb25hbCA9IHRydWU7XG5cblx0XHR2YXIgcmVzdWx0cyA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHQvLyBnZXQgbmV4dCBpdGVtLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGl0ZW0gPSB0aGlzLml0ZW0ucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghaXRlbSkgYnJlYWs7XG4vL2NvbnNvbGUubG9nKGl0ZW0pO1xuXHRcdFx0cmVzdWx0cy5wdXNoKGl0ZW0pO1xuXHRcdFx0bmV4dCA9IGl0ZW0ubmV4dCgpO1xuXG5cdFx0XHQvLyBnZXQgZGVsaW1pdGVyLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGRlbGltaXRlciA9IHRoaXMuZGVsaW1pdGVyLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0ID0gZGVsaW1pdGVyLm5leHQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIG1hdGNoZWQgaXRlbSBieSBpbmRleFxuXHRnZXRJdGVtKGluZGV4KSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMucmVzdWx0c1tpbmRleF07XG5cdH1cblxuXG5cdHRvU291cmNlKCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1x0XHQvLyBUT0RPOiB0aHJvdz8/P1xuXHRcdGxldCByZXN1bHRzID0gdGhpcy5yZXN1bHRzLm1hcCggcmVzdWx0ID0+IHJlc3VsdC50b1NvdXJjZSgpICkuam9pbihcIiwgXCIpO1xuXHRcdHJldHVybiBgWyR7cmVzdWx0c31dYDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgWyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5pdGVtfSAke3RoaXMuZGVsaW1pdGVyfV1gO1xuXHR9XG59O1xuXG5cblxuXG5cbi8vXG4vL1x0IyBQYXJzaW5nIGBydWxlU3ludGF4YCB0byBjcmVhdGUgcnVsZXMgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUT0RPOlx0UHVsbCBgcGFyc2VSdWxlU3ludGF4YCBzdHVmZiBvdXQgaW50byBzZXBhcmF0ZSBtb2R1bGU/XG4vLyBUT0RPOlx0QmV0dGVyIG5hbWUgZm9yIGBydWxlU3ludGF4YFxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cbi8vIFRPRE86IGNvbnZlcnQgdG8gVGV4dFN0cmVhbSBwYXR0ZXJuIGFsYSBub3JtYWwgcGFyc2VyIG9uY2UgdGhhdCBzZXR0bGVzIGRvd24/Pz9cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHR2YXIgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggPSAwLCBsYXN0SW5kZXggPSBzeW50YXhTdHJlYW0ubGVuZ3RoKSB7XG5cdFx0d2hpbGUgKHN0YXJ0SW5kZXggPCBsYXN0SW5kZXgpIHtcblx0XHRcdGxldCBbIHJ1bGUsIGVuZEluZGV4IF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGlmIChlbmRJbmRleCA+PSBsYXN0SW5kZXgpXG5cdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihcIlBhc3QgbGFzdEluZGV4XCIpO1xuXHRcdFx0aWYgKHJ1bGUpIHJ1bGVzLnB1c2gocnVsZSk7XG5cdFx0XHRzdGFydEluZGV4ID0gZW5kSW5kZXggKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZXM7XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0dmFyIHN5bnRheFRva2VuID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXG5cdFx0c3dpdGNoIChzeW50YXhUb2tlbikge1xuXHRcdFx0Y2FzZSBcIntcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIihcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCJbXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCJ8XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfYWx0ZXJuYXRpdmVzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIipcIjpcblx0XHRcdGNhc2UgXCIrXCI6XG5cdFx0XHRjYXNlIFwiP1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblxuXHRcdFx0Ly8gdGhlIGZvbGxvd2luZyBzaG91bGQgQUxXQVlTIGJlIGNvbnN1bWVkIGJ5IHRoZSBhYm92ZVxuXHRcdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGNhc2UgXCIpXCI6XG5cdFx0XHRjYXNlIFwiXVwiOlxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgJHtzeW50YXhUb2tlbn0gZm91bmQgYXMgaXRlbSAke3N0YXJ0SW5kZXh9IG9mICR7dGhpcy5zeW50YXh9YCk7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdHJpbmcoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzdHJpbmcgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF0sIHJ1bGU7XG5cdFx0Ly8gSWYgbGV0dGVycyBvbmx5LCBtYXRjaCBhcyBhIEtleXdvcmQgKHNvIHdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGFmdGVyIHRoZSBzdHJpbmcpLlxuXHRcdGlmIChzdHJpbmcubWF0Y2goL1tBLVphLXpdKy8pKSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuS2V5d29yZCh7IGtleXdvcmQ6IHN0cmluZyB9KTtcblx0XHR9XG5cdFx0Ly8gT3RoZXJ3aXNlIG1hdGNoIGFzIGEgU3RyaW5nLCB3aGljaCBkb2Vzbid0IHJlcXVpcmUgbm9uLXdvcmQgY2hhcnMgYWZ0ZXIgdGhlIHRleHQuXG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuU3RyaW5nKHsgc3RyaW5nOiBzdHJpbmcgfSk7XG5cdFx0XHQvLyBJZiBzdHJpbmcgc3RhcnRzIHdpdGggYFxcXFxgLCBpdCdzIGFuIGVzY2FwZWQgbGl0ZXJhbCAoZWc6IGBcXFtgIG5lZWRzIHRvIGlucHV0IGFzIGBcXFxcW2ApLlxuXHRcdFx0aWYgKHN0cmluZy5zdGFydHNXaXRoKFwiXFxcXFwiKSkge1xuXHRcdFx0XHQvLyByZW1vdmUgbGVhZGluZyBzbGFzaCBpbiBtYXRjaCBzdHJpbmcuLi5cblx0XHRcdFx0cnVsZS5zdHJpbmcgPSBydWxlLnN0cmluZy5zdWJzdHIoMSk7XG5cdFx0XHRcdC8vIGJ1dCBsZWF2ZSBpdCBpbiB0b1N0cmluZ1xuXHRcdFx0XHRydWxlLnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gWyBydWxlLCBzdGFydEluZGV4IF07XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBncm91cGluZyBleHByZXNzaW9uIGAoLi4uKWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIihcIiwgXCIpXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0Ly8gcHVsbCBvdXQgZXhwbGljaXQgYXJndW1lbnQgbmFtZVxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdGxldCBydWxlO1xuXHRcdHZhciByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHNsaWNlLCBbXSk7XG5cdFx0Ly8gU2luZ2xlIHJlc3VsdCBtZWFucyBvcHRpb25hbCBleHByZXNzaW9uXG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcmVzdWx0c1swXTtcblx0XHRcdGlmICghKHJ1bGUgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHJ1bGUub3B0aW9uYWwgPSB0cnVlO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdH1cblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblxuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3ltYm9sID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXHRcdHZhciBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuUmVwZWF0KHsgcnVsZSB9KTtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydEluZGV4IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnRJbmRleCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlN1YnJ1bGUoeyBydWxlOiBtYXRjaC5zbGljZVswXSB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBtYXRjaC5lbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuTGlzdCgpO1xuXHRcdHJ1bGUuaXRlbSA9IHJlc3VsdHNbMF1cblx0XHRydWxlLmRlbGltaXRlciA9IHJlc3VsdHNbMV1cblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGFsdGVybmF0ZSBgKCBhIHwgYiB8IGMgKWAuXG5cdC8vIE5PVEU6IHRoaXMgc2hvdWxkIG9ubHkgaGFwcGVuIGluc2lkZSBhIGdyb3VwLi4uXG5cdHBhcnNlUnVsZVN5bnRheF9hbHRlcm5hdGl2ZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCBbIHJ1bGUsIGVuZEluZGV4IF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ICsgMSk7XG5cblx0XHQvLyBjcmVhdGUgYWx0ZXJuYXRlcyBydWxlIHdpdGggbGFzdFRva2VuLCBvciByZS11c2UgZXhpc3RpbmcgYWx0ZXJuYXRlcyByaWxlXG5cdFx0bGV0IGFsdGVybmF0ZXM7XG5cdFx0bGV0IGxhc3RUb2tlbiA9IHJ1bGVzLnBvcCgpO1xuXHRcdGlmIChsYXN0VG9rZW4gaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykge1xuXHRcdFx0YWx0ZXJuYXRlcyA9IGxhc3RUb2tlbjtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRhbHRlcm5hdGVzID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IFtdIH0pO1xuXG5cdFx0XHQvLyBpZiBubyBsYXN0IHJ1bGUsIHdlIGhhdmUgYSBydWxlIGxpa2UgIGAoIHwgYWJjKWAgd2hpY2ggbWVhbnMgdGhhdCB0aGUgYWx0ZXJuYXRlcyBpcyBvcHRpb25hbFxuXHRcdFx0aWYgKCFsYXN0VG9rZW4pXG5cdFx0XHRcdGFsdGVybmF0ZXMub3B0aW9uYWwgPSB0cnVlO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRhbHRlcm5hdGVzLnJ1bGVzLnB1c2gobGFzdFRva2VuKTtcblx0XHR9XG5cdFx0Ly8gYWRkIHBhcnNlZCBydWxlIHRvIHRoZSBhbHRlcm5hdGVzc1xuXHRcdGFsdGVybmF0ZXMucnVsZXMucHVzaChydWxlKTtcblxuXHRcdC8vIGFkZCBiYWNrIHRvIHRoZSBlbmQgb2YgcnVsZXNcblx0XHRydWxlcy5wdXNoKGFsdGVybmF0ZXMpO1xuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBlbmRJbmRleCBdO1xuXHR9LFxuXG5cbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGUuanMiLCJpbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmNvbnN0IHBhcnNlciA9IG5ldyBQYXJzZXIoKTtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbndpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9fcGFyc2VyLmpzIiwiXG4vLyBUT0RPOiBjb252ZXJ0IHRvIGxpbmUtYXdhcmUgc3RyZWFtPz8/XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXh0U3RyZWFtIHtcblx0Y29uc3RydWN0b3IodGV4dE9yUHJvcHMpIHtcblx0XHRpZiAodHlwZW9mIHRleHRPclByb3BzID09PSBcInN0cmluZ1wiKSB0aGlzLnRleHQgPSB0ZXh0T3JQcm9wcztcblx0XHRlbHNlIE9iamVjdC5hc3NpZ24odGhpcywgdGV4dE9yUHJvcHMpO1xuXHRcdGlmICghdGhpcy5zdGFydEluZGV4KSB0aGlzLnN0YXJ0SW5kZXggPSAwO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGFuIGltbXV0YWJsZSBjbG9uZSBvZiB0aGUgc3RyZWFtLlxuXHRjbG9uZShwcm9wcykge1xuXHRcdGxldCBjbG9uZSA9IG5ldyBUZXh0U3RyZWFtKHRoaXMpO1xuXHRcdE9iamVjdC5hc3NpZ24oY2xvbmUsIHByb3BzKTtcblx0XHRyZXR1cm4gY2xvbmU7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNlZCB0byBuZXcgc3RhcnRJbmRleC5cblx0YWR2YW5jZVRvKHN0YXJ0SW5kZXgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXggfSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNpbmcgc3RhcnRJbmRleCBCWSBgbGVuZ3RoYFxuXHRhZHZhbmNlQnkobGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG5cdH1cblxuLy8gXHQvLyBSZXR1cm4gY2xvbmUgb2YgdGhpcyBzdHJlYW0gd2l0aCBlbmRJbmRleCBzZXQgdG8gc3RhcnQgKyBgbGVuZ3RoYFxuLy8gXHRlbmRBZnRlcihsZW5ndGgpIHtcbi8vIFx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IGVuZEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG4vLyBcdH1cblxuXHQvLyBNYXRjaCBgcGF0dGVybmAgYXMgcmVnZXggYXQgaGVhZCBvZiBzdHJlYW0uXG5cdC8vIE5PVEU6IHJlZ2V4ZXMgc2hvdWxkIHN0YXJ0IHdpdGggYF5gIVxuXHQvLyBSZXR1cm5zIG1hdGNoIG9yIHVuZGVmaW5lZC5cblx0bWF0Y2gocGF0dGVybikge1xuXHRcdGlmICghKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBUZXh0U3RyZWFtLm1hdGNoKCR7cGF0dGVybn0pOiBleHBlY3RlZCBSZWdFeHBgKTtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQubWF0Y2gocGF0dGVybik7XG5cdH1cblxuXHRzdGFydHNXaXRoKHN0cmluZykge1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5zdGFydHNXaXRoKHN0cmluZyk7XG5cdH1cblxuXHQvLyBSZXR1cm4gdGV4dCBvZiBzdHJpbmcgc3RhcnRpbmcgYXQgb3VyIGBzdGFydEluZGV4YFxuXHRnZXQgaGVhZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5yYW5nZSgpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgcmFuZ2Ugb2YgdGhlIHN0cmluZyBmcm9tIGBzdGFydEluZGV4YCB0byBgZW5kSW5kZXhgIE5PTi1pbmNsdXNpdmUuXG5cdHJhbmdlKHN0YXJ0SW5kZXggPSB0aGlzLnN0YXJ0SW5kZXgsIGVuZEluZGV4ID0gdGhpcy50ZXh0Lmxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQuc3Vic3RyaW5nKHN0YXJ0SW5kZXgsIGVuZEluZGV4KTtcblx0fVxuXG5cdC8vIExlbmd0aCBvZiB0aGUgc3RyZWFtLlxuXHRnZXQgbGVuZ3RoKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQubGVuZ3RoO1xuXHR9XG5cblx0Ly8gQXJlIHdlIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmVhbT9cblx0Z2V0IGlzRW1wdHkoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3RhcnRJbmRleCA9PT0gdGhpcy5sZW5ndGg7XG5cdH1cblxuXG5cblxuXHQvL1xuXHQvLyMjIFJlZmxlY3Rpb25cblx0Ly9cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dFxuXHR9O1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1RleHRTdHJlYW0uanMiLCJpbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gbG9hZCBzdGFuZGFyZCBydWxlcyBmaWxlcyBoZXJlXG5pbXBvcnQgXyBmcm9tIFwiLi9ydWxlc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuXG4vL1xuLy8gUmVnZXggcGF0dGVybiBydWxlcyB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvcnMgZm9yIGRlYnVnZ2luZ1xuLy9cbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJ3aGl0ZXNwYWNlXCIsIC9eXFxzKy8pO1xucGFyc2VyLmFkZFJ1bGUoXCJ3aGl0ZXNwYWNlXCIsIG5ldyAoY2xhc3Mgd2hpdGVzcGFjZSBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7IHBhdHRlcm46IC9eXFxzKy8sIG9wdGlvbmFsOiB0cnVlIH0pKTtcblxuLy8gYGlkZW50aWZpZXJgID0gdmFyaWFibGVzIG9yIHByb3BlcnR5IG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcbi8vcGFyc2VyLmFkZFBhdHRlcm4oXCJpZGVudGlmaWVyXCIsIC9eW2Etel1bXFx3XFxkXFwtX10qLyk7XG5wYXJzZXIuYWRkUnVsZShcImlkZW50aWZpZXJcIiwgbmV3IChjbGFzcyBpZGVudGlmaWVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJue30pKHsgcGF0dGVybjogL15bYS16XVtcXHdcXC1dKi8gfSkpO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG4vL3BhcnNlci5hZGRQYXR0ZXJuKFwidHlwZW5hbWVcIiwgL15bQS1aXVtcXHdcXGRcXC1fXSovKTtcbnBhcnNlci5hZGRSdWxlKFwiVHlwZVwiLCBuZXcgKGNsYXNzIFR5cGUgZXh0ZW5kcyBSdWxlLlBhdHRlcm57fSkoeyBwYXR0ZXJuOiAvXltBLVpdW1xcd1xcLV0qLyB9KSk7XG5cblxuLy8gTnVtZXJpYyBsaXRlcmFsIChlaXRoZXIgZmxvYXQgb3IgaW50ZWdlciksIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbnBhcnNlci5hZGRSdWxlKFwibnVtYmVyXCIsIG5ldyAoY2xhc3MgbnVtYmVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJue30pKHtcblx0cGF0dGVybjogL14tP1xcZCsoPzpcXC5cXGQrKT8vLFxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUZsb2F0KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5cblxuLy8gTGl0ZXJhbCBgdGV4dGAgc3RyaW5nLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBSZXR1cm5lZCB2YWx1ZSBoYXMgZW5jbG9zaW5nIHF1b3Rlcy5cbnBhcnNlci5hZGRSdWxlKFwidGV4dFwiLCBuZXcgKGNsYXNzIHRleHQgZXh0ZW5kcyBSdWxlLlBhdHRlcm57fSkoe1xuXHRwYXR0ZXJuOiAvXig/OlwiW15cIl0qXCJ8J1teJ10qJykvXG59KSk7XG5cblxuLy8gQm9vbGVhbiBsaXRlcmFsLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBUT0RPOiBiZXR0ZXIgbmFtZSBmb3IgdGhpcz8/P1xucGFyc2VyLmFkZFJ1bGUoXCJib29sZWFuXCIsIG5ldyAoY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7XG5cdHBhdHRlcm46IC9eKHRydWV8ZmFsc2V8eWVzfG5vfHN1Y2Nlc3N8ZmFpbHVyZXxva3xjYW5jZWwpXFxiLyxcblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0Y2FzZSBcInRydWVcIjpcblx0XHRcdGNhc2UgXCJ5ZXNcIjpcblx0XHRcdGNhc2UgXCJzdWNjZXNzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59KSk7XG5cblxuLy9cbi8vIFJ1bGVzIGF1dG8tZGVyaXZlZCBmcm9tIG91ciBgcnVsZSBzeW50YXhgLlxuLy9cblxuLy8gTGl0ZXJhbCB2YWx1ZSBhcyBudW1iZXIsIHRleHQgb3IgYm9vbGVhbi5cbnBhcnNlci5hZGRTeW50YXgoXCJsaXRlcmFsXCIsIFwiKGxpdGVyYWw6e251bWJlcn18e3RleHR9fHtib29sZWFufSlcIik7XG5cblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxucGFyc2VyLmFkZFN5bnRheChcblx0XCJsaXRlcmFsLWxpc3RcIixcblx0XCJcXFxcW1tsaXN0OntsaXRlcmFsfSxdP1xcXFxdXCIsXG5cdHtcblx0XHQvLyBNb2RpZnkgYGFyZ3VtZW50c2Agb2YgdGhpcyBleHByZXNzaW9uIHRvIGp1c3QgdGhlIGxpc3QgcmV0dXJuZWQuXG5cdFx0Z2F0aGVyQXJndW1lbnRzKCkge1xuXHRcdFx0dmFyIGFyZ3MgPSBSdWxlLlNlcXVlbmNlLnByb3RvdHlwZS5nYXRoZXJBcmd1bWVudHMuYXBwbHkodGhpcyk7XG5cdFx0XHRpZiAoIWFyZ3MpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRyZXR1cm4gYXJncy5saXN0O1xuXHRcdH0sXG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHR2YXIgbGlzdCA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRyZXR1cm4gbGlzdC50b1NvdXJjZSgpO1xuXHRcdH1cblx0fVxuKTtcblxuXG5wYXJzZXIuYWRkU3ludGF4KFwic2NvcGUtbW9kaWZpZXJcIiwgXCIoc2NvcGU6Z2xvYmFsfGNvbnN0YW50fHNoYXJlZClcIik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZS1wcm9wZXJ0eVwiLFxuXHRcIntzY29wZS1tb2RpZmllcn0/IHtpZGVudGlmaWVyfSA9IHtsaXRlcmFsfVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0bGV0IHN0YXRlbWVudCA9IGAke2FyZ3MuaWRlbnRpZmllci50b1NvdXJjZSgpfSA9ICR7YXJncy5saXRlcmFsLnRvU291cmNlKCl9O2A7XG5cblx0XHRcdHZhciBzY29wZSA9IChhcmdzLnNjb3BlID8gYXJncy5zY29wZS50b1NvdXJjZSgpIDogXCJsb2NhbFwiKTtcblx0XHRcdHN3aXRjaCAoc2NvcGUpIHtcblx0XHRcdFx0Y2FzZSBcImdsb2JhbFwiOlxuXHRcdFx0XHRcdHJldHVybiBgZ2xvYmFsLiR7c3RhdGVtZW50fWA7XG5cblx0XHRcdFx0Y2FzZSBcImNvbnN0YW50XCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBjb25zdCAke3N0YXRlbWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJzaGFyZWRcIjpcblx0XHRcdFx0XHRyZXR1cm4gYHN0YXRpYyAke3N0YXRlbWVudH1gO1xuXG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0cmV0dXJuIHN0YXRlbWVudDtcblx0XHRcdH1cblx0XHR9XG5cdH1cbik7XG5cbi8vIFRPRE86IHdhcm4gb24gaW52YWxpZCBzZXQ/ICBzaGFyZWQ/ICB1bmRlZmluZWQ/IHNvbWV0aGluZyBvdGhlciB0aGFuIHRoZSBmaXJzdCB2YWx1ZSBhcyBkZWZhdWx0P1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlLXByb3BlcnR5LWFzLW9uZS1vZlwiLFxuXHRcIntpZGVudGlmaWVyfSBhcyBvbmUgb2Yge2xpc3Q6bGl0ZXJhbC1saXN0fVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXG5cdFx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IHBsdXJhbCA9IChpZGVudGlmaWVyICsgXCJfVkFMVUVTXCIpLnRvVXBwZXJDYXNlKCk7XG5cdFx0XHRsZXQgdmFsdWVzID0gYXJncy5saXN0LnRvU291cmNlKCk7XG5cdFx0XHRsZXQgZmlyc3QgPSBhcmdzLmxpc3QucmVzdWx0c1swXTtcblx0XHRcdGxldCBmaXJzdFZhbHVlID0gZmlyc3QgPyBmaXJzdC50b1NvdXJjZSgpIDogXCJ1bmRlZmluZWRcIjtcblxuXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHt2YWx1ZXN9O1xcbmBcblx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9IHsgcmV0dXJuIChcIl9fJHtpZGVudGlmaWVyfVwiIGluIHRoaXMgPyB0aGlzLl9fJHtpZGVudGlmaWVyfSA6ICR7Zmlyc3RWYWx1ZX0pIH1cXG5gXG5cdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy5jb25zdHJ1Y3Rvci4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1cXG5gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3J1bGVzLmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vcnVsZXMvaW5kZXguanNcIjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdHdpbmRvdy5UZXh0U3RyZWFtID0gVGV4dFN0cmVhbTtcblx0d2luZG93LlBhcnNlciA9IFBhcnNlcjtcblx0d2luZG93LlJ1bGUgPSBSdWxlO1xuXHR3aW5kb3cucGFyc2VyID0gcGFyc2VyO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7XG5cdFRleHRTdHJlYW0sIFBhcnNlciwgUnVsZSwgcGFyc2VyXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9pbmRleC5qcyIsIi8vIFNwZWxsIFwiRW5nbGlzaFwiIHBhcnNlciBzdHJhd21hblxuXG4vLyBUT0RPOlx0Y3VzdG9tIFN5bnRheEVycm9yIGV0YyB3aGljaCB1bmRlcnN0YW5kIHN0cmVhbXNcbi8vIFRPRE86XHRhZGQgc2FtZSBuYW1lZCBydWxlID0gbWFrZSBhbHRlcm5hdGl2ZXNcbi8vIFRPRE86XHRgc3RhdGVtZW50YCB2cyBgZXhwcmVzc2lvbmAgdnMgYGNvbnRyb2wgc3RydWN0dXJlYCBldGMgLS0gYXJlIHRoZXNlIGp1c3QgbmFtZWQgcnVsZXM/XG4vLyBUT0RPOlx0YnJlYWsgYGZpbGVgIGludG8gbGluZXMgYW5kIHByb2Nlc3MgZWFjaCAoaW5jbC4gc3Vic3RyL21hdGNoIG5vdCBnb2luZyBiZXlvbmQgdGhlIGVuZClcbi8vIFRPRE86XHRuZXN0aW5nIC0tIGlzIHRoaXMganVzdCBpbmRlbnQgPSBcImFkZCBibG9jayBzY29wZVwiXG4vLyBUT0RPOlx0cHJvbW90aW9uIHBhdHRlcm4gZm9yIGdhdGhlciBhcmd1bWVudHMgKGVnOiBsaXRlcmFsLWxpc3QpXG4vLyBUT0RPOlx0V2hhdCBkb2VzIHN5bnRheCB0cmVlIGxvb2sgbGlrZT8gIEhvdyBkbyB3ZSBleHRyYWN0IG1lYW5pbmcgb3V0IG9mIHRoZSBuZXN0P1xuLy8gVE9ETzpcdERvbid0IHVzZSBgdG9KU09OYCBmb3Igb3V0cHV0dGluZyBydWxlLi4uXG4vLyBUT0RPOlx0UmVjeWNsZSB3b3JkL3N0cmluZy9wYXR0ZXJuIHJ1bGVzIHRvIG1vcmUgZWFzaWx5IHNlZSBjb21tb25hbGl0eS4uLlxuLy8gVE9ETzpcdFBhc3MgYGNvbnRleHRgIHRvIHRvU291cmNlKCksIGFkZCBwcm9wZXJ0eSBkZXNjcmlwdG9ycyB0byBgY2xhc3NgLCB2YXJpYWJsZXMgYW5kIGNvZGUgdG8gYG1ldGhvZGAsIGBnbG9iYWxgIHN0dWZmIGV0Y1xuXG5pbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXHRcdC8vIENsb25lIHJ1bGVzLCBzdGFydGluZyB3aXRoIGEgY29tcGxldGVseSBlbXB0eSBtYXAgaWYgbm90IGRlZmluZWQgKG5vIHN0YW5kYXJkIG9iamVjdCBrZXlzKVxuXHRcdHRoaXMucnVsZXMgPSBPYmplY3QuY3JlYXRlKHRoaXMucnVsZXMgfHwgbnVsbCk7XG5cdH1cblxuXHRnZXRSdWxlKG5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlc1tuYW1lXTtcblx0fVxuXG4vLyMjIyBQYXJzaW5nXG5cblx0Ly8gUGFyc2UgYG5hbWVgZCBydWxlIGF0IGhlYWQgb2YgYHN0cmVhbWAuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cblx0cGFyc2UobmFtZSwgc3RyZWFtKSB7XG5cdFx0aWYgKHR5cGVvZiBzdHJlYW0gPT09IFwic3RyaW5nXCIpIHN0cmVhbSA9IG5ldyBUZXh0U3RyZWFtKHN0cmVhbSk7XG5cblx0XHRsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShuYW1lKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZSAke25hbWV9IG5vdCB1bmRlcnN0b29kYCwgbmFtZSwgc3RyZWFtKTtcblx0XHRzdHJlYW0gPSB0aGlzLmVhdFdoaXRlc3BhY2Uoc3RyZWFtKTtcblx0XHRyZXR1cm4gcnVsZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHR9XG5cblx0Ly8gRWF0IHdoaXRlc3BhY2UgKGFjY29yZGluZyB0byBgcnVsZXMud2hpdGVzcGFjZWApIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBuZXcgc3RyZWFtIGlmIHdlIG1hdGNoZWQgd2hpdGVzcGFjZSwgb3RoZXJ3aXNlIHRoZSBzYW1lIHN0cmVhbS5cblx0Ly8gT3RoZXJ3aXNlIHJldHVybnMgdGhpcyBzYW1lIHN0cmVhbS5cblx0ZWF0V2hpdGVzcGFjZShzdHJlYW0pIHtcblx0XHR2YXIgcmVzdWx0ID0gdGhpcy5ydWxlcy53aGl0ZXNwYWNlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJlc3VsdCA/IHJlc3VsdC5uZXh0KCkgOiBzdHJlYW07XG5cdH1cblxuLy8jIyMgUnVsZSBmYWN0b3JpZXNcblxuXHQvLyBBZGQgYSBydWxlIHRvIG91ciBsaXN0IG9mIHJ1bGVzIVxuXHQvLyBUT0RPOiBjb252ZXJ0IHRvIGBhbHRlcm5hdGl2ZXNgIG9uIG92ZXJ3cml0ZT9cblx0YWRkUnVsZShuYW1lLCBydWxlKSB7XG5cdFx0bGV0IGV4aXN0aW5nID0gdGhpcy5ydWxlc1tuYW1lXTtcblx0XHRpZiAoZXhpc3RpbmcpIHtcblx0XHRcdGNvbnNvbGUud2FybihgQ29udmVydGluZyBydWxlICcke25hbWV9JyB0byBhbHRlcm5hdGl2ZXNgKTtcblx0XHRcdGlmICghKGV4aXN0aW5nIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpKSB7XG5cdFx0XHRcdGV4aXN0aW5nID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgbmFtZTogZXhpc3RpbmcubmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBleGlzdGluZztcblx0XHRcdH1cblx0XHRcdGNvbnNvbGUud2FybihgQWRkaW5nIHJ1bGUgJHtydWxlLm5hbWV9IHRvICR7bmFtZX06IGAsIHJ1bGUpO1xuXHRcdFx0ZXhpc3RpbmcuYWRkUnVsZShydWxlKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlLnJ1bGVOYW1lID0gbmFtZTtcblx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBydWxlO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cdC8vIEFkZCByZWdleCBhcyBhIHBhdHRlcm4gdG8gb3VyIGxpc3Qgb2YgcnVsZXNcblx0YWRkUGF0dGVybihuYW1lLCBwYXR0ZXJuLCBwcm9wZXJ0aWVzKSB7XG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5QYXR0ZXJuKHByb3BlcnRpZXMpO1xuXHRcdHJ1bGUucGF0dGVybiA9IHBhdHRlcm47XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fVxuXG5cdC8vIFBhcnNlIGEgYHJ1bGVTeW50YXhgIHJ1bGUgYW5kIGFkZCBpdCB0byBvdXIgbGlzdCBvZiBydWxlcy5cblx0Ly8gUmV0dXJucyB0aGUgbmV3IHJ1bGUuXG5cdC8vIExvZ3MgcGFyc2luZyBlcnJvcnMgYnV0IGFsbG93cyB0aGluZ3MgdG8gY29udGludWUuXG5cdGFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdHRyeSB7XG5cdFx0XHRsZXQgcnVsZSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IpO1xuXG5cdFx0XHQvLyBSZWZsZWN0IHRoZSBydWxlIGJhY2sgb3V0IHRvIG1ha2Ugc3VyZSBpdCBsb29rcyAobW9yZSBvciBsZXNzKSB0aGUgc2FtZVxuXHRcdFx0Y29uc29sZS5sb2coYEFkZGVkIHJ1bGUgJyR7bmFtZX0nOlxcbiAgSU5QVVQ6ICR7cnVsZVN5bnRheH0gXFxuIE9VVFBVVDogJHtydWxlfWApO1xuXG5cdFx0XHRPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmdyb3VwKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgc3ludGF4OiAke3J1bGVTeW50YXh9YCk7XG5cdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdFx0Y29uc29sZS5ncm91cEVuZCgpO1xuXHRcdH1cblx0fVxuXG5cdGFkZFN0YXRlbWVudChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0dmFyIHN0YXRlbWVudCA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFJ1bGUuU3RhdGVtZW50KTtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHN0YXRlbWVudCk7XG5cdH1cblxuXHRhZGRFeHByZXNzaW9uKG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgZXhwcmVzc2lvbiA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFJ1bGUuRXhwcmVzc2lvbik7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgZXhwcmVzc2lvbik7XG5cdH1cblxuXG4vL1xuLy8gIyMgVXRpbGl0eSBtZXRob2RzXG4vL1xuXHQvLyBGaW5kIHRoZSBtYXRjaGluZyBpbnN0YW5jZSBvZiBwb3NzaWJseSBuZXN0ZWQgYGVuZFRva2VuYCB0byBiYWxhbmNlIGBzdGFydFRva2VuYC5cblx0Ly8gSWYgc3VjY2Vzc2Z1bCwgcmV0dXJucyBgeyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2UgfWBcblx0Ly8gVGhyb3dzIGlmIHVuc3VjZXNzZnVsLlxuXHRzdGF0aWMgZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIHN0YXJ0VG9rZW4sIGVuZFRva2VuLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGlmICh0b2tlbnNbc3RhcnRJbmRleF0gIT09IHN0YXJ0VG9rZW4pIHRocm93IG5ldyBTeW50YXhFcnJvcihgRXhwZWN0ZWQgJyR7c3RhcnRUb2tlbn0nIGF0IGluZGV4ICR7c3RhcnRJbmRleH0gb2YgdG9rZW5zYCk7XG5cdFx0bGV0IG5lc3RpbmcgPSAwO1xuXHRcdGxldCBuZXN0ZWQgPSBmYWxzZTtcblx0XHRmb3IgKGxldCBlbmRJbmRleCA9IHN0YXJ0SW5kZXggKyAxLCBsYXN0SW5kZXggPSB0b2tlbnMubGVuZ3RoOyBlbmRJbmRleCA8IGxhc3RJbmRleDsgZW5kSW5kZXgrKykge1xuXHRcdFx0bGV0IHRva2VuID0gdG9rZW5zW2VuZEluZGV4XTtcblx0XHRcdGlmICh0b2tlbiA9PT0gc3RhcnRUb2tlbikge1xuXHRcdFx0XHRuZXN0aW5nKys7XG5cdFx0XHRcdG5lc3RlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodG9rZW4gPT09IGVuZFRva2VuKSB7XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKVxuXHRcdFx0XHRcdHJldHVybiB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZTogdG9rZW5zLnNsaWNlKHN0YXJ0SW5kZXgrMSwgZW5kSW5kZXgpLCBuZXN0ZWQgfTtcblx0XHRcdFx0bmVzdGluZy0tO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENvdWxkbid0IGZpbmQgbWF0Y2hpbmcgJyR7ZW5kVG9rZW59J3Mgc3RhcnRpbmcgYXQgaXRlbSAke3N0YXJ0SW5kZXh9YCk7XG5cdH1cblxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUGFyc2VyLmpzIl0sInNvdXJjZVJvb3QiOiIifQ==