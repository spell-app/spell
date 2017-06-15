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
	function Parser(properties) {
		_classCallCheck(this, Parser);

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
			var tokens = this.tokenize(text);
			// Bail if we didn't get any tokens back.
			//TODO: WARN?  ERROR?
			if (tokens === undefined) return undefined;

			// If we're not parsing `statements`, use only the first line and pop off indentation.
			if (ruleName !== "statements") {
				tokens = tokens[0];
				// remove whitespace from the start of the line
				if (tokens[0] instanceof _Tokenizer2.default.Whitespace) tokens = tokens.slice(1);
			}

			// Parse the rule or throw an exception if rule not found.
			return this.parseRuleOrDie(ruleName, tokens, 0, undefined, "parser.parse()");
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
			if (!result) throw new SyntaxError("parser.parse('" + ruleName + "', '" + string + "'): can't parse this");
			return result.toSource(this);
		}

		// Parse a named rule (defined in this parser or in any of our `imports`), returning the "best" match.
		// Returns `undefined` if no match.
		// Throws if NOBODY implements `ruleName`.
		//
		// NOTE: currently "best" is defined as the first rule in our `imports` which matches...

	}, {
		key: "parseRuleOrDie",
		value: function parseRuleOrDie(ruleName, tokens, startIndex, stack) {
			var callingContext = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : "parseRuleOrDie";

			// Keep track of whether rule was EVER found or not.
			var ruleFound = false;
			var imports = this.imports,
			    index = 0,
			    parser = void 0;
			var results = [];
			while (parser = imports[index++]) {
				var rule = parser._rules[ruleName];
				if (!rule) continue;
				var result = rule.parse(this, tokens, startIndex, stack);
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

		// Test whether a named rule MIGHT be found in head of stream.
		// Returns:
		//	- `true` if the rule MIGHT be matched.
		//	- `false` if there is no way the rule can be matched.
		//	- `undefined` if not determinstic (eg: no way to tell quickly).

	}, {
		key: "testRule",
		value: function testRule(ruleName, tokens, startIndex) {
			var imports = this.imports,
			    index = 0,
			    parser = void 0;
			while (parser = imports[index++]) {
				var rule = parser._rules[ruleName];
				if (!rule) continue;
				var result = rule.test(this, tokens, startIndex);
				if (result !== undefined) return result;
			}
		}

		//
		//### Tokenizing
		//

		// Given an arbitarary `text` string, tokenize it and return as an array of arrays of lines.
		// Returns `undefined` if result didn't produce any tokens.
		//TODO: `tokenize` returns tokensEnd, complain if `tokensEnd !== end`.
		//TESTME

	}, {
		key: "tokenize",
		value: function tokenize(text) {
			var tokens = _Tokenizer2.default.tokenize(text);
			if (!tokens || tokens.length === 0) return undefined;

			// Convert to lines.
			var lines = [[]];
			tokens.forEach(function (token) {
				// Skip whitespace which is not an indent.
				if (token instanceof _Tokenizer2.default.Whitespace && !token.isIndent) return;

				// add new array for each newline
				if (token === _Tokenizer2.default.NEWLINE) return lines.push([]);

				// otherwise just add to the last line
				lines[lines.length - 1].push(token);
			});
			return lines;
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
					throw new TypeError("Error defining rule " + ruleName + ": Only Sequence rules can be leftRecusive");
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
		// If successful, returns `{ startIndex, endIndex, slice }`
		// Throws if unsucessful.

	}, {
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
}(), _class.DEBUG = false, _class.REGISTRY = {}, _class.REGEXP_SPECIAL_CHARACTERS = function () {
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

var _class, _temp;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); //	# Parser Rules
//	Rules can be as simple as a string `Keyword` or a complex sequence of (nested) rules.
//
//	Parse a rule with `rule.parse(parser, tokens, startIndex, endIndex)`, this will either:
//		- return `undefined` if the rule doesn't match the head of the tokens, or
//		- return a CLONE of the rule with at least the following:
//			- `matched`		Results of your parse.
//			- `nextStart`	Place where next match should start (eg: one beyond what you matched).
//
//	The clone returned above can be manipulated with
//		- `rule.results`			Return matched arguments in a format suitable to do:
//		- `rule.toSource(context)`	Return javascript source to interpret the rule.
//


var _global = __webpack_require__(462);

var _global2 = _interopRequireDefault(_global);

var _Parser = __webpack_require__(147);

var _Parser2 = _interopRequireDefault(_Parser);

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

		// Attempt to match this rule between `startIndex` and `endIndex` of `tokens`.
		// Returns results of the parse or `undefined`.

	}, {
		key: "parse",
		value: function parse(parser, tokens) {
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var stack = arguments[3];

			return undefined;
		}

		// Test to see if bits of our rule are found ANYWHERE in the tokens.
		// Returns:
		//	- `true` if the rule MIGHT be matched.
		//	- `false` if there is no way the rule can be matched.
		//	- `undefined` if not determinstic (eg: no way to tell quickly).

	}, {
		key: "test",
		value: function test(parser, tokens) {
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

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
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var stack = arguments[3];

			if (!this.headStartsWith(this.match, tokens, startIndex)) return undefined;
			// if only one and we have a blacklist, make sure it's not in the blacklist!
			if (this.match.length === 1 && this.blacklist && this.blacklist[this.match[0]]) return undefined;

			return this.clone({
				matched: this.match.join(this.matchDelimiter),
				nextStart: startIndex + this.match.length
			});
		}

		// Does this match appear anywhere in the tokens?

	}, {
		key: "test",
		value: function test(parser, tokens) {
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			var matchStart = tokens.indexOf(this.match[0], startIndex);
			return matchStart !== -1 && this.headStartsWith(this.match, tokens, matchStart);
		}

		// Does the head of the tokens start with an array of matches?

	}, {
		key: "headStartsWith",
		value: function headStartsWith(matches, tokens) {
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			// Special case for one match, maybe premature optimization but...
			if (matches.length === 1) return matches[0] === tokens[startIndex];

			for (var i = 0; i < matches.length; i++) {
				if (matches[i] !== tokens[startIndex + i]) return false;
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

// Regex pattern.
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
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var stack = arguments[3];

			var token = tokens[startIndex];
			if (typeof token !== "string") return undefined;

			var match = token.match(this.pattern);
			if (!match) return undefined;

			// bail if present in blacklist
			var matched = match[0];
			if (this.blacklist && this.blacklist[matched]) return undefined;

			return this.clone({
				matched: matched,
				nextStart: startIndex + 1
			});
		}

		// Test to see if any of our pattern is found ANYWHERE in the tokens.

	}, {
		key: "test",
		value: function test(parser, tokens) {
			var _this6 = this;

			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			return tokens.slice(startIndex).some(function (token) {
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
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var stack = arguments[3];

			var result = parser.parseRuleOrDie(this.rule, tokens, startIndex, stack, "parse subrule '" + this.rule + "'");
			if (!result) return undefined;

			if (this.argument) result.argument = this.argument;
			return result;
		}

		// Test to see if any of our alternatives are found ANYWHERE in the tokens.

	}, {
		key: "test",
		value: function test(parser, tokens) {
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			return parser.testRule(this.rule, tokens, startIndex);
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
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var stack = arguments[3];

			// If we have a `testRule` defined
			if (this.testRule) {
				// Forget it if there is NO WAY the rule could be matched.
				if (parser.testRule(this.testRule, tokens, startIndex) === false) return undefined;
			}

			// If we're a leftRecursive sequence...
			if (this.leftRecursive) {
				// If the stack already contains this rule, forget it.
				if (stack && stack.includes(this)) return undefined;

				// Clone stack and add this rule for recursion...
				stack = stack ? stack.concat() : [];
				stack.push(this);

				// TODO: We could distinguish between productive and unproductive rules
				//		 by checking only rules which occur at the same `startIndex`...
				//		 This would probably allow more interesting things, but it's much much slower.
			}

			var matched = [];
			var nextStart = startIndex;
			var index = 0,
			    rule = undefined;
			while (rule = this.rules[index++]) {
				var _match = rule.parse(parser, tokens, nextStart, stack);
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

		// 	parseInChunks(parser, tokens, stack) {}

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
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			var index = 0,
			    rule = undefined;
			while (rule = this.rules[index++]) {
				if (rule.test(parser, tokens, startIndex)) return true;
			}
			return false;
		}

		// Find all rules which match and delegate to `getBestMatch()` to pick the best one.

	}, {
		key: "parse",
		value: function parse(parser, tokens) {
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var stack = arguments[3];

			var matches = [];
			var index = 0,
			    rule = undefined;
			while (rule = this.rules[index++]) {
				var _match2 = rule.parse(parser, tokens, startIndex, stack);
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
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var stack = arguments[3];

			var matched = [];
			var nextStart = startIndex;
			while (true) {
				var _match3 = this.rule.parse(parser, tokens, nextStart, stack);
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
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var stack = arguments[3];

			// ensure item and delimiter are optional so we don't barf in `parseRule`
			this.item.optional = true;
			this.delimiter.optional = true;

			var matched = [];
			var nextStart = startIndex;
			while (true) {
				// get next item, exiting if not found
				var item = this.item.parse(parser, tokens, nextStart, stack);
				if (!item) break;
				//console.log(item);
				matched.push(item);
				nextStart = item.nextStart;

				// get delimiter, exiting if not found
				var delimiter = this.delimiter.parse(parser, tokens, nextStart, stack);
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

// A `Scope` parses a nested scope, eg a type declaration or a method definition.
Rule.Scope = function (_Rule8) {
	_inherits(scope, _Rule8);

	function scope() {
		_classCallCheck(this, scope);

		return _possibleConstructorReturn(this, (scope.__proto__ || Object.getPrototypeOf(scope)).apply(this, arguments));
	}

	return scope;
}(Rule);

// `Statements` are a block of `Statement` that understand nesting and comments.
Rule.Statements = (_temp = _class = function (_Rule9) {
	_inherits(statements, _Rule9);

	function statements() {
		_classCallCheck(this, statements);

		return _possibleConstructorReturn(this, (statements.__proto__ || Object.getPrototypeOf(statements)).apply(this, arguments));
	}

	_createClass(statements, [{
		key: "getTabs",
		value: function getTabs(number) {
			if (typeof number !== "number") return "";
			return Rule.Statements.TABS.substr(0, number);
		}

		// `statements` is an array of arrays of tokens.
		//TODO: non-standard, other `parse()` routines will take a single line???

		// Return a certain `number` of tab characters.

	}, {
		key: "parse",
		value: function parse(parser, statements) {
			var lineNumber = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var stack = arguments[3];

			console.time("Rule.Statements.parse()");

			// Cut off the beginning if not on the first line...
			if (lineNumber !== 0) statements = statements.slice(lineNumber);

			var results = [];
			var lastIndent = 0;

			// Parse each line individually
			statements.forEach(function (tokens) {
				// add placeholders for empty lines
				if (tokens.length === 0) {
					return results.push(new Rule.BlankLine());
				}

				// figure out indent level of this line
				var indent = 0;
				// If we start with an indent
				if (tokens[0] instanceof Tokenizer.Whitespace && tokens[0].isIndent) {
					indent = tokens[0].length;
					// take the indent out of the statement start
					tokens = tokens.slice(1);
				}

				// If indent INCREASES, add open curly braces
				if (indent > lastIndent) {
					results.push(new Rule.OpenBlock({ indent: indent - 1 }));
				}
				// if line indent DECREASES, add one or more `CloseBlock`s
				else if (indent < lastIndent) {
						for (var _indent = lastIndent; _indent > _indent; _indent--) {
							results.push(new Rule.CloseBlock({ indent: _indent - 1 }));
						}
					}
				lastIndent = indent;

				// Attempt to parse a comment as the last item in the statement
				var lastItem = tokens.length - 1;
				var last = tokens[lastItem];
				var comment = void 0;
				if (last instanceof Tokenizer.Comment) {
					comment = parser.parseRuleOrDie("comment", tokens, lastItem);
					if (comment) {
						// Add comment BEFORE corresponding statement
						results.push(comment);

						// pop the comment off before matching the rest of the statement.
						tokens = tokens.slice(0, -1);
					}
				}

				// Parse
				var statement = parser.parseRuleOrDie("statement", tokens, 0);
				// complain if no statement and no comment
				if (!statement && !comment) {
					var _statement = tokens.join(" ");
					console.warn("Couldn't parse statement:\n\t" + _statement);
					results.push(new Rule.ParseError({
						error: "Can't parse statement",
						message: "CAN'T PARSE: " + _statement
					}));
					return;
				}

				// complain can't parse the entire line!
				if (statement && statement.nextStart !== tokens.length) {
					var _statement2 = tokens.join(" ");
					var unparsed = tokens.slice(_statement2.nextStart).join(" ");
					console.warn("Couldn't parse entire statement:", "\n\t\"" + _statement2 + "\"", "\nunparsed:", "\n\t\"" + unparsed + "\"");
					var error = new Rule.ParseError({
						error: "Can't parse entire statement",
						message: "CANT PARSE ENTIRE STATEMENT\n" + ("PARSED    : " + _statement2.matched + "\n") + ("CANT PARSE: " + unparsed)

					});
					results.push(error);
					return;
				}

				if (statement) {
					statement.indent = indent;
					results.push(statement);
				}
			});

			// Add closing curly braces as necessary
			//TODO: move ABOVE any blank lines
			while (lastIndent > 0) {
				var closeBlock = new Rule.CloseBlock({ indent: this.getTabs(lastIndent - 1) });
				results.push(closeBlock);
				--lastIndent;
			}
			console.timeEnd("Rule.Statements.parse()");

			return this.clone({
				matched: results,
				nextStart: statements.length
			});
		}
	}, {
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
				var indent = this.getTabs(_match4.indent);
				results.push(indent + source.split("\n").join("\n" + indent));
			}
			return results.join("\n");
		}
	}]);

	return statements;
}(Rule), _class.TABS = "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t", _temp);

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

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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

//
//	# Tokenizer
//	- `.tokenize()` 		Breaks up long string into tokens, including newlines, JSX expressions, etc.
//	- `.tokenizeLines()` 	Takes the above and breaks it into an array of arrays for each line.
//
// TODO: error checking / reporting, especially in JSX expressions.
// TODO: have normal `tokenize` stick whitespace elements in the stream, then `tokenizeLines()` takes them out?
var Tokenizer = {

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
		if (start >= end || !text.trim()) return undefined;

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

		var token = new Tokenizer.Whitespace(text.slice(start, whitespaceEnd));

		// if the char BEFORE start is a newline, consider this an "indent"
		if (start === 0 || text[start - 1] === "\n") token.isIndent = true;

		return [token, whitespaceEnd];
	},


	// Whitespace class
	Whitespace: function () {
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

			// Return true if this indent is all tabs

		}, {
			key: "isTabs",


			// Return true if this indent is all spaces
			get: function get() {
				return this.whitespace.split("").every(function (space) {
					return space === "\t";
				});
			}

			// Return true if this indent is mixed tabs and spaces

		}, {
			key: "isMixed",
			get: function get() {
				var firstChar = this.whitespace[0];
				return this.whitespace.split("").some(function (space) {
					return space !== firstChar;
				});
			}
		}]);

		return whitespace;
	}(),

	//
	//	### Newline
	//

	// Newline marker (singleton).
	NEWLINE: new function newline() {
		_classCallCheck(this, newline);
	}(),

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
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

		var lastIndex = syntaxStream.length;
		while (startIndex < lastIndex) {
			var _Rule$parseRuleSyntax = _Rule2.default.parseRuleSyntax_token(syntaxStream, rules, startIndex),
			    _Rule$parseRuleSyntax2 = _slicedToArray(_Rule$parseRuleSyntax, 2),
			    rule = _Rule$parseRuleSyntax2[0],
			    endIndex = _Rule$parseRuleSyntax2[1];

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


	KEYWORD_PATTERN: /[A-Za-z][\w_-]*/,

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

		var match = [],
		    endIndex = void 0;
		// eat keywords while they last
		for (var i = startIndex; i < syntaxStream.length; i++) {
			var next = syntaxStream[i];
			if (typeof next === "string" && next.match(_Rule2.default.KEYWORD_PATTERN)) {
				match.push(next);
				endIndex = i;
			} else break;
		}

		if (!constructor) constructor = _Rule2.default.Keyword;
		var rule = new constructor({ match: match });

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

		// If string starts with `\\`, it's an escaped literal (eg: `\[` needs to input as `\\[`).
		var isEscaped = string.startsWith("\\");
		var match = isEscaped ? string.substr(1) : string;

		var rule = new constructor({ match: match });

		if (isEscaped) {
			rule.toString = function () {
				return "\\" + match + (this.optional ? '?' : '');
			};
		}

		return [rule, startIndex];
	},


	// Match grouping expression `(...|...)` in syntax rules.
	// Returns `[ rule, endIndex ]`
	// You can specify an explicit `rule.argument` with:  `(somearg:...)`
	// You can specify that the results should be `promoted` to enclosing context with: `(?:...)`
	//
	// NOTE: nested parens may not have alternatives... :-(   `(a|(b|c))` won't work???
	parseRuleSyntax_parentheses: function parseRuleSyntax_parentheses(syntaxStream) {
		var rules = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

		var _Parser$findNestedTok = _Parser2.default.findNestedTokens(syntaxStream, "(", ")", startIndex),
		    endIndex = _Parser$findNestedTok.endIndex,
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
			return "}";
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
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var stack = arguments[3];

			var token = tokens[startIndex];
			if (!(token instanceof _Tokenizer2.default.Comment)) return undefined;
			return this.clone({
				matched: token,
				nextStart: startIndex + 1
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

// `number` as either float or integer, created with custom constructor for debugging.
// NOTE: you can also use `one`...`ten` as strings.'
// TODO:  `integer` and `decimal`?  too techy?
_RuleSyntax2.default.Number = (_temp = _class = function (_Rule$Pattern4) {
	_inherits(number, _Rule$Pattern4);

	function number() {
		_classCallCheck(this, number);

		return _possibleConstructorReturn(this, (number.__proto__ || Object.getPrototypeOf(number)).apply(this, arguments));
	}

	_createClass(number, [{
		key: "parse",


		// Numbers get encoded as numbers in the token stream.
		value: function parse(parser, tokens) {
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			var token = tokens[startIndex];
			// if a string, attempt to run through our NUMBER_NAMES
			if (typeof token === "string") token = _RuleSyntax2.default.Number.NUMBER_NAMES[token];
			if (typeof token !== "number") return undefined;
			return this.clone({
				matched: token,
				nextStart: startIndex + 1
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
}(_RuleSyntax2.default.Pattern), _class.NUMBER_NAMES = {
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
_RuleSyntax2.default.Text = function (_Rule$Pattern5) {
	_inherits(text, _Rule$Pattern5);

	function text() {
		_classCallCheck(this, text);

		return _possibleConstructorReturn(this, (text.__proto__ || Object.getPrototypeOf(text)).apply(this, arguments));
	}

	_createClass(text, [{
		key: "parse",

		// Text strings get encoded as `text` objects in the token stream.
		value: function parse(parser, tokens) {
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			var token = tokens[startIndex];
			if (!(token instanceof _Tokenizer2.default.Text)) return undefined;
			return this.clone({
				matched: token,
				nextStart: startIndex + 1
			});
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			return this.matched.quotedString;
		}
	}]);

	return text;
}(_RuleSyntax2.default.Pattern);
parser.addRule(["text", "expression"], _RuleSyntax2.default.Text);

// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
_RuleSyntax2.default.Boolean = function (_Rule$Pattern6) {
	_inherits(boolean, _Rule$Pattern6);

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

_RuleSyntax2.default.JSX = function (_Rule$Pattern) {
	_inherits(jsxElement, _Rule$Pattern);

	function jsxElement() {
		_classCallCheck(this, jsxElement);

		return _possibleConstructorReturn(this, (jsxElement.__proto__ || Object.getPrototypeOf(jsxElement)).apply(this, arguments));
	}

	_createClass(jsxElement, [{
		key: "parse",

		// Text strings get encoded as `text` objects in the token stream.
		value: function parse(parser, tokens) {
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			var token = tokens[startIndex];
			if (!(token instanceof _Tokenizer2.default.JSXElement)) return undefined;
			return this.clone({
				matched: token,
				nextStart: startIndex + 1
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
}(_RuleSyntax2.default.Pattern);

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

		return _ret = (_temp = (_this2 = _possibleConstructorReturn(this, (_ref = backwards_if.__proto__ || Object.getPrototypeOf(backwards_if)).call.apply(_ref, [this].concat(args))), _this2), _this2.leftRecursive = true, _temp), _possibleConstructorReturn(_this2, _ret);
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

// Set membership.
// NOTE: we will singularize `identifier` and use that as the argument to `expression`.
//TESTME
parser.addExpression("list_membership_test", "{list:expression} (operator:has|has no|doesnt have|does not have) {identifier} where {filter:expression}", function (_Rule$Expression9) {
	_inherits(list_membership_test, _Rule$Expression9);

	function list_membership_test() {
		_classCallCheck(this, list_membership_test);

		return _possibleConstructorReturn(this, (list_membership_test.__proto__ || Object.getPrototypeOf(list_membership_test)).apply(this, arguments));
	}

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvc3RvcmUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvfi9mYmpzL2xpYi9lbXB0eUZ1bmN0aW9uLmpzIiwid2VicGFjazovLy8uL34vcHJvcC10eXBlcy9+L2ZianMvbGliL2ludmFyaWFudC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVG9rZW5pemVyLmpzIiwid2VicGFjazovLy8uL34vY3NzLWxvYWRlci9saWIvY3NzLWJhc2UuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL2luZGV4LmpzIiwid2VicGFjazovLy8uL34vcHJvcC10eXBlcy9saWIvUmVhY3RQcm9wVHlwZXNTZWNyZXQuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvd2FybmluZy5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvZXZlbnRfaGFuZGxlcnMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9tYXRjaF9rZXlzLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvcGFyc2Vfa2V5cy5qcyIsIndlYnBhY2s6Ly8vLi9+L3N0eWxlLWxvYWRlci9hZGRTdHlsZXMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9TcGVsbEVkaXRvci5qc3giLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9SdWxlU3ludGF4LmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvRXhhbXBsZVN0b3JlLmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BhY2VyLmpzeCIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL1RhYmJhYmxlVGV4dEFyZWEuanN4Iiwid2VicGFjazovLy8uL3NyYy9hcHAvdXRpbC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvbWVtb2l6ZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMvZ2xvYmFsLmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BhY2VyLmxlc3MiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9zdHlsZXMubGVzcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvY2hlY2tQcm9wVHlwZXMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL2ZhY3RvcnlXaXRoVGhyb3dpbmdTaGltcy5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvZmFjdG9yeVdpdGhUeXBlQ2hlY2tlcnMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvY2xhc3NfZGVjb3JhdG9yLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL2luZGV4LmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL21ldGhvZF9kZWNvcmF0b3IuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvbWV0aG9kX2RlY29yYXRvcl9zY29wZWQuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2luZGV4LmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvYXJyYXkuZnJvbS5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2RvbV9oZWxwZXJzLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvbGlzdGVuZXJzLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvdXVpZC5qcyIsIndlYnBhY2s6Ly8vLi9+L3N0eWxlLWxvYWRlci9maXhVcmxzLmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BhY2VyLmxlc3M/MjJhZSIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL3N0eWxlcy5sZXNzP2IwMTIiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9pbmRleC5qc3giLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NvcmUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3V0aWxzL3N0cmluZy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvSlNYLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9hbGwuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2lmLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9saXN0cy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy90eXBlcy5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2tleXMuanMiXSwibmFtZXMiOlsiY29uc29sZSIsImdyb3VwIiwibG9nIiwiZ3JvdXBFbmQiLCJQYXJzZXIiLCJwcm9wZXJ0aWVzIiwiX3J1bGVzIiwiT2JqZWN0IiwiYXNzaWduIiwicnVsZU5hbWUiLCJ0ZXh0IiwiYXJndW1lbnRzIiwibGVuZ3RoIiwidG9rZW5zIiwidG9rZW5pemUiLCJ1bmRlZmluZWQiLCJXaGl0ZXNwYWNlIiwic2xpY2UiLCJwYXJzZVJ1bGVPckRpZSIsInJlc3VsdCIsInBhcnNlIiwiU3ludGF4RXJyb3IiLCJzdHJpbmciLCJ0b1NvdXJjZSIsInN0YXJ0SW5kZXgiLCJzdGFjayIsImNhbGxpbmdDb250ZXh0IiwicnVsZUZvdW5kIiwiaW1wb3J0cyIsImluZGV4IiwicGFyc2VyIiwicmVzdWx0cyIsInJ1bGUiLCJwdXNoIiwicmVkdWNlIiwibGFyZ2VzdCIsIm5leHQiLCJuZXh0U3RhcnQiLCJ0ZXN0IiwibGluZXMiLCJmb3JFYWNoIiwidG9rZW4iLCJpc0luZGVudCIsIk5FV0xJTkUiLCJfaW1wb3J0cyIsImNvbmNhdCIsInJldmVyc2UiLCJfX2ltcG9ydHMiLCJfX3J1bGVzIiwiQXJyYXkiLCJpc0FycmF5IiwiYWRkUnVsZSIsImV4aXN0aW5nIiwiQWx0ZXJuYXRpdmVzIiwiREVCVUciLCJydWxlcyIsImFyZ3VtZW50IiwicnVsZUlzTGVmdFJlY3Vyc2l2ZSIsIlNlcXVlbmNlIiwiVHlwZUVycm9yIiwiaW5mbyIsImxlZnRSZWN1cnNpdmUiLCJtYXAiLCJnZXRDb250ZXh0T3JEaWUiLCJvdXRwdXQiLCJhbHRlcm5hdGl2ZXMiLCJhbHRlcm5hdGl2ZSIsImNvbnRleHROYW1lIiwiUkVHSVNUUlkiLCJzdWJydWxlIiwib3B0aW9uYWwiLCJTdWJydWxlIiwic3RhcnRUb2tlbiIsImVuZFRva2VuIiwibmVzdGluZyIsIm5lc3RlZCIsImVuZEluZGV4IiwibGFzdEluZGV4Iiwic3BsaXQiLCJjaGFyIiwibGlzdCIsIlJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlMiLCJqb2luIiwiZmxhZ3MiLCJSZWdFeHAiLCJlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzIiwiY2hhcnMiLCJSdWxlIiwicHJvcHMiLCJjb25zdHJ1Y3RvciIsImJsYWNrbGlzdCIsIndvcmRzIiwid29yZCIsImNvbnRleHQiLCJtYXRjaGVkIiwibmFtZSIsIk1hdGNoIiwibWF0Y2giLCJoZWFkU3RhcnRzV2l0aCIsImNsb25lIiwibWF0Y2hEZWxpbWl0ZXIiLCJtYXRjaFN0YXJ0IiwiaW5kZXhPZiIsIm1hdGNoZXMiLCJpIiwicHJvdG90eXBlIiwiU3ltYm9sIiwiS2V5d29yZCIsIlBhdHRlcm4iLCJwYXR0ZXJuIiwic29tZSIsInNvdXJjZSIsInRlc3RSdWxlIiwiaW5jbHVkZXMiLCJwcm9tb3RlIiwiYWRkUmVzdWx0cyIsImFyZ05hbWUiLCJrZXlzIiwidmFsdWUiLCJrZXkiLCJjb21tZW50IiwiRXhwcmVzc2lvbiIsIlN0YXRlbWVudCIsImJlc3RNYXRjaCIsImdldEJlc3RNYXRjaCIsImJlc3QiLCJjdXJyZW50IiwiUmVwZWF0IiwiaXNDb21wb3VuZFJ1bGUiLCJMaXN0IiwiaXRlbSIsImRlbGltaXRlciIsIlNjb3BlIiwiU3RhdGVtZW50cyIsIm51bWJlciIsIlRBQlMiLCJzdWJzdHIiLCJzdGF0ZW1lbnRzIiwibGluZU51bWJlciIsInRpbWUiLCJsYXN0SW5kZW50IiwiQmxhbmtMaW5lIiwiaW5kZW50IiwiVG9rZW5pemVyIiwiT3BlbkJsb2NrIiwiQ2xvc2VCbG9jayIsImxhc3RJdGVtIiwibGFzdCIsIkNvbW1lbnQiLCJzdGF0ZW1lbnQiLCJ3YXJuIiwiUGFyc2VFcnJvciIsImVycm9yIiwibWVzc2FnZSIsInVucGFyc2VkIiwiY2xvc2VCbG9jayIsImdldFRhYnMiLCJ0aW1lRW5kIiwicHJldmlvdXMiLCJvcGVuc0Jsb2NrIiwiZGVmaW5lUHJvcGVydHkiLCJzdGFydCIsImVuZCIsInRyaW0iLCJlYXRUb2tlbnMiLCJtYXRjaFRvcFRva2VucyIsIm1ldGhvZCIsImNhbGwiLCJtYXRjaFdoaXRlc3BhY2UiLCJtYXRjaFdvcmQiLCJtYXRjaE51bWJlciIsIm1hdGNoTmV3bGluZSIsIm1hdGNoSlNYRWxlbWVudCIsIm1hdGNoVGV4dCIsIm1hdGNoQ29tbWVudCIsIm1hdGNoU3ltYm9sIiwiZWF0V2hpdGVzcGFjZSIsIndoaXRlU3BhY2VFbmQiLCJ3aGl0ZXNwYWNlRW5kIiwid2hpdGVzcGFjZSIsImV2ZXJ5Iiwic3BhY2UiLCJmaXJzdENoYXIiLCJXT1JEX1NUQVJUIiwiV09SRF9DSEFSIiwid29yZEVuZCIsIk5VTUJFUl9TVEFSVCIsIk5VTUJFUiIsIm51bWJlck1hdGNoIiwibWF0Y2hFeHByZXNzaW9uQXRIZWFkIiwibnVtYmVyU3RyIiwicGFyc2VGbG9hdCIsInF1b3RlU3ltYm9sIiwidGV4dEVuZCIsInF1b3RlZFN0cmluZyIsIlRleHQiLCJDT01NRU5UIiwiY29tbWVudFN0YXJ0IiwibGluZSIsImdldExpbmVBdEhlYWQiLCJjb21tZW50TWF0Y2giLCJjb21tZW50U3ltYm9sIiwibWF0Y2hKU1hTdGFydFRhZyIsImpzeEVsZW1lbnQiLCJpc1VuYXJ5VGFnIiwibWF0Y2hKU1hDaGlsZHJlbiIsInRhZ05hbWUiLCJjaGlsZHJlbiIsImNoaWxkRW5kIiwiSlNYX1RBR19TVEFSVCIsInRhZ01hdGNoIiwiZW5kQml0IiwiSlNYRWxlbWVudCIsIm1hdGNoSlNYQXR0cmlidXRlIiwiYXR0cnMiLCJhdHRyRW5kIiwiYXR0cmlidXRlcyIsImF0dHJzQXNTdHJpbmciLCJjaGlsZHJlbkFzU3RyaW5nIiwiYXR0ciIsImNoaWxkIiwiZW5kVGFnIiwibWF0Y2hKU1hDaGlsZCIsIm1hdGNoSlNYRW5kVGFnIiwibWF0Y2hKU1hFeHByZXNzaW9uIiwibWF0Y2hKU1hUZXh0IiwibWF0Y2hTdHJpbmdBdEhlYWQiLCJKU1hfQVRUUklCVVRFX1NUQVJUIiwiZXF1YWxzIiwiYXR0cmlidXRlIiwiSlNYQXR0cmlidXRlIiwibWF0Y2hKU1hBdHRyaWJ1dGVWYWx1ZSIsInZhbHVlRW5kIiwibWF0Y2hKU1hBdHRyaWJ1dGVWYWx1ZUlkZW50aWZpZXIiLCJKU1hFeHByZXNzaW9uIiwiZmluZE1hdGNoaW5nQXRIZWFkIiwiY29udGVudHMiLCJleHByZXNzaW9uIiwiSlNYX1RFWFRfRU5EX0NIQVJTIiwiZmluZEZpcnN0QXRIZWFkIiwianN4VGV4dCIsIm5ld2xpbmUiLCJzdHJpbmdFbmQiLCJoZWFkIiwic3RhcnREZWxpbWl0ZXIiLCJlbmREZWxpbWl0ZXIiLCJhZnRlclF1b3RlIiwiU3BlbGxFZGl0b3IiLCJ3aW5kb3ciLCJleGFtcGxlcyIsImxvYWQiLCJzcGVsbEVkaXRvciIsInNhdmUiLCJyZXZlcnQiLCJjb21waWxlIiwiY3JlYXRlIiwiZGVsZXRlIiwicmVuYW1lIiwiZHVwbGljYXRlIiwicmVzZXQiLCJ0aXRsZXMiLCJzZWxlY3RlZCIsImRpcnR5IiwiY29kZSIsIm9wdGlvbnMiLCJ0aXRsZSIsImNvbnRlbnQiLCJvbkNsaWNrIiwic2VsZWN0IiwiZGlydHlCdXR0b25zIiwicG9zaXRpb24iLCJyaWdodCIsInRvcCIsIm1hcmdpbiIsImNvbXBpbGVCdXR0b24iLCJ3aWR0aCIsImxlZnQiLCJoZWlnaHQiLCJwYWRkaW5nVG9wIiwiZXZlbnQiLCJ1cGRhdGUiLCJ0YXJnZXQiLCJDb21wb25lbnQiLCJkZWZhdWx0UHJvcHMiLCJleHBvcnRzIiwiYmluZCIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJwb3AiLCJzeW50YXhUb2tlbiIsInBhcnNlUnVsZVN5bnRheF9zeW1ib2wiLCJwYXJzZVJ1bGVTeW50YXhfc3VicnVsZSIsInBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyIsInBhcnNlUnVsZVN5bnRheF9saXN0IiwicGFyc2VSdWxlU3ludGF4X3JlcGVhdCIsIktFWVdPUkRfUEFUVEVSTiIsInBhcnNlUnVsZVN5bnRheF9rZXl3b3JkIiwiaXNFc2NhcGVkIiwic3RhcnRzV2l0aCIsInRvU3RyaW5nIiwiZmluZE5lc3RlZFRva2VucyIsImdyb3VwQWx0ZXJuYXRpdmVzIiwic3ltYm9sIiwicGFyYW1zIiwiYmFuZ1Bvc2l0aW9uIiwibm90IiwiZGVmaW5lUHJvcGVydGllcyIsImFkZFNlcXVlbmNlIiwicnVsZVN5bnRheCIsImUiLCJhZGRTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiYWRkTGlzdCIsInN0cmVhbSIsImFkZEtleXdvcmQiLCJhZGRTeW1ib2wiLCJFeGFtcGxlU3RvcmUiLCJsb2NhbFN0b3JhZ2UiLCJzcGVsbEVkaXRvckV4YW1wbGVzIiwic3BlbGxFZGl0b3JFeGFtcGxlIiwibG9jYXRpb24iLCJyZWxvYWQiLCJKU09OIiwiX3NhdmVkRXhhbXBsZXMiLCJzdHJpbmdpZnkiLCJleGFtcGxlIiwic2tpcFNhdmUiLCJzaG93Q29uZmlybSIsImNvbmZpcm0iLCJwcm9tcHQiLCJvbGROYW1lIiwibmV3TmFtZSIsInNldFRpbWVvdXQiLCJTcGFjZXIiLCJjbGFzc05hbWUiLCJhcHBlYXJhbmNlIiwic2l6ZSIsImlubGluZSIsImZsdWlkIiwidGlueSIsInNtYWxsIiwibWVkaXVtIiwibGFyZ2UiLCJodWdlIiwibWFzc2l2ZSIsInNwYWNlclByb3BzIiwic3R5bGUiLCJwcm9wVHlwZXMiLCJib29sIiwiVGFiYmFibGVUZXh0QXJlYSIsIm9uS2V5RG93biIsImtleUNvZGUiLCJwcmV2ZW50RGVmYXVsdCIsImVsZW1lbnQiLCJzZWxlY3Rpb25TdGFydCIsInNlbGVjdGlvbkVuZCIsIm5ld1RleHQiLCJzaGlmdEtleSIsImxhc3RJbmRleE9mIiwib25DaGFuZ2UiLCJjbGFzc05hbWVzIiwiYXJncyIsImFyZyIsImZpbHRlciIsIkJvb2xlYW4iLCJtZW1vaXplZCIsImRlZmluZU1lbW9pemVkIiwicHJvcGVydHkiLCJnZXR0ZXIiLCJhcHBseSIsImNvbmZpZ3VyYWJsZSIsImdldCIsImdsb2JhbF9pZGVudGlmaWVyIiwiZ2xvYmFsIiwic2VsZiIsInJlbmRlciIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJmb3JDb250ZXh0IiwiV29yZCIsInJlcGxhY2UiLCJJZGVudGlmaWVyIiwiaWRlbnRpZmllciIsImFkZFRvQmxhY2tsaXN0IiwiVHlwZSIsInR5cGUiLCJOdW1iZXIiLCJOVU1CRVJfTkFNRVMiLCJ6ZXJvIiwib25lIiwidHdvIiwidGhyZWUiLCJmb3VyIiwiZml2ZSIsInNpeCIsInNldmVuIiwiZWlnaHQiLCJuaW5lIiwidGVuIiwiZ2V0TWF0Y2hlZFNvdXJjZSIsImVuZHNXaXRoIiwicGx1cmFsaXplIiwiaXNQbHVyYWwiLCJzaW5ndWxhcml6ZSIsImlzU2luZ3VsYXIiLCJhbGxFeHBvcnRzIiwiU1RSSU5HIiwiSlNYIiwianN4RXhwcmVzc2lvblRvU291cmNlIiwiY2hpbGRTb3VyY2UiLCJqc3hFbGVtZW50VG9Tb3VyY2UiLCJqc3hFeHByZXNzaW9uIiwiYXR0cnNUb1NvdXJjZSIsImNoaWxkcmVuVG9Tb3VyY2UiLCJpbXBvcnQiLCJjb25kaXRpb24iLCJlbHNlU3RhdGVtZW50IiwidGhpbmciLCJvcmRpbmFsIiwib3BlcmF0b3IiLCJiYW5nIiwiaXRlbVZhciIsInBvc2l0aW9uVmFyIiwibGhzIiwicmhzIiwidG9KUyIsInByZWNlZGVuY2UiLCJhIiwiYiIsIm9rQnV0dG9uIiwiY2FuY2VsQnV0dG9uIiwic3VwZXJUeXBlIiwicHJvcCIsImNsb3Nlc0Jsb2NrIiwia2V5d29yZHMiLCJ0eXBlcyIsInRvTG93ZXJDYXNlIiwibWV0aG9kTmFtZSIsImNvbmRpdGlvbnMiLCJtYXRjaGVkVGV4dCIsInNjb3BlIiwiZGVjbGFyYXRpb24iLCJwbHVyYWwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUFBLGtDQUFrQyxpQ0FBaUMsZUFBZSxlQUFlLGdCQUFnQixvQkFBb0IsTUFBTSwwQ0FBMEMsK0JBQStCLGFBQWEscUJBQXFCLG1DQUFtQyxFQUFFLEVBQUUsY0FBYyxXQUFXLFVBQVUsRUFBRSxVQUFVLE1BQU0seUNBQXlDLEVBQUUsVUFBVSxrQkFBa0IsRUFBRSxFQUFFLGFBQWEsRUFBRSwyQkFBMkIsMEJBQTBCLFlBQVksRUFBRSwyQ0FBMkMsOEJBQThCLEVBQUUsT0FBTyw2RUFBNkUsRUFBRSxHQUFHLEVBQUU7O0FBRXJwQixrQ0FBa0MsMEJBQTBCLDBDQUEwQyxnQkFBZ0IsT0FBTyxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsT0FBTyx3QkFBd0IsRUFBRTs7QUFFak07QUFDQTtBQUNBO0FBQ0E7QUFDa0I7QUFDbEI7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYSxPQUFPO0FBQ3BCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHOzs7QUFHSDtBQUNBO0FBQ0E7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Q0E7QUFDQSxVQUFVO0FBQ1YsNkJBQTZCO0FBQzdCLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBLCtCQUErQixLQUFLO0FBQ3BDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1QsNEJBQTRCO0FBQzVCLE9BQU87QUFDUDtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQXFCLHNCQUFzQjtBQUMzQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLHFCQUFxQiwyQkFBMkI7QUFDaEQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EscUJBQXFCLGdDQUFnQztBQUNyRDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEseURBQWdCLGdIOzs7Ozs7OztBQzNFaEI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOzs7QUFHSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7OztBQUdIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7O0FBR0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLGtFOzs7Ozs7OztBQ2hFQTtBQUFBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEM7Ozs7Ozs7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0NBQXdDLFdBQVcsRUFBRTtBQUNyRCx3Q0FBd0MsV0FBVyxFQUFFOztBQUVyRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBLHNDQUFzQztBQUN0QyxHQUFHO0FBQ0g7QUFDQSw4REFBOEQ7QUFDOUQ7O0FBRUE7QUFDQTtBQUNBLEVBQUU7O0FBRUY7QUFDQTtBQUNBOzs7Ozs7OztBQ3hG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VyxzQkFDWEEsVUFEVztBQUFBLE9BQ0N4TyxVQURELHNCQUNDQSxVQUREOztBQUVqQkEsZ0JBQWFBLFdBQVd5QyxPQUFYLEdBQXFCb0MsSUFBckIsQ0FBMEIsR0FBMUIsQ0FBYjtBQUNBLFVBQVUySixVQUFWLFNBQXdCeE8sVUFBeEI7QUFDSDtBQUNBO0FBQ0c7QUFsQkg7O0FBQUE7QUFBQSxFQUdtQyxxQkFBS29ILFVBSHhDOztBQXNCQTNGLE9BQU8rUixhQUFQLENBQ0Msd0JBREQsRUFFQyx3QkFGRDtBQUFBOztBQUFBO0FBQUE7O0FBQUE7QUFBQTs7QUFBQTtBQUFBO0FBQUEsMkJBSVdoTyxPQUpYLEVBSW9CO0FBQUEsNkJBQ0ksS0FBS3dULGdCQUFMLENBQXNCeFQsT0FBdEIsQ0FESjtBQUFBLE9BQ1h1UyxVQURXLHVCQUNYQSxVQURXOztBQUVqQixvQkFBZUEsVUFBZjtBQUNBO0FBUEg7O0FBQUE7QUFBQSxFQUdzQyxxQkFBSzNRLFVBSDNDLEc7Ozs7Ozs7OztBQ3pYQTtBQUFBLG9HQUFvRyxtQkFBbUIsRUFBRSxtQkFBbUIsOEhBQThIOztBQUUxUTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBLENBQUM7O0FBRUQ7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsNkQiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIF9zbGljZWRUb0FycmF5ID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBzbGljZUl0ZXJhdG9yKGFyciwgaSkgeyB2YXIgX2FyciA9IFtdOyB2YXIgX24gPSB0cnVlOyB2YXIgX2QgPSBmYWxzZTsgdmFyIF9lID0gdW5kZWZpbmVkOyB0cnkgeyBmb3IgKHZhciBfaSA9IGFycltTeW1ib2wuaXRlcmF0b3JdKCksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7IF9hcnIucHVzaChfcy52YWx1ZSk7IGlmIChpICYmIF9hcnIubGVuZ3RoID09PSBpKSBicmVhazsgfSB9IGNhdGNoIChlcnIpIHsgX2QgPSB0cnVlOyBfZSA9IGVycjsgfSBmaW5hbGx5IHsgdHJ5IHsgaWYgKCFfbiAmJiBfaVtcInJldHVyblwiXSkgX2lbXCJyZXR1cm5cIl0oKTsgfSBmaW5hbGx5IHsgaWYgKF9kKSB0aHJvdyBfZTsgfSB9IHJldHVybiBfYXJyOyB9IHJldHVybiBmdW5jdGlvbiAoYXJyLCBpKSB7IGlmIChBcnJheS5pc0FycmF5KGFycikpIHsgcmV0dXJuIGFycjsgfSBlbHNlIGlmIChTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KGFycikpIHsgcmV0dXJuIHNsaWNlSXRlcmF0b3IoYXJyLCBpKTsgfSBlbHNlIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgYXR0ZW1wdCB0byBkZXN0cnVjdHVyZSBub24taXRlcmFibGUgaW5zdGFuY2VcIik7IH0gfTsgfSgpO1xuXG5mdW5jdGlvbiBfdG9Db25zdW1hYmxlQXJyYXkoYXJyKSB7IGlmIChBcnJheS5pc0FycmF5KGFycikpIHsgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBBcnJheShhcnIubGVuZ3RoKTsgaSA8IGFyci5sZW5ndGg7IGkrKykgeyBhcnIyW2ldID0gYXJyW2ldOyB9IHJldHVybiBhcnIyOyB9IGVsc2UgeyByZXR1cm4gQXJyYXkuZnJvbShhcnIpOyB9IH1cblxuLyoqXG4gKiBAbW9kdWxlIHN0b3JlXG4gKlxuICovXG5pbXBvcnQgeyBhbGxLZXlzIH0gZnJvbSAnLi9saWIva2V5cyc7XG5pbXBvcnQgbWF0Y2hLZXlzIGZyb20gJy4vbGliL21hdGNoX2tleXMnO1xuaW1wb3J0IHBhcnNlS2V5cyBmcm9tICcuL2xpYi9wYXJzZV9rZXlzJztcbmltcG9ydCB1dWlkIGZyb20gJy4vbGliL3V1aWQnO1xuXG4vKipcbiAqIHByaXZhdGVcbiAqIFxuICovXG5cbi8vIGRpY3QgZm9yIGNsYXNzIHByb3RvdHlwZXMgPT4gYmluZGluZ3NcbnZhciBfaGFuZGxlcnMgPSBuZXcgTWFwKCk7XG5cbi8vIGFsbCBtb3VudGVkIGluc3RhbmNlcyB0aGF0IGhhdmUga2V5YmluZGluZ3NcbnZhciBfaW5zdGFuY2VzID0gbmV3IFNldCgpO1xuXG4vLyBmb3IgdGVzdGluZ1xuZXhwb3J0IGZ1bmN0aW9uIF9yZXNldFN0b3JlKCkge1xuICBfaGFuZGxlcnMuY2xlYXIoKTtcbiAgX2luc3RhbmNlcy5jbGVhcigpO1xufVxuXG4vKipcbiAqIHB1YmxpY1xuICpcbiAqL1xuXG52YXIgU3RvcmUgPSB7XG5cbiAgLyoqXG4gICAqIGFjdGl2YXRlXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSBJbnN0YW50aWF0ZWQgY2xhc3MgdGhhdCBleHRlbmRlZCBSZWFjdC5Db21wb25lbnQsIHRvIGJlIGZvY3VzZWQgdG8gcmVjZWl2ZSBrZXlkb3duIGV2ZW50c1xuICAgKi9cbiAgYWN0aXZhdGU6IGZ1bmN0aW9uIGFjdGl2YXRlKGluc3RhbmNlcykge1xuICAgIHZhciBpbnN0YW5jZXNBcnJheSA9IFtdLmNvbmNhdChpbnN0YW5jZXMpO1xuXG4gICAgLy8gaWYgbm8gY29tcG9uZW50cyB3ZXJlIGZvdW5kIGFzIGFuY2VzdG9ycyBvZiB0aGUgZXZlbnQgdGFyZ2V0LFxuICAgIC8vIGVmZmVjdGl2ZWx5IGRlYWN0aXZhdGUga2V5ZG93biBoYW5kbGluZyBieSBjYXBwaW5nIHRoZSBzZXQgb2YgaW5zdGFuY2VzXG4gICAgLy8gd2l0aCBgbnVsbGAuXG4gICAgaWYgKCFpbnN0YW5jZXNBcnJheS5sZW5ndGgpIHtcbiAgICAgIF9pbnN0YW5jZXMuYWRkKG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfaW5zdGFuY2VzLmRlbGV0ZShudWxsKTtcblxuICAgICAgLy8gZGVsZXRpbmcgYW5kIHRoZW4gYWRkaW5nIHRoZSBpbnN0YW5jZShzKSBoYXMgdGhlIGVmZmVjdCBvZiBzb3J0aW5nIHRoZSBzZXRcbiAgICAgIC8vIGFjY29yZGluZyB0byBpbnN0YW5jZSBhY3RpdmF0aW9uIChhc2NlbmRpbmcpXG4gICAgICBpbnN0YW5jZXNBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICBfaW5zdGFuY2VzLmRlbGV0ZShpbnN0YW5jZSk7XG4gICAgICAgIF9pbnN0YW5jZXMuYWRkKGluc3RhbmNlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiBkZWxldGVJbnN0YW5jZVxuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IEluc3RhbnRpYXRlZCBjbGFzcyB0aGF0IGV4dGVuZGVkIFJlYWN0LkNvbXBvbmVudFxuICAgKiBAcmV0dXJuIHtib29sZWFufSBUaGUgdmFsdWUgc2V0LmhhcyggdGFyZ2V0ICkgd291bGQgaGF2ZSByZXR1cm5lZCBwcmlvciB0byBkZWxldGlvblxuICAgKi9cbiAgZGVsZXRlSW5zdGFuY2U6IGZ1bmN0aW9uIGRlbGV0ZUluc3RhbmNlKHRhcmdldCkge1xuICAgIF9pbnN0YW5jZXMuZGVsZXRlKHRhcmdldCk7XG4gIH0sXG4gIGZpbmRCaW5kaW5nRm9yRXZlbnQ6IGZ1bmN0aW9uIGZpbmRCaW5kaW5nRm9yRXZlbnQoZXZlbnQpIHtcbiAgICBpZiAoIV9pbnN0YW5jZXMuaGFzKG51bGwpKSB7XG4gICAgICB2YXIga2V5TWF0Y2hlc0V2ZW50ID0gZnVuY3Rpb24ga2V5TWF0Y2hlc0V2ZW50KGtleVNldCkge1xuICAgICAgICByZXR1cm4gbWF0Y2hLZXlzKHsga2V5U2V0OiBrZXlTZXQsIGV2ZW50OiBldmVudCB9KTtcbiAgICAgIH07XG5cbiAgICAgIC8vIGxvb3AgdGhyb3VnaCBpbnN0YW5jZXMgaW4gcmV2ZXJzZSBhY3RpdmF0aW9uIG9yZGVyIHNvIHRoYXQgbW9zdFxuICAgICAgLy8gcmVjZW50bHkgYWN0aXZhdGVkIGluc3RhbmNlIGdldHMgZmlyc3QgZGlicyBvbiBldmVudFxuICAgICAgdmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlO1xuICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yID0gZmFsc2U7XG4gICAgICB2YXIgX2l0ZXJhdG9yRXJyb3IgPSB1bmRlZmluZWQ7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGZvciAodmFyIF9pdGVyYXRvciA9IFtdLmNvbmNhdChfdG9Db25zdW1hYmxlQXJyYXkoX2luc3RhbmNlcykpLnJldmVyc2UoKVtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSAoX3N0ZXAgPSBfaXRlcmF0b3IubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWUpIHtcbiAgICAgICAgICB2YXIgaW5zdGFuY2UgPSBfc3RlcC52YWx1ZTtcblxuICAgICAgICAgIHZhciBiaW5kaW5ncyA9IHRoaXMuZ2V0QmluZGluZyhpbnN0YW5jZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuICAgICAgICAgIHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IHRydWU7XG4gICAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yMiA9IGZhbHNlO1xuICAgICAgICAgIHZhciBfaXRlcmF0b3JFcnJvcjIgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yMiA9IGJpbmRpbmdzW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXAyOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gKF9zdGVwMiA9IF9pdGVyYXRvcjIubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlKSB7XG4gICAgICAgICAgICAgIHZhciBfc3RlcDIkdmFsdWUgPSBfc2xpY2VkVG9BcnJheShfc3RlcDIudmFsdWUsIDIpLFxuICAgICAgICAgICAgICAgICAga2V5U2V0cyA9IF9zdGVwMiR2YWx1ZVswXSxcbiAgICAgICAgICAgICAgICAgIGZuID0gX3N0ZXAyJHZhbHVlWzFdO1xuXG4gICAgICAgICAgICAgIGlmIChhbGxLZXlzKGtleVNldHMpIHx8IGtleVNldHMuc29tZShrZXlNYXRjaGVzRXZlbnQpKSB7XG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIHdoZW4gbWF0Y2hpbmcga2V5YmluZGluZyBpcyBmb3VuZCAtIGkuZS4gb25seSBvbmVcbiAgICAgICAgICAgICAgICAvLyBrZXlib3VuZCBjb21wb25lbnQgY2FuIHJlc3BvbmQgdG8gYSBnaXZlbiBrZXkgY29kZS4gdG8gZ2V0IGFyb3VuZCB0aGlzLFxuICAgICAgICAgICAgICAgIC8vIHNjb3BlIGEgY29tbW9uIGFuY2VzdG9yIGNvbXBvbmVudCBjbGFzcyB3aXRoIEBrZXlkb3duIGFuZCB1c2VcbiAgICAgICAgICAgICAgICAvLyBAa2V5ZG93blNjb3BlZCB0byBiaW5kIHRoZSBkdXBsaWNhdGUga2V5cyBpbiB5b3VyIGNoaWxkIGNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAvLyAob3IganVzdCBpbnNwZWN0IG5leHRQcm9wcy5rZXlkb3duLmV2ZW50KS5cbiAgICAgICAgICAgICAgICByZXR1cm4geyBmbjogZm4sIGluc3RhbmNlOiBpbnN0YW5jZSB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBfZGlkSXRlcmF0b3JFcnJvcjIgPSB0cnVlO1xuICAgICAgICAgICAgX2l0ZXJhdG9yRXJyb3IyID0gZXJyO1xuICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yICYmIF9pdGVyYXRvcjIucmV0dXJuKSB7XG4gICAgICAgICAgICAgICAgX2l0ZXJhdG9yMi5yZXR1cm4oKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgaWYgKF9kaWRJdGVyYXRvckVycm9yMikge1xuICAgICAgICAgICAgICAgIHRocm93IF9pdGVyYXRvckVycm9yMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIF9kaWRJdGVyYXRvckVycm9yID0gdHJ1ZTtcbiAgICAgICAgX2l0ZXJhdG9yRXJyb3IgPSBlcnI7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiAmJiBfaXRlcmF0b3IucmV0dXJuKSB7XG4gICAgICAgICAgICBfaXRlcmF0b3IucmV0dXJuKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIGlmIChfZGlkSXRlcmF0b3JFcnJvcikge1xuICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3I7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIGdldEJpbmRpbmdcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBDbGFzcyB1c2VkIGFzIGtleSBpbiBkaWN0IG9mIGtleSBiaW5kaW5nc1xuICAgKiBAcmV0dXJuIHtvYmplY3R9IFRoZSBvYmplY3QgY29udGFpbmluZyBiaW5kaW5ncyBmb3IgdGhlIGdpdmVuIGNsYXNzXG4gICAqL1xuICBnZXRCaW5kaW5nOiBmdW5jdGlvbiBnZXRCaW5kaW5nKF9yZWYpIHtcbiAgICB2YXIgX19yZWFjdEtleWRvd25VVUlEID0gX3JlZi5fX3JlYWN0S2V5ZG93blVVSUQ7XG5cbiAgICByZXR1cm4gX2hhbmRsZXJzLmdldChfX3JlYWN0S2V5ZG93blVVSUQpO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIGdldEluc3RhbmNlc1xuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAcmV0dXJuIHtzZXR9IEFsbCBzdG9yZWQgaW5zdGFuY2VzIChhbGwgbW91bnRlZCBjb21wb25lbnQgaW5zdGFuY2VzIHdpdGgga2V5YmluZGluZ3MpXG4gICAqL1xuICBnZXRJbnN0YW5jZXM6IGZ1bmN0aW9uIGdldEluc3RhbmNlcygpIHtcbiAgICByZXR1cm4gX2luc3RhbmNlcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBpc0VtcHR5XG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqIEByZXR1cm4ge251bWJlcn0gU2l6ZSBvZiB0aGUgc2V0IG9mIGFsbCBzdG9yZWQgaW5zdGFuY2VzXG4gICAqL1xuICBpc0VtcHR5OiBmdW5jdGlvbiBpc0VtcHR5KCkge1xuICAgIHJldHVybiAhX2luc3RhbmNlcy5zaXplO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIHNldEJpbmRpbmdcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICogQHBhcmFtIHtvYmplY3R9IGFyZ3MgQWxsIGFyZ3VtZW50cyBuZWNlc3NhcnkgdG8gc2V0IHRoZSBiaW5kaW5nXG4gICAqIEBwYXJhbSB7YXJyYXl9IGFyZ3Mua2V5cyBLZXkgY29kZXMgdGhhdCBzaG91bGQgdHJpZ2dlciB0aGUgZm5cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gYXJncy5mbiBUaGUgY2FsbGJhY2sgdG8gYmUgdHJpZ2dlcmVkIHdoZW4gZ2l2ZW4ga2V5cyBhcmUgcHJlc3NlZFxuICAgKiBAcGFyYW0ge29iamVjdH0gYXJncy50YXJnZXQgVGhlIGRlY29yYXRlZCBjbGFzc1xuICAgKi9cbiAgc2V0QmluZGluZzogZnVuY3Rpb24gc2V0QmluZGluZyhfcmVmMikge1xuICAgIHZhciBrZXlzID0gX3JlZjIua2V5cyxcbiAgICAgICAgZm4gPSBfcmVmMi5mbixcbiAgICAgICAgdGFyZ2V0ID0gX3JlZjIudGFyZ2V0O1xuXG4gICAgdmFyIGtleVNldHMgPSBrZXlzID8gcGFyc2VLZXlzKGtleXMpIDogYWxsS2V5cygpO1xuICAgIHZhciBfX3JlYWN0S2V5ZG93blVVSUQgPSB0YXJnZXQuX19yZWFjdEtleWRvd25VVUlEO1xuXG4gICAgaWYgKCFfX3JlYWN0S2V5ZG93blVVSUQpIHtcbiAgICAgIHRhcmdldC5fX3JlYWN0S2V5ZG93blVVSUQgPSB1dWlkKCk7XG4gICAgICBfaGFuZGxlcnMuc2V0KHRhcmdldC5fX3JlYWN0S2V5ZG93blVVSUQsIG5ldyBNYXAoW1trZXlTZXRzLCBmbl1dKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9oYW5kbGVycy5nZXQoX19yZWFjdEtleWRvd25VVUlEKS5zZXQoa2V5U2V0cywgZm4pO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgU3RvcmU7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvc3RvcmUuanNcbi8vIG1vZHVsZSBpZCA9IDEwMFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBTcGVsbCBcInBhcnNlclwiIGNsYXNzLlxuLy9cblxuLy8gVE9ETzogZGVwZW5kZW5jeS1pbmplY3QgdG9rZW5pemVyP1xuaW1wb3J0IFRva2VuaXplciBmcm9tIFwiLi9Ub2tlbml6ZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gR1JSUi4uLiB3aWxsIFNPTUVPTkUgb24gdGhlIG5vZGUgdGVhbSBwbGVhc2UgaW1wbGVtZW50IGNvbnNvbGUuZ3JvdXAgPz8/XG5pZiAoIWNvbnNvbGUuZ3JvdXApIGNvbnNvbGUuZ3JvdXAgPSBjb25zb2xlLmxvZztcbmlmICghY29uc29sZS5ncm91cEVuZCkgY29uc29sZS5ncm91cEVuZCA9IGNvbnNvbGUubG9nO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYXJzZXIge1xuXHQvLyBTZXQgdG8gYHRydWVgIHRvIG91dHB1dCBkZWJ1ZyBpbmZvIHdoaWxlIGFkZGluZyBydWxlc1xuXHRzdGF0aWMgREVCVUcgPSBmYWxzZTtcblxuXHQvLyBDb25zdHJ1Y3Rvci5cblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuLy9cbi8vIyMjIFBhcnNpbmdcbi8vXG5cdC8vIFBhcnNlIGBydWxlTmFtZWAgcnVsZSBhdCBoZWFkIG9mIGB0ZXh0YC5cblx0Ly8gSWYgeW91IHBhc3Mgb25seSBvbmUgYXJndW1lbnQsIHdlJ2xsIGFzc3VtZSB0aGF0J3MgYHRleHRgIGFuZCB5b3Ugd2FudCB0byBtYXRjaCBgc3RhdGVtZW50c2AuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cbi8vVEVTVE1FXG5cdHBhcnNlKHJ1bGVOYW1lLCB0ZXh0KSB7XG5cdFx0Ly8gSWYgb25seSBvbmUgYXJndW1lbnQsIGFzc3VtZSB0aGF0J3MgdGhlIHRleHQgYW5kIHBhcnNlIGBzdGF0ZW1lbnRzYFxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHR0ZXh0ID0gcnVsZU5hbWU7XG5cdFx0XHRydWxlTmFtZSA9IFwic3RhdGVtZW50c1wiO1xuXHRcdH1cblxuXHRcdC8vIENvbnZlcnQgdG8gdG9rZW5zLlxuXHRcdGxldCB0b2tlbnMgPSB0aGlzLnRva2VuaXplKHRleHQpO1xuXHRcdC8vIEJhaWwgaWYgd2UgZGlkbid0IGdldCBhbnkgdG9rZW5zIGJhY2suXG4vL1RPRE86IFdBUk4/ICBFUlJPUj9cblx0XHRpZiAodG9rZW5zID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBJZiB3ZSdyZSBub3QgcGFyc2luZyBgc3RhdGVtZW50c2AsIHVzZSBvbmx5IHRoZSBmaXJzdCBsaW5lIGFuZCBwb3Agb2ZmIGluZGVudGF0aW9uLlxuXHRcdGlmIChydWxlTmFtZSAhPT0gXCJzdGF0ZW1lbnRzXCIpIHtcblx0XHRcdHRva2VucyA9IHRva2Vuc1swXTtcblx0XHRcdC8vIHJlbW92ZSB3aGl0ZXNwYWNlIGZyb20gdGhlIHN0YXJ0IG9mIHRoZSBsaW5lXG5cdFx0XHRpZiAodG9rZW5zWzBdIGluc3RhbmNlb2YgVG9rZW5pemVyLldoaXRlc3BhY2UpIHRva2VucyA9IHRva2Vucy5zbGljZSgxKTtcblx0XHR9XG5cblx0XHQvLyBQYXJzZSB0aGUgcnVsZSBvciB0aHJvdyBhbiBleGNlcHRpb24gaWYgcnVsZSBub3QgZm91bmQuXG5cdFx0cmV0dXJuIHRoaXMucGFyc2VSdWxlT3JEaWUocnVsZU5hbWUsIHRva2VucywgMCwgdW5kZWZpbmVkLCBcInBhcnNlci5wYXJzZSgpXCIpO1xuXHR9XG5cblxuXG5cdC8vIFBhcnNlIHNvbWV0aGluZzpcblx0Ly9cdC0gaWYgb25lIHN0cmluZyBhcmd1bWVudCwgZG9lcyBhIGBjb21waWxlU3RhdGVtZW50cygpYFxuXHQvLyBSZXR1cm5zIHRoZSBgdG9TdHJpbmcoKWAgb3IgdGhyb3dzLlxuLy9URVNUTUVcblx0Y29tcGlsZShydWxlTmFtZSwgdGV4dCkge1xuXHRcdC8vIElmIG9ubHkgb25lIGFyZ3VtZW50LCBhc3N1bWUgdGhhdCdzIHRoZSB0ZXh0IGFuZCBwYXJzZSBgc3RhdGVtZW50c2Bcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0dGV4dCA9IHJ1bGVOYW1lO1xuXHRcdFx0cnVsZU5hbWUgPSBcInN0YXRlbWVudHNcIjtcblx0XHR9XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMucGFyc2UocnVsZU5hbWUsIHRleHQpO1xuXHRcdGlmICghcmVzdWx0KSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYHBhcnNlci5wYXJzZSgnJHtydWxlTmFtZX0nLCAnJHtzdHJpbmd9Jyk6IGNhbid0IHBhcnNlIHRoaXNgKTtcblx0XHRyZXR1cm4gcmVzdWx0LnRvU291cmNlKHRoaXMpO1xuXHR9XG5cblxuXHQvLyBQYXJzZSBhIG5hbWVkIHJ1bGUgKGRlZmluZWQgaW4gdGhpcyBwYXJzZXIgb3IgaW4gYW55IG9mIG91ciBgaW1wb3J0c2ApLCByZXR1cm5pbmcgdGhlIFwiYmVzdFwiIG1hdGNoLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoLlxuXHQvLyBUaHJvd3MgaWYgTk9CT0RZIGltcGxlbWVudHMgYHJ1bGVOYW1lYC5cblx0Ly9cblx0Ly8gTk9URTogY3VycmVudGx5IFwiYmVzdFwiIGlzIGRlZmluZWQgYXMgdGhlIGZpcnN0IHJ1bGUgaW4gb3VyIGBpbXBvcnRzYCB3aGljaCBtYXRjaGVzLi4uXG5cdHBhcnNlUnVsZU9yRGllKHJ1bGVOYW1lLCB0b2tlbnMsIHN0YXJ0SW5kZXgsIHN0YWNrLCBjYWxsaW5nQ29udGV4dCA9IFwicGFyc2VSdWxlT3JEaWVcIikge1xuXHRcdC8vIEtlZXAgdHJhY2sgb2Ygd2hldGhlciBydWxlIHdhcyBFVkVSIGZvdW5kIG9yIG5vdC5cblx0XHRsZXQgcnVsZUZvdW5kID0gZmFsc2U7XG5cdFx0bGV0IGltcG9ydHMgPSB0aGlzLmltcG9ydHMsIGluZGV4ID0gMCwgcGFyc2VyO1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0d2hpbGUgKHBhcnNlciA9IGltcG9ydHNbaW5kZXgrK10pIHtcblx0XHRcdGxldCBydWxlID0gcGFyc2VyLl9ydWxlc1tydWxlTmFtZV07XG5cdFx0XHRpZiAoIXJ1bGUpIGNvbnRpbnVlO1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gcnVsZS5wYXJzZSh0aGlzLCB0b2tlbnMsIHN0YXJ0SW5kZXgsIHN0YWNrKTtcblx0XHRcdGlmIChyZXN1bHQpIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0cnVsZUZvdW5kID0gdHJ1ZTtcblx0XHR9XG5cdFx0Ly8gSWYgbmV2ZXIgZm91bmQsIHRocm93LlxuXHRcdGlmICghcnVsZUZvdW5kKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYCR7Y2FsbGluZ0NvbnRleHR9OiBydWxlICcke3J1bGVOYW1lfScgbm90IGZvdW5kYCk7XG5cblx0XHQvLyBJZiBubyBtYXRjaCwgcmV0dXJuIHVuZGVmaW5lZC5cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBJZiBleGFjdGx5IG9uZSBtYXRjaCwgcmV0dXJuIHRoYXQuXG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSByZXR1cm4gcmVzdWx0c1swXTtcblxuXHRcdC8vIE90aGVyd2lzZSByZXR1cm4gdGhlIGxvbmdlc3QgbWF0Y2guXG5cdFx0cmV0dXJuIHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChsYXJnZXN0LCBuZXh0KSB7XG5cdFx0XHRpZiAobmV4dC5uZXh0U3RhcnQgPiBsYXJnZXN0Lm5leHRTdGFydCkgcmV0dXJuIG5leHQ7XG5cdFx0XHRyZXR1cm4gbGFyZ2VzdDtcblx0XHR9LCByZXN1bHRzWzBdKTtcblx0fVxuXG5cdC8vIFRlc3Qgd2hldGhlciBhIG5hbWVkIHJ1bGUgTUlHSFQgYmUgZm91bmQgaW4gaGVhZCBvZiBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIGB0cnVlYCBpZiB0aGUgcnVsZSBNSUdIVCBiZSBtYXRjaGVkLlxuXHQvL1x0LSBgZmFsc2VgIGlmIHRoZXJlIGlzIG5vIHdheSB0aGUgcnVsZSBjYW4gYmUgbWF0Y2hlZC5cblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYyAoZWc6IG5vIHdheSB0byB0ZWxsIHF1aWNrbHkpLlxuXHR0ZXN0UnVsZShydWxlTmFtZSwgdG9rZW5zLCBzdGFydEluZGV4KSB7XG5cdFx0bGV0IGltcG9ydHMgPSB0aGlzLmltcG9ydHMsIGluZGV4ID0gMCwgcGFyc2VyO1xuXHRcdHdoaWxlIChwYXJzZXIgPSBpbXBvcnRzW2luZGV4KytdKSB7XG5cdFx0XHRsZXQgcnVsZSA9IHBhcnNlci5fcnVsZXNbcnVsZU5hbWVdO1xuXHRcdFx0aWYgKCFydWxlKSBjb250aW51ZTtcblx0XHRcdGxldCByZXN1bHQgPSBydWxlLnRlc3QodGhpcywgdG9rZW5zLCBzdGFydEluZGV4KTtcblx0XHRcdGlmIChyZXN1bHQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cblxuXG4vL1xuLy8jIyMgVG9rZW5pemluZ1xuLy9cblxuXHQvLyBHaXZlbiBhbiBhcmJpdGFyYXJ5IGB0ZXh0YCBzdHJpbmcsIHRva2VuaXplIGl0IGFuZCByZXR1cm4gYXMgYW4gYXJyYXkgb2YgYXJyYXlzIG9mIGxpbmVzLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIHJlc3VsdCBkaWRuJ3QgcHJvZHVjZSBhbnkgdG9rZW5zLlxuLy9UT0RPOiBgdG9rZW5pemVgIHJldHVybnMgdG9rZW5zRW5kLCBjb21wbGFpbiBpZiBgdG9rZW5zRW5kICE9PSBlbmRgLlxuLy9URVNUTUVcblx0dG9rZW5pemUodGV4dCkge1xuXHRcdGxldCB0b2tlbnMgPSBUb2tlbml6ZXIudG9rZW5pemUodGV4dCk7XG5cdFx0aWYgKCF0b2tlbnMgfHwgdG9rZW5zLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIENvbnZlcnQgdG8gbGluZXMuXG5cdFx0bGV0IGxpbmVzID0gW1tdXTtcblx0XHR0b2tlbnMuZm9yRWFjaCh0b2tlbiA9PiB7XG5cdFx0XHQvLyBTa2lwIHdoaXRlc3BhY2Ugd2hpY2ggaXMgbm90IGFuIGluZGVudC5cblx0XHRcdGlmICh0b2tlbiBpbnN0YW5jZW9mIFRva2VuaXplci5XaGl0ZXNwYWNlICYmICF0b2tlbi5pc0luZGVudCkgcmV0dXJuO1xuXG5cdFx0XHQvLyBhZGQgbmV3IGFycmF5IGZvciBlYWNoIG5ld2xpbmVcblx0XHRcdGlmICh0b2tlbiA9PT0gVG9rZW5pemVyLk5FV0xJTkUpIHJldHVybiBsaW5lcy5wdXNoKFtdKTtcblxuXHRcdFx0Ly8gb3RoZXJ3aXNlIGp1c3QgYWRkIHRvIHRoZSBsYXN0IGxpbmVcblx0XHRcdGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdLnB1c2godG9rZW4pO1xuXHRcdH0pO1xuXHRcdHJldHVybiBsaW5lcztcblx0fVxuXG5cbi8vXG4vLyAjIyMgXHRJbXBvcnRzXG4vL1x0XHRQYXJzZXJzIGRlcGVuZCBvbiBvdGhlciBwYXJzZXJzIGZvciB0aGVpciBgcnVsZXNgLlxuLy9cdFx0SW1wb3J0cyBhcmUgbGF6eS1ib3VuZCAoYW5kIHdlIGFzc3VtZSB0aGUgYnVpbGQgZmlsZSB3aWxsIGluY2x1ZGUgYWxsIG5lY2Vzc2FyeSBpbXBvcnRzKS5cbi8vXG5cblx0Ly8gQWRkIG9uZSBvciBtb3JlIG5hbWVkIGltcG9ydHMgdG8gdGhpcyBwYXJzZXIuXG5cdC8vIEltcG9ydHMgaW5jcmVhc2UgaW4gcHJpb3JpdHkgdGhlIGxhdGVyIHRoZXkgYXJlIGluIHRoZSBsaXN0LlxuXHRpbXBvcnQoLi4uaW1wb3J0cykge1xuXHRcdC8vIFJFVkVSU0UgdGhlIGxpc3Qgb2YgaW1wb3J0cywgc28gdGhlIG1vc3QgZ2VuZXJhbCBvbmUgaXMgTEFTVFxuXHRcdC8vIFRodXMgbW9yZSBzcGVjaWZpYyBpbXBvcnRzIHdpbGwgYmUgRUFSTElFUiBpbiB0aGUgYGltcG9ydHNgIGxpc3QuXG5cblx0XHQvLyBDcmVhdGUgbmV3IGFycmF5IG9mIGltcG9ydHMgYW5kIGFkZCBpbXBvcnQgbmFtZXMgcGFzc2VkIGluLlxuXHRcdHRoaXMuX2ltcG9ydHMgPSAodGhpcy5faW1wb3J0cyB8fCBbXSkuY29uY2F0KGltcG9ydHMucmV2ZXJzZSgpKTtcblx0XHQvLyBjbGVhciBtZW1vaXplIHZhcmlhYmxlIGZvciBgaW1wb3J0c2AuXG5cdFx0ZGVsZXRlIHRoaXMuX19pbXBvcnRzO1xuXHR9XG5cblx0Ly8gR2V0dGVyIHRvIHJldHVybiBsaXN0IG9mIG91ciBgaW1wb3J0c2AgYXMgYFBhcnNlcmAgb2JqZWN0cywgSU5DTFVESU5HIGB0aGlzYCBwYXJzZXIgaXRzZWxmIVxuXHQvLyBNb3N0IHNwZWNpZmljIGltcG9ydCAoZWc6IG91cnNlbGYpIGlzIGZpcnN0IGluIHRoZSBsaXN0LlxuXHQvLyBUaHJvd3MgaWYgYW4gaW1wb3J0IGNhbid0IGJlIGZvdW5kLlxuXHRnZXQgaW1wb3J0cygpIHtcblx0XHRpZiAoIXRoaXMuX19pbXBvcnRzKSB7XG5cdFx0XHR2YXIgaW1wb3J0cyA9ICh0aGlzLl9pbXBvcnRzID8gdGhpcy5faW1wb3J0cy5tYXAoUGFyc2VyLmdldENvbnRleHRPckRpZSkgOiBbXSk7XG5cdFx0XHR0aGlzLl9faW1wb3J0cyA9IFt0aGlzXS5jb25jYXQoaW1wb3J0cyk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLl9faW1wb3J0cztcblx0fVxuXG5cbi8vXG4vLyAjIyMgUnVsZXNcbi8vXG5cdC8vIFN0YXJ0IHdpdGggYW4gZW1wdHkgbWFwIG9mIHJ1bGVzLlxuXHRfcnVsZXMgPSB7fTtcblxuXHQvLyBEQU5HRVJPVVM6IHJldHVybiBtYXAgb2YgYXJyYXkgb2YgbmFtZWQgcnVsZXMgZm9yIHVzIGFuZCBvdXIgaW1wb3J0c1xuXHQvLyBOT1RFOiBXZSBtZW1vaXplIHRoaXMgYnV0IHRoZXJlJ3Mgbm90aGluZyB0aGF0IHJlc2V0cyB0aGlzIHdoZW4gb3VyIGltcG9ydHMgY2hhbmdlIVxuXHRnZXQgcnVsZXMoKSB7XG5cdFx0aWYgKCF0aGlzLl9fcnVsZXMpIHtcblx0XHRcdGxldCBvdXRwdXQgPSB0aGlzLl9fcnVsZXMgPSB7fTtcblx0XHRcdC8vIEZvciBlYWNoIHBhcnNlclxuXHRcdFx0dGhpcy5pbXBvcnRzLmZvckVhY2gocGFyc2VyID0+IHtcblx0XHRcdFx0Ly8gTWVyZ2UgcnVsZXMgaW50byBhbiBBbHRlcm5hdGl2ZXMgaW4gb3V0cHV0IHJ1bGVzLlxuXHRcdFx0XHRmb3IgKHZhciBydWxlTmFtZSBpbiBwYXJzZXIuX3J1bGVzKSB7XG5cdFx0XHRcdFx0bGV0IHJ1bGUgPSBwYXJzZXIuX3J1bGVzW3J1bGVOYW1lXTtcblx0XHRcdFx0XHRsZXQgYWx0ZXJuYXRpdmVzID0gb3V0cHV0W3J1bGVOYW1lXSB8fCAob3V0cHV0W3J1bGVOYW1lXSA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVOYW1lIH0pKTtcblxuXHRcdFx0XHRcdGlmIChydWxlIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXNcblx0XHRcdFx0XHQgJiYgcnVsZS5ydWxlTmFtZSA9PT0gcnVsZU5hbWVcblx0XHRcdFx0XHQgJiYgIXJ1bGUuYXJndW1lbnRcblx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdHJ1bGUucnVsZXMuZm9yRWFjaCggYWx0ZXJuYXRpdmUgPT4gYWx0ZXJuYXRpdmVzLmFkZFJ1bGUoYWx0ZXJuYXRpdmUpICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0YWx0ZXJuYXRpdmVzLmFkZFJ1bGUocnVsZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX19ydWxlcztcblx0fVxuXG5cdC8vIEFkZCBhIGBydWxlYCB0byBvdXIgbGlzdCBvZiBydWxlcyFcblx0Ly8gQ29udmVydHMgdG8gYGFsdGVybmF0aXZlc2Agb24gcmUtZGVmaW5pbmcgdGhlIHNhbWUgcnVsZS5cblx0YWRkUnVsZShydWxlTmFtZSwgcnVsZSkge1xuXHRcdC8vIENsZWFyIG1lbW9pemVkIGBfX3J1bGVzYFxuXHRcdGRlbGV0ZSB0aGlzLl9fcnVsZXM7XG5cblx0XHQvLyBJZiBwYXNzZWQgYSBmdW5jdGlvbiwgY3JlYXRlIGFuIGluc3RhbmNlIGZvciB0aGUgYWN0dWFsIHJ1bGUuXG5cdFx0Ly8gVGhpcyBpcyBjb21tb25seSBkb25lIHNvIEpTIHdpbGwgZ2l2ZSB1cyBtZWFuaW5nZnVsIGNsYXNzIG5hbWVzIGluIGRlYnVnIG91dHB1dC5cblx0XHRpZiAodHlwZW9mIHJ1bGUgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0cnVsZSA9IG5ldyBydWxlKCk7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgd2UgZ290IGFuIGFycmF5IG9mIGBydWxlTmFtZXNgLCByZWN1cnNpdmVseSBhZGQgdW5kZXIgZWFjaCBuYW1lIHdpdGggdGhlIHNhbWUgYHJ1bGVgLlxuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVOYW1lKSkge1xuXHRcdFx0cnVsZU5hbWUuZm9yRWFjaChydWxlTmFtZSA9PiB0aGlzLmFkZFJ1bGUocnVsZU5hbWUsIHJ1bGUpICk7XG5cdFx0XHRyZXR1cm4gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBTZXQgYHJ1bGVOYW1lYCBpZiBpdCBoYXNuJ3QgYmVlbiBleHBsaWNpdGx5IHNldC5cblx0XHRpZiAoIXJ1bGUucnVsZU5hbWUpIHJ1bGUucnVsZU5hbWUgPSBydWxlTmFtZTtcblxuXHRcdC8vIElmIGEgcnVsZSBvZiB0aGlzIG5hbWUgYWxyZWFkeSBleGlzdHNcblx0XHRjb25zdCBleGlzdGluZyA9IHRoaXMuX3J1bGVzW3J1bGVOYW1lXTtcblx0XHRpZiAoZXhpc3RpbmcpIHtcblx0XHRcdC8vIENvbnZlcnQgdG8gYW4gYEFsdGVybmF0aXZlc2AgaWYgbm90IG9uZSBhbHJlYWR5LlxuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5ERUJVRykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtydWxlTmFtZX0nIHRvIGFsdGVybmF0aXZlc2ApO1xuXHRcdFx0XHR0aGlzLl9ydWxlc1tydWxlTmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdC8vIGNvcHkgYXJndW1lbnQgbmFtZSBvdmVyICg/Pz8pXG5cdFx0XHRcdGlmIChleGlzdGluZy5hcmd1bWVudCkgdGhpcy5fcnVsZXNbcnVsZU5hbWVdLmFyZ3VtZW50ID0gZXhpc3RpbmcuYXJndW1lbnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoUGFyc2VyLkRFQlVHKSBjb25zb2xlLmxvZyhgQWRkaW5nIHJ1bGUgJyR7cnVsZS5ydWxlTmFtZX0nIHRvICcke3J1bGVOYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0Ly8gQWRkIHJ1bGUgdG8gdGhlIGFsdGVybmF0aXZlcy5cblx0XHRcdHRoaXMuX3J1bGVzW3J1bGVOYW1lXS5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHQvLyBPdGhlcndpc2UganVzdCByZW1lbWJlciB0aGUgcnVsZS5cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMuX3J1bGVzW3J1bGVOYW1lXSA9IHJ1bGU7XG5cdFx0fVxuXG5cblx0XHQvLyBtYWtlIGEgbm90ZSBpZiB3ZSdyZSBhZGRpbmcgYSBsZWZ0LXJlY3Vyc2l2ZSBydWxlXG4vL1RPRE86IHRoaXMgZG9lc24ndCBmbHkgaWYgYWRkaW5nIHVuZGVyIG11bHRpcGxlIG5hbWVzLi4uICA6LShcblx0XHRpZiAoUGFyc2VyLnJ1bGVJc0xlZnRSZWN1cnNpdmUocnVsZU5hbWUsIHJ1bGUpKSB7XG5cdFx0XHRpZiAoIXJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEVycm9yIGRlZmluaW5nIHJ1bGUgJHtydWxlTmFtZX06IE9ubHkgU2VxdWVuY2UgcnVsZXMgY2FuIGJlIGxlZnRSZWN1c2l2ZWApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5ERUJVRykgY29uc29sZS5pbmZvKFwibWFya2luZyBcIiwgcnVsZSwgXCIgYXMgbGVmdCByZWN1cnNpdmUhXCIpO1xuXHRcdFx0cnVsZS5sZWZ0UmVjdXJzaXZlID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cbi8vXG4vLyAjIyMgUGFyc2VyIHJlZ2lzdHJ5LlxuLy9cblx0c3RhdGljIFJFR0lTVFJZID0ge307XG5cblx0Ly8gR2V0IGEgcGFyc2VyIGZvciBhIGdpdmVuIGBjb250ZXh0TmFtZWAuXG5cdC8vIFdpbGwgcmUtdXNlIGV4aXN0aW5nIHBhcnNlciwgb3IgY3JlYXRlIGEgbmV3IG9uZSBpZiBub3QgYWxyZWFkeSBkZWZpbmVkLlxuXHRzdGF0aWMgZm9yQ29udGV4dChjb250ZXh0TmFtZSkge1xuXHRcdGlmICghUGFyc2VyLlJFR0lTVFJZW2NvbnRleHROYW1lXSkge1xuXHRcdFx0UGFyc2VyLlJFR0lTVFJZW2NvbnRleHROYW1lXSA9IG5ldyBQYXJzZXIoeyBjb250ZXh0TmFtZSB9KTtcblx0XHR9XG5cdFx0cmV0dXJuIFBhcnNlci5SRUdJU1RSWVtjb250ZXh0TmFtZV07XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBwYXJzZXIgZm9yIGBjb250ZXh0TmFtZWAgb3IgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIG5vdCBmb3VuZC5cblx0c3RhdGljIGdldENvbnRleHRPckRpZShjb250ZXh0TmFtZSkge1xuXHRcdGlmIChQYXJzZXIuUkVHSVNUUllbY29udGV4dE5hbWVdKSByZXR1cm4gUGFyc2VyLlJFR0lTVFJZW2NvbnRleHROYW1lXTtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBQYXJzZXIuZ2V0Q29udGV4dE9yRGllKCk6IGNvbnRleHROYW1lICcke2NvbnRleHROYW1lfScgbm90IGZvdW5kLmApO1xuXHR9XG5cblxuXG4vL1xuLy8gIyMgVXRpbGl0eSBtZXRob2RzXG4vL1xuXG5cdC8vIElzIHRoZSBzcGVjaWZpZWQgcnVsZSBsZWZ0LXJlY3Vyc2l2ZT9cblx0Ly8gVHJ1ZSBmb3Igc2VxdWVuY2VzIHdoZXJlIHRoZSBmaXJzdCBub24tb3B0aW9uYWwgcnVsZSByZWN1cnNpdmVseSBjYWxscyBgcnVsZU5hbWVgLlxuXHRzdGF0aWMgcnVsZUlzTGVmdFJlY3Vyc2l2ZShydWxlTmFtZSwgcnVsZSkge1xuXHRcdGlmICghKHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlKSB8fCAhcnVsZS5ydWxlcykgcmV0dXJuIGZhbHNlO1xuLy9jb25zb2xlLmxvZyhydWxlTmFtZSwgcnVsZSk7XG5cdFx0bGV0IGluZGV4ID0gMCwgc3VicnVsZSA9IHVuZGVmaW5lZDtcblx0XHR3aGlsZSAoc3VicnVsZSA9IHJ1bGUucnVsZXNbaW5kZXgrK10pIHtcblx0XHRcdC8vIGlnbm9yZSBvcHRpb25hbCBydWxlc1xuXHRcdFx0aWYgKHN1YnJ1bGUub3B0aW9uYWwpIGNvbnRpbnVlO1xuXHRcdFx0aWYgKHN1YnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN1YnJ1bGUgJiYgc3VicnVsZS5ydWxlID09PSBydWxlTmFtZSkgcmV0dXJuIHRydWU7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gXG5cdC8vXHRpbiBhcnJheSBvZiBgdG9rZW5zYCAoc3RyaW5ncykuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cblxuXHQvLyBMaXN0IG9mIHNwZWNpYWwgY2hhcmFjdGVycyBpbiByZWd1bGFyIGV4cHJlc3Npb25zLlxuXHQvLyBVc2VkIHRvIGVzY2FwZSB0aG9zZSBjaGFycyB3aGVuIGNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbnMgZnJvbSBzdHJpbmdzLlxuXHRzdGF0aWMgUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyA9IChmdW5jdGlvbigpIHtcblx0XHRjb25zdCBjaGFycyA9IHt9O1xuXHRcdFwiXFxcXC9eJCorPy4oKXx7fSxbXVwiLnNwbGl0KFwiXCIpLmZvckVhY2goY2hhciA9PiBjaGFyc1tjaGFyXSA9IHRydWUpO1xuXHRcdHJldHVybiBjaGFycztcblx0fSkoKVxuXG5cdC8vIEdpdmVuIGEgXCJub3JtYWxcIiBgc3RyaW5nYCwgZXNjYXBlIGFueSByZWd1bGFyIGV4cHJlc3Npb24gc3BlY2lhbCBjaGFyYWN0ZXJzXG5cdC8vXHRzbyB3ZSBjYW4gY3JlYXRlIGEgYG5ldyBSZWdFeHAoKWAuXG5cdC8vIEFsc28gY29udmVydHMgYSBzaW5nbGUgc3BhY2UgdG8gYXJiaXRyYXJ5IHNldCBvZiBzcGFjZXMgd2l0aCBcIlxccytcIlxuXHRzdGF0aWMgZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpIHtcblx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KFwiXCIpLm1hcChmdW5jdGlvbiAoY2hhciwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3IgYmFja3NsYXNoXG5cdFx0XHRpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIjtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igc3BhY2Vcblx0XHRcdGlmIChjaGFyID09PSBcIiBcIikgcmV0dXJuIFwiXFxcXHMrXCI7XG5cdFx0XHQvLyBJZiBhIHNwZWNpYWwgY2hhciBhbmQgcHJldmlvdXMgY2hhcmFjdGVyIHdhcyBub3QgYW4gZXNjYXBlLCBlc2NhcGUgdGhlIHJlc3VsdC5cblx0XHRcdGlmIChQYXJzZXIuUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSU1tjaGFyXSAmJiBsaXN0W2luZGV4LTFdICE9PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiK2NoYXI7XG5cdFx0XHQvLyBUaGlzIGNoYXIgc2hvdWxkIGJlIGZpbmUgYnkgaXRzZWxmLlxuXHRcdFx0cmV0dXJuIGNoYXI7XG5cdFx0fSkuam9pbihcIlwiKTtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyByZWd1bGFyIGV4cHJlc3Npb24gZnJvbSBhIFwibm9ybWFsXCIgc3RyaW5nLCBlc2NhcGluZyBzcGVjaWFsIGNoYXJhY3RlcnMgYXMgbmVjZXNzYXJ5LlxuXHRzdGF0aWMgUmVnRXhwRnJvbVN0cmluZyhzdHJpbmcsIGZsYWdzKSB7XG5cdFx0cmV0dXJuIG5ldyBSZWdFeHAoUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSwgZmxhZ3MpO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXgsIGVuZEluZGV4KWAsIHRoaXMgd2lsbCBlaXRoZXI6XG4vL1x0XHQtIHJldHVybiBgdW5kZWZpbmVkYCBpZiB0aGUgcnVsZSBkb2Vzbid0IG1hdGNoIHRoZSBoZWFkIG9mIHRoZSB0b2tlbnMsIG9yXG4vL1x0XHQtIHJldHVybiBhIENMT05FIG9mIHRoZSBydWxlIHdpdGggYXQgbGVhc3QgdGhlIGZvbGxvd2luZzpcbi8vXHRcdFx0LSBgbWF0Y2hlZGBcdFx0UmVzdWx0cyBvZiB5b3VyIHBhcnNlLlxuLy9cdFx0XHQtIGBuZXh0U3RhcnRgXHRQbGFjZSB3aGVyZSBuZXh0IG1hdGNoIHNob3VsZCBzdGFydCAoZWc6IG9uZSBiZXlvbmQgd2hhdCB5b3UgbWF0Y2hlZCkuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5yZXN1bHRzYFx0XHRcdFJldHVybiBtYXRjaGVkIGFyZ3VtZW50cyBpbiBhIGZvcm1hdCBzdWl0YWJsZSB0byBkbzpcbi8vXHRcdC0gYHJ1bGUudG9Tb3VyY2UoY29udGV4dClgXHRSZXR1cm4gamF2YXNjcmlwdCBzb3VyY2UgdG8gaW50ZXJwcmV0IHRoZSBydWxlLlxuLy9cbmltcG9ydCBnbG9iYWwgZnJvbSBcIi4vdXRpbHMvZ2xvYmFsXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJ1bGUge1xuXHRjb25zdHJ1Y3RvciguLi5wcm9wcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgLi4ucHJvcHMpO1xuXHR9XG5cblx0Ly8gQ2xvbmUgdGhpcyBydWxlIGFuZCBhZGQgYW55IGBwcm9wc2AgcGFzc2VkIGluLlxuXHRjbG9uZShwcm9wcykge1xuXHRcdHJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih0aGlzLCBwcm9wcyk7XG5cdH1cblxuLy9cbi8vXHRQYXJzaW5nIHByaW1pdGl2ZXMgLS0geW91IE1VU1QgaW1wbGVtZW50IHRoZXNlIGluIHlvdXIgc3ViY2xhc3NlcyFcbi8vXG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHJ1bGUgYmV0d2VlbiBgc3RhcnRJbmRleGAgYW5kIGBlbmRJbmRleGAgb2YgYHRva2Vuc2AuXG5cdC8vIFJldHVybnMgcmVzdWx0cyBvZiB0aGUgcGFyc2Ugb3IgYHVuZGVmaW5lZGAuXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCwgIHN0YWNrKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGJpdHMgb2Ygb3VyIHJ1bGUgYXJlIGZvdW5kIEFOWVdIRVJFIGluIHRoZSB0b2tlbnMuXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIGB0cnVlYCBpZiB0aGUgcnVsZSBNSUdIVCBiZSBtYXRjaGVkLlxuXHQvL1x0LSBgZmFsc2VgIGlmIHRoZXJlIGlzIG5vIHdheSB0aGUgcnVsZSBjYW4gYmUgbWF0Y2hlZC5cblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYyAoZWc6IG5vIHdheSB0byB0ZWxsIHF1aWNrbHkpLlxuXHR0ZXN0KHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHRhZGRUb0JsYWNrbGlzdCguLi53b3Jkcykge1xuXHRcdGlmICghdGhpcy5ibGFja2xpc3QpIHRoaXMuYmxhY2tsaXN0ID0ge307XG5cdFx0d29yZHMuZm9yRWFjaCh3b3JkID0+IHRoaXMuYmxhY2tsaXN0W3dvcmRdID0gdHJ1ZSk7XG5cdH1cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIE5PVEU6IHlvdSBtYXkgd2FudCB0byBtZW1vaXplIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkO1xuXHR9XG5cbi8vXG4vLyAjIyBncm91cDogcmVmbGVjdGlvblxuLy9cblx0Z2V0IHJ1bGVUeXBlKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdH1cbn1cblxuXG4vLyBSdWxlIGZvciBvbmUgb3IgbW9yZSBzZXF1ZW50aWFsIGxpdGVyYWwgdmFsdWVzIHRvIG1hdGNoLCB3aGljaCBpbmNsdWRlIHB1bmN0dWF0aW9uIHN1Y2ggYXMgYChgIGV0Yy5cblJ1bGUuTWF0Y2ggPSBjbGFzcyBtYXRjaCBleHRlbmRzIFJ1bGUge1xuXHRjb25zdHJ1Y3RvciguLi5wcm9wcykge1xuXHRcdHN1cGVyKC4uLnByb3BzKTtcblx0XHQvLyBjb2VyY2UgdG8gYW4gYXJyYXkgKGEgYml0IHNsb3dlciBidXQgY2xlYW5lcikuXG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KHRoaXMubWF0Y2gpKSB0aGlzLm1hdGNoID0gW3RoaXMubWF0Y2hdO1xuXHR9XG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHJ1bGUgaW4gdGhlIGB0b2tlbnNgLlxuXHQvLyBSZXR1cm5zIHJlc3VsdHMgb2YgdGhlIHBhcnNlIG9yIGB1bmRlZmluZWRgLlxuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnRJbmRleCA9IDAsICBzdGFjaykge1xuXHRcdGlmICghdGhpcy5oZWFkU3RhcnRzV2l0aCh0aGlzLm1hdGNoLCB0b2tlbnMsIHN0YXJ0SW5kZXgpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdC8vIGlmIG9ubHkgb25lIGFuZCB3ZSBoYXZlIGEgYmxhY2tsaXN0LCBtYWtlIHN1cmUgaXQncyBub3QgaW4gdGhlIGJsYWNrbGlzdCFcblx0XHRpZiAodGhpcy5tYXRjaC5sZW5ndGggPT09IDEgJiYgdGhpcy5ibGFja2xpc3QgJiYgdGhpcy5ibGFja2xpc3RbdGhpcy5tYXRjaFswXV0pIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiB0aGlzLm1hdGNoLmpvaW4odGhpcy5tYXRjaERlbGltaXRlciksXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0SW5kZXggKyB0aGlzLm1hdGNoLmxlbmd0aFxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGlzIG1hdGNoIGFwcGVhciBhbnl3aGVyZSBpbiB0aGUgdG9rZW5zP1xuXHR0ZXN0KHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBtYXRjaFN0YXJ0ID0gdG9rZW5zLmluZGV4T2YodGhpcy5tYXRjaFswXSwgc3RhcnRJbmRleCk7XG5cdFx0cmV0dXJuIG1hdGNoU3RhcnQgIT09IC0xICYmIHRoaXMuaGVhZFN0YXJ0c1dpdGgodGhpcy5tYXRjaCwgdG9rZW5zLCBtYXRjaFN0YXJ0KTtcblx0fVxuXG5cdC8vIERvZXMgdGhlIGhlYWQgb2YgdGhlIHRva2VucyBzdGFydCB3aXRoIGFuIGFycmF5IG9mIG1hdGNoZXM/XG5cdGhlYWRTdGFydHNXaXRoKG1hdGNoZXMsIHRva2Vucywgc3RhcnRJbmRleCA9IDApIHtcblx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIG9uZSBtYXRjaCwgbWF5YmUgcHJlbWF0dXJlIG9wdGltaXphdGlvbiBidXQuLi5cblx0XHRpZiAobWF0Y2hlcy5sZW5ndGggPT09IDEpIHJldHVybiAobWF0Y2hlc1swXSA9PT0gdG9rZW5zW3N0YXJ0SW5kZXhdKTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbWF0Y2hlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKG1hdGNoZXNbaV0gIT09IHRva2Vuc1tzdGFydEluZGV4ICsgaV0pIHJldHVybiBmYWxzZVxuXHRcdH1cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLm1hdGNoLmpvaW4odGhpcy5tYXRjaERlbGltaXRlcil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuUnVsZS5NYXRjaC5wcm90b3R5cGUubWF0Y2hEZWxpbWl0ZXIgPSBcIlwiO1xuXG5cbi8vIFN5bnRhY3RpYyBzdWdhciB0byBzZXBhcmF0ZSBgc3ltYm9sc2AgKHdoaWNoIGRvbid0IHJlcXVpcmUgc3BhY2VzKSBmcm9tIGBrZXl3b3Jkc2AgKHdoaWNoIGRvKS5cblJ1bGUuU3ltYm9sID0gY2xhc3Mgc3ltYm9sIGV4dGVuZHMgUnVsZS5NYXRjaCB7fVxuXG5SdWxlLktleXdvcmQgPSBjbGFzcyBrZXl3b3JkIGV4dGVuZHMgUnVsZS5NYXRjaCB7fVxuUnVsZS5LZXl3b3JkLnByb3RvdHlwZS5tYXRjaERlbGltaXRlciA9IFwiIFwiO1xuXG5cblxuLy8gUmVnZXggcGF0dGVybi5cbi8vIGBydWxlLnBhdHRlcm5gIGlzIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2guXG4vLyBOb3RlIHRoYXQgeW91IE1VU1Qgc3RhcnQgeW91ciBwYXR0ZXJuIHdpdGggYF5gIGFuZCBlbmQgd2l0aCBgJGAgdG8gbWFrZSBzdXJlIGl0IG1hdGNoZXMgdGhlIGVudGlyZSB0b2tlbi5cbi8vIE5vdGUgdGhhdCB0aGlzIGNhbiBvbmx5IG1hdGNoIGEgc2luZ2xlIHRva2VuIVxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcGF0dGVybiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSB0b2tlbnMuXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCwgc3RhY2spIHtcblx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbc3RhcnRJbmRleF07XG5cdFx0aWYgKHR5cGVvZiB0b2tlbiAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBtYXRjaCA9IHRva2VuLm1hdGNoKHRoaXMucGF0dGVybik7XG5cdFx0aWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGJhaWwgaWYgcHJlc2VudCBpbiBibGFja2xpc3Rcblx0XHRsZXQgbWF0Y2hlZCA9IG1hdGNoWzBdO1xuXHRcdGlmICh0aGlzLmJsYWNrbGlzdCAmJiB0aGlzLmJsYWNrbGlzdFttYXRjaGVkXSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0SW5kZXggKyAxXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIHBhdHRlcm4gaXMgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHRva2Vucy5cblx0dGVzdChwYXJzZXIsIHRva2Vucywgc3RhcnRJbmRleCA9IDApIHtcblx0XHRyZXR1cm4gdG9rZW5zLnNsaWNlKHN0YXJ0SW5kZXgpLnNvbWUodG9rZW4gPT4gdHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiICYmIHRva2VuLm1hdGNoKHRoaXMucGF0dGVybikpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMucGF0dGVybi5zb3VyY2U7XG5cdH1cbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnRJbmRleCA9IDAsICBzdGFjaykge1xuXHRcdGxldCByZXN1bHQgPSBwYXJzZXIucGFyc2VSdWxlT3JEaWUodGhpcy5ydWxlLCB0b2tlbnMsIHN0YXJ0SW5kZXgsIHN0YWNrLCBgcGFyc2Ugc3VicnVsZSAnJHt0aGlzLnJ1bGV9J2ApO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIHJlc3VsdC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgdG9rZW5zLlxuXHR0ZXN0KHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdHJldHVybiBwYXJzZXIudGVzdFJ1bGUodGhpcy5ydWxlLCB0b2tlbnMsIHN0YXJ0SW5kZXgpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaC5cblJ1bGUuU2VxdWVuY2UgPSBjbGFzcyBTZXF1ZW5jZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnRJbmRleCA9IDAsICBzdGFjaykge1xuXHRcdC8vIElmIHdlIGhhdmUgYSBgdGVzdFJ1bGVgIGRlZmluZWRcblx0XHRpZiAodGhpcy50ZXN0UnVsZSkge1xuXHRcdFx0Ly8gRm9yZ2V0IGl0IGlmIHRoZXJlIGlzIE5PIFdBWSB0aGUgcnVsZSBjb3VsZCBiZSBtYXRjaGVkLlxuXHRcdFx0aWYgKHBhcnNlci50ZXN0UnVsZSh0aGlzLnRlc3RSdWxlLCB0b2tlbnMsIHN0YXJ0SW5kZXgpID09PSBmYWxzZSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSdyZSBhIGxlZnRSZWN1cnNpdmUgc2VxdWVuY2UuLi5cblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHQvLyBJZiB0aGUgc3RhY2sgYWxyZWFkeSBjb250YWlucyB0aGlzIHJ1bGUsIGZvcmdldCBpdC5cblx0XHRcdGlmIChzdGFjayAmJiBzdGFjay5pbmNsdWRlcyh0aGlzKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdFx0Ly8gQ2xvbmUgc3RhY2sgYW5kIGFkZCB0aGlzIHJ1bGUgZm9yIHJlY3Vyc2lvbi4uLlxuXHRcdFx0c3RhY2sgPSBzdGFjayA/IHN0YWNrLmNvbmNhdCgpIDogW107XG5cdFx0XHRzdGFjay5wdXNoKHRoaXMpO1xuXG5cdFx0XHQvLyBUT0RPOiBXZSBjb3VsZCBkaXN0aW5ndWlzaCBiZXR3ZWVuIHByb2R1Y3RpdmUgYW5kIHVucHJvZHVjdGl2ZSBydWxlc1xuXHRcdFx0Ly9cdFx0IGJ5IGNoZWNraW5nIG9ubHkgcnVsZXMgd2hpY2ggb2NjdXIgYXQgdGhlIHNhbWUgYHN0YXJ0SW5kZXhgLi4uXG5cdFx0XHQvL1x0XHQgVGhpcyB3b3VsZCBwcm9iYWJseSBhbGxvdyBtb3JlIGludGVyZXN0aW5nIHRoaW5ncywgYnV0IGl0J3MgbXVjaCBtdWNoIHNsb3dlci5cblx0XHR9XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuXHRcdGxldCBuZXh0U3RhcnQgPSBzdGFydEluZGV4O1xuXHRcdGxldCBpbmRleCA9IDAsIHJ1bGUgPSB1bmRlZmluZWQ7XG5cdFx0d2hpbGUgKHJ1bGUgPSB0aGlzLnJ1bGVzW2luZGV4KytdKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgdG9rZW5zLCBuZXh0U3RhcnQsIHN0YWNrKTtcblx0XHRcdGlmICghbWF0Y2ggJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdFx0bmV4dFN0YXJ0ID0gbWF0Y2gubmV4dFN0YXJ0O1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBpZiB3ZSBnZXQgaGVyZSwgd2UgbWF0Y2hlZCBhbGwgdGhlIHJ1bGVzIVxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHRuZXh0U3RhcnRcblx0XHR9KTtcblx0fVxuXG4vLyBcdHBhcnNlSW5DaHVua3MocGFyc2VyLCB0b2tlbnMsIHN0YWNrKSB7fVxuXG4vL1RPRE9DXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYG1hdGNoZWRgIGFycmF5IGluZGV4ZWQgYnlcblx0Ly9cdFx0LSBgbWF0Y2guYXJndW1lbnRgOlx0XHRhcmd1bWVudCBzZXQgd2hlbiBydWxlIHdhcyBkZWNsYXJlZCwgZWc6IGB7dmFsdWU6bGl0ZXJhbH1gID0+IGB2YWx1ZWBcblx0Ly9cdFx0LSBgbWF0Y2gucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gYHJ1bGUgdHlwZWA6XHRcdFx0XHRuYW1lIG9mIHRoZSBydWxlIHR5cGVcblx0Ly8gTk9URTogbWVtb2l6ZXMgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCByZXN1bHRzID0gdGhpcy5hZGRSZXN1bHRzKHt9LCB0aGlzLm1hdGNoZWQpO1xuXHRcdGlmICh0aGlzLmNvbW1lbnQpIHJlc3VsdHMuY29tbWVudCA9IHRoaXMuY29tbWVudDtcblx0XHRyZXR1cm4gcmVzdWx0cztcblx0fVxuXG5cdGFkZFJlc3VsdHMocmVzdWx0cywgbWF0Y2hlZCkge1xuXHRcdGxldCBpbmRleCA9IDAsIG1hdGNoID0gdW5kZWZpbmVkO1xuXHRcdHdoaWxlIChtYXRjaCA9IG1hdGNoZWRbaW5kZXgrK10pIHtcblx0XHRcdGlmIChtYXRjaC5wcm9tb3RlKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmFkZFJlc3VsdHMocmVzdWx0cywgbWF0Y2gubWF0Y2hlZCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0bGV0IGFyZ05hbWUgPSBtYXRjaC5hcmd1bWVudCB8fCBtYXRjaC5ydWxlTmFtZSB8fCBtYXRjaC5jb25zdHJ1Y3Rvci5uYW1lO1xuXHRcdFx0XHQvLyBJZiBhcmcgYWxyZWFkeSBleGlzdHMsIGNvbnZlcnQgdG8gYW4gYXJyYXlcblx0XHRcdFx0aWYgKGFyZ05hbWUgaW4gcmVzdWx0cykge1xuXHRcdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShyZXN1bHRzW2FyZ05hbWVdKSkgcmVzdWx0c1thcmdOYW1lXSA9IFtyZXN1bHRzW2FyZ05hbWVdXTtcblx0XHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdLnB1c2gobWF0Y2gpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0gPSBtYXRjaDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0cztcblx0fVxuXG5cdC8vIFJldHVybiBgdG9Tb3VyY2UoKWAgZm9yIG91ciBgcmVzdWx0c2AgYXMgYSBtYXAuXG5cdC8vIElmIHlvdSBwYXNzIGBrZXlzYCwgd2UnbGwgcmVzdHJpY3QgdG8ganVzdCB0aG9zZSBrZXlzLlxuXHRnZXRNYXRjaGVkU291cmNlKGNvbnRleHQsIC4uLmtleXMpIHtcblx0XHRsZXQgcmVzdWx0cyA9IHRoaXMucmVzdWx0cztcblx0XHRsZXQgb3V0cHV0ID0ge307XG5cdFx0aWYgKCFrZXlzLmxlbmd0aCkga2V5cyA9IE9iamVjdC5rZXlzKHJlc3VsdHMpO1xuXHRcdGtleXMuZm9yRWFjaChrZXkgPT4ge1xuXHRcdFx0bGV0IHZhbHVlID0gcmVzdWx0c1trZXldO1xuXHRcdFx0aWYgKHZhbHVlID09IG51bGwpIHJldHVybjtcblx0XHRcdGlmICh2YWx1ZS50b1NvdXJjZSkgb3V0cHV0W2tleV0gPSB2YWx1ZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGVsc2Ugb3V0cHV0W2tleV0gPSB2YWx1ZTtcblx0XHR9KTtcblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0Ly8gRWNobyB0aGlzIHJ1bGUgYmFjayBvdXQuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnJ1bGVzLmpvaW4oXCIgXCIpfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cblxufVxuXG4vLyBTeW50YWN0aWMgc3VnYXIgZm9yIGRlYnVnZ2luZ1xuUnVsZS5FeHByZXNzaW9uID0gY2xhc3MgZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBIHN0YXRlbWVudCB0YWtlcyB1cCB0aGUgZW50aXJlIGxpbmUuXG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXgsIG1hdGNoaW5nIG9uZSBvZiBhIG51bWJlciBvZiBkaWZmZXJlbnQgcnVsZXMuXG4vLyBUaGUgcmVzdWx0IG9mIGEgcGFyc2UgaXMgdGhlIGxvbmdlc3QgcnVsZSB0aGF0IGFjdHVhbGx5IG1hdGNoZWQuXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUge1xuXHRjb25zdHJ1Y3RvciguLi5wcm9wcykge1xuXHRcdHN1cGVyKC4uLnByb3BzKTtcblx0XHRpZiAoIXRoaXMucnVsZXMpIHRoaXMucnVsZXMgPSBbXTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgdG9rZW5zLlxuXHQvLyBOT1RFOiB0aGlzIHNob3VsZCBvbmx5IGJlIGNhbGxlZCBpZiB3ZSdyZSBzcGVjaWZpZWQgYXMgYSBgdGVzdFJ1bGVgXG5cdC8vXHRcdCBhbmQgdGhlbiBvbmx5IGlmIGFsbCBvZiBvdXIgcnVsZXMgYXJlIGRldGVybWluaXN0aWMuXG5cdHRlc3QocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IGluZGV4ID0gMCwgcnVsZSA9IHVuZGVmaW5lZDtcblx0XHR3aGlsZSAocnVsZSA9IHRoaXMucnVsZXNbaW5kZXgrK10pIHtcblx0XHRcdGlmIChydWxlLnRlc3QocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXgpKSByZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gRmluZCBhbGwgcnVsZXMgd2hpY2ggbWF0Y2ggYW5kIGRlbGVnYXRlIHRvIGBnZXRCZXN0TWF0Y2goKWAgdG8gcGljayB0aGUgYmVzdCBvbmUuXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCwgIHN0YWNrKSB7XG5cdFx0bGV0IG1hdGNoZXMgPSBbXTtcblx0XHRsZXQgaW5kZXggPSAwLCBydWxlID0gdW5kZWZpbmVkO1xuXHRcdHdoaWxlIChydWxlID0gdGhpcy5ydWxlc1tpbmRleCsrXSkge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnRJbmRleCwgIHN0YWNrKTtcblx0XHRcdGlmIChtYXRjaCkgbWF0Y2hlcy5wdXNoKG1hdGNoKTtcblx0XHR9XG5cblx0XHRpZiAoIW1hdGNoZXMubGVuZ3RoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gdW5jb21tZW50IHRoZSBiZWxvdyB0byBwcmludCBhbHRlcm5hdGl2ZXNcblx0XHQvLyBpZiAobWF0Y2hlcy5sZW5ndGggPiAxKSB7XG5cdFx0Ly9cdGNvbnNvbGUuaW5mbyh0aGlzLmFyZ3VtZW50IHx8IHRoaXMucnVsZU5hbWUsIG1hdGNoZXMsIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLm1hdGNoZWRUZXh0KSk7XG5cdFx0Ly8gfVxuXG5cdFx0bGV0IGJlc3RNYXRjaCA9IChtYXRjaGVzLmxlbmd0aCA9PT0gMSA/IG1hdGNoZXNbMF0gOiB0aGlzLmdldEJlc3RNYXRjaChtYXRjaGVzKSk7XG5cblx0XHQvLyBhc3NpZ24gYGFyZ05hbWVgIG9yIGBydWxlTmFtZWAgZm9yIGByZXN1bHRzYFxuXHRcdGlmICh0aGlzLmFyZ3VtZW50KSBiZXN0TWF0Y2guYXJndW1lbnQgPSB0aGlzLmFyZ3VtZW50O1xuXHRcdGVsc2UgaWYgKHRoaXMucnVsZU5hbWUpIGJlc3RNYXRjaC5ydWxlTmFtZSA9IHRoaXMucnVsZU5hbWU7XG4vL1RPRE86IG90aGVyIHRoaW5ncyB0byBjb3B5IGhlcmU/Pz9cblxuXHRcdHJldHVybiBiZXN0TWF0Y2g7XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIFwiYmVzdFwiIG1hdGNoIGdpdmVuIG1vcmUgdGhhbiBvbmUgbWF0Y2hlcyBhdCB0aGUgaGVhZCBvZiB0aGUgdG9rZW5zLlxuXHQvLyBEZWZhdWx0IGlzIHRvIHJldHVybiB0aGUgbG9uZ2VzdCBtYXRjaC5cblx0Ly8gSW1wbGVtZW50IHNvbWV0aGluZyBlbHNlIHRvIGRvLCBlZywgcHJlY2VkZW5jZSBydWxlcy5cblx0Z2V0QmVzdE1hdGNoKG1hdGNoZXMpIHtcblx0XHRyZXR1cm4gbWF0Y2hlcy5yZWR1Y2UoZnVuY3Rpb24gKGJlc3QsIGN1cnJlbnQpIHtcblx0XHRcdGlmIChjdXJyZW50Lm5leHRTdGFydCA+IGJlc3QubmV4dFN0YXJ0KSByZXR1cm4gY3VycmVudDtcblx0XHRcdHJldHVybiBiZXN0O1xuXHRcdH0sIG1hdGNoZXNbMF0pO1xuXHR9XG5cblx0YWRkUnVsZShydWxlKSB7XG5cdFx0dGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQudG9Tb3VyY2UoY29udGV4dCk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCgke3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZXMuam9pbihcInxcIil9KSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBSZXBlYXRpbmcgcnVsZS5cbi8vXHRgdGhpcy5ydWxlYCBpcyB0aGUgcnVsZSB0aGF0IHJlcGVhdHMuXG4vL1xuLy8gQWZ0ZXIgbWF0Y2hpbmc6XG4vL1x0YHRoaXMubWF0Y2hlZGAgaXMgYXJyYXkgb2YgcmVzdWx0cyBvZiBtYXRjaGVzLlxuLy9cbi8vXHRBdXRvbWF0aWNhbGx5IGNvbnN1bWVzIHdoaXRlc3BhY2UgYmVmb3JlIHJ1bGVzLlxuLy9cdElmIGRvZXNuJ3QgbWF0Y2ggYXQgbGVhc3Qgb25lLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuUnVsZS5SZXBlYXQgPSBjbGFzcyBSZXBlYXQgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXggPSAwLCAgc3RhY2spIHtcblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuXHRcdGxldCBuZXh0U3RhcnQgPSBzdGFydEluZGV4O1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCB0b2tlbnMsIG5leHRTdGFydCwgc3RhY2spO1xuXHRcdFx0aWYgKCFtYXRjaCkgYnJlYWs7XG5cblx0XHRcdG1hdGNoZWQucHVzaChtYXRjaCk7XG5cdFx0XHRuZXh0U3RhcnQgPSBtYXRjaC5uZXh0U3RhcnQ7XG5cdFx0fVxuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdG5leHRTdGFydFxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gYXJyYXkgd2l0aCBhcmd1bWVudHMgb2YgYWxsIHJlc3VsdHMuXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gucmVzdWx0cyApO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0dGhyb3cgXCJEb24ndCB1bmRlcnN0YW5kIGhvdyB0byBzb3VyY2UgUnVsZS5SZXBlYXQhXCI7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRsZXQgaXNDb21wb3VuZFJ1bGUgPSAodGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSlcblx0XHRcdFx0XHRcdCAgfHwgKHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiB0aGlzLnJ1bGUubWF0Y2gubGVuZ3RoID4gMSk7XG5cdFx0Y29uc3QgcnVsZSA9IGlzQ29tcG91bmRSdWxlID8gYCgke3RoaXMucnVsZX0pYCA6IGAke3RoaXMucnVsZX1gO1xuXHRcdHJldHVybiBgJHtydWxlfSR7dGhpcy5vcHRpb25hbCA/ICcqJyA6ICcrJ31gO1xuXHR9XG59XG5cblxuLy8gTGlzdCBtYXRjaCBydWxlOiAgIGBbPGl0ZW0+PGRlbGltaXRlcj5dYC4gZWdcIiBgW3tudW1iZXJ9LF1gIHRvIG1hdGNoIGAxLDIsM2Bcbi8vXHRgcnVsZS5pdGVtYCBpcyB0aGUgcnVsZSBmb3IgZWFjaCBpdGVtLFxuLy9cdGBydWxlLmRlbGltaXRlcmAgaXMgdGhlIGRlbGltaXRlciBiZXR3ZWVuIGVhY2ggaXRlbS5cbi8vIFx0YHJ1bGUubWF0Y2hlZGAgaW4gdGhlIG91dHB1dCBpcyB0aGUgbGlzdCBvZiB2YWx1ZXMuXG4vL1xuLy9cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGEgTGlzdCBydWxlIHdpbGwgTk9UIHJlcGVhdCAoPz8/PylcblJ1bGUuTGlzdCA9IGNsYXNzIExpc3QgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXggPSAwLCAgc3RhY2spIHtcblx0XHQvLyBlbnN1cmUgaXRlbSBhbmQgZGVsaW1pdGVyIGFyZSBvcHRpb25hbCBzbyB3ZSBkb24ndCBiYXJmIGluIGBwYXJzZVJ1bGVgXG5cdFx0dGhpcy5pdGVtLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR0aGlzLmRlbGltaXRlci5vcHRpb25hbCA9IHRydWU7XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuXHRcdGxldCBuZXh0U3RhcnQgPSBzdGFydEluZGV4O1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHQvLyBnZXQgbmV4dCBpdGVtLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGl0ZW0gPSB0aGlzLml0ZW0ucGFyc2UocGFyc2VyLCB0b2tlbnMsIG5leHRTdGFydCwgc3RhY2spO1xuXHRcdFx0aWYgKCFpdGVtKSBicmVhaztcbi8vY29uc29sZS5sb2coaXRlbSk7XG5cdFx0XHRtYXRjaGVkLnB1c2goaXRlbSk7XG5cdFx0XHRuZXh0U3RhcnQgPSBpdGVtLm5leHRTdGFydDtcblxuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIHRva2VucywgbmV4dFN0YXJ0LCBzdGFjayk7XG5cdFx0XHRpZiAoIWRlbGltaXRlcikgYnJlYWs7XG5cdFx0XHRuZXh0U3RhcnQgPSBkZWxpbWl0ZXIubmV4dFN0YXJ0O1xuXHRcdH1cblxuXHRcdC8vIElmIHdlIGRpZG4ndCBnZXQgYW55IG1hdGNoZXMsIGZvcmdldCBpdC5cblx0XHRpZiAobWF0Y2hlZC5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0bmV4dFN0YXJ0XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBSZXR1cm5zIGxpc3Qgb2YgdmFsdWVzIGFzIHNvdXJjZS5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gW107XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5tYXAoIG1hdGNoID0+IG1hdGNoLnRvU291cmNlKGNvbnRleHQpICk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYFske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMuaXRlbX0gJHt0aGlzLmRlbGltaXRlcn1dJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG4vLyBBIGBTY29wZWAgcGFyc2VzIGEgbmVzdGVkIHNjb3BlLCBlZyBhIHR5cGUgZGVjbGFyYXRpb24gb3IgYSBtZXRob2QgZGVmaW5pdGlvbi5cblJ1bGUuU2NvcGUgPSBjbGFzcyBzY29wZSBleHRlbmRzIFJ1bGUge1xuXG5cbn1cblxuXG4vLyBgU3RhdGVtZW50c2AgYXJlIGEgYmxvY2sgb2YgYFN0YXRlbWVudGAgdGhhdCB1bmRlcnN0YW5kIG5lc3RpbmcgYW5kIGNvbW1lbnRzLlxuUnVsZS5TdGF0ZW1lbnRzID0gY2xhc3Mgc3RhdGVtZW50cyBleHRlbmRzIFJ1bGUge1xuXHQvLyBSZXR1cm4gYSBjZXJ0YWluIGBudW1iZXJgIG9mIHRhYiBjaGFyYWN0ZXJzLlxuXHRzdGF0aWMgVEFCUyA9IFwiXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XCI7XG5cdGdldFRhYnMobnVtYmVyKSB7XG5cdFx0aWYgKHR5cGVvZiBudW1iZXIgIT09IFwibnVtYmVyXCIpIHJldHVybiBcIlwiO1xuXHRcdHJldHVybiBSdWxlLlN0YXRlbWVudHMuVEFCUy5zdWJzdHIoMCwgbnVtYmVyKTtcblx0fVxuXG5cdC8vIGBzdGF0ZW1lbnRzYCBpcyBhbiBhcnJheSBvZiBhcnJheXMgb2YgdG9rZW5zLlxuLy9UT0RPOiBub24tc3RhbmRhcmQsIG90aGVyIGBwYXJzZSgpYCByb3V0aW5lcyB3aWxsIHRha2UgYSBzaW5nbGUgbGluZT8/P1xuXHRwYXJzZShwYXJzZXIsIHN0YXRlbWVudHMsIGxpbmVOdW1iZXIgPSAwLCBzdGFjaykge1xuXHRcdGNvbnNvbGUudGltZShcIlJ1bGUuU3RhdGVtZW50cy5wYXJzZSgpXCIpO1xuXG5cdFx0Ly8gQ3V0IG9mZiB0aGUgYmVnaW5uaW5nIGlmIG5vdCBvbiB0aGUgZmlyc3QgbGluZS4uLlxuXHRcdGlmIChsaW5lTnVtYmVyICE9PSAwKSBzdGF0ZW1lbnRzID0gc3RhdGVtZW50cy5zbGljZShsaW5lTnVtYmVyKTtcblxuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0bGV0IGxhc3RJbmRlbnQgPSAwO1xuXG5cdFx0Ly8gUGFyc2UgZWFjaCBsaW5lIGluZGl2aWR1YWxseVxuXHRcdHN0YXRlbWVudHMuZm9yRWFjaCh0b2tlbnMgPT4ge1xuXHRcdFx0Ly8gYWRkIHBsYWNlaG9sZGVycyBmb3IgZW1wdHkgbGluZXNcblx0XHRcdGlmICh0b2tlbnMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiByZXN1bHRzLnB1c2gobmV3IFJ1bGUuQmxhbmtMaW5lKCkpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBmaWd1cmUgb3V0IGluZGVudCBsZXZlbCBvZiB0aGlzIGxpbmVcblx0XHRcdGxldCBpbmRlbnQgPSAwO1xuXHRcdFx0Ly8gSWYgd2Ugc3RhcnQgd2l0aCBhbiBpbmRlbnRcblx0XHRcdGlmICh0b2tlbnNbMF0gaW5zdGFuY2VvZiBUb2tlbml6ZXIuV2hpdGVzcGFjZSAmJiB0b2tlbnNbMF0uaXNJbmRlbnQpIHtcblx0XHRcdFx0aW5kZW50ID0gdG9rZW5zWzBdLmxlbmd0aDtcblx0XHRcdFx0Ly8gdGFrZSB0aGUgaW5kZW50IG91dCBvZiB0aGUgc3RhdGVtZW50IHN0YXJ0XG5cdFx0XHRcdHRva2VucyA9IHRva2Vucy5zbGljZSgxKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgaW5kZW50IElOQ1JFQVNFUywgYWRkIG9wZW4gY3VybHkgYnJhY2VzXG5cdFx0XHRpZiAoaW5kZW50ID4gbGFzdEluZGVudCkge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2gobmV3IFJ1bGUuT3BlbkJsb2NrKHsgaW5kZW50OiBpbmRlbnQtMSB9KSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBpZiBsaW5lIGluZGVudCBERUNSRUFTRVMsIGFkZCBvbmUgb3IgbW9yZSBgQ2xvc2VCbG9ja2BzXG5cdFx0XHRlbHNlIGlmIChpbmRlbnQgPCBsYXN0SW5kZW50KSB7XG5cdFx0XHRcdGZvciAobGV0IGluZGVudCA9IGxhc3RJbmRlbnQ7IGluZGVudCA+IGluZGVudDsgaW5kZW50LS0pIHtcblx0XHRcdFx0XHRyZXN1bHRzLnB1c2gobmV3IFJ1bGUuQ2xvc2VCbG9jayh7IGluZGVudDogaW5kZW50LTEgfSkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRsYXN0SW5kZW50ID0gaW5kZW50O1xuXG5cdFx0XHQvLyBBdHRlbXB0IHRvIHBhcnNlIGEgY29tbWVudCBhcyB0aGUgbGFzdCBpdGVtIGluIHRoZSBzdGF0ZW1lbnRcblx0XHRcdGxldCBsYXN0SXRlbSA9IHRva2Vucy5sZW5ndGggLSAxO1xuXHRcdFx0bGV0IGxhc3QgPSB0b2tlbnNbbGFzdEl0ZW1dO1xuXHRcdFx0bGV0IGNvbW1lbnQ7XG5cdFx0XHRpZiAobGFzdCBpbnN0YW5jZW9mIFRva2VuaXplci5Db21tZW50KSB7XG5cdFx0XHRcdGNvbW1lbnQgPSBwYXJzZXIucGFyc2VSdWxlT3JEaWUoXCJjb21tZW50XCIsIHRva2VucywgbGFzdEl0ZW0pO1xuXHRcdFx0XHRpZiAoY29tbWVudCkge1xuXHRcdFx0XHRcdC8vIEFkZCBjb21tZW50IEJFRk9SRSBjb3JyZXNwb25kaW5nIHN0YXRlbWVudFxuXHRcdFx0XHRcdHJlc3VsdHMucHVzaChjb21tZW50KTtcblxuXHRcdFx0XHRcdC8vIHBvcCB0aGUgY29tbWVudCBvZmYgYmVmb3JlIG1hdGNoaW5nIHRoZSByZXN0IG9mIHRoZSBzdGF0ZW1lbnQuXG5cdFx0XHRcdFx0dG9rZW5zID0gdG9rZW5zLnNsaWNlKDAsIC0xKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBQYXJzZVxuXHRcdFx0bGV0IHN0YXRlbWVudCA9IHBhcnNlci5wYXJzZVJ1bGVPckRpZShcInN0YXRlbWVudFwiLCB0b2tlbnMsIDApO1xuXHRcdFx0Ly8gY29tcGxhaW4gaWYgbm8gc3RhdGVtZW50IGFuZCBubyBjb21tZW50XG5cdFx0XHRpZiAoIXN0YXRlbWVudCAmJiAhY29tbWVudCkge1xuXHRcdFx0XHRsZXQgc3RhdGVtZW50ID0gdG9rZW5zLmpvaW4oXCIgXCIpO1xuXHRcdFx0XHRjb25zb2xlLndhcm4oYENvdWxkbid0IHBhcnNlIHN0YXRlbWVudDpcXG5cXHQke3N0YXRlbWVudH1gKTtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKG5ldyBSdWxlLlBhcnNlRXJyb3Ioe1xuXHRcdFx0XHRcdGVycm9yOiBcIkNhbid0IHBhcnNlIHN0YXRlbWVudFwiLFxuXHRcdFx0XHRcdG1lc3NhZ2U6IGBDQU4nVCBQQVJTRTogJHtzdGF0ZW1lbnR9YFxuXHRcdFx0XHR9KSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY29tcGxhaW4gY2FuJ3QgcGFyc2UgdGhlIGVudGlyZSBsaW5lIVxuXHRcdFx0aWYgKHN0YXRlbWVudCAmJiBzdGF0ZW1lbnQubmV4dFN0YXJ0ICE9PSB0b2tlbnMubGVuZ3RoKSB7XG5cdFx0XHRcdGxldCBzdGF0ZW1lbnQgPSB0b2tlbnMuam9pbihcIiBcIik7XG5cdFx0XHRcdGxldCB1bnBhcnNlZCA9IHRva2Vucy5zbGljZShzdGF0ZW1lbnQubmV4dFN0YXJ0KS5qb2luKFwiIFwiKTtcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiQ291bGRuJ3QgcGFyc2UgZW50aXJlIHN0YXRlbWVudDpcIixcblx0XHRcdFx0XHRcdFx0XHRgXFxuXFx0XCIke3N0YXRlbWVudH1cImAsXG5cdFx0XHRcdFx0XHRcdFx0YFxcbnVucGFyc2VkOmAsXG5cdFx0XHRcdFx0XHRcdFx0YFxcblxcdFwiJHt1bnBhcnNlZH1cImApO1xuXHRcdFx0XHRsZXQgZXJyb3IgPSBuZXcgUnVsZS5QYXJzZUVycm9yKHtcblx0XHRcdFx0XHRlcnJvcjogXCJDYW4ndCBwYXJzZSBlbnRpcmUgc3RhdGVtZW50XCIsXG5cdFx0XHRcdFx0bWVzc2FnZTogYENBTlQgUEFSU0UgRU5USVJFIFNUQVRFTUVOVFxcbmBcblx0XHRcdFx0XHRcdCAgICsgYFBBUlNFRCAgICA6ICR7c3RhdGVtZW50Lm1hdGNoZWR9XFxuYFxuXHRcdFx0XHRcdFx0ICAgKyBgQ0FOVCBQQVJTRTogJHt1bnBhcnNlZH1gXG5cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChlcnJvcik7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHN0YXRlbWVudCkge1xuXHRcdFx0XHRzdGF0ZW1lbnQuaW5kZW50ID0gaW5kZW50O1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goc3RhdGVtZW50KTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIEFkZCBjbG9zaW5nIGN1cmx5IGJyYWNlcyBhcyBuZWNlc3Nhcnlcbi8vVE9ETzogbW92ZSBBQk9WRSBhbnkgYmxhbmsgbGluZXNcblx0XHR3aGlsZSAobGFzdEluZGVudCA+IDApIHtcblx0XHRcdGxldCBjbG9zZUJsb2NrID0gbmV3IFJ1bGUuQ2xvc2VCbG9jayh7IGluZGVudDogdGhpcy5nZXRUYWJzKGxhc3RJbmRlbnQgLSAxKSB9KTtcblx0XHRcdHJlc3VsdHMucHVzaChjbG9zZUJsb2NrKTtcblx0XHRcdC0tbGFzdEluZGVudDtcblx0XHR9XG5cdFx0Y29uc29sZS50aW1lRW5kKFwiUnVsZS5TdGF0ZW1lbnRzLnBhcnNlKClcIik7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiByZXN1bHRzLFxuXHRcdFx0bmV4dFN0YXJ0OiBzdGF0ZW1lbnRzLmxlbmd0aFxuXHRcdH0pO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1hdGNoZWQubGVuZ3RoOyBpKyspIHtcblx0XHRcdGxldCBtYXRjaCA9IHRoaXMubWF0Y2hlZFtpXTtcblxuXHRcdFx0Ly8gc3BlY2lhbCBjYXNlIG9wZW4gYmxvY2sgdG8gcHV0IG9uIHRoZSBzYW1lIGxpbmVcblx0XHRcdC8vXHRpZiBwcmV2aW91cyBzdGF0ZW1lbnQgZG9lcyBub3QgaGF2ZSBgLm9wZW5zQmxvY2tgIHNldC5cblx0XHRcdGlmIChtYXRjaCBpbnN0YW5jZW9mIFJ1bGUuT3BlbkJsb2NrKSB7XG5cdFx0XHRcdGxldCBwcmV2aW91cyA9IHRoaXMubWF0Y2hlZFtpLTFdO1xuXHRcdFx0XHRpZiAocHJldmlvdXMpIHtcblx0XHRcdFx0XHRpZiAoIXByZXZpb3VzLm9wZW5zQmxvY2spIHtcblx0XHRcdFx0XHRcdHJlc3VsdHNbcmVzdWx0cy5sZW5ndGggLSAxXSArPSBcIiB7XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRsZXQgc291cmNlID0gbWF0Y2gudG9Tb3VyY2UoY29udGV4dCkgfHwgXCJcIjtcblx0XHRcdGxldCBpbmRlbnQgPSB0aGlzLmdldFRhYnMobWF0Y2guaW5kZW50KTtcblx0XHRcdHJlc3VsdHMucHVzaChpbmRlbnQgKyBzb3VyY2Uuc3BsaXQoXCJcXG5cIikuam9pbihcIlxcblwiK2luZGVudCkpO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0cy5qb2luKFwiXFxuXCIpO1xuXHR9XG59XG5cblxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZS5qcyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIENvcHlyaWdodCAoYykgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICogXG4gKi9cblxuZnVuY3Rpb24gbWFrZUVtcHR5RnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGFyZztcbiAgfTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIGFjY2VwdHMgYW5kIGRpc2NhcmRzIGlucHV0czsgaXQgaGFzIG5vIHNpZGUgZWZmZWN0cy4gVGhpcyBpc1xuICogcHJpbWFyaWx5IHVzZWZ1bCBpZGlvbWF0aWNhbGx5IGZvciBvdmVycmlkYWJsZSBmdW5jdGlvbiBlbmRwb2ludHMgd2hpY2hcbiAqIGFsd2F5cyBuZWVkIHRvIGJlIGNhbGxhYmxlLCBzaW5jZSBKUyBsYWNrcyBhIG51bGwtY2FsbCBpZGlvbSBhbGEgQ29jb2EuXG4gKi9cbnZhciBlbXB0eUZ1bmN0aW9uID0gZnVuY3Rpb24gZW1wdHlGdW5jdGlvbigpIHt9O1xuXG5lbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zID0gbWFrZUVtcHR5RnVuY3Rpb247XG5lbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zRmFsc2UgPSBtYWtlRW1wdHlGdW5jdGlvbihmYWxzZSk7XG5lbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zVHJ1ZSA9IG1ha2VFbXB0eUZ1bmN0aW9uKHRydWUpO1xuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc051bGwgPSBtYWtlRW1wdHlGdW5jdGlvbihudWxsKTtcbmVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNUaGlzID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcztcbn07XG5lbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zQXJndW1lbnQgPSBmdW5jdGlvbiAoYXJnKSB7XG4gIHJldHVybiBhcmc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVtcHR5RnVuY3Rpb247XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3Byb3AtdHlwZXMvfi9mYmpzL2xpYi9lbXB0eUZ1bmN0aW9uLmpzXG4vLyBtb2R1bGUgaWQgPSAxNDlcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVXNlIGludmFyaWFudCgpIHRvIGFzc2VydCBzdGF0ZSB3aGljaCB5b3VyIHByb2dyYW0gYXNzdW1lcyB0byBiZSB0cnVlLlxuICpcbiAqIFByb3ZpZGUgc3ByaW50Zi1zdHlsZSBmb3JtYXQgKG9ubHkgJXMgaXMgc3VwcG9ydGVkKSBhbmQgYXJndW1lbnRzXG4gKiB0byBwcm92aWRlIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgYnJva2UgYW5kIHdoYXQgeW91IHdlcmVcbiAqIGV4cGVjdGluZy5cbiAqXG4gKiBUaGUgaW52YXJpYW50IG1lc3NhZ2Ugd2lsbCBiZSBzdHJpcHBlZCBpbiBwcm9kdWN0aW9uLCBidXQgdGhlIGludmFyaWFudFxuICogd2lsbCByZW1haW4gdG8gZW5zdXJlIGxvZ2ljIGRvZXMgbm90IGRpZmZlciBpbiBwcm9kdWN0aW9uLlxuICovXG5cbnZhciB2YWxpZGF0ZUZvcm1hdCA9IGZ1bmN0aW9uIHZhbGlkYXRlRm9ybWF0KGZvcm1hdCkge307XG5cbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gIHZhbGlkYXRlRm9ybWF0ID0gZnVuY3Rpb24gdmFsaWRhdGVGb3JtYXQoZm9ybWF0KSB7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFyaWFudCByZXF1aXJlcyBhbiBlcnJvciBtZXNzYWdlIGFyZ3VtZW50Jyk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBpbnZhcmlhbnQoY29uZGl0aW9uLCBmb3JtYXQsIGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgdmFsaWRhdGVGb3JtYXQoZm9ybWF0KTtcblxuICBpZiAoIWNvbmRpdGlvbikge1xuICAgIHZhciBlcnJvcjtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKCdNaW5pZmllZCBleGNlcHRpb24gb2NjdXJyZWQ7IHVzZSB0aGUgbm9uLW1pbmlmaWVkIGRldiBlbnZpcm9ubWVudCAnICsgJ2ZvciB0aGUgZnVsbCBlcnJvciBtZXNzYWdlIGFuZCBhZGRpdGlvbmFsIGhlbHBmdWwgd2FybmluZ3MuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBhcmdzID0gW2EsIGIsIGMsIGQsIGUsIGZdO1xuICAgICAgdmFyIGFyZ0luZGV4ID0gMDtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmdzW2FyZ0luZGV4KytdO1xuICAgICAgfSkpO1xuICAgICAgZXJyb3IubmFtZSA9ICdJbnZhcmlhbnQgVmlvbGF0aW9uJztcbiAgICB9XG5cbiAgICBlcnJvci5mcmFtZXNUb1BvcCA9IDE7IC8vIHdlIGRvbid0IGNhcmUgYWJvdXQgaW52YXJpYW50J3Mgb3duIGZyYW1lXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbnZhcmlhbnQ7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3Byb3AtdHlwZXMvfi9mYmpzL2xpYi9pbnZhcmlhbnQuanNcbi8vIG1vZHVsZSBpZCA9IDE1MFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBHUlJSLi4uIG5vZGUgZG9lc24ndCBpbmNsdWRlIHRoaXM/Pz9cbi8vIENIRUNLIERJRkZFUkVOVCBOT0RFIFZFUlNJT05TLi4uXG5pZiAoIShBcnJheS5wcm90b3R5cGUuaW5jbHVkZXMpKSB7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsIFwiaW5jbHVkZXNcIiwge1xuXHRcdHZhbHVlOiBmdW5jdGlvbih2YWx1ZSwgc3RhcnQpIHtcblx0XHRcdGxldCBpbmRleCA9IHRoaXMuaW5kZXhPZih2YWx1ZSwgc3RhcnQpO1xuXHRcdFx0cmV0dXJuIChpbmRleCAhPT0gLTEpO1xuXHRcdH1cblx0fSk7XG59XG5cblxuLy9cbi8vXHQjIFRva2VuaXplclxuLy9cdC0gYC50b2tlbml6ZSgpYCBcdFx0QnJlYWtzIHVwIGxvbmcgc3RyaW5nIGludG8gdG9rZW5zLCBpbmNsdWRpbmcgbmV3bGluZXMsIEpTWCBleHByZXNzaW9ucywgZXRjLlxuLy9cdC0gYC50b2tlbml6ZUxpbmVzKClgIFx0VGFrZXMgdGhlIGFib3ZlIGFuZCBicmVha3MgaXQgaW50byBhbiBhcnJheSBvZiBhcnJheXMgZm9yIGVhY2ggbGluZS5cbi8vXG4vLyBUT0RPOiBlcnJvciBjaGVja2luZyAvIHJlcG9ydGluZywgZXNwZWNpYWxseSBpbiBKU1ggZXhwcmVzc2lvbnMuXG4vLyBUT0RPOiBoYXZlIG5vcm1hbCBgdG9rZW5pemVgIHN0aWNrIHdoaXRlc3BhY2UgZWxlbWVudHMgaW4gdGhlIHN0cmVhbSwgdGhlbiBgdG9rZW5pemVMaW5lcygpYCB0YWtlcyB0aGVtIG91dD9cbmNvbnN0IFRva2VuaXplciA9IHtcblxuXHQvLyBUb2tlbml6ZSB0ZXh0IGJldHdlZW4gYHN0YXJ0YCBhbmQgYGVuZGAgaW50byBhbiBhcnJheSBvZiBgcmVzdWx0c2AsIGFuIGFycmF5IG9mOlxuXHQvL1x0LSBgVG9rZW5pemVyLk5FV0xJTkVgIGZvciBhIG5ld2xpbmUgc3ltYm9sXG5cdC8vXHQtIHN0cmluZ3MgZm9yIGtleXdvcmRzL3N5bWJvbHNcblx0Ly9cdC0gbnVtYmVycyBmb3IgbnVtYmVyIGxpdGVyYWxzXG5cdC8vXHQtIGB7IGluZGVudDogbnVtYmVyIH1gIGZvciBpbmRlbnQgYXQgc3RhcnQgb2YgbGluZVxuXHQvL1x0LSBgeyB0eXBlOiBcInRleHRcIiwgbGl0ZXJhbDogXCInYWJjJ1wiLCB0ZXh0OiBcImFiY1wiIH1cblx0Ly9cdC0gYHsgdHlwZTogXCJpbmRlbnRcIiwgbGV2ZWw6IDcgfWBcblx0Ly9cdC0gYHsgdHlwZTogXCJjb21tZW50XCIsIGNvbW1lbnQ6IFwic3RyaW5nXCIsIGNvbW1lbnRTeW1ib2wsIHdoaXRlc3BhY2UgfWBcbi8vVEVTVE1FXG5cdHRva2VuaXplKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdC8vIHF1aWNrIHJldHVybiBvdXQgb2YgcmFuZ2Ugb3Igb25seSB3aGl0ZXNwYWNlXG5cdFx0aWYgKHN0YXJ0ID49IGVuZCB8fCAhdGV4dC50cmltKCkpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgdG9rZW5zID0gW107XG5cdFx0Ly8gUHJvY2VzcyBvdXIgdG9wLWxldmVsIHJ1bGVzLlxuXHRcdGxldCBbcmVzdWx0cywgbmV4dFN0YXJ0XSA9IHRoaXMuZWF0VG9rZW5zKHRoaXMubWF0Y2hUb3BUb2tlbnMsIHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdGlmIChyZXN1bHRzKSB7XG5cdFx0XHR0b2tlbnMgPSB0b2tlbnMuY29uY2F0KHJlc3VsdHMpO1xuXHRcdFx0c3RhcnQgPSBuZXh0U3RhcnQ7XG5cdFx0fVxuXHRcdGlmIChzdGFydCAhPT0gZW5kKSBjb25zb2xlLndhcm4oXCJ0b2tlbml6ZSgpOiBkaWRuJ3QgY29uc3VtZTogYFwiLCB0ZXh0LnNsaWNlKHN0YXJ0LCBlbmQpICsgXCJgXCIpO1xuXG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH0sXG5cblx0Ly8gUmVwZWF0ZWRseSBleGVjdXRlIGEgYG1ldGhvZGAgKGJvdW5kIHRvIGB0aGlzKSB3aGljaCByZXR1cm5zIGEgYFtyZXN1bHQsIG5leHRTdGFydF1gIG9yIGB1bmRlZmluZWRgLlxuXHQvLyBQbGFjZXMgbWF0Y2hlZCByZXN1bHRzIHRvZ2V0aGVyIGluIGByZXN1bHRzYCBhcnJheSBhbmQgcmV0dXJucyBgW3Jlc3VsdHMsIG5leHRTdGFydF1gIGZvciB0aGUgZW50aXJlIHNldC5cblx0Ly8gU3RvcHMgaWYgYG1ldGhvZGAgZG9lc24ndCByZXR1cm4gYW55dGhpbmcsIG9yIGlmIGNhbGxpbmcgYG1ldGhvZGAgaXMgdW5wcm9kdWN0aXZlLlxuLy9URVNUTUVcblx0ZWF0VG9rZW5zKG1ldGhvZCwgdGV4dCwgc3RhcnQgPSAwLCBlbmQsIHJlc3VsdHMgPSBbXSkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gcHJvY2VzcyBydWxlcyByZXBlYXRlZGx5IHVudGlsIHdlIGdldCB0byB0aGUgZW5kXG5cdFx0d2hpbGUgKHN0YXJ0IDwgZW5kKSB7XG5cdFx0XHRsZXQgcmVzdWx0ID0gbWV0aG9kLmNhbGwodGhpcywgdGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgYnJlYWs7XG5cblx0XHRcdGxldCBbdG9rZW5zLCBuZXh0U3RhcnRdID0gcmVzdWx0O1xuXHRcdFx0Ly8gQmFpbCBpZiB3ZSBkaWRuJ3QgZ2V0IGEgcHJvZHVjdGl2ZSBydWxlIVxuXHRcdFx0aWYgKHN0YXJ0ID09PSBuZXh0U3RhcnQpIGJyZWFrO1xuXG5cdFx0XHQvLyBoYW5kbGUgbmV3UmVzdWx0cyBhcyBhbiBhcnJheSBvciBzaW5nbGUgb2JqZWN0LlxuXHRcdFx0aWYgKHRva2VucyAhPT0gdW5kZWZpbmVkKSByZXN1bHRzID0gcmVzdWx0cy5jb25jYXQodG9rZW5zKTtcblx0XHRcdHN0YXJ0ID0gbmV4dFN0YXJ0O1xuXHRcdH1cblx0XHRyZXR1cm4gW3Jlc3VsdHMsIHN0YXJ0XTtcblx0fSxcblxuXHQvLyBNYXRjaCBhIHNpbmdsZSB0b3AtbGV2ZWwgdG9rZW4gYXQgYHRleHRbc3RhcnRdYC5cbi8vVEVTVE1FXG5cdG1hdGNoVG9wVG9rZW5zKHRleHQsIHN0YXJ0LCBlbmQpIHtcblx0XHRyZXR1cm5cdHRoaXMubWF0Y2hXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaFdvcmQodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdCB8fCB0aGlzLm1hdGNoTnVtYmVyKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaE5ld2xpbmUodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdCB8fCB0aGlzLm1hdGNoSlNYRWxlbWVudCh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0IHx8IHRoaXMubWF0Y2hUZXh0KHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaENvbW1lbnQodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdCB8fCB0aGlzLm1hdGNoU3ltYm9sKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0O1xuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBTeW1ib2wgY2hhcmFjdGVyXG5cdC8vXG5cblx0Ly8gTWF0Y2ggdGhlIHNpbmdsZSBcInN5bWJvbFwiIGNoYXJhY3RlciBhdCBgdGV4dFtzdGFydF1gLlxuXHQvLyBOT1RFOiBUaGlzIGRvZXMgbm90IGRvIGFueSBjaGVja2luZywgaXQganVzdCBibGluZGx5IHVzZXMgdGhlIGNoYXJhY3RlciBpbiBxdWVzdGlvbi5cblx0Ly9cdFx0IFlvdSBzaG91bGQgbWFrZSBzdXJlIGFsbCBvdGhlciBwb3NzaWJsZSBydWxlcyBoYXZlIGJlZW4gZXhoYXVzdGVkIGZpcnN0LlxuXHRtYXRjaFN5bWJvbCh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIFt0ZXh0W3N0YXJ0XSwgc3RhcnQgKyAxXVxuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBXaGl0ZXNwYWNlXG5cdC8vXG5cblx0Ly8gUmV0dXJuIHRoZSBmaXJzdCBjaGFyIHBvc2l0aW9uIGFmdGVyIGBzdGFydGAgd2hpY2ggaXMgTk9UIGEgd2hpdGVzcGFjZSBjaGFyIChzcGFjZSBvciB0YWIgb25seSkuXG5cdC8vIElmIGB0ZXh0W3N0YXJ0XWAgaXMgbm90IHdoaXRlc3BhY2UsIHJldHVybnMgYHN0YXJ0YCxcblx0Ly9cdHNvIHlvdSBjYW4gY2FsbCB0aGlzIGF0IGFueSB0aW1lIHRvIHNraXAgd2hpdGVzcGFjZSBpbiB0aGUgb3V0cHV0LlxuXHRlYXRXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiBlbmQ7XG5cblx0XHRsZXQgd2hpdGVTcGFjZUVuZCA9IHN0YXJ0O1xuXHRcdHdoaWxlICh3aGl0ZVNwYWNlRW5kIDwgZW5kICYmICh0ZXh0W3doaXRlU3BhY2VFbmRdID09PSBcIiBcIiB8fCB0ZXh0W3doaXRlU3BhY2VFbmRdID09PSBcIlxcdFwiKSkge1xuXHRcdFx0d2hpdGVTcGFjZUVuZCsrO1xuXHRcdH1cblx0XHRyZXR1cm4gd2hpdGVTcGFjZUVuZDtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgV2hpdGVzcGFjZVxuXHQvL1x0Tk9URTogV2hpdGVzcGFjZSBhdCB0aGUgYmVnaW5uaW5nIG9mIGB0ZXh0YCBvciB0aGUgYmVnaW5uaW5nIG9mIGEgbGluZVxuXHQvL1x0XHQgIGlzIGNvbnNpZGVyZWQgYW4gXCJpbmRlbnRcIiBhbmQgd2lsbCBoYXZlIGAuaXNJbmRlbnQgPT09IHRydWVgLlxuXHQvL1xuXG5cdC8vIENvbnZlcnQgYSBydW4gb2Ygc3BhY2VzIGFuZC9vciB0YWJzIGludG8gYSBgVG9rZW5pemVyLldoaXRlc3BhY2VgLlxuXHRtYXRjaFdoaXRlc3BhY2UodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCB3aGl0ZXNwYWNlRW5kID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdC8vIGZvcmdldCBpdCBpZiBubyBmb3J3YXJkIG1vdGlvblxuXHRcdGlmICh3aGl0ZXNwYWNlRW5kID09PSBzdGFydCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCB0b2tlbiA9IG5ldyBUb2tlbml6ZXIuV2hpdGVzcGFjZSh0ZXh0LnNsaWNlKHN0YXJ0LCB3aGl0ZXNwYWNlRW5kKSk7XG5cblx0XHQvLyBpZiB0aGUgY2hhciBCRUZPUkUgc3RhcnQgaXMgYSBuZXdsaW5lLCBjb25zaWRlciB0aGlzIGFuIFwiaW5kZW50XCJcblx0XHRpZiAoc3RhcnQgPT09IDAgfHwgdGV4dFtzdGFydC0xXSA9PT0gXCJcXG5cIikgdG9rZW4uaXNJbmRlbnQgPSB0cnVlO1xuXG5cdFx0cmV0dXJuIFt0b2tlbiwgd2hpdGVzcGFjZUVuZF07XG5cdH0sXG5cblx0Ly8gV2hpdGVzcGFjZSBjbGFzc1xuXHRXaGl0ZXNwYWNlIDogY2xhc3Mgd2hpdGVzcGFjZSB7XG5cdFx0Y29uc3RydWN0b3Iod2hpdGVzcGFjZSkge1xuXHRcdFx0dGhpcy53aGl0ZXNwYWNlID0gd2hpdGVzcGFjZTtcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4gdGhlIFwibGVuZ3RoXCIgb2YgdGhpcyB3aGl0ZXNwYWNlLCBlZyBmb3IgYW4gaW5kZW50LlxuXHRcdGdldCBsZW5ndGgoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy53aGl0ZXNwYWNlLmxlbmd0aDtcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4gdHJ1ZSBpZiB0aGlzIGluZGVudCBpcyBhbGwgdGFic1xuXHRcdGdldCBpc1RhYnMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy53aGl0ZXNwYWNlLnNwbGl0KFwiXCIpLmV2ZXJ5KHNwYWNlID0+IHNwYWNlID09PSBcIlxcdFwiKTtcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4gdHJ1ZSBpZiB0aGlzIGluZGVudCBpcyBhbGwgc3BhY2VzXG5cdFx0Z2V0IGlzVGFicygpIHtcblx0XHRcdHJldHVybiB0aGlzLndoaXRlc3BhY2Uuc3BsaXQoXCJcIikuZXZlcnkoc3BhY2UgPT4gc3BhY2UgPT09IFwiXFx0XCIpO1xuXHRcdH1cblxuXHRcdC8vIFJldHVybiB0cnVlIGlmIHRoaXMgaW5kZW50IGlzIG1peGVkIHRhYnMgYW5kIHNwYWNlc1xuXHRcdGdldCBpc01peGVkKCkge1xuXHRcdFx0bGV0IGZpcnN0Q2hhciA9IHRoaXMud2hpdGVzcGFjZVswXTtcblx0XHRcdHJldHVybiB0aGlzLndoaXRlc3BhY2Uuc3BsaXQoXCJcIikuc29tZShzcGFjZSA9PiBzcGFjZSAhPT0gZmlyc3RDaGFyKTtcblx0XHR9XG5cblxuXHRcdHRvU3RyaW5nKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMud2hpdGVzcGFjZTtcblx0XHR9XG5cdH0sXG5cblxuXG5cdC8vXG5cdC8vXHQjIyMgTmV3bGluZVxuXHQvL1xuXG5cdC8vIE5ld2xpbmUgbWFya2VyIChzaW5nbGV0b24pLlxuXHRORVdMSU5FIDogbmV3IChjbGFzcyBuZXdsaW5lIHt9KSgpLFxuXG5cblx0Ly8gTWF0Y2ggYSBzaW5nbGUgbmV3bGluZSBjaGFyYWN0ZXIgYXQgYHRleHRbc3RhcnRdYC5cblx0Ly8gUmV0dXJucyBgW1Rva2VuaXplci5ORVdMSU5FLCBuZXh0U3RhcnRdYCBvbiBtYXRjaC5cblx0Ly8gT3RoZXJ3aXNlIHJldHVybnMgYHVuZGVmaW5lZGAuXG5cdG1hdGNoTmV3bGluZSh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kIHx8IHRleHRbc3RhcnRdICE9PSBcIlxcblwiKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIFtUb2tlbml6ZXIuTkVXTElORSwgc3RhcnQgKyAxXTtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgV29yZFxuXHQvL1xuXG5cdC8vIE1hdGNoIGEgc2luZ2xlIGB3b3JkYCBpbiBgdGV4dGAgYXQgY2hhcmFjdGVyIGBzdGFydGAuXG5cdC8vIFJldHVybnMgYFt3b3JkLCB3b3JkRW5kXWAuXG5cdC8vIFJldHVybnMgYW4gZW1wdHkgYXJyYXkgaWYgY291bGRuJ3QgbWF0Y2ggYSB3b3JkLlxuXHRXT1JEX1NUQVJUOiAvW0EtWmEtel0vLFxuXHRXT1JEX0NIQVIgOiAvXltcXHdfLV0vLFxuXHRtYXRjaFdvcmQodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGlmICghdGhpcy5XT1JEX1NUQVJULnRlc3QodGV4dFtzdGFydF0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHdvcmRFbmQgPSBzdGFydCArIDE7XG5cdFx0d2hpbGUgKHdvcmRFbmQgPCBlbmQgJiYgdGhpcy5XT1JEX0NIQVIudGVzdCh0ZXh0W3dvcmRFbmRdKSkge1xuXHRcdFx0d29yZEVuZCsrO1xuXHRcdH1cblx0XHRpZiAod29yZEVuZCA9PT0gc3RhcnQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgd29yZCA9IHRleHQuc2xpY2Uoc3RhcnQsIHdvcmRFbmQpO1xuXHRcdHJldHVybiBbd29yZCwgd29yZEVuZF07XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIE51bWJlcnNcblx0Ly9cblxuXHQvLyBFYXQgYSBzaW5nbGUgbnVtYmVyLlxuXHQvLyBSZXR1cm5zIGEgYE51bWJlcmAgaWYgbWF0Y2hlZC5cblx0TlVNQkVSX1NUQVJUOiAvWzAtOS0uXS8sXG5cdE5VTUJFUiA6IC9eLT8oWzAtOV0qXFwuKT9bMC05XSsvLFxuXHRtYXRjaE51bWJlcih0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKCF0aGlzLk5VTUJFUl9TVEFSVC50ZXN0KHRleHRbc3RhcnRdKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBudW1iZXJNYXRjaCA9IHRoaXMubWF0Y2hFeHByZXNzaW9uQXRIZWFkKHRoaXMuTlVNQkVSLCB0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRpZiAoIW51bWJlck1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IG51bWJlclN0ciA9IG51bWJlck1hdGNoWzBdO1xuXHRcdGxldCBudW1iZXIgPSBwYXJzZUZsb2F0KG51bWJlclN0ciwgMTApO1xuXHRcdHJldHVybiBbbnVtYmVyLCBzdGFydCArIG51bWJlclN0ci5sZW5ndGhdO1xuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBUZXh0IGxpdGVyYWxcblx0Ly9cblxuXHQvLyBFYXQgYSB0ZXh0IGxpdGVyYWwgKHN0YXJ0cy9lbmRzIHdpdGggYCdgIG9yIGBcImApLlxuXHQvLyBSZXR1cm5zIGEgYFRva2VuaXplci5UZXh0YCBpZiBtYXRjaGVkLlxuLy9URVNUTUU6ICBub3Qgc3VyZSB0aGUgZXNjYXBpbmcgbG9naWMgaXMgcmVhbGx5IHJpZ2h0Li4uXG5cdG1hdGNoVGV4dCh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHF1b3RlU3ltYm9sID0gdGV4dFtzdGFydF07XG5cdFx0aWYgKHF1b3RlU3ltYm9sICE9PSAnXCInICYmIHF1b3RlU3ltYm9sICE9PSBcIidcIikgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCB0ZXh0RW5kID0gc3RhcnQgKyAxO1xuXHRcdHdoaWxlICh0ZXh0RW5kIDwgZW5kKSB7XG5cdFx0XHRsZXQgY2hhciA9IHRleHRbdGV4dEVuZF07XG5cdFx0XHRpZiAoY2hhciA9PT0gcXVvdGVTeW1ib2wpIGJyZWFrO1xuXHRcdFx0Ly8gaWYgd2UgZ2V0IGEgYmFja3F1b3RlLCBpZ25vcmUgcXVvdGUgaW4gbmV4dCBjaGFyXG5cdFx0XHRpZiAoY2hhciA9PT0gXCJcXFxcXCIgJiYgdGV4dFt0ZXh0RW5kICsgMV0gPT09IHF1b3RlU3ltYm9sKSB0ZXh0RW5kKys7XG5cdFx0XHR0ZXh0RW5kKys7XG5cdFx0fVxuXHRcdC8vIEZvcmdldCBpdCBpZiB3ZSBkaWRuJ3QgZW5kIHdpdGggdGhlIHF1b3RlIHN5bWJvbFxuXHRcdGlmICh0ZXh0W3RleHRFbmRdICE9PSBxdW90ZVN5bWJvbCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHQvLyBhZHZhbmNlIHBhc3QgZW5kIHF1b3RlXG5cdFx0dGV4dEVuZCsrO1xuXG5cdFx0bGV0IHF1b3RlZFN0cmluZyA9IHRleHQuc2xpY2Uoc3RhcnQsIHRleHRFbmQpO1xuXHRcdGxldCB0b2tlbiA9IG5ldyBUb2tlbml6ZXIuVGV4dChxdW90ZWRTdHJpbmcpO1xuXHRcdHJldHVybiBbdG9rZW4sIHRleHRFbmRdO1xuXHR9LFxuXG5cdC8vIGBUZXh0YCBjbGFzcyBmb3Igc3RyaW5nIGxpdGVyYWxzLlxuXHQvLyBQYXNzIHRoZSBsaXRlcmFsIHZhbHVlLCB1c2UgYC50ZXh0YCB0byBnZXQganVzdCB0aGUgYml0IGluc2lkZSB0aGUgcXVvdGVzLlxuXHRUZXh0IDogY2xhc3MgdGV4dCB7XG5cdFx0Y29uc3RydWN0b3IocXVvdGVkU3RyaW5nKSB7XG5cdFx0XHR0aGlzLnF1b3RlZFN0cmluZyA9IHF1b3RlZFN0cmluZztcblx0XHR9XG5cdFx0Z2V0IHRleHQoKSB7XG5cdFx0XHRsZXQgc3RyaW5nID0gdGhpcy5xdW90ZWRTdHJpbmc7XG5cdFx0XHQvLyBjYWxjdWxhdGUgYHRleHRgIGFzIHRoZSBiaXRzIGJldHdlZW4gdGhlIHF1b3Rlcy5cblx0XHRcdGxldCBzdGFydCA9IDA7XG5cdFx0XHRsZXQgZW5kID0gc3RyaW5nLmxlbmd0aDtcblx0XHRcdGlmIChzdHJpbmdbc3RhcnRdID09PSAnXCInIHx8IHN0cmluZ1tzdGFydF0gPT09IFwiJ1wiKSBzdGFydCA9IDE7XG5cdFx0XHRpZiAoc3RyaW5nW2VuZC0xXSA9PT0gJ1wiJyB8fCBzdHJpbmdbZW5kLTFdID09PSBcIidcIikgZW5kID0gLTE7XG5cdFx0XHRyZXR1cm4gc3RyaW5nLnNsaWNlKHN0YXJ0LCBlbmQpO1xuXHRcdH1cblx0XHR0b1N0cmluZygpIHtcblx0XHRcdHJldHVybiB0aGlzLnF1b3RlZFN0cmluZztcblx0XHR9XG5cdH0sXG5cblx0Ly9cblx0Ly9cdCMjIyBDb21tZW50c1xuXHQvL1xuXG5cdC8vIEVhdCBhIGNvbW1lbnQgKHVudGlsIHRoZSBlbmQgb2YgdGhlIGxpbmUpLlxuXHQvLyBSZXR1cm5zIGEgYFRva2VuaXplci5Db21tZW50YCBpZiBtYXRjaGVkLlxuXHRDT01NRU5UIDogL14oIyMrfC0tK3xcXC9cXC8rKShcXHMqKSguKikvLFxuXHRtYXRjaENvbW1lbnQodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBjb21tZW50U3RhcnQgPSB0ZXh0LnNsaWNlKHN0YXJ0LCBzdGFydCArIDIpO1xuXHRcdGlmIChjb21tZW50U3RhcnQgIT09IFwiLS1cIiAmJiBjb21tZW50U3RhcnQgIT09IFwiXFwvXFwvXCIgJiYgY29tbWVudFN0YXJ0ICE9PSBcIiMjXCIpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBjb21tZW50IGVhdHMgdW50aWwgdGhlIGVuZCBvZiB0aGUgbGluZVxuXHRcdGxldCBsaW5lID0gdGhpcy5nZXRMaW5lQXRIZWFkKHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdGxldCBjb21tZW50TWF0Y2ggPSBsaW5lLm1hdGNoKHRoaXMuQ09NTUVOVClcblx0XHRpZiAoIWNvbW1lbnRNYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBbbWF0Y2gsIGNvbW1lbnRTeW1ib2wsIHdoaXRlc3BhY2UsIGNvbW1lbnRdID0gY29tbWVudE1hdGNoO1xuXHRcdGxldCB0b2tlbiA9IG5ldyBUb2tlbml6ZXIuQ29tbWVudCh7IGNvbW1lbnRTeW1ib2wsIHdoaXRlc3BhY2UsIGNvbW1lbnQgfSk7XG5cdFx0cmV0dXJuIFt0b2tlbiwgc3RhcnQgKyBsaW5lLmxlbmd0aF07XG5cdH0sXG5cblx0Ly8gQ29tbWVudCBjbGFzc1xuLy9URVNUTUVcblx0Q29tbWVudCA6IGNsYXNzIGNvbW1lbnQge1xuXHRcdGNvbnN0cnVjdG9yIChwcm9wcykge1xuXHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wcyk7XG5cdFx0fVxuXHRcdHRvU3RyaW5nKCkge1xuXHRcdFx0cmV0dXJuIGAke3RoaXMuY29tbWVudFN5bWJvbH0ke3RoaXMud2hpdGVzcGFjZX0ke3RoaXMuY29tbWVudH1gO1xuXHRcdH1cblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgSlNYXG5cdC8vXG5cblx0Ly8gRWF0IGEgKG5lc3RlZCkgSlNYIGV4cHJlc3Npb24uXG4vL1RFU1RNRVxuXHRtYXRjaEpTWEVsZW1lbnQodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XSA9IHRoaXMubWF0Y2hKU1hTdGFydFRhZyh0ZXh0LCBzdGFydCwgZW5kKSB8fCBbXTtcblx0XHRpZiAoIWpzeEVsZW1lbnQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAoIWpzeEVsZW1lbnQuaXNVbmFyeVRhZykge1xuXHRcdFx0bGV0IFtjaGlsZHJlbiwgY2hpbGRFbmRdID0gdGhpcy5tYXRjaEpTWENoaWxkcmVuKGpzeEVsZW1lbnQudGFnTmFtZSwgdGV4dCwgbmV4dFN0YXJ0LCBlbmQpO1xuXHRcdFx0aWYgKGNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdFx0XHRqc3hFbGVtZW50LmNoaWxkcmVuID0gY2hpbGRyZW47XG5cdFx0XHRcdG5leHRTdGFydCA9IGNoaWxkRW5kO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XTtcblx0fSxcblxuXHQvLyBNYXRjaCBKU1ggc3RhcnQgdGFnIGFuZCBpbnRlcm5hbCBlbGVtZW50cyAoYnV0IE5PVCBjaGlsZHJlbikuXG5cdC8vIFJldHVybnMgYFtqc3hFbGVtZW50LCBuZXh0U3RhcnRdYCBvciBgdW5kZWZpbmVkYC5cblx0Ly8gVXNlIGBtYXRjaEpTWEVsZW1lbnQoKWAgdG8gbWF0Y2ggY2hpbGRyZW4sIGVuZCB0YWcsIGV0Yy5cblx0Ly8gSWdub3JlcyBsZWFkaW5nIHdoaXRlc3BhY2UuXG5cdEpTWF9UQUdfU1RBUlQgOiAvXjwoW0EtWmEtel1bXFx3LVxcLl0qKShcXHMqXFwvPnxcXHMqPnxcXHMrKS8sXG4vLyBUT0RPOiBjbGVhbiB0aGlzIHN0dWZmIHVwLCBtYXliZSB3aXRoIGZpbmRGaXJzdEF0SGVhZD9cblx0bWF0Y2hKU1hTdGFydFRhZyh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IG5leHRTdGFydCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHQvLyBNYWtlIHN1cmUgd2Ugc3RhcnQgd2l0aCBgPGAuXG5cdFx0aWYgKHRleHRbbmV4dFN0YXJ0XSAhPT0gXCI8XCIpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgdGFnTWF0Y2ggPSB0aGlzLm1hdGNoRXhwcmVzc2lvbkF0SGVhZCh0aGlzLkpTWF9UQUdfU1RBUlQsIHRleHQsIG5leHRTdGFydCwgZW5kKTtcblx0XHRpZiAoIXRhZ01hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IFsgbWF0Y2hUZXh0LCB0YWdOYW1lLCBlbmRCaXQgXSA9IHRhZ01hdGNoO1xuXHRcdGxldCBqc3hFbGVtZW50ID0gbmV3IFRva2VuaXplci5KU1hFbGVtZW50KHRhZ05hbWUpO1xuXHRcdG5leHRTdGFydCA9IG5leHRTdGFydCArIG1hdGNoVGV4dC5sZW5ndGg7XG5cblx0XHQvLyBJZiB1bmFyeSB0YWcsIG1hcmsgYXMgc3VjaCBhbmQgcmV0dXJuLlxuXHRcdGVuZEJpdCA9IGVuZEJpdC50cmltKCk7XG5cdFx0aWYgKGVuZEJpdCA9PT0gXCIvPlwiKSB7XG5cdFx0XHRqc3hFbGVtZW50LmlzVW5hcnlUYWcgPSB0cnVlO1xuXHRcdFx0cmV0dXJuIFtqc3hFbGVtZW50LCBuZXh0U3RhcnRdO1xuXHRcdH1cblxuXHRcdC8vIElmIHdlIGRpZG4ndCBpbW1lZGlhdGVseSBnZXQgYW4gZW5kIG1hcmtlciwgYXR0ZW1wdCB0byBtYXRjaCBhdHRyaWJ1dGVzXG5cdFx0aWYgKGVuZEJpdCAhPT0gXCI+XCIgJiYgZW5kQml0ICE9PSBcIi8+XCIpIHtcblx0XHRcdGxldCBbIGF0dHJzLCBhdHRyRW5kIF0gPSB0aGlzLmVhdFRva2Vucyh0aGlzLm1hdGNoSlNYQXR0cmlidXRlLCB0ZXh0LCBuZXh0U3RhcnQsIGVuZCk7XG5cdFx0XHRqc3hFbGVtZW50LmF0dHJpYnV0ZXMgPSBhdHRycztcblx0XHRcdG5leHRTdGFydCA9IGF0dHJFbmQ7XG5cdFx0fVxuXG5cdFx0Ly8gYXQgdGhpcyBwb2ludCB3ZSBzaG91bGQgZ2V0IGFuIGAvPmAgb3IgYD5gICh3aXRoIG5vIHdoaXRlc3BhY2UpLlxuXHRcdGlmICh0ZXh0W25leHRTdGFydF0gPT09IFwiL1wiICYmIHRleHRbbmV4dFN0YXJ0ICsgMV0gPT09IFwiPlwiKSB7XG5cdFx0XHRlbmRCaXQgPSBcIi8+XCI7XG5cdFx0XHRuZXh0U3RhcnQgKz0gMjtcblx0XHR9XG5cdFx0ZWxzZSBpZiAodGV4dFtuZXh0U3RhcnRdID09PSBcIj5cIikge1xuXHRcdFx0ZW5kQml0ID0gdGV4dFtuZXh0U3RhcnRdO1xuXHRcdFx0bmV4dFN0YXJ0ICs9IDE7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIGltbWVkaWF0ZWx5IGZvciB1bmFyeSB0YWdcblx0XHRpZiAoZW5kQml0ID09PSBcIi8+XCIpIHtcblx0XHRcdGpzeEVsZW1lbnQuaXNVbmFyeVRhZyA9IHRydWU7XG5cdFx0XHRyZXR1cm4gW2pzeEVsZW1lbnQsIG5leHRTdGFydF07XG5cdFx0fVxuXG5cdFx0Ly8gYWR2YW5jZSBwYXN0IGA+YFxuXHRcdGlmIChlbmRCaXQgIT09IFwiPlwiKSB7XG5cdFx0XHRjb25zb2xlLndhcm4oXCJNaXNzaW5nIGV4cGVjdGVkIGVuZCBgPmAgZm9yIGpzeEVsZW1lbnRcIiwganN4RWxlbWVudCwgXCJgXCIrdGV4dC5zbGljZShzdGFydCwgbmV4dFN0YXJ0KStcImBcIik7XG5cdFx0XHRqc3hFbGVtZW50LmVycm9yID0gXCJObyBlbmQgPlwiO1xuXHRcdFx0cmV0dXJuIFtqc3hFbGVtZW50LCBuZXh0U3RhcnRdO1xuXHRcdH1cblxuXHRcdHJldHVybiBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XTtcblx0fSxcblxuXG5cdC8vIEpTWCBlbGVtZW50IGNsYXNzXG5cdEpTWEVsZW1lbnQgOiBjbGFzcyBqc3hFbGVtZW50IHtcblx0XHRjb25zdHJ1Y3Rvcih0YWdOYW1lLCBhdHRyaWJ1dGVzLCBjaGlsZHJlbikge1xuXHRcdFx0dGhpcy50YWdOYW1lID0gdGFnTmFtZTtcblx0XHRcdGlmIChhdHRyaWJ1dGVzKSB0aGlzLmF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzO1xuXHRcdFx0aWYgKGNoaWxkcmVuKSB0aGlzLmNoaWxkcmVuID0gY2hpbGRyZW47XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIGF0dHJpYnV0ZXMgYXMgYSBtYXAuXG4vL1RFU1RNRVxuXHRcdGdldCBhdHRycygpIHtcblx0XHRcdGxldCBhdHRycyA9IHt9O1xuXHRcdFx0aWYgKHRoaXMuYXR0cmlidXRlcykgdGhpcy5hdHRyaWJ1dGVzLmZvckVhY2goYXR0ciA9PiB7XG5cdFx0XHRcdC8vIGlnbm9yZSB1bm5hbWVkIGF0dHJpYnV0ZXNcblx0XHRcdFx0aWYgKGF0dHIubmFtZSkgYXR0cnNbYXR0ci5uYW1lXSA9IGF0dHIudmFsdWVcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGF0dHJzO1xuXHRcdH1cblxuXHRcdC8vIFJldHVybiBvdXIgYXR0cmlidXRlcyBhcyBhIHN0cmluZ1xuLy9URVNUTUVcblx0XHRnZXQgYXR0cnNBc1N0cmluZygpIHtcblx0XHRcdGlmICghdGhpcy5hdHRyaWJ1dGVzKSByZXR1cm4gXCJcIjtcblx0XHRcdHJldHVybiBcIiBcIiArIHRoaXMuYXR0cmlidXRlcy5tYXAoICh7IG5hbWUsIHZhbHVlIH0pID0+IHtcblx0XHRcdFx0aWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiBuYW1lO1xuXHRcdFx0XHQvLyBjb252ZXJ0IHZhbHVlIGFycmF5ICh0b2tlbnMpIHRvIHN0cmluZ1xuXHRcdFx0XHQvLyBUT0RPOiB0aGlzIHdpbGwgd2FudCB0byBiZSBzbWFydGVyLi4uXG5cdFx0XHRcdGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkgdmFsdWUgPSBgeyR7dmFsdWUuam9pbihcIiBcIil9fWA7XG5cdFx0XHRcdHJldHVybiBgbmFtZT0ke3ZhbHVlfWA7XG5cdFx0XHR9KS5qb2luKFwiIFwiKTtcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4gb3VyIGNoaWxkcmVuIGFzIGEgc3RyaW5nLlxuLy9URVNUTUVcblx0XHRnZXQgY2hpbGRyZW5Bc1N0cmluZygpIHtcblx0XHRcdGlmICghdGhpcy5jaGlsZHJlbikgcmV0dXJuIFwiXCI7XG5cdFx0XHRyZXR1cm4gdGhpcy5jaGlsZHJlbi5tYXAoY2hpbGQgPT4ge1xuXHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheShjaGlsZCkpIHJldHVybiBgeyR7Y2hpbGQuam9pbihcIiBcIil9fWA7XG5cdFx0XHRcdHJldHVybiBcIlwiICsgY2hpbGQ7XG5cdFx0XHR9KS5qb2luKFwiXCIpO1xuXHRcdH1cblxuXHRcdHRvU3RyaW5nKCkge1xuXHRcdFx0bGV0IGF0dHJzID0gdGhpcy5hdHRyc0FzU3RyaW5nO1xuXHRcdFx0bGV0IGNoaWxkcmVuID0gdGhpcy5jaGlsZHJlbkFzU3RyaW5nO1xuXHRcdFx0aWYgKHRoaXMuaXNVbmFyeVRhZykgcmV0dXJuIGA8JHt0aGlzLnRhZ05hbWV9JHthdHRyc30vPmA7XG5cdFx0XHRyZXR1cm4gYDwke3RoaXMudGFnTmFtZX0ke2F0dHJzfT4ke2NoaWxkcmVufTwvJHt0aGlzLnRhZ05hbWV9PmA7XG5cdFx0fVxuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBKU1ggY2hpbGRyZW5cblx0Ly9cblxuXHQvLyBNYXRjaCBKU1ggZWxlbWVudCBjaGlsZHJlbiBvZiBgPHRhZ05hbWU+YCBhdCBgdGV4dFtzdGFydF1gLlxuXHQvLyBNYXRjaGVzIG5lc3RlZCBjaGlsZHJlbiBhbmQgc3RvcHMgYWZ0ZXIgbWF0Y2hpbmcgZW5kIHRhZzogYDwvdGFnTmFtZT5gLlxuXHQvLyBSZXR1cm5zIGBbY2hpbGRyZW4sIG5leHRTdGFydF1gLlxuLy9URVNUTUVcblx0bWF0Y2hKU1hDaGlsZHJlbih0YWdOYW1lLCB0ZXh0LCBzdGFydCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgY2hpbGRyZW4gPSBbXTtcblx0XHRsZXQgbmVzdGluZyA9IDE7XG5cdFx0bGV0IGVuZFRhZyA9IGA8LyR7dGFnTmFtZX0+YDtcblxuXHRcdGxldCBuZXh0U3RhcnQgPSBzdGFydDtcblx0XHR3aGlsZSh0cnVlKSB7XG5cdFx0XHRsZXQgcmVzdWx0ID0gdGhpcy5tYXRjaEpTWENoaWxkKGVuZFRhZywgdGV4dCwgbmV4dFN0YXJ0LCBlbmQpO1xuXHRcdFx0aWYgKCFyZXN1bHQpIGJyZWFrO1xuXG5cdFx0XHRsZXQgW2NoaWxkLCBjaGlsZEVuZF0gPSByZXN1bHQ7XG5cdFx0XHRuZXh0U3RhcnQgPSBjaGlsZEVuZDtcblx0XHRcdC8vIElmIHdlIGdvdCB0aGUgZW5kVGFnLCB1cGRhdGUgbmVzdGluZyBhbmQgYnJlYWsgb3V0IG9mIGxvb3AgaWYgbmVzdGluZyAhPT0gMFxuXHRcdFx0aWYgKGNoaWxkID09PSBlbmRUYWcpIHtcblx0XHRcdFx0bmVzdGluZyAtLTtcblx0XHRcdFx0aWYgKG5lc3RpbmcgPT09IDApIGJyZWFrO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRpZiAoY2hpbGQpIGNoaWxkcmVuLnB1c2goY2hpbGQpO1xuXHRcdFx0fVxuXHRcdH1cbi8vIFRPRE86IGhvdyB0byBzdXJmYWNlIHRoaXMgZXJyb3I/Pz9cblx0XHRpZiAobmVzdGluZyAhPT0gMCkge1xuXHRcdFx0Y29uc29sZS53YXJuKGBtYXRjaEpTWENoaWxkcmVuKCR7dGV4dC5zbGljZShzdGFydCwgbmV4dFN0YXJ0ICsgMTApfTogZGlkbid0IG1hdGNoIGVuZCBjaGlsZCFgKTtcblx0XHR9XG5cdFx0cmV0dXJuIFtjaGlsZHJlbiwgbmV4dFN0YXJ0XTtcblx0fSxcblxuXHQvLyBNYXRjaCBhIHNpbmdsZSBKU1ggY2hpbGQ6XG5cdC8vXHQtIGN1cnJlbnQgZW5kVGFnXG5cdC8vXHQtIGB7IGpzeCBleHByZXNzaW9uIH1gXG5cdC8vXHQtIG5lc3RlZCBKU1ggZWxlbWVudFxuXHQvL1x0LSAoYW55dGhpbmcgZWxzZSkgYXMganN4VGV4dCBleHByZXNzaW9uLlxuXHRtYXRjaEpTWENoaWxkKGVuZFRhZywgdGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaEpTWEVuZFRhZyhlbmRUYWcsIHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHR8fCB0aGlzLm1hdGNoSlNYRXhwcmVzc2lvbih0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0fHwgdGhpcy5tYXRjaEpTWEVsZW1lbnQodGV4dCwgc3RhcnQsIGVuZClcbi8vIFRPRE86IG5ld2xpbmUgYW5kIGluZGVudD9cblx0XHRcdHx8IHRoaXMubWF0Y2hKU1hUZXh0KHRleHQsIHN0YXJ0LCBlbmQpO1xuXHR9LFxuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggYSBzcGVjaWZpYyBlbmQgdGFnLlxuXHQvLyBJZ25vcmVzIGxlYWRpbmcgd2hpdGVzcGFjZS5cblx0bWF0Y2hKU1hFbmRUYWcoZW5kVGFnLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IG5leHRTdGFydCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRpZiAoIXRoaXMubWF0Y2hTdHJpbmdBdEhlYWQoZW5kVGFnLCB0ZXh0LCBuZXh0U3RhcnQsIGVuZCkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIFtlbmRUYWcsIG5leHRTdGFydCArIGVuZFRhZy5sZW5ndGhdO1xuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBKU1ggYXR0cmlidXRlc1xuXHQvL1xuXG5cdC8vIE1hdGNoIGEgc2luZ2xlIEpTWCBlbGVtZW50IGF0dHJpYnV0ZSBhcyBgPGF0dHI+PXs8dmFsdWU+fWBcbi8vIFRPRE86IHsuLi54eHh9XG5cdEpTWF9BVFRSSUJVVEVfU1RBUlQgOiAvXlxccyooW1xcdy1dK1xcYilcXHMqKD0/KVxccyovLFxuXHRtYXRjaEpTWEF0dHJpYnV0ZSh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYXR0cmlidXRlcyBtdXN0IHN0YXJ0IHdpdGggYSB3b3JkIGNoYXJhY3RlclxuXHRcdGlmICghdGhpcy5XT1JEX1NUQVJULnRlc3QodGV4dFtzdGFydF0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYXR0ZW1wdCB0byBtYXRjaCBhbiBhdHRyaWJ1dGUgbmFtZSwgaW5jbHVkaW5nIGA9YCBpZiBwcmVzZW50LlxuXHRcdGxldCByZXN1bHQgPSB0aGlzLm1hdGNoRXhwcmVzc2lvbkF0SGVhZCh0aGlzLkpTWF9BVFRSSUJVVEVfU1RBUlQsIHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IFsgbWF0Y2gsIG5hbWUsIGVxdWFscyBdID0gcmVzdWx0O1xuXHRcdGxldCBuZXh0U3RhcnQgPSBzdGFydCArIG1hdGNoLmxlbmd0aDtcblx0XHRsZXQgYXR0cmlidXRlID0gbmV3IFRva2VuaXplci5KU1hBdHRyaWJ1dGUobmFtZSk7XG5cblx0XHQvLyBpZiB0aGVyZSB3YXMgYW4gZXF1YWxzIGNoYXIsIHBhcnNlIHRoZSB2YWx1ZVxuXHRcdGlmIChlcXVhbHMpIHtcblx0XHRcdGxldCBbdmFsdWUsIHZhbHVlRW5kXSA9IHRoaXMubWF0Y2hKU1hBdHRyaWJ1dGVWYWx1ZSh0ZXh0LCBuZXh0U3RhcnQsIGVuZCkgfHwgW107XG5cdFx0XHRpZiAodmFsdWUpIHtcblx0XHRcdFx0YXR0cmlidXRlLnZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdG5leHRTdGFydCA9IHZhbHVlRW5kO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBlYXQgd2hpdGVzcGFjZSBiZWZvcmUgdGhlIG5leHQgYXR0cmlidXRlIC8gdGFnIGVuZFxuXHRcdG5leHRTdGFydCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBuZXh0U3RhcnQsIGVuZCk7XG5cdFx0cmV0dXJuIFthdHRyaWJ1dGUsIG5leHRTdGFydF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYSB2YWx1ZSBleHByZXNzaW9uIGZvciBhIEpTWCBlbGVtZW50IGF0dHJpYnV0ZTpcblx0Ly8gTk9URTogd2Ugd2lsbCBiZSBjYWxsZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIGA9YCAoYW5kIHN1YnNlcXVlbnQgd2hpdGVzcGFjZSkuXG5cdG1hdGNoSlNYQXR0cmlidXRlVmFsdWUodGV4dCwgc3RhcnQsIGVuZCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoVGV4dCh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0fHwgdGhpcy5tYXRjaEpTWEV4cHJlc3Npb24odGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdHx8IHRoaXMubWF0Y2hKU1hFbGVtZW50KHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHR8fCB0aGlzLm1hdGNoSlNYQXR0cmlidXRlVmFsdWVJZGVudGlmaWVyKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHR8fCB0aGlzLm1hdGNoTnVtYmVyKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0O1xuXHR9LFxuXG5cdC8vIE1hdGNoIGEgc2luZ2xlIGlkZW50aWZlciBhcyBhIEpTWCBhdHRyaWJ1dGUgdmFsdWUuXG5cdC8vIFJldHVybnMgYXMgYSBgSlNYRXhwcmVzc2lvbmAuXG5cdG1hdGNoSlNYQXR0cmlidXRlVmFsdWVJZGVudGlmaWVyKHRleHQsIHN0YXJ0LCBlbmQpIHtcblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5tYXRjaFdvcmQodGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybjtcblxuXHRcdGxldCBbIHdvcmQsIG5leHRTdGFydCBdID0gcmVzdWx0O1xuXHRcdGxldCB0b2tlbiA9IG5ldyBUb2tlbml6ZXIuSlNYRXhwcmVzc2lvbih3b3JkKTtcblx0XHRyZXR1cm4gW3Rva2VuLCBuZXh0U3RhcnRdO1xuXHR9LFxuXG5cdC8vIEpTWCBhdHRyaWJ1dGUgY2xhc3Ncblx0Ly8gYG5hbWVgIGlzIHRoZSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGUuXG5cdC8vIGB2YWx1ZWAgaXMgb25lIG9mOlxuXHQvL1x0XHQtIGAnLi4uJ2BcdFx0XHQvLyBUZXh0IChsaXRlcmFsIHN0cmluZykuXG5cdC8vXHRcdC0gYFwiLi4uXCJgXHRcdFx0Ly8gVGV4dCAobGl0ZXJhbCBzdHJpbmcpLlxuXHQvL1x0XHQtIGB7Li4ufWBcdFx0XHQvLyBFeHByZXNzaW9uLiAgUmVzdWx0cyB3aWxsIGJlIHRva2VuaXplZCBhcnJheS5cblx0Ly9cdFx0LSBgPC4uLi4+YFx0XHRcdC8vIEpTWCBlbGVtZW50LlxuXHQvL1x0XHQtIGAxYFx0XHRcdFx0Ly8gTnVtYmVyLiAgTm90ZTogdGhpcyBpcyBhbiBleHRlbnNpb24gdG8gSlNYLlxuXG5cdEpTWEF0dHJpYnV0ZSA6IGNsYXNzIGpzeEF0dHJpYnV0ZSB7XG5cdFx0Y29uc3RydWN0b3IobmFtZSwgdmFsdWUpIHtcblx0XHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdFx0XHRpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkgdGhpcy52YWx1ZSA9IHZhbHVlO1xuXHRcdH1cblx0XHR0b1N0cmluZygpIHtcblx0XHRcdGlmICh0aGlzLnZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLm5hbWU7XG5cdFx0XHRyZXR1cm4gYCR7dGhpcy5uYW1lfT17JHt0aGlzLnZhbHVlfX1gO1xuXHRcdH1cblx0fSxcblxuXG5cdC8vIE1hdGNoIGEgSlNYIGV4cHJlc3Npb24gZW5jbG9zZWQgaW4gY3VybHkgYnJhY2VzLCBlZzogIGB7IC4uLiB9YC5cblx0Ly8gIEhhbmRsZXMgbmVzdGVkIGN1cmxpZXMsIHF1b3RlcywgZXRjLlxuXHQvLyBSZXR1cm5zIGFycmF5IG9mIHRva2VucyBvZiBpbnRlcm5hbCBtYXRjaC5cblx0Ly8gSWdub3JlcyBsZWFkaW5nIHdoaXRlc3BhY2UuXG4vL1RPRE86IG5ld2xpbmVzL2luZGVudHM/Pz9cbi8vVE9ETzogey4uLnh4eH1cbi8vVEVTVE1FXG5cdG1hdGNoSlNYRXhwcmVzc2lvbih0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IG5leHRTdGFydCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRsZXQgZW5kSW5kZXggPSB0aGlzLmZpbmRNYXRjaGluZ0F0SGVhZChcIntcIiwgXCJ9XCIsIHRleHQsIG5leHRTdGFydCwgZW5kKTtcblx0XHRpZiAoZW5kSW5kZXggPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIEdldCBjb250ZW50cywgaW5jbHVkaW5nIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHdoaXRlc3BhY2UuXG5cdFx0bGV0IGNvbnRlbnRzID0gdGV4dC5zbGljZShzdGFydCArIDEsIGVuZEluZGV4KTtcblxuXHRcdC8vIHJldHVybiBhIG5ldyBKU1hFeHByZXNzaW9uLCBhZHZhbmNpbmcgYmV5b25kIHRoZSBlbmRpbmcgYH1gLlxuXHRcdGxldCBleHByZXNzaW9uID0gbmV3IFRva2VuaXplci5KU1hFeHByZXNzaW9uKGNvbnRlbnRzKTtcblx0XHRyZXR1cm4gW2V4cHJlc3Npb24sIGVuZEluZGV4ICsgMV07XG5cdH0sXG5cblx0Ly8gSlNYIGV4cHJlc3Npb24sIGNvbXBvc2VkIG9mIGlubGluZSB0b2tlbnMgd2hpY2ggc2hvdWxkIHlpZWxkIGFuIGBleHByZXNzaW9uYC5cblx0SlNYRXhwcmVzc2lvbiA6IGNsYXNzIGpzeEV4cHJlc3Npb24ge1xuXHRcdGNvbnN0cnVjdG9yKGNvbnRlbnRzKSB7XG5cdFx0XHR0aGlzLmNvbnRlbnRzID0gY29udGVudHMgfHwgXCJcIjtcblx0XHR9XG5cdFx0Ly8gRGl2aWRlIGNvbnRlbnRzIGludG8gYHRva2Vuc2AuXG5cdFx0Z2V0IHRva2VucygpIHtcblx0XHRcdHJldHVybiBUb2tlbml6ZXIudG9rZW5pemUodGhpcy5jb250ZW50cy50cmltKCkpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCBKU1hUZXh0IHVudGlsIHRoZSBvbmUgb2YgYHtgLCBgPGAsIGA+YCBvciBgfWAuXG5cdC8vIE5PVEU6IElOQ0xVREVTIGxlYWRpbmcgLyB0cmFpbGluZyB3aGl0ZXNwYWNlLlxuXHRKU1hfVEVYVF9FTkRfQ0hBUlMgOiBbXCJ7XCIsIFwiPFwiLCBcIj5cIiwgXCJ9XCJdLFxuLy9URVNUTUVcblx0bWF0Y2hKU1hUZXh0KHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyB0ZW1wb3JhcmlseSBhZHZhbmNlIHBhc3Qgd2hpdGVzcGFjZSAod2UnbGwgaW5jbHVkZSBpdCBpbiB0aGUgb3V0cHV0KS5cblx0XHRsZXQgbmV4dFN0YXJ0ID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdGxldCBlbmRJbmRleCA9IHRoaXMuZmluZEZpcnN0QXRIZWFkKHRoaXMuSlNYX1RFWFRfRU5EX0NIQVJTLCB0ZXh0LCBuZXh0U3RhcnQsIGVuZCk7XG5cdFx0Ly8gSWYgdGhlIGZpcnN0IG5vbi13aGl0ZXNwYWNlIGNoYXIgaXMgaW4gb3VyIEVORF9DSEFSUywgZm9yZ2V0IGl0LlxuXHRcdGlmIChlbmRJbmRleCA9PT0gbmV4dFN0YXJ0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gaWYgbm8gbWF0Y2gsIHdlJ3ZlIGdvdCBzb21lIHNvcnQgb2YgZXJyb3Jcblx0XHRpZiAoZW5kSW5kZXggPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0Y29uc29sZS53YXJuKFwibWF0Y2hKU1hUZXh0KFwiK3RleHQuc2xpY2Uoc3RhcnQsIHN0YXJ0ICsgNTApK1wiKTogSlNYIHNlZW1zIHRvIGJlIHVuYmFsYW5jZWQuXCIpO1xuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHQvLyBpbmNsdWRlIGxlYWRpbmcgd2hpdGVzcGFjZSBpbiB0aGUgb3V0cHV0LlxuXHRcdGxldCBqc3hUZXh0ID0gdGV4dC5zbGljZShzdGFydCwgZW5kSW5kZXgpO1xuXHRcdHJldHVybiBbanN4VGV4dCwgZW5kSW5kZXhdO1xuXHR9LFxuXG5cblxuXG5cdC8vXG5cdC8vXHQjIyBVdGlsaXR5IGZ1bmN0aW9uc1xuXHQvL1xuXG5cdC8vIFJldHVybiBjaGFyYWN0ZXJzIHVwIHRvLCBidXQgbm90IGluY2x1ZGluZywgdGhlIG5leHQgbmV3bGluZSBjaGFyIGFmdGVyIGBzdGFydGAuXG5cdC8vIElmIGBzdGFydGAgaXMgYSBuZXdsaW5lIGNoYXIgb3Igc3RhcnQgPj0gZW5kLCByZXR1cm5zIGVtcHR5IHN0cmluZy5cblx0Ly8gSWYgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nIChlZzogbm8gbW9yZSBuZXdsaW5lcyksIHJldHVybnMgZnJvbSBzdGFydCB0byBlbmQuXG4vL1RFU1RNRVxuXHRnZXRMaW5lQXRIZWFkKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiBcIlwiO1xuXG5cdFx0bGV0IG5ld2xpbmUgPSB0ZXh0LmluZGV4T2YoXCJcXG5cIiwgc3RhcnQpO1xuXHRcdGlmIChuZXdsaW5lID09PSAtMSB8fCBuZXdsaW5lID4gZW5kKSBuZXdsaW5lID0gZW5kO1xuXHRcdHJldHVybiB0ZXh0LnNsaWNlKHN0YXJ0LCBuZXdsaW5lKTtcblx0fSxcblxuXHQvLyBNYXRjaCBhIG11bHRpLWNoYXIgc3RyaW5nIHN0YXJ0aW5nIGF0IGB0ZXh0W3N0YXJ0XWAuXG4vL1RFU1RNRVxuXHRtYXRjaFN0cmluZ0F0SGVhZChzdHJpbmcsIHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgc3RyaW5nRW5kID0gc3RhcnQgKyBzdHJpbmcubGVuZ3RoO1xuXHRcdGlmIChzdHJpbmdFbmQgPiBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHN0cmluZyA9PT0gdGV4dC5zbGljZShzdGFydCwgc3RyaW5nRW5kKTtcblx0fSxcblxuXG5cdC8vIE1hdGNoIGEgcmVndWxhciBleHByZXNzaW9uIHN0YXJ0aW5nIGF0IGB0ZXh0W3N0YXJ0XWAsIHJldHVybmluZyB0aGUgbWF0Y2guXG5cdC8vIFJldHVybnMgYG51bGxgIGlmIG5vIG1hdGNoLlxuXHQvL1xuXHQvLyBOT1RFOiBUaGUgZXhwcmVzc2lvbiBNVVNUIHN0YXJ0IHdpdGggYC9eLi4uL2Bcbi8vVEVTVE1FXG5cdG1hdGNoRXhwcmVzc2lvbkF0SGVhZChleHByZXNzaW9uLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IGhlYWQgPSB0ZXh0LnNsaWNlKHN0YXJ0LCBlbmQpO1xuXHRcdHJldHVybiBoZWFkLm1hdGNoKGV4cHJlc3Npb24pO1xuXHR9LFxuXG5cdC8vIEZpbmQgaW5kZXggb2YgdGhlIG1hdGNoaW5nIFNJTkdMRSBDSEFSQUNURVIgYGVuZERlbGltaXRlcmAgdG8gbWF0Y2ggYHN0YXJ0RGVsaW1pdGVyYC5cblx0Ly8gTWF0Y2hlcyBuZXN0ZWQgZGVsaW1pdGVycyBhbmQgaGFuZGxlcyBlc2NhcGVkIGRlbGltaXRlcnMuXG5cdC8vIEFzc3VtZXMgYHRleHRbc3RhcnRdYCBpcyB0aGUgc3RhcnREZWxpbWl0ZXIhXG5cdC8vIFJldHVybnMgbnVtZXJpYyBpbmRleCBvciBgdW5kZWZpbmVkYCBpZiBubyBtYXRjaCBvciBpZiBmaXJzdCBjaGFyIGlzIG5vdCBgc3RhcnREZWxpbWl0ZXJgLlxuXHQvL1xuXHQvL1x0QWxzbyBoYW5kbGVzIG5lc3RlZCBxdW90ZXMgLS0gaWYgd2UgZW5jb3VudGVyIGEgc2luZ2xlIG9yIGRvdWJsZSBxdW90ZSxcblx0Ly9cdFx0d2UnbGwgc2tpcCBzY2FubmluZyB1bnRpbCB3ZSBmaW5kIGEgbWF0Y2hpbmcgcXVvdGUuXG5cdC8vXG5cdC8vXHRlZzogIGBmaW5kTWF0Y2hpbmdBdEhlYWQoXCJ7XCIsIFwifVwiLCBcInthYXthfWFhfVwiKWAgPT4gOFxuLy9URVNUTUVcblx0ZmluZE1hdGNoaW5nQXRIZWFkKHN0YXJ0RGVsaW1pdGVyLCBlbmREZWxpbWl0ZXIsIHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGV4dFtzdGFydF0gIT09IHN0YXJ0RGVsaW1pdGVyKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IG5lc3RpbmcgPSAwO1xuXHRcdGxldCBjdXJyZW50ID0gc3RhcnQ7XG5cdFx0d2hpbGUgKGN1cnJlbnQgPCBlbmQpIHtcblx0XHRcdGxldCBjaGFyID0gdGV4dFtjdXJyZW50XTtcblx0XHRcdC8vIGlmIHN0YXJ0RGVsaW1pdGVyLCBpbmNyZWFzZSBuZXN0aW5nXG5cdFx0XHRpZiAoY2hhciA9PT0gc3RhcnREZWxpbWl0ZXIpIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0fVxuXHRcdFx0Ly8gaWYgZW5kRGVsaW1pdGVyLCBkZWNyZWFzZSBuZXN0aW5nIGFuZCByZXR1cm4gaWYgbmVzdGluZyBiYWNrIHRvIDBcblx0XHRcdGVsc2UgaWYgKGNoYXIgPT09IGVuZERlbGltaXRlcikge1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKSByZXR1cm4gY3VycmVudDtcblx0XHRcdH1cblx0XHRcdC8vIGlmIGEgc2luZ2xlIG9yIGRvdWJsZSBxdW90ZSwgc2tpcCB1bnRpbCB0aGUgbWF0Y2hpbmcgcXVvdGVcblx0XHRcdGVsc2UgaWYgKGNoYXIgPT09IFwiJ1wiIHx8IGNoYXIgPT09ICdcIicpIHtcblx0XHRcdFx0bGV0IFt0b2tlbiwgYWZ0ZXJRdW90ZV0gPSB0aGlzLm1hdGNoVGV4dCh0ZXh0LCBjdXJyZW50LCBlbmQpIHx8IFtdO1xuXHRcdFx0XHRjdXJyZW50ID0gYWZ0ZXJRdW90ZTtcblx0XHRcdFx0Y29udGludWU7XHQvLyBjb250aW51ZSBzbyB3ZSBkb24ndCBhZGQgMSB0byBjdXJlbnQgYmVsb3dcblx0XHRcdH1cblx0XHRcdC8vIElmIGJhY2tzbGFzaCwgc2tpcCBhbiBleHRyYSBjaGFyIGlmIGl0J3MgZWl0aGVyIGRlbGltaXRlciBvciBhIHF1b3RlXG5cdFx0XHRlbHNlIGlmIChjaGFyID09PSBcIlxcXFxcIikge1xuXHRcdFx0XHRjaGFyID0gdGV4dFtjdXJyZW50ICsgMV07XG5cdFx0XHRcdGlmIChjaGFyID09PSBzdGFydERlbGltaXRlclxuXHRcdFx0XHQgfHwgY2hhciA9PT0gZW5kRGVsaW1pdGVyXG5cdFx0XHRcdCB8fCBjaGFyID09PSBcIidcIlxuXHRcdFx0XHQgfHwgY2hhciA9PT0gJ1wiJ1xuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHRjdXJyZW50Kys7O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50Kys7XG5cdFx0fVxuXHR9LFxuXG5cbi8vVE9ETzogIGBmaW5kQXRIZWFkKHRoaW5nKWAgd2hlcmUgdGhpbmcgaXNcbi8vXHRcdFx0LSAoc2luZ2xlIG9yIG11bHRpLWNoYXIpIHN0cmluZ1xuLy9cdFx0XHQtIGFycmF5IG9mIGFsdGVybmF0aXZlIHN0cmluZ3Ncbi8vXHRcdFx0LSByZWd1bGFyIGV4cHJlc3Npb25cblxuXHQvLyBSZXR1cm4gdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBOT04tRVNDQVBFRCBjaGFyYWN0ZXIgaW4gYGNoYXJzYCBhZnRlciBgdGV4dFtzdGFydF1gLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIHdlIGRpZG4ndCBmaW5kIGEgbWF0Y2guXG4vL1RFU1RNRVxuXHRmaW5kRmlyc3RBdEhlYWQoY2hhcnMsIHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHR3aGlsZSAoc3RhcnQgPCBlbmQpIHtcblx0XHRcdGxldCBjaGFyID0gdGV4dFtzdGFydF07XG5cdFx0XHRpZiAoY2hhcnMuaW5jbHVkZXMoY2hhcikpIHJldHVybiBzdGFydDtcblx0XHRcdC8vIGlmIHdlIGdvdCBhbiBlc2NhcGUgY2hhciwgaWdub3JlIHRoZSBuZXh0IGNoYXIgaWYgaXQncyBpbiBgY2hhcnNgXG5cdFx0XHRpZiAoY2hhciA9PT0gXCJcXFxcXCIgJiYgY2hhcnMuaW5jbHVkZXModGV4dFtzdGFydCsxXSkpIHN0YXJ0Kys7XG5cdFx0XHRzdGFydCsrO1xuXHRcdH1cblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiBzdGFydDtcblx0fVxuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBUb2tlbml6ZXI7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvVG9rZW5pemVyLmpzIiwiLypcblx0TUlUIExpY2Vuc2UgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcblx0QXV0aG9yIFRvYmlhcyBLb3BwZXJzIEBzb2tyYVxuKi9cbi8vIGNzcyBiYXNlIGNvZGUsIGluamVjdGVkIGJ5IHRoZSBjc3MtbG9hZGVyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHVzZVNvdXJjZU1hcCkge1xuXHR2YXIgbGlzdCA9IFtdO1xuXG5cdC8vIHJldHVybiB0aGUgbGlzdCBvZiBtb2R1bGVzIGFzIGNzcyBzdHJpbmdcblx0bGlzdC50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuXHRcdFx0dmFyIGNvbnRlbnQgPSBjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKGl0ZW0sIHVzZVNvdXJjZU1hcCk7XG5cdFx0XHRpZihpdGVtWzJdKSB7XG5cdFx0XHRcdHJldHVybiBcIkBtZWRpYSBcIiArIGl0ZW1bMl0gKyBcIntcIiArIGNvbnRlbnQgKyBcIn1cIjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBjb250ZW50O1xuXHRcdFx0fVxuXHRcdH0pLmpvaW4oXCJcIik7XG5cdH07XG5cblx0Ly8gaW1wb3J0IGEgbGlzdCBvZiBtb2R1bGVzIGludG8gdGhlIGxpc3Rcblx0bGlzdC5pID0gZnVuY3Rpb24obW9kdWxlcywgbWVkaWFRdWVyeSkge1xuXHRcdGlmKHR5cGVvZiBtb2R1bGVzID09PSBcInN0cmluZ1wiKVxuXHRcdFx0bW9kdWxlcyA9IFtbbnVsbCwgbW9kdWxlcywgXCJcIl1dO1xuXHRcdHZhciBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzID0ge307XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpZCA9IHRoaXNbaV1bMF07XG5cdFx0XHRpZih0eXBlb2YgaWQgPT09IFwibnVtYmVyXCIpXG5cdFx0XHRcdGFscmVhZHlJbXBvcnRlZE1vZHVsZXNbaWRdID0gdHJ1ZTtcblx0XHR9XG5cdFx0Zm9yKGkgPSAwOyBpIDwgbW9kdWxlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGl0ZW0gPSBtb2R1bGVzW2ldO1xuXHRcdFx0Ly8gc2tpcCBhbHJlYWR5IGltcG9ydGVkIG1vZHVsZVxuXHRcdFx0Ly8gdGhpcyBpbXBsZW1lbnRhdGlvbiBpcyBub3QgMTAwJSBwZXJmZWN0IGZvciB3ZWlyZCBtZWRpYSBxdWVyeSBjb21iaW5hdGlvbnNcblx0XHRcdC8vICB3aGVuIGEgbW9kdWxlIGlzIGltcG9ydGVkIG11bHRpcGxlIHRpbWVzIHdpdGggZGlmZmVyZW50IG1lZGlhIHF1ZXJpZXMuXG5cdFx0XHQvLyAgSSBob3BlIHRoaXMgd2lsbCBuZXZlciBvY2N1ciAoSGV5IHRoaXMgd2F5IHdlIGhhdmUgc21hbGxlciBidW5kbGVzKVxuXHRcdFx0aWYodHlwZW9mIGl0ZW1bMF0gIT09IFwibnVtYmVyXCIgfHwgIWFscmVhZHlJbXBvcnRlZE1vZHVsZXNbaXRlbVswXV0pIHtcblx0XHRcdFx0aWYobWVkaWFRdWVyeSAmJiAhaXRlbVsyXSkge1xuXHRcdFx0XHRcdGl0ZW1bMl0gPSBtZWRpYVF1ZXJ5O1xuXHRcdFx0XHR9IGVsc2UgaWYobWVkaWFRdWVyeSkge1xuXHRcdFx0XHRcdGl0ZW1bMl0gPSBcIihcIiArIGl0ZW1bMl0gKyBcIikgYW5kIChcIiArIG1lZGlhUXVlcnkgKyBcIilcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRsaXN0LnB1c2goaXRlbSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXHRyZXR1cm4gbGlzdDtcbn07XG5cbmZ1bmN0aW9uIGNzc1dpdGhNYXBwaW5nVG9TdHJpbmcoaXRlbSwgdXNlU291cmNlTWFwKSB7XG5cdHZhciBjb250ZW50ID0gaXRlbVsxXSB8fCAnJztcblx0dmFyIGNzc01hcHBpbmcgPSBpdGVtWzNdO1xuXHRpZiAoIWNzc01hcHBpbmcpIHtcblx0XHRyZXR1cm4gY29udGVudDtcblx0fVxuXG5cdGlmICh1c2VTb3VyY2VNYXAgJiYgdHlwZW9mIGJ0b2EgPT09ICdmdW5jdGlvbicpIHtcblx0XHR2YXIgc291cmNlTWFwcGluZyA9IHRvQ29tbWVudChjc3NNYXBwaW5nKTtcblx0XHR2YXIgc291cmNlVVJMcyA9IGNzc01hcHBpbmcuc291cmNlcy5tYXAoZnVuY3Rpb24gKHNvdXJjZSkge1xuXHRcdFx0cmV0dXJuICcvKiMgc291cmNlVVJMPScgKyBjc3NNYXBwaW5nLnNvdXJjZVJvb3QgKyBzb3VyY2UgKyAnICovJ1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFtjb250ZW50XS5jb25jYXQoc291cmNlVVJMcykuY29uY2F0KFtzb3VyY2VNYXBwaW5nXSkuam9pbignXFxuJyk7XG5cdH1cblxuXHRyZXR1cm4gW2NvbnRlbnRdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyBBZGFwdGVkIGZyb20gY29udmVydC1zb3VyY2UtbWFwIChNSVQpXG5mdW5jdGlvbiB0b0NvbW1lbnQoc291cmNlTWFwKSB7XG5cdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlZlxuXHR2YXIgYmFzZTY0ID0gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoc291cmNlTWFwKSkpKTtcblx0dmFyIGRhdGEgPSAnc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsJyArIGJhc2U2NDtcblxuXHRyZXR1cm4gJy8qIyAnICsgZGF0YSArICcgKi8nO1xufVxuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L2Nzcy1sb2FkZXIvbGliL2Nzcy1iYXNlLmpzXG4vLyBtb2R1bGUgaWQgPSAyNDdcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgdmFyIFJFQUNUX0VMRU1FTlRfVFlQRSA9ICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmXG4gICAgU3ltYm9sLmZvciAmJlxuICAgIFN5bWJvbC5mb3IoJ3JlYWN0LmVsZW1lbnQnKSkgfHxcbiAgICAweGVhYzc7XG5cbiAgdmFyIGlzVmFsaWRFbGVtZW50ID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICBvYmplY3QgIT09IG51bGwgJiZcbiAgICAgIG9iamVjdC4kJHR5cGVvZiA9PT0gUkVBQ1RfRUxFTUVOVF9UWVBFO1xuICB9O1xuXG4gIC8vIEJ5IGV4cGxpY2l0bHkgdXNpbmcgYHByb3AtdHlwZXNgIHlvdSBhcmUgb3B0aW5nIGludG8gbmV3IGRldmVsb3BtZW50IGJlaGF2aW9yLlxuICAvLyBodHRwOi8vZmIubWUvcHJvcC10eXBlcy1pbi1wcm9kXG4gIHZhciB0aHJvd09uRGlyZWN0QWNjZXNzID0gdHJ1ZTtcbiAgbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2ZhY3RvcnlXaXRoVHlwZUNoZWNrZXJzJykoaXNWYWxpZEVsZW1lbnQsIHRocm93T25EaXJlY3RBY2Nlc3MpO1xufSBlbHNlIHtcbiAgLy8gQnkgZXhwbGljaXRseSB1c2luZyBgcHJvcC10eXBlc2AgeW91IGFyZSBvcHRpbmcgaW50byBuZXcgcHJvZHVjdGlvbiBiZWhhdmlvci5cbiAgLy8gaHR0cDovL2ZiLm1lL3Byb3AtdHlwZXMtaW4tcHJvZFxuICBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZmFjdG9yeVdpdGhUaHJvd2luZ1NoaW1zJykoKTtcbn1cblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL2luZGV4LmpzXG4vLyBtb2R1bGUgaWQgPSAyNDhcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3RQcm9wVHlwZXNTZWNyZXQgPSAnU0VDUkVUX0RPX05PVF9QQVNTX1RISVNfT1JfWU9VX1dJTExfQkVfRklSRUQnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0UHJvcFR5cGVzU2VjcmV0O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3Byb3AtdHlwZXMvbGliL1JlYWN0UHJvcFR5cGVzU2VjcmV0LmpzXG4vLyBtb2R1bGUgaWQgPSAyNDlcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxNC0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVtcHR5RnVuY3Rpb24gPSByZXF1aXJlKCcuL2VtcHR5RnVuY3Rpb24nKTtcblxuLyoqXG4gKiBTaW1pbGFyIHRvIGludmFyaWFudCBidXQgb25seSBsb2dzIGEgd2FybmluZyBpZiB0aGUgY29uZGl0aW9uIGlzIG5vdCBtZXQuXG4gKiBUaGlzIGNhbiBiZSB1c2VkIHRvIGxvZyBpc3N1ZXMgaW4gZGV2ZWxvcG1lbnQgZW52aXJvbm1lbnRzIGluIGNyaXRpY2FsXG4gKiBwYXRocy4gUmVtb3ZpbmcgdGhlIGxvZ2dpbmcgY29kZSBmb3IgcHJvZHVjdGlvbiBlbnZpcm9ubWVudHMgd2lsbCBrZWVwIHRoZVxuICogc2FtZSBsb2dpYyBhbmQgZm9sbG93IHRoZSBzYW1lIGNvZGUgcGF0aHMuXG4gKi9cblxudmFyIHdhcm5pbmcgPSBlbXB0eUZ1bmN0aW9uO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBwcmludFdhcm5pbmcgPSBmdW5jdGlvbiBwcmludFdhcm5pbmcoZm9ybWF0KSB7XG4gICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4gPiAxID8gX2xlbiAtIDEgOiAwKSwgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgYXJnc1tfa2V5IC0gMV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgICB9XG5cbiAgICAgIHZhciBhcmdJbmRleCA9IDA7XG4gICAgICB2YXIgbWVzc2FnZSA9ICdXYXJuaW5nOiAnICsgZm9ybWF0LnJlcGxhY2UoLyVzL2csIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107XG4gICAgICB9KTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIC0tLSBXZWxjb21lIHRvIGRlYnVnZ2luZyBSZWFjdCAtLS1cbiAgICAgICAgLy8gVGhpcyBlcnJvciB3YXMgdGhyb3duIGFzIGEgY29udmVuaWVuY2Ugc28gdGhhdCB5b3UgY2FuIHVzZSB0aGlzIHN0YWNrXG4gICAgICAgIC8vIHRvIGZpbmQgdGhlIGNhbGxzaXRlIHRoYXQgY2F1c2VkIHRoaXMgd2FybmluZyB0byBmaXJlLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICB9IGNhdGNoICh4KSB7fVxuICAgIH07XG5cbiAgICB3YXJuaW5nID0gZnVuY3Rpb24gd2FybmluZyhjb25kaXRpb24sIGZvcm1hdCkge1xuICAgICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYHdhcm5pbmcoY29uZGl0aW9uLCBmb3JtYXQsIC4uLmFyZ3MpYCByZXF1aXJlcyBhIHdhcm5pbmcgJyArICdtZXNzYWdlIGFyZ3VtZW50Jyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChmb3JtYXQuaW5kZXhPZignRmFpbGVkIENvbXBvc2l0ZSBwcm9wVHlwZTogJykgPT09IDApIHtcbiAgICAgICAgcmV0dXJuOyAvLyBJZ25vcmUgQ29tcG9zaXRlQ29tcG9uZW50IHByb3B0eXBlIGNoZWNrLlxuICAgICAgfVxuXG4gICAgICBpZiAoIWNvbmRpdGlvbikge1xuICAgICAgICBmb3IgKHZhciBfbGVuMiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuMiA+IDIgPyBfbGVuMiAtIDIgOiAwKSwgX2tleTIgPSAyOyBfa2V5MiA8IF9sZW4yOyBfa2V5MisrKSB7XG4gICAgICAgICAgYXJnc1tfa2V5MiAtIDJdID0gYXJndW1lbnRzW19rZXkyXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByaW50V2FybmluZy5hcHBseSh1bmRlZmluZWQsIFtmb3JtYXRdLmNvbmNhdChhcmdzKSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSkoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3YXJuaW5nO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvd2FybmluZy5qc1xuLy8gbW9kdWxlIGlkID0gMjUwXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsImZ1bmN0aW9uIF90b0NvbnN1bWFibGVBcnJheShhcnIpIHsgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgeyBmb3IgKHZhciBpID0gMCwgYXJyMiA9IEFycmF5KGFyci5sZW5ndGgpOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7IGFycjJbaV0gPSBhcnJbaV07IH0gcmV0dXJuIGFycjI7IH0gZWxzZSB7IHJldHVybiBBcnJheS5mcm9tKGFycik7IH0gfVxuXG4vKiBlc2xpbnQtZGlzYWJsZSBuby11c2UtYmVmb3JlLWRlZmluZSAqL1xuLyoqXG4gKiBAbW9kdWxlIGV2ZW50SGFuZGxlcnNcbiAqXG4gKi9cbmltcG9ydCBkb21IZWxwZXJzIGZyb20gJy4vbGliL2RvbV9oZWxwZXJzJztcbmltcG9ydCBsaXN0ZW5lcnMgZnJvbSAnLi9saWIvbGlzdGVuZXJzJztcbmltcG9ydCBzdG9yZSBmcm9tICcuL3N0b3JlJztcblxuLyoqXG4gKiBwcml2YXRlXG4gKlxuICovXG5cbi8qKlxuICogX29uQ2xpY2tcbiAqXG4gKiBAYWNjZXNzIHByaXZhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBldmVudCBUaGUgY2xpY2sgZXZlbnQgb2JqZWN0XG4gKiBAcGFyYW0ge29iamVjdH0gZXZlbnQudGFyZ2V0IFRoZSBET00gbm9kZSBmcm9tIHRoZSBjbGljayBldmVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gX29uQ2xpY2soX3JlZikge1xuICB2YXIgdGFyZ2V0ID0gX3JlZi50YXJnZXQ7XG5cbiAgc3RvcmUuYWN0aXZhdGUoW10uY29uY2F0KF90b0NvbnN1bWFibGVBcnJheShzdG9yZS5nZXRJbnN0YW5jZXMoKSkpLnJlZHVjZShkb21IZWxwZXJzLmZpbmRDb250YWluZXJOb2Rlcyh0YXJnZXQpLCBbXSkuc29ydChkb21IZWxwZXJzLnNvcnRCeURPTVBvc2l0aW9uKS5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbS5pbnN0YW5jZTtcbiAgfSkpO1xufVxuXG4vKipcbiAqIF9vbktleURvd246IFRoZSBrZXlkb3duIGV2ZW50IGNhbGxiYWNrXG4gKlxuICogQGFjY2VzcyBwcml2YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gZXZlbnQgVGhlIGtleWRvd24gZXZlbnQgb2JqZWN0XG4gKiBAcGFyYW0ge251bWJlcn0gZXZlbnQud2hpY2ggVGhlIGtleSBjb2RlICh3aGljaCkgcmVjZWl2ZWQgZnJvbSB0aGUga2V5ZG93biBldmVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gX29uS2V5RG93bihldmVudCkge1xuICB2YXIgZm9yY2VDb25zaWRlciA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogZmFsc2U7XG5cbiAgaWYgKGZvcmNlQ29uc2lkZXIgfHwgX3Nob3VsZENvbnNpZGVyKGV2ZW50KSkge1xuICAgIHZhciBfcmVmMiA9IHN0b3JlLmZpbmRCaW5kaW5nRm9yRXZlbnQoZXZlbnQpIHx8IHt9LFxuICAgICAgICBmbiA9IF9yZWYyLmZuLFxuICAgICAgICBpbnN0YW5jZSA9IF9yZWYyLmluc3RhbmNlO1xuXG4gICAgaWYgKGZuKSB7XG4gICAgICBmbi5jYWxsKGluc3RhbmNlLCBldmVudCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIF9zaG91bGRDb25zaWRlcjogQ29uZGl0aW9ucyBmb3IgcHJvY2VlZGluZyB3aXRoIGtleSBldmVudCBoYW5kbGluZ1xuICpcbiAqIEBhY2Nlc3MgcHJpdmF0ZVxuICogQHBhcmFtIHtvYmplY3R9IGV2ZW50IFRoZSBrZXlkb3duIGV2ZW50IG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IGV2ZW50LnRhcmdldCBUaGUgbm9kZSBvcmlnaW4gb2YgdGhlIGV2ZW50XG4gKiBAcmV0dXJuIHtib29sZWFufSBXaGV0aGVyIHRvIGNvbnRpbnVlIHByb2Nlc2luZyB0aGUga2V5ZG93biBldmVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gX3Nob3VsZENvbnNpZGVyKF9yZWYzKSB7XG4gIHZhciBjdHJsS2V5ID0gX3JlZjMuY3RybEtleSxcbiAgICAgIHRhcmdldCA9IF9yZWYzLnRhcmdldDtcblxuICByZXR1cm4gY3RybEtleSB8fCAhflsnSU5QVVQnLCAnU0VMRUNUJywgJ1RFWFRBUkVBJ10uaW5kZXhPZih0YXJnZXQudGFnTmFtZSkgfHwgdGFyZ2V0LmdldEF0dHJpYnV0ZSgncm9sZScpICE9PSAndGV4dGJveCc7XG59XG5cbi8qKlxuICogcHVibGljXG4gKlxuICovXG5cbi8qKlxuICogb25Nb3VudFxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKi9cbmZ1bmN0aW9uIG9uTW91bnQoaW5zdGFuY2UpIHtcbiAgLy8gaGF2ZSB0byBidW1wIHRoaXMgdG8gbmV4dCBldmVudCBsb29wIGJlY2F1c2UgY29tcG9uZW50IG1vdW50aW5nIHJvdXRpbmVseVxuICAvLyBwcmVjZWVkcyB0aGUgZG9tIGNsaWNrIGV2ZW50IHRoYXQgdHJpZ2dlcmVkIHRoZSBtb3VudCAod3RmPylcbiAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHN0b3JlLmFjdGl2YXRlKGluc3RhbmNlKTtcbiAgfSwgMCk7XG4gIGxpc3RlbmVycy5iaW5kS2V5cyhfb25LZXlEb3duKTtcbiAgbGlzdGVuZXJzLmJpbmRDbGlja3MoX29uQ2xpY2spO1xuICBkb21IZWxwZXJzLmJpbmRGb2N1c2FibGVzKGluc3RhbmNlLCBzdG9yZS5hY3RpdmF0ZSk7XG59XG5cbi8qKlxuICogb25Vbm1vdW50XG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gb25Vbm1vdW50KGluc3RhbmNlKSB7XG4gIHN0b3JlLmRlbGV0ZUluc3RhbmNlKGluc3RhbmNlKTtcbiAgaWYgKHN0b3JlLmlzRW1wdHkoKSkge1xuICAgIGxpc3RlbmVycy51bmJpbmRDbGlja3MoX29uQ2xpY2spO1xuICAgIGxpc3RlbmVycy51bmJpbmRLZXlzKF9vbktleURvd24pO1xuICB9XG59XG5cbmV4cG9ydCB7IG9uTW91bnQsIG9uVW5tb3VudCB9O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2V2ZW50X2hhbmRsZXJzLmpzXG4vLyBtb2R1bGUgaWQgPSAyNzdcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiaW1wb3J0IHsgbW9kaWZpZXJzIGFzIG1vZGlmaWVyS2V5cyB9IGZyb20gJy4va2V5cyc7XG5cbnZhciBtb2RLZXlzID0gT2JqZWN0LmtleXMobW9kaWZpZXJLZXlzKTtcblxuZnVuY3Rpb24gbWF0Y2hLZXlzKF9yZWYpIHtcbiAgdmFyIF9yZWYka2V5U2V0ID0gX3JlZi5rZXlTZXQsXG4gICAgICBrZXkgPSBfcmVmJGtleVNldC5rZXksXG4gICAgICBfcmVmJGtleVNldCRtb2RpZmllcnMgPSBfcmVmJGtleVNldC5tb2RpZmllcnMsXG4gICAgICBtb2RpZmllcnMgPSBfcmVmJGtleVNldCRtb2RpZmllcnMgPT09IHVuZGVmaW5lZCA/IFtdIDogX3JlZiRrZXlTZXQkbW9kaWZpZXJzLFxuICAgICAgZXZlbnQgPSBfcmVmLmV2ZW50O1xuXG4gIHZhciBrZXlzTWF0Y2ggPSBmYWxzZTtcbiAgaWYgKGtleSA9PT0gZXZlbnQud2hpY2gpIHtcbiAgICB2YXIgZXZ0TW9kS2V5cyA9IG1vZEtleXMuZmlsdGVyKGZ1bmN0aW9uIChtb2RLZXkpIHtcbiAgICAgIHJldHVybiBldmVudFttb2RLZXkgKyAnS2V5J107XG4gICAgfSkuc29ydCgpO1xuICAgIGtleXNNYXRjaCA9IG1vZGlmaWVycy5sZW5ndGggPT09IGV2dE1vZEtleXMubGVuZ3RoICYmIG1vZGlmaWVycy5ldmVyeShmdW5jdGlvbiAobW9kS2V5LCBpbmRleCkge1xuICAgICAgcmV0dXJuIGV2dE1vZEtleXNbaW5kZXhdID09PSBtb2RLZXk7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIGtleXNNYXRjaDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgbWF0Y2hLZXlzO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9tYXRjaF9rZXlzLmpzXG4vLyBtb2R1bGUgaWQgPSAyNzhcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiaW1wb3J0IEtleXMsIHsgbW9kaWZpZXJzIH0gZnJvbSAnLi9rZXlzJztcblxuZnVuY3Rpb24gcGFyc2VLZXlzKGtleXNBcnJheSkge1xuICByZXR1cm4ga2V5c0FycmF5Lm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgdmFyIGtleVNldCA9IHsga2V5OiBrZXkgfTtcbiAgICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBrZXlTdHJpbmcgPSBrZXkudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gICAgICB2YXIgbWF0Y2hlcyA9IGtleVN0cmluZy5zcGxpdCgvXFxzP1xcK1xccz8vKTtcbiAgICAgIGtleVNldCA9IG1hdGNoZXMubGVuZ3RoID09PSAxID8geyBrZXk6IEtleXNba2V5U3RyaW5nXSB9IDoge1xuICAgICAgICBrZXk6IEtleXNbbWF0Y2hlcy5wb3AoKV0sXG4gICAgICAgIG1vZGlmaWVyczogbWF0Y2hlcy5tYXAoZnVuY3Rpb24gKG1vZEtleSkge1xuICAgICAgICAgIHJldHVybiBtb2RpZmllcnNbbW9kS2V5XTtcbiAgICAgICAgfSkuc29ydCgpXG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4ga2V5U2V0O1xuICB9KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgcGFyc2VLZXlzO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9wYXJzZV9rZXlzLmpzXG4vLyBtb2R1bGUgaWQgPSAyNzlcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLypcblx0TUlUIExpY2Vuc2UgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcblx0QXV0aG9yIFRvYmlhcyBLb3BwZXJzIEBzb2tyYVxuKi9cbnZhciBzdHlsZXNJbkRvbSA9IHt9LFxuXHRtZW1vaXplID0gZnVuY3Rpb24oZm4pIHtcblx0XHR2YXIgbWVtbztcblx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHR5cGVvZiBtZW1vID09PSBcInVuZGVmaW5lZFwiKSBtZW1vID0gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdHJldHVybiBtZW1vO1xuXHRcdH07XG5cdH0sXG5cdGlzT2xkSUUgPSBtZW1vaXplKGZ1bmN0aW9uKCkge1xuXHRcdC8vIFRlc3QgZm9yIElFIDw9IDkgYXMgcHJvcG9zZWQgYnkgQnJvd3NlcmhhY2tzXG5cdFx0Ly8gQHNlZSBodHRwOi8vYnJvd3NlcmhhY2tzLmNvbS8jaGFjay1lNzFkODY5MmY2NTMzNDE3M2ZlZTcxNWMyMjJjYjgwNVxuXHRcdC8vIFRlc3RzIGZvciBleGlzdGVuY2Ugb2Ygc3RhbmRhcmQgZ2xvYmFscyBpcyB0byBhbGxvdyBzdHlsZS1sb2FkZXIgXG5cdFx0Ly8gdG8gb3BlcmF0ZSBjb3JyZWN0bHkgaW50byBub24tc3RhbmRhcmQgZW52aXJvbm1lbnRzXG5cdFx0Ly8gQHNlZSBodHRwczovL2dpdGh1Yi5jb20vd2VicGFjay1jb250cmliL3N0eWxlLWxvYWRlci9pc3N1ZXMvMTc3XG5cdFx0cmV0dXJuIHdpbmRvdyAmJiBkb2N1bWVudCAmJiBkb2N1bWVudC5hbGwgJiYgIXdpbmRvdy5hdG9iO1xuXHR9KSxcblx0Z2V0RWxlbWVudCA9IChmdW5jdGlvbihmbikge1xuXHRcdHZhciBtZW1vID0ge307XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG5cdFx0XHRpZiAodHlwZW9mIG1lbW9bc2VsZWN0b3JdID09PSBcInVuZGVmaW5lZFwiKSB7XG5cdFx0XHRcdG1lbW9bc2VsZWN0b3JdID0gZm4uY2FsbCh0aGlzLCBzZWxlY3Rvcik7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbWVtb1tzZWxlY3Rvcl1cblx0XHR9O1xuXHR9KShmdW5jdGlvbiAoc3R5bGVUYXJnZXQpIHtcblx0XHRyZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzdHlsZVRhcmdldClcblx0fSksXG5cdHNpbmdsZXRvbkVsZW1lbnQgPSBudWxsLFxuXHRzaW5nbGV0b25Db3VudGVyID0gMCxcblx0c3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3AgPSBbXSxcblx0Zml4VXJscyA9IHJlcXVpcmUoXCIuL2ZpeFVybHNcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obGlzdCwgb3B0aW9ucykge1xuXHRpZih0eXBlb2YgREVCVUcgIT09IFwidW5kZWZpbmVkXCIgJiYgREVCVUcpIHtcblx0XHRpZih0eXBlb2YgZG9jdW1lbnQgIT09IFwib2JqZWN0XCIpIHRocm93IG5ldyBFcnJvcihcIlRoZSBzdHlsZS1sb2FkZXIgY2Fubm90IGJlIHVzZWQgaW4gYSBub24tYnJvd3NlciBlbnZpcm9ubWVudFwiKTtcblx0fVxuXG5cdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRvcHRpb25zLmF0dHJzID0gdHlwZW9mIG9wdGlvbnMuYXR0cnMgPT09IFwib2JqZWN0XCIgPyBvcHRpb25zLmF0dHJzIDoge307XG5cblx0Ly8gRm9yY2Ugc2luZ2xlLXRhZyBzb2x1dGlvbiBvbiBJRTYtOSwgd2hpY2ggaGFzIGEgaGFyZCBsaW1pdCBvbiB0aGUgIyBvZiA8c3R5bGU+XG5cdC8vIHRhZ3MgaXQgd2lsbCBhbGxvdyBvbiBhIHBhZ2Vcblx0aWYgKHR5cGVvZiBvcHRpb25zLnNpbmdsZXRvbiA9PT0gXCJ1bmRlZmluZWRcIikgb3B0aW9ucy5zaW5nbGV0b24gPSBpc09sZElFKCk7XG5cblx0Ly8gQnkgZGVmYXVsdCwgYWRkIDxzdHlsZT4gdGFncyB0byB0aGUgPGhlYWQ+IGVsZW1lbnRcblx0aWYgKHR5cGVvZiBvcHRpb25zLmluc2VydEludG8gPT09IFwidW5kZWZpbmVkXCIpIG9wdGlvbnMuaW5zZXJ0SW50byA9IFwiaGVhZFwiO1xuXG5cdC8vIEJ5IGRlZmF1bHQsIGFkZCA8c3R5bGU+IHRhZ3MgdG8gdGhlIGJvdHRvbSBvZiB0aGUgdGFyZ2V0XG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5pbnNlcnRBdCA9PT0gXCJ1bmRlZmluZWRcIikgb3B0aW9ucy5pbnNlcnRBdCA9IFwiYm90dG9tXCI7XG5cblx0dmFyIHN0eWxlcyA9IGxpc3RUb1N0eWxlcyhsaXN0LCBvcHRpb25zKTtcblx0YWRkU3R5bGVzVG9Eb20oc3R5bGVzLCBvcHRpb25zKTtcblxuXHRyZXR1cm4gZnVuY3Rpb24gdXBkYXRlKG5ld0xpc3QpIHtcblx0XHR2YXIgbWF5UmVtb3ZlID0gW107XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHN0eWxlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGl0ZW0gPSBzdHlsZXNbaV07XG5cdFx0XHR2YXIgZG9tU3R5bGUgPSBzdHlsZXNJbkRvbVtpdGVtLmlkXTtcblx0XHRcdGRvbVN0eWxlLnJlZnMtLTtcblx0XHRcdG1heVJlbW92ZS5wdXNoKGRvbVN0eWxlKTtcblx0XHR9XG5cdFx0aWYobmV3TGlzdCkge1xuXHRcdFx0dmFyIG5ld1N0eWxlcyA9IGxpc3RUb1N0eWxlcyhuZXdMaXN0LCBvcHRpb25zKTtcblx0XHRcdGFkZFN0eWxlc1RvRG9tKG5ld1N0eWxlcywgb3B0aW9ucyk7XG5cdFx0fVxuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCBtYXlSZW1vdmUubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBkb21TdHlsZSA9IG1heVJlbW92ZVtpXTtcblx0XHRcdGlmKGRvbVN0eWxlLnJlZnMgPT09IDApIHtcblx0XHRcdFx0Zm9yKHZhciBqID0gMDsgaiA8IGRvbVN0eWxlLnBhcnRzLmxlbmd0aDsgaisrKVxuXHRcdFx0XHRcdGRvbVN0eWxlLnBhcnRzW2pdKCk7XG5cdFx0XHRcdGRlbGV0ZSBzdHlsZXNJbkRvbVtkb21TdHlsZS5pZF07XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufTtcblxuZnVuY3Rpb24gYWRkU3R5bGVzVG9Eb20oc3R5bGVzLCBvcHRpb25zKSB7XG5cdGZvcih2YXIgaSA9IDA7IGkgPCBzdHlsZXMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgaXRlbSA9IHN0eWxlc1tpXTtcblx0XHR2YXIgZG9tU3R5bGUgPSBzdHlsZXNJbkRvbVtpdGVtLmlkXTtcblx0XHRpZihkb21TdHlsZSkge1xuXHRcdFx0ZG9tU3R5bGUucmVmcysrO1xuXHRcdFx0Zm9yKHZhciBqID0gMDsgaiA8IGRvbVN0eWxlLnBhcnRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdGRvbVN0eWxlLnBhcnRzW2pdKGl0ZW0ucGFydHNbal0pO1xuXHRcdFx0fVxuXHRcdFx0Zm9yKDsgaiA8IGl0ZW0ucGFydHMubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0ZG9tU3R5bGUucGFydHMucHVzaChhZGRTdHlsZShpdGVtLnBhcnRzW2pdLCBvcHRpb25zKSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhciBwYXJ0cyA9IFtdO1xuXHRcdFx0Zm9yKHZhciBqID0gMDsgaiA8IGl0ZW0ucGFydHMubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0cGFydHMucHVzaChhZGRTdHlsZShpdGVtLnBhcnRzW2pdLCBvcHRpb25zKSk7XG5cdFx0XHR9XG5cdFx0XHRzdHlsZXNJbkRvbVtpdGVtLmlkXSA9IHtpZDogaXRlbS5pZCwgcmVmczogMSwgcGFydHM6IHBhcnRzfTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gbGlzdFRvU3R5bGVzKGxpc3QsIG9wdGlvbnMpIHtcblx0dmFyIHN0eWxlcyA9IFtdO1xuXHR2YXIgbmV3U3R5bGVzID0ge307XG5cdGZvcih2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGl0ZW0gPSBsaXN0W2ldO1xuXHRcdHZhciBpZCA9IG9wdGlvbnMuYmFzZSA/IGl0ZW1bMF0gKyBvcHRpb25zLmJhc2UgOiBpdGVtWzBdO1xuXHRcdHZhciBjc3MgPSBpdGVtWzFdO1xuXHRcdHZhciBtZWRpYSA9IGl0ZW1bMl07XG5cdFx0dmFyIHNvdXJjZU1hcCA9IGl0ZW1bM107XG5cdFx0dmFyIHBhcnQgPSB7Y3NzOiBjc3MsIG1lZGlhOiBtZWRpYSwgc291cmNlTWFwOiBzb3VyY2VNYXB9O1xuXHRcdGlmKCFuZXdTdHlsZXNbaWRdKVxuXHRcdFx0c3R5bGVzLnB1c2gobmV3U3R5bGVzW2lkXSA9IHtpZDogaWQsIHBhcnRzOiBbcGFydF19KTtcblx0XHRlbHNlXG5cdFx0XHRuZXdTdHlsZXNbaWRdLnBhcnRzLnB1c2gocGFydCk7XG5cdH1cblx0cmV0dXJuIHN0eWxlcztcbn1cblxuZnVuY3Rpb24gaW5zZXJ0U3R5bGVFbGVtZW50KG9wdGlvbnMsIHN0eWxlRWxlbWVudCkge1xuXHR2YXIgc3R5bGVUYXJnZXQgPSBnZXRFbGVtZW50KG9wdGlvbnMuaW5zZXJ0SW50bylcblx0aWYgKCFzdHlsZVRhcmdldCkge1xuXHRcdHRocm93IG5ldyBFcnJvcihcIkNvdWxkbid0IGZpbmQgYSBzdHlsZSB0YXJnZXQuIFRoaXMgcHJvYmFibHkgbWVhbnMgdGhhdCB0aGUgdmFsdWUgZm9yIHRoZSAnaW5zZXJ0SW50bycgcGFyYW1ldGVyIGlzIGludmFsaWQuXCIpO1xuXHR9XG5cdHZhciBsYXN0U3R5bGVFbGVtZW50SW5zZXJ0ZWRBdFRvcCA9IHN0eWxlRWxlbWVudHNJbnNlcnRlZEF0VG9wW3N0eWxlRWxlbWVudHNJbnNlcnRlZEF0VG9wLmxlbmd0aCAtIDFdO1xuXHRpZiAob3B0aW9ucy5pbnNlcnRBdCA9PT0gXCJ0b3BcIikge1xuXHRcdGlmKCFsYXN0U3R5bGVFbGVtZW50SW5zZXJ0ZWRBdFRvcCkge1xuXHRcdFx0c3R5bGVUYXJnZXQuaW5zZXJ0QmVmb3JlKHN0eWxlRWxlbWVudCwgc3R5bGVUYXJnZXQuZmlyc3RDaGlsZCk7XG5cdFx0fSBlbHNlIGlmKGxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wLm5leHRTaWJsaW5nKSB7XG5cdFx0XHRzdHlsZVRhcmdldC5pbnNlcnRCZWZvcmUoc3R5bGVFbGVtZW50LCBsYXN0U3R5bGVFbGVtZW50SW5zZXJ0ZWRBdFRvcC5uZXh0U2libGluZyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHN0eWxlVGFyZ2V0LmFwcGVuZENoaWxkKHN0eWxlRWxlbWVudCk7XG5cdFx0fVxuXHRcdHN0eWxlRWxlbWVudHNJbnNlcnRlZEF0VG9wLnB1c2goc3R5bGVFbGVtZW50KTtcblx0fSBlbHNlIGlmIChvcHRpb25zLmluc2VydEF0ID09PSBcImJvdHRvbVwiKSB7XG5cdFx0c3R5bGVUYXJnZXQuYXBwZW5kQ2hpbGQoc3R5bGVFbGVtZW50KTtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHZhbHVlIGZvciBwYXJhbWV0ZXIgJ2luc2VydEF0Jy4gTXVzdCBiZSAndG9wJyBvciAnYm90dG9tJy5cIik7XG5cdH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCkge1xuXHRzdHlsZUVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQpO1xuXHR2YXIgaWR4ID0gc3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3AuaW5kZXhPZihzdHlsZUVsZW1lbnQpO1xuXHRpZihpZHggPj0gMCkge1xuXHRcdHN0eWxlRWxlbWVudHNJbnNlcnRlZEF0VG9wLnNwbGljZShpZHgsIDEpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVN0eWxlRWxlbWVudChvcHRpb25zKSB7XG5cdHZhciBzdHlsZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG5cdG9wdGlvbnMuYXR0cnMudHlwZSA9IFwidGV4dC9jc3NcIjtcblxuXHRhdHRhY2hUYWdBdHRycyhzdHlsZUVsZW1lbnQsIG9wdGlvbnMuYXR0cnMpO1xuXHRpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucywgc3R5bGVFbGVtZW50KTtcblx0cmV0dXJuIHN0eWxlRWxlbWVudDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTGlua0VsZW1lbnQob3B0aW9ucykge1xuXHR2YXIgbGlua0VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlua1wiKTtcblx0b3B0aW9ucy5hdHRycy50eXBlID0gXCJ0ZXh0L2Nzc1wiO1xuXHRvcHRpb25zLmF0dHJzLnJlbCA9IFwic3R5bGVzaGVldFwiO1xuXG5cdGF0dGFjaFRhZ0F0dHJzKGxpbmtFbGVtZW50LCBvcHRpb25zLmF0dHJzKTtcblx0aW5zZXJ0U3R5bGVFbGVtZW50KG9wdGlvbnMsIGxpbmtFbGVtZW50KTtcblx0cmV0dXJuIGxpbmtFbGVtZW50O1xufVxuXG5mdW5jdGlvbiBhdHRhY2hUYWdBdHRycyhlbGVtZW50LCBhdHRycykge1xuXHRPYmplY3Qua2V5cyhhdHRycykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG5cdFx0ZWxlbWVudC5zZXRBdHRyaWJ1dGUoa2V5LCBhdHRyc1trZXldKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGFkZFN0eWxlKG9iaiwgb3B0aW9ucykge1xuXHR2YXIgc3R5bGVFbGVtZW50LCB1cGRhdGUsIHJlbW92ZSwgdHJhbnNmb3JtUmVzdWx0O1xuXG5cdC8vIElmIGEgdHJhbnNmb3JtIGZ1bmN0aW9uIHdhcyBkZWZpbmVkLCBydW4gaXQgb24gdGhlIGNzc1xuXHRpZiAob3B0aW9ucy50cmFuc2Zvcm0gJiYgb2JqLmNzcykge1xuXHQgICAgdHJhbnNmb3JtUmVzdWx0ID0gb3B0aW9ucy50cmFuc2Zvcm0ob2JqLmNzcyk7XG5cdCAgICBcblx0ICAgIGlmICh0cmFuc2Zvcm1SZXN1bHQpIHtcblx0ICAgIFx0Ly8gSWYgdHJhbnNmb3JtIHJldHVybnMgYSB2YWx1ZSwgdXNlIHRoYXQgaW5zdGVhZCBvZiB0aGUgb3JpZ2luYWwgY3NzLlxuXHQgICAgXHQvLyBUaGlzIGFsbG93cyBydW5uaW5nIHJ1bnRpbWUgdHJhbnNmb3JtYXRpb25zIG9uIHRoZSBjc3MuXG5cdCAgICBcdG9iai5jc3MgPSB0cmFuc2Zvcm1SZXN1bHQ7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgXHQvLyBJZiB0aGUgdHJhbnNmb3JtIGZ1bmN0aW9uIHJldHVybnMgYSBmYWxzeSB2YWx1ZSwgZG9uJ3QgYWRkIHRoaXMgY3NzLiBcblx0ICAgIFx0Ly8gVGhpcyBhbGxvd3MgY29uZGl0aW9uYWwgbG9hZGluZyBvZiBjc3Ncblx0ICAgIFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHQgICAgXHRcdC8vIG5vb3Bcblx0ICAgIFx0fTtcblx0ICAgIH1cblx0fVxuXG5cdGlmIChvcHRpb25zLnNpbmdsZXRvbikge1xuXHRcdHZhciBzdHlsZUluZGV4ID0gc2luZ2xldG9uQ291bnRlcisrO1xuXHRcdHN0eWxlRWxlbWVudCA9IHNpbmdsZXRvbkVsZW1lbnQgfHwgKHNpbmdsZXRvbkVsZW1lbnQgPSBjcmVhdGVTdHlsZUVsZW1lbnQob3B0aW9ucykpO1xuXHRcdHVwZGF0ZSA9IGFwcGx5VG9TaW5nbGV0b25UYWcuYmluZChudWxsLCBzdHlsZUVsZW1lbnQsIHN0eWxlSW5kZXgsIGZhbHNlKTtcblx0XHRyZW1vdmUgPSBhcHBseVRvU2luZ2xldG9uVGFnLmJpbmQobnVsbCwgc3R5bGVFbGVtZW50LCBzdHlsZUluZGV4LCB0cnVlKTtcblx0fSBlbHNlIGlmKG9iai5zb3VyY2VNYXAgJiZcblx0XHR0eXBlb2YgVVJMID09PSBcImZ1bmN0aW9uXCIgJiZcblx0XHR0eXBlb2YgVVJMLmNyZWF0ZU9iamVjdFVSTCA9PT0gXCJmdW5jdGlvblwiICYmXG5cdFx0dHlwZW9mIFVSTC5yZXZva2VPYmplY3RVUkwgPT09IFwiZnVuY3Rpb25cIiAmJlxuXHRcdHR5cGVvZiBCbG9iID09PSBcImZ1bmN0aW9uXCIgJiZcblx0XHR0eXBlb2YgYnRvYSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0c3R5bGVFbGVtZW50ID0gY3JlYXRlTGlua0VsZW1lbnQob3B0aW9ucyk7XG5cdFx0dXBkYXRlID0gdXBkYXRlTGluay5iaW5kKG51bGwsIHN0eWxlRWxlbWVudCwgb3B0aW9ucyk7XG5cdFx0cmVtb3ZlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGVFbGVtZW50KTtcblx0XHRcdGlmKHN0eWxlRWxlbWVudC5ocmVmKVxuXHRcdFx0XHRVUkwucmV2b2tlT2JqZWN0VVJMKHN0eWxlRWxlbWVudC5ocmVmKTtcblx0XHR9O1xuXHR9IGVsc2Uge1xuXHRcdHN0eWxlRWxlbWVudCA9IGNyZWF0ZVN0eWxlRWxlbWVudChvcHRpb25zKTtcblx0XHR1cGRhdGUgPSBhcHBseVRvVGFnLmJpbmQobnVsbCwgc3R5bGVFbGVtZW50KTtcblx0XHRyZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpO1xuXHRcdH07XG5cdH1cblxuXHR1cGRhdGUob2JqKTtcblxuXHRyZXR1cm4gZnVuY3Rpb24gdXBkYXRlU3R5bGUobmV3T2JqKSB7XG5cdFx0aWYobmV3T2JqKSB7XG5cdFx0XHRpZihuZXdPYmouY3NzID09PSBvYmouY3NzICYmIG5ld09iai5tZWRpYSA9PT0gb2JqLm1lZGlhICYmIG5ld09iai5zb3VyY2VNYXAgPT09IG9iai5zb3VyY2VNYXApXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdHVwZGF0ZShvYmogPSBuZXdPYmopO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZW1vdmUoKTtcblx0XHR9XG5cdH07XG59XG5cbnZhciByZXBsYWNlVGV4dCA9IChmdW5jdGlvbiAoKSB7XG5cdHZhciB0ZXh0U3RvcmUgPSBbXTtcblxuXHRyZXR1cm4gZnVuY3Rpb24gKGluZGV4LCByZXBsYWNlbWVudCkge1xuXHRcdHRleHRTdG9yZVtpbmRleF0gPSByZXBsYWNlbWVudDtcblx0XHRyZXR1cm4gdGV4dFN0b3JlLmZpbHRlcihCb29sZWFuKS5qb2luKCdcXG4nKTtcblx0fTtcbn0pKCk7XG5cbmZ1bmN0aW9uIGFwcGx5VG9TaW5nbGV0b25UYWcoc3R5bGVFbGVtZW50LCBpbmRleCwgcmVtb3ZlLCBvYmopIHtcblx0dmFyIGNzcyA9IHJlbW92ZSA/IFwiXCIgOiBvYmouY3NzO1xuXG5cdGlmIChzdHlsZUVsZW1lbnQuc3R5bGVTaGVldCkge1xuXHRcdHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0LmNzc1RleHQgPSByZXBsYWNlVGV4dChpbmRleCwgY3NzKTtcblx0fSBlbHNlIHtcblx0XHR2YXIgY3NzTm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcyk7XG5cdFx0dmFyIGNoaWxkTm9kZXMgPSBzdHlsZUVsZW1lbnQuY2hpbGROb2Rlcztcblx0XHRpZiAoY2hpbGROb2Rlc1tpbmRleF0pIHN0eWxlRWxlbWVudC5yZW1vdmVDaGlsZChjaGlsZE5vZGVzW2luZGV4XSk7XG5cdFx0aWYgKGNoaWxkTm9kZXMubGVuZ3RoKSB7XG5cdFx0XHRzdHlsZUVsZW1lbnQuaW5zZXJ0QmVmb3JlKGNzc05vZGUsIGNoaWxkTm9kZXNbaW5kZXhdKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c3R5bGVFbGVtZW50LmFwcGVuZENoaWxkKGNzc05vZGUpO1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBhcHBseVRvVGFnKHN0eWxlRWxlbWVudCwgb2JqKSB7XG5cdHZhciBjc3MgPSBvYmouY3NzO1xuXHR2YXIgbWVkaWEgPSBvYmoubWVkaWE7XG5cblx0aWYobWVkaWEpIHtcblx0XHRzdHlsZUVsZW1lbnQuc2V0QXR0cmlidXRlKFwibWVkaWFcIiwgbWVkaWEpXG5cdH1cblxuXHRpZihzdHlsZUVsZW1lbnQuc3R5bGVTaGVldCkge1xuXHRcdHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG5cdH0gZWxzZSB7XG5cdFx0d2hpbGUoc3R5bGVFbGVtZW50LmZpcnN0Q2hpbGQpIHtcblx0XHRcdHN0eWxlRWxlbWVudC5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCk7XG5cdFx0fVxuXHRcdHN0eWxlRWxlbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcblx0fVxufVxuXG5mdW5jdGlvbiB1cGRhdGVMaW5rKGxpbmtFbGVtZW50LCBvcHRpb25zLCBvYmopIHtcblx0dmFyIGNzcyA9IG9iai5jc3M7XG5cdHZhciBzb3VyY2VNYXAgPSBvYmouc291cmNlTWFwO1xuXG5cdC8qIElmIGNvbnZlcnRUb0Fic29sdXRlVXJscyBpc24ndCBkZWZpbmVkLCBidXQgc291cmNlbWFwcyBhcmUgZW5hYmxlZFxuXHRhbmQgdGhlcmUgaXMgbm8gcHVibGljUGF0aCBkZWZpbmVkIHRoZW4gbGV0cyB0dXJuIGNvbnZlcnRUb0Fic29sdXRlVXJsc1xuXHRvbiBieSBkZWZhdWx0LiAgT3RoZXJ3aXNlIGRlZmF1bHQgdG8gdGhlIGNvbnZlcnRUb0Fic29sdXRlVXJscyBvcHRpb25cblx0ZGlyZWN0bHlcblx0Ki9cblx0dmFyIGF1dG9GaXhVcmxzID0gb3B0aW9ucy5jb252ZXJ0VG9BYnNvbHV0ZVVybHMgPT09IHVuZGVmaW5lZCAmJiBzb3VyY2VNYXA7XG5cblx0aWYgKG9wdGlvbnMuY29udmVydFRvQWJzb2x1dGVVcmxzIHx8IGF1dG9GaXhVcmxzKXtcblx0XHRjc3MgPSBmaXhVcmxzKGNzcyk7XG5cdH1cblxuXHRpZihzb3VyY2VNYXApIHtcblx0XHQvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNjYwMzg3NVxuXHRcdGNzcyArPSBcIlxcbi8qIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsXCIgKyBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShzb3VyY2VNYXApKSkpICsgXCIgKi9cIjtcblx0fVxuXG5cdHZhciBibG9iID0gbmV3IEJsb2IoW2Nzc10sIHsgdHlwZTogXCJ0ZXh0L2Nzc1wiIH0pO1xuXG5cdHZhciBvbGRTcmMgPSBsaW5rRWxlbWVudC5ocmVmO1xuXG5cdGxpbmtFbGVtZW50LmhyZWYgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXG5cdGlmKG9sZFNyYylcblx0XHRVUkwucmV2b2tlT2JqZWN0VVJMKG9sZFNyYyk7XG59XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vc3R5bGUtbG9hZGVyL2FkZFN0eWxlcy5qc1xuLy8gbW9kdWxlIGlkID0gNDUzXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsImltcG9ydCB7IG9ic2VydmVyIH0gZnJvbSBcIm1vYngtcmVhY3RcIjtcbmltcG9ydCBSZWFjdCBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCBrZXlkb3duIGZyb20gXCJyZWFjdC1rZXlkb3duXCI7XG5pbXBvcnQgeyBCdXR0b24sIERyb3Bkb3duLCBHcmlkLCBNZW51LCBTZWdtZW50LCBUZXh0QXJlYSB9IGZyb20gJ3NlbWFudGljLXVpLXJlYWN0J1xuXG5pbXBvcnQgRXhhbXBsZVN0b3JlIGZyb20gXCIuL0V4YW1wbGVTdG9yZVwiO1xuaW1wb3J0IFNwYWNlciBmcm9tIFwiLi9TcGFjZXIuanN4XCI7XG5pbXBvcnQgXCIuL3N0eWxlcy5sZXNzXCI7XG5pbXBvcnQgVGFiYmFibGVUZXh0QXJlYSBmcm9tIFwiLi9UYWJiYWJsZVRleHRBcmVhLmpzeFwiO1xuXG5Ab2JzZXJ2ZXJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNwZWxsRWRpdG9yIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0c3RhdGljIGRlZmF1bHRQcm9wcyA9IHtcblx0XHRleGFtcGxlczogbmV3IEV4YW1wbGVTdG9yZSgpXG5cdH07XG5cblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG53aW5kb3cuZXhhbXBsZXMgPSBwcm9wcy5leGFtcGxlcztcblx0XHR0aGlzLnByb3BzLmV4YW1wbGVzLmxvYWQoKTtcblxuXHRcdC8vREVCVUdcblx0XHR3aW5kb3cuc3BlbGxFZGl0b3IgPSB0aGlzO1xuXHRcdHdpbmRvdy5leGFtcGxlcyA9IHRoaXMucHJvcHMuZXhhbXBsZXM7XG5cdH1cblxuXHRAa2V5ZG93bihcImN0cmwrc1wiKVxuXHRzYXZlKCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLnNhdmUoKTsgfVxuXG5cdEBrZXlkb3duKFwiY3RybCtyXCIpXG5cdHJldmVydCgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5yZXZlcnQoKTsgfVxuXG5cdEBrZXlkb3duKFwiY3RybCtjXCIpXG5cdGNvbXBpbGUoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMuY29tcGlsZSgpOyB9XG5cblx0QGtleWRvd24oXCJjdHJsK25cIilcblx0Y3JlYXRlKCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLmNyZWF0ZSgpOyB9XG5cblx0QGtleWRvd24oXCJjdHJsK2RcIilcblx0ZGVsZXRlKCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLmRlbGV0ZSh1bmRlZmluZWQsIFwiQ09ORklSTVwiKTsgfVxuXG5cdHJlbmFtZSgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5yZW5hbWUoKTsgfVxuXHRkdXBsaWNhdGUoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMuZHVwbGljYXRlKCk7IH1cblx0bG9hZCgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5sb2FkKCk7IH1cblx0cmVzZXQoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMucmVzZXQoKTsgfVxuXG5cblx0cmVuZGVyKCkge1xuXHRcdGxldCB7IGV4YW1wbGVzIH0gPSB0aGlzLnByb3BzO1xuXHRcdGxldCB7IHRpdGxlcywgc2VsZWN0ZWQsIGRpcnR5LCBjb2RlLCBvdXRwdXQgfSA9IGV4YW1wbGVzO1xuXG5cdFx0Ly8gQ3JlYXRlIG1lbnVpdGVtcyBmcm9tIHRoZSBleGFtcGxlc1xuXHRcdGxldCBvcHRpb25zID0gdGl0bGVzLm1hcCggdGl0bGUgPT5cblx0XHRcdCh7XG5cdFx0XHRcdHZhbHVlOiB0aXRsZSxcblx0XHRcdFx0dGl0bGU6IHRpdGxlLFxuXHRcdFx0XHR0ZXh0OiB0aXRsZSxcblx0XHRcdFx0Y29udGVudDogdGl0bGUsXG5cdFx0XHRcdG9uQ2xpY2s6ICgpID0+IGV4YW1wbGVzLnNlbGVjdCh0aXRsZSlcblx0XHRcdH0pKTtcblxuXHRcdGxldCBkaXJ0eUJ1dHRvbnMgPSAoKSA9PiB7XG5cdFx0XHRpZiAoIWRpcnR5KSByZXR1cm47XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHQ8TWVudSBzZWNvbmRhcnkgc3R5bGU9e3sgcG9zaXRpb246IFwiYWJzb2x1dGVcIiwgcmlnaHQ6IFwiMXJlbVwiLCB0b3A6IFwiM3B4XCIsIG1hcmdpbjogMCB9fT5cblx0XHRcdFx0XHQ8QnV0dG9uIG5lZ2F0aXZlIG9uQ2xpY2s9eygpID0+IHRoaXMucmV2ZXJ0KCl9Pjx1PlI8L3U+ZXZlcnQ8L0J1dHRvbj5cblx0XHRcdFx0XHQ8QnV0dG9uIHBvc2l0aXZlIG9uQ2xpY2s9eygpID0+IHRoaXMuc2F2ZSgpfT48dT5TPC91PmF2ZTwvQnV0dG9uPlxuXHRcdFx0XHQ8L01lbnU+XG5cdFx0XHQpO1xuXHRcdH07XG5cblx0XHRsZXQgY29tcGlsZUJ1dHRvbiA9ICgpID0+IHtcblx0XHRcdGlmIChvdXRwdXQpIHJldHVybjtcblx0XHRcdHJldHVybiA8QnV0dG9uXG5cdFx0XHRcdFx0c3R5bGU9e3sgcG9zaXRpb246IFwiYWJzb2x1dGVcIiwgIHdpZHRoOiBcIjRlbVwiLCBsZWZ0OiBcImNhbGMoNTAlIC0gMmVtKVwiLCB0b3A6IFwiNTAlXCIgfX1cblx0XHRcdFx0XHRvbkNsaWNrPXsoKSA9PiB0aGlzLmNvbXBpbGUoKX1cblx0XHRcdFx0XHRpY29uPVwicmlnaHQgY2hldnJvblwiLz47XG5cdFx0fTtcblxuXHRcdHJldHVybiAoXG5cdFx0PEdyaWQgc3RyZXRjaGVkIHBhZGRlZCBjbGFzc05hbWU9XCJmdWxsSGVpZ2h0XCI+XG5cdFx0XHQ8R3JpZC5Sb3cgc3R5bGU9e3sgaGVpZ2h0OiBcIjJyZW1cIiwgcGFkZGluZ1RvcDogXCIwcmVtXCIgfX0gY2xhc3NOYW1lPVwidWkgaW52ZXJ0ZWQgYXR0YWNoZWQgbWVudVwiPlxuXHRcdFx0XHQ8R3JpZC5Db2x1bW4gd2lkdGg9ezd9PlxuXHRcdFx0XHRcdDxNZW51IGludmVydGVkIGF0dGFjaGVkIGZsdWlkPlxuXHRcdFx0XHRcdFx0PE1lbnUuSXRlbT5FeGFtcGxlOjwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdFx0PERyb3Bkb3duIGl0ZW0gc2VsZWN0aW9uIG9wdGlvbnM9e29wdGlvbnN9IHZhbHVlPXtzZWxlY3RlZH0gc3R5bGU9e3sgd2lkdGg6IFwiMjBlbVwiIH19Lz5cblx0XHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gdGhpcy5kZWxldGUoKX0+PHU+RDwvdT5lbGV0ZTwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdFx0PE1lbnUuSXRlbSBvbkNsaWNrPXsoKSA9PiB0aGlzLnJlbmFtZSgpfT5SZW5hbWU8L01lbnUuSXRlbT5cblx0XHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gdGhpcy5kdXBsaWNhdGUoKX0+RHVwbGljYXRlPC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0PC9NZW51PlxuXHRcdFx0XHQ8L0dyaWQuQ29sdW1uPlxuXHRcdFx0XHQ8R3JpZC5Db2x1bW4gd2lkdGg9ezJ9PlxuXHRcdFx0XHRcdDxNZW51IGludmVydGVkIGF0dGFjaGVkIGZsdWlkPlxuXHRcdFx0XHRcdFx0PFNwYWNlciBmbHVpZC8+XG5cdFx0XHRcdFx0XHQ8TWVudS5JdGVtIG9uQ2xpY2s9eygpID0+IHRoaXMuY3JlYXRlKCl9Pjx1Pk48L3U+ZXc8L01lbnUuSXRlbT5cblx0XHRcdFx0XHRcdDxTcGFjZXIgZmx1aWQvPlxuXHRcdFx0XHRcdDwvTWVudT5cblx0XHRcdFx0PC9HcmlkLkNvbHVtbj5cblx0XHRcdFx0PEdyaWQuQ29sdW1uIHdpZHRoPXs3fT5cblx0XHRcdFx0XHQ8TWVudSBpbnZlcnRlZCBhdHRhY2hlZCBmbHVpZD5cblx0XHRcdFx0XHRcdDxTcGFjZXIgZmx1aWQvPlxuXHRcdFx0XHRcdFx0PE1lbnUuSXRlbSBvbkNsaWNrPXsoKSA9PiB0aGlzLmxvYWQoKX0+UmVsb2FkPC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0XHQ8TWVudS5JdGVtIG9uQ2xpY2s9eygpID0+IHRoaXMucmVzZXQoKX0+UmVzZXQ8L01lbnUuSXRlbT5cblx0XHRcdFx0XHQ8L01lbnU+XG5cdFx0XHRcdDwvR3JpZC5Db2x1bW4+XG5cdFx0XHQ8L0dyaWQuUm93PlxuXHRcdFx0PEdyaWQuUm93IHN0eWxlPXt7IGhlaWdodDogXCJjYWxjKDEwMCUgLSAzcmVtKVwiIH19PlxuXHRcdFx0XHQ8R3JpZC5Db2x1bW4gd2lkdGg9ezh9PlxuXHRcdFx0XHRcdDxUYWJiYWJsZVRleHRBcmVhXG5cdFx0XHRcdFx0XHRjbGFzc05hbWU9XCJ1aSBzZWdtZW50XCJcblx0XHRcdFx0XHRcdHZhbHVlPXtjb2RlfVxuXHRcdFx0XHRcdFx0b25DaGFuZ2U9eyhldmVudCkgPT4gZXhhbXBsZXMudXBkYXRlKGV4YW1wbGVzLnNlbGVjdGVkLCBldmVudC50YXJnZXQudmFsdWUsIFwiU0tJUF9TQVZFXCIpfVxuXHRcdFx0XHRcdC8+XG5cdFx0XHRcdFx0e2RpcnR5QnV0dG9ucygpfVxuXHRcdFx0XHQ8L0dyaWQuQ29sdW1uPlxuXHRcdFx0XHQ8R3JpZC5Db2x1bW4gd2lkdGg9ezh9PlxuXHRcdFx0XHRcdDxUZXh0QXJlYSBjbGFzc05hbWU9XCJ1aSBzZWdtZW50XCIgdmFsdWU9e291dHB1dH0vPlxuXHRcdFx0XHQ8L0dyaWQuQ29sdW1uPlxuXHRcdFx0XHR7Y29tcGlsZUJ1dHRvbigpfVxuXHRcdFx0PC9HcmlkLlJvdz5cblx0XHQ8L0dyaWQ+XG5cdCk7fVxufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2FwcC9TcGVsbEVkaXRvci5qc3giLCJleHBvcnQgVG9rZW5pemVyIGZyb20gXCIuL1Rva2VuaXplci5qc1wiO1xuZXhwb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmV4cG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcbmltcG9ydCBcIi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi9ydWxlcy9hbGwuanNcIjtcblxuLy8gU3RpY2sgb24gd2luZG93IGZvciByZWZsZWN0aW9uIGFuZCBhZC1ob2MgdGVzdGluZy5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdE9iamVjdC5hc3NpZ24od2luZG93LCB7XG5cdFx0VG9rZW5pemVyOiBleHBvcnRzLlRva2VuaXplcixcblx0XHR0b2tlbml6ZTogZXhwb3J0cy5Ub2tlbml6ZXIudG9rZW5pemUuYmluZChleHBvcnRzLlRva2VuaXplciksXG5cblx0XHRSdWxlOiBleHBvcnRzLlJ1bGUsXG5cblx0XHRQYXJzZXI6IGV4cG9ydHMuUGFyc2VyLFxuXHRcdHBhcnNlcjogcGFyc2VyLFxuXHRcdHBhcnNlOiBwYXJzZXIucGFyc2UuYmluZChwYXJzZXIpLFxuXHRcdGNvbXBpbGU6IHBhcnNlci5jb21waWxlLmJpbmQocGFyc2VyKSxcblx0fSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9pbmRleC5qcyIsImltcG9ydCB7IGRlZmluZU1lbW9pemVkIH0gZnJvbSBcIi4vbWVtb2l6ZS5qc1wiO1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gcmUtZXhwb3J0IFJ1bGUgZm9yIHRlc3RpbmdcbmV4cG9ydCBkZWZhdWx0IFJ1bGU7XG5cbi8vXG4vL1x0IyBQYXJzaW5nIGBydWxlU3ludGF4YCB0byBjcmVhdGUgcnVsZXMgYXV0b21hdGljYWxseS5cbi8vXG4vLyBUT0RPOlx0UHVsbCBgcGFyc2VSdWxlU3ludGF4YCBzdHVmZiBvdXQgaW50byBzZXBhcmF0ZSBtb2R1bGU/XG4vLyBUT0RPOlx0QmV0dGVyIG5hbWUgZm9yIGBydWxlU3ludGF4YFxuLy8gVE9ETzpcdFVzZSBrZXl3b3JkcyBpbiBzeW50YXggdG8gbWFrZSBhIHF1aWNrIHJlZ2V4LWJhc2VkIGB0ZXN0YCBmdW5jdGlvbiBmb3IgdGhlIGVudGlyZSBydWxlXG5PYmplY3QuYXNzaWduKFJ1bGUsIHtcblxuLy9cbi8vICMjIGdyb3VwOiBwYXJzaW5nIHN5bnRheFxuLy9cblxuXHRwYXJzZVJ1bGVTeW50YXgoc3ludGF4LCBTZXF1ZW5jZUNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSkge1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIFtdKTtcblxuXHRcdGxldCBydWxlO1xuXHRcdC8vIElmIHdlIG9ubHkgZ290IG9uZSB0aGluZywgcmV0dXJuIHRoYXQgYXMgdGhlIHJlc3VsdFxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJ1bGUgPSBydWxlc1swXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRydWxlID0gbmV3IFNlcXVlbmNlQ29uc3RydWN0b3IoeyBydWxlcyB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fSxcblxuXHR0b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KSB7XG5cdFx0Y29uc3QgU1lOVEFYX0VYUFJFU1NJT04gPSAvKD86W1xcd1xcLV0rfFxcXFxbXFxbXFwoXFx7XFwpXFx9XFxdXXxbXlxcc1xcd118XFx8KS9nO1xuXHRcdGxldCBzeW50YXhTdHJlYW0gPSBzeW50YXgubWF0Y2goU1lOVEFYX0VYUFJFU1NJT04pO1xuXHRcdGlmICghc3ludGF4U3RyZWFtKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHRva2VuaXplIHBhcnNlIHJ1bGUgc3ludGF4ID4+JHtzeW50YXh9PDxgKTtcblx0XHRyZXR1cm4gc3ludGF4U3RyZWFtO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBsYXN0SW5kZXggPSBzeW50YXhTdHJlYW0ubGVuZ3RoO1xuXHRcdHdoaWxlIChzdGFydEluZGV4IDwgbGFzdEluZGV4KSB7XG5cdFx0XHRsZXQgWyBydWxlLCBlbmRJbmRleCBdID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRpZiAocnVsZSkge1xuXHRcdFx0XHRsZXQgbGFzdCA9IHJ1bGVzW3J1bGVzLmxlbmd0aC0xXTtcblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBTeW1ib2xgIGFuZCBsYXN0IHdhcyBhIGBTeW1ib2xgLCBtZXJnZSB0b2dldGhlclxuIFx0XHRcdFx0aWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCkge1xuIFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuIFx0XHRcdFx0XHRydWxlcy5wb3AoKTtcbiBcdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG4gXHRcdFx0XHRcdHJ1bGUubWF0Y2ggPSBsYXN0Lm1hdGNoLmNvbmNhdChydWxlLm1hdGNoKTtcbiBcdFx0XHRcdH1cblx0XHRcdFx0cnVsZXMucHVzaChydWxlKTtcblx0XHRcdH1cblx0XHRcdHN0YXJ0SW5kZXggPSBlbmRJbmRleCArIDE7XG5cdFx0fVxuXHRcdHJldHVybiBydWxlcztcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW4oc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblxuXHRcdC8vIGlmIHdlIGdvdCBhIFwiXFxcXFwiICh3aGljaCBhbHNvIGhhcyB0byBnbyBpbnRvIHRoZSBzb3VyY2Ugc3RyaW5nIGFzIFwiXFxcXFwiKVxuXHRcdC8vIHRyZWF0IHRoZSBuZXh0IHRva2VuIGFzIGEgbGl0ZXJhbCBzdHJpbmcgcmF0aGVyIHRoYW4gYXMgYSBzcGVjaWFsIGNoYXJhY3Rlci5cblx0XHRpZiAoc3ludGF4VG9rZW4gPT09IFwiXFxcXFwiKSB7XG5cdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3ltYm9sKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXggKyAxKTtcblx0XHR9XG5cblx0XHRzd2l0Y2ggKHN5bnRheFRva2VuKSB7XG5cdFx0XHRjYXNlIFwie1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRjYXNlIFwiKFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIipcIjpcblx0XHRcdGNhc2UgXCIrXCI6XG5cdFx0XHRjYXNlIFwiP1wiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblxuXHRcdFx0Ly8gdGhlIGZvbGxvd2luZyBzaG91bGQgQUxXQVlTIGJlIGNvbnN1bWVkIGJ5IHRoZSBhYm92ZVxuXHRcdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGNhc2UgXCIpXCI6XG5cdFx0XHRjYXNlIFwiXVwiOlxuXHRcdFx0Y2FzZSBcInxcIjpcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7c3ludGF4VG9rZW59IGZvdW5kIGFzIGl0ZW0gJHtzdGFydEluZGV4fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRpZiAoc3ludGF4VG9rZW4ubWF0Y2goUnVsZS5LRVlXT1JEX1BBVFRFUk4pKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N5bWJvbChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRLRVlXT1JEX1BBVFRFUk4gOiAvW0EtWmEtel1bXFx3Xy1dKi8sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gSWYgbW9yZSB0aGFuIG9uZSBrZXl3b3JkIGFwcGVhcnMgaW4gYSByb3csIGNvbWJpbmVzIHRoZW0gaW50byBhIHNpbmdsZSBgS2V5d29yZGAgb2JqZWN0LlxuXHQvLyBUaGlzIGlzIHByZXR0eSBzYWZlLCB1bmxlc3MgeW91IGhhdmUgYW4gb3B0aW9uYWwga2V5d29yZCBsaWtlXG5cdC8vXHRcdGB0aGUge2lkZW50aWZpZXJ9IG9mIHRoZT8ge2V4cHJlc3Npb259YFxuXHQvLyBpbiB3aGljaCBjYXNlIHlvdSBjYW4gcHV0IHRoZSBvcHRpb25hbCBrZXl3b3JkIGluIHBhcmVuc1xuXHQvL1x0XHRgdGhlIHtpZGVudGlmaWVyfSBvZiAodGhlPykge2V4cHJlc3Npb259YFxuXHQvL1xuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfa2V5d29yZChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwLCBjb25zdHJ1Y3Rvcikge1xuXHRcdGxldCBtYXRjaCA9IFtdLCBlbmRJbmRleDtcbiBcdFx0Ly8gZWF0IGtleXdvcmRzIHdoaWxlIHRoZXkgbGFzdFxuXHRcdGZvciAodmFyIGkgPSBzdGFydEluZGV4OyBpIDwgc3ludGF4U3RyZWFtLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXQgbmV4dCA9IHN5bnRheFN0cmVhbVtpXTtcblx0XHRcdGlmICh0eXBlb2YgbmV4dCA9PT0gXCJzdHJpbmdcIiAmJiBuZXh0Lm1hdGNoKFJ1bGUuS0VZV09SRF9QQVRURVJOKSkge1xuXHRcdFx0XHRtYXRjaC5wdXNoKG5leHQpO1xuXHRcdFx0XHRlbmRJbmRleCA9IGk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGJyZWFrO1xuXHRcdH1cblxuXHRcdGlmICghY29uc3RydWN0b3IpIGNvbnN0cnVjdG9yID0gUnVsZS5LZXl3b3JkO1xuXHRcdGxldCBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHsgbWF0Y2ggfSk7XG5cblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCwgY29uc3RydWN0b3IgPSBSdWxlLlN5bWJvbCkge1xuXHRcdGxldCBzdHJpbmcgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHRpZiAoIWNvbnN0cnVjdG9yKSBjb25zdHJ1Y3RvciA9IFJ1bGUuU3ltYm9sO1xuXG5cdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRsZXQgaXNFc2NhcGVkID0gc3RyaW5nLnN0YXJ0c1dpdGgoXCJcXFxcXCIpO1xuXHRcdGxldCBtYXRjaCA9IGlzRXNjYXBlZCA/IHN0cmluZy5zdWJzdHIoMSkgOiBzdHJpbmc7XG5cblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IG1hdGNoIH0pO1xuXG5cdFx0aWYgKGlzRXNjYXBlZCkge1xuXHRcdFx0cnVsZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gYFxcXFwke21hdGNofSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnRJbmRleCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gWW91IGNhbiBzcGVjaWZ5IGFuIGV4cGxpY2l0IGBydWxlLmFyZ3VtZW50YCB3aXRoOiAgYChzb21lYXJnOi4uLilgXG5cdC8vIFlvdSBjYW4gc3BlY2lmeSB0aGF0IHRoZSByZXN1bHRzIHNob3VsZCBiZSBgcHJvbW90ZWRgIHRvIGVuY2xvc2luZyBjb250ZXh0IHdpdGg6IGAoPzouLi4pYFxuXHQvL1xuXHQvLyBOT1RFOiBuZXN0ZWQgcGFyZW5zIG1heSBub3QgaGF2ZSBhbHRlcm5hdGl2ZXMuLi4gOi0oICAgYChhfChifGMpKWAgd29uJ3Qgd29yaz8/P1xuXHRwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIihcIiwgXCIpXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0Ly8gcHVsbCBvdXQgZXhwbGljaXQgXCJwcm9tb3RlXCIgZmxhZzogYD86YFxuXHRcdGxldCBwcm9tb3RlID0gKHNsaWNlWzBdID09PSBcIj9cIiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpO1xuXHRcdGlmIChwcm9tb3RlKSBzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXG5cdFx0Ly8gcHVsbCBvdXQgZXhwbGljaXQgYXJndW1lbnQgbmFtZVxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdC8vIHNwbGl0IGludG8gZ3JvdXBzLCBpbmNsdWRpbmcgbmVzdGVkIHBhcmVuc1xuXHRcdGxldCBhbHRlcm5hdGl2ZXMgPVxuXHRcdFx0Z3JvdXBBbHRlcm5hdGl2ZXMoc2xpY2UpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKGdyb3VwKSB7XG5cdFx0XHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKGdyb3VwLCBbXSk7XG5cdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHRzWzBdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgUnVsZS5TZXF1ZW5jZSh7IHJ1bGVzOiByZXN1bHRzIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdGxldCBydWxlID0gYWx0ZXJuYXRpdmVzLmxlbmd0aCA9PT0gMSA/IGFsdGVybmF0aXZlc1swXSA6IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVzOiBhbHRlcm5hdGl2ZXMgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0aWYgKHByb21vdGUpIHJ1bGUucHJvbW90ZSA9IHRydWU7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblxuXHRcdGZ1bmN0aW9uIGdyb3VwQWx0ZXJuYXRpdmVzKHRva2Vucykge1xuXHRcdFx0bGV0IGFsdGVybmF0aXZlcyA9IFtdO1xuXHRcdFx0bGV0IGN1cnJlbnQgPSBbXTtcblx0XHRcdGZvciAobGV0IGkgPSAwLCB0b2tlbjsgdG9rZW4gPSB0b2tlbnNbaV07IGkrKykge1xuXHRcdFx0XHQvLyBoYW5kbGUgYWx0ZXJuYXRlIG1hcmtlclxuXHRcdFx0XHRpZiAodG9rZW4gPT09IFwifFwiKSB7XG5cdFx0XHRcdFx0YWx0ZXJuYXRpdmVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGhhbmRsZSBuZXN0ZWQgcGFyZW5zXG5cdFx0XHRcdGVsc2UgaWYgKHRva2VuID09PSBcIihcIikge1xuXHRcdFx0XHRcdGxldCB7IGVuZEluZGV4IH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmRJbmRleCArIDEpKTtcblx0XHRcdFx0XHRpID0gZW5kSW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3VycmVudC5wdXNoKHRva2VuKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGN1cnJlbnQubGVuZ3RoKSBhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdHJldHVybiBhbHRlcm5hdGl2ZXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIHJlcGVhdCBpbmRpY2F0b3IgYD9gLCBgK2Agb3IgYCpgIGJ5IGF0dGFjaGluZyBpdCB0byB0aGUgcHJldmlvdXMgcnVsZS5cblx0cGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IHN5bWJvbCA9IHN5bnRheFN0cmVhbVtzdGFydEluZGV4XTtcblx0XHRsZXQgcnVsZSA9IHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBhdHRhY2ggcmVwZWF0IHN5bWJvbCAke3N5bWJvbH0gdG8gZW1wdHkgcnVsZSFgKTtcblxuXHRcdC8vIFRyYW5zZm9ybSBsYXN0IHJ1bGUgaW50byBhIHJlcGVhdCBmb3IgYCpgIGFuZCBgK2AuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCIqXCIgfHwgc3ltYm9sID09PSBcIitcIikge1xuXHRcdFx0bGV0IGFyZ3VtZW50ID0gcnVsZS5hcmd1bWVudDtcblx0XHRcdHJ1bGUgPSBuZXcgUnVsZS5SZXBlYXQoeyBydWxlIH0pO1xuXHRcdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0XHQvLyBwdXNoIGludG8gcnVsZSBzdGFjayBpbiBwbGFjZSBvZiBvbGQgcnVsZVxuXHRcdFx0cnVsZXNbcnVsZXMubGVuZ3RoIC0gMV0gPSBydWxlO1xuXHRcdH1cblxuXHRcdC8vIFJ1bGUgaXMgb3B0aW9uYWwgZm9yIGA/YCBhbmQgYCpgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiP1wiIHx8IHN5bWJvbCA9PT0gXCIqXCIpIHtcblx0XHRcdHJ1bGUub3B0aW9uYWwgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBbIHVuZGVmaW5lZCwgc3RhcnRJbmRleCBdXG5cdH0sXG5cblx0Ly8gTWF0Y2ggYHs8cnVsZU5hbWU+fWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IG1hdGNoID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIntcIiwgXCJ9XCIsIHN0YXJ0SW5kZXgpO1xuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID09PSAzICYmIG1hdGNoLnNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBtYXRjaC5zbGljZVswXTtcblx0XHRcdG1hdGNoLnNsaWNlID0gbWF0Y2guc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPiAxKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHByb2Nlc3MgcnVsZXMgd2l0aCBtb3JlIHRoYW4gb25lIHJ1bGUgbmFtZTogeyR7bWF0Y2guc2xpY2Uuam9pbihcIlwiKX19YCk7XG5cblx0XHRsZXQgcGFyYW1zID0geyBydWxlOiBtYXRjaC5zbGljZVswXSB9O1xuXG5cdFx0Ly8gc2VlIGlmIHRoZXJlJ3MgYSBgbm90YCBydWxlIGluIHRoZXJlXG5cdFx0bGV0IGJhbmdQb3NpdGlvbiA9IHBhcmFtcy5ydWxlLmluZGV4T2YoXCIhXCIpO1xuXHRcdGlmIChiYW5nUG9zaXRpb24gIT09IC0xKSB7XG5cdFx0XHRwYXJhbXMubm90ID0gcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpOyAvL1sgcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpIF07XG5cdFx0XHRwYXJhbXMucnVsZSA9IHBhcmFtcy5ydWxlLnN1YnN0cigwLCBiYW5nUG9zaXRpb24pO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuU3VicnVsZShwYXJhbXMpO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIG1hdGNoLmVuZEluZGV4IF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggbGlzdCBleHByZXNzaW9uIGBbPGl0ZW0+PGRlbGltaXRlcj5dYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kSW5kZXggXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDAsIGNvbnN0cnVjdG9yID0gUnVsZS5MaXN0KSB7XG5cdFx0bGV0IHsgZW5kSW5kZXgsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnRJbmRleCk7XG5cblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzbGljZSwgW10pO1xuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCAhPT0gMikge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHN0dWZmIGF0IGVuZCBvZiBsaXN0OiBbJHtzbGljZS5qb2luKFwiIFwiKX1dYCk7XG5cdFx0fVxuXHRcdGxldCBbIGl0ZW0sIGRlbGltaXRlciBdID0gcmVzdWx0cztcblxuXHRcdGxldCBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHsgaXRlbSwgZGVsaW1pdGVyIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cdH0sXG5cbn0pO1xuXG5cblxuLy8gIyMgIEFkZCBtZXRob2RzIHRvIFBhcnNlciB0byBkZWZpbmUgcnVsZXMgdXNpbmcgdGhlIGFib3ZlIHN5bnRheC5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFBhcnNlci5wcm90b3R5cGUsIHtcblxuXHQvLyBQYXJzZSBhIGBydWxlU3ludGF4YCBydWxlIGFuZCBhZGQgaXQgdG8gb3VyIGxpc3Qgb2YgcnVsZXMuXG5cdC8vIFJldHVybnMgdGhlIG5ldyBydWxlLlxuXHQvLyBMb2dzIHBhcnNpbmcgZXJyb3JzIGJ1dCBhbGxvd3MgdGhpbmdzIHRvIGNvbnRpbnVlLlxuXHRhZGRTZXF1ZW5jZTogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlLCBwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gQWRkIGEgYnVuY2ggb2Ygc3ludGF4ZXMgYXQgb25jZSBpZiB3ZSBnb3QgYW4gYXJyYXkgb2Ygc3ludGF4ZXNcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSlcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkU2VxdWVuY2UobmFtZSwgc3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcykpO1xuXG5cdFx0aWYgKHR5cGVvZiBjb25zdHJ1Y3RvciAhPT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRwcm9wZXJ0aWVzID0gY29uc3RydWN0b3I7XG5cdFx0XHRjb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2U7XG5cdFx0fVxuXHRcdHRyeSB7XG5cdFx0XHRsZXQgcnVsZSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yKTtcblx0XHRcdC8vIFJlZmxlY3QgdGhlIHJ1bGUgYmFjayBvdXQgdG8gbWFrZSBzdXJlIGl0IGxvb2tzIChtb3JlIG9yIGxlc3MpIHRoZSBzYW1lXG5cdFx0XHRpZiAoUGFyc2VyLkRFQlVHKSBjb25zb2xlLmxvZyhgQWRkZWQgcnVsZSAnJHtuYW1lfSc6XFxuICBJTlBVVDogJHtydWxlU3ludGF4fSBcXG4gT1VUUFVUOiAke3J1bGV9YCk7XG5cbi8vY29uc29sZS5pbmZvKG5hbWUsIGNvbnN0cnVjdG9yLCBydWxlKTtcblx0XHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmdyb3VwKGBFcnJvciBwYXJzaW5nIHN5bnRheCBmb3IgcnVsZSAnJHtuYW1lfSc6YCk7XG5cdFx0XHRjb25zb2xlLmxvZyhgc3ludGF4OiAke3J1bGVTeW50YXh9YCk7XG5cdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdH1cblx0fX0sXG5cblx0YWRkU3RhdGVtZW50OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuU3RhdGVtZW50LCBwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gQWRkIGEgYnVuY2ggb2Ygc3ludGF4ZXMgYXQgb25jZSBpZiB3ZSBnb3QgYW4gYXJyYXkgb2Ygc3ludGF4ZXNcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSlcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkU3RhdGVtZW50KG5hbWUsIHN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpKTtcblxuXHRcdGxldCBydWxlID0gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJzdGF0ZW1lbnRcIiwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZEV4cHJlc3Npb246IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5FeHByZXNzaW9uLCBwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gQWRkIGEgYnVuY2ggb2Ygc3ludGF4ZXMgYXQgb25jZSBpZiB3ZSBnb3QgYW4gYXJyYXkgb2Ygc3ludGF4ZXNcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSlcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkRXhwcmVzc2lvbihuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSk7XG5cblx0XHRsZXQgcnVsZSA9IHRoaXMuYWRkU2VxdWVuY2UobmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkTGlzdDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLkxpc3QsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRMaXN0KG5hbWUsIHN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpKTtcblxuXHRcdGxldCBzdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChydWxlU3ludGF4KTtcblx0XHRsZXQgcnVsZSA9IChSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN0cmVhbSwgW10sIDAsIGNvbnN0cnVjdG9yKSB8fCBbXSlbMF07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFJ1bGUuYWRkTGlzdCgke25hbWV9LCAke3J1bGVTeW50YXh9KTogbm8gcnVsZSBwcm9kdWNlZGApO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZEtleXdvcmQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5LZXl3b3JkLCBwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gQWRkIGEgYnVuY2ggb2Ygc3ludGF4ZXMgYXQgb25jZSBpZiB3ZSBnb3QgYW4gYXJyYXkgb2Ygc3ludGF4ZXNcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSlcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkS2V5d29yZChuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSk7XG5cblx0XHRsZXQgc3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgocnVsZVN5bnRheCk7XG5cdFx0bGV0IHJ1bGUgPSAoUnVsZS5wYXJzZVJ1bGVTeW50YXhfa2V5d29yZChzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pWzBdO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBSdWxlLmFkZEtleXdvcmQoJHtuYW1lfSwgJHtydWxlU3ludGF4fSk6IG5vIHJ1bGUgcHJvZHVjZWRgKTtcblx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRTeW1ib2w6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5TeW1ib2wsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRTeW1ib2wobmFtZSwgc3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcykpO1xuXG5cdFx0Ly8gUGFyc2UgYXMgYHRva2Vuc2AsIHdoaWNoIHdpbGwgbWVyZ2UgU3ltYm9scyBmb3IgdXMuXG5cdFx0bGV0IHN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IChSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKTtcblxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZS5hZGRTeW1ib2woJHtuYW1lfSwgJHtydWxlU3ludGF4fSk6IG5vIHJ1bGUgcHJvZHVjZWRgKTtcblx0XHR9XG5cblx0XHRpZiAocnVsZXMubGVuZ3RoID4gMSB8fCAhKHJ1bGVzWzBdIGluc3RhbmNlb2YgUnVsZS5TeW1ib2wpKSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFJ1bGUuYWRkU3ltYm9sKCR7bmFtZX0sICR7cnVsZVN5bnRheH0pOiBnZW5lcmF0ZWQgc29tZXRoaW5nIGArXG5cdFx0XHRcdGAgb3RoZXIgdGhhbiBhIHNpbmdsZSBTeW1ib2wuICBVc2UgUnVsZS5hZGRTeW50YXgoKSBpbnN0ZWFkLmApO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gcnVsZXNbMF07XG5cdFx0Ly8gQ29udmVydCB0byBwcm9wZXIgdHlwZSBpZiBuZWNlc3Nhcnlcblx0XHRpZiAoY29uc3RydWN0b3IgIT09IFJ1bGUuU3ltYm9sKSBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHJ1bGUpO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlU3ludGF4LmpzIiwiLyogU3RvcmUgb2YgZXhhbXBsZSBzcGVsbCBjb2RlIGZyYWdtZW50cy4gKi9cbmltcG9ydCBtb2J4LCB7IG9ic2VydmFibGUsIGNvbXB1dGVkIH0gZnJvbSBcIm1vYnhcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXhhbXBsZVN0b3JlIHtcblx0Ly8gQ1VSUkVOVCBleGFtcGxlc1xuXHRAb2JzZXJ2YWJsZSBleGFtcGxlcyA9IHt9O1xuXHQvLyBFeGFtcGxlcyBhcyBvZiBsYXN0IHNhdmUgKGZvciByZXZlcilcblx0QG9ic2VydmFibGUgX3NhdmVkRXhhbXBsZXMgPSB7fTtcblx0Ly8gU2VsZWN0ZWQgZXhhbXBsZSBrZXkuXG5cdEBvYnNlcnZhYmxlIHNlbGVjdGVkID0gXCJcIjtcblx0Ly8gQ29tcGlsZWQgb3V0cHV0LlxuXHRAb2JzZXJ2YWJsZSBvdXRwdXQgPSBcIlwiO1xuXG5cdC8vIFJldHVybiBqdXN0IHRoZSB0aXRsZXMgb2YgdGhlIGV4YW1wbGVzLlxuXHRAY29tcHV0ZWQgZ2V0IHRpdGxlcygpIHtcblx0XHRyZXR1cm4gT2JqZWN0LmtleXModGhpcy5leGFtcGxlcyk7XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIGNvZGUgZm9yIHRoZSBjdXJyZW50IGV4YW1wbGVcblx0QGNvbXB1dGVkIGdldCBjb2RlKCkge1xuXHRcdHJldHVybiB0aGlzLmV4YW1wbGVzW3RoaXMuc2VsZWN0ZWRdO1xuXHR9XG5cblx0Ly8gSXMgQU5ZVEhJTkcgZGlydHk/XG5cdEBjb21wdXRlZCBnZXQgZGlydHkoKSB7XG5cdFx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMuX3NhdmVkRXhhbXBsZXMpICE9PSBKU09OLnN0cmluZ2lmeSh0aGlzLmV4YW1wbGVzKTtcblx0fVxuXG5cdC8vIFJlc2V0IGFsbCBleGFtcGxlcyBmcm9tIGxvY2FsU3RvcmFnZS5cblx0cmVzZXQoKSB7XG5cdFx0ZGVsZXRlIGxvY2FsU3RvcmFnZS5zcGVsbEVkaXRvckV4YW1wbGVzO1xuXHRcdGRlbGV0ZSBsb2NhbFN0b3JhZ2Uuc3BlbGxFZGl0b3JFeGFtcGxlO1xuXHRcdHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0fVxuXG5cdC8vIExvYWQgZXhhbXBsZXNcblx0bG9hZCgpIHtcblx0XHQvLyBMb2FkIGV4YW1wbGVzIGZyb20gbG9jYWxTdG9yYWdlXG5cdFx0dGhpcy5leGFtcGxlcyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZXNcblx0XHRcdHx8ICd7XCJGb29cIjpcImRlZmluZSB0eXBlIEZvb1wiLCBcIkJhclwiOlwiZGVmaW5lIHR5cGUgQmFyXCJ9Jyk7XG5cblx0XHQvLyBTYXZlIGEgY29weSBvZiBleGFtcGxlcyBmb3IgcmV2ZXJ0XG5cdFx0dGhpcy5fc2F2ZWRFeGFtcGxlcyA9IHRoaXMuZXhhbXBsZXM7XG5cblx0XHQvLyBMb2FkIHNlbGVjdGVkIGV4YW1wbGUgbmFtZVxuXHRcdHRoaXMuc2VsZWN0KGxvY2FsU3RvcmFnZS5zcGVsbEVkaXRvckV4YW1wbGUpO1xuXHR9XG5cblx0Ly8gU2F2ZSBjdXJyZW50IGV4YW1wbGVzLlxuXHRzYXZlKCkge1xuXHRcdGxvY2FsU3RvcmFnZS5zcGVsbEVkaXRvckV4YW1wbGVzID0gSlNPTi5zdHJpbmdpZnkodGhpcy5leGFtcGxlcyk7XG5cblx0XHQvLyBTYXZlIGEgY29weSBvZiBleGFtcGxlcyBmb3IgcmV2ZXJ0XG5cdFx0dGhpcy5fc2F2ZWRFeGFtcGxlcyA9IHRoaXMuZXhhbXBsZXM7XG5cdH1cblxuXHQvLyBSZXZlcnQgdGhlIGN1cnJlbnQgZXhhbXBsZVxuXHRyZXZlcnQoZXhhbXBsZSA9IHRoaXMuc2VsZWN0ZWQpIHtcblx0XHR0aGlzLnVwZGF0ZShleGFtcGxlLCB0aGlzLl9zYXZlZEV4YW1wbGVzW2V4YW1wbGVdKTtcblx0fVxuXG5cdC8vIFNlbGVjdCBhIGRpZmZlcmVudCBleGFtcGxlLlxuXHRzZWxlY3QoZXhhbXBsZSkge1xuXHRcdGlmICghZXhhbXBsZSB8fCB0aGlzLmV4YW1wbGVzW2V4YW1wbGVdID09IG51bGwpIGV4YW1wbGUgPSBPYmplY3Qua2V5cyh0aGlzLmV4YW1wbGVzKVswXSB8fCBcIlwiO1xuXHRcdHRoaXMuc2VsZWN0ZWQgPSBsb2NhbFN0b3JhZ2Uuc3BlbGxFZGl0b3JFeGFtcGxlID0gZXhhbXBsZTtcblx0XHR0aGlzLm91dHB1dCA9IFwiXCI7XG5cdH1cblxuXHQvLyBDcmVhdGUgYSBuZXcgZXhhbXBsZS5cblx0Ly8gU2F2ZXMgYW5kIHNlbGVjdHMgdGhlIGV4YW1wbGUgYXV0b21hdGljYWxseS5cblx0dXBkYXRlKG5hbWUsIGNvZGUsIHNraXBTYXZlKSB7XG5cdFx0dGhpcy5leGFtcGxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZXhhbXBsZXMsIHsgWyBuYW1lIF06IGNvZGUgfSk7XG5cdFx0dGhpcy5zZWxlY3QobmFtZSk7XG5cdFx0dGhpcy5vdXRwdXQgPSBcIlwiO1xuXHRcdGlmICghc2tpcFNhdmUpIHRoaXMuc2F2ZSgpO1xuXHR9XG5cblx0Ly8gRGVsZXRlIGFuIGV4YW1wbGUuXG5cdC8vIFNhdmVzIGFuZCBzZWxlY3RzIGFub3RoZXIgZXhhbXBsZSBhdXRvbWF0aWNhbGx5LlxuXHRkZWxldGUobmFtZSA9IHRoaXMuc2VsZWN0ZWQsIHNob3dDb25maXJtKSB7XG5cdFx0aWYgKHNob3dDb25maXJtICYmICFjb25maXJtKGBSZWFsbHkgZGVsZXRlIGV4YW1wbGUgJHtuYW1lfT9gKSkgcmV0dXJuO1xuXHRcdGxldCBleGFtcGxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZXhhbXBsZXMpO1xuXHRcdGRlbGV0ZSBleGFtcGxlc1tuYW1lXTtcblx0XHR0aGlzLmV4YW1wbGVzID0gZXhhbXBsZXM7XG5cdFx0dGhpcy5zYXZlKCk7XG5cdFx0dGhpcy5zZWxlY3QoKTtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyBleGFtcGxlLlxuXHRjcmVhdGUobmFtZSwgY29kZSA9IFwiXCIpIHtcblx0XHQvLyBJZiBubyBuYW1lLCBwcm9tcHQuXG5cdFx0aWYgKCFuYW1lKSBuYW1lID0gcHJvbXB0KFwiTmFtZSBmb3IgdGhpcyBleGFtcGxlP1wiKTtcblx0XHQvLyBGb3JnZXQgaXQgaWYgbm8gbmFtZS5cblx0XHRpZiAoIW5hbWUpIHJldHVybjtcblxuXHRcdHRoaXMudXBkYXRlKG5hbWUsIGNvZGUpO1xuXHR9XG5cblx0Ly8gUmVuYW1lIGFuIGV4YW1wbGUuXG5cdC8vIFNlbGVjdHMgYW5kIHNhdmVzIGF1dG9tYXRpY2FsbHkuXG5cdHJlbmFtZShvbGROYW1lID0gdGhpcy5zZWxlY3RlZCwgbmV3TmFtZSkge1xuXHRcdC8vIElmIG5vIG5ldyBuYW1lLCBwcm9tcHQuXG5cdFx0aWYgKCFuZXdOYW1lKSBuZXdOYW1lID0gcHJvbXB0KFwiTmV3IG5hbWUgZm9yIHRoaXMgZXhhbXBsZT9cIiwgb2xkTmFtZSk7XG5cblx0XHQvLyBGb3JnZXQgaXQgaWYgbm8gbmFtZSBzdXBwbGllZCBvciBuYW1lIGlzIHRoZSBzYW1lXG5cdFx0aWYgKCFuZXdOYW1lIHx8IG5ld05hbWUgPT09IG9sZE5hbWUpIHJldHVybjtcblx0XHRpZiAodGhpcy5leGFtcGxlc1tuZXdOYW1lXSkgcmV0dXJuIGNvbnNvbGUud2FybihgZXhhbXBsZXMucmVuYW1lKFwiJHtuZXdOYW1lfVwiKTogbmFtZSBhbHJlYWR5IGluIHVzZWApO1xuXG5cdFx0bGV0IGNvZGUgPSB0aGlzLmV4YW1wbGVzW29sZE5hbWVdO1xuXHRcdHRoaXMuZGVsZXRlKG9sZE5hbWUpO1xuXHRcdHRoaXMudXBkYXRlKG5ld05hbWUsIGNvZGUpO1xuXHR9XG5cblx0Ly8gRHVwbGljYXRlIGFuIGV4YW1wbGUuXG5cdGR1cGxpY2F0ZShvbGROYW1lID0gdGhpcy5zZWxlY3RlZCwgbmV3TmFtZSkge1xuXHRcdC8vIElmIG5vIG5ldyBuYW1lLCBwcm9tcHQuXG5cdFx0aWYgKCFuZXdOYW1lKSBuZXdOYW1lID0gcHJvbXB0KFwiTmV3IG5hbWUgZm9yIGR1cGxpY2F0ZSBleGFtcGxlP1wiLCBvbGROYW1lKTtcblx0XHQvLyBGb3JnZXQgaXQgaWYgbm8gbmFtZSBzdXBwbGllZCBvciBuYW1lIGlzIHRoZSBzYW1lXG5cdFx0aWYgKCFuZXdOYW1lIHx8IG5ld05hbWUgPT09IG9sZE5hbWUpIHJldHVybjtcblx0XHRpZiAodGhpcy5leGFtcGxlc1tuZXdOYW1lXSkgcmV0dXJuIGNvbnNvbGUud2FybihgZXhhbXBsZXMucmVuYW1lKFwiJHtuZXdOYW1lfVwiKTogbmFtZSBhbHJlYWR5IGluIHVzZWApO1xuXG5cdFx0dGhpcy51cGRhdGUobmV3TmFtZSwgdGhpcy5jb2RlKTtcblx0fVxuXG5cdC8vIENvbXBpbGUgdGhlIGN1cnJlbnQgZXhhbXBsZSwgcGxhY2luZyBpdCBpbiBvdXIgYG91dHB1dGAuXG4vL1RPRE86IHNvbWUgd2F5IHRvIGRvIHRoaXMgYXV0b21hdGljYWxseSB3LyBcIm91dHB1dFwiID9cblx0Y29tcGlsZSgpIHtcblx0XHR0aGlzLm91dHB1dCA9IFwiLi4uY29tcGlsaW5nLi4uXCI7XG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHR0aGlzLm91dHB1dCA9IHBhcnNlci5jb21waWxlKHRoaXMuY29kZSk7XG5cdFx0fSwgMTAwKTtcblx0fVxuXG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvYXBwL0V4YW1wbGVTdG9yZS5qcyIsIi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy9cbi8vICA8U3BhY2VyPiBjb21wb25lbnQgZm9yIHVzZSB3aXRoIG9hay5cbi8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IFByb3BUeXBlcyBmcm9tIFwicHJvcC10eXBlc1wiO1xuaW1wb3J0IHsgY2xhc3NOYW1lcyB9IGZyb20gXCIuL3V0aWxcIjtcblxuaW1wb3J0IFwiLi9TcGFjZXIubGVzc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTcGFjZXIocHJvcHMpIHtcbiAgY29uc3Qge1xuICAgIGNsYXNzTmFtZSxcbiAgICBhcHBlYXJhbmNlLCBzaXplLCB3aWR0aCwgaGVpZ2h0LFxuICAgIGlubGluZSwgZmx1aWQsIHRpbnksIHNtYWxsLCBtZWRpdW0sIGxhcmdlLCBodWdlLCBtYXNzaXZlXG4gIH0gPSBwcm9wcztcblxuICBjb25zdCBzcGFjZXJQcm9wcyA9IHtcbiAgICBjbGFzc05hbWU6IGNsYXNzTmFtZXMoY2xhc3NOYW1lLCBcIm9ha1wiLCBzaXplLCBhcHBlYXJhbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7IGlubGluZSwgZmx1aWQgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzcGFjZXJcIiksXG4gICAgc3R5bGU6IHtcbiAgICAgIHdpZHRoLFxuICAgICAgaGVpZ2h0LFxuICAgIH1cbiAgfVxuXG4gIHJldHVybiA8ZGl2IHsuLi5zcGFjZXJQcm9wc30vPjtcbn1cblxuU3BhY2VyLnByb3BUeXBlcyA9IHtcbiAgY2xhc3NOYW1lOiBQcm9wVHlwZXMuc3RyaW5nLFxuICBhcHBlYXJhbmNlOiBQcm9wVHlwZXMuc3RyaW5nLFxuICBzaXplOiBQcm9wVHlwZXMuc3RyaW5nLFxuICB3aWR0aDogUHJvcFR5cGVzLm51bWJlcixcbiAgaGVpZ2h0OiBQcm9wVHlwZXMubnVtYmVyLFxuXG4gIGlubGluZTogUHJvcFR5cGVzLmJvb2wsXG4gIGZsdWlkOiBQcm9wVHlwZXMuYm9vbCxcblxufTtcblxuU3BhY2VyLmRlZmF1bHRQcm9wcyA9IHtcbiAgc2l6ZTogXCJtZWRpdW1cIlxufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2FwcC9TcGFjZXIuanN4IiwiaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHByb3BUeXBlcyBmcm9tIFwicHJvcC10eXBlc1wiO1xuaW1wb3J0IHsgVGV4dEFyZWEgfSBmcm9tICdzZW1hbnRpYy11aS1yZWFjdCdcblxuLy9cbi8vXHQjIDxUYWJiYWJsZVRleHRBcmVhPiAtLSA8U1VJLlRleHRBcmVhPiBpbiB3aGljaCB5b3UgY2FuIHR5cGUgYSB0YWIgY2hhcmFjdGVyOlxuLy9cdC0gSWYgbm90aGluZyBpcyBzZWxlY3RlZCwgaW5zZXJ0cyBhIHRhYiBjaGFyYWN0ZXJcbi8vXHQtIElmIGFueXRoaW5nIGlzIHNlbGVjdGVkLCBpbnNlcnRzIHRhYiBjaGFyYWN0ZXJzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpbmUocylcbi8vXHQtIElmIHNoaWZ0IGtleSBpcyBkb3duLCBpbnNlcnRzIHRhYiBjaGFyYWN0ZXJzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpbmUocykuXG4vL1xuLy9cdCMjIyBQcm9wZXJ0aWVzXG4vL1x0LSBgc2F2ZWAgKHJlcXVpcmVkKSAtLSBmdW5jdGlvbiB1c2VkIHRvIHNhdmUgdGhlIHJlc3VsdHMgb24ga2V5cHJlc3Ncbi8vXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUYWJiYWJsZVRleHRBcmVhIGV4dGVuZHMgVGV4dEFyZWEge1xuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIDxUZXh0QXJlYSB7Li4udGhpcy5wcm9wc30gb25LZXlEb3duPXt0aGlzLm9uS2V5RG93bn0gLz47XG5cdH1cblxuXHQvLyBEbyBOT1QgZXhpdCBvbiB0YWIgLS0gaW5zZXJ0IG9yIHJlbW92ZSB0YWIocykgdmFsdWUgaW5zdGVhZC5cblx0b25LZXlEb3duID0gKGV2ZW50KSA9PiB7XG5cbi8vVE9ETyBmaXJlIGB0aGlzLnByb3BzLm9uS2V5RG93bmAgaWYgZGVmaW5lZC4uLlxuXHRcdC8vIEZvcmdldCBpdCBpZiBub3QgYSB0YWJcblx0XHRpZiAoZXZlbnQua2V5Q29kZSAhPT0gOSkgcmV0dXJuO1xuXG5cdFx0Ly8gcHJldmVudCBkZWZhdWx0IHNvIHdlIGRvbid0IGV4aXQgdGhlIGZpZWxkXG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuXHRcdC8vIGZpZ3VyZSBvdXQgdGhlIHRleHQgcmFuZ2Vcblx0XHR2YXIgZWxlbWVudCA9IGV2ZW50LnRhcmdldDtcblx0XHR2YXIgdGV4dCA9IGVsZW1lbnQudmFsdWU7XG5cdFx0dmFyIHN0YXJ0ID0gZWxlbWVudC5zZWxlY3Rpb25TdGFydDtcblx0XHR2YXIgZW5kID0gZWxlbWVudC5zZWxlY3Rpb25FbmQ7XG5cblx0XHQvLyBSZXBsYWNlbWVudCB0ZXh0XG5cdFx0bGV0IG5ld1RleHQgPSBcIlwiLCBzZWxlY3Rpb25TdGFydCA9IHN0YXJ0LCBzZWxlY3Rpb25FbmQgPSBlbmQ7XG5cblx0XHQvLyBJZiBzZWxlY3Rpb24gaXMgZW1wdHksXG5cdFx0aWYgKHN0YXJ0ID09PSBlbmQgJiYgIWV2ZW50LnNoaWZ0S2V5KSB7XG5cdFx0XHRuZXdUZXh0ID0gXCJcXHRcIjtcblx0XHRcdHNlbGVjdGlvblN0YXJ0ID0gc2VsZWN0aW9uRW5kID0gZW5kICsgMTtcblx0XHR9XG5cdFx0Ly8gb3RoZXJ3aXNlIGluZGVudC9kZS1pbmRlbnQgYWxsIG9mIHRoZSBsaW5lc1xuXHRcdGVsc2Uge1xuXHRcdC8vIHVzZSBzdGFydCBhbmQgZW5kIG9mIGxpbmUocylcbi8vY29uc29sZS5pbmZvKGBzdGFydDogJHtzdGFydH0gOiR7dGV4dFtzdGFydF19OiAgIGVuZDogJHtlbmR9IDogJHt0ZXh0W2VuZF19OmApO1xuXHRcdFx0aWYgKHRleHRbc3RhcnRdICE9PSBcIlxcblwiKSBzdGFydCA9IHRleHQubGFzdEluZGV4T2YoXCJcXG5cIiwgc3RhcnQpICsgMTtcblx0XHRcdGlmICh0ZXh0W2VuZC0xXSA9PT0gXCJcXG5cIikgZW5kLS07XG5cdFx0XHRlbHNlIGlmICh0ZXh0W2VuZCsxXSAhPT0gXCJcXG5cIikgZW5kID0gdGV4dC5pbmRleE9mKFwiXFxuXCIsIGVuZCkgLSAxO1xuLy9jb25zb2xlLmluZm8oYHN0YXJ0OiAke3N0YXJ0fSA6JHt0ZXh0W3N0YXJ0XX06ICAgZW5kOiAke2VuZH0gOiAke3RleHRbZW5kXX06YCk7XG5cblx0XHRcdGxldCBsaW5lcyA9IHRleHQuc2xpY2Uoc3RhcnQsIGVuZCkuc3BsaXQoXCJcXG5cIik7XG5cdFx0XHQvLyBpZiBzaGlmdCBrZXkgaXMgZG93biwgUkVNT1ZFIGEgdGFiIGZyb20gZWFjaCBsaW5lXG5cdFx0XHRpZiAoZXZlbnQuc2hpZnRLZXkpIHtcblx0XHRcdFx0bGluZXMgPSBsaW5lcy5tYXAobGluZSA9PiBsaW5lWzBdID09PSBcIlxcdFwiID8gbGluZS5zdWJzdHIoMSkgOiBsaW5lKTtcblx0XHRcdH1cblx0XHRcdC8vIG90aGVyd2lzZSBBREQgYSB0YWIgdG8gZWFjaCBsaW5lXG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0bGluZXMgPSBsaW5lcy5tYXAobGluZSA9PiBcIlxcdFwiICsgbGluZSk7XG5cdFx0XHR9XG5cdFx0XHRzZWxlY3Rpb25TdGFydCA9IHN0YXJ0O1xuXHRcdFx0bmV3VGV4dCA9IGxpbmVzLmpvaW4oXCJcXG5cIik7XG5cdFx0XHRzZWxlY3Rpb25FbmQgPSBzZWxlY3Rpb25TdGFydCArIG5ld1RleHQubGVuZ3RoICsgMTtcblx0XHR9XG5cblx0XHQvLyBVcGRhdGUgaW5wdXQgdmFsdWUuXG5cdFx0ZWxlbWVudC52YWx1ZSBcdD0gdGV4dC5zdWJzdHIoMCwgc3RhcnQpXG5cdFx0XHRcdFx0XHQrIG5ld1RleHRcblx0XHRcdFx0XHRcdCsgdGV4dC5zdWJzdHIoZW5kKTtcblxuXHRcdC8vIFVwZGF0ZSB0aGUgc2VsZWN0aW9uXG5cdFx0ZWxlbWVudC5zZWxlY3Rpb25TdGFydCA9IHNlbGVjdGlvblN0YXJ0O1xuXHRcdGVsZW1lbnQuc2VsZWN0aW9uRW5kID0gc2VsZWN0aW9uRW5kO1xuXG5cdFx0Ly8gRGVsZWdhdGUgdG8gYHByb3BzLm9uQ2hhbmdlYCB0byBzYXZlIHRoZSB2YWx1ZSBvdXRzaWRlIG9mIHRoZSBjb250cm9sXG5cdFx0aWYgKHRoaXMucHJvcHMub25DaGFuZ2UpIHRoaXMucHJvcHMub25DaGFuZ2UoZXZlbnQpO1xuXHR9XG5cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9hcHAvVGFiYmFibGVUZXh0QXJlYS5qc3giLCIvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBSZWFjdCBVdGlsaXR5IGZ1bmN0aW9uc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8vIGBjbGFzc05hbWVzYCwgY29uY2VwdCBzdG9sZW4gZnJvbTogIGh0dHA6Ly9qZWR3YXRzb24uZ2l0aHViLmlvL2NsYXNzbmFtZXNcbmV4cG9ydCBmdW5jdGlvbiBjbGFzc05hbWVzICguLi5hcmdzKSB7XG4gIHJldHVybiBhcmdzLm1hcCggYXJnID0+IHtcbiAgICBpZiAoIWFyZykgcmV0dXJuIFwiXCI7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYXJnKSkgcmV0dXJuIGNsYXNzTmFtZXMoLi4uYXJnKTtcbiAgICBzd2l0Y2ggKHR5cGVvZiBhcmcpIHtcbiAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgIGNhc2UgXCJzdHJpbmdcIjogIHJldHVybiBhcmc7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoYXJnKS5tYXAoIGtleSA9PiBhcmdba2V5XSA/IGtleSA6IFwiXCIpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAgICAgICAgIC5qb2luKFwiIFwiKTtcbiAgICB9XG4gIH0pLmZpbHRlcihCb29sZWFuKVxuICAgIC5qb2luKFwiIFwiKTtcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2FwcC91dGlsLmpzIiwiLy8gTWVtb2l6ZS9mb3JnZXQgc2VtYW50aWNzLlxuXG4vLyBSZXR1cm4gYSBtZW1vaXppbmcgZ2V0dGVyIGZ1bmN0aW9uLlxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXNbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGdldHRlci5hcHBseSh0aGlzKTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIERlZmluZSBzbyB0aGF0IHdlIGNhbiBiZSBkZWxldGVkIGFuZCByZS1kZWZpbmVkLCBidXQgbm90IHNldCBvciBlbnVtZXJhdGVkLlxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcGVydHksIHsgdmFsdWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXNbcHJvcGVydHldO1xuXHR9XG59XG5cblxuLy8gUmV0dXJuIGEgbWVtb2l6ZSBmdW5jdGlvbiBmb3IgdXNlIGFzIGEgZ2V0dGVyIGluIGEgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYFxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4ge1xuXHRcdGdldCA6IG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpXG5cdH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9tZW1vaXplLmpzIiwiLy8gTWFrZSBzdXJlIGBnbG9iYWxgIGlzIGRlZmluZWQgZ2xvYmFsbHk6XG4vL1x0LSBlaXRoZXIgYXMgdGhlIG5vZGVqcyBgZ2xvYmFsYCwgb3Jcbi8vXHQtIGFzIGFuIGFsaWFzIGZvciBgd2luZG93YCBpbiBicm93c2Vycywgb3Jcbi8vXHQtIGZvciB0aGUgYHNlbGZgIGNvbnRleHQgaW4gd2ViIHdvcmtlcnMuXG4vL1xuLy8gTk9URTogdGhpcyBtb2RpZmllcyB0aGUgXCJnbG9iYWxcIiBlbnZpcm9ubWVudCBieSBtYWtpbmcgc3VyZSBcImdsb2JhbFwiIGlzIHNldC4hXG4vL1xuXG5sZXQgZ2xvYmFsX2lkZW50aWZpZXI7XG5pZiAodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuLy9cdGNvbnNvbGUubG9nKFwiUnVubmluZyBpbiBub2RlXCIpO1xuXHRnbG9iYWxfaWRlbnRpZmllciA9IGdsb2JhbDtcbn1cblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gYSB3ZWIgYnJvd3NlclwiKTtcblx0d2luZG93Lmdsb2JhbCA9IHdpbmRvdztcblx0Z2xvYmFsX2lkZW50aWZpZXIgPSB3aW5kb3c7XG59XG5cbmlmICh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIikge1xuLy9cdGNvbnNvbGUubG9nKFwiUnVubmluZyBpbiBhIHdlYiB3b3JrZXJcIik7XG5cdHNlbGYuZ2xvYmFsID0gc2VsZjtcblx0Z2xvYmFsX2lkZW50aWZpZXIgPSBzZWxmO1xufVxuXG4vLyBFeHBvcnQgZm9yIGNvbnN1bXB0aW9uIGJ5IGltcG9ydC5cbmV4cG9ydCBkZWZhdWx0IGdsb2JhbF9pZGVudGlmaWVyO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvdXRpbHMvZ2xvYmFsLmpzIiwiZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2xpYi9jc3MtYmFzZS5qc1wiKSh1bmRlZmluZWQpO1xuLy8gaW1wb3J0c1xuXG5cbi8vIG1vZHVsZVxuZXhwb3J0cy5wdXNoKFttb2R1bGUuaWQsIFwiLm9hay5zcGFjZXIge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgZGlzcGxheTogYmxvY2s7XFxufVxcbi5vYWsuc3BhY2VyLmlubGluZSB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICB2ZXJ0aWNhbC1hbGlnbjogYmFzZWxpbmU7XFxufVxcbi5vYWsuc3BhY2VyLmZsdWlkIHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgZmxleDogMSAxIDEwMCU7XFxufVxcbi5vYWsuc3BhY2VyLnRpbnkge1xcbiAgd2lkdGg6IDJweDtcXG4gIGhlaWdodDogMnB4O1xcbn1cXG4ub2FrLnNwYWNlci5zbWFsbCB7XFxuICB3aWR0aDogNHB4O1xcbiAgaGVpZ2h0OiA0cHg7XFxufVxcbi5vYWsuc3BhY2VyLm1lZGl1bSB7XFxuICB3aWR0aDogMTBweDtcXG4gIGhlaWdodDogMTBweDtcXG59XFxuLm9hay5zcGFjZXIubGFyZ2Uge1xcbiAgd2lkdGg6IDIwcHg7XFxuICBoZWlnaHQ6IDIwcHg7XFxufVxcbi5vYWsuc3BhY2VyLmh1Z2Uge1xcbiAgd2lkdGg6IDMwcHg7XFxuICBoZWlnaHQ6IDMwcHg7XFxufVxcbi5vYWsuc3BhY2VyLm1hc3NpdmUge1xcbiAgd2lkdGg6IDUwcHg7XFxuICBoZWlnaHQ6IDUwcHg7XFxufVxcblwiLCBcIlwiXSk7XG5cbi8vIGV4cG9ydHNcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9jc3MtbG9hZGVyIS4vfi9sZXNzLWxvYWRlci9kaXN0IS4vc3JjL2FwcC9TcGFjZXIubGVzc1xuLy8gbW9kdWxlIGlkID0gNDYzXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsImV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9saWIvY3NzLWJhc2UuanNcIikodW5kZWZpbmVkKTtcbi8vIGltcG9ydHNcblxuXG4vLyBtb2R1bGVcbmV4cG9ydHMucHVzaChbbW9kdWxlLmlkLCBcIi5mdWxsV2lkdGgge1xcbiAgd2lkdGg6IDEwMCU7XFxufVxcbi5mdWxsSGVpZ2h0IHtcXG4gIGhlaWdodDogMTAwJTtcXG59XFxuLmZ1bGxTaXplIHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgaGVpZ2h0OiAxMDAlO1xcbn1cXG5cIiwgXCJcIl0pO1xuXG4vLyBleHBvcnRzXG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vY3NzLWxvYWRlciEuL34vbGVzcy1sb2FkZXIvZGlzdCEuL3NyYy9hcHAvc3R5bGVzLmxlc3Ncbi8vIG1vZHVsZSBpZCA9IDQ2NFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIENvcHlyaWdodCAyMDEzLXByZXNlbnQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gIHZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCdmYmpzL2xpYi9pbnZhcmlhbnQnKTtcbiAgdmFyIHdhcm5pbmcgPSByZXF1aXJlKCdmYmpzL2xpYi93YXJuaW5nJyk7XG4gIHZhciBSZWFjdFByb3BUeXBlc1NlY3JldCA9IHJlcXVpcmUoJy4vbGliL1JlYWN0UHJvcFR5cGVzU2VjcmV0Jyk7XG4gIHZhciBsb2dnZWRUeXBlRmFpbHVyZXMgPSB7fTtcbn1cblxuLyoqXG4gKiBBc3NlcnQgdGhhdCB0aGUgdmFsdWVzIG1hdGNoIHdpdGggdGhlIHR5cGUgc3BlY3MuXG4gKiBFcnJvciBtZXNzYWdlcyBhcmUgbWVtb3JpemVkIGFuZCB3aWxsIG9ubHkgYmUgc2hvd24gb25jZS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gdHlwZVNwZWNzIE1hcCBvZiBuYW1lIHRvIGEgUmVhY3RQcm9wVHlwZVxuICogQHBhcmFtIHtvYmplY3R9IHZhbHVlcyBSdW50aW1lIHZhbHVlcyB0aGF0IG5lZWQgdG8gYmUgdHlwZS1jaGVja2VkXG4gKiBAcGFyYW0ge3N0cmluZ30gbG9jYXRpb24gZS5nLiBcInByb3BcIiwgXCJjb250ZXh0XCIsIFwiY2hpbGQgY29udGV4dFwiXG4gKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50TmFtZSBOYW1lIG9mIHRoZSBjb21wb25lbnQgZm9yIGVycm9yIG1lc3NhZ2VzLlxuICogQHBhcmFtIHs/RnVuY3Rpb259IGdldFN0YWNrIFJldHVybnMgdGhlIGNvbXBvbmVudCBzdGFjay5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGNoZWNrUHJvcFR5cGVzKHR5cGVTcGVjcywgdmFsdWVzLCBsb2NhdGlvbiwgY29tcG9uZW50TmFtZSwgZ2V0U3RhY2spIHtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICBmb3IgKHZhciB0eXBlU3BlY05hbWUgaW4gdHlwZVNwZWNzKSB7XG4gICAgICBpZiAodHlwZVNwZWNzLmhhc093blByb3BlcnR5KHR5cGVTcGVjTmFtZSkpIHtcbiAgICAgICAgdmFyIGVycm9yO1xuICAgICAgICAvLyBQcm9wIHR5cGUgdmFsaWRhdGlvbiBtYXkgdGhyb3cuIEluIGNhc2UgdGhleSBkbywgd2UgZG9uJ3Qgd2FudCB0b1xuICAgICAgICAvLyBmYWlsIHRoZSByZW5kZXIgcGhhc2Ugd2hlcmUgaXQgZGlkbid0IGZhaWwgYmVmb3JlLiBTbyB3ZSBsb2cgaXQuXG4gICAgICAgIC8vIEFmdGVyIHRoZXNlIGhhdmUgYmVlbiBjbGVhbmVkIHVwLCB3ZSdsbCBsZXQgdGhlbSB0aHJvdy5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBUaGlzIGlzIGludGVudGlvbmFsbHkgYW4gaW52YXJpYW50IHRoYXQgZ2V0cyBjYXVnaHQuIEl0J3MgdGhlIHNhbWVcbiAgICAgICAgICAvLyBiZWhhdmlvciBhcyB3aXRob3V0IHRoaXMgc3RhdGVtZW50IGV4Y2VwdCB3aXRoIGEgYmV0dGVyIG1lc3NhZ2UuXG4gICAgICAgICAgaW52YXJpYW50KHR5cGVvZiB0eXBlU3BlY3NbdHlwZVNwZWNOYW1lXSA9PT0gJ2Z1bmN0aW9uJywgJyVzOiAlcyB0eXBlIGAlc2AgaXMgaW52YWxpZDsgaXQgbXVzdCBiZSBhIGZ1bmN0aW9uLCB1c3VhbGx5IGZyb20gJyArICdSZWFjdC5Qcm9wVHlwZXMuJywgY29tcG9uZW50TmFtZSB8fCAnUmVhY3QgY2xhc3MnLCBsb2NhdGlvbiwgdHlwZVNwZWNOYW1lKTtcbiAgICAgICAgICBlcnJvciA9IHR5cGVTcGVjc1t0eXBlU3BlY05hbWVdKHZhbHVlcywgdHlwZVNwZWNOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgbnVsbCwgUmVhY3RQcm9wVHlwZXNTZWNyZXQpO1xuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgIGVycm9yID0gZXg7XG4gICAgICAgIH1cbiAgICAgICAgd2FybmluZyghZXJyb3IgfHwgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciwgJyVzOiB0eXBlIHNwZWNpZmljYXRpb24gb2YgJXMgYCVzYCBpcyBpbnZhbGlkOyB0aGUgdHlwZSBjaGVja2VyICcgKyAnZnVuY3Rpb24gbXVzdCByZXR1cm4gYG51bGxgIG9yIGFuIGBFcnJvcmAgYnV0IHJldHVybmVkIGEgJXMuICcgKyAnWW91IG1heSBoYXZlIGZvcmdvdHRlbiB0byBwYXNzIGFuIGFyZ3VtZW50IHRvIHRoZSB0eXBlIGNoZWNrZXIgJyArICdjcmVhdG9yIChhcnJheU9mLCBpbnN0YW5jZU9mLCBvYmplY3RPZiwgb25lT2YsIG9uZU9mVHlwZSwgYW5kICcgKyAnc2hhcGUgYWxsIHJlcXVpcmUgYW4gYXJndW1lbnQpLicsIGNvbXBvbmVudE5hbWUgfHwgJ1JlYWN0IGNsYXNzJywgbG9jYXRpb24sIHR5cGVTcGVjTmFtZSwgdHlwZW9mIGVycm9yKTtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgIShlcnJvci5tZXNzYWdlIGluIGxvZ2dlZFR5cGVGYWlsdXJlcykpIHtcbiAgICAgICAgICAvLyBPbmx5IG1vbml0b3IgdGhpcyBmYWlsdXJlIG9uY2UgYmVjYXVzZSB0aGVyZSB0ZW5kcyB0byBiZSBhIGxvdCBvZiB0aGVcbiAgICAgICAgICAvLyBzYW1lIGVycm9yLlxuICAgICAgICAgIGxvZ2dlZFR5cGVGYWlsdXJlc1tlcnJvci5tZXNzYWdlXSA9IHRydWU7XG5cbiAgICAgICAgICB2YXIgc3RhY2sgPSBnZXRTdGFjayA/IGdldFN0YWNrKCkgOiAnJztcblxuICAgICAgICAgIHdhcm5pbmcoZmFsc2UsICdGYWlsZWQgJXMgdHlwZTogJXMlcycsIGxvY2F0aW9uLCBlcnJvci5tZXNzYWdlLCBzdGFjayAhPSBudWxsID8gc3RhY2sgOiAnJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjaGVja1Byb3BUeXBlcztcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL2NoZWNrUHJvcFR5cGVzLmpzXG4vLyBtb2R1bGUgaWQgPSA0NjVcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZW1wdHlGdW5jdGlvbiA9IHJlcXVpcmUoJ2ZianMvbGliL2VtcHR5RnVuY3Rpb24nKTtcbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCdmYmpzL2xpYi9pbnZhcmlhbnQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgLy8gSW1wb3J0YW50IVxuICAvLyBLZWVwIHRoaXMgbGlzdCBpbiBzeW5jIHdpdGggcHJvZHVjdGlvbiB2ZXJzaW9uIGluIGAuL2ZhY3RvcnlXaXRoVHlwZUNoZWNrZXJzLmpzYC5cbiAgZnVuY3Rpb24gc2hpbSgpIHtcbiAgICBpbnZhcmlhbnQoXG4gICAgICBmYWxzZSxcbiAgICAgICdDYWxsaW5nIFByb3BUeXBlcyB2YWxpZGF0b3JzIGRpcmVjdGx5IGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIGBwcm9wLXR5cGVzYCBwYWNrYWdlLiAnICtcbiAgICAgICdVc2UgUHJvcFR5cGVzLmNoZWNrUHJvcFR5cGVzKCkgdG8gY2FsbCB0aGVtLiAnICtcbiAgICAgICdSZWFkIG1vcmUgYXQgaHR0cDovL2ZiLm1lL3VzZS1jaGVjay1wcm9wLXR5cGVzJ1xuICAgICk7XG4gIH07XG4gIHNoaW0uaXNSZXF1aXJlZCA9IHNoaW07XG4gIGZ1bmN0aW9uIGdldFNoaW0oKSB7XG4gICAgcmV0dXJuIHNoaW07XG4gIH07XG4gIHZhciBSZWFjdFByb3BUeXBlcyA9IHtcbiAgICBhcnJheTogc2hpbSxcbiAgICBib29sOiBzaGltLFxuICAgIGZ1bmM6IHNoaW0sXG4gICAgbnVtYmVyOiBzaGltLFxuICAgIG9iamVjdDogc2hpbSxcbiAgICBzdHJpbmc6IHNoaW0sXG4gICAgc3ltYm9sOiBzaGltLFxuXG4gICAgYW55OiBzaGltLFxuICAgIGFycmF5T2Y6IGdldFNoaW0sXG4gICAgZWxlbWVudDogc2hpbSxcbiAgICBpbnN0YW5jZU9mOiBnZXRTaGltLFxuICAgIG5vZGU6IHNoaW0sXG4gICAgb2JqZWN0T2Y6IGdldFNoaW0sXG4gICAgb25lT2Y6IGdldFNoaW0sXG4gICAgb25lT2ZUeXBlOiBnZXRTaGltLFxuICAgIHNoYXBlOiBnZXRTaGltXG4gIH07XG5cbiAgUmVhY3RQcm9wVHlwZXMuY2hlY2tQcm9wVHlwZXMgPSBlbXB0eUZ1bmN0aW9uO1xuICBSZWFjdFByb3BUeXBlcy5Qcm9wVHlwZXMgPSBSZWFjdFByb3BUeXBlcztcblxuICByZXR1cm4gUmVhY3RQcm9wVHlwZXM7XG59O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3Byb3AtdHlwZXMvZmFjdG9yeVdpdGhUaHJvd2luZ1NoaW1zLmpzXG4vLyBtb2R1bGUgaWQgPSA0NjZcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZW1wdHlGdW5jdGlvbiA9IHJlcXVpcmUoJ2ZianMvbGliL2VtcHR5RnVuY3Rpb24nKTtcbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCdmYmpzL2xpYi9pbnZhcmlhbnQnKTtcbnZhciB3YXJuaW5nID0gcmVxdWlyZSgnZmJqcy9saWIvd2FybmluZycpO1xuXG52YXIgUmVhY3RQcm9wVHlwZXNTZWNyZXQgPSByZXF1aXJlKCcuL2xpYi9SZWFjdFByb3BUeXBlc1NlY3JldCcpO1xudmFyIGNoZWNrUHJvcFR5cGVzID0gcmVxdWlyZSgnLi9jaGVja1Byb3BUeXBlcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGlzVmFsaWRFbGVtZW50LCB0aHJvd09uRGlyZWN0QWNjZXNzKSB7XG4gIC8qIGdsb2JhbCBTeW1ib2wgKi9cbiAgdmFyIElURVJBVE9SX1NZTUJPTCA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgU3ltYm9sLml0ZXJhdG9yO1xuICB2YXIgRkFVWF9JVEVSQVRPUl9TWU1CT0wgPSAnQEBpdGVyYXRvcic7IC8vIEJlZm9yZSBTeW1ib2wgc3BlYy5cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgaXRlcmF0b3IgbWV0aG9kIGZ1bmN0aW9uIGNvbnRhaW5lZCBvbiB0aGUgaXRlcmFibGUgb2JqZWN0LlxuICAgKlxuICAgKiBCZSBzdXJlIHRvIGludm9rZSB0aGUgZnVuY3Rpb24gd2l0aCB0aGUgaXRlcmFibGUgYXMgY29udGV4dDpcbiAgICpcbiAgICogICAgIHZhciBpdGVyYXRvckZuID0gZ2V0SXRlcmF0b3JGbihteUl0ZXJhYmxlKTtcbiAgICogICAgIGlmIChpdGVyYXRvckZuKSB7XG4gICAqICAgICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhdG9yRm4uY2FsbChteUl0ZXJhYmxlKTtcbiAgICogICAgICAgLi4uXG4gICAqICAgICB9XG4gICAqXG4gICAqIEBwYXJhbSB7P29iamVjdH0gbWF5YmVJdGVyYWJsZVxuICAgKiBAcmV0dXJuIHs/ZnVuY3Rpb259XG4gICAqL1xuICBmdW5jdGlvbiBnZXRJdGVyYXRvckZuKG1heWJlSXRlcmFibGUpIHtcbiAgICB2YXIgaXRlcmF0b3JGbiA9IG1heWJlSXRlcmFibGUgJiYgKElURVJBVE9SX1NZTUJPTCAmJiBtYXliZUl0ZXJhYmxlW0lURVJBVE9SX1NZTUJPTF0gfHwgbWF5YmVJdGVyYWJsZVtGQVVYX0lURVJBVE9SX1NZTUJPTF0pO1xuICAgIGlmICh0eXBlb2YgaXRlcmF0b3JGbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIGl0ZXJhdG9yRm47XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbGxlY3Rpb24gb2YgbWV0aG9kcyB0aGF0IGFsbG93IGRlY2xhcmF0aW9uIGFuZCB2YWxpZGF0aW9uIG9mIHByb3BzIHRoYXQgYXJlXG4gICAqIHN1cHBsaWVkIHRvIFJlYWN0IGNvbXBvbmVudHMuIEV4YW1wbGUgdXNhZ2U6XG4gICAqXG4gICAqICAgdmFyIFByb3BzID0gcmVxdWlyZSgnUmVhY3RQcm9wVHlwZXMnKTtcbiAgICogICB2YXIgTXlBcnRpY2xlID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuICAgKiAgICAgcHJvcFR5cGVzOiB7XG4gICAqICAgICAgIC8vIEFuIG9wdGlvbmFsIHN0cmluZyBwcm9wIG5hbWVkIFwiZGVzY3JpcHRpb25cIi5cbiAgICogICAgICAgZGVzY3JpcHRpb246IFByb3BzLnN0cmluZyxcbiAgICpcbiAgICogICAgICAgLy8gQSByZXF1aXJlZCBlbnVtIHByb3AgbmFtZWQgXCJjYXRlZ29yeVwiLlxuICAgKiAgICAgICBjYXRlZ29yeTogUHJvcHMub25lT2YoWydOZXdzJywnUGhvdG9zJ10pLmlzUmVxdWlyZWQsXG4gICAqXG4gICAqICAgICAgIC8vIEEgcHJvcCBuYW1lZCBcImRpYWxvZ1wiIHRoYXQgcmVxdWlyZXMgYW4gaW5zdGFuY2Ugb2YgRGlhbG9nLlxuICAgKiAgICAgICBkaWFsb2c6IFByb3BzLmluc3RhbmNlT2YoRGlhbG9nKS5pc1JlcXVpcmVkXG4gICAqICAgICB9LFxuICAgKiAgICAgcmVuZGVyOiBmdW5jdGlvbigpIHsgLi4uIH1cbiAgICogICB9KTtcbiAgICpcbiAgICogQSBtb3JlIGZvcm1hbCBzcGVjaWZpY2F0aW9uIG9mIGhvdyB0aGVzZSBtZXRob2RzIGFyZSB1c2VkOlxuICAgKlxuICAgKiAgIHR5cGUgOj0gYXJyYXl8Ym9vbHxmdW5jfG9iamVjdHxudW1iZXJ8c3RyaW5nfG9uZU9mKFsuLi5dKXxpbnN0YW5jZU9mKC4uLilcbiAgICogICBkZWNsIDo9IFJlYWN0UHJvcFR5cGVzLnt0eXBlfSguaXNSZXF1aXJlZCk/XG4gICAqXG4gICAqIEVhY2ggYW5kIGV2ZXJ5IGRlY2xhcmF0aW9uIHByb2R1Y2VzIGEgZnVuY3Rpb24gd2l0aCB0aGUgc2FtZSBzaWduYXR1cmUuIFRoaXNcbiAgICogYWxsb3dzIHRoZSBjcmVhdGlvbiBvZiBjdXN0b20gdmFsaWRhdGlvbiBmdW5jdGlvbnMuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiAgdmFyIE15TGluayA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcbiAgICogICAgcHJvcFR5cGVzOiB7XG4gICAqICAgICAgLy8gQW4gb3B0aW9uYWwgc3RyaW5nIG9yIFVSSSBwcm9wIG5hbWVkIFwiaHJlZlwiLlxuICAgKiAgICAgIGhyZWY6IGZ1bmN0aW9uKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSkge1xuICAgKiAgICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICogICAgICAgIGlmIChwcm9wVmFsdWUgIT0gbnVsbCAmJiB0eXBlb2YgcHJvcFZhbHVlICE9PSAnc3RyaW5nJyAmJlxuICAgKiAgICAgICAgICAgICEocHJvcFZhbHVlIGluc3RhbmNlb2YgVVJJKSkge1xuICAgKiAgICAgICAgICByZXR1cm4gbmV3IEVycm9yKFxuICAgKiAgICAgICAgICAgICdFeHBlY3RlZCBhIHN0cmluZyBvciBhbiBVUkkgZm9yICcgKyBwcm9wTmFtZSArICcgaW4gJyArXG4gICAqICAgICAgICAgICAgY29tcG9uZW50TmFtZVxuICAgKiAgICAgICAgICApO1xuICAgKiAgICAgICAgfVxuICAgKiAgICAgIH1cbiAgICogICAgfSxcbiAgICogICAgcmVuZGVyOiBmdW5jdGlvbigpIHsuLi59XG4gICAqICB9KTtcbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuXG4gIHZhciBBTk9OWU1PVVMgPSAnPDxhbm9ueW1vdXM+Pic7XG5cbiAgLy8gSW1wb3J0YW50IVxuICAvLyBLZWVwIHRoaXMgbGlzdCBpbiBzeW5jIHdpdGggcHJvZHVjdGlvbiB2ZXJzaW9uIGluIGAuL2ZhY3RvcnlXaXRoVGhyb3dpbmdTaGltcy5qc2AuXG4gIHZhciBSZWFjdFByb3BUeXBlcyA9IHtcbiAgICBhcnJheTogY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXIoJ2FycmF5JyksXG4gICAgYm9vbDogY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXIoJ2Jvb2xlYW4nKSxcbiAgICBmdW5jOiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignZnVuY3Rpb24nKSxcbiAgICBudW1iZXI6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdudW1iZXInKSxcbiAgICBvYmplY3Q6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdvYmplY3QnKSxcbiAgICBzdHJpbmc6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdzdHJpbmcnKSxcbiAgICBzeW1ib2w6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdzeW1ib2wnKSxcblxuICAgIGFueTogY3JlYXRlQW55VHlwZUNoZWNrZXIoKSxcbiAgICBhcnJheU9mOiBjcmVhdGVBcnJheU9mVHlwZUNoZWNrZXIsXG4gICAgZWxlbWVudDogY3JlYXRlRWxlbWVudFR5cGVDaGVja2VyKCksXG4gICAgaW5zdGFuY2VPZjogY3JlYXRlSW5zdGFuY2VUeXBlQ2hlY2tlcixcbiAgICBub2RlOiBjcmVhdGVOb2RlQ2hlY2tlcigpLFxuICAgIG9iamVjdE9mOiBjcmVhdGVPYmplY3RPZlR5cGVDaGVja2VyLFxuICAgIG9uZU9mOiBjcmVhdGVFbnVtVHlwZUNoZWNrZXIsXG4gICAgb25lT2ZUeXBlOiBjcmVhdGVVbmlvblR5cGVDaGVja2VyLFxuICAgIHNoYXBlOiBjcmVhdGVTaGFwZVR5cGVDaGVja2VyXG4gIH07XG5cbiAgLyoqXG4gICAqIGlubGluZWQgT2JqZWN0LmlzIHBvbHlmaWxsIHRvIGF2b2lkIHJlcXVpcmluZyBjb25zdW1lcnMgc2hpcCB0aGVpciBvd25cbiAgICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvT2JqZWN0L2lzXG4gICAqL1xuICAvKmVzbGludC1kaXNhYmxlIG5vLXNlbGYtY29tcGFyZSovXG4gIGZ1bmN0aW9uIGlzKHgsIHkpIHtcbiAgICAvLyBTYW1lVmFsdWUgYWxnb3JpdGhtXG4gICAgaWYgKHggPT09IHkpIHtcbiAgICAgIC8vIFN0ZXBzIDEtNSwgNy0xMFxuICAgICAgLy8gU3RlcHMgNi5iLTYuZTogKzAgIT0gLTBcbiAgICAgIHJldHVybiB4ICE9PSAwIHx8IDEgLyB4ID09PSAxIC8geTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU3RlcCA2LmE6IE5hTiA9PSBOYU5cbiAgICAgIHJldHVybiB4ICE9PSB4ICYmIHkgIT09IHk7XG4gICAgfVxuICB9XG4gIC8qZXNsaW50LWVuYWJsZSBuby1zZWxmLWNvbXBhcmUqL1xuXG4gIC8qKlxuICAgKiBXZSB1c2UgYW4gRXJyb3ItbGlrZSBvYmplY3QgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgYXMgcGVvcGxlIG1heSBjYWxsXG4gICAqIFByb3BUeXBlcyBkaXJlY3RseSBhbmQgaW5zcGVjdCB0aGVpciBvdXRwdXQuIEhvd2V2ZXIsIHdlIGRvbid0IHVzZSByZWFsXG4gICAqIEVycm9ycyBhbnltb3JlLiBXZSBkb24ndCBpbnNwZWN0IHRoZWlyIHN0YWNrIGFueXdheSwgYW5kIGNyZWF0aW5nIHRoZW1cbiAgICogaXMgcHJvaGliaXRpdmVseSBleHBlbnNpdmUgaWYgdGhleSBhcmUgY3JlYXRlZCB0b28gb2Z0ZW4sIHN1Y2ggYXMgd2hhdFxuICAgKiBoYXBwZW5zIGluIG9uZU9mVHlwZSgpIGZvciBhbnkgdHlwZSBiZWZvcmUgdGhlIG9uZSB0aGF0IG1hdGNoZWQuXG4gICAqL1xuICBmdW5jdGlvbiBQcm9wVHlwZUVycm9yKG1lc3NhZ2UpIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIHRoaXMuc3RhY2sgPSAnJztcbiAgfVxuICAvLyBNYWtlIGBpbnN0YW5jZW9mIEVycm9yYCBzdGlsbCB3b3JrIGZvciByZXR1cm5lZCBlcnJvcnMuXG4gIFByb3BUeXBlRXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKSB7XG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgIHZhciBtYW51YWxQcm9wVHlwZUNhbGxDYWNoZSA9IHt9O1xuICAgICAgdmFyIG1hbnVhbFByb3BUeXBlV2FybmluZ0NvdW50ID0gMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gY2hlY2tUeXBlKGlzUmVxdWlyZWQsIHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSwgc2VjcmV0KSB7XG4gICAgICBjb21wb25lbnROYW1lID0gY29tcG9uZW50TmFtZSB8fCBBTk9OWU1PVVM7XG4gICAgICBwcm9wRnVsbE5hbWUgPSBwcm9wRnVsbE5hbWUgfHwgcHJvcE5hbWU7XG5cbiAgICAgIGlmIChzZWNyZXQgIT09IFJlYWN0UHJvcFR5cGVzU2VjcmV0KSB7XG4gICAgICAgIGlmICh0aHJvd09uRGlyZWN0QWNjZXNzKSB7XG4gICAgICAgICAgLy8gTmV3IGJlaGF2aW9yIG9ubHkgZm9yIHVzZXJzIG9mIGBwcm9wLXR5cGVzYCBwYWNrYWdlXG4gICAgICAgICAgaW52YXJpYW50KFxuICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAnQ2FsbGluZyBQcm9wVHlwZXMgdmFsaWRhdG9ycyBkaXJlY3RseSBpcyBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBgcHJvcC10eXBlc2AgcGFja2FnZS4gJyArXG4gICAgICAgICAgICAnVXNlIGBQcm9wVHlwZXMuY2hlY2tQcm9wVHlwZXMoKWAgdG8gY2FsbCB0aGVtLiAnICtcbiAgICAgICAgICAgICdSZWFkIG1vcmUgYXQgaHR0cDovL2ZiLm1lL3VzZS1jaGVjay1wcm9wLXR5cGVzJ1xuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyAmJiB0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAvLyBPbGQgYmVoYXZpb3IgZm9yIHBlb3BsZSB1c2luZyBSZWFjdC5Qcm9wVHlwZXNcbiAgICAgICAgICB2YXIgY2FjaGVLZXkgPSBjb21wb25lbnROYW1lICsgJzonICsgcHJvcE5hbWU7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgIW1hbnVhbFByb3BUeXBlQ2FsbENhY2hlW2NhY2hlS2V5XSAmJlxuICAgICAgICAgICAgLy8gQXZvaWQgc3BhbW1pbmcgdGhlIGNvbnNvbGUgYmVjYXVzZSB0aGV5IGFyZSBvZnRlbiBub3QgYWN0aW9uYWJsZSBleGNlcHQgZm9yIGxpYiBhdXRob3JzXG4gICAgICAgICAgICBtYW51YWxQcm9wVHlwZVdhcm5pbmdDb3VudCA8IDNcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHdhcm5pbmcoXG4gICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAnWW91IGFyZSBtYW51YWxseSBjYWxsaW5nIGEgUmVhY3QuUHJvcFR5cGVzIHZhbGlkYXRpb24gJyArXG4gICAgICAgICAgICAgICdmdW5jdGlvbiBmb3IgdGhlIGAlc2AgcHJvcCBvbiBgJXNgLiBUaGlzIGlzIGRlcHJlY2F0ZWQgJyArXG4gICAgICAgICAgICAgICdhbmQgd2lsbCB0aHJvdyBpbiB0aGUgc3RhbmRhbG9uZSBgcHJvcC10eXBlc2AgcGFja2FnZS4gJyArXG4gICAgICAgICAgICAgICdZb3UgbWF5IGJlIHNlZWluZyB0aGlzIHdhcm5pbmcgZHVlIHRvIGEgdGhpcmQtcGFydHkgUHJvcFR5cGVzICcgK1xuICAgICAgICAgICAgICAnbGlicmFyeS4gU2VlIGh0dHBzOi8vZmIubWUvcmVhY3Qtd2FybmluZy1kb250LWNhbGwtcHJvcHR5cGVzICcgKyAnZm9yIGRldGFpbHMuJyxcbiAgICAgICAgICAgICAgcHJvcEZ1bGxOYW1lLFxuICAgICAgICAgICAgICBjb21wb25lbnROYW1lXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgbWFudWFsUHJvcFR5cGVDYWxsQ2FjaGVbY2FjaGVLZXldID0gdHJ1ZTtcbiAgICAgICAgICAgIG1hbnVhbFByb3BUeXBlV2FybmluZ0NvdW50Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAocHJvcHNbcHJvcE5hbWVdID09IG51bGwpIHtcbiAgICAgICAgaWYgKGlzUmVxdWlyZWQpIHtcbiAgICAgICAgICBpZiAocHJvcHNbcHJvcE5hbWVdID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ1RoZSAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2AgaXMgbWFya2VkIGFzIHJlcXVpcmVkICcgKyAoJ2luIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBidXQgaXRzIHZhbHVlIGlzIGBudWxsYC4nKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignVGhlICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBpcyBtYXJrZWQgYXMgcmVxdWlyZWQgaW4gJyArICgnYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGJ1dCBpdHMgdmFsdWUgaXMgYHVuZGVmaW5lZGAuJykpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGNoYWluZWRDaGVja1R5cGUgPSBjaGVja1R5cGUuYmluZChudWxsLCBmYWxzZSk7XG4gICAgY2hhaW5lZENoZWNrVHlwZS5pc1JlcXVpcmVkID0gY2hlY2tUeXBlLmJpbmQobnVsbCwgdHJ1ZSk7XG5cbiAgICByZXR1cm4gY2hhaW5lZENoZWNrVHlwZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKGV4cGVjdGVkVHlwZSkge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSwgc2VjcmV0KSB7XG4gICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdO1xuICAgICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICAgIGlmIChwcm9wVHlwZSAhPT0gZXhwZWN0ZWRUeXBlKSB7XG4gICAgICAgIC8vIGBwcm9wVmFsdWVgIGJlaW5nIGluc3RhbmNlIG9mLCBzYXksIGRhdGUvcmVnZXhwLCBwYXNzIHRoZSAnb2JqZWN0J1xuICAgICAgICAvLyBjaGVjaywgYnV0IHdlIGNhbiBvZmZlciBhIG1vcmUgcHJlY2lzZSBlcnJvciBtZXNzYWdlIGhlcmUgcmF0aGVyIHRoYW5cbiAgICAgICAgLy8gJ29mIHR5cGUgYG9iamVjdGAnLlxuICAgICAgICB2YXIgcHJlY2lzZVR5cGUgPSBnZXRQcmVjaXNlVHlwZShwcm9wVmFsdWUpO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSAnICsgKCdgJyArIHByZWNpc2VUeXBlICsgJ2Agc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkICcpICsgKCdgJyArIGV4cGVjdGVkVHlwZSArICdgLicpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlQW55VHlwZUNoZWNrZXIoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKGVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNOdWxsKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUFycmF5T2ZUeXBlQ2hlY2tlcih0eXBlQ2hlY2tlcikge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgaWYgKHR5cGVvZiB0eXBlQ2hlY2tlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ1Byb3BlcnR5IGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgY29tcG9uZW50IGAnICsgY29tcG9uZW50TmFtZSArICdgIGhhcyBpbnZhbGlkIFByb3BUeXBlIG5vdGF0aW9uIGluc2lkZSBhcnJheU9mLicpO1xuICAgICAgfVxuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShwcm9wVmFsdWUpKSB7XG4gICAgICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSAnICsgKCdgJyArIHByb3BUeXBlICsgJ2Agc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIGFuIGFycmF5LicpKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcFZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBlcnJvciA9IHR5cGVDaGVja2VyKHByb3BWYWx1ZSwgaSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSArICdbJyArIGkgKyAnXScsIFJlYWN0UHJvcFR5cGVzU2VjcmV0KTtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRWxlbWVudFR5cGVDaGVja2VyKCkge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIGlmICghaXNWYWxpZEVsZW1lbnQocHJvcFZhbHVlKSkge1xuICAgICAgICB2YXIgcHJvcFR5cGUgPSBnZXRQcm9wVHlwZShwcm9wVmFsdWUpO1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHR5cGUgJyArICgnYCcgKyBwcm9wVHlwZSArICdgIHN1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCBhIHNpbmdsZSBSZWFjdEVsZW1lbnQuJykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVJbnN0YW5jZVR5cGVDaGVja2VyKGV4cGVjdGVkQ2xhc3MpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIGlmICghKHByb3BzW3Byb3BOYW1lXSBpbnN0YW5jZW9mIGV4cGVjdGVkQ2xhc3MpKSB7XG4gICAgICAgIHZhciBleHBlY3RlZENsYXNzTmFtZSA9IGV4cGVjdGVkQ2xhc3MubmFtZSB8fCBBTk9OWU1PVVM7XG4gICAgICAgIHZhciBhY3R1YWxDbGFzc05hbWUgPSBnZXRDbGFzc05hbWUocHJvcHNbcHJvcE5hbWVdKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiB0eXBlICcgKyAoJ2AnICsgYWN0dWFsQ2xhc3NOYW1lICsgJ2Agc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkICcpICsgKCdpbnN0YW5jZSBvZiBgJyArIGV4cGVjdGVkQ2xhc3NOYW1lICsgJ2AuJykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVFbnVtVHlwZUNoZWNrZXIoZXhwZWN0ZWRWYWx1ZXMpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoZXhwZWN0ZWRWYWx1ZXMpKSB7XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gd2FybmluZyhmYWxzZSwgJ0ludmFsaWQgYXJndW1lbnQgc3VwcGxpZWQgdG8gb25lT2YsIGV4cGVjdGVkIGFuIGluc3RhbmNlIG9mIGFycmF5LicpIDogdm9pZCAwO1xuICAgICAgcmV0dXJuIGVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNOdWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXhwZWN0ZWRWYWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGlzKHByb3BWYWx1ZSwgZXhwZWN0ZWRWYWx1ZXNbaV0pKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIHZhbHVlc1N0cmluZyA9IEpTT04uc3RyaW5naWZ5KGV4cGVjdGVkVmFsdWVzKTtcbiAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdmFsdWUgYCcgKyBwcm9wVmFsdWUgKyAnYCAnICsgKCdzdXBwbGllZCB0byBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgb25lIG9mICcgKyB2YWx1ZXNTdHJpbmcgKyAnLicpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU9iamVjdE9mVHlwZUNoZWNrZXIodHlwZUNoZWNrZXIpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIGlmICh0eXBlb2YgdHlwZUNoZWNrZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdQcm9wZXJ0eSBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIGNvbXBvbmVudCBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCBoYXMgaW52YWxpZCBQcm9wVHlwZSBub3RhdGlvbiBpbnNpZGUgb2JqZWN0T2YuJyk7XG4gICAgICB9XG4gICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdO1xuICAgICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICAgIGlmIChwcm9wVHlwZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiB0eXBlICcgKyAoJ2AnICsgcHJvcFR5cGUgKyAnYCBzdXBwbGllZCB0byBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgYW4gb2JqZWN0LicpKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGtleSBpbiBwcm9wVmFsdWUpIHtcbiAgICAgICAgaWYgKHByb3BWYWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgdmFyIGVycm9yID0gdHlwZUNoZWNrZXIocHJvcFZhbHVlLCBrZXksIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUgKyAnLicgKyBrZXksIFJlYWN0UHJvcFR5cGVzU2VjcmV0KTtcbiAgICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVVbmlvblR5cGVDaGVja2VyKGFycmF5T2ZUeXBlQ2hlY2tlcnMpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyYXlPZlR5cGVDaGVja2VycykpIHtcbiAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyB3YXJuaW5nKGZhbHNlLCAnSW52YWxpZCBhcmd1bWVudCBzdXBwbGllZCB0byBvbmVPZlR5cGUsIGV4cGVjdGVkIGFuIGluc3RhbmNlIG9mIGFycmF5LicpIDogdm9pZCAwO1xuICAgICAgcmV0dXJuIGVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNOdWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheU9mVHlwZUNoZWNrZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGVja2VyID0gYXJyYXlPZlR5cGVDaGVja2Vyc1tpXTtcbiAgICAgICAgaWYgKGNoZWNrZXIocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lLCBSZWFjdFByb3BUeXBlc1NlY3JldCkgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agc3VwcGxpZWQgdG8gJyArICgnYCcgKyBjb21wb25lbnROYW1lICsgJ2AuJykpO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTm9kZUNoZWNrZXIoKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICBpZiAoIWlzTm9kZShwcm9wc1twcm9wTmFtZV0pKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agc3VwcGxpZWQgdG8gJyArICgnYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIGEgUmVhY3ROb2RlLicpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlU2hhcGVUeXBlQ2hlY2tlcihzaGFwZVR5cGVzKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdO1xuICAgICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICAgIGlmIChwcm9wVHlwZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiB0eXBlIGAnICsgcHJvcFR5cGUgKyAnYCAnICsgKCdzdXBwbGllZCB0byBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgYG9iamVjdGAuJykpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIga2V5IGluIHNoYXBlVHlwZXMpIHtcbiAgICAgICAgdmFyIGNoZWNrZXIgPSBzaGFwZVR5cGVzW2tleV07XG4gICAgICAgIGlmICghY2hlY2tlcikge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlcnJvciA9IGNoZWNrZXIocHJvcFZhbHVlLCBrZXksIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUgKyAnLicgKyBrZXksIFJlYWN0UHJvcFR5cGVzU2VjcmV0KTtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzTm9kZShwcm9wVmFsdWUpIHtcbiAgICBzd2l0Y2ggKHR5cGVvZiBwcm9wVmFsdWUpIHtcbiAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgY2FzZSAndW5kZWZpbmVkJzpcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgcmV0dXJuICFwcm9wVmFsdWU7XG4gICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwcm9wVmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIHByb3BWYWx1ZS5ldmVyeShpc05vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9wVmFsdWUgPT09IG51bGwgfHwgaXNWYWxpZEVsZW1lbnQocHJvcFZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGl0ZXJhdG9yRm4gPSBnZXRJdGVyYXRvckZuKHByb3BWYWx1ZSk7XG4gICAgICAgIGlmIChpdGVyYXRvckZuKSB7XG4gICAgICAgICAgdmFyIGl0ZXJhdG9yID0gaXRlcmF0b3JGbi5jYWxsKHByb3BWYWx1ZSk7XG4gICAgICAgICAgdmFyIHN0ZXA7XG4gICAgICAgICAgaWYgKGl0ZXJhdG9yRm4gIT09IHByb3BWYWx1ZS5lbnRyaWVzKSB7XG4gICAgICAgICAgICB3aGlsZSAoIShzdGVwID0gaXRlcmF0b3IubmV4dCgpKS5kb25lKSB7XG4gICAgICAgICAgICAgIGlmICghaXNOb2RlKHN0ZXAudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEl0ZXJhdG9yIHdpbGwgcHJvdmlkZSBlbnRyeSBbayx2XSB0dXBsZXMgcmF0aGVyIHRoYW4gdmFsdWVzLlxuICAgICAgICAgICAgd2hpbGUgKCEoc3RlcCA9IGl0ZXJhdG9yLm5leHQoKSkuZG9uZSkge1xuICAgICAgICAgICAgICB2YXIgZW50cnkgPSBzdGVwLnZhbHVlO1xuICAgICAgICAgICAgICBpZiAoZW50cnkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlzTm9kZShlbnRyeVsxXSkpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaXNTeW1ib2wocHJvcFR5cGUsIHByb3BWYWx1ZSkge1xuICAgIC8vIE5hdGl2ZSBTeW1ib2wuXG4gICAgaWYgKHByb3BUeXBlID09PSAnc3ltYm9sJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gMTkuNC4zLjUgU3ltYm9sLnByb3RvdHlwZVtAQHRvU3RyaW5nVGFnXSA9PT0gJ1N5bWJvbCdcbiAgICBpZiAocHJvcFZhbHVlWydAQHRvU3RyaW5nVGFnJ10gPT09ICdTeW1ib2wnKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBGYWxsYmFjayBmb3Igbm9uLXNwZWMgY29tcGxpYW50IFN5bWJvbHMgd2hpY2ggYXJlIHBvbHlmaWxsZWQuXG4gICAgaWYgKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgcHJvcFZhbHVlIGluc3RhbmNlb2YgU3ltYm9sKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBFcXVpdmFsZW50IG9mIGB0eXBlb2ZgIGJ1dCB3aXRoIHNwZWNpYWwgaGFuZGxpbmcgZm9yIGFycmF5IGFuZCByZWdleHAuXG4gIGZ1bmN0aW9uIGdldFByb3BUeXBlKHByb3BWYWx1ZSkge1xuICAgIHZhciBwcm9wVHlwZSA9IHR5cGVvZiBwcm9wVmFsdWU7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocHJvcFZhbHVlKSkge1xuICAgICAgcmV0dXJuICdhcnJheSc7XG4gICAgfVxuICAgIGlmIChwcm9wVmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIC8vIE9sZCB3ZWJraXRzIChhdCBsZWFzdCB1bnRpbCBBbmRyb2lkIDQuMCkgcmV0dXJuICdmdW5jdGlvbicgcmF0aGVyIHRoYW5cbiAgICAgIC8vICdvYmplY3QnIGZvciB0eXBlb2YgYSBSZWdFeHAuIFdlJ2xsIG5vcm1hbGl6ZSB0aGlzIGhlcmUgc28gdGhhdCAvYmxhL1xuICAgICAgLy8gcGFzc2VzIFByb3BUeXBlcy5vYmplY3QuXG4gICAgICByZXR1cm4gJ29iamVjdCc7XG4gICAgfVxuICAgIGlmIChpc1N5bWJvbChwcm9wVHlwZSwgcHJvcFZhbHVlKSkge1xuICAgICAgcmV0dXJuICdzeW1ib2wnO1xuICAgIH1cbiAgICByZXR1cm4gcHJvcFR5cGU7XG4gIH1cblxuICAvLyBUaGlzIGhhbmRsZXMgbW9yZSB0eXBlcyB0aGFuIGBnZXRQcm9wVHlwZWAuIE9ubHkgdXNlZCBmb3IgZXJyb3IgbWVzc2FnZXMuXG4gIC8vIFNlZSBgY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXJgLlxuICBmdW5jdGlvbiBnZXRQcmVjaXNlVHlwZShwcm9wVmFsdWUpIHtcbiAgICB2YXIgcHJvcFR5cGUgPSBnZXRQcm9wVHlwZShwcm9wVmFsdWUpO1xuICAgIGlmIChwcm9wVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChwcm9wVmFsdWUgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgIHJldHVybiAnZGF0ZSc7XG4gICAgICB9IGVsc2UgaWYgKHByb3BWYWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICByZXR1cm4gJ3JlZ2V4cCc7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwcm9wVHlwZTtcbiAgfVxuXG4gIC8vIFJldHVybnMgY2xhc3MgbmFtZSBvZiB0aGUgb2JqZWN0LCBpZiBhbnkuXG4gIGZ1bmN0aW9uIGdldENsYXNzTmFtZShwcm9wVmFsdWUpIHtcbiAgICBpZiAoIXByb3BWYWx1ZS5jb25zdHJ1Y3RvciB8fCAhcHJvcFZhbHVlLmNvbnN0cnVjdG9yLm5hbWUpIHtcbiAgICAgIHJldHVybiBBTk9OWU1PVVM7XG4gICAgfVxuICAgIHJldHVybiBwcm9wVmFsdWUuY29uc3RydWN0b3IubmFtZTtcbiAgfVxuXG4gIFJlYWN0UHJvcFR5cGVzLmNoZWNrUHJvcFR5cGVzID0gY2hlY2tQcm9wVHlwZXM7XG4gIFJlYWN0UHJvcFR5cGVzLlByb3BUeXBlcyA9IFJlYWN0UHJvcFR5cGVzO1xuXG4gIHJldHVybiBSZWFjdFByb3BUeXBlcztcbn07XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9mYWN0b3J5V2l0aFR5cGVDaGVja2Vycy5qc1xuLy8gbW9kdWxlIGlkID0gNDY3XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsInZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBfY3JlYXRlQ2xhc3MgPSBmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfSByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9OyB9KCk7XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHNlbGYsIGNhbGwpIHsgaWYgKCFzZWxmKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gY2FsbCAmJiAodHlwZW9mIGNhbGwgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikgPyBjYWxsIDogc2VsZjsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb24sIG5vdCBcIiArIHR5cGVvZiBzdXBlckNsYXNzKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LnNldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKSA6IHN1YkNsYXNzLl9fcHJvdG9fXyA9IHN1cGVyQ2xhc3M7IH1cblxuLyoqXG4gKiBAbW9kdWxlIGNvbXBvbmVudFdyYXBwZXJcbiAqXG4gKi9cbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5cbmltcG9ydCBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgeyBvbk1vdW50LCBvblVubW91bnQgfSBmcm9tICcuLi9ldmVudF9oYW5kbGVycyc7XG5cbi8qKlxuICogY29tcG9uZW50V3JhcHBlclxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKiBAcGFyYW0ge29iamVjdH0gV3JhcHBlZENvbXBvbmVudCBSZWFjdCBjb21wb25lbnQgY2xhc3MgdG8gYmUgd3JhcHBlZFxuICogQHBhcmFtIHthcnJheX0gW2tleXNdIFRoZSBrZXkocykgYm91bmQgdG8gdGhlIGNsYXNzXG4gKiBAcmV0dXJuIHtvYmplY3R9IFRoZSBoaWdoZXItb3JkZXIgZnVuY3Rpb24gdGhhdCB3cmFwcyB0aGUgZGVjb3JhdGVkIGNsYXNzXG4gKi9cbmZ1bmN0aW9uIGNvbXBvbmVudFdyYXBwZXIoV3JhcHBlZENvbXBvbmVudCkge1xuICB2YXIga2V5cyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogbnVsbDtcblxuICB2YXIgS2V5Qm9hcmRIZWxwZXIgPSBmdW5jdGlvbiAoX1JlYWN0JENvbXBvbmVudCkge1xuICAgIF9pbmhlcml0cyhLZXlCb2FyZEhlbHBlciwgX1JlYWN0JENvbXBvbmVudCk7XG5cbiAgICBmdW5jdGlvbiBLZXlCb2FyZEhlbHBlcihwcm9wcykge1xuICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEtleUJvYXJkSGVscGVyKTtcblxuICAgICAgdmFyIF90aGlzID0gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgKEtleUJvYXJkSGVscGVyLl9fcHJvdG9fXyB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoS2V5Qm9hcmRIZWxwZXIpKS5jYWxsKHRoaXMsIHByb3BzKSk7XG5cbiAgICAgIF90aGlzLnN0YXRlID0ge1xuICAgICAgICBldmVudDogbnVsbFxuICAgICAgfTtcbiAgICAgIHJldHVybiBfdGhpcztcbiAgICB9XG5cbiAgICBfY3JlYXRlQ2xhc3MoS2V5Qm9hcmRIZWxwZXIsIFt7XG4gICAgICBrZXk6ICdjb21wb25lbnREaWRNb3VudCcsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIG9uTW91bnQodGhpcyk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnY29tcG9uZW50V2lsbFVubW91bnQnLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuICAgICAgICBvblVubW91bnQodGhpcyk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnaGFuZGxlS2V5RG93bicsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gaGFuZGxlS2V5RG93bihldmVudCkge1xuICAgICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgICAvLyB0byBzaW11bGF0ZSBhIGtleXByZXNzLCBzZXQgdGhlIGV2ZW50IGFuZCB0aGVuIGNsZWFyIGl0IGluIHRoZSBjYWxsYmFja1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgZXZlbnQ6IGV2ZW50IH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gX3RoaXMyLnNldFN0YXRlKHsgZXZlbnQ6IG51bGwgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogJ3JlbmRlcicsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChXcmFwcGVkQ29tcG9uZW50LCBfZXh0ZW5kcyh7fSwgdGhpcy5wcm9wcywgeyBrZXlkb3duOiB0aGlzLnN0YXRlIH0pKTtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gS2V5Qm9hcmRIZWxwZXI7XG4gIH0oUmVhY3QuQ29tcG9uZW50KTtcblxuICBzdG9yZS5zZXRCaW5kaW5nKHsga2V5czoga2V5cywgZm46IEtleUJvYXJkSGVscGVyLnByb3RvdHlwZS5oYW5kbGVLZXlEb3duLCB0YXJnZXQ6IEtleUJvYXJkSGVscGVyLnByb3RvdHlwZSB9KTtcblxuICByZXR1cm4gS2V5Qm9hcmRIZWxwZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNvbXBvbmVudFdyYXBwZXI7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvZGVjb3JhdG9ycy9jbGFzc19kZWNvcmF0b3IuanNcbi8vIG1vZHVsZSBpZCA9IDU1NVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJ2YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbi8qKlxuICogQG1vZHVsZSBkZWNvcmF0b3JzXG4gKlxuICovXG5pbXBvcnQgY2xhc3NXcmFwcGVyIGZyb20gJy4vY2xhc3NfZGVjb3JhdG9yJztcbmltcG9ydCBtZXRob2RXcmFwcGVyIGZyb20gJy4vbWV0aG9kX2RlY29yYXRvcic7XG5pbXBvcnQgbWV0aG9kV3JhcHBlclNjb3BlZCBmcm9tICcuL21ldGhvZF9kZWNvcmF0b3Jfc2NvcGVkJztcblxuLyoqXG4gKiBfZGVjb3JhdG9yXG4gKlxuICogQGFjY2VzcyBwcml2YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBtZXRob2RGbiBUaGUgbWV0aG9kIHdyYXBwZXIgdG8gZGVsZWdhdGUgdG8sIGJhc2VkIG9uIHdoZXRoZXIgdXNlciBoYXMgc3BlY2lmaWVkIGEgc2NvcGVkIGRlY29yYXRvciBvciBub3RcbiAqIEBwYXJhbSB7QXJyYXl9IC4uLmFyZ3MgUmVtYWluZGVyIG9mIGFyZ3VtZW50cyBwYXNzZWQgaW5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSBUaGUgZGVjb3JhdGVkIGNsYXNzIG9yIG1ldGhvZFxuICovXG5mdW5jdGlvbiBfZGVjb3JhdG9yKG1ldGhvZEZuKSB7XG4gIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbiA+IDEgPyBfbGVuIC0gMSA6IDApLCBfa2V5ID0gMTsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgIGFyZ3NbX2tleSAtIDFdID0gYXJndW1lbnRzW19rZXldO1xuICB9XG5cbiAgLy8gY2hlY2sgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHNlZSBpZiBpdCdzIGEgdXNlci1zdXBwbGllZCBrZXljb2RlIG9yIGFycmF5XG4gIC8vIG9mIGtleWNvZGVzLCBvciBpZiBpdCdzIHRoZSB3cmFwcGVkIGNsYXNzIG9yIG1ldGhvZFxuICB2YXIgdGVzdEFyZyA9IGFyZ3NbMF07XG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSh0ZXN0QXJnKTtcblxuICAvLyBpZiB0aGUgdGVzdCBhcmd1bWVudCBpcyBub3QgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uLCBpdCBpcyB1c2VyLXN1cHBsaWVkXG4gIC8vIGtleWNvZGVzLiBlbHNlIHRoZXJlIGFyZSBubyBhcmd1bWVudHMgYW5kIGl0J3MganVzdCB0aGUgd3JhcHBlZCBjbGFzc1xuICAvLyAobWV0aG9kIGRlY29yYXRvcnMgbXVzdCBoYXZlIGtleWNvZGUgYXJndW1lbnRzKS5cbiAgaWYgKGlzQXJyYXkgfHwgflsnc3RyaW5nJywgJ251bWJlciddLmluZGV4T2YodHlwZW9mIHRlc3RBcmcgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHRlc3RBcmcpKSkge1xuICAgIHZhciBrZXlzID0gaXNBcnJheSA/IHRlc3RBcmcgOiBhcmdzO1xuXG4gICAgLy8gcmV0dXJuIHRoZSBkZWNvcmF0b3IgZnVuY3Rpb24sIHdoaWNoIG9uIHRoZSBuZXh0IGNhbGwgd2lsbCBsb29rIGZvclxuICAgIC8vIHRoZSBwcmVzZW5jZSBvZiBhIG1ldGhvZCBuYW1lIHRvIGRldGVybWluZSBpZiB0aGlzIGlzIGEgd3JhcHBlZCBtZXRob2RcbiAgICAvLyBvciBjb21wb25lbnRcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwgbWV0aG9kTmFtZSwgZGVzY3JpcHRvcikge1xuICAgICAgcmV0dXJuIG1ldGhvZE5hbWUgPyBtZXRob2RGbih7IHRhcmdldDogdGFyZ2V0LCBkZXNjcmlwdG9yOiBkZXNjcmlwdG9yLCBrZXlzOiBrZXlzIH0pIDogY2xhc3NXcmFwcGVyKHRhcmdldCwga2V5cyk7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbWV0aG9kTmFtZSA9IGFyZ3NbMV07XG5cbiAgICAvLyBtZXRob2QgZGVjb3JhdG9ycyB3aXRob3V0IGtleWNvZGUgKHdoaWNoKSBhcmd1bWVudHMgYXJlIG5vdCBhbGxvd2VkLlxuICAgIGlmICghbWV0aG9kTmFtZSkge1xuICAgICAgcmV0dXJuIGNsYXNzV3JhcHBlci5hcHBseSh1bmRlZmluZWQsIGFyZ3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLndhcm4obWV0aG9kTmFtZSArICc6IE1ldGhvZCBkZWNvcmF0b3JzIG11c3QgaGF2ZSBrZXljb2RlIGFyZ3VtZW50cywgc28gdGhlIGRlY29yYXRvciBmb3IgdGhpcyBtZXRob2Qgd2lsbCBub3QgZG8gYW55dGhpbmcnKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBrZXlkb3duU2NvcGVkXG4gKlxuICogTWV0aG9kIGRlY29yYXRvciB0aGF0IHdpbGwgbG9vayBmb3IgY2hhbmdlcyB0byBpdHMgdGFyZ2V0ZWQgY29tcG9uZW50J3NcbiAqIGBrZXlkb3duYCBwcm9wcyB0byBkZWNpZGUgd2hlbiB0byB0cmlnZ2VyLCByYXRoZXIgdGhhbiByZXNwb25kaW5nIGRpcmVjdGx5XG4gKiB0byBrZXlkb3duIGV2ZW50cy4gVGhpcyBsZXRzIHlvdSBzcGVjaWZ5IGEgQGtleWRvd24gZGVjb3JhdGVkIGNsYXNzIGhpZ2hlclxuICogdXAgaW4gdGhlIHZpZXcgaGllcmFyY2h5IGZvciBsYXJnZXIgc2NvcGluZyBvZiBrZXlkb3duIGV2ZW50cywgb3IgZm9yXG4gKiBwcm9ncmFtbWF0aWNhbGx5IHNlbmRpbmcga2V5ZG93biBldmVudHMgYXMgcHJvcHMgaW50byB0aGUgY29tcG9uZW50cyBpbiBvcmRlclxuICogdG8gdHJpZ2dlciBkZWNvcmF0ZWQgbWV0aG9kcyB3aXRoIG1hdGNoaW5nIGtleXMuXG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqIEBwYXJhbSB7QXJyYXl9IC4uLmFyZ3MgIEFsbCAob3Igbm8pIGFyZ3VtZW50cyBwYXNzZWQgaW4gZnJvbSBkZWNvcmF0aW9uXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIGRlY29yYXRlZCBjbGFzcyBvciBtZXRob2RcbiAqL1xuZnVuY3Rpb24ga2V5ZG93blNjb3BlZCgpIHtcbiAgZm9yICh2YXIgX2xlbjIgPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbjIpLCBfa2V5MiA9IDA7IF9rZXkyIDwgX2xlbjI7IF9rZXkyKyspIHtcbiAgICBhcmdzW19rZXkyXSA9IGFyZ3VtZW50c1tfa2V5Ml07XG4gIH1cblxuICByZXR1cm4gX2RlY29yYXRvci5hcHBseSh1bmRlZmluZWQsIFttZXRob2RXcmFwcGVyU2NvcGVkXS5jb25jYXQoYXJncykpO1xufVxuXG4vKipcbiAqIGtleWRvd25cbiAqXG4gKiBUaGUgbWFpbiBkZWNvcmF0b3IgYW5kIGRlZmF1bHQgZXhwb3J0LCBoYW5kbGVzIGJvdGggY2xhc3NlcyBhbmQgbWV0aG9kcy5cbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtBcnJheX0gLi4uYXJncyAgQWxsIChvciBubykgYXJndW1lbnRzIHBhc3NlZCBpbiBmcm9tIGRlY29yYXRpb25cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSBUaGUgZGVjb3JhdGVkIGNsYXNzIG9yIG1ldGhvZFxuICovXG5mdW5jdGlvbiBrZXlkb3duKCkge1xuICBmb3IgKHZhciBfbGVuMyA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuMyksIF9rZXkzID0gMDsgX2tleTMgPCBfbGVuMzsgX2tleTMrKykge1xuICAgIGFyZ3NbX2tleTNdID0gYXJndW1lbnRzW19rZXkzXTtcbiAgfVxuXG4gIHJldHVybiBfZGVjb3JhdG9yLmFwcGx5KHVuZGVmaW5lZCwgW21ldGhvZFdyYXBwZXJdLmNvbmNhdChhcmdzKSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGtleWRvd247XG5cbmV4cG9ydCB7IGtleWRvd25TY29wZWQgfTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL2luZGV4LmpzXG4vLyBtb2R1bGUgaWQgPSA1NTZcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwidmFyIF90eXBlb2YgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIiA/IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH0gOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9O1xuXG4vKipcbiAqIEBtb2R1bGUgbWV0aG9kV3JhcHBlclxuICpcbiAqL1xuaW1wb3J0IHN0b3JlIGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7IG9uTW91bnQsIG9uVW5tb3VudCwgX29uS2V5RG93biB9IGZyb20gJy4uL2V2ZW50X2hhbmRsZXJzJztcblxuLyoqXG4gKiBfaXNSZWFjdEtleURvd25cbiAqXG4gKiBAYWNjZXNzIHByaXZhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBldmVudCBUaGUgcG9zc2libHkgc3ludGhldGljIGV2ZW50IHBhc3NlZCBhcyBhbiBhcmd1bWVudCB3aXRoXG4gKiB0aGUgbWV0aG9kIGludm9jYXRpb24uXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBfaXNSZWFjdEtleURvd24oZXZlbnQpIHtcbiAgcmV0dXJuIGV2ZW50ICYmICh0eXBlb2YgZXZlbnQgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGV2ZW50KSkgPT09ICdvYmplY3QnICYmIGV2ZW50Lm5hdGl2ZUV2ZW50IGluc3RhbmNlb2Ygd2luZG93LktleWJvYXJkRXZlbnQgJiYgZXZlbnQudHlwZSA9PT0gJ2tleWRvd24nO1xufVxuXG4vKipcbiAqIG1ldGhvZFdyYXBwZXJcbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtvYmplY3R9IGFyZ3MgQWxsIGFyZ3VtZW50cyBuZWNlc3NhcnkgZm9yIHdyYXBwaW5nIG1ldGhvZFxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3MudGFyZ2V0IFRoZSBkZWNvcmF0ZWQgY2xhc3NcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzLmRlc2NyaXB0b3IgTWV0aG9kIGRlc2NyaXB0b3JcbiAqIEBwYXJhbSB7YXJyYXl9IGFyZ3Mua2V5cyBUaGUgYXJyYXkgb2Yga2V5cyBib3VuZCB0byB0aGUgZ2l2ZW4gbWV0aG9kXG4gKiBAcmV0dXJuIHtvYmplY3R9IFRoZSBtZXRob2QgZGVzY3JpcHRvclxuICovXG5mdW5jdGlvbiBtZXRob2RXcmFwcGVyKF9yZWYpIHtcbiAgdmFyIHRhcmdldCA9IF9yZWYudGFyZ2V0LFxuICAgICAgZGVzY3JpcHRvciA9IF9yZWYuZGVzY3JpcHRvcixcbiAgICAgIGtleXMgPSBfcmVmLmtleXM7XG5cblxuICB2YXIgZm4gPSBkZXNjcmlwdG9yLnZhbHVlO1xuXG4gIC8vIGlmIHdlIGhhdmVuJ3QgYWxyZWFkeSBjcmVhdGVkIGEgYmluZGluZyBmb3IgdGhpcyBjbGFzcyAodmlhIGFub3RoZXJcbiAgLy8gZGVjb3JhdGVkIG1ldGhvZCksIHdyYXAgdGhlc2UgbGlmZWN5Y2xlIG1ldGhvZHMuXG4gIGlmICghc3RvcmUuZ2V0QmluZGluZyh0YXJnZXQpKSB7XG4gICAgdmFyIGNvbXBvbmVudERpZE1vdW50ID0gdGFyZ2V0LmNvbXBvbmVudERpZE1vdW50LFxuICAgICAgICBjb21wb25lbnRXaWxsVW5tb3VudCA9IHRhcmdldC5jb21wb25lbnRXaWxsVW5tb3VudDtcblxuXG4gICAgdGFyZ2V0LmNvbXBvbmVudERpZE1vdW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgb25Nb3VudCh0aGlzKTtcbiAgICAgIGlmIChjb21wb25lbnREaWRNb3VudCkgcmV0dXJuIGNvbXBvbmVudERpZE1vdW50LmNhbGwodGhpcyk7XG4gICAgfTtcblxuICAgIHRhcmdldC5jb21wb25lbnRXaWxsVW5tb3VudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9uVW5tb3VudCh0aGlzKTtcbiAgICAgIGlmIChjb21wb25lbnRXaWxsVW5tb3VudCkgcmV0dXJuIGNvbXBvbmVudFdpbGxVbm1vdW50LmNhbGwodGhpcyk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIGFkZCB0aGlzIGJpbmRpbmcgb2Yga2V5cyBhbmQgbWV0aG9kIHRvIHRoZSB0YXJnZXQncyBiaW5kaW5nc1xuICBzdG9yZS5zZXRCaW5kaW5nKHsga2V5czoga2V5cywgdGFyZ2V0OiB0YXJnZXQsIGZuOiBmbiB9KTtcblxuICBkZXNjcmlwdG9yLnZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbiksIF9rZXkgPSAwOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICBhcmdzW19rZXldID0gYXJndW1lbnRzW19rZXldO1xuICAgIH1cblxuICAgIHZhciBtYXliZUV2ZW50ID0gYXJnc1swXTtcblxuICAgIGlmIChfaXNSZWFjdEtleURvd24obWF5YmVFdmVudCkpIHtcbiAgICAgIC8vIHByb3h5IG1ldGhvZCBpbiBvcmRlciB0byB1c2UgQGtleWRvd24gYXMgZmlsdGVyIGZvciBrZXlkb3duIGV2ZW50cyBjb21pbmdcbiAgICAgIC8vIGZyb20gYW4gYWN0dWFsIG9uS2V5RG93biBiaW5kaW5nIChhcyBpZGVudGlmaWVkIGJ5IHJlYWN0J3MgYWRkaXRpb24gb2ZcbiAgICAgIC8vICduYXRpdmVFdmVudCcgKyB0eXBlID09PSAna2V5ZG93bicpXG4gICAgICBpZiAoIW1heWJlRXZlbnQuY3RybEtleSkge1xuICAgICAgICAvLyB3ZSBhbHJlYWR5IHdoaXRlbGlzdCBzaG9ydGN1dHMgd2l0aCBjdHJsIG1vZGlmaWVycyBzbyBpZiB3ZSB3ZXJlIHRvXG4gICAgICAgIC8vIGZpcmUgaXQgYWdhaW4gaGVyZSB0aGUgbWV0aG9kIHdvdWxkIHRyaWdnZXIgdHdpY2UuIHNlZSBodHRwczovL2dpdGh1Yi5jb20vZ2xvcnRoby9yZWFjdC1rZXlkb3duL2lzc3Vlcy8zOFxuICAgICAgICByZXR1cm4gX29uS2V5RG93bihtYXliZUV2ZW50LCB0cnVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCFtYXliZUV2ZW50IHx8ICEobWF5YmVFdmVudCBpbnN0YW5jZW9mIHdpbmRvdy5LZXlib2FyZEV2ZW50KSB8fCBtYXliZUV2ZW50LnR5cGUgIT09ICdrZXlkb3duJykge1xuICAgICAgLy8gaWYgb3VyIGZpcnN0IGFyZ3VtZW50IGlzIGEga2V5ZG93biBldmVudCBpdCBpcyBiZWluZyBoYW5kbGVkIGJ5IG91clxuICAgICAgLy8gYmluZGluZyBzeXN0ZW0uIGlmIGl0J3MgYW55dGhpbmcgZWxzZSwganVzdCBwYXNzIHRocm91Z2guXG4gICAgICByZXR1cm4gZm4uY2FsbC5hcHBseShmbiwgW3RoaXNdLmNvbmNhdChhcmdzKSk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBkZXNjcmlwdG9yO1xufVxuXG5leHBvcnQgZGVmYXVsdCBtZXRob2RXcmFwcGVyO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvbWV0aG9kX2RlY29yYXRvci5qc1xuLy8gbW9kdWxlIGlkID0gNTU3XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQG1vZHVsZSBtZXRob2RXcmFwcGVyU2NvcGVkXG4gKlxuICovXG5pbXBvcnQgbWF0Y2hLZXlzIGZyb20gJy4uL2xpYi9tYXRjaF9rZXlzJztcbmltcG9ydCBwYXJzZUtleXMgZnJvbSAnLi4vbGliL3BhcnNlX2tleXMnO1xuXG4vKipcbiAqIF9zaG91bGRUcmlnZ2VyXG4gKlxuICogQGFjY2VzcyBwcml2YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gdGhpc1Byb3BzIEV4c3RpbmcgcHJvcHMgZnJvbSB0aGUgd3JhcHBlZCBjb21wb25lbnRcbiAqIEBwYXJhbSB7b2JqZWN0fSB0aGlzUHJvcHMua2V5ZG93biBUaGUgbmFtZXNwYWNlZCBzdGF0ZSBmcm9tIHRoZSBoaWdoZXItb3JkZXJcbiAqIGNvbXBvbmVudCAoY2xhc3NfZGVjb3JhdG9yKVxuICogQHBhcmFtIHtvYmplY3R9IG5leHRQcm9wcyBUaGUgaW5jb21pbmcgcHJvcHMgZnJvbSB0aGUgd3JhcHBlZCBjb21wb25lbnRcbiAqIEBwYXJhbSB7b2JqZWN0fSBuZXh0UHJvcHMua2V5ZG93biBUaGUgbmFtZXNjYXBlZCBzdGF0ZSBmcm9tIHRoZSBoaWdoZXItb3JkZXJcbiAqIGNvbXBvbmVudCAoY2xhc3NfZGVjb3JhdG9yKVxuICogQHBhcmFtIHthcnJheX0ga2V5cyBUaGUga2V5cyBib3VuZCB0byB0aGUgZGVjb3JhdGVkIG1ldGhvZFxuICogQHJldHVybiB7Ym9vbGVhbn0gV2hldGhlciBhbGwgdGVzdHMgaGF2ZSBwYXNzZWRcbiAqL1xuZnVuY3Rpb24gX3Nob3VsZFRyaWdnZXIoX3JlZiwga2V5ZG93bk5leHQpIHtcbiAgdmFyIGtleWRvd25UaGlzID0gX3JlZi5rZXlkb3duO1xuXG4gIHJldHVybiBrZXlkb3duTmV4dCAmJiBrZXlkb3duTmV4dC5ldmVudCAmJiAha2V5ZG93blRoaXMuZXZlbnQ7XG59XG5cbi8qKlxuICogbWV0aG9kV3JhcHBlclNjb3BlZFxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKiBAcGFyYW0ge29iamVjdH0gYXJncyBBbGwgYXJncyBuZWNlc3NhcnkgZm9yIGRlY29yYXRpbmcgdGhlIG1ldGhvZFxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3MudGFyZ2V0IFRoZSBkZWNvcmF0ZWQgbWV0aG9kJ3MgY2xhc3Mgb2JqZWN0XG4gKiBAcGFyYW0ge29iamVjdH0gYXJncy5kZXNjcmlwdG9yIFRoZSBtZXRob2QncyBkZXNjcmlwdG9yIG9iamVjdFxuICogQHBhcmFtIHthcnJheX0gYXJncy5rZXlzIFRoZSBrZXkgY29kZXMgYm91bmQgdG8gdGhlIGRlY29yYXRlZCBtZXRob2RcbiAqIEByZXR1cm4ge29iamVjdH0gVGhlIG1ldGhvZCdzIGRlc2NyaXB0b3Igb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIG1ldGhvZFdyYXBwZXJTY29wZWQoX3JlZjIpIHtcbiAgdmFyIHRhcmdldCA9IF9yZWYyLnRhcmdldCxcbiAgICAgIGRlc2NyaXB0b3IgPSBfcmVmMi5kZXNjcmlwdG9yLFxuICAgICAga2V5cyA9IF9yZWYyLmtleXM7XG4gIHZhciBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzID0gdGFyZ2V0LmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM7XG5cbiAgdmFyIGZuID0gZGVzY3JpcHRvci52YWx1ZTtcbiAgaWYgKCFrZXlzKSB7XG4gICAgY29uc29sZS53YXJuKGZuICsgJzoga2V5ZG93blNjb3BlZCByZXF1aXJlcyBvbmUgb3IgbW9yZSBrZXlzJyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGtleVNldHMgPSBwYXJzZUtleXMoa2V5cyk7XG5cbiAgICAvLyB3cmFwIHRoZSBjb21wb25lbnQncyBsaWZlY3ljbGUgbWV0aG9kIHRvIGludGVyY2VwdCBrZXkgY29kZXMgY29taW5nIGRvd25cbiAgICAvLyBmcm9tIHRoZSB3cmFwcGVkL3Njb3BlZCBjb21wb25lbnQgdXAgdGhlIHZpZXcgaGllcmFyY2h5LiBpZiBuZXcga2V5ZG93blxuICAgIC8vIGV2ZW50IGhhcyBhcnJpdmVkIGFuZCB0aGUga2V5IGNvZGVzIG1hdGNoIHdoYXQgd2FzIHNwZWNpZmllZCBpbiB0aGVcbiAgICAvLyBkZWNvcmF0b3IsIGNhbGwgdGhlIHdyYXBwZWQgbWV0aG9kLlxuICAgIHRhcmdldC5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzID0gZnVuY3Rpb24gKG5leHRQcm9wcykge1xuICAgICAgdmFyIGtleWRvd24gPSBuZXh0UHJvcHMua2V5ZG93bjtcblxuICAgICAgaWYgKF9zaG91bGRUcmlnZ2VyKHRoaXMucHJvcHMsIGtleWRvd24pKSB7XG4gICAgICAgIGlmIChrZXlTZXRzLnNvbWUoZnVuY3Rpb24gKGtleVNldCkge1xuICAgICAgICAgIHJldHVybiBtYXRjaEtleXMoeyBrZXlTZXQ6IGtleVNldCwgZXZlbnQ6IGtleWRvd24uZXZlbnQgfSk7XG4gICAgICAgIH0pKSB7XG4gICAgICAgICAgcmV0dXJuIGZuLmNhbGwodGhpcywga2V5ZG93bi5ldmVudCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuID4gMSA/IF9sZW4gLSAxIDogMCksIF9rZXkgPSAxOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICAgIGFyZ3NbX2tleSAtIDFdID0gYXJndW1lbnRzW19rZXldO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcykgcmV0dXJuIGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMuY2FsbC5hcHBseShjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzLCBbdGhpcywgbmV4dFByb3BzXS5jb25jYXQoYXJncykpO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gZGVzY3JpcHRvcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgbWV0aG9kV3JhcHBlclNjb3BlZDtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL21ldGhvZF9kZWNvcmF0b3Jfc2NvcGVkLmpzXG4vLyBtb2R1bGUgaWQgPSA1NThcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gcG9seWZpbGwgYXJyYXkuZnJvbSAobWFpbmx5IGZvciBJRSlcbmltcG9ydCAnLi9saWIvYXJyYXkuZnJvbSc7XG5cbi8vIEBrZXlkb3duIGFuZCBAa2V5ZG93blNjb3BlZFxuZXhwb3J0IHsgZGVmYXVsdCwga2V5ZG93blNjb3BlZCB9IGZyb20gJy4vZGVjb3JhdG9ycyc7XG5cbi8vIHNldEJpbmRpbmcgLSBvbmx5IHVzZWZ1bCBpZiB5b3UncmUgbm90IGdvaW5nIHRvIHVzZSBkZWNvcmF0b3JzXG5leHBvcnQgeyBzZXRCaW5kaW5nIH0gZnJvbSAnLi9zdG9yZSc7XG5cbi8vIEtleXMgLSB1c2UgdGhpcyB0byBmaW5kIGtleSBjb2RlcyBmb3Igc3RyaW5ncy4gZm9yIGV4YW1wbGU6IEtleXMuaiwgS2V5cy5lbnRlclxuZXhwb3J0IHsgZGVmYXVsdCBhcyBLZXlzIH0gZnJvbSAnLi9saWIva2V5cyc7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvaW5kZXguanNcbi8vIG1vZHVsZSBpZCA9IDU1OVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBQcm9kdWN0aW9uIHN0ZXBzIG9mIEVDTUEtMjYyLCBFZGl0aW9uIDYsIDIyLjEuMi4xXG4vLyBTZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvZnJvbVxuaWYgKCFBcnJheS5mcm9tKSB7XG4gIEFycmF5LmZyb20gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgICB2YXIgaXNDYWxsYWJsZSA9IGZ1bmN0aW9uIGlzQ2FsbGFibGUoZm4pIHtcbiAgICAgIHJldHVybiB0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicgfHwgdG9TdHIuY2FsbChmbikgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gICAgfTtcbiAgICB2YXIgdG9JbnRlZ2VyID0gZnVuY3Rpb24gdG9JbnRlZ2VyKHZhbHVlKSB7XG4gICAgICB2YXIgbnVtYmVyID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmIChpc05hTihudW1iZXIpKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuICAgICAgaWYgKG51bWJlciA9PT0gMCB8fCAhaXNGaW5pdGUobnVtYmVyKSkge1xuICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIChudW1iZXIgPiAwID8gMSA6IC0xKSAqIE1hdGguZmxvb3IoTWF0aC5hYnMobnVtYmVyKSk7XG4gICAgfTtcbiAgICB2YXIgbWF4U2FmZUludGVnZXIgPSBNYXRoLnBvdygyLCA1MykgLSAxO1xuICAgIHZhciB0b0xlbmd0aCA9IGZ1bmN0aW9uIHRvTGVuZ3RoKHZhbHVlKSB7XG4gICAgICB2YXIgbGVuID0gdG9JbnRlZ2VyKHZhbHVlKTtcbiAgICAgIHJldHVybiBNYXRoLm1pbihNYXRoLm1heChsZW4sIDApLCBtYXhTYWZlSW50ZWdlcik7XG4gICAgfTtcblxuICAgIC8vIFRoZSBsZW5ndGggcHJvcGVydHkgb2YgdGhlIGZyb20gbWV0aG9kIGlzIDEuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGZyb20oYXJyYXlMaWtlIC8qLCBtYXBGbiwgdGhpc0FyZyAqLykge1xuICAgICAgLy8gMS4gTGV0IEMgYmUgdGhlIHRoaXMgdmFsdWUuXG4gICAgICB2YXIgQyA9IHRoaXM7XG5cbiAgICAgIC8vIDIuIExldCBpdGVtcyBiZSBUb09iamVjdChhcnJheUxpa2UpLlxuICAgICAgdmFyIGl0ZW1zID0gT2JqZWN0KGFycmF5TGlrZSk7XG5cbiAgICAgIC8vIDMuIFJldHVybklmQWJydXB0KGl0ZW1zKS5cbiAgICAgIGlmIChhcnJheUxpa2UgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQXJyYXkuZnJvbSByZXF1aXJlcyBhbiBhcnJheS1saWtlIG9iamVjdCAtIG5vdCBudWxsIG9yIHVuZGVmaW5lZFwiKTtcbiAgICAgIH1cblxuICAgICAgLy8gNC4gSWYgbWFwZm4gaXMgdW5kZWZpbmVkLCB0aGVuIGxldCBtYXBwaW5nIGJlIGZhbHNlLlxuICAgICAgdmFyIG1hcEZuID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB2b2lkIHVuZGVmaW5lZDtcbiAgICAgIHZhciBUO1xuICAgICAgaWYgKHR5cGVvZiBtYXBGbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gNS4gZWxzZVxuICAgICAgICAvLyA1LiBhIElmIElzQ2FsbGFibGUobWFwZm4pIGlzIGZhbHNlLCB0aHJvdyBhIFR5cGVFcnJvciBleGNlcHRpb24uXG4gICAgICAgIGlmICghaXNDYWxsYWJsZShtYXBGbikpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheS5mcm9tOiB3aGVuIHByb3ZpZGVkLCB0aGUgc2Vjb25kIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNS4gYi4gSWYgdGhpc0FyZyB3YXMgc3VwcGxpZWQsIGxldCBUIGJlIHRoaXNBcmc7IGVsc2UgbGV0IFQgYmUgdW5kZWZpbmVkLlxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICBUID0gYXJndW1lbnRzWzJdO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIDEwLiBMZXQgbGVuVmFsdWUgYmUgR2V0KGl0ZW1zLCBcImxlbmd0aFwiKS5cbiAgICAgIC8vIDExLiBMZXQgbGVuIGJlIFRvTGVuZ3RoKGxlblZhbHVlKS5cbiAgICAgIHZhciBsZW4gPSB0b0xlbmd0aChpdGVtcy5sZW5ndGgpO1xuXG4gICAgICAvLyAxMy4gSWYgSXNDb25zdHJ1Y3RvcihDKSBpcyB0cnVlLCB0aGVuXG4gICAgICAvLyAxMy4gYS4gTGV0IEEgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0NvbnN0cnVjdF1dIGludGVybmFsIG1ldGhvZCBcbiAgICAgIC8vIG9mIEMgd2l0aCBhbiBhcmd1bWVudCBsaXN0IGNvbnRhaW5pbmcgdGhlIHNpbmdsZSBpdGVtIGxlbi5cbiAgICAgIC8vIDE0LiBhLiBFbHNlLCBMZXQgQSBiZSBBcnJheUNyZWF0ZShsZW4pLlxuICAgICAgdmFyIEEgPSBpc0NhbGxhYmxlKEMpID8gT2JqZWN0KG5ldyBDKGxlbikpIDogbmV3IEFycmF5KGxlbik7XG5cbiAgICAgIC8vIDE2LiBMZXQgayBiZSAwLlxuICAgICAgdmFyIGsgPSAwO1xuICAgICAgLy8gMTcuIFJlcGVhdCwgd2hpbGUgayA8IGxlbuKApiAoYWxzbyBzdGVwcyBhIC0gaClcbiAgICAgIHZhciBrVmFsdWU7XG4gICAgICB3aGlsZSAoayA8IGxlbikge1xuICAgICAgICBrVmFsdWUgPSBpdGVtc1trXTtcbiAgICAgICAgaWYgKG1hcEZuKSB7XG4gICAgICAgICAgQVtrXSA9IHR5cGVvZiBUID09PSAndW5kZWZpbmVkJyA/IG1hcEZuKGtWYWx1ZSwgaykgOiBtYXBGbi5jYWxsKFQsIGtWYWx1ZSwgayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgQVtrXSA9IGtWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBrICs9IDE7XG4gICAgICB9XG4gICAgICAvLyAxOC4gTGV0IHB1dFN0YXR1cyBiZSBQdXQoQSwgXCJsZW5ndGhcIiwgbGVuLCB0cnVlKS5cbiAgICAgIEEubGVuZ3RoID0gbGVuO1xuICAgICAgLy8gMjAuIFJldHVybiBBLlxuICAgICAgcmV0dXJuIEE7XG4gICAgfTtcbiAgfSgpO1xufVxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9hcnJheS5mcm9tLmpzXG4vLyBtb2R1bGUgaWQgPSA1NjBcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBAbW9kdWxlIGRvbUhlbHBlcnNcbiAqXG4gKi9cbmltcG9ydCBSZWFjdERPTSBmcm9tICdyZWFjdC1kb20nO1xuXG52YXIgZm9jdXNhYmxlU2VsZWN0b3IgPSAnYVtocmVmXSwgYnV0dG9uLCBpbnB1dCwgb2JqZWN0LCBzZWxlY3QsIHRleHRhcmVhLCBbdGFiaW5kZXhdJztcblxuLyoqXG4gKiBiaW5kRm9jdXNhYmxlczogRmluZCBhbnkgZm9jdXNhYmxlIGNoaWxkIGVsZW1lbnRzIG9mIHRoZSBjb21wb25lbnQgaW5zdGFuY2UgYW5kXG4gKiBhZGQgYW4gb25Gb2N1cyBoYW5kbGVyIHRvIGZvY3VzIG91ciBrZXlkb3duIGhhbmRsZXJzIG9uIHRoZSBwYXJlbnQgY29tcG9uZW50XG4gKiB3aGVuIHVzZXIga2V5cyBhcHBsaWVzIGZvY3VzIHRvIHRoZSBlbGVtZW50LlxuICpcbiAqIE5PVEU6IE9uZSBsaW1pdGF0aW9uIG9mIHRoaXMgcmlnaHQgbm93IGlzIHRoYXQgaWYgeW91IHRhYiBvdXQgb2YgdGhlXG4gKiBjb21wb25lbnQsIF9mb2N1c2VkSW5zdGFuY2Ugd2lsbCBzdGlsbCBiZSBzZXQgdW50aWwgbmV4dCBjbGljayBvciBtb3VudCBvclxuICogY29udHJvbGxlZCBmb2N1cy5cbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIFRoZSBrZXktYm91bmQgY29tcG9uZW50IGluc3RhbmNlXG4gKiBAcGFyYW0ge2NhbGxiYWNrfSBhY3RpdmF0ZU9uRm9jdXMgVGhlIGZuIHRvIGZpcmUgd2hlbiBlbGVtZW50IGlzIGZvY3VzZWRcbiAqL1xuZnVuY3Rpb24gYmluZEZvY3VzYWJsZXMoaW5zdGFuY2UsIGFjdGl2YXRlT25Gb2N1cykge1xuICBpZiAoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCkge1xuICAgIHZhciBub2RlID0gUmVhY3RET00uZmluZERPTU5vZGUoaW5zdGFuY2UpO1xuICAgIGlmIChub2RlKSB7XG4gICAgICB2YXIgZm9jdXNhYmxlcyA9IG5vZGUucXVlcnlTZWxlY3RvckFsbChmb2N1c2FibGVTZWxlY3Rvcik7XG4gICAgICBpZiAoZm9jdXNhYmxlcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG9uRm9jdXMgPSBmdW5jdGlvbiBvbkZvY3VzKGVsZW1lbnQpIHtcbiAgICAgICAgICB2YXIgb25Gb2N1c1ByZXYgPSBlbGVtZW50Lm9uZm9jdXM7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgYWN0aXZhdGVPbkZvY3VzKGluc3RhbmNlKTtcbiAgICAgICAgICAgIGlmIChvbkZvY3VzUHJldikgb25Gb2N1c1ByZXYuY2FsbChlbGVtZW50LCBldmVudCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZm9jdXNhYmxlcykuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBlbGVtZW50Lm9uZm9jdXMgPSBvbkZvY3VzKGVsZW1lbnQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBmaW5kQ29udGFpbmVyTm9kZXM6IENhbGxlZCBieSBvdXIgY2xpY2sgaGFuZGxlciB0byBmaW5kIGluc3RhbmNlcyB3aXRoIG5vZGVzXG4gKiB0aGF0IGFyZSBlcXVhbCB0byBvciB0aGF0IGNvbnRhaW4gdGhlIGNsaWNrIHRhcmdldC4gQW55IHRoYXQgcGFzcyB0aGlzIHRlc3RcbiAqIHdpbGwgYmUgcmVjaXBpZW50cyBvZiB0aGUgbmV4dCBrZXlkb3duIGV2ZW50LlxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IFRoZSBjbGljayBldmVudC50YXJnZXQgRE9NIGVsZW1lbnRcbiAqIEByZXR1cm4ge2Z1bmN0aW9ufSBSZWR1Y2VyIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGZpbmRDb250YWluZXJOb2Rlcyh0YXJnZXQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChtZW1vLCBpbnN0YW5jZSkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgbm9kZSA9IFJlYWN0RE9NLmZpbmRET01Ob2RlKGluc3RhbmNlKTtcbiAgICAgIGlmIChub2RlICYmIChub2RlID09PSB0YXJnZXQgfHwgbm9kZS5jb250YWlucyh0YXJnZXQpKSkge1xuICAgICAgICBtZW1vLnB1c2goeyBpbnN0YW5jZTogaW5zdGFuY2UsIG5vZGU6IG5vZGUgfSk7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBzb3J0QnlET01Qb3NpdGlvbjogQ2FsbGVkIGJ5IG91ciBjbGljayBoYW5kbGVyIHRvIHNvcnQgYSBsaXN0IG9mIGluc3RhbmNlc1xuICogYWNjb3JkaW5nIHRvIGxlYXN0IC0+IG1vc3QgbmVzdGVkLiBUaGlzIGlzIHNvIHRoYXQgaWYgbXVsdGlwbGUga2V5Ym91bmRcbiAqIGluc3RhbmNlcyBoYXZlIG5vZGVzIHRoYXQgYXJlIGFuY2VzdG9ycyBvZiB0aGUgY2xpY2sgdGFyZ2V0LCB0aGV5IHdpbGwgYmVcbiAqIHNvcnRlZCB0byBsZXQgdGhlIGluc3RhbmNlIGNsb3Nlc3QgdG8gdGhlIGNsaWNrIHRhcmdldCBnZXQgZmlyc3QgZGlicyBvbiB0aGVcbiAqIG5leHQga2V5IGRvd24gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIHNvcnRCeURPTVBvc2l0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEubm9kZS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbihiLm5vZGUpID09PSAxMCA/IDEgOiAtMTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgeyBiaW5kRm9jdXNhYmxlczogYmluZEZvY3VzYWJsZXMsIGZpbmRDb250YWluZXJOb2RlczogZmluZENvbnRhaW5lck5vZGVzLCBzb3J0QnlET01Qb3NpdGlvbjogc29ydEJ5RE9NUG9zaXRpb24gfTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvZG9tX2hlbHBlcnMuanNcbi8vIG1vZHVsZSBpZCA9IDU2MVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIEBtb2R1bGUgTGlzdGVuZXJzXG4gKlxuICovXG5cbi8vIGZsYWcgZm9yIHdoZXRoZXIgY2xpY2sgbGlzdGVuZXIgaGFzIGJlZW4gYm91bmQgdG8gZG9jdW1lbnRcbnZhciBfY2xpY2tzQm91bmQgPSBmYWxzZTtcblxuLy8gZmxhZyBmb3Igd2hldGhlciBrZXlkb3duIGxpc3RlbmVyIGhhcyBiZWVuIGJvdW5kIHRvIGRvY3VtZW50XG52YXIgX2tleXNCb3VuZCA9IGZhbHNlO1xuXG52YXIgTGlzdGVuZXJzID0ge1xuICAvKipcbiAgICogX2JpbmRLZXlzXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqL1xuICBiaW5kS2V5czogZnVuY3Rpb24gYmluZEtleXMoY2FsbGJhY2spIHtcbiAgICBpZiAoIV9rZXlzQm91bmQpIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBjYWxsYmFjayk7XG4gICAgICBfa2V5c0JvdW5kID0gdHJ1ZTtcbiAgICB9XG4gIH0sXG5cblxuICAvKipcbiAgICogdW5iaW5kS2V5c1xuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKi9cbiAgdW5iaW5kS2V5czogZnVuY3Rpb24gdW5iaW5kS2V5cyhjYWxsYmFjaykge1xuICAgIGlmIChfa2V5c0JvdW5kKSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgY2FsbGJhY2spO1xuICAgICAgX2tleXNCb3VuZCA9IGZhbHNlO1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiBiaW5kQ2xpY2tzXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqL1xuICBiaW5kQ2xpY2tzOiBmdW5jdGlvbiBiaW5kQ2xpY2tzKGNhbGxiYWNrKSB7XG4gICAgaWYgKCFfY2xpY2tzQm91bmQpIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2FsbGJhY2spO1xuICAgICAgX2NsaWNrc0JvdW5kID0gdHJ1ZTtcbiAgICB9XG4gIH0sXG5cblxuICAvKipcbiAgICogdW5iaW5kQ2xpY2tzXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqL1xuICB1bmJpbmRDbGlja3M6IGZ1bmN0aW9uIHVuYmluZENsaWNrcyhjYWxsYmFjaykge1xuICAgIGlmIChfY2xpY2tzQm91bmQpIHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2FsbGJhY2spO1xuICAgICAgX2NsaWNrc0JvdW5kID0gZmFsc2U7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBMaXN0ZW5lcnM7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2xpc3RlbmVycy5qc1xuLy8gbW9kdWxlIGlkID0gNTYyXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIENvdW50ZXIgYmVpbmcgaW5jcmVtZW50ZWQuIEpTIGlzIHNpbmdsZS10aHJlYWRlZCwgc28gaXQnbGwgSnVzdCBXb3Jr4oSiLlxudmFyIF9fY291bnRlciA9IDE7XG5cbi8qKlxuICogUmV0dXJucyBhIHByb2Nlc3Mtd2lkZSB1bmlxdWUgaWRlbnRpZmllci5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdXVpZCgpIHtcbiAgcmV0dXJuIFwidWlkLVwiICsgX19jb3VudGVyKys7XG59XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL3V1aWQuanNcbi8vIG1vZHVsZSBpZCA9IDU2M1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJcbi8qKlxuICogV2hlbiBzb3VyY2UgbWFwcyBhcmUgZW5hYmxlZCwgYHN0eWxlLWxvYWRlcmAgdXNlcyBhIGxpbmsgZWxlbWVudCB3aXRoIGEgZGF0YS11cmkgdG9cbiAqIGVtYmVkIHRoZSBjc3Mgb24gdGhlIHBhZ2UuIFRoaXMgYnJlYWtzIGFsbCByZWxhdGl2ZSB1cmxzIGJlY2F1c2Ugbm93IHRoZXkgYXJlIHJlbGF0aXZlIHRvIGFcbiAqIGJ1bmRsZSBpbnN0ZWFkIG9mIHRoZSBjdXJyZW50IHBhZ2UuXG4gKlxuICogT25lIHNvbHV0aW9uIGlzIHRvIG9ubHkgdXNlIGZ1bGwgdXJscywgYnV0IHRoYXQgbWF5IGJlIGltcG9zc2libGUuXG4gKlxuICogSW5zdGVhZCwgdGhpcyBmdW5jdGlvbiBcImZpeGVzXCIgdGhlIHJlbGF0aXZlIHVybHMgdG8gYmUgYWJzb2x1dGUgYWNjb3JkaW5nIHRvIHRoZSBjdXJyZW50IHBhZ2UgbG9jYXRpb24uXG4gKlxuICogQSBydWRpbWVudGFyeSB0ZXN0IHN1aXRlIGlzIGxvY2F0ZWQgYXQgYHRlc3QvZml4VXJscy5qc2AgYW5kIGNhbiBiZSBydW4gdmlhIHRoZSBgbnBtIHRlc3RgIGNvbW1hbmQuXG4gKlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNzcykge1xuICAvLyBnZXQgY3VycmVudCBsb2NhdGlvblxuICB2YXIgbG9jYXRpb24gPSB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvdy5sb2NhdGlvbjtcblxuICBpZiAoIWxvY2F0aW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiZml4VXJscyByZXF1aXJlcyB3aW5kb3cubG9jYXRpb25cIik7XG4gIH1cblxuXHQvLyBibGFuayBvciBudWxsP1xuXHRpZiAoIWNzcyB8fCB0eXBlb2YgY3NzICE9PSBcInN0cmluZ1wiKSB7XG5cdCAgcmV0dXJuIGNzcztcbiAgfVxuXG4gIHZhciBiYXNlVXJsID0gbG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2NhdGlvbi5ob3N0O1xuICB2YXIgY3VycmVudERpciA9IGJhc2VVcmwgKyBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC9bXlxcL10qJC8sIFwiL1wiKTtcblxuXHQvLyBjb252ZXJ0IGVhY2ggdXJsKC4uLilcblx0Lypcblx0VGhpcyByZWd1bGFyIGV4cHJlc3Npb24gaXMganVzdCBhIHdheSB0byByZWN1cnNpdmVseSBtYXRjaCBicmFja2V0cyB3aXRoaW5cblx0YSBzdHJpbmcuXG5cblx0IC91cmxcXHMqXFwoICA9IE1hdGNoIG9uIHRoZSB3b3JkIFwidXJsXCIgd2l0aCBhbnkgd2hpdGVzcGFjZSBhZnRlciBpdCBhbmQgdGhlbiBhIHBhcmVuc1xuXHQgICAoICA9IFN0YXJ0IGEgY2FwdHVyaW5nIGdyb3VwXG5cdCAgICAgKD86ICA9IFN0YXJ0IGEgbm9uLWNhcHR1cmluZyBncm91cFxuXHQgICAgICAgICBbXikoXSAgPSBNYXRjaCBhbnl0aGluZyB0aGF0IGlzbid0IGEgcGFyZW50aGVzZXNcblx0ICAgICAgICAgfCAgPSBPUlxuXHQgICAgICAgICBcXCggID0gTWF0Y2ggYSBzdGFydCBwYXJlbnRoZXNlc1xuXHQgICAgICAgICAgICAgKD86ICA9IFN0YXJ0IGFub3RoZXIgbm9uLWNhcHR1cmluZyBncm91cHNcblx0ICAgICAgICAgICAgICAgICBbXikoXSsgID0gTWF0Y2ggYW55dGhpbmcgdGhhdCBpc24ndCBhIHBhcmVudGhlc2VzXG5cdCAgICAgICAgICAgICAgICAgfCAgPSBPUlxuXHQgICAgICAgICAgICAgICAgIFxcKCAgPSBNYXRjaCBhIHN0YXJ0IHBhcmVudGhlc2VzXG5cdCAgICAgICAgICAgICAgICAgICAgIFteKShdKiAgPSBNYXRjaCBhbnl0aGluZyB0aGF0IGlzbid0IGEgcGFyZW50aGVzZXNcblx0ICAgICAgICAgICAgICAgICBcXCkgID0gTWF0Y2ggYSBlbmQgcGFyZW50aGVzZXNcblx0ICAgICAgICAgICAgICkgID0gRW5kIEdyb3VwXG4gICAgICAgICAgICAgICpcXCkgPSBNYXRjaCBhbnl0aGluZyBhbmQgdGhlbiBhIGNsb3NlIHBhcmVuc1xuICAgICAgICAgICkgID0gQ2xvc2Ugbm9uLWNhcHR1cmluZyBncm91cFxuICAgICAgICAgICogID0gTWF0Y2ggYW55dGhpbmdcbiAgICAgICApICA9IENsb3NlIGNhcHR1cmluZyBncm91cFxuXHQgXFwpICA9IE1hdGNoIGEgY2xvc2UgcGFyZW5zXG5cblx0IC9naSAgPSBHZXQgYWxsIG1hdGNoZXMsIG5vdCB0aGUgZmlyc3QuICBCZSBjYXNlIGluc2Vuc2l0aXZlLlxuXHQgKi9cblx0dmFyIGZpeGVkQ3NzID0gY3NzLnJlcGxhY2UoL3VybFxccypcXCgoKD86W14pKF18XFwoKD86W14pKF0rfFxcKFteKShdKlxcKSkqXFwpKSopXFwpL2dpLCBmdW5jdGlvbihmdWxsTWF0Y2gsIG9yaWdVcmwpIHtcblx0XHQvLyBzdHJpcCBxdW90ZXMgKGlmIHRoZXkgZXhpc3QpXG5cdFx0dmFyIHVucXVvdGVkT3JpZ1VybCA9IG9yaWdVcmxcblx0XHRcdC50cmltKClcblx0XHRcdC5yZXBsYWNlKC9eXCIoLiopXCIkLywgZnVuY3Rpb24obywgJDEpeyByZXR1cm4gJDE7IH0pXG5cdFx0XHQucmVwbGFjZSgvXicoLiopJyQvLCBmdW5jdGlvbihvLCAkMSl7IHJldHVybiAkMTsgfSk7XG5cblx0XHQvLyBhbHJlYWR5IGEgZnVsbCB1cmw/IG5vIGNoYW5nZVxuXHRcdGlmICgvXigjfGRhdGE6fGh0dHA6XFwvXFwvfGh0dHBzOlxcL1xcL3xmaWxlOlxcL1xcL1xcLykvaS50ZXN0KHVucXVvdGVkT3JpZ1VybCkpIHtcblx0XHQgIHJldHVybiBmdWxsTWF0Y2g7XG5cdFx0fVxuXG5cdFx0Ly8gY29udmVydCB0aGUgdXJsIHRvIGEgZnVsbCB1cmxcblx0XHR2YXIgbmV3VXJsO1xuXG5cdFx0aWYgKHVucXVvdGVkT3JpZ1VybC5pbmRleE9mKFwiLy9cIikgPT09IDApIHtcblx0XHQgIFx0Ly9UT0RPOiBzaG91bGQgd2UgYWRkIHByb3RvY29sP1xuXHRcdFx0bmV3VXJsID0gdW5xdW90ZWRPcmlnVXJsO1xuXHRcdH0gZWxzZSBpZiAodW5xdW90ZWRPcmlnVXJsLmluZGV4T2YoXCIvXCIpID09PSAwKSB7XG5cdFx0XHQvLyBwYXRoIHNob3VsZCBiZSByZWxhdGl2ZSB0byB0aGUgYmFzZSB1cmxcblx0XHRcdG5ld1VybCA9IGJhc2VVcmwgKyB1bnF1b3RlZE9yaWdVcmw7IC8vIGFscmVhZHkgc3RhcnRzIHdpdGggJy8nXG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIHBhdGggc2hvdWxkIGJlIHJlbGF0aXZlIHRvIGN1cnJlbnQgZGlyZWN0b3J5XG5cdFx0XHRuZXdVcmwgPSBjdXJyZW50RGlyICsgdW5xdW90ZWRPcmlnVXJsLnJlcGxhY2UoL15cXC5cXC8vLCBcIlwiKTsgLy8gU3RyaXAgbGVhZGluZyAnLi8nXG5cdFx0fVxuXG5cdFx0Ly8gc2VuZCBiYWNrIHRoZSBmaXhlZCB1cmwoLi4uKVxuXHRcdHJldHVybiBcInVybChcIiArIEpTT04uc3RyaW5naWZ5KG5ld1VybCkgKyBcIilcIjtcblx0fSk7XG5cblx0Ly8gc2VuZCBiYWNrIHRoZSBmaXhlZCBjc3Ncblx0cmV0dXJuIGZpeGVkQ3NzO1xufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9zdHlsZS1sb2FkZXIvZml4VXJscy5qc1xuLy8gbW9kdWxlIGlkID0gODk2XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIHN0eWxlLWxvYWRlcjogQWRkcyBzb21lIGNzcyB0byB0aGUgRE9NIGJ5IGFkZGluZyBhIDxzdHlsZT4gdGFnXG5cbi8vIGxvYWQgdGhlIHN0eWxlc1xudmFyIGNvbnRlbnQgPSByZXF1aXJlKFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL1NwYWNlci5sZXNzXCIpO1xuaWYodHlwZW9mIGNvbnRlbnQgPT09ICdzdHJpbmcnKSBjb250ZW50ID0gW1ttb2R1bGUuaWQsIGNvbnRlbnQsICcnXV07XG4vLyBQcmVwYXJlIGNzc1RyYW5zZm9ybWF0aW9uXG52YXIgdHJhbnNmb3JtO1xuXG52YXIgb3B0aW9ucyA9IHt9XG5vcHRpb25zLnRyYW5zZm9ybSA9IHRyYW5zZm9ybVxuLy8gYWRkIHRoZSBzdHlsZXMgdG8gdGhlIERPTVxudmFyIHVwZGF0ZSA9IHJlcXVpcmUoXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9hZGRTdHlsZXMuanNcIikoY29udGVudCwgb3B0aW9ucyk7XG5pZihjb250ZW50LmxvY2FscykgbW9kdWxlLmV4cG9ydHMgPSBjb250ZW50LmxvY2Fscztcbi8vIEhvdCBNb2R1bGUgUmVwbGFjZW1lbnRcbmlmKG1vZHVsZS5ob3QpIHtcblx0Ly8gV2hlbiB0aGUgc3R5bGVzIGNoYW5nZSwgdXBkYXRlIHRoZSA8c3R5bGU+IHRhZ3Ncblx0aWYoIWNvbnRlbnQubG9jYWxzKSB7XG5cdFx0bW9kdWxlLmhvdC5hY2NlcHQoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vU3BhY2VyLmxlc3NcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbmV3Q29udGVudCA9IHJlcXVpcmUoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vU3BhY2VyLmxlc3NcIik7XG5cdFx0XHRpZih0eXBlb2YgbmV3Q29udGVudCA9PT0gJ3N0cmluZycpIG5ld0NvbnRlbnQgPSBbW21vZHVsZS5pZCwgbmV3Q29udGVudCwgJyddXTtcblx0XHRcdHVwZGF0ZShuZXdDb250ZW50KTtcblx0XHR9KTtcblx0fVxuXHQvLyBXaGVuIHRoZSBtb2R1bGUgaXMgZGlzcG9zZWQsIHJlbW92ZSB0aGUgPHN0eWxlPiB0YWdzXG5cdG1vZHVsZS5ob3QuZGlzcG9zZShmdW5jdGlvbigpIHsgdXBkYXRlKCk7IH0pO1xufVxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2FwcC9TcGFjZXIubGVzc1xuLy8gbW9kdWxlIGlkID0gODk3XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIHN0eWxlLWxvYWRlcjogQWRkcyBzb21lIGNzcyB0byB0aGUgRE9NIGJ5IGFkZGluZyBhIDxzdHlsZT4gdGFnXG5cbi8vIGxvYWQgdGhlIHN0eWxlc1xudmFyIGNvbnRlbnQgPSByZXF1aXJlKFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL3N0eWxlcy5sZXNzXCIpO1xuaWYodHlwZW9mIGNvbnRlbnQgPT09ICdzdHJpbmcnKSBjb250ZW50ID0gW1ttb2R1bGUuaWQsIGNvbnRlbnQsICcnXV07XG4vLyBQcmVwYXJlIGNzc1RyYW5zZm9ybWF0aW9uXG52YXIgdHJhbnNmb3JtO1xuXG52YXIgb3B0aW9ucyA9IHt9XG5vcHRpb25zLnRyYW5zZm9ybSA9IHRyYW5zZm9ybVxuLy8gYWRkIHRoZSBzdHlsZXMgdG8gdGhlIERPTVxudmFyIHVwZGF0ZSA9IHJlcXVpcmUoXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9hZGRTdHlsZXMuanNcIikoY29udGVudCwgb3B0aW9ucyk7XG5pZihjb250ZW50LmxvY2FscykgbW9kdWxlLmV4cG9ydHMgPSBjb250ZW50LmxvY2Fscztcbi8vIEhvdCBNb2R1bGUgUmVwbGFjZW1lbnRcbmlmKG1vZHVsZS5ob3QpIHtcblx0Ly8gV2hlbiB0aGUgc3R5bGVzIGNoYW5nZSwgdXBkYXRlIHRoZSA8c3R5bGU+IHRhZ3Ncblx0aWYoIWNvbnRlbnQubG9jYWxzKSB7XG5cdFx0bW9kdWxlLmhvdC5hY2NlcHQoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vc3R5bGVzLmxlc3NcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbmV3Q29udGVudCA9IHJlcXVpcmUoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vc3R5bGVzLmxlc3NcIik7XG5cdFx0XHRpZih0eXBlb2YgbmV3Q29udGVudCA9PT0gJ3N0cmluZycpIG5ld0NvbnRlbnQgPSBbW21vZHVsZS5pZCwgbmV3Q29udGVudCwgJyddXTtcblx0XHRcdHVwZGF0ZShuZXdDb250ZW50KTtcblx0XHR9KTtcblx0fVxuXHQvLyBXaGVuIHRoZSBtb2R1bGUgaXMgZGlzcG9zZWQsIHJlbW92ZSB0aGUgPHN0eWxlPiB0YWdzXG5cdG1vZHVsZS5ob3QuZGlzcG9zZShmdW5jdGlvbigpIHsgdXBkYXRlKCk7IH0pO1xufVxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2FwcC9zdHlsZXMubGVzc1xuLy8gbW9kdWxlIGlkID0gODk4XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIENvbW1vbiBpbXBvcnRzXG5pbXBvcnQgUmVhY3QgZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgUmVhY3RET00gZnJvbSAncmVhY3QtZG9tJztcblxuLy8gUGFyc2VyXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuLi9pbmRleFwiO1xuXG4vLyBBcHAtc3BlY2lmaWMgaW1wb3J0c1xuaW1wb3J0IFNwZWxsRWRpdG9yIGZyb20gXCIuL1NwZWxsRWRpdG9yLmpzeFwiO1xuXG4vLyBLaWNrIG9mZiBvdXIgdG9wLWxldmVsIGVsZW1lbnRcblJlYWN0RE9NLnJlbmRlcihcbiAgPFNwZWxsRWRpdG9yIC8+LFxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVhY3Qtcm9vdCcpXG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2FwcC9pbmRleC5qc3giLCIvL1xuLy9cdCMgQ29yZSBgcnVsZXNgIC0tIHNpbXBsZSBkYXRhdHlwZXMsIGV0Yy5cbi8vXG4vLyBOT1RFOiBtYW55IG9mIHRoZSBiZWxvdyBhcmUgY3JlYXRlZCBhcyBjdXN0b20gUGF0dGVybiBzdWJjbGFzc2VzIGZvciBkZWJ1Z2dpbmcuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IFRva2VuaXplciBmcm9tIFwiLi4vVG9rZW5pemVyXCI7XG5cbi8vIENyZWF0ZSBgY29yZWAgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcImNvcmVcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy9cbi8vICMjIyBJbnN0YWxsIHN0YW5kYXJkIHJ1bGVzXG4vL1xuXG4vLyBCbG9jayBvZiBgc3RhdGVtZW50c2Agd2l0aCBpbmRlbnRhdGlvbiBmb3IgbmVzdGluZy5cbnBhcnNlci5hZGRSdWxlKFwic3RhdGVtZW50c1wiLCBSdWxlLlN0YXRlbWVudHMpO1xuXG5cblxuXG5cbi8vIEJsYW5rIGxpbmUgcmVwcmVzZW50YXRpb24gaW4gcGFyc2VyIG91dHB1dC5cblJ1bGUuQmxhbmtMaW5lID0gY2xhc3MgYmxhbmtfbGluZSBleHRlbmRzIFJ1bGUge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIFwiXFxuXCI7XG5cdH1cbn1cblxuLy8gT3BlbiBibG9jayByZXByZXNlbnRhdGlvbiBpbiBwYXJzZXIgb3V0cHV0LlxuUnVsZS5PcGVuQmxvY2sgPSBjbGFzcyBvcGVuX2Jsb2NrIGV4dGVuZHMgUnVsZSB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gXCJ7XCI7XG5cdH1cbn1cblxuXG4vLyBDbG9zZSBibG9jayByZXByZXNlbnRhdGlvbiBpbiBwYXJzZXIgb3V0cHV0LlxuUnVsZS5DbG9zZUJsb2NrID0gY2xhc3MgY2xvc2VfYmxvY2sgZXh0ZW5kcyBSdWxlIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiBcIn1cIjtcblx0fVxufVxuXG5cbi8vIFBhcnNlciBlcnJvciByZXByZXNlbnRhdGlvbiBpbiBwYXJzZXIgb3V0cHV0LlxuUnVsZS5QYXJzZUVycm9yID0gY2xhc3MgcGFyc2VfZXJyb3IgZXh0ZW5kcyBSdWxlIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCBtZXNzYWdlID0gdGhpcy5tZXNzYWdlLnNwbGl0KFwiXFxuXCIpLmpvaW4oXCJcXG4vLyBcIik7XG5cdFx0cmV0dXJuIGAvLyBFUlJPUjogJHttZXNzYWdlfWA7XG5cdH1cbn1cblxuXG4vLyBDb21tZW50IHJ1bGUgLS0gbWF0Y2hlcyB0b2tlbnMgb2YgdHlwZSBgVG9rZW5pemVyLkNvbW1lbnRgLlxuUnVsZS5Db21tZW50ID0gY2xhc3MgY29tbWVudCBleHRlbmRzIFJ1bGUge1xuXHQvLyBDb21tZW50cyBhcmUgc3BlY2lhbGx5IG5vZGVzIGluIG91ciB0b2tlbiBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCwgc3RhY2spIHtcblx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbc3RhcnRJbmRleF07XG5cdFx0aWYgKCEodG9rZW4gaW5zdGFuY2VvZiBUb2tlbml6ZXIuQ29tbWVudCkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogdG9rZW4sXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0SW5kZXggKyAxXG5cdFx0fSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIGAvLyR7dGhpcy5tYXRjaGVkLndoaXRlc3BhY2V9JHt0aGlzLm1hdGNoZWQuY29tbWVudH1gO1xuXHR9XG59XG5wYXJzZXIuYWRkUnVsZShcImNvbW1lbnRcIiwgUnVsZS5Db21tZW50KTtcblxuXG4vLyBgd29yZGAgPSBpcyBhIHNpbmdsZSBhbHBoYW51bWVyaWMgd29yZC5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5Xb3JkID0gY2xhc3Mgd29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufTtcblJ1bGUuV29yZC5wcm90b3R5cGUucGF0dGVybiA9IC9eW2Etel1bXFx3XFwtXSokLztcbnBhcnNlci5hZGRSdWxlKFwid29yZFwiLCBSdWxlLldvcmQpO1xuXG5cbi8vIGBpZGVudGlmaWVyYCA9IHZhcmlhYmxlcyBvciBwcm9wZXJ0eSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGEgbG93ZXItY2FzZSBsZXR0ZXIgKD8pXG4vLyBOT1RFOiBXZSBibGFja2xpc3QgYSBsb3Qgb2Ygd29yZHMgYXMgaWRlbnRpZmllcnMuXG5SdWxlLklkZW50aWZpZXIgPSBjbGFzcyBpZGVudGlmaWVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59O1xuUnVsZS5JZGVudGlmaWVyLnByb3RvdHlwZS5wYXR0ZXJuID0gL15bYS16XVtcXHdcXC1dKiQvO1xubGV0IGlkZW50aWZpZXIgPSBwYXJzZXIuYWRkUnVsZShbXCJpZGVudGlmaWVyXCIsIFwiZXhwcmVzc2lvblwiXSwgUnVsZS5JZGVudGlmaWVyKTtcblxuLy8gQWRkIEVuZ2xpc2ggcHJlcG9zaXRpb25zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy9cbi8vIFdpa2lwZWRpYSBcIlByZXBvc2l0aW9uXCI6XG4vL1x0XCJQcmVwb3NpdGlvbnMuLi5hcmUgYSBjbGFzcyBvZiB3b3JkcyB0aGF0XG4vL1x0ZXhwcmVzcyBzcGF0aWFsIG9yIHRlbXBvcmFsIHJlbGF0aW9ucyAgKGluLCB1bmRlciwgdG93YXJkcywgYmVmb3JlKVxuLy9cdG9yIG1hcmsgdmFyaW91cyBzZW1hbnRpYyByb2xlcyAob2YsIGZvcikuXG4vLyBURVNUTUVcbmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYWJvdXRcIiwgXCJhYm92ZVwiLCBcImFmdGVyXCIsIFwiYW5kXCIsIFwiYXNcIiwgXCJhdFwiLFxuXHRcImJlZm9yZVwiLCBcImJlaGluZFwiLCBcImJlbG93XCIsIFwiYmVuZWF0aFwiLCBcImJlc2lkZVwiLCBcImJldHdlZW5cIiwgXCJiZXlvbmRcIiwgXCJieVwiLFxuXHRcImRlZmluZWRcIiwgXCJkb3duXCIsIFwiZHVyaW5nXCIsXG5cdFwiZWFjaFwiLCBcImVtcHR5XCIsIFwiZXhhY3RseVwiLCBcImV4Y2VwdFwiLFxuXHRcImZvclwiLCBcImZyb21cIixcblx0XCJncmVhdGVyXCIsXG5cdFwiSVwiLCBcImluXCIsIFwiaW50b1wiLFxuXHRcImxlc3NcIiwgXCJsb25nXCIsXG5cdFwibWVcIiwgXCJtaW51c1wiLCBcIm1vcmVcIixcblx0XCJuZWFyXCIsIFwibm90XCIsXG5cdFwib2ZcIiwgXCJvZmZcIiwgXCJvblwiLCBcIm9udG9cIiwgXCJvcHBvc2l0ZVwiLCBcIm9yXCIsIFwib3V0XCIsIFwib3V0c2lkZVwiLCBcIm92ZXJcIixcblx0XCJzaG9ydFwiLCBcInNpbmNlXCIsXG5cdFwidGhhblwiLCBcInRoZVwiLCBcInRoZW5cIiwgXCJ0aHJvdWdoXCIsIFwidGhydVwiLCBcInRvXCIsIFwidG93YXJkXCIsIFwidG93YXJkc1wiLFxuXHRcInVuZGVmaW5lZFwiLCBcInVuZGVyXCIsIFwidW5kZXJuZWF0aFwiLCBcInVuaXF1ZVwiLCBcInVudGlsXCIsIFwidXBcIiwgXCJ1cG9uXCIsIFwidXBzaWRlXCIsXG5cdFwidmVyc3VzXCIsIFwidnNcIixcblx0XCJ3aGVyZVwiLCBcIndpdGhcIiwgXCJ3aXRoaW5cIiwgXCJ3aXRob3V0XCIsXG4pO1xuXG4vLyBBZGQgY29tbW9uIGVuZ2xpc2ggdmVyYnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFyZVwiLFxuXHRcImRvXCIsIFwiZG9lc1wiLFxuXHRcImNvbnRhaW5zXCIsXG5cdFwiaGFzXCIsIFwiaGF2ZVwiLFxuXHRcImlzXCIsXG5cdFwicmVwZWF0XCIsXG5cdFwid2FzXCIsIFwid2VyZVwiXG4pO1xuXG4vLyBBZGQgc3BlY2lhbCBjb250cm9sIGtleXdvcmRzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJlbHNlXCIsXG5cdFwiaWZcIixcblx0XCJvdGhlcndpc2VcIixcblx0XCJ3aGlsZVwiXG4pO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLlR5cGUgPSBjbGFzcyB0eXBlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IHR5cGUgPSB0aGlzLm1hdGNoZWQ7XG5cdFx0c3dpdGNoKHR5cGUpIHtcblx0XHRcdC8vIHNwZWNpYWwgY2FzZSB0byB0YWtlIHRoZSBmb2xsb3dpbmcgYXMgbG93ZXJjYXNlXG5cdFx0XHRjYXNlIFwidGV4dFwiOlx0XHRyZXR1cm4gXCJTdHJpbmdcIjtcblx0XHRcdGNhc2UgXCJjaGFyYWN0ZXJcIjpcdHJldHVybiBcIkNoYXJhY3RlclwiO1xuXHRcdFx0Y2FzZSBcIm51bWJlclwiOlx0XHRyZXR1cm4gXCJOdW1iZXJcIjtcblx0XHRcdGNhc2UgXCJpbnRlZ2VyXCI6XHRcdHJldHVybiBcIkludGVnZXJcIjtcblx0XHRcdGNhc2UgXCJkZWNpbWFsXCI6XHRcdHJldHVybiBcIkRlY2ltYWxcIjtcblx0XHRcdGNhc2UgXCJib29sZWFuXCI6XHRcdHJldHVybiBcIkJvb2xlYW5cIjtcblx0XHRcdGNhc2UgXCJvYmplY3RcIjpcdFx0cmV0dXJuIFwiT2JqZWN0XCI7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gdHlwZS5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHRcdH1cblx0fVxufTtcblJ1bGUuVHlwZS5wcm90b3R5cGUucGF0dGVybiA9IC8oW0EtWl1bXFx3XFwtXSp8dGV4dHxudW1iZXJ8aW50ZWdlcnxkZWNpbWFsfGNoYXJhY3Rlcnxib29sZWFufG9iamVjdCkvO1xubGV0IHR5cGUgPSBwYXJzZXIuYWRkUnVsZShbXCJ0eXBlXCIsIFwiZXhwcmVzc2lvblwiXSwgUnVsZS5UeXBlKTtcbnR5cGUuYWRkVG9CbGFja2xpc3QoXCJJXCIpO1xuXG5cblxuLy8gYG51bWJlcmAgYXMgZWl0aGVyIGZsb2F0IG9yIGludGVnZXIsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHlvdSBjYW4gYWxzbyB1c2UgYG9uZWAuLi5gdGVuYCBhcyBzdHJpbmdzLidcbi8vIFRPRE86ICBgaW50ZWdlcmAgYW5kIGBkZWNpbWFsYD8gIHRvbyB0ZWNoeT9cblJ1bGUuTnVtYmVyID0gY2xhc3MgbnVtYmVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Ly8gU3BlY2lhbCB3b3JkcyB5b3UgY2FuIHVzZSBhcyBudW1iZXJzLi4uXG5cdHN0YXRpYyBOVU1CRVJfTkFNRVMgPSB7XG5cdFx0emVybzogMCxcblx0XHRvbmU6IDEsXG5cdFx0dHdvOiAyLFxuXHRcdHRocmVlOiAzLFxuXHRcdGZvdXI6IDQsXG5cdFx0Zml2ZTogNSxcblx0XHRzaXg6IDYsXG5cdFx0c2V2ZW46IDcsXG5cdFx0ZWlnaHQ6IDgsXG5cdFx0bmluZTogOSxcblx0XHR0ZW46IDEwXG5cdH1cblxuXHQvLyBOdW1iZXJzIGdldCBlbmNvZGVkIGFzIG51bWJlcnMgaW4gdGhlIHRva2VuIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IHRva2VuID0gdG9rZW5zW3N0YXJ0SW5kZXhdO1xuXHRcdC8vIGlmIGEgc3RyaW5nLCBhdHRlbXB0IHRvIHJ1biB0aHJvdWdoIG91ciBOVU1CRVJfTkFNRVNcblx0XHRpZiAodHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiKSB0b2tlbiA9IFJ1bGUuTnVtYmVyLk5VTUJFUl9OQU1FU1t0b2tlbl07XG5cdFx0aWYgKHR5cGVvZiB0b2tlbiAhPT0gXCJudW1iZXJcIikgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiB0b2tlbixcblx0XHRcdG5leHRTdGFydDogc3RhcnRJbmRleCArIDFcblx0XHR9KTtcblx0fVxuXG5cdC8vIENvbnZlcnQgdG8gbnVtYmVyIG9uIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkO1xuXHR9XG59O1xuXG5wYXJzZXIuYWRkUnVsZShbXCJudW1iZXJcIiwgXCJleHByZXNzaW9uXCJdLCBSdWxlLk51bWJlcik7XG5cbi8vIEFkZCBudW1iZXIgd29yZHMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwib25lXCIsIFwidHdvXCIsIFwidGhyZWVcIiwgXCJmb3VyXCIsIFwiZml2ZVwiLFxuXHRcInNpeFwiLCBcInNldmVuXCIsIFwiZWlnaHRcIiwgXCJuaW5lXCIsIFwidGVuXCJcbik7XG5cblxuLy8gTGl0ZXJhbCBgdGV4dGAgc3RyaW5nLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBZb3UgY2FuIHVzZSBlaXRoZXIgc2luZ2xlIG9yIGRvdWJsZSBxdW90ZXMgb24gdGhlIG91dHNpZGUgKGFsdGhvdWdoIGRvdWJsZSBxdW90ZXMgYXJlIHByZWZlcnJlZCkuXG4vLyBSZXR1cm5lZCB2YWx1ZSBoYXMgZW5jbG9zaW5nIHF1b3Rlcy5cblJ1bGUuVGV4dCA9IGNsYXNzIHRleHQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHQvLyBUZXh0IHN0cmluZ3MgZ2V0IGVuY29kZWQgYXMgYHRleHRgIG9iamVjdHMgaW4gdGhlIHRva2VuIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IHRva2VuID0gdG9rZW5zW3N0YXJ0SW5kZXhdO1xuXHRcdGlmICghKHRva2VuIGluc3RhbmNlb2YgVG9rZW5pemVyLlRleHQpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRva2VuLFxuXHRcdFx0bmV4dFN0YXJ0OiBzdGFydEluZGV4ICsgMVxuXHRcdH0pO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucXVvdGVkU3RyaW5nO1xuXHR9XG59O1xucGFyc2VyLmFkZFJ1bGUoW1widGV4dFwiLCBcImV4cHJlc3Npb25cIl0sIFJ1bGUuVGV4dCk7XG5cblxuLy8gQm9vbGVhbiBsaXRlcmFsLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBUT0RPOiBiZXR0ZXIgbmFtZSBmb3IgdGhpcz8/P1xuUnVsZS5Cb29sZWFuID0gY2xhc3MgYm9vbGVhbiBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRzd2l0Y2ggKHRoaXMubWF0Y2hlZCkge1xuXHRcdFx0Y2FzZSBcInRydWVcIjpcblx0XHRcdGNhc2UgXCJ5ZXNcIjpcblx0XHRcdGNhc2UgXCJva1wiOlxuXHRcdFx0Y2FzZSBcInN1Y2Nlc3NcIjpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cbn07XG5SdWxlLkJvb2xlYW4ucHJvdG90eXBlLnBhdHRlcm4gPSAvXih0cnVlfGZhbHNlfHllc3xub3xva3xjYW5jZWx8c3VjY2Vzc3xmYWlsdXJlKSQvO1xucGFyc2VyLmFkZFJ1bGUoW1wiYm9vbGVhblwiLCBcImV4cHJlc3Npb25cIl0sIFJ1bGUuQm9vbGVhbik7XG5cbi8vIEFkZCBib29sZWFuIHRva2VucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vIFRFU1RNRVxuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJ0cnVlXCIsIFwiZmFsc2VcIixcblx0XCJ5ZXNcIiwgXCJub1wiLFxuXHRcIm9rXCIsIFwiY2FuY2VsXCIsXG5cdFwic3VjY2Vzc1wiLCBcImZhaWx1cmVcIlxuKTtcblxuXG4vLyBMaXRlcmFsIGxpc3QgKGFycmF5KSwgZWc6ICBgWzEsMix0cnVlLGZhbHNlIF1gXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsX2xpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdGNsYXNzIGxpdGVyYWxfbGlzdCBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBbJHtsaXN0ID8gbGlzdC5qb2luKFwiLCBcIikgOiBcIlwifV1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBQYXJlbnRoZXNpemVkIGV4cHJlc3Npb25cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwYXJlbnRoZXNpemVkX2V4cHJlc3Npb25cIixcblx0XCJcXFxcKHtleHByZXNzaW9ufVxcXFwpXCIsXG5cdGNsYXNzIHBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkWzFdO1xuXHRcdH1cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgZXhwcmVzc2lvbiA9IHRoaXMucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIGRvbid0IGRvdWJsZSBwYXJlbnMgaWYgbm90IG5lY2Vzc2FyeVxuXHRcdFx0aWYgKHR5cGVvZiBleHByZXNzaW9uID09PSBcInN0cmluZ1wiICYmIGV4cHJlc3Npb24uc3RhcnRzV2l0aChcIihcIikgJiYgZXhwcmVzc2lvbi5lbmRzV2l0aChcIilcIikpIHJldHVybiBleHByZXNzaW9uO1xuXHRcdFx0cmV0dXJuIGAoJHtleHByZXNzaW9ufSlgO1xuXHRcdH1cblx0fVxuKVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCJpbXBvcnQgZ2xvYmFsIGZyb20gXCIuL2dsb2JhbFwiO1xuXG4vLyBSZXR1cm4gdGhlIHBsdXJhbCBvZiBgd29yZGAuXG4vLyBOT1RFOiB0aGlzIGlzIG5vdCB2ZXJ5IGdvb2QgYXQgYWxsISEhXG4vLyBUT0RPOiBleGNlcHRpb25zLCBldGMuXG5leHBvcnQgZnVuY3Rpb24gcGx1cmFsaXplKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQgKyBcInNcIjtcbn1cblxuLy8gUmV0dXJuIHRydWUgaWYgd29yZCBpcyBhIHBsdXJhbC5cbi8vIE5PVEU6IGZvciB3b3JkcyB3aGljaCBhcmUgQk9USCBzaW5ndWxhciBhbmQgcGx1cmFsLCB0aGlzIHdpbGwgcmV0dXJuIHRydWUuXG5leHBvcnQgZnVuY3Rpb24gaXNQbHVyYWwod29yZCkge1xuXHRyZXR1cm4gd29yZCA9PT0gcGx1cmFsaXplKHdvcmQpO1xufVxuXG5cbi8vIFJldHVybiB0aGUgc2luZ3VsYXIgb2YgYHdvcmRgLlxuLy8gTk9URTogdGhpcyBpcyBub3QgdmVyeSBnb29kIGF0IGFsbCEhIVxuLy8gVE9ETzogZXhjZXB0aW9ucywgZXRjLlxuZXhwb3J0IGZ1bmN0aW9uIHNpbmd1bGFyaXplKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQucmVwbGFjZSgvZT9zJC8sIFwiXCIpO1xufVxuXG4vLyBSZXR1cm4gdHJ1ZSBpZiB3b3JkIGlzIGEgc2luZ3VsYXIuXG4vLyBOT1RFOiBmb3Igd29yZHMgd2hpY2ggYXJlIEJPVEggc2luZ3VsYXIgYW5kIHBsdXJhbCwgdGhpcyB3aWxsIHJldHVybiB0cnVlLlxuZXhwb3J0IGZ1bmN0aW9uIGlzU2luZ3VsYXIod29yZCkge1xuXHRyZXR1cm4gd29yZCA9PT0gc2luZ3VsYXJpemUod29yZCk7XG59XG5cblxuLy8gRXhwb3J0IGFsbCBhcyBhIGx1bXBcbmxldCBhbGxFeHBvcnRzID0gey4uLmV4cG9ydHN9O1xuZXhwb3J0IGRlZmF1bHQgYWxsRXhwb3J0cztcblxuLy8gREVCVUc6IHB1dCBvbiBnbG9iYWwgZm9yIGRlYnVnZ2luZy5cbmdsb2JhbC5TVFJJTkcgPSBhbGxFeHBvcnRzO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3V0aWxzL3N0cmluZy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgZGVmaW5pbmcgY2xhc3NlcyAoa25vd24gYXMgYHR5cGVzYClcbi8vXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBUb2tlbml6ZXIgZnJvbSBcIi4uL1Rva2VuaXplclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcblxuLy8gQ3JlYXRlIFwiSlNYXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcIkpTWFwiKTtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gSlNYIGV4cHJlc3Npb24uXG5SdWxlLkpTWCA9IGNsYXNzIGpzeEVsZW1lbnQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHQvLyBUZXh0IHN0cmluZ3MgZ2V0IGVuY29kZWQgYXMgYHRleHRgIG9iamVjdHMgaW4gdGhlIHRva2VuIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IHRva2VuID0gdG9rZW5zW3N0YXJ0SW5kZXhdO1xuXHRcdGlmICghKHRva2VuIGluc3RhbmNlb2YgVG9rZW5pemVyLkpTWEVsZW1lbnQpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRva2VuLFxuXHRcdFx0bmV4dFN0YXJ0OiBzdGFydEluZGV4ICsgMVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gQ29udmVydCBvdXIgYXR0cmlidXRlcyB0byBzb3VyY2UuXG5cdC8vIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgbm8gYXR0cmlidXRlcy5cblx0YXR0cnNUb1NvdXJjZShjb250ZXh0LCBqc3hFbGVtZW50ID0gdGhpcy5tYXRjaGVkKSB7XG5cdFx0bGV0IGF0dHJpYnV0ZXMgPSBqc3hFbGVtZW50LmF0dHJpYnV0ZXM7XG5cdFx0aWYgKCFhdHRyaWJ1dGVzIHx8ICFhdHRyaWJ1dGVzLmxlbmd0aCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBhdHRycyA9IGF0dHJpYnV0ZXMubWFwKCAoeyBuYW1lLCB2YWx1ZSB9KSA9PiB7XG5cdFx0XHQvLyBpZiBOTyB2YWx1ZSwgYXNzdW1lIGl0J3MgYSB2YXJpYWJsZSBvZiB0aGUgc2FtZSBuYW1lXG5cdFx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgdmFsdWUgPSBuYW1lO1xuXHRcdFx0Ly8gaWYgaXQncyBhbiBhcnJheSwgaXQncyBhIHNwZWxsIGV4cHJlc3Npb24sIHBvc3NpYmx5IHdpdGggbmVzdGVkIEpTWCBlbGVtZW50cy4uLlxuXHRcdFx0ZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBUb2tlbml6ZXIuSlNYRXhwcmVzc2lvbikge1xuXHRcdFx0XHR2YWx1ZSA9IHRoaXMuanN4RXhwcmVzc2lvblRvU291cmNlKGNvbnRleHQsIHZhbHVlKTtcblx0XHRcdH1cblx0XHRcdC8vIGVsc2UgaWYgYSBKU1ggZWxlbWVudCwgcmVjdXJzZVxuLy9UT0RPOiBpbmRlbnQuLi5cblx0XHRcdGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgVG9rZW5pemVyLkpTWEVsZW1lbnQpIHtcblx0XHRcdFx0dmFsdWUgPSB2YWx1ZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdH1cblx0XHRcdC8vIE90aGVyd2lzZSBpZiBhIG51bWJlciBvciBUZXh0IGxpdGVyYWwsIGp1c3QgdXNlIGl0XG5cblx0XHRcdC8vIHNwZWNpYWwgY2FzZSBgY2xhc3NgIHRvIGBjbGFzc05hbWVgIGJlY2F1c2UgUmVhY3QgaXMgZWZmaW5nIHBlcnNuaWNrZXR5LlxuXHRcdFx0aWYgKG5hbWUgPT09IFwiY2xhc3NcIikgbmFtZSA9IFwiY2xhc3NOYW1lXCI7XG4vL1RPRE86IGVzY2FwZSBuYW1lcyB3aGljaCBhcmUgaW52YWxpZCBKUyBpZGVudGlmaWVyc1xuXHRcdFx0cmV0dXJuIGAke25hbWV9OiAke3ZhbHVlfWA7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gYHsgJHthdHRycy5qb2luKFwiLCBcIil9IH1gO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGFuIGFycmF5IHdpdGggc291cmNlIGZvciBlYWNoIG9mIG91ciBjaGlsZHJlbi5cblx0Ly8gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiB3ZSBkb24ndCBoYXZlIGFueSBjaGlsZHJlbi5cblx0Y2hpbGRyZW5Ub1NvdXJjZShjb250ZXh0LCBqc3hFbGVtZW50ID0gdGhpcy5tYXRjaGVkKSB7XG5cdFx0bGV0IGNoaWxkcmVuID0ganN4RWxlbWVudC5jaGlsZHJlbjtcblx0XHRpZiAoIWNoaWxkcmVuIHx8IGNoaWxkcmVuLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gY2hpbGRyZW4ubWFwKGNoaWxkID0+IHtcbi8vVE9ETzogZXNjYXBlIGlubmVyIHF1b3Rlcy4uLlxuXHRcdFx0aWYgKHR5cGVvZiBjaGlsZCA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHQvL2ZvcmdldCBpdCBpZiB3aGl0ZXNwYWNlIG9ubHkuLi4gPz8/XG5cdFx0XHRcdGxldCB0ZXh0ID0gY2hpbGQudHJpbSgpO1xuXHRcdFx0XHRpZiAoIXRleHQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRcdHJldHVybiBgXCIke3RleHR9XCJgO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNoaWxkIGluc3RhbmNlb2YgVG9rZW5pemVyLkpTWEVsZW1lbnQpIHtcblx0XHRcdFx0bGV0IGNoaWxkU291cmNlID0gdGhpcy5qc3hFbGVtZW50VG9Tb3VyY2UoY29udGV4dCwgY2hpbGQpO1xuXHRcdFx0XHRyZXR1cm4gY2hpbGRTb3VyY2Uuc3BsaXQoXCJcXG5cIikuam9pbihcIlxcblxcdFwiKTtcblx0XHRcdH1cblx0XHRcdGlmIChjaGlsZCBpbnN0YW5jZW9mIFRva2VuaXplci5KU1hFeHByZXNzaW9uKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmpzeEV4cHJlc3Npb25Ub1NvdXJjZShjb250ZXh0LCBjaGlsZCk7XG5cdFx0XHR9XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJjaGlsZHJlblRvU291cmNlKCk6IGRvbid0IHVuZGVyc3RhbmQgY2hpbGRcIiArICBjaGlsZCk7XG5cdFx0fSlcblx0XHQvLyByZW1vdmUgdW5kZWZpbmVkL2VtcHR5IHN0cmluZyBydWxlc1xuXHRcdC5maWx0ZXIoQm9vbGVhbik7XG5cdH1cblxuXHQvLyBDb252ZXJ0IEpTWCBleHByZXNzaW9uICggYHsuLi59YCApIHRvIEpTIHNvdXJjZS5cblx0anN4RXhwcmVzc2lvblRvU291cmNlKGNvbnRleHQsIGpzeEV4cHJlc3Npb24pIHtcblx0XHRsZXQgdG9rZW5zID0ganN4RXhwcmVzc2lvbi50b2tlbnM7XG5jb25zb2xlLmluZm8oanN4RXhwcmVzc2lvbiwgdG9rZW5zKTtcblx0XHRyZXR1cm4gXCIvXCIgKyBgKlRPRE86ICR7dG9rZW5zLmpvaW4oXCIgXCIpfSpgICsgXCIvXCI7XG5cdH1cblxuXHRqc3hFbGVtZW50VG9Tb3VyY2UoY29udGV4dCwganN4RWxlbWVudCA9IHRoaXMubWF0Y2hlZCkge1xuXHRcdC8vIGdldCB0aGUgYml0cyBvZiB0aGUgb3V0cHV0XG5cdFx0bGV0IHRhZ05hbWUgPSBgXCIke2pzeEVsZW1lbnQudGFnTmFtZX1cImA7XG5cdFx0bGV0IGF0dHJzID0gdGhpcy5hdHRyc1RvU291cmNlKGNvbnRleHQsIGpzeEVsZW1lbnQpO1xuXHRcdGxldCBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW5Ub1NvdXJjZShjb250ZXh0LCBqc3hFbGVtZW50KTtcblxuXHRcdGxldCBvdXRwdXQgPSBgY3JlYXRlRWxlbWVudCgke3RhZ05hbWV9YDtcblx0XHRpZiAoIWF0dHJzICYmIGNoaWxkcmVuKSBhdHRycyA9IFwibnVsbFwiO1xuXG5cdFx0aWYgKGF0dHJzKSBvdXRwdXQgKz0gYCwgJHthdHRyc31gO1xuXHRcdGlmIChjaGlsZHJlbikge1xuXHRcdFx0b3V0cHV0ICs9IFwiLFxcblxcdFwiICsgY2hpbGRyZW4uam9pbihcIixcXG5cXHRcIikgKyBcIlxcblwiO1xuXHRcdH1cblx0XHRvdXRwdXQgKz0gXCIpXCJcblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLmpzeEVsZW1lbnRUb1NvdXJjZShjb250ZXh0LCB0aGlzLm1hdGNoZWQpO1xuXHR9XG59O1xuXG4vLyBEZWZpbmUganN4IGJsb2NrIGFzIGFuIGBleHByZXNzaW9uYCBPUiBhIGBzdGF0ZW1lbnRgLlxucGFyc2VyLmFkZFJ1bGUoW1wianN4XCIsIFwiZXhwcmVzc2lvblwiLCBcInN0YXRlbWVudFwiXSwgUnVsZS5KU1gpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL0pTWC5qcyIsIi8vIEV4cG9ydCBhbGwgc3RhbmRhcmQgXCJlbmdsaXNoXCIgcnVsZXMuXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcblxuLy8gTG9hZCBhbGwgc3RhbmRhcmQgcnVsZXMgZmlsZXMuXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbGlzdHNcIjtcbmltcG9ydCBcIi4vb3BlcmF0b3JzXCI7XG5pbXBvcnQgXCIuL2lmXCI7XG5pbXBvcnQgXCIuL3N0YXRlbWVudHNcIjtcbmltcG9ydCBcIi4vdHlwZXNcIjtcbmltcG9ydCBcIi4vSlNYXCI7XG5cblxuLy8gQ3JlYXRlIHBhcnNlciBmb3IgYWxsLlxuY29uc3QgcGFyc2VyID0gUGFyc2VyLmZvckNvbnRleHQoXCJhbGxcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEFuZCBkZXBlbmQgb24gc3RhbmRhcmQgcnVsZXMgbG9hZGVkIGFib3ZlLlxucGFyc2VyLmltcG9ydChcImNvcmVcIiwgXCJsaXN0c1wiLCBcIm9wZXJhdG9yc1wiLCBcImlmXCIsIFwic3RhdGVtZW50c1wiLCBcInR5cGVzXCIsIFwiSlNYXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2FsbC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgaWYgc3RhdGVtZW50cy5cbi8vXG5cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcblxuLy8gQ3JlYXRlIFwiaWZcIiBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwiaWZcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEltcG9ydCBjb3JlIHJ1bGVzLlxuaW1wb3J0IFwiLi9jb3JlXCI7XG5wYXJzZXIuaW1wb3J0KFwiY29yZVwiKTtcblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiaWZcIixcblx0XCJpZiB7Y29uZGl0aW9uOmV4cHJlc3Npb259ICh0aGVufDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgaWZfIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGNvbmRpdGlvbiwgc3RhdGVtZW50IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGlmICgke2NvbmRpdGlvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0cmV0dXJuIGBpZiAoJHtjb25kaXRpb259KWBcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiYmFja3dhcmRzX2lmXCIsXG5cdFwie3N0YXRlbWVudH0gaWYge2NvbmRpdGlvbjpleHByZXNzaW9ufSAoPzooZWxzZXxvdGhlcndpc2UpIHtlbHNlU3RhdGVtZW50OnN0YXRlbWVudH0pP1wiLFxuXHRjbGFzcyBiYWNrd2FyZHNfaWYgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0bGVmdFJlY3Vyc2l2ZSA9IHRydWU7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgY29uZGl0aW9uLCBzdGF0ZW1lbnQsIGVsc2VTdGF0ZW1lbnQgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGlmIChlbHNlU3RhdGVtZW50KSByZXR1cm4gYGlmICgke2NvbmRpdGlvbn0pIHsgJHtzdGF0ZW1lbnR9IH0gZWxzZSB7ICR7ZWxzZVN0YXRlbWVudH0gfWBcblx0XHRcdHJldHVybiBgaWYgKCR7Y29uZGl0aW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImVsc2VfaWZcIixcblx0XCIoZWxzZXxvdGhlcndpc2UpIGlmIHtjb25kaXRpb246ZXhwcmVzc2lvbn0gKHRoZW58Oikge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGVsc2VfaWYgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgY29uZGl0aW9uLCBzdGF0ZW1lbnQgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTs7XG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGVsc2UgaWYgKCR7Y29uZGl0aW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGVsc2UgaWYgKCR7Y29uZGl0aW9ufSlgXG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImVsc2VcIixcblx0XCIoZWxzZXxvdGhlcndpc2UpIHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBlbHNlXyBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzdGF0ZW1lbnQgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGlmIChzdGF0ZW1lbnQpIHJldHVybiBgZWxzZSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgZWxzZWBcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaWYuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBsaXN0c1xuLy9cblxuLy8gVE9ETzogY29uZmlybSBpZGVudGlmaWVycyBhcmUgcGx1cmFsIGluIHNvbWUgb2YgdGhlIGJlbG93P1xuLy8gVE9ETzogYGxpc3QuY2xvbmUoKWAgdG8gcmV0dXJuIG5ldyBsaXN0IG9mIHNhbWUgdHlwZS5cblxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuXG5pbXBvcnQgeyBpc1BsdXJhbCwgc2luZ3VsYXJpemUgfSBmcm9tIFwiLi4vdXRpbHMvc3RyaW5nXCI7XG5cbi8vIENyZWF0ZSBcImxpc3RzXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcImxpc3RzXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBJbXBvcnQgY29yZSBydWxlcy5cbmltcG9ydCBcIi4vY29yZVwiO1xucGFyc2VyLmltcG9ydChcImNvcmVcIik7XG5cblxuLy8gV09SS0lORyBGUk9NIE9USEVSIFJVTEVTICh0ZXN0bWUpXG4vL1x0YHRoZSBsZW5ndGggb2YgPGxpc3Q+YFxuLy9cdGA8dGhpbmc+IGlzIG5vdD8gaW4gPGxpc3Q+YFxuLy9cdGA8bGlzdD4gaXMgbm90PyBlbXB0eWBcbi8vXHRgc2V0IGl0ZW0gMSBvZiBteUxpc3QgdG8gJ2EnYFxuXG5cbi8vIFRPRE86IFx0YGNyZWF0ZSBsaXN0IHdpdGggPGV4cD4sIDxleHA+LCA8ZXhwPmBcbi8vIFRPRE86XHRgZHVwbGljYXRlIGxpc3RgXG4vLyBUT0RPOlx0YGR1cGxpY2F0ZSBsaXN0IHdpdGggPGV4cD4sIDxleHA+LCA8ZXhwPmAgPz8/XG4vLyBUT0RPOlx0YHRoZSBzaXplIG9mIDxsaXN0PmAgPT4gd2lsbCBtYXAgdG8gYGxpc3Quc2l6ZWAuLi5cbi8vXHRcdFx0XHQtIGluc3RhbGwgYHNpemVgIGFzIGFuIGFsaWFzIHRvIGBsZW5ndGhgP1xuLy8gVE9ETzpcdGBtb3ZlIDx0aGluZz4gdG8gZW5kIG9mIDxsaXN0PmAgPz8/XG4vLyBUT0RPOlx0YFNldGAgZm9yIGEgdW5pcXVlIGxpc3Q/XG4vLyBUT0RPOlx0dHlwZWQgbGlzdD9cbi8vIFRPRE86XHRsaXN0IHdoaWNoIHdvbid0IHRha2UgbnVsbC91bmRlZmluZWRcblxuXG4vLyBSZXR1cm4gdGhlIGxlbmd0aCBvZiB0aGUgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXN0X2xlbmd0aFwiLFxuXHRcInRoZT8gbnVtYmVyIG9mIHtpZGVudGlmaWVyfSBpbiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X2xlbmd0aCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QsIGlkZW50aWZpZXIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcbi8vIFRPRE86IHNwZWNpYWwgY2FzZSAnd29yZHMnLCAnbGluZXMnLCBldGNcblx0XHRcdHJldHVybiBgJHtsaXN0fS5sZW5ndGhgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gUmV0dXJuIHRoZSBmaXJzdCBwb3NpdGlvbiBvZiBzcGVjaWZpZWQgaXRlbSBpbiB0aGUgbGlzdCBhcyBhbiBhcnJheS5cbi8vIElmIGl0ZW0gaXMgbm90IGZvdW5kLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuLy8gTk9URTogdGhpcyBwb3NpdGlvbiByZXR1cm5lZCBpcyAqKjEtYmFzZWQqKi5cbi8vVEVTVE1FXG4vLyBUT0RPOiBgcG9zaXRpb25zYCwgYGxhc3QgcG9zaXRpb25gLCBgYWZ0ZXIuLi5gXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXN0X3Bvc2l0aW9uXCIsXG5cdFwidGhlPyBwb3NpdGlvbiBvZiB7dGhpbmc6ZXhwcmVzc2lvbn0gaW4ge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9wb3NpdGlvbiBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnBvc2l0aW9uT2YoJHt0aGluZ30sICR7bGlzdH0pYFxuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdE9yZGluYWwgbnVtYmVycyAoZmlyc3QsIHNlY29uZCwgbGFzdCwgZXRjKS5cbi8vIFRPRE86IHNpeHR5LWZpZnRoLCB0d28gaHVuZHJlZCBmb3J0eSBuaW50aC4uLlxuLy9cbnBhcnNlci5hZGRSdWxlKFwib3JkaW5hbFwiLCBjbGFzcyBvcmRpbmFsIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXN7fSk7XG5jbGFzcyBvcmRpbmFsIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHt9XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaXJzdFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2Vjb25kXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJ0aGlyZFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAzIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZm91cnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDQgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaWZ0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA1IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2l4dGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNiB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNldmVudGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNyB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImVpZ2h0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA4IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwibmludGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gOSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInRlbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDEwIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwicGVudWx0aW1hdGVcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaW5hbFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAtMSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImxhc3RcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cblxuLy8gdHJlYXQgbGlzdCBhcyBhIHN0YWNrIG9yIHF1ZXVlXG4vL1RFU1RNRVxucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwidG9wXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDEgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJib3R0b21cIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cblxuLy8gSW5kZXggZXhwcmVzc2lvbjogbnVtZXJpYyBwb3NpdGlvbiBpbiBzb21lIGxpc3QuXG4vL1x0ZS5nLlx0YGNhcmQgMSBvZiB0aGUgcGlsZWBcbi8vXHRcdFx0YGNhcmQgIzIgb2YgdGhlIHBpbGVgXG4vL1x0XHRcdGB0aGUgZmlyc3QgY2FyZCBvZiB0aGUgcGlsZWBcbi8vXG4vLyBOT1RFOiBOZWdhdGl2ZSBudW1lcmljIHBvc2l0aW9ucyBjb21lIGZyb20gdGhlIEVORCBvZiB0aGUgbGlzdC5cbi8vXHRlLmcuXHRgY2FyZCAtMSBvZiB0aGUgcGlsZWBcbi8vXG4vLyBOT1RFOiBPdXIgcG9zaXRpb25zIGFyZSAqKjEtYmFzZWQqKiBhbmQgSmF2YXNjcmlwdCBpcyAqKjAtYmFzZWQqKi5cbi8vXHRcdCBlLmcuIGBpdGVtIDEgb2YgdGhlIGFycmF5YCAgPSBgYXJyYXlbMF1gXG4vL1xuLy8gVE9ETzogaWYgYGlkZW50aWZpZXJgIGlzIFwid29yZFwiLCBvdXRwdXQgYGdldFdvcmQoKWAgZXRjXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwb3NpdGlvbl9leHByZXNzaW9uXCIsXG5cdFtcblx0XHRcIntpZGVudGlmaWVyfSB7cG9zaXRpb246ZXhwcmVzc2lvbn0gb2YgKHRoZT8pIHtleHByZXNzaW9ufVwiLFxuXHRcdFwidGhlIHtwb3NpdGlvbjpvcmRpbmFsfSB7aWRlbnRpZmllcn0gb2YgKHRoZT8pIHtleHByZXNzaW9ufVwiXG5cdF0sXG5cdGNsYXNzIHBvc2l0aW9uX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb257XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgcG9zaXRpb24sIGV4cHJlc3Npb24gfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcbi8vIFRPRE86IHNwZWNpYWwgY2FzZSAnd29yZHMnLCAnbGluZXMnLCBldGNcblxuXHRcdFx0Ly8gSWYgd2UgZ290IGEgcG9zaXRpdmUgbnVtYmVyIGxpdGVyYWwsIGNvbXBlbnNhdGUgZm9yIEpTIDAtYmFzZWQgYXJyYXlzIG5vdyxcblx0XHRcdC8vIGZvciBuaWNlciBvdXRwdXQuXG5cdFx0XHRpZiAodHlwZW9mIHBvc2l0aW9uID09PSBcIm51bWJlclwiICYmIHBvc2l0aW9uID4gMCkge1xuXHRcdFx0XHRyZXR1cm4gYCR7ZXhwcmVzc2lvbn1bJHtwb3NpdGlvbiAtIDF9XWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtwb3NpdGlvbn0pYDtcblxuXHQvLyBUaGlzIGlzIHNhZmVyLCBidXQgdXNpbmcgdGhlIGFib3ZlIHNvbWV0aW1lcyBmb3IgZGVtbyBwdXJwb3Nlc1xuXHQvL1x0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtwb3NpdGlvbn0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFBpY2sgYSBTSU5HTEUgcmFuZG9tIGl0ZW0gZnJvbSB0aGUgbGlzdC5cbi8vIFRPRE86IGNvbmZpcm0gaWRlbnRpZmllciBpcyBwbHVyYWw/XG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZG9tX3Bvc2l0aW9uX2V4cHJlc3Npb25cIixcblx0XCJhIHJhbmRvbSB7aWRlbnRpZmllcn0gKG9mfGZyb218aW4pICh0aGUpPyB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5kb21fcG9zaXRpb25fZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5kb21JdGVtT2YoJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gUGljayBhIHVuaXF1ZSBzZXQgb2YgcmFuZG9tIGl0ZW1zIGZyb20gdGhlIGxpc3QsIHJldHVybmluZyBhbiBhcnJheS5cbi8vIFRPRE86IGB0d28gcmFuZG9tIGl0ZW1zLi4uYFxuLy8gVE9ETzogY29uZmlybSBpZGVudGlmaWVyIGlzIHBsdXJhbD9cbi8vIFRPRE86IGBsaXN0LmNsb25lKClgIHRvIHJldHVybiBuZXcgbGlzdCBvZiBzYW1lIHR5cGUuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZG9tX3Bvc2l0aW9uc19leHByZXNzaW9uXCIsXG5cdFwie251bWJlcn0gcmFuZG9tIHtpZGVudGlmaWVyfSAob2Z8ZnJvbXxpbikgKHRoZSk/IHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJhbmRvbV9wb3NpdGlvbnNfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbnVtYmVyLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldFJhbmRvbUl0ZW1zT2YoJHtsaXN0fSwgJHtudW1iZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFJhbmdlIGV4cHJlc3Npb24uXG4vLyBSZXR1cm5zIGEgbmV3IGxpc3QuXG4vLyBOT1RFOiBgc3RhcnRgIGlzICoqMS1iYXNlZCoqLlxuLy8gTk9URTogYGVuZGAgaXMgaW5jbHVzaXZlIVxuLy8gVE9ETzogY29uZmlybSBpZGVudGlmaWVyIGlzIHBsdXJhbD9cbi8vIFRPRE86IGBsaXN0LmNsb25lKClgIHRvIHJldHVybiBuZXcgbGlzdCBvZiBzYW1lIHR5cGUuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZ2VfZXhwcmVzc2lvblwiLFxuXHRcIntpZGVudGlmaWVyfSB7c3RhcnQ6ZXhwcmVzc2lvbn0gdG8ge2VuZDpleHByZXNzaW9ufSBvZiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzdGFydCwgZW5kLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldFJhbmdlKCR7bGlzdH0sICR7c3RhcnR9LCAke2VuZH0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFN0YXJ0aW5nIHJhbmdlIGV4cHJlc3Npb24uXG4vLyBSZXR1cm5zIGEgbmV3IGxpc3QuXG4vLyBlLmcuXHRgZmlyc3QgNCBpdGVtcyBvZiBsaXN0YFxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImZpcnN0X2luX3JhbmdlXCIsXG5cdFwiZmlyc3Qge251bWJlcjpleHByZXNzaW9ufSB7aWRlbnRpZmllcn0gKGlufG9mKSB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBudW1iZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0UmFuZ2UoJHtsaXN0fSwgMSwgJHtudW1iZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBFbmRpbmcgcmFuZ2UgZXhwcmVzc2lvbi5cbi8vIFJldHVybnMgYSBuZXcgbGlzdC5cbi8vIGUuZy5cdGBsYXN0IDQgaXRlbXMgb2YgbGlzdGBcbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsYXN0X2luX3JhbmdlXCIsXG5cdFwibGFzdCB7bnVtYmVyOmV4cHJlc3Npb259IHtpZGVudGlmaWVyfSAoaW58b2YpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJhbmdlX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG51bWJlciwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRFbmRSYW5nZSgke2xpc3R9LCAxLCAke251bWJlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gUmFuZ2UgZXhwcmVzc2lvbiBzdGFydGluZyBhdCBzb21lIGl0ZW0gaW4gdGhlIGxpc3QuXG4vLyBSZXR1cm5zIGEgbmV3IGxpc3QuXG4vLyBJZiBpdGVtIGlzIG5vdCBmb3VuZCwgcmV0dXJucyBhbiBlbXB0eSBsaXN0LiAoPz8/KVxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmdlX2V4cHJlc3Npb25cIixcblx0XCJ7aWRlbnRpZmllcn0gKGlufG9mKSB7bGlzdDpleHByZXNzaW9ufSBzdGFydGluZyB3aXRoIHt0aGluZzpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5nZSgke2xpc3R9LCBzcGVsbC5wb3NpdGlvbk9mKCR7dGhpbmd9LCAke2xpc3R9KSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBMaXN0IGZpbHRlci5cbi8vIE5PVEU6IHdlIHdpbGwgc2luZ3VsYXJpemUgYGlkZW50aWZpZXJgIGFuZCB1c2UgdGhhdCBhcyB0aGUgYXJndW1lbnQgdG8gYGV4cHJlc3Npb25gLlxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpc3RfZmlsdGVyXCIsXG5cdFwie2lkZW50aWZpZXJ9IChpbnxvZikge2xpc3Q6ZXhwcmVzc2lvbn0gd2hlcmUge2NvbmRpdGlvbjpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X2ZpbHRlciBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgY29uZGl0aW9uLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyB1c2Ugc2luZ3VsYXIgb2YgaWRlbnRpZmllciBmb3IgbWV0aG9kIGFyZ3VtZW50XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBzaW5ndWxhcml6ZShpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHRcdHJldHVybiBgc3BlbGwuZmlsdGVyKCR7bGlzdH0sICR7YXJndW1lbnR9ID0+ICR7Y29uZGl0aW9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBTZXQgbWVtYmVyc2hpcC5cbi8vIE5PVEU6IHdlIHdpbGwgc2luZ3VsYXJpemUgYGlkZW50aWZpZXJgIGFuZCB1c2UgdGhhdCBhcyB0aGUgYXJndW1lbnQgdG8gYGV4cHJlc3Npb25gLlxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpc3RfbWVtYmVyc2hpcF90ZXN0XCIsXG5cdFwie2xpc3Q6ZXhwcmVzc2lvbn0gKG9wZXJhdG9yOmhhc3xoYXMgbm98ZG9lc250IGhhdmV8ZG9lcyBub3QgaGF2ZSkge2lkZW50aWZpZXJ9IHdoZXJlIHtmaWx0ZXI6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9tZW1iZXJzaGlwX3Rlc3QgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIG9wZXJhdG9yLCBmaWx0ZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBiYW5nID0gb3BlcmF0b3IgPT09IFwiaGFzXCIgPyBcIlwiIDogXCIhXCI7XG5cdFx0XHQvLyB1c2Ugc2luZ3VsYXIgb2YgaWRlbnRpZmllciBmb3IgbWV0aG9kIGFyZ3VtZW50XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBzaW5ndWxhcml6ZShpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHRcdHJldHVybiBgJHtiYW5nfXNwZWxsLmFueSgke2xpc3R9LCAke2FyZ3VtZW50fSA9PiAke2ZpbHRlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vXG4vL1x0QWRkaW5nIHRvIGxpc3QgKGluLXBsYWNlKVxuLy9cblxuLy8gQWRkIHRvIGVuZCBvZiBsaXN0LlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9hcHBlbmRcIixcblx0W1xuXHRcdFwiYXBwZW5kIHt0aGluZzpleHByZXNzaW9ufSB0byB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRcdFwiYWRkIHt0aGluZzpleHByZXNzaW9ufSB0byAoKHRoZT8pIGVuZCBvZik/IHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdF0sXG5cdGNsYXNzIGxpc3RfYXBwZW5kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmFwcGVuZCgke2xpc3R9LCAke3RoaW5nfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gQWRkIHRvIGJlZ2lubmluZyBvZiBsaXN0LlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9wcmVwZW5kXCIsXG5cdFtcblx0XHRcInByZXBlbmQge3RoaW5nOmV4cHJlc3Npb259IHRvIHtsaXN0OmV4cHJlc3Npb259XCIsXG4vL1widG9wXCIgYXMgc3RhY2sgPT09IGJvdHRvbT9cblx0XHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8gdGhlIChzdGFydHxmcm9udHx0b3ApIG9mIHtsaXN0OmV4cHJlc3Npb259XCJcblx0XSxcblx0Y2xhc3MgbGlzdF9wcmVwZW5kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnByZXBlbmQoJHtsaXN0fSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIEFkZCB0byBtaWRkbGUgb2YgbGlzdCwgcHVzaGluZyBleGlzdGluZyBpdGVtcyBvdXQgb2YgdGhlIHdheS5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfYWRkX2F0XCIsXG5cdFwiYWRkIHt0aGluZzpleHByZXNzaW9ufSB0byB7bGlzdDpleHByZXNzaW9ufSBhdCBwb3NpdGlvbiB7cG9zaXRpb246ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9zcGxpY2UgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIHBvc2l0aW9uLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnNwbGljZSgke2xpc3R9LCAke3Bvc2l0aW9ufSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gVE9ETzogIFx0XCJhZGQge3RoaW5nOmV4cHJlc3Npb259IHRvIHtsaXN0OmV4cHJlc3Npb259IGJlZm9yZSB7aXRlbTpleHByZXNzaW9ufVwiLFxuXG4vLyBBZGQgdG8gbWlkZGxlIG9mIGxpc3QsIHB1c2hpbmcgZXhpc3RpbmcgaXRlbXMgb3V0IG9mIHRoZSB3YXkuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X2FkZF9hZnRlclwiLFxuXHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8ge2xpc3Q6ZXhwcmVzc2lvbn0gYWZ0ZXIge2l0ZW06ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9hZGRfYWZ0ZXIgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIGl0ZW0sIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuc3BsaWNlKCR7bGlzdH0sIHNwZWxsLnBvc2l0aW9uT2YoJHtsaXN0fSwgJHtpdGVtfSksICR7dGhpbmd9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHRSZW1vdmluZyBmcm9tIGxpc3QgKGluLXBsYWNlKVxuLy9cblxuLy8gRW1wdHkgbGlzdC5cbi8vVE9ETzogbWFrZSBgZW1wdHlgIGFuZC9vciBgY2xlYXJgIGEgZ2VuZXJpYyBzdGF0ZW1lbnQ/Pz9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfZW1wdHlcIixcblx0XCIoZW1wdHl8Y2xlYXIpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfZW1wdHkgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuY2xlYXIoJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gUmVtb3ZlIG9uZSBpdGVtIGZyb20gbGlzdCBieSBwb3NpdGlvbi5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlX3Bvc2l0aW9uXCIsXG5cdFwicmVtb3ZlIHtpZGVudGlmaWVyfSB7bnVtYmVyOmV4cHJlc3Npb259IG9mIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcmVtb3ZlX3Bvc2l0aW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBudW1iZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwucmVtb3ZlSXRlbSgke2xpc3R9LCAke251bWJlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJlbW92ZSByYW5nZSBvZiB0aGluZ3MgZnJvbSBsaXN0LlxuLy8gTk9URTogYHN0YXJ0YCBpcyAqKjEtYmFzZWQqKi5cbi8vIE5PVEU6IGBlbmRgIGlzIGluY2x1c2l2ZSFcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlX3JhbmdlXCIsXG5cdFwicmVtb3ZlIHtpZGVudGlmaWVyfSB7c3RhcnQ6ZXhwcmVzc2lvbn0gdG8ge2VuZDpleHByZXNzaW9ufSBvZiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3JlbW92ZV9wb3NpdGlvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhcnQsIGVuZCwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5yZW1vdmVSYW5nZSgke2xpc3R9LCAke3N0YXJ0fSwgJHtlbmR9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFJlbW92ZSBhbGwgaW5zdGFuY2VzIG9mIHNvbWV0aGluZyBmcm9tIGEgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlXCIsXG5cdFwicmVtb3ZlIHt0aGluZzpleHByZXNzaW9ufSBmcm9tIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcmVtb3ZlIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5yZW1vdmUoJHtsaXN0fSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJlbW92ZSBhbGwgaXRlbXMgZnJvbSBsaXN0IHdoZXJlIGNvbmRpdGlvbiBpcyB0cnVlLlxuLy8gTk9URTogd2Ugd2lsbCBzaW5ndWxhcml6ZSBgaWRlbnRpZmllcmAgYW5kIHVzZSB0aGF0IGFzIHRoZSBhcmd1bWVudCB0byBgZXhwcmVzc2lvbmAuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3JlbW92ZV93aGVyZVwiLFxuXHRcInJlbW92ZSB7aWRlbnRpZmllcn0gKGlufG9mfGZyb20pIHtsaXN0OmV4cHJlc3Npb259IHdoZXJlIHtjb25kaXRpb246ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9yZW1vdmVfd2hlcmUgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGNvbmRpdGlvbiwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gdXNlIHNpbmd1bGFyIG9mIGlkZW50aWZpZXIgZm9yIG1ldGhvZCBhcmd1bWVudFxuXHRcdFx0bGV0IGFyZ3VtZW50ID0gc2luZ3VsYXJpemUoaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnJlbW92ZVdoZXJlKCR7bGlzdH0sICR7YXJndW1lbnR9ID0+ICR7Y29uZGl0aW9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdFJhbmRvbSAoaW4tcGxhY2UpIGxpc3QgbWFuaXB1bGF0aW9uLlxuLy9cblxuLy8gUmV2ZXJzZSBsaXN0IGluLXBsYWNlLlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9yZXZlcnNlXCIsXG5cdFwicmV2ZXJzZSB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3JldmVyc2UgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwucmV2ZXJzZSgke2xpc3R9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBTaHVmZmxlIGxpc3QgaW4tcGxhY2UuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3NodWZmbGVcIixcblx0XCIocmFuZG9taXplfHNodWZmbGUpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3Rfc2h1ZmZsZSBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5zaHVmZmxlKCR7bGlzdH0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gSXRlcmF0aW9uXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X2l0ZXJhdGlvblwiLFxuXHRcImZvciAoZWFjaCk/IHtpdGVtVmFyOmlkZW50aWZpZXJ9KD86KGFuZHwsKSB7cG9zaXRpb25WYXI6aWRlbnRpZmllcn0pPyBpbiB7bGlzdDpleHByZXNzaW9ufTo/XCIsXG5cdGNsYXNzIGxpc3RfaXRlcmF0aW9uIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGl0ZW1WYXIsIHBvc2l0aW9uVmFyLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAocG9zaXRpb25WYXIpIHtcblx0XHRcdFx0cmV0dXJuIGBmb3IgKGxldCAke3Bvc2l0aW9uVmFyfSA9IDE7ICR7cG9zaXRpb25WYXJ9IDw9ICR7bGlzdH0ubGVuZ3RoOyAke3Bvc2l0aW9uVmFyfSsrKSB7XFxuYFxuXHRcdFx0XHRcdCsgIGBcdGxldCAke2l0ZW1WYXJ9ID0gJHtsaXN0fVske3Bvc2l0aW9uVmFyfS0xXWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYGZvciAobGV0ICR7aXRlbVZhcn0gb2YgJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBSYW5nZVxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmdlX2V4cHJlc3Npb25cIixcblx0XCJyYW5nZSB7c3RhcnQ6ZXhwcmVzc2lvbn0gdG8ge2VuZDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzdGFydCwgZW5kIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldFJhbmdlKCR7c3RhcnR9LCAke2VuZH0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvbGlzdHMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGluZml4IGFuZCBwcmVmaXggb3BlcmF0b3JzLlxuLy9cblxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgXCJvcGVyYXRvcnNcIiBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwib3BlcmF0b3JzXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBJbXBvcnQgY29yZSBydWxlcy5cbmltcG9ydCBcIi4vY29yZVwiO1xucGFyc2VyLmltcG9ydChcImNvcmVcIik7XG5cbi8vIyMgSW5maXggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+IHtyaHN9YCwgZWc6IGBhIGlzIDFgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHR3byBhcmd1bWVudHMgKGBsaHNgIGFuZCBgcmhzYCkgaW50byBvdXRwdXQuXG5cbi8vIE5PVEU6IGBwcmVjZWRlbmNlYCBudW1iZXJzIGNvbWUgZnJvbSBKYXZhc2NyaXB0IGVxdWl2YWxlbnRzXG4vL1x0XHQgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvT3BlcmF0b3JzL09wZXJhdG9yX1ByZWNlZGVuY2VcblxucGFyc2VyLmFkZFJ1bGUoXCJpbmZpeF9vcGVyYXRvclwiLCBjbGFzcyBpbmZpeF9vcGVyYXRvciBleHRlbmRzIFJ1bGUuQWx0ZXJuYXRpdmVze30pO1xuXG4vLyBUT0RPOlxuLy8gXHQvLyBGaW5kIGJlc3QgbWF0Y2ggYWNjb3JkaW5nIHRvIG9wZXJhdG9yIHByZWNlZGVuY2UgYXMgZGVmaW5lZCBiZWxvdy5cbi8vIFx0Z2V0QmVzdE1hdGNoKG1hdGNoZXMpIHtcbi8vIFx0XHRjb25zb2xlLndhcm4oXCJHQk1cIiwgbWF0Y2hlcywgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gucHJlY2VkZW5jZSksIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLm1hdGNoZWRUZXh0KSk7XG4vLyBcdFx0cmV0dXJuIG1hdGNoZXMucmVkdWNlKGZ1bmN0aW9uIChiZXN0LCBuZXh0KSB7XG4vLyBcdFx0XHQvLyB0YWtlIGhpZ2hlc3QgcHJlY2VkZW5jZSBtYXRjaCBmaXJzdFxuLy8gXHRcdFx0aWYgKG5leHQucHJlY2VkZW5jZSA+IGJlc3QucHJlY2VkZW5jZSkgcmV0dXJuIG5leHQ7XG4vLyBcdFx0XHQvLyB0YWtlIGxvbmdlc3QgbWF0Y2ggaWYgc2FtZSBwcmVjZWRlbmNlXG4vLyBcdFx0XHRpZiAobmV4dC5wcmVjZWRlbmNlID09PSBiZXN0LnByZWNlZGVuY2UpIHtcbi8vIFx0XHRcdFx0aWYgKG5leHQuZW5kSW5kZXggPiBiZXN0LmVuZEluZGV4KSByZXR1cm4gbmV4dDtcbi8vIFx0XHRcdH1cbi8vIFx0XHRcdHJldHVybiBiZXN0O1xuLy8gXHRcdH0sIG1hdGNoZXNbMF0pO1xuLy8gXHR9XG5cblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwiaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntsaHM6ZXhwcmVzc2lvbn0ge29wZXJhdG9yOmluZml4X29wZXJhdG9yfSB7cmhzOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGluZml4X29wZXJhdG9yX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdC8vIFdlIENBTk5PVCBtYXRjaCBpZiBgaW5maXhfb3BlcmF0b3JgIGlzbid0IGZvdW5kIGluIHRoZSBleHByZXNzaW9uLlxuXHRcdHRlc3RSdWxlID0gXCJpbmZpeF9vcGVyYXRvclwiO1xuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGhzLCByaHMsIG9wZXJhdG9yIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gb3BlcmF0b3IudG9KUyhsaHMudG9Tb3VyY2UoY29udGV4dCksIHJocy50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJhbmRcIixcblx0Y2xhc3MgYW5kIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDY7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gJiYgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcIm9yXCIsXG5cdGNsYXNzIG9yIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDU7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gfHwgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzXCIsXG5cdCBjbGFzcyBpcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdFwiLFxuXHQgY2xhc3MgaXNfbm90IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBleGFjdGx5XCIsXG5cdGNsYXNzIGlzX2V4YWN0bHkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT09ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGV4YWN0bHlcIixcblx0IGNsYXNzICBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPT0gJHtifSlgIH0gfVxuKTtcblxuLy9UT0RPOiBgc3BlbGwuaXNPZlR5cGUodGhpbmcsIHR5cGUpYFxuLy9UT0RPOiBgaXMgc2FtZSB0eXBlIGFzYCA/XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgYVwiLFxuXHQgY2xhc3MgaXNfYSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgYW5cIixcblx0IGNsYXNzIGlzX2FuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBhXCIsXG5cdCBjbGFzcyBpc19ub3RfYSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBhblwiLFxuXHQgY2xhc3MgaXNfbm90X2FuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5cbi8vVE9ETzogYHNwZWxsLmNvbnRhaW5zKGNvbGxlY3Rpb24sIHRoaW5nKWBcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBpblwiLFxuXHQgY2xhc3MgaXNfaW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG9uZSBvZlwiLFxuXHQgY2xhc3MgaXNfb25lX29mIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBpblwiLFxuXHQgY2xhc3MgaXNfbm90X2luIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IG9uZSBvZlwiLFxuXHQgY2xhc3MgaXNfbm90X29uZV9vZiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5cblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImluY2x1ZGVzXCIsXG5cdCBjbGFzcyBpbmNsdWRlcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiY29udGFpbnNcIixcblx0IGNsYXNzIGNvbnRhaW5zIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImRvZXMgbm90IGluY2x1ZGVcIixcblx0IGNsYXNzIGRvZXNfbm90X2luY2x1ZGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkb2VzIG5vdCBjb250YWluXCIsXG5cdCBjbGFzcyBkb2VzX25vdF9jb250YWluIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPlwiLFxuXHQgY2xhc3MgZ3QgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBncmVhdGVyIHRoYW5cIixcblx0IGNsYXNzIGlzX2dyZWF0ZXJfdGhhbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPj1cIixcblx0IGNsYXNzIGd0ZSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG9cIixcblx0IGNsYXNzIGlzX2d0ZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIjxcIixcblx0IGNsYXNzIGx0IGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbGVzcyB0aGFuXCIsXG5cdCBjbGFzcyBpc19sZXNzX3RoYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIjw9XCIsXG5cdCBjbGFzcyBsdGUgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvXCIsXG5cdCBjbGFzcyBpc19sdGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfSB9XG4pO1xuXG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIlxcXFwrXCIsXG5cdCBjbGFzcyBwbHVzIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcInBsdXNcIixcblx0IGNsYXNzIHBsdXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCItXCIsXG5cdCBjbGFzcyBtaW51cyBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAtICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJtaW51c1wiLFxuXHQgY2xhc3MgbWludXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJcXFxcKlwiLFxuXHQgY2xhc3MgdGltZXMgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKiAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwidGltZXNcIixcblx0IGNsYXNzIHRpbWVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiL1wiLFxuXHQgY2xhc3MgZGl2aWRlZF9ieSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkaXZpZGVkIGJ5XCIsXG5cdCBjbGFzcyBkaXZpZGVkX2J5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH0gfVxuKTtcblxuLy9UT0RPOiAgYCs9YCBldGM/ICBvdGhlciBtYXRoIGZ1bmN0aW9ucz9cblxuXG4vL1xuLy9cbi8vIyMgUG9zdGlmeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj5gLCBlLmcuIGBhIGlzIGRlZmluZWRgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBKUyBvdXRwdXQuXG5cbnBhcnNlci5hZGRSdWxlKFwicG9zdGZpeF9vcGVyYXRvclwiLCBjbGFzcyBwb3N0Zml4X29wZXJhdG9yIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXN7fSk7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeF9vcGVyYXRvcn1cIixcblx0Y2xhc3MgcG9zdGZpeF9vcGVyYXRvcl9leHByZXNpb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdC8vIFdlIENBTk5PVCBtYXRjaCBpZiBgcG9zdGZpeF9vcGVyYXRvcmAgaXNuJ3QgZm91bmQgaW4gdGhlIGV4cHJlc3Npb24uXG5cdFx0dGVzdFJ1bGUgPSBcInBvc3RmaXhfb3BlcmF0b3JcIjtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIG9wZXJhdG9yIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gb3BlcmF0b3IudG9KUyhleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIGRlZmluZWRcIixcblx0Y2xhc3MgaXNfZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ICE9PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBkZWZpbmVkXCIsXG5cdGNsYXNzIGlzX25vdF9kZWZpbmVkIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gPT09ICd1bmRlZmluZWQnKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgdW5kZWZpbmVkXCIsXG5cdGNsYXNzIGlzX3VuZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBlbXB0eVwiLFxuXHRjbGFzcyBpc19lbXB0eSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGVtcHR5XCIsXG5cdGNsYXNzIGlzX25vdF9lbXB0eSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAhc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH0gfVxuKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgXCJzdGF0ZW1lbnRzXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcInN0YXRlbWVudHNcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEltcG9ydCBjb3JlIHJ1bGVzLlxuaW1wb3J0IFwiLi9jb3JlXCI7XG5wYXJzZXIuaW1wb3J0KFwiY29yZVwiKTtcblxuXG4vL1xuLy9cdCMjIFJldHVybnNcbi8vXG5cbi8vIFJldHVybiBhIHZhbHVlXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcInJldHVybl9zdGF0ZW1lbnRcIiwgXCJyZXR1cm4ge2V4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJldHVybl9zdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGByZXR1cm4gJHtleHByZXNzaW9ufWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHQjIyBBc3NpZ25tZW50XG4vL1xuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIixcblx0W1xuXHRcdFwie3RoaW5nOmV4cHJlc3Npb259ID0ge3ZhbHVlOmV4cHJlc3Npb259XCIsXG5cdFx0XCJzZXQge3RoaW5nOmV4cHJlc3Npb259IHRvIHt2YWx1ZTpleHByZXNzaW9ufVwiLFxuXHRcdFwicHV0IHt2YWx1ZTpleHByZXNzaW9ufSBpbnRvIHt0aGluZzpleHByZXNzaW9ufVwiXG5cdF0sXG5cdGNsYXNzIGFzc2lnbm1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIHZhbHVlIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyBUT0RPOiBkZWNsYXJlIGlkZW50aWZpZXIgaWYgbm90IGluIHNjb3BlLCBldGNcblx0XHRcdHJldHVybiBgJHt0aGluZ30gPSAke3ZhbHVlfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJnZXRfZXhwcmVzc2lvblwiLFxuXHRcImdldCB7dmFsdWU6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgZ2V0X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdmFsdWUgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTs7XG5cdFx0XHRyZXR1cm4gYGl0ID0gJHt2YWx1ZX1gXG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHQjIyBVc2VyIGludGVyYWN0aW9uXG4vLyBUT0RPOiBtb3ZlIGludG8gYW5vdGhlciBmaWxlXG4vL1xuXG4vLyBBbGVydCBhIG1lc3NhZ2UuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFsZXJ0XCIsIFwiYWxlcnQge21lc3NhZ2U6ZXhwcmVzc2lvbn0gKD86d2l0aCB7b2tCdXR0b246dGV4dH0pP1wiLFxuXHRjbGFzcyBhbGVydCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBva0J1dHRvbiA9IGBcIk9LXCJgIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLmFsZXJ0KCR7bWVzc2FnZX0sICR7b2tCdXR0b259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBXYXJuaW5nIG1lc3NhZ2UgLS0gbGlrZSBhbGVydCBidXQgZmFuY2llci5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwid2FyblwiLCBcIndhcm4ge2V4cHJlc3Npb246ZXhwcmVzc2lvbn0gKD86d2l0aCB7b2tCdXR0b246dGV4dH0pP1wiLFxuXHRjbGFzcyB3YXJuIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG1lc3NhZ2UsIG9rQnV0dG9uID0gYFwiT0tcImAgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwud2Fybigke21lc3NhZ2V9LCAke29rQnV0dG9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBDb25maXJtIG1lc3NhZ2UgLS0gcHJlc2VudCBhIHF1ZXN0aW9uIHdpdGggdHdvIGFuc3dlcnMuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImNvbmZpcm1cIiwgXCJjb25maXJtIHttZXNzYWdlOmV4cHJlc3Npb259ICg/OndpdGgge29rQnV0dG9uOnRleHR9ICg/OiAoYW5kfG9yKSB7Y2FuY2VsQnV0dG9uOnRleHR9KT8gKT9cIixcblx0Y2xhc3MgY29uZmlybSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBva0J1dHRvbiA9IGBcIk9LXCJgLCBjYW5jZWxCdXR0b24gPSBgXCJDYW5jZWxcImAgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwuY29uZmlybSgke21lc3NhZ2V9LCAke29rQnV0dG9ufSwgJHtjYW5jZWxCdXR0b259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlZmluaW5nIGNsYXNzZXMgKGtub3duIGFzIGB0eXBlc2ApXG4vL1xuXG4vLyBUT0RPOiBtaXhpbnMgLyB0cmFpdHMgLyBjb21wb3NlZCBjbGFzc2VzIC8gYW5ub3RhdGlvbnNcblxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG5pbXBvcnQgZ2xvYmFsIGZyb20gXCIuLi91dGlscy9nbG9iYWxcIjtcbmltcG9ydCB7IHBsdXJhbGl6ZSB9IGZyb20gXCIuLi91dGlscy9zdHJpbmdcIjtcblxuLy8gQ3JlYXRlIFwidHlwZXNcIiBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwidHlwZXNcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEltcG9ydCBjb3JlIHJ1bGVzLlxuaW1wb3J0IFwiLi9jb3JlXCI7XG5wYXJzZXIuaW1wb3J0KFwiY29yZVwiKTtcblxuLy8gRGVmaW5lIFwidHlwZVwiIChhLmsuYS4gXCJjbGFzc1wiKS5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVmaW5lX3R5cGVcIixcblx0XCJkZWZpbmUgdHlwZSB7dHlwZX0gKD86YXMgKGF8YW4pIHtzdXBlclR5cGU6dHlwZX0pP1wiLFxuXHRjbGFzcyBkZWZpbmVfdHlwZSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBzdXBlclR5cGUgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGlmIChzdXBlclR5cGUpIHtcblx0XHRcdFx0cmV0dXJuIGBjbGFzcyAke3R5cGV9IGV4dGVuZHMgJHtzdXBlclR5cGV9YDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBgY2xhc3MgJHt0eXBlfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFByb3BlcnRpZXMgY2xhdXNlOiBjcmVhdGVzIGFuIG9iamVjdCB3aXRoIG9uZSBvciBtb3JlIHByb3BlcnR5IHZhbHVlcy5cbi8vXHRgZm9vID0gMSwgYmFyID0gMmBcbi8vVE9ETzogd291bGQgbGlrZSB0byB1c2UgYGFuZGAgYnV0IHRoYXQgd2lsbCBiYXJmIG9uIGV4cHJlc3Npb25zLi4uXG4vL1RPRE86IGhvdyB0byBkbyBwcm9wZXJ0aWVzIG9uIG11bHRpcGxlIGxpbmVzP1xucGFyc2VyLmFkZExpc3QoXG5cdFwib2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc1wiLFxuXHRcIlsoe2tleTppZGVudGlmaWVyfSg/Oj0ge3ZhbHVlOmV4cHJlc3Npb259KT8pICxdXCIsXG5cdGNsYXNzIG9iamVjdF9saXRlcmFsX3Byb3BlcnRpZXMgZXh0ZW5kcyBSdWxlLkxpc3Qge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBwcm9wcyA9IHRoaXMucmVzdWx0cy5tYXRjaGVkLm1hcChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0XHRcdGxldCB7IGtleSwgdmFsdWUgfSA9IHByb3AucmVzdWx0cztcblx0XHRcdFx0XHRrZXkgPSBrZXkudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRcdFx0dmFsdWUgPSB2YWx1ZSAmJiB2YWx1ZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0XHRpZiAodmFsdWUpIHJldHVybiBgXCIke2tleX1cIjogJHt2YWx1ZX1gXG5cdFx0XHRcdFx0cmV0dXJuIGtleTtcblx0XHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYHsgJHtwcm9wcy5qb2luKFwiLCBcIil9IH1gO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gYG5ld2Agb3IgYGNyZWF0ZWBcbi8vIFRoaXMgd29ya3MgYXMgYW4gZXhwcmVzc2lvbiBPUiBhIHN0YXRlbWVudC5cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGFsbCB0eXBlcyB0YWtlIGFuIG9iamVjdCBvZiBwcm9wZXJ0aWVzPz8/P1xucGFyc2VyLmFkZFNlcXVlbmNlKFxuXHRbXCJleHByZXNzaW9uXCIsIFwic3RhdGVtZW50XCJdLFxuXHRcIihjcmVhdGV8bmV3KSB7dHlwZX0gKD86d2l0aCB7cHJvcHM6b2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc30pP1wiLFxuXHRjbGFzcyBuZXdfdGhpbmcgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBwcm9wcyA9IFwiXCIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igb2JqZWN0LCB3aGljaCB3ZSdsbCBjcmVhdGUgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbC5cblx0XHRcdGlmICh0eXBlID09PSBcIk9iamVjdFwiKSB7XG5cdFx0XHRcdGlmICghcHJvcHMpIHJldHVybiBcInt9XCI7XG5cdFx0XHRcdHJldHVybiBwcm9wcztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGBuZXcgJHt0eXBlfSgke3Byb3BzfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1RPRE86IGNvbnN0cnVjdG9yXG5cblxuXG4vL01PVkUgVE8gYGZ1bmN0aW9uc2A/XG4vLyBBcmd1bWVudHMgY2xhdXNlIGZvciBtZXRob2RzXG4vL1x0YHdpdGggZm9vYCBvciBgd2l0aCBmb28gYW5kIGJhciBhbmQgYmF6YFxuLy9UT0RPOiB7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cdD0+IHJlcXVpcmVzIGAsYCBpbnN0ZWFkIG9mIGBhbmRgXG4vL1RPRE86IGB3aXRoIGZvbyBhcyBUeXBlYFxuLy9UT0RPOlx0YHdpdGggZm9vLi4uYCBmb3Igc3BsYXQ/XG5wYXJzZXIuYWRkU2VxdWVuY2UoXG5cdFwiYXJnc1wiLFxuXHRcIndpdGggW2FyZ3M6e2lkZW50aWZpZXJ9ICxdXCIsXG5cdGNsYXNzIGFyZ3MgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHQvLyBSZXR1cm5zIGFuIGFycmF5IG9mIGFyZ3VtZW50IHZhbHVlc1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiB0aGlzLnJlc3VsdHMuYXJncy5tYXRjaGVkLm1hcChhcmcgPT4gYXJnLm1hdGNoZWQpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBEZWNsYXJlIGluc3RhbmNlIG1ldGhvZCBvciBub3JtYWwgZnVuY3Rpb24uXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfbWV0aG9kXCIsXG5cdFwiKHRvfG9uKSB7aWRlbnRpZmllcn0ge2FyZ3N9PyAoXFxcXDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZGVjbGFyZV9tZXRob2QgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJncywgc3RhdGVtZW50IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRhcmdzID0gKEFycmF5LmlzQXJyYXkoYXJncykgPyBhcmdzLmpvaW4oXCIsIFwiKSA6IFwiXCIpO1xuXHRcdFx0aWYgKCFzdGF0ZW1lbnQpIHtcblx0XHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pYDtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLm9wZW5zQmxvY2sgPSB0cnVlO1xuXHRcdFx0XHR0aGlzLmNsb3Nlc0Jsb2NrID0gdHJ1ZTtcblx0XHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBEZWNsYXJlIFwiYWN0aW9uXCIsIHdoaWNoIGNhbiBiZSBjYWxsZWQgZ2xvYmFsbHkgYW5kIGFmZmVjdHMgdGhlIHBhcnNlci5cbi8vIFRPRE86IGB3aXRoYCBjbGF1c2UgKHdpbGwgY29uZmxpY3Qgd2l0aCBgd29yZGApXG4vLyBUT0RPOiBpbnN0YWxsIGluIHBhcnNlciBzb21laG93XG4vLyBUT0RPOiBjcmVhdGUgaW5zdGFuY2UgZnVuY3Rpb24/ICBvciBtYXliZSB3ZSBkb24ndCBuZWVkIGl0OlxuLy9cdFx0XHRgYWN0aW9uIHR1cm4gQ2FyZCBvdmVyYCBmb3IgYW4gaW5zdGFuY2UgaXMganVzdCBgdHVybiBtZSBvdmVyYFxuLy9cdFx0XHRgYWN0aW9uIGFkZCBjYXJkIHRvIGRlY2tgID0+IGBhZGQgbWUgdG8gZGVja2Bcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfYWN0aW9uXCIsXG5cdFwiYWN0aW9uIChrZXl3b3Jkczp7d29yZH18e3R5cGV9KSsgKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGRlY2xhcmVfYWN0aW9uIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGtleXdvcmRzLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGxldCB3b3JkcyA9IGtleXdvcmRzLm1hdGNoZWQubWFwKCB3b3JkID0+IHdvcmQudG9Tb3VyY2UoY29udGV4dCkgKTtcblx0XHRcdC8vIGlmIHRoZXJlJ3Mgb25seSBvbmUgd29yZCwgaXQgY2FuJ3QgYmUgYSBibGFja2xpc3RlZCBpZGVudGlmaWVyIG9yIGEgdHlwZVxuXHRcdFx0aWYgKHdvcmRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHR2YXIgd29yZCA9IHdvcmRzWzBdO1xuXHRcdFx0XHRpZiAoa2V5d29yZHMubWF0Y2hlZCBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSB0eXBlczogJHt3b3JkfWApO1xuXHRcdFx0XHR9XG5cbmNvbnNvbGUud2FybihcIkZJWE1FOiBwYXJzZXIucnVsZXMuaWRlbnRpZmllclwiKTtcbi8vIEhBQ0s6IGBnbG9iYWwucGFyc2VyYCBpcyBhIGhhY2sgaGVyZSBmb3IgY29udmVuaWVuY2UgaW4gdGVzdGluZy4uLlxuXHRcdFx0XHRsZXQgcGFyc2VyID0gY29udGV4dCA/IGNvbnRleHQucGFyc2VyIDogZ2xvYmFsLnBhcnNlcjtcblx0XHRcdFx0aWYgKHBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmJsYWNrbGlzdFt3b3JkXSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSBibGFja2xpc3RlZCBpZGVudGlmaWVyc1wiOiAke3dvcmR9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBhcmd1bWVudHMgYW5kL29yIHR5cGVzXG5cdFx0XHR2YXIgYXJncyA9IFtdO1xuXHRcdFx0dmFyIHR5cGVzID0gW107XG5cdFx0XHQvLyBpZiBhbnkgb2YgdGhlIHdvcmRzIGFyZSB0eXBlcyAoY2FwaXRhbCBsZXR0ZXIpIG1ha2UgdGhhdCBhbiBhcmd1bWVudCBvZiB0aGUgc2FtZSBuYW1lLlxuXHRcdFx0a2V5d29yZHMubWF0Y2hlZC5tYXAoIChpdGVtLCBpbmRleCkgPT4ge1xuXHRcdFx0XHRpZiAoaXRlbSBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdGxldCB0eXBlID0gd29yZHNbaW5kZXhdO1xuXHRcdFx0XHRcdGxldCB3b3JkID0gdHlwZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdHR5cGVzLnB1c2goW3R5cGUsIHdvcmRdKTtcblx0XHRcdFx0XHR3b3Jkc1tpbmRleF0gPSB3b3JkO1xuXHRcdFx0XHRcdGFyZ3MucHVzaCh3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQvLyBnZXQgc3RhdGljIG1ldGhvZCBuYW1lIGFuZCBhcmd1bWVudHMgZm9yIG91dHB1dFxuXHRcdFx0bGV0IG1ldGhvZE5hbWUgPSB3b3Jkcy5qb2luKFwiX1wiKTtcblx0XHRcdGFyZ3MgPSBhcmdzLmpvaW4oXCIsIFwiKTtcblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpZiB0aGVyZSBhcmUgYW55IGNvbmRpdGlvbnMgb24gdGhlIGFib3ZlXG5cdFx0XHRsZXQgY29uZGl0aW9ucyA9IHR5cGVzLm1hcCggKFt0eXBlLCB3b3JkXSkgPT4ge1xuXHRcdFx0XHRyZXR1cm4gYFxcdGlmICghc3BlbGwuaXNBKCR7d29yZH0sICR7dHlwZX0pKSByZXR1cm4gdW5kZWZpbmVkYDtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBnZXQgc3RhdGVtZW50cywgYWRkaW5nIGNvbmRpdGlvbnMgaWYgbmVjZXNzYXJ5XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiBcIlwiO1xuXHRcdFx0bGV0IHN0YXRlbWVudHMgPSBcIlwiO1xuXHRcdFx0aWYgKHN0YXRlbWVudCkge1xuXHRcdFx0XHRzdGF0ZW1lbnRzID0gW107XG5cdFx0XHRcdGlmIChjb25kaXRpb25zLmxlbmd0aCkgc3RhdGVtZW50cyA9IHN0YXRlbWVudHMuY29uY2F0KGNvbmRpdGlvbnMpO1xuXHRcdFx0XHRpZiAoc3RhdGVtZW50KSBzdGF0ZW1lbnRzLnB1c2goXCJcXHRcIiArIHN0YXRlbWVudCk7XG5cdFx0XHRcdHN0YXRlbWVudHMgPSBgIHtcXG4ke3N0YXRlbWVudHMuam9pbihcIlxcblwiKX1cXG4gfVxcbmA7XG5cdFx0XHRcdHRoaXMub3BlbnNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHRoaXMuY2xvc2VzQmxvY2sgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoY29uZGl0aW9ucy5sZW5ndGgpIHtcblx0XHRcdFx0c3RhdGVtZW50cyA9IGAge1xcbiR7Y29uZGl0aW9ucy5qb2luKFwiXFxuXCIpfWA7XG5cdFx0XHRcdHRoaXMub3BlbnNCbG9jayA9IHRydWU7XG5cdFx0XHR9XG4vL2RlYnVnZ2VyO1xuXHRcdFx0Ly8gQ3JlYXRlIGFzIGEgU1RBVElDIGZ1bmN0aW9uXG5cdC8vVE9ETzogY3JlYXRlIGFzIGFuIGluc3RhbmNlIGZ1bmN0aW9uIHdlIGNhbiBjYWxsIG9uIG91cnNlbGYhXG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke21ldGhvZE5hbWV9KCR7YXJnc30pJHtzdGF0ZW1lbnRzfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIEdldHRlciBlaXRoZXIgd2l0aCBvciB3aXRob3V0IGFyZ3VtZW50cy5cbi8vIElmIHlvdSBzcGVjaWZ5IGFyZ3VtZW50cywgeWllbGRzIGEgbm9ybWFsIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYSB2YWx1ZS5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZ2V0dGVyXCIsXG5cdFwiZ2V0IHtpZGVudGlmaWVyfSB7YXJnc30/IChcXFxcOik/IHtleHByZXNzaW9ufT9cIixcblx0Y2xhc3MgZ2V0dGVyIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3MsIGV4cHJlc3Npb24gfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGFyZ3MgPSAoQXJyYXkuaXNBcnJheShhcmdzKSA/IGFyZ3Muam9pbihcIiwgXCIpIDogXCJcIik7XG5cblx0XHRcdGlmIChhcmdzICYmIGV4cHJlc3Npb24pIHtcblx0XHRcdFx0dGhpcy5vcGVuc0Jsb2NrID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5jbG9zZXNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KSB7IHJldHVybiAoJHtleHByZXNzaW9ufSkgfWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChhcmdzKSB7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChleHByZXNzaW9uKSB7XG5cdFx0XHRcdHRoaXMub3BlbnNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHRoaXMuY2xvc2VzQmxvY2sgPSB0cnVlO1xuXHRcdFx0XHRyZXR1cm4gYGdldCAke2lkZW50aWZpZXJ9KCkgeyByZXR1cm4gKCR7ZXhwcmVzc2lvbn0pIH1gO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJldHVybiBgZ2V0ICR7aWRlbnRpZmllcn0oKWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fVxuKTtcblxuLy8gU2V0dGVyLlxuLy8gQ29tcGxhaW5zIGlmIHlvdSBzcGVjaWZ5IG1vcmUgdGhhbiBvbmUgYXJndW1lbnQuXG4vLyBJZiB5b3UgZG9uJ3QgcGFzcyBhbiBleHBsaWNpdCBhcmd1bWVudCwgd2UnbGwgYXNzdW1lIGl0J3MgdGhlIHNhbWUgYXMgdGhlIGlkZW50aWZpZXIuXG4vLyBlZztcdGBzZXQgY29sb3I6IHNldCB0aGUgY29sb3Igb2YgbXkgdGV4dCB0byBjb2xvcmBcbi8vXG4vLyBUT0RPOiBpbnRlcm5hbCBnZXR0ZXIvc2V0dGVyIHNlbWFudGljcyBhbGEgb2JqZWN0aXZlIENcbi8vXHRcdFx0YHNldCBjb2xvcjogaWYgY29sb3IgaXMgaW4gW1wicmVkXCIsIFwiYmx1ZVwiXSB0aGVuIHNldCBteSBjb2xvciB0byBjb2xvcmBcbi8vXHRcdCA9PiBgbXkgY29sb3JgIHdpdGhpbiBzZXR0ZXIgc2hvdWxkIGF1dG9tYXRpY2FsbHkgdHJhbnNsYXRlIHRvIGB0aGlzLl9jb2xvcmAgPz8/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcInNldHRlclwiLFxuXHRcInNldCB7aWRlbnRpZmllcn0ge2FyZ3N9PyAoXFxcXDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3Mgc2V0dGVyIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3MgPSBbaWRlbnRpZmllcl0sIHN0YXRlbWVudCA9IFwiXCIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIENvbXBsYWluIGlmIG1vcmUgdGhhbiBvbmUgYXJndW1lbnRcblx0XHRcdGlmIChhcmdzICYmIGFyZ3MubGVuZ3RoID4gMSkge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJwYXJzZSgnc2V0dGVyJyk6IG9ubHkgb25lIGFyZ3VtZW50IGFsbG93ZWQgaW4gc2V0dGVyOiAgXCIsIHRoaXMubWF0Y2hlZFRleHQpO1xuXHRcdFx0XHRhcmdzID0gWyBhcmdzWzBdIF07XG5cdFx0XHR9XG5cblx0XHRcdGlmICghc3RhdGVtZW50KSB7XG5cdFx0XHRcdHJldHVybiBgc2V0ICR7aWRlbnRpZmllcn0oJHthcmdzfSlgO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMub3BlbnNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHRoaXMuY2xvc2VzQmxvY2sgPSB0cnVlO1xuXHRcdFx0XHRyZXR1cm4gYHNldCAke2lkZW50aWZpZXJ9KCR7YXJnc30pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdGRlY2xhcmUgcHJvcGVydGllc1xuLy9cblxuLy9UT0RPOiBhbm90aGVyIG5hbWUgZm9yIGBjb25zdGFudGAgP1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwiKHNjb3BlOnByb3BlcnR5fGNvbnN0YW50fHNoYXJlZCBwcm9wZXJ0eSkge2lkZW50aWZpZXJ9ICg/Oj0ge3ZhbHVlOmV4cHJlc3Npb259KT9cIixcblx0Y2xhc3MgZGVjbGFyZV9wcm9wZXJ0eSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzY29wZSwgaWRlbnRpZmllciwgdmFsdWUgPSBcIlwiIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAodmFsdWUpIHZhbHVlID0gYCA9ICR7dmFsdWV9YDtcblxuXHRcdFx0bGV0IGRlY2xhcmF0aW9uID0gYCR7aWRlbnRpZmllcn0ke3ZhbHVlfWA7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdGlmICghdmFsdWUpIGNvbnNvbGUud2FybihcInBhcnNlKCdkZWNsYXJlX3Byb3BlcnR5Jyk6IGNvbnN0YW50IHByb3BlcnRpZXMgbXVzdCBkZWNsYXJlIGEgdmFsdWU6ICBcIiwgdGhpcy5tYXRjaGVkVGV4dCk7XG5cdFx0XHRcdFx0cmV0dXJuIGBjb25zdCAke2RlY2xhcmF0aW9ufWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZCBwcm9wZXJ0eVwiOlxuXHRcdFx0XHRcdHJldHVybiBgQHByb3RvICR7ZGVjbGFyYXRpb259YDtcblxuXHRcdFx0XHRjYXNlIFwicHJvcGVydHlcIjpcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRyZXR1cm4gZGVjbGFyYXRpb247XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiBzY29wZV9tb2RpZmllcj8/P1xuLy8gVE9ETzogaW5pdGlhbCB2YWx1ZVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5X29mX3R5cGVcIixcblx0XCJwcm9wZXJ0eSB7aWRlbnRpZmllcn0gYXMgKGF8YW4pPyB7dHlwZX1cIixcblx0Y2xhc3MgZGVjbGFyZV9wcm9wZXJ0eV9vZl90eXBlIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIHR5cGUgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgZ2V0ICR7aWRlbnRpZmllcn0oKSB7IHJldHVybiB0aGlzLl9fJHtpZGVudGlmaWVyfSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHNwZWxsLmlzQSh2YWx1ZSwgJHt0eXBlfSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gVE9ETzogd2FybiBvbiBpbnZhbGlkIHNldD8gIHNoYXJlZD8gIHVuZGVmaW5lZD8gc29tZXRoaW5nIG90aGVyIHRoYW4gdGhlIGZpcnN0IHZhbHVlIGFzIGRlZmF1bHQ/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlfYXNfb25lX29mXCIsXG5cdFwicHJvcGVydHkge2lkZW50aWZpZXJ9IGFzIG9uZSBvZiB7bGlzdDpsaXRlcmFsX2xpc3R9XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHlfYXNfb25lX29mIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBwbHVyYWwgPSBwbHVyYWxpemUoaWRlbnRpZmllcik7XG5cdFx0XHRyZXR1cm4gYEBwcm90byAke3BsdXJhbH0gPSAke2xpc3R9XFxuYFxuXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0oKSB7IHJldHVybiB0aGlzLl9fJHtpZGVudGlmaWVyfSA9PT0gdW5kZWZpbmVkID8gdGhpcy4ke3BsdXJhbH1bMF0gOiB0aGlzLl9fJHtpZGVudGlmaWVyfSB9XFxuYFxuXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblxuLy8gTU9SRSBFRkZJQ0lFTlQgQlVUIFVHTElFUlxuLy8gXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtwbHVyYWx9ID0gJHtsaXN0fTtcXG5gXG4vLyBcdFx0XHRcdCArIGBnZXQgJHtpZGVudGlmaWVyfSB7IHJldHVybiAoXCJfXyR7aWRlbnRpZmllcn1cIiBpbiB0aGlzID8gdGhpcy5fXyR7aWRlbnRpZmllcn0gOiAke2ZpcnN0VmFsdWV9KSB9XFxuYFxuLy8gXHRcdFx0XHQgKyBgc2V0ICR7aWRlbnRpZmllcn0odmFsdWUpIHsgaWYgKHRoaXMuY29uc3RydWN0b3IuJHtwbHVyYWx9LmluY2x1ZGVzKHZhbHVlKSkgdGhpcy5fXyR7aWRlbnRpZmllcn0gPSB2YWx1ZSB9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRTZWxmLXJlZmVyZW5jZVxuLy9cbnBhcnNlci5hZGRLZXl3b3JkKFxuXHRbXCJtZVwiLCBcImV4cHJlc3Npb25cIl0sXG5cdFwibWVcIixcblx0Y2xhc3MgbWUgZXh0ZW5kcyBSdWxlLktleXdvcmQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiBcInRoaXNcIjtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFRPRE86IHRoaXMgcmVhbGx5IG1ha2VzIG1lIHdhbnQgdG8gbWFrZSBgSSBhbSBlbXB0eWAgZXRjIHdvcmsuLi5cbnBhcnNlci5hZGRLZXl3b3JkKFxuXHRbXCJJXCIsIFwiZXhwcmVzc2lvblwiXSxcblx0XCJJXCIsXG5cdGNsYXNzIEkgZXh0ZW5kcyBSdWxlLktleXdvcmQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiBcInRoaXNcIjtcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRQcm9wZXJ0eSBhY2Nlc3Ncbi8vXG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIocHJvcGVydGllczp0aGUge2lkZW50aWZpZXJ9IG9mKSsgdGhlPyB7ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Z2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBwcm9wZXJ0aWVzIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHByZXNzaW9uOiBleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpLFxuXHRcdFx0XHRwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzLm1hdGNoZWQubWFwKCBwcm9wZXJ0eSA9PiBwcm9wZXJ0eS5yZXN1bHRzLmlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCkgKVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBwcm9wZXJ0aWVzIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRwcm9wZXJ0aWVzID0gcHJvcGVydGllcy5yZXZlcnNlKCkuam9pbihcIi5cIik7XG5cdFx0XHRyZXR1cm4gYCR7ZXhwcmVzc2lvbn0uJHtwcm9wZXJ0aWVzfWA7XG4vLyBOT1RFOiB0aGUgZm9sbG93aW5nIGlzIHNhZmVyLCBidXQgdWdseSBmb3IgZGVtbyBwdXJwb3Nlc1xuLy9cdFx0XHRyZXR1cm4gYHNwZWxsLmdldCgke2V4cHJlc3Npb259LCBbJyR7cHJvcGVydGllc30nXSlgO1xuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibXlfcHJvcGVydHlfZXhwcmVzc2lvblwiLFxuXHRcIihteXx0aGlzKSB7aWRlbnRpZmllcn1cIixcblx0Y2xhc3MgbXlfcHJvcGVydHlfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGB0aGlzLiR7aWRlbnRpZmllcn1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy90eXBlcy5qcyIsInZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxuLy8gVE9ETzogTmVlZCBiZXR0ZXIsIG1vcmUgY29tcGxldGUsIGFuZCBtb3JlIG1ldGhvZGljYWwga2V5IGRlZmluaXRpb25zXG5cbnZhciBLZXlzID0ge1xuICBiYWNrc3BhY2U6IDgsXG4gIGRlbDogNDYsXG4gIGRlbGV0ZTogNDYsXG4gIHRhYjogOSxcbiAgZW50ZXI6IDEzLFxuICAncmV0dXJuJzogMTMsXG4gIGVzYzogMjcsXG4gIHNwYWNlOiAzMixcbiAgbGVmdDogMzcsXG4gIHVwOiAzOCxcbiAgcmlnaHQ6IDM5LFxuICBkb3duOiA0MCxcbiAgJzsnOiAxODYsXG4gICc9JzogMTg3LFxuICAnLCc6IDE4OCxcbiAgJy0nOiAxODksXG4gICcuJzogMTkwLFxuICAnLyc6IDE5MSxcbiAgJ2AnOiAxOTIsXG4gICdbJzogMjE5LFxuICAnXFxcXCc6IDIyMCxcbiAgJ10nOiAyMjFcbn07XG5cbi8vIEFkZCB1cHBlcmNhc2UgdmVyc2lvbnMgb2Yga2V5cyBhYm92ZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHlcbk9iamVjdC5rZXlzKEtleXMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICByZXR1cm4gS2V5c1trZXkudG9VcHBlckNhc2UoKV0gPSBLZXlzW2tleV07XG59KTtcblxuJzAxMjM0NTY3ODknLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uIChudW0sIGluZGV4KSB7XG4gIHJldHVybiBLZXlzW251bV0gPSBpbmRleCArIDQ4O1xufSk7XG5cbidBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWicuc3BsaXQoJycpLmZvckVhY2goZnVuY3Rpb24gKGxldHRlciwgaW5kZXgpIHtcbiAgS2V5c1tsZXR0ZXJdID0gaW5kZXggKyA2NTtcbiAgS2V5c1tsZXR0ZXIudG9Mb3dlckNhc2UoKV0gPSBpbmRleCArIDY1O1xufSk7XG5cbi8vIGZuIGtleXNcblsxLCAyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMCwgMTEsIDEyXS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtLCBpbmRleCkge1xuICByZXR1cm4gS2V5c1snZicgKyBpbmRleF0gPSAxMTEgKyBpbmRleDtcbn0pO1xuXG5leHBvcnQgdmFyIG1vZGlmaWVycyA9IHtcbiAgY29udHJvbDogJ2N0cmwnLFxuICBjdHJsOiAnY3RybCcsXG4gIHNoaWZ0OiAnc2hpZnQnLFxuICBtZXRhOiAnbWV0YScsXG4gIGNtZDogJ21ldGEnLFxuICBjb21tYW5kOiAnbWV0YScsXG4gIG9wdGlvbjogJ2FsdCcsXG4gIGFsdDogJ2FsdCdcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBhbGxLZXlzKGFyZykge1xuICByZXR1cm4gYXJnID8gYXJnLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgfHwgKHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGFyZykpID09PSAnc3ltYm9sJyA6IFN5bWJvbCgnYWxsS2V5cycpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBLZXlzO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9rZXlzLmpzXG4vLyBtb2R1bGUgaWQgPSA5OVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiXSwic291cmNlUm9vdCI6IiJ9