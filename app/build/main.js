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
				console.log("Converting rule '" + name + "' to alternatives");
				if (!(existing instanceof _Rule2.default.Alternatives)) {
					existing = new _Rule2.default.Alternatives({ name: existing.name, rules: [existing] });
					this.rules[name] = existing;
				}
				console.log("Adding rule '" + rule.ruleName + "' to '" + name + "': ", rule);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgZDI0ZDA3NzJhMzY5ODJlNWM0N2MiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1RleHRTdHJlYW0uanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9ydWxlcy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyJdLCJuYW1lcyI6WyJSdWxlIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInByb3BzIiwiY2xvbmUiLCJjcmVhdGUiLCJzdHJlYW0iLCJlbmRJbmRleCIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsIm1hdGNoZWQiLCJjb25zdHJ1Y3RvciIsIm5hbWUiLCJTdHJpbmciLCJwYXJzZXIiLCJzdGFydHNXaXRoIiwic3RyaW5nIiwic3RhcnRJbmRleCIsImxlbmd0aCIsIlBhdHRlcm4iLCJtYXRjaCIsInBhdHRlcm4iLCJLZXl3b3JkIiwia2V5d29yZCIsIlJlZ0V4cCIsIlN1YnJ1bGUiLCJydWxlIiwiZ2V0UnVsZSIsIlN5bnRheEVycm9yIiwicmVzdWx0IiwicGFyc2UiLCJhcmd1bWVudCIsIm9wdGlvbmFsIiwiTmVzdGVkIiwiU2VxdWVuY2UiLCJyZXN1bHRzIiwibmV4dCIsInJ1bGVzIiwiZWF0V2hpdGVzcGFjZSIsInB1c2giLCJhcmdzIiwicnVsZU5hbWUiLCJnYXRoZXJBcmd1bWVudHMiLCJBcnJheSIsImlzQXJyYXkiLCJqb2luIiwiRXhwcmVzc2lvbiIsIlN0YXRlbWVudCIsIkFsdGVybmF0aXZlcyIsIlJlcGVhdCIsIkxpc3QiLCJpdGVtIiwiZGVsaW1pdGVyIiwiaW5kZXgiLCJtYXAiLCJ0b1NvdXJjZSIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJsYXN0SW5kZXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zdWJydWxlIiwicGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzIiwicGFyc2VSdWxlU3ludGF4X2xpc3QiLCJwYXJzZVJ1bGVTeW50YXhfYWx0ZXJuYXRpdmVzIiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsInBhcnNlUnVsZVN5bnRheF9zdHJpbmciLCJzdWJzdHIiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJzbGljZSIsInN5bWJvbCIsImFsdGVybmF0ZXMiLCJsYXN0VG9rZW4iLCJwb3AiLCJ3aW5kb3ciLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJ0ZXh0IiwiaGVhZCIsInN1YnN0cmluZyIsInJhbmdlIiwiYWRkUnVsZSIsImNvbnRleHQiLCJwYXJzZUZsb2F0IiwiYWRkU3ludGF4IiwicHJvdG90eXBlIiwiYXBwbHkiLCJsaXN0IiwiYWRkU3RhdGVtZW50Iiwic3RhdGVtZW50IiwiaWRlbnRpZmllciIsImxpdGVyYWwiLCJzY29wZSIsInBsdXJhbCIsInRvVXBwZXJDYXNlIiwidmFsdWVzIiwiZmlyc3QiLCJmaXJzdFZhbHVlIiwiUGFyc2VyIiwid2hpdGVzcGFjZSIsImV4aXN0aW5nIiwiY29uc29sZSIsImxvZyIsInJ1bGVTeW50YXgiLCJlIiwiZ3JvdXAiLCJlcnJvciIsImdyb3VwRW5kIiwiZXhwcmVzc2lvbiIsInRva2VucyIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsIm5lc3RpbmciLCJuZXN0ZWQiLCJ0b2tlbiJdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FB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QUFxRG5HLFVBQXJELGdCQUFOO0FBQ3ZDLE9BQUlxRyxVQUFVLENBQWQ7QUFDQSxPQUFJQyxTQUFTLEtBQWI7QUFDQSxRQUFLLElBQUlqSCxXQUFXVyxhQUFhLENBQTVCLEVBQStCOEMsWUFBWW9ELE9BQU9qRyxNQUF2RCxFQUErRFosV0FBV3lELFNBQTFFLEVBQXFGekQsVUFBckYsRUFBaUc7QUFDaEcsUUFBSWtILFFBQVFMLE9BQU83RyxRQUFQLENBQVo7QUFDQSxRQUFJa0gsVUFBVUosVUFBZCxFQUEwQjtBQUN6QkU7QUFDQUMsY0FBUyxJQUFUO0FBQ0E7QUFDRCxRQUFJQyxVQUFVSCxRQUFkLEVBQXdCO0FBQ3ZCLFNBQUlDLFlBQVksQ0FBaEIsRUFDQyxPQUFPLEVBQUVyRyxzQkFBRixFQUFjWCxrQkFBZCxFQUF3QnFFLE9BQU93QyxPQUFPeEMsS0FBUCxDQUFhMUQsYUFBVyxDQUF4QixFQUEyQlgsUUFBM0IsQ0FBL0IsRUFBcUVpSCxjQUFyRSxFQUFQO0FBQ0REO0FBQ0E7QUFDRDtBQUNELFNBQU0sSUFBSTFGLFdBQUosOEJBQTJDeUYsUUFBM0MsNEJBQTBFcEcsVUFBMUUsQ0FBTjtBQUNBOzs7Ozs7a0JBcEhtQnVGLE0iLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBpZGVudGl0eSBmdW5jdGlvbiBmb3IgY2FsbGluZyBoYXJtb255IGltcG9ydHMgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSA1KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCBkMjRkMDc3MmEzNjk4MmU1YzQ3YyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHN0cmVhbSwgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBzdHJlYW1gXHRcdFN0cmVhbSB3aGljaCB3YXMgbWF0Y2hlZCB3aXRoIGBzdGFydEluZGV4YCBhdCB0aGUgc3RhcnQgb2YgdGhlIG1hdGNoXG4vL1x0XHRcdC0gYGVuZEluZGV4YFx0Tm9uLWluY2x1c2l2ZSBlbmQgaW5kZXggaW4gc3RyZWFtIHdoZXJlIG1hdGNoIGVuZHMuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5nYXRoZXJBcmd1bWVudHMoKWBcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZSgpYFx0XHRcdFx0UmV0dXJuIGphdmFzY3JpcHQgc291cmNlIHRvIGludGVycHJldCB0aGUgcnVsZS5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0dmFyIGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCBwcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuXG4vL1xuLy8gIyMgb3V0cHV0IGFzIHNvdXJjZVxuLy9cblx0Ly8gT3V0cHV0IHZhbHVlIGZvciB0aGlzIElOU1RBTlRJQVRFRCBydWxlIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG47XG5cblxuLy8gUnVsZSBmb3IgbGl0ZXJhbCBzdHJpbmcgdmFsdWUsIHdoaWNoIGluY2x1ZGUgcHVuY3R1YXRpb24gc3VjaCBhcyBgKGAgZXRjLlxuUnVsZS5TdHJpbmcgPSBjbGFzcyBTdHJpbmcgZXh0ZW5kcyBSdWxlIHtcblx0Ly8gUGFyc2UgdGhpcyBydWxlIGF0IHRoZSBiZWdpbm5pbmcgb2YgYHN0cmVhbWAsIGFzc3VtaW5nIG5vIHdoaXRlc3BhY2UgYmVmb3JlLlxuXHQvLyBEZWZhdWx0IGlzIHRoYXQgYHJ1bGUuc3RyaW5nYCBpcyBsaXRlcmFsIHN0cmluZyB0byBtYXRjaC5cblx0Ly8gT24gbWF0Y2gsIHJldHVybnMgY2xvbmUgb2YgcnVsZSB3aXRoIGB2YWx1ZWAsIGBzdHJlYW1gIGFuZCBgZW5kSW5kZXhgLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICghc3RyZWFtLnN0YXJ0c1dpdGgodGhpcy5zdHJpbmcpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRoaXMuc3RyaW5nLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgdGhpcy5zdHJpbmcubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5zdHJpbmc7XG5cdH1cbn1cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vIE5PVEU6IHRoZSByZWdleCBzaG91bGQgc3RhcnQgd2l0aCBgL14uLi5gIHRvIG1hdGNoIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHR2YXIgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5wYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IG1hdGNoWzBdLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5wYXR0ZXJuO1xuXHR9XG59XG5cblxuLy8gS2V5d29yZCBwYXR0ZXJuXG4vL1x0YHJ1bGUua2V5d29yZGAgaXMgdGhlIGtleXdvcmQgc3RyaW5nIHRvIG1hdGNoLlxuUnVsZS5LZXl3b3JkID0gY2xhc3MgS2V5d29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0XHQvLyBjcmVhdGUgcGF0dGVybiB3aGljaCBtYXRjaGVzIGF0IHdvcmQgYm91bmRhcnlcblx0XHRpZiAoIXRoaXMucGF0dGVybikge1xuXHRcdFx0aWYgKCF0aGlzLmtleXdvcmQpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBrZXl3b3JkIHByb3BlcnR5XCIpO1xuXHRcdFx0dGhpcy5wYXR0ZXJuID0gbmV3IFJlZ0V4cChgXiR7dGhpcy5rZXl3b3JkfVxcXFxiYCk7XG5cdFx0fVxuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMua2V5d29yZDtcblx0fVxufVxuXG5cbi8vIFN1YnJ1bGUgLS0gbmFtZSBvZiBhbm90aGVyIHJ1bGUgdG8gYmUgY2FsbGVkLlxuLy8gYHJ1bGUubmFtZWAgaXMgdGhlIG5hbWUgb2YgdGhlIHJ1bGUgaW4gYHBhcnNlci5ydWxlc2AuXG5SdWxlLlN1YnJ1bGUgPSBjbGFzcyBTdWJydWxlIGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0dmFyIHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZSh0aGlzLnJ1bGUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBBdHRlbXB0aW5nIHRvIHBhcnNlIHVua25vd24gcnVsZSAnJHt0aGlzLm5hbWV9J2AsIHRoaXMpO1xuXHRcdHZhciByZXN1bHQgPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKTtcblx0XHRpZiAoIXJlc3VsdCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSByZXN1bHQuYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYHske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZX19JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cblxuLy8gQWJzdHJhY3Q6ICBgTmVzdGVkYCBydWxlIC0tIGNvbXBvc2VkIG9mIGEgc2VyaWVzIG9mIG90aGVyIGBydWxlc2AuXG5SdWxlLk5lc3RlZCA9IGNsYXNzIE5lc3RlZCBleHRlbmRzIFJ1bGUge31cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaCAoYXV0by1leGNsdWRpbmcgd2hpdGVzcGFjZSkuXG5SdWxlLlNlcXVlbmNlID0gY2xhc3MgU2VxdWVuY2UgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdC8vIFRocm93cyBvZiBtYW5kYXRvcnkgcnVsZSBjYW4ndCBiZSBtYXRjaGVkLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFyZXN1bHQgJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vVE9ET0Ncblx0Ly8gR2F0aGVyIGFyZ3VtZW50cyBmcm9tIG91ciBwYXJzZWQgYHJlc3VsdHNgIGFycmF5LlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYHZhbHVlc2AgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGByZXN1bHRzLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYHJlc3VsdHMucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gcnVsZSB0eXBlOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdGdhdGhlckFyZ3VtZW50cygpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRsZXQgYXJncyA9IHt9O1xuXHRcdGZvciAobGV0IG5leHQgb2YgdGhpcy5yZXN1bHRzKSB7XG5cdFx0XHRsZXQgcnVsZU5hbWUgPSBuZXh0LmFyZ3VtZW50IHx8IG5leHQucnVsZU5hbWUgfHwgbmV4dC5jb25zdHJ1Y3Rvci5uYW1lO1xuXHRcdFx0Ly8gRm9yIG5lc3RlZCBydWxlcywgcmVjdXJzZSB0byBnZXQgdGhlaXIgYXJndW1lbnRzXG5cdFx0XHRsZXQgcmVzdWx0ID0gKG5leHQgaW5zdGFuY2VvZiBSdWxlLk5lc3RlZCA/IG5leHQuZ2F0aGVyQXJndW1lbnRzKCkgOiBuZXh0KTtcblxuXHRcdFx0aWYgKHJ1bGVOYW1lIGluIGFyZ3MpIHtcblx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KGFyZ3NbcnVsZU5hbWVdKSkgYXJnc1tydWxlTmFtZV0gPSBbYXJnc1tydWxlTmFtZV1dO1xuXHRcdFx0XHRhcmdzW3J1bGVOYW1lXS5wdXNoKHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0YXJnc1tydWxlTmFtZV0gPSByZXN1bHQ7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBhcmdzO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBFeHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuUnVsZS5TdGF0ZW1lbnQgPSBjbGFzcyBTdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gQWx0ZXJuYXRpdmUgc3ludGF4LlxuLy8gTk9URTogQ3VycmVudGx5IHRha2VzIHRoZSBmaXJzdCB2YWxpZCBtYXRjaC5cbi8vIFRPRE86IG1hdGNoIGFsbCB2YWxpZCBhbHRlcm5hdGl2ZXNcbi8vIFRPRE86IHJlbmFtZVxuUnVsZS5BbHRlcm5hdGl2ZXMgPSBjbGFzcyBBbHRlcm5hdGl2ZXMgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKTtcblx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRpZiAodGhpcy5hcmd1bWVudCkgbWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdFx0XHRyZXR1cm4gbWF0Y2g7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0YWRkUnVsZShydWxlKSB7XG5cdFx0dGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAoJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGVzLmpvaW4oXCJ8XCIpfSkke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuLy8gUmVwZWF0aW5nIHJ1bGUuXG4vL1x0YHRoaXMucnVsZWAgaXMgdGhlIHJ1bGUgdGhhdCByZXBlYXRzLlxuLy9cbi8vIEFmdGVyIG1hdGNoaW5nOlxuLy9cdGB0aGlzLnJlc3VsdHNgIGlzIGFycmF5IG9mIHJlc3VsdHMgb2YgbWF0Y2hlcy5cbi8vXG4vL1x0QXV0b21hdGljYWxseSBjb25zdW1lcyB3aGl0ZXNwYWNlIGJlZm9yZSBydWxlcy5cbi8vXHRJZiBkb2Vzbid0IG1hdGNoIGF0IGxlYXN0IG9uZSwgcmV0dXJucyBgdW5kZWZpbmVkYC5cblJ1bGUuUmVwZWF0ID0gY2xhc3MgUmVwZWF0IGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBuZXh0ID0gc3RyZWFtO1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghcmVzdWx0KSBicmVhaztcblxuXHRcdFx0cmVzdWx0cy5wdXNoW3Jlc3VsdF07XG5cdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0dGhyb3cgXCJEb24ndCB1bmRlcnN0YW5kIGhvdyB0byBzb3VyY2UgUnVsZS5SZXBlYXQhXCI7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlfSR7dGhpcy5vcHRpb25hbCA/ICcqJyA6ICcrJ31gO1xuXHR9XG59XG5cblxuLy8gTGlzdCBtYXRjaCBydWxlOiAgIGBbPGl0ZW0+PGRlbGltaXRlcj5dYC4gZWdcIiBgW3tsaXRlcmFsfSxdYCB0byBtYXRjaCBgYSxiLGNgXG4vL1x0YHJ1bGUuaXRlbWAgaXMgdGhlIHJ1bGUgZm9yIGVhY2ggaXRlbSxcbi8vXHRgcnVsZS5kZWxpbWl0ZXJgIGlzIHRoZSBkZWxpbWl0ZXIgYmV0d2VlbiBlYWNoIGl0ZW0uXG4vLyBcdGBydWxlLnJlc3VsdHNgIGluIHRoZSBvdXRwdXQgaXMgdGhlIGxpc3Qgb2YgdmFsdWVzLlxuLy9cbi8vXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhIExpc3QgcnVsZSB3aWxsIE5PVCByZXBlYXQgKD8/Pz8pXG5SdWxlLkxpc3QgPSBjbGFzcyBMaXN0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0dmFyIHJlc3VsdHMgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdHJlc3VsdHMucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFkZWxpbWl0ZXIpIGJyZWFrO1xuXHRcdFx0bmV4dCA9IGRlbGltaXRlci5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybiBtYXRjaGVkIGl0ZW0gYnkgaW5kZXhcblx0Z2V0SXRlbShpbmRleCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLnJlc3VsdHNbaW5kZXhdO1xuXHR9XG5cblxuXHR0b1NvdXJjZSgpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcdFx0Ly8gVE9ETzogdGhyb3c/Pz9cblx0XHRsZXQgcmVzdWx0cyA9IHRoaXMucmVzdWx0cy5tYXAoIHJlc3VsdCA9PiByZXN1bHQudG9Tb3VyY2UoKSApLmpvaW4oXCIsIFwiKTtcblx0XHRyZXR1cm4gYFske3Jlc3VsdHN9XWA7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYFske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMuaXRlbX0gJHt0aGlzLmRlbGltaXRlcn1dYDtcblx0fVxufTtcblxuXG5cblxuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbk9iamVjdC5hc3NpZ24oUnVsZSwge1xuXG4vL1xuLy8gIyMgZ3JvdXA6IHBhcnNpbmcgc3ludGF4XG4vL1xuXG4vLyBUT0RPOiBjb252ZXJ0IHRvIFRleHRTdHJlYW0gcGF0dGVybiBhbGEgbm9ybWFsIHBhcnNlciBvbmNlIHRoYXQgc2V0dGxlcyBkb3duPz8/XG5cdHBhcnNlUnVsZVN5bnRheChzeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0bGV0IHN5bnRheFN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCk7XG5cdFx0bGV0IHJ1bGVzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgW10pO1xuXG5cdFx0bGV0IHJ1bGU7XG5cdFx0Ly8gSWYgd2Ugb25seSBnb3Qgb25lIHRoaW5nLCByZXR1cm4gdGhhdCBhcyB0aGUgcmVzdWx0XG5cdFx0aWYgKHJ1bGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cnVsZSA9IHJ1bGVzWzBdO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgU2VxdWVuY2VDb25zdHJ1Y3Rvcih7IHJ1bGVzIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9LFxuXG5cdHRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpIHtcblx0XHRjb25zdCBTWU5UQVhfRVhQUkVTU0lPTiA9IC8oPzpbXFx3XFwtXSt8XFxcXFtcXFtcXChcXHtcXClcXH1cXF1dfFteXFxzXFx3XXxcXHwpL2c7XG5cdFx0dmFyIHN5bnRheFN0cmVhbSA9IHN5bnRheC5tYXRjaChTWU5UQVhfRVhQUkVTU0lPTik7XG5cdFx0aWYgKCFzeW50YXhTdHJlYW0pIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgdG9rZW5pemUgcGFyc2UgcnVsZSBzeW50YXggPj4ke3N5bnRheH08PGApO1xuXHRcdHJldHVybiBzeW50YXhTdHJlYW07XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCwgbGFzdEluZGV4ID0gc3ludGF4U3RyZWFtLmxlbmd0aCkge1xuXHRcdHdoaWxlIChzdGFydEluZGV4IDwgbGFzdEluZGV4KSB7XG5cdFx0XHRsZXQgWyBydWxlLCBlbmRJbmRleCBdID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRpZiAoZW5kSW5kZXggPj0gbGFzdEluZGV4KVxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJQYXN0IGxhc3RJbmRleFwiKTtcblx0XHRcdGlmIChydWxlKSBydWxlcy5wdXNoKHJ1bGUpO1xuXHRcdFx0c3RhcnRJbmRleCA9IGVuZEluZGV4ICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHZhciBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdHN3aXRjaCAoc3ludGF4VG9rZW4pIHtcblx0XHRcdGNhc2UgXCJ7XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIoXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiW1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwifFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2FsdGVybmF0aXZlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIqXCI6XG5cdFx0XHRjYXNlIFwiK1wiOlxuXHRcdFx0Y2FzZSBcIj9cIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cblx0XHRcdC8vIHRoZSBmb2xsb3dpbmcgc2hvdWxkIEFMV0FZUyBiZSBjb25zdW1lZCBieSB0aGUgYWJvdmVcblx0XHRcdGNhc2UgXCJ9XCI6XG5cdFx0XHRjYXNlIFwiKVwiOlxuXHRcdFx0Y2FzZSBcIl1cIjpcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7c3ludGF4VG9rZW59IGZvdW5kIGFzIGl0ZW0gJHtzdGFydEluZGV4fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdLCBydWxlO1xuXHRcdC8vIElmIGxldHRlcnMgb25seSwgbWF0Y2ggYXMgYSBLZXl3b3JkIChzbyB3ZSByZXF1aXJlIGEgd29yZCBib3VuZGFyeSBhZnRlciB0aGUgc3RyaW5nKS5cblx0XHRpZiAoc3RyaW5nLm1hdGNoKC9bQS1aYS16XSsvKSkge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLktleXdvcmQoeyBrZXl3b3JkOiBzdHJpbmcgfSk7XG5cdFx0fVxuXHRcdC8vIE90aGVyd2lzZSBtYXRjaCBhcyBhIFN0cmluZywgd2hpY2ggZG9lc24ndCByZXF1aXJlIG5vbi13b3JkIGNoYXJzIGFmdGVyIHRoZSB0ZXh0LlxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlN0cmluZyh7IHN0cmluZzogc3RyaW5nIH0pO1xuXHRcdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRcdGlmIChzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIikpIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIGxlYWRpbmcgc2xhc2ggaW4gbWF0Y2ggc3RyaW5nLi4uXG5cdFx0XHRcdHJ1bGUuc3RyaW5nID0gcnVsZS5zdHJpbmcuc3Vic3RyKDEpO1xuXHRcdFx0XHQvLyBidXQgbGVhdmUgaXQgaW4gdG9TdHJpbmdcblx0XHRcdFx0cnVsZS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnRJbmRleCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLilgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCIoXCIsIFwiKVwiLCBzdGFydEluZGV4KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcnVsZTtcblx0XHR2YXIgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdC8vIFNpbmdsZSByZXN1bHQgbWVhbnMgb3B0aW9uYWwgZXhwcmVzc2lvblxuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cnVsZSA9IHJlc3VsdHNbMF07XG5cdFx0XHRpZiAoIShydWxlIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpKSBydWxlLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuU2VxdWVuY2UoeyBydWxlczogcmVzdWx0cyB9KTtcblx0XHR9XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIHJlcGVhdCBpbmRpY2F0b3IgYD9gLCBgK2Agb3IgYCpgIGJ5IGF0dGFjaGluZyBpdCB0byB0aGUgcHJldmlvdXMgcnVsZS5cblx0cGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0dmFyIHN5bWJvbCA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblx0XHR2YXIgcnVsZSA9IHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBhdHRhY2ggcmVwZWF0IHN5bWJvbCAke3N5bWJvbH0gdG8gZW1wdHkgcnVsZSFgKTtcblxuXHRcdC8vIFRyYW5zZm9ybSBsYXN0IHJ1bGUgaW50byBhIHJlcGVhdCBmb3IgYCpgIGFuZCBgK2AuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCIqXCIgfHwgc3ltYm9sID09PSBcIitcIikge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHQvLyBwdXNoIGludG8gcnVsZSBzdGFjayBpbiBwbGFjZSBvZiBvbGQgcnVsZVxuXHRcdFx0cnVsZXNbcnVsZXMubGVuZ3RoIC0gMV0gPSBydWxlO1xuXHRcdH1cblxuXHRcdC8vIFJ1bGUgaXMgb3B0aW9uYWwgZm9yIGA/YCBhbmQgYCpgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiP1wiIHx8IHN5bWJvbCA9PT0gXCIqXCIpIHtcblx0XHRcdHJ1bGUub3B0aW9uYWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBbIHVuZGVmaW5lZCwgc3RhcnRJbmRleCBdXG5cdH0sXG5cblx0Ly8gTWF0Y2ggYHs8cnVsZU5hbWU+fWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IG1hdGNoID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIntcIiwgXCJ9XCIsIHN0YXJ0SW5kZXgpO1xuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID09PSAzICYmIG1hdGNoLnNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBtYXRjaC5zbGljZVswXTtcblx0XHRcdG1hdGNoLnNsaWNlID0gbWF0Y2guc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPiAxKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHByb2Nlc3MgcnVsZXMgd2l0aCBtb3JlIHRoYW4gb25lIHJ1bGUgbmFtZTogeyR7bWF0Y2guc2xpY2Uuam9pbihcIlwiKX19YCk7XG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5TdWJydWxlKHsgcnVsZTogbWF0Y2guc2xpY2VbMF0gfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgbWF0Y2guZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBsaXN0IGV4cHJlc3Npb24gYFs8aXRlbT48ZGVsaW1pdGVyPl1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIltcIiwgXCJdXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHRpZiAocmVzdWx0cy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCBzdHVmZiBhdCBlbmQgb2YgbGlzdDogWyR7c2xpY2Uuam9pbihcIiBcIil9XWApO1xuXHRcdH1cblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLkxpc3QoKTtcblx0XHRydWxlLml0ZW0gPSByZXN1bHRzWzBdXG5cdFx0cnVsZS5kZWxpbWl0ZXIgPSByZXN1bHRzWzFdXG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBhbHRlcm5hdGUgYCggYSB8IGIgfCBjIClgLlxuXHQvLyBOT1RFOiB0aGlzIHNob3VsZCBvbmx5IGhhcHBlbiBpbnNpZGUgYSBncm91cC4uLlxuXHRwYXJzZVJ1bGVTeW50YXhfYWx0ZXJuYXRpdmVzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgWyBydWxlLCBlbmRJbmRleCBdID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCArIDEpO1xuXG5cdFx0Ly8gY3JlYXRlIGFsdGVybmF0ZXMgcnVsZSB3aXRoIGxhc3RUb2tlbiwgb3IgcmUtdXNlIGV4aXN0aW5nIGFsdGVybmF0ZXMgcmlsZVxuXHRcdGxldCBhbHRlcm5hdGVzO1xuXHRcdGxldCBsYXN0VG9rZW4gPSBydWxlcy5wb3AoKTtcblx0XHRpZiAobGFzdFRva2VuIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpIHtcblx0XHRcdGFsdGVybmF0ZXMgPSBsYXN0VG9rZW47XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0YWx0ZXJuYXRlcyA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVzOiBbXSB9KTtcblxuXHRcdFx0Ly8gaWYgbm8gbGFzdCBydWxlLCB3ZSBoYXZlIGEgcnVsZSBsaWtlICBgKCB8IGFiYylgIHdoaWNoIG1lYW5zIHRoYXQgdGhlIGFsdGVybmF0ZXMgaXMgb3B0aW9uYWxcblx0XHRcdGlmICghbGFzdFRva2VuKVxuXHRcdFx0XHRhbHRlcm5hdGVzLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0YWx0ZXJuYXRlcy5ydWxlcy5wdXNoKGxhc3RUb2tlbik7XG5cdFx0fVxuXHRcdC8vIGFkZCBwYXJzZWQgcnVsZSB0byB0aGUgYWx0ZXJuYXRlc3Ncblx0XHRhbHRlcm5hdGVzLnJ1bGVzLnB1c2gocnVsZSk7XG5cblx0XHQvLyBhZGQgYmFjayB0byB0aGUgZW5kIG9mIHJ1bGVzXG5cdFx0cnVsZXMucHVzaChhbHRlcm5hdGVzKTtcblxuXHRcdHJldHVybiBbIHVuZGVmaW5lZCwgZW5kSW5kZXggXTtcblx0fSxcblxuXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5jb25zdCBwYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG53aW5kb3cucGFyc2VyID0gcGFyc2VyO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvX3BhcnNlci5qcyIsIlxuLy8gVE9ETzogY29udmVydCB0byBsaW5lLWF3YXJlIHN0cmVhbT8/P1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFN0cmVhbSB7XG5cdGNvbnN0cnVjdG9yKHRleHRPclByb3BzKSB7XG5cdFx0aWYgKHR5cGVvZiB0ZXh0T3JQcm9wcyA9PT0gXCJzdHJpbmdcIikgdGhpcy50ZXh0ID0gdGV4dE9yUHJvcHM7XG5cdFx0ZWxzZSBPYmplY3QuYXNzaWduKHRoaXMsIHRleHRPclByb3BzKTtcblx0XHRpZiAoIXRoaXMuc3RhcnRJbmRleCkgdGhpcy5zdGFydEluZGV4ID0gMDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBpbW11dGFibGUgY2xvbmUgb2YgdGhlIHN0cmVhbS5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRsZXQgY2xvbmUgPSBuZXcgVGV4dFN0cmVhbSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCBwcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jZWQgdG8gbmV3IHN0YXJ0SW5kZXguXG5cdGFkdmFuY2VUbyhzdGFydEluZGV4KSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4IH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jaW5nIHN0YXJ0SW5kZXggQlkgYGxlbmd0aGBcblx0YWR2YW5jZUJ5KGxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuXHR9XG5cbi8vIFx0Ly8gUmV0dXJuIGNsb25lIG9mIHRoaXMgc3RyZWFtIHdpdGggZW5kSW5kZXggc2V0IHRvIHN0YXJ0ICsgYGxlbmd0aGBcbi8vIFx0ZW5kQWZ0ZXIobGVuZ3RoKSB7XG4vLyBcdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBlbmRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuLy8gXHR9XG5cblx0Ly8gTWF0Y2ggYHBhdHRlcm5gIGFzIHJlZ2V4IGF0IGhlYWQgb2Ygc3RyZWFtLlxuXHQvLyBOT1RFOiByZWdleGVzIHNob3VsZCBzdGFydCB3aXRoIGBeYCFcblx0Ly8gUmV0dXJucyBtYXRjaCBvciB1bmRlZmluZWQuXG5cdG1hdGNoKHBhdHRlcm4pIHtcblx0XHRpZiAoIShwYXR0ZXJuIGluc3RhbmNlb2YgUmVnRXhwKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGV4dFN0cmVhbS5tYXRjaCgke3BhdHRlcm59KTogZXhwZWN0ZWQgUmVnRXhwYCk7XG4vL1RPRE86IHVzZSBgc3RyZWFtLnJhbmdlYCB0byBlbnN1cmUgbWF0Y2ggaXMgbm90IG5vdCBiZXlvbmQgYHN0cmluZy5lbmRJbmRleGBcblx0XHRyZXR1cm4gdGhpcy5oZWFkLm1hdGNoKHBhdHRlcm4pO1xuXHR9XG5cblx0c3RhcnRzV2l0aChzdHJpbmcpIHtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQuc3RhcnRzV2l0aChzdHJpbmcpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIHRleHQgb2Ygc3RyaW5nIHN0YXJ0aW5nIGF0IG91ciBgc3RhcnRJbmRleGBcblx0Z2V0IGhlYWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMucmFuZ2UoKTtcblx0fVxuXG5cdC8vIFJldHVybiBhIHJhbmdlIG9mIHRoZSBzdHJpbmcgZnJvbSBgc3RhcnRJbmRleGAgdG8gYGVuZEluZGV4YCBOT04taW5jbHVzaXZlLlxuXHRyYW5nZShzdGFydEluZGV4ID0gdGhpcy5zdGFydEluZGV4LCBlbmRJbmRleCA9IHRoaXMudGV4dC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0LnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmRJbmRleCk7XG5cdH1cblxuXHQvLyBMZW5ndGggb2YgdGhlIHN0cmVhbS5cblx0Z2V0IGxlbmd0aCgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0Lmxlbmd0aDtcblx0fVxuXG5cdC8vIEFyZSB3ZSBhdCB0aGUgZW5kIG9mIHRoZSBzdHJlYW0/XG5cdGdldCBpc0VtcHR5KCkge1xuXHRcdHJldHVybiB0aGlzLnN0YXJ0SW5kZXggPT09IHRoaXMubGVuZ3RoO1xuXHR9XG5cblxuXG5cblx0Ly9cblx0Ly8jIyBSZWZsZWN0aW9uXG5cdC8vXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHRcblx0fTtcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9UZXh0U3RyZWFtLmpzIiwiaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIGxvYWQgc3RhbmRhcmQgcnVsZXMgZmlsZXMgaGVyZVxuaW1wb3J0IF8gZnJvbSBcIi4vcnVsZXNcIjtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9pbmRleC5qcyIsImltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlXCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy9cbi8vIFJlZ2V4IHBhdHRlcm4gcnVsZXMgd2l0aCBjdXN0b20gY29uc3RydWN0b3JzIGZvciBkZWJ1Z2dpbmdcbi8vXG4vL3BhcnNlci5hZGRQYXR0ZXJuKFwid2hpdGVzcGFjZVwiLCAvXlxccysvKTtcbnBhcnNlci5hZGRSdWxlKFwid2hpdGVzcGFjZVwiLCBuZXcgKGNsYXNzIHdoaXRlc3BhY2UgZXh0ZW5kcyBSdWxlLlBhdHRlcm57fSkoeyBwYXR0ZXJuOiAvXlxccysvLCBvcHRpb25hbDogdHJ1ZSB9KSk7XG5cbi8vIGBpZGVudGlmaWVyYCA9IHZhcmlhYmxlcyBvciBwcm9wZXJ0eSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGEgbG93ZXItY2FzZSBsZXR0ZXIgKD8pXG4vL3BhcnNlci5hZGRQYXR0ZXJuKFwiaWRlbnRpZmllclwiLCAvXlthLXpdW1xcd1xcZFxcLV9dKi8pO1xucGFyc2VyLmFkZFJ1bGUoXCJpZGVudGlmaWVyXCIsIG5ldyAoY2xhc3MgaWRlbnRpZmllciBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7IHBhdHRlcm46IC9eW2Etel1bXFx3XFwtXSovIH0pKTtcblxuLy8gYFR5cGVgID0gdHlwZSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGFuIHVwcGVyLWNhc2UgbGV0dGVyICg/KVxuLy9wYXJzZXIuYWRkUGF0dGVybihcInR5cGVuYW1lXCIsIC9eW0EtWl1bXFx3XFxkXFwtX10qLyk7XG5wYXJzZXIuYWRkUnVsZShcIlR5cGVcIiwgbmV3IChjbGFzcyBUeXBlIGV4dGVuZHMgUnVsZS5QYXR0ZXJue30pKHsgcGF0dGVybjogL15bQS1aXVtcXHdcXC1dKi8gfSkpO1xuXG5cbi8vIE51bWVyaWMgbGl0ZXJhbCAoZWl0aGVyIGZsb2F0IG9yIGludGVnZXIpLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG5wYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgKGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7XG5cdHBhdHRlcm46IC9eLT9cXGQrKD86XFwuXFxkKyk/Lyxcblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VGbG9hdCh0aGlzLm1hdGNoZWQsIDEwKTtcblx0fVxufSkpO1xuXG5cbi8vIExpdGVyYWwgYHRleHRgIHN0cmluZywgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gUmV0dXJuZWQgdmFsdWUgaGFzIGVuY2xvc2luZyBxdW90ZXMuXG5wYXJzZXIuYWRkUnVsZShcInRleHRcIiwgbmV3IChjbGFzcyB0ZXh0IGV4dGVuZHMgUnVsZS5QYXR0ZXJue30pKHtcblx0cGF0dGVybjogL14oPzpcIlteXCJdKlwifCdbXiddKicpL1xufSkpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cbnBhcnNlci5hZGRSdWxlKFwiYm9vbGVhblwiLCBuZXcgKGNsYXNzIGJvb2xlYW4gZXh0ZW5kcyBSdWxlLlBhdHRlcm57fSkoe1xuXHRwYXR0ZXJuOiAvXih0cnVlfGZhbHNlfHllc3xub3xzdWNjZXNzfGZhaWx1cmV8b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwic3VjY2Vzc1wiOlxuXHRcdFx0Y2FzZSBcIm9rXCI6XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufSkpO1xuXG5cbi8vXG4vLyBSdWxlcyBhdXRvLWRlcml2ZWQgZnJvbSBvdXIgYHJ1bGUgc3ludGF4YC5cbi8vXG5cbi8vIExpdGVyYWwgdmFsdWUgYXMgbnVtYmVyLCB0ZXh0IG9yIGJvb2xlYW4uXG5wYXJzZXIuYWRkU3ludGF4KFwibGl0ZXJhbFwiLCBcIihsaXRlcmFsOntudW1iZXJ9fHt0ZXh0fXx7Ym9vbGVhbn0pXCIpO1xuXG5cbi8vIExpdGVyYWwgbGlzdCAoYXJyYXkpLCBlZzogIGBbMSwyLHRydWUsZmFsc2UgXWBcbnBhcnNlci5hZGRTeW50YXgoXG5cdFwibGl0ZXJhbC1saXN0XCIsXG5cdFwiXFxcXFtbbGlzdDp7bGl0ZXJhbH0sXT9cXFxcXVwiLFxuXHR7XG5cdFx0Ly8gTW9kaWZ5IGBhcmd1bWVudHNgIG9mIHRoaXMgZXhwcmVzc2lvbiB0byBqdXN0IHRoZSBsaXN0IHJldHVybmVkLlxuXHRcdGdhdGhlckFyZ3VtZW50cygpIHtcblx0XHRcdHZhciBhcmdzID0gUnVsZS5TZXF1ZW5jZS5wcm90b3R5cGUuZ2F0aGVyQXJndW1lbnRzLmFwcGx5KHRoaXMpO1xuXHRcdFx0aWYgKCFhcmdzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0cmV0dXJuIGFyZ3MubGlzdDtcblx0XHR9LFxuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0dmFyIGxpc3QgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0cmV0dXJuIGxpc3QudG9Tb3VyY2UoKTtcblx0XHR9XG5cdH1cbik7XG5cblxucGFyc2VyLmFkZFN5bnRheChcInNjb3BlLW1vZGlmaWVyXCIsIFwiKHNjb3BlOmdsb2JhbHxjb25zdGFudHxzaGFyZWQpXCIpO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmUtcHJvcGVydHlcIixcblx0XCJ7c2NvcGUtbW9kaWZpZXJ9PyB7aWRlbnRpZmllcn0gPSB7bGl0ZXJhbH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBzdGF0ZW1lbnQgPSBgJHthcmdzLmlkZW50aWZpZXIudG9Tb3VyY2UoKX0gPSAke2FyZ3MubGl0ZXJhbC50b1NvdXJjZSgpfTtgO1xuXG5cdFx0XHR2YXIgc2NvcGUgPSAoYXJncy5zY29wZSA/IGFyZ3Muc2NvcGUudG9Tb3VyY2UoKSA6IFwibG9jYWxcIik7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJnbG9iYWxcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGdsb2JhbC4ke3N0YXRlbWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHtzdGF0ZW1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwic2hhcmVkXCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtzdGF0ZW1lbnR9YDtcblxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBzdGF0ZW1lbnQ7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZS1wcm9wZXJ0eS1hcy1vbmUtb2ZcIixcblx0XCJ7aWRlbnRpZmllcn0gYXMgb25lIG9mIHtsaXN0OmxpdGVyYWwtbGlzdH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblxuXHRcdFx0bGV0IGlkZW50aWZpZXIgPSBhcmdzLmlkZW50aWZpZXIudG9Tb3VyY2UoKTtcblx0XHRcdGxldCBwbHVyYWwgPSAoaWRlbnRpZmllciArIFwiX1ZBTFVFU1wiKS50b1VwcGVyQ2FzZSgpO1xuXHRcdFx0bGV0IHZhbHVlcyA9IGFyZ3MubGlzdC50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGZpcnN0ID0gYXJncy5saXN0LnJlc3VsdHNbMF07XG5cdFx0XHRsZXQgZmlyc3RWYWx1ZSA9IGZpcnN0ID8gZmlyc3QudG9Tb3VyY2UoKSA6IFwidW5kZWZpbmVkXCI7XG5cblx0XHRcdHJldHVybiBgc3RhdGljICR7cGx1cmFsfSA9ICR7dmFsdWVzfTtcXG5gXG5cdFx0XHRcdCArIGBnZXQgJHtpZGVudGlmaWVyfSB7IHJldHVybiAoXCJfXyR7aWRlbnRpZmllcn1cIiBpbiB0aGlzID8gdGhpcy5fXyR7aWRlbnRpZmllcn0gOiAke2ZpcnN0VmFsdWV9KSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuY29uc3RydWN0b3IuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9XFxuYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9ydWxlcy5qcyIsImltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL3J1bGVzL2luZGV4LmpzXCI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHR3aW5kb3cuVGV4dFN0cmVhbSA9IFRleHRTdHJlYW07XG5cdHdpbmRvdy5QYXJzZXIgPSBQYXJzZXI7XG5cdHdpbmRvdy5SdWxlID0gUnVsZTtcblx0d2luZG93LnBhcnNlciA9IHBhcnNlcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuXHRUZXh0U3RyZWFtLCBQYXJzZXIsIFJ1bGUsIHBhcnNlclxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvaW5kZXguanMiLCIvLyBTcGVsbCBcIkVuZ2xpc2hcIiBwYXJzZXIgc3RyYXdtYW5cblxuLy8gVE9ETzpcdGN1c3RvbSBTeW50YXhFcnJvciBldGMgd2hpY2ggdW5kZXJzdGFuZCBzdHJlYW1zXG4vLyBUT0RPOlx0YHN0YXRlbWVudGAgdnMgYGV4cHJlc3Npb25gIHZzIGBjb250cm9sIHN0cnVjdHVyZWAgZXRjIC0tIGFyZSB0aGVzZSBqdXN0IG5hbWVkIHJ1bGVzP1xuLy8gVE9ETzpcdGJyZWFrIGBmaWxlYCBpbnRvIGxpbmVzIGFuZCBwcm9jZXNzIGVhY2ggKGluY2wuIHN1YnN0ci9tYXRjaCBub3QgZ29pbmcgYmV5b25kIHRoZSBlbmQpXG4vLyBUT0RPOlx0bmVzdGluZyAtLSBpcyB0aGlzIGp1c3QgaW5kZW50ID0gXCJhZGQgYmxvY2sgc2NvcGVcIlxuLy8gVE9ETzpcdHByb21vdGlvbiBwYXR0ZXJuIGZvciBnYXRoZXIgYXJndW1lbnRzIChlZzogbGl0ZXJhbC1saXN0KVxuLy8gVE9ETzpcdFdoYXQgZG9lcyBzeW50YXggdHJlZSBsb29rIGxpa2U/ICBIb3cgZG8gd2UgZXh0cmFjdCBtZWFuaW5nIG91dCBvZiB0aGUgbmVzdD9cbi8vIFRPRE86XHREb24ndCB1c2UgYHRvSlNPTmAgZm9yIG91dHB1dHRpbmcgcnVsZS4uLlxuLy8gVE9ETzpcdFJlY3ljbGUgd29yZC9zdHJpbmcvcGF0dGVybiBydWxlcyB0byBtb3JlIGVhc2lseSBzZWUgY29tbW9uYWxpdHkuLi5cbi8vIFRPRE86XHRQYXNzIGBjb250ZXh0YCB0byB0b1NvdXJjZSgpLCBhZGQgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYGNsYXNzYCwgdmFyaWFibGVzIGFuZCBjb2RlIHRvIGBtZXRob2RgLCBgZ2xvYmFsYCBzdHVmZiBldGNcblxuaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYXJzZXIge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblx0XHQvLyBDbG9uZSBydWxlcywgc3RhcnRpbmcgd2l0aCBhIGNvbXBsZXRlbHkgZW1wdHkgbWFwIGlmIG5vdCBkZWZpbmVkIChubyBzdGFuZGFyZCBvYmplY3Qga2V5cylcblx0XHR0aGlzLnJ1bGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnJ1bGVzIHx8IG51bGwpO1xuXHR9XG5cblx0Z2V0UnVsZShuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXNbbmFtZV07XG5cdH1cblxuLy8jIyMgUGFyc2luZ1xuXG5cdC8vIFBhcnNlIGBuYW1lYGQgcnVsZSBhdCBoZWFkIG9mIGBzdHJlYW1gLlxuXHQvLyBIYW5kbGVzIG9wdGlvbmFsIGFuZCByZXBlYXRpbmcgcnVsZXMgYXMgd2VsbCBhcyBlYXRpbmcgd2hpdGVzcGFjZS5cblx0Ly8gUmV0dXJucyByZXN1bHQgb2YgcGFyc2UuXG5cdHBhcnNlKG5hbWUsIHN0cmVhbSkge1xuXHRcdGlmICh0eXBlb2Ygc3RyZWFtID09PSBcInN0cmluZ1wiKSBzdHJlYW0gPSBuZXcgVGV4dFN0cmVhbShzdHJlYW0pO1xuXG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUobmFtZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFJ1bGUgJHtuYW1lfSBub3QgdW5kZXJzdG9vZGAsIG5hbWUsIHN0cmVhbSk7XG5cdFx0c3RyZWFtID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJ1bGUucGFyc2UodGhpcywgc3RyZWFtKTtcblx0fVxuXG5cdC8vIEVhdCB3aGl0ZXNwYWNlIChhY2NvcmRpbmcgdG8gYHJ1bGVzLndoaXRlc3BhY2VgKSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnMgbmV3IHN0cmVhbSBpZiB3ZSBtYXRjaGVkIHdoaXRlc3BhY2UsIG90aGVyd2lzZSB0aGUgc2FtZSBzdHJlYW0uXG5cdC8vIE90aGVyd2lzZSByZXR1cm5zIHRoaXMgc2FtZSBzdHJlYW0uXG5cdGVhdFdoaXRlc3BhY2Uoc3RyZWFtKSB7XG5cdFx0dmFyIHJlc3VsdCA9IHRoaXMucnVsZXMud2hpdGVzcGFjZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHRcdHJldHVybiByZXN1bHQgPyByZXN1bHQubmV4dCgpIDogc3RyZWFtO1xuXHR9XG5cbi8vIyMjIFJ1bGUgZmFjdG9yaWVzXG5cblx0Ly8gQWRkIGEgcnVsZSB0byBvdXIgbGlzdCBvZiBydWxlcyFcblx0Ly8gVE9ETzogY29udmVydCB0byBgYWx0ZXJuYXRpdmVzYCBvbiBvdmVyd3JpdGU/XG5cdGFkZFJ1bGUobmFtZSwgcnVsZSkge1xuXHRcdGxldCBleGlzdGluZyA9IHRoaXMucnVsZXNbbmFtZV07XG5cdFx0aWYgKGV4aXN0aW5nKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhgQ29udmVydGluZyBydWxlICcke25hbWV9JyB0byBhbHRlcm5hdGl2ZXNgKTtcblx0XHRcdGlmICghKGV4aXN0aW5nIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpKSB7XG5cdFx0XHRcdGV4aXN0aW5nID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgbmFtZTogZXhpc3RpbmcubmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdHRoaXMucnVsZXNbbmFtZV0gPSBleGlzdGluZztcblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKGBBZGRpbmcgcnVsZSAnJHtydWxlLnJ1bGVOYW1lfScgdG8gJyR7bmFtZX0nOiBgLCBydWxlKTtcblx0XHRcdGV4aXN0aW5nLmFkZFJ1bGUocnVsZSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZS5ydWxlTmFtZSA9IG5hbWU7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gcnVsZTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH1cblxuXHQvLyBBZGQgcmVnZXggYXMgYSBwYXR0ZXJuIHRvIG91ciBsaXN0IG9mIHJ1bGVzXG5cdGFkZFBhdHRlcm4obmFtZSwgcGF0dGVybiwgcHJvcGVydGllcykge1xuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuUGF0dGVybihwcm9wZXJ0aWVzKTtcblx0XHRydWxlLnBhdHRlcm4gPSBwYXR0ZXJuO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH1cblxuXHQvLyBQYXJzZSBhIGBydWxlU3ludGF4YCBydWxlIGFuZCBhZGQgaXQgdG8gb3VyIGxpc3Qgb2YgcnVsZXMuXG5cdC8vIFJldHVybnMgdGhlIG5ldyBydWxlLlxuXHQvLyBMb2dzIHBhcnNpbmcgZXJyb3JzIGJ1dCBhbGxvd3MgdGhpbmdzIHRvIGNvbnRpbnVlLlxuXHRhZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHR0cnkge1xuXHRcdFx0bGV0IHJ1bGUgPSBSdWxlLnBhcnNlUnVsZVN5bnRheChydWxlU3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yKTtcblxuXHRcdFx0Ly8gUmVmbGVjdCB0aGUgcnVsZSBiYWNrIG91dCB0byBtYWtlIHN1cmUgaXQgbG9va3MgKG1vcmUgb3IgbGVzcykgdGhlIHNhbWVcblx0XHRcdGNvbnNvbGUubG9nKGBBZGRlZCBydWxlICcke25hbWV9JzpcXG4gIElOUFVUOiAke3J1bGVTeW50YXh9IFxcbiBPVVRQVVQ6ICR7cnVsZX1gKTtcblxuXHRcdFx0T2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5ncm91cChgRXJyb3IgcGFyc2luZyBzeW50YXggZm9yIHJ1bGUgJyR7bmFtZX0nOmApO1xuXHRcdFx0Y29uc29sZS5sb2coYHN5bnRheDogJHtydWxlU3ludGF4fWApO1xuXHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHRcdGNvbnNvbGUuZ3JvdXBFbmQoKTtcblx0XHR9XG5cdH1cblxuXHRhZGRTdGF0ZW1lbnQobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdHZhciBzdGF0ZW1lbnQgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBSdWxlLlN0YXRlbWVudCk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBzdGF0ZW1lbnQpO1xuXHR9XG5cblx0YWRkRXhwcmVzc2lvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0dmFyIGV4cHJlc3Npb24gPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBSdWxlLkV4cHJlc3Npb24pO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIGV4cHJlc3Npb24pO1xuXHR9XG5cblxuLy9cbi8vICMjIFV0aWxpdHkgbWV0aG9kc1xuLy9cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmAuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyJdLCJzb3VyY2VSb290IjoiIn0=