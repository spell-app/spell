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

	function Alternatives(props) {
		_classCallCheck(this, Alternatives);

		var _this9 = _possibleConstructorReturn(this, (Alternatives.__proto__ || Object.getPrototypeOf(Alternatives)).call(this, props));

		if (!_this9.rules) _this9.rules = [];
		return _this9;
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
// TODO:	Use keywords in syntax to make a quick regex-based `test` function for the entire rule
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

var parser = new _Parser2.default(); //
//	# Create a `parser` singleton to use to set up rules and during tests.
//
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
	// You can construct with a text string or a set of properties (including `text`).
	function TextStream(textOrProps) {
		_classCallCheck(this, TextStream);

		if (typeof textOrProps === "string") this.text = textOrProps;else Object.assign(this, textOrProps);

		// Make sure `text` is defined.
		if (!("text" in this)) this.text = "";
		if (!("startIndex" in this)) this.startIndex = 0;
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

__webpack_require__(9);

__webpack_require__(7);

__webpack_require__(8);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _parser2.default;

// load standard rules files here

/***/ }),
/* 4 */,
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
// TODO:	break `file` into lines and process each (incl. substr/match not going beyond the end)
// TODO:	nesting -- is this just indent = "add block scope"
// TODO:	promotion pattern for gather arguments (eg: literal-list) ???
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
				if (!(existing instanceof _Rule2.default.Alternatives)) {
					console.log("Converting rule '" + name + "' to alternatives");
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

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _Rule = __webpack_require__(0);

var _Rule2 = _interopRequireDefault(_Rule);

var _parser = __webpack_require__(1);

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// re-export parser for testing.
//
//	# Rules for creating variables, property access, etc
//

exports.default = _parser2.default;


_parser2.default.addStatement("assignment", "{identifier} = {literal}", {
	toSource: function toSource(context) {
		var args = this.gatherArguments();
		var identifier = args.identifier.toSource();
		var statement = identifier + " = " + args.literal.toSource() + ";";

		// if identifier does not already exist in context, add it and `var`
		// TODO: `let` is maybe better???
		if (context && !context.variables[identifier]) {
			statement = "var " + statement;
		}
		return statement;
	}
});

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _Rule = __webpack_require__(0);

var _Rule2 = _interopRequireDefault(_Rule);

var _parser = __webpack_require__(1);

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// re-export parser for testing.
//
//	# Rules for defining classes (known as `types`)
//
exports.default = _parser2.default;


_parser2.default.addSyntax("scope-modifier", "(scope:global|constant|shared)");

_parser2.default.addStatement("declare-property", "{scope-modifier}? {assignment}", {
	toSource: function toSource(context) {
		var args = this.gatherArguments();
		var identifier = args.assignment.identifier.toSource();
		var value = args.assignment.literal.toSource();
		var statement = identifier + " = " + value + ";";

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
		var list = args.list.list;
		var values = list.toSource();
		var first = list.results[0];
		var firstValue = first ? first.toSource() : "undefined";

		return "static " + plural + " = " + values + ";\n" + ("get " + identifier + " { return (\"__" + identifier + "\" in this ? this.__" + identifier + " : " + firstValue + ") }\n") + ("set " + identifier + "(value) { if (this.constructor." + plural + ".includes(value)) this.__" + identifier + " = value }\n");
	}
});

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _Rule = __webpack_require__(0);

var _Rule2 = _interopRequireDefault(_Rule);

var _parser = __webpack_require__(1);

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Core `rules` -- simple datatypes, etc.
//


// re-export parser for testing.
exports.default = _parser2.default;

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
}(_Rule2.default.Pattern))({
	pattern: /^[a-z][\w\-]*/,
	// Convert "-" to "_" in source output.
	toSource: function toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));

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
}(_Rule2.default.Pattern))({
	pattern: /^[A-Z][\w\-]*/,
	// Convert "-" to "_" in source output.
	toSource: function toSource(context) {
		return this.matched.replace(/\-/g, "_");
	}
}));

// `number` as either float or integer, created with custom constructor for debugging.
_parser2.default.addRule("number", new (function (_Rule$Pattern4) {
	_inherits(number, _Rule$Pattern4);

	function number() {
		_classCallCheck(this, number);

		return _possibleConstructorReturn(this, (number.__proto__ || Object.getPrototypeOf(number)).apply(this, arguments));
	}

	return number;
}(_Rule2.default.Pattern))({
	pattern: /^-?([0-9]*[.])?[0-9]+/,
	// Convert to number on source output.
	toSource: function toSource(context) {
		return parseFloat(this.matched, 10);
	}
}));

// Numeric `integer` only, created with custom constructor for debugging.
// NOTE: this WILL match a float, but the returned value will coerce to an integer.
// REVIEW: is this right?  Better to not match a float?
_parser2.default.addRule("integer", new (function (_Rule$Pattern5) {
	_inherits(integer, _Rule$Pattern5);

	function integer() {
		_classCallCheck(this, integer);

		return _possibleConstructorReturn(this, (integer.__proto__ || Object.getPrototypeOf(integer)).apply(this, arguments));
	}

	return integer;
}(_Rule2.default.Pattern))({
	pattern: /^-?([0-9]*[.])?[0-9]+/,
	// Convert to integer on source output.
	toSource: function toSource(context) {
		return parseInt(this.matched, 10);
	}
}));

// Literal `text` string, created with custom constructor for debugging.
// You can use either single or double quotes on the outside (although double quotes are preferred).
// Returned value has enclosing quotes.
// TODO: escaped quotes inside string
_parser2.default.addRule("text", new (function (_Rule$Pattern6) {
	_inherits(text, _Rule$Pattern6);

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
_parser2.default.addRule("boolean", new (function (_Rule$Pattern7) {
	_inherits(boolean, _Rule$Pattern7);

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

// Literal value as number, text or boolean.
_parser2.default.addSyntax("literal", "(literal:{number}|{text}|{boolean})");

// Literal list (array), eg:  `[1,2,true,false ]`
_parser2.default.addSyntax("literal-list", "\\[[list:{literal},]?\\]", {
	// return just the list as our source
	toSource: function toSource(context) {
		return this.gatherArguments().list.toSource();
	}
});

//
//	Initialize statements and expressions
//

_parser2.default.addRule("statement", new _Rule2.default.Alternatives());
_parser2.default.addRule("expression", new _Rule2.default.Alternatives());

/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgNjk0NGM5NzIyY2U2NzhkNDc5ZmUiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1RleHRTdHJlYW0uanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9pbmRleC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUGFyc2VyLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9hc3NpZ25tZW50LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9jbGFzcy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyJdLCJuYW1lcyI6WyJSdWxlIiwicHJvcGVydGllcyIsIk9iamVjdCIsImFzc2lnbiIsInByb3BzIiwiY2xvbmUiLCJjcmVhdGUiLCJzdHJlYW0iLCJlbmRJbmRleCIsInVuZGVmaW5lZCIsIlR5cGVFcnJvciIsImFkdmFuY2VUbyIsIm1hdGNoZWQiLCJjb25zdHJ1Y3RvciIsIm5hbWUiLCJTdHJpbmciLCJwYXJzZXIiLCJzdGFydHNXaXRoIiwic3RyaW5nIiwic3RhcnRJbmRleCIsImxlbmd0aCIsIlBhdHRlcm4iLCJtYXRjaCIsInBhdHRlcm4iLCJLZXl3b3JkIiwia2V5d29yZCIsIlJlZ0V4cCIsIlN1YnJ1bGUiLCJydWxlIiwiZ2V0UnVsZSIsIlN5bnRheEVycm9yIiwicmVzdWx0IiwicGFyc2UiLCJhcmd1bWVudCIsIm9wdGlvbmFsIiwiTmVzdGVkIiwiU2VxdWVuY2UiLCJyZXN1bHRzIiwibmV4dCIsInJ1bGVzIiwiZWF0V2hpdGVzcGFjZSIsInB1c2giLCJhcmdzIiwicnVsZU5hbWUiLCJnYXRoZXJBcmd1bWVudHMiLCJBcnJheSIsImlzQXJyYXkiLCJqb2luIiwiRXhwcmVzc2lvbiIsIlN0YXRlbWVudCIsIkFsdGVybmF0aXZlcyIsIlJlcGVhdCIsIkxpc3QiLCJpdGVtIiwiZGVsaW1pdGVyIiwiaW5kZXgiLCJtYXAiLCJ0b1NvdXJjZSIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJsYXN0SW5kZXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zdWJydWxlIiwicGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzIiwicGFyc2VSdWxlU3ludGF4X2xpc3QiLCJwYXJzZVJ1bGVTeW50YXhfYWx0ZXJuYXRpdmVzIiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsInBhcnNlUnVsZVN5bnRheF9zdHJpbmciLCJzdWJzdHIiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJzbGljZSIsInN5bWJvbCIsImFsdGVybmF0ZXMiLCJsYXN0VG9rZW4iLCJwb3AiLCJ3aW5kb3ciLCJUZXh0U3RyZWFtIiwidGV4dE9yUHJvcHMiLCJ0ZXh0IiwiaGVhZCIsInN1YnN0cmluZyIsInJhbmdlIiwiUGFyc2VyIiwid2hpdGVzcGFjZSIsImV4aXN0aW5nIiwiY29uc29sZSIsImxvZyIsImFkZFJ1bGUiLCJydWxlU3ludGF4IiwiZSIsImdyb3VwIiwiZXJyb3IiLCJncm91cEVuZCIsInN0YXRlbWVudCIsImFkZFN5bnRheCIsImV4cHJlc3Npb24iLCJ0b2tlbnMiLCJzdGFydFRva2VuIiwiZW5kVG9rZW4iLCJuZXN0aW5nIiwibmVzdGVkIiwidG9rZW4iLCJhZGRTdGF0ZW1lbnQiLCJjb250ZXh0IiwiaWRlbnRpZmllciIsImxpdGVyYWwiLCJ2YXJpYWJsZXMiLCJhc3NpZ25tZW50IiwidmFsdWUiLCJzY29wZSIsInBsdXJhbCIsInRvVXBwZXJDYXNlIiwibGlzdCIsInZhbHVlcyIsImZpcnN0IiwiZmlyc3RWYWx1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QUFULEVBQTdCLEUiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBpZGVudGl0eSBmdW5jdGlvbiBmb3IgY2FsbGluZyBoYXJtb255IGltcG9ydHMgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSA1KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCA2OTQ0Yzk3MjJjZTY3OGQ0NzlmZSIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHN0cmVhbSwgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBzdHJlYW1gXHRcdFN0cmVhbSB3aGljaCB3YXMgbWF0Y2hlZCB3aXRoIGBzdGFydEluZGV4YCBhdCB0aGUgc3RhcnQgb2YgdGhlIG1hdGNoXG4vL1x0XHRcdC0gYGVuZEluZGV4YFx0Tm9uLWluY2x1c2l2ZSBlbmQgaW5kZXggaW4gc3RyZWFtIHdoZXJlIG1hdGNoIGVuZHMuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5nYXRoZXJBcmd1bWVudHMoKWBcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZSgpYFx0XHRcdFx0UmV0dXJuIGphdmFzY3JpcHQgc291cmNlIHRvIGludGVycHJldCB0aGUgcnVsZS5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0dmFyIGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCBwcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuXG4vL1xuLy8gIyMgb3V0cHV0IGFzIHNvdXJjZVxuLy9cblx0Ly8gT3V0cHV0IHZhbHVlIGZvciB0aGlzIElOU1RBTlRJQVRFRCBydWxlIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG47XG5cblxuLy8gUnVsZSBmb3IgbGl0ZXJhbCBzdHJpbmcgdmFsdWUsIHdoaWNoIGluY2x1ZGUgcHVuY3R1YXRpb24gc3VjaCBhcyBgKGAgZXRjLlxuUnVsZS5TdHJpbmcgPSBjbGFzcyBTdHJpbmcgZXh0ZW5kcyBSdWxlIHtcblx0Ly8gUGFyc2UgdGhpcyBydWxlIGF0IHRoZSBiZWdpbm5pbmcgb2YgYHN0cmVhbWAsIGFzc3VtaW5nIG5vIHdoaXRlc3BhY2UgYmVmb3JlLlxuXHQvLyBEZWZhdWx0IGlzIHRoYXQgYHJ1bGUuc3RyaW5nYCBpcyBsaXRlcmFsIHN0cmluZyB0byBtYXRjaC5cblx0Ly8gT24gbWF0Y2gsIHJldHVybnMgY2xvbmUgb2YgcnVsZSB3aXRoIGB2YWx1ZWAsIGBzdHJlYW1gIGFuZCBgZW5kSW5kZXhgLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICghc3RyZWFtLnN0YXJ0c1dpdGgodGhpcy5zdHJpbmcpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRoaXMuc3RyaW5nLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgdGhpcy5zdHJpbmcubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5zdHJpbmc7XG5cdH1cbn1cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vIE5PVEU6IHRoZSByZWdleCBzaG91bGQgc3RhcnQgd2l0aCBgL14uLi5gIHRvIG1hdGNoIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHR2YXIgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5wYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IG1hdGNoWzBdLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5wYXR0ZXJuO1xuXHR9XG59XG5cblxuLy8gS2V5d29yZCBwYXR0ZXJuXG4vL1x0YHJ1bGUua2V5d29yZGAgaXMgdGhlIGtleXdvcmQgc3RyaW5nIHRvIG1hdGNoLlxuUnVsZS5LZXl3b3JkID0gY2xhc3MgS2V5d29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0XHQvLyBjcmVhdGUgcGF0dGVybiB3aGljaCBtYXRjaGVzIGF0IHdvcmQgYm91bmRhcnlcblx0XHRpZiAoIXRoaXMucGF0dGVybikge1xuXHRcdFx0aWYgKCF0aGlzLmtleXdvcmQpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBrZXl3b3JkIHByb3BlcnR5XCIpO1xuXHRcdFx0dGhpcy5wYXR0ZXJuID0gbmV3IFJlZ0V4cChgXiR7dGhpcy5rZXl3b3JkfVxcXFxiYCk7XG5cdFx0fVxuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMua2V5d29yZDtcblx0fVxufVxuXG5cbi8vIFN1YnJ1bGUgLS0gbmFtZSBvZiBhbm90aGVyIHJ1bGUgdG8gYmUgY2FsbGVkLlxuLy8gYHJ1bGUubmFtZWAgaXMgdGhlIG5hbWUgb2YgdGhlIHJ1bGUgaW4gYHBhcnNlci5ydWxlc2AuXG5SdWxlLlN1YnJ1bGUgPSBjbGFzcyBTdWJydWxlIGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0dmFyIHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZSh0aGlzLnJ1bGUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBBdHRlbXB0aW5nIHRvIHBhcnNlIHVua25vd24gcnVsZSAnJHt0aGlzLm5hbWV9J2AsIHRoaXMpO1xuXHRcdHZhciByZXN1bHQgPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKTtcblx0XHRpZiAoIXJlc3VsdCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSByZXN1bHQuYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYHske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZX19JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cblxuLy8gQWJzdHJhY3Q6ICBgTmVzdGVkYCBydWxlIC0tIGNvbXBvc2VkIG9mIGEgc2VyaWVzIG9mIG90aGVyIGBydWxlc2AuXG5SdWxlLk5lc3RlZCA9IGNsYXNzIE5lc3RlZCBleHRlbmRzIFJ1bGUge31cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaCAoYXV0by1leGNsdWRpbmcgd2hpdGVzcGFjZSkuXG5SdWxlLlNlcXVlbmNlID0gY2xhc3MgU2VxdWVuY2UgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdC8vIFRocm93cyBvZiBtYW5kYXRvcnkgcnVsZSBjYW4ndCBiZSBtYXRjaGVkLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFyZXN1bHQgJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vVE9ET0Ncblx0Ly8gR2F0aGVyIGFyZ3VtZW50cyBmcm9tIG91ciBwYXJzZWQgYHJlc3VsdHNgIGFycmF5LlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYHZhbHVlc2AgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGByZXN1bHRzLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYHJlc3VsdHMucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gcnVsZSB0eXBlOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdGdhdGhlckFyZ3VtZW50cygpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRsZXQgYXJncyA9IHt9O1xuXHRcdGZvciAobGV0IG5leHQgb2YgdGhpcy5yZXN1bHRzKSB7XG5cdFx0XHRsZXQgcnVsZU5hbWUgPSBuZXh0LmFyZ3VtZW50IHx8IG5leHQucnVsZU5hbWUgfHwgbmV4dC5jb25zdHJ1Y3Rvci5uYW1lO1xuXHRcdFx0Ly8gRm9yIG5lc3RlZCBydWxlcywgcmVjdXJzZSB0byBnZXQgdGhlaXIgYXJndW1lbnRzXG5cdFx0XHRsZXQgcmVzdWx0ID0gKG5leHQgaW5zdGFuY2VvZiBSdWxlLk5lc3RlZCA/IG5leHQuZ2F0aGVyQXJndW1lbnRzKCkgOiBuZXh0KTtcblxuXHRcdFx0aWYgKHJ1bGVOYW1lIGluIGFyZ3MpIHtcblx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KGFyZ3NbcnVsZU5hbWVdKSkgYXJnc1tydWxlTmFtZV0gPSBbYXJnc1tydWxlTmFtZV1dO1xuXHRcdFx0XHRhcmdzW3J1bGVOYW1lXS5wdXNoKHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0YXJnc1tydWxlTmFtZV0gPSByZXN1bHQ7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBhcmdzO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBFeHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7XG4vLyBcdGdhdGhlckFyZ3VtZW50cygpIHtcbi8vIFx0XHRsZXQgYXJncyA9IHN1cGVyLmdhdGhlckFyZ3VtZW50cygpO1xuLy8gXHRcdHJldHVybiBhcmdzLmV4cHJlc3Npb247XG4vLyBcdH1cbn1cblJ1bGUuU3RhdGVtZW50ID0gY2xhc3MgU3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7XG4vLyBcdGdhdGhlckFyZ3VtZW50cygpIHtcbi8vIFx0XHRsZXQgYXJncyA9IHN1cGVyLmdhdGhlckFyZ3VtZW50cygpO1xuLy8gY29uc29sZS53YXJuKGFyZ3MpO1xuLy8gXHRcdHJldHVybiBhcmdzO1xuLy8gXHR9XG59XG5cblxuLy8gQWx0ZXJuYXRpdmUgc3ludGF4LlxuLy8gTk9URTogQ3VycmVudGx5IHRha2VzIHRoZSBmaXJzdCB2YWxpZCBtYXRjaC5cbi8vIFRPRE86IG1hdGNoIGFsbCB2YWxpZCBhbHRlcm5hdGl2ZXNcbi8vIFRPRE86IHJlbmFtZVxuUnVsZS5BbHRlcm5hdGl2ZXMgPSBjbGFzcyBBbHRlcm5hdGl2ZXMgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpO1xuXHRcdGlmICghdGhpcy5ydWxlcykgdGhpcy5ydWxlcyA9IFtdO1xuXHR9XG5cblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdGlmICh0aGlzLmFyZ3VtZW50KSBtYXRjaC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0XHRcdHJldHVybiBtYXRjaDtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCgke3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZXMuam9pbihcInxcIil9KSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBSZXBlYXRpbmcgcnVsZS5cbi8vXHRgdGhpcy5ydWxlYCBpcyB0aGUgcnVsZSB0aGF0IHJlcGVhdHMuXG4vL1xuLy8gQWZ0ZXIgbWF0Y2hpbmc6XG4vL1x0YHRoaXMucmVzdWx0c2AgaXMgYXJyYXkgb2YgcmVzdWx0cyBvZiBtYXRjaGVzLlxuLy9cbi8vXHRBdXRvbWF0aWNhbGx5IGNvbnN1bWVzIHdoaXRlc3BhY2UgYmVmb3JlIHJ1bGVzLlxuLy9cdElmIGRvZXNuJ3QgbWF0Y2ggYXQgbGVhc3Qgb25lLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuUnVsZS5SZXBlYXQgPSBjbGFzcyBSZXBlYXQgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IG5leHQgPSBzdHJlYW07XG5cdFx0bGV0IHJlc3VsdHMgPSBbXTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMucnVsZS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFyZXN1bHQpIGJyZWFrO1xuXG5cdFx0XHRyZXN1bHRzLnB1c2hbcmVzdWx0XTtcblx0XHRcdG5leHQgPSByZXN1bHQubmV4dCgpO1xuXHRcdH1cblxuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdHJlc3VsdHMsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1NvdXJjZSgpIHtcblx0XHR0aHJvdyBcIkRvbid0IHVuZGVyc3RhbmQgaG93IHRvIHNvdXJjZSBSdWxlLlJlcGVhdCFcIjtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnJ1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe2xpdGVyYWx9LF1gIHRvIG1hdGNoIGBhLGIsY2Bcbi8vXHRgcnVsZS5pdGVtYCBpcyB0aGUgcnVsZSBmb3IgZWFjaCBpdGVtLFxuLy9cdGBydWxlLmRlbGltaXRlcmAgaXMgdGhlIGRlbGltaXRlciBiZXR3ZWVuIGVhY2ggaXRlbS5cbi8vIFx0YHJ1bGUucmVzdWx0c2AgaW4gdGhlIG91dHB1dCBpcyB0aGUgbGlzdCBvZiB2YWx1ZXMuXG4vL1xuLy9cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGEgTGlzdCBydWxlIHdpbGwgTk9UIHJlcGVhdCAoPz8/PylcblJ1bGUuTGlzdCA9IGNsYXNzIExpc3QgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHQvLyBlbnN1cmUgaXRlbSBhbmQgZGVsaW1pdGVyIGFyZSBvcHRpb25hbCBzbyB3ZSBkb24ndCBiYXJmIGluIGBwYXJzZVJ1bGVgXG5cdFx0dGhpcy5pdGVtLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR0aGlzLmRlbGltaXRlci5vcHRpb25hbCA9IHRydWU7XG5cblx0XHR2YXIgcmVzdWx0cyA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHQvLyBnZXQgbmV4dCBpdGVtLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGl0ZW0gPSB0aGlzLml0ZW0ucGFyc2UocGFyc2VyLCBuZXh0KTtcblx0XHRcdGlmICghaXRlbSkgYnJlYWs7XG4vL2NvbnNvbGUubG9nKGl0ZW0pO1xuXHRcdFx0cmVzdWx0cy5wdXNoKGl0ZW0pO1xuXHRcdFx0bmV4dCA9IGl0ZW0ubmV4dCgpO1xuXG5cdFx0XHQvLyBnZXQgZGVsaW1pdGVyLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGRlbGltaXRlciA9IHRoaXMuZGVsaW1pdGVyLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0ID0gZGVsaW1pdGVyLm5leHQoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIG1hdGNoZWQgaXRlbSBieSBpbmRleFxuXHRnZXRJdGVtKGluZGV4KSB7XG5cdFx0aWYgKCF0aGlzLnJlc3VsdHMpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMucmVzdWx0c1tpbmRleF07XG5cdH1cblxuXG5cdHRvU291cmNlKCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1x0XHQvLyBUT0RPOiB0aHJvdz8/P1xuXHRcdGxldCByZXN1bHRzID0gdGhpcy5yZXN1bHRzLm1hcCggcmVzdWx0ID0+IHJlc3VsdC50b1NvdXJjZSgpICkuam9pbihcIiwgXCIpO1xuXHRcdHJldHVybiBgWyR7cmVzdWx0c31dYDtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgWyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5pdGVtfSAke3RoaXMuZGVsaW1pdGVyfV1gO1xuXHR9XG59O1xuXG5cblxuXG5cbi8vXG4vL1x0IyBQYXJzaW5nIGBydWxlU3ludGF4YCB0byBjcmVhdGUgcnVsZXMgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUT0RPOlx0UHVsbCBgcGFyc2VSdWxlU3ludGF4YCBzdHVmZiBvdXQgaW50byBzZXBhcmF0ZSBtb2R1bGU/XG4vLyBUT0RPOlx0QmV0dGVyIG5hbWUgZm9yIGBydWxlU3ludGF4YFxuLy8gVE9ETzpcdFVzZSBrZXl3b3JkcyBpbiBzeW50YXggdG8gbWFrZSBhIHF1aWNrIHJlZ2V4LWJhc2VkIGB0ZXN0YCBmdW5jdGlvbiBmb3IgdGhlIGVudGlyZSBydWxlXG5PYmplY3QuYXNzaWduKFJ1bGUsIHtcblxuLy9cbi8vICMjIGdyb3VwOiBwYXJzaW5nIHN5bnRheFxuLy9cblxuLy8gVE9ETzogY29udmVydCB0byBUZXh0U3RyZWFtIHBhdHRlcm4gYWxhIG5vcm1hbCBwYXJzZXIgb25jZSB0aGF0IHNldHRsZXMgZG93bj8/P1xuXHRwYXJzZVJ1bGVTeW50YXgoc3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIFtdKTtcblxuXHRcdGxldCBydWxlO1xuXHRcdC8vIElmIHdlIG9ubHkgZ290IG9uZSB0aGluZywgcmV0dXJuIHRoYXQgYXMgdGhlIHJlc3VsdFxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSBydWxlc1swXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFNlcXVlbmNlQ29uc3RydWN0b3IoeyBydWxlcyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fSxcblxuXHR0b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KSB7XG5cdFx0Y29uc3QgU1lOVEFYX0VYUFJFU1NJT04gPSAvKD86W1xcd1xcLV0rfFxcXFxbXFxbXFwoXFx7XFwpXFx9XFxdXXxbXlxcc1xcd118XFx8KS9nO1xuXHRcdHZhciBzeW50YXhTdHJlYW0gPSBzeW50YXgubWF0Y2goU1lOVEFYX0VYUFJFU1NJT04pO1xuXHRcdGlmICghc3ludGF4U3RyZWFtKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHRva2VuaXplIHBhcnNlIHJ1bGUgc3ludGF4ID4+JHtzeW50YXh9PDxgKTtcblx0XHRyZXR1cm4gc3ludGF4U3RyZWFtO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDAsIGxhc3RJbmRleCA9IHN5bnRheFN0cmVhbS5sZW5ndGgpIHtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKGVuZEluZGV4ID49IGxhc3RJbmRleClcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKFwiUGFzdCBsYXN0SW5kZXhcIik7XG5cdFx0XHRpZiAocnVsZSkgcnVsZXMucHVzaChydWxlKTtcblx0XHRcdHN0YXJ0SW5kZXggPSBlbmRJbmRleCArIDE7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlcztcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCA9IDApIHtcblx0XHR2YXIgc3ludGF4VG9rZW4gPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHRzd2l0Y2ggKHN5bnRheFRva2VuKSB7XG5cdFx0XHRjYXNlIFwie1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcInxcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9hbHRlcm5hdGl2ZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKlwiOlxuXHRcdFx0Y2FzZSBcIitcIjpcblx0XHRcdGNhc2UgXCI/XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0XHQvLyB0aGUgZm9sbG93aW5nIHNob3VsZCBBTFdBWVMgYmUgY29uc3VtZWQgYnkgdGhlIGFib3ZlXG5cdFx0XHRjYXNlIFwifVwiOlxuXHRcdFx0Y2FzZSBcIilcIjpcblx0XHRcdGNhc2UgXCJdXCI6XG5cdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCAke3N5bnRheFRva2VufSBmb3VuZCBhcyBpdGVtICR7c3RhcnRJbmRleH0gb2YgJHt0aGlzLnN5bnRheH1gKTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N0cmluZyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0dmFyIHN0cmluZyA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XSwgcnVsZTtcblx0XHQvLyBJZiBsZXR0ZXJzIG9ubHksIG1hdGNoIGFzIGEgS2V5d29yZCAoc28gd2UgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkgYWZ0ZXIgdGhlIHN0cmluZykuXG5cdFx0aWYgKHN0cmluZy5tYXRjaCgvW0EtWmEtel0rLykpIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5LZXl3b3JkKHsga2V5d29yZDogc3RyaW5nIH0pO1xuXHRcdH1cblx0XHQvLyBPdGhlcndpc2UgbWF0Y2ggYXMgYSBTdHJpbmcsIHdoaWNoIGRvZXNuJ3QgcmVxdWlyZSBub24td29yZCBjaGFycyBhZnRlciB0aGUgdGV4dC5cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5TdHJpbmcoeyBzdHJpbmc6IHN0cmluZyB9KTtcblx0XHRcdC8vIElmIHN0cmluZyBzdGFydHMgd2l0aCBgXFxcXGAsIGl0J3MgYW4gZXNjYXBlZCBsaXRlcmFsIChlZzogYFxcW2AgbmVlZHMgdG8gaW5wdXQgYXMgYFxcXFxbYCkuXG5cdFx0XHRpZiAoc3RyaW5nLnN0YXJ0c1dpdGgoXCJcXFxcXCIpKSB7XG5cdFx0XHRcdC8vIHJlbW92ZSBsZWFkaW5nIHNsYXNoIGluIG1hdGNoIHN0cmluZy4uLlxuXHRcdFx0XHRydWxlLnN0cmluZyA9IHJ1bGUuc3RyaW5nLnN1YnN0cigxKTtcblx0XHRcdFx0Ly8gYnV0IGxlYXZlIGl0IGluIHRvU3RyaW5nXG5cdFx0XHRcdHJ1bGUudG9TdHJpbmcgPSAoKSA9PiBzdHJpbmc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBbIHJ1bGUsIHN0YXJ0SW5kZXggXTtcblx0fSxcblxuXG5cdC8vIE1hdGNoIGdyb3VwaW5nIGV4cHJlc3Npb24gYCguLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiKFwiLCBcIilcIiwgc3RhcnRJbmRleCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGU7XG5cdFx0dmFyIHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHQvLyBTaW5nbGUgcmVzdWx0IG1lYW5zIG9wdGlvbmFsIGV4cHJlc3Npb25cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSByZXN1bHRzWzBdO1xuXHRcdFx0aWYgKCEocnVsZSBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzKSkgcnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlNlcXVlbmNlKHsgcnVsZXM6IHJlc3VsdHMgfSk7XG5cdFx0fVxuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCByZXBlYXQgaW5kaWNhdG9yIGA/YCwgYCtgIG9yIGAqYCBieSBhdHRhY2hpbmcgaXQgdG8gdGhlIHByZXZpb3VzIHJ1bGUuXG5cdHBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdHZhciBzeW1ib2wgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cdFx0dmFyIHJ1bGUgPSBydWxlc1tydWxlcy5sZW5ndGggLSAxXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgYXR0YWNoIHJlcGVhdCBzeW1ib2wgJHtzeW1ib2x9IHRvIGVtcHR5IHJ1bGUhYCk7XG5cblx0XHQvLyBUcmFuc2Zvcm0gbGFzdCBydWxlIGludG8gYSByZXBlYXQgZm9yIGAqYCBhbmQgYCtgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiKlwiIHx8IHN5bWJvbCA9PT0gXCIrXCIpIHtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5SZXBlYXQoeyBydWxlIH0pO1xuXHRcdFx0Ly8gcHVzaCBpbnRvIHJ1bGUgc3RhY2sgaW4gcGxhY2Ugb2Ygb2xkIHJ1bGVcblx0XHRcdHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdID0gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBSdWxlIGlzIG9wdGlvbmFsIGZvciBgP2AgYW5kIGAqYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIj9cIiB8fCBzeW1ib2wgPT09IFwiKlwiKSB7XG5cdFx0XHRydWxlLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gWyB1bmRlZmluZWQsIHN0YXJ0SW5kZXggXVxuXHR9LFxuXG5cdC8vIE1hdGNoIGB7PHJ1bGVOYW1lPn1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCBtYXRjaCA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJ7XCIsIFwifVwiLCBzdGFydEluZGV4KTtcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA9PT0gMyAmJiBtYXRjaC5zbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gbWF0Y2guc2xpY2VbMF07XG5cdFx0XHRtYXRjaC5zbGljZSA9IG1hdGNoLnNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID4gMSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBwcm9jZXNzIHJ1bGVzIHdpdGggbW9yZSB0aGFuIG9uZSBydWxlIG5hbWU6IHske21hdGNoLnNsaWNlLmpvaW4oXCJcIil9fWApO1xuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuU3VicnVsZSh7IHJ1bGU6IG1hdGNoLnNsaWNlWzBdIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIG1hdGNoLmVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggbGlzdCBleHByZXNzaW9uIGBbPGl0ZW0+PGRlbGltaXRlcj5dYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJbXCIsIFwiXVwiLCBzdGFydEluZGV4KTtcblxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHNsaWNlLCBbXSk7XG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoICE9PSAyKSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgc3R1ZmYgYXQgZW5kIG9mIGxpc3Q6IFske3NsaWNlLmpvaW4oXCIgXCIpfV1gKTtcblx0XHR9XG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5MaXN0KCk7XG5cdFx0cnVsZS5pdGVtID0gcmVzdWx0c1swXVxuXHRcdHJ1bGUuZGVsaW1pdGVyID0gcmVzdWx0c1sxXVxuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYWx0ZXJuYXRlIGAoIGEgfCBiIHwgYyApYC5cblx0Ly8gTk9URTogdGhpcyBzaG91bGQgb25seSBoYXBwZW4gaW5zaWRlIGEgZ3JvdXAuLi5cblx0cGFyc2VSdWxlU3ludGF4X2FsdGVybmF0aXZlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggKyAxKTtcblxuXHRcdC8vIGNyZWF0ZSBhbHRlcm5hdGVzIHJ1bGUgd2l0aCBsYXN0VG9rZW4sIG9yIHJlLXVzZSBleGlzdGluZyBhbHRlcm5hdGVzIHJpbGVcblx0XHRsZXQgYWx0ZXJuYXRlcztcblx0XHRsZXQgbGFzdFRva2VuID0gcnVsZXMucG9wKCk7XG5cdFx0aWYgKGxhc3RUb2tlbiBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzKSB7XG5cdFx0XHRhbHRlcm5hdGVzID0gbGFzdFRva2VuO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGFsdGVybmF0ZXMgPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlczogW10gfSk7XG5cblx0XHRcdC8vIGlmIG5vIGxhc3QgcnVsZSwgd2UgaGF2ZSBhIHJ1bGUgbGlrZSAgYCggfCBhYmMpYCB3aGljaCBtZWFucyB0aGF0IHRoZSBhbHRlcm5hdGVzIGlzIG9wdGlvbmFsXG5cdFx0XHRpZiAoIWxhc3RUb2tlbilcblx0XHRcdFx0YWx0ZXJuYXRlcy5vcHRpb25hbCA9IHRydWU7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdGFsdGVybmF0ZXMucnVsZXMucHVzaChsYXN0VG9rZW4pO1xuXHRcdH1cblx0XHQvLyBhZGQgcGFyc2VkIHJ1bGUgdG8gdGhlIGFsdGVybmF0ZXNzXG5cdFx0YWx0ZXJuYXRlcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXG5cdFx0Ly8gYWRkIGJhY2sgdG8gdGhlIGVuZCBvZiBydWxlc1xuXHRcdHJ1bGVzLnB1c2goYWx0ZXJuYXRlcyk7XG5cblx0XHRyZXR1cm4gWyB1bmRlZmluZWQsIGVuZEluZGV4IF07XG5cdH0sXG5cblxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZS5qcyIsIi8vXG4vL1x0IyBDcmVhdGUgYSBgcGFyc2VyYCBzaW5nbGV0b24gdG8gdXNlIHRvIHNldCB1cCBydWxlcyBhbmQgZHVyaW5nIHRlc3RzLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJcbi8vIFRPRE86IGNvbnZlcnQgdG8gbGluZS1hd2FyZSBzdHJlYW0/Pz9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRTdHJlYW0ge1xuXHQvLyBZb3UgY2FuIGNvbnN0cnVjdCB3aXRoIGEgdGV4dCBzdHJpbmcgb3IgYSBzZXQgb2YgcHJvcGVydGllcyAoaW5jbHVkaW5nIGB0ZXh0YCkuXG5cdGNvbnN0cnVjdG9yKHRleHRPclByb3BzKSB7XG5cdFx0aWYgKHR5cGVvZiB0ZXh0T3JQcm9wcyA9PT0gXCJzdHJpbmdcIilcblx0XHRcdHRoaXMudGV4dCA9IHRleHRPclByb3BzO1xuXHRcdGVsc2Vcblx0XHRcdE9iamVjdC5hc3NpZ24odGhpcywgdGV4dE9yUHJvcHMpO1xuXG5cdFx0Ly8gTWFrZSBzdXJlIGB0ZXh0YCBpcyBkZWZpbmVkLlxuXHRcdGlmICghKFwidGV4dFwiIGluIHRoaXMpKSB0aGlzLnRleHQgPSBcIlwiO1xuXHRcdGlmICghKFwic3RhcnRJbmRleFwiIGluIHRoaXMpKSB0aGlzLnN0YXJ0SW5kZXggPSAwO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGFuIGltbXV0YWJsZSBjbG9uZSBvZiB0aGUgc3RyZWFtLlxuXHRjbG9uZShwcm9wcykge1xuXHRcdGxldCBjbG9uZSA9IG5ldyBUZXh0U3RyZWFtKHRoaXMpO1xuXHRcdE9iamVjdC5hc3NpZ24oY2xvbmUsIHByb3BzKTtcblx0XHRyZXR1cm4gY2xvbmU7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNlZCB0byBuZXcgc3RhcnRJbmRleC5cblx0YWR2YW5jZVRvKHN0YXJ0SW5kZXgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXggfSk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgc3RyZWFtLCBhZHZhbmNpbmcgc3RhcnRJbmRleCBCWSBgbGVuZ3RoYFxuXHRhZHZhbmNlQnkobGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG5cdH1cblxuLy8gXHQvLyBSZXR1cm4gY2xvbmUgb2YgdGhpcyBzdHJlYW0gd2l0aCBlbmRJbmRleCBzZXQgdG8gc3RhcnQgKyBgbGVuZ3RoYFxuLy8gXHRlbmRBZnRlcihsZW5ndGgpIHtcbi8vIFx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IGVuZEluZGV4OiB0aGlzLnN0YXJ0SW5kZXggKyBsZW5ndGggfSk7XG4vLyBcdH1cblxuXHQvLyBNYXRjaCBgcGF0dGVybmAgYXMgcmVnZXggYXQgaGVhZCBvZiBzdHJlYW0uXG5cdC8vIE5PVEU6IHJlZ2V4ZXMgc2hvdWxkIHN0YXJ0IHdpdGggYF5gIVxuXHQvLyBSZXR1cm5zIG1hdGNoIG9yIHVuZGVmaW5lZC5cblx0bWF0Y2gocGF0dGVybikge1xuXHRcdGlmICghKHBhdHRlcm4gaW5zdGFuY2VvZiBSZWdFeHApKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBUZXh0U3RyZWFtLm1hdGNoKCR7cGF0dGVybn0pOiBleHBlY3RlZCBSZWdFeHBgKTtcbi8vVE9ETzogdXNlIGBzdHJlYW0ucmFuZ2VgIHRvIGVuc3VyZSBtYXRjaCBpcyBub3Qgbm90IGJleW9uZCBgc3RyaW5nLmVuZEluZGV4YFxuXHRcdHJldHVybiB0aGlzLmhlYWQubWF0Y2gocGF0dGVybik7XG5cdH1cblxuXHRzdGFydHNXaXRoKHN0cmluZykge1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5zdGFydHNXaXRoKHN0cmluZyk7XG5cdH1cblxuXHQvLyBSZXR1cm4gdGV4dCBvZiBzdHJpbmcgc3RhcnRpbmcgYXQgb3VyIGBzdGFydEluZGV4YFxuXHRnZXQgaGVhZCgpIHtcblx0XHRyZXR1cm4gdGhpcy5yYW5nZSgpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgcmFuZ2Ugb2YgdGhlIHN0cmluZyBmcm9tIGBzdGFydEluZGV4YCB0byBgZW5kSW5kZXhgIE5PTi1pbmNsdXNpdmUuXG5cdHJhbmdlKHN0YXJ0SW5kZXggPSB0aGlzLnN0YXJ0SW5kZXgsIGVuZEluZGV4ID0gdGhpcy50ZXh0Lmxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQuc3Vic3RyaW5nKHN0YXJ0SW5kZXgsIGVuZEluZGV4KTtcblx0fVxuXG5cdC8vIExlbmd0aCBvZiB0aGUgc3RyZWFtLlxuXHRnZXQgbGVuZ3RoKCkge1xuXHRcdHJldHVybiB0aGlzLnRleHQubGVuZ3RoO1xuXHR9XG5cblx0Ly8gQXJlIHdlIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmVhbT9cblx0Z2V0IGlzRW1wdHkoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3RhcnRJbmRleCA9PT0gdGhpcy5sZW5ndGg7XG5cdH1cblxuXG5cblxuXHQvL1xuXHQvLyMjIFJlZmxlY3Rpb25cblx0Ly9cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dFxuXHR9O1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1RleHRTdHJlYW0uanMiLCJpbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gbG9hZCBzdGFuZGFyZCBydWxlcyBmaWxlcyBoZXJlXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vYXNzaWdubWVudFwiO1xuaW1wb3J0IFwiLi9jbGFzc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vcnVsZXMvaW5kZXguanNcIjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdHdpbmRvdy5UZXh0U3RyZWFtID0gVGV4dFN0cmVhbTtcblx0d2luZG93LlBhcnNlciA9IFBhcnNlcjtcblx0d2luZG93LlJ1bGUgPSBSdWxlO1xuXHR3aW5kb3cucGFyc2VyID0gcGFyc2VyO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7XG5cdFRleHRTdHJlYW0sIFBhcnNlciwgUnVsZSwgcGFyc2VyXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9pbmRleC5qcyIsIi8vIFNwZWxsIFwiRW5nbGlzaFwiIHBhcnNlciBzdHJhd21hblxuXG4vLyBUT0RPOlx0Y3VzdG9tIFN5bnRheEVycm9yIGV0YyB3aGljaCB1bmRlcnN0YW5kIHN0cmVhbXNcbi8vIFRPRE86XHRicmVhayBgZmlsZWAgaW50byBsaW5lcyBhbmQgcHJvY2VzcyBlYWNoIChpbmNsLiBzdWJzdHIvbWF0Y2ggbm90IGdvaW5nIGJleW9uZCB0aGUgZW5kKVxuLy8gVE9ETzpcdG5lc3RpbmcgLS0gaXMgdGhpcyBqdXN0IGluZGVudCA9IFwiYWRkIGJsb2NrIHNjb3BlXCJcbi8vIFRPRE86XHRwcm9tb3Rpb24gcGF0dGVybiBmb3IgZ2F0aGVyIGFyZ3VtZW50cyAoZWc6IGxpdGVyYWwtbGlzdCkgPz8/XG4vLyBUT0RPOlx0V2hhdCBkb2VzIHN5bnRheCB0cmVlIGxvb2sgbGlrZT8gIEhvdyBkbyB3ZSBleHRyYWN0IG1lYW5pbmcgb3V0IG9mIHRoZSBuZXN0P1xuLy8gVE9ETzpcdERvbid0IHVzZSBgdG9KU09OYCBmb3Igb3V0cHV0dGluZyBydWxlLi4uXG4vLyBUT0RPOlx0UmVjeWNsZSB3b3JkL3N0cmluZy9wYXR0ZXJuIHJ1bGVzIHRvIG1vcmUgZWFzaWx5IHNlZSBjb21tb25hbGl0eS4uLlxuLy8gVE9ETzpcdFBhc3MgYGNvbnRleHRgIHRvIHRvU291cmNlKCksIGFkZCBwcm9wZXJ0eSBkZXNjcmlwdG9ycyB0byBgY2xhc3NgLCB2YXJpYWJsZXMgYW5kIGNvZGUgdG8gYG1ldGhvZGAsIGBnbG9iYWxgIHN0dWZmIGV0Y1xuXG5pbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXHRcdC8vIENsb25lIHJ1bGVzLCBzdGFydGluZyB3aXRoIGEgY29tcGxldGVseSBlbXB0eSBtYXAgaWYgbm90IGRlZmluZWQgKG5vIHN0YW5kYXJkIG9iamVjdCBrZXlzKVxuXHRcdHRoaXMucnVsZXMgPSBPYmplY3QuY3JlYXRlKHRoaXMucnVsZXMgfHwgbnVsbCk7XG5cdH1cblxuXHRnZXRSdWxlKG5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlc1tuYW1lXTtcblx0fVxuXG4vLyMjIyBQYXJzaW5nXG5cblx0Ly8gUGFyc2UgYG5hbWVgZCBydWxlIGF0IGhlYWQgb2YgYHN0cmVhbWAuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cblx0cGFyc2UobmFtZSwgc3RyZWFtKSB7XG5cdFx0aWYgKHR5cGVvZiBzdHJlYW0gPT09IFwic3RyaW5nXCIpIHN0cmVhbSA9IG5ldyBUZXh0U3RyZWFtKHN0cmVhbSk7XG5cblx0XHRsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShuYW1lKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZSAke25hbWV9IG5vdCB1bmRlcnN0b29kYCwgbmFtZSwgc3RyZWFtKTtcblx0XHRzdHJlYW0gPSB0aGlzLmVhdFdoaXRlc3BhY2Uoc3RyZWFtKTtcblx0XHRyZXR1cm4gcnVsZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHR9XG5cblx0Ly8gRWF0IHdoaXRlc3BhY2UgKGFjY29yZGluZyB0byBgcnVsZXMud2hpdGVzcGFjZWApIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBuZXcgc3RyZWFtIGlmIHdlIG1hdGNoZWQgd2hpdGVzcGFjZSwgb3RoZXJ3aXNlIHRoZSBzYW1lIHN0cmVhbS5cblx0Ly8gT3RoZXJ3aXNlIHJldHVybnMgdGhpcyBzYW1lIHN0cmVhbS5cblx0ZWF0V2hpdGVzcGFjZShzdHJlYW0pIHtcblx0XHR2YXIgcmVzdWx0ID0gdGhpcy5ydWxlcy53aGl0ZXNwYWNlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJlc3VsdCA/IHJlc3VsdC5uZXh0KCkgOiBzdHJlYW07XG5cdH1cblxuLy8jIyMgUnVsZSBmYWN0b3JpZXNcblxuXHQvLyBBZGQgYSBydWxlIHRvIG91ciBsaXN0IG9mIHJ1bGVzIVxuXHQvLyBUT0RPOiBjb252ZXJ0IHRvIGBhbHRlcm5hdGl2ZXNgIG9uIG92ZXJ3cml0ZT9cblx0YWRkUnVsZShuYW1lLCBydWxlKSB7XG5cdFx0bGV0IGV4aXN0aW5nID0gdGhpcy5ydWxlc1tuYW1lXTtcblx0XHRpZiAoZXhpc3RpbmcpIHtcblx0XHRcdGlmICghKGV4aXN0aW5nIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBDb252ZXJ0aW5nIHJ1bGUgJyR7bmFtZX0nIHRvIGFsdGVybmF0aXZlc2ApO1xuXHRcdFx0XHRleGlzdGluZyA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IG5hbWU6IGV4aXN0aW5nLm5hbWUsIHJ1bGVzOiBbZXhpc3RpbmddIH0pO1xuXHRcdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gZXhpc3Rpbmc7XG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZyhgQWRkaW5nIHJ1bGUgJyR7cnVsZS5ydWxlTmFtZX0nIHRvICcke25hbWV9JzogYCwgcnVsZSk7XG5cdFx0XHRleGlzdGluZy5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUucnVsZU5hbWUgPSBuYW1lO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IHJ1bGU7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cblx0Ly8gQWRkIHJlZ2V4IGFzIGEgcGF0dGVybiB0byBvdXIgbGlzdCBvZiBydWxlc1xuXHRhZGRQYXR0ZXJuKG5hbWUsIHBhdHRlcm4sIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlBhdHRlcm4ocHJvcGVydGllcyk7XG5cdFx0cnVsZS5wYXR0ZXJuID0gcGF0dGVybjtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHR9XG5cblx0Ly8gUGFyc2UgYSBgcnVsZVN5bnRheGAgcnVsZSBhbmQgYWRkIGl0IHRvIG91ciBsaXN0IG9mIHJ1bGVzLlxuXHQvLyBSZXR1cm5zIHRoZSBuZXcgcnVsZS5cblx0Ly8gTG9ncyBwYXJzaW5nIGVycm9ycyBidXQgYWxsb3dzIHRoaW5ncyB0byBjb250aW51ZS5cblx0YWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3Rvcik7XG5cblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0XHRjb25zb2xlLmdyb3VwRW5kKCk7XG5cdFx0fVxuXHR9XG5cblx0YWRkU3RhdGVtZW50KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgc3RhdGVtZW50ID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgUnVsZS5TdGF0ZW1lbnQpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJzdGF0ZW1lbnRcIiwgc3RhdGVtZW50KTtcblx0fVxuXG5cdGFkZEV4cHJlc3Npb24obmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdHZhciBleHByZXNzaW9uID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcywgUnVsZS5FeHByZXNzaW9uKTtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBleHByZXNzaW9uKTtcblx0fVxuXG5cbi8vXG4vLyAjIyBVdGlsaXR5IG1ldGhvZHNcbi8vXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gLlxuXHQvLyBJZiBzdWNjZXNzZnVsLCByZXR1cm5zIGB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZSB9YFxuXHQvLyBUaHJvd3MgaWYgdW5zdWNlc3NmdWwuXG5cdHN0YXRpYyBmaW5kTmVzdGVkVG9rZW5zKHRva2Vucywgc3RhcnRUb2tlbiwgZW5kVG9rZW4sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0aWYgKHRva2Vuc1tzdGFydEluZGV4XSAhPT0gc3RhcnRUb2tlbikgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBFeHBlY3RlZCAnJHtzdGFydFRva2VufScgYXQgaW5kZXggJHtzdGFydEluZGV4fSBvZiB0b2tlbnNgKTtcblx0XHRsZXQgbmVzdGluZyA9IDA7XG5cdFx0bGV0IG5lc3RlZCA9IGZhbHNlO1xuXHRcdGZvciAobGV0IGVuZEluZGV4ID0gc3RhcnRJbmRleCArIDEsIGxhc3RJbmRleCA9IHRva2Vucy5sZW5ndGg7IGVuZEluZGV4IDwgbGFzdEluZGV4OyBlbmRJbmRleCsrKSB7XG5cdFx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbZW5kSW5kZXhdO1xuXHRcdFx0aWYgKHRva2VuID09PSBzdGFydFRva2VuKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdFx0bmVzdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b2tlbiA9PT0gZW5kVG9rZW4pIHtcblx0XHRcdFx0aWYgKG5lc3RpbmcgPT09IDApXG5cdFx0XHRcdFx0cmV0dXJuIHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlOiB0b2tlbnMuc2xpY2Uoc3RhcnRJbmRleCsxLCBlbmRJbmRleCksIG5lc3RlZCB9O1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgQ291bGRuJ3QgZmluZCBtYXRjaGluZyAnJHtlbmRUb2tlbn0ncyBzdGFydGluZyBhdCBpdGVtICR7c3RhcnRJbmRleH1gKTtcblx0fVxuXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9QYXJzZXIuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlXCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJhc3NpZ25tZW50XCIsXG5cdFwie2lkZW50aWZpZXJ9ID0ge2xpdGVyYWx9XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgaWRlbnRpZmllciA9IGFyZ3MuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IHN0YXRlbWVudCA9IGAke2lkZW50aWZpZXJ9ID0gJHthcmdzLmxpdGVyYWwudG9Tb3VyY2UoKX07YDtcblxuXHRcdFx0Ly8gaWYgaWRlbnRpZmllciBkb2VzIG5vdCBhbHJlYWR5IGV4aXN0IGluIGNvbnRleHQsIGFkZCBpdCBhbmQgYHZhcmBcblx0XHRcdC8vIFRPRE86IGBsZXRgIGlzIG1heWJlIGJldHRlcj8/P1xuXHRcdFx0aWYgKGNvbnRleHQgJiYgIWNvbnRleHQudmFyaWFibGVzW2lkZW50aWZpZXJdKSB7XG5cdFx0XHRcdHN0YXRlbWVudCA9IGB2YXIgJHtzdGF0ZW1lbnR9YFxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHN0YXRlbWVudDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvYXNzaWdubWVudC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVmaW5pbmcgY2xhc3NlcyAoa25vd24gYXMgYHR5cGVzYClcbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5wYXJzZXIuYWRkU3ludGF4KFwic2NvcGUtbW9kaWZpZXJcIiwgXCIoc2NvcGU6Z2xvYmFsfGNvbnN0YW50fHNoYXJlZClcIik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZS1wcm9wZXJ0eVwiLFxuXHRcIntzY29wZS1tb2RpZmllcn0/IHthc3NpZ25tZW50fVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0dmFyIGlkZW50aWZpZXIgPSBhcmdzLmFzc2lnbm1lbnQuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdFx0dmFyIHZhbHVlID0gYXJncy5hc3NpZ25tZW50LmxpdGVyYWwudG9Tb3VyY2UoKTtcblx0XHRcdGxldCBzdGF0ZW1lbnQgPSBgJHtpZGVudGlmaWVyfSA9ICR7dmFsdWV9O2A7XG5cblx0XHRcdHZhciBzY29wZSA9IGFyZ3Muc2NvcGUgPyBhcmdzLnNjb3BlLnRvU291cmNlKCkgOiBcImxvY2FsXCI7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJnbG9iYWxcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGdsb2JhbC4ke3N0YXRlbWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHtzdGF0ZW1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwic2hhcmVkXCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtzdGF0ZW1lbnR9YDtcblxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBzdGF0ZW1lbnQ7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZS1wcm9wZXJ0eS1hcy1vbmUtb2ZcIixcblx0XCJ7aWRlbnRpZmllcn0gYXMgb25lIG9mIHtsaXN0OmxpdGVyYWwtbGlzdH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgcGx1cmFsID0gKGlkZW50aWZpZXIgKyBcIl9WQUxVRVNcIikudG9VcHBlckNhc2UoKTtcblx0XHRcdGxldCBsaXN0ID0gYXJncy5saXN0Lmxpc3Q7XG5cdFx0XHRsZXQgdmFsdWVzID0gbGlzdC50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGZpcnN0ID0gbGlzdC5yZXN1bHRzWzBdO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKCkgOiBcInVuZGVmaW5lZFwiO1xuXG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke3BsdXJhbH0gPSAke3ZhbHVlc307XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0geyByZXR1cm4gKFwiX18ke2lkZW50aWZpZXJ9XCIgaW4gdGhpcyA/IHRoaXMuX18ke2lkZW50aWZpZXJ9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfVxcbmA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY2xhc3MuanMiLCIvL1xuLy9cdCMgQ29yZSBgcnVsZXNgIC0tIHNpbXBsZSBkYXRhdHlwZXMsIGV0Yy5cbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vXG4vLyBSZWdleCBwYXR0ZXJuIHJ1bGVzIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9ycyBmb3IgZGVidWdnaW5nXG4vL1xuLy9wYXJzZXIuYWRkUGF0dGVybihcIndoaXRlc3BhY2VcIiwgL15cXHMrLyk7XG5wYXJzZXIuYWRkUnVsZShcIndoaXRlc3BhY2VcIiwgbmV3IChjbGFzcyB3aGl0ZXNwYWNlIGV4dGVuZHMgUnVsZS5QYXR0ZXJue30pKHsgcGF0dGVybjogL15cXHMrLywgb3B0aW9uYWw6IHRydWUgfSkpO1xuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuLy9wYXJzZXIuYWRkUGF0dGVybihcImlkZW50aWZpZXJcIiwgL15bYS16XVtcXHdcXGRcXC1fXSovKTtcbnBhcnNlci5hZGRSdWxlKFwiaWRlbnRpZmllclwiLCBuZXcgKGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm57fSkoe1xuXHRwYXR0ZXJuOiAvXlthLXpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG4vL3BhcnNlci5hZGRQYXR0ZXJuKFwidHlwZW5hbWVcIiwgL15bQS1aXVtcXHdcXGRcXC1fXSovKTtcbnBhcnNlci5hZGRSdWxlKFwiVHlwZVwiLCBuZXcgKGNsYXNzIFR5cGUgZXh0ZW5kcyBSdWxlLlBhdHRlcm57fSkoe1xuXHRwYXR0ZXJuOiAvXltBLVpdW1xcd1xcLV0qLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufSkpO1xuXG5cbi8vIGBudW1iZXJgIGFzIGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG5wYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgKGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7XG5cdHBhdHRlcm46IC9eLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIG51bWJlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUZsb2F0KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5cblxuLy8gTnVtZXJpYyBgaW50ZWdlcmAgb25seSwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gTk9URTogdGhpcyBXSUxMIG1hdGNoIGEgZmxvYXQsIGJ1dCB0aGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBjb2VyY2UgdG8gYW4gaW50ZWdlci5cbi8vIFJFVklFVzogaXMgdGhpcyByaWdodD8gIEJldHRlciB0byBub3QgbWF0Y2ggYSBmbG9hdD9cbnBhcnNlci5hZGRSdWxlKFwiaW50ZWdlclwiLCBuZXcgKGNsYXNzIGludGVnZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm57fSkoe1xuXHRwYXR0ZXJuOiAvXi0/KFswLTldKlsuXSk/WzAtOV0rLyxcblx0Ly8gQ29udmVydCB0byBpbnRlZ2VyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHBhcnNlSW50KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5cblxuLy8gTGl0ZXJhbCBgdGV4dGAgc3RyaW5nLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBZb3UgY2FuIHVzZSBlaXRoZXIgc2luZ2xlIG9yIGRvdWJsZSBxdW90ZXMgb24gdGhlIG91dHNpZGUgKGFsdGhvdWdoIGRvdWJsZSBxdW90ZXMgYXJlIHByZWZlcnJlZCkuXG4vLyBSZXR1cm5lZCB2YWx1ZSBoYXMgZW5jbG9zaW5nIHF1b3Rlcy5cbi8vIFRPRE86IGVzY2FwZWQgcXVvdGVzIGluc2lkZSBzdHJpbmdcbnBhcnNlci5hZGRSdWxlKFwidGV4dFwiLCBuZXcgKGNsYXNzIHRleHQgZXh0ZW5kcyBSdWxlLlBhdHRlcm57fSkoe1xuXHRwYXR0ZXJuOiAvXig/OlwiW15cIl0qXCJ8J1teJ10qJykvXG59KSk7XG5cblxuLy8gQm9vbGVhbiBsaXRlcmFsLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBUT0RPOiBiZXR0ZXIgbmFtZSBmb3IgdGhpcz8/P1xucGFyc2VyLmFkZFJ1bGUoXCJib29sZWFuXCIsIG5ldyAoY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7XG5cdHBhdHRlcm46IC9eKHRydWV8ZmFsc2V8eWVzfG5vfHN1Y2Nlc3N8ZmFpbHVyZXxva3xjYW5jZWwpXFxiLyxcblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0Y2FzZSBcInRydWVcIjpcblx0XHRcdGNhc2UgXCJ5ZXNcIjpcblx0XHRcdGNhc2UgXCJzdWNjZXNzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59KSk7XG5cblxuLy8gTGl0ZXJhbCB2YWx1ZSBhcyBudW1iZXIsIHRleHQgb3IgYm9vbGVhbi5cbnBhcnNlci5hZGRTeW50YXgoXCJsaXRlcmFsXCIsIFwiKGxpdGVyYWw6e251bWJlcn18e3RleHR9fHtib29sZWFufSlcIik7XG5cblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxucGFyc2VyLmFkZFN5bnRheChcblx0XCJsaXRlcmFsLWxpc3RcIixcblx0XCJcXFxcW1tsaXN0OntsaXRlcmFsfSxdP1xcXFxdXCIsXG5cdHtcblx0XHQvLyByZXR1cm4ganVzdCB0aGUgbGlzdCBhcyBvdXIgc291cmNlXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuIFx0XHRcdHJldHVybiB0aGlzLmdhdGhlckFyZ3VtZW50cygpLmxpc3QudG9Tb3VyY2UoKTtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vL1xuLy9cdEluaXRpYWxpemUgc3RhdGVtZW50cyBhbmQgZXhwcmVzc2lvbnNcbi8vXG5cbnBhcnNlci5hZGRSdWxlKFwic3RhdGVtZW50XCIsIG5ldyBSdWxlLkFsdGVybmF0aXZlcygpKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoKSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY29yZS5qcyJdLCJzb3VyY2VSb290IjoiIn0=