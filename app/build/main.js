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

	}, {
		key: "gatherArguments",
		value: function gatherArguments() {
			return this.matched;
		}

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

// Rule for literal string value, which include punctuation such as `(` etc.


exports.default = Rule;
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
	_inherits(expression, _Rule$Sequence);

	function expression() {
		_classCallCheck(this, expression);

		return _possibleConstructorReturn(this, (expression.__proto__ || Object.getPrototypeOf(expression)).apply(this, arguments));
	}

	return expression;
}(Rule.Sequence);
Rule.Statement = function (_Rule$Sequence2) {
	_inherits(statement, _Rule$Sequence2);

	function statement() {
		_classCallCheck(this, statement);

		return _possibleConstructorReturn(this, (statement.__proto__ || Object.getPrototypeOf(statement)).apply(this, arguments));
	}

	return statement;
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

	// Find the LONGEST match


	_createClass(Alternatives, [{
		key: "parse",
		value: function parse(parser, stream) {
			var bestMatch = void 0;
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = this.rules[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var rule = _step3.value;

					var match = rule.parse(parser, stream);
					if (!match) continue;

					// take the longest match
					if (!bestMatch || match.endIndex > bestMatch.endIndex) bestMatch = match;
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

			if (!bestMatch) return undefined;
			return this.clone({
				matched: bestMatch,
				endIndex: bestMatch.endIndex,
				stream: stream
			});
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

// List match rule:   `[<item><delimiter>]`. eg" `[{number},]` to match `1,2,3`
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

			if (rule) {
				var last = rules[rules.length - 1];
				// If this is a `String` and last was a `String`, merge together
				if (last && last instanceof Rule.String && rule instanceof Rule.String) {
					last.string += rule.string;
				} else {
					rules.push(rule);
				}
			}
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


	// Match grouping expression `(...|...)` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	// NOTE: nested parens may not have alternatives... :-(   `(a|(b|c))` won't work???
	parseRuleSyntax_parentheses: function parseRuleSyntax_parentheses(syntaxStream, rules, startIndex) {
		var _Parser$findNestedTok = _Parser2.default.findNestedTokens(syntaxStream, "(", ")", startIndex),
		    endIndex = _Parser$findNestedTok.endIndex,
		    slice = _Parser$findNestedTok.slice;

		// pull out explicit argument name


		var argument = void 0,
		    rule = void 0;
		if (slice.length > 2 && slice[1] === ":") {
			argument = slice[0];
			slice = slice.slice(2);
		}

		// split into groups, including nested parens
		if (slice.includes("|")) {
			rule = new Rule.Alternatives();
			var alternates = groupAlternates(slice);
			var _iteratorNormalCompletion4 = true;
			var _didIteratorError4 = false;
			var _iteratorError4 = undefined;

			try {
				for (var _iterator4 = alternates[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
					var group = _step4.value;

					var _results = Rule.parseRuleSyntax_tokens(group, []),
					    groupRule = void 0;
					if (_results.length === 1) {
						groupRule = _results[0];
					} else {
						groupRule = new Rule.Sequence({ rules: _results });
					}
					rule.addRule(groupRule);
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
		} else {
			var results = Rule.parseRuleSyntax_tokens(slice, []);
			// Single result means optional expression
			if (results.length === 1) {
				rule = results[0];
				if (!(rule instanceof Rule.Alternatives)) rule.optional = true;
			} else {
				rule = new Rule.Sequence({ rules: results });
			}
		}

		if (argument) rule.argument = argument;
		return [rule, endIndex];

		function groupAlternates(tokens) {
			var alternates = [];
			var current = [];
			var _iteratorNormalCompletion5 = true;
			var _didIteratorError5 = false;
			var _iteratorError5 = undefined;

			try {
				for (var _iterator5 = tokens[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
					var token = _step5.value;

					if (token === "|") {
						alternates.push(current);
						current = [];
					} else {
						current.push(token);
					}
					//TODO: nested parens...
				}
			} catch (err) {
				_didIteratorError5 = true;
				_iteratorError5 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion5 && _iterator5.return) {
						_iterator5.return();
					}
				} finally {
					if (_didIteratorError5) {
						throw _iteratorError5;
					}
				}
			}

			if (current.length) alternates.push(current);
			return alternates;
		}
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

__webpack_require__(10);

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

// TODO:	this doesn't worky:   `{a} (is|is not) {b}`
// TODO:	custom SyntaxError etc which understand streams
// TODO:	break `file` into lines and process each (incl. substr/match not going beyond the end)
// TODO:	nesting -- is this just indent = "add block scope"
// TODO:	promotion pattern for gather arguments (eg: literal-list) ???
// TODO:	What does syntax tree look like?  How do we extract meaning out of the nest?
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

		// Set up standard rule classes as alternates
		this.addRule("statement", new _Rule2.default.Alternatives());
		this.addRule("expression", new _Rule2.default.Alternatives());
		this.addRule("operator", new _Rule2.default.Alternatives());
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
			var rule = this.addSyntax(name, ruleSyntax, properties, _Rule2.default.Statement);
			return this.addRule("statement", rule);
		}
	}, {
		key: "addExpression",
		value: function addExpression(name, ruleSyntax, properties) {
			var rule = this.addSyntax(name, ruleSyntax, properties, _Rule2.default.Expression);
			return this.addRule("expression", rule);
		}
	}, {
		key: "addOperator",
		value: function addOperator(name, ruleSyntax, properties) {
			var rule = this.addSyntax(name, ruleSyntax, properties);
			return this.addRule("operator", rule);
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

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for creating variables, property access, etc
//

// re-export parser for testing.
exports.default = _parser2.default;

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
//parser.addPattern("identifier", /^[a-z][\w\d\-_]*/);

var identifier = _parser2.default.addRule("identifier", new (function (_Rule$Pattern) {
	_inherits(identifier, _Rule$Pattern);

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
_parser2.default.addRule("expression", identifier);

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

// `Type` = type name.
// MUST start with an upper-case letter (?)
//parser.addPattern("typename", /^[A-Z][\w\d\-_]*/);
var type = _parser2.default.addRule("Type", new (function (_Rule$Pattern2) {
	_inherits(Type, _Rule$Pattern2);

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
_parser2.default.addRule("expression", type);

// `number` as either float or integer, created with custom constructor for debugging.
var number = _parser2.default.addRule("number", new (function (_Rule$Pattern3) {
	_inherits(number, _Rule$Pattern3);

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
_parser2.default.addRule("expression", number);

// Numeric `integer` only, created with custom constructor for debugging.
// NOTE: this WILL match a float, but the returned value will coerce to an integer.
// REVIEW: is this right?  Better to not match a float?
_parser2.default.addRule("integer", new (function (_Rule$Pattern4) {
	_inherits(integer, _Rule$Pattern4);

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
var text = _parser2.default.addRule("text", new (function (_Rule$Pattern5) {
	_inherits(text, _Rule$Pattern5);

	function text() {
		_classCallCheck(this, text);

		return _possibleConstructorReturn(this, (text.__proto__ || Object.getPrototypeOf(text)).apply(this, arguments));
	}

	return text;
}(_Rule2.default.Pattern))({
	pattern: /^(?:"[^"]*"|'[^']*')/
}));
_parser2.default.addRule("expression", text);

// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
var bool = _parser2.default.addRule("boolean", new (function (_Rule$Pattern6) {
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
_parser2.default.addRule("expression", bool);

// Literal value as number, text or boolean.
//parser.addExpression("literal", "(literal:{number}|{text}|{boolean})");


// Literal list (array), eg:  `[1,2,true,false ]`
var list = _parser2.default.addExpression("literal-list", "\\[[list:{expression},]?\\]", {
	// return just the list as our source
	toSource: function toSource(context) {
		return this.gatherArguments().list.toSource();
	}
});

/***/ }),
/* 10 */
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

// `operator.transformer` MUST return a function which transforms two arguments (`lhs` and `rhs`) into output.

_parser2.default.addOperator("is", "is", {
	transformer: function transformer(a, b) {
		return "(" + a + " != " + b + ")";
	}
});
_parser2.default.addOperator("is-not", "is not", {
	transformer: function transformer(a, b) {
		return "(" + a + " != " + b + ")";
	}
});
_parser2.default.addOperator("type-of", "is (a|an)", {
	transformer: function transformer(thing, type) {
		return "spell.typeof(" + thing + ", " + type + ")";
	}
});
_parser2.default.addOperator("not-type-of", "is not (a|an)", {
	transformer: function transformer(thing, type) {
		return "!spell.typeof(" + thing + ", " + type + ")";
	}
});

_parser2.default.addOperator("gt", "(>|is greater than)", {
	transformer: function transformer(a, b) {
		return "(" + a + " > " + b + ")";
	}
});
_parser2.default.addOperator("gte", "(>=|is greater than or equal to)", {
	transformer: function transformer(a, b) {
		return "(" + a + " >= " + b + ")";
	}
});
_parser2.default.addOperator("lt", "(<|is less than)", {
	transformer: function transformer(a, b) {
		return "(" + a + " < " + b + ")";
	}
});
_parser2.default.addOperator("lte", "(<=|is less than or equal to)", {
	transformer: function transformer(a, b) {
		return "(" + a + " <= " + b + ")";
	}
});

_parser2.default.addSyntax("operator-expression", "{lhs:expression} {operator} {rhs:expression}", {
	toSource: function toSource(context) {
		var args = this.gatherArguments();
		var lhs = args.lhs.toSource(context);
		var rhs = args.rhs.toSource(context);

		var transformer = args.operator.transformer;
		if (typeof transformer !== "function") {
			throw new TypeError("Expected 'transformer' argument to be a function", args);
		}
		return transformer(lhs, rhs);
	}
});

/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgNWVkNTI0OGRjNGQ2MDgzOWQ4YjIiLCJ3ZWJwYWNrOi8vLy4vc3JjL1J1bGUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1RleHRTdHJlYW0uanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9pbmRleC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUGFyc2VyLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9hc3NpZ25tZW50LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9jbGFzcy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIl0sIm5hbWVzIjpbIlJ1bGUiLCJwcm9wZXJ0aWVzIiwiT2JqZWN0IiwiYXNzaWduIiwicHJvcHMiLCJjbG9uZSIsImNyZWF0ZSIsInN0cmVhbSIsImVuZEluZGV4IiwidW5kZWZpbmVkIiwiVHlwZUVycm9yIiwiYWR2YW5jZVRvIiwibWF0Y2hlZCIsImNvbnN0cnVjdG9yIiwibmFtZSIsIlN0cmluZyIsInBhcnNlciIsInN0YXJ0c1dpdGgiLCJzdHJpbmciLCJzdGFydEluZGV4IiwibGVuZ3RoIiwiUGF0dGVybiIsIm1hdGNoIiwicGF0dGVybiIsIktleXdvcmQiLCJrZXl3b3JkIiwiUmVnRXhwIiwiU3VicnVsZSIsInJ1bGUiLCJnZXRSdWxlIiwiU3ludGF4RXJyb3IiLCJyZXN1bHQiLCJwYXJzZSIsImFyZ3VtZW50Iiwib3B0aW9uYWwiLCJOZXN0ZWQiLCJTZXF1ZW5jZSIsInJlc3VsdHMiLCJuZXh0IiwicnVsZXMiLCJlYXRXaGl0ZXNwYWNlIiwicHVzaCIsImFyZ3MiLCJydWxlTmFtZSIsImdhdGhlckFyZ3VtZW50cyIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJFeHByZXNzaW9uIiwiU3RhdGVtZW50IiwiQWx0ZXJuYXRpdmVzIiwiYmVzdE1hdGNoIiwiUmVwZWF0IiwiTGlzdCIsIml0ZW0iLCJkZWxpbWl0ZXIiLCJpbmRleCIsIm1hcCIsInRvU291cmNlIiwicGFyc2VSdWxlU3ludGF4Iiwic3ludGF4IiwiU2VxdWVuY2VDb25zdHJ1Y3RvciIsInN5bnRheFN0cmVhbSIsInRva2VuaXNlUnVsZVN5bnRheCIsInBhcnNlUnVsZVN5bnRheF90b2tlbnMiLCJTWU5UQVhfRVhQUkVTU0lPTiIsImxhc3RJbmRleCIsInBhcnNlUnVsZVN5bnRheF90b2tlbiIsImxhc3QiLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zdWJydWxlIiwicGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzIiwicGFyc2VSdWxlU3ludGF4X2xpc3QiLCJwYXJzZVJ1bGVTeW50YXhfYWx0ZXJuYXRpdmVzIiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsInBhcnNlUnVsZVN5bnRheF9zdHJpbmciLCJzdWJzdHIiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJzbGljZSIsImluY2x1ZGVzIiwiYWx0ZXJuYXRlcyIsImdyb3VwQWx0ZXJuYXRlcyIsImdyb3VwIiwiZ3JvdXBSdWxlIiwiYWRkUnVsZSIsInRva2VucyIsImN1cnJlbnQiLCJ0b2tlbiIsInN5bWJvbCIsImxhc3RUb2tlbiIsInBvcCIsIndpbmRvdyIsIlRleHRTdHJlYW0iLCJ0ZXh0T3JQcm9wcyIsInRleHQiLCJoZWFkIiwic3Vic3RyaW5nIiwicmFuZ2UiLCJQYXJzZXIiLCJ3aGl0ZXNwYWNlIiwiZXhpc3RpbmciLCJjb25zb2xlIiwibG9nIiwicnVsZVN5bnRheCIsImUiLCJlcnJvciIsImdyb3VwRW5kIiwiYWRkU3ludGF4Iiwic3RhcnRUb2tlbiIsImVuZFRva2VuIiwibmVzdGluZyIsIm5lc3RlZCIsImlkZW50aWZpZXIiLCJjb250ZXh0IiwicmVwbGFjZSIsImFkZFN0YXRlbWVudCIsImFzc2lnbm1lbnQiLCJ2YWx1ZSIsImxpdGVyYWwiLCJzdGF0ZW1lbnQiLCJzY29wZSIsInBsdXJhbCIsInRvVXBwZXJDYXNlIiwibGlzdCIsInZhbHVlcyIsImZpcnN0IiwiZmlyc3RWYWx1ZSIsInR5cGUiLCJudW1iZXIiLCJwYXJzZUZsb2F0IiwicGFyc2VJbnQiLCJib29sIiwiYWRkRXhwcmVzc2lvbiIsImFkZE9wZXJhdG9yIiwidHJhbnNmb3JtZXIiLCJhIiwiYiIsInRoaW5nIiwibGhzIiwicmhzIiwib3BlcmF0b3IiXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxtREFBMkMsY0FBYzs7QUFFekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7O3FqQkNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBOzs7Ozs7Ozs7Ozs7SUFFcUJBLEk7QUFDcEIsZUFBWUMsVUFBWixFQUF3QjtBQUFBOztBQUN2QkMsU0FBT0MsTUFBUCxDQUFjLElBQWQsRUFBb0JGLFVBQXBCO0FBQ0E7O0FBRUQ7Ozs7O3dCQUNNRyxLLEVBQU87QUFDWixPQUFJQyxRQUFRSCxPQUFPSSxNQUFQLENBQWMsSUFBZCxDQUFaO0FBQ0FKLFVBQU9DLE1BQVAsQ0FBY0UsS0FBZCxFQUFxQkQsS0FBckI7QUFDQSxVQUFPQyxLQUFQO0FBQ0E7O0FBRUQ7QUFDQTs7Ozt5QkFDTztBQUNOLE9BQUksQ0FBQyxLQUFLRSxNQUFOLElBQWdCLEtBQUtDLFFBQUwsS0FBa0JDLFNBQXRDLEVBQ0MsTUFBTSxJQUFJQyxTQUFKLGdEQUE2RCxJQUE3RCxDQUFOO0FBQ0QsVUFBTyxLQUFLSCxNQUFMLENBQVlJLFNBQVosQ0FBc0IsS0FBS0gsUUFBM0IsQ0FBUDtBQUNBOztBQUdGO0FBQ0E7QUFDQTs7OztvQ0FFbUI7QUFDakIsVUFBTyxLQUFLSSxPQUFaO0FBQ0E7O0FBRUQ7Ozs7NkJBQ1c7QUFDVixVQUFPLEtBQUtBLE9BQVo7QUFDQTs7QUFFRjtBQUNBO0FBQ0E7Ozs7c0JBQ2dCO0FBQ2QsVUFBTyxLQUFLQyxXQUFMLENBQWlCQyxJQUF4QjtBQUNBOzs7Ozs7QUFLRjs7O2tCQTVDcUJkLEk7QUE2Q3JCQSxLQUFLZSxNQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQ0M7QUFDQTtBQUNBO0FBQ0E7QUFKRCx3QkFLT0MsTUFMUCxFQUtlVCxNQUxmLEVBS3VCO0FBQ3JCLE9BQUksQ0FBQ0EsT0FBT1UsVUFBUCxDQUFrQixLQUFLQyxNQUF2QixDQUFMLEVBQXFDLE9BQU9ULFNBQVA7QUFDckMsVUFBTyxLQUFLSixLQUFMLENBQVc7QUFDakJPLGFBQVMsS0FBS00sTUFERztBQUVqQlYsY0FBVUQsT0FBT1ksVUFBUCxHQUFvQixLQUFLRCxNQUFMLENBQVlFLE1BRnpCO0FBR2pCYjtBQUhpQixJQUFYLENBQVA7QUFLQTtBQVpGO0FBQUE7QUFBQSw2QkFjWTtBQUNWLFVBQU8sS0FBS1csTUFBWjtBQUNBO0FBaEJGOztBQUFBO0FBQUEsRUFBbUNsQixJQUFuQzs7QUFvQkE7QUFDQTtBQUNBO0FBQ0FBLEtBQUtxQixPQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSx3QkFDT0wsTUFEUCxFQUNlVCxNQURmLEVBQ3VCO0FBQ3JCLE9BQUllLFFBQVFmLE9BQU9lLEtBQVAsQ0FBYSxLQUFLQyxPQUFsQixDQUFaO0FBQ0EsT0FBSSxDQUFDRCxLQUFMLEVBQVksT0FBT2IsU0FBUDtBQUNaLFVBQU8sS0FBS0osS0FBTCxDQUFXO0FBQ2pCTyxhQUFTVSxNQUFNLENBQU4sQ0FEUTtBQUVqQmQsY0FBVUQsT0FBT1ksVUFBUCxHQUFvQkcsTUFBTSxDQUFOLEVBQVNGLE1BRnRCO0FBR2pCYjtBQUhpQixJQUFYLENBQVA7QUFLQTtBQVRGO0FBQUE7QUFBQSw2QkFXWTtBQUNWLFVBQU8sS0FBS2dCLE9BQVo7QUFDQTtBQWJGOztBQUFBO0FBQUEsRUFBcUN2QixJQUFyQzs7QUFpQkE7QUFDQTtBQUNBQSxLQUFLd0IsT0FBTDtBQUFBOztBQUNDLGtCQUFZdkIsVUFBWixFQUF3QjtBQUFBOztBQUV2QjtBQUZ1QixpSEFDakJBLFVBRGlCOztBQUd2QixNQUFJLENBQUMsT0FBS3NCLE9BQVYsRUFBbUI7QUFDbEIsT0FBSSxDQUFDLE9BQUtFLE9BQVYsRUFBbUIsTUFBTSxJQUFJZixTQUFKLENBQWMsMkJBQWQsQ0FBTjtBQUNuQixVQUFLYSxPQUFMLEdBQWUsSUFBSUcsTUFBSixPQUFlLE9BQUtELE9BQXBCLFNBQWY7QUFDQTtBQU5zQjtBQU92Qjs7QUFSRjtBQUFBO0FBQUEsNkJBVVk7QUFDVixVQUFPLEtBQUtBLE9BQVo7QUFDQTtBQVpGOztBQUFBO0FBQUEsRUFBcUN6QixLQUFLcUIsT0FBMUM7O0FBZ0JBO0FBQ0E7QUFDQXJCLEtBQUsyQixPQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSx3QkFDT1gsTUFEUCxFQUNlVCxNQURmLEVBQ3VCO0FBQ3JCLE9BQUlxQixPQUFPWixPQUFPYSxPQUFQLENBQWUsS0FBS0QsSUFBcEIsQ0FBWDtBQUNBLE9BQUksQ0FBQ0EsSUFBTCxFQUFXLE1BQU0sSUFBSUUsV0FBSix3Q0FBcUQsS0FBS2hCLElBQTFELFFBQW1FLElBQW5FLENBQU47QUFDWCxPQUFJaUIsU0FBU0gsS0FBS0ksS0FBTCxDQUFXaEIsTUFBWCxFQUFtQlQsTUFBbkIsQ0FBYjtBQUNBLE9BQUksQ0FBQ3dCLE1BQUwsRUFBYSxPQUFPdEIsU0FBUDs7QUFFYixPQUFJLEtBQUt3QixRQUFULEVBQW1CRixPQUFPRSxRQUFQLEdBQWtCLEtBQUtBLFFBQXZCO0FBQ25CLFVBQU9GLE1BQVA7QUFDQTtBQVRGO0FBQUE7QUFBQSw2QkFXWTtBQUNWLGlCQUFXLEtBQUtFLFFBQUwsR0FBZ0IsS0FBS0EsUUFBTCxHQUFjLEdBQTlCLEdBQW9DLEVBQS9DLElBQW9ELEtBQUtMLElBQXpELFVBQWlFLEtBQUtNLFFBQUwsR0FBZ0IsR0FBaEIsR0FBc0IsRUFBdkY7QUFDQTtBQWJGOztBQUFBO0FBQUEsRUFBcUNsQyxJQUFyQzs7QUFrQkE7QUFDQUEsS0FBS21DLE1BQUw7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQSxFQUFtQ25DLElBQW5DOztBQUdBO0FBQ0FBLEtBQUtvQyxRQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQ0M7QUFERCx3QkFFT3BCLE1BRlAsRUFFZVQsTUFGZixFQUV1QjtBQUNyQixPQUFJOEIsVUFBVSxFQUFkO0FBQUEsT0FBa0JDLE9BQU8vQixNQUF6QjtBQURxQjtBQUFBO0FBQUE7O0FBQUE7QUFFckIseUJBQWlCLEtBQUtnQyxLQUF0Qiw4SEFBNkI7QUFBQSxTQUFwQlgsSUFBb0I7O0FBQzVCVSxZQUFPdEIsT0FBT3dCLGFBQVAsQ0FBcUJGLElBQXJCLENBQVA7QUFDQSxTQUFJUCxTQUFTSCxLQUFLSSxLQUFMLENBQVdoQixNQUFYLEVBQW1Cc0IsSUFBbkIsQ0FBYjtBQUNBLFNBQUksQ0FBQ1AsTUFBRCxJQUFXLENBQUNILEtBQUtNLFFBQXJCLEVBQStCLE9BQU96QixTQUFQO0FBQy9CLFNBQUlzQixNQUFKLEVBQVk7QUFDWE0sY0FBUUksSUFBUixDQUFhVixNQUFiO0FBQ0FPLGFBQU9QLE9BQU9PLElBQVAsRUFBUDtBQUNBO0FBQ0Q7QUFDRDtBQVhxQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOztBQVlyQixVQUFPLEtBQUtqQyxLQUFMLENBQVc7QUFDakJnQyxvQkFEaUI7QUFFakI3QixjQUFVOEIsS0FBS25CLFVBRkU7QUFHakJaO0FBSGlCLElBQVgsQ0FBUDtBQUtBOztBQUVGO0FBQ0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUExQkQ7QUFBQTtBQUFBLG9DQTJCbUI7QUFDakIsT0FBSSxDQUFDLEtBQUs4QixPQUFWLEVBQW1CLE9BQU81QixTQUFQO0FBQ25CLE9BQUlpQyxPQUFPLEVBQVg7QUFGaUI7QUFBQTtBQUFBOztBQUFBO0FBR2pCLDBCQUFpQixLQUFLTCxPQUF0QixtSUFBK0I7QUFBQSxTQUF0QkMsSUFBc0I7O0FBQzlCLFNBQUlLLFdBQVdMLEtBQUtMLFFBQUwsSUFBaUJLLEtBQUtLLFFBQXRCLElBQWtDTCxLQUFLekIsV0FBTCxDQUFpQkMsSUFBbEU7QUFDQTtBQUNBLFNBQUlpQixTQUFVTyxnQkFBZ0J0QyxLQUFLbUMsTUFBckIsR0FBOEJHLEtBQUtNLGVBQUwsRUFBOUIsR0FBdUROLElBQXJFOztBQUVBLFNBQUlLLFlBQVlELElBQWhCLEVBQXNCO0FBQ3JCLFVBQUksQ0FBQ0csTUFBTUMsT0FBTixDQUFjSixLQUFLQyxRQUFMLENBQWQsQ0FBTCxFQUFvQ0QsS0FBS0MsUUFBTCxJQUFpQixDQUFDRCxLQUFLQyxRQUFMLENBQUQsQ0FBakI7QUFDcENELFdBQUtDLFFBQUwsRUFBZUYsSUFBZixDQUFvQlYsTUFBcEI7QUFDQSxNQUhELE1BSUs7QUFDSlcsV0FBS0MsUUFBTCxJQUFpQlosTUFBakI7QUFDQTtBQUNEO0FBZmdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBZ0JqQixVQUFPVyxJQUFQO0FBQ0E7QUE1Q0Y7QUFBQTtBQUFBLDZCQThDWTtBQUNWLGVBQVUsS0FBS0gsS0FBTCxDQUFXUSxJQUFYLENBQWdCLEdBQWhCLENBQVYsSUFBaUMsS0FBS2IsUUFBTCxHQUFnQixHQUFoQixHQUFzQixFQUF2RDtBQUNBO0FBaERGOztBQUFBO0FBQUEsRUFBdUNsQyxLQUFLbUMsTUFBNUM7O0FBb0RBO0FBQ0FuQyxLQUFLZ0QsVUFBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQTJDaEQsS0FBS29DLFFBQWhEO0FBQ0FwQyxLQUFLaUQsU0FBTDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQXlDakQsS0FBS29DLFFBQTlDOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0FwQyxLQUFLa0QsWUFBTDtBQUFBOztBQUNDLHVCQUFZOUMsS0FBWixFQUFtQjtBQUFBOztBQUFBLDJIQUNaQSxLQURZOztBQUVsQixNQUFJLENBQUMsT0FBS21DLEtBQVYsRUFBaUIsT0FBS0EsS0FBTCxHQUFhLEVBQWI7QUFGQztBQUdsQjs7QUFFRDs7O0FBTkQ7QUFBQTtBQUFBLHdCQU9PdkIsTUFQUCxFQU9lVCxNQVBmLEVBT3VCO0FBQ3JCLE9BQUk0QyxrQkFBSjtBQURxQjtBQUFBO0FBQUE7O0FBQUE7QUFFckIsMEJBQWlCLEtBQUtaLEtBQXRCLG1JQUE2QjtBQUFBLFNBQXBCWCxJQUFvQjs7QUFDNUIsU0FBSU4sUUFBUU0sS0FBS0ksS0FBTCxDQUFXaEIsTUFBWCxFQUFtQlQsTUFBbkIsQ0FBWjtBQUNBLFNBQUksQ0FBQ2UsS0FBTCxFQUFZOztBQUVaO0FBQ0EsU0FBSSxDQUFDNkIsU0FBRCxJQUFjN0IsTUFBTWQsUUFBTixHQUFpQjJDLFVBQVUzQyxRQUE3QyxFQUNDMkMsWUFBWTdCLEtBQVo7QUFDRDtBQVRvQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOztBQVVyQixPQUFJLENBQUM2QixTQUFMLEVBQWdCLE9BQU8xQyxTQUFQO0FBQ2hCLFVBQU8sS0FBS0osS0FBTCxDQUFXO0FBQ2pCTyxhQUFTdUMsU0FEUTtBQUVqQjNDLGNBQVUyQyxVQUFVM0MsUUFGSDtBQUdqQkQ7QUFIaUIsSUFBWCxDQUFQO0FBS0E7QUF2QkY7QUFBQTtBQUFBLDBCQXlCU3FCLElBekJULEVBeUJlO0FBQ2IsUUFBS1csS0FBTCxDQUFXRSxJQUFYLENBQWdCYixJQUFoQjtBQUNBO0FBM0JGO0FBQUE7QUFBQSw2QkE2Qlk7QUFDVixpQkFBVyxLQUFLSyxRQUFMLEdBQWdCLEtBQUtBLFFBQUwsR0FBYyxHQUE5QixHQUFvQyxFQUEvQyxJQUFvRCxLQUFLTSxLQUFMLENBQVdRLElBQVgsQ0FBZ0IsR0FBaEIsQ0FBcEQsVUFBNEUsS0FBS2IsUUFBTCxHQUFnQixHQUFoQixHQUFzQixFQUFsRztBQUNBO0FBL0JGOztBQUFBO0FBQUEsRUFBK0NsQyxLQUFLbUMsTUFBcEQ7O0FBb0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQW5DLEtBQUtvRCxNQUFMO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSx3QkFDT3BDLE1BRFAsRUFDZVQsTUFEZixFQUN1QjtBQUNyQixPQUFJK0IsT0FBTy9CLE1BQVg7QUFDQSxPQUFJOEIsVUFBVSxFQUFkO0FBQ0EsVUFBTyxJQUFQLEVBQWE7QUFDWkMsV0FBT3RCLE9BQU93QixhQUFQLENBQXFCRixJQUFyQixDQUFQO0FBQ0EsUUFBSVAsU0FBUyxLQUFLSCxJQUFMLENBQVVJLEtBQVYsQ0FBZ0JoQixNQUFoQixFQUF3QnNCLElBQXhCLENBQWI7QUFDQSxRQUFJLENBQUNQLE1BQUwsRUFBYTs7QUFFYk0sWUFBUUksSUFBUixDQUFhVixNQUFiO0FBQ0FPLFdBQU9QLE9BQU9PLElBQVAsRUFBUDtBQUNBOztBQUVELE9BQUlELFFBQVFqQixNQUFSLEtBQW1CLENBQXZCLEVBQTBCLE9BQU9YLFNBQVA7O0FBRTFCLFVBQU8sS0FBS0osS0FBTCxDQUFXO0FBQ2pCZ0Msb0JBRGlCO0FBRWpCN0IsY0FBVThCLEtBQUtuQixVQUZFO0FBR2pCWjtBQUhpQixJQUFYLENBQVA7QUFLQTtBQXBCRjtBQUFBO0FBQUEsNkJBc0JZO0FBQ1YsU0FBTSw2Q0FBTjtBQUNBO0FBeEJGO0FBQUE7QUFBQSw2QkEwQlk7QUFDVixlQUFVLEtBQUtxQixJQUFmLElBQXNCLEtBQUtNLFFBQUwsR0FBZ0IsR0FBaEIsR0FBc0IsR0FBNUM7QUFDQTtBQTVCRjs7QUFBQTtBQUFBLEVBQW1DbEMsS0FBS21DLE1BQXhDOztBQWdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBbkMsS0FBS3FELElBQUw7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLHdCQUNPckMsTUFEUCxFQUNlVCxNQURmLEVBQ3VCO0FBQ3JCO0FBQ0EsUUFBSytDLElBQUwsQ0FBVXBCLFFBQVYsR0FBcUIsSUFBckI7QUFDQSxRQUFLcUIsU0FBTCxDQUFlckIsUUFBZixHQUEwQixJQUExQjs7QUFFQSxPQUFJRyxVQUFVLEVBQWQ7QUFBQSxPQUFrQkMsT0FBTy9CLE1BQXpCO0FBQ0EsVUFBTyxJQUFQLEVBQWE7QUFDWjtBQUNBLFFBQUkrQyxPQUFPLEtBQUtBLElBQUwsQ0FBVXRCLEtBQVYsQ0FBZ0JoQixNQUFoQixFQUF3QnNCLElBQXhCLENBQVg7QUFDQSxRQUFJLENBQUNnQixJQUFMLEVBQVc7QUFDZDtBQUNHakIsWUFBUUksSUFBUixDQUFhYSxJQUFiO0FBQ0FoQixXQUFPZ0IsS0FBS2hCLElBQUwsRUFBUDs7QUFFQTtBQUNBLFFBQUlpQixZQUFZLEtBQUtBLFNBQUwsQ0FBZXZCLEtBQWYsQ0FBcUJoQixNQUFyQixFQUE2QnNCLElBQTdCLENBQWhCO0FBQ0EsUUFBSSxDQUFDaUIsU0FBTCxFQUFnQjtBQUNoQmpCLFdBQU9pQixVQUFVakIsSUFBVixFQUFQO0FBQ0E7O0FBRUQsVUFBTyxLQUFLakMsS0FBTCxDQUFXO0FBQ2pCZ0Msb0JBRGlCO0FBRWpCN0IsY0FBVThCLEtBQUtuQixVQUZFO0FBR2pCWjtBQUhpQixJQUFYLENBQVA7QUFLQTs7QUFFRDs7QUE1QkQ7QUFBQTtBQUFBLDBCQTZCU2lELEtBN0JULEVBNkJnQjtBQUNkLE9BQUksQ0FBQyxLQUFLbkIsT0FBVixFQUFtQixPQUFPNUIsU0FBUDtBQUNuQixVQUFPLEtBQUs0QixPQUFMLENBQWFtQixLQUFiLENBQVA7QUFDQTtBQWhDRjtBQUFBO0FBQUEsNkJBbUNZO0FBQ1YsT0FBSSxDQUFDLEtBQUtuQixPQUFWLEVBQW1CLE9BQU81QixTQUFQLENBRFQsQ0FDNEI7QUFDdEMsT0FBSTRCLFVBQVUsS0FBS0EsT0FBTCxDQUFhb0IsR0FBYixDQUFrQjtBQUFBLFdBQVUxQixPQUFPMkIsUUFBUCxFQUFWO0FBQUEsSUFBbEIsRUFBZ0RYLElBQWhELENBQXFELElBQXJELENBQWQ7QUFDQSxnQkFBV1YsT0FBWDtBQUNBO0FBdkNGO0FBQUE7QUFBQSw2QkF5Q1k7QUFDVixpQkFBVyxLQUFLSixRQUFMLEdBQWdCLEtBQUtBLFFBQUwsR0FBYyxHQUE5QixHQUFvQyxFQUEvQyxJQUFvRCxLQUFLcUIsSUFBekQsU0FBaUUsS0FBS0MsU0FBdEU7QUFDQTtBQTNDRjs7QUFBQTtBQUFBLEVBQStCdkQsSUFBL0I7O0FBa0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBRSxPQUFPQyxNQUFQLENBQWNILElBQWQsRUFBb0I7O0FBRXBCO0FBQ0E7QUFDQTs7QUFFQTtBQUNDMkQsZ0JBUG1CLDJCQU9IQyxNQVBHLEVBTzBDO0FBQUEsTUFBckNDLG1CQUFxQyx1RUFBZjdELEtBQUtvQyxRQUFVOztBQUM1RCxNQUFJMEIsZUFBZTlELEtBQUsrRCxrQkFBTCxDQUF3QkgsTUFBeEIsQ0FBbkI7QUFDQSxNQUFJckIsUUFBUXZDLEtBQUtnRSxzQkFBTCxDQUE0QkYsWUFBNUIsRUFBMEMsRUFBMUMsQ0FBWjs7QUFFQSxNQUFJbEMsYUFBSjtBQUNBO0FBQ0EsTUFBSVcsTUFBTW5CLE1BQU4sS0FBaUIsQ0FBckIsRUFBd0I7QUFDdkJRLFVBQU9XLE1BQU0sQ0FBTixDQUFQO0FBQ0EsR0FGRCxNQUdLO0FBQ0pYLFVBQU8sSUFBSWlDLG1CQUFKLENBQXdCLEVBQUV0QixZQUFGLEVBQXhCLENBQVA7QUFDQTs7QUFFRCxTQUFPWCxJQUFQO0FBQ0EsRUFyQmtCO0FBdUJuQm1DLG1CQXZCbUIsOEJBdUJBSCxNQXZCQSxFQXVCUTtBQUMxQixNQUFNSyxvQkFBb0IsMENBQTFCO0FBQ0EsTUFBSUgsZUFBZUYsT0FBT3RDLEtBQVAsQ0FBYTJDLGlCQUFiLENBQW5CO0FBQ0EsTUFBSSxDQUFDSCxZQUFMLEVBQW1CLE1BQU0sSUFBSWhDLFdBQUoseUNBQXNEOEIsTUFBdEQsUUFBTjtBQUNuQixTQUFPRSxZQUFQO0FBQ0EsRUE1QmtCO0FBOEJuQkUsdUJBOUJtQixrQ0E4QklGLFlBOUJKLEVBOEJrQnZCLEtBOUJsQixFQThCMEU7QUFBQSxNQUFqRHBCLFVBQWlELHVFQUFwQyxDQUFvQztBQUFBLE1BQWpDK0MsU0FBaUMsdUVBQXJCSixhQUFhMUMsTUFBUTs7QUFDNUYsU0FBT0QsYUFBYStDLFNBQXBCLEVBQStCO0FBQUEsK0JBQ0xsRSxLQUFLbUUscUJBQUwsQ0FBMkJMLFlBQTNCLEVBQXlDdkIsS0FBekMsRUFBZ0RwQixVQUFoRCxDQURLO0FBQUE7QUFBQSxPQUN4QlMsSUFEd0I7QUFBQSxPQUNsQnBCLFFBRGtCOztBQUU5QixPQUFJQSxZQUFZMEQsU0FBaEIsRUFDQyxNQUFNLElBQUlwQyxXQUFKLENBQWdCLGdCQUFoQixDQUFOOztBQUVELE9BQUlGLElBQUosRUFBVTtBQUNULFFBQUl3QyxPQUFPN0IsTUFBTUEsTUFBTW5CLE1BQU4sR0FBYSxDQUFuQixDQUFYO0FBQ0E7QUFDQSxRQUFJZ0QsUUFBUUEsZ0JBQWdCcEUsS0FBS2UsTUFBN0IsSUFBdUNhLGdCQUFnQjVCLEtBQUtlLE1BQWhFLEVBQXdFO0FBQ3ZFcUQsVUFBS2xELE1BQUwsSUFBZVUsS0FBS1YsTUFBcEI7QUFDQSxLQUZELE1BR0s7QUFDSnFCLFdBQU1FLElBQU4sQ0FBV2IsSUFBWDtBQUNBO0FBQ0Q7QUFDRFQsZ0JBQWFYLFdBQVcsQ0FBeEI7QUFDQTtBQUNELFNBQU8rQixLQUFQO0FBQ0EsRUFqRGtCO0FBbURuQjRCLHNCQW5EbUIsaUNBbURHTCxZQW5ESCxFQW1EaUJ2QixLQW5EakIsRUFtRHdDO0FBQUEsTUFBaEJwQixVQUFnQix1RUFBSCxDQUFHOztBQUMxRCxNQUFJa0QsY0FBY1AsYUFBYTNDLFVBQWIsQ0FBbEI7O0FBRUEsVUFBUWtELFdBQVI7QUFDQyxRQUFLLEdBQUw7QUFBVSxXQUFPckUsS0FBS3NFLHVCQUFMLENBQTZCUixZQUE3QixFQUEyQ3ZCLEtBQTNDLEVBQWtEcEIsVUFBbEQsQ0FBUDtBQUNWLFFBQUssR0FBTDtBQUFVLFdBQU9uQixLQUFLdUUsMkJBQUwsQ0FBaUNULFlBQWpDLEVBQStDdkIsS0FBL0MsRUFBc0RwQixVQUF0RCxDQUFQO0FBQ1YsUUFBSyxHQUFMO0FBQVUsV0FBT25CLEtBQUt3RSxvQkFBTCxDQUEwQlYsWUFBMUIsRUFBd0N2QixLQUF4QyxFQUErQ3BCLFVBQS9DLENBQVA7QUFDVixRQUFLLEdBQUw7QUFBVSxXQUFPbkIsS0FBS3lFLDRCQUFMLENBQWtDWCxZQUFsQyxFQUFnRHZCLEtBQWhELEVBQXVEcEIsVUFBdkQsQ0FBUDtBQUNWLFFBQUssR0FBTDtBQUNBLFFBQUssR0FBTDtBQUNBLFFBQUssR0FBTDtBQUFVLFdBQU9uQixLQUFLMEUsc0JBQUwsQ0FBNEJaLFlBQTVCLEVBQTBDdkIsS0FBMUMsRUFBaURwQixVQUFqRCxDQUFQOztBQUVWO0FBQ0EsUUFBSyxHQUFMO0FBQ0EsUUFBSyxHQUFMO0FBQ0EsUUFBSyxHQUFMO0FBQ0MsVUFBTSxJQUFJVyxXQUFKLGlCQUE4QnVDLFdBQTlCLHVCQUEyRGxELFVBQTNELFlBQTRFLEtBQUt5QyxNQUFqRixDQUFOOztBQUVEO0FBQ0MsV0FBTzVELEtBQUsyRSxzQkFBTCxDQUE0QmIsWUFBNUIsRUFBMEN2QixLQUExQyxFQUFpRHBCLFVBQWpELENBQVA7QUFoQkY7QUFrQkEsRUF4RWtCOzs7QUEwRW5CO0FBQ0E7QUFDQTtBQUNBd0QsdUJBN0VtQixrQ0E2RUliLFlBN0VKLEVBNkVrQnZCLEtBN0VsQixFQTZFeUJwQixVQTdFekIsRUE2RXFDO0FBQ3ZELE1BQUlELFNBQVM0QyxhQUFhM0MsVUFBYixDQUFiO0FBQUEsTUFBdUNTLElBQXZDO0FBQ0E7QUFDQSxNQUFJVixPQUFPSSxLQUFQLENBQWEsV0FBYixDQUFKLEVBQStCO0FBQzlCTSxVQUFPLElBQUk1QixLQUFLd0IsT0FBVCxDQUFpQixFQUFFQyxTQUFTUCxNQUFYLEVBQWpCLENBQVA7QUFDQTtBQUNEO0FBSEEsT0FJSztBQUNKVSxXQUFPLElBQUk1QixLQUFLZSxNQUFULENBQWdCLEVBQUVHLFFBQVFBLE1BQVYsRUFBaEIsQ0FBUDtBQUNBO0FBQ0EsUUFBSUEsT0FBT0QsVUFBUCxDQUFrQixJQUFsQixDQUFKLEVBQTZCO0FBQzVCO0FBQ0FXLFVBQUtWLE1BQUwsR0FBY1UsS0FBS1YsTUFBTCxDQUFZMEQsTUFBWixDQUFtQixDQUFuQixDQUFkO0FBQ0E7QUFDQWhELFVBQUtpRCxRQUFMLEdBQWdCO0FBQUEsYUFBTTNELE1BQU47QUFBQSxNQUFoQjtBQUNBO0FBQ0Q7QUFDRCxTQUFPLENBQUVVLElBQUYsRUFBUVQsVUFBUixDQUFQO0FBQ0EsRUEvRmtCOzs7QUFrR25CO0FBQ0E7QUFDQTtBQUNBO0FBQ0FvRCw0QkF0R21CLHVDQXNHU1QsWUF0R1QsRUFzR3VCdkIsS0F0R3ZCLEVBc0c4QnBCLFVBdEc5QixFQXNHMEM7QUFBQSw4QkFDbEMsaUJBQU8yRCxnQkFBUCxDQUF3QmhCLFlBQXhCLEVBQXNDLEdBQXRDLEVBQTJDLEdBQTNDLEVBQWdEM0MsVUFBaEQsQ0FEa0M7QUFBQSxNQUN0RFgsUUFEc0QseUJBQ3REQSxRQURzRDtBQUFBLE1BQzVDdUUsS0FENEMseUJBQzVDQSxLQUQ0Qzs7QUFHNUQ7OztBQUNBLE1BQUk5QyxpQkFBSjtBQUFBLE1BQWNMLGFBQWQ7QUFDQSxNQUFJbUQsTUFBTTNELE1BQU4sR0FBZSxDQUFmLElBQW9CMkQsTUFBTSxDQUFOLE1BQWEsR0FBckMsRUFBMEM7QUFDekM5QyxjQUFXOEMsTUFBTSxDQUFOLENBQVg7QUFDQUEsV0FBUUEsTUFBTUEsS0FBTixDQUFZLENBQVosQ0FBUjtBQUNBOztBQUVEO0FBQ0EsTUFBSUEsTUFBTUMsUUFBTixDQUFlLEdBQWYsQ0FBSixFQUF5QjtBQUN4QnBELFVBQU8sSUFBSTVCLEtBQUtrRCxZQUFULEVBQVA7QUFDQSxPQUFJK0IsYUFBYUMsZ0JBQWdCSCxLQUFoQixDQUFqQjtBQUZ3QjtBQUFBO0FBQUE7O0FBQUE7QUFHeEIsMEJBQWtCRSxVQUFsQixtSUFBOEI7QUFBQSxTQUFyQkUsS0FBcUI7O0FBQzdCLFNBQUk5QyxXQUFVckMsS0FBS2dFLHNCQUFMLENBQTRCbUIsS0FBNUIsRUFBbUMsRUFBbkMsQ0FBZDtBQUFBLFNBQXNEQyxrQkFBdEQ7QUFDQSxTQUFJL0MsU0FBUWpCLE1BQVIsS0FBbUIsQ0FBdkIsRUFBMEI7QUFDekJnRSxrQkFBWS9DLFNBQVEsQ0FBUixDQUFaO0FBQ0EsTUFGRCxNQUdLO0FBQ0orQyxrQkFBWSxJQUFJcEYsS0FBS29DLFFBQVQsQ0FBa0IsRUFBRUcsT0FBT0YsUUFBVCxFQUFsQixDQUFaO0FBQ0E7QUFDRFQsVUFBS3lELE9BQUwsQ0FBYUQsU0FBYjtBQUNBO0FBWnVCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFheEIsR0FiRCxNQWNLO0FBQ0osT0FBSS9DLFVBQVVyQyxLQUFLZ0Usc0JBQUwsQ0FBNEJlLEtBQTVCLEVBQW1DLEVBQW5DLENBQWQ7QUFDQTtBQUNBLE9BQUkxQyxRQUFRakIsTUFBUixLQUFtQixDQUF2QixFQUEwQjtBQUN6QlEsV0FBT1MsUUFBUSxDQUFSLENBQVA7QUFDQSxRQUFJLEVBQUVULGdCQUFnQjVCLEtBQUtrRCxZQUF2QixDQUFKLEVBQTBDdEIsS0FBS00sUUFBTCxHQUFnQixJQUFoQjtBQUMxQyxJQUhELE1BSUs7QUFDSk4sV0FBTyxJQUFJNUIsS0FBS29DLFFBQVQsQ0FBa0IsRUFBRUcsT0FBT0YsT0FBVCxFQUFsQixDQUFQO0FBQ0E7QUFDRDs7QUFFRCxNQUFJSixRQUFKLEVBQWNMLEtBQUtLLFFBQUwsR0FBZ0JBLFFBQWhCO0FBQ2QsU0FBTyxDQUFFTCxJQUFGLEVBQVFwQixRQUFSLENBQVA7O0FBRUEsV0FBUzBFLGVBQVQsQ0FBeUJJLE1BQXpCLEVBQWlDO0FBQ2hDLE9BQUlMLGFBQWEsRUFBakI7QUFDQSxPQUFJTSxVQUFVLEVBQWQ7QUFGZ0M7QUFBQTtBQUFBOztBQUFBO0FBR2hDLDBCQUFrQkQsTUFBbEIsbUlBQTBCO0FBQUEsU0FBakJFLEtBQWlCOztBQUN6QixTQUFJQSxVQUFVLEdBQWQsRUFBbUI7QUFDbEJQLGlCQUFXeEMsSUFBWCxDQUFnQjhDLE9BQWhCO0FBQ0FBLGdCQUFVLEVBQVY7QUFDQSxNQUhELE1BSUs7QUFDSkEsY0FBUTlDLElBQVIsQ0FBYStDLEtBQWI7QUFDQTtBQUNMO0FBQ0k7QUFaK0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFhaEMsT0FBSUQsUUFBUW5FLE1BQVosRUFBb0I2RCxXQUFXeEMsSUFBWCxDQUFnQjhDLE9BQWhCO0FBQ3BCLFVBQU9OLFVBQVA7QUFDQTtBQUNELEVBOUprQjs7O0FBZ0tuQjtBQUNBUCx1QkFqS21CLGtDQWlLSVosWUFqS0osRUFpS2tCdkIsS0FqS2xCLEVBaUt5QnBCLFVBakt6QixFQWlLcUM7QUFDdkQsTUFBSXNFLFNBQVMzQixhQUFhM0MsVUFBYixDQUFiO0FBQ0EsTUFBSVMsT0FBT1csTUFBTUEsTUFBTW5CLE1BQU4sR0FBZSxDQUFyQixDQUFYO0FBQ0EsTUFBSSxDQUFDUSxJQUFMLEVBQVcsTUFBTSxJQUFJRSxXQUFKLGlDQUE4QzJELE1BQTlDLHFCQUFOOztBQUVYO0FBQ0EsTUFBSUEsV0FBVyxHQUFYLElBQWtCQSxXQUFXLEdBQWpDLEVBQXNDO0FBQ3JDN0QsVUFBTyxJQUFJNUIsS0FBS29ELE1BQVQsQ0FBZ0IsRUFBRXhCLFVBQUYsRUFBaEIsQ0FBUDtBQUNBO0FBQ0FXLFNBQU1BLE1BQU1uQixNQUFOLEdBQWUsQ0FBckIsSUFBMEJRLElBQTFCO0FBQ0E7O0FBRUQ7QUFDQSxNQUFJNkQsV0FBVyxHQUFYLElBQWtCQSxXQUFXLEdBQWpDLEVBQXNDO0FBQ3JDN0QsUUFBS00sUUFBTCxHQUFnQixJQUFoQjtBQUNBOztBQUVELFNBQU8sQ0FBRXpCLFNBQUYsRUFBYVUsVUFBYixDQUFQO0FBQ0EsRUFuTGtCOzs7QUFxTG5CO0FBQ0E7QUFDQTtBQUNBbUQsd0JBeExtQixtQ0F3TEtSLFlBeExMLEVBd0xtQnZCLEtBeExuQixFQXdMMEJwQixVQXhMMUIsRUF3THNDO0FBQ3hELE1BQUlHLFFBQVEsaUJBQU93RCxnQkFBUCxDQUF3QmhCLFlBQXhCLEVBQXNDLEdBQXRDLEVBQTJDLEdBQTNDLEVBQWdEM0MsVUFBaEQsQ0FBWjtBQUNBLE1BQUljLGlCQUFKO0FBQ0EsTUFBSVgsTUFBTXlELEtBQU4sQ0FBWTNELE1BQVosS0FBdUIsQ0FBdkIsSUFBNEJFLE1BQU15RCxLQUFOLENBQVksQ0FBWixNQUFtQixHQUFuRCxFQUF3RDtBQUN2RDlDLGNBQVdYLE1BQU15RCxLQUFOLENBQVksQ0FBWixDQUFYO0FBQ0F6RCxTQUFNeUQsS0FBTixHQUFjekQsTUFBTXlELEtBQU4sQ0FBWUEsS0FBWixDQUFrQixDQUFsQixDQUFkO0FBQ0E7QUFDRCxNQUFJekQsTUFBTXlELEtBQU4sQ0FBWTNELE1BQVosR0FBcUIsQ0FBekIsRUFBNEIsTUFBTSxJQUFJVSxXQUFKLHlEQUFzRVIsTUFBTXlELEtBQU4sQ0FBWWhDLElBQVosQ0FBaUIsRUFBakIsQ0FBdEUsT0FBTjtBQUM1QixNQUFJbkIsT0FBTyxJQUFJNUIsS0FBSzJCLE9BQVQsQ0FBaUIsRUFBRUMsTUFBTU4sTUFBTXlELEtBQU4sQ0FBWSxDQUFaLENBQVIsRUFBakIsQ0FBWDtBQUNBLE1BQUk5QyxRQUFKLEVBQWNMLEtBQUtLLFFBQUwsR0FBZ0JBLFFBQWhCO0FBQ2QsU0FBTyxDQUFFTCxJQUFGLEVBQVFOLE1BQU1kLFFBQWQsQ0FBUDtBQUNBLEVBbk1rQjs7O0FBcU1uQjtBQUNBO0FBQ0E7QUFDQWdFLHFCQXhNbUIsZ0NBd01FVixZQXhNRixFQXdNZ0J2QixLQXhNaEIsRUF3TXVCcEIsVUF4TXZCLEVBd01tQztBQUFBLCtCQUMzQixpQkFBTzJELGdCQUFQLENBQXdCaEIsWUFBeEIsRUFBc0MsR0FBdEMsRUFBMkMsR0FBM0MsRUFBZ0QzQyxVQUFoRCxDQUQyQjtBQUFBLE1BQy9DWCxRQUQrQywwQkFDL0NBLFFBRCtDO0FBQUEsTUFDckN1RSxLQURxQywwQkFDckNBLEtBRHFDOztBQUdyRCxNQUFJOUMsaUJBQUo7QUFDQSxNQUFJOEMsTUFBTTNELE1BQU4sR0FBZSxDQUFmLElBQW9CMkQsTUFBTSxDQUFOLE1BQWEsR0FBckMsRUFBMEM7QUFDekM5QyxjQUFXOEMsTUFBTSxDQUFOLENBQVg7QUFDQUEsV0FBUUEsTUFBTUEsS0FBTixDQUFZLENBQVosQ0FBUjtBQUNBOztBQUVELE1BQUkxQyxVQUFVckMsS0FBS2dFLHNCQUFMLENBQTRCZSxLQUE1QixFQUFtQyxFQUFuQyxDQUFkO0FBQ0EsTUFBSTFDLFFBQVFqQixNQUFSLEtBQW1CLENBQXZCLEVBQTBCO0FBQ3pCLFNBQU0sSUFBSVUsV0FBSix3Q0FBcURpRCxNQUFNaEMsSUFBTixDQUFXLEdBQVgsQ0FBckQsT0FBTjtBQUNBO0FBQ0QsTUFBSW5CLE9BQU8sSUFBSTVCLEtBQUtxRCxJQUFULEVBQVg7QUFDQXpCLE9BQUswQixJQUFMLEdBQVlqQixRQUFRLENBQVIsQ0FBWjtBQUNBVCxPQUFLMkIsU0FBTCxHQUFpQmxCLFFBQVEsQ0FBUixDQUFqQjtBQUNBLE1BQUlKLFFBQUosRUFBY0wsS0FBS0ssUUFBTCxHQUFnQkEsUUFBaEI7QUFDZCxTQUFPLENBQUVMLElBQUYsRUFBUXBCLFFBQVIsQ0FBUDtBQUNBLEVBMU5rQjs7O0FBNE5uQjtBQUNBO0FBQ0FpRSw2QkE5Tm1CLHdDQThOVVgsWUE5TlYsRUE4TndCdkIsS0E5TnhCLEVBOE4rQnBCLFVBOU4vQixFQThOMkM7QUFBQSwrQkFDcENuQixLQUFLbUUscUJBQUwsQ0FBMkJMLFlBQTNCLEVBQXlDdkIsS0FBekMsRUFBZ0RwQixhQUFhLENBQTdELENBRG9DO0FBQUE7QUFBQSxNQUN2RFMsSUFEdUQ7QUFBQSxNQUNqRHBCLFFBRGlEOztBQUc3RDs7O0FBQ0EsTUFBSXlFLG1CQUFKO0FBQ0EsTUFBSVMsWUFBWW5ELE1BQU1vRCxHQUFOLEVBQWhCO0FBQ0EsTUFBSUQscUJBQXFCMUYsS0FBS2tELFlBQTlCLEVBQTRDO0FBQzNDK0IsZ0JBQWFTLFNBQWI7QUFDQSxHQUZELE1BR0s7QUFDSlQsZ0JBQWEsSUFBSWpGLEtBQUtrRCxZQUFULENBQXNCLEVBQUVYLE9BQU8sRUFBVCxFQUF0QixDQUFiOztBQUVBO0FBQ0EsT0FBSSxDQUFDbUQsU0FBTCxFQUNDVCxXQUFXL0MsUUFBWCxHQUFzQixJQUF0QixDQURELEtBR0MrQyxXQUFXMUMsS0FBWCxDQUFpQkUsSUFBakIsQ0FBc0JpRCxTQUF0QjtBQUNEO0FBQ0Q7QUFDQVQsYUFBVzFDLEtBQVgsQ0FBaUJFLElBQWpCLENBQXNCYixJQUF0Qjs7QUFFQTtBQUNBVyxRQUFNRSxJQUFOLENBQVd3QyxVQUFYOztBQUVBLFNBQU8sQ0FBRXhFLFNBQUYsRUFBYUQsUUFBYixDQUFQO0FBQ0E7QUF2UGtCLENBQXBCLEU7Ozs7Ozs7Ozs7Ozs7QUNwVkE7Ozs7OztBQUNBLElBQU1RLFNBQVMsc0JBQWYsQyxDQUpBO0FBQ0E7QUFDQTtrQkFHZUEsTTs7QUFFZjs7QUFDQTRFLE9BQU81RSxNQUFQLEdBQWdCQSxNQUFoQixDOzs7Ozs7Ozs7Ozs7Ozs7OztBQ1BBO0lBQ3FCNkUsVTtBQUNwQjtBQUNBLHFCQUFZQyxXQUFaLEVBQXlCO0FBQUE7O0FBQ3hCLE1BQUksT0FBT0EsV0FBUCxLQUF1QixRQUEzQixFQUNDLEtBQUtDLElBQUwsR0FBWUQsV0FBWixDQURELEtBR0M1RixPQUFPQyxNQUFQLENBQWMsSUFBZCxFQUFvQjJGLFdBQXBCOztBQUVEO0FBQ0EsTUFBSSxFQUFFLFVBQVUsSUFBWixDQUFKLEVBQXVCLEtBQUtDLElBQUwsR0FBWSxFQUFaO0FBQ3ZCLE1BQUksRUFBRSxnQkFBZ0IsSUFBbEIsQ0FBSixFQUE2QixLQUFLNUUsVUFBTCxHQUFrQixDQUFsQjtBQUM3Qjs7QUFFRDs7Ozs7d0JBQ01mLEssRUFBTztBQUNaLE9BQUlDLFFBQVEsSUFBSXdGLFVBQUosQ0FBZSxJQUFmLENBQVo7QUFDQTNGLFVBQU9DLE1BQVAsQ0FBY0UsS0FBZCxFQUFxQkQsS0FBckI7QUFDQSxVQUFPQyxLQUFQO0FBQ0E7O0FBRUQ7Ozs7NEJBQ1VjLFUsRUFBWTtBQUNyQixVQUFPLEtBQUtkLEtBQUwsQ0FBVyxFQUFFYyxzQkFBRixFQUFYLENBQVA7QUFDQTs7QUFFRDs7Ozs0QkFDVUMsTSxFQUFRO0FBQ2pCLFVBQU8sS0FBS2YsS0FBTCxDQUFXLEVBQUVjLFlBQVksS0FBS0EsVUFBTCxHQUFrQkMsTUFBaEMsRUFBWCxDQUFQO0FBQ0E7O0FBRUY7QUFDQTtBQUNBO0FBQ0E7O0FBRUM7QUFDQTtBQUNBOzs7O3dCQUNNRyxPLEVBQVM7QUFDZCxPQUFJLEVBQUVBLG1CQUFtQkcsTUFBckIsQ0FBSixFQUFrQyxNQUFNLElBQUloQixTQUFKLHVCQUFrQ2EsT0FBbEMsd0JBQU47QUFDcEM7QUFDRSxVQUFPLEtBQUt5RSxJQUFMLENBQVUxRSxLQUFWLENBQWdCQyxPQUFoQixDQUFQO0FBQ0E7Ozs2QkFFVUwsTSxFQUFRO0FBQ3BCO0FBQ0UsVUFBTyxLQUFLOEUsSUFBTCxDQUFVL0UsVUFBVixDQUFxQkMsTUFBckIsQ0FBUDtBQUNBOztBQUVEOzs7Ozs7QUFLQTswQkFDaUU7QUFBQSxPQUEzREMsVUFBMkQsdUVBQTlDLEtBQUtBLFVBQXlDO0FBQUEsT0FBN0JYLFFBQTZCLHVFQUFsQixLQUFLdUYsSUFBTCxDQUFVM0UsTUFBUTs7QUFDaEUsVUFBTyxLQUFLMkUsSUFBTCxDQUFVRSxTQUFWLENBQW9COUUsVUFBcEIsRUFBZ0NYLFFBQWhDLENBQVA7QUFDQTs7QUFFRDs7Ozs7O0FBYUE7QUFDQTtBQUNBOzZCQUNXO0FBQ1YsVUFBTyxLQUFLdUYsSUFBWjtBQUNBOzs7c0JBM0JVO0FBQ1YsVUFBTyxLQUFLRyxLQUFMLEVBQVA7QUFDQTs7O3NCQVFZO0FBQ1osVUFBTyxLQUFLSCxJQUFMLENBQVUzRSxNQUFqQjtBQUNBOztBQUVEOzs7O3NCQUNjO0FBQ2IsVUFBTyxLQUFLRCxVQUFMLEtBQW9CLEtBQUtDLE1BQWhDO0FBQ0E7Ozs7OztrQkFuRW1CeUUsVTs7Ozs7Ozs7Ozs7OztBQ0ZyQjs7OztBQUlBOztBQUNBOztBQUNBOztBQUNBOzs7Ozs7QUFKQSxpQzs7Ozs7Ozs7Ozs7Ozs7QUNIQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUE7QUFDQSxJQUFJLE9BQU9ELE1BQVAsS0FBa0IsV0FBdEIsRUFBbUM7QUFDbENBLFFBQU9DLFVBQVA7QUFDQUQsUUFBT08sTUFBUDtBQUNBUCxRQUFPNUYsSUFBUDtBQUNBNEYsUUFBTzVFLE1BQVA7QUFDQTs7a0JBRWM7QUFDZDZFLGlDQURjLEVBQ0ZNLHdCQURFLEVBQ01uRyxvQkFETixFQUNZZ0I7QUFEWixDOzs7Ozs7Ozs7Ozs7O3FqQkNiZjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOzs7O0FBQ0E7Ozs7Ozs7O0lBRXFCbUYsTTtBQUNwQixpQkFBWWxHLFVBQVosRUFBd0I7QUFBQTs7QUFDdkJDLFNBQU9DLE1BQVAsQ0FBYyxJQUFkLEVBQW9CRixVQUFwQjs7QUFFQTtBQUNBLE9BQUtzQyxLQUFMLEdBQWFyQyxPQUFPSSxNQUFQLENBQWMsS0FBS2lDLEtBQUwsSUFBYyxJQUE1QixDQUFiOztBQUVBO0FBQ0EsT0FBSzhDLE9BQUwsQ0FBYSxXQUFiLEVBQTBCLElBQUksZUFBS25DLFlBQVQsRUFBMUI7QUFDQSxPQUFLbUMsT0FBTCxDQUFhLFlBQWIsRUFBMkIsSUFBSSxlQUFLbkMsWUFBVCxFQUEzQjtBQUNBLE9BQUttQyxPQUFMLENBQWEsVUFBYixFQUF5QixJQUFJLGVBQUtuQyxZQUFULEVBQXpCO0FBQ0E7Ozs7MEJBRU9wQyxJLEVBQU07QUFDYixVQUFPLEtBQUt5QixLQUFMLENBQVd6QixJQUFYLENBQVA7QUFDQTs7QUFFRjs7QUFFQztBQUNBO0FBQ0E7Ozs7d0JBQ01BLEksRUFBTVAsTSxFQUFRO0FBQ25CLE9BQUksT0FBT0EsTUFBUCxLQUFrQixRQUF0QixFQUFnQ0EsU0FBUyx5QkFBZUEsTUFBZixDQUFUOztBQUVoQyxPQUFJcUIsT0FBTyxLQUFLQyxPQUFMLENBQWFmLElBQWIsQ0FBWDtBQUNBLE9BQUksQ0FBQ2MsSUFBTCxFQUFXLE1BQU0sSUFBSUUsV0FBSixXQUF3QmhCLElBQXhCLHNCQUErQ0EsSUFBL0MsRUFBcURQLE1BQXJELENBQU47QUFDWEEsWUFBUyxLQUFLaUMsYUFBTCxDQUFtQmpDLE1BQW5CLENBQVQ7QUFDQSxVQUFPcUIsS0FBS0ksS0FBTCxDQUFXLElBQVgsRUFBaUJ6QixNQUFqQixDQUFQO0FBQ0E7O0FBRUQ7QUFDQTtBQUNBOzs7O2dDQUNjQSxNLEVBQVE7QUFDckIsT0FBSXdCLFNBQVMsS0FBS1EsS0FBTCxDQUFXNkQsVUFBWCxDQUFzQnBFLEtBQXRCLENBQTRCLElBQTVCLEVBQWtDekIsTUFBbEMsQ0FBYjtBQUNBLFVBQU93QixTQUFTQSxPQUFPTyxJQUFQLEVBQVQsR0FBeUIvQixNQUFoQztBQUNBOztBQUVGOztBQUVDO0FBQ0E7Ozs7MEJBQ1FPLEksRUFBTWMsSSxFQUFNO0FBQ25CLE9BQUl5RSxXQUFXLEtBQUs5RCxLQUFMLENBQVd6QixJQUFYLENBQWY7QUFDQSxPQUFJdUYsUUFBSixFQUFjO0FBQ2IsUUFBSSxFQUFFQSxvQkFBb0IsZUFBS25ELFlBQTNCLENBQUosRUFBOEM7QUFDN0NvRCxhQUFRQyxHQUFSLHVCQUFnQ3pGLElBQWhDO0FBQ0F1RixnQkFBVyxJQUFJLGVBQUtuRCxZQUFULENBQXNCLEVBQUVwQyxNQUFNdUYsU0FBU3ZGLElBQWpCLEVBQXVCeUIsT0FBTyxDQUFDOEQsUUFBRCxDQUE5QixFQUF0QixDQUFYO0FBQ0EsVUFBSzlELEtBQUwsQ0FBV3pCLElBQVgsSUFBbUJ1RixRQUFuQjtBQUNBO0FBQ0RDLFlBQVFDLEdBQVIsbUJBQTRCM0UsS0FBS2UsUUFBakMsY0FBa0Q3QixJQUFsRCxVQUE2RGMsSUFBN0Q7QUFDQXlFLGFBQVNoQixPQUFULENBQWlCekQsSUFBakI7QUFDQSxJQVJELE1BU0s7QUFDSkEsU0FBS2UsUUFBTCxHQUFnQjdCLElBQWhCO0FBQ0EsU0FBS3lCLEtBQUwsQ0FBV3pCLElBQVgsSUFBbUJjLElBQW5CO0FBQ0E7QUFDRCxVQUFPQSxJQUFQO0FBQ0E7O0FBRUQ7Ozs7NkJBQ1dkLEksRUFBTVMsTyxFQUFTdEIsVSxFQUFZO0FBQ3JDLE9BQUkyQixPQUFPLElBQUksZUFBS1AsT0FBVCxDQUFpQnBCLFVBQWpCLENBQVg7QUFDQTJCLFFBQUtMLE9BQUwsR0FBZUEsT0FBZjtBQUNBLFVBQU8sS0FBSzhELE9BQUwsQ0FBYXZFLElBQWIsRUFBbUJjLElBQW5CLENBQVA7QUFDQTs7QUFFRDtBQUNBO0FBQ0E7Ozs7NEJBQ1VkLEksRUFBTTBGLFUsRUFBWXZHLFUsRUFBaUQ7QUFBQSxPQUFyQzRELG1CQUFxQyx1RUFBZixlQUFLekIsUUFBVTs7QUFDNUUsT0FBSTtBQUNILFFBQUlSLE9BQU8sZUFBSytCLGVBQUwsQ0FBcUI2QyxVQUFyQixFQUFpQzNDLG1CQUFqQyxDQUFYOztBQUVBO0FBQ0F5QyxZQUFRQyxHQUFSLGtCQUEyQnpGLElBQTNCLHFCQUErQzBGLFVBQS9DLG9CQUF3RTVFLElBQXhFOztBQUVBMUIsV0FBT0MsTUFBUCxDQUFjeUIsSUFBZCxFQUFvQjNCLFVBQXBCO0FBQ0EsV0FBTyxLQUFLb0YsT0FBTCxDQUFhdkUsSUFBYixFQUFtQmMsSUFBbkIsQ0FBUDtBQUNBLElBUkQsQ0FRRSxPQUFPNkUsQ0FBUCxFQUFVO0FBQ1hILFlBQVFuQixLQUFSLHFDQUFnRHJFLElBQWhEO0FBQ0F3RixZQUFRQyxHQUFSLGNBQXVCQyxVQUF2QjtBQUNBRixZQUFRSSxLQUFSLENBQWNELENBQWQ7QUFDQUgsWUFBUUssUUFBUjtBQUNBO0FBQ0Q7OzsrQkFFWTdGLEksRUFBTTBGLFUsRUFBWXZHLFUsRUFBWTtBQUMxQyxPQUFJMkIsT0FBTyxLQUFLZ0YsU0FBTCxDQUFlOUYsSUFBZixFQUFxQjBGLFVBQXJCLEVBQWlDdkcsVUFBakMsRUFBNkMsZUFBS2dELFNBQWxELENBQVg7QUFDQSxVQUFPLEtBQUtvQyxPQUFMLENBQWEsV0FBYixFQUEwQnpELElBQTFCLENBQVA7QUFDQTs7O2dDQUVhZCxJLEVBQU0wRixVLEVBQVl2RyxVLEVBQVk7QUFDM0MsT0FBSTJCLE9BQU8sS0FBS2dGLFNBQUwsQ0FBZTlGLElBQWYsRUFBcUIwRixVQUFyQixFQUFpQ3ZHLFVBQWpDLEVBQTZDLGVBQUsrQyxVQUFsRCxDQUFYO0FBQ0EsVUFBTyxLQUFLcUMsT0FBTCxDQUFhLFlBQWIsRUFBMkJ6RCxJQUEzQixDQUFQO0FBQ0E7Ozs4QkFFV2QsSSxFQUFNMEYsVSxFQUFZdkcsVSxFQUFZO0FBQ3pDLE9BQUkyQixPQUFPLEtBQUtnRixTQUFMLENBQWU5RixJQUFmLEVBQXFCMEYsVUFBckIsRUFBaUN2RyxVQUFqQyxDQUFYO0FBQ0EsVUFBTyxLQUFLb0YsT0FBTCxDQUFhLFVBQWIsRUFBeUJ6RCxJQUF6QixDQUFQO0FBQ0E7O0FBR0Y7QUFDQTtBQUNBO0FBQ0M7QUFDQTtBQUNBOzs7O21DQUN3QjBELE0sRUFBUXVCLFUsRUFBWUMsUSxFQUEwQjtBQUFBLE9BQWhCM0YsVUFBZ0IsdUVBQUgsQ0FBRzs7QUFDckUsT0FBSW1FLE9BQU9uRSxVQUFQLE1BQXVCMEYsVUFBM0IsRUFBdUMsTUFBTSxJQUFJL0UsV0FBSixnQkFBNkIrRSxVQUE3QixtQkFBcUQxRixVQUFyRCxnQkFBTjtBQUN2QyxPQUFJNEYsVUFBVSxDQUFkO0FBQ0EsT0FBSUMsU0FBUyxLQUFiO0FBQ0EsUUFBSyxJQUFJeEcsV0FBV1csYUFBYSxDQUE1QixFQUErQitDLFlBQVlvQixPQUFPbEUsTUFBdkQsRUFBK0RaLFdBQVcwRCxTQUExRSxFQUFxRjFELFVBQXJGLEVBQWlHO0FBQ2hHLFFBQUlnRixRQUFRRixPQUFPOUUsUUFBUCxDQUFaO0FBQ0EsUUFBSWdGLFVBQVVxQixVQUFkLEVBQTBCO0FBQ3pCRTtBQUNBQyxjQUFTLElBQVQ7QUFDQTtBQUNELFFBQUl4QixVQUFVc0IsUUFBZCxFQUF3QjtBQUN2QixTQUFJQyxZQUFZLENBQWhCLEVBQ0MsT0FBTyxFQUFFNUYsc0JBQUYsRUFBY1gsa0JBQWQsRUFBd0J1RSxPQUFPTyxPQUFPUCxLQUFQLENBQWE1RCxhQUFXLENBQXhCLEVBQTJCWCxRQUEzQixDQUEvQixFQUFxRXdHLGNBQXJFLEVBQVA7QUFDREQ7QUFDQTtBQUNEO0FBQ0QsU0FBTSxJQUFJakYsV0FBSiw4QkFBMkNnRixRQUEzQyw0QkFBMEUzRixVQUExRSxDQUFOO0FBQ0E7Ozs7OztrQkEvSG1CZ0YsTTs7Ozs7Ozs7Ozs7OztBQ1ZyQjs7OztBQUNBOzs7Ozs7Ozs7OytlQUxBO0FBQ0E7QUFDQTs7QUFLQTs7O0FBR0E7QUFDQTtBQUNBOztBQUNBLElBQUljLGFBQWEsaUJBQU81QixPQUFQLENBQWUsWUFBZixFQUE2QjtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBLEVBQThCLGVBQUtoRSxPQUFuQyxHQUE4QztBQUMzRkUsVUFBUyxlQURrRjtBQUUzRjtBQUNBbUMsV0FBVSxrQkFBU3dELE9BQVQsRUFBa0I7QUFDM0IsU0FBTyxLQUFLdEcsT0FBTCxDQUFhdUcsT0FBYixDQUFxQixLQUFyQixFQUE0QixHQUE1QixDQUFQO0FBQ0E7QUFMMEYsQ0FBOUMsQ0FBN0IsQ0FBakI7QUFPQSxpQkFBTzlCLE9BQVAsQ0FBZSxZQUFmLEVBQTZCNEIsVUFBN0IsRTs7Ozs7Ozs7Ozs7OztBQ2pCQTs7OztBQUNBOzs7Ozs7QUFDQTtBQUxBO0FBQ0E7QUFDQTs7OztBQU1BLGlCQUFPTCxTQUFQLENBQWlCLGdCQUFqQixFQUFtQyxnQ0FBbkM7O0FBRUEsaUJBQU9RLFlBQVAsQ0FDQyxrQkFERCxFQUVDLGdDQUZELEVBR0M7QUFDQzFELFNBREQsb0JBQ1V3RCxPQURWLEVBQ21CO0FBQ2pCLE1BQUl4RSxPQUFPLEtBQUtFLGVBQUwsRUFBWDtBQUNBLE1BQUlxRSxhQUFhdkUsS0FBSzJFLFVBQUwsQ0FBZ0JKLFVBQWhCLENBQTJCdkQsUUFBM0IsRUFBakI7QUFDQSxNQUFJNEQsUUFBUTVFLEtBQUsyRSxVQUFMLENBQWdCRSxPQUFoQixDQUF3QjdELFFBQXhCLEVBQVo7QUFDQSxNQUFJOEQsWUFBZVAsVUFBZixXQUErQkssS0FBL0IsTUFBSjs7QUFFQSxNQUFJRyxRQUFRL0UsS0FBSytFLEtBQUwsR0FBYS9FLEtBQUsrRSxLQUFMLENBQVcvRCxRQUFYLEVBQWIsR0FBcUMsT0FBakQ7QUFDQSxVQUFRK0QsS0FBUjtBQUNDLFFBQUssUUFBTDtBQUNDLHVCQUFpQkQsU0FBakI7O0FBRUQsUUFBSyxVQUFMO0FBQ0Msc0JBQWdCQSxTQUFoQjs7QUFFRCxRQUFLLFFBQUw7QUFDQyx1QkFBaUJBLFNBQWpCOztBQUVEO0FBQ0MsV0FBT0EsU0FBUDtBQVhGO0FBYUE7QUFyQkYsQ0FIRDs7QUE0QkE7QUFDQSxpQkFBT0osWUFBUCxDQUNDLDRCQURELEVBRUMsNENBRkQsRUFHQztBQUNDMUQsU0FERCxvQkFDVXdELE9BRFYsRUFDbUI7QUFDakIsTUFBSXhFLE9BQU8sS0FBS0UsZUFBTCxFQUFYO0FBQ0EsTUFBSXFFLGFBQWF2RSxLQUFLdUUsVUFBTCxDQUFnQnZELFFBQWhCLEVBQWpCO0FBQ0EsTUFBSWdFLFNBQVMsQ0FBQ1QsYUFBYSxTQUFkLEVBQXlCVSxXQUF6QixFQUFiO0FBQ0EsTUFBSUMsT0FBT2xGLEtBQUtrRixJQUFMLENBQVVBLElBQXJCO0FBQ0EsTUFBSUMsU0FBU0QsS0FBS2xFLFFBQUwsRUFBYjtBQUNBLE1BQUlvRSxRQUFRRixLQUFLdkYsT0FBTCxDQUFhLENBQWIsQ0FBWjtBQUNBLE1BQUkwRixhQUFhRCxRQUFRQSxNQUFNcEUsUUFBTixFQUFSLEdBQTJCLFdBQTVDOztBQUVBLFNBQU8sWUFBVWdFLE1BQVYsV0FBc0JHLE1BQXRCLHFCQUNJWixVQURKLHVCQUMrQkEsVUFEL0IsNEJBQytEQSxVQUQvRCxXQUMrRWMsVUFEL0Usd0JBRUlkLFVBRkosdUNBRWdEUyxNQUZoRCxpQ0FFa0ZULFVBRmxGLGtCQUFQO0FBR0E7QUFiRixDQUhELEU7Ozs7Ozs7Ozs7Ozs7QUNwQ0E7Ozs7QUFDQTs7Ozs7Ozs7OzsrZUFKQTtBQUNBO0FBQ0E7OztBQUlBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQSxpQkFBTzVCLE9BQVAsQ0FBZSxZQUFmLEVBQTZCO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUEsRUFBOEIsZUFBS2hFLE9BQW5DLEdBQThDLEVBQUVFLFNBQVMsTUFBWCxFQUFtQlcsVUFBVSxJQUE3QixFQUE5QyxDQUE3Qjs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFJOEYsT0FBTyxpQkFBTzNDLE9BQVAsQ0FBZSxNQUFmLEVBQXVCO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUEsRUFBd0IsZUFBS2hFLE9BQTdCLEdBQXdDO0FBQ3pFRSxVQUFTLGVBRGdFO0FBRXpFO0FBQ0FtQyxXQUFVLGtCQUFTd0QsT0FBVCxFQUFrQjtBQUMzQixTQUFPLEtBQUt0RyxPQUFMLENBQWF1RyxPQUFiLENBQXFCLEtBQXJCLEVBQTRCLEdBQTVCLENBQVA7QUFDQTtBQUx3RSxDQUF4QyxDQUF2QixDQUFYO0FBT0EsaUJBQU85QixPQUFQLENBQWUsWUFBZixFQUE2QjJDLElBQTdCOztBQUdBO0FBQ0EsSUFBSUMsU0FBUyxpQkFBTzVDLE9BQVAsQ0FBZSxRQUFmLEVBQXlCO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUEsRUFBMEIsZUFBS2hFLE9BQS9CLEdBQTBDO0FBQy9FRSxVQUFTLHVCQURzRTtBQUUvRTtBQUNBbUMsV0FBVSxrQkFBU3dELE9BQVQsRUFBa0I7QUFDM0IsU0FBT2dCLFdBQVcsS0FBS3RILE9BQWhCLEVBQXlCLEVBQXpCLENBQVA7QUFDQTtBQUw4RSxDQUExQyxDQUF6QixDQUFiO0FBT0EsaUJBQU95RSxPQUFQLENBQWUsWUFBZixFQUE2QjRDLE1BQTdCOztBQUdBO0FBQ0E7QUFDQTtBQUNBLGlCQUFPNUMsT0FBUCxDQUFlLFNBQWYsRUFBMEI7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQSxFQUEyQixlQUFLaEUsT0FBaEMsR0FBMkM7QUFDcEVFLFVBQVMsdUJBRDJEO0FBRXBFO0FBQ0FtQyxXQUFVLGtCQUFTd0QsT0FBVCxFQUFrQjtBQUMzQixTQUFPaUIsU0FBUyxLQUFLdkgsT0FBZCxFQUF1QixFQUF2QixDQUFQO0FBQ0E7QUFMbUUsQ0FBM0MsQ0FBMUI7O0FBU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJbUYsT0FBTyxpQkFBT1YsT0FBUCxDQUFlLE1BQWYsRUFBdUI7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQSxFQUF3QixlQUFLaEUsT0FBN0IsR0FBd0M7QUFDekVFLFVBQVM7QUFEZ0UsQ0FBeEMsQ0FBdkIsQ0FBWDtBQUdBLGlCQUFPOEQsT0FBUCxDQUFlLFlBQWYsRUFBNkJVLElBQTdCOztBQUdBO0FBQ0E7QUFDQSxJQUFJcUMsT0FBTyxpQkFBTy9DLE9BQVAsQ0FBZSxTQUFmLEVBQTBCO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBOztBQUFBO0FBQUEsRUFBMkIsZUFBS2hFLE9BQWhDLEdBQTJDO0FBQy9FRSxVQUFTLGtEQURzRTtBQUUvRW1DLFdBQVUsa0JBQVN3RCxPQUFULEVBQWtCO0FBQzNCLFVBQVEsS0FBS3RHLE9BQWI7QUFDQyxRQUFLLE1BQUw7QUFDQSxRQUFLLEtBQUw7QUFDQSxRQUFLLFNBQUw7QUFDQSxRQUFLLElBQUw7QUFDQyxXQUFPLElBQVA7QUFDRDtBQUNDLFdBQU8sS0FBUDtBQVBGO0FBU0E7QUFaOEUsQ0FBM0MsQ0FBMUIsQ0FBWDtBQWNBLGlCQUFPeUUsT0FBUCxDQUFlLFlBQWYsRUFBNkIrQyxJQUE3Qjs7QUFHQTtBQUNBOzs7QUFHQTtBQUNBLElBQUlSLE9BQU8saUJBQU9TLGFBQVAsQ0FDVixjQURVLEVBRVYsNkJBRlUsRUFHVjtBQUNDO0FBQ0EzRSxTQUZELG9CQUVVd0QsT0FGVixFQUVtQjtBQUNoQixTQUFPLEtBQUt0RSxlQUFMLEdBQXVCZ0YsSUFBdkIsQ0FBNEJsRSxRQUE1QixFQUFQO0FBQ0Q7QUFKRixDQUhVLENBQVgsQzs7Ozs7Ozs7Ozs7OztBQ2pGQTs7OztBQUNBOzs7Ozs7QUFFQTtBQVBBO0FBQ0E7QUFDQTs7OztBQVNBOztBQUNBLGlCQUFPNEUsV0FBUCxDQUFtQixJQUFuQixFQUF5QixJQUF6QixFQUErQjtBQUFFQyxZQUFGLHVCQUFjQyxDQUFkLEVBQWdCQyxDQUFoQixFQUFtQjtBQUFFLGVBQVdELENBQVgsWUFBbUJDLENBQW5CO0FBQXlCO0FBQTlDLENBQS9CO0FBQ0EsaUJBQU9ILFdBQVAsQ0FBbUIsUUFBbkIsRUFBNkIsUUFBN0IsRUFBdUM7QUFBRUMsWUFBRix1QkFBY0MsQ0FBZCxFQUFnQkMsQ0FBaEIsRUFBbUI7QUFBRSxlQUFXRCxDQUFYLFlBQW1CQyxDQUFuQjtBQUF5QjtBQUE5QyxDQUF2QztBQUNBLGlCQUFPSCxXQUFQLENBQW1CLFNBQW5CLEVBQThCLFdBQTlCLEVBQTJDO0FBQUVDLFlBQUYsdUJBQWNHLEtBQWQsRUFBcUJWLElBQXJCLEVBQTJCO0FBQUUsMkJBQXVCVSxLQUF2QixVQUFpQ1YsSUFBakM7QUFBMEM7QUFBdkUsQ0FBM0M7QUFDQSxpQkFBT00sV0FBUCxDQUFtQixhQUFuQixFQUFrQyxlQUFsQyxFQUFtRDtBQUFFQyxZQUFGLHVCQUFjRyxLQUFkLEVBQXFCVixJQUFyQixFQUEyQjtBQUFFLDRCQUF3QlUsS0FBeEIsVUFBa0NWLElBQWxDO0FBQTJDO0FBQXhFLENBQW5EOztBQUVBLGlCQUFPTSxXQUFQLENBQW1CLElBQW5CLEVBQXlCLHFCQUF6QixFQUFnRDtBQUFFQyxZQUFGLHVCQUFjQyxDQUFkLEVBQWdCQyxDQUFoQixFQUFtQjtBQUFFLGVBQVVELENBQVYsV0FBaUJDLENBQWpCO0FBQXVCO0FBQTVDLENBQWhEO0FBQ0EsaUJBQU9ILFdBQVAsQ0FBbUIsS0FBbkIsRUFBMEIsa0NBQTFCLEVBQThEO0FBQUVDLFlBQUYsdUJBQWNDLENBQWQsRUFBZ0JDLENBQWhCLEVBQW1CO0FBQUUsZUFBVUQsQ0FBVixZQUFrQkMsQ0FBbEI7QUFBd0I7QUFBN0MsQ0FBOUQ7QUFDQSxpQkFBT0gsV0FBUCxDQUFtQixJQUFuQixFQUF5QixrQkFBekIsRUFBNkM7QUFBRUMsWUFBRix1QkFBY0MsQ0FBZCxFQUFnQkMsQ0FBaEIsRUFBbUI7QUFBRSxlQUFVRCxDQUFWLFdBQWlCQyxDQUFqQjtBQUF1QjtBQUE1QyxDQUE3QztBQUNBLGlCQUFPSCxXQUFQLENBQW1CLEtBQW5CLEVBQTBCLCtCQUExQixFQUEyRDtBQUFFQyxZQUFGLHVCQUFjQyxDQUFkLEVBQWdCQyxDQUFoQixFQUFtQjtBQUFFLGVBQVVELENBQVYsWUFBa0JDLENBQWxCO0FBQXdCO0FBQTdDLENBQTNEOztBQUVBLGlCQUFPN0IsU0FBUCxDQUNDLHFCQURELEVBRUMsOENBRkQsRUFHQztBQUNDbEQsU0FERCxvQkFDVXdELE9BRFYsRUFDbUI7QUFDakIsTUFBSXhFLE9BQU8sS0FBS0UsZUFBTCxFQUFYO0FBQ0EsTUFBSStGLE1BQU1qRyxLQUFLaUcsR0FBTCxDQUFTakYsUUFBVCxDQUFrQndELE9BQWxCLENBQVY7QUFDQSxNQUFJMEIsTUFBTWxHLEtBQUtrRyxHQUFMLENBQVNsRixRQUFULENBQWtCd0QsT0FBbEIsQ0FBVjs7QUFFQSxNQUFJcUIsY0FBYzdGLEtBQUttRyxRQUFMLENBQWNOLFdBQWhDO0FBQ0EsTUFBSSxPQUFPQSxXQUFQLEtBQXVCLFVBQTNCLEVBQXVDO0FBQ3RDLFNBQU0sSUFBSTdILFNBQUosQ0FBYyxrREFBZCxFQUFrRWdDLElBQWxFLENBQU47QUFDQTtBQUNELFNBQU82RixZQUFZSSxHQUFaLEVBQWlCQyxHQUFqQixDQUFQO0FBQ0E7QUFYRixDQUhELEUiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBpZGVudGl0eSBmdW5jdGlvbiBmb3IgY2FsbGluZyBoYXJtb255IGltcG9ydHMgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSA1KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyB3ZWJwYWNrL2Jvb3RzdHJhcCA1ZWQ1MjQ4ZGM0ZDYwODM5ZDhiMiIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCBzdHJlYW0pYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHN0cmVhbSwgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBzdHJlYW1gXHRcdFN0cmVhbSB3aGljaCB3YXMgbWF0Y2hlZCB3aXRoIGBzdGFydEluZGV4YCBhdCB0aGUgc3RhcnQgb2YgdGhlIG1hdGNoXG4vL1x0XHRcdC0gYGVuZEluZGV4YFx0Tm9uLWluY2x1c2l2ZSBlbmQgaW5kZXggaW4gc3RyZWFtIHdoZXJlIG1hdGNoIGVuZHMuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5nYXRoZXJBcmd1bWVudHMoKWBcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZSgpYFx0XHRcdFx0UmV0dXJuIGphdmFzY3JpcHQgc291cmNlIHRvIGludGVycHJldCB0aGUgcnVsZS5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0dmFyIGNsb25lID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblx0XHRPYmplY3QuYXNzaWduKGNsb25lLCBwcm9wcyk7XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9XG5cblx0Ly8gRm9yIGEgcnVsZSBpbnN0YW5jZSBhc3NvY2lhdGVkIHdpdGggYSBzdHJlYW0sXG5cdC8vIHJldHVybiBhIG5ldyBzdHJlYW0gQUZURVIgdGhpcyBydWxlJ3MgZW5kLlxuXHRuZXh0KCkge1xuXHRcdGlmICghdGhpcy5zdHJlYW0gfHwgdGhpcy5lbmRJbmRleCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgcnVsZS5uZXh0KCkgY2FsbGVkIG9uIHJ1bGUgd2l0aG91dCBhIHN0cmVhbWAsIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzLnN0cmVhbS5hZHZhbmNlVG8odGhpcy5lbmRJbmRleCk7XG5cdH1cblxuXG4vL1xuLy8gIyMgb3V0cHV0IGFzIHNvdXJjZVxuLy9cblxuXHRnYXRoZXJBcmd1bWVudHMoKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQ7XG5cdH1cblxuLy9cbi8vICMjIGdyb3VwOiByZWZsZWN0aW9uXG4vL1xuXHRnZXQgcnVsZVR5cGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0fVxufVxuXG5cblxuLy8gUnVsZSBmb3IgbGl0ZXJhbCBzdHJpbmcgdmFsdWUsIHdoaWNoIGluY2x1ZGUgcHVuY3R1YXRpb24gc3VjaCBhcyBgKGAgZXRjLlxuUnVsZS5TdHJpbmcgPSBjbGFzcyBTdHJpbmcgZXh0ZW5kcyBSdWxlIHtcblx0Ly8gUGFyc2UgdGhpcyBydWxlIGF0IHRoZSBiZWdpbm5pbmcgb2YgYHN0cmVhbWAsIGFzc3VtaW5nIG5vIHdoaXRlc3BhY2UgYmVmb3JlLlxuXHQvLyBEZWZhdWx0IGlzIHRoYXQgYHJ1bGUuc3RyaW5nYCBpcyBsaXRlcmFsIHN0cmluZyB0byBtYXRjaC5cblx0Ly8gT24gbWF0Y2gsIHJldHVybnMgY2xvbmUgb2YgcnVsZSB3aXRoIGB2YWx1ZWAsIGBzdHJlYW1gIGFuZCBgZW5kSW5kZXhgLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICghc3RyZWFtLnN0YXJ0c1dpdGgodGhpcy5zdHJpbmcpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRoaXMuc3RyaW5nLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgdGhpcy5zdHJpbmcubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5zdHJpbmc7XG5cdH1cbn1cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vIE5PVEU6IHRoZSByZWdleCBzaG91bGQgc3RhcnQgd2l0aCBgL14uLi5gIHRvIG1hdGNoIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHR2YXIgbWF0Y2ggPSBzdHJlYW0ubWF0Y2godGhpcy5wYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IG1hdGNoWzBdLFxuXHRcdFx0ZW5kSW5kZXg6IHN0cmVhbS5zdGFydEluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoLFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5wYXR0ZXJuO1xuXHR9XG59XG5cblxuLy8gS2V5d29yZCBwYXR0ZXJuXG4vL1x0YHJ1bGUua2V5d29yZGAgaXMgdGhlIGtleXdvcmQgc3RyaW5nIHRvIG1hdGNoLlxuUnVsZS5LZXl3b3JkID0gY2xhc3MgS2V5d29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRzdXBlcihwcm9wZXJ0aWVzKTtcblx0XHQvLyBjcmVhdGUgcGF0dGVybiB3aGljaCBtYXRjaGVzIGF0IHdvcmQgYm91bmRhcnlcblx0XHRpZiAoIXRoaXMucGF0dGVybikge1xuXHRcdFx0aWYgKCF0aGlzLmtleXdvcmQpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBrZXl3b3JkIHByb3BlcnR5XCIpO1xuXHRcdFx0dGhpcy5wYXR0ZXJuID0gbmV3IFJlZ0V4cChgXiR7dGhpcy5rZXl3b3JkfVxcXFxiYCk7XG5cdFx0fVxuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMua2V5d29yZDtcblx0fVxufVxuXG5cbi8vIFN1YnJ1bGUgLS0gbmFtZSBvZiBhbm90aGVyIHJ1bGUgdG8gYmUgY2FsbGVkLlxuLy8gYHJ1bGUubmFtZWAgaXMgdGhlIG5hbWUgb2YgdGhlIHJ1bGUgaW4gYHBhcnNlci5ydWxlc2AuXG5SdWxlLlN1YnJ1bGUgPSBjbGFzcyBTdWJydWxlIGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0dmFyIHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZSh0aGlzLnJ1bGUpO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBBdHRlbXB0aW5nIHRvIHBhcnNlIHVua25vd24gcnVsZSAnJHt0aGlzLm5hbWV9J2AsIHRoaXMpO1xuXHRcdHZhciByZXN1bHQgPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKTtcblx0XHRpZiAoIXJlc3VsdCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSByZXN1bHQuYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYHske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZX19JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cblxuLy8gQWJzdHJhY3Q6ICBgTmVzdGVkYCBydWxlIC0tIGNvbXBvc2VkIG9mIGEgc2VyaWVzIG9mIG90aGVyIGBydWxlc2AuXG5SdWxlLk5lc3RlZCA9IGNsYXNzIE5lc3RlZCBleHRlbmRzIFJ1bGUge31cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaCAoYXV0by1leGNsdWRpbmcgd2hpdGVzcGFjZSkuXG5SdWxlLlNlcXVlbmNlID0gY2xhc3MgU2VxdWVuY2UgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdC8vIFRocm93cyBvZiBtYW5kYXRvcnkgcnVsZSBjYW4ndCBiZSBtYXRjaGVkLlxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCByZXN1bHRzID0gW10sIG5leHQgPSBzdHJlYW07XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gcnVsZS5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFyZXN1bHQgJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAocmVzdWx0KSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0XHRuZXh0ID0gcmVzdWx0Lm5leHQoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRyZXN1bHRzLFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vVE9ET0Ncblx0Ly8gR2F0aGVyIGFyZ3VtZW50cyBmcm9tIG91ciBwYXJzZWQgYHJlc3VsdHNgIGFycmF5LlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYHZhbHVlc2AgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGByZXN1bHRzLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYHJlc3VsdHMucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gcnVsZSB0eXBlOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdGdhdGhlckFyZ3VtZW50cygpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRsZXQgYXJncyA9IHt9O1xuXHRcdGZvciAobGV0IG5leHQgb2YgdGhpcy5yZXN1bHRzKSB7XG5cdFx0XHRsZXQgcnVsZU5hbWUgPSBuZXh0LmFyZ3VtZW50IHx8IG5leHQucnVsZU5hbWUgfHwgbmV4dC5jb25zdHJ1Y3Rvci5uYW1lO1xuXHRcdFx0Ly8gRm9yIG5lc3RlZCBydWxlcywgcmVjdXJzZSB0byBnZXQgdGhlaXIgYXJndW1lbnRzXG5cdFx0XHRsZXQgcmVzdWx0ID0gKG5leHQgaW5zdGFuY2VvZiBSdWxlLk5lc3RlZCA/IG5leHQuZ2F0aGVyQXJndW1lbnRzKCkgOiBuZXh0KTtcblxuXHRcdFx0aWYgKHJ1bGVOYW1lIGluIGFyZ3MpIHtcblx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KGFyZ3NbcnVsZU5hbWVdKSkgYXJnc1tydWxlTmFtZV0gPSBbYXJnc1tydWxlTmFtZV1dO1xuXHRcdFx0XHRhcmdzW3J1bGVOYW1lXS5wdXNoKHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0YXJnc1tydWxlTmFtZV0gPSByZXN1bHQ7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBhcmdzO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBleHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuUnVsZS5TdGF0ZW1lbnQgPSBjbGFzcyBzdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gQWx0ZXJuYXRpdmUgc3ludGF4LlxuLy8gTk9URTogQ3VycmVudGx5IHRha2VzIHRoZSBmaXJzdCB2YWxpZCBtYXRjaC5cbi8vIFRPRE86IG1hdGNoIGFsbCB2YWxpZCBhbHRlcm5hdGl2ZXNcbi8vIFRPRE86IHJlbmFtZVxuUnVsZS5BbHRlcm5hdGl2ZXMgPSBjbGFzcyBBbHRlcm5hdGl2ZXMgZXh0ZW5kcyBSdWxlLk5lc3RlZCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpO1xuXHRcdGlmICghdGhpcy5ydWxlcykgdGhpcy5ydWxlcyA9IFtdO1xuXHR9XG5cblx0Ly8gRmluZCB0aGUgTE9OR0VTVCBtYXRjaFxuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBiZXN0TWF0Y2g7XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtKTtcblx0XHRcdGlmICghbWF0Y2gpIGNvbnRpbnVlO1xuXG5cdFx0XHQvLyB0YWtlIHRoZSBsb25nZXN0IG1hdGNoXG5cdFx0XHRpZiAoIWJlc3RNYXRjaCB8fCBtYXRjaC5lbmRJbmRleCA+IGJlc3RNYXRjaC5lbmRJbmRleClcblx0XHRcdFx0YmVzdE1hdGNoID0gbWF0Y2g7XG5cdFx0fVxuXHRcdGlmICghYmVzdE1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IGJlc3RNYXRjaCxcblx0XHRcdGVuZEluZGV4OiBiZXN0TWF0Y2guZW5kSW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdGFkZFJ1bGUocnVsZSkge1xuXHRcdHRoaXMucnVsZXMucHVzaChydWxlKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5yZXN1bHRzYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRsZXQgbmV4dCA9IHN0cmVhbTtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5ydWxlLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgYnJlYWs7XG5cblx0XHRcdHJlc3VsdHMucHVzaFtyZXN1bHRdO1xuXHRcdFx0bmV4dCA9IHJlc3VsdC5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdHRvU291cmNlKCkge1xuXHRcdHRocm93IFwiRG9uJ3QgdW5kZXJzdGFuZCBob3cgdG8gc291cmNlIFJ1bGUuUmVwZWF0IVwiO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZX0ke3RoaXMub3B0aW9uYWwgPyAnKicgOiAnKyd9YDtcblx0fVxufVxuXG5cbi8vIExpc3QgbWF0Y2ggcnVsZTogICBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAuIGVnXCIgYFt7bnVtYmVyfSxdYCB0byBtYXRjaCBgMSwyLDNgXG4vL1x0YHJ1bGUuaXRlbWAgaXMgdGhlIHJ1bGUgZm9yIGVhY2ggaXRlbSxcbi8vXHRgcnVsZS5kZWxpbWl0ZXJgIGlzIHRoZSBkZWxpbWl0ZXIgYmV0d2VlbiBlYWNoIGl0ZW0uXG4vLyBcdGBydWxlLnJlc3VsdHNgIGluIHRoZSBvdXRwdXQgaXMgdGhlIGxpc3Qgb2YgdmFsdWVzLlxuLy9cbi8vXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhIExpc3QgcnVsZSB3aWxsIE5PVCByZXBlYXQgKD8/Pz8pXG5SdWxlLkxpc3QgPSBjbGFzcyBMaXN0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0dmFyIHJlc3VsdHMgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgbmV4dCk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdHJlc3VsdHMucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQpO1xuXHRcdFx0aWYgKCFkZWxpbWl0ZXIpIGJyZWFrO1xuXHRcdFx0bmV4dCA9IGRlbGltaXRlci5uZXh0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0cmVzdWx0cyxcblx0XHRcdGVuZEluZGV4OiBuZXh0LnN0YXJ0SW5kZXgsXG5cdFx0XHRzdHJlYW1cblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybiBtYXRjaGVkIGl0ZW0gYnkgaW5kZXhcblx0Z2V0SXRlbShpbmRleCkge1xuXHRcdGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLnJlc3VsdHNbaW5kZXhdO1xuXHR9XG5cblxuXHR0b1NvdXJjZSgpIHtcblx0XHRpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuIHVuZGVmaW5lZDtcdFx0Ly8gVE9ETzogdGhyb3c/Pz9cblx0XHRsZXQgcmVzdWx0cyA9IHRoaXMucmVzdWx0cy5tYXAoIHJlc3VsdCA9PiByZXN1bHQudG9Tb3VyY2UoKSApLmpvaW4oXCIsIFwiKTtcblx0XHRyZXR1cm4gYFske3Jlc3VsdHN9XWA7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYFske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMuaXRlbX0gJHt0aGlzLmRlbGltaXRlcn1dYDtcblx0fVxufTtcblxuXG5cblxuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbi8vIFRPRE86XHRVc2Uga2V5d29yZHMgaW4gc3ludGF4IHRvIG1ha2UgYSBxdWljayByZWdleC1iYXNlZCBgdGVzdGAgZnVuY3Rpb24gZm9yIHRoZSBlbnRpcmUgcnVsZVxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cbi8vIFRPRE86IGNvbnZlcnQgdG8gVGV4dFN0cmVhbSBwYXR0ZXJuIGFsYSBub3JtYWwgcGFyc2VyIG9uY2UgdGhhdCBzZXR0bGVzIGRvd24/Pz9cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHR2YXIgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggPSAwLCBsYXN0SW5kZXggPSBzeW50YXhTdHJlYW0ubGVuZ3RoKSB7XG5cdFx0d2hpbGUgKHN0YXJ0SW5kZXggPCBsYXN0SW5kZXgpIHtcblx0XHRcdGxldCBbIHJ1bGUsIGVuZEluZGV4IF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGlmIChlbmRJbmRleCA+PSBsYXN0SW5kZXgpXG5cdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihcIlBhc3QgbGFzdEluZGV4XCIpO1xuXG5cdFx0XHRpZiAocnVsZSkge1xuXHRcdFx0XHR2YXIgbGFzdCA9IHJ1bGVzW3J1bGVzLmxlbmd0aC0xXTtcblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBTdHJpbmdgIGFuZCBsYXN0IHdhcyBhIGBTdHJpbmdgLCBtZXJnZSB0b2dldGhlclxuXHRcdFx0XHRpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5TdHJpbmcgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3RyaW5nKSB7XG5cdFx0XHRcdFx0bGFzdC5zdHJpbmcgKz0gcnVsZS5zdHJpbmc7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cnVsZXMucHVzaChydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0c3RhcnRJbmRleCA9IGVuZEluZGV4ICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHZhciBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdHN3aXRjaCAoc3ludGF4VG9rZW4pIHtcblx0XHRcdGNhc2UgXCJ7XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIoXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiW1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwifFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2FsdGVybmF0aXZlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIqXCI6XG5cdFx0XHRjYXNlIFwiK1wiOlxuXHRcdFx0Y2FzZSBcIj9cIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cblx0XHRcdC8vIHRoZSBmb2xsb3dpbmcgc2hvdWxkIEFMV0FZUyBiZSBjb25zdW1lZCBieSB0aGUgYWJvdmVcblx0XHRcdGNhc2UgXCJ9XCI6XG5cdFx0XHRjYXNlIFwiKVwiOlxuXHRcdFx0Y2FzZSBcIl1cIjpcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7c3ludGF4VG9rZW59IGZvdW5kIGFzIGl0ZW0gJHtzdGFydEluZGV4fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3RyaW5nKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHR2YXIgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdLCBydWxlO1xuXHRcdC8vIElmIGxldHRlcnMgb25seSwgbWF0Y2ggYXMgYSBLZXl3b3JkIChzbyB3ZSByZXF1aXJlIGEgd29yZCBib3VuZGFyeSBhZnRlciB0aGUgc3RyaW5nKS5cblx0XHRpZiAoc3RyaW5nLm1hdGNoKC9bQS1aYS16XSsvKSkge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLktleXdvcmQoeyBrZXl3b3JkOiBzdHJpbmcgfSk7XG5cdFx0fVxuXHRcdC8vIE90aGVyd2lzZSBtYXRjaCBhcyBhIFN0cmluZywgd2hpY2ggZG9lc24ndCByZXF1aXJlIG5vbi13b3JkIGNoYXJzIGFmdGVyIHRoZSB0ZXh0LlxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlN0cmluZyh7IHN0cmluZzogc3RyaW5nIH0pO1xuXHRcdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRcdGlmIChzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIikpIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIGxlYWRpbmcgc2xhc2ggaW4gbWF0Y2ggc3RyaW5nLi4uXG5cdFx0XHRcdHJ1bGUuc3RyaW5nID0gcnVsZS5zdHJpbmcuc3Vic3RyKDEpO1xuXHRcdFx0XHQvLyBidXQgbGVhdmUgaXQgaW4gdG9TdHJpbmdcblx0XHRcdFx0cnVsZS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnRJbmRleCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdC8vIE5PVEU6IG5lc3RlZCBwYXJlbnMgbWF5IG5vdCBoYXZlIGFsdGVybmF0aXZlcy4uLiA6LSggICBgKGF8KGJ8YykpYCB3b24ndCB3b3JrPz8/XG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiKFwiLCBcIilcIiwgc3RhcnRJbmRleCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50LCBydWxlO1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0Ly8gc3BsaXQgaW50byBncm91cHMsIGluY2x1ZGluZyBuZXN0ZWQgcGFyZW5zXG5cdFx0aWYgKHNsaWNlLmluY2x1ZGVzKFwifFwiKSkge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcygpO1xuXHRcdFx0bGV0IGFsdGVybmF0ZXMgPSBncm91cEFsdGVybmF0ZXMoc2xpY2UpO1xuXHRcdFx0Zm9yIChsZXQgZ3JvdXAgb2YgYWx0ZXJuYXRlcykge1xuXHRcdFx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2Vucyhncm91cCwgW10pLCBncm91cFJ1bGU7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdGdyb3VwUnVsZSA9IHJlc3VsdHNbMF07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Z3JvdXBSdWxlID0gbmV3IFJ1bGUuU2VxdWVuY2UoeyBydWxlczogcmVzdWx0cyB9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRydWxlLmFkZFJ1bGUoZ3JvdXBSdWxlKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR2YXIgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdFx0Ly8gU2luZ2xlIHJlc3VsdCBtZWFucyBvcHRpb25hbCBleHByZXNzaW9uXG5cdFx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0cnVsZSA9IHJlc3VsdHNbMF07XG5cdFx0XHRcdGlmICghKHJ1bGUgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHJ1bGUub3B0aW9uYWwgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cblx0XHRmdW5jdGlvbiBncm91cEFsdGVybmF0ZXModG9rZW5zKSB7XG5cdFx0XHR2YXIgYWx0ZXJuYXRlcyA9IFtdO1xuXHRcdFx0dmFyIGN1cnJlbnQgPSBbXTtcblx0XHRcdGZvciAobGV0IHRva2VuIG9mIHRva2Vucykge1xuXHRcdFx0XHRpZiAodG9rZW4gPT09IFwifFwiKSB7XG5cdFx0XHRcdFx0YWx0ZXJuYXRlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBbXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdXJyZW50LnB1c2godG9rZW4pO1xuXHRcdFx0XHR9XG4vL1RPRE86IG5lc3RlZCBwYXJlbnMuLi5cblx0XHRcdH1cblx0XHRcdGlmIChjdXJyZW50Lmxlbmd0aCkgYWx0ZXJuYXRlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0cmV0dXJuIGFsdGVybmF0ZXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIHJlcGVhdCBpbmRpY2F0b3IgYD9gLCBgK2Agb3IgYCpgIGJ5IGF0dGFjaGluZyBpdCB0byB0aGUgcHJldmlvdXMgcnVsZS5cblx0cGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0dmFyIHN5bWJvbCA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblx0XHR2YXIgcnVsZSA9IHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBhdHRhY2ggcmVwZWF0IHN5bWJvbCAke3N5bWJvbH0gdG8gZW1wdHkgcnVsZSFgKTtcblxuXHRcdC8vIFRyYW5zZm9ybSBsYXN0IHJ1bGUgaW50byBhIHJlcGVhdCBmb3IgYCpgIGFuZCBgK2AuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCIqXCIgfHwgc3ltYm9sID09PSBcIitcIikge1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHQvLyBwdXNoIGludG8gcnVsZSBzdGFjayBpbiBwbGFjZSBvZiBvbGQgcnVsZVxuXHRcdFx0cnVsZXNbcnVsZXMubGVuZ3RoIC0gMV0gPSBydWxlO1xuXHRcdH1cblxuXHRcdC8vIFJ1bGUgaXMgb3B0aW9uYWwgZm9yIGA/YCBhbmQgYCpgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiP1wiIHx8IHN5bWJvbCA9PT0gXCIqXCIpIHtcblx0XHRcdHJ1bGUub3B0aW9uYWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBbIHVuZGVmaW5lZCwgc3RhcnRJbmRleCBdXG5cdH0sXG5cblx0Ly8gTWF0Y2ggYHs8cnVsZU5hbWU+fWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IG1hdGNoID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIntcIiwgXCJ9XCIsIHN0YXJ0SW5kZXgpO1xuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID09PSAzICYmIG1hdGNoLnNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBtYXRjaC5zbGljZVswXTtcblx0XHRcdG1hdGNoLnNsaWNlID0gbWF0Y2guc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPiAxKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHByb2Nlc3MgcnVsZXMgd2l0aCBtb3JlIHRoYW4gb25lIHJ1bGUgbmFtZTogeyR7bWF0Y2guc2xpY2Uuam9pbihcIlwiKX19YCk7XG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5TdWJydWxlKHsgcnVsZTogbWF0Y2guc2xpY2VbMF0gfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgbWF0Y2guZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBsaXN0IGV4cHJlc3Npb24gYFs8aXRlbT48ZGVsaW1pdGVyPl1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIltcIiwgXCJdXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHRpZiAocmVzdWx0cy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCBzdHVmZiBhdCBlbmQgb2YgbGlzdDogWyR7c2xpY2Uuam9pbihcIiBcIil9XWApO1xuXHRcdH1cblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLkxpc3QoKTtcblx0XHRydWxlLml0ZW0gPSByZXN1bHRzWzBdXG5cdFx0cnVsZS5kZWxpbWl0ZXIgPSByZXN1bHRzWzFdXG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBhbHRlcm5hdGUgYCggYSB8IGIgfCBjIClgLlxuXHQvLyBOT1RFOiB0aGlzIHNob3VsZCBvbmx5IGhhcHBlbiBpbnNpZGUgYSBncm91cC4uLlxuXHRwYXJzZVJ1bGVTeW50YXhfYWx0ZXJuYXRpdmVzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgWyBydWxlLCBlbmRJbmRleCBdID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCArIDEpO1xuXG5cdFx0Ly8gY3JlYXRlIGFsdGVybmF0ZXMgcnVsZSB3aXRoIGxhc3RUb2tlbiwgb3IgcmUtdXNlIGV4aXN0aW5nIGFsdGVybmF0ZXMgcmlsZVxuXHRcdGxldCBhbHRlcm5hdGVzO1xuXHRcdGxldCBsYXN0VG9rZW4gPSBydWxlcy5wb3AoKTtcblx0XHRpZiAobGFzdFRva2VuIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpIHtcblx0XHRcdGFsdGVybmF0ZXMgPSBsYXN0VG9rZW47XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0YWx0ZXJuYXRlcyA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVzOiBbXSB9KTtcblxuXHRcdFx0Ly8gaWYgbm8gbGFzdCBydWxlLCB3ZSBoYXZlIGEgcnVsZSBsaWtlICBgKCB8IGFiYylgIHdoaWNoIG1lYW5zIHRoYXQgdGhlIGFsdGVybmF0ZXMgaXMgb3B0aW9uYWxcblx0XHRcdGlmICghbGFzdFRva2VuKVxuXHRcdFx0XHRhbHRlcm5hdGVzLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0YWx0ZXJuYXRlcy5ydWxlcy5wdXNoKGxhc3RUb2tlbik7XG5cdFx0fVxuXHRcdC8vIGFkZCBwYXJzZWQgcnVsZSB0byB0aGUgYWx0ZXJuYXRlc3Ncblx0XHRhbHRlcm5hdGVzLnJ1bGVzLnB1c2gocnVsZSk7XG5cblx0XHQvLyBhZGQgYmFjayB0byB0aGUgZW5kIG9mIHJ1bGVzXG5cdFx0cnVsZXMucHVzaChhbHRlcm5hdGVzKTtcblxuXHRcdHJldHVybiBbIHVuZGVmaW5lZCwgZW5kSW5kZXggXTtcblx0fSxcblxuXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5jb25zdCBwYXJzZXIgPSBuZXcgUGFyc2VyKCk7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG53aW5kb3cucGFyc2VyID0gcGFyc2VyO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvX3BhcnNlci5qcyIsIlxuLy8gVE9ETzogY29udmVydCB0byBsaW5lLWF3YXJlIHN0cmVhbT8/P1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFN0cmVhbSB7XG5cdC8vIFlvdSBjYW4gY29uc3RydWN0IHdpdGggYSB0ZXh0IHN0cmluZyBvciBhIHNldCBvZiBwcm9wZXJ0aWVzIChpbmNsdWRpbmcgYHRleHRgKS5cblx0Y29uc3RydWN0b3IodGV4dE9yUHJvcHMpIHtcblx0XHRpZiAodHlwZW9mIHRleHRPclByb3BzID09PSBcInN0cmluZ1wiKVxuXHRcdFx0dGhpcy50ZXh0ID0gdGV4dE9yUHJvcHM7XG5cdFx0ZWxzZVxuXHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCB0ZXh0T3JQcm9wcyk7XG5cblx0XHQvLyBNYWtlIHN1cmUgYHRleHRgIGlzIGRlZmluZWQuXG5cdFx0aWYgKCEoXCJ0ZXh0XCIgaW4gdGhpcykpIHRoaXMudGV4dCA9IFwiXCI7XG5cdFx0aWYgKCEoXCJzdGFydEluZGV4XCIgaW4gdGhpcykpIHRoaXMuc3RhcnRJbmRleCA9IDA7XG5cdH1cblxuXHQvLyBSZXR1cm4gYW4gaW1tdXRhYmxlIGNsb25lIG9mIHRoZSBzdHJlYW0uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0bGV0IGNsb25lID0gbmV3IFRleHRTdHJlYW0odGhpcyk7XG5cdFx0T2JqZWN0LmFzc2lnbihjbG9uZSwgcHJvcHMpO1xuXHRcdHJldHVybiBjbG9uZTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2VkIHRvIG5ldyBzdGFydEluZGV4LlxuXHRhZHZhbmNlVG8oc3RhcnRJbmRleCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleCB9KTtcblx0fVxuXG5cdC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBzdHJlYW0sIGFkdmFuY2luZyBzdGFydEluZGV4IEJZIGBsZW5ndGhgXG5cdGFkdmFuY2VCeShsZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7IHN0YXJ0SW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcblx0fVxuXG4vLyBcdC8vIFJldHVybiBjbG9uZSBvZiB0aGlzIHN0cmVhbSB3aXRoIGVuZEluZGV4IHNldCB0byBzdGFydCArIGBsZW5ndGhgXG4vLyBcdGVuZEFmdGVyKGxlbmd0aCkge1xuLy8gXHRcdHJldHVybiB0aGlzLmNsb25lKHsgZW5kSW5kZXg6IHRoaXMuc3RhcnRJbmRleCArIGxlbmd0aCB9KTtcbi8vIFx0fVxuXG5cdC8vIE1hdGNoIGBwYXR0ZXJuYCBhcyByZWdleCBhdCBoZWFkIG9mIHN0cmVhbS5cblx0Ly8gTk9URTogcmVnZXhlcyBzaG91bGQgc3RhcnQgd2l0aCBgXmAhXG5cdC8vIFJldHVybnMgbWF0Y2ggb3IgdW5kZWZpbmVkLlxuXHRtYXRjaChwYXR0ZXJuKSB7XG5cdFx0aWYgKCEocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHRocm93IG5ldyBUeXBlRXJyb3IoYFRleHRTdHJlYW0ubWF0Y2goJHtwYXR0ZXJufSk6IGV4cGVjdGVkIFJlZ0V4cGApO1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5tYXRjaChwYXR0ZXJuKTtcblx0fVxuXG5cdHN0YXJ0c1dpdGgoc3RyaW5nKSB7XG4vL1RPRE86IHVzZSBgc3RyZWFtLnJhbmdlYCB0byBlbnN1cmUgbWF0Y2ggaXMgbm90IG5vdCBiZXlvbmQgYHN0cmluZy5lbmRJbmRleGBcblx0XHRyZXR1cm4gdGhpcy5oZWFkLnN0YXJ0c1dpdGgoc3RyaW5nKTtcblx0fVxuXG5cdC8vIFJldHVybiB0ZXh0IG9mIHN0cmluZyBzdGFydGluZyBhdCBvdXIgYHN0YXJ0SW5kZXhgXG5cdGdldCBoZWFkKCkge1xuXHRcdHJldHVybiB0aGlzLnJhbmdlKCk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSByYW5nZSBvZiB0aGUgc3RyaW5nIGZyb20gYHN0YXJ0SW5kZXhgIHRvIGBlbmRJbmRleGAgTk9OLWluY2x1c2l2ZS5cblx0cmFuZ2Uoc3RhcnRJbmRleCA9IHRoaXMuc3RhcnRJbmRleCwgZW5kSW5kZXggPSB0aGlzLnRleHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5zdWJzdHJpbmcoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xuXHR9XG5cblx0Ly8gTGVuZ3RoIG9mIHRoZSBzdHJlYW0uXG5cdGdldCBsZW5ndGgoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dC5sZW5ndGg7XG5cdH1cblxuXHQvLyBBcmUgd2UgYXQgdGhlIGVuZCBvZiB0aGUgc3RyZWFtP1xuXHRnZXQgaXNFbXB0eSgpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGFydEluZGV4ID09PSB0aGlzLmxlbmd0aDtcblx0fVxuXG5cblxuXG5cdC8vXG5cdC8vIyMgUmVmbGVjdGlvblxuXHQvL1xuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0XG5cdH07XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvVGV4dFN0cmVhbS5qcyIsImltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBsb2FkIHN0YW5kYXJkIHJ1bGVzIGZpbGVzIGhlcmVcbmltcG9ydCBcIi4vY29yZVwiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vYXNzaWdubWVudFwiO1xuaW1wb3J0IFwiLi9jbGFzc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vcnVsZXMvaW5kZXguanNcIjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdHdpbmRvdy5UZXh0U3RyZWFtID0gVGV4dFN0cmVhbTtcblx0d2luZG93LlBhcnNlciA9IFBhcnNlcjtcblx0d2luZG93LlJ1bGUgPSBSdWxlO1xuXHR3aW5kb3cucGFyc2VyID0gcGFyc2VyO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7XG5cdFRleHRTdHJlYW0sIFBhcnNlciwgUnVsZSwgcGFyc2VyXG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9pbmRleC5qcyIsIi8vIFNwZWxsIFwiRW5nbGlzaFwiIHBhcnNlciBzdHJhd21hblxuXG4vLyBUT0RPOlx0dGhpcyBkb2Vzbid0IHdvcmt5OiAgIGB7YX0gKGlzfGlzIG5vdCkge2J9YFxuLy8gVE9ETzpcdGN1c3RvbSBTeW50YXhFcnJvciBldGMgd2hpY2ggdW5kZXJzdGFuZCBzdHJlYW1zXG4vLyBUT0RPOlx0YnJlYWsgYGZpbGVgIGludG8gbGluZXMgYW5kIHByb2Nlc3MgZWFjaCAoaW5jbC4gc3Vic3RyL21hdGNoIG5vdCBnb2luZyBiZXlvbmQgdGhlIGVuZClcbi8vIFRPRE86XHRuZXN0aW5nIC0tIGlzIHRoaXMganVzdCBpbmRlbnQgPSBcImFkZCBibG9jayBzY29wZVwiXG4vLyBUT0RPOlx0cHJvbW90aW9uIHBhdHRlcm4gZm9yIGdhdGhlciBhcmd1bWVudHMgKGVnOiBsaXRlcmFsLWxpc3QpID8/P1xuLy8gVE9ETzpcdFdoYXQgZG9lcyBzeW50YXggdHJlZSBsb29rIGxpa2U/ICBIb3cgZG8gd2UgZXh0cmFjdCBtZWFuaW5nIG91dCBvZiB0aGUgbmVzdD9cbi8vIFRPRE86XHRSZWN5Y2xlIHdvcmQvc3RyaW5nL3BhdHRlcm4gcnVsZXMgdG8gbW9yZSBlYXNpbHkgc2VlIGNvbW1vbmFsaXR5Li4uXG4vLyBUT0RPOlx0UGFzcyBgY29udGV4dGAgdG8gdG9Tb3VyY2UoKSwgYWRkIHByb3BlcnR5IGRlc2NyaXB0b3JzIHRvIGBjbGFzc2AsIHZhcmlhYmxlcyBhbmQgY29kZSB0byBgbWV0aG9kYCwgYGdsb2JhbGAgc3R1ZmYgZXRjXG5cbmltcG9ydCBUZXh0U3RyZWFtIGZyb20gXCIuL1RleHRTdHJlYW0uanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cblx0XHQvLyBDbG9uZSBydWxlcywgc3RhcnRpbmcgd2l0aCBhIGNvbXBsZXRlbHkgZW1wdHkgbWFwIGlmIG5vdCBkZWZpbmVkIChubyBzdGFuZGFyZCBvYmplY3Qga2V5cylcblx0XHR0aGlzLnJ1bGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnJ1bGVzIHx8IG51bGwpO1xuXG5cdFx0Ly8gU2V0IHVwIHN0YW5kYXJkIHJ1bGUgY2xhc3NlcyBhcyBhbHRlcm5hdGVzXG5cdFx0dGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIG5ldyBSdWxlLkFsdGVybmF0aXZlcygpKTtcblx0XHR0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIG5ldyBSdWxlLkFsdGVybmF0aXZlcygpKTtcblx0XHR0aGlzLmFkZFJ1bGUoXCJvcGVyYXRvclwiLCBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoKSk7XG5cdH1cblxuXHRnZXRSdWxlKG5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5ydWxlc1tuYW1lXTtcblx0fVxuXG4vLyMjIyBQYXJzaW5nXG5cblx0Ly8gUGFyc2UgYG5hbWVgZCBydWxlIGF0IGhlYWQgb2YgYHN0cmVhbWAuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cblx0cGFyc2UobmFtZSwgc3RyZWFtKSB7XG5cdFx0aWYgKHR5cGVvZiBzdHJlYW0gPT09IFwic3RyaW5nXCIpIHN0cmVhbSA9IG5ldyBUZXh0U3RyZWFtKHN0cmVhbSk7XG5cblx0XHRsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShuYW1lKTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZSAke25hbWV9IG5vdCB1bmRlcnN0b29kYCwgbmFtZSwgc3RyZWFtKTtcblx0XHRzdHJlYW0gPSB0aGlzLmVhdFdoaXRlc3BhY2Uoc3RyZWFtKTtcblx0XHRyZXR1cm4gcnVsZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHR9XG5cblx0Ly8gRWF0IHdoaXRlc3BhY2UgKGFjY29yZGluZyB0byBgcnVsZXMud2hpdGVzcGFjZWApIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBuZXcgc3RyZWFtIGlmIHdlIG1hdGNoZWQgd2hpdGVzcGFjZSwgb3RoZXJ3aXNlIHRoZSBzYW1lIHN0cmVhbS5cblx0Ly8gT3RoZXJ3aXNlIHJldHVybnMgdGhpcyBzYW1lIHN0cmVhbS5cblx0ZWF0V2hpdGVzcGFjZShzdHJlYW0pIHtcblx0XHR2YXIgcmVzdWx0ID0gdGhpcy5ydWxlcy53aGl0ZXNwYWNlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdFx0cmV0dXJuIHJlc3VsdCA/IHJlc3VsdC5uZXh0KCkgOiBzdHJlYW07XG5cdH1cblxuLy8jIyMgUnVsZSBmYWN0b3JpZXNcblxuXHQvLyBBZGQgYSBydWxlIHRvIG91ciBsaXN0IG9mIHJ1bGVzIVxuXHQvLyBUT0RPOiBjb252ZXJ0IHRvIGBhbHRlcm5hdGl2ZXNgIG9uIG92ZXJ3cml0ZT9cblx0YWRkUnVsZShuYW1lLCBydWxlKSB7XG5cdFx0bGV0IGV4aXN0aW5nID0gdGhpcy5ydWxlc1tuYW1lXTtcblx0XHRpZiAoZXhpc3RpbmcpIHtcblx0XHRcdGlmICghKGV4aXN0aW5nIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBDb252ZXJ0aW5nIHJ1bGUgJyR7bmFtZX0nIHRvIGFsdGVybmF0aXZlc2ApO1xuXHRcdFx0XHRleGlzdGluZyA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IG5hbWU6IGV4aXN0aW5nLm5hbWUsIHJ1bGVzOiBbZXhpc3RpbmddIH0pO1xuXHRcdFx0XHR0aGlzLnJ1bGVzW25hbWVdID0gZXhpc3Rpbmc7XG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZyhgQWRkaW5nIHJ1bGUgJyR7cnVsZS5ydWxlTmFtZX0nIHRvICcke25hbWV9JzogYCwgcnVsZSk7XG5cdFx0XHRleGlzdGluZy5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUucnVsZU5hbWUgPSBuYW1lO1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IHJ1bGU7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cblx0Ly8gQWRkIHJlZ2V4IGFzIGEgcGF0dGVybiB0byBvdXIgbGlzdCBvZiBydWxlc1xuXHRhZGRQYXR0ZXJuKG5hbWUsIHBhdHRlcm4sIHByb3BlcnRpZXMpIHtcblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlBhdHRlcm4ocHJvcGVydGllcyk7XG5cdFx0cnVsZS5wYXR0ZXJuID0gcGF0dGVybjtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHR9XG5cblx0Ly8gUGFyc2UgYSBgcnVsZVN5bnRheGAgcnVsZSBhbmQgYWRkIGl0IHRvIG91ciBsaXN0IG9mIHJ1bGVzLlxuXHQvLyBSZXR1cm5zIHRoZSBuZXcgcnVsZS5cblx0Ly8gTG9ncyBwYXJzaW5nIGVycm9ycyBidXQgYWxsb3dzIHRoaW5ncyB0byBjb250aW51ZS5cblx0YWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3Rvcik7XG5cblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0XHRjb25zb2xlLmdyb3VwRW5kKCk7XG5cdFx0fVxuXHR9XG5cblx0YWRkU3RhdGVtZW50KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMpIHtcblx0XHR2YXIgcnVsZSA9IHRoaXMuYWRkU3ludGF4KG5hbWUsIHJ1bGVTeW50YXgsIHByb3BlcnRpZXMsIFJ1bGUuU3RhdGVtZW50KTtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHJ1bGUpO1xuXHR9XG5cblx0YWRkRXhwcmVzc2lvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0dmFyIHJ1bGUgPSB0aGlzLmFkZFN5bnRheChuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzLCBSdWxlLkV4cHJlc3Npb24pO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHJ1bGUpO1xuXHR9XG5cblx0YWRkT3BlcmF0b3IobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcykge1xuXHRcdHZhciBydWxlID0gdGhpcy5hZGRTeW50YXgobmFtZSwgcnVsZVN5bnRheCwgcHJvcGVydGllcyk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcIm9wZXJhdG9yXCIsIHJ1bGUpO1xuXHR9XG5cblxuLy9cbi8vICMjIFV0aWxpdHkgbWV0aG9kc1xuLy9cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmAuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuLy9wYXJzZXIuYWRkUGF0dGVybihcImlkZW50aWZpZXJcIiwgL15bYS16XVtcXHdcXGRcXC1fXSovKTtcbmxldCBpZGVudGlmaWVyID0gcGFyc2VyLmFkZFJ1bGUoXCJpZGVudGlmaWVyXCIsIG5ldyAoY2xhc3MgaWRlbnRpZmllciBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7XG5cdHBhdHRlcm46IC9eW2Etel1bXFx3XFwtXSovLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgaWRlbnRpZmllcik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvYXNzaWdubWVudC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVmaW5pbmcgY2xhc3NlcyAoa25vd24gYXMgYHR5cGVzYClcbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5wYXJzZXIuYWRkU3ludGF4KFwic2NvcGUtbW9kaWZpZXJcIiwgXCIoc2NvcGU6Z2xvYmFsfGNvbnN0YW50fHNoYXJlZClcIik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZS1wcm9wZXJ0eVwiLFxuXHRcIntzY29wZS1tb2RpZmllcn0/IHthc3NpZ25tZW50fVwiLFxuXHR7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGFyZ3MgPSB0aGlzLmdhdGhlckFyZ3VtZW50cygpO1xuXHRcdFx0dmFyIGlkZW50aWZpZXIgPSBhcmdzLmFzc2lnbm1lbnQuaWRlbnRpZmllci50b1NvdXJjZSgpO1xuXHRcdFx0dmFyIHZhbHVlID0gYXJncy5hc3NpZ25tZW50LmxpdGVyYWwudG9Tb3VyY2UoKTtcblx0XHRcdGxldCBzdGF0ZW1lbnQgPSBgJHtpZGVudGlmaWVyfSA9ICR7dmFsdWV9O2A7XG5cblx0XHRcdHZhciBzY29wZSA9IGFyZ3Muc2NvcGUgPyBhcmdzLnNjb3BlLnRvU291cmNlKCkgOiBcImxvY2FsXCI7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJnbG9iYWxcIjpcblx0XHRcdFx0XHRyZXR1cm4gYGdsb2JhbC4ke3N0YXRlbWVudH1gO1xuXG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHtzdGF0ZW1lbnR9YDtcblxuXHRcdFx0XHRjYXNlIFwic2hhcmVkXCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtzdGF0ZW1lbnR9YDtcblxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBzdGF0ZW1lbnQ7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZS1wcm9wZXJ0eS1hcy1vbmUtb2ZcIixcblx0XCJ7aWRlbnRpZmllcn0gYXMgb25lIG9mIHtsaXN0OmxpdGVyYWwtbGlzdH1cIixcblx0e1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBhcmdzID0gdGhpcy5nYXRoZXJBcmd1bWVudHMoKTtcblx0XHRcdGxldCBpZGVudGlmaWVyID0gYXJncy5pZGVudGlmaWVyLnRvU291cmNlKCk7XG5cdFx0XHRsZXQgcGx1cmFsID0gKGlkZW50aWZpZXIgKyBcIl9WQUxVRVNcIikudG9VcHBlckNhc2UoKTtcblx0XHRcdGxldCBsaXN0ID0gYXJncy5saXN0Lmxpc3Q7XG5cdFx0XHRsZXQgdmFsdWVzID0gbGlzdC50b1NvdXJjZSgpO1xuXHRcdFx0bGV0IGZpcnN0ID0gbGlzdC5yZXN1bHRzWzBdO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKCkgOiBcInVuZGVmaW5lZFwiO1xuXG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke3BsdXJhbH0gPSAke3ZhbHVlc307XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0geyByZXR1cm4gKFwiX18ke2lkZW50aWZpZXJ9XCIgaW4gdGhpcyA/IHRoaXMuX18ke2lkZW50aWZpZXJ9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfVxcbmA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY2xhc3MuanMiLCIvL1xuLy9cdCMgQ29yZSBgcnVsZXNgIC0tIHNpbXBsZSBkYXRhdHlwZXMsIGV0Yy5cbi8vXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vXG4vLyBSZWdleCBwYXR0ZXJuIHJ1bGVzIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9ycyBmb3IgZGVidWdnaW5nXG4vL1xuLy9wYXJzZXIuYWRkUGF0dGVybihcIndoaXRlc3BhY2VcIiwgL15cXHMrLyk7XG5wYXJzZXIuYWRkUnVsZShcIndoaXRlc3BhY2VcIiwgbmV3IChjbGFzcyB3aGl0ZXNwYWNlIGV4dGVuZHMgUnVsZS5QYXR0ZXJue30pKHsgcGF0dGVybjogL15cXHMrLywgb3B0aW9uYWw6IHRydWUgfSkpO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG4vL3BhcnNlci5hZGRQYXR0ZXJuKFwidHlwZW5hbWVcIiwgL15bQS1aXVtcXHdcXGRcXC1fXSovKTtcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoXCJUeXBlXCIsIG5ldyAoY2xhc3MgVHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7XG5cdHBhdHRlcm46IC9eW0EtWl1bXFx3XFwtXSovLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgdHlwZSk7XG5cblxuLy8gYG51bWJlcmAgYXMgZWl0aGVyIGZsb2F0IG9yIGludGVnZXIsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbmxldCBudW1iZXIgPSBwYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgKGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7XG5cdHBhdHRlcm46IC9eLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIG51bWJlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHJldHVybiBwYXJzZUZsb2F0KHRoaXMubWF0Y2hlZCwgMTApO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgbnVtYmVyKTtcblxuXG4vLyBOdW1lcmljIGBpbnRlZ2VyYCBvbmx5LCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBOT1RFOiB0aGlzIFdJTEwgbWF0Y2ggYSBmbG9hdCwgYnV0IHRoZSByZXR1cm5lZCB2YWx1ZSB3aWxsIGNvZXJjZSB0byBhbiBpbnRlZ2VyLlxuLy8gUkVWSUVXOiBpcyB0aGlzIHJpZ2h0PyAgQmV0dGVyIHRvIG5vdCBtYXRjaCBhIGZsb2F0P1xucGFyc2VyLmFkZFJ1bGUoXCJpbnRlZ2VyXCIsIG5ldyAoY2xhc3MgaW50ZWdlciBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7XG5cdHBhdHRlcm46IC9eLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xubGV0IHRleHQgPSBwYXJzZXIuYWRkUnVsZShcInRleHRcIiwgbmV3IChjbGFzcyB0ZXh0IGV4dGVuZHMgUnVsZS5QYXR0ZXJue30pKHtcblx0cGF0dGVybjogL14oPzpcIlteXCJdKlwifCdbXiddKicpL1xufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHRleHQpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cbmxldCBib29sID0gcGFyc2VyLmFkZFJ1bGUoXCJib29sZWFuXCIsIG5ldyAoY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybnt9KSh7XG5cdHBhdHRlcm46IC9eKHRydWV8ZmFsc2V8eWVzfG5vfHN1Y2Nlc3N8ZmFpbHVyZXxva3xjYW5jZWwpXFxiLyxcblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0Y2FzZSBcInRydWVcIjpcblx0XHRcdGNhc2UgXCJ5ZXNcIjpcblx0XHRcdGNhc2UgXCJzdWNjZXNzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgYm9vbCk7XG5cblxuLy8gTGl0ZXJhbCB2YWx1ZSBhcyBudW1iZXIsIHRleHQgb3IgYm9vbGVhbi5cbi8vcGFyc2VyLmFkZEV4cHJlc3Npb24oXCJsaXRlcmFsXCIsIFwiKGxpdGVyYWw6e251bWJlcn18e3RleHR9fHtib29sZWFufSlcIik7XG5cblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxubGV0IGxpc3QgPSBwYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsLWxpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdHtcblx0XHQvLyByZXR1cm4ganVzdCB0aGUgbGlzdCBhcyBvdXIgc291cmNlXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuIFx0XHRcdHJldHVybiB0aGlzLmdhdGhlckFyZ3VtZW50cygpLmxpc3QudG9Tb3VyY2UoKTtcblx0XHR9XG5cdH1cbik7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9jb3JlLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5cbi8vIHJlLWV4cG9ydCBwYXJzZXIgZm9yIHRlc3RpbmcuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy8gYG9wZXJhdG9yLnRyYW5zZm9ybWVyYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgdHdvIGFyZ3VtZW50cyAoYGxoc2AgYW5kIGByaHNgKSBpbnRvIG91dHB1dC5cbnBhcnNlci5hZGRPcGVyYXRvcihcImlzXCIsIFwiaXNcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuIGAoJHthfSAhPSAke2J9KWAgfX0pO1xucGFyc2VyLmFkZE9wZXJhdG9yKFwiaXMtbm90XCIsIFwiaXMgbm90XCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybiBgKCR7YX0gIT0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRPcGVyYXRvcihcInR5cGUtb2ZcIiwgXCJpcyAoYXxhbilcIiwgeyB0cmFuc2Zvcm1lcih0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLnR5cGVvZigke3RoaW5nfSwgJHt0eXBlfSlgIH19KTtcbnBhcnNlci5hZGRPcGVyYXRvcihcIm5vdC10eXBlLW9mXCIsIFwiaXMgbm90IChhfGFuKVwiLCB7IHRyYW5zZm9ybWVyKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLnR5cGVvZigke3RoaW5nfSwgJHt0eXBlfSlgIH19KTtcblxucGFyc2VyLmFkZE9wZXJhdG9yKFwiZ3RcIiwgXCIoPnxpcyBncmVhdGVyIHRoYW4pXCIsIHsgdHJhbnNmb3JtZXIoYSxiKSB7IHJldHVybmAoJHthfSA+ICR7Yn0pYCB9fSk7XG5wYXJzZXIuYWRkT3BlcmF0b3IoXCJndGVcIiwgXCIoPj18aXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH19KTtcbnBhcnNlci5hZGRPcGVyYXRvcihcImx0XCIsIFwiKDx8aXMgbGVzcyB0aGFuKVwiLCB7IHRyYW5zZm9ybWVyKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfX0pO1xucGFyc2VyLmFkZE9wZXJhdG9yKFwibHRlXCIsIFwiKDw9fGlzIGxlc3MgdGhhbiBvciBlcXVhbCB0bylcIiwgeyB0cmFuc2Zvcm1lcihhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9fSk7XG5cbnBhcnNlci5hZGRTeW50YXgoXG5cdFwib3BlcmF0b3ItZXhwcmVzc2lvblwiLFxuXHRcIntsaHM6ZXhwcmVzc2lvbn0ge29wZXJhdG9yfSB7cmhzOmV4cHJlc3Npb259XCIsXG5cdHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgYXJncyA9IHRoaXMuZ2F0aGVyQXJndW1lbnRzKCk7XG5cdFx0XHRsZXQgbGhzID0gYXJncy5saHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgcmhzID0gYXJncy5yaHMudG9Tb3VyY2UoY29udGV4dCk7XG5cblx0XHRcdGxldCB0cmFuc2Zvcm1lciA9IGFyZ3Mub3BlcmF0b3IudHJhbnNmb3JtZXI7XG5cdFx0XHRpZiAodHlwZW9mIHRyYW5zZm9ybWVyICE9PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkICd0cmFuc2Zvcm1lcicgYXJndW1lbnQgdG8gYmUgYSBmdW5jdGlvblwiLCBhcmdzKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0cmFuc2Zvcm1lcihsaHMsIHJocyk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyJdLCJzb3VyY2VSb290IjoiIn0=