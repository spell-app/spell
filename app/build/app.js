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
		value: function tokenize(text, start, end) {
			var tokens = _Tokenizer2.default.tokenize(text, start, end);
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
				//console.info("marking ", rule, " as left recursive!");
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

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); //	# Parser Rules
//	Rules can be as simple as a string `Keyword` or a complex sequence of (nested) rules.
//
//	Parse a rule with `rule.parse(parser, tokens, startIndex)`, this will either:
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

		// Attempt to match this rule in the `tokens`.
		// Returns results of the parse or `undefined`.

	}, {
		key: "parse",
		value: function parse(parser, tokens) {
			var startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var stack = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

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

		// Does the parse `stack` already contain `rule`?

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
	}], [{
		key: "stackContains",
		value: function stackContains(stack, rule, tokens) {
			if (stack.length === 0) return false;

			//console.info(stack);
			// go backwards
			for (var i = stack.length - 1; i >= 0; i--) {
				var _stack$i = _slicedToArray(stack[i], 2),
				    nextRule = _stack$i[0],
				    nextStream = _stack$i[1];

				if (nextRule === rule) {
					if (tokens.startIndex === tokens.startIndex) {
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
			var stack = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

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
			var stack = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

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
			var stack = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

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
			var stack = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

			// If we have a `testRule` defined
			if (this.testRule) {
				// Forget it if there is NO WAY the rule could be matched.
				if (parser.testRule(this.testRule, tokens, startIndex) === false) return undefined;
			}

			if (this.leftRecursive) {
				if (Rule.stackContains(stack, this, tokens)) return undefined;
				stack = stack.concat();
				stack.push([this, tokens]);
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
			var stack = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

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
			var stack = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

			if (this.leftRecursive) {
				if (Rule.stackContains(stack, this, tokens)) return undefined;
				stack = stack.concat();
				stack.push([this, tokens]);
			}

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
			var stack = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

			if (this.leftRecursive) {
				if (Rule.stackContains(stack, this, tokens)) return undefined;
				stack = stack.concat();
				stack.push([this, tokens]);
			}

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

// `Statements` are a block of `Statement` that understand nesting and comments.
Rule.Statements = (_temp = _class = function (_Rule8) {
	_inherits(statements, _Rule8);

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
				// if line indent DECREASES, add one or more closing curly braces
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
					//TODO...
					comment = parser.parseRuleOrDie("comment", tokens, lastItem);
					if (comment) {
						// Add comment BEFORE corresponding statement
						results.push(comment);

						// pop the comment off before matching the rest of the statement.
						tokens = tokens.slice(0, -1);
					}
				}

				//TODO...
				var result = parser.parseRuleOrDie("statement", tokens, 0);
				// complain if no result and no comment
				if (!result && !comment) {
					var _statement = tokens.join(" ");
					console.warn("Couldn't parse statement:\n\t" + _statement);
					results.push(new Rule.ParseError({
						error: "Can't parse statement",
						message: "CAN'T PARSE: " + _statement
					}));
					return;
				}

				// complain can't parse the entire line!
				if (result && result.nextStart !== tokens.length) {
					var _statement2 = tokens.join(" ");
					var unparsed = tokens.slice(result.nextStart).join(" ");
					console.warn("Couldn't parse entire statement:", "\n\t\"" + _statement2 + "\"", "\nunparsed:", "\n\t\"" + unparsed + "\"");
					var error = new Rule.ParseError({
						error: "Can't parse entire statement",
						message: "CANT PARSE ENTIRE STATEMENT\n" + ("PARSED    : " + result.matched + "\n") + ("CANT PARSE: " + unparsed)

					});
					results.push(error);
					return;
				}

				if (result) {
					result.indent = indent;
					results.push(result);
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
parser.addExpression("range_expression", "first {number:expression} {identifier} (in|of) {list:expression}", function (_Rule$Expression5) {
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
parser.addExpression("range_expression", "last {number:expression} {identifier} (in|of) {list:expression}", function (_Rule$Expression6) {
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
parser.addStatement("list_splice", "add {thing:expression} to {list:expression} at position {position:expression}", function (_Rule$Statement3) {
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
	_inherits(list_splice, _Rule$Statement4);

	function list_splice() {
		_classCallCheck(this, list_splice);

		return _possibleConstructorReturn(this, (list_splice.__proto__ || Object.getPrototypeOf(list_splice)).apply(this, arguments));
	}

	_createClass(list_splice, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource15 = this.getMatchedSource(context),
			    thing = _getMatchedSource15.thing,
			    item = _getMatchedSource15.item,
			    list = _getMatchedSource15.list;

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
	_inherits(getter, _Rule$Statement5);

	function getter() {
		_classCallCheck(this, getter);

		return _possibleConstructorReturn(this, (getter.__proto__ || Object.getPrototypeOf(getter)).apply(this, arguments));
	}

	_createClass(getter, [{
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

	return getter;
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
parser.addStatement("declare_property", "property {identifier} as (a|an)? {type}", function (_Rule$Statement7) {
	_inherits(declare_property, _Rule$Statement7);

	function declare_property() {
		_classCallCheck(this, declare_property);

		return _possibleConstructorReturn(this, (declare_property.__proto__ || Object.getPrototypeOf(declare_property)).apply(this, arguments));
	}

	_createClass(declare_property, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource7 = this.getMatchedSource(context),
			    identifier = _getMatchedSource7.identifier,
			    type = _getMatchedSource7.type;

			return "get " + identifier + "() { return this.__" + identifier + " }\n" + ("set " + identifier + "(value) { if (spell.isA(value, " + type + ") this.__" + identifier + " = value }");
		}
	}]);

	return declare_property;
}(_RuleSyntax2.default.Statement));

// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
parser.addStatement("declare_property", "property {identifier} as one of {list:literal_list}", function (_Rule$Statement8) {
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

parser.addExpression("property_expression", "(my|this) {identifier}", function (_Rule$Expression2) {
	_inherits(property_expression, _Rule$Expression2);

	function property_expression() {
		_classCallCheck(this, property_expression);

		return _possibleConstructorReturn(this, (property_expression.__proto__ || Object.getPrototypeOf(property_expression)).apply(this, arguments));
	}

	_createClass(property_expression, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource10 = this.getMatchedSource(context),
			    identifier = _getMatchedSource10.identifier;

			return "this." + identifier;
		}
	}]);

	return property_expression;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvc3RvcmUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1BhcnNlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUnVsZS5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvfi9mYmpzL2xpYi9lbXB0eUZ1bmN0aW9uLmpzIiwid2VicGFjazovLy8uL34vcHJvcC10eXBlcy9+L2ZianMvbGliL2ludmFyaWFudC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvVG9rZW5pemVyLmpzIiwid2VicGFjazovLy8uL34vY3NzLWxvYWRlci9saWIvY3NzLWJhc2UuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL2luZGV4LmpzIiwid2VicGFjazovLy8uL34vcHJvcC10eXBlcy9saWIvUmVhY3RQcm9wVHlwZXNTZWNyZXQuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvd2FybmluZy5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvZXZlbnRfaGFuZGxlcnMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9tYXRjaF9rZXlzLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvcGFyc2Vfa2V5cy5qcyIsIndlYnBhY2s6Ly8vLi9+L3N0eWxlLWxvYWRlci9hZGRTdHlsZXMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9TcGVsbEVkaXRvci5qc3giLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy8uL3NyYy9SdWxlU3ludGF4LmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvRXhhbXBsZVN0b3JlLmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BhY2VyLmpzeCIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL1RhYmJhYmxlVGV4dEFyZWEuanN4Iiwid2VicGFjazovLy8uL3NyYy9hcHAvdXRpbC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvbWVtb2l6ZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvdXRpbHMvZ2xvYmFsLmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BhY2VyLmxlc3MiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9zdHlsZXMubGVzcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvY2hlY2tQcm9wVHlwZXMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL2ZhY3RvcnlXaXRoVGhyb3dpbmdTaGltcy5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvZmFjdG9yeVdpdGhUeXBlQ2hlY2tlcnMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvY2xhc3NfZGVjb3JhdG9yLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL2luZGV4LmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL21ldGhvZF9kZWNvcmF0b3IuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvbWV0aG9kX2RlY29yYXRvcl9zY29wZWQuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2luZGV4LmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvYXJyYXkuZnJvbS5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2RvbV9oZWxwZXJzLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvbGlzdGVuZXJzLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvdXVpZC5qcyIsIndlYnBhY2s6Ly8vLi9+L3N0eWxlLWxvYWRlci9maXhVcmxzLmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BhY2VyLmxlc3M/MjJhZSIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL3N0eWxlcy5sZXNzP2IwMTIiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9pbmRleC5qc3giLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2NvcmUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3V0aWxzL3N0cmluZy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvSlNYLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9hbGwuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL2lmLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9saXN0cy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy90eXBlcy5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2tleXMuanMiXSwibmFtZXMiOlsiY29uc29sZSIsImdyb3VwIiwibG9nIiwiZ3JvdXBFbmQiLCJQYXJzZXIiLCJwcm9wZXJ0aWVzIiwiX3J1bGVzIiwiT2JqZWN0IiwiYXNzaWduIiwicnVsZU5hbWUiLCJ0ZXh0IiwiYXJndW1lbnRzIiwibGVuZ3RoIiwidG9rZW5zIiwidG9rZW5pemUiLCJ1bmRlZmluZWQiLCJXaGl0ZXNwYWNlIiwic2xpY2UiLCJwYXJzZVJ1bGVPckRpZSIsInJlc3VsdCIsInBhcnNlIiwiU3ludGF4RXJyb3IiLCJzdHJpbmciLCJ0b1NvdXJjZSIsInN0YXJ0SW5kZXgiLCJzdGFjayIsImNhbGxpbmdDb250ZXh0IiwicnVsZUZvdW5kIiwiaW1wb3J0cyIsImluZGV4IiwicGFyc2VyIiwicmVzdWx0cyIsInJ1bGUiLCJwdXNoIiwicmVkdWNlIiwibGFyZ2VzdCIsIm5leHQiLCJuZXh0U3RhcnQiLCJ0ZXN0Iiwic3RhcnQiLCJlbmQiLCJsaW5lcyIsImZvckVhY2giLCJ0b2tlbiIsImlzSW5kZW50IiwiTkVXTElORSIsIl9pbXBvcnRzIiwiY29uY2F0IiwicmV2ZXJzZSIsIl9faW1wb3J0cyIsIkFycmF5IiwiaXNBcnJheSIsImFkZFJ1bGUiLCJleGlzdGluZyIsIkFsdGVybmF0aXZlcyIsIkRFQlVHIiwicnVsZXMiLCJhcmd1bWVudCIsInJ1bGVJc0xlZnRSZWN1cnNpdmUiLCJsZWZ0UmVjdXJzaXZlIiwibWFwIiwiZ2V0Q29udGV4dE9yRGllIiwiY29udGV4dE5hbWUiLCJSRUdJU1RSWSIsIlR5cGVFcnJvciIsIlNlcXVlbmNlIiwic3VicnVsZSIsIm9wdGlvbmFsIiwiU3VicnVsZSIsInN0YXJ0VG9rZW4iLCJlbmRUb2tlbiIsIm5lc3RpbmciLCJuZXN0ZWQiLCJlbmRJbmRleCIsImxhc3RJbmRleCIsInNwbGl0IiwiY2hhciIsImxpc3QiLCJSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTIiwiam9pbiIsImZsYWdzIiwiUmVnRXhwIiwiZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyIsImNoYXJzIiwiUnVsZSIsInByb3BzIiwiY29uc3RydWN0b3IiLCJibGFja2xpc3QiLCJ3b3JkcyIsIndvcmQiLCJjb250ZXh0IiwibWF0Y2hlZCIsIm5hbWUiLCJpIiwibmV4dFJ1bGUiLCJuZXh0U3RyZWFtIiwiTWF0Y2giLCJtYXRjaCIsImhlYWRTdGFydHNXaXRoIiwiY2xvbmUiLCJtYXRjaERlbGltaXRlciIsIm1hdGNoU3RhcnQiLCJpbmRleE9mIiwibWF0Y2hlcyIsInByb3RvdHlwZSIsIlN5bWJvbCIsIktleXdvcmQiLCJQYXR0ZXJuIiwicGF0dGVybiIsInNvbWUiLCJzb3VyY2UiLCJ0ZXN0UnVsZSIsInN0YWNrQ29udGFpbnMiLCJwcm9tb3RlIiwiYWRkUmVzdWx0cyIsImFyZ05hbWUiLCJrZXlzIiwib3V0cHV0IiwidmFsdWUiLCJrZXkiLCJjb21tZW50IiwiRXhwcmVzc2lvbiIsIlN0YXRlbWVudCIsImJlc3RNYXRjaCIsImdldEJlc3RNYXRjaCIsImJlc3QiLCJjdXJyZW50IiwiUmVwZWF0IiwiaXNDb21wb3VuZFJ1bGUiLCJMaXN0IiwiaXRlbSIsImRlbGltaXRlciIsIlN0YXRlbWVudHMiLCJudW1iZXIiLCJUQUJTIiwic3Vic3RyIiwic3RhdGVtZW50cyIsImxpbmVOdW1iZXIiLCJ0aW1lIiwibGFzdEluZGVudCIsIkJsYW5rTGluZSIsImluZGVudCIsIlRva2VuaXplciIsIk9wZW5CbG9jayIsIkNsb3NlQmxvY2siLCJsYXN0SXRlbSIsImxhc3QiLCJDb21tZW50Iiwic3RhdGVtZW50Iiwid2FybiIsIlBhcnNlRXJyb3IiLCJlcnJvciIsIm1lc3NhZ2UiLCJ1bnBhcnNlZCIsImNsb3NlQmxvY2siLCJnZXRUYWJzIiwidGltZUVuZCIsInByZXZpb3VzIiwib3BlbnNCbG9jayIsImluY2x1ZGVzIiwiZGVmaW5lUHJvcGVydHkiLCJ0cmltIiwiZWF0VG9rZW5zIiwibWF0Y2hUb3BUb2tlbnMiLCJtZXRob2QiLCJjYWxsIiwibWF0Y2hXaGl0ZXNwYWNlIiwibWF0Y2hXb3JkIiwibWF0Y2hOdW1iZXIiLCJtYXRjaE5ld2xpbmUiLCJtYXRjaEpTWEVsZW1lbnQiLCJtYXRjaFRleHQiLCJtYXRjaENvbW1lbnQiLCJtYXRjaFN5bWJvbCIsImVhdFdoaXRlc3BhY2UiLCJ3aGl0ZVNwYWNlRW5kIiwid2hpdGVzcGFjZUVuZCIsIndoaXRlc3BhY2UiLCJldmVyeSIsInNwYWNlIiwiZmlyc3RDaGFyIiwiV09SRF9TVEFSVCIsIldPUkRfQ0hBUiIsIndvcmRFbmQiLCJOVU1CRVJfU1RBUlQiLCJOVU1CRVIiLCJudW1iZXJNYXRjaCIsIm1hdGNoRXhwcmVzc2lvbkF0SGVhZCIsIm51bWJlclN0ciIsInBhcnNlRmxvYXQiLCJxdW90ZVN5bWJvbCIsInRleHRFbmQiLCJxdW90ZWRTdHJpbmciLCJUZXh0IiwiQ09NTUVOVCIsImNvbW1lbnRTdGFydCIsImxpbmUiLCJnZXRMaW5lQXRIZWFkIiwiY29tbWVudE1hdGNoIiwiY29tbWVudFN5bWJvbCIsIm1hdGNoSlNYU3RhcnRUYWciLCJqc3hFbGVtZW50IiwiaXNVbmFyeVRhZyIsIm1hdGNoSlNYQ2hpbGRyZW4iLCJ0YWdOYW1lIiwiY2hpbGRyZW4iLCJjaGlsZEVuZCIsIkpTWF9UQUdfU1RBUlQiLCJ0YWdNYXRjaCIsImVuZEJpdCIsIkpTWEVsZW1lbnQiLCJtYXRjaEpTWEF0dHJpYnV0ZSIsImF0dHJzIiwiYXR0ckVuZCIsImF0dHJpYnV0ZXMiLCJhdHRyc0FzU3RyaW5nIiwiY2hpbGRyZW5Bc1N0cmluZyIsImF0dHIiLCJjaGlsZCIsImVuZFRhZyIsIm1hdGNoSlNYQ2hpbGQiLCJtYXRjaEpTWEVuZFRhZyIsIm1hdGNoSlNYRXhwcmVzc2lvbiIsIm1hdGNoSlNYVGV4dCIsIm1hdGNoU3RyaW5nQXRIZWFkIiwiSlNYX0FUVFJJQlVURV9TVEFSVCIsImVxdWFscyIsImF0dHJpYnV0ZSIsIkpTWEF0dHJpYnV0ZSIsIm1hdGNoSlNYQXR0cmlidXRlVmFsdWUiLCJ2YWx1ZUVuZCIsIm1hdGNoSlNYQXR0cmlidXRlVmFsdWVJZGVudGlmaWVyIiwiSlNYRXhwcmVzc2lvbiIsImZpbmRNYXRjaGluZ0F0SGVhZCIsImNvbnRlbnRzIiwiZXhwcmVzc2lvbiIsIkpTWF9URVhUX0VORF9DSEFSUyIsImZpbmRGaXJzdEF0SGVhZCIsImpzeFRleHQiLCJuZXdsaW5lIiwic3RyaW5nRW5kIiwiaGVhZCIsInN0YXJ0RGVsaW1pdGVyIiwiZW5kRGVsaW1pdGVyIiwiYWZ0ZXJRdW90ZSIsIlNwZWxsRWRpdG9yIiwid2luZG93IiwiZXhhbXBsZXMiLCJsb2FkIiwic3BlbGxFZGl0b3IiLCJzYXZlIiwicmV2ZXJ0IiwiY29tcGlsZSIsImNyZWF0ZSIsImRlbGV0ZSIsInJlbmFtZSIsImR1cGxpY2F0ZSIsInJlc2V0IiwidGl0bGVzIiwic2VsZWN0ZWQiLCJkaXJ0eSIsImNvZGUiLCJvcHRpb25zIiwidGl0bGUiLCJjb250ZW50Iiwib25DbGljayIsInNlbGVjdCIsImRpcnR5QnV0dG9ucyIsInBvc2l0aW9uIiwicmlnaHQiLCJ0b3AiLCJtYXJnaW4iLCJjb21waWxlQnV0dG9uIiwid2lkdGgiLCJsZWZ0IiwiaGVpZ2h0IiwicGFkZGluZ1RvcCIsImV2ZW50IiwidXBkYXRlIiwidGFyZ2V0IiwiQ29tcG9uZW50IiwiZGVmYXVsdFByb3BzIiwiZXhwb3J0cyIsImJpbmQiLCJwYXJzZVJ1bGVTeW50YXgiLCJzeW50YXgiLCJTZXF1ZW5jZUNvbnN0cnVjdG9yIiwic3ludGF4U3RyZWFtIiwidG9rZW5pc2VSdWxlU3ludGF4IiwicGFyc2VSdWxlU3ludGF4X3Rva2VucyIsIlNZTlRBWF9FWFBSRVNTSU9OIiwicGFyc2VSdWxlU3ludGF4X3Rva2VuIiwicG9wIiwic3ludGF4VG9rZW4iLCJwYXJzZVJ1bGVTeW50YXhfc3ltYm9sIiwicGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUiLCJwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMiLCJwYXJzZVJ1bGVTeW50YXhfbGlzdCIsInBhcnNlUnVsZVN5bnRheF9yZXBlYXQiLCJLRVlXT1JEX1BBVFRFUk4iLCJwYXJzZVJ1bGVTeW50YXhfa2V5d29yZCIsImlzRXNjYXBlZCIsInN0YXJ0c1dpdGgiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJhbHRlcm5hdGl2ZXMiLCJncm91cEFsdGVybmF0aXZlcyIsInN5bWJvbCIsInBhcmFtcyIsImJhbmdQb3NpdGlvbiIsIm5vdCIsImRlZmluZVByb3BlcnRpZXMiLCJhZGRTZXF1ZW5jZSIsInJ1bGVTeW50YXgiLCJlIiwiYWRkU3RhdGVtZW50IiwiYWRkRXhwcmVzc2lvbiIsImFkZExpc3QiLCJzdHJlYW0iLCJhZGRLZXl3b3JkIiwiYWRkU3ltYm9sIiwiRXhhbXBsZVN0b3JlIiwibG9jYWxTdG9yYWdlIiwic3BlbGxFZGl0b3JFeGFtcGxlcyIsInNwZWxsRWRpdG9yRXhhbXBsZSIsImxvY2F0aW9uIiwicmVsb2FkIiwiSlNPTiIsIl9zYXZlZEV4YW1wbGVzIiwic3RyaW5naWZ5IiwiZXhhbXBsZSIsInNraXBTYXZlIiwic2hvd0NvbmZpcm0iLCJjb25maXJtIiwicHJvbXB0Iiwib2xkTmFtZSIsIm5ld05hbWUiLCJzZXRUaW1lb3V0IiwiU3BhY2VyIiwiY2xhc3NOYW1lIiwiYXBwZWFyYW5jZSIsInNpemUiLCJpbmxpbmUiLCJmbHVpZCIsInRpbnkiLCJzbWFsbCIsIm1lZGl1bSIsImxhcmdlIiwiaHVnZSIsIm1hc3NpdmUiLCJzcGFjZXJQcm9wcyIsInN0eWxlIiwicHJvcFR5cGVzIiwiYm9vbCIsIlRhYmJhYmxlVGV4dEFyZWEiLCJvbktleURvd24iLCJrZXlDb2RlIiwicHJldmVudERlZmF1bHQiLCJlbGVtZW50Iiwic2VsZWN0aW9uU3RhcnQiLCJzZWxlY3Rpb25FbmQiLCJuZXdUZXh0Iiwic2hpZnRLZXkiLCJsYXN0SW5kZXhPZiIsIm9uQ2hhbmdlIiwiY2xhc3NOYW1lcyIsImFyZ3MiLCJhcmciLCJmaWx0ZXIiLCJCb29sZWFuIiwibWVtb2l6ZWQiLCJkZWZpbmVNZW1vaXplZCIsInByb3BlcnR5IiwiZ2V0dGVyIiwiYXBwbHkiLCJjb25maWd1cmFibGUiLCJnZXQiLCJnbG9iYWxfaWRlbnRpZmllciIsImdsb2JhbCIsInNlbGYiLCJyZW5kZXIiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiZm9yQ29udGV4dCIsIldvcmQiLCJyZXBsYWNlIiwiSWRlbnRpZmllciIsImlkZW50aWZpZXIiLCJhZGRUb0JsYWNrbGlzdCIsIlR5cGUiLCJ0eXBlIiwiTnVtYmVyIiwiTlVNQkVSX05BTUVTIiwiemVybyIsIm9uZSIsInR3byIsInRocmVlIiwiZm91ciIsImZpdmUiLCJzaXgiLCJzZXZlbiIsImVpZ2h0IiwibmluZSIsInRlbiIsImdldE1hdGNoZWRTb3VyY2UiLCJlbmRzV2l0aCIsInBsdXJhbGl6ZSIsImlzUGx1cmFsIiwic2luZ3VsYXJpemUiLCJpc1Npbmd1bGFyIiwiYWxsRXhwb3J0cyIsIlNUUklORyIsIkpTWCIsImpzeEV4cHJlc3Npb25Ub1NvdXJjZSIsImNoaWxkU291cmNlIiwianN4RWxlbWVudFRvU291cmNlIiwianN4RXhwcmVzc2lvbiIsImluZm8iLCJhdHRyc1RvU291cmNlIiwiY2hpbGRyZW5Ub1NvdXJjZSIsImltcG9ydCIsImNvbmRpdGlvbiIsImVsc2VTdGF0ZW1lbnQiLCJ0aGluZyIsIm9yZGluYWwiLCJvcGVyYXRvciIsImJhbmciLCJpdGVtVmFyIiwicG9zaXRpb25WYXIiLCJsaHMiLCJyaHMiLCJ0b0pTIiwicHJlY2VkZW5jZSIsImEiLCJiIiwib2tCdXR0b24iLCJjYW5jZWxCdXR0b24iLCJzdXBlclR5cGUiLCJwcm9wIiwiY2xvc2VzQmxvY2siLCJrZXl3b3JkcyIsInR5cGVzIiwidG9Mb3dlckNhc2UiLCJtZXRob2ROYW1lIiwiY29uZGl0aW9ucyIsIm1hdGNoZWRUZXh0Iiwic2NvcGUiLCJkZWNsYXJhdGlvbiIsInBsdXJhbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQUEsa0NBQWtDLGlDQUFpQyxlQUFlLGVBQWUsZ0JBQWdCLG9CQUFvQixNQUFNLDBDQUEwQywrQkFBK0IsYUFBYSxxQkFBcUIsbUNBQW1DLEVBQUUsRUFBRSxjQUFjLFdBQVcsVUFBVSxFQUFFLFVBQVUsTUFBTSx5Q0FBeUMsRUFBRSxVQUFVLGtCQUFrQixFQUFFLEVBQUUsYUFBYSxFQUFFLDJCQUEyQiwwQkFBMEIsWUFBWSxFQUFFLDJDQUEyQyw4QkFBOEIsRUFBRSxPQUFPLDZFQUE2RSxFQUFFLEdBQUcsRUFBRTs7QUFFcnBCLGtDQUFrQywwQkFBMEIsMENBQTBDLGdCQUFnQixPQUFPLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxPQUFPLHdCQUF3QixFQUFFOztBQUVqTTtBQUNBO0FBQ0E7QUFDQTtBQUNrQjtBQUNsQjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLE9BQU87QUFDcEI7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLEdBQUc7OztBQUdIO0FB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDViw2QkFBNkI7QUFDN0IsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0JBQStCLEtBQUs7QUFDcEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCw0QkFBNEI7QUFDNUIsT0FBTztBQUNQO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUIsc0JBQXNCO0FBQzNDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EscUJBQXFCLDJCQUEyQjtBQUNoRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxxQkFBcUIsZ0NBQWdDO0FBQ3JEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFT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QUFpQztBQUNwRDtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSx5REFBZ0IsZ0g7Ozs7Ozs7O0FDM0VoQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7OztBQUdIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7O0FBR0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOzs7QUFHSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsa0U7Ozs7Ozs7O0FDaEVBO0FBQUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQzs7Ozs7Ozs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3Q0FBd0MsV0FBVyxFQUFFO0FBQ3JELHdDQUF3QyxXQUFXLEVBQUU7O0FBRXJEO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0Esc0NBQXNDO0FBQ3RDLEdBQUc7QUFDSDtBQUNBLDhEQUE4RDtB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dGlvbiAoKSB7IGZ1bmN0aW9uIHNsaWNlSXRlcmF0b3IoYXJyLCBpKSB7IHZhciBfYXJyID0gW107IHZhciBfbiA9IHRydWU7IHZhciBfZCA9IGZhbHNlOyB2YXIgX2UgPSB1bmRlZmluZWQ7IHRyeSB7IGZvciAodmFyIF9pID0gYXJyW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3M7ICEoX24gPSAoX3MgPSBfaS5uZXh0KCkpLmRvbmUpOyBfbiA9IHRydWUpIHsgX2Fyci5wdXNoKF9zLnZhbHVlKTsgaWYgKGkgJiYgX2Fyci5sZW5ndGggPT09IGkpIGJyZWFrOyB9IH0gY2F0Y2ggKGVycikgeyBfZCA9IHRydWU7IF9lID0gZXJyOyB9IGZpbmFsbHkgeyB0cnkgeyBpZiAoIV9uICYmIF9pW1wicmV0dXJuXCJdKSBfaVtcInJldHVyblwiXSgpOyB9IGZpbmFsbHkgeyBpZiAoX2QpIHRocm93IF9lOyB9IH0gcmV0dXJuIF9hcnI7IH0gcmV0dXJuIGZ1bmN0aW9uIChhcnIsIGkpIHsgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgeyByZXR1cm4gYXJyOyB9IGVsc2UgaWYgKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoYXJyKSkgeyByZXR1cm4gc2xpY2VJdGVyYXRvcihhcnIsIGkpOyB9IGVsc2UgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBhdHRlbXB0IHRvIGRlc3RydWN0dXJlIG5vbi1pdGVyYWJsZSBpbnN0YW5jZVwiKTsgfSB9OyB9KCk7XG5cbmZ1bmN0aW9uIF90b0NvbnN1bWFibGVBcnJheShhcnIpIHsgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgeyBmb3IgKHZhciBpID0gMCwgYXJyMiA9IEFycmF5KGFyci5sZW5ndGgpOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7IGFycjJbaV0gPSBhcnJbaV07IH0gcmV0dXJuIGFycjI7IH0gZWxzZSB7IHJldHVybiBBcnJheS5mcm9tKGFycik7IH0gfVxuXG4vKipcbiAqIEBtb2R1bGUgc3RvcmVcbiAqXG4gKi9cbmltcG9ydCB7IGFsbEtleXMgfSBmcm9tICcuL2xpYi9rZXlzJztcbmltcG9ydCBtYXRjaEtleXMgZnJvbSAnLi9saWIvbWF0Y2hfa2V5cyc7XG5pbXBvcnQgcGFyc2VLZXlzIGZyb20gJy4vbGliL3BhcnNlX2tleXMnO1xuaW1wb3J0IHV1aWQgZnJvbSAnLi9saWIvdXVpZCc7XG5cbi8qKlxuICogcHJpdmF0ZVxuICogXG4gKi9cblxuLy8gZGljdCBmb3IgY2xhc3MgcHJvdG90eXBlcyA9PiBiaW5kaW5nc1xudmFyIF9oYW5kbGVycyA9IG5ldyBNYXAoKTtcblxuLy8gYWxsIG1vdW50ZWQgaW5zdGFuY2VzIHRoYXQgaGF2ZSBrZXliaW5kaW5nc1xudmFyIF9pbnN0YW5jZXMgPSBuZXcgU2V0KCk7XG5cbi8vIGZvciB0ZXN0aW5nXG5leHBvcnQgZnVuY3Rpb24gX3Jlc2V0U3RvcmUoKSB7XG4gIF9oYW5kbGVycy5jbGVhcigpO1xuICBfaW5zdGFuY2VzLmNsZWFyKCk7XG59XG5cbi8qKlxuICogcHVibGljXG4gKlxuICovXG5cbnZhciBTdG9yZSA9IHtcblxuICAvKipcbiAgICogYWN0aXZhdGVcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIEluc3RhbnRpYXRlZCBjbGFzcyB0aGF0IGV4dGVuZGVkIFJlYWN0LkNvbXBvbmVudCwgdG8gYmUgZm9jdXNlZCB0byByZWNlaXZlIGtleWRvd24gZXZlbnRzXG4gICAqL1xuICBhY3RpdmF0ZTogZnVuY3Rpb24gYWN0aXZhdGUoaW5zdGFuY2VzKSB7XG4gICAgdmFyIGluc3RhbmNlc0FycmF5ID0gW10uY29uY2F0KGluc3RhbmNlcyk7XG5cbiAgICAvLyBpZiBubyBjb21wb25lbnRzIHdlcmUgZm91bmQgYXMgYW5jZXN0b3JzIG9mIHRoZSBldmVudCB0YXJnZXQsXG4gICAgLy8gZWZmZWN0aXZlbHkgZGVhY3RpdmF0ZSBrZXlkb3duIGhhbmRsaW5nIGJ5IGNhcHBpbmcgdGhlIHNldCBvZiBpbnN0YW5jZXNcbiAgICAvLyB3aXRoIGBudWxsYC5cbiAgICBpZiAoIWluc3RhbmNlc0FycmF5Lmxlbmd0aCkge1xuICAgICAgX2luc3RhbmNlcy5hZGQobnVsbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9pbnN0YW5jZXMuZGVsZXRlKG51bGwpO1xuXG4gICAgICAvLyBkZWxldGluZyBhbmQgdGhlbiBhZGRpbmcgdGhlIGluc3RhbmNlKHMpIGhhcyB0aGUgZWZmZWN0IG9mIHNvcnRpbmcgdGhlIHNldFxuICAgICAgLy8gYWNjb3JkaW5nIHRvIGluc3RhbmNlIGFjdGl2YXRpb24gKGFzY2VuZGluZylcbiAgICAgIGluc3RhbmNlc0FycmF5LmZvckVhY2goZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gICAgICAgIF9pbnN0YW5jZXMuZGVsZXRlKGluc3RhbmNlKTtcbiAgICAgICAgX2luc3RhbmNlcy5hZGQoaW5zdGFuY2UpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIGRlbGV0ZUluc3RhbmNlXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgSW5zdGFudGlhdGVkIGNsYXNzIHRoYXQgZXh0ZW5kZWQgUmVhY3QuQ29tcG9uZW50XG4gICAqIEByZXR1cm4ge2Jvb2xlYW59IFRoZSB2YWx1ZSBzZXQuaGFzKCB0YXJnZXQgKSB3b3VsZCBoYXZlIHJldHVybmVkIHByaW9yIHRvIGRlbGV0aW9uXG4gICAqL1xuICBkZWxldGVJbnN0YW5jZTogZnVuY3Rpb24gZGVsZXRlSW5zdGFuY2UodGFyZ2V0KSB7XG4gICAgX2luc3RhbmNlcy5kZWxldGUodGFyZ2V0KTtcbiAgfSxcbiAgZmluZEJpbmRpbmdGb3JFdmVudDogZnVuY3Rpb24gZmluZEJpbmRpbmdGb3JFdmVudChldmVudCkge1xuICAgIGlmICghX2luc3RhbmNlcy5oYXMobnVsbCkpIHtcbiAgICAgIHZhciBrZXlNYXRjaGVzRXZlbnQgPSBmdW5jdGlvbiBrZXlNYXRjaGVzRXZlbnQoa2V5U2V0KSB7XG4gICAgICAgIHJldHVybiBtYXRjaEtleXMoeyBrZXlTZXQ6IGtleVNldCwgZXZlbnQ6IGV2ZW50IH0pO1xuICAgICAgfTtcblxuICAgICAgLy8gbG9vcCB0aHJvdWdoIGluc3RhbmNlcyBpbiByZXZlcnNlIGFjdGl2YXRpb24gb3JkZXIgc28gdGhhdCBtb3N0XG4gICAgICAvLyByZWNlbnRseSBhY3RpdmF0ZWQgaW5zdGFuY2UgZ2V0cyBmaXJzdCBkaWJzIG9uIGV2ZW50XG4gICAgICB2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWU7XG4gICAgICB2YXIgX2RpZEl0ZXJhdG9yRXJyb3IgPSBmYWxzZTtcbiAgICAgIHZhciBfaXRlcmF0b3JFcnJvciA9IHVuZGVmaW5lZDtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yID0gW10uY29uY2F0KF90b0NvbnN1bWFibGVBcnJheShfaW5zdGFuY2VzKSkucmV2ZXJzZSgpW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXA7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IChfc3RlcCA9IF9pdGVyYXRvci5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZSkge1xuICAgICAgICAgIHZhciBpbnN0YW5jZSA9IF9zdGVwLnZhbHVlO1xuXG4gICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5nKGluc3RhbmNlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG4gICAgICAgICAgdmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZTtcbiAgICAgICAgICB2YXIgX2RpZEl0ZXJhdG9yRXJyb3IyID0gZmFsc2U7XG4gICAgICAgICAgdmFyIF9pdGVyYXRvckVycm9yMiA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmb3IgKHZhciBfaXRlcmF0b3IyID0gYmluZGluZ3NbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDI7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSAoX3N0ZXAyID0gX2l0ZXJhdG9yMi5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IHRydWUpIHtcbiAgICAgICAgICAgICAgdmFyIF9zdGVwMiR2YWx1ZSA9IF9zbGljZWRUb0FycmF5KF9zdGVwMi52YWx1ZSwgMiksXG4gICAgICAgICAgICAgICAgICBrZXlTZXRzID0gX3N0ZXAyJHZhbHVlWzBdLFxuICAgICAgICAgICAgICAgICAgZm4gPSBfc3RlcDIkdmFsdWVbMV07XG5cbiAgICAgICAgICAgICAgaWYgKGFsbEtleXMoa2V5U2V0cykgfHwga2V5U2V0cy5zb21lKGtleU1hdGNoZXNFdmVudCkpIHtcbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gd2hlbiBtYXRjaGluZyBrZXliaW5kaW5nIGlzIGZvdW5kIC0gaS5lLiBvbmx5IG9uZVxuICAgICAgICAgICAgICAgIC8vIGtleWJvdW5kIGNvbXBvbmVudCBjYW4gcmVzcG9uZCB0byBhIGdpdmVuIGtleSBjb2RlLiB0byBnZXQgYXJvdW5kIHRoaXMsXG4gICAgICAgICAgICAgICAgLy8gc2NvcGUgYSBjb21tb24gYW5jZXN0b3IgY29tcG9uZW50IGNsYXNzIHdpdGggQGtleWRvd24gYW5kIHVzZVxuICAgICAgICAgICAgICAgIC8vIEBrZXlkb3duU2NvcGVkIHRvIGJpbmQgdGhlIGR1cGxpY2F0ZSBrZXlzIGluIHlvdXIgY2hpbGQgY29tcG9uZW50c1xuICAgICAgICAgICAgICAgIC8vIChvciBqdXN0IGluc3BlY3QgbmV4dFByb3BzLmtleWRvd24uZXZlbnQpLlxuICAgICAgICAgICAgICAgIHJldHVybiB7IGZuOiBmbiwgaW5zdGFuY2U6IGluc3RhbmNlIH07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIF9kaWRJdGVyYXRvckVycm9yMiA9IHRydWU7XG4gICAgICAgICAgICBfaXRlcmF0b3JFcnJvcjIgPSBlcnI7XG4gICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgJiYgX2l0ZXJhdG9yMi5yZXR1cm4pIHtcbiAgICAgICAgICAgICAgICBfaXRlcmF0b3IyLnJldHVybigpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICBpZiAoX2RpZEl0ZXJhdG9yRXJyb3IyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3IyO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgX2RpZEl0ZXJhdG9yRXJyb3IgPSB0cnVlO1xuICAgICAgICBfaXRlcmF0b3JFcnJvciA9IGVycjtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uICYmIF9pdGVyYXRvci5yZXR1cm4pIHtcbiAgICAgICAgICAgIF9pdGVyYXRvci5yZXR1cm4oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgaWYgKF9kaWRJdGVyYXRvckVycm9yKSB7XG4gICAgICAgICAgICB0aHJvdyBfaXRlcmF0b3JFcnJvcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG5cblxuICAvKipcbiAgICogZ2V0QmluZGluZ1xuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IENsYXNzIHVzZWQgYXMga2V5IGluIGRpY3Qgb2Yga2V5IGJpbmRpbmdzXG4gICAqIEByZXR1cm4ge29iamVjdH0gVGhlIG9iamVjdCBjb250YWluaW5nIGJpbmRpbmdzIGZvciB0aGUgZ2l2ZW4gY2xhc3NcbiAgICovXG4gIGdldEJpbmRpbmc6IGZ1bmN0aW9uIGdldEJpbmRpbmcoX3JlZikge1xuICAgIHZhciBfX3JlYWN0S2V5ZG93blVVSUQgPSBfcmVmLl9fcmVhY3RLZXlkb3duVVVJRDtcblxuICAgIHJldHVybiBfaGFuZGxlcnMuZ2V0KF9fcmVhY3RLZXlkb3duVVVJRCk7XG4gIH0sXG5cblxuICAvKipcbiAgICogZ2V0SW5zdGFuY2VzXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqIEByZXR1cm4ge3NldH0gQWxsIHN0b3JlZCBpbnN0YW5jZXMgKGFsbCBtb3VudGVkIGNvbXBvbmVudCBpbnN0YW5jZXMgd2l0aCBrZXliaW5kaW5ncylcbiAgICovXG4gIGdldEluc3RhbmNlczogZnVuY3Rpb24gZ2V0SW5zdGFuY2VzKCkge1xuICAgIHJldHVybiBfaW5zdGFuY2VzO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIGlzRW1wdHlcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICogQHJldHVybiB7bnVtYmVyfSBTaXplIG9mIHRoZSBzZXQgb2YgYWxsIHN0b3JlZCBpbnN0YW5jZXNcbiAgICovXG4gIGlzRW1wdHk6IGZ1bmN0aW9uIGlzRW1wdHkoKSB7XG4gICAgcmV0dXJuICFfaW5zdGFuY2VzLnNpemU7XG4gIH0sXG5cblxuICAvKipcbiAgICogc2V0QmluZGluZ1xuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAcGFyYW0ge29iamVjdH0gYXJncyBBbGwgYXJndW1lbnRzIG5lY2Vzc2FyeSB0byBzZXQgdGhlIGJpbmRpbmdcbiAgICogQHBhcmFtIHthcnJheX0gYXJncy5rZXlzIEtleSBjb2RlcyB0aGF0IHNob3VsZCB0cmlnZ2VyIHRoZSBmblxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBhcmdzLmZuIFRoZSBjYWxsYmFjayB0byBiZSB0cmlnZ2VyZWQgd2hlbiBnaXZlbiBrZXlzIGFyZSBwcmVzc2VkXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzLnRhcmdldCBUaGUgZGVjb3JhdGVkIGNsYXNzXG4gICAqL1xuICBzZXRCaW5kaW5nOiBmdW5jdGlvbiBzZXRCaW5kaW5nKF9yZWYyKSB7XG4gICAgdmFyIGtleXMgPSBfcmVmMi5rZXlzLFxuICAgICAgICBmbiA9IF9yZWYyLmZuLFxuICAgICAgICB0YXJnZXQgPSBfcmVmMi50YXJnZXQ7XG5cbiAgICB2YXIga2V5U2V0cyA9IGtleXMgPyBwYXJzZUtleXMoa2V5cykgOiBhbGxLZXlzKCk7XG4gICAgdmFyIF9fcmVhY3RLZXlkb3duVVVJRCA9IHRhcmdldC5fX3JlYWN0S2V5ZG93blVVSUQ7XG5cbiAgICBpZiAoIV9fcmVhY3RLZXlkb3duVVVJRCkge1xuICAgICAgdGFyZ2V0Ll9fcmVhY3RLZXlkb3duVVVJRCA9IHV1aWQoKTtcbiAgICAgIF9oYW5kbGVycy5zZXQodGFyZ2V0Ll9fcmVhY3RLZXlkb3duVVVJRCwgbmV3IE1hcChbW2tleVNldHMsIGZuXV0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgX2hhbmRsZXJzLmdldChfX3JlYWN0S2V5ZG93blVVSUQpLnNldChrZXlTZXRzLCBmbik7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBTdG9yZTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9zdG9yZS5qc1xuLy8gbW9kdWxlIGlkID0gMTAwXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIFNwZWxsIFwicGFyc2VyXCIgY2xhc3MuXG4vL1xuXG4vLyBUT0RPOiBkZXBlbmRlbmN5LWluamVjdCB0b2tlbml6ZXI/XG5pbXBvcnQgVG9rZW5pemVyIGZyb20gXCIuL1Rva2VuaXplci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdC8vIENvbnN0cnVjdG9yLlxuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblx0fVxuXG4vL1xuLy8jIyMgUGFyc2luZ1xuLy9cblx0Ly8gUGFyc2UgYHJ1bGVOYW1lYCBydWxlIGF0IGhlYWQgb2YgYHRleHRgLlxuXHQvLyBJZiB5b3UgcGFzcyBvbmx5IG9uZSBhcmd1bWVudCwgd2UnbGwgYXNzdW1lIHRoYXQncyBgdGV4dGAgYW5kIHlvdSB3YW50IHRvIG1hdGNoIGBzdGF0ZW1lbnRzYC5cblx0Ly8gSGFuZGxlcyBvcHRpb25hbCBhbmQgcmVwZWF0aW5nIHJ1bGVzIGFzIHdlbGwgYXMgZWF0aW5nIHdoaXRlc3BhY2UuXG5cdC8vIFJldHVybnMgcmVzdWx0IG9mIHBhcnNlLlxuLy9URVNUTUVcblx0cGFyc2UocnVsZU5hbWUsIHRleHQpIHtcblx0XHQvLyBJZiBvbmx5IG9uZSBhcmd1bWVudCwgYXNzdW1lIHRoYXQncyB0aGUgdGV4dCBhbmQgcGFyc2UgYHN0YXRlbWVudHNgXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHRleHQgPSBydWxlTmFtZTtcblx0XHRcdHJ1bGVOYW1lID0gXCJzdGF0ZW1lbnRzXCI7XG5cdFx0fVxuXG5cdFx0Ly8gQ29udmVydCB0byB0b2tlbnMuXG5cdFx0bGV0IHRva2VucyA9IHRoaXMudG9rZW5pemUodGV4dCk7XG5cdFx0Ly8gQmFpbCBpZiB3ZSBkaWRuJ3QgZ2V0IGFueSB0b2tlbnMgYmFjay5cbi8vVE9ETzogV0FSTj8gIEVSUk9SP1xuXHRcdGlmICh0b2tlbnMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIElmIHdlJ3JlIG5vdCBwYXJzaW5nIGBzdGF0ZW1lbnRzYCwgdXNlIG9ubHkgdGhlIGZpcnN0IGxpbmUgYW5kIHBvcCBvZmYgaW5kZW50YXRpb24uXG5cdFx0aWYgKHJ1bGVOYW1lICE9PSBcInN0YXRlbWVudHNcIikge1xuXHRcdFx0dG9rZW5zID0gdG9rZW5zWzBdO1xuXHRcdFx0Ly8gcmVtb3ZlIHdoaXRlc3BhY2UgZnJvbSB0aGUgc3RhcnQgb2YgdGhlIGxpbmVcblx0XHRcdGlmICh0b2tlbnNbMF0gaW5zdGFuY2VvZiBUb2tlbml6ZXIuV2hpdGVzcGFjZSkgdG9rZW5zID0gdG9rZW5zLnNsaWNlKDEpO1xuXHRcdH1cblxuXHRcdC8vIFBhcnNlIHRoZSBydWxlIG9yIHRocm93IGFuIGV4Y2VwdGlvbiBpZiBydWxlIG5vdCBmb3VuZC5cblx0XHRyZXR1cm4gdGhpcy5wYXJzZVJ1bGVPckRpZShydWxlTmFtZSwgdG9rZW5zLCAwLCB1bmRlZmluZWQsIFwicGFyc2VyLnBhcnNlKClcIik7XG5cdH1cblxuXG5cblx0Ly8gUGFyc2Ugc29tZXRoaW5nOlxuXHQvL1x0LSBpZiBvbmUgc3RyaW5nIGFyZ3VtZW50LCBkb2VzIGEgYGNvbXBpbGVTdGF0ZW1lbnRzKClgXG5cdC8vIFJldHVybnMgdGhlIGB0b1N0cmluZygpYCBvciB0aHJvd3MuXG4vL1RFU1RNRVxuXHRjb21waWxlKHJ1bGVOYW1lLCB0ZXh0KSB7XG5cdFx0Ly8gSWYgb25seSBvbmUgYXJndW1lbnQsIGFzc3VtZSB0aGF0J3MgdGhlIHRleHQgYW5kIHBhcnNlIGBzdGF0ZW1lbnRzYFxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHR0ZXh0ID0gcnVsZU5hbWU7XG5cdFx0XHRydWxlTmFtZSA9IFwic3RhdGVtZW50c1wiO1xuXHRcdH1cblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5wYXJzZShydWxlTmFtZSwgdGV4dCk7XG5cdFx0aWYgKCFyZXN1bHQpIHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2VyLnBhcnNlKCcke3J1bGVOYW1lfScsICcke3N0cmluZ30nKTogY2FuJ3QgcGFyc2UgdGhpc2ApO1xuXHRcdHJldHVybiByZXN1bHQudG9Tb3VyY2UodGhpcyk7XG5cdH1cblxuXG5cdC8vIFBhcnNlIGEgbmFtZWQgcnVsZSAoZGVmaW5lZCBpbiB0aGlzIHBhcnNlciBvciBpbiBhbnkgb2Ygb3VyIGBpbXBvcnRzYCksIHJldHVybmluZyB0aGUgXCJiZXN0XCIgbWF0Y2guXG5cdC8vIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgbm8gbWF0Y2guXG5cdC8vIFRocm93cyBpZiBOT0JPRFkgaW1wbGVtZW50cyBgcnVsZU5hbWVgLlxuXHQvL1xuXHQvLyBOT1RFOiBjdXJyZW50bHkgXCJiZXN0XCIgaXMgZGVmaW5lZCBhcyB0aGUgZmlyc3QgcnVsZSBpbiBvdXIgYGltcG9ydHNgIHdoaWNoIG1hdGNoZXMuLi5cblx0cGFyc2VSdWxlT3JEaWUocnVsZU5hbWUsIHRva2Vucywgc3RhcnRJbmRleCwgc3RhY2ssIGNhbGxpbmdDb250ZXh0ID0gXCJwYXJzZVJ1bGVPckRpZVwiKSB7XG5cdFx0Ly8gS2VlcCB0cmFjayBvZiB3aGV0aGVyIHJ1bGUgd2FzIEVWRVIgZm91bmQgb3Igbm90LlxuXHRcdGxldCBydWxlRm91bmQgPSBmYWxzZTtcblx0XHRsZXQgaW1wb3J0cyA9IHRoaXMuaW1wb3J0cywgaW5kZXggPSAwLCBwYXJzZXI7XG5cdFx0bGV0IHJlc3VsdHMgPSBbXTtcblx0XHR3aGlsZSAocGFyc2VyID0gaW1wb3J0c1tpbmRleCsrXSkge1xuXHRcdFx0bGV0IHJ1bGUgPSBwYXJzZXIuX3J1bGVzW3J1bGVOYW1lXTtcblx0XHRcdGlmICghcnVsZSkgY29udGludWU7XG5cdFx0XHRjb25zdCByZXN1bHQgPSBydWxlLnBhcnNlKHRoaXMsIHRva2Vucywgc3RhcnRJbmRleCwgc3RhY2spO1xuXHRcdFx0aWYgKHJlc3VsdCkgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cdFx0XHRydWxlRm91bmQgPSB0cnVlO1xuXHRcdH1cblx0XHQvLyBJZiBuZXZlciBmb3VuZCwgdGhyb3cuXG5cdFx0aWYgKCFydWxlRm91bmQpIHRocm93IG5ldyBTeW50YXhFcnJvcihgJHtjYWxsaW5nQ29udGV4dH06IHJ1bGUgJyR7cnVsZU5hbWV9JyBub3QgZm91bmRgKTtcblxuXHRcdC8vIElmIG5vIG1hdGNoLCByZXR1cm4gdW5kZWZpbmVkLlxuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIElmIGV4YWN0bHkgb25lIG1hdGNoLCByZXR1cm4gdGhhdC5cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDEpIHJldHVybiByZXN1bHRzWzBdO1xuXG5cdFx0Ly8gT3RoZXJ3aXNlIHJldHVybiB0aGUgbG9uZ2VzdCBtYXRjaC5cblx0XHRyZXR1cm4gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKGxhcmdlc3QsIG5leHQpIHtcblx0XHRcdGlmIChuZXh0Lm5leHRTdGFydCA+IGxhcmdlc3QubmV4dFN0YXJ0KSByZXR1cm4gbmV4dDtcblx0XHRcdHJldHVybiBsYXJnZXN0O1xuXHRcdH0sIHJlc3VsdHNbMF0pO1xuXHR9XG5cblx0Ly8gVGVzdCB3aGV0aGVyIGEgbmFtZWQgcnVsZSBNSUdIVCBiZSBmb3VuZCBpbiBoZWFkIG9mIHN0cmVhbS5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gYHRydWVgIGlmIHRoZSBydWxlIE1JR0hUIGJlIG1hdGNoZWQuXG5cdC8vXHQtIGBmYWxzZWAgaWYgdGhlcmUgaXMgbm8gd2F5IHRoZSBydWxlIGNhbiBiZSBtYXRjaGVkLlxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljIChlZzogbm8gd2F5IHRvIHRlbGwgcXVpY2tseSkuXG5cdHRlc3RSdWxlKHJ1bGVOYW1lLCB0b2tlbnMsIHN0YXJ0SW5kZXgpIHtcblx0XHRsZXQgaW1wb3J0cyA9IHRoaXMuaW1wb3J0cywgaW5kZXggPSAwLCBwYXJzZXI7XG5cdFx0d2hpbGUgKHBhcnNlciA9IGltcG9ydHNbaW5kZXgrK10pIHtcblx0XHRcdGxldCBydWxlID0gcGFyc2VyLl9ydWxlc1tydWxlTmFtZV07XG5cdFx0XHRpZiAoIXJ1bGUpIGNvbnRpbnVlO1xuXHRcdFx0bGV0IHJlc3VsdCA9IHJ1bGUudGVzdCh0aGlzLCB0b2tlbnMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fVxuXG5cbi8vXG4vLyMjIyBUb2tlbml6aW5nXG4vL1xuXG5cdC8vIEdpdmVuIGFuIGFyYml0YXJhcnkgYHRleHRgIHN0cmluZywgdG9rZW5pemUgaXQgYW5kIHJldHVybiBhcyBhbiBhcnJheSBvZiBhcnJheXMgb2YgbGluZXMuXG5cdC8vIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgcmVzdWx0IGRpZG4ndCBwcm9kdWNlIGFueSB0b2tlbnMuXG4vL1RPRE86IGB0b2tlbml6ZWAgcmV0dXJucyB0b2tlbnNFbmQsIGNvbXBsYWluIGlmIGB0b2tlbnNFbmQgIT09IGVuZGAuXG4vL1RFU1RNRVxuXHR0b2tlbml6ZSh0ZXh0LCBzdGFydCwgZW5kKSB7XG5cdFx0bGV0IHRva2VucyA9IFRva2VuaXplci50b2tlbml6ZSh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRpZiAoIXRva2VucyB8fCB0b2tlbnMubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gQ29udmVydCB0byBsaW5lcy5cblx0XHRsZXQgbGluZXMgPSBbW11dO1xuXHRcdHRva2Vucy5mb3JFYWNoKHRva2VuID0+IHtcblx0XHRcdC8vIFNraXAgd2hpdGVzcGFjZSB3aGljaCBpcyBub3QgYW4gaW5kZW50LlxuXHRcdFx0aWYgKHRva2VuIGluc3RhbmNlb2YgVG9rZW5pemVyLldoaXRlc3BhY2UgJiYgIXRva2VuLmlzSW5kZW50KSByZXR1cm47XG5cblx0XHRcdC8vIGFkZCBuZXcgYXJyYXkgZm9yIGVhY2ggbmV3bGluZVxuXHRcdFx0aWYgKHRva2VuID09PSBUb2tlbml6ZXIuTkVXTElORSkgcmV0dXJuIGxpbmVzLnB1c2goW10pO1xuXG5cdFx0XHQvLyBvdGhlcndpc2UganVzdCBhZGQgdG8gdGhlIGxhc3QgbGluZVxuXHRcdFx0bGluZXNbbGluZXMubGVuZ3RoIC0gMV0ucHVzaCh0b2tlbik7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGxpbmVzO1xuXHR9XG5cblxuLy9cbi8vICMjIyBcdEltcG9ydHNcbi8vXHRcdFBhcnNlcnMgZGVwZW5kIG9uIG90aGVyIHBhcnNlcnMgZm9yIHRoZWlyIGBydWxlc2AuXG4vL1x0XHRJbXBvcnRzIGFyZSBsYXp5LWJvdW5kIChhbmQgd2UgYXNzdW1lIHRoZSBidWlsZCBmaWxlIHdpbGwgaW5jbHVkZSBhbGwgbmVjZXNzYXJ5IGltcG9ydHMpLlxuLy9cblxuXHQvLyBBZGQgb25lIG9yIG1vcmUgbmFtZWQgaW1wb3J0cyB0byB0aGlzIHBhcnNlci5cblx0Ly8gSW1wb3J0cyBpbmNyZWFzZSBpbiBwcmlvcml0eSB0aGUgbGF0ZXIgdGhleSBhcmUgaW4gdGhlIGxpc3QuXG5cdGltcG9ydCguLi5pbXBvcnRzKSB7XG5cdFx0Ly8gUkVWRVJTRSB0aGUgbGlzdCBvZiBpbXBvcnRzLCBzbyB0aGUgbW9zdCBnZW5lcmFsIG9uZSBpcyBMQVNUXG5cdFx0Ly8gVGh1cyBtb3JlIHNwZWNpZmljIGltcG9ydHMgd2lsbCBiZSBFQVJMSUVSIGluIHRoZSBgaW1wb3J0c2AgbGlzdC5cblxuXHRcdC8vIENyZWF0ZSBuZXcgYXJyYXkgb2YgaW1wb3J0cyBhbmQgYWRkIGltcG9ydCBuYW1lcyBwYXNzZWQgaW4uXG5cdFx0dGhpcy5faW1wb3J0cyA9ICh0aGlzLl9pbXBvcnRzIHx8IFtdKS5jb25jYXQoaW1wb3J0cy5yZXZlcnNlKCkpO1xuXHRcdC8vIGNsZWFyIG1lbW9pemUgdmFyaWFibGUgZm9yIGBpbXBvcnRzYC5cblx0XHRkZWxldGUgdGhpcy5fX2ltcG9ydHM7XG5cdH1cblxuXHQvLyBHZXR0ZXIgdG8gcmV0dXJuIGxpc3Qgb2Ygb3VyIGBpbXBvcnRzYCBhcyBgUGFyc2VyYCBvYmplY3RzLCBJTkNMVURJTkcgYHRoaXNgIHBhcnNlciBpdHNlbGYhXG5cdC8vIE1vc3Qgc3BlY2lmaWMgaW1wb3J0IChlZzogb3Vyc2VsZikgaXMgZmlyc3QgaW4gdGhlIGxpc3QuXG5cdC8vIFRocm93cyBpZiBhbiBpbXBvcnQgY2FuJ3QgYmUgZm91bmQuXG5cdGdldCBpbXBvcnRzKCkge1xuXHRcdGlmICghdGhpcy5fX2ltcG9ydHMpIHtcblx0XHRcdHZhciBpbXBvcnRzID0gKHRoaXMuX2ltcG9ydHMgPyB0aGlzLl9pbXBvcnRzLm1hcChQYXJzZXIuZ2V0Q29udGV4dE9yRGllKSA6IFtdKTtcblx0XHRcdHRoaXMuX19pbXBvcnRzID0gW3RoaXNdLmNvbmNhdChpbXBvcnRzKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX19pbXBvcnRzO1xuXHR9XG5cblxuLy9cbi8vICMjIyBSdWxlc1xuLy9cblx0Ly8gU3RhcnQgd2l0aCBhbiBlbXB0eSBtYXAgb2YgcnVsZXMuXG5cdF9ydWxlcyA9IHt9O1xuXG5cdC8vIEFkZCBhIGBydWxlYCB0byBvdXIgbGlzdCBvZiBydWxlcyFcblx0Ly8gQ29udmVydHMgdG8gYGFsdGVybmF0aXZlc2Agb24gcmUtZGVmaW5pbmcgdGhlIHNhbWUgcnVsZS5cblx0YWRkUnVsZShydWxlTmFtZSwgcnVsZSkge1xuXHRcdC8vIElmIHBhc3NlZCBhIGZ1bmN0aW9uLCBjcmVhdGUgYW4gaW5zdGFuY2UgZm9yIHRoZSBhY3R1YWwgcnVsZS5cblx0XHQvLyBUaGlzIGlzIGNvbW1vbmx5IGRvbmUgc28gSlMgd2lsbCBnaXZlIHVzIG1lYW5pbmdmdWwgY2xhc3MgbmFtZXMgaW4gZGVidWcgb3V0cHV0LlxuXHRcdGlmICh0eXBlb2YgcnVsZSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRydWxlID0gbmV3IHJ1bGUoKTtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSBnb3QgYW4gYXJyYXkgb2YgYHJ1bGVOYW1lc2AsIHJlY3Vyc2l2ZWx5IGFkZCB1bmRlciBlYWNoIG5hbWUgd2l0aCB0aGUgc2FtZSBgcnVsZWAuXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZU5hbWUpKSB7XG5cdFx0XHRydWxlTmFtZS5mb3JFYWNoKHJ1bGVOYW1lID0+IHRoaXMuYWRkUnVsZShydWxlTmFtZSwgcnVsZSkgKTtcblx0XHRcdHJldHVybiBydWxlO1xuXHRcdH1cblxuXHRcdC8vIFNldCBgcnVsZU5hbWVgIGlmIGl0IGhhc24ndCBiZWVuIGV4cGxpY2l0bHkgc2V0LlxuXHRcdGlmICghcnVsZS5ydWxlTmFtZSkgcnVsZS5ydWxlTmFtZSA9IHJ1bGVOYW1lO1xuXG5cdFx0Ly8gSWYgYSBydWxlIG9mIHRoaXMgbmFtZSBhbHJlYWR5IGV4aXN0c1xuXHRcdGNvbnN0IGV4aXN0aW5nID0gdGhpcy5fcnVsZXNbcnVsZU5hbWVdO1xuXHRcdGlmIChleGlzdGluZykge1xuXHRcdFx0Ly8gQ29udmVydCB0byBhbiBgQWx0ZXJuYXRpdmVzYCBpZiBub3Qgb25lIGFscmVhZHkuXG5cdFx0XHRpZiAoIShleGlzdGluZyBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzKSkge1xuXHRcdFx0XHRpZiAoUGFyc2VyLkRFQlVHKSBjb25zb2xlLmxvZyhgQ29udmVydGluZyBydWxlICcke3J1bGVOYW1lfScgdG8gYWx0ZXJuYXRpdmVzYCk7XG5cdFx0XHRcdHRoaXMuX3J1bGVzW3J1bGVOYW1lXSA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVOYW1lLCBydWxlczogW2V4aXN0aW5nXSB9KTtcblx0XHRcdFx0Ly8gY29weSBhcmd1bWVudCBuYW1lIG92ZXIgKD8/Pylcblx0XHRcdFx0aWYgKGV4aXN0aW5nLmFyZ3VtZW50KSB0aGlzLl9ydWxlc1tydWxlTmFtZV0uYXJndW1lbnQgPSBleGlzdGluZy5hcmd1bWVudDtcblx0XHRcdH1cblx0XHRcdGlmIChQYXJzZXIuREVCVUcpIGNvbnNvbGUubG9nKGBBZGRpbmcgcnVsZSAnJHtydWxlLnJ1bGVOYW1lfScgdG8gJyR7cnVsZU5hbWV9JzogYCwgcnVsZSk7XG5cdFx0XHQvLyBBZGQgcnVsZSB0byB0aGUgYWx0ZXJuYXRpdmVzLlxuXHRcdFx0dGhpcy5fcnVsZXNbcnVsZU5hbWVdLmFkZFJ1bGUocnVsZSk7XG5cdFx0fVxuXHRcdC8vIE90aGVyd2lzZSBqdXN0IHJlbWVtYmVyIHRoZSBydWxlLlxuXHRcdGVsc2Uge1xuXHRcdFx0dGhpcy5fcnVsZXNbcnVsZU5hbWVdID0gcnVsZTtcblx0XHR9XG5cblxuXHRcdC8vIG1ha2UgYSBub3RlIGlmIHdlJ3JlIGFkZGluZyBhIGxlZnQtcmVjdXJzaXZlIHJ1bGVcbi8vVE9ETzogdGhpcyBkb2Vzbid0IGZseSBpZiBhZGRpbmcgdW5kZXIgbXVsdGlwbGUgbmFtZXMuLi4gIDotKFxuXHRcdGlmIChQYXJzZXIucnVsZUlzTGVmdFJlY3Vyc2l2ZShydWxlTmFtZSwgcnVsZSkpIHtcbi8vY29uc29sZS5pbmZvKFwibWFya2luZyBcIiwgcnVsZSwgXCIgYXMgbGVmdCByZWN1cnNpdmUhXCIpO1xuXHRcdFx0cnVsZS5sZWZ0UmVjdXJzaXZlID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcnVsZTtcblx0fVxuXG5cbi8vXG4vLyAjIyMgUGFyc2VyIHJlZ2lzdHJ5LlxuLy9cblx0c3RhdGljIFJFR0lTVFJZID0ge307XG5cblx0Ly8gR2V0IGEgcGFyc2VyIGZvciBhIGdpdmVuIGBjb250ZXh0TmFtZWAuXG5cdC8vIFdpbGwgcmUtdXNlIGV4aXN0aW5nIHBhcnNlciwgb3IgY3JlYXRlIGEgbmV3IG9uZSBpZiBub3QgYWxyZWFkeSBkZWZpbmVkLlxuXHRzdGF0aWMgZm9yQ29udGV4dChjb250ZXh0TmFtZSkge1xuXHRcdGlmICghUGFyc2VyLlJFR0lTVFJZW2NvbnRleHROYW1lXSkge1xuXHRcdFx0UGFyc2VyLlJFR0lTVFJZW2NvbnRleHROYW1lXSA9IG5ldyBQYXJzZXIoeyBjb250ZXh0TmFtZSB9KTtcblx0XHR9XG5cdFx0cmV0dXJuIFBhcnNlci5SRUdJU1RSWVtjb250ZXh0TmFtZV07XG5cdH1cblxuXHQvLyBSZXR1cm4gYSBwYXJzZXIgZm9yIGBjb250ZXh0TmFtZWAgb3IgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIG5vdCBmb3VuZC5cblx0c3RhdGljIGdldENvbnRleHRPckRpZShjb250ZXh0TmFtZSkge1xuXHRcdGlmIChQYXJzZXIuUkVHSVNUUllbY29udGV4dE5hbWVdKSByZXR1cm4gUGFyc2VyLlJFR0lTVFJZW2NvbnRleHROYW1lXTtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBQYXJzZXIuZ2V0Q29udGV4dE9yRGllKCk6IGNvbnRleHROYW1lICcke2NvbnRleHROYW1lfScgbm90IGZvdW5kLmApO1xuXHR9XG5cblxuXG4vL1xuLy8gIyMgVXRpbGl0eSBtZXRob2RzXG4vL1xuXG5cdC8vIElzIHRoZSBzcGVjaWZpZWQgcnVsZSBsZWZ0LXJlY3Vyc2l2ZT9cblx0Ly8gVHJ1ZSBmb3Igc2VxdWVuY2VzIHdoZXJlIHRoZSBmaXJzdCBub24tb3B0aW9uYWwgcnVsZSByZWN1cnNpdmVseSBjYWxscyBgcnVsZU5hbWVgLlxuXHRzdGF0aWMgcnVsZUlzTGVmdFJlY3Vyc2l2ZShydWxlTmFtZSwgcnVsZSkge1xuXHRcdGlmICghKHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlKSB8fCAhcnVsZS5ydWxlcykgcmV0dXJuIGZhbHNlO1xuLy9jb25zb2xlLmxvZyhydWxlTmFtZSwgcnVsZSk7XG5cdFx0bGV0IGluZGV4ID0gMCwgc3VicnVsZSA9IHVuZGVmaW5lZDtcblx0XHR3aGlsZSAoc3VicnVsZSA9IHJ1bGUucnVsZXNbaW5kZXgrK10pIHtcblx0XHRcdC8vIGlnbm9yZSBvcHRpb25hbCBydWxlc1xuXHRcdFx0aWYgKHN1YnJ1bGUub3B0aW9uYWwpIGNvbnRpbnVlO1xuXHRcdFx0aWYgKHN1YnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN1YnJ1bGUgJiYgc3VicnVsZS5ydWxlID09PSBydWxlTmFtZSkgcmV0dXJuIHRydWU7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIEZpbmQgdGhlIG1hdGNoaW5nIGluc3RhbmNlIG9mIHBvc3NpYmx5IG5lc3RlZCBgZW5kVG9rZW5gIHRvIGJhbGFuY2UgYHN0YXJ0VG9rZW5gXG5cdC8vXHRpbiBhcnJheSBvZiBgdG9rZW5zYCAoc3RyaW5ncykuXG5cdC8vIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgYHsgc3RhcnRJbmRleCwgZW5kSW5kZXgsIHNsaWNlIH1gXG5cdC8vIFRocm93cyBpZiB1bnN1Y2Vzc2Z1bC5cblx0c3RhdGljIGZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBzdGFydFRva2VuLCBlbmRUb2tlbiwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRpZiAodG9rZW5zW3N0YXJ0SW5kZXhdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0SW5kZXh9IG9mIHRva2Vuc2ApO1xuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgbmVzdGVkID0gZmFsc2U7XG5cdFx0Zm9yIChsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kSW5kZXggPCBsYXN0SW5kZXg7IGVuZEluZGV4KyspIHtcblx0XHRcdGxldCB0b2tlbiA9IHRva2Vuc1tlbmRJbmRleF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydEluZGV4LCBlbmRJbmRleCwgc2xpY2U6IHRva2Vucy5zbGljZShzdGFydEluZGV4KzEsIGVuZEluZGV4KSwgbmVzdGVkIH07XG5cdFx0XHRcdG5lc3RpbmctLTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBDb3VsZG4ndCBmaW5kIG1hdGNoaW5nICcke2VuZFRva2VufSdzIHN0YXJ0aW5nIGF0IGl0ZW0gJHtzdGFydEluZGV4fWApO1xuXHR9XG5cblxuXHQvLyBMaXN0IG9mIHNwZWNpYWwgY2hhcmFjdGVycyBpbiByZWd1bGFyIGV4cHJlc3Npb25zLlxuXHQvLyBVc2VkIHRvIGVzY2FwZSB0aG9zZSBjaGFycyB3aGVuIGNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbnMgZnJvbSBzdHJpbmdzLlxuXHRzdGF0aWMgUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyA9IChmdW5jdGlvbigpIHtcblx0XHRjb25zdCBjaGFycyA9IHt9O1xuXHRcdFwiXFxcXC9eJCorPy4oKXx7fSxbXVwiLnNwbGl0KFwiXCIpLmZvckVhY2goY2hhciA9PiBjaGFyc1tjaGFyXSA9IHRydWUpO1xuXHRcdHJldHVybiBjaGFycztcblx0fSkoKVxuXG5cdC8vIEdpdmVuIGEgXCJub3JtYWxcIiBgc3RyaW5nYCwgZXNjYXBlIGFueSByZWd1bGFyIGV4cHJlc3Npb24gc3BlY2lhbCBjaGFyYWN0ZXJzXG5cdC8vXHRzbyB3ZSBjYW4gY3JlYXRlIGEgYG5ldyBSZWdFeHAoKWAuXG5cdC8vIEFsc28gY29udmVydHMgYSBzaW5nbGUgc3BhY2UgdG8gYXJiaXRyYXJ5IHNldCBvZiBzcGFjZXMgd2l0aCBcIlxccytcIlxuXHRzdGF0aWMgZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpIHtcblx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KFwiXCIpLm1hcChmdW5jdGlvbiAoY2hhciwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3IgYmFja3NsYXNoXG5cdFx0XHRpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHJldHVybiBcIlxcXFxcIjtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igc3BhY2Vcblx0XHRcdGlmIChjaGFyID09PSBcIiBcIikgcmV0dXJuIFwiXFxcXHMrXCI7XG5cdFx0XHQvLyBJZiBhIHNwZWNpYWwgY2hhciBhbmQgcHJldmlvdXMgY2hhcmFjdGVyIHdhcyBub3QgYW4gZXNjYXBlLCBlc2NhcGUgdGhlIHJlc3VsdC5cblx0XHRcdGlmIChQYXJzZXIuUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSU1tjaGFyXSAmJiBsaXN0W2luZGV4LTFdICE9PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiK2NoYXI7XG5cdFx0XHQvLyBUaGlzIGNoYXIgc2hvdWxkIGJlIGZpbmUgYnkgaXRzZWxmLlxuXHRcdFx0cmV0dXJuIGNoYXI7XG5cdFx0fSkuam9pbihcIlwiKTtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyByZWd1bGFyIGV4cHJlc3Npb24gZnJvbSBhIFwibm9ybWFsXCIgc3RyaW5nLCBlc2NhcGluZyBzcGVjaWFsIGNoYXJhY3RlcnMgYXMgbmVjZXNzYXJ5LlxuXHRzdGF0aWMgUmVnRXhwRnJvbVN0cmluZyhzdHJpbmcsIGZsYWdzKSB7XG5cdFx0cmV0dXJuIG5ldyBSZWdFeHAoUGFyc2VyLmVzY2FwZVJlZ0V4cENoYXJhY3RlcnMoc3RyaW5nKSwgZmxhZ3MpO1xuXHR9XG5cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1BhcnNlci5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXgpYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHRva2Vucywgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBtYXRjaGVkYFx0XHRSZXN1bHRzIG9mIHlvdXIgcGFyc2UuXG4vL1x0XHRcdC0gYG5leHRTdGFydGBcdFBsYWNlIHdoZXJlIG5leHQgbWF0Y2ggc2hvdWxkIHN0YXJ0IChlZzogb25lIGJleW9uZCB3aGF0IHlvdSBtYXRjaGVkKS5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLnJlc3VsdHNgXHRcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZShjb250ZXh0KWBcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IGdsb2JhbCBmcm9tIFwiLi91dGlscy9nbG9iYWxcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKC4uLnByb3BzKSB7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCAuLi5wcm9wcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0cmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMsIHByb3BzKTtcblx0fVxuXG4vL1xuLy9cdFBhcnNpbmcgcHJpbWl0aXZlcyAtLSB5b3UgTVVTVCBpbXBsZW1lbnQgdGhlc2UgaW4geW91ciBzdWJjbGFzc2VzIVxuLy9cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcnVsZSBpbiB0aGUgYHRva2Vuc2AuXG5cdC8vIFJldHVybnMgcmVzdWx0cyBvZiB0aGUgcGFyc2Ugb3IgYHVuZGVmaW5lZGAuXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCwgIHN0YWNrID0gW10pIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYml0cyBvZiBvdXIgcnVsZSBhcmUgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHRva2Vucy5cblx0Ly8gUmV0dXJuczpcblx0Ly9cdC0gYHRydWVgIGlmIHRoZSBydWxlIE1JR0hUIGJlIG1hdGNoZWQuXG5cdC8vXHQtIGBmYWxzZWAgaWYgdGhlcmUgaXMgbm8gd2F5IHRoZSBydWxlIGNhbiBiZSBtYXRjaGVkLlxuXHQvL1x0LSBgdW5kZWZpbmVkYCBpZiBub3QgZGV0ZXJtaW5zdGljIChlZzogbm8gd2F5IHRvIHRlbGwgcXVpY2tseSkuXG5cdHRlc3QocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIERvZXMgdGhlIHBhcnNlIGBzdGFja2AgYWxyZWFkeSBjb250YWluIGBydWxlYD9cblx0c3RhdGljIHN0YWNrQ29udGFpbnMoc3RhY2ssIHJ1bGUsIHRva2Vucykge1xuXHRcdGlmIChzdGFjay5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcblxuLy9jb25zb2xlLmluZm8oc3RhY2spO1xuXHRcdC8vIGdvIGJhY2t3YXJkc1xuXHRcdGZvciAodmFyIGkgPSBzdGFjay5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0bGV0IFsgbmV4dFJ1bGUsIG5leHRTdHJlYW0gXSA9IHN0YWNrW2ldO1xuXHRcdFx0aWYgKG5leHRSdWxlID09PSBydWxlKSB7XG5cdFx0XHRcdGlmICh0b2tlbnMuc3RhcnRJbmRleCA9PT0gdG9rZW5zLnN0YXJ0SW5kZXgpIHtcbi8vXHRcdFx0XHRcdGNvbnNvbGUud2FybihcImZvdW5kIHVucHJvZHVjdGl2ZSBydWxlIFwiLCBydWxlLCBcIiBvbiBzdGFja1wiLCBzdGFjayk7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG4vL1x0XHRcdFx0XHRjb25zb2xlLndhcm4oXCJmb3VuZCBwcm9kdWN0aXZlIHJ1bGUgXCIsIHJ1bGUsIFwiIG9uIHN0YWNrXCIsIHN0YWNrKTtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0YWRkVG9CbGFja2xpc3QoLi4ud29yZHMpIHtcblx0XHRpZiAoIXRoaXMuYmxhY2tsaXN0KSB0aGlzLmJsYWNrbGlzdCA9IHt9O1xuXHRcdHdvcmRzLmZvckVhY2god29yZCA9PiB0aGlzLmJsYWNrbGlzdFt3b3JkXSA9IHRydWUpO1xuXHR9XG5cbi8vXG4vLyAjIyBvdXRwdXQgYXMgc291cmNlXG4vL1xuXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBOT1RFOiB5b3UgbWF5IHdhbnQgdG8gbWVtb2l6ZSB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvLyBPdXRwdXQgdmFsdWUgZm9yIHRoaXMgSU5TVEFOVElBVEVEIHJ1bGUgYXMgc291cmNlLlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG4vL1xuLy8gIyMgZ3JvdXA6IHJlZmxlY3Rpb25cbi8vXG5cdGdldCBydWxlVHlwZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR9XG59XG5cblxuLy8gUnVsZSBmb3Igb25lIG9yIG1vcmUgc2VxdWVudGlhbCBsaXRlcmFsIHZhbHVlcyB0byBtYXRjaCwgd2hpY2ggaW5jbHVkZSBwdW5jdHVhdGlvbiBzdWNoIGFzIGAoYCBldGMuXG5SdWxlLk1hdGNoID0gY2xhc3MgbWF0Y2ggZXh0ZW5kcyBSdWxlIHtcblx0Y29uc3RydWN0b3IoLi4ucHJvcHMpIHtcblx0XHRzdXBlciguLi5wcm9wcyk7XG5cdFx0Ly8gY29lcmNlIHRvIGFuIGFycmF5IChhIGJpdCBzbG93ZXIgYnV0IGNsZWFuZXIpLlxuXHRcdGlmICghQXJyYXkuaXNBcnJheSh0aGlzLm1hdGNoKSkgdGhpcy5tYXRjaCA9IFt0aGlzLm1hdGNoXTtcblx0fVxuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBydWxlIGluIHRoZSBgdG9rZW5zYC5cblx0Ly8gUmV0dXJucyByZXN1bHRzIG9mIHRoZSBwYXJzZSBvciBgdW5kZWZpbmVkYC5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXggPSAwLCAgc3RhY2sgPSBbXSkge1xuXHRcdGlmICghdGhpcy5oZWFkU3RhcnRzV2l0aCh0aGlzLm1hdGNoLCB0b2tlbnMsIHN0YXJ0SW5kZXgpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdC8vIGlmIG9ubHkgb25lIGFuZCB3ZSBoYXZlIGEgYmxhY2tsaXN0LCBtYWtlIHN1cmUgaXQncyBub3QgaW4gdGhlIGJsYWNrbGlzdCFcblx0XHRpZiAodGhpcy5tYXRjaC5sZW5ndGggPT09IDEgJiYgdGhpcy5ibGFja2xpc3QgJiYgdGhpcy5ibGFja2xpc3RbdGhpcy5tYXRjaFswXV0pIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiB0aGlzLm1hdGNoLmpvaW4odGhpcy5tYXRjaERlbGltaXRlciksXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0SW5kZXggKyB0aGlzLm1hdGNoLmxlbmd0aFxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGlzIG1hdGNoIGFwcGVhciBhbnl3aGVyZSBpbiB0aGUgdG9rZW5zP1xuXHR0ZXN0KHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBtYXRjaFN0YXJ0ID0gdG9rZW5zLmluZGV4T2YodGhpcy5tYXRjaFswXSwgc3RhcnRJbmRleCk7XG5cdFx0cmV0dXJuIG1hdGNoU3RhcnQgIT09IC0xICYmIHRoaXMuaGVhZFN0YXJ0c1dpdGgodGhpcy5tYXRjaCwgdG9rZW5zLCBtYXRjaFN0YXJ0KTtcblx0fVxuXG5cdC8vIERvZXMgdGhlIGhlYWQgb2YgdGhlIHRva2VucyBzdGFydCB3aXRoIGFuIGFycmF5IG9mIG1hdGNoZXM/XG5cdGhlYWRTdGFydHNXaXRoKG1hdGNoZXMsIHRva2Vucywgc3RhcnRJbmRleCA9IDApIHtcblx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIG9uZSBtYXRjaCwgbWF5YmUgcHJlbWF0dXJlIG9wdGltaXphdGlvbiBidXQuLi5cblx0XHRpZiAobWF0Y2hlcy5sZW5ndGggPT09IDEpIHJldHVybiAobWF0Y2hlc1swXSA9PT0gdG9rZW5zW3N0YXJ0SW5kZXhdKTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbWF0Y2hlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKG1hdGNoZXNbaV0gIT09IHRva2Vuc1tzdGFydEluZGV4ICsgaV0pIHJldHVybiBmYWxzZVxuXHRcdH1cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLm1hdGNoLmpvaW4odGhpcy5tYXRjaERlbGltaXRlcil9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuUnVsZS5NYXRjaC5wcm90b3R5cGUubWF0Y2hEZWxpbWl0ZXIgPSBcIlwiO1xuXG5cbi8vIFN5bnRhY3RpYyBzdWdhciB0byBzZXBhcmF0ZSBgc3ltYm9sc2AgKHdoaWNoIGRvbid0IHJlcXVpcmUgc3BhY2VzKSBmcm9tIGBrZXl3b3Jkc2AgKHdoaWNoIGRvKS5cblJ1bGUuU3ltYm9sID0gY2xhc3Mgc3ltYm9sIGV4dGVuZHMgUnVsZS5NYXRjaCB7fVxuXG5SdWxlLktleXdvcmQgPSBjbGFzcyBrZXl3b3JkIGV4dGVuZHMgUnVsZS5NYXRjaCB7fVxuUnVsZS5LZXl3b3JkLnByb3RvdHlwZS5tYXRjaERlbGltaXRlciA9IFwiIFwiO1xuXG5cblxuLy8gUmVnZXggcGF0dGVybi5cbi8vIGBydWxlLnBhdHRlcm5gIGlzIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2guXG4vLyBOb3RlIHRoYXQgeW91IE1VU1Qgc3RhcnQgeW91ciBwYXR0ZXJuIHdpdGggYF5gIGFuZCBlbmQgd2l0aCBgJGAgdG8gbWFrZSBzdXJlIGl0IG1hdGNoZXMgdGhlIGVudGlyZSB0b2tlbi5cbi8vIE5vdGUgdGhhdCB0aGlzIGNhbiBvbmx5IG1hdGNoIGEgc2luZ2xlIHRva2VuIVxuUnVsZS5QYXR0ZXJuID0gY2xhc3MgUGF0dGVybiBleHRlbmRzIFJ1bGUge1xuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcGF0dGVybiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSB0b2tlbnMuXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCwgIHN0YWNrID0gW10pIHtcblx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbc3RhcnRJbmRleF07XG5cdFx0aWYgKHR5cGVvZiB0b2tlbiAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBtYXRjaCA9IHRva2VuLm1hdGNoKHRoaXMucGF0dGVybik7XG5cdFx0aWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGJhaWwgaWYgcHJlc2VudCBpbiBibGFja2xpc3Rcblx0XHRsZXQgbWF0Y2hlZCA9IG1hdGNoWzBdO1xuXHRcdGlmICh0aGlzLmJsYWNrbGlzdCAmJiB0aGlzLmJsYWNrbGlzdFttYXRjaGVkXSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0SW5kZXggKyAxXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIHBhdHRlcm4gaXMgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHRva2Vucy5cblx0dGVzdChwYXJzZXIsIHRva2Vucywgc3RhcnRJbmRleCA9IDApIHtcblx0XHRyZXR1cm4gdG9rZW5zLnNsaWNlKHN0YXJ0SW5kZXgpLnNvbWUodG9rZW4gPT4gdHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiICYmIHRva2VuLm1hdGNoKHRoaXMucGF0dGVybikpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMucGF0dGVybi5zb3VyY2U7XG5cdH1cbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnRJbmRleCA9IDAsICBzdGFjayA9IFtdKSB7XG5cdFx0bGV0IHJlc3VsdCA9IHBhcnNlci5wYXJzZVJ1bGVPckRpZSh0aGlzLnJ1bGUsIHRva2Vucywgc3RhcnRJbmRleCwgc3RhY2ssIGBwYXJzZSBzdWJydWxlICcke3RoaXMucnVsZX0nYCk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgcmVzdWx0LmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYW55IG9mIG91ciBhbHRlcm5hdGl2ZXMgYXJlIGZvdW5kIEFOWVdIRVJFIGluIHRoZSB0b2tlbnMuXG5cdHRlc3QocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0cmV0dXJuIHBhcnNlci50ZXN0UnVsZSh0aGlzLnJ1bGUsIHRva2Vucywgc3RhcnRJbmRleCk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYHske3RoaXMuYXJndW1lbnQgPyB0aGlzLmFyZ3VtZW50K1wiOlwiIDogXCJcIn0ke3RoaXMucnVsZX19JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufVxuXG5cbi8vIFNlcXVlbmNlIG9mIHJ1bGVzIHRvIG1hdGNoLlxuUnVsZS5TZXF1ZW5jZSA9IGNsYXNzIFNlcXVlbmNlIGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCwgIHN0YWNrID0gW10pIHtcblx0XHQvLyBJZiB3ZSBoYXZlIGEgYHRlc3RSdWxlYCBkZWZpbmVkXG5cdFx0aWYgKHRoaXMudGVzdFJ1bGUpIHtcblx0XHRcdC8vIEZvcmdldCBpdCBpZiB0aGVyZSBpcyBOTyBXQVkgdGhlIHJ1bGUgY291bGQgYmUgbWF0Y2hlZC5cblx0XHRcdGlmIChwYXJzZXIudGVzdFJ1bGUodGhpcy50ZXN0UnVsZSwgdG9rZW5zLCBzdGFydEluZGV4KSA9PT0gZmFsc2UpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgdG9rZW5zKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCB0b2tlbnNdKTtcblx0XHR9XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuXHRcdGxldCBuZXh0U3RhcnQgPSBzdGFydEluZGV4O1xuXHRcdGxldCBpbmRleCA9IDAsIHJ1bGUgPSB1bmRlZmluZWQ7XG5cdFx0d2hpbGUgKHJ1bGUgPSB0aGlzLnJ1bGVzW2luZGV4KytdKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgdG9rZW5zLCBuZXh0U3RhcnQsIHN0YWNrKTtcblx0XHRcdGlmICghbWF0Y2ggJiYgIXJ1bGUub3B0aW9uYWwpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdFx0bWF0Y2hlZC5wdXNoKG1hdGNoKTtcblx0XHRcdFx0bmV4dFN0YXJ0ID0gbWF0Y2gubmV4dFN0YXJ0O1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBpZiB3ZSBnZXQgaGVyZSwgd2UgbWF0Y2hlZCBhbGwgdGhlIHJ1bGVzIVxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHRuZXh0U3RhcnRcblx0XHR9KTtcblx0fVxuXG4vLyBcdHBhcnNlSW5DaHVua3MocGFyc2VyLCB0b2tlbnMsIHN0YWNrKSB7fVxuXG4vL1RPRE9DXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYG1hdGNoZWRgIGFycmF5IGluZGV4ZWQgYnlcblx0Ly9cdFx0LSBgbWF0Y2guYXJndW1lbnRgOlx0XHRhcmd1bWVudCBzZXQgd2hlbiBydWxlIHdhcyBkZWNsYXJlZCwgZWc6IGB7dmFsdWU6bGl0ZXJhbH1gID0+IGB2YWx1ZWBcblx0Ly9cdFx0LSBgbWF0Y2gucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gYHJ1bGUgdHlwZWA6XHRcdFx0XHRuYW1lIG9mIHRoZSBydWxlIHR5cGVcblx0Ly8gTk9URTogbWVtb2l6ZXMgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCByZXN1bHRzID0gdGhpcy5hZGRSZXN1bHRzKHt9LCB0aGlzLm1hdGNoZWQpO1xuXHRcdGlmICh0aGlzLmNvbW1lbnQpIHJlc3VsdHMuY29tbWVudCA9IHRoaXMuY29tbWVudDtcblx0XHRyZXR1cm4gcmVzdWx0cztcblx0fVxuXG5cdGFkZFJlc3VsdHMocmVzdWx0cywgbWF0Y2hlZCkge1xuXHRcdGxldCBpbmRleCA9IDAsIG1hdGNoID0gdW5kZWZpbmVkO1xuXHRcdHdoaWxlIChtYXRjaCA9IG1hdGNoZWRbaW5kZXgrK10pIHtcblx0XHRcdGlmIChtYXRjaC5wcm9tb3RlKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmFkZFJlc3VsdHMocmVzdWx0cywgbWF0Y2gubWF0Y2hlZCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0bGV0IGFyZ05hbWUgPSBtYXRjaC5hcmd1bWVudCB8fCBtYXRjaC5ydWxlTmFtZSB8fCBtYXRjaC5jb25zdHJ1Y3Rvci5uYW1lO1xuXHRcdFx0XHQvLyBJZiBhcmcgYWxyZWFkeSBleGlzdHMsIGNvbnZlcnQgdG8gYW4gYXJyYXlcblx0XHRcdFx0aWYgKGFyZ05hbWUgaW4gcmVzdWx0cykge1xuXHRcdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShyZXN1bHRzW2FyZ05hbWVdKSkgcmVzdWx0c1thcmdOYW1lXSA9IFtyZXN1bHRzW2FyZ05hbWVdXTtcblx0XHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdLnB1c2gobWF0Y2gpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0gPSBtYXRjaDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0cztcblx0fVxuXG5cdC8vIFJldHVybiBgdG9Tb3VyY2UoKWAgZm9yIG91ciBgcmVzdWx0c2AgYXMgYSBtYXAuXG5cdC8vIElmIHlvdSBwYXNzIGBrZXlzYCwgd2UnbGwgcmVzdHJpY3QgdG8ganVzdCB0aG9zZSBrZXlzLlxuXHRnZXRNYXRjaGVkU291cmNlKGNvbnRleHQsIC4uLmtleXMpIHtcblx0XHRsZXQgcmVzdWx0cyA9IHRoaXMucmVzdWx0cztcblx0XHRsZXQgb3V0cHV0ID0ge307XG5cdFx0aWYgKCFrZXlzLmxlbmd0aCkga2V5cyA9IE9iamVjdC5rZXlzKHJlc3VsdHMpO1xuXHRcdGtleXMuZm9yRWFjaChrZXkgPT4ge1xuXHRcdFx0bGV0IHZhbHVlID0gcmVzdWx0c1trZXldO1xuXHRcdFx0aWYgKHZhbHVlID09IG51bGwpIHJldHVybjtcblx0XHRcdGlmICh2YWx1ZS50b1NvdXJjZSkgb3V0cHV0W2tleV0gPSB2YWx1ZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGVsc2Ugb3V0cHV0W2tleV0gPSB2YWx1ZTtcblx0XHR9KTtcblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0Ly8gRWNobyB0aGlzIHJ1bGUgYmFjayBvdXQuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnJ1bGVzLmpvaW4oXCIgXCIpfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cblxufVxuXG4vLyBTeW50YWN0aWMgc3VnYXIgZm9yIGRlYnVnZ2luZ1xuUnVsZS5FeHByZXNzaW9uID0gY2xhc3MgZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBIHN0YXRlbWVudCB0YWtlcyB1cCB0aGUgZW50aXJlIGxpbmUuXG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXgsIG1hdGNoaW5nIG9uZSBvZiBhIG51bWJlciBvZiBkaWZmZXJlbnQgcnVsZXMuXG4vLyBUaGUgcmVzdWx0IG9mIGEgcGFyc2UgaXMgdGhlIGxvbmdlc3QgcnVsZSB0aGF0IGFjdHVhbGx5IG1hdGNoZWQuXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUge1xuXHRjb25zdHJ1Y3RvciguLi5wcm9wcykge1xuXHRcdHN1cGVyKC4uLnByb3BzKTtcblx0XHRpZiAoIXRoaXMucnVsZXMpIHRoaXMucnVsZXMgPSBbXTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgdG9rZW5zLlxuXHQvLyBOT1RFOiB0aGlzIHNob3VsZCBvbmx5IGJlIGNhbGxlZCBpZiB3ZSdyZSBzcGVjaWZpZWQgYXMgYSBgdGVzdFJ1bGVgXG5cdC8vXHRcdCBhbmQgdGhlbiBvbmx5IGlmIGFsbCBvZiBvdXIgcnVsZXMgYXJlIGRldGVybWluaXN0aWMuXG5cdHRlc3QocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXggPSAwKSB7XG5cdFx0bGV0IGluZGV4ID0gMCwgcnVsZSA9IHVuZGVmaW5lZDtcblx0XHR3aGlsZSAocnVsZSA9IHRoaXMucnVsZXNbaW5kZXgrK10pIHtcblx0XHRcdGlmIChydWxlLnRlc3QocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXgpKSByZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gRmluZCBhbGwgcnVsZXMgd2hpY2ggbWF0Y2ggYW5kIGRlbGVnYXRlIHRvIGBnZXRCZXN0TWF0Y2goKWAgdG8gcGljayB0aGUgYmVzdCBvbmUuXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCwgIHN0YWNrID0gW10pIHtcblx0XHRsZXQgbWF0Y2hlcyA9IFtdO1xuXHRcdGxldCBpbmRleCA9IDAsIHJ1bGUgPSB1bmRlZmluZWQ7XG5cdFx0d2hpbGUgKHJ1bGUgPSB0aGlzLnJ1bGVzW2luZGV4KytdKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4LCAgc3RhY2spO1xuXHRcdFx0aWYgKG1hdGNoKSBtYXRjaGVzLnB1c2gobWF0Y2gpO1xuXHRcdH1cblxuXHRcdGlmICghbWF0Y2hlcy5sZW5ndGgpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyB1bmNvbW1lbnQgdGhlIGJlbG93IHRvIHByaW50IGFsdGVybmF0aXZlc1xuXHRcdC8vIGlmIChtYXRjaGVzLmxlbmd0aCA+IDEpIHtcblx0XHQvL1x0Y29uc29sZS5pbmZvKHRoaXMuYXJndW1lbnQgfHwgdGhpcy5ydWxlTmFtZSwgbWF0Y2hlcywgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gubWF0Y2hlZFRleHQpKTtcblx0XHQvLyB9XG5cblx0XHRsZXQgYmVzdE1hdGNoID0gKG1hdGNoZXMubGVuZ3RoID09PSAxID8gbWF0Y2hlc1swXSA6IHRoaXMuZ2V0QmVzdE1hdGNoKG1hdGNoZXMpKTtcblxuXHRcdC8vIGFzc2lnbiBgYXJnTmFtZWAgb3IgYHJ1bGVOYW1lYCBmb3IgYHJlc3VsdHNgXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIGJlc3RNYXRjaC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0ZWxzZSBpZiAodGhpcy5ydWxlTmFtZSkgYmVzdE1hdGNoLnJ1bGVOYW1lID0gdGhpcy5ydWxlTmFtZTtcbi8vVE9ETzogb3RoZXIgdGhpbmdzIHRvIGNvcHkgaGVyZT8/P1xuXG5cdFx0cmV0dXJuIGJlc3RNYXRjaDtcblx0fVxuXG5cdC8vIFJldHVybiB0aGUgXCJiZXN0XCIgbWF0Y2ggZ2l2ZW4gbW9yZSB0aGFuIG9uZSBtYXRjaGVzIGF0IHRoZSBoZWFkIG9mIHRoZSB0b2tlbnMuXG5cdC8vIERlZmF1bHQgaXMgdG8gcmV0dXJuIHRoZSBsb25nZXN0IG1hdGNoLlxuXHQvLyBJbXBsZW1lbnQgc29tZXRoaW5nIGVsc2UgdG8gZG8sIGVnLCBwcmVjZWRlbmNlIHJ1bGVzLlxuXHRnZXRCZXN0TWF0Y2gobWF0Y2hlcykge1xuXHRcdHJldHVybiBtYXRjaGVzLnJlZHVjZShmdW5jdGlvbiAoYmVzdCwgY3VycmVudCkge1xuXHRcdFx0aWYgKGN1cnJlbnQubmV4dFN0YXJ0ID4gYmVzdC5uZXh0U3RhcnQpIHJldHVybiBjdXJyZW50O1xuXHRcdFx0cmV0dXJuIGJlc3Q7XG5cdFx0fSwgbWF0Y2hlc1swXSk7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZShjb250ZXh0KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5tYXRjaGVkYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnRJbmRleCA9IDAsICBzdGFjayA9IFtdKSB7XG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0aWYgKFJ1bGUuc3RhY2tDb250YWlucyhzdGFjaywgdGhpcywgdG9rZW5zKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdHN0YWNrID0gc3RhY2suY29uY2F0KCk7XG5cdFx0XHRzdGFjay5wdXNoKFt0aGlzLCB0b2tlbnNdKTtcblx0XHR9XG5cblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuXHRcdGxldCBuZXh0U3RhcnQgPSBzdGFydEluZGV4O1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSB0aGlzLnJ1bGUucGFyc2UocGFyc2VyLCB0b2tlbnMsIG5leHRTdGFydCwgc3RhY2spO1xuXHRcdFx0aWYgKCFtYXRjaCkgYnJlYWs7XG5cblx0XHRcdG1hdGNoZWQucHVzaChtYXRjaCk7XG5cdFx0XHRuZXh0U3RhcnQgPSBtYXRjaC5uZXh0U3RhcnQ7XG5cdFx0fVxuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdG5leHRTdGFydFxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gYXJyYXkgd2l0aCBhcmd1bWVudHMgb2YgYWxsIHJlc3VsdHMuXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gucmVzdWx0cyApO1xuXHR9XG5cblx0dG9Tb3VyY2UoKSB7XG5cdFx0dGhyb3cgXCJEb24ndCB1bmRlcnN0YW5kIGhvdyB0byBzb3VyY2UgUnVsZS5SZXBlYXQhXCI7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRsZXQgaXNDb21wb3VuZFJ1bGUgPSAodGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSlcblx0XHRcdFx0XHRcdCAgfHwgKHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiB0aGlzLnJ1bGUubWF0Y2gubGVuZ3RoID4gMSk7XG5cdFx0Y29uc3QgcnVsZSA9IGlzQ29tcG91bmRSdWxlID8gYCgke3RoaXMucnVsZX0pYCA6IGAke3RoaXMucnVsZX1gO1xuXHRcdHJldHVybiBgJHtydWxlfSR7dGhpcy5vcHRpb25hbCA/ICcqJyA6ICcrJ31gO1xuXHR9XG59XG5cblxuLy8gTGlzdCBtYXRjaCBydWxlOiAgIGBbPGl0ZW0+PGRlbGltaXRlcj5dYC4gZWdcIiBgW3tudW1iZXJ9LF1gIHRvIG1hdGNoIGAxLDIsM2Bcbi8vXHRgcnVsZS5pdGVtYCBpcyB0aGUgcnVsZSBmb3IgZWFjaCBpdGVtLFxuLy9cdGBydWxlLmRlbGltaXRlcmAgaXMgdGhlIGRlbGltaXRlciBiZXR3ZWVuIGVhY2ggaXRlbS5cbi8vIFx0YHJ1bGUubWF0Y2hlZGAgaW4gdGhlIG91dHB1dCBpcyB0aGUgbGlzdCBvZiB2YWx1ZXMuXG4vL1xuLy9cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGEgTGlzdCBydWxlIHdpbGwgTk9UIHJlcGVhdCAoPz8/PylcblJ1bGUuTGlzdCA9IGNsYXNzIExpc3QgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0SW5kZXggPSAwLCAgc3RhY2sgPSBbXSkge1xuXHRcdGlmICh0aGlzLmxlZnRSZWN1cnNpdmUpIHtcblx0XHRcdGlmIChSdWxlLnN0YWNrQ29udGFpbnMoc3RhY2ssIHRoaXMsIHRva2VucykpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRzdGFjayA9IHN0YWNrLmNvbmNhdCgpO1xuXHRcdFx0c3RhY2sucHVzaChbdGhpcywgdG9rZW5zXSk7XG5cdFx0fVxuXG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXTtcblx0XHRsZXQgbmV4dFN0YXJ0ID0gc3RhcnRJbmRleDtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0Ly8gZ2V0IG5leHQgaXRlbSwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBpdGVtID0gdGhpcy5pdGVtLnBhcnNlKHBhcnNlciwgdG9rZW5zLCBuZXh0U3RhcnQsIHN0YWNrKTtcblx0XHRcdGlmICghaXRlbSkgYnJlYWs7XG4vL2NvbnNvbGUubG9nKGl0ZW0pO1xuXHRcdFx0bWF0Y2hlZC5wdXNoKGl0ZW0pO1xuXHRcdFx0bmV4dFN0YXJ0ID0gaXRlbS5uZXh0U3RhcnQ7XG5cblx0XHRcdC8vIGdldCBkZWxpbWl0ZXIsIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgZGVsaW1pdGVyID0gdGhpcy5kZWxpbWl0ZXIucGFyc2UocGFyc2VyLCB0b2tlbnMsIG5leHRTdGFydCwgc3RhY2spO1xuXHRcdFx0aWYgKCFkZWxpbWl0ZXIpIGJyZWFrO1xuXHRcdFx0bmV4dFN0YXJ0ID0gZGVsaW1pdGVyLm5leHRTdGFydDtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSBkaWRuJ3QgZ2V0IGFueSBtYXRjaGVzLCBmb3JnZXQgaXQuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdG5leHRTdGFydFxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJucyBsaXN0IG9mIHZhbHVlcyBhcyBzb3VyY2UuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIFtdO1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC50b1NvdXJjZShjb250ZXh0KSApO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBgU3RhdGVtZW50c2AgYXJlIGEgYmxvY2sgb2YgYFN0YXRlbWVudGAgdGhhdCB1bmRlcnN0YW5kIG5lc3RpbmcgYW5kIGNvbW1lbnRzLlxuUnVsZS5TdGF0ZW1lbnRzID0gY2xhc3Mgc3RhdGVtZW50cyBleHRlbmRzIFJ1bGUge1xuXHQvLyBSZXR1cm4gYSBjZXJ0YWluIGBudW1iZXJgIG9mIHRhYiBjaGFyYWN0ZXJzLlxuXHRzdGF0aWMgVEFCUyA9IFwiXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XCI7XG5cdGdldFRhYnMobnVtYmVyKSB7XG5cdFx0aWYgKHR5cGVvZiBudW1iZXIgIT09IFwibnVtYmVyXCIpIHJldHVybiBcIlwiO1xuXHRcdHJldHVybiBSdWxlLlN0YXRlbWVudHMuVEFCUy5zdWJzdHIoMCwgbnVtYmVyKTtcblx0fVxuXG5cdC8vIGBzdGF0ZW1lbnRzYCBpcyBhbiBhcnJheSBvZiBhcnJheXMgb2YgdG9rZW5zLlxuLy9UT0RPOiBub24tc3RhbmRhcmQsIG90aGVyIGBwYXJzZSgpYCByb3V0aW5lcyB3aWxsIHRha2UgYSBzaW5nbGUgbGluZT8/P1xuXHRwYXJzZShwYXJzZXIsIHN0YXRlbWVudHMsIGxpbmVOdW1iZXIgPSAwLCBzdGFjaykge1xuXHRcdGNvbnNvbGUudGltZShcIlJ1bGUuU3RhdGVtZW50cy5wYXJzZSgpXCIpO1xuXG5cdFx0Ly8gQ3V0IG9mZiB0aGUgYmVnaW5uaW5nIGlmIG5vdCBvbiB0aGUgZmlyc3QgbGluZS4uLlxuXHRcdGlmIChsaW5lTnVtYmVyICE9PSAwKSBzdGF0ZW1lbnRzID0gc3RhdGVtZW50cy5zbGljZShsaW5lTnVtYmVyKTtcblxuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0bGV0IGxhc3RJbmRlbnQgPSAwO1xuXG5cdFx0Ly8gUGFyc2UgZWFjaCBsaW5lIGluZGl2aWR1YWxseVxuXHRcdHN0YXRlbWVudHMuZm9yRWFjaCh0b2tlbnMgPT4ge1xuXHRcdFx0Ly8gYWRkIHBsYWNlaG9sZGVycyBmb3IgZW1wdHkgbGluZXNcblx0XHRcdGlmICh0b2tlbnMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiByZXN1bHRzLnB1c2gobmV3IFJ1bGUuQmxhbmtMaW5lKCkpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBmaWd1cmUgb3V0IGluZGVudCBsZXZlbCBvZiB0aGlzIGxpbmVcblx0XHRcdGxldCBpbmRlbnQgPSAwO1xuXHRcdFx0Ly8gSWYgd2Ugc3RhcnQgd2l0aCBhbiBpbmRlbnRcblx0XHRcdGlmICh0b2tlbnNbMF0gaW5zdGFuY2VvZiBUb2tlbml6ZXIuV2hpdGVzcGFjZSAmJiB0b2tlbnNbMF0uaXNJbmRlbnQpIHtcblx0XHRcdFx0aW5kZW50ID0gdG9rZW5zWzBdLmxlbmd0aDtcblx0XHRcdFx0Ly8gdGFrZSB0aGUgaW5kZW50IG91dCBvZiB0aGUgc3RhdGVtZW50IHN0YXJ0XG5cdFx0XHRcdHRva2VucyA9IHRva2Vucy5zbGljZSgxKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgaW5kZW50IElOQ1JFQVNFUywgYWRkIG9wZW4gY3VybHkgYnJhY2VzXG5cdFx0XHRpZiAoaW5kZW50ID4gbGFzdEluZGVudCkge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2gobmV3IFJ1bGUuT3BlbkJsb2NrKHsgaW5kZW50OiBpbmRlbnQtMSB9KSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBpZiBsaW5lIGluZGVudCBERUNSRUFTRVMsIGFkZCBvbmUgb3IgbW9yZSBjbG9zaW5nIGN1cmx5IGJyYWNlc1xuXHRcdFx0ZWxzZSBpZiAoaW5kZW50IDwgbGFzdEluZGVudCkge1xuXHRcdFx0XHRmb3IgKGxldCBpbmRlbnQgPSBsYXN0SW5kZW50OyBpbmRlbnQgPiBpbmRlbnQ7IGluZGVudC0tKSB7XG5cdFx0XHRcdFx0cmVzdWx0cy5wdXNoKG5ldyBSdWxlLkNsb3NlQmxvY2soeyBpbmRlbnQ6IGluZGVudC0xIH0pKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0bGFzdEluZGVudCA9IGluZGVudDtcblxuXHRcdFx0Ly8gQXR0ZW1wdCB0byBwYXJzZSBhIGNvbW1lbnQgYXMgdGhlIGxhc3QgaXRlbSBpbiB0aGUgc3RhdGVtZW50XG5cdFx0XHRsZXQgbGFzdEl0ZW0gPSB0b2tlbnMubGVuZ3RoIC0gMTtcblx0XHRcdGxldCBsYXN0ID0gdG9rZW5zW2xhc3RJdGVtXTtcblx0XHRcdGxldCBjb21tZW50O1xuXHRcdFx0aWYgKGxhc3QgaW5zdGFuY2VvZiBUb2tlbml6ZXIuQ29tbWVudCkge1xuLy9UT0RPLi4uXG5cdFx0XHRcdGNvbW1lbnQgPSBwYXJzZXIucGFyc2VSdWxlT3JEaWUoXCJjb21tZW50XCIsIHRva2VucywgbGFzdEl0ZW0pO1xuXHRcdFx0XHRpZiAoY29tbWVudCkge1xuXHRcdFx0XHRcdC8vIEFkZCBjb21tZW50IEJFRk9SRSBjb3JyZXNwb25kaW5nIHN0YXRlbWVudFxuXHRcdFx0XHRcdHJlc3VsdHMucHVzaChjb21tZW50KTtcblxuXHRcdFx0XHRcdC8vIHBvcCB0aGUgY29tbWVudCBvZmYgYmVmb3JlIG1hdGNoaW5nIHRoZSByZXN0IG9mIHRoZSBzdGF0ZW1lbnQuXG5cdFx0XHRcdFx0dG9rZW5zID0gdG9rZW5zLnNsaWNlKDAsIC0xKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG4vL1RPRE8uLi5cblx0XHRcdGxldCByZXN1bHQgPSBwYXJzZXIucGFyc2VSdWxlT3JEaWUoXCJzdGF0ZW1lbnRcIiwgdG9rZW5zLCAwKTtcblx0XHRcdC8vIGNvbXBsYWluIGlmIG5vIHJlc3VsdCBhbmQgbm8gY29tbWVudFxuXHRcdFx0aWYgKCFyZXN1bHQgJiYgIWNvbW1lbnQpIHtcblx0XHRcdFx0bGV0IHN0YXRlbWVudCA9IHRva2Vucy5qb2luKFwiIFwiKTtcblx0XHRcdFx0Y29uc29sZS53YXJuKGBDb3VsZG4ndCBwYXJzZSBzdGF0ZW1lbnQ6XFxuXFx0JHtzdGF0ZW1lbnR9YCk7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChuZXcgUnVsZS5QYXJzZUVycm9yKHtcblx0XHRcdFx0XHRlcnJvcjogXCJDYW4ndCBwYXJzZSBzdGF0ZW1lbnRcIixcblx0XHRcdFx0XHRtZXNzYWdlOiBgQ0FOJ1QgUEFSU0U6ICR7c3RhdGVtZW50fWBcblx0XHRcdFx0fSkpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGNvbXBsYWluIGNhbid0IHBhcnNlIHRoZSBlbnRpcmUgbGluZSFcblx0XHRcdGlmIChyZXN1bHQgJiYgcmVzdWx0Lm5leHRTdGFydCAhPT0gdG9rZW5zLmxlbmd0aCkge1xuXHRcdFx0XHRsZXQgc3RhdGVtZW50ID0gdG9rZW5zLmpvaW4oXCIgXCIpO1xuXHRcdFx0XHRsZXQgdW5wYXJzZWQgPSB0b2tlbnMuc2xpY2UocmVzdWx0Lm5leHRTdGFydCkuam9pbihcIiBcIik7XG5cdFx0XHRcdGNvbnNvbGUud2FybihcIkNvdWxkbid0IHBhcnNlIGVudGlyZSBzdGF0ZW1lbnQ6XCIsXG5cdFx0XHRcdFx0XHRcdFx0YFxcblxcdFwiJHtzdGF0ZW1lbnR9XCJgLFxuXHRcdFx0XHRcdFx0XHRcdGBcXG51bnBhcnNlZDpgLFxuXHRcdFx0XHRcdFx0XHRcdGBcXG5cXHRcIiR7dW5wYXJzZWR9XCJgKTtcblx0XHRcdFx0bGV0IGVycm9yID0gbmV3IFJ1bGUuUGFyc2VFcnJvcih7XG5cdFx0XHRcdFx0ZXJyb3I6IFwiQ2FuJ3QgcGFyc2UgZW50aXJlIHN0YXRlbWVudFwiLFxuXHRcdFx0XHRcdG1lc3NhZ2U6IGBDQU5UIFBBUlNFIEVOVElSRSBTVEFURU1FTlRcXG5gXG5cdFx0XHRcdFx0XHQgICArIGBQQVJTRUQgICAgOiAke3Jlc3VsdC5tYXRjaGVkfVxcbmBcblx0XHRcdFx0XHRcdCAgICsgYENBTlQgUEFSU0U6ICR7dW5wYXJzZWR9YFxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goZXJyb3IpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyZXN1bHQpIHtcblx0XHRcdFx0cmVzdWx0LmluZGVudCA9IGluZGVudDtcblx0XHRcdFx0cmVzdWx0cy5wdXNoKHJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBBZGQgY2xvc2luZyBjdXJseSBicmFjZXMgYXMgbmVjZXNzYXJ5XG4vL1RPRE86IG1vdmUgQUJPVkUgYW55IGJsYW5rIGxpbmVzXG5cdFx0d2hpbGUgKGxhc3RJbmRlbnQgPiAwKSB7XG5cdFx0XHRsZXQgY2xvc2VCbG9jayA9IG5ldyBSdWxlLkNsb3NlQmxvY2soeyBpbmRlbnQ6IHRoaXMuZ2V0VGFicyhsYXN0SW5kZW50IC0gMSkgfSk7XG5cdFx0XHRyZXN1bHRzLnB1c2goY2xvc2VCbG9jayk7XG5cdFx0XHQtLWxhc3RJbmRlbnQ7XG5cdFx0fVxuXHRcdGNvbnNvbGUudGltZUVuZChcIlJ1bGUuU3RhdGVtZW50cy5wYXJzZSgpXCIpO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogcmVzdWx0cyxcblx0XHRcdG5leHRTdGFydDogc3RhdGVtZW50cy5sZW5ndGhcblx0XHR9KTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tYXRjaGVkLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSB0aGlzLm1hdGNoZWRbaV07XG5cblx0XHRcdC8vIHNwZWNpYWwgY2FzZSBvcGVuIGJsb2NrIHRvIHB1dCBvbiB0aGUgc2FtZSBsaW5lXG5cdFx0XHQvL1x0aWYgcHJldmlvdXMgc3RhdGVtZW50IGRvZXMgbm90IGhhdmUgYC5vcGVuc0Jsb2NrYCBzZXQuXG5cdFx0XHRpZiAobWF0Y2ggaW5zdGFuY2VvZiBSdWxlLk9wZW5CbG9jaykge1xuXHRcdFx0XHRsZXQgcHJldmlvdXMgPSB0aGlzLm1hdGNoZWRbaS0xXTtcblx0XHRcdFx0aWYgKHByZXZpb3VzKSB7XG5cdFx0XHRcdFx0aWYgKCFwcmV2aW91cy5vcGVuc0Jsb2NrKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHRzW3Jlc3VsdHMubGVuZ3RoIC0gMV0gKz0gXCIge1wiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0bGV0IHNvdXJjZSA9IG1hdGNoLnRvU291cmNlKGNvbnRleHQpIHx8IFwiXCI7XG5cdFx0XHRsZXQgaW5kZW50ID0gdGhpcy5nZXRUYWJzKG1hdGNoLmluZGVudCk7XG5cdFx0XHRyZXN1bHRzLnB1c2goaW5kZW50ICsgc291cmNlLnNwbGl0KFwiXFxuXCIpLmpvaW4oXCJcXG5cIitpbmRlbnQpKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdHMuam9pbihcIlxcblwiKTtcblx0fVxufVxuXG5cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGUuanMiLCJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqIFxuICovXG5cbmZ1bmN0aW9uIG1ha2VFbXB0eUZ1bmN0aW9uKGFyZykge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBhcmc7XG4gIH07XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBhY2NlcHRzIGFuZCBkaXNjYXJkcyBpbnB1dHM7IGl0IGhhcyBubyBzaWRlIGVmZmVjdHMuIFRoaXMgaXNcbiAqIHByaW1hcmlseSB1c2VmdWwgaWRpb21hdGljYWxseSBmb3Igb3ZlcnJpZGFibGUgZnVuY3Rpb24gZW5kcG9pbnRzIHdoaWNoXG4gKiBhbHdheXMgbmVlZCB0byBiZSBjYWxsYWJsZSwgc2luY2UgSlMgbGFja3MgYSBudWxsLWNhbGwgaWRpb20gYWxhIENvY29hLlxuICovXG52YXIgZW1wdHlGdW5jdGlvbiA9IGZ1bmN0aW9uIGVtcHR5RnVuY3Rpb24oKSB7fTtcblxuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJucyA9IG1ha2VFbXB0eUZ1bmN0aW9uO1xuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc0ZhbHNlID0gbWFrZUVtcHR5RnVuY3Rpb24oZmFsc2UpO1xuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc1RydWUgPSBtYWtlRW1wdHlGdW5jdGlvbih0cnVlKTtcbmVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNOdWxsID0gbWFrZUVtcHR5RnVuY3Rpb24obnVsbCk7XG5lbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zVGhpcyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXM7XG59O1xuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc0FyZ3VtZW50ID0gZnVuY3Rpb24gKGFyZykge1xuICByZXR1cm4gYXJnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbXB0eUZ1bmN0aW9uO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvZW1wdHlGdW5jdGlvbi5qc1xuLy8gbW9kdWxlIGlkID0gMTQ5XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDEzLXByZXNlbnQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFVzZSBpbnZhcmlhbnQoKSB0byBhc3NlcnQgc3RhdGUgd2hpY2ggeW91ciBwcm9ncmFtIGFzc3VtZXMgdG8gYmUgdHJ1ZS5cbiAqXG4gKiBQcm92aWRlIHNwcmludGYtc3R5bGUgZm9ybWF0IChvbmx5ICVzIGlzIHN1cHBvcnRlZCkgYW5kIGFyZ3VtZW50c1xuICogdG8gcHJvdmlkZSBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IGJyb2tlIGFuZCB3aGF0IHlvdSB3ZXJlXG4gKiBleHBlY3RpbmcuXG4gKlxuICogVGhlIGludmFyaWFudCBtZXNzYWdlIHdpbGwgYmUgc3RyaXBwZWQgaW4gcHJvZHVjdGlvbiwgYnV0IHRoZSBpbnZhcmlhbnRcbiAqIHdpbGwgcmVtYWluIHRvIGVuc3VyZSBsb2dpYyBkb2VzIG5vdCBkaWZmZXIgaW4gcHJvZHVjdGlvbi5cbiAqL1xuXG52YXIgdmFsaWRhdGVGb3JtYXQgPSBmdW5jdGlvbiB2YWxpZGF0ZUZvcm1hdChmb3JtYXQpIHt9O1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICB2YWxpZGF0ZUZvcm1hdCA9IGZ1bmN0aW9uIHZhbGlkYXRlRm9ybWF0KGZvcm1hdCkge1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhcmlhbnQgcmVxdWlyZXMgYW4gZXJyb3IgbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gaW52YXJpYW50KGNvbmRpdGlvbiwgZm9ybWF0LCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIHZhbGlkYXRlRm9ybWF0KGZvcm1hdCk7XG5cbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICB2YXIgZXJyb3I7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcignTWluaWZpZWQgZXhjZXB0aW9uIG9jY3VycmVkOyB1c2UgdGhlIG5vbi1taW5pZmllZCBkZXYgZW52aXJvbm1lbnQgJyArICdmb3IgdGhlIGZ1bGwgZXJyb3IgbWVzc2FnZSBhbmQgYWRkaXRpb25hbCBoZWxwZnVsIHdhcm5pbmdzLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYXJncyA9IFthLCBiLCBjLCBkLCBlLCBmXTtcbiAgICAgIHZhciBhcmdJbmRleCA9IDA7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihmb3JtYXQucmVwbGFjZSgvJXMvZywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gYXJnc1thcmdJbmRleCsrXTtcbiAgICAgIH0pKTtcbiAgICAgIGVycm9yLm5hbWUgPSAnSW52YXJpYW50IFZpb2xhdGlvbic7XG4gICAgfVxuXG4gICAgZXJyb3IuZnJhbWVzVG9Qb3AgPSAxOyAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGludmFyaWFudCdzIG93biBmcmFtZVxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW52YXJpYW50O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvaW52YXJpYW50LmpzXG4vLyBtb2R1bGUgaWQgPSAxNTBcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gR1JSUi4uLiBub2RlIGRvZXNuJ3QgaW5jbHVkZSB0aGlzPz8/XG4vLyBDSEVDSyBESUZGRVJFTlQgTk9ERSBWRVJTSU9OUy4uLlxuaWYgKCEoQXJyYXkucHJvdG90eXBlLmluY2x1ZGVzKSkge1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCBcImluY2x1ZGVzXCIsIHtcblx0XHR2YWx1ZTogZnVuY3Rpb24odmFsdWUsIHN0YXJ0KSB7XG5cdFx0XHRsZXQgaW5kZXggPSB0aGlzLmluZGV4T2YodmFsdWUsIHN0YXJ0KTtcblx0XHRcdHJldHVybiAoaW5kZXggIT09IC0xKTtcblx0XHR9XG5cdH0pO1xufVxuXG5cbi8vXG4vL1x0IyBUb2tlbml6ZXJcbi8vXHQtIGAudG9rZW5pemUoKWAgXHRcdEJyZWFrcyB1cCBsb25nIHN0cmluZyBpbnRvIHRva2VucywgaW5jbHVkaW5nIG5ld2xpbmVzLCBKU1ggZXhwcmVzc2lvbnMsIGV0Yy5cbi8vXHQtIGAudG9rZW5pemVMaW5lcygpYCBcdFRha2VzIHRoZSBhYm92ZSBhbmQgYnJlYWtzIGl0IGludG8gYW4gYXJyYXkgb2YgYXJyYXlzIGZvciBlYWNoIGxpbmUuXG4vL1xuLy8gVE9ETzogZXJyb3IgY2hlY2tpbmcgLyByZXBvcnRpbmcsIGVzcGVjaWFsbHkgaW4gSlNYIGV4cHJlc3Npb25zLlxuLy8gVE9ETzogaGF2ZSBub3JtYWwgYHRva2VuaXplYCBzdGljayB3aGl0ZXNwYWNlIGVsZW1lbnRzIGluIHRoZSBzdHJlYW0sIHRoZW4gYHRva2VuaXplTGluZXMoKWAgdGFrZXMgdGhlbSBvdXQ/XG5jb25zdCBUb2tlbml6ZXIgPSB7XG5cblx0Ly8gVG9rZW5pemUgdGV4dCBiZXR3ZWVuIGBzdGFydGAgYW5kIGBlbmRgIGludG8gYW4gYXJyYXkgb2YgYHJlc3VsdHNgLCBhbiBhcnJheSBvZjpcblx0Ly9cdC0gYFRva2VuaXplci5ORVdMSU5FYCBmb3IgYSBuZXdsaW5lIHN5bWJvbFxuXHQvL1x0LSBzdHJpbmdzIGZvciBrZXl3b3Jkcy9zeW1ib2xzXG5cdC8vXHQtIG51bWJlcnMgZm9yIG51bWJlciBsaXRlcmFsc1xuXHQvL1x0LSBgeyBpbmRlbnQ6IG51bWJlciB9YCBmb3IgaW5kZW50IGF0IHN0YXJ0IG9mIGxpbmVcblx0Ly9cdC0gYHsgdHlwZTogXCJ0ZXh0XCIsIGxpdGVyYWw6IFwiJ2FiYydcIiwgdGV4dDogXCJhYmNcIiB9XG5cdC8vXHQtIGB7IHR5cGU6IFwiaW5kZW50XCIsIGxldmVsOiA3IH1gXG5cdC8vXHQtIGB7IHR5cGU6IFwiY29tbWVudFwiLCBjb21tZW50OiBcInN0cmluZ1wiLCBjb21tZW50U3ltYm9sLCB3aGl0ZXNwYWNlIH1gXG4vL1RFU1RNRVxuXHR0b2tlbml6ZSh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHQvLyBxdWljayByZXR1cm4gb3V0IG9mIHJhbmdlIG9yIG9ubHkgd2hpdGVzcGFjZVxuXHRcdGlmIChzdGFydCA+PSBlbmQgfHwgIXRleHQudHJpbSgpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHRva2VucyA9IFtdO1xuXHRcdC8vIFByb2Nlc3Mgb3VyIHRvcC1sZXZlbCBydWxlcy5cblx0XHRsZXQgW3Jlc3VsdHMsIG5leHRTdGFydF0gPSB0aGlzLmVhdFRva2Vucyh0aGlzLm1hdGNoVG9wVG9rZW5zLCB0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRpZiAocmVzdWx0cykge1xuXHRcdFx0dG9rZW5zID0gdG9rZW5zLmNvbmNhdChyZXN1bHRzKTtcblx0XHRcdHN0YXJ0ID0gbmV4dFN0YXJ0O1xuXHRcdH1cblx0XHRpZiAoc3RhcnQgIT09IGVuZCkgY29uc29sZS53YXJuKFwidG9rZW5pemUoKTogZGlkbid0IGNvbnN1bWU6IGBcIiwgdGV4dC5zbGljZShzdGFydCwgZW5kKSArIFwiYFwiKTtcblxuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9LFxuXG5cdC8vIFJlcGVhdGVkbHkgZXhlY3V0ZSBhIGBtZXRob2RgIChib3VuZCB0byBgdGhpcykgd2hpY2ggcmV0dXJucyBhIGBbcmVzdWx0LCBuZXh0U3RhcnRdYCBvciBgdW5kZWZpbmVkYC5cblx0Ly8gUGxhY2VzIG1hdGNoZWQgcmVzdWx0cyB0b2dldGhlciBpbiBgcmVzdWx0c2AgYXJyYXkgYW5kIHJldHVybnMgYFtyZXN1bHRzLCBuZXh0U3RhcnRdYCBmb3IgdGhlIGVudGlyZSBzZXQuXG5cdC8vIFN0b3BzIGlmIGBtZXRob2RgIGRvZXNuJ3QgcmV0dXJuIGFueXRoaW5nLCBvciBpZiBjYWxsaW5nIGBtZXRob2RgIGlzIHVucHJvZHVjdGl2ZS5cbi8vVEVTVE1FXG5cdGVhdFRva2VucyhtZXRob2QsIHRleHQsIHN0YXJ0ID0gMCwgZW5kLCByZXN1bHRzID0gW10pIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIHByb2Nlc3MgcnVsZXMgcmVwZWF0ZWRseSB1bnRpbCB3ZSBnZXQgdG8gdGhlIGVuZFxuXHRcdHdoaWxlIChzdGFydCA8IGVuZCkge1xuXHRcdFx0bGV0IHJlc3VsdCA9IG1ldGhvZC5jYWxsKHRoaXMsIHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdFx0aWYgKCFyZXN1bHQpIGJyZWFrO1xuXG5cdFx0XHRsZXQgW3Rva2VucywgbmV4dFN0YXJ0XSA9IHJlc3VsdDtcblx0XHRcdC8vIEJhaWwgaWYgd2UgZGlkbid0IGdldCBhIHByb2R1Y3RpdmUgcnVsZSFcblx0XHRcdGlmIChzdGFydCA9PT0gbmV4dFN0YXJ0KSBicmVhaztcblxuXHRcdFx0Ly8gaGFuZGxlIG5ld1Jlc3VsdHMgYXMgYW4gYXJyYXkgb3Igc2luZ2xlIG9iamVjdC5cblx0XHRcdGlmICh0b2tlbnMgIT09IHVuZGVmaW5lZCkgcmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KHRva2Vucyk7XG5cdFx0XHRzdGFydCA9IG5leHRTdGFydDtcblx0XHR9XG5cdFx0cmV0dXJuIFtyZXN1bHRzLCBzdGFydF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYSBzaW5nbGUgdG9wLWxldmVsIHRva2VuIGF0IGB0ZXh0W3N0YXJ0XWAuXG4vL1RFU1RNRVxuXHRtYXRjaFRvcFRva2Vucyh0ZXh0LCBzdGFydCwgZW5kKSB7XG5cdFx0cmV0dXJuXHR0aGlzLm1hdGNoV2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0IHx8IHRoaXMubWF0Y2hXb3JkKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaE51bWJlcih0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0IHx8IHRoaXMubWF0Y2hOZXdsaW5lKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaEpTWEVsZW1lbnQodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdCB8fCB0aGlzLm1hdGNoVGV4dCh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0IHx8IHRoaXMubWF0Y2hDb21tZW50KHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaFN5bWJvbCh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdDtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgU3ltYm9sIGNoYXJhY3RlclxuXHQvL1xuXG5cdC8vIE1hdGNoIHRoZSBzaW5nbGUgXCJzeW1ib2xcIiBjaGFyYWN0ZXIgYXQgYHRleHRbc3RhcnRdYC5cblx0Ly8gTk9URTogVGhpcyBkb2VzIG5vdCBkbyBhbnkgY2hlY2tpbmcsIGl0IGp1c3QgYmxpbmRseSB1c2VzIHRoZSBjaGFyYWN0ZXIgaW4gcXVlc3Rpb24uXG5cdC8vXHRcdCBZb3Ugc2hvdWxkIG1ha2Ugc3VyZSBhbGwgb3RoZXIgcG9zc2libGUgcnVsZXMgaGF2ZSBiZWVuIGV4aGF1c3RlZCBmaXJzdC5cblx0bWF0Y2hTeW1ib2wodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiBbdGV4dFtzdGFydF0sIHN0YXJ0ICsgMV1cblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgV2hpdGVzcGFjZVxuXHQvL1xuXG5cdC8vIFJldHVybiB0aGUgZmlyc3QgY2hhciBwb3NpdGlvbiBhZnRlciBgc3RhcnRgIHdoaWNoIGlzIE5PVCBhIHdoaXRlc3BhY2UgY2hhciAoc3BhY2Ugb3IgdGFiIG9ubHkpLlxuXHQvLyBJZiBgdGV4dFtzdGFydF1gIGlzIG5vdCB3aGl0ZXNwYWNlLCByZXR1cm5zIGBzdGFydGAsXG5cdC8vXHRzbyB5b3UgY2FuIGNhbGwgdGhpcyBhdCBhbnkgdGltZSB0byBza2lwIHdoaXRlc3BhY2UgaW4gdGhlIG91dHB1dC5cblx0ZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gZW5kO1xuXG5cdFx0bGV0IHdoaXRlU3BhY2VFbmQgPSBzdGFydDtcblx0XHR3aGlsZSAod2hpdGVTcGFjZUVuZCA8IGVuZCAmJiAodGV4dFt3aGl0ZVNwYWNlRW5kXSA9PT0gXCIgXCIgfHwgdGV4dFt3aGl0ZVNwYWNlRW5kXSA9PT0gXCJcXHRcIikpIHtcblx0XHRcdHdoaXRlU3BhY2VFbmQrKztcblx0XHR9XG5cdFx0cmV0dXJuIHdoaXRlU3BhY2VFbmQ7XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIFdoaXRlc3BhY2Vcblx0Ly9cdE5PVEU6IFdoaXRlc3BhY2UgYXQgdGhlIGJlZ2lubmluZyBvZiBgdGV4dGAgb3IgdGhlIGJlZ2lubmluZyBvZiBhIGxpbmVcblx0Ly9cdFx0ICBpcyBjb25zaWRlcmVkIGFuIFwiaW5kZW50XCIgYW5kIHdpbGwgaGF2ZSBgLmlzSW5kZW50ID09PSB0cnVlYC5cblx0Ly9cblxuXHQvLyBDb252ZXJ0IGEgcnVuIG9mIHNwYWNlcyBhbmQvb3IgdGFicyBpbnRvIGEgYFRva2VuaXplci5XaGl0ZXNwYWNlYC5cblx0bWF0Y2hXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgd2hpdGVzcGFjZUVuZCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHQvLyBmb3JnZXQgaXQgaWYgbm8gZm9yd2FyZCBtb3Rpb25cblx0XHRpZiAod2hpdGVzcGFjZUVuZCA9PT0gc3RhcnQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgdG9rZW4gPSBuZXcgVG9rZW5pemVyLldoaXRlc3BhY2UodGV4dC5zbGljZShzdGFydCwgd2hpdGVzcGFjZUVuZCkpO1xuXG5cdFx0Ly8gaWYgdGhlIGNoYXIgQkVGT1JFIHN0YXJ0IGlzIGEgbmV3bGluZSwgY29uc2lkZXIgdGhpcyBhbiBcImluZGVudFwiXG5cdFx0aWYgKHN0YXJ0ID09PSAwIHx8IHRleHRbc3RhcnQtMV0gPT09IFwiXFxuXCIpIHRva2VuLmlzSW5kZW50ID0gdHJ1ZTtcblxuXHRcdHJldHVybiBbdG9rZW4sIHdoaXRlc3BhY2VFbmRdO1xuXHR9LFxuXG5cdC8vIFdoaXRlc3BhY2UgY2xhc3Ncblx0V2hpdGVzcGFjZSA6IGNsYXNzIHdoaXRlc3BhY2Uge1xuXHRcdGNvbnN0cnVjdG9yKHdoaXRlc3BhY2UpIHtcblx0XHRcdHRoaXMud2hpdGVzcGFjZSA9IHdoaXRlc3BhY2U7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIHRoZSBcImxlbmd0aFwiIG9mIHRoaXMgd2hpdGVzcGFjZSwgZWcgZm9yIGFuIGluZGVudC5cblx0XHRnZXQgbGVuZ3RoKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMud2hpdGVzcGFjZS5sZW5ndGg7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIHRydWUgaWYgdGhpcyBpbmRlbnQgaXMgYWxsIHRhYnNcblx0XHRnZXQgaXNUYWJzKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMud2hpdGVzcGFjZS5zcGxpdChcIlwiKS5ldmVyeShzcGFjZSA9PiBzcGFjZSA9PT0gXCJcXHRcIik7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIHRydWUgaWYgdGhpcyBpbmRlbnQgaXMgYWxsIHNwYWNlc1xuXHRcdGdldCBpc1RhYnMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy53aGl0ZXNwYWNlLnNwbGl0KFwiXCIpLmV2ZXJ5KHNwYWNlID0+IHNwYWNlID09PSBcIlxcdFwiKTtcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4gdHJ1ZSBpZiB0aGlzIGluZGVudCBpcyBtaXhlZCB0YWJzIGFuZCBzcGFjZXNcblx0XHRnZXQgaXNNaXhlZCgpIHtcblx0XHRcdGxldCBmaXJzdENoYXIgPSB0aGlzLndoaXRlc3BhY2VbMF07XG5cdFx0XHRyZXR1cm4gdGhpcy53aGl0ZXNwYWNlLnNwbGl0KFwiXCIpLnNvbWUoc3BhY2UgPT4gc3BhY2UgIT09IGZpcnN0Q2hhcik7XG5cdFx0fVxuXG5cblx0XHR0b1N0cmluZygpIHtcblx0XHRcdHJldHVybiB0aGlzLndoaXRlc3BhY2U7XG5cdFx0fVxuXHR9LFxuXG5cblxuXHQvL1xuXHQvL1x0IyMjIE5ld2xpbmVcblx0Ly9cblxuXHQvLyBOZXdsaW5lIG1hcmtlciAoc2luZ2xldG9uKS5cblx0TkVXTElORSA6IG5ldyAoY2xhc3MgbmV3bGluZSB7fSkoKSxcblxuXG5cdC8vIE1hdGNoIGEgc2luZ2xlIG5ld2xpbmUgY2hhcmFjdGVyIGF0IGB0ZXh0W3N0YXJ0XWAuXG5cdC8vIFJldHVybnMgYFtUb2tlbml6ZXIuTkVXTElORSwgbmV4dFN0YXJ0XWAgb24gbWF0Y2guXG5cdC8vIE90aGVyd2lzZSByZXR1cm5zIGB1bmRlZmluZWRgLlxuXHRtYXRjaE5ld2xpbmUodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCB8fCB0ZXh0W3N0YXJ0XSAhPT0gXCJcXG5cIikgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiBbVG9rZW5pemVyLk5FV0xJTkUsIHN0YXJ0ICsgMV07XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIFdvcmRcblx0Ly9cblxuXHQvLyBNYXRjaCBhIHNpbmdsZSBgd29yZGAgaW4gYHRleHRgIGF0IGNoYXJhY3RlciBgc3RhcnRgLlxuXHQvLyBSZXR1cm5zIGBbd29yZCwgd29yZEVuZF1gLlxuXHQvLyBSZXR1cm5zIGFuIGVtcHR5IGFycmF5IGlmIGNvdWxkbid0IG1hdGNoIGEgd29yZC5cblx0V09SRF9TVEFSVDogL1tBLVphLXpdLyxcblx0V09SRF9DSEFSIDogL15bXFx3Xy1dLyxcblx0bWF0Y2hXb3JkKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAoIXRoaXMuV09SRF9TVEFSVC50ZXN0KHRleHRbc3RhcnRdKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCB3b3JkRW5kID0gc3RhcnQgKyAxO1xuXHRcdHdoaWxlICh3b3JkRW5kIDwgZW5kICYmIHRoaXMuV09SRF9DSEFSLnRlc3QodGV4dFt3b3JkRW5kXSkpIHtcblx0XHRcdHdvcmRFbmQrKztcblx0XHR9XG5cdFx0aWYgKHdvcmRFbmQgPT09IHN0YXJ0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHdvcmQgPSB0ZXh0LnNsaWNlKHN0YXJ0LCB3b3JkRW5kKTtcblx0XHRyZXR1cm4gW3dvcmQsIHdvcmRFbmRdO1xuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBOdW1iZXJzXG5cdC8vXG5cblx0Ly8gRWF0IGEgc2luZ2xlIG51bWJlci5cblx0Ly8gUmV0dXJucyBhIGBOdW1iZXJgIGlmIG1hdGNoZWQuXG5cdE5VTUJFUl9TVEFSVDogL1swLTktLl0vLFxuXHROVU1CRVIgOiAvXi0/KFswLTldKlxcLik/WzAtOV0rLyxcblx0bWF0Y2hOdW1iZXIodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGlmICghdGhpcy5OVU1CRVJfU1RBUlQudGVzdCh0ZXh0W3N0YXJ0XSkpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgbnVtYmVyTWF0Y2ggPSB0aGlzLm1hdGNoRXhwcmVzc2lvbkF0SGVhZCh0aGlzLk5VTUJFUiwgdGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0aWYgKCFudW1iZXJNYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBudW1iZXJTdHIgPSBudW1iZXJNYXRjaFswXTtcblx0XHRsZXQgbnVtYmVyID0gcGFyc2VGbG9hdChudW1iZXJTdHIsIDEwKTtcblx0XHRyZXR1cm4gW251bWJlciwgc3RhcnQgKyBudW1iZXJTdHIubGVuZ3RoXTtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgVGV4dCBsaXRlcmFsXG5cdC8vXG5cblx0Ly8gRWF0IGEgdGV4dCBsaXRlcmFsIChzdGFydHMvZW5kcyB3aXRoIGAnYCBvciBgXCJgKS5cblx0Ly8gUmV0dXJucyBhIGBUb2tlbml6ZXIuVGV4dGAgaWYgbWF0Y2hlZC5cbi8vVEVTVE1FOiAgbm90IHN1cmUgdGhlIGVzY2FwaW5nIGxvZ2ljIGlzIHJlYWxseSByaWdodC4uLlxuXHRtYXRjaFRleHQodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBxdW90ZVN5bWJvbCA9IHRleHRbc3RhcnRdO1xuXHRcdGlmIChxdW90ZVN5bWJvbCAhPT0gJ1wiJyAmJiBxdW90ZVN5bWJvbCAhPT0gXCInXCIpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgdGV4dEVuZCA9IHN0YXJ0ICsgMTtcblx0XHR3aGlsZSAodGV4dEVuZCA8IGVuZCkge1xuXHRcdFx0bGV0IGNoYXIgPSB0ZXh0W3RleHRFbmRdO1xuXHRcdFx0aWYgKGNoYXIgPT09IHF1b3RlU3ltYm9sKSBicmVhaztcblx0XHRcdC8vIGlmIHdlIGdldCBhIGJhY2txdW90ZSwgaWdub3JlIHF1b3RlIGluIG5leHQgY2hhclxuXHRcdFx0aWYgKGNoYXIgPT09IFwiXFxcXFwiICYmIHRleHRbdGV4dEVuZCArIDFdID09PSBxdW90ZVN5bWJvbCkgdGV4dEVuZCsrO1xuXHRcdFx0dGV4dEVuZCsrO1xuXHRcdH1cblx0XHQvLyBGb3JnZXQgaXQgaWYgd2UgZGlkbid0IGVuZCB3aXRoIHRoZSBxdW90ZSBzeW1ib2xcblx0XHRpZiAodGV4dFt0ZXh0RW5kXSAhPT0gcXVvdGVTeW1ib2wpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0Ly8gYWR2YW5jZSBwYXN0IGVuZCBxdW90ZVxuXHRcdHRleHRFbmQrKztcblxuXHRcdGxldCBxdW90ZWRTdHJpbmcgPSB0ZXh0LnNsaWNlKHN0YXJ0LCB0ZXh0RW5kKTtcblx0XHRsZXQgdG9rZW4gPSBuZXcgVG9rZW5pemVyLlRleHQocXVvdGVkU3RyaW5nKTtcblx0XHRyZXR1cm4gW3Rva2VuLCB0ZXh0RW5kXTtcblx0fSxcblxuXHQvLyBgVGV4dGAgY2xhc3MgZm9yIHN0cmluZyBsaXRlcmFscy5cblx0Ly8gUGFzcyB0aGUgbGl0ZXJhbCB2YWx1ZSwgdXNlIGAudGV4dGAgdG8gZ2V0IGp1c3QgdGhlIGJpdCBpbnNpZGUgdGhlIHF1b3Rlcy5cblx0VGV4dCA6IGNsYXNzIHRleHQge1xuXHRcdGNvbnN0cnVjdG9yKHF1b3RlZFN0cmluZykge1xuXHRcdFx0dGhpcy5xdW90ZWRTdHJpbmcgPSBxdW90ZWRTdHJpbmc7XG5cdFx0fVxuXHRcdGdldCB0ZXh0KCkge1xuXHRcdFx0bGV0IHN0cmluZyA9IHRoaXMucXVvdGVkU3RyaW5nO1xuXHRcdFx0Ly8gY2FsY3VsYXRlIGB0ZXh0YCBhcyB0aGUgYml0cyBiZXR3ZWVuIHRoZSBxdW90ZXMuXG5cdFx0XHRsZXQgc3RhcnQgPSAwO1xuXHRcdFx0bGV0IGVuZCA9IHN0cmluZy5sZW5ndGg7XG5cdFx0XHRpZiAoc3RyaW5nW3N0YXJ0XSA9PT0gJ1wiJyB8fCBzdHJpbmdbc3RhcnRdID09PSBcIidcIikgc3RhcnQgPSAxO1xuXHRcdFx0aWYgKHN0cmluZ1tlbmQtMV0gPT09ICdcIicgfHwgc3RyaW5nW2VuZC0xXSA9PT0gXCInXCIpIGVuZCA9IC0xO1xuXHRcdFx0cmV0dXJuIHN0cmluZy5zbGljZShzdGFydCwgZW5kKTtcblx0XHR9XG5cdFx0dG9TdHJpbmcoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5xdW90ZWRTdHJpbmc7XG5cdFx0fVxuXHR9LFxuXG5cdC8vXG5cdC8vXHQjIyMgQ29tbWVudHNcblx0Ly9cblxuXHQvLyBFYXQgYSBjb21tZW50ICh1bnRpbCB0aGUgZW5kIG9mIHRoZSBsaW5lKS5cblx0Ly8gUmV0dXJucyBhIGBUb2tlbml6ZXIuQ29tbWVudGAgaWYgbWF0Y2hlZC5cblx0Q09NTUVOVCA6IC9eKCMjK3wtLSt8XFwvXFwvKykoXFxzKikoLiopLyxcblx0bWF0Y2hDb21tZW50KHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgY29tbWVudFN0YXJ0ID0gdGV4dC5zbGljZShzdGFydCwgc3RhcnQgKyAyKTtcblx0XHRpZiAoY29tbWVudFN0YXJ0ICE9PSBcIi0tXCIgJiYgY29tbWVudFN0YXJ0ICE9PSBcIlxcL1xcL1wiICYmIGNvbW1lbnRTdGFydCAhPT0gXCIjI1wiKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gY29tbWVudCBlYXRzIHVudGlsIHRoZSBlbmQgb2YgdGhlIGxpbmVcblx0XHRsZXQgbGluZSA9IHRoaXMuZ2V0TGluZUF0SGVhZCh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRsZXQgY29tbWVudE1hdGNoID0gbGluZS5tYXRjaCh0aGlzLkNPTU1FTlQpXG5cdFx0aWYgKCFjb21tZW50TWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgW21hdGNoLCBjb21tZW50U3ltYm9sLCB3aGl0ZXNwYWNlLCBjb21tZW50XSA9IGNvbW1lbnRNYXRjaDtcblx0XHRsZXQgdG9rZW4gPSBuZXcgVG9rZW5pemVyLkNvbW1lbnQoeyBjb21tZW50U3ltYm9sLCB3aGl0ZXNwYWNlLCBjb21tZW50IH0pO1xuXHRcdHJldHVybiBbdG9rZW4sIHN0YXJ0ICsgbGluZS5sZW5ndGhdO1xuXHR9LFxuXG5cdC8vIENvbW1lbnQgY2xhc3Ncbi8vVEVTVE1FXG5cdENvbW1lbnQgOiBjbGFzcyBjb21tZW50IHtcblx0XHRjb25zdHJ1Y3RvciAocHJvcHMpIHtcblx0XHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcHMpO1xuXHRcdH1cblx0XHR0b1N0cmluZygpIHtcblx0XHRcdHJldHVybiBgJHt0aGlzLmNvbW1lbnRTeW1ib2x9JHt0aGlzLndoaXRlc3BhY2V9JHt0aGlzLmNvbW1lbnR9YDtcblx0XHR9XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIEpTWFxuXHQvL1xuXG5cdC8vIEVhdCBhIChuZXN0ZWQpIEpTWCBleHByZXNzaW9uLlxuLy9URVNUTUVcblx0bWF0Y2hKU1hFbGVtZW50KHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgW2pzeEVsZW1lbnQsIG5leHRTdGFydF0gPSB0aGlzLm1hdGNoSlNYU3RhcnRUYWcodGV4dCwgc3RhcnQsIGVuZCkgfHwgW107XG5cdFx0aWYgKCFqc3hFbGVtZW50KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKCFqc3hFbGVtZW50LmlzVW5hcnlUYWcpIHtcblx0XHRcdGxldCBbY2hpbGRyZW4sIGNoaWxkRW5kXSA9IHRoaXMubWF0Y2hKU1hDaGlsZHJlbihqc3hFbGVtZW50LnRhZ05hbWUsIHRleHQsIG5leHRTdGFydCwgZW5kKTtcblx0XHRcdGlmIChjaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdFx0anN4RWxlbWVudC5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuXHRcdFx0XHRuZXh0U3RhcnQgPSBjaGlsZEVuZDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gW2pzeEVsZW1lbnQsIG5leHRTdGFydF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggSlNYIHN0YXJ0IHRhZyBhbmQgaW50ZXJuYWwgZWxlbWVudHMgKGJ1dCBOT1QgY2hpbGRyZW4pLlxuXHQvLyBSZXR1cm5zIGBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XWAgb3IgYHVuZGVmaW5lZGAuXG5cdC8vIFVzZSBgbWF0Y2hKU1hFbGVtZW50KClgIHRvIG1hdGNoIGNoaWxkcmVuLCBlbmQgdGFnLCBldGMuXG5cdC8vIElnbm9yZXMgbGVhZGluZyB3aGl0ZXNwYWNlLlxuXHRKU1hfVEFHX1NUQVJUIDogL148KFtBLVphLXpdW1xcdy1cXC5dKikoXFxzKlxcLz58XFxzKj58XFxzKykvLFxuLy8gVE9ETzogY2xlYW4gdGhpcyBzdHVmZiB1cCwgbWF5YmUgd2l0aCBmaW5kRmlyc3RBdEhlYWQ/XG5cdG1hdGNoSlNYU3RhcnRUYWcodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBuZXh0U3RhcnQgPSB0aGlzLmVhdFdoaXRlc3BhY2UodGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0Ly8gTWFrZSBzdXJlIHdlIHN0YXJ0IHdpdGggYDxgLlxuXHRcdGlmICh0ZXh0W25leHRTdGFydF0gIT09IFwiPFwiKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHRhZ01hdGNoID0gdGhpcy5tYXRjaEV4cHJlc3Npb25BdEhlYWQodGhpcy5KU1hfVEFHX1NUQVJULCB0ZXh0LCBuZXh0U3RhcnQsIGVuZCk7XG5cdFx0aWYgKCF0YWdNYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBbIG1hdGNoVGV4dCwgdGFnTmFtZSwgZW5kQml0IF0gPSB0YWdNYXRjaDtcblx0XHRsZXQganN4RWxlbWVudCA9IG5ldyBUb2tlbml6ZXIuSlNYRWxlbWVudCh0YWdOYW1lKTtcblx0XHRuZXh0U3RhcnQgPSBuZXh0U3RhcnQgKyBtYXRjaFRleHQubGVuZ3RoO1xuXG5cdFx0Ly8gSWYgdW5hcnkgdGFnLCBtYXJrIGFzIHN1Y2ggYW5kIHJldHVybi5cblx0XHRlbmRCaXQgPSBlbmRCaXQudHJpbSgpO1xuXHRcdGlmIChlbmRCaXQgPT09IFwiLz5cIikge1xuXHRcdFx0anN4RWxlbWVudC5pc1VuYXJ5VGFnID0gdHJ1ZTtcblx0XHRcdHJldHVybiBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XTtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSBkaWRuJ3QgaW1tZWRpYXRlbHkgZ2V0IGFuIGVuZCBtYXJrZXIsIGF0dGVtcHQgdG8gbWF0Y2ggYXR0cmlidXRlc1xuXHRcdGlmIChlbmRCaXQgIT09IFwiPlwiICYmIGVuZEJpdCAhPT0gXCIvPlwiKSB7XG5cdFx0XHRsZXQgWyBhdHRycywgYXR0ckVuZCBdID0gdGhpcy5lYXRUb2tlbnModGhpcy5tYXRjaEpTWEF0dHJpYnV0ZSwgdGV4dCwgbmV4dFN0YXJ0LCBlbmQpO1xuXHRcdFx0anN4RWxlbWVudC5hdHRyaWJ1dGVzID0gYXR0cnM7XG5cdFx0XHRuZXh0U3RhcnQgPSBhdHRyRW5kO1xuXHRcdH1cblxuXHRcdC8vIGF0IHRoaXMgcG9pbnQgd2Ugc2hvdWxkIGdldCBhbiBgLz5gIG9yIGA+YCAod2l0aCBubyB3aGl0ZXNwYWNlKS5cblx0XHRpZiAodGV4dFtuZXh0U3RhcnRdID09PSBcIi9cIiAmJiB0ZXh0W25leHRTdGFydCArIDFdID09PSBcIj5cIikge1xuXHRcdFx0ZW5kQml0ID0gXCIvPlwiO1xuXHRcdFx0bmV4dFN0YXJ0ICs9IDI7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHRleHRbbmV4dFN0YXJ0XSA9PT0gXCI+XCIpIHtcblx0XHRcdGVuZEJpdCA9IHRleHRbbmV4dFN0YXJ0XTtcblx0XHRcdG5leHRTdGFydCArPSAxO1xuXHRcdH1cblxuXHRcdC8vIFJldHVybiBpbW1lZGlhdGVseSBmb3IgdW5hcnkgdGFnXG5cdFx0aWYgKGVuZEJpdCA9PT0gXCIvPlwiKSB7XG5cdFx0XHRqc3hFbGVtZW50LmlzVW5hcnlUYWcgPSB0cnVlO1xuXHRcdFx0cmV0dXJuIFtqc3hFbGVtZW50LCBuZXh0U3RhcnRdO1xuXHRcdH1cblxuXHRcdC8vIGFkdmFuY2UgcGFzdCBgPmBcblx0XHRpZiAoZW5kQml0ICE9PSBcIj5cIikge1xuXHRcdFx0Y29uc29sZS53YXJuKFwiTWlzc2luZyBleHBlY3RlZCBlbmQgYD5gIGZvciBqc3hFbGVtZW50XCIsIGpzeEVsZW1lbnQsIFwiYFwiK3RleHQuc2xpY2Uoc3RhcnQsIG5leHRTdGFydCkrXCJgXCIpO1xuXHRcdFx0anN4RWxlbWVudC5lcnJvciA9IFwiTm8gZW5kID5cIjtcblx0XHRcdHJldHVybiBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XTtcblx0XHR9XG5cblx0XHRyZXR1cm4gW2pzeEVsZW1lbnQsIG5leHRTdGFydF07XG5cdH0sXG5cblxuXHQvLyBKU1ggZWxlbWVudCBjbGFzc1xuXHRKU1hFbGVtZW50IDogY2xhc3MganN4RWxlbWVudCB7XG5cdFx0Y29uc3RydWN0b3IodGFnTmFtZSwgYXR0cmlidXRlcywgY2hpbGRyZW4pIHtcblx0XHRcdHRoaXMudGFnTmFtZSA9IHRhZ05hbWU7XG5cdFx0XHRpZiAoYXR0cmlidXRlcykgdGhpcy5hdHRyaWJ1dGVzID0gYXR0cmlidXRlcztcblx0XHRcdGlmIChjaGlsZHJlbikgdGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuXHRcdH1cblxuXHRcdC8vIFJldHVybiBhdHRyaWJ1dGVzIGFzIGEgbWFwLlxuLy9URVNUTUVcblx0XHRnZXQgYXR0cnMoKSB7XG5cdFx0XHRsZXQgYXR0cnMgPSB7fTtcblx0XHRcdGlmICh0aGlzLmF0dHJpYnV0ZXMpIHRoaXMuYXR0cmlidXRlcy5mb3JFYWNoKGF0dHIgPT4ge1xuXHRcdFx0XHQvLyBpZ25vcmUgdW5uYW1lZCBhdHRyaWJ1dGVzXG5cdFx0XHRcdGlmIChhdHRyLm5hbWUpIGF0dHJzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlXG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBhdHRycztcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4gb3VyIGF0dHJpYnV0ZXMgYXMgYSBzdHJpbmdcbi8vVEVTVE1FXG5cdFx0Z2V0IGF0dHJzQXNTdHJpbmcoKSB7XG5cdFx0XHRpZiAoIXRoaXMuYXR0cmlidXRlcykgcmV0dXJuIFwiXCI7XG5cdFx0XHRyZXR1cm4gXCIgXCIgKyB0aGlzLmF0dHJpYnV0ZXMubWFwKCAoeyBuYW1lLCB2YWx1ZSB9KSA9PiB7XG5cdFx0XHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbmFtZTtcblx0XHRcdFx0Ly8gY29udmVydCB2YWx1ZSBhcnJheSAodG9rZW5zKSB0byBzdHJpbmdcblx0XHRcdFx0Ly8gVE9ETzogdGhpcyB3aWxsIHdhbnQgdG8gYmUgc21hcnRlci4uLlxuXHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHZhbHVlID0gYHske3ZhbHVlLmpvaW4oXCIgXCIpfX1gO1xuXHRcdFx0XHRyZXR1cm4gYG5hbWU9JHt2YWx1ZX1gO1xuXHRcdFx0fSkuam9pbihcIiBcIik7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIG91ciBjaGlsZHJlbiBhcyBhIHN0cmluZy5cbi8vVEVTVE1FXG5cdFx0Z2V0IGNoaWxkcmVuQXNTdHJpbmcoKSB7XG5cdFx0XHRpZiAoIXRoaXMuY2hpbGRyZW4pIHJldHVybiBcIlwiO1xuXHRcdFx0cmV0dXJuIHRoaXMuY2hpbGRyZW4ubWFwKGNoaWxkID0+IHtcblx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkoY2hpbGQpKSByZXR1cm4gYHske2NoaWxkLmpvaW4oXCIgXCIpfX1gO1xuXHRcdFx0XHRyZXR1cm4gXCJcIiArIGNoaWxkO1xuXHRcdFx0fSkuam9pbihcIlwiKTtcblx0XHR9XG5cblx0XHR0b1N0cmluZygpIHtcblx0XHRcdGxldCBhdHRycyA9IHRoaXMuYXR0cnNBc1N0cmluZztcblx0XHRcdGxldCBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW5Bc1N0cmluZztcblx0XHRcdGlmICh0aGlzLmlzVW5hcnlUYWcpIHJldHVybiBgPCR7dGhpcy50YWdOYW1lfSR7YXR0cnN9Lz5gO1xuXHRcdFx0cmV0dXJuIGA8JHt0aGlzLnRhZ05hbWV9JHthdHRyc30+JHtjaGlsZHJlbn08LyR7dGhpcy50YWdOYW1lfT5gO1xuXHRcdH1cblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgSlNYIGNoaWxkcmVuXG5cdC8vXG5cblx0Ly8gTWF0Y2ggSlNYIGVsZW1lbnQgY2hpbGRyZW4gb2YgYDx0YWdOYW1lPmAgYXQgYHRleHRbc3RhcnRdYC5cblx0Ly8gTWF0Y2hlcyBuZXN0ZWQgY2hpbGRyZW4gYW5kIHN0b3BzIGFmdGVyIG1hdGNoaW5nIGVuZCB0YWc6IGA8L3RhZ05hbWU+YC5cblx0Ly8gUmV0dXJucyBgW2NoaWxkcmVuLCBuZXh0U3RhcnRdYC5cbi8vVEVTVE1FXG5cdG1hdGNoSlNYQ2hpbGRyZW4odGFnTmFtZSwgdGV4dCwgc3RhcnQsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IGNoaWxkcmVuID0gW107XG5cdFx0bGV0IG5lc3RpbmcgPSAxO1xuXHRcdGxldCBlbmRUYWcgPSBgPC8ke3RhZ05hbWV9PmA7XG5cblx0XHRsZXQgbmV4dFN0YXJ0ID0gc3RhcnQ7XG5cdFx0d2hpbGUodHJ1ZSkge1xuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMubWF0Y2hKU1hDaGlsZChlbmRUYWcsIHRleHQsIG5leHRTdGFydCwgZW5kKTtcblx0XHRcdGlmICghcmVzdWx0KSBicmVhaztcblxuXHRcdFx0bGV0IFtjaGlsZCwgY2hpbGRFbmRdID0gcmVzdWx0O1xuXHRcdFx0bmV4dFN0YXJ0ID0gY2hpbGRFbmQ7XG5cdFx0XHQvLyBJZiB3ZSBnb3QgdGhlIGVuZFRhZywgdXBkYXRlIG5lc3RpbmcgYW5kIGJyZWFrIG91dCBvZiBsb29wIGlmIG5lc3RpbmcgIT09IDBcblx0XHRcdGlmIChjaGlsZCA9PT0gZW5kVGFnKSB7XG5cdFx0XHRcdG5lc3RpbmcgLS07XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKSBicmVhaztcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0aWYgKGNoaWxkKSBjaGlsZHJlbi5wdXNoKGNoaWxkKTtcblx0XHRcdH1cblx0XHR9XG4vLyBUT0RPOiBob3cgdG8gc3VyZmFjZSB0aGlzIGVycm9yPz8/XG5cdFx0aWYgKG5lc3RpbmcgIT09IDApIHtcblx0XHRcdGNvbnNvbGUud2FybihgbWF0Y2hKU1hDaGlsZHJlbigke3RleHQuc2xpY2Uoc3RhcnQsIG5leHRTdGFydCArIDEwKX06IGRpZG4ndCBtYXRjaCBlbmQgY2hpbGQhYCk7XG5cdFx0fVxuXHRcdHJldHVybiBbY2hpbGRyZW4sIG5leHRTdGFydF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYSBzaW5nbGUgSlNYIGNoaWxkOlxuXHQvL1x0LSBjdXJyZW50IGVuZFRhZ1xuXHQvL1x0LSBgeyBqc3ggZXhwcmVzc2lvbiB9YFxuXHQvL1x0LSBuZXN0ZWQgSlNYIGVsZW1lbnRcblx0Ly9cdC0gKGFueXRoaW5nIGVsc2UpIGFzIGpzeFRleHQgZXhwcmVzc2lvbi5cblx0bWF0Y2hKU1hDaGlsZChlbmRUYWcsIHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hKU1hFbmRUYWcoZW5kVGFnLCB0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0fHwgdGhpcy5tYXRjaEpTWEV4cHJlc3Npb24odGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdHx8IHRoaXMubWF0Y2hKU1hFbGVtZW50KHRleHQsIHN0YXJ0LCBlbmQpXG4vLyBUT0RPOiBuZXdsaW5lIGFuZCBpbmRlbnQ/XG5cdFx0XHR8fCB0aGlzLm1hdGNoSlNYVGV4dCh0ZXh0LCBzdGFydCwgZW5kKTtcblx0fSxcblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIGEgc3BlY2lmaWMgZW5kIHRhZy5cblx0Ly8gSWdub3JlcyBsZWFkaW5nIHdoaXRlc3BhY2UuXG5cdG1hdGNoSlNYRW5kVGFnKGVuZFRhZywgdGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBuZXh0U3RhcnQgPSB0aGlzLmVhdFdoaXRlc3BhY2UodGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0aWYgKCF0aGlzLm1hdGNoU3RyaW5nQXRIZWFkKGVuZFRhZywgdGV4dCwgbmV4dFN0YXJ0LCBlbmQpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiBbZW5kVGFnLCBuZXh0U3RhcnQgKyBlbmRUYWcubGVuZ3RoXTtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgSlNYIGF0dHJpYnV0ZXNcblx0Ly9cblxuXHQvLyBNYXRjaCBhIHNpbmdsZSBKU1ggZWxlbWVudCBhdHRyaWJ1dGUgYXMgYDxhdHRyPj17PHZhbHVlPn1gXG4vLyBUT0RPOiB7Li4ueHh4fVxuXHRKU1hfQVRUUklCVVRFX1NUQVJUIDogL15cXHMqKFtcXHctXStcXGIpXFxzKig9PylcXHMqLyxcblx0bWF0Y2hKU1hBdHRyaWJ1dGUodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGF0dHJpYnV0ZXMgbXVzdCBzdGFydCB3aXRoIGEgd29yZCBjaGFyYWN0ZXJcblx0XHRpZiAoIXRoaXMuV09SRF9TVEFSVC50ZXN0KHRleHRbc3RhcnRdKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGF0dGVtcHQgdG8gbWF0Y2ggYW4gYXR0cmlidXRlIG5hbWUsIGluY2x1ZGluZyBgPWAgaWYgcHJlc2VudC5cblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5tYXRjaEV4cHJlc3Npb25BdEhlYWQodGhpcy5KU1hfQVRUUklCVVRFX1NUQVJULCB0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRpZiAoIXJlc3VsdCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBbIG1hdGNoLCBuYW1lLCBlcXVhbHMgXSA9IHJlc3VsdDtcblx0XHRsZXQgbmV4dFN0YXJ0ID0gc3RhcnQgKyBtYXRjaC5sZW5ndGg7XG5cdFx0bGV0IGF0dHJpYnV0ZSA9IG5ldyBUb2tlbml6ZXIuSlNYQXR0cmlidXRlKG5hbWUpO1xuXG5cdFx0Ly8gaWYgdGhlcmUgd2FzIGFuIGVxdWFscyBjaGFyLCBwYXJzZSB0aGUgdmFsdWVcblx0XHRpZiAoZXF1YWxzKSB7XG5cdFx0XHRsZXQgW3ZhbHVlLCB2YWx1ZUVuZF0gPSB0aGlzLm1hdGNoSlNYQXR0cmlidXRlVmFsdWUodGV4dCwgbmV4dFN0YXJ0LCBlbmQpIHx8IFtdO1xuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdGF0dHJpYnV0ZS52YWx1ZSA9IHZhbHVlO1xuXHRcdFx0XHRuZXh0U3RhcnQgPSB2YWx1ZUVuZDtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gZWF0IHdoaXRlc3BhY2UgYmVmb3JlIHRoZSBuZXh0IGF0dHJpYnV0ZSAvIHRhZyBlbmRcblx0XHRuZXh0U3RhcnQgPSB0aGlzLmVhdFdoaXRlc3BhY2UodGV4dCwgbmV4dFN0YXJ0LCBlbmQpO1xuXHRcdHJldHVybiBbYXR0cmlidXRlLCBuZXh0U3RhcnRdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGEgdmFsdWUgZXhwcmVzc2lvbiBmb3IgYSBKU1ggZWxlbWVudCBhdHRyaWJ1dGU6XG5cdC8vIE5PVEU6IHdlIHdpbGwgYmUgY2FsbGVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBgPWAgKGFuZCBzdWJzZXF1ZW50IHdoaXRlc3BhY2UpLlxuXHRtYXRjaEpTWEF0dHJpYnV0ZVZhbHVlKHRleHQsIHN0YXJ0LCBlbmQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaFRleHQodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdHx8IHRoaXMubWF0Y2hKU1hFeHByZXNzaW9uKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHR8fCB0aGlzLm1hdGNoSlNYRWxlbWVudCh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0fHwgdGhpcy5tYXRjaEpTWEF0dHJpYnV0ZVZhbHVlSWRlbnRpZmllcih0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0fHwgdGhpcy5tYXRjaE51bWJlcih0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdDtcblx0fSxcblxuXHQvLyBNYXRjaCBhIHNpbmdsZSBpZGVudGlmZXIgYXMgYSBKU1ggYXR0cmlidXRlIHZhbHVlLlxuXHQvLyBSZXR1cm5zIGFzIGEgYEpTWEV4cHJlc3Npb25gLlxuXHRtYXRjaEpTWEF0dHJpYnV0ZVZhbHVlSWRlbnRpZmllcih0ZXh0LCBzdGFydCwgZW5kKSB7XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMubWF0Y2hXb3JkKHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm47XG5cblx0XHRsZXQgWyB3b3JkLCBuZXh0U3RhcnQgXSA9IHJlc3VsdDtcblx0XHRsZXQgdG9rZW4gPSBuZXcgVG9rZW5pemVyLkpTWEV4cHJlc3Npb24od29yZCk7XG5cdFx0cmV0dXJuIFt0b2tlbiwgbmV4dFN0YXJ0XTtcblx0fSxcblxuXHQvLyBKU1ggYXR0cmlidXRlIGNsYXNzXG5cdC8vIGBuYW1lYCBpcyB0aGUgbmFtZSBvZiB0aGUgYXR0cmlidXRlLlxuXHQvLyBgdmFsdWVgIGlzIG9uZSBvZjpcblx0Ly9cdFx0LSBgJy4uLidgXHRcdFx0Ly8gVGV4dCAobGl0ZXJhbCBzdHJpbmcpLlxuXHQvL1x0XHQtIGBcIi4uLlwiYFx0XHRcdC8vIFRleHQgKGxpdGVyYWwgc3RyaW5nKS5cblx0Ly9cdFx0LSBgey4uLn1gXHRcdFx0Ly8gRXhwcmVzc2lvbi4gIFJlc3VsdHMgd2lsbCBiZSB0b2tlbml6ZWQgYXJyYXkuXG5cdC8vXHRcdC0gYDwuLi4uPmBcdFx0XHQvLyBKU1ggZWxlbWVudC5cblx0Ly9cdFx0LSBgMWBcdFx0XHRcdC8vIE51bWJlci4gIE5vdGU6IHRoaXMgaXMgYW4gZXh0ZW5zaW9uIHRvIEpTWC5cblxuXHRKU1hBdHRyaWJ1dGUgOiBjbGFzcyBqc3hBdHRyaWJ1dGUge1xuXHRcdGNvbnN0cnVjdG9yKG5hbWUsIHZhbHVlKSB7XG5cdFx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdFx0aWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHRoaXMudmFsdWUgPSB2YWx1ZTtcblx0XHR9XG5cdFx0dG9TdHJpbmcoKSB7XG5cdFx0XHRpZiAodGhpcy52YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5uYW1lO1xuXHRcdFx0cmV0dXJuIGAke3RoaXMubmFtZX09eyR7dGhpcy52YWx1ZX19YDtcblx0XHR9XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBhIEpTWCBleHByZXNzaW9uIGVuY2xvc2VkIGluIGN1cmx5IGJyYWNlcywgZWc6ICBgeyAuLi4gfWAuXG5cdC8vICBIYW5kbGVzIG5lc3RlZCBjdXJsaWVzLCBxdW90ZXMsIGV0Yy5cblx0Ly8gUmV0dXJucyBhcnJheSBvZiB0b2tlbnMgb2YgaW50ZXJuYWwgbWF0Y2guXG5cdC8vIElnbm9yZXMgbGVhZGluZyB3aGl0ZXNwYWNlLlxuLy9UT0RPOiBuZXdsaW5lcy9pbmRlbnRzPz8/XG4vL1RPRE86IHsuLi54eHh9XG4vL1RFU1RNRVxuXHRtYXRjaEpTWEV4cHJlc3Npb24odGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBuZXh0U3RhcnQgPSB0aGlzLmVhdFdoaXRlc3BhY2UodGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0bGV0IGVuZEluZGV4ID0gdGhpcy5maW5kTWF0Y2hpbmdBdEhlYWQoXCJ7XCIsIFwifVwiLCB0ZXh0LCBuZXh0U3RhcnQsIGVuZCk7XG5cdFx0aWYgKGVuZEluZGV4ID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBHZXQgY29udGVudHMsIGluY2x1ZGluZyBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLlxuXHRcdGxldCBjb250ZW50cyA9IHRleHQuc2xpY2Uoc3RhcnQgKyAxLCBlbmRJbmRleCk7XG5cblx0XHQvLyByZXR1cm4gYSBuZXcgSlNYRXhwcmVzc2lvbiwgYWR2YW5jaW5nIGJleW9uZCB0aGUgZW5kaW5nIGB9YC5cblx0XHRsZXQgZXhwcmVzc2lvbiA9IG5ldyBUb2tlbml6ZXIuSlNYRXhwcmVzc2lvbihjb250ZW50cyk7XG5cdFx0cmV0dXJuIFtleHByZXNzaW9uLCBlbmRJbmRleCArIDFdO1xuXHR9LFxuXG5cdC8vIEpTWCBleHByZXNzaW9uLCBjb21wb3NlZCBvZiBpbmxpbmUgdG9rZW5zIHdoaWNoIHNob3VsZCB5aWVsZCBhbiBgZXhwcmVzc2lvbmAuXG5cdEpTWEV4cHJlc3Npb24gOiBjbGFzcyBqc3hFeHByZXNzaW9uIHtcblx0XHRjb25zdHJ1Y3Rvcihjb250ZW50cykge1xuXHRcdFx0dGhpcy5jb250ZW50cyA9IGNvbnRlbnRzIHx8IFwiXCI7XG5cdFx0fVxuXHRcdC8vIERpdmlkZSBjb250ZW50cyBpbnRvIGB0b2tlbnNgLlxuXHRcdGdldCB0b2tlbnMoKSB7XG5cdFx0XHRyZXR1cm4gVG9rZW5pemVyLnRva2VuaXplKHRoaXMuY29udGVudHMudHJpbSgpKTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggSlNYVGV4dCB1bnRpbCB0aGUgb25lIG9mIGB7YCwgYDxgLCBgPmAgb3IgYH1gLlxuXHQvLyBOT1RFOiBJTkNMVURFUyBsZWFkaW5nIC8gdHJhaWxpbmcgd2hpdGVzcGFjZS5cblx0SlNYX1RFWFRfRU5EX0NIQVJTIDogW1wie1wiLCBcIjxcIiwgXCI+XCIsIFwifVwiXSxcbi8vVEVTVE1FXG5cdG1hdGNoSlNYVGV4dCh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gdGVtcG9yYXJpbHkgYWR2YW5jZSBwYXN0IHdoaXRlc3BhY2UgKHdlJ2xsIGluY2x1ZGUgaXQgaW4gdGhlIG91dHB1dCkuXG5cdFx0bGV0IG5leHRTdGFydCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRsZXQgZW5kSW5kZXggPSB0aGlzLmZpbmRGaXJzdEF0SGVhZCh0aGlzLkpTWF9URVhUX0VORF9DSEFSUywgdGV4dCwgbmV4dFN0YXJ0LCBlbmQpO1xuXHRcdC8vIElmIHRoZSBmaXJzdCBub24td2hpdGVzcGFjZSBjaGFyIGlzIGluIG91ciBFTkRfQ0hBUlMsIGZvcmdldCBpdC5cblx0XHRpZiAoZW5kSW5kZXggPT09IG5leHRTdGFydCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGlmIG5vIG1hdGNoLCB3ZSd2ZSBnb3Qgc29tZSBzb3J0IG9mIGVycm9yXG5cdFx0aWYgKGVuZEluZGV4ID09PSB1bmRlZmluZWQpIHtcblx0XHRcdGNvbnNvbGUud2FybihcIm1hdGNoSlNYVGV4dChcIit0ZXh0LnNsaWNlKHN0YXJ0LCBzdGFydCArIDUwKStcIik6IEpTWCBzZWVtcyB0byBiZSB1bmJhbGFuY2VkLlwiKTtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0Ly8gaW5jbHVkZSBsZWFkaW5nIHdoaXRlc3BhY2UgaW4gdGhlIG91dHB1dC5cblx0XHRsZXQganN4VGV4dCA9IHRleHQuc2xpY2Uoc3RhcnQsIGVuZEluZGV4KTtcblx0XHRyZXR1cm4gW2pzeFRleHQsIGVuZEluZGV4XTtcblx0fSxcblxuXG5cblxuXHQvL1xuXHQvL1x0IyMgVXRpbGl0eSBmdW5jdGlvbnNcblx0Ly9cblxuXHQvLyBSZXR1cm4gY2hhcmFjdGVycyB1cCB0bywgYnV0IG5vdCBpbmNsdWRpbmcsIHRoZSBuZXh0IG5ld2xpbmUgY2hhciBhZnRlciBgc3RhcnRgLlxuXHQvLyBJZiBgc3RhcnRgIGlzIGEgbmV3bGluZSBjaGFyIG9yIHN0YXJ0ID49IGVuZCwgcmV0dXJucyBlbXB0eSBzdHJpbmcuXG5cdC8vIElmIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZyAoZWc6IG5vIG1vcmUgbmV3bGluZXMpLCByZXR1cm5zIGZyb20gc3RhcnQgdG8gZW5kLlxuLy9URVNUTUVcblx0Z2V0TGluZUF0SGVhZCh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gXCJcIjtcblxuXHRcdGxldCBuZXdsaW5lID0gdGV4dC5pbmRleE9mKFwiXFxuXCIsIHN0YXJ0KTtcblx0XHRpZiAobmV3bGluZSA9PT0gLTEgfHwgbmV3bGluZSA+IGVuZCkgbmV3bGluZSA9IGVuZDtcblx0XHRyZXR1cm4gdGV4dC5zbGljZShzdGFydCwgbmV3bGluZSk7XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYSBtdWx0aS1jaGFyIHN0cmluZyBzdGFydGluZyBhdCBgdGV4dFtzdGFydF1gLlxuLy9URVNUTUVcblx0bWF0Y2hTdHJpbmdBdEhlYWQoc3RyaW5nLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHN0cmluZ0VuZCA9IHN0YXJ0ICsgc3RyaW5nLmxlbmd0aDtcblx0XHRpZiAoc3RyaW5nRW5kID4gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiBzdHJpbmcgPT09IHRleHQuc2xpY2Uoc3RhcnQsIHN0cmluZ0VuZCk7XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBzdGFydGluZyBhdCBgdGV4dFtzdGFydF1gLCByZXR1cm5pbmcgdGhlIG1hdGNoLlxuXHQvLyBSZXR1cm5zIGBudWxsYCBpZiBubyBtYXRjaC5cblx0Ly9cblx0Ly8gTk9URTogVGhlIGV4cHJlc3Npb24gTVVTVCBzdGFydCB3aXRoIGAvXi4uLi9gXG4vL1RFU1RNRVxuXHRtYXRjaEV4cHJlc3Npb25BdEhlYWQoZXhwcmVzc2lvbiwgdGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBoZWFkID0gdGV4dC5zbGljZShzdGFydCwgZW5kKTtcblx0XHRyZXR1cm4gaGVhZC5tYXRjaChleHByZXNzaW9uKTtcblx0fSxcblxuXHQvLyBGaW5kIGluZGV4IG9mIHRoZSBtYXRjaGluZyBTSU5HTEUgQ0hBUkFDVEVSIGBlbmREZWxpbWl0ZXJgIHRvIG1hdGNoIGBzdGFydERlbGltaXRlcmAuXG5cdC8vIE1hdGNoZXMgbmVzdGVkIGRlbGltaXRlcnMgYW5kIGhhbmRsZXMgZXNjYXBlZCBkZWxpbWl0ZXJzLlxuXHQvLyBBc3N1bWVzIGB0ZXh0W3N0YXJ0XWAgaXMgdGhlIHN0YXJ0RGVsaW1pdGVyIVxuXHQvLyBSZXR1cm5zIG51bWVyaWMgaW5kZXggb3IgYHVuZGVmaW5lZGAgaWYgbm8gbWF0Y2ggb3IgaWYgZmlyc3QgY2hhciBpcyBub3QgYHN0YXJ0RGVsaW1pdGVyYC5cblx0Ly9cblx0Ly9cdEFsc28gaGFuZGxlcyBuZXN0ZWQgcXVvdGVzIC0tIGlmIHdlIGVuY291bnRlciBhIHNpbmdsZSBvciBkb3VibGUgcXVvdGUsXG5cdC8vXHRcdHdlJ2xsIHNraXAgc2Nhbm5pbmcgdW50aWwgd2UgZmluZCBhIG1hdGNoaW5nIHF1b3RlLlxuXHQvL1xuXHQvL1x0ZWc6ICBgZmluZE1hdGNoaW5nQXRIZWFkKFwie1wiLCBcIn1cIiwgXCJ7YWF7YX1hYX1cIilgID0+IDhcbi8vVEVTVE1FXG5cdGZpbmRNYXRjaGluZ0F0SGVhZChzdGFydERlbGltaXRlciwgZW5kRGVsaW1pdGVyLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRleHRbc3RhcnRdICE9PSBzdGFydERlbGltaXRlcikgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgY3VycmVudCA9IHN0YXJ0O1xuXHRcdHdoaWxlIChjdXJyZW50IDwgZW5kKSB7XG5cdFx0XHRsZXQgY2hhciA9IHRleHRbY3VycmVudF07XG5cdFx0XHQvLyBpZiBzdGFydERlbGltaXRlciwgaW5jcmVhc2UgbmVzdGluZ1xuXHRcdFx0aWYgKGNoYXIgPT09IHN0YXJ0RGVsaW1pdGVyKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdH1cblx0XHRcdC8vIGlmIGVuZERlbGltaXRlciwgZGVjcmVhc2UgbmVzdGluZyBhbmQgcmV0dXJuIGlmIG5lc3RpbmcgYmFjayB0byAwXG5cdFx0XHRlbHNlIGlmIChjaGFyID09PSBlbmREZWxpbWl0ZXIpIHtcblx0XHRcdFx0bmVzdGluZy0tO1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMCkgcmV0dXJuIGN1cnJlbnQ7XG5cdFx0XHR9XG5cdFx0XHQvLyBpZiBhIHNpbmdsZSBvciBkb3VibGUgcXVvdGUsIHNraXAgdW50aWwgdGhlIG1hdGNoaW5nIHF1b3RlXG5cdFx0XHRlbHNlIGlmIChjaGFyID09PSBcIidcIiB8fCBjaGFyID09PSAnXCInKSB7XG5cdFx0XHRcdGxldCBbdG9rZW4sIGFmdGVyUXVvdGVdID0gdGhpcy5tYXRjaFRleHQodGV4dCwgY3VycmVudCwgZW5kKSB8fCBbXTtcblx0XHRcdFx0Y3VycmVudCA9IGFmdGVyUXVvdGU7XG5cdFx0XHRcdGNvbnRpbnVlO1x0Ly8gY29udGludWUgc28gd2UgZG9uJ3QgYWRkIDEgdG8gY3VyZW50IGJlbG93XG5cdFx0XHR9XG5cdFx0XHQvLyBJZiBiYWNrc2xhc2gsIHNraXAgYW4gZXh0cmEgY2hhciBpZiBpdCdzIGVpdGhlciBkZWxpbWl0ZXIgb3IgYSBxdW90ZVxuXHRcdFx0ZWxzZSBpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHtcblx0XHRcdFx0Y2hhciA9IHRleHRbY3VycmVudCArIDFdO1xuXHRcdFx0XHRpZiAoY2hhciA9PT0gc3RhcnREZWxpbWl0ZXJcblx0XHRcdFx0IHx8IGNoYXIgPT09IGVuZERlbGltaXRlclxuXHRcdFx0XHQgfHwgY2hhciA9PT0gXCInXCJcblx0XHRcdFx0IHx8IGNoYXIgPT09ICdcIidcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0Y3VycmVudCsrOztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Y3VycmVudCsrO1xuXHRcdH1cblx0fSxcblxuXG4vL1RPRE86ICBgZmluZEF0SGVhZCh0aGluZylgIHdoZXJlIHRoaW5nIGlzXG4vL1x0XHRcdC0gKHNpbmdsZSBvciBtdWx0aS1jaGFyKSBzdHJpbmdcbi8vXHRcdFx0LSBhcnJheSBvZiBhbHRlcm5hdGl2ZSBzdHJpbmdzXG4vL1x0XHRcdC0gcmVndWxhciBleHByZXNzaW9uXG5cblx0Ly8gUmV0dXJuIHRoZSBpbmRleCBvZiB0aGUgZmlyc3QgTk9OLUVTQ0FQRUQgY2hhcmFjdGVyIGluIGBjaGFyc2AgYWZ0ZXIgYHRleHRbc3RhcnRdYC5cblx0Ly8gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiB3ZSBkaWRuJ3QgZmluZCBhIG1hdGNoLlxuLy9URVNUTUVcblx0ZmluZEZpcnN0QXRIZWFkKGNoYXJzLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0d2hpbGUgKHN0YXJ0IDwgZW5kKSB7XG5cdFx0XHRsZXQgY2hhciA9IHRleHRbc3RhcnRdO1xuXHRcdFx0aWYgKGNoYXJzLmluY2x1ZGVzKGNoYXIpKSByZXR1cm4gc3RhcnQ7XG5cdFx0XHQvLyBpZiB3ZSBnb3QgYW4gZXNjYXBlIGNoYXIsIGlnbm9yZSB0aGUgbmV4dCBjaGFyIGlmIGl0J3MgaW4gYGNoYXJzYFxuXHRcdFx0aWYgKGNoYXIgPT09IFwiXFxcXFwiICYmIGNoYXJzLmluY2x1ZGVzKHRleHRbc3RhcnQrMV0pKSBzdGFydCsrO1xuXHRcdFx0c3RhcnQrKztcblx0XHR9XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gc3RhcnQ7XG5cdH1cblxufTtcblxuZXhwb3J0IGRlZmF1bHQgVG9rZW5pemVyO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1Rva2VuaXplci5qcyIsIi8qXG5cdE1JVCBMaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG5cdEF1dGhvciBUb2JpYXMgS29wcGVycyBAc29rcmFcbiovXG4vLyBjc3MgYmFzZSBjb2RlLCBpbmplY3RlZCBieSB0aGUgY3NzLWxvYWRlclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih1c2VTb3VyY2VNYXApIHtcblx0dmFyIGxpc3QgPSBbXTtcblxuXHQvLyByZXR1cm4gdGhlIGxpc3Qgb2YgbW9kdWxlcyBhcyBjc3Mgc3RyaW5nXG5cdGxpc3QudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcblx0XHRcdHZhciBjb250ZW50ID0gY3NzV2l0aE1hcHBpbmdUb1N0cmluZyhpdGVtLCB1c2VTb3VyY2VNYXApO1xuXHRcdFx0aWYoaXRlbVsyXSkge1xuXHRcdFx0XHRyZXR1cm4gXCJAbWVkaWEgXCIgKyBpdGVtWzJdICsgXCJ7XCIgKyBjb250ZW50ICsgXCJ9XCI7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gY29udGVudDtcblx0XHRcdH1cblx0XHR9KS5qb2luKFwiXCIpO1xuXHR9O1xuXG5cdC8vIGltcG9ydCBhIGxpc3Qgb2YgbW9kdWxlcyBpbnRvIHRoZSBsaXN0XG5cdGxpc3QuaSA9IGZ1bmN0aW9uKG1vZHVsZXMsIG1lZGlhUXVlcnkpIHtcblx0XHRpZih0eXBlb2YgbW9kdWxlcyA9PT0gXCJzdHJpbmdcIilcblx0XHRcdG1vZHVsZXMgPSBbW251bGwsIG1vZHVsZXMsIFwiXCJdXTtcblx0XHR2YXIgYWxyZWFkeUltcG9ydGVkTW9kdWxlcyA9IHt9O1xuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgaWQgPSB0aGlzW2ldWzBdO1xuXHRcdFx0aWYodHlwZW9mIGlkID09PSBcIm51bWJlclwiKVxuXHRcdFx0XHRhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2lkXSA9IHRydWU7XG5cdFx0fVxuXHRcdGZvcihpID0gMDsgaSA8IG1vZHVsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpdGVtID0gbW9kdWxlc1tpXTtcblx0XHRcdC8vIHNraXAgYWxyZWFkeSBpbXBvcnRlZCBtb2R1bGVcblx0XHRcdC8vIHRoaXMgaW1wbGVtZW50YXRpb24gaXMgbm90IDEwMCUgcGVyZmVjdCBmb3Igd2VpcmQgbWVkaWEgcXVlcnkgY29tYmluYXRpb25zXG5cdFx0XHQvLyAgd2hlbiBhIG1vZHVsZSBpcyBpbXBvcnRlZCBtdWx0aXBsZSB0aW1lcyB3aXRoIGRpZmZlcmVudCBtZWRpYSBxdWVyaWVzLlxuXHRcdFx0Ly8gIEkgaG9wZSB0aGlzIHdpbGwgbmV2ZXIgb2NjdXIgKEhleSB0aGlzIHdheSB3ZSBoYXZlIHNtYWxsZXIgYnVuZGxlcylcblx0XHRcdGlmKHR5cGVvZiBpdGVtWzBdICE9PSBcIm51bWJlclwiIHx8ICFhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2l0ZW1bMF1dKSB7XG5cdFx0XHRcdGlmKG1lZGlhUXVlcnkgJiYgIWl0ZW1bMl0pIHtcblx0XHRcdFx0XHRpdGVtWzJdID0gbWVkaWFRdWVyeTtcblx0XHRcdFx0fSBlbHNlIGlmKG1lZGlhUXVlcnkpIHtcblx0XHRcdFx0XHRpdGVtWzJdID0gXCIoXCIgKyBpdGVtWzJdICsgXCIpIGFuZCAoXCIgKyBtZWRpYVF1ZXJ5ICsgXCIpXCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0bGlzdC5wdXNoKGl0ZW0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblx0cmV0dXJuIGxpc3Q7XG59O1xuXG5mdW5jdGlvbiBjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKGl0ZW0sIHVzZVNvdXJjZU1hcCkge1xuXHR2YXIgY29udGVudCA9IGl0ZW1bMV0gfHwgJyc7XG5cdHZhciBjc3NNYXBwaW5nID0gaXRlbVszXTtcblx0aWYgKCFjc3NNYXBwaW5nKSB7XG5cdFx0cmV0dXJuIGNvbnRlbnQ7XG5cdH1cblxuXHRpZiAodXNlU291cmNlTWFwICYmIHR5cGVvZiBidG9hID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0dmFyIHNvdXJjZU1hcHBpbmcgPSB0b0NvbW1lbnQoY3NzTWFwcGluZyk7XG5cdFx0dmFyIHNvdXJjZVVSTHMgPSBjc3NNYXBwaW5nLnNvdXJjZXMubWFwKGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0XHRcdHJldHVybiAnLyojIHNvdXJjZVVSTD0nICsgY3NzTWFwcGluZy5zb3VyY2VSb290ICsgc291cmNlICsgJyAqLydcblx0XHR9KTtcblxuXHRcdHJldHVybiBbY29udGVudF0uY29uY2F0KHNvdXJjZVVSTHMpLmNvbmNhdChbc291cmNlTWFwcGluZ10pLmpvaW4oJ1xcbicpO1xuXHR9XG5cblx0cmV0dXJuIFtjb250ZW50XS5qb2luKCdcXG4nKTtcbn1cblxuLy8gQWRhcHRlZCBmcm9tIGNvbnZlcnQtc291cmNlLW1hcCAoTUlUKVxuZnVuY3Rpb24gdG9Db21tZW50KHNvdXJjZU1hcCkge1xuXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcblx0dmFyIGJhc2U2NCA9IGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHNvdXJjZU1hcCkpKSk7XG5cdHZhciBkYXRhID0gJ3NvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LCcgKyBiYXNlNjQ7XG5cblx0cmV0dXJuICcvKiMgJyArIGRhdGEgKyAnICovJztcbn1cblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9jc3MtbG9hZGVyL2xpYi9jc3MtYmFzZS5qc1xuLy8gbW9kdWxlIGlkID0gMjQ3XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gIHZhciBSRUFDVF9FTEVNRU5UX1RZUEUgPSAodHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIFN5bWJvbC5mb3IgJiZcbiAgICBTeW1ib2wuZm9yKCdyZWFjdC5lbGVtZW50JykpIHx8XG4gICAgMHhlYWM3O1xuXG4gIHZhciBpc1ZhbGlkRWxlbWVudCA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHJldHVybiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgb2JqZWN0ICE9PSBudWxsICYmXG4gICAgICBvYmplY3QuJCR0eXBlb2YgPT09IFJFQUNUX0VMRU1FTlRfVFlQRTtcbiAgfTtcblxuICAvLyBCeSBleHBsaWNpdGx5IHVzaW5nIGBwcm9wLXR5cGVzYCB5b3UgYXJlIG9wdGluZyBpbnRvIG5ldyBkZXZlbG9wbWVudCBiZWhhdmlvci5cbiAgLy8gaHR0cDovL2ZiLm1lL3Byb3AtdHlwZXMtaW4tcHJvZFxuICB2YXIgdGhyb3dPbkRpcmVjdEFjY2VzcyA9IHRydWU7XG4gIG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9mYWN0b3J5V2l0aFR5cGVDaGVja2VycycpKGlzVmFsaWRFbGVtZW50LCB0aHJvd09uRGlyZWN0QWNjZXNzKTtcbn0gZWxzZSB7XG4gIC8vIEJ5IGV4cGxpY2l0bHkgdXNpbmcgYHByb3AtdHlwZXNgIHlvdSBhcmUgb3B0aW5nIGludG8gbmV3IHByb2R1Y3Rpb24gYmVoYXZpb3IuXG4gIC8vIGh0dHA6Ly9mYi5tZS9wcm9wLXR5cGVzLWluLXByb2RcbiAgbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2ZhY3RvcnlXaXRoVGhyb3dpbmdTaGltcycpKCk7XG59XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gMjQ4XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0UHJvcFR5cGVzU2VjcmV0ID0gJ1NFQ1JFVF9ET19OT1RfUEFTU19USElTX09SX1lPVV9XSUxMX0JFX0ZJUkVEJztcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdFByb3BUeXBlc1NlY3JldDtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL2xpYi9SZWFjdFByb3BUeXBlc1NlY3JldC5qc1xuLy8gbW9kdWxlIGlkID0gMjQ5XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTQtMjAxNSwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlbXB0eUZ1bmN0aW9uID0gcmVxdWlyZSgnLi9lbXB0eUZ1bmN0aW9uJyk7XG5cbi8qKlxuICogU2ltaWxhciB0byBpbnZhcmlhbnQgYnV0IG9ubHkgbG9ncyBhIHdhcm5pbmcgaWYgdGhlIGNvbmRpdGlvbiBpcyBub3QgbWV0LlxuICogVGhpcyBjYW4gYmUgdXNlZCB0byBsb2cgaXNzdWVzIGluIGRldmVsb3BtZW50IGVudmlyb25tZW50cyBpbiBjcml0aWNhbFxuICogcGF0aHMuIFJlbW92aW5nIHRoZSBsb2dnaW5nIGNvZGUgZm9yIHByb2R1Y3Rpb24gZW52aXJvbm1lbnRzIHdpbGwga2VlcCB0aGVcbiAqIHNhbWUgbG9naWMgYW5kIGZvbGxvdyB0aGUgc2FtZSBjb2RlIHBhdGhzLlxuICovXG5cbnZhciB3YXJuaW5nID0gZW1wdHlGdW5jdGlvbjtcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcHJpbnRXYXJuaW5nID0gZnVuY3Rpb24gcHJpbnRXYXJuaW5nKGZvcm1hdCkge1xuICAgICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuID4gMSA/IF9sZW4gLSAxIDogMCksIF9rZXkgPSAxOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICAgIGFyZ3NbX2tleSAtIDFdID0gYXJndW1lbnRzW19rZXldO1xuICAgICAgfVxuXG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgdmFyIG1lc3NhZ2UgPSAnV2FybmluZzogJyArIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmdzW2FyZ0luZGV4KytdO1xuICAgICAgfSk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICAvLyAtLS0gV2VsY29tZSB0byBkZWJ1Z2dpbmcgUmVhY3QgLS0tXG4gICAgICAgIC8vIFRoaXMgZXJyb3Igd2FzIHRocm93biBhcyBhIGNvbnZlbmllbmNlIHNvIHRoYXQgeW91IGNhbiB1c2UgdGhpcyBzdGFja1xuICAgICAgICAvLyB0byBmaW5kIHRoZSBjYWxsc2l0ZSB0aGF0IGNhdXNlZCB0aGlzIHdhcm5pbmcgdG8gZmlyZS5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgfSBjYXRjaCAoeCkge31cbiAgICB9O1xuXG4gICAgd2FybmluZyA9IGZ1bmN0aW9uIHdhcm5pbmcoY29uZGl0aW9uLCBmb3JtYXQpIHtcbiAgICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2B3YXJuaW5nKGNvbmRpdGlvbiwgZm9ybWF0LCAuLi5hcmdzKWAgcmVxdWlyZXMgYSB3YXJuaW5nICcgKyAnbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZm9ybWF0LmluZGV4T2YoJ0ZhaWxlZCBDb21wb3NpdGUgcHJvcFR5cGU6ICcpID09PSAwKSB7XG4gICAgICAgIHJldHVybjsgLy8gSWdub3JlIENvbXBvc2l0ZUNvbXBvbmVudCBwcm9wdHlwZSBjaGVjay5cbiAgICAgIH1cblxuICAgICAgaWYgKCFjb25kaXRpb24pIHtcbiAgICAgICAgZm9yICh2YXIgX2xlbjIgPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbjIgPiAyID8gX2xlbjIgLSAyIDogMCksIF9rZXkyID0gMjsgX2tleTIgPCBfbGVuMjsgX2tleTIrKykge1xuICAgICAgICAgIGFyZ3NbX2tleTIgLSAyXSA9IGFyZ3VtZW50c1tfa2V5Ml07XG4gICAgICAgIH1cblxuICAgICAgICBwcmludFdhcm5pbmcuYXBwbHkodW5kZWZpbmVkLCBbZm9ybWF0XS5jb25jYXQoYXJncykpO1xuICAgICAgfVxuICAgIH07XG4gIH0pKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gd2FybmluZztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9+L2ZianMvbGliL3dhcm5pbmcuanNcbi8vIG1vZHVsZSBpZCA9IDI1MFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJmdW5jdGlvbiBfdG9Db25zdW1hYmxlQXJyYXkoYXJyKSB7IGlmIChBcnJheS5pc0FycmF5KGFycikpIHsgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBBcnJheShhcnIubGVuZ3RoKTsgaSA8IGFyci5sZW5ndGg7IGkrKykgeyBhcnIyW2ldID0gYXJyW2ldOyB9IHJldHVybiBhcnIyOyB9IGVsc2UgeyByZXR1cm4gQXJyYXkuZnJvbShhcnIpOyB9IH1cblxuLyogZXNsaW50LWRpc2FibGUgbm8tdXNlLWJlZm9yZS1kZWZpbmUgKi9cbi8qKlxuICogQG1vZHVsZSBldmVudEhhbmRsZXJzXG4gKlxuICovXG5pbXBvcnQgZG9tSGVscGVycyBmcm9tICcuL2xpYi9kb21faGVscGVycyc7XG5pbXBvcnQgbGlzdGVuZXJzIGZyb20gJy4vbGliL2xpc3RlbmVycyc7XG5pbXBvcnQgc3RvcmUgZnJvbSAnLi9zdG9yZSc7XG5cbi8qKlxuICogcHJpdmF0ZVxuICpcbiAqL1xuXG4vKipcbiAqIF9vbkNsaWNrXG4gKlxuICogQGFjY2VzcyBwcml2YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gZXZlbnQgVGhlIGNsaWNrIGV2ZW50IG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IGV2ZW50LnRhcmdldCBUaGUgRE9NIG5vZGUgZnJvbSB0aGUgY2xpY2sgZXZlbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIF9vbkNsaWNrKF9yZWYpIHtcbiAgdmFyIHRhcmdldCA9IF9yZWYudGFyZ2V0O1xuXG4gIHN0b3JlLmFjdGl2YXRlKFtdLmNvbmNhdChfdG9Db25zdW1hYmxlQXJyYXkoc3RvcmUuZ2V0SW5zdGFuY2VzKCkpKS5yZWR1Y2UoZG9tSGVscGVycy5maW5kQ29udGFpbmVyTm9kZXModGFyZ2V0KSwgW10pLnNvcnQoZG9tSGVscGVycy5zb3J0QnlET01Qb3NpdGlvbikubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgcmV0dXJuIGl0ZW0uaW5zdGFuY2U7XG4gIH0pKTtcbn1cblxuLyoqXG4gKiBfb25LZXlEb3duOiBUaGUga2V5ZG93biBldmVudCBjYWxsYmFja1xuICpcbiAqIEBhY2Nlc3MgcHJpdmF0ZVxuICogQHBhcmFtIHtvYmplY3R9IGV2ZW50IFRoZSBrZXlkb3duIGV2ZW50IG9iamVjdFxuICogQHBhcmFtIHtudW1iZXJ9IGV2ZW50LndoaWNoIFRoZSBrZXkgY29kZSAod2hpY2gpIHJlY2VpdmVkIGZyb20gdGhlIGtleWRvd24gZXZlbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIF9vbktleURvd24oZXZlbnQpIHtcbiAgdmFyIGZvcmNlQ29uc2lkZXIgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IGZhbHNlO1xuXG4gIGlmIChmb3JjZUNvbnNpZGVyIHx8IF9zaG91bGRDb25zaWRlcihldmVudCkpIHtcbiAgICB2YXIgX3JlZjIgPSBzdG9yZS5maW5kQmluZGluZ0ZvckV2ZW50KGV2ZW50KSB8fCB7fSxcbiAgICAgICAgZm4gPSBfcmVmMi5mbixcbiAgICAgICAgaW5zdGFuY2UgPSBfcmVmMi5pbnN0YW5jZTtcblxuICAgIGlmIChmbikge1xuICAgICAgZm4uY2FsbChpbnN0YW5jZSwgZXZlbnQpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBfc2hvdWxkQ29uc2lkZXI6IENvbmRpdGlvbnMgZm9yIHByb2NlZWRpbmcgd2l0aCBrZXkgZXZlbnQgaGFuZGxpbmdcbiAqXG4gKiBAYWNjZXNzIHByaXZhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBldmVudCBUaGUga2V5ZG93biBldmVudCBvYmplY3RcbiAqIEBwYXJhbSB7b2JqZWN0fSBldmVudC50YXJnZXQgVGhlIG5vZGUgb3JpZ2luIG9mIHRoZSBldmVudFxuICogQHJldHVybiB7Ym9vbGVhbn0gV2hldGhlciB0byBjb250aW51ZSBwcm9jZXNpbmcgdGhlIGtleWRvd24gZXZlbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIF9zaG91bGRDb25zaWRlcihfcmVmMykge1xuICB2YXIgY3RybEtleSA9IF9yZWYzLmN0cmxLZXksXG4gICAgICB0YXJnZXQgPSBfcmVmMy50YXJnZXQ7XG5cbiAgcmV0dXJuIGN0cmxLZXkgfHwgIX5bJ0lOUFVUJywgJ1NFTEVDVCcsICdURVhUQVJFQSddLmluZGV4T2YodGFyZ2V0LnRhZ05hbWUpIHx8IHRhcmdldC5nZXRBdHRyaWJ1dGUoJ3JvbGUnKSAhPT0gJ3RleHRib3gnO1xufVxuXG4vKipcbiAqIHB1YmxpY1xuICpcbiAqL1xuXG4vKipcbiAqIG9uTW91bnRcbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICovXG5mdW5jdGlvbiBvbk1vdW50KGluc3RhbmNlKSB7XG4gIC8vIGhhdmUgdG8gYnVtcCB0aGlzIHRvIG5leHQgZXZlbnQgbG9vcCBiZWNhdXNlIGNvbXBvbmVudCBtb3VudGluZyByb3V0aW5lbHlcbiAgLy8gcHJlY2VlZHMgdGhlIGRvbSBjbGljayBldmVudCB0aGF0IHRyaWdnZXJlZCB0aGUgbW91bnQgKHd0Zj8pXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBzdG9yZS5hY3RpdmF0ZShpbnN0YW5jZSk7XG4gIH0sIDApO1xuICBsaXN0ZW5lcnMuYmluZEtleXMoX29uS2V5RG93bik7XG4gIGxpc3RlbmVycy5iaW5kQ2xpY2tzKF9vbkNsaWNrKTtcbiAgZG9tSGVscGVycy5iaW5kRm9jdXNhYmxlcyhpbnN0YW5jZSwgc3RvcmUuYWN0aXZhdGUpO1xufVxuXG4vKipcbiAqIG9uVW5tb3VudFxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKi9cbmZ1bmN0aW9uIG9uVW5tb3VudChpbnN0YW5jZSkge1xuICBzdG9yZS5kZWxldGVJbnN0YW5jZShpbnN0YW5jZSk7XG4gIGlmIChzdG9yZS5pc0VtcHR5KCkpIHtcbiAgICBsaXN0ZW5lcnMudW5iaW5kQ2xpY2tzKF9vbkNsaWNrKTtcbiAgICBsaXN0ZW5lcnMudW5iaW5kS2V5cyhfb25LZXlEb3duKTtcbiAgfVxufVxuXG5leHBvcnQgeyBvbk1vdW50LCBvblVubW91bnQgfTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9ldmVudF9oYW5kbGVycy5qc1xuLy8gbW9kdWxlIGlkID0gMjc3XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsImltcG9ydCB7IG1vZGlmaWVycyBhcyBtb2RpZmllcktleXMgfSBmcm9tICcuL2tleXMnO1xuXG52YXIgbW9kS2V5cyA9IE9iamVjdC5rZXlzKG1vZGlmaWVyS2V5cyk7XG5cbmZ1bmN0aW9uIG1hdGNoS2V5cyhfcmVmKSB7XG4gIHZhciBfcmVmJGtleVNldCA9IF9yZWYua2V5U2V0LFxuICAgICAga2V5ID0gX3JlZiRrZXlTZXQua2V5LFxuICAgICAgX3JlZiRrZXlTZXQkbW9kaWZpZXJzID0gX3JlZiRrZXlTZXQubW9kaWZpZXJzLFxuICAgICAgbW9kaWZpZXJzID0gX3JlZiRrZXlTZXQkbW9kaWZpZXJzID09PSB1bmRlZmluZWQgPyBbXSA6IF9yZWYka2V5U2V0JG1vZGlmaWVycyxcbiAgICAgIGV2ZW50ID0gX3JlZi5ldmVudDtcblxuICB2YXIga2V5c01hdGNoID0gZmFsc2U7XG4gIGlmIChrZXkgPT09IGV2ZW50LndoaWNoKSB7XG4gICAgdmFyIGV2dE1vZEtleXMgPSBtb2RLZXlzLmZpbHRlcihmdW5jdGlvbiAobW9kS2V5KSB7XG4gICAgICByZXR1cm4gZXZlbnRbbW9kS2V5ICsgJ0tleSddO1xuICAgIH0pLnNvcnQoKTtcbiAgICBrZXlzTWF0Y2ggPSBtb2RpZmllcnMubGVuZ3RoID09PSBldnRNb2RLZXlzLmxlbmd0aCAmJiBtb2RpZmllcnMuZXZlcnkoZnVuY3Rpb24gKG1vZEtleSwgaW5kZXgpIHtcbiAgICAgIHJldHVybiBldnRNb2RLZXlzW2luZGV4XSA9PT0gbW9kS2V5O1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBrZXlzTWF0Y2g7XG59XG5cbmV4cG9ydCBkZWZhdWx0IG1hdGNoS2V5cztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvbWF0Y2hfa2V5cy5qc1xuLy8gbW9kdWxlIGlkID0gMjc4XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsImltcG9ydCBLZXlzLCB7IG1vZGlmaWVycyB9IGZyb20gJy4va2V5cyc7XG5cbmZ1bmN0aW9uIHBhcnNlS2V5cyhrZXlzQXJyYXkpIHtcbiAgcmV0dXJuIGtleXNBcnJheS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgIHZhciBrZXlTZXQgPSB7IGtleToga2V5IH07XG4gICAgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICB2YXIga2V5U3RyaW5nID0ga2V5LnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuICAgICAgdmFyIG1hdGNoZXMgPSBrZXlTdHJpbmcuc3BsaXQoL1xccz9cXCtcXHM/Lyk7XG4gICAgICBrZXlTZXQgPSBtYXRjaGVzLmxlbmd0aCA9PT0gMSA/IHsga2V5OiBLZXlzW2tleVN0cmluZ10gfSA6IHtcbiAgICAgICAga2V5OiBLZXlzW21hdGNoZXMucG9wKCldLFxuICAgICAgICBtb2RpZmllcnM6IG1hdGNoZXMubWFwKGZ1bmN0aW9uIChtb2RLZXkpIHtcbiAgICAgICAgICByZXR1cm4gbW9kaWZpZXJzW21vZEtleV07XG4gICAgICAgIH0pLnNvcnQoKVxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGtleVNldDtcbiAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlS2V5cztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvcGFyc2Vfa2V5cy5qc1xuLy8gbW9kdWxlIGlkID0gMjc5XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qXG5cdE1JVCBMaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG5cdEF1dGhvciBUb2JpYXMgS29wcGVycyBAc29rcmFcbiovXG52YXIgc3R5bGVzSW5Eb20gPSB7fSxcblx0bWVtb2l6ZSA9IGZ1bmN0aW9uKGZuKSB7XG5cdFx0dmFyIG1lbW87XG5cdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICh0eXBlb2YgbWVtbyA9PT0gXCJ1bmRlZmluZWRcIikgbWVtbyA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHRyZXR1cm4gbWVtbztcblx0XHR9O1xuXHR9LFxuXHRpc09sZElFID0gbWVtb2l6ZShmdW5jdGlvbigpIHtcblx0XHQvLyBUZXN0IGZvciBJRSA8PSA5IGFzIHByb3Bvc2VkIGJ5IEJyb3dzZXJoYWNrc1xuXHRcdC8vIEBzZWUgaHR0cDovL2Jyb3dzZXJoYWNrcy5jb20vI2hhY2stZTcxZDg2OTJmNjUzMzQxNzNmZWU3MTVjMjIyY2I4MDVcblx0XHQvLyBUZXN0cyBmb3IgZXhpc3RlbmNlIG9mIHN0YW5kYXJkIGdsb2JhbHMgaXMgdG8gYWxsb3cgc3R5bGUtbG9hZGVyIFxuXHRcdC8vIHRvIG9wZXJhdGUgY29ycmVjdGx5IGludG8gbm9uLXN0YW5kYXJkIGVudmlyb25tZW50c1xuXHRcdC8vIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2stY29udHJpYi9zdHlsZS1sb2FkZXIvaXNzdWVzLzE3N1xuXHRcdHJldHVybiB3aW5kb3cgJiYgZG9jdW1lbnQgJiYgZG9jdW1lbnQuYWxsICYmICF3aW5kb3cuYXRvYjtcblx0fSksXG5cdGdldEVsZW1lbnQgPSAoZnVuY3Rpb24oZm4pIHtcblx0XHR2YXIgbWVtbyA9IHt9O1xuXHRcdHJldHVybiBmdW5jdGlvbihzZWxlY3Rvcikge1xuXHRcdFx0aWYgKHR5cGVvZiBtZW1vW3NlbGVjdG9yXSA9PT0gXCJ1bmRlZmluZWRcIikge1xuXHRcdFx0XHRtZW1vW3NlbGVjdG9yXSA9IGZuLmNhbGwodGhpcywgc2VsZWN0b3IpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1lbW9bc2VsZWN0b3JdXG5cdFx0fTtcblx0fSkoZnVuY3Rpb24gKHN0eWxlVGFyZ2V0KSB7XG5cdFx0cmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc3R5bGVUYXJnZXQpXG5cdH0pLFxuXHRzaW5nbGV0b25FbGVtZW50ID0gbnVsbCxcblx0c2luZ2xldG9uQ291bnRlciA9IDAsXG5cdHN0eWxlRWxlbWVudHNJbnNlcnRlZEF0VG9wID0gW10sXG5cdGZpeFVybHMgPSByZXF1aXJlKFwiLi9maXhVcmxzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGxpc3QsIG9wdGlvbnMpIHtcblx0aWYodHlwZW9mIERFQlVHICE9PSBcInVuZGVmaW5lZFwiICYmIERFQlVHKSB7XG5cdFx0aWYodHlwZW9mIGRvY3VtZW50ICE9PSBcIm9iamVjdFwiKSB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgc3R5bGUtbG9hZGVyIGNhbm5vdCBiZSB1c2VkIGluIGEgbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRcIik7XG5cdH1cblxuXHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0b3B0aW9ucy5hdHRycyA9IHR5cGVvZiBvcHRpb25zLmF0dHJzID09PSBcIm9iamVjdFwiID8gb3B0aW9ucy5hdHRycyA6IHt9O1xuXG5cdC8vIEZvcmNlIHNpbmdsZS10YWcgc29sdXRpb24gb24gSUU2LTksIHdoaWNoIGhhcyBhIGhhcmQgbGltaXQgb24gdGhlICMgb2YgPHN0eWxlPlxuXHQvLyB0YWdzIGl0IHdpbGwgYWxsb3cgb24gYSBwYWdlXG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5zaW5nbGV0b24gPT09IFwidW5kZWZpbmVkXCIpIG9wdGlvbnMuc2luZ2xldG9uID0gaXNPbGRJRSgpO1xuXG5cdC8vIEJ5IGRlZmF1bHQsIGFkZCA8c3R5bGU+IHRhZ3MgdG8gdGhlIDxoZWFkPiBlbGVtZW50XG5cdGlmICh0eXBlb2Ygb3B0aW9ucy5pbnNlcnRJbnRvID09PSBcInVuZGVmaW5lZFwiKSBvcHRpb25zLmluc2VydEludG8gPSBcImhlYWRcIjtcblxuXHQvLyBCeSBkZWZhdWx0LCBhZGQgPHN0eWxlPiB0YWdzIHRvIHRoZSBib3R0b20gb2YgdGhlIHRhcmdldFxuXHRpZiAodHlwZW9mIG9wdGlvbnMuaW5zZXJ0QXQgPT09IFwidW5kZWZpbmVkXCIpIG9wdGlvbnMuaW5zZXJ0QXQgPSBcImJvdHRvbVwiO1xuXG5cdHZhciBzdHlsZXMgPSBsaXN0VG9TdHlsZXMobGlzdCwgb3B0aW9ucyk7XG5cdGFkZFN0eWxlc1RvRG9tKHN0eWxlcywgb3B0aW9ucyk7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIHVwZGF0ZShuZXdMaXN0KSB7XG5cdFx0dmFyIG1heVJlbW92ZSA9IFtdO1xuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCBzdHlsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpdGVtID0gc3R5bGVzW2ldO1xuXHRcdFx0dmFyIGRvbVN0eWxlID0gc3R5bGVzSW5Eb21baXRlbS5pZF07XG5cdFx0XHRkb21TdHlsZS5yZWZzLS07XG5cdFx0XHRtYXlSZW1vdmUucHVzaChkb21TdHlsZSk7XG5cdFx0fVxuXHRcdGlmKG5ld0xpc3QpIHtcblx0XHRcdHZhciBuZXdTdHlsZXMgPSBsaXN0VG9TdHlsZXMobmV3TGlzdCwgb3B0aW9ucyk7XG5cdFx0XHRhZGRTdHlsZXNUb0RvbShuZXdTdHlsZXMsIG9wdGlvbnMpO1xuXHRcdH1cblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgbWF5UmVtb3ZlLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgZG9tU3R5bGUgPSBtYXlSZW1vdmVbaV07XG5cdFx0XHRpZihkb21TdHlsZS5yZWZzID09PSAwKSB7XG5cdFx0XHRcdGZvcih2YXIgaiA9IDA7IGogPCBkb21TdHlsZS5wYXJ0cy5sZW5ndGg7IGorKylcblx0XHRcdFx0XHRkb21TdHlsZS5wYXJ0c1tqXSgpO1xuXHRcdFx0XHRkZWxldGUgc3R5bGVzSW5Eb21bZG9tU3R5bGUuaWRdO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcbn07XG5cbmZ1bmN0aW9uIGFkZFN0eWxlc1RvRG9tKHN0eWxlcywgb3B0aW9ucykge1xuXHRmb3IodmFyIGkgPSAwOyBpIDwgc3R5bGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGl0ZW0gPSBzdHlsZXNbaV07XG5cdFx0dmFyIGRvbVN0eWxlID0gc3R5bGVzSW5Eb21baXRlbS5pZF07XG5cdFx0aWYoZG9tU3R5bGUpIHtcblx0XHRcdGRvbVN0eWxlLnJlZnMrKztcblx0XHRcdGZvcih2YXIgaiA9IDA7IGogPCBkb21TdHlsZS5wYXJ0cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRkb21TdHlsZS5wYXJ0c1tqXShpdGVtLnBhcnRzW2pdKTtcblx0XHRcdH1cblx0XHRcdGZvcig7IGogPCBpdGVtLnBhcnRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdGRvbVN0eWxlLnBhcnRzLnB1c2goYWRkU3R5bGUoaXRlbS5wYXJ0c1tqXSwgb3B0aW9ucykpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YXIgcGFydHMgPSBbXTtcblx0XHRcdGZvcih2YXIgaiA9IDA7IGogPCBpdGVtLnBhcnRzLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdHBhcnRzLnB1c2goYWRkU3R5bGUoaXRlbS5wYXJ0c1tqXSwgb3B0aW9ucykpO1xuXHRcdFx0fVxuXHRcdFx0c3R5bGVzSW5Eb21baXRlbS5pZF0gPSB7aWQ6IGl0ZW0uaWQsIHJlZnM6IDEsIHBhcnRzOiBwYXJ0c307XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGxpc3RUb1N0eWxlcyhsaXN0LCBvcHRpb25zKSB7XG5cdHZhciBzdHlsZXMgPSBbXTtcblx0dmFyIG5ld1N0eWxlcyA9IHt9O1xuXHRmb3IodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBpdGVtID0gbGlzdFtpXTtcblx0XHR2YXIgaWQgPSBvcHRpb25zLmJhc2UgPyBpdGVtWzBdICsgb3B0aW9ucy5iYXNlIDogaXRlbVswXTtcblx0XHR2YXIgY3NzID0gaXRlbVsxXTtcblx0XHR2YXIgbWVkaWEgPSBpdGVtWzJdO1xuXHRcdHZhciBzb3VyY2VNYXAgPSBpdGVtWzNdO1xuXHRcdHZhciBwYXJ0ID0ge2NzczogY3NzLCBtZWRpYTogbWVkaWEsIHNvdXJjZU1hcDogc291cmNlTWFwfTtcblx0XHRpZighbmV3U3R5bGVzW2lkXSlcblx0XHRcdHN0eWxlcy5wdXNoKG5ld1N0eWxlc1tpZF0gPSB7aWQ6IGlkLCBwYXJ0czogW3BhcnRdfSk7XG5cdFx0ZWxzZVxuXHRcdFx0bmV3U3R5bGVzW2lkXS5wYXJ0cy5wdXNoKHBhcnQpO1xuXHR9XG5cdHJldHVybiBzdHlsZXM7XG59XG5cbmZ1bmN0aW9uIGluc2VydFN0eWxlRWxlbWVudChvcHRpb25zLCBzdHlsZUVsZW1lbnQpIHtcblx0dmFyIHN0eWxlVGFyZ2V0ID0gZ2V0RWxlbWVudChvcHRpb25zLmluc2VydEludG8pXG5cdGlmICghc3R5bGVUYXJnZXQpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZG4ndCBmaW5kIGEgc3R5bGUgdGFyZ2V0LiBUaGlzIHByb2JhYmx5IG1lYW5zIHRoYXQgdGhlIHZhbHVlIGZvciB0aGUgJ2luc2VydEludG8nIHBhcmFtZXRlciBpcyBpbnZhbGlkLlwiKTtcblx0fVxuXHR2YXIgbGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3AgPSBzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcFtzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcC5sZW5ndGggLSAxXTtcblx0aWYgKG9wdGlvbnMuaW5zZXJ0QXQgPT09IFwidG9wXCIpIHtcblx0XHRpZighbGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3ApIHtcblx0XHRcdHN0eWxlVGFyZ2V0Lmluc2VydEJlZm9yZShzdHlsZUVsZW1lbnQsIHN0eWxlVGFyZ2V0LmZpcnN0Q2hpbGQpO1xuXHRcdH0gZWxzZSBpZihsYXN0U3R5bGVFbGVtZW50SW5zZXJ0ZWRBdFRvcC5uZXh0U2libGluZykge1xuXHRcdFx0c3R5bGVUYXJnZXQuaW5zZXJ0QmVmb3JlKHN0eWxlRWxlbWVudCwgbGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3AubmV4dFNpYmxpbmcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzdHlsZVRhcmdldC5hcHBlbmRDaGlsZChzdHlsZUVsZW1lbnQpO1xuXHRcdH1cblx0XHRzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcC5wdXNoKHN0eWxlRWxlbWVudCk7XG5cdH0gZWxzZSBpZiAob3B0aW9ucy5pbnNlcnRBdCA9PT0gXCJib3R0b21cIikge1xuXHRcdHN0eWxlVGFyZ2V0LmFwcGVuZENoaWxkKHN0eWxlRWxlbWVudCk7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB2YWx1ZSBmb3IgcGFyYW1ldGVyICdpbnNlcnRBdCcuIE11c3QgYmUgJ3RvcCcgb3IgJ2JvdHRvbScuXCIpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpIHtcblx0c3R5bGVFbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3R5bGVFbGVtZW50KTtcblx0dmFyIGlkeCA9IHN0eWxlRWxlbWVudHNJbnNlcnRlZEF0VG9wLmluZGV4T2Yoc3R5bGVFbGVtZW50KTtcblx0aWYoaWR4ID49IDApIHtcblx0XHRzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcC5zcGxpY2UoaWR4LCAxKTtcblx0fVxufVxuXG5mdW5jdGlvbiBjcmVhdGVTdHlsZUVsZW1lbnQob3B0aW9ucykge1xuXHR2YXIgc3R5bGVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xuXHRvcHRpb25zLmF0dHJzLnR5cGUgPSBcInRleHQvY3NzXCI7XG5cblx0YXR0YWNoVGFnQXR0cnMoc3R5bGVFbGVtZW50LCBvcHRpb25zLmF0dHJzKTtcblx0aW5zZXJ0U3R5bGVFbGVtZW50KG9wdGlvbnMsIHN0eWxlRWxlbWVudCk7XG5cdHJldHVybiBzdHlsZUVsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUxpbmtFbGVtZW50KG9wdGlvbnMpIHtcblx0dmFyIGxpbmtFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpbmtcIik7XG5cdG9wdGlvbnMuYXR0cnMudHlwZSA9IFwidGV4dC9jc3NcIjtcblx0b3B0aW9ucy5hdHRycy5yZWwgPSBcInN0eWxlc2hlZXRcIjtcblxuXHRhdHRhY2hUYWdBdHRycyhsaW5rRWxlbWVudCwgb3B0aW9ucy5hdHRycyk7XG5cdGluc2VydFN0eWxlRWxlbWVudChvcHRpb25zLCBsaW5rRWxlbWVudCk7XG5cdHJldHVybiBsaW5rRWxlbWVudDtcbn1cblxuZnVuY3Rpb24gYXR0YWNoVGFnQXR0cnMoZWxlbWVudCwgYXR0cnMpIHtcblx0T2JqZWN0LmtleXMoYXR0cnMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuXHRcdGVsZW1lbnQuc2V0QXR0cmlidXRlKGtleSwgYXR0cnNba2V5XSk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBhZGRTdHlsZShvYmosIG9wdGlvbnMpIHtcblx0dmFyIHN0eWxlRWxlbWVudCwgdXBkYXRlLCByZW1vdmUsIHRyYW5zZm9ybVJlc3VsdDtcblxuXHQvLyBJZiBhIHRyYW5zZm9ybSBmdW5jdGlvbiB3YXMgZGVmaW5lZCwgcnVuIGl0IG9uIHRoZSBjc3Ncblx0aWYgKG9wdGlvbnMudHJhbnNmb3JtICYmIG9iai5jc3MpIHtcblx0ICAgIHRyYW5zZm9ybVJlc3VsdCA9IG9wdGlvbnMudHJhbnNmb3JtKG9iai5jc3MpO1xuXHQgICAgXG5cdCAgICBpZiAodHJhbnNmb3JtUmVzdWx0KSB7XG5cdCAgICBcdC8vIElmIHRyYW5zZm9ybSByZXR1cm5zIGEgdmFsdWUsIHVzZSB0aGF0IGluc3RlYWQgb2YgdGhlIG9yaWdpbmFsIGNzcy5cblx0ICAgIFx0Ly8gVGhpcyBhbGxvd3MgcnVubmluZyBydW50aW1lIHRyYW5zZm9ybWF0aW9ucyBvbiB0aGUgY3NzLlxuXHQgICAgXHRvYmouY3NzID0gdHJhbnNmb3JtUmVzdWx0O1xuXHQgICAgfSBlbHNlIHtcblx0ICAgIFx0Ly8gSWYgdGhlIHRyYW5zZm9ybSBmdW5jdGlvbiByZXR1cm5zIGEgZmFsc3kgdmFsdWUsIGRvbid0IGFkZCB0aGlzIGNzcy4gXG5cdCAgICBcdC8vIFRoaXMgYWxsb3dzIGNvbmRpdGlvbmFsIGxvYWRpbmcgb2YgY3NzXG5cdCAgICBcdHJldHVybiBmdW5jdGlvbigpIHtcblx0ICAgIFx0XHQvLyBub29wXG5cdCAgICBcdH07XG5cdCAgICB9XG5cdH1cblxuXHRpZiAob3B0aW9ucy5zaW5nbGV0b24pIHtcblx0XHR2YXIgc3R5bGVJbmRleCA9IHNpbmdsZXRvbkNvdW50ZXIrKztcblx0XHRzdHlsZUVsZW1lbnQgPSBzaW5nbGV0b25FbGVtZW50IHx8IChzaW5nbGV0b25FbGVtZW50ID0gY3JlYXRlU3R5bGVFbGVtZW50KG9wdGlvbnMpKTtcblx0XHR1cGRhdGUgPSBhcHBseVRvU2luZ2xldG9uVGFnLmJpbmQobnVsbCwgc3R5bGVFbGVtZW50LCBzdHlsZUluZGV4LCBmYWxzZSk7XG5cdFx0cmVtb3ZlID0gYXBwbHlUb1NpbmdsZXRvblRhZy5iaW5kKG51bGwsIHN0eWxlRWxlbWVudCwgc3R5bGVJbmRleCwgdHJ1ZSk7XG5cdH0gZWxzZSBpZihvYmouc291cmNlTWFwICYmXG5cdFx0dHlwZW9mIFVSTCA9PT0gXCJmdW5jdGlvblwiICYmXG5cdFx0dHlwZW9mIFVSTC5jcmVhdGVPYmplY3RVUkwgPT09IFwiZnVuY3Rpb25cIiAmJlxuXHRcdHR5cGVvZiBVUkwucmV2b2tlT2JqZWN0VVJMID09PSBcImZ1bmN0aW9uXCIgJiZcblx0XHR0eXBlb2YgQmxvYiA9PT0gXCJmdW5jdGlvblwiICYmXG5cdFx0dHlwZW9mIGJ0b2EgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdHN0eWxlRWxlbWVudCA9IGNyZWF0ZUxpbmtFbGVtZW50KG9wdGlvbnMpO1xuXHRcdHVwZGF0ZSA9IHVwZGF0ZUxpbmsuYmluZChudWxsLCBzdHlsZUVsZW1lbnQsIG9wdGlvbnMpO1xuXHRcdHJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCk7XG5cdFx0XHRpZihzdHlsZUVsZW1lbnQuaHJlZilcblx0XHRcdFx0VVJMLnJldm9rZU9iamVjdFVSTChzdHlsZUVsZW1lbnQuaHJlZik7XG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHRzdHlsZUVsZW1lbnQgPSBjcmVhdGVTdHlsZUVsZW1lbnQob3B0aW9ucyk7XG5cdFx0dXBkYXRlID0gYXBwbHlUb1RhZy5iaW5kKG51bGwsIHN0eWxlRWxlbWVudCk7XG5cdFx0cmVtb3ZlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGVFbGVtZW50KTtcblx0XHR9O1xuXHR9XG5cblx0dXBkYXRlKG9iaik7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIHVwZGF0ZVN0eWxlKG5ld09iaikge1xuXHRcdGlmKG5ld09iaikge1xuXHRcdFx0aWYobmV3T2JqLmNzcyA9PT0gb2JqLmNzcyAmJiBuZXdPYmoubWVkaWEgPT09IG9iai5tZWRpYSAmJiBuZXdPYmouc291cmNlTWFwID09PSBvYmouc291cmNlTWFwKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR1cGRhdGUob2JqID0gbmV3T2JqKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVtb3ZlKCk7XG5cdFx0fVxuXHR9O1xufVxuXG52YXIgcmVwbGFjZVRleHQgPSAoZnVuY3Rpb24gKCkge1xuXHR2YXIgdGV4dFN0b3JlID0gW107XG5cblx0cmV0dXJuIGZ1bmN0aW9uIChpbmRleCwgcmVwbGFjZW1lbnQpIHtcblx0XHR0ZXh0U3RvcmVbaW5kZXhdID0gcmVwbGFjZW1lbnQ7XG5cdFx0cmV0dXJuIHRleHRTdG9yZS5maWx0ZXIoQm9vbGVhbikuam9pbignXFxuJyk7XG5cdH07XG59KSgpO1xuXG5mdW5jdGlvbiBhcHBseVRvU2luZ2xldG9uVGFnKHN0eWxlRWxlbWVudCwgaW5kZXgsIHJlbW92ZSwgb2JqKSB7XG5cdHZhciBjc3MgPSByZW1vdmUgPyBcIlwiIDogb2JqLmNzcztcblxuXHRpZiAoc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQpIHtcblx0XHRzdHlsZUVsZW1lbnQuc3R5bGVTaGVldC5jc3NUZXh0ID0gcmVwbGFjZVRleHQoaW5kZXgsIGNzcyk7XG5cdH0gZWxzZSB7XG5cdFx0dmFyIGNzc05vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpO1xuXHRcdHZhciBjaGlsZE5vZGVzID0gc3R5bGVFbGVtZW50LmNoaWxkTm9kZXM7XG5cdFx0aWYgKGNoaWxkTm9kZXNbaW5kZXhdKSBzdHlsZUVsZW1lbnQucmVtb3ZlQ2hpbGQoY2hpbGROb2Rlc1tpbmRleF0pO1xuXHRcdGlmIChjaGlsZE5vZGVzLmxlbmd0aCkge1xuXHRcdFx0c3R5bGVFbGVtZW50Lmluc2VydEJlZm9yZShjc3NOb2RlLCBjaGlsZE5vZGVzW2luZGV4XSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHN0eWxlRWxlbWVudC5hcHBlbmRDaGlsZChjc3NOb2RlKTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gYXBwbHlUb1RhZyhzdHlsZUVsZW1lbnQsIG9iaikge1xuXHR2YXIgY3NzID0gb2JqLmNzcztcblx0dmFyIG1lZGlhID0gb2JqLm1lZGlhO1xuXG5cdGlmKG1lZGlhKSB7XG5cdFx0c3R5bGVFbGVtZW50LnNldEF0dHJpYnV0ZShcIm1lZGlhXCIsIG1lZGlhKVxuXHR9XG5cblx0aWYoc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQpIHtcblx0XHRzdHlsZUVsZW1lbnQuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuXHR9IGVsc2Uge1xuXHRcdHdoaWxlKHN0eWxlRWxlbWVudC5maXJzdENoaWxkKSB7XG5cdFx0XHRzdHlsZUVsZW1lbnQucmVtb3ZlQ2hpbGQoc3R5bGVFbGVtZW50LmZpcnN0Q2hpbGQpO1xuXHRcdH1cblx0XHRzdHlsZUVsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlTGluayhsaW5rRWxlbWVudCwgb3B0aW9ucywgb2JqKSB7XG5cdHZhciBjc3MgPSBvYmouY3NzO1xuXHR2YXIgc291cmNlTWFwID0gb2JqLnNvdXJjZU1hcDtcblxuXHQvKiBJZiBjb252ZXJ0VG9BYnNvbHV0ZVVybHMgaXNuJ3QgZGVmaW5lZCwgYnV0IHNvdXJjZW1hcHMgYXJlIGVuYWJsZWRcblx0YW5kIHRoZXJlIGlzIG5vIHB1YmxpY1BhdGggZGVmaW5lZCB0aGVuIGxldHMgdHVybiBjb252ZXJ0VG9BYnNvbHV0ZVVybHNcblx0b24gYnkgZGVmYXVsdC4gIE90aGVyd2lzZSBkZWZhdWx0IHRvIHRoZSBjb252ZXJ0VG9BYnNvbHV0ZVVybHMgb3B0aW9uXG5cdGRpcmVjdGx5XG5cdCovXG5cdHZhciBhdXRvRml4VXJscyA9IG9wdGlvbnMuY29udmVydFRvQWJzb2x1dGVVcmxzID09PSB1bmRlZmluZWQgJiYgc291cmNlTWFwO1xuXG5cdGlmIChvcHRpb25zLmNvbnZlcnRUb0Fic29sdXRlVXJscyB8fCBhdXRvRml4VXJscyl7XG5cdFx0Y3NzID0gZml4VXJscyhjc3MpO1xuXHR9XG5cblx0aWYoc291cmNlTWFwKSB7XG5cdFx0Ly8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjY2MDM4NzVcblx0XHRjc3MgKz0gXCJcXG4vKiMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LFwiICsgYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoc291cmNlTWFwKSkpKSArIFwiICovXCI7XG5cdH1cblxuXHR2YXIgYmxvYiA9IG5ldyBCbG9iKFtjc3NdLCB7IHR5cGU6IFwidGV4dC9jc3NcIiB9KTtcblxuXHR2YXIgb2xkU3JjID0gbGlua0VsZW1lbnQuaHJlZjtcblxuXHRsaW5rRWxlbWVudC5ocmVmID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblxuXHRpZihvbGRTcmMpXG5cdFx0VVJMLnJldm9rZU9iamVjdFVSTChvbGRTcmMpO1xufVxuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3N0eWxlLWxvYWRlci9hZGRTdHlsZXMuanNcbi8vIG1vZHVsZSBpZCA9IDQ1M1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJpbXBvcnQgeyBvYnNlcnZlciB9IGZyb20gXCJtb2J4LXJlYWN0XCI7XG5pbXBvcnQgUmVhY3QgZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQga2V5ZG93biBmcm9tIFwicmVhY3Qta2V5ZG93blwiO1xuaW1wb3J0IHsgQnV0dG9uLCBEcm9wZG93biwgR3JpZCwgTWVudSwgU2VnbWVudCwgVGV4dEFyZWEgfSBmcm9tICdzZW1hbnRpYy11aS1yZWFjdCdcblxuaW1wb3J0IEV4YW1wbGVTdG9yZSBmcm9tIFwiLi9FeGFtcGxlU3RvcmVcIjtcbmltcG9ydCBTcGFjZXIgZnJvbSBcIi4vU3BhY2VyLmpzeFwiO1xuaW1wb3J0IFwiLi9zdHlsZXMubGVzc1wiO1xuaW1wb3J0IFRhYmJhYmxlVGV4dEFyZWEgZnJvbSBcIi4vVGFiYmFibGVUZXh0QXJlYS5qc3hcIjtcblxuQG9ic2VydmVyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTcGVsbEVkaXRvciBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdHN0YXRpYyBkZWZhdWx0UHJvcHMgPSB7XG5cdFx0ZXhhbXBsZXM6IG5ldyBFeGFtcGxlU3RvcmUoKVxuXHR9O1xuXG5cdGNvbnN0cnVjdG9yKHByb3BzKSB7XG5cdFx0c3VwZXIocHJvcHMpO1xud2luZG93LmV4YW1wbGVzID0gcHJvcHMuZXhhbXBsZXM7XG5cdFx0dGhpcy5wcm9wcy5leGFtcGxlcy5sb2FkKCk7XG5cblx0XHQvL0RFQlVHXG5cdFx0d2luZG93LnNwZWxsRWRpdG9yID0gdGhpcztcblx0XHR3aW5kb3cuZXhhbXBsZXMgPSB0aGlzLnByb3BzLmV4YW1wbGVzO1xuXHR9XG5cblx0QGtleWRvd24oXCJjdHJsK3NcIilcblx0c2F2ZSgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5zYXZlKCk7IH1cblxuXHRAa2V5ZG93bihcImN0cmwrclwiKVxuXHRyZXZlcnQoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMucmV2ZXJ0KCk7IH1cblxuXHRAa2V5ZG93bihcImN0cmwrY1wiKVxuXHRjb21waWxlKCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLmNvbXBpbGUoKTsgfVxuXG5cdEBrZXlkb3duKFwiY3RybCtuXCIpXG5cdGNyZWF0ZSgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5jcmVhdGUoKTsgfVxuXG5cdEBrZXlkb3duKFwiY3RybCtkXCIpXG5cdGRlbGV0ZSgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5kZWxldGUodW5kZWZpbmVkLCBcIkNPTkZJUk1cIik7IH1cblxuXHRyZW5hbWUoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMucmVuYW1lKCk7IH1cblx0ZHVwbGljYXRlKCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLmR1cGxpY2F0ZSgpOyB9XG5cdGxvYWQoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMubG9hZCgpOyB9XG5cdHJlc2V0KCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLnJlc2V0KCk7IH1cblxuXG5cdHJlbmRlcigpIHtcblx0XHRsZXQgeyBleGFtcGxlcyB9ID0gdGhpcy5wcm9wcztcblx0XHRsZXQgeyB0aXRsZXMsIHNlbGVjdGVkLCBkaXJ0eSwgY29kZSwgb3V0cHV0IH0gPSBleGFtcGxlcztcblxuXHRcdC8vIENyZWF0ZSBtZW51aXRlbXMgZnJvbSB0aGUgZXhhbXBsZXNcblx0XHRsZXQgb3B0aW9ucyA9IHRpdGxlcy5tYXAoIHRpdGxlID0+XG5cdFx0XHQoe1xuXHRcdFx0XHR2YWx1ZTogdGl0bGUsXG5cdFx0XHRcdHRpdGxlOiB0aXRsZSxcblx0XHRcdFx0dGV4dDogdGl0bGUsXG5cdFx0XHRcdGNvbnRlbnQ6IHRpdGxlLFxuXHRcdFx0XHRvbkNsaWNrOiAoKSA9PiBleGFtcGxlcy5zZWxlY3QodGl0bGUpXG5cdFx0XHR9KSk7XG5cblx0XHRsZXQgZGlydHlCdXR0b25zID0gKCkgPT4ge1xuXHRcdFx0aWYgKCFkaXJ0eSkgcmV0dXJuO1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0PE1lbnUgc2Vjb25kYXJ5IHN0eWxlPXt7IHBvc2l0aW9uOiBcImFic29sdXRlXCIsIHJpZ2h0OiBcIjFyZW1cIiwgdG9wOiBcIjNweFwiLCBtYXJnaW46IDAgfX0+XG5cdFx0XHRcdFx0PEJ1dHRvbiBuZWdhdGl2ZSBvbkNsaWNrPXsoKSA9PiB0aGlzLnJldmVydCgpfT48dT5SPC91PmV2ZXJ0PC9CdXR0b24+XG5cdFx0XHRcdFx0PEJ1dHRvbiBwb3NpdGl2ZSBvbkNsaWNrPXsoKSA9PiB0aGlzLnNhdmUoKX0+PHU+UzwvdT5hdmU8L0J1dHRvbj5cblx0XHRcdFx0PC9NZW51PlxuXHRcdFx0KTtcblx0XHR9O1xuXG5cdFx0bGV0IGNvbXBpbGVCdXR0b24gPSAoKSA9PiB7XG5cdFx0XHRpZiAob3V0cHV0KSByZXR1cm47XG5cdFx0XHRyZXR1cm4gPEJ1dHRvblxuXHRcdFx0XHRcdHN0eWxlPXt7IHBvc2l0aW9uOiBcImFic29sdXRlXCIsICB3aWR0aDogXCI0ZW1cIiwgbGVmdDogXCJjYWxjKDUwJSAtIDJlbSlcIiwgdG9wOiBcIjUwJVwiIH19XG5cdFx0XHRcdFx0b25DbGljaz17KCkgPT4gdGhpcy5jb21waWxlKCl9XG5cdFx0XHRcdFx0aWNvbj1cInJpZ2h0IGNoZXZyb25cIi8+O1xuXHRcdH07XG5cblx0XHRyZXR1cm4gKFxuXHRcdDxHcmlkIHN0cmV0Y2hlZCBwYWRkZWQgY2xhc3NOYW1lPVwiZnVsbEhlaWdodFwiPlxuXHRcdFx0PEdyaWQuUm93IHN0eWxlPXt7IGhlaWdodDogXCIycmVtXCIsIHBhZGRpbmdUb3A6IFwiMHJlbVwiIH19IGNsYXNzTmFtZT1cInVpIGludmVydGVkIGF0dGFjaGVkIG1lbnVcIj5cblx0XHRcdFx0PEdyaWQuQ29sdW1uIHdpZHRoPXs3fT5cblx0XHRcdFx0XHQ8TWVudSBpbnZlcnRlZCBhdHRhY2hlZCBmbHVpZD5cblx0XHRcdFx0XHRcdDxNZW51Lkl0ZW0+RXhhbXBsZTo8L01lbnUuSXRlbT5cblx0XHRcdFx0XHRcdDxEcm9wZG93biBpdGVtIHNlbGVjdGlvbiBvcHRpb25zPXtvcHRpb25zfSB2YWx1ZT17c2VsZWN0ZWR9IHN0eWxlPXt7IHdpZHRoOiBcIjIwZW1cIiB9fS8+XG5cdFx0XHRcdFx0XHQ8TWVudS5JdGVtIG9uQ2xpY2s9eygpID0+IHRoaXMuZGVsZXRlKCl9Pjx1PkQ8L3U+ZWxldGU8L01lbnUuSXRlbT5cblx0XHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gdGhpcy5yZW5hbWUoKX0+UmVuYW1lPC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0XHQ8TWVudS5JdGVtIG9uQ2xpY2s9eygpID0+IHRoaXMuZHVwbGljYXRlKCl9PkR1cGxpY2F0ZTwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdDwvTWVudT5cblx0XHRcdFx0PC9HcmlkLkNvbHVtbj5cblx0XHRcdFx0PEdyaWQuQ29sdW1uIHdpZHRoPXsyfT5cblx0XHRcdFx0XHQ8TWVudSBpbnZlcnRlZCBhdHRhY2hlZCBmbHVpZD5cblx0XHRcdFx0XHRcdDxTcGFjZXIgZmx1aWQvPlxuXHRcdFx0XHRcdFx0PE1lbnUuSXRlbSBvbkNsaWNrPXsoKSA9PiB0aGlzLmNyZWF0ZSgpfT48dT5OPC91PmV3PC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0XHQ8U3BhY2VyIGZsdWlkLz5cblx0XHRcdFx0XHQ8L01lbnU+XG5cdFx0XHRcdDwvR3JpZC5Db2x1bW4+XG5cdFx0XHRcdDxHcmlkLkNvbHVtbiB3aWR0aD17N30+XG5cdFx0XHRcdFx0PE1lbnUgaW52ZXJ0ZWQgYXR0YWNoZWQgZmx1aWQ+XG5cdFx0XHRcdFx0XHQ8U3BhY2VyIGZsdWlkLz5cblx0XHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gdGhpcy5sb2FkKCl9PlJlbG9hZDwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdFx0PE1lbnUuSXRlbSBvbkNsaWNrPXsoKSA9PiB0aGlzLnJlc2V0KCl9PlJlc2V0PC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0PC9NZW51PlxuXHRcdFx0XHQ8L0dyaWQuQ29sdW1uPlxuXHRcdFx0PC9HcmlkLlJvdz5cblx0XHRcdDxHcmlkLlJvdyBzdHlsZT17eyBoZWlnaHQ6IFwiY2FsYygxMDAlIC0gM3JlbSlcIiB9fT5cblx0XHRcdFx0PEdyaWQuQ29sdW1uIHdpZHRoPXs4fT5cblx0XHRcdFx0XHQ8VGFiYmFibGVUZXh0QXJlYVxuXHRcdFx0XHRcdFx0Y2xhc3NOYW1lPVwidWkgc2VnbWVudFwiXG5cdFx0XHRcdFx0XHR2YWx1ZT17Y29kZX1cblx0XHRcdFx0XHRcdG9uQ2hhbmdlPXsoZXZlbnQpID0+IGV4YW1wbGVzLnVwZGF0ZShleGFtcGxlcy5zZWxlY3RlZCwgZXZlbnQudGFyZ2V0LnZhbHVlLCBcIlNLSVBfU0FWRVwiKX1cblx0XHRcdFx0XHQvPlxuXHRcdFx0XHRcdHtkaXJ0eUJ1dHRvbnMoKX1cblx0XHRcdFx0PC9HcmlkLkNvbHVtbj5cblx0XHRcdFx0PEdyaWQuQ29sdW1uIHdpZHRoPXs4fT5cblx0XHRcdFx0XHQ8VGV4dEFyZWEgY2xhc3NOYW1lPVwidWkgc2VnbWVudFwiIHZhbHVlPXtvdXRwdXR9Lz5cblx0XHRcdFx0PC9HcmlkLkNvbHVtbj5cblx0XHRcdFx0e2NvbXBpbGVCdXR0b24oKX1cblx0XHRcdDwvR3JpZC5Sb3c+XG5cdFx0PC9HcmlkPlxuXHQpO31cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9hcHAvU3BlbGxFZGl0b3IuanN4IiwiZXhwb3J0IFRva2VuaXplciBmcm9tIFwiLi9Ub2tlbml6ZXIuanNcIjtcbmV4cG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5leHBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5pbXBvcnQgXCIuL1J1bGVTeW50YXhcIjtcbmltcG9ydCBwYXJzZXIgZnJvbSBcIi4vcnVsZXMvYWxsLmpzXCI7XG5cbi8vIFN0aWNrIG9uIHdpbmRvdyBmb3IgcmVmbGVjdGlvbiBhbmQgYWQtaG9jIHRlc3RpbmcuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHRPYmplY3QuYXNzaWduKHdpbmRvdywge1xuXHRcdFRva2VuaXplcjogZXhwb3J0cy5Ub2tlbml6ZXIsXG5cdFx0dG9rZW5pemU6IGV4cG9ydHMuVG9rZW5pemVyLnRva2VuaXplLmJpbmQoZXhwb3J0cy5Ub2tlbml6ZXIpLFxuXG5cdFx0UnVsZTogZXhwb3J0cy5SdWxlLFxuXG5cdFx0UGFyc2VyOiBleHBvcnRzLlBhcnNlcixcblx0XHRwYXJzZXI6IHBhcnNlcixcblx0XHRwYXJzZTogcGFyc2VyLnBhcnNlLmJpbmQocGFyc2VyKSxcblx0XHRjb21waWxlOiBwYXJzZXIuY29tcGlsZS5iaW5kKHBhcnNlciksXG5cdH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvaW5kZXguanMiLCJpbXBvcnQgeyBkZWZpbmVNZW1vaXplZCB9IGZyb20gXCIuL21lbW9pemUuanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIHJlLWV4cG9ydCBSdWxlIGZvciB0ZXN0aW5nXG5leHBvcnQgZGVmYXVsdCBSdWxlO1xuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbi8vIFRPRE86XHRVc2Uga2V5d29yZHMgaW4gc3ludGF4IHRvIG1ha2UgYSBxdWljayByZWdleC1iYXNlZCBgdGVzdGAgZnVuY3Rpb24gZm9yIHRoZSBlbnRpcmUgcnVsZVxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgbGFzdEluZGV4ID0gc3ludGF4U3RyZWFtLmxlbmd0aDtcblx0XHR3aGlsZSAoc3RhcnRJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kSW5kZXggXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0aWYgKHJ1bGUpIHtcblx0XHRcdFx0bGV0IGxhc3QgPSBydWxlc1tydWxlcy5sZW5ndGgtMV07XG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBgU3ltYm9sYCBhbmQgbGFzdCB3YXMgYSBgU3ltYm9sYCwgbWVyZ2UgdG9nZXRoZXJcbiBcdFx0XHRcdGlmIChsYXN0ICYmIGxhc3QgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCAmJiBydWxlIGluc3RhbmNlb2YgUnVsZS5TeW1ib2wpIHtcbiBcdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBsYXN0IHJ1bGVcbiBcdFx0XHRcdFx0cnVsZXMucG9wKCk7XG4gXHRcdFx0XHRcdC8vIGFuZCByZXBsYWNlIHdpdGggYSBydWxlIHRoYXQgbWVyZ2VzIHRoZSBrZXl3b3Jkc1xuIFx0XHRcdFx0XHRydWxlLm1hdGNoID0gbGFzdC5tYXRjaC5jb25jYXQocnVsZS5tYXRjaCk7XG4gXHRcdFx0XHR9XG5cdFx0XHRcdHJ1bGVzLnB1c2gocnVsZSk7XG5cdFx0XHR9XG5cdFx0XHRzdGFydEluZGV4ID0gZW5kSW5kZXggKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZXM7XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgc3ludGF4VG9rZW4gPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cblx0XHQvLyBpZiB3ZSBnb3QgYSBcIlxcXFxcIiAod2hpY2ggYWxzbyBoYXMgdG8gZ28gaW50byB0aGUgc291cmNlIHN0cmluZyBhcyBcIlxcXFxcIilcblx0XHQvLyB0cmVhdCB0aGUgbmV4dCB0b2tlbiBhcyBhIGxpdGVyYWwgc3RyaW5nIHJhdGhlciB0aGFuIGFzIGEgc3BlY2lhbCBjaGFyYWN0ZXIuXG5cdFx0aWYgKHN5bnRheFRva2VuID09PSBcIlxcXFxcIikge1xuXHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N5bWJvbChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4ICsgMSk7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChzeW50YXhUb2tlbikge1xuXHRcdFx0Y2FzZSBcIntcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0Y2FzZSBcIihcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCJbXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydEluZGV4KTtcblx0XHRcdGNhc2UgXCIqXCI6XG5cdFx0XHRjYXNlIFwiK1wiOlxuXHRcdFx0Y2FzZSBcIj9cIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cblx0XHRcdC8vIHRoZSBmb2xsb3dpbmcgc2hvdWxkIEFMV0FZUyBiZSBjb25zdW1lZCBieSB0aGUgYWJvdmVcblx0XHRcdGNhc2UgXCJ9XCI6XG5cdFx0XHRjYXNlIFwiKVwiOlxuXHRcdFx0Y2FzZSBcIl1cIjpcblx0XHRcdGNhc2UgXCJ8XCI6XG5cdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCAke3N5bnRheFRva2VufSBmb3VuZCBhcyBpdGVtICR7c3RhcnRJbmRleH0gb2YgJHt0aGlzLnN5bnRheH1gKTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0aWYgKHN5bnRheFRva2VuLm1hdGNoKFJ1bGUuS0VZV09SRF9QQVRURVJOKSkge1xuXHRcdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9rZXl3b3JkKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0SW5kZXgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnRJbmRleCk7XG5cdFx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0S0VZV09SRF9QQVRURVJOIDogL1tBLVphLXpdW1xcd18tXSovLFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIElmIG1vcmUgdGhhbiBvbmUga2V5d29yZCBhcHBlYXJzIGluIGEgcm93LCBjb21iaW5lcyB0aGVtIGludG8gYSBzaW5nbGUgYEtleXdvcmRgIG9iamVjdC5cblx0Ly8gVGhpcyBpcyBwcmV0dHkgc2FmZSwgdW5sZXNzIHlvdSBoYXZlIGFuIG9wdGlvbmFsIGtleXdvcmQgbGlrZVxuXHQvL1x0XHRgdGhlIHtpZGVudGlmaWVyfSBvZiB0aGU/IHtleHByZXNzaW9ufWBcblx0Ly8gaW4gd2hpY2ggY2FzZSB5b3UgY2FuIHB1dCB0aGUgb3B0aW9uYWwga2V5d29yZCBpbiBwYXJlbnNcblx0Ly9cdFx0YHRoZSB7aWRlbnRpZmllcn0gb2YgKHRoZT8pIHtleHByZXNzaW9ufWBcblx0Ly9cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCwgY29uc3RydWN0b3IpIHtcblx0XHRsZXQgbWF0Y2ggPSBbXSwgZW5kSW5kZXg7XG4gXHRcdC8vIGVhdCBrZXl3b3JkcyB3aGlsZSB0aGV5IGxhc3Rcblx0XHRmb3IgKHZhciBpID0gc3RhcnRJbmRleDsgaSA8IHN5bnRheFN0cmVhbS5sZW5ndGg7IGkrKykge1xuXHRcdFx0bGV0IG5leHQgPSBzeW50YXhTdHJlYW1baV07XG5cdFx0XHRpZiAodHlwZW9mIG5leHQgPT09IFwic3RyaW5nXCIgJiYgbmV4dC5tYXRjaChSdWxlLktFWVdPUkRfUEFUVEVSTikpIHtcblx0XHRcdFx0bWF0Y2gucHVzaChuZXh0KTtcblx0XHRcdFx0ZW5kSW5kZXggPSBpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBicmVhaztcblx0XHR9XG5cblx0XHRpZiAoIWNvbnN0cnVjdG9yKSBjb25zdHJ1Y3RvciA9IFJ1bGUuS2V5d29yZDtcblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IG1hdGNoIH0pO1xuXG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kSW5kZXggXTtcblx0fSxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3ltYm9sKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDAsIGNvbnN0cnVjdG9yID0gUnVsZS5TeW1ib2wpIHtcblx0XHRsZXQgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0SW5kZXhdO1xuXG5cdFx0aWYgKCFjb25zdHJ1Y3RvcikgY29uc3RydWN0b3IgPSBSdWxlLlN5bWJvbDtcblxuXHRcdC8vIElmIHN0cmluZyBzdGFydHMgd2l0aCBgXFxcXGAsIGl0J3MgYW4gZXNjYXBlZCBsaXRlcmFsIChlZzogYFxcW2AgbmVlZHMgdG8gaW5wdXQgYXMgYFxcXFxbYCkuXG5cdFx0bGV0IGlzRXNjYXBlZCA9IHN0cmluZy5zdGFydHNXaXRoKFwiXFxcXFwiKTtcblx0XHRsZXQgbWF0Y2ggPSBpc0VzY2FwZWQgPyBzdHJpbmcuc3Vic3RyKDEpIDogc3RyaW5nO1xuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgY29uc3RydWN0b3IoeyBtYXRjaCB9KTtcblxuXHRcdGlmIChpc0VzY2FwZWQpIHtcblx0XHRcdHJ1bGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGBcXFxcJHttYXRjaH0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBbIHJ1bGUsIHN0YXJ0SW5kZXggXTtcblx0fSxcblxuXG5cdC8vIE1hdGNoIGdyb3VwaW5nIGV4cHJlc3Npb24gYCguLi58Li4uKWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFlvdSBjYW4gc3BlY2lmeSBhbiBleHBsaWNpdCBgcnVsZS5hcmd1bWVudGAgd2l0aDogIGAoc29tZWFyZzouLi4pYFxuXHQvLyBZb3UgY2FuIHNwZWNpZnkgdGhhdCB0aGUgcmVzdWx0cyBzaG91bGQgYmUgYHByb21vdGVkYCB0byBlbmNsb3NpbmcgY29udGV4dCB3aXRoOiBgKD86Li4uKWBcblx0Ly9cblx0Ly8gTk9URTogbmVzdGVkIHBhcmVucyBtYXkgbm90IGhhdmUgYWx0ZXJuYXRpdmVzLi4uIDotKCAgIGAoYXwoYnxjKSlgIHdvbid0IHdvcms/Pz9cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnRJbmRleCA9IDApIHtcblx0XHRsZXQgeyBlbmRJbmRleCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCIoXCIsIFwiKVwiLCBzdGFydEluZGV4KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IFwicHJvbW90ZVwiIGZsYWc6IGA/OmBcblx0XHRsZXQgcHJvbW90ZSA9IChzbGljZVswXSA9PT0gXCI/XCIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKTtcblx0XHRpZiAocHJvbW90ZSkgc2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHQvLyBzcGxpdCBpbnRvIGdyb3VwcywgaW5jbHVkaW5nIG5lc3RlZCBwYXJlbnNcblx0XHRsZXQgYWx0ZXJuYXRpdmVzID1cblx0XHRcdGdyb3VwQWx0ZXJuYXRpdmVzKHNsaWNlKVxuXHRcdFx0Lm1hcChmdW5jdGlvbihncm91cCkge1xuXHRcdFx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2Vucyhncm91cCwgW10pO1xuXHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0c1swXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IFJ1bGUuU2VxdWVuY2UoeyBydWxlczogcmVzdWx0cyB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRsZXQgcnVsZSA9IGFsdGVybmF0aXZlcy5sZW5ndGggPT09IDEgPyBhbHRlcm5hdGl2ZXNbMF0gOiBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlczogYWx0ZXJuYXRpdmVzIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdGlmIChwcm9tb3RlKSBydWxlLnByb21vdGUgPSB0cnVlO1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZEluZGV4IF07XG5cblx0XHRmdW5jdGlvbiBncm91cEFsdGVybmF0aXZlcyh0b2tlbnMpIHtcblx0XHRcdGxldCBhbHRlcm5hdGl2ZXMgPSBbXTtcblx0XHRcdGxldCBjdXJyZW50ID0gW107XG5cdFx0XHRmb3IgKGxldCBpID0gMCwgdG9rZW47IHRva2VuID0gdG9rZW5zW2ldOyBpKyspIHtcblx0XHRcdFx0Ly8gaGFuZGxlIGFsdGVybmF0ZSBtYXJrZXJcblx0XHRcdFx0aWYgKHRva2VuID09PSBcInxcIikge1xuXHRcdFx0XHRcdGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBbXTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBoYW5kbGUgbmVzdGVkIHBhcmVuc1xuXHRcdFx0XHRlbHNlIGlmICh0b2tlbiA9PT0gXCIoXCIpIHtcblx0XHRcdFx0XHRsZXQgeyBlbmRJbmRleCB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBcIihcIiwgXCIpXCIsIGkpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBjdXJyZW50LmNvbmNhdCh0b2tlbnMuc2xpY2UoaSwgZW5kSW5kZXggKyAxKSk7XG5cdFx0XHRcdFx0aSA9IGVuZEluZGV4O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGN1cnJlbnQucHVzaCh0b2tlbik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChjdXJyZW50Lmxlbmd0aCkgYWx0ZXJuYXRpdmVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRyZXR1cm4gYWx0ZXJuYXRpdmVzO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCByZXBlYXQgaW5kaWNhdG9yIGA/YCwgYCtgIG9yIGAqYCBieSBhdHRhY2hpbmcgaXQgdG8gdGhlIHByZXZpb3VzIHJ1bGUuXG5cdHBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBzeW1ib2wgPSBzeW50YXhTdHJlYW1bc3RhcnRJbmRleF07XG5cdFx0bGV0IHJ1bGUgPSBydWxlc1tydWxlcy5sZW5ndGggLSAxXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgYXR0YWNoIHJlcGVhdCBzeW1ib2wgJHtzeW1ib2x9IHRvIGVtcHR5IHJ1bGUhYCk7XG5cblx0XHQvLyBUcmFuc2Zvcm0gbGFzdCBydWxlIGludG8gYSByZXBlYXQgZm9yIGAqYCBhbmQgYCtgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiKlwiIHx8IHN5bWJvbCA9PT0gXCIrXCIpIHtcblx0XHRcdGxldCBhcmd1bWVudCA9IHJ1bGUuYXJndW1lbnQ7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuUmVwZWF0KHsgcnVsZSB9KTtcblx0XHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdFx0Ly8gcHVzaCBpbnRvIHJ1bGUgc3RhY2sgaW4gcGxhY2Ugb2Ygb2xkIHJ1bGVcblx0XHRcdHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdID0gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBSdWxlIGlzIG9wdGlvbmFsIGZvciBgP2AgYW5kIGAqYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIj9cIiB8fCBzeW1ib2wgPT09IFwiKlwiKSB7XG5cdFx0XHRydWxlLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gWyB1bmRlZmluZWQsIHN0YXJ0SW5kZXggXVxuXHR9LFxuXG5cdC8vIE1hdGNoIGB7PHJ1bGVOYW1lPn1gIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmRJbmRleCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCBtYXRjaCA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJ7XCIsIFwifVwiLCBzdGFydEluZGV4KTtcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA9PT0gMyAmJiBtYXRjaC5zbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gbWF0Y2guc2xpY2VbMF07XG5cdFx0XHRtYXRjaC5zbGljZSA9IG1hdGNoLnNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID4gMSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCBwcm9jZXNzIHJ1bGVzIHdpdGggbW9yZSB0aGFuIG9uZSBydWxlIG5hbWU6IHske21hdGNoLnNsaWNlLmpvaW4oXCJcIil9fWApO1xuXG5cdFx0bGV0IHBhcmFtcyA9IHsgcnVsZTogbWF0Y2guc2xpY2VbMF0gfTtcblxuXHRcdC8vIHNlZSBpZiB0aGVyZSdzIGEgYG5vdGAgcnVsZSBpbiB0aGVyZVxuXHRcdGxldCBiYW5nUG9zaXRpb24gPSBwYXJhbXMucnVsZS5pbmRleE9mKFwiIVwiKTtcblx0XHRpZiAoYmFuZ1Bvc2l0aW9uICE9PSAtMSkge1xuXHRcdFx0cGFyYW1zLm5vdCA9IHBhcmFtcy5ydWxlLnN1YnN0cihiYW5nUG9zaXRpb24gKyAxKTsgLy9bIHBhcmFtcy5ydWxlLnN1YnN0cihiYW5nUG9zaXRpb24gKyAxKSBdO1xuXHRcdFx0cGFyYW1zLnJ1bGUgPSBwYXJhbXMucnVsZS5zdWJzdHIoMCwgYmFuZ1Bvc2l0aW9uKTtcblx0XHR9XG5cblx0XHRsZXQgcnVsZSA9IG5ldyBSdWxlLlN1YnJ1bGUocGFyYW1zKTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBtYXRjaC5lbmRJbmRleCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZEluZGV4IF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0SW5kZXggPSAwLCBjb25zdHJ1Y3RvciA9IFJ1bGUuTGlzdCkge1xuXHRcdGxldCB7IGVuZEluZGV4LCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIltcIiwgXCJdXCIsIHN0YXJ0SW5kZXgpO1xuXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHRpZiAocmVzdWx0cy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCBzdHVmZiBhdCBlbmQgb2YgbGlzdDogWyR7c2xpY2Uuam9pbihcIiBcIil9XWApO1xuXHRcdH1cblx0XHRsZXQgWyBpdGVtLCBkZWxpbWl0ZXIgXSA9IHJlc3VsdHM7XG5cblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IGl0ZW0sIGRlbGltaXRlciB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmRJbmRleCBdO1xuXHR9LFxuXG59KTtcblxuXG5cbi8vICMjICBBZGQgbWV0aG9kcyB0byBQYXJzZXIgdG8gZGVmaW5lIHJ1bGVzIHVzaW5nIHRoZSBhYm92ZSBzeW50YXguXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhQYXJzZXIucHJvdG90eXBlLCB7XG5cblx0Ly8gUGFyc2UgYSBgcnVsZVN5bnRheGAgcnVsZSBhbmQgYWRkIGl0IHRvIG91ciBsaXN0IG9mIHJ1bGVzLlxuXHQvLyBSZXR1cm5zIHRoZSBuZXcgcnVsZS5cblx0Ly8gTG9ncyBwYXJzaW5nIGVycm9ycyBidXQgYWxsb3dzIHRoaW5ncyB0byBjb250aW51ZS5cblx0YWRkU2VxdWVuY2U6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZSwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFNlcXVlbmNlKG5hbWUsIHN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpKTtcblxuXHRcdGlmICh0eXBlb2YgY29uc3RydWN0b3IgIT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0cHJvcGVydGllcyA9IGNvbnN0cnVjdG9yO1xuXHRcdFx0Y29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlO1xuXHRcdH1cblx0XHR0cnkge1xuXHRcdFx0bGV0IHJ1bGUgPSBSdWxlLnBhcnNlUnVsZVN5bnRheChydWxlU3ludGF4LCBjb25zdHJ1Y3Rvcik7XG5cdFx0XHQvLyBSZWZsZWN0IHRoZSBydWxlIGJhY2sgb3V0IHRvIG1ha2Ugc3VyZSBpdCBsb29rcyAobW9yZSBvciBsZXNzKSB0aGUgc2FtZVxuXHRcdFx0aWYgKFBhcnNlci5ERUJVRykgY29uc29sZS5sb2coYEFkZGVkIHJ1bGUgJyR7bmFtZX0nOlxcbiAgSU5QVVQ6ICR7cnVsZVN5bnRheH0gXFxuIE9VVFBVVDogJHtydWxlfWApO1xuXG4vL2NvbnNvbGUuaW5mbyhuYW1lLCBjb25zdHJ1Y3RvciwgcnVsZSk7XG5cdFx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5ncm91cChgRXJyb3IgcGFyc2luZyBzeW50YXggZm9yIHJ1bGUgJyR7bmFtZX0nOmApO1xuXHRcdFx0Y29uc29sZS5sb2coYHN5bnRheDogJHtydWxlU3ludGF4fWApO1xuXHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHR9XG5cdH19LFxuXG5cdGFkZFN0YXRlbWVudDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlN0YXRlbWVudCwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFN0YXRlbWVudChuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSk7XG5cblx0XHRsZXQgcnVsZSA9IHRoaXMuYWRkU2VxdWVuY2UobmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRFeHByZXNzaW9uOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuRXhwcmVzc2lvbiwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZEV4cHJlc3Npb24obmFtZSwgc3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcykpO1xuXG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmFkZFNlcXVlbmNlKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcImV4cHJlc3Npb25cIiwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZExpc3Q6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5MaXN0LCBwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gQWRkIGEgYnVuY2ggb2Ygc3ludGF4ZXMgYXQgb25jZSBpZiB3ZSBnb3QgYW4gYXJyYXkgb2Ygc3ludGF4ZXNcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSlcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkTGlzdChuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSk7XG5cblx0XHRsZXQgc3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgocnVsZVN5bnRheCk7XG5cdFx0bGV0IHJ1bGUgPSAoUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pWzBdO1xuXHRcdGlmICghcnVsZSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBSdWxlLmFkZExpc3QoJHtuYW1lfSwgJHtydWxlU3ludGF4fSk6IG5vIHJ1bGUgcHJvZHVjZWRgKTtcblx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRLZXl3b3JkOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuS2V5d29yZCwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZEtleXdvcmQobmFtZSwgc3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcykpO1xuXG5cdFx0bGV0IHN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgpO1xuXHRcdGxldCBydWxlID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKVswXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZS5hZGRLZXl3b3JkKCR7bmFtZX0sICR7cnVsZVN5bnRheH0pOiBubyBydWxlIHByb2R1Y2VkYCk7XG5cdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fX0sXG5cblx0YWRkU3ltYm9sOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuU3ltYm9sLCBwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gQWRkIGEgYnVuY2ggb2Ygc3ludGF4ZXMgYXQgb25jZSBpZiB3ZSBnb3QgYW4gYXJyYXkgb2Ygc3ludGF4ZXNcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSlcblx0XHRcdHJldHVybiBydWxlU3ludGF4LmZvckVhY2goc3ludGF4ID0+IHRoaXMuYWRkU3ltYm9sKG5hbWUsIHN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpKTtcblxuXHRcdC8vIFBhcnNlIGFzIGB0b2tlbnNgLCB3aGljaCB3aWxsIG1lcmdlIFN5bWJvbHMgZm9yIHVzLlxuXHRcdGxldCBzdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChydWxlU3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSAoUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN0cmVhbSwgW10sIDAsIGNvbnN0cnVjdG9yKSB8fCBbXSk7XG5cblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFJ1bGUuYWRkU3ltYm9sKCR7bmFtZX0sICR7cnVsZVN5bnRheH0pOiBubyBydWxlIHByb2R1Y2VkYCk7XG5cdFx0fVxuXG5cdFx0aWYgKHJ1bGVzLmxlbmd0aCA+IDEgfHwgIShydWxlc1swXSBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sKSkge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBSdWxlLmFkZFN5bWJvbCgke25hbWV9LCAke3J1bGVTeW50YXh9KTogZ2VuZXJhdGVkIHNvbWV0aGluZyBgK1xuXHRcdFx0XHRgIG90aGVyIHRoYW4gYSBzaW5nbGUgU3ltYm9sLiAgVXNlIFJ1bGUuYWRkU3ludGF4KCkgaW5zdGVhZC5gKTtcblx0XHR9XG5cblx0XHRsZXQgcnVsZSA9IHJ1bGVzWzBdO1xuXHRcdC8vIENvbnZlcnQgdG8gcHJvcGVyIHR5cGUgaWYgbmVjZXNzYXJ5XG5cdFx0aWYgKGNvbnN0cnVjdG9yICE9PSBSdWxlLlN5bWJvbCkgcnVsZSA9IG5ldyBjb25zdHJ1Y3RvcihydWxlKTtcblx0XHRpZiAocHJvcGVydGllcykgT2JqZWN0LmFzc2lnbihydWxlLCBwcm9wZXJ0aWVzKTtcblx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHR9fSxcblxufSk7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUnVsZVN5bnRheC5qcyIsIi8qIFN0b3JlIG9mIGV4YW1wbGUgc3BlbGwgY29kZSBmcmFnbWVudHMuICovXG5pbXBvcnQgbW9ieCwgeyBvYnNlcnZhYmxlLCBjb21wdXRlZCB9IGZyb20gXCJtb2J4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV4YW1wbGVTdG9yZSB7XG5cdC8vIENVUlJFTlQgZXhhbXBsZXNcblx0QG9ic2VydmFibGUgZXhhbXBsZXMgPSB7fTtcblx0Ly8gRXhhbXBsZXMgYXMgb2YgbGFzdCBzYXZlIChmb3IgcmV2ZXIpXG5cdEBvYnNlcnZhYmxlIF9zYXZlZEV4YW1wbGVzID0ge307XG5cdC8vIFNlbGVjdGVkIGV4YW1wbGUga2V5LlxuXHRAb2JzZXJ2YWJsZSBzZWxlY3RlZCA9IFwiXCI7XG5cdC8vIENvbXBpbGVkIG91dHB1dC5cblx0QG9ic2VydmFibGUgb3V0cHV0ID0gXCJcIjtcblxuXHQvLyBSZXR1cm4ganVzdCB0aGUgdGl0bGVzIG9mIHRoZSBleGFtcGxlcy5cblx0QGNvbXB1dGVkIGdldCB0aXRsZXMoKSB7XG5cdFx0cmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuZXhhbXBsZXMpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBjb2RlIGZvciB0aGUgY3VycmVudCBleGFtcGxlXG5cdEBjb21wdXRlZCBnZXQgY29kZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5leGFtcGxlc1t0aGlzLnNlbGVjdGVkXTtcblx0fVxuXG5cdC8vIElzIEFOWVRISU5HIGRpcnR5P1xuXHRAY29tcHV0ZWQgZ2V0IGRpcnR5KCkge1xuXHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLl9zYXZlZEV4YW1wbGVzKSAhPT0gSlNPTi5zdHJpbmdpZnkodGhpcy5leGFtcGxlcyk7XG5cdH1cblxuXHQvLyBSZXNldCBhbGwgZXhhbXBsZXMgZnJvbSBsb2NhbFN0b3JhZ2UuXG5cdHJlc2V0KCkge1xuXHRcdGRlbGV0ZSBsb2NhbFN0b3JhZ2Uuc3BlbGxFZGl0b3JFeGFtcGxlcztcblx0XHRkZWxldGUgbG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZTtcblx0XHR3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdH1cblxuXHQvLyBMb2FkIGV4YW1wbGVzXG5cdGxvYWQoKSB7XG5cdFx0Ly8gTG9hZCBleGFtcGxlcyBmcm9tIGxvY2FsU3RvcmFnZVxuXHRcdHRoaXMuZXhhbXBsZXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5zcGVsbEVkaXRvckV4YW1wbGVzXG5cdFx0XHR8fCAne1wiRm9vXCI6XCJkZWZpbmUgdHlwZSBGb29cIiwgXCJCYXJcIjpcImRlZmluZSB0eXBlIEJhclwifScpO1xuXG5cdFx0Ly8gU2F2ZSBhIGNvcHkgb2YgZXhhbXBsZXMgZm9yIHJldmVydFxuXHRcdHRoaXMuX3NhdmVkRXhhbXBsZXMgPSB0aGlzLmV4YW1wbGVzO1xuXG5cdFx0Ly8gTG9hZCBzZWxlY3RlZCBleGFtcGxlIG5hbWVcblx0XHR0aGlzLnNlbGVjdChsb2NhbFN0b3JhZ2Uuc3BlbGxFZGl0b3JFeGFtcGxlKTtcblx0fVxuXG5cdC8vIFNhdmUgY3VycmVudCBleGFtcGxlcy5cblx0c2F2ZSgpIHtcblx0XHRsb2NhbFN0b3JhZ2Uuc3BlbGxFZGl0b3JFeGFtcGxlcyA9IEpTT04uc3RyaW5naWZ5KHRoaXMuZXhhbXBsZXMpO1xuXG5cdFx0Ly8gU2F2ZSBhIGNvcHkgb2YgZXhhbXBsZXMgZm9yIHJldmVydFxuXHRcdHRoaXMuX3NhdmVkRXhhbXBsZXMgPSB0aGlzLmV4YW1wbGVzO1xuXHR9XG5cblx0Ly8gUmV2ZXJ0IHRoZSBjdXJyZW50IGV4YW1wbGVcblx0cmV2ZXJ0KGV4YW1wbGUgPSB0aGlzLnNlbGVjdGVkKSB7XG5cdFx0dGhpcy51cGRhdGUoZXhhbXBsZSwgdGhpcy5fc2F2ZWRFeGFtcGxlc1tleGFtcGxlXSk7XG5cdH1cblxuXHQvLyBTZWxlY3QgYSBkaWZmZXJlbnQgZXhhbXBsZS5cblx0c2VsZWN0KGV4YW1wbGUpIHtcblx0XHRpZiAoIWV4YW1wbGUgfHwgdGhpcy5leGFtcGxlc1tleGFtcGxlXSA9PSBudWxsKSBleGFtcGxlID0gT2JqZWN0LmtleXModGhpcy5leGFtcGxlcylbMF0gfHwgXCJcIjtcblx0XHR0aGlzLnNlbGVjdGVkID0gbG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZSA9IGV4YW1wbGU7XG5cdFx0dGhpcy5vdXRwdXQgPSBcIlwiO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgbmV3IGV4YW1wbGUuXG5cdC8vIFNhdmVzIGFuZCBzZWxlY3RzIHRoZSBleGFtcGxlIGF1dG9tYXRpY2FsbHkuXG5cdHVwZGF0ZShuYW1lLCBjb2RlLCBza2lwU2F2ZSkge1xuXHRcdHRoaXMuZXhhbXBsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmV4YW1wbGVzLCB7IFsgbmFtZSBdOiBjb2RlIH0pO1xuXHRcdHRoaXMuc2VsZWN0KG5hbWUpO1xuXHRcdHRoaXMub3V0cHV0ID0gXCJcIjtcblx0XHRpZiAoIXNraXBTYXZlKSB0aGlzLnNhdmUoKTtcblx0fVxuXG5cdC8vIERlbGV0ZSBhbiBleGFtcGxlLlxuXHQvLyBTYXZlcyBhbmQgc2VsZWN0cyBhbm90aGVyIGV4YW1wbGUgYXV0b21hdGljYWxseS5cblx0ZGVsZXRlKG5hbWUgPSB0aGlzLnNlbGVjdGVkLCBzaG93Q29uZmlybSkge1xuXHRcdGlmIChzaG93Q29uZmlybSAmJiAhY29uZmlybShgUmVhbGx5IGRlbGV0ZSBleGFtcGxlICR7bmFtZX0/YCkpIHJldHVybjtcblx0XHRsZXQgZXhhbXBsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmV4YW1wbGVzKTtcblx0XHRkZWxldGUgZXhhbXBsZXNbbmFtZV07XG5cdFx0dGhpcy5leGFtcGxlcyA9IGV4YW1wbGVzO1xuXHRcdHRoaXMuc2F2ZSgpO1xuXHRcdHRoaXMuc2VsZWN0KCk7XG5cdH1cblxuXHQvLyBDcmVhdGUgYSBuZXcgZXhhbXBsZS5cblx0Y3JlYXRlKG5hbWUsIGNvZGUgPSBcIlwiKSB7XG5cdFx0Ly8gSWYgbm8gbmFtZSwgcHJvbXB0LlxuXHRcdGlmICghbmFtZSkgbmFtZSA9IHByb21wdChcIk5hbWUgZm9yIHRoaXMgZXhhbXBsZT9cIik7XG5cdFx0Ly8gRm9yZ2V0IGl0IGlmIG5vIG5hbWUuXG5cdFx0aWYgKCFuYW1lKSByZXR1cm47XG5cblx0XHR0aGlzLnVwZGF0ZShuYW1lLCBjb2RlKTtcblx0fVxuXG5cdC8vIFJlbmFtZSBhbiBleGFtcGxlLlxuXHQvLyBTZWxlY3RzIGFuZCBzYXZlcyBhdXRvbWF0aWNhbGx5LlxuXHRyZW5hbWUob2xkTmFtZSA9IHRoaXMuc2VsZWN0ZWQsIG5ld05hbWUpIHtcblx0XHQvLyBJZiBubyBuZXcgbmFtZSwgcHJvbXB0LlxuXHRcdGlmICghbmV3TmFtZSkgbmV3TmFtZSA9IHByb21wdChcIk5ldyBuYW1lIGZvciB0aGlzIGV4YW1wbGU/XCIsIG9sZE5hbWUpO1xuXG5cdFx0Ly8gRm9yZ2V0IGl0IGlmIG5vIG5hbWUgc3VwcGxpZWQgb3IgbmFtZSBpcyB0aGUgc2FtZVxuXHRcdGlmICghbmV3TmFtZSB8fCBuZXdOYW1lID09PSBvbGROYW1lKSByZXR1cm47XG5cdFx0aWYgKHRoaXMuZXhhbXBsZXNbbmV3TmFtZV0pIHJldHVybiBjb25zb2xlLndhcm4oYGV4YW1wbGVzLnJlbmFtZShcIiR7bmV3TmFtZX1cIik6IG5hbWUgYWxyZWFkeSBpbiB1c2VgKTtcblxuXHRcdGxldCBjb2RlID0gdGhpcy5leGFtcGxlc1tvbGROYW1lXTtcblx0XHR0aGlzLmRlbGV0ZShvbGROYW1lKTtcblx0XHR0aGlzLnVwZGF0ZShuZXdOYW1lLCBjb2RlKTtcblx0fVxuXG5cdC8vIER1cGxpY2F0ZSBhbiBleGFtcGxlLlxuXHRkdXBsaWNhdGUob2xkTmFtZSA9IHRoaXMuc2VsZWN0ZWQsIG5ld05hbWUpIHtcblx0XHQvLyBJZiBubyBuZXcgbmFtZSwgcHJvbXB0LlxuXHRcdGlmICghbmV3TmFtZSkgbmV3TmFtZSA9IHByb21wdChcIk5ldyBuYW1lIGZvciBkdXBsaWNhdGUgZXhhbXBsZT9cIiwgb2xkTmFtZSk7XG5cdFx0Ly8gRm9yZ2V0IGl0IGlmIG5vIG5hbWUgc3VwcGxpZWQgb3IgbmFtZSBpcyB0aGUgc2FtZVxuXHRcdGlmICghbmV3TmFtZSB8fCBuZXdOYW1lID09PSBvbGROYW1lKSByZXR1cm47XG5cdFx0aWYgKHRoaXMuZXhhbXBsZXNbbmV3TmFtZV0pIHJldHVybiBjb25zb2xlLndhcm4oYGV4YW1wbGVzLnJlbmFtZShcIiR7bmV3TmFtZX1cIik6IG5hbWUgYWxyZWFkeSBpbiB1c2VgKTtcblxuXHRcdHRoaXMudXBkYXRlKG5ld05hbWUsIHRoaXMuY29kZSk7XG5cdH1cblxuXHQvLyBDb21waWxlIHRoZSBjdXJyZW50IGV4YW1wbGUsIHBsYWNpbmcgaXQgaW4gb3VyIGBvdXRwdXRgLlxuLy9UT0RPOiBzb21lIHdheSB0byBkbyB0aGlzIGF1dG9tYXRpY2FsbHkgdy8gXCJvdXRwdXRcIiA/XG5cdGNvbXBpbGUoKSB7XG5cdFx0dGhpcy5vdXRwdXQgPSBcIi4uLmNvbXBpbGluZy4uLlwiO1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0dGhpcy5vdXRwdXQgPSBwYXJzZXIuY29tcGlsZSh0aGlzLmNvZGUpO1xuXHRcdH0sIDEwMCk7XG5cdH1cblxufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2FwcC9FeGFtcGxlU3RvcmUuanMiLCIvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vXG4vLyAgPFNwYWNlcj4gY29tcG9uZW50IGZvciB1c2Ugd2l0aCBvYWsuXG4vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbmltcG9ydCBSZWFjdCBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCBQcm9wVHlwZXMgZnJvbSBcInByb3AtdHlwZXNcIjtcbmltcG9ydCB7IGNsYXNzTmFtZXMgfSBmcm9tIFwiLi91dGlsXCI7XG5cbmltcG9ydCBcIi4vU3BhY2VyLmxlc3NcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gU3BhY2VyKHByb3BzKSB7XG4gIGNvbnN0IHtcbiAgICBjbGFzc05hbWUsXG4gICAgYXBwZWFyYW5jZSwgc2l6ZSwgd2lkdGgsIGhlaWdodCxcbiAgICBpbmxpbmUsIGZsdWlkLCB0aW55LCBzbWFsbCwgbWVkaXVtLCBsYXJnZSwgaHVnZSwgbWFzc2l2ZVxuICB9ID0gcHJvcHM7XG5cbiAgY29uc3Qgc3BhY2VyUHJvcHMgPSB7XG4gICAgY2xhc3NOYW1lOiBjbGFzc05hbWVzKGNsYXNzTmFtZSwgXCJvYWtcIiwgc2l6ZSwgYXBwZWFyYW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgeyBpbmxpbmUsIGZsdWlkIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwic3BhY2VyXCIpLFxuICAgIHN0eWxlOiB7XG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICB9XG4gIH1cblxuICByZXR1cm4gPGRpdiB7Li4uc3BhY2VyUHJvcHN9Lz47XG59XG5cblNwYWNlci5wcm9wVHlwZXMgPSB7XG4gIGNsYXNzTmFtZTogUHJvcFR5cGVzLnN0cmluZyxcbiAgYXBwZWFyYW5jZTogUHJvcFR5cGVzLnN0cmluZyxcbiAgc2l6ZTogUHJvcFR5cGVzLnN0cmluZyxcbiAgd2lkdGg6IFByb3BUeXBlcy5udW1iZXIsXG4gIGhlaWdodDogUHJvcFR5cGVzLm51bWJlcixcblxuICBpbmxpbmU6IFByb3BUeXBlcy5ib29sLFxuICBmbHVpZDogUHJvcFR5cGVzLmJvb2wsXG5cbn07XG5cblNwYWNlci5kZWZhdWx0UHJvcHMgPSB7XG4gIHNpemU6IFwibWVkaXVtXCJcbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9hcHAvU3BhY2VyLmpzeCIsImltcG9ydCBSZWFjdCBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCBwcm9wVHlwZXMgZnJvbSBcInByb3AtdHlwZXNcIjtcbmltcG9ydCB7IFRleHRBcmVhIH0gZnJvbSAnc2VtYW50aWMtdWktcmVhY3QnXG5cbi8vXG4vL1x0IyA8VGFiYmFibGVUZXh0QXJlYT4gLS0gPFNVSS5UZXh0QXJlYT4gaW4gd2hpY2ggeW91IGNhbiB0eXBlIGEgdGFiIGNoYXJhY3Rlcjpcbi8vXHQtIElmIG5vdGhpbmcgaXMgc2VsZWN0ZWQsIGluc2VydHMgYSB0YWIgY2hhcmFjdGVyXG4vL1x0LSBJZiBhbnl0aGluZyBpcyBzZWxlY3RlZCwgaW5zZXJ0cyB0YWIgY2hhcmFjdGVycyBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaW5lKHMpXG4vL1x0LSBJZiBzaGlmdCBrZXkgaXMgZG93biwgaW5zZXJ0cyB0YWIgY2hhcmFjdGVycyBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaW5lKHMpLlxuLy9cbi8vXHQjIyMgUHJvcGVydGllc1xuLy9cdC0gYHNhdmVgIChyZXF1aXJlZCkgLS0gZnVuY3Rpb24gdXNlZCB0byBzYXZlIHRoZSByZXN1bHRzIG9uIGtleXByZXNzXG4vL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGFiYmFibGVUZXh0QXJlYSBleHRlbmRzIFRleHRBcmVhIHtcblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiA8VGV4dEFyZWEgey4uLnRoaXMucHJvcHN9IG9uS2V5RG93bj17dGhpcy5vbktleURvd259IC8+O1xuXHR9XG5cblx0Ly8gRG8gTk9UIGV4aXQgb24gdGFiIC0tIGluc2VydCBvciByZW1vdmUgdGFiKHMpIHZhbHVlIGluc3RlYWQuXG5cdG9uS2V5RG93biA9IChldmVudCkgPT4ge1xuXG4vL1RPRE8gZmlyZSBgdGhpcy5wcm9wcy5vbktleURvd25gIGlmIGRlZmluZWQuLi5cblx0XHQvLyBGb3JnZXQgaXQgaWYgbm90IGEgdGFiXG5cdFx0aWYgKGV2ZW50LmtleUNvZGUgIT09IDkpIHJldHVybjtcblxuXHRcdC8vIHByZXZlbnQgZGVmYXVsdCBzbyB3ZSBkb24ndCBleGl0IHRoZSBmaWVsZFxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHQvLyBmaWd1cmUgb3V0IHRoZSB0ZXh0IHJhbmdlXG5cdFx0dmFyIGVsZW1lbnQgPSBldmVudC50YXJnZXQ7XG5cdFx0dmFyIHRleHQgPSBlbGVtZW50LnZhbHVlO1xuXHRcdHZhciBzdGFydCA9IGVsZW1lbnQuc2VsZWN0aW9uU3RhcnQ7XG5cdFx0dmFyIGVuZCA9IGVsZW1lbnQuc2VsZWN0aW9uRW5kO1xuXG5cdFx0Ly8gUmVwbGFjZW1lbnQgdGV4dFxuXHRcdGxldCBuZXdUZXh0ID0gXCJcIiwgc2VsZWN0aW9uU3RhcnQgPSBzdGFydCwgc2VsZWN0aW9uRW5kID0gZW5kO1xuXG5cdFx0Ly8gSWYgc2VsZWN0aW9uIGlzIGVtcHR5LFxuXHRcdGlmIChzdGFydCA9PT0gZW5kICYmICFldmVudC5zaGlmdEtleSkge1xuXHRcdFx0bmV3VGV4dCA9IFwiXFx0XCI7XG5cdFx0XHRzZWxlY3Rpb25TdGFydCA9IHNlbGVjdGlvbkVuZCA9IGVuZCArIDE7XG5cdFx0fVxuXHRcdC8vIG90aGVyd2lzZSBpbmRlbnQvZGUtaW5kZW50IGFsbCBvZiB0aGUgbGluZXNcblx0XHRlbHNlIHtcblx0XHQvLyB1c2Ugc3RhcnQgYW5kIGVuZCBvZiBsaW5lKHMpXG4vL2NvbnNvbGUuaW5mbyhgc3RhcnQ6ICR7c3RhcnR9IDoke3RleHRbc3RhcnRdfTogICBlbmQ6ICR7ZW5kfSA6ICR7dGV4dFtlbmRdfTpgKTtcblx0XHRcdGlmICh0ZXh0W3N0YXJ0XSAhPT0gXCJcXG5cIikgc3RhcnQgPSB0ZXh0Lmxhc3RJbmRleE9mKFwiXFxuXCIsIHN0YXJ0KSArIDE7XG5cdFx0XHRpZiAodGV4dFtlbmQtMV0gPT09IFwiXFxuXCIpIGVuZC0tO1xuXHRcdFx0ZWxzZSBpZiAodGV4dFtlbmQrMV0gIT09IFwiXFxuXCIpIGVuZCA9IHRleHQuaW5kZXhPZihcIlxcblwiLCBlbmQpIC0gMTtcbi8vY29uc29sZS5pbmZvKGBzdGFydDogJHtzdGFydH0gOiR7dGV4dFtzdGFydF19OiAgIGVuZDogJHtlbmR9IDogJHt0ZXh0W2VuZF19OmApO1xuXG5cdFx0XHRsZXQgbGluZXMgPSB0ZXh0LnNsaWNlKHN0YXJ0LCBlbmQpLnNwbGl0KFwiXFxuXCIpO1xuXHRcdFx0Ly8gaWYgc2hpZnQga2V5IGlzIGRvd24sIFJFTU9WRSBhIHRhYiBmcm9tIGVhY2ggbGluZVxuXHRcdFx0aWYgKGV2ZW50LnNoaWZ0S2V5KSB7XG5cdFx0XHRcdGxpbmVzID0gbGluZXMubWFwKGxpbmUgPT4gbGluZVswXSA9PT0gXCJcXHRcIiA/IGxpbmUuc3Vic3RyKDEpIDogbGluZSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBvdGhlcndpc2UgQUREIGEgdGFiIHRvIGVhY2ggbGluZVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGxpbmVzID0gbGluZXMubWFwKGxpbmUgPT4gXCJcXHRcIiArIGxpbmUpO1xuXHRcdFx0fVxuXHRcdFx0c2VsZWN0aW9uU3RhcnQgPSBzdGFydDtcblx0XHRcdG5ld1RleHQgPSBsaW5lcy5qb2luKFwiXFxuXCIpO1xuXHRcdFx0c2VsZWN0aW9uRW5kID0gc2VsZWN0aW9uU3RhcnQgKyBuZXdUZXh0Lmxlbmd0aCArIDE7XG5cdFx0fVxuXG5cdFx0Ly8gVXBkYXRlIGlucHV0IHZhbHVlLlxuXHRcdGVsZW1lbnQudmFsdWUgXHQ9IHRleHQuc3Vic3RyKDAsIHN0YXJ0KVxuXHRcdFx0XHRcdFx0KyBuZXdUZXh0XG5cdFx0XHRcdFx0XHQrIHRleHQuc3Vic3RyKGVuZCk7XG5cblx0XHQvLyBVcGRhdGUgdGhlIHNlbGVjdGlvblxuXHRcdGVsZW1lbnQuc2VsZWN0aW9uU3RhcnQgPSBzZWxlY3Rpb25TdGFydDtcblx0XHRlbGVtZW50LnNlbGVjdGlvbkVuZCA9IHNlbGVjdGlvbkVuZDtcblxuXHRcdC8vIERlbGVnYXRlIHRvIGBwcm9wcy5vbkNoYW5nZWAgdG8gc2F2ZSB0aGUgdmFsdWUgb3V0c2lkZSBvZiB0aGUgY29udHJvbFxuXHRcdGlmICh0aGlzLnByb3BzLm9uQ2hhbmdlKSB0aGlzLnByb3BzLm9uQ2hhbmdlKGV2ZW50KTtcblx0fVxuXG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvYXBwL1RhYmJhYmxlVGV4dEFyZWEuanN4IiwiLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgUmVhY3QgVXRpbGl0eSBmdW5jdGlvbnNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vLyBgY2xhc3NOYW1lc2AsIGNvbmNlcHQgc3RvbGVuIGZyb206ICBodHRwOi8vamVkd2F0c29uLmdpdGh1Yi5pby9jbGFzc25hbWVzXG5leHBvcnQgZnVuY3Rpb24gY2xhc3NOYW1lcyAoLi4uYXJncykge1xuICByZXR1cm4gYXJncy5tYXAoIGFyZyA9PiB7XG4gICAgaWYgKCFhcmcpIHJldHVybiBcIlwiO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGFyZykpIHJldHVybiBjbGFzc05hbWVzKC4uLmFyZyk7XG4gICAgc3dpdGNoICh0eXBlb2YgYXJnKSB7XG4gICAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgICBjYXNlIFwic3RyaW5nXCI6ICByZXR1cm4gYXJnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGFyZykubWFwKCBrZXkgPT4gYXJnW2tleV0gPyBrZXkgOiBcIlwiKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgICAgICAgICAgICAuam9pbihcIiBcIik7XG4gICAgfVxuICB9KS5maWx0ZXIoQm9vbGVhbilcbiAgICAuam9pbihcIiBcIik7XG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9hcHAvdXRpbC5qcyIsIi8vIE1lbW9pemUvZm9yZ2V0IHNlbWFudGljcy5cblxuLy8gUmV0dXJuIGEgbWVtb2l6aW5nIGdldHRlciBmdW5jdGlvbi5cbi8vIFRFU1RNRVxuZXhwb3J0IGZ1bmN0aW9uIG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0aGlzW3Byb3BlcnR5XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSBnZXR0ZXIuYXBwbHkodGhpcyk7XG5cdFx0XHRpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHQvLyBEZWZpbmUgc28gdGhhdCB3ZSBjYW4gYmUgZGVsZXRlZCBhbmQgcmUtZGVmaW5lZCwgYnV0IG5vdCBzZXQgb3IgZW51bWVyYXRlZC5cblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHByb3BlcnR5LCB7IHZhbHVlLCBjb25maWd1cmFibGU6IHRydWUgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzW3Byb3BlcnR5XTtcblx0fVxufVxuXG5cbi8vIFJldHVybiBhIG1lbW9pemUgZnVuY3Rpb24gZm9yIHVzZSBhcyBhIGdldHRlciBpbiBhIGBPYmplY3QuZGVmaW5lUHJvcGVydHkoKWBcbi8vIFRFU1RNRVxuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZU1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpIHtcblx0cmV0dXJuIHtcblx0XHRnZXQgOiBtZW1vaXplZChwcm9wZXJ0eSwgZ2V0dGVyKVxuXHR9XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvbWVtb2l6ZS5qcyIsIi8vIE1ha2Ugc3VyZSBgZ2xvYmFsYCBpcyBkZWZpbmVkIGdsb2JhbGx5OlxuLy9cdC0gZWl0aGVyIGFzIHRoZSBub2RlanMgYGdsb2JhbGAsIG9yXG4vL1x0LSBhcyBhbiBhbGlhcyBmb3IgYHdpbmRvd2AgaW4gYnJvd3NlcnMsIG9yXG4vL1x0LSBmb3IgdGhlIGBzZWxmYCBjb250ZXh0IGluIHdlYiB3b3JrZXJzLlxuLy9cbi8vIE5PVEU6IHRoaXMgbW9kaWZpZXMgdGhlIFwiZ2xvYmFsXCIgZW52aXJvbm1lbnQgYnkgbWFraW5nIHN1cmUgXCJnbG9iYWxcIiBpcyBzZXQuIVxuLy9cblxubGV0IGdsb2JhbF9pZGVudGlmaWVyO1xuaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gbm9kZVwiKTtcblx0Z2xvYmFsX2lkZW50aWZpZXIgPSBnbG9iYWw7XG59XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4vL1x0Y29uc29sZS5sb2coXCJSdW5uaW5nIGluIGEgd2ViIGJyb3dzZXJcIik7XG5cdHdpbmRvdy5nbG9iYWwgPSB3aW5kb3c7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gd2luZG93O1xufVxuXG5pZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gYSB3ZWIgd29ya2VyXCIpO1xuXHRzZWxmLmdsb2JhbCA9IHNlbGY7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gc2VsZjtcbn1cblxuLy8gRXhwb3J0IGZvciBjb25zdW1wdGlvbiBieSBpbXBvcnQuXG5leHBvcnQgZGVmYXVsdCBnbG9iYWxfaWRlbnRpZmllcjtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3V0aWxzL2dsb2JhbC5qcyIsImV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9saWIvY3NzLWJhc2UuanNcIikodW5kZWZpbmVkKTtcbi8vIGltcG9ydHNcblxuXG4vLyBtb2R1bGVcbmV4cG9ydHMucHVzaChbbW9kdWxlLmlkLCBcIi5vYWsuc3BhY2VyIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbn1cXG4ub2FrLnNwYWNlci5pbmxpbmUge1xcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgdmVydGljYWwtYWxpZ246IGJhc2VsaW5lO1xcbn1cXG4ub2FrLnNwYWNlci5mbHVpZCB7XFxuICB3aWR0aDogMTAwJTtcXG4gIGZsZXg6IDEgMSAxMDAlO1xcbn1cXG4ub2FrLnNwYWNlci50aW55IHtcXG4gIHdpZHRoOiAycHg7XFxuICBoZWlnaHQ6IDJweDtcXG59XFxuLm9hay5zcGFjZXIuc21hbGwge1xcbiAgd2lkdGg6IDRweDtcXG4gIGhlaWdodDogNHB4O1xcbn1cXG4ub2FrLnNwYWNlci5tZWRpdW0ge1xcbiAgd2lkdGg6IDEwcHg7XFxuICBoZWlnaHQ6IDEwcHg7XFxufVxcbi5vYWsuc3BhY2VyLmxhcmdlIHtcXG4gIHdpZHRoOiAyMHB4O1xcbiAgaGVpZ2h0OiAyMHB4O1xcbn1cXG4ub2FrLnNwYWNlci5odWdlIHtcXG4gIHdpZHRoOiAzMHB4O1xcbiAgaGVpZ2h0OiAzMHB4O1xcbn1cXG4ub2FrLnNwYWNlci5tYXNzaXZlIHtcXG4gIHdpZHRoOiA1MHB4O1xcbiAgaGVpZ2h0OiA1MHB4O1xcbn1cXG5cIiwgXCJcIl0pO1xuXG4vLyBleHBvcnRzXG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vY3NzLWxvYWRlciEuL34vbGVzcy1sb2FkZXIvZGlzdCEuL3NyYy9hcHAvU3BhY2VyLmxlc3Ncbi8vIG1vZHVsZSBpZCA9IDQ2M1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvbGliL2Nzcy1iYXNlLmpzXCIpKHVuZGVmaW5lZCk7XG4vLyBpbXBvcnRzXG5cblxuLy8gbW9kdWxlXG5leHBvcnRzLnB1c2goW21vZHVsZS5pZCwgXCIuZnVsbFdpZHRoIHtcXG4gIHdpZHRoOiAxMDAlO1xcbn1cXG4uZnVsbEhlaWdodCB7XFxuICBoZWlnaHQ6IDEwMCU7XFxufVxcbi5mdWxsU2l6ZSB7XFxuICB3aWR0aDogMTAwJTtcXG4gIGhlaWdodDogMTAwJTtcXG59XFxuXCIsIFwiXCJdKTtcblxuLy8gZXhwb3J0c1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L2Nzcy1sb2FkZXIhLi9+L2xlc3MtbG9hZGVyL2Rpc3QhLi9zcmMvYXBwL3N0eWxlcy5sZXNzXG4vLyBtb2R1bGUgaWQgPSA0NjRcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICB2YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnZmJqcy9saWIvaW52YXJpYW50Jyk7XG4gIHZhciB3YXJuaW5nID0gcmVxdWlyZSgnZmJqcy9saWIvd2FybmluZycpO1xuICB2YXIgUmVhY3RQcm9wVHlwZXNTZWNyZXQgPSByZXF1aXJlKCcuL2xpYi9SZWFjdFByb3BUeXBlc1NlY3JldCcpO1xuICB2YXIgbG9nZ2VkVHlwZUZhaWx1cmVzID0ge307XG59XG5cbi8qKlxuICogQXNzZXJ0IHRoYXQgdGhlIHZhbHVlcyBtYXRjaCB3aXRoIHRoZSB0eXBlIHNwZWNzLlxuICogRXJyb3IgbWVzc2FnZXMgYXJlIG1lbW9yaXplZCBhbmQgd2lsbCBvbmx5IGJlIHNob3duIG9uY2UuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IHR5cGVTcGVjcyBNYXAgb2YgbmFtZSB0byBhIFJlYWN0UHJvcFR5cGVcbiAqIEBwYXJhbSB7b2JqZWN0fSB2YWx1ZXMgUnVudGltZSB2YWx1ZXMgdGhhdCBuZWVkIHRvIGJlIHR5cGUtY2hlY2tlZFxuICogQHBhcmFtIHtzdHJpbmd9IGxvY2F0aW9uIGUuZy4gXCJwcm9wXCIsIFwiY29udGV4dFwiLCBcImNoaWxkIGNvbnRleHRcIlxuICogQHBhcmFtIHtzdHJpbmd9IGNvbXBvbmVudE5hbWUgTmFtZSBvZiB0aGUgY29tcG9uZW50IGZvciBlcnJvciBtZXNzYWdlcy5cbiAqIEBwYXJhbSB7P0Z1bmN0aW9ufSBnZXRTdGFjayBSZXR1cm5zIHRoZSBjb21wb25lbnQgc3RhY2suXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBjaGVja1Byb3BUeXBlcyh0eXBlU3BlY3MsIHZhbHVlcywgbG9jYXRpb24sIGNvbXBvbmVudE5hbWUsIGdldFN0YWNrKSB7XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgZm9yICh2YXIgdHlwZVNwZWNOYW1lIGluIHR5cGVTcGVjcykge1xuICAgICAgaWYgKHR5cGVTcGVjcy5oYXNPd25Qcm9wZXJ0eSh0eXBlU3BlY05hbWUpKSB7XG4gICAgICAgIHZhciBlcnJvcjtcbiAgICAgICAgLy8gUHJvcCB0eXBlIHZhbGlkYXRpb24gbWF5IHRocm93LiBJbiBjYXNlIHRoZXkgZG8sIHdlIGRvbid0IHdhbnQgdG9cbiAgICAgICAgLy8gZmFpbCB0aGUgcmVuZGVyIHBoYXNlIHdoZXJlIGl0IGRpZG4ndCBmYWlsIGJlZm9yZS4gU28gd2UgbG9nIGl0LlxuICAgICAgICAvLyBBZnRlciB0aGVzZSBoYXZlIGJlZW4gY2xlYW5lZCB1cCwgd2UnbGwgbGV0IHRoZW0gdGhyb3cuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gVGhpcyBpcyBpbnRlbnRpb25hbGx5IGFuIGludmFyaWFudCB0aGF0IGdldHMgY2F1Z2h0LiBJdCdzIHRoZSBzYW1lXG4gICAgICAgICAgLy8gYmVoYXZpb3IgYXMgd2l0aG91dCB0aGlzIHN0YXRlbWVudCBleGNlcHQgd2l0aCBhIGJldHRlciBtZXNzYWdlLlxuICAgICAgICAgIGludmFyaWFudCh0eXBlb2YgdHlwZVNwZWNzW3R5cGVTcGVjTmFtZV0gPT09ICdmdW5jdGlvbicsICclczogJXMgdHlwZSBgJXNgIGlzIGludmFsaWQ7IGl0IG11c3QgYmUgYSBmdW5jdGlvbiwgdXN1YWxseSBmcm9tICcgKyAnUmVhY3QuUHJvcFR5cGVzLicsIGNvbXBvbmVudE5hbWUgfHwgJ1JlYWN0IGNsYXNzJywgbG9jYXRpb24sIHR5cGVTcGVjTmFtZSk7XG4gICAgICAgICAgZXJyb3IgPSB0eXBlU3BlY3NbdHlwZVNwZWNOYW1lXSh2YWx1ZXMsIHR5cGVTcGVjTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIG51bGwsIFJlYWN0UHJvcFR5cGVzU2VjcmV0KTtcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICBlcnJvciA9IGV4O1xuICAgICAgICB9XG4gICAgICAgIHdhcm5pbmcoIWVycm9yIHx8IGVycm9yIGluc3RhbmNlb2YgRXJyb3IsICclczogdHlwZSBzcGVjaWZpY2F0aW9uIG9mICVzIGAlc2AgaXMgaW52YWxpZDsgdGhlIHR5cGUgY2hlY2tlciAnICsgJ2Z1bmN0aW9uIG11c3QgcmV0dXJuIGBudWxsYCBvciBhbiBgRXJyb3JgIGJ1dCByZXR1cm5lZCBhICVzLiAnICsgJ1lvdSBtYXkgaGF2ZSBmb3Jnb3R0ZW4gdG8gcGFzcyBhbiBhcmd1bWVudCB0byB0aGUgdHlwZSBjaGVja2VyICcgKyAnY3JlYXRvciAoYXJyYXlPZiwgaW5zdGFuY2VPZiwgb2JqZWN0T2YsIG9uZU9mLCBvbmVPZlR5cGUsIGFuZCAnICsgJ3NoYXBlIGFsbCByZXF1aXJlIGFuIGFyZ3VtZW50KS4nLCBjb21wb25lbnROYW1lIHx8ICdSZWFjdCBjbGFzcycsIGxvY2F0aW9uLCB0eXBlU3BlY05hbWUsIHR5cGVvZiBlcnJvcik7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmICEoZXJyb3IubWVzc2FnZSBpbiBsb2dnZWRUeXBlRmFpbHVyZXMpKSB7XG4gICAgICAgICAgLy8gT25seSBtb25pdG9yIHRoaXMgZmFpbHVyZSBvbmNlIGJlY2F1c2UgdGhlcmUgdGVuZHMgdG8gYmUgYSBsb3Qgb2YgdGhlXG4gICAgICAgICAgLy8gc2FtZSBlcnJvci5cbiAgICAgICAgICBsb2dnZWRUeXBlRmFpbHVyZXNbZXJyb3IubWVzc2FnZV0gPSB0cnVlO1xuXG4gICAgICAgICAgdmFyIHN0YWNrID0gZ2V0U3RhY2sgPyBnZXRTdGFjaygpIDogJyc7XG5cbiAgICAgICAgICB3YXJuaW5nKGZhbHNlLCAnRmFpbGVkICVzIHR5cGU6ICVzJXMnLCBsb2NhdGlvbiwgZXJyb3IubWVzc2FnZSwgc3RhY2sgIT0gbnVsbCA/IHN0YWNrIDogJycpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY2hlY2tQcm9wVHlwZXM7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9jaGVja1Byb3BUeXBlcy5qc1xuLy8gbW9kdWxlIGlkID0gNDY1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVtcHR5RnVuY3Rpb24gPSByZXF1aXJlKCdmYmpzL2xpYi9lbXB0eUZ1bmN0aW9uJyk7XG52YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnZmJqcy9saWIvaW52YXJpYW50Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIC8vIEltcG9ydGFudCFcbiAgLy8gS2VlcCB0aGlzIGxpc3QgaW4gc3luYyB3aXRoIHByb2R1Y3Rpb24gdmVyc2lvbiBpbiBgLi9mYWN0b3J5V2l0aFR5cGVDaGVja2Vycy5qc2AuXG4gIGZ1bmN0aW9uIHNoaW0oKSB7XG4gICAgaW52YXJpYW50KFxuICAgICAgZmFsc2UsXG4gICAgICAnQ2FsbGluZyBQcm9wVHlwZXMgdmFsaWRhdG9ycyBkaXJlY3RseSBpcyBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBgcHJvcC10eXBlc2AgcGFja2FnZS4gJyArXG4gICAgICAnVXNlIFByb3BUeXBlcy5jaGVja1Byb3BUeXBlcygpIHRvIGNhbGwgdGhlbS4gJyArXG4gICAgICAnUmVhZCBtb3JlIGF0IGh0dHA6Ly9mYi5tZS91c2UtY2hlY2stcHJvcC10eXBlcydcbiAgICApO1xuICB9O1xuICBzaGltLmlzUmVxdWlyZWQgPSBzaGltO1xuICBmdW5jdGlvbiBnZXRTaGltKCkge1xuICAgIHJldHVybiBzaGltO1xuICB9O1xuICB2YXIgUmVhY3RQcm9wVHlwZXMgPSB7XG4gICAgYXJyYXk6IHNoaW0sXG4gICAgYm9vbDogc2hpbSxcbiAgICBmdW5jOiBzaGltLFxuICAgIG51bWJlcjogc2hpbSxcbiAgICBvYmplY3Q6IHNoaW0sXG4gICAgc3RyaW5nOiBzaGltLFxuICAgIHN5bWJvbDogc2hpbSxcblxuICAgIGFueTogc2hpbSxcbiAgICBhcnJheU9mOiBnZXRTaGltLFxuICAgIGVsZW1lbnQ6IHNoaW0sXG4gICAgaW5zdGFuY2VPZjogZ2V0U2hpbSxcbiAgICBub2RlOiBzaGltLFxuICAgIG9iamVjdE9mOiBnZXRTaGltLFxuICAgIG9uZU9mOiBnZXRTaGltLFxuICAgIG9uZU9mVHlwZTogZ2V0U2hpbSxcbiAgICBzaGFwZTogZ2V0U2hpbVxuICB9O1xuXG4gIFJlYWN0UHJvcFR5cGVzLmNoZWNrUHJvcFR5cGVzID0gZW1wdHlGdW5jdGlvbjtcbiAgUmVhY3RQcm9wVHlwZXMuUHJvcFR5cGVzID0gUmVhY3RQcm9wVHlwZXM7XG5cbiAgcmV0dXJuIFJlYWN0UHJvcFR5cGVzO1xufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL2ZhY3RvcnlXaXRoVGhyb3dpbmdTaGltcy5qc1xuLy8gbW9kdWxlIGlkID0gNDY2XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVtcHR5RnVuY3Rpb24gPSByZXF1aXJlKCdmYmpzL2xpYi9lbXB0eUZ1bmN0aW9uJyk7XG52YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnZmJqcy9saWIvaW52YXJpYW50Jyk7XG52YXIgd2FybmluZyA9IHJlcXVpcmUoJ2ZianMvbGliL3dhcm5pbmcnKTtcblxudmFyIFJlYWN0UHJvcFR5cGVzU2VjcmV0ID0gcmVxdWlyZSgnLi9saWIvUmVhY3RQcm9wVHlwZXNTZWNyZXQnKTtcbnZhciBjaGVja1Byb3BUeXBlcyA9IHJlcXVpcmUoJy4vY2hlY2tQcm9wVHlwZXMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpc1ZhbGlkRWxlbWVudCwgdGhyb3dPbkRpcmVjdEFjY2Vzcykge1xuICAvKiBnbG9iYWwgU3ltYm9sICovXG4gIHZhciBJVEVSQVRPUl9TWU1CT0wgPSB0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIFN5bWJvbC5pdGVyYXRvcjtcbiAgdmFyIEZBVVhfSVRFUkFUT1JfU1lNQk9MID0gJ0BAaXRlcmF0b3InOyAvLyBCZWZvcmUgU3ltYm9sIHNwZWMuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGl0ZXJhdG9yIG1ldGhvZCBmdW5jdGlvbiBjb250YWluZWQgb24gdGhlIGl0ZXJhYmxlIG9iamVjdC5cbiAgICpcbiAgICogQmUgc3VyZSB0byBpbnZva2UgdGhlIGZ1bmN0aW9uIHdpdGggdGhlIGl0ZXJhYmxlIGFzIGNvbnRleHQ6XG4gICAqXG4gICAqICAgICB2YXIgaXRlcmF0b3JGbiA9IGdldEl0ZXJhdG9yRm4obXlJdGVyYWJsZSk7XG4gICAqICAgICBpZiAoaXRlcmF0b3JGbikge1xuICAgKiAgICAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYXRvckZuLmNhbGwobXlJdGVyYWJsZSk7XG4gICAqICAgICAgIC4uLlxuICAgKiAgICAgfVxuICAgKlxuICAgKiBAcGFyYW0gez9vYmplY3R9IG1heWJlSXRlcmFibGVcbiAgICogQHJldHVybiB7P2Z1bmN0aW9ufVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0SXRlcmF0b3JGbihtYXliZUl0ZXJhYmxlKSB7XG4gICAgdmFyIGl0ZXJhdG9yRm4gPSBtYXliZUl0ZXJhYmxlICYmIChJVEVSQVRPUl9TWU1CT0wgJiYgbWF5YmVJdGVyYWJsZVtJVEVSQVRPUl9TWU1CT0xdIHx8IG1heWJlSXRlcmFibGVbRkFVWF9JVEVSQVRPUl9TWU1CT0xdKTtcbiAgICBpZiAodHlwZW9mIGl0ZXJhdG9yRm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBpdGVyYXRvckZuO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb2xsZWN0aW9uIG9mIG1ldGhvZHMgdGhhdCBhbGxvdyBkZWNsYXJhdGlvbiBhbmQgdmFsaWRhdGlvbiBvZiBwcm9wcyB0aGF0IGFyZVxuICAgKiBzdXBwbGllZCB0byBSZWFjdCBjb21wb25lbnRzLiBFeGFtcGxlIHVzYWdlOlxuICAgKlxuICAgKiAgIHZhciBQcm9wcyA9IHJlcXVpcmUoJ1JlYWN0UHJvcFR5cGVzJyk7XG4gICAqICAgdmFyIE15QXJ0aWNsZSA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcbiAgICogICAgIHByb3BUeXBlczoge1xuICAgKiAgICAgICAvLyBBbiBvcHRpb25hbCBzdHJpbmcgcHJvcCBuYW1lZCBcImRlc2NyaXB0aW9uXCIuXG4gICAqICAgICAgIGRlc2NyaXB0aW9uOiBQcm9wcy5zdHJpbmcsXG4gICAqXG4gICAqICAgICAgIC8vIEEgcmVxdWlyZWQgZW51bSBwcm9wIG5hbWVkIFwiY2F0ZWdvcnlcIi5cbiAgICogICAgICAgY2F0ZWdvcnk6IFByb3BzLm9uZU9mKFsnTmV3cycsJ1Bob3RvcyddKS5pc1JlcXVpcmVkLFxuICAgKlxuICAgKiAgICAgICAvLyBBIHByb3AgbmFtZWQgXCJkaWFsb2dcIiB0aGF0IHJlcXVpcmVzIGFuIGluc3RhbmNlIG9mIERpYWxvZy5cbiAgICogICAgICAgZGlhbG9nOiBQcm9wcy5pbnN0YW5jZU9mKERpYWxvZykuaXNSZXF1aXJlZFxuICAgKiAgICAgfSxcbiAgICogICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7IC4uLiB9XG4gICAqICAgfSk7XG4gICAqXG4gICAqIEEgbW9yZSBmb3JtYWwgc3BlY2lmaWNhdGlvbiBvZiBob3cgdGhlc2UgbWV0aG9kcyBhcmUgdXNlZDpcbiAgICpcbiAgICogICB0eXBlIDo9IGFycmF5fGJvb2x8ZnVuY3xvYmplY3R8bnVtYmVyfHN0cmluZ3xvbmVPZihbLi4uXSl8aW5zdGFuY2VPZiguLi4pXG4gICAqICAgZGVjbCA6PSBSZWFjdFByb3BUeXBlcy57dHlwZX0oLmlzUmVxdWlyZWQpP1xuICAgKlxuICAgKiBFYWNoIGFuZCBldmVyeSBkZWNsYXJhdGlvbiBwcm9kdWNlcyBhIGZ1bmN0aW9uIHdpdGggdGhlIHNhbWUgc2lnbmF0dXJlLiBUaGlzXG4gICAqIGFsbG93cyB0aGUgY3JlYXRpb24gb2YgY3VzdG9tIHZhbGlkYXRpb24gZnVuY3Rpb25zLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogIHZhciBNeUxpbmsgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG4gICAqICAgIHByb3BUeXBlczoge1xuICAgKiAgICAgIC8vIEFuIG9wdGlvbmFsIHN0cmluZyBvciBVUkkgcHJvcCBuYW1lZCBcImhyZWZcIi5cbiAgICogICAgICBocmVmOiBmdW5jdGlvbihwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUpIHtcbiAgICogICAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAqICAgICAgICBpZiAocHJvcFZhbHVlICE9IG51bGwgJiYgdHlwZW9mIHByb3BWYWx1ZSAhPT0gJ3N0cmluZycgJiZcbiAgICogICAgICAgICAgICAhKHByb3BWYWx1ZSBpbnN0YW5jZW9mIFVSSSkpIHtcbiAgICogICAgICAgICAgcmV0dXJuIG5ldyBFcnJvcihcbiAgICogICAgICAgICAgICAnRXhwZWN0ZWQgYSBzdHJpbmcgb3IgYW4gVVJJIGZvciAnICsgcHJvcE5hbWUgKyAnIGluICcgK1xuICAgKiAgICAgICAgICAgIGNvbXBvbmVudE5hbWVcbiAgICogICAgICAgICAgKTtcbiAgICogICAgICAgIH1cbiAgICogICAgICB9XG4gICAqICAgIH0sXG4gICAqICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7Li4ufVxuICAgKiAgfSk7XG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cblxuICB2YXIgQU5PTllNT1VTID0gJzw8YW5vbnltb3VzPj4nO1xuXG4gIC8vIEltcG9ydGFudCFcbiAgLy8gS2VlcCB0aGlzIGxpc3QgaW4gc3luYyB3aXRoIHByb2R1Y3Rpb24gdmVyc2lvbiBpbiBgLi9mYWN0b3J5V2l0aFRocm93aW5nU2hpbXMuanNgLlxuICB2YXIgUmVhY3RQcm9wVHlwZXMgPSB7XG4gICAgYXJyYXk6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdhcnJheScpLFxuICAgIGJvb2w6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdib29sZWFuJyksXG4gICAgZnVuYzogY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXIoJ2Z1bmN0aW9uJyksXG4gICAgbnVtYmVyOiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignbnVtYmVyJyksXG4gICAgb2JqZWN0OiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignb2JqZWN0JyksXG4gICAgc3RyaW5nOiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignc3RyaW5nJyksXG4gICAgc3ltYm9sOiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignc3ltYm9sJyksXG5cbiAgICBhbnk6IGNyZWF0ZUFueVR5cGVDaGVja2VyKCksXG4gICAgYXJyYXlPZjogY3JlYXRlQXJyYXlPZlR5cGVDaGVja2VyLFxuICAgIGVsZW1lbnQ6IGNyZWF0ZUVsZW1lbnRUeXBlQ2hlY2tlcigpLFxuICAgIGluc3RhbmNlT2Y6IGNyZWF0ZUluc3RhbmNlVHlwZUNoZWNrZXIsXG4gICAgbm9kZTogY3JlYXRlTm9kZUNoZWNrZXIoKSxcbiAgICBvYmplY3RPZjogY3JlYXRlT2JqZWN0T2ZUeXBlQ2hlY2tlcixcbiAgICBvbmVPZjogY3JlYXRlRW51bVR5cGVDaGVja2VyLFxuICAgIG9uZU9mVHlwZTogY3JlYXRlVW5pb25UeXBlQ2hlY2tlcixcbiAgICBzaGFwZTogY3JlYXRlU2hhcGVUeXBlQ2hlY2tlclxuICB9O1xuXG4gIC8qKlxuICAgKiBpbmxpbmVkIE9iamVjdC5pcyBwb2x5ZmlsbCB0byBhdm9pZCByZXF1aXJpbmcgY29uc3VtZXJzIHNoaXAgdGhlaXIgb3duXG4gICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL09iamVjdC9pc1xuICAgKi9cbiAgLyplc2xpbnQtZGlzYWJsZSBuby1zZWxmLWNvbXBhcmUqL1xuICBmdW5jdGlvbiBpcyh4LCB5KSB7XG4gICAgLy8gU2FtZVZhbHVlIGFsZ29yaXRobVxuICAgIGlmICh4ID09PSB5KSB7XG4gICAgICAvLyBTdGVwcyAxLTUsIDctMTBcbiAgICAgIC8vIFN0ZXBzIDYuYi02LmU6ICswICE9IC0wXG4gICAgICByZXR1cm4geCAhPT0gMCB8fCAxIC8geCA9PT0gMSAvIHk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFN0ZXAgNi5hOiBOYU4gPT0gTmFOXG4gICAgICByZXR1cm4geCAhPT0geCAmJiB5ICE9PSB5O1xuICAgIH1cbiAgfVxuICAvKmVzbGludC1lbmFibGUgbm8tc2VsZi1jb21wYXJlKi9cblxuICAvKipcbiAgICogV2UgdXNlIGFuIEVycm9yLWxpa2Ugb2JqZWN0IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IGFzIHBlb3BsZSBtYXkgY2FsbFxuICAgKiBQcm9wVHlwZXMgZGlyZWN0bHkgYW5kIGluc3BlY3QgdGhlaXIgb3V0cHV0LiBIb3dldmVyLCB3ZSBkb24ndCB1c2UgcmVhbFxuICAgKiBFcnJvcnMgYW55bW9yZS4gV2UgZG9uJ3QgaW5zcGVjdCB0aGVpciBzdGFjayBhbnl3YXksIGFuZCBjcmVhdGluZyB0aGVtXG4gICAqIGlzIHByb2hpYml0aXZlbHkgZXhwZW5zaXZlIGlmIHRoZXkgYXJlIGNyZWF0ZWQgdG9vIG9mdGVuLCBzdWNoIGFzIHdoYXRcbiAgICogaGFwcGVucyBpbiBvbmVPZlR5cGUoKSBmb3IgYW55IHR5cGUgYmVmb3JlIHRoZSBvbmUgdGhhdCBtYXRjaGVkLlxuICAgKi9cbiAgZnVuY3Rpb24gUHJvcFR5cGVFcnJvcihtZXNzYWdlKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICB0aGlzLnN0YWNrID0gJyc7XG4gIH1cbiAgLy8gTWFrZSBgaW5zdGFuY2VvZiBFcnJvcmAgc3RpbGwgd29yayBmb3IgcmV0dXJuZWQgZXJyb3JzLlxuICBQcm9wVHlwZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuICBmdW5jdGlvbiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSkge1xuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgICB2YXIgbWFudWFsUHJvcFR5cGVDYWxsQ2FjaGUgPSB7fTtcbiAgICAgIHZhciBtYW51YWxQcm9wVHlwZVdhcm5pbmdDb3VudCA9IDA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNoZWNrVHlwZShpc1JlcXVpcmVkLCBwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUsIHNlY3JldCkge1xuICAgICAgY29tcG9uZW50TmFtZSA9IGNvbXBvbmVudE5hbWUgfHwgQU5PTllNT1VTO1xuICAgICAgcHJvcEZ1bGxOYW1lID0gcHJvcEZ1bGxOYW1lIHx8IHByb3BOYW1lO1xuXG4gICAgICBpZiAoc2VjcmV0ICE9PSBSZWFjdFByb3BUeXBlc1NlY3JldCkge1xuICAgICAgICBpZiAodGhyb3dPbkRpcmVjdEFjY2Vzcykge1xuICAgICAgICAgIC8vIE5ldyBiZWhhdmlvciBvbmx5IGZvciB1c2VycyBvZiBgcHJvcC10eXBlc2AgcGFja2FnZVxuICAgICAgICAgIGludmFyaWFudChcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgJ0NhbGxpbmcgUHJvcFR5cGVzIHZhbGlkYXRvcnMgZGlyZWN0bHkgaXMgbm90IHN1cHBvcnRlZCBieSB0aGUgYHByb3AtdHlwZXNgIHBhY2thZ2UuICcgK1xuICAgICAgICAgICAgJ1VzZSBgUHJvcFR5cGVzLmNoZWNrUHJvcFR5cGVzKClgIHRvIGNhbGwgdGhlbS4gJyArXG4gICAgICAgICAgICAnUmVhZCBtb3JlIGF0IGh0dHA6Ly9mYi5tZS91c2UtY2hlY2stcHJvcC10eXBlcydcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgLy8gT2xkIGJlaGF2aW9yIGZvciBwZW9wbGUgdXNpbmcgUmVhY3QuUHJvcFR5cGVzXG4gICAgICAgICAgdmFyIGNhY2hlS2V5ID0gY29tcG9uZW50TmFtZSArICc6JyArIHByb3BOYW1lO1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICFtYW51YWxQcm9wVHlwZUNhbGxDYWNoZVtjYWNoZUtleV0gJiZcbiAgICAgICAgICAgIC8vIEF2b2lkIHNwYW1taW5nIHRoZSBjb25zb2xlIGJlY2F1c2UgdGhleSBhcmUgb2Z0ZW4gbm90IGFjdGlvbmFibGUgZXhjZXB0IGZvciBsaWIgYXV0aG9yc1xuICAgICAgICAgICAgbWFudWFsUHJvcFR5cGVXYXJuaW5nQ291bnQgPCAzXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICB3YXJuaW5nKFxuICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgJ1lvdSBhcmUgbWFudWFsbHkgY2FsbGluZyBhIFJlYWN0LlByb3BUeXBlcyB2YWxpZGF0aW9uICcgK1xuICAgICAgICAgICAgICAnZnVuY3Rpb24gZm9yIHRoZSBgJXNgIHByb3Agb24gYCVzYC4gVGhpcyBpcyBkZXByZWNhdGVkICcgK1xuICAgICAgICAgICAgICAnYW5kIHdpbGwgdGhyb3cgaW4gdGhlIHN0YW5kYWxvbmUgYHByb3AtdHlwZXNgIHBhY2thZ2UuICcgK1xuICAgICAgICAgICAgICAnWW91IG1heSBiZSBzZWVpbmcgdGhpcyB3YXJuaW5nIGR1ZSB0byBhIHRoaXJkLXBhcnR5IFByb3BUeXBlcyAnICtcbiAgICAgICAgICAgICAgJ2xpYnJhcnkuIFNlZSBodHRwczovL2ZiLm1lL3JlYWN0LXdhcm5pbmctZG9udC1jYWxsLXByb3B0eXBlcyAnICsgJ2ZvciBkZXRhaWxzLicsXG4gICAgICAgICAgICAgIHByb3BGdWxsTmFtZSxcbiAgICAgICAgICAgICAgY29tcG9uZW50TmFtZVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIG1hbnVhbFByb3BUeXBlQ2FsbENhY2hlW2NhY2hlS2V5XSA9IHRydWU7XG4gICAgICAgICAgICBtYW51YWxQcm9wVHlwZVdhcm5pbmdDb3VudCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHByb3BzW3Byb3BOYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIGlmIChpc1JlcXVpcmVkKSB7XG4gICAgICAgICAgaWYgKHByb3BzW3Byb3BOYW1lXSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdUaGUgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIGlzIG1hcmtlZCBhcyByZXF1aXJlZCAnICsgKCdpbiBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgYnV0IGl0cyB2YWx1ZSBpcyBgbnVsbGAuJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ1RoZSAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2AgaXMgbWFya2VkIGFzIHJlcXVpcmVkIGluICcgKyAoJ2AnICsgY29tcG9uZW50TmFtZSArICdgLCBidXQgaXRzIHZhbHVlIGlzIGB1bmRlZmluZWRgLicpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBjaGFpbmVkQ2hlY2tUeXBlID0gY2hlY2tUeXBlLmJpbmQobnVsbCwgZmFsc2UpO1xuICAgIGNoYWluZWRDaGVja1R5cGUuaXNSZXF1aXJlZCA9IGNoZWNrVHlwZS5iaW5kKG51bGwsIHRydWUpO1xuXG4gICAgcmV0dXJuIGNoYWluZWRDaGVja1R5cGU7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcihleHBlY3RlZFR5cGUpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUsIHNlY3JldCkge1xuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgICBpZiAocHJvcFR5cGUgIT09IGV4cGVjdGVkVHlwZSkge1xuICAgICAgICAvLyBgcHJvcFZhbHVlYCBiZWluZyBpbnN0YW5jZSBvZiwgc2F5LCBkYXRlL3JlZ2V4cCwgcGFzcyB0aGUgJ29iamVjdCdcbiAgICAgICAgLy8gY2hlY2ssIGJ1dCB3ZSBjYW4gb2ZmZXIgYSBtb3JlIHByZWNpc2UgZXJyb3IgbWVzc2FnZSBoZXJlIHJhdGhlciB0aGFuXG4gICAgICAgIC8vICdvZiB0eXBlIGBvYmplY3RgJy5cbiAgICAgICAgdmFyIHByZWNpc2VUeXBlID0gZ2V0UHJlY2lzZVR5cGUocHJvcFZhbHVlKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHR5cGUgJyArICgnYCcgKyBwcmVjaXNlVHlwZSArICdgIHN1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCAnKSArICgnYCcgKyBleHBlY3RlZFR5cGUgKyAnYC4nKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUFueVR5cGVDaGVja2VyKCkge1xuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcihlbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zTnVsbCk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVBcnJheU9mVHlwZUNoZWNrZXIodHlwZUNoZWNrZXIpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIGlmICh0eXBlb2YgdHlwZUNoZWNrZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdQcm9wZXJ0eSBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIGNvbXBvbmVudCBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCBoYXMgaW52YWxpZCBQcm9wVHlwZSBub3RhdGlvbiBpbnNpZGUgYXJyYXlPZi4nKTtcbiAgICAgIH1cbiAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvcFZhbHVlKSkge1xuICAgICAgICB2YXIgcHJvcFR5cGUgPSBnZXRQcm9wVHlwZShwcm9wVmFsdWUpO1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHR5cGUgJyArICgnYCcgKyBwcm9wVHlwZSArICdgIHN1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCBhbiBhcnJheS4nKSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BWYWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZXJyb3IgPSB0eXBlQ2hlY2tlcihwcm9wVmFsdWUsIGksIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUgKyAnWycgKyBpICsgJ10nLCBSZWFjdFByb3BUeXBlc1NlY3JldCk7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnRUeXBlQ2hlY2tlcigpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgICBpZiAoIWlzVmFsaWRFbGVtZW50KHByb3BWYWx1ZSkpIHtcbiAgICAgICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiB0eXBlICcgKyAoJ2AnICsgcHJvcFR5cGUgKyAnYCBzdXBwbGllZCB0byBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgYSBzaW5nbGUgUmVhY3RFbGVtZW50LicpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlSW5zdGFuY2VUeXBlQ2hlY2tlcihleHBlY3RlZENsYXNzKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICBpZiAoIShwcm9wc1twcm9wTmFtZV0gaW5zdGFuY2VvZiBleHBlY3RlZENsYXNzKSkge1xuICAgICAgICB2YXIgZXhwZWN0ZWRDbGFzc05hbWUgPSBleHBlY3RlZENsYXNzLm5hbWUgfHwgQU5PTllNT1VTO1xuICAgICAgICB2YXIgYWN0dWFsQ2xhc3NOYW1lID0gZ2V0Q2xhc3NOYW1lKHByb3BzW3Byb3BOYW1lXSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSAnICsgKCdgJyArIGFjdHVhbENsYXNzTmFtZSArICdgIHN1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCAnKSArICgnaW5zdGFuY2Ugb2YgYCcgKyBleHBlY3RlZENsYXNzTmFtZSArICdgLicpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRW51bVR5cGVDaGVja2VyKGV4cGVjdGVkVmFsdWVzKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGV4cGVjdGVkVmFsdWVzKSkge1xuICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IHdhcm5pbmcoZmFsc2UsICdJbnZhbGlkIGFyZ3VtZW50IHN1cHBsaWVkIHRvIG9uZU9mLCBleHBlY3RlZCBhbiBpbnN0YW5jZSBvZiBhcnJheS4nKSA6IHZvaWQgMDtcbiAgICAgIHJldHVybiBlbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zTnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV4cGVjdGVkVmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpcyhwcm9wVmFsdWUsIGV4cGVjdGVkVmFsdWVzW2ldKSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZXNTdHJpbmcgPSBKU09OLnN0cmluZ2lmeShleHBlY3RlZFZhbHVlcyk7XG4gICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHZhbHVlIGAnICsgcHJvcFZhbHVlICsgJ2AgJyArICgnc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIG9uZSBvZiAnICsgdmFsdWVzU3RyaW5nICsgJy4nKSk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVPYmplY3RPZlR5cGVDaGVja2VyKHR5cGVDaGVja2VyKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICBpZiAodHlwZW9mIHR5cGVDaGVja2VyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignUHJvcGVydHkgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiBjb21wb25lbnQgYCcgKyBjb21wb25lbnROYW1lICsgJ2AgaGFzIGludmFsaWQgUHJvcFR5cGUgbm90YXRpb24gaW5zaWRlIG9iamVjdE9mLicpO1xuICAgICAgfVxuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgICBpZiAocHJvcFR5cGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSAnICsgKCdgJyArIHByb3BUeXBlICsgJ2Agc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIGFuIG9iamVjdC4nKSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBrZXkgaW4gcHJvcFZhbHVlKSB7XG4gICAgICAgIGlmIChwcm9wVmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIHZhciBlcnJvciA9IHR5cGVDaGVja2VyKHByb3BWYWx1ZSwga2V5LCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lICsgJy4nICsga2V5LCBSZWFjdFByb3BUeXBlc1NlY3JldCk7XG4gICAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlVW5pb25UeXBlQ2hlY2tlcihhcnJheU9mVHlwZUNoZWNrZXJzKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGFycmF5T2ZUeXBlQ2hlY2tlcnMpKSB7XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gd2FybmluZyhmYWxzZSwgJ0ludmFsaWQgYXJndW1lbnQgc3VwcGxpZWQgdG8gb25lT2ZUeXBlLCBleHBlY3RlZCBhbiBpbnN0YW5jZSBvZiBhcnJheS4nKSA6IHZvaWQgMDtcbiAgICAgIHJldHVybiBlbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zTnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXlPZlR5cGVDaGVja2Vycy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hlY2tlciA9IGFycmF5T2ZUeXBlQ2hlY2tlcnNbaV07XG4gICAgICAgIGlmIChjaGVja2VyKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSwgUmVhY3RQcm9wVHlwZXNTZWNyZXQpID09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIHN1cHBsaWVkIHRvICcgKyAoJ2AnICsgY29tcG9uZW50TmFtZSArICdgLicpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU5vZGVDaGVja2VyKCkge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgaWYgKCFpc05vZGUocHJvcHNbcHJvcE5hbWVdKSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIHN1cHBsaWVkIHRvICcgKyAoJ2AnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCBhIFJlYWN0Tm9kZS4nKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVNoYXBlVHlwZUNoZWNrZXIoc2hhcGVUeXBlcykge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgICBpZiAocHJvcFR5cGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSBgJyArIHByb3BUeXBlICsgJ2AgJyArICgnc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIGBvYmplY3RgLicpKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGtleSBpbiBzaGFwZVR5cGVzKSB7XG4gICAgICAgIHZhciBjaGVja2VyID0gc2hhcGVUeXBlc1trZXldO1xuICAgICAgICBpZiAoIWNoZWNrZXIpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXJyb3IgPSBjaGVja2VyKHByb3BWYWx1ZSwga2V5LCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lICsgJy4nICsga2V5LCBSZWFjdFByb3BUeXBlc1NlY3JldCk7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc05vZGUocHJvcFZhbHVlKSB7XG4gICAgc3dpdGNoICh0eXBlb2YgcHJvcFZhbHVlKSB7XG4gICAgICBjYXNlICdudW1iZXInOlxuICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgIGNhc2UgJ3VuZGVmaW5lZCc6XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgIHJldHVybiAhcHJvcFZhbHVlO1xuICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocHJvcFZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiBwcm9wVmFsdWUuZXZlcnkoaXNOb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvcFZhbHVlID09PSBudWxsIHx8IGlzVmFsaWRFbGVtZW50KHByb3BWYWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpdGVyYXRvckZuID0gZ2V0SXRlcmF0b3JGbihwcm9wVmFsdWUpO1xuICAgICAgICBpZiAoaXRlcmF0b3JGbikge1xuICAgICAgICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhdG9yRm4uY2FsbChwcm9wVmFsdWUpO1xuICAgICAgICAgIHZhciBzdGVwO1xuICAgICAgICAgIGlmIChpdGVyYXRvckZuICE9PSBwcm9wVmFsdWUuZW50cmllcykge1xuICAgICAgICAgICAgd2hpbGUgKCEoc3RlcCA9IGl0ZXJhdG9yLm5leHQoKSkuZG9uZSkge1xuICAgICAgICAgICAgICBpZiAoIWlzTm9kZShzdGVwLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJdGVyYXRvciB3aWxsIHByb3ZpZGUgZW50cnkgW2ssdl0gdHVwbGVzIHJhdGhlciB0aGFuIHZhbHVlcy5cbiAgICAgICAgICAgIHdoaWxlICghKHN0ZXAgPSBpdGVyYXRvci5uZXh0KCkpLmRvbmUpIHtcbiAgICAgICAgICAgICAgdmFyIGVudHJ5ID0gc3RlcC52YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpc05vZGUoZW50cnlbMV0pKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGlzU3ltYm9sKHByb3BUeXBlLCBwcm9wVmFsdWUpIHtcbiAgICAvLyBOYXRpdmUgU3ltYm9sLlxuICAgIGlmIChwcm9wVHlwZSA9PT0gJ3N5bWJvbCcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIDE5LjQuMy41IFN5bWJvbC5wcm90b3R5cGVbQEB0b1N0cmluZ1RhZ10gPT09ICdTeW1ib2wnXG4gICAgaWYgKHByb3BWYWx1ZVsnQEB0b1N0cmluZ1RhZyddID09PSAnU3ltYm9sJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRmFsbGJhY2sgZm9yIG5vbi1zcGVjIGNvbXBsaWFudCBTeW1ib2xzIHdoaWNoIGFyZSBwb2x5ZmlsbGVkLlxuICAgIGlmICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIHByb3BWYWx1ZSBpbnN0YW5jZW9mIFN5bWJvbCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gRXF1aXZhbGVudCBvZiBgdHlwZW9mYCBidXQgd2l0aCBzcGVjaWFsIGhhbmRsaW5nIGZvciBhcnJheSBhbmQgcmVnZXhwLlxuICBmdW5jdGlvbiBnZXRQcm9wVHlwZShwcm9wVmFsdWUpIHtcbiAgICB2YXIgcHJvcFR5cGUgPSB0eXBlb2YgcHJvcFZhbHVlO1xuICAgIGlmIChBcnJheS5pc0FycmF5KHByb3BWYWx1ZSkpIHtcbiAgICAgIHJldHVybiAnYXJyYXknO1xuICAgIH1cbiAgICBpZiAocHJvcFZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAvLyBPbGQgd2Via2l0cyAoYXQgbGVhc3QgdW50aWwgQW5kcm9pZCA0LjApIHJldHVybiAnZnVuY3Rpb24nIHJhdGhlciB0aGFuXG4gICAgICAvLyAnb2JqZWN0JyBmb3IgdHlwZW9mIGEgUmVnRXhwLiBXZSdsbCBub3JtYWxpemUgdGhpcyBoZXJlIHNvIHRoYXQgL2JsYS9cbiAgICAgIC8vIHBhc3NlcyBQcm9wVHlwZXMub2JqZWN0LlxuICAgICAgcmV0dXJuICdvYmplY3QnO1xuICAgIH1cbiAgICBpZiAoaXNTeW1ib2wocHJvcFR5cGUsIHByb3BWYWx1ZSkpIHtcbiAgICAgIHJldHVybiAnc3ltYm9sJztcbiAgICB9XG4gICAgcmV0dXJuIHByb3BUeXBlO1xuICB9XG5cbiAgLy8gVGhpcyBoYW5kbGVzIG1vcmUgdHlwZXMgdGhhbiBgZ2V0UHJvcFR5cGVgLiBPbmx5IHVzZWQgZm9yIGVycm9yIG1lc3NhZ2VzLlxuICAvLyBTZWUgYGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyYC5cbiAgZnVuY3Rpb24gZ2V0UHJlY2lzZVR5cGUocHJvcFZhbHVlKSB7XG4gICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICBpZiAocHJvcFR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAocHJvcFZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICByZXR1cm4gJ2RhdGUnO1xuICAgICAgfSBlbHNlIGlmIChwcm9wVmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgcmV0dXJuICdyZWdleHAnO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcHJvcFR5cGU7XG4gIH1cblxuICAvLyBSZXR1cm5zIGNsYXNzIG5hbWUgb2YgdGhlIG9iamVjdCwgaWYgYW55LlxuICBmdW5jdGlvbiBnZXRDbGFzc05hbWUocHJvcFZhbHVlKSB7XG4gICAgaWYgKCFwcm9wVmFsdWUuY29uc3RydWN0b3IgfHwgIXByb3BWYWx1ZS5jb25zdHJ1Y3Rvci5uYW1lKSB7XG4gICAgICByZXR1cm4gQU5PTllNT1VTO1xuICAgIH1cbiAgICByZXR1cm4gcHJvcFZhbHVlLmNvbnN0cnVjdG9yLm5hbWU7XG4gIH1cblxuICBSZWFjdFByb3BUeXBlcy5jaGVja1Byb3BUeXBlcyA9IGNoZWNrUHJvcFR5cGVzO1xuICBSZWFjdFByb3BUeXBlcy5Qcm9wVHlwZXMgPSBSZWFjdFByb3BUeXBlcztcblxuICByZXR1cm4gUmVhY3RQcm9wVHlwZXM7XG59O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3Byb3AtdHlwZXMvZmFjdG9yeVdpdGhUeXBlQ2hlY2tlcnMuanNcbi8vIG1vZHVsZSBpZCA9IDQ2N1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJ2YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmICghc2VsZikgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIGNhbGwgJiYgKHR5cGVvZiBjYWxsID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpID8gY2FsbCA6IHNlbGY7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgXCIgKyB0eXBlb2Ygc3VwZXJDbGFzcyk7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcykgOiBzdWJDbGFzcy5fX3Byb3RvX18gPSBzdXBlckNsYXNzOyB9XG5cbi8qKlxuICogQG1vZHVsZSBjb21wb25lbnRXcmFwcGVyXG4gKlxuICovXG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuXG5pbXBvcnQgc3RvcmUgZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHsgb25Nb3VudCwgb25Vbm1vdW50IH0gZnJvbSAnLi4vZXZlbnRfaGFuZGxlcnMnO1xuXG4vKipcbiAqIGNvbXBvbmVudFdyYXBwZXJcbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtvYmplY3R9IFdyYXBwZWRDb21wb25lbnQgUmVhY3QgY29tcG9uZW50IGNsYXNzIHRvIGJlIHdyYXBwZWRcbiAqIEBwYXJhbSB7YXJyYXl9IFtrZXlzXSBUaGUga2V5KHMpIGJvdW5kIHRvIHRoZSBjbGFzc1xuICogQHJldHVybiB7b2JqZWN0fSBUaGUgaGlnaGVyLW9yZGVyIGZ1bmN0aW9uIHRoYXQgd3JhcHMgdGhlIGRlY29yYXRlZCBjbGFzc1xuICovXG5mdW5jdGlvbiBjb21wb25lbnRXcmFwcGVyKFdyYXBwZWRDb21wb25lbnQpIHtcbiAgdmFyIGtleXMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IG51bGw7XG5cbiAgdmFyIEtleUJvYXJkSGVscGVyID0gZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgICBfaW5oZXJpdHMoS2V5Qm9hcmRIZWxwZXIsIF9SZWFjdCRDb21wb25lbnQpO1xuXG4gICAgZnVuY3Rpb24gS2V5Qm9hcmRIZWxwZXIocHJvcHMpIHtcbiAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBLZXlCb2FyZEhlbHBlcik7XG5cbiAgICAgIHZhciBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIChLZXlCb2FyZEhlbHBlci5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKEtleUJvYXJkSGVscGVyKSkuY2FsbCh0aGlzLCBwcm9wcykpO1xuXG4gICAgICBfdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgZXZlbnQ6IG51bGxcbiAgICAgIH07XG4gICAgICByZXR1cm4gX3RoaXM7XG4gICAgfVxuXG4gICAgX2NyZWF0ZUNsYXNzKEtleUJvYXJkSGVscGVyLCBbe1xuICAgICAga2V5OiAnY29tcG9uZW50RGlkTW91bnQnLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgICBvbk1vdW50KHRoaXMpO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogJ2NvbXBvbmVudFdpbGxVbm1vdW50JyxcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcbiAgICAgICAgb25Vbm1vdW50KHRoaXMpO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogJ2hhbmRsZUtleURvd24nLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGhhbmRsZUtleURvd24oZXZlbnQpIHtcbiAgICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICAgLy8gdG8gc2ltdWxhdGUgYSBrZXlwcmVzcywgc2V0IHRoZSBldmVudCBhbmQgdGhlbiBjbGVhciBpdCBpbiB0aGUgY2FsbGJhY2tcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IGV2ZW50OiBldmVudCB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMi5zZXRTdGF0ZSh7IGV2ZW50OiBudWxsIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdyZW5kZXInLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoV3JhcHBlZENvbXBvbmVudCwgX2V4dGVuZHMoe30sIHRoaXMucHJvcHMsIHsga2V5ZG93bjogdGhpcy5zdGF0ZSB9KSk7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIEtleUJvYXJkSGVscGVyO1xuICB9KFJlYWN0LkNvbXBvbmVudCk7XG5cbiAgc3RvcmUuc2V0QmluZGluZyh7IGtleXM6IGtleXMsIGZuOiBLZXlCb2FyZEhlbHBlci5wcm90b3R5cGUuaGFuZGxlS2V5RG93biwgdGFyZ2V0OiBLZXlCb2FyZEhlbHBlci5wcm90b3R5cGUgfSk7XG5cbiAgcmV0dXJuIEtleUJvYXJkSGVscGVyO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjb21wb25lbnRXcmFwcGVyO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvY2xhc3NfZGVjb3JhdG9yLmpzXG4vLyBtb2R1bGUgaWQgPSA1NTVcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwidmFyIF90eXBlb2YgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIiA/IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH0gOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9O1xuXG4vKipcbiAqIEBtb2R1bGUgZGVjb3JhdG9yc1xuICpcbiAqL1xuaW1wb3J0IGNsYXNzV3JhcHBlciBmcm9tICcuL2NsYXNzX2RlY29yYXRvcic7XG5pbXBvcnQgbWV0aG9kV3JhcHBlciBmcm9tICcuL21ldGhvZF9kZWNvcmF0b3InO1xuaW1wb3J0IG1ldGhvZFdyYXBwZXJTY29wZWQgZnJvbSAnLi9tZXRob2RfZGVjb3JhdG9yX3Njb3BlZCc7XG5cbi8qKlxuICogX2RlY29yYXRvclxuICpcbiAqIEBhY2Nlc3MgcHJpdmF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gbWV0aG9kRm4gVGhlIG1ldGhvZCB3cmFwcGVyIHRvIGRlbGVnYXRlIHRvLCBiYXNlZCBvbiB3aGV0aGVyIHVzZXIgaGFzIHNwZWNpZmllZCBhIHNjb3BlZCBkZWNvcmF0b3Igb3Igbm90XG4gKiBAcGFyYW0ge0FycmF5fSAuLi5hcmdzIFJlbWFpbmRlciBvZiBhcmd1bWVudHMgcGFzc2VkIGluXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIGRlY29yYXRlZCBjbGFzcyBvciBtZXRob2RcbiAqL1xuZnVuY3Rpb24gX2RlY29yYXRvcihtZXRob2RGbikge1xuICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4gPiAxID8gX2xlbiAtIDEgOiAwKSwgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICBhcmdzW19rZXkgLSAxXSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgfVxuXG4gIC8vIGNoZWNrIHRoZSBmaXJzdCBhcmd1bWVudCB0byBzZWUgaWYgaXQncyBhIHVzZXItc3VwcGxpZWQga2V5Y29kZSBvciBhcnJheVxuICAvLyBvZiBrZXljb2Rlcywgb3IgaWYgaXQncyB0aGUgd3JhcHBlZCBjbGFzcyBvciBtZXRob2RcbiAgdmFyIHRlc3RBcmcgPSBhcmdzWzBdO1xuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkodGVzdEFyZyk7XG5cbiAgLy8gaWYgdGhlIHRlc3QgYXJndW1lbnQgaXMgbm90IGFuIG9iamVjdCBvciBmdW5jdGlvbiwgaXQgaXMgdXNlci1zdXBwbGllZFxuICAvLyBrZXljb2Rlcy4gZWxzZSB0aGVyZSBhcmUgbm8gYXJndW1lbnRzIGFuZCBpdCdzIGp1c3QgdGhlIHdyYXBwZWQgY2xhc3NcbiAgLy8gKG1ldGhvZCBkZWNvcmF0b3JzIG11c3QgaGF2ZSBrZXljb2RlIGFyZ3VtZW50cykuXG4gIGlmIChpc0FycmF5IHx8IH5bJ3N0cmluZycsICdudW1iZXInXS5pbmRleE9mKHR5cGVvZiB0ZXN0QXJnID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih0ZXN0QXJnKSkpIHtcbiAgICB2YXIga2V5cyA9IGlzQXJyYXkgPyB0ZXN0QXJnIDogYXJncztcblxuICAgIC8vIHJldHVybiB0aGUgZGVjb3JhdG9yIGZ1bmN0aW9uLCB3aGljaCBvbiB0aGUgbmV4dCBjYWxsIHdpbGwgbG9vayBmb3JcbiAgICAvLyB0aGUgcHJlc2VuY2Ugb2YgYSBtZXRob2QgbmFtZSB0byBkZXRlcm1pbmUgaWYgdGhpcyBpcyBhIHdyYXBwZWQgbWV0aG9kXG4gICAgLy8gb3IgY29tcG9uZW50XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIG1ldGhvZE5hbWUsIGRlc2NyaXB0b3IpIHtcbiAgICAgIHJldHVybiBtZXRob2ROYW1lID8gbWV0aG9kRm4oeyB0YXJnZXQ6IHRhcmdldCwgZGVzY3JpcHRvcjogZGVzY3JpcHRvciwga2V5czoga2V5cyB9KSA6IGNsYXNzV3JhcHBlcih0YXJnZXQsIGtleXMpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgdmFyIG1ldGhvZE5hbWUgPSBhcmdzWzFdO1xuXG4gICAgLy8gbWV0aG9kIGRlY29yYXRvcnMgd2l0aG91dCBrZXljb2RlICh3aGljaCkgYXJndW1lbnRzIGFyZSBub3QgYWxsb3dlZC5cbiAgICBpZiAoIW1ldGhvZE5hbWUpIHtcbiAgICAgIHJldHVybiBjbGFzc1dyYXBwZXIuYXBwbHkodW5kZWZpbmVkLCBhcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKG1ldGhvZE5hbWUgKyAnOiBNZXRob2QgZGVjb3JhdG9ycyBtdXN0IGhhdmUga2V5Y29kZSBhcmd1bWVudHMsIHNvIHRoZSBkZWNvcmF0b3IgZm9yIHRoaXMgbWV0aG9kIHdpbGwgbm90IGRvIGFueXRoaW5nJyk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICoga2V5ZG93blNjb3BlZFxuICpcbiAqIE1ldGhvZCBkZWNvcmF0b3IgdGhhdCB3aWxsIGxvb2sgZm9yIGNoYW5nZXMgdG8gaXRzIHRhcmdldGVkIGNvbXBvbmVudCdzXG4gKiBga2V5ZG93bmAgcHJvcHMgdG8gZGVjaWRlIHdoZW4gdG8gdHJpZ2dlciwgcmF0aGVyIHRoYW4gcmVzcG9uZGluZyBkaXJlY3RseVxuICogdG8ga2V5ZG93biBldmVudHMuIFRoaXMgbGV0cyB5b3Ugc3BlY2lmeSBhIEBrZXlkb3duIGRlY29yYXRlZCBjbGFzcyBoaWdoZXJcbiAqIHVwIGluIHRoZSB2aWV3IGhpZXJhcmNoeSBmb3IgbGFyZ2VyIHNjb3Bpbmcgb2Yga2V5ZG93biBldmVudHMsIG9yIGZvclxuICogcHJvZ3JhbW1hdGljYWxseSBzZW5kaW5nIGtleWRvd24gZXZlbnRzIGFzIHByb3BzIGludG8gdGhlIGNvbXBvbmVudHMgaW4gb3JkZXJcbiAqIHRvIHRyaWdnZXIgZGVjb3JhdGVkIG1ldGhvZHMgd2l0aCBtYXRjaGluZyBrZXlzLlxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKiBAcGFyYW0ge0FycmF5fSAuLi5hcmdzICBBbGwgKG9yIG5vKSBhcmd1bWVudHMgcGFzc2VkIGluIGZyb20gZGVjb3JhdGlvblxuICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBkZWNvcmF0ZWQgY2xhc3Mgb3IgbWV0aG9kXG4gKi9cbmZ1bmN0aW9uIGtleWRvd25TY29wZWQoKSB7XG4gIGZvciAodmFyIF9sZW4yID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4yKSwgX2tleTIgPSAwOyBfa2V5MiA8IF9sZW4yOyBfa2V5MisrKSB7XG4gICAgYXJnc1tfa2V5Ml0gPSBhcmd1bWVudHNbX2tleTJdO1xuICB9XG5cbiAgcmV0dXJuIF9kZWNvcmF0b3IuYXBwbHkodW5kZWZpbmVkLCBbbWV0aG9kV3JhcHBlclNjb3BlZF0uY29uY2F0KGFyZ3MpKTtcbn1cblxuLyoqXG4gKiBrZXlkb3duXG4gKlxuICogVGhlIG1haW4gZGVjb3JhdG9yIGFuZCBkZWZhdWx0IGV4cG9ydCwgaGFuZGxlcyBib3RoIGNsYXNzZXMgYW5kIG1ldGhvZHMuXG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqIEBwYXJhbSB7QXJyYXl9IC4uLmFyZ3MgIEFsbCAob3Igbm8pIGFyZ3VtZW50cyBwYXNzZWQgaW4gZnJvbSBkZWNvcmF0aW9uXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIGRlY29yYXRlZCBjbGFzcyBvciBtZXRob2RcbiAqL1xuZnVuY3Rpb24ga2V5ZG93bigpIHtcbiAgZm9yICh2YXIgX2xlbjMgPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbjMpLCBfa2V5MyA9IDA7IF9rZXkzIDwgX2xlbjM7IF9rZXkzKyspIHtcbiAgICBhcmdzW19rZXkzXSA9IGFyZ3VtZW50c1tfa2V5M107XG4gIH1cblxuICByZXR1cm4gX2RlY29yYXRvci5hcHBseSh1bmRlZmluZWQsIFttZXRob2RXcmFwcGVyXS5jb25jYXQoYXJncykpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBrZXlkb3duO1xuXG5leHBvcnQgeyBrZXlkb3duU2NvcGVkIH07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvZGVjb3JhdG9ycy9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gNTU2XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsInZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxuLyoqXG4gKiBAbW9kdWxlIG1ldGhvZFdyYXBwZXJcbiAqXG4gKi9cbmltcG9ydCBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgeyBvbk1vdW50LCBvblVubW91bnQsIF9vbktleURvd24gfSBmcm9tICcuLi9ldmVudF9oYW5kbGVycyc7XG5cbi8qKlxuICogX2lzUmVhY3RLZXlEb3duXG4gKlxuICogQGFjY2VzcyBwcml2YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gZXZlbnQgVGhlIHBvc3NpYmx5IHN5bnRoZXRpYyBldmVudCBwYXNzZWQgYXMgYW4gYXJndW1lbnQgd2l0aFxuICogdGhlIG1ldGhvZCBpbnZvY2F0aW9uLlxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gX2lzUmVhY3RLZXlEb3duKGV2ZW50KSB7XG4gIHJldHVybiBldmVudCAmJiAodHlwZW9mIGV2ZW50ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihldmVudCkpID09PSAnb2JqZWN0JyAmJiBldmVudC5uYXRpdmVFdmVudCBpbnN0YW5jZW9mIHdpbmRvdy5LZXlib2FyZEV2ZW50ICYmIGV2ZW50LnR5cGUgPT09ICdrZXlkb3duJztcbn1cblxuLyoqXG4gKiBtZXRob2RXcmFwcGVyXG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzIEFsbCBhcmd1bWVudHMgbmVjZXNzYXJ5IGZvciB3cmFwcGluZyBtZXRob2RcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzLnRhcmdldCBUaGUgZGVjb3JhdGVkIGNsYXNzXG4gKiBAcGFyYW0ge29iamVjdH0gYXJncy5kZXNjcmlwdG9yIE1ldGhvZCBkZXNjcmlwdG9yXG4gKiBAcGFyYW0ge2FycmF5fSBhcmdzLmtleXMgVGhlIGFycmF5IG9mIGtleXMgYm91bmQgdG8gdGhlIGdpdmVuIG1ldGhvZFxuICogQHJldHVybiB7b2JqZWN0fSBUaGUgbWV0aG9kIGRlc2NyaXB0b3JcbiAqL1xuZnVuY3Rpb24gbWV0aG9kV3JhcHBlcihfcmVmKSB7XG4gIHZhciB0YXJnZXQgPSBfcmVmLnRhcmdldCxcbiAgICAgIGRlc2NyaXB0b3IgPSBfcmVmLmRlc2NyaXB0b3IsXG4gICAgICBrZXlzID0gX3JlZi5rZXlzO1xuXG5cbiAgdmFyIGZuID0gZGVzY3JpcHRvci52YWx1ZTtcblxuICAvLyBpZiB3ZSBoYXZlbid0IGFscmVhZHkgY3JlYXRlZCBhIGJpbmRpbmcgZm9yIHRoaXMgY2xhc3MgKHZpYSBhbm90aGVyXG4gIC8vIGRlY29yYXRlZCBtZXRob2QpLCB3cmFwIHRoZXNlIGxpZmVjeWNsZSBtZXRob2RzLlxuICBpZiAoIXN0b3JlLmdldEJpbmRpbmcodGFyZ2V0KSkge1xuICAgIHZhciBjb21wb25lbnREaWRNb3VudCA9IHRhcmdldC5jb21wb25lbnREaWRNb3VudCxcbiAgICAgICAgY29tcG9uZW50V2lsbFVubW91bnQgPSB0YXJnZXQuY29tcG9uZW50V2lsbFVubW91bnQ7XG5cblxuICAgIHRhcmdldC5jb21wb25lbnREaWRNb3VudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9uTW91bnQodGhpcyk7XG4gICAgICBpZiAoY29tcG9uZW50RGlkTW91bnQpIHJldHVybiBjb21wb25lbnREaWRNb3VudC5jYWxsKHRoaXMpO1xuICAgIH07XG5cbiAgICB0YXJnZXQuY29tcG9uZW50V2lsbFVubW91bnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBvblVubW91bnQodGhpcyk7XG4gICAgICBpZiAoY29tcG9uZW50V2lsbFVubW91bnQpIHJldHVybiBjb21wb25lbnRXaWxsVW5tb3VudC5jYWxsKHRoaXMpO1xuICAgIH07XG4gIH1cblxuICAvLyBhZGQgdGhpcyBiaW5kaW5nIG9mIGtleXMgYW5kIG1ldGhvZCB0byB0aGUgdGFyZ2V0J3MgYmluZGluZ3NcbiAgc3RvcmUuc2V0QmluZGluZyh7IGtleXM6IGtleXMsIHRhcmdldDogdGFyZ2V0LCBmbjogZm4gfSk7XG5cbiAgZGVzY3JpcHRvci52YWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4pLCBfa2V5ID0gMDsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgYXJnc1tfa2V5XSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICB9XG5cbiAgICB2YXIgbWF5YmVFdmVudCA9IGFyZ3NbMF07XG5cbiAgICBpZiAoX2lzUmVhY3RLZXlEb3duKG1heWJlRXZlbnQpKSB7XG4gICAgICAvLyBwcm94eSBtZXRob2QgaW4gb3JkZXIgdG8gdXNlIEBrZXlkb3duIGFzIGZpbHRlciBmb3Iga2V5ZG93biBldmVudHMgY29taW5nXG4gICAgICAvLyBmcm9tIGFuIGFjdHVhbCBvbktleURvd24gYmluZGluZyAoYXMgaWRlbnRpZmllZCBieSByZWFjdCdzIGFkZGl0aW9uIG9mXG4gICAgICAvLyAnbmF0aXZlRXZlbnQnICsgdHlwZSA9PT0gJ2tleWRvd24nKVxuICAgICAgaWYgKCFtYXliZUV2ZW50LmN0cmxLZXkpIHtcbiAgICAgICAgLy8gd2UgYWxyZWFkeSB3aGl0ZWxpc3Qgc2hvcnRjdXRzIHdpdGggY3RybCBtb2RpZmllcnMgc28gaWYgd2Ugd2VyZSB0b1xuICAgICAgICAvLyBmaXJlIGl0IGFnYWluIGhlcmUgdGhlIG1ldGhvZCB3b3VsZCB0cmlnZ2VyIHR3aWNlLiBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2dsb3J0aG8vcmVhY3Qta2V5ZG93bi9pc3N1ZXMvMzhcbiAgICAgICAgcmV0dXJuIF9vbktleURvd24obWF5YmVFdmVudCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghbWF5YmVFdmVudCB8fCAhKG1heWJlRXZlbnQgaW5zdGFuY2VvZiB3aW5kb3cuS2V5Ym9hcmRFdmVudCkgfHwgbWF5YmVFdmVudC50eXBlICE9PSAna2V5ZG93bicpIHtcbiAgICAgIC8vIGlmIG91ciBmaXJzdCBhcmd1bWVudCBpcyBhIGtleWRvd24gZXZlbnQgaXQgaXMgYmVpbmcgaGFuZGxlZCBieSBvdXJcbiAgICAgIC8vIGJpbmRpbmcgc3lzdGVtLiBpZiBpdCdzIGFueXRoaW5nIGVsc2UsIGp1c3QgcGFzcyB0aHJvdWdoLlxuICAgICAgcmV0dXJuIGZuLmNhbGwuYXBwbHkoZm4sIFt0aGlzXS5jb25jYXQoYXJncykpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZGVzY3JpcHRvcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgbWV0aG9kV3JhcHBlcjtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL21ldGhvZF9kZWNvcmF0b3IuanNcbi8vIG1vZHVsZSBpZCA9IDU1N1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIEBtb2R1bGUgbWV0aG9kV3JhcHBlclNjb3BlZFxuICpcbiAqL1xuaW1wb3J0IG1hdGNoS2V5cyBmcm9tICcuLi9saWIvbWF0Y2hfa2V5cyc7XG5pbXBvcnQgcGFyc2VLZXlzIGZyb20gJy4uL2xpYi9wYXJzZV9rZXlzJztcblxuLyoqXG4gKiBfc2hvdWxkVHJpZ2dlclxuICpcbiAqIEBhY2Nlc3MgcHJpdmF0ZVxuICogQHBhcmFtIHtvYmplY3R9IHRoaXNQcm9wcyBFeHN0aW5nIHByb3BzIGZyb20gdGhlIHdyYXBwZWQgY29tcG9uZW50XG4gKiBAcGFyYW0ge29iamVjdH0gdGhpc1Byb3BzLmtleWRvd24gVGhlIG5hbWVzcGFjZWQgc3RhdGUgZnJvbSB0aGUgaGlnaGVyLW9yZGVyXG4gKiBjb21wb25lbnQgKGNsYXNzX2RlY29yYXRvcilcbiAqIEBwYXJhbSB7b2JqZWN0fSBuZXh0UHJvcHMgVGhlIGluY29taW5nIHByb3BzIGZyb20gdGhlIHdyYXBwZWQgY29tcG9uZW50XG4gKiBAcGFyYW0ge29iamVjdH0gbmV4dFByb3BzLmtleWRvd24gVGhlIG5hbWVzY2FwZWQgc3RhdGUgZnJvbSB0aGUgaGlnaGVyLW9yZGVyXG4gKiBjb21wb25lbnQgKGNsYXNzX2RlY29yYXRvcilcbiAqIEBwYXJhbSB7YXJyYXl9IGtleXMgVGhlIGtleXMgYm91bmQgdG8gdGhlIGRlY29yYXRlZCBtZXRob2RcbiAqIEByZXR1cm4ge2Jvb2xlYW59IFdoZXRoZXIgYWxsIHRlc3RzIGhhdmUgcGFzc2VkXG4gKi9cbmZ1bmN0aW9uIF9zaG91bGRUcmlnZ2VyKF9yZWYsIGtleWRvd25OZXh0KSB7XG4gIHZhciBrZXlkb3duVGhpcyA9IF9yZWYua2V5ZG93bjtcblxuICByZXR1cm4ga2V5ZG93bk5leHQgJiYga2V5ZG93bk5leHQuZXZlbnQgJiYgIWtleWRvd25UaGlzLmV2ZW50O1xufVxuXG4vKipcbiAqIG1ldGhvZFdyYXBwZXJTY29wZWRcbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtvYmplY3R9IGFyZ3MgQWxsIGFyZ3MgbmVjZXNzYXJ5IGZvciBkZWNvcmF0aW5nIHRoZSBtZXRob2RcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzLnRhcmdldCBUaGUgZGVjb3JhdGVkIG1ldGhvZCdzIGNsYXNzIG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3MuZGVzY3JpcHRvciBUaGUgbWV0aG9kJ3MgZGVzY3JpcHRvciBvYmplY3RcbiAqIEBwYXJhbSB7YXJyYXl9IGFyZ3Mua2V5cyBUaGUga2V5IGNvZGVzIGJvdW5kIHRvIHRoZSBkZWNvcmF0ZWQgbWV0aG9kXG4gKiBAcmV0dXJuIHtvYmplY3R9IFRoZSBtZXRob2QncyBkZXNjcmlwdG9yIG9iamVjdFxuICovXG5mdW5jdGlvbiBtZXRob2RXcmFwcGVyU2NvcGVkKF9yZWYyKSB7XG4gIHZhciB0YXJnZXQgPSBfcmVmMi50YXJnZXQsXG4gICAgICBkZXNjcmlwdG9yID0gX3JlZjIuZGVzY3JpcHRvcixcbiAgICAgIGtleXMgPSBfcmVmMi5rZXlzO1xuICB2YXIgY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyA9IHRhcmdldC5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzO1xuXG4gIHZhciBmbiA9IGRlc2NyaXB0b3IudmFsdWU7XG4gIGlmICgha2V5cykge1xuICAgIGNvbnNvbGUud2FybihmbiArICc6IGtleWRvd25TY29wZWQgcmVxdWlyZXMgb25lIG9yIG1vcmUga2V5cycpO1xuICB9IGVsc2Uge1xuICAgIHZhciBrZXlTZXRzID0gcGFyc2VLZXlzKGtleXMpO1xuXG4gICAgLy8gd3JhcCB0aGUgY29tcG9uZW50J3MgbGlmZWN5Y2xlIG1ldGhvZCB0byBpbnRlcmNlcHQga2V5IGNvZGVzIGNvbWluZyBkb3duXG4gICAgLy8gZnJvbSB0aGUgd3JhcHBlZC9zY29wZWQgY29tcG9uZW50IHVwIHRoZSB2aWV3IGhpZXJhcmNoeS4gaWYgbmV3IGtleWRvd25cbiAgICAvLyBldmVudCBoYXMgYXJyaXZlZCBhbmQgdGhlIGtleSBjb2RlcyBtYXRjaCB3aGF0IHdhcyBzcGVjaWZpZWQgaW4gdGhlXG4gICAgLy8gZGVjb3JhdG9yLCBjYWxsIHRoZSB3cmFwcGVkIG1ldGhvZC5cbiAgICB0YXJnZXQuY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyA9IGZ1bmN0aW9uIChuZXh0UHJvcHMpIHtcbiAgICAgIHZhciBrZXlkb3duID0gbmV4dFByb3BzLmtleWRvd247XG5cbiAgICAgIGlmIChfc2hvdWxkVHJpZ2dlcih0aGlzLnByb3BzLCBrZXlkb3duKSkge1xuICAgICAgICBpZiAoa2V5U2V0cy5zb21lKGZ1bmN0aW9uIChrZXlTZXQpIHtcbiAgICAgICAgICByZXR1cm4gbWF0Y2hLZXlzKHsga2V5U2V0OiBrZXlTZXQsIGV2ZW50OiBrZXlkb3duLmV2ZW50IH0pO1xuICAgICAgICB9KSkge1xuICAgICAgICAgIHJldHVybiBmbi5jYWxsKHRoaXMsIGtleWRvd24uZXZlbnQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbiA+IDEgPyBfbGVuIC0gMSA6IDApLCBfa2V5ID0gMTsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgICBhcmdzW19rZXkgLSAxXSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMpIHJldHVybiBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzLmNhbGwuYXBwbHkoY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcywgW3RoaXMsIG5leHRQcm9wc10uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGRlc2NyaXB0b3I7XG59XG5cbmV4cG9ydCBkZWZhdWx0IG1ldGhvZFdyYXBwZXJTY29wZWQ7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvZGVjb3JhdG9ycy9tZXRob2RfZGVjb3JhdG9yX3Njb3BlZC5qc1xuLy8gbW9kdWxlIGlkID0gNTU4XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIHBvbHlmaWxsIGFycmF5LmZyb20gKG1haW5seSBmb3IgSUUpXG5pbXBvcnQgJy4vbGliL2FycmF5LmZyb20nO1xuXG4vLyBAa2V5ZG93biBhbmQgQGtleWRvd25TY29wZWRcbmV4cG9ydCB7IGRlZmF1bHQsIGtleWRvd25TY29wZWQgfSBmcm9tICcuL2RlY29yYXRvcnMnO1xuXG4vLyBzZXRCaW5kaW5nIC0gb25seSB1c2VmdWwgaWYgeW91J3JlIG5vdCBnb2luZyB0byB1c2UgZGVjb3JhdG9yc1xuZXhwb3J0IHsgc2V0QmluZGluZyB9IGZyb20gJy4vc3RvcmUnO1xuXG4vLyBLZXlzIC0gdXNlIHRoaXMgdG8gZmluZCBrZXkgY29kZXMgZm9yIHN0cmluZ3MuIGZvciBleGFtcGxlOiBLZXlzLmosIEtleXMuZW50ZXJcbmV4cG9ydCB7IGRlZmF1bHQgYXMgS2V5cyB9IGZyb20gJy4vbGliL2tleXMnO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2luZGV4LmpzXG4vLyBtb2R1bGUgaWQgPSA1NTlcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gUHJvZHVjdGlvbiBzdGVwcyBvZiBFQ01BLTI2MiwgRWRpdGlvbiA2LCAyMi4xLjIuMVxuLy8gU2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L2Zyb21cbmlmICghQXJyYXkuZnJvbSkge1xuICBBcnJheS5mcm9tID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG4gICAgdmFyIGlzQ2FsbGFibGUgPSBmdW5jdGlvbiBpc0NhbGxhYmxlKGZuKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIGZuID09PSAnZnVuY3Rpb24nIHx8IHRvU3RyLmNhbGwoZm4pID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICAgIH07XG4gICAgdmFyIHRvSW50ZWdlciA9IGZ1bmN0aW9uIHRvSW50ZWdlcih2YWx1ZSkge1xuICAgICAgdmFyIG51bWJlciA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoaXNOYU4obnVtYmVyKSkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICAgIGlmIChudW1iZXIgPT09IDAgfHwgIWlzRmluaXRlKG51bWJlcikpIHtcbiAgICAgICAgcmV0dXJuIG51bWJlcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiAobnVtYmVyID4gMCA/IDEgOiAtMSkgKiBNYXRoLmZsb29yKE1hdGguYWJzKG51bWJlcikpO1xuICAgIH07XG4gICAgdmFyIG1heFNhZmVJbnRlZ2VyID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcbiAgICB2YXIgdG9MZW5ndGggPSBmdW5jdGlvbiB0b0xlbmd0aCh2YWx1ZSkge1xuICAgICAgdmFyIGxlbiA9IHRvSW50ZWdlcih2YWx1ZSk7XG4gICAgICByZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgobGVuLCAwKSwgbWF4U2FmZUludGVnZXIpO1xuICAgIH07XG5cbiAgICAvLyBUaGUgbGVuZ3RoIHByb3BlcnR5IG9mIHRoZSBmcm9tIG1ldGhvZCBpcyAxLlxuICAgIHJldHVybiBmdW5jdGlvbiBmcm9tKGFycmF5TGlrZSAvKiwgbWFwRm4sIHRoaXNBcmcgKi8pIHtcbiAgICAgIC8vIDEuIExldCBDIGJlIHRoZSB0aGlzIHZhbHVlLlxuICAgICAgdmFyIEMgPSB0aGlzO1xuXG4gICAgICAvLyAyLiBMZXQgaXRlbXMgYmUgVG9PYmplY3QoYXJyYXlMaWtlKS5cbiAgICAgIHZhciBpdGVtcyA9IE9iamVjdChhcnJheUxpa2UpO1xuXG4gICAgICAvLyAzLiBSZXR1cm5JZkFicnVwdChpdGVtcykuXG4gICAgICBpZiAoYXJyYXlMaWtlID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkFycmF5LmZyb20gcmVxdWlyZXMgYW4gYXJyYXktbGlrZSBvYmplY3QgLSBub3QgbnVsbCBvciB1bmRlZmluZWRcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIDQuIElmIG1hcGZuIGlzIHVuZGVmaW5lZCwgdGhlbiBsZXQgbWFwcGluZyBiZSBmYWxzZS5cbiAgICAgIHZhciBtYXBGbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdm9pZCB1bmRlZmluZWQ7XG4gICAgICB2YXIgVDtcbiAgICAgIGlmICh0eXBlb2YgbWFwRm4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIDUuIGVsc2VcbiAgICAgICAgLy8gNS4gYSBJZiBJc0NhbGxhYmxlKG1hcGZuKSBpcyBmYWxzZSwgdGhyb3cgYSBUeXBlRXJyb3IgZXhjZXB0aW9uLlxuICAgICAgICBpZiAoIWlzQ2FsbGFibGUobWFwRm4pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkuZnJvbTogd2hlbiBwcm92aWRlZCwgdGhlIHNlY29uZCBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDUuIGIuIElmIHRoaXNBcmcgd2FzIHN1cHBsaWVkLCBsZXQgVCBiZSB0aGlzQXJnOyBlbHNlIGxldCBUIGJlIHVuZGVmaW5lZC5cbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgVCA9IGFyZ3VtZW50c1syXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyAxMC4gTGV0IGxlblZhbHVlIGJlIEdldChpdGVtcywgXCJsZW5ndGhcIikuXG4gICAgICAvLyAxMS4gTGV0IGxlbiBiZSBUb0xlbmd0aChsZW5WYWx1ZSkuXG4gICAgICB2YXIgbGVuID0gdG9MZW5ndGgoaXRlbXMubGVuZ3RoKTtcblxuICAgICAgLy8gMTMuIElmIElzQ29uc3RydWN0b3IoQykgaXMgdHJ1ZSwgdGhlblxuICAgICAgLy8gMTMuIGEuIExldCBBIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tDb25zdHJ1Y3RdXSBpbnRlcm5hbCBtZXRob2QgXG4gICAgICAvLyBvZiBDIHdpdGggYW4gYXJndW1lbnQgbGlzdCBjb250YWluaW5nIHRoZSBzaW5nbGUgaXRlbSBsZW4uXG4gICAgICAvLyAxNC4gYS4gRWxzZSwgTGV0IEEgYmUgQXJyYXlDcmVhdGUobGVuKS5cbiAgICAgIHZhciBBID0gaXNDYWxsYWJsZShDKSA/IE9iamVjdChuZXcgQyhsZW4pKSA6IG5ldyBBcnJheShsZW4pO1xuXG4gICAgICAvLyAxNi4gTGV0IGsgYmUgMC5cbiAgICAgIHZhciBrID0gMDtcbiAgICAgIC8vIDE3LiBSZXBlYXQsIHdoaWxlIGsgPCBsZW7igKYgKGFsc28gc3RlcHMgYSAtIGgpXG4gICAgICB2YXIga1ZhbHVlO1xuICAgICAgd2hpbGUgKGsgPCBsZW4pIHtcbiAgICAgICAga1ZhbHVlID0gaXRlbXNba107XG4gICAgICAgIGlmIChtYXBGbikge1xuICAgICAgICAgIEFba10gPSB0eXBlb2YgVCA9PT0gJ3VuZGVmaW5lZCcgPyBtYXBGbihrVmFsdWUsIGspIDogbWFwRm4uY2FsbChULCBrVmFsdWUsIGspO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIEFba10gPSBrVmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgayArPSAxO1xuICAgICAgfVxuICAgICAgLy8gMTguIExldCBwdXRTdGF0dXMgYmUgUHV0KEEsIFwibGVuZ3RoXCIsIGxlbiwgdHJ1ZSkuXG4gICAgICBBLmxlbmd0aCA9IGxlbjtcbiAgICAgIC8vIDIwLiBSZXR1cm4gQS5cbiAgICAgIHJldHVybiBBO1xuICAgIH07XG4gIH0oKTtcbn1cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvYXJyYXkuZnJvbS5qc1xuLy8gbW9kdWxlIGlkID0gNTYwXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQG1vZHVsZSBkb21IZWxwZXJzXG4gKlxuICovXG5pbXBvcnQgUmVhY3RET00gZnJvbSAncmVhY3QtZG9tJztcblxudmFyIGZvY3VzYWJsZVNlbGVjdG9yID0gJ2FbaHJlZl0sIGJ1dHRvbiwgaW5wdXQsIG9iamVjdCwgc2VsZWN0LCB0ZXh0YXJlYSwgW3RhYmluZGV4XSc7XG5cbi8qKlxuICogYmluZEZvY3VzYWJsZXM6IEZpbmQgYW55IGZvY3VzYWJsZSBjaGlsZCBlbGVtZW50cyBvZiB0aGUgY29tcG9uZW50IGluc3RhbmNlIGFuZFxuICogYWRkIGFuIG9uRm9jdXMgaGFuZGxlciB0byBmb2N1cyBvdXIga2V5ZG93biBoYW5kbGVycyBvbiB0aGUgcGFyZW50IGNvbXBvbmVudFxuICogd2hlbiB1c2VyIGtleXMgYXBwbGllcyBmb2N1cyB0byB0aGUgZWxlbWVudC5cbiAqXG4gKiBOT1RFOiBPbmUgbGltaXRhdGlvbiBvZiB0aGlzIHJpZ2h0IG5vdyBpcyB0aGF0IGlmIHlvdSB0YWIgb3V0IG9mIHRoZVxuICogY29tcG9uZW50LCBfZm9jdXNlZEluc3RhbmNlIHdpbGwgc3RpbGwgYmUgc2V0IHVudGlsIG5leHQgY2xpY2sgb3IgbW91bnQgb3JcbiAqIGNvbnRyb2xsZWQgZm9jdXMuXG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSBUaGUga2V5LWJvdW5kIGNvbXBvbmVudCBpbnN0YW5jZVxuICogQHBhcmFtIHtjYWxsYmFja30gYWN0aXZhdGVPbkZvY3VzIFRoZSBmbiB0byBmaXJlIHdoZW4gZWxlbWVudCBpcyBmb2N1c2VkXG4gKi9cbmZ1bmN0aW9uIGJpbmRGb2N1c2FibGVzKGluc3RhbmNlLCBhY3RpdmF0ZU9uRm9jdXMpIHtcbiAgaWYgKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwpIHtcbiAgICB2YXIgbm9kZSA9IFJlYWN0RE9NLmZpbmRET01Ob2RlKGluc3RhbmNlKTtcbiAgICBpZiAobm9kZSkge1xuICAgICAgdmFyIGZvY3VzYWJsZXMgPSBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoZm9jdXNhYmxlU2VsZWN0b3IpO1xuICAgICAgaWYgKGZvY3VzYWJsZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBvbkZvY3VzID0gZnVuY3Rpb24gb25Gb2N1cyhlbGVtZW50KSB7XG4gICAgICAgICAgdmFyIG9uRm9jdXNQcmV2ID0gZWxlbWVudC5vbmZvY3VzO1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGFjdGl2YXRlT25Gb2N1cyhpbnN0YW5jZSk7XG4gICAgICAgICAgICBpZiAob25Gb2N1c1ByZXYpIG9uRm9jdXNQcmV2LmNhbGwoZWxlbWVudCwgZXZlbnQpO1xuICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZvY3VzYWJsZXMpLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gZWxlbWVudC5vbmZvY3VzID0gb25Gb2N1cyhlbGVtZW50KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogZmluZENvbnRhaW5lck5vZGVzOiBDYWxsZWQgYnkgb3VyIGNsaWNrIGhhbmRsZXIgdG8gZmluZCBpbnN0YW5jZXMgd2l0aCBub2Rlc1xuICogdGhhdCBhcmUgZXF1YWwgdG8gb3IgdGhhdCBjb250YWluIHRoZSBjbGljayB0YXJnZXQuIEFueSB0aGF0IHBhc3MgdGhpcyB0ZXN0XG4gKiB3aWxsIGJlIHJlY2lwaWVudHMgb2YgdGhlIG5leHQga2V5ZG93biBldmVudC5cbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBUaGUgY2xpY2sgZXZlbnQudGFyZ2V0IERPTSBlbGVtZW50XG4gKiBAcmV0dXJuIHtmdW5jdGlvbn0gUmVkdWNlciBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBmaW5kQ29udGFpbmVyTm9kZXModGFyZ2V0KSB7XG4gIHJldHVybiBmdW5jdGlvbiAobWVtbywgaW5zdGFuY2UpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIG5vZGUgPSBSZWFjdERPTS5maW5kRE9NTm9kZShpbnN0YW5jZSk7XG4gICAgICBpZiAobm9kZSAmJiAobm9kZSA9PT0gdGFyZ2V0IHx8IG5vZGUuY29udGFpbnModGFyZ2V0KSkpIHtcbiAgICAgICAgbWVtby5wdXNoKHsgaW5zdGFuY2U6IGluc3RhbmNlLCBub2RlOiBub2RlIH0pO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogc29ydEJ5RE9NUG9zaXRpb246IENhbGxlZCBieSBvdXIgY2xpY2sgaGFuZGxlciB0byBzb3J0IGEgbGlzdCBvZiBpbnN0YW5jZXNcbiAqIGFjY29yZGluZyB0byBsZWFzdCAtPiBtb3N0IG5lc3RlZC4gVGhpcyBpcyBzbyB0aGF0IGlmIG11bHRpcGxlIGtleWJvdW5kXG4gKiBpbnN0YW5jZXMgaGF2ZSBub2RlcyB0aGF0IGFyZSBhbmNlc3RvcnMgb2YgdGhlIGNsaWNrIHRhcmdldCwgdGhleSB3aWxsIGJlXG4gKiBzb3J0ZWQgdG8gbGV0IHRoZSBpbnN0YW5jZSBjbG9zZXN0IHRvIHRoZSBjbGljayB0YXJnZXQgZ2V0IGZpcnN0IGRpYnMgb24gdGhlXG4gKiBuZXh0IGtleSBkb3duIGV2ZW50LlxuICovXG5mdW5jdGlvbiBzb3J0QnlET01Qb3NpdGlvbihhLCBiKSB7XG4gIHJldHVybiBhLm5vZGUuY29tcGFyZURvY3VtZW50UG9zaXRpb24oYi5ub2RlKSA9PT0gMTAgPyAxIDogLTE7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHsgYmluZEZvY3VzYWJsZXM6IGJpbmRGb2N1c2FibGVzLCBmaW5kQ29udGFpbmVyTm9kZXM6IGZpbmRDb250YWluZXJOb2Rlcywgc29ydEJ5RE9NUG9zaXRpb246IHNvcnRCeURPTVBvc2l0aW9uIH07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2RvbV9oZWxwZXJzLmpzXG4vLyBtb2R1bGUgaWQgPSA1NjFcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBAbW9kdWxlIExpc3RlbmVyc1xuICpcbiAqL1xuXG4vLyBmbGFnIGZvciB3aGV0aGVyIGNsaWNrIGxpc3RlbmVyIGhhcyBiZWVuIGJvdW5kIHRvIGRvY3VtZW50XG52YXIgX2NsaWNrc0JvdW5kID0gZmFsc2U7XG5cbi8vIGZsYWcgZm9yIHdoZXRoZXIga2V5ZG93biBsaXN0ZW5lciBoYXMgYmVlbiBib3VuZCB0byBkb2N1bWVudFxudmFyIF9rZXlzQm91bmQgPSBmYWxzZTtcblxudmFyIExpc3RlbmVycyA9IHtcbiAgLyoqXG4gICAqIF9iaW5kS2V5c1xuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKi9cbiAgYmluZEtleXM6IGZ1bmN0aW9uIGJpbmRLZXlzKGNhbGxiYWNrKSB7XG4gICAgaWYgKCFfa2V5c0JvdW5kKSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgY2FsbGJhY2spO1xuICAgICAgX2tleXNCb3VuZCA9IHRydWU7XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIHVuYmluZEtleXNcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICovXG4gIHVuYmluZEtleXM6IGZ1bmN0aW9uIHVuYmluZEtleXMoY2FsbGJhY2spIHtcbiAgICBpZiAoX2tleXNCb3VuZCkge1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGNhbGxiYWNrKTtcbiAgICAgIF9rZXlzQm91bmQgPSBmYWxzZTtcbiAgICB9XG4gIH0sXG5cblxuICAvKipcbiAgICogYmluZENsaWNrc1xuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKi9cbiAgYmluZENsaWNrczogZnVuY3Rpb24gYmluZENsaWNrcyhjYWxsYmFjaykge1xuICAgIGlmICghX2NsaWNrc0JvdW5kKSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNhbGxiYWNrKTtcbiAgICAgIF9jbGlja3NCb3VuZCA9IHRydWU7XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIHVuYmluZENsaWNrc1xuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKi9cbiAgdW5iaW5kQ2xpY2tzOiBmdW5jdGlvbiB1bmJpbmRDbGlja3MoY2FsbGJhY2spIHtcbiAgICBpZiAoX2NsaWNrc0JvdW5kKSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGNhbGxiYWNrKTtcbiAgICAgIF9jbGlja3NCb3VuZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgTGlzdGVuZXJzO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9saXN0ZW5lcnMuanNcbi8vIG1vZHVsZSBpZCA9IDU2MlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBDb3VudGVyIGJlaW5nIGluY3JlbWVudGVkLiBKUyBpcyBzaW5nbGUtdGhyZWFkZWQsIHNvIGl0J2xsIEp1c3QgV29ya+KEoi5cbnZhciBfX2NvdW50ZXIgPSAxO1xuXG4vKipcbiAqIFJldHVybnMgYSBwcm9jZXNzLXdpZGUgdW5pcXVlIGlkZW50aWZpZXIuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHV1aWQoKSB7XG4gIHJldHVybiBcInVpZC1cIiArIF9fY291bnRlcisrO1xufVxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi91dWlkLmpzXG4vLyBtb2R1bGUgaWQgPSA1NjNcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiXG4vKipcbiAqIFdoZW4gc291cmNlIG1hcHMgYXJlIGVuYWJsZWQsIGBzdHlsZS1sb2FkZXJgIHVzZXMgYSBsaW5rIGVsZW1lbnQgd2l0aCBhIGRhdGEtdXJpIHRvXG4gKiBlbWJlZCB0aGUgY3NzIG9uIHRoZSBwYWdlLiBUaGlzIGJyZWFrcyBhbGwgcmVsYXRpdmUgdXJscyBiZWNhdXNlIG5vdyB0aGV5IGFyZSByZWxhdGl2ZSB0byBhXG4gKiBidW5kbGUgaW5zdGVhZCBvZiB0aGUgY3VycmVudCBwYWdlLlxuICpcbiAqIE9uZSBzb2x1dGlvbiBpcyB0byBvbmx5IHVzZSBmdWxsIHVybHMsIGJ1dCB0aGF0IG1heSBiZSBpbXBvc3NpYmxlLlxuICpcbiAqIEluc3RlYWQsIHRoaXMgZnVuY3Rpb24gXCJmaXhlc1wiIHRoZSByZWxhdGl2ZSB1cmxzIHRvIGJlIGFic29sdXRlIGFjY29yZGluZyB0byB0aGUgY3VycmVudCBwYWdlIGxvY2F0aW9uLlxuICpcbiAqIEEgcnVkaW1lbnRhcnkgdGVzdCBzdWl0ZSBpcyBsb2NhdGVkIGF0IGB0ZXN0L2ZpeFVybHMuanNgIGFuZCBjYW4gYmUgcnVuIHZpYSB0aGUgYG5wbSB0ZXN0YCBjb21tYW5kLlxuICpcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjc3MpIHtcbiAgLy8gZ2V0IGN1cnJlbnQgbG9jYXRpb25cbiAgdmFyIGxvY2F0aW9uID0gdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3cubG9jYXRpb247XG5cbiAgaWYgKCFsb2NhdGlvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcImZpeFVybHMgcmVxdWlyZXMgd2luZG93LmxvY2F0aW9uXCIpO1xuICB9XG5cblx0Ly8gYmxhbmsgb3IgbnVsbD9cblx0aWYgKCFjc3MgfHwgdHlwZW9mIGNzcyAhPT0gXCJzdHJpbmdcIikge1xuXHQgIHJldHVybiBjc3M7XG4gIH1cblxuICB2YXIgYmFzZVVybCA9IGxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgbG9jYXRpb24uaG9zdDtcbiAgdmFyIGN1cnJlbnREaXIgPSBiYXNlVXJsICsgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXFwvW15cXC9dKiQvLCBcIi9cIik7XG5cblx0Ly8gY29udmVydCBlYWNoIHVybCguLi4pXG5cdC8qXG5cdFRoaXMgcmVndWxhciBleHByZXNzaW9uIGlzIGp1c3QgYSB3YXkgdG8gcmVjdXJzaXZlbHkgbWF0Y2ggYnJhY2tldHMgd2l0aGluXG5cdGEgc3RyaW5nLlxuXG5cdCAvdXJsXFxzKlxcKCAgPSBNYXRjaCBvbiB0aGUgd29yZCBcInVybFwiIHdpdGggYW55IHdoaXRlc3BhY2UgYWZ0ZXIgaXQgYW5kIHRoZW4gYSBwYXJlbnNcblx0ICAgKCAgPSBTdGFydCBhIGNhcHR1cmluZyBncm91cFxuXHQgICAgICg/OiAgPSBTdGFydCBhIG5vbi1jYXB0dXJpbmcgZ3JvdXBcblx0ICAgICAgICAgW14pKF0gID0gTWF0Y2ggYW55dGhpbmcgdGhhdCBpc24ndCBhIHBhcmVudGhlc2VzXG5cdCAgICAgICAgIHwgID0gT1Jcblx0ICAgICAgICAgXFwoICA9IE1hdGNoIGEgc3RhcnQgcGFyZW50aGVzZXNcblx0ICAgICAgICAgICAgICg/OiAgPSBTdGFydCBhbm90aGVyIG5vbi1jYXB0dXJpbmcgZ3JvdXBzXG5cdCAgICAgICAgICAgICAgICAgW14pKF0rICA9IE1hdGNoIGFueXRoaW5nIHRoYXQgaXNuJ3QgYSBwYXJlbnRoZXNlc1xuXHQgICAgICAgICAgICAgICAgIHwgID0gT1Jcblx0ICAgICAgICAgICAgICAgICBcXCggID0gTWF0Y2ggYSBzdGFydCBwYXJlbnRoZXNlc1xuXHQgICAgICAgICAgICAgICAgICAgICBbXikoXSogID0gTWF0Y2ggYW55dGhpbmcgdGhhdCBpc24ndCBhIHBhcmVudGhlc2VzXG5cdCAgICAgICAgICAgICAgICAgXFwpICA9IE1hdGNoIGEgZW5kIHBhcmVudGhlc2VzXG5cdCAgICAgICAgICAgICApICA9IEVuZCBHcm91cFxuICAgICAgICAgICAgICAqXFwpID0gTWF0Y2ggYW55dGhpbmcgYW5kIHRoZW4gYSBjbG9zZSBwYXJlbnNcbiAgICAgICAgICApICA9IENsb3NlIG5vbi1jYXB0dXJpbmcgZ3JvdXBcbiAgICAgICAgICAqICA9IE1hdGNoIGFueXRoaW5nXG4gICAgICAgKSAgPSBDbG9zZSBjYXB0dXJpbmcgZ3JvdXBcblx0IFxcKSAgPSBNYXRjaCBhIGNsb3NlIHBhcmVuc1xuXG5cdCAvZ2kgID0gR2V0IGFsbCBtYXRjaGVzLCBub3QgdGhlIGZpcnN0LiAgQmUgY2FzZSBpbnNlbnNpdGl2ZS5cblx0ICovXG5cdHZhciBmaXhlZENzcyA9IGNzcy5yZXBsYWNlKC91cmxcXHMqXFwoKCg/OlteKShdfFxcKCg/OlteKShdK3xcXChbXikoXSpcXCkpKlxcKSkqKVxcKS9naSwgZnVuY3Rpb24oZnVsbE1hdGNoLCBvcmlnVXJsKSB7XG5cdFx0Ly8gc3RyaXAgcXVvdGVzIChpZiB0aGV5IGV4aXN0KVxuXHRcdHZhciB1bnF1b3RlZE9yaWdVcmwgPSBvcmlnVXJsXG5cdFx0XHQudHJpbSgpXG5cdFx0XHQucmVwbGFjZSgvXlwiKC4qKVwiJC8sIGZ1bmN0aW9uKG8sICQxKXsgcmV0dXJuICQxOyB9KVxuXHRcdFx0LnJlcGxhY2UoL14nKC4qKSckLywgZnVuY3Rpb24obywgJDEpeyByZXR1cm4gJDE7IH0pO1xuXG5cdFx0Ly8gYWxyZWFkeSBhIGZ1bGwgdXJsPyBubyBjaGFuZ2Vcblx0XHRpZiAoL14oI3xkYXRhOnxodHRwOlxcL1xcL3xodHRwczpcXC9cXC98ZmlsZTpcXC9cXC9cXC8pL2kudGVzdCh1bnF1b3RlZE9yaWdVcmwpKSB7XG5cdFx0ICByZXR1cm4gZnVsbE1hdGNoO1xuXHRcdH1cblxuXHRcdC8vIGNvbnZlcnQgdGhlIHVybCB0byBhIGZ1bGwgdXJsXG5cdFx0dmFyIG5ld1VybDtcblxuXHRcdGlmICh1bnF1b3RlZE9yaWdVcmwuaW5kZXhPZihcIi8vXCIpID09PSAwKSB7XG5cdFx0ICBcdC8vVE9ETzogc2hvdWxkIHdlIGFkZCBwcm90b2NvbD9cblx0XHRcdG5ld1VybCA9IHVucXVvdGVkT3JpZ1VybDtcblx0XHR9IGVsc2UgaWYgKHVucXVvdGVkT3JpZ1VybC5pbmRleE9mKFwiL1wiKSA9PT0gMCkge1xuXHRcdFx0Ly8gcGF0aCBzaG91bGQgYmUgcmVsYXRpdmUgdG8gdGhlIGJhc2UgdXJsXG5cdFx0XHRuZXdVcmwgPSBiYXNlVXJsICsgdW5xdW90ZWRPcmlnVXJsOyAvLyBhbHJlYWR5IHN0YXJ0cyB3aXRoICcvJ1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBwYXRoIHNob3VsZCBiZSByZWxhdGl2ZSB0byBjdXJyZW50IGRpcmVjdG9yeVxuXHRcdFx0bmV3VXJsID0gY3VycmVudERpciArIHVucXVvdGVkT3JpZ1VybC5yZXBsYWNlKC9eXFwuXFwvLywgXCJcIik7IC8vIFN0cmlwIGxlYWRpbmcgJy4vJ1xuXHRcdH1cblxuXHRcdC8vIHNlbmQgYmFjayB0aGUgZml4ZWQgdXJsKC4uLilcblx0XHRyZXR1cm4gXCJ1cmwoXCIgKyBKU09OLnN0cmluZ2lmeShuZXdVcmwpICsgXCIpXCI7XG5cdH0pO1xuXG5cdC8vIHNlbmQgYmFjayB0aGUgZml4ZWQgY3NzXG5cdHJldHVybiBmaXhlZENzcztcbn07XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vc3R5bGUtbG9hZGVyL2ZpeFVybHMuanNcbi8vIG1vZHVsZSBpZCA9IDg5NlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBzdHlsZS1sb2FkZXI6IEFkZHMgc29tZSBjc3MgdG8gdGhlIERPTSBieSBhZGRpbmcgYSA8c3R5bGU+IHRhZ1xuXG4vLyBsb2FkIHRoZSBzdHlsZXNcbnZhciBjb250ZW50ID0gcmVxdWlyZShcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvaW5kZXguanMhLi4vLi4vbm9kZV9tb2R1bGVzL2xlc3MtbG9hZGVyL2Rpc3QvaW5kZXguanMhLi9TcGFjZXIubGVzc1wiKTtcbmlmKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJykgY29udGVudCA9IFtbbW9kdWxlLmlkLCBjb250ZW50LCAnJ11dO1xuLy8gUHJlcGFyZSBjc3NUcmFuc2Zvcm1hdGlvblxudmFyIHRyYW5zZm9ybTtcblxudmFyIG9wdGlvbnMgPSB7fVxub3B0aW9ucy50cmFuc2Zvcm0gPSB0cmFuc2Zvcm1cbi8vIGFkZCB0aGUgc3R5bGVzIHRvIHRoZSBET01cbnZhciB1cGRhdGUgPSByZXF1aXJlKFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvYWRkU3R5bGVzLmpzXCIpKGNvbnRlbnQsIG9wdGlvbnMpO1xuaWYoY29udGVudC5sb2NhbHMpIG1vZHVsZS5leHBvcnRzID0gY29udGVudC5sb2NhbHM7XG4vLyBIb3QgTW9kdWxlIFJlcGxhY2VtZW50XG5pZihtb2R1bGUuaG90KSB7XG5cdC8vIFdoZW4gdGhlIHN0eWxlcyBjaGFuZ2UsIHVwZGF0ZSB0aGUgPHN0eWxlPiB0YWdzXG5cdGlmKCFjb250ZW50LmxvY2Fscykge1xuXHRcdG1vZHVsZS5ob3QuYWNjZXB0KFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL1NwYWNlci5sZXNzXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG5ld0NvbnRlbnQgPSByZXF1aXJlKFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL1NwYWNlci5sZXNzXCIpO1xuXHRcdFx0aWYodHlwZW9mIG5ld0NvbnRlbnQgPT09ICdzdHJpbmcnKSBuZXdDb250ZW50ID0gW1ttb2R1bGUuaWQsIG5ld0NvbnRlbnQsICcnXV07XG5cdFx0XHR1cGRhdGUobmV3Q29udGVudCk7XG5cdFx0fSk7XG5cdH1cblx0Ly8gV2hlbiB0aGUgbW9kdWxlIGlzIGRpc3Bvc2VkLCByZW1vdmUgdGhlIDxzdHlsZT4gdGFnc1xuXHRtb2R1bGUuaG90LmRpc3Bvc2UoZnVuY3Rpb24oKSB7IHVwZGF0ZSgpOyB9KTtcbn1cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9hcHAvU3BhY2VyLmxlc3Ncbi8vIG1vZHVsZSBpZCA9IDg5N1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBzdHlsZS1sb2FkZXI6IEFkZHMgc29tZSBjc3MgdG8gdGhlIERPTSBieSBhZGRpbmcgYSA8c3R5bGU+IHRhZ1xuXG4vLyBsb2FkIHRoZSBzdHlsZXNcbnZhciBjb250ZW50ID0gcmVxdWlyZShcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvaW5kZXguanMhLi4vLi4vbm9kZV9tb2R1bGVzL2xlc3MtbG9hZGVyL2Rpc3QvaW5kZXguanMhLi9zdHlsZXMubGVzc1wiKTtcbmlmKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJykgY29udGVudCA9IFtbbW9kdWxlLmlkLCBjb250ZW50LCAnJ11dO1xuLy8gUHJlcGFyZSBjc3NUcmFuc2Zvcm1hdGlvblxudmFyIHRyYW5zZm9ybTtcblxudmFyIG9wdGlvbnMgPSB7fVxub3B0aW9ucy50cmFuc2Zvcm0gPSB0cmFuc2Zvcm1cbi8vIGFkZCB0aGUgc3R5bGVzIHRvIHRoZSBET01cbnZhciB1cGRhdGUgPSByZXF1aXJlKFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvYWRkU3R5bGVzLmpzXCIpKGNvbnRlbnQsIG9wdGlvbnMpO1xuaWYoY29udGVudC5sb2NhbHMpIG1vZHVsZS5leHBvcnRzID0gY29udGVudC5sb2NhbHM7XG4vLyBIb3QgTW9kdWxlIFJlcGxhY2VtZW50XG5pZihtb2R1bGUuaG90KSB7XG5cdC8vIFdoZW4gdGhlIHN0eWxlcyBjaGFuZ2UsIHVwZGF0ZSB0aGUgPHN0eWxlPiB0YWdzXG5cdGlmKCFjb250ZW50LmxvY2Fscykge1xuXHRcdG1vZHVsZS5ob3QuYWNjZXB0KFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL3N0eWxlcy5sZXNzXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG5ld0NvbnRlbnQgPSByZXF1aXJlKFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL3N0eWxlcy5sZXNzXCIpO1xuXHRcdFx0aWYodHlwZW9mIG5ld0NvbnRlbnQgPT09ICdzdHJpbmcnKSBuZXdDb250ZW50ID0gW1ttb2R1bGUuaWQsIG5ld0NvbnRlbnQsICcnXV07XG5cdFx0XHR1cGRhdGUobmV3Q29udGVudCk7XG5cdFx0fSk7XG5cdH1cblx0Ly8gV2hlbiB0aGUgbW9kdWxlIGlzIGRpc3Bvc2VkLCByZW1vdmUgdGhlIDxzdHlsZT4gdGFnc1xuXHRtb2R1bGUuaG90LmRpc3Bvc2UoZnVuY3Rpb24oKSB7IHVwZGF0ZSgpOyB9KTtcbn1cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9hcHAvc3R5bGVzLmxlc3Ncbi8vIG1vZHVsZSBpZCA9IDg5OFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBDb21tb24gaW1wb3J0c1xuaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IFJlYWN0RE9NIGZyb20gJ3JlYWN0LWRvbSc7XG5cbi8vIFBhcnNlclxuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi4vaW5kZXhcIjtcblxuLy8gQXBwLXNwZWNpZmljIGltcG9ydHNcbmltcG9ydCBTcGVsbEVkaXRvciBmcm9tIFwiLi9TcGVsbEVkaXRvci5qc3hcIjtcblxuLy8gS2ljayBvZmYgb3VyIHRvcC1sZXZlbCBlbGVtZW50XG5SZWFjdERPTS5yZW5kZXIoXG4gIDxTcGVsbEVkaXRvciAvPixcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlYWN0LXJvb3QnKVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9hcHAvaW5kZXguanN4IiwiLy9cbi8vXHQjIENvcmUgYHJ1bGVzYCAtLSBzaW1wbGUgZGF0YXR5cGVzLCBldGMuXG4vL1xuLy8gTk9URTogbWFueSBvZiB0aGUgYmVsb3cgYXJlIGNyZWF0ZWQgYXMgY3VzdG9tIFBhdHRlcm4gc3ViY2xhc3NlcyBmb3IgZGVidWdnaW5nLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBUb2tlbml6ZXIgZnJvbSBcIi4uL1Rva2VuaXplclwiO1xuXG4vLyBDcmVhdGUgYGNvcmVgIHBhcnNlciBjb250ZXh0LlxuY29uc3QgcGFyc2VyID0gUGFyc2VyLmZvckNvbnRleHQoXCJjb3JlXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vXG4vLyAjIyMgSW5zdGFsbCBzdGFuZGFyZCBydWxlc1xuLy9cblxuLy8gQmxvY2sgb2YgYHN0YXRlbWVudHNgIHdpdGggaW5kZW50YXRpb24gZm9yIG5lc3RpbmcuXG5wYXJzZXIuYWRkUnVsZShcInN0YXRlbWVudHNcIiwgUnVsZS5TdGF0ZW1lbnRzKTtcblxuXG5cblxuXG4vLyBCbGFuayBsaW5lIHJlcHJlc2VudGF0aW9uIGluIHBhcnNlciBvdXRwdXQuXG5SdWxlLkJsYW5rTGluZSA9IGNsYXNzIGJsYW5rX2xpbmUgZXh0ZW5kcyBSdWxlIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiBcIlxcblwiO1xuXHR9XG59XG5cbi8vIE9wZW4gYmxvY2sgcmVwcmVzZW50YXRpb24gaW4gcGFyc2VyIG91dHB1dC5cblJ1bGUuT3BlbkJsb2NrID0gY2xhc3Mgb3Blbl9ibG9jayBleHRlbmRzIFJ1bGUge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIFwie1wiO1xuXHR9XG59XG5cblxuLy8gQ2xvc2UgYmxvY2sgcmVwcmVzZW50YXRpb24gaW4gcGFyc2VyIG91dHB1dC5cblJ1bGUuQ2xvc2VCbG9jayA9IGNsYXNzIGNsb3NlX2Jsb2NrIGV4dGVuZHMgUnVsZSB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gXCJ9XCI7XG5cdH1cbn1cblxuXG4vLyBQYXJzZXIgZXJyb3IgcmVwcmVzZW50YXRpb24gaW4gcGFyc2VyIG91dHB1dC5cblJ1bGUuUGFyc2VFcnJvciA9IGNsYXNzIHBhcnNlX2Vycm9yIGV4dGVuZHMgUnVsZSB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRsZXQgbWVzc2FnZSA9IHRoaXMubWVzc2FnZS5zcGxpdChcIlxcblwiKS5qb2luKFwiXFxuLy8gXCIpO1xuXHRcdHJldHVybiBgLy8gRVJST1I6ICR7bWVzc2FnZX1gO1xuXHR9XG59XG5cblxuLy8gQ29tbWVudCBydWxlIC0tIG1hdGNoZXMgdG9rZW5zIG9mIHR5cGUgYFRva2VuaXplci5Db21tZW50YC5cblJ1bGUuQ29tbWVudCA9IGNsYXNzIGNvbW1lbnQgZXh0ZW5kcyBSdWxlIHtcblx0Ly8gQ29tbWVudHMgYXJlIHNwZWNpYWxseSBub2RlcyBpbiBvdXIgdG9rZW4gc3RyZWFtLlxuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnRJbmRleCA9IDAsIHN0YWNrKSB7XG5cdFx0bGV0IHRva2VuID0gdG9rZW5zW3N0YXJ0SW5kZXhdO1xuXHRcdGlmICghKHRva2VuIGluc3RhbmNlb2YgVG9rZW5pemVyLkNvbW1lbnQpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRva2VuLFxuXHRcdFx0bmV4dFN0YXJ0OiBzdGFydEluZGV4ICsgMVxuXHRcdH0pO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiBgLy8ke3RoaXMubWF0Y2hlZC53aGl0ZXNwYWNlfSR7dGhpcy5tYXRjaGVkLmNvbW1lbnR9YDtcblx0fVxufVxucGFyc2VyLmFkZFJ1bGUoXCJjb21tZW50XCIsIFJ1bGUuQ29tbWVudCk7XG5cblxuLy8gYHdvcmRgID0gaXMgYSBzaW5nbGUgYWxwaGFudW1lcmljIHdvcmQuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcblJ1bGUuV29yZCA9IGNsYXNzIHdvcmQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn07XG5SdWxlLldvcmQucHJvdG90eXBlLnBhdHRlcm4gPSAvXlthLXpdW1xcd1xcLV0qJC87XG5wYXJzZXIuYWRkUnVsZShcIndvcmRcIiwgUnVsZS5Xb3JkKTtcblxuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuLy8gTk9URTogV2UgYmxhY2tsaXN0IGEgbG90IG9mIHdvcmRzIGFzIGlkZW50aWZpZXJzLlxuUnVsZS5JZGVudGlmaWVyID0gY2xhc3MgaWRlbnRpZmllciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufTtcblJ1bGUuSWRlbnRpZmllci5wcm90b3R5cGUucGF0dGVybiA9IC9eW2Etel1bXFx3XFwtXSokLztcbmxldCBpZGVudGlmaWVyID0gcGFyc2VyLmFkZFJ1bGUoW1wiaWRlbnRpZmllclwiLCBcImV4cHJlc3Npb25cIl0sIFJ1bGUuSWRlbnRpZmllcik7XG5cbi8vIEFkZCBFbmdsaXNoIHByZXBvc2l0aW9ucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vXG4vLyBXaWtpcGVkaWEgXCJQcmVwb3NpdGlvblwiOlxuLy9cdFwiUHJlcG9zaXRpb25zLi4uYXJlIGEgY2xhc3Mgb2Ygd29yZHMgdGhhdFxuLy9cdGV4cHJlc3Mgc3BhdGlhbCBvciB0ZW1wb3JhbCByZWxhdGlvbnMgIChpbiwgdW5kZXIsIHRvd2FyZHMsIGJlZm9yZSlcbi8vXHRvciBtYXJrIHZhcmlvdXMgc2VtYW50aWMgcm9sZXMgKG9mLCBmb3IpLlxuLy8gVEVTVE1FXG5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFib3V0XCIsIFwiYWJvdmVcIiwgXCJhZnRlclwiLCBcImFuZFwiLCBcImFzXCIsIFwiYXRcIixcblx0XCJiZWZvcmVcIiwgXCJiZWhpbmRcIiwgXCJiZWxvd1wiLCBcImJlbmVhdGhcIiwgXCJiZXNpZGVcIiwgXCJiZXR3ZWVuXCIsIFwiYmV5b25kXCIsIFwiYnlcIixcblx0XCJkZWZpbmVkXCIsIFwiZG93blwiLCBcImR1cmluZ1wiLFxuXHRcImVhY2hcIiwgXCJlbXB0eVwiLCBcImV4YWN0bHlcIiwgXCJleGNlcHRcIixcblx0XCJmb3JcIiwgXCJmcm9tXCIsXG5cdFwiZ3JlYXRlclwiLFxuXHRcIklcIiwgXCJpblwiLCBcImludG9cIixcblx0XCJsZXNzXCIsIFwibG9uZ1wiLFxuXHRcIm1lXCIsIFwibWludXNcIiwgXCJtb3JlXCIsXG5cdFwibmVhclwiLCBcIm5vdFwiLFxuXHRcIm9mXCIsIFwib2ZmXCIsIFwib25cIiwgXCJvbnRvXCIsIFwib3Bwb3NpdGVcIiwgXCJvclwiLCBcIm91dFwiLCBcIm91dHNpZGVcIiwgXCJvdmVyXCIsXG5cdFwic2hvcnRcIiwgXCJzaW5jZVwiLFxuXHRcInRoYW5cIiwgXCJ0aGVcIiwgXCJ0aGVuXCIsIFwidGhyb3VnaFwiLCBcInRocnVcIiwgXCJ0b1wiLCBcInRvd2FyZFwiLCBcInRvd2FyZHNcIixcblx0XCJ1bmRlZmluZWRcIiwgXCJ1bmRlclwiLCBcInVuZGVybmVhdGhcIiwgXCJ1bmlxdWVcIiwgXCJ1bnRpbFwiLCBcInVwXCIsIFwidXBvblwiLCBcInVwc2lkZVwiLFxuXHRcInZlcnN1c1wiLCBcInZzXCIsXG5cdFwid2hlcmVcIiwgXCJ3aXRoXCIsIFwid2l0aGluXCIsIFwid2l0aG91dFwiLFxuKTtcblxuLy8gQWRkIGNvbW1vbiBlbmdsaXNoIHZlcmJzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhcmVcIixcblx0XCJkb1wiLCBcImRvZXNcIixcblx0XCJjb250YWluc1wiLFxuXHRcImhhc1wiLCBcImhhdmVcIixcblx0XCJpc1wiLFxuXHRcInJlcGVhdFwiLFxuXHRcIndhc1wiLCBcIndlcmVcIlxuKTtcblxuLy8gQWRkIHNwZWNpYWwgY29udHJvbCBrZXl3b3JkcyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiZWxzZVwiLFxuXHRcImlmXCIsXG5cdFwib3RoZXJ3aXNlXCIsXG5cdFwid2hpbGVcIlxuKTtcblxuLy8gYFR5cGVgID0gdHlwZSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGFuIHVwcGVyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5UeXBlID0gY2xhc3MgdHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCB0eXBlID0gdGhpcy5tYXRjaGVkO1xuXHRcdHN3aXRjaCh0eXBlKSB7XG5cdFx0XHQvLyBzcGVjaWFsIGNhc2UgdG8gdGFrZSB0aGUgZm9sbG93aW5nIGFzIGxvd2VyY2FzZVxuXHRcdFx0Y2FzZSBcInRleHRcIjpcdFx0cmV0dXJuIFwiU3RyaW5nXCI7XG5cdFx0XHRjYXNlIFwiY2hhcmFjdGVyXCI6XHRyZXR1cm4gXCJDaGFyYWN0ZXJcIjtcblx0XHRcdGNhc2UgXCJudW1iZXJcIjpcdFx0cmV0dXJuIFwiTnVtYmVyXCI7XG5cdFx0XHRjYXNlIFwiaW50ZWdlclwiOlx0XHRyZXR1cm4gXCJJbnRlZ2VyXCI7XG5cdFx0XHRjYXNlIFwiZGVjaW1hbFwiOlx0XHRyZXR1cm4gXCJEZWNpbWFsXCI7XG5cdFx0XHRjYXNlIFwiYm9vbGVhblwiOlx0XHRyZXR1cm4gXCJCb29sZWFuXCI7XG5cdFx0XHRjYXNlIFwib2JqZWN0XCI6XHRcdHJldHVybiBcIk9iamVjdFwiO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIHR5cGUucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0XHR9XG5cdH1cbn07XG5SdWxlLlR5cGUucHJvdG90eXBlLnBhdHRlcm4gPSAvKFtBLVpdW1xcd1xcLV0qfHRleHR8bnVtYmVyfGludGVnZXJ8ZGVjaW1hbHxjaGFyYWN0ZXJ8Ym9vbGVhbnxvYmplY3QpLztcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoW1widHlwZVwiLCBcImV4cHJlc3Npb25cIl0sIFJ1bGUuVHlwZSk7XG50eXBlLmFkZFRvQmxhY2tsaXN0KFwiSVwiKTtcblxuXG5cbi8vIGBudW1iZXJgIGFzIGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBOT1RFOiB5b3UgY2FuIGFsc28gdXNlIGBvbmVgLi4uYHRlbmAgYXMgc3RyaW5ncy4nXG4vLyBUT0RPOiAgYGludGVnZXJgIGFuZCBgZGVjaW1hbGA/ICB0b28gdGVjaHk/XG5SdWxlLk51bWJlciA9IGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdC8vIFNwZWNpYWwgd29yZHMgeW91IGNhbiB1c2UgYXMgbnVtYmVycy4uLlxuXHRzdGF0aWMgTlVNQkVSX05BTUVTID0ge1xuXHRcdHplcm86IDAsXG5cdFx0b25lOiAxLFxuXHRcdHR3bzogMixcblx0XHR0aHJlZTogMyxcblx0XHRmb3VyOiA0LFxuXHRcdGZpdmU6IDUsXG5cdFx0c2l4OiA2LFxuXHRcdHNldmVuOiA3LFxuXHRcdGVpZ2h0OiA4LFxuXHRcdG5pbmU6IDksXG5cdFx0dGVuOiAxMFxuXHR9XG5cblx0Ly8gTnVtYmVycyBnZXQgZW5jb2RlZCBhcyBudW1iZXJzIGluIHRoZSB0b2tlbiBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCB0b2tlbiA9IHRva2Vuc1tzdGFydEluZGV4XTtcblx0XHQvLyBpZiBhIHN0cmluZywgYXR0ZW1wdCB0byBydW4gdGhyb3VnaCBvdXIgTlVNQkVSX05BTUVTXG5cdFx0aWYgKHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIikgdG9rZW4gPSBSdWxlLk51bWJlci5OVU1CRVJfTkFNRVNbdG9rZW5dO1xuXHRcdGlmICh0eXBlb2YgdG9rZW4gIT09IFwibnVtYmVyXCIpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogdG9rZW4sXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0SW5kZXggKyAxXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBDb252ZXJ0IHRvIG51bWJlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxufTtcblxucGFyc2VyLmFkZFJ1bGUoW1wibnVtYmVyXCIsIFwiZXhwcmVzc2lvblwiXSwgUnVsZS5OdW1iZXIpO1xuXG4vLyBBZGQgbnVtYmVyIHdvcmRzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy8gVEVTVE1FXG5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcIm9uZVwiLCBcInR3b1wiLCBcInRocmVlXCIsIFwiZm91clwiLCBcImZpdmVcIixcblx0XCJzaXhcIiwgXCJzZXZlblwiLCBcImVpZ2h0XCIsIFwibmluZVwiLCBcInRlblwiXG4pO1xuXG5cbi8vIExpdGVyYWwgYHRleHRgIHN0cmluZywgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gWW91IGNhbiB1c2UgZWl0aGVyIHNpbmdsZSBvciBkb3VibGUgcXVvdGVzIG9uIHRoZSBvdXRzaWRlIChhbHRob3VnaCBkb3VibGUgcXVvdGVzIGFyZSBwcmVmZXJyZWQpLlxuLy8gUmV0dXJuZWQgdmFsdWUgaGFzIGVuY2xvc2luZyBxdW90ZXMuXG5SdWxlLlRleHQgPSBjbGFzcyB0ZXh0IGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Ly8gVGV4dCBzdHJpbmdzIGdldCBlbmNvZGVkIGFzIGB0ZXh0YCBvYmplY3RzIGluIHRoZSB0b2tlbiBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCB0b2tlbiA9IHRva2Vuc1tzdGFydEluZGV4XTtcblx0XHRpZiAoISh0b2tlbiBpbnN0YW5jZW9mIFRva2VuaXplci5UZXh0KSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiB0b2tlbixcblx0XHRcdG5leHRTdGFydDogc3RhcnRJbmRleCArIDFcblx0XHR9KTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnF1b3RlZFN0cmluZztcblx0fVxufTtcbnBhcnNlci5hZGRSdWxlKFtcInRleHRcIiwgXCJleHByZXNzaW9uXCJdLCBSdWxlLlRleHQpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cblJ1bGUuQm9vbGVhbiA9IGNsYXNzIGJvb2xlYW4gZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdGNhc2UgXCJzdWNjZXNzXCI6XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59O1xuUnVsZS5Cb29sZWFuLnByb3RvdHlwZS5wYXR0ZXJuID0gL14odHJ1ZXxmYWxzZXx5ZXN8bm98b2t8Y2FuY2VsfHN1Y2Nlc3N8ZmFpbHVyZSkkLztcbnBhcnNlci5hZGRSdWxlKFtcImJvb2xlYW5cIiwgXCJleHByZXNzaW9uXCJdLCBSdWxlLkJvb2xlYW4pO1xuXG4vLyBBZGQgYm9vbGVhbiB0b2tlbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwidHJ1ZVwiLCBcImZhbHNlXCIsXG5cdFwieWVzXCIsIFwibm9cIixcblx0XCJva1wiLCBcImNhbmNlbFwiLFxuXHRcInN1Y2Nlc3NcIiwgXCJmYWlsdXJlXCJcbik7XG5cblxuLy8gTGl0ZXJhbCBsaXN0IChhcnJheSksIGVnOiAgYFsxLDIsdHJ1ZSxmYWxzZSBdYFxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGl0ZXJhbF9saXN0XCIsXG5cdFwiXFxcXFtbbGlzdDp7ZXhwcmVzc2lvbn0sXT9cXFxcXVwiLFxuXHRjbGFzcyBsaXRlcmFsX2xpc3QgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgWyR7bGlzdCA/IGxpc3Quam9pbihcIiwgXCIpIDogXCJcIn1dYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gUGFyZW50aGVzaXplZCBleHByZXNzaW9uXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicGFyZW50aGVzaXplZF9leHByZXNzaW9uXCIsXG5cdFwiXFxcXCh7ZXhwcmVzc2lvbn1cXFxcKVwiLFxuXHRjbGFzcyBwYXJlbnRoZXNpemVkX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdGdldCByZXN1bHRzKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMubWF0Y2hlZFsxXTtcblx0XHR9XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IGV4cHJlc3Npb24gPSB0aGlzLnJlc3VsdHMudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyBkb24ndCBkb3VibGUgcGFyZW5zIGlmIG5vdCBuZWNlc3Nhcnlcblx0XHRcdGlmICh0eXBlb2YgZXhwcmVzc2lvbiA9PT0gXCJzdHJpbmdcIiAmJiBleHByZXNzaW9uLnN0YXJ0c1dpdGgoXCIoXCIpICYmIGV4cHJlc3Npb24uZW5kc1dpdGgoXCIpXCIpKSByZXR1cm4gZXhwcmVzc2lvbjtcblx0XHRcdHJldHVybiBgKCR7ZXhwcmVzc2lvbn0pYDtcblx0XHR9XG5cdH1cbilcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9jb3JlLmpzIiwiaW1wb3J0IGdsb2JhbCBmcm9tIFwiLi9nbG9iYWxcIjtcblxuLy8gUmV0dXJuIHRoZSBwbHVyYWwgb2YgYHdvcmRgLlxuLy8gTk9URTogdGhpcyBpcyBub3QgdmVyeSBnb29kIGF0IGFsbCEhIVxuLy8gVE9ETzogZXhjZXB0aW9ucywgZXRjLlxuZXhwb3J0IGZ1bmN0aW9uIHBsdXJhbGl6ZSh3b3JkKSB7XG5cdHJldHVybiB3b3JkICsgXCJzXCI7XG59XG5cbi8vIFJldHVybiB0cnVlIGlmIHdvcmQgaXMgYSBwbHVyYWwuXG4vLyBOT1RFOiBmb3Igd29yZHMgd2hpY2ggYXJlIEJPVEggc2luZ3VsYXIgYW5kIHBsdXJhbCwgdGhpcyB3aWxsIHJldHVybiB0cnVlLlxuZXhwb3J0IGZ1bmN0aW9uIGlzUGx1cmFsKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQgPT09IHBsdXJhbGl6ZSh3b3JkKTtcbn1cblxuXG4vLyBSZXR1cm4gdGhlIHNpbmd1bGFyIG9mIGB3b3JkYC5cbi8vIE5PVEU6IHRoaXMgaXMgbm90IHZlcnkgZ29vZCBhdCBhbGwhISFcbi8vIFRPRE86IGV4Y2VwdGlvbnMsIGV0Yy5cbmV4cG9ydCBmdW5jdGlvbiBzaW5ndWxhcml6ZSh3b3JkKSB7XG5cdHJldHVybiB3b3JkLnJlcGxhY2UoL2U/cyQvLCBcIlwiKTtcbn1cblxuLy8gUmV0dXJuIHRydWUgaWYgd29yZCBpcyBhIHNpbmd1bGFyLlxuLy8gTk9URTogZm9yIHdvcmRzIHdoaWNoIGFyZSBCT1RIIHNpbmd1bGFyIGFuZCBwbHVyYWwsIHRoaXMgd2lsbCByZXR1cm4gdHJ1ZS5cbmV4cG9ydCBmdW5jdGlvbiBpc1Npbmd1bGFyKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQgPT09IHNpbmd1bGFyaXplKHdvcmQpO1xufVxuXG5cbi8vIEV4cG9ydCBhbGwgYXMgYSBsdW1wXG5sZXQgYWxsRXhwb3J0cyA9IHsuLi5leHBvcnRzfTtcbmV4cG9ydCBkZWZhdWx0IGFsbEV4cG9ydHM7XG5cbi8vIERFQlVHOiBwdXQgb24gZ2xvYmFsIGZvciBkZWJ1Z2dpbmcuXG5nbG9iYWwuU1RSSU5HID0gYWxsRXhwb3J0cztcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy91dGlscy9zdHJpbmcuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlZmluaW5nIGNsYXNzZXMgKGtub3duIGFzIGB0eXBlc2ApXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgVG9rZW5pemVyIGZyb20gXCIuLi9Ub2tlbml6ZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5cbi8vIENyZWF0ZSBcIkpTWFwiIHBhcnNlciBjb250ZXh0LlxuY29uc3QgcGFyc2VyID0gUGFyc2VyLmZvckNvbnRleHQoXCJKU1hcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEpTWCBleHByZXNzaW9uLlxuUnVsZS5KU1ggPSBjbGFzcyBqc3hFbGVtZW50IGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Ly8gVGV4dCBzdHJpbmdzIGdldCBlbmNvZGVkIGFzIGB0ZXh0YCBvYmplY3RzIGluIHRoZSB0b2tlbiBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydEluZGV4ID0gMCkge1xuXHRcdGxldCB0b2tlbiA9IHRva2Vuc1tzdGFydEluZGV4XTtcblx0XHRpZiAoISh0b2tlbiBpbnN0YW5jZW9mIFRva2VuaXplci5KU1hFbGVtZW50KSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiB0b2tlbixcblx0XHRcdG5leHRTdGFydDogc3RhcnRJbmRleCArIDFcblx0XHR9KTtcblx0fVxuXG5cdC8vIENvbnZlcnQgb3VyIGF0dHJpYnV0ZXMgdG8gc291cmNlLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIGF0dHJpYnV0ZXMuXG5cdGF0dHJzVG9Tb3VyY2UoY29udGV4dCwganN4RWxlbWVudCA9IHRoaXMubWF0Y2hlZCkge1xuXHRcdGxldCBhdHRyaWJ1dGVzID0ganN4RWxlbWVudC5hdHRyaWJ1dGVzO1xuXHRcdGlmICghYXR0cmlidXRlcyB8fCAhYXR0cmlidXRlcy5sZW5ndGgpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgYXR0cnMgPSBhdHRyaWJ1dGVzLm1hcCggKHsgbmFtZSwgdmFsdWUgfSkgPT4ge1xuXHRcdFx0Ly8gaWYgTk8gdmFsdWUsIGFzc3VtZSBpdCdzIGEgdmFyaWFibGUgb2YgdGhlIHNhbWUgbmFtZVxuXHRcdFx0aWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHZhbHVlID0gbmFtZTtcblx0XHRcdC8vIGlmIGl0J3MgYW4gYXJyYXksIGl0J3MgYSBzcGVsbCBleHByZXNzaW9uLCBwb3NzaWJseSB3aXRoIG5lc3RlZCBKU1ggZWxlbWVudHMuLi5cblx0XHRcdGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgVG9rZW5pemVyLkpTWEV4cHJlc3Npb24pIHtcblx0XHRcdFx0dmFsdWUgPSB0aGlzLmpzeEV4cHJlc3Npb25Ub1NvdXJjZShjb250ZXh0LCB2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBlbHNlIGlmIGEgSlNYIGVsZW1lbnQsIHJlY3Vyc2Vcbi8vVE9ETzogaW5kZW50Li4uXG5cdFx0XHRlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFRva2VuaXplci5KU1hFbGVtZW50KSB7XG5cdFx0XHRcdHZhbHVlID0gdmFsdWUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBPdGhlcndpc2UgaWYgYSBudW1iZXIgb3IgVGV4dCBsaXRlcmFsLCBqdXN0IHVzZSBpdFxuXG5cdFx0XHQvLyBzcGVjaWFsIGNhc2UgYGNsYXNzYCB0byBgY2xhc3NOYW1lYCBiZWNhdXNlIFJlYWN0IGlzIGVmZmluZyBwZXJzbmlja2V0eS5cblx0XHRcdGlmIChuYW1lID09PSBcImNsYXNzXCIpIG5hbWUgPSBcImNsYXNzTmFtZVwiO1xuLy9UT0RPOiBlc2NhcGUgbmFtZXMgd2hpY2ggYXJlIGludmFsaWQgSlMgaWRlbnRpZmllcnNcblx0XHRcdHJldHVybiBgJHtuYW1lfTogJHt2YWx1ZX1gO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGB7ICR7YXR0cnMuam9pbihcIiwgXCIpfSB9YDtcblx0fVxuXG5cdC8vIFJldHVybiBhbiBhcnJheSB3aXRoIHNvdXJjZSBmb3IgZWFjaCBvZiBvdXIgY2hpbGRyZW4uXG5cdC8vIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgd2UgZG9uJ3QgaGF2ZSBhbnkgY2hpbGRyZW4uXG5cdGNoaWxkcmVuVG9Tb3VyY2UoY29udGV4dCwganN4RWxlbWVudCA9IHRoaXMubWF0Y2hlZCkge1xuXHRcdGxldCBjaGlsZHJlbiA9IGpzeEVsZW1lbnQuY2hpbGRyZW47XG5cdFx0aWYgKCFjaGlsZHJlbiB8fCBjaGlsZHJlbi5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIGNoaWxkcmVuLm1hcChjaGlsZCA9PiB7XG4vL1RPRE86IGVzY2FwZSBpbm5lciBxdW90ZXMuLi5cblx0XHRcdGlmICh0eXBlb2YgY2hpbGQgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0Ly9mb3JnZXQgaXQgaWYgd2hpdGVzcGFjZSBvbmx5Li4uID8/P1xuXHRcdFx0XHRsZXQgdGV4dCA9IGNoaWxkLnRyaW0oKTtcblx0XHRcdFx0aWYgKCF0ZXh0KSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0XHRyZXR1cm4gYFwiJHt0ZXh0fVwiYDtcblx0XHRcdH1cblx0XHRcdGlmIChjaGlsZCBpbnN0YW5jZW9mIFRva2VuaXplci5KU1hFbGVtZW50KSB7XG5cdFx0XHRcdGxldCBjaGlsZFNvdXJjZSA9IHRoaXMuanN4RWxlbWVudFRvU291cmNlKGNvbnRleHQsIGNoaWxkKTtcblx0XHRcdFx0cmV0dXJuIGNoaWxkU291cmNlLnNwbGl0KFwiXFxuXCIpLmpvaW4oXCJcXG5cXHRcIik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2hpbGQgaW5zdGFuY2VvZiBUb2tlbml6ZXIuSlNYRXhwcmVzc2lvbikge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5qc3hFeHByZXNzaW9uVG9Tb3VyY2UoY29udGV4dCwgY2hpbGQpO1xuXHRcdFx0fVxuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKFwiY2hpbGRyZW5Ub1NvdXJjZSgpOiBkb24ndCB1bmRlcnN0YW5kIGNoaWxkXCIgKyAgY2hpbGQpO1xuXHRcdH0pXG5cdFx0Ly8gcmVtb3ZlIHVuZGVmaW5lZC9lbXB0eSBzdHJpbmcgcnVsZXNcblx0XHQuZmlsdGVyKEJvb2xlYW4pO1xuXHR9XG5cblx0Ly8gQ29udmVydCBKU1ggZXhwcmVzc2lvbiAoIGB7Li4ufWAgKSB0byBKUyBzb3VyY2UuXG5cdGpzeEV4cHJlc3Npb25Ub1NvdXJjZShjb250ZXh0LCBqc3hFeHByZXNzaW9uKSB7XG5cdFx0bGV0IHRva2VucyA9IGpzeEV4cHJlc3Npb24udG9rZW5zO1xuY29uc29sZS5pbmZvKGpzeEV4cHJlc3Npb24sIHRva2Vucyk7XG5cdFx0cmV0dXJuIFwiL1wiICsgYCpUT0RPOiAke3Rva2Vucy5qb2luKFwiIFwiKX0qYCArIFwiL1wiO1xuXHR9XG5cblx0anN4RWxlbWVudFRvU291cmNlKGNvbnRleHQsIGpzeEVsZW1lbnQgPSB0aGlzLm1hdGNoZWQpIHtcblx0XHQvLyBnZXQgdGhlIGJpdHMgb2YgdGhlIG91dHB1dFxuXHRcdGxldCB0YWdOYW1lID0gYFwiJHtqc3hFbGVtZW50LnRhZ05hbWV9XCJgO1xuXHRcdGxldCBhdHRycyA9IHRoaXMuYXR0cnNUb1NvdXJjZShjb250ZXh0LCBqc3hFbGVtZW50KTtcblx0XHRsZXQgY2hpbGRyZW4gPSB0aGlzLmNoaWxkcmVuVG9Tb3VyY2UoY29udGV4dCwganN4RWxlbWVudCk7XG5cblx0XHRsZXQgb3V0cHV0ID0gYGNyZWF0ZUVsZW1lbnQoJHt0YWdOYW1lfWA7XG5cdFx0aWYgKCFhdHRycyAmJiBjaGlsZHJlbikgYXR0cnMgPSBcIm51bGxcIjtcblxuXHRcdGlmIChhdHRycykgb3V0cHV0ICs9IGAsICR7YXR0cnN9YDtcblx0XHRpZiAoY2hpbGRyZW4pIHtcblx0XHRcdG91dHB1dCArPSBcIixcXG5cXHRcIiArIGNoaWxkcmVuLmpvaW4oXCIsXFxuXFx0XCIpICsgXCJcXG5cIjtcblx0XHR9XG5cdFx0b3V0cHV0ICs9IFwiKVwiXG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5qc3hFbGVtZW50VG9Tb3VyY2UoY29udGV4dCwgdGhpcy5tYXRjaGVkKTtcblx0fVxufTtcblxuLy8gRGVmaW5lIGpzeCBibG9jayBhcyBhbiBgZXhwcmVzc2lvbmAgT1IgYSBgc3RhdGVtZW50YC5cbnBhcnNlci5hZGRSdWxlKFtcImpzeFwiLCBcImV4cHJlc3Npb25cIiwgXCJzdGF0ZW1lbnRcIl0sIFJ1bGUuSlNYKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9KU1guanMiLCIvLyBFeHBvcnQgYWxsIHN0YW5kYXJkIFwiZW5nbGlzaFwiIHJ1bGVzLlxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5cbi8vIExvYWQgYWxsIHN0YW5kYXJkIHJ1bGVzIGZpbGVzLlxuaW1wb3J0IFwiLi9jb3JlXCI7XG5pbXBvcnQgXCIuL2xpc3RzXCI7XG5pbXBvcnQgXCIuL29wZXJhdG9yc1wiO1xuaW1wb3J0IFwiLi9pZlwiO1xuaW1wb3J0IFwiLi9zdGF0ZW1lbnRzXCI7XG5pbXBvcnQgXCIuL3R5cGVzXCI7XG5pbXBvcnQgXCIuL0pTWFwiO1xuXG5cbi8vIENyZWF0ZSBwYXJzZXIgZm9yIGFsbC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwiYWxsXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBBbmQgZGVwZW5kIG9uIHN0YW5kYXJkIHJ1bGVzIGxvYWRlZCBhYm92ZS5cbnBhcnNlci5pbXBvcnQoXCJjb3JlXCIsIFwibGlzdHNcIiwgXCJvcGVyYXRvcnNcIiwgXCJpZlwiLCBcInN0YXRlbWVudHNcIiwgXCJ0eXBlc1wiLCBcIkpTWFwiKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9hbGwuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGlmIHN0YXRlbWVudHMuXG4vL1xuXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlXCI7XG5cbi8vIENyZWF0ZSBcImlmXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcImlmXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBJbXBvcnQgY29yZSBydWxlcy5cbmltcG9ydCBcIi4vY29yZVwiO1xucGFyc2VyLmltcG9ydChcImNvcmVcIik7XG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImlmXCIsXG5cdFwiaWYge2NvbmRpdGlvbjpleHByZXNzaW9ufSAodGhlbnw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGlmXyBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBjb25kaXRpb24sIHN0YXRlbWVudCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0aWYgKHN0YXRlbWVudCkgcmV0dXJuIGBpZiAoJHtjb25kaXRpb259KSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdHJldHVybiBgaWYgKCR7Y29uZGl0aW9ufSlgXG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImJhY2t3YXJkc19pZlwiLFxuXHRcIntzdGF0ZW1lbnR9IGlmIHtjb25kaXRpb246ZXhwcmVzc2lvbn0gKD86KGVsc2V8b3RoZXJ3aXNlKSB7ZWxzZVN0YXRlbWVudDpzdGF0ZW1lbnR9KT9cIixcblx0Y2xhc3MgYmFja3dhcmRzX2lmIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdGxlZnRSZWN1cnNpdmUgPSB0cnVlO1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGNvbmRpdGlvbiwgc3RhdGVtZW50LCBlbHNlU3RhdGVtZW50IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAoZWxzZVN0YXRlbWVudCkgcmV0dXJuIGBpZiAoJHtjb25kaXRpb259KSB7ICR7c3RhdGVtZW50fSB9IGVsc2UgeyAke2Vsc2VTdGF0ZW1lbnR9IH1gXG5cdFx0XHRyZXR1cm4gYGlmICgke2NvbmRpdGlvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJlbHNlX2lmXCIsXG5cdFwiKGVsc2V8b3RoZXJ3aXNlKSBpZiB7Y29uZGl0aW9uOmV4cHJlc3Npb259ICh0aGVufDopIHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBlbHNlX2lmIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGNvbmRpdGlvbiwgc3RhdGVtZW50IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7O1xuXHRcdFx0aWYgKHN0YXRlbWVudCkgcmV0dXJuIGBlbHNlIGlmICgke2NvbmRpdGlvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0cmV0dXJuIGBlbHNlIGlmICgke2NvbmRpdGlvbn0pYFxuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJlbHNlXCIsXG5cdFwiKGVsc2V8b3RoZXJ3aXNlKSB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZWxzZV8gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhdGVtZW50IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAoc3RhdGVtZW50KSByZXR1cm4gYGVsc2UgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRyZXR1cm4gYGVsc2VgXG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2lmLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWFsaW5nIHdpdGggbGlzdHNcbi8vXG5cbi8vIFRPRE86IGNvbmZpcm0gaWRlbnRpZmllcnMgYXJlIHBsdXJhbCBpbiBzb21lIG9mIHRoZSBiZWxvdz9cbi8vIFRPRE86IGBsaXN0LmNsb25lKClgIHRvIHJldHVybiBuZXcgbGlzdCBvZiBzYW1lIHR5cGUuXG5cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcblxuaW1wb3J0IHsgaXNQbHVyYWwsIHNpbmd1bGFyaXplIH0gZnJvbSBcIi4uL3V0aWxzL3N0cmluZ1wiO1xuXG4vLyBDcmVhdGUgXCJsaXN0c1wiIHBhcnNlciBjb250ZXh0LlxuY29uc3QgcGFyc2VyID0gUGFyc2VyLmZvckNvbnRleHQoXCJsaXN0c1wiKTtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gSW1wb3J0IGNvcmUgcnVsZXMuXG5pbXBvcnQgXCIuL2NvcmVcIjtcbnBhcnNlci5pbXBvcnQoXCJjb3JlXCIpO1xuXG5cbi8vIFdPUktJTkcgRlJPTSBPVEhFUiBSVUxFUyAodGVzdG1lKVxuLy9cdGB0aGUgbGVuZ3RoIG9mIDxsaXN0PmBcbi8vXHRgPHRoaW5nPiBpcyBub3Q/IGluIDxsaXN0PmBcbi8vXHRgPGxpc3Q+IGlzIG5vdD8gZW1wdHlgXG4vL1x0YHNldCBpdGVtIDEgb2YgbXlMaXN0IHRvICdhJ2BcblxuXG4vLyBUT0RPOiBcdGBjcmVhdGUgbGlzdCB3aXRoIDxleHA+LCA8ZXhwPiwgPGV4cD5gXG4vLyBUT0RPOlx0YGR1cGxpY2F0ZSBsaXN0YFxuLy8gVE9ETzpcdGBkdXBsaWNhdGUgbGlzdCB3aXRoIDxleHA+LCA8ZXhwPiwgPGV4cD5gID8/P1xuLy8gVE9ETzpcdGB0aGUgc2l6ZSBvZiA8bGlzdD5gID0+IHdpbGwgbWFwIHRvIGBsaXN0LnNpemVgLi4uXG4vL1x0XHRcdFx0LSBpbnN0YWxsIGBzaXplYCBhcyBhbiBhbGlhcyB0byBgbGVuZ3RoYD9cbi8vIFRPRE86XHRgbW92ZSA8dGhpbmc+IHRvIGVuZCBvZiA8bGlzdD5gID8/P1xuLy8gVE9ETzpcdGBTZXRgIGZvciBhIHVuaXF1ZSBsaXN0P1xuLy8gVE9ETzpcdHR5cGVkIGxpc3Q/XG4vLyBUT0RPOlx0bGlzdCB3aGljaCB3b24ndCB0YWtlIG51bGwvdW5kZWZpbmVkXG5cblxuLy8gUmV0dXJuIHRoZSBsZW5ndGggb2YgdGhlIGxpc3QuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGlzdF9sZW5ndGhcIixcblx0XCJ0aGU/IG51bWJlciBvZiB7aWRlbnRpZmllcn0gaW4ge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9sZW5ndGggZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaXN0LCBpZGVudGlmaWVyIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG4vLyBUT0RPOiBzcGVjaWFsIGNhc2UgJ3dvcmRzJywgJ2xpbmVzJywgZXRjXG5cdFx0XHRyZXR1cm4gYCR7bGlzdH0ubGVuZ3RoYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJldHVybiB0aGUgZmlyc3QgcG9zaXRpb24gb2Ygc3BlY2lmaWVkIGl0ZW0gaW4gdGhlIGxpc3QgYXMgYW4gYXJyYXkuXG4vLyBJZiBpdGVtIGlzIG5vdCBmb3VuZCwgcmV0dXJucyBgdW5kZWZpbmVkYC5cbi8vIE5PVEU6IHRoaXMgcG9zaXRpb24gcmV0dXJuZWQgaXMgKioxLWJhc2VkKiouXG4vL1RFU1RNRVxuLy8gVE9ETzogYHBvc2l0aW9uc2AsIGBsYXN0IHBvc2l0aW9uYCwgYGFmdGVyLi4uYFxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGlzdF9wb3NpdGlvblwiLFxuXHRcInRoZT8gcG9zaXRpb24gb2Yge3RoaW5nOmV4cHJlc3Npb259IGluIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcG9zaXRpb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5wb3NpdGlvbk9mKCR7dGhpbmd9LCAke2xpc3R9KWBcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRPcmRpbmFsIG51bWJlcnMgKGZpcnN0LCBzZWNvbmQsIGxhc3QsIGV0YykuXG4vLyBUT0RPOiBzaXh0eS1maWZ0aCwgdHdvIGh1bmRyZWQgZm9ydHkgbmludGguLi5cbi8vXG5wYXJzZXIuYWRkUnVsZShcIm9yZGluYWxcIiwgY2xhc3Mgb3JkaW5hbCBleHRlbmRzIFJ1bGUuQWx0ZXJuYXRpdmVze30pO1xuY2xhc3Mgb3JkaW5hbCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7fVxucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZmlyc3RcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gMSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNlY29uZFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAyIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwidGhpcmRcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gMyB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImZvdXJ0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA0IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZmlmdGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNpeHRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDYgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJzZXZlbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDcgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJlaWdodGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gOCB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcIm5pbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDkgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJ0ZW50aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxMCB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInBlbnVsdGltYXRlXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IC0yIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZmluYWxcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJsYXN0XCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IC0xIH0pO1xuXG5cbi8vIHRyZWF0IGxpc3QgYXMgYSBzdGFjayBvciBxdWV1ZVxuLy9URVNUTUVcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInRvcFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiYm90dG9tXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IC0xIH0pO1xuXG5cbi8vIEluZGV4IGV4cHJlc3Npb246IG51bWVyaWMgcG9zaXRpb24gaW4gc29tZSBsaXN0LlxuLy9cdGUuZy5cdGBjYXJkIDEgb2YgdGhlIHBpbGVgXG4vL1x0XHRcdGBjYXJkICMyIG9mIHRoZSBwaWxlYFxuLy9cdFx0XHRgdGhlIGZpcnN0IGNhcmQgb2YgdGhlIHBpbGVgXG4vL1xuLy8gTk9URTogTmVnYXRpdmUgbnVtZXJpYyBwb3NpdGlvbnMgY29tZSBmcm9tIHRoZSBFTkQgb2YgdGhlIGxpc3QuXG4vL1x0ZS5nLlx0YGNhcmQgLTEgb2YgdGhlIHBpbGVgXG4vL1xuLy8gTk9URTogT3VyIHBvc2l0aW9ucyBhcmUgKioxLWJhc2VkKiogYW5kIEphdmFzY3JpcHQgaXMgKiowLWJhc2VkKiouXG4vL1x0XHQgZS5nLiBgaXRlbSAxIG9mIHRoZSBhcnJheWAgID0gYGFycmF5WzBdYFxuLy9cbi8vIFRPRE86IGlmIGBpZGVudGlmaWVyYCBpcyBcIndvcmRcIiwgb3V0cHV0IGBnZXRXb3JkKClgIGV0Y1xucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicG9zaXRpb25fZXhwcmVzc2lvblwiLFxuXHRbXG5cdFx0XCJ7aWRlbnRpZmllcn0ge3Bvc2l0aW9uOmV4cHJlc3Npb259IG9mICh0aGU/KSB7ZXhwcmVzc2lvbn1cIixcblx0XHRcInRoZSB7cG9zaXRpb246b3JkaW5hbH0ge2lkZW50aWZpZXJ9IG9mICh0aGU/KSB7ZXhwcmVzc2lvbn1cIlxuXHRdLFxuXHRjbGFzcyBwb3NpdGlvbl9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9ue1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIHBvc2l0aW9uLCBleHByZXNzaW9uIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG4vLyBUT0RPOiBzcGVjaWFsIGNhc2UgJ3dvcmRzJywgJ2xpbmVzJywgZXRjXG5cblx0XHRcdC8vIElmIHdlIGdvdCBhIHBvc2l0aXZlIG51bWJlciBsaXRlcmFsLCBjb21wZW5zYXRlIGZvciBKUyAwLWJhc2VkIGFycmF5cyBub3csXG5cdFx0XHQvLyBmb3IgbmljZXIgb3V0cHV0LlxuXHRcdFx0aWYgKHR5cGVvZiBwb3NpdGlvbiA9PT0gXCJudW1iZXJcIiAmJiBwb3NpdGlvbiA+IDApIHtcblx0XHRcdFx0cmV0dXJuIGAke2V4cHJlc3Npb259WyR7cG9zaXRpb24gLSAxfV1gO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7cG9zaXRpb259KWA7XG5cblx0Ly8gVGhpcyBpcyBzYWZlciwgYnV0IHVzaW5nIHRoZSBhYm92ZSBzb21ldGltZXMgZm9yIGRlbW8gcHVycG9zZXNcblx0Ly9cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7cG9zaXRpb259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBQaWNrIGEgU0lOR0xFIHJhbmRvbSBpdGVtIGZyb20gdGhlIGxpc3QuXG4vLyBUT0RPOiBjb25maXJtIGlkZW50aWZpZXIgaXMgcGx1cmFsP1xuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmRvbV9wb3NpdGlvbl9leHByZXNzaW9uXCIsXG5cdFwiYSByYW5kb20ge2lkZW50aWZpZXJ9IChvZnxmcm9tfGluKSAodGhlKT8ge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcmFuZG9tX3Bvc2l0aW9uX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0UmFuZG9tSXRlbU9mKCR7bGlzdH0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFBpY2sgYSB1bmlxdWUgc2V0IG9mIHJhbmRvbSBpdGVtcyBmcm9tIHRoZSBsaXN0LCByZXR1cm5pbmcgYW4gYXJyYXkuXG4vLyBUT0RPOiBgdHdvIHJhbmRvbSBpdGVtcy4uLmBcbi8vIFRPRE86IGNvbmZpcm0gaWRlbnRpZmllciBpcyBwbHVyYWw/XG4vLyBUT0RPOiBgbGlzdC5jbG9uZSgpYCB0byByZXR1cm4gbmV3IGxpc3Qgb2Ygc2FtZSB0eXBlLlxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmRvbV9wb3NpdGlvbnNfZXhwcmVzc2lvblwiLFxuXHRcIntudW1iZXJ9IHJhbmRvbSB7aWRlbnRpZmllcn0gKG9mfGZyb218aW4pICh0aGUpPyB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5kb21fcG9zaXRpb25zX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG51bWJlciwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5kb21JdGVtc09mKCR7bGlzdH0sICR7bnVtYmVyfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBSYW5nZSBleHByZXNzaW9uLlxuLy8gUmV0dXJucyBhIG5ldyBsaXN0LlxuLy8gTk9URTogYHN0YXJ0YCBpcyAqKjEtYmFzZWQqKi5cbi8vIE5PVEU6IGBlbmRgIGlzIGluY2x1c2l2ZSFcbi8vIFRPRE86IGNvbmZpcm0gaWRlbnRpZmllciBpcyBwbHVyYWw/XG4vLyBUT0RPOiBgbGlzdC5jbG9uZSgpYCB0byByZXR1cm4gbmV3IGxpc3Qgb2Ygc2FtZSB0eXBlLlxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmdlX2V4cHJlc3Npb25cIixcblx0XCJ7aWRlbnRpZmllcn0ge3N0YXJ0OmV4cHJlc3Npb259IHRvIHtlbmQ6ZXhwcmVzc2lvbn0gb2Yge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcmFuZ2VfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhcnQsIGVuZCwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5nZSgke2xpc3R9LCAke3N0YXJ0fSwgJHtlbmR9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBTdGFydGluZyByYW5nZSBleHByZXNzaW9uLlxuLy8gUmV0dXJucyBhIG5ldyBsaXN0LlxuLy8gZS5nLlx0YGZpcnN0IDQgaXRlbXMgb2YgbGlzdGBcbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJyYW5nZV9leHByZXNzaW9uXCIsXG5cdFwiZmlyc3Qge251bWJlcjpleHByZXNzaW9ufSB7aWRlbnRpZmllcn0gKGlufG9mKSB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBudW1iZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0UmFuZ2UoJHtsaXN0fSwgMSwgJHtudW1iZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBFbmRpbmcgcmFuZ2UgZXhwcmVzc2lvbi5cbi8vIFJldHVybnMgYSBuZXcgbGlzdC5cbi8vIGUuZy5cdGBsYXN0IDQgaXRlbXMgb2YgbGlzdGBcbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJyYW5nZV9leHByZXNzaW9uXCIsXG5cdFwibGFzdCB7bnVtYmVyOmV4cHJlc3Npb259IHtpZGVudGlmaWVyfSAoaW58b2YpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJhbmdlX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG51bWJlciwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRFbmRSYW5nZSgke2xpc3R9LCAxLCAke251bWJlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gUmFuZ2UgZXhwcmVzc2lvbiBzdGFydGluZyBhdCBzb21lIGl0ZW0gaW4gdGhlIGxpc3QuXG4vLyBSZXR1cm5zIGEgbmV3IGxpc3QuXG4vLyBJZiBpdGVtIGlzIG5vdCBmb3VuZCwgcmV0dXJucyBhbiBlbXB0eSBsaXN0LiAoPz8/KVxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmdlX2V4cHJlc3Npb25cIixcblx0XCJ7aWRlbnRpZmllcn0gKGlufG9mKSB7bGlzdDpleHByZXNzaW9ufSBzdGFydGluZyB3aXRoIHt0aGluZzpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5nZSgke2xpc3R9LCBzcGVsbC5wb3NpdGlvbk9mKCR7dGhpbmd9LCAke2xpc3R9KSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBMaXN0IGZpbHRlci5cbi8vIE5PVEU6IHdlIHdpbGwgc2luZ3VsYXJpemUgYGlkZW50aWZpZXJgIGFuZCB1c2UgdGhhdCBhcyB0aGUgYXJndW1lbnQgdG8gYGV4cHJlc3Npb25gLlxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpc3RfZmlsdGVyXCIsXG5cdFwie2lkZW50aWZpZXJ9IChpbnxvZikge2xpc3Q6ZXhwcmVzc2lvbn0gd2hlcmUge2NvbmRpdGlvbjpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X2ZpbHRlciBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgY29uZGl0aW9uLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyB1c2Ugc2luZ3VsYXIgb2YgaWRlbnRpZmllciBmb3IgbWV0aG9kIGFyZ3VtZW50XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBzaW5ndWxhcml6ZShpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHRcdHJldHVybiBgc3BlbGwuZmlsdGVyKCR7bGlzdH0sICR7YXJndW1lbnR9ID0+ICR7Y29uZGl0aW9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBTZXQgbWVtYmVyc2hpcC5cbi8vIE5PVEU6IHdlIHdpbGwgc2luZ3VsYXJpemUgYGlkZW50aWZpZXJgIGFuZCB1c2UgdGhhdCBhcyB0aGUgYXJndW1lbnQgdG8gYGV4cHJlc3Npb25gLlxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpc3RfbWVtYmVyc2hpcF90ZXN0XCIsXG5cdFwie2xpc3Q6ZXhwcmVzc2lvbn0gKG9wZXJhdG9yOmhhc3xoYXMgbm98ZG9lc250IGhhdmV8ZG9lcyBub3QgaGF2ZSkge2lkZW50aWZpZXJ9IHdoZXJlIHtmaWx0ZXI6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9tZW1iZXJzaGlwX3Rlc3QgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIG9wZXJhdG9yLCBmaWx0ZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBiYW5nID0gb3BlcmF0b3IgPT09IFwiaGFzXCIgPyBcIlwiIDogXCIhXCI7XG5cdFx0XHQvLyB1c2Ugc2luZ3VsYXIgb2YgaWRlbnRpZmllciBmb3IgbWV0aG9kIGFyZ3VtZW50XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBzaW5ndWxhcml6ZShpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHRcdHJldHVybiBgJHtiYW5nfXNwZWxsLmFueSgke2xpc3R9LCAke2FyZ3VtZW50fSA9PiAke2ZpbHRlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vXG4vL1x0QWRkaW5nIHRvIGxpc3QgKGluLXBsYWNlKVxuLy9cblxuLy8gQWRkIHRvIGVuZCBvZiBsaXN0LlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9hcHBlbmRcIixcblx0W1xuXHRcdFwiYXBwZW5kIHt0aGluZzpleHByZXNzaW9ufSB0byB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRcdFwiYWRkIHt0aGluZzpleHByZXNzaW9ufSB0byAoKHRoZT8pIGVuZCBvZik/IHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdF0sXG5cdGNsYXNzIGxpc3RfYXBwZW5kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmFwcGVuZCgke2xpc3R9LCAke3RoaW5nfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gQWRkIHRvIGJlZ2lubmluZyBvZiBsaXN0LlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9wcmVwZW5kXCIsXG5cdFtcblx0XHRcInByZXBlbmQge3RoaW5nOmV4cHJlc3Npb259IHRvIHtsaXN0OmV4cHJlc3Npb259XCIsXG4vL1widG9wXCIgYXMgc3RhY2sgPT09IGJvdHRvbT9cblx0XHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8gdGhlIChzdGFydHxmcm9udHx0b3ApIG9mIHtsaXN0OmV4cHJlc3Npb259XCJcblx0XSxcblx0Y2xhc3MgbGlzdF9wcmVwZW5kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnByZXBlbmQoJHtsaXN0fSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIEFkZCB0byBtaWRkbGUgb2YgbGlzdCwgcHVzaGluZyBleGlzdGluZyBpdGVtcyBvdXQgb2YgdGhlIHdheS5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3Rfc3BsaWNlXCIsXG5cdFwiYWRkIHt0aGluZzpleHByZXNzaW9ufSB0byB7bGlzdDpleHByZXNzaW9ufSBhdCBwb3NpdGlvbiB7cG9zaXRpb246ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9zcGxpY2UgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIHBvc2l0aW9uLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnNwbGljZSgke2xpc3R9LCAke3Bvc2l0aW9ufSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gVE9ETzogIFx0XCJhZGQge3RoaW5nOmV4cHJlc3Npb259IHRvIHtsaXN0OmV4cHJlc3Npb259IGJlZm9yZSB7aXRlbTpleHByZXNzaW9ufVwiLFxuXG4vLyBBZGQgdG8gbWlkZGxlIG9mIGxpc3QsIHB1c2hpbmcgZXhpc3RpbmcgaXRlbXMgb3V0IG9mIHRoZSB3YXkuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X2FkZF9hZnRlclwiLFxuXHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8ge2xpc3Q6ZXhwcmVzc2lvbn0gYWZ0ZXIge2l0ZW06ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9zcGxpY2UgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIGl0ZW0sIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuc3BsaWNlKCR7bGlzdH0sIHNwZWxsLnBvc2l0aW9uT2YoJHtsaXN0fSwgJHtpdGVtfSksICR7dGhpbmd9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHRSZW1vdmluZyBmcm9tIGxpc3QgKGluLXBsYWNlKVxuLy9cblxuLy8gRW1wdHkgbGlzdC5cbi8vVE9ETzogbWFrZSBgZW1wdHlgIGFuZC9vciBgY2xlYXJgIGEgZ2VuZXJpYyBzdGF0ZW1lbnQ/Pz9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfZW1wdHlcIixcblx0XCIoZW1wdHl8Y2xlYXIpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfZW1wdHkgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuY2xlYXIoJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gUmVtb3ZlIG9uZSBpdGVtIGZyb20gbGlzdCBieSBwb3NpdGlvbi5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlX3Bvc2l0aW9uXCIsXG5cdFwicmVtb3ZlIHtpZGVudGlmaWVyfSB7bnVtYmVyOmV4cHJlc3Npb259IG9mIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcmVtb3ZlX3Bvc2l0aW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBudW1iZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwucmVtb3ZlSXRlbSgke2xpc3R9LCAke251bWJlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJlbW92ZSByYW5nZSBvZiB0aGluZ3MgZnJvbSBsaXN0LlxuLy8gTk9URTogYHN0YXJ0YCBpcyAqKjEtYmFzZWQqKi5cbi8vIE5PVEU6IGBlbmRgIGlzIGluY2x1c2l2ZSFcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlX3JhbmdlXCIsXG5cdFwicmVtb3ZlIHtpZGVudGlmaWVyfSB7c3RhcnQ6ZXhwcmVzc2lvbn0gdG8ge2VuZDpleHByZXNzaW9ufSBvZiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3JlbW92ZV9wb3NpdGlvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhcnQsIGVuZCwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5yZW1vdmVSYW5nZSgke2xpc3R9LCAke3N0YXJ0fSwgJHtlbmR9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFJlbW92ZSBhbGwgaW5zdGFuY2VzIG9mIHNvbWV0aGluZyBmcm9tIGEgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlXCIsXG5cdFwicmVtb3ZlIHt0aGluZzpleHByZXNzaW9ufSBmcm9tIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcmVtb3ZlIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5yZW1vdmUoJHtsaXN0fSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJlbW92ZSBhbGwgaXRlbXMgZnJvbSBsaXN0IHdoZXJlIGNvbmRpdGlvbiBpcyB0cnVlLlxuLy8gTk9URTogd2Ugd2lsbCBzaW5ndWxhcml6ZSBgaWRlbnRpZmllcmAgYW5kIHVzZSB0aGF0IGFzIHRoZSBhcmd1bWVudCB0byBgZXhwcmVzc2lvbmAuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3JlbW92ZV93aGVyZVwiLFxuXHRcInJlbW92ZSB7aWRlbnRpZmllcn0gKGlufG9mfGZyb20pIHtsaXN0OmV4cHJlc3Npb259IHdoZXJlIHtjb25kaXRpb246ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9yZW1vdmVfd2hlcmUgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGNvbmRpdGlvbiwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gdXNlIHNpbmd1bGFyIG9mIGlkZW50aWZpZXIgZm9yIG1ldGhvZCBhcmd1bWVudFxuXHRcdFx0bGV0IGFyZ3VtZW50ID0gc2luZ3VsYXJpemUoaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnJlbW92ZVdoZXJlKCR7bGlzdH0sICR7YXJndW1lbnR9ID0+ICR7Y29uZGl0aW9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdFJhbmRvbSAoaW4tcGxhY2UpIGxpc3QgbWFuaXB1bGF0aW9uLlxuLy9cblxuLy8gUmV2ZXJzZSBsaXN0IGluLXBsYWNlLlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9yZXZlcnNlXCIsXG5cdFwicmV2ZXJzZSB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3JldmVyc2UgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwucmV2ZXJzZSgke2xpc3R9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBTaHVmZmxlIGxpc3QgaW4tcGxhY2UuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3NodWZmbGVcIixcblx0XCIocmFuZG9taXplfHNodWZmbGUpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3Rfc2h1ZmZsZSBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5zaHVmZmxlKCR7bGlzdH0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gSXRlcmF0aW9uXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X2l0ZXJhdGlvblwiLFxuXHRcImZvciAoZWFjaCk/IHtpdGVtVmFyOmlkZW50aWZpZXJ9KD86KGFuZHwsKSB7cG9zaXRpb25WYXI6aWRlbnRpZmllcn0pPyBpbiB7bGlzdDpleHByZXNzaW9ufTo/XCIsXG5cdGNsYXNzIGxpc3RfaXRlcmF0aW9uIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGl0ZW1WYXIsIHBvc2l0aW9uVmFyLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAocG9zaXRpb25WYXIpIHtcblx0XHRcdFx0cmV0dXJuIGBmb3IgKGxldCAke3Bvc2l0aW9uVmFyfSA9IDE7ICR7cG9zaXRpb25WYXJ9IDw9ICR7bGlzdH0ubGVuZ3RoOyAke3Bvc2l0aW9uVmFyfSsrKSB7XFxuYFxuXHRcdFx0XHRcdCsgIGBcdGxldCAke2l0ZW1WYXJ9ID0gJHtsaXN0fVske3Bvc2l0aW9uVmFyfS0xXWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYGZvciAobGV0ICR7aXRlbVZhcn0gb2YgJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBSYW5nZVxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmdlX2V4cHJlc3Npb25cIixcblx0XCJyYW5nZSB7c3RhcnQ6ZXhwcmVzc2lvbn0gdG8ge2VuZDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzdGFydCwgZW5kIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldFJhbmdlKCR7c3RhcnR9LCAke2VuZH0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvbGlzdHMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGluZml4IGFuZCBwcmVmaXggb3BlcmF0b3JzLlxuLy9cblxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgXCJvcGVyYXRvcnNcIiBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwib3BlcmF0b3JzXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBJbXBvcnQgY29yZSBydWxlcy5cbmltcG9ydCBcIi4vY29yZVwiO1xucGFyc2VyLmltcG9ydChcImNvcmVcIik7XG5cbi8vIyMgSW5maXggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+IHtyaHN9YCwgZWc6IGBhIGlzIDFgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIHR3byBhcmd1bWVudHMgKGBsaHNgIGFuZCBgcmhzYCkgaW50byBvdXRwdXQuXG5cbi8vIE5PVEU6IGBwcmVjZWRlbmNlYCBudW1iZXJzIGNvbWUgZnJvbSBKYXZhc2NyaXB0IGVxdWl2YWxlbnRzXG4vL1x0XHQgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvT3BlcmF0b3JzL09wZXJhdG9yX1ByZWNlZGVuY2VcblxucGFyc2VyLmFkZFJ1bGUoXCJpbmZpeF9vcGVyYXRvclwiLCBjbGFzcyBpbmZpeF9vcGVyYXRvciBleHRlbmRzIFJ1bGUuQWx0ZXJuYXRpdmVze30pO1xuXG4vLyBUT0RPOlxuLy8gXHQvLyBGaW5kIGJlc3QgbWF0Y2ggYWNjb3JkaW5nIHRvIG9wZXJhdG9yIHByZWNlZGVuY2UgYXMgZGVmaW5lZCBiZWxvdy5cbi8vIFx0Z2V0QmVzdE1hdGNoKG1hdGNoZXMpIHtcbi8vIFx0XHRjb25zb2xlLndhcm4oXCJHQk1cIiwgbWF0Y2hlcywgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gucHJlY2VkZW5jZSksIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLm1hdGNoZWRUZXh0KSk7XG4vLyBcdFx0cmV0dXJuIG1hdGNoZXMucmVkdWNlKGZ1bmN0aW9uIChiZXN0LCBuZXh0KSB7XG4vLyBcdFx0XHQvLyB0YWtlIGhpZ2hlc3QgcHJlY2VkZW5jZSBtYXRjaCBmaXJzdFxuLy8gXHRcdFx0aWYgKG5leHQucHJlY2VkZW5jZSA+IGJlc3QucHJlY2VkZW5jZSkgcmV0dXJuIG5leHQ7XG4vLyBcdFx0XHQvLyB0YWtlIGxvbmdlc3QgbWF0Y2ggaWYgc2FtZSBwcmVjZWRlbmNlXG4vLyBcdFx0XHRpZiAobmV4dC5wcmVjZWRlbmNlID09PSBiZXN0LnByZWNlZGVuY2UpIHtcbi8vIFx0XHRcdFx0aWYgKG5leHQuZW5kSW5kZXggPiBiZXN0LmVuZEluZGV4KSByZXR1cm4gbmV4dDtcbi8vIFx0XHRcdH1cbi8vIFx0XHRcdHJldHVybiBiZXN0O1xuLy8gXHRcdH0sIG1hdGNoZXNbMF0pO1xuLy8gXHR9XG5cblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwiaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntsaHM6ZXhwcmVzc2lvbn0ge29wZXJhdG9yOmluZml4X29wZXJhdG9yfSB7cmhzOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGluZml4X29wZXJhdG9yX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdC8vIFdlIENBTk5PVCBtYXRjaCBpZiBgaW5maXhfb3BlcmF0b3JgIGlzbid0IGZvdW5kIGluIHRoZSBleHByZXNzaW9uLlxuXHRcdHRlc3RSdWxlID0gXCJpbmZpeF9vcGVyYXRvclwiO1xuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGhzLCByaHMsIG9wZXJhdG9yIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gb3BlcmF0b3IudG9KUyhsaHMudG9Tb3VyY2UoY29udGV4dCksIHJocy50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJhbmRcIixcblx0Y2xhc3MgYW5kIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDY7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gJiYgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcIm9yXCIsXG5cdGNsYXNzIG9yIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDU7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gfHwgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzXCIsXG5cdCBjbGFzcyBpcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdFwiLFxuXHQgY2xhc3MgaXNfbm90IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBleGFjdGx5XCIsXG5cdGNsYXNzIGlzX2V4YWN0bHkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT09ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGV4YWN0bHlcIixcblx0IGNsYXNzICBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPT0gJHtifSlgIH0gfVxuKTtcblxuLy9UT0RPOiBgc3BlbGwuaXNPZlR5cGUodGhpbmcsIHR5cGUpYFxuLy9UT0RPOiBgaXMgc2FtZSB0eXBlIGFzYCA/XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgYVwiLFxuXHQgY2xhc3MgaXNfYSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgYW5cIixcblx0IGNsYXNzIGlzX2FuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBhXCIsXG5cdCBjbGFzcyBpc19ub3RfYSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBhblwiLFxuXHQgY2xhc3MgaXNfbm90X2FuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5cbi8vVE9ETzogYHNwZWxsLmNvbnRhaW5zKGNvbGxlY3Rpb24sIHRoaW5nKWBcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBpblwiLFxuXHQgY2xhc3MgaXNfaW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG9uZSBvZlwiLFxuXHQgY2xhc3MgaXNfb25lX29mIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBpblwiLFxuXHQgY2xhc3MgaXNfbm90X2luIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IG9uZSBvZlwiLFxuXHQgY2xhc3MgaXNfbm90X29uZV9vZiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5cblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImluY2x1ZGVzXCIsXG5cdCBjbGFzcyBpbmNsdWRlcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiY29udGFpbnNcIixcblx0IGNsYXNzIGNvbnRhaW5zIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImRvZXMgbm90IGluY2x1ZGVcIixcblx0IGNsYXNzIGRvZXNfbm90X2luY2x1ZGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkb2VzIG5vdCBjb250YWluXCIsXG5cdCBjbGFzcyBkb2VzX25vdF9jb250YWluIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPlwiLFxuXHQgY2xhc3MgZ3QgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBncmVhdGVyIHRoYW5cIixcblx0IGNsYXNzIGlzX2dyZWF0ZXJfdGhhbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID4gJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPj1cIixcblx0IGNsYXNzIGd0ZSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG9cIixcblx0IGNsYXNzIGlzX2d0ZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIjxcIixcblx0IGNsYXNzIGx0IGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbGVzcyB0aGFuXCIsXG5cdCBjbGFzcyBpc19sZXNzX3RoYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIjw9XCIsXG5cdCBjbGFzcyBsdGUgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvXCIsXG5cdCBjbGFzcyBpc19sdGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfSB9XG4pO1xuXG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIlxcXFwrXCIsXG5cdCBjbGFzcyBwbHVzIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcInBsdXNcIixcblx0IGNsYXNzIHBsdXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICsgJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCItXCIsXG5cdCBjbGFzcyBtaW51cyBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAtICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJtaW51c1wiLFxuXHQgY2xhc3MgbWludXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJcXFxcKlwiLFxuXHQgY2xhc3MgdGltZXMgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKiAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwidGltZXNcIixcblx0IGNsYXNzIHRpbWVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiL1wiLFxuXHQgY2xhc3MgZGl2aWRlZF9ieSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkaXZpZGVkIGJ5XCIsXG5cdCBjbGFzcyBkaXZpZGVkX2J5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAvICR7Yn1gIH0gfVxuKTtcblxuLy9UT0RPOiAgYCs9YCBldGM/ICBvdGhlciBtYXRoIGZ1bmN0aW9ucz9cblxuXG4vL1xuLy9cbi8vIyMgUG9zdGlmeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj5gLCBlLmcuIGBhIGlzIGRlZmluZWRgXG4vLyBOT1RFOiBgb3BlcmF0b3IudG9KU2AgTVVTVCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB0cmFuc2Zvcm1zIGFyZ3VtZW50IChgbGhzYCkgaW50byBKUyBvdXRwdXQuXG5cbnBhcnNlci5hZGRSdWxlKFwicG9zdGZpeF9vcGVyYXRvclwiLCBjbGFzcyBwb3N0Zml4X29wZXJhdG9yIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXN7fSk7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzc2lvblwiLFxuXHRcIntleHByZXNzaW9ufSB7b3BlcmF0b3I6cG9zdGZpeF9vcGVyYXRvcn1cIixcblx0Y2xhc3MgcG9zdGZpeF9vcGVyYXRvcl9leHByZXNpb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdC8vIFdlIENBTk5PVCBtYXRjaCBpZiBgcG9zdGZpeF9vcGVyYXRvcmAgaXNuJ3QgZm91bmQgaW4gdGhlIGV4cHJlc3Npb24uXG5cdFx0dGVzdFJ1bGUgPSBcInBvc3RmaXhfb3BlcmF0b3JcIjtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIG9wZXJhdG9yIH0gPSB0aGlzLnJlc3VsdHM7XG5cdFx0XHRyZXR1cm4gb3BlcmF0b3IudG9KUyhleHByZXNzaW9uLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIGRlZmluZWRcIixcblx0Y2xhc3MgaXNfZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ICE9PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBkZWZpbmVkXCIsXG5cdGNsYXNzIGlzX25vdF9kZWZpbmVkIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gPT09ICd1bmRlZmluZWQnKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgdW5kZWZpbmVkXCIsXG5cdGNsYXNzIGlzX3VuZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcblxuLy9UT0RPOiBgc3BlbGwuaXNFbXB0eSh0aGluZylgXG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBlbXB0eVwiLFxuXHRjbGFzcyBpc19lbXB0eSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGBzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGVtcHR5XCIsXG5cdGNsYXNzIGlzX25vdF9lbXB0eSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAhc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH0gfVxuKTtcblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgY3JlYXRpbmcgdmFyaWFibGVzLCBwcm9wZXJ0eSBhY2Nlc3MsIGV0Y1xuLy9cblxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgXCJzdGF0ZW1lbnRzXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcInN0YXRlbWVudHNcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEltcG9ydCBjb3JlIHJ1bGVzLlxuaW1wb3J0IFwiLi9jb3JlXCI7XG5wYXJzZXIuaW1wb3J0KFwiY29yZVwiKTtcblxuXG4vL1xuLy9cdCMjIFJldHVybnNcbi8vXG5cbi8vIFJldHVybiBhIHZhbHVlXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcInJldHVybl9zdGF0ZW1lbnRcIiwgXCJyZXR1cm4ge2V4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJldHVybl9zdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGByZXR1cm4gJHtleHByZXNzaW9ufWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHQjIyBBc3NpZ25tZW50XG4vL1xuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFzc2lnbm1lbnRcIixcblx0W1xuXHRcdFwie3RoaW5nOmV4cHJlc3Npb259ID0ge3ZhbHVlOmV4cHJlc3Npb259XCIsXG5cdFx0XCJzZXQge3RoaW5nOmV4cHJlc3Npb259IHRvIHt2YWx1ZTpleHByZXNzaW9ufVwiLFxuXHRcdFwicHV0IHt2YWx1ZTpleHByZXNzaW9ufSBpbnRvIHt0aGluZzpleHByZXNzaW9ufVwiXG5cdF0sXG5cdGNsYXNzIGFzc2lnbm1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIHZhbHVlIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyBUT0RPOiBkZWNsYXJlIGlkZW50aWZpZXIgaWYgbm90IGluIHNjb3BlLCBldGNcblx0XHRcdHJldHVybiBgJHt0aGluZ30gPSAke3ZhbHVlfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJnZXRfZXhwcmVzc2lvblwiLFxuXHRcImdldCB7dmFsdWU6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgZ2V0X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdmFsdWUgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTs7XG5cdFx0XHRyZXR1cm4gYGl0ID0gJHt2YWx1ZX1gXG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHQjIyBVc2VyIGludGVyYWN0aW9uXG4vLyBUT0RPOiBtb3ZlIGludG8gYW5vdGhlciBmaWxlXG4vL1xuXG4vLyBBbGVydCBhIG1lc3NhZ2UuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImFsZXJ0XCIsIFwiYWxlcnQge21lc3NhZ2U6ZXhwcmVzc2lvbn0gKD86d2l0aCB7b2tCdXR0b246dGV4dH0pP1wiLFxuXHRjbGFzcyBhbGVydCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBva0J1dHRvbiA9IGBcIk9LXCJgIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLmFsZXJ0KCR7bWVzc2FnZX0sICR7b2tCdXR0b259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBXYXJuaW5nIG1lc3NhZ2UgLS0gbGlrZSBhbGVydCBidXQgZmFuY2llci5cbi8vIFRPRE86IG5lZWQgc29tZSBmYW5jeSBwcm9taXNlIGp1anUgaGVyZT9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFwid2FyblwiLCBcIndhcm4ge2V4cHJlc3Npb246ZXhwcmVzc2lvbn0gKD86d2l0aCB7b2tCdXR0b246dGV4dH0pP1wiLFxuXHRjbGFzcyB3YXJuIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG1lc3NhZ2UsIG9rQnV0dG9uID0gYFwiT0tcImAgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwud2Fybigke21lc3NhZ2V9LCAke29rQnV0dG9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBDb25maXJtIG1lc3NhZ2UgLS0gcHJlc2VudCBhIHF1ZXN0aW9uIHdpdGggdHdvIGFuc3dlcnMuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcImNvbmZpcm1cIiwgXCJjb25maXJtIHttZXNzYWdlOmV4cHJlc3Npb259ICg/OndpdGgge29rQnV0dG9uOnRleHR9ICg/OiAoYW5kfG9yKSB7Y2FuY2VsQnV0dG9uOnRleHR9KT8gKT9cIixcblx0Y2xhc3MgY29uZmlybSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBva0J1dHRvbiA9IGBcIk9LXCJgLCBjYW5jZWxCdXR0b24gPSBgXCJDYW5jZWxcImAgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgYXdhaXQgc3BlbGwuY29uZmlybSgke21lc3NhZ2V9LCAke29rQnV0dG9ufSwgJHtjYW5jZWxCdXR0b259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3N0YXRlbWVudHMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlZmluaW5nIGNsYXNzZXMgKGtub3duIGFzIGB0eXBlc2ApXG4vL1xuXG4vLyBUT0RPOiBtaXhpbnMgLyB0cmFpdHMgLyBjb21wb3NlZCBjbGFzc2VzIC8gYW5ub3RhdGlvbnNcblxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG5pbXBvcnQgZ2xvYmFsIGZyb20gXCIuLi91dGlscy9nbG9iYWxcIjtcbmltcG9ydCB7IHBsdXJhbGl6ZSB9IGZyb20gXCIuLi91dGlscy9zdHJpbmdcIjtcblxuLy8gQ3JlYXRlIFwidHlwZXNcIiBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwidHlwZXNcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEltcG9ydCBjb3JlIHJ1bGVzLlxuaW1wb3J0IFwiLi9jb3JlXCI7XG5wYXJzZXIuaW1wb3J0KFwiY29yZVwiKTtcblxuLy8gRGVmaW5lIFwidHlwZVwiIChhLmsuYS4gXCJjbGFzc1wiKS5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVmaW5lX3R5cGVcIixcblx0XCJkZWZpbmUgdHlwZSB7dHlwZX0gKD86YXMgKGF8YW4pIHtzdXBlclR5cGU6dHlwZX0pP1wiLFxuXHRjbGFzcyBkZWZpbmVfdHlwZSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBzdXBlclR5cGUgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGlmIChzdXBlclR5cGUpIHtcblx0XHRcdFx0cmV0dXJuIGBjbGFzcyAke3R5cGV9IGV4dGVuZHMgJHtzdXBlclR5cGV9YDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBgY2xhc3MgJHt0eXBlfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFByb3BlcnRpZXMgY2xhdXNlOiBjcmVhdGVzIGFuIG9iamVjdCB3aXRoIG9uZSBvciBtb3JlIHByb3BlcnR5IHZhbHVlcy5cbi8vXHRgZm9vID0gMSwgYmFyID0gMmBcbi8vVE9ETzogd291bGQgbGlrZSB0byB1c2UgYGFuZGAgYnV0IHRoYXQgd2lsbCBiYXJmIG9uIGV4cHJlc3Npb25zLi4uXG4vL1RPRE86IGhvdyB0byBkbyBwcm9wZXJ0aWVzIG9uIG11bHRpcGxlIGxpbmVzP1xucGFyc2VyLmFkZExpc3QoXG5cdFwib2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc1wiLFxuXHRcIlsoe2tleTppZGVudGlmaWVyfSg/Oj0ge3ZhbHVlOmV4cHJlc3Npb259KT8pICxdXCIsXG5cdGNsYXNzIG9iamVjdF9saXRlcmFsX3Byb3BlcnRpZXMgZXh0ZW5kcyBSdWxlLkxpc3Qge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBwcm9wcyA9IHRoaXMucmVzdWx0cy5tYXRjaGVkLm1hcChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0XHRcdGxldCB7IGtleSwgdmFsdWUgfSA9IHByb3AucmVzdWx0cztcblx0XHRcdFx0XHRrZXkgPSBrZXkudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRcdFx0dmFsdWUgPSB2YWx1ZSAmJiB2YWx1ZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0XHRpZiAodmFsdWUpIHJldHVybiBgXCIke2tleX1cIjogJHt2YWx1ZX1gXG5cdFx0XHRcdFx0cmV0dXJuIGtleTtcblx0XHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYHsgJHtwcm9wcy5qb2luKFwiLCBcIil9IH1gO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gYG5ld2Agb3IgYGNyZWF0ZWBcbi8vIFRoaXMgd29ya3MgYXMgYW4gZXhwcmVzc2lvbiBPUiBhIHN0YXRlbWVudC5cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGFsbCB0eXBlcyB0YWtlIGFuIG9iamVjdCBvZiBwcm9wZXJ0aWVzPz8/P1xucGFyc2VyLmFkZFNlcXVlbmNlKFxuXHRbXCJleHByZXNzaW9uXCIsIFwic3RhdGVtZW50XCJdLFxuXHRcIihjcmVhdGV8bmV3KSB7dHlwZX0gKD86d2l0aCB7cHJvcHM6b2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc30pP1wiLFxuXHRjbGFzcyBuZXdfdGhpbmcgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBwcm9wcyA9IFwiXCIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igb2JqZWN0LCB3aGljaCB3ZSdsbCBjcmVhdGUgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbC5cblx0XHRcdGlmICh0eXBlID09PSBcIk9iamVjdFwiKSB7XG5cdFx0XHRcdGlmICghcHJvcHMpIHJldHVybiBcInt9XCI7XG5cdFx0XHRcdHJldHVybiBwcm9wcztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGBuZXcgJHt0eXBlfSgke3Byb3BzfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1RPRE86IGNvbnN0cnVjdG9yXG5cblxuXG4vL01PVkUgVE8gYGZ1bmN0aW9uc2A/XG4vLyBBcmd1bWVudHMgY2xhdXNlIGZvciBtZXRob2RzXG4vL1x0YHdpdGggZm9vYCBvciBgd2l0aCBmb28gYW5kIGJhciBhbmQgYmF6YFxuLy9UT0RPOiB7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cdD0+IHJlcXVpcmVzIGAsYCBpbnN0ZWFkIG9mIGBhbmRgXG4vL1RPRE86IGB3aXRoIGZvbyBhcyBUeXBlYFxuLy9UT0RPOlx0YHdpdGggZm9vLi4uYCBmb3Igc3BsYXQ/XG5wYXJzZXIuYWRkU2VxdWVuY2UoXG5cdFwiYXJnc1wiLFxuXHRcIndpdGggW2FyZ3M6e2lkZW50aWZpZXJ9ICxdXCIsXG5cdGNsYXNzIGFyZ3MgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHQvLyBSZXR1cm5zIGFuIGFycmF5IG9mIGFyZ3VtZW50IHZhbHVlc1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiB0aGlzLnJlc3VsdHMuYXJncy5tYXRjaGVkLm1hcChhcmcgPT4gYXJnLm1hdGNoZWQpO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBEZWNsYXJlIGluc3RhbmNlIG1ldGhvZCBvciBub3JtYWwgZnVuY3Rpb24uXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfbWV0aG9kXCIsXG5cdFwiKHRvfG9uKSB7aWRlbnRpZmllcn0ge2FyZ3N9PyAoXFxcXDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZGVjbGFyZV9tZXRob2QgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJncywgc3RhdGVtZW50IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRhcmdzID0gKEFycmF5LmlzQXJyYXkoYXJncykgPyBhcmdzLmpvaW4oXCIsIFwiKSA6IFwiXCIpO1xuXHRcdFx0aWYgKCFzdGF0ZW1lbnQpIHtcblx0XHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pYDtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLm9wZW5zQmxvY2sgPSB0cnVlO1xuXHRcdFx0XHR0aGlzLmNsb3Nlc0Jsb2NrID0gdHJ1ZTtcblx0XHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBEZWNsYXJlIFwiYWN0aW9uXCIsIHdoaWNoIGNhbiBiZSBjYWxsZWQgZ2xvYmFsbHkgYW5kIGFmZmVjdHMgdGhlIHBhcnNlci5cbi8vIFRPRE86IGB3aXRoYCBjbGF1c2UgKHdpbGwgY29uZmxpY3Qgd2l0aCBgd29yZGApXG4vLyBUT0RPOiBpbnN0YWxsIGluIHBhcnNlciBzb21laG93XG4vLyBUT0RPOiBjcmVhdGUgaW5zdGFuY2UgZnVuY3Rpb24/ICBvciBtYXliZSB3ZSBkb24ndCBuZWVkIGl0OlxuLy9cdFx0XHRgYWN0aW9uIHR1cm4gQ2FyZCBvdmVyYCBmb3IgYW4gaW5zdGFuY2UgaXMganVzdCBgdHVybiBtZSBvdmVyYFxuLy9cdFx0XHRgYWN0aW9uIGFkZCBjYXJkIHRvIGRlY2tgID0+IGBhZGQgbWUgdG8gZGVja2Bcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfYWN0aW9uXCIsXG5cdFwiYWN0aW9uIChrZXl3b3Jkczp7d29yZH18e3R5cGV9KSsgKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGRlY2xhcmVfYWN0aW9uIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGtleXdvcmRzLCBzdGF0ZW1lbnQgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdGxldCB3b3JkcyA9IGtleXdvcmRzLm1hdGNoZWQubWFwKCB3b3JkID0+IHdvcmQudG9Tb3VyY2UoY29udGV4dCkgKTtcblx0XHRcdC8vIGlmIHRoZXJlJ3Mgb25seSBvbmUgd29yZCwgaXQgY2FuJ3QgYmUgYSBibGFja2xpc3RlZCBpZGVudGlmaWVyIG9yIGEgdHlwZVxuXHRcdFx0aWYgKHdvcmRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHR2YXIgd29yZCA9IHdvcmRzWzBdO1xuXHRcdFx0XHRpZiAoa2V5d29yZHMubWF0Y2hlZCBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSB0eXBlczogJHt3b3JkfWApO1xuXHRcdFx0XHR9XG5cbmNvbnNvbGUud2FybihcIkZJWE1FOiBwYXJzZXIucnVsZXMuaWRlbnRpZmllclwiKTtcbi8vIEhBQ0s6IGBnbG9iYWwucGFyc2VyYCBpcyBhIGhhY2sgaGVyZSBmb3IgY29udmVuaWVuY2UgaW4gdGVzdGluZy4uLlxuXHRcdFx0XHRsZXQgcGFyc2VyID0gY29udGV4dCA/IGNvbnRleHQucGFyc2VyIDogZ2xvYmFsLnBhcnNlcjtcblx0XHRcdFx0aWYgKHBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmJsYWNrbGlzdFt3b3JkXSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSBibGFja2xpc3RlZCBpZGVudGlmaWVyc1wiOiAke3dvcmR9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBhcmd1bWVudHMgYW5kL29yIHR5cGVzXG5cdFx0XHR2YXIgYXJncyA9IFtdO1xuXHRcdFx0dmFyIHR5cGVzID0gW107XG5cdFx0XHQvLyBpZiBhbnkgb2YgdGhlIHdvcmRzIGFyZSB0eXBlcyAoY2FwaXRhbCBsZXR0ZXIpIG1ha2UgdGhhdCBhbiBhcmd1bWVudCBvZiB0aGUgc2FtZSBuYW1lLlxuXHRcdFx0a2V5d29yZHMubWF0Y2hlZC5tYXAoIChpdGVtLCBpbmRleCkgPT4ge1xuXHRcdFx0XHRpZiAoaXRlbSBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdGxldCB0eXBlID0gd29yZHNbaW5kZXhdO1xuXHRcdFx0XHRcdGxldCB3b3JkID0gdHlwZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdHR5cGVzLnB1c2goW3R5cGUsIHdvcmRdKTtcblx0XHRcdFx0XHR3b3Jkc1tpbmRleF0gPSB3b3JkO1xuXHRcdFx0XHRcdGFyZ3MucHVzaCh3b3JkKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQvLyBnZXQgc3RhdGljIG1ldGhvZCBuYW1lIGFuZCBhcmd1bWVudHMgZm9yIG91dHB1dFxuXHRcdFx0bGV0IG1ldGhvZE5hbWUgPSB3b3Jkcy5qb2luKFwiX1wiKTtcblx0XHRcdGFyZ3MgPSBhcmdzLmpvaW4oXCIsIFwiKTtcblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpZiB0aGVyZSBhcmUgYW55IGNvbmRpdGlvbnMgb24gdGhlIGFib3ZlXG5cdFx0XHRsZXQgY29uZGl0aW9ucyA9IHR5cGVzLm1hcCggKFt0eXBlLCB3b3JkXSkgPT4ge1xuXHRcdFx0XHRyZXR1cm4gYFxcdGlmICghc3BlbGwuaXNBKCR7d29yZH0sICR7dHlwZX0pKSByZXR1cm4gdW5kZWZpbmVkYDtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBnZXQgc3RhdGVtZW50cywgYWRkaW5nIGNvbmRpdGlvbnMgaWYgbmVjZXNzYXJ5XG5cdFx0XHRzdGF0ZW1lbnQgPSBzdGF0ZW1lbnQgPyBzdGF0ZW1lbnQudG9Tb3VyY2UoY29udGV4dCkgOiBcIlwiO1xuXHRcdFx0bGV0IHN0YXRlbWVudHMgPSBcIlwiO1xuXHRcdFx0aWYgKHN0YXRlbWVudCkge1xuXHRcdFx0XHRzdGF0ZW1lbnRzID0gW107XG5cdFx0XHRcdGlmIChjb25kaXRpb25zLmxlbmd0aCkgc3RhdGVtZW50cyA9IHN0YXRlbWVudHMuY29uY2F0KGNvbmRpdGlvbnMpO1xuXHRcdFx0XHRpZiAoc3RhdGVtZW50KSBzdGF0ZW1lbnRzLnB1c2goXCJcXHRcIiArIHN0YXRlbWVudCk7XG5cdFx0XHRcdHN0YXRlbWVudHMgPSBgIHtcXG4ke3N0YXRlbWVudHMuam9pbihcIlxcblwiKX1cXG4gfVxcbmA7XG5cdFx0XHRcdHRoaXMub3BlbnNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHRoaXMuY2xvc2VzQmxvY2sgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoY29uZGl0aW9ucy5sZW5ndGgpIHtcblx0XHRcdFx0c3RhdGVtZW50cyA9IGAge1xcbiR7Y29uZGl0aW9ucy5qb2luKFwiXFxuXCIpfWA7XG5cdFx0XHRcdHRoaXMub3BlbnNCbG9jayA9IHRydWU7XG5cdFx0XHR9XG4vL2RlYnVnZ2VyO1xuXHRcdFx0Ly8gQ3JlYXRlIGFzIGEgU1RBVElDIGZ1bmN0aW9uXG5cdC8vVE9ETzogY3JlYXRlIGFzIGFuIGluc3RhbmNlIGZ1bmN0aW9uIHdlIGNhbiBjYWxsIG9uIG91cnNlbGYhXG5cdFx0XHRyZXR1cm4gYHN0YXRpYyAke21ldGhvZE5hbWV9KCR7YXJnc30pJHtzdGF0ZW1lbnRzfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIEdldHRlciBlaXRoZXIgd2l0aCBvciB3aXRob3V0IGFyZ3VtZW50cy5cbi8vIElmIHlvdSBzcGVjaWZ5IGFyZ3VtZW50cywgeWllbGRzIGEgbm9ybWFsIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYSB2YWx1ZS5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZ2V0dGVyXCIsXG5cdFwiZ2V0IHtpZGVudGlmaWVyfSB7YXJnc30/IChcXFxcOik/IHtleHByZXNzaW9ufT9cIixcblx0Y2xhc3MgZ2V0dGVyIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3MsIGV4cHJlc3Npb24gfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGFyZ3MgPSAoQXJyYXkuaXNBcnJheShhcmdzKSA/IGFyZ3Muam9pbihcIiwgXCIpIDogXCJcIik7XG5cblx0XHRcdGlmIChhcmdzICYmIGV4cHJlc3Npb24pIHtcblx0XHRcdFx0dGhpcy5vcGVuc0Jsb2NrID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5jbG9zZXNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KSB7IHJldHVybiAoJHtleHByZXNzaW9ufSkgfWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChhcmdzKSB7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChleHByZXNzaW9uKSB7XG5cdFx0XHRcdHRoaXMub3BlbnNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHRoaXMuY2xvc2VzQmxvY2sgPSB0cnVlO1xuXHRcdFx0XHRyZXR1cm4gYGdldCAke2lkZW50aWZpZXJ9KCkgeyByZXR1cm4gKCR7ZXhwcmVzc2lvbn0pIH1gO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHJldHVybiBgZ2V0ICR7aWRlbnRpZmllcn0oKWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fVxuKTtcblxuLy8gU2V0dGVyLlxuLy8gQ29tcGxhaW5zIGlmIHlvdSBzcGVjaWZ5IG1vcmUgdGhhbiBvbmUgYXJndW1lbnQuXG4vLyBJZiB5b3UgZG9uJ3QgcGFzcyBhbiBleHBsaWNpdCBhcmd1bWVudCwgd2UnbGwgYXNzdW1lIGl0J3MgdGhlIHNhbWUgYXMgdGhlIGlkZW50aWZpZXIuXG4vLyBlZztcdGBzZXQgY29sb3I6IHNldCB0aGUgY29sb3Igb2YgbXkgdGV4dCB0byBjb2xvcmBcbi8vXG4vLyBUT0RPOiBpbnRlcm5hbCBnZXR0ZXIvc2V0dGVyIHNlbWFudGljcyBhbGEgb2JqZWN0aXZlIENcbi8vXHRcdFx0YHNldCBjb2xvcjogaWYgY29sb3IgaXMgaW4gW1wicmVkXCIsIFwiYmx1ZVwiXSB0aGVuIHNldCBteSBjb2xvciB0byBjb2xvcmBcbi8vXHRcdCA9PiBgbXkgY29sb3JgIHdpdGhpbiBzZXR0ZXIgc2hvdWxkIGF1dG9tYXRpY2FsbHkgdHJhbnNsYXRlIHRvIGB0aGlzLl9jb2xvcmAgPz8/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcInNldHRlclwiLFxuXHRcInNldCB7aWRlbnRpZmllcn0ge2FyZ3N9PyAoXFxcXDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZ2V0dGVyIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3MgPSBbaWRlbnRpZmllcl0sIHN0YXRlbWVudCA9IFwiXCIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIENvbXBsYWluIGlmIG1vcmUgdGhhbiBvbmUgYXJndW1lbnRcblx0XHRcdGlmIChhcmdzICYmIGFyZ3MubGVuZ3RoID4gMSkge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJwYXJzZSgnc2V0dGVyJyk6IG9ubHkgb25lIGFyZ3VtZW50IGFsbG93ZWQgaW4gc2V0dGVyOiAgXCIsIHRoaXMubWF0Y2hlZFRleHQpO1xuXHRcdFx0XHRhcmdzID0gWyBhcmdzWzBdIF07XG5cdFx0XHR9XG5cblx0XHRcdGlmICghc3RhdGVtZW50KSB7XG5cdFx0XHRcdHJldHVybiBgc2V0ICR7aWRlbnRpZmllcn0oJHthcmdzfSlgO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMub3BlbnNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHRoaXMuY2xvc2VzQmxvY2sgPSB0cnVlO1xuXHRcdFx0XHRyZXR1cm4gYHNldCAke2lkZW50aWZpZXJ9KCR7YXJnc30pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdGRlY2xhcmUgcHJvcGVydGllc1xuLy9cblxuLy9UT0RPOiBhbm90aGVyIG5hbWUgZm9yIGBjb25zdGFudGAgP1xucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwiKHNjb3BlOnByb3BlcnR5fGNvbnN0YW50fHNoYXJlZCBwcm9wZXJ0eSkge2lkZW50aWZpZXJ9ICg/Oj0ge3ZhbHVlOmV4cHJlc3Npb259KT9cIixcblx0Y2xhc3MgZGVjbGFyZV9wcm9wZXJ0eSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzY29wZSwgaWRlbnRpZmllciwgdmFsdWUgPSBcIlwiIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAodmFsdWUpIHZhbHVlID0gYCA9ICR7dmFsdWV9YDtcblxuXHRcdFx0bGV0IGRlY2xhcmF0aW9uID0gYCR7aWRlbnRpZmllcn0ke3ZhbHVlfWA7XG5cdFx0XHRzd2l0Y2ggKHNjb3BlKSB7XG5cdFx0XHRcdGNhc2UgXCJjb25zdGFudFwiOlxuXHRcdFx0XHRcdGlmICghdmFsdWUpIGNvbnNvbGUud2FybihcInBhcnNlKCdkZWNsYXJlX3Byb3BlcnR5Jyk6IGNvbnN0YW50IHByb3BlcnRpZXMgbXVzdCBkZWNsYXJlIGEgdmFsdWU6ICBcIiwgdGhpcy5tYXRjaGVkVGV4dCk7XG5cdFx0XHRcdFx0cmV0dXJuIGBjb25zdCAke2RlY2xhcmF0aW9ufWA7XG5cblx0XHRcdFx0Y2FzZSBcInNoYXJlZCBwcm9wZXJ0eVwiOlxuXHRcdFx0XHRcdHJldHVybiBgQHByb3RvICR7ZGVjbGFyYXRpb259YDtcblxuXHRcdFx0XHRjYXNlIFwicHJvcGVydHlcIjpcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRyZXR1cm4gZGVjbGFyYXRpb247XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiBzY29wZV9tb2RpZmllcj8/P1xuLy8gVE9ETzogaW5pdGlhbCB2YWx1ZVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX3Byb3BlcnR5XCIsXG5cdFwicHJvcGVydHkge2lkZW50aWZpZXJ9IGFzIChhfGFuKT8ge3R5cGV9XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHkgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgdHlwZSB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSgpIHsgcmV0dXJuIHRoaXMuX18ke2lkZW50aWZpZXJ9IH1cXG5gXG5cdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAoc3BlbGwuaXNBKHZhbHVlLCAke3R5cGV9KSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eVwiLFxuXHRcInByb3BlcnR5IHtpZGVudGlmaWVyfSBhcyBvbmUgb2Yge2xpc3Q6bGl0ZXJhbF9saXN0fVwiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5X2FzX29uZV9vZiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgcGx1cmFsID0gcGx1cmFsaXplKGlkZW50aWZpZXIpO1xuXHRcdFx0cmV0dXJuIGBAcHJvdG8gJHtwbHVyYWx9ID0gJHtsaXN0fVxcbmBcblx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9KCkgeyByZXR1cm4gdGhpcy5fXyR7aWRlbnRpZmllcn0gPT09IHVuZGVmaW5lZCA/IHRoaXMuJHtwbHVyYWx9WzBdIDogdGhpcy5fXyR7aWRlbnRpZmllcn0gfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfWA7XG5cbi8vIE1PUkUgRUZGSUNJRU5UIEJVVCBVR0xJRVJcbi8vIFx0XHRcdHJldHVybiBgc3RhdGljICR7cGx1cmFsfSA9ICR7bGlzdH07XFxuYFxuLy8gXHRcdFx0XHQgKyBgZ2V0ICR7aWRlbnRpZmllcn0geyByZXR1cm4gKFwiX18ke2lkZW50aWZpZXJ9XCIgaW4gdGhpcyA/IHRoaXMuX18ke2lkZW50aWZpZXJ9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcbi8vIFx0XHRcdFx0ICsgYHNldCAke2lkZW50aWZpZXJ9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke2lkZW50aWZpZXJ9ID0gdmFsdWUgfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vXG4vL1x0U2VsZi1yZWZlcmVuY2Vcbi8vXG5wYXJzZXIuYWRkS2V5d29yZChcblx0W1wibWVcIiwgXCJleHByZXNzaW9uXCJdLFxuXHRcIm1lXCIsXG5cdGNsYXNzIG1lIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gXCJ0aGlzXCI7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB0aGlzIHJlYWxseSBtYWtlcyBtZSB3YW50IHRvIG1ha2UgYEkgYW0gZW1wdHlgIGV0YyB3b3JrLi4uXG5wYXJzZXIuYWRkS2V5d29yZChcblx0W1wiSVwiLCBcImV4cHJlc3Npb25cIl0sXG5cdFwiSVwiLFxuXHRjbGFzcyBJIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gXCJ0aGlzXCI7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vXG4vL1x0UHJvcGVydHkgYWNjZXNzXG4vL1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwcm9wZXJ0eV9leHByZXNzaW9uXCIsXG5cdFwiKHByb3BlcnRpZXM6dGhlIHtpZGVudGlmaWVyfSBvZikrIHRoZT8ge2V4cHJlc3Npb259XCIsXG5cdGNsYXNzIHByb3BlcnR5X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdGdldE1hdGNoZWRTb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgcHJvcGVydGllcyB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXhwcmVzc2lvbjogZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KSxcblx0XHRcdFx0cHJvcGVydGllczogcHJvcGVydGllcy5tYXRjaGVkLm1hcCggcHJvcGVydHkgPT4gcHJvcGVydHkucmVzdWx0cy5pZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpIClcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgcHJvcGVydGllcyB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cHJvcGVydGllcyA9IHByb3BlcnRpZXMucmV2ZXJzZSgpLmpvaW4oXCIuXCIpO1xuXHRcdFx0cmV0dXJuIGAke2V4cHJlc3Npb259LiR7cHJvcGVydGllc31gO1xuLy8gTk9URTogdGhlIGZvbGxvd2luZyBpcyBzYWZlciwgYnV0IHVnbHkgZm9yIGRlbW8gcHVycG9zZXNcbi8vXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXQoJHtleHByZXNzaW9ufSwgWycke3Byb3BlcnRpZXN9J10pYDtcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInByb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIobXl8dGhpcykge2lkZW50aWZpZXJ9XCIsXG5cdGNsYXNzIHByb3BlcnR5X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgdGhpcy4ke2lkZW50aWZpZXJ9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvdHlwZXMuanMiLCJ2YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbi8vIFRPRE86IE5lZWQgYmV0dGVyLCBtb3JlIGNvbXBsZXRlLCBhbmQgbW9yZSBtZXRob2RpY2FsIGtleSBkZWZpbml0aW9uc1xuXG52YXIgS2V5cyA9IHtcbiAgYmFja3NwYWNlOiA4LFxuICBkZWw6IDQ2LFxuICBkZWxldGU6IDQ2LFxuICB0YWI6IDksXG4gIGVudGVyOiAxMyxcbiAgJ3JldHVybic6IDEzLFxuICBlc2M6IDI3LFxuICBzcGFjZTogMzIsXG4gIGxlZnQ6IDM3LFxuICB1cDogMzgsXG4gIHJpZ2h0OiAzOSxcbiAgZG93bjogNDAsXG4gICc7JzogMTg2LFxuICAnPSc6IDE4NyxcbiAgJywnOiAxODgsXG4gICctJzogMTg5LFxuICAnLic6IDE5MCxcbiAgJy8nOiAxOTEsXG4gICdgJzogMTkyLFxuICAnWyc6IDIxOSxcbiAgJ1xcXFwnOiAyMjAsXG4gICddJzogMjIxXG59O1xuXG4vLyBBZGQgdXBwZXJjYXNlIHZlcnNpb25zIG9mIGtleXMgYWJvdmUgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG5PYmplY3Qua2V5cyhLZXlzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgcmV0dXJuIEtleXNba2V5LnRvVXBwZXJDYXNlKCldID0gS2V5c1trZXldO1xufSk7XG5cbicwMTIzNDU2Nzg5Jy5zcGxpdCgnJykuZm9yRWFjaChmdW5jdGlvbiAobnVtLCBpbmRleCkge1xuICByZXR1cm4gS2V5c1tudW1dID0gaW5kZXggKyA0ODtcbn0pO1xuXG4nQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVonLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uIChsZXR0ZXIsIGluZGV4KSB7XG4gIEtleXNbbGV0dGVyXSA9IGluZGV4ICsgNjU7XG4gIEtleXNbbGV0dGVyLnRvTG93ZXJDYXNlKCldID0gaW5kZXggKyA2NTtcbn0pO1xuXG4vLyBmbiBrZXlzXG5bMSwgMiwgMywgNCwgNSwgNiwgNywgOCwgOSwgMTAsIDExLCAxMl0uZm9yRWFjaChmdW5jdGlvbiAoaXRlbSwgaW5kZXgpIHtcbiAgcmV0dXJuIEtleXNbJ2YnICsgaW5kZXhdID0gMTExICsgaW5kZXg7XG59KTtcblxuZXhwb3J0IHZhciBtb2RpZmllcnMgPSB7XG4gIGNvbnRyb2w6ICdjdHJsJyxcbiAgY3RybDogJ2N0cmwnLFxuICBzaGlmdDogJ3NoaWZ0JyxcbiAgbWV0YTogJ21ldGEnLFxuICBjbWQ6ICdtZXRhJyxcbiAgY29tbWFuZDogJ21ldGEnLFxuICBvcHRpb246ICdhbHQnLFxuICBhbHQ6ICdhbHQnXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gYWxsS2V5cyhhcmcpIHtcbiAgcmV0dXJuIGFyZyA/IGFyZy5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sIHx8ICh0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihhcmcpKSA9PT0gJ3N5bWJvbCcgOiBTeW1ib2woJ2FsbEtleXMnKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgS2V5cztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9saWIva2V5cy5qc1xuLy8gbW9kdWxlIGlkID0gOTlcbi8vIG1vZHVsZSBjaHVua3MgPSAwIl0sInNvdXJjZVJvb3QiOiIifQ==