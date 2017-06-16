webpackJsonp([0],{

/***/ 105:
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

/***/ }),

/***/ 106:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__lib_keys__ = __webpack_require__(105);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lib_match_keys__ = __webpack_require__(282);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__lib_parse_keys__ = __webpack_require__(283);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__lib_uuid__ = __webpack_require__(572);
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

/***/ 153:
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
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(248)))

/***/ }),

/***/ 154:
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

/***/ 155:
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

/***/ 251:
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

/***/ 252:
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
  module.exports = __webpack_require__(476)(isValidElement, throwOnDirectAccess);
} else {
  // By explicitly using `prop-types` you are opting into new production behavior.
  // http://fb.me/prop-types-in-prod
  module.exports = __webpack_require__(475)();
}

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0)))

/***/ }),

/***/ 253:
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

/***/ 254:
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



var emptyFunction = __webpack_require__(154);

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

/***/ 27:
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


var _Tokenizer = __webpack_require__(97);

var _Tokenizer2 = _interopRequireDefault(_Tokenizer);

var _Rule = __webpack_require__(83);

var _Rule2 = _interopRequireDefault(_Rule);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// GRRR... will SOMEONE on the node team please implement console.group ???
if (!console.group) console.group = console.log;
if (!console.groupEnd) console.groupEnd = console.log;

var Parser = (_temp = _class = function () {

	// Constructor.


	// Set to `true` to output timing info.

	// Set to `true` to output debug info while adding rules
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


	// Should we warn about anomalous conditions?


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
				tokens = _Tokenizer2.default.removeLeadingWhitespace(tokens);
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
}(), _class.DEBUG = false, _class.WARN = false, _class.TIME = false, _class.REGISTRY = {}, _class.REGEXP_SPECIAL_CHARACTERS = function () {
	var chars = {};
	"\\/^$*+?.()|{},[]".split("").forEach(function (char) {
		return chars[char] = true;
	});
	return chars;
}(), _temp);
exports.default = Parser;

/***/ }),

/***/ 281:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__lib_dom_helpers__ = __webpack_require__(570);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lib_listeners__ = __webpack_require__(571);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__store__ = __webpack_require__(106);
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

/***/ 282:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__keys__ = __webpack_require__(105);


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

/***/ 283:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__keys__ = __webpack_require__(105);


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

/***/ 457:
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
	fixUrls = __webpack_require__(905);

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

/***/ 458:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _dec, _dec2, _dec3, _dec4, _dec5, _class, _desc, _value, _class2, _class3, _temp;

var _mobxReact = __webpack_require__(250);

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactKeydown = __webpack_require__(568);

var _reactKeydown2 = _interopRequireDefault(_reactKeydown);

var _semanticUiReact = __webpack_require__(152);

var _ExampleStore = __webpack_require__(460);

var _ExampleStore2 = _interopRequireDefault(_ExampleStore);

var _Spacer = __webpack_require__(461);

var _Spacer2 = _interopRequireDefault(_Spacer);

__webpack_require__(907);

var _TabbableTextArea = __webpack_require__(462);

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

/***/ 459:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.Rule = exports.Parser = exports.Tokenizer = undefined;

var _Tokenizer2 = __webpack_require__(97);

var _Tokenizer3 = _interopRequireDefault(_Tokenizer2);

var _Parser2 = __webpack_require__(27);

var _Parser3 = _interopRequireDefault(_Parser2);

var _Rule2 = __webpack_require__(83);

var _Rule3 = _interopRequireDefault(_Rule2);

__webpack_require__(67);

var _all = __webpack_require__(466);

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

/***/ 460:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _desc, _value, _class, _descriptor, _descriptor2, _descriptor3, _descriptor4; /* Store of example spell code fragments. */


// Make Parser and Tokenizer WARN as we run


var _mobx = __webpack_require__(151);

var _mobx2 = _interopRequireDefault(_mobx);

var _Parser = __webpack_require__(27);

var _Parser2 = _interopRequireDefault(_Parser);

var _Tokenizer = __webpack_require__(97);

var _Tokenizer2 = _interopRequireDefault(_Tokenizer);

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

_Parser2.default.WARN = true;
_Parser2.default.DEBUG = true;
_Parser2.default.TIME = true;

_Tokenizer2.default.WARN = true;

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
				var result = parser.parse("statements", _this.code);
				if (!result) {
					console.warn("Can't parse!");
					_this.output = "Can't parse statements";
				} else {
					console.info("Result", result);
					_this.output = result.toSource(parser);
				}
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

/***/ 461:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Spacer;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _propTypes = __webpack_require__(252);

var _propTypes2 = _interopRequireDefault(_propTypes);

var _util = __webpack_require__(463);

__webpack_require__(906);

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

/***/ 462:
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

var _propTypes = __webpack_require__(252);

var _propTypes2 = _interopRequireDefault(_propTypes);

var _semanticUiReact = __webpack_require__(152);

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

/***/ 463:
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

/***/ 464:
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

/***/ 465:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(27);

var _Parser2 = _interopRequireDefault(_Parser);

var _Tokenizer = __webpack_require__(97);

var _Tokenizer2 = _interopRequireDefault(_Tokenizer);

var _RuleSyntax = __webpack_require__(67);

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
			var end = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : tokens.length;

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

/***/ 466:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Parser = __webpack_require__(27);

var _Parser2 = _interopRequireDefault(_Parser);

__webpack_require__(68);

__webpack_require__(468);

__webpack_require__(469);

__webpack_require__(467);

__webpack_require__(470);

__webpack_require__(471);

__webpack_require__(465);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Create parser for all.
// Export all standard "english" rules.
var parser = _Parser2.default.forContext("all");

// Load all standard rules files.
exports.default = parser;

// And depend on standard rules loaded above.

parser.import("core", "lists", "operators", "if", "statements", "types", "JSX");

/***/ }),

/***/ 467:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(27);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(83);

var _Rule2 = _interopRequireDefault(_Rule);

__webpack_require__(68);

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

// TODO: custom `getMatcher`:
//			- `condtion` wraps in parens if NOT wrapped

//TESTME
parser.addStatement("if", "if {condition:expression} (then|:)? {statement}?", function (_Rule$BlockStatement) {
	_inherits(if_, _Rule$BlockStatement);

	function if_() {
		_classCallCheck(this, if_);

		return _possibleConstructorReturn(this, (if_.__proto__ || Object.getPrototypeOf(if_)).apply(this, arguments));
	}

	_createClass(if_, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource = this.getMatchedSource(context),
			    condition = _getMatchedSource.condition,
			    statement = _getMatchedSource.statement,
			    block = _getMatchedSource.block;
			//			if (statement && block) throw new SyntaxError("if may only have inline statement OR block");


			var statements = _Rule2.default.Block.encloseStatements(statement, block);
			return "if (" + condition + ") " + statements;
		}
	}]);

	return if_;
}(_Rule2.default.BlockStatement));

parser.addStatement("backwards_if", "{statement} if {condition:expression} (?:(else|otherwise) {elseStatement:statement})?", function (_Rule$Statement) {
	_inherits(backwards_if, _Rule$Statement);

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

			var output = "if (" + condition + ") { " + statement + " }";
			if (elseStatement) output += "\nelse { " + elseStatement + " }";
			return output;
		}
	}]);

	return backwards_if;
}(_Rule2.default.Statement));

parser.addStatement("else_if", "(else|otherwise) if {condition:expression} (then|:) {statement}?", function (_Rule$BlockStatement2) {
	_inherits(else_if, _Rule$BlockStatement2);

	function else_if() {
		_classCallCheck(this, else_if);

		return _possibleConstructorReturn(this, (else_if.__proto__ || Object.getPrototypeOf(else_if)).apply(this, arguments));
	}

	_createClass(else_if, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource3 = this.getMatchedSource(context),
			    condition = _getMatchedSource3.condition,
			    statement = _getMatchedSource3.statement,
			    block = _getMatchedSource3.block;
			//			if (statement && block) throw new SyntaxError("else if may only have inline statement OR block");


			var statements = _Rule2.default.Block.encloseStatements(statement, block);
			return "else if (" + condition + ") " + statements;
		}
	}]);

	return else_if;
}(_Rule2.default.BlockStatement));

parser.addStatement("else", "(else|otherwise) (:)? {statement}?", function (_Rule$BlockStatement3) {
	_inherits(else_, _Rule$BlockStatement3);

	function else_() {
		_classCallCheck(this, else_);

		return _possibleConstructorReturn(this, (else_.__proto__ || Object.getPrototypeOf(else_)).apply(this, arguments));
	}

	_createClass(else_, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource4 = this.getMatchedSource(context),
			    statement = _getMatchedSource4.statement,
			    block = _getMatchedSource4.block;
			//			if (statement && block) throw new SyntaxError("else if may only have inline statement OR block");


			var statements = _Rule2.default.Block.encloseStatements(statement, block);
			return "else " + statements;
		}
	}]);

	return else_;
}(_Rule2.default.BlockStatement));

/***/ }),

/***/ 468:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(27);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(83);

var _Rule2 = _interopRequireDefault(_Rule);

var _string = __webpack_require__(98);

__webpack_require__(68);

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

/***/ 469:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(27);

var _Parser2 = _interopRequireDefault(_Parser);

var _RuleSyntax = __webpack_require__(67);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

__webpack_require__(68);

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

/***/ 470:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(27);

var _Parser2 = _interopRequireDefault(_Parser);

var _RuleSyntax = __webpack_require__(67);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

__webpack_require__(68);

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

/***/ 471:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(27);

var _Parser2 = _interopRequireDefault(_Parser);

var _RuleSyntax = __webpack_require__(67);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _global = __webpack_require__(153);

var _global2 = _interopRequireDefault(_global);

var _string = __webpack_require__(98);

__webpack_require__(68);

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
parser.addStatement("declare_action", "action (keywords:{word}|{type})+ (\\:)? {statement}?", function (_Rule$BlockStatement) {
	_inherits(declare_action, _Rule$BlockStatement);

	function declare_action() {
		_classCallCheck(this, declare_action);

		return _possibleConstructorReturn(this, (declare_action.__proto__ || Object.getPrototypeOf(declare_action)).apply(this, arguments));
	}

	_createClass(declare_action, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource4 = this.getMatchedSource(context),
			    keywords = _getMatchedSource4.keywords,
			    statement = _getMatchedSource4.statement,
			    block = _getMatchedSource4.block;

			// if there's only one keyword, it can't be a blacklisted identifier or a type


			var keywordResults = this.results.keywords;
			if (keywords.length === 1) {
				var keyword = keywords[0];
				if (keywordResults[0].matched instanceof _RuleSyntax2.default.Type) {
					throw new SyntaxError("parse('declare_action'): one-word actions may not be types: " + keyword);
				}

				console.warn("FIXME: parser.rules.identifier");
				// HACK: `global.parser` is a hack here for convenience in testing...
				var _parser = context ? context.parser : _global2.default.parser;
				if (_parser.rules.identifier.blacklist[keyword]) {
					throw new SyntaxError("parse('declare_action'): one-word actions may not be blacklisted identifiers\": " + keyword);
				}
			}

			// figure out arguments and/or types
			var args = [];
			var types = [];
			// if any of the words are types (capital letter) make that an argument of the same name.
			keywordResults.matched.map(function (item, index) {
				if (item instanceof _RuleSyntax2.default.Type) {
					var Type = keywords[index];
					var type = Type.toLowerCase();
					types.push([Type, type]);
					keywords[index] = type;
					args.push(type);
				}
			});
			// get static method name and arguments for output
			var methodName = keywords.join("_");
			args = args.join(", ");

			// figure out if there are any conditions on the above
			var conditions = types.map(function (_ref) {
				var _ref2 = _slicedToArray(_ref, 2),
				    Type = _ref2[0],
				    type = _ref2[1];

				return "\tif (!spell.isA(" + type + ", " + Type + ")) return undefined";
			});

			var statements = _RuleSyntax2.default.Block.encloseStatements(conditions, statement, block);

			// Create as a STATIC function
			//TODO: create as an instance function we can call on ourself!
			return "static " + methodName + "(" + args + ") " + statements;
		}
	}]);

	return declare_action;
}(_RuleSyntax2.default.BlockStatement));

// Getter either with or without arguments.
// If you specify arguments, yields a normal function which returns a value.
parser.addStatement("getter", "get {identifier} {args}? (\\:)? {expression}?", function (_Rule$Statement3) {
	_inherits(getter, _Rule$Statement3);

	function getter() {
		_classCallCheck(this, getter);

		return _possibleConstructorReturn(this, (getter.__proto__ || Object.getPrototypeOf(getter)).apply(this, arguments));
	}

	_createClass(getter, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource5 = this.getMatchedSource(context),
			    identifier = _getMatchedSource5.identifier,
			    args = _getMatchedSource5.args,
			    expression = _getMatchedSource5.expression;

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
parser.addStatement("setter", "set {identifier} {args}? (\\:)? {statement}?", function (_Rule$Statement4) {
	_inherits(setter, _Rule$Statement4);

	function setter() {
		_classCallCheck(this, setter);

		return _possibleConstructorReturn(this, (setter.__proto__ || Object.getPrototypeOf(setter)).apply(this, arguments));
	}

	_createClass(setter, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource6 = this.getMatchedSource(context),
			    identifier = _getMatchedSource6.identifier,
			    _getMatchedSource6$ar = _getMatchedSource6.args,
			    args = _getMatchedSource6$ar === undefined ? [identifier] : _getMatchedSource6$ar,
			    _getMatchedSource6$st = _getMatchedSource6.statement,
			    statement = _getMatchedSource6$st === undefined ? "" : _getMatchedSource6$st;
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
parser.addStatement("declare_property", "(scope:property|constant|shared property) {identifier} (?:= {value:expression})?", function (_Rule$Statement5) {
	_inherits(declare_property, _Rule$Statement5);

	function declare_property() {
		_classCallCheck(this, declare_property);

		return _possibleConstructorReturn(this, (declare_property.__proto__ || Object.getPrototypeOf(declare_property)).apply(this, arguments));
	}

	_createClass(declare_property, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource7 = this.getMatchedSource(context),
			    scope = _getMatchedSource7.scope,
			    identifier = _getMatchedSource7.identifier,
			    _getMatchedSource7$va = _getMatchedSource7.value,
			    value = _getMatchedSource7$va === undefined ? "" : _getMatchedSource7$va;

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
parser.addStatement("declare_property_of_type", "property {identifier} as (a|an)? {type}", function (_Rule$Statement6) {
	_inherits(declare_property_of_type, _Rule$Statement6);

	function declare_property_of_type() {
		_classCallCheck(this, declare_property_of_type);

		return _possibleConstructorReturn(this, (declare_property_of_type.__proto__ || Object.getPrototypeOf(declare_property_of_type)).apply(this, arguments));
	}

	_createClass(declare_property_of_type, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource8 = this.getMatchedSource(context),
			    identifier = _getMatchedSource8.identifier,
			    type = _getMatchedSource8.type;

			return "get " + identifier + "() { return this.__" + identifier + " }\n" + ("set " + identifier + "(value) { if (spell.isA(value, " + type + ") this.__" + identifier + " = value }");
		}
	}]);

	return declare_property_of_type;
}(_RuleSyntax2.default.Statement));

// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
parser.addStatement("declare_property_as_one_of", "property {identifier} as one of {list:literal_list}", function (_Rule$Statement7) {
	_inherits(declare_property_as_one_of, _Rule$Statement7);

	function declare_property_as_one_of() {
		_classCallCheck(this, declare_property_as_one_of);

		return _possibleConstructorReturn(this, (declare_property_as_one_of.__proto__ || Object.getPrototypeOf(declare_property_as_one_of)).apply(this, arguments));
	}

	_createClass(declare_property_as_one_of, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource9 = this.getMatchedSource(context),
			    identifier = _getMatchedSource9.identifier,
			    list = _getMatchedSource9.list;

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
			var _results = this.results,
			    expression = _results.expression,
			    properties = _results.properties;

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
			var _getMatchedSource10 = this.getMatchedSource(context),
			    expression = _getMatchedSource10.expression,
			    properties = _getMatchedSource10.properties;

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
			var _getMatchedSource11 = this.getMatchedSource(context),
			    identifier = _getMatchedSource11.identifier;

			return "this." + identifier;
		}
	}]);

	return my_property_expression;
}(_RuleSyntax2.default.Expression));

/***/ }),

/***/ 472:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(251)(undefined);
// imports


// module
exports.push([module.i, ".oak.spacer {\n  position: relative;\n  display: block;\n}\n.oak.spacer.inline {\n  display: inline-block;\n  vertical-align: baseline;\n}\n.oak.spacer.fluid {\n  width: 100%;\n  flex: 1 1 100%;\n}\n.oak.spacer.tiny {\n  width: 2px;\n  height: 2px;\n}\n.oak.spacer.small {\n  width: 4px;\n  height: 4px;\n}\n.oak.spacer.medium {\n  width: 10px;\n  height: 10px;\n}\n.oak.spacer.large {\n  width: 20px;\n  height: 20px;\n}\n.oak.spacer.huge {\n  width: 30px;\n  height: 30px;\n}\n.oak.spacer.massive {\n  width: 50px;\n  height: 50px;\n}\n", ""]);

// exports


/***/ }),

/***/ 473:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(251)(undefined);
// imports


// module
exports.push([module.i, ".fullWidth {\n  width: 100%;\n}\n.fullHeight {\n  height: 100%;\n}\n.fullSize {\n  width: 100%;\n  height: 100%;\n}\n", ""]);

// exports


/***/ }),

/***/ 474:
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
  var invariant = __webpack_require__(155);
  var warning = __webpack_require__(254);
  var ReactPropTypesSecret = __webpack_require__(253);
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

/***/ 475:
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



var emptyFunction = __webpack_require__(154);
var invariant = __webpack_require__(155);

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

/***/ 476:
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



var emptyFunction = __webpack_require__(154);
var invariant = __webpack_require__(155);
var warning = __webpack_require__(254);

var ReactPropTypesSecret = __webpack_require__(253);
var checkPropTypes = __webpack_require__(474);

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

/***/ 564:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_react__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__store__ = __webpack_require__(106);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__event_handlers__ = __webpack_require__(281);
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

/***/ 565:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__class_decorator__ = __webpack_require__(564);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__method_decorator__ = __webpack_require__(566);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__method_decorator_scoped__ = __webpack_require__(567);
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

/***/ 566:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__store__ = __webpack_require__(106);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__event_handlers__ = __webpack_require__(281);
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

/***/ 567:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__lib_match_keys__ = __webpack_require__(282);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__lib_parse_keys__ = __webpack_require__(283);
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

/***/ 568:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__lib_array_from__ = __webpack_require__(569);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__lib_array_from___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__lib_array_from__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__decorators__ = __webpack_require__(565);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return __WEBPACK_IMPORTED_MODULE_1__decorators__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "keydownScoped", function() { return __WEBPACK_IMPORTED_MODULE_1__decorators__["b"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__store__ = __webpack_require__(106);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "setBinding", function() { return __WEBPACK_IMPORTED_MODULE_2__store__["setBinding"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__lib_keys__ = __webpack_require__(105);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Keys", function() { return __WEBPACK_IMPORTED_MODULE_3__lib_keys__["a"]; });
// polyfill array.from (mainly for IE)


// @keydown and @keydownScoped


// setBinding - only useful if you're not going to use decorators


// Keys - use this to find key codes for strings. for example: Keys.j, Keys.enter


/***/ }),

/***/ 569:
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

/***/ 570:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_react_dom__ = __webpack_require__(66);
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

/***/ 571:
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

/***/ 572:
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

/***/ 67:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _memoize = __webpack_require__(464);

var _Parser = __webpack_require__(27);

var _Parser2 = _interopRequireDefault(_Parser);

var _Rule = __webpack_require__(83);

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

/***/ 68:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _class, _temp;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Parser = __webpack_require__(27);

var _Parser2 = _interopRequireDefault(_Parser);

var _RuleSyntax = __webpack_require__(67);

var _RuleSyntax2 = _interopRequireDefault(_RuleSyntax);

var _Tokenizer = __webpack_require__(97);

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

parser.addRule("statements", _RuleSyntax2.default.Statements);
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
_RuleSyntax2.default.Number = (_temp = _class = function (_Rule) {
	_inherits(number, _Rule);

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
_RuleSyntax2.default.Text = function (_Rule2) {
	_inherits(text, _Rule2);

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

/***/ 83:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

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


var _Parser = __webpack_require__(27);

var _Parser2 = _interopRequireDefault(_Parser);

var _global = __webpack_require__(153);

var _global2 = _interopRequireDefault(_global);

var _string = __webpack_require__(98);

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
		key: "_addResults",
		value: function _addResults(results, matched) {
			var index = 0,
			    match = undefined;
			while (match = matched[index++]) {
				if (match.promote) {
					return this._addResults(results, match.matched);
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
			var results = this._addResults({}, this.matched);
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
		value: function toSource(context) {
			if (!this.matched) return undefined;
			return this.matched.map(function (match) {
				return match.toSource(context);
			});
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

// Blank line representation in parser output.
Rule.BlankLine = function (_Rule8) {
	_inherits(blank_line, _Rule8);

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
}(Rule);

// Parser error representation in parser output.
Rule.StatementParseError = function (_Rule9) {
	_inherits(parse_error, _Rule9);

	function parse_error() {
		var _ref3;

		_classCallCheck(this, parse_error);

		for (var _len6 = arguments.length, props = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
			props[_key6] = arguments[_key6];
		}

		var _this15 = _possibleConstructorReturn(this, (_ref3 = parse_error.__proto__ || Object.getPrototypeOf(parse_error)).call.apply(_ref3, [this].concat(props)));

		if (_Parser2.default.WARN) console.warn(_this15.message);
		return _this15;
	}

	_createClass(parse_error, [{
		key: "toSource",
		value: function toSource(context) {
			return "// " + this.message.split("\n").join("\n// ");
		}
	}, {
		key: "message",
		get: function get() {
			if (this.parsed) {
				return "CANT PARSE ENTIRE STATEMENT\n" + "PARSED      : `" + this.parsed + "`\n" + "CAN'T PARSE : `" + this.unparsed + "`";
			}
			return "CAN'T PARSE STATEMENT: `" + this.unparsed + "`";
		}
	}]);

	return parse_error;
}(Rule);

// Comment rule -- matches tokens of type `Tokenizer.Comment`.
Rule.Comment = function (_Rule10) {
	_inherits(comment, _Rule10);

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
			if (!(token instanceof Tokenizer.Comment)) return undefined;
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
}(Rule);

// A block is used to parse a nested block of statements.
Rule.Block = function (_Rule$Statement) {
	_inherits(block, _Rule$Statement);

	function block() {
		_classCallCheck(this, block);

		return _possibleConstructorReturn(this, (block.__proto__ || Object.getPrototypeOf(block)).apply(this, arguments));
	}

	_createClass(block, [{
		key: "parseBlock",


		// Parse the entire `block`, returning results.
		value: function parseBlock(parser, block) {
			var _this18 = this;

			var indent = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			var matched = [];
			//console.warn("block:", block);
			block.contents.forEach(function (item, index) {
				var result = void 0;
				if (item.length === 0) {
					matched.push(new Rule.BlankLine());
				} else if (item instanceof Tokenizer.Block) {
					var last = matched[matched.length - 1];
					if (last.parseBlock) {
						last.parseBlock(parser, item, indent + 1);
					} else {
						var _block = _this18.parseBlock(parser, item, indent + 1);
						matched.push(_block);
					}
				} else {
					matched = matched.concat(_this18.parseStatement(parser, item));
				}
			});

			return new Rule.Block({
				indent: indent,
				matched: matched
			});
		}

		// Parse a single statement (a line's worth of `tokens`).
		// Skips whitespace at the beginning of the line.
		// Auto-matches comment in the middle of the line.
		// Returns array of results.

	}, {
		key: "parseStatement",
		value: function parseStatement(parser, tokens) {
			var results = [];
			var start = 0,
			    end = tokens.length;
			var statement = void 0,
			    comment = void 0;

			// check for an indent at the start of the line
			if (tokens[start] instanceof Tokenizer.Whitespace) start++;

			// check for a comment at the end of the tokens
			if (tokens[end - 1] instanceof Tokenizer.Comment) {
				comment = parser.parseRuleOrDie("comment", tokens, end - 1, end, undefined, "parseStatement");
				// add comment FIRST if found
				results.push(comment);
				end--;
			}

			// parse the rest as a "statement"
			statement = parser.parseRuleOrDie("statement", tokens, start, end, undefined, "parseStatement");

			// complain if no statement and no comment
			if (!statement && !comment) {
				var error = new Rule.StatementParseError({
					unparsed: tokens.slice(start, end).join(" ")
				});
				results.push(error);
			}

			// complain can't parse the entire line!
			else if (statement && statement.nextStart !== end) {
					var _error = new Rule.StatementParseError({
						parsed: tokens.slice(start, statement.nextStart).join(" "),
						unparsed: tokens.slice(statement.nextStart, end).join(" ")
					});
					results.push(_error);
				}

				// Otherwise add the statement
				else if (statement) {
						results.push(statement);
					}

			return results;
		}

		// Return source for this block as an array of indented lines WITHOUT `{` OR `}`.

	}, {
		key: "blockToSource",
		value: function blockToSource(context) {
			var results = [];

			for (var i = 0; i < this.matched.length; i++) {
				var _match4 = this.matched[i];
				var source = _match4.toSource(context) || "";
				if ((0, _string.isWhitespace)(source)) {
					results.push("");
				} else {
					source = source.split("\n");
					results = results.concat(source);
				}
			}
			if (this.indent !== 0) {
				return "\t" + results.join("\n\t");
			}
			return results.join("\n");
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			return " {\n" + this.blockToSource(context) + "\n" + "}";
		}

		// Format array of `statements` as a JS output block:
		//	- if `statements` is empty, returns `{}`
		//	- if `statements is a single line, returns `{ statement }`
		//	- else returns multiple lines

	}], [{
		key: "encloseStatements",
		value: function encloseStatements() {
			var statements = [];

			for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
				args[_key7] = arguments[_key7];
			}

			for (var i = 0; i < args.length; i++) {
				var arg = args[i];
				if (Array.isArray(arg)) {
					statements = statements.concat(arg);
				} else if (typeof arg === "string") {
					statements.push(arg);
				}
			}
			statements = statements.join("\n");

			if (!statements) return "{}";
			if (!statements.includes("\n") && statements.length < 40) {
				return "{ " + statements.trim() + " }";
			}
			if (statements[0] !== "\t") statements = "\t" + statements;
			return "{\n" + statements + "\n}";
		}
	}]);

	return block;
}(Rule.Statement);

// `Statements` are a special case for a block of `Statement` rules
//	that understand nesting and comments.
//
// This is a top-level construct, e.g. used to parse an entire file.
Rule.Statements = function (_Rule$Block) {
	_inherits(statements, _Rule$Block);

	function statements() {
		_classCallCheck(this, statements);

		return _possibleConstructorReturn(this, (statements.__proto__ || Object.getPrototypeOf(statements)).apply(this, arguments));
	}

	_createClass(statements, [{
		key: "parse",


		// Split statements up into blocks and parse 'em.
		value: function parse(parser, tokens) {
			var start = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
			var end = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : tokens.length;
			var stack = arguments[4];

			var block = Tokenizer.breakIntoBlocks(tokens, start, end);

			var matched = this.parseBlock(parser, block);
			if (!matched) return undefined;

			return this.clone({
				matched: matched,
				nextStart: end
			});
		}

		// Output statements WITHOUT curly braces around them.

	}, {
		key: "toSource",
		value: function toSource(context) {
			return this.matched.blockToSource(context);
		}
	}]);

	return statements;
}(Rule.Block);

// A `BlockStatement` (e.g. an `if` or `repeat`):
//	- has an initial `statement`
//	- MAY have an inline `statement` (on the same line, generally after a `:`)
//	- MAY have contents as an embedded `block`
//
//	In your `getMatchedSource()`, `block` will be the resulting block output, if there is one.
//	It's up to your rule to do something with it...
Rule.BlockStatement = function (_Rule$Block2) {
	_inherits(block_statement, _Rule$Block2);

	function block_statement() {
		_classCallCheck(this, block_statement);

		return _possibleConstructorReturn(this, (block_statement.__proto__ || Object.getPrototypeOf(block_statement)).apply(this, arguments));
	}

	_createClass(block_statement, [{
		key: "parseBlock",


		// Parse a block and add it to `this.block`
		value: function parseBlock(parser, block) {
			var indent = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			this.block = _get(block_statement.prototype.__proto__ || Object.getPrototypeOf(block_statement.prototype), "parseBlock", this).apply(this, arguments);
		}

		// Return `toSource()` for our `results` as a map.
		// If you pass `keys`, we'll restrict to just those keys.

	}, {
		key: "getMatchedSource",
		value: function getMatchedSource(context) {
			var _get2;

			for (var _len8 = arguments.length, keys = Array(_len8 > 1 ? _len8 - 1 : 0), _key8 = 1; _key8 < _len8; _key8++) {
				keys[_key8 - 1] = arguments[_key8];
			}

			var output = (_get2 = _get(block_statement.prototype.__proto__ || Object.getPrototypeOf(block_statement.prototype), "getMatchedSource", this)).call.apply(_get2, [this, context].concat(keys));
			// add `block` to output if defined.
			if (this.block) {
				output.block = this.block.blockToSource(context);
			}
			return output;
		}
	}]);

	return block_statement;
}(Rule.Block);

/***/ }),

/***/ 905:
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

/***/ 906:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(472);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(457)(content, options);
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

/***/ 907:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(473);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(457)(content, options);
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

/***/ 908:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactDom = __webpack_require__(66);

var _reactDom2 = _interopRequireDefault(_reactDom);

var _index = __webpack_require__(459);

var _index2 = _interopRequireDefault(_index);

var _SpellEditor = __webpack_require__(458);

var _SpellEditor2 = _interopRequireDefault(_SpellEditor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Kick off our top-level element


// Parser
// Common imports
_reactDom2.default.render(_react2.default.createElement(_SpellEditor2.default, null), document.getElementById('react-root'));

// App-specific imports

/***/ }),

/***/ 97:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _string = __webpack_require__(98);

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

	// Should we warn about anomalous conditions?
	WARN: false,

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
		if (start !== end) {
			if (Tokenizer.WARN) console.warn("tokenize(): didn't consume: `", text.slice(start, end) + "`");
		}

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
			if (Tokenizer.WARN) {
				console.warn("Missing expected end `>` for jsxElement", jsxElement, "`" + text.slice(start, nextStart) + "`");
			}
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
			if (Tokenizer.WARN) {
				console.warn("matchJSXChildren(" + text.slice(start, nextStart + 10) + ": didn't match end child!");
			}
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
			if (Tokenizer.WARN) {
				console.warn("matchJSXText(" + text.slice(start, start + 50) + "): JSX seems to be unbalanced.");
			}
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

	// Given a set of tokens, slice whitespace (indent, NEWLINE or normal whitespace) from the front.
	removeLeadingWhitespace: function removeLeadingWhitespace(tokens) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

		while (tokens[start] instanceof Tokenizer.Whitespace) {
			start++;
		}if (start === 0) return tokens;
		return tokens.slice(start);
	},


	// Given a set of tokens, remove ALL "normal" whitespace tokens (NOT indent or NEWLINE).
	removeNormalWhitespace: function removeNormalWhitespace(tokens) {
		return tokens.filter(function (token) {
			return !Tokenizer.isNormalWhitespace(token);
		});
	},


	// Return `true` if `token` is "normal" whitespce (not a newline or indent)
	isNormalWhitespace: function isNormalWhitespace(token) {
		return token instanceof Tokenizer.Whitespace && !(token instanceof Tokenizer.Indent) && token !== Tokenizer.NEWLINE;
	},


	//
	// ### Block / indent processing
	//

	// Simple block class for `breakIntoBlocks`.
	Block: function () {
		function block(props) {
			_classCallCheck(this, block);

			Object.assign(this, props);
			if (!this.contents) this.contents = [];
		}

		_createClass(block, [{
			key: "toString",
			value: function toString() {
				return JSON.stringify(this, null, "\t");
			}
		}]);

		return block;
	}(),

	// Break tokens into an array of arrays by `NEWLINE`s.
	// Returns an array of lines WITHOUT the `NEWLINE`s.
	// Lines which are composed solely of whitespace are treated as blank.
	breakIntoLines: function breakIntoLines(tokens) {
		// Convert to lines.
		var currentLine = [];
		var lines = [currentLine];
		tokens.forEach(function (token) {
			// add new array for each newline
			if (token === Tokenizer.NEWLINE) {
				// create a new line and push it in
				currentLine = [];
				return lines.push(currentLine);
			}

			// otherwise just add to the current line
			currentLine.push(token);
		});

		// Clear any lines that are only whitespace
		lines.forEach(function (line, index) {
			if (line.length === 1 && line[0] instanceof Tokenizer.Whitespace) lines[index] = [];
		});

		return lines;
	},


	// Return indents of the specified lines.
	// Indents empty lines (NEWLINEs) into the block AFTER they appear.
	getLineIndents: function getLineIndents(lines) {
		var defaultIndent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

		if (lines.length === 0) return [];

		var indents = lines.map(Tokenizer.getLineIndent);
		var end = indents.length;

		// figure out the indent of the first non-empty line
		var startIndent = getNextIndent(0);
		if (startIndent === undefined) startIndent = defaultIndent;

		// indent blank lines to the indent AFTER them
		for (var index = 0; index < end; index++) {
			if (indents[index] === undefined) {
				indents[index] = getNextIndent(index + 1);
			}
		}
		return indents;

		// Return the value of the NEXT non-undefined indent.
		function getNextIndent(index) {
			while (index < end) {
				if (indents[index] !== undefined) return indents[index];
				index++;
			}
			return startIndent;
		}
	},


	// Return the indent of a line of tokens.
	// Returns `0` if not indented.
	// Returns `undefined` if a blank line.
	getLineIndent: function getLineIndent(line) {
		if (!line || line.length === 0) return undefined;
		if (line[0] instanceof Tokenizer.Indent) return line[0].length;
		return 0;
	},


	// Break `tokens` between `start` and `end` into a `Tokenizer.Block` with nested `contents`.
	// Skips "normal" whitespace and indents in the results.
	breakIntoBlocks: function breakIntoBlocks(tokens) {
		var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var end = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : tokens.length;

		// restrict to tokens of interest
		tokens = tokens.slice(start, end);
		// remove "normal" whitespace
		//TODO: better to leave this to consumers???
		tokens = Tokenizer.removeNormalWhitespace(tokens);

		// break into lines & return early if no lines
		var lines = Tokenizer.breakIntoLines(tokens);
		if (lines.length === 0) return [];

		// figure out indents
		var indents = Tokenizer.getLineIndents(lines);

		// First block is at the MINIMUM indent of all lines!
		var maxIndent = Math.min.apply(Math, indents);
		var block = new Tokenizer.Block({ indent: maxIndent });

		// stack of blocks
		var stack = [block];

		lines.forEach(function (line, index) {
			// Remove leading whitespace (eg: indents)
			line = Tokenizer.removeLeadingWhitespace(line);

			var lineIndent = indents[index];
			var top = stack[stack.length - 1];
			// If indenting, push new block(s)
			if (lineIndent > top.indent) {
				while (lineIndent > top.indent) {
					var newBlock = new Tokenizer.Block({ indent: top.indent + 1 });
					top.contents.push(newBlock);
					stack.push(newBlock);

					top = newBlock;
				}
			}
			// If outdenting: pop block(s)
			else if (lineIndent < top.indent) {
					while (lineIndent < top.indent) {
						stack.pop();
						top = stack[stack.length - 1];
					}
				}
			// add to top block
			top.contents.push(line);
		});

		return block;
	}

};

exports.default = Tokenizer;

/***/ }),

/***/ 98:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.isWhitespace = isWhitespace;
exports.pluralize = pluralize;
exports.isPlural = isPlural;
exports.singularize = singularize;
exports.isSingular = isSingular;
exports.getTabs = getTabs;

var _global = __webpack_require__(153);

var _global2 = _interopRequireDefault(_global);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Return true if text is all whitespace, including empty string.
var ALL_WHITESPACE = /^\s*$/;
function isWhitespace(text) {
	return ALL_WHITESPACE.test(text);
}

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

/***/ })

},[908]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2tleXMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL3N0b3JlLmpzIiwid2VicGFjazovLy8uL3NyYy91dGlscy9nbG9iYWwuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvZW1wdHlGdW5jdGlvbi5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvfi9mYmpzL2xpYi9pbnZhcmlhbnQuanMiLCJ3ZWJwYWNrOi8vLy4vfi9jc3MtbG9hZGVyL2xpYi9jc3MtYmFzZS5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL2xpYi9SZWFjdFByb3BUeXBlc1NlY3JldC5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvfi9mYmpzL2xpYi93YXJuaW5nLmpzIiwid2VicGFjazovLy8uL3NyYy9QYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2V2ZW50X2hhbmRsZXJzLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvbWF0Y2hfa2V5cy5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL3BhcnNlX2tleXMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9zdHlsZS1sb2FkZXIvYWRkU3R5bGVzLmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BlbGxFZGl0b3IuanN4Iiwid2VicGFjazovLy8uL3NyYy9pbmRleC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL0V4YW1wbGVTdG9yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL1NwYWNlci5qc3giLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9UYWJiYWJsZVRleHRBcmVhLmpzeCIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL3V0aWwuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL0pTWC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvYWxsLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9pZi5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvbGlzdHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvc3RhdGVtZW50cy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvdHlwZXMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9TcGFjZXIubGVzcyIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL3N0eWxlcy5sZXNzIiwid2VicGFjazovLy8uL34vcHJvcC10eXBlcy9jaGVja1Byb3BUeXBlcy5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvZmFjdG9yeVdpdGhUaHJvd2luZ1NoaW1zLmpzIiwid2VicGFjazovLy8uL34vcHJvcC10eXBlcy9mYWN0b3J5V2l0aFR5cGVDaGVja2Vycy5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvZGVjb3JhdG9ycy9jbGFzc19kZWNvcmF0b3IuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvbWV0aG9kX2RlY29yYXRvci5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvZGVjb3JhdG9ycy9tZXRob2RfZGVjb3JhdG9yX3Njb3BlZC5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9hcnJheS5mcm9tLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvZG9tX2hlbHBlcnMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9saXN0ZW5lcnMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi91dWlkLmpzIiwid2VicGFjazovLy8uL3NyYy9SdWxlU3ludGF4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9jb3JlLmpzIiwid2VicGFjazovLy8uL3NyYy9SdWxlLmpzIiwid2VicGFjazovLy8uL34vc3R5bGUtbG9hZGVyL2ZpeFVybHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9TcGFjZXIubGVzcz8yMmFlIiwid2VicGFjazovLy8uL3NyYy9hcHAvc3R5bGVzLmxlc3M/YjAxMiIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL2luZGV4LmpzeCIsIndlYnBhY2s6Ly8vLi9zcmMvVG9rZW5pemVyLmpzIiwid2VicGFjazovLy8uL3NyYy91dGlscy9zdHJpbmcuanMiXSwibmFtZXMiOlsiZ2xvYmFsX2lkZW50aWZpZXIiLCJnbG9iYWwiLCJ3aW5kb3ciLCJzZWxmIiwiY29uc29sZSIsImdyb3VwIiwibG9nIiwiZ3JvdXBFbmQiLCJQYXJzZXIiLCJwcm9wZXJ0aWVzIiwiVG9rZW56aWVyIiwiX3J1bGVzIiwiT2JqZWN0IiwiYXNzaWduIiwicnVsZU5hbWUiLCJ0ZXh0IiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiVElNRSIsInRpbWUiLCJ0b2tlbnMiLCJ0b2tlbml6ZSIsImZpbHRlciIsImlzTm9ybWFsV2hpdGVzcGFjZSIsInRva2VuIiwidGltZUVuZCIsInVuZGVmaW5lZCIsInJlbW92ZUxlYWRpbmdXaGl0ZXNwYWNlIiwicmVzdWx0IiwicGFyc2VSdWxlT3JEaWUiLCJwYXJzZSIsIlN5bnRheEVycm9yIiwidG9Tb3VyY2UiLCJzdGFydCIsImVuZCIsInN0YWNrIiwiY2FsbGluZ0NvbnRleHQiLCJydWxlRm91bmQiLCJpbXBvcnRzIiwiaW5kZXgiLCJwYXJzZXIiLCJyZXN1bHRzIiwicnVsZSIsInB1c2giLCJyZWR1Y2UiLCJsYXJnZXN0IiwibmV4dCIsIm5leHRTdGFydCIsInRlc3QiLCJuZXh0UnVsZSIsIl9pbXBvcnRzIiwiY29uY2F0IiwicmV2ZXJzZSIsIl9faW1wb3J0cyIsIl9fcnVsZXMiLCJBcnJheSIsImlzQXJyYXkiLCJmb3JFYWNoIiwiYWRkUnVsZSIsImV4aXN0aW5nIiwiQWx0ZXJuYXRpdmVzIiwiREVCVUciLCJydWxlcyIsImFyZ3VtZW50IiwicnVsZUlzTGVmdFJlY3Vyc2l2ZSIsIlNlcXVlbmNlIiwiVHlwZUVycm9yIiwidGVzdFJ1bGUiLCJpbmZvIiwibGVmdFJlY3Vyc2l2ZSIsIm1hcCIsImdldENvbnRleHRPckRpZSIsIm91dHB1dCIsImFsdGVybmF0aXZlcyIsImFsdGVybmF0aXZlIiwiY29udGV4dE5hbWUiLCJSRUdJU1RSWSIsInN1YnJ1bGUiLCJvcHRpb25hbCIsIlN1YnJ1bGUiLCJzdGFydFRva2VuIiwiZW5kVG9rZW4iLCJuZXN0aW5nIiwibmVzdGVkIiwibGFzdEluZGV4Iiwic2xpY2UiLCJzdHJpbmciLCJzcGxpdCIsImNoYXIiLCJsaXN0IiwiUkVHRVhQX1NQRUNJQUxfQ0hBUkFDVEVSUyIsImpvaW4iLCJmbGFncyIsIlJlZ0V4cCIsImVzY2FwZVJlZ0V4cENoYXJhY3RlcnMiLCJXQVJOIiwiY2hhcnMiLCJTcGVsbEVkaXRvciIsInByb3BzIiwiZXhhbXBsZXMiLCJsb2FkIiwic3BlbGxFZGl0b3IiLCJzYXZlIiwicmV2ZXJ0IiwiY29tcGlsZSIsImNyZWF0ZSIsImRlbGV0ZSIsInJlbmFtZSIsImR1cGxpY2F0ZSIsInJlc2V0IiwidGl0bGVzIiwic2VsZWN0ZWQiLCJkaXJ0eSIsImNvZGUiLCJvcHRpb25zIiwidmFsdWUiLCJ0aXRsZSIsImNvbnRlbnQiLCJvbkNsaWNrIiwic2VsZWN0IiwiZGlydHlCdXR0b25zIiwicG9zaXRpb24iLCJyaWdodCIsInRvcCIsIm1hcmdpbiIsImNvbXBpbGVCdXR0b24iLCJ3aWR0aCIsImxlZnQiLCJoZWlnaHQiLCJwYWRkaW5nVG9wIiwiZXZlbnQiLCJ1cGRhdGUiLCJ0YXJnZXQiLCJDb21wb25lbnQiLCJkZWZhdWx0UHJvcHMiLCJUb2tlbml6ZXIiLCJSdWxlIiwiZXhwb3J0cyIsImJpbmQiLCJFeGFtcGxlU3RvcmUiLCJsb2NhbFN0b3JhZ2UiLCJzcGVsbEVkaXRvckV4YW1wbGVzIiwic3BlbGxFZGl0b3JFeGFtcGxlIiwibG9jYXRpb24iLCJyZWxvYWQiLCJKU09OIiwiX3NhdmVkRXhhbXBsZXMiLCJzdHJpbmdpZnkiLCJleGFtcGxlIiwia2V5cyIsIm5hbWUiLCJza2lwU2F2ZSIsInNob3dDb25maXJtIiwiY29uZmlybSIsInByb21wdCIsIm9sZE5hbWUiLCJuZXdOYW1lIiwid2FybiIsInNldFRpbWVvdXQiLCJTcGFjZXIiLCJjbGFzc05hbWUiLCJhcHBlYXJhbmNlIiwic2l6ZSIsImlubGluZSIsImZsdWlkIiwidGlueSIsInNtYWxsIiwibWVkaXVtIiwibGFyZ2UiLCJodWdlIiwibWFzc2l2ZSIsInNwYWNlclByb3BzIiwic3R5bGUiLCJwcm9wVHlwZXMiLCJudW1iZXIiLCJib29sIiwiVGFiYmFibGVUZXh0QXJlYSIsIm9uS2V5RG93biIsImtleUNvZGUiLCJwcmV2ZW50RGVmYXVsdCIsImVsZW1lbnQiLCJzZWxlY3Rpb25TdGFydCIsInNlbGVjdGlvbkVuZCIsIm5ld1RleHQiLCJzaGlmdEtleSIsImxhc3RJbmRleE9mIiwiaW5kZXhPZiIsImxpbmVzIiwibGluZSIsInN1YnN0ciIsIm9uQ2hhbmdlIiwiY2xhc3NOYW1lcyIsImFyZ3MiLCJhcmciLCJrZXkiLCJCb29sZWFuIiwibWVtb2l6ZWQiLCJkZWZpbmVNZW1vaXplZCIsInByb3BlcnR5IiwiZ2V0dGVyIiwiYXBwbHkiLCJkZWZpbmVQcm9wZXJ0eSIsImNvbmZpZ3VyYWJsZSIsImdldCIsImZvckNvbnRleHQiLCJKU1giLCJKU1hFbGVtZW50IiwiY2xvbmUiLCJtYXRjaGVkIiwiY29udGV4dCIsImpzeEVsZW1lbnQiLCJhdHRyaWJ1dGVzIiwiYXR0cnMiLCJKU1hFeHByZXNzaW9uIiwianN4RXhwcmVzc2lvblRvU291cmNlIiwiY2hpbGRyZW4iLCJjaGlsZCIsInRyaW0iLCJjaGlsZFNvdXJjZSIsImpzeEVsZW1lbnRUb1NvdXJjZSIsImpzeEV4cHJlc3Npb24iLCJ0YWdOYW1lIiwiYXR0cnNUb1NvdXJjZSIsImNoaWxkcmVuVG9Tb3VyY2UiLCJpbXBvcnQiLCJhZGRTdGF0ZW1lbnQiLCJnZXRNYXRjaGVkU291cmNlIiwiY29uZGl0aW9uIiwic3RhdGVtZW50IiwiYmxvY2siLCJzdGF0ZW1lbnRzIiwiQmxvY2siLCJlbmNsb3NlU3RhdGVtZW50cyIsIkJsb2NrU3RhdGVtZW50IiwiTWF0Y2giLCJtYXRjaCIsImVsc2VTdGF0ZW1lbnQiLCJTdGF0ZW1lbnQiLCJhZGRFeHByZXNzaW9uIiwiaWRlbnRpZmllciIsInRoaW5nIiwib3JkaW5hbCIsIktleXdvcmQiLCJhZGRLZXl3b3JkIiwiZXhwcmVzc2lvbiIsIkV4cHJlc3Npb24iLCJvcGVyYXRvciIsImJhbmciLCJpdGVtIiwiaXRlbVZhciIsInBvc2l0aW9uVmFyIiwibGhzIiwicmhzIiwidG9KUyIsInByZWNlZGVuY2UiLCJhIiwiYiIsInR5cGUiLCJhZGRTeW1ib2wiLCJTeW1ib2wiLCJtZXNzYWdlIiwib2tCdXR0b24iLCJjYW5jZWxCdXR0b24iLCJzdXBlclR5cGUiLCJhZGRMaXN0IiwicHJvcCIsIkxpc3QiLCJhZGRTZXF1ZW5jZSIsIm9wZW5zQmxvY2siLCJjbG9zZXNCbG9jayIsImtleXdvcmRzIiwia2V5d29yZFJlc3VsdHMiLCJrZXl3b3JkIiwiVHlwZSIsImJsYWNrbGlzdCIsInR5cGVzIiwidG9Mb3dlckNhc2UiLCJtZXRob2ROYW1lIiwiY29uZGl0aW9ucyIsIm1hdGNoZWRUZXh0Iiwic2NvcGUiLCJkZWNsYXJhdGlvbiIsInBsdXJhbCIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJsYXN0IiwicG9wIiwic3ludGF4VG9rZW4iLCJwYXJzZVJ1bGVTeW50YXhfc3ltYm9sIiwicGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUiLCJwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMiLCJwYXJzZVJ1bGVTeW50YXhfbGlzdCIsInBhcnNlUnVsZVN5bnRheF9yZXBlYXQiLCJLRVlXT1JEX1BBVFRFUk4iLCJwYXJzZVJ1bGVTeW50YXhfa2V5d29yZCIsImNvbnN0cnVjdG9yIiwiaSIsImlzRXNjYXBlZCIsInN0YXJ0c1dpdGgiLCJ0b1N0cmluZyIsImZpbmROZXN0ZWRUb2tlbnMiLCJwcm9tb3RlIiwiZ3JvdXBBbHRlcm5hdGl2ZXMiLCJjdXJyZW50Iiwic3ltYm9sIiwiUmVwZWF0IiwicGFyYW1zIiwiYmFuZ1Bvc2l0aW9uIiwibm90IiwiZGVsaW1pdGVyIiwiZGVmaW5lUHJvcGVydGllcyIsInByb3RvdHlwZSIsInJ1bGVTeW50YXgiLCJlIiwiZXJyb3IiLCJzdHJlYW0iLCJTdGF0ZW1lbnRzIiwiQ29tbWVudCIsIldvcmQiLCJyZXBsYWNlIiwiUGF0dGVybiIsInBhdHRlcm4iLCJJZGVudGlmaWVyIiwiYWRkVG9CbGFja2xpc3QiLCJOdW1iZXIiLCJOVU1CRVJfTkFNRVMiLCJ6ZXJvIiwib25lIiwidHdvIiwidGhyZWUiLCJmb3VyIiwiZml2ZSIsInNpeCIsInNldmVuIiwiZWlnaHQiLCJuaW5lIiwidGVuIiwiVGV4dCIsInF1b3RlZFN0cmluZyIsImVuZHNXaXRoIiwid29yZHMiLCJ3b3JkIiwiaGVhZFN0YXJ0c1dpdGgiLCJtYXRjaERlbGltaXRlciIsIm1hdGNoU3RhcnQiLCJtYXRjaGVzIiwic29tZSIsInNvdXJjZSIsImluY2x1ZGVzIiwiX2FkZFJlc3VsdHMiLCJhcmdOYW1lIiwiY29tbWVudCIsImJlc3RNYXRjaCIsImdldEJlc3RNYXRjaCIsImJlc3QiLCJpc0NvbXBvdW5kUnVsZSIsIkJsYW5rTGluZSIsIlN0YXRlbWVudFBhcnNlRXJyb3IiLCJwYXJzZWQiLCJ1bnBhcnNlZCIsIndoaXRlc3BhY2UiLCJpbmRlbnQiLCJjb250ZW50cyIsInBhcnNlQmxvY2siLCJwYXJzZVN0YXRlbWVudCIsIldoaXRlc3BhY2UiLCJibG9ja1RvU291cmNlIiwiYnJlYWtJbnRvQmxvY2tzIiwicmVuZGVyIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIm5ld2xpbmUiLCJJbmRlbnQiLCJORVdMSU5FIiwiZWF0VG9rZW5zIiwibWF0Y2hUb3BUb2tlbnMiLCJtZXRob2QiLCJjYWxsIiwibWF0Y2hXaGl0ZXNwYWNlIiwibWF0Y2hXb3JkIiwibWF0Y2hOdW1iZXIiLCJtYXRjaE5ld2xpbmUiLCJtYXRjaEpTWEVsZW1lbnQiLCJtYXRjaFRleHQiLCJtYXRjaENvbW1lbnQiLCJtYXRjaFN5bWJvbCIsImVhdFdoaXRlc3BhY2UiLCJ3aGl0ZVNwYWNlRW5kIiwid2hpdGVzcGFjZUVuZCIsIldPUkRfU1RBUlQiLCJXT1JEX0NIQVIiLCJ3b3JkRW5kIiwiTlVNQkVSX1NUQVJUIiwiTlVNQkVSIiwibnVtYmVyTWF0Y2giLCJtYXRjaEV4cHJlc3Npb25BdEhlYWQiLCJudW1iZXJTdHIiLCJwYXJzZUZsb2F0IiwicXVvdGVTeW1ib2wiLCJ0ZXh0RW5kIiwiQ09NTUVOVCIsImNvbW1lbnRTdGFydCIsImdldExpbmVBdEhlYWQiLCJjb21tZW50TWF0Y2giLCJjb21tZW50U3ltYm9sIiwibWF0Y2hKU1hTdGFydFRhZyIsImlzVW5hcnlUYWciLCJtYXRjaEpTWENoaWxkcmVuIiwiY2hpbGRFbmQiLCJKU1hfVEFHX1NUQVJUIiwidGFnTWF0Y2giLCJlbmRCaXQiLCJtYXRjaEpTWEF0dHJpYnV0ZSIsImF0dHJFbmQiLCJhdHRyc0FzU3RyaW5nIiwiY2hpbGRyZW5Bc1N0cmluZyIsImF0dHIiLCJlbmRUYWciLCJtYXRjaEpTWENoaWxkIiwibWF0Y2hKU1hFbmRUYWciLCJtYXRjaEpTWEV4cHJlc3Npb24iLCJtYXRjaEpTWFRleHQiLCJtYXRjaFN0cmluZ0F0SGVhZCIsIkpTWF9BVFRSSUJVVEVfU1RBUlQiLCJlcXVhbHMiLCJhdHRyaWJ1dGUiLCJKU1hBdHRyaWJ1dGUiLCJtYXRjaEpTWEF0dHJpYnV0ZVZhbHVlIiwidmFsdWVFbmQiLCJtYXRjaEpTWEF0dHJpYnV0ZVZhbHVlSWRlbnRpZmllciIsImVuZEluZGV4IiwiZmluZE1hdGNoaW5nQXRIZWFkIiwiSlNYX1RFWFRfRU5EX0NIQVJTIiwiZmluZEZpcnN0QXRIZWFkIiwianN4VGV4dCIsInN0cmluZ0VuZCIsImhlYWQiLCJzdGFydERlbGltaXRlciIsImVuZERlbGltaXRlciIsImFmdGVyUXVvdGUiLCJyZW1vdmVOb3JtYWxXaGl0ZXNwYWNlIiwiYnJlYWtJbnRvTGluZXMiLCJjdXJyZW50TGluZSIsImdldExpbmVJbmRlbnRzIiwiZGVmYXVsdEluZGVudCIsImluZGVudHMiLCJnZXRMaW5lSW5kZW50Iiwic3RhcnRJbmRlbnQiLCJnZXROZXh0SW5kZW50IiwibWF4SW5kZW50IiwiTWF0aCIsIm1pbiIsImxpbmVJbmRlbnQiLCJuZXdCbG9jayIsImlzV2hpdGVzcGFjZSIsInBsdXJhbGl6ZSIsImlzUGx1cmFsIiwic2luZ3VsYXJpemUiLCJpc1Npbmd1bGFyIiwiZ2V0VGFicyIsIkFMTF9XSElURVNQQUNFIiwiVEFCUyIsImFsbEV4cG9ydHMiLCJTVFJJTkciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTtBQUFBLG9HQUFvRyxtQkFBbUIsRUFBRSxtQkFBbUIsOEhBQThIOztBQUUxUTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBLENBQUM7O0FBRUQ7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FB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QUFDQTtBQUNBO0FBQ0EsY0FBYztBQUNkO0FBQ0EsZ0NBQWdDLHNCQUFzQjtBQUN0RDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQSxFQUFFO0FBQ0Y7QUFDQSxFQUFFO0FBQ0Y7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxFQUFFO0FBQ0Y7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxFQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7O0FBRUQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsRUFBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsRUFBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FB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O0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSwwQ0FBMEM7O0FBRTFDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLFFBQVE7QUFDckIsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDViw2QkFBNkI7QUFDN0IsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0JBQStCLEtBQUs7QUFDcEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCw0QkFBNEI7QUFDNUIsT0FBTztBQUNQO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUIsc0JBQXNCO0FBQzNDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EscUJBQXFCLDJCQUEyQjtBQUNoRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxxQkFBcUIsZ0NBQWdDO0FBQ3JEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7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dXJjZXNDb250ZW50IjpbInZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxuLy8gVE9ETzogTmVlZCBiZXR0ZXIsIG1vcmUgY29tcGxldGUsIGFuZCBtb3JlIG1ldGhvZGljYWwga2V5IGRlZmluaXRpb25zXG5cbnZhciBLZXlzID0ge1xuICBiYWNrc3BhY2U6IDgsXG4gIGRlbDogNDYsXG4gIGRlbGV0ZTogNDYsXG4gIHRhYjogOSxcbiAgZW50ZXI6IDEzLFxuICAncmV0dXJuJzogMTMsXG4gIGVzYzogMjcsXG4gIHNwYWNlOiAzMixcbiAgbGVmdDogMzcsXG4gIHVwOiAzOCxcbiAgcmlnaHQ6IDM5LFxuICBkb3duOiA0MCxcbiAgJzsnOiAxODYsXG4gICc9JzogMTg3LFxuICAnLCc6IDE4OCxcbiAgJy0nOiAxODksXG4gICcuJzogMTkwLFxuICAnLyc6IDE5MSxcbiAgJ2AnOiAxOTIsXG4gICdbJzogMjE5LFxuICAnXFxcXCc6IDIyMCxcbiAgJ10nOiAyMjFcbn07XG5cbi8vIEFkZCB1cHBlcmNhc2UgdmVyc2lvbnMgb2Yga2V5cyBhYm92ZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHlcbk9iamVjdC5rZXlzKEtleXMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICByZXR1cm4gS2V5c1trZXkudG9VcHBlckNhc2UoKV0gPSBLZXlzW2tleV07XG59KTtcblxuJzAxMjM0NTY3ODknLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uIChudW0sIGluZGV4KSB7XG4gIHJldHVybiBLZXlzW251bV0gPSBpbmRleCArIDQ4O1xufSk7XG5cbidBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWicuc3BsaXQoJycpLmZvckVhY2goZnVuY3Rpb24gKGxldHRlciwgaW5kZXgpIHtcbiAgS2V5c1tsZXR0ZXJdID0gaW5kZXggKyA2NTtcbiAgS2V5c1tsZXR0ZXIudG9Mb3dlckNhc2UoKV0gPSBpbmRleCArIDY1O1xufSk7XG5cbi8vIGZuIGtleXNcblsxLCAyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMCwgMTEsIDEyXS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtLCBpbmRleCkge1xuICByZXR1cm4gS2V5c1snZicgKyBpbmRleF0gPSAxMTEgKyBpbmRleDtcbn0pO1xuXG5leHBvcnQgdmFyIG1vZGlmaWVycyA9IHtcbiAgY29udHJvbDogJ2N0cmwnLFxuICBjdHJsOiAnY3RybCcsXG4gIHNoaWZ0OiAnc2hpZnQnLFxuICBtZXRhOiAnbWV0YScsXG4gIGNtZDogJ21ldGEnLFxuICBjb21tYW5kOiAnbWV0YScsXG4gIG9wdGlvbjogJ2FsdCcsXG4gIGFsdDogJ2FsdCdcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBhbGxLZXlzKGFyZykge1xuICByZXR1cm4gYXJnID8gYXJnLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgfHwgKHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGFyZykpID09PSAnc3ltYm9sJyA6IFN5bWJvbCgnYWxsS2V5cycpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBLZXlzO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9rZXlzLmpzXG4vLyBtb2R1bGUgaWQgPSAxMDVcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwidmFyIF9zbGljZWRUb0FycmF5ID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBzbGljZUl0ZXJhdG9yKGFyciwgaSkgeyB2YXIgX2FyciA9IFtdOyB2YXIgX24gPSB0cnVlOyB2YXIgX2QgPSBmYWxzZTsgdmFyIF9lID0gdW5kZWZpbmVkOyB0cnkgeyBmb3IgKHZhciBfaSA9IGFycltTeW1ib2wuaXRlcmF0b3JdKCksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7IF9hcnIucHVzaChfcy52YWx1ZSk7IGlmIChpICYmIF9hcnIubGVuZ3RoID09PSBpKSBicmVhazsgfSB9IGNhdGNoIChlcnIpIHsgX2QgPSB0cnVlOyBfZSA9IGVycjsgfSBmaW5hbGx5IHsgdHJ5IHsgaWYgKCFfbiAmJiBfaVtcInJldHVyblwiXSkgX2lbXCJyZXR1cm5cIl0oKTsgfSBmaW5hbGx5IHsgaWYgKF9kKSB0aHJvdyBfZTsgfSB9IHJldHVybiBfYXJyOyB9IHJldHVybiBmdW5jdGlvbiAoYXJyLCBpKSB7IGlmIChBcnJheS5pc0FycmF5KGFycikpIHsgcmV0dXJuIGFycjsgfSBlbHNlIGlmIChTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KGFycikpIHsgcmV0dXJuIHNsaWNlSXRlcmF0b3IoYXJyLCBpKTsgfSBlbHNlIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgYXR0ZW1wdCB0byBkZXN0cnVjdHVyZSBub24taXRlcmFibGUgaW5zdGFuY2VcIik7IH0gfTsgfSgpO1xuXG5mdW5jdGlvbiBfdG9Db25zdW1hYmxlQXJyYXkoYXJyKSB7IGlmIChBcnJheS5pc0FycmF5KGFycikpIHsgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBBcnJheShhcnIubGVuZ3RoKTsgaSA8IGFyci5sZW5ndGg7IGkrKykgeyBhcnIyW2ldID0gYXJyW2ldOyB9IHJldHVybiBhcnIyOyB9IGVsc2UgeyByZXR1cm4gQXJyYXkuZnJvbShhcnIpOyB9IH1cblxuLyoqXG4gKiBAbW9kdWxlIHN0b3JlXG4gKlxuICovXG5pbXBvcnQgeyBhbGxLZXlzIH0gZnJvbSAnLi9saWIva2V5cyc7XG5pbXBvcnQgbWF0Y2hLZXlzIGZyb20gJy4vbGliL21hdGNoX2tleXMnO1xuaW1wb3J0IHBhcnNlS2V5cyBmcm9tICcuL2xpYi9wYXJzZV9rZXlzJztcbmltcG9ydCB1dWlkIGZyb20gJy4vbGliL3V1aWQnO1xuXG4vKipcbiAqIHByaXZhdGVcbiAqIFxuICovXG5cbi8vIGRpY3QgZm9yIGNsYXNzIHByb3RvdHlwZXMgPT4gYmluZGluZ3NcbnZhciBfaGFuZGxlcnMgPSBuZXcgTWFwKCk7XG5cbi8vIGFsbCBtb3VudGVkIGluc3RhbmNlcyB0aGF0IGhhdmUga2V5YmluZGluZ3NcbnZhciBfaW5zdGFuY2VzID0gbmV3IFNldCgpO1xuXG4vLyBmb3IgdGVzdGluZ1xuZXhwb3J0IGZ1bmN0aW9uIF9yZXNldFN0b3JlKCkge1xuICBfaGFuZGxlcnMuY2xlYXIoKTtcbiAgX2luc3RhbmNlcy5jbGVhcigpO1xufVxuXG4vKipcbiAqIHB1YmxpY1xuICpcbiAqL1xuXG52YXIgU3RvcmUgPSB7XG5cbiAgLyoqXG4gICAqIGFjdGl2YXRlXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSBJbnN0YW50aWF0ZWQgY2xhc3MgdGhhdCBleHRlbmRlZCBSZWFjdC5Db21wb25lbnQsIHRvIGJlIGZvY3VzZWQgdG8gcmVjZWl2ZSBrZXlkb3duIGV2ZW50c1xuICAgKi9cbiAgYWN0aXZhdGU6IGZ1bmN0aW9uIGFjdGl2YXRlKGluc3RhbmNlcykge1xuICAgIHZhciBpbnN0YW5jZXNBcnJheSA9IFtdLmNvbmNhdChpbnN0YW5jZXMpO1xuXG4gICAgLy8gaWYgbm8gY29tcG9uZW50cyB3ZXJlIGZvdW5kIGFzIGFuY2VzdG9ycyBvZiB0aGUgZXZlbnQgdGFyZ2V0LFxuICAgIC8vIGVmZmVjdGl2ZWx5IGRlYWN0aXZhdGUga2V5ZG93biBoYW5kbGluZyBieSBjYXBwaW5nIHRoZSBzZXQgb2YgaW5zdGFuY2VzXG4gICAgLy8gd2l0aCBgbnVsbGAuXG4gICAgaWYgKCFpbnN0YW5jZXNBcnJheS5sZW5ndGgpIHtcbiAgICAgIF9pbnN0YW5jZXMuYWRkKG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfaW5zdGFuY2VzLmRlbGV0ZShudWxsKTtcblxuICAgICAgLy8gZGVsZXRpbmcgYW5kIHRoZW4gYWRkaW5nIHRoZSBpbnN0YW5jZShzKSBoYXMgdGhlIGVmZmVjdCBvZiBzb3J0aW5nIHRoZSBzZXRcbiAgICAgIC8vIGFjY29yZGluZyB0byBpbnN0YW5jZSBhY3RpdmF0aW9uIChhc2NlbmRpbmcpXG4gICAgICBpbnN0YW5jZXNBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICBfaW5zdGFuY2VzLmRlbGV0ZShpbnN0YW5jZSk7XG4gICAgICAgIF9pbnN0YW5jZXMuYWRkKGluc3RhbmNlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiBkZWxldGVJbnN0YW5jZVxuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IEluc3RhbnRpYXRlZCBjbGFzcyB0aGF0IGV4dGVuZGVkIFJlYWN0LkNvbXBvbmVudFxuICAgKiBAcmV0dXJuIHtib29sZWFufSBUaGUgdmFsdWUgc2V0LmhhcyggdGFyZ2V0ICkgd291bGQgaGF2ZSByZXR1cm5lZCBwcmlvciB0byBkZWxldGlvblxuICAgKi9cbiAgZGVsZXRlSW5zdGFuY2U6IGZ1bmN0aW9uIGRlbGV0ZUluc3RhbmNlKHRhcmdldCkge1xuICAgIF9pbnN0YW5jZXMuZGVsZXRlKHRhcmdldCk7XG4gIH0sXG4gIGZpbmRCaW5kaW5nRm9yRXZlbnQ6IGZ1bmN0aW9uIGZpbmRCaW5kaW5nRm9yRXZlbnQoZXZlbnQpIHtcbiAgICBpZiAoIV9pbnN0YW5jZXMuaGFzKG51bGwpKSB7XG4gICAgICB2YXIga2V5TWF0Y2hlc0V2ZW50ID0gZnVuY3Rpb24ga2V5TWF0Y2hlc0V2ZW50KGtleVNldCkge1xuICAgICAgICByZXR1cm4gbWF0Y2hLZXlzKHsga2V5U2V0OiBrZXlTZXQsIGV2ZW50OiBldmVudCB9KTtcbiAgICAgIH07XG5cbiAgICAgIC8vIGxvb3AgdGhyb3VnaCBpbnN0YW5jZXMgaW4gcmV2ZXJzZSBhY3RpdmF0aW9uIG9yZGVyIHNvIHRoYXQgbW9zdFxuICAgICAgLy8gcmVjZW50bHkgYWN0aXZhdGVkIGluc3RhbmNlIGdldHMgZmlyc3QgZGlicyBvbiBldmVudFxuICAgICAgdmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlO1xuICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yID0gZmFsc2U7XG4gICAgICB2YXIgX2l0ZXJhdG9yRXJyb3IgPSB1bmRlZmluZWQ7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGZvciAodmFyIF9pdGVyYXRvciA9IFtdLmNvbmNhdChfdG9Db25zdW1hYmxlQXJyYXkoX2luc3RhbmNlcykpLnJldmVyc2UoKVtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSAoX3N0ZXAgPSBfaXRlcmF0b3IubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWUpIHtcbiAgICAgICAgICB2YXIgaW5zdGFuY2UgPSBfc3RlcC52YWx1ZTtcblxuICAgICAgICAgIHZhciBiaW5kaW5ncyA9IHRoaXMuZ2V0QmluZGluZyhpbnN0YW5jZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuICAgICAgICAgIHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IHRydWU7XG4gICAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yMiA9IGZhbHNlO1xuICAgICAgICAgIHZhciBfaXRlcmF0b3JFcnJvcjIgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yMiA9IGJpbmRpbmdzW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXAyOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gKF9zdGVwMiA9IF9pdGVyYXRvcjIubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlKSB7XG4gICAgICAgICAgICAgIHZhciBfc3RlcDIkdmFsdWUgPSBfc2xpY2VkVG9BcnJheShfc3RlcDIudmFsdWUsIDIpLFxuICAgICAgICAgICAgICAgICAga2V5U2V0cyA9IF9zdGVwMiR2YWx1ZVswXSxcbiAgICAgICAgICAgICAgICAgIGZuID0gX3N0ZXAyJHZhbHVlWzFdO1xuXG4gICAgICAgICAgICAgIGlmIChhbGxLZXlzKGtleVNldHMpIHx8IGtleVNldHMuc29tZShrZXlNYXRjaGVzRXZlbnQpKSB7XG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIHdoZW4gbWF0Y2hpbmcga2V5YmluZGluZyBpcyBmb3VuZCAtIGkuZS4gb25seSBvbmVcbiAgICAgICAgICAgICAgICAvLyBrZXlib3VuZCBjb21wb25lbnQgY2FuIHJlc3BvbmQgdG8gYSBnaXZlbiBrZXkgY29kZS4gdG8gZ2V0IGFyb3VuZCB0aGlzLFxuICAgICAgICAgICAgICAgIC8vIHNjb3BlIGEgY29tbW9uIGFuY2VzdG9yIGNvbXBvbmVudCBjbGFzcyB3aXRoIEBrZXlkb3duIGFuZCB1c2VcbiAgICAgICAgICAgICAgICAvLyBAa2V5ZG93blNjb3BlZCB0byBiaW5kIHRoZSBkdXBsaWNhdGUga2V5cyBpbiB5b3VyIGNoaWxkIGNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAvLyAob3IganVzdCBpbnNwZWN0IG5leHRQcm9wcy5rZXlkb3duLmV2ZW50KS5cbiAgICAgICAgICAgICAgICByZXR1cm4geyBmbjogZm4sIGluc3RhbmNlOiBpbnN0YW5jZSB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBfZGlkSXRlcmF0b3JFcnJvcjIgPSB0cnVlO1xuICAgICAgICAgICAgX2l0ZXJhdG9yRXJyb3IyID0gZXJyO1xuICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yICYmIF9pdGVyYXRvcjIucmV0dXJuKSB7XG4gICAgICAgICAgICAgICAgX2l0ZXJhdG9yMi5yZXR1cm4oKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgaWYgKF9kaWRJdGVyYXRvckVycm9yMikge1xuICAgICAgICAgICAgICAgIHRocm93IF9pdGVyYXRvckVycm9yMjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIF9kaWRJdGVyYXRvckVycm9yID0gdHJ1ZTtcbiAgICAgICAgX2l0ZXJhdG9yRXJyb3IgPSBlcnI7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiAmJiBfaXRlcmF0b3IucmV0dXJuKSB7XG4gICAgICAgICAgICBfaXRlcmF0b3IucmV0dXJuKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIGlmIChfZGlkSXRlcmF0b3JFcnJvcikge1xuICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3I7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIGdldEJpbmRpbmdcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBDbGFzcyB1c2VkIGFzIGtleSBpbiBkaWN0IG9mIGtleSBiaW5kaW5nc1xuICAgKiBAcmV0dXJuIHtvYmplY3R9IFRoZSBvYmplY3QgY29udGFpbmluZyBiaW5kaW5ncyBmb3IgdGhlIGdpdmVuIGNsYXNzXG4gICAqL1xuICBnZXRCaW5kaW5nOiBmdW5jdGlvbiBnZXRCaW5kaW5nKF9yZWYpIHtcbiAgICB2YXIgX19yZWFjdEtleWRvd25VVUlEID0gX3JlZi5fX3JlYWN0S2V5ZG93blVVSUQ7XG5cbiAgICByZXR1cm4gX2hhbmRsZXJzLmdldChfX3JlYWN0S2V5ZG93blVVSUQpO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIGdldEluc3RhbmNlc1xuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAcmV0dXJuIHtzZXR9IEFsbCBzdG9yZWQgaW5zdGFuY2VzIChhbGwgbW91bnRlZCBjb21wb25lbnQgaW5zdGFuY2VzIHdpdGgga2V5YmluZGluZ3MpXG4gICAqL1xuICBnZXRJbnN0YW5jZXM6IGZ1bmN0aW9uIGdldEluc3RhbmNlcygpIHtcbiAgICByZXR1cm4gX2luc3RhbmNlcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBpc0VtcHR5XG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqIEByZXR1cm4ge251bWJlcn0gU2l6ZSBvZiB0aGUgc2V0IG9mIGFsbCBzdG9yZWQgaW5zdGFuY2VzXG4gICAqL1xuICBpc0VtcHR5OiBmdW5jdGlvbiBpc0VtcHR5KCkge1xuICAgIHJldHVybiAhX2luc3RhbmNlcy5zaXplO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIHNldEJpbmRpbmdcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICogQHBhcmFtIHtvYmplY3R9IGFyZ3MgQWxsIGFyZ3VtZW50cyBuZWNlc3NhcnkgdG8gc2V0IHRoZSBiaW5kaW5nXG4gICAqIEBwYXJhbSB7YXJyYXl9IGFyZ3Mua2V5cyBLZXkgY29kZXMgdGhhdCBzaG91bGQgdHJpZ2dlciB0aGUgZm5cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gYXJncy5mbiBUaGUgY2FsbGJhY2sgdG8gYmUgdHJpZ2dlcmVkIHdoZW4gZ2l2ZW4ga2V5cyBhcmUgcHJlc3NlZFxuICAgKiBAcGFyYW0ge29iamVjdH0gYXJncy50YXJnZXQgVGhlIGRlY29yYXRlZCBjbGFzc1xuICAgKi9cbiAgc2V0QmluZGluZzogZnVuY3Rpb24gc2V0QmluZGluZyhfcmVmMikge1xuICAgIHZhciBrZXlzID0gX3JlZjIua2V5cyxcbiAgICAgICAgZm4gPSBfcmVmMi5mbixcbiAgICAgICAgdGFyZ2V0ID0gX3JlZjIudGFyZ2V0O1xuXG4gICAgdmFyIGtleVNldHMgPSBrZXlzID8gcGFyc2VLZXlzKGtleXMpIDogYWxsS2V5cygpO1xuICAgIHZhciBfX3JlYWN0S2V5ZG93blVVSUQgPSB0YXJnZXQuX19yZWFjdEtleWRvd25VVUlEO1xuXG4gICAgaWYgKCFfX3JlYWN0S2V5ZG93blVVSUQpIHtcbiAgICAgIHRhcmdldC5fX3JlYWN0S2V5ZG93blVVSUQgPSB1dWlkKCk7XG4gICAgICBfaGFuZGxlcnMuc2V0KHRhcmdldC5fX3JlYWN0S2V5ZG93blVVSUQsIG5ldyBNYXAoW1trZXlTZXRzLCBmbl1dKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9oYW5kbGVycy5nZXQoX19yZWFjdEtleWRvd25VVUlEKS5zZXQoa2V5U2V0cywgZm4pO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgU3RvcmU7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvc3RvcmUuanNcbi8vIG1vZHVsZSBpZCA9IDEwNlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBNYWtlIHN1cmUgYGdsb2JhbGAgaXMgZGVmaW5lZCBnbG9iYWxseTpcbi8vXHQtIGVpdGhlciBhcyB0aGUgbm9kZWpzIGBnbG9iYWxgLCBvclxuLy9cdC0gYXMgYW4gYWxpYXMgZm9yIGB3aW5kb3dgIGluIGJyb3dzZXJzLCBvclxuLy9cdC0gZm9yIHRoZSBgc2VsZmAgY29udGV4dCBpbiB3ZWIgd29ya2Vycy5cbi8vXG4vLyBOT1RFOiB0aGlzIG1vZGlmaWVzIHRoZSBcImdsb2JhbFwiIGVudmlyb25tZW50IGJ5IG1ha2luZyBzdXJlIFwiZ2xvYmFsXCIgaXMgc2V0LiFcbi8vXG5cbmxldCBnbG9iYWxfaWRlbnRpZmllcjtcbmlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4vL1x0Y29uc29sZS5sb2coXCJSdW5uaW5nIGluIG5vZGVcIik7XG5cdGdsb2JhbF9pZGVudGlmaWVyID0gZ2xvYmFsO1xufVxuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuLy9cdGNvbnNvbGUubG9nKFwiUnVubmluZyBpbiBhIHdlYiBicm93c2VyXCIpO1xuXHR3aW5kb3cuZ2xvYmFsID0gd2luZG93O1xuXHRnbG9iYWxfaWRlbnRpZmllciA9IHdpbmRvdztcbn1cblxuaWYgKHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiKSB7XG4vL1x0Y29uc29sZS5sb2coXCJSdW5uaW5nIGluIGEgd2ViIHdvcmtlclwiKTtcblx0c2VsZi5nbG9iYWwgPSBzZWxmO1xuXHRnbG9iYWxfaWRlbnRpZmllciA9IHNlbGY7XG59XG5cbi8vIEV4cG9ydCBmb3IgY29uc3VtcHRpb24gYnkgaW1wb3J0LlxuZXhwb3J0IGRlZmF1bHQgZ2xvYmFsX2lkZW50aWZpZXI7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy91dGlscy9nbG9iYWwuanMiLCJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqIFxuICovXG5cbmZ1bmN0aW9uIG1ha2VFbXB0eUZ1bmN0aW9uKGFyZykge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBhcmc7XG4gIH07XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBhY2NlcHRzIGFuZCBkaXNjYXJkcyBpbnB1dHM7IGl0IGhhcyBubyBzaWRlIGVmZmVjdHMuIFRoaXMgaXNcbiAqIHByaW1hcmlseSB1c2VmdWwgaWRpb21hdGljYWxseSBmb3Igb3ZlcnJpZGFibGUgZnVuY3Rpb24gZW5kcG9pbnRzIHdoaWNoXG4gKiBhbHdheXMgbmVlZCB0byBiZSBjYWxsYWJsZSwgc2luY2UgSlMgbGFja3MgYSBudWxsLWNhbGwgaWRpb20gYWxhIENvY29hLlxuICovXG52YXIgZW1wdHlGdW5jdGlvbiA9IGZ1bmN0aW9uIGVtcHR5RnVuY3Rpb24oKSB7fTtcblxuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJucyA9IG1ha2VFbXB0eUZ1bmN0aW9uO1xuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc0ZhbHNlID0gbWFrZUVtcHR5RnVuY3Rpb24oZmFsc2UpO1xuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc1RydWUgPSBtYWtlRW1wdHlGdW5jdGlvbih0cnVlKTtcbmVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNOdWxsID0gbWFrZUVtcHR5RnVuY3Rpb24obnVsbCk7XG5lbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zVGhpcyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXM7XG59O1xuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc0FyZ3VtZW50ID0gZnVuY3Rpb24gKGFyZykge1xuICByZXR1cm4gYXJnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbXB0eUZ1bmN0aW9uO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvZW1wdHlGdW5jdGlvbi5qc1xuLy8gbW9kdWxlIGlkID0gMTU0XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDEzLXByZXNlbnQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFVzZSBpbnZhcmlhbnQoKSB0byBhc3NlcnQgc3RhdGUgd2hpY2ggeW91ciBwcm9ncmFtIGFzc3VtZXMgdG8gYmUgdHJ1ZS5cbiAqXG4gKiBQcm92aWRlIHNwcmludGYtc3R5bGUgZm9ybWF0IChvbmx5ICVzIGlzIHN1cHBvcnRlZCkgYW5kIGFyZ3VtZW50c1xuICogdG8gcHJvdmlkZSBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IGJyb2tlIGFuZCB3aGF0IHlvdSB3ZXJlXG4gKiBleHBlY3RpbmcuXG4gKlxuICogVGhlIGludmFyaWFudCBtZXNzYWdlIHdpbGwgYmUgc3RyaXBwZWQgaW4gcHJvZHVjdGlvbiwgYnV0IHRoZSBpbnZhcmlhbnRcbiAqIHdpbGwgcmVtYWluIHRvIGVuc3VyZSBsb2dpYyBkb2VzIG5vdCBkaWZmZXIgaW4gcHJvZHVjdGlvbi5cbiAqL1xuXG52YXIgdmFsaWRhdGVGb3JtYXQgPSBmdW5jdGlvbiB2YWxpZGF0ZUZvcm1hdChmb3JtYXQpIHt9O1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICB2YWxpZGF0ZUZvcm1hdCA9IGZ1bmN0aW9uIHZhbGlkYXRlRm9ybWF0KGZvcm1hdCkge1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhcmlhbnQgcmVxdWlyZXMgYW4gZXJyb3IgbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gaW52YXJpYW50KGNvbmRpdGlvbiwgZm9ybWF0LCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIHZhbGlkYXRlRm9ybWF0KGZvcm1hdCk7XG5cbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICB2YXIgZXJyb3I7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcignTWluaWZpZWQgZXhjZXB0aW9uIG9jY3VycmVkOyB1c2UgdGhlIG5vbi1taW5pZmllZCBkZXYgZW52aXJvbm1lbnQgJyArICdmb3IgdGhlIGZ1bGwgZXJyb3IgbWVzc2FnZSBhbmQgYWRkaXRpb25hbCBoZWxwZnVsIHdhcm5pbmdzLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYXJncyA9IFthLCBiLCBjLCBkLCBlLCBmXTtcbiAgICAgIHZhciBhcmdJbmRleCA9IDA7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihmb3JtYXQucmVwbGFjZSgvJXMvZywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gYXJnc1thcmdJbmRleCsrXTtcbiAgICAgIH0pKTtcbiAgICAgIGVycm9yLm5hbWUgPSAnSW52YXJpYW50IFZpb2xhdGlvbic7XG4gICAgfVxuXG4gICAgZXJyb3IuZnJhbWVzVG9Qb3AgPSAxOyAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGludmFyaWFudCdzIG93biBmcmFtZVxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW52YXJpYW50O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvaW52YXJpYW50LmpzXG4vLyBtb2R1bGUgaWQgPSAxNTVcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLypcblx0TUlUIExpY2Vuc2UgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcblx0QXV0aG9yIFRvYmlhcyBLb3BwZXJzIEBzb2tyYVxuKi9cbi8vIGNzcyBiYXNlIGNvZGUsIGluamVjdGVkIGJ5IHRoZSBjc3MtbG9hZGVyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHVzZVNvdXJjZU1hcCkge1xuXHR2YXIgbGlzdCA9IFtdO1xuXG5cdC8vIHJldHVybiB0aGUgbGlzdCBvZiBtb2R1bGVzIGFzIGNzcyBzdHJpbmdcblx0bGlzdC50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuXHRcdFx0dmFyIGNvbnRlbnQgPSBjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKGl0ZW0sIHVzZVNvdXJjZU1hcCk7XG5cdFx0XHRpZihpdGVtWzJdKSB7XG5cdFx0XHRcdHJldHVybiBcIkBtZWRpYSBcIiArIGl0ZW1bMl0gKyBcIntcIiArIGNvbnRlbnQgKyBcIn1cIjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBjb250ZW50O1xuXHRcdFx0fVxuXHRcdH0pLmpvaW4oXCJcIik7XG5cdH07XG5cblx0Ly8gaW1wb3J0IGEgbGlzdCBvZiBtb2R1bGVzIGludG8gdGhlIGxpc3Rcblx0bGlzdC5pID0gZnVuY3Rpb24obW9kdWxlcywgbWVkaWFRdWVyeSkge1xuXHRcdGlmKHR5cGVvZiBtb2R1bGVzID09PSBcInN0cmluZ1wiKVxuXHRcdFx0bW9kdWxlcyA9IFtbbnVsbCwgbW9kdWxlcywgXCJcIl1dO1xuXHRcdHZhciBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzID0ge307XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpZCA9IHRoaXNbaV1bMF07XG5cdFx0XHRpZih0eXBlb2YgaWQgPT09IFwibnVtYmVyXCIpXG5cdFx0XHRcdGFscmVhZHlJbXBvcnRlZE1vZHVsZXNbaWRdID0gdHJ1ZTtcblx0XHR9XG5cdFx0Zm9yKGkgPSAwOyBpIDwgbW9kdWxlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGl0ZW0gPSBtb2R1bGVzW2ldO1xuXHRcdFx0Ly8gc2tpcCBhbHJlYWR5IGltcG9ydGVkIG1vZHVsZVxuXHRcdFx0Ly8gdGhpcyBpbXBsZW1lbnRhdGlvbiBpcyBub3QgMTAwJSBwZXJmZWN0IGZvciB3ZWlyZCBtZWRpYSBxdWVyeSBjb21iaW5hdGlvbnNcblx0XHRcdC8vICB3aGVuIGEgbW9kdWxlIGlzIGltcG9ydGVkIG11bHRpcGxlIHRpbWVzIHdpdGggZGlmZmVyZW50IG1lZGlhIHF1ZXJpZXMuXG5cdFx0XHQvLyAgSSBob3BlIHRoaXMgd2lsbCBuZXZlciBvY2N1ciAoSGV5IHRoaXMgd2F5IHdlIGhhdmUgc21hbGxlciBidW5kbGVzKVxuXHRcdFx0aWYodHlwZW9mIGl0ZW1bMF0gIT09IFwibnVtYmVyXCIgfHwgIWFscmVhZHlJbXBvcnRlZE1vZHVsZXNbaXRlbVswXV0pIHtcblx0XHRcdFx0aWYobWVkaWFRdWVyeSAmJiAhaXRlbVsyXSkge1xuXHRcdFx0XHRcdGl0ZW1bMl0gPSBtZWRpYVF1ZXJ5O1xuXHRcdFx0XHR9IGVsc2UgaWYobWVkaWFRdWVyeSkge1xuXHRcdFx0XHRcdGl0ZW1bMl0gPSBcIihcIiArIGl0ZW1bMl0gKyBcIikgYW5kIChcIiArIG1lZGlhUXVlcnkgKyBcIilcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRsaXN0LnB1c2goaXRlbSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXHRyZXR1cm4gbGlzdDtcbn07XG5cbmZ1bmN0aW9uIGNzc1dpdGhNYXBwaW5nVG9TdHJpbmcoaXRlbSwgdXNlU291cmNlTWFwKSB7XG5cdHZhciBjb250ZW50ID0gaXRlbVsxXSB8fCAnJztcblx0dmFyIGNzc01hcHBpbmcgPSBpdGVtWzNdO1xuXHRpZiAoIWNzc01hcHBpbmcpIHtcblx0XHRyZXR1cm4gY29udGVudDtcblx0fVxuXG5cdGlmICh1c2VTb3VyY2VNYXAgJiYgdHlwZW9mIGJ0b2EgPT09ICdmdW5jdGlvbicpIHtcblx0XHR2YXIgc291cmNlTWFwcGluZyA9IHRvQ29tbWVudChjc3NNYXBwaW5nKTtcblx0XHR2YXIgc291cmNlVVJMcyA9IGNzc01hcHBpbmcuc291cmNlcy5tYXAoZnVuY3Rpb24gKHNvdXJjZSkge1xuXHRcdFx0cmV0dXJuICcvKiMgc291cmNlVVJMPScgKyBjc3NNYXBwaW5nLnNvdXJjZVJvb3QgKyBzb3VyY2UgKyAnICovJ1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIFtjb250ZW50XS5jb25jYXQoc291cmNlVVJMcykuY29uY2F0KFtzb3VyY2VNYXBwaW5nXSkuam9pbignXFxuJyk7XG5cdH1cblxuXHRyZXR1cm4gW2NvbnRlbnRdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyBBZGFwdGVkIGZyb20gY29udmVydC1zb3VyY2UtbWFwIChNSVQpXG5mdW5jdGlvbiB0b0NvbW1lbnQoc291cmNlTWFwKSB7XG5cdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlZlxuXHR2YXIgYmFzZTY0ID0gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoc291cmNlTWFwKSkpKTtcblx0dmFyIGRhdGEgPSAnc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsJyArIGJhc2U2NDtcblxuXHRyZXR1cm4gJy8qIyAnICsgZGF0YSArICcgKi8nO1xufVxuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L2Nzcy1sb2FkZXIvbGliL2Nzcy1iYXNlLmpzXG4vLyBtb2R1bGUgaWQgPSAyNTFcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgdmFyIFJFQUNUX0VMRU1FTlRfVFlQRSA9ICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmXG4gICAgU3ltYm9sLmZvciAmJlxuICAgIFN5bWJvbC5mb3IoJ3JlYWN0LmVsZW1lbnQnKSkgfHxcbiAgICAweGVhYzc7XG5cbiAgdmFyIGlzVmFsaWRFbGVtZW50ID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICBvYmplY3QgIT09IG51bGwgJiZcbiAgICAgIG9iamVjdC4kJHR5cGVvZiA9PT0gUkVBQ1RfRUxFTUVOVF9UWVBFO1xuICB9O1xuXG4gIC8vIEJ5IGV4cGxpY2l0bHkgdXNpbmcgYHByb3AtdHlwZXNgIHlvdSBhcmUgb3B0aW5nIGludG8gbmV3IGRldmVsb3BtZW50IGJlaGF2aW9yLlxuICAvLyBodHRwOi8vZmIubWUvcHJvcC10eXBlcy1pbi1wcm9kXG4gIHZhciB0aHJvd09uRGlyZWN0QWNjZXNzID0gdHJ1ZTtcbiAgbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2ZhY3RvcnlXaXRoVHlwZUNoZWNrZXJzJykoaXNWYWxpZEVsZW1lbnQsIHRocm93T25EaXJlY3RBY2Nlc3MpO1xufSBlbHNlIHtcbiAgLy8gQnkgZXhwbGljaXRseSB1c2luZyBgcHJvcC10eXBlc2AgeW91IGFyZSBvcHRpbmcgaW50byBuZXcgcHJvZHVjdGlvbiBiZWhhdmlvci5cbiAgLy8gaHR0cDovL2ZiLm1lL3Byb3AtdHlwZXMtaW4tcHJvZFxuICBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZmFjdG9yeVdpdGhUaHJvd2luZ1NoaW1zJykoKTtcbn1cblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL2luZGV4LmpzXG4vLyBtb2R1bGUgaWQgPSAyNTJcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVhY3RQcm9wVHlwZXNTZWNyZXQgPSAnU0VDUkVUX0RPX05PVF9QQVNTX1RISVNfT1JfWU9VX1dJTExfQkVfRklSRUQnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0UHJvcFR5cGVzU2VjcmV0O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3Byb3AtdHlwZXMvbGliL1JlYWN0UHJvcFR5cGVzU2VjcmV0LmpzXG4vLyBtb2R1bGUgaWQgPSAyNTNcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxNC0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVtcHR5RnVuY3Rpb24gPSByZXF1aXJlKCcuL2VtcHR5RnVuY3Rpb24nKTtcblxuLyoqXG4gKiBTaW1pbGFyIHRvIGludmFyaWFudCBidXQgb25seSBsb2dzIGEgd2FybmluZyBpZiB0aGUgY29uZGl0aW9uIGlzIG5vdCBtZXQuXG4gKiBUaGlzIGNhbiBiZSB1c2VkIHRvIGxvZyBpc3N1ZXMgaW4gZGV2ZWxvcG1lbnQgZW52aXJvbm1lbnRzIGluIGNyaXRpY2FsXG4gKiBwYXRocy4gUmVtb3ZpbmcgdGhlIGxvZ2dpbmcgY29kZSBmb3IgcHJvZHVjdGlvbiBlbnZpcm9ubWVudHMgd2lsbCBrZWVwIHRoZVxuICogc2FtZSBsb2dpYyBhbmQgZm9sbG93IHRoZSBzYW1lIGNvZGUgcGF0aHMuXG4gKi9cblxudmFyIHdhcm5pbmcgPSBlbXB0eUZ1bmN0aW9uO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBwcmludFdhcm5pbmcgPSBmdW5jdGlvbiBwcmludFdhcm5pbmcoZm9ybWF0KSB7XG4gICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4gPiAxID8gX2xlbiAtIDEgOiAwKSwgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgYXJnc1tfa2V5IC0gMV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgICB9XG5cbiAgICAgIHZhciBhcmdJbmRleCA9IDA7XG4gICAgICB2YXIgbWVzc2FnZSA9ICdXYXJuaW5nOiAnICsgZm9ybWF0LnJlcGxhY2UoLyVzL2csIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107XG4gICAgICB9KTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIC0tLSBXZWxjb21lIHRvIGRlYnVnZ2luZyBSZWFjdCAtLS1cbiAgICAgICAgLy8gVGhpcyBlcnJvciB3YXMgdGhyb3duIGFzIGEgY29udmVuaWVuY2Ugc28gdGhhdCB5b3UgY2FuIHVzZSB0aGlzIHN0YWNrXG4gICAgICAgIC8vIHRvIGZpbmQgdGhlIGNhbGxzaXRlIHRoYXQgY2F1c2VkIHRoaXMgd2FybmluZyB0byBmaXJlLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICB9IGNhdGNoICh4KSB7fVxuICAgIH07XG5cbiAgICB3YXJuaW5nID0gZnVuY3Rpb24gd2FybmluZyhjb25kaXRpb24sIGZvcm1hdCkge1xuICAgICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYHdhcm5pbmcoY29uZGl0aW9uLCBmb3JtYXQsIC4uLmFyZ3MpYCByZXF1aXJlcyBhIHdhcm5pbmcgJyArICdtZXNzYWdlIGFyZ3VtZW50Jyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChmb3JtYXQuaW5kZXhPZignRmFpbGVkIENvbXBvc2l0ZSBwcm9wVHlwZTogJykgPT09IDApIHtcbiAgICAgICAgcmV0dXJuOyAvLyBJZ25vcmUgQ29tcG9zaXRlQ29tcG9uZW50IHByb3B0eXBlIGNoZWNrLlxuICAgICAgfVxuXG4gICAgICBpZiAoIWNvbmRpdGlvbikge1xuICAgICAgICBmb3IgKHZhciBfbGVuMiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuMiA+IDIgPyBfbGVuMiAtIDIgOiAwKSwgX2tleTIgPSAyOyBfa2V5MiA8IF9sZW4yOyBfa2V5MisrKSB7XG4gICAgICAgICAgYXJnc1tfa2V5MiAtIDJdID0gYXJndW1lbnRzW19rZXkyXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByaW50V2FybmluZy5hcHBseSh1bmRlZmluZWQsIFtmb3JtYXRdLmNvbmNhdChhcmdzKSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSkoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3YXJuaW5nO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvd2FybmluZy5qc1xuLy8gbW9kdWxlIGlkID0gMjU0XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIFNwZWxsIFwicGFyc2VyXCIgY2xhc3MuXG4vL1xuXG4vLyBUT0RPOiBkZXBlbmRlbmN5LWluamVjdCB0b2tlbml6ZXI/XG5pbXBvcnQgVG9rZW5pemVyIGZyb20gXCIuL1Rva2VuaXplci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyBHUlJSLi4uIHdpbGwgU09NRU9ORSBvbiB0aGUgbm9kZSB0ZWFtIHBsZWFzZSBpbXBsZW1lbnQgY29uc29sZS5ncm91cCA/Pz9cbmlmICghY29uc29sZS5ncm91cCkgY29uc29sZS5ncm91cCA9IGNvbnNvbGUubG9nO1xuaWYgKCFjb25zb2xlLmdyb3VwRW5kKSBjb25zb2xlLmdyb3VwRW5kID0gY29uc29sZS5sb2c7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IGRlYnVnIGluZm8gd2hpbGUgYWRkaW5nIHJ1bGVzXG5cdHN0YXRpYyBERUJVRyA9IGZhbHNlO1xuXG5cdC8vIFNob3VsZCB3ZSB3YXJuIGFib3V0IGFub21hbG91cyBjb25kaXRpb25zP1xuXHRzdGF0aWMgV0FSTiA9IGZhbHNlO1xuXG5cdC8vIFNldCB0byBgdHJ1ZWAgdG8gb3V0cHV0IHRpbWluZyBpbmZvLlxuXHRzdGF0aWMgVElNRSA9IGZhbHNlO1xuXG5cdC8vIFBvaW50ZXIgdG8gb3VyIHRva2VuaXplci5cblx0VG9rZW56aWVyID0gVG9rZW5pemVyO1xuXG5cdC8vIENvbnN0cnVjdG9yLlxuXHRjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzKSB7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wZXJ0aWVzKTtcblx0fVxuXG4vL1xuLy8jIyMgUGFyc2luZ1xuLy9cblx0Ly8gUGFyc2UgYHJ1bGVOYW1lYCBydWxlIGF0IGhlYWQgb2YgYHRleHRgLlxuXHQvLyBJZiB5b3UgcGFzcyBvbmx5IG9uZSBhcmd1bWVudCwgd2UnbGwgYXNzdW1lIHRoYXQncyBgdGV4dGAgYW5kIHlvdSB3YW50IHRvIG1hdGNoIGBzdGF0ZW1lbnRzYC5cblx0Ly8gSGFuZGxlcyBvcHRpb25hbCBhbmQgcmVwZWF0aW5nIHJ1bGVzIGFzIHdlbGwgYXMgZWF0aW5nIHdoaXRlc3BhY2UuXG5cdC8vIFJldHVybnMgcmVzdWx0IG9mIHBhcnNlLlxuLy9URVNUTUVcblx0cGFyc2UocnVsZU5hbWUsIHRleHQpIHtcblx0XHQvLyBJZiBvbmx5IG9uZSBhcmd1bWVudCwgYXNzdW1lIHRoYXQncyB0aGUgdGV4dCBhbmQgcGFyc2UgYHN0YXRlbWVudHNgXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHRleHQgPSBydWxlTmFtZTtcblx0XHRcdHJ1bGVOYW1lID0gXCJzdGF0ZW1lbnRzXCI7XG5cdFx0fVxuXG5cdFx0Ly8gQ29udmVydCB0byB0b2tlbnMuXG5cdFx0aWYgKFBhcnNlci5USU1FKSBjb25zb2xlLnRpbWUoXCJ0b2tlbml6ZVwiKTtcblx0XHRsZXQgdG9rZW5zID0gVG9rZW5pemVyLnRva2VuaXplKHRleHQpO1xuXHRcdC8vIGVhdCBub24taW5kZW50IHdoaXRlc3BhY2UgKHNpbmNlIHdlIGlnbm9yZSBpdClcblx0XHR0b2tlbnMgPSB0b2tlbnMuZmlsdGVyKHRva2VuID0+ICFUb2tlbml6ZXIuaXNOb3JtYWxXaGl0ZXNwYWNlKHRva2VuKSk7XG5cdFx0aWYgKFBhcnNlci5USU1FKSBjb25zb2xlLnRpbWVFbmQoXCJ0b2tlbml6ZVwiKTtcblxuXHRcdC8vIEJhaWwgaWYgd2UgZGlkbid0IGdldCBhbnkgdG9rZW5zIGJhY2suXG4vL1RPRE86IFdBUk4/ICBFUlJPUj9cblx0XHRpZiAoIXRva2VucyB8fCB0b2tlbnMubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKFBhcnNlci5USU1FKSBjb25zb2xlLnRpbWUoXCJwYXJzZVwiKTtcblx0XHQvLyBJZiB3ZSdyZSBub3QgcGFyc2luZyBgc3RhdGVtZW50c2AsIGVhdCB3aGl0ZXNwYWNlIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpbmUuXG5cdFx0aWYgKHJ1bGVOYW1lICE9PSBcInN0YXRlbWVudHNcIikge1xuXHRcdFx0dG9rZW5zID0gVG9rZW5pemVyLnJlbW92ZUxlYWRpbmdXaGl0ZXNwYWNlKHRva2Vucyk7XG5cdFx0fVxuXG5cdFx0Ly8gUGFyc2UgdGhlIHJ1bGUgb3IgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIHJ1bGUgbm90IGZvdW5kLlxuXHRcdGxldCByZXN1bHQgPSB0aGlzLnBhcnNlUnVsZU9yRGllKHJ1bGVOYW1lLCB0b2tlbnMsIDAsIHRva2Vucy5sZW5ndGgsIHVuZGVmaW5lZCwgXCJwYXJzZXIucGFyc2UoKVwiKTtcblx0XHRpZiAoUGFyc2VyLlRJTUUpIGNvbnNvbGUudGltZUVuZChcInBhcnNlXCIpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXG5cblx0Ly8gUGFyc2Ugc29tZXRoaW5nOlxuXHQvL1x0LSBpZiBvbmUgc3RyaW5nIGFyZ3VtZW50LCBkb2VzIGEgYGNvbXBpbGVTdGF0ZW1lbnRzKClgXG5cdC8vIFJldHVybnMgdGhlIGB0b1N0cmluZygpYCBvciB0aHJvd3MuXG4vL1RFU1RNRVxuXHRjb21waWxlKHJ1bGVOYW1lLCB0ZXh0KSB7XG5cdFx0Ly8gSWYgb25seSBvbmUgYXJndW1lbnQsIGFzc3VtZSB0aGF0J3MgdGhlIHRleHQgYW5kIHBhcnNlIGBzdGF0ZW1lbnRzYFxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHR0ZXh0ID0gcnVsZU5hbWU7XG5cdFx0XHRydWxlTmFtZSA9IFwic3RhdGVtZW50c1wiO1xuXHRcdH1cblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5wYXJzZShydWxlTmFtZSwgdGV4dCk7XG5cdFx0aWYgKCFyZXN1bHQpIHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2VyLnBhcnNlKCcke3J1bGVOYW1lfScsICcke3RleHR9Jyk6IGNhbid0IHBhcnNlIHRoaXNgKTtcblx0XHRyZXR1cm4gcmVzdWx0LnRvU291cmNlKHRoaXMpO1xuXHR9XG5cblxuXHQvLyBQYXJzZSBhIG5hbWVkIHJ1bGUgKGRlZmluZWQgaW4gdGhpcyBwYXJzZXIgb3IgaW4gYW55IG9mIG91ciBgaW1wb3J0c2ApLCByZXR1cm5pbmcgdGhlIFwiYmVzdFwiIG1hdGNoLlxuXHQvLyBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoLlxuXHQvLyBUaHJvd3MgaWYgTk9CT0RZIGltcGxlbWVudHMgYHJ1bGVOYW1lYC5cblx0Ly9cblx0Ly8gTk9URTogY3VycmVudGx5IFwiYmVzdFwiIGlzIGRlZmluZWQgYXMgdGhlIGZpcnN0IHJ1bGUgaW4gb3VyIGBpbXBvcnRzYCB3aGljaCBtYXRjaGVzLi4uXG5cdHBhcnNlUnVsZU9yRGllKHJ1bGVOYW1lLCB0b2tlbnMsIHN0YXJ0LCBlbmQsIHN0YWNrLCBjYWxsaW5nQ29udGV4dCA9IFwicGFyc2VSdWxlT3JEaWVcIikge1xuXHRcdC8vIEtlZXAgdHJhY2sgb2Ygd2hldGhlciBydWxlIHdhcyBFVkVSIGZvdW5kIG9yIG5vdC5cblx0XHRsZXQgcnVsZUZvdW5kID0gZmFsc2U7XG5cdFx0bGV0IGltcG9ydHMgPSB0aGlzLmltcG9ydHMsIGluZGV4ID0gMCwgcGFyc2VyO1xuXHRcdGxldCByZXN1bHRzID0gW107XG5cdFx0d2hpbGUgKHBhcnNlciA9IGltcG9ydHNbaW5kZXgrK10pIHtcblx0XHRcdGxldCBydWxlID0gcGFyc2VyLl9ydWxlc1tydWxlTmFtZV07XG5cdFx0XHRpZiAoIXJ1bGUpIGNvbnRpbnVlO1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gcnVsZS5wYXJzZSh0aGlzLCB0b2tlbnMsIHN0YXJ0LCBlbmQsIHN0YWNrKTtcblx0XHRcdGlmIChyZXN1bHQpIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuXHRcdFx0cnVsZUZvdW5kID0gdHJ1ZTtcblx0XHR9XG5cdFx0Ly8gSWYgbmV2ZXIgZm91bmQsIHRocm93LlxuXHRcdGlmICghcnVsZUZvdW5kKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYCR7Y2FsbGluZ0NvbnRleHR9OiBydWxlICcke3J1bGVOYW1lfScgbm90IGZvdW5kYCk7XG5cblx0XHQvLyBJZiBubyBtYXRjaCwgcmV0dXJuIHVuZGVmaW5lZC5cblx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBJZiBleGFjdGx5IG9uZSBtYXRjaCwgcmV0dXJuIHRoYXQuXG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSByZXR1cm4gcmVzdWx0c1swXTtcblxuXHRcdC8vIE90aGVyd2lzZSByZXR1cm4gdGhlIGxvbmdlc3QgbWF0Y2guXG5cdFx0cmV0dXJuIHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChsYXJnZXN0LCBuZXh0KSB7XG5cdFx0XHRpZiAobmV4dC5uZXh0U3RhcnQgPiBsYXJnZXN0Lm5leHRTdGFydCkgcmV0dXJuIG5leHQ7XG5cdFx0XHRyZXR1cm4gbGFyZ2VzdDtcblx0XHR9LCByZXN1bHRzWzBdKTtcblx0fVxuXG5cdC8vIFRlc3Qgd2hldGhlciBhIHJ1bGUgKHdoaWNoIG1heSBiZSBzcGVjaWZpZWQgYnkgbmFtZSkgTUlHSFQgYmUgZm91bmQgaW4gaGVhZCBvZiBzdHJlYW0uXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIGB0cnVlYCBpZiB0aGUgcnVsZSBNSUdIVCBiZSBtYXRjaGVkLlxuXHQvL1x0LSBgZmFsc2VgIGlmIHRoZXJlIGlzIG5vIHdheSB0aGUgcnVsZSBjYW4gYmUgbWF0Y2hlZC5cblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYyAoZWc6IG5vIHdheSB0byB0ZWxsIHF1aWNrbHkpLlxuXHR0ZXN0UnVsZShydWxlLCB0b2tlbnMsIHN0YXJ0LCBlbmQpIHtcblx0XHQvLyBIYW5kbGUgcnVsZSBpbnN0YW5jZVxuXHRcdGlmIChydWxlIGluc3RhbmNlb2YgUnVsZSkge1xuXHRcdFx0cmV0dXJuIHJ1bGUudGVzdCh0aGlzLCB0b2tlbnMsIHN0YXJ0LCBlbmQpO1xuXHRcdH1cblx0XHQvLyBIYW5kbGUgbmFtZWQgcnVsZSBieSBsb29raW5nIGluIG91ciBpbXBvcnRzXG5cdFx0bGV0IGltcG9ydHMgPSB0aGlzLmltcG9ydHMsIGluZGV4ID0gMCwgcGFyc2VyO1xuXHRcdHdoaWxlIChwYXJzZXIgPSBpbXBvcnRzW2luZGV4KytdKSB7XG5cdFx0XHRsZXQgbmV4dFJ1bGUgPSBwYXJzZXIuX3J1bGVzW3J1bGVdO1xuXHRcdFx0aWYgKCFuZXh0UnVsZSkgY29udGludWU7XG5cdFx0XHRsZXQgcmVzdWx0ID0gbmV4dFJ1bGUudGVzdCh0aGlzLCB0b2tlbnMsIHN0YXJ0LCBlbmQpO1xuXHRcdFx0aWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fVxuXG5cbi8vXG4vLyAjIyMgXHRJbXBvcnRzXG4vL1x0XHRQYXJzZXJzIGRlcGVuZCBvbiBvdGhlciBwYXJzZXJzIGZvciB0aGVpciBgcnVsZXNgLlxuLy9cdFx0SW1wb3J0cyBhcmUgbGF6eS1ib3VuZCAoYW5kIHdlIGFzc3VtZSB0aGUgYnVpbGQgZmlsZSB3aWxsIGluY2x1ZGUgYWxsIG5lY2Vzc2FyeSBpbXBvcnRzKS5cbi8vXG5cblx0Ly8gQWRkIG9uZSBvciBtb3JlIG5hbWVkIGltcG9ydHMgdG8gdGhpcyBwYXJzZXIuXG5cdC8vIEltcG9ydHMgaW5jcmVhc2UgaW4gcHJpb3JpdHkgdGhlIGxhdGVyIHRoZXkgYXJlIGluIHRoZSBsaXN0LlxuXHRpbXBvcnQoLi4uaW1wb3J0cykge1xuXHRcdC8vIFJFVkVSU0UgdGhlIGxpc3Qgb2YgaW1wb3J0cywgc28gdGhlIG1vc3QgZ2VuZXJhbCBvbmUgaXMgTEFTVFxuXHRcdC8vIFRodXMgbW9yZSBzcGVjaWZpYyBpbXBvcnRzIHdpbGwgYmUgRUFSTElFUiBpbiB0aGUgYGltcG9ydHNgIGxpc3QuXG5cblx0XHQvLyBDcmVhdGUgbmV3IGFycmF5IG9mIGltcG9ydHMgYW5kIGFkZCBpbXBvcnQgbmFtZXMgcGFzc2VkIGluLlxuXHRcdHRoaXMuX2ltcG9ydHMgPSAodGhpcy5faW1wb3J0cyB8fCBbXSkuY29uY2F0KGltcG9ydHMucmV2ZXJzZSgpKTtcblx0XHQvLyBjbGVhciBtZW1vaXplIHZhcmlhYmxlIGZvciBgaW1wb3J0c2AuXG5cdFx0ZGVsZXRlIHRoaXMuX19pbXBvcnRzO1xuXHR9XG5cblx0Ly8gR2V0dGVyIHRvIHJldHVybiBsaXN0IG9mIG91ciBgaW1wb3J0c2AgYXMgYFBhcnNlcmAgb2JqZWN0cywgSU5DTFVESU5HIGB0aGlzYCBwYXJzZXIgaXRzZWxmIVxuXHQvLyBNb3N0IHNwZWNpZmljIGltcG9ydCAoZWc6IG91cnNlbGYpIGlzIGZpcnN0IGluIHRoZSBsaXN0LlxuXHQvLyBUaHJvd3MgaWYgYW4gaW1wb3J0IGNhbid0IGJlIGZvdW5kLlxuXHRnZXQgaW1wb3J0cygpIHtcblx0XHRpZiAoIXRoaXMuX19pbXBvcnRzKSB7XG5cdFx0XHR2YXIgaW1wb3J0cyA9ICh0aGlzLl9pbXBvcnRzID8gdGhpcy5faW1wb3J0cy5tYXAoUGFyc2VyLmdldENvbnRleHRPckRpZSkgOiBbXSk7XG5cdFx0XHR0aGlzLl9faW1wb3J0cyA9IFt0aGlzXS5jb25jYXQoaW1wb3J0cyk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLl9faW1wb3J0cztcblx0fVxuXG5cbi8vXG4vLyAjIyMgUnVsZXNcbi8vXG5cdC8vIFN0YXJ0IHdpdGggYW4gZW1wdHkgbWFwIG9mIHJ1bGVzLlxuXHRfcnVsZXMgPSB7fTtcblxuXHQvLyBEQU5HRVJPVVM6IHJldHVybiBtYXAgb2YgYXJyYXkgb2YgbmFtZWQgcnVsZXMgZm9yIHVzIGFuZCBvdXIgaW1wb3J0c1xuXHQvLyBOT1RFOiBXZSBtZW1vaXplIHRoaXMgYnV0IHRoZXJlJ3Mgbm90aGluZyB0aGF0IHJlc2V0cyB0aGlzIHdoZW4gb3VyIGltcG9ydHMgY2hhbmdlIVxuXHRnZXQgcnVsZXMoKSB7XG5cdFx0aWYgKCF0aGlzLl9fcnVsZXMpIHtcblx0XHRcdGxldCBvdXRwdXQgPSB0aGlzLl9fcnVsZXMgPSB7fTtcblx0XHRcdC8vIEZvciBlYWNoIHBhcnNlclxuXHRcdFx0dGhpcy5pbXBvcnRzLmZvckVhY2gocGFyc2VyID0+IHtcblx0XHRcdFx0Ly8gTWVyZ2UgcnVsZXMgaW50byBhbiBBbHRlcm5hdGl2ZXMgaW4gb3V0cHV0IHJ1bGVzLlxuXHRcdFx0XHRmb3IgKHZhciBydWxlTmFtZSBpbiBwYXJzZXIuX3J1bGVzKSB7XG5cdFx0XHRcdFx0bGV0IHJ1bGUgPSBwYXJzZXIuX3J1bGVzW3J1bGVOYW1lXTtcblx0XHRcdFx0XHRsZXQgYWx0ZXJuYXRpdmVzID0gb3V0cHV0W3J1bGVOYW1lXSB8fCAob3V0cHV0W3J1bGVOYW1lXSA9IG5ldyBSdWxlLkFsdGVybmF0aXZlcyh7IHJ1bGVOYW1lIH0pKTtcblxuXHRcdFx0XHRcdGlmIChydWxlIGluc3RhbmNlb2YgUnVsZS5BbHRlcm5hdGl2ZXNcblx0XHRcdFx0XHQgJiYgcnVsZS5ydWxlTmFtZSA9PT0gcnVsZU5hbWVcblx0XHRcdFx0XHQgJiYgIXJ1bGUuYXJndW1lbnRcblx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdHJ1bGUucnVsZXMuZm9yRWFjaCggYWx0ZXJuYXRpdmUgPT4gYWx0ZXJuYXRpdmVzLmFkZFJ1bGUoYWx0ZXJuYXRpdmUpICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0YWx0ZXJuYXRpdmVzLmFkZFJ1bGUocnVsZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX19ydWxlcztcblx0fVxuXG5cdC8vIEFkZCBhIGBydWxlYCB0byBvdXIgbGlzdCBvZiBydWxlcyFcblx0Ly8gQ29udmVydHMgdG8gYGFsdGVybmF0aXZlc2Agb24gcmUtZGVmaW5pbmcgdGhlIHNhbWUgcnVsZS5cblx0YWRkUnVsZShydWxlTmFtZSwgcnVsZSkge1xuXHRcdC8vIENsZWFyIG1lbW9pemVkIGBfX3J1bGVzYFxuXHRcdGRlbGV0ZSB0aGlzLl9fcnVsZXM7XG5cblx0XHQvLyBJZiBwYXNzZWQgYSBmdW5jdGlvbiwgY3JlYXRlIGFuIGluc3RhbmNlIGZvciB0aGUgYWN0dWFsIHJ1bGUuXG5cdFx0Ly8gVGhpcyBpcyBjb21tb25seSBkb25lIHNvIEpTIHdpbGwgZ2l2ZSB1cyBtZWFuaW5nZnVsIGNsYXNzIG5hbWVzIGluIGRlYnVnIG91dHB1dC5cblx0XHRpZiAodHlwZW9mIHJ1bGUgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0cnVsZSA9IG5ldyBydWxlKCk7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgd2UgZ290IGFuIGFycmF5IG9mIGBydWxlTmFtZXNgLCByZWN1cnNpdmVseSBhZGQgdW5kZXIgZWFjaCBuYW1lIHdpdGggdGhlIHNhbWUgYHJ1bGVgLlxuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVOYW1lKSkge1xuXHRcdFx0cnVsZU5hbWUuZm9yRWFjaChydWxlTmFtZSA9PiB0aGlzLmFkZFJ1bGUocnVsZU5hbWUsIHJ1bGUpICk7XG5cdFx0XHRyZXR1cm4gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBTZXQgYHJ1bGVOYW1lYCBpZiBpdCBoYXNuJ3QgYmVlbiBleHBsaWNpdGx5IHNldC5cblx0XHRpZiAoIXJ1bGUucnVsZU5hbWUpIHJ1bGUucnVsZU5hbWUgPSBydWxlTmFtZTtcblxuXHRcdC8vIElmIGEgcnVsZSBvZiB0aGlzIG5hbWUgYWxyZWFkeSBleGlzdHNcblx0XHRjb25zdCBleGlzdGluZyA9IHRoaXMuX3J1bGVzW3J1bGVOYW1lXTtcblx0XHRpZiAoZXhpc3RpbmcpIHtcblx0XHRcdC8vIENvbnZlcnQgdG8gYW4gYEFsdGVybmF0aXZlc2AgaWYgbm90IG9uZSBhbHJlYWR5LlxuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5ERUJVRykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtydWxlTmFtZX0nIHRvIGFsdGVybmF0aXZlc2ApO1xuXHRcdFx0XHR0aGlzLl9ydWxlc1tydWxlTmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdC8vIGNvcHkgYXJndW1lbnQgbmFtZSBvdmVyICg/Pz8pXG5cdFx0XHRcdGlmIChleGlzdGluZy5hcmd1bWVudCkgdGhpcy5fcnVsZXNbcnVsZU5hbWVdLmFyZ3VtZW50ID0gZXhpc3RpbmcuYXJndW1lbnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoUGFyc2VyLkRFQlVHKSBjb25zb2xlLmxvZyhgQWRkaW5nIHJ1bGUgJyR7cnVsZS5ydWxlTmFtZX0nIHRvICcke3J1bGVOYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0Ly8gQWRkIHJ1bGUgdG8gdGhlIGFsdGVybmF0aXZlcy5cblx0XHRcdHRoaXMuX3J1bGVzW3J1bGVOYW1lXS5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHQvLyBPdGhlcndpc2UganVzdCByZW1lbWJlciB0aGUgcnVsZS5cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMuX3J1bGVzW3J1bGVOYW1lXSA9IHJ1bGU7XG5cdFx0fVxuXG5cblx0XHQvLyBtYWtlIGEgbm90ZSBpZiB3ZSdyZSBhZGRpbmcgYSBsZWZ0LXJlY3Vyc2l2ZSBydWxlXG4vL1RPRE86IHRoaXMgZG9lc24ndCBmbHkgaWYgYWRkaW5nIHVuZGVyIG11bHRpcGxlIG5hbWVzLi4uICA6LShcblx0XHRpZiAoUGFyc2VyLnJ1bGVJc0xlZnRSZWN1cnNpdmUocnVsZU5hbWUsIHJ1bGUpKSB7XG5cdFx0XHRpZiAoIXJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEVycm9yIGRlZmluaW5nIHJ1bGUgJyR7cnVsZU5hbWV9JzogT25seSBTZXF1ZW5jZSBydWxlcyBjYW4gYmUgbGVmdFJlY3VzaXZlYCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBZb3UgbXVzdCBkZWZpbmUgYSBgdGVzdFJ1bGVgIGZvciBsZWZ0IHJlY3Vyc2l2ZSBzZXF1ZW5jZXMuXG5cdFx0XHQvLyBlLmcuIGB0ZXN0UnVsZSA9IG5ldyBSdWxlLk1hdGNoKHsgbWF0Y2g6IFtcInNvbWV0aGluZ1wiXSB9KWBcblx0XHRcdGlmICghcnVsZS50ZXN0UnVsZSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFcnJvciBkZWZpbmluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JzogWW91IG11c3QgZGVmaW5lIGEgJ3Rlc3RSdWxlJyBmb3IgbGVmdFJlY3VzaXZlIHJ1bGVzLmApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5ERUJVRykgY29uc29sZS5pbmZvKFwibWFya2luZyBcIiwgcnVsZSwgXCIgYXMgbGVmdCByZWN1cnNpdmUhXCIpO1xuXG5cdFx0XHRydWxlLmxlZnRSZWN1cnNpdmUgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cblxuLy9cbi8vICMjIyBQYXJzZXIgcmVnaXN0cnkuXG4vL1xuXHRzdGF0aWMgUkVHSVNUUlkgPSB7fTtcblxuXHQvLyBHZXQgYSBwYXJzZXIgZm9yIGEgZ2l2ZW4gYGNvbnRleHROYW1lYC5cblx0Ly8gV2lsbCByZS11c2UgZXhpc3RpbmcgcGFyc2VyLCBvciBjcmVhdGUgYSBuZXcgb25lIGlmIG5vdCBhbHJlYWR5IGRlZmluZWQuXG5cdHN0YXRpYyBmb3JDb250ZXh0KGNvbnRleHROYW1lKSB7XG5cdFx0aWYgKCFQYXJzZXIuUkVHSVNUUllbY29udGV4dE5hbWVdKSB7XG5cdFx0XHRQYXJzZXIuUkVHSVNUUllbY29udGV4dE5hbWVdID0gbmV3IFBhcnNlcih7IGNvbnRleHROYW1lIH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gUGFyc2VyLlJFR0lTVFJZW2NvbnRleHROYW1lXTtcblx0fVxuXG5cdC8vIFJldHVybiBhIHBhcnNlciBmb3IgYGNvbnRleHROYW1lYCBvciB0aHJvdyBhbiBleGNlcHRpb24gaWYgbm90IGZvdW5kLlxuXHRzdGF0aWMgZ2V0Q29udGV4dE9yRGllKGNvbnRleHROYW1lKSB7XG5cdFx0aWYgKFBhcnNlci5SRUdJU1RSWVtjb250ZXh0TmFtZV0pIHJldHVybiBQYXJzZXIuUkVHSVNUUllbY29udGV4dE5hbWVdO1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYFBhcnNlci5nZXRDb250ZXh0T3JEaWUoKTogY29udGV4dE5hbWUgJyR7Y29udGV4dE5hbWV9JyBub3QgZm91bmQuYCk7XG5cdH1cblxuXG5cbi8vXG4vLyAjIyBVdGlsaXR5IG1ldGhvZHNcbi8vXG5cblx0Ly8gSXMgdGhlIHNwZWNpZmllZCBydWxlIGxlZnQtcmVjdXJzaXZlP1xuXHQvLyBUcnVlIGZvciBzZXF1ZW5jZXMgd2hlcmUgdGhlIGZpcnN0IG5vbi1vcHRpb25hbCBydWxlIHJlY3Vyc2l2ZWx5IGNhbGxzIGBydWxlTmFtZWAuXG5cdHN0YXRpYyBydWxlSXNMZWZ0UmVjdXJzaXZlKHJ1bGVOYW1lLCBydWxlKSB7XG5cdFx0aWYgKCEocnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UpIHx8ICFydWxlLnJ1bGVzKSByZXR1cm4gZmFsc2U7XG4vL2NvbnNvbGUubG9nKHJ1bGVOYW1lLCBydWxlKTtcblx0XHRsZXQgaW5kZXggPSAwLCBzdWJydWxlID0gdW5kZWZpbmVkO1xuXHRcdHdoaWxlIChzdWJydWxlID0gcnVsZS5ydWxlc1tpbmRleCsrXSkge1xuXHRcdFx0Ly8gaWdub3JlIG9wdGlvbmFsIHJ1bGVzXG5cdFx0XHRpZiAoc3VicnVsZS5vcHRpb25hbCkgY29udGludWU7XG5cdFx0XHRpZiAoc3VicnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3VicnVsZSAmJiBzdWJydWxlLnJ1bGUgPT09IHJ1bGVOYW1lKSByZXR1cm4gdHJ1ZTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmBcblx0Ly9cdGluIGFycmF5IG9mIGB0b2tlbnNgIChzdHJpbmdzKS5cblx0Ly8gSWYgc3VjY2Vzc2Z1bCwgcmV0dXJucyBgeyBzdGFydCwgZW5kLCBzbGljZSB9YFxuXHQvLyBUaHJvd3MgaWYgdW5zdWNlc3NmdWwuXG5cdHN0YXRpYyBmaW5kTmVzdGVkVG9rZW5zKHRva2Vucywgc3RhcnRUb2tlbiwgZW5kVG9rZW4sIHN0YXJ0ID0gMCkge1xuXHRcdGlmICh0b2tlbnNbc3RhcnRdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0fSBvZiB0b2tlbnNgKTtcblx0XHRsZXQgbmVzdGluZyA9IDA7XG5cdFx0bGV0IG5lc3RlZCA9IGZhbHNlO1xuXHRcdGZvciAobGV0IGVuZCA9IHN0YXJ0ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kIDwgbGFzdEluZGV4OyBlbmQrKykge1xuXHRcdFx0bGV0IHRva2VuID0gdG9rZW5zW2VuZF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydCwgZW5kLCBzbGljZTogdG9rZW5zLnNsaWNlKHN0YXJ0KzEsIGVuZCksIG5lc3RlZCB9O1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgQ291bGRuJ3QgZmluZCBtYXRjaGluZyAnJHtlbmRUb2tlbn0ncyBzdGFydGluZyBhdCBpdGVtICR7c3RhcnR9YCk7XG5cdH1cblxuXG5cdC8vIExpc3Qgb2Ygc3BlY2lhbCBjaGFyYWN0ZXJzIGluIHJlZ3VsYXIgZXhwcmVzc2lvbnMuXG5cdC8vIFVzZWQgdG8gZXNjYXBlIHRob3NlIGNoYXJzIHdoZW4gY3JlYXRpbmcgcmVndWxhciBleHByZXNzaW9ucyBmcm9tIHN0cmluZ3MuXG5cdHN0YXRpYyBSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTID0gKGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IGNoYXJzID0ge307XG5cdFx0XCJcXFxcL14kKis/LigpfHt9LFtdXCIuc3BsaXQoXCJcIikuZm9yRWFjaChjaGFyID0+IGNoYXJzW2NoYXJdID0gdHJ1ZSk7XG5cdFx0cmV0dXJuIGNoYXJzO1xuXHR9KSgpXG5cblx0Ly8gR2l2ZW4gYSBcIm5vcm1hbFwiIGBzdHJpbmdgLCBlc2NhcGUgYW55IHJlZ3VsYXIgZXhwcmVzc2lvbiBzcGVjaWFsIGNoYXJhY3RlcnNcblx0Ly9cdHNvIHdlIGNhbiBjcmVhdGUgYSBgbmV3IFJlZ0V4cCgpYC5cblx0Ly8gQWxzbyBjb252ZXJ0cyBhIHNpbmdsZSBzcGFjZSB0byBhcmJpdHJhcnkgc2V0IG9mIHNwYWNlcyB3aXRoIFwiXFxzK1wiXG5cdHN0YXRpYyBlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZykge1xuXHRcdHJldHVybiBzdHJpbmcuc3BsaXQoXCJcIikubWFwKGZ1bmN0aW9uIChjaGFyLCBpbmRleCwgbGlzdCkge1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBiYWNrc2xhc2hcblx0XHRcdGlmIChjaGFyID09PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiO1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBzcGFjZVxuXHRcdFx0aWYgKGNoYXIgPT09IFwiIFwiKSByZXR1cm4gXCJcXFxccytcIjtcblx0XHRcdC8vIElmIGEgc3BlY2lhbCBjaGFyIGFuZCBwcmV2aW91cyBjaGFyYWN0ZXIgd2FzIG5vdCBhbiBlc2NhcGUsIGVzY2FwZSB0aGUgcmVzdWx0LlxuXHRcdFx0aWYgKFBhcnNlci5SRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTW2NoYXJdICYmIGxpc3RbaW5kZXgtMV0gIT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCIrY2hhcjtcblx0XHRcdC8vIFRoaXMgY2hhciBzaG91bGQgYmUgZmluZSBieSBpdHNlbGYuXG5cdFx0XHRyZXR1cm4gY2hhcjtcblx0XHR9KS5qb2luKFwiXCIpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgbmV3IHJlZ3VsYXIgZXhwcmVzc2lvbiBmcm9tIGEgXCJub3JtYWxcIiBzdHJpbmcsIGVzY2FwaW5nIHNwZWNpYWwgY2hhcmFjdGVycyBhcyBuZWNlc3NhcnkuXG5cdHN0YXRpYyBSZWdFeHBGcm9tU3RyaW5nKHN0cmluZywgZmxhZ3MpIHtcblx0XHRyZXR1cm4gbmV3IFJlZ0V4cChQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpLCBmbGFncyk7XG5cdH1cblxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUGFyc2VyLmpzIiwiZnVuY3Rpb24gX3RvQ29uc3VtYWJsZUFycmF5KGFycikgeyBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7IGZvciAodmFyIGkgPSAwLCBhcnIyID0gQXJyYXkoYXJyLmxlbmd0aCk7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHsgYXJyMltpXSA9IGFycltpXTsgfSByZXR1cm4gYXJyMjsgfSBlbHNlIHsgcmV0dXJuIEFycmF5LmZyb20oYXJyKTsgfSB9XG5cbi8qIGVzbGludC1kaXNhYmxlIG5vLXVzZS1iZWZvcmUtZGVmaW5lICovXG4vKipcbiAqIEBtb2R1bGUgZXZlbnRIYW5kbGVyc1xuICpcbiAqL1xuaW1wb3J0IGRvbUhlbHBlcnMgZnJvbSAnLi9saWIvZG9tX2hlbHBlcnMnO1xuaW1wb3J0IGxpc3RlbmVycyBmcm9tICcuL2xpYi9saXN0ZW5lcnMnO1xuaW1wb3J0IHN0b3JlIGZyb20gJy4vc3RvcmUnO1xuXG4vKipcbiAqIHByaXZhdGVcbiAqXG4gKi9cblxuLyoqXG4gKiBfb25DbGlja1xuICpcbiAqIEBhY2Nlc3MgcHJpdmF0ZVxuICogQHBhcmFtIHtvYmplY3R9IGV2ZW50IFRoZSBjbGljayBldmVudCBvYmplY3RcbiAqIEBwYXJhbSB7b2JqZWN0fSBldmVudC50YXJnZXQgVGhlIERPTSBub2RlIGZyb20gdGhlIGNsaWNrIGV2ZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBfb25DbGljayhfcmVmKSB7XG4gIHZhciB0YXJnZXQgPSBfcmVmLnRhcmdldDtcblxuICBzdG9yZS5hY3RpdmF0ZShbXS5jb25jYXQoX3RvQ29uc3VtYWJsZUFycmF5KHN0b3JlLmdldEluc3RhbmNlcygpKSkucmVkdWNlKGRvbUhlbHBlcnMuZmluZENvbnRhaW5lck5vZGVzKHRhcmdldCksIFtdKS5zb3J0KGRvbUhlbHBlcnMuc29ydEJ5RE9NUG9zaXRpb24pLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgIHJldHVybiBpdGVtLmluc3RhbmNlO1xuICB9KSk7XG59XG5cbi8qKlxuICogX29uS2V5RG93bjogVGhlIGtleWRvd24gZXZlbnQgY2FsbGJhY2tcbiAqXG4gKiBAYWNjZXNzIHByaXZhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBldmVudCBUaGUga2V5ZG93biBldmVudCBvYmplY3RcbiAqIEBwYXJhbSB7bnVtYmVyfSBldmVudC53aGljaCBUaGUga2V5IGNvZGUgKHdoaWNoKSByZWNlaXZlZCBmcm9tIHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBfb25LZXlEb3duKGV2ZW50KSB7XG4gIHZhciBmb3JjZUNvbnNpZGVyID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiBmYWxzZTtcblxuICBpZiAoZm9yY2VDb25zaWRlciB8fCBfc2hvdWxkQ29uc2lkZXIoZXZlbnQpKSB7XG4gICAgdmFyIF9yZWYyID0gc3RvcmUuZmluZEJpbmRpbmdGb3JFdmVudChldmVudCkgfHwge30sXG4gICAgICAgIGZuID0gX3JlZjIuZm4sXG4gICAgICAgIGluc3RhbmNlID0gX3JlZjIuaW5zdGFuY2U7XG5cbiAgICBpZiAoZm4pIHtcbiAgICAgIGZuLmNhbGwoaW5zdGFuY2UsIGV2ZW50KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogX3Nob3VsZENvbnNpZGVyOiBDb25kaXRpb25zIGZvciBwcm9jZWVkaW5nIHdpdGgga2V5IGV2ZW50IGhhbmRsaW5nXG4gKlxuICogQGFjY2VzcyBwcml2YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gZXZlbnQgVGhlIGtleWRvd24gZXZlbnQgb2JqZWN0XG4gKiBAcGFyYW0ge29iamVjdH0gZXZlbnQudGFyZ2V0IFRoZSBub2RlIG9yaWdpbiBvZiB0aGUgZXZlbnRcbiAqIEByZXR1cm4ge2Jvb2xlYW59IFdoZXRoZXIgdG8gY29udGludWUgcHJvY2VzaW5nIHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBfc2hvdWxkQ29uc2lkZXIoX3JlZjMpIHtcbiAgdmFyIGN0cmxLZXkgPSBfcmVmMy5jdHJsS2V5LFxuICAgICAgdGFyZ2V0ID0gX3JlZjMudGFyZ2V0O1xuXG4gIHJldHVybiBjdHJsS2V5IHx8ICF+WydJTlBVVCcsICdTRUxFQ1QnLCAnVEVYVEFSRUEnXS5pbmRleE9mKHRhcmdldC50YWdOYW1lKSB8fCB0YXJnZXQuZ2V0QXR0cmlidXRlKCdyb2xlJykgIT09ICd0ZXh0Ym94Jztcbn1cblxuLyoqXG4gKiBwdWJsaWNcbiAqXG4gKi9cblxuLyoqXG4gKiBvbk1vdW50XG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gb25Nb3VudChpbnN0YW5jZSkge1xuICAvLyBoYXZlIHRvIGJ1bXAgdGhpcyB0byBuZXh0IGV2ZW50IGxvb3AgYmVjYXVzZSBjb21wb25lbnQgbW91bnRpbmcgcm91dGluZWx5XG4gIC8vIHByZWNlZWRzIHRoZSBkb20gY2xpY2sgZXZlbnQgdGhhdCB0cmlnZ2VyZWQgdGhlIG1vdW50ICh3dGY/KVxuICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gc3RvcmUuYWN0aXZhdGUoaW5zdGFuY2UpO1xuICB9LCAwKTtcbiAgbGlzdGVuZXJzLmJpbmRLZXlzKF9vbktleURvd24pO1xuICBsaXN0ZW5lcnMuYmluZENsaWNrcyhfb25DbGljayk7XG4gIGRvbUhlbHBlcnMuYmluZEZvY3VzYWJsZXMoaW5zdGFuY2UsIHN0b3JlLmFjdGl2YXRlKTtcbn1cblxuLyoqXG4gKiBvblVubW91bnRcbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICovXG5mdW5jdGlvbiBvblVubW91bnQoaW5zdGFuY2UpIHtcbiAgc3RvcmUuZGVsZXRlSW5zdGFuY2UoaW5zdGFuY2UpO1xuICBpZiAoc3RvcmUuaXNFbXB0eSgpKSB7XG4gICAgbGlzdGVuZXJzLnVuYmluZENsaWNrcyhfb25DbGljayk7XG4gICAgbGlzdGVuZXJzLnVuYmluZEtleXMoX29uS2V5RG93bik7XG4gIH1cbn1cblxuZXhwb3J0IHsgb25Nb3VudCwgb25Vbm1vdW50IH07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvZXZlbnRfaGFuZGxlcnMuanNcbi8vIG1vZHVsZSBpZCA9IDI4MVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJpbXBvcnQgeyBtb2RpZmllcnMgYXMgbW9kaWZpZXJLZXlzIH0gZnJvbSAnLi9rZXlzJztcblxudmFyIG1vZEtleXMgPSBPYmplY3Qua2V5cyhtb2RpZmllcktleXMpO1xuXG5mdW5jdGlvbiBtYXRjaEtleXMoX3JlZikge1xuICB2YXIgX3JlZiRrZXlTZXQgPSBfcmVmLmtleVNldCxcbiAgICAgIGtleSA9IF9yZWYka2V5U2V0LmtleSxcbiAgICAgIF9yZWYka2V5U2V0JG1vZGlmaWVycyA9IF9yZWYka2V5U2V0Lm1vZGlmaWVycyxcbiAgICAgIG1vZGlmaWVycyA9IF9yZWYka2V5U2V0JG1vZGlmaWVycyA9PT0gdW5kZWZpbmVkID8gW10gOiBfcmVmJGtleVNldCRtb2RpZmllcnMsXG4gICAgICBldmVudCA9IF9yZWYuZXZlbnQ7XG5cbiAgdmFyIGtleXNNYXRjaCA9IGZhbHNlO1xuICBpZiAoa2V5ID09PSBldmVudC53aGljaCkge1xuICAgIHZhciBldnRNb2RLZXlzID0gbW9kS2V5cy5maWx0ZXIoZnVuY3Rpb24gKG1vZEtleSkge1xuICAgICAgcmV0dXJuIGV2ZW50W21vZEtleSArICdLZXknXTtcbiAgICB9KS5zb3J0KCk7XG4gICAga2V5c01hdGNoID0gbW9kaWZpZXJzLmxlbmd0aCA9PT0gZXZ0TW9kS2V5cy5sZW5ndGggJiYgbW9kaWZpZXJzLmV2ZXJ5KGZ1bmN0aW9uIChtb2RLZXksIGluZGV4KSB7XG4gICAgICByZXR1cm4gZXZ0TW9kS2V5c1tpbmRleF0gPT09IG1vZEtleTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4ga2V5c01hdGNoO1xufVxuXG5leHBvcnQgZGVmYXVsdCBtYXRjaEtleXM7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL21hdGNoX2tleXMuanNcbi8vIG1vZHVsZSBpZCA9IDI4MlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJpbXBvcnQgS2V5cywgeyBtb2RpZmllcnMgfSBmcm9tICcuL2tleXMnO1xuXG5mdW5jdGlvbiBwYXJzZUtleXMoa2V5c0FycmF5KSB7XG4gIHJldHVybiBrZXlzQXJyYXkubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICB2YXIga2V5U2V0ID0geyBrZXk6IGtleSB9O1xuICAgIGlmICh0eXBlb2Yga2V5ID09PSAnc3RyaW5nJykge1xuICAgICAgdmFyIGtleVN0cmluZyA9IGtleS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgICAgIHZhciBtYXRjaGVzID0ga2V5U3RyaW5nLnNwbGl0KC9cXHM/XFwrXFxzPy8pO1xuICAgICAga2V5U2V0ID0gbWF0Y2hlcy5sZW5ndGggPT09IDEgPyB7IGtleTogS2V5c1trZXlTdHJpbmddIH0gOiB7XG4gICAgICAgIGtleTogS2V5c1ttYXRjaGVzLnBvcCgpXSxcbiAgICAgICAgbW9kaWZpZXJzOiBtYXRjaGVzLm1hcChmdW5jdGlvbiAobW9kS2V5KSB7XG4gICAgICAgICAgcmV0dXJuIG1vZGlmaWVyc1ttb2RLZXldO1xuICAgICAgICB9KS5zb3J0KClcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBrZXlTZXQ7XG4gIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBwYXJzZUtleXM7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL3BhcnNlX2tleXMuanNcbi8vIG1vZHVsZSBpZCA9IDI4M1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKlxuXHRNSVQgTGljZW5zZSBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuXHRBdXRob3IgVG9iaWFzIEtvcHBlcnMgQHNva3JhXG4qL1xudmFyIHN0eWxlc0luRG9tID0ge30sXG5cdG1lbW9pemUgPSBmdW5jdGlvbihmbikge1xuXHRcdHZhciBtZW1vO1xuXHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAodHlwZW9mIG1lbW8gPT09IFwidW5kZWZpbmVkXCIpIG1lbW8gPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdFx0cmV0dXJuIG1lbW87XG5cdFx0fTtcblx0fSxcblx0aXNPbGRJRSA9IG1lbW9pemUoZnVuY3Rpb24oKSB7XG5cdFx0Ly8gVGVzdCBmb3IgSUUgPD0gOSBhcyBwcm9wb3NlZCBieSBCcm93c2VyaGFja3Ncblx0XHQvLyBAc2VlIGh0dHA6Ly9icm93c2VyaGFja3MuY29tLyNoYWNrLWU3MWQ4NjkyZjY1MzM0MTczZmVlNzE1YzIyMmNiODA1XG5cdFx0Ly8gVGVzdHMgZm9yIGV4aXN0ZW5jZSBvZiBzdGFuZGFyZCBnbG9iYWxzIGlzIHRvIGFsbG93IHN0eWxlLWxvYWRlciBcblx0XHQvLyB0byBvcGVyYXRlIGNvcnJlY3RseSBpbnRvIG5vbi1zdGFuZGFyZCBlbnZpcm9ubWVudHNcblx0XHQvLyBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrLWNvbnRyaWIvc3R5bGUtbG9hZGVyL2lzc3Vlcy8xNzdcblx0XHRyZXR1cm4gd2luZG93ICYmIGRvY3VtZW50ICYmIGRvY3VtZW50LmFsbCAmJiAhd2luZG93LmF0b2I7XG5cdH0pLFxuXHRnZXRFbGVtZW50ID0gKGZ1bmN0aW9uKGZuKSB7XG5cdFx0dmFyIG1lbW8gPSB7fTtcblx0XHRyZXR1cm4gZnVuY3Rpb24oc2VsZWN0b3IpIHtcblx0XHRcdGlmICh0eXBlb2YgbWVtb1tzZWxlY3Rvcl0gPT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdFx0bWVtb1tzZWxlY3Rvcl0gPSBmbi5jYWxsKHRoaXMsIHNlbGVjdG9yKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBtZW1vW3NlbGVjdG9yXVxuXHRcdH07XG5cdH0pKGZ1bmN0aW9uIChzdHlsZVRhcmdldCkge1xuXHRcdHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHN0eWxlVGFyZ2V0KVxuXHR9KSxcblx0c2luZ2xldG9uRWxlbWVudCA9IG51bGwsXG5cdHNpbmdsZXRvbkNvdW50ZXIgPSAwLFxuXHRzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcCA9IFtdLFxuXHRmaXhVcmxzID0gcmVxdWlyZShcIi4vZml4VXJsc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihsaXN0LCBvcHRpb25zKSB7XG5cdGlmKHR5cGVvZiBERUJVRyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBERUJVRykge1xuXHRcdGlmKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IEVycm9yKFwiVGhlIHN0eWxlLWxvYWRlciBjYW5ub3QgYmUgdXNlZCBpbiBhIG5vbi1icm93c2VyIGVudmlyb25tZW50XCIpO1xuXHR9XG5cblx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdG9wdGlvbnMuYXR0cnMgPSB0eXBlb2Ygb3B0aW9ucy5hdHRycyA9PT0gXCJvYmplY3RcIiA/IG9wdGlvbnMuYXR0cnMgOiB7fTtcblxuXHQvLyBGb3JjZSBzaW5nbGUtdGFnIHNvbHV0aW9uIG9uIElFNi05LCB3aGljaCBoYXMgYSBoYXJkIGxpbWl0IG9uIHRoZSAjIG9mIDxzdHlsZT5cblx0Ly8gdGFncyBpdCB3aWxsIGFsbG93IG9uIGEgcGFnZVxuXHRpZiAodHlwZW9mIG9wdGlvbnMuc2luZ2xldG9uID09PSBcInVuZGVmaW5lZFwiKSBvcHRpb25zLnNpbmdsZXRvbiA9IGlzT2xkSUUoKTtcblxuXHQvLyBCeSBkZWZhdWx0LCBhZGQgPHN0eWxlPiB0YWdzIHRvIHRoZSA8aGVhZD4gZWxlbWVudFxuXHRpZiAodHlwZW9mIG9wdGlvbnMuaW5zZXJ0SW50byA9PT0gXCJ1bmRlZmluZWRcIikgb3B0aW9ucy5pbnNlcnRJbnRvID0gXCJoZWFkXCI7XG5cblx0Ly8gQnkgZGVmYXVsdCwgYWRkIDxzdHlsZT4gdGFncyB0byB0aGUgYm90dG9tIG9mIHRoZSB0YXJnZXRcblx0aWYgKHR5cGVvZiBvcHRpb25zLmluc2VydEF0ID09PSBcInVuZGVmaW5lZFwiKSBvcHRpb25zLmluc2VydEF0ID0gXCJib3R0b21cIjtcblxuXHR2YXIgc3R5bGVzID0gbGlzdFRvU3R5bGVzKGxpc3QsIG9wdGlvbnMpO1xuXHRhZGRTdHlsZXNUb0RvbShzdHlsZXMsIG9wdGlvbnMpO1xuXG5cdHJldHVybiBmdW5jdGlvbiB1cGRhdGUobmV3TGlzdCkge1xuXHRcdHZhciBtYXlSZW1vdmUgPSBbXTtcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgc3R5bGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgaXRlbSA9IHN0eWxlc1tpXTtcblx0XHRcdHZhciBkb21TdHlsZSA9IHN0eWxlc0luRG9tW2l0ZW0uaWRdO1xuXHRcdFx0ZG9tU3R5bGUucmVmcy0tO1xuXHRcdFx0bWF5UmVtb3ZlLnB1c2goZG9tU3R5bGUpO1xuXHRcdH1cblx0XHRpZihuZXdMaXN0KSB7XG5cdFx0XHR2YXIgbmV3U3R5bGVzID0gbGlzdFRvU3R5bGVzKG5ld0xpc3QsIG9wdGlvbnMpO1xuXHRcdFx0YWRkU3R5bGVzVG9Eb20obmV3U3R5bGVzLCBvcHRpb25zKTtcblx0XHR9XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IG1heVJlbW92ZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGRvbVN0eWxlID0gbWF5UmVtb3ZlW2ldO1xuXHRcdFx0aWYoZG9tU3R5bGUucmVmcyA9PT0gMCkge1xuXHRcdFx0XHRmb3IodmFyIGogPSAwOyBqIDwgZG9tU3R5bGUucGFydHMubGVuZ3RoOyBqKyspXG5cdFx0XHRcdFx0ZG9tU3R5bGUucGFydHNbal0oKTtcblx0XHRcdFx0ZGVsZXRlIHN0eWxlc0luRG9tW2RvbVN0eWxlLmlkXTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG59O1xuXG5mdW5jdGlvbiBhZGRTdHlsZXNUb0RvbShzdHlsZXMsIG9wdGlvbnMpIHtcblx0Zm9yKHZhciBpID0gMDsgaSA8IHN0eWxlcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBpdGVtID0gc3R5bGVzW2ldO1xuXHRcdHZhciBkb21TdHlsZSA9IHN0eWxlc0luRG9tW2l0ZW0uaWRdO1xuXHRcdGlmKGRvbVN0eWxlKSB7XG5cdFx0XHRkb21TdHlsZS5yZWZzKys7XG5cdFx0XHRmb3IodmFyIGogPSAwOyBqIDwgZG9tU3R5bGUucGFydHMubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0ZG9tU3R5bGUucGFydHNbal0oaXRlbS5wYXJ0c1tqXSk7XG5cdFx0XHR9XG5cdFx0XHRmb3IoOyBqIDwgaXRlbS5wYXJ0cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRkb21TdHlsZS5wYXJ0cy5wdXNoKGFkZFN0eWxlKGl0ZW0ucGFydHNbal0sIG9wdGlvbnMpKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIHBhcnRzID0gW107XG5cdFx0XHRmb3IodmFyIGogPSAwOyBqIDwgaXRlbS5wYXJ0cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRwYXJ0cy5wdXNoKGFkZFN0eWxlKGl0ZW0ucGFydHNbal0sIG9wdGlvbnMpKTtcblx0XHRcdH1cblx0XHRcdHN0eWxlc0luRG9tW2l0ZW0uaWRdID0ge2lkOiBpdGVtLmlkLCByZWZzOiAxLCBwYXJ0czogcGFydHN9O1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBsaXN0VG9TdHlsZXMobGlzdCwgb3B0aW9ucykge1xuXHR2YXIgc3R5bGVzID0gW107XG5cdHZhciBuZXdTdHlsZXMgPSB7fTtcblx0Zm9yKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgaXRlbSA9IGxpc3RbaV07XG5cdFx0dmFyIGlkID0gb3B0aW9ucy5iYXNlID8gaXRlbVswXSArIG9wdGlvbnMuYmFzZSA6IGl0ZW1bMF07XG5cdFx0dmFyIGNzcyA9IGl0ZW1bMV07XG5cdFx0dmFyIG1lZGlhID0gaXRlbVsyXTtcblx0XHR2YXIgc291cmNlTWFwID0gaXRlbVszXTtcblx0XHR2YXIgcGFydCA9IHtjc3M6IGNzcywgbWVkaWE6IG1lZGlhLCBzb3VyY2VNYXA6IHNvdXJjZU1hcH07XG5cdFx0aWYoIW5ld1N0eWxlc1tpZF0pXG5cdFx0XHRzdHlsZXMucHVzaChuZXdTdHlsZXNbaWRdID0ge2lkOiBpZCwgcGFydHM6IFtwYXJ0XX0pO1xuXHRcdGVsc2Vcblx0XHRcdG5ld1N0eWxlc1tpZF0ucGFydHMucHVzaChwYXJ0KTtcblx0fVxuXHRyZXR1cm4gc3R5bGVzO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucywgc3R5bGVFbGVtZW50KSB7XG5cdHZhciBzdHlsZVRhcmdldCA9IGdldEVsZW1lbnQob3B0aW9ucy5pbnNlcnRJbnRvKVxuXHRpZiAoIXN0eWxlVGFyZ2V0KSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGRuJ3QgZmluZCBhIHN0eWxlIHRhcmdldC4gVGhpcyBwcm9iYWJseSBtZWFucyB0aGF0IHRoZSB2YWx1ZSBmb3IgdGhlICdpbnNlcnRJbnRvJyBwYXJhbWV0ZXIgaXMgaW52YWxpZC5cIik7XG5cdH1cblx0dmFyIGxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wID0gc3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3Bbc3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3AubGVuZ3RoIC0gMV07XG5cdGlmIChvcHRpb25zLmluc2VydEF0ID09PSBcInRvcFwiKSB7XG5cdFx0aWYoIWxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wKSB7XG5cdFx0XHRzdHlsZVRhcmdldC5pbnNlcnRCZWZvcmUoc3R5bGVFbGVtZW50LCBzdHlsZVRhcmdldC5maXJzdENoaWxkKTtcblx0XHR9IGVsc2UgaWYobGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3AubmV4dFNpYmxpbmcpIHtcblx0XHRcdHN0eWxlVGFyZ2V0Lmluc2VydEJlZm9yZShzdHlsZUVsZW1lbnQsIGxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wLm5leHRTaWJsaW5nKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c3R5bGVUYXJnZXQuYXBwZW5kQ2hpbGQoc3R5bGVFbGVtZW50KTtcblx0XHR9XG5cdFx0c3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3AucHVzaChzdHlsZUVsZW1lbnQpO1xuXHR9IGVsc2UgaWYgKG9wdGlvbnMuaW5zZXJ0QXQgPT09IFwiYm90dG9tXCIpIHtcblx0XHRzdHlsZVRhcmdldC5hcHBlbmRDaGlsZChzdHlsZUVsZW1lbnQpO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdmFsdWUgZm9yIHBhcmFtZXRlciAnaW5zZXJ0QXQnLiBNdXN0IGJlICd0b3AnIG9yICdib3R0b20nLlwiKTtcblx0fVxufVxuXG5mdW5jdGlvbiByZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGVFbGVtZW50KSB7XG5cdHN0eWxlRWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHN0eWxlRWxlbWVudCk7XG5cdHZhciBpZHggPSBzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcC5pbmRleE9mKHN0eWxlRWxlbWVudCk7XG5cdGlmKGlkeCA+PSAwKSB7XG5cdFx0c3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3Auc3BsaWNlKGlkeCwgMSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlU3R5bGVFbGVtZW50KG9wdGlvbnMpIHtcblx0dmFyIHN0eWxlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcblx0b3B0aW9ucy5hdHRycy50eXBlID0gXCJ0ZXh0L2Nzc1wiO1xuXG5cdGF0dGFjaFRhZ0F0dHJzKHN0eWxlRWxlbWVudCwgb3B0aW9ucy5hdHRycyk7XG5cdGluc2VydFN0eWxlRWxlbWVudChvcHRpb25zLCBzdHlsZUVsZW1lbnQpO1xuXHRyZXR1cm4gc3R5bGVFbGVtZW50O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVMaW5rRWxlbWVudChvcHRpb25zKSB7XG5cdHZhciBsaW5rRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaW5rXCIpO1xuXHRvcHRpb25zLmF0dHJzLnR5cGUgPSBcInRleHQvY3NzXCI7XG5cdG9wdGlvbnMuYXR0cnMucmVsID0gXCJzdHlsZXNoZWV0XCI7XG5cblx0YXR0YWNoVGFnQXR0cnMobGlua0VsZW1lbnQsIG9wdGlvbnMuYXR0cnMpO1xuXHRpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucywgbGlua0VsZW1lbnQpO1xuXHRyZXR1cm4gbGlua0VsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIGF0dGFjaFRhZ0F0dHJzKGVsZW1lbnQsIGF0dHJzKSB7XG5cdE9iamVjdC5rZXlzKGF0dHJzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcblx0XHRlbGVtZW50LnNldEF0dHJpYnV0ZShrZXksIGF0dHJzW2tleV0pO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gYWRkU3R5bGUob2JqLCBvcHRpb25zKSB7XG5cdHZhciBzdHlsZUVsZW1lbnQsIHVwZGF0ZSwgcmVtb3ZlLCB0cmFuc2Zvcm1SZXN1bHQ7XG5cblx0Ly8gSWYgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gd2FzIGRlZmluZWQsIHJ1biBpdCBvbiB0aGUgY3NzXG5cdGlmIChvcHRpb25zLnRyYW5zZm9ybSAmJiBvYmouY3NzKSB7XG5cdCAgICB0cmFuc2Zvcm1SZXN1bHQgPSBvcHRpb25zLnRyYW5zZm9ybShvYmouY3NzKTtcblx0ICAgIFxuXHQgICAgaWYgKHRyYW5zZm9ybVJlc3VsdCkge1xuXHQgICAgXHQvLyBJZiB0cmFuc2Zvcm0gcmV0dXJucyBhIHZhbHVlLCB1c2UgdGhhdCBpbnN0ZWFkIG9mIHRoZSBvcmlnaW5hbCBjc3MuXG5cdCAgICBcdC8vIFRoaXMgYWxsb3dzIHJ1bm5pbmcgcnVudGltZSB0cmFuc2Zvcm1hdGlvbnMgb24gdGhlIGNzcy5cblx0ICAgIFx0b2JqLmNzcyA9IHRyYW5zZm9ybVJlc3VsdDtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICBcdC8vIElmIHRoZSB0cmFuc2Zvcm0gZnVuY3Rpb24gcmV0dXJucyBhIGZhbHN5IHZhbHVlLCBkb24ndCBhZGQgdGhpcyBjc3MuIFxuXHQgICAgXHQvLyBUaGlzIGFsbG93cyBjb25kaXRpb25hbCBsb2FkaW5nIG9mIGNzc1xuXHQgICAgXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdCAgICBcdFx0Ly8gbm9vcFxuXHQgICAgXHR9O1xuXHQgICAgfVxuXHR9XG5cblx0aWYgKG9wdGlvbnMuc2luZ2xldG9uKSB7XG5cdFx0dmFyIHN0eWxlSW5kZXggPSBzaW5nbGV0b25Db3VudGVyKys7XG5cdFx0c3R5bGVFbGVtZW50ID0gc2luZ2xldG9uRWxlbWVudCB8fCAoc2luZ2xldG9uRWxlbWVudCA9IGNyZWF0ZVN0eWxlRWxlbWVudChvcHRpb25zKSk7XG5cdFx0dXBkYXRlID0gYXBwbHlUb1NpbmdsZXRvblRhZy5iaW5kKG51bGwsIHN0eWxlRWxlbWVudCwgc3R5bGVJbmRleCwgZmFsc2UpO1xuXHRcdHJlbW92ZSA9IGFwcGx5VG9TaW5nbGV0b25UYWcuYmluZChudWxsLCBzdHlsZUVsZW1lbnQsIHN0eWxlSW5kZXgsIHRydWUpO1xuXHR9IGVsc2UgaWYob2JqLnNvdXJjZU1hcCAmJlxuXHRcdHR5cGVvZiBVUkwgPT09IFwiZnVuY3Rpb25cIiAmJlxuXHRcdHR5cGVvZiBVUkwuY3JlYXRlT2JqZWN0VVJMID09PSBcImZ1bmN0aW9uXCIgJiZcblx0XHR0eXBlb2YgVVJMLnJldm9rZU9iamVjdFVSTCA9PT0gXCJmdW5jdGlvblwiICYmXG5cdFx0dHlwZW9mIEJsb2IgPT09IFwiZnVuY3Rpb25cIiAmJlxuXHRcdHR5cGVvZiBidG9hID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRzdHlsZUVsZW1lbnQgPSBjcmVhdGVMaW5rRWxlbWVudChvcHRpb25zKTtcblx0XHR1cGRhdGUgPSB1cGRhdGVMaW5rLmJpbmQobnVsbCwgc3R5bGVFbGVtZW50LCBvcHRpb25zKTtcblx0XHRyZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpO1xuXHRcdFx0aWYoc3R5bGVFbGVtZW50LmhyZWYpXG5cdFx0XHRcdFVSTC5yZXZva2VPYmplY3RVUkwoc3R5bGVFbGVtZW50LmhyZWYpO1xuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0c3R5bGVFbGVtZW50ID0gY3JlYXRlU3R5bGVFbGVtZW50KG9wdGlvbnMpO1xuXHRcdHVwZGF0ZSA9IGFwcGx5VG9UYWcuYmluZChudWxsLCBzdHlsZUVsZW1lbnQpO1xuXHRcdHJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCk7XG5cdFx0fTtcblx0fVxuXG5cdHVwZGF0ZShvYmopO1xuXG5cdHJldHVybiBmdW5jdGlvbiB1cGRhdGVTdHlsZShuZXdPYmopIHtcblx0XHRpZihuZXdPYmopIHtcblx0XHRcdGlmKG5ld09iai5jc3MgPT09IG9iai5jc3MgJiYgbmV3T2JqLm1lZGlhID09PSBvYmoubWVkaWEgJiYgbmV3T2JqLnNvdXJjZU1hcCA9PT0gb2JqLnNvdXJjZU1hcClcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0dXBkYXRlKG9iaiA9IG5ld09iaik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlbW92ZSgpO1xuXHRcdH1cblx0fTtcbn1cblxudmFyIHJlcGxhY2VUZXh0ID0gKGZ1bmN0aW9uICgpIHtcblx0dmFyIHRleHRTdG9yZSA9IFtdO1xuXG5cdHJldHVybiBmdW5jdGlvbiAoaW5kZXgsIHJlcGxhY2VtZW50KSB7XG5cdFx0dGV4dFN0b3JlW2luZGV4XSA9IHJlcGxhY2VtZW50O1xuXHRcdHJldHVybiB0ZXh0U3RvcmUuZmlsdGVyKEJvb2xlYW4pLmpvaW4oJ1xcbicpO1xuXHR9O1xufSkoKTtcblxuZnVuY3Rpb24gYXBwbHlUb1NpbmdsZXRvblRhZyhzdHlsZUVsZW1lbnQsIGluZGV4LCByZW1vdmUsIG9iaikge1xuXHR2YXIgY3NzID0gcmVtb3ZlID8gXCJcIiA6IG9iai5jc3M7XG5cblx0aWYgKHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0KSB7XG5cdFx0c3R5bGVFbGVtZW50LnN0eWxlU2hlZXQuY3NzVGV4dCA9IHJlcGxhY2VUZXh0KGluZGV4LCBjc3MpO1xuXHR9IGVsc2Uge1xuXHRcdHZhciBjc3NOb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKTtcblx0XHR2YXIgY2hpbGROb2RlcyA9IHN0eWxlRWxlbWVudC5jaGlsZE5vZGVzO1xuXHRcdGlmIChjaGlsZE5vZGVzW2luZGV4XSkgc3R5bGVFbGVtZW50LnJlbW92ZUNoaWxkKGNoaWxkTm9kZXNbaW5kZXhdKTtcblx0XHRpZiAoY2hpbGROb2Rlcy5sZW5ndGgpIHtcblx0XHRcdHN0eWxlRWxlbWVudC5pbnNlcnRCZWZvcmUoY3NzTm9kZSwgY2hpbGROb2Rlc1tpbmRleF0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzdHlsZUVsZW1lbnQuYXBwZW5kQ2hpbGQoY3NzTm9kZSk7XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGFwcGx5VG9UYWcoc3R5bGVFbGVtZW50LCBvYmopIHtcblx0dmFyIGNzcyA9IG9iai5jc3M7XG5cdHZhciBtZWRpYSA9IG9iai5tZWRpYTtcblxuXHRpZihtZWRpYSkge1xuXHRcdHN0eWxlRWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJtZWRpYVwiLCBtZWRpYSlcblx0fVxuXG5cdGlmKHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0KSB7XG5cdFx0c3R5bGVFbGVtZW50LnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcblx0fSBlbHNlIHtcblx0XHR3aGlsZShzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCkge1xuXHRcdFx0c3R5bGVFbGVtZW50LnJlbW92ZUNoaWxkKHN0eWxlRWxlbWVudC5maXJzdENoaWxkKTtcblx0XHR9XG5cdFx0c3R5bGVFbGVtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUxpbmsobGlua0VsZW1lbnQsIG9wdGlvbnMsIG9iaikge1xuXHR2YXIgY3NzID0gb2JqLmNzcztcblx0dmFyIHNvdXJjZU1hcCA9IG9iai5zb3VyY2VNYXA7XG5cblx0LyogSWYgY29udmVydFRvQWJzb2x1dGVVcmxzIGlzbid0IGRlZmluZWQsIGJ1dCBzb3VyY2VtYXBzIGFyZSBlbmFibGVkXG5cdGFuZCB0aGVyZSBpcyBubyBwdWJsaWNQYXRoIGRlZmluZWQgdGhlbiBsZXRzIHR1cm4gY29udmVydFRvQWJzb2x1dGVVcmxzXG5cdG9uIGJ5IGRlZmF1bHQuICBPdGhlcndpc2UgZGVmYXVsdCB0byB0aGUgY29udmVydFRvQWJzb2x1dGVVcmxzIG9wdGlvblxuXHRkaXJlY3RseVxuXHQqL1xuXHR2YXIgYXV0b0ZpeFVybHMgPSBvcHRpb25zLmNvbnZlcnRUb0Fic29sdXRlVXJscyA9PT0gdW5kZWZpbmVkICYmIHNvdXJjZU1hcDtcblxuXHRpZiAob3B0aW9ucy5jb252ZXJ0VG9BYnNvbHV0ZVVybHMgfHwgYXV0b0ZpeFVybHMpe1xuXHRcdGNzcyA9IGZpeFVybHMoY3NzKTtcblx0fVxuXG5cdGlmKHNvdXJjZU1hcCkge1xuXHRcdC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI2NjAzODc1XG5cdFx0Y3NzICs9IFwiXFxuLyojIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxcIiArIGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHNvdXJjZU1hcCkpKSkgKyBcIiAqL1wiO1xuXHR9XG5cblx0dmFyIGJsb2IgPSBuZXcgQmxvYihbY3NzXSwgeyB0eXBlOiBcInRleHQvY3NzXCIgfSk7XG5cblx0dmFyIG9sZFNyYyA9IGxpbmtFbGVtZW50LmhyZWY7XG5cblx0bGlua0VsZW1lbnQuaHJlZiA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cblx0aWYob2xkU3JjKVxuXHRcdFVSTC5yZXZva2VPYmplY3RVUkwob2xkU3JjKTtcbn1cblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9zdHlsZS1sb2FkZXIvYWRkU3R5bGVzLmpzXG4vLyBtb2R1bGUgaWQgPSA0NTdcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiaW1wb3J0IHsgb2JzZXJ2ZXIgfSBmcm9tIFwibW9ieC1yZWFjdFwiO1xuaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IGtleWRvd24gZnJvbSBcInJlYWN0LWtleWRvd25cIjtcbmltcG9ydCB7IEJ1dHRvbiwgRHJvcGRvd24sIEdyaWQsIE1lbnUsIFNlZ21lbnQsIFRleHRBcmVhIH0gZnJvbSAnc2VtYW50aWMtdWktcmVhY3QnXG5cbmltcG9ydCBFeGFtcGxlU3RvcmUgZnJvbSBcIi4vRXhhbXBsZVN0b3JlXCI7XG5pbXBvcnQgU3BhY2VyIGZyb20gXCIuL1NwYWNlci5qc3hcIjtcbmltcG9ydCBcIi4vc3R5bGVzLmxlc3NcIjtcbmltcG9ydCBUYWJiYWJsZVRleHRBcmVhIGZyb20gXCIuL1RhYmJhYmxlVGV4dEFyZWEuanN4XCI7XG5cbkBvYnNlcnZlclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3BlbGxFZGl0b3IgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRzdGF0aWMgZGVmYXVsdFByb3BzID0ge1xuXHRcdGV4YW1wbGVzOiBuZXcgRXhhbXBsZVN0b3JlKClcblx0fTtcblxuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKTtcbndpbmRvdy5leGFtcGxlcyA9IHByb3BzLmV4YW1wbGVzO1xuXHRcdHRoaXMucHJvcHMuZXhhbXBsZXMubG9hZCgpO1xuXG5cdFx0Ly9ERUJVR1xuXHRcdHdpbmRvdy5zcGVsbEVkaXRvciA9IHRoaXM7XG5cdFx0d2luZG93LmV4YW1wbGVzID0gdGhpcy5wcm9wcy5leGFtcGxlcztcblx0fVxuXG5cdEBrZXlkb3duKFwiY3RybCtzXCIpXG5cdHNhdmUoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMuc2F2ZSgpOyB9XG5cblx0QGtleWRvd24oXCJjdHJsK3JcIilcblx0cmV2ZXJ0KCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLnJldmVydCgpOyB9XG5cblx0QGtleWRvd24oXCJjdHJsK2NcIilcblx0Y29tcGlsZSgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5jb21waWxlKCk7IH1cblxuXHRAa2V5ZG93bihcImN0cmwrblwiKVxuXHRjcmVhdGUoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMuY3JlYXRlKCk7IH1cblxuXHRAa2V5ZG93bihcImN0cmwrZFwiKVxuXHRkZWxldGUoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMuZGVsZXRlKHVuZGVmaW5lZCwgXCJDT05GSVJNXCIpOyB9XG5cblx0cmVuYW1lKCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLnJlbmFtZSgpOyB9XG5cdGR1cGxpY2F0ZSgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5kdXBsaWNhdGUoKTsgfVxuXHRsb2FkKCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLmxvYWQoKTsgfVxuXHRyZXNldCgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5yZXNldCgpOyB9XG5cblxuXHRyZW5kZXIoKSB7XG5cdFx0bGV0IHsgZXhhbXBsZXMgfSA9IHRoaXMucHJvcHM7XG5cdFx0bGV0IHsgdGl0bGVzLCBzZWxlY3RlZCwgZGlydHksIGNvZGUsIG91dHB1dCB9ID0gZXhhbXBsZXM7XG5cblx0XHQvLyBDcmVhdGUgbWVudWl0ZW1zIGZyb20gdGhlIGV4YW1wbGVzXG5cdFx0bGV0IG9wdGlvbnMgPSB0aXRsZXMubWFwKCB0aXRsZSA9PlxuXHRcdFx0KHtcblx0XHRcdFx0dmFsdWU6IHRpdGxlLFxuXHRcdFx0XHR0aXRsZTogdGl0bGUsXG5cdFx0XHRcdHRleHQ6IHRpdGxlLFxuXHRcdFx0XHRjb250ZW50OiB0aXRsZSxcblx0XHRcdFx0b25DbGljazogKCkgPT4gZXhhbXBsZXMuc2VsZWN0KHRpdGxlKVxuXHRcdFx0fSkpO1xuXG5cdFx0bGV0IGRpcnR5QnV0dG9ucyA9ICgpID0+IHtcblx0XHRcdGlmICghZGlydHkpIHJldHVybjtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxNZW51IHNlY29uZGFyeSBzdHlsZT17eyBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLCByaWdodDogXCIxcmVtXCIsIHRvcDogXCIzcHhcIiwgbWFyZ2luOiAwIH19PlxuXHRcdFx0XHRcdDxCdXR0b24gbmVnYXRpdmUgb25DbGljaz17KCkgPT4gdGhpcy5yZXZlcnQoKX0+PHU+UjwvdT5ldmVydDwvQnV0dG9uPlxuXHRcdFx0XHRcdDxCdXR0b24gcG9zaXRpdmUgb25DbGljaz17KCkgPT4gdGhpcy5zYXZlKCl9Pjx1PlM8L3U+YXZlPC9CdXR0b24+XG5cdFx0XHRcdDwvTWVudT5cblx0XHRcdCk7XG5cdFx0fTtcblxuXHRcdGxldCBjb21waWxlQnV0dG9uID0gKCkgPT4ge1xuXHRcdFx0aWYgKG91dHB1dCkgcmV0dXJuO1xuXHRcdFx0cmV0dXJuIDxCdXR0b25cblx0XHRcdFx0XHRzdHlsZT17eyBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLCAgd2lkdGg6IFwiNGVtXCIsIGxlZnQ6IFwiY2FsYyg1MCUgLSAyZW0pXCIsIHRvcDogXCI1MCVcIiB9fVxuXHRcdFx0XHRcdG9uQ2xpY2s9eygpID0+IHRoaXMuY29tcGlsZSgpfVxuXHRcdFx0XHRcdGljb249XCJyaWdodCBjaGV2cm9uXCIvPjtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIChcblx0XHQ8R3JpZCBzdHJldGNoZWQgcGFkZGVkIGNsYXNzTmFtZT1cImZ1bGxIZWlnaHRcIj5cblx0XHRcdDxHcmlkLlJvdyBzdHlsZT17eyBoZWlnaHQ6IFwiMnJlbVwiLCBwYWRkaW5nVG9wOiBcIjByZW1cIiB9fSBjbGFzc05hbWU9XCJ1aSBpbnZlcnRlZCBhdHRhY2hlZCBtZW51XCI+XG5cdFx0XHRcdDxHcmlkLkNvbHVtbiB3aWR0aD17N30+XG5cdFx0XHRcdFx0PE1lbnUgaW52ZXJ0ZWQgYXR0YWNoZWQgZmx1aWQ+XG5cdFx0XHRcdFx0XHQ8TWVudS5JdGVtPkV4YW1wbGU6PC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0XHQ8RHJvcGRvd24gaXRlbSBzZWxlY3Rpb24gb3B0aW9ucz17b3B0aW9uc30gdmFsdWU9e3NlbGVjdGVkfSBzdHlsZT17eyB3aWR0aDogXCIyMGVtXCIgfX0vPlxuXHRcdFx0XHRcdFx0PE1lbnUuSXRlbSBvbkNsaWNrPXsoKSA9PiB0aGlzLmRlbGV0ZSgpfT48dT5EPC91PmVsZXRlPC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0XHQ8TWVudS5JdGVtIG9uQ2xpY2s9eygpID0+IHRoaXMucmVuYW1lKCl9PlJlbmFtZTwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdFx0PE1lbnUuSXRlbSBvbkNsaWNrPXsoKSA9PiB0aGlzLmR1cGxpY2F0ZSgpfT5EdXBsaWNhdGU8L01lbnUuSXRlbT5cblx0XHRcdFx0XHQ8L01lbnU+XG5cdFx0XHRcdDwvR3JpZC5Db2x1bW4+XG5cdFx0XHRcdDxHcmlkLkNvbHVtbiB3aWR0aD17Mn0+XG5cdFx0XHRcdFx0PE1lbnUgaW52ZXJ0ZWQgYXR0YWNoZWQgZmx1aWQ+XG5cdFx0XHRcdFx0XHQ8U3BhY2VyIGZsdWlkLz5cblx0XHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gdGhpcy5jcmVhdGUoKX0+PHU+TjwvdT5ldzwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdFx0PFNwYWNlciBmbHVpZC8+XG5cdFx0XHRcdFx0PC9NZW51PlxuXHRcdFx0XHQ8L0dyaWQuQ29sdW1uPlxuXHRcdFx0XHQ8R3JpZC5Db2x1bW4gd2lkdGg9ezd9PlxuXHRcdFx0XHRcdDxNZW51IGludmVydGVkIGF0dGFjaGVkIGZsdWlkPlxuXHRcdFx0XHRcdFx0PFNwYWNlciBmbHVpZC8+XG5cdFx0XHRcdFx0XHQ8TWVudS5JdGVtIG9uQ2xpY2s9eygpID0+IHRoaXMubG9hZCgpfT5SZWxvYWQ8L01lbnUuSXRlbT5cblx0XHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gdGhpcy5yZXNldCgpfT5SZXNldDwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdDwvTWVudT5cblx0XHRcdFx0PC9HcmlkLkNvbHVtbj5cblx0XHRcdDwvR3JpZC5Sb3c+XG5cdFx0XHQ8R3JpZC5Sb3cgc3R5bGU9e3sgaGVpZ2h0OiBcImNhbGMoMTAwJSAtIDNyZW0pXCIgfX0+XG5cdFx0XHRcdDxHcmlkLkNvbHVtbiB3aWR0aD17OH0+XG5cdFx0XHRcdFx0PFRhYmJhYmxlVGV4dEFyZWFcblx0XHRcdFx0XHRcdGNsYXNzTmFtZT1cInVpIHNlZ21lbnRcIlxuXHRcdFx0XHRcdFx0dmFsdWU9e2NvZGV9XG5cdFx0XHRcdFx0XHRvbkNoYW5nZT17KGV2ZW50KSA9PiBleGFtcGxlcy51cGRhdGUoZXhhbXBsZXMuc2VsZWN0ZWQsIGV2ZW50LnRhcmdldC52YWx1ZSwgXCJTS0lQX1NBVkVcIil9XG5cdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHR7ZGlydHlCdXR0b25zKCl9XG5cdFx0XHRcdDwvR3JpZC5Db2x1bW4+XG5cdFx0XHRcdDxHcmlkLkNvbHVtbiB3aWR0aD17OH0+XG5cdFx0XHRcdFx0PFRleHRBcmVhIGNsYXNzTmFtZT1cInVpIHNlZ21lbnRcIiB2YWx1ZT17b3V0cHV0fS8+XG5cdFx0XHRcdDwvR3JpZC5Db2x1bW4+XG5cdFx0XHRcdHtjb21waWxlQnV0dG9uKCl9XG5cdFx0XHQ8L0dyaWQuUm93PlxuXHRcdDwvR3JpZD5cblx0KTt9XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvYXBwL1NwZWxsRWRpdG9yLmpzeCIsImV4cG9ydCBUb2tlbml6ZXIgZnJvbSBcIi4vVG9rZW5pemVyLmpzXCI7XG5leHBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuZXhwb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuaW1wb3J0IFwiLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL3J1bGVzL2FsbC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0T2JqZWN0LmFzc2lnbih3aW5kb3csIHtcblx0XHRUb2tlbml6ZXI6IGV4cG9ydHMuVG9rZW5pemVyLFxuXHRcdHRva2VuaXplOiBleHBvcnRzLlRva2VuaXplci50b2tlbml6ZS5iaW5kKGV4cG9ydHMuVG9rZW5pemVyKSxcblxuXHRcdFJ1bGU6IGV4cG9ydHMuUnVsZSxcblxuXHRcdFBhcnNlcjogZXhwb3J0cy5QYXJzZXIsXG5cdFx0cGFyc2VyOiBwYXJzZXIsXG5cdFx0cGFyc2U6IHBhcnNlci5wYXJzZS5iaW5kKHBhcnNlciksXG5cdFx0Y29tcGlsZTogcGFyc2VyLmNvbXBpbGUuYmluZChwYXJzZXIpLFxuXHR9KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIiwiLyogU3RvcmUgb2YgZXhhbXBsZSBzcGVsbCBjb2RlIGZyYWdtZW50cy4gKi9cbmltcG9ydCBtb2J4LCB7IG9ic2VydmFibGUsIGNvbXB1dGVkIH0gZnJvbSBcIm1vYnhcIjtcblxuLy8gTWFrZSBQYXJzZXIgYW5kIFRva2VuaXplciBXQVJOIGFzIHdlIHJ1blxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5QYXJzZXIuV0FSTiA9IHRydWU7XG5QYXJzZXIuREVCVUcgPSB0cnVlO1xuUGFyc2VyLlRJTUUgPSB0cnVlO1xuXG5pbXBvcnQgVG9rZW5pemVyIGZyb20gXCIuLi9Ub2tlbml6ZXJcIjtcblRva2VuaXplci5XQVJOID0gdHJ1ZTtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFeGFtcGxlU3RvcmUge1xuXHQvLyBDVVJSRU5UIGV4YW1wbGVzXG5cdEBvYnNlcnZhYmxlIGV4YW1wbGVzID0ge307XG5cdC8vIEV4YW1wbGVzIGFzIG9mIGxhc3Qgc2F2ZSAoZm9yIHJldmVyKVxuXHRAb2JzZXJ2YWJsZSBfc2F2ZWRFeGFtcGxlcyA9IHt9O1xuXHQvLyBTZWxlY3RlZCBleGFtcGxlIGtleS5cblx0QG9ic2VydmFibGUgc2VsZWN0ZWQgPSBcIlwiO1xuXHQvLyBDb21waWxlZCBvdXRwdXQuXG5cdEBvYnNlcnZhYmxlIG91dHB1dCA9IFwiXCI7XG5cblx0Ly8gUmV0dXJuIGp1c3QgdGhlIHRpdGxlcyBvZiB0aGUgZXhhbXBsZXMuXG5cdEBjb21wdXRlZCBnZXQgdGl0bGVzKCkge1xuXHRcdHJldHVybiBPYmplY3Qua2V5cyh0aGlzLmV4YW1wbGVzKTtcblx0fVxuXG5cdC8vIFJldHVybiB0aGUgY29kZSBmb3IgdGhlIGN1cnJlbnQgZXhhbXBsZVxuXHRAY29tcHV0ZWQgZ2V0IGNvZGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXhhbXBsZXNbdGhpcy5zZWxlY3RlZF07XG5cdH1cblxuXHQvLyBJcyBBTllUSElORyBkaXJ0eT9cblx0QGNvbXB1dGVkIGdldCBkaXJ0eSgpIHtcblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5fc2F2ZWRFeGFtcGxlcykgIT09IEpTT04uc3RyaW5naWZ5KHRoaXMuZXhhbXBsZXMpO1xuXHR9XG5cblx0Ly8gUmVzZXQgYWxsIGV4YW1wbGVzIGZyb20gbG9jYWxTdG9yYWdlLlxuXHRyZXNldCgpIHtcblx0XHRkZWxldGUgbG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZXM7XG5cdFx0ZGVsZXRlIGxvY2FsU3RvcmFnZS5zcGVsbEVkaXRvckV4YW1wbGU7XG5cdFx0d2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuXHR9XG5cblx0Ly8gTG9hZCBleGFtcGxlc1xuXHRsb2FkKCkge1xuXHRcdC8vIExvYWQgZXhhbXBsZXMgZnJvbSBsb2NhbFN0b3JhZ2Vcblx0XHR0aGlzLmV4YW1wbGVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2Uuc3BlbGxFZGl0b3JFeGFtcGxlc1xuXHRcdFx0fHwgJ3tcIkZvb1wiOlwiZGVmaW5lIHR5cGUgRm9vXCIsIFwiQmFyXCI6XCJkZWZpbmUgdHlwZSBCYXJcIn0nKTtcblxuXHRcdC8vIFNhdmUgYSBjb3B5IG9mIGV4YW1wbGVzIGZvciByZXZlcnRcblx0XHR0aGlzLl9zYXZlZEV4YW1wbGVzID0gdGhpcy5leGFtcGxlcztcblxuXHRcdC8vIExvYWQgc2VsZWN0ZWQgZXhhbXBsZSBuYW1lXG5cdFx0dGhpcy5zZWxlY3QobG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZSk7XG5cdH1cblxuXHQvLyBTYXZlIGN1cnJlbnQgZXhhbXBsZXMuXG5cdHNhdmUoKSB7XG5cdFx0bG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZXMgPSBKU09OLnN0cmluZ2lmeSh0aGlzLmV4YW1wbGVzKTtcblxuXHRcdC8vIFNhdmUgYSBjb3B5IG9mIGV4YW1wbGVzIGZvciByZXZlcnRcblx0XHR0aGlzLl9zYXZlZEV4YW1wbGVzID0gdGhpcy5leGFtcGxlcztcblx0fVxuXG5cdC8vIFJldmVydCB0aGUgY3VycmVudCBleGFtcGxlXG5cdHJldmVydChleGFtcGxlID0gdGhpcy5zZWxlY3RlZCkge1xuXHRcdHRoaXMudXBkYXRlKGV4YW1wbGUsIHRoaXMuX3NhdmVkRXhhbXBsZXNbZXhhbXBsZV0pO1xuXHR9XG5cblx0Ly8gU2VsZWN0IGEgZGlmZmVyZW50IGV4YW1wbGUuXG5cdHNlbGVjdChleGFtcGxlKSB7XG5cdFx0aWYgKCFleGFtcGxlIHx8IHRoaXMuZXhhbXBsZXNbZXhhbXBsZV0gPT0gbnVsbCkgZXhhbXBsZSA9IE9iamVjdC5rZXlzKHRoaXMuZXhhbXBsZXMpWzBdIHx8IFwiXCI7XG5cdFx0dGhpcy5zZWxlY3RlZCA9IGxvY2FsU3RvcmFnZS5zcGVsbEVkaXRvckV4YW1wbGUgPSBleGFtcGxlO1xuXHRcdHRoaXMub3V0cHV0ID0gXCJcIjtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyBleGFtcGxlLlxuXHQvLyBTYXZlcyBhbmQgc2VsZWN0cyB0aGUgZXhhbXBsZSBhdXRvbWF0aWNhbGx5LlxuXHR1cGRhdGUobmFtZSwgY29kZSwgc2tpcFNhdmUpIHtcblx0XHR0aGlzLmV4YW1wbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5leGFtcGxlcywgeyBbIG5hbWUgXTogY29kZSB9KTtcblx0XHR0aGlzLnNlbGVjdChuYW1lKTtcblx0XHR0aGlzLm91dHB1dCA9IFwiXCI7XG5cdFx0aWYgKCFza2lwU2F2ZSkgdGhpcy5zYXZlKCk7XG5cdH1cblxuXHQvLyBEZWxldGUgYW4gZXhhbXBsZS5cblx0Ly8gU2F2ZXMgYW5kIHNlbGVjdHMgYW5vdGhlciBleGFtcGxlIGF1dG9tYXRpY2FsbHkuXG5cdGRlbGV0ZShuYW1lID0gdGhpcy5zZWxlY3RlZCwgc2hvd0NvbmZpcm0pIHtcblx0XHRpZiAoc2hvd0NvbmZpcm0gJiYgIWNvbmZpcm0oYFJlYWxseSBkZWxldGUgZXhhbXBsZSAke25hbWV9P2ApKSByZXR1cm47XG5cdFx0bGV0IGV4YW1wbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5leGFtcGxlcyk7XG5cdFx0ZGVsZXRlIGV4YW1wbGVzW25hbWVdO1xuXHRcdHRoaXMuZXhhbXBsZXMgPSBleGFtcGxlcztcblx0XHR0aGlzLnNhdmUoKTtcblx0XHR0aGlzLnNlbGVjdCgpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgbmV3IGV4YW1wbGUuXG5cdGNyZWF0ZShuYW1lLCBjb2RlID0gXCJcIikge1xuXHRcdC8vIElmIG5vIG5hbWUsIHByb21wdC5cblx0XHRpZiAoIW5hbWUpIG5hbWUgPSBwcm9tcHQoXCJOYW1lIGZvciB0aGlzIGV4YW1wbGU/XCIpO1xuXHRcdC8vIEZvcmdldCBpdCBpZiBubyBuYW1lLlxuXHRcdGlmICghbmFtZSkgcmV0dXJuO1xuXG5cdFx0dGhpcy51cGRhdGUobmFtZSwgY29kZSk7XG5cdH1cblxuXHQvLyBSZW5hbWUgYW4gZXhhbXBsZS5cblx0Ly8gU2VsZWN0cyBhbmQgc2F2ZXMgYXV0b21hdGljYWxseS5cblx0cmVuYW1lKG9sZE5hbWUgPSB0aGlzLnNlbGVjdGVkLCBuZXdOYW1lKSB7XG5cdFx0Ly8gSWYgbm8gbmV3IG5hbWUsIHByb21wdC5cblx0XHRpZiAoIW5ld05hbWUpIG5ld05hbWUgPSBwcm9tcHQoXCJOZXcgbmFtZSBmb3IgdGhpcyBleGFtcGxlP1wiLCBvbGROYW1lKTtcblxuXHRcdC8vIEZvcmdldCBpdCBpZiBubyBuYW1lIHN1cHBsaWVkIG9yIG5hbWUgaXMgdGhlIHNhbWVcblx0XHRpZiAoIW5ld05hbWUgfHwgbmV3TmFtZSA9PT0gb2xkTmFtZSkgcmV0dXJuO1xuXHRcdGlmICh0aGlzLmV4YW1wbGVzW25ld05hbWVdKSByZXR1cm4gY29uc29sZS53YXJuKGBleGFtcGxlcy5yZW5hbWUoXCIke25ld05hbWV9XCIpOiBuYW1lIGFscmVhZHkgaW4gdXNlYCk7XG5cblx0XHRsZXQgY29kZSA9IHRoaXMuZXhhbXBsZXNbb2xkTmFtZV07XG5cdFx0dGhpcy5kZWxldGUob2xkTmFtZSk7XG5cdFx0dGhpcy51cGRhdGUobmV3TmFtZSwgY29kZSk7XG5cdH1cblxuXHQvLyBEdXBsaWNhdGUgYW4gZXhhbXBsZS5cblx0ZHVwbGljYXRlKG9sZE5hbWUgPSB0aGlzLnNlbGVjdGVkLCBuZXdOYW1lKSB7XG5cdFx0Ly8gSWYgbm8gbmV3IG5hbWUsIHByb21wdC5cblx0XHRpZiAoIW5ld05hbWUpIG5ld05hbWUgPSBwcm9tcHQoXCJOZXcgbmFtZSBmb3IgZHVwbGljYXRlIGV4YW1wbGU/XCIsIG9sZE5hbWUpO1xuXHRcdC8vIEZvcmdldCBpdCBpZiBubyBuYW1lIHN1cHBsaWVkIG9yIG5hbWUgaXMgdGhlIHNhbWVcblx0XHRpZiAoIW5ld05hbWUgfHwgbmV3TmFtZSA9PT0gb2xkTmFtZSkgcmV0dXJuO1xuXHRcdGlmICh0aGlzLmV4YW1wbGVzW25ld05hbWVdKSByZXR1cm4gY29uc29sZS53YXJuKGBleGFtcGxlcy5yZW5hbWUoXCIke25ld05hbWV9XCIpOiBuYW1lIGFscmVhZHkgaW4gdXNlYCk7XG5cblx0XHR0aGlzLnVwZGF0ZShuZXdOYW1lLCB0aGlzLmNvZGUpO1xuXHR9XG5cblx0Ly8gQ29tcGlsZSB0aGUgY3VycmVudCBleGFtcGxlLCBwbGFjaW5nIGl0IGluIG91ciBgb3V0cHV0YC5cbi8vVE9ETzogc29tZSB3YXkgdG8gZG8gdGhpcyBhdXRvbWF0aWNhbGx5IHcvIFwib3V0cHV0XCIgP1xuXHRjb21waWxlKCkge1xuXHRcdHRoaXMub3V0cHV0ID0gXCIuLi5jb21waWxpbmcuLi5cIjtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdGxldCByZXN1bHQgPSBwYXJzZXIucGFyc2UoXCJzdGF0ZW1lbnRzXCIsIHRoaXMuY29kZSk7XG5cdFx0XHRpZiAoIXJlc3VsdCkge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJDYW4ndCBwYXJzZSFcIik7XG5cdFx0XHRcdHRoaXMub3V0cHV0ID0gXCJDYW4ndCBwYXJzZSBzdGF0ZW1lbnRzXCI7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc29sZS5pbmZvKFwiUmVzdWx0XCIsIHJlc3VsdCk7XG5cdFx0XHRcdHRoaXMub3V0cHV0ID0gcmVzdWx0LnRvU291cmNlKHBhcnNlcik7XG5cdFx0XHR9XG5cdFx0fSwgMTAwKTtcblx0fVxuXG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvYXBwL0V4YW1wbGVTdG9yZS5qcyIsIi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy9cbi8vICA8U3BhY2VyPiBjb21wb25lbnQgZm9yIHVzZSB3aXRoIG9hay5cbi8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IFByb3BUeXBlcyBmcm9tIFwicHJvcC10eXBlc1wiO1xuaW1wb3J0IHsgY2xhc3NOYW1lcyB9IGZyb20gXCIuL3V0aWxcIjtcblxuaW1wb3J0IFwiLi9TcGFjZXIubGVzc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTcGFjZXIocHJvcHMpIHtcbiAgY29uc3Qge1xuICAgIGNsYXNzTmFtZSxcbiAgICBhcHBlYXJhbmNlLCBzaXplLCB3aWR0aCwgaGVpZ2h0LFxuICAgIGlubGluZSwgZmx1aWQsIHRpbnksIHNtYWxsLCBtZWRpdW0sIGxhcmdlLCBodWdlLCBtYXNzaXZlXG4gIH0gPSBwcm9wcztcblxuICBjb25zdCBzcGFjZXJQcm9wcyA9IHtcbiAgICBjbGFzc05hbWU6IGNsYXNzTmFtZXMoY2xhc3NOYW1lLCBcIm9ha1wiLCBzaXplLCBhcHBlYXJhbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7IGlubGluZSwgZmx1aWQgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzcGFjZXJcIiksXG4gICAgc3R5bGU6IHtcbiAgICAgIHdpZHRoLFxuICAgICAgaGVpZ2h0LFxuICAgIH1cbiAgfVxuXG4gIHJldHVybiA8ZGl2IHsuLi5zcGFjZXJQcm9wc30vPjtcbn1cblxuU3BhY2VyLnByb3BUeXBlcyA9IHtcbiAgY2xhc3NOYW1lOiBQcm9wVHlwZXMuc3RyaW5nLFxuICBhcHBlYXJhbmNlOiBQcm9wVHlwZXMuc3RyaW5nLFxuICBzaXplOiBQcm9wVHlwZXMuc3RyaW5nLFxuICB3aWR0aDogUHJvcFR5cGVzLm51bWJlcixcbiAgaGVpZ2h0OiBQcm9wVHlwZXMubnVtYmVyLFxuXG4gIGlubGluZTogUHJvcFR5cGVzLmJvb2wsXG4gIGZsdWlkOiBQcm9wVHlwZXMuYm9vbCxcblxufTtcblxuU3BhY2VyLmRlZmF1bHRQcm9wcyA9IHtcbiAgc2l6ZTogXCJtZWRpdW1cIlxufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2FwcC9TcGFjZXIuanN4IiwiaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHByb3BUeXBlcyBmcm9tIFwicHJvcC10eXBlc1wiO1xuaW1wb3J0IHsgVGV4dEFyZWEgfSBmcm9tICdzZW1hbnRpYy11aS1yZWFjdCdcblxuLy9cbi8vXHQjIDxUYWJiYWJsZVRleHRBcmVhPiAtLSA8U1VJLlRleHRBcmVhPiBpbiB3aGljaCB5b3UgY2FuIHR5cGUgYSB0YWIgY2hhcmFjdGVyOlxuLy9cdC0gSWYgbm90aGluZyBpcyBzZWxlY3RlZCwgaW5zZXJ0cyBhIHRhYiBjaGFyYWN0ZXJcbi8vXHQtIElmIGFueXRoaW5nIGlzIHNlbGVjdGVkLCBpbnNlcnRzIHRhYiBjaGFyYWN0ZXJzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpbmUocylcbi8vXHQtIElmIHNoaWZ0IGtleSBpcyBkb3duLCBpbnNlcnRzIHRhYiBjaGFyYWN0ZXJzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpbmUocykuXG4vL1xuLy9cdCMjIyBQcm9wZXJ0aWVzXG4vL1x0LSBgc2F2ZWAgKHJlcXVpcmVkKSAtLSBmdW5jdGlvbiB1c2VkIHRvIHNhdmUgdGhlIHJlc3VsdHMgb24ga2V5cHJlc3Ncbi8vXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUYWJiYWJsZVRleHRBcmVhIGV4dGVuZHMgVGV4dEFyZWEge1xuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIDxUZXh0QXJlYSB7Li4udGhpcy5wcm9wc30gb25LZXlEb3duPXt0aGlzLm9uS2V5RG93bn0gLz47XG5cdH1cblxuXHQvLyBEbyBOT1QgZXhpdCBvbiB0YWIgLS0gaW5zZXJ0IG9yIHJlbW92ZSB0YWIocykgdmFsdWUgaW5zdGVhZC5cblx0b25LZXlEb3duID0gKGV2ZW50KSA9PiB7XG5cbi8vVE9ETyBmaXJlIGB0aGlzLnByb3BzLm9uS2V5RG93bmAgaWYgZGVmaW5lZC4uLlxuXHRcdC8vIEZvcmdldCBpdCBpZiBub3QgYSB0YWJcblx0XHRpZiAoZXZlbnQua2V5Q29kZSAhPT0gOSkgcmV0dXJuO1xuXG5cdFx0Ly8gcHJldmVudCBkZWZhdWx0IHNvIHdlIGRvbid0IGV4aXQgdGhlIGZpZWxkXG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuXHRcdC8vIGZpZ3VyZSBvdXQgdGhlIHRleHQgcmFuZ2Vcblx0XHR2YXIgZWxlbWVudCA9IGV2ZW50LnRhcmdldDtcblx0XHR2YXIgdGV4dCA9IGVsZW1lbnQudmFsdWU7XG5cdFx0dmFyIHN0YXJ0ID0gZWxlbWVudC5zZWxlY3Rpb25TdGFydDtcblx0XHR2YXIgZW5kID0gZWxlbWVudC5zZWxlY3Rpb25FbmQ7XG5cblx0XHQvLyBSZXBsYWNlbWVudCB0ZXh0XG5cdFx0bGV0IG5ld1RleHQgPSBcIlwiLCBzZWxlY3Rpb25TdGFydCA9IHN0YXJ0LCBzZWxlY3Rpb25FbmQgPSBlbmQ7XG5cblx0XHQvLyBJZiBzZWxlY3Rpb24gaXMgZW1wdHksXG5cdFx0aWYgKHN0YXJ0ID09PSBlbmQgJiYgIWV2ZW50LnNoaWZ0S2V5KSB7XG5cdFx0XHRuZXdUZXh0ID0gXCJcXHRcIjtcblx0XHRcdHNlbGVjdGlvblN0YXJ0ID0gc2VsZWN0aW9uRW5kID0gZW5kICsgMTtcblx0XHR9XG5cdFx0Ly8gb3RoZXJ3aXNlIGluZGVudC9kZS1pbmRlbnQgYWxsIG9mIHRoZSBsaW5lc1xuXHRcdGVsc2Uge1xuXHRcdC8vIHVzZSBzdGFydCBhbmQgZW5kIG9mIGxpbmUocylcbi8vY29uc29sZS5pbmZvKGBzdGFydDogJHtzdGFydH0gOiR7dGV4dFtzdGFydF19OiAgIGVuZDogJHtlbmR9IDogJHt0ZXh0W2VuZF19OmApO1xuXHRcdFx0aWYgKHRleHRbc3RhcnRdICE9PSBcIlxcblwiKSBzdGFydCA9IHRleHQubGFzdEluZGV4T2YoXCJcXG5cIiwgc3RhcnQpICsgMTtcblx0XHRcdGlmICh0ZXh0W2VuZC0xXSA9PT0gXCJcXG5cIikgZW5kLS07XG5cdFx0XHRlbHNlIGlmICh0ZXh0W2VuZCsxXSAhPT0gXCJcXG5cIikgZW5kID0gdGV4dC5pbmRleE9mKFwiXFxuXCIsIGVuZCkgLSAxO1xuLy9jb25zb2xlLmluZm8oYHN0YXJ0OiAke3N0YXJ0fSA6JHt0ZXh0W3N0YXJ0XX06ICAgZW5kOiAke2VuZH0gOiAke3RleHRbZW5kXX06YCk7XG5cblx0XHRcdGxldCBsaW5lcyA9IHRleHQuc2xpY2Uoc3RhcnQsIGVuZCkuc3BsaXQoXCJcXG5cIik7XG5cdFx0XHQvLyBpZiBzaGlmdCBrZXkgaXMgZG93biwgUkVNT1ZFIGEgdGFiIGZyb20gZWFjaCBsaW5lXG5cdFx0XHRpZiAoZXZlbnQuc2hpZnRLZXkpIHtcblx0XHRcdFx0bGluZXMgPSBsaW5lcy5tYXAobGluZSA9PiBsaW5lWzBdID09PSBcIlxcdFwiID8gbGluZS5zdWJzdHIoMSkgOiBsaW5lKTtcblx0XHRcdH1cblx0XHRcdC8vIG90aGVyd2lzZSBBREQgYSB0YWIgdG8gZWFjaCBsaW5lXG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0bGluZXMgPSBsaW5lcy5tYXAobGluZSA9PiBcIlxcdFwiICsgbGluZSk7XG5cdFx0XHR9XG5cdFx0XHRzZWxlY3Rpb25TdGFydCA9IHN0YXJ0O1xuXHRcdFx0bmV3VGV4dCA9IGxpbmVzLmpvaW4oXCJcXG5cIik7XG5cdFx0XHRzZWxlY3Rpb25FbmQgPSBzZWxlY3Rpb25TdGFydCArIG5ld1RleHQubGVuZ3RoICsgMTtcblx0XHR9XG5cblx0XHQvLyBVcGRhdGUgaW5wdXQgdmFsdWUuXG5cdFx0ZWxlbWVudC52YWx1ZSBcdD0gdGV4dC5zdWJzdHIoMCwgc3RhcnQpXG5cdFx0XHRcdFx0XHQrIG5ld1RleHRcblx0XHRcdFx0XHRcdCsgdGV4dC5zdWJzdHIoZW5kKTtcblxuXHRcdC8vIFVwZGF0ZSB0aGUgc2VsZWN0aW9uXG5cdFx0ZWxlbWVudC5zZWxlY3Rpb25TdGFydCA9IHNlbGVjdGlvblN0YXJ0O1xuXHRcdGVsZW1lbnQuc2VsZWN0aW9uRW5kID0gc2VsZWN0aW9uRW5kO1xuXG5cdFx0Ly8gRGVsZWdhdGUgdG8gYHByb3BzLm9uQ2hhbmdlYCB0byBzYXZlIHRoZSB2YWx1ZSBvdXRzaWRlIG9mIHRoZSBjb250cm9sXG5cdFx0aWYgKHRoaXMucHJvcHMub25DaGFuZ2UpIHRoaXMucHJvcHMub25DaGFuZ2UoZXZlbnQpO1xuXHR9XG5cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9hcHAvVGFiYmFibGVUZXh0QXJlYS5qc3giLCIvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBSZWFjdCBVdGlsaXR5IGZ1bmN0aW9uc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8vIGBjbGFzc05hbWVzYCwgY29uY2VwdCBzdG9sZW4gZnJvbTogIGh0dHA6Ly9qZWR3YXRzb24uZ2l0aHViLmlvL2NsYXNzbmFtZXNcbmV4cG9ydCBmdW5jdGlvbiBjbGFzc05hbWVzICguLi5hcmdzKSB7XG4gIHJldHVybiBhcmdzLm1hcCggYXJnID0+IHtcbiAgICBpZiAoIWFyZykgcmV0dXJuIFwiXCI7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYXJnKSkgcmV0dXJuIGNsYXNzTmFtZXMoLi4uYXJnKTtcbiAgICBzd2l0Y2ggKHR5cGVvZiBhcmcpIHtcbiAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgIGNhc2UgXCJzdHJpbmdcIjogIHJldHVybiBhcmc7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoYXJnKS5tYXAoIGtleSA9PiBhcmdba2V5XSA/IGtleSA6IFwiXCIpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAgICAgICAgIC5qb2luKFwiIFwiKTtcbiAgICB9XG4gIH0pLmZpbHRlcihCb29sZWFuKVxuICAgIC5qb2luKFwiIFwiKTtcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2FwcC91dGlsLmpzIiwiLy8gTWVtb2l6ZS9mb3JnZXQgc2VtYW50aWNzLlxuXG4vLyBSZXR1cm4gYSBtZW1vaXppbmcgZ2V0dGVyIGZ1bmN0aW9uLlxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXNbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGdldHRlci5hcHBseSh0aGlzKTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIERlZmluZSBzbyB0aGF0IHdlIGNhbiBiZSBkZWxldGVkIGFuZCByZS1kZWZpbmVkLCBidXQgbm90IHNldCBvciBlbnVtZXJhdGVkLlxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcGVydHksIHsgdmFsdWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXNbcHJvcGVydHldO1xuXHR9XG59XG5cblxuLy8gUmV0dXJuIGEgbWVtb2l6ZSBmdW5jdGlvbiBmb3IgdXNlIGFzIGEgZ2V0dGVyIGluIGEgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYFxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4ge1xuXHRcdGdldCA6IG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpXG5cdH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9tZW1vaXplLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFRva2VuaXplciBmcm9tIFwiLi4vVG9rZW5pemVyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgXCJKU1hcIiBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwiSlNYXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBKU1ggZXhwcmVzc2lvbi5cblJ1bGUuSlNYID0gY2xhc3MganN4RWxlbWVudCBleHRlbmRzIFJ1bGUge1xuXHQvLyBUZXh0IHN0cmluZ3MgZ2V0IGVuY29kZWQgYXMgYHRleHRgIG9iamVjdHMgaW4gdGhlIHRva2VuIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kID0gdG9rZW5zLmxlbmd0aCkge1xuXHRcdGxldCB0b2tlbiA9IHRva2Vuc1tzdGFydF07XG5cdFx0aWYgKCEodG9rZW4gaW5zdGFuY2VvZiBUb2tlbml6ZXIuSlNYRWxlbWVudCkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogdG9rZW4sXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0ICsgMVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gQ29udmVydCBvdXIgYXR0cmlidXRlcyB0byBzb3VyY2UuXG5cdC8vIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgbm8gYXR0cmlidXRlcy5cblx0YXR0cnNUb1NvdXJjZShjb250ZXh0LCBqc3hFbGVtZW50ID0gdGhpcy5tYXRjaGVkKSB7XG5cdFx0bGV0IGF0dHJpYnV0ZXMgPSBqc3hFbGVtZW50LmF0dHJpYnV0ZXM7XG5cdFx0aWYgKCFhdHRyaWJ1dGVzIHx8ICFhdHRyaWJ1dGVzLmxlbmd0aCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBhdHRycyA9IGF0dHJpYnV0ZXMubWFwKCAoeyBuYW1lLCB2YWx1ZSB9KSA9PiB7XG5cdFx0XHQvLyBpZiBOTyB2YWx1ZSwgYXNzdW1lIGl0J3MgYSB2YXJpYWJsZSBvZiB0aGUgc2FtZSBuYW1lXG5cdFx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgdmFsdWUgPSBuYW1lO1xuXHRcdFx0Ly8gaWYgaXQncyBhbiBhcnJheSwgaXQncyBhIHNwZWxsIGV4cHJlc3Npb24sIHBvc3NpYmx5IHdpdGggbmVzdGVkIEpTWCBlbGVtZW50cy4uLlxuXHRcdFx0ZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBUb2tlbml6ZXIuSlNYRXhwcmVzc2lvbikge1xuXHRcdFx0XHR2YWx1ZSA9IHRoaXMuanN4RXhwcmVzc2lvblRvU291cmNlKGNvbnRleHQsIHZhbHVlKTtcblx0XHRcdH1cblx0XHRcdC8vIGVsc2UgaWYgYSBKU1ggZWxlbWVudCwgcmVjdXJzZVxuLy9UT0RPOiBpbmRlbnQuLi5cblx0XHRcdGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgVG9rZW5pemVyLkpTWEVsZW1lbnQpIHtcblx0XHRcdFx0dmFsdWUgPSB2YWx1ZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdH1cblx0XHRcdC8vIE90aGVyd2lzZSBpZiBhIG51bWJlciBvciBUZXh0IGxpdGVyYWwsIGp1c3QgdXNlIGl0XG5cblx0XHRcdC8vIHNwZWNpYWwgY2FzZSBgY2xhc3NgIHRvIGBjbGFzc05hbWVgIGJlY2F1c2UgUmVhY3QgaXMgZWZmaW5nIHBlcnNuaWNrZXR5LlxuXHRcdFx0aWYgKG5hbWUgPT09IFwiY2xhc3NcIikgbmFtZSA9IFwiY2xhc3NOYW1lXCI7XG4vL1RPRE86IGVzY2FwZSBuYW1lcyB3aGljaCBhcmUgaW52YWxpZCBKUyBpZGVudGlmaWVyc1xuXHRcdFx0cmV0dXJuIGAke25hbWV9OiAke3ZhbHVlfWA7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gYHsgJHthdHRycy5qb2luKFwiLCBcIil9IH1gO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGFuIGFycmF5IHdpdGggc291cmNlIGZvciBlYWNoIG9mIG91ciBjaGlsZHJlbi5cblx0Ly8gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiB3ZSBkb24ndCBoYXZlIGFueSBjaGlsZHJlbi5cblx0Y2hpbGRyZW5Ub1NvdXJjZShjb250ZXh0LCBqc3hFbGVtZW50ID0gdGhpcy5tYXRjaGVkKSB7XG5cdFx0bGV0IGNoaWxkcmVuID0ganN4RWxlbWVudC5jaGlsZHJlbjtcblx0XHRpZiAoIWNoaWxkcmVuIHx8IGNoaWxkcmVuLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gY2hpbGRyZW4ubWFwKGNoaWxkID0+IHtcbi8vVE9ETzogZXNjYXBlIGlubmVyIHF1b3Rlcy4uLlxuXHRcdFx0aWYgKHR5cGVvZiBjaGlsZCA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHQvL2ZvcmdldCBpdCBpZiB3aGl0ZXNwYWNlIG9ubHkuLi4gPz8/XG5cdFx0XHRcdGxldCB0ZXh0ID0gY2hpbGQudHJpbSgpO1xuXHRcdFx0XHRpZiAoIXRleHQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRcdHJldHVybiBgXCIke3RleHR9XCJgO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNoaWxkIGluc3RhbmNlb2YgVG9rZW5pemVyLkpTWEVsZW1lbnQpIHtcblx0XHRcdFx0bGV0IGNoaWxkU291cmNlID0gdGhpcy5qc3hFbGVtZW50VG9Tb3VyY2UoY29udGV4dCwgY2hpbGQpO1xuXHRcdFx0XHRyZXR1cm4gY2hpbGRTb3VyY2Uuc3BsaXQoXCJcXG5cIikuam9pbihcIlxcblxcdFwiKTtcblx0XHRcdH1cblx0XHRcdGlmIChjaGlsZCBpbnN0YW5jZW9mIFRva2VuaXplci5KU1hFeHByZXNzaW9uKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmpzeEV4cHJlc3Npb25Ub1NvdXJjZShjb250ZXh0LCBjaGlsZCk7XG5cdFx0XHR9XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJjaGlsZHJlblRvU291cmNlKCk6IGRvbid0IHVuZGVyc3RhbmQgY2hpbGRcIiArICBjaGlsZCk7XG5cdFx0fSlcblx0XHQvLyByZW1vdmUgdW5kZWZpbmVkL2VtcHR5IHN0cmluZyBydWxlc1xuXHRcdC5maWx0ZXIoQm9vbGVhbik7XG5cdH1cblxuXHQvLyBDb252ZXJ0IEpTWCBleHByZXNzaW9uICggYHsuLi59YCApIHRvIEpTIHNvdXJjZS5cblx0anN4RXhwcmVzc2lvblRvU291cmNlKGNvbnRleHQsIGpzeEV4cHJlc3Npb24pIHtcblx0XHRsZXQgdG9rZW5zID0ganN4RXhwcmVzc2lvbi50b2tlbnM7XG5jb25zb2xlLmluZm8oanN4RXhwcmVzc2lvbiwgdG9rZW5zKTtcblx0XHRyZXR1cm4gXCIvXCIgKyBgKlRPRE86ICR7dG9rZW5zLmpvaW4oXCIgXCIpfSpgICsgXCIvXCI7XG5cdH1cblxuXHRqc3hFbGVtZW50VG9Tb3VyY2UoY29udGV4dCwganN4RWxlbWVudCA9IHRoaXMubWF0Y2hlZCkge1xuXHRcdC8vIGdldCB0aGUgYml0cyBvZiB0aGUgb3V0cHV0XG5cdFx0bGV0IHRhZ05hbWUgPSBgXCIke2pzeEVsZW1lbnQudGFnTmFtZX1cImA7XG5cdFx0bGV0IGF0dHJzID0gdGhpcy5hdHRyc1RvU291cmNlKGNvbnRleHQsIGpzeEVsZW1lbnQpO1xuXHRcdGxldCBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW5Ub1NvdXJjZShjb250ZXh0LCBqc3hFbGVtZW50KTtcblxuXHRcdGxldCBvdXRwdXQgPSBgY3JlYXRlRWxlbWVudCgke3RhZ05hbWV9YDtcblx0XHRpZiAoIWF0dHJzICYmIGNoaWxkcmVuKSBhdHRycyA9IFwibnVsbFwiO1xuXG5cdFx0aWYgKGF0dHJzKSBvdXRwdXQgKz0gYCwgJHthdHRyc31gO1xuXHRcdGlmIChjaGlsZHJlbikge1xuXHRcdFx0b3V0cHV0ICs9IFwiLFxcblxcdFwiICsgY2hpbGRyZW4uam9pbihcIixcXG5cXHRcIikgKyBcIlxcblwiO1xuXHRcdH1cblx0XHRvdXRwdXQgKz0gXCIpXCJcblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLmpzeEVsZW1lbnRUb1NvdXJjZShjb250ZXh0LCB0aGlzLm1hdGNoZWQpO1xuXHR9XG59O1xuXG4vLyBEZWZpbmUganN4IGJsb2NrIGFzIGFuIGBleHByZXNzaW9uYCBPUiBhIGBzdGF0ZW1lbnRgLlxucGFyc2VyLmFkZFJ1bGUoW1wianN4XCIsIFwiZXhwcmVzc2lvblwiLCBcInN0YXRlbWVudFwiXSwgUnVsZS5KU1gpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL0pTWC5qcyIsIi8vIEV4cG9ydCBhbGwgc3RhbmRhcmQgXCJlbmdsaXNoXCIgcnVsZXMuXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcblxuLy8gTG9hZCBhbGwgc3RhbmRhcmQgcnVsZXMgZmlsZXMuXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbGlzdHNcIjtcbmltcG9ydCBcIi4vb3BlcmF0b3JzXCI7XG5pbXBvcnQgXCIuL2lmXCI7XG5pbXBvcnQgXCIuL3N0YXRlbWVudHNcIjtcbmltcG9ydCBcIi4vdHlwZXNcIjtcbmltcG9ydCBcIi4vSlNYXCI7XG5cblxuLy8gQ3JlYXRlIHBhcnNlciBmb3IgYWxsLlxuY29uc3QgcGFyc2VyID0gUGFyc2VyLmZvckNvbnRleHQoXCJhbGxcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEFuZCBkZXBlbmQgb24gc3RhbmRhcmQgcnVsZXMgbG9hZGVkIGFib3ZlLlxucGFyc2VyLmltcG9ydChcImNvcmVcIiwgXCJsaXN0c1wiLCBcIm9wZXJhdG9yc1wiLCBcImlmXCIsIFwic3RhdGVtZW50c1wiLCBcInR5cGVzXCIsIFwiSlNYXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2FsbC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgaWYgc3RhdGVtZW50cy5cbi8vXG5cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcblxuLy8gQ3JlYXRlIFwiaWZcIiBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwiaWZcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEltcG9ydCBjb3JlIHJ1bGVzLlxuaW1wb3J0IFwiLi9jb3JlXCI7XG5wYXJzZXIuaW1wb3J0KFwiY29yZVwiKTtcblxuXG4vLyBUT0RPOiBjdXN0b20gYGdldE1hdGNoZXJgOlxuLy9cdFx0XHQtIGBjb25kdGlvbmAgd3JhcHMgaW4gcGFyZW5zIGlmIE5PVCB3cmFwcGVkXG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImlmXCIsXG5cdFwiaWYge2NvbmRpdGlvbjpleHByZXNzaW9ufSAodGhlbnw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGlmXyBleHRlbmRzIFJ1bGUuQmxvY2tTdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGNvbmRpdGlvbiwgc3RhdGVtZW50LCBibG9jayB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuLy9cdFx0XHRpZiAoc3RhdGVtZW50ICYmIGJsb2NrKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJpZiBtYXkgb25seSBoYXZlIGlubGluZSBzdGF0ZW1lbnQgT1IgYmxvY2tcIik7XG5cdFx0XHRsZXQgc3RhdGVtZW50cyA9IFJ1bGUuQmxvY2suZW5jbG9zZVN0YXRlbWVudHMoc3RhdGVtZW50LCBibG9jayk7XG5cdFx0XHRyZXR1cm4gYGlmICgke2NvbmRpdGlvbn0pICR7c3RhdGVtZW50c31gO1xuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJiYWNrd2FyZHNfaWZcIixcblx0XCJ7c3RhdGVtZW50fSBpZiB7Y29uZGl0aW9uOmV4cHJlc3Npb259ICg/OihlbHNlfG90aGVyd2lzZSkge2Vsc2VTdGF0ZW1lbnQ6c3RhdGVtZW50fSk/XCIsXG5cdGNsYXNzIGJhY2t3YXJkc19pZiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0ZXN0UnVsZSA9IG5ldyBSdWxlLk1hdGNoKHsgbWF0Y2g6IFtcImlmXCJdIH0pO1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGNvbmRpdGlvbiwgc3RhdGVtZW50LCBlbHNlU3RhdGVtZW50IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgb3V0cHV0ID0gYGlmICgke2NvbmRpdGlvbn0pIHsgJHtzdGF0ZW1lbnR9IH1gO1xuXHRcdFx0aWYgKGVsc2VTdGF0ZW1lbnQpIG91dHB1dCArPSBgXFxuZWxzZSB7ICR7ZWxzZVN0YXRlbWVudH0gfWBcblx0XHRcdHJldHVybiBvdXRwdXQ7XG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImVsc2VfaWZcIixcblx0XCIoZWxzZXxvdGhlcndpc2UpIGlmIHtjb25kaXRpb246ZXhwcmVzc2lvbn0gKHRoZW58Oikge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGVsc2VfaWYgZXh0ZW5kcyBSdWxlLkJsb2NrU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBjb25kaXRpb24sIHN0YXRlbWVudCwgYmxvY2sgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcbi8vXHRcdFx0aWYgKHN0YXRlbWVudCAmJiBibG9jaykgdGhyb3cgbmV3IFN5bnRheEVycm9yKFwiZWxzZSBpZiBtYXkgb25seSBoYXZlIGlubGluZSBzdGF0ZW1lbnQgT1IgYmxvY2tcIik7XG5cdFx0XHRsZXQgc3RhdGVtZW50cyA9IFJ1bGUuQmxvY2suZW5jbG9zZVN0YXRlbWVudHMoc3RhdGVtZW50LCBibG9jayk7XG5cdFx0XHRyZXR1cm4gYGVsc2UgaWYgKCR7Y29uZGl0aW9ufSkgJHtzdGF0ZW1lbnRzfWBcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZWxzZVwiLFxuXHRcIihlbHNlfG90aGVyd2lzZSkgKDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZWxzZV8gZXh0ZW5kcyBSdWxlLkJsb2NrU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzdGF0ZW1lbnQsIGJsb2NrIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG4vL1x0XHRcdGlmIChzdGF0ZW1lbnQgJiYgYmxvY2spIHRocm93IG5ldyBTeW50YXhFcnJvcihcImVsc2UgaWYgbWF5IG9ubHkgaGF2ZSBpbmxpbmUgc3RhdGVtZW50IE9SIGJsb2NrXCIpO1xuXHRcdFx0bGV0IHN0YXRlbWVudHMgPSBSdWxlLkJsb2NrLmVuY2xvc2VTdGF0ZW1lbnRzKHN0YXRlbWVudCwgYmxvY2spO1xuXHRcdFx0cmV0dXJuIGBlbHNlICR7c3RhdGVtZW50c31gXG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2lmLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWFsaW5nIHdpdGggbGlzdHNcbi8vXG5cbi8vIFRPRE86IGNvbmZpcm0gaWRlbnRpZmllcnMgYXJlIHBsdXJhbCBpbiBzb21lIG9mIHRoZSBiZWxvdz9cbi8vIFRPRE86IGBsaXN0LmNsb25lKClgIHRvIHJldHVybiBuZXcgbGlzdCBvZiBzYW1lIHR5cGUuXG5cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcblxuaW1wb3J0IHsgaXNQbHVyYWwsIHNpbmd1bGFyaXplIH0gZnJvbSBcIi4uL3V0aWxzL3N0cmluZ1wiO1xuXG4vLyBDcmVhdGUgXCJsaXN0c1wiIHBhcnNlciBjb250ZXh0LlxuY29uc3QgcGFyc2VyID0gUGFyc2VyLmZvckNvbnRleHQoXCJsaXN0c1wiKTtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gSW1wb3J0IGNvcmUgcnVsZXMuXG5pbXBvcnQgXCIuL2NvcmVcIjtcbnBhcnNlci5pbXBvcnQoXCJjb3JlXCIpO1xuXG5cbi8vIFdPUktJTkcgRlJPTSBPVEhFUiBSVUxFUyAodGVzdG1lKVxuLy9cdGB0aGUgbGVuZ3RoIG9mIDxsaXN0PmBcbi8vXHRgPHRoaW5nPiBpcyBub3Q/IGluIDxsaXN0PmBcbi8vXHRgPGxpc3Q+IGlzIG5vdD8gZW1wdHlgXG4vL1x0YHNldCBpdGVtIDEgb2YgbXlMaXN0IHRvICdhJ2BcblxuXG4vLyBUT0RPOiBcdGBjcmVhdGUgbGlzdCB3aXRoIDxleHA+LCA8ZXhwPiwgPGV4cD5gXG4vLyBUT0RPOlx0YGR1cGxpY2F0ZSBsaXN0YFxuLy8gVE9ETzpcdGBkdXBsaWNhdGUgbGlzdCB3aXRoIDxleHA+LCA8ZXhwPiwgPGV4cD5gID8/P1xuLy8gVE9ETzpcdGB0aGUgc2l6ZSBvZiA8bGlzdD5gID0+IHdpbGwgbWFwIHRvIGBsaXN0LnNpemVgLi4uXG4vL1x0XHRcdFx0LSBpbnN0YWxsIGBzaXplYCBhcyBhbiBhbGlhcyB0byBgbGVuZ3RoYD9cbi8vIFRPRE86XHRgbW92ZSA8dGhpbmc+IHRvIGVuZCBvZiA8bGlzdD5gID8/P1xuLy8gVE9ETzpcdGBTZXRgIGZvciBhIHVuaXF1ZSBsaXN0P1xuLy8gVE9ETzpcdHR5cGVkIGxpc3Q/XG4vLyBUT0RPOlx0bGlzdCB3aGljaCB3b24ndCB0YWtlIG51bGwvdW5kZWZpbmVkXG5cblxuLy8gUmV0dXJuIHRoZSBsZW5ndGggb2YgdGhlIGxpc3QuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGlzdF9sZW5ndGhcIixcblx0XCJ0aGU/IG51bWJlciBvZiB7aWRlbnRpZmllcn0gaW4ge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9sZW5ndGggZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaXN0LCBpZGVudGlmaWVyIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG4vLyBUT0RPOiBzcGVjaWFsIGNhc2UgJ3dvcmRzJywgJ2xpbmVzJywgZXRjXG5cdFx0XHRyZXR1cm4gYCR7bGlzdH0ubGVuZ3RoYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJldHVybiB0aGUgZmlyc3QgcG9zaXRpb24gb2Ygc3BlY2lmaWVkIGl0ZW0gaW4gdGhlIGxpc3QgYXMgYW4gYXJyYXkuXG4vLyBJZiBpdGVtIGlzIG5vdCBmb3VuZCwgcmV0dXJucyBgdW5kZWZpbmVkYC5cbi8vIE5PVEU6IHRoaXMgcG9zaXRpb24gcmV0dXJuZWQgaXMgKioxLWJhc2VkKiouXG4vL1RFU1RNRVxuLy8gVE9ETzogYHBvc2l0aW9uc2AsIGBsYXN0IHBvc2l0aW9uYCwgYGFmdGVyLi4uYFxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGlzdF9wb3NpdGlvblwiLFxuXHRcInRoZT8gcG9zaXRpb24gb2Yge3RoaW5nOmV4cHJlc3Npb259IGluIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcG9zaXRpb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5wb3NpdGlvbk9mKCR7dGhpbmd9LCAke2xpc3R9KWBcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRPcmRpbmFsIG51bWJlcnMgKGZpcnN0LCBzZWNvbmQsIGxhc3QsIGV0YykuXG4vLyBUT0RPOiBzaXh0eS1maWZ0aCwgdHdvIGh1bmRyZWQgZm9ydHkgbmludGguLi5cbi8vXG5wYXJzZXIuYWRkUnVsZShcIm9yZGluYWxcIiwgY2xhc3Mgb3JkaW5hbCBleHRlbmRzIFJ1bGUuQWx0ZXJuYXRpdmVze30pO1xuY2xhc3Mgb3JkaW5hbCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7fVxucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZmlyc3RcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gMSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNlY29uZFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAyIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwidGhpcmRcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gMyB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImZvdXJ0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA0IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZmlmdGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNpeHRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDYgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJzZXZlbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDcgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJlaWdodGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gOCB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcIm5pbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDkgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJ0ZW50aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxMCB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInBlbnVsdGltYXRlXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IC0yIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZmluYWxcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJsYXN0XCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IC0xIH0pO1xuXG5cbi8vIHRyZWF0IGxpc3QgYXMgYSBzdGFjayBvciBxdWV1ZVxuLy9URVNUTUVcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInRvcFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiYm90dG9tXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IC0xIH0pO1xuXG5cbi8vIEluZGV4IGV4cHJlc3Npb246IG51bWVyaWMgcG9zaXRpb24gaW4gc29tZSBsaXN0LlxuLy9cdGUuZy5cdGBjYXJkIDEgb2YgdGhlIHBpbGVgXG4vL1x0XHRcdGBjYXJkICMyIG9mIHRoZSBwaWxlYFxuLy9cdFx0XHRgdGhlIGZpcnN0IGNhcmQgb2YgdGhlIHBpbGVgXG4vL1xuLy8gTk9URTogTmVnYXRpdmUgbnVtZXJpYyBwb3NpdGlvbnMgY29tZSBmcm9tIHRoZSBFTkQgb2YgdGhlIGxpc3QuXG4vL1x0ZS5nLlx0YGNhcmQgLTEgb2YgdGhlIHBpbGVgXG4vL1xuLy8gTk9URTogT3VyIHBvc2l0aW9ucyBhcmUgKioxLWJhc2VkKiogYW5kIEphdmFzY3JpcHQgaXMgKiowLWJhc2VkKiouXG4vL1x0XHQgZS5nLiBgaXRlbSAxIG9mIHRoZSBhcnJheWAgID0gYGFycmF5WzBdYFxuLy9cbi8vIFRPRE86IGlmIGBpZGVudGlmaWVyYCBpcyBcIndvcmRcIiwgb3V0cHV0IGBnZXRXb3JkKClgIGV0Y1xucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicG9zaXRpb25fZXhwcmVzc2lvblwiLFxuXHRbXG5cdFx0XCJ7aWRlbnRpZmllcn0ge3Bvc2l0aW9uOmV4cHJlc3Npb259IG9mICh0aGU/KSB7ZXhwcmVzc2lvbn1cIixcblx0XHRcInRoZSB7cG9zaXRpb246b3JkaW5hbH0ge2lkZW50aWZpZXJ9IG9mICh0aGU/KSB7ZXhwcmVzc2lvbn1cIlxuXHRdLFxuXHRjbGFzcyBwb3NpdGlvbl9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9ue1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIHBvc2l0aW9uLCBleHByZXNzaW9uIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG4vLyBUT0RPOiBzcGVjaWFsIGNhc2UgJ3dvcmRzJywgJ2xpbmVzJywgZXRjXG5cblx0XHRcdC8vIElmIHdlIGdvdCBhIHBvc2l0aXZlIG51bWJlciBsaXRlcmFsLCBjb21wZW5zYXRlIGZvciBKUyAwLWJhc2VkIGFycmF5cyBub3csXG5cdFx0XHQvLyBmb3IgbmljZXIgb3V0cHV0LlxuXHRcdFx0aWYgKHR5cGVvZiBwb3NpdGlvbiA9PT0gXCJudW1iZXJcIiAmJiBwb3NpdGlvbiA+IDApIHtcblx0XHRcdFx0cmV0dXJuIGAke2V4cHJlc3Npb259WyR7cG9zaXRpb24gLSAxfV1gO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7cG9zaXRpb259KWA7XG5cblx0Ly8gVGhpcyBpcyBzYWZlciwgYnV0IHVzaW5nIHRoZSBhYm92ZSBzb21ldGltZXMgZm9yIGRlbW8gcHVycG9zZXNcblx0Ly9cdFx0cmV0dXJuIGBzcGVsbC5nZXRJdGVtKCR7ZXhwcmVzc2lvbn0sICR7cG9zaXRpb259KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBQaWNrIGEgU0lOR0xFIHJhbmRvbSBpdGVtIGZyb20gdGhlIGxpc3QuXG4vLyBUT0RPOiBjb25maXJtIGlkZW50aWZpZXIgaXMgcGx1cmFsP1xuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmRvbV9wb3NpdGlvbl9leHByZXNzaW9uXCIsXG5cdFwiYSByYW5kb20ge2lkZW50aWZpZXJ9IChvZnxmcm9tfGluKSAodGhlKT8ge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcmFuZG9tX3Bvc2l0aW9uX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0UmFuZG9tSXRlbU9mKCR7bGlzdH0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFBpY2sgYSB1bmlxdWUgc2V0IG9mIHJhbmRvbSBpdGVtcyBmcm9tIHRoZSBsaXN0LCByZXR1cm5pbmcgYW4gYXJyYXkuXG4vLyBUT0RPOiBgdHdvIHJhbmRvbSBpdGVtcy4uLmBcbi8vIFRPRE86IGNvbmZpcm0gaWRlbnRpZmllciBpcyBwbHVyYWw/XG4vLyBUT0RPOiBgbGlzdC5jbG9uZSgpYCB0byByZXR1cm4gbmV3IGxpc3Qgb2Ygc2FtZSB0eXBlLlxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmRvbV9wb3NpdGlvbnNfZXhwcmVzc2lvblwiLFxuXHRcIntudW1iZXJ9IHJhbmRvbSB7aWRlbnRpZmllcn0gKG9mfGZyb218aW4pICh0aGUpPyB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5kb21fcG9zaXRpb25zX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG51bWJlciwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5kb21JdGVtc09mKCR7bGlzdH0sICR7bnVtYmVyfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBSYW5nZSBleHByZXNzaW9uLlxuLy8gUmV0dXJucyBhIG5ldyBsaXN0LlxuLy8gTk9URTogYHN0YXJ0YCBpcyAqKjEtYmFzZWQqKi5cbi8vIE5PVEU6IGBlbmRgIGlzIGluY2x1c2l2ZSFcbi8vIFRPRE86IGNvbmZpcm0gaWRlbnRpZmllciBpcyBwbHVyYWw/XG4vLyBUT0RPOiBgbGlzdC5jbG9uZSgpYCB0byByZXR1cm4gbmV3IGxpc3Qgb2Ygc2FtZSB0eXBlLlxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmdlX2V4cHJlc3Npb25cIixcblx0XCJ7aWRlbnRpZmllcn0ge3N0YXJ0OmV4cHJlc3Npb259IHRvIHtlbmQ6ZXhwcmVzc2lvbn0gb2Yge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcmFuZ2VfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhcnQsIGVuZCwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5nZSgke2xpc3R9LCAke3N0YXJ0fSwgJHtlbmR9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBTdGFydGluZyByYW5nZSBleHByZXNzaW9uLlxuLy8gUmV0dXJucyBhIG5ldyBsaXN0LlxuLy8gZS5nLlx0YGZpcnN0IDQgaXRlbXMgb2YgbGlzdGBcbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJmaXJzdF9pbl9yYW5nZVwiLFxuXHRcImZpcnN0IHtudW1iZXI6ZXhwcmVzc2lvbn0ge2lkZW50aWZpZXJ9IChpbnxvZikge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcmFuZ2VfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbnVtYmVyLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldFJhbmdlKCR7bGlzdH0sIDEsICR7bnVtYmVyfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gRW5kaW5nIHJhbmdlIGV4cHJlc3Npb24uXG4vLyBSZXR1cm5zIGEgbmV3IGxpc3QuXG4vLyBlLmcuXHRgbGFzdCA0IGl0ZW1zIG9mIGxpc3RgXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGFzdF9pbl9yYW5nZVwiLFxuXHRcImxhc3Qge251bWJlcjpleHByZXNzaW9ufSB7aWRlbnRpZmllcn0gKGlufG9mKSB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBudW1iZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0RW5kUmFuZ2UoJHtsaXN0fSwgMSwgJHtudW1iZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFJhbmdlIGV4cHJlc3Npb24gc3RhcnRpbmcgYXQgc29tZSBpdGVtIGluIHRoZSBsaXN0LlxuLy8gUmV0dXJucyBhIG5ldyBsaXN0LlxuLy8gSWYgaXRlbSBpcyBub3QgZm91bmQsIHJldHVybnMgYW4gZW1wdHkgbGlzdC4gKD8/Pylcbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJyYW5nZV9leHByZXNzaW9uXCIsXG5cdFwie2lkZW50aWZpZXJ9IChpbnxvZikge2xpc3Q6ZXhwcmVzc2lvbn0gc3RhcnRpbmcgd2l0aCB7dGhpbmc6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcmFuZ2VfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0UmFuZ2UoJHtsaXN0fSwgc3BlbGwucG9zaXRpb25PZigke3RoaW5nfSwgJHtsaXN0fSkpYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gTGlzdCBmaWx0ZXIuXG4vLyBOT1RFOiB3ZSB3aWxsIHNpbmd1bGFyaXplIGBpZGVudGlmaWVyYCBhbmQgdXNlIHRoYXQgYXMgdGhlIGFyZ3VtZW50IHRvIGBleHByZXNzaW9uYC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXN0X2ZpbHRlclwiLFxuXHRcIntpZGVudGlmaWVyfSAoaW58b2YpIHtsaXN0OmV4cHJlc3Npb259IHdoZXJlIHtjb25kaXRpb246ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9maWx0ZXIgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGNvbmRpdGlvbiwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gdXNlIHNpbmd1bGFyIG9mIGlkZW50aWZpZXIgZm9yIG1ldGhvZCBhcmd1bWVudFxuXHRcdFx0bGV0IGFyZ3VtZW50ID0gc2luZ3VsYXJpemUoaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmZpbHRlcigke2xpc3R9LCAke2FyZ3VtZW50fSA9PiAke2NvbmRpdGlvbn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gU2V0IG1lbWJlcnNoaXAgKGxlZnQgcmVjdXJzaXZlKS5cbi8vIE5PVEU6IHdlIHdpbGwgc2luZ3VsYXJpemUgYGlkZW50aWZpZXJgIGFuZCB1c2UgdGhhdCBhcyB0aGUgYXJndW1lbnQgdG8gYGV4cHJlc3Npb25gLlxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpc3RfbWVtYmVyc2hpcF90ZXN0XCIsXG5cdFwie2xpc3Q6ZXhwcmVzc2lvbn0gKG9wZXJhdG9yOmhhc3xoYXMgbm98ZG9lc250IGhhdmV8ZG9lcyBub3QgaGF2ZSkge2lkZW50aWZpZXJ9IHdoZXJlIHtmaWx0ZXI6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9tZW1iZXJzaGlwX3Rlc3QgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdC8vIEFkZCB0ZXN0IHJ1bGUgZm9yIHF1aWNrZXIgcHJvY2Vzc2luZ1xuXHRcdHRlc3RSdWxlID0gbmV3IFJ1bGUuTWF0Y2goeyBtYXRjaDogW1wid2hlcmVcIl0gfSk7XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBvcGVyYXRvciwgZmlsdGVyLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgYmFuZyA9IG9wZXJhdG9yID09PSBcImhhc1wiID8gXCJcIiA6IFwiIVwiO1xuXHRcdFx0Ly8gdXNlIHNpbmd1bGFyIG9mIGlkZW50aWZpZXIgZm9yIG1ldGhvZCBhcmd1bWVudFxuXHRcdFx0bGV0IGFyZ3VtZW50ID0gc2luZ3VsYXJpemUoaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0XHRyZXR1cm4gYCR7YmFuZ31zcGVsbC5hbnkoJHtsaXN0fSwgJHthcmd1bWVudH0gPT4gJHtmaWx0ZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vL1xuLy9cdEFkZGluZyB0byBsaXN0IChpbi1wbGFjZSlcbi8vXG5cbi8vIEFkZCB0byBlbmQgb2YgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfYXBwZW5kXCIsXG5cdFtcblx0XHRcImFwcGVuZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8ge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0XHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8gKCh0aGU/KSBlbmQgb2YpPyB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRdLFxuXHRjbGFzcyBsaXN0X2FwcGVuZCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5hcHBlbmQoJHtsaXN0fSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIEFkZCB0byBiZWdpbm5pbmcgb2YgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcHJlcGVuZFwiLFxuXHRbXG5cdFx0XCJwcmVwZW5kIHt0aGluZzpleHByZXNzaW9ufSB0byB7bGlzdDpleHByZXNzaW9ufVwiLFxuLy9cInRvcFwiIGFzIHN0YWNrID09PSBib3R0b20/XG5cdFx0XCJhZGQge3RoaW5nOmV4cHJlc3Npb259IHRvIHRoZSAoc3RhcnR8ZnJvbnR8dG9wKSBvZiB7bGlzdDpleHByZXNzaW9ufVwiXG5cdF0sXG5cdGNsYXNzIGxpc3RfcHJlcGVuZCBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5wcmVwZW5kKCR7bGlzdH0sICR7dGhpbmd9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBBZGQgdG8gbWlkZGxlIG9mIGxpc3QsIHB1c2hpbmcgZXhpc3RpbmcgaXRlbXMgb3V0IG9mIHRoZSB3YXkuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X2FkZF9hdFwiLFxuXHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8ge2xpc3Q6ZXhwcmVzc2lvbn0gYXQgcG9zaXRpb24ge3Bvc2l0aW9uOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3Rfc3BsaWNlIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBwb3NpdGlvbiwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5zcGxpY2UoJHtsaXN0fSwgJHtwb3NpdGlvbn0sICR7dGhpbmd9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFRPRE86ICBcdFwiYWRkIHt0aGluZzpleHByZXNzaW9ufSB0byB7bGlzdDpleHByZXNzaW9ufSBiZWZvcmUge2l0ZW06ZXhwcmVzc2lvbn1cIixcblxuLy8gQWRkIHRvIG1pZGRsZSBvZiBsaXN0LCBwdXNoaW5nIGV4aXN0aW5nIGl0ZW1zIG91dCBvZiB0aGUgd2F5LlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9hZGRfYWZ0ZXJcIixcblx0XCJhZGQge3RoaW5nOmV4cHJlc3Npb259IHRvIHtsaXN0OmV4cHJlc3Npb259IGFmdGVyIHtpdGVtOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfYWRkX2FmdGVyIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBpdGVtLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnNwbGljZSgke2xpc3R9LCBzcGVsbC5wb3NpdGlvbk9mKCR7bGlzdH0sICR7aXRlbX0pLCAke3RoaW5nfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vXG4vL1x0UmVtb3ZpbmcgZnJvbSBsaXN0IChpbi1wbGFjZSlcbi8vXG5cbi8vIEVtcHR5IGxpc3QuXG4vL1RPRE86IG1ha2UgYGVtcHR5YCBhbmQvb3IgYGNsZWFyYCBhIGdlbmVyaWMgc3RhdGVtZW50Pz8/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X2VtcHR5XCIsXG5cdFwiKGVtcHR5fGNsZWFyKSB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X2VtcHR5IGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmNsZWFyKCR7bGlzdH0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFJlbW92ZSBvbmUgaXRlbSBmcm9tIGxpc3QgYnkgcG9zaXRpb24uXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3JlbW92ZV9wb3NpdGlvblwiLFxuXHRcInJlbW92ZSB7aWRlbnRpZmllcn0ge251bWJlcjpleHByZXNzaW9ufSBvZiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3JlbW92ZV9wb3NpdGlvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbnVtYmVyLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnJlbW92ZUl0ZW0oJHtsaXN0fSwgJHtudW1iZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBSZW1vdmUgcmFuZ2Ugb2YgdGhpbmdzIGZyb20gbGlzdC5cbi8vIE5PVEU6IGBzdGFydGAgaXMgKioxLWJhc2VkKiouXG4vLyBOT1RFOiBgZW5kYCBpcyBpbmNsdXNpdmUhXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3JlbW92ZV9yYW5nZVwiLFxuXHRcInJlbW92ZSB7aWRlbnRpZmllcn0ge3N0YXJ0OmV4cHJlc3Npb259IHRvIHtlbmQ6ZXhwcmVzc2lvbn0gb2Yge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9yZW1vdmVfcG9zaXRpb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHN0YXJ0LCBlbmQsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwucmVtb3ZlUmFuZ2UoJHtsaXN0fSwgJHtzdGFydH0sICR7ZW5kfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBSZW1vdmUgYWxsIGluc3RhbmNlcyBvZiBzb21ldGhpbmcgZnJvbSBhIGxpc3QuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3JlbW92ZVwiLFxuXHRcInJlbW92ZSB7dGhpbmc6ZXhwcmVzc2lvbn0gZnJvbSB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3JlbW92ZSBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwucmVtb3ZlKCR7bGlzdH0sICR7dGhpbmd9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBSZW1vdmUgYWxsIGl0ZW1zIGZyb20gbGlzdCB3aGVyZSBjb25kaXRpb24gaXMgdHJ1ZS5cbi8vIE5PVEU6IHdlIHdpbGwgc2luZ3VsYXJpemUgYGlkZW50aWZpZXJgIGFuZCB1c2UgdGhhdCBhcyB0aGUgYXJndW1lbnQgdG8gYGV4cHJlc3Npb25gLlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9yZW1vdmVfd2hlcmVcIixcblx0XCJyZW1vdmUge2lkZW50aWZpZXJ9IChpbnxvZnxmcm9tKSB7bGlzdDpleHByZXNzaW9ufSB3aGVyZSB7Y29uZGl0aW9uOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcmVtb3ZlX3doZXJlIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBjb25kaXRpb24sIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIHVzZSBzaW5ndWxhciBvZiBpZGVudGlmaWVyIGZvciBtZXRob2QgYXJndW1lbnRcblx0XHRcdGxldCBhcmd1bWVudCA9IHNpbmd1bGFyaXplKGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5yZW1vdmVXaGVyZSgke2xpc3R9LCAke2FyZ3VtZW50fSA9PiAke2NvbmRpdGlvbn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRSYW5kb20gKGluLXBsYWNlKSBsaXN0IG1hbmlwdWxhdGlvbi5cbi8vXG5cbi8vIFJldmVyc2UgbGlzdCBpbi1wbGFjZS5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmV2ZXJzZVwiLFxuXHRcInJldmVyc2Uge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9yZXZlcnNlIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnJldmVyc2UoJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gU2h1ZmZsZSBsaXN0IGluLXBsYWNlLlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9zaHVmZmxlXCIsXG5cdFwiKHJhbmRvbWl6ZXxzaHVmZmxlKSB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3NodWZmbGUgZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuc2h1ZmZsZSgke2xpc3R9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIEl0ZXJhdGlvblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9pdGVyYXRpb25cIixcblx0XCJmb3IgKGVhY2gpPyB7aXRlbVZhcjppZGVudGlmaWVyfSg/OihhbmR8LCkge3Bvc2l0aW9uVmFyOmlkZW50aWZpZXJ9KT8gaW4ge2xpc3Q6ZXhwcmVzc2lvbn06P1wiLFxuXHRjbGFzcyBsaXN0X2l0ZXJhdGlvbiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpdGVtVmFyLCBwb3NpdGlvblZhciwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0aWYgKHBvc2l0aW9uVmFyKSB7XG5cdFx0XHRcdHJldHVybiBgZm9yIChsZXQgJHtwb3NpdGlvblZhcn0gPSAxOyAke3Bvc2l0aW9uVmFyfSA8PSAke2xpc3R9Lmxlbmd0aDsgJHtwb3NpdGlvblZhcn0rKykge1xcbmBcblx0XHRcdFx0XHQrICBgXHRsZXQgJHtpdGVtVmFyfSA9ICR7bGlzdH1bJHtwb3NpdGlvblZhcn0tMV1gO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGBmb3IgKGxldCAke2l0ZW1WYXJ9IG9mICR7bGlzdH0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gUmFuZ2Vcbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJyYW5nZV9leHByZXNzaW9uXCIsXG5cdFwicmFuZ2Uge3N0YXJ0OmV4cHJlc3Npb259IHRvIHtlbmQ6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgcmFuZ2VfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhcnQsIGVuZCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5nZSgke3N0YXJ0fSwgJHtlbmR9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2xpc3RzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBpbmZpeCBhbmQgcHJlZml4IG9wZXJhdG9ycy5cbi8vXG5cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcblxuLy8gQ3JlYXRlIFwib3BlcmF0b3JzXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcIm9wZXJhdG9yc1wiKTtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gSW1wb3J0IGNvcmUgcnVsZXMuXG5pbXBvcnQgXCIuL2NvcmVcIjtcbnBhcnNlci5pbXBvcnQoXCJjb3JlXCIpO1xuXG4vLyMjIEluZml4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPiB7cmhzfWAsIGVnOiBgYSBpcyAxYFxuLy8gTk9URTogYG9wZXJhdG9yLnRvSlNgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyB0d28gYXJndW1lbnRzIChgbGhzYCBhbmQgYHJoc2ApIGludG8gb3V0cHV0LlxuXG4vLyBOT1RFOiBgcHJlY2VkZW5jZWAgbnVtYmVycyBjb21lIGZyb20gSmF2YXNjcmlwdCBlcXVpdmFsZW50c1xuLy9cdFx0IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL09wZXJhdG9ycy9PcGVyYXRvcl9QcmVjZWRlbmNlXG5cbnBhcnNlci5hZGRSdWxlKFwiaW5maXhfb3BlcmF0b3JcIiwgY2xhc3MgaW5maXhfb3BlcmF0b3IgZXh0ZW5kcyBSdWxlLkFsdGVybmF0aXZlc3t9KTtcblxuLy8gVE9ETzpcbi8vIFx0Ly8gRmluZCBiZXN0IG1hdGNoIGFjY29yZGluZyB0byBvcGVyYXRvciBwcmVjZWRlbmNlIGFzIGRlZmluZWQgYmVsb3cuXG4vLyBcdGdldEJlc3RNYXRjaChtYXRjaGVzKSB7XG4vLyBcdFx0Y29uc29sZS53YXJuKFwiR0JNXCIsIG1hdGNoZXMsIG1hdGNoZXMubWFwKG1hdGNoID0+IG1hdGNoLnByZWNlZGVuY2UpLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5tYXRjaGVkVGV4dCkpO1xuLy8gXHRcdHJldHVybiBtYXRjaGVzLnJlZHVjZShmdW5jdGlvbiAoYmVzdCwgbmV4dCkge1xuLy8gXHRcdFx0Ly8gdGFrZSBoaWdoZXN0IHByZWNlZGVuY2UgbWF0Y2ggZmlyc3Rcbi8vIFx0XHRcdGlmIChuZXh0LnByZWNlZGVuY2UgPiBiZXN0LnByZWNlZGVuY2UpIHJldHVybiBuZXh0O1xuLy8gXHRcdFx0Ly8gdGFrZSBsb25nZXN0IG1hdGNoIGlmIHNhbWUgcHJlY2VkZW5jZVxuLy8gXHRcdFx0aWYgKG5leHQucHJlY2VkZW5jZSA9PT0gYmVzdC5wcmVjZWRlbmNlKSB7XG4vLyBcdFx0XHRcdGlmIChuZXh0LmVuZEluZGV4ID4gYmVzdC5lbmRJbmRleCkgcmV0dXJuIG5leHQ7XG4vLyBcdFx0XHR9XG4vLyBcdFx0XHRyZXR1cm4gYmVzdDtcbi8vIFx0XHR9LCBtYXRjaGVzWzBdKTtcbi8vIFx0fVxuXG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImluZml4X29wZXJhdG9yX2V4cHJlc3Npb25cIixcblx0XCJ7bGhzOmV4cHJlc3Npb259IHtvcGVyYXRvcjppbmZpeF9vcGVyYXRvcn0ge3JoczpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHQvLyBXZSBDQU5OT1QgbWF0Y2ggaWYgYGluZml4X29wZXJhdG9yYCBpc24ndCBmb3VuZCBpbiB0aGUgZXhwcmVzc2lvbi5cblx0XHR0ZXN0UnVsZSA9IFwiaW5maXhfb3BlcmF0b3JcIjtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxocywgcmhzLCBvcGVyYXRvciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIG9wZXJhdG9yLnRvSlMobGhzLnRvU291cmNlKGNvbnRleHQpLCByaHMudG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdH1cblx0fVxuKTtcblxuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiYW5kXCIsXG5cdGNsYXNzIGFuZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSA2OyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICYmICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJvclwiLFxuXHRjbGFzcyBvciBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSA1OyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9IHx8ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpc1wiLFxuXHQgY2xhc3MgaXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gPT0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3RcIixcblx0IGNsYXNzIGlzX25vdCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAhPSAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgZXhhY3RseVwiLFxuXHRjbGFzcyBpc19leGFjdGx5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBleGFjdGx5XCIsXG5cdCBjbGFzcyAgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT09ICR7Yn0pYCB9IH1cbik7XG5cbi8vVE9ETzogYHNwZWxsLmlzT2ZUeXBlKHRoaW5nLCB0eXBlKWBcbi8vVE9ETzogYGlzIHNhbWUgdHlwZSBhc2AgP1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGFcIixcblx0IGNsYXNzIGlzX2EgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGBzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGFuXCIsXG5cdCBjbGFzcyBpc19hbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYHNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgYVwiLFxuXHQgY2xhc3MgaXNfbm90X2EgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGAhc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgYW5cIixcblx0IGNsYXNzIGlzX25vdF9hbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgdHlwZSkgeyByZXR1cm4gYCFzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xuXG4vL1RPRE86IGBzcGVsbC5jb250YWlucyhjb2xsZWN0aW9uLCB0aGluZylgXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgaW5cIixcblx0IGNsYXNzIGlzX2luIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBvbmUgb2ZcIixcblx0IGNsYXNzIGlzX29uZV9vZiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgaW5cIixcblx0IGNsYXNzIGlzX25vdF9pbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBvbmUgb2ZcIixcblx0IGNsYXNzIGlzX25vdF9vbmVfb2YgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxuXG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpbmNsdWRlc1wiLFxuXHQgY2xhc3MgaW5jbHVkZXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImNvbnRhaW5zXCIsXG5cdCBjbGFzcyBjb250YWlucyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJkb2VzIG5vdCBpbmNsdWRlXCIsXG5cdCBjbGFzcyBkb2VzX25vdF9pbmNsdWRlIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiZG9lcyBub3QgY29udGFpblwiLFxuXHQgY2xhc3MgZG9lc19ub3RfY29udGFpbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIj5cIixcblx0IGNsYXNzIGd0IGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgZ3JlYXRlciB0aGFuXCIsXG5cdCBjbGFzcyBpc19ncmVhdGVyX3RoYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+ICR7Yn0pYCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIj49XCIsXG5cdCBjbGFzcyBndGUgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9ID49ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvXCIsXG5cdCBjbGFzcyBpc19ndGUgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+PSAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCI8XCIsXG5cdCBjbGFzcyBsdCBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGxlc3MgdGhhblwiLFxuXHQgY2xhc3MgaXNfbGVzc190aGFuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPCAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCI8PVwiLFxuXHQgY2xhc3MgbHRlIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA8PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGxlc3MgdGhhbiBvciBlcXVhbCB0b1wiLFxuXHQgY2xhc3MgaXNfbHRlIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPD0gJHtifSlgIH0gfVxuKTtcblxuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJcXFxcK1wiLFxuXHQgY2xhc3MgcGx1cyBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSArICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJwbHVzXCIsXG5cdCBjbGFzcyBwbHVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSArICR7Yn1gIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiLVwiLFxuXHQgY2xhc3MgbWludXMgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMzsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLSAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwibWludXNcIixcblx0IGNsYXNzIG1pbnVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEzOyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAtICR7Yn1gIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiXFxcXCpcIixcblx0IGNsYXNzIHRpbWVzIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTQ7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICogJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcInRpbWVzXCIsXG5cdCBjbGFzcyB0aW1lcyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKiAke2J9YCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIi9cIixcblx0IGNsYXNzIGRpdmlkZWRfYnkgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLyAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiZGl2aWRlZCBieVwiLFxuXHQgY2xhc3MgZGl2aWRlZF9ieSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxNDsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLyAke2J9YCB9IH1cbik7XG5cbi8vVE9ETzogIGArPWAgZXRjPyAgb3RoZXIgbWF0aCBmdW5jdGlvbnM/XG5cblxuLy9cbi8vXG4vLyMjIFBvc3RpZnggb3BlcmF0b3JzOiAgIGB7bGhzfSA8b3BlcmF0b3I+YCwgZS5nLiBgYSBpcyBkZWZpbmVkYFxuLy8gTk9URTogYG9wZXJhdG9yLnRvSlNgIE1VU1QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggdHJhbnNmb3JtcyBhcmd1bWVudCAoYGxoc2ApIGludG8gSlMgb3V0cHV0LlxuXG5wYXJzZXIuYWRkUnVsZShcInBvc3RmaXhfb3BlcmF0b3JcIiwgY2xhc3MgcG9zdGZpeF9vcGVyYXRvciBleHRlbmRzIFJ1bGUuQWx0ZXJuYXRpdmVze30pO1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwb3N0Zml4X29wZXJhdG9yX2V4cHJlc3Npb25cIixcblx0XCJ7ZXhwcmVzc2lvbn0ge29wZXJhdG9yOnBvc3RmaXhfb3BlcmF0b3J9XCIsXG5cdGNsYXNzIHBvc3RmaXhfb3BlcmF0b3JfZXhwcmVzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHQvLyBXZSBDQU5OT1QgbWF0Y2ggaWYgYHBvc3RmaXhfb3BlcmF0b3JgIGlzbid0IGZvdW5kIGluIHRoZSBleHByZXNzaW9uLlxuXHRcdHRlc3RSdWxlID0gXCJwb3N0Zml4X29wZXJhdG9yXCI7XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBleHByZXNzaW9uLCBvcGVyYXRvciB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIG9wZXJhdG9yLnRvSlMoZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KSk7XG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBkZWZpbmVkXCIsXG5cdGNsYXNzIGlzX2RlZmluZWQgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSAhPT0gJ3VuZGVmaW5lZCcpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgZGVmaW5lZFwiLFxuXHRjbGFzcyBpc19ub3RfZGVmaW5lZCBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHRvSlModGhpbmcpIHsgcmV0dXJuIGAodHlwZW9mICR7dGhpbmd9ID09PSAndW5kZWZpbmVkJylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIHVuZGVmaW5lZFwiLFxuXHRjbGFzcyBpc191bmRlZmluZWQgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9IH1cbik7XG5cbi8vVE9ETzogYHNwZWxsLmlzRW1wdHkodGhpbmcpYFxucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgZW1wdHlcIixcblx0Y2xhc3MgaXNfZW1wdHkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgc3BlbGwuaXNFbXB0eSgke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIG5vdCBlbXB0eVwiLFxuXHRjbGFzcyBpc19ub3RfZW1wdHkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgIXNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9IH1cbik7XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9vcGVyYXRvcnMuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGNyZWF0aW5nIHZhcmlhYmxlcywgcHJvcGVydHkgYWNjZXNzLCBldGNcbi8vXG5cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcblxuLy8gQ3JlYXRlIFwic3RhdGVtZW50c1wiIHBhcnNlciBjb250ZXh0LlxuY29uc3QgcGFyc2VyID0gUGFyc2VyLmZvckNvbnRleHQoXCJzdGF0ZW1lbnRzXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBJbXBvcnQgY29yZSBydWxlcy5cbmltcG9ydCBcIi4vY29yZVwiO1xucGFyc2VyLmltcG9ydChcImNvcmVcIik7XG5cblxuLy9cbi8vXHQjIyBSZXR1cm5zXG4vL1xuXG4vLyBSZXR1cm4gYSB2YWx1ZVxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJyZXR1cm5fc3RhdGVtZW50XCIsIFwicmV0dXJuIHtleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByZXR1cm5fc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24gfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgcmV0dXJuICR7ZXhwcmVzc2lvbn1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vXG4vL1x0IyMgQXNzaWdubWVudFxuLy9cblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhc3NpZ25tZW50XCIsXG5cdFtcblx0XHRcInt0aGluZzpleHByZXNzaW9ufSA9IHt2YWx1ZTpleHByZXNzaW9ufVwiLFxuXHRcdFwic2V0IHt0aGluZzpleHByZXNzaW9ufSB0byB7dmFsdWU6ZXhwcmVzc2lvbn1cIixcblx0XHRcInB1dCB7dmFsdWU6ZXhwcmVzc2lvbn0gaW50byB7dGhpbmc6ZXhwcmVzc2lvbn1cIlxuXHRdLFxuXHRjbGFzcyBhc3NpZ25tZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCB2YWx1ZSB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gVE9ETzogZGVjbGFyZSBpZGVudGlmaWVyIGlmIG5vdCBpbiBzY29wZSwgZXRjXG5cdFx0XHRyZXR1cm4gYCR7dGhpbmd9ID0gJHt2YWx1ZX1gO1xuXHRcdH1cblx0fVxuKTtcblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZ2V0X2V4cHJlc3Npb25cIixcblx0XCJnZXQge3ZhbHVlOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGdldF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHZhbHVlIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7O1xuXHRcdFx0cmV0dXJuIGBpdCA9ICR7dmFsdWV9YFxuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vXG4vL1x0IyMgVXNlciBpbnRlcmFjdGlvblxuLy8gVE9ETzogbW92ZSBpbnRvIGFub3RoZXIgZmlsZVxuLy9cblxuLy8gQWxlcnQgYSBtZXNzYWdlLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhbGVydFwiLCBcImFsZXJ0IHttZXNzYWdlOmV4cHJlc3Npb259ICg/OndpdGgge29rQnV0dG9uOnRleHR9KT9cIixcblx0Y2xhc3MgYWxlcnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgb2tCdXR0b24gPSBgXCJPS1wiYCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBhd2FpdCBzcGVsbC5hbGVydCgke21lc3NhZ2V9LCAke29rQnV0dG9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gV2FybmluZyBtZXNzYWdlIC0tIGxpa2UgYWxlcnQgYnV0IGZhbmNpZXIuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcIndhcm5cIiwgXCJ3YXJuIHtleHByZXNzaW9uOmV4cHJlc3Npb259ICg/OndpdGgge29rQnV0dG9uOnRleHR9KT9cIixcblx0Y2xhc3Mgd2FybiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBva0J1dHRvbiA9IGBcIk9LXCJgIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLndhcm4oJHttZXNzYWdlfSwgJHtva0J1dHRvbn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gQ29uZmlybSBtZXNzYWdlIC0tIHByZXNlbnQgYSBxdWVzdGlvbiB3aXRoIHR3byBhbnN3ZXJzLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJjb25maXJtXCIsIFwiY29uZmlybSB7bWVzc2FnZTpleHByZXNzaW9ufSAoPzp3aXRoIHtva0J1dHRvbjp0ZXh0fSAoPzogKGFuZHxvcikge2NhbmNlbEJ1dHRvbjp0ZXh0fSk/ICk/XCIsXG5cdGNsYXNzIGNvbmZpcm0gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgb2tCdXR0b24gPSBgXCJPS1wiYCwgY2FuY2VsQnV0dG9uID0gYFwiQ2FuY2VsXCJgIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLmNvbmZpcm0oJHttZXNzYWdlfSwgJHtva0J1dHRvbn0sICR7Y2FuY2VsQnV0dG9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cblxuLy8gVE9ETzogbWl4aW5zIC8gdHJhaXRzIC8gY29tcG9zZWQgY2xhc3NlcyAvIGFubm90YXRpb25zXG5cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcblxuaW1wb3J0IGdsb2JhbCBmcm9tIFwiLi4vdXRpbHMvZ2xvYmFsXCI7XG5pbXBvcnQgeyBwbHVyYWxpemUgfSBmcm9tIFwiLi4vdXRpbHMvc3RyaW5nXCI7XG5cbi8vIENyZWF0ZSBcInR5cGVzXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcInR5cGVzXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBJbXBvcnQgY29yZSBydWxlcy5cbmltcG9ydCBcIi4vY29yZVwiO1xucGFyc2VyLmltcG9ydChcImNvcmVcIik7XG5cbi8vIERlZmluZSBcInR5cGVcIiAoYS5rLmEuIFwiY2xhc3NcIikuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlZmluZV90eXBlXCIsXG5cdFwiZGVmaW5lIHR5cGUge3R5cGV9ICg/OmFzIChhfGFuKSB7c3VwZXJUeXBlOnR5cGV9KT9cIixcblx0Y2xhc3MgZGVmaW5lX3R5cGUgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdHlwZSwgc3VwZXJUeXBlIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRpZiAoc3VwZXJUeXBlKSB7XG5cdFx0XHRcdHJldHVybiBgY2xhc3MgJHt0eXBlfSBleHRlbmRzICR7c3VwZXJUeXBlfWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYGNsYXNzICR7dHlwZX1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBQcm9wZXJ0aWVzIGNsYXVzZTogY3JlYXRlcyBhbiBvYmplY3Qgd2l0aCBvbmUgb3IgbW9yZSBwcm9wZXJ0eSB2YWx1ZXMuXG4vL1x0YGZvbyA9IDEsIGJhciA9IDJgXG4vL1RPRE86IHdvdWxkIGxpa2UgdG8gdXNlIGBhbmRgIGJ1dCB0aGF0IHdpbGwgYmFyZiBvbiBleHByZXNzaW9ucy4uLlxuLy9UT0RPOiBob3cgdG8gZG8gcHJvcGVydGllcyBvbiBtdWx0aXBsZSBsaW5lcz9cbnBhcnNlci5hZGRMaXN0KFxuXHRcIm9iamVjdF9saXRlcmFsX3Byb3BlcnRpZXNcIixcblx0XCJbKHtrZXk6aWRlbnRpZmllcn0oPzo9IHt2YWx1ZTpleHByZXNzaW9ufSk/KSAsXVwiLFxuXHRjbGFzcyBvYmplY3RfbGl0ZXJhbF9wcm9wZXJ0aWVzIGV4dGVuZHMgUnVsZS5MaXN0IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgcHJvcHMgPSB0aGlzLnJlc3VsdHMubWF0Y2hlZC5tYXAoZnVuY3Rpb24gKHByb3ApIHtcblx0XHRcdFx0XHRsZXQgeyBrZXksIHZhbHVlIH0gPSBwcm9wLnJlc3VsdHM7XG5cdFx0XHRcdFx0a2V5ID0ga2V5LnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0XHRcdHZhbHVlID0gdmFsdWUgJiYgdmFsdWUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRcdFx0aWYgKHZhbHVlKSByZXR1cm4gYFwiJHtrZXl9XCI6ICR7dmFsdWV9YFxuXHRcdFx0XHRcdHJldHVybiBrZXk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGB7ICR7cHJvcHMuam9pbihcIiwgXCIpfSB9YDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIGBuZXdgIG9yIGBjcmVhdGVgXG4vLyBUaGlzIHdvcmtzIGFzIGFuIGV4cHJlc3Npb24gT1IgYSBzdGF0ZW1lbnQuXG4vLyBOT1RFOiB3ZSBhc3N1bWUgdGhhdCBhbGwgdHlwZXMgdGFrZSBhbiBvYmplY3Qgb2YgcHJvcGVydGllcz8/Pz9cbnBhcnNlci5hZGRTZXF1ZW5jZShcblx0W1wiZXhwcmVzc2lvblwiLCBcInN0YXRlbWVudFwiXSxcblx0XCIoY3JlYXRlfG5ldykge3R5cGV9ICg/OndpdGgge3Byb3BzOm9iamVjdF9saXRlcmFsX3Byb3BlcnRpZXN9KT9cIixcblx0Y2xhc3MgbmV3X3RoaW5nIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdHlwZSwgcHJvcHMgPSBcIlwiIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIG9iamVjdCwgd2hpY2ggd2UnbGwgY3JlYXRlIHdpdGggYW4gb2JqZWN0IGxpdGVyYWwuXG5cdFx0XHRpZiAodHlwZSA9PT0gXCJPYmplY3RcIikge1xuXHRcdFx0XHRpZiAoIXByb3BzKSByZXR1cm4gXCJ7fVwiO1xuXHRcdFx0XHRyZXR1cm4gcHJvcHM7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBgbmV3ICR7dHlwZX0oJHtwcm9wc30pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy9UT0RPOiBjb25zdHJ1Y3RvclxuXG5cblxuLy9NT1ZFIFRPIGBmdW5jdGlvbnNgP1xuLy8gQXJndW1lbnRzIGNsYXVzZSBmb3IgbWV0aG9kc1xuLy9cdGB3aXRoIGZvb2Agb3IgYHdpdGggZm9vIGFuZCBiYXIgYW5kIGJhemBcbi8vVE9ETzoge2lkZW50aWZpZXJ9ID0ge2V4cHJlc3Npb259XHQ9PiByZXF1aXJlcyBgLGAgaW5zdGVhZCBvZiBgYW5kYFxuLy9UT0RPOiBgd2l0aCBmb28gYXMgVHlwZWBcbi8vVE9ETzpcdGB3aXRoIGZvby4uLmAgZm9yIHNwbGF0P1xucGFyc2VyLmFkZFNlcXVlbmNlKFxuXHRcImFyZ3NcIixcblx0XCJ3aXRoIFthcmdzOntpZGVudGlmaWVyfSAsXVwiLFxuXHRjbGFzcyBhcmdzIGV4dGVuZHMgUnVsZS5TZXF1ZW5jZSB7XG5cdFx0Ly8gUmV0dXJucyBhbiBhcnJheSBvZiBhcmd1bWVudCB2YWx1ZXNcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZXN1bHRzLmFyZ3MubWF0Y2hlZC5tYXAoYXJnID0+IGFyZy5tYXRjaGVkKTtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gRGVjbGFyZSBpbnN0YW5jZSBtZXRob2Qgb3Igbm9ybWFsIGZ1bmN0aW9uLlxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX21ldGhvZFwiLFxuXHRcIih0b3xvbikge2lkZW50aWZpZXJ9IHthcmdzfT8gKFxcXFw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGRlY2xhcmVfbWV0aG9kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIGFyZ3MsIHN0YXRlbWVudCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0YXJncyA9IChBcnJheS5pc0FycmF5KGFyZ3MpID8gYXJncy5qb2luKFwiLCBcIikgOiBcIlwiKTtcblx0XHRcdGlmICghc3RhdGVtZW50KSB7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dGhpcy5vcGVuc0Jsb2NrID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5jbG9zZXNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHJldHVybiBgJHtpZGVudGlmaWVyfSgke2FyZ3N9KSB7ICR7c3RhdGVtZW50fSB9YDtcblx0XHRcdH1cblx0XHR9XG5cdH1cbik7XG5cblxuLy8gRGVjbGFyZSBcImFjdGlvblwiLCB3aGljaCBjYW4gYmUgY2FsbGVkIGdsb2JhbGx5IGFuZCBhZmZlY3RzIHRoZSBwYXJzZXIuXG4vLyBUT0RPOiBgd2l0aGAgY2xhdXNlICh3aWxsIGNvbmZsaWN0IHdpdGggYHdvcmRgKVxuLy8gVE9ETzogaW5zdGFsbCBpbiBwYXJzZXIgc29tZWhvd1xuLy8gVE9ETzogY3JlYXRlIGluc3RhbmNlIGZ1bmN0aW9uPyAgb3IgbWF5YmUgd2UgZG9uJ3QgbmVlZCBpdDpcbi8vXHRcdFx0YGFjdGlvbiB0dXJuIENhcmQgb3ZlcmAgZm9yIGFuIGluc3RhbmNlIGlzIGp1c3QgYHR1cm4gbWUgb3ZlcmBcbi8vXHRcdFx0YGFjdGlvbiBhZGQgY2FyZCB0byBkZWNrYCA9PiBgYWRkIG1lIHRvIGRlY2tgXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJkZWNsYXJlX2FjdGlvblwiLFxuXHRcImFjdGlvbiAoa2V5d29yZHM6e3dvcmR9fHt0eXBlfSkrIChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBkZWNsYXJlX2FjdGlvbiBleHRlbmRzIFJ1bGUuQmxvY2tTdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGtleXdvcmRzLCBzdGF0ZW1lbnQsIGJsb2NrIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cblx0XHRcdC8vIGlmIHRoZXJlJ3Mgb25seSBvbmUga2V5d29yZCwgaXQgY2FuJ3QgYmUgYSBibGFja2xpc3RlZCBpZGVudGlmaWVyIG9yIGEgdHlwZVxuXHRcdFx0bGV0IGtleXdvcmRSZXN1bHRzID0gdGhpcy5yZXN1bHRzLmtleXdvcmRzO1xuXHRcdFx0aWYgKGtleXdvcmRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRsZXQga2V5d29yZCA9IGtleXdvcmRzWzBdO1xuXHRcdFx0XHRpZiAoa2V5d29yZFJlc3VsdHNbMF0ubWF0Y2hlZCBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSB0eXBlczogJHtrZXl3b3JkfWApO1xuXHRcdFx0XHR9XG5cbmNvbnNvbGUud2FybihcIkZJWE1FOiBwYXJzZXIucnVsZXMuaWRlbnRpZmllclwiKTtcbi8vIEhBQ0s6IGBnbG9iYWwucGFyc2VyYCBpcyBhIGhhY2sgaGVyZSBmb3IgY29udmVuaWVuY2UgaW4gdGVzdGluZy4uLlxuXHRcdFx0XHRsZXQgcGFyc2VyID0gY29udGV4dCA/IGNvbnRleHQucGFyc2VyIDogZ2xvYmFsLnBhcnNlcjtcblx0XHRcdFx0aWYgKHBhcnNlci5ydWxlcy5pZGVudGlmaWVyLmJsYWNrbGlzdFtrZXl3b3JkXSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSBibGFja2xpc3RlZCBpZGVudGlmaWVyc1wiOiAke2tleXdvcmR9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBhcmd1bWVudHMgYW5kL29yIHR5cGVzXG5cdFx0XHR2YXIgYXJncyA9IFtdO1xuXHRcdFx0dmFyIHR5cGVzID0gW107XG5cdFx0XHQvLyBpZiBhbnkgb2YgdGhlIHdvcmRzIGFyZSB0eXBlcyAoY2FwaXRhbCBsZXR0ZXIpIG1ha2UgdGhhdCBhbiBhcmd1bWVudCBvZiB0aGUgc2FtZSBuYW1lLlxuXHRcdFx0a2V5d29yZFJlc3VsdHMubWF0Y2hlZC5tYXAoIChpdGVtLCBpbmRleCkgPT4ge1xuXHRcdFx0XHRpZiAoaXRlbSBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdGxldCBUeXBlID0ga2V5d29yZHNbaW5kZXhdO1xuXHRcdFx0XHRcdGxldCB0eXBlID0gVHlwZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdHR5cGVzLnB1c2goW1R5cGUsIHR5cGVdKTtcblx0XHRcdFx0XHRrZXl3b3Jkc1tpbmRleF0gPSB0eXBlO1xuXHRcdFx0XHRcdGFyZ3MucHVzaCh0eXBlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQvLyBnZXQgc3RhdGljIG1ldGhvZCBuYW1lIGFuZCBhcmd1bWVudHMgZm9yIG91dHB1dFxuXHRcdFx0bGV0IG1ldGhvZE5hbWUgPSBrZXl3b3Jkcy5qb2luKFwiX1wiKTtcblx0XHRcdGFyZ3MgPSBhcmdzLmpvaW4oXCIsIFwiKTtcblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpZiB0aGVyZSBhcmUgYW55IGNvbmRpdGlvbnMgb24gdGhlIGFib3ZlXG5cdFx0XHRsZXQgY29uZGl0aW9ucyA9IHR5cGVzLm1hcCggKFtUeXBlLCB0eXBlXSkgPT4ge1xuXHRcdFx0XHRyZXR1cm4gYFxcdGlmICghc3BlbGwuaXNBKCR7dHlwZX0sICR7VHlwZX0pKSByZXR1cm4gdW5kZWZpbmVkYDtcblx0XHRcdH0pO1xuXG5cdFx0XHRsZXQgc3RhdGVtZW50cyA9IFJ1bGUuQmxvY2suZW5jbG9zZVN0YXRlbWVudHMoY29uZGl0aW9ucywgc3RhdGVtZW50LCBibG9jayk7XG5cblx0XHRcdC8vIENyZWF0ZSBhcyBhIFNUQVRJQyBmdW5jdGlvblxuXHQvL1RPRE86IGNyZWF0ZSBhcyBhbiBpbnN0YW5jZSBmdW5jdGlvbiB3ZSBjYW4gY2FsbCBvbiBvdXJzZWxmIVxuXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHttZXRob2ROYW1lfSgke2FyZ3N9KSAke3N0YXRlbWVudHN9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gR2V0dGVyIGVpdGhlciB3aXRoIG9yIHdpdGhvdXQgYXJndW1lbnRzLlxuLy8gSWYgeW91IHNwZWNpZnkgYXJndW1lbnRzLCB5aWVsZHMgYSBub3JtYWwgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhIHZhbHVlLlxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJnZXR0ZXJcIixcblx0XCJnZXQge2lkZW50aWZpZXJ9IHthcmdzfT8gKFxcXFw6KT8ge2V4cHJlc3Npb259P1wiLFxuXHRjbGFzcyBnZXR0ZXIgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJncywgZXhwcmVzc2lvbiB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0YXJncyA9IChBcnJheS5pc0FycmF5KGFyZ3MpID8gYXJncy5qb2luKFwiLCBcIikgOiBcIlwiKTtcblxuXHRcdFx0aWYgKGFyZ3MgJiYgZXhwcmVzc2lvbikge1xuXHRcdFx0XHR0aGlzLm9wZW5zQmxvY2sgPSB0cnVlO1xuXHRcdFx0XHR0aGlzLmNsb3Nlc0Jsb2NrID0gdHJ1ZTtcblx0XHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pIHsgcmV0dXJuICgke2V4cHJlc3Npb259KSB9YDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGFyZ3MpIHtcblx0XHRcdFx0cmV0dXJuIGAke2lkZW50aWZpZXJ9KCR7YXJnc30pYDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGV4cHJlc3Npb24pIHtcblx0XHRcdFx0dGhpcy5vcGVuc0Jsb2NrID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5jbG9zZXNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHJldHVybiBgZ2V0ICR7aWRlbnRpZmllcn0oKSB7IHJldHVybiAoJHtleHByZXNzaW9ufSkgfWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSgpYDtcblx0XHRcdH1cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBTZXR0ZXIuXG4vLyBDb21wbGFpbnMgaWYgeW91IHNwZWNpZnkgbW9yZSB0aGFuIG9uZSBhcmd1bWVudC5cbi8vIElmIHlvdSBkb24ndCBwYXNzIGFuIGV4cGxpY2l0IGFyZ3VtZW50LCB3ZSdsbCBhc3N1bWUgaXQncyB0aGUgc2FtZSBhcyB0aGUgaWRlbnRpZmllci5cbi8vIGVnO1x0YHNldCBjb2xvcjogc2V0IHRoZSBjb2xvciBvZiBteSB0ZXh0IHRvIGNvbG9yYFxuLy9cbi8vIFRPRE86IGludGVybmFsIGdldHRlci9zZXR0ZXIgc2VtYW50aWNzIGFsYSBvYmplY3RpdmUgQ1xuLy9cdFx0XHRgc2V0IGNvbG9yOiBpZiBjb2xvciBpcyBpbiBbXCJyZWRcIiwgXCJibHVlXCJdIHRoZW4gc2V0IG15IGNvbG9yIHRvIGNvbG9yYFxuLy9cdFx0ID0+IGBteSBjb2xvcmAgd2l0aGluIHNldHRlciBzaG91bGQgYXV0b21hdGljYWxseSB0cmFuc2xhdGUgdG8gYHRoaXMuX2NvbG9yYCA/Pz9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwic2V0dGVyXCIsXG5cdFwic2V0IHtpZGVudGlmaWVyfSB7YXJnc30/IChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBzZXR0ZXIgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgYXJncyA9IFtpZGVudGlmaWVyXSwgc3RhdGVtZW50ID0gXCJcIiB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gQ29tcGxhaW4gaWYgbW9yZSB0aGFuIG9uZSBhcmd1bWVudFxuXHRcdFx0aWYgKGFyZ3MgJiYgYXJncy5sZW5ndGggPiAxKSB7XG5cdFx0XHRcdGNvbnNvbGUud2FybihcInBhcnNlKCdzZXR0ZXInKTogb25seSBvbmUgYXJndW1lbnQgYWxsb3dlZCBpbiBzZXR0ZXI6ICBcIiwgdGhpcy5tYXRjaGVkVGV4dCk7XG5cdFx0XHRcdGFyZ3MgPSBbIGFyZ3NbMF0gXTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFzdGF0ZW1lbnQpIHtcblx0XHRcdFx0cmV0dXJuIGBzZXQgJHtpZGVudGlmaWVyfSgke2FyZ3N9KWA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0dGhpcy5vcGVuc0Jsb2NrID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5jbG9zZXNCbG9jayA9IHRydWU7XG5cdFx0XHRcdHJldHVybiBgc2V0ICR7aWRlbnRpZmllcn0oJHthcmdzfSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vXG4vL1x0ZGVjbGFyZSBwcm9wZXJ0aWVzXG4vL1xuXG4vL1RPRE86IGFub3RoZXIgbmFtZSBmb3IgYGNvbnN0YW50YCA/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlcIixcblx0XCIoc2NvcGU6cHJvcGVydHl8Y29uc3RhbnR8c2hhcmVkIHByb3BlcnR5KSB7aWRlbnRpZmllcn0gKD86PSB7dmFsdWU6ZXhwcmVzc2lvbn0pP1wiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHNjb3BlLCBpZGVudGlmaWVyLCB2YWx1ZSA9IFwiXCIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGlmICh2YWx1ZSkgdmFsdWUgPSBgID0gJHt2YWx1ZX1gO1xuXG5cdFx0XHRsZXQgZGVjbGFyYXRpb24gPSBgJHtpZGVudGlmaWVyfSR7dmFsdWV9YDtcblx0XHRcdHN3aXRjaCAoc2NvcGUpIHtcblx0XHRcdFx0Y2FzZSBcImNvbnN0YW50XCI6XG5cdFx0XHRcdFx0aWYgKCF2YWx1ZSkgY29uc29sZS53YXJuKFwicGFyc2UoJ2RlY2xhcmVfcHJvcGVydHknKTogY29uc3RhbnQgcHJvcGVydGllcyBtdXN0IGRlY2xhcmUgYSB2YWx1ZTogIFwiLCB0aGlzLm1hdGNoZWRUZXh0KTtcblx0XHRcdFx0XHRyZXR1cm4gYGNvbnN0ICR7ZGVjbGFyYXRpb259YDtcblxuXHRcdFx0XHRjYXNlIFwic2hhcmVkIHByb3BlcnR5XCI6XG5cdFx0XHRcdFx0cmV0dXJuIGBAcHJvdG8gJHtkZWNsYXJhdGlvbn1gO1xuXG5cdFx0XHRcdGNhc2UgXCJwcm9wZXJ0eVwiOlxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybiBkZWNsYXJhdGlvbjtcblx0XHRcdH1cblx0XHR9XG5cdH1cbik7XG5cbi8vIFRPRE86IHNjb3BlX21vZGlmaWVyPz8/XG4vLyBUT0RPOiBpbml0aWFsIHZhbHVlXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImRlY2xhcmVfcHJvcGVydHlfb2ZfdHlwZVwiLFxuXHRcInByb3BlcnR5IHtpZGVudGlmaWVyfSBhcyAoYXxhbik/IHt0eXBlfVwiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5X29mX3R5cGUgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgdHlwZSB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBnZXQgJHtpZGVudGlmaWVyfSgpIHsgcmV0dXJuIHRoaXMuX18ke2lkZW50aWZpZXJ9IH1cXG5gXG5cdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAoc3BlbGwuaXNBKHZhbHVlLCAke3R5cGV9KSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZGVjbGFyZV9wcm9wZXJ0eV9hc19vbmVfb2ZcIixcblx0XCJwcm9wZXJ0eSB7aWRlbnRpZmllcn0gYXMgb25lIG9mIHtsaXN0OmxpdGVyYWxfbGlzdH1cIixcblx0Y2xhc3MgZGVjbGFyZV9wcm9wZXJ0eV9hc19vbmVfb2YgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0bGV0IHBsdXJhbCA9IHBsdXJhbGl6ZShpZGVudGlmaWVyKTtcblx0XHRcdHJldHVybiBgQHByb3RvICR7cGx1cmFsfSA9ICR7bGlzdH1cXG5gXG5cdFx0XHRcdCArIGBnZXQgJHtpZGVudGlmaWVyfSgpIHsgcmV0dXJuIHRoaXMuX18ke2lkZW50aWZpZXJ9ID09PSB1bmRlZmluZWQgPyB0aGlzLiR7cGx1cmFsfVswXSA6IHRoaXMuX18ke2lkZW50aWZpZXJ9IH1cXG5gXG5cdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXG4vLyBNT1JFIEVGRklDSUVOVCBCVVQgVUdMSUVSXG4vLyBcdFx0XHRyZXR1cm4gYHN0YXRpYyAke3BsdXJhbH0gPSAke2xpc3R9O1xcbmBcbi8vIFx0XHRcdFx0ICsgYGdldCAke2lkZW50aWZpZXJ9IHsgcmV0dXJuIChcIl9fJHtpZGVudGlmaWVyfVwiIGluIHRoaXMgPyB0aGlzLl9fJHtpZGVudGlmaWVyfSA6ICR7Zmlyc3RWYWx1ZX0pIH1cXG5gXG4vLyBcdFx0XHRcdCArIGBzZXQgJHtpZGVudGlmaWVyfSh2YWx1ZSkgeyBpZiAodGhpcy5jb25zdHJ1Y3Rvci4ke3BsdXJhbH0uaW5jbHVkZXModmFsdWUpKSB0aGlzLl9fJHtpZGVudGlmaWVyfSA9IHZhbHVlIH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdFNlbGYtcmVmZXJlbmNlXG4vL1xucGFyc2VyLmFkZEtleXdvcmQoXG5cdFtcIm1lXCIsIFwiZXhwcmVzc2lvblwiXSxcblx0XCJtZVwiLFxuXHRjbGFzcyBtZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0cmV0dXJuIFwidGhpc1wiO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gVE9ETzogdGhpcyByZWFsbHkgbWFrZXMgbWUgd2FudCB0byBtYWtlIGBJIGFtIGVtcHR5YCBldGMgd29yay4uLlxucGFyc2VyLmFkZEtleXdvcmQoXG5cdFtcIklcIiwgXCJleHByZXNzaW9uXCJdLFxuXHRcIklcIixcblx0Y2xhc3MgSSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0cmV0dXJuIFwidGhpc1wiO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdFByb3BlcnR5IGFjY2Vzc1xuLy9cblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicHJvcGVydHlfZXhwcmVzc2lvblwiLFxuXHRcIihwcm9wZXJ0aWVzOnRoZSB7aWRlbnRpZmllcn0gb2YpKyB0aGU/IHtleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBwcm9wZXJ0eV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRnZXRNYXRjaGVkU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHByb3BlcnRpZXMgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4cHJlc3Npb246IGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCksXG5cdFx0XHRcdHByb3BlcnRpZXM6IHByb3BlcnRpZXMubWF0Y2hlZC5tYXAoIHByb3BlcnR5ID0+IHByb3BlcnR5LnJlc3VsdHMuaWRlbnRpZmllci50b1NvdXJjZShjb250ZXh0KSApXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGV4cHJlc3Npb24sIHByb3BlcnRpZXMgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHByb3BlcnRpZXMgPSBwcm9wZXJ0aWVzLnJldmVyc2UoKS5qb2luKFwiLlwiKTtcblx0XHRcdHJldHVybiBgJHtleHByZXNzaW9ufS4ke3Byb3BlcnRpZXN9YDtcbi8vIE5PVEU6IHRoZSBmb2xsb3dpbmcgaXMgc2FmZXIsIGJ1dCB1Z2x5IGZvciBkZW1vIHB1cnBvc2VzXG4vL1x0XHRcdHJldHVybiBgc3BlbGwuZ2V0KCR7ZXhwcmVzc2lvbn0sIFsnJHtwcm9wZXJ0aWVzfSddKWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJteV9wcm9wZXJ0eV9leHByZXNzaW9uXCIsXG5cdFwiKG15fHRoaXMpIHtpZGVudGlmaWVyfVwiLFxuXHRjbGFzcyBteV9wcm9wZXJ0eV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHRoaXMuJHtpZGVudGlmaWVyfWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL3R5cGVzLmpzIiwiZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2xpYi9jc3MtYmFzZS5qc1wiKSh1bmRlZmluZWQpO1xuLy8gaW1wb3J0c1xuXG5cbi8vIG1vZHVsZVxuZXhwb3J0cy5wdXNoKFttb2R1bGUuaWQsIFwiLm9hay5zcGFjZXIge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgZGlzcGxheTogYmxvY2s7XFxufVxcbi5vYWsuc3BhY2VyLmlubGluZSB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICB2ZXJ0aWNhbC1hbGlnbjogYmFzZWxpbmU7XFxufVxcbi5vYWsuc3BhY2VyLmZsdWlkIHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgZmxleDogMSAxIDEwMCU7XFxufVxcbi5vYWsuc3BhY2VyLnRpbnkge1xcbiAgd2lkdGg6IDJweDtcXG4gIGhlaWdodDogMnB4O1xcbn1cXG4ub2FrLnNwYWNlci5zbWFsbCB7XFxuICB3aWR0aDogNHB4O1xcbiAgaGVpZ2h0OiA0cHg7XFxufVxcbi5vYWsuc3BhY2VyLm1lZGl1bSB7XFxuICB3aWR0aDogMTBweDtcXG4gIGhlaWdodDogMTBweDtcXG59XFxuLm9hay5zcGFjZXIubGFyZ2Uge1xcbiAgd2lkdGg6IDIwcHg7XFxuICBoZWlnaHQ6IDIwcHg7XFxufVxcbi5vYWsuc3BhY2VyLmh1Z2Uge1xcbiAgd2lkdGg6IDMwcHg7XFxuICBoZWlnaHQ6IDMwcHg7XFxufVxcbi5vYWsuc3BhY2VyLm1hc3NpdmUge1xcbiAgd2lkdGg6IDUwcHg7XFxuICBoZWlnaHQ6IDUwcHg7XFxufVxcblwiLCBcIlwiXSk7XG5cbi8vIGV4cG9ydHNcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9jc3MtbG9hZGVyIS4vfi9sZXNzLWxvYWRlci9kaXN0IS4vc3JjL2FwcC9TcGFjZXIubGVzc1xuLy8gbW9kdWxlIGlkID0gNDcyXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsImV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9saWIvY3NzLWJhc2UuanNcIikodW5kZWZpbmVkKTtcbi8vIGltcG9ydHNcblxuXG4vLyBtb2R1bGVcbmV4cG9ydHMucHVzaChbbW9kdWxlLmlkLCBcIi5mdWxsV2lkdGgge1xcbiAgd2lkdGg6IDEwMCU7XFxufVxcbi5mdWxsSGVpZ2h0IHtcXG4gIGhlaWdodDogMTAwJTtcXG59XFxuLmZ1bGxTaXplIHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgaGVpZ2h0OiAxMDAlO1xcbn1cXG5cIiwgXCJcIl0pO1xuXG4vLyBleHBvcnRzXG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vY3NzLWxvYWRlciEuL34vbGVzcy1sb2FkZXIvZGlzdCEuL3NyYy9hcHAvc3R5bGVzLmxlc3Ncbi8vIG1vZHVsZSBpZCA9IDQ3M1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIENvcHlyaWdodCAyMDEzLXByZXNlbnQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gIHZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCdmYmpzL2xpYi9pbnZhcmlhbnQnKTtcbiAgdmFyIHdhcm5pbmcgPSByZXF1aXJlKCdmYmpzL2xpYi93YXJuaW5nJyk7XG4gIHZhciBSZWFjdFByb3BUeXBlc1NlY3JldCA9IHJlcXVpcmUoJy4vbGliL1JlYWN0UHJvcFR5cGVzU2VjcmV0Jyk7XG4gIHZhciBsb2dnZWRUeXBlRmFpbHVyZXMgPSB7fTtcbn1cblxuLyoqXG4gKiBBc3NlcnQgdGhhdCB0aGUgdmFsdWVzIG1hdGNoIHdpdGggdGhlIHR5cGUgc3BlY3MuXG4gKiBFcnJvciBtZXNzYWdlcyBhcmUgbWVtb3JpemVkIGFuZCB3aWxsIG9ubHkgYmUgc2hvd24gb25jZS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gdHlwZVNwZWNzIE1hcCBvZiBuYW1lIHRvIGEgUmVhY3RQcm9wVHlwZVxuICogQHBhcmFtIHtvYmplY3R9IHZhbHVlcyBSdW50aW1lIHZhbHVlcyB0aGF0IG5lZWQgdG8gYmUgdHlwZS1jaGVja2VkXG4gKiBAcGFyYW0ge3N0cmluZ30gbG9jYXRpb24gZS5nLiBcInByb3BcIiwgXCJjb250ZXh0XCIsIFwiY2hpbGQgY29udGV4dFwiXG4gKiBAcGFyYW0ge3N0cmluZ30gY29tcG9uZW50TmFtZSBOYW1lIG9mIHRoZSBjb21wb25lbnQgZm9yIGVycm9yIG1lc3NhZ2VzLlxuICogQHBhcmFtIHs/RnVuY3Rpb259IGdldFN0YWNrIFJldHVybnMgdGhlIGNvbXBvbmVudCBzdGFjay5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGNoZWNrUHJvcFR5cGVzKHR5cGVTcGVjcywgdmFsdWVzLCBsb2NhdGlvbiwgY29tcG9uZW50TmFtZSwgZ2V0U3RhY2spIHtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICBmb3IgKHZhciB0eXBlU3BlY05hbWUgaW4gdHlwZVNwZWNzKSB7XG4gICAgICBpZiAodHlwZVNwZWNzLmhhc093blByb3BlcnR5KHR5cGVTcGVjTmFtZSkpIHtcbiAgICAgICAgdmFyIGVycm9yO1xuICAgICAgICAvLyBQcm9wIHR5cGUgdmFsaWRhdGlvbiBtYXkgdGhyb3cuIEluIGNhc2UgdGhleSBkbywgd2UgZG9uJ3Qgd2FudCB0b1xuICAgICAgICAvLyBmYWlsIHRoZSByZW5kZXIgcGhhc2Ugd2hlcmUgaXQgZGlkbid0IGZhaWwgYmVmb3JlLiBTbyB3ZSBsb2cgaXQuXG4gICAgICAgIC8vIEFmdGVyIHRoZXNlIGhhdmUgYmVlbiBjbGVhbmVkIHVwLCB3ZSdsbCBsZXQgdGhlbSB0aHJvdy5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBUaGlzIGlzIGludGVudGlvbmFsbHkgYW4gaW52YXJpYW50IHRoYXQgZ2V0cyBjYXVnaHQuIEl0J3MgdGhlIHNhbWVcbiAgICAgICAgICAvLyBiZWhhdmlvciBhcyB3aXRob3V0IHRoaXMgc3RhdGVtZW50IGV4Y2VwdCB3aXRoIGEgYmV0dGVyIG1lc3NhZ2UuXG4gICAgICAgICAgaW52YXJpYW50KHR5cGVvZiB0eXBlU3BlY3NbdHlwZVNwZWNOYW1lXSA9PT0gJ2Z1bmN0aW9uJywgJyVzOiAlcyB0eXBlIGAlc2AgaXMgaW52YWxpZDsgaXQgbXVzdCBiZSBhIGZ1bmN0aW9uLCB1c3VhbGx5IGZyb20gJyArICdSZWFjdC5Qcm9wVHlwZXMuJywgY29tcG9uZW50TmFtZSB8fCAnUmVhY3QgY2xhc3MnLCBsb2NhdGlvbiwgdHlwZVNwZWNOYW1lKTtcbiAgICAgICAgICBlcnJvciA9IHR5cGVTcGVjc1t0eXBlU3BlY05hbWVdKHZhbHVlcywgdHlwZVNwZWNOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgbnVsbCwgUmVhY3RQcm9wVHlwZXNTZWNyZXQpO1xuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgIGVycm9yID0gZXg7XG4gICAgICAgIH1cbiAgICAgICAgd2FybmluZyghZXJyb3IgfHwgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciwgJyVzOiB0eXBlIHNwZWNpZmljYXRpb24gb2YgJXMgYCVzYCBpcyBpbnZhbGlkOyB0aGUgdHlwZSBjaGVja2VyICcgKyAnZnVuY3Rpb24gbXVzdCByZXR1cm4gYG51bGxgIG9yIGFuIGBFcnJvcmAgYnV0IHJldHVybmVkIGEgJXMuICcgKyAnWW91IG1heSBoYXZlIGZvcmdvdHRlbiB0byBwYXNzIGFuIGFyZ3VtZW50IHRvIHRoZSB0eXBlIGNoZWNrZXIgJyArICdjcmVhdG9yIChhcnJheU9mLCBpbnN0YW5jZU9mLCBvYmplY3RPZiwgb25lT2YsIG9uZU9mVHlwZSwgYW5kICcgKyAnc2hhcGUgYWxsIHJlcXVpcmUgYW4gYXJndW1lbnQpLicsIGNvbXBvbmVudE5hbWUgfHwgJ1JlYWN0IGNsYXNzJywgbG9jYXRpb24sIHR5cGVTcGVjTmFtZSwgdHlwZW9mIGVycm9yKTtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgIShlcnJvci5tZXNzYWdlIGluIGxvZ2dlZFR5cGVGYWlsdXJlcykpIHtcbiAgICAgICAgICAvLyBPbmx5IG1vbml0b3IgdGhpcyBmYWlsdXJlIG9uY2UgYmVjYXVzZSB0aGVyZSB0ZW5kcyB0byBiZSBhIGxvdCBvZiB0aGVcbiAgICAgICAgICAvLyBzYW1lIGVycm9yLlxuICAgICAgICAgIGxvZ2dlZFR5cGVGYWlsdXJlc1tlcnJvci5tZXNzYWdlXSA9IHRydWU7XG5cbiAgICAgICAgICB2YXIgc3RhY2sgPSBnZXRTdGFjayA/IGdldFN0YWNrKCkgOiAnJztcblxuICAgICAgICAgIHdhcm5pbmcoZmFsc2UsICdGYWlsZWQgJXMgdHlwZTogJXMlcycsIGxvY2F0aW9uLCBlcnJvci5tZXNzYWdlLCBzdGFjayAhPSBudWxsID8gc3RhY2sgOiAnJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjaGVja1Byb3BUeXBlcztcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL2NoZWNrUHJvcFR5cGVzLmpzXG4vLyBtb2R1bGUgaWQgPSA0NzRcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZW1wdHlGdW5jdGlvbiA9IHJlcXVpcmUoJ2ZianMvbGliL2VtcHR5RnVuY3Rpb24nKTtcbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCdmYmpzL2xpYi9pbnZhcmlhbnQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgLy8gSW1wb3J0YW50IVxuICAvLyBLZWVwIHRoaXMgbGlzdCBpbiBzeW5jIHdpdGggcHJvZHVjdGlvbiB2ZXJzaW9uIGluIGAuL2ZhY3RvcnlXaXRoVHlwZUNoZWNrZXJzLmpzYC5cbiAgZnVuY3Rpb24gc2hpbSgpIHtcbiAgICBpbnZhcmlhbnQoXG4gICAgICBmYWxzZSxcbiAgICAgICdDYWxsaW5nIFByb3BUeXBlcyB2YWxpZGF0b3JzIGRpcmVjdGx5IGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIGBwcm9wLXR5cGVzYCBwYWNrYWdlLiAnICtcbiAgICAgICdVc2UgUHJvcFR5cGVzLmNoZWNrUHJvcFR5cGVzKCkgdG8gY2FsbCB0aGVtLiAnICtcbiAgICAgICdSZWFkIG1vcmUgYXQgaHR0cDovL2ZiLm1lL3VzZS1jaGVjay1wcm9wLXR5cGVzJ1xuICAgICk7XG4gIH07XG4gIHNoaW0uaXNSZXF1aXJlZCA9IHNoaW07XG4gIGZ1bmN0aW9uIGdldFNoaW0oKSB7XG4gICAgcmV0dXJuIHNoaW07XG4gIH07XG4gIHZhciBSZWFjdFByb3BUeXBlcyA9IHtcbiAgICBhcnJheTogc2hpbSxcbiAgICBib29sOiBzaGltLFxuICAgIGZ1bmM6IHNoaW0sXG4gICAgbnVtYmVyOiBzaGltLFxuICAgIG9iamVjdDogc2hpbSxcbiAgICBzdHJpbmc6IHNoaW0sXG4gICAgc3ltYm9sOiBzaGltLFxuXG4gICAgYW55OiBzaGltLFxuICAgIGFycmF5T2Y6IGdldFNoaW0sXG4gICAgZWxlbWVudDogc2hpbSxcbiAgICBpbnN0YW5jZU9mOiBnZXRTaGltLFxuICAgIG5vZGU6IHNoaW0sXG4gICAgb2JqZWN0T2Y6IGdldFNoaW0sXG4gICAgb25lT2Y6IGdldFNoaW0sXG4gICAgb25lT2ZUeXBlOiBnZXRTaGltLFxuICAgIHNoYXBlOiBnZXRTaGltXG4gIH07XG5cbiAgUmVhY3RQcm9wVHlwZXMuY2hlY2tQcm9wVHlwZXMgPSBlbXB0eUZ1bmN0aW9uO1xuICBSZWFjdFByb3BUeXBlcy5Qcm9wVHlwZXMgPSBSZWFjdFByb3BUeXBlcztcblxuICByZXR1cm4gUmVhY3RQcm9wVHlwZXM7XG59O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3Byb3AtdHlwZXMvZmFjdG9yeVdpdGhUaHJvd2luZ1NoaW1zLmpzXG4vLyBtb2R1bGUgaWQgPSA0NzVcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZW1wdHlGdW5jdGlvbiA9IHJlcXVpcmUoJ2ZianMvbGliL2VtcHR5RnVuY3Rpb24nKTtcbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCdmYmpzL2xpYi9pbnZhcmlhbnQnKTtcbnZhciB3YXJuaW5nID0gcmVxdWlyZSgnZmJqcy9saWIvd2FybmluZycpO1xuXG52YXIgUmVhY3RQcm9wVHlwZXNTZWNyZXQgPSByZXF1aXJlKCcuL2xpYi9SZWFjdFByb3BUeXBlc1NlY3JldCcpO1xudmFyIGNoZWNrUHJvcFR5cGVzID0gcmVxdWlyZSgnLi9jaGVja1Byb3BUeXBlcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGlzVmFsaWRFbGVtZW50LCB0aHJvd09uRGlyZWN0QWNjZXNzKSB7XG4gIC8qIGdsb2JhbCBTeW1ib2wgKi9cbiAgdmFyIElURVJBVE9SX1NZTUJPTCA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgU3ltYm9sLml0ZXJhdG9yO1xuICB2YXIgRkFVWF9JVEVSQVRPUl9TWU1CT0wgPSAnQEBpdGVyYXRvcic7IC8vIEJlZm9yZSBTeW1ib2wgc3BlYy5cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgaXRlcmF0b3IgbWV0aG9kIGZ1bmN0aW9uIGNvbnRhaW5lZCBvbiB0aGUgaXRlcmFibGUgb2JqZWN0LlxuICAgKlxuICAgKiBCZSBzdXJlIHRvIGludm9rZSB0aGUgZnVuY3Rpb24gd2l0aCB0aGUgaXRlcmFibGUgYXMgY29udGV4dDpcbiAgICpcbiAgICogICAgIHZhciBpdGVyYXRvckZuID0gZ2V0SXRlcmF0b3JGbihteUl0ZXJhYmxlKTtcbiAgICogICAgIGlmIChpdGVyYXRvckZuKSB7XG4gICAqICAgICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhdG9yRm4uY2FsbChteUl0ZXJhYmxlKTtcbiAgICogICAgICAgLi4uXG4gICAqICAgICB9XG4gICAqXG4gICAqIEBwYXJhbSB7P29iamVjdH0gbWF5YmVJdGVyYWJsZVxuICAgKiBAcmV0dXJuIHs/ZnVuY3Rpb259XG4gICAqL1xuICBmdW5jdGlvbiBnZXRJdGVyYXRvckZuKG1heWJlSXRlcmFibGUpIHtcbiAgICB2YXIgaXRlcmF0b3JGbiA9IG1heWJlSXRlcmFibGUgJiYgKElURVJBVE9SX1NZTUJPTCAmJiBtYXliZUl0ZXJhYmxlW0lURVJBVE9SX1NZTUJPTF0gfHwgbWF5YmVJdGVyYWJsZVtGQVVYX0lURVJBVE9SX1NZTUJPTF0pO1xuICAgIGlmICh0eXBlb2YgaXRlcmF0b3JGbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIGl0ZXJhdG9yRm47XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbGxlY3Rpb24gb2YgbWV0aG9kcyB0aGF0IGFsbG93IGRlY2xhcmF0aW9uIGFuZCB2YWxpZGF0aW9uIG9mIHByb3BzIHRoYXQgYXJlXG4gICAqIHN1cHBsaWVkIHRvIFJlYWN0IGNvbXBvbmVudHMuIEV4YW1wbGUgdXNhZ2U6XG4gICAqXG4gICAqICAgdmFyIFByb3BzID0gcmVxdWlyZSgnUmVhY3RQcm9wVHlwZXMnKTtcbiAgICogICB2YXIgTXlBcnRpY2xlID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuICAgKiAgICAgcHJvcFR5cGVzOiB7XG4gICAqICAgICAgIC8vIEFuIG9wdGlvbmFsIHN0cmluZyBwcm9wIG5hbWVkIFwiZGVzY3JpcHRpb25cIi5cbiAgICogICAgICAgZGVzY3JpcHRpb246IFByb3BzLnN0cmluZyxcbiAgICpcbiAgICogICAgICAgLy8gQSByZXF1aXJlZCBlbnVtIHByb3AgbmFtZWQgXCJjYXRlZ29yeVwiLlxuICAgKiAgICAgICBjYXRlZ29yeTogUHJvcHMub25lT2YoWydOZXdzJywnUGhvdG9zJ10pLmlzUmVxdWlyZWQsXG4gICAqXG4gICAqICAgICAgIC8vIEEgcHJvcCBuYW1lZCBcImRpYWxvZ1wiIHRoYXQgcmVxdWlyZXMgYW4gaW5zdGFuY2Ugb2YgRGlhbG9nLlxuICAgKiAgICAgICBkaWFsb2c6IFByb3BzLmluc3RhbmNlT2YoRGlhbG9nKS5pc1JlcXVpcmVkXG4gICAqICAgICB9LFxuICAgKiAgICAgcmVuZGVyOiBmdW5jdGlvbigpIHsgLi4uIH1cbiAgICogICB9KTtcbiAgICpcbiAgICogQSBtb3JlIGZvcm1hbCBzcGVjaWZpY2F0aW9uIG9mIGhvdyB0aGVzZSBtZXRob2RzIGFyZSB1c2VkOlxuICAgKlxuICAgKiAgIHR5cGUgOj0gYXJyYXl8Ym9vbHxmdW5jfG9iamVjdHxudW1iZXJ8c3RyaW5nfG9uZU9mKFsuLi5dKXxpbnN0YW5jZU9mKC4uLilcbiAgICogICBkZWNsIDo9IFJlYWN0UHJvcFR5cGVzLnt0eXBlfSguaXNSZXF1aXJlZCk/XG4gICAqXG4gICAqIEVhY2ggYW5kIGV2ZXJ5IGRlY2xhcmF0aW9uIHByb2R1Y2VzIGEgZnVuY3Rpb24gd2l0aCB0aGUgc2FtZSBzaWduYXR1cmUuIFRoaXNcbiAgICogYWxsb3dzIHRoZSBjcmVhdGlvbiBvZiBjdXN0b20gdmFsaWRhdGlvbiBmdW5jdGlvbnMuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiAgdmFyIE15TGluayA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcbiAgICogICAgcHJvcFR5cGVzOiB7XG4gICAqICAgICAgLy8gQW4gb3B0aW9uYWwgc3RyaW5nIG9yIFVSSSBwcm9wIG5hbWVkIFwiaHJlZlwiLlxuICAgKiAgICAgIGhyZWY6IGZ1bmN0aW9uKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSkge1xuICAgKiAgICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICogICAgICAgIGlmIChwcm9wVmFsdWUgIT0gbnVsbCAmJiB0eXBlb2YgcHJvcFZhbHVlICE9PSAnc3RyaW5nJyAmJlxuICAgKiAgICAgICAgICAgICEocHJvcFZhbHVlIGluc3RhbmNlb2YgVVJJKSkge1xuICAgKiAgICAgICAgICByZXR1cm4gbmV3IEVycm9yKFxuICAgKiAgICAgICAgICAgICdFeHBlY3RlZCBhIHN0cmluZyBvciBhbiBVUkkgZm9yICcgKyBwcm9wTmFtZSArICcgaW4gJyArXG4gICAqICAgICAgICAgICAgY29tcG9uZW50TmFtZVxuICAgKiAgICAgICAgICApO1xuICAgKiAgICAgICAgfVxuICAgKiAgICAgIH1cbiAgICogICAgfSxcbiAgICogICAgcmVuZGVyOiBmdW5jdGlvbigpIHsuLi59XG4gICAqICB9KTtcbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuXG4gIHZhciBBTk9OWU1PVVMgPSAnPDxhbm9ueW1vdXM+Pic7XG5cbiAgLy8gSW1wb3J0YW50IVxuICAvLyBLZWVwIHRoaXMgbGlzdCBpbiBzeW5jIHdpdGggcHJvZHVjdGlvbiB2ZXJzaW9uIGluIGAuL2ZhY3RvcnlXaXRoVGhyb3dpbmdTaGltcy5qc2AuXG4gIHZhciBSZWFjdFByb3BUeXBlcyA9IHtcbiAgICBhcnJheTogY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXIoJ2FycmF5JyksXG4gICAgYm9vbDogY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXIoJ2Jvb2xlYW4nKSxcbiAgICBmdW5jOiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignZnVuY3Rpb24nKSxcbiAgICBudW1iZXI6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdudW1iZXInKSxcbiAgICBvYmplY3Q6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdvYmplY3QnKSxcbiAgICBzdHJpbmc6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdzdHJpbmcnKSxcbiAgICBzeW1ib2w6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdzeW1ib2wnKSxcblxuICAgIGFueTogY3JlYXRlQW55VHlwZUNoZWNrZXIoKSxcbiAgICBhcnJheU9mOiBjcmVhdGVBcnJheU9mVHlwZUNoZWNrZXIsXG4gICAgZWxlbWVudDogY3JlYXRlRWxlbWVudFR5cGVDaGVja2VyKCksXG4gICAgaW5zdGFuY2VPZjogY3JlYXRlSW5zdGFuY2VUeXBlQ2hlY2tlcixcbiAgICBub2RlOiBjcmVhdGVOb2RlQ2hlY2tlcigpLFxuICAgIG9iamVjdE9mOiBjcmVhdGVPYmplY3RPZlR5cGVDaGVja2VyLFxuICAgIG9uZU9mOiBjcmVhdGVFbnVtVHlwZUNoZWNrZXIsXG4gICAgb25lT2ZUeXBlOiBjcmVhdGVVbmlvblR5cGVDaGVja2VyLFxuICAgIHNoYXBlOiBjcmVhdGVTaGFwZVR5cGVDaGVja2VyXG4gIH07XG5cbiAgLyoqXG4gICAqIGlubGluZWQgT2JqZWN0LmlzIHBvbHlmaWxsIHRvIGF2b2lkIHJlcXVpcmluZyBjb25zdW1lcnMgc2hpcCB0aGVpciBvd25cbiAgICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvT2JqZWN0L2lzXG4gICAqL1xuICAvKmVzbGludC1kaXNhYmxlIG5vLXNlbGYtY29tcGFyZSovXG4gIGZ1bmN0aW9uIGlzKHgsIHkpIHtcbiAgICAvLyBTYW1lVmFsdWUgYWxnb3JpdGhtXG4gICAgaWYgKHggPT09IHkpIHtcbiAgICAgIC8vIFN0ZXBzIDEtNSwgNy0xMFxuICAgICAgLy8gU3RlcHMgNi5iLTYuZTogKzAgIT0gLTBcbiAgICAgIHJldHVybiB4ICE9PSAwIHx8IDEgLyB4ID09PSAxIC8geTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU3RlcCA2LmE6IE5hTiA9PSBOYU5cbiAgICAgIHJldHVybiB4ICE9PSB4ICYmIHkgIT09IHk7XG4gICAgfVxuICB9XG4gIC8qZXNsaW50LWVuYWJsZSBuby1zZWxmLWNvbXBhcmUqL1xuXG4gIC8qKlxuICAgKiBXZSB1c2UgYW4gRXJyb3ItbGlrZSBvYmplY3QgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgYXMgcGVvcGxlIG1heSBjYWxsXG4gICAqIFByb3BUeXBlcyBkaXJlY3RseSBhbmQgaW5zcGVjdCB0aGVpciBvdXRwdXQuIEhvd2V2ZXIsIHdlIGRvbid0IHVzZSByZWFsXG4gICAqIEVycm9ycyBhbnltb3JlLiBXZSBkb24ndCBpbnNwZWN0IHRoZWlyIHN0YWNrIGFueXdheSwgYW5kIGNyZWF0aW5nIHRoZW1cbiAgICogaXMgcHJvaGliaXRpdmVseSBleHBlbnNpdmUgaWYgdGhleSBhcmUgY3JlYXRlZCB0b28gb2Z0ZW4sIHN1Y2ggYXMgd2hhdFxuICAgKiBoYXBwZW5zIGluIG9uZU9mVHlwZSgpIGZvciBhbnkgdHlwZSBiZWZvcmUgdGhlIG9uZSB0aGF0IG1hdGNoZWQuXG4gICAqL1xuICBmdW5jdGlvbiBQcm9wVHlwZUVycm9yKG1lc3NhZ2UpIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIHRoaXMuc3RhY2sgPSAnJztcbiAgfVxuICAvLyBNYWtlIGBpbnN0YW5jZW9mIEVycm9yYCBzdGlsbCB3b3JrIGZvciByZXR1cm5lZCBlcnJvcnMuXG4gIFByb3BUeXBlRXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKSB7XG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgIHZhciBtYW51YWxQcm9wVHlwZUNhbGxDYWNoZSA9IHt9O1xuICAgICAgdmFyIG1hbnVhbFByb3BUeXBlV2FybmluZ0NvdW50ID0gMDtcbiAgICB9XG4gICAgZnVuY3Rpb24gY2hlY2tUeXBlKGlzUmVxdWlyZWQsIHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSwgc2VjcmV0KSB7XG4gICAgICBjb21wb25lbnROYW1lID0gY29tcG9uZW50TmFtZSB8fCBBTk9OWU1PVVM7XG4gICAgICBwcm9wRnVsbE5hbWUgPSBwcm9wRnVsbE5hbWUgfHwgcHJvcE5hbWU7XG5cbiAgICAgIGlmIChzZWNyZXQgIT09IFJlYWN0UHJvcFR5cGVzU2VjcmV0KSB7XG4gICAgICAgIGlmICh0aHJvd09uRGlyZWN0QWNjZXNzKSB7XG4gICAgICAgICAgLy8gTmV3IGJlaGF2aW9yIG9ubHkgZm9yIHVzZXJzIG9mIGBwcm9wLXR5cGVzYCBwYWNrYWdlXG4gICAgICAgICAgaW52YXJpYW50KFxuICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAnQ2FsbGluZyBQcm9wVHlwZXMgdmFsaWRhdG9ycyBkaXJlY3RseSBpcyBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBgcHJvcC10eXBlc2AgcGFja2FnZS4gJyArXG4gICAgICAgICAgICAnVXNlIGBQcm9wVHlwZXMuY2hlY2tQcm9wVHlwZXMoKWAgdG8gY2FsbCB0aGVtLiAnICtcbiAgICAgICAgICAgICdSZWFkIG1vcmUgYXQgaHR0cDovL2ZiLm1lL3VzZS1jaGVjay1wcm9wLXR5cGVzJ1xuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyAmJiB0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAvLyBPbGQgYmVoYXZpb3IgZm9yIHBlb3BsZSB1c2luZyBSZWFjdC5Qcm9wVHlwZXNcbiAgICAgICAgICB2YXIgY2FjaGVLZXkgPSBjb21wb25lbnROYW1lICsgJzonICsgcHJvcE5hbWU7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgIW1hbnVhbFByb3BUeXBlQ2FsbENhY2hlW2NhY2hlS2V5XSAmJlxuICAgICAgICAgICAgLy8gQXZvaWQgc3BhbW1pbmcgdGhlIGNvbnNvbGUgYmVjYXVzZSB0aGV5IGFyZSBvZnRlbiBub3QgYWN0aW9uYWJsZSBleGNlcHQgZm9yIGxpYiBhdXRob3JzXG4gICAgICAgICAgICBtYW51YWxQcm9wVHlwZVdhcm5pbmdDb3VudCA8IDNcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHdhcm5pbmcoXG4gICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAnWW91IGFyZSBtYW51YWxseSBjYWxsaW5nIGEgUmVhY3QuUHJvcFR5cGVzIHZhbGlkYXRpb24gJyArXG4gICAgICAgICAgICAgICdmdW5jdGlvbiBmb3IgdGhlIGAlc2AgcHJvcCBvbiBgJXNgLiBUaGlzIGlzIGRlcHJlY2F0ZWQgJyArXG4gICAgICAgICAgICAgICdhbmQgd2lsbCB0aHJvdyBpbiB0aGUgc3RhbmRhbG9uZSBgcHJvcC10eXBlc2AgcGFja2FnZS4gJyArXG4gICAgICAgICAgICAgICdZb3UgbWF5IGJlIHNlZWluZyB0aGlzIHdhcm5pbmcgZHVlIHRvIGEgdGhpcmQtcGFydHkgUHJvcFR5cGVzICcgK1xuICAgICAgICAgICAgICAnbGlicmFyeS4gU2VlIGh0dHBzOi8vZmIubWUvcmVhY3Qtd2FybmluZy1kb250LWNhbGwtcHJvcHR5cGVzICcgKyAnZm9yIGRldGFpbHMuJyxcbiAgICAgICAgICAgICAgcHJvcEZ1bGxOYW1lLFxuICAgICAgICAgICAgICBjb21wb25lbnROYW1lXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgbWFudWFsUHJvcFR5cGVDYWxsQ2FjaGVbY2FjaGVLZXldID0gdHJ1ZTtcbiAgICAgICAgICAgIG1hbnVhbFByb3BUeXBlV2FybmluZ0NvdW50Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAocHJvcHNbcHJvcE5hbWVdID09IG51bGwpIHtcbiAgICAgICAgaWYgKGlzUmVxdWlyZWQpIHtcbiAgICAgICAgICBpZiAocHJvcHNbcHJvcE5hbWVdID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ1RoZSAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2AgaXMgbWFya2VkIGFzIHJlcXVpcmVkICcgKyAoJ2luIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBidXQgaXRzIHZhbHVlIGlzIGBudWxsYC4nKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignVGhlICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBpcyBtYXJrZWQgYXMgcmVxdWlyZWQgaW4gJyArICgnYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGJ1dCBpdHMgdmFsdWUgaXMgYHVuZGVmaW5lZGAuJykpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGNoYWluZWRDaGVja1R5cGUgPSBjaGVja1R5cGUuYmluZChudWxsLCBmYWxzZSk7XG4gICAgY2hhaW5lZENoZWNrVHlwZS5pc1JlcXVpcmVkID0gY2hlY2tUeXBlLmJpbmQobnVsbCwgdHJ1ZSk7XG5cbiAgICByZXR1cm4gY2hhaW5lZENoZWNrVHlwZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKGV4cGVjdGVkVHlwZSkge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSwgc2VjcmV0KSB7XG4gICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdO1xuICAgICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICAgIGlmIChwcm9wVHlwZSAhPT0gZXhwZWN0ZWRUeXBlKSB7XG4gICAgICAgIC8vIGBwcm9wVmFsdWVgIGJlaW5nIGluc3RhbmNlIG9mLCBzYXksIGRhdGUvcmVnZXhwLCBwYXNzIHRoZSAnb2JqZWN0J1xuICAgICAgICAvLyBjaGVjaywgYnV0IHdlIGNhbiBvZmZlciBhIG1vcmUgcHJlY2lzZSBlcnJvciBtZXNzYWdlIGhlcmUgcmF0aGVyIHRoYW5cbiAgICAgICAgLy8gJ29mIHR5cGUgYG9iamVjdGAnLlxuICAgICAgICB2YXIgcHJlY2lzZVR5cGUgPSBnZXRQcmVjaXNlVHlwZShwcm9wVmFsdWUpO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSAnICsgKCdgJyArIHByZWNpc2VUeXBlICsgJ2Agc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkICcpICsgKCdgJyArIGV4cGVjdGVkVHlwZSArICdgLicpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlQW55VHlwZUNoZWNrZXIoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKGVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNOdWxsKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUFycmF5T2ZUeXBlQ2hlY2tlcih0eXBlQ2hlY2tlcikge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgaWYgKHR5cGVvZiB0eXBlQ2hlY2tlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ1Byb3BlcnR5IGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgY29tcG9uZW50IGAnICsgY29tcG9uZW50TmFtZSArICdgIGhhcyBpbnZhbGlkIFByb3BUeXBlIG5vdGF0aW9uIGluc2lkZSBhcnJheU9mLicpO1xuICAgICAgfVxuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShwcm9wVmFsdWUpKSB7XG4gICAgICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSAnICsgKCdgJyArIHByb3BUeXBlICsgJ2Agc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIGFuIGFycmF5LicpKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcFZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBlcnJvciA9IHR5cGVDaGVja2VyKHByb3BWYWx1ZSwgaSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSArICdbJyArIGkgKyAnXScsIFJlYWN0UHJvcFR5cGVzU2VjcmV0KTtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRWxlbWVudFR5cGVDaGVja2VyKCkge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIGlmICghaXNWYWxpZEVsZW1lbnQocHJvcFZhbHVlKSkge1xuICAgICAgICB2YXIgcHJvcFR5cGUgPSBnZXRQcm9wVHlwZShwcm9wVmFsdWUpO1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHR5cGUgJyArICgnYCcgKyBwcm9wVHlwZSArICdgIHN1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCBhIHNpbmdsZSBSZWFjdEVsZW1lbnQuJykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVJbnN0YW5jZVR5cGVDaGVja2VyKGV4cGVjdGVkQ2xhc3MpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIGlmICghKHByb3BzW3Byb3BOYW1lXSBpbnN0YW5jZW9mIGV4cGVjdGVkQ2xhc3MpKSB7XG4gICAgICAgIHZhciBleHBlY3RlZENsYXNzTmFtZSA9IGV4cGVjdGVkQ2xhc3MubmFtZSB8fCBBTk9OWU1PVVM7XG4gICAgICAgIHZhciBhY3R1YWxDbGFzc05hbWUgPSBnZXRDbGFzc05hbWUocHJvcHNbcHJvcE5hbWVdKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiB0eXBlICcgKyAoJ2AnICsgYWN0dWFsQ2xhc3NOYW1lICsgJ2Agc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkICcpICsgKCdpbnN0YW5jZSBvZiBgJyArIGV4cGVjdGVkQ2xhc3NOYW1lICsgJ2AuJykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVFbnVtVHlwZUNoZWNrZXIoZXhwZWN0ZWRWYWx1ZXMpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoZXhwZWN0ZWRWYWx1ZXMpKSB7XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gd2FybmluZyhmYWxzZSwgJ0ludmFsaWQgYXJndW1lbnQgc3VwcGxpZWQgdG8gb25lT2YsIGV4cGVjdGVkIGFuIGluc3RhbmNlIG9mIGFycmF5LicpIDogdm9pZCAwO1xuICAgICAgcmV0dXJuIGVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNOdWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXhwZWN0ZWRWYWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGlzKHByb3BWYWx1ZSwgZXhwZWN0ZWRWYWx1ZXNbaV0pKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIHZhbHVlc1N0cmluZyA9IEpTT04uc3RyaW5naWZ5KGV4cGVjdGVkVmFsdWVzKTtcbiAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdmFsdWUgYCcgKyBwcm9wVmFsdWUgKyAnYCAnICsgKCdzdXBwbGllZCB0byBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgb25lIG9mICcgKyB2YWx1ZXNTdHJpbmcgKyAnLicpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU9iamVjdE9mVHlwZUNoZWNrZXIodHlwZUNoZWNrZXIpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIGlmICh0eXBlb2YgdHlwZUNoZWNrZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdQcm9wZXJ0eSBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIGNvbXBvbmVudCBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCBoYXMgaW52YWxpZCBQcm9wVHlwZSBub3RhdGlvbiBpbnNpZGUgb2JqZWN0T2YuJyk7XG4gICAgICB9XG4gICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdO1xuICAgICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICAgIGlmIChwcm9wVHlwZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiB0eXBlICcgKyAoJ2AnICsgcHJvcFR5cGUgKyAnYCBzdXBwbGllZCB0byBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgYW4gb2JqZWN0LicpKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGtleSBpbiBwcm9wVmFsdWUpIHtcbiAgICAgICAgaWYgKHByb3BWYWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgdmFyIGVycm9yID0gdHlwZUNoZWNrZXIocHJvcFZhbHVlLCBrZXksIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUgKyAnLicgKyBrZXksIFJlYWN0UHJvcFR5cGVzU2VjcmV0KTtcbiAgICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVVbmlvblR5cGVDaGVja2VyKGFycmF5T2ZUeXBlQ2hlY2tlcnMpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyYXlPZlR5cGVDaGVja2VycykpIHtcbiAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyB3YXJuaW5nKGZhbHNlLCAnSW52YWxpZCBhcmd1bWVudCBzdXBwbGllZCB0byBvbmVPZlR5cGUsIGV4cGVjdGVkIGFuIGluc3RhbmNlIG9mIGFycmF5LicpIDogdm9pZCAwO1xuICAgICAgcmV0dXJuIGVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNOdWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheU9mVHlwZUNoZWNrZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGVja2VyID0gYXJyYXlPZlR5cGVDaGVja2Vyc1tpXTtcbiAgICAgICAgaWYgKGNoZWNrZXIocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lLCBSZWFjdFByb3BUeXBlc1NlY3JldCkgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agc3VwcGxpZWQgdG8gJyArICgnYCcgKyBjb21wb25lbnROYW1lICsgJ2AuJykpO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTm9kZUNoZWNrZXIoKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICBpZiAoIWlzTm9kZShwcm9wc1twcm9wTmFtZV0pKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agc3VwcGxpZWQgdG8gJyArICgnYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIGEgUmVhY3ROb2RlLicpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlU2hhcGVUeXBlQ2hlY2tlcihzaGFwZVR5cGVzKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdO1xuICAgICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICAgIGlmIChwcm9wVHlwZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiB0eXBlIGAnICsgcHJvcFR5cGUgKyAnYCAnICsgKCdzdXBwbGllZCB0byBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgYG9iamVjdGAuJykpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIga2V5IGluIHNoYXBlVHlwZXMpIHtcbiAgICAgICAgdmFyIGNoZWNrZXIgPSBzaGFwZVR5cGVzW2tleV07XG4gICAgICAgIGlmICghY2hlY2tlcikge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlcnJvciA9IGNoZWNrZXIocHJvcFZhbHVlLCBrZXksIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUgKyAnLicgKyBrZXksIFJlYWN0UHJvcFR5cGVzU2VjcmV0KTtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzTm9kZShwcm9wVmFsdWUpIHtcbiAgICBzd2l0Y2ggKHR5cGVvZiBwcm9wVmFsdWUpIHtcbiAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgY2FzZSAndW5kZWZpbmVkJzpcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgcmV0dXJuICFwcm9wVmFsdWU7XG4gICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwcm9wVmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIHByb3BWYWx1ZS5ldmVyeShpc05vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9wVmFsdWUgPT09IG51bGwgfHwgaXNWYWxpZEVsZW1lbnQocHJvcFZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGl0ZXJhdG9yRm4gPSBnZXRJdGVyYXRvckZuKHByb3BWYWx1ZSk7XG4gICAgICAgIGlmIChpdGVyYXRvckZuKSB7XG4gICAgICAgICAgdmFyIGl0ZXJhdG9yID0gaXRlcmF0b3JGbi5jYWxsKHByb3BWYWx1ZSk7XG4gICAgICAgICAgdmFyIHN0ZXA7XG4gICAgICAgICAgaWYgKGl0ZXJhdG9yRm4gIT09IHByb3BWYWx1ZS5lbnRyaWVzKSB7XG4gICAgICAgICAgICB3aGlsZSAoIShzdGVwID0gaXRlcmF0b3IubmV4dCgpKS5kb25lKSB7XG4gICAgICAgICAgICAgIGlmICghaXNOb2RlKHN0ZXAudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEl0ZXJhdG9yIHdpbGwgcHJvdmlkZSBlbnRyeSBbayx2XSB0dXBsZXMgcmF0aGVyIHRoYW4gdmFsdWVzLlxuICAgICAgICAgICAgd2hpbGUgKCEoc3RlcCA9IGl0ZXJhdG9yLm5leHQoKSkuZG9uZSkge1xuICAgICAgICAgICAgICB2YXIgZW50cnkgPSBzdGVwLnZhbHVlO1xuICAgICAgICAgICAgICBpZiAoZW50cnkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlzTm9kZShlbnRyeVsxXSkpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaXNTeW1ib2wocHJvcFR5cGUsIHByb3BWYWx1ZSkge1xuICAgIC8vIE5hdGl2ZSBTeW1ib2wuXG4gICAgaWYgKHByb3BUeXBlID09PSAnc3ltYm9sJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gMTkuNC4zLjUgU3ltYm9sLnByb3RvdHlwZVtAQHRvU3RyaW5nVGFnXSA9PT0gJ1N5bWJvbCdcbiAgICBpZiAocHJvcFZhbHVlWydAQHRvU3RyaW5nVGFnJ10gPT09ICdTeW1ib2wnKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBGYWxsYmFjayBmb3Igbm9uLXNwZWMgY29tcGxpYW50IFN5bWJvbHMgd2hpY2ggYXJlIHBvbHlmaWxsZWQuXG4gICAgaWYgKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgcHJvcFZhbHVlIGluc3RhbmNlb2YgU3ltYm9sKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBFcXVpdmFsZW50IG9mIGB0eXBlb2ZgIGJ1dCB3aXRoIHNwZWNpYWwgaGFuZGxpbmcgZm9yIGFycmF5IGFuZCByZWdleHAuXG4gIGZ1bmN0aW9uIGdldFByb3BUeXBlKHByb3BWYWx1ZSkge1xuICAgIHZhciBwcm9wVHlwZSA9IHR5cGVvZiBwcm9wVmFsdWU7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocHJvcFZhbHVlKSkge1xuICAgICAgcmV0dXJuICdhcnJheSc7XG4gICAgfVxuICAgIGlmIChwcm9wVmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIC8vIE9sZCB3ZWJraXRzIChhdCBsZWFzdCB1bnRpbCBBbmRyb2lkIDQuMCkgcmV0dXJuICdmdW5jdGlvbicgcmF0aGVyIHRoYW5cbiAgICAgIC8vICdvYmplY3QnIGZvciB0eXBlb2YgYSBSZWdFeHAuIFdlJ2xsIG5vcm1hbGl6ZSB0aGlzIGhlcmUgc28gdGhhdCAvYmxhL1xuICAgICAgLy8gcGFzc2VzIFByb3BUeXBlcy5vYmplY3QuXG4gICAgICByZXR1cm4gJ29iamVjdCc7XG4gICAgfVxuICAgIGlmIChpc1N5bWJvbChwcm9wVHlwZSwgcHJvcFZhbHVlKSkge1xuICAgICAgcmV0dXJuICdzeW1ib2wnO1xuICAgIH1cbiAgICByZXR1cm4gcHJvcFR5cGU7XG4gIH1cblxuICAvLyBUaGlzIGhhbmRsZXMgbW9yZSB0eXBlcyB0aGFuIGBnZXRQcm9wVHlwZWAuIE9ubHkgdXNlZCBmb3IgZXJyb3IgbWVzc2FnZXMuXG4gIC8vIFNlZSBgY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXJgLlxuICBmdW5jdGlvbiBnZXRQcmVjaXNlVHlwZShwcm9wVmFsdWUpIHtcbiAgICB2YXIgcHJvcFR5cGUgPSBnZXRQcm9wVHlwZShwcm9wVmFsdWUpO1xuICAgIGlmIChwcm9wVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChwcm9wVmFsdWUgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgIHJldHVybiAnZGF0ZSc7XG4gICAgICB9IGVsc2UgaWYgKHByb3BWYWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICByZXR1cm4gJ3JlZ2V4cCc7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwcm9wVHlwZTtcbiAgfVxuXG4gIC8vIFJldHVybnMgY2xhc3MgbmFtZSBvZiB0aGUgb2JqZWN0LCBpZiBhbnkuXG4gIGZ1bmN0aW9uIGdldENsYXNzTmFtZShwcm9wVmFsdWUpIHtcbiAgICBpZiAoIXByb3BWYWx1ZS5jb25zdHJ1Y3RvciB8fCAhcHJvcFZhbHVlLmNvbnN0cnVjdG9yLm5hbWUpIHtcbiAgICAgIHJldHVybiBBTk9OWU1PVVM7XG4gICAgfVxuICAgIHJldHVybiBwcm9wVmFsdWUuY29uc3RydWN0b3IubmFtZTtcbiAgfVxuXG4gIFJlYWN0UHJvcFR5cGVzLmNoZWNrUHJvcFR5cGVzID0gY2hlY2tQcm9wVHlwZXM7XG4gIFJlYWN0UHJvcFR5cGVzLlByb3BUeXBlcyA9IFJlYWN0UHJvcFR5cGVzO1xuXG4gIHJldHVybiBSZWFjdFByb3BUeXBlcztcbn07XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9mYWN0b3J5V2l0aFR5cGVDaGVja2Vycy5qc1xuLy8gbW9kdWxlIGlkID0gNDc2XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsInZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbnZhciBfY3JlYXRlQ2xhc3MgPSBmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfSByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9OyB9KCk7XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHNlbGYsIGNhbGwpIHsgaWYgKCFzZWxmKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gY2FsbCAmJiAodHlwZW9mIGNhbGwgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikgPyBjYWxsIDogc2VsZjsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb24sIG5vdCBcIiArIHR5cGVvZiBzdXBlckNsYXNzKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LnNldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKSA6IHN1YkNsYXNzLl9fcHJvdG9fXyA9IHN1cGVyQ2xhc3M7IH1cblxuLyoqXG4gKiBAbW9kdWxlIGNvbXBvbmVudFdyYXBwZXJcbiAqXG4gKi9cbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5cbmltcG9ydCBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgeyBvbk1vdW50LCBvblVubW91bnQgfSBmcm9tICcuLi9ldmVudF9oYW5kbGVycyc7XG5cbi8qKlxuICogY29tcG9uZW50V3JhcHBlclxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKiBAcGFyYW0ge29iamVjdH0gV3JhcHBlZENvbXBvbmVudCBSZWFjdCBjb21wb25lbnQgY2xhc3MgdG8gYmUgd3JhcHBlZFxuICogQHBhcmFtIHthcnJheX0gW2tleXNdIFRoZSBrZXkocykgYm91bmQgdG8gdGhlIGNsYXNzXG4gKiBAcmV0dXJuIHtvYmplY3R9IFRoZSBoaWdoZXItb3JkZXIgZnVuY3Rpb24gdGhhdCB3cmFwcyB0aGUgZGVjb3JhdGVkIGNsYXNzXG4gKi9cbmZ1bmN0aW9uIGNvbXBvbmVudFdyYXBwZXIoV3JhcHBlZENvbXBvbmVudCkge1xuICB2YXIga2V5cyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogbnVsbDtcblxuICB2YXIgS2V5Qm9hcmRIZWxwZXIgPSBmdW5jdGlvbiAoX1JlYWN0JENvbXBvbmVudCkge1xuICAgIF9pbmhlcml0cyhLZXlCb2FyZEhlbHBlciwgX1JlYWN0JENvbXBvbmVudCk7XG5cbiAgICBmdW5jdGlvbiBLZXlCb2FyZEhlbHBlcihwcm9wcykge1xuICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEtleUJvYXJkSGVscGVyKTtcblxuICAgICAgdmFyIF90aGlzID0gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgKEtleUJvYXJkSGVscGVyLl9fcHJvdG9fXyB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoS2V5Qm9hcmRIZWxwZXIpKS5jYWxsKHRoaXMsIHByb3BzKSk7XG5cbiAgICAgIF90aGlzLnN0YXRlID0ge1xuICAgICAgICBldmVudDogbnVsbFxuICAgICAgfTtcbiAgICAgIHJldHVybiBfdGhpcztcbiAgICB9XG5cbiAgICBfY3JlYXRlQ2xhc3MoS2V5Qm9hcmRIZWxwZXIsIFt7XG4gICAgICBrZXk6ICdjb21wb25lbnREaWRNb3VudCcsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIG9uTW91bnQodGhpcyk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnY29tcG9uZW50V2lsbFVubW91bnQnLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuICAgICAgICBvblVubW91bnQodGhpcyk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiAnaGFuZGxlS2V5RG93bicsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gaGFuZGxlS2V5RG93bihldmVudCkge1xuICAgICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgICAvLyB0byBzaW11bGF0ZSBhIGtleXByZXNzLCBzZXQgdGhlIGV2ZW50IGFuZCB0aGVuIGNsZWFyIGl0IGluIHRoZSBjYWxsYmFja1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgZXZlbnQ6IGV2ZW50IH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gX3RoaXMyLnNldFN0YXRlKHsgZXZlbnQ6IG51bGwgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogJ3JlbmRlcicsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChXcmFwcGVkQ29tcG9uZW50LCBfZXh0ZW5kcyh7fSwgdGhpcy5wcm9wcywgeyBrZXlkb3duOiB0aGlzLnN0YXRlIH0pKTtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gS2V5Qm9hcmRIZWxwZXI7XG4gIH0oUmVhY3QuQ29tcG9uZW50KTtcblxuICBzdG9yZS5zZXRCaW5kaW5nKHsga2V5czoga2V5cywgZm46IEtleUJvYXJkSGVscGVyLnByb3RvdHlwZS5oYW5kbGVLZXlEb3duLCB0YXJnZXQ6IEtleUJvYXJkSGVscGVyLnByb3RvdHlwZSB9KTtcblxuICByZXR1cm4gS2V5Qm9hcmRIZWxwZXI7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNvbXBvbmVudFdyYXBwZXI7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvZGVjb3JhdG9ycy9jbGFzc19kZWNvcmF0b3IuanNcbi8vIG1vZHVsZSBpZCA9IDU2NFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJ2YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbi8qKlxuICogQG1vZHVsZSBkZWNvcmF0b3JzXG4gKlxuICovXG5pbXBvcnQgY2xhc3NXcmFwcGVyIGZyb20gJy4vY2xhc3NfZGVjb3JhdG9yJztcbmltcG9ydCBtZXRob2RXcmFwcGVyIGZyb20gJy4vbWV0aG9kX2RlY29yYXRvcic7XG5pbXBvcnQgbWV0aG9kV3JhcHBlclNjb3BlZCBmcm9tICcuL21ldGhvZF9kZWNvcmF0b3Jfc2NvcGVkJztcblxuLyoqXG4gKiBfZGVjb3JhdG9yXG4gKlxuICogQGFjY2VzcyBwcml2YXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBtZXRob2RGbiBUaGUgbWV0aG9kIHdyYXBwZXIgdG8gZGVsZWdhdGUgdG8sIGJhc2VkIG9uIHdoZXRoZXIgdXNlciBoYXMgc3BlY2lmaWVkIGEgc2NvcGVkIGRlY29yYXRvciBvciBub3RcbiAqIEBwYXJhbSB7QXJyYXl9IC4uLmFyZ3MgUmVtYWluZGVyIG9mIGFyZ3VtZW50cyBwYXNzZWQgaW5cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSBUaGUgZGVjb3JhdGVkIGNsYXNzIG9yIG1ldGhvZFxuICovXG5mdW5jdGlvbiBfZGVjb3JhdG9yKG1ldGhvZEZuKSB7XG4gIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbiA+IDEgPyBfbGVuIC0gMSA6IDApLCBfa2V5ID0gMTsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgIGFyZ3NbX2tleSAtIDFdID0gYXJndW1lbnRzW19rZXldO1xuICB9XG5cbiAgLy8gY2hlY2sgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHNlZSBpZiBpdCdzIGEgdXNlci1zdXBwbGllZCBrZXljb2RlIG9yIGFycmF5XG4gIC8vIG9mIGtleWNvZGVzLCBvciBpZiBpdCdzIHRoZSB3cmFwcGVkIGNsYXNzIG9yIG1ldGhvZFxuICB2YXIgdGVzdEFyZyA9IGFyZ3NbMF07XG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSh0ZXN0QXJnKTtcblxuICAvLyBpZiB0aGUgdGVzdCBhcmd1bWVudCBpcyBub3QgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uLCBpdCBpcyB1c2VyLXN1cHBsaWVkXG4gIC8vIGtleWNvZGVzLiBlbHNlIHRoZXJlIGFyZSBubyBhcmd1bWVudHMgYW5kIGl0J3MganVzdCB0aGUgd3JhcHBlZCBjbGFzc1xuICAvLyAobWV0aG9kIGRlY29yYXRvcnMgbXVzdCBoYXZlIGtleWNvZGUgYXJndW1lbnRzKS5cbiAgaWYgKGlzQXJyYXkgfHwgflsnc3RyaW5nJywgJ251bWJlciddLmluZGV4T2YodHlwZW9mIHRlc3RBcmcgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHRlc3RBcmcpKSkge1xuICAgIHZhciBrZXlzID0gaXNBcnJheSA/IHRlc3RBcmcgOiBhcmdzO1xuXG4gICAgLy8gcmV0dXJuIHRoZSBkZWNvcmF0b3IgZnVuY3Rpb24sIHdoaWNoIG9uIHRoZSBuZXh0IGNhbGwgd2lsbCBsb29rIGZvclxuICAgIC8vIHRoZSBwcmVzZW5jZSBvZiBhIG1ldGhvZCBuYW1lIHRvIGRldGVybWluZSBpZiB0aGlzIGlzIGEgd3JhcHBlZCBtZXRob2RcbiAgICAvLyBvciBjb21wb25lbnRcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwgbWV0aG9kTmFtZSwgZGVzY3JpcHRvcikge1xuICAgICAgcmV0dXJuIG1ldGhvZE5hbWUgPyBtZXRob2RGbih7IHRhcmdldDogdGFyZ2V0LCBkZXNjcmlwdG9yOiBkZXNjcmlwdG9yLCBrZXlzOiBrZXlzIH0pIDogY2xhc3NXcmFwcGVyKHRhcmdldCwga2V5cyk7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbWV0aG9kTmFtZSA9IGFyZ3NbMV07XG5cbiAgICAvLyBtZXRob2QgZGVjb3JhdG9ycyB3aXRob3V0IGtleWNvZGUgKHdoaWNoKSBhcmd1bWVudHMgYXJlIG5vdCBhbGxvd2VkLlxuICAgIGlmICghbWV0aG9kTmFtZSkge1xuICAgICAgcmV0dXJuIGNsYXNzV3JhcHBlci5hcHBseSh1bmRlZmluZWQsIGFyZ3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLndhcm4obWV0aG9kTmFtZSArICc6IE1ldGhvZCBkZWNvcmF0b3JzIG11c3QgaGF2ZSBrZXljb2RlIGFyZ3VtZW50cywgc28gdGhlIGRlY29yYXRvciBmb3IgdGhpcyBtZXRob2Qgd2lsbCBub3QgZG8gYW55dGhpbmcnKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBrZXlkb3duU2NvcGVkXG4gKlxuICogTWV0aG9kIGRlY29yYXRvciB0aGF0IHdpbGwgbG9vayBmb3IgY2hhbmdlcyB0byBpdHMgdGFyZ2V0ZWQgY29tcG9uZW50J3NcbiAqIGBrZXlkb3duYCBwcm9wcyB0byBkZWNpZGUgd2hlbiB0byB0cmlnZ2VyLCByYXRoZXIgdGhhbiByZXNwb25kaW5nIGRpcmVjdGx5XG4gKiB0byBrZXlkb3duIGV2ZW50cy4gVGhpcyBsZXRzIHlvdSBzcGVjaWZ5IGEgQGtleWRvd24gZGVjb3JhdGVkIGNsYXNzIGhpZ2hlclxuICogdXAgaW4gdGhlIHZpZXcgaGllcmFyY2h5IGZvciBsYXJnZXIgc2NvcGluZyBvZiBrZXlkb3duIGV2ZW50cywgb3IgZm9yXG4gKiBwcm9ncmFtbWF0aWNhbGx5IHNlbmRpbmcga2V5ZG93biBldmVudHMgYXMgcHJvcHMgaW50byB0aGUgY29tcG9uZW50cyBpbiBvcmRlclxuICogdG8gdHJpZ2dlciBkZWNvcmF0ZWQgbWV0aG9kcyB3aXRoIG1hdGNoaW5nIGtleXMuXG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqIEBwYXJhbSB7QXJyYXl9IC4uLmFyZ3MgIEFsbCAob3Igbm8pIGFyZ3VtZW50cyBwYXNzZWQgaW4gZnJvbSBkZWNvcmF0aW9uXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIGRlY29yYXRlZCBjbGFzcyBvciBtZXRob2RcbiAqL1xuZnVuY3Rpb24ga2V5ZG93blNjb3BlZCgpIHtcbiAgZm9yICh2YXIgX2xlbjIgPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbjIpLCBfa2V5MiA9IDA7IF9rZXkyIDwgX2xlbjI7IF9rZXkyKyspIHtcbiAgICBhcmdzW19rZXkyXSA9IGFyZ3VtZW50c1tfa2V5Ml07XG4gIH1cblxuICByZXR1cm4gX2RlY29yYXRvci5hcHBseSh1bmRlZmluZWQsIFttZXRob2RXcmFwcGVyU2NvcGVkXS5jb25jYXQoYXJncykpO1xufVxuXG4vKipcbiAqIGtleWRvd25cbiAqXG4gKiBUaGUgbWFpbiBkZWNvcmF0b3IgYW5kIGRlZmF1bHQgZXhwb3J0LCBoYW5kbGVzIGJvdGggY2xhc3NlcyBhbmQgbWV0aG9kcy5cbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtBcnJheX0gLi4uYXJncyAgQWxsIChvciBubykgYXJndW1lbnRzIHBhc3NlZCBpbiBmcm9tIGRlY29yYXRpb25cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSBUaGUgZGVjb3JhdGVkIGNsYXNzIG9yIG1ldGhvZFxuICovXG5mdW5jdGlvbiBrZXlkb3duKCkge1xuICBmb3IgKHZhciBfbGVuMyA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuMyksIF9rZXkzID0gMDsgX2tleTMgPCBfbGVuMzsgX2tleTMrKykge1xuICAgIGFyZ3NbX2tleTNdID0gYXJndW1lbnRzW19rZXkzXTtcbiAgfVxuXG4gIHJldHVybiBfZGVjb3JhdG9yLmFwcGx5KHVuZGVmaW5lZCwgW21ldGhvZFdyYXBwZXJdLmNvbmNhdChhcmdzKSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGtleWRvd247XG5cbmV4cG9ydCB7IGtleWRvd25TY29wZWQgfTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL2luZGV4LmpzXG4vLyBtb2R1bGUgaWQgPSA1NjVcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwidmFyIF90eXBlb2YgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIiA/IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH0gOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9O1xuXG4vKipcbiAqIEBtb2R1bGUgbWV0aG9kV3JhcHBlclxuICpcbiAqL1xuaW1wb3J0IHN0b3JlIGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7IG9uTW91bnQsIG9uVW5tb3VudCwgX29uS2V5RG93biB9IGZyb20gJy4uL2V2ZW50X2hhbmRsZXJzJztcblxuLyoqXG4gKiBfaXNSZWFjdEtleURvd25cbiAqXG4gKiBAYWNjZXNzIHByaXZhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBldmVudCBUaGUgcG9zc2libHkgc3ludGhldGljIGV2ZW50IHBhc3NlZCBhcyBhbiBhcmd1bWVudCB3aXRoXG4gKiB0aGUgbWV0aG9kIGludm9jYXRpb24uXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBfaXNSZWFjdEtleURvd24oZXZlbnQpIHtcbiAgcmV0dXJuIGV2ZW50ICYmICh0eXBlb2YgZXZlbnQgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGV2ZW50KSkgPT09ICdvYmplY3QnICYmIGV2ZW50Lm5hdGl2ZUV2ZW50IGluc3RhbmNlb2Ygd2luZG93LktleWJvYXJkRXZlbnQgJiYgZXZlbnQudHlwZSA9PT0gJ2tleWRvd24nO1xufVxuXG4vKipcbiAqIG1ldGhvZFdyYXBwZXJcbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtvYmplY3R9IGFyZ3MgQWxsIGFyZ3VtZW50cyBuZWNlc3NhcnkgZm9yIHdyYXBwaW5nIG1ldGhvZFxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3MudGFyZ2V0IFRoZSBkZWNvcmF0ZWQgY2xhc3NcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzLmRlc2NyaXB0b3IgTWV0aG9kIGRlc2NyaXB0b3JcbiAqIEBwYXJhbSB7YXJyYXl9IGFyZ3Mua2V5cyBUaGUgYXJyYXkgb2Yga2V5cyBib3VuZCB0byB0aGUgZ2l2ZW4gbWV0aG9kXG4gKiBAcmV0dXJuIHtvYmplY3R9IFRoZSBtZXRob2QgZGVzY3JpcHRvclxuICovXG5mdW5jdGlvbiBtZXRob2RXcmFwcGVyKF9yZWYpIHtcbiAgdmFyIHRhcmdldCA9IF9yZWYudGFyZ2V0LFxuICAgICAgZGVzY3JpcHRvciA9IF9yZWYuZGVzY3JpcHRvcixcbiAgICAgIGtleXMgPSBfcmVmLmtleXM7XG5cblxuICB2YXIgZm4gPSBkZXNjcmlwdG9yLnZhbHVlO1xuXG4gIC8vIGlmIHdlIGhhdmVuJ3QgYWxyZWFkeSBjcmVhdGVkIGEgYmluZGluZyBmb3IgdGhpcyBjbGFzcyAodmlhIGFub3RoZXJcbiAgLy8gZGVjb3JhdGVkIG1ldGhvZCksIHdyYXAgdGhlc2UgbGlmZWN5Y2xlIG1ldGhvZHMuXG4gIGlmICghc3RvcmUuZ2V0QmluZGluZyh0YXJnZXQpKSB7XG4gICAgdmFyIGNvbXBvbmVudERpZE1vdW50ID0gdGFyZ2V0LmNvbXBvbmVudERpZE1vdW50LFxuICAgICAgICBjb21wb25lbnRXaWxsVW5tb3VudCA9IHRhcmdldC5jb21wb25lbnRXaWxsVW5tb3VudDtcblxuXG4gICAgdGFyZ2V0LmNvbXBvbmVudERpZE1vdW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgb25Nb3VudCh0aGlzKTtcbiAgICAgIGlmIChjb21wb25lbnREaWRNb3VudCkgcmV0dXJuIGNvbXBvbmVudERpZE1vdW50LmNhbGwodGhpcyk7XG4gICAgfTtcblxuICAgIHRhcmdldC5jb21wb25lbnRXaWxsVW5tb3VudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9uVW5tb3VudCh0aGlzKTtcbiAgICAgIGlmIChjb21wb25lbnRXaWxsVW5tb3VudCkgcmV0dXJuIGNvbXBvbmVudFdpbGxVbm1vdW50LmNhbGwodGhpcyk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIGFkZCB0aGlzIGJpbmRpbmcgb2Yga2V5cyBhbmQgbWV0aG9kIHRvIHRoZSB0YXJnZXQncyBiaW5kaW5nc1xuICBzdG9yZS5zZXRCaW5kaW5nKHsga2V5czoga2V5cywgdGFyZ2V0OiB0YXJnZXQsIGZuOiBmbiB9KTtcblxuICBkZXNjcmlwdG9yLnZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbiksIF9rZXkgPSAwOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICBhcmdzW19rZXldID0gYXJndW1lbnRzW19rZXldO1xuICAgIH1cblxuICAgIHZhciBtYXliZUV2ZW50ID0gYXJnc1swXTtcblxuICAgIGlmIChfaXNSZWFjdEtleURvd24obWF5YmVFdmVudCkpIHtcbiAgICAgIC8vIHByb3h5IG1ldGhvZCBpbiBvcmRlciB0byB1c2UgQGtleWRvd24gYXMgZmlsdGVyIGZvciBrZXlkb3duIGV2ZW50cyBjb21pbmdcbiAgICAgIC8vIGZyb20gYW4gYWN0dWFsIG9uS2V5RG93biBiaW5kaW5nIChhcyBpZGVudGlmaWVkIGJ5IHJlYWN0J3MgYWRkaXRpb24gb2ZcbiAgICAgIC8vICduYXRpdmVFdmVudCcgKyB0eXBlID09PSAna2V5ZG93bicpXG4gICAgICBpZiAoIW1heWJlRXZlbnQuY3RybEtleSkge1xuICAgICAgICAvLyB3ZSBhbHJlYWR5IHdoaXRlbGlzdCBzaG9ydGN1dHMgd2l0aCBjdHJsIG1vZGlmaWVycyBzbyBpZiB3ZSB3ZXJlIHRvXG4gICAgICAgIC8vIGZpcmUgaXQgYWdhaW4gaGVyZSB0aGUgbWV0aG9kIHdvdWxkIHRyaWdnZXIgdHdpY2UuIHNlZSBodHRwczovL2dpdGh1Yi5jb20vZ2xvcnRoby9yZWFjdC1rZXlkb3duL2lzc3Vlcy8zOFxuICAgICAgICByZXR1cm4gX29uS2V5RG93bihtYXliZUV2ZW50LCB0cnVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCFtYXliZUV2ZW50IHx8ICEobWF5YmVFdmVudCBpbnN0YW5jZW9mIHdpbmRvdy5LZXlib2FyZEV2ZW50KSB8fCBtYXliZUV2ZW50LnR5cGUgIT09ICdrZXlkb3duJykge1xuICAgICAgLy8gaWYgb3VyIGZpcnN0IGFyZ3VtZW50IGlzIGEga2V5ZG93biBldmVudCBpdCBpcyBiZWluZyBoYW5kbGVkIGJ5IG91clxuICAgICAgLy8gYmluZGluZyBzeXN0ZW0uIGlmIGl0J3MgYW55dGhpbmcgZWxzZSwganVzdCBwYXNzIHRocm91Z2guXG4gICAgICByZXR1cm4gZm4uY2FsbC5hcHBseShmbiwgW3RoaXNdLmNvbmNhdChhcmdzKSk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBkZXNjcmlwdG9yO1xufVxuXG5leHBvcnQgZGVmYXVsdCBtZXRob2RXcmFwcGVyO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvbWV0aG9kX2RlY29yYXRvci5qc1xuLy8gbW9kdWxlIGlkID0gNTY2XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQG1vZHVsZSBtZXRob2RXcmFwcGVyU2NvcGVkXG4gKlxuICovXG5pbXBvcnQgbWF0Y2hLZXlzIGZyb20gJy4uL2xpYi9tYXRjaF9rZXlzJztcbmltcG9ydCBwYXJzZUtleXMgZnJvbSAnLi4vbGliL3BhcnNlX2tleXMnO1xuXG4vKipcbiAqIF9zaG91bGRUcmlnZ2VyXG4gKlxuICogQGFjY2VzcyBwcml2YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gdGhpc1Byb3BzIEV4c3RpbmcgcHJvcHMgZnJvbSB0aGUgd3JhcHBlZCBjb21wb25lbnRcbiAqIEBwYXJhbSB7b2JqZWN0fSB0aGlzUHJvcHMua2V5ZG93biBUaGUgbmFtZXNwYWNlZCBzdGF0ZSBmcm9tIHRoZSBoaWdoZXItb3JkZXJcbiAqIGNvbXBvbmVudCAoY2xhc3NfZGVjb3JhdG9yKVxuICogQHBhcmFtIHtvYmplY3R9IG5leHRQcm9wcyBUaGUgaW5jb21pbmcgcHJvcHMgZnJvbSB0aGUgd3JhcHBlZCBjb21wb25lbnRcbiAqIEBwYXJhbSB7b2JqZWN0fSBuZXh0UHJvcHMua2V5ZG93biBUaGUgbmFtZXNjYXBlZCBzdGF0ZSBmcm9tIHRoZSBoaWdoZXItb3JkZXJcbiAqIGNvbXBvbmVudCAoY2xhc3NfZGVjb3JhdG9yKVxuICogQHBhcmFtIHthcnJheX0ga2V5cyBUaGUga2V5cyBib3VuZCB0byB0aGUgZGVjb3JhdGVkIG1ldGhvZFxuICogQHJldHVybiB7Ym9vbGVhbn0gV2hldGhlciBhbGwgdGVzdHMgaGF2ZSBwYXNzZWRcbiAqL1xuZnVuY3Rpb24gX3Nob3VsZFRyaWdnZXIoX3JlZiwga2V5ZG93bk5leHQpIHtcbiAgdmFyIGtleWRvd25UaGlzID0gX3JlZi5rZXlkb3duO1xuXG4gIHJldHVybiBrZXlkb3duTmV4dCAmJiBrZXlkb3duTmV4dC5ldmVudCAmJiAha2V5ZG93blRoaXMuZXZlbnQ7XG59XG5cbi8qKlxuICogbWV0aG9kV3JhcHBlclNjb3BlZFxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKiBAcGFyYW0ge29iamVjdH0gYXJncyBBbGwgYXJncyBuZWNlc3NhcnkgZm9yIGRlY29yYXRpbmcgdGhlIG1ldGhvZFxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3MudGFyZ2V0IFRoZSBkZWNvcmF0ZWQgbWV0aG9kJ3MgY2xhc3Mgb2JqZWN0XG4gKiBAcGFyYW0ge29iamVjdH0gYXJncy5kZXNjcmlwdG9yIFRoZSBtZXRob2QncyBkZXNjcmlwdG9yIG9iamVjdFxuICogQHBhcmFtIHthcnJheX0gYXJncy5rZXlzIFRoZSBrZXkgY29kZXMgYm91bmQgdG8gdGhlIGRlY29yYXRlZCBtZXRob2RcbiAqIEByZXR1cm4ge29iamVjdH0gVGhlIG1ldGhvZCdzIGRlc2NyaXB0b3Igb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIG1ldGhvZFdyYXBwZXJTY29wZWQoX3JlZjIpIHtcbiAgdmFyIHRhcmdldCA9IF9yZWYyLnRhcmdldCxcbiAgICAgIGRlc2NyaXB0b3IgPSBfcmVmMi5kZXNjcmlwdG9yLFxuICAgICAga2V5cyA9IF9yZWYyLmtleXM7XG4gIHZhciBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzID0gdGFyZ2V0LmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM7XG5cbiAgdmFyIGZuID0gZGVzY3JpcHRvci52YWx1ZTtcbiAgaWYgKCFrZXlzKSB7XG4gICAgY29uc29sZS53YXJuKGZuICsgJzoga2V5ZG93blNjb3BlZCByZXF1aXJlcyBvbmUgb3IgbW9yZSBrZXlzJyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGtleVNldHMgPSBwYXJzZUtleXMoa2V5cyk7XG5cbiAgICAvLyB3cmFwIHRoZSBjb21wb25lbnQncyBsaWZlY3ljbGUgbWV0aG9kIHRvIGludGVyY2VwdCBrZXkgY29kZXMgY29taW5nIGRvd25cbiAgICAvLyBmcm9tIHRoZSB3cmFwcGVkL3Njb3BlZCBjb21wb25lbnQgdXAgdGhlIHZpZXcgaGllcmFyY2h5LiBpZiBuZXcga2V5ZG93blxuICAgIC8vIGV2ZW50IGhhcyBhcnJpdmVkIGFuZCB0aGUga2V5IGNvZGVzIG1hdGNoIHdoYXQgd2FzIHNwZWNpZmllZCBpbiB0aGVcbiAgICAvLyBkZWNvcmF0b3IsIGNhbGwgdGhlIHdyYXBwZWQgbWV0aG9kLlxuICAgIHRhcmdldC5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzID0gZnVuY3Rpb24gKG5leHRQcm9wcykge1xuICAgICAgdmFyIGtleWRvd24gPSBuZXh0UHJvcHMua2V5ZG93bjtcblxuICAgICAgaWYgKF9zaG91bGRUcmlnZ2VyKHRoaXMucHJvcHMsIGtleWRvd24pKSB7XG4gICAgICAgIGlmIChrZXlTZXRzLnNvbWUoZnVuY3Rpb24gKGtleVNldCkge1xuICAgICAgICAgIHJldHVybiBtYXRjaEtleXMoeyBrZXlTZXQ6IGtleVNldCwgZXZlbnQ6IGtleWRvd24uZXZlbnQgfSk7XG4gICAgICAgIH0pKSB7XG4gICAgICAgICAgcmV0dXJuIGZuLmNhbGwodGhpcywga2V5ZG93bi5ldmVudCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuID4gMSA/IF9sZW4gLSAxIDogMCksIF9rZXkgPSAxOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICAgIGFyZ3NbX2tleSAtIDFdID0gYXJndW1lbnRzW19rZXldO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcykgcmV0dXJuIGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMuY2FsbC5hcHBseShjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzLCBbdGhpcywgbmV4dFByb3BzXS5jb25jYXQoYXJncykpO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gZGVzY3JpcHRvcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgbWV0aG9kV3JhcHBlclNjb3BlZDtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL21ldGhvZF9kZWNvcmF0b3Jfc2NvcGVkLmpzXG4vLyBtb2R1bGUgaWQgPSA1Njdcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gcG9seWZpbGwgYXJyYXkuZnJvbSAobWFpbmx5IGZvciBJRSlcbmltcG9ydCAnLi9saWIvYXJyYXkuZnJvbSc7XG5cbi8vIEBrZXlkb3duIGFuZCBAa2V5ZG93blNjb3BlZFxuZXhwb3J0IHsgZGVmYXVsdCwga2V5ZG93blNjb3BlZCB9IGZyb20gJy4vZGVjb3JhdG9ycyc7XG5cbi8vIHNldEJpbmRpbmcgLSBvbmx5IHVzZWZ1bCBpZiB5b3UncmUgbm90IGdvaW5nIHRvIHVzZSBkZWNvcmF0b3JzXG5leHBvcnQgeyBzZXRCaW5kaW5nIH0gZnJvbSAnLi9zdG9yZSc7XG5cbi8vIEtleXMgLSB1c2UgdGhpcyB0byBmaW5kIGtleSBjb2RlcyBmb3Igc3RyaW5ncy4gZm9yIGV4YW1wbGU6IEtleXMuaiwgS2V5cy5lbnRlclxuZXhwb3J0IHsgZGVmYXVsdCBhcyBLZXlzIH0gZnJvbSAnLi9saWIva2V5cyc7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvaW5kZXguanNcbi8vIG1vZHVsZSBpZCA9IDU2OFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBQcm9kdWN0aW9uIHN0ZXBzIG9mIEVDTUEtMjYyLCBFZGl0aW9uIDYsIDIyLjEuMi4xXG4vLyBTZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvZnJvbVxuaWYgKCFBcnJheS5mcm9tKSB7XG4gIEFycmF5LmZyb20gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgICB2YXIgaXNDYWxsYWJsZSA9IGZ1bmN0aW9uIGlzQ2FsbGFibGUoZm4pIHtcbiAgICAgIHJldHVybiB0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicgfHwgdG9TdHIuY2FsbChmbikgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gICAgfTtcbiAgICB2YXIgdG9JbnRlZ2VyID0gZnVuY3Rpb24gdG9JbnRlZ2VyKHZhbHVlKSB7XG4gICAgICB2YXIgbnVtYmVyID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgIGlmIChpc05hTihudW1iZXIpKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuICAgICAgaWYgKG51bWJlciA9PT0gMCB8fCAhaXNGaW5pdGUobnVtYmVyKSkge1xuICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIChudW1iZXIgPiAwID8gMSA6IC0xKSAqIE1hdGguZmxvb3IoTWF0aC5hYnMobnVtYmVyKSk7XG4gICAgfTtcbiAgICB2YXIgbWF4U2FmZUludGVnZXIgPSBNYXRoLnBvdygyLCA1MykgLSAxO1xuICAgIHZhciB0b0xlbmd0aCA9IGZ1bmN0aW9uIHRvTGVuZ3RoKHZhbHVlKSB7XG4gICAgICB2YXIgbGVuID0gdG9JbnRlZ2VyKHZhbHVlKTtcbiAgICAgIHJldHVybiBNYXRoLm1pbihNYXRoLm1heChsZW4sIDApLCBtYXhTYWZlSW50ZWdlcik7XG4gICAgfTtcblxuICAgIC8vIFRoZSBsZW5ndGggcHJvcGVydHkgb2YgdGhlIGZyb20gbWV0aG9kIGlzIDEuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGZyb20oYXJyYXlMaWtlIC8qLCBtYXBGbiwgdGhpc0FyZyAqLykge1xuICAgICAgLy8gMS4gTGV0IEMgYmUgdGhlIHRoaXMgdmFsdWUuXG4gICAgICB2YXIgQyA9IHRoaXM7XG5cbiAgICAgIC8vIDIuIExldCBpdGVtcyBiZSBUb09iamVjdChhcnJheUxpa2UpLlxuICAgICAgdmFyIGl0ZW1zID0gT2JqZWN0KGFycmF5TGlrZSk7XG5cbiAgICAgIC8vIDMuIFJldHVybklmQWJydXB0KGl0ZW1zKS5cbiAgICAgIGlmIChhcnJheUxpa2UgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQXJyYXkuZnJvbSByZXF1aXJlcyBhbiBhcnJheS1saWtlIG9iamVjdCAtIG5vdCBudWxsIG9yIHVuZGVmaW5lZFwiKTtcbiAgICAgIH1cblxuICAgICAgLy8gNC4gSWYgbWFwZm4gaXMgdW5kZWZpbmVkLCB0aGVuIGxldCBtYXBwaW5nIGJlIGZhbHNlLlxuICAgICAgdmFyIG1hcEZuID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB2b2lkIHVuZGVmaW5lZDtcbiAgICAgIHZhciBUO1xuICAgICAgaWYgKHR5cGVvZiBtYXBGbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gNS4gZWxzZVxuICAgICAgICAvLyA1LiBhIElmIElzQ2FsbGFibGUobWFwZm4pIGlzIGZhbHNlLCB0aHJvdyBhIFR5cGVFcnJvciBleGNlcHRpb24uXG4gICAgICAgIGlmICghaXNDYWxsYWJsZShtYXBGbikpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheS5mcm9tOiB3aGVuIHByb3ZpZGVkLCB0aGUgc2Vjb25kIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNS4gYi4gSWYgdGhpc0FyZyB3YXMgc3VwcGxpZWQsIGxldCBUIGJlIHRoaXNBcmc7IGVsc2UgbGV0IFQgYmUgdW5kZWZpbmVkLlxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICBUID0gYXJndW1lbnRzWzJdO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIDEwLiBMZXQgbGVuVmFsdWUgYmUgR2V0KGl0ZW1zLCBcImxlbmd0aFwiKS5cbiAgICAgIC8vIDExLiBMZXQgbGVuIGJlIFRvTGVuZ3RoKGxlblZhbHVlKS5cbiAgICAgIHZhciBsZW4gPSB0b0xlbmd0aChpdGVtcy5sZW5ndGgpO1xuXG4gICAgICAvLyAxMy4gSWYgSXNDb25zdHJ1Y3RvcihDKSBpcyB0cnVlLCB0aGVuXG4gICAgICAvLyAxMy4gYS4gTGV0IEEgYmUgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIHRoZSBbW0NvbnN0cnVjdF1dIGludGVybmFsIG1ldGhvZCBcbiAgICAgIC8vIG9mIEMgd2l0aCBhbiBhcmd1bWVudCBsaXN0IGNvbnRhaW5pbmcgdGhlIHNpbmdsZSBpdGVtIGxlbi5cbiAgICAgIC8vIDE0LiBhLiBFbHNlLCBMZXQgQSBiZSBBcnJheUNyZWF0ZShsZW4pLlxuICAgICAgdmFyIEEgPSBpc0NhbGxhYmxlKEMpID8gT2JqZWN0KG5ldyBDKGxlbikpIDogbmV3IEFycmF5KGxlbik7XG5cbiAgICAgIC8vIDE2LiBMZXQgayBiZSAwLlxuICAgICAgdmFyIGsgPSAwO1xuICAgICAgLy8gMTcuIFJlcGVhdCwgd2hpbGUgayA8IGxlbuKApiAoYWxzbyBzdGVwcyBhIC0gaClcbiAgICAgIHZhciBrVmFsdWU7XG4gICAgICB3aGlsZSAoayA8IGxlbikge1xuICAgICAgICBrVmFsdWUgPSBpdGVtc1trXTtcbiAgICAgICAgaWYgKG1hcEZuKSB7XG4gICAgICAgICAgQVtrXSA9IHR5cGVvZiBUID09PSAndW5kZWZpbmVkJyA/IG1hcEZuKGtWYWx1ZSwgaykgOiBtYXBGbi5jYWxsKFQsIGtWYWx1ZSwgayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgQVtrXSA9IGtWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBrICs9IDE7XG4gICAgICB9XG4gICAgICAvLyAxOC4gTGV0IHB1dFN0YXR1cyBiZSBQdXQoQSwgXCJsZW5ndGhcIiwgbGVuLCB0cnVlKS5cbiAgICAgIEEubGVuZ3RoID0gbGVuO1xuICAgICAgLy8gMjAuIFJldHVybiBBLlxuICAgICAgcmV0dXJuIEE7XG4gICAgfTtcbiAgfSgpO1xufVxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9hcnJheS5mcm9tLmpzXG4vLyBtb2R1bGUgaWQgPSA1Njlcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBAbW9kdWxlIGRvbUhlbHBlcnNcbiAqXG4gKi9cbmltcG9ydCBSZWFjdERPTSBmcm9tICdyZWFjdC1kb20nO1xuXG52YXIgZm9jdXNhYmxlU2VsZWN0b3IgPSAnYVtocmVmXSwgYnV0dG9uLCBpbnB1dCwgb2JqZWN0LCBzZWxlY3QsIHRleHRhcmVhLCBbdGFiaW5kZXhdJztcblxuLyoqXG4gKiBiaW5kRm9jdXNhYmxlczogRmluZCBhbnkgZm9jdXNhYmxlIGNoaWxkIGVsZW1lbnRzIG9mIHRoZSBjb21wb25lbnQgaW5zdGFuY2UgYW5kXG4gKiBhZGQgYW4gb25Gb2N1cyBoYW5kbGVyIHRvIGZvY3VzIG91ciBrZXlkb3duIGhhbmRsZXJzIG9uIHRoZSBwYXJlbnQgY29tcG9uZW50XG4gKiB3aGVuIHVzZXIga2V5cyBhcHBsaWVzIGZvY3VzIHRvIHRoZSBlbGVtZW50LlxuICpcbiAqIE5PVEU6IE9uZSBsaW1pdGF0aW9uIG9mIHRoaXMgcmlnaHQgbm93IGlzIHRoYXQgaWYgeW91IHRhYiBvdXQgb2YgdGhlXG4gKiBjb21wb25lbnQsIF9mb2N1c2VkSW5zdGFuY2Ugd2lsbCBzdGlsbCBiZSBzZXQgdW50aWwgbmV4dCBjbGljayBvciBtb3VudCBvclxuICogY29udHJvbGxlZCBmb2N1cy5cbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIFRoZSBrZXktYm91bmQgY29tcG9uZW50IGluc3RhbmNlXG4gKiBAcGFyYW0ge2NhbGxiYWNrfSBhY3RpdmF0ZU9uRm9jdXMgVGhlIGZuIHRvIGZpcmUgd2hlbiBlbGVtZW50IGlzIGZvY3VzZWRcbiAqL1xuZnVuY3Rpb24gYmluZEZvY3VzYWJsZXMoaW5zdGFuY2UsIGFjdGl2YXRlT25Gb2N1cykge1xuICBpZiAoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCkge1xuICAgIHZhciBub2RlID0gUmVhY3RET00uZmluZERPTU5vZGUoaW5zdGFuY2UpO1xuICAgIGlmIChub2RlKSB7XG4gICAgICB2YXIgZm9jdXNhYmxlcyA9IG5vZGUucXVlcnlTZWxlY3RvckFsbChmb2N1c2FibGVTZWxlY3Rvcik7XG4gICAgICBpZiAoZm9jdXNhYmxlcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG9uRm9jdXMgPSBmdW5jdGlvbiBvbkZvY3VzKGVsZW1lbnQpIHtcbiAgICAgICAgICB2YXIgb25Gb2N1c1ByZXYgPSBlbGVtZW50Lm9uZm9jdXM7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgYWN0aXZhdGVPbkZvY3VzKGluc3RhbmNlKTtcbiAgICAgICAgICAgIGlmIChvbkZvY3VzUHJldikgb25Gb2N1c1ByZXYuY2FsbChlbGVtZW50LCBldmVudCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZm9jdXNhYmxlcykuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgIHJldHVybiBlbGVtZW50Lm9uZm9jdXMgPSBvbkZvY3VzKGVsZW1lbnQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBmaW5kQ29udGFpbmVyTm9kZXM6IENhbGxlZCBieSBvdXIgY2xpY2sgaGFuZGxlciB0byBmaW5kIGluc3RhbmNlcyB3aXRoIG5vZGVzXG4gKiB0aGF0IGFyZSBlcXVhbCB0byBvciB0aGF0IGNvbnRhaW4gdGhlIGNsaWNrIHRhcmdldC4gQW55IHRoYXQgcGFzcyB0aGlzIHRlc3RcbiAqIHdpbGwgYmUgcmVjaXBpZW50cyBvZiB0aGUgbmV4dCBrZXlkb3duIGV2ZW50LlxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IFRoZSBjbGljayBldmVudC50YXJnZXQgRE9NIGVsZW1lbnRcbiAqIEByZXR1cm4ge2Z1bmN0aW9ufSBSZWR1Y2VyIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGZpbmRDb250YWluZXJOb2Rlcyh0YXJnZXQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChtZW1vLCBpbnN0YW5jZSkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgbm9kZSA9IFJlYWN0RE9NLmZpbmRET01Ob2RlKGluc3RhbmNlKTtcbiAgICAgIGlmIChub2RlICYmIChub2RlID09PSB0YXJnZXQgfHwgbm9kZS5jb250YWlucyh0YXJnZXQpKSkge1xuICAgICAgICBtZW1vLnB1c2goeyBpbnN0YW5jZTogaW5zdGFuY2UsIG5vZGU6IG5vZGUgfSk7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBzb3J0QnlET01Qb3NpdGlvbjogQ2FsbGVkIGJ5IG91ciBjbGljayBoYW5kbGVyIHRvIHNvcnQgYSBsaXN0IG9mIGluc3RhbmNlc1xuICogYWNjb3JkaW5nIHRvIGxlYXN0IC0+IG1vc3QgbmVzdGVkLiBUaGlzIGlzIHNvIHRoYXQgaWYgbXVsdGlwbGUga2V5Ym91bmRcbiAqIGluc3RhbmNlcyBoYXZlIG5vZGVzIHRoYXQgYXJlIGFuY2VzdG9ycyBvZiB0aGUgY2xpY2sgdGFyZ2V0LCB0aGV5IHdpbGwgYmVcbiAqIHNvcnRlZCB0byBsZXQgdGhlIGluc3RhbmNlIGNsb3Nlc3QgdG8gdGhlIGNsaWNrIHRhcmdldCBnZXQgZmlyc3QgZGlicyBvbiB0aGVcbiAqIG5leHQga2V5IGRvd24gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIHNvcnRCeURPTVBvc2l0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEubm9kZS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbihiLm5vZGUpID09PSAxMCA/IDEgOiAtMTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgeyBiaW5kRm9jdXNhYmxlczogYmluZEZvY3VzYWJsZXMsIGZpbmRDb250YWluZXJOb2RlczogZmluZENvbnRhaW5lck5vZGVzLCBzb3J0QnlET01Qb3NpdGlvbjogc29ydEJ5RE9NUG9zaXRpb24gfTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvZG9tX2hlbHBlcnMuanNcbi8vIG1vZHVsZSBpZCA9IDU3MFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIEBtb2R1bGUgTGlzdGVuZXJzXG4gKlxuICovXG5cbi8vIGZsYWcgZm9yIHdoZXRoZXIgY2xpY2sgbGlzdGVuZXIgaGFzIGJlZW4gYm91bmQgdG8gZG9jdW1lbnRcbnZhciBfY2xpY2tzQm91bmQgPSBmYWxzZTtcblxuLy8gZmxhZyBmb3Igd2hldGhlciBrZXlkb3duIGxpc3RlbmVyIGhhcyBiZWVuIGJvdW5kIHRvIGRvY3VtZW50XG52YXIgX2tleXNCb3VuZCA9IGZhbHNlO1xuXG52YXIgTGlzdGVuZXJzID0ge1xuICAvKipcbiAgICogX2JpbmRLZXlzXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqL1xuICBiaW5kS2V5czogZnVuY3Rpb24gYmluZEtleXMoY2FsbGJhY2spIHtcbiAgICBpZiAoIV9rZXlzQm91bmQpIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBjYWxsYmFjayk7XG4gICAgICBfa2V5c0JvdW5kID0gdHJ1ZTtcbiAgICB9XG4gIH0sXG5cblxuICAvKipcbiAgICogdW5iaW5kS2V5c1xuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKi9cbiAgdW5iaW5kS2V5czogZnVuY3Rpb24gdW5iaW5kS2V5cyhjYWxsYmFjaykge1xuICAgIGlmIChfa2V5c0JvdW5kKSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgY2FsbGJhY2spO1xuICAgICAgX2tleXNCb3VuZCA9IGZhbHNlO1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiBiaW5kQ2xpY2tzXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqL1xuICBiaW5kQ2xpY2tzOiBmdW5jdGlvbiBiaW5kQ2xpY2tzKGNhbGxiYWNrKSB7XG4gICAgaWYgKCFfY2xpY2tzQm91bmQpIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2FsbGJhY2spO1xuICAgICAgX2NsaWNrc0JvdW5kID0gdHJ1ZTtcbiAgICB9XG4gIH0sXG5cblxuICAvKipcbiAgICogdW5iaW5kQ2xpY2tzXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqL1xuICB1bmJpbmRDbGlja3M6IGZ1bmN0aW9uIHVuYmluZENsaWNrcyhjYWxsYmFjaykge1xuICAgIGlmIChfY2xpY2tzQm91bmQpIHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2FsbGJhY2spO1xuICAgICAgX2NsaWNrc0JvdW5kID0gZmFsc2U7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBMaXN0ZW5lcnM7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2xpc3RlbmVycy5qc1xuLy8gbW9kdWxlIGlkID0gNTcxXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIENvdW50ZXIgYmVpbmcgaW5jcmVtZW50ZWQuIEpTIGlzIHNpbmdsZS10aHJlYWRlZCwgc28gaXQnbGwgSnVzdCBXb3Jr4oSiLlxudmFyIF9fY291bnRlciA9IDE7XG5cbi8qKlxuICogUmV0dXJucyBhIHByb2Nlc3Mtd2lkZSB1bmlxdWUgaWRlbnRpZmllci5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdXVpZCgpIHtcbiAgcmV0dXJuIFwidWlkLVwiICsgX19jb3VudGVyKys7XG59XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL3V1aWQuanNcbi8vIG1vZHVsZSBpZCA9IDU3MlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJpbXBvcnQgeyBkZWZpbmVNZW1vaXplZCB9IGZyb20gXCIuL21lbW9pemUuanNcIjtcbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi9SdWxlLmpzXCI7XG5cbi8vIHJlLWV4cG9ydCBSdWxlIGZvciB0ZXN0aW5nXG5leHBvcnQgZGVmYXVsdCBSdWxlO1xuXG4vL1xuLy9cdCMgUGFyc2luZyBgcnVsZVN5bnRheGAgdG8gY3JlYXRlIHJ1bGVzIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVE9ETzpcdFB1bGwgYHBhcnNlUnVsZVN5bnRheGAgc3R1ZmYgb3V0IGludG8gc2VwYXJhdGUgbW9kdWxlP1xuLy8gVE9ETzpcdEJldHRlciBuYW1lIGZvciBgcnVsZVN5bnRheGBcbi8vIFRPRE86XHRVc2Uga2V5d29yZHMgaW4gc3ludGF4IHRvIG1ha2UgYSBxdWljayByZWdleC1iYXNlZCBgdGVzdGAgZnVuY3Rpb24gZm9yIHRoZSBlbnRpcmUgcnVsZVxuT2JqZWN0LmFzc2lnbihSdWxlLCB7XG5cbi8vXG4vLyAjIyBncm91cDogcGFyc2luZyBzeW50YXhcbi8vXG5cblx0cGFyc2VSdWxlU3ludGF4KHN5bnRheCwgU2VxdWVuY2VDb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UpIHtcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgoc3ludGF4KTtcblx0XHRsZXQgcnVsZXMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3ludGF4U3RyZWFtLCBbXSk7XG5cblx0XHRsZXQgcnVsZTtcblx0XHQvLyBJZiB3ZSBvbmx5IGdvdCBvbmUgdGhpbmcsIHJldHVybiB0aGF0IGFzIHRoZSByZXN1bHRcblx0XHRpZiAocnVsZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRydWxlID0gcnVsZXNbMF07XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cnVsZSA9IG5ldyBTZXF1ZW5jZUNvbnN0cnVjdG9yKHsgcnVsZXMgfSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJ1bGU7XG5cdH0sXG5cblx0dG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCkge1xuXHRcdGNvbnN0IFNZTlRBWF9FWFBSRVNTSU9OID0gLyg/OltcXHdcXC1dK3xcXFxcW1xcW1xcKFxce1xcKVxcfVxcXV18W15cXHNcXHddfFxcfCkvZztcblx0XHRsZXQgc3ludGF4U3RyZWFtID0gc3ludGF4Lm1hdGNoKFNZTlRBWF9FWFBSRVNTSU9OKTtcblx0XHRpZiAoIXN5bnRheFN0cmVhbSkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBDYW4ndCB0b2tlbml6ZSBwYXJzZSBydWxlIHN5bnRheCA+PiR7c3ludGF4fTw8YCk7XG5cdFx0cmV0dXJuIHN5bnRheFN0cmVhbTtcblx0fSxcblxuXHRwYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnQgPSAwKSB7XG5cdFx0bGV0IGxhc3RJbmRleCA9IHN5bnRheFN0cmVhbS5sZW5ndGg7XG5cdFx0d2hpbGUgKHN0YXJ0IDwgbGFzdEluZGV4KSB7XG5cdFx0XHRsZXQgWyBydWxlLCBlbmQgXSA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0KTtcblx0XHRcdGlmIChydWxlKSB7XG5cdFx0XHRcdGxldCBsYXN0ID0gcnVsZXNbcnVsZXMubGVuZ3RoLTFdO1xuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgYFN5bWJvbGAgYW5kIGxhc3Qgd2FzIGEgYFN5bWJvbGAsIG1lcmdlIHRvZ2V0aGVyXG4gXHRcdFx0XHRpZiAobGFzdCAmJiBsYXN0IGluc3RhbmNlb2YgUnVsZS5TeW1ib2wgJiYgcnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sKSB7XG4gXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgbGFzdCBydWxlXG4gXHRcdFx0XHRcdHJ1bGVzLnBvcCgpO1xuIFx0XHRcdFx0XHQvLyBhbmQgcmVwbGFjZSB3aXRoIGEgcnVsZSB0aGF0IG1lcmdlcyB0aGUga2V5d29yZHNcbiBcdFx0XHRcdFx0cnVsZS5tYXRjaCA9IGxhc3QubWF0Y2guY29uY2F0KHJ1bGUubWF0Y2gpO1xuIFx0XHRcdFx0fVxuXHRcdFx0XHRydWxlcy5wdXNoKHJ1bGUpO1xuXHRcdFx0fVxuXHRcdFx0c3RhcnQgPSBlbmQgKyAxO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZXM7XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VuKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnQgPSAwKSB7XG5cdFx0bGV0IHN5bnRheFRva2VuID0gc3ludGF4U3RyZWFtW3N0YXJ0XTtcblxuXHRcdC8vIGlmIHdlIGdvdCBhIFwiXFxcXFwiICh3aGljaCBhbHNvIGhhcyB0byBnbyBpbnRvIHRoZSBzb3VyY2Ugc3RyaW5nIGFzIFwiXFxcXFwiKVxuXHRcdC8vIHRyZWF0IHRoZSBuZXh0IHRva2VuIGFzIGEgbGl0ZXJhbCBzdHJpbmcgcmF0aGVyIHRoYW4gYXMgYSBzcGVjaWFsIGNoYXJhY3Rlci5cblx0XHRpZiAoc3ludGF4VG9rZW4gPT09IFwiXFxcXFwiKSB7XG5cdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3ltYm9sKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0ICsgMSk7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChzeW50YXhUb2tlbikge1xuXHRcdFx0Y2FzZSBcIntcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zdWJydWxlKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0KTtcblx0XHRcdGNhc2UgXCIoXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnQpO1xuXHRcdFx0Y2FzZSBcIltcIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9saXN0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0KTtcblx0XHRcdGNhc2UgXCIqXCI6XG5cdFx0XHRjYXNlIFwiK1wiOlxuXHRcdFx0Y2FzZSBcIj9cIjpcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9yZXBlYXQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnQpO1xuXG5cdFx0XHQvLyB0aGUgZm9sbG93aW5nIHNob3VsZCBBTFdBWVMgYmUgY29uc3VtZWQgYnkgdGhlIGFib3ZlXG5cdFx0XHRjYXNlIFwifVwiOlxuXHRcdFx0Y2FzZSBcIilcIjpcblx0XHRcdGNhc2UgXCJdXCI6XG5cdFx0XHRjYXNlIFwifFwiOlxuXHRcdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgJHtzeW50YXhUb2tlbn0gZm91bmQgYXMgaXRlbSAke3N0YXJ0fSBvZiAke3RoaXMuc3ludGF4fWApO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRpZiAoc3ludGF4VG9rZW4ubWF0Y2goUnVsZS5LRVlXT1JEX1BBVFRFUk4pKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcywgc3RhcnQpO1xuXHRcdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdEtFWVdPUkRfUEFUVEVSTiA6IC9bQS1aYS16XVtcXHdfLV0qLyxcblxuXHQvLyBNYXRjaCBga2V5d29yZGAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBJZiBtb3JlIHRoYW4gb25lIGtleXdvcmQgYXBwZWFycyBpbiBhIHJvdywgY29tYmluZXMgdGhlbSBpbnRvIGEgc2luZ2xlIGBLZXl3b3JkYCBvYmplY3QuXG5cdC8vIFRoaXMgaXMgcHJldHR5IHNhZmUsIHVubGVzcyB5b3UgaGF2ZSBhbiBvcHRpb25hbCBrZXl3b3JkIGxpa2Vcblx0Ly9cdFx0YHRoZSB7aWRlbnRpZmllcn0gb2YgdGhlPyB7ZXhwcmVzc2lvbn1gXG5cdC8vIGluIHdoaWNoIGNhc2UgeW91IGNhbiBwdXQgdGhlIG9wdGlvbmFsIGtleXdvcmQgaW4gcGFyZW5zXG5cdC8vXHRcdGB0aGUge2lkZW50aWZpZXJ9IG9mICh0aGU/KSB7ZXhwcmVzc2lvbn1gXG5cdC8vXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kIF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfa2V5d29yZChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0ID0gMCwgY29uc3RydWN0b3IpIHtcblx0XHRsZXQgbWF0Y2ggPSBbXSwgZW5kO1xuIFx0XHQvLyBlYXQga2V5d29yZHMgd2hpbGUgdGhleSBsYXN0XG5cdFx0Zm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgc3ludGF4U3RyZWFtLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXQgbmV4dCA9IHN5bnRheFN0cmVhbVtpXTtcblx0XHRcdGlmICh0eXBlb2YgbmV4dCA9PT0gXCJzdHJpbmdcIiAmJiBuZXh0Lm1hdGNoKFJ1bGUuS0VZV09SRF9QQVRURVJOKSkge1xuXHRcdFx0XHRtYXRjaC5wdXNoKG5leHQpO1xuXHRcdFx0XHRlbmQgPSBpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBicmVhaztcblx0XHR9XG5cblx0XHRpZiAoIWNvbnN0cnVjdG9yKSBjb25zdHJ1Y3RvciA9IFJ1bGUuS2V5d29yZDtcblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IG1hdGNoIH0pO1xuXG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kIF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gUmV0dXJucyBgWyBydWxlLCBlbmQgXWBcblx0Ly8gVGhyb3dzIGlmIGludmFsaWQuXG5cdHBhcnNlUnVsZVN5bnRheF9zeW1ib2woc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydCA9IDAsIGNvbnN0cnVjdG9yID0gUnVsZS5TeW1ib2wpIHtcblx0XHRsZXQgc3RyaW5nID0gc3ludGF4U3RyZWFtW3N0YXJ0XTtcblxuXHRcdGlmICghY29uc3RydWN0b3IpIGNvbnN0cnVjdG9yID0gUnVsZS5TeW1ib2w7XG5cblx0XHQvLyBJZiBzdHJpbmcgc3RhcnRzIHdpdGggYFxcXFxgLCBpdCdzIGFuIGVzY2FwZWQgbGl0ZXJhbCAoZWc6IGBcXFtgIG5lZWRzIHRvIGlucHV0IGFzIGBcXFxcW2ApLlxuXHRcdGxldCBpc0VzY2FwZWQgPSBzdHJpbmcuc3RhcnRzV2l0aChcIlxcXFxcIik7XG5cdFx0bGV0IG1hdGNoID0gaXNFc2NhcGVkID8gc3RyaW5nLnN1YnN0cigxKSA6IHN0cmluZztcblxuXHRcdGxldCBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHsgbWF0Y2ggfSk7XG5cblx0XHRpZiAoaXNFc2NhcGVkKSB7XG5cdFx0XHRydWxlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBgXFxcXCR7bWF0Y2h9JHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gWyBydWxlLCBzdGFydCBdO1xuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggZ3JvdXBpbmcgZXhwcmVzc2lvbiBgKC4uLnwuLi4pYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kIF1gXG5cdC8vIFlvdSBjYW4gc3BlY2lmeSBhbiBleHBsaWNpdCBgcnVsZS5hcmd1bWVudGAgd2l0aDogIGAoc29tZWFyZzouLi4pYFxuXHQvLyBZb3UgY2FuIHNwZWNpZnkgdGhhdCB0aGUgcmVzdWx0cyBzaG91bGQgYmUgYHByb21vdGVkYCB0byBlbmNsb3NpbmcgY29udGV4dCB3aXRoOiBgKD86Li4uKWBcblx0Ly9cblx0Ly8gTk9URTogbmVzdGVkIHBhcmVucyBtYXkgbm90IGhhdmUgYWx0ZXJuYXRpdmVzLi4uIDotKCAgIGAoYXwoYnxjKSlgIHdvbid0IHdvcms/Pz9cblx0cGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnQgPSAwKSB7XG5cdFx0bGV0IHsgZW5kLCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIihcIiwgXCIpXCIsIHN0YXJ0KTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IFwicHJvbW90ZVwiIGZsYWc6IGA/OmBcblx0XHRsZXQgcHJvbW90ZSA9IChzbGljZVswXSA9PT0gXCI/XCIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKTtcblx0XHRpZiAocHJvbW90ZSkgc2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblxuXHRcdC8vIHB1bGwgb3V0IGV4cGxpY2l0IGFyZ3VtZW50IG5hbWVcblx0XHRsZXQgYXJndW1lbnQ7XG5cdFx0aWYgKHNsaWNlLmxlbmd0aCA+IDIgJiYgc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IHNsaWNlWzBdO1xuXHRcdFx0c2xpY2UgPSBzbGljZS5zbGljZSgyKTtcblx0XHR9XG5cblx0XHQvLyBzcGxpdCBpbnRvIGdyb3VwcywgaW5jbHVkaW5nIG5lc3RlZCBwYXJlbnNcblx0XHRsZXQgYWx0ZXJuYXRpdmVzID1cblx0XHRcdGdyb3VwQWx0ZXJuYXRpdmVzKHNsaWNlKVxuXHRcdFx0Lm1hcChmdW5jdGlvbihncm91cCkge1xuXHRcdFx0XHRsZXQgcmVzdWx0cyA9IFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2Vucyhncm91cCwgW10pO1xuXHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0c1swXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IFJ1bGUuU2VxdWVuY2UoeyBydWxlczogcmVzdWx0cyB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRsZXQgcnVsZSA9IGFsdGVybmF0aXZlcy5sZW5ndGggPT09IDEgPyBhbHRlcm5hdGl2ZXNbMF0gOiBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlczogYWx0ZXJuYXRpdmVzIH0pO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdGlmIChwcm9tb3RlKSBydWxlLnByb21vdGUgPSB0cnVlO1xuXHRcdHJldHVybiBbIHJ1bGUsIGVuZCBdO1xuXG5cdFx0ZnVuY3Rpb24gZ3JvdXBBbHRlcm5hdGl2ZXModG9rZW5zKSB7XG5cdFx0XHRsZXQgYWx0ZXJuYXRpdmVzID0gW107XG5cdFx0XHRsZXQgY3VycmVudCA9IFtdO1xuXHRcdFx0Zm9yIChsZXQgaSA9IDAsIHRva2VuOyB0b2tlbiA9IHRva2Vuc1tpXTsgaSsrKSB7XG5cdFx0XHRcdC8vIGhhbmRsZSBhbHRlcm5hdGUgbWFya2VyXG5cdFx0XHRcdGlmICh0b2tlbiA9PT0gXCJ8XCIpIHtcblx0XHRcdFx0XHRhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XHRjdXJyZW50ID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaGFuZGxlIG5lc3RlZCBwYXJlbnNcblx0XHRcdFx0ZWxzZSBpZiAodG9rZW4gPT09IFwiKFwiKSB7XG5cdFx0XHRcdFx0bGV0IHsgZW5kIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2Vucyh0b2tlbnMsIFwiKFwiLCBcIilcIiwgaSk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQuY29uY2F0KHRva2Vucy5zbGljZShpLCBlbmQgKyAxKSk7XG5cdFx0XHRcdFx0aSA9IGVuZDtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjdXJyZW50LnB1c2godG9rZW4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoY3VycmVudC5sZW5ndGgpIGFsdGVybmF0aXZlcy5wdXNoKGN1cnJlbnQpO1xuXHRcdFx0cmV0dXJuIGFsdGVybmF0aXZlcztcblx0XHR9XG5cdH0sXG5cblx0Ly8gTWF0Y2ggcmVwZWF0IGluZGljYXRvciBgP2AsIGArYCBvciBgKmAgYnkgYXR0YWNoaW5nIGl0IHRvIHRoZSBwcmV2aW91cyBydWxlLlxuXHRwYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnQgPSAwKSB7XG5cdFx0bGV0IHN5bWJvbCA9IHN5bnRheFN0cmVhbVtzdGFydF07XG5cdFx0bGV0IHJ1bGUgPSBydWxlc1tydWxlcy5sZW5ndGggLSAxXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgYXR0YWNoIHJlcGVhdCBzeW1ib2wgJHtzeW1ib2x9IHRvIGVtcHR5IHJ1bGUhYCk7XG5cblx0XHQvLyBUcmFuc2Zvcm0gbGFzdCBydWxlIGludG8gYSByZXBlYXQgZm9yIGAqYCBhbmQgYCtgLlxuXHRcdGlmIChzeW1ib2wgPT09IFwiKlwiIHx8IHN5bWJvbCA9PT0gXCIrXCIpIHtcblx0XHRcdGxldCBhcmd1bWVudCA9IHJ1bGUuYXJndW1lbnQ7XG5cdFx0XHRydWxlID0gbmV3IFJ1bGUuUmVwZWF0KHsgcnVsZSB9KTtcblx0XHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdFx0Ly8gcHVzaCBpbnRvIHJ1bGUgc3RhY2sgaW4gcGxhY2Ugb2Ygb2xkIHJ1bGVcblx0XHRcdHJ1bGVzW3J1bGVzLmxlbmd0aCAtIDFdID0gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBSdWxlIGlzIG9wdGlvbmFsIGZvciBgP2AgYW5kIGAqYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIj9cIiB8fCBzeW1ib2wgPT09IFwiKlwiKSB7XG5cdFx0XHRydWxlLm9wdGlvbmFsID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gWyB1bmRlZmluZWQsIHN0YXJ0IF1cblx0fSxcblxuXHQvLyBNYXRjaCBgezxydWxlTmFtZT59YCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kIF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0ID0gMCkge1xuXHRcdGxldCBtYXRjaCA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCJ7XCIsIFwifVwiLCBzdGFydCk7XG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPT09IDMgJiYgbWF0Y2guc2xpY2VbMV0gPT09IFwiOlwiKSB7XG5cdFx0XHRhcmd1bWVudCA9IG1hdGNoLnNsaWNlWzBdO1xuXHRcdFx0bWF0Y2guc2xpY2UgPSBtYXRjaC5zbGljZS5zbGljZSgyKTtcblx0XHR9XG5cdFx0aWYgKG1hdGNoLnNsaWNlLmxlbmd0aCA+IDEpIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgcHJvY2VzcyBydWxlcyB3aXRoIG1vcmUgdGhhbiBvbmUgcnVsZSBuYW1lOiB7JHttYXRjaC5zbGljZS5qb2luKFwiXCIpfX1gKTtcblxuXHRcdGxldCBwYXJhbXMgPSB7IHJ1bGU6IG1hdGNoLnNsaWNlWzBdIH07XG5cblx0XHQvLyBzZWUgaWYgdGhlcmUncyBhIGBub3RgIHJ1bGUgaW4gdGhlcmVcblx0XHRsZXQgYmFuZ1Bvc2l0aW9uID0gcGFyYW1zLnJ1bGUuaW5kZXhPZihcIiFcIik7XG5cdFx0aWYgKGJhbmdQb3NpdGlvbiAhPT0gLTEpIHtcblx0XHRcdHBhcmFtcy5ub3QgPSBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSk7IC8vWyBwYXJhbXMucnVsZS5zdWJzdHIoYmFuZ1Bvc2l0aW9uICsgMSkgXTtcblx0XHRcdHBhcmFtcy5ydWxlID0gcGFyYW1zLnJ1bGUuc3Vic3RyKDAsIGJhbmdQb3NpdGlvbik7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgUnVsZS5TdWJydWxlKHBhcmFtcyk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgbWF0Y2guZW5kIF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggbGlzdCBleHByZXNzaW9uIGBbPGl0ZW0+PGRlbGltaXRlcj5dYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kIF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0ID0gMCwgY29uc3RydWN0b3IgPSBSdWxlLkxpc3QpIHtcblx0XHRsZXQgeyBlbmQsIHNsaWNlIH0gPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwiW1wiLCBcIl1cIiwgc3RhcnQpO1xuXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc2xpY2UsIFtdKTtcblx0XHRpZiAocmVzdWx0cy5sZW5ndGggIT09IDIpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgVW5leHBlY3RlZCBzdHVmZiBhdCBlbmQgb2YgbGlzdDogWyR7c2xpY2Uuam9pbihcIiBcIil9XWApO1xuXHRcdH1cblx0XHRsZXQgWyBpdGVtLCBkZWxpbWl0ZXIgXSA9IHJlc3VsdHM7XG5cblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IGl0ZW0sIGRlbGltaXRlciB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmQgXTtcblx0fSxcblxufSk7XG5cblxuXG4vLyAjIyAgQWRkIG1ldGhvZHMgdG8gUGFyc2VyIHRvIGRlZmluZSBydWxlcyB1c2luZyB0aGUgYWJvdmUgc3ludGF4LlxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUGFyc2VyLnByb3RvdHlwZSwge1xuXG5cdC8vIFBhcnNlIGEgYHJ1bGVTeW50YXhgIHJ1bGUgYW5kIGFkZCBpdCB0byBvdXIgbGlzdCBvZiBydWxlcy5cblx0Ly8gUmV0dXJucyB0aGUgbmV3IHJ1bGUuXG5cdC8vIExvZ3MgcGFyc2luZyBlcnJvcnMgYnV0IGFsbG93cyB0aGluZ3MgdG8gY29udGludWUuXG5cdGFkZFNlcXVlbmNlOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuU2VxdWVuY2UsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSk7XG5cblx0XHRpZiAodHlwZW9mIGNvbnN0cnVjdG9yICE9PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHByb3BlcnRpZXMgPSBjb25zdHJ1Y3Rvcjtcblx0XHRcdGNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZTtcblx0XHR9XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgY29uc3RydWN0b3IpO1xuXHRcdFx0Ly8gUmVmbGVjdCB0aGUgcnVsZSBiYWNrIG91dCB0byBtYWtlIHN1cmUgaXQgbG9va3MgKG1vcmUgb3IgbGVzcykgdGhlIHNhbWVcblx0XHRcdGlmIChQYXJzZXIuREVCVUcpIGNvbnNvbGUubG9nKGBBZGRlZCBydWxlICcke25hbWV9JzpcXG4gIElOUFVUOiAke3J1bGVTeW50YXh9IFxcbiBPVVRQVVQ6ICR7cnVsZX1gKTtcblxuLy9jb25zb2xlLmluZm8obmFtZSwgY29uc3RydWN0b3IsIHJ1bGUpO1xuXHRcdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0fVxuXHR9fSxcblxuXHRhZGRTdGF0ZW1lbnQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5TdGF0ZW1lbnQsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRTdGF0ZW1lbnQobmFtZSwgc3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcykpO1xuXG5cdFx0bGV0IHJ1bGUgPSB0aGlzLmFkZFNlcXVlbmNlKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKTtcblx0XHRpZiAocnVsZSkgcmV0dXJuIHRoaXMuYWRkUnVsZShcInN0YXRlbWVudFwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkRXhwcmVzc2lvbjogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLkV4cHJlc3Npb24sIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRFeHByZXNzaW9uKG5hbWUsIHN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpKTtcblxuXHRcdGxldCBydWxlID0gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcyk7XG5cdFx0aWYgKHJ1bGUpIHJldHVybiB0aGlzLmFkZFJ1bGUoXCJleHByZXNzaW9uXCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRMaXN0OiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuTGlzdCwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZExpc3QobmFtZSwgc3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcykpO1xuXG5cdFx0bGV0IHN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgpO1xuXHRcdGxldCBydWxlID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKVswXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZS5hZGRMaXN0KCR7bmFtZX0sICR7cnVsZVN5bnRheH0pOiBubyBydWxlIHByb2R1Y2VkYCk7XG5cdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fX0sXG5cblx0YWRkS2V5d29yZDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLktleXdvcmQsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXguZm9yRWFjaChzeW50YXggPT4gdGhpcy5hZGRLZXl3b3JkKG5hbWUsIHN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpKTtcblxuXHRcdGxldCBzdHJlYW0gPSBSdWxlLnRva2VuaXNlUnVsZVN5bnRheChydWxlU3ludGF4KTtcblx0XHRsZXQgcnVsZSA9IChSdWxlLnBhcnNlUnVsZVN5bnRheF9rZXl3b3JkKHN0cmVhbSwgW10sIDAsIGNvbnN0cnVjdG9yKSB8fCBbXSlbMF07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFJ1bGUuYWRkS2V5d29yZCgke25hbWV9LCAke3J1bGVTeW50YXh9KTogbm8gcnVsZSBwcm9kdWNlZGApO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG5cdGFkZFN5bWJvbDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlN5bWJvbCwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5mb3JFYWNoKHN5bnRheCA9PiB0aGlzLmFkZFN5bWJvbChuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSk7XG5cblx0XHQvLyBQYXJzZSBhcyBgdG9rZW5zYCwgd2hpY2ggd2lsbCBtZXJnZSBTeW1ib2xzIGZvciB1cy5cblx0XHRsZXQgc3RyZWFtID0gUnVsZS50b2tlbmlzZVJ1bGVTeW50YXgocnVsZVN5bnRheCk7XG5cdFx0bGV0IHJ1bGVzID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X3Rva2VucyhzdHJlYW0sIFtdLCAwLCBjb25zdHJ1Y3RvcikgfHwgW10pO1xuXG5cdFx0aWYgKHJ1bGVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBSdWxlLmFkZFN5bWJvbCgke25hbWV9LCAke3J1bGVTeW50YXh9KTogbm8gcnVsZSBwcm9kdWNlZGApO1xuXHRcdH1cblxuXHRcdGlmIChydWxlcy5sZW5ndGggPiAxIHx8ICEocnVsZXNbMF0gaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCkpIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZS5hZGRTeW1ib2woJHtuYW1lfSwgJHtydWxlU3ludGF4fSk6IGdlbmVyYXRlZCBzb21ldGhpbmcgYCtcblx0XHRcdFx0YCBvdGhlciB0aGFuIGEgc2luZ2xlIFN5bWJvbC4gIFVzZSBSdWxlLmFkZFN5bnRheCgpIGluc3RlYWQuYCk7XG5cdFx0fVxuXG5cdFx0bGV0IHJ1bGUgPSBydWxlc1swXTtcblx0XHQvLyBDb252ZXJ0IHRvIHByb3BlciB0eXBlIGlmIG5lY2Vzc2FyeVxuXHRcdGlmIChjb25zdHJ1Y3RvciAhPT0gUnVsZS5TeW1ib2wpIHJ1bGUgPSBuZXcgY29uc3RydWN0b3IocnVsZSk7XG5cdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fX0sXG5cbn0pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGVTeW50YXguanMiLCIvL1xuLy9cdCMgQ29yZSBgcnVsZXNgIC0tIHNpbXBsZSBkYXRhdHlwZXMsIGV0Yy5cbi8vXG4vLyBOT1RFOiBtYW55IG9mIHRoZSBiZWxvdyBhcmUgY3JlYXRlZCBhcyBjdXN0b20gUGF0dGVybiBzdWJjbGFzc2VzIGZvciBkZWJ1Z2dpbmcuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuaW1wb3J0IFRva2VuaXplciBmcm9tIFwiLi4vVG9rZW5pemVyXCI7XG5cbi8vIENyZWF0ZSBgY29yZWAgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcImNvcmVcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cblxuLy9cbi8vICMjIyBJbnN0YWxsIHN0YW5kYXJkIHJ1bGVzXG4vL1xuXG5wYXJzZXIuYWRkUnVsZShcInN0YXRlbWVudHNcIiwgUnVsZS5TdGF0ZW1lbnRzKTtcbnBhcnNlci5hZGRSdWxlKFwiY29tbWVudFwiLCBSdWxlLkNvbW1lbnQpO1xuXG5cblxuXG4vLyBgd29yZGAgPSBpcyBhIHNpbmdsZSBhbHBoYW51bWVyaWMgd29yZC5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5Xb3JkID0gY2xhc3Mgd29yZCBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufTtcblJ1bGUuV29yZC5wcm90b3R5cGUucGF0dGVybiA9IC9eW2Etel1bXFx3XFwtXSokLztcbnBhcnNlci5hZGRSdWxlKFwid29yZFwiLCBSdWxlLldvcmQpO1xuXG5cbi8vIGBpZGVudGlmaWVyYCA9IHZhcmlhYmxlcyBvciBwcm9wZXJ0eSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGEgbG93ZXItY2FzZSBsZXR0ZXIgKD8pXG4vLyBOT1RFOiBXZSBibGFja2xpc3QgYSBsb3Qgb2Ygd29yZHMgYXMgaWRlbnRpZmllcnMuXG5SdWxlLklkZW50aWZpZXIgPSBjbGFzcyBpZGVudGlmaWVyIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHR9XG59O1xuUnVsZS5JZGVudGlmaWVyLnByb3RvdHlwZS5wYXR0ZXJuID0gL15bYS16XVtcXHdcXC1dKiQvO1xubGV0IGlkZW50aWZpZXIgPSBwYXJzZXIuYWRkUnVsZShbXCJpZGVudGlmaWVyXCIsIFwiZXhwcmVzc2lvblwiXSwgUnVsZS5JZGVudGlmaWVyKTtcblxuLy8gQWRkIEVuZ2xpc2ggcHJlcG9zaXRpb25zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy9cbi8vIFdpa2lwZWRpYSBcIlByZXBvc2l0aW9uXCI6XG4vL1x0XCJQcmVwb3NpdGlvbnMuLi5hcmUgYSBjbGFzcyBvZiB3b3JkcyB0aGF0XG4vL1x0ZXhwcmVzcyBzcGF0aWFsIG9yIHRlbXBvcmFsIHJlbGF0aW9ucyAgKGluLCB1bmRlciwgdG93YXJkcywgYmVmb3JlKVxuLy9cdG9yIG1hcmsgdmFyaW91cyBzZW1hbnRpYyByb2xlcyAob2YsIGZvcikuXG4vLyBURVNUTUVcbmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiYWJvdXRcIiwgXCJhYm92ZVwiLCBcImFmdGVyXCIsIFwiYW5kXCIsIFwiYXNcIiwgXCJhdFwiLFxuXHRcImJlZm9yZVwiLCBcImJlaGluZFwiLCBcImJlbG93XCIsIFwiYmVuZWF0aFwiLCBcImJlc2lkZVwiLCBcImJldHdlZW5cIiwgXCJiZXlvbmRcIiwgXCJieVwiLFxuXHRcImRlZmluZWRcIiwgXCJkb3duXCIsIFwiZHVyaW5nXCIsXG5cdFwiZWFjaFwiLCBcImVtcHR5XCIsIFwiZXhhY3RseVwiLCBcImV4Y2VwdFwiLFxuXHRcImZvclwiLCBcImZyb21cIixcblx0XCJncmVhdGVyXCIsXG5cdFwiSVwiLCBcImluXCIsIFwiaW50b1wiLFxuXHRcImxlc3NcIiwgXCJsb25nXCIsXG5cdFwibWVcIiwgXCJtaW51c1wiLCBcIm1vcmVcIixcblx0XCJuZWFyXCIsIFwibm90XCIsXG5cdFwib2ZcIiwgXCJvZmZcIiwgXCJvblwiLCBcIm9udG9cIiwgXCJvcHBvc2l0ZVwiLCBcIm9yXCIsIFwib3V0XCIsIFwib3V0c2lkZVwiLCBcIm92ZXJcIixcblx0XCJzaG9ydFwiLCBcInNpbmNlXCIsXG5cdFwidGhhblwiLCBcInRoZVwiLCBcInRoZW5cIiwgXCJ0aHJvdWdoXCIsIFwidGhydVwiLCBcInRvXCIsIFwidG93YXJkXCIsIFwidG93YXJkc1wiLFxuXHRcInVuZGVmaW5lZFwiLCBcInVuZGVyXCIsIFwidW5kZXJuZWF0aFwiLCBcInVuaXF1ZVwiLCBcInVudGlsXCIsIFwidXBcIiwgXCJ1cG9uXCIsIFwidXBzaWRlXCIsXG5cdFwidmVyc3VzXCIsIFwidnNcIixcblx0XCJ3aGVyZVwiLCBcIndpdGhcIiwgXCJ3aXRoaW5cIiwgXCJ3aXRob3V0XCIsXG4pO1xuXG4vLyBBZGQgY29tbW9uIGVuZ2xpc2ggdmVyYnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFyZVwiLFxuXHRcImRvXCIsIFwiZG9lc1wiLFxuXHRcImNvbnRhaW5zXCIsXG5cdFwiaGFzXCIsIFwiaGF2ZVwiLFxuXHRcImlzXCIsXG5cdFwicmVwZWF0XCIsXG5cdFwid2FzXCIsIFwid2VyZVwiXG4pO1xuXG4vLyBBZGQgc3BlY2lhbCBjb250cm9sIGtleXdvcmRzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJlbHNlXCIsXG5cdFwiaWZcIixcblx0XCJvdGhlcndpc2VcIixcblx0XCJ3aGlsZVwiXG4pO1xuXG4vLyBgVHlwZWAgPSB0eXBlIG5hbWUuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYW4gdXBwZXItY2FzZSBsZXR0ZXIgKD8pXG5SdWxlLlR5cGUgPSBjbGFzcyB0eXBlIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0Ly8gQ29udmVydCBcIi1cIiB0byBcIl9cIiBpbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IHR5cGUgPSB0aGlzLm1hdGNoZWQ7XG5cdFx0c3dpdGNoKHR5cGUpIHtcblx0XHRcdC8vIHNwZWNpYWwgY2FzZSB0byB0YWtlIHRoZSBmb2xsb3dpbmcgYXMgbG93ZXJjYXNlXG5cdFx0XHRjYXNlIFwidGV4dFwiOlx0XHRyZXR1cm4gXCJTdHJpbmdcIjtcblx0XHRcdGNhc2UgXCJjaGFyYWN0ZXJcIjpcdHJldHVybiBcIkNoYXJhY3RlclwiO1xuXHRcdFx0Y2FzZSBcIm51bWJlclwiOlx0XHRyZXR1cm4gXCJOdW1iZXJcIjtcblx0XHRcdGNhc2UgXCJpbnRlZ2VyXCI6XHRcdHJldHVybiBcIkludGVnZXJcIjtcblx0XHRcdGNhc2UgXCJkZWNpbWFsXCI6XHRcdHJldHVybiBcIkRlY2ltYWxcIjtcblx0XHRcdGNhc2UgXCJib29sZWFuXCI6XHRcdHJldHVybiBcIkJvb2xlYW5cIjtcblx0XHRcdGNhc2UgXCJvYmplY3RcIjpcdFx0cmV0dXJuIFwiT2JqZWN0XCI7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gdHlwZS5yZXBsYWNlKC9cXC0vZywgXCJfXCIpO1xuXHRcdH1cblx0fVxufTtcblJ1bGUuVHlwZS5wcm90b3R5cGUucGF0dGVybiA9IC8oW0EtWl1bXFx3XFwtXSp8dGV4dHxudW1iZXJ8aW50ZWdlcnxkZWNpbWFsfGNoYXJhY3Rlcnxib29sZWFufG9iamVjdCkvO1xubGV0IHR5cGUgPSBwYXJzZXIuYWRkUnVsZShbXCJ0eXBlXCIsIFwiZXhwcmVzc2lvblwiXSwgUnVsZS5UeXBlKTtcbnR5cGUuYWRkVG9CbGFja2xpc3QoXCJJXCIpO1xuXG5cbi8vIEJvb2xlYW4gbGl0ZXJhbCwgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gVE9ETzogYmV0dGVyIG5hbWUgZm9yIHRoaXM/Pz9cblJ1bGUuQm9vbGVhbiA9IGNsYXNzIGJvb2xlYW4gZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0c3dpdGNoICh0aGlzLm1hdGNoZWQpIHtcblx0XHRcdGNhc2UgXCJ0cnVlXCI6XG5cdFx0XHRjYXNlIFwieWVzXCI6XG5cdFx0XHRjYXNlIFwib2tcIjpcblx0XHRcdGNhc2UgXCJzdWNjZXNzXCI6XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59O1xuUnVsZS5Cb29sZWFuLnByb3RvdHlwZS5wYXR0ZXJuID0gL14odHJ1ZXxmYWxzZXx5ZXN8bm98b2t8Y2FuY2VsfHN1Y2Nlc3N8ZmFpbHVyZSkkLztcbnBhcnNlci5hZGRSdWxlKFtcImJvb2xlYW5cIiwgXCJleHByZXNzaW9uXCJdLCBSdWxlLkJvb2xlYW4pO1xuXG4vLyBBZGQgYm9vbGVhbiB0b2tlbnMgdG8gaWRlbnRpZmllciBibGFja2xpc3QuXG4vLyBURVNUTUVcbmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwidHJ1ZVwiLCBcImZhbHNlXCIsXG5cdFwieWVzXCIsIFwibm9cIixcblx0XCJva1wiLCBcImNhbmNlbFwiLFxuXHRcInN1Y2Nlc3NcIiwgXCJmYWlsdXJlXCJcbik7XG5cblxuLy8gYG51bWJlcmAgYXMgZWl0aGVyIGZsb2F0IG9yIGludGVnZXIsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIE5PVEU6IHlvdSBjYW4gYWxzbyB1c2UgYG9uZWAuLi5gdGVuYCBhcyBzdHJpbmdzLidcbi8vIFRPRE86ICBgaW50ZWdlcmAgYW5kIGBkZWNpbWFsYD8gIHRvbyB0ZWNoeT9cblJ1bGUuTnVtYmVyID0gY2xhc3MgbnVtYmVyIGV4dGVuZHMgUnVsZSB7XG5cdC8vIFNwZWNpYWwgd29yZHMgeW91IGNhbiB1c2UgYXMgbnVtYmVycy4uLlxuXHRzdGF0aWMgTlVNQkVSX05BTUVTID0ge1xuXHRcdHplcm86IDAsXG5cdFx0b25lOiAxLFxuXHRcdHR3bzogMixcblx0XHR0aHJlZTogMyxcblx0XHRmb3VyOiA0LFxuXHRcdGZpdmU6IDUsXG5cdFx0c2l4OiA2LFxuXHRcdHNldmVuOiA3LFxuXHRcdGVpZ2h0OiA4LFxuXHRcdG5pbmU6IDksXG5cdFx0dGVuOiAxMFxuXHR9XG5cblx0Ly8gTnVtYmVycyBnZXQgZW5jb2RlZCBhcyBudW1iZXJzIGluIHRoZSB0b2tlbiBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDApIHtcblx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbc3RhcnRdO1xuXHRcdC8vIGlmIGEgc3RyaW5nLCBhdHRlbXB0IHRvIHJ1biB0aHJvdWdoIG91ciBOVU1CRVJfTkFNRVNcblx0XHRpZiAodHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiKSB0b2tlbiA9IFJ1bGUuTnVtYmVyLk5VTUJFUl9OQU1FU1t0b2tlbl07XG5cdFx0aWYgKHR5cGVvZiB0b2tlbiAhPT0gXCJudW1iZXJcIikgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiB0b2tlbixcblx0XHRcdG5leHRTdGFydDogc3RhcnQgKyAxXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBDb252ZXJ0IHRvIG51bWJlciBvbiBzb3VyY2Ugb3V0cHV0LlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxufTtcblxucGFyc2VyLmFkZFJ1bGUoW1wibnVtYmVyXCIsIFwiZXhwcmVzc2lvblwiXSwgUnVsZS5OdW1iZXIpO1xuXG4vLyBBZGQgbnVtYmVyIHdvcmRzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy8gVEVTVE1FXG5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcIm9uZVwiLCBcInR3b1wiLCBcInRocmVlXCIsIFwiZm91clwiLCBcImZpdmVcIixcblx0XCJzaXhcIiwgXCJzZXZlblwiLCBcImVpZ2h0XCIsIFwibmluZVwiLCBcInRlblwiXG4pO1xuXG5cbi8vIExpdGVyYWwgYHRleHRgIHN0cmluZywgY3JlYXRlZCB3aXRoIGN1c3RvbSBjb25zdHJ1Y3RvciBmb3IgZGVidWdnaW5nLlxuLy8gWW91IGNhbiB1c2UgZWl0aGVyIHNpbmdsZSBvciBkb3VibGUgcXVvdGVzIG9uIHRoZSBvdXRzaWRlIChhbHRob3VnaCBkb3VibGUgcXVvdGVzIGFyZSBwcmVmZXJyZWQpLlxuLy8gUmV0dXJuZWQgdmFsdWUgaGFzIGVuY2xvc2luZyBxdW90ZXMuXG5SdWxlLlRleHQgPSBjbGFzcyB0ZXh0IGV4dGVuZHMgUnVsZSB7XG5cdC8vIFRleHQgc3RyaW5ncyBnZXQgZW5jb2RlZCBhcyBgdGV4dGAgb2JqZWN0cyBpbiB0aGUgdG9rZW4gc3RyZWFtLlxuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwKSB7XG5cdFx0bGV0IHRva2VuID0gdG9rZW5zW3N0YXJ0XTtcblx0XHRpZiAoISh0b2tlbiBpbnN0YW5jZW9mIFRva2VuaXplci5UZXh0KSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiB0b2tlbixcblx0XHRcdG5leHRTdGFydDogc3RhcnQgKyAxXG5cdFx0fSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5xdW90ZWRTdHJpbmc7XG5cdH1cbn07XG5wYXJzZXIuYWRkUnVsZShbXCJ0ZXh0XCIsIFwiZXhwcmVzc2lvblwiXSwgUnVsZS5UZXh0KTtcblxuXG5cbi8vIExpdGVyYWwgbGlzdCAoYXJyYXkpLCBlZzogIGBbMSwyLHRydWUsZmFsc2UgXWBcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpdGVyYWxfbGlzdFwiLFxuXHRcIlxcXFxbW2xpc3Q6e2V4cHJlc3Npb259LF0/XFxcXF1cIixcblx0Y2xhc3MgbGl0ZXJhbF9saXN0IGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYFske2xpc3QgPyBsaXN0LmpvaW4oXCIsIFwiKSA6IFwiXCJ9XWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvblxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvblwiLFxuXHRcIlxcXFwoe2V4cHJlc3Npb259XFxcXClcIixcblx0Y2xhc3MgcGFyZW50aGVzaXplZF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHRnZXQgcmVzdWx0cygpIHtcblx0XHRcdHJldHVybiB0aGlzLm1hdGNoZWRbMV07XG5cdFx0fVxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBleHByZXNzaW9uID0gdGhpcy5yZXN1bHRzLnRvU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gZG9uJ3QgZG91YmxlIHBhcmVucyBpZiBub3QgbmVjZXNzYXJ5XG5cdFx0XHRpZiAodHlwZW9mIGV4cHJlc3Npb24gPT09IFwic3RyaW5nXCIgJiYgZXhwcmVzc2lvbi5zdGFydHNXaXRoKFwiKFwiKSAmJiBleHByZXNzaW9uLmVuZHNXaXRoKFwiKVwiKSkgcmV0dXJuIGV4cHJlc3Npb247XG5cdFx0XHRyZXR1cm4gYCgke2V4cHJlc3Npb259KWA7XG5cdFx0fVxuXHR9XG4pXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvY29yZS5qcyIsIi8vXHQjIFBhcnNlciBSdWxlc1xuLy9cdFJ1bGVzIGNhbiBiZSBhcyBzaW1wbGUgYXMgYSBzdHJpbmcgYEtleXdvcmRgIG9yIGEgY29tcGxleCBzZXF1ZW5jZSBvZiAobmVzdGVkKSBydWxlcy5cbi8vXG4vL1x0UGFyc2UgYSBydWxlIHdpdGggYHJ1bGUucGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0LCBlbmQpYCwgdGhpcyB3aWxsIGVpdGhlcjpcbi8vXHRcdC0gcmV0dXJuIGB1bmRlZmluZWRgIGlmIHRoZSBydWxlIGRvZXNuJ3QgbWF0Y2ggdGhlIGhlYWQgb2YgdGhlIHRva2Vucywgb3Jcbi8vXHRcdC0gcmV0dXJuIGEgQ0xPTkUgb2YgdGhlIHJ1bGUgd2l0aCBhdCBsZWFzdCB0aGUgZm9sbG93aW5nOlxuLy9cdFx0XHQtIGBtYXRjaGVkYFx0XHRSZXN1bHRzIG9mIHlvdXIgcGFyc2UuXG4vL1x0XHRcdC0gYG5leHRTdGFydGBcdFBsYWNlIHdoZXJlIG5leHQgbWF0Y2ggc2hvdWxkIHN0YXJ0IChlZzogb25lIGJleW9uZCB3aGF0IHlvdSBtYXRjaGVkKS5cbi8vXG4vL1x0VGhlIGNsb25lIHJldHVybmVkIGFib3ZlIGNhbiBiZSBtYW5pcHVsYXRlZCB3aXRoXG4vL1x0XHQtIGBydWxlLnJlc3VsdHNgXHRcdFx0UmV0dXJuIG1hdGNoZWQgYXJndW1lbnRzIGluIGEgZm9ybWF0IHN1aXRhYmxlIHRvIGRvOlxuLy9cdFx0LSBgcnVsZS50b1NvdXJjZShjb250ZXh0KWBcdFJldHVybiBqYXZhc2NyaXB0IHNvdXJjZSB0byBpbnRlcnByZXQgdGhlIHJ1bGUuXG4vL1xuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi9QYXJzZXIuanNcIjtcblxuaW1wb3J0IGdsb2JhbCBmcm9tIFwiLi91dGlscy9nbG9iYWxcIjtcbmltcG9ydCB7IGdldFRhYnMsIGlzV2hpdGVzcGFjZSB9IGZyb20gXCIuL3V0aWxzL3N0cmluZ1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdWxlIHtcblx0Y29uc3RydWN0b3IoLi4ucHJvcHMpIHtcblx0XHRPYmplY3QuYXNzaWduKHRoaXMsIC4uLnByb3BzKTtcblx0fVxuXG5cdC8vIENsb25lIHRoaXMgcnVsZSBhbmQgYWRkIGFueSBgcHJvcHNgIHBhc3NlZCBpbi5cblx0Y2xvbmUocHJvcHMpIHtcblx0XHRyZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcywgcHJvcHMpO1xuXHR9XG5cbi8vXG4vL1x0UGFyc2luZyBwcmltaXRpdmVzIC0tIHlvdSBNVVNUIGltcGxlbWVudCB0aGVzZSBpbiB5b3VyIHN1YmNsYXNzZXMhXG4vL1xuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBydWxlIGJldHdlZW4gYHN0YXJ0YCBhbmQgYGVuZGAgb2YgYHRva2Vuc2AuXG5cdC8vIFJldHVybnMgcmVzdWx0cyBvZiB0aGUgcGFyc2Ugb3IgYHVuZGVmaW5lZGAuXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCwgc3RhY2spIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYml0cyBvZiBvdXIgcnVsZSBhcmUgZm91bmQgQU5ZV0hFUkUgYmV0d2VlbiBgc3RhcnRgIGFuZCBgZW5kYCBpbiB0aGUgYHRva2Vuc2AuXG5cdC8vIFRoaXMgaXMgdXNlZCBieSBjb21wbGljYXRlZCAoZWc6IGxlZnQgcmVjdXJzaXZlKSBydWxlcyB0byBleGl0IHF1aWNrbHkgaWYgdGhlcmUncyBubyBjaGFuY2UuXG5cdC8vIFJldHVybnM6XG5cdC8vXHQtIGB0cnVlYCBpZiB0aGUgcnVsZSBNSUdIVCBiZSBtYXRjaGVkLlxuXHQvL1x0LSBgZmFsc2VgIGlmIHRoZXJlIGlzIG5vIHdheSB0aGUgcnVsZSBjYW4gYmUgbWF0Y2hlZC5cblx0Ly9cdC0gYHVuZGVmaW5lZGAgaWYgbm90IGRldGVybWluc3RpYyAoZWc6IG5vIHdheSB0byB0ZWxsIHF1aWNrbHkpLlxuXHR0ZXN0KHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHRhZGRUb0JsYWNrbGlzdCguLi53b3Jkcykge1xuXHRcdGlmICghdGhpcy5ibGFja2xpc3QpIHRoaXMuYmxhY2tsaXN0ID0ge307XG5cdFx0d29yZHMuZm9yRWFjaCh3b3JkID0+IHRoaXMuYmxhY2tsaXN0W3dvcmRdID0gdHJ1ZSk7XG5cdH1cblxuLy9cbi8vICMjIG91dHB1dCBhcyBzb3VyY2Vcbi8vXG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIE5PVEU6IHlvdSBtYXkgd2FudCB0byBtZW1vaXplIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8vIE91dHB1dCB2YWx1ZSBmb3IgdGhpcyBJTlNUQU5USUFURUQgcnVsZSBhcyBzb3VyY2UuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkO1xuXHR9XG5cbi8vXG4vLyAjIyBncm91cDogcmVmbGVjdGlvblxuLy9cblx0Z2V0IHJ1bGVUeXBlKCkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdH1cbn1cblxuXG4vLyBSdWxlIGZvciBvbmUgb3IgbW9yZSBzZXF1ZW50aWFsIGxpdGVyYWwgdmFsdWVzIHRvIG1hdGNoLCB3aGljaCBpbmNsdWRlIHB1bmN0dWF0aW9uIHN1Y2ggYXMgYChgIGV0Yy5cblJ1bGUuTWF0Y2ggPSBjbGFzcyBtYXRjaCBleHRlbmRzIFJ1bGUge1xuXHRjb25zdHJ1Y3RvciguLi5wcm9wcykge1xuXHRcdHN1cGVyKC4uLnByb3BzKTtcblx0XHQvLyBjb2VyY2UgdG8gYW4gYXJyYXkgKGEgYml0IHNsb3dlciBidXQgY2xlYW5lcikuXG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KHRoaXMubWF0Y2gpKSB0aGlzLm1hdGNoID0gW3RoaXMubWF0Y2hdO1xuXHR9XG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHJ1bGUgaW4gdGhlIGB0b2tlbnNgLlxuXHQvLyBSZXR1cm5zIHJlc3VsdHMgb2YgdGhlIHBhcnNlIG9yIGB1bmRlZmluZWRgLlxuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQsIHN0YWNrKSB7XG5cdFx0aWYgKCF0aGlzLmhlYWRTdGFydHNXaXRoKHRoaXMubWF0Y2gsIHRva2Vucywgc3RhcnQsIGVuZCkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0Ly8gaWYgb25seSBvbmUgYW5kIHdlIGhhdmUgYSBibGFja2xpc3QsIG1ha2Ugc3VyZSBpdCdzIG5vdCBpbiB0aGUgYmxhY2tsaXN0IVxuXHRcdGlmICh0aGlzLm1hdGNoLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmJsYWNrbGlzdCAmJiB0aGlzLmJsYWNrbGlzdFt0aGlzLm1hdGNoWzBdXSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRoaXMubWF0Y2guam9pbih0aGlzLm1hdGNoRGVsaW1pdGVyKSxcblx0XHRcdG5leHRTdGFydDogc3RhcnQgKyB0aGlzLm1hdGNoLmxlbmd0aFxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGlzIG1hdGNoIGFwcGVhciBhbnl3aGVyZSBpbiB0aGUgdG9rZW5zP1xuXHR0ZXN0KHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGxldCBtYXRjaFN0YXJ0ID0gdG9rZW5zLmluZGV4T2YodGhpcy5tYXRjaFswXSwgc3RhcnQpO1xuXHRcdHJldHVybiBtYXRjaFN0YXJ0ICE9PSAtMSAmJiB0aGlzLmhlYWRTdGFydHNXaXRoKHRoaXMubWF0Y2gsIHRva2VucywgbWF0Y2hTdGFydCwgZW5kKTtcblx0fVxuXG5cdC8vIERvZXMgdGhlIGhlYWQgb2YgdGhlIHRva2VucyBzdGFydCB3aXRoIGFuIGFycmF5IG9mIG1hdGNoZXM/XG5cdGhlYWRTdGFydHNXaXRoKG1hdGNoZXMsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQgPSB0b2tlbnMubGVuZ3RoKSB7XG5cdFx0Ly8gYmFpbCBpZiBtYXRjaCB3b3VsZCBnbyBiZXlvbmQgdGhlIGVuZFxuXHRcdGlmIChzdGFydCArIG1hdGNoZXMubGVuZ3RoID4gZW5kKSByZXR1cm4gZmFsc2U7XG5cblx0XHQvLyBTcGVjaWFsIGNhc2UgZm9yIG9uZSBtYXRjaCwgbWF5YmUgcHJlbWF0dXJlIG9wdGltaXphdGlvbiBidXQuLi5cblx0XHRpZiAobWF0Y2hlcy5sZW5ndGggPT09IDEpIHJldHVybiAobWF0Y2hlc1swXSA9PT0gdG9rZW5zW3N0YXJ0XSk7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IG1hdGNoZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmIChtYXRjaGVzW2ldICE9PSB0b2tlbnNbc3RhcnQgKyBpXSkgcmV0dXJuIGZhbHNlXG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAke3RoaXMubWF0Y2guam9pbih0aGlzLm1hdGNoRGVsaW1pdGVyKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5SdWxlLk1hdGNoLnByb3RvdHlwZS5tYXRjaERlbGltaXRlciA9IFwiXCI7XG5cblxuLy8gU3ludGFjdGljIHN1Z2FyIHRvIHNlcGFyYXRlIGBzeW1ib2xzYCAod2hpY2ggZG9uJ3QgcmVxdWlyZSBzcGFjZXMpIGZyb20gYGtleXdvcmRzYCAod2hpY2ggZG8pLlxuUnVsZS5TeW1ib2wgPSBjbGFzcyBzeW1ib2wgZXh0ZW5kcyBSdWxlLk1hdGNoIHt9XG5cblJ1bGUuS2V5d29yZCA9IGNsYXNzIGtleXdvcmQgZXh0ZW5kcyBSdWxlLk1hdGNoIHt9XG5SdWxlLktleXdvcmQucHJvdG90eXBlLm1hdGNoRGVsaW1pdGVyID0gXCIgXCI7XG5cblxuXG4vLyBSZWdleCBwYXR0ZXJuIHRvIG1hdGNoIGEgU0lOR0xFIHRva2VuLlxuLy8gYHJ1bGUucGF0dGVybmAgaXMgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBtYXRjaC5cbi8vIE5vdGUgdGhhdCB5b3UgTVVTVCBzdGFydCB5b3VyIHBhdHRlcm4gd2l0aCBgXmAgYW5kIGVuZCB3aXRoIGAkYCB0byBtYWtlIHN1cmUgaXQgbWF0Y2hlcyB0aGUgZW50aXJlIHRva2VuLlxuLy8gTm90ZSB0aGF0IHRoaXMgY2FuIG9ubHkgbWF0Y2ggYSBzaW5nbGUgdG9rZW4hXG5SdWxlLlBhdHRlcm4gPSBjbGFzcyBQYXR0ZXJuIGV4dGVuZHMgUnVsZSB7XG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggdGhpcyBwYXR0ZXJuIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHRva2Vucy5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kLCBzdGFjaykge1xuXHRcdGxldCB0b2tlbiA9IHRva2Vuc1tzdGFydF07XG5cdFx0aWYgKHR5cGVvZiB0b2tlbiAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBtYXRjaCA9IHRva2VuLm1hdGNoKHRoaXMucGF0dGVybik7XG5cdFx0aWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIGJhaWwgaWYgcHJlc2VudCBpbiBibGFja2xpc3Rcblx0XHRsZXQgbWF0Y2hlZCA9IG1hdGNoWzBdO1xuXHRcdGlmICh0aGlzLmJsYWNrbGlzdCAmJiB0aGlzLmJsYWNrbGlzdFttYXRjaGVkXSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0ICsgMVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYW55IG9mIG91ciBwYXR0ZXJuIGlzIGZvdW5kIEFOWVdIRVJFIGluIHRoZSB0b2tlbnMuXG5cdHRlc3QocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0cmV0dXJuIHRva2Vucy5zbGljZShzdGFydCwgZW5kKS5zb21lKHRva2VuID0+IHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIiAmJiB0b2tlbi5tYXRjaCh0aGlzLnBhdHRlcm4pKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiB0aGlzLnBhdHRlcm4uc291cmNlO1xuXHR9XG59XG5cblxuLy8gU3VicnVsZSAtLSBuYW1lIG9mIGFub3RoZXIgcnVsZSB0byBiZSBjYWxsZWQuXG4vLyBgcnVsZS5ydWxlYCBpcyB0aGUgbmFtZSBvZiB0aGUgcnVsZSBpbiBgcGFyc2VyLnJ1bGVzYC5cblJ1bGUuU3VicnVsZSA9IGNsYXNzIFN1YnJ1bGUgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kLCBzdGFjaykge1xuXHRcdGxldCByZXN1bHQgPSBwYXJzZXIucGFyc2VSdWxlT3JEaWUodGhpcy5ydWxlLCB0b2tlbnMsIHN0YXJ0LCBlbmQsIHN0YWNrLCBgcGFyc2Ugc3VicnVsZSAnJHt0aGlzLnJ1bGV9J2ApO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIHJlc3VsdC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgdG9rZW5zLlxuXHR0ZXN0KHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdHJldHVybiBwYXJzZXIudGVzdFJ1bGUodGhpcy5ydWxlLCB0b2tlbnMsIHN0YXJ0KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgeyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlfX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59XG5cblxuLy8gU2VxdWVuY2Ugb2YgcnVsZXMgdG8gbWF0Y2guXG5SdWxlLlNlcXVlbmNlID0gY2xhc3MgU2VxdWVuY2UgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kLCBzdGFjaykge1xuXHRcdC8vIElmIHdlIGhhdmUgYSBgdGVzdFJ1bGVgIGRlZmluZWRcblx0XHRpZiAodGhpcy50ZXN0UnVsZSkge1xuXHRcdFx0Ly8gRm9yZ2V0IGl0IGlmIHRoZXJlIGlzIE5PIFdBWSB0aGUgcnVsZSBjb3VsZCBiZSBtYXRjaGVkLlxuXHRcdFx0aWYgKHBhcnNlci50ZXN0UnVsZSh0aGlzLnRlc3RSdWxlLCB0b2tlbnMsIHN0YXJ0KSA9PT0gZmFsc2UpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgd2UncmUgYSBsZWZ0UmVjdXJzaXZlIHNlcXVlbmNlLi4uXG5cdFx0aWYgKHRoaXMubGVmdFJlY3Vyc2l2ZSkge1xuXHRcdFx0Ly8gSWYgdGhlIHN0YWNrIGFscmVhZHkgY29udGFpbnMgdGhpcyBydWxlLCBmb3JnZXQgaXQuXG5cdFx0XHRpZiAoc3RhY2sgJiYgc3RhY2suaW5jbHVkZXModGhpcykpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRcdC8vIENsb25lIHN0YWNrIGFuZCBhZGQgdGhpcyBydWxlIGZvciByZWN1cnNpb24uLi5cblx0XHRcdHN0YWNrID0gc3RhY2sgPyBzdGFjay5jb25jYXQoKSA6IFtdO1xuXHRcdFx0c3RhY2sucHVzaCh0aGlzKTtcblxuXHRcdFx0Ly8gVE9ETzogV2UgY291bGQgZGlzdGluZ3Vpc2ggYmV0d2VlbiBwcm9kdWN0aXZlIGFuZCB1bnByb2R1Y3RpdmUgcnVsZXNcblx0XHRcdC8vXHRcdCBieSBjaGVja2luZyBvbmx5IHJ1bGVzIHdoaWNoIG9jY3VyIGF0IHRoZSBzYW1lIGBzdGFydGAuLi5cblx0XHRcdC8vXHRcdCBUaGlzIHdvdWxkIHByb2JhYmx5IGFsbG93IG1vcmUgaW50ZXJlc3RpbmcgdGhpbmdzLCBidXQgaXQncyBtdWNoIG11Y2ggc2xvd2VyLlxuXHRcdH1cblxuXHRcdGxldCBtYXRjaGVkID0gW107XG5cdFx0bGV0IG5leHRTdGFydCA9IHN0YXJ0O1xuXHRcdGxldCBpbmRleCA9IDAsIHJ1bGUgPSB1bmRlZmluZWQ7XG5cdFx0d2hpbGUgKHJ1bGUgPSB0aGlzLnJ1bGVzW2luZGV4KytdKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgdG9rZW5zLCBuZXh0U3RhcnQsIGVuZCwgc3RhY2spO1xuXHRcdFx0aWYgKCFtYXRjaCAmJiAhcnVsZS5vcHRpb25hbCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0XHRuZXh0U3RhcnQgPSBtYXRjaC5uZXh0U3RhcnQ7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGlmIHdlIGdldCBoZXJlLCB3ZSBtYXRjaGVkIGFsbCB0aGUgcnVsZXMhXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdG5leHRTdGFydFxuXHRcdH0pO1xuXHR9XG5cblxuLy9UT0RPQ1xuXHQvLyBcImdhdGhlclwiIGFyZ3VtZW50cyBpbiBwcmVwYXJhdGlvbiB0byBjYWxsIGB0b1NvdXJjZSgpYFxuXHQvLyBPbmx5IGNhbGxhYmxlIGFmdGVyIHBhcnNlIGlzIGNvbXBsZXRlZC5cblx0Ly8gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gdGhlIGBtYXRjaGVkYCBhcnJheSBpbmRleGVkIGJ5XG5cdC8vXHRcdC0gYG1hdGNoLmFyZ3VtZW50YDpcdFx0YXJndW1lbnQgc2V0IHdoZW4gcnVsZSB3YXMgZGVjbGFyZWQsIGVnOiBge3ZhbHVlOmxpdGVyYWx9YCA9PiBgdmFsdWVgXG5cdC8vXHRcdC0gYG1hdGNoLnJ1bGVOYW1lYDpcdFx0bmFtZSBvZiBydWxlIHdoZW4gZGVmaW5lZFxuXHQvL1x0XHQtIGBydWxlIHR5cGVgOlx0XHRcdFx0bmFtZSBvZiB0aGUgcnVsZSB0eXBlXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRsZXQgcmVzdWx0cyA9IHRoaXMuX2FkZFJlc3VsdHMoe30sIHRoaXMubWF0Y2hlZCk7XG5cdFx0aWYgKHRoaXMuY29tbWVudCkgcmVzdWx0cy5jb21tZW50ID0gdGhpcy5jb21tZW50O1xuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9XG5cblx0X2FkZFJlc3VsdHMocmVzdWx0cywgbWF0Y2hlZCkge1xuXHRcdGxldCBpbmRleCA9IDAsIG1hdGNoID0gdW5kZWZpbmVkO1xuXHRcdHdoaWxlIChtYXRjaCA9IG1hdGNoZWRbaW5kZXgrK10pIHtcblx0XHRcdGlmIChtYXRjaC5wcm9tb3RlKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLl9hZGRSZXN1bHRzKHJlc3VsdHMsIG1hdGNoLm1hdGNoZWQpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGxldCBhcmdOYW1lID0gbWF0Y2guYXJndW1lbnQgfHwgbWF0Y2gucnVsZU5hbWUgfHwgbWF0Y2guY29uc3RydWN0b3IubmFtZTtcblx0XHRcdFx0Ly8gSWYgYXJnIGFscmVhZHkgZXhpc3RzLCBjb252ZXJ0IHRvIGFuIGFycmF5XG5cdFx0XHRcdGlmIChhcmdOYW1lIGluIHJlc3VsdHMpIHtcblx0XHRcdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkocmVzdWx0c1thcmdOYW1lXSkpIHJlc3VsdHNbYXJnTmFtZV0gPSBbcmVzdWx0c1thcmdOYW1lXV07XG5cdFx0XHRcdFx0cmVzdWx0c1thcmdOYW1lXS5wdXNoKG1hdGNoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdID0gbWF0Y2g7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH1cblxuXHQvLyBSZXR1cm4gYHRvU291cmNlKClgIGZvciBvdXIgYHJlc3VsdHNgIGFzIGEgbWFwLlxuXHQvLyBJZiB5b3UgcGFzcyBga2V5c2AsIHdlJ2xsIHJlc3RyaWN0IHRvIGp1c3QgdGhvc2Uga2V5cy5cblx0Z2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0LCAuLi5rZXlzKSB7XG5cdFx0bGV0IHJlc3VsdHMgPSB0aGlzLnJlc3VsdHM7XG5cdFx0bGV0IG91dHB1dCA9IHt9O1xuXHRcdGlmICgha2V5cy5sZW5ndGgpIGtleXMgPSBPYmplY3Qua2V5cyhyZXN1bHRzKTtcblx0XHRrZXlzLmZvckVhY2goa2V5ID0+IHtcblx0XHRcdGxldCB2YWx1ZSA9IHJlc3VsdHNba2V5XTtcblx0XHRcdGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm47XG5cdFx0XHRpZiAodmFsdWUudG9Tb3VyY2UpIG91dHB1dFtrZXldID0gdmFsdWUudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRlbHNlIG91dHB1dFtrZXldID0gdmFsdWU7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdC8vIEVjaG8gdGhpcyBydWxlIGJhY2sgb3V0LlxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5ydWxlcy5qb2luKFwiIFwiKX0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG5cbn1cblxuLy8gU3ludGFjdGljIHN1Z2FyIGZvciBkZWJ1Z2dpbmdcblJ1bGUuRXhwcmVzc2lvbiA9IGNsYXNzIGV4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gQSBzdGF0ZW1lbnQgdGFrZXMgdXAgdGhlIGVudGlyZSBsaW5lLlxuUnVsZS5TdGF0ZW1lbnQgPSBjbGFzcyBzdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHt9XG5cblxuLy8gQWx0ZXJuYXRpdmUgc3ludGF4LCBtYXRjaGluZyBvbmUgb2YgYSBudW1iZXIgb2YgZGlmZmVyZW50IHJ1bGVzLlxuLy8gVGhlIHJlc3VsdCBvZiBhIHBhcnNlIGlzIHRoZSBsb25nZXN0IHJ1bGUgdGhhdCBhY3R1YWxseSBtYXRjaGVkLlxuLy8gTk9URTogQ3VycmVudGx5IHRha2VzIHRoZSBsb25nZXN0IHZhbGlkIG1hdGNoLlxuLy8gVE9ETzogbWF0Y2ggYWxsIHZhbGlkIGFsdGVybmF0aXZlc1xuLy8gVE9ETzogcmVuYW1lP1xuUnVsZS5BbHRlcm5hdGl2ZXMgPSBjbGFzcyBBbHRlcm5hdGl2ZXMgZXh0ZW5kcyBSdWxlIHtcblx0Y29uc3RydWN0b3IoLi4ucHJvcHMpIHtcblx0XHRzdXBlciguLi5wcm9wcyk7XG5cdFx0aWYgKCF0aGlzLnJ1bGVzKSB0aGlzLnJ1bGVzID0gW107XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIGFsdGVybmF0aXZlcyBhcmUgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHRva2Vucy5cblx0Ly8gTk9URTogdGhpcyBzaG91bGQgb25seSBiZSBjYWxsZWQgaWYgd2UncmUgc3BlY2lmaWVkIGFzIGEgYHRlc3RSdWxlYFxuXHQvL1x0XHQgYW5kIHRoZW4gb25seSBpZiBhbGwgb2Ygb3VyIHJ1bGVzIGFyZSBkZXRlcm1pbmlzdGljLlxuXHR0ZXN0KHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGxldCBpbmRleCA9IDAsIHJ1bGUgPSB1bmRlZmluZWQ7XG5cdFx0d2hpbGUgKHJ1bGUgPSB0aGlzLnJ1bGVzW2luZGV4KytdKSB7XG5cdFx0XHRpZiAocnVsZS50ZXN0KHBhcnNlciwgdG9rZW5zLCBzdGFydCwgZW5kKSkgcmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIEZpbmQgYWxsIHJ1bGVzIHdoaWNoIG1hdGNoIGFuZCBkZWxlZ2F0ZSB0byBgZ2V0QmVzdE1hdGNoKClgIHRvIHBpY2sgdGhlIGJlc3Qgb25lLlxuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQsIHN0YWNrKSB7XG5cdFx0bGV0IG1hdGNoZXMgPSBbXTtcblx0XHRsZXQgaW5kZXggPSAwLCBydWxlID0gdW5kZWZpbmVkO1xuXHRcdHdoaWxlIChydWxlID0gdGhpcy5ydWxlc1tpbmRleCsrXSkge1xuXHRcdFx0bGV0IG1hdGNoID0gcnVsZS5wYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQsIGVuZCwgc3RhY2spO1xuXHRcdFx0aWYgKG1hdGNoKSBtYXRjaGVzLnB1c2gobWF0Y2gpO1xuXHRcdH1cblxuXHRcdGlmICghbWF0Y2hlcy5sZW5ndGgpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyB1bmNvbW1lbnQgdGhlIGJlbG93IHRvIHByaW50IGFsdGVybmF0aXZlc1xuXHRcdC8vIGlmIChtYXRjaGVzLmxlbmd0aCA+IDEpIHtcblx0XHQvL1x0Y29uc29sZS5pbmZvKHRoaXMuYXJndW1lbnQgfHwgdGhpcy5ydWxlTmFtZSwgbWF0Y2hlcywgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gubWF0Y2hlZFRleHQpKTtcblx0XHQvLyB9XG5cblx0XHRsZXQgYmVzdE1hdGNoID0gKG1hdGNoZXMubGVuZ3RoID09PSAxID8gbWF0Y2hlc1swXSA6IHRoaXMuZ2V0QmVzdE1hdGNoKG1hdGNoZXMpKTtcblxuXHRcdC8vIGFzc2lnbiBgYXJnTmFtZWAgb3IgYHJ1bGVOYW1lYCBmb3IgYHJlc3VsdHNgXG5cdFx0aWYgKHRoaXMuYXJndW1lbnQpIGJlc3RNYXRjaC5hcmd1bWVudCA9IHRoaXMuYXJndW1lbnQ7XG5cdFx0ZWxzZSBpZiAodGhpcy5ydWxlTmFtZSkgYmVzdE1hdGNoLnJ1bGVOYW1lID0gdGhpcy5ydWxlTmFtZTtcbi8vVE9ETzogb3RoZXIgdGhpbmdzIHRvIGNvcHkgaGVyZT8/P1xuXG5cdFx0cmV0dXJuIGJlc3RNYXRjaDtcblx0fVxuXG5cdC8vIFJldHVybiB0aGUgXCJiZXN0XCIgbWF0Y2ggZ2l2ZW4gbW9yZSB0aGFuIG9uZSBtYXRjaGVzIGF0IHRoZSBoZWFkIG9mIHRoZSB0b2tlbnMuXG5cdC8vIERlZmF1bHQgaXMgdG8gcmV0dXJuIHRoZSBsb25nZXN0IG1hdGNoLlxuXHQvLyBJbXBsZW1lbnQgc29tZXRoaW5nIGVsc2UgdG8gZG8sIGVnLCBwcmVjZWRlbmNlIHJ1bGVzLlxuXHRnZXRCZXN0TWF0Y2gobWF0Y2hlcykge1xuXHRcdHJldHVybiBtYXRjaGVzLnJlZHVjZShmdW5jdGlvbiAoYmVzdCwgY3VycmVudCkge1xuXHRcdFx0aWYgKGN1cnJlbnQubmV4dFN0YXJ0ID4gYmVzdC5uZXh0U3RhcnQpIHJldHVybiBjdXJyZW50O1xuXHRcdFx0cmV0dXJuIGJlc3Q7XG5cdFx0fSwgbWF0Y2hlc1swXSk7XG5cdH1cblxuXHRhZGRSdWxlKHJ1bGUpIHtcblx0XHR0aGlzLnJ1bGVzLnB1c2gocnVsZSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC50b1NvdXJjZShjb250ZXh0KTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgKCR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5ydWxlcy5qb2luKFwifFwiKX0pJHt0aGlzLm9wdGlvbmFsID8gJz8nIDogJyd9YDtcblx0fVxufTtcblxuXG5cbi8vIFJlcGVhdGluZyBydWxlLlxuLy9cdGB0aGlzLnJ1bGVgIGlzIHRoZSBydWxlIHRoYXQgcmVwZWF0cy5cbi8vXG4vLyBBZnRlciBtYXRjaGluZzpcbi8vXHRgdGhpcy5tYXRjaGVkYCBpcyBhcnJheSBvZiByZXN1bHRzIG9mIG1hdGNoZXMuXG4vL1xuLy9cdEF1dG9tYXRpY2FsbHkgY29uc3VtZXMgd2hpdGVzcGFjZSBiZWZvcmUgcnVsZXMuXG4vL1x0SWYgZG9lc24ndCBtYXRjaCBhdCBsZWFzdCBvbmUsIHJldHVybnMgYHVuZGVmaW5lZGAuXG5SdWxlLlJlcGVhdCA9IGNsYXNzIFJlcGVhdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQsIHN0YWNrKSB7XG5cdFx0bGV0IG1hdGNoZWQgPSBbXTtcblx0XHRsZXQgbmV4dFN0YXJ0ID0gc3RhcnQ7XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdGxldCBtYXRjaCA9IHRoaXMucnVsZS5wYXJzZShwYXJzZXIsIHRva2VucywgbmV4dFN0YXJ0LCBlbmQsIHN0YWNrKTtcblx0XHRcdGlmICghbWF0Y2gpIGJyZWFrO1xuXG5cdFx0XHRtYXRjaGVkLnB1c2gobWF0Y2gpO1xuXHRcdFx0bmV4dFN0YXJ0ID0gbWF0Y2gubmV4dFN0YXJ0O1xuXHRcdH1cblxuXHRcdGlmIChtYXRjaGVkLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHRuZXh0U3RhcnRcblx0XHR9KTtcblx0fVxuXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBSZXR1cm5zIGFuIGFycmF5IHdpdGggYXJndW1lbnRzIG9mIGFsbCByZXN1bHRzLlxuXHQvLyBOT1RFOiBtZW1vaXplcyB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5tYXAoIG1hdGNoID0+IG1hdGNoLnJlc3VsdHMgKTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLm1hcChtYXRjaCA9PiBtYXRjaC50b1NvdXJjZShjb250ZXh0KSk7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRsZXQgaXNDb21wb3VuZFJ1bGUgPSAodGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5TZXF1ZW5jZSlcblx0XHRcdFx0XHRcdCAgfHwgKHRoaXMucnVsZSBpbnN0YW5jZW9mIFJ1bGUuS2V5d29yZCAmJiB0aGlzLnJ1bGUubWF0Y2gubGVuZ3RoID4gMSk7XG5cdFx0Y29uc3QgcnVsZSA9IGlzQ29tcG91bmRSdWxlID8gYCgke3RoaXMucnVsZX0pYCA6IGAke3RoaXMucnVsZX1gO1xuXHRcdHJldHVybiBgJHtydWxlfSR7dGhpcy5vcHRpb25hbCA/ICcqJyA6ICcrJ31gO1xuXHR9XG59XG5cblxuLy8gTGlzdCBtYXRjaCBydWxlOiAgIGBbPGl0ZW0+PGRlbGltaXRlcj5dYC4gZWdcIiBgW3tudW1iZXJ9LF1gIHRvIG1hdGNoIGAxLDIsM2Bcbi8vXHRgcnVsZS5pdGVtYCBpcyB0aGUgcnVsZSBmb3IgZWFjaCBpdGVtLFxuLy9cdGBydWxlLmRlbGltaXRlcmAgaXMgdGhlIGRlbGltaXRlciBiZXR3ZWVuIGVhY2ggaXRlbS5cbi8vIFx0YHJ1bGUubWF0Y2hlZGAgaW4gdGhlIG91dHB1dCBpcyB0aGUgbGlzdCBvZiB2YWx1ZXMuXG4vL1xuLy9cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGEgTGlzdCBydWxlIHdpbGwgTk9UIHJlcGVhdCAoPz8/PylcblJ1bGUuTGlzdCA9IGNsYXNzIExpc3QgZXh0ZW5kcyBSdWxlIHtcblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kLCBzdGFjaykge1xuXHRcdC8vIGVuc3VyZSBpdGVtIGFuZCBkZWxpbWl0ZXIgYXJlIG9wdGlvbmFsIHNvIHdlIGRvbid0IGJhcmYgaW4gYHBhcnNlUnVsZWBcblx0XHR0aGlzLml0ZW0ub3B0aW9uYWwgPSB0cnVlO1xuXHRcdHRoaXMuZGVsaW1pdGVyLm9wdGlvbmFsID0gdHJ1ZTtcblxuXHRcdGxldCBtYXRjaGVkID0gW107XG5cdFx0bGV0IG5leHRTdGFydCA9IHN0YXJ0O1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHQvLyBnZXQgbmV4dCBpdGVtLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGl0ZW0gPSB0aGlzLml0ZW0ucGFyc2UocGFyc2VyLCB0b2tlbnMsIG5leHRTdGFydCwgZW5kLCBzdGFjayk7XG5cdFx0XHRpZiAoIWl0ZW0pIGJyZWFrO1xuXG5cdFx0XHRtYXRjaGVkLnB1c2goaXRlbSk7XG5cdFx0XHRuZXh0U3RhcnQgPSBpdGVtLm5leHRTdGFydDtcblxuXHRcdFx0Ly8gZ2V0IGRlbGltaXRlciwgZXhpdGluZyBpZiBub3QgZm91bmRcblx0XHRcdGxldCBkZWxpbWl0ZXIgPSB0aGlzLmRlbGltaXRlci5wYXJzZShwYXJzZXIsIHRva2VucywgbmV4dFN0YXJ0LCBlbmQsIHN0YWNrKTtcblx0XHRcdGlmICghZGVsaW1pdGVyKSBicmVhaztcblx0XHRcdG5leHRTdGFydCA9IGRlbGltaXRlci5uZXh0U3RhcnQ7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgd2UgZGlkbid0IGdldCBhbnkgbWF0Y2hlcywgZm9yZ2V0IGl0LlxuXHRcdGlmIChtYXRjaGVkLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHRuZXh0U3RhcnRcblx0XHR9KTtcblx0fVxuXG5cdC8vIFJldHVybnMgbGlzdCBvZiB2YWx1ZXMgYXMgc291cmNlLlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0aWYgKCF0aGlzLm1hdGNoZWQpIHJldHVybiBbXTtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gudG9Tb3VyY2UoY29udGV4dCkgKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgWyR7dGhpcy5hcmd1bWVudCA/IHRoaXMuYXJndW1lbnQrXCI6XCIgOiBcIlwifSR7dGhpcy5pdGVtfSAke3RoaXMuZGVsaW1pdGVyfV0ke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuLy8gQmxhbmsgbGluZSByZXByZXNlbnRhdGlvbiBpbiBwYXJzZXIgb3V0cHV0LlxuUnVsZS5CbGFua0xpbmUgPSBjbGFzcyBibGFua19saW5lIGV4dGVuZHMgUnVsZSB7XG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gXCJcXG5cIjtcblx0fVxufVxuXG4vLyBQYXJzZXIgZXJyb3IgcmVwcmVzZW50YXRpb24gaW4gcGFyc2VyIG91dHB1dC5cblJ1bGUuU3RhdGVtZW50UGFyc2VFcnJvciA9IGNsYXNzIHBhcnNlX2Vycm9yIGV4dGVuZHMgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKC4uLnByb3BzKSB7XG5cdFx0c3VwZXIoLi4ucHJvcHMpO1xuXHRcdGlmIChQYXJzZXIuV0FSTikgY29uc29sZS53YXJuKHRoaXMubWVzc2FnZSk7XG5cdH1cblxuXHRnZXQgbWVzc2FnZSgpIHtcblx0XHRpZiAodGhpcy5wYXJzZWQpIHtcblx0XHRcdHJldHVybiBcIkNBTlQgUEFSU0UgRU5USVJFIFNUQVRFTUVOVFxcblwiXG5cdFx0XHRcdCArIFwiUEFSU0VEICAgICAgOiBgXCIrIHRoaXMucGFyc2VkICsgXCJgXFxuXCJcblx0XHRcdFx0ICsgXCJDQU4nVCBQQVJTRSA6IGBcIisgdGhpcy51bnBhcnNlZCArIFwiYFwiO1xuXHRcdH1cblx0XHRyZXR1cm4gXCJDQU4nVCBQQVJTRSBTVEFURU1FTlQ6IGBcIiArIHRoaXMudW5wYXJzZWQgKyBcImBcIjtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gXCIvLyBcIiArIHRoaXMubWVzc2FnZS5zcGxpdChcIlxcblwiKS5qb2luKFwiXFxuLy8gXCIpO1xuXHR9XG59XG5cblxuLy8gQ29tbWVudCBydWxlIC0tIG1hdGNoZXMgdG9rZW5zIG9mIHR5cGUgYFRva2VuaXplci5Db21tZW50YC5cblJ1bGUuQ29tbWVudCA9IGNsYXNzIGNvbW1lbnQgZXh0ZW5kcyBSdWxlIHtcblx0Ly8gQ29tbWVudHMgYXJlIHNwZWNpYWxseSBub2RlcyBpbiBvdXIgdG9rZW4gc3RyZWFtLlxuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQsIHN0YWNrKSB7XG5cdFx0bGV0IHRva2VuID0gdG9rZW5zW3N0YXJ0XTtcblx0XHRpZiAoISh0b2tlbiBpbnN0YW5jZW9mIFRva2VuaXplci5Db21tZW50KSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkOiB0b2tlbixcblx0XHRcdG5leHRTdGFydDogc3RhcnQgKyAxXG5cdFx0fSk7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIGAvLyR7dGhpcy5tYXRjaGVkLndoaXRlc3BhY2V9JHt0aGlzLm1hdGNoZWQuY29tbWVudH1gO1xuXHR9XG59XG5cblxuLy8gQSBibG9jayBpcyB1c2VkIHRvIHBhcnNlIGEgbmVzdGVkIGJsb2NrIG9mIHN0YXRlbWVudHMuXG5SdWxlLkJsb2NrID0gY2xhc3MgYmxvY2sgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cblx0Ly8gUGFyc2UgdGhlIGVudGlyZSBgYmxvY2tgLCByZXR1cm5pbmcgcmVzdWx0cy5cblx0cGFyc2VCbG9jayhwYXJzZXIsIGJsb2NrLCBpbmRlbnQgPSAwKSB7XG5cdFx0bGV0IG1hdGNoZWQgPSBbXTtcbi8vY29uc29sZS53YXJuKFwiYmxvY2s6XCIsIGJsb2NrKTtcblx0XHRibG9jay5jb250ZW50cy5mb3JFYWNoKChpdGVtLCBpbmRleCkgPT4ge1xuXHRcdFx0bGV0IHJlc3VsdDtcblx0XHRcdGlmIChpdGVtLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRtYXRjaGVkLnB1c2gobmV3IFJ1bGUuQmxhbmtMaW5lKCkpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoaXRlbSBpbnN0YW5jZW9mIFRva2VuaXplci5CbG9jaykge1xuXHRcdFx0XHRsZXQgbGFzdCA9IG1hdGNoZWRbbWF0Y2hlZC5sZW5ndGggLSAxXTtcblx0XHRcdFx0aWYgKGxhc3QucGFyc2VCbG9jaykge1xuXHRcdFx0XHRcdGxhc3QucGFyc2VCbG9jayhwYXJzZXIsIGl0ZW0sIGluZGVudCArIDEpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGxldCBibG9jayA9IHRoaXMucGFyc2VCbG9jayhwYXJzZXIsIGl0ZW0sIGluZGVudCArIDEpO1xuXHRcdFx0XHRcdG1hdGNoZWQucHVzaChibG9jayk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRtYXRjaGVkID0gbWF0Y2hlZC5jb25jYXQodGhpcy5wYXJzZVN0YXRlbWVudChwYXJzZXIsIGl0ZW0pKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHJldHVybiBuZXcgUnVsZS5CbG9jayh7XG5cdFx0XHRpbmRlbnQsXG5cdFx0XHRtYXRjaGVkXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBQYXJzZSBhIHNpbmdsZSBzdGF0ZW1lbnQgKGEgbGluZSdzIHdvcnRoIG9mIGB0b2tlbnNgKS5cblx0Ly8gU2tpcHMgd2hpdGVzcGFjZSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaW5lLlxuXHQvLyBBdXRvLW1hdGNoZXMgY29tbWVudCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBsaW5lLlxuXHQvLyBSZXR1cm5zIGFycmF5IG9mIHJlc3VsdHMuXG5cdHBhcnNlU3RhdGVtZW50KHBhcnNlciwgdG9rZW5zKSB7XG5cdFx0bGV0IHJlc3VsdHMgPSBbXTtcblx0XHRsZXQgc3RhcnQgPSAwLCBlbmQgPSB0b2tlbnMubGVuZ3RoO1xuXHRcdGxldCBzdGF0ZW1lbnQsIGNvbW1lbnQ7XG5cblx0XHQvLyBjaGVjayBmb3IgYW4gaW5kZW50IGF0IHRoZSBzdGFydCBvZiB0aGUgbGluZVxuXHRcdGlmICh0b2tlbnNbc3RhcnRdIGluc3RhbmNlb2YgVG9rZW5pemVyLldoaXRlc3BhY2UpIHN0YXJ0Kys7XG5cblx0XHQvLyBjaGVjayBmb3IgYSBjb21tZW50IGF0IHRoZSBlbmQgb2YgdGhlIHRva2Vuc1xuXHRcdGlmICh0b2tlbnNbZW5kLTFdIGluc3RhbmNlb2YgVG9rZW5pemVyLkNvbW1lbnQpIHtcblx0XHRcdGNvbW1lbnQgPSBwYXJzZXIucGFyc2VSdWxlT3JEaWUoXCJjb21tZW50XCIsIHRva2VucywgZW5kLTEsIGVuZCwgdW5kZWZpbmVkLCBcInBhcnNlU3RhdGVtZW50XCIpO1xuXHRcdFx0Ly8gYWRkIGNvbW1lbnQgRklSU1QgaWYgZm91bmRcblx0XHRcdHJlc3VsdHMucHVzaChjb21tZW50KTtcblx0XHRcdGVuZC0tO1xuXHRcdH1cblxuXHRcdC8vIHBhcnNlIHRoZSByZXN0IGFzIGEgXCJzdGF0ZW1lbnRcIlxuXHRcdHN0YXRlbWVudCA9IHBhcnNlci5wYXJzZVJ1bGVPckRpZShcInN0YXRlbWVudFwiLCB0b2tlbnMsIHN0YXJ0LCBlbmQsIHVuZGVmaW5lZCwgXCJwYXJzZVN0YXRlbWVudFwiKTtcblxuXHRcdC8vIGNvbXBsYWluIGlmIG5vIHN0YXRlbWVudCBhbmQgbm8gY29tbWVudFxuXHRcdGlmICghc3RhdGVtZW50ICYmICFjb21tZW50KSB7XG5cdFx0XHRsZXQgZXJyb3IgPSBuZXcgUnVsZS5TdGF0ZW1lbnRQYXJzZUVycm9yKHtcblx0XHRcdFx0dW5wYXJzZWQ6IHRva2Vucy5zbGljZShzdGFydCwgZW5kKS5qb2luKFwiIFwiKVxuXHRcdFx0fSk7XG5cdFx0XHRyZXN1bHRzLnB1c2goZXJyb3IpO1xuXHRcdH1cblxuXHRcdC8vIGNvbXBsYWluIGNhbid0IHBhcnNlIHRoZSBlbnRpcmUgbGluZSFcblx0XHRlbHNlIGlmIChzdGF0ZW1lbnQgJiYgc3RhdGVtZW50Lm5leHRTdGFydCAhPT0gZW5kKSB7XG5cdFx0XHRsZXQgZXJyb3IgPSBuZXcgUnVsZS5TdGF0ZW1lbnRQYXJzZUVycm9yKHtcblx0XHRcdFx0cGFyc2VkIDogdG9rZW5zLnNsaWNlKHN0YXJ0LCBzdGF0ZW1lbnQubmV4dFN0YXJ0KS5qb2luKFwiIFwiKSxcblx0XHRcdFx0dW5wYXJzZWQgOiB0b2tlbnMuc2xpY2Uoc3RhdGVtZW50Lm5leHRTdGFydCwgZW5kKS5qb2luKFwiIFwiKVxuXHRcdFx0fSk7XG5cdFx0XHRyZXN1bHRzLnB1c2goZXJyb3IpO1xuXHRcdH1cblxuXHRcdC8vIE90aGVyd2lzZSBhZGQgdGhlIHN0YXRlbWVudFxuXHRcdGVsc2UgaWYgKHN0YXRlbWVudCkge1xuXHRcdFx0cmVzdWx0cy5wdXNoKHN0YXRlbWVudCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH1cblxuXHQvLyBSZXR1cm4gc291cmNlIGZvciB0aGlzIGJsb2NrIGFzIGFuIGFycmF5IG9mIGluZGVudGVkIGxpbmVzIFdJVEhPVVQgYHtgIE9SIGB9YC5cblx0YmxvY2tUb1NvdXJjZShjb250ZXh0KSB7XG5cdFx0bGV0IHJlc3VsdHMgPSBbXTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tYXRjaGVkLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSB0aGlzLm1hdGNoZWRbaV07XG5cdFx0XHRsZXQgc291cmNlID0gbWF0Y2gudG9Tb3VyY2UoY29udGV4dCkgfHwgXCJcIjtcblx0XHRcdGlmIChpc1doaXRlc3BhY2Uoc291cmNlKSkge1xuXHRcdFx0XHRyZXN1bHRzLnB1c2goXCJcIik7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0c291cmNlID0gc291cmNlLnNwbGl0KFwiXFxuXCIpO1xuXHRcdFx0XHRyZXN1bHRzID0gcmVzdWx0cy5jb25jYXQoc291cmNlKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKHRoaXMuaW5kZW50ICE9PSAwKSB7XG5cdFx0XHRyZXR1cm4gXCJcXHRcIiArIHJlc3VsdHMuam9pbihcIlxcblxcdFwiKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdHMuam9pbihcIlxcblwiKTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gXCIge1xcblwiICsgdGhpcy5ibG9ja1RvU291cmNlKGNvbnRleHQpICsgXCJcXG5cIiArIFwifVwiO1xuXHR9XG5cblx0Ly8gRm9ybWF0IGFycmF5IG9mIGBzdGF0ZW1lbnRzYCBhcyBhIEpTIG91dHB1dCBibG9jazpcblx0Ly9cdC0gaWYgYHN0YXRlbWVudHNgIGlzIGVtcHR5LCByZXR1cm5zIGB7fWBcblx0Ly9cdC0gaWYgYHN0YXRlbWVudHMgaXMgYSBzaW5nbGUgbGluZSwgcmV0dXJucyBgeyBzdGF0ZW1lbnQgfWBcblx0Ly9cdC0gZWxzZSByZXR1cm5zIG11bHRpcGxlIGxpbmVzXG5cdHN0YXRpYyBlbmNsb3NlU3RhdGVtZW50cyguLi5hcmdzKSB7XG5cdFx0dmFyIHN0YXRlbWVudHMgPSBbXTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdGxldCBhcmcgPSBhcmdzW2ldO1xuXHRcdFx0aWYgKEFycmF5LmlzQXJyYXkoYXJnKSkge1xuXHRcdFx0XHRzdGF0ZW1lbnRzID0gc3RhdGVtZW50cy5jb25jYXQoYXJnKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0c3RhdGVtZW50cy5wdXNoKGFyZyk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHN0YXRlbWVudHMgPSBzdGF0ZW1lbnRzLmpvaW4oXCJcXG5cIik7XG5cblx0XHRpZiAoIXN0YXRlbWVudHMpIHJldHVybiBcInt9XCI7XG5cdFx0aWYgKCFzdGF0ZW1lbnRzLmluY2x1ZGVzKFwiXFxuXCIpICYmIHN0YXRlbWVudHMubGVuZ3RoIDwgNDApIHtcblx0XHRcdHJldHVybiBgeyAke3N0YXRlbWVudHMudHJpbSgpfSB9YDtcblx0XHR9XG5cdFx0aWYgKHN0YXRlbWVudHNbMF0gIT09IFwiXFx0XCIpIHN0YXRlbWVudHMgPSBgXFx0JHtzdGF0ZW1lbnRzfWA7XG5cdFx0cmV0dXJuIGB7XFxuJHtzdGF0ZW1lbnRzfVxcbn1gO1xuXHR9XG5cbn1cblxuXG4vLyBgU3RhdGVtZW50c2AgYXJlIGEgc3BlY2lhbCBjYXNlIGZvciBhIGJsb2NrIG9mIGBTdGF0ZW1lbnRgIHJ1bGVzXG4vL1x0dGhhdCB1bmRlcnN0YW5kIG5lc3RpbmcgYW5kIGNvbW1lbnRzLlxuLy9cbi8vIFRoaXMgaXMgYSB0b3AtbGV2ZWwgY29uc3RydWN0LCBlLmcuIHVzZWQgdG8gcGFyc2UgYW4gZW50aXJlIGZpbGUuXG5SdWxlLlN0YXRlbWVudHMgPSBjbGFzcyBzdGF0ZW1lbnRzIGV4dGVuZHMgUnVsZS5CbG9jayB7XG5cblx0Ly8gU3BsaXQgc3RhdGVtZW50cyB1cCBpbnRvIGJsb2NrcyBhbmQgcGFyc2UgJ2VtLlxuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQgPSB0b2tlbnMubGVuZ3RoLCBzdGFjaykge1xuXHRcdHZhciBibG9jayA9IFRva2VuaXplci5icmVha0ludG9CbG9ja3ModG9rZW5zLCBzdGFydCwgZW5kKTtcblxuXHRcdGxldCBtYXRjaGVkID0gdGhpcy5wYXJzZUJsb2NrKHBhcnNlciwgYmxvY2spO1xuXHRcdGlmICghbWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQsXG5cdFx0XHRuZXh0U3RhcnQ6IGVuZFxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gT3V0cHV0IHN0YXRlbWVudHMgV0lUSE9VVCBjdXJseSBicmFjZXMgYXJvdW5kIHRoZW0uXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLmJsb2NrVG9Tb3VyY2UoY29udGV4dCk7XG5cdH1cbn1cblxuXG4vLyBBIGBCbG9ja1N0YXRlbWVudGAgKGUuZy4gYW4gYGlmYCBvciBgcmVwZWF0YCk6XG4vL1x0LSBoYXMgYW4gaW5pdGlhbCBgc3RhdGVtZW50YFxuLy9cdC0gTUFZIGhhdmUgYW4gaW5saW5lIGBzdGF0ZW1lbnRgIChvbiB0aGUgc2FtZSBsaW5lLCBnZW5lcmFsbHkgYWZ0ZXIgYSBgOmApXG4vL1x0LSBNQVkgaGF2ZSBjb250ZW50cyBhcyBhbiBlbWJlZGRlZCBgYmxvY2tgXG4vL1xuLy9cdEluIHlvdXIgYGdldE1hdGNoZWRTb3VyY2UoKWAsIGBibG9ja2Agd2lsbCBiZSB0aGUgcmVzdWx0aW5nIGJsb2NrIG91dHB1dCwgaWYgdGhlcmUgaXMgb25lLlxuLy9cdEl0J3MgdXAgdG8geW91ciBydWxlIHRvIGRvIHNvbWV0aGluZyB3aXRoIGl0Li4uXG5SdWxlLkJsb2NrU3RhdGVtZW50ID0gY2xhc3MgYmxvY2tfc3RhdGVtZW50IGV4dGVuZHMgUnVsZS5CbG9jayB7XG5cblx0Ly8gUGFyc2UgYSBibG9jayBhbmQgYWRkIGl0IHRvIGB0aGlzLmJsb2NrYFxuXHRwYXJzZUJsb2NrKHBhcnNlciwgYmxvY2ssIGluZGVudCA9IDApIHtcblx0XHR0aGlzLmJsb2NrID0gc3VwZXIucGFyc2VCbG9jayguLi5hcmd1bWVudHMpO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGB0b1NvdXJjZSgpYCBmb3Igb3VyIGByZXN1bHRzYCBhcyBhIG1hcC5cblx0Ly8gSWYgeW91IHBhc3MgYGtleXNgLCB3ZSdsbCByZXN0cmljdCB0byBqdXN0IHRob3NlIGtleXMuXG5cdGdldE1hdGNoZWRTb3VyY2UoY29udGV4dCwgLi4ua2V5cykge1xuXHRcdGxldCBvdXRwdXQgPSBzdXBlci5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQsIC4uLmtleXMpO1xuXHRcdC8vIGFkZCBgYmxvY2tgIHRvIG91dHB1dCBpZiBkZWZpbmVkLlxuXHRcdGlmICh0aGlzLmJsb2NrKSB7XG5cdFx0XHRvdXRwdXQuYmxvY2sgPSB0aGlzLmJsb2NrLmJsb2NrVG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL1J1bGUuanMiLCJcbi8qKlxuICogV2hlbiBzb3VyY2UgbWFwcyBhcmUgZW5hYmxlZCwgYHN0eWxlLWxvYWRlcmAgdXNlcyBhIGxpbmsgZWxlbWVudCB3aXRoIGEgZGF0YS11cmkgdG9cbiAqIGVtYmVkIHRoZSBjc3Mgb24gdGhlIHBhZ2UuIFRoaXMgYnJlYWtzIGFsbCByZWxhdGl2ZSB1cmxzIGJlY2F1c2Ugbm93IHRoZXkgYXJlIHJlbGF0aXZlIHRvIGFcbiAqIGJ1bmRsZSBpbnN0ZWFkIG9mIHRoZSBjdXJyZW50IHBhZ2UuXG4gKlxuICogT25lIHNvbHV0aW9uIGlzIHRvIG9ubHkgdXNlIGZ1bGwgdXJscywgYnV0IHRoYXQgbWF5IGJlIGltcG9zc2libGUuXG4gKlxuICogSW5zdGVhZCwgdGhpcyBmdW5jdGlvbiBcImZpeGVzXCIgdGhlIHJlbGF0aXZlIHVybHMgdG8gYmUgYWJzb2x1dGUgYWNjb3JkaW5nIHRvIHRoZSBjdXJyZW50IHBhZ2UgbG9jYXRpb24uXG4gKlxuICogQSBydWRpbWVudGFyeSB0ZXN0IHN1aXRlIGlzIGxvY2F0ZWQgYXQgYHRlc3QvZml4VXJscy5qc2AgYW5kIGNhbiBiZSBydW4gdmlhIHRoZSBgbnBtIHRlc3RgIGNvbW1hbmQuXG4gKlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNzcykge1xuICAvLyBnZXQgY3VycmVudCBsb2NhdGlvblxuICB2YXIgbG9jYXRpb24gPSB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvdy5sb2NhdGlvbjtcblxuICBpZiAoIWxvY2F0aW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiZml4VXJscyByZXF1aXJlcyB3aW5kb3cubG9jYXRpb25cIik7XG4gIH1cblxuXHQvLyBibGFuayBvciBudWxsP1xuXHRpZiAoIWNzcyB8fCB0eXBlb2YgY3NzICE9PSBcInN0cmluZ1wiKSB7XG5cdCAgcmV0dXJuIGNzcztcbiAgfVxuXG4gIHZhciBiYXNlVXJsID0gbG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2NhdGlvbi5ob3N0O1xuICB2YXIgY3VycmVudERpciA9IGJhc2VVcmwgKyBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC9bXlxcL10qJC8sIFwiL1wiKTtcblxuXHQvLyBjb252ZXJ0IGVhY2ggdXJsKC4uLilcblx0Lypcblx0VGhpcyByZWd1bGFyIGV4cHJlc3Npb24gaXMganVzdCBhIHdheSB0byByZWN1cnNpdmVseSBtYXRjaCBicmFja2V0cyB3aXRoaW5cblx0YSBzdHJpbmcuXG5cblx0IC91cmxcXHMqXFwoICA9IE1hdGNoIG9uIHRoZSB3b3JkIFwidXJsXCIgd2l0aCBhbnkgd2hpdGVzcGFjZSBhZnRlciBpdCBhbmQgdGhlbiBhIHBhcmVuc1xuXHQgICAoICA9IFN0YXJ0IGEgY2FwdHVyaW5nIGdyb3VwXG5cdCAgICAgKD86ICA9IFN0YXJ0IGEgbm9uLWNhcHR1cmluZyBncm91cFxuXHQgICAgICAgICBbXikoXSAgPSBNYXRjaCBhbnl0aGluZyB0aGF0IGlzbid0IGEgcGFyZW50aGVzZXNcblx0ICAgICAgICAgfCAgPSBPUlxuXHQgICAgICAgICBcXCggID0gTWF0Y2ggYSBzdGFydCBwYXJlbnRoZXNlc1xuXHQgICAgICAgICAgICAgKD86ICA9IFN0YXJ0IGFub3RoZXIgbm9uLWNhcHR1cmluZyBncm91cHNcblx0ICAgICAgICAgICAgICAgICBbXikoXSsgID0gTWF0Y2ggYW55dGhpbmcgdGhhdCBpc24ndCBhIHBhcmVudGhlc2VzXG5cdCAgICAgICAgICAgICAgICAgfCAgPSBPUlxuXHQgICAgICAgICAgICAgICAgIFxcKCAgPSBNYXRjaCBhIHN0YXJ0IHBhcmVudGhlc2VzXG5cdCAgICAgICAgICAgICAgICAgICAgIFteKShdKiAgPSBNYXRjaCBhbnl0aGluZyB0aGF0IGlzbid0IGEgcGFyZW50aGVzZXNcblx0ICAgICAgICAgICAgICAgICBcXCkgID0gTWF0Y2ggYSBlbmQgcGFyZW50aGVzZXNcblx0ICAgICAgICAgICAgICkgID0gRW5kIEdyb3VwXG4gICAgICAgICAgICAgICpcXCkgPSBNYXRjaCBhbnl0aGluZyBhbmQgdGhlbiBhIGNsb3NlIHBhcmVuc1xuICAgICAgICAgICkgID0gQ2xvc2Ugbm9uLWNhcHR1cmluZyBncm91cFxuICAgICAgICAgICogID0gTWF0Y2ggYW55dGhpbmdcbiAgICAgICApICA9IENsb3NlIGNhcHR1cmluZyBncm91cFxuXHQgXFwpICA9IE1hdGNoIGEgY2xvc2UgcGFyZW5zXG5cblx0IC9naSAgPSBHZXQgYWxsIG1hdGNoZXMsIG5vdCB0aGUgZmlyc3QuICBCZSBjYXNlIGluc2Vuc2l0aXZlLlxuXHQgKi9cblx0dmFyIGZpeGVkQ3NzID0gY3NzLnJlcGxhY2UoL3VybFxccypcXCgoKD86W14pKF18XFwoKD86W14pKF0rfFxcKFteKShdKlxcKSkqXFwpKSopXFwpL2dpLCBmdW5jdGlvbihmdWxsTWF0Y2gsIG9yaWdVcmwpIHtcblx0XHQvLyBzdHJpcCBxdW90ZXMgKGlmIHRoZXkgZXhpc3QpXG5cdFx0dmFyIHVucXVvdGVkT3JpZ1VybCA9IG9yaWdVcmxcblx0XHRcdC50cmltKClcblx0XHRcdC5yZXBsYWNlKC9eXCIoLiopXCIkLywgZnVuY3Rpb24obywgJDEpeyByZXR1cm4gJDE7IH0pXG5cdFx0XHQucmVwbGFjZSgvXicoLiopJyQvLCBmdW5jdGlvbihvLCAkMSl7IHJldHVybiAkMTsgfSk7XG5cblx0XHQvLyBhbHJlYWR5IGEgZnVsbCB1cmw/IG5vIGNoYW5nZVxuXHRcdGlmICgvXigjfGRhdGE6fGh0dHA6XFwvXFwvfGh0dHBzOlxcL1xcL3xmaWxlOlxcL1xcL1xcLykvaS50ZXN0KHVucXVvdGVkT3JpZ1VybCkpIHtcblx0XHQgIHJldHVybiBmdWxsTWF0Y2g7XG5cdFx0fVxuXG5cdFx0Ly8gY29udmVydCB0aGUgdXJsIHRvIGEgZnVsbCB1cmxcblx0XHR2YXIgbmV3VXJsO1xuXG5cdFx0aWYgKHVucXVvdGVkT3JpZ1VybC5pbmRleE9mKFwiLy9cIikgPT09IDApIHtcblx0XHQgIFx0Ly9UT0RPOiBzaG91bGQgd2UgYWRkIHByb3RvY29sP1xuXHRcdFx0bmV3VXJsID0gdW5xdW90ZWRPcmlnVXJsO1xuXHRcdH0gZWxzZSBpZiAodW5xdW90ZWRPcmlnVXJsLmluZGV4T2YoXCIvXCIpID09PSAwKSB7XG5cdFx0XHQvLyBwYXRoIHNob3VsZCBiZSByZWxhdGl2ZSB0byB0aGUgYmFzZSB1cmxcblx0XHRcdG5ld1VybCA9IGJhc2VVcmwgKyB1bnF1b3RlZE9yaWdVcmw7IC8vIGFscmVhZHkgc3RhcnRzIHdpdGggJy8nXG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIHBhdGggc2hvdWxkIGJlIHJlbGF0aXZlIHRvIGN1cnJlbnQgZGlyZWN0b3J5XG5cdFx0XHRuZXdVcmwgPSBjdXJyZW50RGlyICsgdW5xdW90ZWRPcmlnVXJsLnJlcGxhY2UoL15cXC5cXC8vLCBcIlwiKTsgLy8gU3RyaXAgbGVhZGluZyAnLi8nXG5cdFx0fVxuXG5cdFx0Ly8gc2VuZCBiYWNrIHRoZSBmaXhlZCB1cmwoLi4uKVxuXHRcdHJldHVybiBcInVybChcIiArIEpTT04uc3RyaW5naWZ5KG5ld1VybCkgKyBcIilcIjtcblx0fSk7XG5cblx0Ly8gc2VuZCBiYWNrIHRoZSBmaXhlZCBjc3Ncblx0cmV0dXJuIGZpeGVkQ3NzO1xufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9zdHlsZS1sb2FkZXIvZml4VXJscy5qc1xuLy8gbW9kdWxlIGlkID0gOTA1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIHN0eWxlLWxvYWRlcjogQWRkcyBzb21lIGNzcyB0byB0aGUgRE9NIGJ5IGFkZGluZyBhIDxzdHlsZT4gdGFnXG5cbi8vIGxvYWQgdGhlIHN0eWxlc1xudmFyIGNvbnRlbnQgPSByZXF1aXJlKFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL1NwYWNlci5sZXNzXCIpO1xuaWYodHlwZW9mIGNvbnRlbnQgPT09ICdzdHJpbmcnKSBjb250ZW50ID0gW1ttb2R1bGUuaWQsIGNvbnRlbnQsICcnXV07XG4vLyBQcmVwYXJlIGNzc1RyYW5zZm9ybWF0aW9uXG52YXIgdHJhbnNmb3JtO1xuXG52YXIgb3B0aW9ucyA9IHt9XG5vcHRpb25zLnRyYW5zZm9ybSA9IHRyYW5zZm9ybVxuLy8gYWRkIHRoZSBzdHlsZXMgdG8gdGhlIERPTVxudmFyIHVwZGF0ZSA9IHJlcXVpcmUoXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9hZGRTdHlsZXMuanNcIikoY29udGVudCwgb3B0aW9ucyk7XG5pZihjb250ZW50LmxvY2FscykgbW9kdWxlLmV4cG9ydHMgPSBjb250ZW50LmxvY2Fscztcbi8vIEhvdCBNb2R1bGUgUmVwbGFjZW1lbnRcbmlmKG1vZHVsZS5ob3QpIHtcblx0Ly8gV2hlbiB0aGUgc3R5bGVzIGNoYW5nZSwgdXBkYXRlIHRoZSA8c3R5bGU+IHRhZ3Ncblx0aWYoIWNvbnRlbnQubG9jYWxzKSB7XG5cdFx0bW9kdWxlLmhvdC5hY2NlcHQoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vU3BhY2VyLmxlc3NcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbmV3Q29udGVudCA9IHJlcXVpcmUoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vU3BhY2VyLmxlc3NcIik7XG5cdFx0XHRpZih0eXBlb2YgbmV3Q29udGVudCA9PT0gJ3N0cmluZycpIG5ld0NvbnRlbnQgPSBbW21vZHVsZS5pZCwgbmV3Q29udGVudCwgJyddXTtcblx0XHRcdHVwZGF0ZShuZXdDb250ZW50KTtcblx0XHR9KTtcblx0fVxuXHQvLyBXaGVuIHRoZSBtb2R1bGUgaXMgZGlzcG9zZWQsIHJlbW92ZSB0aGUgPHN0eWxlPiB0YWdzXG5cdG1vZHVsZS5ob3QuZGlzcG9zZShmdW5jdGlvbigpIHsgdXBkYXRlKCk7IH0pO1xufVxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2FwcC9TcGFjZXIubGVzc1xuLy8gbW9kdWxlIGlkID0gOTA2XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIHN0eWxlLWxvYWRlcjogQWRkcyBzb21lIGNzcyB0byB0aGUgRE9NIGJ5IGFkZGluZyBhIDxzdHlsZT4gdGFnXG5cbi8vIGxvYWQgdGhlIHN0eWxlc1xudmFyIGNvbnRlbnQgPSByZXF1aXJlKFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL3N0eWxlcy5sZXNzXCIpO1xuaWYodHlwZW9mIGNvbnRlbnQgPT09ICdzdHJpbmcnKSBjb250ZW50ID0gW1ttb2R1bGUuaWQsIGNvbnRlbnQsICcnXV07XG4vLyBQcmVwYXJlIGNzc1RyYW5zZm9ybWF0aW9uXG52YXIgdHJhbnNmb3JtO1xuXG52YXIgb3B0aW9ucyA9IHt9XG5vcHRpb25zLnRyYW5zZm9ybSA9IHRyYW5zZm9ybVxuLy8gYWRkIHRoZSBzdHlsZXMgdG8gdGhlIERPTVxudmFyIHVwZGF0ZSA9IHJlcXVpcmUoXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9hZGRTdHlsZXMuanNcIikoY29udGVudCwgb3B0aW9ucyk7XG5pZihjb250ZW50LmxvY2FscykgbW9kdWxlLmV4cG9ydHMgPSBjb250ZW50LmxvY2Fscztcbi8vIEhvdCBNb2R1bGUgUmVwbGFjZW1lbnRcbmlmKG1vZHVsZS5ob3QpIHtcblx0Ly8gV2hlbiB0aGUgc3R5bGVzIGNoYW5nZSwgdXBkYXRlIHRoZSA8c3R5bGU+IHRhZ3Ncblx0aWYoIWNvbnRlbnQubG9jYWxzKSB7XG5cdFx0bW9kdWxlLmhvdC5hY2NlcHQoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vc3R5bGVzLmxlc3NcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbmV3Q29udGVudCA9IHJlcXVpcmUoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vc3R5bGVzLmxlc3NcIik7XG5cdFx0XHRpZih0eXBlb2YgbmV3Q29udGVudCA9PT0gJ3N0cmluZycpIG5ld0NvbnRlbnQgPSBbW21vZHVsZS5pZCwgbmV3Q29udGVudCwgJyddXTtcblx0XHRcdHVwZGF0ZShuZXdDb250ZW50KTtcblx0XHR9KTtcblx0fVxuXHQvLyBXaGVuIHRoZSBtb2R1bGUgaXMgZGlzcG9zZWQsIHJlbW92ZSB0aGUgPHN0eWxlPiB0YWdzXG5cdG1vZHVsZS5ob3QuZGlzcG9zZShmdW5jdGlvbigpIHsgdXBkYXRlKCk7IH0pO1xufVxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2FwcC9zdHlsZXMubGVzc1xuLy8gbW9kdWxlIGlkID0gOTA3XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIENvbW1vbiBpbXBvcnRzXG5pbXBvcnQgUmVhY3QgZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgUmVhY3RET00gZnJvbSAncmVhY3QtZG9tJztcblxuLy8gUGFyc2VyXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuLi9pbmRleFwiO1xuXG4vLyBBcHAtc3BlY2lmaWMgaW1wb3J0c1xuaW1wb3J0IFNwZWxsRWRpdG9yIGZyb20gXCIuL1NwZWxsRWRpdG9yLmpzeFwiO1xuXG4vLyBLaWNrIG9mZiBvdXIgdG9wLWxldmVsIGVsZW1lbnRcblJlYWN0RE9NLnJlbmRlcihcbiAgPFNwZWxsRWRpdG9yIC8+LFxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVhY3Qtcm9vdCcpXG4pO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2FwcC9pbmRleC5qc3giLCJpbXBvcnQgeyBnZXRUYWJzIH0gZnJvbSBcIi4vdXRpbHMvc3RyaW5nXCI7XG5cbi8vIEdSUlIuLi4gbm9kZSBkb2Vzbid0IGluY2x1ZGUgdGhpcz8/P1xuLy8gQ0hFQ0sgRElGRkVSRU5UIE5PREUgVkVSU0lPTlMuLi5cbmlmICghKEFycmF5LnByb3RvdHlwZS5pbmNsdWRlcykpIHtcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgXCJpbmNsdWRlc1wiLCB7XG5cdFx0dmFsdWU6IGZ1bmN0aW9uKHZhbHVlLCBzdGFydCkge1xuXHRcdFx0bGV0IGluZGV4ID0gdGhpcy5pbmRleE9mKHZhbHVlLCBzdGFydCk7XG5cdFx0XHRyZXR1cm4gKGluZGV4ICE9PSAtMSk7XG5cdFx0fVxuXHR9KTtcbn1cblxuXG5cbi8vIGB3aGl0ZXNwYWNlYCBjbGFzcyBmb3Igbm9ybWFsIChub24taW5kZW50LCBub24tbmV3bGluZSkgd2hpdGVzcGFjZS5cbmNsYXNzIHdoaXRlc3BhY2Uge1xuXHRjb25zdHJ1Y3Rvcih3aGl0ZXNwYWNlKSB7XG5cdFx0dGhpcy53aGl0ZXNwYWNlID0gd2hpdGVzcGFjZTtcblx0fVxuXG5cdC8vIFJldHVybiB0aGUgXCJsZW5ndGhcIiBvZiB0aGlzIHdoaXRlc3BhY2UsIGVnIGZvciBhbiBpbmRlbnQuXG5cdGdldCBsZW5ndGgoKSB7XG5cdFx0cmV0dXJuIHRoaXMud2hpdGVzcGFjZS5sZW5ndGg7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy53aGl0ZXNwYWNlO1xuXHR9XG59XG5cblxuLy8gYGluZGVudGAgY2xhc3MuXG5jbGFzcyBpbmRlbnQgZXh0ZW5kcyB3aGl0ZXNwYWNlIHt9XG5cblxuLy8gTmV3bGluZSBzaW5nbGV0b24uXG5jbGFzcyBuZXdsaW5lIGV4dGVuZHMgd2hpdGVzcGFjZSB7fVxuXG5cbi8vXG4vL1x0IyBUb2tlbml6ZXJcbi8vXHQtIGAudG9rZW5pemUoKWAgXHRcdEJyZWFrcyB1cCBsb25nIHN0cmluZyBpbnRvIHRva2VucywgaW5jbHVkaW5nIG5ld2xpbmVzLCBKU1ggZXhwcmVzc2lvbnMsIGV0Yy5cbi8vXHQtIGAudG9rZW5pemVMaW5lcygpYCBcdFRha2VzIHRoZSBhYm92ZSBhbmQgYnJlYWtzIGl0IGludG8gYW4gYXJyYXkgb2YgYXJyYXlzIGZvciBlYWNoIGxpbmUuXG4vL1xuLy8gVE9ETzogZXJyb3IgY2hlY2tpbmcgLyByZXBvcnRpbmcsIGVzcGVjaWFsbHkgaW4gSlNYIGV4cHJlc3Npb25zLlxuLy8gVE9ETzogaGF2ZSBub3JtYWwgYHRva2VuaXplYCBzdGljayB3aGl0ZXNwYWNlIGVsZW1lbnRzIGluIHRoZSBzdHJlYW0sIHRoZW4gYHRva2VuaXplTGluZXMoKWAgdGFrZXMgdGhlbSBvdXQ/XG5jb25zdCBUb2tlbml6ZXIgPSB7XG5cblx0Ly8gU2hvdWxkIHdlIHdhcm4gYWJvdXQgYW5vbWFsb3VzIGNvbmRpdGlvbnM/XG5cdFdBUk4gOiBmYWxzZSxcblxuXHQvLyBXaGl0ZXNwYWNlIGNvbnN0cnVjdG9yLlxuXHRXaGl0ZXNwYWNlOiB3aGl0ZXNwYWNlLFxuXG5cdC8vIEluZGVudCBjb25zdHJ1Y3RvclxuXHRJbmRlbnQ6IGluZGVudCxcblxuXHQvLyBORVdMSU5FIHNpbmdsZXRvbi5cblx0TkVXTElORTogbmV3IG5ld2xpbmUoXCJcXG5cIiksXG5cblx0Ly8gVG9rZW5pemUgdGV4dCBiZXR3ZWVuIGBzdGFydGAgYW5kIGBlbmRgIGludG8gYW4gYXJyYXkgb2YgYHJlc3VsdHNgLCBhbiBhcnJheSBvZjpcblx0Ly9cdC0gYFRva2VuaXplci5ORVdMSU5FYCBmb3IgYSBuZXdsaW5lIHN5bWJvbFxuXHQvL1x0LSBzdHJpbmdzIGZvciBrZXl3b3Jkcy9zeW1ib2xzXG5cdC8vXHQtIG51bWJlcnMgZm9yIG51bWJlciBsaXRlcmFsc1xuXHQvL1x0LSBgeyBpbmRlbnQ6IG51bWJlciB9YCBmb3IgaW5kZW50IGF0IHN0YXJ0IG9mIGxpbmVcblx0Ly9cdC0gYHsgdHlwZTogXCJ0ZXh0XCIsIGxpdGVyYWw6IFwiJ2FiYydcIiwgdGV4dDogXCJhYmNcIiB9XG5cdC8vXHQtIGB7IHR5cGU6IFwiaW5kZW50XCIsIGxldmVsOiA3IH1gXG5cdC8vXHQtIGB7IHR5cGU6IFwiY29tbWVudFwiLCBjb21tZW50OiBcInN0cmluZ1wiLCBjb21tZW50U3ltYm9sLCB3aGl0ZXNwYWNlIH1gXG4vL1RFU1RNRVxuXHR0b2tlbml6ZSh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHQvLyBxdWljayByZXR1cm4gb3V0IG9mIHJhbmdlIG9yIG9ubHkgd2hpdGVzcGFjZVxuXHRcdGlmIChzdGFydCA+PSBlbmQgfHwgIXRleHQudHJpbSgpKSByZXR1cm4gW107XG5cblx0XHRsZXQgdG9rZW5zID0gW107XG5cdFx0Ly8gUHJvY2VzcyBvdXIgdG9wLWxldmVsIHJ1bGVzLlxuXHRcdGxldCBbcmVzdWx0cywgbmV4dFN0YXJ0XSA9IHRoaXMuZWF0VG9rZW5zKHRoaXMubWF0Y2hUb3BUb2tlbnMsIHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdGlmIChyZXN1bHRzKSB7XG5cdFx0XHR0b2tlbnMgPSB0b2tlbnMuY29uY2F0KHJlc3VsdHMpO1xuXHRcdFx0c3RhcnQgPSBuZXh0U3RhcnQ7XG5cdFx0fVxuXHRcdGlmIChzdGFydCAhPT0gZW5kKSB7XG5cdFx0XHRpZiAoVG9rZW5pemVyLldBUk4pIGNvbnNvbGUud2FybihcInRva2VuaXplKCk6IGRpZG4ndCBjb25zdW1lOiBgXCIsIHRleHQuc2xpY2Uoc3RhcnQsIGVuZCkgKyBcImBcIik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH0sXG5cblx0Ly8gUmVwZWF0ZWRseSBleGVjdXRlIGEgYG1ldGhvZGAgKGJvdW5kIHRvIGB0aGlzKSB3aGljaCByZXR1cm5zIGEgYFtyZXN1bHQsIG5leHRTdGFydF1gIG9yIGB1bmRlZmluZWRgLlxuXHQvLyBQbGFjZXMgbWF0Y2hlZCByZXN1bHRzIHRvZ2V0aGVyIGluIGByZXN1bHRzYCBhcnJheSBhbmQgcmV0dXJucyBgW3Jlc3VsdHMsIG5leHRTdGFydF1gIGZvciB0aGUgZW50aXJlIHNldC5cblx0Ly8gU3RvcHMgaWYgYG1ldGhvZGAgZG9lc24ndCByZXR1cm4gYW55dGhpbmcsIG9yIGlmIGNhbGxpbmcgYG1ldGhvZGAgaXMgdW5wcm9kdWN0aXZlLlxuLy9URVNUTUVcblx0ZWF0VG9rZW5zKG1ldGhvZCwgdGV4dCwgc3RhcnQgPSAwLCBlbmQsIHJlc3VsdHMgPSBbXSkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gcHJvY2VzcyBydWxlcyByZXBlYXRlZGx5IHVudGlsIHdlIGdldCB0byB0aGUgZW5kXG5cdFx0d2hpbGUgKHN0YXJ0IDwgZW5kKSB7XG5cdFx0XHRsZXQgcmVzdWx0ID0gbWV0aG9kLmNhbGwodGhpcywgdGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgYnJlYWs7XG5cblx0XHRcdGxldCBbdG9rZW5zLCBuZXh0U3RhcnRdID0gcmVzdWx0O1xuXHRcdFx0Ly8gQmFpbCBpZiB3ZSBkaWRuJ3QgZ2V0IGEgcHJvZHVjdGl2ZSBydWxlIVxuXHRcdFx0aWYgKHN0YXJ0ID09PSBuZXh0U3RhcnQpIGJyZWFrO1xuXG5cdFx0XHQvLyBoYW5kbGUgbmV3UmVzdWx0cyBhcyBhbiBhcnJheSBvciBzaW5nbGUgb2JqZWN0LlxuXHRcdFx0aWYgKHRva2VucyAhPT0gdW5kZWZpbmVkKSByZXN1bHRzID0gcmVzdWx0cy5jb25jYXQodG9rZW5zKTtcblx0XHRcdHN0YXJ0ID0gbmV4dFN0YXJ0O1xuXHRcdH1cblx0XHRyZXR1cm4gW3Jlc3VsdHMsIHN0YXJ0XTtcblx0fSxcblxuXHQvLyBNYXRjaCBhIHNpbmdsZSB0b3AtbGV2ZWwgdG9rZW4gYXQgYHRleHRbc3RhcnRdYC5cbi8vVEVTVE1FXG5cdG1hdGNoVG9wVG9rZW5zKHRleHQsIHN0YXJ0LCBlbmQpIHtcblx0XHRyZXR1cm5cdHRoaXMubWF0Y2hXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaFdvcmQodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdCB8fCB0aGlzLm1hdGNoTnVtYmVyKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaE5ld2xpbmUodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdCB8fCB0aGlzLm1hdGNoSlNYRWxlbWVudCh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0IHx8IHRoaXMubWF0Y2hUZXh0KHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaENvbW1lbnQodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdCB8fCB0aGlzLm1hdGNoU3ltYm9sKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0O1xuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBTeW1ib2wgY2hhcmFjdGVyXG5cdC8vXG5cblx0Ly8gTWF0Y2ggdGhlIHNpbmdsZSBcInN5bWJvbFwiIGNoYXJhY3RlciBhdCBgdGV4dFtzdGFydF1gLlxuXHQvLyBOT1RFOiBUaGlzIGRvZXMgbm90IGRvIGFueSBjaGVja2luZywgaXQganVzdCBibGluZGx5IHVzZXMgdGhlIGNoYXJhY3RlciBpbiBxdWVzdGlvbi5cblx0Ly9cdFx0IFlvdSBzaG91bGQgbWFrZSBzdXJlIGFsbCBvdGhlciBwb3NzaWJsZSBydWxlcyBoYXZlIGJlZW4gZXhoYXVzdGVkIGZpcnN0LlxuXHRtYXRjaFN5bWJvbCh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIFt0ZXh0W3N0YXJ0XSwgc3RhcnQgKyAxXVxuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBXaGl0ZXNwYWNlXG5cdC8vXG5cblx0Ly8gUmV0dXJuIHRoZSBmaXJzdCBjaGFyIHBvc2l0aW9uIGFmdGVyIGBzdGFydGAgd2hpY2ggaXMgTk9UIGEgd2hpdGVzcGFjZSBjaGFyIChzcGFjZSBvciB0YWIgb25seSkuXG5cdC8vIElmIGB0ZXh0W3N0YXJ0XWAgaXMgbm90IHdoaXRlc3BhY2UsIHJldHVybnMgYHN0YXJ0YCxcblx0Ly9cdHNvIHlvdSBjYW4gY2FsbCB0aGlzIGF0IGFueSB0aW1lIHRvIHNraXAgd2hpdGVzcGFjZSBpbiB0aGUgb3V0cHV0LlxuXHRlYXRXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiBlbmQ7XG5cblx0XHRsZXQgd2hpdGVTcGFjZUVuZCA9IHN0YXJ0O1xuXHRcdHdoaWxlICh3aGl0ZVNwYWNlRW5kIDwgZW5kICYmICh0ZXh0W3doaXRlU3BhY2VFbmRdID09PSBcIiBcIiB8fCB0ZXh0W3doaXRlU3BhY2VFbmRdID09PSBcIlxcdFwiKSkge1xuXHRcdFx0d2hpdGVTcGFjZUVuZCsrO1xuXHRcdH1cblx0XHRyZXR1cm4gd2hpdGVTcGFjZUVuZDtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgV2hpdGVzcGFjZVxuXHQvL1x0Tk9URTogV2hpdGVzcGFjZSBhdCB0aGUgYmVnaW5uaW5nIG9mIGB0ZXh0YCBvciB0aGUgYmVnaW5uaW5nIG9mIGEgbGluZVxuXHQvL1x0XHQgIGlzIGNvbnNpZGVyZWQgYW4gXCJpbmRlbnRcIiBhbmQgd2lsbCBoYXZlIGAuaXNJbmRlbnQgPT09IHRydWVgLlxuXHQvL1xuXG5cdC8vIENvbnZlcnQgYSBydW4gb2Ygc3BhY2VzIGFuZC9vciB0YWJzIGludG8gYSBgVG9rZW5pemVyLldoaXRlc3BhY2VgLlxuXHRtYXRjaFdoaXRlc3BhY2UodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCB3aGl0ZXNwYWNlRW5kID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdC8vIGZvcmdldCBpdCBpZiBubyBmb3J3YXJkIG1vdGlvblxuXHRcdGlmICh3aGl0ZXNwYWNlRW5kID09PSBzdGFydCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCB3aGl0ZXNwYWNlID0gdGV4dC5zbGljZShzdGFydCwgd2hpdGVzcGFjZUVuZCk7XG5cdFx0bGV0IHRva2VuO1xuXHRcdGlmIChzdGFydCA9PT0gMCB8fCB0ZXh0W3N0YXJ0LTFdID09PSBcIlxcblwiKVxuXHRcdFx0dG9rZW4gPSBuZXcgVG9rZW5pemVyLkluZGVudCh3aGl0ZXNwYWNlKTtcblx0XHRlbHNlXG5cdFx0XHR0b2tlbiA9IG5ldyBUb2tlbml6ZXIuV2hpdGVzcGFjZSh3aGl0ZXNwYWNlKTtcblxuXHRcdHJldHVybiBbdG9rZW4sIHdoaXRlc3BhY2VFbmRdO1xuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBOZXdsaW5lXG5cdC8vXG5cblx0Ly8gTWF0Y2ggYSBzaW5nbGUgbmV3bGluZSBjaGFyYWN0ZXIgYXQgYHRleHRbc3RhcnRdYC5cblx0Ly8gUmV0dXJucyBgW1Rva2VuaXplci5ORVdMSU5FLCBuZXh0U3RhcnRdYCBvbiBtYXRjaC5cblx0Ly8gT3RoZXJ3aXNlIHJldHVybnMgYHVuZGVmaW5lZGAuXG5cdG1hdGNoTmV3bGluZSh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kIHx8IHRleHRbc3RhcnRdICE9PSBcIlxcblwiKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIFtUb2tlbml6ZXIuTkVXTElORSwgc3RhcnQgKyAxXTtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgV29yZFxuXHQvL1xuXG5cdC8vIE1hdGNoIGEgc2luZ2xlIGB3b3JkYCBpbiBgdGV4dGAgYXQgY2hhcmFjdGVyIGBzdGFydGAuXG5cdC8vIFJldHVybnMgYFt3b3JkLCB3b3JkRW5kXWAuXG5cdC8vIFJldHVybnMgYW4gZW1wdHkgYXJyYXkgaWYgY291bGRuJ3QgbWF0Y2ggYSB3b3JkLlxuXHRXT1JEX1NUQVJUOiAvW0EtWmEtel0vLFxuXHRXT1JEX0NIQVIgOiAvXltcXHdfLV0vLFxuXHRtYXRjaFdvcmQodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGlmICghdGhpcy5XT1JEX1NUQVJULnRlc3QodGV4dFtzdGFydF0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHdvcmRFbmQgPSBzdGFydCArIDE7XG5cdFx0d2hpbGUgKHdvcmRFbmQgPCBlbmQgJiYgdGhpcy5XT1JEX0NIQVIudGVzdCh0ZXh0W3dvcmRFbmRdKSkge1xuXHRcdFx0d29yZEVuZCsrO1xuXHRcdH1cblx0XHRpZiAod29yZEVuZCA9PT0gc3RhcnQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgd29yZCA9IHRleHQuc2xpY2Uoc3RhcnQsIHdvcmRFbmQpO1xuXHRcdHJldHVybiBbd29yZCwgd29yZEVuZF07XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIE51bWJlcnNcblx0Ly9cblxuXHQvLyBFYXQgYSBzaW5nbGUgbnVtYmVyLlxuXHQvLyBSZXR1cm5zIGEgYE51bWJlcmAgaWYgbWF0Y2hlZC5cblx0TlVNQkVSX1NUQVJUOiAvWzAtOS0uXS8sXG5cdE5VTUJFUiA6IC9eLT8oWzAtOV0qXFwuKT9bMC05XSsvLFxuXHRtYXRjaE51bWJlcih0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKCF0aGlzLk5VTUJFUl9TVEFSVC50ZXN0KHRleHRbc3RhcnRdKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBudW1iZXJNYXRjaCA9IHRoaXMubWF0Y2hFeHByZXNzaW9uQXRIZWFkKHRoaXMuTlVNQkVSLCB0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRpZiAoIW51bWJlck1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IG51bWJlclN0ciA9IG51bWJlck1hdGNoWzBdO1xuXHRcdGxldCBudW1iZXIgPSBwYXJzZUZsb2F0KG51bWJlclN0ciwgMTApO1xuXHRcdHJldHVybiBbbnVtYmVyLCBzdGFydCArIG51bWJlclN0ci5sZW5ndGhdO1xuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBUZXh0IGxpdGVyYWxcblx0Ly9cblxuXHQvLyBFYXQgYSB0ZXh0IGxpdGVyYWwgKHN0YXJ0cy9lbmRzIHdpdGggYCdgIG9yIGBcImApLlxuXHQvLyBSZXR1cm5zIGEgYFRva2VuaXplci5UZXh0YCBpZiBtYXRjaGVkLlxuLy9URVNUTUU6ICBub3Qgc3VyZSB0aGUgZXNjYXBpbmcgbG9naWMgaXMgcmVhbGx5IHJpZ2h0Li4uXG5cdG1hdGNoVGV4dCh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHF1b3RlU3ltYm9sID0gdGV4dFtzdGFydF07XG5cdFx0aWYgKHF1b3RlU3ltYm9sICE9PSAnXCInICYmIHF1b3RlU3ltYm9sICE9PSBcIidcIikgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCB0ZXh0RW5kID0gc3RhcnQgKyAxO1xuXHRcdHdoaWxlICh0ZXh0RW5kIDwgZW5kKSB7XG5cdFx0XHRsZXQgY2hhciA9IHRleHRbdGV4dEVuZF07XG5cdFx0XHRpZiAoY2hhciA9PT0gcXVvdGVTeW1ib2wpIGJyZWFrO1xuXHRcdFx0Ly8gaWYgd2UgZ2V0IGEgYmFja3F1b3RlLCBpZ25vcmUgcXVvdGUgaW4gbmV4dCBjaGFyXG5cdFx0XHRpZiAoY2hhciA9PT0gXCJcXFxcXCIgJiYgdGV4dFt0ZXh0RW5kICsgMV0gPT09IHF1b3RlU3ltYm9sKSB0ZXh0RW5kKys7XG5cdFx0XHR0ZXh0RW5kKys7XG5cdFx0fVxuXHRcdC8vIEZvcmdldCBpdCBpZiB3ZSBkaWRuJ3QgZW5kIHdpdGggdGhlIHF1b3RlIHN5bWJvbFxuXHRcdGlmICh0ZXh0W3RleHRFbmRdICE9PSBxdW90ZVN5bWJvbCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHQvLyBhZHZhbmNlIHBhc3QgZW5kIHF1b3RlXG5cdFx0dGV4dEVuZCsrO1xuXG5cdFx0bGV0IHF1b3RlZFN0cmluZyA9IHRleHQuc2xpY2Uoc3RhcnQsIHRleHRFbmQpO1xuXHRcdGxldCB0b2tlbiA9IG5ldyBUb2tlbml6ZXIuVGV4dChxdW90ZWRTdHJpbmcpO1xuXHRcdHJldHVybiBbdG9rZW4sIHRleHRFbmRdO1xuXHR9LFxuXG5cdC8vIGBUZXh0YCBjbGFzcyBmb3Igc3RyaW5nIGxpdGVyYWxzLlxuXHQvLyBQYXNzIHRoZSBsaXRlcmFsIHZhbHVlLCB1c2UgYC50ZXh0YCB0byBnZXQganVzdCB0aGUgYml0IGluc2lkZSB0aGUgcXVvdGVzLlxuXHRUZXh0IDogY2xhc3MgdGV4dCB7XG5cdFx0Y29uc3RydWN0b3IocXVvdGVkU3RyaW5nKSB7XG5cdFx0XHR0aGlzLnF1b3RlZFN0cmluZyA9IHF1b3RlZFN0cmluZztcblx0XHR9XG5cdFx0Z2V0IHRleHQoKSB7XG5cdFx0XHRsZXQgc3RyaW5nID0gdGhpcy5xdW90ZWRTdHJpbmc7XG5cdFx0XHQvLyBjYWxjdWxhdGUgYHRleHRgIGFzIHRoZSBiaXRzIGJldHdlZW4gdGhlIHF1b3Rlcy5cblx0XHRcdGxldCBzdGFydCA9IDA7XG5cdFx0XHRsZXQgZW5kID0gc3RyaW5nLmxlbmd0aDtcblx0XHRcdGlmIChzdHJpbmdbc3RhcnRdID09PSAnXCInIHx8IHN0cmluZ1tzdGFydF0gPT09IFwiJ1wiKSBzdGFydCA9IDE7XG5cdFx0XHRpZiAoc3RyaW5nW2VuZC0xXSA9PT0gJ1wiJyB8fCBzdHJpbmdbZW5kLTFdID09PSBcIidcIikgZW5kID0gLTE7XG5cdFx0XHRyZXR1cm4gc3RyaW5nLnNsaWNlKHN0YXJ0LCBlbmQpO1xuXHRcdH1cblx0XHR0b1N0cmluZygpIHtcblx0XHRcdHJldHVybiB0aGlzLnF1b3RlZFN0cmluZztcblx0XHR9XG5cdH0sXG5cblx0Ly9cblx0Ly9cdCMjIyBDb21tZW50c1xuXHQvL1xuXG5cdC8vIEVhdCBhIGNvbW1lbnQgKHVudGlsIHRoZSBlbmQgb2YgdGhlIGxpbmUpLlxuXHQvLyBSZXR1cm5zIGEgYFRva2VuaXplci5Db21tZW50YCBpZiBtYXRjaGVkLlxuXHRDT01NRU5UIDogL14oIyMrfC0tK3xcXC9cXC8rKShcXHMqKSguKikvLFxuXHRtYXRjaENvbW1lbnQodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBjb21tZW50U3RhcnQgPSB0ZXh0LnNsaWNlKHN0YXJ0LCBzdGFydCArIDIpO1xuXHRcdGlmIChjb21tZW50U3RhcnQgIT09IFwiLS1cIiAmJiBjb21tZW50U3RhcnQgIT09IFwiXFwvXFwvXCIgJiYgY29tbWVudFN0YXJ0ICE9PSBcIiMjXCIpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBjb21tZW50IGVhdHMgdW50aWwgdGhlIGVuZCBvZiB0aGUgbGluZVxuXHRcdGxldCBsaW5lID0gdGhpcy5nZXRMaW5lQXRIZWFkKHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdGxldCBjb21tZW50TWF0Y2ggPSBsaW5lLm1hdGNoKHRoaXMuQ09NTUVOVClcblx0XHRpZiAoIWNvbW1lbnRNYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBbbWF0Y2gsIGNvbW1lbnRTeW1ib2wsIHdoaXRlc3BhY2UsIGNvbW1lbnRdID0gY29tbWVudE1hdGNoO1xuXHRcdGxldCB0b2tlbiA9IG5ldyBUb2tlbml6ZXIuQ29tbWVudCh7IGNvbW1lbnRTeW1ib2wsIHdoaXRlc3BhY2UsIGNvbW1lbnQgfSk7XG5cdFx0cmV0dXJuIFt0b2tlbiwgc3RhcnQgKyBsaW5lLmxlbmd0aF07XG5cdH0sXG5cblx0Ly8gQ29tbWVudCBjbGFzc1xuLy9URVNUTUVcblx0Q29tbWVudCA6IGNsYXNzIGNvbW1lbnQge1xuXHRcdGNvbnN0cnVjdG9yIChwcm9wcykge1xuXHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wcyk7XG5cdFx0fVxuXHRcdHRvU3RyaW5nKCkge1xuXHRcdFx0cmV0dXJuIGAke3RoaXMuY29tbWVudFN5bWJvbH0ke3RoaXMud2hpdGVzcGFjZX0ke3RoaXMuY29tbWVudH1gO1xuXHRcdH1cblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgSlNYXG5cdC8vXG5cblx0Ly8gRWF0IGEgKG5lc3RlZCkgSlNYIGV4cHJlc3Npb24uXG4vL1RFU1RNRVxuXHRtYXRjaEpTWEVsZW1lbnQodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XSA9IHRoaXMubWF0Y2hKU1hTdGFydFRhZyh0ZXh0LCBzdGFydCwgZW5kKSB8fCBbXTtcblx0XHRpZiAoIWpzeEVsZW1lbnQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAoIWpzeEVsZW1lbnQuaXNVbmFyeVRhZykge1xuXHRcdFx0bGV0IFtjaGlsZHJlbiwgY2hpbGRFbmRdID0gdGhpcy5tYXRjaEpTWENoaWxkcmVuKGpzeEVsZW1lbnQudGFnTmFtZSwgdGV4dCwgbmV4dFN0YXJ0LCBlbmQpO1xuXHRcdFx0aWYgKGNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdFx0XHRqc3hFbGVtZW50LmNoaWxkcmVuID0gY2hpbGRyZW47XG5cdFx0XHRcdG5leHRTdGFydCA9IGNoaWxkRW5kO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XTtcblx0fSxcblxuXHQvLyBNYXRjaCBKU1ggc3RhcnQgdGFnIGFuZCBpbnRlcm5hbCBlbGVtZW50cyAoYnV0IE5PVCBjaGlsZHJlbikuXG5cdC8vIFJldHVybnMgYFtqc3hFbGVtZW50LCBuZXh0U3RhcnRdYCBvciBgdW5kZWZpbmVkYC5cblx0Ly8gVXNlIGBtYXRjaEpTWEVsZW1lbnQoKWAgdG8gbWF0Y2ggY2hpbGRyZW4sIGVuZCB0YWcsIGV0Yy5cblx0Ly8gSWdub3JlcyBsZWFkaW5nIHdoaXRlc3BhY2UuXG5cdEpTWF9UQUdfU1RBUlQgOiAvXjwoW0EtWmEtel1bXFx3LVxcLl0qKShcXHMqXFwvPnxcXHMqPnxcXHMrKS8sXG4vLyBUT0RPOiBjbGVhbiB0aGlzIHN0dWZmIHVwLCBtYXliZSB3aXRoIGZpbmRGaXJzdEF0SGVhZD9cblx0bWF0Y2hKU1hTdGFydFRhZyh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IG5leHRTdGFydCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHQvLyBNYWtlIHN1cmUgd2Ugc3RhcnQgd2l0aCBgPGAuXG5cdFx0aWYgKHRleHRbbmV4dFN0YXJ0XSAhPT0gXCI8XCIpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgdGFnTWF0Y2ggPSB0aGlzLm1hdGNoRXhwcmVzc2lvbkF0SGVhZCh0aGlzLkpTWF9UQUdfU1RBUlQsIHRleHQsIG5leHRTdGFydCwgZW5kKTtcblx0XHRpZiAoIXRhZ01hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IFsgbWF0Y2hUZXh0LCB0YWdOYW1lLCBlbmRCaXQgXSA9IHRhZ01hdGNoO1xuXHRcdGxldCBqc3hFbGVtZW50ID0gbmV3IFRva2VuaXplci5KU1hFbGVtZW50KHRhZ05hbWUpO1xuXHRcdG5leHRTdGFydCA9IG5leHRTdGFydCArIG1hdGNoVGV4dC5sZW5ndGg7XG5cblx0XHQvLyBJZiB1bmFyeSB0YWcsIG1hcmsgYXMgc3VjaCBhbmQgcmV0dXJuLlxuXHRcdGVuZEJpdCA9IGVuZEJpdC50cmltKCk7XG5cdFx0aWYgKGVuZEJpdCA9PT0gXCIvPlwiKSB7XG5cdFx0XHRqc3hFbGVtZW50LmlzVW5hcnlUYWcgPSB0cnVlO1xuXHRcdFx0cmV0dXJuIFtqc3hFbGVtZW50LCBuZXh0U3RhcnRdO1xuXHRcdH1cblxuXHRcdC8vIElmIHdlIGRpZG4ndCBpbW1lZGlhdGVseSBnZXQgYW4gZW5kIG1hcmtlciwgYXR0ZW1wdCB0byBtYXRjaCBhdHRyaWJ1dGVzXG5cdFx0aWYgKGVuZEJpdCAhPT0gXCI+XCIgJiYgZW5kQml0ICE9PSBcIi8+XCIpIHtcblx0XHRcdGxldCBbIGF0dHJzLCBhdHRyRW5kIF0gPSB0aGlzLmVhdFRva2Vucyh0aGlzLm1hdGNoSlNYQXR0cmlidXRlLCB0ZXh0LCBuZXh0U3RhcnQsIGVuZCk7XG5cdFx0XHRqc3hFbGVtZW50LmF0dHJpYnV0ZXMgPSBhdHRycztcblx0XHRcdG5leHRTdGFydCA9IGF0dHJFbmQ7XG5cdFx0fVxuXG5cdFx0Ly8gYXQgdGhpcyBwb2ludCB3ZSBzaG91bGQgZ2V0IGFuIGAvPmAgb3IgYD5gICh3aXRoIG5vIHdoaXRlc3BhY2UpLlxuXHRcdGlmICh0ZXh0W25leHRTdGFydF0gPT09IFwiL1wiICYmIHRleHRbbmV4dFN0YXJ0ICsgMV0gPT09IFwiPlwiKSB7XG5cdFx0XHRlbmRCaXQgPSBcIi8+XCI7XG5cdFx0XHRuZXh0U3RhcnQgKz0gMjtcblx0XHR9XG5cdFx0ZWxzZSBpZiAodGV4dFtuZXh0U3RhcnRdID09PSBcIj5cIikge1xuXHRcdFx0ZW5kQml0ID0gdGV4dFtuZXh0U3RhcnRdO1xuXHRcdFx0bmV4dFN0YXJ0ICs9IDE7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIGltbWVkaWF0ZWx5IGZvciB1bmFyeSB0YWdcblx0XHRpZiAoZW5kQml0ID09PSBcIi8+XCIpIHtcblx0XHRcdGpzeEVsZW1lbnQuaXNVbmFyeVRhZyA9IHRydWU7XG5cdFx0XHRyZXR1cm4gW2pzeEVsZW1lbnQsIG5leHRTdGFydF07XG5cdFx0fVxuXG5cdFx0Ly8gYWR2YW5jZSBwYXN0IGA+YFxuXHRcdGlmIChlbmRCaXQgIT09IFwiPlwiKSB7XG5cdFx0XHRpZiAoVG9rZW5pemVyLldBUk4pIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiTWlzc2luZyBleHBlY3RlZCBlbmQgYD5gIGZvciBqc3hFbGVtZW50XCIsIGpzeEVsZW1lbnQsIFwiYFwiK3RleHQuc2xpY2Uoc3RhcnQsIG5leHRTdGFydCkrXCJgXCIpO1xuXHRcdFx0fVxuXHRcdFx0anN4RWxlbWVudC5lcnJvciA9IFwiTm8gZW5kID5cIjtcblx0XHRcdHJldHVybiBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XTtcblx0XHR9XG5cblx0XHRyZXR1cm4gW2pzeEVsZW1lbnQsIG5leHRTdGFydF07XG5cdH0sXG5cblxuXHQvLyBKU1ggZWxlbWVudCBjbGFzc1xuXHRKU1hFbGVtZW50IDogY2xhc3MganN4RWxlbWVudCB7XG5cdFx0Y29uc3RydWN0b3IodGFnTmFtZSwgYXR0cmlidXRlcywgY2hpbGRyZW4pIHtcblx0XHRcdHRoaXMudGFnTmFtZSA9IHRhZ05hbWU7XG5cdFx0XHRpZiAoYXR0cmlidXRlcykgdGhpcy5hdHRyaWJ1dGVzID0gYXR0cmlidXRlcztcblx0XHRcdGlmIChjaGlsZHJlbikgdGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuXHRcdH1cblxuXHRcdC8vIFJldHVybiBhdHRyaWJ1dGVzIGFzIGEgbWFwLlxuLy9URVNUTUVcblx0XHRnZXQgYXR0cnMoKSB7XG5cdFx0XHRsZXQgYXR0cnMgPSB7fTtcblx0XHRcdGlmICh0aGlzLmF0dHJpYnV0ZXMpIHRoaXMuYXR0cmlidXRlcy5mb3JFYWNoKGF0dHIgPT4ge1xuXHRcdFx0XHQvLyBpZ25vcmUgdW5uYW1lZCBhdHRyaWJ1dGVzXG5cdFx0XHRcdGlmIChhdHRyLm5hbWUpIGF0dHJzW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlXG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBhdHRycztcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4gb3VyIGF0dHJpYnV0ZXMgYXMgYSBzdHJpbmdcbi8vVEVTVE1FXG5cdFx0Z2V0IGF0dHJzQXNTdHJpbmcoKSB7XG5cdFx0XHRpZiAoIXRoaXMuYXR0cmlidXRlcykgcmV0dXJuIFwiXCI7XG5cdFx0XHRyZXR1cm4gXCIgXCIgKyB0aGlzLmF0dHJpYnV0ZXMubWFwKCAoeyBuYW1lLCB2YWx1ZSB9KSA9PiB7XG5cdFx0XHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbmFtZTtcblx0XHRcdFx0Ly8gY29udmVydCB2YWx1ZSBhcnJheSAodG9rZW5zKSB0byBzdHJpbmdcblx0XHRcdFx0Ly8gVE9ETzogdGhpcyB3aWxsIHdhbnQgdG8gYmUgc21hcnRlci4uLlxuXHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHZhbHVlID0gYHske3ZhbHVlLmpvaW4oXCIgXCIpfX1gO1xuXHRcdFx0XHRyZXR1cm4gYG5hbWU9JHt2YWx1ZX1gO1xuXHRcdFx0fSkuam9pbihcIiBcIik7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIG91ciBjaGlsZHJlbiBhcyBhIHN0cmluZy5cbi8vVEVTVE1FXG5cdFx0Z2V0IGNoaWxkcmVuQXNTdHJpbmcoKSB7XG5cdFx0XHRpZiAoIXRoaXMuY2hpbGRyZW4pIHJldHVybiBcIlwiO1xuXHRcdFx0cmV0dXJuIHRoaXMuY2hpbGRyZW4ubWFwKGNoaWxkID0+IHtcblx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkoY2hpbGQpKSByZXR1cm4gYHske2NoaWxkLmpvaW4oXCIgXCIpfX1gO1xuXHRcdFx0XHRyZXR1cm4gXCJcIiArIGNoaWxkO1xuXHRcdFx0fSkuam9pbihcIlwiKTtcblx0XHR9XG5cblx0XHR0b1N0cmluZygpIHtcblx0XHRcdGxldCBhdHRycyA9IHRoaXMuYXR0cnNBc1N0cmluZztcblx0XHRcdGxldCBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW5Bc1N0cmluZztcblx0XHRcdGlmICh0aGlzLmlzVW5hcnlUYWcpIHJldHVybiBgPCR7dGhpcy50YWdOYW1lfSR7YXR0cnN9Lz5gO1xuXHRcdFx0cmV0dXJuIGA8JHt0aGlzLnRhZ05hbWV9JHthdHRyc30+JHtjaGlsZHJlbn08LyR7dGhpcy50YWdOYW1lfT5gO1xuXHRcdH1cblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgSlNYIGNoaWxkcmVuXG5cdC8vXG5cblx0Ly8gTWF0Y2ggSlNYIGVsZW1lbnQgY2hpbGRyZW4gb2YgYDx0YWdOYW1lPmAgYXQgYHRleHRbc3RhcnRdYC5cblx0Ly8gTWF0Y2hlcyBuZXN0ZWQgY2hpbGRyZW4gYW5kIHN0b3BzIGFmdGVyIG1hdGNoaW5nIGVuZCB0YWc6IGA8L3RhZ05hbWU+YC5cblx0Ly8gUmV0dXJucyBgW2NoaWxkcmVuLCBuZXh0U3RhcnRdYC5cbi8vVEVTVE1FXG5cdG1hdGNoSlNYQ2hpbGRyZW4odGFnTmFtZSwgdGV4dCwgc3RhcnQsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IGNoaWxkcmVuID0gW107XG5cdFx0bGV0IG5lc3RpbmcgPSAxO1xuXHRcdGxldCBlbmRUYWcgPSBgPC8ke3RhZ05hbWV9PmA7XG5cblx0XHRsZXQgbmV4dFN0YXJ0ID0gc3RhcnQ7XG5cdFx0d2hpbGUodHJ1ZSkge1xuXHRcdFx0bGV0IHJlc3VsdCA9IHRoaXMubWF0Y2hKU1hDaGlsZChlbmRUYWcsIHRleHQsIG5leHRTdGFydCwgZW5kKTtcblx0XHRcdGlmICghcmVzdWx0KSBicmVhaztcblxuXHRcdFx0bGV0IFtjaGlsZCwgY2hpbGRFbmRdID0gcmVzdWx0O1xuXHRcdFx0bmV4dFN0YXJ0ID0gY2hpbGRFbmQ7XG5cdFx0XHQvLyBJZiB3ZSBnb3QgdGhlIGVuZFRhZywgdXBkYXRlIG5lc3RpbmcgYW5kIGJyZWFrIG91dCBvZiBsb29wIGlmIG5lc3RpbmcgIT09IDBcblx0XHRcdGlmIChjaGlsZCA9PT0gZW5kVGFnKSB7XG5cdFx0XHRcdG5lc3RpbmcgLS07XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKSBicmVhaztcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0aWYgKGNoaWxkKSBjaGlsZHJlbi5wdXNoKGNoaWxkKTtcblx0XHRcdH1cblx0XHR9XG4vLyBUT0RPOiBob3cgdG8gc3VyZmFjZSB0aGlzIGVycm9yPz8/XG5cdFx0aWYgKG5lc3RpbmcgIT09IDApIHtcblx0XHRcdGlmIChUb2tlbml6ZXIuV0FSTikge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oYG1hdGNoSlNYQ2hpbGRyZW4oJHt0ZXh0LnNsaWNlKHN0YXJ0LCBuZXh0U3RhcnQgKyAxMCl9OiBkaWRuJ3QgbWF0Y2ggZW5kIGNoaWxkIWApO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gW2NoaWxkcmVuLCBuZXh0U3RhcnRdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGEgc2luZ2xlIEpTWCBjaGlsZDpcblx0Ly9cdC0gY3VycmVudCBlbmRUYWdcblx0Ly9cdC0gYHsganN4IGV4cHJlc3Npb24gfWBcblx0Ly9cdC0gbmVzdGVkIEpTWCBlbGVtZW50XG5cdC8vXHQtIChhbnl0aGluZyBlbHNlKSBhcyBqc3hUZXh0IGV4cHJlc3Npb24uXG5cdG1hdGNoSlNYQ2hpbGQoZW5kVGFnLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoSlNYRW5kVGFnKGVuZFRhZywgdGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdHx8IHRoaXMubWF0Y2hKU1hFeHByZXNzaW9uKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHR8fCB0aGlzLm1hdGNoSlNYRWxlbWVudCh0ZXh0LCBzdGFydCwgZW5kKVxuLy8gVE9ETzogbmV3bGluZSBhbmQgaW5kZW50P1xuXHRcdFx0fHwgdGhpcy5tYXRjaEpTWFRleHQodGV4dCwgc3RhcnQsIGVuZCk7XG5cdH0sXG5cblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCBhIHNwZWNpZmljIGVuZCB0YWcuXG5cdC8vIElnbm9yZXMgbGVhZGluZyB3aGl0ZXNwYWNlLlxuXHRtYXRjaEpTWEVuZFRhZyhlbmRUYWcsIHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgbmV4dFN0YXJ0ID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdGlmICghdGhpcy5tYXRjaFN0cmluZ0F0SGVhZChlbmRUYWcsIHRleHQsIG5leHRTdGFydCwgZW5kKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gW2VuZFRhZywgbmV4dFN0YXJ0ICsgZW5kVGFnLmxlbmd0aF07XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIEpTWCBhdHRyaWJ1dGVzXG5cdC8vXG5cblx0Ly8gTWF0Y2ggYSBzaW5nbGUgSlNYIGVsZW1lbnQgYXR0cmlidXRlIGFzIGA8YXR0cj49ezx2YWx1ZT59YFxuLy8gVE9ETzogey4uLnh4eH1cblx0SlNYX0FUVFJJQlVURV9TVEFSVCA6IC9eXFxzKihbXFx3LV0rXFxiKVxccyooPT8pXFxzKi8sXG5cdG1hdGNoSlNYQXR0cmlidXRlKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBhdHRyaWJ1dGVzIG11c3Qgc3RhcnQgd2l0aCBhIHdvcmQgY2hhcmFjdGVyXG5cdFx0aWYgKCF0aGlzLldPUkRfU1RBUlQudGVzdCh0ZXh0W3N0YXJ0XSkpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBhdHRlbXB0IHRvIG1hdGNoIGFuIGF0dHJpYnV0ZSBuYW1lLCBpbmNsdWRpbmcgYD1gIGlmIHByZXNlbnQuXG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMubWF0Y2hFeHByZXNzaW9uQXRIZWFkKHRoaXMuSlNYX0FUVFJJQlVURV9TVEFSVCwgdGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgWyBtYXRjaCwgbmFtZSwgZXF1YWxzIF0gPSByZXN1bHQ7XG5cdFx0bGV0IG5leHRTdGFydCA9IHN0YXJ0ICsgbWF0Y2gubGVuZ3RoO1xuXHRcdGxldCBhdHRyaWJ1dGUgPSBuZXcgVG9rZW5pemVyLkpTWEF0dHJpYnV0ZShuYW1lKTtcblxuXHRcdC8vIGlmIHRoZXJlIHdhcyBhbiBlcXVhbHMgY2hhciwgcGFyc2UgdGhlIHZhbHVlXG5cdFx0aWYgKGVxdWFscykge1xuXHRcdFx0bGV0IFt2YWx1ZSwgdmFsdWVFbmRdID0gdGhpcy5tYXRjaEpTWEF0dHJpYnV0ZVZhbHVlKHRleHQsIG5leHRTdGFydCwgZW5kKSB8fCBbXTtcblx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHRhdHRyaWJ1dGUudmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0bmV4dFN0YXJ0ID0gdmFsdWVFbmQ7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIGVhdCB3aGl0ZXNwYWNlIGJlZm9yZSB0aGUgbmV4dCBhdHRyaWJ1dGUgLyB0YWcgZW5kXG5cdFx0bmV4dFN0YXJ0ID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHRleHQsIG5leHRTdGFydCwgZW5kKTtcblx0XHRyZXR1cm4gW2F0dHJpYnV0ZSwgbmV4dFN0YXJ0XTtcblx0fSxcblxuXHQvLyBNYXRjaCBhIHZhbHVlIGV4cHJlc3Npb24gZm9yIGEgSlNYIGVsZW1lbnQgYXR0cmlidXRlOlxuXHQvLyBOT1RFOiB3ZSB3aWxsIGJlIGNhbGxlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgYD1gIChhbmQgc3Vic2VxdWVudCB3aGl0ZXNwYWNlKS5cblx0bWF0Y2hKU1hBdHRyaWJ1dGVWYWx1ZSh0ZXh0LCBzdGFydCwgZW5kKSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hUZXh0KHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHR8fCB0aGlzLm1hdGNoSlNYRXhwcmVzc2lvbih0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0fHwgdGhpcy5tYXRjaEpTWEVsZW1lbnQodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdHx8IHRoaXMubWF0Y2hKU1hBdHRyaWJ1dGVWYWx1ZUlkZW50aWZpZXIodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdHx8IHRoaXMubWF0Y2hOdW1iZXIodGV4dCwgc3RhcnQsIGVuZClcblx0XHQ7XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYSBzaW5nbGUgaWRlbnRpZmVyIGFzIGEgSlNYIGF0dHJpYnV0ZSB2YWx1ZS5cblx0Ly8gUmV0dXJucyBhcyBhIGBKU1hFeHByZXNzaW9uYC5cblx0bWF0Y2hKU1hBdHRyaWJ1dGVWYWx1ZUlkZW50aWZpZXIodGV4dCwgc3RhcnQsIGVuZCkge1xuXHRcdGxldCByZXN1bHQgPSB0aGlzLm1hdGNoV29yZCh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRpZiAoIXJlc3VsdCkgcmV0dXJuO1xuXG5cdFx0bGV0IFsgd29yZCwgbmV4dFN0YXJ0IF0gPSByZXN1bHQ7XG5cdFx0bGV0IHRva2VuID0gbmV3IFRva2VuaXplci5KU1hFeHByZXNzaW9uKHdvcmQpO1xuXHRcdHJldHVybiBbdG9rZW4sIG5leHRTdGFydF07XG5cdH0sXG5cblx0Ly8gSlNYIGF0dHJpYnV0ZSBjbGFzc1xuXHQvLyBgbmFtZWAgaXMgdGhlIG5hbWUgb2YgdGhlIGF0dHJpYnV0ZS5cblx0Ly8gYHZhbHVlYCBpcyBvbmUgb2Y6XG5cdC8vXHRcdC0gYCcuLi4nYFx0XHRcdC8vIFRleHQgKGxpdGVyYWwgc3RyaW5nKS5cblx0Ly9cdFx0LSBgXCIuLi5cImBcdFx0XHQvLyBUZXh0IChsaXRlcmFsIHN0cmluZykuXG5cdC8vXHRcdC0gYHsuLi59YFx0XHRcdC8vIEV4cHJlc3Npb24uICBSZXN1bHRzIHdpbGwgYmUgdG9rZW5pemVkIGFycmF5LlxuXHQvL1x0XHQtIGA8Li4uLj5gXHRcdFx0Ly8gSlNYIGVsZW1lbnQuXG5cdC8vXHRcdC0gYDFgXHRcdFx0XHQvLyBOdW1iZXIuICBOb3RlOiB0aGlzIGlzIGFuIGV4dGVuc2lvbiB0byBKU1guXG5cblx0SlNYQXR0cmlidXRlIDogY2xhc3MganN4QXR0cmlidXRlIHtcblx0XHRjb25zdHJ1Y3RvcihuYW1lLCB2YWx1ZSkge1xuXHRcdFx0dGhpcy5uYW1lID0gbmFtZTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB0aGlzLnZhbHVlID0gdmFsdWU7XG5cdFx0fVxuXHRcdHRvU3RyaW5nKCkge1xuXHRcdFx0aWYgKHRoaXMudmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMubmFtZTtcblx0XHRcdHJldHVybiBgJHt0aGlzLm5hbWV9PXske3RoaXMudmFsdWV9fWA7XG5cdFx0fVxuXHR9LFxuXG5cblx0Ly8gTWF0Y2ggYSBKU1ggZXhwcmVzc2lvbiBlbmNsb3NlZCBpbiBjdXJseSBicmFjZXMsIGVnOiAgYHsgLi4uIH1gLlxuXHQvLyAgSGFuZGxlcyBuZXN0ZWQgY3VybGllcywgcXVvdGVzLCBldGMuXG5cdC8vIFJldHVybnMgYXJyYXkgb2YgdG9rZW5zIG9mIGludGVybmFsIG1hdGNoLlxuXHQvLyBJZ25vcmVzIGxlYWRpbmcgd2hpdGVzcGFjZS5cbi8vVE9ETzogbmV3bGluZXMvaW5kZW50cz8/P1xuLy9UT0RPOiB7Li4ueHh4fVxuLy9URVNUTUVcblx0bWF0Y2hKU1hFeHByZXNzaW9uKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgbmV4dFN0YXJ0ID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdGxldCBlbmRJbmRleCA9IHRoaXMuZmluZE1hdGNoaW5nQXRIZWFkKFwie1wiLCBcIn1cIiwgdGV4dCwgbmV4dFN0YXJ0LCBlbmQpO1xuXHRcdGlmIChlbmRJbmRleCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gR2V0IGNvbnRlbnRzLCBpbmNsdWRpbmcgbGVhZGluZyBhbmQgdHJhaWxpbmcgd2hpdGVzcGFjZS5cblx0XHRsZXQgY29udGVudHMgPSB0ZXh0LnNsaWNlKHN0YXJ0ICsgMSwgZW5kSW5kZXgpO1xuXG5cdFx0Ly8gcmV0dXJuIGEgbmV3IEpTWEV4cHJlc3Npb24sIGFkdmFuY2luZyBiZXlvbmQgdGhlIGVuZGluZyBgfWAuXG5cdFx0bGV0IGV4cHJlc3Npb24gPSBuZXcgVG9rZW5pemVyLkpTWEV4cHJlc3Npb24oY29udGVudHMpO1xuXHRcdHJldHVybiBbZXhwcmVzc2lvbiwgZW5kSW5kZXggKyAxXTtcblx0fSxcblxuXHQvLyBKU1ggZXhwcmVzc2lvbiwgY29tcG9zZWQgb2YgaW5saW5lIHRva2VucyB3aGljaCBzaG91bGQgeWllbGQgYW4gYGV4cHJlc3Npb25gLlxuXHRKU1hFeHByZXNzaW9uIDogY2xhc3MganN4RXhwcmVzc2lvbiB7XG5cdFx0Y29uc3RydWN0b3IoY29udGVudHMpIHtcblx0XHRcdHRoaXMuY29udGVudHMgPSBjb250ZW50cyB8fCBcIlwiO1xuXHRcdH1cblx0XHQvLyBEaXZpZGUgY29udGVudHMgaW50byBgdG9rZW5zYC5cblx0XHRnZXQgdG9rZW5zKCkge1xuXHRcdFx0cmV0dXJuIFRva2VuaXplci50b2tlbml6ZSh0aGlzLmNvbnRlbnRzLnRyaW0oKSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIEpTWFRleHQgdW50aWwgdGhlIG9uZSBvZiBge2AsIGA8YCwgYD5gIG9yIGB9YC5cblx0Ly8gTk9URTogSU5DTFVERVMgbGVhZGluZyAvIHRyYWlsaW5nIHdoaXRlc3BhY2UuXG5cdEpTWF9URVhUX0VORF9DSEFSUyA6IFtcIntcIiwgXCI8XCIsIFwiPlwiLCBcIn1cIl0sXG4vL1RFU1RNRVxuXHRtYXRjaEpTWFRleHQodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIHRlbXBvcmFyaWx5IGFkdmFuY2UgcGFzdCB3aGl0ZXNwYWNlICh3ZSdsbCBpbmNsdWRlIGl0IGluIHRoZSBvdXRwdXQpLlxuXHRcdGxldCBuZXh0U3RhcnQgPSB0aGlzLmVhdFdoaXRlc3BhY2UodGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0bGV0IGVuZEluZGV4ID0gdGhpcy5maW5kRmlyc3RBdEhlYWQodGhpcy5KU1hfVEVYVF9FTkRfQ0hBUlMsIHRleHQsIG5leHRTdGFydCwgZW5kKTtcblx0XHQvLyBJZiB0aGUgZmlyc3Qgbm9uLXdoaXRlc3BhY2UgY2hhciBpcyBpbiBvdXIgRU5EX0NIQVJTLCBmb3JnZXQgaXQuXG5cdFx0aWYgKGVuZEluZGV4ID09PSBuZXh0U3RhcnQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyBpZiBubyBtYXRjaCwgd2UndmUgZ290IHNvbWUgc29ydCBvZiBlcnJvclxuXHRcdGlmIChlbmRJbmRleCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRpZiAoVG9rZW5pemVyLldBUk4pIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKFwibWF0Y2hKU1hUZXh0KFwiK3RleHQuc2xpY2Uoc3RhcnQsIHN0YXJ0ICsgNTApK1wiKTogSlNYIHNlZW1zIHRvIGJlIHVuYmFsYW5jZWQuXCIpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHQvLyBpbmNsdWRlIGxlYWRpbmcgd2hpdGVzcGFjZSBpbiB0aGUgb3V0cHV0LlxuXHRcdGxldCBqc3hUZXh0ID0gdGV4dC5zbGljZShzdGFydCwgZW5kSW5kZXgpO1xuXHRcdHJldHVybiBbanN4VGV4dCwgZW5kSW5kZXhdO1xuXHR9LFxuXG5cblxuXG5cdC8vXG5cdC8vXHQjIyBVdGlsaXR5IGZ1bmN0aW9uc1xuXHQvL1xuXG5cdC8vIFJldHVybiBjaGFyYWN0ZXJzIHVwIHRvLCBidXQgbm90IGluY2x1ZGluZywgdGhlIG5leHQgbmV3bGluZSBjaGFyIGFmdGVyIGBzdGFydGAuXG5cdC8vIElmIGBzdGFydGAgaXMgYSBuZXdsaW5lIGNoYXIgb3Igc3RhcnQgPj0gZW5kLCByZXR1cm5zIGVtcHR5IHN0cmluZy5cblx0Ly8gSWYgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nIChlZzogbm8gbW9yZSBuZXdsaW5lcyksIHJldHVybnMgZnJvbSBzdGFydCB0byBlbmQuXG4vL1RFU1RNRVxuXHRnZXRMaW5lQXRIZWFkKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiBcIlwiO1xuXG5cdFx0bGV0IG5ld2xpbmUgPSB0ZXh0LmluZGV4T2YoXCJcXG5cIiwgc3RhcnQpO1xuXHRcdGlmIChuZXdsaW5lID09PSAtMSB8fCBuZXdsaW5lID4gZW5kKSBuZXdsaW5lID0gZW5kO1xuXHRcdHJldHVybiB0ZXh0LnNsaWNlKHN0YXJ0LCBuZXdsaW5lKTtcblx0fSxcblxuXHQvLyBNYXRjaCBhIG11bHRpLWNoYXIgc3RyaW5nIHN0YXJ0aW5nIGF0IGB0ZXh0W3N0YXJ0XWAuXG4vL1RFU1RNRVxuXHRtYXRjaFN0cmluZ0F0SGVhZChzdHJpbmcsIHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgc3RyaW5nRW5kID0gc3RhcnQgKyBzdHJpbmcubGVuZ3RoO1xuXHRcdGlmIChzdHJpbmdFbmQgPiBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHN0cmluZyA9PT0gdGV4dC5zbGljZShzdGFydCwgc3RyaW5nRW5kKTtcblx0fSxcblxuXG5cdC8vIE1hdGNoIGEgcmVndWxhciBleHByZXNzaW9uIHN0YXJ0aW5nIGF0IGB0ZXh0W3N0YXJ0XWAsIHJldHVybmluZyB0aGUgbWF0Y2guXG5cdC8vIFJldHVybnMgYG51bGxgIGlmIG5vIG1hdGNoLlxuXHQvL1xuXHQvLyBOT1RFOiBUaGUgZXhwcmVzc2lvbiBNVVNUIHN0YXJ0IHdpdGggYC9eLi4uL2Bcbi8vVEVTVE1FXG5cdG1hdGNoRXhwcmVzc2lvbkF0SGVhZChleHByZXNzaW9uLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IGhlYWQgPSB0ZXh0LnNsaWNlKHN0YXJ0LCBlbmQpO1xuXHRcdHJldHVybiBoZWFkLm1hdGNoKGV4cHJlc3Npb24pO1xuXHR9LFxuXG5cdC8vIEZpbmQgaW5kZXggb2YgdGhlIG1hdGNoaW5nIFNJTkdMRSBDSEFSQUNURVIgYGVuZERlbGltaXRlcmAgdG8gbWF0Y2ggYHN0YXJ0RGVsaW1pdGVyYC5cblx0Ly8gTWF0Y2hlcyBuZXN0ZWQgZGVsaW1pdGVycyBhbmQgaGFuZGxlcyBlc2NhcGVkIGRlbGltaXRlcnMuXG5cdC8vIEFzc3VtZXMgYHRleHRbc3RhcnRdYCBpcyB0aGUgc3RhcnREZWxpbWl0ZXIhXG5cdC8vIFJldHVybnMgbnVtZXJpYyBpbmRleCBvciBgdW5kZWZpbmVkYCBpZiBubyBtYXRjaCBvciBpZiBmaXJzdCBjaGFyIGlzIG5vdCBgc3RhcnREZWxpbWl0ZXJgLlxuXHQvL1xuXHQvL1x0QWxzbyBoYW5kbGVzIG5lc3RlZCBxdW90ZXMgLS0gaWYgd2UgZW5jb3VudGVyIGEgc2luZ2xlIG9yIGRvdWJsZSBxdW90ZSxcblx0Ly9cdFx0d2UnbGwgc2tpcCBzY2FubmluZyB1bnRpbCB3ZSBmaW5kIGEgbWF0Y2hpbmcgcXVvdGUuXG5cdC8vXG5cdC8vXHRlZzogIGBmaW5kTWF0Y2hpbmdBdEhlYWQoXCJ7XCIsIFwifVwiLCBcInthYXthfWFhfVwiKWAgPT4gOFxuLy9URVNUTUVcblx0ZmluZE1hdGNoaW5nQXRIZWFkKHN0YXJ0RGVsaW1pdGVyLCBlbmREZWxpbWl0ZXIsIHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGV4dFtzdGFydF0gIT09IHN0YXJ0RGVsaW1pdGVyKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IG5lc3RpbmcgPSAwO1xuXHRcdGxldCBjdXJyZW50ID0gc3RhcnQ7XG5cdFx0d2hpbGUgKGN1cnJlbnQgPCBlbmQpIHtcblx0XHRcdGxldCBjaGFyID0gdGV4dFtjdXJyZW50XTtcblx0XHRcdC8vIGlmIHN0YXJ0RGVsaW1pdGVyLCBpbmNyZWFzZSBuZXN0aW5nXG5cdFx0XHRpZiAoY2hhciA9PT0gc3RhcnREZWxpbWl0ZXIpIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0fVxuXHRcdFx0Ly8gaWYgZW5kRGVsaW1pdGVyLCBkZWNyZWFzZSBuZXN0aW5nIGFuZCByZXR1cm4gaWYgbmVzdGluZyBiYWNrIHRvIDBcblx0XHRcdGVsc2UgaWYgKGNoYXIgPT09IGVuZERlbGltaXRlcikge1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHRcdGlmIChuZXN0aW5nID09PSAwKSByZXR1cm4gY3VycmVudDtcblx0XHRcdH1cblx0XHRcdC8vIGlmIGEgc2luZ2xlIG9yIGRvdWJsZSBxdW90ZSwgc2tpcCB1bnRpbCB0aGUgbWF0Y2hpbmcgcXVvdGVcblx0XHRcdGVsc2UgaWYgKGNoYXIgPT09IFwiJ1wiIHx8IGNoYXIgPT09ICdcIicpIHtcblx0XHRcdFx0bGV0IFt0b2tlbiwgYWZ0ZXJRdW90ZV0gPSB0aGlzLm1hdGNoVGV4dCh0ZXh0LCBjdXJyZW50LCBlbmQpIHx8IFtdO1xuXHRcdFx0XHRjdXJyZW50ID0gYWZ0ZXJRdW90ZTtcblx0XHRcdFx0Y29udGludWU7XHQvLyBjb250aW51ZSBzbyB3ZSBkb24ndCBhZGQgMSB0byBjdXJlbnQgYmVsb3dcblx0XHRcdH1cblx0XHRcdC8vIElmIGJhY2tzbGFzaCwgc2tpcCBhbiBleHRyYSBjaGFyIGlmIGl0J3MgZWl0aGVyIGRlbGltaXRlciBvciBhIHF1b3RlXG5cdFx0XHRlbHNlIGlmIChjaGFyID09PSBcIlxcXFxcIikge1xuXHRcdFx0XHRjaGFyID0gdGV4dFtjdXJyZW50ICsgMV07XG5cdFx0XHRcdGlmIChjaGFyID09PSBzdGFydERlbGltaXRlclxuXHRcdFx0XHQgfHwgY2hhciA9PT0gZW5kRGVsaW1pdGVyXG5cdFx0XHRcdCB8fCBjaGFyID09PSBcIidcIlxuXHRcdFx0XHQgfHwgY2hhciA9PT0gJ1wiJ1xuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHRjdXJyZW50Kys7O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50Kys7XG5cdFx0fVxuXHR9LFxuXG5cblx0Ly8gUmV0dXJuIHRoZSBpbmRleCBvZiB0aGUgZmlyc3QgTk9OLUVTQ0FQRUQgY2hhcmFjdGVyIGluIGBjaGFyc2AgYWZ0ZXIgYHRleHRbc3RhcnRdYC5cblx0Ly8gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiB3ZSBkaWRuJ3QgZmluZCBhIG1hdGNoLlxuLy9URVNUTUVcblx0ZmluZEZpcnN0QXRIZWFkKGNoYXJzLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0d2hpbGUgKHN0YXJ0IDwgZW5kKSB7XG5cdFx0XHRsZXQgY2hhciA9IHRleHRbc3RhcnRdO1xuXHRcdFx0aWYgKGNoYXJzLmluY2x1ZGVzKGNoYXIpKSByZXR1cm4gc3RhcnQ7XG5cdFx0XHQvLyBpZiB3ZSBnb3QgYW4gZXNjYXBlIGNoYXIsIGlnbm9yZSB0aGUgbmV4dCBjaGFyIGlmIGl0J3MgaW4gYGNoYXJzYFxuXHRcdFx0aWYgKGNoYXIgPT09IFwiXFxcXFwiICYmIGNoYXJzLmluY2x1ZGVzKHRleHRbc3RhcnQrMV0pKSBzdGFydCsrO1xuXHRcdFx0c3RhcnQrKztcblx0XHR9XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gc3RhcnQ7XG5cdH0sXG5cblxuLy9cbi8vICMjIyBVdGlsaXR5XG4vL1xuXG5cdC8vIEdpdmVuIGEgc2V0IG9mIHRva2Vucywgc2xpY2Ugd2hpdGVzcGFjZSAoaW5kZW50LCBORVdMSU5FIG9yIG5vcm1hbCB3aGl0ZXNwYWNlKSBmcm9tIHRoZSBmcm9udC5cblx0cmVtb3ZlTGVhZGluZ1doaXRlc3BhY2UodG9rZW5zLCBzdGFydCA9IDApIHtcblx0XHR3aGlsZSAodG9rZW5zW3N0YXJ0XSBpbnN0YW5jZW9mIFRva2VuaXplci5XaGl0ZXNwYWNlKSBzdGFydCsrO1xuXHRcdGlmIChzdGFydCA9PT0gMCkgcmV0dXJuIHRva2Vucztcblx0XHRyZXR1cm4gdG9rZW5zLnNsaWNlKHN0YXJ0KTtcblx0fSxcblxuXHQvLyBHaXZlbiBhIHNldCBvZiB0b2tlbnMsIHJlbW92ZSBBTEwgXCJub3JtYWxcIiB3aGl0ZXNwYWNlIHRva2VucyAoTk9UIGluZGVudCBvciBORVdMSU5FKS5cblx0cmVtb3ZlTm9ybWFsV2hpdGVzcGFjZSh0b2tlbnMpIHtcblx0XHRyZXR1cm4gdG9rZW5zLmZpbHRlcih0b2tlbiA9PiAhVG9rZW5pemVyLmlzTm9ybWFsV2hpdGVzcGFjZSh0b2tlbikpO1xuXHR9LFxuXG5cblx0Ly8gUmV0dXJuIGB0cnVlYCBpZiBgdG9rZW5gIGlzIFwibm9ybWFsXCIgd2hpdGVzcGNlIChub3QgYSBuZXdsaW5lIG9yIGluZGVudClcblx0aXNOb3JtYWxXaGl0ZXNwYWNlKHRva2VuKSB7XG5cdFx0cmV0dXJuIHRva2VuIGluc3RhbmNlb2YgVG9rZW5pemVyLldoaXRlc3BhY2Vcblx0XHRcdCYmICEodG9rZW4gaW5zdGFuY2VvZiBUb2tlbml6ZXIuSW5kZW50KVxuXHRcdFx0JiYgKHRva2VuICE9PSBUb2tlbml6ZXIuTkVXTElORSk7XG5cdH0sXG5cblxuLy9cbi8vICMjIyBCbG9jayAvIGluZGVudCBwcm9jZXNzaW5nXG4vL1xuXG5cdC8vIFNpbXBsZSBibG9jayBjbGFzcyBmb3IgYGJyZWFrSW50b0Jsb2Nrc2AuXG5cdEJsb2NrOiBjbGFzcyBibG9jayB7XG5cdFx0Y29uc3RydWN0b3IocHJvcHMpe1xuXHRcdFx0T2JqZWN0LmFzc2lnbih0aGlzLCBwcm9wcyk7XG5cdFx0XHRpZiAoIXRoaXMuY29udGVudHMpIHRoaXMuY29udGVudHMgPSBbXTtcblx0XHR9XG5cblx0XHR0b1N0cmluZygpIHtcblx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLCBudWxsLCBcIlxcdFwiKTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gQnJlYWsgdG9rZW5zIGludG8gYW4gYXJyYXkgb2YgYXJyYXlzIGJ5IGBORVdMSU5FYHMuXG5cdC8vIFJldHVybnMgYW4gYXJyYXkgb2YgbGluZXMgV0lUSE9VVCB0aGUgYE5FV0xJTkVgcy5cblx0Ly8gTGluZXMgd2hpY2ggYXJlIGNvbXBvc2VkIHNvbGVseSBvZiB3aGl0ZXNwYWNlIGFyZSB0cmVhdGVkIGFzIGJsYW5rLlxuXHRicmVha0ludG9MaW5lcyh0b2tlbnMpIHtcblx0XHQvLyBDb252ZXJ0IHRvIGxpbmVzLlxuXHRcdGxldCBjdXJyZW50TGluZSA9IFtdO1xuXHRcdGxldCBsaW5lcyA9IFtjdXJyZW50TGluZV07XG5cdFx0dG9rZW5zLmZvckVhY2godG9rZW4gPT4ge1xuXHRcdFx0Ly8gYWRkIG5ldyBhcnJheSBmb3IgZWFjaCBuZXdsaW5lXG5cdFx0XHRpZiAodG9rZW4gPT09IFRva2VuaXplci5ORVdMSU5FKSB7XG5cdFx0XHRcdC8vIGNyZWF0ZSBhIG5ldyBsaW5lIGFuZCBwdXNoIGl0IGluXG5cdFx0XHRcdGN1cnJlbnRMaW5lID0gW107XG5cdFx0XHRcdHJldHVybiBsaW5lcy5wdXNoKGN1cnJlbnRMaW5lKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gb3RoZXJ3aXNlIGp1c3QgYWRkIHRvIHRoZSBjdXJyZW50IGxpbmVcblx0XHRcdGN1cnJlbnRMaW5lLnB1c2godG9rZW4pO1xuXHRcdH0pO1xuXG5cdFx0Ly8gQ2xlYXIgYW55IGxpbmVzIHRoYXQgYXJlIG9ubHkgd2hpdGVzcGFjZVxuXHRcdGxpbmVzLmZvckVhY2goKGxpbmUsIGluZGV4KSA9PiB7XG5cdFx0XHRpZiAobGluZS5sZW5ndGggPT09IDEgJiYgbGluZVswXSBpbnN0YW5jZW9mIFRva2VuaXplci5XaGl0ZXNwYWNlKSBsaW5lc1tpbmRleF0gPSBbXTtcblx0XHR9KTtcblxuXHRcdHJldHVybiBsaW5lcztcblx0fSxcblxuXHQvLyBSZXR1cm4gaW5kZW50cyBvZiB0aGUgc3BlY2lmaWVkIGxpbmVzLlxuXHQvLyBJbmRlbnRzIGVtcHR5IGxpbmVzIChORVdMSU5FcykgaW50byB0aGUgYmxvY2sgQUZURVIgdGhleSBhcHBlYXIuXG5cdGdldExpbmVJbmRlbnRzKGxpbmVzLCBkZWZhdWx0SW5kZW50ID0gMCkge1xuXHRcdGlmIChsaW5lcy5sZW5ndGggPT09IDApIHJldHVybiBbXTtcblxuXHRcdGNvbnN0IGluZGVudHMgPSBsaW5lcy5tYXAoVG9rZW5pemVyLmdldExpbmVJbmRlbnQpO1xuXHRcdGNvbnN0IGVuZCA9IGluZGVudHMubGVuZ3RoO1xuXG5cdFx0Ly8gZmlndXJlIG91dCB0aGUgaW5kZW50IG9mIHRoZSBmaXJzdCBub24tZW1wdHkgbGluZVxuXHRcdGxldCBzdGFydEluZGVudCA9IGdldE5leHRJbmRlbnQoMCk7XG5cdFx0aWYgKHN0YXJ0SW5kZW50ID09PSB1bmRlZmluZWQpIHN0YXJ0SW5kZW50ID0gZGVmYXVsdEluZGVudDtcblxuXHRcdC8vIGluZGVudCBibGFuayBsaW5lcyB0byB0aGUgaW5kZW50IEFGVEVSIHRoZW1cblx0XHRmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgZW5kOyBpbmRleCsrKSB7XG5cdFx0XHRpZiAoaW5kZW50c1tpbmRleF0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRpbmRlbnRzW2luZGV4XSA9IGdldE5leHRJbmRlbnQoaW5kZXggKyAxKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGluZGVudHM7XG5cblx0XHQvLyBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBORVhUIG5vbi11bmRlZmluZWQgaW5kZW50LlxuXHRcdGZ1bmN0aW9uIGdldE5leHRJbmRlbnQoaW5kZXgpIHtcblx0XHRcdHdoaWxlIChpbmRleCA8IGVuZCkge1xuXHRcdFx0XHRpZiAoaW5kZW50c1tpbmRleF0gIT09IHVuZGVmaW5lZCkgcmV0dXJuIGluZGVudHNbaW5kZXhdO1xuXHRcdFx0XHRpbmRleCsrO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHN0YXJ0SW5kZW50O1xuXHRcdH1cblx0fSxcblxuXG5cdC8vIFJldHVybiB0aGUgaW5kZW50IG9mIGEgbGluZSBvZiB0b2tlbnMuXG5cdC8vIFJldHVybnMgYDBgIGlmIG5vdCBpbmRlbnRlZC5cblx0Ly8gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiBhIGJsYW5rIGxpbmUuXG5cdGdldExpbmVJbmRlbnQobGluZSkge1xuXHRcdGlmICghbGluZSB8fCBsaW5lLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRpZiAobGluZVswXSBpbnN0YW5jZW9mIFRva2VuaXplci5JbmRlbnQpIHJldHVybiBsaW5lWzBdLmxlbmd0aDtcblx0XHRyZXR1cm4gMDtcblx0fSxcblxuXHQvLyBCcmVhayBgdG9rZW5zYCBiZXR3ZWVuIGBzdGFydGAgYW5kIGBlbmRgIGludG8gYSBgVG9rZW5pemVyLkJsb2NrYCB3aXRoIG5lc3RlZCBgY29udGVudHNgLlxuXHQvLyBTa2lwcyBcIm5vcm1hbFwiIHdoaXRlc3BhY2UgYW5kIGluZGVudHMgaW4gdGhlIHJlc3VsdHMuXG5cdGJyZWFrSW50b0Jsb2NrczogZnVuY3Rpb24odG9rZW5zLCBzdGFydCA9IDAsIGVuZCA9IHRva2Vucy5sZW5ndGgpIHtcblx0XHQvLyByZXN0cmljdCB0byB0b2tlbnMgb2YgaW50ZXJlc3Rcblx0XHR0b2tlbnMgPSB0b2tlbnMuc2xpY2Uoc3RhcnQsIGVuZCk7XG5cdFx0Ly8gcmVtb3ZlIFwibm9ybWFsXCIgd2hpdGVzcGFjZVxuLy9UT0RPOiBiZXR0ZXIgdG8gbGVhdmUgdGhpcyB0byBjb25zdW1lcnM/Pz9cblx0XHR0b2tlbnMgPSBUb2tlbml6ZXIucmVtb3ZlTm9ybWFsV2hpdGVzcGFjZSh0b2tlbnMpO1xuXG5cdFx0Ly8gYnJlYWsgaW50byBsaW5lcyAmIHJldHVybiBlYXJseSBpZiBubyBsaW5lc1xuXHRcdGxldCBsaW5lcyA9IFRva2VuaXplci5icmVha0ludG9MaW5lcyh0b2tlbnMpO1xuXHRcdGlmIChsaW5lcy5sZW5ndGggPT09IDApIHJldHVybiBbXTtcblxuXHRcdC8vIGZpZ3VyZSBvdXQgaW5kZW50c1xuXHRcdGxldCBpbmRlbnRzID0gVG9rZW5pemVyLmdldExpbmVJbmRlbnRzKGxpbmVzKTtcblxuXHRcdC8vIEZpcnN0IGJsb2NrIGlzIGF0IHRoZSBNSU5JTVVNIGluZGVudCBvZiBhbGwgbGluZXMhXG5cdFx0bGV0IG1heEluZGVudCA9IE1hdGgubWluLmFwcGx5KE1hdGgsIGluZGVudHMpO1xuXHRcdGxldCBibG9jayA9IG5ldyBUb2tlbml6ZXIuQmxvY2soeyBpbmRlbnQ6IG1heEluZGVudCB9KTtcblxuXHRcdC8vIHN0YWNrIG9mIGJsb2Nrc1xuXHRcdGxldCBzdGFjayA9IFtibG9ja107XG5cblx0XHRsaW5lcy5mb3JFYWNoKCAobGluZSwgaW5kZXgpID0+IHtcblx0XHRcdC8vIFJlbW92ZSBsZWFkaW5nIHdoaXRlc3BhY2UgKGVnOiBpbmRlbnRzKVxuXHRcdFx0bGluZSA9IFRva2VuaXplci5yZW1vdmVMZWFkaW5nV2hpdGVzcGFjZShsaW5lKTtcblxuXHRcdFx0bGV0IGxpbmVJbmRlbnQgPSBpbmRlbnRzW2luZGV4XTtcblx0XHRcdGxldCB0b3AgPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcblx0XHRcdC8vIElmIGluZGVudGluZywgcHVzaCBuZXcgYmxvY2socylcblx0XHRcdGlmIChsaW5lSW5kZW50ID4gdG9wLmluZGVudCkge1xuXHRcdFx0XHR3aGlsZSAobGluZUluZGVudCA+IHRvcC5pbmRlbnQpIHtcblx0XHRcdFx0XHR2YXIgbmV3QmxvY2sgPSBuZXcgVG9rZW5pemVyLkJsb2NrKHsgaW5kZW50OiB0b3AuaW5kZW50ICsgMSB9KTtcblx0XHRcdFx0XHR0b3AuY29udGVudHMucHVzaChuZXdCbG9jayk7XG5cdFx0XHRcdFx0c3RhY2sucHVzaChuZXdCbG9jayk7XG5cblx0XHRcdFx0XHR0b3AgPSBuZXdCbG9jaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Ly8gSWYgb3V0ZGVudGluZzogcG9wIGJsb2NrKHMpXG5cdFx0XHRlbHNlIGlmIChsaW5lSW5kZW50IDwgdG9wLmluZGVudCkge1xuXHRcdFx0XHR3aGlsZSAobGluZUluZGVudCA8IHRvcC5pbmRlbnQpIHtcblx0XHRcdFx0XHRzdGFjay5wb3AoKTtcblx0XHRcdFx0XHR0b3AgPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Ly8gYWRkIHRvIHRvcCBibG9ja1xuXHRcdFx0dG9wLmNvbnRlbnRzLnB1c2gobGluZSk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gYmxvY2s7XG5cdH0sXG5cblxuXG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IFRva2VuaXplcjtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9Ub2tlbml6ZXIuanMiLCJpbXBvcnQgZ2xvYmFsIGZyb20gXCIuL2dsb2JhbFwiO1xuXG4vLyBSZXR1cm4gdHJ1ZSBpZiB0ZXh0IGlzIGFsbCB3aGl0ZXNwYWNlLCBpbmNsdWRpbmcgZW1wdHkgc3RyaW5nLlxubGV0IEFMTF9XSElURVNQQUNFID0gL15cXHMqJC87XG5leHBvcnQgZnVuY3Rpb24gaXNXaGl0ZXNwYWNlKHRleHQpIHtcblx0cmV0dXJuIEFMTF9XSElURVNQQUNFLnRlc3QodGV4dClcbn1cblxuLy8gUmV0dXJuIHRoZSBwbHVyYWwgb2YgYHdvcmRgLlxuLy8gTk9URTogdGhpcyBpcyBub3QgdmVyeSBnb29kIGF0IGFsbCEhIVxuLy8gVE9ETzogZXhjZXB0aW9ucywgZXRjLlxuZXhwb3J0IGZ1bmN0aW9uIHBsdXJhbGl6ZSh3b3JkKSB7XG5cdHJldHVybiB3b3JkICsgXCJzXCI7XG59XG5cbi8vIFJldHVybiB0cnVlIGlmIHdvcmQgaXMgYSBwbHVyYWwuXG4vLyBOT1RFOiBmb3Igd29yZHMgd2hpY2ggYXJlIEJPVEggc2luZ3VsYXIgYW5kIHBsdXJhbCwgdGhpcyB3aWxsIHJldHVybiB0cnVlLlxuZXhwb3J0IGZ1bmN0aW9uIGlzUGx1cmFsKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQgPT09IHBsdXJhbGl6ZSh3b3JkKTtcbn1cblxuXG4vLyBSZXR1cm4gdGhlIHNpbmd1bGFyIG9mIGB3b3JkYC5cbi8vIE5PVEU6IHRoaXMgaXMgbm90IHZlcnkgZ29vZCBhdCBhbGwhISFcbi8vIFRPRE86IGV4Y2VwdGlvbnMsIGV0Yy5cbmV4cG9ydCBmdW5jdGlvbiBzaW5ndWxhcml6ZSh3b3JkKSB7XG5cdHJldHVybiB3b3JkLnJlcGxhY2UoL2U/cyQvLCBcIlwiKTtcbn1cblxuLy8gUmV0dXJuIHRydWUgaWYgd29yZCBpcyBhIHNpbmd1bGFyLlxuLy8gTk9URTogZm9yIHdvcmRzIHdoaWNoIGFyZSBCT1RIIHNpbmd1bGFyIGFuZCBwbHVyYWwsIHRoaXMgd2lsbCByZXR1cm4gdHJ1ZS5cbmV4cG9ydCBmdW5jdGlvbiBpc1Npbmd1bGFyKHdvcmQpIHtcblx0cmV0dXJuIHdvcmQgPT09IHNpbmd1bGFyaXplKHdvcmQpO1xufVxuXG5cbi8vIFJldHVybiBhIGNlcnRhaW4gYG51bWJlcmAgb2YgdGFiIGNoYXJhY3RlcnMuXG5jb25zdCBUQUJTID0gXCJcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcXHRcIjtcbmV4cG9ydCBmdW5jdGlvbiBnZXRUYWJzKG51bWJlcikge1xuXHRpZiAodHlwZW9mIG51bWJlciAhPT0gXCJudW1iZXJcIikgcmV0dXJuIFwiXCI7XG5cdHJldHVybiBUQUJTLnN1YnN0cigwLCBudW1iZXIpO1xufVxuXG5cbi8vIEV4cG9ydCBhbGwgYXMgYSBsdW1wXG5sZXQgYWxsRXhwb3J0cyA9IHsuLi5leHBvcnRzfTtcbmV4cG9ydCBkZWZhdWx0IGFsbEV4cG9ydHM7XG5cbi8vIERFQlVHOiBwdXQgb24gZ2xvYmFsIGZvciBkZWJ1Z2dpbmcuXG5nbG9iYWwuU1RSSU5HID0gYWxsRXhwb3J0cztcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy91dGlscy9zdHJpbmcuanMiXSwic291cmNlUm9vdCI6IiJ9