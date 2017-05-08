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
/******/ 	return __webpack_require__(__webpack_require__.s = 43);
/******/ })
/************************************************************************/
/******/ ({

/***/ 11:
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


var _global = __webpack_require__(21);

var _global2 = _interopRequireDefault(_global);

var _Parser = __webpack_require__(16);

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

/***/ 16:
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

var _TextStream = __webpack_require__(28);

var _TextStream2 = _interopRequireDefault(_TextStream);

var _Rule = __webpack_require__(11);

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

/***/ 17:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _RuleSyntax = __webpack_require__(8);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser = __webpack_require__(7);

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
_parser2.default.addRule("whitespace", new _RuleSyntax2.default.Whitespace({ pattern: /\s+/ }));

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
_parser2.default.rules.identifier.addToBlacklist("about", "above", "after", "and", "as", "at", "before", "behind", "below", "beneath", "beside", "between", "beyond", "by", "defined", "down", "during", "each", "empty", "exactly", "except", "for", "from", "greater", "I", "in", "into", "less", "long", "me", "minus", "more", "near", "not", "of", "off", "on", "onto", "opposite", "out", "outside", "over", "short", "since", "than", "the", "then", "through", "thru", "to", "toward", "towards", "undefined", "under", "underneath", "unique", "until", "up", "upon", "upside", "versus", "vs", "where", "with", "within", "without");

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
// NOTE: you can also use `one`...`ten` as strings.
_RuleSyntax2.default.Number = function (_Rule$Pattern6) {
	_inherits(number, _Rule$Pattern6);

	function number() {
		_classCallCheck(this, number);

		return _possibleConstructorReturn(this, (number.__proto__ || Object.getPrototypeOf(number)).apply(this, arguments));
	}

	return number;
}(_RuleSyntax2.default.Pattern);
_parser2.default.addRule("number", new _RuleSyntax2.default.Number({
	pattern: /(-?([0-9]*[.])?[0-9]+|one|two|three|four|five|six|seven|eight|nine|ten)/,
	// Convert to number on source output.
	toSource: function toSource(context) {
		var number = parseFloat(this.matched, 10);
		if (!isNaN(number)) return number;

		switch (this.matched) {
			case "one":
				return 1;
			case "two":
				return 2;
			case "three":
				return 3;
			case "four":
				return 4;
			case "five":
				return 5;
			case "six":
				return 6;
			case "seven":
				return 7;
			case "eight":
				return 8;
			case "nine":
				return 9;
			case "ten":
				return 10;
		}
	}
}));
_parser2.default.addRule("expression", _parser2.default.rules.number);

// Add number words to identifier blacklist.
_parser2.default.rules.identifier.addToBlacklist("one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten");

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

/***/ 21:
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
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(70)))

/***/ }),

/***/ 28:
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

/***/ 29:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.pluralize = pluralize;
exports.isPlural = isPlural;
exports.singularize = singularize;
exports.isSingular = isSingular;

var _global = __webpack_require__(21);

var _global2 = _interopRequireDefault(_global);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Return the plural of `word`.
// NOTE: this is not very good at all!!!
// TODO: exceptions, etc.
function pluralize(word) {
	return word + "s";
}

// Return true if word is a plural.
// NOTE: for words which are BOTH singular and plural, this will return true.
function isPlural(word) {
	return word === pluralize(word);
}

// Return the singular of `word`.
// NOTE: this is not very good at all!!!
// TODO: exceptions, etc.
function singularize(word) {
	return word.replace(/e?s$/, "");
}

// Return true if word is a singular.
// NOTE: for words which are BOTH singular and plural, this will return true.
function isSingular(word) {
	return word === singularize(word);
}

// Export all as a lump
var allExports = _extends({}, exports);
exports.default = allExports;

// DEBUG: put on global for debugging.

_global2.default.STRING = allExports;

/***/ }),

/***/ 42:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _parser = __webpack_require__(7);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(17);

__webpack_require__(46);

__webpack_require__(47);

__webpack_require__(45);

__webpack_require__(48);

__webpack_require__(49);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _parser2.default;

// load standard rules files here

/***/ }),

/***/ 43:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _TextStream = __webpack_require__(28);

var _TextStream2 = _interopRequireDefault(_TextStream);

var _Parser = __webpack_require__(16);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(11);

var _Rule2 = _interopRequireDefault(_Rule);

__webpack_require__(8);

var _index = __webpack_require__(42);

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

/***/ 44:
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

/***/ 45:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Rule = __webpack_require__(11);

var _Rule2 = _interopRequireDefault(_Rule);

var _parser = __webpack_require__(7);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(17);

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

/***/ 46:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _string = __webpack_require__(29);

var _Rule = __webpack_require__(11);

var _Rule2 = _interopRequireDefault(_Rule);

var _parser = __webpack_require__(7);

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for dealing with lists
//

// TODO: confirm identifiers are plural in some of the below?
// TODO: `list.clone()` to return new list of same type.

// re-export parser for testing.
exports.default = _parser2.default;

// WORKING FROM OTHER RULES (testme)
//	`the length of <list>`
//	`<thing> is not? in <list>`
//	`<list> is not? empty`
//	`set item 1 of myList to 'a'`


// TODO: 	`create list with <exp>, <exp>, <exp>`
// TODO:	`duplicate list`
// TODO:	`duplicate list with <exp>, <exp>, <exp>` ???
// TODO:	`the size of <list>` => will map to `list.size`...
//				- install `size` as an alias to `length`?
// TODO:	`move <thing> to end of <list>` ???
// TODO:	`Set` for a unique list?
// TODO:	typed list?
// TODO:	list which won't take null/undefined


// Return the length of the list.
//TESTME

_parser2.default.addExpression("list_length", "the? number of {identifier} in {list:expression}", function (_Rule$Sequence) {
	_inherits(list_length, _Rule$Sequence);

	function list_length() {
		_classCallCheck(this, list_length);

		return _possibleConstructorReturn(this, (list_length.__proto__ || Object.getPrototypeOf(list_length)).apply(this, arguments));
	}

	_createClass(list_length, [{
		key: "toSource",
		value: function toSource(context) {
			var _results = this.results,
			    list = _results.list,
			    identifier = _results.identifier;

			list = list.toSource(context);
			identifier = identifier.toSource(context);
			return list + ".length";
		}
	}]);

	return list_length;
}(_Rule2.default.Sequence));

// Return the first position of specified item in the list as an array.
// If item is not found, returns `undefined`.
// NOTE: this position returned is **1-based**.
//TESTME
_parser2.default.addExpression("list_position", "the? position of {thing:expression} in {list:expression}", function (_Rule$Sequence2) {
	_inherits(list_position, _Rule$Sequence2);

	function list_position() {
		_classCallCheck(this, list_position);

		return _possibleConstructorReturn(this, (list_position.__proto__ || Object.getPrototypeOf(list_position)).apply(this, arguments));
	}

	_createClass(list_position, [{
		key: "toSource",
		value: function toSource(context) {
			var _results2 = this.results,
			    thing = _results2.thing,
			    list = _results2.list;

			thing = thing.toSource(context);
			list = list.toSource(context);
			return "spell.positionOf(" + thing + ", " + list + ")";
		}
	}]);

	return list_position;
}(_Rule2.default.Sequence));

//
//	Ordinal numbers (first, second, last, etc).
// TODO: sixty-fifth, two hundred forty ninth...
//

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

// treat list as a stack or queue
//TESTME
_parser2.default.addKeyword("ordinal", "top", ordinal, { toSource: function toSource() {
		return 1;
	} });
_parser2.default.addKeyword("ordinal", "bottom", ordinal, { toSource: function toSource() {
		return -1;
	} });

// Index expression: numeric position in some list.
//	e.g.	`card 1 of the pile`
//			`card #2 of the pile`
//			`the first card of the pile`
//
// NOTE: Negative numeric positions come from the END of the list.
//	e.g.	`card -1 of the pile`
//
// NOTE: Our positions are **1-based** and Javascript is **0-based**.
//		 e.g. `item 1 of the array`  = `array[0]`
//
// TODO: if `identifier` is "word", output `getWord()` etc
_parser2.default.addExpression("position_expression", ["{identifier} (#)?{position:expression} of (the?) {expression}", "the {position:ordinal} {identifier} of (the?) {expression}"], function (_Rule$Expression) {
	_inherits(position_expression, _Rule$Expression);

	function position_expression() {
		_classCallCheck(this, position_expression);

		return _possibleConstructorReturn(this, (position_expression.__proto__ || Object.getPrototypeOf(position_expression)).apply(this, arguments));
	}

	_createClass(position_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _results3 = this.results,
			    identifier = _results3.identifier,
			    position = _results3.position,
			    expression = _results3.expression;

			expression = expression.toSource(context);
			position = position.toSource(context);

			// If we got a positive number literal, compensate for JS 0-based arrays now,
			// for nicer output.
			if (typeof position === "number" && position > 0) {
				return expression + "[" + (position - 1) + "]";
			}
			return "spell.getItem(" + expression + ", " + position + ")";

			// This is safer, but using the above sometimes for demo purposes
			//		return `spell.getItem(${expression}, ${position})`;
		}
	}]);

	return position_expression;
}(_Rule2.default.Expression));

// Pick a SINGLE random item from the list.
// TODO: confirm identifier is plural?
//TESTME
_parser2.default.addExpression("random_position_expression", "a random {identifier} (of|from|in) (the)? {list:expression}", function (_Rule$Expression2) {
	_inherits(random_position_expression, _Rule$Expression2);

	function random_position_expression() {
		_classCallCheck(this, random_position_expression);

		return _possibleConstructorReturn(this, (random_position_expression.__proto__ || Object.getPrototypeOf(random_position_expression)).apply(this, arguments));
	}

	_createClass(random_position_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var list = this.results.list;

			list = list.toSource(context);
			return "spell.getRandomItemOf(" + list + ")";
		}
	}]);

	return random_position_expression;
}(_Rule2.default.Expression));

// Pick a unique set of random items from the list, returning an array.
// TODO: `two random items...`
// TODO: confirm identifier is plural?
// TODO: `list.clone()` to return new list of same type.
//TESTME
_parser2.default.addExpression("random_positions_expression", "{number} random {identifier} (of|from|in) (the)? {list:expression}", function (_Rule$Expression3) {
	_inherits(random_positions_expression, _Rule$Expression3);

	function random_positions_expression() {
		_classCallCheck(this, random_positions_expression);

		return _possibleConstructorReturn(this, (random_positions_expression.__proto__ || Object.getPrototypeOf(random_positions_expression)).apply(this, arguments));
	}

	_createClass(random_positions_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _results4 = this.results,
			    number = _results4.number,
			    list = _results4.list;

			number = number.toSource(context);
			list = list.toSource(context);
			return "spell.getRandomItemsOf(" + list + ", " + number + ")";
		}
	}]);

	return random_positions_expression;
}(_Rule2.default.Expression));

// Range expression.
// Returns a new list.
// NOTE: `start` is **1-based**.
// NOTE: `end` is inclusive!
// TODO: confirm identifier is plural?
// TODO: `list.clone()` to return new list of same type.
//TESTME
_parser2.default.addExpression("range_expression", "{identifier} {start:expression} to {end:expression} of {list:expression}", function (_Rule$Expression4) {
	_inherits(range_expression, _Rule$Expression4);

	function range_expression() {
		_classCallCheck(this, range_expression);

		return _possibleConstructorReturn(this, (range_expression.__proto__ || Object.getPrototypeOf(range_expression)).apply(this, arguments));
	}

	_createClass(range_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _results5 = this.results,
			    start = _results5.start,
			    end = _results5.end,
			    list = _results5.list;

			start = start.toSource(context);
			end = end.toSource(context);
			list = list.toSource(context);
			return "spell.getRange(" + list + ", " + start + ", " + end + ")";
		}
	}]);

	return range_expression;
}(_Rule2.default.Expression));

// Starting range expression.
// Returns a new list.
// e.g.	`first 4 items of list`
//TESTME
_parser2.default.addExpression("range_expression", "first {number:expression} {identifier} (in|of) {list:expression}", function (_Rule$Expression5) {
	_inherits(range_expression, _Rule$Expression5);

	function range_expression() {
		_classCallCheck(this, range_expression);

		return _possibleConstructorReturn(this, (range_expression.__proto__ || Object.getPrototypeOf(range_expression)).apply(this, arguments));
	}

	_createClass(range_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _results6 = this.results,
			    number = _results6.number,
			    list = _results6.list;

			number = number.toSource(context);
			list = list.toSource(context);
			return "spell.getRange(" + list + ", 1, " + number + ")";
		}
	}]);

	return range_expression;
}(_Rule2.default.Expression));

// Ending range expression.
// Returns a new list.
// e.g.	`last 4 items of list`
//TESTME
_parser2.default.addExpression("range_expression", "last {number:expression} {identifier} (in|of) {list:expression}", function (_Rule$Expression6) {
	_inherits(range_expression, _Rule$Expression6);

	function range_expression() {
		_classCallCheck(this, range_expression);

		return _possibleConstructorReturn(this, (range_expression.__proto__ || Object.getPrototypeOf(range_expression)).apply(this, arguments));
	}

	_createClass(range_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _results7 = this.results,
			    number = _results7.number,
			    list = _results7.list;

			number = number.toSource(context);
			list = list.toSource(context);
			return "spell.getEndRange(" + list + ", 1, " + number + ")";
		}
	}]);

	return range_expression;
}(_Rule2.default.Expression));

// Range expression starting at some item in the list.
// Returns a new list.
// If item is not found, returns an empty list. (???)
//TESTME
_parser2.default.addExpression("range_expression", "{identifier} (in|of) {list:expression} starting with {thing:expression}", function (_Rule$Expression7) {
	_inherits(range_expression, _Rule$Expression7);

	function range_expression() {
		_classCallCheck(this, range_expression);

		return _possibleConstructorReturn(this, (range_expression.__proto__ || Object.getPrototypeOf(range_expression)).apply(this, arguments));
	}

	_createClass(range_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _results8 = this.results,
			    thing = _results8.thing,
			    list = _results8.list;

			thing = thing.toSource(context);
			list = list.toSource(context);
			return "spell.getRange(" + list + ", spell.positionOf(" + thing + ", " + list + "))";
		}
	}]);

	return range_expression;
}(_Rule2.default.Expression));

// List filter.
// NOTE: we will singularize `identifier` and use that as the argument to `expression`.
//TESTME
_parser2.default.addExpression("list_filter", "{identifier} (in|of) {list:expression} where {condition:expression}", function (_Rule$Expression8) {
	_inherits(list_filter, _Rule$Expression8);

	function list_filter() {
		_classCallCheck(this, list_filter);

		return _possibleConstructorReturn(this, (list_filter.__proto__ || Object.getPrototypeOf(list_filter)).apply(this, arguments));
	}

	_createClass(list_filter, [{
		key: "toSource",
		value: function toSource(context) {
			var _results9 = this.results,
			    identifier = _results9.identifier,
			    condition = _results9.condition,
			    list = _results9.list;

			condition = condition.toSource(context);
			list = list.toSource(context);
			// use singular of identifier for method argument
			var argument = (0, _string.singularize)(identifier.toSource(context));
			return "spell.filter(" + list + ", " + argument + " => " + condition + ")";
		}
	}]);

	return list_filter;
}(_Rule2.default.Expression));

// Set membership.
// NOTE: we will singularize `identifier` and use that as the argument to `expression`.
//TESTME
_parser2.default.addExpression("list_membership_test", "{list:expression} (operator:has|has no|doesnt have|does not have) {identifier} where {filter:expression}", function (_Rule$Expression9) {
	_inherits(list_membership_test, _Rule$Expression9);

	function list_membership_test() {
		_classCallCheck(this, list_membership_test);

		return _possibleConstructorReturn(this, (list_membership_test.__proto__ || Object.getPrototypeOf(list_membership_test)).apply(this, arguments));
	}

	_createClass(list_membership_test, [{
		key: "toSource",
		value: function toSource(context) {
			var _results10 = this.results,
			    identifier = _results10.identifier,
			    operator = _results10.operator,
			    filter = _results10.filter,
			    list = _results10.list;

			filter = filter.toSource(context);
			list = list.toSource(context);
			operator = operator.toSource(context) === "has" ? "" : "!";
			// use singular of identifier for method argument
			var argument = (0, _string.singularize)(identifier.toSource(context));
			return operator + "spell.any(" + list + ", " + argument + " => " + filter + ")";
		}
	}]);

	return list_membership_test;
}(_Rule2.default.Expression));

//
//	Adding to list (in-place)
//

// Add to end of list.
//TESTME
_parser2.default.addStatement("list_append", ["append {thing:expression} to {list:expression}", "add {thing:expression} to ((the?) end of)? {list:expression}"], function (_Rule$Statement) {
	_inherits(list_append, _Rule$Statement);

	function list_append() {
		_classCallCheck(this, list_append);

		return _possibleConstructorReturn(this, (list_append.__proto__ || Object.getPrototypeOf(list_append)).apply(this, arguments));
	}

	_createClass(list_append, [{
		key: "toSource",
		value: function toSource(context) {
			var _results11 = this.results,
			    thing = _results11.thing,
			    list = _results11.list;

			thing = thing.toSource(context);
			list = list.toSource(context);
			return "spell.append(" + list + ", " + thing + ")";
		}
	}]);

	return list_append;
}(_Rule2.default.Statement));

// Add to beginning of list.
//TESTME
_parser2.default.addStatement("list_prepend", ["prepend {thing:expression} to {list:expression}", "add {thing:expression} before {list:expression}", "add {thing:expression} to the (start|front|top) of {list:expression}"], function (_Rule$Statement2) {
	_inherits(list_prepend, _Rule$Statement2);

	function list_prepend() {
		_classCallCheck(this, list_prepend);

		return _possibleConstructorReturn(this, (list_prepend.__proto__ || Object.getPrototypeOf(list_prepend)).apply(this, arguments));
	}

	_createClass(list_prepend, [{
		key: "toSource",
		value: function toSource(context) {
			var _results12 = this.results,
			    thing = _results12.thing,
			    list = _results12.list;

			thing = thing.toSource(context);
			list = list.toSource(context);
			return "spell.prepend(" + list + ", " + thing + ")";
		}
	}]);

	return list_prepend;
}(_Rule2.default.Statement));

// Add to middle of list, pushing existing items out of the way.
//TESTME
_parser2.default.addStatement("list_splice", "add {thing:expression} to {list:expression} at position {position:expression}", function (_Rule$Statement3) {
	_inherits(list_splice, _Rule$Statement3);

	function list_splice() {
		_classCallCheck(this, list_splice);

		return _possibleConstructorReturn(this, (list_splice.__proto__ || Object.getPrototypeOf(list_splice)).apply(this, arguments));
	}

	_createClass(list_splice, [{
		key: "toSource",
		value: function toSource(context) {
			var _results13 = this.results,
			    thing = _results13.thing,
			    position = _results13.position,
			    list = _results13.list;

			thing = thing.toSource(context);
			position = position.toSource(context);
			list = list.toSource(context);
			return "spell.splice(" + list + ", " + position + ", " + thing + ")";
		}
	}]);

	return list_splice;
}(_Rule2.default.Statement));

// Add to middle of list, pushing existing items out of the way.
//TESTME
_parser2.default.addStatement("list_add_after", "add {thing:expression} to {list:expression} after {item:expression}", function (_Rule$Statement4) {
	_inherits(list_splice, _Rule$Statement4);

	function list_splice() {
		_classCallCheck(this, list_splice);

		return _possibleConstructorReturn(this, (list_splice.__proto__ || Object.getPrototypeOf(list_splice)).apply(this, arguments));
	}

	_createClass(list_splice, [{
		key: "toSource",
		value: function toSource(context) {
			var _results14 = this.results,
			    thing = _results14.thing,
			    item = _results14.item,
			    list = _results14.list;

			thing = thing.toSource(context);
			item = item.toSource(context);
			list = list.toSource(context);
			return "spell.splice(" + list + ", spell.positionOf(" + list + ", " + item + "), " + thing + ")";
		}
	}]);

	return list_splice;
}(_Rule2.default.Statement));

//
//	Removing from list (in-place)
//

// Empty list.
//TODO: make `empty` and/or `clear` a generic statement???
//TESTME
_parser2.default.addStatement("list_empty", "(empty|clear) {list:expression}", function (_Rule$Expression10) {
	_inherits(list_empty, _Rule$Expression10);

	function list_empty() {
		_classCallCheck(this, list_empty);

		return _possibleConstructorReturn(this, (list_empty.__proto__ || Object.getPrototypeOf(list_empty)).apply(this, arguments));
	}

	_createClass(list_empty, [{
		key: "toSource",
		value: function toSource(context) {
			var list = this.results.list;

			list = list.toSource(context);
			return "spell.clear(" + list + ")";
		}
	}]);

	return list_empty;
}(_Rule2.default.Expression));

// Remove one item from list by position.
//TESTME
_parser2.default.addStatement("list_remove_position", "remove {identifier} {number:expression} of {list:expression}", function (_Rule$Expression11) {
	_inherits(list_remove_position, _Rule$Expression11);

	function list_remove_position() {
		_classCallCheck(this, list_remove_position);

		return _possibleConstructorReturn(this, (list_remove_position.__proto__ || Object.getPrototypeOf(list_remove_position)).apply(this, arguments));
	}

	_createClass(list_remove_position, [{
		key: "toSource",
		value: function toSource(context) {
			var _results15 = this.results,
			    number = _results15.number,
			    list = _results15.list;

			number = number.toSource(context);
			list = list.toSource(context);
			return "spell.removeItem(" + list + ", " + number + ")";
		}
	}]);

	return list_remove_position;
}(_Rule2.default.Expression));

// Remove range of things from list.
// NOTE: `start` is **1-based**.
// NOTE: `end` is inclusive!
//TESTME
_parser2.default.addStatement("list_remove_range", "remove {identifier} {start:expression} to {end:expression} of {list:expression}", function (_Rule$Expression12) {
	_inherits(list_remove_position, _Rule$Expression12);

	function list_remove_position() {
		_classCallCheck(this, list_remove_position);

		return _possibleConstructorReturn(this, (list_remove_position.__proto__ || Object.getPrototypeOf(list_remove_position)).apply(this, arguments));
	}

	_createClass(list_remove_position, [{
		key: "toSource",
		value: function toSource(context) {
			var _results16 = this.results,
			    start = _results16.start,
			    end = _results16.end,
			    list = _results16.list;

			start = start.toSource(context);
			end = end.toSource(context);
			list = list.toSource(context);
			return "spell.removeRange(" + list + ", " + start + ", " + end + ")";
		}
	}]);

	return list_remove_position;
}(_Rule2.default.Expression));

// Remove all instances of something from a list.
//TESTME
_parser2.default.addStatement("list_remove", "remove {thing:expression} from {list:expression}", function (_Rule$Expression13) {
	_inherits(list_remove, _Rule$Expression13);

	function list_remove() {
		_classCallCheck(this, list_remove);

		return _possibleConstructorReturn(this, (list_remove.__proto__ || Object.getPrototypeOf(list_remove)).apply(this, arguments));
	}

	_createClass(list_remove, [{
		key: "toSource",
		value: function toSource(context) {
			var _results17 = this.results,
			    thing = _results17.thing,
			    list = _results17.list;

			thing = thing.toSource(context);
			list = list.toSource(context);
			return "spell.remove(" + list + ", " + thing + ")";
		}
	}]);

	return list_remove;
}(_Rule2.default.Expression));

// Remove all items from list where condition is true.
// NOTE: we will singularize `identifier` and use that as the argument to `expression`.
//TESTME
_parser2.default.addStatement("list_remove_where", "remove {identifier} (in|of|from) {list:expression} where {condition:expression}", function (_Rule$Expression14) {
	_inherits(list_remove_where, _Rule$Expression14);

	function list_remove_where() {
		_classCallCheck(this, list_remove_where);

		return _possibleConstructorReturn(this, (list_remove_where.__proto__ || Object.getPrototypeOf(list_remove_where)).apply(this, arguments));
	}

	_createClass(list_remove_where, [{
		key: "toSource",
		value: function toSource(context) {
			var _results18 = this.results,
			    identifier = _results18.identifier,
			    condition = _results18.condition,
			    list = _results18.list;

			condition = condition.toSource(context);
			list = list.toSource(context);
			// use singular of identifier for method argument
			var argument = (0, _string.singularize)(identifier.toSource(context));
			return "spell.removeWhere(" + list + ", " + argument + " => " + condition + ")";
		}
	}]);

	return list_remove_where;
}(_Rule2.default.Expression));

//
//	Random (in-place) list manipulation.
//

// Reverse list in-place.
//TESTME
_parser2.default.addStatement("list_reverse", "reverse {list:expression}", function (_Rule$Expression15) {
	_inherits(list_reverse, _Rule$Expression15);

	function list_reverse() {
		_classCallCheck(this, list_reverse);

		return _possibleConstructorReturn(this, (list_reverse.__proto__ || Object.getPrototypeOf(list_reverse)).apply(this, arguments));
	}

	_createClass(list_reverse, [{
		key: "toSource",
		value: function toSource(context) {
			var list = this.results.list;

			list = list.toSource(context);
			return "spell.reverse(" + list + ")";
		}
	}]);

	return list_reverse;
}(_Rule2.default.Expression));

// Randomize list in-place.
//TESTME
_parser2.default.addStatement("list_randomize", "randomize {list:expression}", function (_Rule$Expression16) {
	_inherits(list_randomize, _Rule$Expression16);

	function list_randomize() {
		_classCallCheck(this, list_randomize);

		return _possibleConstructorReturn(this, (list_randomize.__proto__ || Object.getPrototypeOf(list_randomize)).apply(this, arguments));
	}

	_createClass(list_randomize, [{
		key: "toSource",
		value: function toSource(context) {
			var list = this.results.list;

			list = list.toSource(context);
			return "spell.randomize(" + list + ")";
		}
	}]);

	return list_randomize;
}(_Rule2.default.Expression));

/***/ }),

/***/ 47:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _RuleSyntax = __webpack_require__(8);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser = __webpack_require__(7);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(17);

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

/***/ 48:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _RuleSyntax = __webpack_require__(8);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser = __webpack_require__(7);

var _parser2 = _interopRequireDefault(_parser);

__webpack_require__(17);

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

/***/ 49:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _global = __webpack_require__(21);

var _global2 = _interopRequireDefault(_global);

var _string = __webpack_require__(29);

var _RuleSyntax = __webpack_require__(8);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _parser2 = __webpack_require__(7);

var _parser3 = _interopRequireDefault(_parser2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for defining classes (known as `types`)
//


// re-export parser for testing.
exports.default = _parser3.default;

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
			var plural = (0, _string.pluralize)(identifier);

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

/***/ 7:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Parser = __webpack_require__(16);

var _Parser2 = _interopRequireDefault(_Parser);

var _RuleSyntax = __webpack_require__(8);

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

/***/ 70:
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

/***/ 8:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _memoize = __webpack_require__(44);

var _Parser = __webpack_require__(16);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(11);

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
	// If more than one keyword appears in a row, combines them into a single `Keyword` object.
	// This is pretty safe, unless you have an optional keyword like
	//		`the {identifier} of the? {expression}`
	// in which case you can put the optional keyword in parens
	//		`the {identifier} of (the?) {expression}`
	//
	// Returns `[ rule, endIndex ]`
	// Throws if invalid.
	parseRuleSyntax_keyword: function parseRuleSyntax_keyword(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var constructor = arguments[3];

		var words = [],
		    endIndex = void 0;
		// eat keywords while they last
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
			var _this = this;

			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Sequence;
			var properties = arguments[3];

			// Add a bunch of syntaxes at once if we got an array of syntaxes
			if (Array.isArray(ruleSyntax)) return ruleSyntax.forEach(function (syntax) {
				return _this.addSequence(name, syntax, constructor, properties);
			});

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
			var _this2 = this;

			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Statement;
			var properties = arguments[3];

			// Add a bunch of syntaxes at once if we got an array of syntaxes
			if (Array.isArray(ruleSyntax)) return ruleSyntax.forEach(function (syntax) {
				return _this2.addStatement(name, syntax, constructor, properties);
			});

			var rule = this.addSequence(name, ruleSyntax, constructor, properties);
			if (rule) return this.addRule("statement", rule);
		} },

	addExpression: { value: function value(name, ruleSyntax) {
			var _this3 = this;

			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Expression;
			var properties = arguments[3];

			// Add a bunch of syntaxes at once if we got an array of syntaxes
			if (Array.isArray(ruleSyntax)) return ruleSyntax.forEach(function (syntax) {
				return _this3.addExpression(name, syntax, constructor, properties);
			});

			var rule = this.addSequence(name, ruleSyntax, constructor, properties);
			if (rule) return this.addRule("expression", rule);
		} },

	addList: { value: function value(name, ruleSyntax) {
			var _this4 = this;

			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.List;
			var properties = arguments[3];

			// Add a bunch of syntaxes at once if we got an array of syntaxes
			if (Array.isArray(ruleSyntax)) return ruleSyntax.forEach(function (syntax) {
				return _this4.addList(name, syntax, constructor, properties);
			});

			var stream = _Rule2.default.tokeniseRuleSyntax(ruleSyntax);
			var rule = (_Rule2.default.parseRuleSyntax_list(stream, [], 0, constructor) || [])[0];
			if (!rule) return;
			if (properties) Object.assign(rule, properties);
			return this.addRule(name, rule);
		} },

	addKeyword: { value: function value(name, ruleSyntax) {
			var _this5 = this;

			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Keyword;
			var properties = arguments[3];

			// Add a bunch of syntaxes at once if we got an array of syntaxes
			if (Array.isArray(ruleSyntax)) return ruleSyntax.forEach(function (syntax) {
				return _this5.addKeyword(name, syntax, constructor, properties);
			});

			var stream = _Rule2.default.tokeniseRuleSyntax(ruleSyntax);
			var rule = (_Rule2.default.parseRuleSyntax_keyword(stream, [], 0, constructor) || [])[0];
			if (!rule) return;
			if (properties) Object.assign(rule, properties);
			return this.addRule(name, rule);
		} },

	addSymbol: { value: function value(name, ruleSyntax) {
			var _this6 = this;

			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Symbol;
			var properties = arguments[3];

			// Add a bunch of syntaxes at once if we got an array of syntaxes
			if (Array.isArray(ruleSyntax)) return ruleSyntax.forEach(function (syntax) {
				return _this6.addSymbol(name, syntax, constructor, properties);
			});

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
			var _this7 = this;

			if (Array.isArray(ruleSyntax)) {
				return ruleSyntax.forEach(function (syntax) {
					return _this7.addPostfixOperator(name, syntax, properties);
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

/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgMGE0NGNkYzcyOGNhNDE5YWUwYTI/NjM1ZiIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcz83MjRkIiwid2VicGFjazovLy8uL3NyYy9QYXJzZXIuanM/ZDVlZiIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvY29yZS5qcz9lMDc1Iiwid2VicGFjazovLy8uL3NyYy91dGlscy9nbG9iYWwuanM/MDVmNSIsIndlYnBhY2s6Ly8vLi9zcmMvVGV4dFN0cmVhbS5qcz8yYzQ2Iiwid2VicGFjazovLy8uL3NyYy91dGlscy9zdHJpbmcuanM/MzJhNiIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvaW5kZXguanM/Yzc1YyIsIndlYnBhY2s6Ly8vLi9zcmMvaW5kZXguanM/OTU1MiIsIndlYnBhY2s6Ly8vLi9zcmMvbWVtb2l6ZS5qcz9hOWUzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9pZi5qcz8xMDI5Iiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9saXN0cy5qcz9mNzQxIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9vcGVyYXRvcnMuanM/NjA1YSIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvc3RhdGVtZW50cy5qcz83Mjc4Iiwid2VicGFjazovLy8uL3NyYy9ydWxlcy90eXBlcy5qcz8yZmU5Iiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9fcGFyc2VyLmpzPzg2Y2UiLCJ3ZWJwYWNrOi8vLyh3ZWJwYWNrKS9idWlsZGluL2dsb2JhbC5qcz8zNjk4Iiwid2VicGFjazovLy8uL3NyYy9SdWxlU3ludGF4LmpzPzMwZjUiXSwibmFtZXMiOlsiUnVsZSIsInByb3BlcnRpZXMiLCJjb25zdHJ1Y3RvciIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiT2JqZWN0IiwiYXNzaWduIiwiY2xvbmUiLCJjcmVhdGUiLCJwcm9wcyIsInN0cmVhbSIsImVuZEluZGV4IiwidW5kZWZpbmVkIiwiVHlwZUVycm9yIiwiYWR2YW5jZVRvIiwicGFyc2VyIiwic3RhY2siLCJjb250ZXh0IiwibWF0Y2hlZCIsIm5hbWUiLCJydWxlIiwibGVuZ3RoIiwiaSIsIm5leHRSdWxlIiwibmV4dFN0cmVhbSIsInN0YXJ0SW5kZXgiLCJQYXR0ZXJuIiwibWF0Y2giLCJzdGFydFBhdHRlcm4iLCJibGFja2xpc3QiLCJtYXRjaGVkVGV4dCIsInJhbmdlIiwicGF0dGVybiIsImluZGV4Iiwid29yZHMiLCJmb3JFYWNoIiwid29yZCIsInNvdXJjZSIsIl9fc3RhcnRQYXR0ZXJuIiwiZGVmaW5lUHJvcGVydHkiLCJ2YWx1ZSIsIlJlZ0V4cCIsIlN5bWJvbCIsInN0cmluZyIsIlJlZ0V4cEZyb21TdHJpbmciLCJvcHRpb25hbCIsIm1lcmdlU3ltYm9scyIsImZpcnN0Iiwic2Vjb25kIiwiS2V5d29yZCIsInBhdHRlcm5TdHJpbmciLCJlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzIiwibWVyZ2VLZXl3b3JkcyIsIlN1YnJ1bGUiLCJnZXRSdWxlT3JEaWUiLCJwYXJzZSIsImFyZ3VtZW50IiwiaXNEZXRlcm1pbmlzdGljIiwidGVzdCIsIk5lc3RlZCIsInJ1bGVzIiwiZXZlcnkiLCJTZXF1ZW5jZSIsInRlc3RSdWxlIiwibGVmdFJlY3Vyc2l2ZSIsInN0YWNrQ29udGFpbnMiLCJjb25jYXQiLCJwdXNoIiwiY2h1bmtpdCIsInBhcnNlSW5DaHVua3MiLCJuZXh0IiwiZWF0V2hpdGVzcGFjZSIsImpvaW4iLCJyZXN1bHRzIiwiYXJnTmFtZSIsInJ1bGVOYW1lIiwiQXJyYXkiLCJpc0FycmF5IiwiRXhwcmVzc2lvbiIsIlN0YXRlbWVudCIsIkFsdGVybmF0aXZlcyIsImJlc3RNYXRjaCIsIm1hdGNoZXMiLCJnZXRCZXN0TWF0Y2giLCJyZWR1Y2UiLCJiZXN0IiwidG9Tb3VyY2UiLCJSZXBlYXQiLCJpbmNsdWRlcyIsIm1hcCIsIkxpc3QiLCJpdGVtIiwiZGVsaW1pdGVyIiwiY29uc29sZSIsImdyb3VwIiwibG9nIiwiZ3JvdXBFbmQiLCJQYXJzZXIiLCJwcm9wZXJ0eU5hbWUiLCJnZXRSdWxlIiwiU3ludGF4RXJyb3IiLCJhcmd1bWVudHMiLCJjb21waWxlU3RhdGVtZW50cyIsInJlc3VsdCIsInN0YXRlbWVudHMiLCJ0aW1lIiwiY3VycmVudEluZGVudCIsInRhYnMiLCJzcGxpdCIsInN0YXRlbWVudCIsInRyaW0iLCJsaW5lU3RhcnQiLCJsaW5lSW5kZW50IiwiaW5kZW50ZWRTdGFydCIsInN0YXJ0c1dpdGgiLCJzdWJzdHIiLCJjbG9zZXJzIiwibGFzdEJsYW5rTGluZSIsIl9nZXRMYXN0QmxhbmtMaW5lIiwic3BsaWNlIiwid2FybiIsInVucGFyc2VkIiwibGluZSIsInRpbWVFbmQiLCJ3aGl0ZXNwYWNlIiwiYWR2YW5jZUJ5IiwiZXhpc3RpbmciLCJkZWJ1ZyIsImFkZFJ1bGUiLCJydWxlSXNMZWZ0UmVjdXJzaXZlIiwic3VicnVsZSIsInRva2VucyIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsIm5lc3RpbmciLCJuZXN0ZWQiLCJsYXN0SW5kZXgiLCJ0b2tlbiIsInNsaWNlIiwiY2hhciIsImxpc3QiLCJSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTIiwiZmxhZ3MiLCJERUJVRyIsImNoYXJzIiwiV2hpdGVzcGFjZSIsIkNvbW1lbnQiLCJXb3JkIiwicmVwbGFjZSIsIklkZW50aWZpZXIiLCJpZGVudGlmaWVyIiwiYWRkVG9CbGFja2xpc3QiLCJUeXBlIiwidHlwZSIsIk51bWJlciIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJpc05hTiIsIkludGVnZXIiLCJwYXJzZUludCIsIlRleHQiLCJ0ZXh0IiwiQm9vbGVhbiIsImJvb2xlYW4iLCJhZGRFeHByZXNzaW9uIiwiZXhwcmVzc2lvbiIsImVuZHNXaXRoIiwiZ2xvYmFsX2lkZW50aWZpZXIiLCJnbG9iYWwiLCJ3aW5kb3ciLCJzZWxmIiwiVGV4dFN0cmVhbSIsInRleHRPclByb3BzIiwiYXJnIiwiaGVhZCIsInN1YnN0cmluZyIsInBsdXJhbGl6ZSIsImlzUGx1cmFsIiwic2luZ3VsYXJpemUiLCJpc1Npbmd1bGFyIiwiYWxsRXhwb3J0cyIsImV4cG9ydHMiLCJTVFJJTkciLCJtZW1vaXplZCIsImRlZmluZU1lbW9pemVkIiwicHJvcGVydHkiLCJnZXR0ZXIiLCJhcHBseSIsImNvbmZpZ3VyYWJsZSIsImdldCIsImFkZFN0YXRlbWVudCIsImVsc2VQaHJhc2UiLCJlbHNlU3RhdGVtZW50IiwidGhpbmciLCJvcmRpbmFsIiwiYWRkS2V5d29yZCIsInBvc2l0aW9uIiwic3RhcnQiLCJlbmQiLCJjb25kaXRpb24iLCJvcGVyYXRvciIsImZpbHRlciIsImluZml4X29wZXJhdG9yIiwicHJlY2VkZW5jZSIsImEiLCJiIiwiYWRkU3ltYm9sIiwibGhzIiwicmhzIiwidG9KUyIsImFzc2lnbm1lbnQiLCJtZXNzYWdlIiwiYnV0dG9uQ2xhdXNlIiwiYnV0dG9uTmFtZSIsIm9rQnV0dG9uIiwiY2FuY2VsQnV0dG9uIiwiY2FuY2VsQ2xhdXNlIiwiYWRkTGlzdCIsInByb3AiLCJrZXkiLCJhZGRTZXF1ZW5jZSIsInByb3BzX2NsYXVzZSIsIm5ld190aGluZyIsImV4dGVuZHNfY2xhdXNlIiwic3VwZXJUeXBlIiwiYXJnTmFtZXMiLCJhcmdzIiwiYXJnc19jbGF1c2UiLCJ3b3JkX2NsYXVzZSIsInR5cGVzIiwidG9Mb3dlckNhc2UiLCJtZXRob2ROYW1lIiwiY29uZGl0aW9ucyIsInNjb3BlIiwidmFsdWVfY2xhdXNlIiwiZGVjbGFyYXRpb24iLCJwbHVyYWwiLCJ2YWx1ZXMiLCJnZXRJdGVtIiwiZmlyc3RWYWx1ZSIsIm1lIiwiSSIsInJldmVyc2UiLCJwYXJzZVJ1bGVTeW50YXgiLCJzeW50YXgiLCJTZXF1ZW5jZUNvbnN0cnVjdG9yIiwic3ludGF4U3RyZWFtIiwidG9rZW5pc2VSdWxlU3ludGF4IiwicGFyc2VSdWxlU3ludGF4X3Rva2VucyIsIlNZTlRBWF9FWFBSRVNTSU9OIiwicGFyc2VSdWxlU3ludGF4X3Rva2VuIiwibGFzdCIsInBvcCIsInN5bnRheFRva2VuIiwicGFyc2VSdWxlU3ludGF4X3N5bWJvbCIsInBhcnNlUnVsZVN5bnRheF9zdWJydWxlIiwicGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzIiwicGFyc2VSdWxlU3ludGF4X2xpc3QiLCJwYXJzZVJ1bGVTeW50YXhfcmVwZWF0IiwiS0VZV09SRF9QQVRURVJOIiwicGFyc2VSdWxlU3ludGF4X2tleXdvcmQiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJhbHRlcm5hdGl2ZXMiLCJncm91cEFsdGVybmF0aXZlcyIsImN1cnJlbnQiLCJzeW1ib2wiLCJwYXJhbXMiLCJiYW5nUG9zaXRpb24iLCJpbmRleE9mIiwibm90IiwiZGVmaW5lUHJvcGVydGllcyIsInJ1bGVTeW50YXgiLCJlIiwiZXJyb3IiLCJhZGRQb3N0Zml4T3BlcmF0b3IiLCJfX3Bvc3RmaXhPcGVyYXRvcnMiLCJwb3N0Zml4T3BlcmF0b3JzIl0sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsbURBQTJDLGNBQWM7O0FBRXpEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsbUNBQTJCLDBCQUEwQixFQUFFO0FBQ3ZELHlDQUFpQyxlQUFlO0FBQ2hEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDhEQUFzRCwrREFBK0Q7O0FBRXJIO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7cWpCQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7Ozs7O0lBR3FCQSxJO0FBQ3BCLGVBQVlDLFVBQVosRUFBd0I7QUFBQTs7QUFDdkIsTUFBSSxLQUFLQyxXQUFMLEtBQXFCRixJ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b3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5pID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIHZhbHVlOyB9O1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCIvXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gNDMpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDBhNDRjZGM3MjhjYTQxOWFlMGEyIiwiLy9cdCMgUGFyc2VyIFJ1bGVzXG4vL1x0UnVsZXMgY2FuIGJlIGFzIHNpbXBsZSBhcyBhIHN0cmluZyBgS2V5d29yZGAgb3IgYSBjb21wbGV4IHNlcXVlbmNlIG9mIChuZXN0ZWQpIHJ1bGVzLlxuLy9cbi8vXHRQYXJzZSBhIHJ1bGUgd2l0aCBgcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSlgLCB0aGlzIHdpbGwgZWl0aGVyOlxuLy9cdFx0LSByZXR1cm4gYHVuZGVmaW5lZGAgaWYgdGhlIHJ1bGUgZG9lc24ndCBtYXRjaCB0aGUgaGVhZCBvZiB0aGUgc3RyZWFtLCBvclxuLy9cdFx0LSByZXR1cm4gYSBDTE9ORSBvZiB0aGUgcnVsZSB3aXRoIGF0IGxlYXN0IHRoZSBmb2xsb3dpbmc6XG4vL1x0XHRcdC0gYHN0cmVhbWBcdFx0U3RyZWFtIHdoaWNoIHdhcyBtYXRjaGVkIHdpdGggYHN0YXJ0SW5kZXhgIGF0IHRoZSBzdGFydCBvZiB0aGUgbWF0Y2hcbi8vXHRcdFx0LSBgZW5kSW5kZXhgXHROb24taW5jbHVzaXZlIGVuZCBpbmRleCBpbiBzdHJlYW0gd2hlcmUgbWF0Y2ggZW5kcy5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLnJlc3VsdHNgXHRcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZShjb250ZXh0KWBcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IGdsb2JhbCBmcm9tIFwiLi91dGlscy9nbG9iYWxcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gUnVsZSB8fCAhdGhpcy5jb25zdHJ1Y3Rvci5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkoXCJjb25zdHJ1Y3RvclwiKSkge1xuLy9jb25zb2xlLndhcm4oXCJub3QgcnVsZVwiLCB0aGlzKTtcblx0XHR9XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblx0fVxuXG5cdC8vIENsb25lIHRoaXMgcnVsZSBhbmQgYWRkIGFueSBgcHJvcHNgIHBhc3NlZCBpbi5cblx0Y2xvbmUoLi4ucHJvcHMpIHtcblx0XHRsZXQgY2xvbmUgPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xuXHRcdE9iamVjdC5hc3NpZ24oY2xvbmUsIC4uLnByb3BzKTtcblx0XHRyZXR1cm4gY2xvbmU7XG5cdH1cblxuXHQvLyBGb3IgYSBydWxlIGluc3RhbmNlIGFzc29jaWF0ZWQgd2l0aCBhIHN0cmVhbSxcblx0Ly8gcmV0dXJuIGEgbmV3IHN0cmVhbSBBRlRFUiB0aGlzIHJ1bGUncyBlbmQuXG5cdG5leHQoKSB7XG5cdFx0aWYgKCF0aGlzLnN0cmVhbSB8fCB0aGlzLmVuZEluZGV4ID09PSB1bmRlZmluZWQpXG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBydWxlLm5leHQoKSBjYWxsZWQgb24gcnVsZSB3aXRob3V0IGEgc3RyZWFtYCwgdGhpcyk7XG5cdFx0cmV0dXJuIHRoaXMuc3RyZWFtLmFkdmFuY2VUbyh0aGlzLmVuZEluZGV4KTtcblx0fVxuXG4vL1xuLy9cdFBhcnNpbmcgcHJpbWl0aXZlcyAtLSB5b3UgTVVTVCBpbXBsZW1lbnQgdGhlc2UgaW4geW91ciBzdWJjbGFzc2VzIVxuLy9cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcnVsZSBpbiB0aGUgYHN0cmVhbWAuXG5cdC8vIFJldHVybnMgcmVzdWx0cyBvZiB0aGUgcGFyc2Ugb3IgYHVuZGVmaW5lZGAuXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBJcyB0aGlzIHJ1bGUgZGV0ZXJtaW5pc3RpYywgZWc6IGNhbiBpdCBiZSBxdWlja2x5IGFuZCB1bmFtYmlndW91c2x5IHNhdGlzZmllZD9cblx0Ly8gUmV0dXJuaW5nIGB0cnVlYCBjYW4gc3BlZWQgdXAgc2VxdWVuY2UgcHJvY2Vzc2luZyxcblx0Ly9cdGJ1dCBpZiB5b3UncmUgcmVhbGx5IG5vdCBzdXJlLCByZXR1cm4gYHVuZGVmaW5lZGAuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBiaXRzIG9mIG91ciBydWxlIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljIChidXQgYWxsIHBhdHRlcm5zIGFyZSBkZXRlcm1pbmlzdGljKVxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmRcblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBEb2VzIHRoZSBwYXJzZSBgc3RhY2tgIGFscmVhZHkgY29udGFpbiBgcnVsZWA/XG5cdHN0YXRpYyBzdGFja0NvbnRhaW5zKHN0YWNrLCBydWxlLCBzdHJlYW0pIHtcblx0XHRpZiAoc3RhY2subGVuZ3RoID09PSAwKSByZXR1cm4gZmFsc2U7XG5cbi8vY29uc29sZS5pbmZvKHN0YWNrKTtcblx0XHQvLyBnbyBiYWNrd2FyZHNcblx0XHRmb3IgKHZhciBpID0gc3RhY2subGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGxldCBbIG5leHRSdWxlLCBuZXh0U3RyZWFtIF0gPSBzdGFja1tpXTtcblx0XHRcdGlmIChuZXh0UnVsZSA9PT0gcnVsZSkge1xuXHRcdFx0XHRpZiAobmV4dFN0cmVhbS5zdGFydEluZGV4ID09PSBzdHJlYW0uc3RhcnRJbmRleCkge1xuLy9cdFx0XHRcdFx0Y29uc29sZS53YXJuKFwiZm91bmQgdW5wcm9kdWN0aXZlIHJ1bGUgXCIsIHJ1bGUsIFwiIG9uIHN0YWNrXCIsIHN0YWNrKTtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcbi8vXHRcdFx0XHRcdGNvbnNvbGUud2FybihcImZvdW5kIHByb2R1Y3RpdmUgcnVsZSBcIiwgcnVsZSwgXCIgb24gc3RhY2tcIiwgc3RhY2spO1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIE5PVEU6IHlvdSBtYXkgd2FudCB0byBtZW1vaXplIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkO1xuXHR9XG5cbi8vXG4vLyAjIyBncm91cDogcmVmbGVjdGlvblxuLy9cblx0Z2V0IHJ1bGVUeXBlKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdH1cbn1cblxuXG4vLyBERUJVRzogbWFrZSBgUnVsZWAgZ2xvYmFsIGZvciBkZWJ1Z2dpbmcuXG5nbG9iYWwuUnVsZSA9IFJ1bGU7XG5cblxuXG4vLyBSZWdleCBwYXR0ZXJuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vXG4vLyBOT1RFXHRUbyBtYWtlIHRoaXMgbW9yZSBnZW5lcmFsbHkgYXBwbGljYWJsZSwgZG8gTk9UIHN0YXJ0IHRoZSBwYXR0ZXJuIHdpdGggYSBgXmAuXG4vL1x0XHRXZSdsbCBhdXRvbWF0aWNhbGx5IG1ha2UgYSBjb3B5IG9mIHRoZSBSZWdFeHAgd2l0aCB0aGUgc3RhcnQgcG9pbnQgYXR0YWNoZWRcbi8vXHRcdGFuZCB1c2UgdGhhdCBhcyBhcHByb3ByaWF0ZS5cbi8vXG4vL1x0XHRUaGlzIHdheSB3ZSBjYW4gcmUtdXNlIHRoZSByZWdleCB0byBjaGVjayBmb3IgYSBtYXRjaCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBzdHJlYW0uLi5cbi8vXG4vLyBZb3UgY2FuIG9wdGlvbmFsbHkgc3BlY2lmeSBhIGBydWxlLmJsYWNrbGlzdGAsIGEgc2V0IG9mIG1hdGNoZXMgd2hpY2ggd2lsbCBzcGVjaWZpY2FsbHkgTk9UIHdvcmssXG4vL1x0ZWcgZm9yIGBpZGVudGlmaWVyLlxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHQvLyBgc3RhcnRQYXR0ZXJuYCBpcyB0aGUgc2FtZSBhcyBvdXIgcGF0dGVybiBleGNlcHQgaXQgd2lsbCBvbmx5IG1hdGNoIGF0IHRoZSBCRUdJTk5JTkcgb2YgYSBzdHJpbmcuXG5cdGdldCBzdGFydFBhdHRlcm4oKSB7XG5cdFx0aWYgKCF0aGlzLl9fc3RhcnRQYXR0ZXJuKSB7XG5cdFx0XHQvLyBgcGF0dGVybmAgaXMgcmVxdWlyZWRcblx0XHRcdGlmICghdGhpcy5wYXR0ZXJuKSB0aHJvdyBuZXcgVHlwZUVycm9yKHRoaXMrXCI6IFlvdSBtdXN0IHNwZWNpZnkgYSBgcGF0dGVybmAgcGFyYW1ldGVyXCIpO1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwiX19zdGFydFBhdHRlcm5cIiwge1xuXHRcdFx0XHR2YWx1ZTogbmV3IFJlZ0V4cChcIl5cIiArIHRoaXMucGF0dGVybi5zb3VyY2UpXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX19zdGFydFBhdHRlcm47XG5cdH1cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcGF0dGVybiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdGxldCBtYXRjaCA9IHN0cmVhbS5tYXRjaCh0aGlzLnN0YXJ0UGF0dGVybik7XG5cdFx0aWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGJhaWwgaWYgcHJlc2VudCBpbiBibGFja2xpc3Rcblx0XHRsZXQgbWF0Y2hlZCA9IG1hdGNoWzBdO1xuXHRcdGlmICh0aGlzLmJsYWNrbGlzdCAmJiB0aGlzLmJsYWNrbGlzdFttYXRjaGVkXSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBlbmRJbmRleCA9IHN0cmVhbS5zdGFydEluZGV4ICsgbWF0Y2hlZC5sZW5ndGg7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBlbmRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUGF0dGVybnMgYXJlIEFMV0FZUyBkZXRlcm1pbmlzdGljLlxuXHRpc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgcGF0dGVybmlzIGZvdW5kIEFOWVdIRVJFIGluIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIGB1bmRlZmluZWRgIGlmIG5vdCBkZXRlcm1pbnN0aWMgKGJ1dCBhbGwgcGF0dGVybnMgYXJlIGRldGVybWluaXN0aWMpXG5cdC8vXHQtIHJlZ2V4IG1hdGNoIGlmIGZvdW5kLFxuXHQvL1x0LSBgZmFsc2VgIGlmIG5vdCBmb3VuZFxuXHR0ZXN0KHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IG1hdGNoID0gc3RyZWFtLm1hdGNoKHRoaXMucGF0dGVybik7XG5cdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRtYXRjaC5lbmRJbmRleCA9IChtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCk7XG5cdFx0XHRyZXR1cm4gbWF0Y2g7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGFkZFRvQmxhY2tsaXN0KC4uLndvcmRzKSB7XG5cdFx0aWYgKCF0aGlzLmJsYWNrbGlzdCkgdGhpcy5ibGFja2xpc3QgPSB7fTtcblx0XHR3b3Jkcy5mb3JFYWNoKHdvcmQgPT4gdGhpcy5ibGFja2xpc3Rbd29yZF0gPSB0cnVlKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm4uc291cmNlO1xuXHR9XG59XG5cbi8vIFJ1bGUgZm9yIGxpdGVyYWwgc3RyaW5nIHZhbHVlLCB3aGljaCBpbmNsdWRlIHB1bmN0dWF0aW9uIHN1Y2ggYXMgYChgIGV0Yy5cbi8vIGBTeW1ib2xgcyBhcmUgZGlmZmVyZW50IGZyb20gYEtleXdvcmRzYCBpbiB0aGF0IHRoZXkgZG8gbm90IHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5LlxuLy9UT0RPOiByZW5hbWUgYFN5bWJvbGA/Pz9cblJ1bGUuU3ltYm9sID0gY2xhc3MgU3ltYm9sIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdC8vIGBzdHJpbmdgIGlzIHJlcXVpZWQuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnN0cmluZykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldyBSdWxlLlN5bWJvbCgpOiBFeHBlY3RlZCBzdHJpbmcgcHJvcGVydHlcIik7XG5cblx0XHQvLyBjb252ZXJ0IHN0cmluZyB0byBwYXR0ZXJuXG5cdFx0aWYgKCFwcm9wZXJ0aWVzLnBhdHRlcm4pIHtcblx0XHRcdHByb3BlcnRpZXMucGF0dGVybiA9IFBhcnNlci5SZWdFeHBGcm9tU3RyaW5nKHByb3BlcnRpZXMuc3RyaW5nKTtcbi8vY29uc29sZS5pbmZvKHByb3BlcnRpZXMuc3RyaW5nLCBwcm9wZXJ0aWVzLnBhdHRlcm4pO1xuXHRcdH1cblxuLy9cdFx0Y29uc29sZS5pbmZvKFwiY3JlYXRpbmcgc3RyaW5nXCIsIHByb3BlcnRpZXMpO1xuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHR9XG5cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5zdHJpbmd9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG4vLyBNZXJnZSB0d28gU3ltYm9sIHJ1bGVzIHRvZ2V0aGVyLCByZXR1cm5pbmcgYSBuZXcgcnVsZSB0aGF0IG1hdGNoZXMgYm90aC5cblJ1bGUubWVyZ2VTeW1ib2xzID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuXHQvLyBHZXQgY3VzdG9tIGNvbnN0cnVjdG9yIGlmIHRoZXJlIGlzIG9uZS4uLlxuXHRsZXQgY29uc3RydWN0b3IgPSBmaXJzdC5jb25zdHJ1Y3RvciAhPT0gUnVsZS5TeW1ib2wgPyBmaXJzdC5jb25zdHJ1Y3RvciA6IHNlY29uZC5jb25zdHJ1Y3Rvcjtcblx0cmV0dXJuIG5ldyBjb25zdHJ1Y3Rvcih7IHN0cmluZzogZmlyc3Quc3RyaW5nICsgc2Vjb25kLnN0cmluZyB9KTtcbn1cblxuLy8gS2V5d29yZCBwYXR0ZXJuLlxuLy8gUHJvcGVydGllczpcbi8vXHQtIGBydWxlLnN0cmluZ2AgXHQocmVxdWlyZWQpIFx0S2V5d29yZCBzdHJpbmcgdG8gbWF0Y2guXG4vL1x0LSBgcnVsZS5wYXR0ZXJuYFx0KG9wdGlvbmFsKSBcdFJlZ0V4cCBmb3IgdGhlIG1hdGNoLlxuLy9cdFx0XHRcdFx0XHRcdFx0XHRXZSdsbCBjcmVhdGUgb25lIGZyb20gYHN0cmluZ2AgaWYgbmVjZXNzYXJ5LlxuLy9cdFx0XHRcdFx0XHRcdFx0XHROT1RFOiBkbyBOT1Qgc3RhcnQgdGhlIGBwYXR0ZXJuYCB3aXRoIGBeYC5cblJ1bGUuS2V5d29yZCA9IGNsYXNzIEtleXdvcmQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gYHN0cmluZ2AgaXMgcmVxdWllZC5cblx0XHRpZiAoIXByb3BlcnRpZXMuc3RyaW5nKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3IFJ1bGUuS2V5d29yZCgpOiBFeHBlY3RlZCBzdHJpbmcgcHJvcGVydHlcIik7XG5cblx0XHQvLyBkZXJpdmUgYHBhdHRlcm5gIGlmIG5lY2Vzc2FyeS5cblx0XHRpZiAoIXByb3BlcnRpZXMucGF0dGVybikge1xuXHRcdFx0Ly8gZW5mb3JjZSB3b3JkIGJvdW5kYXJpZXMgYW5kIGFsbG93IGFyYml0cmFyeSBzcGFjZSBiZXR3ZWVuIHdvcmRzXG5cdFx0XHRsZXQgcGF0dGVyblN0cmluZyA9IFBhcnNlci5lc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHByb3BlcnRpZXMuc3RyaW5nKTtcblx0XHRcdHByb3BlcnRpZXMucGF0dGVybiA9IG5ldyBSZWdFeHAoXCJcXFxcYlwiICsgcGF0dGVyblN0cmluZyArIFwiXFxcXGJcIik7XG5cdFx0fVxuXHRcdHN1cGVyKHByb3BlcnRpZXMpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMuc3RyaW5nfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG4vLyBNZXJnZSB0d28gS2V5d29yZCBydWxlcyB0b2dldGhlciwgYWRkaW5nIHRoZSBzZWNvbmQgdG8gdGhlIGZpcnN0LlxuUnVsZS5tZXJnZUtleXdvcmRzID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge1xuXHQvLyBHZXQgY3VzdG9tIGNvbnN0cnVjdG9yIGlmIHRoZXJlIGlzIG9uZS4uLlxuXHRsZXQgY29uc3RydWN0b3IgPSBmaXJzdC5jb25zdHJ1Y3RvciAhPT0gUnVsZS5LZXl3b3JkID8gZmlyc3QuY29uc3RydWN0b3IgOiBzZWNvbmQuY29uc3RydWN0b3I7XG5cdHJldHVybiBuZXcgY29uc3RydWN0b3IoeyBzdHJpbmc6IGZpcnN0LnN0cmluZyArIFwiIFwiICsgc2Vjb25kLnN0cmluZyB9KTtcbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcblx0XHRsZXQgcnVsZSA9IHBhcnNlci5nZXRSdWxlT3JEaWUodGhpcy5ydWxlLCBcInJ1bGVcIik7XG5cdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgbWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdHJldHVybiBtYXRjaDtcblx0fVxuXG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnJ1bGUsIFwicnVsZVwiKTtcblx0XHRyZXR1cm4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYW55IG9mIG91ciBhbHRlcm5hdGl2ZXMgYXJlIGZvdW5kIEFOWVdIRVJFIGluIHRoZSBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIHJlZ2V4IG1hdGNoIGlmIGZvdW5kLFxuXHQvL1x0LSBgZmFsc2VgIGlmIG5vdCBmb3VuZCBvclxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljLlxuXHR0ZXN0KHBhcnNlciwgc3RyZWFtKSB7XG5cdFx0bGV0IHJ1bGUgPSBwYXJzZXIuZ2V0UnVsZU9yRGllKHRoaXMucnVsZSwgXCJydWxlXCIpO1xuXHRcdHJldHVybiBydWxlLnRlc3QocGFyc2VyLCBzdHJlYW0pO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG5cbi8vIEFic3RyYWN0OiAgYE5lc3RlZGAgcnVsZSAtLSBjb21wb3NlZCBvZiBhIHNlcmllcyBvZiBvdGhlciBgcnVsZXNgLlxuUnVsZS5OZXN0ZWQgPSBjbGFzcyBOZXN0ZWQgZXh0ZW5kcyBSdWxlIHtcblxuXHQvLyBJcyB0aGlzIGRldGVybWluaXN0aWMsIGVnOiBhcmUgb3VyIHN1YnJ1bGVzIHVuYW1iaWdvdXNseSBkZXRlcm1pbmFibGU/XG4vL1RPRE86IG1lbW9pemU/XG5cdGlzRGV0ZXJtaW5pc3RpYyhwYXJzZXIsIHN0cmVhbSkge1xuXHRcdHJldHVybiB0aGlzLnJ1bGVzLmV2ZXJ5KHJ1bGUgPT4gcnVsZS5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pKTtcblx0fVxufVxuXG5cbi8vIFNlcXVlbmNlIG9mIHJ1bGVzIHRvIG1hdGNoIChhdXRvLWV4Y2x1ZGluZyB3aGl0ZXNwYWNlKS5cblJ1bGUuU2VxdWVuY2UgPSBjbGFzcyBTZXF1ZW5jZSBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrID0gW10pIHtcblx0XHQvLyBJZiB3ZSBoYXZlIGEgYHRlc3RSdWxlYCBkZWZpbmVkXG5cdFx0aWYgKHRoaXMudGVzdFJ1bGUpIHtcblx0XHRcdGxldCBydWxlID0gcGFyc2VyLmdldFJ1bGVPckRpZSh0aGlzLnRlc3RSdWxlLCBcInRlc3RSdWxlXCIpO1xuXHRcdFx0aWYgKHJ1bGUudGVzdChwYXJzZXIsIHN0cmVhbSkgPT09IGZhbHNlKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdGlmIChSdWxlLnN0YWNrQ29udGFpbnMoc3RhY2ssIHRoaXMsIHN0cmVhbSkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRzdGFjayA9IHN0YWNrLmNvbmNhdCgpO1xuXHRcdFx0c3RhY2sucHVzaChbdGhpcywgc3RyZWFtXSk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2h1bmtpdCkgcmV0dXJuIHRoaXMucGFyc2VJbkNodW5rcyhwYXJzZXIsIHN0cmVhbSwgc3RhY2spO1xuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXSwgbmV4dCA9IHN0cmVhbTtcblx0XHRmb3IgKGxldCBydWxlIG9mIHRoaXMucnVsZXMpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIW1hdGNoICYmICFydWxlLm9wdGlvbmFsKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdG1hdGNoZWQucHVzaChtYXRjaCk7XG5cdFx0XHRcdG5leHQgPSBtYXRjaC5uZXh0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGlmIHdlIGdldCBoZXJlLCB3ZSBtYXRjaGVkIGFsbCB0aGUgcnVsZXMhXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdC8vIERFQlVHXG5cdFx0XHRtYXRjaGVkVGV4dDogc3RyZWFtLnJhbmdlKHN0cmVhbS5zdGFydEluZGV4LCBuZXh0LnN0YXJ0SW5kZXgpLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdHN0YXJ0SW5kZXg6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cbi8vIFx0cGFyc2VJbkNodW5rcyhwYXJzZXIsIHN0cmVhbSwgc3RhY2spIHtcbi8vXG4vLyBcdH1cblxuLy9UT0RPQ1xuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGBtYXRjaGVkYCBhcnJheSBpbmRleGVkIGJ5XG5cdC8vXHRcdC0gYG1hdGNoLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYG1hdGNoLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIGBydWxlIHR5cGVgOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRsZXQgcmVzdWx0cyA9IHt9O1xuXHRcdGZvciAobGV0IG1hdGNoIG9mIHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0bGV0IGFyZ05hbWUgPSBtYXRjaC5hcmd1bWVudCB8fCBtYXRjaC5ydWxlTmFtZSB8fCBtYXRjaC5jb25zdHJ1Y3Rvci5uYW1lO1xuXG5cdFx0XHQvLyBJZiBhcmcgYWxyZWFkeSBleGlzdHMsIGNvbnZlcnQgdG8gYW4gYXJyYXlcblx0XHRcdGlmIChhcmdOYW1lIGluIHJlc3VsdHMpIHtcblx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KHJlc3VsdHNbYXJnTmFtZV0pKSByZXN1bHRzW2FyZ05hbWVdID0gW3Jlc3VsdHNbYXJnTmFtZV1dO1xuXHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdLnB1c2gobWF0Y2gpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0gPSBtYXRjaDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlcy5qb2luKFwiIFwiKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG5cbn1cblxuLy8gU3ludGFjdGljIHN1Z2FyIGZvciBkZWJ1Z2dpbmdcblJ1bGUuRXhwcmVzc2lvbiA9IGNsYXNzIGV4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gU3RhdGVtZW50cyB0YWtlIHVwIHRoZSBlbnRpcmUgbGluZS5cblJ1bGUuU3RhdGVtZW50ID0gY2xhc3Mgc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIEFsdGVybmF0aXZlIHN5bnRheCwgbWF0Y2hpbmcgb25lIG9mIGEgbnVtYmVyIG9mIGRpZmZlcmVudCBydWxlcy5cbi8vIFRoZSByZXN1bHQgb2YgYSBwYXJzZSBpcyB0aGUgbG9uZ2VzdCBydWxlIHRoYXQgYWN0dWFsbHkgbWF0Y2hlZC5cbi8vIE5PVEU6IEN1cnJlbnRseSB0YWtlcyB0aGUgbG9uZ2VzdCB2YWxpZCBtYXRjaC5cbi8vIFRPRE86IG1hdGNoIGFsbCB2YWxpZCBhbHRlcm5hdGl2ZXNcbi8vIFRPRE86IHJlbmFtZT9cblJ1bGUuQWx0ZXJuYXRpdmVzID0gY2xhc3MgQWx0ZXJuYXRpdmVzIGV4dGVuZHMgUnVsZS5OZXN0ZWQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKTtcblx0XHRpZiAoIXRoaXMucnVsZXMpIHRoaXMucnVsZXMgPSBbXTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljLlxuXHQvL1x0LSByZWdleCBtYXRjaCBpZiBmb3VuZCxcblx0Ly9cdC0gYGZhbHNlYCBpZiBub3QgZm91bmQgb3Jcblx0dGVzdChwYXJzZXIsIHN0cmVhbSkge1xuXHRcdGlmICghdGhpcy5pc0RldGVybWluaXN0aWMocGFyc2VyLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCBiZXN0TWF0Y2g7XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnRlc3QocGFyc2VyLCBzdHJlYW0pO1xuXHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdG1hdGNoLmVuZEluZGV4ID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG5cdFx0XHRcdHJldHVybiBtYXRjaDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gRmluZCBhbGwgcnVsZXMgd2hpY2ggbWF0Y2ggYW5kIGRlbGVnYXRlIHRvIGBnZXRCZXN0TWF0Y2goKWAgdG8gcGljayB0aGUgYmVzdCBvbmUuXG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjaykge1xuXHRcdGxldCBtYXRjaGVzID0gW107XG5cdFx0Zm9yIChsZXQgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayk7XG5cdFx0XHRpZiAobWF0Y2gpIG1hdGNoZXMucHVzaChtYXRjaCk7XG5cdFx0fVxuXG5cdFx0aWYgKCFtYXRjaGVzLmxlbmd0aCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIHVuY29tbWVudCB0aGUgYmVsb3cgdG8gcHJpbnQgYWx0ZXJuYXRpdmVzXG5cdFx0Ly8gaWYgKG1hdGNoZXMubGVuZ3RoID4gMSkge1xuXHRcdC8vXHRjb25zb2xlLmluZm8odGhpcy5hcmd1bWVudCB8fCB0aGlzLnJ1bGVOYW1lLCBtYXRjaGVzLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5tYXRjaGVkVGV4dCkpO1xuXHRcdC8vIH1cblxuXHRcdGxldCBiZXN0TWF0Y2ggPSAobWF0Y2hlcy5sZW5ndGggPT09IDEgPyBtYXRjaGVzWzBdIDogdGhpcy5nZXRCZXN0TWF0Y2gobWF0Y2hlcykpO1xuXG5cdFx0Ly8gYXNzaWduIGBhcmdOYW1lYCBvciBgcnVsZU5hbWVgIGZvciBgcmVzdWx0c2Bcblx0XHRpZiAodGhpcy5hcmd1bWVudCkgYmVzdE1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRlbHNlIGlmICh0aGlzLnJ1bGVOYW1lKSBiZXN0TWF0Y2gucnVsZU5hbWUgPSB0aGlzLnJ1bGVOYW1lO1xuLy9UT0RPOiBvdGhlciB0aGluZ3MgdG8gY29weSBoZXJlPz8/XG5cblx0XHRyZXR1cm4gYmVzdE1hdGNoO1xuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBcImJlc3RcIiBtYXRjaCBnaXZlbiBtb3JlIHRoYW4gb25lIG1hdGNoZXMgYXQgdGhlIGhlYWQgb2YgdGhlIHN0cmVhbS5cblx0Ly8gRGVmYXVsdCBpcyB0byByZXR1cm4gdGhlIGxvbmdlc3QgbWF0Y2guXG5cdC8vIEltcGxlbWVudCBzb21ldGhpbmcgZWxzZSB0byBkbywgZWcsIHByZWNlZGVuY2UgcnVsZXMuXG5cdGdldEJlc3RNYXRjaChtYXRjaGVzKSB7XG5cdFx0cmV0dXJuIG1hdGNoZXMucmVkdWNlKGZ1bmN0aW9uIChiZXN0LCBuZXh0KSB7XG5cdFx0XHRpZiAobmV4dC5lbmRJbmRleCA+IGJlc3QuZW5kSW5kZXgpIHJldHVybiBuZXh0O1xuXHRcdFx0cmV0dXJuIGJlc3Q7XG5cdFx0fSwgbWF0Y2hlc1swXSk7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZShjb250ZXh0KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5tYXRjaGVkYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUuTmVzdGVkIHtcblx0cGFyc2UocGFyc2VyLCBzdHJlYW0sIHN0YWNrID0gW10pIHtcblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHRpZiAoUnVsZS5zdGFja0NvbnRhaW5zKHN0YWNrLCB0aGlzLCBzdHJlYW0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0c3RhY2sgPSBzdGFjay5jb25jYXQoKTtcblx0XHRcdHN0YWNrLnB1c2goW3RoaXMsIHN0cmVhbV0pO1xuXHRcdH1cblxuXHRcdGxldCBuZXh0ID0gc3RyZWFtO1xuXHRcdGxldCBtYXRjaGVkID0gW107XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdG5leHQgPSBwYXJzZXIuZWF0V2hpdGVzcGFjZShuZXh0KTtcblx0XHRcdGxldCBtYXRjaCA9IHRoaXMucnVsZS5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghbWF0Y2gpIGJyZWFrO1xuXG5cdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0bmV4dCA9IG1hdGNoLm5leHQoKTtcblx0XHR9XG5cblx0XHRpZiAobWF0Y2hlZC5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogc3RyZWFtLnN0YXJ0SW5kZXgsXG5cdFx0XHRlbmRJbmRleDogbmV4dC5zdGFydEluZGV4LFxuXHRcdFx0c3RyZWFtXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBhcnJheSB3aXRoIGFyZ3VtZW50cyBvZiBhbGwgcmVzdWx0cy5cblx0Ly8gTk9URTogbWVtb2l6ZXMgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC5yZXN1bHRzICk7XG5cdH1cblxuXHR0b1NvdXJjZSgpIHtcblx0XHR0aHJvdyBcIkRvbid0IHVuZGVyc3RhbmQgaG93IHRvIHNvdXJjZSBSdWxlLlJlcGVhdCFcIjtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdGNvbnN0IHJ1bGUgPSAodGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSB8fCB0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLktleXdvcmQgJiYgdGhpcy5ydWxlLnN0cmluZy5pbmNsdWRlcyhcIiBcIilcblx0XHRcdFx0ICAgPyBgKCR7dGhpcy5ydWxlfSlgXG5cdFx0XHRcdCAgIDogYCR7dGhpcy5ydWxlfWBcblx0XHRcdFx0KTtcblx0XHRyZXR1cm4gYCR7cnVsZX0ke3RoaXMub3B0aW9uYWwgPyAnKicgOiAnKyd9YDtcblx0fVxufVxuXG5cbi8vIExpc3QgbWF0Y2ggcnVsZTogICBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAuIGVnXCIgYFt7bnVtYmVyfSxdYCB0byBtYXRjaCBgMSwyLDNgXG4vL1x0YHJ1bGUuaXRlbWAgaXMgdGhlIHJ1bGUgZm9yIGVhY2ggaXRlbSxcbi8vXHRgcnVsZS5kZWxpbWl0ZXJgIGlzIHRoZSBkZWxpbWl0ZXIgYmV0d2VlbiBlYWNoIGl0ZW0uXG4vLyBcdGBydWxlLm1hdGNoZWRgIGluIHRoZSBvdXRwdXQgaXMgdGhlIGxpc3Qgb2YgdmFsdWVzLlxuLy9cbi8vXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhIExpc3QgcnVsZSB3aWxsIE5PVCByZXBlYXQgKD8/Pz8pXG5SdWxlLkxpc3QgPSBjbGFzcyBMaXN0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgc3RyZWFtLCBzdGFjayA9IFtdKSB7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgc3RyZWFtKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCBzdHJlYW1dKTtcblx0XHR9XG5cblx0XHQvLyBlbnN1cmUgaXRlbSBhbmQgZGVsaW1pdGVyIGFyZSBvcHRpb25hbCBzbyB3ZSBkb24ndCBiYXJmIGluIGBwYXJzZVJ1bGVgXG5cdFx0dGhpcy5pdGVtLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR0aGlzLmRlbGltaXRlci5vcHRpb25hbCA9IHRydWU7XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdLCBuZXh0ID0gc3RyZWFtO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRuZXh0ID0gcGFyc2VyLmVhdFdoaXRlc3BhY2UobmV4dCk7XG5cdFx0XHQvLyBnZXQgbmV4dCBpdGVtLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGl0ZW0gPSB0aGlzLml0ZW0ucGFyc2UocGFyc2VyLCBuZXh0LCBzdGFjayk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuLy9jb25zb2xlLmxvZyhpdGVtKTtcblx0XHRcdG1hdGNoZWQucHVzaChpdGVtKTtcblx0XHRcdG5leHQgPSBpdGVtLm5leHQoKTtcblxuXHRcdFx0bmV4dCA9IHBhcnNlci5lYXRXaGl0ZXNwYWNlKG5leHQpO1xuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIG5leHQsIHN0YWNrKTtcblx0XHRcdGlmICghZGVsaW1pdGVyKSBicmVhaztcblx0XHRcdG5leHQgPSBkZWxpbWl0ZXIubmV4dCgpO1xuXHRcdH1cblxuXHRcdC8vIElmIHdlIGRpZG4ndCBnZXQgYW55IG1hdGNoZXMsIGZvcmdldCBpdC5cblx0XHRpZiAobWF0Y2hlZC5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0Ly8gREVCVUdcblx0XHRcdG1hdGNoZWRUZXh0OiBzdHJlYW0ucmFuZ2Uoc3RyZWFtLnN0YXJ0SW5kZXgsIG5leHQuc3RhcnRJbmRleCksXG5cdFx0XHQvLyBERUJVR1xuXHRcdFx0c3RhcnRJbmRleDogbWF0Y2hlZFswXSA/IG1hdGNoZWRbMF0uc3RhcnRJbmRleCA6IHN0cmVhbS5zdGFydEluZGV4LFxuXHRcdFx0ZW5kSW5kZXg6IG5leHQuc3RhcnRJbmRleCxcblx0XHRcdHN0cmVhbVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIG1hdGNoZWQgaXRlbSBieSBpbmRleFxuXHRnZXRJdGVtKGluZGV4KSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZFtpbmRleF07XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XHRcdC8vIFRPRE86IHRocm93Pz8/XG5cdFx0bGV0IG1hdGNoZWQgPSB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC50b1NvdXJjZShjb250ZXh0KSApLmpvaW4oXCIsIFwiKTtcblx0XHRyZXR1cm4gYFske21hdGNoZWR9XWA7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYFske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMuaXRlbX0gJHt0aGlzLmRlbGltaXRlcn1dJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGUuanMiLCIvLyBTcGVsbCBcIkVuZ2xpc2hcIiBwYXJzZXIgc3RyYXdtYW5cblxuLy8gVE9ETzpcdGB0ZXN0YCBmdW5jdGlvbiBmb3IgcXVpY2sgbm8tZ29vZCBoaXQgb24gYHthfSBibGFoIGJsYWgge2J9YD9cbi8vIFRPRE86XHR0aGlzIGRvZXNuJ3Qgd29yazogICBge2V4cHJlc3Npb259IGlzIHtleHByZXNzaW9ufWBcbi8vIFRPRE86XHRicmVhayBgZmlsZWAgaW50byBsaW5lcyBhbmQgcHJvY2VzcyBlYWNoIChpbmNsLiBzdWJzdHIvbWF0Y2ggbm90IGdvaW5nIGJleW9uZCB0aGUgZW5kKVxuLy8gVE9ETzpcdG5lc3RpbmcgLS0gaXMgdGhpcyBqdXN0IGluZGVudCA9IFwiYWRkIGJsb2NrIHNjb3BlXCJcbi8vIFRPRE86XHRwcm9tb3Rpb24gcGF0dGVybiBmb3IgZ2F0aGVyIGFyZ3VtZW50cyAoZWc6IGxpdGVyYWwtbGlzdCkgPz8/XG4vLyBUT0RPOlx0V2hhdCBkb2VzIHN5bnRheCB0cmVlIGxvb2sgbGlrZT8gIEhvdyBkbyB3ZSBleHRyYWN0IG1lYW5pbmcgb3V0IG9mIHRoZSBuZXN0P1xuLy8gVE9ETzpcdFBhc3MgYGNvbnRleHRgIHRvIHRvU291cmNlKCksIGFkZCBwcm9wZXJ0eSBkZXNjcmlwdG9ycyB0byBgY2xhc3NgLCB2YXJpYWJsZXMgYW5kIGNvZGUgdG8gYG1ldGhvZGAsIGBnbG9iYWxgIHN0dWZmIGV0Y1xuXG5pbXBvcnQgVGV4dFN0cmVhbSBmcm9tIFwiLi9UZXh0U3RyZWFtLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIEdSUlIuLi4gd2lsbCBTT01FT05FIG9uIHRoZSBub2RlIHRlYW0gcGxlYXNlIGltcGxlbWVudCBjb25zb2xlLmdyb3VwID8/P1xuaWYgKCFjb25zb2xlLmdyb3VwKSBjb25zb2xlLmdyb3VwID0gY29uc29sZS5sb2c7XG5pZiAoIWNvbnNvbGUuZ3JvdXBFbmQpIGNvbnNvbGUuZ3JvdXBFbmQgPSBjb25zb2xlLmxvZztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblx0Ly8gU2V0IHRvIGB0cnVlYCB0byBvdXRwdXQgZGVidWcgaW5mbyB3aGlsZSBhZGRpbmcgcnVsZXNcblx0c3RhdGljIERFQlVHID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cblx0XHQvLyBDbG9uZSBydWxlcywgc3RhcnRpbmcgd2l0aCBhIGNvbXBsZXRlbHkgZW1wdHkgbWFwIGlmIG5vdCBkZWZpbmVkIChubyBzdGFuZGFyZCBvYmplY3Qga2V5cylcblx0XHR0aGlzLnJ1bGVzID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnJ1bGVzIHx8IG51bGwpO1xuXHR9XG5cblx0Z2V0UnVsZShuYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMucnVsZXNbbmFtZV07XG5cdH1cblxuXHRnZXRSdWxlT3JEaWUobmFtZSwgcHJvcGVydHlOYW1lKSB7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUobmFtZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYCR7cHJvcGVydHlOYW1lfSBydWxlICcke25hbWV9JyBub3QgZm91bmRgKTtcblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG4vL1xuLy8jIyMgUGFyc2luZ1xuLy9cblx0Ly8gUGFyc2Ugc29tZXRoaW5nOlxuXHQvL1x0LSBpZiBvbmUgc3RyaW5nIGFyZ3VtZW50LCBkb2VzIGEgYGNvbXBpbGVTdGF0ZW1lbnRzKClgXG5cdC8vXHQtIGlmIHR3bywgZG9lcyBhIGBwYXJzZVJ1bGUoKWAgYW5kIG91dHB1dHMgdGhlIHJlc3VsdHMuXG5cdC8vIFJldHVybnMgYHBhcnNlLnRvU3RyaW5nKClgIG9yIHRocm93cy5cbi8vVEVTVE1FXG5cdGNvbXBpbGUoKSB7XG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdGxldCBzdHJpbmcgPSBhcmd1bWVudHNbMF07XG5cdFx0XHRyZXR1cm4gdGhpcy5jb21waWxlU3RhdGVtZW50cyhzdHJpbmcpO1xuXHRcdH1cblx0XHRlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG5cdFx0XHRsZXQgbmFtZSA9IGFyZ3VtZW50c1swXSwgc3RyaW5nID0gYXJndW1lbnRzWzFdO1xuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMucGFyc2UobmFtZSwgc3RyaW5nKTtcblx0XHRcdGlmICghcmVzdWx0KSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYHBhcnNlci5wYXJzZSgnJHtuYW1lfScsICcke3N0cmluZ30nKTogY2FuJ3QgcGFyc2UgdGhpc2ApO1xuXHRcdFx0cmV0dXJuIHJlc3VsdC50b1NvdXJjZSh0aGlzKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJwYXJzZXIucGFyc2UoKTogZXhwZWN0cyBvbmUgb3IgdHdvIGFyZ3VtZW50c1wiKTtcblx0XHR9XG5cdH1cblxuXHQvLyBQYXJzZSBgbmFtZWBkIHJ1bGUgYXQgaGVhZCBvZiBgc3RyZWFtYCAoYHN0cmluZ2Agb3IgYFRleHRTdHJlYW1gKS5cblx0Ly8gSGFuZGxlcyBvcHRpb25hbCBhbmQgcmVwZWF0aW5nIHJ1bGVzIGFzIHdlbGwgYXMgZWF0aW5nIHdoaXRlc3BhY2UuXG5cdC8vIFJldHVybnMgcmVzdWx0IG9mIHBhcnNlLlxuLy9URVNUTUVcblx0cGFyc2UobmFtZSwgc3RyZWFtKSB7XG5cdFx0aWYgKHR5cGVvZiBzdHJlYW0gPT09IFwic3RyaW5nXCIpIHN0cmVhbSA9IG5ldyBUZXh0U3RyZWFtKHN0cmVhbSk7XG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUobmFtZSk7XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYHBhcnNlci5wYXJzZSgke25hbWV9KTogUnVsZSBub3QgZm91bmRgKTtcblx0XHRzdHJlYW0gPSB0aGlzLmVhdFdoaXRlc3BhY2Uoc3RyZWFtKTtcblx0XHRyZXR1cm4gcnVsZS5wYXJzZSh0aGlzLCBzdHJlYW0pO1xuXHR9XG5cblx0Ly8gUGFyc2UgYSBzZXQgb2Ygc3RhdGVtZW50cyBsaW5lLWJ5LWxpbmUuXG4vL1RFU1RNRVxuXHRjb21waWxlU3RhdGVtZW50cyhzdGF0ZW1lbnRzKSB7XG5cdFx0Y29uc29sZS50aW1lKFwicGFyc2VTdGF0ZW1lbnRzXCIpO1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0bGV0IGN1cnJlbnRJbmRlbnQgPSAwO1xuXHRcdGNvbnN0IHRhYnMgPSBcIlxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFwiO1xuXHRcdC8vXG5cdFx0c3RhdGVtZW50cy5zcGxpdCgvXFxuL2cpLmZvckVhY2goc3RhdGVtZW50ID0+IHtcblx0XHRcdC8vIHNraXAgbGluZXMgdGhhdCBhcmUgYWxsIHdoaXRlc3BhY2Vcblx0XHRcdGlmIChzdGF0ZW1lbnQudHJpbSgpID09PSBcIlwiKSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChcIlwiKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBmaWd1cmUgb3V0IGluZGVudCBsZXZlbCBvZiB0aGlzIGxpbmVcblx0XHRcdGxldCBsaW5lU3RhcnQgPSBzdGF0ZW1lbnQubWF0Y2goL15cXHQqLylbMF07XG5cdFx0XHRsZXQgbGluZUluZGVudCA9IGxpbmVTdGFydC5sZW5ndGg7XG5cdFx0XHRpZiAobGluZUluZGVudCA+IGN1cnJlbnRJbmRlbnQpIHtcblx0XHRcdFx0Ly8gYWRkIHRvIGVuZCBvZiBwcmV2aW91cyBsaW5lIGlmIHBvc3NpYmxlXG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCkge1xuXHRcdFx0XHRcdC8vIGJ1dCBvbmx5IGlmIG91dHB1dCBpcyBub3QgYWxyZWFkeSBpbmRlbnRlZCB0byB0aGF0IGxldmVsXG4vL1RPRE86IGJhY2t0cmFjayBmb3IgY29tbWVudHMhISFcblx0XHRcdFx0XHRsZXQgaW5kZW50ZWRTdGFydCA9IGxpbmVTdGFydCArIFwiXFx0XCI7XG5cdFx0XHRcdFx0aWYgKCFyZXN1bHRzW3Jlc3VsdHMubGVuZ3RoIC0gMV0uc3RhcnRzV2l0aChpbmRlbnRlZFN0YXJ0KSkge1xuXHRcdFx0XHRcdFx0cmVzdWx0c1tyZXN1bHRzLmxlbmd0aCAtIDFdICs9IFwiIHtcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG4vL2NvbnNvbGUuaW5mbyhcImFscmVhZHkgaW5kZW50ZWRcIik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgcmVzdWx0cy5wdXNoKHRhYnMuc3Vic3RyKDAsIGxpbmVJbmRlbnQtMSkgKyBcIntcIik7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChsaW5lSW5kZW50IDwgY3VycmVudEluZGVudCkge1xuXHRcdFx0XHRsZXQgY2xvc2VycyA9IFtdO1xuXHRcdFx0XHRmb3IgKGxldCBpID0gY3VycmVudEluZGVudDsgaSA+IGxpbmVJbmRlbnQ7IGktLSkge1xuXHRcdFx0XHRcdGNsb3NlcnMucHVzaCh0YWJzLnN1YnN0cigwLCBpLTEpICsgXCJ9XCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIHB1dCBwYXJlbnMgQkVGT1JFIGFueSBibGFuayBsaW5lcyFcblx0XHRcdFx0bGV0IGxhc3RCbGFua0xpbmUgPSB0aGlzLl9nZXRMYXN0QmxhbmtMaW5lKHJlc3VsdHMpO1xuXHRcdFx0XHRyZXN1bHRzLnNwbGljZShsYXN0QmxhbmtMaW5lLCAwLCAuLi5jbG9zZXJzKTtcblx0XHRcdH1cblx0XHRcdGN1cnJlbnRJbmRlbnQgPSBsaW5lSW5kZW50O1xuXG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5wYXJzZShcInN0YXRlbWVudFwiLCBzdGF0ZW1lbnQpO1xuXHRcdFx0Ly8gY29tcGxhaW4gaWYgbm8gcmVzdWx0XG5cdFx0XHRpZiAoIXJlc3VsdCkge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oYENvdWxkbid0IHBhcnNlIHN0YXRlbWVudDpcXG5cXHQke3N0YXRlbWVudC50cmltKCl9YCk7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChcIi8vIENBTlQgUEFSU0U6IFwiK3N0YXRlbWVudCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBjb21wbGFpbiBjYW4ndCBwYXJzZSB0aGUgZW50aXJlIGxpbmUhXG5cdFx0XHRlbHNlIGlmIChyZXN1bHQuZW5kSW5kZXggIT09IHN0YXRlbWVudC5sZW5ndGgpIHtcblx0XHRcdFx0bGV0IHVucGFyc2VkID0gc3RhdGVtZW50LnN1YnN0cihyZXN1bHQuZW5kSW5kZXgpO1xuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJDb3VsZG4ndCBwYXJzZSBlbnRpcmUgc3RhdGVtZW50OlwiLFxuXHRcdFx0XHRcdFx0XHRcdGBcXG5cXHRcIiR7c3RhdGVtZW50LnRyaW0oKX1cImAsXG5cdFx0XHRcdFx0XHRcdFx0YFxcbnVucGFyc2VkOmAsXG5cdFx0XHRcdFx0XHRcdFx0YFxcblxcdFwiJHt1bnBhcnNlZH1cImApO1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCIvLyBDQU5UIFBBUlNFIEVOVElSRSBTVEFURU1FTlRcIik7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChcIi8vIFBBUlNFRCAgICA6IFwiICsgcmVzdWx0Lm1hdGNoZWRUZXh0KTtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKFwiLy8gQ0FOVCBQQVJTRTogXCIgKyB1bnBhcnNlZCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Ly8gc3BsaXQgYnkgbGluZXMgYW5kIGFkZCBpbmRlbnRcblx0XHRcdFx0bGV0IHNvdXJjZSA9IHJlc3VsdC50b1NvdXJjZSh0aGlzKS5zcGxpdChcIlxcblwiKVxuXHRcdFx0XHRcdFx0XHRcdC5tYXAoIGxpbmUgPT4gbGluZVN0YXJ0ICsgbGluZSApO1xuXHRcdFx0XHRyZXN1bHRzID0gcmVzdWx0cy5jb25jYXQoc291cmNlKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHdoaWxlIChjdXJyZW50SW5kZW50ID4gMCkge1xuXHRcdFx0cmVzdWx0cy5wdXNoKHRhYnMuc3Vic3RyKDAsIGN1cnJlbnRJbmRlbnQtMSkgKyBcIn1cIik7XG5cdFx0XHRjdXJyZW50SW5kZW50LS07XG5cdFx0fVxuXG5cdFx0Y29uc29sZS50aW1lRW5kKFwicGFyc2VTdGF0ZW1lbnRzXCIpO1xuXHRcdHJldHVybiByZXN1bHRzLmpvaW4oXCJcXG5cIik7XG5cdH1cblxuXHQvLyBGaWd1cmUgb3V0IHRoZSBsYXN0IGJsYW5rIGxpbmUgaW4gdGhlIHJlc3VsdHNcblx0X2dldExhc3RCbGFua0xpbmUocmVzdWx0cykge1xuXHRcdGZvciAobGV0IGkgPSByZXN1bHRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRpZiAocmVzdWx0c1tpXSA9PT0gXCJcIikgY29udGludWU7XG5cdFx0XHRyZXR1cm4gaSArIDE7XG5cdFx0fVxuXHRcdHJldHVybiAwO1xuXHR9XG5cblx0Ly8gRWF0IHdoaXRlc3BhY2UgKGFjY29yZGluZyB0byBgcnVsZXMud2hpdGVzcGFjZWApIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmVhbS5cblx0Ly8gUmV0dXJucyBuZXcgc3RyZWFtIGlmIHdlIG1hdGNoZWQgd2hpdGVzcGFjZSwgb3RoZXJ3aXNlIHRoZSBzYW1lIHN0cmVhbS5cblx0ZWF0V2hpdGVzcGFjZShzdHJlYW0pIHtcblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5ydWxlcy53aGl0ZXNwYWNlLnBhcnNlKHRoaXMsIHN0cmVhbSk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiBzdHJlYW07XG5cdFx0cmV0dXJuIHN0cmVhbS5hZHZhbmNlQnkocmVzdWx0Lm1hdGNoZWQubGVuZ3RoKTtcblx0fVxuXG4vL1xuLy9cdFJ1bGVzXG4vL1xuXG5cdC8vIEFkZCBhIHJ1bGUgdG8gb3VyIGxpc3Qgb2YgcnVsZXMhXG5cdC8vIENvbnZlcnRzIHRvIGBhbHRlcm5hdGl2ZXNgIG9uIHJlLWRlZmluaW5nIHRoZSBzYW1lIHJ1bGUuXG5cdGFkZFJ1bGUobmFtZSwgcnVsZSkge1xuXHRcdC8vIGRvbid0IG92ZXJyaWRlIHJ1bGVOYW1lXG5cdFx0aWYgKCFydWxlLnJ1bGVOYW1lKSBydWxlLnJ1bGVOYW1lID0gbmFtZTtcblxuXHRcdGxldCBleGlzdGluZyA9IHRoaXMucnVsZXNbbmFtZV07XG5cdFx0aWYgKGV4aXN0aW5nKSB7XG5cdFx0XHRpZiAoIShleGlzdGluZyBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzKSkge1xuXHRcdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQ29udmVydGluZyBydWxlICcke25hbWV9JyB0byBhbHRlcm5hdGl2ZXNgKTtcblx0XHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVOYW1lOiBuYW1lLCBydWxlczogW2V4aXN0aW5nXSB9KTtcblx0XHRcdFx0Ly8gY29weSBhcmd1bWVudCBuYW1lIG92ZXIgKD8/Pylcblx0XHRcdFx0aWYgKGV4aXN0aW5nLmFyZ3VtZW50KSB0aGlzLnJ1bGVzW25hbWVdLmFyZ3VtZW50ID0gZXhpc3RpbmcuYXJndW1lbnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoUGFyc2VyLmRlYnVnKSBjb25zb2xlLmxvZyhgQWRkaW5nIHJ1bGUgJyR7cnVsZS5ydWxlTmFtZX0nIHRvICcke25hbWV9JzogYCwgcnVsZSk7XG5cdFx0XHR0aGlzLnJ1bGVzW25hbWVdLmFkZFJ1bGUocnVsZSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dGhpcy5ydWxlc1tuYW1lXSA9IHJ1bGU7XG5cdFx0fVxuXG5cblx0XHQvLyBtYWtlIGEgbm90ZSBpZiB3ZSdyZSBhZGRpbmcgYSBsZWZ0LXJlY3Vyc2l2ZSBydWxlXG5cdFx0aWYgKHRoaXMucnVsZUlzTGVmdFJlY3Vyc2l2ZShuYW1lLCBydWxlKSkge1xuLy9jb25zb2xlLmluZm8oXCJtYXJraW5nIFwiLCBydWxlLCBcIiBhcyBsZWZ0IHJlY3Vyc2l2ZSFcIik7XG5cdFx0XHRydWxlLmxlZnRSZWN1cnNpdmUgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cblx0Ly8gSXMgdGhlIHNwZWNpZmllZCBydWxlIGxlZnQtcmVjdXJzaXZlP1xuXHRydWxlSXNMZWZ0UmVjdXJzaXZlKG5hbWUsIHJ1bGUpIHtcblx0XHRpZiAoIShydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSkpIHJldHVybiBmYWxzZTtcbi8vY29uc29sZS5sb2cobmFtZSwgcnVsZSk7XG5cdFx0Zm9yIChsZXQgc3VicnVsZSBvZiBydWxlLnJ1bGVzKSB7XG5cdFx0XHQvLyBpZ25vcmUgb3B0aW9uYWwgcnVsZXNcblx0XHRcdGlmIChzdWJydWxlLm9wdGlvbmFsKSBjb250aW51ZTtcblx0XHRcdGlmIChzdWJydWxlIGluc3RhbmNlb2YgUnVsZS5TdWJydWxlICYmIHN1YnJ1bGUucnVsZSA9PT0gbmFtZSkgcmV0dXJuIHRydWU7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cbi8vXG4vLyAjIyBVdGlsaXR5IG1ldGhvZHNcbi8vXG5cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmBcblx0Ly9cdGluIGFycmF5IG9mIGB0b2tlbnNgIChzdHJpbmdzKS5cblx0Ly8gSWYgc3VjY2Vzc2Z1bCwgcmV0dXJucyBgeyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2UgfWBcblx0Ly8gVGhyb3dzIGlmIHVuc3VjZXNzZnVsLlxuXHRzdGF0aWMgZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIHN0YXJ0VG9rZW4sIGVuZFRva2VuLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGlmICh0b2tlbnNbc3RhcnRJbmRleF0gIT09IHN0YXJ0VG9rZW4pIHRocm93IG5ldyBTeW50YXhFcnJvcihgRXhwZWN0ZWQgJyR7c3RhcnRUb2tlbn0nIGF0IGluZGV4ICR7c3RhcnRJbmRleH0gb2YgdG9rZW5zYCk7XG5cdFx0bGV0IG5lc3RpbmcgPSAwO1xuXHRcdGxldCBuZXN0ZWQgPSBmYWxzZTtcblx0XHRmb3IgKGxldCBlbmRJbmRleCA9IHN0YXJ0SW5kZXggKyAxLCBsYXN0SW5kZXggPSB0b2tlbnMubGVuZ3RoOyBlbmRJbmRleCA8IGxhc3RJbmRleDsgZW5kSW5kZXgrKykge1xuXHRcdFx0bGV0IHRva2VuID0gdG9rZW5zW2VuZEluZGV4XTtcblx0XHRcdGlmICh0b2tlbiA9PT0gc3RhcnRUb2tlbikge1xuXHRcdFx0XHRuZXN0aW5nKys7XG5cdFx0XHRcdG5lc3RlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodG9rZW4gPT09IGVuZFRva2VuKSB7XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKVxuXHRcdFx0XHRcdHJldHVybiB7IHN0YXJ0SW5kZXgsIGVuZEluZGV4LCBzbGljZTogdG9rZW5zLnNsaWNlKHN0YXJ0SW5kZXgrMSwgZW5kSW5kZXgpLCBuZXN0ZWQgfTtcblx0XHRcdFx0bmVzdGluZy0tO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENvdWxkbid0IGZpbmQgbWF0Y2hpbmcgJyR7ZW5kVG9rZW59J3Mgc3RhcnRpbmcgYXQgaXRlbSAke3N0YXJ0SW5kZXh9YCk7XG5cdH1cblxuXG5cdC8vIExpc3Qgb2Ygc3BlY2lhbCBjaGFyYWN0ZXJzIGluIHJlZ3VsYXIgZXhwcmVzc2lvbnMuXG5cdC8vIFVzZWQgdG8gZXNjYXBlIHRob3NlIGNoYXJzIHdoZW4gY3JlYXRpbmcgcmVndWxhciBleHByZXNzaW9ucyBmcm9tIHN0cmluZ3MuXG5cdHN0YXRpYyBSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTID0gKGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IGNoYXJzID0ge307XG5cdFx0XCJcXFxcL14kKis/LigpfHt9LFtdXCIuc3BsaXQoXCJcIikuZm9yRWFjaChjaGFyID0+IGNoYXJzW2NoYXJdID0gdHJ1ZSk7XG5cdFx0cmV0dXJuIGNoYXJzO1xuXHR9KSgpXG5cblx0Ly8gR2l2ZW4gYSBcIm5vcm1hbFwiIGBzdHJpbmdgLCBlc2NhcGUgYW55IHJlZ3VsYXIgZXhwcmVzc2lvbiBzcGVjaWFsIGNoYXJhY3RlcnNcblx0Ly9cdHNvIHdlIGNhbiBjcmVhdGUgYSBgbmV3IFJlZ0V4cCgpYC5cblx0Ly8gQWxzbyBjb252ZXJ0cyBhIHNpbmdsZSBzcGFjZSB0byBhcmJpdHJhcnkgc2V0IG9mIHNwYWNlcyB3aXRoIFwiXFxzK1wiXG5cdHN0YXRpYyBlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZykge1xuXHRcdHJldHVybiBzdHJpbmcuc3BsaXQoXCJcIikubWFwKGZ1bmN0aW9uIChjaGFyLCBpbmRleCwgbGlzdCkge1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBiYWNrc2xhc2hcblx0XHRcdGlmIChjaGFyID09PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiO1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBzcGFjZVxuXHRcdFx0aWYgKGNoYXIgPT09IFwiIFwiKSByZXR1cm4gXCJcXFxccytcIjtcblx0XHRcdC8vIElmIGEgc3BlY2lhbCBjaGFyIGFuZCBwcmV2aW91cyBjaGFyYWN0ZXIgd2FzIG5vdCBhbiBlc2NhcGUsIGVzY2FwZSB0aGUgcmVzdWx0LlxuXHRcdFx0aWYgKFBhcnNlci5SRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTW2NoYXJdICYmIGxpc3RbaW5kZXgtMV0gIT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCIrY2hhcjtcblx0XHRcdC8vIFRoaXMgY2hhciBzaG91bGQgYmUgZmluZSBieSBpdHNlbGYuXG5cdFx0XHRyZXR1cm4gY2hhcjtcblx0XHR9KS5qb2luKFwiXCIpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgbmV3IHJlZ3VsYXIgZXhwcmVzc2lvbiBmcm9tIGEgXCJub3JtYWxcIiBzdHJpbmcsIGVzY2FwaW5nIHNwZWNpYWwgY2hhcmFjdGVycyBhcyBuZWNlc3NhcnkuXG5cdHN0YXRpYyBSZWdFeHBGcm9tU3RyaW5nKHN0cmluZywgZmxhZ3MpIHtcblx0XHRyZXR1cm4gbmV3IFJlZ0V4cChQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpLCBmbGFncyk7XG5cdH1cblxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUGFyc2VyLmpzIiwiLy9cbi8vXHQjIENvcmUgYHJ1bGVzYCAtLSBzaW1wbGUgZGF0YXR5cGVzLCBldGMuXG4vL1xuLy8gTk9URTogbWFueSBvZiB0aGUgYmVsb3cgYXJlIGNyZWF0ZWQgYXMgY3VzdG9tIFBhdHRlcm4gc3ViY2xhc3NlcyBmb3IgZGVidWdnaW5nLlxuLy9cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gYHdoaXRlc3BhY2VgIHJ1bGUuXG4vLyBOT1RFIGBwYXJzZXIucGFyc2VSdWxlKFwid2hpdGVzcGFjZVwiLCBcIiAgIFwiKWAgd2lsbCByZXR1cm4gYHVuZGVmaW5lZGBcbi8vXHRcdCBiZWNhdXNlIGBwYXJzZXIucGFyc2VSdWxlKClgIGF1dG9tYXRpY2FsbHkgZWF0cyB3aGl0ZXNwYWNlIGF0IHRoZSBzdGFydCBvZiBhIHJ1bGUuXG5SdWxlLldoaXRlc3BhY2UgPSBjbGFzcyB3aGl0ZXNwYWNlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9XG5wYXJzZXIuYWRkUnVsZShcIndoaXRlc3BhY2VcIiwgbmV3IFJ1bGUuV2hpdGVzcGFjZSh7IHBhdHRlcm46IC9cXHMrLyB9KSk7XG5cblxuLy8gQ29tbWVudFxuUnVsZS5Db21tZW50ID0gY2xhc3MgY29tbWVudCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fVxuXG5cbi8vIGB3b3JkYCA9IGlzIGEgc2luZ2xlIGFscGhhbnVtZXJpYyB3b3JkLlxuLy8gTVVTVCBzdGFydCB3aXRoIGEgbG93ZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLldvcmQgPSBjbGFzcyB3b3JkIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJ3b3JkXCIsIG5ldyBSdWxlLldvcmQoe1xuXHRwYXR0ZXJuOiAvXFxiW2Etel1bXFx3XFwtXSpcXGIvLFxuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5cblxuLy8gYGlkZW50aWZpZXJgID0gdmFyaWFibGVzIG9yIHByb3BlcnR5IG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcblJ1bGUuSWRlbnRpZmllciA9IGNsYXNzIGlkZW50aWZpZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImlkZW50aWZpZXJcIiwgbmV3IFJ1bGUuSWRlbnRpZmllcih7XG5cdHBhdHRlcm46IC9cXGJbYS16XVtcXHdcXC1dKlxcYi8sXG5cblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIpO1xuXG4vLyBBZGQgRW5nbGlzaCBwcmVwb3NpdGlvbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vL1xuLy8gV2lraXBlZGlhIFwiUHJlcG9zaXRpb25cIjpcbi8vXHRcIlByZXBvc2l0aW9ucy4uLmFyZSBhIGNsYXNzIG9mIHdvcmRzIHRoYXRcbi8vXHRleHByZXNzIHNwYXRpYWwgb3IgdGVtcG9yYWwgcmVsYXRpb25zICAoaW4sIHVuZGVyLCB0b3dhcmRzLCBiZWZvcmUpXG4vL1x0b3IgbWFyayB2YXJpb3VzIHNlbWFudGljIHJvbGVzIChvZiwgZm9yKS5cbi8vIFRFU1RNRVxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYWJvdXRcIiwgXCJhYm92ZVwiLCBcImFmdGVyXCIsIFwiYW5kXCIsIFwiYXNcIiwgXCJhdFwiLFxuXHRcImJlZm9yZVwiLCBcImJlaGluZFwiLCBcImJlbG93XCIsIFwiYmVuZWF0aFwiLCBcImJlc2lkZVwiLCBcImJldHdlZW5cIiwgXCJiZXlvbmRcIiwgXCJieVwiLFxuXHRcImRlZmluZWRcIiwgXCJkb3duXCIsIFwiZHVyaW5nXCIsXG5cdFwiZWFjaFwiLCBcImVtcHR5XCIsIFwiZXhhY3RseVwiLCBcImV4Y2VwdFwiLFxuXHRcImZvclwiLCBcImZyb21cIixcblx0XCJncmVhdGVyXCIsXG5cdFwiSVwiLCBcImluXCIsIFwiaW50b1wiLFxuXHRcImxlc3NcIiwgXCJsb25nXCIsXG5cdFwibWVcIiwgXCJtaW51c1wiLCBcIm1vcmVcIixcblx0XCJuZWFyXCIsIFwibm90XCIsXG5cdFwib2ZcIiwgXCJvZmZcIiwgXCJvblwiLCBcIm9udG9cIiwgXCJvcHBvc2l0ZVwiLCBcIm91dFwiLCBcIm91dHNpZGVcIiwgXCJvdmVyXCIsXG5cdFwic2hvcnRcIiwgXCJzaW5jZVwiLFxuXHRcInRoYW5cIiwgXCJ0aGVcIiwgXCJ0aGVuXCIsIFwidGhyb3VnaFwiLCBcInRocnVcIiwgXCJ0b1wiLCBcInRvd2FyZFwiLCBcInRvd2FyZHNcIixcblx0XCJ1bmRlZmluZWRcIiwgXCJ1bmRlclwiLCBcInVuZGVybmVhdGhcIiwgXCJ1bmlxdWVcIiwgXCJ1bnRpbFwiLCBcInVwXCIsIFwidXBvblwiLCBcInVwc2lkZVwiLFxuXHRcInZlcnN1c1wiLCBcInZzXCIsXG5cdFwid2hlcmVcIiwgXCJ3aXRoXCIsIFwid2l0aGluXCIsIFwid2l0aG91dFwiLFxuKTtcblxuLy8gQWRkIGNvbW1vbiBlbmdsaXNoIHZlcmJzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYXJlXCIsXG5cdFwiZG9cIiwgXCJkb2VzXCIsXG5cdFwiY29udGFpbnNcIixcblx0XCJoYXNcIiwgXCJoYXZlXCIsXG5cdFwiaXNcIixcblx0XCJyZXBlYXRcIixcblx0XCJ3YXNcIiwgXCJ3ZXJlXCJcbik7XG5cbi8vIEFkZCBzcGVjaWFsIGNvbnRyb2wga2V5d29yZHMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJlbHNlXCIsXG5cdFwiaWZcIixcblx0XCJvdGhlcndpc2VcIixcblx0XCJ3aGlsZVwiXG4pO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLlR5cGUgPSBjbGFzcyB0eXBlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJ0eXBlXCIsIG5ldyBSdWxlLlR5cGUoe1xuXHRwYXR0ZXJuOiAvKFtBLVpdW1xcd1xcLV0qfHRleHR8bnVtYmVyfGludGVnZXJ8ZGVjaW1hbHxjaGFyYWN0ZXJ8Ym9vbGVhbnxvYmplY3QpLyxcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdGxldCB2YWx1ZSA9IHRoaXMubWF0Y2hlZDtcblx0XHRzd2l0Y2godmFsdWUpIHtcblx0XHRcdC8vIHNwZWNpYWwgY2FzZSB0byB0YWtlIHRoZSBmb2xsb3dpbmcgYXMgbG93ZXJjYXNlXG5cdFx0XHRjYXNlIFwidGV4dFwiOlx0XHRyZXR1cm4gXCJTdHJpbmdcIjtcblx0XHRcdGNhc2UgXCJjaGFyYWN0ZXJcIjpcdHJldHVybiBcIkNoYXJhY3RlclwiO1xuXHRcdFx0Y2FzZSBcIm51bWJlclwiOlx0XHRyZXR1cm4gXCJOdW1iZXJcIjtcblx0XHRcdGNhc2UgXCJpbnRlZ2VyXCI6XHRcdHJldHVybiBcIkludGVnZXJcIjtcblx0XHRcdGNhc2UgXCJkZWNpbWFsXCI6XHRcdHJldHVybiBcIkRlY2ltYWxcIjtcblx0XHRcdGNhc2UgXCJib29sZWFuXCI6XHRcdHJldHVybiBcIkJvb2xlYW5cIjtcblx0XHRcdGNhc2UgXCJvYmplY3RcIjpcdFx0cmV0dXJuIFwiT2JqZWN0XCI7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gdmFsdWUucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0XHR9XG5cdH1cbn0pKTtcbnBhcnNlci5ydWxlcy50eXBlLmFkZFRvQmxhY2tsaXN0KFwiSVwiKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMudHlwZSk7XG5cblxuLy8gYG51bWJlcmAgYXMgZWl0aGVyIGZsb2F0IG9yIGludGVnZXIsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHlvdSBjYW4gYWxzbyB1c2UgYG9uZWAuLi5gdGVuYCBhcyBzdHJpbmdzLlxuUnVsZS5OdW1iZXIgPSBjbGFzcyBudW1iZXIgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcIm51bWJlclwiLCBuZXcgUnVsZS5OdW1iZXIoe1xuXHRwYXR0ZXJuOiAvKC0/KFswLTldKlsuXSk/WzAtOV0rfG9uZXx0d298dGhyZWV8Zm91cnxmaXZlfHNpeHxzZXZlbnxlaWdodHxuaW5lfHRlbikvLFxuXHQvLyBDb252ZXJ0IHRvIG51bWJlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZTogZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdHZhciBudW1iZXIgPSBwYXJzZUZsb2F0KHRoaXMubWF0Y2hlZCwgMTApO1xuXHRcdGlmICghaXNOYU4obnVtYmVyKSkgcmV0dXJuIG51bWJlcjtcblxuXHRcdHN3aXRjaCh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJvbmVcIjogcmV0dXJuIDE7XG5cdFx0XHRjYXNlIFwidHdvXCI6IHJldHVybiAyO1xuXHRcdFx0Y2FzZSBcInRocmVlXCI6IHJldHVybiAzO1xuXHRcdFx0Y2FzZSBcImZvdXJcIjogcmV0dXJuIDQ7XG5cdFx0XHRjYXNlIFwiZml2ZVwiOiByZXR1cm4gNTtcblx0XHRcdGNhc2UgXCJzaXhcIjogcmV0dXJuIDY7XG5cdFx0XHRjYXNlIFwic2V2ZW5cIjogcmV0dXJuIDc7XG5cdFx0XHRjYXNlIFwiZWlnaHRcIjogcmV0dXJuIDg7XG5cdFx0XHRjYXNlIFwibmluZVwiOiByZXR1cm4gOTtcblx0XHRcdGNhc2UgXCJ0ZW5cIjogcmV0dXJuIDEwO1xuXHRcdH1cblx0fVxufSkpO1xucGFyc2VyLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHBhcnNlci5ydWxlcy5udW1iZXIpO1xuXG4vLyBBZGQgbnVtYmVyIHdvcmRzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxucGFyc2VyLnJ1bGVzLmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwib25lXCIsIFwidHdvXCIsIFwidGhyZWVcIiwgXCJmb3VyXCIsIFwiZml2ZVwiLFxuXHRcInNpeFwiLCBcInNldmVuXCIsIFwiZWlnaHRcIiwgXCJuaW5lXCIsIFwidGVuXCJcbik7XG5cbi8vIE51bWVyaWMgYGludGVnZXJgIG9ubHksIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHRoaXMgV0lMTCBtYXRjaCBhIGZsb2F0LCBidXQgdGhlIHJldHVybmVkIHZhbHVlIHdpbGwgY29lcmNlIHRvIGFuIGludGVnZXIuXG4vLyBSRVZJRVc6IGlzIHRoaXMgcmlnaHQ/ICBCZXR0ZXIgdG8gbm90IG1hdGNoIGEgZmxvYXQ/XG5SdWxlLkludGVnZXIgPSBjbGFzcyBpbnRlZ2VyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHt9O1xucGFyc2VyLmFkZFJ1bGUoXCJpbnRlZ2VyXCIsIG5ldyBSdWxlLkludGVnZXIoe1xuXHRwYXR0ZXJuOiAvLT8oWzAtOV0qWy5dKT9bMC05XSsvLFxuXHQvLyBDb252ZXJ0IHRvIGludGVnZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2U6IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gcGFyc2VJbnQodGhpcy5tYXRjaGVkLCAxMCk7XG5cdH1cbn0pKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuLy8gVE9ETzogZXNjYXBlZCBxdW90ZXMgaW5zaWRlIHN0cmluZ1xuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7fTtcbnBhcnNlci5hZGRSdWxlKFwidGV4dFwiLCBuZXcgUnVsZS5UZXh0KHtcblx0cGF0dGVybjogLyg/OlwiW15cIl0qXCJ8J1teJ10qJykvXG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLnRleHQpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cblJ1bGUuQm9vbGVhbiA9IGNsYXNzIGJvb2xlYW4gZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge307XG5wYXJzZXIuYWRkUnVsZShcImJvb2xlYW5cIiwgbmV3IFJ1bGUuQm9vbGVhbih7XG5cdHBhdHRlcm46IC8odHJ1ZXxmYWxzZXx5ZXN8bm98b2t8Y2FuY2VsKVxcYi8sXG5cdHRvU291cmNlOiBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59KSk7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLmJvb2xlYW4pO1xuLy8gQWRkIGJvb2xlYW4gdG9rZW5zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy8gVEVTVE1FXG5wYXJzZXIucnVsZXMuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJ0cnVlXCIsIFwiZmFsc2VcIixcblx0XCJ5ZXNcIiwgXCJub1wiLFxuXHRcIm9rXCIsIFwiY2FuY2VsXCJcbik7XG5cbi8vIExpdGVyYWwgbGlzdCAoYXJyYXkpLCBlZzogIGBbMSwyLHRydWUsZmFsc2UgXWBcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpdGVyYWxfbGlzdFwiLFxuXHRcIlxcXFxbW2xpc3Q6e2V4cHJlc3Npb259LF0/XFxcXF1cIixcblx0Y2xhc3MgbGl0ZXJhbF9saXN0IGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiBzdXBlci5yZXN1bHRzLmxpc3Q7XG5cdFx0fVxuXG5cdFx0Z2V0SXRlbShpbmRleCkge1xuXHRcdFx0bGV0IGxpc3QgPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZiAobGlzdCkgcmV0dXJuIGxpc3QubWF0Y2hlZFtpbmRleF07XG5cdFx0fVxuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGxpc3QgPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRpZiAoIWxpc3QpIHJldHVybiBcIltdXCI7XG4gXHRcdFx0cmV0dXJuIGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvblxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvblwiLFxuXHRcIlxcXFwoe2V4cHJlc3Npb259XFxcXClcIixcblx0Y2xhc3MgcGFyZW50aGVzaXplZF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiB0aGlzLm1hdGNoZWRbMV07XG5cdFx0fVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBleHByZXNzaW9uID0gdGhpcy5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gZG9uJ3QgZG91YmxlIHBhcmVucyBpZiBub3QgbmVjZXNzYXJ5XG5cdFx0XHRpZiAodHlwZW9mIGV4cHJlc3Npb24gPT09IFwic3RyaW5nXCIgJiYgZXhwcmVzc2lvbi5zdGFydHNXaXRoKFwiKFwiKSAmJiBleHByZXNzaW9uLmVuZHNXaXRoKFwiKVwiKSkgcmV0dXJuIGV4cHJlc3Npb247XG5cdFx0XHRyZXR1cm4gYCgke2V4cHJlc3Npb259KWA7XG5cdFx0fVxuXHR9XG4pXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY29yZS5qcyIsIi8vIE1ha2Ugc3VyZSBgZ2xvYmFsYCBpcyBkZWZpbmVkIGdsb2JhbGx5OlxuLy9cdC0gZWl0aGVyIGFzIHRoZSBub2RlanMgYGdsb2JhbGAsIG9yXG4vL1x0LSBhcyBhbiBhbGlhcyBmb3IgYHdpbmRvd2AgaW4gYnJvd3NlcnMsIG9yXG4vL1x0LSBmb3IgdGhlIGBzZWxmYCBjb250ZXh0IGluIHdlYiB3b3JrZXJzLlxuLy9cbi8vIE5PVEU6IHRoaXMgbW9kaWZpZXMgdGhlIFwiZ2xvYmFsXCIgZW52aXJvbm1lbnQgYnkgbWFraW5nIHN1cmUgXCJnbG9iYWxcIiBpcyBzZXQuIVxuLy9cblxubGV0IGdsb2JhbF9pZGVudGlmaWVyO1xuaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gbm9kZVwiKTtcblx0Z2xvYmFsX2lkZW50aWZpZXIgPSBnbG9iYWw7XG59XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4vL1x0Y29uc29sZS5sb2coXCJSdW5uaW5nIGluIGEgd2ViIGJyb3dzZXJcIik7XG5cdHdpbmRvdy5nbG9iYWwgPSB3aW5kb3c7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gd2luZG93O1xufVxuXG5pZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gYSB3ZWIgd29ya2VyXCIpO1xuXHRzZWxmLmdsb2JhbCA9IHNlbGY7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gc2VsZjtcbn1cblxuLy8gRXhwb3J0IGZvciBjb25zdW1wdGlvbiBieSBpbXBvcnQuXG5leHBvcnQgZGVmYXVsdCBnbG9iYWxfaWRlbnRpZmllcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3V0aWxzL2dsb2JhbC5qcyIsIlxuLy8gVE9ETzogY29udmVydCB0byBsaW5lLWF3YXJlIHN0cmVhbT8/P1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGV4dFN0cmVhbSB7XG5cdC8vIFlvdSBjYW4gY29uc3RydWN0IHdpdGggYSB0ZXh0IHN0cmluZyBvciBhIHNldCBvZiBwcm9wZXJ0aWVzIChpbmNsdWRpbmcgYHRleHRgKS5cblx0Y29uc3RydWN0b3IoLi4udGV4dE9yUHJvcHMpIHtcblx0XHR0ZXh0T3JQcm9wcy5mb3JFYWNoKChhcmcpID0+IHtcblx0XHRcdGlmICh0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdHRoaXMudGV4dCA9IGFyZztcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGFyZykge1xuXHRcdFx0XHRPYmplY3QuYXNzaWduKHRoaXMsIGFyZyk7XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8vIE1ha2Ugc3VyZSBgdGV4dGAgYW5kIGBzdGFydEluZGV4YCBhcmUgZGVmaW5lZC5cblx0XHRpZiAoIShcInRleHRcIiBpbiB0aGlzKSkgdGhpcy50ZXh0ID0gXCJcIjtcblx0XHRpZiAoIShcInN0YXJ0SW5kZXhcIiBpbiB0aGlzKSkgdGhpcy5zdGFydEluZGV4ID0gMDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBpbW11dGFibGUgY2xvbmUgb2YgdGhlIHN0cmVhbS5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRyZXR1cm4gbmV3IFRleHRTdHJlYW0odGhpcywgcHJvcHMpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jZWQgdG8gbmV3IHN0YXJ0SW5kZXguXG5cdGFkdmFuY2VUbyhzdGFydEluZGV4KSB7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBzdGFydEluZGV4IH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIHN0cmVhbSwgYWR2YW5jaW5nIHN0YXJ0SW5kZXggQlkgYGxlbmd0aGBcblx0YWR2YW5jZUJ5KGxlbmd0aCkge1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHsgc3RhcnRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuXHR9XG5cbi8vIFx0Ly8gUmV0dXJuIGNsb25lIG9mIHRoaXMgc3RyZWFtIHdpdGggZW5kSW5kZXggc2V0IHRvIHN0YXJ0ICsgYGxlbmd0aGBcbi8vIFx0ZW5kQWZ0ZXIobGVuZ3RoKSB7XG4vLyBcdFx0cmV0dXJuIHRoaXMuY2xvbmUoeyBlbmRJbmRleDogdGhpcy5zdGFydEluZGV4ICsgbGVuZ3RoIH0pO1xuLy8gXHR9XG5cbi8vXG4vLyAjIyBNYXRjaGluZ1xuLy9cblx0Ly8gTWF0Y2ggYHBhdHRlcm5gIGFzIHJlZ2V4IGluIHRoaXMgc3RyZWFtLlxuXHQvLyBSZXR1cm5zIG1hdGNoIG9yIGB1bmRlZmluZWRgLlxuXHQvLyBJZiB5b3Ugd2FudCB0byB0ZXN0IHRoZSBzdGFydCBvZiB0aGUgc3RyZWFtLFxuXHQvL1x0bWFrZSBzdXJlIHlvdXIgcmVnZXggc3RhcnRzIHdpdGggYF5gLlxuXHQvLyBURVNUTUU6IHRoaXMgbGlrZWx5IGJyZWFrcyB3aXRoIGEgYGdgIG9uIHRoZSBwYXR0ZXJuP1xuXHRtYXRjaChwYXR0ZXJuKSB7XG5cdFx0aWYgKCEocGF0dGVybiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHRocm93IG5ldyBUeXBlRXJyb3IoYFRleHRTdHJlYW0ubWF0Y2goJHtwYXR0ZXJufSk6IGV4cGVjdGVkIFJlZ0V4cGApO1xuLy9UT0RPOiB1c2UgYHN0cmVhbS5yYW5nZWAgdG8gZW5zdXJlIG1hdGNoIGlzIG5vdCBub3QgYmV5b25kIGBzdHJpbmcuZW5kSW5kZXhgXG5cdFx0cmV0dXJuIHRoaXMuaGVhZC5tYXRjaChwYXR0ZXJuKSB8fCB1bmRlZmluZWQ7XG5cdH1cblxuXHQvLyBEb2VzIHRoaXMgc3RyZWFtIElOQ0xVREUgYSByZWdleCB3aXRoaW4gaXQ/XG5cdC8vIFJldHVybnMgYHRydWVgIG9yIGBmYWxzZWAuXG5cdC8vIE5PVEU6IFBhdHRlcm4gbXVzdCBOT1Qgc3RhcnQgd2l0aCBgXmAgZm9yIHRoaXMgdG8gbWF0Y2ggaW4gdGhlIG1pZGRsZSBvZiB0aGUgc3RyZWFtLlxuXHR0ZXN0KHBhdHRlcm4pIHtcblx0XHRyZXR1cm4gcGF0dGVybi50ZXN0KHRoaXMuaGVhZCk7XG5cdH1cblxuLy9cbi8vICMjIFJlZmxlY3Rpb25cbi8vXG5cdC8vIFJldHVybiB0ZXh0IG9mIHN0cmluZyBzdGFydGluZyBhdCBvdXIgYHN0YXJ0SW5kZXhgXG5cdGdldCBoZWFkKCkge1xuXHRcdHJldHVybiB0aGlzLnJhbmdlKCk7XG5cdH1cblxuXHQvLyBSZXR1cm4gYSByYW5nZSBvZiB0aGUgc3RyaW5nIGZyb20gYHN0YXJ0SW5kZXhgIHRvIGBlbmRJbmRleGAgTk9OLWluY2x1c2l2ZS5cblx0cmFuZ2Uoc3RhcnRJbmRleCA9IHRoaXMuc3RhcnRJbmRleCwgZW5kSW5kZXggPSB0aGlzLmVuZEluZGV4IHx8IHRoaXMudGV4dC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0LnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmRJbmRleCk7XG5cdH1cblxuXHQvLyBMZW5ndGggb2YgdGhlIHN0cmVhbS5cblx0Z2V0IGxlbmd0aCgpIHtcblx0XHRyZXR1cm4gdGhpcy50ZXh0Lmxlbmd0aDtcblx0fVxuXG5cdC8vIEFyZSB3ZSBhdCB0aGUgZW5kIG9mIHRoZSBzdHJlYW0/XG5cdGdldCBpc0VtcHR5KCkge1xuXHRcdHJldHVybiB0aGlzLnN0YXJ0SW5kZXggPT09IHRoaXMubGVuZ3RoO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMudGV4dFxuXHR9O1xufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1RleHRTdHJlYW0uanMiLCJpbXBvcnQgZ2xvYmFsIGZyb20gXCIuL2dsb2JhbFwiO1xuXG4vLyBSZXR1cm4gdGhlIHBsdXJhbCBvZiBgd29yZGAuXG4vLyBOT1RFOiB0aGlzIGlzIG5vdCB2ZXJ5IGdvb2QgYXQgYWxsISEhXG4vLyBUT0RPOiBleGNlcHRpb25zLCBldGMuXG5leHBvcnQgZnVuY3Rpb24gcGx1cmFsaXplKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQgKyBcInNcIjtcbn1cblxuLy8gUmV0dXJuIHRydWUgaWYgd29yZCBpcyBhIHBsdXJhbC5cbi8vIE5PVEU6IGZvciB3b3JkcyB3aGljaCBhcmUgQk9USCBzaW5ndWxhciBhbmQgcGx1cmFsLCB0aGlzIHdpbGwgcmV0dXJuIHRydWUuXG5leHBvcnQgZnVuY3Rpb24gaXNQbHVyYWwod29yZCkge1xuXHRyZXR1cm4gd29yZCA9PT0gcGx1cmFsaXplKHdvcmQpO1xufVxuXG5cbi8vIFJldHVybiB0aGUgc2luZ3VsYXIgb2YgYHdvcmRgLlxuLy8gTk9URTogdGhpcyBpcyBub3QgdmVyeSBnb29kIGF0IGFsbCEhIVxuLy8gVE9ETzogZXhjZXB0aW9ucywgZXRjLlxuZXhwb3J0IGZ1bmN0aW9uIHNpbmd1bGFyaXplKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQucmVwbGFjZSgvZT9zJC8sIFwiXCIpO1xufVxuXG4vLyBSZXR1cm4gdHJ1ZSBpZiB3b3JkIGlzIGEgc2luZ3VsYXIuXG4vLyBOT1RFOiBmb3Igd29yZHMgd2hpY2ggYXJlIEJPVEggc2luZ3VsYXIgYW5kIHBsdXJhbCwgdGhpcyB3aWxsIHJldHVybiB0cnVlLlxuZXhwb3J0IGZ1bmN0aW9uIGlzU2luZ3VsYXIod29yZCkge1xuXHRyZXR1cm4gd29yZCA9PT0gc2luZ3VsYXJpemUod29yZCk7XG59XG5cblxuLy8gRXhwb3J0IGFsbCBhcyBhIGx1bXBcbmxldCBhbGxFeHBvcnRzID0gey4uLmV4cG9ydHN9O1xuZXhwb3J0IGRlZmF1bHQgYWxsRXhwb3J0cztcblxuLy8gREVCVUc6IHB1dCBvbiBnbG9iYWwgZm9yIGRlYnVnZ2luZy5cbmdsb2JhbC5TVFJJTkcgPSBhbGxFeHBvcnRzO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3V0aWxzL3N0cmluZy5qcyIsImltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBsb2FkIHN0YW5kYXJkIHJ1bGVzIGZpbGVzIGhlcmVcbmltcG9ydCBcIi4vY29yZVwiO1xuaW1wb3J0IFwiLi9saXN0c1wiO1xuaW1wb3J0IFwiLi9vcGVyYXRvcnNcIjtcbmltcG9ydCBcIi4vaWZcIjtcbmltcG9ydCBcIi4vc3RhdGVtZW50c1wiO1xuaW1wb3J0IFwiLi90eXBlc1wiO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2luZGV4LmpzIiwiaW1wb3J0IFRleHRTdHJlYW0gZnJvbSBcIi4vVGV4dFN0cmVhbS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9pbmRleC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0d2luZG93LlRleHRTdHJlYW0gPSBUZXh0U3RyZWFtO1xuXHR3aW5kb3cuUGFyc2VyID0gUGFyc2VyO1xuXHR3aW5kb3cuUnVsZSA9IFJ1bGU7XG5cdHdpbmRvdy5wYXJzZXIgPSBwYXJzZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0VGV4dFN0cmVhbSwgUGFyc2VyLCBSdWxlLCBwYXJzZXJcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIiwiLy8gTWVtb2l6ZS9mb3JnZXQgc2VtYW50aWNzLlxuXG4vLyBSZXR1cm4gYSBtZW1vaXppbmcgZ2V0dGVyIGZ1bmN0aW9uLlxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXNbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGdldHRlci5hcHBseSh0aGlzKTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIERlZmluZSBzbyB0aGF0IHdlIGNhbiBiZSBkZWxldGVkIGFuZCByZS1kZWZpbmVkLCBidXQgbm90IHNldCBvciBlbnVtZXJhdGVkLlxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcGVydHksIHsgdmFsdWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXNbcHJvcGVydHldO1xuXHR9XG59XG5cblxuLy8gUmV0dXJuIGEgbWVtb2l6ZSBmdW5jdGlvbiBmb3IgdXNlIGFzIGEgZ2V0dGVyIGluIGEgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYFxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4ge1xuXHRcdGdldCA6IG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpXG5cdH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9tZW1vaXplLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiaWZcIixcblx0XCJpZiB7ZXhwcmVzc2lvbn0gKHRoZW58Oik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBpZl8gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblxuXHRcdFx0aWYgKHN0YXRlbWVudCkgcmV0dXJuIGBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGlmICgke2V4cHJlc3Npb259KWBcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiYmFja3dhcmRzX2lmXCIsXG5cdFwie3N0YXRlbWVudH0gaWYge2V4cHJlc3Npb259IChlbHNlUGhyYXNlOihlbHNlfG90aGVyd2lzZSkge3N0YXRlbWVudH0pP1wiLFxuXHRjbGFzcyBiYWNrd2FyZHNfaWYgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgc3RhdGVtZW50LCBlbHNlUGhyYXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHN0YXRlbWVudCA9IHN0YXRlbWVudCA/IHN0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KSA6IHVuZGVmaW5lZDtcblx0XHRcdGxldCBlbHNlU3RhdGVtZW50ID0gZWxzZVBocmFzZSAmJiBlbHNlUGhyYXNlLnJlc3VsdHMuc3RhdGVtZW50LnRvU291cmNlKCk7XG5cblx0XHRcdGlmIChlbHNlU3RhdGVtZW50KSByZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9IGVsc2UgeyAke2Vsc2VTdGF0ZW1lbnR9IH1gXG5cdFx0XHRyZXR1cm4gYGlmICgke2V4cHJlc3Npb259KSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZWxzZV9pZlwiLFxuXHRcIihlbHNlfG90aGVyd2lzZSkgaWYge2V4cHJlc3Npb259ICh0aGVufDopIHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBlbHNlX2lmIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHN0YXRlbWVudCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSBpZiAoJHtleHByZXNzaW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGVsc2UgaWYgKCR7ZXhwcmVzc2lvbn0pYFxuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJlbHNlXCIsXG5cdFwiKGVsc2V8b3RoZXJ3aXNlKSB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZWxzZV8gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiB1bmRlZmluZWQ7XG5cblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgZWxzZWBcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaWYuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBsaXN0c1xuLy9cblxuLy8gVE9ETzogY29uZmlybSBpZGVudGlmaWVycyBhcmUgcGx1cmFsIGluIHNvbWUgb2YgdGhlIGJlbG93P1xuLy8gVE9ETzogYGxpc3QuY2xvbmUoKWAgdG8gcmV0dXJuIG5ldyBsaXN0IG9mIHNhbWUgdHlwZS5cblxuaW1wb3J0IHsgaXNQbHVyYWwsIHNpbmd1bGFyaXplIH0gZnJvbSBcIi4uL3V0aWxzL3N0cmluZ1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gV09SS0lORyBGUk9NIE9USEVSIFJVTEVTICh0ZXN0bWUpXG4vL1x0YHRoZSBsZW5ndGggb2YgPGxpc3Q+YFxuLy9cdGA8dGhpbmc+IGlzIG5vdD8gaW4gPGxpc3Q+YFxuLy9cdGA8bGlzdD4gaXMgbm90PyBlbXB0eWBcbi8vXHRgc2V0IGl0ZW0gMSBvZiBteUxpc3QgdG8gJ2EnYFxuXG5cbi8vIFRPRE86IFx0YGNyZWF0ZSBsaXN0IHdpdGggPGV4cD4sIDxleHA+LCA8ZXhwPmBcbi8vIFRPRE86XHRgZHVwbGljYXRlIGxpc3RgXG4vLyBUT0RPOlx0YGR1cGxpY2F0ZSBsaXN0IHdpdGggPGV4cD4sIDxleHA+LCA8ZXhwPmAgPz8/XG4vLyBUT0RPOlx0YHRoZSBzaXplIG9mIDxsaXN0PmAgPT4gd2lsbCBtYXAgdG8gYGxpc3Quc2l6ZWAuLi5cbi8vXHRcdFx0XHQtIGluc3RhbGwgYHNpemVgIGFzIGFuIGFsaWFzIHRvIGBsZW5ndGhgP1xuLy8gVE9ETzpcdGBtb3ZlIDx0aGluZz4gdG8gZW5kIG9mIDxsaXN0PmAgPz8/XG4vLyBUT0RPOlx0YFNldGAgZm9yIGEgdW5pcXVlIGxpc3Q/XG4vLyBUT0RPOlx0dHlwZWQgbGlzdD9cbi8vIFRPRE86XHRsaXN0IHdoaWNoIHdvbid0IHRha2UgbnVsbC91bmRlZmluZWRcblxuXG4vLyBSZXR1cm4gdGhlIGxlbmd0aCBvZiB0aGUgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXN0X2xlbmd0aFwiLFxuXHRcInRoZT8gbnVtYmVyIG9mIHtpZGVudGlmaWVyfSBpbiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X2xlbmd0aCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QsIGlkZW50aWZpZXIgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGxpc3QgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYCR7bGlzdH0ubGVuZ3RoYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJldHVybiB0aGUgZmlyc3QgcG9zaXRpb24gb2Ygc3BlY2lmaWVkIGl0ZW0gaW4gdGhlIGxpc3QgYXMgYW4gYXJyYXkuXG4vLyBJZiBpdGVtIGlzIG5vdCBmb3VuZCwgcmV0dXJucyBgdW5kZWZpbmVkYC5cbi8vIE5PVEU6IHRoaXMgcG9zaXRpb24gcmV0dXJuZWQgaXMgKioxLWJhc2VkKiouXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGlzdF9wb3NpdGlvblwiLFxuXHRcInRoZT8gcG9zaXRpb24gb2Yge3RoaW5nOmV4cHJlc3Npb259IGluIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcG9zaXRpb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0dGhpbmcgPSB0aGluZy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxpc3QgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5wb3NpdGlvbk9mKCR7dGhpbmd9LCAke2xpc3R9KWBcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRPcmRpbmFsIG51bWJlcnMgKGZpcnN0LCBzZWNvbmQsIGxhc3QsIGV0YykuXG4vLyBUT0RPOiBzaXh0eS1maWZ0aCwgdHdvIGh1bmRyZWQgZm9ydHkgbmludGguLi5cbi8vXG5jbGFzcyBvcmRpbmFsIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHt9XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaXJzdFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2Vjb25kXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJ0aGlyZFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAzIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZm91cnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDQgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaWZ0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA1IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2l4dGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNiB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNldmVudGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNyB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImVpZ2h0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA4IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwibmludGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gOSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInRlbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDEwIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwicGVudWx0aW1hdGVcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaW5hbFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAtMSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImxhc3RcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cblxuLy8gdHJlYXQgbGlzdCBhcyBhIHN0YWNrIG9yIHF1ZXVlXG4vL1RFU1RNRVxucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwidG9wXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDEgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJib3R0b21cIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cblxuLy8gSW5kZXggZXhwcmVzc2lvbjogbnVtZXJpYyBwb3NpdGlvbiBpbiBzb21lIGxpc3QuXG4vL1x0ZS5nLlx0YGNhcmQgMSBvZiB0aGUgcGlsZWBcbi8vXHRcdFx0YGNhcmQgIzIgb2YgdGhlIHBpbGVgXG4vL1x0XHRcdGB0aGUgZmlyc3QgY2FyZCBvZiB0aGUgcGlsZWBcbi8vXG4vLyBOT1RFOiBOZWdhdGl2ZSBudW1lcmljIHBvc2l0aW9ucyBjb21lIGZyb20gdGhlIEVORCBvZiB0aGUgbGlzdC5cbi8vXHRlLmcuXHRgY2FyZCAtMSBvZiB0aGUgcGlsZWBcbi8vXG4vLyBOT1RFOiBPdXIgcG9zaXRpb25zIGFyZSAqKjEtYmFzZWQqKiBhbmQgSmF2YXNjcmlwdCBpcyAqKjAtYmFzZWQqKi5cbi8vXHRcdCBlLmcuIGBpdGVtIDEgb2YgdGhlIGFycmF5YCAgPSBgYXJyYXlbMF1gXG4vL1xuLy8gVE9ETzogaWYgYGlkZW50aWZpZXJgIGlzIFwid29yZFwiLCBvdXRwdXQgYGdldFdvcmQoKWAgZXRjXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwb3NpdGlvbl9leHByZXNzaW9uXCIsXG5cdFtcblx0XHRcIntpZGVudGlmaWVyfSAoIyk/e3Bvc2l0aW9uOmV4cHJlc3Npb259IG9mICh0aGU/KSB7ZXhwcmVzc2lvbn1cIixcblx0XHRcInRoZSB7cG9zaXRpb246b3JkaW5hbH0ge2lkZW50aWZpZXJ9IG9mICh0aGU/KSB7ZXhwcmVzc2lvbn1cIlxuXHRdLFxuXHRjbGFzcyBwb3NpdGlvbl9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9ue1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIHBvc2l0aW9uLCBleHByZXNzaW9uIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRleHByZXNzaW9uID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHBvc2l0aW9uID0gcG9zaXRpb24udG9Tb3VyY2UoY29udGV4dCk7XG5cblx0XHRcdC8vIElmIHdlIGdvdCBhIHBvc2l0aXZlIG51bWJlciBsaXRlcmFsLCBjb21wZW5zYXRlIGZvciBKUyAwLWJhc2VkIGFycmF5cyBub3csXG5cdFx0XHQvLyBmb3IgbmljZXIgb3V0cHV0LlxuXHRcdFx0aWYgKHR5cGVvZiBwb3NpdGlvbiA9PT0gXCJudW1iZXJcIiAmJiBwb3NpdGlvbiA+IDApIHtcblx0XHRcdFx0cmV0dXJuIGAke2V4cHJlc3Npb259WyR7cG9zaXRpb24gLSAxfV1gO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7cG9zaXRpb259KWA7XG5cblx0Ly8gVGhpcyBpcyBzYWZlciwgYnV0IHVzaW5nIHRoZSBhYm92ZSBzb21ldGltZXMgZm9yIGRlbW8gcHVycG9zZXNcblx0Ly9cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7cG9zaXRpb259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBQaWNrIGEgU0lOR0xFIHJhbmRvbSBpdGVtIGZyb20gdGhlIGxpc3QuXG4vLyBUT0RPOiBjb25maXJtIGlkZW50aWZpZXIgaXMgcGx1cmFsP1xuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmRvbV9wb3NpdGlvbl9leHByZXNzaW9uXCIsXG5cdFwiYSByYW5kb20ge2lkZW50aWZpZXJ9IChvZnxmcm9tfGluKSAodGhlKT8ge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcmFuZG9tX3Bvc2l0aW9uX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGxpc3QgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5kb21JdGVtT2YoJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gUGljayBhIHVuaXF1ZSBzZXQgb2YgcmFuZG9tIGl0ZW1zIGZyb20gdGhlIGxpc3QsIHJldHVybmluZyBhbiBhcnJheS5cbi8vIFRPRE86IGB0d28gcmFuZG9tIGl0ZW1zLi4uYFxuLy8gVE9ETzogY29uZmlybSBpZGVudGlmaWVyIGlzIHBsdXJhbD9cbi8vIFRPRE86IGBsaXN0LmNsb25lKClgIHRvIHJldHVybiBuZXcgbGlzdCBvZiBzYW1lIHR5cGUuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZG9tX3Bvc2l0aW9uc19leHByZXNzaW9uXCIsXG5cdFwie251bWJlcn0gcmFuZG9tIHtpZGVudGlmaWVyfSAob2Z8ZnJvbXxpbikgKHRoZSk/IHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJhbmRvbV9wb3NpdGlvbnNfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbnVtYmVyLCBsaXN0IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRudW1iZXIgPSBudW1iZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsaXN0ID0gbGlzdC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0UmFuZG9tSXRlbXNPZigke2xpc3R9LCAke251bWJlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gUmFuZ2UgZXhwcmVzc2lvbi5cbi8vIFJldHVybnMgYSBuZXcgbGlzdC5cbi8vIE5PVEU6IGBzdGFydGAgaXMgKioxLWJhc2VkKiouXG4vLyBOT1RFOiBgZW5kYCBpcyBpbmNsdXNpdmUhXG4vLyBUT0RPOiBjb25maXJtIGlkZW50aWZpZXIgaXMgcGx1cmFsP1xuLy8gVE9ETzogYGxpc3QuY2xvbmUoKWAgdG8gcmV0dXJuIG5ldyBsaXN0IG9mIHNhbWUgdHlwZS5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJyYW5nZV9leHByZXNzaW9uXCIsXG5cdFwie2lkZW50aWZpZXJ9IHtzdGFydDpleHByZXNzaW9ufSB0byB7ZW5kOmV4cHJlc3Npb259IG9mIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJhbmdlX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHN0YXJ0LCBlbmQsIGxpc3QgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHN0YXJ0ID0gc3RhcnQudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRlbmQgPSBlbmQudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsaXN0ID0gbGlzdC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0UmFuZ2UoJHtsaXN0fSwgJHtzdGFydH0sICR7ZW5kfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gU3RhcnRpbmcgcmFuZ2UgZXhwcmVzc2lvbi5cbi8vIFJldHVybnMgYSBuZXcgbGlzdC5cbi8vIGUuZy5cdGBmaXJzdCA0IGl0ZW1zIG9mIGxpc3RgXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZ2VfZXhwcmVzc2lvblwiLFxuXHRcImZpcnN0IHtudW1iZXI6ZXhwcmVzc2lvbn0ge2lkZW50aWZpZXJ9IChpbnxvZikge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcmFuZ2VfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbnVtYmVyLCBsaXN0IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRudW1iZXIgPSBudW1iZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsaXN0ID0gbGlzdC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0UmFuZ2UoJHtsaXN0fSwgMSwgJHtudW1iZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBFbmRpbmcgcmFuZ2UgZXhwcmVzc2lvbi5cbi8vIFJldHVybnMgYSBuZXcgbGlzdC5cbi8vIGUuZy5cdGBsYXN0IDQgaXRlbXMgb2YgbGlzdGBcbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJyYW5nZV9leHByZXNzaW9uXCIsXG5cdFwibGFzdCB7bnVtYmVyOmV4cHJlc3Npb259IHtpZGVudGlmaWVyfSAoaW58b2YpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJhbmdlX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG51bWJlciwgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bnVtYmVyID0gbnVtYmVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGlzdCA9IGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldEVuZFJhbmdlKCR7bGlzdH0sIDEsICR7bnVtYmVyfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBSYW5nZSBleHByZXNzaW9uIHN0YXJ0aW5nIGF0IHNvbWUgaXRlbSBpbiB0aGUgbGlzdC5cbi8vIFJldHVybnMgYSBuZXcgbGlzdC5cbi8vIElmIGl0ZW0gaXMgbm90IGZvdW5kLCByZXR1cm5zIGFuIGVtcHR5IGxpc3QuICg/Pz8pXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZ2VfZXhwcmVzc2lvblwiLFxuXHRcIntpZGVudGlmaWVyfSAoaW58b2YpIHtsaXN0OmV4cHJlc3Npb259IHN0YXJ0aW5nIHdpdGgge3RoaW5nOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJhbmdlX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHR0aGluZyA9IHRoaW5nLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGlzdCA9IGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldFJhbmdlKCR7bGlzdH0sIHNwZWxsLnBvc2l0aW9uT2YoJHt0aGluZ30sICR7bGlzdH0pKWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIExpc3QgZmlsdGVyLlxuLy8gTk9URTogd2Ugd2lsbCBzaW5ndWxhcml6ZSBgaWRlbnRpZmllcmAgYW5kIHVzZSB0aGF0IGFzIHRoZSBhcmd1bWVudCB0byBgZXhwcmVzc2lvbmAuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGlzdF9maWx0ZXJcIixcblx0XCJ7aWRlbnRpZmllcn0gKGlufG9mKSB7bGlzdDpleHByZXNzaW9ufSB3aGVyZSB7Y29uZGl0aW9uOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfZmlsdGVyIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBjb25kaXRpb24sIGxpc3QgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGNvbmRpdGlvbiA9IGNvbmRpdGlvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxpc3QgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gdXNlIHNpbmd1bGFyIG9mIGlkZW50aWZpZXIgZm9yIG1ldGhvZCBhcmd1bWVudFxuXHRcdFx0bGV0IGFyZ3VtZW50ID0gc2luZ3VsYXJpemUoaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmZpbHRlcigke2xpc3R9LCAke2FyZ3VtZW50fSA9PiAke2NvbmRpdGlvbn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gU2V0IG1lbWJlcnNoaXAuXG4vLyBOT1RFOiB3ZSB3aWxsIHNpbmd1bGFyaXplIGBpZGVudGlmaWVyYCBhbmQgdXNlIHRoYXQgYXMgdGhlIGFyZ3VtZW50IHRvIGBleHByZXNzaW9uYC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXN0X21lbWJlcnNoaXBfdGVzdFwiLFxuXHRcIntsaXN0OmV4cHJlc3Npb259IChvcGVyYXRvcjpoYXN8aGFzIG5vfGRvZXNudCBoYXZlfGRvZXMgbm90IGhhdmUpIHtpZGVudGlmaWVyfSB3aGVyZSB7ZmlsdGVyOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfbWVtYmVyc2hpcF90ZXN0IGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBvcGVyYXRvciwgZmlsdGVyLCBsaXN0IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRmaWx0ZXIgPSBmaWx0ZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsaXN0ID0gbGlzdC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdG9wZXJhdG9yID0gb3BlcmF0b3IudG9Tb3VyY2UoY29udGV4dCkgPT09IFwiaGFzXCIgPyBcIlwiIDogXCIhXCI7XG5cdFx0XHQvLyB1c2Ugc2luZ3VsYXIgb2YgaWRlbnRpZmllciBmb3IgbWV0aG9kIGFyZ3VtZW50XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBzaW5ndWxhcml6ZShpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHRcdHJldHVybiBgJHtvcGVyYXRvcn1zcGVsbC5hbnkoJHtsaXN0fSwgJHthcmd1bWVudH0gPT4gJHtmaWx0ZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vL1xuLy9cdEFkZGluZyB0byBsaXN0IChpbi1wbGFjZSlcbi8vXG5cbi8vIEFkZCB0byBlbmQgb2YgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfYXBwZW5kXCIsXG5cdFtcblx0XHRcImFwcGVuZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8ge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0XHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8gKCh0aGU/KSBlbmQgb2YpPyB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRdLFxuXHRjbGFzcyBsaXN0X2FwcGVuZCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0dGhpbmcgPSB0aGluZy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxpc3QgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5hcHBlbmQoJHtsaXN0fSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIEFkZCB0byBiZWdpbm5pbmcgb2YgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcHJlcGVuZFwiLFxuXHRbXG5cdFx0XCJwcmVwZW5kIHt0aGluZzpleHByZXNzaW9ufSB0byB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRcdFwiYWRkIHt0aGluZzpleHByZXNzaW9ufSBiZWZvcmUge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0XHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8gdGhlIChzdGFydHxmcm9udHx0b3ApIG9mIHtsaXN0OmV4cHJlc3Npb259XCJcblx0XSxcblx0Y2xhc3MgbGlzdF9wcmVwZW5kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHR0aGluZyA9IHRoaW5nLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGlzdCA9IGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnByZXBlbmQoJHtsaXN0fSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIEFkZCB0byBtaWRkbGUgb2YgbGlzdCwgcHVzaGluZyBleGlzdGluZyBpdGVtcyBvdXQgb2YgdGhlIHdheS5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3Rfc3BsaWNlXCIsXG5cdFwiYWRkIHt0aGluZzpleHByZXNzaW9ufSB0byB7bGlzdDpleHByZXNzaW9ufSBhdCBwb3NpdGlvbiB7cG9zaXRpb246ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9zcGxpY2UgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIHBvc2l0aW9uLCBsaXN0IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHR0aGluZyA9IHRoaW5nLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cG9zaXRpb24gPSBwb3NpdGlvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxpc3QgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5zcGxpY2UoJHtsaXN0fSwgJHtwb3NpdGlvbn0sICR7dGhpbmd9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBBZGQgdG8gbWlkZGxlIG9mIGxpc3QsIHB1c2hpbmcgZXhpc3RpbmcgaXRlbXMgb3V0IG9mIHRoZSB3YXkuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X2FkZF9hZnRlclwiLFxuXHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8ge2xpc3Q6ZXhwcmVzc2lvbn0gYWZ0ZXIge2l0ZW06ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9zcGxpY2UgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIGl0ZW0sIGxpc3QgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHRoaW5nID0gdGhpbmcudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpdGVtID0gaXRlbS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxpc3QgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5zcGxpY2UoJHtsaXN0fSwgc3BlbGwucG9zaXRpb25PZigke2xpc3R9LCAke2l0ZW19KSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vL1xuLy9cdFJlbW92aW5nIGZyb20gbGlzdCAoaW4tcGxhY2UpXG4vL1xuXG4vLyBFbXB0eSBsaXN0LlxuLy9UT0RPOiBtYWtlIGBlbXB0eWAgYW5kL29yIGBjbGVhcmAgYSBnZW5lcmljIHN0YXRlbWVudD8/P1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9lbXB0eVwiLFxuXHRcIihlbXB0eXxjbGVhcikge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9lbXB0eSBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bGlzdCA9IGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmNsZWFyKCR7bGlzdH0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJlbW92ZSBvbmUgaXRlbSBmcm9tIGxpc3QgYnkgcG9zaXRpb24uXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3JlbW92ZV9wb3NpdGlvblwiLFxuXHRcInJlbW92ZSB7aWRlbnRpZmllcn0ge251bWJlcjpleHByZXNzaW9ufSBvZiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3JlbW92ZV9wb3NpdGlvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbnVtYmVyLCBsaXN0IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRudW1iZXIgPSBudW1iZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsaXN0ID0gbGlzdC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwucmVtb3ZlSXRlbSgke2xpc3R9LCAke251bWJlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJlbW92ZSByYW5nZSBvZiB0aGluZ3MgZnJvbSBsaXN0LlxuLy8gTk9URTogYHN0YXJ0YCBpcyAqKjEtYmFzZWQqKi5cbi8vIE5PVEU6IGBlbmRgIGlzIGluY2x1c2l2ZSFcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlX3JhbmdlXCIsXG5cdFwicmVtb3ZlIHtpZGVudGlmaWVyfSB7c3RhcnQ6ZXhwcmVzc2lvbn0gdG8ge2VuZDpleHByZXNzaW9ufSBvZiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3JlbW92ZV9wb3NpdGlvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhcnQsIGVuZCwgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0c3RhcnQgPSBzdGFydC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGVuZCA9IGVuZC50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxpc3QgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5yZW1vdmVSYW5nZSgke2xpc3R9LCAke3N0YXJ0fSwgJHtlbmR9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFJlbW92ZSBhbGwgaW5zdGFuY2VzIG9mIHNvbWV0aGluZyBmcm9tIGEgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlXCIsXG5cdFwicmVtb3ZlIHt0aGluZzpleHByZXNzaW9ufSBmcm9tIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcmVtb3ZlIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0dGhpbmcgPSB0aGluZy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxpc3QgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5yZW1vdmUoJHtsaXN0fSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJlbW92ZSBhbGwgaXRlbXMgZnJvbSBsaXN0IHdoZXJlIGNvbmRpdGlvbiBpcyB0cnVlLlxuLy8gTk9URTogd2Ugd2lsbCBzaW5ndWxhcml6ZSBgaWRlbnRpZmllcmAgYW5kIHVzZSB0aGF0IGFzIHRoZSBhcmd1bWVudCB0byBgZXhwcmVzc2lvbmAuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3JlbW92ZV93aGVyZVwiLFxuXHRcInJlbW92ZSB7aWRlbnRpZmllcn0gKGlufG9mfGZyb20pIHtsaXN0OmV4cHJlc3Npb259IHdoZXJlIHtjb25kaXRpb246ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9yZW1vdmVfd2hlcmUgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGNvbmRpdGlvbiwgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0Y29uZGl0aW9uID0gY29uZGl0aW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGlzdCA9IGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyB1c2Ugc2luZ3VsYXIgb2YgaWRlbnRpZmllciBmb3IgbWV0aG9kIGFyZ3VtZW50XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBzaW5ndWxhcml6ZShpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHRcdHJldHVybiBgc3BlbGwucmVtb3ZlV2hlcmUoJHtsaXN0fSwgJHthcmd1bWVudH0gPT4gJHtjb25kaXRpb259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vXG4vL1x0UmFuZG9tIChpbi1wbGFjZSkgbGlzdCBtYW5pcHVsYXRpb24uXG4vL1xuXG4vLyBSZXZlcnNlIGxpc3QgaW4tcGxhY2UuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3JldmVyc2VcIixcblx0XCJyZXZlcnNlIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcmV2ZXJzZSBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bGlzdCA9IGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnJldmVyc2UoJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gUmFuZG9taXplIGxpc3QgaW4tcGxhY2UuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3JhbmRvbWl6ZVwiLFxuXHRcInJhbmRvbWl6ZSB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3JhbmRvbWl6ZSBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bGlzdCA9IGxpc3QudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnJhbmRvbWl6ZSgke2xpc3R9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2xpc3RzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBpbmZpeCBhbmQgcHJlZml4IG9wZXJhdG9ycy5cbi8vXG5cbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL19wYXJzZXJcIjtcbmltcG9ydCBcIi4vY29yZVwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyMjIEluZml4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPiB7cmhzfWAsIGVnOiBgYSBpcyAxYFxuLy8gTk9URTogYG9wZXJhdG9yLnRvSlNgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyB0d28gYXJndW1lbnRzIChgbGhzYCBhbmQgYHJoc2ApIGludG8gb3V0cHV0LlxuXG4vLyBOT1RFOiBgcHJlY2VkZW5jZWAgbnVtYmVycyBjb21lIGZyb20gSmF2YXNjcmlwdCBlcXVpdmFsZW50c1xuLy9cdFx0IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL09wZXJhdG9ycy9PcGVyYXRvcl9QcmVjZWRlbmNlXG5cbmNsYXNzIGluZml4X29wZXJhdG9yIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXMge1xuXG4vLyBOT1RFOiBGb3IgdGhlIG9wZXJhdG9ycyB0aGVtc2VsdmVzLCB3ZSByZWFsbHkgd2FudCB0byBqdXN0IHVzZSBsb25nZXN0IG1hdGNoLlxuLy8gXHRcdCBXZSB3YW50IHRvIHB1c2ggdGhlIHByZWNlZGVuY2UgdXAgdG8gdGhlIGV4cHJlc3Npb24gYW5kIGV2YWx1YXRlIGRpZmZlcmVudCBleHByZXNzaW9ucyBiYXNlZCBvbiB0aGF0LlxuLy8gXHQvLyBGaW5kIGJlc3QgbWF0Y2ggYWNjb3JkaW5nIHRvIG9wZXJhdG9yIHByZWNlZGVuY2UgYXMgZGVmaW5lZCBiZWxvdy5cbi8vIFx0Z2V0QmVzdE1hdGNoKG1hdGNoZXMpIHtcbi8vIFx0XHRjb25zb2xlLndhcm4oXCJHQk1cIiwgbWF0Y2hlcywgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gucHJlY2VkZW5jZSksIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLm1hdGNoZWRUZXh0KSk7XG4vLyBcdFx0cmV0dXJuIG1hdGNoZXMucmVkdWNlKGZ1bmN0aW9uIChiZXN0LCBuZXh0KSB7XG4vLyBcdFx0XHQvLyB0YWtlIGhpZ2hlc3QgcHJlY2VkZW5jZSBtYXRjaCBmaXJzdFxuLy8gXHRcdFx0aWYgKG5leHQucHJlY2VkZW5jZSA+IGJlc3QucHJlY2VkZW5jZSkgcmV0dXJuIG5leHQ7XG4vLyBcdFx0XHQvLyB0YWtlIGxvbmdlc3QgbWF0Y2ggaWYgc2FtZSBwcmVjZWRlbmNlXG4vLyBcdFx0XHRpZiAobmV4dC5wcmVjZWRlbmNlID09PSBiZXN0LnByZWNlZGVuY2UpIHtcbi8vIFx0XHRcdFx0aWYgKG5leHQuZW5kSW5kZXggPiBiZXN0LmVuZEluZGV4KSByZXR1cm4gbmV4dDtcbi8vIFx0XHRcdH1cbi8vIFx0XHRcdHJldHVybiBiZXN0O1xuLy8gXHRcdH0sIG1hdGNoZXNbMF0pO1xuLy8gXHR9XG59XG5cbnBhcnNlci5hZGRSdWxlKFwiaW5maXhfb3BlcmF0b3JcIiwgbmV3IGluZml4X29wZXJhdG9yKCkpO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiYW5kXCIsXG5cdGNsYXNzIGFuZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSA2OyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICYmICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJvclwiLFxuXHRjbGFzcyBvciBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSA1OyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9IHx8ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpc1wiLFxuXHQgY2xhc3MgaXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3RcIixcblx0IGNsYXNzIGlzX25vdCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPSAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgZXhhY3RseVwiLFxuXHRjbGFzcyBpc19leGFjdGx5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBleGFjdGx5XCIsXG5cdCBjbGFzcyAgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT09ICR7Yn0pYCB9IH1cbik7XG5cbi8vVE9ETzogYHNwZWxsLmlzT2ZUeXBlKHRoaW5nLCB0eXBlKWBcbi8vVE9ETzogYGlzIHNhbWUgdHlwZSBhc2AgP1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGFcIixcblx0IGNsYXNzIGlzX2EgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGBzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGFuXCIsXG5cdCBjbGFzcyBpc19hbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgYVwiLFxuXHQgY2xhc3MgaXNfbm90X2EgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGAhc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgYW5cIixcblx0IGNsYXNzIGlzX25vdF9hbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xuXG4vL1RPRE86IGBzcGVsbC5jb250YWlucyhjb2xsZWN0aW9uLCB0aGluZylgXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgaW5cIixcblx0IGNsYXNzIGlzX2luIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBvbmUgb2ZcIixcblx0IGNsYXNzIGlzX29uZV9vZiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgaW5cIixcblx0IGNsYXNzIGlzX25vdF9pbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBvbmUgb2ZcIixcblx0IGNsYXNzIGlzX25vdF9vbmVfb2YgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxuXG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpbmNsdWRlc1wiLFxuXHQgY2xhc3MgaW5jbHVkZXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImNvbnRhaW5zXCIsXG5cdCBjbGFzcyBjb250YWlucyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkb2VzIG5vdCBpbmNsdWRlXCIsXG5cdCBjbGFzcyBkb2VzX25vdF9pbmNsdWRlIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiZG9lcyBub3QgY29udGFpblwiLFxuXHQgY2xhc3MgZG9lc19ub3RfY29udGFpbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIj5cIixcblx0IGNsYXNzIGd0IGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgZ3JlYXRlciB0aGFuXCIsXG5cdCBjbGFzcyBpc19ncmVhdGVyX3RoYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIj49XCIsXG5cdCBjbGFzcyBndGUgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvXCIsXG5cdCBjbGFzcyBpc19ndGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+PSAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCI8XCIsXG5cdCBjbGFzcyBsdCBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGxlc3MgdGhhblwiLFxuXHQgY2xhc3MgaXNfbGVzc190aGFuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCI8PVwiLFxuXHQgY2xhc3MgbHRlIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGxlc3MgdGhhbiBvciBlcXVhbCB0b1wiLFxuXHQgY2xhc3MgaXNfbHRlIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPD0gJHtifSlgIH0gfVxuKTtcblxuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJcXFxcK1wiLFxuXHQgY2xhc3MgcGx1cyBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSArICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJwbHVzXCIsXG5cdCBjbGFzcyBwbHVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSArICR7Yn1gIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiLVwiLFxuXHQgY2xhc3MgbWludXMgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMzsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLSAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwibWludXNcIixcblx0IGNsYXNzIG1pbnVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAtICR7Yn1gIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiXFxcXCpcIixcblx0IGNsYXNzIHRpbWVzIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTQ7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICogJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcInRpbWVzXCIsXG5cdCBjbGFzcyB0aW1lcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKiAke2J9YCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIi9cIixcblx0IGNsYXNzIGRpdmlkZWRfYnkgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLyAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiZGl2aWRlZCBieVwiLFxuXHQgY2xhc3MgZGl2aWRlZF9ieSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLyAke2J9YCB9IH1cbik7XG5cbi8vVE9ETzogIGArPWAgZXRjPyAgb3RoZXIgbWF0aCBmdW5jdGlvbnM/XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImluZml4X29wZXJhdG9yX2V4cHJlc3Npb25cIixcblx0XCJ7bGhzOmV4cHJlc3Npb259IHtvcGVyYXRvcjppbmZpeF9vcGVyYXRvcn0ge3JoczpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHQvLyBXZSBDQU5OT1QgbWF0Y2ggaWYgYGluZml4X29wZXJhdG9yYCBpc24ndCBmb3VuZCBpbiB0aGUgZXhwcmVzc2lvbi5cblx0XHR0ZXN0UnVsZSA9IFwiaW5maXhfb3BlcmF0b3JcIjtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxocywgcmhzLCBvcGVyYXRvciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIG9wZXJhdG9yLnRvSlMobGhzLnRvU291cmNlKGNvbnRleHQpLCByaHMudG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdH1cblx0fVxuKTtcblxuLy8jIyBQb3N0aWZ4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPmAsIGUuZy4gYGEgaXMgZGVmaW5lZGBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgYXJndW1lbnQgKGBsaHNgKSBpbnRvIEpTIG91dHB1dC5cblxucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgZGVmaW5lZFwiLFxuXHRjbGFzcyBpc19kZWZpbmVkIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gIT09ICd1bmRlZmluZWQnKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGRlZmluZWRcIixcblx0Y2xhc3MgaXNfbm90X2RlZmluZWQgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyB1bmRlZmluZWRcIixcblx0Y2xhc3MgaXNfdW5kZWZpbmVkIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gPT09ICd1bmRlZmluZWQnKWAgfSB9XG4pO1xuXG5cbi8vVE9ETzogYHNwZWxsLmlzRW1wdHkodGhpbmcpYFxucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgZW1wdHlcIixcblx0Y2xhc3MgaXNfZW1wdHkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBlbXB0eVwiLFxuXHRjbGFzcyBpc19ub3RfZW1wdHkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeF9vcGVyYXRvcn1cIixcblx0Y2xhc3MgcG9zdGZpeF9vcGVyYXRvcl9leHByZXNpb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdC8vIFdlIENBTk5PVCBtYXRjaCBpZiBgcG9zdGZpeF9vcGVyYXRvcmAgaXNuJ3QgZm91bmQgaW4gdGhlIGV4cHJlc3Npb24uXG5cdFx0dGVzdFJ1bGUgPSBcInBvc3RmaXhfb3BlcmF0b3JcIjtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIG9wZXJhdG9yIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gb3BlcmF0b3IudG9KUyhleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9fcGFyc2VyXCI7XG5pbXBvcnQgXCIuL2NvcmVcIjtcblxuLy8gcmUtZXhwb3J0IHBhcnNlciBmb3IgdGVzdGluZy5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vL1xuLy9cdCMjIFJldHVybnNcbi8vXG5cbi8vIFJldHVybiBhIHZhbHVlXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcInJldHVybl9zdGF0ZW1lbnRcIiwgXCJyZXR1cm4ge2V4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJldHVybl9zdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIGByZXR1cm4gJHtleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHQjIyBBc3NpZ25tZW50XG4vL1xuY2xhc3MgYXNzaWdubWVudCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50e1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IHsgdGhpbmcsIHZhbHVlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0aWYgKHRoaW5nIGluc3RhbmNlb2YgUnVsZS5JZGVudGlmaWVyKSB7XG5cdFx0XHQvLyBUT0RPOiBkZWNsYXJlIGlkZW50aWZpZXIgaWYgbm90IGluIHNjb3BlLCBldGNcblx0XHR9XG5cblx0XHRyZXR1cm4gYCR7dGhpbmcudG9Tb3VyY2UoY29udGV4dCl9ID0gJHt2YWx1ZS50b1NvdXJjZShjb250ZXh0KX1gO1xuXHR9XG59XG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYXNzaWdubWVudFwiLCBcInt0aGluZzpleHByZXNzaW9ufSA9IHt2YWx1ZTpleHByZXNzaW9ufVwiLCBhc3NpZ25tZW50KTtcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYXNzaWdubWVudFwiLCBcInNldCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8ge3ZhbHVlOmV4cHJlc3Npb259XCIsIGFzc2lnbm1lbnQpO1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsIFwicHV0IHt2YWx1ZTpleHByZXNzaW9ufSBpbnRvIHt0aGluZzpleHByZXNzaW9ufVwiLCBhc3NpZ25tZW50KTtcblxuXG4vL1xuLy9cdCMjIFVzZXIgaW50ZXJhY3Rpb25cbi8vXG5cbi8vIEFsZXJ0IGEgbWVzc2FnZS5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwiYWxlcnRcIiwgXCJhbGVydCB7bWVzc2FnZTpleHByZXNzaW9ufSAoYnV0dG9uQ2xhdXNlOndpdGgge3RleHR9KT9cIixcblx0Y2xhc3MgYWxlcnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgYnV0dG9uQ2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBidXR0b25OYW1lID0gYnV0dG9uQ2xhdXNlID8gYnV0dG9uQ2xhdXNlLnJlc3VsdHMudGV4dC50b1NvdXJjZShjb250ZXh0KSA6ICdcIk9LXCInO1xuXHRcdFx0cmV0dXJuIGBhd2FpdCBzcGVsbC5hbGVydCgke21lc3NhZ2V9LCAke2J1dHRvbk5hbWV9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBXYXJuaW5nIG1lc3NhZ2UgLS0gbGlrZSBhbGVydCBidXQgZmFuY2llci5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwid2FyblwiLCBcIndhcm4ge2V4cHJlc3Npb246ZXhwcmVzc2lvbn0gKGJ1dHRvbkNsYXVzZTp3aXRoIHt0ZXh0fSk/XCIsXG5cdGNsYXNzIHdhcm4gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgYnV0dG9uQ2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRtZXNzYWdlID0gbWVzc2FnZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBidXR0b25OYW1lID0gYnV0dG9uQ2xhdXNlID8gYnV0dG9uQ2xhdXNlLnJlc3VsdHMudGV4dC50b1NvdXJjZShjb250ZXh0KSA6ICdcIk9LXCInO1xuXHRcdFx0cmV0dXJuIGBhd2FpdCBzcGVsbC53YXJuKCR7bWVzc2FnZX0sICR7YnV0dG9uTmFtZX0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gQ29uZmlybSBtZXNzYWdlIC0tIHByZXNlbnQgYSBxdWVzdGlvbiB3aXRoIHR3byBhbnN3ZXJzLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJjb25maXJtXCIsIFwiY29uZmlybSB7bWVzc2FnZTpleHByZXNzaW9ufSAoYnV0dG9uQ2xhdXNlOndpdGgge29rQnV0dG9uOnRleHR9IChjYW5jZWxDbGF1c2U6IChhbmR8b3IpIHtjYW5jZWxCdXR0b246dGV4dH0pPyApP1wiLFxuXHRjbGFzcyBjb25maXJtIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG1lc3NhZ2UsIGJ1dHRvbkNsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0bWVzc2FnZSA9IG1lc3NhZ2UudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgb2tCdXR0b24gPSAnXCJPS1wiJywgY2FuY2VsQnV0dG9uID0gJ1wiQ2FuY2VsXCInO1xuXG5cdFx0XHRpZiAoYnV0dG9uQ2xhdXNlKSB7XG5cdFx0XHRcdG9rQnV0dG9uID0gYnV0dG9uQ2xhdXNlLnJlc3VsdHMub2tCdXR0b24ucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0bGV0IGNhbmNlbENsYXVzZSA9IGJ1dHRvbkNsYXVzZS5yZXN1bHRzLmNhbmNlbENsYXVzZTtcblx0XHRcdFx0aWYgKGNhbmNlbENsYXVzZSkgY2FuY2VsQnV0dG9uID0gY2FuY2VsQ2xhdXNlLnJlc3VsdHMuY2FuY2VsQnV0dG9uLnJlc3VsdHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLmNvbmZpcm0oJHttZXNzYWdlfSwgJHtva0J1dHRvbn0sICR7Y2FuY2VsQnV0dG9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cbmltcG9ydCBnbG9iYWwgZnJvbSBcIi4uL3V0aWxzL2dsb2JhbFwiO1xuaW1wb3J0IHsgcGx1cmFsaXplIH0gZnJvbSBcIi4uL3V0aWxzL3N0cmluZ1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vX3BhcnNlclwiO1xuXG4vLyByZS1leHBvcnQgcGFyc2VyIGZvciB0ZXN0aW5nLlxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cblxuLy9NT1ZFIFRPIGBvYmplY3RzYD9cbi8vIFByb3BlcnRpZXMgY2xhdXNlOiBjcmVhdGVzIGFuIG9iamVjdCB3aXRoIG9uZSBvciBtb3JlIHByb3BlcnR5IHZhbHVlcy5cbi8vXHRgZm9vID0gMSwgYmFyID0gMmBcbi8vVE9ETzogd291bGQgbGlrZSB0byB1c2UgYGFuZGAgYnV0IHRoYXQgd2lsbCBiYXJmIG9uIGV4cHJlc3Npb25zLi4uXG4vL1RPRE86IGhvdyB0byBkbyBwcm9wZXJ0aWVzIG9uIG11bHRpcGxlIGxpbmVzP1xucGFyc2VyLmFkZExpc3QoXG5cdFwib2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc1wiLFxuXHRcIlsoe2lkZW50aWZpZXJ9ID0ge2V4cHJlc3Npb259KSAsXVwiLFxuXHRjbGFzcyBvYmplY3RfbGl0ZXJhbF9wcm9wZXJ0aWVzIGV4dGVuZHMgUnVsZS5MaXN0IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgcHJvcHMgPSB0aGlzLnJlc3VsdHMubWF0Y2hlZC5tYXAoZnVuY3Rpb24gKHByb3ApIHtcblx0XHRcdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBleHByZXNzaW9uIH0gPSBwcm9wLnJlc3VsdHM7XG5cdFx0XHRcdFx0bGV0IGtleSA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRcdFx0bGV0IHZhbHVlID0gZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0XHRyZXR1cm4gYFwiJHtrZXl9XCI6ICR7dmFsdWV9YFxuXHRcdFx0XHR9KTtcblx0XHRcdHJldHVybiBgeyAke3Byb3BzLmpvaW4oXCIsIFwiKX0gfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBgbmV3YFxuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYWxsIHR5cGVzIHRha2UgYW4gb2JqZWN0IG9mIHByb3BlcnRpZXM/Pz8/XG5wYXJzZXIuYWRkU2VxdWVuY2UoXG5cdFwibmV3X3RoaW5nXCIsXG5cdFwiKGNyZWF0ZXxuZXcpIHt0eXBlfSAocHJvcHNfY2xhdXNlOndpdGgge3Byb3BzOm9iamVjdF9saXRlcmFsX3Byb3BlcnRpZXN9KT9cIixcblx0Y2xhc3MgbmV3X3RoaW5nIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdHlwZSwgcHJvcHNfY2xhdXNlIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHR0eXBlID0gdHlwZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBwcm9wcyA9IHByb3BzX2NsYXVzZSAmJiBwcm9wc19jbGF1c2UucmVzdWx0cy5wcm9wcy50b1NvdXJjZShjb250ZXh0KSB8fCBcIlwiO1xuXG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIG9iamVjdCwgd2hpY2ggd2UnbGwgY3JlYXRlIHdpdGggYW4gb2JqZWN0IGxpdGVyYWwuXG5cdFx0XHRpZiAodHlwZSA9PT0gXCJPYmplY3RcIikge1xuXHRcdFx0XHRpZiAoIXByb3BzX2NsYXVzZSkgcmV0dXJuIFwie31cIjtcblx0XHRcdFx0cmV0dXJuIGAke3Byb3BzfWA7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBgbmV3ICR7dHlwZX0oJHtwcm9wc30pYDtcblx0XHR9XG5cdH1cbik7XG4vLyBUaGlzIHdvcmtzIGFzIGFuIGV4cHJlc3Npb24gT1IgYSBzdGF0ZW1lbnQuXG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLm5ld190aGluZyk7XG5wYXJzZXIuYWRkUnVsZShcInN0YXRlbWVudFwiLCBwYXJzZXIucnVsZXMubmV3X3RoaW5nKTtcblxuXG5cblxuLy8gRGVmaW5lIGNsYXNzLlxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWZpbmVfdHlwZVwiLFxuXHRcImRlZmluZSB0eXBlIHt0eXBlfSAoZXh0ZW5kc19jbGF1c2U6YXMgKGF8YW4pIHtzdXBlclR5cGU6dHlwZX0pP1wiLFxuXHRjbGFzcyBkZWZpbmVfdHlwZSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBleHRlbmRzX2NsYXVzZSB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0dHlwZSA9IHR5cGUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgc3VwZXJUeXBlID0gZXh0ZW5kc19jbGF1c2UgJiYgZXh0ZW5kc19jbGF1c2UucmVzdWx0cy5zdXBlclR5cGUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAoc3VwZXJUeXBlKSB7XG5cdFx0XHRcdHJldHVybiBgY2xhc3MgJHt0eXBlfSBleHRlbmRzICR7c3VwZXJUeXBlfWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYGNsYXNzICR7dHlwZX1gO1xuXG5cdFx0fVxuXHR9XG4pO1xuXG4vL1RPRE86IGNvbnN0cnVjdG9yXG5cblxuXG4vL01PVkUgVE8gYGZ1bmN0aW9uc2A/XG4vLyBBcmd1bWVudHMgY2xhdXNlIGZvciBtZXRob2RzXG4vL1x0YHdpdGggZm9vYCBvciBgd2l0aCBmb28gYW5kIGJhciBhbmQgYmF6YFxuLy9UT0RPOiB7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cdD0+IHJlcXVpcmVzIGAsYCBpbnN0ZWFkIG9mIGBhbmRgXG4vL1RPRE86IGB3aXRoIGZvbyBhcyBUeXBlYFxuLy9UT0RPOlx0YHdpdGggZm9vLi4uYCBmb3Igc3BsYXQ/XG5wYXJzZXIuYWRkU2VxdWVuY2UoXG5cdFwiYXJnc19jbGF1c2VcIixcblx0XCJ3aXRoIFthcmdzOntpZGVudGlmaWVyfSAsXVwiLFxuXHRjbGFzcyBhcmdzX2NsYXVzZSBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRcdC8vIFJldHVybiBqdXN0IHRoZSBhcmd1bWVudHMgYXMgdGhlIHJlc3VsdHNcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiBzdXBlci5yZXN1bHRzLmFyZ3M7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIGp1c3QgdGhlIGFyZ3VtZW50IG5hbWVzIGFzIGFuIGFycmF5XG5cdFx0Z2V0IGFyZ05hbWVzKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMucmVzdWx0cy5tYXRjaGVkLm1hcChhcmcgPT4gYXJnLm1hdGNoZWQpO1xuXHRcdH1cblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiB0aGlzLmFyZ05hbWVzLmpvaW4oXCIsIFwiKTtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gRGVjbGFyZSBpbnN0YW5jZSBtZXRob2Qgb3Igbm9ybWFsIGZ1bmN0aW9uLlxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX21ldGhvZFwiLFxuXHRcIih0b3xvbikge2lkZW50aWZpZXJ9IHthcmdzX2NsYXVzZX0/IChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBkZWNsYXJlX21ldGhvZCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBhcmdzX2NsYXVzZSwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGFyZ3MgPSAoYXJnc19jbGF1c2UgJiYgYXJnc19jbGF1c2UudG9Tb3VyY2UoY29udGV4dCkpIHx8IFwiXCI7XG5cdFx0XHRzdGF0ZW1lbnQgPSAoc3RhdGVtZW50ID8gYCB7ICR7c3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpfSB9YCA6IFwiXCIpO1xuXG5cdFx0XHRyZXR1cm4gYCR7aWRlbnRpZmllcn0oJHthcmdzfSkke3N0YXRlbWVudH1gXG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIERlY2xhcmUgXCJhY3Rpb25cIiwgd2hpY2ggY2FuIGJlIGNhbGxlZCBnbG9iYWxseSBhbmQgYWZmZWN0cyB0aGUgcGFyc2VyLlxuLy8gVE9ETzogYHdpdGhgIGNsYXVzZSAod2lsbCBjb25mbGljdCB3aXRoIGB3b3JkYClcbi8vIFRPRE86IGluc3RhbGwgaW4gcGFyc2VyIHNvbWVob3dcbi8vIFRPRE86IGNyZWF0ZSBpbnN0YW5jZSBmdW5jdGlvbj8gIG9yIG1heWJlIHdlIGRvbid0IG5lZWQgaXQ6XG4vL1x0XHRcdGBhY3Rpb24gdHVybiBDYXJkIG92ZXJgIGZvciBhbiBpbnN0YW5jZSBpcyBqdXN0IGB0dXJuIG1lIG92ZXJgXG4vL1x0XHRcdGBhY3Rpb24gYWRkIGNhcmQgdG8gZGVja2AgPT4gYGFkZCBtZSB0byBkZWNrYFxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9hY3Rpb25cIixcblx0XCJhY3Rpb24gKHdvcmRfY2xhdXNlOnt3b3JkfXx7dHlwZX0pKyAoXFxcXDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZGVjbGFyZV9hY3Rpb24gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB3b3JkX2NsYXVzZSwgc3RhdGVtZW50IH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRsZXQgd29yZHMgPSB3b3JkX2NsYXVzZS5tYXRjaGVkLm1hcCggd29yZCA9PiB3b3JkLnRvU291cmNlKGNvbnRleHQpICk7XG5cdFx0XHQvLyBpZiB0aGVyZSdzIG9ubHkgb25lIHdvcmQsIGl0IGNhbid0IGJlIGEgYmxhY2tsaXN0ZWQgaWRlbnRpZmllciBvciBhIHR5cGVcblx0XHRcdGlmICh3b3Jkcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0dmFyIHdvcmQgPSB3b3Jkc1swXTtcblx0XHRcdFx0aWYgKHdvcmRfY2xhdXNlLm1hdGNoZWQgaW5zdGFuY2VvZiBSdWxlLlR5cGUpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYHBhcnNlKCdkZWNsYXJlX2FjdGlvbicpOiBvbmUtd29yZCBhY3Rpb25zIG1heSBub3QgYmUgdHlwZXM6ICR7d29yZH1gKTtcblx0XHRcdFx0fVxuXG4vLyBIQUNLOiBgZ2xvYmFsLnBhcnNlcmAgaXMgYSBoYWNrIGhlcmUgZm9yIGNvbnZlbmllbmNlIGluIHRlc3RpbmcuLi5cblx0XHRcdFx0bGV0IHBhcnNlciA9IGNvbnRleHQgPyBjb250ZXh0LnBhcnNlciA6IGdsb2JhbC5wYXJzZXI7XG5cdFx0XHRcdGlmIChwYXJzZXIucnVsZXMuaWRlbnRpZmllci5ibGFja2xpc3Rbd29yZF0pIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYHBhcnNlKCdkZWNsYXJlX2FjdGlvbicpOiBvbmUtd29yZCBhY3Rpb25zIG1heSBub3QgYmUgYmxhY2tsaXN0ZWQgaWRlbnRpZmllcnNcIjogJHt3b3JkfWApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIGZpZ3VyZSBvdXQgYXJndW1lbnRzIGFuZC9vciB0eXBlc1xuXHRcdFx0dmFyIGFyZ3MgPSBbXTtcblx0XHRcdHZhciB0eXBlcyA9IFtdO1xuXHRcdFx0Ly8gaWYgYW55IG9mIHRoZSB3b3JkcyBhcmUgdHlwZXMgKGNhcGl0YWwgbGV0dGVyKSBtYWtlIHRoYXQgYW4gYXJndW1lbnQgb2YgdGhlIHNhbWUgbmFtZS5cblx0XHRcdHdvcmRfY2xhdXNlLm1hdGNoZWQubWFwKCAoaXRlbSwgaW5kZXgpID0+IHtcblx0XHRcdFx0aWYgKGl0ZW0gaW5zdGFuY2VvZiBSdWxlLlR5cGUpIHtcblx0XHRcdFx0XHRsZXQgdHlwZSA9IHdvcmRzW2luZGV4XTtcblx0XHRcdFx0XHRsZXQgd29yZCA9IHR5cGUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0XHR0eXBlcy5wdXNoKFt0eXBlLCB3b3JkXSk7XG5cdFx0XHRcdFx0d29yZHNbaW5kZXhdID0gd29yZDtcblx0XHRcdFx0XHRhcmdzLnB1c2god29yZCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0Ly8gZ2V0IHN0YXRpYyBtZXRob2QgbmFtZSBhbmQgYXJndW1lbnRzIGZvciBvdXRwdXRcblx0XHRcdGxldCBtZXRob2ROYW1lID0gd29yZHMuam9pbihcIl9cIik7XG5cdFx0XHRhcmdzID0gYXJncy5qb2luKFwiLCBcIik7XG5cblx0XHRcdC8vIGZpZ3VyZSBvdXQgaWYgdGhlcmUgYXJlIGFueSBjb25kaXRpb25zIG9uIHRoZSBhYm92ZVxuXHRcdFx0bGV0IGNvbmRpdGlvbnMgPSB0eXBlcy5tYXAoIChbdHlwZSwgd29yZF0pID0+IHtcblx0XHRcdFx0cmV0dXJuIGBcXHRpZiAoIXNwZWxsLmlzQSgke3dvcmR9LCAke3R5cGV9KSkgcmV0dXJuIHVuZGVmaW5lZGA7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gZ2V0IHN0YXRlbWVudHMsIGFkZGluZyBjb25kaXRpb25zIGlmIG5lY2Vzc2FyeVxuXHRcdFx0c3RhdGVtZW50ID0gc3RhdGVtZW50ID8gc3RhdGVtZW50LnRvU291cmNlKGNvbnRleHQpIDogXCJcIjtcblx0XHRcdGxldCBzdGF0ZW1lbnRzID0gXCJcIjtcblx0XHRcdGlmIChzdGF0ZW1lbnQpIHtcblx0XHRcdFx0c3RhdGVtZW50cyA9IFtdO1xuXHRcdFx0XHRpZiAoY29uZGl0aW9ucy5sZW5ndGgpIHN0YXRlbWVudHMgPSBzdGF0ZW1lbnRzLmNvbmNhdChjb25kaXRpb25zKTtcblx0XHRcdFx0aWYgKHN0YXRlbWVudCkgc3RhdGVtZW50cy5wdXNoKFwiXFx0XCIgKyBzdGF0ZW1lbnQpO1xuXHRcdFx0XHRzdGF0ZW1lbnRzID0gYCB7XFxuJHtzdGF0ZW1lbnRzLmpvaW4oXCJcXG5cIil9XFxuIH1cXG5gO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoY29uZGl0aW9ucy5sZW5ndGgpIHtcblx0XHRcdFx0c3RhdGVtZW50cyA9IGAge1xcbiR7Y29uZGl0aW9ucy5qb2luKFwiXFxuXCIpfWA7XG5cdFx0XHR9XG4vL2RlYnVnZ2VyO1xuXHRcdFx0Ly8gQ3JlYXRlIGFzIGEgU1RBVElDIGZ1bmN0aW9uXG5cdC8vVE9ETzogY3JlYXRlIGFzIGFuIGluc3RhbmNlIGZ1bmN0aW9uIHdlIGNhbiBjYWxsIG9uIG91cnNlbGYhXG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke21ldGhvZE5hbWV9KCR7YXJnc30pJHtzdGF0ZW1lbnRzfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIEdldHRlciBlaXRoZXIgd2l0aCBvciB3aXRob3V0IGFyZ3VtZW50cy5cbi8vIElmIHlvdSBzcGVjaWZ5IGFyZ3VtZW50cywgeWllbGRzIGEgbm9ybWFsIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYSB2YWx1ZS5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZ2V0dGVyXCIsXG5cdFwiZ2V0IHtpZGVudGlmaWVyfSB7YXJnc19jbGF1c2V9PyAoXFxcXDopPyB7ZXhwcmVzc2lvbn0/XCIsXG5cdGNsYXNzIGdldHRlciBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBhcmdzX2NsYXVzZSwgZXhwcmVzc2lvbiB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgYXJncyA9IGFyZ3NfY2xhdXNlICYmIGFyZ3NfY2xhdXNlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0ZXhwcmVzc2lvbiA9IChleHByZXNzaW9uID8gYCB7IHJldHVybiAoJHtleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpfSkgfWAgOiBcIlwiKTtcblxuXHRcdFx0aWYgKGFyZ3MgJiYgZXhwcmVzc2lvbikge1xuXHRcdFx0XHRyZXR1cm4gYCR7aWRlbnRpZmllcn0oJHthcmdzfSkke2V4cHJlc3Npb259YDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGFyZ3MpIHtcblx0XHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pYDtcblxuXHRcdFx0fSBlbHNlIGlmIChleHByZXNzaW9uKSB7XG5cdFx0XHRcdHJldHVybiBgZ2V0ICR7aWRlbnRpZmllcn0oKSR7ZXhwcmVzc2lvbn1gO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSgpYDtcblx0XHRcdH1cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBTZXR0ZXIuXG4vLyBDb21wbGFpbnMgaWYgeW91IHNwZWNpZnkgbW9yZSB0aGFuIG9uZSBhcmd1bWVudC5cbi8vIElmIHlvdSBkb24ndCBwYXNzIGFuIGV4cGxpY2l0IGFyZ3VtZW50LCB3ZSdsbCBhc3N1bWUgaXQncyB0aGUgc2FtZSBhcyB0aGUgaWRlbnRpZmllci5cbi8vIGVnO1x0YHNldCBjb2xvcjogc2V0IHRoZSBjb2xvciBvZiBteSB0ZXh0IHRvIGNvbG9yYFxuLy9cbi8vIFRPRE86IGludGVybmFsIGdldHRlci9zZXR0ZXIgc2VtYW50aWNzIGFsYSBvYmplY3RpdmUgQ1xuLy9cdFx0XHRgc2V0IGNvbG9yOiBpZiBjb2xvciBpcyBpbiBbXCJyZWRcIiwgXCJibHVlXCJdIHRoZW4gc2V0IG15IGNvbG9yIHRvIGNvbG9yYFxuLy9cdFx0ID0+IGBteSBjb2xvcmAgd2l0aGluIHNldHRlciBzaG91bGQgYXV0b21hdGljYWxseSB0cmFuc2xhdGUgdG8gYHRoaXMuX2NvbG9yYCA/Pz9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwic2V0dGVyXCIsXG5cdFwic2V0IHtpZGVudGlmaWVyfSB7YXJnc19jbGF1c2V9PyAoXFxcXDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZ2V0dGVyIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3NfY2xhdXNlLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXG5cdFx0XHQvLyBBc3N1bWUgd2Ugd2FudCB0aGUgc2FtZSBuYW1lIGFzIHRoZSBpZGVudGlmaWVyIGlmIG5vIGFyZ3VtZW5zXG5cdFx0XHRsZXQgYXJncyA9IChhcmdzX2NsYXVzZSAmJiBhcmdzX2NsYXVzZS5hcmdOYW1lcykgfHwgW2lkZW50aWZpZXJdO1xuXHRcdFx0Ly8gQ29tcGxhaW4gaWYgbW9yZSB0aGFuIG9uZSBhcmd1bWVudFxuXHRcdFx0aWYgKGFyZ3MubGVuZ3RoID4gMSlcblx0XHRcdFx0Y29uc29sZS53YXJuKFwicGFyc2UoJ3NldHRlcicpOiBvbmx5IG9uZSBhcmd1bWVudCBhbGxvd2VkIGluIHNldHRlcjogIFwiLCB0aGlzLm1hdGNoZWRUZXh0KTtcblxuXHRcdFx0c3RhdGVtZW50ID0gKHN0YXRlbWVudCA/IGAgeyAke3N0YXRlbWVudC50b1NvdXJjZShjb250ZXh0KX0gfWAgOiBcIlwiKTtcblxuXHRcdFx0cmV0dXJuIGBzZXQgJHtpZGVudGlmaWVyfSgke2FyZ3NbMF19KSR7c3RhdGVtZW50fWA7XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdGRlY2xhcmUgcHJvcGVydGllc1xuLy9cblxuLy9UT0RPOiBhbm90aGVyIG5hbWUgZm9yIGBjb25zdGFudGAgP1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwiKHNjb3BlOnByb3BlcnR5fGNvbnN0YW50fHNoYXJlZCBwcm9wZXJ0eSkge2lkZW50aWZpZXJ9ICh2YWx1ZV9jbGF1c2U6PSB7ZXhwcmVzc2lvbn0pP1wiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHNjb3BlLCBpZGVudGlmaWVyLCB2YWx1ZV9jbGF1c2UgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHNjb3BlID0gc2NvcGUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCB2YWx1ZSA9IHZhbHVlX2NsYXVzZSAmJiBcIiA9IFwiICsgdmFsdWVfY2xhdXNlLnJlc3VsdHMuZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KSB8fCBcIlwiO1xuXG5cdFx0XHRsZXQgZGVjbGFyYXRpb24gPSBgJHtpZGVudGlmaWVyfSR7dmFsdWV9YDtcblx0XHRcdHN3aXRjaCAoc2NvcGUpIHtcblx0XHRcdFx0Y2FzZSBcImNvbnN0YW50XCI6XG5cdFx0XHRcdFx0aWYgKCF2YWx1ZSkgY29uc29sZS53YXJuKFwicGFyc2UoJ2RlY2xhcmVfcHJvcGVydHknKTogY29uc3RhbnQgcHJvcGVydGllcyBtdXN0IGRlY2xhcmUgYSB2YWx1ZTogIFwiLCB0aGlzLm1hdGNoZWRUZXh0KTtcblx0XHRcdFx0XHRyZXR1cm4gYGNvbnN0ICR7ZGVjbGFyYXRpb259YDtcblxuXHRcdFx0XHRjYXNlIFwic2hhcmVkIHByb3BlcnR5XCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBAcHJvdG9cXG4ke2RlY2xhcmF0aW9ufWA7XG5cblx0XHRcdFx0Y2FzZSBcInByb3BlcnR5XCI6XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0cmV0dXJuIGRlY2xhcmF0aW9uO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuLy8gVE9ETzogc2NvcGVfbW9kaWZpZXI/Pz9cbi8vIFRPRE86IGluaXRpYWwgdmFsdWVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eVwiLFxuXHRcInByb3BlcnR5IHtpZGVudGlmaWVyfSBhcyAoYXxhbik/IHt0eXBlfVwiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIHR5cGUgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGlkZW50aWZpZXIgPSBpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0dHlwZSA9IHR5cGUudG9Tb3VyY2UoY29udGV4dCk7XG5cblx0XHRcdHJldHVybiBgZ2V0ICR7aWRlbnRpZmllcn0oKSB7IHJldHVybiB0aGlzLl9fJHtpZGVudGlmaWVyfSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHNwZWxsLmlzQSh2YWx1ZSwgJHt0eXBlfSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gVE9ETzogd2FybiBvbiBpbnZhbGlkIHNldD8gIHNoYXJlZD8gIHVuZGVmaW5lZD8gc29tZXRoaW5nIG90aGVyIHRoYW4gdGhlIGZpcnN0IHZhbHVlIGFzIGRlZmF1bHQ/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlcIixcblx0XCJwcm9wZXJ0eSB7aWRlbnRpZmllcn0gYXMgb25lIG9mIHtsaXN0OmxpdGVyYWxfbGlzdH1cIixcblx0Y2xhc3MgZGVjbGFyZV9wcm9wZXJ0eV9hc19vbmVfb2YgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgbGlzdCB9ID0gdGhpcy5yZXN1bHRzO1xuXG5cdFx0XHRpZGVudGlmaWVyID0gaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBwbHVyYWwgPSBwbHVyYWxpemUoaWRlbnRpZmllcik7XG5cblx0XHRcdGxldCB2YWx1ZXMgPSBsaXN0LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IGZpcnN0ID0gbGlzdC5nZXRJdGVtKDApO1xuXHRcdFx0bGV0IGZpcnN0VmFsdWUgPSBmaXJzdCA/IGZpcnN0LnRvU291cmNlKGNvbnRleHQpIDogXCJ1bmRlZmluZWRcIjtcblxuXHRcdFx0cmV0dXJuIGBAcHJvdG9cXG5gXG5cdFx0XHRcdCArIGAke3BsdXJhbH0gPSAke3ZhbHVlc31cXG5gXG5cdFx0XHRcdCArIGBnZXQgJHtpZGVudGlmaWVyfSgpIHsgcmV0dXJuIHRoaXMuX18ke2lkZW50aWZpZXJ9ID09PSB1bmRlZmluZWQgPyAke2ZpcnN0VmFsdWV9IDogdGhpcy5fXyR7aWRlbnRpZmllcn0gfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfWA7XG5cbi8vIE1PUkUgRUZGSUNJRU5UIEJVVCBVR0xJRVJcbi8vIFx0XHRcdHJldHVybiBgc3RhdGljICR7cGx1cmFsfSA9ICR7dmFsdWVzfTtcXG5gXG4vLyBcdFx0XHRcdCArIGBnZXQgJHtpZGVudGlmaWVyfSB7IHJldHVybiAoXCJfXyR7aWRlbnRpZmllcn1cIiBpbiB0aGlzID8gdGhpcy5fXyR7aWRlbnRpZmllcn0gOiAke2ZpcnN0VmFsdWV9KSB9XFxuYFxuLy8gXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuY29uc3RydWN0b3IuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRTZWxmLXJlZmVyZW5jZVxuLy9cbnBhcnNlci5hZGRLZXl3b3JkKFwibWVcIiwgXCJtZVwiLFxuXHRjbGFzcyBtZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0cmV0dXJuIFwidGhpc1wiO1xuXHRcdH1cblx0fVxuKTtcbnBhcnNlci5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBwYXJzZXIucnVsZXMubWUpO1xuXG4vLyBUT0RPOiB0aGlzIHJlYWxseSBtYWtlcyBtZSB3YW50IHRvIG1ha2UgYEkgYW0gZW1wdHlgIGV0YyB3b3JrLi4uXG5wYXJzZXIuYWRkS2V5d29yZChcIklcIiwgXCJJXCIsXG5cdGNsYXNzIEkgZXh0ZW5kcyBSdWxlLktleXdvcmQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiBcInRoaXNcIjtcblx0XHR9XG5cdH1cbik7XG5wYXJzZXIuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcGFyc2VyLnJ1bGVzLkkpO1xuXG5cbi8vXG4vL1x0UHJvcGVydHkgYWNjZXNzXG4vL1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwcm9wZXJ0eV9leHByZXNzaW9uXCIsXG5cdFwiKHByb3BlcnRpZXM6dGhlIHtpZGVudGlmaWVyfSBvZikrIHRoZT8ge2V4cHJlc3Npb259XCIsXG5cdGNsYXNzIHByb3BlcnR5X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHByb3BlcnRpZXMgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cHJvcGVydGllcyA9IHByb3BlcnRpZXMucmVzdWx0c1xuXHRcdFx0XHRcdFx0XHQucmV2ZXJzZSgpXG5cdFx0XHRcdFx0XHRcdC5tYXAoIHByb3BlcnR5ID0+IHByb3BlcnR5LmlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCkgKVxuXHRcdFx0XHRcdFx0XHQuam9pbihcIi5cIik7XG5cdFx0XHRyZXR1cm4gYCR7ZXhwcmVzc2lvbn0uJHtwcm9wZXJ0aWVzfWA7XG4vLyBOT1RFOiB0aGUgZm9sbG93aW5nIGlzIHNhZmVyLCBidXQgdWdseSBmb3IgZGVtbyBwdXJwb3Nlc1xuLy9cdFx0XHRyZXR1cm4gYHNwZWxsLmdldCgke2V4cHJlc3Npb259LCBbJyR7cHJvcGVydGllc30nXSlgO1xuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicHJvcGVydHlfZXhwcmVzc2lvblwiLFxuXHRcIihteXx0aGlzKSB7aWRlbnRpZmllcn1cIixcblx0Y2xhc3MgcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0aWRlbnRpZmllciA9IGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHRoaXMuJHtpZGVudGlmaWVyfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3R5cGVzLmpzIiwiLy9cbi8vXHQjIENyZWF0ZSBhIGBwYXJzZXJgIHNpbmdsZXRvbiB0byB1c2UgdG8gc2V0IHVwIHJ1bGVzIGFuZCBkdXJpbmcgdGVzdHMuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgcGFyc2VyIGluc3RhbmNlLlxuY29uc3QgcGFyc2VyID0gbmV3IFBhcnNlcigpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxud2luZG93LnBhcnNlciA9IHBhcnNlcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL19wYXJzZXIuanMiLCJ2YXIgZztcclxuXHJcbi8vIFRoaXMgd29ya3MgaW4gbm9uLXN0cmljdCBtb2RlXHJcbmcgPSAoZnVuY3Rpb24oKSB7XHJcblx0cmV0dXJuIHRoaXM7XHJcbn0pKCk7XHJcblxyXG50cnkge1xyXG5cdC8vIFRoaXMgd29ya3MgaWYgZXZhbCBpcyBhbGxvd2VkIChzZWUgQ1NQKVxyXG5cdGcgPSBnIHx8IEZ1bmN0aW9uKFwicmV0dXJuIHRoaXNcIikoKSB8fCAoMSxldmFsKShcInRoaXNcIik7XHJcbn0gY2F0Y2goZSkge1xyXG5cdC8vIFRoaXMgd29ya3MgaWYgdGhlIHdpbmRvdyByZWZlcmVuY2UgaXMgYXZhaWxhYmxlXHJcblx0aWYodHlwZW9mIHdpbmRvdyA9PT0gXCJvYmplY3RcIilcclxuXHRcdGcgPSB3aW5kb3c7XHJcbn1cclxuXHJcbi8vIGcgY2FuIHN0aWxsIGJlIHVuZGVmaW5lZCwgYnV0IG5vdGhpbmcgdG8gZG8gYWJvdXQgaXQuLi5cclxuLy8gV2UgcmV0dXJuIHVuZGVmaW5lZCwgaW5zdGVhZCBvZiBub3RoaW5nIGhlcmUsIHNvIGl0J3NcclxuLy8gZWFzaWVyIHRvIGhhbmRsZSB0aGlzIGNhc2UuIGlmKCFnbG9iYWwpIHsgLi4ufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBnO1xyXG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAod2VicGFjaykvYnVpbGRpbi9nbG9iYWwuanNcbi8vIG1vZHVsZSBpZCA9IDcwXG4vLyBtb2R1bGUgY2h1bmtzID0gMCAxIiwiaW1wb3J0IHsgZGVmaW5lTWVtb2l6ZWQgfSBmcm9tIFwiLi9tZW1vaXplLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyByZS1leHBvcnQgUnVsZSBmb3IgdGVzdGluZ1xuZXhwb3J0IGRlZmF1bHQgUnVsZTtcblxuLy9cbi8vXHQjIFBhcnNpbmcgYHJ1bGVTeW50YXhgIHRvIGNyZWF0ZSBydWxlcyBhdXRvbWF0aWNhbGx5LlxuLy9cbi8vIFRPRE86XHRQdWxsIGBwYXJzZVJ1bGVTeW50YXhgIHN0dWZmIG91dCBpbnRvIHNlcGFyYXRlIG1vZHVsZT9cbi8vIFRPRE86XHRCZXR0ZXIgbmFtZSBmb3IgYHJ1bGVTeW50YXhgXG4vLyBUT0RPOlx0VXNlIGtleXdvcmRzIGluIHN5bnRheCB0byBtYWtlIGEgcXVpY2sgcmVnZXgtYmFzZWQgYHRlc3RgIGZ1bmN0aW9uIGZvciB0aGUgZW50aXJlIHJ1bGVcbk9iamVjdC5hc3NpZ24oUnVsZSwge1xuXG4vL1xuLy8gIyMgZ3JvdXA6IHBhcnNpbmcgc3ludGF4XG4vL1xuXG4vLyBUT0RPOiBjb252ZXJ0IHRvIFRleHRTdHJlYW0gcGF0dGVybiBhbGEgbm9ybWFsIHBhcnNlciBvbmNlIHRoYXQgc2V0dGxlcyBkb3duPz8/XG5cdHBhcnNlUnVsZVN5bnRheChzeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0bGV0IHN5bnRheFN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCk7XG5cdFx0bGV0IHJ1bGVzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgW10pO1xuXG5cdFx0bGV0IHJ1bGU7XG5cdFx0Ly8gSWYgd2Ugb25seSBnb3Qgb25lIHRoaW5nLCByZXR1cm4gdGhhdCBhcyB0aGUgcmVzdWx0XG5cdFx0aWYgKHJ1bGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cnVsZSA9IHJ1bGVzWzBdO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgU2VxdWVuY2VDb25zdHJ1Y3Rvcih7IHJ1bGVzIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9LFxuXG5cdHRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpIHtcblx0XHRjb25zdCBTWU5UQVhfRVhQUkVTU0lPTiA9IC8oPzpbXFx3XFwtXSt8XFxcXFtcXFtcXChcXHtcXClcXH1cXF1dfFteXFxzXFx3XXxcXHwpL2c7XG5cdFx0bGV0IHN5bnRheFN0cmVhbSA9IHN5bnRheC5tYXRjaChTWU5UQVhfRVhQUkVTU0lPTik7XG5cdFx0aWYgKCFzeW50YXhTdHJlYW0pIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgdG9rZW5pemUgcGFyc2UgcnVsZSBzeW50YXggPj4ke3N5bnRheH08PGApO1xuXHRcdHJldHVybiBzeW50YXhTdHJlYW07XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IGxhc3RJbmRleCA9IHN5bnRheFN0cmVhbS5sZW5ndGg7XG5cdFx0d2hpbGUgKHN0YXJ0SW5kZXggPCBsYXN0SW5kZXgpIHtcblx0XHRcdGxldCBbIHJ1bGUsIGVuZEluZGV4IF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGlmIChydWxlKSB7XG5cdFx0XHRcdGxldCBsYXN0ID0gcnVsZXNbcnVsZXMubGVuZ3RoLTFdO1xuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYFN0cmluZ2AgYW5kIGxhc3Qgd2FzIGEgYFN0cmluZ2AsIG1lcmdlIHRvZ2V0aGVyXG5cdFx0XHRcdGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5TeW1ib2wpIHtcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuXHRcdFx0XHRcdC8vIGFuZCByZXBsYWNlIHdpdGggYSBydWxlIHRoYXQgbWVyZ2VzIHRoZSBrZXl3b3Jkc1xuXHRcdFx0XHRcdHJ1bGUgPSBSdWxlLm1lcmdlU3ltYm9scyhsYXN0LCBydWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRydWxlcy5wdXNoKHJ1bGUpO1xuXHRcdFx0fVxuXHRcdFx0c3RhcnRJbmRleCA9IGVuZEluZGV4ICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IHN5bnRheFRva2VuID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXG5cdFx0Ly8gaWYgd2UgZ290IGEgXCJcXFxcXCIgKHdoaWNoIGFsc28gaGFzIHRvIGdvIGludG8gdGhlIHNvdXJjZSBzdHJpbmcgYXMgXCJcXFxcXCIpXG5cdFx0Ly8gdHJlYXQgdGhlIG5leHQgdG9rZW4gYXMgYSBsaXRlcmFsIHN0cmluZyByYXRoZXIgdGhhbiBhcyBhIHNwZWNpYWwgY2hhcmFjdGVyLlxuXHRcdGlmIChzeW50YXhUb2tlbiA9PT0gXCJcXFxcXCIpIHtcblx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCArIDEpO1xuXHRcdH1cblxuXHRcdHN3aXRjaCAoc3ludGF4VG9rZW4pIHtcblx0XHRcdGNhc2UgXCJ7XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIoXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiW1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKlwiOlxuXHRcdFx0Y2FzZSBcIitcIjpcblx0XHRcdGNhc2UgXCI/XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0XHQvLyB0aGUgZm9sbG93aW5nIHNob3VsZCBBTFdBWVMgYmUgY29uc3VtZWQgYnkgdGhlIGFib3ZlXG5cdFx0XHRjYXNlIFwifVwiOlxuXHRcdFx0Y2FzZSBcIilcIjpcblx0XHRcdGNhc2UgXCJdXCI6XG5cdFx0XHRjYXNlIFwifFwiOlxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgJHtzeW50YXhUb2tlbn0gZm91bmQgYXMgaXRlbSAke3N0YXJ0SW5kZXh9IG9mICR7dGhpcy5zeW50YXh9YCk7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGlmIChzeW50YXhUb2tlbi5tYXRjaChSdWxlLktFWVdPUkRfUEFUVEVSTikpIHtcblx0XHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfa2V5d29yZChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3ltYm9sKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdEtFWVdPUkRfUEFUVEVSTiA6IC9bQS1aYS16XSsvLFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIElmIG1vcmUgdGhhbiBvbmUga2V5d29yZCBhcHBlYXJzIGluIGEgcm93LCBjb21iaW5lcyB0aGVtIGludG8gYSBzaW5nbGUgYEtleXdvcmRgIG9iamVjdC5cblx0Ly8gVGhpcyBpcyBwcmV0dHkgc2FmZSwgdW5sZXNzIHlvdSBoYXZlIGFuIG9wdGlvbmFsIGtleXdvcmQgbGlrZVxuXHQvL1x0XHRgdGhlIHtpZGVudGlmaWVyfSBvZiB0aGU/IHtleHByZXNzaW9ufWBcblx0Ly8gaW4gd2hpY2ggY2FzZSB5b3UgY2FuIHB1dCB0aGUgb3B0aW9uYWwga2V5d29yZCBpbiBwYXJlbnNcblx0Ly9cdFx0YHRoZSB7aWRlbnRpZmllcn0gb2YgKHRoZT8pIHtleHByZXNzaW9ufWBcblx0Ly9cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCwgY29uc3RydWN0b3IpIHtcblx0XHRsZXQgd29yZHMgPSBbXSwgZW5kSW5kZXg7XG4gXHRcdC8vIGVhdCBrZXl3b3JkcyB3aGlsZSB0aGV5IGxhc3Rcblx0XHRmb3IgKHZhciBpID0gc3RhcnRJbmRleDsgaSA8IHN5bnRheFN0cmVhbS5sZW5ndGg7IGkrKykge1xuXHRcdFx0bGV0IG5leHQgPSBzeW50YXhTdHJlYW1baV07XG5cdFx0XHRpZiAobmV4dC5tYXRjaChSdWxlLktFWVdPUkRfUEFUVEVSTikpIHtcblx0XHRcdFx0d29yZHMucHVzaChuZXh0KTtcblx0XHRcdFx0ZW5kSW5kZXggPSBpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBicmVhaztcblx0XHR9XG5cblx0XHRpZiAoIWNvbnN0cnVjdG9yKSBjb25zdHJ1Y3RvciA9IFJ1bGUuS2V5d29yZDtcblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IHN0cmluZzogd29yZHMuam9pbihcIiBcIikgfSk7XG5cblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCwgY29uc3RydWN0b3IgPSBSdWxlLlN5bWJvbCkge1xuXHRcdGxldCBzdHJpbmcgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cdFx0aWYgKCFjb25zdHJ1Y3RvcikgY29uc3RydWN0b3IgPSBSdWxlLlN5bWJvbDtcblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IHN0cmluZzogc3RyaW5nIH0pO1xuXG5cdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRpZiAoc3RyaW5nLnN0YXJ0c1dpdGgoXCJcXFxcXCIpKSB7XG5cdFx0XHQvLyByZW1vdmUgbGVhZGluZyBzbGFzaCBpbiBtYXRjaCBzdHJpbmcuLi5cblx0XHRcdHJ1bGUuc3RyaW5nID0gcnVsZS5zdHJpbmcuc3Vic3RyKDEpO1xuXHRcdFx0Ly8gYnV0IGxlYXZlIGl0IGluIHRvU3RyaW5nXG5cdFx0XHRydWxlLnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuXHRcdH1cblx0XHRyZXR1cm4gWyBydWxlLCBzdGFydEluZGV4IF07XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBncm91cGluZyBleHByZXNzaW9uIGAoLi4ufC4uLilgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0Ly8gTk9URTogbmVzdGVkIHBhcmVucyBtYXkgbm90IGhhdmUgYWx0ZXJuYXRpdmVzLi4uIDotKCAgIGAoYXwoYnxjKSlgIHdvbid0IHdvcms/Pz9cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCIoXCIsIFwiKVwiLCBzdGFydEluZGV4KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHQvLyBzcGxpdCBpbnRvIGdyb3VwcywgaW5jbHVkaW5nIG5lc3RlZCBwYXJlbnNcblx0XHRsZXQgYWx0ZXJuYXRpdmVzID1cblx0XHRcdGdyb3VwQWx0ZXJuYXRpdmVzKHNsaWNlKVxuXHRcdFx0Lm1hcChmdW5jdGlvbihncm91cCkge1xuXHRcdFx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2Vucyhncm91cCwgW10pO1xuXHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0c1swXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IFJ1bGUuU2VxdWVuY2UoeyBydWxlczogcmVzdWx0cyB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRsZXQgcnVsZSA9IGFsdGVybmF0aXZlcy5sZW5ndGggPT09IDEgPyBhbHRlcm5hdGl2ZXNbMF0gOiBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlczogYWx0ZXJuYXRpdmVzIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cblx0XHRmdW5jdGlvbiBncm91cEFsdGVybmF0aXZlcyh0b2tlbnMpIHtcblx0XHRcdGxldCBhbHRlcm5hdGl2ZXMgPSBbXTtcblx0XHRcdGxldCBjdXJyZW50ID0gW107XG5cdFx0XHRmb3IgKGxldCBpID0gMCwgdG9rZW47IHRva2VuID0gdG9rZW5zW2ldOyBpKyspIHtcblx0XHRcdFx0Ly8gaGFuZGxlIGFsdGVybmF0ZSBtYXJrZXJcblx0XHRcdFx0aWYgKHRva2VuID09PSBcInxcIikge1xuXHRcdFx0XHRcdGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBbXTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBoYW5kbGUgbmVzdGVkIHBhcmVuc1xuXHRcdFx0XHRlbHNlIGlmICh0b2tlbiA9PT0gXCIoXCIpIHtcblx0XHRcdFx0XHRsZXQgeyBlbmRJbmRleCB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBcIihcIiwgXCIpXCIsIGkpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBjdXJyZW50LmNvbmNhdCh0b2tlbnMuc2xpY2UoaSwgZW5kSW5kZXggKyAxKSk7XG5cdFx0XHRcdFx0aSA9IGVuZEluZGV4O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGN1cnJlbnQucHVzaCh0b2tlbik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChjdXJyZW50Lmxlbmd0aCkgYWx0ZXJuYXRpdmVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRyZXR1cm4gYWx0ZXJuYXRpdmVzO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCByZXBlYXQgaW5kaWNhdG9yIGA/YCwgYCtgIG9yIGAqYCBieSBhdHRhY2hpbmcgaXQgdG8gdGhlIHByZXZpb3VzIHJ1bGUuXG5cdHBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBzeW1ib2wgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cdFx0bGV0IHJ1bGUgPSBydWxlc1tydWxlcy5sZW5ndGggLSAxXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgYXR0YWNoIHJlcGVhdCBzeW1ib2wgJHtzeW1ib2x9IHRvIGVtcHR5IHJ1bGUhYCk7XG5cblx0XHQvLyBUcmFuc2Zvcm0gbGFzdCBydWxlIGludG8gYSByZXBlYXQgZm9yIGAqYCBhbmQgYCtgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiKlwiIHx8IHN5bWJvbCA9PT0gXCIrXCIpIHtcblx0XHRcdGxldCBhcmd1bWVudCA9IHJ1bGUuYXJndW1lbnQ7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuUmVwZWF0KHsgcnVsZSB9KTtcblx0XHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdFx0Ly8gcHVzaCBpbnRvIHJ1bGUgc3RhY2sgaW4gcGxhY2Ugb2Ygb2xkIHJ1bGVcblx0XHRcdHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdID0gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBSdWxlIGlzIG9wdGlvbmFsIGZvciBgP2AgYW5kIGAqYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIj9cIiB8fCBzeW1ib2wgPT09IFwiKlwiKSB7XG5cdFx0XHRydWxlLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gWyB1bmRlZmluZWQsIHN0YXJ0SW5kZXggXVxuXHR9LFxuXG5cdC8vIE1hdGNoIGB7PHJ1bGVOYW1lPn1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBtYXRjaCA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJ7XCIsIFwifVwiLCBzdGFydEluZGV4KTtcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA9PT0gMyAmJiBtYXRjaC5zbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gbWF0Y2guc2xpY2VbMF07XG5cdFx0XHRtYXRjaC5zbGljZSA9IG1hdGNoLnNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID4gMSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBwcm9jZXNzIHJ1bGVzIHdpdGggbW9yZSB0aGFuIG9uZSBydWxlIG5hbWU6IHske21hdGNoLnNsaWNlLmpvaW4oXCJcIil9fWApO1xuXG5cdFx0bGV0IHBhcmFtcyA9IHsgcnVsZTogbWF0Y2guc2xpY2VbMF0gfTtcblxuXHRcdC8vIHNlZSBpZiB0aGVyZSdzIGEgYG5vdGAgcnVsZSBpbiB0aGVyZVxuXHRcdGxldCBiYW5nUG9zaXRpb24gPSBwYXJhbXMucnVsZS5pbmRleE9mKFwiIVwiKTtcblx0XHRpZiAoYmFuZ1Bvc2l0aW9uICE9PSAtMSkge1xuXHRcdFx0cGFyYW1zLm5vdCA9IHBhcmFtcy5ydWxlLnN1YnN0cihiYW5nUG9zaXRpb24gKyAxKTsgLy9bIHBhcmFtcy5ydWxlLnN1YnN0cihiYW5nUG9zaXRpb24gKyAxKSBdO1xuXHRcdFx0cGFyYW1zLnJ1bGUgPSBwYXJhbXMucnVsZS5zdWJzdHIoMCwgYmFuZ1Bvc2l0aW9uKTtcblx0XHR9XG5cblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlN1YnJ1bGUocGFyYW1zKTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBtYXRjaC5lbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwLCBjb25zdHJ1Y3RvciA9IFJ1bGUuTGlzdCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIltcIiwgXCJdXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHRpZiAocmVzdWx0cy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCBzdHVmZiBhdCBlbmQgb2YgbGlzdDogWyR7c2xpY2Uuam9pbihcIiBcIil9XWApO1xuXHRcdH1cblx0XHRsZXQgWyBpdGVtLCBkZWxpbWl0ZXIgXSA9IHJlc3VsdHM7XG5cblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IGl0ZW0sIGRlbGltaXRlciB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG59KTtcblxuXG5cbi8vICMjICBBZGQgbWV0aG9kcyB0byBQYXJzZXIgdG8gZGVmaW5lIHJ1bGVzIHVzaW5nIHRoZSBhYm92ZSBzeW50YXguXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhQYXJzZXIucHJvdG90eXBlLCB7XG5cblx0Ly8gUGFyc2UgYSBgcnVsZVN5bnRheGAgcnVsZSBhbmQgYWRkIGl0IHRvIG91ciBsaXN0IG9mIHJ1bGVzLlxuXHQvLyBSZXR1cm5zIHRoZSBuZXcgcnVsZS5cblx0Ly8gTG9ncyBwYXJzaW5nIGVycm9ycyBidXQgYWxsb3dzIHRoaW5ncyB0byBjb250aW51ZS5cblx0YWRkU2VxdWVuY2U6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFNlcXVlbmNlKG5hbWUsIHN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpKTtcblxuXHRcdGlmICh0eXBlb2YgY29uc3RydWN0b3IgIT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0cHJvcGVydGllcyA9IGNvbnN0cnVjdG9yO1xuXHRcdFx0Y29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlO1xuXHRcdH1cblx0XHR0cnkge1xuXHRcdFx0bGV0IHJ1bGUgPSBSdWxlLnBhcnNlUnVsZVN5bnRheChydWxlU3ludGF4LCBjb25zdHJ1Y3Rvcik7XG5cdFx0XHQvLyBSZWZsZWN0IHRoZSBydWxlIGJhY2sgb3V0IHRvIG1ha2Ugc3VyZSBpdCBsb29rcyAobW9yZSBvciBsZXNzKSB0aGUgc2FtZVxuXHRcdFx0aWYgKFBhcnNlci5kZWJ1ZykgY29uc29sZS5sb2coYEFkZGVkIHJ1bGUgJyR7bmFtZX0nOlxcbiAgSU5QVVQ6ICR7cnVsZVN5bnRheH0gXFxuIE9VVFBVVDogJHtydWxlfWApO1xuXG4vL2NvbnNvbGUuaW5mbyhuYW1lLCBjb25zdHJ1Y3RvciwgcnVsZSk7XG5cdFx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5ncm91cChgRXJyb3IgcGFyc2luZyBzeW50YXggZm9yIHJ1bGUgJyR7bmFtZX0nOmApO1xuXHRcdFx0Y29uc29sZS5sb2coYHN5bnRheDogJHtydWxlU3ludGF4fWApO1xuXHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHR9XG5cdH19LFxuXG5cdGFkZFN0YXRlbWVudDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlN0YXRlbWVudCwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFN0YXRlbWVudChuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSk7XG5cblx0XHRsZXQgcnVsZSA9IHRoaXMuYWRkU2VxdWVuY2UobmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRFeHByZXNzaW9uOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuRXhwcmVzc2lvbiwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZEV4cHJlc3Npb24obmFtZSwgc3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcykpO1xuXG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmFkZFNlcXVlbmNlKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZExpc3Q6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5MaXN0LCBwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gQWRkIGEgYnVuY2ggb2Ygc3ludGF4ZXMgYXQgb25jZSBpZiB3ZSBnb3QgYW4gYXJyYXkgb2Ygc3ludGF4ZXNcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSlcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkTGlzdChuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSk7XG5cblx0XHRsZXQgc3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgocnVsZVN5bnRheCk7XG5cdFx0bGV0IHJ1bGUgPSAoUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pWzBdO1xuXHRcdGlmICghcnVsZSkgcmV0dXJuO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZEtleXdvcmQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5LZXl3b3JkLCBwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gQWRkIGEgYnVuY2ggb2Ygc3ludGF4ZXMgYXQgb25jZSBpZiB3ZSBnb3QgYW4gYXJyYXkgb2Ygc3ludGF4ZXNcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSlcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkS2V5d29yZChuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSk7XG5cblx0XHRsZXQgc3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgocnVsZVN5bnRheCk7XG5cdFx0bGV0IHJ1bGUgPSAoUnVsZS5wYXJzZVJ1bGVTeW50YXhfa2V5d29yZChzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pWzBdO1xuXHRcdGlmICghcnVsZSkgcmV0dXJuO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZFN5bWJvbDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlN5bWJvbCwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFN5bWJvbChuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSk7XG5cblx0XHQvLyBUT0RPOiBhc3N1bWUgd2UganVzdCBoYXZlIG9uZSBzeW1ib2wgb2YgbWFueSBsZXR0ZXJzLi4uXG5cdFx0bGV0IHN0cmVhbSA9IFtydWxlU3ludGF4XTtcblx0XHRsZXQgcnVsZSA9IChSdWxlLnBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKVswXTtcblx0XHRpZiAoIXJ1bGUpIHJldHVybjtcblx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHR9fSxcblxuXHQvLyBBZGQgcG9zdGZpeCBvcGVyYXRvciwgc3VjaCBhcyBcImEgaXMgZGVmaW5lZFwiXG5cdC8vIE5PVEU6IGlmIHlvdSBoYXZlIG1vcmUgdGhhbiBvbmUgbWF0Y2hpbmcgb3BlcmF0b3IsXG5cdC8vXHRcdCBwYXNzIGluIGFuIGFycmF5IG9mIHNpbXBsZSBzdHJpbmdzIHNvIGFsbCBvZiBvdXIgb3BlcmF0b3JzIGFyZSBzaW1wbGUgc3RyaW5ncy5cblx0YWRkUG9zdGZpeE9wZXJhdG9yOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKSB7XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpIHtcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkUG9zdGZpeE9wZXJhdG9yKG5hbWUsIHN5bnRheCwgcHJvcGVydGllcykpO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBydWxlU3ludGF4LCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkge1xuXHRcdFx0aWYgKCFydWxlLnRvSlMpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgcG9zdGZpeCBvcGVyYXRvciBydWxlICcke25hbWV9JyB0byBzcGVjaWZ5ICd0b0pTJyBmdW5jdGlvbmApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gY2xlYXIgbGlzdCBvZiBpbmZpeCBvcGVyYXRvcnMgZm9yIGdldHRlciBiZWxvd1xuXHRcdFx0ZGVsZXRlIHRoaXMuX19wb3N0Zml4T3BlcmF0b3JzO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShcInBvc3RmaXhfb3BlcmF0b3JcIiwgcnVsZSk7XG5cdFx0fVxuXHR9fSxcblxuXHQvLyBMaXN0IG9mIHBvc3RmaXggb3BlcmF0b3JzIGFzIHN0cmluZ3MuXG5cdC8vIFJlLW1lbW9pemVkIGFmdGVyIGBhZGRJbmZpeE9wZXJhdG9yYCBhYm92ZS5cblx0cG9zdGZpeE9wZXJhdG9yczogZGVmaW5lTWVtb2l6ZWQoXCJfX3Bvc2ZpeE9wZXJhdG9yc1wiLFxuXHRcdGZ1bmN0aW9uKCl7IHJldHVybiB0aGlzLnJ1bGVzW1wicG9zdGZpeF9vcGVyYXRvclwiXVxuXHRcdFx0XHRcdFx0JiYgdGhpcy5ydWxlc1tcInBvc3RmaXhfb3BlcmF0b3JcIl0ucnVsZXMubWFwKHJ1bGUgPT4gcnVsZS5zdHJpbmcpO1xuXHR9KVxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZVN5bnRheC5qcyJdLCJzb3VyY2VSb290IjoiIn0=