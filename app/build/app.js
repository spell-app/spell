webpackJsonp([0],{

/***/ 100:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__lib_keys__ = __webpack_require__(99);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lib_match_keys__ = __webpack_require__(278);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__lib_parse_keys__ = __webpack_require__(279);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__lib_uuid__ = __webpack_require__(563);
/* unused harmony export _resetStore */
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * @module store
 *
 */





/**
 * private
 * 
 */

// dict for class prototypes => bindings
var _handlers = new Map();

// all mounted instances that have keybindings
var _instances = new Set();

// for testing
function _resetStore() {
  _handlers.clear();
  _instances.clear();
}

/**
 * public
 *
 */

var Store = {

  /**
   * activate
   *
   * @access public
   * @param {object} instance Instantiated class that extended React.Component, to be focused to receive keydown events
   */
  activate: function activate(instances) {
    var instancesArray = [].concat(instances);

    // if no components were found as ancestors of the event target,
    // effectively deactivate keydown handling by capping the set of instances
    // with `null`.
    if (!instancesArray.length) {
      _instances.add(null);
    } else {
      _instances.delete(null);

      // deleting and then adding the instance(s) has the effect of sorting the set
      // according to instance activation (ascending)
      instancesArray.forEach(function (instance) {
        _instances.delete(instance);
        _instances.add(instance);
      });
    }
  },


  /**
   * deleteInstance
   *
   * @access public
   * @param {object} target Instantiated class that extended React.Component
   * @return {boolean} The value set.has( target ) would have returned prior to deletion
   */
  deleteInstance: function deleteInstance(target) {
    _instances.delete(target);
  },
  findBindingForEvent: function findBindingForEvent(event) {
    if (!_instances.has(null)) {
      var keyMatchesEvent = function keyMatchesEvent(keySet) {
        return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lib_match_keys__["a" /* default */])({ keySet: keySet, event: event });
      };

      // loop through instances in reverse activation order so that most
      // recently activated instance gets first dibs on event
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = [].concat(_toConsumableArray(_instances)).reverse()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var instance = _step.value;

          var bindings = this.getBinding(instance.constructor.prototype);
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = bindings[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var _step2$value = _slicedToArray(_step2.value, 2),
                  keySets = _step2$value[0],
                  fn = _step2$value[1];

              if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__lib_keys__["b" /* allKeys */])(keySets) || keySets.some(keyMatchesEvent)) {
                // return when matching keybinding is found - i.e. only one
                // keybound component can respond to a given key code. to get around this,
                // scope a common ancestor component class with @keydown and use
                // @keydownScoped to bind the duplicate keys in your child components
                // (or just inspect nextProps.keydown.event).
                return { fn: fn, instance: instance };
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
    }
    return null;
  },


  /**
   * getBinding
   *
   * @access public
   * @param {object} target Class used as key in dict of key bindings
   * @return {object} The object containing bindings for the given class
   */
  getBinding: function getBinding(_ref) {
    var __reactKeydownUUID = _ref.__reactKeydownUUID;

    return _handlers.get(__reactKeydownUUID);
  },


  /**
   * getInstances
   *
   * @access public
   * @return {set} All stored instances (all mounted component instances with keybindings)
   */
  getInstances: function getInstances() {
    return _instances;
  },


  /**
   * isEmpty
   *
   * @access public
   * @return {number} Size of the set of all stored instances
   */
  isEmpty: function isEmpty() {
    return !_instances.size;
  },


  /**
   * setBinding
   *
   * @access public
   * @param {object} args All arguments necessary to set the binding
   * @param {array} args.keys Key codes that should trigger the fn
   * @param {function} args.fn The callback to be triggered when given keys are pressed
   * @param {object} args.target The decorated class
   */
  setBinding: function setBinding(_ref2) {
    var keys = _ref2.keys,
        fn = _ref2.fn,
        target = _ref2.target;

    var keySets = keys ? __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__lib_parse_keys__["a" /* default */])(keys) : __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__lib_keys__["b" /* allKeys */])();
    var __reactKeydownUUID = target.__reactKeydownUUID;

    if (!__reactKeydownUUID) {
      target.__reactKeydownUUID = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3__lib_uuid__["a" /* default */])();
      _handlers.set(target.__reactKeydownUUID, new Map([[keySets, fn]]));
    } else {
      _handlers.get(__reactKeydownUUID).set(keySets, fn);
    }
  }
};

/* harmony default export */ __webpack_exports__["b"] = Store;

/***/ }),

/***/ 147:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _class, _temp; // Spell "parser" class.
//

// TODO: dependency-inject tokenizer?


var _Tokenizer = __webpack_require__(246);

var _Tokenizer2 = _interopRequireDefault(_Tokenizer);

var _Rule = __webpack_require__(148);

var _Rule2 = _interopRequireDefault(_Rule);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// GRRR... will SOMEONE on the node team please implement console.group ???
if (!console.group) console.group = console.log;
if (!console.groupEnd) console.groupEnd = console.log;

var Parser = (_temp = _class = function () {

	// Constructor.


	// Set to `true` to output timing info.
	function Parser(properties) {
		_classCallCheck(this, Parser);

		this.Tokenzier = _Tokenizer2.default;
		this._rules = {};

		Object.assign(this, properties);
	}

	//
	//### Parsing
	//
	// Parse `ruleName` rule at head of `text`.
	// If you pass only one argument, we'll assume that's `text` and you want to match `statements`.
	// Handles optional and repeating rules as well as eating whitespace.
	// Returns result of parse.
	//TESTME


	// Pointer to our tokenizer.

	// Set to `true` to output debug info while adding rules


	_createClass(Parser, [{
		key: "parse",
		value: function parse(ruleName, text) {
			// If only one argument, assume that's the text and parse `statements`
			if (arguments.length === 1) {
				text = ruleName;
				ruleName = "statements";
			}

			// Convert to tokens.
			if (Parser.TIME) console.time("tokenize");
			var tokens = _Tokenizer2.default.tokenize(text);
			// eat non-indent whitespace (since we ignore it)
			tokens = tokens.filter(function (token) {
				return !_Tokenizer2.default.isNormalWhitespace(token);
			});
			if (Parser.TIME) console.timeEnd("tokenize");

			// Bail if we didn't get any tokens back.
			//TODO: WARN?  ERROR?
			if (!tokens || tokens.length === 0) return undefined;

			if (Parser.TIME) console.time("parse");
			// If we're not parsing `statements`, eat whitespace at the beginning of the line.
			if (ruleName !== "statements") {
				tokens = _Tokenizer2.default.eatWhitespaceTokens(tokens);
			}

			// Parse the rule or throw an exception if rule not found.
			var result = this.parseRuleOrDie(ruleName, tokens, 0, tokens.length, undefined, "parser.parse()");
			if (Parser.TIME) console.timeEnd("parse");
			return result;
		}

		// Parse something:
		//	- if one string argument, does a `compileStatements()`
		// Returns the `toString()` or throws.
		//TESTME

	}, {
		key: "compile",
		value: function compile(ruleName, text) {
			// If only one argument, assume that's the text and parse `statements`
			if (arguments.length === 1) {
				text = ruleName;
				ruleName = "statements";
			}
			var result = this.parse(ruleName, text);
			if (!result) throw new SyntaxError("parser.parse('" + ruleName + "', '" + text + "'): can't parse this");
			return result.toSource(this);
		}

		// Parse a named rule (defined in this parser or in any of our `imports`), returning the "best" match.
		// Returns `undefined` if no match.
		// Throws if NOBODY implements `ruleName`.
		//
		// NOTE: currently "best" is defined as the first rule in our `imports` which matches...

	}, {
		key: "parseRuleOrDie",
		value: function parseRuleOrDie(ruleName, tokens, start, end, stack) {
			var callingContext = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : "parseRuleOrDie";

			// Keep track of whether rule was EVER found or not.
			var ruleFound = false;
			var imports = this.imports,
			    index = 0,
			    parser = void 0;
			var results = [];
			while (parser = imports[index++]) {
				var rule = parser._rules[ruleName];
				if (!rule) continue;
				var result = rule.parse(this, tokens, start, end, stack);
				if (result) results.push(result);
				ruleFound = true;
			}
			// If never found, throw.
			if (!ruleFound) throw new SyntaxError(callingContext + ": rule '" + ruleName + "' not found");

			// If no match, return undefined.
			if (results.length === 0) return undefined;

			// If exactly one match, return that.
			if (results.length === 1) return results[0];

			// Otherwise return the longest match.
			return results.reduce(function (largest, next) {
				if (next.nextStart > largest.nextStart) return next;
				return largest;
			}, results[0]);
		}

		// Test whether a rule (which may be specified by name) MIGHT be found in head of stream.
		// Returns:
		//	- `true` if the rule MIGHT be matched.
		//	- `false` if there is no way the rule can be matched.
		//	- `undefined` if not determinstic (eg: no way to tell quickly).

	}, {
		key: "testRule",
		value: function testRule(rule, tokens, start, end) {
			// Handle rule instance
			if (rule instanceof _Rule2.default) {
				return rule.test(this, tokens, start, end);
			}
			// Handle named rule by looking in our imports
			var imports = this.imports,
			    index = 0,
			    parser = void 0;
			while (parser = imports[index++]) {
				var nextRule = parser._rules[rule];
				if (!nextRule) continue;
				var result = nextRule.test(this, tokens, start, end);
				if (result !== undefined) return result;
			}
		}

		//
		// ### 	Imports
		//		Parsers depend on other parsers for their `rules`.
		//		Imports are lazy-bound (and we assume the build file will include all necessary imports).
		//

		// Add one or more named imports to this parser.
		// Imports increase in priority the later they are in the list.

	}, {
		key: "import",
		value: function _import() {
			for (var _len = arguments.length, imports = Array(_len), _key = 0; _key < _len; _key++) {
				imports[_key] = arguments[_key];
			}

			// REVERSE the list of imports, so the most general one is LAST
			// Thus more specific imports will be EARLIER in the `imports` list.

			// Create new array of imports and add import names passed in.
			this._imports = (this._imports || []).concat(imports.reverse());
			// clear memoize variable for `imports`.
			delete this.__imports;
		}

		// Getter to return list of our `imports` as `Parser` objects, INCLUDING `this` parser itself!
		// Most specific import (eg: ourself) is first in the list.
		// Throws if an import can't be found.

	}, {
		key: "addRule",


		// Add a `rule` to our list of rules!
		// Converts to `alternatives` on re-defining the same rule.
		value: function addRule(ruleName, rule) {
			var _this = this;

			// Clear memoized `__rules`
			delete this.__rules;

			// If passed a function, create an instance for the actual rule.
			// This is commonly done so JS will give us meaningful class names in debug output.
			if (typeof rule === "function") {
				rule = new rule();
			}

			// If we got an array of `ruleNames`, recursively add under each name with the same `rule`.
			if (Array.isArray(ruleName)) {
				ruleName.forEach(function (ruleName) {
					return _this.addRule(ruleName, rule);
				});
				return rule;
			}

			// Set `ruleName` if it hasn't been explicitly set.
			if (!rule.ruleName) rule.ruleName = ruleName;

			// If a rule of this name already exists
			var existing = this._rules[ruleName];
			if (existing) {
				// Convert to an `Alternatives` if not one already.
				if (!(existing instanceof _Rule2.default.Alternatives)) {
					if (Parser.DEBUG) console.log("Converting rule '" + ruleName + "' to alternatives");
					this._rules[ruleName] = new _Rule2.default.Alternatives({ ruleName: ruleName, rules: [existing] });
					// copy argument name over (???)
					if (existing.argument) this._rules[ruleName].argument = existing.argument;
				}
				if (Parser.DEBUG) console.log("Adding rule '" + rule.ruleName + "' to '" + ruleName + "': ", rule);
				// Add rule to the alternatives.
				this._rules[ruleName].addRule(rule);
			}
			// Otherwise just remember the rule.
			else {
					this._rules[ruleName] = rule;
				}

			// make a note if we're adding a left-recursive rule
			//TODO: this doesn't fly if adding under multiple names...  :-(
			if (Parser.ruleIsLeftRecursive(ruleName, rule)) {
				if (!rule instanceof _Rule2.default.Sequence) {
					throw new TypeError("Error defining rule '" + ruleName + "': Only Sequence rules can be leftRecusive");
				}
				// You must define a `testRule` for left recursive sequences.
				// e.g. `testRule = new Rule.Match({ match: ["something"] })`
				if (!rule.testRule) {
					throw new TypeError("Error defining rule '" + rule.ruleName + "': You must define a 'testRule' for leftRecusive rules.");
				}
				if (Parser.DEBUG) console.info("marking ", rule, " as left recursive!");

				rule.leftRecursive = true;
			}

			return rule;
		}

		//
		// ### Parser registry.
		//

	}, {
		key: "imports",
		get: function get() {
			if (!this.__imports) {
				var imports = this._imports ? this._imports.map(Parser.getContextOrDie) : [];
				this.__imports = [this].concat(imports);
			}
			return this.__imports;
		}

		//
		// ### Rules
		//
		// Start with an empty map of rules.

	}, {
		key: "rules",


		// DANGEROUS: return map of array of named rules for us and our imports
		// NOTE: We memoize this but there's nothing that resets this when our imports change!
		get: function get() {
			if (!this.__rules) {
				var output = this.__rules = {};
				// For each parser
				this.imports.forEach(function (parser) {
					var _loop = function _loop() {
						var rule = parser._rules[ruleName];
						var alternatives = output[ruleName] || (output[ruleName] = new _Rule2.default.Alternatives({ ruleName: ruleName }));

						if (rule instanceof _Rule2.default.Alternatives && rule.ruleName === ruleName && !rule.argument) {
							rule.rules.forEach(function (alternative) {
								return alternatives.addRule(alternative);
							});
						} else {
							alternatives.addRule(rule);
						}
					};

					// Merge rules into an Alternatives in output rules.
					for (var ruleName in parser._rules) {
						_loop();
					}
				});
			}
			return this.__rules;
		}
	}], [{
		key: "forContext",


		// Get a parser for a given `contextName`.
		// Will re-use existing parser, or create a new one if not already defined.
		value: function forContext(contextName) {
			if (!Parser.REGISTRY[contextName]) {
				Parser.REGISTRY[contextName] = new Parser({ contextName: contextName });
			}
			return Parser.REGISTRY[contextName];
		}

		// Return a parser for `contextName` or throw an exception if not found.

	}, {
		key: "getContextOrDie",
		value: function getContextOrDie(contextName) {
			if (Parser.REGISTRY[contextName]) return Parser.REGISTRY[contextName];
			throw new TypeError("Parser.getContextOrDie(): contextName '" + contextName + "' not found.");
		}

		//
		// ## Utility methods
		//

		// Is the specified rule left-recursive?
		// True for sequences where the first non-optional rule recursively calls `ruleName`.

	}, {
		key: "ruleIsLeftRecursive",
		value: function ruleIsLeftRecursive(ruleName, rule) {
			if (!(rule instanceof _Rule2.default.Sequence) || !rule.rules) return false;
			//console.log(ruleName, rule);
			var index = 0,
			    subrule = undefined;
			while (subrule = rule.rules[index++]) {
				// ignore optional rules
				if (subrule.optional) continue;
				if (subrule instanceof _Rule2.default.Subrule && subrule.rule === ruleName) return true;
				return false;
			}
			return false;
		}

		// Find the matching instance of possibly nested `endToken` to balance `startToken`
		//	in array of `tokens` (strings).
		// If successful, returns `{ start, end, slice }`
		// Throws if unsucessful.

	}, {
		key: "findNestedTokens",
		value: function findNestedTokens(tokens, startToken, endToken) {
			var start = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

			if (tokens[start] !== startToken) throw new SyntaxError("Expected '" + startToken + "' at index " + start + " of tokens");
			var nesting = 0;
			var nested = false;
			for (var end = start + 1, lastIndex = tokens.length; end < lastIndex; end++) {
				var token = tokens[end];
				if (token === startToken) {
					nesting++;
					nested = true;
				}
				if (token === endToken) {
					if (nesting === 0) return { start: start, end: end, slice: tokens.slice(start + 1, end), nested: nested };
					nesting--;
				}
			}
			throw new SyntaxError("Couldn't find matching '" + endToken + "'s starting at item " + start);
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
}(), _class.DEBUG = false, _class.TIME = false, _class.REGISTRY = {}, _class.REGEXP_SPECIAL_CHARACTERS = function () {
	var chars = {};
	"\\/^$*+?.()|{},[]".split("").forEach(function (char) {
		return chars[char] = true;
	});
	return chars;
}(), _temp);
exports.default = Parser;

/***/ }),

/***/ 148:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); //	# Parser Rules
//	Rules can be as simple as a string `Keyword` or a complex sequence of (nested) rules.
//
//	Parse a rule with `rule.parse(parser, tokens, start, end)`, this will either:
//		- return `undefined` if the rule doesn't match the head of the tokens, or
//		- return a CLONE of the rule with at least the following:
//			- `matched`		Results of your parse.
//			- `nextStart`	Place where next match should start (eg: one beyond what you matched).
//
//	The clone returned above can be manipulated with
//		- `rule.results`			Return matched arguments in a format suitable to do:
//		- `rule.toSource(context)`	Return javascript source to interpret the rule.
//


var _Parser = __webpack_require__(147);

var _Parser2 = _interopRequireDefault(_Parser);

var _global = __webpack_require__(462);

var _global2 = _interopRequireDefault(_global);

var _string = __webpack_require__(902);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Rule = function () {
	function Rule() {
		_classCallCheck(this, Rule);

		for (var _len = arguments.length, props = Array(_len), _key = 0; _key < _len; _key++) {
			props[_key] = arguments[_key];
		}

		Object.assign.apply(Object, [this].concat(props));
	}

	// Clone this rule and add any `props` passed in.


	_createClass(Rule, [{
		key: "clone",
		value: function clone(props) {
			return new this.constructor(this, props);
		}

		//
		//	Parsing primitives -- you MUST implement these in your subclasses!
		//

		// Attempt to match this rule between `start` and `end` of `tokens`.
		// Returns results of the parse or `undefined`.

	}, {
		key: "parse",
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];
			var stack = arguments[4];

			return undefined;
		}

		// Test to see if bits of our rule are found ANYWHERE between `start` and `end` in the `tokens`.
		// This is used by complicated (eg: left recursive) rules to exit quickly if there's no chance.
		// Returns:
		//	- `true` if the rule MIGHT be matched.
		//	- `false` if there is no way the rule can be matched.
		//	- `undefined` if not determinstic (eg: no way to tell quickly).

	}, {
		key: "test",
		value: function test(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];

			return undefined;
		}
	}, {
		key: "addToBlacklist",
		value: function addToBlacklist() {
			var _this = this;

			if (!this.blacklist) this.blacklist = {};

			for (var _len2 = arguments.length, words = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
				words[_key2] = arguments[_key2];
			}

			words.forEach(function (word) {
				return _this.blacklist[word] = true;
			});
		}

		//
		// ## output as source
		//

		// "gather" arguments in preparation to call `toSource()`
		// Only callable after parse is completed.
		// NOTE: you may want to memoize the results.

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
		get: function get() {
			return this;
		}
	}, {
		key: "ruleType",
		get: function get() {
			return this.constructor.name;
		}
	}]);

	return Rule;
}();

// Rule for one or more sequential literal values to match, which include punctuation such as `(` etc.


exports.default = Rule;
Rule.Match = function (_Rule) {
	_inherits(match, _Rule);

	function match() {
		var _ref;

		_classCallCheck(this, match);

		for (var _len3 = arguments.length, props = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
			props[_key3] = arguments[_key3];
		}

		// coerce to an array (a bit slower but cleaner).
		var _this2 = _possibleConstructorReturn(this, (_ref = match.__proto__ || Object.getPrototypeOf(match)).call.apply(_ref, [this].concat(props)));

		if (!Array.isArray(_this2.match)) _this2.match = [_this2.match];
		return _this2;
	}

	// Attempt to match this rule in the `tokens`.
	// Returns results of the parse or `undefined`.


	_createClass(match, [{
		key: "parse",
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];
			var stack = arguments[4];

			if (!this.headStartsWith(this.match, tokens, start, end)) return undefined;
			// if only one and we have a blacklist, make sure it's not in the blacklist!
			if (this.match.length === 1 && this.blacklist && this.blacklist[this.match[0]]) return undefined;

			return this.clone({
				matched: this.match.join(this.matchDelimiter),
				nextStart: start + this.match.length
			});
		}

		// Does this match appear anywhere in the tokens?

	}, {
		key: "test",
		value: function test(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];

			var matchStart = tokens.indexOf(this.match[0], start);
			return matchStart !== -1 && this.headStartsWith(this.match, tokens, matchStart, end);
		}

		// Does the head of the tokens start with an array of matches?

	}, {
		key: "headStartsWith",
		value: function headStartsWith(matches, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : tokens.length;

			// bail if match would go beyond the end
			if (start + matches.length > end) return false;

			// Special case for one match, maybe premature optimization but...
			if (matches.length === 1) return matches[0] === tokens[start];

			for (var i = 0; i < matches.length; i++) {
				if (matches[i] !== tokens[start + i]) return false;
			}
			return true;
		}
	}, {
		key: "toString",
		value: function toString() {
			return "" + this.match.join(this.matchDelimiter) + (this.optional ? '?' : '');
		}
	}]);

	return match;
}(Rule);
Rule.Match.prototype.matchDelimiter = "";

// Syntactic sugar to separate `symbols` (which don't require spaces) from `keywords` (which do).
Rule.Symbol = function (_Rule$Match) {
	_inherits(symbol, _Rule$Match);

	function symbol() {
		_classCallCheck(this, symbol);

		return _possibleConstructorReturn(this, (symbol.__proto__ || Object.getPrototypeOf(symbol)).apply(this, arguments));
	}

	return symbol;
}(Rule.Match);

Rule.Keyword = function (_Rule$Match2) {
	_inherits(keyword, _Rule$Match2);

	function keyword() {
		_classCallCheck(this, keyword);

		return _possibleConstructorReturn(this, (keyword.__proto__ || Object.getPrototypeOf(keyword)).apply(this, arguments));
	}

	return keyword;
}(Rule.Match);
Rule.Keyword.prototype.matchDelimiter = " ";

// Regex pattern to match a SINGLE token.
// `rule.pattern` is the regular expression to match.
// Note that you MUST start your pattern with `^` and end with `$` to make sure it matches the entire token.
// Note that this can only match a single token!
Rule.Pattern = function (_Rule2) {
	_inherits(Pattern, _Rule2);

	function Pattern() {
		_classCallCheck(this, Pattern);

		return _possibleConstructorReturn(this, (Pattern.__proto__ || Object.getPrototypeOf(Pattern)).apply(this, arguments));
	}

	_createClass(Pattern, [{
		key: "parse",

		// Attempt to match this pattern at the beginning of the tokens.
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];
			var stack = arguments[4];

			var token = tokens[start];
			if (typeof token !== "string") return undefined;

			var match = token.match(this.pattern);
			if (!match) return undefined;

			// bail if present in blacklist
			var matched = match[0];
			if (this.blacklist && this.blacklist[matched]) return undefined;

			return this.clone({
				matched: matched,
				nextStart: start + 1
			});
		}

		// Test to see if any of our pattern is found ANYWHERE in the tokens.

	}, {
		key: "test",
		value: function test(parser, tokens) {
			var _this6 = this;

			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];

			return tokens.slice(start, end).some(function (token) {
				return typeof token === "string" && token.match(_this6.pattern);
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

// Subrule -- name of another rule to be called.
// `rule.rule` is the name of the rule in `parser.rules`.
Rule.Subrule = function (_Rule3) {
	_inherits(Subrule, _Rule3);

	function Subrule() {
		_classCallCheck(this, Subrule);

		return _possibleConstructorReturn(this, (Subrule.__proto__ || Object.getPrototypeOf(Subrule)).apply(this, arguments));
	}

	_createClass(Subrule, [{
		key: "parse",
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];
			var stack = arguments[4];

			var result = parser.parseRuleOrDie(this.rule, tokens, start, end, stack, "parse subrule '" + this.rule + "'");
			if (!result) return undefined;

			if (this.argument) result.argument = this.argument;
			return result;
		}

		// Test to see if any of our alternatives are found ANYWHERE in the tokens.

	}, {
		key: "test",
		value: function test(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];

			return parser.testRule(this.rule, tokens, start);
		}
	}, {
		key: "toString",
		value: function toString() {
			return "{" + (this.argument ? this.argument + ":" : "") + this.rule + "}" + (this.optional ? '?' : '');
		}
	}]);

	return Subrule;
}(Rule);

// Sequence of rules to match.
Rule.Sequence = function (_Rule4) {
	_inherits(Sequence, _Rule4);

	function Sequence() {
		_classCallCheck(this, Sequence);

		return _possibleConstructorReturn(this, (Sequence.__proto__ || Object.getPrototypeOf(Sequence)).apply(this, arguments));
	}

	_createClass(Sequence, [{
		key: "parse",
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];
			var stack = arguments[4];

			// If we have a `testRule` defined
			if (this.testRule) {
				// Forget it if there is NO WAY the rule could be matched.
				if (parser.testRule(this.testRule, tokens, start) === false) return undefined;
			}

			// If we're a leftRecursive sequence...
			if (this.leftRecursive) {
				// If the stack already contains this rule, forget it.
				if (stack && stack.includes(this)) return undefined;

				// Clone stack and add this rule for recursion...
				stack = stack ? stack.concat() : [];
				stack.push(this);

				// TODO: We could distinguish between productive and unproductive rules
				//		 by checking only rules which occur at the same `start`...
				//		 This would probably allow more interesting things, but it's much much slower.
			}

			var matched = [];
			var nextStart = start;
			var index = 0,
			    rule = undefined;
			while (rule = this.rules[index++]) {
				var _match = rule.parse(parser, tokens, nextStart, end, stack);
				if (!_match && !rule.optional) return undefined;
				if (_match) {
					matched.push(_match);
					nextStart = _match.nextStart;
				}
			}
			// if we get here, we matched all the rules!
			return this.clone({
				matched: matched,
				nextStart: nextStart
			});
		}

		//TODOC
		// "gather" arguments in preparation to call `toSource()`
		// Only callable after parse is completed.
		// Returns an object with properties from the `matched` array indexed by
		//		- `match.argument`:		argument set when rule was declared, eg: `{value:literal}` => `value`
		//		- `match.ruleName`:		name of rule when defined
		//		- `rule type`:				name of the rule type
		// NOTE: memoizes the results.

	}, {
		key: "addResults",
		value: function addResults(results, matched) {
			var index = 0,
			    match = undefined;
			while (match = matched[index++]) {
				if (match.promote) {
					return this.addResults(results, match.matched);
				} else {
					var argName = match.argument || match.ruleName || match.constructor.name;
					// If arg already exists, convert to an array
					if (argName in results) {
						if (!Array.isArray(results[argName])) results[argName] = [results[argName]];
						results[argName].push(match);
					} else {
						results[argName] = match;
					}
				}
			}
			return results;
		}

		// Return `toSource()` for our `results` as a map.
		// If you pass `keys`, we'll restrict to just those keys.

	}, {
		key: "getMatchedSource",
		value: function getMatchedSource(context) {
			for (var _len4 = arguments.length, keys = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
				keys[_key4 - 1] = arguments[_key4];
			}

			var results = this.results;
			var output = {};
			if (!keys.length) keys = Object.keys(results);
			keys.forEach(function (key) {
				var value = results[key];
				if (value == null) return;
				if (value.toSource) output[key] = value.toSource(context);else output[key] = value;
			});
			return output;
		}

		// Echo this rule back out.

	}, {
		key: "toString",
		value: function toString() {
			return "" + this.rules.join(" ") + (this.optional ? '?' : '');
		}
	}, {
		key: "results",
		get: function get() {
			if (!this.matched) return undefined;
			var results = this.addResults({}, this.matched);
			if (this.comment) results.comment = this.comment;
			return results;
		}
	}]);

	return Sequence;
}(Rule);

// Syntactic sugar for debugging
Rule.Expression = function (_Rule$Sequence) {
	_inherits(expression, _Rule$Sequence);

	function expression() {
		_classCallCheck(this, expression);

		return _possibleConstructorReturn(this, (expression.__proto__ || Object.getPrototypeOf(expression)).apply(this, arguments));
	}

	return expression;
}(Rule.Sequence);

// A statement takes up the entire line.
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
Rule.Alternatives = function (_Rule5) {
	_inherits(Alternatives, _Rule5);

	function Alternatives() {
		var _ref2;

		_classCallCheck(this, Alternatives);

		for (var _len5 = arguments.length, props = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
			props[_key5] = arguments[_key5];
		}

		var _this11 = _possibleConstructorReturn(this, (_ref2 = Alternatives.__proto__ || Object.getPrototypeOf(Alternatives)).call.apply(_ref2, [this].concat(props)));

		if (!_this11.rules) _this11.rules = [];
		return _this11;
	}

	// Test to see if any of our alternatives are found ANYWHERE in the tokens.
	// NOTE: this should only be called if we're specified as a `testRule`
	//		 and then only if all of our rules are deterministic.


	_createClass(Alternatives, [{
		key: "test",
		value: function test(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];

			var index = 0,
			    rule = undefined;
			while (rule = this.rules[index++]) {
				if (rule.test(parser, tokens, start, end)) return true;
			}
			return false;
		}

		// Find all rules which match and delegate to `getBestMatch()` to pick the best one.

	}, {
		key: "parse",
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];
			var stack = arguments[4];

			var matches = [];
			var index = 0,
			    rule = undefined;
			while (rule = this.rules[index++]) {
				var _match2 = rule.parse(parser, tokens, start, end, stack);
				if (_match2) matches.push(_match2);
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

		// Return the "best" match given more than one matches at the head of the tokens.
		// Default is to return the longest match.
		// Implement something else to do, eg, precedence rules.

	}, {
		key: "getBestMatch",
		value: function getBestMatch(matches) {
			return matches.reduce(function (best, current) {
				if (current.nextStart > best.nextStart) return current;
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
}(Rule);

// Repeating rule.
//	`this.rule` is the rule that repeats.
//
// After matching:
//	`this.matched` is array of results of matches.
//
//	Automatically consumes whitespace before rules.
//	If doesn't match at least one, returns `undefined`.
Rule.Repeat = function (_Rule6) {
	_inherits(Repeat, _Rule6);

	function Repeat() {
		_classCallCheck(this, Repeat);

		return _possibleConstructorReturn(this, (Repeat.__proto__ || Object.getPrototypeOf(Repeat)).apply(this, arguments));
	}

	_createClass(Repeat, [{
		key: "parse",
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];
			var stack = arguments[4];

			var matched = [];
			var nextStart = start;
			while (true) {
				var _match3 = this.rule.parse(parser, tokens, nextStart, end, stack);
				if (!_match3) break;

				matched.push(_match3);
				nextStart = _match3.nextStart;
			}

			if (matched.length === 0) return undefined;

			return this.clone({
				matched: matched,
				nextStart: nextStart
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
			var isCompoundRule = this.rule instanceof Rule.Sequence || this.rule instanceof Rule.Keyword && this.rule.match.length > 1;
			var rule = isCompoundRule ? "(" + this.rule + ")" : "" + this.rule;
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
}(Rule);

// List match rule:   `[<item><delimiter>]`. eg" `[{number},]` to match `1,2,3`
//	`rule.item` is the rule for each item,
//	`rule.delimiter` is the delimiter between each item.
// 	`rule.matched` in the output is the list of values.
//
//
// NOTE: we assume that a List rule will NOT repeat (????)
Rule.List = function (_Rule7) {
	_inherits(List, _Rule7);

	function List() {
		_classCallCheck(this, List);

		return _possibleConstructorReturn(this, (List.__proto__ || Object.getPrototypeOf(List)).apply(this, arguments));
	}

	_createClass(List, [{
		key: "parse",
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];
			var stack = arguments[4];

			// ensure item and delimiter are optional so we don't barf in `parseRule`
			this.item.optional = true;
			this.delimiter.optional = true;

			var matched = [];
			var nextStart = start;
			while (true) {
				// get next item, exiting if not found
				var item = this.item.parse(parser, tokens, nextStart, end, stack);
				if (!item) break;
				//console.log(item);
				matched.push(item);
				nextStart = item.nextStart;

				// get delimiter, exiting if not found
				var delimiter = this.delimiter.parse(parser, tokens, nextStart, end, stack);
				if (!delimiter) break;
				nextStart = delimiter.nextStart;
			}

			// If we didn't get any matches, forget it.
			if (matched.length === 0) return undefined;

			return this.clone({
				matched: matched,
				nextStart: nextStart
			});
		}

		// Returns list of values as source.

	}, {
		key: "toSource",
		value: function toSource(context) {
			if (!this.matched) return [];
			return this.matched.map(function (match) {
				return match.toSource(context);
			});
		}
	}, {
		key: "toString",
		value: function toString() {
			return "[" + (this.argument ? this.argument + ":" : "") + this.item + " " + this.delimiter + "]" + (this.optional ? '?' : '');
		}
	}]);

	return List;
}(Rule);

// A `NestedScope` parses lines as a nested scope, eg a type declaration or a method definition.
Rule.NestedScope = function (_Rule8) {
	_inherits(scope, _Rule8);

	function scope() {
		_classCallCheck(this, scope);

		return _possibleConstructorReturn(this, (scope.__proto__ || Object.getPrototypeOf(scope)).apply(this, arguments));
	}

	_createClass(scope, [{
		key: "parse",


		// `statements` is an array of arrays of tokens.
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			var _this15 = this;

			var end = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : tokens.length;
			var stack = arguments[4];

			if (start >= end) return undefined;

			// break tokens of interest into lines.
			var lines = Tokenizer.breakIntoLines(tokens.slice(start, end));

			var results = [];
			var lastIndent = 0;

			// Parse each line individually
			lines.forEach(function (tokens) {
				//console.info("TOKENS", tokens);
				var lineResult = _this15.parseLine(parser, lastIndent, tokens);
				if (lineResult) {
					results = results.concat(lineResult);
					var lastResult = results[results.length - 1];
					if (typeof lastResult.indent === "number") {
						lastIndent = lastResult.indent;
						//console.warn("setting lastIndent to", lastIndent);
					}
				}
			});

			// Add closing curly braces as necessary
			//TODO: move ABOVE any blank lines
			while (lastIndent > 0) {
				var closeBlock = new Rule.CloseBlock({ indent: (0, _string.getTabs)(lastIndent - 1) });
				results.push(closeBlock);
				--lastIndent;
			}

			return this.clone({
				matched: results,
				nextStart: end
			});
		}

		// Parse tokens corresponding to a single line of input.
		// Returns `[lastIndent, [matched rules]]`

	}, {
		key: "parseLine",
		value: function parseLine(parser, lastIndent, tokens) {
			var results = [];

			// add `BlankLine`s for empty lines
			if (tokens.length === 0) {
				results.push(new Rule.BlankLine());
				return results;
			}

			// figure out indent level of this line
			var indent = 0;
			// If we start with an indent
			if (tokens[0] instanceof Tokenizer.Indent) {
				indent = tokens[0].length;
				// take the indent out of the statement start
				tokens = tokens.slice(1);
			}

			// If indent INCREASES, add `OpenBlock`
			if (indent > lastIndent) {
				results.push(new Rule.OpenBlock({ indent: indent - 1 }));
			}
			// if line indent DECREASES, add one or more `CloseBlock`s
			else if (indent < lastIndent) {
					for (var _indent = lastIndent; _indent > _indent; _indent--) {
						results.push(new Rule.CloseBlock({ indent: _indent - 1 }));
					}
				}

			// Attempt to parse a comment as the last item in the statement
			var comment = parser.parseRuleOrDie("comment", tokens, tokens.length - 1);
			if (comment) {
				// remember indent
				comment.indent = indent;
				// Add comment BEFORE corresponding statement
				results.push(comment);
				// pop the comment off before matching the rest of the statement.
				tokens = tokens.slice(0, -1);
			}

			// Parse statement
			var statement = parser.parseRuleOrDie("statement", tokens, 0);
			// complain if no statement and no comment
			if (!statement && !comment) {
				var _statement = tokens.join(" ");
				console.warn("Couldn't parse statement:\n\t" + _statement);
				results.push(new Rule.ParseError({
					indent: indent,
					error: "Can't parse statement",
					message: "CAN'T PARSE: " + _statement
				}));
			}

			// complain can't parse the entire line!
			else if (statement && statement.nextStart !== tokens.length) {
					var _statement2 = tokens.join(" ");
					var unparsed = tokens.slice(_statement2.nextStart).join(" ");
					console.warn("Couldn't parse entire statement:", "\n\t\"" + _statement2 + "\"", "\nunparsed:", "\n\t\"" + unparsed + "\"");
					var error = new Rule.ParseError({
						indent: indent,
						error: "Can't parse entire statement",
						message: "CANT PARSE ENTIRE STATEMENT\n" + ("PARSED    : " + _statement2.matched + "\n") + ("CANT PARSE: " + unparsed)

					});
					results.push(error);
					return;
				}

				// Otherwise add statement to results
				else if (statement) {
						statement.indent = indent;
						results.push(statement);
					}

			return results;
		}
	}]);

	return scope;
}(Rule);

// `Statements` are a block of `Statement` that understand nesting and comments.
Rule.Statements = function (_Rule$NestedScope) {
	_inherits(statements, _Rule$NestedScope);

	function statements() {
		_classCallCheck(this, statements);

		return _possibleConstructorReturn(this, (statements.__proto__ || Object.getPrototypeOf(statements)).apply(this, arguments));
	}

	_createClass(statements, [{
		key: "toSource",
		value: function toSource(context) {
			var results = [];
			for (var i = 0; i < this.matched.length; i++) {
				var _match4 = this.matched[i];

				// special case open block to put on the same line
				//	if previous statement does not have `.opensBlock` set.
				if (_match4 instanceof Rule.OpenBlock) {
					var previous = this.matched[i - 1];
					if (previous) {
						if (!previous.opensBlock) {
							results[results.length - 1] += " {";
						}
						continue;
					}
				}
				var source = _match4.toSource(context) || "";
				var indent = (0, _string.getTabs)(_match4.indent);
				results.push(indent + source.split("\n").join("\n" + indent));
			}
			return results.join("\n");
		}
	}]);

	return statements;
}(Rule.NestedScope);

/***/ }),

/***/ 149:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * 
 */

function makeEmptyFunction(arg) {
  return function () {
    return arg;
  };
}

/**
 * This function accepts and discards inputs; it has no side effects. This is
 * primarily useful idiomatically for overridable function endpoints which
 * always need to be callable, since JS lacks a null-call idiom ala Cocoa.
 */
var emptyFunction = function emptyFunction() {};

emptyFunction.thatReturns = makeEmptyFunction;
emptyFunction.thatReturnsFalse = makeEmptyFunction(false);
emptyFunction.thatReturnsTrue = makeEmptyFunction(true);
emptyFunction.thatReturnsNull = makeEmptyFunction(null);
emptyFunction.thatReturnsThis = function () {
  return this;
};
emptyFunction.thatReturnsArgument = function (arg) {
  return arg;
};

module.exports = emptyFunction;

/***/ }),

/***/ 150:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */



/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var validateFormat = function validateFormat(format) {};

if (process.env.NODE_ENV !== 'production') {
  validateFormat = function validateFormat(format) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  };
}

function invariant(condition, format, a, b, c, d, e, f) {
  validateFormat(format);

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error('Minified exception occurred; use the non-minified dev environment ' + 'for the full error message and additional helpful warnings.');
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(format.replace(/%s/g, function () {
        return args[argIndex++];
      }));
      error.name = 'Invariant Violation';
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
}

module.exports = invariant;
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0)))

/***/ }),

/***/ 246:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _string = __webpack_require__(902);

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// GRRR... node doesn't include this???
// CHECK DIFFERENT NODE VERSIONS...
if (!Array.prototype.includes) {
	Object.defineProperty(Array.prototype, "includes", {
		value: function value(_value, start) {
			var index = this.indexOf(_value, start);
			return index !== -1;
		}
	});
}

// `whitespace` class for normal (non-indent, non-newline) whitespace.

var whitespace = function () {
	function whitespace(_whitespace) {
		_classCallCheck(this, whitespace);

		this.whitespace = _whitespace;
	}

	// Return the "length" of this whitespace, eg for an indent.


	_createClass(whitespace, [{
		key: "toString",
		value: function toString() {
			return this.whitespace;
		}
	}, {
		key: "length",
		get: function get() {
			return this.whitespace.length;
		}
	}]);

	return whitespace;
}();

// `indent` class.


var indent = function (_whitespace2) {
	_inherits(indent, _whitespace2);

	function indent() {
		_classCallCheck(this, indent);

		return _possibleConstructorReturn(this, (indent.__proto__ || Object.getPrototypeOf(indent)).apply(this, arguments));
	}

	return indent;
}(whitespace);

// Newline singleton.


var newline = function (_whitespace3) {
	_inherits(newline, _whitespace3);

	function newline() {
		_classCallCheck(this, newline);

		return _possibleConstructorReturn(this, (newline.__proto__ || Object.getPrototypeOf(newline)).apply(this, arguments));
	}

	return newline;
}(whitespace);

//
//	# Tokenizer
//	- `.tokenize()` 		Breaks up long string into tokens, including newlines, JSX expressions, etc.
//	- `.tokenizeLines()` 	Takes the above and breaks it into an array of arrays for each line.
//
// TODO: error checking / reporting, especially in JSX expressions.
// TODO: have normal `tokenize` stick whitespace elements in the stream, then `tokenizeLines()` takes them out?


var Tokenizer = {

	// Whitespace constructor.
	Whitespace: whitespace,

	// Indent constructor
	Indent: indent,

	// NEWLINE singleton.
	NEWLINE: new newline("\n"),

	// Tokenize text between `start` and `end` into an array of `results`, an array of:
	//	- `Tokenizer.NEWLINE` for a newline symbol
	//	- strings for keywords/symbols
	//	- numbers for number literals
	//	- `{ indent: number }` for indent at start of line
	//	- `{ type: "text", literal: "'abc'", text: "abc" }
	//	- `{ type: "indent", level: 7 }`
	//	- `{ type: "comment", comment: "string", commentSymbol, whitespace }`
	//TESTME
	tokenize: function tokenize(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		// quick return out of range or only whitespace
		if (start >= end || !text.trim()) return [];

		var tokens = [];
		// Process our top-level rules.

		var _eatTokens = this.eatTokens(this.matchTopTokens, text, start, end),
		    _eatTokens2 = _slicedToArray(_eatTokens, 2),
		    results = _eatTokens2[0],
		    nextStart = _eatTokens2[1];

		if (results) {
			tokens = tokens.concat(results);
			start = nextStart;
		}
		if (start !== end) console.warn("tokenize(): didn't consume: `", text.slice(start, end) + "`");

		return results;
	},


	// Repeatedly execute a `method` (bound to `this) which returns a `[result, nextStart]` or `undefined`.
	// Places matched results together in `results` array and returns `[results, nextStart]` for the entire set.
	// Stops if `method` doesn't return anything, or if calling `method` is unproductive.
	//TESTME
	eatTokens: function eatTokens(method, text) {
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var end = arguments[3];
		var results = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : [];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		// process rules repeatedly until we get to the end
		while (start < end) {
			var result = method.call(this, text, start, end);
			if (!result) break;

			var _result = _slicedToArray(result, 2),
			    tokens = _result[0],
			    nextStart = _result[1];
			// Bail if we didn't get a productive rule!


			if (start === nextStart) break;

			// handle newResults as an array or single object.
			if (tokens !== undefined) results = results.concat(tokens);
			start = nextStart;
		}
		return [results, start];
	},


	// Match a single top-level token at `text[start]`.
	//TESTME
	matchTopTokens: function matchTopTokens(text, start, end) {
		return this.matchWhitespace(text, start, end) || this.matchWord(text, start, end) || this.matchNumber(text, start, end) || this.matchNewline(text, start, end) || this.matchJSXElement(text, start, end) || this.matchText(text, start, end) || this.matchComment(text, start, end) || this.matchSymbol(text, start, end);
	},


	//
	//	### Symbol character
	//

	// Match the single "symbol" character at `text[start]`.
	// NOTE: This does not do any checking, it just blindly uses the character in question.
	//		 You should make sure all other possible rules have been exhausted first.
	matchSymbol: function matchSymbol(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		return [text[start], start + 1];
	},


	//
	//	### Whitespace
	//

	// Return the first char position after `start` which is NOT a whitespace char (space or tab only).
	// If `text[start]` is not whitespace, returns `start`,
	//	so you can call this at any time to skip whitespace in the output.
	eatWhitespace: function eatWhitespace(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return end;

		var whiteSpaceEnd = start;
		while (whiteSpaceEnd < end && (text[whiteSpaceEnd] === " " || text[whiteSpaceEnd] === "\t")) {
			whiteSpaceEnd++;
		}
		return whiteSpaceEnd;
	},


	//
	//	### Whitespace
	//	NOTE: Whitespace at the beginning of `text` or the beginning of a line
	//		  is considered an "indent" and will have `.isIndent === true`.
	//

	// Convert a run of spaces and/or tabs into a `Tokenizer.Whitespace`.
	matchWhitespace: function matchWhitespace(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		var whitespaceEnd = this.eatWhitespace(text, start, end);
		// forget it if no forward motion
		if (whitespaceEnd === start) return undefined;

		var whitespace = text.slice(start, whitespaceEnd);
		var token = void 0;
		if (start === 0 || text[start - 1] === "\n") token = new Tokenizer.Indent(whitespace);else token = new Tokenizer.Whitespace(whitespace);

		return [token, whitespaceEnd];
	},


	//
	//	### Newline
	//

	// Match a single newline character at `text[start]`.
	// Returns `[Tokenizer.NEWLINE, nextStart]` on match.
	// Otherwise returns `undefined`.
	matchNewline: function matchNewline(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end || text[start] !== "\n") return undefined;

		return [Tokenizer.NEWLINE, start + 1];
	},


	//
	//	### Word
	//

	// Match a single `word` in `text` at character `start`.
	// Returns `[word, wordEnd]`.
	// Returns an empty array if couldn't match a word.
	WORD_START: /[A-Za-z]/,
	WORD_CHAR: /^[\w_-]/,
	matchWord: function matchWord(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		if (!this.WORD_START.test(text[start])) return undefined;

		var wordEnd = start + 1;
		while (wordEnd < end && this.WORD_CHAR.test(text[wordEnd])) {
			wordEnd++;
		}
		if (wordEnd === start) return undefined;

		var word = text.slice(start, wordEnd);
		return [word, wordEnd];
	},


	//
	//	### Numbers
	//

	// Eat a single number.
	// Returns a `Number` if matched.
	NUMBER_START: /[0-9-.]/,
	NUMBER: /^-?([0-9]*\.)?[0-9]+/,
	matchNumber: function matchNumber(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		if (!this.NUMBER_START.test(text[start])) return undefined;

		var numberMatch = this.matchExpressionAtHead(this.NUMBER, text, start, end);
		if (!numberMatch) return undefined;

		var numberStr = numberMatch[0];
		var number = parseFloat(numberStr, 10);
		return [number, start + numberStr.length];
	},


	//
	//	### Text literal
	//

	// Eat a text literal (starts/ends with `'` or `"`).
	// Returns a `Tokenizer.Text` if matched.
	//TESTME:  not sure the escaping logic is really right...
	matchText: function matchText(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		var quoteSymbol = text[start];
		if (quoteSymbol !== '"' && quoteSymbol !== "'") return undefined;

		var textEnd = start + 1;
		while (textEnd < end) {
			var char = text[textEnd];
			if (char === quoteSymbol) break;
			// if we get a backquote, ignore quote in next char
			if (char === "\\" && text[textEnd + 1] === quoteSymbol) textEnd++;
			textEnd++;
		}
		// Forget it if we didn't end with the quote symbol
		if (text[textEnd] !== quoteSymbol) return undefined;
		// advance past end quote
		textEnd++;

		var quotedString = text.slice(start, textEnd);
		var token = new Tokenizer.Text(quotedString);
		return [token, textEnd];
	},


	// `Text` class for string literals.
	// Pass the literal value, use `.text` to get just the bit inside the quotes.
	Text: function () {
		function text(quotedString) {
			_classCallCheck(this, text);

			this.quotedString = quotedString;
		}

		_createClass(text, [{
			key: "toString",
			value: function toString() {
				return this.quotedString;
			}
		}, {
			key: "text",
			get: function get() {
				var string = this.quotedString;
				// calculate `text` as the bits between the quotes.
				var start = 0;
				var end = string.length;
				if (string[start] === '"' || string[start] === "'") start = 1;
				if (string[end - 1] === '"' || string[end - 1] === "'") end = -1;
				return string.slice(start, end);
			}
		}]);

		return text;
	}(),

	//
	//	### Comments
	//

	// Eat a comment (until the end of the line).
	// Returns a `Tokenizer.Comment` if matched.
	COMMENT: /^(##+|--+|\/\/+)(\s*)(.*)/,
	matchComment: function matchComment(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		var commentStart = text.slice(start, start + 2);
		if (commentStart !== "--" && commentStart !== "\/\/" && commentStart !== "##") return undefined;

		// comment eats until the end of the line
		var line = this.getLineAtHead(text, start, end);
		var commentMatch = line.match(this.COMMENT);
		if (!commentMatch) return undefined;

		var _commentMatch = _slicedToArray(commentMatch, 4),
		    match = _commentMatch[0],
		    commentSymbol = _commentMatch[1],
		    whitespace = _commentMatch[2],
		    comment = _commentMatch[3];

		var token = new Tokenizer.Comment({ commentSymbol: commentSymbol, whitespace: whitespace, comment: comment });
		return [token, start + line.length];
	},


	// Comment class
	//TESTME
	Comment: function () {
		function comment(props) {
			_classCallCheck(this, comment);

			Object.assign(this, props);
		}

		_createClass(comment, [{
			key: "toString",
			value: function toString() {
				return "" + this.commentSymbol + this.whitespace + this.comment;
			}
		}]);

		return comment;
	}(),

	//
	//	### JSX
	//

	// Eat a (nested) JSX expression.
	//TESTME
	matchJSXElement: function matchJSXElement(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		var _ref = this.matchJSXStartTag(text, start, end) || [],
		    _ref2 = _slicedToArray(_ref, 2),
		    jsxElement = _ref2[0],
		    nextStart = _ref2[1];

		if (!jsxElement) return undefined;

		if (!jsxElement.isUnaryTag) {
			var _matchJSXChildren = this.matchJSXChildren(jsxElement.tagName, text, nextStart, end),
			    _matchJSXChildren2 = _slicedToArray(_matchJSXChildren, 2),
			    children = _matchJSXChildren2[0],
			    childEnd = _matchJSXChildren2[1];

			if (children.length) {
				jsxElement.children = children;
				nextStart = childEnd;
			}
		}

		return [jsxElement, nextStart];
	},


	// Match JSX start tag and internal elements (but NOT children).
	// Returns `[jsxElement, nextStart]` or `undefined`.
	// Use `matchJSXElement()` to match children, end tag, etc.
	// Ignores leading whitespace.
	JSX_TAG_START: /^<([A-Za-z][\w-\.]*)(\s*\/>|\s*>|\s+)/,
	// TODO: clean this stuff up, maybe with findFirstAtHead?
	matchJSXStartTag: function matchJSXStartTag(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		var nextStart = this.eatWhitespace(text, start, end);
		// Make sure we start with `<`.
		if (text[nextStart] !== "<") return undefined;

		var tagMatch = this.matchExpressionAtHead(this.JSX_TAG_START, text, nextStart, end);
		if (!tagMatch) return undefined;

		var _tagMatch = _slicedToArray(tagMatch, 3),
		    matchText = _tagMatch[0],
		    tagName = _tagMatch[1],
		    endBit = _tagMatch[2];

		var jsxElement = new Tokenizer.JSXElement(tagName);
		nextStart = nextStart + matchText.length;

		// If unary tag, mark as such and return.
		endBit = endBit.trim();
		if (endBit === "/>") {
			jsxElement.isUnaryTag = true;
			return [jsxElement, nextStart];
		}

		// If we didn't immediately get an end marker, attempt to match attributes
		if (endBit !== ">" && endBit !== "/>") {
			var _eatTokens3 = this.eatTokens(this.matchJSXAttribute, text, nextStart, end),
			    _eatTokens4 = _slicedToArray(_eatTokens3, 2),
			    attrs = _eatTokens4[0],
			    attrEnd = _eatTokens4[1];

			jsxElement.attributes = attrs;
			nextStart = attrEnd;
		}

		// at this point we should get an `/>` or `>` (with no whitespace).
		if (text[nextStart] === "/" && text[nextStart + 1] === ">") {
			endBit = "/>";
			nextStart += 2;
		} else if (text[nextStart] === ">") {
			endBit = text[nextStart];
			nextStart += 1;
		}

		// Return immediately for unary tag
		if (endBit === "/>") {
			jsxElement.isUnaryTag = true;
			return [jsxElement, nextStart];
		}

		// advance past `>`
		if (endBit !== ">") {
			console.warn("Missing expected end `>` for jsxElement", jsxElement, "`" + text.slice(start, nextStart) + "`");
			jsxElement.error = "No end >";
			return [jsxElement, nextStart];
		}

		return [jsxElement, nextStart];
	},


	// JSX element class
	JSXElement: function () {
		function jsxElement(tagName, attributes, children) {
			_classCallCheck(this, jsxElement);

			this.tagName = tagName;
			if (attributes) this.attributes = attributes;
			if (children) this.children = children;
		}

		// Return attributes as a map.
		//TESTME


		_createClass(jsxElement, [{
			key: "toString",
			value: function toString() {
				var attrs = this.attrsAsString;
				var children = this.childrenAsString;
				if (this.isUnaryTag) return "<" + this.tagName + attrs + "/>";
				return "<" + this.tagName + attrs + ">" + children + "</" + this.tagName + ">";
			}
		}, {
			key: "attrs",
			get: function get() {
				var attrs = {};
				if (this.attributes) this.attributes.forEach(function (attr) {
					// ignore unnamed attributes
					if (attr.name) attrs[attr.name] = attr.value;
				});
				return attrs;
			}

			// Return our attributes as a string
			//TESTME

		}, {
			key: "attrsAsString",
			get: function get() {
				if (!this.attributes) return "";
				return " " + this.attributes.map(function (_ref3) {
					var name = _ref3.name,
					    value = _ref3.value;

					if (value === undefined) return name;
					// convert value array (tokens) to string
					// TODO: this will want to be smarter...
					if (Array.isArray(value)) value = "{" + value.join(" ") + "}";
					return "name=" + value;
				}).join(" ");
			}

			// Return our children as a string.
			//TESTME

		}, {
			key: "childrenAsString",
			get: function get() {
				if (!this.children) return "";
				return this.children.map(function (child) {
					if (Array.isArray(child)) return "{" + child.join(" ") + "}";
					return "" + child;
				}).join("");
			}
		}]);

		return jsxElement;
	}(),

	//
	//	### JSX children
	//

	// Match JSX element children of `<tagName>` at `text[start]`.
	// Matches nested children and stops after matching end tag: `</tagName>`.
	// Returns `[children, nextStart]`.
	//TESTME
	matchJSXChildren: function matchJSXChildren(tagName, text, start, end) {
		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		var children = [];
		var nesting = 1;
		var endTag = "</" + tagName + ">";

		var nextStart = start;
		while (true) {
			var result = this.matchJSXChild(endTag, text, nextStart, end);
			if (!result) break;

			var _result2 = _slicedToArray(result, 2),
			    child = _result2[0],
			    childEnd = _result2[1];

			nextStart = childEnd;
			// If we got the endTag, update nesting and break out of loop if nesting !== 0
			if (child === endTag) {
				nesting--;
				if (nesting === 0) break;
				continue;
			} else {
				if (child) children.push(child);
			}
		}
		// TODO: how to surface this error???
		if (nesting !== 0) {
			console.warn("matchJSXChildren(" + text.slice(start, nextStart + 10) + ": didn't match end child!");
		}
		return [children, nextStart];
	},


	// Match a single JSX child:
	//	- current endTag
	//	- `{ jsx expression }`
	//	- nested JSX element
	//	- (anything else) as jsxText expression.
	matchJSXChild: function matchJSXChild(endTag, text) {
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var end = arguments[3];

		return this.matchJSXEndTag(endTag, text, start, end) || this.matchJSXExpression(text, start, end) || this.matchJSXElement(text, start, end)
		// TODO: newline and indent?
		|| this.matchJSXText(text, start, end);
	},


	// Attempt to match a specific end tag.
	// Ignores leading whitespace.
	matchJSXEndTag: function matchJSXEndTag(endTag, text) {
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var end = arguments[3];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		var nextStart = this.eatWhitespace(text, start, end);
		if (!this.matchStringAtHead(endTag, text, nextStart, end)) return undefined;
		return [endTag, nextStart + endTag.length];
	},


	//
	//	### JSX attributes
	//

	// Match a single JSX element attribute as `<attr>={<value>}`
	// TODO: {...xxx}
	JSX_ATTRIBUTE_START: /^\s*([\w-]+\b)\s*(=?)\s*/,
	matchJSXAttribute: function matchJSXAttribute(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		// attributes must start with a word character
		if (!this.WORD_START.test(text[start])) return undefined;

		// attempt to match an attribute name, including `=` if present.
		var result = this.matchExpressionAtHead(this.JSX_ATTRIBUTE_START, text, start, end);
		if (!result) return undefined;

		var _result3 = _slicedToArray(result, 3),
		    match = _result3[0],
		    name = _result3[1],
		    equals = _result3[2];

		var nextStart = start + match.length;
		var attribute = new Tokenizer.JSXAttribute(name);

		// if there was an equals char, parse the value
		if (equals) {
			var _ref4 = this.matchJSXAttributeValue(text, nextStart, end) || [],
			    _ref5 = _slicedToArray(_ref4, 2),
			    value = _ref5[0],
			    valueEnd = _ref5[1];

			if (value) {
				attribute.value = value;
				nextStart = valueEnd;
			}
		}
		// eat whitespace before the next attribute / tag end
		nextStart = this.eatWhitespace(text, nextStart, end);
		return [attribute, nextStart];
	},


	// Match a value expression for a JSX element attribute:
	// NOTE: we will be called immediately after the `=` (and subsequent whitespace).
	matchJSXAttributeValue: function matchJSXAttributeValue(text, start, end) {
		return this.matchText(text, start, end) || this.matchJSXExpression(text, start, end) || this.matchJSXElement(text, start, end) || this.matchJSXAttributeValueIdentifier(text, start, end) || this.matchNumber(text, start, end);
	},


	// Match a single identifer as a JSX attribute value.
	// Returns as a `JSXExpression`.
	matchJSXAttributeValueIdentifier: function matchJSXAttributeValueIdentifier(text, start, end) {
		var result = this.matchWord(text, start, end);
		if (!result) return;

		var _result4 = _slicedToArray(result, 2),
		    word = _result4[0],
		    nextStart = _result4[1];

		var token = new Tokenizer.JSXExpression(word);
		return [token, nextStart];
	},


	// JSX attribute class
	// `name` is the name of the attribute.
	// `value` is one of:
	//		- `'...'`			// Text (literal string).
	//		- `"..."`			// Text (literal string).
	//		- `{...}`			// Expression.  Results will be tokenized array.
	//		- `<....>`			// JSX element.
	//		- `1`				// Number.  Note: this is an extension to JSX.

	JSXAttribute: function () {
		function jsxAttribute(name, value) {
			_classCallCheck(this, jsxAttribute);

			this.name = name;
			if (value !== undefined) this.value = value;
		}

		_createClass(jsxAttribute, [{
			key: "toString",
			value: function toString() {
				if (this.value === undefined) return this.name;
				return this.name + "={" + this.value + "}";
			}
		}]);

		return jsxAttribute;
	}(),

	// Match a JSX expression enclosed in curly braces, eg:  `{ ... }`.
	//  Handles nested curlies, quotes, etc.
	// Returns array of tokens of internal match.
	// Ignores leading whitespace.
	//TODO: newlines/indents???
	//TODO: {...xxx}
	//TESTME
	matchJSXExpression: function matchJSXExpression(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		var nextStart = this.eatWhitespace(text, start, end);
		var endIndex = this.findMatchingAtHead("{", "}", text, nextStart, end);
		if (endIndex === undefined) return undefined;

		// Get contents, including leading and trailing whitespace.
		var contents = text.slice(start + 1, endIndex);

		// return a new JSXExpression, advancing beyond the ending `}`.
		var expression = new Tokenizer.JSXExpression(contents);
		return [expression, endIndex + 1];
	},


	// JSX expression, composed of inline tokens which should yield an `expression`.
	JSXExpression: function () {
		function jsxExpression(contents) {
			_classCallCheck(this, jsxExpression);

			this.contents = contents || "";
		}
		// Divide contents into `tokens`.


		_createClass(jsxExpression, [{
			key: "tokens",
			get: function get() {
				return Tokenizer.tokenize(this.contents.trim());
			}
		}]);

		return jsxExpression;
	}(),

	// Match JSXText until the one of `{`, `<`, `>` or `}`.
	// NOTE: INCLUDES leading / trailing whitespace.
	JSX_TEXT_END_CHARS: ["{", "<", ">", "}"],
	//TESTME
	matchJSXText: function matchJSXText(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		// temporarily advance past whitespace (we'll include it in the output).
		var nextStart = this.eatWhitespace(text, start, end);
		var endIndex = this.findFirstAtHead(this.JSX_TEXT_END_CHARS, text, nextStart, end);
		// If the first non-whitespace char is in our END_CHARS, forget it.
		if (endIndex === nextStart) return undefined;

		// if no match, we've got some sort of error
		if (endIndex === undefined) {
			console.warn("matchJSXText(" + text.slice(start, start + 50) + "): JSX seems to be unbalanced.");
			return undefined;
		}

		// include leading whitespace in the output.
		var jsxText = text.slice(start, endIndex);
		return [jsxText, endIndex];
	},


	//
	//	## Utility functions
	//

	// Return characters up to, but not including, the next newline char after `start`.
	// If `start` is a newline char or start >= end, returns empty string.
	// If at the end of the string (eg: no more newlines), returns from start to end.
	//TESTME
	getLineAtHead: function getLineAtHead(text) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments[2];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return "";

		var newline = text.indexOf("\n", start);
		if (newline === -1 || newline > end) newline = end;
		return text.slice(start, newline);
	},


	// Match a multi-char string starting at `text[start]`.
	//TESTME
	matchStringAtHead: function matchStringAtHead(string, text) {
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var end = arguments[3];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		var stringEnd = start + string.length;
		if (stringEnd > end) return undefined;
		return string === text.slice(start, stringEnd);
	},


	// Match a regular expression starting at `text[start]`, returning the match.
	// Returns `null` if no match.
	//
	// NOTE: The expression MUST start with `/^.../`
	//TESTME
	matchExpressionAtHead: function matchExpressionAtHead(expression, text) {
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var end = arguments[3];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		var head = text.slice(start, end);
		return head.match(expression);
	},


	// Find index of the matching SINGLE CHARACTER `endDelimiter` to match `startDelimiter`.
	// Matches nested delimiters and handles escaped delimiters.
	// Assumes `text[start]` is the startDelimiter!
	// Returns numeric index or `undefined` if no match or if first char is not `startDelimiter`.
	//
	//	Also handles nested quotes -- if we encounter a single or double quote,
	//		we'll skip scanning until we find a matching quote.
	//
	//	eg:  `findMatchingAtHead("{", "}", "{aa{a}aa}")` => 8
	//TESTME
	findMatchingAtHead: function findMatchingAtHead(startDelimiter, endDelimiter, text) {
		var start = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
		var end = arguments[4];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		if (text[start] !== startDelimiter) return undefined;

		var nesting = 0;
		var current = start;
		while (current < end) {
			var char = text[current];
			// if startDelimiter, increase nesting
			if (char === startDelimiter) {
				nesting++;
			}
			// if endDelimiter, decrease nesting and return if nesting back to 0
			else if (char === endDelimiter) {
					nesting--;
					if (nesting === 0) return current;
				}
				// if a single or double quote, skip until the matching quote
				else if (char === "'" || char === '"') {
						var _ref6 = this.matchText(text, current, end) || [],
						    _ref7 = _slicedToArray(_ref6, 2),
						    token = _ref7[0],
						    afterQuote = _ref7[1];

						current = afterQuote;
						continue; // continue so we don't add 1 to curent below
					}
					// If backslash, skip an extra char if it's either delimiter or a quote
					else if (char === "\\") {
							char = text[current + 1];
							if (char === startDelimiter || char === endDelimiter || char === "'" || char === '"') {
								current++;;
							}
						}
			current++;
		}
	},


	//TODO:  `findAtHead(thing)` where thing is
	//			- (single or multi-char) string
	//			- array of alternative strings
	//			- regular expression

	// Return the index of the first NON-ESCAPED character in `chars` after `text[start]`.
	// Returns `undefined` if we didn't find a match.
	//TESTME
	findFirstAtHead: function findFirstAtHead(chars, text) {
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var end = arguments[3];

		if (typeof end !== "number" || end > text.length) end = text.length;
		if (start >= end) return undefined;

		while (start < end) {
			var char = text[start];
			if (chars.includes(char)) return start;
			// if we got an escape char, ignore the next char if it's in `chars`
			if (char === "\\" && chars.includes(text[start + 1])) start++;
			start++;
		}
		if (start >= end) return undefined;
		return start;
	},


	//
	// ### Utility
	//

	isNormalWhitespace: function isNormalWhitespace(token) {
		return token instanceof Tokenizer.Whitespace && !(token instanceof Tokenizer.Indent) && token !== Tokenizer.NEWLINE;
	},


	// Break tokens into an array of arrays by `NEWLINEs`.
	breakIntoLines: function breakIntoLines(tokens) {
		// Convert to lines.
		var lines = [[]];
		tokens.forEach(function (token) {
			// add new array for each newline
			if (token === Tokenizer.NEWLINE) return lines.push([]);

			// otherwise just add to the last line
			lines[lines.length - 1].push(token);
		});
		return lines;
	},


	// Given a set of tokens, slice whitespace (indent, NEWLINE or normal whitespace) from the front.
	eatWhitespaceTokens: function eatWhitespaceTokens(tokens) {
		var start = 0;
		while (tokens[start] instanceof Tokenizer.Whitespace) {
			start++;
		}if (start === 0) return tokens;
		return tokens.slice(start);
	}
};

exports.default = Tokenizer;

/***/ }),

/***/ 247:
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function(useSourceMap) {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		return this.map(function (item) {
			var content = cssWithMappingToString(item, useSourceMap);
			if(item[2]) {
				return "@media " + item[2] + "{" + content + "}";
			} else {
				return content;
			}
		}).join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};

function cssWithMappingToString(item, useSourceMap) {
	var content = item[1] || '';
	var cssMapping = item[3];
	if (!cssMapping) {
		return content;
	}

	if (useSourceMap && typeof btoa === 'function') {
		var sourceMapping = toComment(cssMapping);
		var sourceURLs = cssMapping.sources.map(function (source) {
			return '/*# sourceURL=' + cssMapping.sourceRoot + source + ' */'
		});

		return [content].concat(sourceURLs).concat([sourceMapping]).join('\n');
	}

	return [content].join('\n');
}

// Adapted from convert-source-map (MIT)
function toComment(sourceMap) {
	// eslint-disable-next-line no-undef
	var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
	var data = 'sourceMappingURL=data:application/json;charset=utf-8;base64,' + base64;

	return '/*# ' + data + ' */';
}


/***/ }),

/***/ 248:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(process) {/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

if (process.env.NODE_ENV !== 'production') {
  var REACT_ELEMENT_TYPE = (typeof Symbol === 'function' &&
    Symbol.for &&
    Symbol.for('react.element')) ||
    0xeac7;

  var isValidElement = function(object) {
    return typeof object === 'object' &&
      object !== null &&
      object.$$typeof === REACT_ELEMENT_TYPE;
  };

  // By explicitly using `prop-types` you are opting into new development behavior.
  // http://fb.me/prop-types-in-prod
  var throwOnDirectAccess = true;
  module.exports = __webpack_require__(467)(isValidElement, throwOnDirectAccess);
} else {
  // By explicitly using `prop-types` you are opting into new production behavior.
  // http://fb.me/prop-types-in-prod
  module.exports = __webpack_require__(466)();
}

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0)))

/***/ }),

/***/ 249:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */



var ReactPropTypesSecret = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED';

module.exports = ReactPropTypesSecret;


/***/ }),

/***/ 250:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {/**
 * Copyright 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */



var emptyFunction = __webpack_require__(149);

/**
 * Similar to invariant but only logs a warning if the condition is not met.
 * This can be used to log issues in development environments in critical
 * paths. Removing the logging code for production environments will keep the
 * same logic and follow the same code paths.
 */

var warning = emptyFunction;

if (process.env.NODE_ENV !== 'production') {
  (function () {
    var printWarning = function printWarning(format) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var argIndex = 0;
      var message = 'Warning: ' + format.replace(/%s/g, function () {
        return args[argIndex++];
      });
      if (typeof console !== 'undefined') {
        console.error(message);
      }
      try {
        // --- Welcome to debugging React ---
        // This error was thrown as a convenience so that you can use this stack
        // to find the callsite that caused this warning to fire.
        throw new Error(message);
      } catch (x) {}
    };

    warning = function warning(condition, format) {
      if (format === undefined) {
        throw new Error('`warning(condition, format, ...args)` requires a warning ' + 'message argument');
      }

      if (format.indexOf('Failed Composite propType: ') === 0) {
        return; // Ignore CompositeComponent proptype check.
      }

      if (!condition) {
        for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
          args[_key2 - 2] = arguments[_key2];
        }

        printWarning.apply(undefined, [format].concat(args));
      }
    };
  })();
}

module.exports = warning;
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0)))

/***/ }),

/***/ 277:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__lib_dom_helpers__ = __webpack_require__(561);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lib_listeners__ = __webpack_require__(562);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__store__ = __webpack_require__(100);
/* unused harmony export _onClick */
/* harmony export (immutable) */ __webpack_exports__["c"] = _onKeyDown;
/* unused harmony export _shouldConsider */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return onMount; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return onUnmount; });
function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/* eslint-disable no-use-before-define */
/**
 * @module eventHandlers
 *
 */




/**
 * private
 *
 */

/**
 * _onClick
 *
 * @access private
 * @param {object} event The click event object
 * @param {object} event.target The DOM node from the click event
 */
function _onClick(_ref) {
  var target = _ref.target;

  __WEBPACK_IMPORTED_MODULE_2__store__["b" /* default */].activate([].concat(_toConsumableArray(__WEBPACK_IMPORTED_MODULE_2__store__["b" /* default */].getInstances())).reduce(__WEBPACK_IMPORTED_MODULE_0__lib_dom_helpers__["a" /* default */].findContainerNodes(target), []).sort(__WEBPACK_IMPORTED_MODULE_0__lib_dom_helpers__["a" /* default */].sortByDOMPosition).map(function (item) {
    return item.instance;
  }));
}

/**
 * _onKeyDown: The keydown event callback
 *
 * @access private
 * @param {object} event The keydown event object
 * @param {number} event.which The key code (which) received from the keydown event
 */
function _onKeyDown(event) {
  var forceConsider = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  if (forceConsider || _shouldConsider(event)) {
    var _ref2 = __WEBPACK_IMPORTED_MODULE_2__store__["b" /* default */].findBindingForEvent(event) || {},
        fn = _ref2.fn,
        instance = _ref2.instance;

    if (fn) {
      fn.call(instance, event);
      return true;
    }
  }
  return false;
}

/**
 * _shouldConsider: Conditions for proceeding with key event handling
 *
 * @access private
 * @param {object} event The keydown event object
 * @param {object} event.target The node origin of the event
 * @return {boolean} Whether to continue procesing the keydown event
 */
function _shouldConsider(_ref3) {
  var ctrlKey = _ref3.ctrlKey,
      target = _ref3.target;

  return ctrlKey || !~['INPUT', 'SELECT', 'TEXTAREA'].indexOf(target.tagName) || target.getAttribute('role') !== 'textbox';
}

/**
 * public
 *
 */

/**
 * onMount
 *
 * @access public
 */
function onMount(instance) {
  // have to bump this to next event loop because component mounting routinely
  // preceeds the dom click event that triggered the mount (wtf?)
  setTimeout(function () {
    return __WEBPACK_IMPORTED_MODULE_2__store__["b" /* default */].activate(instance);
  }, 0);
  __WEBPACK_IMPORTED_MODULE_1__lib_listeners__["a" /* default */].bindKeys(_onKeyDown);
  __WEBPACK_IMPORTED_MODULE_1__lib_listeners__["a" /* default */].bindClicks(_onClick);
  __WEBPACK_IMPORTED_MODULE_0__lib_dom_helpers__["a" /* default */].bindFocusables(instance, __WEBPACK_IMPORTED_MODULE_2__store__["b" /* default */].activate);
}

/**
 * onUnmount
 *
 * @access public
 */
function onUnmount(instance) {
  __WEBPACK_IMPORTED_MODULE_2__store__["b" /* default */].deleteInstance(instance);
  if (__WEBPACK_IMPORTED_MODULE_2__store__["b" /* default */].isEmpty()) {
    __WEBPACK_IMPORTED_MODULE_1__lib_listeners__["a" /* default */].unbindClicks(_onClick);
    __WEBPACK_IMPORTED_MODULE_1__lib_listeners__["a" /* default */].unbindKeys(_onKeyDown);
  }
}



/***/ }),

/***/ 278:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__keys__ = __webpack_require__(99);


var modKeys = Object.keys(__WEBPACK_IMPORTED_MODULE_0__keys__["c" /* modifiers */]);

function matchKeys(_ref) {
  var _ref$keySet = _ref.keySet,
      key = _ref$keySet.key,
      _ref$keySet$modifiers = _ref$keySet.modifiers,
      modifiers = _ref$keySet$modifiers === undefined ? [] : _ref$keySet$modifiers,
      event = _ref.event;

  var keysMatch = false;
  if (key === event.which) {
    var evtModKeys = modKeys.filter(function (modKey) {
      return event[modKey + 'Key'];
    }).sort();
    keysMatch = modifiers.length === evtModKeys.length && modifiers.every(function (modKey, index) {
      return evtModKeys[index] === modKey;
    });
  }
  return keysMatch;
}

/* harmony default export */ __webpack_exports__["a"] = matchKeys;

/***/ }),

/***/ 279:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__keys__ = __webpack_require__(99);


function parseKeys(keysArray) {
  return keysArray.map(function (key) {
    var keySet = { key: key };
    if (typeof key === 'string') {
      var keyString = key.toLowerCase().trim();
      var matches = keyString.split(/\s?\+\s?/);
      keySet = matches.length === 1 ? { key: __WEBPACK_IMPORTED_MODULE_0__keys__["a" /* default */][keyString] } : {
        key: __WEBPACK_IMPORTED_MODULE_0__keys__["a" /* default */][matches.pop()],
        modifiers: matches.map(function (modKey) {
          return __WEBPACK_IMPORTED_MODULE_0__keys__["c" /* modifiers */][modKey];
        }).sort()
      };
    }
    return keySet;
  });
}

/* harmony default export */ __webpack_exports__["a"] = parseKeys;

/***/ }),

/***/ 453:
/***/ (function(module, exports, __webpack_require__) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var stylesInDom = {},
	memoize = function(fn) {
		var memo;
		return function () {
			if (typeof memo === "undefined") memo = fn.apply(this, arguments);
			return memo;
		};
	},
	isOldIE = memoize(function() {
		// Test for IE <= 9 as proposed by Browserhacks
		// @see http://browserhacks.com/#hack-e71d8692f65334173fee715c222cb805
		// Tests for existence of standard globals is to allow style-loader 
		// to operate correctly into non-standard environments
		// @see https://github.com/webpack-contrib/style-loader/issues/177
		return window && document && document.all && !window.atob;
	}),
	getElement = (function(fn) {
		var memo = {};
		return function(selector) {
			if (typeof memo[selector] === "undefined") {
				memo[selector] = fn.call(this, selector);
			}
			return memo[selector]
		};
	})(function (styleTarget) {
		return document.querySelector(styleTarget)
	}),
	singletonElement = null,
	singletonCounter = 0,
	styleElementsInsertedAtTop = [],
	fixUrls = __webpack_require__(896);

module.exports = function(list, options) {
	if(typeof DEBUG !== "undefined" && DEBUG) {
		if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};
	options.attrs = typeof options.attrs === "object" ? options.attrs : {};

	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (typeof options.singleton === "undefined") options.singleton = isOldIE();

	// By default, add <style> tags to the <head> element
	if (typeof options.insertInto === "undefined") options.insertInto = "head";

	// By default, add <style> tags to the bottom of the target
	if (typeof options.insertAt === "undefined") options.insertAt = "bottom";

	var styles = listToStyles(list, options);
	addStylesToDom(styles, options);

	return function update(newList) {
		var mayRemove = [];
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			domStyle.refs--;
			mayRemove.push(domStyle);
		}
		if(newList) {
			var newStyles = listToStyles(newList, options);
			addStylesToDom(newStyles, options);
		}
		for(var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];
			if(domStyle.refs === 0) {
				for(var j = 0; j < domStyle.parts.length; j++)
					domStyle.parts[j]();
				delete stylesInDom[domStyle.id];
			}
		}
	};
};

function addStylesToDom(styles, options) {
	for(var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];
		if(domStyle) {
			domStyle.refs++;
			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}
			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];
			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}
			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles(list, options) {
	var styles = [];
	var newStyles = {};
	for(var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = options.base ? item[0] + options.base : item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};
		if(!newStyles[id])
			styles.push(newStyles[id] = {id: id, parts: [part]});
		else
			newStyles[id].parts.push(part);
	}
	return styles;
}

function insertStyleElement(options, styleElement) {
	var styleTarget = getElement(options.insertInto)
	if (!styleTarget) {
		throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");
	}
	var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];
	if (options.insertAt === "top") {
		if(!lastStyleElementInsertedAtTop) {
			styleTarget.insertBefore(styleElement, styleTarget.firstChild);
		} else if(lastStyleElementInsertedAtTop.nextSibling) {
			styleTarget.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			styleTarget.appendChild(styleElement);
		}
		styleElementsInsertedAtTop.push(styleElement);
	} else if (options.insertAt === "bottom") {
		styleTarget.appendChild(styleElement);
	} else {
		throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
	}
}

function removeStyleElement(styleElement) {
	styleElement.parentNode.removeChild(styleElement);
	var idx = styleElementsInsertedAtTop.indexOf(styleElement);
	if(idx >= 0) {
		styleElementsInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement(options) {
	var styleElement = document.createElement("style");
	options.attrs.type = "text/css";

	attachTagAttrs(styleElement, options.attrs);
	insertStyleElement(options, styleElement);
	return styleElement;
}

function createLinkElement(options) {
	var linkElement = document.createElement("link");
	options.attrs.type = "text/css";
	options.attrs.rel = "stylesheet";

	attachTagAttrs(linkElement, options.attrs);
	insertStyleElement(options, linkElement);
	return linkElement;
}

function attachTagAttrs(element, attrs) {
	Object.keys(attrs).forEach(function (key) {
		element.setAttribute(key, attrs[key]);
	});
}

function addStyle(obj, options) {
	var styleElement, update, remove, transformResult;

	// If a transform function was defined, run it on the css
	if (options.transform && obj.css) {
	    transformResult = options.transform(obj.css);
	    
	    if (transformResult) {
	    	// If transform returns a value, use that instead of the original css.
	    	// This allows running runtime transformations on the css.
	    	obj.css = transformResult;
	    } else {
	    	// If the transform function returns a falsy value, don't add this css. 
	    	// This allows conditional loading of css
	    	return function() {
	    		// noop
	    	};
	    }
	}

	if (options.singleton) {
		var styleIndex = singletonCounter++;
		styleElement = singletonElement || (singletonElement = createStyleElement(options));
		update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
		remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
	} else if(obj.sourceMap &&
		typeof URL === "function" &&
		typeof URL.createObjectURL === "function" &&
		typeof URL.revokeObjectURL === "function" &&
		typeof Blob === "function" &&
		typeof btoa === "function") {
		styleElement = createLinkElement(options);
		update = updateLink.bind(null, styleElement, options);
		remove = function() {
			removeStyleElement(styleElement);
			if(styleElement.href)
				URL.revokeObjectURL(styleElement.href);
		};
	} else {
		styleElement = createStyleElement(options);
		update = applyToTag.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
		};
	}

	update(obj);

	return function updateStyle(newObj) {
		if(newObj) {
			if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
				return;
			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;
		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag(styleElement, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (styleElement.styleSheet) {
		styleElement.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = styleElement.childNodes;
		if (childNodes[index]) styleElement.removeChild(childNodes[index]);
		if (childNodes.length) {
			styleElement.insertBefore(cssNode, childNodes[index]);
		} else {
			styleElement.appendChild(cssNode);
		}
	}
}

function applyToTag(styleElement, obj) {
	var css = obj.css;
	var media = obj.media;

	if(media) {
		styleElement.setAttribute("media", media)
	}

	if(styleElement.styleSheet) {
		styleElement.styleSheet.cssText = css;
	} else {
		while(styleElement.firstChild) {
			styleElement.removeChild(styleElement.firstChild);
		}
		styleElement.appendChild(document.createTextNode(css));
	}
}

function updateLink(linkElement, options, obj) {
	var css = obj.css;
	var sourceMap = obj.sourceMap;

	/* If convertToAbsoluteUrls isn't defined, but sourcemaps are enabled
	and there is no publicPath defined then lets turn convertToAbsoluteUrls
	on by default.  Otherwise default to the convertToAbsoluteUrls option
	directly
	*/
	var autoFixUrls = options.convertToAbsoluteUrls === undefined && sourceMap;

	if (options.convertToAbsoluteUrls || autoFixUrls){
		css = fixUrls(css);
	}

	if(sourceMap) {
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	var blob = new Blob([css], { type: "text/css" });

	var oldSrc = linkElement.href;

	linkElement.href = URL.createObjectURL(blob);

	if(oldSrc)
		URL.revokeObjectURL(oldSrc);
}


/***/ }),

/***/ 454:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _dec, _dec2, _dec3, _dec4, _dec5, _class, _desc, _value, _class2, _class3, _temp;

var _mobxReact = __webpack_require__(245);

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactKeydown = __webpack_require__(559);

var _reactKeydown2 = _interopRequireDefault(_reactKeydown);

var _semanticUiReact = __webpack_require__(146);

var _ExampleStore = __webpack_require__(457);

var _ExampleStore2 = _interopRequireDefault(_ExampleStore);

var _Spacer = __webpack_require__(458);

var _Spacer2 = _interopRequireDefault(_Spacer);

__webpack_require__(898);

var _TabbableTextArea = __webpack_require__(459);

var _TabbableTextArea2 = _interopRequireDefault(_TabbableTextArea);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
	var desc = {};
	Object['ke' + 'ys'](descriptor).forEach(function (key) {
		desc[key] = descriptor[key];
	});
	desc.enumerable = !!desc.enumerable;
	desc.configurable = !!desc.configurable;

	if ('value' in desc || desc.initializer) {
		desc.writable = true;
	}

	desc = decorators.slice().reverse().reduce(function (desc, decorator) {
		return decorator(target, property, desc) || desc;
	}, desc);

	if (context && desc.initializer !== void 0) {
		desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
		desc.initializer = undefined;
	}

	if (desc.initializer === void 0) {
		Object['define' + 'Property'](target, property, desc);
		desc = null;
	}

	return desc;
}

var SpellEditor = (_dec = (0, _reactKeydown2.default)("ctrl+s"), _dec2 = (0, _reactKeydown2.default)("ctrl+r"), _dec3 = (0, _reactKeydown2.default)("ctrl+c"), _dec4 = (0, _reactKeydown2.default)("ctrl+n"), _dec5 = (0, _reactKeydown2.default)("ctrl+d"), (0, _mobxReact.observer)(_class = (_class2 = (_temp = _class3 = function (_React$Component) {
	_inherits(SpellEditor, _React$Component);

	function SpellEditor(props) {
		_classCallCheck(this, SpellEditor);

		var _this = _possibleConstructorReturn(this, (SpellEditor.__proto__ || Object.getPrototypeOf(SpellEditor)).call(this, props));

		window.examples = props.examples;
		_this.props.examples.load();

		//DEBUG
		window.spellEditor = _this;
		window.examples = _this.props.examples;
		return _this;
	}

	_createClass(SpellEditor, [{
		key: "save",
		value: function save() {
			this.props.examples.save();
		}
	}, {
		key: "revert",
		value: function revert() {
			this.props.examples.revert();
		}
	}, {
		key: "compile",
		value: function compile() {
			this.props.examples.compile();
		}
	}, {
		key: "create",
		value: function create() {
			this.props.examples.create();
		}
	}, {
		key: "delete",
		value: function _delete() {
			this.props.examples.delete(undefined, "CONFIRM");
		}
	}, {
		key: "rename",
		value: function rename() {
			this.props.examples.rename();
		}
	}, {
		key: "duplicate",
		value: function duplicate() {
			this.props.examples.duplicate();
		}
	}, {
		key: "load",
		value: function load() {
			this.props.examples.load();
		}
	}, {
		key: "reset",
		value: function reset() {
			this.props.examples.reset();
		}
	}, {
		key: "render",
		value: function render() {
			var _this2 = this;

			var examples = this.props.examples;
			var titles = examples.titles,
			    selected = examples.selected,
			    dirty = examples.dirty,
			    code = examples.code,
			    output = examples.output;

			// Create menuitems from the examples

			var options = titles.map(function (title) {
				return {
					value: title,
					title: title,
					text: title,
					content: title,
					onClick: function onClick() {
						return examples.select(title);
					}
				};
			});

			var dirtyButtons = function dirtyButtons() {
				if (!dirty) return;
				return _react2.default.createElement(
					_semanticUiReact.Menu,
					{ secondary: true, style: { position: "absolute", right: "1rem", top: "3px", margin: 0 } },
					_react2.default.createElement(
						_semanticUiReact.Button,
						{ negative: true, onClick: function onClick() {
								return _this2.revert();
							} },
						_react2.default.createElement(
							"u",
							null,
							"R"
						),
						"evert"
					),
					_react2.default.createElement(
						_semanticUiReact.Button,
						{ positive: true, onClick: function onClick() {
								return _this2.save();
							} },
						_react2.default.createElement(
							"u",
							null,
							"S"
						),
						"ave"
					)
				);
			};

			var compileButton = function compileButton() {
				if (output) return;
				return _react2.default.createElement(_semanticUiReact.Button, {
					style: { position: "absolute", width: "4em", left: "calc(50% - 2em)", top: "50%" },
					onClick: function onClick() {
						return _this2.compile();
					},
					icon: "right chevron" });
			};

			return _react2.default.createElement(
				_semanticUiReact.Grid,
				{ stretched: true, padded: true, className: "fullHeight" },
				_react2.default.createElement(
					_semanticUiReact.Grid.Row,
					{ style: { height: "2rem", paddingTop: "0rem" }, className: "ui inverted attached menu" },
					_react2.default.createElement(
						_semanticUiReact.Grid.Column,
						{ width: 7 },
						_react2.default.createElement(
							_semanticUiReact.Menu,
							{ inverted: true, attached: true, fluid: true },
							_react2.default.createElement(
								_semanticUiReact.Menu.Item,
								null,
								"Example:"
							),
							_react2.default.createElement(_semanticUiReact.Dropdown, { item: true, selection: true, options: options, value: selected, style: { width: "20em" } }),
							_react2.default.createElement(
								_semanticUiReact.Menu.Item,
								{ onClick: function onClick() {
										return _this2.delete();
									} },
								_react2.default.createElement(
									"u",
									null,
									"D"
								),
								"elete"
							),
							_react2.default.createElement(
								_semanticUiReact.Menu.Item,
								{ onClick: function onClick() {
										return _this2.rename();
									} },
								"Rename"
							),
							_react2.default.createElement(
								_semanticUiReact.Menu.Item,
								{ onClick: function onClick() {
										return _this2.duplicate();
									} },
								"Duplicate"
							)
						)
					),
					_react2.default.createElement(
						_semanticUiReact.Grid.Column,
						{ width: 2 },
						_react2.default.createElement(
							_semanticUiReact.Menu,
							{ inverted: true, attached: true, fluid: true },
							_react2.default.createElement(_Spacer2.default, { fluid: true }),
							_react2.default.createElement(
								_semanticUiReact.Menu.Item,
								{ onClick: function onClick() {
										return _this2.create();
									} },
								_react2.default.createElement(
									"u",
									null,
									"N"
								),
								"ew"
							),
							_react2.default.createElement(_Spacer2.default, { fluid: true })
						)
					),
					_react2.default.createElement(
						_semanticUiReact.Grid.Column,
						{ width: 7 },
						_react2.default.createElement(
							_semanticUiReact.Menu,
							{ inverted: true, attached: true, fluid: true },
							_react2.default.createElement(_Spacer2.default, { fluid: true }),
							_react2.default.createElement(
								_semanticUiReact.Menu.Item,
								{ onClick: function onClick() {
										return _this2.load();
									} },
								"Reload"
							),
							_react2.default.createElement(
								_semanticUiReact.Menu.Item,
								{ onClick: function onClick() {
										return _this2.reset();
									} },
								"Reset"
							)
						)
					)
				),
				_react2.default.createElement(
					_semanticUiReact.Grid.Row,
					{ style: { height: "calc(100% - 3rem)" } },
					_react2.default.createElement(
						_semanticUiReact.Grid.Column,
						{ width: 8 },
						_react2.default.createElement(_TabbableTextArea2.default, {
							className: "ui segment",
							value: code,
							onChange: function onChange(event) {
								return examples.update(examples.selected, event.target.value, "SKIP_SAVE");
							}
						}),
						dirtyButtons()
					),
					_react2.default.createElement(
						_semanticUiReact.Grid.Column,
						{ width: 8 },
						_react2.default.createElement(_semanticUiReact.TextArea, { className: "ui segment", value: output })
					),
					compileButton()
				)
			);
		}
	}]);

	return SpellEditor;
}(_react2.default.Component), _class3.defaultProps = {
	examples: new _ExampleStore2.default()
}, _temp), (_applyDecoratedDescriptor(_class2.prototype, "save", [_dec], Object.getOwnPropertyDescriptor(_class2.prototype, "save"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "revert", [_dec2], Object.getOwnPropertyDescriptor(_class2.prototype, "revert"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "compile", [_dec3], Object.getOwnPropertyDescriptor(_class2.prototype, "compile"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "create", [_dec4], Object.getOwnPropertyDescriptor(_class2.prototype, "create"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "delete", [_dec5], Object.getOwnPropertyDescriptor(_class2.prototype, "delete"), _class2.prototype)), _class2)) || _class);
exports.default = SpellEditor;

/***/ }),

/***/ 455:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.Rule = exports.Parser = exports.Tokenizer = undefined;

var _Tokenizer2 = __webpack_require__(246);

var _Tokenizer3 = _interopRequireDefault(_Tokenizer2);

var _Parser2 = __webpack_require__(147);

var _Parser3 = _interopRequireDefault(_Parser2);

var _Rule2 = __webpack_require__(148);

var _Rule3 = _interopRequireDefault(_Rule2);

__webpack_require__(456);

var _all = __webpack_require__(904);

var _all2 = _interopRequireDefault(_all);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.Tokenizer = _Tokenizer3.default;
exports.Parser = _Parser3.default;
exports.Rule = _Rule3.default;


// Stick on window for reflection and ad-hoc testing.
if (typeof window !== "undefined") {
	Object.assign(window, {
		Tokenizer: exports.Tokenizer,
		tokenize: exports.Tokenizer.tokenize.bind(exports.Tokenizer),

		Rule: exports.Rule,

		Parser: exports.Parser,
		parser: _all2.default,
		parse: _all2.default.parse.bind(_all2.default),
		compile: _all2.default.compile.bind(_all2.default)
	});
}

exports.default = _all2.default;

/***/ }),

/***/ 456:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _memoize = __webpack_require__(461);

var _Parser = __webpack_require__(147);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(148);

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
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

		var lastIndex = syntaxStream.length;
		while (start < lastIndex) {
			var _Rule$parseRuleSyntax = _Rule2.default.parseRuleSyntax_token(syntaxStream, rules, start),
			    _Rule$parseRuleSyntax2 = _slicedToArray(_Rule$parseRuleSyntax, 2),
			    rule = _Rule$parseRuleSyntax2[0],
			    end = _Rule$parseRuleSyntax2[1];

			if (rule) {
				var last = rules[rules.length - 1];
				// If this is a `Symbol` and last was a `Symbol`, merge together
				if (last && last instanceof _Rule2.default.Symbol && rule instanceof _Rule2.default.Symbol) {
					// remove the last rule
					rules.pop();
					// and replace with a rule that merges the keywords
					rule.match = last.match.concat(rule.match);
				}
				rules.push(rule);
			}
			start = end + 1;
		}
		return rules;
	},
	parseRuleSyntax_token: function parseRuleSyntax_token(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

		var syntaxToken = syntaxStream[start];

		// if we got a "\\" (which also has to go into the source string as "\\")
		// treat the next token as a literal string rather than as a special character.
		if (syntaxToken === "\\") {
			return _Rule2.default.parseRuleSyntax_symbol(syntaxStream, rules, start + 1);
		}

		switch (syntaxToken) {
			case "{":
				return _Rule2.default.parseRuleSyntax_subrule(syntaxStream, rules, start);
			case "(":
				return _Rule2.default.parseRuleSyntax_parentheses(syntaxStream, rules, start);
			case "[":
				return _Rule2.default.parseRuleSyntax_list(syntaxStream, rules, start);
			case "*":
			case "+":
			case "?":
				return _Rule2.default.parseRuleSyntax_repeat(syntaxStream, rules, start);

			// the following should ALWAYS be consumed by the above
			case "}":
			case ")":
			case "]":
			case "|":
				throw new SyntaxError("Unexpected " + syntaxToken + " found as item " + start + " of " + this.syntax);

			default:
				if (syntaxToken.match(_Rule2.default.KEYWORD_PATTERN)) {
					return _Rule2.default.parseRuleSyntax_keyword(syntaxStream, rules, start);
				} else {
					return _Rule2.default.parseRuleSyntax_symbol(syntaxStream, rules, start);
				}
		}
	},


	KEYWORD_PATTERN: /[A-Za-z][\w_-]*/,

	// Match `keyword` in syntax rules.
	// If more than one keyword appears in a row, combines them into a single `Keyword` object.
	// This is pretty safe, unless you have an optional keyword like
	//		`the {identifier} of the? {expression}`
	// in which case you can put the optional keyword in parens
	//		`the {identifier} of (the?) {expression}`
	//
	// Returns `[ rule, end ]`
	// Throws if invalid.
	parseRuleSyntax_keyword: function parseRuleSyntax_keyword(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var constructor = arguments[3];

		var match = [],
		    end = void 0;
		// eat keywords while they last
		for (var i = start; i < syntaxStream.length; i++) {
			var next = syntaxStream[i];
			if (typeof next === "string" && next.match(_Rule2.default.KEYWORD_PATTERN)) {
				match.push(next);
				end = i;
			} else break;
		}

		if (!constructor) constructor = _Rule2.default.Keyword;
		var rule = new constructor({ match: match });

		return [rule, end];
	},


	// Match `keyword` in syntax rules.
	// Returns `[ rule, end ]`
	// Throws if invalid.
	parseRuleSyntax_symbol: function parseRuleSyntax_symbol(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var constructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.Symbol;

		var string = syntaxStream[start];

		if (!constructor) constructor = _Rule2.default.Symbol;

		// If string starts with `\\`, it's an escaped literal (eg: `\[` needs to input as `\\[`).
		var isEscaped = string.startsWith("\\");
		var match = isEscaped ? string.substr(1) : string;

		var rule = new constructor({ match: match });

		if (isEscaped) {
			rule.toString = function () {
				return "\\" + match + (this.optional ? '?' : '');
			};
		}

		return [rule, start];
	},


	// Match grouping expression `(...|...)` in syntax rules.
	// Returns `[ rule, end ]`
	// You can specify an explicit `rule.argument` with:  `(somearg:...)`
	// You can specify that the results should be `promoted` to enclosing context with: `(?:...)`
	//
	// NOTE: nested parens may not have alternatives... :-(   `(a|(b|c))` won't work???
	parseRuleSyntax_parentheses: function parseRuleSyntax_parentheses(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

		var _Parser$findNestedTok = _Parser2.default.findNestedTokens(syntaxStream, "(", ")", start),
		    end = _Parser$findNestedTok.end,
		    slice = _Parser$findNestedTok.slice;

		// pull out explicit "promote" flag: `?:`


		var promote = slice[0] === "?" && slice[1] === ":";
		if (promote) slice = slice.slice(2);

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
		if (promote) rule.promote = true;
		return [rule, end];

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
						    _end = _Parser$findNestedTok2.end;

						current = current.concat(tokens.slice(i, _end + 1));
						i = _end;
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
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

		var symbol = syntaxStream[start];
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

		return [undefined, start];
	},


	// Match `{<ruleName>}` in syntax rules.
	// Returns `[ rule, end ]`
	// Throws if invalid.
	parseRuleSyntax_subrule: function parseRuleSyntax_subrule(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

		var match = _Parser2.default.findNestedTokens(syntaxStream, "{", "}", start);
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
		return [rule, match.end];
	},


	// Match list expression `[<item><delimiter>]` in syntax rules.
	// Returns `[ rule, end ]`
	// Throws if invalid.
	parseRuleSyntax_list: function parseRuleSyntax_list(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var constructor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _Rule2.default.List;

		var _Parser$findNestedTok3 = _Parser2.default.findNestedTokens(syntaxStream, "[", "]", start),
		    end = _Parser$findNestedTok3.end,
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
		return [rule, end];
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
				if (_Parser2.default.DEBUG) console.log("Added rule '" + name + "':\n  INPUT: " + ruleSyntax + " \n OUTPUT: " + rule);

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
			if (!rule) throw new SyntaxError("Rule.addList(" + name + ", " + ruleSyntax + "): no rule produced");
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
			if (!rule) throw new SyntaxError("Rule.addKeyword(" + name + ", " + ruleSyntax + "): no rule produced");
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

			// Parse as `tokens`, which will merge Symbols for us.
			var stream = _Rule2.default.tokeniseRuleSyntax(ruleSyntax);
			var rules = _Rule2.default.parseRuleSyntax_tokens(stream, [], 0, constructor) || [];

			if (rules.length === 0) {
				throw new SyntaxError("Rule.addSymbol(" + name + ", " + ruleSyntax + "): no rule produced");
			}

			if (rules.length > 1 || !(rules[0] instanceof _Rule2.default.Symbol)) {
				throw new SyntaxError("Rule.addSymbol(" + name + ", " + ruleSyntax + "): generated something " + " other than a single Symbol.  Use Rule.addSyntax() instead.");
			}

			var rule = rules[0];
			// Convert to proper type if necessary
			if (constructor !== _Rule2.default.Symbol) rule = new constructor(rule);
			if (properties) Object.assign(rule, properties);
			return this.addRule(name, rule);
		} }

});

/***/ }),

/***/ 457:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _desc, _value, _class, _descriptor, _descriptor2, _descriptor3, _descriptor4; /* Store of example spell code fragments. */


var _mobx = __webpack_require__(145);

var _mobx2 = _interopRequireDefault(_mobx);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _initDefineProp(target, property, descriptor, context) {
	if (!descriptor) return;
	Object.defineProperty(target, property, {
		enumerable: descriptor.enumerable,
		configurable: descriptor.configurable,
		writable: descriptor.writable,
		value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
	});
}

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
	var desc = {};
	Object['ke' + 'ys'](descriptor).forEach(function (key) {
		desc[key] = descriptor[key];
	});
	desc.enumerable = !!desc.enumerable;
	desc.configurable = !!desc.configurable;

	if ('value' in desc || desc.initializer) {
		desc.writable = true;
	}

	desc = decorators.slice().reverse().reduce(function (desc, decorator) {
		return decorator(target, property, desc) || desc;
	}, desc);

	if (context && desc.initializer !== void 0) {
		desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
		desc.initializer = undefined;
	}

	if (desc.initializer === void 0) {
		Object['define' + 'Property'](target, property, desc);
		desc = null;
	}

	return desc;
}

function _initializerWarningHelper(descriptor, context) {
	throw new Error('Decorating class property failed. Please ensure that transform-class-properties is enabled.');
}

var ExampleStore = (_class = function () {
	function ExampleStore() {
		_classCallCheck(this, ExampleStore);

		_initDefineProp(this, "examples", _descriptor, this);

		_initDefineProp(this, "_savedExamples", _descriptor2, this);

		_initDefineProp(this, "selected", _descriptor3, this);

		_initDefineProp(this, "output", _descriptor4, this);
	}
	// Examples as of last save (for rever)

	// Selected example key.

	// Compiled output.


	_createClass(ExampleStore, [{
		key: "reset",


		// Reset all examples from localStorage.
		value: function reset() {
			delete localStorage.spellEditorExamples;
			delete localStorage.spellEditorExample;
			window.location.reload();
		}

		// Load examples

	}, {
		key: "load",
		value: function load() {
			// Load examples from localStorage
			this.examples = JSON.parse(localStorage.spellEditorExamples || '{"Foo":"define type Foo", "Bar":"define type Bar"}');

			// Save a copy of examples for revert
			this._savedExamples = this.examples;

			// Load selected example name
			this.select(localStorage.spellEditorExample);
		}

		// Save current examples.

	}, {
		key: "save",
		value: function save() {
			localStorage.spellEditorExamples = JSON.stringify(this.examples);

			// Save a copy of examples for revert
			this._savedExamples = this.examples;
		}

		// Revert the current example

	}, {
		key: "revert",
		value: function revert() {
			var example = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.selected;

			this.update(example, this._savedExamples[example]);
		}

		// Select a different example.

	}, {
		key: "select",
		value: function select(example) {
			if (!example || this.examples[example] == null) example = Object.keys(this.examples)[0] || "";
			this.selected = localStorage.spellEditorExample = example;
			this.output = "";
		}

		// Create a new example.
		// Saves and selects the example automatically.

	}, {
		key: "update",
		value: function update(name, code, skipSave) {
			this.examples = Object.assign({}, this.examples, _defineProperty({}, name, code));
			this.select(name);
			this.output = "";
			if (!skipSave) this.save();
		}

		// Delete an example.
		// Saves and selects another example automatically.

	}, {
		key: "delete",
		value: function _delete() {
			var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.selected;
			var showConfirm = arguments[1];

			if (showConfirm && !confirm("Really delete example " + name + "?")) return;
			var examples = Object.assign({}, this.examples);
			delete examples[name];
			this.examples = examples;
			this.save();
			this.select();
		}

		// Create a new example.

	}, {
		key: "create",
		value: function create(name) {
			var code = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";

			// If no name, prompt.
			if (!name) name = prompt("Name for this example?");
			// Forget it if no name.
			if (!name) return;

			this.update(name, code);
		}

		// Rename an example.
		// Selects and saves automatically.

	}, {
		key: "rename",
		value: function rename() {
			var oldName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.selected;
			var newName = arguments[1];

			// If no new name, prompt.
			if (!newName) newName = prompt("New name for this example?", oldName);

			// Forget it if no name supplied or name is the same
			if (!newName || newName === oldName) return;
			if (this.examples[newName]) return console.warn("examples.rename(\"" + newName + "\"): name already in use");

			var code = this.examples[oldName];
			this.delete(oldName);
			this.update(newName, code);
		}

		// Duplicate an example.

	}, {
		key: "duplicate",
		value: function duplicate() {
			var oldName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.selected;
			var newName = arguments[1];

			// If no new name, prompt.
			if (!newName) newName = prompt("New name for duplicate example?", oldName);
			// Forget it if no name supplied or name is the same
			if (!newName || newName === oldName) return;
			if (this.examples[newName]) return console.warn("examples.rename(\"" + newName + "\"): name already in use");

			this.update(newName, this.code);
		}

		// Compile the current example, placing it in our `output`.
		//TODO: some way to do this automatically w/ "output" ?

	}, {
		key: "compile",
		value: function compile() {
			var _this = this;

			this.output = "...compiling...";
			setTimeout(function () {
				_this.output = parser.compile(_this.code);
			}, 100);
		}
	}, {
		key: "titles",


		// Return just the titles of the examples.
		get: function get() {
			return Object.keys(this.examples);
		}

		// Return the code for the current example

	}, {
		key: "code",
		get: function get() {
			return this.examples[this.selected];
		}

		// Is ANYTHING dirty?

	}, {
		key: "dirty",
		get: function get() {
			return JSON.stringify(this._savedExamples) !== JSON.stringify(this.examples);
		}
	}]);

	return ExampleStore;
}(), (_descriptor = _applyDecoratedDescriptor(_class.prototype, "examples", [_mobx.observable], {
	enumerable: true,
	initializer: function initializer() {
		return {};
	}
}), _descriptor2 = _applyDecoratedDescriptor(_class.prototype, "_savedExamples", [_mobx.observable], {
	enumerable: true,
	initializer: function initializer() {
		return {};
	}
}), _descriptor3 = _applyDecoratedDescriptor(_class.prototype, "selected", [_mobx.observable], {
	enumerable: true,
	initializer: function initializer() {
		return "";
	}
}), _descriptor4 = _applyDecoratedDescriptor(_class.prototype, "output", [_mobx.observable], {
	enumerable: true,
	initializer: function initializer() {
		return "";
	}
}), _applyDecoratedDescriptor(_class.prototype, "titles", [_mobx.computed], Object.getOwnPropertyDescriptor(_class.prototype, "titles"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "code", [_mobx.computed], Object.getOwnPropertyDescriptor(_class.prototype, "code"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "dirty", [_mobx.computed], Object.getOwnPropertyDescriptor(_class.prototype, "dirty"), _class.prototype)), _class);
exports.default = ExampleStore;

/***/ }),

/***/ 458:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Spacer;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _propTypes = __webpack_require__(248);

var _propTypes2 = _interopRequireDefault(_propTypes);

var _util = __webpack_require__(460);

__webpack_require__(897);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//////////////////////////////
//
//  <Spacer> component for use with oak.
//
//////////////////////////////

function Spacer(props) {
  var className = props.className,
      appearance = props.appearance,
      size = props.size,
      width = props.width,
      height = props.height,
      inline = props.inline,
      fluid = props.fluid,
      tiny = props.tiny,
      small = props.small,
      medium = props.medium,
      large = props.large,
      huge = props.huge,
      massive = props.massive;


  var spacerProps = {
    className: (0, _util.classNames)(className, "oak", size, appearance, { inline: inline, fluid: fluid }, "spacer"),
    style: {
      width: width,
      height: height
    }
  };

  return _react2.default.createElement("div", spacerProps);
}

Spacer.propTypes = {
  className: _propTypes2.default.string,
  appearance: _propTypes2.default.string,
  size: _propTypes2.default.string,
  width: _propTypes2.default.number,
  height: _propTypes2.default.number,

  inline: _propTypes2.default.bool,
  fluid: _propTypes2.default.bool

};

Spacer.defaultProps = {
  size: "medium"
};

/***/ }),

/***/ 459:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _propTypes = __webpack_require__(248);

var _propTypes2 = _interopRequireDefault(_propTypes);

var _semanticUiReact = __webpack_require__(146);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

//
//	# <TabbableTextArea> -- <SUI.TextArea> in which you can type a tab character:
//	- If nothing is selected, inserts a tab character
//	- If anything is selected, inserts tab characters at the beginning of the line(s)
//	- If shift key is down, inserts tab characters at the beginning of the line(s).
//
//	### Properties
//	- `save` (required) -- function used to save the results on keypress
//
var TabbableTextArea = function (_TextArea) {
	_inherits(TabbableTextArea, _TextArea);

	function TabbableTextArea() {
		var _ref;

		var _temp, _this, _ret;

		_classCallCheck(this, TabbableTextArea);

		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = TabbableTextArea.__proto__ || Object.getPrototypeOf(TabbableTextArea)).call.apply(_ref, [this].concat(args))), _this), _this.onKeyDown = function (event) {

			//TODO fire `this.props.onKeyDown` if defined...
			// Forget it if not a tab
			if (event.keyCode !== 9) return;

			// prevent default so we don't exit the field
			event.preventDefault();

			// figure out the text range
			var element = event.target;
			var text = element.value;
			var start = element.selectionStart;
			var end = element.selectionEnd;

			// Replacement text
			var newText = "",
			    selectionStart = start,
			    selectionEnd = end;

			// If selection is empty,
			if (start === end && !event.shiftKey) {
				newText = "\t";
				selectionStart = selectionEnd = end + 1;
			}
			// otherwise indent/de-indent all of the lines
			else {
					// use start and end of line(s)
					//console.info(`start: ${start} :${text[start]}:   end: ${end} : ${text[end]}:`);
					if (text[start] !== "\n") start = text.lastIndexOf("\n", start) + 1;
					if (text[end - 1] === "\n") end--;else if (text[end + 1] !== "\n") end = text.indexOf("\n", end) - 1;
					//console.info(`start: ${start} :${text[start]}:   end: ${end} : ${text[end]}:`);

					var lines = text.slice(start, end).split("\n");
					// if shift key is down, REMOVE a tab from each line
					if (event.shiftKey) {
						lines = lines.map(function (line) {
							return line[0] === "\t" ? line.substr(1) : line;
						});
					}
					// otherwise ADD a tab to each line
					else {
							lines = lines.map(function (line) {
								return "\t" + line;
							});
						}
					selectionStart = start;
					newText = lines.join("\n");
					selectionEnd = selectionStart + newText.length + 1;
				}

			// Update input value.
			element.value = text.substr(0, start) + newText + text.substr(end);

			// Update the selection
			element.selectionStart = selectionStart;
			element.selectionEnd = selectionEnd;

			// Delegate to `props.onChange` to save the value outside of the control
			if (_this.props.onChange) _this.props.onChange(event);
		}, _temp), _possibleConstructorReturn(_this, _ret);
	}

	_createClass(TabbableTextArea, [{
		key: "render",
		value: function render() {
			return _react2.default.createElement(_semanticUiReact.TextArea, _extends({}, this.props, { onKeyDown: this.onKeyDown }));
		}

		// Do NOT exit on tab -- insert or remove tab(s) value instead.

	}]);

	return TabbableTextArea;
}(_semanticUiReact.TextArea);

exports.default = TabbableTextArea;

/***/ }),

/***/ 460:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.classNames = classNames;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

//////////////////////////////
//  React Utility functions
//////////////////////////////

// `classNames`, concept stolen from:  http://jedwatson.github.io/classnames
function classNames() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return args.map(function (arg) {
    if (!arg) return "";
    if (Array.isArray(arg)) return classNames.apply(undefined, _toConsumableArray(arg));
    switch (typeof arg === "undefined" ? "undefined" : _typeof(arg)) {
      case "number":
      case "string":
        return arg;
      default:
        return Object.keys(arg).map(function (key) {
          return arg[key] ? key : "";
        }).filter(Boolean).join(" ");
    }
  }).filter(Boolean).join(" ");
}

/***/ }),

/***/ 461:
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

/***/ 462:
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
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(243)))

/***/ }),

/***/ 463:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(247)(undefined);
// imports


// module
exports.push([module.i, ".oak.spacer {\n  position: relative;\n  display: block;\n}\n.oak.spacer.inline {\n  display: inline-block;\n  vertical-align: baseline;\n}\n.oak.spacer.fluid {\n  width: 100%;\n  flex: 1 1 100%;\n}\n.oak.spacer.tiny {\n  width: 2px;\n  height: 2px;\n}\n.oak.spacer.small {\n  width: 4px;\n  height: 4px;\n}\n.oak.spacer.medium {\n  width: 10px;\n  height: 10px;\n}\n.oak.spacer.large {\n  width: 20px;\n  height: 20px;\n}\n.oak.spacer.huge {\n  width: 30px;\n  height: 30px;\n}\n.oak.spacer.massive {\n  width: 50px;\n  height: 50px;\n}\n", ""]);

// exports


/***/ }),

/***/ 464:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(247)(undefined);
// imports


// module
exports.push([module.i, ".fullWidth {\n  width: 100%;\n}\n.fullHeight {\n  height: 100%;\n}\n.fullSize {\n  width: 100%;\n  height: 100%;\n}\n", ""]);

// exports


/***/ }),

/***/ 465:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */



if (process.env.NODE_ENV !== 'production') {
  var invariant = __webpack_require__(150);
  var warning = __webpack_require__(250);
  var ReactPropTypesSecret = __webpack_require__(249);
  var loggedTypeFailures = {};
}

/**
 * Assert that the values match with the type specs.
 * Error messages are memorized and will only be shown once.
 *
 * @param {object} typeSpecs Map of name to a ReactPropType
 * @param {object} values Runtime values that need to be type-checked
 * @param {string} location e.g. "prop", "context", "child context"
 * @param {string} componentName Name of the component for error messages.
 * @param {?Function} getStack Returns the component stack.
 * @private
 */
function checkPropTypes(typeSpecs, values, location, componentName, getStack) {
  if (process.env.NODE_ENV !== 'production') {
    for (var typeSpecName in typeSpecs) {
      if (typeSpecs.hasOwnProperty(typeSpecName)) {
        var error;
        // Prop type validation may throw. In case they do, we don't want to
        // fail the render phase where it didn't fail before. So we log it.
        // After these have been cleaned up, we'll let them throw.
        try {
          // This is intentionally an invariant that gets caught. It's the same
          // behavior as without this statement except with a better message.
          invariant(typeof typeSpecs[typeSpecName] === 'function', '%s: %s type `%s` is invalid; it must be a function, usually from ' + 'React.PropTypes.', componentName || 'React class', location, typeSpecName);
          error = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, ReactPropTypesSecret);
        } catch (ex) {
          error = ex;
        }
        warning(!error || error instanceof Error, '%s: type specification of %s `%s` is invalid; the type checker ' + 'function must return `null` or an `Error` but returned a %s. ' + 'You may have forgotten to pass an argument to the type checker ' + 'creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and ' + 'shape all require an argument).', componentName || 'React class', location, typeSpecName, typeof error);
        if (error instanceof Error && !(error.message in loggedTypeFailures)) {
          // Only monitor this failure once because there tends to be a lot of the
          // same error.
          loggedTypeFailures[error.message] = true;

          var stack = getStack ? getStack() : '';

          warning(false, 'Failed %s type: %s%s', location, error.message, stack != null ? stack : '');
        }
      }
    }
  }
}

module.exports = checkPropTypes;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0)))

/***/ }),

/***/ 466:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */



var emptyFunction = __webpack_require__(149);
var invariant = __webpack_require__(150);

module.exports = function() {
  // Important!
  // Keep this list in sync with production version in `./factoryWithTypeCheckers.js`.
  function shim() {
    invariant(
      false,
      'Calling PropTypes validators directly is not supported by the `prop-types` package. ' +
      'Use PropTypes.checkPropTypes() to call them. ' +
      'Read more at http://fb.me/use-check-prop-types'
    );
  };
  shim.isRequired = shim;
  function getShim() {
    return shim;
  };
  var ReactPropTypes = {
    array: shim,
    bool: shim,
    func: shim,
    number: shim,
    object: shim,
    string: shim,
    symbol: shim,

    any: shim,
    arrayOf: getShim,
    element: shim,
    instanceOf: getShim,
    node: shim,
    objectOf: getShim,
    oneOf: getShim,
    oneOfType: getShim,
    shape: getShim
  };

  ReactPropTypes.checkPropTypes = emptyFunction;
  ReactPropTypes.PropTypes = ReactPropTypes;

  return ReactPropTypes;
};


/***/ }),

/***/ 467:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */



var emptyFunction = __webpack_require__(149);
var invariant = __webpack_require__(150);
var warning = __webpack_require__(250);

var ReactPropTypesSecret = __webpack_require__(249);
var checkPropTypes = __webpack_require__(465);

module.exports = function(isValidElement, throwOnDirectAccess) {
  /* global Symbol */
  var ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
  var FAUX_ITERATOR_SYMBOL = '@@iterator'; // Before Symbol spec.

  /**
   * Returns the iterator method function contained on the iterable object.
   *
   * Be sure to invoke the function with the iterable as context:
   *
   *     var iteratorFn = getIteratorFn(myIterable);
   *     if (iteratorFn) {
   *       var iterator = iteratorFn.call(myIterable);
   *       ...
   *     }
   *
   * @param {?object} maybeIterable
   * @return {?function}
   */
  function getIteratorFn(maybeIterable) {
    var iteratorFn = maybeIterable && (ITERATOR_SYMBOL && maybeIterable[ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL]);
    if (typeof iteratorFn === 'function') {
      return iteratorFn;
    }
  }

  /**
   * Collection of methods that allow declaration and validation of props that are
   * supplied to React components. Example usage:
   *
   *   var Props = require('ReactPropTypes');
   *   var MyArticle = React.createClass({
   *     propTypes: {
   *       // An optional string prop named "description".
   *       description: Props.string,
   *
   *       // A required enum prop named "category".
   *       category: Props.oneOf(['News','Photos']).isRequired,
   *
   *       // A prop named "dialog" that requires an instance of Dialog.
   *       dialog: Props.instanceOf(Dialog).isRequired
   *     },
   *     render: function() { ... }
   *   });
   *
   * A more formal specification of how these methods are used:
   *
   *   type := array|bool|func|object|number|string|oneOf([...])|instanceOf(...)
   *   decl := ReactPropTypes.{type}(.isRequired)?
   *
   * Each and every declaration produces a function with the same signature. This
   * allows the creation of custom validation functions. For example:
   *
   *  var MyLink = React.createClass({
   *    propTypes: {
   *      // An optional string or URI prop named "href".
   *      href: function(props, propName, componentName) {
   *        var propValue = props[propName];
   *        if (propValue != null && typeof propValue !== 'string' &&
   *            !(propValue instanceof URI)) {
   *          return new Error(
   *            'Expected a string or an URI for ' + propName + ' in ' +
   *            componentName
   *          );
   *        }
   *      }
   *    },
   *    render: function() {...}
   *  });
   *
   * @internal
   */

  var ANONYMOUS = '<<anonymous>>';

  // Important!
  // Keep this list in sync with production version in `./factoryWithThrowingShims.js`.
  var ReactPropTypes = {
    array: createPrimitiveTypeChecker('array'),
    bool: createPrimitiveTypeChecker('boolean'),
    func: createPrimitiveTypeChecker('function'),
    number: createPrimitiveTypeChecker('number'),
    object: createPrimitiveTypeChecker('object'),
    string: createPrimitiveTypeChecker('string'),
    symbol: createPrimitiveTypeChecker('symbol'),

    any: createAnyTypeChecker(),
    arrayOf: createArrayOfTypeChecker,
    element: createElementTypeChecker(),
    instanceOf: createInstanceTypeChecker,
    node: createNodeChecker(),
    objectOf: createObjectOfTypeChecker,
    oneOf: createEnumTypeChecker,
    oneOfType: createUnionTypeChecker,
    shape: createShapeTypeChecker
  };

  /**
   * inlined Object.is polyfill to avoid requiring consumers ship their own
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
   */
  /*eslint-disable no-self-compare*/
  function is(x, y) {
    // SameValue algorithm
    if (x === y) {
      // Steps 1-5, 7-10
      // Steps 6.b-6.e: +0 != -0
      return x !== 0 || 1 / x === 1 / y;
    } else {
      // Step 6.a: NaN == NaN
      return x !== x && y !== y;
    }
  }
  /*eslint-enable no-self-compare*/

  /**
   * We use an Error-like object for backward compatibility as people may call
   * PropTypes directly and inspect their output. However, we don't use real
   * Errors anymore. We don't inspect their stack anyway, and creating them
   * is prohibitively expensive if they are created too often, such as what
   * happens in oneOfType() for any type before the one that matched.
   */
  function PropTypeError(message) {
    this.message = message;
    this.stack = '';
  }
  // Make `instanceof Error` still work for returned errors.
  PropTypeError.prototype = Error.prototype;

  function createChainableTypeChecker(validate) {
    if (process.env.NODE_ENV !== 'production') {
      var manualPropTypeCallCache = {};
      var manualPropTypeWarningCount = 0;
    }
    function checkType(isRequired, props, propName, componentName, location, propFullName, secret) {
      componentName = componentName || ANONYMOUS;
      propFullName = propFullName || propName;

      if (secret !== ReactPropTypesSecret) {
        if (throwOnDirectAccess) {
          // New behavior only for users of `prop-types` package
          invariant(
            false,
            'Calling PropTypes validators directly is not supported by the `prop-types` package. ' +
            'Use `PropTypes.checkPropTypes()` to call them. ' +
            'Read more at http://fb.me/use-check-prop-types'
          );
        } else if (process.env.NODE_ENV !== 'production' && typeof console !== 'undefined') {
          // Old behavior for people using React.PropTypes
          var cacheKey = componentName + ':' + propName;
          if (
            !manualPropTypeCallCache[cacheKey] &&
            // Avoid spamming the console because they are often not actionable except for lib authors
            manualPropTypeWarningCount < 3
          ) {
            warning(
              false,
              'You are manually calling a React.PropTypes validation ' +
              'function for the `%s` prop on `%s`. This is deprecated ' +
              'and will throw in the standalone `prop-types` package. ' +
              'You may be seeing this warning due to a third-party PropTypes ' +
              'library. See https://fb.me/react-warning-dont-call-proptypes ' + 'for details.',
              propFullName,
              componentName
            );
            manualPropTypeCallCache[cacheKey] = true;
            manualPropTypeWarningCount++;
          }
        }
      }
      if (props[propName] == null) {
        if (isRequired) {
          if (props[propName] === null) {
            return new PropTypeError('The ' + location + ' `' + propFullName + '` is marked as required ' + ('in `' + componentName + '`, but its value is `null`.'));
          }
          return new PropTypeError('The ' + location + ' `' + propFullName + '` is marked as required in ' + ('`' + componentName + '`, but its value is `undefined`.'));
        }
        return null;
      } else {
        return validate(props, propName, componentName, location, propFullName);
      }
    }

    var chainedCheckType = checkType.bind(null, false);
    chainedCheckType.isRequired = checkType.bind(null, true);

    return chainedCheckType;
  }

  function createPrimitiveTypeChecker(expectedType) {
    function validate(props, propName, componentName, location, propFullName, secret) {
      var propValue = props[propName];
      var propType = getPropType(propValue);
      if (propType !== expectedType) {
        // `propValue` being instance of, say, date/regexp, pass the 'object'
        // check, but we can offer a more precise error message here rather than
        // 'of type `object`'.
        var preciseType = getPreciseType(propValue);

        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + preciseType + '` supplied to `' + componentName + '`, expected ') + ('`' + expectedType + '`.'));
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createAnyTypeChecker() {
    return createChainableTypeChecker(emptyFunction.thatReturnsNull);
  }

  function createArrayOfTypeChecker(typeChecker) {
    function validate(props, propName, componentName, location, propFullName) {
      if (typeof typeChecker !== 'function') {
        return new PropTypeError('Property `' + propFullName + '` of component `' + componentName + '` has invalid PropType notation inside arrayOf.');
      }
      var propValue = props[propName];
      if (!Array.isArray(propValue)) {
        var propType = getPropType(propValue);
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected an array.'));
      }
      for (var i = 0; i < propValue.length; i++) {
        var error = typeChecker(propValue, i, componentName, location, propFullName + '[' + i + ']', ReactPropTypesSecret);
        if (error instanceof Error) {
          return error;
        }
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createElementTypeChecker() {
    function validate(props, propName, componentName, location, propFullName) {
      var propValue = props[propName];
      if (!isValidElement(propValue)) {
        var propType = getPropType(propValue);
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected a single ReactElement.'));
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createInstanceTypeChecker(expectedClass) {
    function validate(props, propName, componentName, location, propFullName) {
      if (!(props[propName] instanceof expectedClass)) {
        var expectedClassName = expectedClass.name || ANONYMOUS;
        var actualClassName = getClassName(props[propName]);
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + actualClassName + '` supplied to `' + componentName + '`, expected ') + ('instance of `' + expectedClassName + '`.'));
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createEnumTypeChecker(expectedValues) {
    if (!Array.isArray(expectedValues)) {
      process.env.NODE_ENV !== 'production' ? warning(false, 'Invalid argument supplied to oneOf, expected an instance of array.') : void 0;
      return emptyFunction.thatReturnsNull;
    }

    function validate(props, propName, componentName, location, propFullName) {
      var propValue = props[propName];
      for (var i = 0; i < expectedValues.length; i++) {
        if (is(propValue, expectedValues[i])) {
          return null;
        }
      }

      var valuesString = JSON.stringify(expectedValues);
      return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of value `' + propValue + '` ' + ('supplied to `' + componentName + '`, expected one of ' + valuesString + '.'));
    }
    return createChainableTypeChecker(validate);
  }

  function createObjectOfTypeChecker(typeChecker) {
    function validate(props, propName, componentName, location, propFullName) {
      if (typeof typeChecker !== 'function') {
        return new PropTypeError('Property `' + propFullName + '` of component `' + componentName + '` has invalid PropType notation inside objectOf.');
      }
      var propValue = props[propName];
      var propType = getPropType(propValue);
      if (propType !== 'object') {
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected an object.'));
      }
      for (var key in propValue) {
        if (propValue.hasOwnProperty(key)) {
          var error = typeChecker(propValue, key, componentName, location, propFullName + '.' + key, ReactPropTypesSecret);
          if (error instanceof Error) {
            return error;
          }
        }
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createUnionTypeChecker(arrayOfTypeCheckers) {
    if (!Array.isArray(arrayOfTypeCheckers)) {
      process.env.NODE_ENV !== 'production' ? warning(false, 'Invalid argument supplied to oneOfType, expected an instance of array.') : void 0;
      return emptyFunction.thatReturnsNull;
    }

    function validate(props, propName, componentName, location, propFullName) {
      for (var i = 0; i < arrayOfTypeCheckers.length; i++) {
        var checker = arrayOfTypeCheckers[i];
        if (checker(props, propName, componentName, location, propFullName, ReactPropTypesSecret) == null) {
          return null;
        }
      }

      return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` supplied to ' + ('`' + componentName + '`.'));
    }
    return createChainableTypeChecker(validate);
  }

  function createNodeChecker() {
    function validate(props, propName, componentName, location, propFullName) {
      if (!isNode(props[propName])) {
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` supplied to ' + ('`' + componentName + '`, expected a ReactNode.'));
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createShapeTypeChecker(shapeTypes) {
    function validate(props, propName, componentName, location, propFullName) {
      var propValue = props[propName];
      var propType = getPropType(propValue);
      if (propType !== 'object') {
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type `' + propType + '` ' + ('supplied to `' + componentName + '`, expected `object`.'));
      }
      for (var key in shapeTypes) {
        var checker = shapeTypes[key];
        if (!checker) {
          continue;
        }
        var error = checker(propValue, key, componentName, location, propFullName + '.' + key, ReactPropTypesSecret);
        if (error) {
          return error;
        }
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function isNode(propValue) {
    switch (typeof propValue) {
      case 'number':
      case 'string':
      case 'undefined':
        return true;
      case 'boolean':
        return !propValue;
      case 'object':
        if (Array.isArray(propValue)) {
          return propValue.every(isNode);
        }
        if (propValue === null || isValidElement(propValue)) {
          return true;
        }

        var iteratorFn = getIteratorFn(propValue);
        if (iteratorFn) {
          var iterator = iteratorFn.call(propValue);
          var step;
          if (iteratorFn !== propValue.entries) {
            while (!(step = iterator.next()).done) {
              if (!isNode(step.value)) {
                return false;
              }
            }
          } else {
            // Iterator will provide entry [k,v] tuples rather than values.
            while (!(step = iterator.next()).done) {
              var entry = step.value;
              if (entry) {
                if (!isNode(entry[1])) {
                  return false;
                }
              }
            }
          }
        } else {
          return false;
        }

        return true;
      default:
        return false;
    }
  }

  function isSymbol(propType, propValue) {
    // Native Symbol.
    if (propType === 'symbol') {
      return true;
    }

    // 19.4.3.5 Symbol.prototype[@@toStringTag] === 'Symbol'
    if (propValue['@@toStringTag'] === 'Symbol') {
      return true;
    }

    // Fallback for non-spec compliant Symbols which are polyfilled.
    if (typeof Symbol === 'function' && propValue instanceof Symbol) {
      return true;
    }

    return false;
  }

  // Equivalent of `typeof` but with special handling for array and regexp.
  function getPropType(propValue) {
    var propType = typeof propValue;
    if (Array.isArray(propValue)) {
      return 'array';
    }
    if (propValue instanceof RegExp) {
      // Old webkits (at least until Android 4.0) return 'function' rather than
      // 'object' for typeof a RegExp. We'll normalize this here so that /bla/
      // passes PropTypes.object.
      return 'object';
    }
    if (isSymbol(propType, propValue)) {
      return 'symbol';
    }
    return propType;
  }

  // This handles more types than `getPropType`. Only used for error messages.
  // See `createPrimitiveTypeChecker`.
  function getPreciseType(propValue) {
    var propType = getPropType(propValue);
    if (propType === 'object') {
      if (propValue instanceof Date) {
        return 'date';
      } else if (propValue instanceof RegExp) {
        return 'regexp';
      }
    }
    return propType;
  }

  // Returns class name of the object, if any.
  function getClassName(propValue) {
    if (!propValue.constructor || !propValue.constructor.name) {
      return ANONYMOUS;
    }
    return propValue.constructor.name;
  }

  ReactPropTypes.checkPropTypes = checkPropTypes;
  ReactPropTypes.PropTypes = ReactPropTypes;

  return ReactPropTypes;
};

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0)))

/***/ }),

/***/ 555:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__store__ = __webpack_require__(100);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__event_handlers__ = __webpack_require__(277);
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @module componentWrapper
 *
 */





/**
 * componentWrapper
 *
 * @access public
 * @param {object} WrappedComponent React component class to be wrapped
 * @param {array} [keys] The key(s) bound to the class
 * @return {object} The higher-order function that wraps the decorated class
 */
function componentWrapper(WrappedComponent) {
  var keys = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  var KeyBoardHelper = function (_React$Component) {
    _inherits(KeyBoardHelper, _React$Component);

    function KeyBoardHelper(props) {
      _classCallCheck(this, KeyBoardHelper);

      var _this = _possibleConstructorReturn(this, (KeyBoardHelper.__proto__ || Object.getPrototypeOf(KeyBoardHelper)).call(this, props));

      _this.state = {
        event: null
      };
      return _this;
    }

    _createClass(KeyBoardHelper, [{
      key: 'componentDidMount',
      value: function componentDidMount() {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__event_handlers__["a" /* onMount */])(this);
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__event_handlers__["b" /* onUnmount */])(this);
      }
    }, {
      key: 'handleKeyDown',
      value: function handleKeyDown(event) {
        var _this2 = this;

        // to simulate a keypress, set the event and then clear it in the callback
        this.setState({ event: event }, function () {
          return _this2.setState({ event: null });
        });
      }
    }, {
      key: 'render',
      value: function render() {
        return __WEBPACK_IMPORTED_MODULE_0_react___default.a.createElement(WrappedComponent, _extends({}, this.props, { keydown: this.state }));
      }
    }]);

    return KeyBoardHelper;
  }(__WEBPACK_IMPORTED_MODULE_0_react___default.a.Component);

  __WEBPACK_IMPORTED_MODULE_1__store__["b" /* default */].setBinding({ keys: keys, fn: KeyBoardHelper.prototype.handleKeyDown, target: KeyBoardHelper.prototype });

  return KeyBoardHelper;
}

/* harmony default export */ __webpack_exports__["a"] = componentWrapper;

/***/ }),

/***/ 556:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__class_decorator__ = __webpack_require__(555);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__method_decorator__ = __webpack_require__(557);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__method_decorator_scoped__ = __webpack_require__(558);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return keydownScoped; });
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * @module decorators
 *
 */




/**
 * _decorator
 *
 * @access private
 * @param {Function} methodFn The method wrapper to delegate to, based on whether user has specified a scoped decorator or not
 * @param {Array} ...args Remainder of arguments passed in
 * @return {Function} The decorated class or method
 */
function _decorator(methodFn) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  // check the first argument to see if it's a user-supplied keycode or array
  // of keycodes, or if it's the wrapped class or method
  var testArg = args[0];
  var isArray = Array.isArray(testArg);

  // if the test argument is not an object or function, it is user-supplied
  // keycodes. else there are no arguments and it's just the wrapped class
  // (method decorators must have keycode arguments).
  if (isArray || ~['string', 'number'].indexOf(typeof testArg === 'undefined' ? 'undefined' : _typeof(testArg))) {
    var keys = isArray ? testArg : args;

    // return the decorator function, which on the next call will look for
    // the presence of a method name to determine if this is a wrapped method
    // or component
    return function (target, methodName, descriptor) {
      return methodName ? methodFn({ target: target, descriptor: descriptor, keys: keys }) : __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__class_decorator__["a" /* default */])(target, keys);
    };
  } else {
    var methodName = args[1];

    // method decorators without keycode (which) arguments are not allowed.
    if (!methodName) {
      return __WEBPACK_IMPORTED_MODULE_0__class_decorator__["a" /* default */].apply(undefined, args);
    } else {
      console.warn(methodName + ': Method decorators must have keycode arguments, so the decorator for this method will not do anything');
    }
  }
}

/**
 * keydownScoped
 *
 * Method decorator that will look for changes to its targeted component's
 * `keydown` props to decide when to trigger, rather than responding directly
 * to keydown events. This lets you specify a @keydown decorated class higher
 * up in the view hierarchy for larger scoping of keydown events, or for
 * programmatically sending keydown events as props into the components in order
 * to trigger decorated methods with matching keys.
 *
 * @access public
 * @param {Array} ...args  All (or no) arguments passed in from decoration
 * @return {Function} The decorated class or method
 */
function keydownScoped() {
  for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  return _decorator.apply(undefined, [__WEBPACK_IMPORTED_MODULE_2__method_decorator_scoped__["a" /* default */]].concat(args));
}

/**
 * keydown
 *
 * The main decorator and default export, handles both classes and methods.
 *
 * @access public
 * @param {Array} ...args  All (or no) arguments passed in from decoration
 * @return {Function} The decorated class or method
 */
function keydown() {
  for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    args[_key3] = arguments[_key3];
  }

  return _decorator.apply(undefined, [__WEBPACK_IMPORTED_MODULE_1__method_decorator__["a" /* default */]].concat(args));
}

/* harmony default export */ __webpack_exports__["a"] = keydown;



/***/ }),

/***/ 557:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__store__ = __webpack_require__(100);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__event_handlers__ = __webpack_require__(277);
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * @module methodWrapper
 *
 */



/**
 * _isReactKeyDown
 *
 * @access private
 * @param {object} event The possibly synthetic event passed as an argument with
 * the method invocation.
 * @return {boolean}
 */
function _isReactKeyDown(event) {
  return event && (typeof event === 'undefined' ? 'undefined' : _typeof(event)) === 'object' && event.nativeEvent instanceof window.KeyboardEvent && event.type === 'keydown';
}

/**
 * methodWrapper
 *
 * @access public
 * @param {object} args All arguments necessary for wrapping method
 * @param {object} args.target The decorated class
 * @param {object} args.descriptor Method descriptor
 * @param {array} args.keys The array of keys bound to the given method
 * @return {object} The method descriptor
 */
function methodWrapper(_ref) {
  var target = _ref.target,
      descriptor = _ref.descriptor,
      keys = _ref.keys;


  var fn = descriptor.value;

  // if we haven't already created a binding for this class (via another
  // decorated method), wrap these lifecycle methods.
  if (!__WEBPACK_IMPORTED_MODULE_0__store__["b" /* default */].getBinding(target)) {
    var componentDidMount = target.componentDidMount,
        componentWillUnmount = target.componentWillUnmount;


    target.componentDidMount = function () {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__event_handlers__["a" /* onMount */])(this);
      if (componentDidMount) return componentDidMount.call(this);
    };

    target.componentWillUnmount = function () {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__event_handlers__["b" /* onUnmount */])(this);
      if (componentWillUnmount) return componentWillUnmount.call(this);
    };
  }

  // add this binding of keys and method to the target's bindings
  __WEBPACK_IMPORTED_MODULE_0__store__["b" /* default */].setBinding({ keys: keys, target: target, fn: fn });

  descriptor.value = function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var maybeEvent = args[0];

    if (_isReactKeyDown(maybeEvent)) {
      // proxy method in order to use @keydown as filter for keydown events coming
      // from an actual onKeyDown binding (as identified by react's addition of
      // 'nativeEvent' + type === 'keydown')
      if (!maybeEvent.ctrlKey) {
        // we already whitelist shortcuts with ctrl modifiers so if we were to
        // fire it again here the method would trigger twice. see https://github.com/glortho/react-keydown/issues/38
        return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__event_handlers__["c" /* _onKeyDown */])(maybeEvent, true);
      }
    } else if (!maybeEvent || !(maybeEvent instanceof window.KeyboardEvent) || maybeEvent.type !== 'keydown') {
      // if our first argument is a keydown event it is being handled by our
      // binding system. if it's anything else, just pass through.
      return fn.call.apply(fn, [this].concat(args));
    }
  };

  return descriptor;
}

/* harmony default export */ __webpack_exports__["a"] = methodWrapper;

/***/ }),

/***/ 558:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__lib_match_keys__ = __webpack_require__(278);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lib_parse_keys__ = __webpack_require__(279);
/**
 * @module methodWrapperScoped
 *
 */



/**
 * _shouldTrigger
 *
 * @access private
 * @param {object} thisProps Exsting props from the wrapped component
 * @param {object} thisProps.keydown The namespaced state from the higher-order
 * component (class_decorator)
 * @param {object} nextProps The incoming props from the wrapped component
 * @param {object} nextProps.keydown The namescaped state from the higher-order
 * component (class_decorator)
 * @param {array} keys The keys bound to the decorated method
 * @return {boolean} Whether all tests have passed
 */
function _shouldTrigger(_ref, keydownNext) {
  var keydownThis = _ref.keydown;

  return keydownNext && keydownNext.event && !keydownThis.event;
}

/**
 * methodWrapperScoped
 *
 * @access public
 * @param {object} args All args necessary for decorating the method
 * @param {object} args.target The decorated method's class object
 * @param {object} args.descriptor The method's descriptor object
 * @param {array} args.keys The key codes bound to the decorated method
 * @return {object} The method's descriptor object
 */
function methodWrapperScoped(_ref2) {
  var target = _ref2.target,
      descriptor = _ref2.descriptor,
      keys = _ref2.keys;
  var componentWillReceiveProps = target.componentWillReceiveProps;

  var fn = descriptor.value;
  if (!keys) {
    console.warn(fn + ': keydownScoped requires one or more keys');
  } else {
    var keySets = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__lib_parse_keys__["a" /* default */])(keys);

    // wrap the component's lifecycle method to intercept key codes coming down
    // from the wrapped/scoped component up the view hierarchy. if new keydown
    // event has arrived and the key codes match what was specified in the
    // decorator, call the wrapped method.
    target.componentWillReceiveProps = function (nextProps) {
      var keydown = nextProps.keydown;

      if (_shouldTrigger(this.props, keydown)) {
        if (keySets.some(function (keySet) {
          return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__lib_match_keys__["a" /* default */])({ keySet: keySet, event: keydown.event });
        })) {
          return fn.call(this, keydown.event);
        }
      }

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      if (componentWillReceiveProps) return componentWillReceiveProps.call.apply(componentWillReceiveProps, [this, nextProps].concat(args));
    };
  }

  return descriptor;
}

/* harmony default export */ __webpack_exports__["a"] = methodWrapperScoped;

/***/ }),

/***/ 559:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__lib_array_from__ = __webpack_require__(560);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__lib_array_from___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__lib_array_from__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__decorators__ = __webpack_require__(556);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return __WEBPACK_IMPORTED_MODULE_1__decorators__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "keydownScoped", function() { return __WEBPACK_IMPORTED_MODULE_1__decorators__["b"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__store__ = __webpack_require__(100);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "setBinding", function() { return __WEBPACK_IMPORTED_MODULE_2__store__["setBinding"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__lib_keys__ = __webpack_require__(99);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Keys", function() { return __WEBPACK_IMPORTED_MODULE_3__lib_keys__["a"]; });
// polyfill array.from (mainly for IE)


// @keydown and @keydownScoped


// setBinding - only useful if you're not going to use decorators


// Keys - use this to find key codes for strings. for example: Keys.j, Keys.enter


/***/ }),

/***/ 560:
/***/ (function(module, exports) {

// Production steps of ECMA-262, Edition 6, 22.1.2.1
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
if (!Array.from) {
  Array.from = function () {
    var toStr = Object.prototype.toString;
    var isCallable = function isCallable(fn) {
      return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
    };
    var toInteger = function toInteger(value) {
      var number = Number(value);
      if (isNaN(number)) {
        return 0;
      }
      if (number === 0 || !isFinite(number)) {
        return number;
      }
      return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
    };
    var maxSafeInteger = Math.pow(2, 53) - 1;
    var toLength = function toLength(value) {
      var len = toInteger(value);
      return Math.min(Math.max(len, 0), maxSafeInteger);
    };

    // The length property of the from method is 1.
    return function from(arrayLike /*, mapFn, thisArg */) {
      // 1. Let C be the this value.
      var C = this;

      // 2. Let items be ToObject(arrayLike).
      var items = Object(arrayLike);

      // 3. ReturnIfAbrupt(items).
      if (arrayLike == null) {
        throw new TypeError("Array.from requires an array-like object - not null or undefined");
      }

      // 4. If mapfn is undefined, then let mapping be false.
      var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
      var T;
      if (typeof mapFn !== 'undefined') {
        // 5. else
        // 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
        if (!isCallable(mapFn)) {
          throw new TypeError('Array.from: when provided, the second argument must be a function');
        }

        // 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
        if (arguments.length > 2) {
          T = arguments[2];
        }
      }

      // 10. Let lenValue be Get(items, "length").
      // 11. Let len be ToLength(lenValue).
      var len = toLength(items.length);

      // 13. If IsConstructor(C) is true, then
      // 13. a. Let A be the result of calling the [[Construct]] internal method 
      // of C with an argument list containing the single item len.
      // 14. a. Else, Let A be ArrayCreate(len).
      var A = isCallable(C) ? Object(new C(len)) : new Array(len);

      // 16. Let k be 0.
      var k = 0;
      // 17. Repeat, while k < len… (also steps a - h)
      var kValue;
      while (k < len) {
        kValue = items[k];
        if (mapFn) {
          A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
        } else {
          A[k] = kValue;
        }
        k += 1;
      }
      // 18. Let putStatus be Put(A, "length", len, true).
      A.length = len;
      // 20. Return A.
      return A;
    };
  }();
}

/***/ }),

/***/ 561:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react_dom__ = __webpack_require__(65);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react_dom___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react_dom__);
/**
 * @module domHelpers
 *
 */


var focusableSelector = 'a[href], button, input, object, select, textarea, [tabindex]';

/**
 * bindFocusables: Find any focusable child elements of the component instance and
 * add an onFocus handler to focus our keydown handlers on the parent component
 * when user keys applies focus to the element.
 *
 * NOTE: One limitation of this right now is that if you tab out of the
 * component, _focusedInstance will still be set until next click or mount or
 * controlled focus.
 *
 * @access public
 * @param {object} instance The key-bound component instance
 * @param {callback} activateOnFocus The fn to fire when element is focused
 */
function bindFocusables(instance, activateOnFocus) {
  if (document.querySelectorAll) {
    var node = __WEBPACK_IMPORTED_MODULE_0_react_dom___default.a.findDOMNode(instance);
    if (node) {
      var focusables = node.querySelectorAll(focusableSelector);
      if (focusables.length) {
        var onFocus = function onFocus(element) {
          var onFocusPrev = element.onfocus;
          return function (event) {
            activateOnFocus(instance);
            if (onFocusPrev) onFocusPrev.call(element, event);
          };
        };
        Array.prototype.slice.call(focusables).forEach(function (element) {
          return element.onfocus = onFocus(element);
        });
      }
    }
  }
}

/**
 * findContainerNodes: Called by our click handler to find instances with nodes
 * that are equal to or that contain the click target. Any that pass this test
 * will be recipients of the next keydown event.
 *
 * @access public
 * @param {object} target The click event.target DOM element
 * @return {function} Reducer function
 */
function findContainerNodes(target) {
  return function (memo, instance) {
    try {
      var node = __WEBPACK_IMPORTED_MODULE_0_react_dom___default.a.findDOMNode(instance);
      if (node && (node === target || node.contains(target))) {
        memo.push({ instance: instance, node: node });
      }
    } finally {
      return memo;
    }
  };
}

/**
 * sortByDOMPosition: Called by our click handler to sort a list of instances
 * according to least -> most nested. This is so that if multiple keybound
 * instances have nodes that are ancestors of the click target, they will be
 * sorted to let the instance closest to the click target get first dibs on the
 * next key down event.
 */
function sortByDOMPosition(a, b) {
  return a.node.compareDocumentPosition(b.node) === 10 ? 1 : -1;
}

/* harmony default export */ __webpack_exports__["a"] = { bindFocusables: bindFocusables, findContainerNodes: findContainerNodes, sortByDOMPosition: sortByDOMPosition };

/***/ }),

/***/ 562:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/**
 * @module Listeners
 *
 */

// flag for whether click listener has been bound to document
var _clicksBound = false;

// flag for whether keydown listener has been bound to document
var _keysBound = false;

var Listeners = {
  /**
   * _bindKeys
   *
   * @access public
   */
  bindKeys: function bindKeys(callback) {
    if (!_keysBound) {
      document.addEventListener('keydown', callback);
      _keysBound = true;
    }
  },


  /**
   * unbindKeys
   *
   * @access public
   */
  unbindKeys: function unbindKeys(callback) {
    if (_keysBound) {
      document.removeEventListener('keydown', callback);
      _keysBound = false;
    }
  },


  /**
   * bindClicks
   *
   * @access public
   */
  bindClicks: function bindClicks(callback) {
    if (!_clicksBound) {
      document.addEventListener('click', callback);
      _clicksBound = true;
    }
  },


  /**
   * unbindClicks
   *
   * @access public
   */
  unbindClicks: function unbindClicks(callback) {
    if (_clicksBound) {
      document.removeEventListener('click', callback);
      _clicksBound = false;
    }
  }
};

/* harmony default export */ __webpack_exports__["a"] = Listeners;

/***/ }),

/***/ 563:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = uuid;
// Counter being incremented. JS is single-threaded, so it'll Just Work™.
var __counter = 1;

/**
 * Returns a process-wide unique identifier.
 */
function uuid() {
  return "uid-" + __counter++;
}

/***/ }),

/***/ 896:
/***/ (function(module, exports) {


/**
 * When source maps are enabled, `style-loader` uses a link element with a data-uri to
 * embed the css on the page. This breaks all relative urls because now they are relative to a
 * bundle instead of the current page.
 *
 * One solution is to only use full urls, but that may be impossible.
 *
 * Instead, this function "fixes" the relative urls to be absolute according to the current page location.
 *
 * A rudimentary test suite is located at `test/fixUrls.js` and can be run via the `npm test` command.
 *
 */

module.exports = function (css) {
  // get current location
  var location = typeof window !== "undefined" && window.location;

  if (!location) {
    throw new Error("fixUrls requires window.location");
  }

	// blank or null?
	if (!css || typeof css !== "string") {
	  return css;
  }

  var baseUrl = location.protocol + "//" + location.host;
  var currentDir = baseUrl + location.pathname.replace(/\/[^\/]*$/, "/");

	// convert each url(...)
	/*
	This regular expression is just a way to recursively match brackets within
	a string.

	 /url\s*\(  = Match on the word "url" with any whitespace after it and then a parens
	   (  = Start a capturing group
	     (?:  = Start a non-capturing group
	         [^)(]  = Match anything that isn't a parentheses
	         |  = OR
	         \(  = Match a start parentheses
	             (?:  = Start another non-capturing groups
	                 [^)(]+  = Match anything that isn't a parentheses
	                 |  = OR
	                 \(  = Match a start parentheses
	                     [^)(]*  = Match anything that isn't a parentheses
	                 \)  = Match a end parentheses
	             )  = End Group
              *\) = Match anything and then a close parens
          )  = Close non-capturing group
          *  = Match anything
       )  = Close capturing group
	 \)  = Match a close parens

	 /gi  = Get all matches, not the first.  Be case insensitive.
	 */
	var fixedCss = css.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi, function(fullMatch, origUrl) {
		// strip quotes (if they exist)
		var unquotedOrigUrl = origUrl
			.trim()
			.replace(/^"(.*)"$/, function(o, $1){ return $1; })
			.replace(/^'(.*)'$/, function(o, $1){ return $1; });

		// already a full url? no change
		if (/^(#|data:|http:\/\/|https:\/\/|file:\/\/\/)/i.test(unquotedOrigUrl)) {
		  return fullMatch;
		}

		// convert the url to a full url
		var newUrl;

		if (unquotedOrigUrl.indexOf("//") === 0) {
		  	//TODO: should we add protocol?
			newUrl = unquotedOrigUrl;
		} else if (unquotedOrigUrl.indexOf("/") === 0) {
			// path should be relative to the base url
			newUrl = baseUrl + unquotedOrigUrl; // already starts with '/'
		} else {
			// path should be relative to current directory
			newUrl = currentDir + unquotedOrigUrl.replace(/^\.\//, ""); // Strip leading './'
		}

		// send back the fixed url(...)
		return "url(" + JSON.stringify(newUrl) + ")";
	});

	// send back the fixed css
	return fixedCss;
};


/***/ }),

/***/ 897:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(463);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(453)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../node_modules/css-loader/index.js!../../node_modules/less-loader/dist/index.js!./Spacer.less", function() {
			var newContent = require("!!../../node_modules/css-loader/index.js!../../node_modules/less-loader/dist/index.js!./Spacer.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),

/***/ 898:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(464);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(453)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../node_modules/css-loader/index.js!../../node_modules/less-loader/dist/index.js!./styles.less", function() {
			var newContent = require("!!../../node_modules/css-loader/index.js!../../node_modules/less-loader/dist/index.js!./styles.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),

/***/ 899:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactDom = __webpack_require__(65);

var _reactDom2 = _interopRequireDefault(_reactDom);

var _index = __webpack_require__(455);

var _index2 = _interopRequireDefault(_index);

var _SpellEditor = __webpack_require__(454);

var _SpellEditor2 = _interopRequireDefault(_SpellEditor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Kick off our top-level element


// Parser
// Common imports
_reactDom2.default.render(_react2.default.createElement(_SpellEditor2.default, null), document.getElementById('react-root'));

// App-specific imports

/***/ }),

/***/ 901:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _class, _temp;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(147);

var _Parser2 = _interopRequireDefault(_Parser);

var _RuleSyntax = __webpack_require__(456);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _Tokenizer = __webpack_require__(246);

var _Tokenizer2 = _interopRequireDefault(_Tokenizer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Core `rules` -- simple datatypes, etc.
//
// NOTE: many of the below are created as custom Pattern subclasses for debugging.
//


// Create `core` parser context.
var parser = _Parser2.default.forContext("core");
exports.default = parser;

//
// ### Install standard rules
//

// Block of `statements` with indentation for nesting.

parser.addRule("statements", _RuleSyntax2.default.Statements);

// Blank line representation in parser output.
_RuleSyntax2.default.BlankLine = function (_Rule) {
	_inherits(blank_line, _Rule);

	function blank_line() {
		_classCallCheck(this, blank_line);

		return _possibleConstructorReturn(this, (blank_line.__proto__ || Object.getPrototypeOf(blank_line)).apply(this, arguments));
	}

	_createClass(blank_line, [{
		key: "toSource",
		value: function toSource(context) {
			return "\n";
		}
	}]);

	return blank_line;
}(_RuleSyntax2.default);

// Open block representation in parser output.
_RuleSyntax2.default.OpenBlock = function (_Rule2) {
	_inherits(open_block, _Rule2);

	function open_block() {
		_classCallCheck(this, open_block);

		return _possibleConstructorReturn(this, (open_block.__proto__ || Object.getPrototypeOf(open_block)).apply(this, arguments));
	}

	_createClass(open_block, [{
		key: "toSource",
		value: function toSource(context) {
			return "{";
		}
	}]);

	return open_block;
}(_RuleSyntax2.default);

// Close block representation in parser output.
_RuleSyntax2.default.CloseBlock = function (_Rule3) {
	_inherits(close_block, _Rule3);

	function close_block() {
		_classCallCheck(this, close_block);

		return _possibleConstructorReturn(this, (close_block.__proto__ || Object.getPrototypeOf(close_block)).apply(this, arguments));
	}

	_createClass(close_block, [{
		key: "toSource",
		value: function toSource(context) {
			return (this.indent || "") + "}";
		}
	}]);

	return close_block;
}(_RuleSyntax2.default);

// Parser error representation in parser output.
_RuleSyntax2.default.ParseError = function (_Rule4) {
	_inherits(parse_error, _Rule4);

	function parse_error() {
		_classCallCheck(this, parse_error);

		return _possibleConstructorReturn(this, (parse_error.__proto__ || Object.getPrototypeOf(parse_error)).apply(this, arguments));
	}

	_createClass(parse_error, [{
		key: "toSource",
		value: function toSource(context) {
			var message = this.message.split("\n").join("\n// ");
			return "// ERROR: " + message;
		}
	}]);

	return parse_error;
}(_RuleSyntax2.default);

// Comment rule -- matches tokens of type `Tokenizer.Comment`.
_RuleSyntax2.default.Comment = function (_Rule5) {
	_inherits(comment, _Rule5);

	function comment() {
		_classCallCheck(this, comment);

		return _possibleConstructorReturn(this, (comment.__proto__ || Object.getPrototypeOf(comment)).apply(this, arguments));
	}

	_createClass(comment, [{
		key: "parse",

		// Comments are specially nodes in our token stream.
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments[3];
			var stack = arguments[4];

			var token = tokens[start];
			if (!(token instanceof _Tokenizer2.default.Comment)) return undefined;
			return this.clone({
				matched: token,
				nextStart: start + 1
			});
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			return "//" + this.matched.whitespace + this.matched.comment;
		}
	}]);

	return comment;
}(_RuleSyntax2.default);
parser.addRule("comment", _RuleSyntax2.default.Comment);

// `word` = is a single alphanumeric word.
// MUST start with a lower-case letter (?)
_RuleSyntax2.default.Word = function (_Rule$Pattern) {
	_inherits(word, _Rule$Pattern);

	function word() {
		_classCallCheck(this, word);

		return _possibleConstructorReturn(this, (word.__proto__ || Object.getPrototypeOf(word)).apply(this, arguments));
	}

	_createClass(word, [{
		key: "toSource",

		// Convert "-" to "_" in source output.
		value: function toSource(context) {
			return this.matched.replace(/\-/g, "_");
		}
	}]);

	return word;
}(_RuleSyntax2.default.Pattern);
_RuleSyntax2.default.Word.prototype.pattern = /^[a-z][\w\-]*$/;
parser.addRule("word", _RuleSyntax2.default.Word);

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
// NOTE: We blacklist a lot of words as identifiers.
_RuleSyntax2.default.Identifier = function (_Rule$Pattern2) {
	_inherits(identifier, _Rule$Pattern2);

	function identifier() {
		_classCallCheck(this, identifier);

		return _possibleConstructorReturn(this, (identifier.__proto__ || Object.getPrototypeOf(identifier)).apply(this, arguments));
	}

	_createClass(identifier, [{
		key: "toSource",

		// Convert "-" to "_" in source output.
		value: function toSource(context) {
			return this.matched.replace(/\-/g, "_");
		}
	}]);

	return identifier;
}(_RuleSyntax2.default.Pattern);
_RuleSyntax2.default.Identifier.prototype.pattern = /^[a-z][\w\-]*$/;
var identifier = parser.addRule(["identifier", "expression"], _RuleSyntax2.default.Identifier);

// Add English prepositions to identifier blacklist.
//
// Wikipedia "Preposition":
//	"Prepositions...are a class of words that
//	express spatial or temporal relations  (in, under, towards, before)
//	or mark various semantic roles (of, for).
// TESTME
identifier.addToBlacklist("about", "above", "after", "and", "as", "at", "before", "behind", "below", "beneath", "beside", "between", "beyond", "by", "defined", "down", "during", "each", "empty", "exactly", "except", "for", "from", "greater", "I", "in", "into", "less", "long", "me", "minus", "more", "near", "not", "of", "off", "on", "onto", "opposite", "or", "out", "outside", "over", "short", "since", "than", "the", "then", "through", "thru", "to", "toward", "towards", "undefined", "under", "underneath", "unique", "until", "up", "upon", "upside", "versus", "vs", "where", "with", "within", "without");

// Add common english verbs to identifier blacklist.
identifier.addToBlacklist("are", "do", "does", "contains", "has", "have", "is", "repeat", "was", "were");

// Add special control keywords to identifier blacklist.
identifier.addToBlacklist("else", "if", "otherwise", "while");

// `Type` = type name.
// MUST start with an upper-case letter (?)
_RuleSyntax2.default.Type = function (_Rule$Pattern3) {
	_inherits(type, _Rule$Pattern3);

	function type() {
		_classCallCheck(this, type);

		return _possibleConstructorReturn(this, (type.__proto__ || Object.getPrototypeOf(type)).apply(this, arguments));
	}

	_createClass(type, [{
		key: "toSource",

		// Convert "-" to "_" in source output.
		value: function toSource(context) {
			var type = this.matched;
			switch (type) {
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
					return type.replace(/\-/g, "_");
			}
		}
	}]);

	return type;
}(_RuleSyntax2.default.Pattern);
_RuleSyntax2.default.Type.prototype.pattern = /([A-Z][\w\-]*|text|number|integer|decimal|character|boolean|object)/;
var type = parser.addRule(["type", "expression"], _RuleSyntax2.default.Type);
type.addToBlacklist("I");

// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
_RuleSyntax2.default.Boolean = function (_Rule$Pattern4) {
	_inherits(boolean, _Rule$Pattern4);

	function boolean() {
		_classCallCheck(this, boolean);

		return _possibleConstructorReturn(this, (boolean.__proto__ || Object.getPrototypeOf(boolean)).apply(this, arguments));
	}

	_createClass(boolean, [{
		key: "toSource",
		value: function toSource(context) {
			switch (this.matched) {
				case "true":
				case "yes":
				case "ok":
				case "success":
					return true;

				default:
					return false;
			}
		}
	}]);

	return boolean;
}(_RuleSyntax2.default.Pattern);
_RuleSyntax2.default.Boolean.prototype.pattern = /^(true|false|yes|no|ok|cancel|success|failure)$/;
parser.addRule(["boolean", "expression"], _RuleSyntax2.default.Boolean);

// Add boolean tokens to identifier blacklist.
// TESTME
identifier.addToBlacklist("true", "false", "yes", "no", "ok", "cancel", "success", "failure");

// `number` as either float or integer, created with custom constructor for debugging.
// NOTE: you can also use `one`...`ten` as strings.'
// TODO:  `integer` and `decimal`?  too techy?
_RuleSyntax2.default.Number = (_temp = _class = function (_Rule6) {
	_inherits(number, _Rule6);

	function number() {
		_classCallCheck(this, number);

		return _possibleConstructorReturn(this, (number.__proto__ || Object.getPrototypeOf(number)).apply(this, arguments));
	}

	_createClass(number, [{
		key: "parse",


		// Numbers get encoded as numbers in the token stream.
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			var token = tokens[start];
			// if a string, attempt to run through our NUMBER_NAMES
			if (typeof token === "string") token = _RuleSyntax2.default.Number.NUMBER_NAMES[token];
			if (typeof token !== "number") return undefined;
			return this.clone({
				matched: token,
				nextStart: start + 1
			});
		}

		// Convert to number on source output.

		// Special words you can use as numbers...

	}, {
		key: "toSource",
		value: function toSource(context) {
			return this.matched;
		}
	}]);

	return number;
}(_RuleSyntax2.default), _class.NUMBER_NAMES = {
	zero: 0,
	one: 1,
	two: 2,
	three: 3,
	four: 4,
	five: 5,
	six: 6,
	seven: 7,
	eight: 8,
	nine: 9,
	ten: 10
}, _temp);

parser.addRule(["number", "expression"], _RuleSyntax2.default.Number);

// Add number words to identifier blacklist.
// TESTME
identifier.addToBlacklist("one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten");

// Literal `text` string, created with custom constructor for debugging.
// You can use either single or double quotes on the outside (although double quotes are preferred).
// Returned value has enclosing quotes.
_RuleSyntax2.default.Text = function (_Rule7) {
	_inherits(text, _Rule7);

	function text() {
		_classCallCheck(this, text);

		return _possibleConstructorReturn(this, (text.__proto__ || Object.getPrototypeOf(text)).apply(this, arguments));
	}

	_createClass(text, [{
		key: "parse",

		// Text strings get encoded as `text` objects in the token stream.
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			var token = tokens[start];
			if (!(token instanceof _Tokenizer2.default.Text)) return undefined;
			return this.clone({
				matched: token,
				nextStart: start + 1
			});
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			return this.matched.quotedString;
		}
	}]);

	return text;
}(_RuleSyntax2.default);
parser.addRule(["text", "expression"], _RuleSyntax2.default.Text);

// Literal list (array), eg:  `[1,2,true,false ]`
parser.addExpression("literal_list", "\\[[list:{expression},]?\\]", function (_Rule$Expression) {
	_inherits(literal_list, _Rule$Expression);

	function literal_list() {
		_classCallCheck(this, literal_list);

		return _possibleConstructorReturn(this, (literal_list.__proto__ || Object.getPrototypeOf(literal_list)).apply(this, arguments));
	}

	_createClass(literal_list, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource = this.getMatchedSource(context),
			    list = _getMatchedSource.list;

			return "[" + (list ? list.join(", ") : "") + "]";
		}
	}]);

	return literal_list;
}(_RuleSyntax2.default.Expression));

// Parenthesized expression
//TESTME
parser.addExpression("parenthesized_expression", "\\({expression}\\)", function (_Rule$Expression2) {
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

/***/ 902:
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
exports.getTabs = getTabs;

var _global = __webpack_require__(462);

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

// Return a certain `number` of tab characters.
var TABS = "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t";
function getTabs(number) {
	if (typeof number !== "number") return "";
	return TABS.substr(0, number);
}

// Export all as a lump
var allExports = _extends({}, exports);
exports.default = allExports;

// DEBUG: put on global for debugging.

_global2.default.STRING = allExports;

/***/ }),

/***/ 903:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(147);

var _Parser2 = _interopRequireDefault(_Parser);

var _Tokenizer = __webpack_require__(246);

var _Tokenizer2 = _interopRequireDefault(_Tokenizer);

var _RuleSyntax = __webpack_require__(456);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for defining classes (known as `types`)
//


// Create "JSX" parser context.
var parser = _Parser2.default.forContext("JSX");
exports.default = parser;

// JSX expression.

_RuleSyntax2.default.JSX = function (_Rule) {
	_inherits(jsxElement, _Rule);

	function jsxElement() {
		_classCallCheck(this, jsxElement);

		return _possibleConstructorReturn(this, (jsxElement.__proto__ || Object.getPrototypeOf(jsxElement)).apply(this, arguments));
	}

	_createClass(jsxElement, [{
		key: "parse",

		// Text strings get encoded as `text` objects in the token stream.
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			var token = tokens[start];
			if (!(token instanceof _Tokenizer2.default.JSXElement)) return undefined;
			return this.clone({
				matched: token,
				nextStart: start + 1
			});
		}

		// Convert our attributes to source.
		// Returns `undefined` if no attributes.

	}, {
		key: "attrsToSource",
		value: function attrsToSource(context) {
			var _this2 = this;

			var jsxElement = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.matched;

			var attributes = jsxElement.attributes;
			if (!attributes || !attributes.length) return undefined;

			var attrs = attributes.map(function (_ref) {
				var name = _ref.name,
				    value = _ref.value;

				// if NO value, assume it's a variable of the same name
				if (value === undefined) value = name;
				// if it's an array, it's a spell expression, possibly with nested JSX elements...
				else if (value instanceof _Tokenizer2.default.JSXExpression) {
						value = _this2.jsxExpressionToSource(context, value);
					}
					// else if a JSX element, recurse
					//TODO: indent...
					else if (value instanceof _Tokenizer2.default.JSXElement) {
							value = value.toSource(context);
						}
				// Otherwise if a number or Text literal, just use it

				// special case `class` to `className` because React is effing persnickety.
				if (name === "class") name = "className";
				//TODO: escape names which are invalid JS identifiers
				return name + ": " + value;
			});

			return "{ " + attrs.join(", ") + " }";
		}

		// Return an array with source for each of our children.
		// Returns `undefined` if we don't have any children.

	}, {
		key: "childrenToSource",
		value: function childrenToSource(context) {
			var _this3 = this;

			var jsxElement = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.matched;

			var children = jsxElement.children;
			if (!children || children.length === 0) return undefined;
			return children.map(function (child) {
				//TODO: escape inner quotes...
				if (typeof child === "string") {
					//forget it if whitespace only... ???
					var text = child.trim();
					if (!text) return undefined;
					return "\"" + text + "\"";
				}
				if (child instanceof _Tokenizer2.default.JSXElement) {
					var childSource = _this3.jsxElementToSource(context, child);
					return childSource.split("\n").join("\n\t");
				}
				if (child instanceof _Tokenizer2.default.JSXExpression) {
					return _this3.jsxExpressionToSource(context, child);
				}
				throw new SyntaxError("childrenToSource(): don't understand child" + child);
			})
			// remove undefined/empty string rules
			.filter(Boolean);
		}

		// Convert JSX expression ( `{...}` ) to JS source.

	}, {
		key: "jsxExpressionToSource",
		value: function jsxExpressionToSource(context, jsxExpression) {
			var tokens = jsxExpression.tokens;
			console.info(jsxExpression, tokens);
			return "/" + ("*TODO: " + tokens.join(" ") + "*") + "/";
		}
	}, {
		key: "jsxElementToSource",
		value: function jsxElementToSource(context) {
			var jsxElement = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.matched;

			// get the bits of the output
			var tagName = "\"" + jsxElement.tagName + "\"";
			var attrs = this.attrsToSource(context, jsxElement);
			var children = this.childrenToSource(context, jsxElement);

			var output = "createElement(" + tagName;
			if (!attrs && children) attrs = "null";

			if (attrs) output += ", " + attrs;
			if (children) {
				output += ",\n\t" + children.join(",\n\t") + "\n";
			}
			output += ")";
			return output;
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			return this.jsxElementToSource(context, this.matched);
		}
	}]);

	return jsxElement;
}(_RuleSyntax2.default);

// Define jsx block as an `expression` OR a `statement`.
parser.addRule(["jsx", "expression", "statement"], _RuleSyntax2.default.JSX);

/***/ }),

/***/ 904:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Parser = __webpack_require__(147);

var _Parser2 = _interopRequireDefault(_Parser);

__webpack_require__(901);

__webpack_require__(906);

__webpack_require__(907);

__webpack_require__(905);

__webpack_require__(908);

__webpack_require__(909);

__webpack_require__(903);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Create parser for all.
// Export all standard "english" rules.
var parser = _Parser2.default.forContext("all");

// Load all standard rules files.
exports.default = parser;

// And depend on standard rules loaded above.

parser.import("core", "lists", "operators", "if", "statements", "types", "JSX");

/***/ }),

/***/ 905:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(147);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(148);

var _Rule2 = _interopRequireDefault(_Rule);

__webpack_require__(901);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for if statements.
//

// Create "if" parser context.
var parser = _Parser2.default.forContext("if");
exports.default = parser;

// Import core rules.

parser.import("core");

//TESTME
parser.addStatement("if", "if {condition:expression} (then|:)? {statement}?", function (_Rule$Statement) {
	_inherits(if_, _Rule$Statement);

	function if_() {
		_classCallCheck(this, if_);

		return _possibleConstructorReturn(this, (if_.__proto__ || Object.getPrototypeOf(if_)).apply(this, arguments));
	}

	_createClass(if_, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource = this.getMatchedSource(context),
			    condition = _getMatchedSource.condition,
			    statement = _getMatchedSource.statement;

			if (statement) return "if (" + condition + ") { " + statement + " }";
			return "if (" + condition + ")";
		}
	}]);

	return if_;
}(_Rule2.default.Statement));

parser.addStatement("backwards_if", "{statement} if {condition:expression} (?:(else|otherwise) {elseStatement:statement})?", function (_Rule$Statement2) {
	_inherits(backwards_if, _Rule$Statement2);

	function backwards_if() {
		var _ref;

		var _temp, _this2, _ret;

		_classCallCheck(this, backwards_if);

		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		return _ret = (_temp = (_this2 = _possibleConstructorReturn(this, (_ref = backwards_if.__proto__ || Object.getPrototypeOf(backwards_if)).call.apply(_ref, [this].concat(args))), _this2), _this2.testRule = new _Rule2.default.Match({ match: ["if"] }), _temp), _possibleConstructorReturn(_this2, _ret);
	}

	_createClass(backwards_if, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource2 = this.getMatchedSource(context),
			    condition = _getMatchedSource2.condition,
			    statement = _getMatchedSource2.statement,
			    elseStatement = _getMatchedSource2.elseStatement;

			if (elseStatement) return "if (" + condition + ") { " + statement + " } else { " + elseStatement + " }";
			return "if (" + condition + ") { " + statement + " }";
		}
	}]);

	return backwards_if;
}(_Rule2.default.Statement));

parser.addStatement("else_if", "(else|otherwise) if {condition:expression} (then|:) {statement}?", function (_Rule$Statement3) {
	_inherits(else_if, _Rule$Statement3);

	function else_if() {
		_classCallCheck(this, else_if);

		return _possibleConstructorReturn(this, (else_if.__proto__ || Object.getPrototypeOf(else_if)).apply(this, arguments));
	}

	_createClass(else_if, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource3 = this.getMatchedSource(context),
			    condition = _getMatchedSource3.condition,
			    statement = _getMatchedSource3.statement;

			;
			if (statement) return "else if (" + condition + ") { " + statement + " }";
			return "else if (" + condition + ")";
		}
	}]);

	return else_if;
}(_Rule2.default.Statement));

parser.addStatement("else", "(else|otherwise) {statement}?", function (_Rule$Statement4) {
	_inherits(else_, _Rule$Statement4);

	function else_() {
		_classCallCheck(this, else_);

		return _possibleConstructorReturn(this, (else_.__proto__ || Object.getPrototypeOf(else_)).apply(this, arguments));
	}

	_createClass(else_, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource4 = this.getMatchedSource(context),
			    statement = _getMatchedSource4.statement;

			if (statement) return "else { " + statement + " }";
			return "else";
		}
	}]);

	return else_;
}(_Rule2.default.Statement));

/***/ }),

/***/ 906:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(147);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(148);

var _Rule2 = _interopRequireDefault(_Rule);

var _string = __webpack_require__(902);

__webpack_require__(901);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for dealing with lists
//

// TODO: confirm identifiers are plural in some of the below?
// TODO: `list.clone()` to return new list of same type.

// Create "lists" parser context.
var parser = _Parser2.default.forContext("lists");
exports.default = parser;

// Import core rules.

parser.import("core");

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
parser.addExpression("list_length", "the? number of {identifier} in {list:expression}", function (_Rule$Sequence) {
	_inherits(list_length, _Rule$Sequence);

	function list_length() {
		_classCallCheck(this, list_length);

		return _possibleConstructorReturn(this, (list_length.__proto__ || Object.getPrototypeOf(list_length)).apply(this, arguments));
	}

	_createClass(list_length, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource = this.getMatchedSource(context),
			    list = _getMatchedSource.list,
			    identifier = _getMatchedSource.identifier;
			// TODO: special case 'words', 'lines', etc


			return list + ".length";
		}
	}]);

	return list_length;
}(_Rule2.default.Sequence));

// Return the first position of specified item in the list as an array.
// If item is not found, returns `undefined`.
// NOTE: this position returned is **1-based**.
//TESTME
// TODO: `positions`, `last position`, `after...`
parser.addExpression("list_position", "the? position of {thing:expression} in {list:expression}", function (_Rule$Sequence2) {
	_inherits(list_position, _Rule$Sequence2);

	function list_position() {
		_classCallCheck(this, list_position);

		return _possibleConstructorReturn(this, (list_position.__proto__ || Object.getPrototypeOf(list_position)).apply(this, arguments));
	}

	_createClass(list_position, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource2 = this.getMatchedSource(context),
			    thing = _getMatchedSource2.thing,
			    list = _getMatchedSource2.list;

			return "spell.positionOf(" + thing + ", " + list + ")";
		}
	}]);

	return list_position;
}(_Rule2.default.Sequence));

//
//	Ordinal numbers (first, second, last, etc).
// TODO: sixty-fifth, two hundred forty ninth...
//
parser.addRule("ordinal", function (_Rule$Alternatives) {
	_inherits(ordinal, _Rule$Alternatives);

	function ordinal() {
		_classCallCheck(this, ordinal);

		return _possibleConstructorReturn(this, (ordinal.__proto__ || Object.getPrototypeOf(ordinal)).apply(this, arguments));
	}

	return ordinal;
}(_Rule2.default.Alternatives));

var ordinal = function (_Rule$Keyword) {
	_inherits(ordinal, _Rule$Keyword);

	function ordinal() {
		_classCallCheck(this, ordinal);

		return _possibleConstructorReturn(this, (ordinal.__proto__ || Object.getPrototypeOf(ordinal)).apply(this, arguments));
	}

	return ordinal;
}(_Rule2.default.Keyword);

parser.addKeyword("ordinal", "first", ordinal, { toSource: function toSource() {
		return 1;
	} });
parser.addKeyword("ordinal", "second", ordinal, { toSource: function toSource() {
		return 2;
	} });
parser.addKeyword("ordinal", "third", ordinal, { toSource: function toSource() {
		return 3;
	} });
parser.addKeyword("ordinal", "fourth", ordinal, { toSource: function toSource() {
		return 4;
	} });
parser.addKeyword("ordinal", "fifth", ordinal, { toSource: function toSource() {
		return 5;
	} });
parser.addKeyword("ordinal", "sixth", ordinal, { toSource: function toSource() {
		return 6;
	} });
parser.addKeyword("ordinal", "seventh", ordinal, { toSource: function toSource() {
		return 7;
	} });
parser.addKeyword("ordinal", "eighth", ordinal, { toSource: function toSource() {
		return 8;
	} });
parser.addKeyword("ordinal", "ninth", ordinal, { toSource: function toSource() {
		return 9;
	} });
parser.addKeyword("ordinal", "tenth", ordinal, { toSource: function toSource() {
		return 10;
	} });
parser.addKeyword("ordinal", "penultimate", ordinal, { toSource: function toSource() {
		return -2;
	} });
parser.addKeyword("ordinal", "final", ordinal, { toSource: function toSource() {
		return -1;
	} });
parser.addKeyword("ordinal", "last", ordinal, { toSource: function toSource() {
		return -1;
	} });

// treat list as a stack or queue
//TESTME
parser.addKeyword("ordinal", "top", ordinal, { toSource: function toSource() {
		return 1;
	} });
parser.addKeyword("ordinal", "bottom", ordinal, { toSource: function toSource() {
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
parser.addExpression("position_expression", ["{identifier} {position:expression} of (the?) {expression}", "the {position:ordinal} {identifier} of (the?) {expression}"], function (_Rule$Expression) {
	_inherits(position_expression, _Rule$Expression);

	function position_expression() {
		_classCallCheck(this, position_expression);

		return _possibleConstructorReturn(this, (position_expression.__proto__ || Object.getPrototypeOf(position_expression)).apply(this, arguments));
	}

	_createClass(position_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource3 = this.getMatchedSource(context),
			    identifier = _getMatchedSource3.identifier,
			    position = _getMatchedSource3.position,
			    expression = _getMatchedSource3.expression;
			// TODO: special case 'words', 'lines', etc

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
parser.addExpression("random_position_expression", "a random {identifier} (of|from|in) (the)? {list:expression}", function (_Rule$Expression2) {
	_inherits(random_position_expression, _Rule$Expression2);

	function random_position_expression() {
		_classCallCheck(this, random_position_expression);

		return _possibleConstructorReturn(this, (random_position_expression.__proto__ || Object.getPrototypeOf(random_position_expression)).apply(this, arguments));
	}

	_createClass(random_position_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource4 = this.getMatchedSource(context),
			    list = _getMatchedSource4.list;

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
parser.addExpression("random_positions_expression", "{number} random {identifier} (of|from|in) (the)? {list:expression}", function (_Rule$Expression3) {
	_inherits(random_positions_expression, _Rule$Expression3);

	function random_positions_expression() {
		_classCallCheck(this, random_positions_expression);

		return _possibleConstructorReturn(this, (random_positions_expression.__proto__ || Object.getPrototypeOf(random_positions_expression)).apply(this, arguments));
	}

	_createClass(random_positions_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource5 = this.getMatchedSource(context),
			    number = _getMatchedSource5.number,
			    list = _getMatchedSource5.list;

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
parser.addExpression("range_expression", "{identifier} {start:expression} to {end:expression} of {list:expression}", function (_Rule$Expression4) {
	_inherits(range_expression, _Rule$Expression4);

	function range_expression() {
		_classCallCheck(this, range_expression);

		return _possibleConstructorReturn(this, (range_expression.__proto__ || Object.getPrototypeOf(range_expression)).apply(this, arguments));
	}

	_createClass(range_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource6 = this.getMatchedSource(context),
			    start = _getMatchedSource6.start,
			    end = _getMatchedSource6.end,
			    list = _getMatchedSource6.list;

			return "spell.getRange(" + list + ", " + start + ", " + end + ")";
		}
	}]);

	return range_expression;
}(_Rule2.default.Expression));

// Starting range expression.
// Returns a new list.
// e.g.	`first 4 items of list`
//TESTME
parser.addExpression("first_in_range", "first {number:expression} {identifier} (in|of) {list:expression}", function (_Rule$Expression5) {
	_inherits(range_expression, _Rule$Expression5);

	function range_expression() {
		_classCallCheck(this, range_expression);

		return _possibleConstructorReturn(this, (range_expression.__proto__ || Object.getPrototypeOf(range_expression)).apply(this, arguments));
	}

	_createClass(range_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource7 = this.getMatchedSource(context),
			    number = _getMatchedSource7.number,
			    list = _getMatchedSource7.list;

			return "spell.getRange(" + list + ", 1, " + number + ")";
		}
	}]);

	return range_expression;
}(_Rule2.default.Expression));

// Ending range expression.
// Returns a new list.
// e.g.	`last 4 items of list`
//TESTME
parser.addExpression("last_in_range", "last {number:expression} {identifier} (in|of) {list:expression}", function (_Rule$Expression6) {
	_inherits(range_expression, _Rule$Expression6);

	function range_expression() {
		_classCallCheck(this, range_expression);

		return _possibleConstructorReturn(this, (range_expression.__proto__ || Object.getPrototypeOf(range_expression)).apply(this, arguments));
	}

	_createClass(range_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource8 = this.getMatchedSource(context),
			    number = _getMatchedSource8.number,
			    list = _getMatchedSource8.list;

			return "spell.getEndRange(" + list + ", 1, " + number + ")";
		}
	}]);

	return range_expression;
}(_Rule2.default.Expression));

// Range expression starting at some item in the list.
// Returns a new list.
// If item is not found, returns an empty list. (???)
//TESTME
parser.addExpression("range_expression", "{identifier} (in|of) {list:expression} starting with {thing:expression}", function (_Rule$Expression7) {
	_inherits(range_expression, _Rule$Expression7);

	function range_expression() {
		_classCallCheck(this, range_expression);

		return _possibleConstructorReturn(this, (range_expression.__proto__ || Object.getPrototypeOf(range_expression)).apply(this, arguments));
	}

	_createClass(range_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource9 = this.getMatchedSource(context),
			    thing = _getMatchedSource9.thing,
			    list = _getMatchedSource9.list;

			return "spell.getRange(" + list + ", spell.positionOf(" + thing + ", " + list + "))";
		}
	}]);

	return range_expression;
}(_Rule2.default.Expression));

// List filter.
// NOTE: we will singularize `identifier` and use that as the argument to `expression`.
//TESTME
parser.addExpression("list_filter", "{identifier} (in|of) {list:expression} where {condition:expression}", function (_Rule$Expression8) {
	_inherits(list_filter, _Rule$Expression8);

	function list_filter() {
		_classCallCheck(this, list_filter);

		return _possibleConstructorReturn(this, (list_filter.__proto__ || Object.getPrototypeOf(list_filter)).apply(this, arguments));
	}

	_createClass(list_filter, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource10 = this.getMatchedSource(context),
			    identifier = _getMatchedSource10.identifier,
			    condition = _getMatchedSource10.condition,
			    list = _getMatchedSource10.list;
			// use singular of identifier for method argument


			var argument = (0, _string.singularize)(identifier.toSource(context));
			return "spell.filter(" + list + ", " + argument + " => " + condition + ")";
		}
	}]);

	return list_filter;
}(_Rule2.default.Expression));

// Set membership (left recursive).
// NOTE: we will singularize `identifier` and use that as the argument to `expression`.
//TESTME
parser.addExpression("list_membership_test", "{list:expression} (operator:has|has no|doesnt have|does not have) {identifier} where {filter:expression}", function (_Rule$Expression9) {
	_inherits(list_membership_test, _Rule$Expression9);

	function list_membership_test() {
		var _ref;

		var _temp, _this13, _ret;

		_classCallCheck(this, list_membership_test);

		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		return _ret = (_temp = (_this13 = _possibleConstructorReturn(this, (_ref = list_membership_test.__proto__ || Object.getPrototypeOf(list_membership_test)).call.apply(_ref, [this].concat(args))), _this13), _this13.testRule = new _Rule2.default.Match({ match: ["where"] }), _temp), _possibleConstructorReturn(_this13, _ret);
	}
	// Add test rule for quicker processing


	_createClass(list_membership_test, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource11 = this.getMatchedSource(context),
			    identifier = _getMatchedSource11.identifier,
			    operator = _getMatchedSource11.operator,
			    filter = _getMatchedSource11.filter,
			    list = _getMatchedSource11.list;

			var bang = operator === "has" ? "" : "!";
			// use singular of identifier for method argument
			var argument = (0, _string.singularize)(identifier.toSource(context));
			return bang + "spell.any(" + list + ", " + argument + " => " + filter + ")";
		}
	}]);

	return list_membership_test;
}(_Rule2.default.Expression));

//
//	Adding to list (in-place)
//

// Add to end of list.
//TESTME
parser.addStatement("list_append", ["append {thing:expression} to {list:expression}", "add {thing:expression} to ((the?) end of)? {list:expression}"], function (_Rule$Statement) {
	_inherits(list_append, _Rule$Statement);

	function list_append() {
		_classCallCheck(this, list_append);

		return _possibleConstructorReturn(this, (list_append.__proto__ || Object.getPrototypeOf(list_append)).apply(this, arguments));
	}

	_createClass(list_append, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource12 = this.getMatchedSource(context),
			    thing = _getMatchedSource12.thing,
			    list = _getMatchedSource12.list;

			return "spell.append(" + list + ", " + thing + ")";
		}
	}]);

	return list_append;
}(_Rule2.default.Statement));

// Add to beginning of list.
//TESTME
parser.addStatement("list_prepend", ["prepend {thing:expression} to {list:expression}",
//"top" as stack === bottom?
"add {thing:expression} to the (start|front|top) of {list:expression}"], function (_Rule$Statement2) {
	_inherits(list_prepend, _Rule$Statement2);

	function list_prepend() {
		_classCallCheck(this, list_prepend);

		return _possibleConstructorReturn(this, (list_prepend.__proto__ || Object.getPrototypeOf(list_prepend)).apply(this, arguments));
	}

	_createClass(list_prepend, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource13 = this.getMatchedSource(context),
			    thing = _getMatchedSource13.thing,
			    list = _getMatchedSource13.list;

			return "spell.prepend(" + list + ", " + thing + ")";
		}
	}]);

	return list_prepend;
}(_Rule2.default.Statement));

// Add to middle of list, pushing existing items out of the way.
//TESTME
parser.addStatement("list_add_at", "add {thing:expression} to {list:expression} at position {position:expression}", function (_Rule$Statement3) {
	_inherits(list_splice, _Rule$Statement3);

	function list_splice() {
		_classCallCheck(this, list_splice);

		return _possibleConstructorReturn(this, (list_splice.__proto__ || Object.getPrototypeOf(list_splice)).apply(this, arguments));
	}

	_createClass(list_splice, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource14 = this.getMatchedSource(context),
			    thing = _getMatchedSource14.thing,
			    position = _getMatchedSource14.position,
			    list = _getMatchedSource14.list;

			return "spell.splice(" + list + ", " + position + ", " + thing + ")";
		}
	}]);

	return list_splice;
}(_Rule2.default.Statement));

// TODO:  	"add {thing:expression} to {list:expression} before {item:expression}",

// Add to middle of list, pushing existing items out of the way.
//TESTME
parser.addStatement("list_add_after", "add {thing:expression} to {list:expression} after {item:expression}", function (_Rule$Statement4) {
	_inherits(list_add_after, _Rule$Statement4);

	function list_add_after() {
		_classCallCheck(this, list_add_after);

		return _possibleConstructorReturn(this, (list_add_after.__proto__ || Object.getPrototypeOf(list_add_after)).apply(this, arguments));
	}

	_createClass(list_add_after, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource15 = this.getMatchedSource(context),
			    thing = _getMatchedSource15.thing,
			    item = _getMatchedSource15.item,
			    list = _getMatchedSource15.list;

			return "spell.splice(" + list + ", spell.positionOf(" + list + ", " + item + "), " + thing + ")";
		}
	}]);

	return list_add_after;
}(_Rule2.default.Statement));

//
//	Removing from list (in-place)
//

// Empty list.
//TODO: make `empty` and/or `clear` a generic statement???
//TESTME
parser.addStatement("list_empty", "(empty|clear) {list:expression}", function (_Rule$Expression10) {
	_inherits(list_empty, _Rule$Expression10);

	function list_empty() {
		_classCallCheck(this, list_empty);

		return _possibleConstructorReturn(this, (list_empty.__proto__ || Object.getPrototypeOf(list_empty)).apply(this, arguments));
	}

	_createClass(list_empty, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource16 = this.getMatchedSource(context),
			    list = _getMatchedSource16.list;

			return "spell.clear(" + list + ")";
		}
	}]);

	return list_empty;
}(_Rule2.default.Expression));

// Remove one item from list by position.
//TESTME
parser.addStatement("list_remove_position", "remove {identifier} {number:expression} of {list:expression}", function (_Rule$Expression11) {
	_inherits(list_remove_position, _Rule$Expression11);

	function list_remove_position() {
		_classCallCheck(this, list_remove_position);

		return _possibleConstructorReturn(this, (list_remove_position.__proto__ || Object.getPrototypeOf(list_remove_position)).apply(this, arguments));
	}

	_createClass(list_remove_position, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource17 = this.getMatchedSource(context),
			    number = _getMatchedSource17.number,
			    list = _getMatchedSource17.list;

			return "spell.removeItem(" + list + ", " + number + ")";
		}
	}]);

	return list_remove_position;
}(_Rule2.default.Expression));

// Remove range of things from list.
// NOTE: `start` is **1-based**.
// NOTE: `end` is inclusive!
//TESTME
parser.addStatement("list_remove_range", "remove {identifier} {start:expression} to {end:expression} of {list:expression}", function (_Rule$Expression12) {
	_inherits(list_remove_position, _Rule$Expression12);

	function list_remove_position() {
		_classCallCheck(this, list_remove_position);

		return _possibleConstructorReturn(this, (list_remove_position.__proto__ || Object.getPrototypeOf(list_remove_position)).apply(this, arguments));
	}

	_createClass(list_remove_position, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource18 = this.getMatchedSource(context),
			    start = _getMatchedSource18.start,
			    end = _getMatchedSource18.end,
			    list = _getMatchedSource18.list;

			return "spell.removeRange(" + list + ", " + start + ", " + end + ")";
		}
	}]);

	return list_remove_position;
}(_Rule2.default.Expression));

// Remove all instances of something from a list.
//TESTME
parser.addStatement("list_remove", "remove {thing:expression} from {list:expression}", function (_Rule$Expression13) {
	_inherits(list_remove, _Rule$Expression13);

	function list_remove() {
		_classCallCheck(this, list_remove);

		return _possibleConstructorReturn(this, (list_remove.__proto__ || Object.getPrototypeOf(list_remove)).apply(this, arguments));
	}

	_createClass(list_remove, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource19 = this.getMatchedSource(context),
			    thing = _getMatchedSource19.thing,
			    list = _getMatchedSource19.list;

			return "spell.remove(" + list + ", " + thing + ")";
		}
	}]);

	return list_remove;
}(_Rule2.default.Expression));

// Remove all items from list where condition is true.
// NOTE: we will singularize `identifier` and use that as the argument to `expression`.
//TESTME
parser.addStatement("list_remove_where", "remove {identifier} (in|of|from) {list:expression} where {condition:expression}", function (_Rule$Expression14) {
	_inherits(list_remove_where, _Rule$Expression14);

	function list_remove_where() {
		_classCallCheck(this, list_remove_where);

		return _possibleConstructorReturn(this, (list_remove_where.__proto__ || Object.getPrototypeOf(list_remove_where)).apply(this, arguments));
	}

	_createClass(list_remove_where, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource20 = this.getMatchedSource(context),
			    identifier = _getMatchedSource20.identifier,
			    condition = _getMatchedSource20.condition,
			    list = _getMatchedSource20.list;
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
parser.addStatement("list_reverse", "reverse {list:expression}", function (_Rule$Expression15) {
	_inherits(list_reverse, _Rule$Expression15);

	function list_reverse() {
		_classCallCheck(this, list_reverse);

		return _possibleConstructorReturn(this, (list_reverse.__proto__ || Object.getPrototypeOf(list_reverse)).apply(this, arguments));
	}

	_createClass(list_reverse, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource21 = this.getMatchedSource(context),
			    list = _getMatchedSource21.list;

			return "spell.reverse(" + list + ")";
		}
	}]);

	return list_reverse;
}(_Rule2.default.Expression));

// Shuffle list in-place.
//TESTME
parser.addStatement("list_shuffle", "(randomize|shuffle) {list:expression}", function (_Rule$Expression16) {
	_inherits(list_shuffle, _Rule$Expression16);

	function list_shuffle() {
		_classCallCheck(this, list_shuffle);

		return _possibleConstructorReturn(this, (list_shuffle.__proto__ || Object.getPrototypeOf(list_shuffle)).apply(this, arguments));
	}

	_createClass(list_shuffle, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource22 = this.getMatchedSource(context),
			    list = _getMatchedSource22.list;

			return "spell.shuffle(" + list + ")";
		}
	}]);

	return list_shuffle;
}(_Rule2.default.Expression));

// Iteration
//TESTME
parser.addStatement("list_iteration", "for (each)? {itemVar:identifier}(?:(and|,) {positionVar:identifier})? in {list:expression}:?", function (_Rule$Statement5) {
	_inherits(list_iteration, _Rule$Statement5);

	function list_iteration() {
		_classCallCheck(this, list_iteration);

		return _possibleConstructorReturn(this, (list_iteration.__proto__ || Object.getPrototypeOf(list_iteration)).apply(this, arguments));
	}

	_createClass(list_iteration, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource23 = this.getMatchedSource(context),
			    itemVar = _getMatchedSource23.itemVar,
			    positionVar = _getMatchedSource23.positionVar,
			    list = _getMatchedSource23.list;

			if (positionVar) {
				return "for (let " + positionVar + " = 1; " + positionVar + " <= " + list + ".length; " + positionVar + "++) {\n" + ("\tlet " + itemVar + " = " + list + "[" + positionVar + "-1]");
			}
			return "for (let " + itemVar + " of " + list + ")";
		}
	}]);

	return list_iteration;
}(_Rule2.default.Statement));

// Range
//TESTME
parser.addExpression("range_expression", "range {start:expression} to {end:expression}", function (_Rule$Expression17) {
	_inherits(range_expression, _Rule$Expression17);

	function range_expression() {
		_classCallCheck(this, range_expression);

		return _possibleConstructorReturn(this, (range_expression.__proto__ || Object.getPrototypeOf(range_expression)).apply(this, arguments));
	}

	_createClass(range_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource24 = this.getMatchedSource(context),
			    start = _getMatchedSource24.start,
			    end = _getMatchedSource24.end;

			return "spell.getRange(" + start + ", " + end + ")";
		}
	}]);

	return range_expression;
}(_Rule2.default.Expression));

/***/ }),

/***/ 907:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(147);

var _Parser2 = _interopRequireDefault(_Parser);

var _RuleSyntax = __webpack_require__(456);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

__webpack_require__(901);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for infix and prefix operators.
//

// Create "operators" parser context.
var parser = _Parser2.default.forContext("operators");
exports.default = parser;

// Import core rules.

parser.import("core");

//## Infix operators:   `{lhs} <operator> {rhs}`, eg: `a is 1`
// NOTE: `operator.toJS` MUST return a function which transforms two arguments (`lhs` and `rhs`) into output.

// NOTE: `precedence` numbers come from Javascript equivalents
//		 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence

parser.addRule("infix_operator", function (_Rule$Alternatives) {
	_inherits(infix_operator, _Rule$Alternatives);

	function infix_operator() {
		_classCallCheck(this, infix_operator);

		return _possibleConstructorReturn(this, (infix_operator.__proto__ || Object.getPrototypeOf(infix_operator)).apply(this, arguments));
	}

	return infix_operator;
}(_RuleSyntax2.default.Alternatives));

// TODO:
// 	// Find best match according to operator precedence as defined below.
// 	getBestMatch(matches) {
// 		console.warn("GBM", matches, matches.map(match => match.precedence), matches.map(match => match.matchedText));
// 		return matches.reduce(function (best, next) {
// 			// take highest precedence match first
// 			if (next.precedence > best.precedence) return next;
// 			// take longest match if same precedence
// 			if (next.precedence === best.precedence) {
// 				if (next.endIndex > best.endIndex) return next;
// 			}
// 			return best;
// 		}, matches[0]);
// 	}


parser.addExpression("infix_operator_expression", "{lhs:expression} {operator:infix_operator} {rhs:expression}", function (_Rule$Expression) {
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

parser.addKeyword("infix_operator", "and", function (_Rule$Keyword) {
	_inherits(and, _Rule$Keyword);

	function and() {
		var _ref2;

		var _temp2, _this3, _ret2;

		_classCallCheck(this, and);

		for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
			args[_key2] = arguments[_key2];
		}

		return _ret2 = (_temp2 = (_this3 = _possibleConstructorReturn(this, (_ref2 = and.__proto__ || Object.getPrototypeOf(and)).call.apply(_ref2, [this].concat(args))), _this3), _this3.precedence = 6, _temp2), _possibleConstructorReturn(_this3, _ret2);
	}

	_createClass(and, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " && " + b + ")";
		}
	}]);

	return and;
}(_RuleSyntax2.default.Keyword));

parser.addKeyword("infix_operator", "or", function (_Rule$Keyword2) {
	_inherits(or, _Rule$Keyword2);

	function or() {
		var _ref3;

		var _temp3, _this4, _ret3;

		_classCallCheck(this, or);

		for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
			args[_key3] = arguments[_key3];
		}

		return _ret3 = (_temp3 = (_this4 = _possibleConstructorReturn(this, (_ref3 = or.__proto__ || Object.getPrototypeOf(or)).call.apply(_ref3, [this].concat(args))), _this4), _this4.precedence = 5, _temp3), _possibleConstructorReturn(_this4, _ret3);
	}

	_createClass(or, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " || " + b + ")";
		}
	}]);

	return or;
}(_RuleSyntax2.default.Keyword));

parser.addKeyword("infix_operator", "is", function (_Rule$Keyword3) {
	_inherits(is, _Rule$Keyword3);

	function is() {
		var _ref4;

		var _temp4, _this5, _ret4;

		_classCallCheck(this, is);

		for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
			args[_key4] = arguments[_key4];
		}

		return _ret4 = (_temp4 = (_this5 = _possibleConstructorReturn(this, (_ref4 = is.__proto__ || Object.getPrototypeOf(is)).call.apply(_ref4, [this].concat(args))), _this5), _this5.precedence = 10, _temp4), _possibleConstructorReturn(_this5, _ret4);
	}

	_createClass(is, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " == " + b + ")";
		}
	}]);

	return is;
}(_RuleSyntax2.default.Keyword));
parser.addKeyword("infix_operator", "is not", function (_Rule$Keyword4) {
	_inherits(is_not, _Rule$Keyword4);

	function is_not() {
		var _ref5;

		var _temp5, _this6, _ret5;

		_classCallCheck(this, is_not);

		for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
			args[_key5] = arguments[_key5];
		}

		return _ret5 = (_temp5 = (_this6 = _possibleConstructorReturn(this, (_ref5 = is_not.__proto__ || Object.getPrototypeOf(is_not)).call.apply(_ref5, [this].concat(args))), _this6), _this6.precedence = 10, _temp5), _possibleConstructorReturn(_this6, _ret5);
	}

	_createClass(is_not, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " != " + b + ")";
		}
	}]);

	return is_not;
}(_RuleSyntax2.default.Keyword));

parser.addKeyword("infix_operator", "is exactly", function (_Rule$Keyword5) {
	_inherits(is_exactly, _Rule$Keyword5);

	function is_exactly() {
		var _ref6;

		var _temp6, _this7, _ret6;

		_classCallCheck(this, is_exactly);

		for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
			args[_key6] = arguments[_key6];
		}

		return _ret6 = (_temp6 = (_this7 = _possibleConstructorReturn(this, (_ref6 = is_exactly.__proto__ || Object.getPrototypeOf(is_exactly)).call.apply(_ref6, [this].concat(args))), _this7), _this7.precedence = 10, _temp6), _possibleConstructorReturn(_this7, _ret6);
	}

	_createClass(is_exactly, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " === " + b + ")";
		}
	}]);

	return is_exactly;
}(_RuleSyntax2.default.Keyword));
parser.addKeyword("infix_operator", "is not exactly", function (_Rule$Keyword6) {
	_inherits(_class8, _Rule$Keyword6);

	function _class8() {
		var _ref7;

		var _temp7, _this8, _ret7;

		_classCallCheck(this, _class8);

		for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
			args[_key7] = arguments[_key7];
		}

		return _ret7 = (_temp7 = (_this8 = _possibleConstructorReturn(this, (_ref7 = _class8.__proto__ || Object.getPrototypeOf(_class8)).call.apply(_ref7, [this].concat(args))), _this8), _this8.precedence = 10, _temp7), _possibleConstructorReturn(_this8, _ret7);
	}

	_createClass(_class8, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " !== " + b + ")";
		}
	}]);

	return _class8;
}(_RuleSyntax2.default.Keyword));

//TODO: `spell.isOfType(thing, type)`
//TODO: `is same type as` ?
parser.addKeyword("infix_operator", "is a", function (_Rule$Keyword7) {
	_inherits(is_a, _Rule$Keyword7);

	function is_a() {
		var _ref8;

		var _temp8, _this9, _ret8;

		_classCallCheck(this, is_a);

		for (var _len8 = arguments.length, args = Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
			args[_key8] = arguments[_key8];
		}

		return _ret8 = (_temp8 = (_this9 = _possibleConstructorReturn(this, (_ref8 = is_a.__proto__ || Object.getPrototypeOf(is_a)).call.apply(_ref8, [this].concat(args))), _this9), _this9.precedence = 11, _temp8), _possibleConstructorReturn(_this9, _ret8);
	}

	_createClass(is_a, [{
		key: "toJS",
		value: function toJS(thing, type) {
			return "spell.isOfType(" + thing + ", '" + type + "')";
		}
	}]);

	return is_a;
}(_RuleSyntax2.default.Keyword));
parser.addKeyword("infix_operator", "is an", function (_Rule$Keyword8) {
	_inherits(is_an, _Rule$Keyword8);

	function is_an() {
		var _ref9;

		var _temp9, _this10, _ret9;

		_classCallCheck(this, is_an);

		for (var _len9 = arguments.length, args = Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
			args[_key9] = arguments[_key9];
		}

		return _ret9 = (_temp9 = (_this10 = _possibleConstructorReturn(this, (_ref9 = is_an.__proto__ || Object.getPrototypeOf(is_an)).call.apply(_ref9, [this].concat(args))), _this10), _this10.precedence = 11, _temp9), _possibleConstructorReturn(_this10, _ret9);
	}

	_createClass(is_an, [{
		key: "toJS",
		value: function toJS(thing, type) {
			return "spell.isOfType(" + thing + ", '" + type + "')";
		}
	}]);

	return is_an;
}(_RuleSyntax2.default.Keyword));

parser.addKeyword("infix_operator", "is not a", function (_Rule$Keyword9) {
	_inherits(is_not_a, _Rule$Keyword9);

	function is_not_a() {
		var _ref10;

		var _temp10, _this11, _ret10;

		_classCallCheck(this, is_not_a);

		for (var _len10 = arguments.length, args = Array(_len10), _key10 = 0; _key10 < _len10; _key10++) {
			args[_key10] = arguments[_key10];
		}

		return _ret10 = (_temp10 = (_this11 = _possibleConstructorReturn(this, (_ref10 = is_not_a.__proto__ || Object.getPrototypeOf(is_not_a)).call.apply(_ref10, [this].concat(args))), _this11), _this11.precedence = 11, _temp10), _possibleConstructorReturn(_this11, _ret10);
	}

	_createClass(is_not_a, [{
		key: "toJS",
		value: function toJS(thing, type) {
			return "!spell.isOfType(" + thing + ", '" + type + "')";
		}
	}]);

	return is_not_a;
}(_RuleSyntax2.default.Keyword));
parser.addKeyword("infix_operator", "is not an", function (_Rule$Keyword10) {
	_inherits(is_not_an, _Rule$Keyword10);

	function is_not_an() {
		var _ref11;

		var _temp11, _this12, _ret11;

		_classCallCheck(this, is_not_an);

		for (var _len11 = arguments.length, args = Array(_len11), _key11 = 0; _key11 < _len11; _key11++) {
			args[_key11] = arguments[_key11];
		}

		return _ret11 = (_temp11 = (_this12 = _possibleConstructorReturn(this, (_ref11 = is_not_an.__proto__ || Object.getPrototypeOf(is_not_an)).call.apply(_ref11, [this].concat(args))), _this12), _this12.precedence = 11, _temp11), _possibleConstructorReturn(_this12, _ret11);
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
parser.addKeyword("infix_operator", "is in", function (_Rule$Keyword11) {
	_inherits(is_in, _Rule$Keyword11);

	function is_in() {
		var _ref12;

		var _temp12, _this13, _ret12;

		_classCallCheck(this, is_in);

		for (var _len12 = arguments.length, args = Array(_len12), _key12 = 0; _key12 < _len12; _key12++) {
			args[_key12] = arguments[_key12];
		}

		return _ret12 = (_temp12 = (_this13 = _possibleConstructorReturn(this, (_ref12 = is_in.__proto__ || Object.getPrototypeOf(is_in)).call.apply(_ref12, [this].concat(args))), _this13), _this13.precedence = 11, _temp12), _possibleConstructorReturn(_this13, _ret12);
	}

	_createClass(is_in, [{
		key: "toJS",
		value: function toJS(thing, list) {
			return list + ".includes(" + thing + ")";
		}
	}]);

	return is_in;
}(_RuleSyntax2.default.Keyword));
parser.addKeyword("infix_operator", "is one of", function (_Rule$Keyword12) {
	_inherits(is_one_of, _Rule$Keyword12);

	function is_one_of() {
		var _ref13;

		var _temp13, _this14, _ret13;

		_classCallCheck(this, is_one_of);

		for (var _len13 = arguments.length, args = Array(_len13), _key13 = 0; _key13 < _len13; _key13++) {
			args[_key13] = arguments[_key13];
		}

		return _ret13 = (_temp13 = (_this14 = _possibleConstructorReturn(this, (_ref13 = is_one_of.__proto__ || Object.getPrototypeOf(is_one_of)).call.apply(_ref13, [this].concat(args))), _this14), _this14.precedence = 11, _temp13), _possibleConstructorReturn(_this14, _ret13);
	}

	_createClass(is_one_of, [{
		key: "toJS",
		value: function toJS(thing, list) {
			return list + ".includes(" + thing + ")";
		}
	}]);

	return is_one_of;
}(_RuleSyntax2.default.Keyword));

parser.addKeyword("infix_operator", "is not in", function (_Rule$Keyword13) {
	_inherits(is_not_in, _Rule$Keyword13);

	function is_not_in() {
		var _ref14;

		var _temp14, _this15, _ret14;

		_classCallCheck(this, is_not_in);

		for (var _len14 = arguments.length, args = Array(_len14), _key14 = 0; _key14 < _len14; _key14++) {
			args[_key14] = arguments[_key14];
		}

		return _ret14 = (_temp14 = (_this15 = _possibleConstructorReturn(this, (_ref14 = is_not_in.__proto__ || Object.getPrototypeOf(is_not_in)).call.apply(_ref14, [this].concat(args))), _this15), _this15.precedence = 11, _temp14), _possibleConstructorReturn(_this15, _ret14);
	}

	_createClass(is_not_in, [{
		key: "toJS",
		value: function toJS(thing, list) {
			return "!" + list + ".includes(" + thing + ")";
		}
	}]);

	return is_not_in;
}(_RuleSyntax2.default.Keyword));
parser.addKeyword("infix_operator", "is not one of", function (_Rule$Keyword14) {
	_inherits(is_not_one_of, _Rule$Keyword14);

	function is_not_one_of() {
		var _ref15;

		var _temp15, _this16, _ret15;

		_classCallCheck(this, is_not_one_of);

		for (var _len15 = arguments.length, args = Array(_len15), _key15 = 0; _key15 < _len15; _key15++) {
			args[_key15] = arguments[_key15];
		}

		return _ret15 = (_temp15 = (_this16 = _possibleConstructorReturn(this, (_ref15 = is_not_one_of.__proto__ || Object.getPrototypeOf(is_not_one_of)).call.apply(_ref15, [this].concat(args))), _this16), _this16.precedence = 11, _temp15), _possibleConstructorReturn(_this16, _ret15);
	}

	_createClass(is_not_one_of, [{
		key: "toJS",
		value: function toJS(thing, list) {
			return "!" + list + ".includes(" + thing + ")";
		}
	}]);

	return is_not_one_of;
}(_RuleSyntax2.default.Keyword));

parser.addKeyword("infix_operator", "includes", function (_Rule$Keyword15) {
	_inherits(includes, _Rule$Keyword15);

	function includes() {
		var _ref16;

		var _temp16, _this17, _ret16;

		_classCallCheck(this, includes);

		for (var _len16 = arguments.length, args = Array(_len16), _key16 = 0; _key16 < _len16; _key16++) {
			args[_key16] = arguments[_key16];
		}

		return _ret16 = (_temp16 = (_this17 = _possibleConstructorReturn(this, (_ref16 = includes.__proto__ || Object.getPrototypeOf(includes)).call.apply(_ref16, [this].concat(args))), _this17), _this17.precedence = 11, _temp16), _possibleConstructorReturn(_this17, _ret16);
	}

	_createClass(includes, [{
		key: "toJS",
		value: function toJS(list, thing) {
			return list + ".includes(" + thing + ")";
		}
	}]);

	return includes;
}(_RuleSyntax2.default.Keyword));
parser.addKeyword("infix_operator", "contains", function (_Rule$Keyword16) {
	_inherits(contains, _Rule$Keyword16);

	function contains() {
		var _ref17;

		var _temp17, _this18, _ret17;

		_classCallCheck(this, contains);

		for (var _len17 = arguments.length, args = Array(_len17), _key17 = 0; _key17 < _len17; _key17++) {
			args[_key17] = arguments[_key17];
		}

		return _ret17 = (_temp17 = (_this18 = _possibleConstructorReturn(this, (_ref17 = contains.__proto__ || Object.getPrototypeOf(contains)).call.apply(_ref17, [this].concat(args))), _this18), _this18.precedence = 11, _temp17), _possibleConstructorReturn(_this18, _ret17);
	}

	_createClass(contains, [{
		key: "toJS",
		value: function toJS(list, thing) {
			return list + ".includes(" + thing + ")";
		}
	}]);

	return contains;
}(_RuleSyntax2.default.Keyword));

parser.addKeyword("infix_operator", "does not include", function (_Rule$Keyword17) {
	_inherits(does_not_include, _Rule$Keyword17);

	function does_not_include() {
		var _ref18;

		var _temp18, _this19, _ret18;

		_classCallCheck(this, does_not_include);

		for (var _len18 = arguments.length, args = Array(_len18), _key18 = 0; _key18 < _len18; _key18++) {
			args[_key18] = arguments[_key18];
		}

		return _ret18 = (_temp18 = (_this19 = _possibleConstructorReturn(this, (_ref18 = does_not_include.__proto__ || Object.getPrototypeOf(does_not_include)).call.apply(_ref18, [this].concat(args))), _this19), _this19.precedence = 11, _temp18), _possibleConstructorReturn(_this19, _ret18);
	}

	_createClass(does_not_include, [{
		key: "toJS",
		value: function toJS(list, thing) {
			return "!" + list + ".includes(" + thing + ")";
		}
	}]);

	return does_not_include;
}(_RuleSyntax2.default.Keyword));
parser.addKeyword("infix_operator", "does not contain", function (_Rule$Keyword18) {
	_inherits(does_not_contain, _Rule$Keyword18);

	function does_not_contain() {
		var _ref19;

		var _temp19, _this20, _ret19;

		_classCallCheck(this, does_not_contain);

		for (var _len19 = arguments.length, args = Array(_len19), _key19 = 0; _key19 < _len19; _key19++) {
			args[_key19] = arguments[_key19];
		}

		return _ret19 = (_temp19 = (_this20 = _possibleConstructorReturn(this, (_ref19 = does_not_contain.__proto__ || Object.getPrototypeOf(does_not_contain)).call.apply(_ref19, [this].concat(args))), _this20), _this20.precedence = 11, _temp19), _possibleConstructorReturn(_this20, _ret19);
	}

	_createClass(does_not_contain, [{
		key: "toJS",
		value: function toJS(list, thing) {
			return "!" + list + ".includes(" + thing + ")";
		}
	}]);

	return does_not_contain;
}(_RuleSyntax2.default.Keyword));

parser.addSymbol("infix_operator", ">", function (_Rule$Symbol) {
	_inherits(gt, _Rule$Symbol);

	function gt() {
		var _ref20;

		var _temp20, _this21, _ret20;

		_classCallCheck(this, gt);

		for (var _len20 = arguments.length, args = Array(_len20), _key20 = 0; _key20 < _len20; _key20++) {
			args[_key20] = arguments[_key20];
		}

		return _ret20 = (_temp20 = (_this21 = _possibleConstructorReturn(this, (_ref20 = gt.__proto__ || Object.getPrototypeOf(gt)).call.apply(_ref20, [this].concat(args))), _this21), _this21.precedence = 11, _temp20), _possibleConstructorReturn(_this21, _ret20);
	}

	_createClass(gt, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " > " + b + ")";
		}
	}]);

	return gt;
}(_RuleSyntax2.default.Symbol));
parser.addKeyword("infix_operator", "is greater than", function (_Rule$Keyword19) {
	_inherits(is_greater_than, _Rule$Keyword19);

	function is_greater_than() {
		var _ref21;

		var _temp21, _this22, _ret21;

		_classCallCheck(this, is_greater_than);

		for (var _len21 = arguments.length, args = Array(_len21), _key21 = 0; _key21 < _len21; _key21++) {
			args[_key21] = arguments[_key21];
		}

		return _ret21 = (_temp21 = (_this22 = _possibleConstructorReturn(this, (_ref21 = is_greater_than.__proto__ || Object.getPrototypeOf(is_greater_than)).call.apply(_ref21, [this].concat(args))), _this22), _this22.precedence = 11, _temp21), _possibleConstructorReturn(_this22, _ret21);
	}

	_createClass(is_greater_than, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " > " + b + ")";
		}
	}]);

	return is_greater_than;
}(_RuleSyntax2.default.Keyword));

parser.addSymbol("infix_operator", ">=", function (_Rule$Symbol2) {
	_inherits(gte, _Rule$Symbol2);

	function gte() {
		var _ref22;

		var _temp22, _this23, _ret22;

		_classCallCheck(this, gte);

		for (var _len22 = arguments.length, args = Array(_len22), _key22 = 0; _key22 < _len22; _key22++) {
			args[_key22] = arguments[_key22];
		}

		return _ret22 = (_temp22 = (_this23 = _possibleConstructorReturn(this, (_ref22 = gte.__proto__ || Object.getPrototypeOf(gte)).call.apply(_ref22, [this].concat(args))), _this23), _this23.precedence = 11, _temp22), _possibleConstructorReturn(_this23, _ret22);
	}

	_createClass(gte, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " >= " + b + ")";
		}
	}]);

	return gte;
}(_RuleSyntax2.default.Symbol));
parser.addKeyword("infix_operator", "is greater than or equal to", function (_Rule$Keyword20) {
	_inherits(is_gte, _Rule$Keyword20);

	function is_gte() {
		var _ref23;

		var _temp23, _this24, _ret23;

		_classCallCheck(this, is_gte);

		for (var _len23 = arguments.length, args = Array(_len23), _key23 = 0; _key23 < _len23; _key23++) {
			args[_key23] = arguments[_key23];
		}

		return _ret23 = (_temp23 = (_this24 = _possibleConstructorReturn(this, (_ref23 = is_gte.__proto__ || Object.getPrototypeOf(is_gte)).call.apply(_ref23, [this].concat(args))), _this24), _this24.precedence = 11, _temp23), _possibleConstructorReturn(_this24, _ret23);
	}

	_createClass(is_gte, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " >= " + b + ")";
		}
	}]);

	return is_gte;
}(_RuleSyntax2.default.Keyword));

parser.addSymbol("infix_operator", "<", function (_Rule$Symbol3) {
	_inherits(lt, _Rule$Symbol3);

	function lt() {
		var _ref24;

		var _temp24, _this25, _ret24;

		_classCallCheck(this, lt);

		for (var _len24 = arguments.length, args = Array(_len24), _key24 = 0; _key24 < _len24; _key24++) {
			args[_key24] = arguments[_key24];
		}

		return _ret24 = (_temp24 = (_this25 = _possibleConstructorReturn(this, (_ref24 = lt.__proto__ || Object.getPrototypeOf(lt)).call.apply(_ref24, [this].concat(args))), _this25), _this25.precedence = 11, _temp24), _possibleConstructorReturn(_this25, _ret24);
	}

	_createClass(lt, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " < " + b + ")";
		}
	}]);

	return lt;
}(_RuleSyntax2.default.Symbol));
parser.addKeyword("infix_operator", "is less than", function (_Rule$Keyword21) {
	_inherits(is_less_than, _Rule$Keyword21);

	function is_less_than() {
		var _ref25;

		var _temp25, _this26, _ret25;

		_classCallCheck(this, is_less_than);

		for (var _len25 = arguments.length, args = Array(_len25), _key25 = 0; _key25 < _len25; _key25++) {
			args[_key25] = arguments[_key25];
		}

		return _ret25 = (_temp25 = (_this26 = _possibleConstructorReturn(this, (_ref25 = is_less_than.__proto__ || Object.getPrototypeOf(is_less_than)).call.apply(_ref25, [this].concat(args))), _this26), _this26.precedence = 11, _temp25), _possibleConstructorReturn(_this26, _ret25);
	}

	_createClass(is_less_than, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " < " + b + ")";
		}
	}]);

	return is_less_than;
}(_RuleSyntax2.default.Keyword));

parser.addSymbol("infix_operator", "<=", function (_Rule$Symbol4) {
	_inherits(lte, _Rule$Symbol4);

	function lte() {
		var _ref26;

		var _temp26, _this27, _ret26;

		_classCallCheck(this, lte);

		for (var _len26 = arguments.length, args = Array(_len26), _key26 = 0; _key26 < _len26; _key26++) {
			args[_key26] = arguments[_key26];
		}

		return _ret26 = (_temp26 = (_this27 = _possibleConstructorReturn(this, (_ref26 = lte.__proto__ || Object.getPrototypeOf(lte)).call.apply(_ref26, [this].concat(args))), _this27), _this27.precedence = 11, _temp26), _possibleConstructorReturn(_this27, _ret26);
	}

	_createClass(lte, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " <= " + b + ")";
		}
	}]);

	return lte;
}(_RuleSyntax2.default.Symbol));
parser.addKeyword("infix_operator", "is less than or equal to", function (_Rule$Keyword22) {
	_inherits(is_lte, _Rule$Keyword22);

	function is_lte() {
		var _ref27;

		var _temp27, _this28, _ret27;

		_classCallCheck(this, is_lte);

		for (var _len27 = arguments.length, args = Array(_len27), _key27 = 0; _key27 < _len27; _key27++) {
			args[_key27] = arguments[_key27];
		}

		return _ret27 = (_temp27 = (_this28 = _possibleConstructorReturn(this, (_ref27 = is_lte.__proto__ || Object.getPrototypeOf(is_lte)).call.apply(_ref27, [this].concat(args))), _this28), _this28.precedence = 11, _temp27), _possibleConstructorReturn(_this28, _ret27);
	}

	_createClass(is_lte, [{
		key: "toJS",
		value: function toJS(a, b) {
			return "(" + a + " <= " + b + ")";
		}
	}]);

	return is_lte;
}(_RuleSyntax2.default.Keyword));

parser.addSymbol("infix_operator", "\\+", function (_Rule$Symbol5) {
	_inherits(plus, _Rule$Symbol5);

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
}(_RuleSyntax2.default.Symbol));
parser.addKeyword("infix_operator", "plus", function (_Rule$Keyword23) {
	_inherits(plus, _Rule$Keyword23);

	function plus() {
		var _ref29;

		var _temp29, _this30, _ret29;

		_classCallCheck(this, plus);

		for (var _len29 = arguments.length, args = Array(_len29), _key29 = 0; _key29 < _len29; _key29++) {
			args[_key29] = arguments[_key29];
		}

		return _ret29 = (_temp29 = (_this30 = _possibleConstructorReturn(this, (_ref29 = plus.__proto__ || Object.getPrototypeOf(plus)).call.apply(_ref29, [this].concat(args))), _this30), _this30.precedence = 13, _temp29), _possibleConstructorReturn(_this30, _ret29);
	}

	_createClass(plus, [{
		key: "toJS",
		value: function toJS(a, b) {
			return a + " + " + b;
		}
	}]);

	return plus;
}(_RuleSyntax2.default.Keyword));

parser.addSymbol("infix_operator", "-", function (_Rule$Symbol6) {
	_inherits(minus, _Rule$Symbol6);

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
}(_RuleSyntax2.default.Symbol));
parser.addKeyword("infix_operator", "minus", function (_Rule$Keyword24) {
	_inherits(minus, _Rule$Keyword24);

	function minus() {
		var _ref31;

		var _temp31, _this32, _ret31;

		_classCallCheck(this, minus);

		for (var _len31 = arguments.length, args = Array(_len31), _key31 = 0; _key31 < _len31; _key31++) {
			args[_key31] = arguments[_key31];
		}

		return _ret31 = (_temp31 = (_this32 = _possibleConstructorReturn(this, (_ref31 = minus.__proto__ || Object.getPrototypeOf(minus)).call.apply(_ref31, [this].concat(args))), _this32), _this32.precedence = 13, _temp31), _possibleConstructorReturn(_this32, _ret31);
	}

	_createClass(minus, [{
		key: "toJS",
		value: function toJS(a, b) {
			return a + " - " + b;
		}
	}]);

	return minus;
}(_RuleSyntax2.default.Keyword));

parser.addSymbol("infix_operator", "\\*", function (_Rule$Symbol7) {
	_inherits(times, _Rule$Symbol7);

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
}(_RuleSyntax2.default.Symbol));
parser.addKeyword("infix_operator", "times", function (_Rule$Keyword25) {
	_inherits(times, _Rule$Keyword25);

	function times() {
		var _ref33;

		var _temp33, _this34, _ret33;

		_classCallCheck(this, times);

		for (var _len33 = arguments.length, args = Array(_len33), _key33 = 0; _key33 < _len33; _key33++) {
			args[_key33] = arguments[_key33];
		}

		return _ret33 = (_temp33 = (_this34 = _possibleConstructorReturn(this, (_ref33 = times.__proto__ || Object.getPrototypeOf(times)).call.apply(_ref33, [this].concat(args))), _this34), _this34.precedence = 14, _temp33), _possibleConstructorReturn(_this34, _ret33);
	}

	_createClass(times, [{
		key: "toJS",
		value: function toJS(a, b) {
			return a + " * " + b;
		}
	}]);

	return times;
}(_RuleSyntax2.default.Keyword));

parser.addSymbol("infix_operator", "/", function (_Rule$Symbol8) {
	_inherits(divided_by, _Rule$Symbol8);

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
}(_RuleSyntax2.default.Symbol));
parser.addKeyword("infix_operator", "divided by", function (_Rule$Keyword26) {
	_inherits(divided_by, _Rule$Keyword26);

	function divided_by() {
		var _ref35;

		var _temp35, _this36, _ret35;

		_classCallCheck(this, divided_by);

		for (var _len35 = arguments.length, args = Array(_len35), _key35 = 0; _key35 < _len35; _key35++) {
			args[_key35] = arguments[_key35];
		}

		return _ret35 = (_temp35 = (_this36 = _possibleConstructorReturn(this, (_ref35 = divided_by.__proto__ || Object.getPrototypeOf(divided_by)).call.apply(_ref35, [this].concat(args))), _this36), _this36.precedence = 14, _temp35), _possibleConstructorReturn(_this36, _ret35);
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


//
//
//## Postifx operators:   `{lhs} <operator>`, e.g. `a is defined`
// NOTE: `operator.toJS` MUST return a function which transforms argument (`lhs`) into JS output.

parser.addRule("postfix_operator", function (_Rule$Alternatives2) {
	_inherits(postfix_operator, _Rule$Alternatives2);

	function postfix_operator() {
		_classCallCheck(this, postfix_operator);

		return _possibleConstructorReturn(this, (postfix_operator.__proto__ || Object.getPrototypeOf(postfix_operator)).apply(this, arguments));
	}

	return postfix_operator;
}(_RuleSyntax2.default.Alternatives));

parser.addExpression("postfix_operator_expression", "{expression} {operator:postfix_operator}", function (_Rule$Expression2) {
	_inherits(postfix_operator_expresion, _Rule$Expression2);

	function postfix_operator_expresion() {
		var _ref36;

		var _temp36, _this38, _ret36;

		_classCallCheck(this, postfix_operator_expresion);

		for (var _len36 = arguments.length, args = Array(_len36), _key36 = 0; _key36 < _len36; _key36++) {
			args[_key36] = arguments[_key36];
		}

		return _ret36 = (_temp36 = (_this38 = _possibleConstructorReturn(this, (_ref36 = postfix_operator_expresion.__proto__ || Object.getPrototypeOf(postfix_operator_expresion)).call.apply(_ref36, [this].concat(args))), _this38), _this38.testRule = "postfix_operator", _temp36), _possibleConstructorReturn(_this38, _ret36);
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

parser.addKeyword("postfix_operator", "is defined", function (_Rule$Keyword27) {
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
parser.addKeyword("postfix_operator", "is not defined", function (_Rule$Keyword28) {
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
parser.addKeyword("postfix_operator", "is undefined", function (_Rule$Keyword29) {
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
parser.addKeyword("postfix_operator", "is empty", function (_Rule$Keyword30) {
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
parser.addKeyword("postfix_operator", "is not empty", function (_Rule$Keyword31) {
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

/***/ }),

/***/ 908:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(147);

var _Parser2 = _interopRequireDefault(_Parser);

var _RuleSyntax = __webpack_require__(456);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

__webpack_require__(901);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for creating variables, property access, etc
//

// Create "statements" parser context.
var parser = _Parser2.default.forContext("statements");
exports.default = parser;

// Import core rules.

parser.import("core");

//
//	## Returns
//

// Return a value
//TESTME
parser.addStatement("return_statement", "return {expression}", function (_Rule$Statement) {
	_inherits(return_statement, _Rule$Statement);

	function return_statement() {
		_classCallCheck(this, return_statement);

		return _possibleConstructorReturn(this, (return_statement.__proto__ || Object.getPrototypeOf(return_statement)).apply(this, arguments));
	}

	_createClass(return_statement, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource = this.getMatchedSource(context),
			    expression = _getMatchedSource.expression;

			return "return " + expression;
		}
	}]);

	return return_statement;
}(_RuleSyntax2.default.Statement));

//
//	## Assignment
//

//TESTME
parser.addStatement("assignment", ["{thing:expression} = {value:expression}", "set {thing:expression} to {value:expression}", "put {value:expression} into {thing:expression}"], function (_Rule$Statement2) {
	_inherits(assignment, _Rule$Statement2);

	function assignment() {
		_classCallCheck(this, assignment);

		return _possibleConstructorReturn(this, (assignment.__proto__ || Object.getPrototypeOf(assignment)).apply(this, arguments));
	}

	_createClass(assignment, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource2 = this.getMatchedSource(context),
			    thing = _getMatchedSource2.thing,
			    value = _getMatchedSource2.value;
			// TODO: declare identifier if not in scope, etc


			return thing + " = " + value;
		}
	}]);

	return assignment;
}(_RuleSyntax2.default.Statement));

//TESTME
parser.addStatement("get_expression", "get {value:expression}", function (_Rule$Statement3) {
	_inherits(get_expression, _Rule$Statement3);

	function get_expression() {
		_classCallCheck(this, get_expression);

		return _possibleConstructorReturn(this, (get_expression.__proto__ || Object.getPrototypeOf(get_expression)).apply(this, arguments));
	}

	_createClass(get_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource3 = this.getMatchedSource(context),
			    value = _getMatchedSource3.value;

			;
			return "it = " + value;
		}
	}]);

	return get_expression;
}(_RuleSyntax2.default.Statement));

//
//	## User interaction
// TODO: move into another file
//

// Alert a message.
// TODO: need some fancy promise juju here?
//TESTME
parser.addStatement("alert", "alert {message:expression} (?:with {okButton:text})?", function (_Rule$Statement4) {
	_inherits(alert, _Rule$Statement4);

	function alert() {
		_classCallCheck(this, alert);

		return _possibleConstructorReturn(this, (alert.__proto__ || Object.getPrototypeOf(alert)).apply(this, arguments));
	}

	_createClass(alert, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource4 = this.getMatchedSource(context),
			    message = _getMatchedSource4.message,
			    _getMatchedSource4$ok = _getMatchedSource4.okButton,
			    okButton = _getMatchedSource4$ok === undefined ? "\"OK\"" : _getMatchedSource4$ok;

			return "await spell.alert(" + message + ", " + okButton + ")";
		}
	}]);

	return alert;
}(_RuleSyntax2.default.Statement));

// Warning message -- like alert but fancier.
// TODO: need some fancy promise juju here?
//TESTME
parser.addStatement("warn", "warn {expression:expression} (?:with {okButton:text})?", function (_Rule$Statement5) {
	_inherits(warn, _Rule$Statement5);

	function warn() {
		_classCallCheck(this, warn);

		return _possibleConstructorReturn(this, (warn.__proto__ || Object.getPrototypeOf(warn)).apply(this, arguments));
	}

	_createClass(warn, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource5 = this.getMatchedSource(context),
			    message = _getMatchedSource5.message,
			    _getMatchedSource5$ok = _getMatchedSource5.okButton,
			    okButton = _getMatchedSource5$ok === undefined ? "\"OK\"" : _getMatchedSource5$ok;

			return "await spell.warn(" + message + ", " + okButton + ")";
		}
	}]);

	return warn;
}(_RuleSyntax2.default.Statement));

// Confirm message -- present a question with two answers.
// TODO: need some fancy promise juju here?
//TESTME
parser.addStatement("confirm", "confirm {message:expression} (?:with {okButton:text} (?: (and|or) {cancelButton:text})? )?", function (_Rule$Statement6) {
	_inherits(confirm, _Rule$Statement6);

	function confirm() {
		_classCallCheck(this, confirm);

		return _possibleConstructorReturn(this, (confirm.__proto__ || Object.getPrototypeOf(confirm)).apply(this, arguments));
	}

	_createClass(confirm, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource6 = this.getMatchedSource(context),
			    message = _getMatchedSource6.message,
			    _getMatchedSource6$ok = _getMatchedSource6.okButton,
			    okButton = _getMatchedSource6$ok === undefined ? "\"OK\"" : _getMatchedSource6$ok,
			    _getMatchedSource6$ca = _getMatchedSource6.cancelButton,
			    cancelButton = _getMatchedSource6$ca === undefined ? "\"Cancel\"" : _getMatchedSource6$ca;

			return "await spell.confirm(" + message + ", " + okButton + ", " + cancelButton + ")";
		}
	}]);

	return confirm;
}(_RuleSyntax2.default.Statement));

/***/ }),

/***/ 909:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(147);

var _Parser2 = _interopRequireDefault(_Parser);

var _RuleSyntax = __webpack_require__(456);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _global = __webpack_require__(462);

var _global2 = _interopRequireDefault(_global);

var _string = __webpack_require__(902);

__webpack_require__(901);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } //
//	# Rules for defining classes (known as `types`)
//

// TODO: mixins / traits / composed classes / annotations

// Create "types" parser context.
var parser = _Parser2.default.forContext("types");
exports.default = parser;

// Import core rules.

parser.import("core");

// Define "type" (a.k.a. "class").
parser.addStatement("define_type", "define type {type} (?:as (a|an) {superType:type})?", function (_Rule$Statement) {
	_inherits(define_type, _Rule$Statement);

	function define_type() {
		_classCallCheck(this, define_type);

		return _possibleConstructorReturn(this, (define_type.__proto__ || Object.getPrototypeOf(define_type)).apply(this, arguments));
	}

	_createClass(define_type, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource = this.getMatchedSource(context),
			    type = _getMatchedSource.type,
			    superType = _getMatchedSource.superType;

			if (superType) {
				return "class " + type + " extends " + superType;
			}
			return "class " + type;
		}
	}]);

	return define_type;
}(_RuleSyntax2.default.Statement));

// Properties clause: creates an object with one or more property values.
//	`foo = 1, bar = 2`
//TODO: would like to use `and` but that will barf on expressions...
//TODO: how to do properties on multiple lines?
parser.addList("object_literal_properties", "[({key:identifier}(?:= {value:expression})?) ,]", function (_Rule$List) {
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
				    key = _prop$results.key,
				    value = _prop$results.value;

				key = key.toSource(context);
				value = value && value.toSource(context);
				if (value) return "\"" + key + "\": " + value;
				return key;
			});
			return "{ " + props.join(", ") + " }";
		}
	}]);

	return object_literal_properties;
}(_RuleSyntax2.default.List));

// `new` or `create`
// This works as an expression OR a statement.
// NOTE: we assume that all types take an object of properties????
parser.addSequence(["expression", "statement"], "(create|new) {type} (?:with {props:object_literal_properties})?", function (_Rule$Sequence) {
	_inherits(new_thing, _Rule$Sequence);

	function new_thing() {
		_classCallCheck(this, new_thing);

		return _possibleConstructorReturn(this, (new_thing.__proto__ || Object.getPrototypeOf(new_thing)).apply(this, arguments));
	}

	_createClass(new_thing, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource2 = this.getMatchedSource(context),
			    type = _getMatchedSource2.type,
			    _getMatchedSource2$pr = _getMatchedSource2.props,
			    props = _getMatchedSource2$pr === undefined ? "" : _getMatchedSource2$pr;
			// Special case for object, which we'll create with an object literal.


			if (type === "Object") {
				if (!props) return "{}";
				return props;
			}

			return "new " + type + "(" + props + ")";
		}
	}]);

	return new_thing;
}(_RuleSyntax2.default.Sequence));

//TODO: constructor


//MOVE TO `functions`?
// Arguments clause for methods
//	`with foo` or `with foo and bar and baz`
//TODO: {identifier} = {expression}	=> requires `,` instead of `and`
//TODO: `with foo as Type`
//TODO:	`with foo...` for splat?
parser.addSequence("args", "with [args:{identifier} ,]", function (_Rule$Sequence2) {
	_inherits(args, _Rule$Sequence2);

	function args() {
		_classCallCheck(this, args);

		return _possibleConstructorReturn(this, (args.__proto__ || Object.getPrototypeOf(args)).apply(this, arguments));
	}

	_createClass(args, [{
		key: "toSource",

		// Returns an array of argument values
		value: function toSource(context) {
			return this.results.args.matched.map(function (arg) {
				return arg.matched;
			});
		}
	}]);

	return args;
}(_RuleSyntax2.default.Sequence));

// Declare instance method or normal function.
parser.addStatement("declare_method", "(to|on) {identifier} {args}? (\\:)? {statement}?", function (_Rule$Statement2) {
	_inherits(declare_method, _Rule$Statement2);

	function declare_method() {
		_classCallCheck(this, declare_method);

		return _possibleConstructorReturn(this, (declare_method.__proto__ || Object.getPrototypeOf(declare_method)).apply(this, arguments));
	}

	_createClass(declare_method, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource3 = this.getMatchedSource(context),
			    identifier = _getMatchedSource3.identifier,
			    args = _getMatchedSource3.args,
			    statement = _getMatchedSource3.statement;

			args = Array.isArray(args) ? args.join(", ") : "";
			if (!statement) {
				return identifier + "(" + args + ")";
			} else {
				this.opensBlock = true;
				this.closesBlock = true;
				return identifier + "(" + args + ") { " + statement + " }";
			}
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
parser.addStatement("declare_action", "action (keywords:{word}|{type})+ (\\:)? {statement}?", function (_Rule$Statement3) {
	_inherits(declare_action, _Rule$Statement3);

	function declare_action() {
		_classCallCheck(this, declare_action);

		return _possibleConstructorReturn(this, (declare_action.__proto__ || Object.getPrototypeOf(declare_action)).apply(this, arguments));
	}

	_createClass(declare_action, [{
		key: "toSource",
		value: function toSource(context) {
			var _results = this.results,
			    keywords = _results.keywords,
			    statement = _results.statement;

			var words = keywords.matched.map(function (word) {
				return word.toSource(context);
			});
			// if there's only one word, it can't be a blacklisted identifier or a type
			if (words.length === 1) {
				var word = words[0];
				if (keywords.matched instanceof _RuleSyntax2.default.Type) {
					throw new SyntaxError("parse('declare_action'): one-word actions may not be types: " + word);
				}

				console.warn("FIXME: parser.rules.identifier");
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
			keywords.matched.map(function (item, index) {
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
				this.opensBlock = true;
				this.closesBlock = true;
			} else if (conditions.length) {
				statements = " {\n" + conditions.join("\n");
				this.opensBlock = true;
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
parser.addStatement("getter", "get {identifier} {args}? (\\:)? {expression}?", function (_Rule$Statement4) {
	_inherits(getter, _Rule$Statement4);

	function getter() {
		_classCallCheck(this, getter);

		return _possibleConstructorReturn(this, (getter.__proto__ || Object.getPrototypeOf(getter)).apply(this, arguments));
	}

	_createClass(getter, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource4 = this.getMatchedSource(context),
			    identifier = _getMatchedSource4.identifier,
			    args = _getMatchedSource4.args,
			    expression = _getMatchedSource4.expression;

			args = Array.isArray(args) ? args.join(", ") : "";

			if (args && expression) {
				this.opensBlock = true;
				this.closesBlock = true;
				return identifier + "(" + args + ") { return (" + expression + ") }";
			} else if (args) {
				return identifier + "(" + args + ")";
			} else if (expression) {
				this.opensBlock = true;
				this.closesBlock = true;
				return "get " + identifier + "() { return (" + expression + ") }";
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
parser.addStatement("setter", "set {identifier} {args}? (\\:)? {statement}?", function (_Rule$Statement5) {
	_inherits(setter, _Rule$Statement5);

	function setter() {
		_classCallCheck(this, setter);

		return _possibleConstructorReturn(this, (setter.__proto__ || Object.getPrototypeOf(setter)).apply(this, arguments));
	}

	_createClass(setter, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource5 = this.getMatchedSource(context),
			    identifier = _getMatchedSource5.identifier,
			    _getMatchedSource5$ar = _getMatchedSource5.args,
			    args = _getMatchedSource5$ar === undefined ? [identifier] : _getMatchedSource5$ar,
			    _getMatchedSource5$st = _getMatchedSource5.statement,
			    statement = _getMatchedSource5$st === undefined ? "" : _getMatchedSource5$st;
			// Complain if more than one argument


			if (args && args.length > 1) {
				console.warn("parse('setter'): only one argument allowed in setter:  ", this.matchedText);
				args = [args[0]];
			}

			if (!statement) {
				return "set " + identifier + "(" + args + ")";
			} else {
				this.opensBlock = true;
				this.closesBlock = true;
				return "set " + identifier + "(" + args + ") { " + statement + " }";
			}
		}
	}]);

	return setter;
}(_RuleSyntax2.default.Statement));

//
//	declare properties
//

//TODO: another name for `constant` ?
parser.addStatement("declare_property", "(scope:property|constant|shared property) {identifier} (?:= {value:expression})?", function (_Rule$Statement6) {
	_inherits(declare_property, _Rule$Statement6);

	function declare_property() {
		_classCallCheck(this, declare_property);

		return _possibleConstructorReturn(this, (declare_property.__proto__ || Object.getPrototypeOf(declare_property)).apply(this, arguments));
	}

	_createClass(declare_property, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource6 = this.getMatchedSource(context),
			    scope = _getMatchedSource6.scope,
			    identifier = _getMatchedSource6.identifier,
			    _getMatchedSource6$va = _getMatchedSource6.value,
			    value = _getMatchedSource6$va === undefined ? "" : _getMatchedSource6$va;

			if (value) value = " = " + value;

			var declaration = "" + identifier + value;
			switch (scope) {
				case "constant":
					if (!value) console.warn("parse('declare_property'): constant properties must declare a value:  ", this.matchedText);
					return "const " + declaration;

				case "shared property":
					return "@proto " + declaration;

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
parser.addStatement("declare_property_of_type", "property {identifier} as (a|an)? {type}", function (_Rule$Statement7) {
	_inherits(declare_property_of_type, _Rule$Statement7);

	function declare_property_of_type() {
		_classCallCheck(this, declare_property_of_type);

		return _possibleConstructorReturn(this, (declare_property_of_type.__proto__ || Object.getPrototypeOf(declare_property_of_type)).apply(this, arguments));
	}

	_createClass(declare_property_of_type, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource7 = this.getMatchedSource(context),
			    identifier = _getMatchedSource7.identifier,
			    type = _getMatchedSource7.type;

			return "get " + identifier + "() { return this.__" + identifier + " }\n" + ("set " + identifier + "(value) { if (spell.isA(value, " + type + ") this.__" + identifier + " = value }");
		}
	}]);

	return declare_property_of_type;
}(_RuleSyntax2.default.Statement));

// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
parser.addStatement("declare_property_as_one_of", "property {identifier} as one of {list:literal_list}", function (_Rule$Statement8) {
	_inherits(declare_property_as_one_of, _Rule$Statement8);

	function declare_property_as_one_of() {
		_classCallCheck(this, declare_property_as_one_of);

		return _possibleConstructorReturn(this, (declare_property_as_one_of.__proto__ || Object.getPrototypeOf(declare_property_as_one_of)).apply(this, arguments));
	}

	_createClass(declare_property_as_one_of, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource8 = this.getMatchedSource(context),
			    identifier = _getMatchedSource8.identifier,
			    list = _getMatchedSource8.list;

			var plural = (0, _string.pluralize)(identifier);
			return "@proto " + plural + " = " + list + "\n" + ("get " + identifier + "() { return this.__" + identifier + " === undefined ? this." + plural + "[0] : this.__" + identifier + " }\n") + ("set " + identifier + "(value) { if (this." + plural + ".includes(value)) this.__" + identifier + " = value }");

			// MORE EFFICIENT BUT UGLIER
			// 			return `static ${plural} = ${list};\n`
			// 				 + `get ${identifier} { return ("__${identifier}" in this ? this.__${identifier} : ${firstValue}) }\n`
			// 				 + `set ${identifier}(value) { if (this.constructor.${plural}.includes(value)) this.__${identifier} = value }`;
		}
	}]);

	return declare_property_as_one_of;
}(_RuleSyntax2.default.Statement));

//
//	Self-reference
//
parser.addKeyword(["me", "expression"], "me", function (_Rule$Keyword) {
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

// TODO: this really makes me want to make `I am empty` etc work...
parser.addKeyword(["I", "expression"], "I", function (_Rule$Keyword2) {
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

//
//	Property access
//

parser.addExpression("property_expression", "(properties:the {identifier} of)+ the? {expression}", function (_Rule$Expression) {
	_inherits(property_expression, _Rule$Expression);

	function property_expression() {
		_classCallCheck(this, property_expression);

		return _possibleConstructorReturn(this, (property_expression.__proto__ || Object.getPrototypeOf(property_expression)).apply(this, arguments));
	}

	_createClass(property_expression, [{
		key: "getMatchedSource",
		value: function getMatchedSource(context) {
			var _results2 = this.results,
			    expression = _results2.expression,
			    properties = _results2.properties;

			return {
				expression: expression.toSource(context),
				properties: properties.matched.map(function (property) {
					return property.results.identifier.toSource(context);
				})
			};
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource9 = this.getMatchedSource(context),
			    expression = _getMatchedSource9.expression,
			    properties = _getMatchedSource9.properties;

			properties = properties.reverse().join(".");
			return expression + "." + properties;
			// NOTE: the following is safer, but ugly for demo purposes
			//			return `spell.get(${expression}, ['${properties}'])`;
		}
	}]);

	return property_expression;
}(_RuleSyntax2.default.Expression));

parser.addExpression("my_property_expression", "(my|this) {identifier}", function (_Rule$Expression2) {
	_inherits(my_property_expression, _Rule$Expression2);

	function my_property_expression() {
		_classCallCheck(this, my_property_expression);

		return _possibleConstructorReturn(this, (my_property_expression.__proto__ || Object.getPrototypeOf(my_property_expression)).apply(this, arguments));
	}

	_createClass(my_property_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource10 = this.getMatchedSource(context),
			    identifier = _getMatchedSource10.identifier;

			return "this." + identifier;
		}
	}]);

	return my_property_expression;
}(_RuleSyntax2.default.Expression));

/***/ }),

/***/ 99:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return modifiers; });
/* harmony export (immutable) */ __webpack_exports__["b"] = allKeys;
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

// TODO: Need better, more complete, and more methodical key definitions

var Keys = {
  backspace: 8,
  del: 46,
  delete: 46,
  tab: 9,
  enter: 13,
  'return': 13,
  esc: 27,
  space: 32,
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  ';': 186,
  '=': 187,
  ',': 188,
  '-': 189,
  '.': 190,
  '/': 191,
  '`': 192,
  '[': 219,
  '\\': 220,
  ']': 221
};

// Add uppercase versions of keys above for backwards compatibility
Object.keys(Keys).forEach(function (key) {
  return Keys[key.toUpperCase()] = Keys[key];
});

'0123456789'.split('').forEach(function (num, index) {
  return Keys[num] = index + 48;
});

'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (letter, index) {
  Keys[letter] = index + 65;
  Keys[letter.toLowerCase()] = index + 65;
});

// fn keys
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach(function (item, index) {
  return Keys['f' + index] = 111 + index;
});

var modifiers = {
  control: 'ctrl',
  ctrl: 'ctrl',
  shift: 'shift',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  option: 'alt',
  alt: 'alt'
};

function allKeys(arg) {
  return arg ? arg.constructor === Symbol || (typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'symbol' : Symbol('allKeys');
}

/* harmony default export */ __webpack_exports__["a"] = Keys;

/***/ })

},[899]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvc3RvcmUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvfi9mYmpzL2xpYi9lbXB0eUZ1bmN0aW9uLmpzIiwid2VicGFjazovLy8uL34vcHJvcC10eXBlcy9+L2ZianMvbGliL2ludmFyaWFudC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVG9rZW5pemVyLmpzIiwid2VicGFjazovLy8uL34vY3NzLWxvYWRlci9saWIvY3NzLWJhc2UuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL2luZGV4LmpzIiwid2VicGFjazovLy8uL34vcHJvcC10eXBlcy9saWIvUmVhY3RQcm9wVHlwZXNTZWNyZXQuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvd2FybmluZy5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvZXZlbnRfaGFuZGxlcnMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9tYXRjaF9rZXlzLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvcGFyc2Vfa2V5cy5qcyIsIndlYnBhY2s6Ly8vLi9+L3N0eWxlLWxvYWRlci9hZGRTdHlsZXMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9TcGVsbEVkaXRvci5qc3giLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9SdWxlU3ludGF4LmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvRXhhbXBsZVN0b3JlLmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BhY2VyLmpzeCIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL1RhYmJhYmxlVGV4dEFyZWEuanN4Iiwid2VicGFjazovLy8uL3NyYy9hcHAvdXRpbC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvbWVtb2l6ZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMvZ2xvYmFsLmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BhY2VyLmxlc3MiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9zdHlsZXMubGVzcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvY2hlY2tQcm9wVHlwZXMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL2ZhY3RvcnlXaXRoVGhyb3dpbmdTaGltcy5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvZmFjdG9yeVdpdGhUeXBlQ2hlY2tlcnMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvY2xhc3NfZGVjb3JhdG9yLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL2luZGV4LmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL21ldGhvZF9kZWNvcmF0b3IuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvbWV0aG9kX2RlY29yYXRvcl9zY29wZWQuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2luZGV4LmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvYXJyYXkuZnJvbS5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2RvbV9oZWxwZXJzLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvbGlzdGVuZXJzLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvdXVpZC5qcyIsIndlYnBhY2s6Ly8vLi9+L3N0eWxlLWxvYWRlci9maXhVcmxzLmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BhY2VyLmxlc3M/MjJhZSIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL3N0eWxlcy5sZXNzP2IwMTIiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9pbmRleC5qc3giLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NvcmUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3V0aWxzL3N0cmluZy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvSlNYLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9hbGwuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2lmLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9saXN0cy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy90eXBlcy5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2tleXMuanMiXSwibmFtZXMiOlsiY29uc29sZSIsImdyb3VwIiwibG9nIiwiZ3JvdXBFbmQiLCJQYXJzZXIiLCJwcm9wZXJ0aWVzIiwiVG9rZW56aWVyIiwiX3J1bGVzIiwiT2JqZWN0IiwiYXNzaWduIiwicnVsZU5hbWUiLCJ0ZXh0IiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiVElNRSIsInRpbWUiLCJ0b2tlbnMiLCJ0b2tlbml6ZSIsImZpbHRlciIsImlzTm9ybWFsV2hpdGVzcGFjZSIsInRva2VuIiwidGltZUVuZCIsInVuZGVmaW5lZCIsImVhdFdoaXRlc3BhY2VUb2tlbnMiLCJyZXN1bHQiLCJwYXJzZVJ1bGVPckRpZSIsInBhcnNlIiwiU3ludGF4RXJyb3IiLCJ0b1NvdXJjZSIsInN0YXJ0IiwiZW5kIiwic3RhY2siLCJjYWxsaW5nQ29udGV4dCIsInJ1bGVGb3VuZCIsImltcG9ydHMiLCJpbmRleCIsInBhcnNlciIsInJlc3VsdHMiLCJydWxlIiwicHVzaCIsInJlZHVjZSIsImxhcmdlc3QiLCJuZXh0IiwibmV4dFN0YXJ0IiwidGVzdCIsIm5leHRSdWxlIiwiX2ltcG9ydHMiLCJjb25jYXQiLCJyZXZlcnNlIiwiX19pbXBvcnRzIiwiX19ydWxlcyIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJhZGRSdWxlIiwiZXhpc3RpbmciLCJBbHRlcm5hdGl2ZXMiLCJERUJVRyIsInJ1bGVzIiwiYXJndW1lbnQiLCJydWxlSXNMZWZ0UmVjdXJzaXZlIiwiU2VxdWVuY2UiLCJUeXBlRXJyb3IiLCJ0ZXN0UnVsZSIsImluZm8iLCJsZWZ0UmVjdXJzaXZlIiwibWFwIiwiZ2V0Q29udGV4dE9yRGllIiwib3V0cHV0IiwiYWx0ZXJuYXRpdmVzIiwiYWx0ZXJuYXRpdmUiLCJjb250ZXh0TmFtZSIsIlJFR0lTVFJZIiwic3VicnVsZSIsIm9wdGlvbmFsIiwiU3VicnVsZSIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsIm5lc3RpbmciLCJuZXN0ZWQiLCJsYXN0SW5kZXgiLCJzbGljZSIsInN0cmluZyIsInNwbGl0IiwiY2hhciIsImxpc3QiLCJSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTIiwiam9pbiIsImZsYWdzIiwiUmVnRXhwIiwiZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyIsImNoYXJzIiwiUnVsZSIsInByb3BzIiwiY29uc3RydWN0b3IiLCJibGFja2xpc3QiLCJ3b3JkcyIsIndvcmQiLCJjb250ZXh0IiwibWF0Y2hlZCIsIm5hbWUiLCJNYXRjaCIsIm1hdGNoIiwiaGVhZFN0YXJ0c1dpdGgiLCJjbG9uZSIsIm1hdGNoRGVsaW1pdGVyIiwibWF0Y2hTdGFydCIsImluZGV4T2YiLCJtYXRjaGVzIiwiaSIsInByb3RvdHlwZSIsIlN5bWJvbCIsIktleXdvcmQiLCJQYXR0ZXJuIiwicGF0dGVybiIsInNvbWUiLCJzb3VyY2UiLCJpbmNsdWRlcyIsInByb21vdGUiLCJhZGRSZXN1bHRzIiwiYXJnTmFtZSIsImtleXMiLCJ2YWx1ZSIsImtleSIsImNvbW1lbnQiLCJFeHByZXNzaW9uIiwiU3RhdGVtZW50IiwiYmVzdE1hdGNoIiwiZ2V0QmVzdE1hdGNoIiwiYmVzdCIsImN1cnJlbnQiLCJSZXBlYXQiLCJpc0NvbXBvdW5kUnVsZSIsIkxpc3QiLCJpdGVtIiwiZGVsaW1pdGVyIiwiTmVzdGVkU2NvcGUiLCJsaW5lcyIsIlRva2VuaXplciIsImJyZWFrSW50b0xpbmVzIiwibGFzdEluZGVudCIsImxpbmVSZXN1bHQiLCJwYXJzZUxpbmUiLCJsYXN0UmVzdWx0IiwiaW5kZW50IiwiY2xvc2VCbG9jayIsIkNsb3NlQmxvY2siLCJCbGFua0xpbmUiLCJJbmRlbnQiLCJPcGVuQmxvY2siLCJzdGF0ZW1lbnQiLCJ3YXJuIiwiUGFyc2VFcnJvciIsImVycm9yIiwibWVzc2FnZSIsInVucGFyc2VkIiwiU3RhdGVtZW50cyIsInByZXZpb3VzIiwib3BlbnNCbG9jayIsImRlZmluZVByb3BlcnR5Iiwid2hpdGVzcGFjZSIsIm5ld2xpbmUiLCJXaGl0ZXNwYWNlIiwiTkVXTElORSIsInRyaW0iLCJlYXRUb2tlbnMiLCJtYXRjaFRvcFRva2VucyIsIm1ldGhvZCIsImNhbGwiLCJtYXRjaFdoaXRlc3BhY2UiLCJtYXRjaFdvcmQiLCJtYXRjaE51bWJlciIsIm1hdGNoTmV3bGluZSIsIm1hdGNoSlNYRWxlbWVudCIsIm1hdGNoVGV4dCIsIm1hdGNoQ29tbWVudCIsIm1hdGNoU3ltYm9sIiwiZWF0V2hpdGVzcGFjZSIsIndoaXRlU3BhY2VFbmQiLCJ3aGl0ZXNwYWNlRW5kIiwiV09SRF9TVEFSVCIsIldPUkRfQ0hBUiIsIndvcmRFbmQiLCJOVU1CRVJfU1RBUlQiLCJOVU1CRVIiLCJudW1iZXJNYXRjaCIsIm1hdGNoRXhwcmVzc2lvbkF0SGVhZCIsIm51bWJlclN0ciIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJxdW90ZVN5bWJvbCIsInRleHRFbmQiLCJxdW90ZWRTdHJpbmciLCJUZXh0IiwiQ09NTUVOVCIsImNvbW1lbnRTdGFydCIsImxpbmUiLCJnZXRMaW5lQXRIZWFkIiwiY29tbWVudE1hdGNoIiwiY29tbWVudFN5bWJvbCIsIkNvbW1lbnQiLCJtYXRjaEpTWFN0YXJ0VGFnIiwianN4RWxlbWVudCIsImlzVW5hcnlUYWciLCJtYXRjaEpTWENoaWxkcmVuIiwidGFnTmFtZSIsImNoaWxkcmVuIiwiY2hpbGRFbmQiLCJKU1hfVEFHX1NUQVJUIiwidGFnTWF0Y2giLCJlbmRCaXQiLCJKU1hFbGVtZW50IiwibWF0Y2hKU1hBdHRyaWJ1dGUiLCJhdHRycyIsImF0dHJFbmQiLCJhdHRyaWJ1dGVzIiwiYXR0cnNBc1N0cmluZyIsImNoaWxkcmVuQXNTdHJpbmciLCJhdHRyIiwiY2hpbGQiLCJlbmRUYWciLCJtYXRjaEpTWENoaWxkIiwibWF0Y2hKU1hFbmRUYWciLCJtYXRjaEpTWEV4cHJlc3Npb24iLCJtYXRjaEpTWFRleHQiLCJtYXRjaFN0cmluZ0F0SGVhZCIsIkpTWF9BVFRSSUJVVEVfU1RBUlQiLCJlcXVhbHMiLCJhdHRyaWJ1dGUiLCJKU1hBdHRyaWJ1dGUiLCJtYXRjaEpTWEF0dHJpYnV0ZVZhbHVlIiwidmFsdWVFbmQiLCJtYXRjaEpTWEF0dHJpYnV0ZVZhbHVlSWRlbnRpZmllciIsIkpTWEV4cHJlc3Npb24iLCJlbmRJbmRleCIsImZpbmRNYXRjaGluZ0F0SGVhZCIsImNvbnRlbnRzIiwiZXhwcmVzc2lvbiIsIkpTWF9URVhUX0VORF9DSEFSUyIsImZpbmRGaXJzdEF0SGVhZCIsImpzeFRleHQiLCJzdHJpbmdFbmQiLCJoZWFkIiwic3RhcnREZWxpbWl0ZXIiLCJlbmREZWxpbWl0ZXIiLCJhZnRlclF1b3RlIiwiU3BlbGxFZGl0b3IiLCJ3aW5kb3ciLCJleGFtcGxlcyIsImxvYWQiLCJzcGVsbEVkaXRvciIsInNhdmUiLCJyZXZlcnQiLCJjb21waWxlIiwiY3JlYXRlIiwiZGVsZXRlIiwicmVuYW1lIiwiZHVwbGljYXRlIiwicmVzZXQiLCJ0aXRsZXMiLCJzZWxlY3RlZCIsImRpcnR5IiwiY29kZSIsIm9wdGlvbnMiLCJ0aXRsZSIsImNvbnRlbnQiLCJvbkNsaWNrIiwic2VsZWN0IiwiZGlydHlCdXR0b25zIiwicG9zaXRpb24iLCJyaWdodCIsInRvcCIsIm1hcmdpbiIsImNvbXBpbGVCdXR0b24iLCJ3aWR0aCIsImxlZnQiLCJoZWlnaHQiLCJwYWRkaW5nVG9wIiwiZXZlbnQiLCJ1cGRhdGUiLCJ0YXJnZXQiLCJDb21wb25lbnQiLCJkZWZhdWx0UHJvcHMiLCJleHBvcnRzIiwiYmluZCIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJsYXN0IiwicG9wIiwic3ludGF4VG9rZW4iLCJwYXJzZVJ1bGVTeW50YXhfc3ltYm9sIiwicGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUiLCJwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMiLCJwYXJzZVJ1bGVTeW50YXhfbGlzdCIsInBhcnNlUnVsZVN5bnRheF9yZXBlYXQiLCJLRVlXT1JEX1BBVFRFUk4iLCJwYXJzZVJ1bGVTeW50YXhfa2V5d29yZCIsImlzRXNjYXBlZCIsInN0YXJ0c1dpdGgiLCJzdWJzdHIiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJncm91cEFsdGVybmF0aXZlcyIsInN5bWJvbCIsInBhcmFtcyIsImJhbmdQb3NpdGlvbiIsIm5vdCIsImRlZmluZVByb3BlcnRpZXMiLCJhZGRTZXF1ZW5jZSIsInJ1bGVTeW50YXgiLCJlIiwiYWRkU3RhdGVtZW50IiwiYWRkRXhwcmVzc2lvbiIsImFkZExpc3QiLCJzdHJlYW0iLCJhZGRLZXl3b3JkIiwiYWRkU3ltYm9sIiwiRXhhbXBsZVN0b3JlIiwibG9jYWxTdG9yYWdlIiwic3BlbGxFZGl0b3JFeGFtcGxlcyIsInNwZWxsRWRpdG9yRXhhbXBsZSIsImxvY2F0aW9uIiwicmVsb2FkIiwiSlNPTiIsIl9zYXZlZEV4YW1wbGVzIiwic3RyaW5naWZ5IiwiZXhhbXBsZSIsInNraXBTYXZlIiwic2hvd0NvbmZpcm0iLCJjb25maXJtIiwicHJvbXB0Iiwib2xkTmFtZSIsIm5ld05hbWUiLCJzZXRUaW1lb3V0IiwiU3BhY2VyIiwiY2xhc3NOYW1lIiwiYXBwZWFyYW5jZSIsInNpemUiLCJpbmxpbmUiLCJmbHVpZCIsInRpbnkiLCJzbWFsbCIsIm1lZGl1bSIsImxhcmdlIiwiaHVnZSIsIm1hc3NpdmUiLCJzcGFjZXJQcm9wcyIsInN0eWxlIiwicHJvcFR5cGVzIiwiYm9vbCIsIlRhYmJhYmxlVGV4dEFyZWEiLCJvbktleURvd24iLCJrZXlDb2RlIiwicHJldmVudERlZmF1bHQiLCJlbGVtZW50Iiwic2VsZWN0aW9uU3RhcnQiLCJzZWxlY3Rpb25FbmQiLCJuZXdUZXh0Iiwic2hpZnRLZXkiLCJsYXN0SW5kZXhPZiIsIm9uQ2hhbmdlIiwiY2xhc3NOYW1lcyIsImFyZ3MiLCJhcmciLCJCb29sZWFuIiwibWVtb2l6ZWQiLCJkZWZpbmVNZW1vaXplZCIsInByb3BlcnR5IiwiZ2V0dGVyIiwiYXBwbHkiLCJjb25maWd1cmFibGUiLCJnZXQiLCJnbG9iYWxfaWRlbnRpZmllciIsImdsb2JhbCIsInNlbGYiLCJyZW5kZXIiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiZm9yQ29udGV4dCIsIldvcmQiLCJyZXBsYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJhZGRUb0JsYWNrbGlzdCIsIlR5cGUiLCJ0eXBlIiwiTnVtYmVyIiwiTlVNQkVSX05BTUVTIiwiemVybyIsIm9uZSIsInR3byIsInRocmVlIiwiZm91ciIsImZpdmUiLCJzaXgiLCJzZXZlbiIsImVpZ2h0IiwibmluZSIsInRlbiIsImdldE1hdGNoZWRTb3VyY2UiLCJlbmRzV2l0aCIsInBsdXJhbGl6ZSIsImlzUGx1cmFsIiwic2luZ3VsYXJpemUiLCJpc1Npbmd1bGFyIiwiZ2V0VGFicyIsIlRBQlMiLCJhbGxFeHBvcnRzIiwiU1RSSU5HIiwiSlNYIiwianN4RXhwcmVzc2lvblRvU291cmNlIiwiY2hpbGRTb3VyY2UiLCJqc3hFbGVtZW50VG9Tb3VyY2UiLCJqc3hFeHByZXNzaW9uIiwiYXR0cnNUb1NvdXJjZSIsImNoaWxkcmVuVG9Tb3VyY2UiLCJpbXBvcnQiLCJjb25kaXRpb24iLCJlbHNlU3RhdGVtZW50IiwidGhpbmciLCJvcmRpbmFsIiwib3BlcmF0b3IiLCJiYW5nIiwiaXRlbVZhciIsInBvc2l0aW9uVmFyIiwibGhzIiwicmhzIiwidG9KUyIsInByZWNlZGVuY2UiLCJhIiwiYiIsIm9rQnV0dG9uIiwiY2FuY2VsQnV0dG9uIiwic3VwZXJUeXBlIiwicHJvcCIsImNsb3Nlc0Jsb2NrIiwia2V5d29yZHMiLCJ0eXBlcyIsInRvTG93ZXJDYXNlIiwibWV0aG9kTmFtZSIsImNvbmRpdGlvbnMiLCJzdGF0ZW1lbnRzIiwibWF0Y2hlZFRleHQiLCJzY29wZSIsImRlY2xhcmF0aW9uIiwicGx1cmFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFBQSxrQ0FBa0MsaUNBQWlDLGVBQWUsZUFBZSxnQkFBZ0Isb0JBQW9CLE1BQU0sMENBQTBDLCtCQUErQixhQUFhLHFCQUFxQixtQ0FBbUMsRUFBRSxFQUFFLGNBQWMsV0FBVyxVQUFVLEVBQUUsVUFBVSxNQUFNLHlDQUF5QyxFQUFFLFVBQVUsa0JBQWtCLEVBQUUsRUFBRSxhQUFhLEVBQUUsMkJBQTJCLDBCQUEwQixZQUFZLEVBQUUsMkNBQTJDLDhCQUE4QixFQUFFLE9BQU8sNkVBQTZFLEVBQUUsR0FBRyxFQUFFOztBQUVycEIsa0NBQWtDLDBCQUEwQiwwQ0FBMEMsZ0JBQWdCLE9BQU8sa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE9BQU8sd0JBQXdCLEVBQUU7O0FBRWpNO0FBQ0E7QUFDQTtBQUNBO0FBQ2tCO0FBQ2xCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsT0FBTztBQUNwQjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDs7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QUFFQTtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7OztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLDBDQUEwQzs7QUFFMUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsUUFBUTtBQUNyQixjQUFjO0FBQ2Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWLDZCQUE2QjtBQUM3QixRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQkFBK0IsS0FBSztBQUNwQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULDRCQUE0QjtBQUM1QixPQUFPO0FBQ1A7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQixzQkFBc0I7QUFDM0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxxQkFBcUIsMkJBQTJCO0FBQ2hEO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLHFCQUFxQixnQ0FBZ0M7QUFDckQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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LENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDeUcsT0FBdEMsRUFBK0MsRUFBRTlZLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0FRLE9BQU82UixVQUFQLENBQWtCLFNBQWxCLEVBQTZCLFFBQTdCLEVBQXVDeUcsT0FBdkMsRUFBZ0QsRUFBRTlZLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQWhEO0FBQ0FRLE9BQU82UixVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDeUcsT0FBdEMsRUFBK0MsRUFBRTlZLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0FRLE9BQU82UixVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDeUcsT0FBdEMsRUFBK0MsRUFBRTlZLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0FRLE9BQU82UixVQUFQLENBQWtCLFNBQWxCLEVBQTZCLFNBQTdCLEVBQXdDeUcsT0FBeEMsRUFBaUQsRUFBRTlZLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQWpEO0FBQ0FRLE9BQU82UixVQUFQLENBQWtCLFNBQWxCLEVBQTZCLFFBQTdCLEVBQXVDeUcsT0FBdkMsRUFBZ0QsRUFBRTlZLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQWhEO0FBQ0FRLE9BQU82UixVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDeUcsT0FBdEMsRUFBK0MsRUFBRTlZLFVBQVU7QUFBQSxTQUFNLENBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0FRLE9BQU82UixVQUFQLENBQWtCLFNBQWxCLEVBQTZCLE9BQTdCLEVBQXNDeUcsT0FBdEMsRUFBK0MsRUFBRTlZLFVBQVU7QUFBQSxTQUFNLEVBQU47QUFBQSxFQUFaLEVBQS9DO0FBQ0FRLE9BQU82UixVQUFQLENBQWtCLFNBQWxCLEVBQTZCLGFBQTdCLEVBQTRDeUcsT0FBNUMsRUFBcUQsRUFBRTlZLFVBQVU7QUFB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OztBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQUFBLDJCQUlXNU4sT0FKWCxFQUlvQjtBQUFBLDZCQUNJLEtBQUttVCxnQkFBTCxDQUFzQm5ULE9BQXRCLENBREo7QUFBQSxPQUNYa1MsVUFEVyx1QkFDWEEsVUFEVzs7QUFFakIsb0JBQWVBLFVBQWY7QUFDQTtBQVBIOztBQUFBO0FBQUEsRUFHc0MscUJBQUt2USxVQUgzQyxHOzs7Ozs7Ozs7QUN6WEE7QUFBQSxvR0FBb0csbUJBQW1CLEVBQUUsbUJBQW1CLDhIQUE4SDs7QUFFMVE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBLENBQUM7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLDZEIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBfc2xpY2VkVG9BcnJheSA9IGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gc2xpY2VJdGVyYXRvcihhcnIsIGkpIHsgdmFyIF9hcnIgPSBbXTsgdmFyIF9uID0gdHJ1ZTsgdmFyIF9kID0gZmFsc2U7IHZhciBfZSA9IHVuZGVmaW5lZDsgdHJ5IHsgZm9yICh2YXIgX2kgPSBhcnJbU3ltYm9sLml0ZXJhdG9yXSgpLCBfczsgIShfbiA9IChfcyA9IF9pLm5leHQoKSkuZG9uZSk7IF9uID0gdHJ1ZSkgeyBfYXJyLnB1c2goX3MudmFsdWUpOyBpZiAoaSAmJiBfYXJyLmxlbmd0aCA9PT0gaSkgYnJlYWs7IH0gfSBjYXRjaCAoZXJyKSB7IF9kID0gdHJ1ZTsgX2UgPSBlcnI7IH0gZmluYWxseSB7IHRyeSB7IGlmICghX24gJiYgX2lbXCJyZXR1cm5cIl0pIF9pW1wicmV0dXJuXCJdKCk7IH0gZmluYWxseSB7IGlmIChfZCkgdGhyb3cgX2U7IH0gfSByZXR1cm4gX2FycjsgfSByZXR1cm4gZnVuY3Rpb24gKGFyciwgaSkgeyBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7IHJldHVybiBhcnI7IH0gZWxzZSBpZiAoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdChhcnIpKSB7IHJldHVybiBzbGljZUl0ZXJhdG9yKGFyciwgaSk7IH0gZWxzZSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIGF0dGVtcHQgdG8gZGVzdHJ1Y3R1cmUgbm9uLWl0ZXJhYmxlIGluc3RhbmNlXCIpOyB9IH07IH0oKTtcblxuZnVuY3Rpb24gX3RvQ29uc3VtYWJsZUFycmF5KGFycikgeyBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7IGZvciAodmFyIGkgPSAwLCBhcnIyID0gQXJyYXkoYXJyLmxlbmd0aCk7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHsgYXJyMltpXSA9IGFycltpXTsgfSByZXR1cm4gYXJyMjsgfSBlbHNlIHsgcmV0dXJuIEFycmF5LmZyb20oYXJyKTsgfSB9XG5cbi8qKlxuICogQG1vZHVsZSBzdG9yZVxuICpcbiAqL1xuaW1wb3J0IHsgYWxsS2V5cyB9IGZyb20gJy4vbGliL2tleXMnO1xuaW1wb3J0IG1hdGNoS2V5cyBmcm9tICcuL2xpYi9tYXRjaF9rZXlzJztcbmltcG9ydCBwYXJzZUtleXMgZnJvbSAnLi9saWIvcGFyc2Vfa2V5cyc7XG5pbXBvcnQgdXVpZCBmcm9tICcuL2xpYi91dWlkJztcblxuLyoqXG4gKiBwcml2YXRlXG4gKiBcbiAqL1xuXG4vLyBkaWN0IGZvciBjbGFzcyBwcm90b3R5cGVzID0+IGJpbmRpbmdzXG52YXIgX2hhbmRsZXJzID0gbmV3IE1hcCgpO1xuXG4vLyBhbGwgbW91bnRlZCBpbnN0YW5jZXMgdGhhdCBoYXZlIGtleWJpbmRpbmdzXG52YXIgX2luc3RhbmNlcyA9IG5ldyBTZXQoKTtcblxuLy8gZm9yIHRlc3RpbmdcbmV4cG9ydCBmdW5jdGlvbiBfcmVzZXRTdG9yZSgpIHtcbiAgX2hhbmRsZXJzLmNsZWFyKCk7XG4gIF9pbnN0YW5jZXMuY2xlYXIoKTtcbn1cblxuLyoqXG4gKiBwdWJsaWNcbiAqXG4gKi9cblxudmFyIFN0b3JlID0ge1xuXG4gIC8qKlxuICAgKiBhY3RpdmF0ZVxuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgSW5zdGFudGlhdGVkIGNsYXNzIHRoYXQgZXh0ZW5kZWQgUmVhY3QuQ29tcG9uZW50LCB0byBiZSBmb2N1c2VkIHRvIHJlY2VpdmUga2V5ZG93biBldmVudHNcbiAgICovXG4gIGFjdGl2YXRlOiBmdW5jdGlvbiBhY3RpdmF0ZShpbnN0YW5jZXMpIHtcbiAgICB2YXIgaW5zdGFuY2VzQXJyYXkgPSBbXS5jb25jYXQoaW5zdGFuY2VzKTtcblxuICAgIC8vIGlmIG5vIGNvbXBvbmVudHMgd2VyZSBmb3VuZCBhcyBhbmNlc3RvcnMgb2YgdGhlIGV2ZW50IHRhcmdldCxcbiAgICAvLyBlZmZlY3RpdmVseSBkZWFjdGl2YXRlIGtleWRvd24gaGFuZGxpbmcgYnkgY2FwcGluZyB0aGUgc2V0IG9mIGluc3RhbmNlc1xuICAgIC8vIHdpdGggYG51bGxgLlxuICAgIGlmICghaW5zdGFuY2VzQXJyYXkubGVuZ3RoKSB7XG4gICAgICBfaW5zdGFuY2VzLmFkZChudWxsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgX2luc3RhbmNlcy5kZWxldGUobnVsbCk7XG5cbiAgICAgIC8vIGRlbGV0aW5nIGFuZCB0aGVuIGFkZGluZyB0aGUgaW5zdGFuY2UocykgaGFzIHRoZSBlZmZlY3Qgb2Ygc29ydGluZyB0aGUgc2V0XG4gICAgICAvLyBhY2NvcmRpbmcgdG8gaW5zdGFuY2UgYWN0aXZhdGlvbiAoYXNjZW5kaW5nKVxuICAgICAgaW5zdGFuY2VzQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgX2luc3RhbmNlcy5kZWxldGUoaW5zdGFuY2UpO1xuICAgICAgICBfaW5zdGFuY2VzLmFkZChpbnN0YW5jZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cblxuICAvKipcbiAgICogZGVsZXRlSW5zdGFuY2VcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBJbnN0YW50aWF0ZWQgY2xhc3MgdGhhdCBleHRlbmRlZCBSZWFjdC5Db21wb25lbnRcbiAgICogQHJldHVybiB7Ym9vbGVhbn0gVGhlIHZhbHVlIHNldC5oYXMoIHRhcmdldCApIHdvdWxkIGhhdmUgcmV0dXJuZWQgcHJpb3IgdG8gZGVsZXRpb25cbiAgICovXG4gIGRlbGV0ZUluc3RhbmNlOiBmdW5jdGlvbiBkZWxldGVJbnN0YW5jZSh0YXJnZXQpIHtcbiAgICBfaW5zdGFuY2VzLmRlbGV0ZSh0YXJnZXQpO1xuICB9LFxuICBmaW5kQmluZGluZ0ZvckV2ZW50OiBmdW5jdGlvbiBmaW5kQmluZGluZ0ZvckV2ZW50KGV2ZW50KSB7XG4gICAgaWYgKCFfaW5zdGFuY2VzLmhhcyhudWxsKSkge1xuICAgICAgdmFyIGtleU1hdGNoZXNFdmVudCA9IGZ1bmN0aW9uIGtleU1hdGNoZXNFdmVudChrZXlTZXQpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoS2V5cyh7IGtleVNldDoga2V5U2V0LCBldmVudDogZXZlbnQgfSk7XG4gICAgICB9O1xuXG4gICAgICAvLyBsb29wIHRocm91Z2ggaW5zdGFuY2VzIGluIHJldmVyc2UgYWN0aXZhdGlvbiBvcmRlciBzbyB0aGF0IG1vc3RcbiAgICAgIC8vIHJlY2VudGx5IGFjdGl2YXRlZCBpbnN0YW5jZSBnZXRzIGZpcnN0IGRpYnMgb24gZXZlbnRcbiAgICAgIHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZTtcbiAgICAgIHZhciBfZGlkSXRlcmF0b3JFcnJvciA9IGZhbHNlO1xuICAgICAgdmFyIF9pdGVyYXRvckVycm9yID0gdW5kZWZpbmVkO1xuXG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBfaXRlcmF0b3IgPSBbXS5jb25jYXQoX3RvQ29uc3VtYWJsZUFycmF5KF9pbnN0YW5jZXMpKS5yZXZlcnNlKClbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gKF9zdGVwID0gX2l0ZXJhdG9yLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlKSB7XG4gICAgICAgICAgdmFyIGluc3RhbmNlID0gX3N0ZXAudmFsdWU7XG5cbiAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmcoaW5zdGFuY2UuY29uc3RydWN0b3IucHJvdG90eXBlKTtcbiAgICAgICAgICB2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlO1xuICAgICAgICAgIHZhciBfZGlkSXRlcmF0b3JFcnJvcjIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgX2l0ZXJhdG9yRXJyb3IyID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZvciAodmFyIF9pdGVyYXRvcjIgPSBiaW5kaW5nc1tTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwMjsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IChfc3RlcDIgPSBfaXRlcmF0b3IyLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZSkge1xuICAgICAgICAgICAgICB2YXIgX3N0ZXAyJHZhbHVlID0gX3NsaWNlZFRvQXJyYXkoX3N0ZXAyLnZhbHVlLCAyKSxcbiAgICAgICAgICAgICAgICAgIGtleVNldHMgPSBfc3RlcDIkdmFsdWVbMF0sXG4gICAgICAgICAgICAgICAgICBmbiA9IF9zdGVwMiR2YWx1ZVsxXTtcblxuICAgICAgICAgICAgICBpZiAoYWxsS2V5cyhrZXlTZXRzKSB8fCBrZXlTZXRzLnNvbWUoa2V5TWF0Y2hlc0V2ZW50KSkge1xuICAgICAgICAgICAgICAgIC8vIHJldHVybiB3aGVuIG1hdGNoaW5nIGtleWJpbmRpbmcgaXMgZm91bmQgLSBpLmUuIG9ubHkgb25lXG4gICAgICAgICAgICAgICAgLy8ga2V5Ym91bmQgY29tcG9uZW50IGNhbiByZXNwb25kIHRvIGEgZ2l2ZW4ga2V5IGNvZGUuIHRvIGdldCBhcm91bmQgdGhpcyxcbiAgICAgICAgICAgICAgICAvLyBzY29wZSBhIGNvbW1vbiBhbmNlc3RvciBjb21wb25lbnQgY2xhc3Mgd2l0aCBAa2V5ZG93biBhbmQgdXNlXG4gICAgICAgICAgICAgICAgLy8gQGtleWRvd25TY29wZWQgdG8gYmluZCB0aGUgZHVwbGljYXRlIGtleXMgaW4geW91ciBjaGlsZCBjb21wb25lbnRzXG4gICAgICAgICAgICAgICAgLy8gKG9yIGp1c3QgaW5zcGVjdCBuZXh0UHJvcHMua2V5ZG93bi5ldmVudCkuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZm46IGZuLCBpbnN0YW5jZTogaW5zdGFuY2UgfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgX2RpZEl0ZXJhdG9yRXJyb3IyID0gdHJ1ZTtcbiAgICAgICAgICAgIF9pdGVyYXRvckVycm9yMiA9IGVycjtcbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiAmJiBfaXRlcmF0b3IyLnJldHVybikge1xuICAgICAgICAgICAgICAgIF9pdGVyYXRvcjIucmV0dXJuKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgIGlmIChfZGlkSXRlcmF0b3JFcnJvcjIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBfaXRlcmF0b3JFcnJvcjI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBfZGlkSXRlcmF0b3JFcnJvciA9IHRydWU7XG4gICAgICAgIF9pdGVyYXRvckVycm9yID0gZXJyO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gJiYgX2l0ZXJhdG9yLnJldHVybikge1xuICAgICAgICAgICAgX2l0ZXJhdG9yLnJldHVybigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICBpZiAoX2RpZEl0ZXJhdG9yRXJyb3IpIHtcbiAgICAgICAgICAgIHRocm93IF9pdGVyYXRvckVycm9yO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBnZXRCaW5kaW5nXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgQ2xhc3MgdXNlZCBhcyBrZXkgaW4gZGljdCBvZiBrZXkgYmluZGluZ3NcbiAgICogQHJldHVybiB7b2JqZWN0fSBUaGUgb2JqZWN0IGNvbnRhaW5pbmcgYmluZGluZ3MgZm9yIHRoZSBnaXZlbiBjbGFzc1xuICAgKi9cbiAgZ2V0QmluZGluZzogZnVuY3Rpb24gZ2V0QmluZGluZyhfcmVmKSB7XG4gICAgdmFyIF9fcmVhY3RLZXlkb3duVVVJRCA9IF9yZWYuX19yZWFjdEtleWRvd25VVUlEO1xuXG4gICAgcmV0dXJuIF9oYW5kbGVycy5nZXQoX19yZWFjdEtleWRvd25VVUlEKTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBnZXRJbnN0YW5jZXNcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICogQHJldHVybiB7c2V0fSBBbGwgc3RvcmVkIGluc3RhbmNlcyAoYWxsIG1vdW50ZWQgY29tcG9uZW50IGluc3RhbmNlcyB3aXRoIGtleWJpbmRpbmdzKVxuICAgKi9cbiAgZ2V0SW5zdGFuY2VzOiBmdW5jdGlvbiBnZXRJbnN0YW5jZXMoKSB7XG4gICAgcmV0dXJuIF9pbnN0YW5jZXM7XG4gIH0sXG5cblxuICAvKipcbiAgICogaXNFbXB0eVxuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAcmV0dXJuIHtudW1iZXJ9IFNpemUgb2YgdGhlIHNldCBvZiBhbGwgc3RvcmVkIGluc3RhbmNlc1xuICAgKi9cbiAgaXNFbXB0eTogZnVuY3Rpb24gaXNFbXB0eSgpIHtcbiAgICByZXR1cm4gIV9pbnN0YW5jZXMuc2l6ZTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBzZXRCaW5kaW5nXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzIEFsbCBhcmd1bWVudHMgbmVjZXNzYXJ5IHRvIHNldCB0aGUgYmluZGluZ1xuICAgKiBAcGFyYW0ge2FycmF5fSBhcmdzLmtleXMgS2V5IGNvZGVzIHRoYXQgc2hvdWxkIHRyaWdnZXIgdGhlIGZuXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGFyZ3MuZm4gVGhlIGNhbGxiYWNrIHRvIGJlIHRyaWdnZXJlZCB3aGVuIGdpdmVuIGtleXMgYXJlIHByZXNzZWRcbiAgICogQHBhcmFtIHtvYmplY3R9IGFyZ3MudGFyZ2V0IFRoZSBkZWNvcmF0ZWQgY2xhc3NcbiAgICovXG4gIHNldEJpbmRpbmc6IGZ1bmN0aW9uIHNldEJpbmRpbmcoX3JlZjIpIHtcbiAgICB2YXIga2V5cyA9IF9yZWYyLmtleXMsXG4gICAgICAgIGZuID0gX3JlZjIuZm4sXG4gICAgICAgIHRhcmdldCA9IF9yZWYyLnRhcmdldDtcblxuICAgIHZhciBrZXlTZXRzID0ga2V5cyA/IHBhcnNlS2V5cyhrZXlzKSA6IGFsbEtleXMoKTtcbiAgICB2YXIgX19yZWFjdEtleWRvd25VVUlEID0gdGFyZ2V0Ll9fcmVhY3RLZXlkb3duVVVJRDtcblxuICAgIGlmICghX19yZWFjdEtleWRvd25VVUlEKSB7XG4gICAgICB0YXJnZXQuX19yZWFjdEtleWRvd25VVUlEID0gdXVpZCgpO1xuICAgICAgX2hhbmRsZXJzLnNldCh0YXJnZXQuX19yZWFjdEtleWRvd25VVUlELCBuZXcgTWFwKFtba2V5U2V0cywgZm5dXSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfaGFuZGxlcnMuZ2V0KF9fcmVhY3RLZXlkb3duVVVJRCkuc2V0KGtleVNldHMsIGZuKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IFN0b3JlO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL3N0b3JlLmpzXG4vLyBtb2R1bGUgaWQgPSAxMDBcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gU3BlbGwgXCJwYXJzZXJcIiBjbGFzcy5cbi8vXG5cbi8vIFRPRE86IGRlcGVuZGVuY3ktaW5qZWN0IHRva2VuaXplcj9cbmltcG9ydCBUb2tlbml6ZXIgZnJvbSBcIi4vVG9rZW5pemVyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIEdSUlIuLi4gd2lsbCBTT01FT05FIG9uIHRoZSBub2RlIHRlYW0gcGxlYXNlIGltcGxlbWVudCBjb25zb2xlLmdyb3VwID8/P1xuaWYgKCFjb25zb2xlLmdyb3VwKSBjb25zb2xlLmdyb3VwID0gY29uc29sZS5sb2c7XG5pZiAoIWNvbnNvbGUuZ3JvdXBFbmQpIGNvbnNvbGUuZ3JvdXBFbmQgPSBjb25zb2xlLmxvZztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblx0Ly8gU2V0IHRvIGB0cnVlYCB0byBvdXRwdXQgZGVidWcgaW5mbyB3aGlsZSBhZGRpbmcgcnVsZXNcblx0c3RhdGljIERFQlVHID0gZmFsc2U7XG5cblx0Ly8gU2V0IHRvIGB0cnVlYCB0byBvdXRwdXQgdGltaW5nIGluZm8uXG5cdHN0YXRpYyBUSU1FID0gZmFsc2U7XG5cblx0Ly8gUG9pbnRlciB0byBvdXIgdG9rZW5pemVyLlxuXHRUb2tlbnppZXIgPSBUb2tlbml6ZXI7XG5cblx0Ly8gQ29uc3RydWN0b3IuXG5cdGNvbnN0cnVjdG9yKHByb3BlcnRpZXMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIHByb3BlcnRpZXMpO1xuXHR9XG5cbi8vXG4vLyMjIyBQYXJzaW5nXG4vL1xuXHQvLyBQYXJzZSBgcnVsZU5hbWVgIHJ1bGUgYXQgaGVhZCBvZiBgdGV4dGAuXG5cdC8vIElmIHlvdSBwYXNzIG9ubHkgb25lIGFyZ3VtZW50LCB3ZSdsbCBhc3N1bWUgdGhhdCdzIGB0ZXh0YCBhbmQgeW91IHdhbnQgdG8gbWF0Y2ggYHN0YXRlbWVudHNgLlxuXHQvLyBIYW5kbGVzIG9wdGlvbmFsIGFuZCByZXBlYXRpbmcgcnVsZXMgYXMgd2VsbCBhcyBlYXRpbmcgd2hpdGVzcGFjZS5cblx0Ly8gUmV0dXJucyByZXN1bHQgb2YgcGFyc2UuXG4vL1RFU1RNRVxuXHRwYXJzZShydWxlTmFtZSwgdGV4dCkge1xuXHRcdC8vIElmIG9ubHkgb25lIGFyZ3VtZW50LCBhc3N1bWUgdGhhdCdzIHRoZSB0ZXh0IGFuZCBwYXJzZSBgc3RhdGVtZW50c2Bcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0dGV4dCA9IHJ1bGVOYW1lO1xuXHRcdFx0cnVsZU5hbWUgPSBcInN0YXRlbWVudHNcIjtcblx0XHR9XG5cblx0XHQvLyBDb252ZXJ0IHRvIHRva2Vucy5cblx0XHRpZiAoUGFyc2VyLlRJTUUpIGNvbnNvbGUudGltZShcInRva2VuaXplXCIpO1xuXHRcdGxldCB0b2tlbnMgPSBUb2tlbml6ZXIudG9rZW5pemUodGV4dCk7XG5cdFx0Ly8gZWF0IG5vbi1pbmRlbnQgd2hpdGVzcGFjZSAoc2luY2Ugd2UgaWdub3JlIGl0KVxuXHRcdHRva2VucyA9IHRva2Vucy5maWx0ZXIodG9rZW4gPT4gIVRva2VuaXplci5pc05vcm1hbFdoaXRlc3BhY2UodG9rZW4pKTtcblx0XHRpZiAoUGFyc2VyLlRJTUUpIGNvbnNvbGUudGltZUVuZChcInRva2VuaXplXCIpO1xuXG5cdFx0Ly8gQmFpbCBpZiB3ZSBkaWRuJ3QgZ2V0IGFueSB0b2tlbnMgYmFjay5cbi8vVE9ETzogV0FSTj8gIEVSUk9SP1xuXHRcdGlmICghdG9rZW5zIHx8IHRva2Vucy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAoUGFyc2VyLlRJTUUpIGNvbnNvbGUudGltZShcInBhcnNlXCIpO1xuXHRcdC8vIElmIHdlJ3JlIG5vdCBwYXJzaW5nIGBzdGF0ZW1lbnRzYCwgZWF0IHdoaXRlc3BhY2UgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgbGluZS5cblx0XHRpZiAocnVsZU5hbWUgIT09IFwic3RhdGVtZW50c1wiKSB7XG5cdFx0XHR0b2tlbnMgPSBUb2tlbml6ZXIuZWF0V2hpdGVzcGFjZVRva2Vucyh0b2tlbnMpO1xuXHRcdH1cblxuXHRcdC8vIFBhcnNlIHRoZSBydWxlIG9yIHRocm93IGFuIGV4Y2VwdGlvbiBpZiBydWxlIG5vdCBmb3VuZC5cblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5wYXJzZVJ1bGVPckRpZShydWxlTmFtZSwgdG9rZW5zLCAwLCB0b2tlbnMubGVuZ3RoLCB1bmRlZmluZWQsIFwicGFyc2VyLnBhcnNlKClcIik7XG5cdFx0aWYgKFBhcnNlci5USU1FKSBjb25zb2xlLnRpbWVFbmQoXCJwYXJzZVwiKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblxuXG5cdC8vIFBhcnNlIHNvbWV0aGluZzpcblx0Ly9cdC0gaWYgb25lIHN0cmluZyBhcmd1bWVudCwgZG9lcyBhIGBjb21waWxlU3RhdGVtZW50cygpYFxuXHQvLyBSZXR1cm5zIHRoZSBgdG9TdHJpbmcoKWAgb3IgdGhyb3dzLlxuLy9URVNUTUVcblx0Y29tcGlsZShydWxlTmFtZSwgdGV4dCkge1xuXHRcdC8vIElmIG9ubHkgb25lIGFyZ3VtZW50LCBhc3N1bWUgdGhhdCdzIHRoZSB0ZXh0IGFuZCBwYXJzZSBgc3RhdGVtZW50c2Bcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0dGV4dCA9IHJ1bGVOYW1lO1xuXHRcdFx0cnVsZU5hbWUgPSBcInN0YXRlbWVudHNcIjtcblx0XHR9XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMucGFyc2UocnVsZU5hbWUsIHRleHQpO1xuXHRcdGlmICghcmVzdWx0KSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYHBhcnNlci5wYXJzZSgnJHtydWxlTmFtZX0nLCAnJHt0ZXh0fScpOiBjYW4ndCBwYXJzZSB0aGlzYCk7XG5cdFx0cmV0dXJuIHJlc3VsdC50b1NvdXJjZSh0aGlzKTtcblx0fVxuXG5cblx0Ly8gUGFyc2UgYSBuYW1lZCBydWxlIChkZWZpbmVkIGluIHRoaXMgcGFyc2VyIG9yIGluIGFueSBvZiBvdXIgYGltcG9ydHNgKSwgcmV0dXJuaW5nIHRoZSBcImJlc3RcIiBtYXRjaC5cblx0Ly8gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiBubyBtYXRjaC5cblx0Ly8gVGhyb3dzIGlmIE5PQk9EWSBpbXBsZW1lbnRzIGBydWxlTmFtZWAuXG5cdC8vXG5cdC8vIE5PVEU6IGN1cnJlbnRseSBcImJlc3RcIiBpcyBkZWZpbmVkIGFzIHRoZSBmaXJzdCBydWxlIGluIG91ciBgaW1wb3J0c2Agd2hpY2ggbWF0Y2hlcy4uLlxuXHRwYXJzZVJ1bGVPckRpZShydWxlTmFtZSwgdG9rZW5zLCBzdGFydCwgZW5kLCBzdGFjaywgY2FsbGluZ0NvbnRleHQgPSBcInBhcnNlUnVsZU9yRGllXCIpIHtcblx0XHQvLyBLZWVwIHRyYWNrIG9mIHdoZXRoZXIgcnVsZSB3YXMgRVZFUiBmb3VuZCBvciBub3QuXG5cdFx0bGV0IHJ1bGVGb3VuZCA9IGZhbHNlO1xuXHRcdGxldCBpbXBvcnRzID0gdGhpcy5pbXBvcnRzLCBpbmRleCA9IDAsIHBhcnNlcjtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdHdoaWxlIChwYXJzZXIgPSBpbXBvcnRzW2luZGV4KytdKSB7XG5cdFx0XHRsZXQgcnVsZSA9IHBhcnNlci5fcnVsZXNbcnVsZU5hbWVdO1xuXHRcdFx0aWYgKCFydWxlKSBjb250aW51ZTtcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHJ1bGUucGFyc2UodGhpcywgdG9rZW5zLCBzdGFydCwgZW5kLCBzdGFjayk7XG5cdFx0XHRpZiAocmVzdWx0KSByZXN1bHRzLnB1c2gocmVzdWx0KTtcblx0XHRcdHJ1bGVGb3VuZCA9IHRydWU7XG5cdFx0fVxuXHRcdC8vIElmIG5ldmVyIGZvdW5kLCB0aHJvdy5cblx0XHRpZiAoIXJ1bGVGb3VuZCkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGAke2NhbGxpbmdDb250ZXh0fTogcnVsZSAnJHtydWxlTmFtZX0nIG5vdCBmb3VuZGApO1xuXG5cdFx0Ly8gSWYgbm8gbWF0Y2gsIHJldHVybiB1bmRlZmluZWQuXG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gSWYgZXhhY3RseSBvbmUgbWF0Y2gsIHJldHVybiB0aGF0LlxuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHJlc3VsdHNbMF07XG5cblx0XHQvLyBPdGhlcndpc2UgcmV0dXJuIHRoZSBsb25nZXN0IG1hdGNoLlxuXHRcdHJldHVybiByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAobGFyZ2VzdCwgbmV4dCkge1xuXHRcdFx0aWYgKG5leHQubmV4dFN0YXJ0ID4gbGFyZ2VzdC5uZXh0U3RhcnQpIHJldHVybiBuZXh0O1xuXHRcdFx0cmV0dXJuIGxhcmdlc3Q7XG5cdFx0fSwgcmVzdWx0c1swXSk7XG5cdH1cblxuXHQvLyBUZXN0IHdoZXRoZXIgYSBydWxlICh3aGljaCBtYXkgYmUgc3BlY2lmaWVkIGJ5IG5hbWUpIE1JR0hUIGJlIGZvdW5kIGluIGhlYWQgb2Ygc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdHJ1ZWAgaWYgdGhlIHJ1bGUgTUlHSFQgYmUgbWF0Y2hlZC5cblx0Ly9cdC0gYGZhbHNlYCBpZiB0aGVyZSBpcyBubyB3YXkgdGhlIHJ1bGUgY2FuIGJlIG1hdGNoZWQuXG5cdC8vXHQtIGB1bmRlZmluZWRgIGlmIG5vdCBkZXRlcm1pbnN0aWMgKGVnOiBubyB3YXkgdG8gdGVsbCBxdWlja2x5KS5cblx0dGVzdFJ1bGUocnVsZSwgdG9rZW5zLCBzdGFydCwgZW5kKSB7XG5cdFx0Ly8gSGFuZGxlIHJ1bGUgaW5zdGFuY2Vcblx0XHRpZiAocnVsZSBpbnN0YW5jZW9mIFJ1bGUpIHtcblx0XHRcdHJldHVybiBydWxlLnRlc3QodGhpcywgdG9rZW5zLCBzdGFydCwgZW5kKTtcblx0XHR9XG5cdFx0Ly8gSGFuZGxlIG5hbWVkIHJ1bGUgYnkgbG9va2luZyBpbiBvdXIgaW1wb3J0c1xuXHRcdGxldCBpbXBvcnRzID0gdGhpcy5pbXBvcnRzLCBpbmRleCA9IDAsIHBhcnNlcjtcblx0XHR3aGlsZSAocGFyc2VyID0gaW1wb3J0c1tpbmRleCsrXSkge1xuXHRcdFx0bGV0IG5leHRSdWxlID0gcGFyc2VyLl9ydWxlc1tydWxlXTtcblx0XHRcdGlmICghbmV4dFJ1bGUpIGNvbnRpbnVlO1xuXHRcdFx0bGV0IHJlc3VsdCA9IG5leHRSdWxlLnRlc3QodGhpcywgdG9rZW5zLCBzdGFydCwgZW5kKTtcblx0XHRcdGlmIChyZXN1bHQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cblxuXG4vL1xuLy8gIyMjIFx0SW1wb3J0c1xuLy9cdFx0UGFyc2VycyBkZXBlbmQgb24gb3RoZXIgcGFyc2VycyBmb3IgdGhlaXIgYHJ1bGVzYC5cbi8vXHRcdEltcG9ydHMgYXJlIGxhenktYm91bmQgKGFuZCB3ZSBhc3N1bWUgdGhlIGJ1aWxkIGZpbGUgd2lsbCBpbmNsdWRlIGFsbCBuZWNlc3NhcnkgaW1wb3J0cykuXG4vL1xuXG5cdC8vIEFkZCBvbmUgb3IgbW9yZSBuYW1lZCBpbXBvcnRzIHRvIHRoaXMgcGFyc2VyLlxuXHQvLyBJbXBvcnRzIGluY3JlYXNlIGluIHByaW9yaXR5IHRoZSBsYXRlciB0aGV5IGFyZSBpbiB0aGUgbGlzdC5cblx0aW1wb3J0KC4uLmltcG9ydHMpIHtcblx0XHQvLyBSRVZFUlNFIHRoZSBsaXN0IG9mIGltcG9ydHMsIHNvIHRoZSBtb3N0IGdlbmVyYWwgb25lIGlzIExBU1Rcblx0XHQvLyBUaHVzIG1vcmUgc3BlY2lmaWMgaW1wb3J0cyB3aWxsIGJlIEVBUkxJRVIgaW4gdGhlIGBpbXBvcnRzYCBsaXN0LlxuXG5cdFx0Ly8gQ3JlYXRlIG5ldyBhcnJheSBvZiBpbXBvcnRzIGFuZCBhZGQgaW1wb3J0IG5hbWVzIHBhc3NlZCBpbi5cblx0XHR0aGlzLl9pbXBvcnRzID0gKHRoaXMuX2ltcG9ydHMgfHwgW10pLmNvbmNhdChpbXBvcnRzLnJldmVyc2UoKSk7XG5cdFx0Ly8gY2xlYXIgbWVtb2l6ZSB2YXJpYWJsZSBmb3IgYGltcG9ydHNgLlxuXHRcdGRlbGV0ZSB0aGlzLl9faW1wb3J0cztcblx0fVxuXG5cdC8vIEdldHRlciB0byByZXR1cm4gbGlzdCBvZiBvdXIgYGltcG9ydHNgIGFzIGBQYXJzZXJgIG9iamVjdHMsIElOQ0xVRElORyBgdGhpc2AgcGFyc2VyIGl0c2VsZiFcblx0Ly8gTW9zdCBzcGVjaWZpYyBpbXBvcnQgKGVnOiBvdXJzZWxmKSBpcyBmaXJzdCBpbiB0aGUgbGlzdC5cblx0Ly8gVGhyb3dzIGlmIGFuIGltcG9ydCBjYW4ndCBiZSBmb3VuZC5cblx0Z2V0IGltcG9ydHMoKSB7XG5cdFx0aWYgKCF0aGlzLl9faW1wb3J0cykge1xuXHRcdFx0dmFyIGltcG9ydHMgPSAodGhpcy5faW1wb3J0cyA/IHRoaXMuX2ltcG9ydHMubWFwKFBhcnNlci5nZXRDb250ZXh0T3JEaWUpIDogW10pO1xuXHRcdFx0dGhpcy5fX2ltcG9ydHMgPSBbdGhpc10uY29uY2F0KGltcG9ydHMpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5fX2ltcG9ydHM7XG5cdH1cblxuXG4vL1xuLy8gIyMjIFJ1bGVzXG4vL1xuXHQvLyBTdGFydCB3aXRoIGFuIGVtcHR5IG1hcCBvZiBydWxlcy5cblx0X3J1bGVzID0ge307XG5cblx0Ly8gREFOR0VST1VTOiByZXR1cm4gbWFwIG9mIGFycmF5IG9mIG5hbWVkIHJ1bGVzIGZvciB1cyBhbmQgb3VyIGltcG9ydHNcblx0Ly8gTk9URTogV2UgbWVtb2l6ZSB0aGlzIGJ1dCB0aGVyZSdzIG5vdGhpbmcgdGhhdCByZXNldHMgdGhpcyB3aGVuIG91ciBpbXBvcnRzIGNoYW5nZSFcblx0Z2V0IHJ1bGVzKCkge1xuXHRcdGlmICghdGhpcy5fX3J1bGVzKSB7XG5cdFx0XHRsZXQgb3V0cHV0ID0gdGhpcy5fX3J1bGVzID0ge307XG5cdFx0XHQvLyBGb3IgZWFjaCBwYXJzZXJcblx0XHRcdHRoaXMuaW1wb3J0cy5mb3JFYWNoKHBhcnNlciA9PiB7XG5cdFx0XHRcdC8vIE1lcmdlIHJ1bGVzIGludG8gYW4gQWx0ZXJuYXRpdmVzIGluIG91dHB1dCBydWxlcy5cblx0XHRcdFx0Zm9yICh2YXIgcnVsZU5hbWUgaW4gcGFyc2VyLl9ydWxlcykge1xuXHRcdFx0XHRcdGxldCBydWxlID0gcGFyc2VyLl9ydWxlc1tydWxlTmFtZV07XG5cdFx0XHRcdFx0bGV0IGFsdGVybmF0aXZlcyA9IG91dHB1dFtydWxlTmFtZV0gfHwgKG91dHB1dFtydWxlTmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZSB9KSk7XG5cblx0XHRcdFx0XHRpZiAocnVsZSBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzXG5cdFx0XHRcdFx0ICYmIHJ1bGUucnVsZU5hbWUgPT09IHJ1bGVOYW1lXG5cdFx0XHRcdFx0ICYmICFydWxlLmFyZ3VtZW50XG5cdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRydWxlLnJ1bGVzLmZvckVhY2goIGFsdGVybmF0aXZlID0+IGFsdGVybmF0aXZlcy5hZGRSdWxlKGFsdGVybmF0aXZlKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGFsdGVybmF0aXZlcy5hZGRSdWxlKHJ1bGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLl9fcnVsZXM7XG5cdH1cblxuXHQvLyBBZGQgYSBgcnVsZWAgdG8gb3VyIGxpc3Qgb2YgcnVsZXMhXG5cdC8vIENvbnZlcnRzIHRvIGBhbHRlcm5hdGl2ZXNgIG9uIHJlLWRlZmluaW5nIHRoZSBzYW1lIHJ1bGUuXG5cdGFkZFJ1bGUocnVsZU5hbWUsIHJ1bGUpIHtcblx0XHQvLyBDbGVhciBtZW1vaXplZCBgX19ydWxlc2Bcblx0XHRkZWxldGUgdGhpcy5fX3J1bGVzO1xuXG5cdFx0Ly8gSWYgcGFzc2VkIGEgZnVuY3Rpb24sIGNyZWF0ZSBhbiBpbnN0YW5jZSBmb3IgdGhlIGFjdHVhbCBydWxlLlxuXHRcdC8vIFRoaXMgaXMgY29tbW9ubHkgZG9uZSBzbyBKUyB3aWxsIGdpdmUgdXMgbWVhbmluZ2Z1bCBjbGFzcyBuYW1lcyBpbiBkZWJ1ZyBvdXRwdXQuXG5cdFx0aWYgKHR5cGVvZiBydWxlID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHJ1bGUgPSBuZXcgcnVsZSgpO1xuXHRcdH1cblxuXHRcdC8vIElmIHdlIGdvdCBhbiBhcnJheSBvZiBgcnVsZU5hbWVzYCwgcmVjdXJzaXZlbHkgYWRkIHVuZGVyIGVhY2ggbmFtZSB3aXRoIHRoZSBzYW1lIGBydWxlYC5cblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlTmFtZSkpIHtcblx0XHRcdHJ1bGVOYW1lLmZvckVhY2gocnVsZU5hbWUgPT4gdGhpcy5hZGRSdWxlKHJ1bGVOYW1lLCBydWxlKSApO1xuXHRcdFx0cmV0dXJuIHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gU2V0IGBydWxlTmFtZWAgaWYgaXQgaGFzbid0IGJlZW4gZXhwbGljaXRseSBzZXQuXG5cdFx0aWYgKCFydWxlLnJ1bGVOYW1lKSBydWxlLnJ1bGVOYW1lID0gcnVsZU5hbWU7XG5cblx0XHQvLyBJZiBhIHJ1bGUgb2YgdGhpcyBuYW1lIGFscmVhZHkgZXhpc3RzXG5cdFx0Y29uc3QgZXhpc3RpbmcgPSB0aGlzLl9ydWxlc1tydWxlTmFtZV07XG5cdFx0aWYgKGV4aXN0aW5nKSB7XG5cdFx0XHQvLyBDb252ZXJ0IHRvIGFuIGBBbHRlcm5hdGl2ZXNgIGlmIG5vdCBvbmUgYWxyZWFkeS5cblx0XHRcdGlmICghKGV4aXN0aW5nIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXMpKSB7XG5cdFx0XHRcdGlmIChQYXJzZXIuREVCVUcpIGNvbnNvbGUubG9nKGBDb252ZXJ0aW5nIHJ1bGUgJyR7cnVsZU5hbWV9JyB0byBhbHRlcm5hdGl2ZXNgKTtcblx0XHRcdFx0dGhpcy5fcnVsZXNbcnVsZU5hbWVdID0gbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZU5hbWUsIHJ1bGVzOiBbZXhpc3RpbmddIH0pO1xuXHRcdFx0XHQvLyBjb3B5IGFyZ3VtZW50IG5hbWUgb3ZlciAoPz8/KVxuXHRcdFx0XHRpZiAoZXhpc3RpbmcuYXJndW1lbnQpIHRoaXMuX3J1bGVzW3J1bGVOYW1lXS5hcmd1bWVudCA9IGV4aXN0aW5nLmFyZ3VtZW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5ERUJVRykgY29uc29sZS5sb2coYEFkZGluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JyB0byAnJHtydWxlTmFtZX0nOiBgLCBydWxlKTtcblx0XHRcdC8vIEFkZCBydWxlIHRvIHRoZSBhbHRlcm5hdGl2ZXMuXG5cdFx0XHR0aGlzLl9ydWxlc1tydWxlTmFtZV0uYWRkUnVsZShydWxlKTtcblx0XHR9XG5cdFx0Ly8gT3RoZXJ3aXNlIGp1c3QgcmVtZW1iZXIgdGhlIHJ1bGUuXG5cdFx0ZWxzZSB7XG5cdFx0XHR0aGlzLl9ydWxlc1tydWxlTmFtZV0gPSBydWxlO1xuXHRcdH1cblxuXG5cdFx0Ly8gbWFrZSBhIG5vdGUgaWYgd2UncmUgYWRkaW5nIGEgbGVmdC1yZWN1cnNpdmUgcnVsZVxuLy9UT0RPOiB0aGlzIGRvZXNuJ3QgZmx5IGlmIGFkZGluZyB1bmRlciBtdWx0aXBsZSBuYW1lcy4uLiAgOi0oXG5cdFx0aWYgKFBhcnNlci5ydWxlSXNMZWZ0UmVjdXJzaXZlKHJ1bGVOYW1lLCBydWxlKSkge1xuXHRcdFx0aWYgKCFydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFcnJvciBkZWZpbmluZyBydWxlICcke3J1bGVOYW1lfSc6IE9ubHkgU2VxdWVuY2UgcnVsZXMgY2FuIGJlIGxlZnRSZWN1c2l2ZWApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gWW91IG11c3QgZGVmaW5lIGEgYHRlc3RSdWxlYCBmb3IgbGVmdCByZWN1cnNpdmUgc2VxdWVuY2VzLlxuXHRcdFx0Ly8gZS5nLiBgdGVzdFJ1bGUgPSBuZXcgUnVsZS5NYXRjaCh7IG1hdGNoOiBbXCJzb21ldGhpbmdcIl0gfSlgXG5cdFx0XHRpZiAoIXJ1bGUudGVzdFJ1bGUpIHtcblx0XHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXJyb3IgZGVmaW5pbmcgcnVsZSAnJHtydWxlLnJ1bGVOYW1lfSc6IFlvdSBtdXN0IGRlZmluZSBhICd0ZXN0UnVsZScgZm9yIGxlZnRSZWN1c2l2ZSBydWxlcy5gKTtcblx0XHRcdH1cblx0XHRcdGlmIChQYXJzZXIuREVCVUcpIGNvbnNvbGUuaW5mbyhcIm1hcmtpbmcgXCIsIHJ1bGUsIFwiIGFzIGxlZnQgcmVjdXJzaXZlIVwiKTtcblxuXHRcdFx0cnVsZS5sZWZ0UmVjdXJzaXZlID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cbi8vXG4vLyAjIyMgUGFyc2VyIHJlZ2lzdHJ5LlxuLy9cblx0c3RhdGljIFJFR0lTVFJZID0ge307XG5cblx0Ly8gR2V0IGEgcGFyc2VyIGZvciBhIGdpdmVuIGBjb250ZXh0TmFtZWAuXG5cdC8vIFdpbGwgcmUtdXNlIGV4aXN0aW5nIHBhcnNlciwgb3IgY3JlYXRlIGEgbmV3IG9uZSBpZiBub3QgYWxyZWFkeSBkZWZpbmVkLlxuXHRzdGF0aWMgZm9yQ29udGV4dChjb250ZXh0TmFtZSkge1xuXHRcdGlmICghUGFyc2VyLlJFR0lTVFJZW2NvbnRleHROYW1lXSkge1xuXHRcdFx0UGFyc2VyLlJFR0lTVFJZW2NvbnRleHROYW1lXSA9IG5ldyBQYXJzZXIoeyBjb250ZXh0TmFtZSB9KTtcblx0XHR9XG5cdFx0cmV0dXJuIFBhcnNlci5SRUdJU1RSWVtjb250ZXh0TmFtZV07XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBwYXJzZXIgZm9yIGBjb250ZXh0TmFtZWAgb3IgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIG5vdCBmb3VuZC5cblx0c3RhdGljIGdldENvbnRleHRPckRpZShjb250ZXh0TmFtZSkge1xuXHRcdGlmIChQYXJzZXIuUkVHSVNUUllbY29udGV4dE5hbWVdKSByZXR1cm4gUGFyc2VyLlJFR0lTVFJZW2NvbnRleHROYW1lXTtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBQYXJzZXIuZ2V0Q29udGV4dE9yRGllKCk6IGNvbnRleHROYW1lICcke2NvbnRleHROYW1lfScgbm90IGZvdW5kLmApO1xuXHR9XG5cblxuXG4vL1xuLy8gIyMgVXRpbGl0eSBtZXRob2RzXG4vL1xuXG5cdC8vIElzIHRoZSBzcGVjaWZpZWQgcnVsZSBsZWZ0LXJlY3Vyc2l2ZT9cblx0Ly8gVHJ1ZSBmb3Igc2VxdWVuY2VzIHdoZXJlIHRoZSBmaXJzdCBub24tb3B0aW9uYWwgcnVsZSByZWN1cnNpdmVseSBjYWxscyBgcnVsZU5hbWVgLlxuXHRzdGF0aWMgcnVsZUlzTGVmdFJlY3Vyc2l2ZShydWxlTmFtZSwgcnVsZSkge1xuXHRcdGlmICghKHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlKSB8fCAhcnVsZS5ydWxlcykgcmV0dXJuIGZhbHNlO1xuLy9jb25zb2xlLmxvZyhydWxlTmFtZSwgcnVsZSk7XG5cdFx0bGV0IGluZGV4ID0gMCwgc3VicnVsZSA9IHVuZGVmaW5lZDtcblx0XHR3aGlsZSAoc3VicnVsZSA9IHJ1bGUucnVsZXNbaW5kZXgrK10pIHtcblx0XHRcdC8vIGlnbm9yZSBvcHRpb25hbCBydWxlc1xuXHRcdFx0aWYgKHN1YnJ1bGUub3B0aW9uYWwpIGNvbnRpbnVlO1xuXHRcdFx0aWYgKHN1YnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN1YnJ1bGUgJiYgc3VicnVsZS5ydWxlID09PSBydWxlTmFtZSkgcmV0dXJuIHRydWU7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gXG5cdC8vXHRpbiBhcnJheSBvZiBgdG9rZW5zYCAoc3RyaW5ncykuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnQsIGVuZCwgc2xpY2UgfWBcblx0Ly8gVGhyb3dzIGlmIHVuc3VjZXNzZnVsLlxuXHRzdGF0aWMgZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIHN0YXJ0VG9rZW4sIGVuZFRva2VuLCBzdGFydCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0XSAhPT0gc3RhcnRUb2tlbikgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBFeHBlY3RlZCAnJHtzdGFydFRva2VufScgYXQgaW5kZXggJHtzdGFydH0gb2YgdG9rZW5zYCk7XG5cdFx0bGV0IG5lc3RpbmcgPSAwO1xuXHRcdGxldCBuZXN0ZWQgPSBmYWxzZTtcblx0XHRmb3IgKGxldCBlbmQgPSBzdGFydCArIDEsIGxhc3RJbmRleCA9IHRva2Vucy5sZW5ndGg7IGVuZCA8IGxhc3RJbmRleDsgZW5kKyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRdO1xuXHRcdFx0aWYgKHRva2VuID09PSBzdGFydFRva2VuKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdFx0bmVzdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0b2tlbiA9PT0gZW5kVG9rZW4pIHtcblx0XHRcdFx0aWYgKG5lc3RpbmcgPT09IDApXG5cdFx0XHRcdFx0cmV0dXJuIHsgc3RhcnQsIGVuZCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydCsxLCBlbmQpLCBuZXN0ZWQgfTtcblx0XHRcdFx0bmVzdGluZy0tO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENvdWxkbid0IGZpbmQgbWF0Y2hpbmcgJyR7ZW5kVG9rZW59J3Mgc3RhcnRpbmcgYXQgaXRlbSAke3N0YXJ0fWApO1xuXHR9XG5cblxuXHQvLyBMaXN0IG9mIHNwZWNpYWwgY2hhcmFjdGVycyBpbiByZWd1bGFyIGV4cHJlc3Npb25zLlxuXHQvLyBVc2VkIHRvIGVzY2FwZSB0aG9zZSBjaGFycyB3aGVuIGNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbnMgZnJvbSBzdHJpbmdzLlxuXHRzdGF0aWMgUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyA9IChmdW5jdGlvbigpIHtcblx0XHRjb25zdCBjaGFycyA9IHt9O1xuXHRcdFwiXFxcXC9eJCorPy4oKXx7fSxbXVwiLnNwbGl0KFwiXCIpLmZvckVhY2goY2hhciA9PiBjaGFyc1tjaGFyXSA9IHRydWUpO1xuXHRcdHJldHVybiBjaGFycztcblx0fSkoKVxuXG5cdC8vIEdpdmVuIGEgXCJub3JtYWxcIiBgc3RyaW5nYCwgZXNjYXBlIGFueSByZWd1bGFyIGV4cHJlc3Npb24gc3BlY2lhbCBjaGFyYWN0ZXJzXG5cdC8vXHRzbyB3ZSBjYW4gY3JlYXRlIGEgYG5ldyBSZWdFeHAoKWAuXG5cdC8vIEFsc28gY29udmVydHMgYSBzaW5nbGUgc3BhY2UgdG8gYXJiaXRyYXJ5IHNldCBvZiBzcGFjZXMgd2l0aCBcIlxccytcIlxuXHRzdGF0aWMgZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpIHtcblx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KFwiXCIpLm1hcChmdW5jdGlvbiAoY2hhciwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3IgYmFja3NsYXNoXG5cdFx0XHRpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIjtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igc3BhY2Vcblx0XHRcdGlmIChjaGFyID09PSBcIiBcIikgcmV0dXJuIFwiXFxcXHMrXCI7XG5cdFx0XHQvLyBJZiBhIHNwZWNpYWwgY2hhciBhbmQgcHJldmlvdXMgY2hhcmFjdGVyIHdhcyBub3QgYW4gZXNjYXBlLCBlc2NhcGUgdGhlIHJlc3VsdC5cblx0XHRcdGlmIChQYXJzZXIuUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSU1tjaGFyXSAmJiBsaXN0W2luZGV4LTFdICE9PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiK2NoYXI7XG5cdFx0XHQvLyBUaGlzIGNoYXIgc2hvdWxkIGJlIGZpbmUgYnkgaXRzZWxmLlxuXHRcdFx0cmV0dXJuIGNoYXI7XG5cdFx0fSkuam9pbihcIlwiKTtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyByZWd1bGFyIGV4cHJlc3Npb24gZnJvbSBhIFwibm9ybWFsXCIgc3RyaW5nLCBlc2NhcGluZyBzcGVjaWFsIGNoYXJhY3RlcnMgYXMgbmVjZXNzYXJ5LlxuXHRzdGF0aWMgUmVnRXhwRnJvbVN0cmluZyhzdHJpbmcsIGZsYWdzKSB7XG5cdFx0cmV0dXJuIG5ldyBSZWdFeHAoUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSwgZmxhZ3MpO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0LCBlbmQpYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHRva2Vucywgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBtYXRjaGVkYFx0XHRSZXN1bHRzIG9mIHlvdXIgcGFyc2UuXG4vL1x0XHRcdC0gYG5leHRTdGFydGBcdFBsYWNlIHdoZXJlIG5leHQgbWF0Y2ggc2hvdWxkIHN0YXJ0IChlZzogb25lIGJleW9uZCB3aGF0IHlvdSBtYXRjaGVkKS5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLnJlc3VsdHNgXHRcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZShjb250ZXh0KWBcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcblxuaW1wb3J0IGdsb2JhbCBmcm9tIFwiLi91dGlscy9nbG9iYWxcIjtcbmltcG9ydCB7IGdldFRhYnMgfSBmcm9tIFwiLi91dGlscy9zdHJpbmdcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKC4uLnByb3BzKSB7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCAuLi5wcm9wcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0cmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMsIHByb3BzKTtcblx0fVxuXG4vL1xuLy9cdFBhcnNpbmcgcHJpbWl0aXZlcyAtLSB5b3UgTVVTVCBpbXBsZW1lbnQgdGhlc2UgaW4geW91ciBzdWJjbGFzc2VzIVxuLy9cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcnVsZSBiZXR3ZWVuIGBzdGFydGAgYW5kIGBlbmRgIG9mIGB0b2tlbnNgLlxuXHQvLyBSZXR1cm5zIHJlc3VsdHMgb2YgdGhlIHBhcnNlIG9yIGB1bmRlZmluZWRgLlxuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQsIHN0YWNrKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGJpdHMgb2Ygb3VyIHJ1bGUgYXJlIGZvdW5kIEFOWVdIRVJFIGJldHdlZW4gYHN0YXJ0YCBhbmQgYGVuZGAgaW4gdGhlIGB0b2tlbnNgLlxuXHQvLyBUaGlzIGlzIHVzZWQgYnkgY29tcGxpY2F0ZWQgKGVnOiBsZWZ0IHJlY3Vyc2l2ZSkgcnVsZXMgdG8gZXhpdCBxdWlja2x5IGlmIHRoZXJlJ3Mgbm8gY2hhbmNlLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdHJ1ZWAgaWYgdGhlIHJ1bGUgTUlHSFQgYmUgbWF0Y2hlZC5cblx0Ly9cdC0gYGZhbHNlYCBpZiB0aGVyZSBpcyBubyB3YXkgdGhlIHJ1bGUgY2FuIGJlIG1hdGNoZWQuXG5cdC8vXHQtIGB1bmRlZmluZWRgIGlmIG5vdCBkZXRlcm1pbnN0aWMgKGVnOiBubyB3YXkgdG8gdGVsbCBxdWlja2x5KS5cblx0dGVzdChwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0YWRkVG9CbGFja2xpc3QoLi4ud29yZHMpIHtcblx0XHRpZiAoIXRoaXMuYmxhY2tsaXN0KSB0aGlzLmJsYWNrbGlzdCA9IHt9O1xuXHRcdHdvcmRzLmZvckVhY2god29yZCA9PiB0aGlzLmJsYWNrbGlzdFt3b3JkXSA9IHRydWUpO1xuXHR9XG5cbi8vXG4vLyAjIyBvdXRwdXQgYXMgc291cmNlXG4vL1xuXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBOT1RFOiB5b3UgbWF5IHdhbnQgdG8gbWVtb2l6ZSB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvLyBPdXRwdXQgdmFsdWUgZm9yIHRoaXMgSU5TVEFOVElBVEVEIHJ1bGUgYXMgc291cmNlLlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG5cblxuLy8gUnVsZSBmb3Igb25lIG9yIG1vcmUgc2VxdWVudGlhbCBsaXRlcmFsIHZhbHVlcyB0byBtYXRjaCwgd2hpY2ggaW5jbHVkZSBwdW5jdHVhdGlvbiBzdWNoIGFzIGAoYCBldGMuXG5SdWxlLk1hdGNoID0gY2xhc3MgbWF0Y2ggZXh0ZW5kcyBSdWxlIHtcblx0Y29uc3RydWN0b3IoLi4ucHJvcHMpIHtcblx0XHRzdXBlciguLi5wcm9wcyk7XG5cdFx0Ly8gY29lcmNlIHRvIGFuIGFycmF5IChhIGJpdCBzbG93ZXIgYnV0IGNsZWFuZXIpLlxuXHRcdGlmICghQXJyYXkuaXNBcnJheSh0aGlzLm1hdGNoKSkgdGhpcy5tYXRjaCA9IFt0aGlzLm1hdGNoXTtcblx0fVxuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBydWxlIGluIHRoZSBgdG9rZW5zYC5cblx0Ly8gUmV0dXJucyByZXN1bHRzIG9mIHRoZSBwYXJzZSBvciBgdW5kZWZpbmVkYC5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kLCBzdGFjaykge1xuXHRcdGlmICghdGhpcy5oZWFkU3RhcnRzV2l0aCh0aGlzLm1hdGNoLCB0b2tlbnMsIHN0YXJ0LCBlbmQpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdC8vIGlmIG9ubHkgb25lIGFuZCB3ZSBoYXZlIGEgYmxhY2tsaXN0LCBtYWtlIHN1cmUgaXQncyBub3QgaW4gdGhlIGJsYWNrbGlzdCFcblx0XHRpZiAodGhpcy5tYXRjaC5sZW5ndGggPT09IDEgJiYgdGhpcy5ibGFja2xpc3QgJiYgdGhpcy5ibGFja2xpc3RbdGhpcy5tYXRjaFswXV0pIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiB0aGlzLm1hdGNoLmpvaW4odGhpcy5tYXRjaERlbGltaXRlciksXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0ICsgdGhpcy5tYXRjaC5sZW5ndGhcblx0XHR9KTtcblx0fVxuXG5cdC8vIERvZXMgdGhpcyBtYXRjaCBhcHBlYXIgYW55d2hlcmUgaW4gdGhlIHRva2Vucz9cblx0dGVzdChwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRsZXQgbWF0Y2hTdGFydCA9IHRva2Vucy5pbmRleE9mKHRoaXMubWF0Y2hbMF0sIHN0YXJ0KTtcblx0XHRyZXR1cm4gbWF0Y2hTdGFydCAhPT0gLTEgJiYgdGhpcy5oZWFkU3RhcnRzV2l0aCh0aGlzLm1hdGNoLCB0b2tlbnMsIG1hdGNoU3RhcnQsIGVuZCk7XG5cdH1cblxuXHQvLyBEb2VzIHRoZSBoZWFkIG9mIHRoZSB0b2tlbnMgc3RhcnQgd2l0aCBhbiBhcnJheSBvZiBtYXRjaGVzP1xuXHRoZWFkU3RhcnRzV2l0aChtYXRjaGVzLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kID0gdG9rZW5zLmxlbmd0aCkge1xuXHRcdC8vIGJhaWwgaWYgbWF0Y2ggd291bGQgZ28gYmV5b25kIHRoZSBlbmRcblx0XHRpZiAoc3RhcnQgKyBtYXRjaGVzLmxlbmd0aCA+IGVuZCkgcmV0dXJuIGZhbHNlO1xuXG5cdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBvbmUgbWF0Y2gsIG1heWJlIHByZW1hdHVyZSBvcHRpbWl6YXRpb24gYnV0Li4uXG5cdFx0aWYgKG1hdGNoZXMubGVuZ3RoID09PSAxKSByZXR1cm4gKG1hdGNoZXNbMF0gPT09IHRva2Vuc1tzdGFydF0pO1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBtYXRjaGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZiAobWF0Y2hlc1tpXSAhPT0gdG9rZW5zW3N0YXJ0ICsgaV0pIHJldHVybiBmYWxzZVxuXHRcdH1cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLm1hdGNoLmpvaW4odGhpcy5tYXRjaERlbGltaXRlcil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuUnVsZS5NYXRjaC5wcm90b3R5cGUubWF0Y2hEZWxpbWl0ZXIgPSBcIlwiO1xuXG5cbi8vIFN5bnRhY3RpYyBzdWdhciB0byBzZXBhcmF0ZSBgc3ltYm9sc2AgKHdoaWNoIGRvbid0IHJlcXVpcmUgc3BhY2VzKSBmcm9tIGBrZXl3b3Jkc2AgKHdoaWNoIGRvKS5cblJ1bGUuU3ltYm9sID0gY2xhc3Mgc3ltYm9sIGV4dGVuZHMgUnVsZS5NYXRjaCB7fVxuXG5SdWxlLktleXdvcmQgPSBjbGFzcyBrZXl3b3JkIGV4dGVuZHMgUnVsZS5NYXRjaCB7fVxuUnVsZS5LZXl3b3JkLnByb3RvdHlwZS5tYXRjaERlbGltaXRlciA9IFwiIFwiO1xuXG5cblxuLy8gUmVnZXggcGF0dGVybiB0byBtYXRjaCBhIFNJTkdMRSB0b2tlbi5cbi8vIGBydWxlLnBhdHRlcm5gIGlzIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2guXG4vLyBOb3RlIHRoYXQgeW91IE1VU1Qgc3RhcnQgeW91ciBwYXR0ZXJuIHdpdGggYF5gIGFuZCBlbmQgd2l0aCBgJGAgdG8gbWFrZSBzdXJlIGl0IG1hdGNoZXMgdGhlIGVudGlyZSB0b2tlbi5cbi8vIE5vdGUgdGhhdCB0aGlzIGNhbiBvbmx5IG1hdGNoIGEgc2luZ2xlIHRva2VuIVxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcGF0dGVybiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSB0b2tlbnMuXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCwgc3RhY2spIHtcblx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbc3RhcnRdO1xuXHRcdGlmICh0eXBlb2YgdG9rZW4gIT09IFwic3RyaW5nXCIpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgbWF0Y2ggPSB0b2tlbi5tYXRjaCh0aGlzLnBhdHRlcm4pO1xuXHRcdGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBiYWlsIGlmIHByZXNlbnQgaW4gYmxhY2tsaXN0XG5cdFx0bGV0IG1hdGNoZWQgPSBtYXRjaFswXTtcblx0XHRpZiAodGhpcy5ibGFja2xpc3QgJiYgdGhpcy5ibGFja2xpc3RbbWF0Y2hlZF0pIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0bmV4dFN0YXJ0OiBzdGFydCArIDFcblx0XHR9KTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgcGF0dGVybiBpcyBmb3VuZCBBTllXSEVSRSBpbiB0aGUgdG9rZW5zLlxuXHR0ZXN0KHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdHJldHVybiB0b2tlbnMuc2xpY2Uoc3RhcnQsIGVuZCkuc29tZSh0b2tlbiA9PiB0eXBlb2YgdG9rZW4gPT09IFwic3RyaW5nXCIgJiYgdG9rZW4ubWF0Y2godGhpcy5wYXR0ZXJuKSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5wYXR0ZXJuLnNvdXJjZTtcblx0fVxufVxuXG5cbi8vIFN1YnJ1bGUgLS0gbmFtZSBvZiBhbm90aGVyIHJ1bGUgdG8gYmUgY2FsbGVkLlxuLy8gYHJ1bGUucnVsZWAgaXMgdGhlIG5hbWUgb2YgdGhlIHJ1bGUgaW4gYHBhcnNlci5ydWxlc2AuXG5SdWxlLlN1YnJ1bGUgPSBjbGFzcyBTdWJydWxlIGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCwgc3RhY2spIHtcblx0XHRsZXQgcmVzdWx0ID0gcGFyc2VyLnBhcnNlUnVsZU9yRGllKHRoaXMucnVsZSwgdG9rZW5zLCBzdGFydCwgZW5kLCBzdGFjaywgYHBhcnNlIHN1YnJ1bGUgJyR7dGhpcy5ydWxlfSdgKTtcblx0XHRpZiAoIXJlc3VsdCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSByZXN1bHQuYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIGFsdGVybmF0aXZlcyBhcmUgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHRva2Vucy5cblx0dGVzdChwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRyZXR1cm4gcGFyc2VyLnRlc3RSdWxlKHRoaXMucnVsZSwgdG9rZW5zLCBzdGFydCk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYHske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZX19JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cbi8vIFNlcXVlbmNlIG9mIHJ1bGVzIHRvIG1hdGNoLlxuUnVsZS5TZXF1ZW5jZSA9IGNsYXNzIFNlcXVlbmNlIGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCwgc3RhY2spIHtcblx0XHQvLyBJZiB3ZSBoYXZlIGEgYHRlc3RSdWxlYCBkZWZpbmVkXG5cdFx0aWYgKHRoaXMudGVzdFJ1bGUpIHtcblx0XHRcdC8vIEZvcmdldCBpdCBpZiB0aGVyZSBpcyBOTyBXQVkgdGhlIHJ1bGUgY291bGQgYmUgbWF0Y2hlZC5cblx0XHRcdGlmIChwYXJzZXIudGVzdFJ1bGUodGhpcy50ZXN0UnVsZSwgdG9rZW5zLCBzdGFydCkgPT09IGZhbHNlKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdC8vIElmIHdlJ3JlIGEgbGVmdFJlY3Vyc2l2ZSBzZXF1ZW5jZS4uLlxuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdC8vIElmIHRoZSBzdGFjayBhbHJlYWR5IGNvbnRhaW5zIHRoaXMgcnVsZSwgZm9yZ2V0IGl0LlxuXHRcdFx0aWYgKHN0YWNrICYmIHN0YWNrLmluY2x1ZGVzKHRoaXMpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0XHQvLyBDbG9uZSBzdGFjayBhbmQgYWRkIHRoaXMgcnVsZSBmb3IgcmVjdXJzaW9uLi4uXG5cdFx0XHRzdGFjayA9IHN0YWNrID8gc3RhY2suY29uY2F0KCkgOiBbXTtcblx0XHRcdHN0YWNrLnB1c2godGhpcyk7XG5cblx0XHRcdC8vIFRPRE86IFdlIGNvdWxkIGRpc3Rpbmd1aXNoIGJldHdlZW4gcHJvZHVjdGl2ZSBhbmQgdW5wcm9kdWN0aXZlIHJ1bGVzXG5cdFx0XHQvL1x0XHQgYnkgY2hlY2tpbmcgb25seSBydWxlcyB3aGljaCBvY2N1ciBhdCB0aGUgc2FtZSBgc3RhcnRgLi4uXG5cdFx0XHQvL1x0XHQgVGhpcyB3b3VsZCBwcm9iYWJseSBhbGxvdyBtb3JlIGludGVyZXN0aW5nIHRoaW5ncywgYnV0IGl0J3MgbXVjaCBtdWNoIHNsb3dlci5cblx0XHR9XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuXHRcdGxldCBuZXh0U3RhcnQgPSBzdGFydDtcblx0XHRsZXQgaW5kZXggPSAwLCBydWxlID0gdW5kZWZpbmVkO1xuXHRcdHdoaWxlIChydWxlID0gdGhpcy5ydWxlc1tpbmRleCsrXSkge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHRva2VucywgbmV4dFN0YXJ0LCBlbmQsIHN0YWNrKTtcblx0XHRcdGlmICghbWF0Y2ggJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdFx0bmV4dFN0YXJ0ID0gbWF0Y2gubmV4dFN0YXJ0O1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBpZiB3ZSBnZXQgaGVyZSwgd2UgbWF0Y2hlZCBhbGwgdGhlIHJ1bGVzIVxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHRuZXh0U3RhcnRcblx0XHR9KTtcblx0fVxuXG5cbi8vVE9ET0Ncblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gb2JqZWN0IHdpdGggcHJvcGVydGllcyBmcm9tIHRoZSBgbWF0Y2hlZGAgYXJyYXkgaW5kZXhlZCBieVxuXHQvL1x0XHQtIGBtYXRjaC5hcmd1bWVudGA6XHRcdGFyZ3VtZW50IHNldCB3aGVuIHJ1bGUgd2FzIGRlY2xhcmVkLCBlZzogYHt2YWx1ZTpsaXRlcmFsfWAgPT4gYHZhbHVlYFxuXHQvL1x0XHQtIGBtYXRjaC5ydWxlTmFtZWA6XHRcdG5hbWUgb2YgcnVsZSB3aGVuIGRlZmluZWRcblx0Ly9cdFx0LSBgcnVsZSB0eXBlYDpcdFx0XHRcdG5hbWUgb2YgdGhlIHJ1bGUgdHlwZVxuXHQvLyBOT1RFOiBtZW1vaXplcyB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0bGV0IHJlc3VsdHMgPSB0aGlzLmFkZFJlc3VsdHMoe30sIHRoaXMubWF0Y2hlZCk7XG5cdFx0aWYgKHRoaXMuY29tbWVudCkgcmVzdWx0cy5jb21tZW50ID0gdGhpcy5jb21tZW50O1xuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9XG5cblx0YWRkUmVzdWx0cyhyZXN1bHRzLCBtYXRjaGVkKSB7XG5cdFx0bGV0IGluZGV4ID0gMCwgbWF0Y2ggPSB1bmRlZmluZWQ7XG5cdFx0d2hpbGUgKG1hdGNoID0gbWF0Y2hlZFtpbmRleCsrXSkge1xuXHRcdFx0aWYgKG1hdGNoLnByb21vdGUpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuYWRkUmVzdWx0cyhyZXN1bHRzLCBtYXRjaC5tYXRjaGVkKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRsZXQgYXJnTmFtZSA9IG1hdGNoLmFyZ3VtZW50IHx8IG1hdGNoLnJ1bGVOYW1lIHx8IG1hdGNoLmNvbnN0cnVjdG9yLm5hbWU7XG5cdFx0XHRcdC8vIElmIGFyZyBhbHJlYWR5IGV4aXN0cywgY29udmVydCB0byBhbiBhcnJheVxuXHRcdFx0XHRpZiAoYXJnTmFtZSBpbiByZXN1bHRzKSB7XG5cdFx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KHJlc3VsdHNbYXJnTmFtZV0pKSByZXN1bHRzW2FyZ05hbWVdID0gW3Jlc3VsdHNbYXJnTmFtZV1dO1xuXHRcdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0ucHVzaChtYXRjaCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmVzdWx0c1thcmdOYW1lXSA9IG1hdGNoO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGB0b1NvdXJjZSgpYCBmb3Igb3VyIGByZXN1bHRzYCBhcyBhIG1hcC5cblx0Ly8gSWYgeW91IHBhc3MgYGtleXNgLCB3ZSdsbCByZXN0cmljdCB0byBqdXN0IHRob3NlIGtleXMuXG5cdGdldE1hdGNoZWRTb3VyY2UoY29udGV4dCwgLi4ua2V5cykge1xuXHRcdGxldCByZXN1bHRzID0gdGhpcy5yZXN1bHRzO1xuXHRcdGxldCBvdXRwdXQgPSB7fTtcblx0XHRpZiAoIWtleXMubGVuZ3RoKSBrZXlzID0gT2JqZWN0LmtleXMocmVzdWx0cyk7XG5cdFx0a2V5cy5mb3JFYWNoKGtleSA9PiB7XG5cdFx0XHRsZXQgdmFsdWUgPSByZXN1bHRzW2tleV07XG5cdFx0XHRpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuO1xuXHRcdFx0aWYgKHZhbHVlLnRvU291cmNlKSBvdXRwdXRba2V5XSA9IHZhbHVlLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0ZWxzZSBvdXRwdXRba2V5XSA9IHZhbHVlO1xuXHRcdH0pO1xuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHQvLyBFY2hvIHRoaXMgcnVsZSBiYWNrIG91dC5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMucnVsZXMuam9pbihcIiBcIil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxuXG59XG5cbi8vIFN5bnRhY3RpYyBzdWdhciBmb3IgZGVidWdnaW5nXG5SdWxlLkV4cHJlc3Npb24gPSBjbGFzcyBleHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIEEgc3RhdGVtZW50IHRha2VzIHVwIHRoZSBlbnRpcmUgbGluZS5cblJ1bGUuU3RhdGVtZW50ID0gY2xhc3Mgc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7fVxuXG5cbi8vIEFsdGVybmF0aXZlIHN5bnRheCwgbWF0Y2hpbmcgb25lIG9mIGEgbnVtYmVyIG9mIGRpZmZlcmVudCBydWxlcy5cbi8vIFRoZSByZXN1bHQgb2YgYSBwYXJzZSBpcyB0aGUgbG9uZ2VzdCBydWxlIHRoYXQgYWN0dWFsbHkgbWF0Y2hlZC5cbi8vIE5PVEU6IEN1cnJlbnRseSB0YWtlcyB0aGUgbG9uZ2VzdCB2YWxpZCBtYXRjaC5cbi8vIFRPRE86IG1hdGNoIGFsbCB2YWxpZCBhbHRlcm5hdGl2ZXNcbi8vIFRPRE86IHJlbmFtZT9cblJ1bGUuQWx0ZXJuYXRpdmVzID0gY2xhc3MgQWx0ZXJuYXRpdmVzIGV4dGVuZHMgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKC4uLnByb3BzKSB7XG5cdFx0c3VwZXIoLi4ucHJvcHMpO1xuXHRcdGlmICghdGhpcy5ydWxlcykgdGhpcy5ydWxlcyA9IFtdO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYW55IG9mIG91ciBhbHRlcm5hdGl2ZXMgYXJlIGZvdW5kIEFOWVdIRVJFIGluIHRoZSB0b2tlbnMuXG5cdC8vIE5PVEU6IHRoaXMgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIGlmIHdlJ3JlIHNwZWNpZmllZCBhcyBhIGB0ZXN0UnVsZWBcblx0Ly9cdFx0IGFuZCB0aGVuIG9ubHkgaWYgYWxsIG9mIG91ciBydWxlcyBhcmUgZGV0ZXJtaW5pc3RpYy5cblx0dGVzdChwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRsZXQgaW5kZXggPSAwLCBydWxlID0gdW5kZWZpbmVkO1xuXHRcdHdoaWxlIChydWxlID0gdGhpcy5ydWxlc1tpbmRleCsrXSkge1xuXHRcdFx0aWYgKHJ1bGUudGVzdChwYXJzZXIsIHRva2Vucywgc3RhcnQsIGVuZCkpIHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBGaW5kIGFsbCBydWxlcyB3aGljaCBtYXRjaCBhbmQgZGVsZWdhdGUgdG8gYGdldEJlc3RNYXRjaCgpYCB0byBwaWNrIHRoZSBiZXN0IG9uZS5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kLCBzdGFjaykge1xuXHRcdGxldCBtYXRjaGVzID0gW107XG5cdFx0bGV0IGluZGV4ID0gMCwgcnVsZSA9IHVuZGVmaW5lZDtcblx0XHR3aGlsZSAocnVsZSA9IHRoaXMucnVsZXNbaW5kZXgrK10pIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0LCBlbmQsIHN0YWNrKTtcblx0XHRcdGlmIChtYXRjaCkgbWF0Y2hlcy5wdXNoKG1hdGNoKTtcblx0XHR9XG5cblx0XHRpZiAoIW1hdGNoZXMubGVuZ3RoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gdW5jb21tZW50IHRoZSBiZWxvdyB0byBwcmludCBhbHRlcm5hdGl2ZXNcblx0XHQvLyBpZiAobWF0Y2hlcy5sZW5ndGggPiAxKSB7XG5cdFx0Ly9cdGNvbnNvbGUuaW5mbyh0aGlzLmFyZ3VtZW50IHx8IHRoaXMucnVsZU5hbWUsIG1hdGNoZXMsIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLm1hdGNoZWRUZXh0KSk7XG5cdFx0Ly8gfVxuXG5cdFx0bGV0IGJlc3RNYXRjaCA9IChtYXRjaGVzLmxlbmd0aCA9PT0gMSA/IG1hdGNoZXNbMF0gOiB0aGlzLmdldEJlc3RNYXRjaChtYXRjaGVzKSk7XG5cblx0XHQvLyBhc3NpZ24gYGFyZ05hbWVgIG9yIGBydWxlTmFtZWAgZm9yIGByZXN1bHRzYFxuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSBiZXN0TWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdGVsc2UgaWYgKHRoaXMucnVsZU5hbWUpIGJlc3RNYXRjaC5ydWxlTmFtZSA9IHRoaXMucnVsZU5hbWU7XG4vL1RPRE86IG90aGVyIHRoaW5ncyB0byBjb3B5IGhlcmU/Pz9cblxuXHRcdHJldHVybiBiZXN0TWF0Y2g7XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIFwiYmVzdFwiIG1hdGNoIGdpdmVuIG1vcmUgdGhhbiBvbmUgbWF0Y2hlcyBhdCB0aGUgaGVhZCBvZiB0aGUgdG9rZW5zLlxuXHQvLyBEZWZhdWx0IGlzIHRvIHJldHVybiB0aGUgbG9uZ2VzdCBtYXRjaC5cblx0Ly8gSW1wbGVtZW50IHNvbWV0aGluZyBlbHNlIHRvIGRvLCBlZywgcHJlY2VkZW5jZSBydWxlcy5cblx0Z2V0QmVzdE1hdGNoKG1hdGNoZXMpIHtcblx0XHRyZXR1cm4gbWF0Y2hlcy5yZWR1Y2UoZnVuY3Rpb24gKGJlc3QsIGN1cnJlbnQpIHtcblx0XHRcdGlmIChjdXJyZW50Lm5leHRTdGFydCA+IGJlc3QubmV4dFN0YXJ0KSByZXR1cm4gY3VycmVudDtcblx0XHRcdHJldHVybiBiZXN0O1xuXHRcdH0sIG1hdGNoZXNbMF0pO1xuXHR9XG5cblx0YWRkUnVsZShydWxlKSB7XG5cdFx0dGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoY29udGV4dCk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCgke3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZXMuam9pbihcInxcIil9KSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBSZXBlYXRpbmcgcnVsZS5cbi8vXHRgdGhpcy5ydWxlYCBpcyB0aGUgcnVsZSB0aGF0IHJlcGVhdHMuXG4vL1xuLy8gQWZ0ZXIgbWF0Y2hpbmc6XG4vL1x0YHRoaXMubWF0Y2hlZGAgaXMgYXJyYXkgb2YgcmVzdWx0cyBvZiBtYXRjaGVzLlxuLy9cbi8vXHRBdXRvbWF0aWNhbGx5IGNvbnN1bWVzIHdoaXRlc3BhY2UgYmVmb3JlIHJ1bGVzLlxuLy9cdElmIGRvZXNuJ3QgbWF0Y2ggYXQgbGVhc3Qgb25lLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuUnVsZS5SZXBlYXQgPSBjbGFzcyBSZXBlYXQgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kLCBzdGFjaykge1xuXHRcdGxldCBtYXRjaGVkID0gW107XG5cdFx0bGV0IG5leHRTdGFydCA9IHN0YXJ0O1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCB0b2tlbnMsIG5leHRTdGFydCwgZW5kLCBzdGFjayk7XG5cdFx0XHRpZiAoIW1hdGNoKSBicmVhaztcblxuXHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdG5leHRTdGFydCA9IG1hdGNoLm5leHRTdGFydDtcblx0XHR9XG5cblx0XHRpZiAobWF0Y2hlZC5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0bmV4dFN0YXJ0XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBhcnJheSB3aXRoIGFyZ3VtZW50cyBvZiBhbGwgcmVzdWx0cy5cblx0Ly8gTk9URTogbWVtb2l6ZXMgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC5yZXN1bHRzICk7XG5cdH1cblxuXHR0b1NvdXJjZSgpIHtcblx0XHR0aHJvdyBcIkRvbid0IHVuZGVyc3RhbmQgaG93IHRvIHNvdXJjZSBSdWxlLlJlcGVhdCFcIjtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdGxldCBpc0NvbXBvdW5kUnVsZSA9ICh0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlKVxuXHRcdFx0XHRcdFx0ICB8fCAodGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHRoaXMucnVsZS5tYXRjaC5sZW5ndGggPiAxKTtcblx0XHRjb25zdCBydWxlID0gaXNDb21wb3VuZFJ1bGUgPyBgKCR7dGhpcy5ydWxlfSlgIDogYCR7dGhpcy5ydWxlfWA7XG5cdFx0cmV0dXJuIGAke3J1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe251bWJlcn0sXWAgdG8gbWF0Y2ggYDEsMiwzYFxuLy9cdGBydWxlLml0ZW1gIGlzIHRoZSBydWxlIGZvciBlYWNoIGl0ZW0sXG4vL1x0YHJ1bGUuZGVsaW1pdGVyYCBpcyB0aGUgZGVsaW1pdGVyIGJldHdlZW4gZWFjaCBpdGVtLlxuLy8gXHRgcnVsZS5tYXRjaGVkYCBpbiB0aGUgb3V0cHV0IGlzIHRoZSBsaXN0IG9mIHZhbHVlcy5cbi8vXG4vL1xuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYSBMaXN0IHJ1bGUgd2lsbCBOT1QgcmVwZWF0ICg/Pz8/KVxuUnVsZS5MaXN0ID0gY2xhc3MgTGlzdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQsIHN0YWNrKSB7XG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXTtcblx0XHRsZXQgbmV4dFN0YXJ0ID0gc3RhcnQ7XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdC8vIGdldCBuZXh0IGl0ZW0sIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgaXRlbSA9IHRoaXMuaXRlbS5wYXJzZShwYXJzZXIsIHRva2VucywgbmV4dFN0YXJ0LCBlbmQsIHN0YWNrKTtcblx0XHRcdGlmICghaXRlbSkgYnJlYWs7XG4vL2NvbnNvbGUubG9nKGl0ZW0pO1xuXHRcdFx0bWF0Y2hlZC5wdXNoKGl0ZW0pO1xuXHRcdFx0bmV4dFN0YXJ0ID0gaXRlbS5uZXh0U3RhcnQ7XG5cblx0XHRcdC8vIGdldCBkZWxpbWl0ZXIsIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgZGVsaW1pdGVyID0gdGhpcy5kZWxpbWl0ZXIucGFyc2UocGFyc2VyLCB0b2tlbnMsIG5leHRTdGFydCwgZW5kLCBzdGFjayk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0U3RhcnQgPSBkZWxpbWl0ZXIubmV4dFN0YXJ0O1xuXHRcdH1cblxuXHRcdC8vIElmIHdlIGRpZG4ndCBnZXQgYW55IG1hdGNoZXMsIGZvcmdldCBpdC5cblx0XHRpZiAobWF0Y2hlZC5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0bmV4dFN0YXJ0XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBSZXR1cm5zIGxpc3Qgb2YgdmFsdWVzIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gW107XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5tYXAoIG1hdGNoID0+IG1hdGNoLnRvU291cmNlKGNvbnRleHQpICk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYFske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMuaXRlbX0gJHt0aGlzLmRlbGltaXRlcn1dJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG4vLyBBIGBOZXN0ZWRTY29wZWAgcGFyc2VzIGxpbmVzIGFzIGEgbmVzdGVkIHNjb3BlLCBlZyBhIHR5cGUgZGVjbGFyYXRpb24gb3IgYSBtZXRob2QgZGVmaW5pdGlvbi5cblJ1bGUuTmVzdGVkU2NvcGUgPSBjbGFzcyBzY29wZSBleHRlbmRzIFJ1bGUge1xuXG5cblx0Ly8gYHN0YXRlbWVudHNgIGlzIGFuIGFycmF5IG9mIGFycmF5cyBvZiB0b2tlbnMuXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCA9IHRva2Vucy5sZW5ndGgsIHN0YWNrKSB7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGJyZWFrIHRva2VucyBvZiBpbnRlcmVzdCBpbnRvIGxpbmVzLlxuXHRcdHZhciBsaW5lcyA9IFRva2VuaXplci5icmVha0ludG9MaW5lcyh0b2tlbnMuc2xpY2Uoc3RhcnQsIGVuZCkpO1xuXG5cdFx0bGV0IHJlc3VsdHMgPSBbXTtcblx0XHRsZXQgbGFzdEluZGVudCA9IDA7XG5cblx0XHQvLyBQYXJzZSBlYWNoIGxpbmUgaW5kaXZpZHVhbGx5XG5cdFx0bGluZXMuZm9yRWFjaCh0b2tlbnMgPT4ge1xuLy9jb25zb2xlLmluZm8oXCJUT0tFTlNcIiwgdG9rZW5zKTtcblx0XHRcdGxldCBsaW5lUmVzdWx0ID0gdGhpcy5wYXJzZUxpbmUocGFyc2VyLCBsYXN0SW5kZW50LCB0b2tlbnMpO1xuXHRcdFx0aWYgKGxpbmVSZXN1bHQpIHtcblx0XHRcdFx0cmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KGxpbmVSZXN1bHQpO1xuXHRcdFx0XHRsZXQgbGFzdFJlc3VsdCA9IHJlc3VsdHNbcmVzdWx0cy5sZW5ndGggLSAxXTtcblx0XHRcdFx0aWYgKHR5cGVvZiBsYXN0UmVzdWx0LmluZGVudCA9PT0gXCJudW1iZXJcIikge1xuXHRcdFx0XHRcdGxhc3RJbmRlbnQgPSBsYXN0UmVzdWx0LmluZGVudDtcbi8vY29uc29sZS53YXJuKFwic2V0dGluZyBsYXN0SW5kZW50IHRvXCIsIGxhc3RJbmRlbnQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBBZGQgY2xvc2luZyBjdXJseSBicmFjZXMgYXMgbmVjZXNzYXJ5XG4vL1RPRE86IG1vdmUgQUJPVkUgYW55IGJsYW5rIGxpbmVzXG5cdFx0d2hpbGUgKGxhc3RJbmRlbnQgPiAwKSB7XG5cdFx0XHRsZXQgY2xvc2VCbG9jayA9IG5ldyBSdWxlLkNsb3NlQmxvY2soeyBpbmRlbnQ6IGdldFRhYnMobGFzdEluZGVudCAtIDEpIH0pO1xuXHRcdFx0cmVzdWx0cy5wdXNoKGNsb3NlQmxvY2spO1xuXHRcdFx0LS1sYXN0SW5kZW50O1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHJlc3VsdHMsXG5cdFx0XHRuZXh0U3RhcnQ6IGVuZFxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUGFyc2UgdG9rZW5zIGNvcnJlc3BvbmRpbmcgdG8gYSBzaW5nbGUgbGluZSBvZiBpbnB1dC5cblx0Ly8gUmV0dXJucyBgW2xhc3RJbmRlbnQsIFttYXRjaGVkIHJ1bGVzXV1gXG5cdHBhcnNlTGluZShwYXJzZXIsIGxhc3RJbmRlbnQsIHRva2Vucykge1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cblx0XHQvLyBhZGQgYEJsYW5rTGluZWBzIGZvciBlbXB0eSBsaW5lc1xuXHRcdGlmICh0b2tlbnMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXN1bHRzLnB1c2gobmV3IFJ1bGUuQmxhbmtMaW5lKCkpO1xuXHRcdFx0cmV0dXJuIHJlc3VsdHM7XG5cdFx0fVxuXG5cdFx0Ly8gZmlndXJlIG91dCBpbmRlbnQgbGV2ZWwgb2YgdGhpcyBsaW5lXG5cdFx0bGV0IGluZGVudCA9IDA7XG5cdFx0Ly8gSWYgd2Ugc3RhcnQgd2l0aCBhbiBpbmRlbnRcblx0XHRpZiAodG9rZW5zWzBdIGluc3RhbmNlb2YgVG9rZW5pemVyLkluZGVudCkge1xuXHRcdFx0aW5kZW50ID0gdG9rZW5zWzBdLmxlbmd0aDtcblx0XHRcdC8vIHRha2UgdGhlIGluZGVudCBvdXQgb2YgdGhlIHN0YXRlbWVudCBzdGFydFxuXHRcdFx0dG9rZW5zID0gdG9rZW5zLnNsaWNlKDEpO1xuXHRcdH1cblxuXHRcdC8vIElmIGluZGVudCBJTkNSRUFTRVMsIGFkZCBgT3BlbkJsb2NrYFxuXHRcdGlmIChpbmRlbnQgPiBsYXN0SW5kZW50KSB7XG5cdFx0XHRyZXN1bHRzLnB1c2gobmV3IFJ1bGUuT3BlbkJsb2NrKHsgaW5kZW50OiBpbmRlbnQtMSB9KSk7XG5cdFx0fVxuXHRcdC8vIGlmIGxpbmUgaW5kZW50IERFQ1JFQVNFUywgYWRkIG9uZSBvciBtb3JlIGBDbG9zZUJsb2NrYHNcblx0XHRlbHNlIGlmIChpbmRlbnQgPCBsYXN0SW5kZW50KSB7XG5cdFx0XHRmb3IgKGxldCBpbmRlbnQgPSBsYXN0SW5kZW50OyBpbmRlbnQgPiBpbmRlbnQ7IGluZGVudC0tKSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChuZXcgUnVsZS5DbG9zZUJsb2NrKHsgaW5kZW50OiBpbmRlbnQtMSB9KSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gQXR0ZW1wdCB0byBwYXJzZSBhIGNvbW1lbnQgYXMgdGhlIGxhc3QgaXRlbSBpbiB0aGUgc3RhdGVtZW50XG5cdFx0bGV0IGNvbW1lbnQgPSBwYXJzZXIucGFyc2VSdWxlT3JEaWUoXCJjb21tZW50XCIsIHRva2VucywgdG9rZW5zLmxlbmd0aCAtIDEpO1xuXHRcdGlmIChjb21tZW50KSB7XG5cdFx0XHQvLyByZW1lbWJlciBpbmRlbnRcblx0XHRcdGNvbW1lbnQuaW5kZW50ID0gaW5kZW50O1xuXHRcdFx0Ly8gQWRkIGNvbW1lbnQgQkVGT1JFIGNvcnJlc3BvbmRpbmcgc3RhdGVtZW50XG5cdFx0XHRyZXN1bHRzLnB1c2goY29tbWVudCk7XG5cdFx0XHQvLyBwb3AgdGhlIGNvbW1lbnQgb2ZmIGJlZm9yZSBtYXRjaGluZyB0aGUgcmVzdCBvZiB0aGUgc3RhdGVtZW50LlxuXHRcdFx0dG9rZW5zID0gdG9rZW5zLnNsaWNlKDAsIC0xKTtcblx0XHR9XG5cblx0XHQvLyBQYXJzZSBzdGF0ZW1lbnRcblx0XHRsZXQgc3RhdGVtZW50ID0gcGFyc2VyLnBhcnNlUnVsZU9yRGllKFwic3RhdGVtZW50XCIsIHRva2VucywgMCk7XG5cdFx0Ly8gY29tcGxhaW4gaWYgbm8gc3RhdGVtZW50IGFuZCBubyBjb21tZW50XG5cdFx0aWYgKCFzdGF0ZW1lbnQgJiYgIWNvbW1lbnQpIHtcblx0XHRcdGxldCBzdGF0ZW1lbnQgPSB0b2tlbnMuam9pbihcIiBcIik7XG5cdFx0XHRjb25zb2xlLndhcm4oYENvdWxkbid0IHBhcnNlIHN0YXRlbWVudDpcXG5cXHQke3N0YXRlbWVudH1gKTtcblx0XHRcdHJlc3VsdHMucHVzaChuZXcgUnVsZS5QYXJzZUVycm9yKHtcblx0XHRcdFx0aW5kZW50LFxuXHRcdFx0XHRlcnJvcjogXCJDYW4ndCBwYXJzZSBzdGF0ZW1lbnRcIixcblx0XHRcdFx0bWVzc2FnZTogYENBTidUIFBBUlNFOiAke3N0YXRlbWVudH1gXG5cdFx0XHR9KSk7XG5cdFx0fVxuXG5cdFx0Ly8gY29tcGxhaW4gY2FuJ3QgcGFyc2UgdGhlIGVudGlyZSBsaW5lIVxuXHRcdGVsc2UgaWYgKHN0YXRlbWVudCAmJiBzdGF0ZW1lbnQubmV4dFN0YXJ0ICE9PSB0b2tlbnMubGVuZ3RoKSB7XG5cdFx0XHRsZXQgc3RhdGVtZW50ID0gdG9rZW5zLmpvaW4oXCIgXCIpO1xuXHRcdFx0bGV0IHVucGFyc2VkID0gdG9rZW5zLnNsaWNlKHN0YXRlbWVudC5uZXh0U3RhcnQpLmpvaW4oXCIgXCIpO1xuXHRcdFx0Y29uc29sZS53YXJuKFwiQ291bGRuJ3QgcGFyc2UgZW50aXJlIHN0YXRlbWVudDpcIixcblx0XHRcdFx0XHRcdFx0YFxcblxcdFwiJHtzdGF0ZW1lbnR9XCJgLFxuXHRcdFx0XHRcdFx0XHRgXFxudW5wYXJzZWQ6YCxcblx0XHRcdFx0XHRcdFx0YFxcblxcdFwiJHt1bnBhcnNlZH1cImApO1xuXHRcdFx0bGV0IGVycm9yID0gbmV3IFJ1bGUuUGFyc2VFcnJvcih7XG5cdFx0XHRcdGluZGVudCxcblx0XHRcdFx0ZXJyb3I6IFwiQ2FuJ3QgcGFyc2UgZW50aXJlIHN0YXRlbWVudFwiLFxuXHRcdFx0XHRtZXNzYWdlOiBgQ0FOVCBQQVJTRSBFTlRJUkUgU1RBVEVNRU5UXFxuYFxuXHRcdFx0XHRcdCAgICsgYFBBUlNFRCAgICA6ICR7c3RhdGVtZW50Lm1hdGNoZWR9XFxuYFxuXHRcdFx0XHRcdCAgICsgYENBTlQgUEFSU0U6ICR7dW5wYXJzZWR9YFxuXG5cdFx0XHR9KTtcblx0XHRcdHJlc3VsdHMucHVzaChlcnJvcik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gT3RoZXJ3aXNlIGFkZCBzdGF0ZW1lbnQgdG8gcmVzdWx0c1xuXHRcdGVsc2UgaWYgKHN0YXRlbWVudCkge1xuXHRcdFx0c3RhdGVtZW50LmluZGVudCA9IGluZGVudDtcblx0XHRcdHJlc3VsdHMucHVzaChzdGF0ZW1lbnQpO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9XG5cbn1cblxuXG5cbi8vIGBTdGF0ZW1lbnRzYCBhcmUgYSBibG9jayBvZiBgU3RhdGVtZW50YCB0aGF0IHVuZGVyc3RhbmQgbmVzdGluZyBhbmQgY29tbWVudHMuXG5SdWxlLlN0YXRlbWVudHMgPSBjbGFzcyBzdGF0ZW1lbnRzIGV4dGVuZHMgUnVsZS5OZXN0ZWRTY29wZSB7XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1hdGNoZWQubGVuZ3RoOyBpKyspIHtcblx0XHRcdGxldCBtYXRjaCA9IHRoaXMubWF0Y2hlZFtpXTtcblxuXHRcdFx0Ly8gc3BlY2lhbCBjYXNlIG9wZW4gYmxvY2sgdG8gcHV0IG9uIHRoZSBzYW1lIGxpbmVcblx0XHRcdC8vXHRpZiBwcmV2aW91cyBzdGF0ZW1lbnQgZG9lcyBub3QgaGF2ZSBgLm9wZW5zQmxvY2tgIHNldC5cblx0XHRcdGlmIChtYXRjaCBpbnN0YW5jZW9mIFJ1bGUuT3BlbkJsb2NrKSB7XG5cdFx0XHRcdGxldCBwcmV2aW91cyA9IHRoaXMubWF0Y2hlZFtpLTFdO1xuXHRcdFx0XHRpZiAocHJldmlvdXMpIHtcblx0XHRcdFx0XHRpZiAoIXByZXZpb3VzLm9wZW5zQmxvY2spIHtcblx0XHRcdFx0XHRcdHJlc3VsdHNbcmVzdWx0cy5sZW5ndGggLSAxXSArPSBcIiB7XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRsZXQgc291cmNlID0gbWF0Y2gudG9Tb3VyY2UoY29udGV4dCkgfHwgXCJcIjtcblx0XHRcdGxldCBpbmRlbnQgPSBnZXRUYWJzKG1hdGNoLmluZGVudCk7XG5cdFx0XHRyZXN1bHRzLnB1c2goaW5kZW50ICsgc291cmNlLnNwbGl0KFwiXFxuXCIpLmpvaW4oXCJcXG5cIitpbmRlbnQpKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdHMuam9pbihcIlxcblwiKTtcblx0fVxufVxuXG5cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGUuanMiLCJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqIFxuICovXG5cbmZ1bmN0aW9uIG1ha2VFbXB0eUZ1bmN0aW9uKGFyZykge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBhcmc7XG4gIH07XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBhY2NlcHRzIGFuZCBkaXNjYXJkcyBpbnB1dHM7IGl0IGhhcyBubyBzaWRlIGVmZmVjdHMuIFRoaXMgaXNcbiAqIHByaW1hcmlseSB1c2VmdWwgaWRpb21hdGljYWxseSBmb3Igb3ZlcnJpZGFibGUgZnVuY3Rpb24gZW5kcG9pbnRzIHdoaWNoXG4gKiBhbHdheXMgbmVlZCB0byBiZSBjYWxsYWJsZSwgc2luY2UgSlMgbGFja3MgYSBudWxsLWNhbGwgaWRpb20gYWxhIENvY29hLlxuICovXG52YXIgZW1wdHlGdW5jdGlvbiA9IGZ1bmN0aW9uIGVtcHR5RnVuY3Rpb24oKSB7fTtcblxuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJucyA9IG1ha2VFbXB0eUZ1bmN0aW9uO1xuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc0ZhbHNlID0gbWFrZUVtcHR5RnVuY3Rpb24oZmFsc2UpO1xuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc1RydWUgPSBtYWtlRW1wdHlGdW5jdGlvbih0cnVlKTtcbmVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNOdWxsID0gbWFrZUVtcHR5RnVuY3Rpb24obnVsbCk7XG5lbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zVGhpcyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXM7XG59O1xuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc0FyZ3VtZW50ID0gZnVuY3Rpb24gKGFyZykge1xuICByZXR1cm4gYXJnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbXB0eUZ1bmN0aW9uO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvZW1wdHlGdW5jdGlvbi5qc1xuLy8gbW9kdWxlIGlkID0gMTQ5XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDEzLXByZXNlbnQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFVzZSBpbnZhcmlhbnQoKSB0byBhc3NlcnQgc3RhdGUgd2hpY2ggeW91ciBwcm9ncmFtIGFzc3VtZXMgdG8gYmUgdHJ1ZS5cbiAqXG4gKiBQcm92aWRlIHNwcmludGYtc3R5bGUgZm9ybWF0IChvbmx5ICVzIGlzIHN1cHBvcnRlZCkgYW5kIGFyZ3VtZW50c1xuICogdG8gcHJvdmlkZSBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IGJyb2tlIGFuZCB3aGF0IHlvdSB3ZXJlXG4gKiBleHBlY3RpbmcuXG4gKlxuICogVGhlIGludmFyaWFudCBtZXNzYWdlIHdpbGwgYmUgc3RyaXBwZWQgaW4gcHJvZHVjdGlvbiwgYnV0IHRoZSBpbnZhcmlhbnRcbiAqIHdpbGwgcmVtYWluIHRvIGVuc3VyZSBsb2dpYyBkb2VzIG5vdCBkaWZmZXIgaW4gcHJvZHVjdGlvbi5cbiAqL1xuXG52YXIgdmFsaWRhdGVGb3JtYXQgPSBmdW5jdGlvbiB2YWxpZGF0ZUZvcm1hdChmb3JtYXQpIHt9O1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICB2YWxpZGF0ZUZvcm1hdCA9IGZ1bmN0aW9uIHZhbGlkYXRlRm9ybWF0KGZvcm1hdCkge1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhcmlhbnQgcmVxdWlyZXMgYW4gZXJyb3IgbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gaW52YXJpYW50KGNvbmRpdGlvbiwgZm9ybWF0LCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIHZhbGlkYXRlRm9ybWF0KGZvcm1hdCk7XG5cbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICB2YXIgZXJyb3I7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcignTWluaWZpZWQgZXhjZXB0aW9uIG9jY3VycmVkOyB1c2UgdGhlIG5vbi1taW5pZmllZCBkZXYgZW52aXJvbm1lbnQgJyArICdmb3IgdGhlIGZ1bGwgZXJyb3IgbWVzc2FnZSBhbmQgYWRkaXRpb25hbCBoZWxwZnVsIHdhcm5pbmdzLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYXJncyA9IFthLCBiLCBjLCBkLCBlLCBmXTtcbiAgICAgIHZhciBhcmdJbmRleCA9IDA7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihmb3JtYXQucmVwbGFjZSgvJXMvZywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gYXJnc1thcmdJbmRleCsrXTtcbiAgICAgIH0pKTtcbiAgICAgIGVycm9yLm5hbWUgPSAnSW52YXJpYW50IFZpb2xhdGlvbic7XG4gICAgfVxuXG4gICAgZXJyb3IuZnJhbWVzVG9Qb3AgPSAxOyAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGludmFyaWFudCdzIG93biBmcmFtZVxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW52YXJpYW50O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvaW52YXJpYW50LmpzXG4vLyBtb2R1bGUgaWQgPSAxNTBcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiaW1wb3J0IHsgZ2V0VGFicyB9IGZyb20gXCIuL3V0aWxzL3N0cmluZ1wiO1xuXG4vLyBHUlJSLi4uIG5vZGUgZG9lc24ndCBpbmNsdWRlIHRoaXM/Pz9cbi8vIENIRUNLIERJRkZFUkVOVCBOT0RFIFZFUlNJT05TLi4uXG5pZiAoIShBcnJheS5wcm90b3R5cGUuaW5jbHVkZXMpKSB7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsIFwiaW5jbHVkZXNcIiwge1xuXHRcdHZhbHVlOiBmdW5jdGlvbih2YWx1ZSwgc3RhcnQpIHtcblx0XHRcdGxldCBpbmRleCA9IHRoaXMuaW5kZXhPZih2YWx1ZSwgc3RhcnQpO1xuXHRcdFx0cmV0dXJuIChpbmRleCAhPT0gLTEpO1xuXHRcdH1cblx0fSk7XG59XG5cblxuXG4vLyBgd2hpdGVzcGFjZWAgY2xhc3MgZm9yIG5vcm1hbCAobm9uLWluZGVudCwgbm9uLW5ld2xpbmUpIHdoaXRlc3BhY2UuXG5jbGFzcyB3aGl0ZXNwYWNlIHtcblx0Y29uc3RydWN0b3Iod2hpdGVzcGFjZSkge1xuXHRcdHRoaXMud2hpdGVzcGFjZSA9IHdoaXRlc3BhY2U7XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIFwibGVuZ3RoXCIgb2YgdGhpcyB3aGl0ZXNwYWNlLCBlZyBmb3IgYW4gaW5kZW50LlxuXHRnZXQgbGVuZ3RoKCkge1xuXHRcdHJldHVybiB0aGlzLndoaXRlc3BhY2UubGVuZ3RoO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMud2hpdGVzcGFjZTtcblx0fVxufVxuXG5cbi8vIGBpbmRlbnRgIGNsYXNzLlxuY2xhc3MgaW5kZW50IGV4dGVuZHMgd2hpdGVzcGFjZSB7fVxuXG5cbi8vIE5ld2xpbmUgc2luZ2xldG9uLlxuY2xhc3MgbmV3bGluZSBleHRlbmRzIHdoaXRlc3BhY2Uge31cblxuXG4vL1xuLy9cdCMgVG9rZW5pemVyXG4vL1x0LSBgLnRva2VuaXplKClgIFx0XHRCcmVha3MgdXAgbG9uZyBzdHJpbmcgaW50byB0b2tlbnMsIGluY2x1ZGluZyBuZXdsaW5lcywgSlNYIGV4cHJlc3Npb25zLCBldGMuXG4vL1x0LSBgLnRva2VuaXplTGluZXMoKWAgXHRUYWtlcyB0aGUgYWJvdmUgYW5kIGJyZWFrcyBpdCBpbnRvIGFuIGFycmF5IG9mIGFycmF5cyBmb3IgZWFjaCBsaW5lLlxuLy9cbi8vIFRPRE86IGVycm9yIGNoZWNraW5nIC8gcmVwb3J0aW5nLCBlc3BlY2lhbGx5IGluIEpTWCBleHByZXNzaW9ucy5cbi8vIFRPRE86IGhhdmUgbm9ybWFsIGB0b2tlbml6ZWAgc3RpY2sgd2hpdGVzcGFjZSBlbGVtZW50cyBpbiB0aGUgc3RyZWFtLCB0aGVuIGB0b2tlbml6ZUxpbmVzKClgIHRha2VzIHRoZW0gb3V0P1xuY29uc3QgVG9rZW5pemVyID0ge1xuXG5cdC8vIFdoaXRlc3BhY2UgY29uc3RydWN0b3IuXG5cdFdoaXRlc3BhY2U6IHdoaXRlc3BhY2UsXG5cblx0Ly8gSW5kZW50IGNvbnN0cnVjdG9yXG5cdEluZGVudDogaW5kZW50LFxuXG5cdC8vIE5FV0xJTkUgc2luZ2xldG9uLlxuXHRORVdMSU5FOiBuZXcgbmV3bGluZShcIlxcblwiKSxcblxuXG5cdC8vIFRva2VuaXplIHRleHQgYmV0d2VlbiBgc3RhcnRgIGFuZCBgZW5kYCBpbnRvIGFuIGFycmF5IG9mIGByZXN1bHRzYCwgYW4gYXJyYXkgb2Y6XG5cdC8vXHQtIGBUb2tlbml6ZXIuTkVXTElORWAgZm9yIGEgbmV3bGluZSBzeW1ib2xcblx0Ly9cdC0gc3RyaW5ncyBmb3Iga2V5d29yZHMvc3ltYm9sc1xuXHQvL1x0LSBudW1iZXJzIGZvciBudW1iZXIgbGl0ZXJhbHNcblx0Ly9cdC0gYHsgaW5kZW50OiBudW1iZXIgfWAgZm9yIGluZGVudCBhdCBzdGFydCBvZiBsaW5lXG5cdC8vXHQtIGB7IHR5cGU6IFwidGV4dFwiLCBsaXRlcmFsOiBcIidhYmMnXCIsIHRleHQ6IFwiYWJjXCIgfVxuXHQvL1x0LSBgeyB0eXBlOiBcImluZGVudFwiLCBsZXZlbDogNyB9YFxuXHQvL1x0LSBgeyB0eXBlOiBcImNvbW1lbnRcIiwgY29tbWVudDogXCJzdHJpbmdcIiwgY29tbWVudFN5bWJvbCwgd2hpdGVzcGFjZSB9YFxuLy9URVNUTUVcblx0dG9rZW5pemUodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0Ly8gcXVpY2sgcmV0dXJuIG91dCBvZiByYW5nZSBvciBvbmx5IHdoaXRlc3BhY2Vcblx0XHRpZiAoc3RhcnQgPj0gZW5kIHx8ICF0ZXh0LnRyaW0oKSkgcmV0dXJuIFtdO1xuXG5cdFx0bGV0IHRva2VucyA9IFtdO1xuXHRcdC8vIFByb2Nlc3Mgb3VyIHRvcC1sZXZlbCBydWxlcy5cblx0XHRsZXQgW3Jlc3VsdHMsIG5leHRTdGFydF0gPSB0aGlzLmVhdFRva2Vucyh0aGlzLm1hdGNoVG9wVG9rZW5zLCB0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRpZiAocmVzdWx0cykge1xuXHRcdFx0dG9rZW5zID0gdG9rZW5zLmNvbmNhdChyZXN1bHRzKTtcblx0XHRcdHN0YXJ0ID0gbmV4dFN0YXJ0O1xuXHRcdH1cblx0XHRpZiAoc3RhcnQgIT09IGVuZCkgY29uc29sZS53YXJuKFwidG9rZW5pemUoKTogZGlkbid0IGNvbnN1bWU6IGBcIiwgdGV4dC5zbGljZShzdGFydCwgZW5kKSArIFwiYFwiKTtcblxuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9LFxuXG5cdC8vIFJlcGVhdGVkbHkgZXhlY3V0ZSBhIGBtZXRob2RgIChib3VuZCB0byBgdGhpcykgd2hpY2ggcmV0dXJucyBhIGBbcmVzdWx0LCBuZXh0U3RhcnRdYCBvciBgdW5kZWZpbmVkYC5cblx0Ly8gUGxhY2VzIG1hdGNoZWQgcmVzdWx0cyB0b2dldGhlciBpbiBgcmVzdWx0c2AgYXJyYXkgYW5kIHJldHVybnMgYFtyZXN1bHRzLCBuZXh0U3RhcnRdYCBmb3IgdGhlIGVudGlyZSBzZXQuXG5cdC8vIFN0b3BzIGlmIGBtZXRob2RgIGRvZXNuJ3QgcmV0dXJuIGFueXRoaW5nLCBvciBpZiBjYWxsaW5nIGBtZXRob2RgIGlzIHVucHJvZHVjdGl2ZS5cbi8vVEVTVE1FXG5cdGVhdFRva2VucyhtZXRob2QsIHRleHQsIHN0YXJ0ID0gMCwgZW5kLCByZXN1bHRzID0gW10pIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIHByb2Nlc3MgcnVsZXMgcmVwZWF0ZWRseSB1bnRpbCB3ZSBnZXQgdG8gdGhlIGVuZFxuXHRcdHdoaWxlIChzdGFydCA8IGVuZCkge1xuXHRcdFx0bGV0IHJlc3VsdCA9IG1ldGhvZC5jYWxsKHRoaXMsIHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdFx0aWYgKCFyZXN1bHQpIGJyZWFrO1xuXG5cdFx0XHRsZXQgW3Rva2VucywgbmV4dFN0YXJ0XSA9IHJlc3VsdDtcblx0XHRcdC8vIEJhaWwgaWYgd2UgZGlkbid0IGdldCBhIHByb2R1Y3RpdmUgcnVsZSFcblx0XHRcdGlmIChzdGFydCA9PT0gbmV4dFN0YXJ0KSBicmVhaztcblxuXHRcdFx0Ly8gaGFuZGxlIG5ld1Jlc3VsdHMgYXMgYW4gYXJyYXkgb3Igc2luZ2xlIG9iamVjdC5cblx0XHRcdGlmICh0b2tlbnMgIT09IHVuZGVmaW5lZCkgcmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KHRva2Vucyk7XG5cdFx0XHRzdGFydCA9IG5leHRTdGFydDtcblx0XHR9XG5cdFx0cmV0dXJuIFtyZXN1bHRzLCBzdGFydF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYSBzaW5nbGUgdG9wLWxldmVsIHRva2VuIGF0IGB0ZXh0W3N0YXJ0XWAuXG4vL1RFU1RNRVxuXHRtYXRjaFRvcFRva2Vucyh0ZXh0LCBzdGFydCwgZW5kKSB7XG5cdFx0cmV0dXJuXHR0aGlzLm1hdGNoV2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0IHx8IHRoaXMubWF0Y2hXb3JkKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaE51bWJlcih0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0IHx8IHRoaXMubWF0Y2hOZXdsaW5lKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaEpTWEVsZW1lbnQodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdCB8fCB0aGlzLm1hdGNoVGV4dCh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0IHx8IHRoaXMubWF0Y2hDb21tZW50KHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaFN5bWJvbCh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdDtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgU3ltYm9sIGNoYXJhY3RlclxuXHQvL1xuXG5cdC8vIE1hdGNoIHRoZSBzaW5nbGUgXCJzeW1ib2xcIiBjaGFyYWN0ZXIgYXQgYHRleHRbc3RhcnRdYC5cblx0Ly8gTk9URTogVGhpcyBkb2VzIG5vdCBkbyBhbnkgY2hlY2tpbmcsIGl0IGp1c3QgYmxpbmRseSB1c2VzIHRoZSBjaGFyYWN0ZXIgaW4gcXVlc3Rpb24uXG5cdC8vXHRcdCBZb3Ugc2hvdWxkIG1ha2Ugc3VyZSBhbGwgb3RoZXIgcG9zc2libGUgcnVsZXMgaGF2ZSBiZWVuIGV4aGF1c3RlZCBmaXJzdC5cblx0bWF0Y2hTeW1ib2wodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiBbdGV4dFtzdGFydF0sIHN0YXJ0ICsgMV1cblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgV2hpdGVzcGFjZVxuXHQvL1xuXG5cdC8vIFJldHVybiB0aGUgZmlyc3QgY2hhciBwb3NpdGlvbiBhZnRlciBgc3RhcnRgIHdoaWNoIGlzIE5PVCBhIHdoaXRlc3BhY2UgY2hhciAoc3BhY2Ugb3IgdGFiIG9ubHkpLlxuXHQvLyBJZiBgdGV4dFtzdGFydF1gIGlzIG5vdCB3aGl0ZXNwYWNlLCByZXR1cm5zIGBzdGFydGAsXG5cdC8vXHRzbyB5b3UgY2FuIGNhbGwgdGhpcyBhdCBhbnkgdGltZSB0byBza2lwIHdoaXRlc3BhY2UgaW4gdGhlIG91dHB1dC5cblx0ZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gZW5kO1xuXG5cdFx0bGV0IHdoaXRlU3BhY2VFbmQgPSBzdGFydDtcblx0XHR3aGlsZSAod2hpdGVTcGFjZUVuZCA8IGVuZCAmJiAodGV4dFt3aGl0ZVNwYWNlRW5kXSA9PT0gXCIgXCIgfHwgdGV4dFt3aGl0ZVNwYWNlRW5kXSA9PT0gXCJcXHRcIikpIHtcblx0XHRcdHdoaXRlU3BhY2VFbmQrKztcblx0XHR9XG5cdFx0cmV0dXJuIHdoaXRlU3BhY2VFbmQ7XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIFdoaXRlc3BhY2Vcblx0Ly9cdE5PVEU6IFdoaXRlc3BhY2UgYXQgdGhlIGJlZ2lubmluZyBvZiBgdGV4dGAgb3IgdGhlIGJlZ2lubmluZyBvZiBhIGxpbmVcblx0Ly9cdFx0ICBpcyBjb25zaWRlcmVkIGFuIFwiaW5kZW50XCIgYW5kIHdpbGwgaGF2ZSBgLmlzSW5kZW50ID09PSB0cnVlYC5cblx0Ly9cblxuXHQvLyBDb252ZXJ0IGEgcnVuIG9mIHNwYWNlcyBhbmQvb3IgdGFicyBpbnRvIGEgYFRva2VuaXplci5XaGl0ZXNwYWNlYC5cblx0bWF0Y2hXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgd2hpdGVzcGFjZUVuZCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHQvLyBmb3JnZXQgaXQgaWYgbm8gZm9yd2FyZCBtb3Rpb25cblx0XHRpZiAod2hpdGVzcGFjZUVuZCA9PT0gc3RhcnQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgd2hpdGVzcGFjZSA9IHRleHQuc2xpY2Uoc3RhcnQsIHdoaXRlc3BhY2VFbmQpO1xuXHRcdGxldCB0b2tlbjtcblx0XHRpZiAoc3RhcnQgPT09IDAgfHwgdGV4dFtzdGFydC0xXSA9PT0gXCJcXG5cIilcblx0XHRcdHRva2VuID0gbmV3IFRva2VuaXplci5JbmRlbnQod2hpdGVzcGFjZSk7XG5cdFx0ZWxzZVxuXHRcdFx0dG9rZW4gPSBuZXcgVG9rZW5pemVyLldoaXRlc3BhY2Uod2hpdGVzcGFjZSk7XG5cblx0XHRyZXR1cm4gW3Rva2VuLCB3aGl0ZXNwYWNlRW5kXTtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgTmV3bGluZVxuXHQvL1xuXG5cdC8vIE1hdGNoIGEgc2luZ2xlIG5ld2xpbmUgY2hhcmFjdGVyIGF0IGB0ZXh0W3N0YXJ0XWAuXG5cdC8vIFJldHVybnMgYFtUb2tlbml6ZXIuTkVXTElORSwgbmV4dFN0YXJ0XWAgb24gbWF0Y2guXG5cdC8vIE90aGVyd2lzZSByZXR1cm5zIGB1bmRlZmluZWRgLlxuXHRtYXRjaE5ld2xpbmUodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCB8fCB0ZXh0W3N0YXJ0XSAhPT0gXCJcXG5cIikgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiBbVG9rZW5pemVyLk5FV0xJTkUsIHN0YXJ0ICsgMV07XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIFdvcmRcblx0Ly9cblxuXHQvLyBNYXRjaCBhIHNpbmdsZSBgd29yZGAgaW4gYHRleHRgIGF0IGNoYXJhY3RlciBgc3RhcnRgLlxuXHQvLyBSZXR1cm5zIGBbd29yZCwgd29yZEVuZF1gLlxuXHQvLyBSZXR1cm5zIGFuIGVtcHR5IGFycmF5IGlmIGNvdWxkbid0IG1hdGNoIGEgd29yZC5cblx0V09SRF9TVEFSVDogL1tBLVphLXpdLyxcblx0V09SRF9DSEFSIDogL15bXFx3Xy1dLyxcblx0bWF0Y2hXb3JkKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAoIXRoaXMuV09SRF9TVEFSVC50ZXN0KHRleHRbc3RhcnRdKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCB3b3JkRW5kID0gc3RhcnQgKyAxO1xuXHRcdHdoaWxlICh3b3JkRW5kIDwgZW5kICYmIHRoaXMuV09SRF9DSEFSLnRlc3QodGV4dFt3b3JkRW5kXSkpIHtcblx0XHRcdHdvcmRFbmQrKztcblx0XHR9XG5cdFx0aWYgKHdvcmRFbmQgPT09IHN0YXJ0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHdvcmQgPSB0ZXh0LnNsaWNlKHN0YXJ0LCB3b3JkRW5kKTtcblx0XHRyZXR1cm4gW3dvcmQsIHdvcmRFbmRdO1xuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBOdW1iZXJzXG5cdC8vXG5cblx0Ly8gRWF0IGEgc2luZ2xlIG51bWJlci5cblx0Ly8gUmV0dXJucyBhIGBOdW1iZXJgIGlmIG1hdGNoZWQuXG5cdE5VTUJFUl9TVEFSVDogL1swLTktLl0vLFxuXHROVU1CRVIgOiAvXi0/KFswLTldKlxcLik/WzAtOV0rLyxcblx0bWF0Y2hOdW1iZXIodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGlmICghdGhpcy5OVU1CRVJfU1RBUlQudGVzdCh0ZXh0W3N0YXJ0XSkpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgbnVtYmVyTWF0Y2ggPSB0aGlzLm1hdGNoRXhwcmVzc2lvbkF0SGVhZCh0aGlzLk5VTUJFUiwgdGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0aWYgKCFudW1iZXJNYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBudW1iZXJTdHIgPSBudW1iZXJNYXRjaFswXTtcblx0XHRsZXQgbnVtYmVyID0gcGFyc2VGbG9hdChudW1iZXJTdHIsIDEwKTtcblx0XHRyZXR1cm4gW251bWJlciwgc3RhcnQgKyBudW1iZXJTdHIubGVuZ3RoXTtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgVGV4dCBsaXRlcmFsXG5cdC8vXG5cblx0Ly8gRWF0IGEgdGV4dCBsaXRlcmFsIChzdGFydHMvZW5kcyB3aXRoIGAnYCBvciBgXCJgKS5cblx0Ly8gUmV0dXJucyBhIGBUb2tlbml6ZXIuVGV4dGAgaWYgbWF0Y2hlZC5cbi8vVEVTVE1FOiAgbm90IHN1cmUgdGhlIGVzY2FwaW5nIGxvZ2ljIGlzIHJlYWxseSByaWdodC4uLlxuXHRtYXRjaFRleHQodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBxdW90ZVN5bWJvbCA9IHRleHRbc3RhcnRdO1xuXHRcdGlmIChxdW90ZVN5bWJvbCAhPT0gJ1wiJyAmJiBxdW90ZVN5bWJvbCAhPT0gXCInXCIpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgdGV4dEVuZCA9IHN0YXJ0ICsgMTtcblx0XHR3aGlsZSAodGV4dEVuZCA8IGVuZCkge1xuXHRcdFx0bGV0IGNoYXIgPSB0ZXh0W3RleHRFbmRdO1xuXHRcdFx0aWYgKGNoYXIgPT09IHF1b3RlU3ltYm9sKSBicmVhaztcblx0XHRcdC8vIGlmIHdlIGdldCBhIGJhY2txdW90ZSwgaWdub3JlIHF1b3RlIGluIG5leHQgY2hhclxuXHRcdFx0aWYgKGNoYXIgPT09IFwiXFxcXFwiICYmIHRleHRbdGV4dEVuZCArIDFdID09PSBxdW90ZVN5bWJvbCkgdGV4dEVuZCsrO1xuXHRcdFx0dGV4dEVuZCsrO1xuXHRcdH1cblx0XHQvLyBGb3JnZXQgaXQgaWYgd2UgZGlkbid0IGVuZCB3aXRoIHRoZSBxdW90ZSBzeW1ib2xcblx0XHRpZiAodGV4dFt0ZXh0RW5kXSAhPT0gcXVvdGVTeW1ib2wpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0Ly8gYWR2YW5jZSBwYXN0IGVuZCBxdW90ZVxuXHRcdHRleHRFbmQrKztcblxuXHRcdGxldCBxdW90ZWRTdHJpbmcgPSB0ZXh0LnNsaWNlKHN0YXJ0LCB0ZXh0RW5kKTtcblx0XHRsZXQgdG9rZW4gPSBuZXcgVG9rZW5pemVyLlRleHQocXVvdGVkU3RyaW5nKTtcblx0XHRyZXR1cm4gW3Rva2VuLCB0ZXh0RW5kXTtcblx0fSxcblxuXHQvLyBgVGV4dGAgY2xhc3MgZm9yIHN0cmluZyBsaXRlcmFscy5cblx0Ly8gUGFzcyB0aGUgbGl0ZXJhbCB2YWx1ZSwgdXNlIGAudGV4dGAgdG8gZ2V0IGp1c3QgdGhlIGJpdCBpbnNpZGUgdGhlIHF1b3Rlcy5cblx0VGV4dCA6IGNsYXNzIHRleHQge1xuXHRcdGNvbnN0cnVjdG9yKHF1b3RlZFN0cmluZykge1xuXHRcdFx0dGhpcy5xdW90ZWRTdHJpbmcgPSBxdW90ZWRTdHJpbmc7XG5cdFx0fVxuXHRcdGdldCB0ZXh0KCkge1xuXHRcdFx0bGV0IHN0cmluZyA9IHRoaXMucXVvdGVkU3RyaW5nO1xuXHRcdFx0Ly8gY2FsY3VsYXRlIGB0ZXh0YCBhcyB0aGUgYml0cyBiZXR3ZWVuIHRoZSBxdW90ZXMuXG5cdFx0XHRsZXQgc3RhcnQgPSAwO1xuXHRcdFx0bGV0IGVuZCA9IHN0cmluZy5sZW5ndGg7XG5cdFx0XHRpZiAoc3RyaW5nW3N0YXJ0XSA9PT0gJ1wiJyB8fCBzdHJpbmdbc3RhcnRdID09PSBcIidcIikgc3RhcnQgPSAxO1xuXHRcdFx0aWYgKHN0cmluZ1tlbmQtMV0gPT09ICdcIicgfHwgc3RyaW5nW2VuZC0xXSA9PT0gXCInXCIpIGVuZCA9IC0xO1xuXHRcdFx0cmV0dXJuIHN0cmluZy5zbGljZShzdGFydCwgZW5kKTtcblx0XHR9XG5cdFx0dG9TdHJpbmcoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5xdW90ZWRTdHJpbmc7XG5cdFx0fVxuXHR9LFxuXG5cdC8vXG5cdC8vXHQjIyMgQ29tbWVudHNcblx0Ly9cblxuXHQvLyBFYXQgYSBjb21tZW50ICh1bnRpbCB0aGUgZW5kIG9mIHRoZSBsaW5lKS5cblx0Ly8gUmV0dXJucyBhIGBUb2tlbml6ZXIuQ29tbWVudGAgaWYgbWF0Y2hlZC5cblx0Q09NTUVOVCA6IC9eKCMjK3wtLSt8XFwvXFwvKykoXFxzKikoLiopLyxcblx0bWF0Y2hDb21tZW50KHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgY29tbWVudFN0YXJ0ID0gdGV4dC5zbGljZShzdGFydCwgc3RhcnQgKyAyKTtcblx0XHRpZiAoY29tbWVudFN0YXJ0ICE9PSBcIi0tXCIgJiYgY29tbWVudFN0YXJ0ICE9PSBcIlxcL1xcL1wiICYmIGNvbW1lbnRTdGFydCAhPT0gXCIjI1wiKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gY29tbWVudCBlYXRzIHVudGlsIHRoZSBlbmQgb2YgdGhlIGxpbmVcblx0XHRsZXQgbGluZSA9IHRoaXMuZ2V0TGluZUF0SGVhZCh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRsZXQgY29tbWVudE1hdGNoID0gbGluZS5tYXRjaCh0aGlzLkNPTU1FTlQpXG5cdFx0aWYgKCFjb21tZW50TWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgW21hdGNoLCBjb21tZW50U3ltYm9sLCB3aGl0ZXNwYWNlLCBjb21tZW50XSA9IGNvbW1lbnRNYXRjaDtcblx0XHRsZXQgdG9rZW4gPSBuZXcgVG9rZW5pemVyLkNvbW1lbnQoeyBjb21tZW50U3ltYm9sLCB3aGl0ZXNwYWNlLCBjb21tZW50IH0pO1xuXHRcdHJldHVybiBbdG9rZW4sIHN0YXJ0ICsgbGluZS5sZW5ndGhdO1xuXHR9LFxuXG5cdC8vIENvbW1lbnQgY2xhc3Ncbi8vVEVTVE1FXG5cdENvbW1lbnQgOiBjbGFzcyBjb21tZW50IHtcblx0XHRjb25zdHJ1Y3RvciAocHJvcHMpIHtcblx0XHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcHMpO1xuXHRcdH1cblx0XHR0b1N0cmluZygpIHtcblx0XHRcdHJldHVybiBgJHt0aGlzLmNvbW1lbnRTeW1ib2x9JHt0aGlzLndoaXRlc3BhY2V9JHt0aGlzLmNvbW1lbnR9YDtcblx0XHR9XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIEpTWFxuXHQvL1xuXG5cdC8vIEVhdCBhIChuZXN0ZWQpIEpTWCBleHByZXNzaW9uLlxuLy9URVNUTUVcblx0bWF0Y2hKU1hFbGVtZW50KHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgW2pzeEVsZW1lbnQsIG5leHRTdGFydF0gPSB0aGlzLm1hdGNoSlNYU3RhcnRUYWcodGV4dCwgc3RhcnQsIGVuZCkgfHwgW107XG5cdFx0aWYgKCFqc3hFbGVtZW50KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKCFqc3hFbGVtZW50LmlzVW5hcnlUYWcpIHtcblx0XHRcdGxldCBbY2hpbGRyZW4sIGNoaWxkRW5kXSA9IHRoaXMubWF0Y2hKU1hDaGlsZHJlbihqc3hFbGVtZW50LnRhZ05hbWUsIHRleHQsIG5leHRTdGFydCwgZW5kKTtcblx0XHRcdGlmIChjaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdFx0anN4RWxlbWVudC5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuXHRcdFx0XHRuZXh0U3RhcnQgPSBjaGlsZEVuZDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gW2pzeEVsZW1lbnQsIG5leHRTdGFydF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggSlNYIHN0YXJ0IHRhZyBhbmQgaW50ZXJuYWwgZWxlbWVudHMgKGJ1dCBOT1QgY2hpbGRyZW4pLlxuXHQvLyBSZXR1cm5zIGBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XWAgb3IgYHVuZGVmaW5lZGAuXG5cdC8vIFVzZSBgbWF0Y2hKU1hFbGVtZW50KClgIHRvIG1hdGNoIGNoaWxkcmVuLCBlbmQgdGFnLCBldGMuXG5cdC8vIElnbm9yZXMgbGVhZGluZyB3aGl0ZXNwYWNlLlxuXHRKU1hfVEFHX1NUQVJUIDogL148KFtBLVphLXpdW1xcdy1cXC5dKikoXFxzKlxcLz58XFxzKj58XFxzKykvLFxuLy8gVE9ETzogY2xlYW4gdGhpcyBzdHVmZiB1cCwgbWF5YmUgd2l0aCBmaW5kRmlyc3RBdEhlYWQ/XG5cdG1hdGNoSlNYU3RhcnRUYWcodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBuZXh0U3RhcnQgPSB0aGlzLmVhdFdoaXRlc3BhY2UodGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0Ly8gTWFrZSBzdXJlIHdlIHN0YXJ0IHdpdGggYDxgLlxuXHRcdGlmICh0ZXh0W25leHRTdGFydF0gIT09IFwiPFwiKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHRhZ01hdGNoID0gdGhpcy5tYXRjaEV4cHJlc3Npb25BdEhlYWQodGhpcy5KU1hfVEFHX1NUQVJULCB0ZXh0LCBuZXh0U3RhcnQsIGVuZCk7XG5cdFx0aWYgKCF0YWdNYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBbIG1hdGNoVGV4dCwgdGFnTmFtZSwgZW5kQml0IF0gPSB0YWdNYXRjaDtcblx0XHRsZXQganN4RWxlbWVudCA9IG5ldyBUb2tlbml6ZXIuSlNYRWxlbWVudCh0YWdOYW1lKTtcblx0XHRuZXh0U3RhcnQgPSBuZXh0U3RhcnQgKyBtYXRjaFRleHQubGVuZ3RoO1xuXG5cdFx0Ly8gSWYgdW5hcnkgdGFnLCBtYXJrIGFzIHN1Y2ggYW5kIHJldHVybi5cblx0XHRlbmRCaXQgPSBlbmRCaXQudHJpbSgpO1xuXHRcdGlmIChlbmRCaXQgPT09IFwiLz5cIikge1xuXHRcdFx0anN4RWxlbWVudC5pc1VuYXJ5VGFnID0gdHJ1ZTtcblx0XHRcdHJldHVybiBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XTtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSBkaWRuJ3QgaW1tZWRpYXRlbHkgZ2V0IGFuIGVuZCBtYXJrZXIsIGF0dGVtcHQgdG8gbWF0Y2ggYXR0cmlidXRlc1xuXHRcdGlmIChlbmRCaXQgIT09IFwiPlwiICYmIGVuZEJpdCAhPT0gXCIvPlwiKSB7XG5cdFx0XHRsZXQgWyBhdHRycywgYXR0ckVuZCBdID0gdGhpcy5lYXRUb2tlbnModGhpcy5tYXRjaEpTWEF0dHJpYnV0ZSwgdGV4dCwgbmV4dFN0YXJ0LCBlbmQpO1xuXHRcdFx0anN4RWxlbWVudC5hdHRyaWJ1dGVzID0gYXR0cnM7XG5cdFx0XHRuZXh0U3RhcnQgPSBhdHRyRW5kO1xuXHRcdH1cblxuXHRcdC8vIGF0IHRoaXMgcG9pbnQgd2Ugc2hvdWxkIGdldCBhbiBgLz5gIG9yIGA+YCAod2l0aCBubyB3aGl0ZXNwYWNlKS5cblx0XHRpZiAodGV4dFtuZXh0U3RhcnRdID09PSBcIi9cIiAmJiB0ZXh0W25leHRTdGFydCArIDFdID09PSBcIj5cIikge1xuXHRcdFx0ZW5kQml0ID0gXCIvPlwiO1xuXHRcdFx0bmV4dFN0YXJ0ICs9IDI7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHRleHRbbmV4dFN0YXJ0XSA9PT0gXCI+XCIpIHtcblx0XHRcdGVuZEJpdCA9IHRleHRbbmV4dFN0YXJ0XTtcblx0XHRcdG5leHRTdGFydCArPSAxO1xuXHRcdH1cblxuXHRcdC8vIFJldHVybiBpbW1lZGlhdGVseSBmb3IgdW5hcnkgdGFnXG5cdFx0aWYgKGVuZEJpdCA9PT0gXCIvPlwiKSB7XG5cdFx0XHRqc3hFbGVtZW50LmlzVW5hcnlUYWcgPSB0cnVlO1xuXHRcdFx0cmV0dXJuIFtqc3hFbGVtZW50LCBuZXh0U3RhcnRdO1xuXHRcdH1cblxuXHRcdC8vIGFkdmFuY2UgcGFzdCBgPmBcblx0XHRpZiAoZW5kQml0ICE9PSBcIj5cIikge1xuXHRcdFx0Y29uc29sZS53YXJuKFwiTWlzc2luZyBleHBlY3RlZCBlbmQgYD5gIGZvciBqc3hFbGVtZW50XCIsIGpzeEVsZW1lbnQsIFwiYFwiK3RleHQuc2xpY2Uoc3RhcnQsIG5leHRTdGFydCkrXCJgXCIpO1xuXHRcdFx0anN4RWxlbWVudC5lcnJvciA9IFwiTm8gZW5kID5cIjtcblx0XHRcdHJldHVybiBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XTtcblx0XHR9XG5cblx0XHRyZXR1cm4gW2pzeEVsZW1lbnQsIG5leHRTdGFydF07XG5cdH0sXG5cblxuXHQvLyBKU1ggZWxlbWVudCBjbGFzc1xuXHRKU1hFbGVtZW50IDogY2xhc3MganN4RWxlbWVudCB7XG5cdFx0Y29uc3RydWN0b3IodGFnTmFtZSwgYXR0cmlidXRlcywgY2hpbGRyZW4pIHtcblx0XHRcdHRoaXMudGFnTmFtZSA9IHRhZ05hbWU7XG5cdFx0XHRpZiAoYXR0cmlidXRlcykgdGhpcy5hdHRyaWJ1dGVzID0gYXR0cmlidXRlcztcblx0XHRcdGlmIChjaGlsZHJlbikgdGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuXHRcdH1cblxuXHRcdC8vIFJldHVybiBhdHRyaWJ1dGVzIGFzIGEgbWFwLlxuLy9URVNUTUVcblx0XHRnZXQgYXR0cnMoKSB7XG5cdFx0XHRsZXQgYXR0cnMgPSB7fTtcblx0XHRcdGlmICh0aGlzLmF0dHJpYnV0ZXMpIHRoaXMuYXR0cmlidXRlcy5mb3JFYWNoKGF0dHIgPT4ge1xuXHRcdFx0XHQvLyBpZ25vcmUgdW5uYW1lZCBhdHRyaWJ1dGVzXG5cdFx0XHRcdGlmIChhdHRyLm5hbWUpIGF0dHJzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlXG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBhdHRycztcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4gb3VyIGF0dHJpYnV0ZXMgYXMgYSBzdHJpbmdcbi8vVEVTVE1FXG5cdFx0Z2V0IGF0dHJzQXNTdHJpbmcoKSB7XG5cdFx0XHRpZiAoIXRoaXMuYXR0cmlidXRlcykgcmV0dXJuIFwiXCI7XG5cdFx0XHRyZXR1cm4gXCIgXCIgKyB0aGlzLmF0dHJpYnV0ZXMubWFwKCAoeyBuYW1lLCB2YWx1ZSB9KSA9PiB7XG5cdFx0XHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbmFtZTtcblx0XHRcdFx0Ly8gY29udmVydCB2YWx1ZSBhcnJheSAodG9rZW5zKSB0byBzdHJpbmdcblx0XHRcdFx0Ly8gVE9ETzogdGhpcyB3aWxsIHdhbnQgdG8gYmUgc21hcnRlci4uLlxuXHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHZhbHVlID0gYHske3ZhbHVlLmpvaW4oXCIgXCIpfX1gO1xuXHRcdFx0XHRyZXR1cm4gYG5hbWU9JHt2YWx1ZX1gO1xuXHRcdFx0fSkuam9pbihcIiBcIik7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIG91ciBjaGlsZHJlbiBhcyBhIHN0cmluZy5cbi8vVEVTVE1FXG5cdFx0Z2V0IGNoaWxkcmVuQXNTdHJpbmcoKSB7XG5cdFx0XHRpZiAoIXRoaXMuY2hpbGRyZW4pIHJldHVybiBcIlwiO1xuXHRcdFx0cmV0dXJuIHRoaXMuY2hpbGRyZW4ubWFwKGNoaWxkID0+IHtcblx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkoY2hpbGQpKSByZXR1cm4gYHske2NoaWxkLmpvaW4oXCIgXCIpfX1gO1xuXHRcdFx0XHRyZXR1cm4gXCJcIiArIGNoaWxkO1xuXHRcdFx0fSkuam9pbihcIlwiKTtcblx0XHR9XG5cblx0XHR0b1N0cmluZygpIHtcblx0XHRcdGxldCBhdHRycyA9IHRoaXMuYXR0cnNBc1N0cmluZztcblx0XHRcdGxldCBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW5Bc1N0cmluZztcblx0XHRcdGlmICh0aGlzLmlzVW5hcnlUYWcpIHJldHVybiBgPCR7dGhpcy50YWdOYW1lfSR7YXR0cnN9Lz5gO1xuXHRcdFx0cmV0dXJuIGA8JHt0aGlzLnRhZ05hbWV9JHthdHRyc30+JHtjaGlsZHJlbn08LyR7dGhpcy50YWdOYW1lfT5gO1xuXHRcdH1cblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgSlNYIGNoaWxkcmVuXG5cdC8vXG5cblx0Ly8gTWF0Y2ggSlNYIGVsZW1lbnQgY2hpbGRyZW4gb2YgYDx0YWdOYW1lPmAgYXQgYHRleHRbc3RhcnRdYC5cblx0Ly8gTWF0Y2hlcyBuZXN0ZWQgY2hpbGRyZW4gYW5kIHN0b3BzIGFmdGVyIG1hdGNoaW5nIGVuZCB0YWc6IGA8L3RhZ05hbWU+YC5cblx0Ly8gUmV0dXJucyBgW2NoaWxkcmVuLCBuZXh0U3RhcnRdYC5cbi8vVEVTVE1FXG5cdG1hdGNoSlNYQ2hpbGRyZW4odGFnTmFtZSwgdGV4dCwgc3RhcnQsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IGNoaWxkcmVuID0gW107XG5cdFx0bGV0IG5lc3RpbmcgPSAxO1xuXHRcdGxldCBlbmRUYWcgPSBgPC8ke3RhZ05hbWV9PmA7XG5cblx0XHRsZXQgbmV4dFN0YXJ0ID0gc3RhcnQ7XG5cdFx0d2hpbGUodHJ1ZSkge1xuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMubWF0Y2hKU1hDaGlsZChlbmRUYWcsIHRleHQsIG5leHRTdGFydCwgZW5kKTtcblx0XHRcdGlmICghcmVzdWx0KSBicmVhaztcblxuXHRcdFx0bGV0IFtjaGlsZCwgY2hpbGRFbmRdID0gcmVzdWx0O1xuXHRcdFx0bmV4dFN0YXJ0ID0gY2hpbGRFbmQ7XG5cdFx0XHQvLyBJZiB3ZSBnb3QgdGhlIGVuZFRhZywgdXBkYXRlIG5lc3RpbmcgYW5kIGJyZWFrIG91dCBvZiBsb29wIGlmIG5lc3RpbmcgIT09IDBcblx0XHRcdGlmIChjaGlsZCA9PT0gZW5kVGFnKSB7XG5cdFx0XHRcdG5lc3RpbmcgLS07XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKSBicmVhaztcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0aWYgKGNoaWxkKSBjaGlsZHJlbi5wdXNoKGNoaWxkKTtcblx0XHRcdH1cblx0XHR9XG4vLyBUT0RPOiBob3cgdG8gc3VyZmFjZSB0aGlzIGVycm9yPz8/XG5cdFx0aWYgKG5lc3RpbmcgIT09IDApIHtcblx0XHRcdGNvbnNvbGUud2FybihgbWF0Y2hKU1hDaGlsZHJlbigke3RleHQuc2xpY2Uoc3RhcnQsIG5leHRTdGFydCArIDEwKX06IGRpZG4ndCBtYXRjaCBlbmQgY2hpbGQhYCk7XG5cdFx0fVxuXHRcdHJldHVybiBbY2hpbGRyZW4sIG5leHRTdGFydF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYSBzaW5nbGUgSlNYIGNoaWxkOlxuXHQvL1x0LSBjdXJyZW50IGVuZFRhZ1xuXHQvL1x0LSBgeyBqc3ggZXhwcmVzc2lvbiB9YFxuXHQvL1x0LSBuZXN0ZWQgSlNYIGVsZW1lbnRcblx0Ly9cdC0gKGFueXRoaW5nIGVsc2UpIGFzIGpzeFRleHQgZXhwcmVzc2lvbi5cblx0bWF0Y2hKU1hDaGlsZChlbmRUYWcsIHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hKU1hFbmRUYWcoZW5kVGFnLCB0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0fHwgdGhpcy5tYXRjaEpTWEV4cHJlc3Npb24odGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdHx8IHRoaXMubWF0Y2hKU1hFbGVtZW50KHRleHQsIHN0YXJ0LCBlbmQpXG4vLyBUT0RPOiBuZXdsaW5lIGFuZCBpbmRlbnQ/XG5cdFx0XHR8fCB0aGlzLm1hdGNoSlNYVGV4dCh0ZXh0LCBzdGFydCwgZW5kKTtcblx0fSxcblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIGEgc3BlY2lmaWMgZW5kIHRhZy5cblx0Ly8gSWdub3JlcyBsZWFkaW5nIHdoaXRlc3BhY2UuXG5cdG1hdGNoSlNYRW5kVGFnKGVuZFRhZywgdGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBuZXh0U3RhcnQgPSB0aGlzLmVhdFdoaXRlc3BhY2UodGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0aWYgKCF0aGlzLm1hdGNoU3RyaW5nQXRIZWFkKGVuZFRhZywgdGV4dCwgbmV4dFN0YXJ0LCBlbmQpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiBbZW5kVGFnLCBuZXh0U3RhcnQgKyBlbmRUYWcubGVuZ3RoXTtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgSlNYIGF0dHJpYnV0ZXNcblx0Ly9cblxuXHQvLyBNYXRjaCBhIHNpbmdsZSBKU1ggZWxlbWVudCBhdHRyaWJ1dGUgYXMgYDxhdHRyPj17PHZhbHVlPn1gXG4vLyBUT0RPOiB7Li4ueHh4fVxuXHRKU1hfQVRUUklCVVRFX1NUQVJUIDogL15cXHMqKFtcXHctXStcXGIpXFxzKig9PylcXHMqLyxcblx0bWF0Y2hKU1hBdHRyaWJ1dGUodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGF0dHJpYnV0ZXMgbXVzdCBzdGFydCB3aXRoIGEgd29yZCBjaGFyYWN0ZXJcblx0XHRpZiAoIXRoaXMuV09SRF9TVEFSVC50ZXN0KHRleHRbc3RhcnRdKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGF0dGVtcHQgdG8gbWF0Y2ggYW4gYXR0cmlidXRlIG5hbWUsIGluY2x1ZGluZyBgPWAgaWYgcHJlc2VudC5cblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5tYXRjaEV4cHJlc3Npb25BdEhlYWQodGhpcy5KU1hfQVRUUklCVVRFX1NUQVJULCB0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRpZiAoIXJlc3VsdCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBbIG1hdGNoLCBuYW1lLCBlcXVhbHMgXSA9IHJlc3VsdDtcblx0XHRsZXQgbmV4dFN0YXJ0ID0gc3RhcnQgKyBtYXRjaC5sZW5ndGg7XG5cdFx0bGV0IGF0dHJpYnV0ZSA9IG5ldyBUb2tlbml6ZXIuSlNYQXR0cmlidXRlKG5hbWUpO1xuXG5cdFx0Ly8gaWYgdGhlcmUgd2FzIGFuIGVxdWFscyBjaGFyLCBwYXJzZSB0aGUgdmFsdWVcblx0XHRpZiAoZXF1YWxzKSB7XG5cdFx0XHRsZXQgW3ZhbHVlLCB2YWx1ZUVuZF0gPSB0aGlzLm1hdGNoSlNYQXR0cmlidXRlVmFsdWUodGV4dCwgbmV4dFN0YXJ0LCBlbmQpIHx8IFtdO1xuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdGF0dHJpYnV0ZS52YWx1ZSA9IHZhbHVlO1xuXHRcdFx0XHRuZXh0U3RhcnQgPSB2YWx1ZUVuZDtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gZWF0IHdoaXRlc3BhY2UgYmVmb3JlIHRoZSBuZXh0IGF0dHJpYnV0ZSAvIHRhZyBlbmRcblx0XHRuZXh0U3RhcnQgPSB0aGlzLmVhdFdoaXRlc3BhY2UodGV4dCwgbmV4dFN0YXJ0LCBlbmQpO1xuXHRcdHJldHVybiBbYXR0cmlidXRlLCBuZXh0U3RhcnRdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGEgdmFsdWUgZXhwcmVzc2lvbiBmb3IgYSBKU1ggZWxlbWVudCBhdHRyaWJ1dGU6XG5cdC8vIE5PVEU6IHdlIHdpbGwgYmUgY2FsbGVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBgPWAgKGFuZCBzdWJzZXF1ZW50IHdoaXRlc3BhY2UpLlxuXHRtYXRjaEpTWEF0dHJpYnV0ZVZhbHVlKHRleHQsIHN0YXJ0LCBlbmQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaFRleHQodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdHx8IHRoaXMubWF0Y2hKU1hFeHByZXNzaW9uKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHR8fCB0aGlzLm1hdGNoSlNYRWxlbWVudCh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0fHwgdGhpcy5tYXRjaEpTWEF0dHJpYnV0ZVZhbHVlSWRlbnRpZmllcih0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0fHwgdGhpcy5tYXRjaE51bWJlcih0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdDtcblx0fSxcblxuXHQvLyBNYXRjaCBhIHNpbmdsZSBpZGVudGlmZXIgYXMgYSBKU1ggYXR0cmlidXRlIHZhbHVlLlxuXHQvLyBSZXR1cm5zIGFzIGEgYEpTWEV4cHJlc3Npb25gLlxuXHRtYXRjaEpTWEF0dHJpYnV0ZVZhbHVlSWRlbnRpZmllcih0ZXh0LCBzdGFydCwgZW5kKSB7XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMubWF0Y2hXb3JkKHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm47XG5cblx0XHRsZXQgWyB3b3JkLCBuZXh0U3RhcnQgXSA9IHJlc3VsdDtcblx0XHRsZXQgdG9rZW4gPSBuZXcgVG9rZW5pemVyLkpTWEV4cHJlc3Npb24od29yZCk7XG5cdFx0cmV0dXJuIFt0b2tlbiwgbmV4dFN0YXJ0XTtcblx0fSxcblxuXHQvLyBKU1ggYXR0cmlidXRlIGNsYXNzXG5cdC8vIGBuYW1lYCBpcyB0aGUgbmFtZSBvZiB0aGUgYXR0cmlidXRlLlxuXHQvLyBgdmFsdWVgIGlzIG9uZSBvZjpcblx0Ly9cdFx0LSBgJy4uLidgXHRcdFx0Ly8gVGV4dCAobGl0ZXJhbCBzdHJpbmcpLlxuXHQvL1x0XHQtIGBcIi4uLlwiYFx0XHRcdC8vIFRleHQgKGxpdGVyYWwgc3RyaW5nKS5cblx0Ly9cdFx0LSBgey4uLn1gXHRcdFx0Ly8gRXhwcmVzc2lvbi4gIFJlc3VsdHMgd2lsbCBiZSB0b2tlbml6ZWQgYXJyYXkuXG5cdC8vXHRcdC0gYDwuLi4uPmBcdFx0XHQvLyBKU1ggZWxlbWVudC5cblx0Ly9cdFx0LSBgMWBcdFx0XHRcdC8vIE51bWJlci4gIE5vdGU6IHRoaXMgaXMgYW4gZXh0ZW5zaW9uIHRvIEpTWC5cblxuXHRKU1hBdHRyaWJ1dGUgOiBjbGFzcyBqc3hBdHRyaWJ1dGUge1xuXHRcdGNvbnN0cnVjdG9yKG5hbWUsIHZhbHVlKSB7XG5cdFx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHRoaXMudmFsdWUgPSB2YWx1ZTtcblx0XHR9XG5cdFx0dG9TdHJpbmcoKSB7XG5cdFx0XHRpZiAodGhpcy52YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5uYW1lO1xuXHRcdFx0cmV0dXJuIGAke3RoaXMubmFtZX09eyR7dGhpcy52YWx1ZX19YDtcblx0XHR9XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBhIEpTWCBleHByZXNzaW9uIGVuY2xvc2VkIGluIGN1cmx5IGJyYWNlcywgZWc6ICBgeyAuLi4gfWAuXG5cdC8vICBIYW5kbGVzIG5lc3RlZCBjdXJsaWVzLCBxdW90ZXMsIGV0Yy5cblx0Ly8gUmV0dXJucyBhcnJheSBvZiB0b2tlbnMgb2YgaW50ZXJuYWwgbWF0Y2guXG5cdC8vIElnbm9yZXMgbGVhZGluZyB3aGl0ZXNwYWNlLlxuLy9UT0RPOiBuZXdsaW5lcy9pbmRlbnRzPz8/XG4vL1RPRE86IHsuLi54eHh9XG4vL1RFU1RNRVxuXHRtYXRjaEpTWEV4cHJlc3Npb24odGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBuZXh0U3RhcnQgPSB0aGlzLmVhdFdoaXRlc3BhY2UodGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0bGV0IGVuZEluZGV4ID0gdGhpcy5maW5kTWF0Y2hpbmdBdEhlYWQoXCJ7XCIsIFwifVwiLCB0ZXh0LCBuZXh0U3RhcnQsIGVuZCk7XG5cdFx0aWYgKGVuZEluZGV4ID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBHZXQgY29udGVudHMsIGluY2x1ZGluZyBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLlxuXHRcdGxldCBjb250ZW50cyA9IHRleHQuc2xpY2Uoc3RhcnQgKyAxLCBlbmRJbmRleCk7XG5cblx0XHQvLyByZXR1cm4gYSBuZXcgSlNYRXhwcmVzc2lvbiwgYWR2YW5jaW5nIGJleW9uZCB0aGUgZW5kaW5nIGB9YC5cblx0XHRsZXQgZXhwcmVzc2lvbiA9IG5ldyBUb2tlbml6ZXIuSlNYRXhwcmVzc2lvbihjb250ZW50cyk7XG5cdFx0cmV0dXJuIFtleHByZXNzaW9uLCBlbmRJbmRleCArIDFdO1xuXHR9LFxuXG5cdC8vIEpTWCBleHByZXNzaW9uLCBjb21wb3NlZCBvZiBpbmxpbmUgdG9rZW5zIHdoaWNoIHNob3VsZCB5aWVsZCBhbiBgZXhwcmVzc2lvbmAuXG5cdEpTWEV4cHJlc3Npb24gOiBjbGFzcyBqc3hFeHByZXNzaW9uIHtcblx0XHRjb25zdHJ1Y3Rvcihjb250ZW50cykge1xuXHRcdFx0dGhpcy5jb250ZW50cyA9IGNvbnRlbnRzIHx8IFwiXCI7XG5cdFx0fVxuXHRcdC8vIERpdmlkZSBjb250ZW50cyBpbnRvIGB0b2tlbnNgLlxuXHRcdGdldCB0b2tlbnMoKSB7XG5cdFx0XHRyZXR1cm4gVG9rZW5pemVyLnRva2VuaXplKHRoaXMuY29udGVudHMudHJpbSgpKTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggSlNYVGV4dCB1bnRpbCB0aGUgb25lIG9mIGB7YCwgYDxgLCBgPmAgb3IgYH1gLlxuXHQvLyBOT1RFOiBJTkNMVURFUyBsZWFkaW5nIC8gdHJhaWxpbmcgd2hpdGVzcGFjZS5cblx0SlNYX1RFWFRfRU5EX0NIQVJTIDogW1wie1wiLCBcIjxcIiwgXCI+XCIsIFwifVwiXSxcbi8vVEVTVE1FXG5cdG1hdGNoSlNYVGV4dCh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gdGVtcG9yYXJpbHkgYWR2YW5jZSBwYXN0IHdoaXRlc3BhY2UgKHdlJ2xsIGluY2x1ZGUgaXQgaW4gdGhlIG91dHB1dCkuXG5cdFx0bGV0IG5leHRTdGFydCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRsZXQgZW5kSW5kZXggPSB0aGlzLmZpbmRGaXJzdEF0SGVhZCh0aGlzLkpTWF9URVhUX0VORF9DSEFSUywgdGV4dCwgbmV4dFN0YXJ0LCBlbmQpO1xuXHRcdC8vIElmIHRoZSBmaXJzdCBub24td2hpdGVzcGFjZSBjaGFyIGlzIGluIG91ciBFTkRfQ0hBUlMsIGZvcmdldCBpdC5cblx0XHRpZiAoZW5kSW5kZXggPT09IG5leHRTdGFydCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGlmIG5vIG1hdGNoLCB3ZSd2ZSBnb3Qgc29tZSBzb3J0IG9mIGVycm9yXG5cdFx0aWYgKGVuZEluZGV4ID09PSB1bmRlZmluZWQpIHtcblx0XHRcdGNvbnNvbGUud2FybihcIm1hdGNoSlNYVGV4dChcIit0ZXh0LnNsaWNlKHN0YXJ0LCBzdGFydCArIDUwKStcIik6IEpTWCBzZWVtcyB0byBiZSB1bmJhbGFuY2VkLlwiKTtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0Ly8gaW5jbHVkZSBsZWFkaW5nIHdoaXRlc3BhY2UgaW4gdGhlIG91dHB1dC5cblx0XHRsZXQganN4VGV4dCA9IHRleHQuc2xpY2Uoc3RhcnQsIGVuZEluZGV4KTtcblx0XHRyZXR1cm4gW2pzeFRleHQsIGVuZEluZGV4XTtcblx0fSxcblxuXG5cblxuXHQvL1xuXHQvL1x0IyMgVXRpbGl0eSBmdW5jdGlvbnNcblx0Ly9cblxuXHQvLyBSZXR1cm4gY2hhcmFjdGVycyB1cCB0bywgYnV0IG5vdCBpbmNsdWRpbmcsIHRoZSBuZXh0IG5ld2xpbmUgY2hhciBhZnRlciBgc3RhcnRgLlxuXHQvLyBJZiBgc3RhcnRgIGlzIGEgbmV3bGluZSBjaGFyIG9yIHN0YXJ0ID49IGVuZCwgcmV0dXJucyBlbXB0eSBzdHJpbmcuXG5cdC8vIElmIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZyAoZWc6IG5vIG1vcmUgbmV3bGluZXMpLCByZXR1cm5zIGZyb20gc3RhcnQgdG8gZW5kLlxuLy9URVNUTUVcblx0Z2V0TGluZUF0SGVhZCh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gXCJcIjtcblxuXHRcdGxldCBuZXdsaW5lID0gdGV4dC5pbmRleE9mKFwiXFxuXCIsIHN0YXJ0KTtcblx0XHRpZiAobmV3bGluZSA9PT0gLTEgfHwgbmV3bGluZSA+IGVuZCkgbmV3bGluZSA9IGVuZDtcblx0XHRyZXR1cm4gdGV4dC5zbGljZShzdGFydCwgbmV3bGluZSk7XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYSBtdWx0aS1jaGFyIHN0cmluZyBzdGFydGluZyBhdCBgdGV4dFtzdGFydF1gLlxuLy9URVNUTUVcblx0bWF0Y2hTdHJpbmdBdEhlYWQoc3RyaW5nLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHN0cmluZ0VuZCA9IHN0YXJ0ICsgc3RyaW5nLmxlbmd0aDtcblx0XHRpZiAoc3RyaW5nRW5kID4gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiBzdHJpbmcgPT09IHRleHQuc2xpY2Uoc3RhcnQsIHN0cmluZ0VuZCk7XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBzdGFydGluZyBhdCBgdGV4dFtzdGFydF1gLCByZXR1cm5pbmcgdGhlIG1hdGNoLlxuXHQvLyBSZXR1cm5zIGBudWxsYCBpZiBubyBtYXRjaC5cblx0Ly9cblx0Ly8gTk9URTogVGhlIGV4cHJlc3Npb24gTVVTVCBzdGFydCB3aXRoIGAvXi4uLi9gXG4vL1RFU1RNRVxuXHRtYXRjaEV4cHJlc3Npb25BdEhlYWQoZXhwcmVzc2lvbiwgdGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBoZWFkID0gdGV4dC5zbGljZShzdGFydCwgZW5kKTtcblx0XHRyZXR1cm4gaGVhZC5tYXRjaChleHByZXNzaW9uKTtcblx0fSxcblxuXHQvLyBGaW5kIGluZGV4IG9mIHRoZSBtYXRjaGluZyBTSU5HTEUgQ0hBUkFDVEVSIGBlbmREZWxpbWl0ZXJgIHRvIG1hdGNoIGBzdGFydERlbGltaXRlcmAuXG5cdC8vIE1hdGNoZXMgbmVzdGVkIGRlbGltaXRlcnMgYW5kIGhhbmRsZXMgZXNjYXBlZCBkZWxpbWl0ZXJzLlxuXHQvLyBBc3N1bWVzIGB0ZXh0W3N0YXJ0XWAgaXMgdGhlIHN0YXJ0RGVsaW1pdGVyIVxuXHQvLyBSZXR1cm5zIG51bWVyaWMgaW5kZXggb3IgYHVuZGVmaW5lZGAgaWYgbm8gbWF0Y2ggb3IgaWYgZmlyc3QgY2hhciBpcyBub3QgYHN0YXJ0RGVsaW1pdGVyYC5cblx0Ly9cblx0Ly9cdEFsc28gaGFuZGxlcyBuZXN0ZWQgcXVvdGVzIC0tIGlmIHdlIGVuY291bnRlciBhIHNpbmdsZSBvciBkb3VibGUgcXVvdGUsXG5cdC8vXHRcdHdlJ2xsIHNraXAgc2Nhbm5pbmcgdW50aWwgd2UgZmluZCBhIG1hdGNoaW5nIHF1b3RlLlxuXHQvL1xuXHQvL1x0ZWc6ICBgZmluZE1hdGNoaW5nQXRIZWFkKFwie1wiLCBcIn1cIiwgXCJ7YWF7YX1hYX1cIilgID0+IDhcbi8vVEVTVE1FXG5cdGZpbmRNYXRjaGluZ0F0SGVhZChzdGFydERlbGltaXRlciwgZW5kRGVsaW1pdGVyLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRleHRbc3RhcnRdICE9PSBzdGFydERlbGltaXRlcikgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgY3VycmVudCA9IHN0YXJ0O1xuXHRcdHdoaWxlIChjdXJyZW50IDwgZW5kKSB7XG5cdFx0XHRsZXQgY2hhciA9IHRleHRbY3VycmVudF07XG5cdFx0XHQvLyBpZiBzdGFydERlbGltaXRlciwgaW5jcmVhc2UgbmVzdGluZ1xuXHRcdFx0aWYgKGNoYXIgPT09IHN0YXJ0RGVsaW1pdGVyKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdH1cblx0XHRcdC8vIGlmIGVuZERlbGltaXRlciwgZGVjcmVhc2UgbmVzdGluZyBhbmQgcmV0dXJuIGlmIG5lc3RpbmcgYmFjayB0byAwXG5cdFx0XHRlbHNlIGlmIChjaGFyID09PSBlbmREZWxpbWl0ZXIpIHtcblx0XHRcdFx0bmVzdGluZy0tO1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMCkgcmV0dXJuIGN1cnJlbnQ7XG5cdFx0XHR9XG5cdFx0XHQvLyBpZiBhIHNpbmdsZSBvciBkb3VibGUgcXVvdGUsIHNraXAgdW50aWwgdGhlIG1hdGNoaW5nIHF1b3RlXG5cdFx0XHRlbHNlIGlmIChjaGFyID09PSBcIidcIiB8fCBjaGFyID09PSAnXCInKSB7XG5cdFx0XHRcdGxldCBbdG9rZW4sIGFmdGVyUXVvdGVdID0gdGhpcy5tYXRjaFRleHQodGV4dCwgY3VycmVudCwgZW5kKSB8fCBbXTtcblx0XHRcdFx0Y3VycmVudCA9IGFmdGVyUXVvdGU7XG5cdFx0XHRcdGNvbnRpbnVlO1x0Ly8gY29udGludWUgc28gd2UgZG9uJ3QgYWRkIDEgdG8gY3VyZW50IGJlbG93XG5cdFx0XHR9XG5cdFx0XHQvLyBJZiBiYWNrc2xhc2gsIHNraXAgYW4gZXh0cmEgY2hhciBpZiBpdCdzIGVpdGhlciBkZWxpbWl0ZXIgb3IgYSBxdW90ZVxuXHRcdFx0ZWxzZSBpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHtcblx0XHRcdFx0Y2hhciA9IHRleHRbY3VycmVudCArIDFdO1xuXHRcdFx0XHRpZiAoY2hhciA9PT0gc3RhcnREZWxpbWl0ZXJcblx0XHRcdFx0IHx8IGNoYXIgPT09IGVuZERlbGltaXRlclxuXHRcdFx0XHQgfHwgY2hhciA9PT0gXCInXCJcblx0XHRcdFx0IHx8IGNoYXIgPT09ICdcIidcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0Y3VycmVudCsrOztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Y3VycmVudCsrO1xuXHRcdH1cblx0fSxcblxuXG4vL1RPRE86ICBgZmluZEF0SGVhZCh0aGluZylgIHdoZXJlIHRoaW5nIGlzXG4vL1x0XHRcdC0gKHNpbmdsZSBvciBtdWx0aS1jaGFyKSBzdHJpbmdcbi8vXHRcdFx0LSBhcnJheSBvZiBhbHRlcm5hdGl2ZSBzdHJpbmdzXG4vL1x0XHRcdC0gcmVndWxhciBleHByZXNzaW9uXG5cblx0Ly8gUmV0dXJuIHRoZSBpbmRleCBvZiB0aGUgZmlyc3QgTk9OLUVTQ0FQRUQgY2hhcmFjdGVyIGluIGBjaGFyc2AgYWZ0ZXIgYHRleHRbc3RhcnRdYC5cblx0Ly8gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiB3ZSBkaWRuJ3QgZmluZCBhIG1hdGNoLlxuLy9URVNUTUVcblx0ZmluZEZpcnN0QXRIZWFkKGNoYXJzLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0d2hpbGUgKHN0YXJ0IDwgZW5kKSB7XG5cdFx0XHRsZXQgY2hhciA9IHRleHRbc3RhcnRdO1xuXHRcdFx0aWYgKGNoYXJzLmluY2x1ZGVzKGNoYXIpKSByZXR1cm4gc3RhcnQ7XG5cdFx0XHQvLyBpZiB3ZSBnb3QgYW4gZXNjYXBlIGNoYXIsIGlnbm9yZSB0aGUgbmV4dCBjaGFyIGlmIGl0J3MgaW4gYGNoYXJzYFxuXHRcdFx0aWYgKGNoYXIgPT09IFwiXFxcXFwiICYmIGNoYXJzLmluY2x1ZGVzKHRleHRbc3RhcnQrMV0pKSBzdGFydCsrO1xuXHRcdFx0c3RhcnQrKztcblx0XHR9XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gc3RhcnQ7XG5cdH0sXG5cblxuLy9cbi8vICMjIyBVdGlsaXR5XG4vL1xuXG5cdGlzTm9ybWFsV2hpdGVzcGFjZSh0b2tlbikge1xuXHRcdHJldHVybiB0b2tlbiBpbnN0YW5jZW9mIFRva2VuaXplci5XaGl0ZXNwYWNlXG5cdFx0XHQmJiAhKHRva2VuIGluc3RhbmNlb2YgVG9rZW5pemVyLkluZGVudClcblx0XHRcdCYmICh0b2tlbiAhPT0gVG9rZW5pemVyLk5FV0xJTkUpO1xuXHR9LFxuXG5cdC8vIEJyZWFrIHRva2VucyBpbnRvIGFuIGFycmF5IG9mIGFycmF5cyBieSBgTkVXTElORXNgLlxuXHRicmVha0ludG9MaW5lcyh0b2tlbnMpIHtcblx0XHQvLyBDb252ZXJ0IHRvIGxpbmVzLlxuXHRcdGxldCBsaW5lcyA9IFtbXV07XG5cdFx0dG9rZW5zLmZvckVhY2godG9rZW4gPT4ge1xuXHRcdFx0Ly8gYWRkIG5ldyBhcnJheSBmb3IgZWFjaCBuZXdsaW5lXG5cdFx0XHRpZiAodG9rZW4gPT09IFRva2VuaXplci5ORVdMSU5FKSByZXR1cm4gbGluZXMucHVzaChbXSk7XG5cblx0XHRcdC8vIG90aGVyd2lzZSBqdXN0IGFkZCB0byB0aGUgbGFzdCBsaW5lXG5cdFx0XHRsaW5lc1tsaW5lcy5sZW5ndGggLSAxXS5wdXNoKHRva2VuKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gbGluZXM7XG5cdH0sXG5cblx0Ly8gR2l2ZW4gYSBzZXQgb2YgdG9rZW5zLCBzbGljZSB3aGl0ZXNwYWNlIChpbmRlbnQsIE5FV0xJTkUgb3Igbm9ybWFsIHdoaXRlc3BhY2UpIGZyb20gdGhlIGZyb250LlxuXHRlYXRXaGl0ZXNwYWNlVG9rZW5zKHRva2Vucykge1xuXHRcdGxldCBzdGFydCA9IDA7XG5cdFx0d2hpbGUgKHRva2Vuc1tzdGFydF0gaW5zdGFuY2VvZiBUb2tlbml6ZXIuV2hpdGVzcGFjZSkgc3RhcnQrKztcblx0XHRpZiAoc3RhcnQgPT09IDApIHJldHVybiB0b2tlbnM7XG5cdFx0cmV0dXJuIHRva2Vucy5zbGljZShzdGFydCk7XG5cdH0sXG5cblxufTtcblxuZXhwb3J0IGRlZmF1bHQgVG9rZW5pemVyO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1Rva2VuaXplci5qcyIsIi8qXG5cdE1JVCBMaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG5cdEF1dGhvciBUb2JpYXMgS29wcGVycyBAc29rcmFcbiovXG4vLyBjc3MgYmFzZSBjb2RlLCBpbmplY3RlZCBieSB0aGUgY3NzLWxvYWRlclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih1c2VTb3VyY2VNYXApIHtcblx0dmFyIGxpc3QgPSBbXTtcblxuXHQvLyByZXR1cm4gdGhlIGxpc3Qgb2YgbW9kdWxlcyBhcyBjc3Mgc3RyaW5nXG5cdGxpc3QudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcblx0XHRcdHZhciBjb250ZW50ID0gY3NzV2l0aE1hcHBpbmdUb1N0cmluZyhpdGVtLCB1c2VTb3VyY2VNYXApO1xuXHRcdFx0aWYoaXRlbVsyXSkge1xuXHRcdFx0XHRyZXR1cm4gXCJAbWVkaWEgXCIgKyBpdGVtWzJdICsgXCJ7XCIgKyBjb250ZW50ICsgXCJ9XCI7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gY29udGVudDtcblx0XHRcdH1cblx0XHR9KS5qb2luKFwiXCIpO1xuXHR9O1xuXG5cdC8vIGltcG9ydCBhIGxpc3Qgb2YgbW9kdWxlcyBpbnRvIHRoZSBsaXN0XG5cdGxpc3QuaSA9IGZ1bmN0aW9uKG1vZHVsZXMsIG1lZGlhUXVlcnkpIHtcblx0XHRpZih0eXBlb2YgbW9kdWxlcyA9PT0gXCJzdHJpbmdcIilcblx0XHRcdG1vZHVsZXMgPSBbW251bGwsIG1vZHVsZXMsIFwiXCJdXTtcblx0XHR2YXIgYWxyZWFkeUltcG9ydGVkTW9kdWxlcyA9IHt9O1xuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgaWQgPSB0aGlzW2ldWzBdO1xuXHRcdFx0aWYodHlwZW9mIGlkID09PSBcIm51bWJlclwiKVxuXHRcdFx0XHRhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2lkXSA9IHRydWU7XG5cdFx0fVxuXHRcdGZvcihpID0gMDsgaSA8IG1vZHVsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpdGVtID0gbW9kdWxlc1tpXTtcblx0XHRcdC8vIHNraXAgYWxyZWFkeSBpbXBvcnRlZCBtb2R1bGVcblx0XHRcdC8vIHRoaXMgaW1wbGVtZW50YXRpb24gaXMgbm90IDEwMCUgcGVyZmVjdCBmb3Igd2VpcmQgbWVkaWEgcXVlcnkgY29tYmluYXRpb25zXG5cdFx0XHQvLyAgd2hlbiBhIG1vZHVsZSBpcyBpbXBvcnRlZCBtdWx0aXBsZSB0aW1lcyB3aXRoIGRpZmZlcmVudCBtZWRpYSBxdWVyaWVzLlxuXHRcdFx0Ly8gIEkgaG9wZSB0aGlzIHdpbGwgbmV2ZXIgb2NjdXIgKEhleSB0aGlzIHdheSB3ZSBoYXZlIHNtYWxsZXIgYnVuZGxlcylcblx0XHRcdGlmKHR5cGVvZiBpdGVtWzBdICE9PSBcIm51bWJlclwiIHx8ICFhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2l0ZW1bMF1dKSB7XG5cdFx0XHRcdGlmKG1lZGlhUXVlcnkgJiYgIWl0ZW1bMl0pIHtcblx0XHRcdFx0XHRpdGVtWzJdID0gbWVkaWFRdWVyeTtcblx0XHRcdFx0fSBlbHNlIGlmKG1lZGlhUXVlcnkpIHtcblx0XHRcdFx0XHRpdGVtWzJdID0gXCIoXCIgKyBpdGVtWzJdICsgXCIpIGFuZCAoXCIgKyBtZWRpYVF1ZXJ5ICsgXCIpXCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0bGlzdC5wdXNoKGl0ZW0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblx0cmV0dXJuIGxpc3Q7XG59O1xuXG5mdW5jdGlvbiBjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKGl0ZW0sIHVzZVNvdXJjZU1hcCkge1xuXHR2YXIgY29udGVudCA9IGl0ZW1bMV0gfHwgJyc7XG5cdHZhciBjc3NNYXBwaW5nID0gaXRlbVszXTtcblx0aWYgKCFjc3NNYXBwaW5nKSB7XG5cdFx0cmV0dXJuIGNvbnRlbnQ7XG5cdH1cblxuXHRpZiAodXNlU291cmNlTWFwICYmIHR5cGVvZiBidG9hID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0dmFyIHNvdXJjZU1hcHBpbmcgPSB0b0NvbW1lbnQoY3NzTWFwcGluZyk7XG5cdFx0dmFyIHNvdXJjZVVSTHMgPSBjc3NNYXBwaW5nLnNvdXJjZXMubWFwKGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0XHRcdHJldHVybiAnLyojIHNvdXJjZVVSTD0nICsgY3NzTWFwcGluZy5zb3VyY2VSb290ICsgc291cmNlICsgJyAqLydcblx0XHR9KTtcblxuXHRcdHJldHVybiBbY29udGVudF0uY29uY2F0KHNvdXJjZVVSTHMpLmNvbmNhdChbc291cmNlTWFwcGluZ10pLmpvaW4oJ1xcbicpO1xuXHR9XG5cblx0cmV0dXJuIFtjb250ZW50XS5qb2luKCdcXG4nKTtcbn1cblxuLy8gQWRhcHRlZCBmcm9tIGNvbnZlcnQtc291cmNlLW1hcCAoTUlUKVxuZnVuY3Rpb24gdG9Db21tZW50KHNvdXJjZU1hcCkge1xuXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcblx0dmFyIGJhc2U2NCA9IGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHNvdXJjZU1hcCkpKSk7XG5cdHZhciBkYXRhID0gJ3NvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LCcgKyBiYXNlNjQ7XG5cblx0cmV0dXJuICcvKiMgJyArIGRhdGEgKyAnICovJztcbn1cblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9jc3MtbG9hZGVyL2xpYi9jc3MtYmFzZS5qc1xuLy8gbW9kdWxlIGlkID0gMjQ3XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gIHZhciBSRUFDVF9FTEVNRU5UX1RZUEUgPSAodHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIFN5bWJvbC5mb3IgJiZcbiAgICBTeW1ib2wuZm9yKCdyZWFjdC5lbGVtZW50JykpIHx8XG4gICAgMHhlYWM3O1xuXG4gIHZhciBpc1ZhbGlkRWxlbWVudCA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHJldHVybiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgb2JqZWN0ICE9PSBudWxsICYmXG4gICAgICBvYmplY3QuJCR0eXBlb2YgPT09IFJFQUNUX0VMRU1FTlRfVFlQRTtcbiAgfTtcblxuICAvLyBCeSBleHBsaWNpdGx5IHVzaW5nIGBwcm9wLXR5cGVzYCB5b3UgYXJlIG9wdGluZyBpbnRvIG5ldyBkZXZlbG9wbWVudCBiZWhhdmlvci5cbiAgLy8gaHR0cDovL2ZiLm1lL3Byb3AtdHlwZXMtaW4tcHJvZFxuICB2YXIgdGhyb3dPbkRpcmVjdEFjY2VzcyA9IHRydWU7XG4gIG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9mYWN0b3J5V2l0aFR5cGVDaGVja2VycycpKGlzVmFsaWRFbGVtZW50LCB0aHJvd09uRGlyZWN0QWNjZXNzKTtcbn0gZWxzZSB7XG4gIC8vIEJ5IGV4cGxpY2l0bHkgdXNpbmcgYHByb3AtdHlwZXNgIHlvdSBhcmUgb3B0aW5nIGludG8gbmV3IHByb2R1Y3Rpb24gYmVoYXZpb3IuXG4gIC8vIGh0dHA6Ly9mYi5tZS9wcm9wLXR5cGVzLWluLXByb2RcbiAgbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2ZhY3RvcnlXaXRoVGhyb3dpbmdTaGltcycpKCk7XG59XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gMjQ4XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0UHJvcFR5cGVzU2VjcmV0ID0gJ1NFQ1JFVF9ET19OT1RfUEFTU19USElTX09SX1lPVV9XSUxMX0JFX0ZJUkVEJztcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdFByb3BUeXBlc1NlY3JldDtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL2xpYi9SZWFjdFByb3BUeXBlc1NlY3JldC5qc1xuLy8gbW9kdWxlIGlkID0gMjQ5XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTQtMjAxNSwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlbXB0eUZ1bmN0aW9uID0gcmVxdWlyZSgnLi9lbXB0eUZ1bmN0aW9uJyk7XG5cbi8qKlxuICogU2ltaWxhciB0byBpbnZhcmlhbnQgYnV0IG9ubHkgbG9ncyBhIHdhcm5pbmcgaWYgdGhlIGNvbmRpdGlvbiBpcyBub3QgbWV0LlxuICogVGhpcyBjYW4gYmUgdXNlZCB0byBsb2cgaXNzdWVzIGluIGRldmVsb3BtZW50IGVudmlyb25tZW50cyBpbiBjcml0aWNhbFxuICogcGF0aHMuIFJlbW92aW5nIHRoZSBsb2dnaW5nIGNvZGUgZm9yIHByb2R1Y3Rpb24gZW52aXJvbm1lbnRzIHdpbGwga2VlcCB0aGVcbiAqIHNhbWUgbG9naWMgYW5kIGZvbGxvdyB0aGUgc2FtZSBjb2RlIHBhdGhzLlxuICovXG5cbnZhciB3YXJuaW5nID0gZW1wdHlGdW5jdGlvbjtcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcHJpbnRXYXJuaW5nID0gZnVuY3Rpb24gcHJpbnRXYXJuaW5nKGZvcm1hdCkge1xuICAgICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuID4gMSA/IF9sZW4gLSAxIDogMCksIF9rZXkgPSAxOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICAgIGFyZ3NbX2tleSAtIDFdID0gYXJndW1lbnRzW19rZXldO1xuICAgICAgfVxuXG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgdmFyIG1lc3NhZ2UgPSAnV2FybmluZzogJyArIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmdzW2FyZ0luZGV4KytdO1xuICAgICAgfSk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICAvLyAtLS0gV2VsY29tZSB0byBkZWJ1Z2dpbmcgUmVhY3QgLS0tXG4gICAgICAgIC8vIFRoaXMgZXJyb3Igd2FzIHRocm93biBhcyBhIGNvbnZlbmllbmNlIHNvIHRoYXQgeW91IGNhbiB1c2UgdGhpcyBzdGFja1xuICAgICAgICAvLyB0byBmaW5kIHRoZSBjYWxsc2l0ZSB0aGF0IGNhdXNlZCB0aGlzIHdhcm5pbmcgdG8gZmlyZS5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgfSBjYXRjaCAoeCkge31cbiAgICB9O1xuXG4gICAgd2FybmluZyA9IGZ1bmN0aW9uIHdhcm5pbmcoY29uZGl0aW9uLCBmb3JtYXQpIHtcbiAgICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2B3YXJuaW5nKGNvbmRpdGlvbiwgZm9ybWF0LCAuLi5hcmdzKWAgcmVxdWlyZXMgYSB3YXJuaW5nICcgKyAnbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZm9ybWF0LmluZGV4T2YoJ0ZhaWxlZCBDb21wb3NpdGUgcHJvcFR5cGU6ICcpID09PSAwKSB7XG4gICAgICAgIHJldHVybjsgLy8gSWdub3JlIENvbXBvc2l0ZUNvbXBvbmVudCBwcm9wdHlwZSBjaGVjay5cbiAgICAgIH1cblxuICAgICAgaWYgKCFjb25kaXRpb24pIHtcbiAgICAgICAgZm9yICh2YXIgX2xlbjIgPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbjIgPiAyID8gX2xlbjIgLSAyIDogMCksIF9rZXkyID0gMjsgX2tleTIgPCBfbGVuMjsgX2tleTIrKykge1xuICAgICAgICAgIGFyZ3NbX2tleTIgLSAyXSA9IGFyZ3VtZW50c1tfa2V5Ml07XG4gICAgICAgIH1cblxuICAgICAgICBwcmludFdhcm5pbmcuYXBwbHkodW5kZWZpbmVkLCBbZm9ybWF0XS5jb25jYXQoYXJncykpO1xuICAgICAgfVxuICAgIH07XG4gIH0pKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gd2FybmluZztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9+L2ZianMvbGliL3dhcm5pbmcuanNcbi8vIG1vZHVsZSBpZCA9IDI1MFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJmdW5jdGlvbiBfdG9Db25zdW1hYmxlQXJyYXkoYXJyKSB7IGlmIChBcnJheS5pc0FycmF5KGFycikpIHsgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBBcnJheShhcnIubGVuZ3RoKTsgaSA8IGFyci5sZW5ndGg7IGkrKykgeyBhcnIyW2ldID0gYXJyW2ldOyB9IHJldHVybiBhcnIyOyB9IGVsc2UgeyByZXR1cm4gQXJyYXkuZnJvbShhcnIpOyB9IH1cblxuLyogZXNsaW50LWRpc2FibGUgbm8tdXNlLWJlZm9yZS1kZWZpbmUgKi9cbi8qKlxuICogQG1vZHVsZSBldmVudEhhbmRsZXJzXG4gKlxuICovXG5pbXBvcnQgZG9tSGVscGVycyBmcm9tICcuL2xpYi9kb21faGVscGVycyc7XG5pbXBvcnQgbGlzdGVuZXJzIGZyb20gJy4vbGliL2xpc3RlbmVycyc7XG5pbXBvcnQgc3RvcmUgZnJvbSAnLi9zdG9yZSc7XG5cbi8qKlxuICogcHJpdmF0ZVxuICpcbiAqL1xuXG4vKipcbiAqIF9vbkNsaWNrXG4gKlxuICogQGFjY2VzcyBwcml2YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gZXZlbnQgVGhlIGNsaWNrIGV2ZW50IG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IGV2ZW50LnRhcmdldCBUaGUgRE9NIG5vZGUgZnJvbSB0aGUgY2xpY2sgZXZlbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIF9vbkNsaWNrKF9yZWYpIHtcbiAgdmFyIHRhcmdldCA9IF9yZWYudGFyZ2V0O1xuXG4gIHN0b3JlLmFjdGl2YXRlKFtdLmNvbmNhdChfdG9Db25zdW1hYmxlQXJyYXkoc3RvcmUuZ2V0SW5zdGFuY2VzKCkpKS5yZWR1Y2UoZG9tSGVscGVycy5maW5kQ29udGFpbmVyTm9kZXModGFyZ2V0KSwgW10pLnNvcnQoZG9tSGVscGVycy5zb3J0QnlET01Qb3NpdGlvbikubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgcmV0dXJuIGl0ZW0uaW5zdGFuY2U7XG4gIH0pKTtcbn1cblxuLyoqXG4gKiBfb25LZXlEb3duOiBUaGUga2V5ZG93biBldmVudCBjYWxsYmFja1xuICpcbiAqIEBhY2Nlc3MgcHJpdmF0ZVxuICogQHBhcmFtIHtvYmplY3R9IGV2ZW50IFRoZSBrZXlkb3duIGV2ZW50IG9iamVjdFxuICogQHBhcmFtIHtudW1iZXJ9IGV2ZW50LndoaWNoIFRoZSBrZXkgY29kZSAod2hpY2gpIHJlY2VpdmVkIGZyb20gdGhlIGtleWRvd24gZXZlbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIF9vbktleURvd24oZXZlbnQpIHtcbiAgdmFyIGZvcmNlQ29uc2lkZXIgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IGZhbHNlO1xuXG4gIGlmIChmb3JjZUNvbnNpZGVyIHx8IF9zaG91bGRDb25zaWRlcihldmVudCkpIHtcbiAgICB2YXIgX3JlZjIgPSBzdG9yZS5maW5kQmluZGluZ0ZvckV2ZW50KGV2ZW50KSB8fCB7fSxcbiAgICAgICAgZm4gPSBfcmVmMi5mbixcbiAgICAgICAgaW5zdGFuY2UgPSBfcmVmMi5pbnN0YW5jZTtcblxuICAgIGlmIChmbikge1xuICAgICAgZm4uY2FsbChpbnN0YW5jZSwgZXZlbnQpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBfc2hvdWxkQ29uc2lkZXI6IENvbmRpdGlvbnMgZm9yIHByb2NlZWRpbmcgd2l0aCBrZXkgZXZlbnQgaGFuZGxpbmdcbiAqXG4gKiBAYWNjZXNzIHByaXZhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBldmVudCBUaGUga2V5ZG93biBldmVudCBvYmplY3RcbiAqIEBwYXJhbSB7b2JqZWN0fSBldmVudC50YXJnZXQgVGhlIG5vZGUgb3JpZ2luIG9mIHRoZSBldmVudFxuICogQHJldHVybiB7Ym9vbGVhbn0gV2hldGhlciB0byBjb250aW51ZSBwcm9jZXNpbmcgdGhlIGtleWRvd24gZXZlbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIF9zaG91bGRDb25zaWRlcihfcmVmMykge1xuICB2YXIgY3RybEtleSA9IF9yZWYzLmN0cmxLZXksXG4gICAgICB0YXJnZXQgPSBfcmVmMy50YXJnZXQ7XG5cbiAgcmV0dXJuIGN0cmxLZXkgfHwgIX5bJ0lOUFVUJywgJ1NFTEVDVCcsICdURVhUQVJFQSddLmluZGV4T2YodGFyZ2V0LnRhZ05hbWUpIHx8IHRhcmdldC5nZXRBdHRyaWJ1dGUoJ3JvbGUnKSAhPT0gJ3RleHRib3gnO1xufVxuXG4vKipcbiAqIHB1YmxpY1xuICpcbiAqL1xuXG4vKipcbiAqIG9uTW91bnRcbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICovXG5mdW5jdGlvbiBvbk1vdW50KGluc3RhbmNlKSB7XG4gIC8vIGhhdmUgdG8gYnVtcCB0aGlzIHRvIG5leHQgZXZlbnQgbG9vcCBiZWNhdXNlIGNvbXBvbmVudCBtb3VudGluZyByb3V0aW5lbHlcbiAgLy8gcHJlY2VlZHMgdGhlIGRvbSBjbGljayBldmVudCB0aGF0IHRyaWdnZXJlZCB0aGUgbW91bnQgKHd0Zj8pXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBzdG9yZS5hY3RpdmF0ZShpbnN0YW5jZSk7XG4gIH0sIDApO1xuICBsaXN0ZW5lcnMuYmluZEtleXMoX29uS2V5RG93bik7XG4gIGxpc3RlbmVycy5iaW5kQ2xpY2tzKF9vbkNsaWNrKTtcbiAgZG9tSGVscGVycy5iaW5kRm9jdXNhYmxlcyhpbnN0YW5jZSwgc3RvcmUuYWN0aXZhdGUpO1xufVxuXG4vKipcbiAqIG9uVW5tb3VudFxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKi9cbmZ1bmN0aW9uIG9uVW5tb3VudChpbnN0YW5jZSkge1xuICBzdG9yZS5kZWxldGVJbnN0YW5jZShpbnN0YW5jZSk7XG4gIGlmIChzdG9yZS5pc0VtcHR5KCkpIHtcbiAgICBsaXN0ZW5lcnMudW5iaW5kQ2xpY2tzKF9vbkNsaWNrKTtcbiAgICBsaXN0ZW5lcnMudW5iaW5kS2V5cyhfb25LZXlEb3duKTtcbiAgfVxufVxuXG5leHBvcnQgeyBvbk1vdW50LCBvblVubW91bnQgfTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9ldmVudF9oYW5kbGVycy5qc1xuLy8gbW9kdWxlIGlkID0gMjc3XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsImltcG9ydCB7IG1vZGlmaWVycyBhcyBtb2RpZmllcktleXMgfSBmcm9tICcuL2tleXMnO1xuXG52YXIgbW9kS2V5cyA9IE9iamVjdC5rZXlzKG1vZGlmaWVyS2V5cyk7XG5cbmZ1bmN0aW9uIG1hdGNoS2V5cyhfcmVmKSB7XG4gIHZhciBfcmVmJGtleVNldCA9IF9yZWYua2V5U2V0LFxuICAgICAga2V5ID0gX3JlZiRrZXlTZXQua2V5LFxuICAgICAgX3JlZiRrZXlTZXQkbW9kaWZpZXJzID0gX3JlZiRrZXlTZXQubW9kaWZpZXJzLFxuICAgICAgbW9kaWZpZXJzID0gX3JlZiRrZXlTZXQkbW9kaWZpZXJzID09PSB1bmRlZmluZWQgPyBbXSA6IF9yZWYka2V5U2V0JG1vZGlmaWVycyxcbiAgICAgIGV2ZW50ID0gX3JlZi5ldmVudDtcblxuICB2YXIga2V5c01hdGNoID0gZmFsc2U7XG4gIGlmIChrZXkgPT09IGV2ZW50LndoaWNoKSB7XG4gICAgdmFyIGV2dE1vZEtleXMgPSBtb2RLZXlzLmZpbHRlcihmdW5jdGlvbiAobW9kS2V5KSB7XG4gICAgICByZXR1cm4gZXZlbnRbbW9kS2V5ICsgJ0tleSddO1xuICAgIH0pLnNvcnQoKTtcbiAgICBrZXlzTWF0Y2ggPSBtb2RpZmllcnMubGVuZ3RoID09PSBldnRNb2RLZXlzLmxlbmd0aCAmJiBtb2RpZmllcnMuZXZlcnkoZnVuY3Rpb24gKG1vZEtleSwgaW5kZXgpIHtcbiAgICAgIHJldHVybiBldnRNb2RLZXlzW2luZGV4XSA9PT0gbW9kS2V5O1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBrZXlzTWF0Y2g7XG59XG5cbmV4cG9ydCBkZWZhdWx0IG1hdGNoS2V5cztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvbWF0Y2hfa2V5cy5qc1xuLy8gbW9kdWxlIGlkID0gMjc4XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsImltcG9ydCBLZXlzLCB7IG1vZGlmaWVycyB9IGZyb20gJy4va2V5cyc7XG5cbmZ1bmN0aW9uIHBhcnNlS2V5cyhrZXlzQXJyYXkpIHtcbiAgcmV0dXJuIGtleXNBcnJheS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgIHZhciBrZXlTZXQgPSB7IGtleToga2V5IH07XG4gICAgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICB2YXIga2V5U3RyaW5nID0ga2V5LnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuICAgICAgdmFyIG1hdGNoZXMgPSBrZXlTdHJpbmcuc3BsaXQoL1xccz9cXCtcXHM/Lyk7XG4gICAgICBrZXlTZXQgPSBtYXRjaGVzLmxlbmd0aCA9PT0gMSA/IHsga2V5OiBLZXlzW2tleVN0cmluZ10gfSA6IHtcbiAgICAgICAga2V5OiBLZXlzW21hdGNoZXMucG9wKCldLFxuICAgICAgICBtb2RpZmllcnM6IG1hdGNoZXMubWFwKGZ1bmN0aW9uIChtb2RLZXkpIHtcbiAgICAgICAgICByZXR1cm4gbW9kaWZpZXJzW21vZEtleV07XG4gICAgICAgIH0pLnNvcnQoKVxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGtleVNldDtcbiAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlS2V5cztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvcGFyc2Vfa2V5cy5qc1xuLy8gbW9kdWxlIGlkID0gMjc5XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qXG5cdE1JVCBMaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG5cdEF1dGhvciBUb2JpYXMgS29wcGVycyBAc29rcmFcbiovXG52YXIgc3R5bGVzSW5Eb20gPSB7fSxcblx0bWVtb2l6ZSA9IGZ1bmN0aW9uKGZuKSB7XG5cdFx0dmFyIG1lbW87XG5cdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh0eXBlb2YgbWVtbyA9PT0gXCJ1bmRlZmluZWRcIikgbWVtbyA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHRyZXR1cm4gbWVtbztcblx0XHR9O1xuXHR9LFxuXHRpc09sZElFID0gbWVtb2l6ZShmdW5jdGlvbigpIHtcblx0XHQvLyBUZXN0IGZvciBJRSA8PSA5IGFzIHByb3Bvc2VkIGJ5IEJyb3dzZXJoYWNrc1xuXHRcdC8vIEBzZWUgaHR0cDovL2Jyb3dzZXJoYWNrcy5jb20vI2hhY2stZTcxZDg2OTJmNjUzMzQxNzNmZWU3MTVjMjIyY2I4MDVcblx0XHQvLyBUZXN0cyBmb3IgZXhpc3RlbmNlIG9mIHN0YW5kYXJkIGdsb2JhbHMgaXMgdG8gYWxsb3cgc3R5bGUtbG9hZGVyIFxuXHRcdC8vIHRvIG9wZXJhdGUgY29ycmVjdGx5IGludG8gbm9uLXN0YW5kYXJkIGVudmlyb25tZW50c1xuXHRcdC8vIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2stY29udHJpYi9zdHlsZS1sb2FkZXIvaXNzdWVzLzE3N1xuXHRcdHJldHVybiB3aW5kb3cgJiYgZG9jdW1lbnQgJiYgZG9jdW1lbnQuYWxsICYmICF3aW5kb3cuYXRvYjtcblx0fSksXG5cdGdldEVsZW1lbnQgPSAoZnVuY3Rpb24oZm4pIHtcblx0XHR2YXIgbWVtbyA9IHt9O1xuXHRcdHJldHVybiBmdW5jdGlvbihzZWxlY3Rvcikge1xuXHRcdFx0aWYgKHR5cGVvZiBtZW1vW3NlbGVjdG9yXSA9PT0gXCJ1bmRlZmluZWRcIikge1xuXHRcdFx0XHRtZW1vW3NlbGVjdG9yXSA9IGZuLmNhbGwodGhpcywgc2VsZWN0b3IpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1lbW9bc2VsZWN0b3JdXG5cdFx0fTtcblx0fSkoZnVuY3Rpb24gKHN0eWxlVGFyZ2V0KSB7XG5cdFx0cmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc3R5bGVUYXJnZXQpXG5cdH0pLFxuXHRzaW5nbGV0b25FbGVtZW50ID0gbnVsbCxcblx0c2luZ2xldG9uQ291bnRlciA9IDAsXG5cdHN0eWxlRWxlbWVudHNJbnNlcnRlZEF0VG9wID0gW10sXG5cdGZpeFVybHMgPSByZXF1aXJlKFwiLi9maXhVcmxzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGxpc3QsIG9wdGlvbnMpIHtcblx0aWYodHlwZW9mIERFQlVHICE9PSBcInVuZGVmaW5lZFwiICYmIERFQlVHKSB7XG5cdFx0aWYodHlwZW9mIGRvY3VtZW50ICE9PSBcIm9iamVjdFwiKSB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgc3R5bGUtbG9hZGVyIGNhbm5vdCBiZSB1c2VkIGluIGEgbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRcIik7XG5cdH1cblxuXHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0b3B0aW9ucy5hdHRycyA9IHR5cGVvZiBvcHRpb25zLmF0dHJzID09PSBcIm9iamVjdFwiID8gb3B0aW9ucy5hdHRycyA6IHt9O1xuXG5cdC8vIEZvcmNlIHNpbmdsZS10YWcgc29sdXRpb24gb24gSUU2LTksIHdoaWNoIGhhcyBhIGhhcmQgbGltaXQgb24gdGhlICMgb2YgPHN0eWxlPlxuXHQvLyB0YWdzIGl0IHdpbGwgYWxsb3cgb24gYSBwYWdlXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5zaW5nbGV0b24gPT09IFwidW5kZWZpbmVkXCIpIG9wdGlvbnMuc2luZ2xldG9uID0gaXNPbGRJRSgpO1xuXG5cdC8vIEJ5IGRlZmF1bHQsIGFkZCA8c3R5bGU+IHRhZ3MgdG8gdGhlIDxoZWFkPiBlbGVtZW50XG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5pbnNlcnRJbnRvID09PSBcInVuZGVmaW5lZFwiKSBvcHRpb25zLmluc2VydEludG8gPSBcImhlYWRcIjtcblxuXHQvLyBCeSBkZWZhdWx0LCBhZGQgPHN0eWxlPiB0YWdzIHRvIHRoZSBib3R0b20gb2YgdGhlIHRhcmdldFxuXHRpZiAodHlwZW9mIG9wdGlvbnMuaW5zZXJ0QXQgPT09IFwidW5kZWZpbmVkXCIpIG9wdGlvbnMuaW5zZXJ0QXQgPSBcImJvdHRvbVwiO1xuXG5cdHZhciBzdHlsZXMgPSBsaXN0VG9TdHlsZXMobGlzdCwgb3B0aW9ucyk7XG5cdGFkZFN0eWxlc1RvRG9tKHN0eWxlcywgb3B0aW9ucyk7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIHVwZGF0ZShuZXdMaXN0KSB7XG5cdFx0dmFyIG1heVJlbW92ZSA9IFtdO1xuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCBzdHlsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpdGVtID0gc3R5bGVzW2ldO1xuXHRcdFx0dmFyIGRvbVN0eWxlID0gc3R5bGVzSW5Eb21baXRlbS5pZF07XG5cdFx0XHRkb21TdHlsZS5yZWZzLS07XG5cdFx0XHRtYXlSZW1vdmUucHVzaChkb21TdHlsZSk7XG5cdFx0fVxuXHRcdGlmKG5ld0xpc3QpIHtcblx0XHRcdHZhciBuZXdTdHlsZXMgPSBsaXN0VG9TdHlsZXMobmV3TGlzdCwgb3B0aW9ucyk7XG5cdFx0XHRhZGRTdHlsZXNUb0RvbShuZXdTdHlsZXMsIG9wdGlvbnMpO1xuXHRcdH1cblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgbWF5UmVtb3ZlLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgZG9tU3R5bGUgPSBtYXlSZW1vdmVbaV07XG5cdFx0XHRpZihkb21TdHlsZS5yZWZzID09PSAwKSB7XG5cdFx0XHRcdGZvcih2YXIgaiA9IDA7IGogPCBkb21TdHlsZS5wYXJ0cy5sZW5ndGg7IGorKylcblx0XHRcdFx0XHRkb21TdHlsZS5wYXJ0c1tqXSgpO1xuXHRcdFx0XHRkZWxldGUgc3R5bGVzSW5Eb21bZG9tU3R5bGUuaWRdO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcbn07XG5cbmZ1bmN0aW9uIGFkZFN0eWxlc1RvRG9tKHN0eWxlcywgb3B0aW9ucykge1xuXHRmb3IodmFyIGkgPSAwOyBpIDwgc3R5bGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGl0ZW0gPSBzdHlsZXNbaV07XG5cdFx0dmFyIGRvbVN0eWxlID0gc3R5bGVzSW5Eb21baXRlbS5pZF07XG5cdFx0aWYoZG9tU3R5bGUpIHtcblx0XHRcdGRvbVN0eWxlLnJlZnMrKztcblx0XHRcdGZvcih2YXIgaiA9IDA7IGogPCBkb21TdHlsZS5wYXJ0cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRkb21TdHlsZS5wYXJ0c1tqXShpdGVtLnBhcnRzW2pdKTtcblx0XHRcdH1cblx0XHRcdGZvcig7IGogPCBpdGVtLnBhcnRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdGRvbVN0eWxlLnBhcnRzLnB1c2goYWRkU3R5bGUoaXRlbS5wYXJ0c1tqXSwgb3B0aW9ucykpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YXIgcGFydHMgPSBbXTtcblx0XHRcdGZvcih2YXIgaiA9IDA7IGogPCBpdGVtLnBhcnRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdHBhcnRzLnB1c2goYWRkU3R5bGUoaXRlbS5wYXJ0c1tqXSwgb3B0aW9ucykpO1xuXHRcdFx0fVxuXHRcdFx0c3R5bGVzSW5Eb21baXRlbS5pZF0gPSB7aWQ6IGl0ZW0uaWQsIHJlZnM6IDEsIHBhcnRzOiBwYXJ0c307XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGxpc3RUb1N0eWxlcyhsaXN0LCBvcHRpb25zKSB7XG5cdHZhciBzdHlsZXMgPSBbXTtcblx0dmFyIG5ld1N0eWxlcyA9IHt9O1xuXHRmb3IodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBpdGVtID0gbGlzdFtpXTtcblx0XHR2YXIgaWQgPSBvcHRpb25zLmJhc2UgPyBpdGVtWzBdICsgb3B0aW9ucy5iYXNlIDogaXRlbVswXTtcblx0XHR2YXIgY3NzID0gaXRlbVsxXTtcblx0XHR2YXIgbWVkaWEgPSBpdGVtWzJdO1xuXHRcdHZhciBzb3VyY2VNYXAgPSBpdGVtWzNdO1xuXHRcdHZhciBwYXJ0ID0ge2NzczogY3NzLCBtZWRpYTogbWVkaWEsIHNvdXJjZU1hcDogc291cmNlTWFwfTtcblx0XHRpZighbmV3U3R5bGVzW2lkXSlcblx0XHRcdHN0eWxlcy5wdXNoKG5ld1N0eWxlc1tpZF0gPSB7aWQ6IGlkLCBwYXJ0czogW3BhcnRdfSk7XG5cdFx0ZWxzZVxuXHRcdFx0bmV3U3R5bGVzW2lkXS5wYXJ0cy5wdXNoKHBhcnQpO1xuXHR9XG5cdHJldHVybiBzdHlsZXM7XG59XG5cbmZ1bmN0aW9uIGluc2VydFN0eWxlRWxlbWVudChvcHRpb25zLCBzdHlsZUVsZW1lbnQpIHtcblx0dmFyIHN0eWxlVGFyZ2V0ID0gZ2V0RWxlbWVudChvcHRpb25zLmluc2VydEludG8pXG5cdGlmICghc3R5bGVUYXJnZXQpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZG4ndCBmaW5kIGEgc3R5bGUgdGFyZ2V0LiBUaGlzIHByb2JhYmx5IG1lYW5zIHRoYXQgdGhlIHZhbHVlIGZvciB0aGUgJ2luc2VydEludG8nIHBhcmFtZXRlciBpcyBpbnZhbGlkLlwiKTtcblx0fVxuXHR2YXIgbGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3AgPSBzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcFtzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcC5sZW5ndGggLSAxXTtcblx0aWYgKG9wdGlvbnMuaW5zZXJ0QXQgPT09IFwidG9wXCIpIHtcblx0XHRpZighbGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3ApIHtcblx0XHRcdHN0eWxlVGFyZ2V0Lmluc2VydEJlZm9yZShzdHlsZUVsZW1lbnQsIHN0eWxlVGFyZ2V0LmZpcnN0Q2hpbGQpO1xuXHRcdH0gZWxzZSBpZihsYXN0U3R5bGVFbGVtZW50SW5zZXJ0ZWRBdFRvcC5uZXh0U2libGluZykge1xuXHRcdFx0c3R5bGVUYXJnZXQuaW5zZXJ0QmVmb3JlKHN0eWxlRWxlbWVudCwgbGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3AubmV4dFNpYmxpbmcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzdHlsZVRhcmdldC5hcHBlbmRDaGlsZChzdHlsZUVsZW1lbnQpO1xuXHRcdH1cblx0XHRzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcC5wdXNoKHN0eWxlRWxlbWVudCk7XG5cdH0gZWxzZSBpZiAob3B0aW9ucy5pbnNlcnRBdCA9PT0gXCJib3R0b21cIikge1xuXHRcdHN0eWxlVGFyZ2V0LmFwcGVuZENoaWxkKHN0eWxlRWxlbWVudCk7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB2YWx1ZSBmb3IgcGFyYW1ldGVyICdpbnNlcnRBdCcuIE11c3QgYmUgJ3RvcCcgb3IgJ2JvdHRvbScuXCIpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpIHtcblx0c3R5bGVFbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3R5bGVFbGVtZW50KTtcblx0dmFyIGlkeCA9IHN0eWxlRWxlbWVudHNJbnNlcnRlZEF0VG9wLmluZGV4T2Yoc3R5bGVFbGVtZW50KTtcblx0aWYoaWR4ID49IDApIHtcblx0XHRzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcC5zcGxpY2UoaWR4LCAxKTtcblx0fVxufVxuXG5mdW5jdGlvbiBjcmVhdGVTdHlsZUVsZW1lbnQob3B0aW9ucykge1xuXHR2YXIgc3R5bGVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xuXHRvcHRpb25zLmF0dHJzLnR5cGUgPSBcInRleHQvY3NzXCI7XG5cblx0YXR0YWNoVGFnQXR0cnMoc3R5bGVFbGVtZW50LCBvcHRpb25zLmF0dHJzKTtcblx0aW5zZXJ0U3R5bGVFbGVtZW50KG9wdGlvbnMsIHN0eWxlRWxlbWVudCk7XG5cdHJldHVybiBzdHlsZUVsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUxpbmtFbGVtZW50KG9wdGlvbnMpIHtcblx0dmFyIGxpbmtFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpbmtcIik7XG5cdG9wdGlvbnMuYXR0cnMudHlwZSA9IFwidGV4dC9jc3NcIjtcblx0b3B0aW9ucy5hdHRycy5yZWwgPSBcInN0eWxlc2hlZXRcIjtcblxuXHRhdHRhY2hUYWdBdHRycyhsaW5rRWxlbWVudCwgb3B0aW9ucy5hdHRycyk7XG5cdGluc2VydFN0eWxlRWxlbWVudChvcHRpb25zLCBsaW5rRWxlbWVudCk7XG5cdHJldHVybiBsaW5rRWxlbWVudDtcbn1cblxuZnVuY3Rpb24gYXR0YWNoVGFnQXR0cnMoZWxlbWVudCwgYXR0cnMpIHtcblx0T2JqZWN0LmtleXMoYXR0cnMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuXHRcdGVsZW1lbnQuc2V0QXR0cmlidXRlKGtleSwgYXR0cnNba2V5XSk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBhZGRTdHlsZShvYmosIG9wdGlvbnMpIHtcblx0dmFyIHN0eWxlRWxlbWVudCwgdXBkYXRlLCByZW1vdmUsIHRyYW5zZm9ybVJlc3VsdDtcblxuXHQvLyBJZiBhIHRyYW5zZm9ybSBmdW5jdGlvbiB3YXMgZGVmaW5lZCwgcnVuIGl0IG9uIHRoZSBjc3Ncblx0aWYgKG9wdGlvbnMudHJhbnNmb3JtICYmIG9iai5jc3MpIHtcblx0ICAgIHRyYW5zZm9ybVJlc3VsdCA9IG9wdGlvbnMudHJhbnNmb3JtKG9iai5jc3MpO1xuXHQgICAgXG5cdCAgICBpZiAodHJhbnNmb3JtUmVzdWx0KSB7XG5cdCAgICBcdC8vIElmIHRyYW5zZm9ybSByZXR1cm5zIGEgdmFsdWUsIHVzZSB0aGF0IGluc3RlYWQgb2YgdGhlIG9yaWdpbmFsIGNzcy5cblx0ICAgIFx0Ly8gVGhpcyBhbGxvd3MgcnVubmluZyBydW50aW1lIHRyYW5zZm9ybWF0aW9ucyBvbiB0aGUgY3NzLlxuXHQgICAgXHRvYmouY3NzID0gdHJhbnNmb3JtUmVzdWx0O1xuXHQgICAgfSBlbHNlIHtcblx0ICAgIFx0Ly8gSWYgdGhlIHRyYW5zZm9ybSBmdW5jdGlvbiByZXR1cm5zIGEgZmFsc3kgdmFsdWUsIGRvbid0IGFkZCB0aGlzIGNzcy4gXG5cdCAgICBcdC8vIFRoaXMgYWxsb3dzIGNvbmRpdGlvbmFsIGxvYWRpbmcgb2YgY3NzXG5cdCAgICBcdHJldHVybiBmdW5jdGlvbigpIHtcblx0ICAgIFx0XHQvLyBub29wXG5cdCAgICBcdH07XG5cdCAgICB9XG5cdH1cblxuXHRpZiAob3B0aW9ucy5zaW5nbGV0b24pIHtcblx0XHR2YXIgc3R5bGVJbmRleCA9IHNpbmdsZXRvbkNvdW50ZXIrKztcblx0XHRzdHlsZUVsZW1lbnQgPSBzaW5nbGV0b25FbGVtZW50IHx8IChzaW5nbGV0b25FbGVtZW50ID0gY3JlYXRlU3R5bGVFbGVtZW50KG9wdGlvbnMpKTtcblx0XHR1cGRhdGUgPSBhcHBseVRvU2luZ2xldG9uVGFnLmJpbmQobnVsbCwgc3R5bGVFbGVtZW50LCBzdHlsZUluZGV4LCBmYWxzZSk7XG5cdFx0cmVtb3ZlID0gYXBwbHlUb1NpbmdsZXRvblRhZy5iaW5kKG51bGwsIHN0eWxlRWxlbWVudCwgc3R5bGVJbmRleCwgdHJ1ZSk7XG5cdH0gZWxzZSBpZihvYmouc291cmNlTWFwICYmXG5cdFx0dHlwZW9mIFVSTCA9PT0gXCJmdW5jdGlvblwiICYmXG5cdFx0dHlwZW9mIFVSTC5jcmVhdGVPYmplY3RVUkwgPT09IFwiZnVuY3Rpb25cIiAmJlxuXHRcdHR5cGVvZiBVUkwucmV2b2tlT2JqZWN0VVJMID09PSBcImZ1bmN0aW9uXCIgJiZcblx0XHR0eXBlb2YgQmxvYiA9PT0gXCJmdW5jdGlvblwiICYmXG5cdFx0dHlwZW9mIGJ0b2EgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdHN0eWxlRWxlbWVudCA9IGNyZWF0ZUxpbmtFbGVtZW50KG9wdGlvbnMpO1xuXHRcdHVwZGF0ZSA9IHVwZGF0ZUxpbmsuYmluZChudWxsLCBzdHlsZUVsZW1lbnQsIG9wdGlvbnMpO1xuXHRcdHJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCk7XG5cdFx0XHRpZihzdHlsZUVsZW1lbnQuaHJlZilcblx0XHRcdFx0VVJMLnJldm9rZU9iamVjdFVSTChzdHlsZUVsZW1lbnQuaHJlZik7XG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHRzdHlsZUVsZW1lbnQgPSBjcmVhdGVTdHlsZUVsZW1lbnQob3B0aW9ucyk7XG5cdFx0dXBkYXRlID0gYXBwbHlUb1RhZy5iaW5kKG51bGwsIHN0eWxlRWxlbWVudCk7XG5cdFx0cmVtb3ZlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGVFbGVtZW50KTtcblx0XHR9O1xuXHR9XG5cblx0dXBkYXRlKG9iaik7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIHVwZGF0ZVN0eWxlKG5ld09iaikge1xuXHRcdGlmKG5ld09iaikge1xuXHRcdFx0aWYobmV3T2JqLmNzcyA9PT0gb2JqLmNzcyAmJiBuZXdPYmoubWVkaWEgPT09IG9iai5tZWRpYSAmJiBuZXdPYmouc291cmNlTWFwID09PSBvYmouc291cmNlTWFwKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR1cGRhdGUob2JqID0gbmV3T2JqKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVtb3ZlKCk7XG5cdFx0fVxuXHR9O1xufVxuXG52YXIgcmVwbGFjZVRleHQgPSAoZnVuY3Rpb24gKCkge1xuXHR2YXIgdGV4dFN0b3JlID0gW107XG5cblx0cmV0dXJuIGZ1bmN0aW9uIChpbmRleCwgcmVwbGFjZW1lbnQpIHtcblx0XHR0ZXh0U3RvcmVbaW5kZXhdID0gcmVwbGFjZW1lbnQ7XG5cdFx0cmV0dXJuIHRleHRTdG9yZS5maWx0ZXIoQm9vbGVhbikuam9pbignXFxuJyk7XG5cdH07XG59KSgpO1xuXG5mdW5jdGlvbiBhcHBseVRvU2luZ2xldG9uVGFnKHN0eWxlRWxlbWVudCwgaW5kZXgsIHJlbW92ZSwgb2JqKSB7XG5cdHZhciBjc3MgPSByZW1vdmUgPyBcIlwiIDogb2JqLmNzcztcblxuXHRpZiAoc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQpIHtcblx0XHRzdHlsZUVsZW1lbnQuc3R5bGVTaGVldC5jc3NUZXh0ID0gcmVwbGFjZVRleHQoaW5kZXgsIGNzcyk7XG5cdH0gZWxzZSB7XG5cdFx0dmFyIGNzc05vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpO1xuXHRcdHZhciBjaGlsZE5vZGVzID0gc3R5bGVFbGVtZW50LmNoaWxkTm9kZXM7XG5cdFx0aWYgKGNoaWxkTm9kZXNbaW5kZXhdKSBzdHlsZUVsZW1lbnQucmVtb3ZlQ2hpbGQoY2hpbGROb2Rlc1tpbmRleF0pO1xuXHRcdGlmIChjaGlsZE5vZGVzLmxlbmd0aCkge1xuXHRcdFx0c3R5bGVFbGVtZW50Lmluc2VydEJlZm9yZShjc3NOb2RlLCBjaGlsZE5vZGVzW2luZGV4XSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHN0eWxlRWxlbWVudC5hcHBlbmRDaGlsZChjc3NOb2RlKTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gYXBwbHlUb1RhZyhzdHlsZUVsZW1lbnQsIG9iaikge1xuXHR2YXIgY3NzID0gb2JqLmNzcztcblx0dmFyIG1lZGlhID0gb2JqLm1lZGlhO1xuXG5cdGlmKG1lZGlhKSB7XG5cdFx0c3R5bGVFbGVtZW50LnNldEF0dHJpYnV0ZShcIm1lZGlhXCIsIG1lZGlhKVxuXHR9XG5cblx0aWYoc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQpIHtcblx0XHRzdHlsZUVsZW1lbnQuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuXHR9IGVsc2Uge1xuXHRcdHdoaWxlKHN0eWxlRWxlbWVudC5maXJzdENoaWxkKSB7XG5cdFx0XHRzdHlsZUVsZW1lbnQucmVtb3ZlQ2hpbGQoc3R5bGVFbGVtZW50LmZpcnN0Q2hpbGQpO1xuXHRcdH1cblx0XHRzdHlsZUVsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlTGluayhsaW5rRWxlbWVudCwgb3B0aW9ucywgb2JqKSB7XG5cdHZhciBjc3MgPSBvYmouY3NzO1xuXHR2YXIgc291cmNlTWFwID0gb2JqLnNvdXJjZU1hcDtcblxuXHQvKiBJZiBjb252ZXJ0VG9BYnNvbHV0ZVVybHMgaXNuJ3QgZGVmaW5lZCwgYnV0IHNvdXJjZW1hcHMgYXJlIGVuYWJsZWRcblx0YW5kIHRoZXJlIGlzIG5vIHB1YmxpY1BhdGggZGVmaW5lZCB0aGVuIGxldHMgdHVybiBjb252ZXJ0VG9BYnNvbHV0ZVVybHNcblx0b24gYnkgZGVmYXVsdC4gIE90aGVyd2lzZSBkZWZhdWx0IHRvIHRoZSBjb252ZXJ0VG9BYnNvbHV0ZVVybHMgb3B0aW9uXG5cdGRpcmVjdGx5XG5cdCovXG5cdHZhciBhdXRvRml4VXJscyA9IG9wdGlvbnMuY29udmVydFRvQWJzb2x1dGVVcmxzID09PSB1bmRlZmluZWQgJiYgc291cmNlTWFwO1xuXG5cdGlmIChvcHRpb25zLmNvbnZlcnRUb0Fic29sdXRlVXJscyB8fCBhdXRvRml4VXJscyl7XG5cdFx0Y3NzID0gZml4VXJscyhjc3MpO1xuXHR9XG5cblx0aWYoc291cmNlTWFwKSB7XG5cdFx0Ly8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjY2MDM4NzVcblx0XHRjc3MgKz0gXCJcXG4vKiMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LFwiICsgYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoc291cmNlTWFwKSkpKSArIFwiICovXCI7XG5cdH1cblxuXHR2YXIgYmxvYiA9IG5ldyBCbG9iKFtjc3NdLCB7IHR5cGU6IFwidGV4dC9jc3NcIiB9KTtcblxuXHR2YXIgb2xkU3JjID0gbGlua0VsZW1lbnQuaHJlZjtcblxuXHRsaW5rRWxlbWVudC5ocmVmID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblxuXHRpZihvbGRTcmMpXG5cdFx0VVJMLnJldm9rZU9iamVjdFVSTChvbGRTcmMpO1xufVxuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3N0eWxlLWxvYWRlci9hZGRTdHlsZXMuanNcbi8vIG1vZHVsZSBpZCA9IDQ1M1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJpbXBvcnQgeyBvYnNlcnZlciB9IGZyb20gXCJtb2J4LXJlYWN0XCI7XG5pbXBvcnQgUmVhY3QgZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQga2V5ZG93biBmcm9tIFwicmVhY3Qta2V5ZG93blwiO1xuaW1wb3J0IHsgQnV0dG9uLCBEcm9wZG93biwgR3JpZCwgTWVudSwgU2VnbWVudCwgVGV4dEFyZWEgfSBmcm9tICdzZW1hbnRpYy11aS1yZWFjdCdcblxuaW1wb3J0IEV4YW1wbGVTdG9yZSBmcm9tIFwiLi9FeGFtcGxlU3RvcmVcIjtcbmltcG9ydCBTcGFjZXIgZnJvbSBcIi4vU3BhY2VyLmpzeFwiO1xuaW1wb3J0IFwiLi9zdHlsZXMubGVzc1wiO1xuaW1wb3J0IFRhYmJhYmxlVGV4dEFyZWEgZnJvbSBcIi4vVGFiYmFibGVUZXh0QXJlYS5qc3hcIjtcblxuQG9ic2VydmVyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTcGVsbEVkaXRvciBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdHN0YXRpYyBkZWZhdWx0UHJvcHMgPSB7XG5cdFx0ZXhhbXBsZXM6IG5ldyBFeGFtcGxlU3RvcmUoKVxuXHR9O1xuXG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpO1xud2luZG93LmV4YW1wbGVzID0gcHJvcHMuZXhhbXBsZXM7XG5cdFx0dGhpcy5wcm9wcy5leGFtcGxlcy5sb2FkKCk7XG5cblx0XHQvL0RFQlVHXG5cdFx0d2luZG93LnNwZWxsRWRpdG9yID0gdGhpcztcblx0XHR3aW5kb3cuZXhhbXBsZXMgPSB0aGlzLnByb3BzLmV4YW1wbGVzO1xuXHR9XG5cblx0QGtleWRvd24oXCJjdHJsK3NcIilcblx0c2F2ZSgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5zYXZlKCk7IH1cblxuXHRAa2V5ZG93bihcImN0cmwrclwiKVxuXHRyZXZlcnQoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMucmV2ZXJ0KCk7IH1cblxuXHRAa2V5ZG93bihcImN0cmwrY1wiKVxuXHRjb21waWxlKCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLmNvbXBpbGUoKTsgfVxuXG5cdEBrZXlkb3duKFwiY3RybCtuXCIpXG5cdGNyZWF0ZSgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5jcmVhdGUoKTsgfVxuXG5cdEBrZXlkb3duKFwiY3RybCtkXCIpXG5cdGRlbGV0ZSgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5kZWxldGUodW5kZWZpbmVkLCBcIkNPTkZJUk1cIik7IH1cblxuXHRyZW5hbWUoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMucmVuYW1lKCk7IH1cblx0ZHVwbGljYXRlKCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLmR1cGxpY2F0ZSgpOyB9XG5cdGxvYWQoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMubG9hZCgpOyB9XG5cdHJlc2V0KCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLnJlc2V0KCk7IH1cblxuXG5cdHJlbmRlcigpIHtcblx0XHRsZXQgeyBleGFtcGxlcyB9ID0gdGhpcy5wcm9wcztcblx0XHRsZXQgeyB0aXRsZXMsIHNlbGVjdGVkLCBkaXJ0eSwgY29kZSwgb3V0cHV0IH0gPSBleGFtcGxlcztcblxuXHRcdC8vIENyZWF0ZSBtZW51aXRlbXMgZnJvbSB0aGUgZXhhbXBsZXNcblx0XHRsZXQgb3B0aW9ucyA9IHRpdGxlcy5tYXAoIHRpdGxlID0+XG5cdFx0XHQoe1xuXHRcdFx0XHR2YWx1ZTogdGl0bGUsXG5cdFx0XHRcdHRpdGxlOiB0aXRsZSxcblx0XHRcdFx0dGV4dDogdGl0bGUsXG5cdFx0XHRcdGNvbnRlbnQ6IHRpdGxlLFxuXHRcdFx0XHRvbkNsaWNrOiAoKSA9PiBleGFtcGxlcy5zZWxlY3QodGl0bGUpXG5cdFx0XHR9KSk7XG5cblx0XHRsZXQgZGlydHlCdXR0b25zID0gKCkgPT4ge1xuXHRcdFx0aWYgKCFkaXJ0eSkgcmV0dXJuO1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0PE1lbnUgc2Vjb25kYXJ5IHN0eWxlPXt7IHBvc2l0aW9uOiBcImFic29sdXRlXCIsIHJpZ2h0OiBcIjFyZW1cIiwgdG9wOiBcIjNweFwiLCBtYXJnaW46IDAgfX0+XG5cdFx0XHRcdFx0PEJ1dHRvbiBuZWdhdGl2ZSBvbkNsaWNrPXsoKSA9PiB0aGlzLnJldmVydCgpfT48dT5SPC91PmV2ZXJ0PC9CdXR0b24+XG5cdFx0XHRcdFx0PEJ1dHRvbiBwb3NpdGl2ZSBvbkNsaWNrPXsoKSA9PiB0aGlzLnNhdmUoKX0+PHU+UzwvdT5hdmU8L0J1dHRvbj5cblx0XHRcdFx0PC9NZW51PlxuXHRcdFx0KTtcblx0XHR9O1xuXG5cdFx0bGV0IGNvbXBpbGVCdXR0b24gPSAoKSA9PiB7XG5cdFx0XHRpZiAob3V0cHV0KSByZXR1cm47XG5cdFx0XHRyZXR1cm4gPEJ1dHRvblxuXHRcdFx0XHRcdHN0eWxlPXt7IHBvc2l0aW9uOiBcImFic29sdXRlXCIsICB3aWR0aDogXCI0ZW1cIiwgbGVmdDogXCJjYWxjKDUwJSAtIDJlbSlcIiwgdG9wOiBcIjUwJVwiIH19XG5cdFx0XHRcdFx0b25DbGljaz17KCkgPT4gdGhpcy5jb21waWxlKCl9XG5cdFx0XHRcdFx0aWNvbj1cInJpZ2h0IGNoZXZyb25cIi8+O1xuXHRcdH07XG5cblx0XHRyZXR1cm4gKFxuXHRcdDxHcmlkIHN0cmV0Y2hlZCBwYWRkZWQgY2xhc3NOYW1lPVwiZnVsbEhlaWdodFwiPlxuXHRcdFx0PEdyaWQuUm93IHN0eWxlPXt7IGhlaWdodDogXCIycmVtXCIsIHBhZGRpbmdUb3A6IFwiMHJlbVwiIH19IGNsYXNzTmFtZT1cInVpIGludmVydGVkIGF0dGFjaGVkIG1lbnVcIj5cblx0XHRcdFx0PEdyaWQuQ29sdW1uIHdpZHRoPXs3fT5cblx0XHRcdFx0XHQ8TWVudSBpbnZlcnRlZCBhdHRhY2hlZCBmbHVpZD5cblx0XHRcdFx0XHRcdDxNZW51Lkl0ZW0+RXhhbXBsZTo8L01lbnUuSXRlbT5cblx0XHRcdFx0XHRcdDxEcm9wZG93biBpdGVtIHNlbGVjdGlvbiBvcHRpb25zPXtvcHRpb25zfSB2YWx1ZT17c2VsZWN0ZWR9IHN0eWxlPXt7IHdpZHRoOiBcIjIwZW1cIiB9fS8+XG5cdFx0XHRcdFx0XHQ8TWVudS5JdGVtIG9uQ2xpY2s9eygpID0+IHRoaXMuZGVsZXRlKCl9Pjx1PkQ8L3U+ZWxldGU8L01lbnUuSXRlbT5cblx0XHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gdGhpcy5yZW5hbWUoKX0+UmVuYW1lPC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0XHQ8TWVudS5JdGVtIG9uQ2xpY2s9eygpID0+IHRoaXMuZHVwbGljYXRlKCl9PkR1cGxpY2F0ZTwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdDwvTWVudT5cblx0XHRcdFx0PC9HcmlkLkNvbHVtbj5cblx0XHRcdFx0PEdyaWQuQ29sdW1uIHdpZHRoPXsyfT5cblx0XHRcdFx0XHQ8TWVudSBpbnZlcnRlZCBhdHRhY2hlZCBmbHVpZD5cblx0XHRcdFx0XHRcdDxTcGFjZXIgZmx1aWQvPlxuXHRcdFx0XHRcdFx0PE1lbnUuSXRlbSBvbkNsaWNrPXsoKSA9PiB0aGlzLmNyZWF0ZSgpfT48dT5OPC91PmV3PC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0XHQ8U3BhY2VyIGZsdWlkLz5cblx0XHRcdFx0XHQ8L01lbnU+XG5cdFx0XHRcdDwvR3JpZC5Db2x1bW4+XG5cdFx0XHRcdDxHcmlkLkNvbHVtbiB3aWR0aD17N30+XG5cdFx0XHRcdFx0PE1lbnUgaW52ZXJ0ZWQgYXR0YWNoZWQgZmx1aWQ+XG5cdFx0XHRcdFx0XHQ8U3BhY2VyIGZsdWlkLz5cblx0XHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gdGhpcy5sb2FkKCl9PlJlbG9hZDwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdFx0PE1lbnUuSXRlbSBvbkNsaWNrPXsoKSA9PiB0aGlzLnJlc2V0KCl9PlJlc2V0PC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0PC9NZW51PlxuXHRcdFx0XHQ8L0dyaWQuQ29sdW1uPlxuXHRcdFx0PC9HcmlkLlJvdz5cblx0XHRcdDxHcmlkLlJvdyBzdHlsZT17eyBoZWlnaHQ6IFwiY2FsYygxMDAlIC0gM3JlbSlcIiB9fT5cblx0XHRcdFx0PEdyaWQuQ29sdW1uIHdpZHRoPXs4fT5cblx0XHRcdFx0XHQ8VGFiYmFibGVUZXh0QXJlYVxuXHRcdFx0XHRcdFx0Y2xhc3NOYW1lPVwidWkgc2VnbWVudFwiXG5cdFx0XHRcdFx0XHR2YWx1ZT17Y29kZX1cblx0XHRcdFx0XHRcdG9uQ2hhbmdlPXsoZXZlbnQpID0+IGV4YW1wbGVzLnVwZGF0ZShleGFtcGxlcy5zZWxlY3RlZCwgZXZlbnQudGFyZ2V0LnZhbHVlLCBcIlNLSVBfU0FWRVwiKX1cblx0XHRcdFx0XHQvPlxuXHRcdFx0XHRcdHtkaXJ0eUJ1dHRvbnMoKX1cblx0XHRcdFx0PC9HcmlkLkNvbHVtbj5cblx0XHRcdFx0PEdyaWQuQ29sdW1uIHdpZHRoPXs4fT5cblx0XHRcdFx0XHQ8VGV4dEFyZWEgY2xhc3NOYW1lPVwidWkgc2VnbWVudFwiIHZhbHVlPXtvdXRwdXR9Lz5cblx0XHRcdFx0PC9HcmlkLkNvbHVtbj5cblx0XHRcdFx0e2NvbXBpbGVCdXR0b24oKX1cblx0XHRcdDwvR3JpZC5Sb3c+XG5cdFx0PC9HcmlkPlxuXHQpO31cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9hcHAvU3BlbGxFZGl0b3IuanN4IiwiZXhwb3J0IFRva2VuaXplciBmcm9tIFwiLi9Ub2tlbml6ZXIuanNcIjtcbmV4cG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5leHBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5pbXBvcnQgXCIuL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vcnVsZXMvYWxsLmpzXCI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHRPYmplY3QuYXNzaWduKHdpbmRvdywge1xuXHRcdFRva2VuaXplcjogZXhwb3J0cy5Ub2tlbml6ZXIsXG5cdFx0dG9rZW5pemU6IGV4cG9ydHMuVG9rZW5pemVyLnRva2VuaXplLmJpbmQoZXhwb3J0cy5Ub2tlbml6ZXIpLFxuXG5cdFx0UnVsZTogZXhwb3J0cy5SdWxlLFxuXG5cdFx0UGFyc2VyOiBleHBvcnRzLlBhcnNlcixcblx0XHRwYXJzZXI6IHBhcnNlcixcblx0XHRwYXJzZTogcGFyc2VyLnBhcnNlLmJpbmQocGFyc2VyKSxcblx0XHRjb21waWxlOiBwYXJzZXIuY29tcGlsZS5iaW5kKHBhcnNlciksXG5cdH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvaW5kZXguanMiLCJpbXBvcnQgeyBkZWZpbmVNZW1vaXplZCB9IGZyb20gXCIuL21lbW9pemUuanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIHJlLWV4cG9ydCBSdWxlIGZvciB0ZXN0aW5nXG5leHBvcnQgZGVmYXVsdCBSdWxlO1xuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbi8vIFRPRE86XHRVc2Uga2V5d29yZHMgaW4gc3ludGF4IHRvIG1ha2UgYSBxdWljayByZWdleC1iYXNlZCBgdGVzdGAgZnVuY3Rpb24gZm9yIHRoZSBlbnRpcmUgcnVsZVxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnQgPSAwKSB7XG5cdFx0bGV0IGxhc3RJbmRleCA9IHN5bnRheFN0cmVhbS5sZW5ndGg7XG5cdFx0d2hpbGUgKHN0YXJ0IDwgbGFzdEluZGV4KSB7XG5cdFx0XHRsZXQgWyBydWxlLCBlbmQgXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0KTtcblx0XHRcdGlmIChydWxlKSB7XG5cdFx0XHRcdGxldCBsYXN0ID0gcnVsZXNbcnVsZXMubGVuZ3RoLTFdO1xuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYFN5bWJvbGAgYW5kIGxhc3Qgd2FzIGEgYFN5bWJvbGAsIG1lcmdlIHRvZ2V0aGVyXG4gXHRcdFx0XHRpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5TeW1ib2wgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sKSB7XG4gXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG4gXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuIFx0XHRcdFx0XHQvLyBhbmQgcmVwbGFjZSB3aXRoIGEgcnVsZSB0aGF0IG1lcmdlcyB0aGUga2V5d29yZHNcbiBcdFx0XHRcdFx0cnVsZS5tYXRjaCA9IGxhc3QubWF0Y2guY29uY2F0KHJ1bGUubWF0Y2gpO1xuIFx0XHRcdFx0fVxuXHRcdFx0XHRydWxlcy5wdXNoKHJ1bGUpO1xuXHRcdFx0fVxuXHRcdFx0c3RhcnQgPSBlbmQgKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZXM7XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnQgPSAwKSB7XG5cdFx0bGV0IHN5bnRheFRva2VuID0gc3ludGF4U3RyZWFtW3N0YXJ0XTtcblxuXHRcdC8vIGlmIHdlIGdvdCBhIFwiXFxcXFwiICh3aGljaCBhbHNvIGhhcyB0byBnbyBpbnRvIHRoZSBzb3VyY2Ugc3RyaW5nIGFzIFwiXFxcXFwiKVxuXHRcdC8vIHRyZWF0IHRoZSBuZXh0IHRva2VuIGFzIGEgbGl0ZXJhbCBzdHJpbmcgcmF0aGVyIHRoYW4gYXMgYSBzcGVjaWFsIGNoYXJhY3Rlci5cblx0XHRpZiAoc3ludGF4VG9rZW4gPT09IFwiXFxcXFwiKSB7XG5cdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3ltYm9sKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0ICsgMSk7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChzeW50YXhUb2tlbikge1xuXHRcdFx0Y2FzZSBcIntcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0KTtcblx0XHRcdGNhc2UgXCIoXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnQpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0KTtcblx0XHRcdGNhc2UgXCIqXCI6XG5cdFx0XHRjYXNlIFwiK1wiOlxuXHRcdFx0Y2FzZSBcIj9cIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnQpO1xuXG5cdFx0XHQvLyB0aGUgZm9sbG93aW5nIHNob3VsZCBBTFdBWVMgYmUgY29uc3VtZWQgYnkgdGhlIGFib3ZlXG5cdFx0XHRjYXNlIFwifVwiOlxuXHRcdFx0Y2FzZSBcIilcIjpcblx0XHRcdGNhc2UgXCJdXCI6XG5cdFx0XHRjYXNlIFwifFwiOlxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgJHtzeW50YXhUb2tlbn0gZm91bmQgYXMgaXRlbSAke3N0YXJ0fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRpZiAoc3ludGF4VG9rZW4ubWF0Y2goUnVsZS5LRVlXT1JEX1BBVFRFUk4pKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnQpO1xuXHRcdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdEtFWVdPUkRfUEFUVEVSTiA6IC9bQS1aYS16XVtcXHdfLV0qLyxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBJZiBtb3JlIHRoYW4gb25lIGtleXdvcmQgYXBwZWFycyBpbiBhIHJvdywgY29tYmluZXMgdGhlbSBpbnRvIGEgc2luZ2xlIGBLZXl3b3JkYCBvYmplY3QuXG5cdC8vIFRoaXMgaXMgcHJldHR5IHNhZmUsIHVubGVzcyB5b3UgaGF2ZSBhbiBvcHRpb25hbCBrZXl3b3JkIGxpa2Vcblx0Ly9cdFx0YHRoZSB7aWRlbnRpZmllcn0gb2YgdGhlPyB7ZXhwcmVzc2lvbn1gXG5cdC8vIGluIHdoaWNoIGNhc2UgeW91IGNhbiBwdXQgdGhlIG9wdGlvbmFsIGtleXdvcmQgaW4gcGFyZW5zXG5cdC8vXHRcdGB0aGUge2lkZW50aWZpZXJ9IG9mICh0aGU/KSB7ZXhwcmVzc2lvbn1gXG5cdC8vXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kIF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfa2V5d29yZChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0ID0gMCwgY29uc3RydWN0b3IpIHtcblx0XHRsZXQgbWF0Y2ggPSBbXSwgZW5kO1xuIFx0XHQvLyBlYXQga2V5d29yZHMgd2hpbGUgdGhleSBsYXN0XG5cdFx0Zm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgc3ludGF4U3RyZWFtLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXQgbmV4dCA9IHN5bnRheFN0cmVhbVtpXTtcblx0XHRcdGlmICh0eXBlb2YgbmV4dCA9PT0gXCJzdHJpbmdcIiAmJiBuZXh0Lm1hdGNoKFJ1bGUuS0VZV09SRF9QQVRURVJOKSkge1xuXHRcdFx0XHRtYXRjaC5wdXNoKG5leHQpO1xuXHRcdFx0XHRlbmQgPSBpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBicmVhaztcblx0XHR9XG5cblx0XHRpZiAoIWNvbnN0cnVjdG9yKSBjb25zdHJ1Y3RvciA9IFJ1bGUuS2V5d29yZDtcblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IG1hdGNoIH0pO1xuXG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kIF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmQgXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydCA9IDAsIGNvbnN0cnVjdG9yID0gUnVsZS5TeW1ib2wpIHtcblx0XHRsZXQgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0XTtcblxuXHRcdGlmICghY29uc3RydWN0b3IpIGNvbnN0cnVjdG9yID0gUnVsZS5TeW1ib2w7XG5cblx0XHQvLyBJZiBzdHJpbmcgc3RhcnRzIHdpdGggYFxcXFxgLCBpdCdzIGFuIGVzY2FwZWQgbGl0ZXJhbCAoZWc6IGBcXFtgIG5lZWRzIHRvIGlucHV0IGFzIGBcXFxcW2ApLlxuXHRcdGxldCBpc0VzY2FwZWQgPSBzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIik7XG5cdFx0bGV0IG1hdGNoID0gaXNFc2NhcGVkID8gc3RyaW5nLnN1YnN0cigxKSA6IHN0cmluZztcblxuXHRcdGxldCBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHsgbWF0Y2ggfSk7XG5cblx0XHRpZiAoaXNFc2NhcGVkKSB7XG5cdFx0XHRydWxlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBgXFxcXCR7bWF0Y2h9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gWyBydWxlLCBzdGFydCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kIF1gXG5cdC8vIFlvdSBjYW4gc3BlY2lmeSBhbiBleHBsaWNpdCBgcnVsZS5hcmd1bWVudGAgd2l0aDogIGAoc29tZWFyZzouLi4pYFxuXHQvLyBZb3UgY2FuIHNwZWNpZnkgdGhhdCB0aGUgcmVzdWx0cyBzaG91bGQgYmUgYHByb21vdGVkYCB0byBlbmNsb3NpbmcgY29udGV4dCB3aXRoOiBgKD86Li4uKWBcblx0Ly9cblx0Ly8gTk9URTogbmVzdGVkIHBhcmVucyBtYXkgbm90IGhhdmUgYWx0ZXJuYXRpdmVzLi4uIDotKCAgIGAoYXwoYnxjKSlgIHdvbid0IHdvcms/Pz9cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnQgPSAwKSB7XG5cdFx0bGV0IHsgZW5kLCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIihcIiwgXCIpXCIsIHN0YXJ0KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IFwicHJvbW90ZVwiIGZsYWc6IGA/OmBcblx0XHRsZXQgcHJvbW90ZSA9IChzbGljZVswXSA9PT0gXCI/XCIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKTtcblx0XHRpZiAocHJvbW90ZSkgc2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHQvLyBzcGxpdCBpbnRvIGdyb3VwcywgaW5jbHVkaW5nIG5lc3RlZCBwYXJlbnNcblx0XHRsZXQgYWx0ZXJuYXRpdmVzID1cblx0XHRcdGdyb3VwQWx0ZXJuYXRpdmVzKHNsaWNlKVxuXHRcdFx0Lm1hcChmdW5jdGlvbihncm91cCkge1xuXHRcdFx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2Vucyhncm91cCwgW10pO1xuXHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0c1swXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IFJ1bGUuU2VxdWVuY2UoeyBydWxlczogcmVzdWx0cyB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRsZXQgcnVsZSA9IGFsdGVybmF0aXZlcy5sZW5ndGggPT09IDEgPyBhbHRlcm5hdGl2ZXNbMF0gOiBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlczogYWx0ZXJuYXRpdmVzIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdGlmIChwcm9tb3RlKSBydWxlLnByb21vdGUgPSB0cnVlO1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZCBdO1xuXG5cdFx0ZnVuY3Rpb24gZ3JvdXBBbHRlcm5hdGl2ZXModG9rZW5zKSB7XG5cdFx0XHRsZXQgYWx0ZXJuYXRpdmVzID0gW107XG5cdFx0XHRsZXQgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yIChsZXQgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XHRjdXJyZW50ID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaGFuZGxlIG5lc3RlZCBwYXJlbnNcblx0XHRcdFx0ZWxzZSBpZiAodG9rZW4gPT09IFwiKFwiKSB7XG5cdFx0XHRcdFx0bGV0IHsgZW5kIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmQgKyAxKSk7XG5cdFx0XHRcdFx0aSA9IGVuZDtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdXJyZW50LnB1c2godG9rZW4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoY3VycmVudC5sZW5ndGgpIGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0cmV0dXJuIGFsdGVybmF0aXZlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnQgPSAwKSB7XG5cdFx0bGV0IHN5bWJvbCA9IHN5bnRheFN0cmVhbVtzdGFydF07XG5cdFx0bGV0IHJ1bGUgPSBydWxlc1tydWxlcy5sZW5ndGggLSAxXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgYXR0YWNoIHJlcGVhdCBzeW1ib2wgJHtzeW1ib2x9IHRvIGVtcHR5IHJ1bGUhYCk7XG5cblx0XHQvLyBUcmFuc2Zvcm0gbGFzdCBydWxlIGludG8gYSByZXBlYXQgZm9yIGAqYCBhbmQgYCtgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiKlwiIHx8IHN5bWJvbCA9PT0gXCIrXCIpIHtcblx0XHRcdGxldCBhcmd1bWVudCA9IHJ1bGUuYXJndW1lbnQ7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuUmVwZWF0KHsgcnVsZSB9KTtcblx0XHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdFx0Ly8gcHVzaCBpbnRvIHJ1bGUgc3RhY2sgaW4gcGxhY2Ugb2Ygb2xkIHJ1bGVcblx0XHRcdHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdID0gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBSdWxlIGlzIG9wdGlvbmFsIGZvciBgP2AgYW5kIGAqYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIj9cIiB8fCBzeW1ib2wgPT09IFwiKlwiKSB7XG5cdFx0XHRydWxlLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gWyB1bmRlZmluZWQsIHN0YXJ0IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kIF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0ID0gMCkge1xuXHRcdGxldCBtYXRjaCA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJ7XCIsIFwifVwiLCBzdGFydCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblxuXHRcdGxldCBwYXJhbXMgPSB7IHJ1bGU6IG1hdGNoLnNsaWNlWzBdIH07XG5cblx0XHQvLyBzZWUgaWYgdGhlcmUncyBhIGBub3RgIHJ1bGUgaW4gdGhlcmVcblx0XHRsZXQgYmFuZ1Bvc2l0aW9uID0gcGFyYW1zLnJ1bGUuaW5kZXhPZihcIiFcIik7XG5cdFx0aWYgKGJhbmdQb3NpdGlvbiAhPT0gLTEpIHtcblx0XHRcdHBhcmFtcy5ub3QgPSBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSk7IC8vWyBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSkgXTtcblx0XHRcdHBhcmFtcy5ydWxlID0gcGFyYW1zLnJ1bGUuc3Vic3RyKDAsIGJhbmdQb3NpdGlvbik7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5TdWJydWxlKHBhcmFtcyk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgbWF0Y2guZW5kIF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggbGlzdCBleHByZXNzaW9uIGBbPGl0ZW0+PGRlbGltaXRlcj5dYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kIF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0ID0gMCwgY29uc3RydWN0b3IgPSBSdWxlLkxpc3QpIHtcblx0XHRsZXQgeyBlbmQsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnQpO1xuXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHRpZiAocmVzdWx0cy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCBzdHVmZiBhdCBlbmQgb2YgbGlzdDogWyR7c2xpY2Uuam9pbihcIiBcIil9XWApO1xuXHRcdH1cblx0XHRsZXQgWyBpdGVtLCBkZWxpbWl0ZXIgXSA9IHJlc3VsdHM7XG5cblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IGl0ZW0sIGRlbGltaXRlciB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmQgXTtcblx0fSxcblxufSk7XG5cblxuXG4vLyAjIyAgQWRkIG1ldGhvZHMgdG8gUGFyc2VyIHRvIGRlZmluZSBydWxlcyB1c2luZyB0aGUgYWJvdmUgc3ludGF4LlxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUGFyc2VyLnByb3RvdHlwZSwge1xuXG5cdC8vIFBhcnNlIGEgYHJ1bGVTeW50YXhgIHJ1bGUgYW5kIGFkZCBpdCB0byBvdXIgbGlzdCBvZiBydWxlcy5cblx0Ly8gUmV0dXJucyB0aGUgbmV3IHJ1bGUuXG5cdC8vIExvZ3MgcGFyc2luZyBlcnJvcnMgYnV0IGFsbG93cyB0aGluZ3MgdG8gY29udGludWUuXG5cdGFkZFNlcXVlbmNlOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSk7XG5cblx0XHRpZiAodHlwZW9mIGNvbnN0cnVjdG9yICE9PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHByb3BlcnRpZXMgPSBjb25zdHJ1Y3Rvcjtcblx0XHRcdGNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZTtcblx0XHR9XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgY29uc3RydWN0b3IpO1xuXHRcdFx0Ly8gUmVmbGVjdCB0aGUgcnVsZSBiYWNrIG91dCB0byBtYWtlIHN1cmUgaXQgbG9va3MgKG1vcmUgb3IgbGVzcykgdGhlIHNhbWVcblx0XHRcdGlmIChQYXJzZXIuREVCVUcpIGNvbnNvbGUubG9nKGBBZGRlZCBydWxlICcke25hbWV9JzpcXG4gIElOUFVUOiAke3J1bGVTeW50YXh9IFxcbiBPVVRQVVQ6ICR7cnVsZX1gKTtcblxuLy9jb25zb2xlLmluZm8obmFtZSwgY29uc3RydWN0b3IsIHJ1bGUpO1xuXHRcdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0fVxuXHR9fSxcblxuXHRhZGRTdGF0ZW1lbnQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5TdGF0ZW1lbnQsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRTdGF0ZW1lbnQobmFtZSwgc3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcykpO1xuXG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmFkZFNlcXVlbmNlKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkRXhwcmVzc2lvbjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLkV4cHJlc3Npb24sIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRFeHByZXNzaW9uKG5hbWUsIHN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpKTtcblxuXHRcdGxldCBydWxlID0gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRMaXN0OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuTGlzdCwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZExpc3QobmFtZSwgc3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcykpO1xuXG5cdFx0bGV0IHN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgpO1xuXHRcdGxldCBydWxlID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKVswXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZS5hZGRMaXN0KCR7bmFtZX0sICR7cnVsZVN5bnRheH0pOiBubyBydWxlIHByb2R1Y2VkYCk7XG5cdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fX0sXG5cblx0YWRkS2V5d29yZDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLktleXdvcmQsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRLZXl3b3JkKG5hbWUsIHN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpKTtcblxuXHRcdGxldCBzdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChydWxlU3ludGF4KTtcblx0XHRsZXQgcnVsZSA9IChSdWxlLnBhcnNlUnVsZVN5bnRheF9rZXl3b3JkKHN0cmVhbSwgW10sIDAsIGNvbnN0cnVjdG9yKSB8fCBbXSlbMF07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFJ1bGUuYWRkS2V5d29yZCgke25hbWV9LCAke3J1bGVTeW50YXh9KTogbm8gcnVsZSBwcm9kdWNlZGApO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZFN5bWJvbDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlN5bWJvbCwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFN5bWJvbChuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSk7XG5cblx0XHQvLyBQYXJzZSBhcyBgdG9rZW5zYCwgd2hpY2ggd2lsbCBtZXJnZSBTeW1ib2xzIGZvciB1cy5cblx0XHRsZXQgc3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgocnVsZVN5bnRheCk7XG5cdFx0bGV0IHJ1bGVzID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pO1xuXG5cdFx0aWYgKHJ1bGVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBSdWxlLmFkZFN5bWJvbCgke25hbWV9LCAke3J1bGVTeW50YXh9KTogbm8gcnVsZSBwcm9kdWNlZGApO1xuXHRcdH1cblxuXHRcdGlmIChydWxlcy5sZW5ndGggPiAxIHx8ICEocnVsZXNbMF0gaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCkpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZS5hZGRTeW1ib2woJHtuYW1lfSwgJHtydWxlU3ludGF4fSk6IGdlbmVyYXRlZCBzb21ldGhpbmcgYCtcblx0XHRcdFx0YCBvdGhlciB0aGFuIGEgc2luZ2xlIFN5bWJvbC4gIFVzZSBSdWxlLmFkZFN5bnRheCgpIGluc3RlYWQuYCk7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSBydWxlc1swXTtcblx0XHQvLyBDb252ZXJ0IHRvIHByb3BlciB0eXBlIGlmIG5lY2Vzc2FyeVxuXHRcdGlmIChjb25zdHJ1Y3RvciAhPT0gUnVsZS5TeW1ib2wpIHJ1bGUgPSBuZXcgY29uc3RydWN0b3IocnVsZSk7XG5cdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fX0sXG5cbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGVTeW50YXguanMiLCIvKiBTdG9yZSBvZiBleGFtcGxlIHNwZWxsIGNvZGUgZnJhZ21lbnRzLiAqL1xuaW1wb3J0IG1vYngsIHsgb2JzZXJ2YWJsZSwgY29tcHV0ZWQgfSBmcm9tIFwibW9ieFwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFeGFtcGxlU3RvcmUge1xuXHQvLyBDVVJSRU5UIGV4YW1wbGVzXG5cdEBvYnNlcnZhYmxlIGV4YW1wbGVzID0ge307XG5cdC8vIEV4YW1wbGVzIGFzIG9mIGxhc3Qgc2F2ZSAoZm9yIHJldmVyKVxuXHRAb2JzZXJ2YWJsZSBfc2F2ZWRFeGFtcGxlcyA9IHt9O1xuXHQvLyBTZWxlY3RlZCBleGFtcGxlIGtleS5cblx0QG9ic2VydmFibGUgc2VsZWN0ZWQgPSBcIlwiO1xuXHQvLyBDb21waWxlZCBvdXRwdXQuXG5cdEBvYnNlcnZhYmxlIG91dHB1dCA9IFwiXCI7XG5cblx0Ly8gUmV0dXJuIGp1c3QgdGhlIHRpdGxlcyBvZiB0aGUgZXhhbXBsZXMuXG5cdEBjb21wdXRlZCBnZXQgdGl0bGVzKCkge1xuXHRcdHJldHVybiBPYmplY3Qua2V5cyh0aGlzLmV4YW1wbGVzKTtcblx0fVxuXG5cdC8vIFJldHVybiB0aGUgY29kZSBmb3IgdGhlIGN1cnJlbnQgZXhhbXBsZVxuXHRAY29tcHV0ZWQgZ2V0IGNvZGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXhhbXBsZXNbdGhpcy5zZWxlY3RlZF07XG5cdH1cblxuXHQvLyBJcyBBTllUSElORyBkaXJ0eT9cblx0QGNvbXB1dGVkIGdldCBkaXJ0eSgpIHtcblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5fc2F2ZWRFeGFtcGxlcykgIT09IEpTT04uc3RyaW5naWZ5KHRoaXMuZXhhbXBsZXMpO1xuXHR9XG5cblx0Ly8gUmVzZXQgYWxsIGV4YW1wbGVzIGZyb20gbG9jYWxTdG9yYWdlLlxuXHRyZXNldCgpIHtcblx0XHRkZWxldGUgbG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZXM7XG5cdFx0ZGVsZXRlIGxvY2FsU3RvcmFnZS5zcGVsbEVkaXRvckV4YW1wbGU7XG5cdFx0d2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuXHR9XG5cblx0Ly8gTG9hZCBleGFtcGxlc1xuXHRsb2FkKCkge1xuXHRcdC8vIExvYWQgZXhhbXBsZXMgZnJvbSBsb2NhbFN0b3JhZ2Vcblx0XHR0aGlzLmV4YW1wbGVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2Uuc3BlbGxFZGl0b3JFeGFtcGxlc1xuXHRcdFx0fHwgJ3tcIkZvb1wiOlwiZGVmaW5lIHR5cGUgRm9vXCIsIFwiQmFyXCI6XCJkZWZpbmUgdHlwZSBCYXJcIn0nKTtcblxuXHRcdC8vIFNhdmUgYSBjb3B5IG9mIGV4YW1wbGVzIGZvciByZXZlcnRcblx0XHR0aGlzLl9zYXZlZEV4YW1wbGVzID0gdGhpcy5leGFtcGxlcztcblxuXHRcdC8vIExvYWQgc2VsZWN0ZWQgZXhhbXBsZSBuYW1lXG5cdFx0dGhpcy5zZWxlY3QobG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZSk7XG5cdH1cblxuXHQvLyBTYXZlIGN1cnJlbnQgZXhhbXBsZXMuXG5cdHNhdmUoKSB7XG5cdFx0bG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZXMgPSBKU09OLnN0cmluZ2lmeSh0aGlzLmV4YW1wbGVzKTtcblxuXHRcdC8vIFNhdmUgYSBjb3B5IG9mIGV4YW1wbGVzIGZvciByZXZlcnRcblx0XHR0aGlzLl9zYXZlZEV4YW1wbGVzID0gdGhpcy5leGFtcGxlcztcblx0fVxuXG5cdC8vIFJldmVydCB0aGUgY3VycmVudCBleGFtcGxlXG5cdHJldmVydChleGFtcGxlID0gdGhpcy5zZWxlY3RlZCkge1xuXHRcdHRoaXMudXBkYXRlKGV4YW1wbGUsIHRoaXMuX3NhdmVkRXhhbXBsZXNbZXhhbXBsZV0pO1xuXHR9XG5cblx0Ly8gU2VsZWN0IGEgZGlmZmVyZW50IGV4YW1wbGUuXG5cdHNlbGVjdChleGFtcGxlKSB7XG5cdFx0aWYgKCFleGFtcGxlIHx8IHRoaXMuZXhhbXBsZXNbZXhhbXBsZV0gPT0gbnVsbCkgZXhhbXBsZSA9IE9iamVjdC5rZXlzKHRoaXMuZXhhbXBsZXMpWzBdIHx8IFwiXCI7XG5cdFx0dGhpcy5zZWxlY3RlZCA9IGxvY2FsU3RvcmFnZS5zcGVsbEVkaXRvckV4YW1wbGUgPSBleGFtcGxlO1xuXHRcdHRoaXMub3V0cHV0ID0gXCJcIjtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyBleGFtcGxlLlxuXHQvLyBTYXZlcyBhbmQgc2VsZWN0cyB0aGUgZXhhbXBsZSBhdXRvbWF0aWNhbGx5LlxuXHR1cGRhdGUobmFtZSwgY29kZSwgc2tpcFNhdmUpIHtcblx0XHR0aGlzLmV4YW1wbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5leGFtcGxlcywgeyBbIG5hbWUgXTogY29kZSB9KTtcblx0XHR0aGlzLnNlbGVjdChuYW1lKTtcblx0XHR0aGlzLm91dHB1dCA9IFwiXCI7XG5cdFx0aWYgKCFza2lwU2F2ZSkgdGhpcy5zYXZlKCk7XG5cdH1cblxuXHQvLyBEZWxldGUgYW4gZXhhbXBsZS5cblx0Ly8gU2F2ZXMgYW5kIHNlbGVjdHMgYW5vdGhlciBleGFtcGxlIGF1dG9tYXRpY2FsbHkuXG5cdGRlbGV0ZShuYW1lID0gdGhpcy5zZWxlY3RlZCwgc2hvd0NvbmZpcm0pIHtcblx0XHRpZiAoc2hvd0NvbmZpcm0gJiYgIWNvbmZpcm0oYFJlYWxseSBkZWxldGUgZXhhbXBsZSAke25hbWV9P2ApKSByZXR1cm47XG5cdFx0bGV0IGV4YW1wbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5leGFtcGxlcyk7XG5cdFx0ZGVsZXRlIGV4YW1wbGVzW25hbWVdO1xuXHRcdHRoaXMuZXhhbXBsZXMgPSBleGFtcGxlcztcblx0XHR0aGlzLnNhdmUoKTtcblx0XHR0aGlzLnNlbGVjdCgpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgbmV3IGV4YW1wbGUuXG5cdGNyZWF0ZShuYW1lLCBjb2RlID0gXCJcIikge1xuXHRcdC8vIElmIG5vIG5hbWUsIHByb21wdC5cblx0XHRpZiAoIW5hbWUpIG5hbWUgPSBwcm9tcHQoXCJOYW1lIGZvciB0aGlzIGV4YW1wbGU/XCIpO1xuXHRcdC8vIEZvcmdldCBpdCBpZiBubyBuYW1lLlxuXHRcdGlmICghbmFtZSkgcmV0dXJuO1xuXG5cdFx0dGhpcy51cGRhdGUobmFtZSwgY29kZSk7XG5cdH1cblxuXHQvLyBSZW5hbWUgYW4gZXhhbXBsZS5cblx0Ly8gU2VsZWN0cyBhbmQgc2F2ZXMgYXV0b21hdGljYWxseS5cblx0cmVuYW1lKG9sZE5hbWUgPSB0aGlzLnNlbGVjdGVkLCBuZXdOYW1lKSB7XG5cdFx0Ly8gSWYgbm8gbmV3IG5hbWUsIHByb21wdC5cblx0XHRpZiAoIW5ld05hbWUpIG5ld05hbWUgPSBwcm9tcHQoXCJOZXcgbmFtZSBmb3IgdGhpcyBleGFtcGxlP1wiLCBvbGROYW1lKTtcblxuXHRcdC8vIEZvcmdldCBpdCBpZiBubyBuYW1lIHN1cHBsaWVkIG9yIG5hbWUgaXMgdGhlIHNhbWVcblx0XHRpZiAoIW5ld05hbWUgfHwgbmV3TmFtZSA9PT0gb2xkTmFtZSkgcmV0dXJuO1xuXHRcdGlmICh0aGlzLmV4YW1wbGVzW25ld05hbWVdKSByZXR1cm4gY29uc29sZS53YXJuKGBleGFtcGxlcy5yZW5hbWUoXCIke25ld05hbWV9XCIpOiBuYW1lIGFscmVhZHkgaW4gdXNlYCk7XG5cblx0XHRsZXQgY29kZSA9IHRoaXMuZXhhbXBsZXNbb2xkTmFtZV07XG5cdFx0dGhpcy5kZWxldGUob2xkTmFtZSk7XG5cdFx0dGhpcy51cGRhdGUobmV3TmFtZSwgY29kZSk7XG5cdH1cblxuXHQvLyBEdXBsaWNhdGUgYW4gZXhhbXBsZS5cblx0ZHVwbGljYXRlKG9sZE5hbWUgPSB0aGlzLnNlbGVjdGVkLCBuZXdOYW1lKSB7XG5cdFx0Ly8gSWYgbm8gbmV3IG5hbWUsIHByb21wdC5cblx0XHRpZiAoIW5ld05hbWUpIG5ld05hbWUgPSBwcm9tcHQoXCJOZXcgbmFtZSBmb3IgZHVwbGljYXRlIGV4YW1wbGU/XCIsIG9sZE5hbWUpO1xuXHRcdC8vIEZvcmdldCBpdCBpZiBubyBuYW1lIHN1cHBsaWVkIG9yIG5hbWUgaXMgdGhlIHNhbWVcblx0XHRpZiAoIW5ld05hbWUgfHwgbmV3TmFtZSA9PT0gb2xkTmFtZSkgcmV0dXJuO1xuXHRcdGlmICh0aGlzLmV4YW1wbGVzW25ld05hbWVdKSByZXR1cm4gY29uc29sZS53YXJuKGBleGFtcGxlcy5yZW5hbWUoXCIke25ld05hbWV9XCIpOiBuYW1lIGFscmVhZHkgaW4gdXNlYCk7XG5cblx0XHR0aGlzLnVwZGF0ZShuZXdOYW1lLCB0aGlzLmNvZGUpO1xuXHR9XG5cblx0Ly8gQ29tcGlsZSB0aGUgY3VycmVudCBleGFtcGxlLCBwbGFjaW5nIGl0IGluIG91ciBgb3V0cHV0YC5cbi8vVE9ETzogc29tZSB3YXkgdG8gZG8gdGhpcyBhdXRvbWF0aWNhbGx5IHcvIFwib3V0cHV0XCIgP1xuXHRjb21waWxlKCkge1xuXHRcdHRoaXMub3V0cHV0ID0gXCIuLi5jb21waWxpbmcuLi5cIjtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHRoaXMub3V0cHV0ID0gcGFyc2VyLmNvbXBpbGUodGhpcy5jb2RlKTtcblx0XHR9LCAxMDApO1xuXHR9XG5cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9hcHAvRXhhbXBsZVN0b3JlLmpzIiwiLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vL1xuLy8gIDxTcGFjZXI+IGNvbXBvbmVudCBmb3IgdXNlIHdpdGggb2FrLlxuLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5pbXBvcnQgUmVhY3QgZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgUHJvcFR5cGVzIGZyb20gXCJwcm9wLXR5cGVzXCI7XG5pbXBvcnQgeyBjbGFzc05hbWVzIH0gZnJvbSBcIi4vdXRpbFwiO1xuXG5pbXBvcnQgXCIuL1NwYWNlci5sZXNzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFNwYWNlcihwcm9wcykge1xuICBjb25zdCB7XG4gICAgY2xhc3NOYW1lLFxuICAgIGFwcGVhcmFuY2UsIHNpemUsIHdpZHRoLCBoZWlnaHQsXG4gICAgaW5saW5lLCBmbHVpZCwgdGlueSwgc21hbGwsIG1lZGl1bSwgbGFyZ2UsIGh1Z2UsIG1hc3NpdmVcbiAgfSA9IHByb3BzO1xuXG4gIGNvbnN0IHNwYWNlclByb3BzID0ge1xuICAgIGNsYXNzTmFtZTogY2xhc3NOYW1lcyhjbGFzc05hbWUsIFwib2FrXCIsIHNpemUsIGFwcGVhcmFuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHsgaW5saW5lLCBmbHVpZCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcInNwYWNlclwiKSxcbiAgICBzdHlsZToge1xuICAgICAgd2lkdGgsXG4gICAgICBoZWlnaHQsXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIDxkaXYgey4uLnNwYWNlclByb3BzfS8+O1xufVxuXG5TcGFjZXIucHJvcFR5cGVzID0ge1xuICBjbGFzc05hbWU6IFByb3BUeXBlcy5zdHJpbmcsXG4gIGFwcGVhcmFuY2U6IFByb3BUeXBlcy5zdHJpbmcsXG4gIHNpemU6IFByb3BUeXBlcy5zdHJpbmcsXG4gIHdpZHRoOiBQcm9wVHlwZXMubnVtYmVyLFxuICBoZWlnaHQ6IFByb3BUeXBlcy5udW1iZXIsXG5cbiAgaW5saW5lOiBQcm9wVHlwZXMuYm9vbCxcbiAgZmx1aWQ6IFByb3BUeXBlcy5ib29sLFxuXG59O1xuXG5TcGFjZXIuZGVmYXVsdFByb3BzID0ge1xuICBzaXplOiBcIm1lZGl1bVwiXG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvYXBwL1NwYWNlci5qc3giLCJpbXBvcnQgUmVhY3QgZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgcHJvcFR5cGVzIGZyb20gXCJwcm9wLXR5cGVzXCI7XG5pbXBvcnQgeyBUZXh0QXJlYSB9IGZyb20gJ3NlbWFudGljLXVpLXJlYWN0J1xuXG4vL1xuLy9cdCMgPFRhYmJhYmxlVGV4dEFyZWE+IC0tIDxTVUkuVGV4dEFyZWE+IGluIHdoaWNoIHlvdSBjYW4gdHlwZSBhIHRhYiBjaGFyYWN0ZXI6XG4vL1x0LSBJZiBub3RoaW5nIGlzIHNlbGVjdGVkLCBpbnNlcnRzIGEgdGFiIGNoYXJhY3RlclxuLy9cdC0gSWYgYW55dGhpbmcgaXMgc2VsZWN0ZWQsIGluc2VydHMgdGFiIGNoYXJhY3RlcnMgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgbGluZShzKVxuLy9cdC0gSWYgc2hpZnQga2V5IGlzIGRvd24sIGluc2VydHMgdGFiIGNoYXJhY3RlcnMgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgbGluZShzKS5cbi8vXG4vL1x0IyMjIFByb3BlcnRpZXNcbi8vXHQtIGBzYXZlYCAocmVxdWlyZWQpIC0tIGZ1bmN0aW9uIHVzZWQgdG8gc2F2ZSB0aGUgcmVzdWx0cyBvbiBrZXlwcmVzc1xuLy9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRhYmJhYmxlVGV4dEFyZWEgZXh0ZW5kcyBUZXh0QXJlYSB7XG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gPFRleHRBcmVhIHsuLi50aGlzLnByb3BzfSBvbktleURvd249e3RoaXMub25LZXlEb3dufSAvPjtcblx0fVxuXG5cdC8vIERvIE5PVCBleGl0IG9uIHRhYiAtLSBpbnNlcnQgb3IgcmVtb3ZlIHRhYihzKSB2YWx1ZSBpbnN0ZWFkLlxuXHRvbktleURvd24gPSAoZXZlbnQpID0+IHtcblxuLy9UT0RPIGZpcmUgYHRoaXMucHJvcHMub25LZXlEb3duYCBpZiBkZWZpbmVkLi4uXG5cdFx0Ly8gRm9yZ2V0IGl0IGlmIG5vdCBhIHRhYlxuXHRcdGlmIChldmVudC5rZXlDb2RlICE9PSA5KSByZXR1cm47XG5cblx0XHQvLyBwcmV2ZW50IGRlZmF1bHQgc28gd2UgZG9uJ3QgZXhpdCB0aGUgZmllbGRcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0Ly8gZmlndXJlIG91dCB0aGUgdGV4dCByYW5nZVxuXHRcdHZhciBlbGVtZW50ID0gZXZlbnQudGFyZ2V0O1xuXHRcdHZhciB0ZXh0ID0gZWxlbWVudC52YWx1ZTtcblx0XHR2YXIgc3RhcnQgPSBlbGVtZW50LnNlbGVjdGlvblN0YXJ0O1xuXHRcdHZhciBlbmQgPSBlbGVtZW50LnNlbGVjdGlvbkVuZDtcblxuXHRcdC8vIFJlcGxhY2VtZW50IHRleHRcblx0XHRsZXQgbmV3VGV4dCA9IFwiXCIsIHNlbGVjdGlvblN0YXJ0ID0gc3RhcnQsIHNlbGVjdGlvbkVuZCA9IGVuZDtcblxuXHRcdC8vIElmIHNlbGVjdGlvbiBpcyBlbXB0eSxcblx0XHRpZiAoc3RhcnQgPT09IGVuZCAmJiAhZXZlbnQuc2hpZnRLZXkpIHtcblx0XHRcdG5ld1RleHQgPSBcIlxcdFwiO1xuXHRcdFx0c2VsZWN0aW9uU3RhcnQgPSBzZWxlY3Rpb25FbmQgPSBlbmQgKyAxO1xuXHRcdH1cblx0XHQvLyBvdGhlcndpc2UgaW5kZW50L2RlLWluZGVudCBhbGwgb2YgdGhlIGxpbmVzXG5cdFx0ZWxzZSB7XG5cdFx0Ly8gdXNlIHN0YXJ0IGFuZCBlbmQgb2YgbGluZShzKVxuLy9jb25zb2xlLmluZm8oYHN0YXJ0OiAke3N0YXJ0fSA6JHt0ZXh0W3N0YXJ0XX06ICAgZW5kOiAke2VuZH0gOiAke3RleHRbZW5kXX06YCk7XG5cdFx0XHRpZiAodGV4dFtzdGFydF0gIT09IFwiXFxuXCIpIHN0YXJ0ID0gdGV4dC5sYXN0SW5kZXhPZihcIlxcblwiLCBzdGFydCkgKyAxO1xuXHRcdFx0aWYgKHRleHRbZW5kLTFdID09PSBcIlxcblwiKSBlbmQtLTtcblx0XHRcdGVsc2UgaWYgKHRleHRbZW5kKzFdICE9PSBcIlxcblwiKSBlbmQgPSB0ZXh0LmluZGV4T2YoXCJcXG5cIiwgZW5kKSAtIDE7XG4vL2NvbnNvbGUuaW5mbyhgc3RhcnQ6ICR7c3RhcnR9IDoke3RleHRbc3RhcnRdfTogICBlbmQ6ICR7ZW5kfSA6ICR7dGV4dFtlbmRdfTpgKTtcblxuXHRcdFx0bGV0IGxpbmVzID0gdGV4dC5zbGljZShzdGFydCwgZW5kKS5zcGxpdChcIlxcblwiKTtcblx0XHRcdC8vIGlmIHNoaWZ0IGtleSBpcyBkb3duLCBSRU1PVkUgYSB0YWIgZnJvbSBlYWNoIGxpbmVcblx0XHRcdGlmIChldmVudC5zaGlmdEtleSkge1xuXHRcdFx0XHRsaW5lcyA9IGxpbmVzLm1hcChsaW5lID0+IGxpbmVbMF0gPT09IFwiXFx0XCIgPyBsaW5lLnN1YnN0cigxKSA6IGxpbmUpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gb3RoZXJ3aXNlIEFERCBhIHRhYiB0byBlYWNoIGxpbmVcblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRsaW5lcyA9IGxpbmVzLm1hcChsaW5lID0+IFwiXFx0XCIgKyBsaW5lKTtcblx0XHRcdH1cblx0XHRcdHNlbGVjdGlvblN0YXJ0ID0gc3RhcnQ7XG5cdFx0XHRuZXdUZXh0ID0gbGluZXMuam9pbihcIlxcblwiKTtcblx0XHRcdHNlbGVjdGlvbkVuZCA9IHNlbGVjdGlvblN0YXJ0ICsgbmV3VGV4dC5sZW5ndGggKyAxO1xuXHRcdH1cblxuXHRcdC8vIFVwZGF0ZSBpbnB1dCB2YWx1ZS5cblx0XHRlbGVtZW50LnZhbHVlIFx0PSB0ZXh0LnN1YnN0cigwLCBzdGFydClcblx0XHRcdFx0XHRcdCsgbmV3VGV4dFxuXHRcdFx0XHRcdFx0KyB0ZXh0LnN1YnN0cihlbmQpO1xuXG5cdFx0Ly8gVXBkYXRlIHRoZSBzZWxlY3Rpb25cblx0XHRlbGVtZW50LnNlbGVjdGlvblN0YXJ0ID0gc2VsZWN0aW9uU3RhcnQ7XG5cdFx0ZWxlbWVudC5zZWxlY3Rpb25FbmQgPSBzZWxlY3Rpb25FbmQ7XG5cblx0XHQvLyBEZWxlZ2F0ZSB0byBgcHJvcHMub25DaGFuZ2VgIHRvIHNhdmUgdGhlIHZhbHVlIG91dHNpZGUgb2YgdGhlIGNvbnRyb2xcblx0XHRpZiAodGhpcy5wcm9wcy5vbkNoYW5nZSkgdGhpcy5wcm9wcy5vbkNoYW5nZShldmVudCk7XG5cdH1cblxufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2FwcC9UYWJiYWJsZVRleHRBcmVhLmpzeCIsIi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIFJlYWN0IFV0aWxpdHkgZnVuY3Rpb25zXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLy8gYGNsYXNzTmFtZXNgLCBjb25jZXB0IHN0b2xlbiBmcm9tOiAgaHR0cDovL2plZHdhdHNvbi5naXRodWIuaW8vY2xhc3NuYW1lc1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzTmFtZXMgKC4uLmFyZ3MpIHtcbiAgcmV0dXJuIGFyZ3MubWFwKCBhcmcgPT4ge1xuICAgIGlmICghYXJnKSByZXR1cm4gXCJcIjtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhcmcpKSByZXR1cm4gY2xhc3NOYW1lcyguLi5hcmcpO1xuICAgIHN3aXRjaCAodHlwZW9mIGFyZykge1xuICAgICAgY2FzZSBcIm51bWJlclwiOlxuICAgICAgY2FzZSBcInN0cmluZ1wiOiAgcmV0dXJuIGFyZztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhhcmcpLm1hcCgga2V5ID0+IGFyZ1trZXldID8ga2V5IDogXCJcIilcbiAgICAgICAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgICAgICAgICAgLmpvaW4oXCIgXCIpO1xuICAgIH1cbiAgfSkuZmlsdGVyKEJvb2xlYW4pXG4gICAgLmpvaW4oXCIgXCIpO1xufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvYXBwL3V0aWwuanMiLCIvLyBNZW1vaXplL2ZvcmdldCBzZW1hbnRpY3MuXG5cbi8vIFJldHVybiBhIG1lbW9pemluZyBnZXR0ZXIgZnVuY3Rpb24uXG4vLyBURVNUTUVcbmV4cG9ydCBmdW5jdGlvbiBtZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKSB7XG5cdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRpZiAodGhpc1twcm9wZXJ0eV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dmFyIHZhbHVlID0gZ2V0dGVyLmFwcGx5KHRoaXMpO1xuXHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Ly8gRGVmaW5lIHNvIHRoYXQgd2UgY2FuIGJlIGRlbGV0ZWQgYW5kIHJlLWRlZmluZWQsIGJ1dCBub3Qgc2V0IG9yIGVudW1lcmF0ZWQuXG5cdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBwcm9wZXJ0eSwgeyB2YWx1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdGhpc1twcm9wZXJ0eV07XG5cdH1cbn1cblxuXG4vLyBSZXR1cm4gYSBtZW1vaXplIGZ1bmN0aW9uIGZvciB1c2UgYXMgYSBnZXR0ZXIgaW4gYSBgT2JqZWN0LmRlZmluZVByb3BlcnR5KClgXG4vLyBURVNUTUVcbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVNZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKSB7XG5cdHJldHVybiB7XG5cdFx0Z2V0IDogbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcilcblx0fVxufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL21lbW9pemUuanMiLCIvLyBNYWtlIHN1cmUgYGdsb2JhbGAgaXMgZGVmaW5lZCBnbG9iYWxseTpcbi8vXHQtIGVpdGhlciBhcyB0aGUgbm9kZWpzIGBnbG9iYWxgLCBvclxuLy9cdC0gYXMgYW4gYWxpYXMgZm9yIGB3aW5kb3dgIGluIGJyb3dzZXJzLCBvclxuLy9cdC0gZm9yIHRoZSBgc2VsZmAgY29udGV4dCBpbiB3ZWIgd29ya2Vycy5cbi8vXG4vLyBOT1RFOiB0aGlzIG1vZGlmaWVzIHRoZSBcImdsb2JhbFwiIGVudmlyb25tZW50IGJ5IG1ha2luZyBzdXJlIFwiZ2xvYmFsXCIgaXMgc2V0LiFcbi8vXG5cbmxldCBnbG9iYWxfaWRlbnRpZmllcjtcbmlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4vL1x0Y29uc29sZS5sb2coXCJSdW5uaW5nIGluIG5vZGVcIik7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gZ2xvYmFsO1xufVxuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuLy9cdGNvbnNvbGUubG9nKFwiUnVubmluZyBpbiBhIHdlYiBicm93c2VyXCIpO1xuXHR3aW5kb3cuZ2xvYmFsID0gd2luZG93O1xuXHRnbG9iYWxfaWRlbnRpZmllciA9IHdpbmRvdztcbn1cblxuaWYgKHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiKSB7XG4vL1x0Y29uc29sZS5sb2coXCJSdW5uaW5nIGluIGEgd2ViIHdvcmtlclwiKTtcblx0c2VsZi5nbG9iYWwgPSBzZWxmO1xuXHRnbG9iYWxfaWRlbnRpZmllciA9IHNlbGY7XG59XG5cbi8vIEV4cG9ydCBmb3IgY29uc3VtcHRpb24gYnkgaW1wb3J0LlxuZXhwb3J0IGRlZmF1bHQgZ2xvYmFsX2lkZW50aWZpZXI7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy91dGlscy9nbG9iYWwuanMiLCJleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvbGliL2Nzcy1iYXNlLmpzXCIpKHVuZGVmaW5lZCk7XG4vLyBpbXBvcnRzXG5cblxuLy8gbW9kdWxlXG5leHBvcnRzLnB1c2goW21vZHVsZS5pZCwgXCIub2FrLnNwYWNlciB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICBkaXNwbGF5OiBibG9jaztcXG59XFxuLm9hay5zcGFjZXIuaW5saW5lIHtcXG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gIHZlcnRpY2FsLWFsaWduOiBiYXNlbGluZTtcXG59XFxuLm9hay5zcGFjZXIuZmx1aWQge1xcbiAgd2lkdGg6IDEwMCU7XFxuICBmbGV4OiAxIDEgMTAwJTtcXG59XFxuLm9hay5zcGFjZXIudGlueSB7XFxuICB3aWR0aDogMnB4O1xcbiAgaGVpZ2h0OiAycHg7XFxufVxcbi5vYWsuc3BhY2VyLnNtYWxsIHtcXG4gIHdpZHRoOiA0cHg7XFxuICBoZWlnaHQ6IDRweDtcXG59XFxuLm9hay5zcGFjZXIubWVkaXVtIHtcXG4gIHdpZHRoOiAxMHB4O1xcbiAgaGVpZ2h0OiAxMHB4O1xcbn1cXG4ub2FrLnNwYWNlci5sYXJnZSB7XFxuICB3aWR0aDogMjBweDtcXG4gIGhlaWdodDogMjBweDtcXG59XFxuLm9hay5zcGFjZXIuaHVnZSB7XFxuICB3aWR0aDogMzBweDtcXG4gIGhlaWdodDogMzBweDtcXG59XFxuLm9hay5zcGFjZXIubWFzc2l2ZSB7XFxuICB3aWR0aDogNTBweDtcXG4gIGhlaWdodDogNTBweDtcXG59XFxuXCIsIFwiXCJdKTtcblxuLy8gZXhwb3J0c1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L2Nzcy1sb2FkZXIhLi9+L2xlc3MtbG9hZGVyL2Rpc3QhLi9zcmMvYXBwL1NwYWNlci5sZXNzXG4vLyBtb2R1bGUgaWQgPSA0NjNcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2xpYi9jc3MtYmFzZS5qc1wiKSh1bmRlZmluZWQpO1xuLy8gaW1wb3J0c1xuXG5cbi8vIG1vZHVsZVxuZXhwb3J0cy5wdXNoKFttb2R1bGUuaWQsIFwiLmZ1bGxXaWR0aCB7XFxuICB3aWR0aDogMTAwJTtcXG59XFxuLmZ1bGxIZWlnaHQge1xcbiAgaGVpZ2h0OiAxMDAlO1xcbn1cXG4uZnVsbFNpemUge1xcbiAgd2lkdGg6IDEwMCU7XFxuICBoZWlnaHQ6IDEwMCU7XFxufVxcblwiLCBcIlwiXSk7XG5cbi8vIGV4cG9ydHNcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9jc3MtbG9hZGVyIS4vfi9sZXNzLWxvYWRlci9kaXN0IS4vc3JjL2FwcC9zdHlsZXMubGVzc1xuLy8gbW9kdWxlIGlkID0gNDY0XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgdmFyIGludmFyaWFudCA9IHJlcXVpcmUoJ2ZianMvbGliL2ludmFyaWFudCcpO1xuICB2YXIgd2FybmluZyA9IHJlcXVpcmUoJ2ZianMvbGliL3dhcm5pbmcnKTtcbiAgdmFyIFJlYWN0UHJvcFR5cGVzU2VjcmV0ID0gcmVxdWlyZSgnLi9saWIvUmVhY3RQcm9wVHlwZXNTZWNyZXQnKTtcbiAgdmFyIGxvZ2dlZFR5cGVGYWlsdXJlcyA9IHt9O1xufVxuXG4vKipcbiAqIEFzc2VydCB0aGF0IHRoZSB2YWx1ZXMgbWF0Y2ggd2l0aCB0aGUgdHlwZSBzcGVjcy5cbiAqIEVycm9yIG1lc3NhZ2VzIGFyZSBtZW1vcml6ZWQgYW5kIHdpbGwgb25seSBiZSBzaG93biBvbmNlLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSB0eXBlU3BlY3MgTWFwIG9mIG5hbWUgdG8gYSBSZWFjdFByb3BUeXBlXG4gKiBAcGFyYW0ge29iamVjdH0gdmFsdWVzIFJ1bnRpbWUgdmFsdWVzIHRoYXQgbmVlZCB0byBiZSB0eXBlLWNoZWNrZWRcbiAqIEBwYXJhbSB7c3RyaW5nfSBsb2NhdGlvbiBlLmcuIFwicHJvcFwiLCBcImNvbnRleHRcIiwgXCJjaGlsZCBjb250ZXh0XCJcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb21wb25lbnROYW1lIE5hbWUgb2YgdGhlIGNvbXBvbmVudCBmb3IgZXJyb3IgbWVzc2FnZXMuXG4gKiBAcGFyYW0gez9GdW5jdGlvbn0gZ2V0U3RhY2sgUmV0dXJucyB0aGUgY29tcG9uZW50IHN0YWNrLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gY2hlY2tQcm9wVHlwZXModHlwZVNwZWNzLCB2YWx1ZXMsIGxvY2F0aW9uLCBjb21wb25lbnROYW1lLCBnZXRTdGFjaykge1xuICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAgIGZvciAodmFyIHR5cGVTcGVjTmFtZSBpbiB0eXBlU3BlY3MpIHtcbiAgICAgIGlmICh0eXBlU3BlY3MuaGFzT3duUHJvcGVydHkodHlwZVNwZWNOYW1lKSkge1xuICAgICAgICB2YXIgZXJyb3I7XG4gICAgICAgIC8vIFByb3AgdHlwZSB2YWxpZGF0aW9uIG1heSB0aHJvdy4gSW4gY2FzZSB0aGV5IGRvLCB3ZSBkb24ndCB3YW50IHRvXG4gICAgICAgIC8vIGZhaWwgdGhlIHJlbmRlciBwaGFzZSB3aGVyZSBpdCBkaWRuJ3QgZmFpbCBiZWZvcmUuIFNvIHdlIGxvZyBpdC5cbiAgICAgICAgLy8gQWZ0ZXIgdGhlc2UgaGF2ZSBiZWVuIGNsZWFuZWQgdXAsIHdlJ2xsIGxldCB0aGVtIHRocm93LlxuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIFRoaXMgaXMgaW50ZW50aW9uYWxseSBhbiBpbnZhcmlhbnQgdGhhdCBnZXRzIGNhdWdodC4gSXQncyB0aGUgc2FtZVxuICAgICAgICAgIC8vIGJlaGF2aW9yIGFzIHdpdGhvdXQgdGhpcyBzdGF0ZW1lbnQgZXhjZXB0IHdpdGggYSBiZXR0ZXIgbWVzc2FnZS5cbiAgICAgICAgICBpbnZhcmlhbnQodHlwZW9mIHR5cGVTcGVjc1t0eXBlU3BlY05hbWVdID09PSAnZnVuY3Rpb24nLCAnJXM6ICVzIHR5cGUgYCVzYCBpcyBpbnZhbGlkOyBpdCBtdXN0IGJlIGEgZnVuY3Rpb24sIHVzdWFsbHkgZnJvbSAnICsgJ1JlYWN0LlByb3BUeXBlcy4nLCBjb21wb25lbnROYW1lIHx8ICdSZWFjdCBjbGFzcycsIGxvY2F0aW9uLCB0eXBlU3BlY05hbWUpO1xuICAgICAgICAgIGVycm9yID0gdHlwZVNwZWNzW3R5cGVTcGVjTmFtZV0odmFsdWVzLCB0eXBlU3BlY05hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBudWxsLCBSZWFjdFByb3BUeXBlc1NlY3JldCk7XG4gICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgZXJyb3IgPSBleDtcbiAgICAgICAgfVxuICAgICAgICB3YXJuaW5nKCFlcnJvciB8fCBlcnJvciBpbnN0YW5jZW9mIEVycm9yLCAnJXM6IHR5cGUgc3BlY2lmaWNhdGlvbiBvZiAlcyBgJXNgIGlzIGludmFsaWQ7IHRoZSB0eXBlIGNoZWNrZXIgJyArICdmdW5jdGlvbiBtdXN0IHJldHVybiBgbnVsbGAgb3IgYW4gYEVycm9yYCBidXQgcmV0dXJuZWQgYSAlcy4gJyArICdZb3UgbWF5IGhhdmUgZm9yZ290dGVuIHRvIHBhc3MgYW4gYXJndW1lbnQgdG8gdGhlIHR5cGUgY2hlY2tlciAnICsgJ2NyZWF0b3IgKGFycmF5T2YsIGluc3RhbmNlT2YsIG9iamVjdE9mLCBvbmVPZiwgb25lT2ZUeXBlLCBhbmQgJyArICdzaGFwZSBhbGwgcmVxdWlyZSBhbiBhcmd1bWVudCkuJywgY29tcG9uZW50TmFtZSB8fCAnUmVhY3QgY2xhc3MnLCBsb2NhdGlvbiwgdHlwZVNwZWNOYW1lLCB0eXBlb2YgZXJyb3IpO1xuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiAhKGVycm9yLm1lc3NhZ2UgaW4gbG9nZ2VkVHlwZUZhaWx1cmVzKSkge1xuICAgICAgICAgIC8vIE9ubHkgbW9uaXRvciB0aGlzIGZhaWx1cmUgb25jZSBiZWNhdXNlIHRoZXJlIHRlbmRzIHRvIGJlIGEgbG90IG9mIHRoZVxuICAgICAgICAgIC8vIHNhbWUgZXJyb3IuXG4gICAgICAgICAgbG9nZ2VkVHlwZUZhaWx1cmVzW2Vycm9yLm1lc3NhZ2VdID0gdHJ1ZTtcblxuICAgICAgICAgIHZhciBzdGFjayA9IGdldFN0YWNrID8gZ2V0U3RhY2soKSA6ICcnO1xuXG4gICAgICAgICAgd2FybmluZyhmYWxzZSwgJ0ZhaWxlZCAlcyB0eXBlOiAlcyVzJywgbG9jYXRpb24sIGVycm9yLm1lc3NhZ2UsIHN0YWNrICE9IG51bGwgPyBzdGFjayA6ICcnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNoZWNrUHJvcFR5cGVzO1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3Byb3AtdHlwZXMvY2hlY2tQcm9wVHlwZXMuanNcbi8vIG1vZHVsZSBpZCA9IDQ2NVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIENvcHlyaWdodCAyMDEzLXByZXNlbnQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlbXB0eUZ1bmN0aW9uID0gcmVxdWlyZSgnZmJqcy9saWIvZW1wdHlGdW5jdGlvbicpO1xudmFyIGludmFyaWFudCA9IHJlcXVpcmUoJ2ZianMvbGliL2ludmFyaWFudCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAvLyBJbXBvcnRhbnQhXG4gIC8vIEtlZXAgdGhpcyBsaXN0IGluIHN5bmMgd2l0aCBwcm9kdWN0aW9uIHZlcnNpb24gaW4gYC4vZmFjdG9yeVdpdGhUeXBlQ2hlY2tlcnMuanNgLlxuICBmdW5jdGlvbiBzaGltKCkge1xuICAgIGludmFyaWFudChcbiAgICAgIGZhbHNlLFxuICAgICAgJ0NhbGxpbmcgUHJvcFR5cGVzIHZhbGlkYXRvcnMgZGlyZWN0bHkgaXMgbm90IHN1cHBvcnRlZCBieSB0aGUgYHByb3AtdHlwZXNgIHBhY2thZ2UuICcgK1xuICAgICAgJ1VzZSBQcm9wVHlwZXMuY2hlY2tQcm9wVHlwZXMoKSB0byBjYWxsIHRoZW0uICcgK1xuICAgICAgJ1JlYWQgbW9yZSBhdCBodHRwOi8vZmIubWUvdXNlLWNoZWNrLXByb3AtdHlwZXMnXG4gICAgKTtcbiAgfTtcbiAgc2hpbS5pc1JlcXVpcmVkID0gc2hpbTtcbiAgZnVuY3Rpb24gZ2V0U2hpbSgpIHtcbiAgICByZXR1cm4gc2hpbTtcbiAgfTtcbiAgdmFyIFJlYWN0UHJvcFR5cGVzID0ge1xuICAgIGFycmF5OiBzaGltLFxuICAgIGJvb2w6IHNoaW0sXG4gICAgZnVuYzogc2hpbSxcbiAgICBudW1iZXI6IHNoaW0sXG4gICAgb2JqZWN0OiBzaGltLFxuICAgIHN0cmluZzogc2hpbSxcbiAgICBzeW1ib2w6IHNoaW0sXG5cbiAgICBhbnk6IHNoaW0sXG4gICAgYXJyYXlPZjogZ2V0U2hpbSxcbiAgICBlbGVtZW50OiBzaGltLFxuICAgIGluc3RhbmNlT2Y6IGdldFNoaW0sXG4gICAgbm9kZTogc2hpbSxcbiAgICBvYmplY3RPZjogZ2V0U2hpbSxcbiAgICBvbmVPZjogZ2V0U2hpbSxcbiAgICBvbmVPZlR5cGU6IGdldFNoaW0sXG4gICAgc2hhcGU6IGdldFNoaW1cbiAgfTtcblxuICBSZWFjdFByb3BUeXBlcy5jaGVja1Byb3BUeXBlcyA9IGVtcHR5RnVuY3Rpb247XG4gIFJlYWN0UHJvcFR5cGVzLlByb3BUeXBlcyA9IFJlYWN0UHJvcFR5cGVzO1xuXG4gIHJldHVybiBSZWFjdFByb3BUeXBlcztcbn07XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9mYWN0b3J5V2l0aFRocm93aW5nU2hpbXMuanNcbi8vIG1vZHVsZSBpZCA9IDQ2NlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIENvcHlyaWdodCAyMDEzLXByZXNlbnQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlbXB0eUZ1bmN0aW9uID0gcmVxdWlyZSgnZmJqcy9saWIvZW1wdHlGdW5jdGlvbicpO1xudmFyIGludmFyaWFudCA9IHJlcXVpcmUoJ2ZianMvbGliL2ludmFyaWFudCcpO1xudmFyIHdhcm5pbmcgPSByZXF1aXJlKCdmYmpzL2xpYi93YXJuaW5nJyk7XG5cbnZhciBSZWFjdFByb3BUeXBlc1NlY3JldCA9IHJlcXVpcmUoJy4vbGliL1JlYWN0UHJvcFR5cGVzU2VjcmV0Jyk7XG52YXIgY2hlY2tQcm9wVHlwZXMgPSByZXF1aXJlKCcuL2NoZWNrUHJvcFR5cGVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaXNWYWxpZEVsZW1lbnQsIHRocm93T25EaXJlY3RBY2Nlc3MpIHtcbiAgLyogZ2xvYmFsIFN5bWJvbCAqL1xuICB2YXIgSVRFUkFUT1JfU1lNQk9MID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiBTeW1ib2wuaXRlcmF0b3I7XG4gIHZhciBGQVVYX0lURVJBVE9SX1NZTUJPTCA9ICdAQGl0ZXJhdG9yJzsgLy8gQmVmb3JlIFN5bWJvbCBzcGVjLlxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBpdGVyYXRvciBtZXRob2QgZnVuY3Rpb24gY29udGFpbmVkIG9uIHRoZSBpdGVyYWJsZSBvYmplY3QuXG4gICAqXG4gICAqIEJlIHN1cmUgdG8gaW52b2tlIHRoZSBmdW5jdGlvbiB3aXRoIHRoZSBpdGVyYWJsZSBhcyBjb250ZXh0OlxuICAgKlxuICAgKiAgICAgdmFyIGl0ZXJhdG9yRm4gPSBnZXRJdGVyYXRvckZuKG15SXRlcmFibGUpO1xuICAgKiAgICAgaWYgKGl0ZXJhdG9yRm4pIHtcbiAgICogICAgICAgdmFyIGl0ZXJhdG9yID0gaXRlcmF0b3JGbi5jYWxsKG15SXRlcmFibGUpO1xuICAgKiAgICAgICAuLi5cbiAgICogICAgIH1cbiAgICpcbiAgICogQHBhcmFtIHs/b2JqZWN0fSBtYXliZUl0ZXJhYmxlXG4gICAqIEByZXR1cm4gez9mdW5jdGlvbn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldEl0ZXJhdG9yRm4obWF5YmVJdGVyYWJsZSkge1xuICAgIHZhciBpdGVyYXRvckZuID0gbWF5YmVJdGVyYWJsZSAmJiAoSVRFUkFUT1JfU1lNQk9MICYmIG1heWJlSXRlcmFibGVbSVRFUkFUT1JfU1lNQk9MXSB8fCBtYXliZUl0ZXJhYmxlW0ZBVVhfSVRFUkFUT1JfU1lNQk9MXSk7XG4gICAgaWYgKHR5cGVvZiBpdGVyYXRvckZuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gaXRlcmF0b3JGbjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29sbGVjdGlvbiBvZiBtZXRob2RzIHRoYXQgYWxsb3cgZGVjbGFyYXRpb24gYW5kIHZhbGlkYXRpb24gb2YgcHJvcHMgdGhhdCBhcmVcbiAgICogc3VwcGxpZWQgdG8gUmVhY3QgY29tcG9uZW50cy4gRXhhbXBsZSB1c2FnZTpcbiAgICpcbiAgICogICB2YXIgUHJvcHMgPSByZXF1aXJlKCdSZWFjdFByb3BUeXBlcycpO1xuICAgKiAgIHZhciBNeUFydGljbGUgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG4gICAqICAgICBwcm9wVHlwZXM6IHtcbiAgICogICAgICAgLy8gQW4gb3B0aW9uYWwgc3RyaW5nIHByb3AgbmFtZWQgXCJkZXNjcmlwdGlvblwiLlxuICAgKiAgICAgICBkZXNjcmlwdGlvbjogUHJvcHMuc3RyaW5nLFxuICAgKlxuICAgKiAgICAgICAvLyBBIHJlcXVpcmVkIGVudW0gcHJvcCBuYW1lZCBcImNhdGVnb3J5XCIuXG4gICAqICAgICAgIGNhdGVnb3J5OiBQcm9wcy5vbmVPZihbJ05ld3MnLCdQaG90b3MnXSkuaXNSZXF1aXJlZCxcbiAgICpcbiAgICogICAgICAgLy8gQSBwcm9wIG5hbWVkIFwiZGlhbG9nXCIgdGhhdCByZXF1aXJlcyBhbiBpbnN0YW5jZSBvZiBEaWFsb2cuXG4gICAqICAgICAgIGRpYWxvZzogUHJvcHMuaW5zdGFuY2VPZihEaWFsb2cpLmlzUmVxdWlyZWRcbiAgICogICAgIH0sXG4gICAqICAgICByZW5kZXI6IGZ1bmN0aW9uKCkgeyAuLi4gfVxuICAgKiAgIH0pO1xuICAgKlxuICAgKiBBIG1vcmUgZm9ybWFsIHNwZWNpZmljYXRpb24gb2YgaG93IHRoZXNlIG1ldGhvZHMgYXJlIHVzZWQ6XG4gICAqXG4gICAqICAgdHlwZSA6PSBhcnJheXxib29sfGZ1bmN8b2JqZWN0fG51bWJlcnxzdHJpbmd8b25lT2YoWy4uLl0pfGluc3RhbmNlT2YoLi4uKVxuICAgKiAgIGRlY2wgOj0gUmVhY3RQcm9wVHlwZXMue3R5cGV9KC5pc1JlcXVpcmVkKT9cbiAgICpcbiAgICogRWFjaCBhbmQgZXZlcnkgZGVjbGFyYXRpb24gcHJvZHVjZXMgYSBmdW5jdGlvbiB3aXRoIHRoZSBzYW1lIHNpZ25hdHVyZS4gVGhpc1xuICAgKiBhbGxvd3MgdGhlIGNyZWF0aW9uIG9mIGN1c3RvbSB2YWxpZGF0aW9uIGZ1bmN0aW9ucy4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqICB2YXIgTXlMaW5rID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuICAgKiAgICBwcm9wVHlwZXM6IHtcbiAgICogICAgICAvLyBBbiBvcHRpb25hbCBzdHJpbmcgb3IgVVJJIHByb3AgbmFtZWQgXCJocmVmXCIuXG4gICAqICAgICAgaHJlZjogZnVuY3Rpb24ocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lKSB7XG4gICAqICAgICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdO1xuICAgKiAgICAgICAgaWYgKHByb3BWYWx1ZSAhPSBudWxsICYmIHR5cGVvZiBwcm9wVmFsdWUgIT09ICdzdHJpbmcnICYmXG4gICAqICAgICAgICAgICAgIShwcm9wVmFsdWUgaW5zdGFuY2VvZiBVUkkpKSB7XG4gICAqICAgICAgICAgIHJldHVybiBuZXcgRXJyb3IoXG4gICAqICAgICAgICAgICAgJ0V4cGVjdGVkIGEgc3RyaW5nIG9yIGFuIFVSSSBmb3IgJyArIHByb3BOYW1lICsgJyBpbiAnICtcbiAgICogICAgICAgICAgICBjb21wb25lbnROYW1lXG4gICAqICAgICAgICAgICk7XG4gICAqICAgICAgICB9XG4gICAqICAgICAgfVxuICAgKiAgICB9LFxuICAgKiAgICByZW5kZXI6IGZ1bmN0aW9uKCkgey4uLn1cbiAgICogIH0pO1xuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG5cbiAgdmFyIEFOT05ZTU9VUyA9ICc8PGFub255bW91cz4+JztcblxuICAvLyBJbXBvcnRhbnQhXG4gIC8vIEtlZXAgdGhpcyBsaXN0IGluIHN5bmMgd2l0aCBwcm9kdWN0aW9uIHZlcnNpb24gaW4gYC4vZmFjdG9yeVdpdGhUaHJvd2luZ1NoaW1zLmpzYC5cbiAgdmFyIFJlYWN0UHJvcFR5cGVzID0ge1xuICAgIGFycmF5OiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignYXJyYXknKSxcbiAgICBib29sOiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignYm9vbGVhbicpLFxuICAgIGZ1bmM6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdmdW5jdGlvbicpLFxuICAgIG51bWJlcjogY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXIoJ251bWJlcicpLFxuICAgIG9iamVjdDogY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXIoJ29iamVjdCcpLFxuICAgIHN0cmluZzogY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXIoJ3N0cmluZycpLFxuICAgIHN5bWJvbDogY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXIoJ3N5bWJvbCcpLFxuXG4gICAgYW55OiBjcmVhdGVBbnlUeXBlQ2hlY2tlcigpLFxuICAgIGFycmF5T2Y6IGNyZWF0ZUFycmF5T2ZUeXBlQ2hlY2tlcixcbiAgICBlbGVtZW50OiBjcmVhdGVFbGVtZW50VHlwZUNoZWNrZXIoKSxcbiAgICBpbnN0YW5jZU9mOiBjcmVhdGVJbnN0YW5jZVR5cGVDaGVja2VyLFxuICAgIG5vZGU6IGNyZWF0ZU5vZGVDaGVja2VyKCksXG4gICAgb2JqZWN0T2Y6IGNyZWF0ZU9iamVjdE9mVHlwZUNoZWNrZXIsXG4gICAgb25lT2Y6IGNyZWF0ZUVudW1UeXBlQ2hlY2tlcixcbiAgICBvbmVPZlR5cGU6IGNyZWF0ZVVuaW9uVHlwZUNoZWNrZXIsXG4gICAgc2hhcGU6IGNyZWF0ZVNoYXBlVHlwZUNoZWNrZXJcbiAgfTtcblxuICAvKipcbiAgICogaW5saW5lZCBPYmplY3QuaXMgcG9seWZpbGwgdG8gYXZvaWQgcmVxdWlyaW5nIGNvbnN1bWVycyBzaGlwIHRoZWlyIG93blxuICAgKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9PYmplY3QvaXNcbiAgICovXG4gIC8qZXNsaW50LWRpc2FibGUgbm8tc2VsZi1jb21wYXJlKi9cbiAgZnVuY3Rpb24gaXMoeCwgeSkge1xuICAgIC8vIFNhbWVWYWx1ZSBhbGdvcml0aG1cbiAgICBpZiAoeCA9PT0geSkge1xuICAgICAgLy8gU3RlcHMgMS01LCA3LTEwXG4gICAgICAvLyBTdGVwcyA2LmItNi5lOiArMCAhPSAtMFxuICAgICAgcmV0dXJuIHggIT09IDAgfHwgMSAvIHggPT09IDEgLyB5O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTdGVwIDYuYTogTmFOID09IE5hTlxuICAgICAgcmV0dXJuIHggIT09IHggJiYgeSAhPT0geTtcbiAgICB9XG4gIH1cbiAgLyplc2xpbnQtZW5hYmxlIG5vLXNlbGYtY29tcGFyZSovXG5cbiAgLyoqXG4gICAqIFdlIHVzZSBhbiBFcnJvci1saWtlIG9iamVjdCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSBhcyBwZW9wbGUgbWF5IGNhbGxcbiAgICogUHJvcFR5cGVzIGRpcmVjdGx5IGFuZCBpbnNwZWN0IHRoZWlyIG91dHB1dC4gSG93ZXZlciwgd2UgZG9uJ3QgdXNlIHJlYWxcbiAgICogRXJyb3JzIGFueW1vcmUuIFdlIGRvbid0IGluc3BlY3QgdGhlaXIgc3RhY2sgYW55d2F5LCBhbmQgY3JlYXRpbmcgdGhlbVxuICAgKiBpcyBwcm9oaWJpdGl2ZWx5IGV4cGVuc2l2ZSBpZiB0aGV5IGFyZSBjcmVhdGVkIHRvbyBvZnRlbiwgc3VjaCBhcyB3aGF0XG4gICAqIGhhcHBlbnMgaW4gb25lT2ZUeXBlKCkgZm9yIGFueSB0eXBlIGJlZm9yZSB0aGUgb25lIHRoYXQgbWF0Y2hlZC5cbiAgICovXG4gIGZ1bmN0aW9uIFByb3BUeXBlRXJyb3IobWVzc2FnZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgdGhpcy5zdGFjayA9ICcnO1xuICB9XG4gIC8vIE1ha2UgYGluc3RhbmNlb2YgRXJyb3JgIHN0aWxsIHdvcmsgZm9yIHJldHVybmVkIGVycm9ycy5cbiAgUHJvcFR5cGVFcnJvci5wcm90b3R5cGUgPSBFcnJvci5wcm90b3R5cGU7XG5cbiAgZnVuY3Rpb24gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpIHtcbiAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAgICAgdmFyIG1hbnVhbFByb3BUeXBlQ2FsbENhY2hlID0ge307XG4gICAgICB2YXIgbWFudWFsUHJvcFR5cGVXYXJuaW5nQ291bnQgPSAwO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjaGVja1R5cGUoaXNSZXF1aXJlZCwgcHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lLCBzZWNyZXQpIHtcbiAgICAgIGNvbXBvbmVudE5hbWUgPSBjb21wb25lbnROYW1lIHx8IEFOT05ZTU9VUztcbiAgICAgIHByb3BGdWxsTmFtZSA9IHByb3BGdWxsTmFtZSB8fCBwcm9wTmFtZTtcblxuICAgICAgaWYgKHNlY3JldCAhPT0gUmVhY3RQcm9wVHlwZXNTZWNyZXQpIHtcbiAgICAgICAgaWYgKHRocm93T25EaXJlY3RBY2Nlc3MpIHtcbiAgICAgICAgICAvLyBOZXcgYmVoYXZpb3Igb25seSBmb3IgdXNlcnMgb2YgYHByb3AtdHlwZXNgIHBhY2thZ2VcbiAgICAgICAgICBpbnZhcmlhbnQoXG4gICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICdDYWxsaW5nIFByb3BUeXBlcyB2YWxpZGF0b3JzIGRpcmVjdGx5IGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIGBwcm9wLXR5cGVzYCBwYWNrYWdlLiAnICtcbiAgICAgICAgICAgICdVc2UgYFByb3BUeXBlcy5jaGVja1Byb3BUeXBlcygpYCB0byBjYWxsIHRoZW0uICcgK1xuICAgICAgICAgICAgJ1JlYWQgbW9yZSBhdCBodHRwOi8vZmIubWUvdXNlLWNoZWNrLXByb3AtdHlwZXMnXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIC8vIE9sZCBiZWhhdmlvciBmb3IgcGVvcGxlIHVzaW5nIFJlYWN0LlByb3BUeXBlc1xuICAgICAgICAgIHZhciBjYWNoZUtleSA9IGNvbXBvbmVudE5hbWUgKyAnOicgKyBwcm9wTmFtZTtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhbWFudWFsUHJvcFR5cGVDYWxsQ2FjaGVbY2FjaGVLZXldICYmXG4gICAgICAgICAgICAvLyBBdm9pZCBzcGFtbWluZyB0aGUgY29uc29sZSBiZWNhdXNlIHRoZXkgYXJlIG9mdGVuIG5vdCBhY3Rpb25hYmxlIGV4Y2VwdCBmb3IgbGliIGF1dGhvcnNcbiAgICAgICAgICAgIG1hbnVhbFByb3BUeXBlV2FybmluZ0NvdW50IDwgM1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgd2FybmluZyhcbiAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICdZb3UgYXJlIG1hbnVhbGx5IGNhbGxpbmcgYSBSZWFjdC5Qcm9wVHlwZXMgdmFsaWRhdGlvbiAnICtcbiAgICAgICAgICAgICAgJ2Z1bmN0aW9uIGZvciB0aGUgYCVzYCBwcm9wIG9uIGAlc2AuIFRoaXMgaXMgZGVwcmVjYXRlZCAnICtcbiAgICAgICAgICAgICAgJ2FuZCB3aWxsIHRocm93IGluIHRoZSBzdGFuZGFsb25lIGBwcm9wLXR5cGVzYCBwYWNrYWdlLiAnICtcbiAgICAgICAgICAgICAgJ1lvdSBtYXkgYmUgc2VlaW5nIHRoaXMgd2FybmluZyBkdWUgdG8gYSB0aGlyZC1wYXJ0eSBQcm9wVHlwZXMgJyArXG4gICAgICAgICAgICAgICdsaWJyYXJ5LiBTZWUgaHR0cHM6Ly9mYi5tZS9yZWFjdC13YXJuaW5nLWRvbnQtY2FsbC1wcm9wdHlwZXMgJyArICdmb3IgZGV0YWlscy4nLFxuICAgICAgICAgICAgICBwcm9wRnVsbE5hbWUsXG4gICAgICAgICAgICAgIGNvbXBvbmVudE5hbWVcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBtYW51YWxQcm9wVHlwZUNhbGxDYWNoZVtjYWNoZUtleV0gPSB0cnVlO1xuICAgICAgICAgICAgbWFudWFsUHJvcFR5cGVXYXJuaW5nQ291bnQrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChwcm9wc1twcm9wTmFtZV0gPT0gbnVsbCkge1xuICAgICAgICBpZiAoaXNSZXF1aXJlZCkge1xuICAgICAgICAgIGlmIChwcm9wc1twcm9wTmFtZV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignVGhlICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBpcyBtYXJrZWQgYXMgcmVxdWlyZWQgJyArICgnaW4gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGJ1dCBpdHMgdmFsdWUgaXMgYG51bGxgLicpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdUaGUgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIGlzIG1hcmtlZCBhcyByZXF1aXJlZCBpbiAnICsgKCdgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgYnV0IGl0cyB2YWx1ZSBpcyBgdW5kZWZpbmVkYC4nKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY2hhaW5lZENoZWNrVHlwZSA9IGNoZWNrVHlwZS5iaW5kKG51bGwsIGZhbHNlKTtcbiAgICBjaGFpbmVkQ2hlY2tUeXBlLmlzUmVxdWlyZWQgPSBjaGVja1R5cGUuYmluZChudWxsLCB0cnVlKTtcblxuICAgIHJldHVybiBjaGFpbmVkQ2hlY2tUeXBlO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXIoZXhwZWN0ZWRUeXBlKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lLCBzZWNyZXQpIHtcbiAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgICB2YXIgcHJvcFR5cGUgPSBnZXRQcm9wVHlwZShwcm9wVmFsdWUpO1xuICAgICAgaWYgKHByb3BUeXBlICE9PSBleHBlY3RlZFR5cGUpIHtcbiAgICAgICAgLy8gYHByb3BWYWx1ZWAgYmVpbmcgaW5zdGFuY2Ugb2YsIHNheSwgZGF0ZS9yZWdleHAsIHBhc3MgdGhlICdvYmplY3QnXG4gICAgICAgIC8vIGNoZWNrLCBidXQgd2UgY2FuIG9mZmVyIGEgbW9yZSBwcmVjaXNlIGVycm9yIG1lc3NhZ2UgaGVyZSByYXRoZXIgdGhhblxuICAgICAgICAvLyAnb2YgdHlwZSBgb2JqZWN0YCcuXG4gICAgICAgIHZhciBwcmVjaXNlVHlwZSA9IGdldFByZWNpc2VUeXBlKHByb3BWYWx1ZSk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiB0eXBlICcgKyAoJ2AnICsgcHJlY2lzZVR5cGUgKyAnYCBzdXBwbGllZCB0byBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgJykgKyAoJ2AnICsgZXhwZWN0ZWRUeXBlICsgJ2AuJykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVBbnlUeXBlQ2hlY2tlcigpIHtcbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIoZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc051bGwpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlQXJyYXlPZlR5cGVDaGVja2VyKHR5cGVDaGVja2VyKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICBpZiAodHlwZW9mIHR5cGVDaGVja2VyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignUHJvcGVydHkgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiBjb21wb25lbnQgYCcgKyBjb21wb25lbnROYW1lICsgJ2AgaGFzIGludmFsaWQgUHJvcFR5cGUgbm90YXRpb24gaW5zaWRlIGFycmF5T2YuJyk7XG4gICAgICB9XG4gICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdO1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHByb3BWYWx1ZSkpIHtcbiAgICAgICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiB0eXBlICcgKyAoJ2AnICsgcHJvcFR5cGUgKyAnYCBzdXBwbGllZCB0byBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgYW4gYXJyYXkuJykpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wVmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGVycm9yID0gdHlwZUNoZWNrZXIocHJvcFZhbHVlLCBpLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lICsgJ1snICsgaSArICddJywgUmVhY3RQcm9wVHlwZXNTZWNyZXQpO1xuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVFbGVtZW50VHlwZUNoZWNrZXIoKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdO1xuICAgICAgaWYgKCFpc1ZhbGlkRWxlbWVudChwcm9wVmFsdWUpKSB7XG4gICAgICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSAnICsgKCdgJyArIHByb3BUeXBlICsgJ2Agc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIGEgc2luZ2xlIFJlYWN0RWxlbWVudC4nKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUluc3RhbmNlVHlwZUNoZWNrZXIoZXhwZWN0ZWRDbGFzcykge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgaWYgKCEocHJvcHNbcHJvcE5hbWVdIGluc3RhbmNlb2YgZXhwZWN0ZWRDbGFzcykpIHtcbiAgICAgICAgdmFyIGV4cGVjdGVkQ2xhc3NOYW1lID0gZXhwZWN0ZWRDbGFzcy5uYW1lIHx8IEFOT05ZTU9VUztcbiAgICAgICAgdmFyIGFjdHVhbENsYXNzTmFtZSA9IGdldENsYXNzTmFtZShwcm9wc1twcm9wTmFtZV0pO1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHR5cGUgJyArICgnYCcgKyBhY3R1YWxDbGFzc05hbWUgKyAnYCBzdXBwbGllZCB0byBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgJykgKyAoJ2luc3RhbmNlIG9mIGAnICsgZXhwZWN0ZWRDbGFzc05hbWUgKyAnYC4nKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUVudW1UeXBlQ2hlY2tlcihleHBlY3RlZFZhbHVlcykge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShleHBlY3RlZFZhbHVlcykpIHtcbiAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyB3YXJuaW5nKGZhbHNlLCAnSW52YWxpZCBhcmd1bWVudCBzdXBwbGllZCB0byBvbmVPZiwgZXhwZWN0ZWQgYW4gaW5zdGFuY2Ugb2YgYXJyYXkuJykgOiB2b2lkIDA7XG4gICAgICByZXR1cm4gZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc051bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBleHBlY3RlZFZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaXMocHJvcFZhbHVlLCBleHBlY3RlZFZhbHVlc1tpXSkpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgdmFsdWVzU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoZXhwZWN0ZWRWYWx1ZXMpO1xuICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiB2YWx1ZSBgJyArIHByb3BWYWx1ZSArICdgICcgKyAoJ3N1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCBvbmUgb2YgJyArIHZhbHVlc1N0cmluZyArICcuJykpO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlT2JqZWN0T2ZUeXBlQ2hlY2tlcih0eXBlQ2hlY2tlcikge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgaWYgKHR5cGVvZiB0eXBlQ2hlY2tlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ1Byb3BlcnR5IGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgY29tcG9uZW50IGAnICsgY29tcG9uZW50TmFtZSArICdgIGhhcyBpbnZhbGlkIFByb3BUeXBlIG5vdGF0aW9uIGluc2lkZSBvYmplY3RPZi4nKTtcbiAgICAgIH1cbiAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgICB2YXIgcHJvcFR5cGUgPSBnZXRQcm9wVHlwZShwcm9wVmFsdWUpO1xuICAgICAgaWYgKHByb3BUeXBlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHR5cGUgJyArICgnYCcgKyBwcm9wVHlwZSArICdgIHN1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCBhbiBvYmplY3QuJykpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIga2V5IGluIHByb3BWYWx1ZSkge1xuICAgICAgICBpZiAocHJvcFZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICB2YXIgZXJyb3IgPSB0eXBlQ2hlY2tlcihwcm9wVmFsdWUsIGtleSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSArICcuJyArIGtleSwgUmVhY3RQcm9wVHlwZXNTZWNyZXQpO1xuICAgICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVVuaW9uVHlwZUNoZWNrZXIoYXJyYXlPZlR5cGVDaGVja2Vycykge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShhcnJheU9mVHlwZUNoZWNrZXJzKSkge1xuICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IHdhcm5pbmcoZmFsc2UsICdJbnZhbGlkIGFyZ3VtZW50IHN1cHBsaWVkIHRvIG9uZU9mVHlwZSwgZXhwZWN0ZWQgYW4gaW5zdGFuY2Ugb2YgYXJyYXkuJykgOiB2b2lkIDA7XG4gICAgICByZXR1cm4gZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc051bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5T2ZUeXBlQ2hlY2tlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoZWNrZXIgPSBhcnJheU9mVHlwZUNoZWNrZXJzW2ldO1xuICAgICAgICBpZiAoY2hlY2tlcihwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUsIFJlYWN0UHJvcFR5cGVzU2VjcmV0KSA9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBzdXBwbGllZCB0byAnICsgKCdgJyArIGNvbXBvbmVudE5hbWUgKyAnYC4nKSk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVOb2RlQ2hlY2tlcigpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIGlmICghaXNOb2RlKHByb3BzW3Byb3BOYW1lXSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBzdXBwbGllZCB0byAnICsgKCdgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgYSBSZWFjdE5vZGUuJykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVTaGFwZVR5cGVDaGVja2VyKHNoYXBlVHlwZXMpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgICB2YXIgcHJvcFR5cGUgPSBnZXRQcm9wVHlwZShwcm9wVmFsdWUpO1xuICAgICAgaWYgKHByb3BUeXBlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHR5cGUgYCcgKyBwcm9wVHlwZSArICdgICcgKyAoJ3N1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCBgb2JqZWN0YC4nKSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBrZXkgaW4gc2hhcGVUeXBlcykge1xuICAgICAgICB2YXIgY2hlY2tlciA9IHNoYXBlVHlwZXNba2V5XTtcbiAgICAgICAgaWYgKCFjaGVja2VyKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVycm9yID0gY2hlY2tlcihwcm9wVmFsdWUsIGtleSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSArICcuJyArIGtleSwgUmVhY3RQcm9wVHlwZXNTZWNyZXQpO1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNOb2RlKHByb3BWYWx1ZSkge1xuICAgIHN3aXRjaCAodHlwZW9mIHByb3BWYWx1ZSkge1xuICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICBjYXNlICd1bmRlZmluZWQnOlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICByZXR1cm4gIXByb3BWYWx1ZTtcbiAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHByb3BWYWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gcHJvcFZhbHVlLmV2ZXJ5KGlzTm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb3BWYWx1ZSA9PT0gbnVsbCB8fCBpc1ZhbGlkRWxlbWVudChwcm9wVmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaXRlcmF0b3JGbiA9IGdldEl0ZXJhdG9yRm4ocHJvcFZhbHVlKTtcbiAgICAgICAgaWYgKGl0ZXJhdG9yRm4pIHtcbiAgICAgICAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYXRvckZuLmNhbGwocHJvcFZhbHVlKTtcbiAgICAgICAgICB2YXIgc3RlcDtcbiAgICAgICAgICBpZiAoaXRlcmF0b3JGbiAhPT0gcHJvcFZhbHVlLmVudHJpZXMpIHtcbiAgICAgICAgICAgIHdoaWxlICghKHN0ZXAgPSBpdGVyYXRvci5uZXh0KCkpLmRvbmUpIHtcbiAgICAgICAgICAgICAgaWYgKCFpc05vZGUoc3RlcC52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSXRlcmF0b3Igd2lsbCBwcm92aWRlIGVudHJ5IFtrLHZdIHR1cGxlcyByYXRoZXIgdGhhbiB2YWx1ZXMuXG4gICAgICAgICAgICB3aGlsZSAoIShzdGVwID0gaXRlcmF0b3IubmV4dCgpKS5kb25lKSB7XG4gICAgICAgICAgICAgIHZhciBlbnRyeSA9IHN0ZXAudmFsdWU7XG4gICAgICAgICAgICAgIGlmIChlbnRyeSkge1xuICAgICAgICAgICAgICAgIGlmICghaXNOb2RlKGVudHJ5WzFdKSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpc1N5bWJvbChwcm9wVHlwZSwgcHJvcFZhbHVlKSB7XG4gICAgLy8gTmF0aXZlIFN5bWJvbC5cbiAgICBpZiAocHJvcFR5cGUgPT09ICdzeW1ib2wnKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyAxOS40LjMuNSBTeW1ib2wucHJvdG90eXBlW0BAdG9TdHJpbmdUYWddID09PSAnU3ltYm9sJ1xuICAgIGlmIChwcm9wVmFsdWVbJ0BAdG9TdHJpbmdUYWcnXSA9PT0gJ1N5bWJvbCcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIEZhbGxiYWNrIGZvciBub24tc3BlYyBjb21wbGlhbnQgU3ltYm9scyB3aGljaCBhcmUgcG9seWZpbGxlZC5cbiAgICBpZiAodHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiBwcm9wVmFsdWUgaW5zdGFuY2VvZiBTeW1ib2wpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIEVxdWl2YWxlbnQgb2YgYHR5cGVvZmAgYnV0IHdpdGggc3BlY2lhbCBoYW5kbGluZyBmb3IgYXJyYXkgYW5kIHJlZ2V4cC5cbiAgZnVuY3Rpb24gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKSB7XG4gICAgdmFyIHByb3BUeXBlID0gdHlwZW9mIHByb3BWYWx1ZTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShwcm9wVmFsdWUpKSB7XG4gICAgICByZXR1cm4gJ2FycmF5JztcbiAgICB9XG4gICAgaWYgKHByb3BWYWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgLy8gT2xkIHdlYmtpdHMgKGF0IGxlYXN0IHVudGlsIEFuZHJvaWQgNC4wKSByZXR1cm4gJ2Z1bmN0aW9uJyByYXRoZXIgdGhhblxuICAgICAgLy8gJ29iamVjdCcgZm9yIHR5cGVvZiBhIFJlZ0V4cC4gV2UnbGwgbm9ybWFsaXplIHRoaXMgaGVyZSBzbyB0aGF0IC9ibGEvXG4gICAgICAvLyBwYXNzZXMgUHJvcFR5cGVzLm9iamVjdC5cbiAgICAgIHJldHVybiAnb2JqZWN0JztcbiAgICB9XG4gICAgaWYgKGlzU3ltYm9sKHByb3BUeXBlLCBwcm9wVmFsdWUpKSB7XG4gICAgICByZXR1cm4gJ3N5bWJvbCc7XG4gICAgfVxuICAgIHJldHVybiBwcm9wVHlwZTtcbiAgfVxuXG4gIC8vIFRoaXMgaGFuZGxlcyBtb3JlIHR5cGVzIHRoYW4gYGdldFByb3BUeXBlYC4gT25seSB1c2VkIGZvciBlcnJvciBtZXNzYWdlcy5cbiAgLy8gU2VlIGBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcmAuXG4gIGZ1bmN0aW9uIGdldFByZWNpc2VUeXBlKHByb3BWYWx1ZSkge1xuICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgaWYgKHByb3BUeXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKHByb3BWYWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgcmV0dXJuICdkYXRlJztcbiAgICAgIH0gZWxzZSBpZiAocHJvcFZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgIHJldHVybiAncmVnZXhwJztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHByb3BUeXBlO1xuICB9XG5cbiAgLy8gUmV0dXJucyBjbGFzcyBuYW1lIG9mIHRoZSBvYmplY3QsIGlmIGFueS5cbiAgZnVuY3Rpb24gZ2V0Q2xhc3NOYW1lKHByb3BWYWx1ZSkge1xuICAgIGlmICghcHJvcFZhbHVlLmNvbnN0cnVjdG9yIHx8ICFwcm9wVmFsdWUuY29uc3RydWN0b3IubmFtZSkge1xuICAgICAgcmV0dXJuIEFOT05ZTU9VUztcbiAgICB9XG4gICAgcmV0dXJuIHByb3BWYWx1ZS5jb25zdHJ1Y3Rvci5uYW1lO1xuICB9XG5cbiAgUmVhY3RQcm9wVHlwZXMuY2hlY2tQcm9wVHlwZXMgPSBjaGVja1Byb3BUeXBlcztcbiAgUmVhY3RQcm9wVHlwZXMuUHJvcFR5cGVzID0gUmVhY3RQcm9wVHlwZXM7XG5cbiAgcmV0dXJuIFJlYWN0UHJvcFR5cGVzO1xufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL2ZhY3RvcnlXaXRoVHlwZUNoZWNrZXJzLmpzXG4vLyBtb2R1bGUgaWQgPSA0Njdcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwidmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxudmFyIF9jcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9IHJldHVybiBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH07IH0oKTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoIXNlbGYpIHsgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwidGhpcyBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCAtIHN1cGVyKCkgaGFzbid0IGJlZW4gY2FsbGVkXCIpOyB9IHJldHVybiBjYWxsICYmICh0eXBlb2YgY2FsbCA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSA/IGNhbGwgOiBzZWxmOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvbiwgbm90IFwiICsgdHlwZW9mIHN1cGVyQ2xhc3MpOyB9IHN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcyAmJiBzdXBlckNsYXNzLnByb3RvdHlwZSwgeyBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogc3ViQ2xhc3MsIGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3Quc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIDogc3ViQ2xhc3MuX19wcm90b19fID0gc3VwZXJDbGFzczsgfVxuXG4vKipcbiAqIEBtb2R1bGUgY29tcG9uZW50V3JhcHBlclxuICpcbiAqL1xuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcblxuaW1wb3J0IHN0b3JlIGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7IG9uTW91bnQsIG9uVW5tb3VudCB9IGZyb20gJy4uL2V2ZW50X2hhbmRsZXJzJztcblxuLyoqXG4gKiBjb21wb25lbnRXcmFwcGVyXG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqIEBwYXJhbSB7b2JqZWN0fSBXcmFwcGVkQ29tcG9uZW50IFJlYWN0IGNvbXBvbmVudCBjbGFzcyB0byBiZSB3cmFwcGVkXG4gKiBAcGFyYW0ge2FycmF5fSBba2V5c10gVGhlIGtleShzKSBib3VuZCB0byB0aGUgY2xhc3NcbiAqIEByZXR1cm4ge29iamVjdH0gVGhlIGhpZ2hlci1vcmRlciBmdW5jdGlvbiB0aGF0IHdyYXBzIHRoZSBkZWNvcmF0ZWQgY2xhc3NcbiAqL1xuZnVuY3Rpb24gY29tcG9uZW50V3JhcHBlcihXcmFwcGVkQ29tcG9uZW50KSB7XG4gIHZhciBrZXlzID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiBudWxsO1xuXG4gIHZhciBLZXlCb2FyZEhlbHBlciA9IGZ1bmN0aW9uIChfUmVhY3QkQ29tcG9uZW50KSB7XG4gICAgX2luaGVyaXRzKEtleUJvYXJkSGVscGVyLCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICAgIGZ1bmN0aW9uIEtleUJvYXJkSGVscGVyKHByb3BzKSB7XG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgS2V5Qm9hcmRIZWxwZXIpO1xuXG4gICAgICB2YXIgX3RoaXMgPSBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybih0aGlzLCAoS2V5Qm9hcmRIZWxwZXIuX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihLZXlCb2FyZEhlbHBlcikpLmNhbGwodGhpcywgcHJvcHMpKTtcblxuICAgICAgX3RoaXMuc3RhdGUgPSB7XG4gICAgICAgIGV2ZW50OiBudWxsXG4gICAgICB9O1xuICAgICAgcmV0dXJuIF90aGlzO1xuICAgIH1cblxuICAgIF9jcmVhdGVDbGFzcyhLZXlCb2FyZEhlbHBlciwgW3tcbiAgICAgIGtleTogJ2NvbXBvbmVudERpZE1vdW50JyxcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgb25Nb3VudCh0aGlzKTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdjb21wb25lbnRXaWxsVW5tb3VudCcsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gY29tcG9uZW50V2lsbFVubW91bnQoKSB7XG4gICAgICAgIG9uVW5tb3VudCh0aGlzKTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdoYW5kbGVLZXlEb3duJyxcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBoYW5kbGVLZXlEb3duKGV2ZW50KSB7XG4gICAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICAgIC8vIHRvIHNpbXVsYXRlIGEga2V5cHJlc3MsIHNldCB0aGUgZXZlbnQgYW5kIHRoZW4gY2xlYXIgaXQgaW4gdGhlIGNhbGxiYWNrXG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyBldmVudDogZXZlbnQgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczIuc2V0U3RhdGUoeyBldmVudDogbnVsbCB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAncmVuZGVyJyxcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFdyYXBwZWRDb21wb25lbnQsIF9leHRlbmRzKHt9LCB0aGlzLnByb3BzLCB7IGtleWRvd246IHRoaXMuc3RhdGUgfSkpO1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBLZXlCb2FyZEhlbHBlcjtcbiAgfShSZWFjdC5Db21wb25lbnQpO1xuXG4gIHN0b3JlLnNldEJpbmRpbmcoeyBrZXlzOiBrZXlzLCBmbjogS2V5Qm9hcmRIZWxwZXIucHJvdG90eXBlLmhhbmRsZUtleURvd24sIHRhcmdldDogS2V5Qm9hcmRIZWxwZXIucHJvdG90eXBlIH0pO1xuXG4gIHJldHVybiBLZXlCb2FyZEhlbHBlcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY29tcG9uZW50V3JhcHBlcjtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL2NsYXNzX2RlY29yYXRvci5qc1xuLy8gbW9kdWxlIGlkID0gNTU1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsInZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxuLyoqXG4gKiBAbW9kdWxlIGRlY29yYXRvcnNcbiAqXG4gKi9cbmltcG9ydCBjbGFzc1dyYXBwZXIgZnJvbSAnLi9jbGFzc19kZWNvcmF0b3InO1xuaW1wb3J0IG1ldGhvZFdyYXBwZXIgZnJvbSAnLi9tZXRob2RfZGVjb3JhdG9yJztcbmltcG9ydCBtZXRob2RXcmFwcGVyU2NvcGVkIGZyb20gJy4vbWV0aG9kX2RlY29yYXRvcl9zY29wZWQnO1xuXG4vKipcbiAqIF9kZWNvcmF0b3JcbiAqXG4gKiBAYWNjZXNzIHByaXZhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG1ldGhvZEZuIFRoZSBtZXRob2Qgd3JhcHBlciB0byBkZWxlZ2F0ZSB0bywgYmFzZWQgb24gd2hldGhlciB1c2VyIGhhcyBzcGVjaWZpZWQgYSBzY29wZWQgZGVjb3JhdG9yIG9yIG5vdFxuICogQHBhcmFtIHtBcnJheX0gLi4uYXJncyBSZW1haW5kZXIgb2YgYXJndW1lbnRzIHBhc3NlZCBpblxuICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBkZWNvcmF0ZWQgY2xhc3Mgb3IgbWV0aG9kXG4gKi9cbmZ1bmN0aW9uIF9kZWNvcmF0b3IobWV0aG9kRm4pIHtcbiAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuID4gMSA/IF9sZW4gLSAxIDogMCksIF9rZXkgPSAxOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgYXJnc1tfa2V5IC0gMV0gPSBhcmd1bWVudHNbX2tleV07XG4gIH1cblxuICAvLyBjaGVjayB0aGUgZmlyc3QgYXJndW1lbnQgdG8gc2VlIGlmIGl0J3MgYSB1c2VyLXN1cHBsaWVkIGtleWNvZGUgb3IgYXJyYXlcbiAgLy8gb2Yga2V5Y29kZXMsIG9yIGlmIGl0J3MgdGhlIHdyYXBwZWQgY2xhc3Mgb3IgbWV0aG9kXG4gIHZhciB0ZXN0QXJnID0gYXJnc1swXTtcbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5KHRlc3RBcmcpO1xuXG4gIC8vIGlmIHRoZSB0ZXN0IGFyZ3VtZW50IGlzIG5vdCBhbiBvYmplY3Qgb3IgZnVuY3Rpb24sIGl0IGlzIHVzZXItc3VwcGxpZWRcbiAgLy8ga2V5Y29kZXMuIGVsc2UgdGhlcmUgYXJlIG5vIGFyZ3VtZW50cyBhbmQgaXQncyBqdXN0IHRoZSB3cmFwcGVkIGNsYXNzXG4gIC8vIChtZXRob2QgZGVjb3JhdG9ycyBtdXN0IGhhdmUga2V5Y29kZSBhcmd1bWVudHMpLlxuICBpZiAoaXNBcnJheSB8fCB+WydzdHJpbmcnLCAnbnVtYmVyJ10uaW5kZXhPZih0eXBlb2YgdGVzdEFyZyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YodGVzdEFyZykpKSB7XG4gICAgdmFyIGtleXMgPSBpc0FycmF5ID8gdGVzdEFyZyA6IGFyZ3M7XG5cbiAgICAvLyByZXR1cm4gdGhlIGRlY29yYXRvciBmdW5jdGlvbiwgd2hpY2ggb24gdGhlIG5leHQgY2FsbCB3aWxsIGxvb2sgZm9yXG4gICAgLy8gdGhlIHByZXNlbmNlIG9mIGEgbWV0aG9kIG5hbWUgdG8gZGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSB3cmFwcGVkIG1ldGhvZFxuICAgIC8vIG9yIGNvbXBvbmVudFxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBtZXRob2ROYW1lLCBkZXNjcmlwdG9yKSB7XG4gICAgICByZXR1cm4gbWV0aG9kTmFtZSA/IG1ldGhvZEZuKHsgdGFyZ2V0OiB0YXJnZXQsIGRlc2NyaXB0b3I6IGRlc2NyaXB0b3IsIGtleXM6IGtleXMgfSkgOiBjbGFzc1dyYXBwZXIodGFyZ2V0LCBrZXlzKTtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHZhciBtZXRob2ROYW1lID0gYXJnc1sxXTtcblxuICAgIC8vIG1ldGhvZCBkZWNvcmF0b3JzIHdpdGhvdXQga2V5Y29kZSAod2hpY2gpIGFyZ3VtZW50cyBhcmUgbm90IGFsbG93ZWQuXG4gICAgaWYgKCFtZXRob2ROYW1lKSB7XG4gICAgICByZXR1cm4gY2xhc3NXcmFwcGVyLmFwcGx5KHVuZGVmaW5lZCwgYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybihtZXRob2ROYW1lICsgJzogTWV0aG9kIGRlY29yYXRvcnMgbXVzdCBoYXZlIGtleWNvZGUgYXJndW1lbnRzLCBzbyB0aGUgZGVjb3JhdG9yIGZvciB0aGlzIG1ldGhvZCB3aWxsIG5vdCBkbyBhbnl0aGluZycpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIGtleWRvd25TY29wZWRcbiAqXG4gKiBNZXRob2QgZGVjb3JhdG9yIHRoYXQgd2lsbCBsb29rIGZvciBjaGFuZ2VzIHRvIGl0cyB0YXJnZXRlZCBjb21wb25lbnQnc1xuICogYGtleWRvd25gIHByb3BzIHRvIGRlY2lkZSB3aGVuIHRvIHRyaWdnZXIsIHJhdGhlciB0aGFuIHJlc3BvbmRpbmcgZGlyZWN0bHlcbiAqIHRvIGtleWRvd24gZXZlbnRzLiBUaGlzIGxldHMgeW91IHNwZWNpZnkgYSBAa2V5ZG93biBkZWNvcmF0ZWQgY2xhc3MgaGlnaGVyXG4gKiB1cCBpbiB0aGUgdmlldyBoaWVyYXJjaHkgZm9yIGxhcmdlciBzY29waW5nIG9mIGtleWRvd24gZXZlbnRzLCBvciBmb3JcbiAqIHByb2dyYW1tYXRpY2FsbHkgc2VuZGluZyBrZXlkb3duIGV2ZW50cyBhcyBwcm9wcyBpbnRvIHRoZSBjb21wb25lbnRzIGluIG9yZGVyXG4gKiB0byB0cmlnZ2VyIGRlY29yYXRlZCBtZXRob2RzIHdpdGggbWF0Y2hpbmcga2V5cy5cbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtBcnJheX0gLi4uYXJncyAgQWxsIChvciBubykgYXJndW1lbnRzIHBhc3NlZCBpbiBmcm9tIGRlY29yYXRpb25cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSBUaGUgZGVjb3JhdGVkIGNsYXNzIG9yIG1ldGhvZFxuICovXG5mdW5jdGlvbiBrZXlkb3duU2NvcGVkKCkge1xuICBmb3IgKHZhciBfbGVuMiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuMiksIF9rZXkyID0gMDsgX2tleTIgPCBfbGVuMjsgX2tleTIrKykge1xuICAgIGFyZ3NbX2tleTJdID0gYXJndW1lbnRzW19rZXkyXTtcbiAgfVxuXG4gIHJldHVybiBfZGVjb3JhdG9yLmFwcGx5KHVuZGVmaW5lZCwgW21ldGhvZFdyYXBwZXJTY29wZWRdLmNvbmNhdChhcmdzKSk7XG59XG5cbi8qKlxuICoga2V5ZG93blxuICpcbiAqIFRoZSBtYWluIGRlY29yYXRvciBhbmQgZGVmYXVsdCBleHBvcnQsIGhhbmRsZXMgYm90aCBjbGFzc2VzIGFuZCBtZXRob2RzLlxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKiBAcGFyYW0ge0FycmF5fSAuLi5hcmdzICBBbGwgKG9yIG5vKSBhcmd1bWVudHMgcGFzc2VkIGluIGZyb20gZGVjb3JhdGlvblxuICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBkZWNvcmF0ZWQgY2xhc3Mgb3IgbWV0aG9kXG4gKi9cbmZ1bmN0aW9uIGtleWRvd24oKSB7XG4gIGZvciAodmFyIF9sZW4zID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4zKSwgX2tleTMgPSAwOyBfa2V5MyA8IF9sZW4zOyBfa2V5MysrKSB7XG4gICAgYXJnc1tfa2V5M10gPSBhcmd1bWVudHNbX2tleTNdO1xuICB9XG5cbiAgcmV0dXJuIF9kZWNvcmF0b3IuYXBwbHkodW5kZWZpbmVkLCBbbWV0aG9kV3JhcHBlcl0uY29uY2F0KGFyZ3MpKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQga2V5ZG93bjtcblxuZXhwb3J0IHsga2V5ZG93blNjb3BlZCB9O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvaW5kZXguanNcbi8vIG1vZHVsZSBpZCA9IDU1NlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJ2YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbi8qKlxuICogQG1vZHVsZSBtZXRob2RXcmFwcGVyXG4gKlxuICovXG5pbXBvcnQgc3RvcmUgZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHsgb25Nb3VudCwgb25Vbm1vdW50LCBfb25LZXlEb3duIH0gZnJvbSAnLi4vZXZlbnRfaGFuZGxlcnMnO1xuXG4vKipcbiAqIF9pc1JlYWN0S2V5RG93blxuICpcbiAqIEBhY2Nlc3MgcHJpdmF0ZVxuICogQHBhcmFtIHtvYmplY3R9IGV2ZW50IFRoZSBwb3NzaWJseSBzeW50aGV0aWMgZXZlbnQgcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHdpdGhcbiAqIHRoZSBtZXRob2QgaW52b2NhdGlvbi5cbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIF9pc1JlYWN0S2V5RG93bihldmVudCkge1xuICByZXR1cm4gZXZlbnQgJiYgKHR5cGVvZiBldmVudCA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YoZXZlbnQpKSA9PT0gJ29iamVjdCcgJiYgZXZlbnQubmF0aXZlRXZlbnQgaW5zdGFuY2VvZiB3aW5kb3cuS2V5Ym9hcmRFdmVudCAmJiBldmVudC50eXBlID09PSAna2V5ZG93bic7XG59XG5cbi8qKlxuICogbWV0aG9kV3JhcHBlclxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKiBAcGFyYW0ge29iamVjdH0gYXJncyBBbGwgYXJndW1lbnRzIG5lY2Vzc2FyeSBmb3Igd3JhcHBpbmcgbWV0aG9kXG4gKiBAcGFyYW0ge29iamVjdH0gYXJncy50YXJnZXQgVGhlIGRlY29yYXRlZCBjbGFzc1xuICogQHBhcmFtIHtvYmplY3R9IGFyZ3MuZGVzY3JpcHRvciBNZXRob2QgZGVzY3JpcHRvclxuICogQHBhcmFtIHthcnJheX0gYXJncy5rZXlzIFRoZSBhcnJheSBvZiBrZXlzIGJvdW5kIHRvIHRoZSBnaXZlbiBtZXRob2RcbiAqIEByZXR1cm4ge29iamVjdH0gVGhlIG1ldGhvZCBkZXNjcmlwdG9yXG4gKi9cbmZ1bmN0aW9uIG1ldGhvZFdyYXBwZXIoX3JlZikge1xuICB2YXIgdGFyZ2V0ID0gX3JlZi50YXJnZXQsXG4gICAgICBkZXNjcmlwdG9yID0gX3JlZi5kZXNjcmlwdG9yLFxuICAgICAga2V5cyA9IF9yZWYua2V5cztcblxuXG4gIHZhciBmbiA9IGRlc2NyaXB0b3IudmFsdWU7XG5cbiAgLy8gaWYgd2UgaGF2ZW4ndCBhbHJlYWR5IGNyZWF0ZWQgYSBiaW5kaW5nIGZvciB0aGlzIGNsYXNzICh2aWEgYW5vdGhlclxuICAvLyBkZWNvcmF0ZWQgbWV0aG9kKSwgd3JhcCB0aGVzZSBsaWZlY3ljbGUgbWV0aG9kcy5cbiAgaWYgKCFzdG9yZS5nZXRCaW5kaW5nKHRhcmdldCkpIHtcbiAgICB2YXIgY29tcG9uZW50RGlkTW91bnQgPSB0YXJnZXQuY29tcG9uZW50RGlkTW91bnQsXG4gICAgICAgIGNvbXBvbmVudFdpbGxVbm1vdW50ID0gdGFyZ2V0LmNvbXBvbmVudFdpbGxVbm1vdW50O1xuXG5cbiAgICB0YXJnZXQuY29tcG9uZW50RGlkTW91bnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBvbk1vdW50KHRoaXMpO1xuICAgICAgaWYgKGNvbXBvbmVudERpZE1vdW50KSByZXR1cm4gY29tcG9uZW50RGlkTW91bnQuY2FsbCh0aGlzKTtcbiAgICB9O1xuXG4gICAgdGFyZ2V0LmNvbXBvbmVudFdpbGxVbm1vdW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgb25Vbm1vdW50KHRoaXMpO1xuICAgICAgaWYgKGNvbXBvbmVudFdpbGxVbm1vdW50KSByZXR1cm4gY29tcG9uZW50V2lsbFVubW91bnQuY2FsbCh0aGlzKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gYWRkIHRoaXMgYmluZGluZyBvZiBrZXlzIGFuZCBtZXRob2QgdG8gdGhlIHRhcmdldCdzIGJpbmRpbmdzXG4gIHN0b3JlLnNldEJpbmRpbmcoeyBrZXlzOiBrZXlzLCB0YXJnZXQ6IHRhcmdldCwgZm46IGZuIH0pO1xuXG4gIGRlc2NyaXB0b3IudmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuKSwgX2tleSA9IDA7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgIGFyZ3NbX2tleV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgfVxuXG4gICAgdmFyIG1heWJlRXZlbnQgPSBhcmdzWzBdO1xuXG4gICAgaWYgKF9pc1JlYWN0S2V5RG93bihtYXliZUV2ZW50KSkge1xuICAgICAgLy8gcHJveHkgbWV0aG9kIGluIG9yZGVyIHRvIHVzZSBAa2V5ZG93biBhcyBmaWx0ZXIgZm9yIGtleWRvd24gZXZlbnRzIGNvbWluZ1xuICAgICAgLy8gZnJvbSBhbiBhY3R1YWwgb25LZXlEb3duIGJpbmRpbmcgKGFzIGlkZW50aWZpZWQgYnkgcmVhY3QncyBhZGRpdGlvbiBvZlxuICAgICAgLy8gJ25hdGl2ZUV2ZW50JyArIHR5cGUgPT09ICdrZXlkb3duJylcbiAgICAgIGlmICghbWF5YmVFdmVudC5jdHJsS2V5KSB7XG4gICAgICAgIC8vIHdlIGFscmVhZHkgd2hpdGVsaXN0IHNob3J0Y3V0cyB3aXRoIGN0cmwgbW9kaWZpZXJzIHNvIGlmIHdlIHdlcmUgdG9cbiAgICAgICAgLy8gZmlyZSBpdCBhZ2FpbiBoZXJlIHRoZSBtZXRob2Qgd291bGQgdHJpZ2dlciB0d2ljZS4gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9nbG9ydGhvL3JlYWN0LWtleWRvd24vaXNzdWVzLzM4XG4gICAgICAgIHJldHVybiBfb25LZXlEb3duKG1heWJlRXZlbnQsIHRydWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIW1heWJlRXZlbnQgfHwgIShtYXliZUV2ZW50IGluc3RhbmNlb2Ygd2luZG93LktleWJvYXJkRXZlbnQpIHx8IG1heWJlRXZlbnQudHlwZSAhPT0gJ2tleWRvd24nKSB7XG4gICAgICAvLyBpZiBvdXIgZmlyc3QgYXJndW1lbnQgaXMgYSBrZXlkb3duIGV2ZW50IGl0IGlzIGJlaW5nIGhhbmRsZWQgYnkgb3VyXG4gICAgICAvLyBiaW5kaW5nIHN5c3RlbS4gaWYgaXQncyBhbnl0aGluZyBlbHNlLCBqdXN0IHBhc3MgdGhyb3VnaC5cbiAgICAgIHJldHVybiBmbi5jYWxsLmFwcGx5KGZuLCBbdGhpc10uY29uY2F0KGFyZ3MpKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGRlc2NyaXB0b3I7XG59XG5cbmV4cG9ydCBkZWZhdWx0IG1ldGhvZFdyYXBwZXI7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvZGVjb3JhdG9ycy9tZXRob2RfZGVjb3JhdG9yLmpzXG4vLyBtb2R1bGUgaWQgPSA1NTdcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBAbW9kdWxlIG1ldGhvZFdyYXBwZXJTY29wZWRcbiAqXG4gKi9cbmltcG9ydCBtYXRjaEtleXMgZnJvbSAnLi4vbGliL21hdGNoX2tleXMnO1xuaW1wb3J0IHBhcnNlS2V5cyBmcm9tICcuLi9saWIvcGFyc2Vfa2V5cyc7XG5cbi8qKlxuICogX3Nob3VsZFRyaWdnZXJcbiAqXG4gKiBAYWNjZXNzIHByaXZhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSB0aGlzUHJvcHMgRXhzdGluZyBwcm9wcyBmcm9tIHRoZSB3cmFwcGVkIGNvbXBvbmVudFxuICogQHBhcmFtIHtvYmplY3R9IHRoaXNQcm9wcy5rZXlkb3duIFRoZSBuYW1lc3BhY2VkIHN0YXRlIGZyb20gdGhlIGhpZ2hlci1vcmRlclxuICogY29tcG9uZW50IChjbGFzc19kZWNvcmF0b3IpXG4gKiBAcGFyYW0ge29iamVjdH0gbmV4dFByb3BzIFRoZSBpbmNvbWluZyBwcm9wcyBmcm9tIHRoZSB3cmFwcGVkIGNvbXBvbmVudFxuICogQHBhcmFtIHtvYmplY3R9IG5leHRQcm9wcy5rZXlkb3duIFRoZSBuYW1lc2NhcGVkIHN0YXRlIGZyb20gdGhlIGhpZ2hlci1vcmRlclxuICogY29tcG9uZW50IChjbGFzc19kZWNvcmF0b3IpXG4gKiBAcGFyYW0ge2FycmF5fSBrZXlzIFRoZSBrZXlzIGJvdW5kIHRvIHRoZSBkZWNvcmF0ZWQgbWV0aG9kXG4gKiBAcmV0dXJuIHtib29sZWFufSBXaGV0aGVyIGFsbCB0ZXN0cyBoYXZlIHBhc3NlZFxuICovXG5mdW5jdGlvbiBfc2hvdWxkVHJpZ2dlcihfcmVmLCBrZXlkb3duTmV4dCkge1xuICB2YXIga2V5ZG93blRoaXMgPSBfcmVmLmtleWRvd247XG5cbiAgcmV0dXJuIGtleWRvd25OZXh0ICYmIGtleWRvd25OZXh0LmV2ZW50ICYmICFrZXlkb3duVGhpcy5ldmVudDtcbn1cblxuLyoqXG4gKiBtZXRob2RXcmFwcGVyU2NvcGVkXG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzIEFsbCBhcmdzIG5lY2Vzc2FyeSBmb3IgZGVjb3JhdGluZyB0aGUgbWV0aG9kXG4gKiBAcGFyYW0ge29iamVjdH0gYXJncy50YXJnZXQgVGhlIGRlY29yYXRlZCBtZXRob2QncyBjbGFzcyBvYmplY3RcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzLmRlc2NyaXB0b3IgVGhlIG1ldGhvZCdzIGRlc2NyaXB0b3Igb2JqZWN0XG4gKiBAcGFyYW0ge2FycmF5fSBhcmdzLmtleXMgVGhlIGtleSBjb2RlcyBib3VuZCB0byB0aGUgZGVjb3JhdGVkIG1ldGhvZFxuICogQHJldHVybiB7b2JqZWN0fSBUaGUgbWV0aG9kJ3MgZGVzY3JpcHRvciBvYmplY3RcbiAqL1xuZnVuY3Rpb24gbWV0aG9kV3JhcHBlclNjb3BlZChfcmVmMikge1xuICB2YXIgdGFyZ2V0ID0gX3JlZjIudGFyZ2V0LFxuICAgICAgZGVzY3JpcHRvciA9IF9yZWYyLmRlc2NyaXB0b3IsXG4gICAgICBrZXlzID0gX3JlZjIua2V5cztcbiAgdmFyIGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMgPSB0YXJnZXQuY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcztcblxuICB2YXIgZm4gPSBkZXNjcmlwdG9yLnZhbHVlO1xuICBpZiAoIWtleXMpIHtcbiAgICBjb25zb2xlLndhcm4oZm4gKyAnOiBrZXlkb3duU2NvcGVkIHJlcXVpcmVzIG9uZSBvciBtb3JlIGtleXMnKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIga2V5U2V0cyA9IHBhcnNlS2V5cyhrZXlzKTtcblxuICAgIC8vIHdyYXAgdGhlIGNvbXBvbmVudCdzIGxpZmVjeWNsZSBtZXRob2QgdG8gaW50ZXJjZXB0IGtleSBjb2RlcyBjb21pbmcgZG93blxuICAgIC8vIGZyb20gdGhlIHdyYXBwZWQvc2NvcGVkIGNvbXBvbmVudCB1cCB0aGUgdmlldyBoaWVyYXJjaHkuIGlmIG5ldyBrZXlkb3duXG4gICAgLy8gZXZlbnQgaGFzIGFycml2ZWQgYW5kIHRoZSBrZXkgY29kZXMgbWF0Y2ggd2hhdCB3YXMgc3BlY2lmaWVkIGluIHRoZVxuICAgIC8vIGRlY29yYXRvciwgY2FsbCB0aGUgd3JhcHBlZCBtZXRob2QuXG4gICAgdGFyZ2V0LmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMgPSBmdW5jdGlvbiAobmV4dFByb3BzKSB7XG4gICAgICB2YXIga2V5ZG93biA9IG5leHRQcm9wcy5rZXlkb3duO1xuXG4gICAgICBpZiAoX3Nob3VsZFRyaWdnZXIodGhpcy5wcm9wcywga2V5ZG93bikpIHtcbiAgICAgICAgaWYgKGtleVNldHMuc29tZShmdW5jdGlvbiAoa2V5U2V0KSB7XG4gICAgICAgICAgcmV0dXJuIG1hdGNoS2V5cyh7IGtleVNldDoga2V5U2V0LCBldmVudDoga2V5ZG93bi5ldmVudCB9KTtcbiAgICAgICAgfSkpIHtcbiAgICAgICAgICByZXR1cm4gZm4uY2FsbCh0aGlzLCBrZXlkb3duLmV2ZW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4gPiAxID8gX2xlbiAtIDEgOiAwKSwgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgYXJnc1tfa2V5IC0gMV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgICB9XG5cbiAgICAgIGlmIChjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKSByZXR1cm4gY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcy5jYWxsLmFwcGx5KGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMsIFt0aGlzLCBuZXh0UHJvcHNdLmNvbmNhdChhcmdzKSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBkZXNjcmlwdG9yO1xufVxuXG5leHBvcnQgZGVmYXVsdCBtZXRob2RXcmFwcGVyU2NvcGVkO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvbWV0aG9kX2RlY29yYXRvcl9zY29wZWQuanNcbi8vIG1vZHVsZSBpZCA9IDU1OFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBwb2x5ZmlsbCBhcnJheS5mcm9tIChtYWlubHkgZm9yIElFKVxuaW1wb3J0ICcuL2xpYi9hcnJheS5mcm9tJztcblxuLy8gQGtleWRvd24gYW5kIEBrZXlkb3duU2NvcGVkXG5leHBvcnQgeyBkZWZhdWx0LCBrZXlkb3duU2NvcGVkIH0gZnJvbSAnLi9kZWNvcmF0b3JzJztcblxuLy8gc2V0QmluZGluZyAtIG9ubHkgdXNlZnVsIGlmIHlvdSdyZSBub3QgZ29pbmcgdG8gdXNlIGRlY29yYXRvcnNcbmV4cG9ydCB7IHNldEJpbmRpbmcgfSBmcm9tICcuL3N0b3JlJztcblxuLy8gS2V5cyAtIHVzZSB0aGlzIHRvIGZpbmQga2V5IGNvZGVzIGZvciBzdHJpbmdzLiBmb3IgZXhhbXBsZTogS2V5cy5qLCBLZXlzLmVudGVyXG5leHBvcnQgeyBkZWZhdWx0IGFzIEtleXMgfSBmcm9tICcuL2xpYi9rZXlzJztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gNTU5XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIFByb2R1Y3Rpb24gc3RlcHMgb2YgRUNNQS0yNjIsIEVkaXRpb24gNiwgMjIuMS4yLjFcbi8vIFNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9mcm9tXG5pZiAoIUFycmF5LmZyb20pIHtcbiAgQXJyYXkuZnJvbSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICAgIHZhciBpc0NhbGxhYmxlID0gZnVuY3Rpb24gaXNDYWxsYWJsZShmbikge1xuICAgICAgcmV0dXJuIHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJyB8fCB0b1N0ci5jYWxsKGZuKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgICB9O1xuICAgIHZhciB0b0ludGVnZXIgPSBmdW5jdGlvbiB0b0ludGVnZXIodmFsdWUpIHtcbiAgICAgIHZhciBudW1iZXIgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgaWYgKGlzTmFOKG51bWJlcikpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9XG4gICAgICBpZiAobnVtYmVyID09PSAwIHx8ICFpc0Zpbml0ZShudW1iZXIpKSB7XG4gICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgICB9XG4gICAgICByZXR1cm4gKG51bWJlciA+IDAgPyAxIDogLTEpICogTWF0aC5mbG9vcihNYXRoLmFicyhudW1iZXIpKTtcbiAgICB9O1xuICAgIHZhciBtYXhTYWZlSW50ZWdlciA9IE1hdGgucG93KDIsIDUzKSAtIDE7XG4gICAgdmFyIHRvTGVuZ3RoID0gZnVuY3Rpb24gdG9MZW5ndGgodmFsdWUpIHtcbiAgICAgIHZhciBsZW4gPSB0b0ludGVnZXIodmFsdWUpO1xuICAgICAgcmV0dXJuIE1hdGgubWluKE1hdGgubWF4KGxlbiwgMCksIG1heFNhZmVJbnRlZ2VyKTtcbiAgICB9O1xuXG4gICAgLy8gVGhlIGxlbmd0aCBwcm9wZXJ0eSBvZiB0aGUgZnJvbSBtZXRob2QgaXMgMS5cbiAgICByZXR1cm4gZnVuY3Rpb24gZnJvbShhcnJheUxpa2UgLyosIG1hcEZuLCB0aGlzQXJnICovKSB7XG4gICAgICAvLyAxLiBMZXQgQyBiZSB0aGUgdGhpcyB2YWx1ZS5cbiAgICAgIHZhciBDID0gdGhpcztcblxuICAgICAgLy8gMi4gTGV0IGl0ZW1zIGJlIFRvT2JqZWN0KGFycmF5TGlrZSkuXG4gICAgICB2YXIgaXRlbXMgPSBPYmplY3QoYXJyYXlMaWtlKTtcblxuICAgICAgLy8gMy4gUmV0dXJuSWZBYnJ1cHQoaXRlbXMpLlxuICAgICAgaWYgKGFycmF5TGlrZSA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJBcnJheS5mcm9tIHJlcXVpcmVzIGFuIGFycmF5LWxpa2Ugb2JqZWN0IC0gbm90IG51bGwgb3IgdW5kZWZpbmVkXCIpO1xuICAgICAgfVxuXG4gICAgICAvLyA0LiBJZiBtYXBmbiBpcyB1bmRlZmluZWQsIHRoZW4gbGV0IG1hcHBpbmcgYmUgZmFsc2UuXG4gICAgICB2YXIgbWFwRm4gPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHZvaWQgdW5kZWZpbmVkO1xuICAgICAgdmFyIFQ7XG4gICAgICBpZiAodHlwZW9mIG1hcEZuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyA1LiBlbHNlXG4gICAgICAgIC8vIDUuIGEgSWYgSXNDYWxsYWJsZShtYXBmbikgaXMgZmFsc2UsIHRocm93IGEgVHlwZUVycm9yIGV4Y2VwdGlvbi5cbiAgICAgICAgaWYgKCFpc0NhbGxhYmxlKG1hcEZuKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5LmZyb206IHdoZW4gcHJvdmlkZWQsIHRoZSBzZWNvbmQgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyA1LiBiLiBJZiB0aGlzQXJnIHdhcyBzdXBwbGllZCwgbGV0IFQgYmUgdGhpc0FyZzsgZWxzZSBsZXQgVCBiZSB1bmRlZmluZWQuXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgICAgICAgIFQgPSBhcmd1bWVudHNbMl07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gMTAuIExldCBsZW5WYWx1ZSBiZSBHZXQoaXRlbXMsIFwibGVuZ3RoXCIpLlxuICAgICAgLy8gMTEuIExldCBsZW4gYmUgVG9MZW5ndGgobGVuVmFsdWUpLlxuICAgICAgdmFyIGxlbiA9IHRvTGVuZ3RoKGl0ZW1zLmxlbmd0aCk7XG5cbiAgICAgIC8vIDEzLiBJZiBJc0NvbnN0cnVjdG9yKEMpIGlzIHRydWUsIHRoZW5cbiAgICAgIC8vIDEzLiBhLiBMZXQgQSBiZSB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgdGhlIFtbQ29uc3RydWN0XV0gaW50ZXJuYWwgbWV0aG9kIFxuICAgICAgLy8gb2YgQyB3aXRoIGFuIGFyZ3VtZW50IGxpc3QgY29udGFpbmluZyB0aGUgc2luZ2xlIGl0ZW0gbGVuLlxuICAgICAgLy8gMTQuIGEuIEVsc2UsIExldCBBIGJlIEFycmF5Q3JlYXRlKGxlbikuXG4gICAgICB2YXIgQSA9IGlzQ2FsbGFibGUoQykgPyBPYmplY3QobmV3IEMobGVuKSkgOiBuZXcgQXJyYXkobGVuKTtcblxuICAgICAgLy8gMTYuIExldCBrIGJlIDAuXG4gICAgICB2YXIgayA9IDA7XG4gICAgICAvLyAxNy4gUmVwZWF0LCB3aGlsZSBrIDwgbGVu4oCmIChhbHNvIHN0ZXBzIGEgLSBoKVxuICAgICAgdmFyIGtWYWx1ZTtcbiAgICAgIHdoaWxlIChrIDwgbGVuKSB7XG4gICAgICAgIGtWYWx1ZSA9IGl0ZW1zW2tdO1xuICAgICAgICBpZiAobWFwRm4pIHtcbiAgICAgICAgICBBW2tdID0gdHlwZW9mIFQgPT09ICd1bmRlZmluZWQnID8gbWFwRm4oa1ZhbHVlLCBrKSA6IG1hcEZuLmNhbGwoVCwga1ZhbHVlLCBrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBBW2tdID0ga1ZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGsgKz0gMTtcbiAgICAgIH1cbiAgICAgIC8vIDE4LiBMZXQgcHV0U3RhdHVzIGJlIFB1dChBLCBcImxlbmd0aFwiLCBsZW4sIHRydWUpLlxuICAgICAgQS5sZW5ndGggPSBsZW47XG4gICAgICAvLyAyMC4gUmV0dXJuIEEuXG4gICAgICByZXR1cm4gQTtcbiAgICB9O1xuICB9KCk7XG59XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2FycmF5LmZyb20uanNcbi8vIG1vZHVsZSBpZCA9IDU2MFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIEBtb2R1bGUgZG9tSGVscGVyc1xuICpcbiAqL1xuaW1wb3J0IFJlYWN0RE9NIGZyb20gJ3JlYWN0LWRvbSc7XG5cbnZhciBmb2N1c2FibGVTZWxlY3RvciA9ICdhW2hyZWZdLCBidXR0b24sIGlucHV0LCBvYmplY3QsIHNlbGVjdCwgdGV4dGFyZWEsIFt0YWJpbmRleF0nO1xuXG4vKipcbiAqIGJpbmRGb2N1c2FibGVzOiBGaW5kIGFueSBmb2N1c2FibGUgY2hpbGQgZWxlbWVudHMgb2YgdGhlIGNvbXBvbmVudCBpbnN0YW5jZSBhbmRcbiAqIGFkZCBhbiBvbkZvY3VzIGhhbmRsZXIgdG8gZm9jdXMgb3VyIGtleWRvd24gaGFuZGxlcnMgb24gdGhlIHBhcmVudCBjb21wb25lbnRcbiAqIHdoZW4gdXNlciBrZXlzIGFwcGxpZXMgZm9jdXMgdG8gdGhlIGVsZW1lbnQuXG4gKlxuICogTk9URTogT25lIGxpbWl0YXRpb24gb2YgdGhpcyByaWdodCBub3cgaXMgdGhhdCBpZiB5b3UgdGFiIG91dCBvZiB0aGVcbiAqIGNvbXBvbmVudCwgX2ZvY3VzZWRJbnN0YW5jZSB3aWxsIHN0aWxsIGJlIHNldCB1bnRpbCBuZXh0IGNsaWNrIG9yIG1vdW50IG9yXG4gKiBjb250cm9sbGVkIGZvY3VzLlxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgVGhlIGtleS1ib3VuZCBjb21wb25lbnQgaW5zdGFuY2VcbiAqIEBwYXJhbSB7Y2FsbGJhY2t9IGFjdGl2YXRlT25Gb2N1cyBUaGUgZm4gdG8gZmlyZSB3aGVuIGVsZW1lbnQgaXMgZm9jdXNlZFxuICovXG5mdW5jdGlvbiBiaW5kRm9jdXNhYmxlcyhpbnN0YW5jZSwgYWN0aXZhdGVPbkZvY3VzKSB7XG4gIGlmIChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKSB7XG4gICAgdmFyIG5vZGUgPSBSZWFjdERPTS5maW5kRE9NTm9kZShpbnN0YW5jZSk7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgIHZhciBmb2N1c2FibGVzID0gbm9kZS5xdWVyeVNlbGVjdG9yQWxsKGZvY3VzYWJsZVNlbGVjdG9yKTtcbiAgICAgIGlmIChmb2N1c2FibGVzLmxlbmd0aCkge1xuICAgICAgICB2YXIgb25Gb2N1cyA9IGZ1bmN0aW9uIG9uRm9jdXMoZWxlbWVudCkge1xuICAgICAgICAgIHZhciBvbkZvY3VzUHJldiA9IGVsZW1lbnQub25mb2N1cztcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBhY3RpdmF0ZU9uRm9jdXMoaW5zdGFuY2UpO1xuICAgICAgICAgICAgaWYgKG9uRm9jdXNQcmV2KSBvbkZvY3VzUHJldi5jYWxsKGVsZW1lbnQsIGV2ZW50KTtcbiAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgICAgICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmb2N1c2FibGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnQub25mb2N1cyA9IG9uRm9jdXMoZWxlbWVudCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIGZpbmRDb250YWluZXJOb2RlczogQ2FsbGVkIGJ5IG91ciBjbGljayBoYW5kbGVyIHRvIGZpbmQgaW5zdGFuY2VzIHdpdGggbm9kZXNcbiAqIHRoYXQgYXJlIGVxdWFsIHRvIG9yIHRoYXQgY29udGFpbiB0aGUgY2xpY2sgdGFyZ2V0LiBBbnkgdGhhdCBwYXNzIHRoaXMgdGVzdFxuICogd2lsbCBiZSByZWNpcGllbnRzIG9mIHRoZSBuZXh0IGtleWRvd24gZXZlbnQuXG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgVGhlIGNsaWNrIGV2ZW50LnRhcmdldCBET00gZWxlbWVudFxuICogQHJldHVybiB7ZnVuY3Rpb259IFJlZHVjZXIgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gZmluZENvbnRhaW5lck5vZGVzKHRhcmdldCkge1xuICByZXR1cm4gZnVuY3Rpb24gKG1lbW8sIGluc3RhbmNlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciBub2RlID0gUmVhY3RET00uZmluZERPTU5vZGUoaW5zdGFuY2UpO1xuICAgICAgaWYgKG5vZGUgJiYgKG5vZGUgPT09IHRhcmdldCB8fCBub2RlLmNvbnRhaW5zKHRhcmdldCkpKSB7XG4gICAgICAgIG1lbW8ucHVzaCh7IGluc3RhbmNlOiBpbnN0YW5jZSwgbm9kZTogbm9kZSB9KTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIHNvcnRCeURPTVBvc2l0aW9uOiBDYWxsZWQgYnkgb3VyIGNsaWNrIGhhbmRsZXIgdG8gc29ydCBhIGxpc3Qgb2YgaW5zdGFuY2VzXG4gKiBhY2NvcmRpbmcgdG8gbGVhc3QgLT4gbW9zdCBuZXN0ZWQuIFRoaXMgaXMgc28gdGhhdCBpZiBtdWx0aXBsZSBrZXlib3VuZFxuICogaW5zdGFuY2VzIGhhdmUgbm9kZXMgdGhhdCBhcmUgYW5jZXN0b3JzIG9mIHRoZSBjbGljayB0YXJnZXQsIHRoZXkgd2lsbCBiZVxuICogc29ydGVkIHRvIGxldCB0aGUgaW5zdGFuY2UgY2xvc2VzdCB0byB0aGUgY2xpY2sgdGFyZ2V0IGdldCBmaXJzdCBkaWJzIG9uIHRoZVxuICogbmV4dCBrZXkgZG93biBldmVudC5cbiAqL1xuZnVuY3Rpb24gc29ydEJ5RE9NUG9zaXRpb24oYSwgYikge1xuICByZXR1cm4gYS5ub2RlLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uKGIubm9kZSkgPT09IDEwID8gMSA6IC0xO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7IGJpbmRGb2N1c2FibGVzOiBiaW5kRm9jdXNhYmxlcywgZmluZENvbnRhaW5lck5vZGVzOiBmaW5kQ29udGFpbmVyTm9kZXMsIHNvcnRCeURPTVBvc2l0aW9uOiBzb3J0QnlET01Qb3NpdGlvbiB9O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9kb21faGVscGVycy5qc1xuLy8gbW9kdWxlIGlkID0gNTYxXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQG1vZHVsZSBMaXN0ZW5lcnNcbiAqXG4gKi9cblxuLy8gZmxhZyBmb3Igd2hldGhlciBjbGljayBsaXN0ZW5lciBoYXMgYmVlbiBib3VuZCB0byBkb2N1bWVudFxudmFyIF9jbGlja3NCb3VuZCA9IGZhbHNlO1xuXG4vLyBmbGFnIGZvciB3aGV0aGVyIGtleWRvd24gbGlzdGVuZXIgaGFzIGJlZW4gYm91bmQgdG8gZG9jdW1lbnRcbnZhciBfa2V5c0JvdW5kID0gZmFsc2U7XG5cbnZhciBMaXN0ZW5lcnMgPSB7XG4gIC8qKlxuICAgKiBfYmluZEtleXNcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICovXG4gIGJpbmRLZXlzOiBmdW5jdGlvbiBiaW5kS2V5cyhjYWxsYmFjaykge1xuICAgIGlmICghX2tleXNCb3VuZCkge1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGNhbGxiYWNrKTtcbiAgICAgIF9rZXlzQm91bmQgPSB0cnVlO1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiB1bmJpbmRLZXlzXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqL1xuICB1bmJpbmRLZXlzOiBmdW5jdGlvbiB1bmJpbmRLZXlzKGNhbGxiYWNrKSB7XG4gICAgaWYgKF9rZXlzQm91bmQpIHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBjYWxsYmFjayk7XG4gICAgICBfa2V5c0JvdW5kID0gZmFsc2U7XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIGJpbmRDbGlja3NcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICovXG4gIGJpbmRDbGlja3M6IGZ1bmN0aW9uIGJpbmRDbGlja3MoY2FsbGJhY2spIHtcbiAgICBpZiAoIV9jbGlja3NCb3VuZCkge1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYWxsYmFjayk7XG4gICAgICBfY2xpY2tzQm91bmQgPSB0cnVlO1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiB1bmJpbmRDbGlja3NcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICovXG4gIHVuYmluZENsaWNrczogZnVuY3Rpb24gdW5iaW5kQ2xpY2tzKGNhbGxiYWNrKSB7XG4gICAgaWYgKF9jbGlja3NCb3VuZCkge1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjYWxsYmFjayk7XG4gICAgICBfY2xpY2tzQm91bmQgPSBmYWxzZTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IExpc3RlbmVycztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvbGlzdGVuZXJzLmpzXG4vLyBtb2R1bGUgaWQgPSA1NjJcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gQ291bnRlciBiZWluZyBpbmNyZW1lbnRlZC4gSlMgaXMgc2luZ2xlLXRocmVhZGVkLCBzbyBpdCdsbCBKdXN0IFdvcmvihKIuXG52YXIgX19jb3VudGVyID0gMTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgcHJvY2Vzcy13aWRlIHVuaXF1ZSBpZGVudGlmaWVyLlxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB1dWlkKCkge1xuICByZXR1cm4gXCJ1aWQtXCIgKyBfX2NvdW50ZXIrKztcbn1cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvdXVpZC5qc1xuLy8gbW9kdWxlIGlkID0gNTYzXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIlxuLyoqXG4gKiBXaGVuIHNvdXJjZSBtYXBzIGFyZSBlbmFibGVkLCBgc3R5bGUtbG9hZGVyYCB1c2VzIGEgbGluayBlbGVtZW50IHdpdGggYSBkYXRhLXVyaSB0b1xuICogZW1iZWQgdGhlIGNzcyBvbiB0aGUgcGFnZS4gVGhpcyBicmVha3MgYWxsIHJlbGF0aXZlIHVybHMgYmVjYXVzZSBub3cgdGhleSBhcmUgcmVsYXRpdmUgdG8gYVxuICogYnVuZGxlIGluc3RlYWQgb2YgdGhlIGN1cnJlbnQgcGFnZS5cbiAqXG4gKiBPbmUgc29sdXRpb24gaXMgdG8gb25seSB1c2UgZnVsbCB1cmxzLCBidXQgdGhhdCBtYXkgYmUgaW1wb3NzaWJsZS5cbiAqXG4gKiBJbnN0ZWFkLCB0aGlzIGZ1bmN0aW9uIFwiZml4ZXNcIiB0aGUgcmVsYXRpdmUgdXJscyB0byBiZSBhYnNvbHV0ZSBhY2NvcmRpbmcgdG8gdGhlIGN1cnJlbnQgcGFnZSBsb2NhdGlvbi5cbiAqXG4gKiBBIHJ1ZGltZW50YXJ5IHRlc3Qgc3VpdGUgaXMgbG9jYXRlZCBhdCBgdGVzdC9maXhVcmxzLmpzYCBhbmQgY2FuIGJlIHJ1biB2aWEgdGhlIGBucG0gdGVzdGAgY29tbWFuZC5cbiAqXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3NzKSB7XG4gIC8vIGdldCBjdXJyZW50IGxvY2F0aW9uXG4gIHZhciBsb2NhdGlvbiA9IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93LmxvY2F0aW9uO1xuXG4gIGlmICghbG9jYXRpb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJmaXhVcmxzIHJlcXVpcmVzIHdpbmRvdy5sb2NhdGlvblwiKTtcbiAgfVxuXG5cdC8vIGJsYW5rIG9yIG51bGw/XG5cdGlmICghY3NzIHx8IHR5cGVvZiBjc3MgIT09IFwic3RyaW5nXCIpIHtcblx0ICByZXR1cm4gY3NzO1xuICB9XG5cbiAgdmFyIGJhc2VVcmwgPSBsb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIGxvY2F0aW9uLmhvc3Q7XG4gIHZhciBjdXJyZW50RGlyID0gYmFzZVVybCArIGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL1xcL1teXFwvXSokLywgXCIvXCIpO1xuXG5cdC8vIGNvbnZlcnQgZWFjaCB1cmwoLi4uKVxuXHQvKlxuXHRUaGlzIHJlZ3VsYXIgZXhwcmVzc2lvbiBpcyBqdXN0IGEgd2F5IHRvIHJlY3Vyc2l2ZWx5IG1hdGNoIGJyYWNrZXRzIHdpdGhpblxuXHRhIHN0cmluZy5cblxuXHQgL3VybFxccypcXCggID0gTWF0Y2ggb24gdGhlIHdvcmQgXCJ1cmxcIiB3aXRoIGFueSB3aGl0ZXNwYWNlIGFmdGVyIGl0IGFuZCB0aGVuIGEgcGFyZW5zXG5cdCAgICggID0gU3RhcnQgYSBjYXB0dXJpbmcgZ3JvdXBcblx0ICAgICAoPzogID0gU3RhcnQgYSBub24tY2FwdHVyaW5nIGdyb3VwXG5cdCAgICAgICAgIFteKShdICA9IE1hdGNoIGFueXRoaW5nIHRoYXQgaXNuJ3QgYSBwYXJlbnRoZXNlc1xuXHQgICAgICAgICB8ICA9IE9SXG5cdCAgICAgICAgIFxcKCAgPSBNYXRjaCBhIHN0YXJ0IHBhcmVudGhlc2VzXG5cdCAgICAgICAgICAgICAoPzogID0gU3RhcnQgYW5vdGhlciBub24tY2FwdHVyaW5nIGdyb3Vwc1xuXHQgICAgICAgICAgICAgICAgIFteKShdKyAgPSBNYXRjaCBhbnl0aGluZyB0aGF0IGlzbid0IGEgcGFyZW50aGVzZXNcblx0ICAgICAgICAgICAgICAgICB8ICA9IE9SXG5cdCAgICAgICAgICAgICAgICAgXFwoICA9IE1hdGNoIGEgc3RhcnQgcGFyZW50aGVzZXNcblx0ICAgICAgICAgICAgICAgICAgICAgW14pKF0qICA9IE1hdGNoIGFueXRoaW5nIHRoYXQgaXNuJ3QgYSBwYXJlbnRoZXNlc1xuXHQgICAgICAgICAgICAgICAgIFxcKSAgPSBNYXRjaCBhIGVuZCBwYXJlbnRoZXNlc1xuXHQgICAgICAgICAgICAgKSAgPSBFbmQgR3JvdXBcbiAgICAgICAgICAgICAgKlxcKSA9IE1hdGNoIGFueXRoaW5nIGFuZCB0aGVuIGEgY2xvc2UgcGFyZW5zXG4gICAgICAgICAgKSAgPSBDbG9zZSBub24tY2FwdHVyaW5nIGdyb3VwXG4gICAgICAgICAgKiAgPSBNYXRjaCBhbnl0aGluZ1xuICAgICAgICkgID0gQ2xvc2UgY2FwdHVyaW5nIGdyb3VwXG5cdCBcXCkgID0gTWF0Y2ggYSBjbG9zZSBwYXJlbnNcblxuXHQgL2dpICA9IEdldCBhbGwgbWF0Y2hlcywgbm90IHRoZSBmaXJzdC4gIEJlIGNhc2UgaW5zZW5zaXRpdmUuXG5cdCAqL1xuXHR2YXIgZml4ZWRDc3MgPSBjc3MucmVwbGFjZSgvdXJsXFxzKlxcKCgoPzpbXikoXXxcXCgoPzpbXikoXSt8XFwoW14pKF0qXFwpKSpcXCkpKilcXCkvZ2ksIGZ1bmN0aW9uKGZ1bGxNYXRjaCwgb3JpZ1VybCkge1xuXHRcdC8vIHN0cmlwIHF1b3RlcyAoaWYgdGhleSBleGlzdClcblx0XHR2YXIgdW5xdW90ZWRPcmlnVXJsID0gb3JpZ1VybFxuXHRcdFx0LnRyaW0oKVxuXHRcdFx0LnJlcGxhY2UoL15cIiguKilcIiQvLCBmdW5jdGlvbihvLCAkMSl7IHJldHVybiAkMTsgfSlcblx0XHRcdC5yZXBsYWNlKC9eJyguKiknJC8sIGZ1bmN0aW9uKG8sICQxKXsgcmV0dXJuICQxOyB9KTtcblxuXHRcdC8vIGFscmVhZHkgYSBmdWxsIHVybD8gbm8gY2hhbmdlXG5cdFx0aWYgKC9eKCN8ZGF0YTp8aHR0cDpcXC9cXC98aHR0cHM6XFwvXFwvfGZpbGU6XFwvXFwvXFwvKS9pLnRlc3QodW5xdW90ZWRPcmlnVXJsKSkge1xuXHRcdCAgcmV0dXJuIGZ1bGxNYXRjaDtcblx0XHR9XG5cblx0XHQvLyBjb252ZXJ0IHRoZSB1cmwgdG8gYSBmdWxsIHVybFxuXHRcdHZhciBuZXdVcmw7XG5cblx0XHRpZiAodW5xdW90ZWRPcmlnVXJsLmluZGV4T2YoXCIvL1wiKSA9PT0gMCkge1xuXHRcdCAgXHQvL1RPRE86IHNob3VsZCB3ZSBhZGQgcHJvdG9jb2w/XG5cdFx0XHRuZXdVcmwgPSB1bnF1b3RlZE9yaWdVcmw7XG5cdFx0fSBlbHNlIGlmICh1bnF1b3RlZE9yaWdVcmwuaW5kZXhPZihcIi9cIikgPT09IDApIHtcblx0XHRcdC8vIHBhdGggc2hvdWxkIGJlIHJlbGF0aXZlIHRvIHRoZSBiYXNlIHVybFxuXHRcdFx0bmV3VXJsID0gYmFzZVVybCArIHVucXVvdGVkT3JpZ1VybDsgLy8gYWxyZWFkeSBzdGFydHMgd2l0aCAnLydcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gcGF0aCBzaG91bGQgYmUgcmVsYXRpdmUgdG8gY3VycmVudCBkaXJlY3Rvcnlcblx0XHRcdG5ld1VybCA9IGN1cnJlbnREaXIgKyB1bnF1b3RlZE9yaWdVcmwucmVwbGFjZSgvXlxcLlxcLy8sIFwiXCIpOyAvLyBTdHJpcCBsZWFkaW5nICcuLydcblx0XHR9XG5cblx0XHQvLyBzZW5kIGJhY2sgdGhlIGZpeGVkIHVybCguLi4pXG5cdFx0cmV0dXJuIFwidXJsKFwiICsgSlNPTi5zdHJpbmdpZnkobmV3VXJsKSArIFwiKVwiO1xuXHR9KTtcblxuXHQvLyBzZW5kIGJhY2sgdGhlIGZpeGVkIGNzc1xuXHRyZXR1cm4gZml4ZWRDc3M7XG59O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3N0eWxlLWxvYWRlci9maXhVcmxzLmpzXG4vLyBtb2R1bGUgaWQgPSA4OTZcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gc3R5bGUtbG9hZGVyOiBBZGRzIHNvbWUgY3NzIHRvIHRoZSBET00gYnkgYWRkaW5nIGEgPHN0eWxlPiB0YWdcblxuLy8gbG9hZCB0aGUgc3R5bGVzXG52YXIgY29udGVudCA9IHJlcXVpcmUoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vU3BhY2VyLmxlc3NcIik7XG5pZih0eXBlb2YgY29udGVudCA9PT0gJ3N0cmluZycpIGNvbnRlbnQgPSBbW21vZHVsZS5pZCwgY29udGVudCwgJyddXTtcbi8vIFByZXBhcmUgY3NzVHJhbnNmb3JtYXRpb25cbnZhciB0cmFuc2Zvcm07XG5cbnZhciBvcHRpb25zID0ge31cbm9wdGlvbnMudHJhbnNmb3JtID0gdHJhbnNmb3JtXG4vLyBhZGQgdGhlIHN0eWxlcyB0byB0aGUgRE9NXG52YXIgdXBkYXRlID0gcmVxdWlyZShcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2FkZFN0eWxlcy5qc1wiKShjb250ZW50LCBvcHRpb25zKTtcbmlmKGNvbnRlbnQubG9jYWxzKSBtb2R1bGUuZXhwb3J0cyA9IGNvbnRlbnQubG9jYWxzO1xuLy8gSG90IE1vZHVsZSBSZXBsYWNlbWVudFxuaWYobW9kdWxlLmhvdCkge1xuXHQvLyBXaGVuIHRoZSBzdHlsZXMgY2hhbmdlLCB1cGRhdGUgdGhlIDxzdHlsZT4gdGFnc1xuXHRpZighY29udGVudC5sb2NhbHMpIHtcblx0XHRtb2R1bGUuaG90LmFjY2VwdChcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvaW5kZXguanMhLi4vLi4vbm9kZV9tb2R1bGVzL2xlc3MtbG9hZGVyL2Rpc3QvaW5kZXguanMhLi9TcGFjZXIubGVzc1wiLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBuZXdDb250ZW50ID0gcmVxdWlyZShcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvaW5kZXguanMhLi4vLi4vbm9kZV9tb2R1bGVzL2xlc3MtbG9hZGVyL2Rpc3QvaW5kZXguanMhLi9TcGFjZXIubGVzc1wiKTtcblx0XHRcdGlmKHR5cGVvZiBuZXdDb250ZW50ID09PSAnc3RyaW5nJykgbmV3Q29udGVudCA9IFtbbW9kdWxlLmlkLCBuZXdDb250ZW50LCAnJ11dO1xuXHRcdFx0dXBkYXRlKG5ld0NvbnRlbnQpO1xuXHRcdH0pO1xuXHR9XG5cdC8vIFdoZW4gdGhlIG1vZHVsZSBpcyBkaXNwb3NlZCwgcmVtb3ZlIHRoZSA8c3R5bGU+IHRhZ3Ncblx0bW9kdWxlLmhvdC5kaXNwb3NlKGZ1bmN0aW9uKCkgeyB1cGRhdGUoKTsgfSk7XG59XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvYXBwL1NwYWNlci5sZXNzXG4vLyBtb2R1bGUgaWQgPSA4OTdcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gc3R5bGUtbG9hZGVyOiBBZGRzIHNvbWUgY3NzIHRvIHRoZSBET00gYnkgYWRkaW5nIGEgPHN0eWxlPiB0YWdcblxuLy8gbG9hZCB0aGUgc3R5bGVzXG52YXIgY29udGVudCA9IHJlcXVpcmUoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vc3R5bGVzLmxlc3NcIik7XG5pZih0eXBlb2YgY29udGVudCA9PT0gJ3N0cmluZycpIGNvbnRlbnQgPSBbW21vZHVsZS5pZCwgY29udGVudCwgJyddXTtcbi8vIFByZXBhcmUgY3NzVHJhbnNmb3JtYXRpb25cbnZhciB0cmFuc2Zvcm07XG5cbnZhciBvcHRpb25zID0ge31cbm9wdGlvbnMudHJhbnNmb3JtID0gdHJhbnNmb3JtXG4vLyBhZGQgdGhlIHN0eWxlcyB0byB0aGUgRE9NXG52YXIgdXBkYXRlID0gcmVxdWlyZShcIiEuLi8uLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2FkZFN0eWxlcy5qc1wiKShjb250ZW50LCBvcHRpb25zKTtcbmlmKGNvbnRlbnQubG9jYWxzKSBtb2R1bGUuZXhwb3J0cyA9IGNvbnRlbnQubG9jYWxzO1xuLy8gSG90IE1vZHVsZSBSZXBsYWNlbWVudFxuaWYobW9kdWxlLmhvdCkge1xuXHQvLyBXaGVuIHRoZSBzdHlsZXMgY2hhbmdlLCB1cGRhdGUgdGhlIDxzdHlsZT4gdGFnc1xuXHRpZighY29udGVudC5sb2NhbHMpIHtcblx0XHRtb2R1bGUuaG90LmFjY2VwdChcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvaW5kZXguanMhLi4vLi4vbm9kZV9tb2R1bGVzL2xlc3MtbG9hZGVyL2Rpc3QvaW5kZXguanMhLi9zdHlsZXMubGVzc1wiLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBuZXdDb250ZW50ID0gcmVxdWlyZShcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvaW5kZXguanMhLi4vLi4vbm9kZV9tb2R1bGVzL2xlc3MtbG9hZGVyL2Rpc3QvaW5kZXguanMhLi9zdHlsZXMubGVzc1wiKTtcblx0XHRcdGlmKHR5cGVvZiBuZXdDb250ZW50ID09PSAnc3RyaW5nJykgbmV3Q29udGVudCA9IFtbbW9kdWxlLmlkLCBuZXdDb250ZW50LCAnJ11dO1xuXHRcdFx0dXBkYXRlKG5ld0NvbnRlbnQpO1xuXHRcdH0pO1xuXHR9XG5cdC8vIFdoZW4gdGhlIG1vZHVsZSBpcyBkaXNwb3NlZCwgcmVtb3ZlIHRoZSA8c3R5bGU+IHRhZ3Ncblx0bW9kdWxlLmhvdC5kaXNwb3NlKGZ1bmN0aW9uKCkgeyB1cGRhdGUoKTsgfSk7XG59XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvYXBwL3N0eWxlcy5sZXNzXG4vLyBtb2R1bGUgaWQgPSA4OThcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gQ29tbW9uIGltcG9ydHNcbmltcG9ydCBSZWFjdCBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCBSZWFjdERPTSBmcm9tICdyZWFjdC1kb20nO1xuXG4vLyBQYXJzZXJcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4uL2luZGV4XCI7XG5cbi8vIEFwcC1zcGVjaWZpYyBpbXBvcnRzXG5pbXBvcnQgU3BlbGxFZGl0b3IgZnJvbSBcIi4vU3BlbGxFZGl0b3IuanN4XCI7XG5cbi8vIEtpY2sgb2ZmIG91ciB0b3AtbGV2ZWwgZWxlbWVudFxuUmVhY3RET00ucmVuZGVyKFxuICA8U3BlbGxFZGl0b3IgLz4sXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZWFjdC1yb290Jylcbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvYXBwL2luZGV4LmpzeCIsIi8vXG4vL1x0IyBDb3JlIGBydWxlc2AgLS0gc2ltcGxlIGRhdGF0eXBlcywgZXRjLlxuLy9cbi8vIE5PVEU6IG1hbnkgb2YgdGhlIGJlbG93IGFyZSBjcmVhdGVkIGFzIGN1c3RvbSBQYXR0ZXJuIHN1YmNsYXNzZXMgZm9yIGRlYnVnZ2luZy5cbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgVG9rZW5pemVyIGZyb20gXCIuLi9Ub2tlbml6ZXJcIjtcblxuLy8gQ3JlYXRlIGBjb3JlYCBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwiY29yZVwiKTtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG4vL1xuLy8gIyMjIEluc3RhbGwgc3RhbmRhcmQgcnVsZXNcbi8vXG5cbi8vIEJsb2NrIG9mIGBzdGF0ZW1lbnRzYCB3aXRoIGluZGVudGF0aW9uIGZvciBuZXN0aW5nLlxucGFyc2VyLmFkZFJ1bGUoXCJzdGF0ZW1lbnRzXCIsIFJ1bGUuU3RhdGVtZW50cyk7XG5cblxuXG5cblxuLy8gQmxhbmsgbGluZSByZXByZXNlbnRhdGlvbiBpbiBwYXJzZXIgb3V0cHV0LlxuUnVsZS5CbGFua0xpbmUgPSBjbGFzcyBibGFua19saW5lIGV4dGVuZHMgUnVsZSB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gXCJcXG5cIjtcblx0fVxufVxuXG4vLyBPcGVuIGJsb2NrIHJlcHJlc2VudGF0aW9uIGluIHBhcnNlciBvdXRwdXQuXG5SdWxlLk9wZW5CbG9jayA9IGNsYXNzIG9wZW5fYmxvY2sgZXh0ZW5kcyBSdWxlIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiBcIntcIjtcblx0fVxufVxuXG5cbi8vIENsb3NlIGJsb2NrIHJlcHJlc2VudGF0aW9uIGluIHBhcnNlciBvdXRwdXQuXG5SdWxlLkNsb3NlQmxvY2sgPSBjbGFzcyBjbG9zZV9ibG9jayBleHRlbmRzIFJ1bGUge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuICh0aGlzLmluZGVudCB8fCBcIlwiKSArIFwifVwiO1xuXHR9XG59XG5cblxuLy8gUGFyc2VyIGVycm9yIHJlcHJlc2VudGF0aW9uIGluIHBhcnNlciBvdXRwdXQuXG5SdWxlLlBhcnNlRXJyb3IgPSBjbGFzcyBwYXJzZV9lcnJvciBleHRlbmRzIFJ1bGUge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IG1lc3NhZ2UgPSB0aGlzLm1lc3NhZ2Uuc3BsaXQoXCJcXG5cIikuam9pbihcIlxcbi8vIFwiKTtcblx0XHRyZXR1cm4gYC8vIEVSUk9SOiAke21lc3NhZ2V9YDtcblx0fVxufVxuXG5cbi8vIENvbW1lbnQgcnVsZSAtLSBtYXRjaGVzIHRva2VucyBvZiB0eXBlIGBUb2tlbml6ZXIuQ29tbWVudGAuXG5SdWxlLkNvbW1lbnQgPSBjbGFzcyBjb21tZW50IGV4dGVuZHMgUnVsZSB7XG5cdC8vIENvbW1lbnRzIGFyZSBzcGVjaWFsbHkgbm9kZXMgaW4gb3VyIHRva2VuIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kLCBzdGFjaykge1xuXHRcdGxldCB0b2tlbiA9IHRva2Vuc1tzdGFydF07XG5cdFx0aWYgKCEodG9rZW4gaW5zdGFuY2VvZiBUb2tlbml6ZXIuQ29tbWVudCkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogdG9rZW4sXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0ICsgMVxuXHRcdH0pO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiBgLy8ke3RoaXMubWF0Y2hlZC53aGl0ZXNwYWNlfSR7dGhpcy5tYXRjaGVkLmNvbW1lbnR9YDtcblx0fVxufVxucGFyc2VyLmFkZFJ1bGUoXCJjb21tZW50XCIsIFJ1bGUuQ29tbWVudCk7XG5cblxuLy8gYHdvcmRgID0gaXMgYSBzaW5nbGUgYWxwaGFudW1lcmljIHdvcmQuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcblJ1bGUuV29yZCA9IGNsYXNzIHdvcmQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn07XG5SdWxlLldvcmQucHJvdG90eXBlLnBhdHRlcm4gPSAvXlthLXpdW1xcd1xcLV0qJC87XG5wYXJzZXIuYWRkUnVsZShcIndvcmRcIiwgUnVsZS5Xb3JkKTtcblxuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuLy8gTk9URTogV2UgYmxhY2tsaXN0IGEgbG90IG9mIHdvcmRzIGFzIGlkZW50aWZpZXJzLlxuUnVsZS5JZGVudGlmaWVyID0gY2xhc3MgaWRlbnRpZmllciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufTtcblJ1bGUuSWRlbnRpZmllci5wcm90b3R5cGUucGF0dGVybiA9IC9eW2Etel1bXFx3XFwtXSokLztcbmxldCBpZGVudGlmaWVyID0gcGFyc2VyLmFkZFJ1bGUoW1wiaWRlbnRpZmllclwiLCBcImV4cHJlc3Npb25cIl0sIFJ1bGUuSWRlbnRpZmllcik7XG5cbi8vIEFkZCBFbmdsaXNoIHByZXBvc2l0aW9ucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vXG4vLyBXaWtpcGVkaWEgXCJQcmVwb3NpdGlvblwiOlxuLy9cdFwiUHJlcG9zaXRpb25zLi4uYXJlIGEgY2xhc3Mgb2Ygd29yZHMgdGhhdFxuLy9cdGV4cHJlc3Mgc3BhdGlhbCBvciB0ZW1wb3JhbCByZWxhdGlvbnMgIChpbiwgdW5kZXIsIHRvd2FyZHMsIGJlZm9yZSlcbi8vXHRvciBtYXJrIHZhcmlvdXMgc2VtYW50aWMgcm9sZXMgKG9mLCBmb3IpLlxuLy8gVEVTVE1FXG5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFib3V0XCIsIFwiYWJvdmVcIiwgXCJhZnRlclwiLCBcImFuZFwiLCBcImFzXCIsIFwiYXRcIixcblx0XCJiZWZvcmVcIiwgXCJiZWhpbmRcIiwgXCJiZWxvd1wiLCBcImJlbmVhdGhcIiwgXCJiZXNpZGVcIiwgXCJiZXR3ZWVuXCIsIFwiYmV5b25kXCIsIFwiYnlcIixcblx0XCJkZWZpbmVkXCIsIFwiZG93blwiLCBcImR1cmluZ1wiLFxuXHRcImVhY2hcIiwgXCJlbXB0eVwiLCBcImV4YWN0bHlcIiwgXCJleGNlcHRcIixcblx0XCJmb3JcIiwgXCJmcm9tXCIsXG5cdFwiZ3JlYXRlclwiLFxuXHRcIklcIiwgXCJpblwiLCBcImludG9cIixcblx0XCJsZXNzXCIsIFwibG9uZ1wiLFxuXHRcIm1lXCIsIFwibWludXNcIiwgXCJtb3JlXCIsXG5cdFwibmVhclwiLCBcIm5vdFwiLFxuXHRcIm9mXCIsIFwib2ZmXCIsIFwib25cIiwgXCJvbnRvXCIsIFwib3Bwb3NpdGVcIiwgXCJvclwiLCBcIm91dFwiLCBcIm91dHNpZGVcIiwgXCJvdmVyXCIsXG5cdFwic2hvcnRcIiwgXCJzaW5jZVwiLFxuXHRcInRoYW5cIiwgXCJ0aGVcIiwgXCJ0aGVuXCIsIFwidGhyb3VnaFwiLCBcInRocnVcIiwgXCJ0b1wiLCBcInRvd2FyZFwiLCBcInRvd2FyZHNcIixcblx0XCJ1bmRlZmluZWRcIiwgXCJ1bmRlclwiLCBcInVuZGVybmVhdGhcIiwgXCJ1bmlxdWVcIiwgXCJ1bnRpbFwiLCBcInVwXCIsIFwidXBvblwiLCBcInVwc2lkZVwiLFxuXHRcInZlcnN1c1wiLCBcInZzXCIsXG5cdFwid2hlcmVcIiwgXCJ3aXRoXCIsIFwid2l0aGluXCIsIFwid2l0aG91dFwiLFxuKTtcblxuLy8gQWRkIGNvbW1vbiBlbmdsaXNoIHZlcmJzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhcmVcIixcblx0XCJkb1wiLCBcImRvZXNcIixcblx0XCJjb250YWluc1wiLFxuXHRcImhhc1wiLCBcImhhdmVcIixcblx0XCJpc1wiLFxuXHRcInJlcGVhdFwiLFxuXHRcIndhc1wiLCBcIndlcmVcIlxuKTtcblxuLy8gQWRkIHNwZWNpYWwgY29udHJvbCBrZXl3b3JkcyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiZWxzZVwiLFxuXHRcImlmXCIsXG5cdFwib3RoZXJ3aXNlXCIsXG5cdFwid2hpbGVcIlxuKTtcblxuLy8gYFR5cGVgID0gdHlwZSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGFuIHVwcGVyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5UeXBlID0gY2xhc3MgdHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCB0eXBlID0gdGhpcy5tYXRjaGVkO1xuXHRcdHN3aXRjaCh0eXBlKSB7XG5cdFx0XHQvLyBzcGVjaWFsIGNhc2UgdG8gdGFrZSB0aGUgZm9sbG93aW5nIGFzIGxvd2VyY2FzZVxuXHRcdFx0Y2FzZSBcInRleHRcIjpcdFx0cmV0dXJuIFwiU3RyaW5nXCI7XG5cdFx0XHRjYXNlIFwiY2hhcmFjdGVyXCI6XHRyZXR1cm4gXCJDaGFyYWN0ZXJcIjtcblx0XHRcdGNhc2UgXCJudW1iZXJcIjpcdFx0cmV0dXJuIFwiTnVtYmVyXCI7XG5cdFx0XHRjYXNlIFwiaW50ZWdlclwiOlx0XHRyZXR1cm4gXCJJbnRlZ2VyXCI7XG5cdFx0XHRjYXNlIFwiZGVjaW1hbFwiOlx0XHRyZXR1cm4gXCJEZWNpbWFsXCI7XG5cdFx0XHRjYXNlIFwiYm9vbGVhblwiOlx0XHRyZXR1cm4gXCJCb29sZWFuXCI7XG5cdFx0XHRjYXNlIFwib2JqZWN0XCI6XHRcdHJldHVybiBcIk9iamVjdFwiO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIHR5cGUucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0XHR9XG5cdH1cbn07XG5SdWxlLlR5cGUucHJvdG90eXBlLnBhdHRlcm4gPSAvKFtBLVpdW1xcd1xcLV0qfHRleHR8bnVtYmVyfGludGVnZXJ8ZGVjaW1hbHxjaGFyYWN0ZXJ8Ym9vbGVhbnxvYmplY3QpLztcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoW1widHlwZVwiLCBcImV4cHJlc3Npb25cIl0sIFJ1bGUuVHlwZSk7XG50eXBlLmFkZFRvQmxhY2tsaXN0KFwiSVwiKTtcblxuXG4vLyBCb29sZWFuIGxpdGVyYWwsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFRPRE86IGJldHRlciBuYW1lIGZvciB0aGlzPz8/XG5SdWxlLkJvb2xlYW4gPSBjbGFzcyBib29sZWFuIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHN3aXRjaCAodGhpcy5tYXRjaGVkKSB7XG5cdFx0XHRjYXNlIFwidHJ1ZVwiOlxuXHRcdFx0Y2FzZSBcInllc1wiOlxuXHRcdFx0Y2FzZSBcIm9rXCI6XG5cdFx0XHRjYXNlIFwic3VjY2Vzc1wiOlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufTtcblJ1bGUuQm9vbGVhbi5wcm90b3R5cGUucGF0dGVybiA9IC9eKHRydWV8ZmFsc2V8eWVzfG5vfG9rfGNhbmNlbHxzdWNjZXNzfGZhaWx1cmUpJC87XG5wYXJzZXIuYWRkUnVsZShbXCJib29sZWFuXCIsIFwiZXhwcmVzc2lvblwiXSwgUnVsZS5Cb29sZWFuKTtcblxuLy8gQWRkIGJvb2xlYW4gdG9rZW5zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy8gVEVTVE1FXG5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcInRydWVcIiwgXCJmYWxzZVwiLFxuXHRcInllc1wiLCBcIm5vXCIsXG5cdFwib2tcIiwgXCJjYW5jZWxcIixcblx0XCJzdWNjZXNzXCIsIFwiZmFpbHVyZVwiXG4pO1xuXG5cbi8vIGBudW1iZXJgIGFzIGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBOT1RFOiB5b3UgY2FuIGFsc28gdXNlIGBvbmVgLi4uYHRlbmAgYXMgc3RyaW5ncy4nXG4vLyBUT0RPOiAgYGludGVnZXJgIGFuZCBgZGVjaW1hbGA/ICB0b28gdGVjaHk/XG5SdWxlLk51bWJlciA9IGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUge1xuXHQvLyBTcGVjaWFsIHdvcmRzIHlvdSBjYW4gdXNlIGFzIG51bWJlcnMuLi5cblx0c3RhdGljIE5VTUJFUl9OQU1FUyA9IHtcblx0XHR6ZXJvOiAwLFxuXHRcdG9uZTogMSxcblx0XHR0d286IDIsXG5cdFx0dGhyZWU6IDMsXG5cdFx0Zm91cjogNCxcblx0XHRmaXZlOiA1LFxuXHRcdHNpeDogNixcblx0XHRzZXZlbjogNyxcblx0XHRlaWdodDogOCxcblx0XHRuaW5lOiA5LFxuXHRcdHRlbjogMTBcblx0fVxuXG5cdC8vIE51bWJlcnMgZ2V0IGVuY29kZWQgYXMgbnVtYmVycyBpbiB0aGUgdG9rZW4gc3RyZWFtLlxuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwKSB7XG5cdFx0bGV0IHRva2VuID0gdG9rZW5zW3N0YXJ0XTtcblx0XHQvLyBpZiBhIHN0cmluZywgYXR0ZW1wdCB0byBydW4gdGhyb3VnaCBvdXIgTlVNQkVSX05BTUVTXG5cdFx0aWYgKHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIikgdG9rZW4gPSBSdWxlLk51bWJlci5OVU1CRVJfTkFNRVNbdG9rZW5dO1xuXHRcdGlmICh0eXBlb2YgdG9rZW4gIT09IFwibnVtYmVyXCIpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogdG9rZW4sXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0ICsgMVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQ7XG5cdH1cbn07XG5cbnBhcnNlci5hZGRSdWxlKFtcIm51bWJlclwiLCBcImV4cHJlc3Npb25cIl0sIFJ1bGUuTnVtYmVyKTtcblxuLy8gQWRkIG51bWJlciB3b3JkcyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vIFRFU1RNRVxuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJvbmVcIiwgXCJ0d29cIiwgXCJ0aHJlZVwiLCBcImZvdXJcIiwgXCJmaXZlXCIsXG5cdFwic2l4XCIsIFwic2V2ZW5cIiwgXCJlaWdodFwiLCBcIm5pbmVcIiwgXCJ0ZW5cIlxuKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUge1xuXHQvLyBUZXh0IHN0cmluZ3MgZ2V0IGVuY29kZWQgYXMgYHRleHRgIG9iamVjdHMgaW4gdGhlIHRva2VuIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCkge1xuXHRcdGxldCB0b2tlbiA9IHRva2Vuc1tzdGFydF07XG5cdFx0aWYgKCEodG9rZW4gaW5zdGFuY2VvZiBUb2tlbml6ZXIuVGV4dCkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogdG9rZW4sXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0ICsgMVxuXHRcdH0pO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucXVvdGVkU3RyaW5nO1xuXHR9XG59O1xucGFyc2VyLmFkZFJ1bGUoW1widGV4dFwiLCBcImV4cHJlc3Npb25cIl0sIFJ1bGUuVGV4dCk7XG5cblxuXG4vLyBMaXRlcmFsIGxpc3QgKGFycmF5KSwgZWc6ICBgWzEsMix0cnVlLGZhbHNlIF1gXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsX2xpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdGNsYXNzIGxpdGVyYWxfbGlzdCBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBbJHtsaXN0ID8gbGlzdC5qb2luKFwiLCBcIikgOiBcIlwifV1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBQYXJlbnRoZXNpemVkIGV4cHJlc3Npb25cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwYXJlbnRoZXNpemVkX2V4cHJlc3Npb25cIixcblx0XCJcXFxcKHtleHByZXNzaW9ufVxcXFwpXCIsXG5cdGNsYXNzIHBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkWzFdO1xuXHRcdH1cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgZXhwcmVzc2lvbiA9IHRoaXMucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIGRvbid0IGRvdWJsZSBwYXJlbnMgaWYgbm90IG5lY2Vzc2FyeVxuXHRcdFx0aWYgKHR5cGVvZiBleHByZXNzaW9uID09PSBcInN0cmluZ1wiICYmIGV4cHJlc3Npb24uc3RhcnRzV2l0aChcIihcIikgJiYgZXhwcmVzc2lvbi5lbmRzV2l0aChcIilcIikpIHJldHVybiBleHByZXNzaW9uO1xuXHRcdFx0cmV0dXJuIGAoJHtleHByZXNzaW9ufSlgO1xuXHRcdH1cblx0fVxuKVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJpbXBvcnQgZ2xvYmFsIGZyb20gXCIuL2dsb2JhbFwiO1xuXG4vLyBSZXR1cm4gdGhlIHBsdXJhbCBvZiBgd29yZGAuXG4vLyBOT1RFOiB0aGlzIGlzIG5vdCB2ZXJ5IGdvb2QgYXQgYWxsISEhXG4vLyBUT0RPOiBleGNlcHRpb25zLCBldGMuXG5leHBvcnQgZnVuY3Rpb24gcGx1cmFsaXplKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQgKyBcInNcIjtcbn1cblxuLy8gUmV0dXJuIHRydWUgaWYgd29yZCBpcyBhIHBsdXJhbC5cbi8vIE5PVEU6IGZvciB3b3JkcyB3aGljaCBhcmUgQk9USCBzaW5ndWxhciBhbmQgcGx1cmFsLCB0aGlzIHdpbGwgcmV0dXJuIHRydWUuXG5leHBvcnQgZnVuY3Rpb24gaXNQbHVyYWwod29yZCkge1xuXHRyZXR1cm4gd29yZCA9PT0gcGx1cmFsaXplKHdvcmQpO1xufVxuXG5cbi8vIFJldHVybiB0aGUgc2luZ3VsYXIgb2YgYHdvcmRgLlxuLy8gTk9URTogdGhpcyBpcyBub3QgdmVyeSBnb29kIGF0IGFsbCEhIVxuLy8gVE9ETzogZXhjZXB0aW9ucywgZXRjLlxuZXhwb3J0IGZ1bmN0aW9uIHNpbmd1bGFyaXplKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQucmVwbGFjZSgvZT9zJC8sIFwiXCIpO1xufVxuXG4vLyBSZXR1cm4gdHJ1ZSBpZiB3b3JkIGlzIGEgc2luZ3VsYXIuXG4vLyBOT1RFOiBmb3Igd29yZHMgd2hpY2ggYXJlIEJPVEggc2luZ3VsYXIgYW5kIHBsdXJhbCwgdGhpcyB3aWxsIHJldHVybiB0cnVlLlxuZXhwb3J0IGZ1bmN0aW9uIGlzU2luZ3VsYXIod29yZCkge1xuXHRyZXR1cm4gd29yZCA9PT0gc2luZ3VsYXJpemUod29yZCk7XG59XG5cblxuLy8gUmV0dXJuIGEgY2VydGFpbiBgbnVtYmVyYCBvZiB0YWIgY2hhcmFjdGVycy5cbmNvbnN0IFRBQlMgPSBcIlxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFxcdFwiO1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRhYnMobnVtYmVyKSB7XG5cdGlmICh0eXBlb2YgbnVtYmVyICE9PSBcIm51bWJlclwiKSByZXR1cm4gXCJcIjtcblx0cmV0dXJuIFRBQlMuc3Vic3RyKDAsIG51bWJlcik7XG59XG5cblxuLy8gRXhwb3J0IGFsbCBhcyBhIGx1bXBcbmxldCBhbGxFeHBvcnRzID0gey4uLmV4cG9ydHN9O1xuZXhwb3J0IGRlZmF1bHQgYWxsRXhwb3J0cztcblxuLy8gREVCVUc6IHB1dCBvbiBnbG9iYWwgZm9yIGRlYnVnZ2luZy5cbmdsb2JhbC5TVFJJTkcgPSBhbGxFeHBvcnRzO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3V0aWxzL3N0cmluZy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVmaW5pbmcgY2xhc3NlcyAoa25vd24gYXMgYHR5cGVzYClcbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBUb2tlbml6ZXIgZnJvbSBcIi4uL1Rva2VuaXplclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcblxuLy8gQ3JlYXRlIFwiSlNYXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcIkpTWFwiKTtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gSlNYIGV4cHJlc3Npb24uXG5SdWxlLkpTWCA9IGNsYXNzIGpzeEVsZW1lbnQgZXh0ZW5kcyBSdWxlIHtcblx0Ly8gVGV4dCBzdHJpbmdzIGdldCBlbmNvZGVkIGFzIGB0ZXh0YCBvYmplY3RzIGluIHRoZSB0b2tlbiBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDApIHtcblx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbc3RhcnRdO1xuXHRcdGlmICghKHRva2VuIGluc3RhbmNlb2YgVG9rZW5pemVyLkpTWEVsZW1lbnQpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRva2VuLFxuXHRcdFx0bmV4dFN0YXJ0OiBzdGFydCArIDFcblx0XHR9KTtcblx0fVxuXG5cdC8vIENvbnZlcnQgb3VyIGF0dHJpYnV0ZXMgdG8gc291cmNlLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIGF0dHJpYnV0ZXMuXG5cdGF0dHJzVG9Tb3VyY2UoY29udGV4dCwganN4RWxlbWVudCA9IHRoaXMubWF0Y2hlZCkge1xuXHRcdGxldCBhdHRyaWJ1dGVzID0ganN4RWxlbWVudC5hdHRyaWJ1dGVzO1xuXHRcdGlmICghYXR0cmlidXRlcyB8fCAhYXR0cmlidXRlcy5sZW5ndGgpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgYXR0cnMgPSBhdHRyaWJ1dGVzLm1hcCggKHsgbmFtZSwgdmFsdWUgfSkgPT4ge1xuXHRcdFx0Ly8gaWYgTk8gdmFsdWUsIGFzc3VtZSBpdCdzIGEgdmFyaWFibGUgb2YgdGhlIHNhbWUgbmFtZVxuXHRcdFx0aWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHZhbHVlID0gbmFtZTtcblx0XHRcdC8vIGlmIGl0J3MgYW4gYXJyYXksIGl0J3MgYSBzcGVsbCBleHByZXNzaW9uLCBwb3NzaWJseSB3aXRoIG5lc3RlZCBKU1ggZWxlbWVudHMuLi5cblx0XHRcdGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgVG9rZW5pemVyLkpTWEV4cHJlc3Npb24pIHtcblx0XHRcdFx0dmFsdWUgPSB0aGlzLmpzeEV4cHJlc3Npb25Ub1NvdXJjZShjb250ZXh0LCB2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBlbHNlIGlmIGEgSlNYIGVsZW1lbnQsIHJlY3Vyc2Vcbi8vVE9ETzogaW5kZW50Li4uXG5cdFx0XHRlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFRva2VuaXplci5KU1hFbGVtZW50KSB7XG5cdFx0XHRcdHZhbHVlID0gdmFsdWUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBPdGhlcndpc2UgaWYgYSBudW1iZXIgb3IgVGV4dCBsaXRlcmFsLCBqdXN0IHVzZSBpdFxuXG5cdFx0XHQvLyBzcGVjaWFsIGNhc2UgYGNsYXNzYCB0byBgY2xhc3NOYW1lYCBiZWNhdXNlIFJlYWN0IGlzIGVmZmluZyBwZXJzbmlja2V0eS5cblx0XHRcdGlmIChuYW1lID09PSBcImNsYXNzXCIpIG5hbWUgPSBcImNsYXNzTmFtZVwiO1xuLy9UT0RPOiBlc2NhcGUgbmFtZXMgd2hpY2ggYXJlIGludmFsaWQgSlMgaWRlbnRpZmllcnNcblx0XHRcdHJldHVybiBgJHtuYW1lfTogJHt2YWx1ZX1gO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGB7ICR7YXR0cnMuam9pbihcIiwgXCIpfSB9YDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBhcnJheSB3aXRoIHNvdXJjZSBmb3IgZWFjaCBvZiBvdXIgY2hpbGRyZW4uXG5cdC8vIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgd2UgZG9uJ3QgaGF2ZSBhbnkgY2hpbGRyZW4uXG5cdGNoaWxkcmVuVG9Tb3VyY2UoY29udGV4dCwganN4RWxlbWVudCA9IHRoaXMubWF0Y2hlZCkge1xuXHRcdGxldCBjaGlsZHJlbiA9IGpzeEVsZW1lbnQuY2hpbGRyZW47XG5cdFx0aWYgKCFjaGlsZHJlbiB8fCBjaGlsZHJlbi5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIGNoaWxkcmVuLm1hcChjaGlsZCA9PiB7XG4vL1RPRE86IGVzY2FwZSBpbm5lciBxdW90ZXMuLi5cblx0XHRcdGlmICh0eXBlb2YgY2hpbGQgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0Ly9mb3JnZXQgaXQgaWYgd2hpdGVzcGFjZSBvbmx5Li4uID8/P1xuXHRcdFx0XHRsZXQgdGV4dCA9IGNoaWxkLnRyaW0oKTtcblx0XHRcdFx0aWYgKCF0ZXh0KSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0XHRyZXR1cm4gYFwiJHt0ZXh0fVwiYDtcblx0XHRcdH1cblx0XHRcdGlmIChjaGlsZCBpbnN0YW5jZW9mIFRva2VuaXplci5KU1hFbGVtZW50KSB7XG5cdFx0XHRcdGxldCBjaGlsZFNvdXJjZSA9IHRoaXMuanN4RWxlbWVudFRvU291cmNlKGNvbnRleHQsIGNoaWxkKTtcblx0XHRcdFx0cmV0dXJuIGNoaWxkU291cmNlLnNwbGl0KFwiXFxuXCIpLmpvaW4oXCJcXG5cXHRcIik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2hpbGQgaW5zdGFuY2VvZiBUb2tlbml6ZXIuSlNYRXhwcmVzc2lvbikge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5qc3hFeHByZXNzaW9uVG9Tb3VyY2UoY29udGV4dCwgY2hpbGQpO1xuXHRcdFx0fVxuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKFwiY2hpbGRyZW5Ub1NvdXJjZSgpOiBkb24ndCB1bmRlcnN0YW5kIGNoaWxkXCIgKyAgY2hpbGQpO1xuXHRcdH0pXG5cdFx0Ly8gcmVtb3ZlIHVuZGVmaW5lZC9lbXB0eSBzdHJpbmcgcnVsZXNcblx0XHQuZmlsdGVyKEJvb2xlYW4pO1xuXHR9XG5cblx0Ly8gQ29udmVydCBKU1ggZXhwcmVzc2lvbiAoIGB7Li4ufWAgKSB0byBKUyBzb3VyY2UuXG5cdGpzeEV4cHJlc3Npb25Ub1NvdXJjZShjb250ZXh0LCBqc3hFeHByZXNzaW9uKSB7XG5cdFx0bGV0IHRva2VucyA9IGpzeEV4cHJlc3Npb24udG9rZW5zO1xuY29uc29sZS5pbmZvKGpzeEV4cHJlc3Npb24sIHRva2Vucyk7XG5cdFx0cmV0dXJuIFwiL1wiICsgYCpUT0RPOiAke3Rva2Vucy5qb2luKFwiIFwiKX0qYCArIFwiL1wiO1xuXHR9XG5cblx0anN4RWxlbWVudFRvU291cmNlKGNvbnRleHQsIGpzeEVsZW1lbnQgPSB0aGlzLm1hdGNoZWQpIHtcblx0XHQvLyBnZXQgdGhlIGJpdHMgb2YgdGhlIG91dHB1dFxuXHRcdGxldCB0YWdOYW1lID0gYFwiJHtqc3hFbGVtZW50LnRhZ05hbWV9XCJgO1xuXHRcdGxldCBhdHRycyA9IHRoaXMuYXR0cnNUb1NvdXJjZShjb250ZXh0LCBqc3hFbGVtZW50KTtcblx0XHRsZXQgY2hpbGRyZW4gPSB0aGlzLmNoaWxkcmVuVG9Tb3VyY2UoY29udGV4dCwganN4RWxlbWVudCk7XG5cblx0XHRsZXQgb3V0cHV0ID0gYGNyZWF0ZUVsZW1lbnQoJHt0YWdOYW1lfWA7XG5cdFx0aWYgKCFhdHRycyAmJiBjaGlsZHJlbikgYXR0cnMgPSBcIm51bGxcIjtcblxuXHRcdGlmIChhdHRycykgb3V0cHV0ICs9IGAsICR7YXR0cnN9YDtcblx0XHRpZiAoY2hpbGRyZW4pIHtcblx0XHRcdG91dHB1dCArPSBcIixcXG5cXHRcIiArIGNoaWxkcmVuLmpvaW4oXCIsXFxuXFx0XCIpICsgXCJcXG5cIjtcblx0XHR9XG5cdFx0b3V0cHV0ICs9IFwiKVwiXG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5qc3hFbGVtZW50VG9Tb3VyY2UoY29udGV4dCwgdGhpcy5tYXRjaGVkKTtcblx0fVxufTtcblxuLy8gRGVmaW5lIGpzeCBibG9jayBhcyBhbiBgZXhwcmVzc2lvbmAgT1IgYSBgc3RhdGVtZW50YC5cbnBhcnNlci5hZGRSdWxlKFtcImpzeFwiLCBcImV4cHJlc3Npb25cIiwgXCJzdGF0ZW1lbnRcIl0sIFJ1bGUuSlNYKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9KU1guanMiLCIvLyBFeHBvcnQgYWxsIHN0YW5kYXJkIFwiZW5nbGlzaFwiIHJ1bGVzLlxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5cbi8vIExvYWQgYWxsIHN0YW5kYXJkIHJ1bGVzIGZpbGVzLlxuaW1wb3J0IFwiLi9jb3JlXCI7XG5pbXBvcnQgXCIuL2xpc3RzXCI7XG5pbXBvcnQgXCIuL29wZXJhdG9yc1wiO1xuaW1wb3J0IFwiLi9pZlwiO1xuaW1wb3J0IFwiLi9zdGF0ZW1lbnRzXCI7XG5pbXBvcnQgXCIuL3R5cGVzXCI7XG5pbXBvcnQgXCIuL0pTWFwiO1xuXG5cbi8vIENyZWF0ZSBwYXJzZXIgZm9yIGFsbC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwiYWxsXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBBbmQgZGVwZW5kIG9uIHN0YW5kYXJkIHJ1bGVzIGxvYWRlZCBhYm92ZS5cbnBhcnNlci5pbXBvcnQoXCJjb3JlXCIsIFwibGlzdHNcIiwgXCJvcGVyYXRvcnNcIiwgXCJpZlwiLCBcInN0YXRlbWVudHNcIiwgXCJ0eXBlc1wiLCBcIkpTWFwiKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9hbGwuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGlmIHN0YXRlbWVudHMuXG4vL1xuXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlXCI7XG5cbi8vIENyZWF0ZSBcImlmXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcImlmXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBJbXBvcnQgY29yZSBydWxlcy5cbmltcG9ydCBcIi4vY29yZVwiO1xucGFyc2VyLmltcG9ydChcImNvcmVcIik7XG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImlmXCIsXG5cdFwiaWYge2NvbmRpdGlvbjpleHByZXNzaW9ufSAodGhlbnw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGlmXyBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBjb25kaXRpb24sIHN0YXRlbWVudCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0aWYgKHN0YXRlbWVudCkgcmV0dXJuIGBpZiAoJHtjb25kaXRpb259KSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgaWYgKCR7Y29uZGl0aW9ufSlgXG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImJhY2t3YXJkc19pZlwiLFxuXHRcIntzdGF0ZW1lbnR9IGlmIHtjb25kaXRpb246ZXhwcmVzc2lvbn0gKD86KGVsc2V8b3RoZXJ3aXNlKSB7ZWxzZVN0YXRlbWVudDpzdGF0ZW1lbnR9KT9cIixcblx0Y2xhc3MgYmFja3dhcmRzX2lmIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRlc3RSdWxlID0gbmV3IFJ1bGUuTWF0Y2goeyBtYXRjaDogW1wiaWZcIl0gfSk7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgY29uZGl0aW9uLCBzdGF0ZW1lbnQsIGVsc2VTdGF0ZW1lbnQgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGlmIChlbHNlU3RhdGVtZW50KSByZXR1cm4gYGlmICgke2NvbmRpdGlvbn0pIHsgJHtzdGF0ZW1lbnR9IH0gZWxzZSB7ICR7ZWxzZVN0YXRlbWVudH0gfWBcblx0XHRcdHJldHVybiBgaWYgKCR7Y29uZGl0aW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImVsc2VfaWZcIixcblx0XCIoZWxzZXxvdGhlcndpc2UpIGlmIHtjb25kaXRpb246ZXhwcmVzc2lvbn0gKHRoZW58Oikge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGVsc2VfaWYgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgY29uZGl0aW9uLCBzdGF0ZW1lbnQgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTs7XG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGVsc2UgaWYgKCR7Y29uZGl0aW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGVsc2UgaWYgKCR7Y29uZGl0aW9ufSlgXG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImVsc2VcIixcblx0XCIoZWxzZXxvdGhlcndpc2UpIHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBlbHNlXyBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzdGF0ZW1lbnQgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgZWxzZWBcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaWYuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBsaXN0c1xuLy9cblxuLy8gVE9ETzogY29uZmlybSBpZGVudGlmaWVycyBhcmUgcGx1cmFsIGluIHNvbWUgb2YgdGhlIGJlbG93P1xuLy8gVE9ETzogYGxpc3QuY2xvbmUoKWAgdG8gcmV0dXJuIG5ldyBsaXN0IG9mIHNhbWUgdHlwZS5cblxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuXG5pbXBvcnQgeyBpc1BsdXJhbCwgc2luZ3VsYXJpemUgfSBmcm9tIFwiLi4vdXRpbHMvc3RyaW5nXCI7XG5cbi8vIENyZWF0ZSBcImxpc3RzXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcImxpc3RzXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBJbXBvcnQgY29yZSBydWxlcy5cbmltcG9ydCBcIi4vY29yZVwiO1xucGFyc2VyLmltcG9ydChcImNvcmVcIik7XG5cblxuLy8gV09SS0lORyBGUk9NIE9USEVSIFJVTEVTICh0ZXN0bWUpXG4vL1x0YHRoZSBsZW5ndGggb2YgPGxpc3Q+YFxuLy9cdGA8dGhpbmc+IGlzIG5vdD8gaW4gPGxpc3Q+YFxuLy9cdGA8bGlzdD4gaXMgbm90PyBlbXB0eWBcbi8vXHRgc2V0IGl0ZW0gMSBvZiBteUxpc3QgdG8gJ2EnYFxuXG5cbi8vIFRPRE86IFx0YGNyZWF0ZSBsaXN0IHdpdGggPGV4cD4sIDxleHA+LCA8ZXhwPmBcbi8vIFRPRE86XHRgZHVwbGljYXRlIGxpc3RgXG4vLyBUT0RPOlx0YGR1cGxpY2F0ZSBsaXN0IHdpdGggPGV4cD4sIDxleHA+LCA8ZXhwPmAgPz8/XG4vLyBUT0RPOlx0YHRoZSBzaXplIG9mIDxsaXN0PmAgPT4gd2lsbCBtYXAgdG8gYGxpc3Quc2l6ZWAuLi5cbi8vXHRcdFx0XHQtIGluc3RhbGwgYHNpemVgIGFzIGFuIGFsaWFzIHRvIGBsZW5ndGhgP1xuLy8gVE9ETzpcdGBtb3ZlIDx0aGluZz4gdG8gZW5kIG9mIDxsaXN0PmAgPz8/XG4vLyBUT0RPOlx0YFNldGAgZm9yIGEgdW5pcXVlIGxpc3Q/XG4vLyBUT0RPOlx0dHlwZWQgbGlzdD9cbi8vIFRPRE86XHRsaXN0IHdoaWNoIHdvbid0IHRha2UgbnVsbC91bmRlZmluZWRcblxuXG4vLyBSZXR1cm4gdGhlIGxlbmd0aCBvZiB0aGUgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXN0X2xlbmd0aFwiLFxuXHRcInRoZT8gbnVtYmVyIG9mIHtpZGVudGlmaWVyfSBpbiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X2xlbmd0aCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QsIGlkZW50aWZpZXIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcbi8vIFRPRE86IHNwZWNpYWwgY2FzZSAnd29yZHMnLCAnbGluZXMnLCBldGNcblx0XHRcdHJldHVybiBgJHtsaXN0fS5sZW5ndGhgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gUmV0dXJuIHRoZSBmaXJzdCBwb3NpdGlvbiBvZiBzcGVjaWZpZWQgaXRlbSBpbiB0aGUgbGlzdCBhcyBhbiBhcnJheS5cbi8vIElmIGl0ZW0gaXMgbm90IGZvdW5kLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuLy8gTk9URTogdGhpcyBwb3NpdGlvbiByZXR1cm5lZCBpcyAqKjEtYmFzZWQqKi5cbi8vVEVTVE1FXG4vLyBUT0RPOiBgcG9zaXRpb25zYCwgYGxhc3QgcG9zaXRpb25gLCBgYWZ0ZXIuLi5gXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXN0X3Bvc2l0aW9uXCIsXG5cdFwidGhlPyBwb3NpdGlvbiBvZiB7dGhpbmc6ZXhwcmVzc2lvbn0gaW4ge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9wb3NpdGlvbiBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnBvc2l0aW9uT2YoJHt0aGluZ30sICR7bGlzdH0pYFxuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdE9yZGluYWwgbnVtYmVycyAoZmlyc3QsIHNlY29uZCwgbGFzdCwgZXRjKS5cbi8vIFRPRE86IHNpeHR5LWZpZnRoLCB0d28gaHVuZHJlZCBmb3J0eSBuaW50aC4uLlxuLy9cbnBhcnNlci5hZGRSdWxlKFwib3JkaW5hbFwiLCBjbGFzcyBvcmRpbmFsIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXN7fSk7XG5jbGFzcyBvcmRpbmFsIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHt9XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaXJzdFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2Vjb25kXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJ0aGlyZFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAzIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZm91cnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDQgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaWZ0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA1IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2l4dGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNiB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNldmVudGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNyB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImVpZ2h0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA4IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwibmludGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gOSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInRlbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDEwIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwicGVudWx0aW1hdGVcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaW5hbFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAtMSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImxhc3RcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cblxuLy8gdHJlYXQgbGlzdCBhcyBhIHN0YWNrIG9yIHF1ZXVlXG4vL1RFU1RNRVxucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwidG9wXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDEgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJib3R0b21cIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cblxuLy8gSW5kZXggZXhwcmVzc2lvbjogbnVtZXJpYyBwb3NpdGlvbiBpbiBzb21lIGxpc3QuXG4vL1x0ZS5nLlx0YGNhcmQgMSBvZiB0aGUgcGlsZWBcbi8vXHRcdFx0YGNhcmQgIzIgb2YgdGhlIHBpbGVgXG4vL1x0XHRcdGB0aGUgZmlyc3QgY2FyZCBvZiB0aGUgcGlsZWBcbi8vXG4vLyBOT1RFOiBOZWdhdGl2ZSBudW1lcmljIHBvc2l0aW9ucyBjb21lIGZyb20gdGhlIEVORCBvZiB0aGUgbGlzdC5cbi8vXHRlLmcuXHRgY2FyZCAtMSBvZiB0aGUgcGlsZWBcbi8vXG4vLyBOT1RFOiBPdXIgcG9zaXRpb25zIGFyZSAqKjEtYmFzZWQqKiBhbmQgSmF2YXNjcmlwdCBpcyAqKjAtYmFzZWQqKi5cbi8vXHRcdCBlLmcuIGBpdGVtIDEgb2YgdGhlIGFycmF5YCAgPSBgYXJyYXlbMF1gXG4vL1xuLy8gVE9ETzogaWYgYGlkZW50aWZpZXJgIGlzIFwid29yZFwiLCBvdXRwdXQgYGdldFdvcmQoKWAgZXRjXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwb3NpdGlvbl9leHByZXNzaW9uXCIsXG5cdFtcblx0XHRcIntpZGVudGlmaWVyfSB7cG9zaXRpb246ZXhwcmVzc2lvbn0gb2YgKHRoZT8pIHtleHByZXNzaW9ufVwiLFxuXHRcdFwidGhlIHtwb3NpdGlvbjpvcmRpbmFsfSB7aWRlbnRpZmllcn0gb2YgKHRoZT8pIHtleHByZXNzaW9ufVwiXG5cdF0sXG5cdGNsYXNzIHBvc2l0aW9uX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb257XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgcG9zaXRpb24sIGV4cHJlc3Npb24gfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcbi8vIFRPRE86IHNwZWNpYWwgY2FzZSAnd29yZHMnLCAnbGluZXMnLCBldGNcblxuXHRcdFx0Ly8gSWYgd2UgZ290IGEgcG9zaXRpdmUgbnVtYmVyIGxpdGVyYWwsIGNvbXBlbnNhdGUgZm9yIEpTIDAtYmFzZWQgYXJyYXlzIG5vdyxcblx0XHRcdC8vIGZvciBuaWNlciBvdXRwdXQuXG5cdFx0XHRpZiAodHlwZW9mIHBvc2l0aW9uID09PSBcIm51bWJlclwiICYmIHBvc2l0aW9uID4gMCkge1xuXHRcdFx0XHRyZXR1cm4gYCR7ZXhwcmVzc2lvbn1bJHtwb3NpdGlvbiAtIDF9XWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtwb3NpdGlvbn0pYDtcblxuXHQvLyBUaGlzIGlzIHNhZmVyLCBidXQgdXNpbmcgdGhlIGFib3ZlIHNvbWV0aW1lcyBmb3IgZGVtbyBwdXJwb3Nlc1xuXHQvL1x0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtwb3NpdGlvbn0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFBpY2sgYSBTSU5HTEUgcmFuZG9tIGl0ZW0gZnJvbSB0aGUgbGlzdC5cbi8vIFRPRE86IGNvbmZpcm0gaWRlbnRpZmllciBpcyBwbHVyYWw/XG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZG9tX3Bvc2l0aW9uX2V4cHJlc3Npb25cIixcblx0XCJhIHJhbmRvbSB7aWRlbnRpZmllcn0gKG9mfGZyb218aW4pICh0aGUpPyB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5kb21fcG9zaXRpb25fZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5kb21JdGVtT2YoJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gUGljayBhIHVuaXF1ZSBzZXQgb2YgcmFuZG9tIGl0ZW1zIGZyb20gdGhlIGxpc3QsIHJldHVybmluZyBhbiBhcnJheS5cbi8vIFRPRE86IGB0d28gcmFuZG9tIGl0ZW1zLi4uYFxuLy8gVE9ETzogY29uZmlybSBpZGVudGlmaWVyIGlzIHBsdXJhbD9cbi8vIFRPRE86IGBsaXN0LmNsb25lKClgIHRvIHJldHVybiBuZXcgbGlzdCBvZiBzYW1lIHR5cGUuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZG9tX3Bvc2l0aW9uc19leHByZXNzaW9uXCIsXG5cdFwie251bWJlcn0gcmFuZG9tIHtpZGVudGlmaWVyfSAob2Z8ZnJvbXxpbikgKHRoZSk/IHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJhbmRvbV9wb3NpdGlvbnNfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbnVtYmVyLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldFJhbmRvbUl0ZW1zT2YoJHtsaXN0fSwgJHtudW1iZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFJhbmdlIGV4cHJlc3Npb24uXG4vLyBSZXR1cm5zIGEgbmV3IGxpc3QuXG4vLyBOT1RFOiBgc3RhcnRgIGlzICoqMS1iYXNlZCoqLlxuLy8gTk9URTogYGVuZGAgaXMgaW5jbHVzaXZlIVxuLy8gVE9ETzogY29uZmlybSBpZGVudGlmaWVyIGlzIHBsdXJhbD9cbi8vIFRPRE86IGBsaXN0LmNsb25lKClgIHRvIHJldHVybiBuZXcgbGlzdCBvZiBzYW1lIHR5cGUuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZ2VfZXhwcmVzc2lvblwiLFxuXHRcIntpZGVudGlmaWVyfSB7c3RhcnQ6ZXhwcmVzc2lvbn0gdG8ge2VuZDpleHByZXNzaW9ufSBvZiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzdGFydCwgZW5kLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldFJhbmdlKCR7bGlzdH0sICR7c3RhcnR9LCAke2VuZH0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFN0YXJ0aW5nIHJhbmdlIGV4cHJlc3Npb24uXG4vLyBSZXR1cm5zIGEgbmV3IGxpc3QuXG4vLyBlLmcuXHRgZmlyc3QgNCBpdGVtcyBvZiBsaXN0YFxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImZpcnN0X2luX3JhbmdlXCIsXG5cdFwiZmlyc3Qge251bWJlcjpleHByZXNzaW9ufSB7aWRlbnRpZmllcn0gKGlufG9mKSB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBudW1iZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0UmFuZ2UoJHtsaXN0fSwgMSwgJHtudW1iZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBFbmRpbmcgcmFuZ2UgZXhwcmVzc2lvbi5cbi8vIFJldHVybnMgYSBuZXcgbGlzdC5cbi8vIGUuZy5cdGBsYXN0IDQgaXRlbXMgb2YgbGlzdGBcbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsYXN0X2luX3JhbmdlXCIsXG5cdFwibGFzdCB7bnVtYmVyOmV4cHJlc3Npb259IHtpZGVudGlmaWVyfSAoaW58b2YpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJhbmdlX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG51bWJlciwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRFbmRSYW5nZSgke2xpc3R9LCAxLCAke251bWJlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gUmFuZ2UgZXhwcmVzc2lvbiBzdGFydGluZyBhdCBzb21lIGl0ZW0gaW4gdGhlIGxpc3QuXG4vLyBSZXR1cm5zIGEgbmV3IGxpc3QuXG4vLyBJZiBpdGVtIGlzIG5vdCBmb3VuZCwgcmV0dXJucyBhbiBlbXB0eSBsaXN0LiAoPz8/KVxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmdlX2V4cHJlc3Npb25cIixcblx0XCJ7aWRlbnRpZmllcn0gKGlufG9mKSB7bGlzdDpleHByZXNzaW9ufSBzdGFydGluZyB3aXRoIHt0aGluZzpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5nZSgke2xpc3R9LCBzcGVsbC5wb3NpdGlvbk9mKCR7dGhpbmd9LCAke2xpc3R9KSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBMaXN0IGZpbHRlci5cbi8vIE5PVEU6IHdlIHdpbGwgc2luZ3VsYXJpemUgYGlkZW50aWZpZXJgIGFuZCB1c2UgdGhhdCBhcyB0aGUgYXJndW1lbnQgdG8gYGV4cHJlc3Npb25gLlxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpc3RfZmlsdGVyXCIsXG5cdFwie2lkZW50aWZpZXJ9IChpbnxvZikge2xpc3Q6ZXhwcmVzc2lvbn0gd2hlcmUge2NvbmRpdGlvbjpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X2ZpbHRlciBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgY29uZGl0aW9uLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyB1c2Ugc2luZ3VsYXIgb2YgaWRlbnRpZmllciBmb3IgbWV0aG9kIGFyZ3VtZW50XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBzaW5ndWxhcml6ZShpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHRcdHJldHVybiBgc3BlbGwuZmlsdGVyKCR7bGlzdH0sICR7YXJndW1lbnR9ID0+ICR7Y29uZGl0aW9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBTZXQgbWVtYmVyc2hpcCAobGVmdCByZWN1cnNpdmUpLlxuLy8gTk9URTogd2Ugd2lsbCBzaW5ndWxhcml6ZSBgaWRlbnRpZmllcmAgYW5kIHVzZSB0aGF0IGFzIHRoZSBhcmd1bWVudCB0byBgZXhwcmVzc2lvbmAuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGlzdF9tZW1iZXJzaGlwX3Rlc3RcIixcblx0XCJ7bGlzdDpleHByZXNzaW9ufSAob3BlcmF0b3I6aGFzfGhhcyBub3xkb2VzbnQgaGF2ZXxkb2VzIG5vdCBoYXZlKSB7aWRlbnRpZmllcn0gd2hlcmUge2ZpbHRlcjpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X21lbWJlcnNoaXBfdGVzdCBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Ly8gQWRkIHRlc3QgcnVsZSBmb3IgcXVpY2tlciBwcm9jZXNzaW5nXG5cdFx0dGVzdFJ1bGUgPSBuZXcgUnVsZS5NYXRjaCh7IG1hdGNoOiBbXCJ3aGVyZVwiXSB9KTtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIG9wZXJhdG9yLCBmaWx0ZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBiYW5nID0gb3BlcmF0b3IgPT09IFwiaGFzXCIgPyBcIlwiIDogXCIhXCI7XG5cdFx0XHQvLyB1c2Ugc2luZ3VsYXIgb2YgaWRlbnRpZmllciBmb3IgbWV0aG9kIGFyZ3VtZW50XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBzaW5ndWxhcml6ZShpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHRcdHJldHVybiBgJHtiYW5nfXNwZWxsLmFueSgke2xpc3R9LCAke2FyZ3VtZW50fSA9PiAke2ZpbHRlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vXG4vL1x0QWRkaW5nIHRvIGxpc3QgKGluLXBsYWNlKVxuLy9cblxuLy8gQWRkIHRvIGVuZCBvZiBsaXN0LlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9hcHBlbmRcIixcblx0W1xuXHRcdFwiYXBwZW5kIHt0aGluZzpleHByZXNzaW9ufSB0byB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRcdFwiYWRkIHt0aGluZzpleHByZXNzaW9ufSB0byAoKHRoZT8pIGVuZCBvZik/IHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdF0sXG5cdGNsYXNzIGxpc3RfYXBwZW5kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmFwcGVuZCgke2xpc3R9LCAke3RoaW5nfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gQWRkIHRvIGJlZ2lubmluZyBvZiBsaXN0LlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9wcmVwZW5kXCIsXG5cdFtcblx0XHRcInByZXBlbmQge3RoaW5nOmV4cHJlc3Npb259IHRvIHtsaXN0OmV4cHJlc3Npb259XCIsXG4vL1widG9wXCIgYXMgc3RhY2sgPT09IGJvdHRvbT9cblx0XHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8gdGhlIChzdGFydHxmcm9udHx0b3ApIG9mIHtsaXN0OmV4cHJlc3Npb259XCJcblx0XSxcblx0Y2xhc3MgbGlzdF9wcmVwZW5kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnByZXBlbmQoJHtsaXN0fSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIEFkZCB0byBtaWRkbGUgb2YgbGlzdCwgcHVzaGluZyBleGlzdGluZyBpdGVtcyBvdXQgb2YgdGhlIHdheS5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfYWRkX2F0XCIsXG5cdFwiYWRkIHt0aGluZzpleHByZXNzaW9ufSB0byB7bGlzdDpleHByZXNzaW9ufSBhdCBwb3NpdGlvbiB7cG9zaXRpb246ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9zcGxpY2UgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIHBvc2l0aW9uLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnNwbGljZSgke2xpc3R9LCAke3Bvc2l0aW9ufSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gVE9ETzogIFx0XCJhZGQge3RoaW5nOmV4cHJlc3Npb259IHRvIHtsaXN0OmV4cHJlc3Npb259IGJlZm9yZSB7aXRlbTpleHByZXNzaW9ufVwiLFxuXG4vLyBBZGQgdG8gbWlkZGxlIG9mIGxpc3QsIHB1c2hpbmcgZXhpc3RpbmcgaXRlbXMgb3V0IG9mIHRoZSB3YXkuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X2FkZF9hZnRlclwiLFxuXHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8ge2xpc3Q6ZXhwcmVzc2lvbn0gYWZ0ZXIge2l0ZW06ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9hZGRfYWZ0ZXIgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIGl0ZW0sIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuc3BsaWNlKCR7bGlzdH0sIHNwZWxsLnBvc2l0aW9uT2YoJHtsaXN0fSwgJHtpdGVtfSksICR7dGhpbmd9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHRSZW1vdmluZyBmcm9tIGxpc3QgKGluLXBsYWNlKVxuLy9cblxuLy8gRW1wdHkgbGlzdC5cbi8vVE9ETzogbWFrZSBgZW1wdHlgIGFuZC9vciBgY2xlYXJgIGEgZ2VuZXJpYyBzdGF0ZW1lbnQ/Pz9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfZW1wdHlcIixcblx0XCIoZW1wdHl8Y2xlYXIpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfZW1wdHkgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuY2xlYXIoJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gUmVtb3ZlIG9uZSBpdGVtIGZyb20gbGlzdCBieSBwb3NpdGlvbi5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlX3Bvc2l0aW9uXCIsXG5cdFwicmVtb3ZlIHtpZGVudGlmaWVyfSB7bnVtYmVyOmV4cHJlc3Npb259IG9mIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcmVtb3ZlX3Bvc2l0aW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBudW1iZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwucmVtb3ZlSXRlbSgke2xpc3R9LCAke251bWJlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJlbW92ZSByYW5nZSBvZiB0aGluZ3MgZnJvbSBsaXN0LlxuLy8gTk9URTogYHN0YXJ0YCBpcyAqKjEtYmFzZWQqKi5cbi8vIE5PVEU6IGBlbmRgIGlzIGluY2x1c2l2ZSFcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlX3JhbmdlXCIsXG5cdFwicmVtb3ZlIHtpZGVudGlmaWVyfSB7c3RhcnQ6ZXhwcmVzc2lvbn0gdG8ge2VuZDpleHByZXNzaW9ufSBvZiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3JlbW92ZV9wb3NpdGlvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhcnQsIGVuZCwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5yZW1vdmVSYW5nZSgke2xpc3R9LCAke3N0YXJ0fSwgJHtlbmR9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFJlbW92ZSBhbGwgaW5zdGFuY2VzIG9mIHNvbWV0aGluZyBmcm9tIGEgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlXCIsXG5cdFwicmVtb3ZlIHt0aGluZzpleHByZXNzaW9ufSBmcm9tIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcmVtb3ZlIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5yZW1vdmUoJHtsaXN0fSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJlbW92ZSBhbGwgaXRlbXMgZnJvbSBsaXN0IHdoZXJlIGNvbmRpdGlvbiBpcyB0cnVlLlxuLy8gTk9URTogd2Ugd2lsbCBzaW5ndWxhcml6ZSBgaWRlbnRpZmllcmAgYW5kIHVzZSB0aGF0IGFzIHRoZSBhcmd1bWVudCB0byBgZXhwcmVzc2lvbmAuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3JlbW92ZV93aGVyZVwiLFxuXHRcInJlbW92ZSB7aWRlbnRpZmllcn0gKGlufG9mfGZyb20pIHtsaXN0OmV4cHJlc3Npb259IHdoZXJlIHtjb25kaXRpb246ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9yZW1vdmVfd2hlcmUgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGNvbmRpdGlvbiwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gdXNlIHNpbmd1bGFyIG9mIGlkZW50aWZpZXIgZm9yIG1ldGhvZCBhcmd1bWVudFxuXHRcdFx0bGV0IGFyZ3VtZW50ID0gc2luZ3VsYXJpemUoaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnJlbW92ZVdoZXJlKCR7bGlzdH0sICR7YXJndW1lbnR9ID0+ICR7Y29uZGl0aW9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdFJhbmRvbSAoaW4tcGxhY2UpIGxpc3QgbWFuaXB1bGF0aW9uLlxuLy9cblxuLy8gUmV2ZXJzZSBsaXN0IGluLXBsYWNlLlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9yZXZlcnNlXCIsXG5cdFwicmV2ZXJzZSB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3JldmVyc2UgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwucmV2ZXJzZSgke2xpc3R9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBTaHVmZmxlIGxpc3QgaW4tcGxhY2UuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3NodWZmbGVcIixcblx0XCIocmFuZG9taXplfHNodWZmbGUpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3Rfc2h1ZmZsZSBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5zaHVmZmxlKCR7bGlzdH0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gSXRlcmF0aW9uXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X2l0ZXJhdGlvblwiLFxuXHRcImZvciAoZWFjaCk/IHtpdGVtVmFyOmlkZW50aWZpZXJ9KD86KGFuZHwsKSB7cG9zaXRpb25WYXI6aWRlbnRpZmllcn0pPyBpbiB7bGlzdDpleHByZXNzaW9ufTo/XCIsXG5cdGNsYXNzIGxpc3RfaXRlcmF0aW9uIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGl0ZW1WYXIsIHBvc2l0aW9uVmFyLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAocG9zaXRpb25WYXIpIHtcblx0XHRcdFx0cmV0dXJuIGBmb3IgKGxldCAke3Bvc2l0aW9uVmFyfSA9IDE7ICR7cG9zaXRpb25WYXJ9IDw9ICR7bGlzdH0ubGVuZ3RoOyAke3Bvc2l0aW9uVmFyfSsrKSB7XFxuYFxuXHRcdFx0XHRcdCsgIGBcdGxldCAke2l0ZW1WYXJ9ID0gJHtsaXN0fVske3Bvc2l0aW9uVmFyfS0xXWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYGZvciAobGV0ICR7aXRlbVZhcn0gb2YgJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBSYW5nZVxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmdlX2V4cHJlc3Npb25cIixcblx0XCJyYW5nZSB7c3RhcnQ6ZXhwcmVzc2lvbn0gdG8ge2VuZDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzdGFydCwgZW5kIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldFJhbmdlKCR7c3RhcnR9LCAke2VuZH0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvbGlzdHMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGluZml4IGFuZCBwcmVmaXggb3BlcmF0b3JzLlxuLy9cblxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgXCJvcGVyYXRvcnNcIiBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwib3BlcmF0b3JzXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBJbXBvcnQgY29yZSBydWxlcy5cbmltcG9ydCBcIi4vY29yZVwiO1xucGFyc2VyLmltcG9ydChcImNvcmVcIik7XG5cbi8vIyMgSW5maXggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+IHtyaHN9YCwgZWc6IGBhIGlzIDFgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHR3byBhcmd1bWVudHMgKGBsaHNgIGFuZCBgcmhzYCkgaW50byBvdXRwdXQuXG5cbi8vIE5PVEU6IGBwcmVjZWRlbmNlYCBudW1iZXJzIGNvbWUgZnJvbSBKYXZhc2NyaXB0IGVxdWl2YWxlbnRzXG4vL1x0XHQgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvT3BlcmF0b3JzL09wZXJhdG9yX1ByZWNlZGVuY2VcblxucGFyc2VyLmFkZFJ1bGUoXCJpbmZpeF9vcGVyYXRvclwiLCBjbGFzcyBpbmZpeF9vcGVyYXRvciBleHRlbmRzIFJ1bGUuQWx0ZXJuYXRpdmVze30pO1xuXG4vLyBUT0RPOlxuLy8gXHQvLyBGaW5kIGJlc3QgbWF0Y2ggYWNjb3JkaW5nIHRvIG9wZXJhdG9yIHByZWNlZGVuY2UgYXMgZGVmaW5lZCBiZWxvdy5cbi8vIFx0Z2V0QmVzdE1hdGNoKG1hdGNoZXMpIHtcbi8vIFx0XHRjb25zb2xlLndhcm4oXCJHQk1cIiwgbWF0Y2hlcywgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gucHJlY2VkZW5jZSksIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLm1hdGNoZWRUZXh0KSk7XG4vLyBcdFx0cmV0dXJuIG1hdGNoZXMucmVkdWNlKGZ1bmN0aW9uIChiZXN0LCBuZXh0KSB7XG4vLyBcdFx0XHQvLyB0YWtlIGhpZ2hlc3QgcHJlY2VkZW5jZSBtYXRjaCBmaXJzdFxuLy8gXHRcdFx0aWYgKG5leHQucHJlY2VkZW5jZSA+IGJlc3QucHJlY2VkZW5jZSkgcmV0dXJuIG5leHQ7XG4vLyBcdFx0XHQvLyB0YWtlIGxvbmdlc3QgbWF0Y2ggaWYgc2FtZSBwcmVjZWRlbmNlXG4vLyBcdFx0XHRpZiAobmV4dC5wcmVjZWRlbmNlID09PSBiZXN0LnByZWNlZGVuY2UpIHtcbi8vIFx0XHRcdFx0aWYgKG5leHQuZW5kSW5kZXggPiBiZXN0LmVuZEluZGV4KSByZXR1cm4gbmV4dDtcbi8vIFx0XHRcdH1cbi8vIFx0XHRcdHJldHVybiBiZXN0O1xuLy8gXHRcdH0sIG1hdGNoZXNbMF0pO1xuLy8gXHR9XG5cblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwiaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntsaHM6ZXhwcmVzc2lvbn0ge29wZXJhdG9yOmluZml4X29wZXJhdG9yfSB7cmhzOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGluZml4X29wZXJhdG9yX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdC8vIFdlIENBTk5PVCBtYXRjaCBpZiBgaW5maXhfb3BlcmF0b3JgIGlzbid0IGZvdW5kIGluIHRoZSBleHByZXNzaW9uLlxuXHRcdHRlc3RSdWxlID0gXCJpbmZpeF9vcGVyYXRvclwiO1xuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGhzLCByaHMsIG9wZXJhdG9yIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gb3BlcmF0b3IudG9KUyhsaHMudG9Tb3VyY2UoY29udGV4dCksIHJocy50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJhbmRcIixcblx0Y2xhc3MgYW5kIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDY7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gJiYgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcIm9yXCIsXG5cdGNsYXNzIG9yIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDU7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gfHwgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzXCIsXG5cdCBjbGFzcyBpcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdFwiLFxuXHQgY2xhc3MgaXNfbm90IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBleGFjdGx5XCIsXG5cdGNsYXNzIGlzX2V4YWN0bHkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT09ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGV4YWN0bHlcIixcblx0IGNsYXNzICBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPT0gJHtifSlgIH0gfVxuKTtcblxuLy9UT0RPOiBgc3BlbGwuaXNPZlR5cGUodGhpbmcsIHR5cGUpYFxuLy9UT0RPOiBgaXMgc2FtZSB0eXBlIGFzYCA/XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgYVwiLFxuXHQgY2xhc3MgaXNfYSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgYW5cIixcblx0IGNsYXNzIGlzX2FuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBhXCIsXG5cdCBjbGFzcyBpc19ub3RfYSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBhblwiLFxuXHQgY2xhc3MgaXNfbm90X2FuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5cbi8vVE9ETzogYHNwZWxsLmNvbnRhaW5zKGNvbGxlY3Rpb24sIHRoaW5nKWBcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBpblwiLFxuXHQgY2xhc3MgaXNfaW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG9uZSBvZlwiLFxuXHQgY2xhc3MgaXNfb25lX29mIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBpblwiLFxuXHQgY2xhc3MgaXNfbm90X2luIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IG9uZSBvZlwiLFxuXHQgY2xhc3MgaXNfbm90X29uZV9vZiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5cblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImluY2x1ZGVzXCIsXG5cdCBjbGFzcyBpbmNsdWRlcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiY29udGFpbnNcIixcblx0IGNsYXNzIGNvbnRhaW5zIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImRvZXMgbm90IGluY2x1ZGVcIixcblx0IGNsYXNzIGRvZXNfbm90X2luY2x1ZGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkb2VzIG5vdCBjb250YWluXCIsXG5cdCBjbGFzcyBkb2VzX25vdF9jb250YWluIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPlwiLFxuXHQgY2xhc3MgZ3QgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBncmVhdGVyIHRoYW5cIixcblx0IGNsYXNzIGlzX2dyZWF0ZXJfdGhhbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPj1cIixcblx0IGNsYXNzIGd0ZSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG9cIixcblx0IGNsYXNzIGlzX2d0ZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIjxcIixcblx0IGNsYXNzIGx0IGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbGVzcyB0aGFuXCIsXG5cdCBjbGFzcyBpc19sZXNzX3RoYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIjw9XCIsXG5cdCBjbGFzcyBsdGUgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvXCIsXG5cdCBjbGFzcyBpc19sdGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfSB9XG4pO1xuXG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIlxcXFwrXCIsXG5cdCBjbGFzcyBwbHVzIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcInBsdXNcIixcblx0IGNsYXNzIHBsdXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCItXCIsXG5cdCBjbGFzcyBtaW51cyBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAtICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJtaW51c1wiLFxuXHQgY2xhc3MgbWludXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJcXFxcKlwiLFxuXHQgY2xhc3MgdGltZXMgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKiAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwidGltZXNcIixcblx0IGNsYXNzIHRpbWVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiL1wiLFxuXHQgY2xhc3MgZGl2aWRlZF9ieSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkaXZpZGVkIGJ5XCIsXG5cdCBjbGFzcyBkaXZpZGVkX2J5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH0gfVxuKTtcblxuLy9UT0RPOiAgYCs9YCBldGM/ICBvdGhlciBtYXRoIGZ1bmN0aW9ucz9cblxuXG4vL1xuLy9cbi8vIyMgUG9zdGlmeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj5gLCBlLmcuIGBhIGlzIGRlZmluZWRgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBKUyBvdXRwdXQuXG5cbnBhcnNlci5hZGRSdWxlKFwicG9zdGZpeF9vcGVyYXRvclwiLCBjbGFzcyBwb3N0Zml4X29wZXJhdG9yIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXN7fSk7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeF9vcGVyYXRvcn1cIixcblx0Y2xhc3MgcG9zdGZpeF9vcGVyYXRvcl9leHByZXNpb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdC8vIFdlIENBTk5PVCBtYXRjaCBpZiBgcG9zdGZpeF9vcGVyYXRvcmAgaXNuJ3QgZm91bmQgaW4gdGhlIGV4cHJlc3Npb24uXG5cdFx0dGVzdFJ1bGUgPSBcInBvc3RmaXhfb3BlcmF0b3JcIjtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIG9wZXJhdG9yIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gb3BlcmF0b3IudG9KUyhleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIGRlZmluZWRcIixcblx0Y2xhc3MgaXNfZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ICE9PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBkZWZpbmVkXCIsXG5cdGNsYXNzIGlzX25vdF9kZWZpbmVkIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gPT09ICd1bmRlZmluZWQnKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgdW5kZWZpbmVkXCIsXG5cdGNsYXNzIGlzX3VuZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBlbXB0eVwiLFxuXHRjbGFzcyBpc19lbXB0eSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGVtcHR5XCIsXG5cdGNsYXNzIGlzX25vdF9lbXB0eSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAhc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH0gfVxuKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgXCJzdGF0ZW1lbnRzXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcInN0YXRlbWVudHNcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEltcG9ydCBjb3JlIHJ1bGVzLlxuaW1wb3J0IFwiLi9jb3JlXCI7XG5wYXJzZXIuaW1wb3J0KFwiY29yZVwiKTtcblxuXG4vL1xuLy9cdCMjIFJldHVybnNcbi8vXG5cbi8vIFJldHVybiBhIHZhbHVlXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcInJldHVybl9zdGF0ZW1lbnRcIiwgXCJyZXR1cm4ge2V4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJldHVybl9zdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGByZXR1cm4gJHtleHByZXNzaW9ufWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHQjIyBBc3NpZ25tZW50XG4vL1xuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIixcblx0W1xuXHRcdFwie3RoaW5nOmV4cHJlc3Npb259ID0ge3ZhbHVlOmV4cHJlc3Npb259XCIsXG5cdFx0XCJzZXQge3RoaW5nOmV4cHJlc3Npb259IHRvIHt2YWx1ZTpleHByZXNzaW9ufVwiLFxuXHRcdFwicHV0IHt2YWx1ZTpleHByZXNzaW9ufSBpbnRvIHt0aGluZzpleHByZXNzaW9ufVwiXG5cdF0sXG5cdGNsYXNzIGFzc2lnbm1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIHZhbHVlIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyBUT0RPOiBkZWNsYXJlIGlkZW50aWZpZXIgaWYgbm90IGluIHNjb3BlLCBldGNcblx0XHRcdHJldHVybiBgJHt0aGluZ30gPSAke3ZhbHVlfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJnZXRfZXhwcmVzc2lvblwiLFxuXHRcImdldCB7dmFsdWU6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgZ2V0X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdmFsdWUgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTs7XG5cdFx0XHRyZXR1cm4gYGl0ID0gJHt2YWx1ZX1gXG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHQjIyBVc2VyIGludGVyYWN0aW9uXG4vLyBUT0RPOiBtb3ZlIGludG8gYW5vdGhlciBmaWxlXG4vL1xuXG4vLyBBbGVydCBhIG1lc3NhZ2UuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFsZXJ0XCIsIFwiYWxlcnQge21lc3NhZ2U6ZXhwcmVzc2lvbn0gKD86d2l0aCB7b2tCdXR0b246dGV4dH0pP1wiLFxuXHRjbGFzcyBhbGVydCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBva0J1dHRvbiA9IGBcIk9LXCJgIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLmFsZXJ0KCR7bWVzc2FnZX0sICR7b2tCdXR0b259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBXYXJuaW5nIG1lc3NhZ2UgLS0gbGlrZSBhbGVydCBidXQgZmFuY2llci5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwid2FyblwiLCBcIndhcm4ge2V4cHJlc3Npb246ZXhwcmVzc2lvbn0gKD86d2l0aCB7b2tCdXR0b246dGV4dH0pP1wiLFxuXHRjbGFzcyB3YXJuIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG1lc3NhZ2UsIG9rQnV0dG9uID0gYFwiT0tcImAgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwud2Fybigke21lc3NhZ2V9LCAke29rQnV0dG9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBDb25maXJtIG1lc3NhZ2UgLS0gcHJlc2VudCBhIHF1ZXN0aW9uIHdpdGggdHdvIGFuc3dlcnMuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImNvbmZpcm1cIiwgXCJjb25maXJtIHttZXNzYWdlOmV4cHJlc3Npb259ICg/OndpdGgge29rQnV0dG9uOnRleHR9ICg/OiAoYW5kfG9yKSB7Y2FuY2VsQnV0dG9uOnRleHR9KT8gKT9cIixcblx0Y2xhc3MgY29uZmlybSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBva0J1dHRvbiA9IGBcIk9LXCJgLCBjYW5jZWxCdXR0b24gPSBgXCJDYW5jZWxcImAgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwuY29uZmlybSgke21lc3NhZ2V9LCAke29rQnV0dG9ufSwgJHtjYW5jZWxCdXR0b259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlZmluaW5nIGNsYXNzZXMgKGtub3duIGFzIGB0eXBlc2ApXG4vL1xuXG4vLyBUT0RPOiBtaXhpbnMgLyB0cmFpdHMgLyBjb21wb3NlZCBjbGFzc2VzIC8gYW5ub3RhdGlvbnNcblxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG5pbXBvcnQgZ2xvYmFsIGZyb20gXCIuLi91dGlscy9nbG9iYWxcIjtcbmltcG9ydCB7IHBsdXJhbGl6ZSB9IGZyb20gXCIuLi91dGlscy9zdHJpbmdcIjtcblxuLy8gQ3JlYXRlIFwidHlwZXNcIiBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwidHlwZXNcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEltcG9ydCBjb3JlIHJ1bGVzLlxuaW1wb3J0IFwiLi9jb3JlXCI7XG5wYXJzZXIuaW1wb3J0KFwiY29yZVwiKTtcblxuLy8gRGVmaW5lIFwidHlwZVwiIChhLmsuYS4gXCJjbGFzc1wiKS5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVmaW5lX3R5cGVcIixcblx0XCJkZWZpbmUgdHlwZSB7dHlwZX0gKD86YXMgKGF8YW4pIHtzdXBlclR5cGU6dHlwZX0pP1wiLFxuXHRjbGFzcyBkZWZpbmVfdHlwZSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBzdXBlclR5cGUgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGlmIChzdXBlclR5cGUpIHtcblx0XHRcdFx0cmV0dXJuIGBjbGFzcyAke3R5cGV9IGV4dGVuZHMgJHtzdXBlclR5cGV9YDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBgY2xhc3MgJHt0eXBlfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFByb3BlcnRpZXMgY2xhdXNlOiBjcmVhdGVzIGFuIG9iamVjdCB3aXRoIG9uZSBvciBtb3JlIHByb3BlcnR5IHZhbHVlcy5cbi8vXHRgZm9vID0gMSwgYmFyID0gMmBcbi8vVE9ETzogd291bGQgbGlrZSB0byB1c2UgYGFuZGAgYnV0IHRoYXQgd2lsbCBiYXJmIG9uIGV4cHJlc3Npb25zLi4uXG4vL1RPRE86IGhvdyB0byBkbyBwcm9wZXJ0aWVzIG9uIG11bHRpcGxlIGxpbmVzP1xucGFyc2VyLmFkZExpc3QoXG5cdFwib2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc1wiLFxuXHRcIlsoe2tleTppZGVudGlmaWVyfSg/Oj0ge3ZhbHVlOmV4cHJlc3Npb259KT8pICxdXCIsXG5cdGNsYXNzIG9iamVjdF9saXRlcmFsX3Byb3BlcnRpZXMgZXh0ZW5kcyBSdWxlLkxpc3Qge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBwcm9wcyA9IHRoaXMucmVzdWx0cy5tYXRjaGVkLm1hcChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0XHRcdGxldCB7IGtleSwgdmFsdWUgfSA9IHByb3AucmVzdWx0cztcblx0XHRcdFx0XHRrZXkgPSBrZXkudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRcdFx0dmFsdWUgPSB2YWx1ZSAmJiB2YWx1ZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0XHRpZiAodmFsdWUpIHJldHVybiBgXCIke2tleX1cIjogJHt2YWx1ZX1gXG5cdFx0XHRcdFx0cmV0dXJuIGtleTtcblx0XHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYHsgJHtwcm9wcy5qb2luKFwiLCBcIil9IH1gO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gYG5ld2Agb3IgYGNyZWF0ZWBcbi8vIFRoaXMgd29ya3MgYXMgYW4gZXhwcmVzc2lvbiBPUiBhIHN0YXRlbWVudC5cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGFsbCB0eXBlcyB0YWtlIGFuIG9iamVjdCBvZiBwcm9wZXJ0aWVzPz8/P1xucGFyc2VyLmFkZFNlcXVlbmNlKFxuXHRbXCJleHByZXNzaW9uXCIsIFwic3RhdGVtZW50XCJdLFxuXHRcIihjcmVhdGV8bmV3KSB7dHlwZX0gKD86d2l0aCB7cHJvcHM6b2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc30pP1wiLFxuXHRjbGFzcyBuZXdfdGhpbmcgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBwcm9wcyA9IFwiXCIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igb2JqZWN0LCB3aGljaCB3ZSdsbCBjcmVhdGUgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbC5cblx0XHRcdGlmICh0eXBlID09PSBcIk9iamVjdFwiKSB7XG5cdFx0XHRcdGlmICghcHJvcHMpIHJldHVybiBcInt9XCI7XG5cdFx0XHRcdHJldHVybiBwcm9wcztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGBuZXcgJHt0eXBlfSgke3Byb3BzfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1RPRE86IGNvbnN0cnVjdG9yXG5cblxuXG4vL01PVkUgVE8gYGZ1bmN0aW9uc2A/XG4vLyBBcmd1bWVudHMgY2xhdXNlIGZvciBtZXRob2RzXG4vL1x0YHdpdGggZm9vYCBvciBgd2l0aCBmb28gYW5kIGJhciBhbmQgYmF6YFxuLy9UT0RPOiB7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cdD0+IHJlcXVpcmVzIGAsYCBpbnN0ZWFkIG9mIGBhbmRgXG4vL1RPRE86IGB3aXRoIGZvbyBhcyBUeXBlYFxuLy9UT0RPOlx0YHdpdGggZm9vLi4uYCBmb3Igc3BsYXQ/XG5wYXJzZXIuYWRkU2VxdWVuY2UoXG5cdFwiYXJnc1wiLFxuXHRcIndpdGggW2FyZ3M6e2lkZW50aWZpZXJ9ICxdXCIsXG5cdGNsYXNzIGFyZ3MgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHQvLyBSZXR1cm5zIGFuIGFycmF5IG9mIGFyZ3VtZW50IHZhbHVlc1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiB0aGlzLnJlc3VsdHMuYXJncy5tYXRjaGVkLm1hcChhcmcgPT4gYXJnLm1hdGNoZWQpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBEZWNsYXJlIGluc3RhbmNlIG1ldGhvZCBvciBub3JtYWwgZnVuY3Rpb24uXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfbWV0aG9kXCIsXG5cdFwiKHRvfG9uKSB7aWRlbnRpZmllcn0ge2FyZ3N9PyAoXFxcXDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZGVjbGFyZV9tZXRob2QgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJncywgc3RhdGVtZW50IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRhcmdzID0gKEFycmF5LmlzQXJyYXkoYXJncykgPyBhcmdzLmpvaW4oXCIsIFwiKSA6IFwiXCIpO1xuXHRcdFx0aWYgKCFzdGF0ZW1lbnQpIHtcblx0XHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pYDtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLm9wZW5zQmxvY2sgPSB0cnVlO1xuXHRcdFx0XHR0aGlzLmNsb3Nlc0Jsb2NrID0gdHJ1ZTtcblx0XHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBEZWNsYXJlIFwiYWN0aW9uXCIsIHdoaWNoIGNhbiBiZSBjYWxsZWQgZ2xvYmFsbHkgYW5kIGFmZmVjdHMgdGhlIHBhcnNlci5cbi8vIFRPRE86IGB3aXRoYCBjbGF1c2UgKHdpbGwgY29uZmxpY3Qgd2l0aCBgd29yZGApXG4vLyBUT0RPOiBpbnN0YWxsIGluIHBhcnNlciBzb21laG93XG4vLyBUT0RPOiBjcmVhdGUgaW5zdGFuY2UgZnVuY3Rpb24/ICBvciBtYXliZSB3ZSBkb24ndCBuZWVkIGl0OlxuLy9cdFx0XHRgYWN0aW9uIHR1cm4gQ2FyZCBvdmVyYCBmb3IgYW4gaW5zdGFuY2UgaXMganVzdCBgdHVybiBtZSBvdmVyYFxuLy9cdFx0XHRgYWN0aW9uIGFkZCBjYXJkIHRvIGRlY2tgID0+IGBhZGQgbWUgdG8gZGVja2Bcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfYWN0aW9uXCIsXG5cdFwiYWN0aW9uIChrZXl3b3Jkczp7d29yZH18e3R5cGV9KSsgKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGRlY2xhcmVfYWN0aW9uIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGtleXdvcmRzLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGxldCB3b3JkcyA9IGtleXdvcmRzLm1hdGNoZWQubWFwKCB3b3JkID0+IHdvcmQudG9Tb3VyY2UoY29udGV4dCkgKTtcblx0XHRcdC8vIGlmIHRoZXJlJ3Mgb25seSBvbmUgd29yZCwgaXQgY2FuJ3QgYmUgYSBibGFja2xpc3RlZCBpZGVudGlmaWVyIG9yIGEgdHlwZVxuXHRcdFx0aWYgKHdvcmRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHR2YXIgd29yZCA9IHdvcmRzWzBdO1xuXHRcdFx0XHRpZiAoa2V5d29yZHMubWF0Y2hlZCBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSB0eXBlczogJHt3b3JkfWApO1xuXHRcdFx0XHR9XG5cbmNvbnNvbGUud2FybihcIkZJWE1FOiBwYXJzZXIucnVsZXMuaWRlbnRpZmllclwiKTtcbi8vIEhBQ0s6IGBnbG9iYWwucGFyc2VyYCBpcyBhIGhhY2sgaGVyZSBmb3IgY29udmVuaWVuY2UgaW4gdGVzdGluZy4uLlxuXHRcdFx0XHRsZXQgcGFyc2VyID0gY29udGV4dCA/IGNvbnRleHQucGFyc2VyIDogZ2xvYmFsLnBhcnNlcjtcblx0XHRcdFx0aWYgKHBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmJsYWNrbGlzdFt3b3JkXSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSBibGFja2xpc3RlZCBpZGVudGlmaWVyc1wiOiAke3dvcmR9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBhcmd1bWVudHMgYW5kL29yIHR5cGVzXG5cdFx0XHR2YXIgYXJncyA9IFtdO1xuXHRcdFx0dmFyIHR5cGVzID0gW107XG5cdFx0XHQvLyBpZiBhbnkgb2YgdGhlIHdvcmRzIGFyZSB0eXBlcyAoY2FwaXRhbCBsZXR0ZXIpIG1ha2UgdGhhdCBhbiBhcmd1bWVudCBvZiB0aGUgc2FtZSBuYW1lLlxuXHRcdFx0a2V5d29yZHMubWF0Y2hlZC5tYXAoIChpdGVtLCBpbmRleCkgPT4ge1xuXHRcdFx0XHRpZiAoaXRlbSBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdGxldCB0eXBlID0gd29yZHNbaW5kZXhdO1xuXHRcdFx0XHRcdGxldCB3b3JkID0gdHlwZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdHR5cGVzLnB1c2goW3R5cGUsIHdvcmRdKTtcblx0XHRcdFx0XHR3b3Jkc1tpbmRleF0gPSB3b3JkO1xuXHRcdFx0XHRcdGFyZ3MucHVzaCh3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQvLyBnZXQgc3RhdGljIG1ldGhvZCBuYW1lIGFuZCBhcmd1bWVudHMgZm9yIG91dHB1dFxuXHRcdFx0bGV0IG1ldGhvZE5hbWUgPSB3b3Jkcy5qb2luKFwiX1wiKTtcblx0XHRcdGFyZ3MgPSBhcmdzLmpvaW4oXCIsIFwiKTtcblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpZiB0aGVyZSBhcmUgYW55IGNvbmRpdGlvbnMgb24gdGhlIGFib3ZlXG5cdFx0XHRsZXQgY29uZGl0aW9ucyA9IHR5cGVzLm1hcCggKFt0eXBlLCB3b3JkXSkgPT4ge1xuXHRcdFx0XHRyZXR1cm4gYFxcdGlmICghc3BlbGwuaXNBKCR7d29yZH0sICR7dHlwZX0pKSByZXR1cm4gdW5kZWZpbmVkYDtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBnZXQgc3RhdGVtZW50cywgYWRkaW5nIGNvbmRpdGlvbnMgaWYgbmVjZXNzYXJ5XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiBcIlwiO1xuXHRcdFx0bGV0IHN0YXRlbWVudHMgPSBcIlwiO1xuXHRcdFx0aWYgKHN0YXRlbWVudCkge1xuXHRcdFx0XHRzdGF0ZW1lbnRzID0gW107XG5cdFx0XHRcdGlmIChjb25kaXRpb25zLmxlbmd0aCkgc3RhdGVtZW50cyA9IHN0YXRlbWVudHMuY29uY2F0KGNvbmRpdGlvbnMpO1xuXHRcdFx0XHRpZiAoc3RhdGVtZW50KSBzdGF0ZW1lbnRzLnB1c2goXCJcXHRcIiArIHN0YXRlbWVudCk7XG5cdFx0XHRcdHN0YXRlbWVudHMgPSBgIHtcXG4ke3N0YXRlbWVudHMuam9pbihcIlxcblwiKX1cXG4gfVxcbmA7XG5cdFx0XHRcdHRoaXMub3BlbnNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHRoaXMuY2xvc2VzQmxvY2sgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoY29uZGl0aW9ucy5sZW5ndGgpIHtcblx0XHRcdFx0c3RhdGVtZW50cyA9IGAge1xcbiR7Y29uZGl0aW9ucy5qb2luKFwiXFxuXCIpfWA7XG5cdFx0XHRcdHRoaXMub3BlbnNCbG9jayA9IHRydWU7XG5cdFx0XHR9XG4vL2RlYnVnZ2VyO1xuXHRcdFx0Ly8gQ3JlYXRlIGFzIGEgU1RBVElDIGZ1bmN0aW9uXG5cdC8vVE9ETzogY3JlYXRlIGFzIGFuIGluc3RhbmNlIGZ1bmN0aW9uIHdlIGNhbiBjYWxsIG9uIG91cnNlbGYhXG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke21ldGhvZE5hbWV9KCR7YXJnc30pJHtzdGF0ZW1lbnRzfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIEdldHRlciBlaXRoZXIgd2l0aCBvciB3aXRob3V0IGFyZ3VtZW50cy5cbi8vIElmIHlvdSBzcGVjaWZ5IGFyZ3VtZW50cywgeWllbGRzIGEgbm9ybWFsIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYSB2YWx1ZS5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZ2V0dGVyXCIsXG5cdFwiZ2V0IHtpZGVudGlmaWVyfSB7YXJnc30/IChcXFxcOik/IHtleHByZXNzaW9ufT9cIixcblx0Y2xhc3MgZ2V0dGVyIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3MsIGV4cHJlc3Npb24gfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGFyZ3MgPSAoQXJyYXkuaXNBcnJheShhcmdzKSA/IGFyZ3Muam9pbihcIiwgXCIpIDogXCJcIik7XG5cblx0XHRcdGlmIChhcmdzICYmIGV4cHJlc3Npb24pIHtcblx0XHRcdFx0dGhpcy5vcGVuc0Jsb2NrID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5jbG9zZXNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KSB7IHJldHVybiAoJHtleHByZXNzaW9ufSkgfWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChhcmdzKSB7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChleHByZXNzaW9uKSB7XG5cdFx0XHRcdHRoaXMub3BlbnNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHRoaXMuY2xvc2VzQmxvY2sgPSB0cnVlO1xuXHRcdFx0XHRyZXR1cm4gYGdldCAke2lkZW50aWZpZXJ9KCkgeyByZXR1cm4gKCR7ZXhwcmVzc2lvbn0pIH1gO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJldHVybiBgZ2V0ICR7aWRlbnRpZmllcn0oKWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fVxuKTtcblxuLy8gU2V0dGVyLlxuLy8gQ29tcGxhaW5zIGlmIHlvdSBzcGVjaWZ5IG1vcmUgdGhhbiBvbmUgYXJndW1lbnQuXG4vLyBJZiB5b3UgZG9uJ3QgcGFzcyBhbiBleHBsaWNpdCBhcmd1bWVudCwgd2UnbGwgYXNzdW1lIGl0J3MgdGhlIHNhbWUgYXMgdGhlIGlkZW50aWZpZXIuXG4vLyBlZztcdGBzZXQgY29sb3I6IHNldCB0aGUgY29sb3Igb2YgbXkgdGV4dCB0byBjb2xvcmBcbi8vXG4vLyBUT0RPOiBpbnRlcm5hbCBnZXR0ZXIvc2V0dGVyIHNlbWFudGljcyBhbGEgb2JqZWN0aXZlIENcbi8vXHRcdFx0YHNldCBjb2xvcjogaWYgY29sb3IgaXMgaW4gW1wicmVkXCIsIFwiYmx1ZVwiXSB0aGVuIHNldCBteSBjb2xvciB0byBjb2xvcmBcbi8vXHRcdCA9PiBgbXkgY29sb3JgIHdpdGhpbiBzZXR0ZXIgc2hvdWxkIGF1dG9tYXRpY2FsbHkgdHJhbnNsYXRlIHRvIGB0aGlzLl9jb2xvcmAgPz8/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcInNldHRlclwiLFxuXHRcInNldCB7aWRlbnRpZmllcn0ge2FyZ3N9PyAoXFxcXDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3Mgc2V0dGVyIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3MgPSBbaWRlbnRpZmllcl0sIHN0YXRlbWVudCA9IFwiXCIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIENvbXBsYWluIGlmIG1vcmUgdGhhbiBvbmUgYXJndW1lbnRcblx0XHRcdGlmIChhcmdzICYmIGFyZ3MubGVuZ3RoID4gMSkge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJwYXJzZSgnc2V0dGVyJyk6IG9ubHkgb25lIGFyZ3VtZW50IGFsbG93ZWQgaW4gc2V0dGVyOiAgXCIsIHRoaXMubWF0Y2hlZFRleHQpO1xuXHRcdFx0XHRhcmdzID0gWyBhcmdzWzBdIF07XG5cdFx0XHR9XG5cblx0XHRcdGlmICghc3RhdGVtZW50KSB7XG5cdFx0XHRcdHJldHVybiBgc2V0ICR7aWRlbnRpZmllcn0oJHthcmdzfSlgO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMub3BlbnNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHRoaXMuY2xvc2VzQmxvY2sgPSB0cnVlO1xuXHRcdFx0XHRyZXR1cm4gYHNldCAke2lkZW50aWZpZXJ9KCR7YXJnc30pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdGRlY2xhcmUgcHJvcGVydGllc1xuLy9cblxuLy9UT0RPOiBhbm90aGVyIG5hbWUgZm9yIGBjb25zdGFudGAgP1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwiKHNjb3BlOnByb3BlcnR5fGNvbnN0YW50fHNoYXJlZCBwcm9wZXJ0eSkge2lkZW50aWZpZXJ9ICg/Oj0ge3ZhbHVlOmV4cHJlc3Npb259KT9cIixcblx0Y2xhc3MgZGVjbGFyZV9wcm9wZXJ0eSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzY29wZSwgaWRlbnRpZmllciwgdmFsdWUgPSBcIlwiIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAodmFsdWUpIHZhbHVlID0gYCA9ICR7dmFsdWV9YDtcblxuXHRcdFx0bGV0IGRlY2xhcmF0aW9uID0gYCR7aWRlbnRpZmllcn0ke3ZhbHVlfWA7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdGlmICghdmFsdWUpIGNvbnNvbGUud2FybihcInBhcnNlKCdkZWNsYXJlX3Byb3BlcnR5Jyk6IGNvbnN0YW50IHByb3BlcnRpZXMgbXVzdCBkZWNsYXJlIGEgdmFsdWU6ICBcIiwgdGhpcy5tYXRjaGVkVGV4dCk7XG5cdFx0XHRcdFx0cmV0dXJuIGBjb25zdCAke2RlY2xhcmF0aW9ufWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZCBwcm9wZXJ0eVwiOlxuXHRcdFx0XHRcdHJldHVybiBgQHByb3RvICR7ZGVjbGFyYXRpb259YDtcblxuXHRcdFx0XHRjYXNlIFwicHJvcGVydHlcIjpcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRyZXR1cm4gZGVjbGFyYXRpb247XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiBzY29wZV9tb2RpZmllcj8/P1xuLy8gVE9ETzogaW5pdGlhbCB2YWx1ZVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5X29mX3R5cGVcIixcblx0XCJwcm9wZXJ0eSB7aWRlbnRpZmllcn0gYXMgKGF8YW4pPyB7dHlwZX1cIixcblx0Y2xhc3MgZGVjbGFyZV9wcm9wZXJ0eV9vZl90eXBlIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIHR5cGUgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgZ2V0ICR7aWRlbnRpZmllcn0oKSB7IHJldHVybiB0aGlzLl9fJHtpZGVudGlmaWVyfSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHNwZWxsLmlzQSh2YWx1ZSwgJHt0eXBlfSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gVE9ETzogd2FybiBvbiBpbnZhbGlkIHNldD8gIHNoYXJlZD8gIHVuZGVmaW5lZD8gc29tZXRoaW5nIG90aGVyIHRoYW4gdGhlIGZpcnN0IHZhbHVlIGFzIGRlZmF1bHQ/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlfYXNfb25lX29mXCIsXG5cdFwicHJvcGVydHkge2lkZW50aWZpZXJ9IGFzIG9uZSBvZiB7bGlzdDpsaXRlcmFsX2xpc3R9XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHlfYXNfb25lX29mIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBwbHVyYWwgPSBwbHVyYWxpemUoaWRlbnRpZmllcik7XG5cdFx0XHRyZXR1cm4gYEBwcm90byAke3BsdXJhbH0gPSAke2xpc3R9XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0oKSB7IHJldHVybiB0aGlzLl9fJHtpZGVudGlmaWVyfSA9PT0gdW5kZWZpbmVkID8gdGhpcy4ke3BsdXJhbH1bMF0gOiB0aGlzLl9fJHtpZGVudGlmaWVyfSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblxuLy8gTU9SRSBFRkZJQ0lFTlQgQlVUIFVHTElFUlxuLy8gXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHtsaXN0fTtcXG5gXG4vLyBcdFx0XHRcdCArIGBnZXQgJHtpZGVudGlmaWVyfSB7IHJldHVybiAoXCJfXyR7aWRlbnRpZmllcn1cIiBpbiB0aGlzID8gdGhpcy5fXyR7aWRlbnRpZmllcn0gOiAke2ZpcnN0VmFsdWV9KSB9XFxuYFxuLy8gXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuY29uc3RydWN0b3IuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRTZWxmLXJlZmVyZW5jZVxuLy9cbnBhcnNlci5hZGRLZXl3b3JkKFxuXHRbXCJtZVwiLCBcImV4cHJlc3Npb25cIl0sXG5cdFwibWVcIixcblx0Y2xhc3MgbWUgZXh0ZW5kcyBSdWxlLktleXdvcmQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiBcInRoaXNcIjtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFRPRE86IHRoaXMgcmVhbGx5IG1ha2VzIG1lIHdhbnQgdG8gbWFrZSBgSSBhbSBlbXB0eWAgZXRjIHdvcmsuLi5cbnBhcnNlci5hZGRLZXl3b3JkKFxuXHRbXCJJXCIsIFwiZXhwcmVzc2lvblwiXSxcblx0XCJJXCIsXG5cdGNsYXNzIEkgZXh0ZW5kcyBSdWxlLktleXdvcmQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiBcInRoaXNcIjtcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRQcm9wZXJ0eSBhY2Nlc3Ncbi8vXG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIocHJvcGVydGllczp0aGUge2lkZW50aWZpZXJ9IG9mKSsgdGhlPyB7ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Z2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBwcm9wZXJ0aWVzIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHByZXNzaW9uOiBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpLFxuXHRcdFx0XHRwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzLm1hdGNoZWQubWFwKCBwcm9wZXJ0eSA9PiBwcm9wZXJ0eS5yZXN1bHRzLmlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCkgKVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBwcm9wZXJ0aWVzIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRwcm9wZXJ0aWVzID0gcHJvcGVydGllcy5yZXZlcnNlKCkuam9pbihcIi5cIik7XG5cdFx0XHRyZXR1cm4gYCR7ZXhwcmVzc2lvbn0uJHtwcm9wZXJ0aWVzfWA7XG4vLyBOT1RFOiB0aGUgZm9sbG93aW5nIGlzIHNhZmVyLCBidXQgdWdseSBmb3IgZGVtbyBwdXJwb3Nlc1xuLy9cdFx0XHRyZXR1cm4gYHNwZWxsLmdldCgke2V4cHJlc3Npb259LCBbJyR7cHJvcGVydGllc30nXSlgO1xuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibXlfcHJvcGVydHlfZXhwcmVzc2lvblwiLFxuXHRcIihteXx0aGlzKSB7aWRlbnRpZmllcn1cIixcblx0Y2xhc3MgbXlfcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGB0aGlzLiR7aWRlbnRpZmllcn1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy90eXBlcy5qcyIsInZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxuLy8gVE9ETzogTmVlZCBiZXR0ZXIsIG1vcmUgY29tcGxldGUsIGFuZCBtb3JlIG1ldGhvZGljYWwga2V5IGRlZmluaXRpb25zXG5cbnZhciBLZXlzID0ge1xuICBiYWNrc3BhY2U6IDgsXG4gIGRlbDogNDYsXG4gIGRlbGV0ZTogNDYsXG4gIHRhYjogOSxcbiAgZW50ZXI6IDEzLFxuICAncmV0dXJuJzogMTMsXG4gIGVzYzogMjcsXG4gIHNwYWNlOiAzMixcbiAgbGVmdDogMzcsXG4gIHVwOiAzOCxcbiAgcmlnaHQ6IDM5LFxuICBkb3duOiA0MCxcbiAgJzsnOiAxODYsXG4gICc9JzogMTg3LFxuICAnLCc6IDE4OCxcbiAgJy0nOiAxODksXG4gICcuJzogMTkwLFxuICAnLyc6IDE5MSxcbiAgJ2AnOiAxOTIsXG4gICdbJzogMjE5LFxuICAnXFxcXCc6IDIyMCxcbiAgJ10nOiAyMjFcbn07XG5cbi8vIEFkZCB1cHBlcmNhc2UgdmVyc2lvbnMgb2Yga2V5cyBhYm92ZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHlcbk9iamVjdC5rZXlzKEtleXMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICByZXR1cm4gS2V5c1trZXkudG9VcHBlckNhc2UoKV0gPSBLZXlzW2tleV07XG59KTtcblxuJzAxMjM0NTY3ODknLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uIChudW0sIGluZGV4KSB7XG4gIHJldHVybiBLZXlzW251bV0gPSBpbmRleCArIDQ4O1xufSk7XG5cbidBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWicuc3BsaXQoJycpLmZvckVhY2goZnVuY3Rpb24gKGxldHRlciwgaW5kZXgpIHtcbiAgS2V5c1tsZXR0ZXJdID0gaW5kZXggKyA2NTtcbiAgS2V5c1tsZXR0ZXIudG9Mb3dlckNhc2UoKV0gPSBpbmRleCArIDY1O1xufSk7XG5cbi8vIGZuIGtleXNcblsxLCAyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMCwgMTEsIDEyXS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtLCBpbmRleCkge1xuICByZXR1cm4gS2V5c1snZicgKyBpbmRleF0gPSAxMTEgKyBpbmRleDtcbn0pO1xuXG5leHBvcnQgdmFyIG1vZGlmaWVycyA9IHtcbiAgY29udHJvbDogJ2N0cmwnLFxuICBjdHJsOiAnY3RybCcsXG4gIHNoaWZ0OiAnc2hpZnQnLFxuICBtZXRhOiAnbWV0YScsXG4gIGNtZDogJ21ldGEnLFxuICBjb21tYW5kOiAnbWV0YScsXG4gIG9wdGlvbjogJ2FsdCcsXG4gIGFsdDogJ2FsdCdcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBhbGxLZXlzKGFyZykge1xuICByZXR1cm4gYXJnID8gYXJnLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgfHwgKHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGFyZykpID09PSAnc3ltYm9sJyA6IFN5bWJvbCgnYWxsS2V5cycpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBLZXlzO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9rZXlzLmpzXG4vLyBtb2R1bGUgaWQgPSA5OVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiXSwic291cmNlUm9vdCI6IiJ9