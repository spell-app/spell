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
		key: "getRule",


		// Return ALL instances of named rule, for us and our imports.
		value: function getRule(ruleName) {
			var rules = [];
			var imports = this.imports,
			    index = 0,
			    parser = void 0;
			while (parser = imports[index++]) {
				if (parser._rules[ruleName]) rules.push(parser._rules[ruleName]);
			}
			return rules;
		}

		// Return the concatenated blacklist for a given rule.

	}, {
		key: "getBlacklist",
		value: function getBlacklist(ruleName) {
			var rules = this.getRule(ruleName);
			return rules.reduce(function (blacklist, rule) {
				return Object.assign(blacklist, rule.blacklist);
			}, {});
		}

		// Add a `rule` to our list of rules!
		// Converts to `alternatives` on re-defining the same rule.

	}, {
		key: "addRule",
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

// NOTE: this is NOT a block statement... ???
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
parser.addStatement("list_empty", "(empty|clear) {list:expression}", function (_Rule$Statement5) {
	_inherits(list_empty, _Rule$Statement5);

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
}(_Rule2.default.Statement));

// Remove one item from list by position.
//TESTME
parser.addStatement("list_remove_position", "remove {identifier} {number:expression} of {list:expression}", function (_Rule$Statement6) {
	_inherits(list_remove_position, _Rule$Statement6);

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
}(_Rule2.default.Statement));

// Remove range of things from list.
// NOTE: `start` is **1-based**.
// NOTE: `end` is inclusive!
//TESTME
parser.addStatement("list_remove_range", "remove {identifier} {start:expression} to {end:expression} of {list:expression}", function (_Rule$Statement7) {
	_inherits(list_remove_position, _Rule$Statement7);

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
}(_Rule2.default.Statement));

// Remove all instances of something from a list.
//TESTME
parser.addStatement("list_remove", "remove {thing:expression} from {list:expression}", function (_Rule$Statement8) {
	_inherits(list_remove, _Rule$Statement8);

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
}(_Rule2.default.Statement));

// Remove all items from list where condition is true.
// NOTE: we will singularize `identifier` and use that as the argument to `expression`.
//TESTME
parser.addStatement("list_remove_where", "remove {identifier} (in|of|from) {list:expression} where {condition:expression}", function (_Rule$Statement9) {
	_inherits(list_remove_where, _Rule$Statement9);

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
}(_Rule2.default.Statement));

//
//	Random (in-place) list manipulation.
//

// Reverse list in-place.
//TESTME
parser.addStatement("list_reverse", "reverse {list:expression}", function (_Rule$Statement10) {
	_inherits(list_reverse, _Rule$Statement10);

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
}(_Rule2.default.Statement));

// Shuffle list in-place.
//TESTME
parser.addStatement("list_shuffle", "(randomize|shuffle) {list:expression}", function (_Rule$Statement11) {
	_inherits(list_shuffle, _Rule$Statement11);

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
}(_Rule2.default.Statement));

// Iteration
//TESTME
parser.addStatement("list_iteration", ["for (each)? {itemVar:identifier} in {list:expression}:? {statement}?", "for (each)? {itemVar:identifier} (and|,) {positionVar:identifier} in {list:expression}:? {statement}?"], function (_Rule$BlockStatement) {
	_inherits(list_iteration, _Rule$BlockStatement);

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
			    list = _getMatchedSource23.list,
			    statement = _getMatchedSource23.statement,
			    block = _getMatchedSource23.block;

			var output = void 0;
			if (positionVar) {
				output = "for (let " + positionVar + " = 1, bar; " + itemVar + " = " + list + "[" + positionVar + "-1], " + positionVar + " <= " + list + ".length; " + positionVar + "++) ";
			} else {
				// NOTE: this is relatively slow...  probably doesn't matter...
				output = "for (let " + itemVar + " of " + list + ") ";
			}
			output += _Rule2.default.Block.encloseStatements(statement, block);
			return output;
		}
	}]);

	return list_iteration;
}(_Rule2.default.BlockStatement));

// Range
//TESTME
parser.addExpression("range_expression", "range {start:expression} to {end:expression}", function (_Rule$Expression10) {
	_inherits(range_expression, _Rule$Expression10);

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
parser.addStatement(["assignment", "MUTATOR"], ["{thing:expression} = {value:expression}", "set {thing:expression} to {value:expression}", "put {value:expression} into {thing:expression}"], function (_Rule$Statement2) {
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
parser.addStatement(["get_expression", "MUTATOR"], "get {value:expression}", function (_Rule$Statement3) {
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

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

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
parser.addStatement(["define_type", "MUTATOR"], "define type {name:type} (?:as (a|an) {superType:type})?", function (_Rule$BlockStatement) {
	_inherits(define_type, _Rule$BlockStatement);

	function define_type() {
		_classCallCheck(this, define_type);

		return _possibleConstructorReturn(this, (define_type.__proto__ || Object.getPrototypeOf(define_type)).apply(this, arguments));
	}

	_createClass(define_type, [{
		key: "toStructure",


		// Return a logical representation of the data structure
		value: function toStructure(context) {
			var _getMatchedSource = this.getMatchedSource(context),
			    name = _getMatchedSource.name,
			    superType = _getMatchedSource.superType;

			var block = this.block && this.block.matched || [];

			var slots = {};
			var properties = [];
			var methods = [];
			var other = [];
			block.map(function (statement) {
				return statement.toStructure(context);
			}).filter(Boolean).forEach(addStructure);

			return {
				type: "class",
				name: name,
				superType: superType,
				slots: slots,
				properties: properties,
				methods: methods,
				other: other
			};

			function addStructure(structure) {
				// add arrays as individual items
				if (Array.isArray(structure)) return structure.forEach(addStructure);

				// add under `slots` for quick hit of all significant bits...
				if (structure.name) slots[structure.name] = structure;

				switch (structure.type) {
					case "property":
					case "shared property":
					case "constant":
					case "getter":
					case "setter":
						properties.push(structure);
						break;

					case "method":
					case "event":
					case "action":
						methods.push(structure);
						break;

					default:
						other.push(structure);
				}
			}
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource2 = this.getMatchedSource(context),
			    name = _getMatchedSource2.name,
			    superType = _getMatchedSource2.superType,
			    block = _getMatchedSource2.block;

			// DEBUG


			console.info("TYPE STRUCTURE:", this.toStructure(context));

			var output = "class " + name;
			if (superType) output += " extends " + superType;
			output += " " + _RuleSyntax2.default.Block.encloseStatements(block);
			return output;
		}
	}]);

	return define_type;
}(_RuleSyntax2.default.BlockStatement));

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
			var _getMatchedSource3 = this.getMatchedSource(context),
			    type = _getMatchedSource3.type,
			    _getMatchedSource3$pr = _getMatchedSource3.props,
			    props = _getMatchedSource3$pr === undefined ? "" : _getMatchedSource3$pr;
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


// Declare instance method or normal function.
parser.addStatement(["declare_method", "MUTATOR"], "(operator:to|on) {name:identifier} {args}? (\\:)? {statement}?", function (_Rule$BlockStatement2) {
	_inherits(declare_method, _Rule$BlockStatement2);

	function declare_method() {
		_classCallCheck(this, declare_method);

		return _possibleConstructorReturn(this, (declare_method.__proto__ || Object.getPrototypeOf(declare_method)).apply(this, arguments));
	}

	_createClass(declare_method, [{
		key: "toStructure",

		// Return a logical representation of the data structure
		value: function toStructure(context) {
			var _getMatchedSource4 = this.getMatchedSource(context),
			    operator = _getMatchedSource4.operator,
			    name = _getMatchedSource4.name,
			    _getMatchedSource4$ar = _getMatchedSource4.args,
			    args = _getMatchedSource4$ar === undefined ? [] : _getMatchedSource4$ar;

			var type = operator === "to" ? "method" : "event";
			return { type: type, name: name, args: args };
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource5 = this.getMatchedSource(context),
			    name = _getMatchedSource5.name,
			    _getMatchedSource5$ar = _getMatchedSource5.args,
			    args = _getMatchedSource5$ar === undefined ? [] : _getMatchedSource5$ar,
			    statement = _getMatchedSource5.statement,
			    block = _getMatchedSource5.block;

			var output = name + "(" + args.join(", ") + ") ";
			output += _RuleSyntax2.default.Block.encloseStatements(statement, block);
			return output;
		}
	}]);

	return declare_method;
}(_RuleSyntax2.default.BlockStatement));

// Declare "action", which can be called globally and affects the parser.
// TODO: `with` clause (will conflict with `word`)
// TODO: install in parser somehow
// TODO: create instance function?  or maybe we don't need it:
//			`action turn Card over` for an instance is just `turn me over`
//			`action add card to deck` => `add me to deck`
//TESTME
parser.addStatement(["declare_action", "MUTATOR"], "action (keywords:{word}|{type})+ (\\:)? {statement}?", function (_Rule$BlockStatement3) {
	_inherits(declare_action, _Rule$BlockStatement3);

	function declare_action() {
		_classCallCheck(this, declare_action);

		return _possibleConstructorReturn(this, (declare_action.__proto__ || Object.getPrototypeOf(declare_action)).apply(this, arguments));
	}

	_createClass(declare_action, [{
		key: "getMatchedSource",


		// Add `name`, `args` and `types` to matched source
		value: function getMatchedSource(context) {
			var output = _get(declare_action.prototype.__proto__ || Object.getPrototypeOf(declare_action.prototype), "getMatchedSource", this).call(this, context);

			// if there's only one keyword, it can't be a blacklisted identifier or a type
			var keywords = output.keywords;

			var keywordMatches = this.results.keywords.matched;
			if (keywords.length === 1) {
				var keyword = keywords[0];
				if (keywordMatches[0] instanceof _RuleSyntax2.default.Type) {
					console.error("parse('declare_action'): one-word actions may not be types: " + keyword);
				}

				// HACK: `global.parser` is a hack here for convenience in testing...
				var _parser = context && context.parser || _global2.default.parser;
				var blacklist = _parser.getBlacklist("identifier");
				if (blacklist[keyword]) {
					console.error("parse('declare_action'): one-word actions may not be blacklisted identifiers\": " + keyword);
				}
			}

			// figure out arguments and/or types
			output.args = [];
			output.types = {};

			// if any of the words are types (capital letter) make that an argument of the same name.
			keywordMatches.map(function (item, index) {
				if (item instanceof _RuleSyntax2.default.Type) {
					var Type = keywords[index];
					var type = Type.toLowerCase();

					output.types[type] = Type;
					output.args.push(type);

					// replace with lowercase in method name
					keywords[index] = type;
				}
			});
			// get static method name and arguments for output
			output.name = keywords.join("_");
			return output;
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource6 = this.getMatchedSource(context),
			    name = _getMatchedSource6.name,
			    _getMatchedSource6$ar = _getMatchedSource6.args,
			    args = _getMatchedSource6$ar === undefined ? [] : _getMatchedSource6$ar,
			    types = _getMatchedSource6.types,
			    statement = _getMatchedSource6.statement,
			    block = _getMatchedSource6.block;

			// figure out if there are any conditions due to known argument types


			var conditions = [];
			for (var arg in types) {
				conditions.push("\tif (!spell.isA(" + arg + ", " + types[arg] + ")) return undefined");
			}

			var statements = _RuleSyntax2.default.Block.encloseStatements(conditions, statement, block);

			// Create as a STATIC function
			//TODO: create as an instance function we can call on ourself!
			return "static " + name + "(" + args.join(", ") + ") " + statements;
		}
	}, {
		key: "toStructure",
		value: function toStructure(context) {
			var _getMatchedSource7 = this.getMatchedSource(context),
			    name = _getMatchedSource7.name,
			    args = _getMatchedSource7.args,
			    types = _getMatchedSource7.types;

			return { type: "action", name: name, args: args, types: types };
		}
	}]);

	return declare_action;
}(_RuleSyntax2.default.BlockStatement));

// Getter either with or without arguments.
// If you specify arguments, yields a normal function which returns a value.
parser.addStatement(["getter", "MUTATOR"], "get {name:identifier} (\\:)? {expression}?", function (_Rule$BlockStatement4) {
	_inherits(getter, _Rule$BlockStatement4);

	function getter() {
		_classCallCheck(this, getter);

		return _possibleConstructorReturn(this, (getter.__proto__ || Object.getPrototypeOf(getter)).apply(this, arguments));
	}

	_createClass(getter, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource8 = this.getMatchedSource(context),
			    name = _getMatchedSource8.name,
			    expression = _getMatchedSource8.expression,
			    block = _getMatchedSource8.block;
			// If they specified an inline-expression, prepend return


			if (expression && !expression.startsWith("return ")) expression = "return (" + expression + ")";
			var output = "get " + name + "() ";
			output += _RuleSyntax2.default.Block.encloseStatements(expression, block);
			return output;
		}

		// Return a logical representation of the data structure

	}, {
		key: "toStructure",
		value: function toStructure(context) {
			var _getMatchedSource9 = this.getMatchedSource(context),
			    name = _getMatchedSource9.name;

			return { type: "getter", name: name };
		}
	}]);

	return getter;
}(_RuleSyntax2.default.BlockStatement));

// Setter.
// Complains if you specify more than one argument.
// If you don't pass an explicit argument, we'll assume it's the same as the identifier.
// eg;	`set color: set the color of my text to color`
//
// TODO: internal getter/setter semantics ala objective C
//			`set color: if color is in ["red", "blue"] then set my color to color`
//		 => `my color` within setter should automatically translate to `this._color` ???
parser.addStatement(["setter", "MUTATOR"], "set {name:identifier} {args}? (\\:)? {statement}?", function (_Rule$BlockStatement5) {
	_inherits(setter, _Rule$BlockStatement5);

	function setter() {
		_classCallCheck(this, setter);

		return _possibleConstructorReturn(this, (setter.__proto__ || Object.getPrototypeOf(setter)).apply(this, arguments));
	}

	_createClass(setter, [{
		key: "toSource",
		value: function toSource(context) {
			// default args to the setter name
			var _getMatchedSource10 = this.getMatchedSource(context),
			    name = _getMatchedSource10.name,
			    _getMatchedSource10$a = _getMatchedSource10.args,
			    args = _getMatchedSource10$a === undefined ? [name] : _getMatchedSource10$a,
			    statement = _getMatchedSource10.statement,
			    block = _getMatchedSource10.block;
			// Complain if more than one argument


			if (args && args.length > 1) {
				console.warn("parse('setter'): only one argument allowed in setter:  ", this.matchedText);
				args = [args[0]];
			}
			var output = "set " + name + "(" + args + ") ";
			output += _RuleSyntax2.default.Block.encloseStatements(statement, block);
			return output;
		}

		// Return a logical representation of the data structure

	}, {
		key: "toStructure",
		value: function toStructure(context) {
			var _getMatchedSource11 = this.getMatchedSource(context),
			    name = _getMatchedSource11.name;

			return { type: "setter", name: name };
		}
	}]);

	return setter;
}(_RuleSyntax2.default.BlockStatement));

//
//	declare properties
//

//TODO: another name for `constant` ?
parser.addStatement(["declare_property", "MUTATOR"], "(scope:property|constant|shared property) {name:identifier} (?:= {value:expression})?", function (_Rule$Statement) {
	_inherits(declare_property, _Rule$Statement);

	function declare_property() {
		_classCallCheck(this, declare_property);

		return _possibleConstructorReturn(this, (declare_property.__proto__ || Object.getPrototypeOf(declare_property)).apply(this, arguments));
	}

	_createClass(declare_property, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource12 = this.getMatchedSource(context),
			    scope = _getMatchedSource12.scope,
			    name = _getMatchedSource12.name,
			    _getMatchedSource12$v = _getMatchedSource12.value,
			    value = _getMatchedSource12$v === undefined ? "" : _getMatchedSource12$v;

			if (value) value = " = " + value;

			var declaration = "" + name + value;
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

		// Return a logical representation of the data structure

	}, {
		key: "toStructure",
		value: function toStructure(context) {
			var _getMatchedSource13 = this.getMatchedSource(context),
			    scope = _getMatchedSource13.scope,
			    name = _getMatchedSource13.name;

			return { type: "property", name: name, scope: scope };
		}
	}]);

	return declare_property;
}(_RuleSyntax2.default.Statement));

// TODO: scope_modifier???
// TODO: initial value
parser.addStatement(["declare_property_of_type", "MUTATOR"], "property {name:identifier} as (a|an)? {type}", function (_Rule$Statement2) {
	_inherits(declare_property_of_type, _Rule$Statement2);

	function declare_property_of_type() {
		_classCallCheck(this, declare_property_of_type);

		return _possibleConstructorReturn(this, (declare_property_of_type.__proto__ || Object.getPrototypeOf(declare_property_of_type)).apply(this, arguments));
	}

	_createClass(declare_property_of_type, [{
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource14 = this.getMatchedSource(context),
			    name = _getMatchedSource14.name,
			    type = _getMatchedSource14.type;

			return "get " + name + "() { return this.__" + name + " }\n" + ("set " + name + "(value) { if (spell.isA(value, " + type + ") this.__" + name + " = value }");
		}

		// Return a logical representation of the data structure

	}, {
		key: "toStructure",
		value: function toStructure(context) {
			var _getMatchedSource15 = this.getMatchedSource(context),
			    name = _getMatchedSource15.name,
			    type = _getMatchedSource15.type;

			return { type: "setter", name: name, dataType: type };
		}
	}]);

	return declare_property_of_type;
}(_RuleSyntax2.default.Statement));

// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
parser.addStatement(["declare_property_as_one_of", "MUTATOR"], "property {name:identifier} as one of {list:literal_list}", function (_Rule$Statement3) {
	_inherits(declare_property_as_one_of, _Rule$Statement3);

	function declare_property_as_one_of() {
		_classCallCheck(this, declare_property_as_one_of);

		return _possibleConstructorReturn(this, (declare_property_as_one_of.__proto__ || Object.getPrototypeOf(declare_property_as_one_of)).apply(this, arguments));
	}

	_createClass(declare_property_as_one_of, [{
		key: "getMatchedSource",
		value: function getMatchedSource(context) {
			var output = _get(declare_property_as_one_of.prototype.__proto__ || Object.getPrototypeOf(declare_property_as_one_of.prototype), "getMatchedSource", this).call(this, context);
			output.plural = (0, _string.pluralize)(output.name);
			return output;
		}
	}, {
		key: "toSource",
		value: function toSource(context) {
			var _getMatchedSource16 = this.getMatchedSource(context),
			    name = _getMatchedSource16.name,
			    plural = _getMatchedSource16.plural,
			    list = _getMatchedSource16.list;

			return "@proto " + plural + " = " + list + "\n" + ("get " + name + "() { return this.__" + name + " === undefined ? this." + plural + "[0] : this.__" + name + " }\n") + ("set " + name + "(value) { if (this." + plural + ".includes(value)) this.__" + name + " = value }");

			// MORE EFFICIENT BUT UGLIER
			// 			return `static ${plural} = ${list};\n`
			// 				 + `get ${name} { return ("__${name}" in this ? this.__${name} : ${firstValue}) }\n`
			// 				 + `set ${name}(value) { if (this.constructor.${plural}.includes(value)) this.__${name} = value }`;
		}

		// Return a logical representation of the data structure

	}, {
		key: "toStructure",
		value: function toStructure(context) {
			var _getMatchedSource17 = this.getMatchedSource(context),
			    name = _getMatchedSource17.name,
			    plural = _getMatchedSource17.plural;

			return [{ type: "property", name: name }, { type: "shared property", name: plural }];
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
			var _getMatchedSource18 = this.getMatchedSource(context),
			    expression = _getMatchedSource18.expression,
			    properties = _getMatchedSource18.properties;

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
			var _getMatchedSource19 = this.getMatchedSource(context),
			    identifier = _getMatchedSource19.identifier;

			return "this." + identifier;
		}
	}]);

	return my_property_expression;
}(_RuleSyntax2.default.Expression));

//
//	Utility
//


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
			if (Array.isArray(ruleSyntax)) return ruleSyntax.map(function (syntax) {
				return _this.addSequence(name, syntax, constructor, properties);
			})[0];

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
			if (Array.isArray(ruleSyntax)) return ruleSyntax.map(function (syntax) {
				return _this2.addStatement(name, syntax, constructor, properties);
			})[0];

			var rule = this.addSequence(name, ruleSyntax, constructor, properties);
			if (rule) return this.addRule("statement", rule);
		} },

	addExpression: { value: function value(name, ruleSyntax) {
			var _this3 = this;

			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.Expression;
			var properties = arguments[3];

			// Add a bunch of syntaxes at once if we got an array of syntaxes
			if (Array.isArray(ruleSyntax)) return ruleSyntax.map(function (syntax) {
				return _this3.addExpression(name, syntax, constructor, properties);
			})[0];

			var rule = this.addSequence(name, ruleSyntax, constructor, properties);
			if (rule) return this.addRule("expression", rule);
		} },

	addList: { value: function value(name, ruleSyntax) {
			var _this4 = this;

			var constructor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _Rule2.default.List;
			var properties = arguments[3];

			// Add a bunch of syntaxes at once if we got an array of syntaxes
			if (Array.isArray(ruleSyntax)) return ruleSyntax.map(function (syntax) {
				return _this4.addList(name, syntax, constructor, properties);
			})[0];

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
			if (Array.isArray(ruleSyntax)) return ruleSyntax.map(function (syntax) {
				return _this5.addKeyword(name, syntax, constructor, properties);
			})[0];

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
			if (Array.isArray(ruleSyntax)) return ruleSyntax.map(function (syntax) {
				return _this6.addSymbol(name, syntax, constructor, properties);
			})[0];

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
		// ## output as structure:
		//

	}, {
		key: "toStructure",
		value: function toStructure(context) {
			return undefined;
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
						if (_block !== undefined) matched.push(_block);
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
			var block = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.matched;

			var results = [],
			    statement = void 0;

			for (var i = 0; i < block.length; i++) {
				var _match4 = block[i];
				//console.info(i, match);
				try {
					statement = _match4.toSource(context) || "";
				} catch (e) {
					console.error(e);
					console.warn("Error converting block: ", block, "statement:", _match4);
				}
				//console.info(i, statement);
				if ((0, _string.isWhitespace)(statement)) {
					results.push("");
				} else if (Array.isArray(statement)) {
					results = results.concat(statement);
				} else if (typeof statement === "string") {
					statement = statement.split("\n");
					results = results.concat(statement);
				} else {
					console.warn("blockToSource(): DON'T KNOW HOW TO WORK WITH\n\t", statement, "\n\tfrom match", _match4);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2tleXMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL3N0b3JlLmpzIiwid2VicGFjazovLy8uL3NyYy91dGlscy9nbG9iYWwuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL34vZmJqcy9saWIvZW1wdHlGdW5jdGlvbi5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvfi9mYmpzL2xpYi9pbnZhcmlhbnQuanMiLCJ3ZWJwYWNrOi8vLy4vfi9jc3MtbG9hZGVyL2xpYi9jc3MtYmFzZS5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL2xpYi9SZWFjdFByb3BUeXBlc1NlY3JldC5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvfi9mYmpzL2xpYi93YXJuaW5nLmpzIiwid2VicGFjazovLy8uL3NyYy9QYXJzZXIuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2V2ZW50X2hhbmRsZXJzLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvbWF0Y2hfa2V5cy5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL3BhcnNlX2tleXMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9zdHlsZS1sb2FkZXIvYWRkU3R5bGVzLmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BlbGxFZGl0b3IuanN4Iiwid2VicGFjazovLy8uL3NyYy9pbmRleC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL0V4YW1wbGVTdG9yZS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL1NwYWNlci5qc3giLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9UYWJiYWJsZVRleHRBcmVhLmpzeCIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL3V0aWwuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lbW9pemUuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL0pTWC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvYWxsLmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9pZi5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvbGlzdHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3J1bGVzL29wZXJhdG9ycy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvc3RhdGVtZW50cy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvcnVsZXMvdHlwZXMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9TcGFjZXIubGVzcyIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL3N0eWxlcy5sZXNzIiwid2VicGFjazovLy8uL34vcHJvcC10eXBlcy9jaGVja1Byb3BUeXBlcy5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvZmFjdG9yeVdpdGhUaHJvd2luZ1NoaW1zLmpzIiwid2VicGFjazovLy8uL34vcHJvcC10eXBlcy9mYWN0b3J5V2l0aFR5cGVDaGVja2Vycy5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvZGVjb3JhdG9ycy9jbGFzc19kZWNvcmF0b3IuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvbWV0aG9kX2RlY29yYXRvci5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvZGVjb3JhdG9ycy9tZXRob2RfZGVjb3JhdG9yX3Njb3BlZC5qcyIsIndlYnBhY2s6Ly8vLi9+L3JlYWN0LWtleWRvd24vZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9hcnJheS5mcm9tLmpzIiwid2VicGFjazovLy8uL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvZG9tX2hlbHBlcnMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9saXN0ZW5lcnMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi91dWlkLmpzIiwid2VicGFjazovLy8uL3NyYy9SdWxlU3ludGF4LmpzIiwid2VicGFjazovLy8uL3NyYy9ydWxlcy9jb3JlLmpzIiwid2VicGFjazovLy8uL3NyYy9SdWxlLmpzIiwid2VicGFjazovLy8uL34vc3R5bGUtbG9hZGVyL2ZpeFVybHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9TcGFjZXIubGVzcz8yMmFlIiwid2VicGFjazovLy8uL3NyYy9hcHAvc3R5bGVzLmxlc3M/YjAxMiIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL2luZGV4LmpzeCIsIndlYnBhY2s6Ly8vLi9zcmMvVG9rZW5pemVyLmpzIiwid2VicGFjazovLy8uL3NyYy91dGlscy9zdHJpbmcuanMiXSwibmFtZXMiOlsiZ2xvYmFsX2lkZW50aWZpZXIiLCJnbG9iYWwiLCJ3aW5kb3ciLCJzZWxmIiwiY29uc29sZSIsImdyb3VwIiwibG9nIiwiZ3JvdXBFbmQiLCJQYXJzZXIiLCJwcm9wZXJ0aWVzIiwiVG9rZW56aWVyIiwiX3J1bGVzIiwiT2JqZWN0IiwiYXNzaWduIiwicnVsZU5hbWUiLCJ0ZXh0IiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiVElNRSIsInRpbWUiLCJ0b2tlbnMiLCJ0b2tlbml6ZSIsImZpbHRlciIsImlzTm9ybWFsV2hpdGVzcGFjZSIsInRva2VuIiwidGltZUVuZCIsInVuZGVmaW5lZCIsInJlbW92ZUxlYWRpbmdXaGl0ZXNwYWNlIiwicmVzdWx0IiwicGFyc2VSdWxlT3JEaWUiLCJwYXJzZSIsIlN5bnRheEVycm9yIiwidG9Tb3VyY2UiLCJzdGFydCIsImVuZCIsInN0YWNrIiwiY2FsbGluZ0NvbnRleHQiLCJydWxlRm91bmQiLCJpbXBvcnRzIiwiaW5kZXgiLCJwYXJzZXIiLCJyZXN1bHRzIiwicnVsZSIsInB1c2giLCJyZWR1Y2UiLCJsYXJnZXN0IiwibmV4dCIsIm5leHRTdGFydCIsInRlc3QiLCJuZXh0UnVsZSIsIl9pbXBvcnRzIiwiY29uY2F0IiwicmV2ZXJzZSIsIl9faW1wb3J0cyIsInJ1bGVzIiwiZ2V0UnVsZSIsImJsYWNrbGlzdCIsIl9fcnVsZXMiLCJBcnJheSIsImlzQXJyYXkiLCJmb3JFYWNoIiwiYWRkUnVsZSIsImV4aXN0aW5nIiwiQWx0ZXJuYXRpdmVzIiwiREVCVUciLCJhcmd1bWVudCIsInJ1bGVJc0xlZnRSZWN1cnNpdmUiLCJTZXF1ZW5jZSIsIlR5cGVFcnJvciIsInRlc3RSdWxlIiwiaW5mbyIsImxlZnRSZWN1cnNpdmUiLCJtYXAiLCJnZXRDb250ZXh0T3JEaWUiLCJvdXRwdXQiLCJhbHRlcm5hdGl2ZXMiLCJhbHRlcm5hdGl2ZSIsImNvbnRleHROYW1lIiwiUkVHSVNUUlkiLCJzdWJydWxlIiwib3B0aW9uYWwiLCJTdWJydWxlIiwic3RhcnRUb2tlbiIsImVuZFRva2VuIiwibmVzdGluZyIsIm5lc3RlZCIsImxhc3RJbmRleCIsInNsaWNlIiwic3RyaW5nIiwic3BsaXQiLCJjaGFyIiwibGlzdCIsIlJFR0VYUF9TUEVDSUFMX0NIQVJBQ1RFUlMiLCJqb2luIiwiZmxhZ3MiLCJSZWdFeHAiLCJlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzIiwiV0FSTiIsImNoYXJzIiwiU3BlbGxFZGl0b3IiLCJwcm9wcyIsImV4YW1wbGVzIiwibG9hZCIsInNwZWxsRWRpdG9yIiwic2F2ZSIsInJldmVydCIsImNvbXBpbGUiLCJjcmVhdGUiLCJkZWxldGUiLCJyZW5hbWUiLCJkdXBsaWNhdGUiLCJyZXNldCIsInRpdGxlcyIsInNlbGVjdGVkIiwiZGlydHkiLCJjb2RlIiwib3B0aW9ucyIsInZhbHVlIiwidGl0bGUiLCJjb250ZW50Iiwib25DbGljayIsInNlbGVjdCIsImRpcnR5QnV0dG9ucyIsInBvc2l0aW9uIiwicmlnaHQiLCJ0b3AiLCJtYXJnaW4iLCJjb21waWxlQnV0dG9uIiwid2lkdGgiLCJsZWZ0IiwiaGVpZ2h0IiwicGFkZGluZ1RvcCIsImV2ZW50IiwidXBkYXRlIiwidGFyZ2V0IiwiQ29tcG9uZW50IiwiZGVmYXVsdFByb3BzIiwiVG9rZW5pemVyIiwiUnVsZSIsImV4cG9ydHMiLCJiaW5kIiwiRXhhbXBsZVN0b3JlIiwibG9jYWxTdG9yYWdlIiwic3BlbGxFZGl0b3JFeGFtcGxlcyIsInNwZWxsRWRpdG9yRXhhbXBsZSIsImxvY2F0aW9uIiwicmVsb2FkIiwiSlNPTiIsIl9zYXZlZEV4YW1wbGVzIiwic3RyaW5naWZ5IiwiZXhhbXBsZSIsImtleXMiLCJuYW1lIiwic2tpcFNhdmUiLCJzaG93Q29uZmlybSIsImNvbmZpcm0iLCJwcm9tcHQiLCJvbGROYW1lIiwibmV3TmFtZSIsIndhcm4iLCJzZXRUaW1lb3V0IiwiU3BhY2VyIiwiY2xhc3NOYW1lIiwiYXBwZWFyYW5jZSIsInNpemUiLCJpbmxpbmUiLCJmbHVpZCIsInRpbnkiLCJzbWFsbCIsIm1lZGl1bSIsImxhcmdlIiwiaHVnZSIsIm1hc3NpdmUiLCJzcGFjZXJQcm9wcyIsInN0eWxlIiwicHJvcFR5cGVzIiwibnVtYmVyIiwiYm9vbCIsIlRhYmJhYmxlVGV4dEFyZWEiLCJvbktleURvd24iLCJrZXlDb2RlIiwicHJldmVudERlZmF1bHQiLCJlbGVtZW50Iiwic2VsZWN0aW9uU3RhcnQiLCJzZWxlY3Rpb25FbmQiLCJuZXdUZXh0Iiwic2hpZnRLZXkiLCJsYXN0SW5kZXhPZiIsImluZGV4T2YiLCJsaW5lcyIsImxpbmUiLCJzdWJzdHIiLCJvbkNoYW5nZSIsImNsYXNzTmFtZXMiLCJhcmdzIiwiYXJnIiwia2V5IiwiQm9vbGVhbiIsIm1lbW9pemVkIiwiZGVmaW5lTWVtb2l6ZWQiLCJwcm9wZXJ0eSIsImdldHRlciIsImFwcGx5IiwiZGVmaW5lUHJvcGVydHkiLCJjb25maWd1cmFibGUiLCJnZXQiLCJmb3JDb250ZXh0IiwiSlNYIiwiSlNYRWxlbWVudCIsImNsb25lIiwibWF0Y2hlZCIsImNvbnRleHQiLCJqc3hFbGVtZW50IiwiYXR0cmlidXRlcyIsImF0dHJzIiwiSlNYRXhwcmVzc2lvbiIsImpzeEV4cHJlc3Npb25Ub1NvdXJjZSIsImNoaWxkcmVuIiwiY2hpbGQiLCJ0cmltIiwiY2hpbGRTb3VyY2UiLCJqc3hFbGVtZW50VG9Tb3VyY2UiLCJqc3hFeHByZXNzaW9uIiwidGFnTmFtZSIsImF0dHJzVG9Tb3VyY2UiLCJjaGlsZHJlblRvU291cmNlIiwiaW1wb3J0IiwiYWRkU3RhdGVtZW50IiwiZ2V0TWF0Y2hlZFNvdXJjZSIsImNvbmRpdGlvbiIsInN0YXRlbWVudCIsImJsb2NrIiwic3RhdGVtZW50cyIsIkJsb2NrIiwiZW5jbG9zZVN0YXRlbWVudHMiLCJCbG9ja1N0YXRlbWVudCIsIk1hdGNoIiwibWF0Y2giLCJlbHNlU3RhdGVtZW50IiwiU3RhdGVtZW50IiwiYWRkRXhwcmVzc2lvbiIsImlkZW50aWZpZXIiLCJ0aGluZyIsIm9yZGluYWwiLCJLZXl3b3JkIiwiYWRkS2V5d29yZCIsImV4cHJlc3Npb24iLCJFeHByZXNzaW9uIiwib3BlcmF0b3IiLCJiYW5nIiwiaXRlbSIsIml0ZW1WYXIiLCJwb3NpdGlvblZhciIsImxocyIsInJocyIsInRvSlMiLCJwcmVjZWRlbmNlIiwiYSIsImIiLCJ0eXBlIiwiYWRkU3ltYm9sIiwiU3ltYm9sIiwibWVzc2FnZSIsIm9rQnV0dG9uIiwiY2FuY2VsQnV0dG9uIiwic3VwZXJUeXBlIiwic2xvdHMiLCJtZXRob2RzIiwib3RoZXIiLCJ0b1N0cnVjdHVyZSIsImFkZFN0cnVjdHVyZSIsInN0cnVjdHVyZSIsImFkZFNlcXVlbmNlIiwia2V5d29yZHMiLCJrZXl3b3JkTWF0Y2hlcyIsImtleXdvcmQiLCJUeXBlIiwiZXJyb3IiLCJnZXRCbGFja2xpc3QiLCJ0eXBlcyIsInRvTG93ZXJDYXNlIiwiY29uZGl0aW9ucyIsInN0YXJ0c1dpdGgiLCJtYXRjaGVkVGV4dCIsInNjb3BlIiwiZGVjbGFyYXRpb24iLCJkYXRhVHlwZSIsInBsdXJhbCIsImFkZExpc3QiLCJwcm9wIiwiTGlzdCIsInBhcnNlUnVsZVN5bnRheCIsInN5bnRheCIsIlNlcXVlbmNlQ29uc3RydWN0b3IiLCJzeW50YXhTdHJlYW0iLCJ0b2tlbmlzZVJ1bGVTeW50YXgiLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW5zIiwiU1lOVEFYX0VYUFJFU1NJT04iLCJwYXJzZVJ1bGVTeW50YXhfdG9rZW4iLCJsYXN0IiwicG9wIiwic3ludGF4VG9rZW4iLCJwYXJzZVJ1bGVTeW50YXhfc3ltYm9sIiwicGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUiLCJwYXJzZVJ1bGVTeW50YXhfcGFyZW50aGVzZXMiLCJwYXJzZVJ1bGVTeW50YXhfbGlzdCIsInBhcnNlUnVsZVN5bnRheF9yZXBlYXQiLCJLRVlXT1JEX1BBVFRFUk4iLCJwYXJzZVJ1bGVTeW50YXhfa2V5d29yZCIsImNvbnN0cnVjdG9yIiwiaSIsImlzRXNjYXBlZCIsInRvU3RyaW5nIiwiZmluZE5lc3RlZFRva2VucyIsInByb21vdGUiLCJncm91cEFsdGVybmF0aXZlcyIsImN1cnJlbnQiLCJzeW1ib2wiLCJSZXBlYXQiLCJwYXJhbXMiLCJiYW5nUG9zaXRpb24iLCJub3QiLCJkZWxpbWl0ZXIiLCJkZWZpbmVQcm9wZXJ0aWVzIiwicHJvdG90eXBlIiwicnVsZVN5bnRheCIsImUiLCJzdHJlYW0iLCJTdGF0ZW1lbnRzIiwiQ29tbWVudCIsIldvcmQiLCJyZXBsYWNlIiwiUGF0dGVybiIsInBhdHRlcm4iLCJJZGVudGlmaWVyIiwiYWRkVG9CbGFja2xpc3QiLCJOdW1iZXIiLCJOVU1CRVJfTkFNRVMiLCJ6ZXJvIiwib25lIiwidHdvIiwidGhyZWUiLCJmb3VyIiwiZml2ZSIsInNpeCIsInNldmVuIiwiZWlnaHQiLCJuaW5lIiwidGVuIiwiVGV4dCIsInF1b3RlZFN0cmluZyIsImVuZHNXaXRoIiwid29yZHMiLCJ3b3JkIiwiaGVhZFN0YXJ0c1dpdGgiLCJtYXRjaERlbGltaXRlciIsIm1hdGNoU3RhcnQiLCJtYXRjaGVzIiwic29tZSIsInNvdXJjZSIsImluY2x1ZGVzIiwiX2FkZFJlc3VsdHMiLCJhcmdOYW1lIiwiY29tbWVudCIsImJlc3RNYXRjaCIsImdldEJlc3RNYXRjaCIsImJlc3QiLCJpc0NvbXBvdW5kUnVsZSIsIkJsYW5rTGluZSIsIlN0YXRlbWVudFBhcnNlRXJyb3IiLCJwYXJzZWQiLCJ1bnBhcnNlZCIsIndoaXRlc3BhY2UiLCJpbmRlbnQiLCJjb250ZW50cyIsInBhcnNlQmxvY2siLCJwYXJzZVN0YXRlbWVudCIsIldoaXRlc3BhY2UiLCJibG9ja1RvU291cmNlIiwiYnJlYWtJbnRvQmxvY2tzIiwicmVuZGVyIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIm5ld2xpbmUiLCJJbmRlbnQiLCJORVdMSU5FIiwiZWF0VG9rZW5zIiwibWF0Y2hUb3BUb2tlbnMiLCJtZXRob2QiLCJjYWxsIiwibWF0Y2hXaGl0ZXNwYWNlIiwibWF0Y2hXb3JkIiwibWF0Y2hOdW1iZXIiLCJtYXRjaE5ld2xpbmUiLCJtYXRjaEpTWEVsZW1lbnQiLCJtYXRjaFRleHQiLCJtYXRjaENvbW1lbnQiLCJtYXRjaFN5bWJvbCIsImVhdFdoaXRlc3BhY2UiLCJ3aGl0ZVNwYWNlRW5kIiwid2hpdGVzcGFjZUVuZCIsIldPUkRfU1RBUlQiLCJXT1JEX0NIQVIiLCJ3b3JkRW5kIiwiTlVNQkVSX1NUQVJUIiwiTlVNQkVSIiwibnVtYmVyTWF0Y2giLCJtYXRjaEV4cHJlc3Npb25BdEhlYWQiLCJudW1iZXJTdHIiLCJwYXJzZUZsb2F0IiwicXVvdGVTeW1ib2wiLCJ0ZXh0RW5kIiwiQ09NTUVOVCIsImNvbW1lbnRTdGFydCIsImdldExpbmVBdEhlYWQiLCJjb21tZW50TWF0Y2giLCJjb21tZW50U3ltYm9sIiwibWF0Y2hKU1hTdGFydFRhZyIsImlzVW5hcnlUYWciLCJtYXRjaEpTWENoaWxkcmVuIiwiY2hpbGRFbmQiLCJKU1hfVEFHX1NUQVJUIiwidGFnTWF0Y2giLCJlbmRCaXQiLCJtYXRjaEpTWEF0dHJpYnV0ZSIsImF0dHJFbmQiLCJhdHRyc0FzU3RyaW5nIiwiY2hpbGRyZW5Bc1N0cmluZyIsImF0dHIiLCJlbmRUYWciLCJtYXRjaEpTWENoaWxkIiwibWF0Y2hKU1hFbmRUYWciLCJtYXRjaEpTWEV4cHJlc3Npb24iLCJtYXRjaEpTWFRleHQiLCJtYXRjaFN0cmluZ0F0SGVhZCIsIkpTWF9BVFRSSUJVVEVfU1RBUlQiLCJlcXVhbHMiLCJhdHRyaWJ1dGUiLCJKU1hBdHRyaWJ1dGUiLCJtYXRjaEpTWEF0dHJpYnV0ZVZhbHVlIiwidmFsdWVFbmQiLCJtYXRjaEpTWEF0dHJpYnV0ZVZhbHVlSWRlbnRpZmllciIsImVuZEluZGV4IiwiZmluZE1hdGNoaW5nQXRIZWFkIiwiSlNYX1RFWFRfRU5EX0NIQVJTIiwiZmluZEZpcnN0QXRIZWFkIiwianN4VGV4dCIsInN0cmluZ0VuZCIsImhlYWQiLCJzdGFydERlbGltaXRlciIsImVuZERlbGltaXRlciIsImFmdGVyUXVvdGUiLCJyZW1vdmVOb3JtYWxXaGl0ZXNwYWNlIiwiYnJlYWtJbnRvTGluZXMiLCJjdXJyZW50TGluZSIsImdldExpbmVJbmRlbnRzIiwiZGVmYXVsdEluZGVudCIsImluZGVudHMiLCJnZXRMaW5lSW5kZW50Iiwic3RhcnRJbmRlbnQiLCJnZXROZXh0SW5kZW50IiwibWF4SW5kZW50IiwiTWF0aCIsIm1pbiIsImxpbmVJbmRlbnQiLCJuZXdCbG9jayIsImlzV2hpdGVzcGFjZSIsInBsdXJhbGl6ZSIsImlzUGx1cmFsIiwic2luZ3VsYXJpemUiLCJpc1Npbmd1bGFyIiwiZ2V0VGFicyIsIkFMTF9XSElURVNQQUNFIiwiVEFCUyIsImFsbEV4cG9ydHMiLCJTVFJJTkciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTtBQUFBLG9HQUFvRyxtQkFBbUIsRUFBRSxtQkFBbUIsOEhBQThIOztBQUUxUTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0E7QUFDQSxDQUFDOztB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QTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRUFBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBOztBQUVBO0FBQ0E7QUFDQSxFQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxFQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSx1REFBdUQ7QUFDdkQ7O0FBRUEsNkJBQTZCLG1CQUFtQjs7QUFFaEQ7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ2xUQTs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBRUE7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUdxQjJGLFcsV0FlbkIsNEJBQVEsUUFBUixDLFVBR0EsNEJBQVEsUUFBUixDLFVBR0EsNEJBQVEsUUFBUixDLFVBR0EsNEJBQVEsUUFBUixDLFVBR0EsNEJBQVEsUUFBUixDOzs7QUF0QkQsc0JBQVlDLEtBQVosRUFBbUI7QUFBQTs7QUFBQSx3SEFDWkEs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OztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSwwQ0FBMEM7O0FBRTFDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLFFBQVE7QUFDckIsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDViw2QkFBNkI7QUFDN0IsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0JBQStCLEtBQUs7QUFDcEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCw0QkFBNEI7QUFDNUIsT0FBTztBQUNQO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUIsc0JBQXNCO0FBQzNDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EscUJBQXFCLDJCQUEyQjtBQUNoRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FB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QTs7QUFFRDtBQUNBO0FBQ0E7QUFDTyxTQUFTb2MsU0FBVCxDQUFtQmxILElBQW5CLEVBQXlCO0FBQy9CLFFBQU9BLE9BQU8sR0FBZDtBQUNBOztBQUVEO0FBQ0E7QUFDTyxTQUFTbUgsUUFBVCxDQUFrQm5ILElBQWxCLEVBQXdCO0FBQzlCLFFBQU9BLFNBQVNrSCxVQUFVbEgsSUFBVixDQUFoQjtBQUNBOztBQUdEO0FBQ0E7QUFDQTtBQUNPLFNBQVNvSCxXQUFULENBQXFCcEgsSUFBckIsRUFBMkI7QUFDakMsUUFBT0EsS0FBS3RCLE9BQUwsQ0FBYSxNQUFiLEVBQXFCLEVBQXJCLENBQVA7QUFDQTs7QUFFRDtBQUNBO0FBQ08sU0FBUzJJLFVBQVQsQ0FBb0JySCxJQUFwQixFQUEwQjtBQUNoQyxRQUFPQSxTQUFTb0gsWUFBWXBILElBQVosQ0FBaEI7QUFDQTs7QUFHRDtBQUNBLElBQU13SCxPQUFPLHNFQUFiO0FBQ08sU0FBU0YsT0FBVCxDQUFpQnZTLE1BQWpCLEVBQXlCO0FBQy9CLEtBQUksT0FBT0EsTUFBUCxLQUFrQixRQUF0QixFQUFnQyxPQUFPLEVBQVA7QUFDaEMsUUFBT3lTLEtBQUsxUixNQUFMLENBQVksQ0FBWixFQUFlZixNQUFmLENBQVA7QUFDQTs7QUFHRDtBQUNBLElBQUkwUywwQkFBaUIvVSxPQUFqQixDQUFKO2tCQUNlK1UsVTs7QUFFZjs7QUFDQSxpQkFBT0MsTUFBUCxHQUFnQkQsVUFBaEIsQyIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbi8vIFRPRE86IE5lZWQgYmV0dGVyLCBtb3JlIGNvbXBsZXRlLCBhbmQgbW9yZSBtZXRob2RpY2FsIGtleSBkZWZpbml0aW9uc1xuXG52YXIgS2V5cyA9IHtcbiAgYmFja3NwYWNlOiA4LFxuICBkZWw6IDQ2LFxuICBkZWxldGU6IDQ2LFxuICB0YWI6IDksXG4gIGVudGVyOiAxMyxcbiAgJ3JldHVybic6IDEzLFxuICBlc2M6IDI3LFxuICBzcGFjZTogMzIsXG4gIGxlZnQ6IDM3LFxuICB1cDogMzgsXG4gIHJpZ2h0OiAzOSxcbiAgZG93bjogNDAsXG4gICc7JzogMTg2LFxuICAnPSc6IDE4NyxcbiAgJywnOiAxODgsXG4gICctJzogMTg5LFxuICAnLic6IDE5MCxcbiAgJy8nOiAxOTEsXG4gICdgJzogMTkyLFxuICAnWyc6IDIxOSxcbiAgJ1xcXFwnOiAyMjAsXG4gICddJzogMjIxXG59O1xuXG4vLyBBZGQgdXBwZXJjYXNlIHZlcnNpb25zIG9mIGtleXMgYWJvdmUgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG5PYmplY3Qua2V5cyhLZXlzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgcmV0dXJuIEtleXNba2V5LnRvVXBwZXJDYXNlKCldID0gS2V5c1trZXldO1xufSk7XG5cbicwMTIzNDU2Nzg5Jy5zcGxpdCgnJykuZm9yRWFjaChmdW5jdGlvbiAobnVtLCBpbmRleCkge1xuICByZXR1cm4gS2V5c1tudW1dID0gaW5kZXggKyA0ODtcbn0pO1xuXG4nQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVonLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uIChsZXR0ZXIsIGluZGV4KSB7XG4gIEtleXNbbGV0dGVyXSA9IGluZGV4ICsgNjU7XG4gIEtleXNbbGV0dGVyLnRvTG93ZXJDYXNlKCldID0gaW5kZXggKyA2NTtcbn0pO1xuXG4vLyBmbiBrZXlzXG5bMSwgMiwgMywgNCwgNSwgNiwgNywgOCwgOSwgMTAsIDExLCAxMl0uZm9yRWFjaChmdW5jdGlvbiAoaXRlbSwgaW5kZXgpIHtcbiAgcmV0dXJuIEtleXNbJ2YnICsgaW5kZXhdID0gMTExICsgaW5kZXg7XG59KTtcblxuZXhwb3J0IHZhciBtb2RpZmllcnMgPSB7XG4gIGNvbnRyb2w6ICdjdHJsJyxcbiAgY3RybDogJ2N0cmwnLFxuICBzaGlmdDogJ3NoaWZ0JyxcbiAgbWV0YTogJ21ldGEnLFxuICBjbWQ6ICdtZXRhJyxcbiAgY29tbWFuZDogJ21ldGEnLFxuICBvcHRpb246ICdhbHQnLFxuICBhbHQ6ICdhbHQnXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gYWxsS2V5cyhhcmcpIHtcbiAgcmV0dXJuIGFyZyA/IGFyZy5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sIHx8ICh0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihhcmcpKSA9PT0gJ3N5bWJvbCcgOiBTeW1ib2woJ2FsbEtleXMnKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgS2V5cztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9saWIva2V5cy5qc1xuLy8gbW9kdWxlIGlkID0gMTA1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsInZhciBfc2xpY2VkVG9BcnJheSA9IGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gc2xpY2VJdGVyYXRvcihhcnIsIGkpIHsgdmFyIF9hcnIgPSBbXTsgdmFyIF9uID0gdHJ1ZTsgdmFyIF9kID0gZmFsc2U7IHZhciBfZSA9IHVuZGVmaW5lZDsgdHJ5IHsgZm9yICh2YXIgX2kgPSBhcnJbU3ltYm9sLml0ZXJhdG9yXSgpLCBfczsgIShfbiA9IChfcyA9IF9pLm5leHQoKSkuZG9uZSk7IF9uID0gdHJ1ZSkgeyBfYXJyLnB1c2goX3MudmFsdWUpOyBpZiAoaSAmJiBfYXJyLmxlbmd0aCA9PT0gaSkgYnJlYWs7IH0gfSBjYXRjaCAoZXJyKSB7IF9kID0gdHJ1ZTsgX2UgPSBlcnI7IH0gZmluYWxseSB7IHRyeSB7IGlmICghX24gJiYgX2lbXCJyZXR1cm5cIl0pIF9pW1wicmV0dXJuXCJdKCk7IH0gZmluYWxseSB7IGlmIChfZCkgdGhyb3cgX2U7IH0gfSByZXR1cm4gX2FycjsgfSByZXR1cm4gZnVuY3Rpb24gKGFyciwgaSkgeyBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7IHJldHVybiBhcnI7IH0gZWxzZSBpZiAoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdChhcnIpKSB7IHJldHVybiBzbGljZUl0ZXJhdG9yKGFyciwgaSk7IH0gZWxzZSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIGF0dGVtcHQgdG8gZGVzdHJ1Y3R1cmUgbm9uLWl0ZXJhYmxlIGluc3RhbmNlXCIpOyB9IH07IH0oKTtcblxuZnVuY3Rpb24gX3RvQ29uc3VtYWJsZUFycmF5KGFycikgeyBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7IGZvciAodmFyIGkgPSAwLCBhcnIyID0gQXJyYXkoYXJyLmxlbmd0aCk7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHsgYXJyMltpXSA9IGFycltpXTsgfSByZXR1cm4gYXJyMjsgfSBlbHNlIHsgcmV0dXJuIEFycmF5LmZyb20oYXJyKTsgfSB9XG5cbi8qKlxuICogQG1vZHVsZSBzdG9yZVxuICpcbiAqL1xuaW1wb3J0IHsgYWxsS2V5cyB9IGZyb20gJy4vbGliL2tleXMnO1xuaW1wb3J0IG1hdGNoS2V5cyBmcm9tICcuL2xpYi9tYXRjaF9rZXlzJztcbmltcG9ydCBwYXJzZUtleXMgZnJvbSAnLi9saWIvcGFyc2Vfa2V5cyc7XG5pbXBvcnQgdXVpZCBmcm9tICcuL2xpYi91dWlkJztcblxuLyoqXG4gKiBwcml2YXRlXG4gKiBcbiAqL1xuXG4vLyBkaWN0IGZvciBjbGFzcyBwcm90b3R5cGVzID0+IGJpbmRpbmdzXG52YXIgX2hhbmRsZXJzID0gbmV3IE1hcCgpO1xuXG4vLyBhbGwgbW91bnRlZCBpbnN0YW5jZXMgdGhhdCBoYXZlIGtleWJpbmRpbmdzXG52YXIgX2luc3RhbmNlcyA9IG5ldyBTZXQoKTtcblxuLy8gZm9yIHRlc3RpbmdcbmV4cG9ydCBmdW5jdGlvbiBfcmVzZXRTdG9yZSgpIHtcbiAgX2hhbmRsZXJzLmNsZWFyKCk7XG4gIF9pbnN0YW5jZXMuY2xlYXIoKTtcbn1cblxuLyoqXG4gKiBwdWJsaWNcbiAqXG4gKi9cblxudmFyIFN0b3JlID0ge1xuXG4gIC8qKlxuICAgKiBhY3RpdmF0ZVxuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgSW5zdGFudGlhdGVkIGNsYXNzIHRoYXQgZXh0ZW5kZWQgUmVhY3QuQ29tcG9uZW50LCB0byBiZSBmb2N1c2VkIHRvIHJlY2VpdmUga2V5ZG93biBldmVudHNcbiAgICovXG4gIGFjdGl2YXRlOiBmdW5jdGlvbiBhY3RpdmF0ZShpbnN0YW5jZXMpIHtcbiAgICB2YXIgaW5zdGFuY2VzQXJyYXkgPSBbXS5jb25jYXQoaW5zdGFuY2VzKTtcblxuICAgIC8vIGlmIG5vIGNvbXBvbmVudHMgd2VyZSBmb3VuZCBhcyBhbmNlc3RvcnMgb2YgdGhlIGV2ZW50IHRhcmdldCxcbiAgICAvLyBlZmZlY3RpdmVseSBkZWFjdGl2YXRlIGtleWRvd24gaGFuZGxpbmcgYnkgY2FwcGluZyB0aGUgc2V0IG9mIGluc3RhbmNlc1xuICAgIC8vIHdpdGggYG51bGxgLlxuICAgIGlmICghaW5zdGFuY2VzQXJyYXkubGVuZ3RoKSB7XG4gICAgICBfaW5zdGFuY2VzLmFkZChudWxsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgX2luc3RhbmNlcy5kZWxldGUobnVsbCk7XG5cbiAgICAgIC8vIGRlbGV0aW5nIGFuZCB0aGVuIGFkZGluZyB0aGUgaW5zdGFuY2UocykgaGFzIHRoZSBlZmZlY3Qgb2Ygc29ydGluZyB0aGUgc2V0XG4gICAgICAvLyBhY2NvcmRpbmcgdG8gaW5zdGFuY2UgYWN0aXZhdGlvbiAoYXNjZW5kaW5nKVxuICAgICAgaW5zdGFuY2VzQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgX2luc3RhbmNlcy5kZWxldGUoaW5zdGFuY2UpO1xuICAgICAgICBfaW5zdGFuY2VzLmFkZChpbnN0YW5jZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cblxuICAvKipcbiAgICogZGVsZXRlSW5zdGFuY2VcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBJbnN0YW50aWF0ZWQgY2xhc3MgdGhhdCBleHRlbmRlZCBSZWFjdC5Db21wb25lbnRcbiAgICogQHJldHVybiB7Ym9vbGVhbn0gVGhlIHZhbHVlIHNldC5oYXMoIHRhcmdldCApIHdvdWxkIGhhdmUgcmV0dXJuZWQgcHJpb3IgdG8gZGVsZXRpb25cbiAgICovXG4gIGRlbGV0ZUluc3RhbmNlOiBmdW5jdGlvbiBkZWxldGVJbnN0YW5jZSh0YXJnZXQpIHtcbiAgICBfaW5zdGFuY2VzLmRlbGV0ZSh0YXJnZXQpO1xuICB9LFxuICBmaW5kQmluZGluZ0ZvckV2ZW50OiBmdW5jdGlvbiBmaW5kQmluZGluZ0ZvckV2ZW50KGV2ZW50KSB7XG4gICAgaWYgKCFfaW5zdGFuY2VzLmhhcyhudWxsKSkge1xuICAgICAgdmFyIGtleU1hdGNoZXNFdmVudCA9IGZ1bmN0aW9uIGtleU1hdGNoZXNFdmVudChrZXlTZXQpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoS2V5cyh7IGtleVNldDoga2V5U2V0LCBldmVudDogZXZlbnQgfSk7XG4gICAgICB9O1xuXG4gICAgICAvLyBsb29wIHRocm91Z2ggaW5zdGFuY2VzIGluIHJldmVyc2UgYWN0aXZhdGlvbiBvcmRlciBzbyB0aGF0IG1vc3RcbiAgICAgIC8vIHJlY2VudGx5IGFjdGl2YXRlZCBpbnN0YW5jZSBnZXRzIGZpcnN0IGRpYnMgb24gZXZlbnRcbiAgICAgIHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZTtcbiAgICAgIHZhciBfZGlkSXRlcmF0b3JFcnJvciA9IGZhbHNlO1xuICAgICAgdmFyIF9pdGVyYXRvckVycm9yID0gdW5kZWZpbmVkO1xuXG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBfaXRlcmF0b3IgPSBbXS5jb25jYXQoX3RvQ29uc3VtYWJsZUFycmF5KF9pbnN0YW5jZXMpKS5yZXZlcnNlKClbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gKF9zdGVwID0gX2l0ZXJhdG9yLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlKSB7XG4gICAgICAgICAgdmFyIGluc3RhbmNlID0gX3N0ZXAudmFsdWU7XG5cbiAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmcoaW5zdGFuY2UuY29uc3RydWN0b3IucHJvdG90eXBlKTtcbiAgICAgICAgICB2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlO1xuICAgICAgICAgIHZhciBfZGlkSXRlcmF0b3JFcnJvcjIgPSBmYWxzZTtcbiAgICAgICAgICB2YXIgX2l0ZXJhdG9yRXJyb3IyID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZvciAodmFyIF9pdGVyYXRvcjIgPSBiaW5kaW5nc1tTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwMjsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IChfc3RlcDIgPSBfaXRlcmF0b3IyLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZSkge1xuICAgICAgICAgICAgICB2YXIgX3N0ZXAyJHZhbHVlID0gX3NsaWNlZFRvQXJyYXkoX3N0ZXAyLnZhbHVlLCAyKSxcbiAgICAgICAgICAgICAgICAgIGtleVNldHMgPSBfc3RlcDIkdmFsdWVbMF0sXG4gICAgICAgICAgICAgICAgICBmbiA9IF9zdGVwMiR2YWx1ZVsxXTtcblxuICAgICAgICAgICAgICBpZiAoYWxsS2V5cyhrZXlTZXRzKSB8fCBrZXlTZXRzLnNvbWUoa2V5TWF0Y2hlc0V2ZW50KSkge1xuICAgICAgICAgICAgICAgIC8vIHJldHVybiB3aGVuIG1hdGNoaW5nIGtleWJpbmRpbmcgaXMgZm91bmQgLSBpLmUuIG9ubHkgb25lXG4gICAgICAgICAgICAgICAgLy8ga2V5Ym91bmQgY29tcG9uZW50IGNhbiByZXNwb25kIHRvIGEgZ2l2ZW4ga2V5IGNvZGUuIHRvIGdldCBhcm91bmQgdGhpcyxcbiAgICAgICAgICAgICAgICAvLyBzY29wZSBhIGNvbW1vbiBhbmNlc3RvciBjb21wb25lbnQgY2xhc3Mgd2l0aCBAa2V5ZG93biBhbmQgdXNlXG4gICAgICAgICAgICAgICAgLy8gQGtleWRvd25TY29wZWQgdG8gYmluZCB0aGUgZHVwbGljYXRlIGtleXMgaW4geW91ciBjaGlsZCBjb21wb25lbnRzXG4gICAgICAgICAgICAgICAgLy8gKG9yIGp1c3QgaW5zcGVjdCBuZXh0UHJvcHMua2V5ZG93bi5ldmVudCkuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZm46IGZuLCBpbnN0YW5jZTogaW5zdGFuY2UgfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgX2RpZEl0ZXJhdG9yRXJyb3IyID0gdHJ1ZTtcbiAgICAgICAgICAgIF9pdGVyYXRvckVycm9yMiA9IGVycjtcbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiAmJiBfaXRlcmF0b3IyLnJldHVybikge1xuICAgICAgICAgICAgICAgIF9pdGVyYXRvcjIucmV0dXJuKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgIGlmIChfZGlkSXRlcmF0b3JFcnJvcjIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBfaXRlcmF0b3JFcnJvcjI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBfZGlkSXRlcmF0b3JFcnJvciA9IHRydWU7XG4gICAgICAgIF9pdGVyYXRvckVycm9yID0gZXJyO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gJiYgX2l0ZXJhdG9yLnJldHVybikge1xuICAgICAgICAgICAgX2l0ZXJhdG9yLnJldHVybigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICBpZiAoX2RpZEl0ZXJhdG9yRXJyb3IpIHtcbiAgICAgICAgICAgIHRocm93IF9pdGVyYXRvckVycm9yO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBnZXRCaW5kaW5nXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgQ2xhc3MgdXNlZCBhcyBrZXkgaW4gZGljdCBvZiBrZXkgYmluZGluZ3NcbiAgICogQHJldHVybiB7b2JqZWN0fSBUaGUgb2JqZWN0IGNvbnRhaW5pbmcgYmluZGluZ3MgZm9yIHRoZSBnaXZlbiBjbGFzc1xuICAgKi9cbiAgZ2V0QmluZGluZzogZnVuY3Rpb24gZ2V0QmluZGluZyhfcmVmKSB7XG4gICAgdmFyIF9fcmVhY3RLZXlkb3duVVVJRCA9IF9yZWYuX19yZWFjdEtleWRvd25VVUlEO1xuXG4gICAgcmV0dXJuIF9oYW5kbGVycy5nZXQoX19yZWFjdEtleWRvd25VVUlEKTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBnZXRJbnN0YW5jZXNcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICogQHJldHVybiB7c2V0fSBBbGwgc3RvcmVkIGluc3RhbmNlcyAoYWxsIG1vdW50ZWQgY29tcG9uZW50IGluc3RhbmNlcyB3aXRoIGtleWJpbmRpbmdzKVxuICAgKi9cbiAgZ2V0SW5zdGFuY2VzOiBmdW5jdGlvbiBnZXRJbnN0YW5jZXMoKSB7XG4gICAgcmV0dXJuIF9pbnN0YW5jZXM7XG4gIH0sXG5cblxuICAvKipcbiAgICogaXNFbXB0eVxuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKiBAcmV0dXJuIHtudW1iZXJ9IFNpemUgb2YgdGhlIHNldCBvZiBhbGwgc3RvcmVkIGluc3RhbmNlc1xuICAgKi9cbiAgaXNFbXB0eTogZnVuY3Rpb24gaXNFbXB0eSgpIHtcbiAgICByZXR1cm4gIV9pbnN0YW5jZXMuc2l6ZTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBzZXRCaW5kaW5nXG4gICAqXG4gICAqIEBhY2Nlc3MgcHVibGljXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzIEFsbCBhcmd1bWVudHMgbmVjZXNzYXJ5IHRvIHNldCB0aGUgYmluZGluZ1xuICAgKiBAcGFyYW0ge2FycmF5fSBhcmdzLmtleXMgS2V5IGNvZGVzIHRoYXQgc2hvdWxkIHRyaWdnZXIgdGhlIGZuXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGFyZ3MuZm4gVGhlIGNhbGxiYWNrIHRvIGJlIHRyaWdnZXJlZCB3aGVuIGdpdmVuIGtleXMgYXJlIHByZXNzZWRcbiAgICogQHBhcmFtIHtvYmplY3R9IGFyZ3MudGFyZ2V0IFRoZSBkZWNvcmF0ZWQgY2xhc3NcbiAgICovXG4gIHNldEJpbmRpbmc6IGZ1bmN0aW9uIHNldEJpbmRpbmcoX3JlZjIpIHtcbiAgICB2YXIga2V5cyA9IF9yZWYyLmtleXMsXG4gICAgICAgIGZuID0gX3JlZjIuZm4sXG4gICAgICAgIHRhcmdldCA9IF9yZWYyLnRhcmdldDtcblxuICAgIHZhciBrZXlTZXRzID0ga2V5cyA/IHBhcnNlS2V5cyhrZXlzKSA6IGFsbEtleXMoKTtcbiAgICB2YXIgX19yZWFjdEtleWRvd25VVUlEID0gdGFyZ2V0Ll9fcmVhY3RLZXlkb3duVVVJRDtcblxuICAgIGlmICghX19yZWFjdEtleWRvd25VVUlEKSB7XG4gICAgICB0YXJnZXQuX19yZWFjdEtleWRvd25VVUlEID0gdXVpZCgpO1xuICAgICAgX2hhbmRsZXJzLnNldCh0YXJnZXQuX19yZWFjdEtleWRvd25VVUlELCBuZXcgTWFwKFtba2V5U2V0cywgZm5dXSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfaGFuZGxlcnMuZ2V0KF9fcmVhY3RLZXlkb3duVVVJRCkuc2V0KGtleVNldHMsIGZuKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IFN0b3JlO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL3N0b3JlLmpzXG4vLyBtb2R1bGUgaWQgPSAxMDZcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gTWFrZSBzdXJlIGBnbG9iYWxgIGlzIGRlZmluZWQgZ2xvYmFsbHk6XG4vL1x0LSBlaXRoZXIgYXMgdGhlIG5vZGVqcyBgZ2xvYmFsYCwgb3Jcbi8vXHQtIGFzIGFuIGFsaWFzIGZvciBgd2luZG93YCBpbiBicm93c2Vycywgb3Jcbi8vXHQtIGZvciB0aGUgYHNlbGZgIGNvbnRleHQgaW4gd2ViIHdvcmtlcnMuXG4vL1xuLy8gTk9URTogdGhpcyBtb2RpZmllcyB0aGUgXCJnbG9iYWxcIiBlbnZpcm9ubWVudCBieSBtYWtpbmcgc3VyZSBcImdsb2JhbFwiIGlzIHNldC4hXG4vL1xuXG5sZXQgZ2xvYmFsX2lkZW50aWZpZXI7XG5pZiAodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuLy9cdGNvbnNvbGUubG9nKFwiUnVubmluZyBpbiBub2RlXCIpO1xuXHRnbG9iYWxfaWRlbnRpZmllciA9IGdsb2JhbDtcbn1cblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbi8vXHRjb25zb2xlLmxvZyhcIlJ1bm5pbmcgaW4gYSB3ZWIgYnJvd3NlclwiKTtcblx0d2luZG93Lmdsb2JhbCA9IHdpbmRvdztcblx0Z2xvYmFsX2lkZW50aWZpZXIgPSB3aW5kb3c7XG59XG5cbmlmICh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIikge1xuLy9cdGNvbnNvbGUubG9nKFwiUnVubmluZyBpbiBhIHdlYiB3b3JrZXJcIik7XG5cdHNlbGYuZ2xvYmFsID0gc2VsZjtcblx0Z2xvYmFsX2lkZW50aWZpZXIgPSBzZWxmO1xufVxuXG4vLyBFeHBvcnQgZm9yIGNvbnN1bXB0aW9uIGJ5IGltcG9ydC5cbmV4cG9ydCBkZWZhdWx0IGdsb2JhbF9pZGVudGlmaWVyO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvdXRpbHMvZ2xvYmFsLmpzIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDEzLXByZXNlbnQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKiBcbiAqL1xuXG5mdW5jdGlvbiBtYWtlRW1wdHlGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gYXJnO1xuICB9O1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gYWNjZXB0cyBhbmQgZGlzY2FyZHMgaW5wdXRzOyBpdCBoYXMgbm8gc2lkZSBlZmZlY3RzLiBUaGlzIGlzXG4gKiBwcmltYXJpbHkgdXNlZnVsIGlkaW9tYXRpY2FsbHkgZm9yIG92ZXJyaWRhYmxlIGZ1bmN0aW9uIGVuZHBvaW50cyB3aGljaFxuICogYWx3YXlzIG5lZWQgdG8gYmUgY2FsbGFibGUsIHNpbmNlIEpTIGxhY2tzIGEgbnVsbC1jYWxsIGlkaW9tIGFsYSBDb2NvYS5cbiAqL1xudmFyIGVtcHR5RnVuY3Rpb24gPSBmdW5jdGlvbiBlbXB0eUZ1bmN0aW9uKCkge307XG5cbmVtcHR5RnVuY3Rpb24udGhhdFJldHVybnMgPSBtYWtlRW1wdHlGdW5jdGlvbjtcbmVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNGYWxzZSA9IG1ha2VFbXB0eUZ1bmN0aW9uKGZhbHNlKTtcbmVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNUcnVlID0gbWFrZUVtcHR5RnVuY3Rpb24odHJ1ZSk7XG5lbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zTnVsbCA9IG1ha2VFbXB0eUZ1bmN0aW9uKG51bGwpO1xuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc1RoaXMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzO1xufTtcbmVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNBcmd1bWVudCA9IGZ1bmN0aW9uIChhcmcpIHtcbiAgcmV0dXJuIGFyZztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZW1wdHlGdW5jdGlvbjtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9+L2ZianMvbGliL2VtcHR5RnVuY3Rpb24uanNcbi8vIG1vZHVsZSBpZCA9IDE1NFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIENvcHlyaWdodCAoYykgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBVc2UgaW52YXJpYW50KCkgdG8gYXNzZXJ0IHN0YXRlIHdoaWNoIHlvdXIgcHJvZ3JhbSBhc3N1bWVzIHRvIGJlIHRydWUuXG4gKlxuICogUHJvdmlkZSBzcHJpbnRmLXN0eWxlIGZvcm1hdCAob25seSAlcyBpcyBzdXBwb3J0ZWQpIGFuZCBhcmd1bWVudHNcbiAqIHRvIHByb3ZpZGUgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCBicm9rZSBhbmQgd2hhdCB5b3Ugd2VyZVxuICogZXhwZWN0aW5nLlxuICpcbiAqIFRoZSBpbnZhcmlhbnQgbWVzc2FnZSB3aWxsIGJlIHN0cmlwcGVkIGluIHByb2R1Y3Rpb24sIGJ1dCB0aGUgaW52YXJpYW50XG4gKiB3aWxsIHJlbWFpbiB0byBlbnN1cmUgbG9naWMgZG9lcyBub3QgZGlmZmVyIGluIHByb2R1Y3Rpb24uXG4gKi9cblxudmFyIHZhbGlkYXRlRm9ybWF0ID0gZnVuY3Rpb24gdmFsaWRhdGVGb3JtYXQoZm9ybWF0KSB7fTtcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgdmFsaWRhdGVGb3JtYXQgPSBmdW5jdGlvbiB2YWxpZGF0ZUZvcm1hdChmb3JtYXQpIHtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW52YXJpYW50IHJlcXVpcmVzIGFuIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQnKTtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGludmFyaWFudChjb25kaXRpb24sIGZvcm1hdCwgYSwgYiwgYywgZCwgZSwgZikge1xuICB2YWxpZGF0ZUZvcm1hdChmb3JtYXQpO1xuXG4gIGlmICghY29uZGl0aW9uKSB7XG4gICAgdmFyIGVycm9yO1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoJ01pbmlmaWVkIGV4Y2VwdGlvbiBvY2N1cnJlZDsgdXNlIHRoZSBub24tbWluaWZpZWQgZGV2IGVudmlyb25tZW50ICcgKyAnZm9yIHRoZSBmdWxsIGVycm9yIG1lc3NhZ2UgYW5kIGFkZGl0aW9uYWwgaGVscGZ1bCB3YXJuaW5ncy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFyZ3MgPSBbYSwgYiwgYywgZCwgZSwgZl07XG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoZm9ybWF0LnJlcGxhY2UoLyVzL2csIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107XG4gICAgICB9KSk7XG4gICAgICBlcnJvci5uYW1lID0gJ0ludmFyaWFudCBWaW9sYXRpb24nO1xuICAgIH1cblxuICAgIGVycm9yLmZyYW1lc1RvUG9wID0gMTsgLy8gd2UgZG9uJ3QgY2FyZSBhYm91dCBpbnZhcmlhbnQncyBvd24gZnJhbWVcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGludmFyaWFudDtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9+L2ZianMvbGliL2ludmFyaWFudC5qc1xuLy8gbW9kdWxlIGlkID0gMTU1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qXG5cdE1JVCBMaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG5cdEF1dGhvciBUb2JpYXMgS29wcGVycyBAc29rcmFcbiovXG4vLyBjc3MgYmFzZSBjb2RlLCBpbmplY3RlZCBieSB0aGUgY3NzLWxvYWRlclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih1c2VTb3VyY2VNYXApIHtcblx0dmFyIGxpc3QgPSBbXTtcblxuXHQvLyByZXR1cm4gdGhlIGxpc3Qgb2YgbW9kdWxlcyBhcyBjc3Mgc3RyaW5nXG5cdGxpc3QudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcblx0XHRcdHZhciBjb250ZW50ID0gY3NzV2l0aE1hcHBpbmdUb1N0cmluZyhpdGVtLCB1c2VTb3VyY2VNYXApO1xuXHRcdFx0aWYoaXRlbVsyXSkge1xuXHRcdFx0XHRyZXR1cm4gXCJAbWVkaWEgXCIgKyBpdGVtWzJdICsgXCJ7XCIgKyBjb250ZW50ICsgXCJ9XCI7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gY29udGVudDtcblx0XHRcdH1cblx0XHR9KS5qb2luKFwiXCIpO1xuXHR9O1xuXG5cdC8vIGltcG9ydCBhIGxpc3Qgb2YgbW9kdWxlcyBpbnRvIHRoZSBsaXN0XG5cdGxpc3QuaSA9IGZ1bmN0aW9uKG1vZHVsZXMsIG1lZGlhUXVlcnkpIHtcblx0XHRpZih0eXBlb2YgbW9kdWxlcyA9PT0gXCJzdHJpbmdcIilcblx0XHRcdG1vZHVsZXMgPSBbW251bGwsIG1vZHVsZXMsIFwiXCJdXTtcblx0XHR2YXIgYWxyZWFkeUltcG9ydGVkTW9kdWxlcyA9IHt9O1xuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgaWQgPSB0aGlzW2ldWzBdO1xuXHRcdFx0aWYodHlwZW9mIGlkID09PSBcIm51bWJlclwiKVxuXHRcdFx0XHRhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2lkXSA9IHRydWU7XG5cdFx0fVxuXHRcdGZvcihpID0gMDsgaSA8IG1vZHVsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpdGVtID0gbW9kdWxlc1tpXTtcblx0XHRcdC8vIHNraXAgYWxyZWFkeSBpbXBvcnRlZCBtb2R1bGVcblx0XHRcdC8vIHRoaXMgaW1wbGVtZW50YXRpb24gaXMgbm90IDEwMCUgcGVyZmVjdCBmb3Igd2VpcmQgbWVkaWEgcXVlcnkgY29tYmluYXRpb25zXG5cdFx0XHQvLyAgd2hlbiBhIG1vZHVsZSBpcyBpbXBvcnRlZCBtdWx0aXBsZSB0aW1lcyB3aXRoIGRpZmZlcmVudCBtZWRpYSBxdWVyaWVzLlxuXHRcdFx0Ly8gIEkgaG9wZSB0aGlzIHdpbGwgbmV2ZXIgb2NjdXIgKEhleSB0aGlzIHdheSB3ZSBoYXZlIHNtYWxsZXIgYnVuZGxlcylcblx0XHRcdGlmKHR5cGVvZiBpdGVtWzBdICE9PSBcIm51bWJlclwiIHx8ICFhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2l0ZW1bMF1dKSB7XG5cdFx0XHRcdGlmKG1lZGlhUXVlcnkgJiYgIWl0ZW1bMl0pIHtcblx0XHRcdFx0XHRpdGVtWzJdID0gbWVkaWFRdWVyeTtcblx0XHRcdFx0fSBlbHNlIGlmKG1lZGlhUXVlcnkpIHtcblx0XHRcdFx0XHRpdGVtWzJdID0gXCIoXCIgKyBpdGVtWzJdICsgXCIpIGFuZCAoXCIgKyBtZWRpYVF1ZXJ5ICsgXCIpXCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0bGlzdC5wdXNoKGl0ZW0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblx0cmV0dXJuIGxpc3Q7XG59O1xuXG5mdW5jdGlvbiBjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKGl0ZW0sIHVzZVNvdXJjZU1hcCkge1xuXHR2YXIgY29udGVudCA9IGl0ZW1bMV0gfHwgJyc7XG5cdHZhciBjc3NNYXBwaW5nID0gaXRlbVszXTtcblx0aWYgKCFjc3NNYXBwaW5nKSB7XG5cdFx0cmV0dXJuIGNvbnRlbnQ7XG5cdH1cblxuXHRpZiAodXNlU291cmNlTWFwICYmIHR5cGVvZiBidG9hID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0dmFyIHNvdXJjZU1hcHBpbmcgPSB0b0NvbW1lbnQoY3NzTWFwcGluZyk7XG5cdFx0dmFyIHNvdXJjZVVSTHMgPSBjc3NNYXBwaW5nLnNvdXJjZXMubWFwKGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0XHRcdHJldHVybiAnLyojIHNvdXJjZVVSTD0nICsgY3NzTWFwcGluZy5zb3VyY2VSb290ICsgc291cmNlICsgJyAqLydcblx0XHR9KTtcblxuXHRcdHJldHVybiBbY29udGVudF0uY29uY2F0KHNvdXJjZVVSTHMpLmNvbmNhdChbc291cmNlTWFwcGluZ10pLmpvaW4oJ1xcbicpO1xuXHR9XG5cblx0cmV0dXJuIFtjb250ZW50XS5qb2luKCdcXG4nKTtcbn1cblxuLy8gQWRhcHRlZCBmcm9tIGNvbnZlcnQtc291cmNlLW1hcCAoTUlUKVxuZnVuY3Rpb24gdG9Db21tZW50KHNvdXJjZU1hcCkge1xuXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcblx0dmFyIGJhc2U2NCA9IGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHNvdXJjZU1hcCkpKSk7XG5cdHZhciBkYXRhID0gJ3NvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LCcgKyBiYXNlNjQ7XG5cblx0cmV0dXJuICcvKiMgJyArIGRhdGEgKyAnICovJztcbn1cblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9jc3MtbG9hZGVyL2xpYi9jc3MtYmFzZS5qc1xuLy8gbW9kdWxlIGlkID0gMjUxXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gIHZhciBSRUFDVF9FTEVNRU5UX1RZUEUgPSAodHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIFN5bWJvbC5mb3IgJiZcbiAgICBTeW1ib2wuZm9yKCdyZWFjdC5lbGVtZW50JykpIHx8XG4gICAgMHhlYWM3O1xuXG4gIHZhciBpc1ZhbGlkRWxlbWVudCA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHJldHVybiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgb2JqZWN0ICE9PSBudWxsICYmXG4gICAgICBvYmplY3QuJCR0eXBlb2YgPT09IFJFQUNUX0VMRU1FTlRfVFlQRTtcbiAgfTtcblxuICAvLyBCeSBleHBsaWNpdGx5IHVzaW5nIGBwcm9wLXR5cGVzYCB5b3UgYXJlIG9wdGluZyBpbnRvIG5ldyBkZXZlbG9wbWVudCBiZWhhdmlvci5cbiAgLy8gaHR0cDovL2ZiLm1lL3Byb3AtdHlwZXMtaW4tcHJvZFxuICB2YXIgdGhyb3dPbkRpcmVjdEFjY2VzcyA9IHRydWU7XG4gIG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9mYWN0b3J5V2l0aFR5cGVDaGVja2VycycpKGlzVmFsaWRFbGVtZW50LCB0aHJvd09uRGlyZWN0QWNjZXNzKTtcbn0gZWxzZSB7XG4gIC8vIEJ5IGV4cGxpY2l0bHkgdXNpbmcgYHByb3AtdHlwZXNgIHlvdSBhcmUgb3B0aW5nIGludG8gbmV3IHByb2R1Y3Rpb24gYmVoYXZpb3IuXG4gIC8vIGh0dHA6Ly9mYi5tZS9wcm9wLXR5cGVzLWluLXByb2RcbiAgbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2ZhY3RvcnlXaXRoVGhyb3dpbmdTaGltcycpKCk7XG59XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gMjUyXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0UHJvcFR5cGVzU2VjcmV0ID0gJ1NFQ1JFVF9ET19OT1RfUEFTU19USElTX09SX1lPVV9XSUxMX0JFX0ZJUkVEJztcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdFByb3BUeXBlc1NlY3JldDtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL2xpYi9SZWFjdFByb3BUeXBlc1NlY3JldC5qc1xuLy8gbW9kdWxlIGlkID0gMjUzXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTQtMjAxNSwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlbXB0eUZ1bmN0aW9uID0gcmVxdWlyZSgnLi9lbXB0eUZ1bmN0aW9uJyk7XG5cbi8qKlxuICogU2ltaWxhciB0byBpbnZhcmlhbnQgYnV0IG9ubHkgbG9ncyBhIHdhcm5pbmcgaWYgdGhlIGNvbmRpdGlvbiBpcyBub3QgbWV0LlxuICogVGhpcyBjYW4gYmUgdXNlZCB0byBsb2cgaXNzdWVzIGluIGRldmVsb3BtZW50IGVudmlyb25tZW50cyBpbiBjcml0aWNhbFxuICogcGF0aHMuIFJlbW92aW5nIHRoZSBsb2dnaW5nIGNvZGUgZm9yIHByb2R1Y3Rpb24gZW52aXJvbm1lbnRzIHdpbGwga2VlcCB0aGVcbiAqIHNhbWUgbG9naWMgYW5kIGZvbGxvdyB0aGUgc2FtZSBjb2RlIHBhdGhzLlxuICovXG5cbnZhciB3YXJuaW5nID0gZW1wdHlGdW5jdGlvbjtcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcHJpbnRXYXJuaW5nID0gZnVuY3Rpb24gcHJpbnRXYXJuaW5nKGZvcm1hdCkge1xuICAgICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuID4gMSA/IF9sZW4gLSAxIDogMCksIF9rZXkgPSAxOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICAgIGFyZ3NbX2tleSAtIDFdID0gYXJndW1lbnRzW19rZXldO1xuICAgICAgfVxuXG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgdmFyIG1lc3NhZ2UgPSAnV2FybmluZzogJyArIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmdzW2FyZ0luZGV4KytdO1xuICAgICAgfSk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICAvLyAtLS0gV2VsY29tZSB0byBkZWJ1Z2dpbmcgUmVhY3QgLS0tXG4gICAgICAgIC8vIFRoaXMgZXJyb3Igd2FzIHRocm93biBhcyBhIGNvbnZlbmllbmNlIHNvIHRoYXQgeW91IGNhbiB1c2UgdGhpcyBzdGFja1xuICAgICAgICAvLyB0byBmaW5kIHRoZSBjYWxsc2l0ZSB0aGF0IGNhdXNlZCB0aGlzIHdhcm5pbmcgdG8gZmlyZS5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgfSBjYXRjaCAoeCkge31cbiAgICB9O1xuXG4gICAgd2FybmluZyA9IGZ1bmN0aW9uIHdhcm5pbmcoY29uZGl0aW9uLCBmb3JtYXQpIHtcbiAgICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2B3YXJuaW5nKGNvbmRpdGlvbiwgZm9ybWF0LCAuLi5hcmdzKWAgcmVxdWlyZXMgYSB3YXJuaW5nICcgKyAnbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZm9ybWF0LmluZGV4T2YoJ0ZhaWxlZCBDb21wb3NpdGUgcHJvcFR5cGU6ICcpID09PSAwKSB7XG4gICAgICAgIHJldHVybjsgLy8gSWdub3JlIENvbXBvc2l0ZUNvbXBvbmVudCBwcm9wdHlwZSBjaGVjay5cbiAgICAgIH1cblxuICAgICAgaWYgKCFjb25kaXRpb24pIHtcbiAgICAgICAgZm9yICh2YXIgX2xlbjIgPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbjIgPiAyID8gX2xlbjIgLSAyIDogMCksIF9rZXkyID0gMjsgX2tleTIgPCBfbGVuMjsgX2tleTIrKykge1xuICAgICAgICAgIGFyZ3NbX2tleTIgLSAyXSA9IGFyZ3VtZW50c1tfa2V5Ml07XG4gICAgICAgIH1cblxuICAgICAgICBwcmludFdhcm5pbmcuYXBwbHkodW5kZWZpbmVkLCBbZm9ybWF0XS5jb25jYXQoYXJncykpO1xuICAgICAgfVxuICAgIH07XG4gIH0pKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gd2FybmluZztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9+L2ZianMvbGliL3dhcm5pbmcuanNcbi8vIG1vZHVsZSBpZCA9IDI1NFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBTcGVsbCBcInBhcnNlclwiIGNsYXNzLlxuLy9cblxuLy8gVE9ETzogZGVwZW5kZW5jeS1pbmplY3QgdG9rZW5pemVyP1xuaW1wb3J0IFRva2VuaXplciBmcm9tIFwiLi9Ub2tlbml6ZXIuanNcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuL1J1bGUuanNcIjtcblxuLy8gR1JSUi4uLiB3aWxsIFNPTUVPTkUgb24gdGhlIG5vZGUgdGVhbSBwbGVhc2UgaW1wbGVtZW50IGNvbnNvbGUuZ3JvdXAgPz8/XG5pZiAoIWNvbnNvbGUuZ3JvdXApIGNvbnNvbGUuZ3JvdXAgPSBjb25zb2xlLmxvZztcbmlmICghY29uc29sZS5ncm91cEVuZCkgY29uc29sZS5ncm91cEVuZCA9IGNvbnNvbGUubG9nO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYXJzZXIge1xuXHQvLyBTZXQgdG8gYHRydWVgIHRvIG91dHB1dCBkZWJ1ZyBpbmZvIHdoaWxlIGFkZGluZyBydWxlc1xuXHRzdGF0aWMgREVCVUcgPSBmYWxzZTtcblxuXHQvLyBTaG91bGQgd2Ugd2FybiBhYm91dCBhbm9tYWxvdXMgY29uZGl0aW9ucz9cblx0c3RhdGljIFdBUk4gPSBmYWxzZTtcblxuXHQvLyBTZXQgdG8gYHRydWVgIHRvIG91dHB1dCB0aW1pbmcgaW5mby5cblx0c3RhdGljIFRJTUUgPSBmYWxzZTtcblxuXHQvLyBQb2ludGVyIHRvIG91ciB0b2tlbml6ZXIuXG5cdFRva2VuemllciA9IFRva2VuaXplcjtcblxuXHQvLyBDb25zdHJ1Y3Rvci5cblx0Y29uc3RydWN0b3IocHJvcGVydGllcykge1xuXHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcGVydGllcyk7XG5cdH1cblxuLy9cbi8vIyMjIFBhcnNpbmdcbi8vXG5cdC8vIFBhcnNlIGBydWxlTmFtZWAgcnVsZSBhdCBoZWFkIG9mIGB0ZXh0YC5cblx0Ly8gSWYgeW91IHBhc3Mgb25seSBvbmUgYXJndW1lbnQsIHdlJ2xsIGFzc3VtZSB0aGF0J3MgYHRleHRgIGFuZCB5b3Ugd2FudCB0byBtYXRjaCBgc3RhdGVtZW50c2AuXG5cdC8vIEhhbmRsZXMgb3B0aW9uYWwgYW5kIHJlcGVhdGluZyBydWxlcyBhcyB3ZWxsIGFzIGVhdGluZyB3aGl0ZXNwYWNlLlxuXHQvLyBSZXR1cm5zIHJlc3VsdCBvZiBwYXJzZS5cbi8vVEVTVE1FXG5cdHBhcnNlKHJ1bGVOYW1lLCB0ZXh0KSB7XG5cdFx0Ly8gSWYgb25seSBvbmUgYXJndW1lbnQsIGFzc3VtZSB0aGF0J3MgdGhlIHRleHQgYW5kIHBhcnNlIGBzdGF0ZW1lbnRzYFxuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHR0ZXh0ID0gcnVsZU5hbWU7XG5cdFx0XHRydWxlTmFtZSA9IFwic3RhdGVtZW50c1wiO1xuXHRcdH1cblxuXHRcdC8vIENvbnZlcnQgdG8gdG9rZW5zLlxuXHRcdGlmIChQYXJzZXIuVElNRSkgY29uc29sZS50aW1lKFwidG9rZW5pemVcIik7XG5cdFx0bGV0IHRva2VucyA9IFRva2VuaXplci50b2tlbml6ZSh0ZXh0KTtcblx0XHQvLyBlYXQgbm9uLWluZGVudCB3aGl0ZXNwYWNlIChzaW5jZSB3ZSBpZ25vcmUgaXQpXG5cdFx0dG9rZW5zID0gdG9rZW5zLmZpbHRlcih0b2tlbiA9PiAhVG9rZW5pemVyLmlzTm9ybWFsV2hpdGVzcGFjZSh0b2tlbikpO1xuXHRcdGlmIChQYXJzZXIuVElNRSkgY29uc29sZS50aW1lRW5kKFwidG9rZW5pemVcIik7XG5cblx0XHQvLyBCYWlsIGlmIHdlIGRpZG4ndCBnZXQgYW55IHRva2VucyBiYWNrLlxuLy9UT0RPOiBXQVJOPyAgRVJST1I/XG5cdFx0aWYgKCF0b2tlbnMgfHwgdG9rZW5zLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGlmIChQYXJzZXIuVElNRSkgY29uc29sZS50aW1lKFwicGFyc2VcIik7XG5cdFx0Ly8gSWYgd2UncmUgbm90IHBhcnNpbmcgYHN0YXRlbWVudHNgLCBlYXQgd2hpdGVzcGFjZSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaW5lLlxuXHRcdGlmIChydWxlTmFtZSAhPT0gXCJzdGF0ZW1lbnRzXCIpIHtcblx0XHRcdHRva2VucyA9IFRva2VuaXplci5yZW1vdmVMZWFkaW5nV2hpdGVzcGFjZSh0b2tlbnMpO1xuXHRcdH1cblxuXHRcdC8vIFBhcnNlIHRoZSBydWxlIG9yIHRocm93IGFuIGV4Y2VwdGlvbiBpZiBydWxlIG5vdCBmb3VuZC5cblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5wYXJzZVJ1bGVPckRpZShydWxlTmFtZSwgdG9rZW5zLCAwLCB0b2tlbnMubGVuZ3RoLCB1bmRlZmluZWQsIFwicGFyc2VyLnBhcnNlKClcIik7XG5cdFx0aWYgKFBhcnNlci5USU1FKSBjb25zb2xlLnRpbWVFbmQoXCJwYXJzZVwiKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblxuXG5cdC8vIFBhcnNlIHNvbWV0aGluZzpcblx0Ly9cdC0gaWYgb25lIHN0cmluZyBhcmd1bWVudCwgZG9lcyBhIGBjb21waWxlU3RhdGVtZW50cygpYFxuXHQvLyBSZXR1cm5zIHRoZSBgdG9TdHJpbmcoKWAgb3IgdGhyb3dzLlxuLy9URVNUTUVcblx0Y29tcGlsZShydWxlTmFtZSwgdGV4dCkge1xuXHRcdC8vIElmIG9ubHkgb25lIGFyZ3VtZW50LCBhc3N1bWUgdGhhdCdzIHRoZSB0ZXh0IGFuZCBwYXJzZSBgc3RhdGVtZW50c2Bcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0dGV4dCA9IHJ1bGVOYW1lO1xuXHRcdFx0cnVsZU5hbWUgPSBcInN0YXRlbWVudHNcIjtcblx0XHR9XG5cdFx0bGV0IHJlc3VsdCA9IHRoaXMucGFyc2UocnVsZU5hbWUsIHRleHQpO1xuXHRcdGlmICghcmVzdWx0KSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYHBhcnNlci5wYXJzZSgnJHtydWxlTmFtZX0nLCAnJHt0ZXh0fScpOiBjYW4ndCBwYXJzZSB0aGlzYCk7XG5cdFx0cmV0dXJuIHJlc3VsdC50b1NvdXJjZSh0aGlzKTtcblx0fVxuXG5cblx0Ly8gUGFyc2UgYSBuYW1lZCBydWxlIChkZWZpbmVkIGluIHRoaXMgcGFyc2VyIG9yIGluIGFueSBvZiBvdXIgYGltcG9ydHNgKSwgcmV0dXJuaW5nIHRoZSBcImJlc3RcIiBtYXRjaC5cblx0Ly8gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiBubyBtYXRjaC5cblx0Ly8gVGhyb3dzIGlmIE5PQk9EWSBpbXBsZW1lbnRzIGBydWxlTmFtZWAuXG5cdC8vXG5cdC8vIE5PVEU6IGN1cnJlbnRseSBcImJlc3RcIiBpcyBkZWZpbmVkIGFzIHRoZSBmaXJzdCBydWxlIGluIG91ciBgaW1wb3J0c2Agd2hpY2ggbWF0Y2hlcy4uLlxuXHRwYXJzZVJ1bGVPckRpZShydWxlTmFtZSwgdG9rZW5zLCBzdGFydCwgZW5kLCBzdGFjaywgY2FsbGluZ0NvbnRleHQgPSBcInBhcnNlUnVsZU9yRGllXCIpIHtcblx0XHQvLyBLZWVwIHRyYWNrIG9mIHdoZXRoZXIgcnVsZSB3YXMgRVZFUiBmb3VuZCBvciBub3QuXG5cdFx0bGV0IHJ1bGVGb3VuZCA9IGZhbHNlO1xuXHRcdGxldCBpbXBvcnRzID0gdGhpcy5pbXBvcnRzLCBpbmRleCA9IDAsIHBhcnNlcjtcblx0XHRsZXQgcmVzdWx0cyA9IFtdO1xuXHRcdHdoaWxlIChwYXJzZXIgPSBpbXBvcnRzW2luZGV4KytdKSB7XG5cdFx0XHRsZXQgcnVsZSA9IHBhcnNlci5fcnVsZXNbcnVsZU5hbWVdO1xuXHRcdFx0aWYgKCFydWxlKSBjb250aW51ZTtcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHJ1bGUucGFyc2UodGhpcywgdG9rZW5zLCBzdGFydCwgZW5kLCBzdGFjayk7XG5cdFx0XHRpZiAocmVzdWx0KSByZXN1bHRzLnB1c2gocmVzdWx0KTtcblx0XHRcdHJ1bGVGb3VuZCA9IHRydWU7XG5cdFx0fVxuXHRcdC8vIElmIG5ldmVyIGZvdW5kLCB0aHJvdy5cblx0XHRpZiAoIXJ1bGVGb3VuZCkgdGhyb3cgbmV3IFN5bnRheEVycm9yKGAke2NhbGxpbmdDb250ZXh0fTogcnVsZSAnJHtydWxlTmFtZX0nIG5vdCBmb3VuZGApO1xuXG5cdFx0Ly8gSWYgbm8gbWF0Y2gsIHJldHVybiB1bmRlZmluZWQuXG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gSWYgZXhhY3RseSBvbmUgbWF0Y2gsIHJldHVybiB0aGF0LlxuXHRcdGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHJlc3VsdHNbMF07XG5cblx0XHQvLyBPdGhlcndpc2UgcmV0dXJuIHRoZSBsb25nZXN0IG1hdGNoLlxuXHRcdHJldHVybiByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAobGFyZ2VzdCwgbmV4dCkge1xuXHRcdFx0aWYgKG5leHQubmV4dFN0YXJ0ID4gbGFyZ2VzdC5uZXh0U3RhcnQpIHJldHVybiBuZXh0O1xuXHRcdFx0cmV0dXJuIGxhcmdlc3Q7XG5cdFx0fSwgcmVzdWx0c1swXSk7XG5cdH1cblxuXHQvLyBUZXN0IHdoZXRoZXIgYSBydWxlICh3aGljaCBtYXkgYmUgc3BlY2lmaWVkIGJ5IG5hbWUpIE1JR0hUIGJlIGZvdW5kIGluIGhlYWQgb2Ygc3RyZWFtLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdHJ1ZWAgaWYgdGhlIHJ1bGUgTUlHSFQgYmUgbWF0Y2hlZC5cblx0Ly9cdC0gYGZhbHNlYCBpZiB0aGVyZSBpcyBubyB3YXkgdGhlIHJ1bGUgY2FuIGJlIG1hdGNoZWQuXG5cdC8vXHQtIGB1bmRlZmluZWRgIGlmIG5vdCBkZXRlcm1pbnN0aWMgKGVnOiBubyB3YXkgdG8gdGVsbCBxdWlja2x5KS5cblx0dGVzdFJ1bGUocnVsZSwgdG9rZW5zLCBzdGFydCwgZW5kKSB7XG5cdFx0Ly8gSGFuZGxlIHJ1bGUgaW5zdGFuY2Vcblx0XHRpZiAocnVsZSBpbnN0YW5jZW9mIFJ1bGUpIHtcblx0XHRcdHJldHVybiBydWxlLnRlc3QodGhpcywgdG9rZW5zLCBzdGFydCwgZW5kKTtcblx0XHR9XG5cdFx0Ly8gSGFuZGxlIG5hbWVkIHJ1bGUgYnkgbG9va2luZyBpbiBvdXIgaW1wb3J0c1xuXHRcdGxldCBpbXBvcnRzID0gdGhpcy5pbXBvcnRzLCBpbmRleCA9IDAsIHBhcnNlcjtcblx0XHR3aGlsZSAocGFyc2VyID0gaW1wb3J0c1tpbmRleCsrXSkge1xuXHRcdFx0bGV0IG5leHRSdWxlID0gcGFyc2VyLl9ydWxlc1tydWxlXTtcblx0XHRcdGlmICghbmV4dFJ1bGUpIGNvbnRpbnVlO1xuXHRcdFx0bGV0IHJlc3VsdCA9IG5leHRSdWxlLnRlc3QodGhpcywgdG9rZW5zLCBzdGFydCwgZW5kKTtcblx0XHRcdGlmIChyZXN1bHQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cblxuXG4vL1xuLy8gIyMjIFx0SW1wb3J0c1xuLy9cdFx0UGFyc2VycyBkZXBlbmQgb24gb3RoZXIgcGFyc2VycyBmb3IgdGhlaXIgYHJ1bGVzYC5cbi8vXHRcdEltcG9ydHMgYXJlIGxhenktYm91bmQgKGFuZCB3ZSBhc3N1bWUgdGhlIGJ1aWxkIGZpbGUgd2lsbCBpbmNsdWRlIGFsbCBuZWNlc3NhcnkgaW1wb3J0cykuXG4vL1xuXG5cdC8vIEFkZCBvbmUgb3IgbW9yZSBuYW1lZCBpbXBvcnRzIHRvIHRoaXMgcGFyc2VyLlxuXHQvLyBJbXBvcnRzIGluY3JlYXNlIGluIHByaW9yaXR5IHRoZSBsYXRlciB0aGV5IGFyZSBpbiB0aGUgbGlzdC5cblx0aW1wb3J0KC4uLmltcG9ydHMpIHtcblx0XHQvLyBSRVZFUlNFIHRoZSBsaXN0IG9mIGltcG9ydHMsIHNvIHRoZSBtb3N0IGdlbmVyYWwgb25lIGlzIExBU1Rcblx0XHQvLyBUaHVzIG1vcmUgc3BlY2lmaWMgaW1wb3J0cyB3aWxsIGJlIEVBUkxJRVIgaW4gdGhlIGBpbXBvcnRzYCBsaXN0LlxuXG5cdFx0Ly8gQ3JlYXRlIG5ldyBhcnJheSBvZiBpbXBvcnRzIGFuZCBhZGQgaW1wb3J0IG5hbWVzIHBhc3NlZCBpbi5cblx0XHR0aGlzLl9pbXBvcnRzID0gKHRoaXMuX2ltcG9ydHMgfHwgW10pLmNvbmNhdChpbXBvcnRzLnJldmVyc2UoKSk7XG5cdFx0Ly8gY2xlYXIgbWVtb2l6ZSB2YXJpYWJsZSBmb3IgYGltcG9ydHNgLlxuXHRcdGRlbGV0ZSB0aGlzLl9faW1wb3J0cztcblx0fVxuXG5cdC8vIEdldHRlciB0byByZXR1cm4gbGlzdCBvZiBvdXIgYGltcG9ydHNgIGFzIGBQYXJzZXJgIG9iamVjdHMsIElOQ0xVRElORyBgdGhpc2AgcGFyc2VyIGl0c2VsZiFcblx0Ly8gTW9zdCBzcGVjaWZpYyBpbXBvcnQgKGVnOiBvdXJzZWxmKSBpcyBmaXJzdCBpbiB0aGUgbGlzdC5cblx0Ly8gVGhyb3dzIGlmIGFuIGltcG9ydCBjYW4ndCBiZSBmb3VuZC5cblx0Z2V0IGltcG9ydHMoKSB7XG5cdFx0aWYgKCF0aGlzLl9faW1wb3J0cykge1xuXHRcdFx0dmFyIGltcG9ydHMgPSAodGhpcy5faW1wb3J0cyA/IHRoaXMuX2ltcG9ydHMubWFwKFBhcnNlci5nZXRDb250ZXh0T3JEaWUpIDogW10pO1xuXHRcdFx0dGhpcy5fX2ltcG9ydHMgPSBbdGhpc10uY29uY2F0KGltcG9ydHMpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5fX2ltcG9ydHM7XG5cdH1cblxuXG4vL1xuLy8gIyMjIFJ1bGVzXG4vL1xuXHQvLyBTdGFydCB3aXRoIGFuIGVtcHR5IG1hcCBvZiBydWxlcy5cblx0X3J1bGVzID0ge307XG5cblx0Ly8gREFOR0VST1VTOiByZXR1cm4gbWFwIG9mIGFycmF5IG9mIG5hbWVkIHJ1bGVzIGZvciB1cyBhbmQgb3VyIGltcG9ydHNcblx0Ly8gTk9URTogV2UgbWVtb2l6ZSB0aGlzIGJ1dCB0aGVyZSdzIG5vdGhpbmcgdGhhdCByZXNldHMgdGhpcyB3aGVuIG91ciBpbXBvcnRzIGNoYW5nZSFcblx0Z2V0IHJ1bGVzKCkge1xuXHRcdGlmICghdGhpcy5fX3J1bGVzKSB7XG5cdFx0XHRsZXQgb3V0cHV0ID0gdGhpcy5fX3J1bGVzID0ge307XG5cdFx0XHQvLyBGb3IgZWFjaCBwYXJzZXJcblx0XHRcdHRoaXMuaW1wb3J0cy5mb3JFYWNoKHBhcnNlciA9PiB7XG5cdFx0XHRcdC8vIE1lcmdlIHJ1bGVzIGludG8gYW4gQWx0ZXJuYXRpdmVzIGluIG91dHB1dCBydWxlcy5cblx0XHRcdFx0Zm9yICh2YXIgcnVsZU5hbWUgaW4gcGFyc2VyLl9ydWxlcykge1xuXHRcdFx0XHRcdGxldCBydWxlID0gcGFyc2VyLl9ydWxlc1tydWxlTmFtZV07XG5cdFx0XHRcdFx0bGV0IGFsdGVybmF0aXZlcyA9IG91dHB1dFtydWxlTmFtZV0gfHwgKG91dHB1dFtydWxlTmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZSB9KSk7XG5cblx0XHRcdFx0XHRpZiAocnVsZSBpbnN0YW5jZW9mIFJ1bGUuQWx0ZXJuYXRpdmVzXG5cdFx0XHRcdFx0ICYmIHJ1bGUucnVsZU5hbWUgPT09IHJ1bGVOYW1lXG5cdFx0XHRcdFx0ICYmICFydWxlLmFyZ3VtZW50XG5cdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRydWxlLnJ1bGVzLmZvckVhY2goIGFsdGVybmF0aXZlID0+IGFsdGVybmF0aXZlcy5hZGRSdWxlKGFsdGVybmF0aXZlKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGFsdGVybmF0aXZlcy5hZGRSdWxlKHJ1bGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLl9fcnVsZXM7XG5cdH1cblxuXHQvLyBSZXR1cm4gQUxMIGluc3RhbmNlcyBvZiBuYW1lZCBydWxlLCBmb3IgdXMgYW5kIG91ciBpbXBvcnRzLlxuXHRnZXRSdWxlKHJ1bGVOYW1lKSB7XG5cdFx0bGV0IHJ1bGVzID0gW107XG5cdFx0bGV0IGltcG9ydHMgPSB0aGlzLmltcG9ydHMsIGluZGV4ID0gMCwgcGFyc2VyO1xuXHRcdHdoaWxlIChwYXJzZXIgPSBpbXBvcnRzW2luZGV4KytdKSB7XG5cdFx0XHRpZiAocGFyc2VyLl9ydWxlc1tydWxlTmFtZV0pIHJ1bGVzLnB1c2gocGFyc2VyLl9ydWxlc1tydWxlTmFtZV0pO1xuXHRcdH1cblx0XHRyZXR1cm4gcnVsZXM7XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIGNvbmNhdGVuYXRlZCBibGFja2xpc3QgZm9yIGEgZ2l2ZW4gcnVsZS5cblx0Z2V0QmxhY2tsaXN0KHJ1bGVOYW1lKSB7XG5cdFx0bGV0IHJ1bGVzID0gdGhpcy5nZXRSdWxlKHJ1bGVOYW1lKTtcblx0XHRyZXR1cm4gcnVsZXMucmVkdWNlKGZ1bmN0aW9uIChibGFja2xpc3QsIHJ1bGUpIHtcblx0XHRcdHJldHVybiBPYmplY3QuYXNzaWduKGJsYWNrbGlzdCwgcnVsZS5ibGFja2xpc3QpO1xuXHRcdH0sIHt9KTtcblx0fVxuXG5cdC8vIEFkZCBhIGBydWxlYCB0byBvdXIgbGlzdCBvZiBydWxlcyFcblx0Ly8gQ29udmVydHMgdG8gYGFsdGVybmF0aXZlc2Agb24gcmUtZGVmaW5pbmcgdGhlIHNhbWUgcnVsZS5cblx0YWRkUnVsZShydWxlTmFtZSwgcnVsZSkge1xuXHRcdC8vIENsZWFyIG1lbW9pemVkIGBfX3J1bGVzYFxuXHRcdGRlbGV0ZSB0aGlzLl9fcnVsZXM7XG5cblx0XHQvLyBJZiBwYXNzZWQgYSBmdW5jdGlvbiwgY3JlYXRlIGFuIGluc3RhbmNlIGZvciB0aGUgYWN0dWFsIHJ1bGUuXG5cdFx0Ly8gVGhpcyBpcyBjb21tb25seSBkb25lIHNvIEpTIHdpbGwgZ2l2ZSB1cyBtZWFuaW5nZnVsIGNsYXNzIG5hbWVzIGluIGRlYnVnIG91dHB1dC5cblx0XHRpZiAodHlwZW9mIHJ1bGUgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0cnVsZSA9IG5ldyBydWxlKCk7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgd2UgZ290IGFuIGFycmF5IG9mIGBydWxlTmFtZXNgLCByZWN1cnNpdmVseSBhZGQgdW5kZXIgZWFjaCBuYW1lIHdpdGggdGhlIHNhbWUgYHJ1bGVgLlxuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVOYW1lKSkge1xuXHRcdFx0cnVsZU5hbWUuZm9yRWFjaChydWxlTmFtZSA9PiB0aGlzLmFkZFJ1bGUocnVsZU5hbWUsIHJ1bGUpICk7XG5cdFx0XHRyZXR1cm4gcnVsZTtcblx0XHR9XG5cblx0XHQvLyBTZXQgYHJ1bGVOYW1lYCBpZiBpdCBoYXNuJ3QgYmVlbiBleHBsaWNpdGx5IHNldC5cblx0XHRpZiAoIXJ1bGUucnVsZU5hbWUpIHJ1bGUucnVsZU5hbWUgPSBydWxlTmFtZTtcblxuXHRcdC8vIElmIGEgcnVsZSBvZiB0aGlzIG5hbWUgYWxyZWFkeSBleGlzdHNcblx0XHRjb25zdCBleGlzdGluZyA9IHRoaXMuX3J1bGVzW3J1bGVOYW1lXTtcblx0XHRpZiAoZXhpc3RpbmcpIHtcblx0XHRcdC8vIENvbnZlcnQgdG8gYW4gYEFsdGVybmF0aXZlc2AgaWYgbm90IG9uZSBhbHJlYWR5LlxuXHRcdFx0aWYgKCEoZXhpc3RpbmcgaW5zdGFuY2VvZiBSdWxlLkFsdGVybmF0aXZlcykpIHtcblx0XHRcdFx0aWYgKFBhcnNlci5ERUJVRykgY29uc29sZS5sb2coYENvbnZlcnRpbmcgcnVsZSAnJHtydWxlTmFtZX0nIHRvIGFsdGVybmF0aXZlc2ApO1xuXHRcdFx0XHR0aGlzLl9ydWxlc1tydWxlTmFtZV0gPSBuZXcgUnVsZS5BbHRlcm5hdGl2ZXMoeyBydWxlTmFtZSwgcnVsZXM6IFtleGlzdGluZ10gfSk7XG5cdFx0XHRcdC8vIGNvcHkgYXJndW1lbnQgbmFtZSBvdmVyICg/Pz8pXG5cdFx0XHRcdGlmIChleGlzdGluZy5hcmd1bWVudCkgdGhpcy5fcnVsZXNbcnVsZU5hbWVdLmFyZ3VtZW50ID0gZXhpc3RpbmcuYXJndW1lbnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoUGFyc2VyLkRFQlVHKSBjb25zb2xlLmxvZyhgQWRkaW5nIHJ1bGUgJyR7cnVsZS5ydWxlTmFtZX0nIHRvICcke3J1bGVOYW1lfSc6IGAsIHJ1bGUpO1xuXHRcdFx0Ly8gQWRkIHJ1bGUgdG8gdGhlIGFsdGVybmF0aXZlcy5cblx0XHRcdHRoaXMuX3J1bGVzW3J1bGVOYW1lXS5hZGRSdWxlKHJ1bGUpO1xuXHRcdH1cblx0XHQvLyBPdGhlcndpc2UganVzdCByZW1lbWJlciB0aGUgcnVsZS5cblx0XHRlbHNlIHtcblx0XHRcdHRoaXMuX3J1bGVzW3J1bGVOYW1lXSA9IHJ1bGU7XG5cdFx0fVxuXG5cblx0XHQvLyBtYWtlIGEgbm90ZSBpZiB3ZSdyZSBhZGRpbmcgYSBsZWZ0LXJlY3Vyc2l2ZSBydWxlXG4vL1RPRE86IHRoaXMgZG9lc24ndCBmbHkgaWYgYWRkaW5nIHVuZGVyIG11bHRpcGxlIG5hbWVzLi4uICA6LShcblx0XHRpZiAoUGFyc2VyLnJ1bGVJc0xlZnRSZWN1cnNpdmUocnVsZU5hbWUsIHJ1bGUpKSB7XG5cdFx0XHRpZiAoIXJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEVycm9yIGRlZmluaW5nIHJ1bGUgJyR7cnVsZU5hbWV9JzogT25seSBTZXF1ZW5jZSBydWxlcyBjYW4gYmUgbGVmdFJlY3VzaXZlYCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBZb3UgbXVzdCBkZWZpbmUgYSBgdGVzdFJ1bGVgIGZvciBsZWZ0IHJlY3Vyc2l2ZSBzZXF1ZW5jZXMuXG5cdFx0XHQvLyBlLmcuIGB0ZXN0UnVsZSA9IG5ldyBSdWxlLk1hdGNoKHsgbWF0Y2g6IFtcInNvbWV0aGluZ1wiXSB9KWBcblx0XHRcdGlmICghcnVsZS50ZXN0UnVsZSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFcnJvciBkZWZpbmluZyBydWxlICcke3J1bGUucnVsZU5hbWV9JzogWW91IG11c3QgZGVmaW5lIGEgJ3Rlc3RSdWxlJyBmb3IgbGVmdFJlY3VzaXZlIHJ1bGVzLmApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKFBhcnNlci5ERUJVRykgY29uc29sZS5pbmZvKFwibWFya2luZyBcIiwgcnVsZSwgXCIgYXMgbGVmdCByZWN1cnNpdmUhXCIpO1xuXG5cdFx0XHRydWxlLmxlZnRSZWN1cnNpdmUgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9XG5cblxuLy9cbi8vICMjIyBQYXJzZXIgcmVnaXN0cnkuXG4vL1xuXHRzdGF0aWMgUkVHSVNUUlkgPSB7fTtcblxuXHQvLyBHZXQgYSBwYXJzZXIgZm9yIGEgZ2l2ZW4gYGNvbnRleHROYW1lYC5cblx0Ly8gV2lsbCByZS11c2UgZXhpc3RpbmcgcGFyc2VyLCBvciBjcmVhdGUgYSBuZXcgb25lIGlmIG5vdCBhbHJlYWR5IGRlZmluZWQuXG5cdHN0YXRpYyBmb3JDb250ZXh0KGNvbnRleHROYW1lKSB7XG5cdFx0aWYgKCFQYXJzZXIuUkVHSVNUUllbY29udGV4dE5hbWVdKSB7XG5cdFx0XHRQYXJzZXIuUkVHSVNUUllbY29udGV4dE5hbWVdID0gbmV3IFBhcnNlcih7IGNvbnRleHROYW1lIH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gUGFyc2VyLlJFR0lTVFJZW2NvbnRleHROYW1lXTtcblx0fVxuXG5cdC8vIFJldHVybiBhIHBhcnNlciBmb3IgYGNvbnRleHROYW1lYCBvciB0aHJvdyBhbiBleGNlcHRpb24gaWYgbm90IGZvdW5kLlxuXHRzdGF0aWMgZ2V0Q29udGV4dE9yRGllKGNvbnRleHROYW1lKSB7XG5cdFx0aWYgKFBhcnNlci5SRUdJU1RSWVtjb250ZXh0TmFtZV0pIHJldHVybiBQYXJzZXIuUkVHSVNUUllbY29udGV4dE5hbWVdO1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYFBhcnNlci5nZXRDb250ZXh0T3JEaWUoKTogY29udGV4dE5hbWUgJyR7Y29udGV4dE5hbWV9JyBub3QgZm91bmQuYCk7XG5cdH1cblxuXG5cbi8vXG4vLyAjIyBVdGlsaXR5IG1ldGhvZHNcbi8vXG5cblx0Ly8gSXMgdGhlIHNwZWNpZmllZCBydWxlIGxlZnQtcmVjdXJzaXZlP1xuXHQvLyBUcnVlIGZvciBzZXF1ZW5jZXMgd2hlcmUgdGhlIGZpcnN0IG5vbi1vcHRpb25hbCBydWxlIHJlY3Vyc2l2ZWx5IGNhbGxzIGBydWxlTmFtZWAuXG5cdHN0YXRpYyBydWxlSXNMZWZ0UmVjdXJzaXZlKHJ1bGVOYW1lLCBydWxlKSB7XG5cdFx0aWYgKCEocnVsZSBpbnN0YW5jZW9mIFJ1bGUuU2VxdWVuY2UpIHx8ICFydWxlLnJ1bGVzKSByZXR1cm4gZmFsc2U7XG4vL2NvbnNvbGUubG9nKHJ1bGVOYW1lLCBydWxlKTtcblx0XHRsZXQgaW5kZXggPSAwLCBzdWJydWxlID0gdW5kZWZpbmVkO1xuXHRcdHdoaWxlIChzdWJydWxlID0gcnVsZS5ydWxlc1tpbmRleCsrXSkge1xuXHRcdFx0Ly8gaWdub3JlIG9wdGlvbmFsIHJ1bGVzXG5cdFx0XHRpZiAoc3VicnVsZS5vcHRpb25hbCkgY29udGludWU7XG5cdFx0XHRpZiAoc3VicnVsZSBpbnN0YW5jZW9mIFJ1bGUuU3VicnVsZSAmJiBzdWJydWxlLnJ1bGUgPT09IHJ1bGVOYW1lKSByZXR1cm4gdHJ1ZTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gRmluZCB0aGUgbWF0Y2hpbmcgaW5zdGFuY2Ugb2YgcG9zc2libHkgbmVzdGVkIGBlbmRUb2tlbmAgdG8gYmFsYW5jZSBgc3RhcnRUb2tlbmBcblx0Ly9cdGluIGFycmF5IG9mIGB0b2tlbnNgIChzdHJpbmdzKS5cblx0Ly8gSWYgc3VjY2Vzc2Z1bCwgcmV0dXJucyBgeyBzdGFydCwgZW5kLCBzbGljZSB9YFxuXHQvLyBUaHJvd3MgaWYgdW5zdWNlc3NmdWwuXG5cdHN0YXRpYyBmaW5kTmVzdGVkVG9rZW5zKHRva2Vucywgc3RhcnRUb2tlbiwgZW5kVG9rZW4sIHN0YXJ0ID0gMCkge1xuXHRcdGlmICh0b2tlbnNbc3RhcnRdICE9PSBzdGFydFRva2VuKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYEV4cGVjdGVkICcke3N0YXJ0VG9rZW59JyBhdCBpbmRleCAke3N0YXJ0fSBvZiB0b2tlbnNgKTtcblx0XHRsZXQgbmVzdGluZyA9IDA7XG5cdFx0bGV0IG5lc3RlZCA9IGZhbHNlO1xuXHRcdGZvciAobGV0IGVuZCA9IHN0YXJ0ICsgMSwgbGFzdEluZGV4ID0gdG9rZW5zLmxlbmd0aDsgZW5kIDwgbGFzdEluZGV4OyBlbmQrKykge1xuXHRcdFx0bGV0IHRva2VuID0gdG9rZW5zW2VuZF07XG5cdFx0XHRpZiAodG9rZW4gPT09IHN0YXJ0VG9rZW4pIHtcblx0XHRcdFx0bmVzdGluZysrO1xuXHRcdFx0XHRuZXN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRva2VuID09PSBlbmRUb2tlbikge1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMClcblx0XHRcdFx0XHRyZXR1cm4geyBzdGFydCwgZW5kLCBzbGljZTogdG9rZW5zLnNsaWNlKHN0YXJ0KzEsIGVuZCksIG5lc3RlZCB9O1xuXHRcdFx0XHRuZXN0aW5nLS07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgQ291bGRuJ3QgZmluZCBtYXRjaGluZyAnJHtlbmRUb2tlbn0ncyBzdGFydGluZyBhdCBpdGVtICR7c3RhcnR9YCk7XG5cdH1cblxuXG5cdC8vIExpc3Qgb2Ygc3BlY2lhbCBjaGFyYWN0ZXJzIGluIHJlZ3VsYXIgZXhwcmVzc2lvbnMuXG5cdC8vIFVzZWQgdG8gZXNjYXBlIHRob3NlIGNoYXJzIHdoZW4gY3JlYXRpbmcgcmVndWxhciBleHByZXNzaW9ucyBmcm9tIHN0cmluZ3MuXG5cdHN0YXRpYyBSRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTID0gKGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IGNoYXJzID0ge307XG5cdFx0XCJcXFxcL14kKis/LigpfHt9LFtdXCIuc3BsaXQoXCJcIikuZm9yRWFjaChjaGFyID0+IGNoYXJzW2NoYXJdID0gdHJ1ZSk7XG5cdFx0cmV0dXJuIGNoYXJzO1xuXHR9KSgpXG5cblx0Ly8gR2l2ZW4gYSBcIm5vcm1hbFwiIGBzdHJpbmdgLCBlc2NhcGUgYW55IHJlZ3VsYXIgZXhwcmVzc2lvbiBzcGVjaWFsIGNoYXJhY3RlcnNcblx0Ly9cdHNvIHdlIGNhbiBjcmVhdGUgYSBgbmV3IFJlZ0V4cCgpYC5cblx0Ly8gQWxzbyBjb252ZXJ0cyBhIHNpbmdsZSBzcGFjZSB0byBhcmJpdHJhcnkgc2V0IG9mIHNwYWNlcyB3aXRoIFwiXFxzK1wiXG5cdHN0YXRpYyBlc2NhcGVSZWdFeHBDaGFyYWN0ZXJzKHN0cmluZykge1xuXHRcdHJldHVybiBzdHJpbmcuc3BsaXQoXCJcIikubWFwKGZ1bmN0aW9uIChjaGFyLCBpbmRleCwgbGlzdCkge1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBiYWNrc2xhc2hcblx0XHRcdGlmIChjaGFyID09PSBcIlxcXFxcIikgcmV0dXJuIFwiXFxcXFwiO1xuXHRcdFx0Ly8gU3BlY2lhbCBjYXNlIGZvciBzcGFjZVxuXHRcdFx0aWYgKGNoYXIgPT09IFwiIFwiKSByZXR1cm4gXCJcXFxccytcIjtcblx0XHRcdC8vIElmIGEgc3BlY2lhbCBjaGFyIGFuZCBwcmV2aW91cyBjaGFyYWN0ZXIgd2FzIG5vdCBhbiBlc2NhcGUsIGVzY2FwZSB0aGUgcmVzdWx0LlxuXHRcdFx0aWYgKFBhcnNlci5SRUdFWFBfU1BFQ0lBTF9DSEFSQUNURVJTW2NoYXJdICYmIGxpc3RbaW5kZXgtMV0gIT09IFwiXFxcXFwiKSByZXR1cm4gXCJcXFxcXCIrY2hhcjtcblx0XHRcdC8vIFRoaXMgY2hhciBzaG91bGQgYmUgZmluZSBieSBpdHNlbGYuXG5cdFx0XHRyZXR1cm4gY2hhcjtcblx0XHR9KS5qb2luKFwiXCIpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgbmV3IHJlZ3VsYXIgZXhwcmVzc2lvbiBmcm9tIGEgXCJub3JtYWxcIiBzdHJpbmcsIGVzY2FwaW5nIHNwZWNpYWwgY2hhcmFjdGVycyBhcyBuZWNlc3NhcnkuXG5cdHN0YXRpYyBSZWdFeHBGcm9tU3RyaW5nKHN0cmluZywgZmxhZ3MpIHtcblx0XHRyZXR1cm4gbmV3IFJlZ0V4cChQYXJzZXIuZXNjYXBlUmVnRXhwQ2hhcmFjdGVycyhzdHJpbmcpLCBmbGFncyk7XG5cdH1cblxufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvUGFyc2VyLmpzIiwiZnVuY3Rpb24gX3RvQ29uc3VtYWJsZUFycmF5KGFycikgeyBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7IGZvciAodmFyIGkgPSAwLCBhcnIyID0gQXJyYXkoYXJyLmxlbmd0aCk7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHsgYXJyMltpXSA9IGFycltpXTsgfSByZXR1cm4gYXJyMjsgfSBlbHNlIHsgcmV0dXJuIEFycmF5LmZyb20oYXJyKTsgfSB9XG5cbi8qIGVzbGludC1kaXNhYmxlIG5vLXVzZS1iZWZvcmUtZGVmaW5lICovXG4vKipcbiAqIEBtb2R1bGUgZXZlbnRIYW5kbGVyc1xuICpcbiAqL1xuaW1wb3J0IGRvbUhlbHBlcnMgZnJvbSAnLi9saWIvZG9tX2hlbHBlcnMnO1xuaW1wb3J0IGxpc3RlbmVycyBmcm9tICcuL2xpYi9saXN0ZW5lcnMnO1xuaW1wb3J0IHN0b3JlIGZyb20gJy4vc3RvcmUnO1xuXG4vKipcbiAqIHByaXZhdGVcbiAqXG4gKi9cblxuLyoqXG4gKiBfb25DbGlja1xuICpcbiAqIEBhY2Nlc3MgcHJpdmF0ZVxuICogQHBhcmFtIHtvYmplY3R9IGV2ZW50IFRoZSBjbGljayBldmVudCBvYmplY3RcbiAqIEBwYXJhbSB7b2JqZWN0fSBldmVudC50YXJnZXQgVGhlIERPTSBub2RlIGZyb20gdGhlIGNsaWNrIGV2ZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBfb25DbGljayhfcmVmKSB7XG4gIHZhciB0YXJnZXQgPSBfcmVmLnRhcmdldDtcblxuICBzdG9yZS5hY3RpdmF0ZShbXS5jb25jYXQoX3RvQ29uc3VtYWJsZUFycmF5KHN0b3JlLmdldEluc3RhbmNlcygpKSkucmVkdWNlKGRvbUhlbHBlcnMuZmluZENvbnRhaW5lck5vZGVzKHRhcmdldCksIFtdKS5zb3J0KGRvbUhlbHBlcnMuc29ydEJ5RE9NUG9zaXRpb24pLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgIHJldHVybiBpdGVtLmluc3RhbmNlO1xuICB9KSk7XG59XG5cbi8qKlxuICogX29uS2V5RG93bjogVGhlIGtleWRvd24gZXZlbnQgY2FsbGJhY2tcbiAqXG4gKiBAYWNjZXNzIHByaXZhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBldmVudCBUaGUga2V5ZG93biBldmVudCBvYmplY3RcbiAqIEBwYXJhbSB7bnVtYmVyfSBldmVudC53aGljaCBUaGUga2V5IGNvZGUgKHdoaWNoKSByZWNlaXZlZCBmcm9tIHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBfb25LZXlEb3duKGV2ZW50KSB7XG4gIHZhciBmb3JjZUNvbnNpZGVyID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiBmYWxzZTtcblxuICBpZiAoZm9yY2VDb25zaWRlciB8fCBfc2hvdWxkQ29uc2lkZXIoZXZlbnQpKSB7XG4gICAgdmFyIF9yZWYyID0gc3RvcmUuZmluZEJpbmRpbmdGb3JFdmVudChldmVudCkgfHwge30sXG4gICAgICAgIGZuID0gX3JlZjIuZm4sXG4gICAgICAgIGluc3RhbmNlID0gX3JlZjIuaW5zdGFuY2U7XG5cbiAgICBpZiAoZm4pIHtcbiAgICAgIGZuLmNhbGwoaW5zdGFuY2UsIGV2ZW50KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogX3Nob3VsZENvbnNpZGVyOiBDb25kaXRpb25zIGZvciBwcm9jZWVkaW5nIHdpdGgga2V5IGV2ZW50IGhhbmRsaW5nXG4gKlxuICogQGFjY2VzcyBwcml2YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gZXZlbnQgVGhlIGtleWRvd24gZXZlbnQgb2JqZWN0XG4gKiBAcGFyYW0ge29iamVjdH0gZXZlbnQudGFyZ2V0IFRoZSBub2RlIG9yaWdpbiBvZiB0aGUgZXZlbnRcbiAqIEByZXR1cm4ge2Jvb2xlYW59IFdoZXRoZXIgdG8gY29udGludWUgcHJvY2VzaW5nIHRoZSBrZXlkb3duIGV2ZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBfc2hvdWxkQ29uc2lkZXIoX3JlZjMpIHtcbiAgdmFyIGN0cmxLZXkgPSBfcmVmMy5jdHJsS2V5LFxuICAgICAgdGFyZ2V0ID0gX3JlZjMudGFyZ2V0O1xuXG4gIHJldHVybiBjdHJsS2V5IHx8ICF+WydJTlBVVCcsICdTRUxFQ1QnLCAnVEVYVEFSRUEnXS5pbmRleE9mKHRhcmdldC50YWdOYW1lKSB8fCB0YXJnZXQuZ2V0QXR0cmlidXRlKCdyb2xlJykgIT09ICd0ZXh0Ym94Jztcbn1cblxuLyoqXG4gKiBwdWJsaWNcbiAqXG4gKi9cblxuLyoqXG4gKiBvbk1vdW50XG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gb25Nb3VudChpbnN0YW5jZSkge1xuICAvLyBoYXZlIHRvIGJ1bXAgdGhpcyB0byBuZXh0IGV2ZW50IGxvb3AgYmVjYXVzZSBjb21wb25lbnQgbW91bnRpbmcgcm91dGluZWx5XG4gIC8vIHByZWNlZWRzIHRoZSBkb20gY2xpY2sgZXZlbnQgdGhhdCB0cmlnZ2VyZWQgdGhlIG1vdW50ICh3dGY/KVxuICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gc3RvcmUuYWN0aXZhdGUoaW5zdGFuY2UpO1xuICB9LCAwKTtcbiAgbGlzdGVuZXJzLmJpbmRLZXlzKF9vbktleURvd24pO1xuICBsaXN0ZW5lcnMuYmluZENsaWNrcyhfb25DbGljayk7XG4gIGRvbUhlbHBlcnMuYmluZEZvY3VzYWJsZXMoaW5zdGFuY2UsIHN0b3JlLmFjdGl2YXRlKTtcbn1cblxuLyoqXG4gKiBvblVubW91bnRcbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICovXG5mdW5jdGlvbiBvblVubW91bnQoaW5zdGFuY2UpIHtcbiAgc3RvcmUuZGVsZXRlSW5zdGFuY2UoaW5zdGFuY2UpO1xuICBpZiAoc3RvcmUuaXNFbXB0eSgpKSB7XG4gICAgbGlzdGVuZXJzLnVuYmluZENsaWNrcyhfb25DbGljayk7XG4gICAgbGlzdGVuZXJzLnVuYmluZEtleXMoX29uS2V5RG93bik7XG4gIH1cbn1cblxuZXhwb3J0IHsgb25Nb3VudCwgb25Vbm1vdW50IH07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvZXZlbnRfaGFuZGxlcnMuanNcbi8vIG1vZHVsZSBpZCA9IDI4MVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJpbXBvcnQgeyBtb2RpZmllcnMgYXMgbW9kaWZpZXJLZXlzIH0gZnJvbSAnLi9rZXlzJztcblxudmFyIG1vZEtleXMgPSBPYmplY3Qua2V5cyhtb2RpZmllcktleXMpO1xuXG5mdW5jdGlvbiBtYXRjaEtleXMoX3JlZikge1xuICB2YXIgX3JlZiRrZXlTZXQgPSBfcmVmLmtleVNldCxcbiAgICAgIGtleSA9IF9yZWYka2V5U2V0LmtleSxcbiAgICAgIF9yZWYka2V5U2V0JG1vZGlmaWVycyA9IF9yZWYka2V5U2V0Lm1vZGlmaWVycyxcbiAgICAgIG1vZGlmaWVycyA9IF9yZWYka2V5U2V0JG1vZGlmaWVycyA9PT0gdW5kZWZpbmVkID8gW10gOiBfcmVmJGtleVNldCRtb2RpZmllcnMsXG4gICAgICBldmVudCA9IF9yZWYuZXZlbnQ7XG5cbiAgdmFyIGtleXNNYXRjaCA9IGZhbHNlO1xuICBpZiAoa2V5ID09PSBldmVudC53aGljaCkge1xuICAgIHZhciBldnRNb2RLZXlzID0gbW9kS2V5cy5maWx0ZXIoZnVuY3Rpb24gKG1vZEtleSkge1xuICAgICAgcmV0dXJuIGV2ZW50W21vZEtleSArICdLZXknXTtcbiAgICB9KS5zb3J0KCk7XG4gICAga2V5c01hdGNoID0gbW9kaWZpZXJzLmxlbmd0aCA9PT0gZXZ0TW9kS2V5cy5sZW5ndGggJiYgbW9kaWZpZXJzLmV2ZXJ5KGZ1bmN0aW9uIChtb2RLZXksIGluZGV4KSB7XG4gICAgICByZXR1cm4gZXZ0TW9kS2V5c1tpbmRleF0gPT09IG1vZEtleTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4ga2V5c01hdGNoO1xufVxuXG5leHBvcnQgZGVmYXVsdCBtYXRjaEtleXM7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL21hdGNoX2tleXMuanNcbi8vIG1vZHVsZSBpZCA9IDI4MlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJpbXBvcnQgS2V5cywgeyBtb2RpZmllcnMgfSBmcm9tICcuL2tleXMnO1xuXG5mdW5jdGlvbiBwYXJzZUtleXMoa2V5c0FycmF5KSB7XG4gIHJldHVybiBrZXlzQXJyYXkubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICB2YXIga2V5U2V0ID0geyBrZXk6IGtleSB9O1xuICAgIGlmICh0eXBlb2Yga2V5ID09PSAnc3RyaW5nJykge1xuICAgICAgdmFyIGtleVN0cmluZyA9IGtleS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgICAgIHZhciBtYXRjaGVzID0ga2V5U3RyaW5nLnNwbGl0KC9cXHM/XFwrXFxzPy8pO1xuICAgICAga2V5U2V0ID0gbWF0Y2hlcy5sZW5ndGggPT09IDEgPyB7IGtleTogS2V5c1trZXlTdHJpbmddIH0gOiB7XG4gICAgICAgIGtleTogS2V5c1ttYXRjaGVzLnBvcCgpXSxcbiAgICAgICAgbW9kaWZpZXJzOiBtYXRjaGVzLm1hcChmdW5jdGlvbiAobW9kS2V5KSB7XG4gICAgICAgICAgcmV0dXJuIG1vZGlmaWVyc1ttb2RLZXldO1xuICAgICAgICB9KS5zb3J0KClcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBrZXlTZXQ7XG4gIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBwYXJzZUtleXM7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL3BhcnNlX2tleXMuanNcbi8vIG1vZHVsZSBpZCA9IDI4M1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKlxuXHRNSVQgTGljZW5zZSBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuXHRBdXRob3IgVG9iaWFzIEtvcHBlcnMgQHNva3JhXG4qL1xudmFyIHN0eWxlc0luRG9tID0ge30sXG5cdG1lbW9pemUgPSBmdW5jdGlvbihmbikge1xuXHRcdHZhciBtZW1vO1xuXHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAodHlwZW9mIG1lbW8gPT09IFwidW5kZWZpbmVkXCIpIG1lbW8gPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdFx0cmV0dXJuIG1lbW87XG5cdFx0fTtcblx0fSxcblx0aXNPbGRJRSA9IG1lbW9pemUoZnVuY3Rpb24oKSB7XG5cdFx0Ly8gVGVzdCBmb3IgSUUgPD0gOSBhcyBwcm9wb3NlZCBieSBCcm93c2VyaGFja3Ncblx0XHQvLyBAc2VlIGh0dHA6Ly9icm93c2VyaGFja3MuY29tLyNoYWNrLWU3MWQ4NjkyZjY1MzM0MTczZmVlNzE1YzIyMmNiODA1XG5cdFx0Ly8gVGVzdHMgZm9yIGV4aXN0ZW5jZSBvZiBzdGFuZGFyZCBnbG9iYWxzIGlzIHRvIGFsbG93IHN0eWxlLWxvYWRlciBcblx0XHQvLyB0byBvcGVyYXRlIGNvcnJlY3RseSBpbnRvIG5vbi1zdGFuZGFyZCBlbnZpcm9ubWVudHNcblx0XHQvLyBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrLWNvbnRyaWIvc3R5bGUtbG9hZGVyL2lzc3Vlcy8xNzdcblx0XHRyZXR1cm4gd2luZG93ICYmIGRvY3VtZW50ICYmIGRvY3VtZW50LmFsbCAmJiAhd2luZG93LmF0b2I7XG5cdH0pLFxuXHRnZXRFbGVtZW50ID0gKGZ1bmN0aW9uKGZuKSB7XG5cdFx0dmFyIG1lbW8gPSB7fTtcblx0XHRyZXR1cm4gZnVuY3Rpb24oc2VsZWN0b3IpIHtcblx0XHRcdGlmICh0eXBlb2YgbWVtb1tzZWxlY3Rvcl0gPT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdFx0bWVtb1tzZWxlY3Rvcl0gPSBmbi5jYWxsKHRoaXMsIHNlbGVjdG9yKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBtZW1vW3NlbGVjdG9yXVxuXHRcdH07XG5cdH0pKGZ1bmN0aW9uIChzdHlsZVRhcmdldCkge1xuXHRcdHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHN0eWxlVGFyZ2V0KVxuXHR9KSxcblx0c2luZ2xldG9uRWxlbWVudCA9IG51bGwsXG5cdHNpbmdsZXRvbkNvdW50ZXIgPSAwLFxuXHRzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcCA9IFtdLFxuXHRmaXhVcmxzID0gcmVxdWlyZShcIi4vZml4VXJsc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihsaXN0LCBvcHRpb25zKSB7XG5cdGlmKHR5cGVvZiBERUJVRyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBERUJVRykge1xuXHRcdGlmKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IEVycm9yKFwiVGhlIHN0eWxlLWxvYWRlciBjYW5ub3QgYmUgdXNlZCBpbiBhIG5vbi1icm93c2VyIGVudmlyb25tZW50XCIpO1xuXHR9XG5cblx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdG9wdGlvbnMuYXR0cnMgPSB0eXBlb2Ygb3B0aW9ucy5hdHRycyA9PT0gXCJvYmplY3RcIiA/IG9wdGlvbnMuYXR0cnMgOiB7fTtcblxuXHQvLyBGb3JjZSBzaW5nbGUtdGFnIHNvbHV0aW9uIG9uIElFNi05LCB3aGljaCBoYXMgYSBoYXJkIGxpbWl0IG9uIHRoZSAjIG9mIDxzdHlsZT5cblx0Ly8gdGFncyBpdCB3aWxsIGFsbG93IG9uIGEgcGFnZVxuXHRpZiAodHlwZW9mIG9wdGlvbnMuc2luZ2xldG9uID09PSBcInVuZGVmaW5lZFwiKSBvcHRpb25zLnNpbmdsZXRvbiA9IGlzT2xkSUUoKTtcblxuXHQvLyBCeSBkZWZhdWx0LCBhZGQgPHN0eWxlPiB0YWdzIHRvIHRoZSA8aGVhZD4gZWxlbWVudFxuXHRpZiAodHlwZW9mIG9wdGlvbnMuaW5zZXJ0SW50byA9PT0gXCJ1bmRlZmluZWRcIikgb3B0aW9ucy5pbnNlcnRJbnRvID0gXCJoZWFkXCI7XG5cblx0Ly8gQnkgZGVmYXVsdCwgYWRkIDxzdHlsZT4gdGFncyB0byB0aGUgYm90dG9tIG9mIHRoZSB0YXJnZXRcblx0aWYgKHR5cGVvZiBvcHRpb25zLmluc2VydEF0ID09PSBcInVuZGVmaW5lZFwiKSBvcHRpb25zLmluc2VydEF0ID0gXCJib3R0b21cIjtcblxuXHR2YXIgc3R5bGVzID0gbGlzdFRvU3R5bGVzKGxpc3QsIG9wdGlvbnMpO1xuXHRhZGRTdHlsZXNUb0RvbShzdHlsZXMsIG9wdGlvbnMpO1xuXG5cdHJldHVybiBmdW5jdGlvbiB1cGRhdGUobmV3TGlzdCkge1xuXHRcdHZhciBtYXlSZW1vdmUgPSBbXTtcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgc3R5bGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgaXRlbSA9IHN0eWxlc1tpXTtcblx0XHRcdHZhciBkb21TdHlsZSA9IHN0eWxlc0luRG9tW2l0ZW0uaWRdO1xuXHRcdFx0ZG9tU3R5bGUucmVmcy0tO1xuXHRcdFx0bWF5UmVtb3ZlLnB1c2goZG9tU3R5bGUpO1xuXHRcdH1cblx0XHRpZihuZXdMaXN0KSB7XG5cdFx0XHR2YXIgbmV3U3R5bGVzID0gbGlzdFRvU3R5bGVzKG5ld0xpc3QsIG9wdGlvbnMpO1xuXHRcdFx0YWRkU3R5bGVzVG9Eb20obmV3U3R5bGVzLCBvcHRpb25zKTtcblx0XHR9XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IG1heVJlbW92ZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGRvbVN0eWxlID0gbWF5UmVtb3ZlW2ldO1xuXHRcdFx0aWYoZG9tU3R5bGUucmVmcyA9PT0gMCkge1xuXHRcdFx0XHRmb3IodmFyIGogPSAwOyBqIDwgZG9tU3R5bGUucGFydHMubGVuZ3RoOyBqKyspXG5cdFx0XHRcdFx0ZG9tU3R5bGUucGFydHNbal0oKTtcblx0XHRcdFx0ZGVsZXRlIHN0eWxlc0luRG9tW2RvbVN0eWxlLmlkXTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG59O1xuXG5mdW5jdGlvbiBhZGRTdHlsZXNUb0RvbShzdHlsZXMsIG9wdGlvbnMpIHtcblx0Zm9yKHZhciBpID0gMDsgaSA8IHN0eWxlcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBpdGVtID0gc3R5bGVzW2ldO1xuXHRcdHZhciBkb21TdHlsZSA9IHN0eWxlc0luRG9tW2l0ZW0uaWRdO1xuXHRcdGlmKGRvbVN0eWxlKSB7XG5cdFx0XHRkb21TdHlsZS5yZWZzKys7XG5cdFx0XHRmb3IodmFyIGogPSAwOyBqIDwgZG9tU3R5bGUucGFydHMubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0ZG9tU3R5bGUucGFydHNbal0oaXRlbS5wYXJ0c1tqXSk7XG5cdFx0XHR9XG5cdFx0XHRmb3IoOyBqIDwgaXRlbS5wYXJ0cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRkb21TdHlsZS5wYXJ0cy5wdXNoKGFkZFN0eWxlKGl0ZW0ucGFydHNbal0sIG9wdGlvbnMpKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIHBhcnRzID0gW107XG5cdFx0XHRmb3IodmFyIGogPSAwOyBqIDwgaXRlbS5wYXJ0cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRwYXJ0cy5wdXNoKGFkZFN0eWxlKGl0ZW0ucGFydHNbal0sIG9wdGlvbnMpKTtcblx0XHRcdH1cblx0XHRcdHN0eWxlc0luRG9tW2l0ZW0uaWRdID0ge2lkOiBpdGVtLmlkLCByZWZzOiAxLCBwYXJ0czogcGFydHN9O1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBsaXN0VG9TdHlsZXMobGlzdCwgb3B0aW9ucykge1xuXHR2YXIgc3R5bGVzID0gW107XG5cdHZhciBuZXdTdHlsZXMgPSB7fTtcblx0Zm9yKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgaXRlbSA9IGxpc3RbaV07XG5cdFx0dmFyIGlkID0gb3B0aW9ucy5iYXNlID8gaXRlbVswXSArIG9wdGlvbnMuYmFzZSA6IGl0ZW1bMF07XG5cdFx0dmFyIGNzcyA9IGl0ZW1bMV07XG5cdFx0dmFyIG1lZGlhID0gaXRlbVsyXTtcblx0XHR2YXIgc291cmNlTWFwID0gaXRlbVszXTtcblx0XHR2YXIgcGFydCA9IHtjc3M6IGNzcywgbWVkaWE6IG1lZGlhLCBzb3VyY2VNYXA6IHNvdXJjZU1hcH07XG5cdFx0aWYoIW5ld1N0eWxlc1tpZF0pXG5cdFx0XHRzdHlsZXMucHVzaChuZXdTdHlsZXNbaWRdID0ge2lkOiBpZCwgcGFydHM6IFtwYXJ0XX0pO1xuXHRcdGVsc2Vcblx0XHRcdG5ld1N0eWxlc1tpZF0ucGFydHMucHVzaChwYXJ0KTtcblx0fVxuXHRyZXR1cm4gc3R5bGVzO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucywgc3R5bGVFbGVtZW50KSB7XG5cdHZhciBzdHlsZVRhcmdldCA9IGdldEVsZW1lbnQob3B0aW9ucy5pbnNlcnRJbnRvKVxuXHRpZiAoIXN0eWxlVGFyZ2V0KSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGRuJ3QgZmluZCBhIHN0eWxlIHRhcmdldC4gVGhpcyBwcm9iYWJseSBtZWFucyB0aGF0IHRoZSB2YWx1ZSBmb3IgdGhlICdpbnNlcnRJbnRvJyBwYXJhbWV0ZXIgaXMgaW52YWxpZC5cIik7XG5cdH1cblx0dmFyIGxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wID0gc3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3Bbc3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3AubGVuZ3RoIC0gMV07XG5cdGlmIChvcHRpb25zLmluc2VydEF0ID09PSBcInRvcFwiKSB7XG5cdFx0aWYoIWxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wKSB7XG5cdFx0XHRzdHlsZVRhcmdldC5pbnNlcnRCZWZvcmUoc3R5bGVFbGVtZW50LCBzdHlsZVRhcmdldC5maXJzdENoaWxkKTtcblx0XHR9IGVsc2UgaWYobGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3AubmV4dFNpYmxpbmcpIHtcblx0XHRcdHN0eWxlVGFyZ2V0Lmluc2VydEJlZm9yZShzdHlsZUVsZW1lbnQsIGxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wLm5leHRTaWJsaW5nKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c3R5bGVUYXJnZXQuYXBwZW5kQ2hpbGQoc3R5bGVFbGVtZW50KTtcblx0XHR9XG5cdFx0c3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3AucHVzaChzdHlsZUVsZW1lbnQpO1xuXHR9IGVsc2UgaWYgKG9wdGlvbnMuaW5zZXJ0QXQgPT09IFwiYm90dG9tXCIpIHtcblx0XHRzdHlsZVRhcmdldC5hcHBlbmRDaGlsZChzdHlsZUVsZW1lbnQpO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdmFsdWUgZm9yIHBhcmFtZXRlciAnaW5zZXJ0QXQnLiBNdXN0IGJlICd0b3AnIG9yICdib3R0b20nLlwiKTtcblx0fVxufVxuXG5mdW5jdGlvbiByZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGVFbGVtZW50KSB7XG5cdHN0eWxlRWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHN0eWxlRWxlbWVudCk7XG5cdHZhciBpZHggPSBzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcC5pbmRleE9mKHN0eWxlRWxlbWVudCk7XG5cdGlmKGlkeCA+PSAwKSB7XG5cdFx0c3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3Auc3BsaWNlKGlkeCwgMSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlU3R5bGVFbGVtZW50KG9wdGlvbnMpIHtcblx0dmFyIHN0eWxlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcblx0b3B0aW9ucy5hdHRycy50eXBlID0gXCJ0ZXh0L2Nzc1wiO1xuXG5cdGF0dGFjaFRhZ0F0dHJzKHN0eWxlRWxlbWVudCwgb3B0aW9ucy5hdHRycyk7XG5cdGluc2VydFN0eWxlRWxlbWVudChvcHRpb25zLCBzdHlsZUVsZW1lbnQpO1xuXHRyZXR1cm4gc3R5bGVFbGVtZW50O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVMaW5rRWxlbWVudChvcHRpb25zKSB7XG5cdHZhciBsaW5rRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaW5rXCIpO1xuXHRvcHRpb25zLmF0dHJzLnR5cGUgPSBcInRleHQvY3NzXCI7XG5cdG9wdGlvbnMuYXR0cnMucmVsID0gXCJzdHlsZXNoZWV0XCI7XG5cblx0YXR0YWNoVGFnQXR0cnMobGlua0VsZW1lbnQsIG9wdGlvbnMuYXR0cnMpO1xuXHRpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucywgbGlua0VsZW1lbnQpO1xuXHRyZXR1cm4gbGlua0VsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIGF0dGFjaFRhZ0F0dHJzKGVsZW1lbnQsIGF0dHJzKSB7XG5cdE9iamVjdC5rZXlzKGF0dHJzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcblx0XHRlbGVtZW50LnNldEF0dHJpYnV0ZShrZXksIGF0dHJzW2tleV0pO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gYWRkU3R5bGUob2JqLCBvcHRpb25zKSB7XG5cdHZhciBzdHlsZUVsZW1lbnQsIHVwZGF0ZSwgcmVtb3ZlLCB0cmFuc2Zvcm1SZXN1bHQ7XG5cblx0Ly8gSWYgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gd2FzIGRlZmluZWQsIHJ1biBpdCBvbiB0aGUgY3NzXG5cdGlmIChvcHRpb25zLnRyYW5zZm9ybSAmJiBvYmouY3NzKSB7XG5cdCAgICB0cmFuc2Zvcm1SZXN1bHQgPSBvcHRpb25zLnRyYW5zZm9ybShvYmouY3NzKTtcblx0ICAgIFxuXHQgICAgaWYgKHRyYW5zZm9ybVJlc3VsdCkge1xuXHQgICAgXHQvLyBJZiB0cmFuc2Zvcm0gcmV0dXJucyBhIHZhbHVlLCB1c2UgdGhhdCBpbnN0ZWFkIG9mIHRoZSBvcmlnaW5hbCBjc3MuXG5cdCAgICBcdC8vIFRoaXMgYWxsb3dzIHJ1bm5pbmcgcnVudGltZSB0cmFuc2Zvcm1hdGlvbnMgb24gdGhlIGNzcy5cblx0ICAgIFx0b2JqLmNzcyA9IHRyYW5zZm9ybVJlc3VsdDtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICBcdC8vIElmIHRoZSB0cmFuc2Zvcm0gZnVuY3Rpb24gcmV0dXJucyBhIGZhbHN5IHZhbHVlLCBkb24ndCBhZGQgdGhpcyBjc3MuIFxuXHQgICAgXHQvLyBUaGlzIGFsbG93cyBjb25kaXRpb25hbCBsb2FkaW5nIG9mIGNzc1xuXHQgICAgXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdCAgICBcdFx0Ly8gbm9vcFxuXHQgICAgXHR9O1xuXHQgICAgfVxuXHR9XG5cblx0aWYgKG9wdGlvbnMuc2luZ2xldG9uKSB7XG5cdFx0dmFyIHN0eWxlSW5kZXggPSBzaW5nbGV0b25Db3VudGVyKys7XG5cdFx0c3R5bGVFbGVtZW50ID0gc2luZ2xldG9uRWxlbWVudCB8fCAoc2luZ2xldG9uRWxlbWVudCA9IGNyZWF0ZVN0eWxlRWxlbWVudChvcHRpb25zKSk7XG5cdFx0dXBkYXRlID0gYXBwbHlUb1NpbmdsZXRvblRhZy5iaW5kKG51bGwsIHN0eWxlRWxlbWVudCwgc3R5bGVJbmRleCwgZmFsc2UpO1xuXHRcdHJlbW92ZSA9IGFwcGx5VG9TaW5nbGV0b25UYWcuYmluZChudWxsLCBzdHlsZUVsZW1lbnQsIHN0eWxlSW5kZXgsIHRydWUpO1xuXHR9IGVsc2UgaWYob2JqLnNvdXJjZU1hcCAmJlxuXHRcdHR5cGVvZiBVUkwgPT09IFwiZnVuY3Rpb25cIiAmJlxuXHRcdHR5cGVvZiBVUkwuY3JlYXRlT2JqZWN0VVJMID09PSBcImZ1bmN0aW9uXCIgJiZcblx0XHR0eXBlb2YgVVJMLnJldm9rZU9iamVjdFVSTCA9PT0gXCJmdW5jdGlvblwiICYmXG5cdFx0dHlwZW9mIEJsb2IgPT09IFwiZnVuY3Rpb25cIiAmJlxuXHRcdHR5cGVvZiBidG9hID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRzdHlsZUVsZW1lbnQgPSBjcmVhdGVMaW5rRWxlbWVudChvcHRpb25zKTtcblx0XHR1cGRhdGUgPSB1cGRhdGVMaW5rLmJpbmQobnVsbCwgc3R5bGVFbGVtZW50LCBvcHRpb25zKTtcblx0XHRyZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpO1xuXHRcdFx0aWYoc3R5bGVFbGVtZW50LmhyZWYpXG5cdFx0XHRcdFVSTC5yZXZva2VPYmplY3RVUkwoc3R5bGVFbGVtZW50LmhyZWYpO1xuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0c3R5bGVFbGVtZW50ID0gY3JlYXRlU3R5bGVFbGVtZW50KG9wdGlvbnMpO1xuXHRcdHVwZGF0ZSA9IGFwcGx5VG9UYWcuYmluZChudWxsLCBzdHlsZUVsZW1lbnQpO1xuXHRcdHJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCk7XG5cdFx0fTtcblx0fVxuXG5cdHVwZGF0ZShvYmopO1xuXG5cdHJldHVybiBmdW5jdGlvbiB1cGRhdGVTdHlsZShuZXdPYmopIHtcblx0XHRpZihuZXdPYmopIHtcblx0XHRcdGlmKG5ld09iai5jc3MgPT09IG9iai5jc3MgJiYgbmV3T2JqLm1lZGlhID09PSBvYmoubWVkaWEgJiYgbmV3T2JqLnNvdXJjZU1hcCA9PT0gb2JqLnNvdXJjZU1hcClcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0dXBkYXRlKG9iaiA9IG5ld09iaik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlbW92ZSgpO1xuXHRcdH1cblx0fTtcbn1cblxudmFyIHJlcGxhY2VUZXh0ID0gKGZ1bmN0aW9uICgpIHtcblx0dmFyIHRleHRTdG9yZSA9IFtdO1xuXG5cdHJldHVybiBmdW5jdGlvbiAoaW5kZXgsIHJlcGxhY2VtZW50KSB7XG5cdFx0dGV4dFN0b3JlW2luZGV4XSA9IHJlcGxhY2VtZW50O1xuXHRcdHJldHVybiB0ZXh0U3RvcmUuZmlsdGVyKEJvb2xlYW4pLmpvaW4oJ1xcbicpO1xuXHR9O1xufSkoKTtcblxuZnVuY3Rpb24gYXBwbHlUb1NpbmdsZXRvblRhZyhzdHlsZUVsZW1lbnQsIGluZGV4LCByZW1vdmUsIG9iaikge1xuXHR2YXIgY3NzID0gcmVtb3ZlID8gXCJcIiA6IG9iai5jc3M7XG5cblx0aWYgKHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0KSB7XG5cdFx0c3R5bGVFbGVtZW50LnN0eWxlU2hlZXQuY3NzVGV4dCA9IHJlcGxhY2VUZXh0KGluZGV4LCBjc3MpO1xuXHR9IGVsc2Uge1xuXHRcdHZhciBjc3NOb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKTtcblx0XHR2YXIgY2hpbGROb2RlcyA9IHN0eWxlRWxlbWVudC5jaGlsZE5vZGVzO1xuXHRcdGlmIChjaGlsZE5vZGVzW2luZGV4XSkgc3R5bGVFbGVtZW50LnJlbW92ZUNoaWxkKGNoaWxkTm9kZXNbaW5kZXhdKTtcblx0XHRpZiAoY2hpbGROb2Rlcy5sZW5ndGgpIHtcblx0XHRcdHN0eWxlRWxlbWVudC5pbnNlcnRCZWZvcmUoY3NzTm9kZSwgY2hpbGROb2Rlc1tpbmRleF0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzdHlsZUVsZW1lbnQuYXBwZW5kQ2hpbGQoY3NzTm9kZSk7XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGFwcGx5VG9UYWcoc3R5bGVFbGVtZW50LCBvYmopIHtcblx0dmFyIGNzcyA9IG9iai5jc3M7XG5cdHZhciBtZWRpYSA9IG9iai5tZWRpYTtcblxuXHRpZihtZWRpYSkge1xuXHRcdHN0eWxlRWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJtZWRpYVwiLCBtZWRpYSlcblx0fVxuXG5cdGlmKHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0KSB7XG5cdFx0c3R5bGVFbGVtZW50LnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcblx0fSBlbHNlIHtcblx0XHR3aGlsZShzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCkge1xuXHRcdFx0c3R5bGVFbGVtZW50LnJlbW92ZUNoaWxkKHN0eWxlRWxlbWVudC5maXJzdENoaWxkKTtcblx0XHR9XG5cdFx0c3R5bGVFbGVtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUxpbmsobGlua0VsZW1lbnQsIG9wdGlvbnMsIG9iaikge1xuXHR2YXIgY3NzID0gb2JqLmNzcztcblx0dmFyIHNvdXJjZU1hcCA9IG9iai5zb3VyY2VNYXA7XG5cblx0LyogSWYgY29udmVydFRvQWJzb2x1dGVVcmxzIGlzbid0IGRlZmluZWQsIGJ1dCBzb3VyY2VtYXBzIGFyZSBlbmFibGVkXG5cdGFuZCB0aGVyZSBpcyBubyBwdWJsaWNQYXRoIGRlZmluZWQgdGhlbiBsZXRzIHR1cm4gY29udmVydFRvQWJzb2x1dGVVcmxzXG5cdG9uIGJ5IGRlZmF1bHQuICBPdGhlcndpc2UgZGVmYXVsdCB0byB0aGUgY29udmVydFRvQWJzb2x1dGVVcmxzIG9wdGlvblxuXHRkaXJlY3RseVxuXHQqL1xuXHR2YXIgYXV0b0ZpeFVybHMgPSBvcHRpb25zLmNvbnZlcnRUb0Fic29sdXRlVXJscyA9PT0gdW5kZWZpbmVkICYmIHNvdXJjZU1hcDtcblxuXHRpZiAob3B0aW9ucy5jb252ZXJ0VG9BYnNvbHV0ZVVybHMgfHwgYXV0b0ZpeFVybHMpe1xuXHRcdGNzcyA9IGZpeFVybHMoY3NzKTtcblx0fVxuXG5cdGlmKHNvdXJjZU1hcCkge1xuXHRcdC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI2NjAzODc1XG5cdFx0Y3NzICs9IFwiXFxuLyojIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxcIiArIGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHNvdXJjZU1hcCkpKSkgKyBcIiAqL1wiO1xuXHR9XG5cblx0dmFyIGJsb2IgPSBuZXcgQmxvYihbY3NzXSwgeyB0eXBlOiBcInRleHQvY3NzXCIgfSk7XG5cblx0dmFyIG9sZFNyYyA9IGxpbmtFbGVtZW50LmhyZWY7XG5cblx0bGlua0VsZW1lbnQuaHJlZiA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cblx0aWYob2xkU3JjKVxuXHRcdFVSTC5yZXZva2VPYmplY3RVUkwob2xkU3JjKTtcbn1cblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9zdHlsZS1sb2FkZXIvYWRkU3R5bGVzLmpzXG4vLyBtb2R1bGUgaWQgPSA0NTdcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiaW1wb3J0IHsgb2JzZXJ2ZXIgfSBmcm9tIFwibW9ieC1yZWFjdFwiO1xuaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IGtleWRvd24gZnJvbSBcInJlYWN0LWtleWRvd25cIjtcbmltcG9ydCB7IEJ1dHRvbiwgRHJvcGRvd24sIEdyaWQsIE1lbnUsIFNlZ21lbnQsIFRleHRBcmVhIH0gZnJvbSAnc2VtYW50aWMtdWktcmVhY3QnXG5cbmltcG9ydCBFeGFtcGxlU3RvcmUgZnJvbSBcIi4vRXhhbXBsZVN0b3JlXCI7XG5pbXBvcnQgU3BhY2VyIGZyb20gXCIuL1NwYWNlci5qc3hcIjtcbmltcG9ydCBcIi4vc3R5bGVzLmxlc3NcIjtcbmltcG9ydCBUYWJiYWJsZVRleHRBcmVhIGZyb20gXCIuL1RhYmJhYmxlVGV4dEFyZWEuanN4XCI7XG5cbkBvYnNlcnZlclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3BlbGxFZGl0b3IgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRzdGF0aWMgZGVmYXVsdFByb3BzID0ge1xuXHRcdGV4YW1wbGVzOiBuZXcgRXhhbXBsZVN0b3JlKClcblx0fTtcblxuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKTtcbndpbmRvdy5leGFtcGxlcyA9IHByb3BzLmV4YW1wbGVzO1xuXHRcdHRoaXMucHJvcHMuZXhhbXBsZXMubG9hZCgpO1xuXG5cdFx0Ly9ERUJVR1xuXHRcdHdpbmRvdy5zcGVsbEVkaXRvciA9IHRoaXM7XG5cdFx0d2luZG93LmV4YW1wbGVzID0gdGhpcy5wcm9wcy5leGFtcGxlcztcblx0fVxuXG5cdEBrZXlkb3duKFwiY3RybCtzXCIpXG5cdHNhdmUoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMuc2F2ZSgpOyB9XG5cblx0QGtleWRvd24oXCJjdHJsK3JcIilcblx0cmV2ZXJ0KCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLnJldmVydCgpOyB9XG5cblx0QGtleWRvd24oXCJjdHJsK2NcIilcblx0Y29tcGlsZSgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5jb21waWxlKCk7IH1cblxuXHRAa2V5ZG93bihcImN0cmwrblwiKVxuXHRjcmVhdGUoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMuY3JlYXRlKCk7IH1cblxuXHRAa2V5ZG93bihcImN0cmwrZFwiKVxuXHRkZWxldGUoKSB7IHRoaXMucHJvcHMuZXhhbXBsZXMuZGVsZXRlKHVuZGVmaW5lZCwgXCJDT05GSVJNXCIpOyB9XG5cblx0cmVuYW1lKCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLnJlbmFtZSgpOyB9XG5cdGR1cGxpY2F0ZSgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5kdXBsaWNhdGUoKTsgfVxuXHRsb2FkKCkgeyB0aGlzLnByb3BzLmV4YW1wbGVzLmxvYWQoKTsgfVxuXHRyZXNldCgpIHsgdGhpcy5wcm9wcy5leGFtcGxlcy5yZXNldCgpOyB9XG5cblxuXHRyZW5kZXIoKSB7XG5cdFx0bGV0IHsgZXhhbXBsZXMgfSA9IHRoaXMucHJvcHM7XG5cdFx0bGV0IHsgdGl0bGVzLCBzZWxlY3RlZCwgZGlydHksIGNvZGUsIG91dHB1dCB9ID0gZXhhbXBsZXM7XG5cblx0XHQvLyBDcmVhdGUgbWVudWl0ZW1zIGZyb20gdGhlIGV4YW1wbGVzXG5cdFx0bGV0IG9wdGlvbnMgPSB0aXRsZXMubWFwKCB0aXRsZSA9PlxuXHRcdFx0KHtcblx0XHRcdFx0dmFsdWU6IHRpdGxlLFxuXHRcdFx0XHR0aXRsZTogdGl0bGUsXG5cdFx0XHRcdHRleHQ6IHRpdGxlLFxuXHRcdFx0XHRjb250ZW50OiB0aXRsZSxcblx0XHRcdFx0b25DbGljazogKCkgPT4gZXhhbXBsZXMuc2VsZWN0KHRpdGxlKVxuXHRcdFx0fSkpO1xuXG5cdFx0bGV0IGRpcnR5QnV0dG9ucyA9ICgpID0+IHtcblx0XHRcdGlmICghZGlydHkpIHJldHVybjtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxNZW51IHNlY29uZGFyeSBzdHlsZT17eyBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLCByaWdodDogXCIxcmVtXCIsIHRvcDogXCIzcHhcIiwgbWFyZ2luOiAwIH19PlxuXHRcdFx0XHRcdDxCdXR0b24gbmVnYXRpdmUgb25DbGljaz17KCkgPT4gdGhpcy5yZXZlcnQoKX0+PHU+UjwvdT5ldmVydDwvQnV0dG9uPlxuXHRcdFx0XHRcdDxCdXR0b24gcG9zaXRpdmUgb25DbGljaz17KCkgPT4gdGhpcy5zYXZlKCl9Pjx1PlM8L3U+YXZlPC9CdXR0b24+XG5cdFx0XHRcdDwvTWVudT5cblx0XHRcdCk7XG5cdFx0fTtcblxuXHRcdGxldCBjb21waWxlQnV0dG9uID0gKCkgPT4ge1xuXHRcdFx0aWYgKG91dHB1dCkgcmV0dXJuO1xuXHRcdFx0cmV0dXJuIDxCdXR0b25cblx0XHRcdFx0XHRzdHlsZT17eyBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLCAgd2lkdGg6IFwiNGVtXCIsIGxlZnQ6IFwiY2FsYyg1MCUgLSAyZW0pXCIsIHRvcDogXCI1MCVcIiB9fVxuXHRcdFx0XHRcdG9uQ2xpY2s9eygpID0+IHRoaXMuY29tcGlsZSgpfVxuXHRcdFx0XHRcdGljb249XCJyaWdodCBjaGV2cm9uXCIvPjtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIChcblx0XHQ8R3JpZCBzdHJldGNoZWQgcGFkZGVkIGNsYXNzTmFtZT1cImZ1bGxIZWlnaHRcIj5cblx0XHRcdDxHcmlkLlJvdyBzdHlsZT17eyBoZWlnaHQ6IFwiMnJlbVwiLCBwYWRkaW5nVG9wOiBcIjByZW1cIiB9fSBjbGFzc05hbWU9XCJ1aSBpbnZlcnRlZCBhdHRhY2hlZCBtZW51XCI+XG5cdFx0XHRcdDxHcmlkLkNvbHVtbiB3aWR0aD17N30+XG5cdFx0XHRcdFx0PE1lbnUgaW52ZXJ0ZWQgYXR0YWNoZWQgZmx1aWQ+XG5cdFx0XHRcdFx0XHQ8TWVudS5JdGVtPkV4YW1wbGU6PC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0XHQ8RHJvcGRvd24gaXRlbSBzZWxlY3Rpb24gb3B0aW9ucz17b3B0aW9uc30gdmFsdWU9e3NlbGVjdGVkfSBzdHlsZT17eyB3aWR0aDogXCIyMGVtXCIgfX0vPlxuXHRcdFx0XHRcdFx0PE1lbnUuSXRlbSBvbkNsaWNrPXsoKSA9PiB0aGlzLmRlbGV0ZSgpfT48dT5EPC91PmVsZXRlPC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0XHQ8TWVudS5JdGVtIG9uQ2xpY2s9eygpID0+IHRoaXMucmVuYW1lKCl9PlJlbmFtZTwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdFx0PE1lbnUuSXRlbSBvbkNsaWNrPXsoKSA9PiB0aGlzLmR1cGxpY2F0ZSgpfT5EdXBsaWNhdGU8L01lbnUuSXRlbT5cblx0XHRcdFx0XHQ8L01lbnU+XG5cdFx0XHRcdDwvR3JpZC5Db2x1bW4+XG5cdFx0XHRcdDxHcmlkLkNvbHVtbiB3aWR0aD17Mn0+XG5cdFx0XHRcdFx0PE1lbnUgaW52ZXJ0ZWQgYXR0YWNoZWQgZmx1aWQ+XG5cdFx0XHRcdFx0XHQ8U3BhY2VyIGZsdWlkLz5cblx0XHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gdGhpcy5jcmVhdGUoKX0+PHU+TjwvdT5ldzwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdFx0PFNwYWNlciBmbHVpZC8+XG5cdFx0XHRcdFx0PC9NZW51PlxuXHRcdFx0XHQ8L0dyaWQuQ29sdW1uPlxuXHRcdFx0XHQ8R3JpZC5Db2x1bW4gd2lkdGg9ezd9PlxuXHRcdFx0XHRcdDxNZW51IGludmVydGVkIGF0dGFjaGVkIGZsdWlkPlxuXHRcdFx0XHRcdFx0PFNwYWNlciBmbHVpZC8+XG5cdFx0XHRcdFx0XHQ8TWVudS5JdGVtIG9uQ2xpY2s9eygpID0+IHRoaXMubG9hZCgpfT5SZWxvYWQ8L01lbnUuSXRlbT5cblx0XHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gdGhpcy5yZXNldCgpfT5SZXNldDwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdDwvTWVudT5cblx0XHRcdFx0PC9HcmlkLkNvbHVtbj5cblx0XHRcdDwvR3JpZC5Sb3c+XG5cdFx0XHQ8R3JpZC5Sb3cgc3R5bGU9e3sgaGVpZ2h0OiBcImNhbGMoMTAwJSAtIDNyZW0pXCIgfX0+XG5cdFx0XHRcdDxHcmlkLkNvbHVtbiB3aWR0aD17OH0+XG5cdFx0XHRcdFx0PFRhYmJhYmxlVGV4dEFyZWFcblx0XHRcdFx0XHRcdGNsYXNzTmFtZT1cInVpIHNlZ21lbnRcIlxuXHRcdFx0XHRcdFx0dmFsdWU9e2NvZGV9XG5cdFx0XHRcdFx0XHRvbkNoYW5nZT17KGV2ZW50KSA9PiBleGFtcGxlcy51cGRhdGUoZXhhbXBsZXMuc2VsZWN0ZWQsIGV2ZW50LnRhcmdldC52YWx1ZSwgXCJTS0lQX1NBVkVcIil9XG5cdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHR7ZGlydHlCdXR0b25zKCl9XG5cdFx0XHRcdDwvR3JpZC5Db2x1bW4+XG5cdFx0XHRcdDxHcmlkLkNvbHVtbiB3aWR0aD17OH0+XG5cdFx0XHRcdFx0PFRleHRBcmVhIGNsYXNzTmFtZT1cInVpIHNlZ21lbnRcIiB2YWx1ZT17b3V0cHV0fS8+XG5cdFx0XHRcdDwvR3JpZC5Db2x1bW4+XG5cdFx0XHRcdHtjb21waWxlQnV0dG9uKCl9XG5cdFx0XHQ8L0dyaWQuUm93PlxuXHRcdDwvR3JpZD5cblx0KTt9XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvYXBwL1NwZWxsRWRpdG9yLmpzeCIsImV4cG9ydCBUb2tlbml6ZXIgZnJvbSBcIi4vVG9rZW5pemVyLmpzXCI7XG5leHBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuZXhwb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuaW1wb3J0IFwiLi9SdWxlU3ludGF4XCI7XG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuL3J1bGVzL2FsbC5qc1wiO1xuXG4vLyBTdGljayBvbiB3aW5kb3cgZm9yIHJlZmxlY3Rpb24gYW5kIGFkLWhvYyB0ZXN0aW5nLlxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0T2JqZWN0LmFzc2lnbih3aW5kb3csIHtcblx0XHRUb2tlbml6ZXI6IGV4cG9ydHMuVG9rZW5pemVyLFxuXHRcdHRva2VuaXplOiBleHBvcnRzLlRva2VuaXplci50b2tlbml6ZS5iaW5kKGV4cG9ydHMuVG9rZW5pemVyKSxcblxuXHRcdFJ1bGU6IGV4cG9ydHMuUnVsZSxcblxuXHRcdFBhcnNlcjogZXhwb3J0cy5QYXJzZXIsXG5cdFx0cGFyc2VyOiBwYXJzZXIsXG5cdFx0cGFyc2U6IHBhcnNlci5wYXJzZS5iaW5kKHBhcnNlciksXG5cdFx0Y29tcGlsZTogcGFyc2VyLmNvbXBpbGUuYmluZChwYXJzZXIpLFxuXHR9KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2luZGV4LmpzIiwiLyogU3RvcmUgb2YgZXhhbXBsZSBzcGVsbCBjb2RlIGZyYWdtZW50cy4gKi9cbmltcG9ydCBtb2J4LCB7IG9ic2VydmFibGUsIGNvbXB1dGVkIH0gZnJvbSBcIm1vYnhcIjtcblxuLy8gTWFrZSBQYXJzZXIgYW5kIFRva2VuaXplciBXQVJOIGFzIHdlIHJ1blxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5QYXJzZXIuV0FSTiA9IHRydWU7XG5QYXJzZXIuREVCVUcgPSB0cnVlO1xuUGFyc2VyLlRJTUUgPSB0cnVlO1xuXG5pbXBvcnQgVG9rZW5pemVyIGZyb20gXCIuLi9Ub2tlbml6ZXJcIjtcblRva2VuaXplci5XQVJOID0gdHJ1ZTtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFeGFtcGxlU3RvcmUge1xuXHQvLyBDVVJSRU5UIGV4YW1wbGVzXG5cdEBvYnNlcnZhYmxlIGV4YW1wbGVzID0ge307XG5cdC8vIEV4YW1wbGVzIGFzIG9mIGxhc3Qgc2F2ZSAoZm9yIHJldmVyKVxuXHRAb2JzZXJ2YWJsZSBfc2F2ZWRFeGFtcGxlcyA9IHt9O1xuXHQvLyBTZWxlY3RlZCBleGFtcGxlIGtleS5cblx0QG9ic2VydmFibGUgc2VsZWN0ZWQgPSBcIlwiO1xuXHQvLyBDb21waWxlZCBvdXRwdXQuXG5cdEBvYnNlcnZhYmxlIG91dHB1dCA9IFwiXCI7XG5cblx0Ly8gUmV0dXJuIGp1c3QgdGhlIHRpdGxlcyBvZiB0aGUgZXhhbXBsZXMuXG5cdEBjb21wdXRlZCBnZXQgdGl0bGVzKCkge1xuXHRcdHJldHVybiBPYmplY3Qua2V5cyh0aGlzLmV4YW1wbGVzKTtcblx0fVxuXG5cdC8vIFJldHVybiB0aGUgY29kZSBmb3IgdGhlIGN1cnJlbnQgZXhhbXBsZVxuXHRAY29tcHV0ZWQgZ2V0IGNvZGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXhhbXBsZXNbdGhpcy5zZWxlY3RlZF07XG5cdH1cblxuXHQvLyBJcyBBTllUSElORyBkaXJ0eT9cblx0QGNvbXB1dGVkIGdldCBkaXJ0eSgpIHtcblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5fc2F2ZWRFeGFtcGxlcykgIT09IEpTT04uc3RyaW5naWZ5KHRoaXMuZXhhbXBsZXMpO1xuXHR9XG5cblx0Ly8gUmVzZXQgYWxsIGV4YW1wbGVzIGZyb20gbG9jYWxTdG9yYWdlLlxuXHRyZXNldCgpIHtcblx0XHRkZWxldGUgbG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZXM7XG5cdFx0ZGVsZXRlIGxvY2FsU3RvcmFnZS5zcGVsbEVkaXRvckV4YW1wbGU7XG5cdFx0d2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuXHR9XG5cblx0Ly8gTG9hZCBleGFtcGxlc1xuXHRsb2FkKCkge1xuXHRcdC8vIExvYWQgZXhhbXBsZXMgZnJvbSBsb2NhbFN0b3JhZ2Vcblx0XHR0aGlzLmV4YW1wbGVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2Uuc3BlbGxFZGl0b3JFeGFtcGxlc1xuXHRcdFx0fHwgJ3tcIkZvb1wiOlwiZGVmaW5lIHR5cGUgRm9vXCIsIFwiQmFyXCI6XCJkZWZpbmUgdHlwZSBCYXJcIn0nKTtcblxuXHRcdC8vIFNhdmUgYSBjb3B5IG9mIGV4YW1wbGVzIGZvciByZXZlcnRcblx0XHR0aGlzLl9zYXZlZEV4YW1wbGVzID0gdGhpcy5leGFtcGxlcztcblxuXHRcdC8vIExvYWQgc2VsZWN0ZWQgZXhhbXBsZSBuYW1lXG5cdFx0dGhpcy5zZWxlY3QobG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZSk7XG5cdH1cblxuXHQvLyBTYXZlIGN1cnJlbnQgZXhhbXBsZXMuXG5cdHNhdmUoKSB7XG5cdFx0bG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZXMgPSBKU09OLnN0cmluZ2lmeSh0aGlzLmV4YW1wbGVzKTtcblxuXHRcdC8vIFNhdmUgYSBjb3B5IG9mIGV4YW1wbGVzIGZvciByZXZlcnRcblx0XHR0aGlzLl9zYXZlZEV4YW1wbGVzID0gdGhpcy5leGFtcGxlcztcblx0fVxuXG5cdC8vIFJldmVydCB0aGUgY3VycmVudCBleGFtcGxlXG5cdHJldmVydChleGFtcGxlID0gdGhpcy5zZWxlY3RlZCkge1xuXHRcdHRoaXMudXBkYXRlKGV4YW1wbGUsIHRoaXMuX3NhdmVkRXhhbXBsZXNbZXhhbXBsZV0pO1xuXHR9XG5cblx0Ly8gU2VsZWN0IGEgZGlmZmVyZW50IGV4YW1wbGUuXG5cdHNlbGVjdChleGFtcGxlKSB7XG5cdFx0aWYgKCFleGFtcGxlIHx8IHRoaXMuZXhhbXBsZXNbZXhhbXBsZV0gPT0gbnVsbCkgZXhhbXBsZSA9IE9iamVjdC5rZXlzKHRoaXMuZXhhbXBsZXMpWzBdIHx8IFwiXCI7XG5cdFx0dGhpcy5zZWxlY3RlZCA9IGxvY2FsU3RvcmFnZS5zcGVsbEVkaXRvckV4YW1wbGUgPSBleGFtcGxlO1xuXHRcdHRoaXMub3V0cHV0ID0gXCJcIjtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIG5ldyBleGFtcGxlLlxuXHQvLyBTYXZlcyBhbmQgc2VsZWN0cyB0aGUgZXhhbXBsZSBhdXRvbWF0aWNhbGx5LlxuXHR1cGRhdGUobmFtZSwgY29kZSwgc2tpcFNhdmUpIHtcblx0XHR0aGlzLmV4YW1wbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5leGFtcGxlcywgeyBbIG5hbWUgXTogY29kZSB9KTtcblx0XHR0aGlzLnNlbGVjdChuYW1lKTtcblx0XHR0aGlzLm91dHB1dCA9IFwiXCI7XG5cdFx0aWYgKCFza2lwU2F2ZSkgdGhpcy5zYXZlKCk7XG5cdH1cblxuXHQvLyBEZWxldGUgYW4gZXhhbXBsZS5cblx0Ly8gU2F2ZXMgYW5kIHNlbGVjdHMgYW5vdGhlciBleGFtcGxlIGF1dG9tYXRpY2FsbHkuXG5cdGRlbGV0ZShuYW1lID0gdGhpcy5zZWxlY3RlZCwgc2hvd0NvbmZpcm0pIHtcblx0XHRpZiAoc2hvd0NvbmZpcm0gJiYgIWNvbmZpcm0oYFJlYWxseSBkZWxldGUgZXhhbXBsZSAke25hbWV9P2ApKSByZXR1cm47XG5cdFx0bGV0IGV4YW1wbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5leGFtcGxlcyk7XG5cdFx0ZGVsZXRlIGV4YW1wbGVzW25hbWVdO1xuXHRcdHRoaXMuZXhhbXBsZXMgPSBleGFtcGxlcztcblx0XHR0aGlzLnNhdmUoKTtcblx0XHR0aGlzLnNlbGVjdCgpO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgbmV3IGV4YW1wbGUuXG5cdGNyZWF0ZShuYW1lLCBjb2RlID0gXCJcIikge1xuXHRcdC8vIElmIG5vIG5hbWUsIHByb21wdC5cblx0XHRpZiAoIW5hbWUpIG5hbWUgPSBwcm9tcHQoXCJOYW1lIGZvciB0aGlzIGV4YW1wbGU/XCIpO1xuXHRcdC8vIEZvcmdldCBpdCBpZiBubyBuYW1lLlxuXHRcdGlmICghbmFtZSkgcmV0dXJuO1xuXG5cdFx0dGhpcy51cGRhdGUobmFtZSwgY29kZSk7XG5cdH1cblxuXHQvLyBSZW5hbWUgYW4gZXhhbXBsZS5cblx0Ly8gU2VsZWN0cyBhbmQgc2F2ZXMgYXV0b21hdGljYWxseS5cblx0cmVuYW1lKG9sZE5hbWUgPSB0aGlzLnNlbGVjdGVkLCBuZXdOYW1lKSB7XG5cdFx0Ly8gSWYgbm8gbmV3IG5hbWUsIHByb21wdC5cblx0XHRpZiAoIW5ld05hbWUpIG5ld05hbWUgPSBwcm9tcHQoXCJOZXcgbmFtZSBmb3IgdGhpcyBleGFtcGxlP1wiLCBvbGROYW1lKTtcblxuXHRcdC8vIEZvcmdldCBpdCBpZiBubyBuYW1lIHN1cHBsaWVkIG9yIG5hbWUgaXMgdGhlIHNhbWVcblx0XHRpZiAoIW5ld05hbWUgfHwgbmV3TmFtZSA9PT0gb2xkTmFtZSkgcmV0dXJuO1xuXHRcdGlmICh0aGlzLmV4YW1wbGVzW25ld05hbWVdKSByZXR1cm4gY29uc29sZS53YXJuKGBleGFtcGxlcy5yZW5hbWUoXCIke25ld05hbWV9XCIpOiBuYW1lIGFscmVhZHkgaW4gdXNlYCk7XG5cblx0XHRsZXQgY29kZSA9IHRoaXMuZXhhbXBsZXNbb2xkTmFtZV07XG5cdFx0dGhpcy5kZWxldGUob2xkTmFtZSk7XG5cdFx0dGhpcy51cGRhdGUobmV3TmFtZSwgY29kZSk7XG5cdH1cblxuXHQvLyBEdXBsaWNhdGUgYW4gZXhhbXBsZS5cblx0ZHVwbGljYXRlKG9sZE5hbWUgPSB0aGlzLnNlbGVjdGVkLCBuZXdOYW1lKSB7XG5cdFx0Ly8gSWYgbm8gbmV3IG5hbWUsIHByb21wdC5cblx0XHRpZiAoIW5ld05hbWUpIG5ld05hbWUgPSBwcm9tcHQoXCJOZXcgbmFtZSBmb3IgZHVwbGljYXRlIGV4YW1wbGU/XCIsIG9sZE5hbWUpO1xuXHRcdC8vIEZvcmdldCBpdCBpZiBubyBuYW1lIHN1cHBsaWVkIG9yIG5hbWUgaXMgdGhlIHNhbWVcblx0XHRpZiAoIW5ld05hbWUgfHwgbmV3TmFtZSA9PT0gb2xkTmFtZSkgcmV0dXJuO1xuXHRcdGlmICh0aGlzLmV4YW1wbGVzW25ld05hbWVdKSByZXR1cm4gY29uc29sZS53YXJuKGBleGFtcGxlcy5yZW5hbWUoXCIke25ld05hbWV9XCIpOiBuYW1lIGFscmVhZHkgaW4gdXNlYCk7XG5cblx0XHR0aGlzLnVwZGF0ZShuZXdOYW1lLCB0aGlzLmNvZGUpO1xuXHR9XG5cblx0Ly8gQ29tcGlsZSB0aGUgY3VycmVudCBleGFtcGxlLCBwbGFjaW5nIGl0IGluIG91ciBgb3V0cHV0YC5cbi8vVE9ETzogc29tZSB3YXkgdG8gZG8gdGhpcyBhdXRvbWF0aWNhbGx5IHcvIFwib3V0cHV0XCIgP1xuXHRjb21waWxlKCkge1xuXHRcdHRoaXMub3V0cHV0ID0gXCIuLi5jb21waWxpbmcuLi5cIjtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdGxldCByZXN1bHQgPSBwYXJzZXIucGFyc2UoXCJzdGF0ZW1lbnRzXCIsIHRoaXMuY29kZSk7XG5cdFx0XHRpZiAoIXJlc3VsdCkge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJDYW4ndCBwYXJzZSFcIik7XG5cdFx0XHRcdHRoaXMub3V0cHV0ID0gXCJDYW4ndCBwYXJzZSBzdGF0ZW1lbnRzXCI7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y29uc29sZS5pbmZvKFwiUmVzdWx0XCIsIHJlc3VsdCk7XG5cdFx0XHRcdHRoaXMub3V0cHV0ID0gcmVzdWx0LnRvU291cmNlKHBhcnNlcik7XG5cdFx0XHR9XG5cdFx0fSwgMTAwKTtcblx0fVxuXG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvYXBwL0V4YW1wbGVTdG9yZS5qcyIsIi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy9cbi8vICA8U3BhY2VyPiBjb21wb25lbnQgZm9yIHVzZSB3aXRoIG9hay5cbi8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IFByb3BUeXBlcyBmcm9tIFwicHJvcC10eXBlc1wiO1xuaW1wb3J0IHsgY2xhc3NOYW1lcyB9IGZyb20gXCIuL3V0aWxcIjtcblxuaW1wb3J0IFwiLi9TcGFjZXIubGVzc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBTcGFjZXIocHJvcHMpIHtcbiAgY29uc3Qge1xuICAgIGNsYXNzTmFtZSxcbiAgICBhcHBlYXJhbmNlLCBzaXplLCB3aWR0aCwgaGVpZ2h0LFxuICAgIGlubGluZSwgZmx1aWQsIHRpbnksIHNtYWxsLCBtZWRpdW0sIGxhcmdlLCBodWdlLCBtYXNzaXZlXG4gIH0gPSBwcm9wcztcblxuICBjb25zdCBzcGFjZXJQcm9wcyA9IHtcbiAgICBjbGFzc05hbWU6IGNsYXNzTmFtZXMoY2xhc3NOYW1lLCBcIm9ha1wiLCBzaXplLCBhcHBlYXJhbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7IGlubGluZSwgZmx1aWQgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzcGFjZXJcIiksXG4gICAgc3R5bGU6IHtcbiAgICAgIHdpZHRoLFxuICAgICAgaGVpZ2h0LFxuICAgIH1cbiAgfVxuXG4gIHJldHVybiA8ZGl2IHsuLi5zcGFjZXJQcm9wc30vPjtcbn1cblxuU3BhY2VyLnByb3BUeXBlcyA9IHtcbiAgY2xhc3NOYW1lOiBQcm9wVHlwZXMuc3RyaW5nLFxuICBhcHBlYXJhbmNlOiBQcm9wVHlwZXMuc3RyaW5nLFxuICBzaXplOiBQcm9wVHlwZXMuc3RyaW5nLFxuICB3aWR0aDogUHJvcFR5cGVzLm51bWJlcixcbiAgaGVpZ2h0OiBQcm9wVHlwZXMubnVtYmVyLFxuXG4gIGlubGluZTogUHJvcFR5cGVzLmJvb2wsXG4gIGZsdWlkOiBQcm9wVHlwZXMuYm9vbCxcblxufTtcblxuU3BhY2VyLmRlZmF1bHRQcm9wcyA9IHtcbiAgc2l6ZTogXCJtZWRpdW1cIlxufVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2FwcC9TcGFjZXIuanN4IiwiaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHByb3BUeXBlcyBmcm9tIFwicHJvcC10eXBlc1wiO1xuaW1wb3J0IHsgVGV4dEFyZWEgfSBmcm9tICdzZW1hbnRpYy11aS1yZWFjdCdcblxuLy9cbi8vXHQjIDxUYWJiYWJsZVRleHRBcmVhPiAtLSA8U1VJLlRleHRBcmVhPiBpbiB3aGljaCB5b3UgY2FuIHR5cGUgYSB0YWIgY2hhcmFjdGVyOlxuLy9cdC0gSWYgbm90aGluZyBpcyBzZWxlY3RlZCwgaW5zZXJ0cyBhIHRhYiBjaGFyYWN0ZXJcbi8vXHQtIElmIGFueXRoaW5nIGlzIHNlbGVjdGVkLCBpbnNlcnRzIHRhYiBjaGFyYWN0ZXJzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpbmUocylcbi8vXHQtIElmIHNoaWZ0IGtleSBpcyBkb3duLCBpbnNlcnRzIHRhYiBjaGFyYWN0ZXJzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpbmUocykuXG4vL1xuLy9cdCMjIyBQcm9wZXJ0aWVzXG4vL1x0LSBgc2F2ZWAgKHJlcXVpcmVkKSAtLSBmdW5jdGlvbiB1c2VkIHRvIHNhdmUgdGhlIHJlc3VsdHMgb24ga2V5cHJlc3Ncbi8vXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUYWJiYWJsZVRleHRBcmVhIGV4dGVuZHMgVGV4dEFyZWEge1xuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIDxUZXh0QXJlYSB7Li4udGhpcy5wcm9wc30gb25LZXlEb3duPXt0aGlzLm9uS2V5RG93bn0gLz47XG5cdH1cblxuXHQvLyBEbyBOT1QgZXhpdCBvbiB0YWIgLS0gaW5zZXJ0IG9yIHJlbW92ZSB0YWIocykgdmFsdWUgaW5zdGVhZC5cblx0b25LZXlEb3duID0gKGV2ZW50KSA9PiB7XG5cbi8vVE9ETyBmaXJlIGB0aGlzLnByb3BzLm9uS2V5RG93bmAgaWYgZGVmaW5lZC4uLlxuXHRcdC8vIEZvcmdldCBpdCBpZiBub3QgYSB0YWJcblx0XHRpZiAoZXZlbnQua2V5Q29kZSAhPT0gOSkgcmV0dXJuO1xuXG5cdFx0Ly8gcHJldmVudCBkZWZhdWx0IHNvIHdlIGRvbid0IGV4aXQgdGhlIGZpZWxkXG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuXHRcdC8vIGZpZ3VyZSBvdXQgdGhlIHRleHQgcmFuZ2Vcblx0XHR2YXIgZWxlbWVudCA9IGV2ZW50LnRhcmdldDtcblx0XHR2YXIgdGV4dCA9IGVsZW1lbnQudmFsdWU7XG5cdFx0dmFyIHN0YXJ0ID0gZWxlbWVudC5zZWxlY3Rpb25TdGFydDtcblx0XHR2YXIgZW5kID0gZWxlbWVudC5zZWxlY3Rpb25FbmQ7XG5cblx0XHQvLyBSZXBsYWNlbWVudCB0ZXh0XG5cdFx0bGV0IG5ld1RleHQgPSBcIlwiLCBzZWxlY3Rpb25TdGFydCA9IHN0YXJ0LCBzZWxlY3Rpb25FbmQgPSBlbmQ7XG5cblx0XHQvLyBJZiBzZWxlY3Rpb24gaXMgZW1wdHksXG5cdFx0aWYgKHN0YXJ0ID09PSBlbmQgJiYgIWV2ZW50LnNoaWZ0S2V5KSB7XG5cdFx0XHRuZXdUZXh0ID0gXCJcXHRcIjtcblx0XHRcdHNlbGVjdGlvblN0YXJ0ID0gc2VsZWN0aW9uRW5kID0gZW5kICsgMTtcblx0XHR9XG5cdFx0Ly8gb3RoZXJ3aXNlIGluZGVudC9kZS1pbmRlbnQgYWxsIG9mIHRoZSBsaW5lc1xuXHRcdGVsc2Uge1xuXHRcdC8vIHVzZSBzdGFydCBhbmQgZW5kIG9mIGxpbmUocylcbi8vY29uc29sZS5pbmZvKGBzdGFydDogJHtzdGFydH0gOiR7dGV4dFtzdGFydF19OiAgIGVuZDogJHtlbmR9IDogJHt0ZXh0W2VuZF19OmApO1xuXHRcdFx0aWYgKHRleHRbc3RhcnRdICE9PSBcIlxcblwiKSBzdGFydCA9IHRleHQubGFzdEluZGV4T2YoXCJcXG5cIiwgc3RhcnQpICsgMTtcblx0XHRcdGlmICh0ZXh0W2VuZC0xXSA9PT0gXCJcXG5cIikgZW5kLS07XG5cdFx0XHRlbHNlIGlmICh0ZXh0W2VuZCsxXSAhPT0gXCJcXG5cIikgZW5kID0gdGV4dC5pbmRleE9mKFwiXFxuXCIsIGVuZCkgLSAxO1xuLy9jb25zb2xlLmluZm8oYHN0YXJ0OiAke3N0YXJ0fSA6JHt0ZXh0W3N0YXJ0XX06ICAgZW5kOiAke2VuZH0gOiAke3RleHRbZW5kXX06YCk7XG5cblx0XHRcdGxldCBsaW5lcyA9IHRleHQuc2xpY2Uoc3RhcnQsIGVuZCkuc3BsaXQoXCJcXG5cIik7XG5cdFx0XHQvLyBpZiBzaGlmdCBrZXkgaXMgZG93biwgUkVNT1ZFIGEgdGFiIGZyb20gZWFjaCBsaW5lXG5cdFx0XHRpZiAoZXZlbnQuc2hpZnRLZXkpIHtcblx0XHRcdFx0bGluZXMgPSBsaW5lcy5tYXAobGluZSA9PiBsaW5lWzBdID09PSBcIlxcdFwiID8gbGluZS5zdWJzdHIoMSkgOiBsaW5lKTtcblx0XHRcdH1cblx0XHRcdC8vIG90aGVyd2lzZSBBREQgYSB0YWIgdG8gZWFjaCBsaW5lXG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0bGluZXMgPSBsaW5lcy5tYXAobGluZSA9PiBcIlxcdFwiICsgbGluZSk7XG5cdFx0XHR9XG5cdFx0XHRzZWxlY3Rpb25TdGFydCA9IHN0YXJ0O1xuXHRcdFx0bmV3VGV4dCA9IGxpbmVzLmpvaW4oXCJcXG5cIik7XG5cdFx0XHRzZWxlY3Rpb25FbmQgPSBzZWxlY3Rpb25TdGFydCArIG5ld1RleHQubGVuZ3RoICsgMTtcblx0XHR9XG5cblx0XHQvLyBVcGRhdGUgaW5wdXQgdmFsdWUuXG5cdFx0ZWxlbWVudC52YWx1ZSBcdD0gdGV4dC5zdWJzdHIoMCwgc3RhcnQpXG5cdFx0XHRcdFx0XHQrIG5ld1RleHRcblx0XHRcdFx0XHRcdCsgdGV4dC5zdWJzdHIoZW5kKTtcblxuXHRcdC8vIFVwZGF0ZSB0aGUgc2VsZWN0aW9uXG5cdFx0ZWxlbWVudC5zZWxlY3Rpb25TdGFydCA9IHNlbGVjdGlvblN0YXJ0O1xuXHRcdGVsZW1lbnQuc2VsZWN0aW9uRW5kID0gc2VsZWN0aW9uRW5kO1xuXG5cdFx0Ly8gRGVsZWdhdGUgdG8gYHByb3BzLm9uQ2hhbmdlYCB0byBzYXZlIHRoZSB2YWx1ZSBvdXRzaWRlIG9mIHRoZSBjb250cm9sXG5cdFx0aWYgKHRoaXMucHJvcHMub25DaGFuZ2UpIHRoaXMucHJvcHMub25DaGFuZ2UoZXZlbnQpO1xuXHR9XG5cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9hcHAvVGFiYmFibGVUZXh0QXJlYS5qc3giLCIvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBSZWFjdCBVdGlsaXR5IGZ1bmN0aW9uc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8vIGBjbGFzc05hbWVzYCwgY29uY2VwdCBzdG9sZW4gZnJvbTogIGh0dHA6Ly9qZWR3YXRzb24uZ2l0aHViLmlvL2NsYXNzbmFtZXNcbmV4cG9ydCBmdW5jdGlvbiBjbGFzc05hbWVzICguLi5hcmdzKSB7XG4gIHJldHVybiBhcmdzLm1hcCggYXJnID0+IHtcbiAgICBpZiAoIWFyZykgcmV0dXJuIFwiXCI7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYXJnKSkgcmV0dXJuIGNsYXNzTmFtZXMoLi4uYXJnKTtcbiAgICBzd2l0Y2ggKHR5cGVvZiBhcmcpIHtcbiAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgIGNhc2UgXCJzdHJpbmdcIjogIHJldHVybiBhcmc7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoYXJnKS5tYXAoIGtleSA9PiBhcmdba2V5XSA/IGtleSA6IFwiXCIpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAgICAgICAgIC5qb2luKFwiIFwiKTtcbiAgICB9XG4gIH0pLmZpbHRlcihCb29sZWFuKVxuICAgIC5qb2luKFwiIFwiKTtcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2FwcC91dGlsLmpzIiwiLy8gTWVtb2l6ZS9mb3JnZXQgc2VtYW50aWNzLlxuXG4vLyBSZXR1cm4gYSBtZW1vaXppbmcgZ2V0dGVyIGZ1bmN0aW9uLlxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXNbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciB2YWx1ZSA9IGdldHRlci5hcHBseSh0aGlzKTtcblx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIERlZmluZSBzbyB0aGF0IHdlIGNhbiBiZSBkZWxldGVkIGFuZCByZS1kZWZpbmVkLCBidXQgbm90IHNldCBvciBlbnVtZXJhdGVkLlxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgcHJvcGVydHksIHsgdmFsdWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXNbcHJvcGVydHldO1xuXHR9XG59XG5cblxuLy8gUmV0dXJuIGEgbWVtb2l6ZSBmdW5jdGlvbiBmb3IgdXNlIGFzIGEgZ2V0dGVyIGluIGEgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpYFxuLy8gVEVTVE1FXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWVtb2l6ZWQocHJvcGVydHksIGdldHRlcikge1xuXHRyZXR1cm4ge1xuXHRcdGdldCA6IG1lbW9pemVkKHByb3BlcnR5LCBnZXR0ZXIpXG5cdH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9tZW1vaXplLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFRva2VuaXplciBmcm9tIFwiLi4vVG9rZW5pemVyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVN5bnRheFwiO1xuXG4vLyBDcmVhdGUgXCJKU1hcIiBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwiSlNYXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBKU1ggZXhwcmVzc2lvbi5cblJ1bGUuSlNYID0gY2xhc3MganN4RWxlbWVudCBleHRlbmRzIFJ1bGUge1xuXHQvLyBUZXh0IHN0cmluZ3MgZ2V0IGVuY29kZWQgYXMgYHRleHRgIG9iamVjdHMgaW4gdGhlIHRva2VuIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kID0gdG9rZW5zLmxlbmd0aCkge1xuXHRcdGxldCB0b2tlbiA9IHRva2Vuc1tzdGFydF07XG5cdFx0aWYgKCEodG9rZW4gaW5zdGFuY2VvZiBUb2tlbml6ZXIuSlNYRWxlbWVudCkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogdG9rZW4sXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0ICsgMVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gQ29udmVydCBvdXIgYXR0cmlidXRlcyB0byBzb3VyY2UuXG5cdC8vIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgbm8gYXR0cmlidXRlcy5cblx0YXR0cnNUb1NvdXJjZShjb250ZXh0LCBqc3hFbGVtZW50ID0gdGhpcy5tYXRjaGVkKSB7XG5cdFx0bGV0IGF0dHJpYnV0ZXMgPSBqc3hFbGVtZW50LmF0dHJpYnV0ZXM7XG5cdFx0aWYgKCFhdHRyaWJ1dGVzIHx8ICFhdHRyaWJ1dGVzLmxlbmd0aCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBhdHRycyA9IGF0dHJpYnV0ZXMubWFwKCAoeyBuYW1lLCB2YWx1ZSB9KSA9PiB7XG5cdFx0XHQvLyBpZiBOTyB2YWx1ZSwgYXNzdW1lIGl0J3MgYSB2YXJpYWJsZSBvZiB0aGUgc2FtZSBuYW1lXG5cdFx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgdmFsdWUgPSBuYW1lO1xuXHRcdFx0Ly8gaWYgaXQncyBhbiBhcnJheSwgaXQncyBhIHNwZWxsIGV4cHJlc3Npb24sIHBvc3NpYmx5IHdpdGggbmVzdGVkIEpTWCBlbGVtZW50cy4uLlxuXHRcdFx0ZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBUb2tlbml6ZXIuSlNYRXhwcmVzc2lvbikge1xuXHRcdFx0XHR2YWx1ZSA9IHRoaXMuanN4RXhwcmVzc2lvblRvU291cmNlKGNvbnRleHQsIHZhbHVlKTtcblx0XHRcdH1cblx0XHRcdC8vIGVsc2UgaWYgYSBKU1ggZWxlbWVudCwgcmVjdXJzZVxuLy9UT0RPOiBpbmRlbnQuLi5cblx0XHRcdGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgVG9rZW5pemVyLkpTWEVsZW1lbnQpIHtcblx0XHRcdFx0dmFsdWUgPSB2YWx1ZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdH1cblx0XHRcdC8vIE90aGVyd2lzZSBpZiBhIG51bWJlciBvciBUZXh0IGxpdGVyYWwsIGp1c3QgdXNlIGl0XG5cblx0XHRcdC8vIHNwZWNpYWwgY2FzZSBgY2xhc3NgIHRvIGBjbGFzc05hbWVgIGJlY2F1c2UgUmVhY3QgaXMgZWZmaW5nIHBlcnNuaWNrZXR5LlxuXHRcdFx0aWYgKG5hbWUgPT09IFwiY2xhc3NcIikgbmFtZSA9IFwiY2xhc3NOYW1lXCI7XG4vL1RPRE86IGVzY2FwZSBuYW1lcyB3aGljaCBhcmUgaW52YWxpZCBKUyBpZGVudGlmaWVyc1xuXHRcdFx0cmV0dXJuIGAke25hbWV9OiAke3ZhbHVlfWA7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gYHsgJHthdHRycy5qb2luKFwiLCBcIil9IH1gO1xuXHR9XG5cblx0Ly8gUmV0dXJuIGFuIGFycmF5IHdpdGggc291cmNlIGZvciBlYWNoIG9mIG91ciBjaGlsZHJlbi5cblx0Ly8gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiB3ZSBkb24ndCBoYXZlIGFueSBjaGlsZHJlbi5cblx0Y2hpbGRyZW5Ub1NvdXJjZShjb250ZXh0LCBqc3hFbGVtZW50ID0gdGhpcy5tYXRjaGVkKSB7XG5cdFx0bGV0IGNoaWxkcmVuID0ganN4RWxlbWVudC5jaGlsZHJlbjtcblx0XHRpZiAoIWNoaWxkcmVuIHx8IGNoaWxkcmVuLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gY2hpbGRyZW4ubWFwKGNoaWxkID0+IHtcbi8vVE9ETzogZXNjYXBlIGlubmVyIHF1b3Rlcy4uLlxuXHRcdFx0aWYgKHR5cGVvZiBjaGlsZCA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHQvL2ZvcmdldCBpdCBpZiB3aGl0ZXNwYWNlIG9ubHkuLi4gPz8/XG5cdFx0XHRcdGxldCB0ZXh0ID0gY2hpbGQudHJpbSgpO1xuXHRcdFx0XHRpZiAoIXRleHQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRcdHJldHVybiBgXCIke3RleHR9XCJgO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNoaWxkIGluc3RhbmNlb2YgVG9rZW5pemVyLkpTWEVsZW1lbnQpIHtcblx0XHRcdFx0bGV0IGNoaWxkU291cmNlID0gdGhpcy5qc3hFbGVtZW50VG9Tb3VyY2UoY29udGV4dCwgY2hpbGQpO1xuXHRcdFx0XHRyZXR1cm4gY2hpbGRTb3VyY2Uuc3BsaXQoXCJcXG5cIikuam9pbihcIlxcblxcdFwiKTtcblx0XHRcdH1cblx0XHRcdGlmIChjaGlsZCBpbnN0YW5jZW9mIFRva2VuaXplci5KU1hFeHByZXNzaW9uKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmpzeEV4cHJlc3Npb25Ub1NvdXJjZShjb250ZXh0LCBjaGlsZCk7XG5cdFx0XHR9XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJjaGlsZHJlblRvU291cmNlKCk6IGRvbid0IHVuZGVyc3RhbmQgY2hpbGRcIiArICBjaGlsZCk7XG5cdFx0fSlcblx0XHQvLyByZW1vdmUgdW5kZWZpbmVkL2VtcHR5IHN0cmluZyBydWxlc1xuXHRcdC5maWx0ZXIoQm9vbGVhbik7XG5cdH1cblxuXHQvLyBDb252ZXJ0IEpTWCBleHByZXNzaW9uICggYHsuLi59YCApIHRvIEpTIHNvdXJjZS5cblx0anN4RXhwcmVzc2lvblRvU291cmNlKGNvbnRleHQsIGpzeEV4cHJlc3Npb24pIHtcblx0XHRsZXQgdG9rZW5zID0ganN4RXhwcmVzc2lvbi50b2tlbnM7XG5jb25zb2xlLmluZm8oanN4RXhwcmVzc2lvbiwgdG9rZW5zKTtcblx0XHRyZXR1cm4gXCIvXCIgKyBgKlRPRE86ICR7dG9rZW5zLmpvaW4oXCIgXCIpfSpgICsgXCIvXCI7XG5cdH1cblxuXHRqc3hFbGVtZW50VG9Tb3VyY2UoY29udGV4dCwganN4RWxlbWVudCA9IHRoaXMubWF0Y2hlZCkge1xuXHRcdC8vIGdldCB0aGUgYml0cyBvZiB0aGUgb3V0cHV0XG5cdFx0bGV0IHRhZ05hbWUgPSBgXCIke2pzeEVsZW1lbnQudGFnTmFtZX1cImA7XG5cdFx0bGV0IGF0dHJzID0gdGhpcy5hdHRyc1RvU291cmNlKGNvbnRleHQsIGpzeEVsZW1lbnQpO1xuXHRcdGxldCBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW5Ub1NvdXJjZShjb250ZXh0LCBqc3hFbGVtZW50KTtcblxuXHRcdGxldCBvdXRwdXQgPSBgY3JlYXRlRWxlbWVudCgke3RhZ05hbWV9YDtcblx0XHRpZiAoIWF0dHJzICYmIGNoaWxkcmVuKSBhdHRycyA9IFwibnVsbFwiO1xuXG5cdFx0aWYgKGF0dHJzKSBvdXRwdXQgKz0gYCwgJHthdHRyc31gO1xuXHRcdGlmIChjaGlsZHJlbikge1xuXHRcdFx0b3V0cHV0ICs9IFwiLFxcblxcdFwiICsgY2hpbGRyZW4uam9pbihcIixcXG5cXHRcIikgKyBcIlxcblwiO1xuXHRcdH1cblx0XHRvdXRwdXQgKz0gXCIpXCJcblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLmpzeEVsZW1lbnRUb1NvdXJjZShjb250ZXh0LCB0aGlzLm1hdGNoZWQpO1xuXHR9XG59O1xuXG4vLyBEZWZpbmUganN4IGJsb2NrIGFzIGFuIGBleHByZXNzaW9uYCBPUiBhIGBzdGF0ZW1lbnRgLlxucGFyc2VyLmFkZFJ1bGUoW1wianN4XCIsIFwiZXhwcmVzc2lvblwiLCBcInN0YXRlbWVudFwiXSwgUnVsZS5KU1gpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL0pTWC5qcyIsIi8vIEV4cG9ydCBhbGwgc3RhbmRhcmQgXCJlbmdsaXNoXCIgcnVsZXMuXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcblxuLy8gTG9hZCBhbGwgc3RhbmRhcmQgcnVsZXMgZmlsZXMuXG5pbXBvcnQgXCIuL2NvcmVcIjtcbmltcG9ydCBcIi4vbGlzdHNcIjtcbmltcG9ydCBcIi4vb3BlcmF0b3JzXCI7XG5pbXBvcnQgXCIuL2lmXCI7XG5pbXBvcnQgXCIuL3N0YXRlbWVudHNcIjtcbmltcG9ydCBcIi4vdHlwZXNcIjtcbmltcG9ydCBcIi4vSlNYXCI7XG5cblxuLy8gQ3JlYXRlIHBhcnNlciBmb3IgYWxsLlxuY29uc3QgcGFyc2VyID0gUGFyc2VyLmZvckNvbnRleHQoXCJhbGxcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEFuZCBkZXBlbmQgb24gc3RhbmRhcmQgcnVsZXMgbG9hZGVkIGFib3ZlLlxucGFyc2VyLmltcG9ydChcImNvcmVcIiwgXCJsaXN0c1wiLCBcIm9wZXJhdG9yc1wiLCBcImlmXCIsIFwic3RhdGVtZW50c1wiLCBcInR5cGVzXCIsIFwiSlNYXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2FsbC5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgaWYgc3RhdGVtZW50cy5cbi8vXG5cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVcIjtcblxuLy8gQ3JlYXRlIFwiaWZcIiBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwiaWZcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEltcG9ydCBjb3JlIHJ1bGVzLlxuaW1wb3J0IFwiLi9jb3JlXCI7XG5wYXJzZXIuaW1wb3J0KFwiY29yZVwiKTtcblxuXG4vLyBUT0RPOiBjdXN0b20gYGdldE1hdGNoZXJgOlxuLy9cdFx0XHQtIGBjb25kdGlvbmAgd3JhcHMgaW4gcGFyZW5zIGlmIE5PVCB3cmFwcGVkXG5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImlmXCIsXG5cdFwiaWYge2NvbmRpdGlvbjpleHByZXNzaW9ufSAodGhlbnw6KT8ge3N0YXRlbWVudH0/XCIsXG5cdGNsYXNzIGlmXyBleHRlbmRzIFJ1bGUuQmxvY2tTdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGNvbmRpdGlvbiwgc3RhdGVtZW50LCBibG9jayB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuLy9cdFx0XHRpZiAoc3RhdGVtZW50ICYmIGJsb2NrKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJpZiBtYXkgb25seSBoYXZlIGlubGluZSBzdGF0ZW1lbnQgT1IgYmxvY2tcIik7XG5cdFx0XHRsZXQgc3RhdGVtZW50cyA9IFJ1bGUuQmxvY2suZW5jbG9zZVN0YXRlbWVudHMoc3RhdGVtZW50LCBibG9jayk7XG5cdFx0XHRyZXR1cm4gYGlmICgke2NvbmRpdGlvbn0pICR7c3RhdGVtZW50c31gO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gTk9URTogdGhpcyBpcyBOT1QgYSBibG9jayBzdGF0ZW1lbnQuLi4gPz8/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImJhY2t3YXJkc19pZlwiLFxuXHRcIntzdGF0ZW1lbnR9IGlmIHtjb25kaXRpb246ZXhwcmVzc2lvbn0gKD86KGVsc2V8b3RoZXJ3aXNlKSB7ZWxzZVN0YXRlbWVudDpzdGF0ZW1lbnR9KT9cIixcblx0Y2xhc3MgYmFja3dhcmRzX2lmIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRlc3RSdWxlID0gbmV3IFJ1bGUuTWF0Y2goeyBtYXRjaDogW1wiaWZcIl0gfSk7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgY29uZGl0aW9uLCBzdGF0ZW1lbnQsIGVsc2VTdGF0ZW1lbnQgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBvdXRwdXQgPSBgaWYgKCR7Y29uZGl0aW9ufSkgeyAke3N0YXRlbWVudH0gfWA7XG5cdFx0XHRpZiAoZWxzZVN0YXRlbWVudCkgb3V0cHV0ICs9IGBcXG5lbHNlIHsgJHtlbHNlU3RhdGVtZW50fSB9YFxuXHRcdFx0cmV0dXJuIG91dHB1dDtcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwiZWxzZV9pZlwiLFxuXHRcIihlbHNlfG90aGVyd2lzZSkgaWYge2NvbmRpdGlvbjpleHByZXNzaW9ufSAodGhlbnw6KSB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZWxzZV9pZiBleHRlbmRzIFJ1bGUuQmxvY2tTdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGNvbmRpdGlvbiwgc3RhdGVtZW50LCBibG9jayB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuLy9cdFx0XHRpZiAoc3RhdGVtZW50ICYmIGJsb2NrKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJlbHNlIGlmIG1heSBvbmx5IGhhdmUgaW5saW5lIHN0YXRlbWVudCBPUiBibG9ja1wiKTtcblx0XHRcdGxldCBzdGF0ZW1lbnRzID0gUnVsZS5CbG9jay5lbmNsb3NlU3RhdGVtZW50cyhzdGF0ZW1lbnQsIGJsb2NrKTtcblx0XHRcdHJldHVybiBgZWxzZSBpZiAoJHtjb25kaXRpb259KSAke3N0YXRlbWVudHN9YFxuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJlbHNlXCIsXG5cdFwiKGVsc2V8b3RoZXJ3aXNlKSAoOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBlbHNlXyBleHRlbmRzIFJ1bGUuQmxvY2tTdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHN0YXRlbWVudCwgYmxvY2sgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcbi8vXHRcdFx0aWYgKHN0YXRlbWVudCAmJiBibG9jaykgdGhyb3cgbmV3IFN5bnRheEVycm9yKFwiZWxzZSBpZiBtYXkgb25seSBoYXZlIGlubGluZSBzdGF0ZW1lbnQgT1IgYmxvY2tcIik7XG5cdFx0XHRsZXQgc3RhdGVtZW50cyA9IFJ1bGUuQmxvY2suZW5jbG9zZVN0YXRlbWVudHMoc3RhdGVtZW50LCBibG9jayk7XG5cdFx0XHRyZXR1cm4gYGVsc2UgJHtzdGF0ZW1lbnRzfWBcblx0XHR9XG5cdH1cbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvaWYuanMiLCIvL1xuLy9cdCMgUnVsZXMgZm9yIGRlYWxpbmcgd2l0aCBsaXN0c1xuLy9cblxuLy8gVE9ETzogY29uZmlybSBpZGVudGlmaWVycyBhcmUgcGx1cmFsIGluIHNvbWUgb2YgdGhlIGJlbG93P1xuLy8gVE9ETzogYGxpc3QuY2xvbmUoKWAgdG8gcmV0dXJuIG5ldyBsaXN0IG9mIHNhbWUgdHlwZS5cblxuaW1wb3J0IFBhcnNlciBmcm9tIFwiLi4vUGFyc2VyXCI7XG5pbXBvcnQgUnVsZSBmcm9tIFwiLi4vUnVsZVwiO1xuXG5pbXBvcnQgeyBpc1BsdXJhbCwgc2luZ3VsYXJpemUgfSBmcm9tIFwiLi4vdXRpbHMvc3RyaW5nXCI7XG5cbi8vIENyZWF0ZSBcImxpc3RzXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcImxpc3RzXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBJbXBvcnQgY29yZSBydWxlcy5cbmltcG9ydCBcIi4vY29yZVwiO1xucGFyc2VyLmltcG9ydChcImNvcmVcIik7XG5cblxuLy8gV09SS0lORyBGUk9NIE9USEVSIFJVTEVTICh0ZXN0bWUpXG4vL1x0YHRoZSBsZW5ndGggb2YgPGxpc3Q+YFxuLy9cdGA8dGhpbmc+IGlzIG5vdD8gaW4gPGxpc3Q+YFxuLy9cdGA8bGlzdD4gaXMgbm90PyBlbXB0eWBcbi8vXHRgc2V0IGl0ZW0gMSBvZiBteUxpc3QgdG8gJ2EnYFxuXG5cbi8vIFRPRE86IFx0YGNyZWF0ZSBsaXN0IHdpdGggPGV4cD4sIDxleHA+LCA8ZXhwPmBcbi8vIFRPRE86XHRgZHVwbGljYXRlIGxpc3RgXG4vLyBUT0RPOlx0YGR1cGxpY2F0ZSBsaXN0IHdpdGggPGV4cD4sIDxleHA+LCA8ZXhwPmAgPz8/XG4vLyBUT0RPOlx0YHRoZSBzaXplIG9mIDxsaXN0PmAgPT4gd2lsbCBtYXAgdG8gYGxpc3Quc2l6ZWAuLi5cbi8vXHRcdFx0XHQtIGluc3RhbGwgYHNpemVgIGFzIGFuIGFsaWFzIHRvIGBsZW5ndGhgP1xuLy8gVE9ETzpcdGBtb3ZlIDx0aGluZz4gdG8gZW5kIG9mIDxsaXN0PmAgPz8/XG4vLyBUT0RPOlx0YFNldGAgZm9yIGEgdW5pcXVlIGxpc3Q/XG4vLyBUT0RPOlx0dHlwZWQgbGlzdD9cbi8vIFRPRE86XHRsaXN0IHdoaWNoIHdvbid0IHRha2UgbnVsbC91bmRlZmluZWRcblxuXG4vLyBSZXR1cm4gdGhlIGxlbmd0aCBvZiB0aGUgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXN0X2xlbmd0aFwiLFxuXHRcInRoZT8gbnVtYmVyIG9mIHtpZGVudGlmaWVyfSBpbiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X2xlbmd0aCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QsIGlkZW50aWZpZXIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcbi8vIFRPRE86IHNwZWNpYWwgY2FzZSAnd29yZHMnLCAnbGluZXMnLCBldGNcblx0XHRcdHJldHVybiBgJHtsaXN0fS5sZW5ndGhgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gUmV0dXJuIHRoZSBmaXJzdCBwb3NpdGlvbiBvZiBzcGVjaWZpZWQgaXRlbSBpbiB0aGUgbGlzdCBhcyBhbiBhcnJheS5cbi8vIElmIGl0ZW0gaXMgbm90IGZvdW5kLCByZXR1cm5zIGB1bmRlZmluZWRgLlxuLy8gTk9URTogdGhpcyBwb3NpdGlvbiByZXR1cm5lZCBpcyAqKjEtYmFzZWQqKi5cbi8vVEVTVE1FXG4vLyBUT0RPOiBgcG9zaXRpb25zYCwgYGxhc3QgcG9zaXRpb25gLCBgYWZ0ZXIuLi5gXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXN0X3Bvc2l0aW9uXCIsXG5cdFwidGhlPyBwb3NpdGlvbiBvZiB7dGhpbmc6ZXhwcmVzc2lvbn0gaW4ge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9wb3NpdGlvbiBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnBvc2l0aW9uT2YoJHt0aGluZ30sICR7bGlzdH0pYFxuXHRcdH1cblx0fVxuKTtcblxuXG4vL1xuLy9cdE9yZGluYWwgbnVtYmVycyAoZmlyc3QsIHNlY29uZCwgbGFzdCwgZXRjKS5cbi8vIFRPRE86IHNpeHR5LWZpZnRoLCB0d28gaHVuZHJlZCBmb3J0eSBuaW50aC4uLlxuLy9cbnBhcnNlci5hZGRSdWxlKFwib3JkaW5hbFwiLCBjbGFzcyBvcmRpbmFsIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXN7fSk7XG5jbGFzcyBvcmRpbmFsIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHt9XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaXJzdFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAxIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2Vjb25kXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJ0aGlyZFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAzIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwiZm91cnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDQgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaWZ0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA1IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwic2l4dGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNiB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInNldmVudGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gNyB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImVpZ2h0aFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiA4IH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwibmludGhcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gOSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcInRlbnRoXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDEwIH0pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwicGVudWx0aW1hdGVcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTIgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJmaW5hbFwiLCBvcmRpbmFsLCB7IHRvU291cmNlOiAoKSA9PiAtMSB9KTtcbnBhcnNlci5hZGRLZXl3b3JkKFwib3JkaW5hbFwiLCBcImxhc3RcIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cblxuLy8gdHJlYXQgbGlzdCBhcyBhIHN0YWNrIG9yIHF1ZXVlXG4vL1RFU1RNRVxucGFyc2VyLmFkZEtleXdvcmQoXCJvcmRpbmFsXCIsIFwidG9wXCIsIG9yZGluYWwsIHsgdG9Tb3VyY2U6ICgpID0+IDEgfSk7XG5wYXJzZXIuYWRkS2V5d29yZChcIm9yZGluYWxcIiwgXCJib3R0b21cIiwgb3JkaW5hbCwgeyB0b1NvdXJjZTogKCkgPT4gLTEgfSk7XG5cblxuLy8gSW5kZXggZXhwcmVzc2lvbjogbnVtZXJpYyBwb3NpdGlvbiBpbiBzb21lIGxpc3QuXG4vL1x0ZS5nLlx0YGNhcmQgMSBvZiB0aGUgcGlsZWBcbi8vXHRcdFx0YGNhcmQgIzIgb2YgdGhlIHBpbGVgXG4vL1x0XHRcdGB0aGUgZmlyc3QgY2FyZCBvZiB0aGUgcGlsZWBcbi8vXG4vLyBOT1RFOiBOZWdhdGl2ZSBudW1lcmljIHBvc2l0aW9ucyBjb21lIGZyb20gdGhlIEVORCBvZiB0aGUgbGlzdC5cbi8vXHRlLmcuXHRgY2FyZCAtMSBvZiB0aGUgcGlsZWBcbi8vXG4vLyBOT1RFOiBPdXIgcG9zaXRpb25zIGFyZSAqKjEtYmFzZWQqKiBhbmQgSmF2YXNjcmlwdCBpcyAqKjAtYmFzZWQqKi5cbi8vXHRcdCBlLmcuIGBpdGVtIDEgb2YgdGhlIGFycmF5YCAgPSBgYXJyYXlbMF1gXG4vL1xuLy8gVE9ETzogaWYgYGlkZW50aWZpZXJgIGlzIFwid29yZFwiLCBvdXRwdXQgYGdldFdvcmQoKWAgZXRjXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwb3NpdGlvbl9leHByZXNzaW9uXCIsXG5cdFtcblx0XHRcIntpZGVudGlmaWVyfSB7cG9zaXRpb246ZXhwcmVzc2lvbn0gb2YgKHRoZT8pIHtleHByZXNzaW9ufVwiLFxuXHRcdFwidGhlIHtwb3NpdGlvbjpvcmRpbmFsfSB7aWRlbnRpZmllcn0gb2YgKHRoZT8pIHtleHByZXNzaW9ufVwiXG5cdF0sXG5cdGNsYXNzIHBvc2l0aW9uX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb257XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgcG9zaXRpb24sIGV4cHJlc3Npb24gfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcbi8vIFRPRE86IHNwZWNpYWwgY2FzZSAnd29yZHMnLCAnbGluZXMnLCBldGNcblxuXHRcdFx0Ly8gSWYgd2UgZ290IGEgcG9zaXRpdmUgbnVtYmVyIGxpdGVyYWwsIGNvbXBlbnNhdGUgZm9yIEpTIDAtYmFzZWQgYXJyYXlzIG5vdyxcblx0XHRcdC8vIGZvciBuaWNlciBvdXRwdXQuXG5cdFx0XHRpZiAodHlwZW9mIHBvc2l0aW9uID09PSBcIm51bWJlclwiICYmIHBvc2l0aW9uID4gMCkge1xuXHRcdFx0XHRyZXR1cm4gYCR7ZXhwcmVzc2lvbn1bJHtwb3NpdGlvbiAtIDF9XWA7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtwb3NpdGlvbn0pYDtcblxuXHQvLyBUaGlzIGlzIHNhZmVyLCBidXQgdXNpbmcgdGhlIGFib3ZlIHNvbWV0aW1lcyBmb3IgZGVtbyBwdXJwb3Nlc1xuXHQvL1x0XHRyZXR1cm4gYHNwZWxsLmdldEl0ZW0oJHtleHByZXNzaW9ufSwgJHtwb3NpdGlvbn0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFBpY2sgYSBTSU5HTEUgcmFuZG9tIGl0ZW0gZnJvbSB0aGUgbGlzdC5cbi8vIFRPRE86IGNvbmZpcm0gaWRlbnRpZmllciBpcyBwbHVyYWw/XG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZG9tX3Bvc2l0aW9uX2V4cHJlc3Npb25cIixcblx0XCJhIHJhbmRvbSB7aWRlbnRpZmllcn0gKG9mfGZyb218aW4pICh0aGUpPyB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5kb21fcG9zaXRpb25fZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5kb21JdGVtT2YoJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gUGljayBhIHVuaXF1ZSBzZXQgb2YgcmFuZG9tIGl0ZW1zIGZyb20gdGhlIGxpc3QsIHJldHVybmluZyBhbiBhcnJheS5cbi8vIFRPRE86IGB0d28gcmFuZG9tIGl0ZW1zLi4uYFxuLy8gVE9ETzogY29uZmlybSBpZGVudGlmaWVyIGlzIHBsdXJhbD9cbi8vIFRPRE86IGBsaXN0LmNsb25lKClgIHRvIHJldHVybiBuZXcgbGlzdCBvZiBzYW1lIHR5cGUuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZG9tX3Bvc2l0aW9uc19leHByZXNzaW9uXCIsXG5cdFwie251bWJlcn0gcmFuZG9tIHtpZGVudGlmaWVyfSAob2Z8ZnJvbXxpbikgKHRoZSk/IHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJhbmRvbV9wb3NpdGlvbnNfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbnVtYmVyLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldFJhbmRvbUl0ZW1zT2YoJHtsaXN0fSwgJHtudW1iZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFJhbmdlIGV4cHJlc3Npb24uXG4vLyBSZXR1cm5zIGEgbmV3IGxpc3QuXG4vLyBOT1RFOiBgc3RhcnRgIGlzICoqMS1iYXNlZCoqLlxuLy8gTk9URTogYGVuZGAgaXMgaW5jbHVzaXZlIVxuLy8gVE9ETzogY29uZmlybSBpZGVudGlmaWVyIGlzIHBsdXJhbD9cbi8vIFRPRE86IGBsaXN0LmNsb25lKClgIHRvIHJldHVybiBuZXcgbGlzdCBvZiBzYW1lIHR5cGUuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZ2VfZXhwcmVzc2lvblwiLFxuXHRcIntpZGVudGlmaWVyfSB7c3RhcnQ6ZXhwcmVzc2lvbn0gdG8ge2VuZDpleHByZXNzaW9ufSBvZiB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBzdGFydCwgZW5kLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmdldFJhbmdlKCR7bGlzdH0sICR7c3RhcnR9LCAke2VuZH0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFN0YXJ0aW5nIHJhbmdlIGV4cHJlc3Npb24uXG4vLyBSZXR1cm5zIGEgbmV3IGxpc3QuXG4vLyBlLmcuXHRgZmlyc3QgNCBpdGVtcyBvZiBsaXN0YFxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImZpcnN0X2luX3JhbmdlXCIsXG5cdFwiZmlyc3Qge251bWJlcjpleHByZXNzaW9ufSB7aWRlbnRpZmllcn0gKGlufG9mKSB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBudW1iZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0UmFuZ2UoJHtsaXN0fSwgMSwgJHtudW1iZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBFbmRpbmcgcmFuZ2UgZXhwcmVzc2lvbi5cbi8vIFJldHVybnMgYSBuZXcgbGlzdC5cbi8vIGUuZy5cdGBsYXN0IDQgaXRlbXMgb2YgbGlzdGBcbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsYXN0X2luX3JhbmdlXCIsXG5cdFwibGFzdCB7bnVtYmVyOmV4cHJlc3Npb259IHtpZGVudGlmaWVyfSAoaW58b2YpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJhbmdlX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG51bWJlciwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRFbmRSYW5nZSgke2xpc3R9LCAxLCAke251bWJlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gUmFuZ2UgZXhwcmVzc2lvbiBzdGFydGluZyBhdCBzb21lIGl0ZW0gaW4gdGhlIGxpc3QuXG4vLyBSZXR1cm5zIGEgbmV3IGxpc3QuXG4vLyBJZiBpdGVtIGlzIG5vdCBmb3VuZCwgcmV0dXJucyBhbiBlbXB0eSBsaXN0LiAoPz8/KVxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcInJhbmdlX2V4cHJlc3Npb25cIixcblx0XCJ7aWRlbnRpZmllcn0gKGlufG9mKSB7bGlzdDpleHByZXNzaW9ufSBzdGFydGluZyB3aXRoIHt0aGluZzpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyByYW5nZV9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5FeHByZXNzaW9uIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0aGluZywgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXRSYW5nZSgke2xpc3R9LCBzcGVsbC5wb3NpdGlvbk9mKCR7dGhpbmd9LCAke2xpc3R9KSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBMaXN0IGZpbHRlci5cbi8vIE5PVEU6IHdlIHdpbGwgc2luZ3VsYXJpemUgYGlkZW50aWZpZXJgIGFuZCB1c2UgdGhhdCBhcyB0aGUgYXJndW1lbnQgdG8gYGV4cHJlc3Npb25gLlxuLy9URVNUTUVcbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcImxpc3RfZmlsdGVyXCIsXG5cdFwie2lkZW50aWZpZXJ9IChpbnxvZikge2xpc3Q6ZXhwcmVzc2lvbn0gd2hlcmUge2NvbmRpdGlvbjpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X2ZpbHRlciBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgaWRlbnRpZmllciwgY29uZGl0aW9uLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyB1c2Ugc2luZ3VsYXIgb2YgaWRlbnRpZmllciBmb3IgbWV0aG9kIGFyZ3VtZW50XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBzaW5ndWxhcml6ZShpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHRcdHJldHVybiBgc3BlbGwuZmlsdGVyKCR7bGlzdH0sICR7YXJndW1lbnR9ID0+ICR7Y29uZGl0aW9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBTZXQgbWVtYmVyc2hpcCAobGVmdCByZWN1cnNpdmUpLlxuLy8gTk9URTogd2Ugd2lsbCBzaW5ndWxhcml6ZSBgaWRlbnRpZmllcmAgYW5kIHVzZSB0aGF0IGFzIHRoZSBhcmd1bWVudCB0byBgZXhwcmVzc2lvbmAuXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwibGlzdF9tZW1iZXJzaGlwX3Rlc3RcIixcblx0XCJ7bGlzdDpleHByZXNzaW9ufSAob3BlcmF0b3I6aGFzfGhhcyBub3xkb2VzbnQgaGF2ZXxkb2VzIG5vdCBoYXZlKSB7aWRlbnRpZmllcn0gd2hlcmUge2ZpbHRlcjpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X21lbWJlcnNoaXBfdGVzdCBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Ly8gQWRkIHRlc3QgcnVsZSBmb3IgcXVpY2tlciBwcm9jZXNzaW5nXG5cdFx0dGVzdFJ1bGUgPSBuZXcgUnVsZS5NYXRjaCh7IG1hdGNoOiBbXCJ3aGVyZVwiXSB9KTtcblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIsIG9wZXJhdG9yLCBmaWx0ZXIsIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBiYW5nID0gb3BlcmF0b3IgPT09IFwiaGFzXCIgPyBcIlwiIDogXCIhXCI7XG5cdFx0XHQvLyB1c2Ugc2luZ3VsYXIgb2YgaWRlbnRpZmllciBmb3IgbWV0aG9kIGFyZ3VtZW50XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBzaW5ndWxhcml6ZShpZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHRcdHJldHVybiBgJHtiYW5nfXNwZWxsLmFueSgke2xpc3R9LCAke2FyZ3VtZW50fSA9PiAke2ZpbHRlcn0pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vXG4vL1x0QWRkaW5nIHRvIGxpc3QgKGluLXBsYWNlKVxuLy9cblxuLy8gQWRkIHRvIGVuZCBvZiBsaXN0LlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9hcHBlbmRcIixcblx0W1xuXHRcdFwiYXBwZW5kIHt0aGluZzpleHByZXNzaW9ufSB0byB7bGlzdDpleHByZXNzaW9ufVwiLFxuXHRcdFwiYWRkIHt0aGluZzpleHByZXNzaW9ufSB0byAoKHRoZT8pIGVuZCBvZik/IHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdF0sXG5cdGNsYXNzIGxpc3RfYXBwZW5kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLmFwcGVuZCgke2xpc3R9LCAke3RoaW5nfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gQWRkIHRvIGJlZ2lubmluZyBvZiBsaXN0LlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9wcmVwZW5kXCIsXG5cdFtcblx0XHRcInByZXBlbmQge3RoaW5nOmV4cHJlc3Npb259IHRvIHtsaXN0OmV4cHJlc3Npb259XCIsXG4vL1widG9wXCIgYXMgc3RhY2sgPT09IGJvdHRvbT9cblx0XHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8gdGhlIChzdGFydHxmcm9udHx0b3ApIG9mIHtsaXN0OmV4cHJlc3Npb259XCJcblx0XSxcblx0Y2xhc3MgbGlzdF9wcmVwZW5kIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnByZXBlbmQoJHtsaXN0fSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cbi8vIEFkZCB0byBtaWRkbGUgb2YgbGlzdCwgcHVzaGluZyBleGlzdGluZyBpdGVtcyBvdXQgb2YgdGhlIHdheS5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfYWRkX2F0XCIsXG5cdFwiYWRkIHt0aGluZzpleHByZXNzaW9ufSB0byB7bGlzdDpleHByZXNzaW9ufSBhdCBwb3NpdGlvbiB7cG9zaXRpb246ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9zcGxpY2UgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIHBvc2l0aW9uLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnNwbGljZSgke2xpc3R9LCAke3Bvc2l0aW9ufSwgJHt0aGluZ30pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gVE9ETzogIFx0XCJhZGQge3RoaW5nOmV4cHJlc3Npb259IHRvIHtsaXN0OmV4cHJlc3Npb259IGJlZm9yZSB7aXRlbTpleHByZXNzaW9ufVwiLFxuXG4vLyBBZGQgdG8gbWlkZGxlIG9mIGxpc3QsIHB1c2hpbmcgZXhpc3RpbmcgaXRlbXMgb3V0IG9mIHRoZSB3YXkuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X2FkZF9hZnRlclwiLFxuXHRcImFkZCB7dGhpbmc6ZXhwcmVzc2lvbn0gdG8ge2xpc3Q6ZXhwcmVzc2lvbn0gYWZ0ZXIge2l0ZW06ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9hZGRfYWZ0ZXIgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgdGhpbmcsIGl0ZW0sIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuc3BsaWNlKCR7bGlzdH0sIHNwZWxsLnBvc2l0aW9uT2YoJHtsaXN0fSwgJHtpdGVtfSksICR7dGhpbmd9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHRSZW1vdmluZyBmcm9tIGxpc3QgKGluLXBsYWNlKVxuLy9cblxuLy8gRW1wdHkgbGlzdC5cbi8vVE9ETzogbWFrZSBgZW1wdHlgIGFuZC9vciBgY2xlYXJgIGEgZ2VuZXJpYyBzdGF0ZW1lbnQ/Pz9cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfZW1wdHlcIixcblx0XCIoZW1wdHl8Y2xlYXIpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfZW1wdHkgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5jbGVhcigke2xpc3R9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBSZW1vdmUgb25lIGl0ZW0gZnJvbSBsaXN0IGJ5IHBvc2l0aW9uLlxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFwibGlzdF9yZW1vdmVfcG9zaXRpb25cIixcblx0XCJyZW1vdmUge2lkZW50aWZpZXJ9IHtudW1iZXI6ZXhwcmVzc2lvbn0gb2Yge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9yZW1vdmVfcG9zaXRpb24gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbnVtYmVyLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnJlbW92ZUl0ZW0oJHtsaXN0fSwgJHtudW1iZXJ9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBSZW1vdmUgcmFuZ2Ugb2YgdGhpbmdzIGZyb20gbGlzdC5cbi8vIE5PVEU6IGBzdGFydGAgaXMgKioxLWJhc2VkKiouXG4vLyBOT1RFOiBgZW5kYCBpcyBpbmNsdXNpdmUhXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3JlbW92ZV9yYW5nZVwiLFxuXHRcInJlbW92ZSB7aWRlbnRpZmllcn0ge3N0YXJ0OmV4cHJlc3Npb259IHRvIHtlbmQ6ZXhwcmVzc2lvbn0gb2Yge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9yZW1vdmVfcG9zaXRpb24gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc3RhcnQsIGVuZCwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5yZW1vdmVSYW5nZSgke2xpc3R9LCAke3N0YXJ0fSwgJHtlbmR9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFJlbW92ZSBhbGwgaW5zdGFuY2VzIG9mIHNvbWV0aGluZyBmcm9tIGEgbGlzdC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlXCIsXG5cdFwicmVtb3ZlIHt0aGluZzpleHByZXNzaW9ufSBmcm9tIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3RfcmVtb3ZlIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnJlbW92ZSgke2xpc3R9LCAke3RoaW5nfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gUmVtb3ZlIGFsbCBpdGVtcyBmcm9tIGxpc3Qgd2hlcmUgY29uZGl0aW9uIGlzIHRydWUuXG4vLyBOT1RFOiB3ZSB3aWxsIHNpbmd1bGFyaXplIGBpZGVudGlmaWVyYCBhbmQgdXNlIHRoYXQgYXMgdGhlIGFyZ3VtZW50IHRvIGBleHByZXNzaW9uYC5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmVtb3ZlX3doZXJlXCIsXG5cdFwicmVtb3ZlIHtpZGVudGlmaWVyfSAoaW58b2Z8ZnJvbSkge2xpc3Q6ZXhwcmVzc2lvbn0gd2hlcmUge2NvbmRpdGlvbjpleHByZXNzaW9ufVwiLFxuXHRjbGFzcyBsaXN0X3JlbW92ZV93aGVyZSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBpZGVudGlmaWVyLCBjb25kaXRpb24sIGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIHVzZSBzaW5ndWxhciBvZiBpZGVudGlmaWVyIGZvciBtZXRob2QgYXJndW1lbnRcblx0XHRcdGxldCBhcmd1bWVudCA9IHNpbmd1bGFyaXplKGlkZW50aWZpZXIudG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdFx0cmV0dXJuIGBzcGVsbC5yZW1vdmVXaGVyZSgke2xpc3R9LCAke2FyZ3VtZW50fSA9PiAke2NvbmRpdGlvbn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRSYW5kb20gKGluLXBsYWNlKSBsaXN0IG1hbmlwdWxhdGlvbi5cbi8vXG5cbi8vIFJldmVyc2UgbGlzdCBpbi1wbGFjZS5cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfcmV2ZXJzZVwiLFxuXHRcInJldmVyc2Uge2xpc3Q6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgbGlzdF9yZXZlcnNlIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGxpc3QgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwucmV2ZXJzZSgke2xpc3R9KWA7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBTaHVmZmxlIGxpc3QgaW4tcGxhY2UuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0XCJsaXN0X3NodWZmbGVcIixcblx0XCIocmFuZG9taXplfHNodWZmbGUpIHtsaXN0OmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGxpc3Rfc2h1ZmZsZSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaXN0IH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYHNwZWxsLnNodWZmbGUoJHtsaXN0fSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBJdGVyYXRpb25cbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcImxpc3RfaXRlcmF0aW9uXCIsXG5cdFtcblx0XHRcImZvciAoZWFjaCk/IHtpdGVtVmFyOmlkZW50aWZpZXJ9IGluIHtsaXN0OmV4cHJlc3Npb259Oj8ge3N0YXRlbWVudH0/XCIsXG5cdFx0XCJmb3IgKGVhY2gpPyB7aXRlbVZhcjppZGVudGlmaWVyfSAoYW5kfCwpIHtwb3NpdGlvblZhcjppZGVudGlmaWVyfSBpbiB7bGlzdDpleHByZXNzaW9ufTo/IHtzdGF0ZW1lbnR9P1wiLFxuXHRdLFxuXHRjbGFzcyBsaXN0X2l0ZXJhdGlvbiBleHRlbmRzIFJ1bGUuQmxvY2tTdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGl0ZW1WYXIsIHBvc2l0aW9uVmFyLCBsaXN0LCBzdGF0ZW1lbnQsIGJsb2NrIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgb3V0cHV0O1xuXHRcdFx0aWYgKHBvc2l0aW9uVmFyKSB7XG5cdFx0XHRcdG91dHB1dCA9IGBmb3IgKGxldCAke3Bvc2l0aW9uVmFyfSA9IDEsIGJhcjsgJHtpdGVtVmFyfSA9ICR7bGlzdH1bJHtwb3NpdGlvblZhcn0tMV0sICR7cG9zaXRpb25WYXJ9IDw9ICR7bGlzdH0ubGVuZ3RoOyAke3Bvc2l0aW9uVmFyfSsrKSBgXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Ly8gTk9URTogdGhpcyBpcyByZWxhdGl2ZWx5IHNsb3cuLi4gIHByb2JhYmx5IGRvZXNuJ3QgbWF0dGVyLi4uXG5cdFx0XHRcdG91dHB1dCA9IGBmb3IgKGxldCAke2l0ZW1WYXJ9IG9mICR7bGlzdH0pIGA7XG5cdFx0XHR9XG5cdFx0XHRvdXRwdXQgKz0gUnVsZS5CbG9jay5lbmNsb3NlU3RhdGVtZW50cyhzdGF0ZW1lbnQsIGJsb2NrKTtcblx0XHRcdHJldHVybiBvdXRwdXQ7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIFJhbmdlXG4vL1RFU1RNRVxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicmFuZ2VfZXhwcmVzc2lvblwiLFxuXHRcInJhbmdlIHtzdGFydDpleHByZXNzaW9ufSB0byB7ZW5kOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJhbmdlX2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHN0YXJ0LCBlbmQgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgc3BlbGwuZ2V0UmFuZ2UoJHtzdGFydH0sICR7ZW5kfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9saXN0cy5qcyIsIi8vXG4vL1x0IyBSdWxlcyBmb3IgaW5maXggYW5kIHByZWZpeCBvcGVyYXRvcnMuXG4vL1xuXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5cbi8vIENyZWF0ZSBcIm9wZXJhdG9yc1wiIHBhcnNlciBjb250ZXh0LlxuY29uc3QgcGFyc2VyID0gUGFyc2VyLmZvckNvbnRleHQoXCJvcGVyYXRvcnNcIik7XG5leHBvcnQgZGVmYXVsdCBwYXJzZXI7XG5cbi8vIEltcG9ydCBjb3JlIHJ1bGVzLlxuaW1wb3J0IFwiLi9jb3JlXCI7XG5wYXJzZXIuaW1wb3J0KFwiY29yZVwiKTtcblxuLy8jIyBJbmZpeCBvcGVyYXRvcnM6ICAgYHtsaHN9IDxvcGVyYXRvcj4ge3Joc31gLCBlZzogYGEgaXMgMWBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgdHdvIGFyZ3VtZW50cyAoYGxoc2AgYW5kIGByaHNgKSBpbnRvIG91dHB1dC5cblxuLy8gTk9URTogYHByZWNlZGVuY2VgIG51bWJlcnMgY29tZSBmcm9tIEphdmFzY3JpcHQgZXF1aXZhbGVudHNcbi8vXHRcdCBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9PcGVyYXRvcnMvT3BlcmF0b3JfUHJlY2VkZW5jZVxuXG5wYXJzZXIuYWRkUnVsZShcImluZml4X29wZXJhdG9yXCIsIGNsYXNzIGluZml4X29wZXJhdG9yIGV4dGVuZHMgUnVsZS5BbHRlcm5hdGl2ZXN7fSk7XG5cbi8vIFRPRE86XG4vLyBcdC8vIEZpbmQgYmVzdCBtYXRjaCBhY2NvcmRpbmcgdG8gb3BlcmF0b3IgcHJlY2VkZW5jZSBhcyBkZWZpbmVkIGJlbG93LlxuLy8gXHRnZXRCZXN0TWF0Y2gobWF0Y2hlcykge1xuLy8gXHRcdGNvbnNvbGUud2FybihcIkdCTVwiLCBtYXRjaGVzLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5wcmVjZWRlbmNlKSwgbWF0Y2hlcy5tYXAobWF0Y2ggPT4gbWF0Y2gubWF0Y2hlZFRleHQpKTtcbi8vIFx0XHRyZXR1cm4gbWF0Y2hlcy5yZWR1Y2UoZnVuY3Rpb24gKGJlc3QsIG5leHQpIHtcbi8vIFx0XHRcdC8vIHRha2UgaGlnaGVzdCBwcmVjZWRlbmNlIG1hdGNoIGZpcnN0XG4vLyBcdFx0XHRpZiAobmV4dC5wcmVjZWRlbmNlID4gYmVzdC5wcmVjZWRlbmNlKSByZXR1cm4gbmV4dDtcbi8vIFx0XHRcdC8vIHRha2UgbG9uZ2VzdCBtYXRjaCBpZiBzYW1lIHByZWNlZGVuY2Vcbi8vIFx0XHRcdGlmIChuZXh0LnByZWNlZGVuY2UgPT09IGJlc3QucHJlY2VkZW5jZSkge1xuLy8gXHRcdFx0XHRpZiAobmV4dC5lbmRJbmRleCA+IGJlc3QuZW5kSW5kZXgpIHJldHVybiBuZXh0O1xuLy8gXHRcdFx0fVxuLy8gXHRcdFx0cmV0dXJuIGJlc3Q7XG4vLyBcdFx0fSwgbWF0Y2hlc1swXSk7XG4vLyBcdH1cblxuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJpbmZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2xoczpleHByZXNzaW9ufSB7b3BlcmF0b3I6aW5maXhfb3BlcmF0b3J9IHtyaHM6ZXhwcmVzc2lvbn1cIixcblx0Y2xhc3MgaW5maXhfb3BlcmF0b3JfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Ly8gV2UgQ0FOTk9UIG1hdGNoIGlmIGBpbmZpeF9vcGVyYXRvcmAgaXNuJ3QgZm91bmQgaW4gdGhlIGV4cHJlc3Npb24uXG5cdFx0dGVzdFJ1bGUgPSBcImluZml4X29wZXJhdG9yXCI7XG5cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBsaHMsIHJocywgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGxocy50b1NvdXJjZShjb250ZXh0KSwgcmhzLnRvU291cmNlKGNvbnRleHQpKTtcblx0XHR9XG5cdH1cbik7XG5cblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImFuZFwiLFxuXHRjbGFzcyBhbmQgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gNjsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSAmJiAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwib3JcIixcblx0Y2xhc3Mgb3IgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gNTsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSB8fCAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXNcIixcblx0IGNsYXNzIGlzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ID09ICR7Yn0pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90XCIsXG5cdCBjbGFzcyBpc19ub3QgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTA7IHRvSlMoYSxiKSB7IHJldHVybiBgKCR7YX0gIT0gJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGV4YWN0bHlcIixcblx0Y2xhc3MgaXNfZXhhY3RseSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMDsgdG9KUyhhLGIpIHsgcmV0dXJuIGAoJHthfSA9PT0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgZXhhY3RseVwiLFxuXHQgY2xhc3MgIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDEwOyB0b0pTKGEsYikgeyByZXR1cm4gYCgke2F9ICE9PSAke2J9KWAgfSB9XG4pO1xuXG4vL1RPRE86IGBzcGVsbC5pc09mVHlwZSh0aGluZywgdHlwZSlgXG4vL1RPRE86IGBpcyBzYW1lIHR5cGUgYXNgID9cbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBhXCIsXG5cdCBjbGFzcyBpc19hIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBhblwiLFxuXHQgY2xhc3MgaXNfYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGBzcGVsbC5pc09mVHlwZSgke3RoaW5nfSwgJyR7dHlwZX0nKWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGFcIixcblx0IGNsYXNzIGlzX25vdF9hIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCB0eXBlKSB7IHJldHVybiBgIXNwZWxsLmlzT2ZUeXBlKCR7dGhpbmd9LCAnJHt0eXBlfScpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGFuXCIsXG5cdCBjbGFzcyBpc19ub3RfYW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIHR5cGUpIHsgcmV0dXJuIGAhc3BlbGwuaXNPZlR5cGUoJHt0aGluZ30sICcke3R5cGV9JylgIH0gfVxuKTtcblxuLy9UT0RPOiBgc3BlbGwuY29udGFpbnMoY29sbGVjdGlvbiwgdGhpbmcpYFxucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGluXCIsXG5cdCBjbGFzcyBpc19pbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyh0aGluZywgbGlzdCkgeyByZXR1cm4gYCR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgb25lIG9mXCIsXG5cdCBjbGFzcyBpc19vbmVfb2YgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGluXCIsXG5cdCBjbGFzcyBpc19ub3RfaW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlModGhpbmcsIGxpc3QpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBub3Qgb25lIG9mXCIsXG5cdCBjbGFzcyBpc19ub3Rfb25lX29mIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKHRoaW5nLCBsaXN0KSB7IHJldHVybiBgISR7bGlzdH0uaW5jbHVkZXMoJHt0aGluZ30pYCB9IH1cbik7XG5cblxuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiaW5jbHVkZXNcIixcblx0IGNsYXNzIGluY2x1ZGVzIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGxpc3QsIHRoaW5nKSB7IHJldHVybiBgJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJjb250YWluc1wiLFxuXHQgY2xhc3MgY29udGFpbnMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwiZG9lcyBub3QgaW5jbHVkZVwiLFxuXHQgY2xhc3MgZG9lc19ub3RfaW5jbHVkZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhsaXN0LCB0aGluZykgeyByZXR1cm4gYCEke2xpc3R9LmluY2x1ZGVzKCR7dGhpbmd9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImRvZXMgbm90IGNvbnRhaW5cIixcblx0IGNsYXNzIGRvZXNfbm90X2NvbnRhaW4gZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMobGlzdCwgdGhpbmcpIHsgcmV0dXJuIGAhJHtsaXN0fS5pbmNsdWRlcygke3RoaW5nfSlgIH0gfVxuKTtcblxuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCI+XCIsXG5cdCBjbGFzcyBndCBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGdyZWF0ZXIgdGhhblwiLFxuXHQgY2xhc3MgaXNfZ3JlYXRlcl90aGFuIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPiAke2J9KWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCI+PVwiLFxuXHQgY2xhc3MgZ3RlIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTE7IHRvSlMoYSxiKSB7IHJldHVybmAoJHthfSA+PSAke2J9KWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0b1wiLFxuXHQgY2xhc3MgaXNfZ3RlIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPj0gJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPFwiLFxuXHQgY2xhc3MgbHQgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDwgJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBsZXNzIHRoYW5cIixcblx0IGNsYXNzIGlzX2xlc3NfdGhhbiBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDwgJHtifSlgIH0gfVxuKTtcblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiPD1cIixcblx0IGNsYXNzIGx0ZSBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDExOyB0b0pTKGEsYikgeyByZXR1cm5gKCR7YX0gPD0gJHtifSlgIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG9cIixcblx0IGNsYXNzIGlzX2x0ZSBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMTsgdG9KUyhhLGIpIHsgcmV0dXJuYCgke2F9IDw9ICR7Yn0pYCB9IH1cbik7XG5cblxucGFyc2VyLmFkZFN5bWJvbChcImluZml4X29wZXJhdG9yXCIsIFwiXFxcXCtcIixcblx0IGNsYXNzIHBsdXMgZXh0ZW5kcyBSdWxlLlN5bWJvbCB7IHByZWNlZGVuY2UgPSAxMzsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKyAke2J9YCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcImluZml4X29wZXJhdG9yXCIsIFwicGx1c1wiLFxuXHQgY2xhc3MgcGx1cyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMzsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gKyAke2J9YCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIi1cIixcblx0IGNsYXNzIG1pbnVzIGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTM7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC0gJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcIm1pbnVzXCIsXG5cdCBjbGFzcyBtaW51cyBleHRlbmRzIFJ1bGUuS2V5d29yZCB7IHByZWNlZGVuY2UgPSAxMzsgdG9KUyhhLGIpIHsgcmV0dXJuYCR7YX0gLSAke2J9YCB9IH1cbik7XG5cbnBhcnNlci5hZGRTeW1ib2woXCJpbmZpeF9vcGVyYXRvclwiLCBcIlxcXFwqXCIsXG5cdCBjbGFzcyB0aW1lcyBleHRlbmRzIFJ1bGUuU3ltYm9sIHsgcHJlY2VkZW5jZSA9IDE0OyB0b0pTKGEsYikgeyByZXR1cm5gJHthfSAqICR7Yn1gIH0gfVxuKTtcbnBhcnNlci5hZGRLZXl3b3JkKFwiaW5maXhfb3BlcmF0b3JcIiwgXCJ0aW1lc1wiLFxuXHQgY2xhc3MgdGltZXMgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTQ7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9ICogJHtifWAgfSB9XG4pO1xuXG5wYXJzZXIuYWRkU3ltYm9sKFwiaW5maXhfb3BlcmF0b3JcIiwgXCIvXCIsXG5cdCBjbGFzcyBkaXZpZGVkX2J5IGV4dGVuZHMgUnVsZS5TeW1ib2wgeyBwcmVjZWRlbmNlID0gMTQ7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC8gJHtifWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJpbmZpeF9vcGVyYXRvclwiLCBcImRpdmlkZWQgYnlcIixcblx0IGNsYXNzIGRpdmlkZWRfYnkgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyBwcmVjZWRlbmNlID0gMTQ7IHRvSlMoYSxiKSB7IHJldHVybmAke2F9IC8gJHtifWAgfSB9XG4pO1xuXG4vL1RPRE86ICBgKz1gIGV0Yz8gIG90aGVyIG1hdGggZnVuY3Rpb25zP1xuXG5cbi8vXG4vL1xuLy8jIyBQb3N0aWZ4IG9wZXJhdG9yczogICBge2xoc30gPG9wZXJhdG9yPmAsIGUuZy4gYGEgaXMgZGVmaW5lZGBcbi8vIE5PVEU6IGBvcGVyYXRvci50b0pTYCBNVVNUIHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHRyYW5zZm9ybXMgYXJndW1lbnQgKGBsaHNgKSBpbnRvIEpTIG91dHB1dC5cblxucGFyc2VyLmFkZFJ1bGUoXCJwb3N0Zml4X29wZXJhdG9yXCIsIGNsYXNzIHBvc3RmaXhfb3BlcmF0b3IgZXh0ZW5kcyBSdWxlLkFsdGVybmF0aXZlc3t9KTtcblxucGFyc2VyLmFkZEV4cHJlc3Npb24oXG5cdFwicG9zdGZpeF9vcGVyYXRvcl9leHByZXNzaW9uXCIsXG5cdFwie2V4cHJlc3Npb259IHtvcGVyYXRvcjpwb3N0Zml4X29wZXJhdG9yfVwiLFxuXHRjbGFzcyBwb3N0Zml4X29wZXJhdG9yX2V4cHJlc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Ly8gV2UgQ0FOTk9UIG1hdGNoIGlmIGBwb3N0Zml4X29wZXJhdG9yYCBpc24ndCBmb3VuZCBpbiB0aGUgZXhwcmVzc2lvbi5cblx0XHR0ZXN0UnVsZSA9IFwicG9zdGZpeF9vcGVyYXRvclwiO1xuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgb3BlcmF0b3IgfSA9IHRoaXMucmVzdWx0cztcblx0XHRcdHJldHVybiBvcGVyYXRvci50b0pTKGV4cHJlc3Npb24udG9Tb3VyY2UoY29udGV4dCkpO1xuXHRcdH1cblx0fVxuKTtcblxucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgZGVmaW5lZFwiLFxuXHRjbGFzcyBpc19kZWZpbmVkIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gIT09ICd1bmRlZmluZWQnKWAgfSB9XG4pO1xucGFyc2VyLmFkZEtleXdvcmQoXCJwb3N0Zml4X29wZXJhdG9yXCIsIFwiaXMgbm90IGRlZmluZWRcIixcblx0Y2xhc3MgaXNfbm90X2RlZmluZWQgZXh0ZW5kcyBSdWxlLktleXdvcmQgeyB0b0pTKHRoaW5nKSB7IHJldHVybiBgKHR5cGVvZiAke3RoaW5nfSA9PT0gJ3VuZGVmaW5lZCcpYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyB1bmRlZmluZWRcIixcblx0Y2xhc3MgaXNfdW5kZWZpbmVkIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCh0eXBlb2YgJHt0aGluZ30gPT09ICd1bmRlZmluZWQnKWAgfSB9XG4pO1xuXG4vL1RPRE86IGBzcGVsbC5pc0VtcHR5KHRoaW5nKWBcbnBhcnNlci5hZGRLZXl3b3JkKFwicG9zdGZpeF9vcGVyYXRvclwiLCBcImlzIGVtcHR5XCIsXG5cdGNsYXNzIGlzX2VtcHR5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYHNwZWxsLmlzRW1wdHkoJHt0aGluZ30pYCB9IH1cbik7XG5wYXJzZXIuYWRkS2V5d29yZChcInBvc3RmaXhfb3BlcmF0b3JcIiwgXCJpcyBub3QgZW1wdHlcIixcblx0Y2xhc3MgaXNfbm90X2VtcHR5IGV4dGVuZHMgUnVsZS5LZXl3b3JkIHsgdG9KUyh0aGluZykgeyByZXR1cm4gYCFzcGVsbC5pc0VtcHR5KCR7dGhpbmd9KWAgfSB9XG4pO1xuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvcnVsZXMvb3BlcmF0b3JzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBjcmVhdGluZyB2YXJpYWJsZXMsIHByb3BlcnR5IGFjY2VzcywgZXRjXG4vL1xuXG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuLi9QYXJzZXJcIjtcbmltcG9ydCBSdWxlIGZyb20gXCIuLi9SdWxlU3ludGF4XCI7XG5cbi8vIENyZWF0ZSBcInN0YXRlbWVudHNcIiBwYXJzZXIgY29udGV4dC5cbmNvbnN0IHBhcnNlciA9IFBhcnNlci5mb3JDb250ZXh0KFwic3RhdGVtZW50c1wiKTtcbmV4cG9ydCBkZWZhdWx0IHBhcnNlcjtcblxuLy8gSW1wb3J0IGNvcmUgcnVsZXMuXG5pbXBvcnQgXCIuL2NvcmVcIjtcbnBhcnNlci5pbXBvcnQoXCJjb3JlXCIpO1xuXG5cbi8vXG4vL1x0IyMgUmV0dXJuc1xuLy9cblxuLy8gUmV0dXJuIGEgdmFsdWVcbi8vVEVTVE1FXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRcInJldHVybl9zdGF0ZW1lbnRcIixcblx0XCJyZXR1cm4ge2V4cHJlc3Npb259XCIsXG5cdGNsYXNzIHJldHVybl9zdGF0ZW1lbnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGByZXR1cm4gJHtleHByZXNzaW9ufWA7XG5cdFx0fVxuXHR9XG4pO1xuXG5cblxuLy9cbi8vXHQjIyBBc3NpZ25tZW50XG4vL1xuXG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0W1wiYXNzaWdubWVudFwiLCBcIk1VVEFUT1JcIl0sXG5cdFtcblx0XHRcInt0aGluZzpleHByZXNzaW9ufSA9IHt2YWx1ZTpleHByZXNzaW9ufVwiLFxuXHRcdFwic2V0IHt0aGluZzpleHByZXNzaW9ufSB0byB7dmFsdWU6ZXhwcmVzc2lvbn1cIixcblx0XHRcInB1dCB7dmFsdWU6ZXhwcmVzc2lvbn0gaW50byB7dGhpbmc6ZXhwcmVzc2lvbn1cIlxuXHRdLFxuXHRjbGFzcyBhc3NpZ25tZW50IGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHRoaW5nLCB2YWx1ZSB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gVE9ETzogZGVjbGFyZSBpZGVudGlmaWVyIGlmIG5vdCBpbiBzY29wZSwgZXRjXG5cdFx0XHRyZXR1cm4gYCR7dGhpbmd9ID0gJHt2YWx1ZX1gO1xuXHRcdH1cblx0fVxuKTtcblxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFtcImdldF9leHByZXNzaW9uXCIsIFwiTVVUQVRPUlwiXSxcblx0XCJnZXQge3ZhbHVlOmV4cHJlc3Npb259XCIsXG5cdGNsYXNzIGdldF9leHByZXNzaW9uIGV4dGVuZHMgUnVsZS5TdGF0ZW1lbnQge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IHZhbHVlIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7O1xuXHRcdFx0cmV0dXJuIGBpdCA9ICR7dmFsdWV9YFxuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vXG4vL1x0IyMgVXNlciBpbnRlcmFjdGlvblxuLy8gVE9ETzogbW92ZSBpbnRvIGFub3RoZXIgZmlsZVxuLy9cblxuLy8gQWxlcnQgYSBtZXNzYWdlLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJhbGVydFwiLCBcImFsZXJ0IHttZXNzYWdlOmV4cHJlc3Npb259ICg/OndpdGgge29rQnV0dG9uOnRleHR9KT9cIixcblx0Y2xhc3MgYWxlcnQgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgb2tCdXR0b24gPSBgXCJPS1wiYCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBhd2FpdCBzcGVsbC5hbGVydCgke21lc3NhZ2V9LCAke29rQnV0dG9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuLy8gV2FybmluZyBtZXNzYWdlIC0tIGxpa2UgYWxlcnQgYnV0IGZhbmNpZXIuXG4vLyBUT0RPOiBuZWVkIHNvbWUgZmFuY3kgcHJvbWlzZSBqdWp1IGhlcmU/XG4vL1RFU1RNRVxucGFyc2VyLmFkZFN0YXRlbWVudChcIndhcm5cIiwgXCJ3YXJuIHtleHByZXNzaW9uOmV4cHJlc3Npb259ICg/OndpdGgge29rQnV0dG9uOnRleHR9KT9cIixcblx0Y2xhc3Mgd2FybiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBtZXNzYWdlLCBva0J1dHRvbiA9IGBcIk9LXCJgIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLndhcm4oJHttZXNzYWdlfSwgJHtva0J1dHRvbn0pYDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gQ29uZmlybSBtZXNzYWdlIC0tIHByZXNlbnQgYSBxdWVzdGlvbiB3aXRoIHR3byBhbnN3ZXJzLlxuLy8gVE9ETzogbmVlZCBzb21lIGZhbmN5IHByb21pc2UganVqdSBoZXJlP1xuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXCJjb25maXJtXCIsIFwiY29uZmlybSB7bWVzc2FnZTpleHByZXNzaW9ufSAoPzp3aXRoIHtva0J1dHRvbjp0ZXh0fSAoPzogKGFuZHxvcikge2NhbmNlbEJ1dHRvbjp0ZXh0fSk/ICk/XCIsXG5cdGNsYXNzIGNvbmZpcm0gZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbWVzc2FnZSwgb2tCdXR0b24gPSBgXCJPS1wiYCwgY2FuY2VsQnV0dG9uID0gYFwiQ2FuY2VsXCJgIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYGF3YWl0IHNwZWxsLmNvbmZpcm0oJHttZXNzYWdlfSwgJHtva0J1dHRvbn0sICR7Y2FuY2VsQnV0dG9ufSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy9zdGF0ZW1lbnRzLmpzIiwiLy9cbi8vXHQjIFJ1bGVzIGZvciBkZWZpbmluZyBjbGFzc2VzIChrbm93biBhcyBgdHlwZXNgKVxuLy9cblxuLy8gVE9ETzogbWl4aW5zIC8gdHJhaXRzIC8gY29tcG9zZWQgY2xhc3NlcyAvIGFubm90YXRpb25zXG5cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcblxuaW1wb3J0IGdsb2JhbCBmcm9tIFwiLi4vdXRpbHMvZ2xvYmFsXCI7XG5pbXBvcnQgeyBwbHVyYWxpemUgfSBmcm9tIFwiLi4vdXRpbHMvc3RyaW5nXCI7XG5cbi8vIENyZWF0ZSBcInR5cGVzXCIgcGFyc2VyIGNvbnRleHQuXG5jb25zdCBwYXJzZXIgPSBQYXJzZXIuZm9yQ29udGV4dChcInR5cGVzXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG4vLyBJbXBvcnQgY29yZSBydWxlcy5cbmltcG9ydCBcIi4vY29yZVwiO1xucGFyc2VyLmltcG9ydChcImNvcmVcIik7XG5cbi8vIERlZmluZSBcInR5cGVcIiAoYS5rLmEuIFwiY2xhc3NcIikuXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRbXCJkZWZpbmVfdHlwZVwiLCBcIk1VVEFUT1JcIl0sXG5cdFwiZGVmaW5lIHR5cGUge25hbWU6dHlwZX0gKD86YXMgKGF8YW4pIHtzdXBlclR5cGU6dHlwZX0pP1wiLFxuXHRjbGFzcyBkZWZpbmVfdHlwZSBleHRlbmRzIFJ1bGUuQmxvY2tTdGF0ZW1lbnQge1xuXG5cdFx0Ly8gUmV0dXJuIGEgbG9naWNhbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgZGF0YSBzdHJ1Y3R1cmVcblx0XHR0b1N0cnVjdHVyZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBuYW1lLCBzdXBlclR5cGUgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdGxldCBibG9jayA9ICh0aGlzLmJsb2NrICYmIHRoaXMuYmxvY2subWF0Y2hlZCkgfHwgW107XG5cblx0XHRcdGxldCBzbG90cyA9IHt9O1xuXHRcdFx0bGV0IHByb3BlcnRpZXMgPSBbXTtcblx0XHRcdGxldCBtZXRob2RzID0gW107XG5cdFx0XHRsZXQgb3RoZXIgPSBbXTtcblx0XHRcdGJsb2NrLm1hcChzdGF0ZW1lbnQgPT4gc3RhdGVtZW50LnRvU3RydWN0dXJlKGNvbnRleHQpKVxuXHRcdFx0XHQgLmZpbHRlcihCb29sZWFuKVxuXHRcdFx0XHQgLmZvckVhY2goYWRkU3RydWN0dXJlKTtcblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dHlwZTogXCJjbGFzc1wiLFxuXHRcdFx0XHRuYW1lLFxuXHRcdFx0XHRzdXBlclR5cGUsXG5cdFx0XHRcdHNsb3RzLFxuXHRcdFx0XHRwcm9wZXJ0aWVzLFxuXHRcdFx0XHRtZXRob2RzLFxuXHRcdFx0XHRvdGhlclxuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBhZGRTdHJ1Y3R1cmUoc3RydWN0dXJlKSB7XG5cdFx0XHRcdC8vIGFkZCBhcnJheXMgYXMgaW5kaXZpZHVhbCBpdGVtc1xuXHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheShzdHJ1Y3R1cmUpKSByZXR1cm4gc3RydWN0dXJlLmZvckVhY2goYWRkU3RydWN0dXJlKTtcblxuXHRcdFx0XHQvLyBhZGQgdW5kZXIgYHNsb3RzYCBmb3IgcXVpY2sgaGl0IG9mIGFsbCBzaWduaWZpY2FudCBiaXRzLi4uXG5cdFx0XHRcdGlmIChzdHJ1Y3R1cmUubmFtZSkgc2xvdHNbc3RydWN0dXJlLm5hbWVdID0gc3RydWN0dXJlO1xuXG5cdFx0XHRcdHN3aXRjaCAoc3RydWN0dXJlLnR5cGUpIHtcblx0XHRcdFx0XHRjYXNlIFwicHJvcGVydHlcIjpcblx0XHRcdFx0XHRjYXNlIFwic2hhcmVkIHByb3BlcnR5XCI6XG5cdFx0XHRcdFx0Y2FzZSBcImNvbnN0YW50XCI6XG5cdFx0XHRcdFx0Y2FzZSBcImdldHRlclwiOlxuXHRcdFx0XHRcdGNhc2UgXCJzZXR0ZXJcIjpcblx0XHRcdFx0XHRcdHByb3BlcnRpZXMucHVzaChzdHJ1Y3R1cmUpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRjYXNlIFwibWV0aG9kXCI6XG5cdFx0XHRcdFx0Y2FzZSBcImV2ZW50XCI6XG5cdFx0XHRcdFx0Y2FzZSBcImFjdGlvblwiOlxuXHRcdFx0XHRcdFx0bWV0aG9kcy5wdXNoKHN0cnVjdHVyZSk7XG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRvdGhlci5wdXNoKHN0cnVjdHVyZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG5hbWUsIHN1cGVyVHlwZSwgYmxvY2sgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblxuLy8gREVCVUdcbmNvbnNvbGUuaW5mbyhcIlRZUEUgU1RSVUNUVVJFOlwiLCB0aGlzLnRvU3RydWN0dXJlKGNvbnRleHQpKTtcblxuXHRcdFx0bGV0IG91dHB1dCA9IGBjbGFzcyAke25hbWV9YDtcblx0XHRcdGlmIChzdXBlclR5cGUpIG91dHB1dCArPSBgIGV4dGVuZHMgJHtzdXBlclR5cGV9YDtcblx0XHRcdG91dHB1dCArPSBcIiBcIiArIFJ1bGUuQmxvY2suZW5jbG9zZVN0YXRlbWVudHMoYmxvY2spO1xuXHRcdFx0cmV0dXJuIG91dHB1dDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy8gYG5ld2Agb3IgYGNyZWF0ZWBcbi8vIFRoaXMgd29ya3MgYXMgYW4gZXhwcmVzc2lvbiBPUiBhIHN0YXRlbWVudC5cbi8vIE5PVEU6IHdlIGFzc3VtZSB0aGF0IGFsbCB0eXBlcyB0YWtlIGFuIG9iamVjdCBvZiBwcm9wZXJ0aWVzPz8/P1xucGFyc2VyLmFkZFNlcXVlbmNlKFxuXHRbXCJleHByZXNzaW9uXCIsIFwic3RhdGVtZW50XCJdLFxuXHRcIihjcmVhdGV8bmV3KSB7dHlwZX0gKD86d2l0aCB7cHJvcHM6b2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc30pP1wiLFxuXHRjbGFzcyBuZXdfdGhpbmcgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyB0eXBlLCBwcm9wcyA9IFwiXCIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igb2JqZWN0LCB3aGljaCB3ZSdsbCBjcmVhdGUgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbC5cblx0XHRcdGlmICh0eXBlID09PSBcIk9iamVjdFwiKSB7XG5cdFx0XHRcdGlmICghcHJvcHMpIHJldHVybiBcInt9XCI7XG5cdFx0XHRcdHJldHVybiBwcm9wcztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGBuZXcgJHt0eXBlfSgke3Byb3BzfSlgO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL1RPRE86IGNvbnN0cnVjdG9yXG5cblxuXG4vLyBEZWNsYXJlIGluc3RhbmNlIG1ldGhvZCBvciBub3JtYWwgZnVuY3Rpb24uXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRbXCJkZWNsYXJlX21ldGhvZFwiLCBcIk1VVEFUT1JcIl0sXG5cdFwiKG9wZXJhdG9yOnRvfG9uKSB7bmFtZTppZGVudGlmaWVyfSB7YXJnc30/IChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBkZWNsYXJlX21ldGhvZCBleHRlbmRzIFJ1bGUuQmxvY2tTdGF0ZW1lbnQge1xuXHRcdC8vIFJldHVybiBhIGxvZ2ljYWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRhdGEgc3RydWN0dXJlXG5cdFx0dG9TdHJ1Y3R1cmUoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgb3BlcmF0b3IsIG5hbWUsIGFyZ3MgPSBbXX0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgdHlwZSA9IChvcGVyYXRvciA9PT0gXCJ0b1wiID8gXCJtZXRob2RcIiA6IFwiZXZlbnRcIik7XG5cdFx0XHRyZXR1cm4geyB0eXBlLCBuYW1lLCBhcmdzIH07XG5cdFx0fVxuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbmFtZSwgYXJncyA9IFtdLCBzdGF0ZW1lbnQsIGJsb2NrIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRsZXQgb3V0cHV0ID0gYCR7bmFtZX0oJHthcmdzLmpvaW4oXCIsIFwiKX0pIGA7XG5cdFx0XHRvdXRwdXQgKz0gUnVsZS5CbG9jay5lbmNsb3NlU3RhdGVtZW50cyhzdGF0ZW1lbnQsIGJsb2NrKTtcblx0XHRcdHJldHVybiBvdXRwdXQ7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vIERlY2xhcmUgXCJhY3Rpb25cIiwgd2hpY2ggY2FuIGJlIGNhbGxlZCBnbG9iYWxseSBhbmQgYWZmZWN0cyB0aGUgcGFyc2VyLlxuLy8gVE9ETzogYHdpdGhgIGNsYXVzZSAod2lsbCBjb25mbGljdCB3aXRoIGB3b3JkYClcbi8vIFRPRE86IGluc3RhbGwgaW4gcGFyc2VyIHNvbWVob3dcbi8vIFRPRE86IGNyZWF0ZSBpbnN0YW5jZSBmdW5jdGlvbj8gIG9yIG1heWJlIHdlIGRvbid0IG5lZWQgaXQ6XG4vL1x0XHRcdGBhY3Rpb24gdHVybiBDYXJkIG92ZXJgIGZvciBhbiBpbnN0YW5jZSBpcyBqdXN0IGB0dXJuIG1lIG92ZXJgXG4vL1x0XHRcdGBhY3Rpb24gYWRkIGNhcmQgdG8gZGVja2AgPT4gYGFkZCBtZSB0byBkZWNrYFxuLy9URVNUTUVcbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFtcImRlY2xhcmVfYWN0aW9uXCIsIFwiTVVUQVRPUlwiXSxcblx0XCJhY3Rpb24gKGtleXdvcmRzOnt3b3JkfXx7dHlwZX0pKyAoXFxcXDopPyB7c3RhdGVtZW50fT9cIixcblx0Y2xhc3MgZGVjbGFyZV9hY3Rpb24gZXh0ZW5kcyBSdWxlLkJsb2NrU3RhdGVtZW50IHtcblxuXHRcdC8vIEFkZCBgbmFtZWAsIGBhcmdzYCBhbmQgYHR5cGVzYCB0byBtYXRjaGVkIHNvdXJjZVxuXHRcdGdldE1hdGNoZWRTb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IG91dHB1dCA9IHN1cGVyLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cblx0XHRcdC8vIGlmIHRoZXJlJ3Mgb25seSBvbmUga2V5d29yZCwgaXQgY2FuJ3QgYmUgYSBibGFja2xpc3RlZCBpZGVudGlmaWVyIG9yIGEgdHlwZVxuXHRcdFx0bGV0IHsga2V5d29yZHMgfSA9IG91dHB1dDtcblx0XHRcdGxldCBrZXl3b3JkTWF0Y2hlcyA9IHRoaXMucmVzdWx0cy5rZXl3b3Jkcy5tYXRjaGVkO1xuXHRcdFx0aWYgKGtleXdvcmRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRsZXQga2V5d29yZCA9IGtleXdvcmRzWzBdO1xuXHRcdFx0XHRpZiAoa2V5d29yZE1hdGNoZXNbMF0gaW5zdGFuY2VvZiBSdWxlLlR5cGUpIHtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGBwYXJzZSgnZGVjbGFyZV9hY3Rpb24nKTogb25lLXdvcmQgYWN0aW9ucyBtYXkgbm90IGJlIHR5cGVzOiAke2tleXdvcmR9YCk7XG5cdFx0XHRcdH1cblxuLy8gSEFDSzogYGdsb2JhbC5wYXJzZXJgIGlzIGEgaGFjayBoZXJlIGZvciBjb252ZW5pZW5jZSBpbiB0ZXN0aW5nLi4uXG5cdFx0XHRcdGxldCBwYXJzZXIgPSAoY29udGV4dCAmJiBjb250ZXh0LnBhcnNlcikgfHwgZ2xvYmFsLnBhcnNlcjtcblx0XHRcdFx0bGV0IGJsYWNrbGlzdCA9IHBhcnNlci5nZXRCbGFja2xpc3QoXCJpZGVudGlmaWVyXCIpO1xuXHRcdFx0XHRpZiAoYmxhY2tsaXN0W2tleXdvcmRdKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihgcGFyc2UoJ2RlY2xhcmVfYWN0aW9uJyk6IG9uZS13b3JkIGFjdGlvbnMgbWF5IG5vdCBiZSBibGFja2xpc3RlZCBpZGVudGlmaWVyc1wiOiAke2tleXdvcmR9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gZmlndXJlIG91dCBhcmd1bWVudHMgYW5kL29yIHR5cGVzXG5cdFx0XHRvdXRwdXQuYXJncyA9IFtdO1xuXHRcdFx0b3V0cHV0LnR5cGVzID0ge307XG5cblx0XHRcdC8vIGlmIGFueSBvZiB0aGUgd29yZHMgYXJlIHR5cGVzIChjYXBpdGFsIGxldHRlcikgbWFrZSB0aGF0IGFuIGFyZ3VtZW50IG9mIHRoZSBzYW1lIG5hbWUuXG5cdFx0XHRrZXl3b3JkTWF0Y2hlcy5tYXAoIChpdGVtLCBpbmRleCkgPT4ge1xuXHRcdFx0XHRpZiAoaXRlbSBpbnN0YW5jZW9mIFJ1bGUuVHlwZSkge1xuXHRcdFx0XHRcdGxldCBUeXBlID0ga2V5d29yZHNbaW5kZXhdO1xuXHRcdFx0XHRcdGxldCB0eXBlID0gVHlwZS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0XHRcdFx0b3V0cHV0LnR5cGVzW3R5cGVdID0gVHlwZTtcblx0XHRcdFx0XHRvdXRwdXQuYXJncy5wdXNoKHR5cGUpO1xuXG5cdFx0XHRcdFx0Ly8gcmVwbGFjZSB3aXRoIGxvd2VyY2FzZSBpbiBtZXRob2QgbmFtZVxuXHRcdFx0XHRcdGtleXdvcmRzW2luZGV4XSA9IHR5cGU7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0Ly8gZ2V0IHN0YXRpYyBtZXRob2QgbmFtZSBhbmQgYXJndW1lbnRzIGZvciBvdXRwdXRcblx0XHRcdG91dHB1dC5uYW1lID0ga2V5d29yZHMuam9pbihcIl9cIik7XG5cdFx0XHRyZXR1cm4gb3V0cHV0O1xuXHRcdH1cblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG5hbWUsIGFyZ3MgPSBbXSwgdHlwZXMsIHN0YXRlbWVudCwgYmxvY2sgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblxuXHRcdFx0Ly8gZmlndXJlIG91dCBpZiB0aGVyZSBhcmUgYW55IGNvbmRpdGlvbnMgZHVlIHRvIGtub3duIGFyZ3VtZW50IHR5cGVzXG5cdFx0XHRsZXQgY29uZGl0aW9ucyA9IFtdO1xuXHRcdFx0Zm9yIChsZXQgYXJnIGluIHR5cGVzKSB7XG5cdFx0XHRcdGNvbmRpdGlvbnMucHVzaChgXFx0aWYgKCFzcGVsbC5pc0EoJHthcmd9LCAke3R5cGVzW2FyZ119KSkgcmV0dXJuIHVuZGVmaW5lZGApO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgc3RhdGVtZW50cyA9IFJ1bGUuQmxvY2suZW5jbG9zZVN0YXRlbWVudHMoY29uZGl0aW9ucywgc3RhdGVtZW50LCBibG9jayk7XG5cblx0XHRcdC8vIENyZWF0ZSBhcyBhIFNUQVRJQyBmdW5jdGlvblxuXHQvL1RPRE86IGNyZWF0ZSBhcyBhbiBpbnN0YW5jZSBmdW5jdGlvbiB3ZSBjYW4gY2FsbCBvbiBvdXJzZWxmIVxuXHRcdFx0cmV0dXJuIGBzdGF0aWMgJHtuYW1lfSgke2FyZ3Muam9pbihcIiwgXCIpfSkgJHtzdGF0ZW1lbnRzfWA7XG5cdFx0fVxuXG5cdFx0dG9TdHJ1Y3R1cmUoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbmFtZSwgYXJncywgdHlwZXMgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiB7IHR5cGU6IFwiYWN0aW9uXCIsIG5hbWUsIGFyZ3MsIHR5cGVzIH1cblx0XHR9XG5cdH1cbik7XG5cblxuLy8gR2V0dGVyIGVpdGhlciB3aXRoIG9yIHdpdGhvdXQgYXJndW1lbnRzLlxuLy8gSWYgeW91IHNwZWNpZnkgYXJndW1lbnRzLCB5aWVsZHMgYSBub3JtYWwgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhIHZhbHVlLlxucGFyc2VyLmFkZFN0YXRlbWVudChcblx0W1wiZ2V0dGVyXCIsIFwiTVVUQVRPUlwiXSxcblx0XCJnZXQge25hbWU6aWRlbnRpZmllcn0gKFxcXFw6KT8ge2V4cHJlc3Npb259P1wiLFxuXHRjbGFzcyBnZXR0ZXIgZXh0ZW5kcyBSdWxlLkJsb2NrU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBuYW1lLCBleHByZXNzaW9uLCBibG9jayB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0Ly8gSWYgdGhleSBzcGVjaWZpZWQgYW4gaW5saW5lLWV4cHJlc3Npb24sIHByZXBlbmQgcmV0dXJuXG5cdFx0XHRpZiAoZXhwcmVzc2lvbiAmJiAhZXhwcmVzc2lvbi5zdGFydHNXaXRoKFwicmV0dXJuIFwiKSkgZXhwcmVzc2lvbiA9IGByZXR1cm4gKCR7ZXhwcmVzc2lvbn0pYDtcblx0XHRcdGxldCBvdXRwdXQgPSBgZ2V0ICR7bmFtZX0oKSBgO1xuXHRcdFx0b3V0cHV0ICs9IFJ1bGUuQmxvY2suZW5jbG9zZVN0YXRlbWVudHMoZXhwcmVzc2lvbiwgYmxvY2spO1xuXHRcdFx0cmV0dXJuIG91dHB1dDtcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4gYSBsb2dpY2FsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBkYXRhIHN0cnVjdHVyZVxuXHRcdHRvU3RydWN0dXJlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG5hbWUgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiB7IHR5cGU6IFwiZ2V0dGVyXCIsIG5hbWUgfVxuXHRcdH1cblx0fVxuKTtcblxuLy8gU2V0dGVyLlxuLy8gQ29tcGxhaW5zIGlmIHlvdSBzcGVjaWZ5IG1vcmUgdGhhbiBvbmUgYXJndW1lbnQuXG4vLyBJZiB5b3UgZG9uJ3QgcGFzcyBhbiBleHBsaWNpdCBhcmd1bWVudCwgd2UnbGwgYXNzdW1lIGl0J3MgdGhlIHNhbWUgYXMgdGhlIGlkZW50aWZpZXIuXG4vLyBlZztcdGBzZXQgY29sb3I6IHNldCB0aGUgY29sb3Igb2YgbXkgdGV4dCB0byBjb2xvcmBcbi8vXG4vLyBUT0RPOiBpbnRlcm5hbCBnZXR0ZXIvc2V0dGVyIHNlbWFudGljcyBhbGEgb2JqZWN0aXZlIENcbi8vXHRcdFx0YHNldCBjb2xvcjogaWYgY29sb3IgaXMgaW4gW1wicmVkXCIsIFwiYmx1ZVwiXSB0aGVuIHNldCBteSBjb2xvciB0byBjb2xvcmBcbi8vXHRcdCA9PiBgbXkgY29sb3JgIHdpdGhpbiBzZXR0ZXIgc2hvdWxkIGF1dG9tYXRpY2FsbHkgdHJhbnNsYXRlIHRvIGB0aGlzLl9jb2xvcmAgPz8/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRbXCJzZXR0ZXJcIiwgXCJNVVRBVE9SXCJdLFxuXHRcInNldCB7bmFtZTppZGVudGlmaWVyfSB7YXJnc30/IChcXFxcOik/IHtzdGF0ZW1lbnR9P1wiLFxuXHRjbGFzcyBzZXR0ZXIgZXh0ZW5kcyBSdWxlLkJsb2NrU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHQvLyBkZWZhdWx0IGFyZ3MgdG8gdGhlIHNldHRlciBuYW1lXG5cdFx0XHRsZXQgeyBuYW1lLCBhcmdzID0gW25hbWVdLCBzdGF0ZW1lbnQsIGJsb2NrIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHQvLyBDb21wbGFpbiBpZiBtb3JlIHRoYW4gb25lIGFyZ3VtZW50XG5cdFx0XHRpZiAoYXJncyAmJiBhcmdzLmxlbmd0aCA+IDEpIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKFwicGFyc2UoJ3NldHRlcicpOiBvbmx5IG9uZSBhcmd1bWVudCBhbGxvd2VkIGluIHNldHRlcjogIFwiLCB0aGlzLm1hdGNoZWRUZXh0KTtcblx0XHRcdFx0YXJncyA9IFsgYXJnc1swXSBdO1xuXHRcdFx0fVxuXHRcdFx0bGV0IG91dHB1dCA9IGBzZXQgJHtuYW1lfSgke2FyZ3N9KSBgO1xuXHRcdFx0b3V0cHV0ICs9IFJ1bGUuQmxvY2suZW5jbG9zZVN0YXRlbWVudHMoc3RhdGVtZW50LCBibG9jayk7XG5cdFx0XHRyZXR1cm4gb3V0cHV0O1xuXHRcdH1cblxuXHRcdC8vIFJldHVybiBhIGxvZ2ljYWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRhdGEgc3RydWN0dXJlXG5cdFx0dG9TdHJ1Y3R1cmUoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbmFtZSB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIHsgdHlwZTogXCJzZXR0ZXJcIiwgbmFtZSB9XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vXG4vL1x0ZGVjbGFyZSBwcm9wZXJ0aWVzXG4vL1xuXG4vL1RPRE86IGFub3RoZXIgbmFtZSBmb3IgYGNvbnN0YW50YCA/XG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRbXCJkZWNsYXJlX3Byb3BlcnR5XCIsIFwiTVVUQVRPUlwiXSxcblx0XCIoc2NvcGU6cHJvcGVydHl8Y29uc3RhbnR8c2hhcmVkIHByb3BlcnR5KSB7bmFtZTppZGVudGlmaWVyfSAoPzo9IHt2YWx1ZTpleHByZXNzaW9ufSk/XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHkgZXh0ZW5kcyBSdWxlLlN0YXRlbWVudCB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc2NvcGUsIG5hbWUsIHZhbHVlID0gXCJcIiB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0aWYgKHZhbHVlKSB2YWx1ZSA9IGAgPSAke3ZhbHVlfWA7XG5cblx0XHRcdGxldCBkZWNsYXJhdGlvbiA9IGAke25hbWV9JHt2YWx1ZX1gO1xuXHRcdFx0c3dpdGNoIChzY29wZSkge1xuXHRcdFx0XHRjYXNlIFwiY29uc3RhbnRcIjpcblx0XHRcdFx0XHRpZiAoIXZhbHVlKSBjb25zb2xlLndhcm4oXCJwYXJzZSgnZGVjbGFyZV9wcm9wZXJ0eScpOiBjb25zdGFudCBwcm9wZXJ0aWVzIG11c3QgZGVjbGFyZSBhIHZhbHVlOiAgXCIsIHRoaXMubWF0Y2hlZFRleHQpO1xuXHRcdFx0XHRcdHJldHVybiBgY29uc3QgJHtkZWNsYXJhdGlvbn1gO1xuXG5cdFx0XHRcdGNhc2UgXCJzaGFyZWQgcHJvcGVydHlcIjpcblx0XHRcdFx0XHRyZXR1cm4gYEBwcm90byAke2RlY2xhcmF0aW9ufWA7XG5cblx0XHRcdFx0Y2FzZSBcInByb3BlcnR5XCI6XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0cmV0dXJuIGRlY2xhcmF0aW9uO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFJldHVybiBhIGxvZ2ljYWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRhdGEgc3RydWN0dXJlXG5cdFx0dG9TdHJ1Y3R1cmUoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgc2NvcGUsIG5hbWUgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiB7IHR5cGU6IFwicHJvcGVydHlcIiwgbmFtZSwgc2NvcGUgfTtcblx0XHR9XG5cdH1cbik7XG5cbi8vIFRPRE86IHNjb3BlX21vZGlmaWVyPz8/XG4vLyBUT0RPOiBpbml0aWFsIHZhbHVlXG5wYXJzZXIuYWRkU3RhdGVtZW50KFxuXHRbXCJkZWNsYXJlX3Byb3BlcnR5X29mX3R5cGVcIiwgXCJNVVRBVE9SXCJdLFxuXHRcInByb3BlcnR5IHtuYW1lOmlkZW50aWZpZXJ9IGFzIChhfGFuKT8ge3R5cGV9XCIsXG5cdGNsYXNzIGRlY2xhcmVfcHJvcGVydHlfb2ZfdHlwZSBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBuYW1lLCB0eXBlIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gYGdldCAke25hbWV9KCkgeyByZXR1cm4gdGhpcy5fXyR7bmFtZX0gfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke25hbWV9KHZhbHVlKSB7IGlmIChzcGVsbC5pc0EodmFsdWUsICR7dHlwZX0pIHRoaXMuX18ke25hbWV9ID0gdmFsdWUgfWA7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIGEgbG9naWNhbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgZGF0YSBzdHJ1Y3R1cmVcblx0XHR0b1N0cnVjdHVyZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBuYW1lLCB0eXBlIH0gPSB0aGlzLmdldE1hdGNoZWRTb3VyY2UoY29udGV4dCk7XG5cdFx0XHRyZXR1cm4geyB0eXBlOiBcInNldHRlclwiLCBuYW1lLCBkYXRhVHlwZTogdHlwZSB9O1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBUT0RPOiB3YXJuIG9uIGludmFsaWQgc2V0PyAgc2hhcmVkPyAgdW5kZWZpbmVkPyBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgZmlyc3QgdmFsdWUgYXMgZGVmYXVsdD9cbnBhcnNlci5hZGRTdGF0ZW1lbnQoXG5cdFtcImRlY2xhcmVfcHJvcGVydHlfYXNfb25lX29mXCIsIFwiTVVUQVRPUlwiXSxcblx0XCJwcm9wZXJ0eSB7bmFtZTppZGVudGlmaWVyfSBhcyBvbmUgb2Yge2xpc3Q6bGl0ZXJhbF9saXN0fVwiLFxuXHRjbGFzcyBkZWNsYXJlX3Byb3BlcnR5X2FzX29uZV9vZiBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblx0XHRnZXRNYXRjaGVkU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBvdXRwdXQgPSBzdXBlci5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0b3V0cHV0LnBsdXJhbCA9IHBsdXJhbGl6ZShvdXRwdXQubmFtZSk7XG5cdFx0XHRyZXR1cm4gb3V0cHV0O1xuXHRcdH1cblxuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IG5hbWUsIHBsdXJhbCwgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBAcHJvdG8gJHtwbHVyYWx9ID0gJHtsaXN0fVxcbmBcblx0XHRcdFx0ICsgYGdldCAke25hbWV9KCkgeyByZXR1cm4gdGhpcy5fXyR7bmFtZX0gPT09IHVuZGVmaW5lZCA/IHRoaXMuJHtwbHVyYWx9WzBdIDogdGhpcy5fXyR7bmFtZX0gfVxcbmBcblx0XHRcdFx0ICsgYHNldCAke25hbWV9KHZhbHVlKSB7IGlmICh0aGlzLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke25hbWV9ID0gdmFsdWUgfWA7XG5cbi8vIE1PUkUgRUZGSUNJRU5UIEJVVCBVR0xJRVJcbi8vIFx0XHRcdHJldHVybiBgc3RhdGljICR7cGx1cmFsfSA9ICR7bGlzdH07XFxuYFxuLy8gXHRcdFx0XHQgKyBgZ2V0ICR7bmFtZX0geyByZXR1cm4gKFwiX18ke25hbWV9XCIgaW4gdGhpcyA/IHRoaXMuX18ke25hbWV9IDogJHtmaXJzdFZhbHVlfSkgfVxcbmBcbi8vIFx0XHRcdFx0ICsgYHNldCAke25hbWV9KHZhbHVlKSB7IGlmICh0aGlzLmNvbnN0cnVjdG9yLiR7cGx1cmFsfS5pbmNsdWRlcyh2YWx1ZSkpIHRoaXMuX18ke25hbWV9ID0gdmFsdWUgfWA7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIGEgbG9naWNhbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgZGF0YSBzdHJ1Y3R1cmVcblx0XHR0b1N0cnVjdHVyZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgeyBuYW1lLCBwbHVyYWwgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBbXG5cdFx0XHRcdHsgdHlwZTogXCJwcm9wZXJ0eVwiLCBuYW1lIH0sXG5cdFx0XHRcdHsgdHlwZTogXCJzaGFyZWQgcHJvcGVydHlcIiwgbmFtZTogcGx1cmFsIH1cblx0XHRcdF07XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vXG4vL1x0U2VsZi1yZWZlcmVuY2Vcbi8vXG5wYXJzZXIuYWRkS2V5d29yZChcblx0W1wibWVcIiwgXCJleHByZXNzaW9uXCJdLFxuXHRcIm1lXCIsXG5cdGNsYXNzIG1lIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gXCJ0aGlzXCI7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUT0RPOiB0aGlzIHJlYWxseSBtYWtlcyBtZSB3YW50IHRvIG1ha2UgYEkgYW0gZW1wdHlgIGV0YyB3b3JrLi4uXG5wYXJzZXIuYWRkS2V5d29yZChcblx0W1wiSVwiLCBcImV4cHJlc3Npb25cIl0sXG5cdFwiSVwiLFxuXHRjbGFzcyBJIGV4dGVuZHMgUnVsZS5LZXl3b3JkIHtcblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gXCJ0aGlzXCI7XG5cdFx0fVxuXHR9XG4pO1xuXG5cbi8vXG4vL1x0UHJvcGVydHkgYWNjZXNzXG4vL1xuXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwcm9wZXJ0eV9leHByZXNzaW9uXCIsXG5cdFwiKHByb3BlcnRpZXM6dGhlIHtpZGVudGlmaWVyfSBvZikrIHRoZT8ge2V4cHJlc3Npb259XCIsXG5cdGNsYXNzIHByb3BlcnR5X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdGdldE1hdGNoZWRTb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgcHJvcGVydGllcyB9ID0gdGhpcy5yZXN1bHRzO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXhwcmVzc2lvbjogZXhwcmVzc2lvbi50b1NvdXJjZShjb250ZXh0KSxcblx0XHRcdFx0cHJvcGVydGllczogcHJvcGVydGllcy5tYXRjaGVkLm1hcCggcHJvcGVydHkgPT4gcHJvcGVydHkucmVzdWx0cy5pZGVudGlmaWVyLnRvU291cmNlKGNvbnRleHQpIClcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgZXhwcmVzc2lvbiwgcHJvcGVydGllcyB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cHJvcGVydGllcyA9IHByb3BlcnRpZXMucmV2ZXJzZSgpLmpvaW4oXCIuXCIpO1xuXHRcdFx0cmV0dXJuIGAke2V4cHJlc3Npb259LiR7cHJvcGVydGllc31gO1xuLy8gTk9URTogdGhlIGZvbGxvd2luZyBpcyBzYWZlciwgYnV0IHVnbHkgZm9yIGRlbW8gcHVycG9zZXNcbi8vXHRcdFx0cmV0dXJuIGBzcGVsbC5nZXQoJHtleHByZXNzaW9ufSwgWycke3Byb3BlcnRpZXN9J10pYDtcblx0XHR9XG5cdH1cbik7XG5cbnBhcnNlci5hZGRFeHByZXNzaW9uKFxuXHRcIm15X3Byb3BlcnR5X2V4cHJlc3Npb25cIixcblx0XCIobXl8dGhpcykge2lkZW50aWZpZXJ9XCIsXG5cdGNsYXNzIG15X3Byb3BlcnR5X2V4cHJlc3Npb24gZXh0ZW5kcyBSdWxlLkV4cHJlc3Npb24ge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCB7IGlkZW50aWZpZXIgfSA9IHRoaXMuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0KTtcblx0XHRcdHJldHVybiBgdGhpcy4ke2lkZW50aWZpZXJ9YDtcblx0XHR9XG5cdH1cbik7XG5cblxuLy9cbi8vXHRVdGlsaXR5XG4vL1xuXG5cbi8vIFByb3BlcnRpZXMgY2xhdXNlOiBjcmVhdGVzIGFuIG9iamVjdCB3aXRoIG9uZSBvciBtb3JlIHByb3BlcnR5IHZhbHVlcy5cbi8vXHRgZm9vID0gMSwgYmFyID0gMmBcbi8vVE9ETzogd291bGQgbGlrZSB0byB1c2UgYGFuZGAgYnV0IHRoYXQgd2lsbCBiYXJmIG9uIGV4cHJlc3Npb25zLi4uXG4vL1RPRE86IGhvdyB0byBkbyBwcm9wZXJ0aWVzIG9uIG11bHRpcGxlIGxpbmVzP1xucGFyc2VyLmFkZExpc3QoXG5cdFwib2JqZWN0X2xpdGVyYWxfcHJvcGVydGllc1wiLFxuXHRcIlsoe2tleTppZGVudGlmaWVyfSg/Oj0ge3ZhbHVlOmV4cHJlc3Npb259KT8pICxdXCIsXG5cdGNsYXNzIG9iamVjdF9saXRlcmFsX3Byb3BlcnRpZXMgZXh0ZW5kcyBSdWxlLkxpc3Qge1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdGxldCBwcm9wcyA9IHRoaXMucmVzdWx0cy5tYXRjaGVkLm1hcChmdW5jdGlvbiAocHJvcCkge1xuXHRcdFx0XHRcdGxldCB7IGtleSwgdmFsdWUgfSA9IHByb3AucmVzdWx0cztcblx0XHRcdFx0XHRrZXkgPSBrZXkudG9Tb3VyY2UoY29udGV4dCk7XG5cdFx0XHRcdFx0dmFsdWUgPSB2YWx1ZSAmJiB2YWx1ZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdFx0XHRpZiAodmFsdWUpIHJldHVybiBgXCIke2tleX1cIjogJHt2YWx1ZX1gXG5cdFx0XHRcdFx0cmV0dXJuIGtleTtcblx0XHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYHsgJHtwcm9wcy5qb2luKFwiLCBcIil9IH1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vL01PVkUgVE8gYGZ1bmN0aW9uc2A/XG4vLyBBcmd1bWVudHMgY2xhdXNlIGZvciBtZXRob2RzXG4vL1x0YHdpdGggZm9vYCBvciBgd2l0aCBmb28gYW5kIGJhciBhbmQgYmF6YFxuLy9UT0RPOiB7aWRlbnRpZmllcn0gPSB7ZXhwcmVzc2lvbn1cdD0+IHJlcXVpcmVzIGAsYCBpbnN0ZWFkIG9mIGBhbmRgXG4vL1RPRE86IGB3aXRoIGZvbyBhcyBUeXBlYFxuLy9UT0RPOlx0YHdpdGggZm9vLi4uYCBmb3Igc3BsYXQ/XG5wYXJzZXIuYWRkU2VxdWVuY2UoXG5cdFwiYXJnc1wiLFxuXHRcIndpdGggW2FyZ3M6e2lkZW50aWZpZXJ9ICxdXCIsXG5cdGNsYXNzIGFyZ3MgZXh0ZW5kcyBSdWxlLlNlcXVlbmNlIHtcblx0XHQvLyBSZXR1cm5zIGFuIGFycmF5IG9mIGFyZ3VtZW50IHZhbHVlc1xuXHRcdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRcdHJldHVybiB0aGlzLnJlc3VsdHMuYXJncy5tYXRjaGVkLm1hcChhcmcgPT4gYXJnLm1hdGNoZWQpO1xuXHRcdH1cblx0fVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9ydWxlcy90eXBlcy5qcyIsImV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9saWIvY3NzLWJhc2UuanNcIikodW5kZWZpbmVkKTtcbi8vIGltcG9ydHNcblxuXG4vLyBtb2R1bGVcbmV4cG9ydHMucHVzaChbbW9kdWxlLmlkLCBcIi5vYWsuc3BhY2VyIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbn1cXG4ub2FrLnNwYWNlci5pbmxpbmUge1xcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgdmVydGljYWwtYWxpZ246IGJhc2VsaW5lO1xcbn1cXG4ub2FrLnNwYWNlci5mbHVpZCB7XFxuICB3aWR0aDogMTAwJTtcXG4gIGZsZXg6IDEgMSAxMDAlO1xcbn1cXG4ub2FrLnNwYWNlci50aW55IHtcXG4gIHdpZHRoOiAycHg7XFxuICBoZWlnaHQ6IDJweDtcXG59XFxuLm9hay5zcGFjZXIuc21hbGwge1xcbiAgd2lkdGg6IDRweDtcXG4gIGhlaWdodDogNHB4O1xcbn1cXG4ub2FrLnNwYWNlci5tZWRpdW0ge1xcbiAgd2lkdGg6IDEwcHg7XFxuICBoZWlnaHQ6IDEwcHg7XFxufVxcbi5vYWsuc3BhY2VyLmxhcmdlIHtcXG4gIHdpZHRoOiAyMHB4O1xcbiAgaGVpZ2h0OiAyMHB4O1xcbn1cXG4ub2FrLnNwYWNlci5odWdlIHtcXG4gIHdpZHRoOiAzMHB4O1xcbiAgaGVpZ2h0OiAzMHB4O1xcbn1cXG4ub2FrLnNwYWNlci5tYXNzaXZlIHtcXG4gIHdpZHRoOiA1MHB4O1xcbiAgaGVpZ2h0OiA1MHB4O1xcbn1cXG5cIiwgXCJcIl0pO1xuXG4vLyBleHBvcnRzXG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vY3NzLWxvYWRlciEuL34vbGVzcy1sb2FkZXIvZGlzdCEuL3NyYy9hcHAvU3BhY2VyLmxlc3Ncbi8vIG1vZHVsZSBpZCA9IDQ3MlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvbGliL2Nzcy1iYXNlLmpzXCIpKHVuZGVmaW5lZCk7XG4vLyBpbXBvcnRzXG5cblxuLy8gbW9kdWxlXG5leHBvcnRzLnB1c2goW21vZHVsZS5pZCwgXCIuZnVsbFdpZHRoIHtcXG4gIHdpZHRoOiAxMDAlO1xcbn1cXG4uZnVsbEhlaWdodCB7XFxuICBoZWlnaHQ6IDEwMCU7XFxufVxcbi5mdWxsU2l6ZSB7XFxuICB3aWR0aDogMTAwJTtcXG4gIGhlaWdodDogMTAwJTtcXG59XFxuXCIsIFwiXCJdKTtcblxuLy8gZXhwb3J0c1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L2Nzcy1sb2FkZXIhLi9+L2xlc3MtbG9hZGVyL2Rpc3QhLi9zcmMvYXBwL3N0eWxlcy5sZXNzXG4vLyBtb2R1bGUgaWQgPSA0NzNcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICB2YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnZmJqcy9saWIvaW52YXJpYW50Jyk7XG4gIHZhciB3YXJuaW5nID0gcmVxdWlyZSgnZmJqcy9saWIvd2FybmluZycpO1xuICB2YXIgUmVhY3RQcm9wVHlwZXNTZWNyZXQgPSByZXF1aXJlKCcuL2xpYi9SZWFjdFByb3BUeXBlc1NlY3JldCcpO1xuICB2YXIgbG9nZ2VkVHlwZUZhaWx1cmVzID0ge307XG59XG5cbi8qKlxuICogQXNzZXJ0IHRoYXQgdGhlIHZhbHVlcyBtYXRjaCB3aXRoIHRoZSB0eXBlIHNwZWNzLlxuICogRXJyb3IgbWVzc2FnZXMgYXJlIG1lbW9yaXplZCBhbmQgd2lsbCBvbmx5IGJlIHNob3duIG9uY2UuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IHR5cGVTcGVjcyBNYXAgb2YgbmFtZSB0byBhIFJlYWN0UHJvcFR5cGVcbiAqIEBwYXJhbSB7b2JqZWN0fSB2YWx1ZXMgUnVudGltZSB2YWx1ZXMgdGhhdCBuZWVkIHRvIGJlIHR5cGUtY2hlY2tlZFxuICogQHBhcmFtIHtzdHJpbmd9IGxvY2F0aW9uIGUuZy4gXCJwcm9wXCIsIFwiY29udGV4dFwiLCBcImNoaWxkIGNvbnRleHRcIlxuICogQHBhcmFtIHtzdHJpbmd9IGNvbXBvbmVudE5hbWUgTmFtZSBvZiB0aGUgY29tcG9uZW50IGZvciBlcnJvciBtZXNzYWdlcy5cbiAqIEBwYXJhbSB7P0Z1bmN0aW9ufSBnZXRTdGFjayBSZXR1cm5zIHRoZSBjb21wb25lbnQgc3RhY2suXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBjaGVja1Byb3BUeXBlcyh0eXBlU3BlY3MsIHZhbHVlcywgbG9jYXRpb24sIGNvbXBvbmVudE5hbWUsIGdldFN0YWNrKSB7XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgZm9yICh2YXIgdHlwZVNwZWNOYW1lIGluIHR5cGVTcGVjcykge1xuICAgICAgaWYgKHR5cGVTcGVjcy5oYXNPd25Qcm9wZXJ0eSh0eXBlU3BlY05hbWUpKSB7XG4gICAgICAgIHZhciBlcnJvcjtcbiAgICAgICAgLy8gUHJvcCB0eXBlIHZhbGlkYXRpb24gbWF5IHRocm93LiBJbiBjYXNlIHRoZXkgZG8sIHdlIGRvbid0IHdhbnQgdG9cbiAgICAgICAgLy8gZmFpbCB0aGUgcmVuZGVyIHBoYXNlIHdoZXJlIGl0IGRpZG4ndCBmYWlsIGJlZm9yZS4gU28gd2UgbG9nIGl0LlxuICAgICAgICAvLyBBZnRlciB0aGVzZSBoYXZlIGJlZW4gY2xlYW5lZCB1cCwgd2UnbGwgbGV0IHRoZW0gdGhyb3cuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gVGhpcyBpcyBpbnRlbnRpb25hbGx5IGFuIGludmFyaWFudCB0aGF0IGdldHMgY2F1Z2h0LiBJdCdzIHRoZSBzYW1lXG4gICAgICAgICAgLy8gYmVoYXZpb3IgYXMgd2l0aG91dCB0aGlzIHN0YXRlbWVudCBleGNlcHQgd2l0aCBhIGJldHRlciBtZXNzYWdlLlxuICAgICAgICAgIGludmFyaWFudCh0eXBlb2YgdHlwZVNwZWNzW3R5cGVTcGVjTmFtZV0gPT09ICdmdW5jdGlvbicsICclczogJXMgdHlwZSBgJXNgIGlzIGludmFsaWQ7IGl0IG11c3QgYmUgYSBmdW5jdGlvbiwgdXN1YWxseSBmcm9tICcgKyAnUmVhY3QuUHJvcFR5cGVzLicsIGNvbXBvbmVudE5hbWUgfHwgJ1JlYWN0IGNsYXNzJywgbG9jYXRpb24sIHR5cGVTcGVjTmFtZSk7XG4gICAgICAgICAgZXJyb3IgPSB0eXBlU3BlY3NbdHlwZVNwZWNOYW1lXSh2YWx1ZXMsIHR5cGVTcGVjTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIG51bGwsIFJlYWN0UHJvcFR5cGVzU2VjcmV0KTtcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICBlcnJvciA9IGV4O1xuICAgICAgICB9XG4gICAgICAgIHdhcm5pbmcoIWVycm9yIHx8IGVycm9yIGluc3RhbmNlb2YgRXJyb3IsICclczogdHlwZSBzcGVjaWZpY2F0aW9uIG9mICVzIGAlc2AgaXMgaW52YWxpZDsgdGhlIHR5cGUgY2hlY2tlciAnICsgJ2Z1bmN0aW9uIG11c3QgcmV0dXJuIGBudWxsYCBvciBhbiBgRXJyb3JgIGJ1dCByZXR1cm5lZCBhICVzLiAnICsgJ1lvdSBtYXkgaGF2ZSBmb3Jnb3R0ZW4gdG8gcGFzcyBhbiBhcmd1bWVudCB0byB0aGUgdHlwZSBjaGVja2VyICcgKyAnY3JlYXRvciAoYXJyYXlPZiwgaW5zdGFuY2VPZiwgb2JqZWN0T2YsIG9uZU9mLCBvbmVPZlR5cGUsIGFuZCAnICsgJ3NoYXBlIGFsbCByZXF1aXJlIGFuIGFyZ3VtZW50KS4nLCBjb21wb25lbnROYW1lIHx8ICdSZWFjdCBjbGFzcycsIGxvY2F0aW9uLCB0eXBlU3BlY05hbWUsIHR5cGVvZiBlcnJvcik7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmICEoZXJyb3IubWVzc2FnZSBpbiBsb2dnZWRUeXBlRmFpbHVyZXMpKSB7XG4gICAgICAgICAgLy8gT25seSBtb25pdG9yIHRoaXMgZmFpbHVyZSBvbmNlIGJlY2F1c2UgdGhlcmUgdGVuZHMgdG8gYmUgYSBsb3Qgb2YgdGhlXG4gICAgICAgICAgLy8gc2FtZSBlcnJvci5cbiAgICAgICAgICBsb2dnZWRUeXBlRmFpbHVyZXNbZXJyb3IubWVzc2FnZV0gPSB0cnVlO1xuXG4gICAgICAgICAgdmFyIHN0YWNrID0gZ2V0U3RhY2sgPyBnZXRTdGFjaygpIDogJyc7XG5cbiAgICAgICAgICB3YXJuaW5nKGZhbHNlLCAnRmFpbGVkICVzIHR5cGU6ICVzJXMnLCBsb2NhdGlvbiwgZXJyb3IubWVzc2FnZSwgc3RhY2sgIT0gbnVsbCA/IHN0YWNrIDogJycpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY2hlY2tQcm9wVHlwZXM7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9jaGVja1Byb3BUeXBlcy5qc1xuLy8gbW9kdWxlIGlkID0gNDc0XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVtcHR5RnVuY3Rpb24gPSByZXF1aXJlKCdmYmpzL2xpYi9lbXB0eUZ1bmN0aW9uJyk7XG52YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnZmJqcy9saWIvaW52YXJpYW50Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIC8vIEltcG9ydGFudCFcbiAgLy8gS2VlcCB0aGlzIGxpc3QgaW4gc3luYyB3aXRoIHByb2R1Y3Rpb24gdmVyc2lvbiBpbiBgLi9mYWN0b3J5V2l0aFR5cGVDaGVja2Vycy5qc2AuXG4gIGZ1bmN0aW9uIHNoaW0oKSB7XG4gICAgaW52YXJpYW50KFxuICAgICAgZmFsc2UsXG4gICAgICAnQ2FsbGluZyBQcm9wVHlwZXMgdmFsaWRhdG9ycyBkaXJlY3RseSBpcyBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBgcHJvcC10eXBlc2AgcGFja2FnZS4gJyArXG4gICAgICAnVXNlIFByb3BUeXBlcy5jaGVja1Byb3BUeXBlcygpIHRvIGNhbGwgdGhlbS4gJyArXG4gICAgICAnUmVhZCBtb3JlIGF0IGh0dHA6Ly9mYi5tZS91c2UtY2hlY2stcHJvcC10eXBlcydcbiAgICApO1xuICB9O1xuICBzaGltLmlzUmVxdWlyZWQgPSBzaGltO1xuICBmdW5jdGlvbiBnZXRTaGltKCkge1xuICAgIHJldHVybiBzaGltO1xuICB9O1xuICB2YXIgUmVhY3RQcm9wVHlwZXMgPSB7XG4gICAgYXJyYXk6IHNoaW0sXG4gICAgYm9vbDogc2hpbSxcbiAgICBmdW5jOiBzaGltLFxuICAgIG51bWJlcjogc2hpbSxcbiAgICBvYmplY3Q6IHNoaW0sXG4gICAgc3RyaW5nOiBzaGltLFxuICAgIHN5bWJvbDogc2hpbSxcblxuICAgIGFueTogc2hpbSxcbiAgICBhcnJheU9mOiBnZXRTaGltLFxuICAgIGVsZW1lbnQ6IHNoaW0sXG4gICAgaW5zdGFuY2VPZjogZ2V0U2hpbSxcbiAgICBub2RlOiBzaGltLFxuICAgIG9iamVjdE9mOiBnZXRTaGltLFxuICAgIG9uZU9mOiBnZXRTaGltLFxuICAgIG9uZU9mVHlwZTogZ2V0U2hpbSxcbiAgICBzaGFwZTogZ2V0U2hpbVxuICB9O1xuXG4gIFJlYWN0UHJvcFR5cGVzLmNoZWNrUHJvcFR5cGVzID0gZW1wdHlGdW5jdGlvbjtcbiAgUmVhY3RQcm9wVHlwZXMuUHJvcFR5cGVzID0gUmVhY3RQcm9wVHlwZXM7XG5cbiAgcmV0dXJuIFJlYWN0UHJvcFR5cGVzO1xufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL2ZhY3RvcnlXaXRoVGhyb3dpbmdTaGltcy5qc1xuLy8gbW9kdWxlIGlkID0gNDc1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVtcHR5RnVuY3Rpb24gPSByZXF1aXJlKCdmYmpzL2xpYi9lbXB0eUZ1bmN0aW9uJyk7XG52YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnZmJqcy9saWIvaW52YXJpYW50Jyk7XG52YXIgd2FybmluZyA9IHJlcXVpcmUoJ2ZianMvbGliL3dhcm5pbmcnKTtcblxudmFyIFJlYWN0UHJvcFR5cGVzU2VjcmV0ID0gcmVxdWlyZSgnLi9saWIvUmVhY3RQcm9wVHlwZXNTZWNyZXQnKTtcbnZhciBjaGVja1Byb3BUeXBlcyA9IHJlcXVpcmUoJy4vY2hlY2tQcm9wVHlwZXMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpc1ZhbGlkRWxlbWVudCwgdGhyb3dPbkRpcmVjdEFjY2Vzcykge1xuICAvKiBnbG9iYWwgU3ltYm9sICovXG4gIHZhciBJVEVSQVRPUl9TWU1CT0wgPSB0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIFN5bWJvbC5pdGVyYXRvcjtcbiAgdmFyIEZBVVhfSVRFUkFUT1JfU1lNQk9MID0gJ0BAaXRlcmF0b3InOyAvLyBCZWZvcmUgU3ltYm9sIHNwZWMuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGl0ZXJhdG9yIG1ldGhvZCBmdW5jdGlvbiBjb250YWluZWQgb24gdGhlIGl0ZXJhYmxlIG9iamVjdC5cbiAgICpcbiAgICogQmUgc3VyZSB0byBpbnZva2UgdGhlIGZ1bmN0aW9uIHdpdGggdGhlIGl0ZXJhYmxlIGFzIGNvbnRleHQ6XG4gICAqXG4gICAqICAgICB2YXIgaXRlcmF0b3JGbiA9IGdldEl0ZXJhdG9yRm4obXlJdGVyYWJsZSk7XG4gICAqICAgICBpZiAoaXRlcmF0b3JGbikge1xuICAgKiAgICAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYXRvckZuLmNhbGwobXlJdGVyYWJsZSk7XG4gICAqICAgICAgIC4uLlxuICAgKiAgICAgfVxuICAgKlxuICAgKiBAcGFyYW0gez9vYmplY3R9IG1heWJlSXRlcmFibGVcbiAgICogQHJldHVybiB7P2Z1bmN0aW9ufVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0SXRlcmF0b3JGbihtYXliZUl0ZXJhYmxlKSB7XG4gICAgdmFyIGl0ZXJhdG9yRm4gPSBtYXliZUl0ZXJhYmxlICYmIChJVEVSQVRPUl9TWU1CT0wgJiYgbWF5YmVJdGVyYWJsZVtJVEVSQVRPUl9TWU1CT0xdIHx8IG1heWJlSXRlcmFibGVbRkFVWF9JVEVSQVRPUl9TWU1CT0xdKTtcbiAgICBpZiAodHlwZW9mIGl0ZXJhdG9yRm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBpdGVyYXRvckZuO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb2xsZWN0aW9uIG9mIG1ldGhvZHMgdGhhdCBhbGxvdyBkZWNsYXJhdGlvbiBhbmQgdmFsaWRhdGlvbiBvZiBwcm9wcyB0aGF0IGFyZVxuICAgKiBzdXBwbGllZCB0byBSZWFjdCBjb21wb25lbnRzLiBFeGFtcGxlIHVzYWdlOlxuICAgKlxuICAgKiAgIHZhciBQcm9wcyA9IHJlcXVpcmUoJ1JlYWN0UHJvcFR5cGVzJyk7XG4gICAqICAgdmFyIE15QXJ0aWNsZSA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcbiAgICogICAgIHByb3BUeXBlczoge1xuICAgKiAgICAgICAvLyBBbiBvcHRpb25hbCBzdHJpbmcgcHJvcCBuYW1lZCBcImRlc2NyaXB0aW9uXCIuXG4gICAqICAgICAgIGRlc2NyaXB0aW9uOiBQcm9wcy5zdHJpbmcsXG4gICAqXG4gICAqICAgICAgIC8vIEEgcmVxdWlyZWQgZW51bSBwcm9wIG5hbWVkIFwiY2F0ZWdvcnlcIi5cbiAgICogICAgICAgY2F0ZWdvcnk6IFByb3BzLm9uZU9mKFsnTmV3cycsJ1Bob3RvcyddKS5pc1JlcXVpcmVkLFxuICAgKlxuICAgKiAgICAgICAvLyBBIHByb3AgbmFtZWQgXCJkaWFsb2dcIiB0aGF0IHJlcXVpcmVzIGFuIGluc3RhbmNlIG9mIERpYWxvZy5cbiAgICogICAgICAgZGlhbG9nOiBQcm9wcy5pbnN0YW5jZU9mKERpYWxvZykuaXNSZXF1aXJlZFxuICAgKiAgICAgfSxcbiAgICogICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7IC4uLiB9XG4gICAqICAgfSk7XG4gICAqXG4gICAqIEEgbW9yZSBmb3JtYWwgc3BlY2lmaWNhdGlvbiBvZiBob3cgdGhlc2UgbWV0aG9kcyBhcmUgdXNlZDpcbiAgICpcbiAgICogICB0eXBlIDo9IGFycmF5fGJvb2x8ZnVuY3xvYmplY3R8bnVtYmVyfHN0cmluZ3xvbmVPZihbLi4uXSl8aW5zdGFuY2VPZiguLi4pXG4gICAqICAgZGVjbCA6PSBSZWFjdFByb3BUeXBlcy57dHlwZX0oLmlzUmVxdWlyZWQpP1xuICAgKlxuICAgKiBFYWNoIGFuZCBldmVyeSBkZWNsYXJhdGlvbiBwcm9kdWNlcyBhIGZ1bmN0aW9uIHdpdGggdGhlIHNhbWUgc2lnbmF0dXJlLiBUaGlzXG4gICAqIGFsbG93cyB0aGUgY3JlYXRpb24gb2YgY3VzdG9tIHZhbGlkYXRpb24gZnVuY3Rpb25zLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogIHZhciBNeUxpbmsgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG4gICAqICAgIHByb3BUeXBlczoge1xuICAgKiAgICAgIC8vIEFuIG9wdGlvbmFsIHN0cmluZyBvciBVUkkgcHJvcCBuYW1lZCBcImhyZWZcIi5cbiAgICogICAgICBocmVmOiBmdW5jdGlvbihwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUpIHtcbiAgICogICAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAqICAgICAgICBpZiAocHJvcFZhbHVlICE9IG51bGwgJiYgdHlwZW9mIHByb3BWYWx1ZSAhPT0gJ3N0cmluZycgJiZcbiAgICogICAgICAgICAgICAhKHByb3BWYWx1ZSBpbnN0YW5jZW9mIFVSSSkpIHtcbiAgICogICAgICAgICAgcmV0dXJuIG5ldyBFcnJvcihcbiAgICogICAgICAgICAgICAnRXhwZWN0ZWQgYSBzdHJpbmcgb3IgYW4gVVJJIGZvciAnICsgcHJvcE5hbWUgKyAnIGluICcgK1xuICAgKiAgICAgICAgICAgIGNvbXBvbmVudE5hbWVcbiAgICogICAgICAgICAgKTtcbiAgICogICAgICAgIH1cbiAgICogICAgICB9XG4gICAqICAgIH0sXG4gICAqICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7Li4ufVxuICAgKiAgfSk7XG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cblxuICB2YXIgQU5PTllNT1VTID0gJzw8YW5vbnltb3VzPj4nO1xuXG4gIC8vIEltcG9ydGFudCFcbiAgLy8gS2VlcCB0aGlzIGxpc3QgaW4gc3luYyB3aXRoIHByb2R1Y3Rpb24gdmVyc2lvbiBpbiBgLi9mYWN0b3J5V2l0aFRocm93aW5nU2hpbXMuanNgLlxuICB2YXIgUmVhY3RQcm9wVHlwZXMgPSB7XG4gICAgYXJyYXk6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdhcnJheScpLFxuICAgIGJvb2w6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdib29sZWFuJyksXG4gICAgZnVuYzogY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXIoJ2Z1bmN0aW9uJyksXG4gICAgbnVtYmVyOiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignbnVtYmVyJyksXG4gICAgb2JqZWN0OiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignb2JqZWN0JyksXG4gICAgc3RyaW5nOiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignc3RyaW5nJyksXG4gICAgc3ltYm9sOiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignc3ltYm9sJyksXG5cbiAgICBhbnk6IGNyZWF0ZUFueVR5cGVDaGVja2VyKCksXG4gICAgYXJyYXlPZjogY3JlYXRlQXJyYXlPZlR5cGVDaGVja2VyLFxuICAgIGVsZW1lbnQ6IGNyZWF0ZUVsZW1lbnRUeXBlQ2hlY2tlcigpLFxuICAgIGluc3RhbmNlT2Y6IGNyZWF0ZUluc3RhbmNlVHlwZUNoZWNrZXIsXG4gICAgbm9kZTogY3JlYXRlTm9kZUNoZWNrZXIoKSxcbiAgICBvYmplY3RPZjogY3JlYXRlT2JqZWN0T2ZUeXBlQ2hlY2tlcixcbiAgICBvbmVPZjogY3JlYXRlRW51bVR5cGVDaGVja2VyLFxuICAgIG9uZU9mVHlwZTogY3JlYXRlVW5pb25UeXBlQ2hlY2tlcixcbiAgICBzaGFwZTogY3JlYXRlU2hhcGVUeXBlQ2hlY2tlclxuICB9O1xuXG4gIC8qKlxuICAgKiBpbmxpbmVkIE9iamVjdC5pcyBwb2x5ZmlsbCB0byBhdm9pZCByZXF1aXJpbmcgY29uc3VtZXJzIHNoaXAgdGhlaXIgb3duXG4gICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL09iamVjdC9pc1xuICAgKi9cbiAgLyplc2xpbnQtZGlzYWJsZSBuby1zZWxmLWNvbXBhcmUqL1xuICBmdW5jdGlvbiBpcyh4LCB5KSB7XG4gICAgLy8gU2FtZVZhbHVlIGFsZ29yaXRobVxuICAgIGlmICh4ID09PSB5KSB7XG4gICAgICAvLyBTdGVwcyAxLTUsIDctMTBcbiAgICAgIC8vIFN0ZXBzIDYuYi02LmU6ICswICE9IC0wXG4gICAgICByZXR1cm4geCAhPT0gMCB8fCAxIC8geCA9PT0gMSAvIHk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFN0ZXAgNi5hOiBOYU4gPT0gTmFOXG4gICAgICByZXR1cm4geCAhPT0geCAmJiB5ICE9PSB5O1xuICAgIH1cbiAgfVxuICAvKmVzbGludC1lbmFibGUgbm8tc2VsZi1jb21wYXJlKi9cblxuICAvKipcbiAgICogV2UgdXNlIGFuIEVycm9yLWxpa2Ugb2JqZWN0IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IGFzIHBlb3BsZSBtYXkgY2FsbFxuICAgKiBQcm9wVHlwZXMgZGlyZWN0bHkgYW5kIGluc3BlY3QgdGhlaXIgb3V0cHV0LiBIb3dldmVyLCB3ZSBkb24ndCB1c2UgcmVhbFxuICAgKiBFcnJvcnMgYW55bW9yZS4gV2UgZG9uJ3QgaW5zcGVjdCB0aGVpciBzdGFjayBhbnl3YXksIGFuZCBjcmVhdGluZyB0aGVtXG4gICAqIGlzIHByb2hpYml0aXZlbHkgZXhwZW5zaXZlIGlmIHRoZXkgYXJlIGNyZWF0ZWQgdG9vIG9mdGVuLCBzdWNoIGFzIHdoYXRcbiAgICogaGFwcGVucyBpbiBvbmVPZlR5cGUoKSBmb3IgYW55IHR5cGUgYmVmb3JlIHRoZSBvbmUgdGhhdCBtYXRjaGVkLlxuICAgKi9cbiAgZnVuY3Rpb24gUHJvcFR5cGVFcnJvcihtZXNzYWdlKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICB0aGlzLnN0YWNrID0gJyc7XG4gIH1cbiAgLy8gTWFrZSBgaW5zdGFuY2VvZiBFcnJvcmAgc3RpbGwgd29yayBmb3IgcmV0dXJuZWQgZXJyb3JzLlxuICBQcm9wVHlwZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuICBmdW5jdGlvbiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSkge1xuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgICB2YXIgbWFudWFsUHJvcFR5cGVDYWxsQ2FjaGUgPSB7fTtcbiAgICAgIHZhciBtYW51YWxQcm9wVHlwZVdhcm5pbmdDb3VudCA9IDA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNoZWNrVHlwZShpc1JlcXVpcmVkLCBwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUsIHNlY3JldCkge1xuICAgICAgY29tcG9uZW50TmFtZSA9IGNvbXBvbmVudE5hbWUgfHwgQU5PTllNT1VTO1xuICAgICAgcHJvcEZ1bGxOYW1lID0gcHJvcEZ1bGxOYW1lIHx8IHByb3BOYW1lO1xuXG4gICAgICBpZiAoc2VjcmV0ICE9PSBSZWFjdFByb3BUeXBlc1NlY3JldCkge1xuICAgICAgICBpZiAodGhyb3dPbkRpcmVjdEFjY2Vzcykge1xuICAgICAgICAgIC8vIE5ldyBiZWhhdmlvciBvbmx5IGZvciB1c2VycyBvZiBgcHJvcC10eXBlc2AgcGFja2FnZVxuICAgICAgICAgIGludmFyaWFudChcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgJ0NhbGxpbmcgUHJvcFR5cGVzIHZhbGlkYXRvcnMgZGlyZWN0bHkgaXMgbm90IHN1cHBvcnRlZCBieSB0aGUgYHByb3AtdHlwZXNgIHBhY2thZ2UuICcgK1xuICAgICAgICAgICAgJ1VzZSBgUHJvcFR5cGVzLmNoZWNrUHJvcFR5cGVzKClgIHRvIGNhbGwgdGhlbS4gJyArXG4gICAgICAgICAgICAnUmVhZCBtb3JlIGF0IGh0dHA6Ly9mYi5tZS91c2UtY2hlY2stcHJvcC10eXBlcydcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgLy8gT2xkIGJlaGF2aW9yIGZvciBwZW9wbGUgdXNpbmcgUmVhY3QuUHJvcFR5cGVzXG4gICAgICAgICAgdmFyIGNhY2hlS2V5ID0gY29tcG9uZW50TmFtZSArICc6JyArIHByb3BOYW1lO1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICFtYW51YWxQcm9wVHlwZUNhbGxDYWNoZVtjYWNoZUtleV0gJiZcbiAgICAgICAgICAgIC8vIEF2b2lkIHNwYW1taW5nIHRoZSBjb25zb2xlIGJlY2F1c2UgdGhleSBhcmUgb2Z0ZW4gbm90IGFjdGlvbmFibGUgZXhjZXB0IGZvciBsaWIgYXV0aG9yc1xuICAgICAgICAgICAgbWFudWFsUHJvcFR5cGVXYXJuaW5nQ291bnQgPCAzXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICB3YXJuaW5nKFxuICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgJ1lvdSBhcmUgbWFudWFsbHkgY2FsbGluZyBhIFJlYWN0LlByb3BUeXBlcyB2YWxpZGF0aW9uICcgK1xuICAgICAgICAgICAgICAnZnVuY3Rpb24gZm9yIHRoZSBgJXNgIHByb3Agb24gYCVzYC4gVGhpcyBpcyBkZXByZWNhdGVkICcgK1xuICAgICAgICAgICAgICAnYW5kIHdpbGwgdGhyb3cgaW4gdGhlIHN0YW5kYWxvbmUgYHByb3AtdHlwZXNgIHBhY2thZ2UuICcgK1xuICAgICAgICAgICAgICAnWW91IG1heSBiZSBzZWVpbmcgdGhpcyB3YXJuaW5nIGR1ZSB0byBhIHRoaXJkLXBhcnR5IFByb3BUeXBlcyAnICtcbiAgICAgICAgICAgICAgJ2xpYnJhcnkuIFNlZSBodHRwczovL2ZiLm1lL3JlYWN0LXdhcm5pbmctZG9udC1jYWxsLXByb3B0eXBlcyAnICsgJ2ZvciBkZXRhaWxzLicsXG4gICAgICAgICAgICAgIHByb3BGdWxsTmFtZSxcbiAgICAgICAgICAgICAgY29tcG9uZW50TmFtZVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIG1hbnVhbFByb3BUeXBlQ2FsbENhY2hlW2NhY2hlS2V5XSA9IHRydWU7XG4gICAgICAgICAgICBtYW51YWxQcm9wVHlwZVdhcm5pbmdDb3VudCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHByb3BzW3Byb3BOYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIGlmIChpc1JlcXVpcmVkKSB7XG4gICAgICAgICAgaWYgKHByb3BzW3Byb3BOYW1lXSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdUaGUgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIGlzIG1hcmtlZCBhcyByZXF1aXJlZCAnICsgKCdpbiBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgYnV0IGl0cyB2YWx1ZSBpcyBgbnVsbGAuJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ1RoZSAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2AgaXMgbWFya2VkIGFzIHJlcXVpcmVkIGluICcgKyAoJ2AnICsgY29tcG9uZW50TmFtZSArICdgLCBidXQgaXRzIHZhbHVlIGlzIGB1bmRlZmluZWRgLicpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBjaGFpbmVkQ2hlY2tUeXBlID0gY2hlY2tUeXBlLmJpbmQobnVsbCwgZmFsc2UpO1xuICAgIGNoYWluZWRDaGVja1R5cGUuaXNSZXF1aXJlZCA9IGNoZWNrVHlwZS5iaW5kKG51bGwsIHRydWUpO1xuXG4gICAgcmV0dXJuIGNoYWluZWRDaGVja1R5cGU7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcihleHBlY3RlZFR5cGUpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUsIHNlY3JldCkge1xuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgICBpZiAocHJvcFR5cGUgIT09IGV4cGVjdGVkVHlwZSkge1xuICAgICAgICAvLyBgcHJvcFZhbHVlYCBiZWluZyBpbnN0YW5jZSBvZiwgc2F5LCBkYXRlL3JlZ2V4cCwgcGFzcyB0aGUgJ29iamVjdCdcbiAgICAgICAgLy8gY2hlY2ssIGJ1dCB3ZSBjYW4gb2ZmZXIgYSBtb3JlIHByZWNpc2UgZXJyb3IgbWVzc2FnZSBoZXJlIHJhdGhlciB0aGFuXG4gICAgICAgIC8vICdvZiB0eXBlIGBvYmplY3RgJy5cbiAgICAgICAgdmFyIHByZWNpc2VUeXBlID0gZ2V0UHJlY2lzZVR5cGUocHJvcFZhbHVlKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHR5cGUgJyArICgnYCcgKyBwcmVjaXNlVHlwZSArICdgIHN1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCAnKSArICgnYCcgKyBleHBlY3RlZFR5cGUgKyAnYC4nKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUFueVR5cGVDaGVja2VyKCkge1xuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcihlbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zTnVsbCk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVBcnJheU9mVHlwZUNoZWNrZXIodHlwZUNoZWNrZXIpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIGlmICh0eXBlb2YgdHlwZUNoZWNrZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdQcm9wZXJ0eSBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIGNvbXBvbmVudCBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCBoYXMgaW52YWxpZCBQcm9wVHlwZSBub3RhdGlvbiBpbnNpZGUgYXJyYXlPZi4nKTtcbiAgICAgIH1cbiAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvcFZhbHVlKSkge1xuICAgICAgICB2YXIgcHJvcFR5cGUgPSBnZXRQcm9wVHlwZShwcm9wVmFsdWUpO1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHR5cGUgJyArICgnYCcgKyBwcm9wVHlwZSArICdgIHN1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCBhbiBhcnJheS4nKSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BWYWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZXJyb3IgPSB0eXBlQ2hlY2tlcihwcm9wVmFsdWUsIGksIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUgKyAnWycgKyBpICsgJ10nLCBSZWFjdFByb3BUeXBlc1NlY3JldCk7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnRUeXBlQ2hlY2tlcigpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgICBpZiAoIWlzVmFsaWRFbGVtZW50KHByb3BWYWx1ZSkpIHtcbiAgICAgICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiB0eXBlICcgKyAoJ2AnICsgcHJvcFR5cGUgKyAnYCBzdXBwbGllZCB0byBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgYSBzaW5nbGUgUmVhY3RFbGVtZW50LicpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlSW5zdGFuY2VUeXBlQ2hlY2tlcihleHBlY3RlZENsYXNzKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICBpZiAoIShwcm9wc1twcm9wTmFtZV0gaW5zdGFuY2VvZiBleHBlY3RlZENsYXNzKSkge1xuICAgICAgICB2YXIgZXhwZWN0ZWRDbGFzc05hbWUgPSBleHBlY3RlZENsYXNzLm5hbWUgfHwgQU5PTllNT1VTO1xuICAgICAgICB2YXIgYWN0dWFsQ2xhc3NOYW1lID0gZ2V0Q2xhc3NOYW1lKHByb3BzW3Byb3BOYW1lXSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSAnICsgKCdgJyArIGFjdHVhbENsYXNzTmFtZSArICdgIHN1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCAnKSArICgnaW5zdGFuY2Ugb2YgYCcgKyBleHBlY3RlZENsYXNzTmFtZSArICdgLicpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRW51bVR5cGVDaGVja2VyKGV4cGVjdGVkVmFsdWVzKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGV4cGVjdGVkVmFsdWVzKSkge1xuICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IHdhcm5pbmcoZmFsc2UsICdJbnZhbGlkIGFyZ3VtZW50IHN1cHBsaWVkIHRvIG9uZU9mLCBleHBlY3RlZCBhbiBpbnN0YW5jZSBvZiBhcnJheS4nKSA6IHZvaWQgMDtcbiAgICAgIHJldHVybiBlbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zTnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV4cGVjdGVkVmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpcyhwcm9wVmFsdWUsIGV4cGVjdGVkVmFsdWVzW2ldKSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZXNTdHJpbmcgPSBKU09OLnN0cmluZ2lmeShleHBlY3RlZFZhbHVlcyk7XG4gICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHZhbHVlIGAnICsgcHJvcFZhbHVlICsgJ2AgJyArICgnc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIG9uZSBvZiAnICsgdmFsdWVzU3RyaW5nICsgJy4nKSk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVPYmplY3RPZlR5cGVDaGVja2VyKHR5cGVDaGVja2VyKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICBpZiAodHlwZW9mIHR5cGVDaGVja2VyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignUHJvcGVydHkgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiBjb21wb25lbnQgYCcgKyBjb21wb25lbnROYW1lICsgJ2AgaGFzIGludmFsaWQgUHJvcFR5cGUgbm90YXRpb24gaW5zaWRlIG9iamVjdE9mLicpO1xuICAgICAgfVxuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgICBpZiAocHJvcFR5cGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSAnICsgKCdgJyArIHByb3BUeXBlICsgJ2Agc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIGFuIG9iamVjdC4nKSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBrZXkgaW4gcHJvcFZhbHVlKSB7XG4gICAgICAgIGlmIChwcm9wVmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIHZhciBlcnJvciA9IHR5cGVDaGVja2VyKHByb3BWYWx1ZSwga2V5LCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lICsgJy4nICsga2V5LCBSZWFjdFByb3BUeXBlc1NlY3JldCk7XG4gICAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlVW5pb25UeXBlQ2hlY2tlcihhcnJheU9mVHlwZUNoZWNrZXJzKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGFycmF5T2ZUeXBlQ2hlY2tlcnMpKSB7XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gd2FybmluZyhmYWxzZSwgJ0ludmFsaWQgYXJndW1lbnQgc3VwcGxpZWQgdG8gb25lT2ZUeXBlLCBleHBlY3RlZCBhbiBpbnN0YW5jZSBvZiBhcnJheS4nKSA6IHZvaWQgMDtcbiAgICAgIHJldHVybiBlbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zTnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXlPZlR5cGVDaGVja2Vycy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hlY2tlciA9IGFycmF5T2ZUeXBlQ2hlY2tlcnNbaV07XG4gICAgICAgIGlmIChjaGVja2VyKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSwgUmVhY3RQcm9wVHlwZXNTZWNyZXQpID09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIHN1cHBsaWVkIHRvICcgKyAoJ2AnICsgY29tcG9uZW50TmFtZSArICdgLicpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU5vZGVDaGVja2VyKCkge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgaWYgKCFpc05vZGUocHJvcHNbcHJvcE5hbWVdKSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIHN1cHBsaWVkIHRvICcgKyAoJ2AnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCBhIFJlYWN0Tm9kZS4nKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVNoYXBlVHlwZUNoZWNrZXIoc2hhcGVUeXBlcykge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgICBpZiAocHJvcFR5cGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSBgJyArIHByb3BUeXBlICsgJ2AgJyArICgnc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIGBvYmplY3RgLicpKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGtleSBpbiBzaGFwZVR5cGVzKSB7XG4gICAgICAgIHZhciBjaGVja2VyID0gc2hhcGVUeXBlc1trZXldO1xuICAgICAgICBpZiAoIWNoZWNrZXIpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXJyb3IgPSBjaGVja2VyKHByb3BWYWx1ZSwga2V5LCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lICsgJy4nICsga2V5LCBSZWFjdFByb3BUeXBlc1NlY3JldCk7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc05vZGUocHJvcFZhbHVlKSB7XG4gICAgc3dpdGNoICh0eXBlb2YgcHJvcFZhbHVlKSB7XG4gICAgICBjYXNlICdudW1iZXInOlxuICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgIGNhc2UgJ3VuZGVmaW5lZCc6XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgIHJldHVybiAhcHJvcFZhbHVlO1xuICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocHJvcFZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiBwcm9wVmFsdWUuZXZlcnkoaXNOb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvcFZhbHVlID09PSBudWxsIHx8IGlzVmFsaWRFbGVtZW50KHByb3BWYWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpdGVyYXRvckZuID0gZ2V0SXRlcmF0b3JGbihwcm9wVmFsdWUpO1xuICAgICAgICBpZiAoaXRlcmF0b3JGbikge1xuICAgICAgICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhdG9yRm4uY2FsbChwcm9wVmFsdWUpO1xuICAgICAgICAgIHZhciBzdGVwO1xuICAgICAgICAgIGlmIChpdGVyYXRvckZuICE9PSBwcm9wVmFsdWUuZW50cmllcykge1xuICAgICAgICAgICAgd2hpbGUgKCEoc3RlcCA9IGl0ZXJhdG9yLm5leHQoKSkuZG9uZSkge1xuICAgICAgICAgICAgICBpZiAoIWlzTm9kZShzdGVwLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJdGVyYXRvciB3aWxsIHByb3ZpZGUgZW50cnkgW2ssdl0gdHVwbGVzIHJhdGhlciB0aGFuIHZhbHVlcy5cbiAgICAgICAgICAgIHdoaWxlICghKHN0ZXAgPSBpdGVyYXRvci5uZXh0KCkpLmRvbmUpIHtcbiAgICAgICAgICAgICAgdmFyIGVudHJ5ID0gc3RlcC52YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpc05vZGUoZW50cnlbMV0pKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGlzU3ltYm9sKHByb3BUeXBlLCBwcm9wVmFsdWUpIHtcbiAgICAvLyBOYXRpdmUgU3ltYm9sLlxuICAgIGlmIChwcm9wVHlwZSA9PT0gJ3N5bWJvbCcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIDE5LjQuMy41IFN5bWJvbC5wcm90b3R5cGVbQEB0b1N0cmluZ1RhZ10gPT09ICdTeW1ib2wnXG4gICAgaWYgKHByb3BWYWx1ZVsnQEB0b1N0cmluZ1RhZyddID09PSAnU3ltYm9sJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRmFsbGJhY2sgZm9yIG5vbi1zcGVjIGNvbXBsaWFudCBTeW1ib2xzIHdoaWNoIGFyZSBwb2x5ZmlsbGVkLlxuICAgIGlmICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIHByb3BWYWx1ZSBpbnN0YW5jZW9mIFN5bWJvbCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gRXF1aXZhbGVudCBvZiBgdHlwZW9mYCBidXQgd2l0aCBzcGVjaWFsIGhhbmRsaW5nIGZvciBhcnJheSBhbmQgcmVnZXhwLlxuICBmdW5jdGlvbiBnZXRQcm9wVHlwZShwcm9wVmFsdWUpIHtcbiAgICB2YXIgcHJvcFR5cGUgPSB0eXBlb2YgcHJvcFZhbHVlO1xuICAgIGlmIChBcnJheS5pc0FycmF5KHByb3BWYWx1ZSkpIHtcbiAgICAgIHJldHVybiAnYXJyYXknO1xuICAgIH1cbiAgICBpZiAocHJvcFZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAvLyBPbGQgd2Via2l0cyAoYXQgbGVhc3QgdW50aWwgQW5kcm9pZCA0LjApIHJldHVybiAnZnVuY3Rpb24nIHJhdGhlciB0aGFuXG4gICAgICAvLyAnb2JqZWN0JyBmb3IgdHlwZW9mIGEgUmVnRXhwLiBXZSdsbCBub3JtYWxpemUgdGhpcyBoZXJlIHNvIHRoYXQgL2JsYS9cbiAgICAgIC8vIHBhc3NlcyBQcm9wVHlwZXMub2JqZWN0LlxuICAgICAgcmV0dXJuICdvYmplY3QnO1xuICAgIH1cbiAgICBpZiAoaXNTeW1ib2wocHJvcFR5cGUsIHByb3BWYWx1ZSkpIHtcbiAgICAgIHJldHVybiAnc3ltYm9sJztcbiAgICB9XG4gICAgcmV0dXJuIHByb3BUeXBlO1xuICB9XG5cbiAgLy8gVGhpcyBoYW5kbGVzIG1vcmUgdHlwZXMgdGhhbiBgZ2V0UHJvcFR5cGVgLiBPbmx5IHVzZWQgZm9yIGVycm9yIG1lc3NhZ2VzLlxuICAvLyBTZWUgYGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyYC5cbiAgZnVuY3Rpb24gZ2V0UHJlY2lzZVR5cGUocHJvcFZhbHVlKSB7XG4gICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICBpZiAocHJvcFR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAocHJvcFZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICByZXR1cm4gJ2RhdGUnO1xuICAgICAgfSBlbHNlIGlmIChwcm9wVmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgcmV0dXJuICdyZWdleHAnO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcHJvcFR5cGU7XG4gIH1cblxuICAvLyBSZXR1cm5zIGNsYXNzIG5hbWUgb2YgdGhlIG9iamVjdCwgaWYgYW55LlxuICBmdW5jdGlvbiBnZXRDbGFzc05hbWUocHJvcFZhbHVlKSB7XG4gICAgaWYgKCFwcm9wVmFsdWUuY29uc3RydWN0b3IgfHwgIXByb3BWYWx1ZS5jb25zdHJ1Y3Rvci5uYW1lKSB7XG4gICAgICByZXR1cm4gQU5PTllNT1VTO1xuICAgIH1cbiAgICByZXR1cm4gcHJvcFZhbHVlLmNvbnN0cnVjdG9yLm5hbWU7XG4gIH1cblxuICBSZWFjdFByb3BUeXBlcy5jaGVja1Byb3BUeXBlcyA9IGNoZWNrUHJvcFR5cGVzO1xuICBSZWFjdFByb3BUeXBlcy5Qcm9wVHlwZXMgPSBSZWFjdFByb3BUeXBlcztcblxuICByZXR1cm4gUmVhY3RQcm9wVHlwZXM7XG59O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3Byb3AtdHlwZXMvZmFjdG9yeVdpdGhUeXBlQ2hlY2tlcnMuanNcbi8vIG1vZHVsZSBpZCA9IDQ3NlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJ2YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmICghc2VsZikgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIGNhbGwgJiYgKHR5cGVvZiBjYWxsID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpID8gY2FsbCA6IHNlbGY7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgXCIgKyB0eXBlb2Ygc3VwZXJDbGFzcyk7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcykgOiBzdWJDbGFzcy5fX3Byb3RvX18gPSBzdXBlckNsYXNzOyB9XG5cbi8qKlxuICogQG1vZHVsZSBjb21wb25lbnRXcmFwcGVyXG4gKlxuICovXG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuXG5pbXBvcnQgc3RvcmUgZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHsgb25Nb3VudCwgb25Vbm1vdW50IH0gZnJvbSAnLi4vZXZlbnRfaGFuZGxlcnMnO1xuXG4vKipcbiAqIGNvbXBvbmVudFdyYXBwZXJcbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtvYmplY3R9IFdyYXBwZWRDb21wb25lbnQgUmVhY3QgY29tcG9uZW50IGNsYXNzIHRvIGJlIHdyYXBwZWRcbiAqIEBwYXJhbSB7YXJyYXl9IFtrZXlzXSBUaGUga2V5KHMpIGJvdW5kIHRvIHRoZSBjbGFzc1xuICogQHJldHVybiB7b2JqZWN0fSBUaGUgaGlnaGVyLW9yZGVyIGZ1bmN0aW9uIHRoYXQgd3JhcHMgdGhlIGRlY29yYXRlZCBjbGFzc1xuICovXG5mdW5jdGlvbiBjb21wb25lbnRXcmFwcGVyKFdyYXBwZWRDb21wb25lbnQpIHtcbiAgdmFyIGtleXMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IG51bGw7XG5cbiAgdmFyIEtleUJvYXJkSGVscGVyID0gZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgICBfaW5oZXJpdHMoS2V5Qm9hcmRIZWxwZXIsIF9SZWFjdCRDb21wb25lbnQpO1xuXG4gICAgZnVuY3Rpb24gS2V5Qm9hcmRIZWxwZXIocHJvcHMpIHtcbiAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBLZXlCb2FyZEhlbHBlcik7XG5cbiAgICAgIHZhciBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIChLZXlCb2FyZEhlbHBlci5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKEtleUJvYXJkSGVscGVyKSkuY2FsbCh0aGlzLCBwcm9wcykpO1xuXG4gICAgICBfdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgZXZlbnQ6IG51bGxcbiAgICAgIH07XG4gICAgICByZXR1cm4gX3RoaXM7XG4gICAgfVxuXG4gICAgX2NyZWF0ZUNsYXNzKEtleUJvYXJkSGVscGVyLCBbe1xuICAgICAga2V5OiAnY29tcG9uZW50RGlkTW91bnQnLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgICBvbk1vdW50KHRoaXMpO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogJ2NvbXBvbmVudFdpbGxVbm1vdW50JyxcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcbiAgICAgICAgb25Vbm1vdW50KHRoaXMpO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogJ2hhbmRsZUtleURvd24nLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGhhbmRsZUtleURvd24oZXZlbnQpIHtcbiAgICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICAgLy8gdG8gc2ltdWxhdGUgYSBrZXlwcmVzcywgc2V0IHRoZSBldmVudCBhbmQgdGhlbiBjbGVhciBpdCBpbiB0aGUgY2FsbGJhY2tcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7IGV2ZW50OiBldmVudCB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMi5zZXRTdGF0ZSh7IGV2ZW50OiBudWxsIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6ICdyZW5kZXInLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoV3JhcHBlZENvbXBvbmVudCwgX2V4dGVuZHMoe30sIHRoaXMucHJvcHMsIHsga2V5ZG93bjogdGhpcy5zdGF0ZSB9KSk7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIEtleUJvYXJkSGVscGVyO1xuICB9KFJlYWN0LkNvbXBvbmVudCk7XG5cbiAgc3RvcmUuc2V0QmluZGluZyh7IGtleXM6IGtleXMsIGZuOiBLZXlCb2FyZEhlbHBlci5wcm90b3R5cGUuaGFuZGxlS2V5RG93biwgdGFyZ2V0OiBLZXlCb2FyZEhlbHBlci5wcm90b3R5cGUgfSk7XG5cbiAgcmV0dXJuIEtleUJvYXJkSGVscGVyO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjb21wb25lbnRXcmFwcGVyO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2RlY29yYXRvcnMvY2xhc3NfZGVjb3JhdG9yLmpzXG4vLyBtb2R1bGUgaWQgPSA1NjRcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwidmFyIF90eXBlb2YgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIiA/IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH0gOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9O1xuXG4vKipcbiAqIEBtb2R1bGUgZGVjb3JhdG9yc1xuICpcbiAqL1xuaW1wb3J0IGNsYXNzV3JhcHBlciBmcm9tICcuL2NsYXNzX2RlY29yYXRvcic7XG5pbXBvcnQgbWV0aG9kV3JhcHBlciBmcm9tICcuL21ldGhvZF9kZWNvcmF0b3InO1xuaW1wb3J0IG1ldGhvZFdyYXBwZXJTY29wZWQgZnJvbSAnLi9tZXRob2RfZGVjb3JhdG9yX3Njb3BlZCc7XG5cbi8qKlxuICogX2RlY29yYXRvclxuICpcbiAqIEBhY2Nlc3MgcHJpdmF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gbWV0aG9kRm4gVGhlIG1ldGhvZCB3cmFwcGVyIHRvIGRlbGVnYXRlIHRvLCBiYXNlZCBvbiB3aGV0aGVyIHVzZXIgaGFzIHNwZWNpZmllZCBhIHNjb3BlZCBkZWNvcmF0b3Igb3Igbm90XG4gKiBAcGFyYW0ge0FycmF5fSAuLi5hcmdzIFJlbWFpbmRlciBvZiBhcmd1bWVudHMgcGFzc2VkIGluXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIGRlY29yYXRlZCBjbGFzcyBvciBtZXRob2RcbiAqL1xuZnVuY3Rpb24gX2RlY29yYXRvcihtZXRob2RGbikge1xuICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4gPiAxID8gX2xlbiAtIDEgOiAwKSwgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICBhcmdzW19rZXkgLSAxXSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgfVxuXG4gIC8vIGNoZWNrIHRoZSBmaXJzdCBhcmd1bWVudCB0byBzZWUgaWYgaXQncyBhIHVzZXItc3VwcGxpZWQga2V5Y29kZSBvciBhcnJheVxuICAvLyBvZiBrZXljb2Rlcywgb3IgaWYgaXQncyB0aGUgd3JhcHBlZCBjbGFzcyBvciBtZXRob2RcbiAgdmFyIHRlc3RBcmcgPSBhcmdzWzBdO1xuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkodGVzdEFyZyk7XG5cbiAgLy8gaWYgdGhlIHRlc3QgYXJndW1lbnQgaXMgbm90IGFuIG9iamVjdCBvciBmdW5jdGlvbiwgaXQgaXMgdXNlci1zdXBwbGllZFxuICAvLyBrZXljb2Rlcy4gZWxzZSB0aGVyZSBhcmUgbm8gYXJndW1lbnRzIGFuZCBpdCdzIGp1c3QgdGhlIHdyYXBwZWQgY2xhc3NcbiAgLy8gKG1ldGhvZCBkZWNvcmF0b3JzIG11c3QgaGF2ZSBrZXljb2RlIGFyZ3VtZW50cykuXG4gIGlmIChpc0FycmF5IHx8IH5bJ3N0cmluZycsICdudW1iZXInXS5pbmRleE9mKHR5cGVvZiB0ZXN0QXJnID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih0ZXN0QXJnKSkpIHtcbiAgICB2YXIga2V5cyA9IGlzQXJyYXkgPyB0ZXN0QXJnIDogYXJncztcblxuICAgIC8vIHJldHVybiB0aGUgZGVjb3JhdG9yIGZ1bmN0aW9uLCB3aGljaCBvbiB0aGUgbmV4dCBjYWxsIHdpbGwgbG9vayBmb3JcbiAgICAvLyB0aGUgcHJlc2VuY2Ugb2YgYSBtZXRob2QgbmFtZSB0byBkZXRlcm1pbmUgaWYgdGhpcyBpcyBhIHdyYXBwZWQgbWV0aG9kXG4gICAgLy8gb3IgY29tcG9uZW50XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIG1ldGhvZE5hbWUsIGRlc2NyaXB0b3IpIHtcbiAgICAgIHJldHVybiBtZXRob2ROYW1lID8gbWV0aG9kRm4oeyB0YXJnZXQ6IHRhcmdldCwgZGVzY3JpcHRvcjogZGVzY3JpcHRvciwga2V5czoga2V5cyB9KSA6IGNsYXNzV3JhcHBlcih0YXJnZXQsIGtleXMpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgdmFyIG1ldGhvZE5hbWUgPSBhcmdzWzFdO1xuXG4gICAgLy8gbWV0aG9kIGRlY29yYXRvcnMgd2l0aG91dCBrZXljb2RlICh3aGljaCkgYXJndW1lbnRzIGFyZSBub3QgYWxsb3dlZC5cbiAgICBpZiAoIW1ldGhvZE5hbWUpIHtcbiAgICAgIHJldHVybiBjbGFzc1dyYXBwZXIuYXBwbHkodW5kZWZpbmVkLCBhcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKG1ldGhvZE5hbWUgKyAnOiBNZXRob2QgZGVjb3JhdG9ycyBtdXN0IGhhdmUga2V5Y29kZSBhcmd1bWVudHMsIHNvIHRoZSBkZWNvcmF0b3IgZm9yIHRoaXMgbWV0aG9kIHdpbGwgbm90IGRvIGFueXRoaW5nJyk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICoga2V5ZG93blNjb3BlZFxuICpcbiAqIE1ldGhvZCBkZWNvcmF0b3IgdGhhdCB3aWxsIGxvb2sgZm9yIGNoYW5nZXMgdG8gaXRzIHRhcmdldGVkIGNvbXBvbmVudCdzXG4gKiBga2V5ZG93bmAgcHJvcHMgdG8gZGVjaWRlIHdoZW4gdG8gdHJpZ2dlciwgcmF0aGVyIHRoYW4gcmVzcG9uZGluZyBkaXJlY3RseVxuICogdG8ga2V5ZG93biBldmVudHMuIFRoaXMgbGV0cyB5b3Ugc3BlY2lmeSBhIEBrZXlkb3duIGRlY29yYXRlZCBjbGFzcyBoaWdoZXJcbiAqIHVwIGluIHRoZSB2aWV3IGhpZXJhcmNoeSBmb3IgbGFyZ2VyIHNjb3Bpbmcgb2Yga2V5ZG93biBldmVudHMsIG9yIGZvclxuICogcHJvZ3JhbW1hdGljYWxseSBzZW5kaW5nIGtleWRvd24gZXZlbnRzIGFzIHByb3BzIGludG8gdGhlIGNvbXBvbmVudHMgaW4gb3JkZXJcbiAqIHRvIHRyaWdnZXIgZGVjb3JhdGVkIG1ldGhvZHMgd2l0aCBtYXRjaGluZyBrZXlzLlxuICpcbiAqIEBhY2Nlc3MgcHVibGljXG4gKiBAcGFyYW0ge0FycmF5fSAuLi5hcmdzICBBbGwgKG9yIG5vKSBhcmd1bWVudHMgcGFzc2VkIGluIGZyb20gZGVjb3JhdGlvblxuICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBkZWNvcmF0ZWQgY2xhc3Mgb3IgbWV0aG9kXG4gKi9cbmZ1bmN0aW9uIGtleWRvd25TY29wZWQoKSB7XG4gIGZvciAodmFyIF9sZW4yID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4yKSwgX2tleTIgPSAwOyBfa2V5MiA8IF9sZW4yOyBfa2V5MisrKSB7XG4gICAgYXJnc1tfa2V5Ml0gPSBhcmd1bWVudHNbX2tleTJdO1xuICB9XG5cbiAgcmV0dXJuIF9kZWNvcmF0b3IuYXBwbHkodW5kZWZpbmVkLCBbbWV0aG9kV3JhcHBlclNjb3BlZF0uY29uY2F0KGFyZ3MpKTtcbn1cblxuLyoqXG4gKiBrZXlkb3duXG4gKlxuICogVGhlIG1haW4gZGVjb3JhdG9yIGFuZCBkZWZhdWx0IGV4cG9ydCwgaGFuZGxlcyBib3RoIGNsYXNzZXMgYW5kIG1ldGhvZHMuXG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqIEBwYXJhbSB7QXJyYXl9IC4uLmFyZ3MgIEFsbCAob3Igbm8pIGFyZ3VtZW50cyBwYXNzZWQgaW4gZnJvbSBkZWNvcmF0aW9uXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIGRlY29yYXRlZCBjbGFzcyBvciBtZXRob2RcbiAqL1xuZnVuY3Rpb24ga2V5ZG93bigpIHtcbiAgZm9yICh2YXIgX2xlbjMgPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbjMpLCBfa2V5MyA9IDA7IF9rZXkzIDwgX2xlbjM7IF9rZXkzKyspIHtcbiAgICBhcmdzW19rZXkzXSA9IGFyZ3VtZW50c1tfa2V5M107XG4gIH1cblxuICByZXR1cm4gX2RlY29yYXRvci5hcHBseSh1bmRlZmluZWQsIFttZXRob2RXcmFwcGVyXS5jb25jYXQoYXJncykpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBrZXlkb3duO1xuXG5leHBvcnQgeyBrZXlkb3duU2NvcGVkIH07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvZGVjb3JhdG9ycy9pbmRleC5qc1xuLy8gbW9kdWxlIGlkID0gNTY1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsInZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxuLyoqXG4gKiBAbW9kdWxlIG1ldGhvZFdyYXBwZXJcbiAqXG4gKi9cbmltcG9ydCBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgeyBvbk1vdW50LCBvblVubW91bnQsIF9vbktleURvd24gfSBmcm9tICcuLi9ldmVudF9oYW5kbGVycyc7XG5cbi8qKlxuICogX2lzUmVhY3RLZXlEb3duXG4gKlxuICogQGFjY2VzcyBwcml2YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gZXZlbnQgVGhlIHBvc3NpYmx5IHN5bnRoZXRpYyBldmVudCBwYXNzZWQgYXMgYW4gYXJndW1lbnQgd2l0aFxuICogdGhlIG1ldGhvZCBpbnZvY2F0aW9uLlxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gX2lzUmVhY3RLZXlEb3duKGV2ZW50KSB7XG4gIHJldHVybiBldmVudCAmJiAodHlwZW9mIGV2ZW50ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihldmVudCkpID09PSAnb2JqZWN0JyAmJiBldmVudC5uYXRpdmVFdmVudCBpbnN0YW5jZW9mIHdpbmRvdy5LZXlib2FyZEV2ZW50ICYmIGV2ZW50LnR5cGUgPT09ICdrZXlkb3duJztcbn1cblxuLyoqXG4gKiBtZXRob2RXcmFwcGVyXG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzIEFsbCBhcmd1bWVudHMgbmVjZXNzYXJ5IGZvciB3cmFwcGluZyBtZXRob2RcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzLnRhcmdldCBUaGUgZGVjb3JhdGVkIGNsYXNzXG4gKiBAcGFyYW0ge29iamVjdH0gYXJncy5kZXNjcmlwdG9yIE1ldGhvZCBkZXNjcmlwdG9yXG4gKiBAcGFyYW0ge2FycmF5fSBhcmdzLmtleXMgVGhlIGFycmF5IG9mIGtleXMgYm91bmQgdG8gdGhlIGdpdmVuIG1ldGhvZFxuICogQHJldHVybiB7b2JqZWN0fSBUaGUgbWV0aG9kIGRlc2NyaXB0b3JcbiAqL1xuZnVuY3Rpb24gbWV0aG9kV3JhcHBlcihfcmVmKSB7XG4gIHZhciB0YXJnZXQgPSBfcmVmLnRhcmdldCxcbiAgICAgIGRlc2NyaXB0b3IgPSBfcmVmLmRlc2NyaXB0b3IsXG4gICAgICBrZXlzID0gX3JlZi5rZXlzO1xuXG5cbiAgdmFyIGZuID0gZGVzY3JpcHRvci52YWx1ZTtcblxuICAvLyBpZiB3ZSBoYXZlbid0IGFscmVhZHkgY3JlYXRlZCBhIGJpbmRpbmcgZm9yIHRoaXMgY2xhc3MgKHZpYSBhbm90aGVyXG4gIC8vIGRlY29yYXRlZCBtZXRob2QpLCB3cmFwIHRoZXNlIGxpZmVjeWNsZSBtZXRob2RzLlxuICBpZiAoIXN0b3JlLmdldEJpbmRpbmcodGFyZ2V0KSkge1xuICAgIHZhciBjb21wb25lbnREaWRNb3VudCA9IHRhcmdldC5jb21wb25lbnREaWRNb3VudCxcbiAgICAgICAgY29tcG9uZW50V2lsbFVubW91bnQgPSB0YXJnZXQuY29tcG9uZW50V2lsbFVubW91bnQ7XG5cblxuICAgIHRhcmdldC5jb21wb25lbnREaWRNb3VudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIG9uTW91bnQodGhpcyk7XG4gICAgICBpZiAoY29tcG9uZW50RGlkTW91bnQpIHJldHVybiBjb21wb25lbnREaWRNb3VudC5jYWxsKHRoaXMpO1xuICAgIH07XG5cbiAgICB0YXJnZXQuY29tcG9uZW50V2lsbFVubW91bnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBvblVubW91bnQodGhpcyk7XG4gICAgICBpZiAoY29tcG9uZW50V2lsbFVubW91bnQpIHJldHVybiBjb21wb25lbnRXaWxsVW5tb3VudC5jYWxsKHRoaXMpO1xuICAgIH07XG4gIH1cblxuICAvLyBhZGQgdGhpcyBiaW5kaW5nIG9mIGtleXMgYW5kIG1ldGhvZCB0byB0aGUgdGFyZ2V0J3MgYmluZGluZ3NcbiAgc3RvcmUuc2V0QmluZGluZyh7IGtleXM6IGtleXMsIHRhcmdldDogdGFyZ2V0LCBmbjogZm4gfSk7XG5cbiAgZGVzY3JpcHRvci52YWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4pLCBfa2V5ID0gMDsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgYXJnc1tfa2V5XSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICB9XG5cbiAgICB2YXIgbWF5YmVFdmVudCA9IGFyZ3NbMF07XG5cbiAgICBpZiAoX2lzUmVhY3RLZXlEb3duKG1heWJlRXZlbnQpKSB7XG4gICAgICAvLyBwcm94eSBtZXRob2QgaW4gb3JkZXIgdG8gdXNlIEBrZXlkb3duIGFzIGZpbHRlciBmb3Iga2V5ZG93biBldmVudHMgY29taW5nXG4gICAgICAvLyBmcm9tIGFuIGFjdHVhbCBvbktleURvd24gYmluZGluZyAoYXMgaWRlbnRpZmllZCBieSByZWFjdCdzIGFkZGl0aW9uIG9mXG4gICAgICAvLyAnbmF0aXZlRXZlbnQnICsgdHlwZSA9PT0gJ2tleWRvd24nKVxuICAgICAgaWYgKCFtYXliZUV2ZW50LmN0cmxLZXkpIHtcbiAgICAgICAgLy8gd2UgYWxyZWFkeSB3aGl0ZWxpc3Qgc2hvcnRjdXRzIHdpdGggY3RybCBtb2RpZmllcnMgc28gaWYgd2Ugd2VyZSB0b1xuICAgICAgICAvLyBmaXJlIGl0IGFnYWluIGhlcmUgdGhlIG1ldGhvZCB3b3VsZCB0cmlnZ2VyIHR3aWNlLiBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2dsb3J0aG8vcmVhY3Qta2V5ZG93bi9pc3N1ZXMvMzhcbiAgICAgICAgcmV0dXJuIF9vbktleURvd24obWF5YmVFdmVudCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghbWF5YmVFdmVudCB8fCAhKG1heWJlRXZlbnQgaW5zdGFuY2VvZiB3aW5kb3cuS2V5Ym9hcmRFdmVudCkgfHwgbWF5YmVFdmVudC50eXBlICE9PSAna2V5ZG93bicpIHtcbiAgICAgIC8vIGlmIG91ciBmaXJzdCBhcmd1bWVudCBpcyBhIGtleWRvd24gZXZlbnQgaXQgaXMgYmVpbmcgaGFuZGxlZCBieSBvdXJcbiAgICAgIC8vIGJpbmRpbmcgc3lzdGVtLiBpZiBpdCdzIGFueXRoaW5nIGVsc2UsIGp1c3QgcGFzcyB0aHJvdWdoLlxuICAgICAgcmV0dXJuIGZuLmNhbGwuYXBwbHkoZm4sIFt0aGlzXS5jb25jYXQoYXJncykpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZGVzY3JpcHRvcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgbWV0aG9kV3JhcHBlcjtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9kZWNvcmF0b3JzL21ldGhvZF9kZWNvcmF0b3IuanNcbi8vIG1vZHVsZSBpZCA9IDU2NlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIEBtb2R1bGUgbWV0aG9kV3JhcHBlclNjb3BlZFxuICpcbiAqL1xuaW1wb3J0IG1hdGNoS2V5cyBmcm9tICcuLi9saWIvbWF0Y2hfa2V5cyc7XG5pbXBvcnQgcGFyc2VLZXlzIGZyb20gJy4uL2xpYi9wYXJzZV9rZXlzJztcblxuLyoqXG4gKiBfc2hvdWxkVHJpZ2dlclxuICpcbiAqIEBhY2Nlc3MgcHJpdmF0ZVxuICogQHBhcmFtIHtvYmplY3R9IHRoaXNQcm9wcyBFeHN0aW5nIHByb3BzIGZyb20gdGhlIHdyYXBwZWQgY29tcG9uZW50XG4gKiBAcGFyYW0ge29iamVjdH0gdGhpc1Byb3BzLmtleWRvd24gVGhlIG5hbWVzcGFjZWQgc3RhdGUgZnJvbSB0aGUgaGlnaGVyLW9yZGVyXG4gKiBjb21wb25lbnQgKGNsYXNzX2RlY29yYXRvcilcbiAqIEBwYXJhbSB7b2JqZWN0fSBuZXh0UHJvcHMgVGhlIGluY29taW5nIHByb3BzIGZyb20gdGhlIHdyYXBwZWQgY29tcG9uZW50XG4gKiBAcGFyYW0ge29iamVjdH0gbmV4dFByb3BzLmtleWRvd24gVGhlIG5hbWVzY2FwZWQgc3RhdGUgZnJvbSB0aGUgaGlnaGVyLW9yZGVyXG4gKiBjb21wb25lbnQgKGNsYXNzX2RlY29yYXRvcilcbiAqIEBwYXJhbSB7YXJyYXl9IGtleXMgVGhlIGtleXMgYm91bmQgdG8gdGhlIGRlY29yYXRlZCBtZXRob2RcbiAqIEByZXR1cm4ge2Jvb2xlYW59IFdoZXRoZXIgYWxsIHRlc3RzIGhhdmUgcGFzc2VkXG4gKi9cbmZ1bmN0aW9uIF9zaG91bGRUcmlnZ2VyKF9yZWYsIGtleWRvd25OZXh0KSB7XG4gIHZhciBrZXlkb3duVGhpcyA9IF9yZWYua2V5ZG93bjtcblxuICByZXR1cm4ga2V5ZG93bk5leHQgJiYga2V5ZG93bk5leHQuZXZlbnQgJiYgIWtleWRvd25UaGlzLmV2ZW50O1xufVxuXG4vKipcbiAqIG1ldGhvZFdyYXBwZXJTY29wZWRcbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtvYmplY3R9IGFyZ3MgQWxsIGFyZ3MgbmVjZXNzYXJ5IGZvciBkZWNvcmF0aW5nIHRoZSBtZXRob2RcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmdzLnRhcmdldCBUaGUgZGVjb3JhdGVkIG1ldGhvZCdzIGNsYXNzIG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3MuZGVzY3JpcHRvciBUaGUgbWV0aG9kJ3MgZGVzY3JpcHRvciBvYmplY3RcbiAqIEBwYXJhbSB7YXJyYXl9IGFyZ3Mua2V5cyBUaGUga2V5IGNvZGVzIGJvdW5kIHRvIHRoZSBkZWNvcmF0ZWQgbWV0aG9kXG4gKiBAcmV0dXJuIHtvYmplY3R9IFRoZSBtZXRob2QncyBkZXNjcmlwdG9yIG9iamVjdFxuICovXG5mdW5jdGlvbiBtZXRob2RXcmFwcGVyU2NvcGVkKF9yZWYyKSB7XG4gIHZhciB0YXJnZXQgPSBfcmVmMi50YXJnZXQsXG4gICAgICBkZXNjcmlwdG9yID0gX3JlZjIuZGVzY3JpcHRvcixcbiAgICAgIGtleXMgPSBfcmVmMi5rZXlzO1xuICB2YXIgY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyA9IHRhcmdldC5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzO1xuXG4gIHZhciBmbiA9IGRlc2NyaXB0b3IudmFsdWU7XG4gIGlmICgha2V5cykge1xuICAgIGNvbnNvbGUud2FybihmbiArICc6IGtleWRvd25TY29wZWQgcmVxdWlyZXMgb25lIG9yIG1vcmUga2V5cycpO1xuICB9IGVsc2Uge1xuICAgIHZhciBrZXlTZXRzID0gcGFyc2VLZXlzKGtleXMpO1xuXG4gICAgLy8gd3JhcCB0aGUgY29tcG9uZW50J3MgbGlmZWN5Y2xlIG1ldGhvZCB0byBpbnRlcmNlcHQga2V5IGNvZGVzIGNvbWluZyBkb3duXG4gICAgLy8gZnJvbSB0aGUgd3JhcHBlZC9zY29wZWQgY29tcG9uZW50IHVwIHRoZSB2aWV3IGhpZXJhcmNoeS4gaWYgbmV3IGtleWRvd25cbiAgICAvLyBldmVudCBoYXMgYXJyaXZlZCBhbmQgdGhlIGtleSBjb2RlcyBtYXRjaCB3aGF0IHdhcyBzcGVjaWZpZWQgaW4gdGhlXG4gICAgLy8gZGVjb3JhdG9yLCBjYWxsIHRoZSB3cmFwcGVkIG1ldGhvZC5cbiAgICB0YXJnZXQuY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyA9IGZ1bmN0aW9uIChuZXh0UHJvcHMpIHtcbiAgICAgIHZhciBrZXlkb3duID0gbmV4dFByb3BzLmtleWRvd247XG5cbiAgICAgIGlmIChfc2hvdWxkVHJpZ2dlcih0aGlzLnByb3BzLCBrZXlkb3duKSkge1xuICAgICAgICBpZiAoa2V5U2V0cy5zb21lKGZ1bmN0aW9uIChrZXlTZXQpIHtcbiAgICAgICAgICByZXR1cm4gbWF0Y2hLZXlzKHsga2V5U2V0OiBrZXlTZXQsIGV2ZW50OiBrZXlkb3duLmV2ZW50IH0pO1xuICAgICAgICB9KSkge1xuICAgICAgICAgIHJldHVybiBmbi5jYWxsKHRoaXMsIGtleWRvd24uZXZlbnQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbiA+IDEgPyBfbGVuIC0gMSA6IDApLCBfa2V5ID0gMTsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgICBhcmdzW19rZXkgLSAxXSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMpIHJldHVybiBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzLmNhbGwuYXBwbHkoY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcywgW3RoaXMsIG5leHRQcm9wc10uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGRlc2NyaXB0b3I7XG59XG5cbmV4cG9ydCBkZWZhdWx0IG1ldGhvZFdyYXBwZXJTY29wZWQ7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvZGVjb3JhdG9ycy9tZXRob2RfZGVjb3JhdG9yX3Njb3BlZC5qc1xuLy8gbW9kdWxlIGlkID0gNTY3XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIHBvbHlmaWxsIGFycmF5LmZyb20gKG1haW5seSBmb3IgSUUpXG5pbXBvcnQgJy4vbGliL2FycmF5LmZyb20nO1xuXG4vLyBAa2V5ZG93biBhbmQgQGtleWRvd25TY29wZWRcbmV4cG9ydCB7IGRlZmF1bHQsIGtleWRvd25TY29wZWQgfSBmcm9tICcuL2RlY29yYXRvcnMnO1xuXG4vLyBzZXRCaW5kaW5nIC0gb25seSB1c2VmdWwgaWYgeW91J3JlIG5vdCBnb2luZyB0byB1c2UgZGVjb3JhdG9yc1xuZXhwb3J0IHsgc2V0QmluZGluZyB9IGZyb20gJy4vc3RvcmUnO1xuXG4vLyBLZXlzIC0gdXNlIHRoaXMgdG8gZmluZCBrZXkgY29kZXMgZm9yIHN0cmluZ3MuIGZvciBleGFtcGxlOiBLZXlzLmosIEtleXMuZW50ZXJcbmV4cG9ydCB7IGRlZmF1bHQgYXMgS2V5cyB9IGZyb20gJy4vbGliL2tleXMnO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2luZGV4LmpzXG4vLyBtb2R1bGUgaWQgPSA1Njhcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLy8gUHJvZHVjdGlvbiBzdGVwcyBvZiBFQ01BLTI2MiwgRWRpdGlvbiA2LCAyMi4xLjIuMVxuLy8gU2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L2Zyb21cbmlmICghQXJyYXkuZnJvbSkge1xuICBBcnJheS5mcm9tID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG4gICAgdmFyIGlzQ2FsbGFibGUgPSBmdW5jdGlvbiBpc0NhbGxhYmxlKGZuKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIGZuID09PSAnZnVuY3Rpb24nIHx8IHRvU3RyLmNhbGwoZm4pID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICAgIH07XG4gICAgdmFyIHRvSW50ZWdlciA9IGZ1bmN0aW9uIHRvSW50ZWdlcih2YWx1ZSkge1xuICAgICAgdmFyIG51bWJlciA9IE51bWJlcih2YWx1ZSk7XG4gICAgICBpZiAoaXNOYU4obnVtYmVyKSkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICAgIGlmIChudW1iZXIgPT09IDAgfHwgIWlzRmluaXRlKG51bWJlcikpIHtcbiAgICAgICAgcmV0dXJuIG51bWJlcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiAobnVtYmVyID4gMCA/IDEgOiAtMSkgKiBNYXRoLmZsb29yKE1hdGguYWJzKG51bWJlcikpO1xuICAgIH07XG4gICAgdmFyIG1heFNhZmVJbnRlZ2VyID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcbiAgICB2YXIgdG9MZW5ndGggPSBmdW5jdGlvbiB0b0xlbmd0aCh2YWx1ZSkge1xuICAgICAgdmFyIGxlbiA9IHRvSW50ZWdlcih2YWx1ZSk7XG4gICAgICByZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgobGVuLCAwKSwgbWF4U2FmZUludGVnZXIpO1xuICAgIH07XG5cbiAgICAvLyBUaGUgbGVuZ3RoIHByb3BlcnR5IG9mIHRoZSBmcm9tIG1ldGhvZCBpcyAxLlxuICAgIHJldHVybiBmdW5jdGlvbiBmcm9tKGFycmF5TGlrZSAvKiwgbWFwRm4sIHRoaXNBcmcgKi8pIHtcbiAgICAgIC8vIDEuIExldCBDIGJlIHRoZSB0aGlzIHZhbHVlLlxuICAgICAgdmFyIEMgPSB0aGlzO1xuXG4gICAgICAvLyAyLiBMZXQgaXRlbXMgYmUgVG9PYmplY3QoYXJyYXlMaWtlKS5cbiAgICAgIHZhciBpdGVtcyA9IE9iamVjdChhcnJheUxpa2UpO1xuXG4gICAgICAvLyAzLiBSZXR1cm5JZkFicnVwdChpdGVtcykuXG4gICAgICBpZiAoYXJyYXlMaWtlID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkFycmF5LmZyb20gcmVxdWlyZXMgYW4gYXJyYXktbGlrZSBvYmplY3QgLSBub3QgbnVsbCBvciB1bmRlZmluZWRcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIDQuIElmIG1hcGZuIGlzIHVuZGVmaW5lZCwgdGhlbiBsZXQgbWFwcGluZyBiZSBmYWxzZS5cbiAgICAgIHZhciBtYXBGbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdm9pZCB1bmRlZmluZWQ7XG4gICAgICB2YXIgVDtcbiAgICAgIGlmICh0eXBlb2YgbWFwRm4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIDUuIGVsc2VcbiAgICAgICAgLy8gNS4gYSBJZiBJc0NhbGxhYmxlKG1hcGZuKSBpcyBmYWxzZSwgdGhyb3cgYSBUeXBlRXJyb3IgZXhjZXB0aW9uLlxuICAgICAgICBpZiAoIWlzQ2FsbGFibGUobWFwRm4pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkuZnJvbTogd2hlbiBwcm92aWRlZCwgdGhlIHNlY29uZCBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDUuIGIuIElmIHRoaXNBcmcgd2FzIHN1cHBsaWVkLCBsZXQgVCBiZSB0aGlzQXJnOyBlbHNlIGxldCBUIGJlIHVuZGVmaW5lZC5cbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgVCA9IGFyZ3VtZW50c1syXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyAxMC4gTGV0IGxlblZhbHVlIGJlIEdldChpdGVtcywgXCJsZW5ndGhcIikuXG4gICAgICAvLyAxMS4gTGV0IGxlbiBiZSBUb0xlbmd0aChsZW5WYWx1ZSkuXG4gICAgICB2YXIgbGVuID0gdG9MZW5ndGgoaXRlbXMubGVuZ3RoKTtcblxuICAgICAgLy8gMTMuIElmIElzQ29uc3RydWN0b3IoQykgaXMgdHJ1ZSwgdGhlblxuICAgICAgLy8gMTMuIGEuIExldCBBIGJlIHRoZSByZXN1bHQgb2YgY2FsbGluZyB0aGUgW1tDb25zdHJ1Y3RdXSBpbnRlcm5hbCBtZXRob2QgXG4gICAgICAvLyBvZiBDIHdpdGggYW4gYXJndW1lbnQgbGlzdCBjb250YWluaW5nIHRoZSBzaW5nbGUgaXRlbSBsZW4uXG4gICAgICAvLyAxNC4gYS4gRWxzZSwgTGV0IEEgYmUgQXJyYXlDcmVhdGUobGVuKS5cbiAgICAgIHZhciBBID0gaXNDYWxsYWJsZShDKSA/IE9iamVjdChuZXcgQyhsZW4pKSA6IG5ldyBBcnJheShsZW4pO1xuXG4gICAgICAvLyAxNi4gTGV0IGsgYmUgMC5cbiAgICAgIHZhciBrID0gMDtcbiAgICAgIC8vIDE3LiBSZXBlYXQsIHdoaWxlIGsgPCBsZW7igKYgKGFsc28gc3RlcHMgYSAtIGgpXG4gICAgICB2YXIga1ZhbHVlO1xuICAgICAgd2hpbGUgKGsgPCBsZW4pIHtcbiAgICAgICAga1ZhbHVlID0gaXRlbXNba107XG4gICAgICAgIGlmIChtYXBGbikge1xuICAgICAgICAgIEFba10gPSB0eXBlb2YgVCA9PT0gJ3VuZGVmaW5lZCcgPyBtYXBGbihrVmFsdWUsIGspIDogbWFwRm4uY2FsbChULCBrVmFsdWUsIGspO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIEFba10gPSBrVmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgayArPSAxO1xuICAgICAgfVxuICAgICAgLy8gMTguIExldCBwdXRTdGF0dXMgYmUgUHV0KEEsIFwibGVuZ3RoXCIsIGxlbiwgdHJ1ZSkuXG4gICAgICBBLmxlbmd0aCA9IGxlbjtcbiAgICAgIC8vIDIwLiBSZXR1cm4gQS5cbiAgICAgIHJldHVybiBBO1xuICAgIH07XG4gIH0oKTtcbn1cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcmVhY3Qta2V5ZG93bi9lcy9saWIvYXJyYXkuZnJvbS5qc1xuLy8gbW9kdWxlIGlkID0gNTY5XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQG1vZHVsZSBkb21IZWxwZXJzXG4gKlxuICovXG5pbXBvcnQgUmVhY3RET00gZnJvbSAncmVhY3QtZG9tJztcblxudmFyIGZvY3VzYWJsZVNlbGVjdG9yID0gJ2FbaHJlZl0sIGJ1dHRvbiwgaW5wdXQsIG9iamVjdCwgc2VsZWN0LCB0ZXh0YXJlYSwgW3RhYmluZGV4XSc7XG5cbi8qKlxuICogYmluZEZvY3VzYWJsZXM6IEZpbmQgYW55IGZvY3VzYWJsZSBjaGlsZCBlbGVtZW50cyBvZiB0aGUgY29tcG9uZW50IGluc3RhbmNlIGFuZFxuICogYWRkIGFuIG9uRm9jdXMgaGFuZGxlciB0byBmb2N1cyBvdXIga2V5ZG93biBoYW5kbGVycyBvbiB0aGUgcGFyZW50IGNvbXBvbmVudFxuICogd2hlbiB1c2VyIGtleXMgYXBwbGllcyBmb2N1cyB0byB0aGUgZWxlbWVudC5cbiAqXG4gKiBOT1RFOiBPbmUgbGltaXRhdGlvbiBvZiB0aGlzIHJpZ2h0IG5vdyBpcyB0aGF0IGlmIHlvdSB0YWIgb3V0IG9mIHRoZVxuICogY29tcG9uZW50LCBfZm9jdXNlZEluc3RhbmNlIHdpbGwgc3RpbGwgYmUgc2V0IHVudGlsIG5leHQgY2xpY2sgb3IgbW91bnQgb3JcbiAqIGNvbnRyb2xsZWQgZm9jdXMuXG4gKlxuICogQGFjY2VzcyBwdWJsaWNcbiAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSBUaGUga2V5LWJvdW5kIGNvbXBvbmVudCBpbnN0YW5jZVxuICogQHBhcmFtIHtjYWxsYmFja30gYWN0aXZhdGVPbkZvY3VzIFRoZSBmbiB0byBmaXJlIHdoZW4gZWxlbWVudCBpcyBmb2N1c2VkXG4gKi9cbmZ1bmN0aW9uIGJpbmRGb2N1c2FibGVzKGluc3RhbmNlLCBhY3RpdmF0ZU9uRm9jdXMpIHtcbiAgaWYgKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwpIHtcbiAgICB2YXIgbm9kZSA9IFJlYWN0RE9NLmZpbmRET01Ob2RlKGluc3RhbmNlKTtcbiAgICBpZiAobm9kZSkge1xuICAgICAgdmFyIGZvY3VzYWJsZXMgPSBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoZm9jdXNhYmxlU2VsZWN0b3IpO1xuICAgICAgaWYgKGZvY3VzYWJsZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBvbkZvY3VzID0gZnVuY3Rpb24gb25Gb2N1cyhlbGVtZW50KSB7XG4gICAgICAgICAgdmFyIG9uRm9jdXNQcmV2ID0gZWxlbWVudC5vbmZvY3VzO1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGFjdGl2YXRlT25Gb2N1cyhpbnN0YW5jZSk7XG4gICAgICAgICAgICBpZiAob25Gb2N1c1ByZXYpIG9uRm9jdXNQcmV2LmNhbGwoZWxlbWVudCwgZXZlbnQpO1xuICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZvY3VzYWJsZXMpLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm4gZWxlbWVudC5vbmZvY3VzID0gb25Gb2N1cyhlbGVtZW50KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogZmluZENvbnRhaW5lck5vZGVzOiBDYWxsZWQgYnkgb3VyIGNsaWNrIGhhbmRsZXIgdG8gZmluZCBpbnN0YW5jZXMgd2l0aCBub2Rlc1xuICogdGhhdCBhcmUgZXF1YWwgdG8gb3IgdGhhdCBjb250YWluIHRoZSBjbGljayB0YXJnZXQuIEFueSB0aGF0IHBhc3MgdGhpcyB0ZXN0XG4gKiB3aWxsIGJlIHJlY2lwaWVudHMgb2YgdGhlIG5leHQga2V5ZG93biBldmVudC5cbiAqXG4gKiBAYWNjZXNzIHB1YmxpY1xuICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBUaGUgY2xpY2sgZXZlbnQudGFyZ2V0IERPTSBlbGVtZW50XG4gKiBAcmV0dXJuIHtmdW5jdGlvbn0gUmVkdWNlciBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBmaW5kQ29udGFpbmVyTm9kZXModGFyZ2V0KSB7XG4gIHJldHVybiBmdW5jdGlvbiAobWVtbywgaW5zdGFuY2UpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIG5vZGUgPSBSZWFjdERPTS5maW5kRE9NTm9kZShpbnN0YW5jZSk7XG4gICAgICBpZiAobm9kZSAmJiAobm9kZSA9PT0gdGFyZ2V0IHx8IG5vZGUuY29udGFpbnModGFyZ2V0KSkpIHtcbiAgICAgICAgbWVtby5wdXNoKHsgaW5zdGFuY2U6IGluc3RhbmNlLCBub2RlOiBub2RlIH0pO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogc29ydEJ5RE9NUG9zaXRpb246IENhbGxlZCBieSBvdXIgY2xpY2sgaGFuZGxlciB0byBzb3J0IGEgbGlzdCBvZiBpbnN0YW5jZXNcbiAqIGFjY29yZGluZyB0byBsZWFzdCAtPiBtb3N0IG5lc3RlZC4gVGhpcyBpcyBzbyB0aGF0IGlmIG11bHRpcGxlIGtleWJvdW5kXG4gKiBpbnN0YW5jZXMgaGF2ZSBub2RlcyB0aGF0IGFyZSBhbmNlc3RvcnMgb2YgdGhlIGNsaWNrIHRhcmdldCwgdGhleSB3aWxsIGJlXG4gKiBzb3J0ZWQgdG8gbGV0IHRoZSBpbnN0YW5jZSBjbG9zZXN0IHRvIHRoZSBjbGljayB0YXJnZXQgZ2V0IGZpcnN0IGRpYnMgb24gdGhlXG4gKiBuZXh0IGtleSBkb3duIGV2ZW50LlxuICovXG5mdW5jdGlvbiBzb3J0QnlET01Qb3NpdGlvbihhLCBiKSB7XG4gIHJldHVybiBhLm5vZGUuY29tcGFyZURvY3VtZW50UG9zaXRpb24oYi5ub2RlKSA9PT0gMTAgPyAxIDogLTE7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHsgYmluZEZvY3VzYWJsZXM6IGJpbmRGb2N1c2FibGVzLCBmaW5kQ29udGFpbmVyTm9kZXM6IGZpbmRDb250YWluZXJOb2Rlcywgc29ydEJ5RE9NUG9zaXRpb246IHNvcnRCeURPTVBvc2l0aW9uIH07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3JlYWN0LWtleWRvd24vZXMvbGliL2RvbV9oZWxwZXJzLmpzXG4vLyBtb2R1bGUgaWQgPSA1NzBcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBAbW9kdWxlIExpc3RlbmVyc1xuICpcbiAqL1xuXG4vLyBmbGFnIGZvciB3aGV0aGVyIGNsaWNrIGxpc3RlbmVyIGhhcyBiZWVuIGJvdW5kIHRvIGRvY3VtZW50XG52YXIgX2NsaWNrc0JvdW5kID0gZmFsc2U7XG5cbi8vIGZsYWcgZm9yIHdoZXRoZXIga2V5ZG93biBsaXN0ZW5lciBoYXMgYmVlbiBib3VuZCB0byBkb2N1bWVudFxudmFyIF9rZXlzQm91bmQgPSBmYWxzZTtcblxudmFyIExpc3RlbmVycyA9IHtcbiAgLyoqXG4gICAqIF9iaW5kS2V5c1xuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKi9cbiAgYmluZEtleXM6IGZ1bmN0aW9uIGJpbmRLZXlzKGNhbGxiYWNrKSB7XG4gICAgaWYgKCFfa2V5c0JvdW5kKSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgY2FsbGJhY2spO1xuICAgICAgX2tleXNCb3VuZCA9IHRydWU7XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIHVuYmluZEtleXNcbiAgICpcbiAgICogQGFjY2VzcyBwdWJsaWNcbiAgICovXG4gIHVuYmluZEtleXM6IGZ1bmN0aW9uIHVuYmluZEtleXMoY2FsbGJhY2spIHtcbiAgICBpZiAoX2tleXNCb3VuZCkge1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGNhbGxiYWNrKTtcbiAgICAgIF9rZXlzQm91bmQgPSBmYWxzZTtcbiAgICB9XG4gIH0sXG5cblxuICAvKipcbiAgICogYmluZENsaWNrc1xuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKi9cbiAgYmluZENsaWNrczogZnVuY3Rpb24gYmluZENsaWNrcyhjYWxsYmFjaykge1xuICAgIGlmICghX2NsaWNrc0JvdW5kKSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNhbGxiYWNrKTtcbiAgICAgIF9jbGlja3NCb3VuZCA9IHRydWU7XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIHVuYmluZENsaWNrc1xuICAgKlxuICAgKiBAYWNjZXNzIHB1YmxpY1xuICAgKi9cbiAgdW5iaW5kQ2xpY2tzOiBmdW5jdGlvbiB1bmJpbmRDbGlja3MoY2FsbGJhY2spIHtcbiAgICBpZiAoX2NsaWNrc0JvdW5kKSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGNhbGxiYWNrKTtcbiAgICAgIF9jbGlja3NCb3VuZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgTGlzdGVuZXJzO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi9saXN0ZW5lcnMuanNcbi8vIG1vZHVsZSBpZCA9IDU3MVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBDb3VudGVyIGJlaW5nIGluY3JlbWVudGVkLiBKUyBpcyBzaW5nbGUtdGhyZWFkZWQsIHNvIGl0J2xsIEp1c3QgV29ya+KEoi5cbnZhciBfX2NvdW50ZXIgPSAxO1xuXG4vKipcbiAqIFJldHVybnMgYSBwcm9jZXNzLXdpZGUgdW5pcXVlIGlkZW50aWZpZXIuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHV1aWQoKSB7XG4gIHJldHVybiBcInVpZC1cIiArIF9fY291bnRlcisrO1xufVxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9yZWFjdC1rZXlkb3duL2VzL2xpYi91dWlkLmpzXG4vLyBtb2R1bGUgaWQgPSA1NzJcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiaW1wb3J0IHsgZGVmaW5lTWVtb2l6ZWQgfSBmcm9tIFwiLi9tZW1vaXplLmpzXCI7XG5pbXBvcnQgUGFyc2VyIGZyb20gXCIuL1BhcnNlci5qc1wiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4vUnVsZS5qc1wiO1xuXG4vLyByZS1leHBvcnQgUnVsZSBmb3IgdGVzdGluZ1xuZXhwb3J0IGRlZmF1bHQgUnVsZTtcblxuLy9cbi8vXHQjIFBhcnNpbmcgYHJ1bGVTeW50YXhgIHRvIGNyZWF0ZSBydWxlcyBhdXRvbWF0aWNhbGx5LlxuLy9cbi8vIFRPRE86XHRQdWxsIGBwYXJzZVJ1bGVTeW50YXhgIHN0dWZmIG91dCBpbnRvIHNlcGFyYXRlIG1vZHVsZT9cbi8vIFRPRE86XHRCZXR0ZXIgbmFtZSBmb3IgYHJ1bGVTeW50YXhgXG4vLyBUT0RPOlx0VXNlIGtleXdvcmRzIGluIHN5bnRheCB0byBtYWtlIGEgcXVpY2sgcmVnZXgtYmFzZWQgYHRlc3RgIGZ1bmN0aW9uIGZvciB0aGUgZW50aXJlIHJ1bGVcbk9iamVjdC5hc3NpZ24oUnVsZSwge1xuXG4vL1xuLy8gIyMgZ3JvdXA6IHBhcnNpbmcgc3ludGF4XG4vL1xuXG5cdHBhcnNlUnVsZVN5bnRheChzeW50YXgsIFNlcXVlbmNlQ29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlKSB7XG5cdFx0bGV0IHN5bnRheFN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHN5bnRheCk7XG5cdFx0bGV0IHJ1bGVzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHN5bnRheFN0cmVhbSwgW10pO1xuXG5cdFx0bGV0IHJ1bGU7XG5cdFx0Ly8gSWYgd2Ugb25seSBnb3Qgb25lIHRoaW5nLCByZXR1cm4gdGhhdCBhcyB0aGUgcmVzdWx0XG5cdFx0aWYgKHJ1bGVzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0cnVsZSA9IHJ1bGVzWzBdO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHJ1bGUgPSBuZXcgU2VxdWVuY2VDb25zdHJ1Y3Rvcih7IHJ1bGVzIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBydWxlO1xuXHR9LFxuXG5cdHRva2VuaXNlUnVsZVN5bnRheChzeW50YXgpIHtcblx0XHRjb25zdCBTWU5UQVhfRVhQUkVTU0lPTiA9IC8oPzpbXFx3XFwtXSt8XFxcXFtcXFtcXChcXHtcXClcXH1cXF1dfFteXFxzXFx3XXxcXHwpL2c7XG5cdFx0bGV0IHN5bnRheFN0cmVhbSA9IHN5bnRheC5tYXRjaChTWU5UQVhfRVhQUkVTU0lPTik7XG5cdFx0aWYgKCFzeW50YXhTdHJlYW0pIHRocm93IG5ldyBTeW50YXhFcnJvcihgQ2FuJ3QgdG9rZW5pemUgcGFyc2UgcnVsZSBzeW50YXggPj4ke3N5bnRheH08PGApO1xuXHRcdHJldHVybiBzeW50YXhTdHJlYW07XG5cdH0sXG5cblx0cGFyc2VSdWxlU3ludGF4X3Rva2VucyhzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0ID0gMCkge1xuXHRcdGxldCBsYXN0SW5kZXggPSBzeW50YXhTdHJlYW0ubGVuZ3RoO1xuXHRcdHdoaWxlIChzdGFydCA8IGxhc3RJbmRleCkge1xuXHRcdFx0bGV0IFsgcnVsZSwgZW5kIF0gPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydCk7XG5cdFx0XHRpZiAocnVsZSkge1xuXHRcdFx0XHRsZXQgbGFzdCA9IHJ1bGVzW3J1bGVzLmxlbmd0aC0xXTtcblx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGBTeW1ib2xgIGFuZCBsYXN0IHdhcyBhIGBTeW1ib2xgLCBtZXJnZSB0b2dldGhlclxuIFx0XHRcdFx0aWYgKGxhc3QgJiYgbGFzdCBpbnN0YW5jZW9mIFJ1bGUuU3ltYm9sICYmIHJ1bGUgaW5zdGFuY2VvZiBSdWxlLlN5bWJvbCkge1xuIFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGxhc3QgcnVsZVxuIFx0XHRcdFx0XHRydWxlcy5wb3AoKTtcbiBcdFx0XHRcdFx0Ly8gYW5kIHJlcGxhY2Ugd2l0aCBhIHJ1bGUgdGhhdCBtZXJnZXMgdGhlIGtleXdvcmRzXG4gXHRcdFx0XHRcdHJ1bGUubWF0Y2ggPSBsYXN0Lm1hdGNoLmNvbmNhdChydWxlLm1hdGNoKTtcbiBcdFx0XHRcdH1cblx0XHRcdFx0cnVsZXMucHVzaChydWxlKTtcblx0XHRcdH1cblx0XHRcdHN0YXJ0ID0gZW5kICsgMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJ1bGVzO1xuXHR9LFxuXG5cdHBhcnNlUnVsZVN5bnRheF90b2tlbihzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0ID0gMCkge1xuXHRcdGxldCBzeW50YXhUb2tlbiA9IHN5bnRheFN0cmVhbVtzdGFydF07XG5cblx0XHQvLyBpZiB3ZSBnb3QgYSBcIlxcXFxcIiAod2hpY2ggYWxzbyBoYXMgdG8gZ28gaW50byB0aGUgc291cmNlIHN0cmluZyBhcyBcIlxcXFxcIilcblx0XHQvLyB0cmVhdCB0aGUgbmV4dCB0b2tlbiBhcyBhIGxpdGVyYWwgc3RyaW5nIHJhdGhlciB0aGFuIGFzIGEgc3BlY2lhbCBjaGFyYWN0ZXIuXG5cdFx0aWYgKHN5bnRheFRva2VuID09PSBcIlxcXFxcIikge1xuXHRcdFx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3N5bWJvbChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydCArIDEpO1xuXHRcdH1cblxuXHRcdHN3aXRjaCAoc3ludGF4VG9rZW4pIHtcblx0XHRcdGNhc2UgXCJ7XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3VicnVsZShzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydCk7XG5cdFx0XHRjYXNlIFwiKFwiOlx0cmV0dXJuIFJ1bGUucGFyc2VSdWxlU3ludGF4X3BhcmVudGhlc2VzKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0KTtcblx0XHRcdGNhc2UgXCJbXCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfbGlzdChzeW50YXhTdHJlYW0sIHJ1bGVzLCBzdGFydCk7XG5cdFx0XHRjYXNlIFwiKlwiOlxuXHRcdFx0Y2FzZSBcIitcIjpcblx0XHRcdGNhc2UgXCI/XCI6XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfcmVwZWF0KHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0KTtcblxuXHRcdFx0Ly8gdGhlIGZvbGxvd2luZyBzaG91bGQgQUxXQVlTIGJlIGNvbnN1bWVkIGJ5IHRoZSBhYm92ZVxuXHRcdFx0Y2FzZSBcIn1cIjpcblx0XHRcdGNhc2UgXCIpXCI6XG5cdFx0XHRjYXNlIFwiXVwiOlxuXHRcdFx0Y2FzZSBcInxcIjpcblx0XHRcdFx0dGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkICR7c3ludGF4VG9rZW59IGZvdW5kIGFzIGl0ZW0gJHtzdGFydH0gb2YgJHt0aGlzLnN5bnRheH1gKTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0aWYgKHN5bnRheFRva2VuLm1hdGNoKFJ1bGUuS0VZV09SRF9QQVRURVJOKSkge1xuXHRcdFx0XHRcdHJldHVybiBSdWxlLnBhcnNlUnVsZVN5bnRheF9rZXl3b3JkKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gUnVsZS5wYXJzZVJ1bGVTeW50YXhfc3ltYm9sKHN5bnRheFN0cmVhbSwgcnVsZXMsIHN0YXJ0KTtcblx0XHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRLRVlXT1JEX1BBVFRFUk4gOiAvW0EtWmEtel1bXFx3Xy1dKi8sXG5cblx0Ly8gTWF0Y2ggYGtleXdvcmRgIGluIHN5bnRheCBydWxlcy5cblx0Ly8gSWYgbW9yZSB0aGFuIG9uZSBrZXl3b3JkIGFwcGVhcnMgaW4gYSByb3csIGNvbWJpbmVzIHRoZW0gaW50byBhIHNpbmdsZSBgS2V5d29yZGAgb2JqZWN0LlxuXHQvLyBUaGlzIGlzIHByZXR0eSBzYWZlLCB1bmxlc3MgeW91IGhhdmUgYW4gb3B0aW9uYWwga2V5d29yZCBsaWtlXG5cdC8vXHRcdGB0aGUge2lkZW50aWZpZXJ9IG9mIHRoZT8ge2V4cHJlc3Npb259YFxuXHQvLyBpbiB3aGljaCBjYXNlIHlvdSBjYW4gcHV0IHRoZSBvcHRpb25hbCBrZXl3b3JkIGluIHBhcmVuc1xuXHQvL1x0XHRgdGhlIHtpZGVudGlmaWVyfSBvZiAodGhlPykge2V4cHJlc3Npb259YFxuXHQvL1xuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydCA9IDAsIGNvbnN0cnVjdG9yKSB7XG5cdFx0bGV0IG1hdGNoID0gW10sIGVuZDtcbiBcdFx0Ly8gZWF0IGtleXdvcmRzIHdoaWxlIHRoZXkgbGFzdFxuXHRcdGZvciAodmFyIGkgPSBzdGFydDsgaSA8IHN5bnRheFN0cmVhbS5sZW5ndGg7IGkrKykge1xuXHRcdFx0bGV0IG5leHQgPSBzeW50YXhTdHJlYW1baV07XG5cdFx0XHRpZiAodHlwZW9mIG5leHQgPT09IFwic3RyaW5nXCIgJiYgbmV4dC5tYXRjaChSdWxlLktFWVdPUkRfUEFUVEVSTikpIHtcblx0XHRcdFx0bWF0Y2gucHVzaChuZXh0KTtcblx0XHRcdFx0ZW5kID0gaTtcblx0XHRcdH1cblx0XHRcdGVsc2UgYnJlYWs7XG5cdFx0fVxuXG5cdFx0aWYgKCFjb25zdHJ1Y3RvcikgY29uc3RydWN0b3IgPSBSdWxlLktleXdvcmQ7XG5cdFx0bGV0IHJ1bGUgPSBuZXcgY29uc3RydWN0b3IoeyBtYXRjaCB9KTtcblxuXHRcdHJldHVybiBbIHJ1bGUsIGVuZCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGBrZXl3b3JkYCBpbiBzeW50YXggcnVsZXMuXG5cdC8vIFJldHVybnMgYFsgcnVsZSwgZW5kIF1gXG5cdC8vIFRocm93cyBpZiBpbnZhbGlkLlxuXHRwYXJzZVJ1bGVTeW50YXhfc3ltYm9sKHN5bnRheFN0cmVhbSwgcnVsZXMgPSBbXSwgc3RhcnQgPSAwLCBjb25zdHJ1Y3RvciA9IFJ1bGUuU3ltYm9sKSB7XG5cdFx0bGV0IHN0cmluZyA9IHN5bnRheFN0cmVhbVtzdGFydF07XG5cblx0XHRpZiAoIWNvbnN0cnVjdG9yKSBjb25zdHJ1Y3RvciA9IFJ1bGUuU3ltYm9sO1xuXG5cdFx0Ly8gSWYgc3RyaW5nIHN0YXJ0cyB3aXRoIGBcXFxcYCwgaXQncyBhbiBlc2NhcGVkIGxpdGVyYWwgKGVnOiBgXFxbYCBuZWVkcyB0byBpbnB1dCBhcyBgXFxcXFtgKS5cblx0XHRsZXQgaXNFc2NhcGVkID0gc3RyaW5nLnN0YXJ0c1dpdGgoXCJcXFxcXCIpO1xuXHRcdGxldCBtYXRjaCA9IGlzRXNjYXBlZCA/IHN0cmluZy5zdWJzdHIoMSkgOiBzdHJpbmc7XG5cblx0XHRsZXQgcnVsZSA9IG5ldyBjb25zdHJ1Y3Rvcih7IG1hdGNoIH0pO1xuXG5cdFx0aWYgKGlzRXNjYXBlZCkge1xuXHRcdFx0cnVsZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gYFxcXFwke21hdGNofSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgcnVsZSwgc3RhcnQgXTtcblx0fSxcblxuXG5cdC8vIE1hdGNoIGdyb3VwaW5nIGV4cHJlc3Npb24gYCguLi58Li4uKWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZCBdYFxuXHQvLyBZb3UgY2FuIHNwZWNpZnkgYW4gZXhwbGljaXQgYHJ1bGUuYXJndW1lbnRgIHdpdGg6ICBgKHNvbWVhcmc6Li4uKWBcblx0Ly8gWW91IGNhbiBzcGVjaWZ5IHRoYXQgdGhlIHJlc3VsdHMgc2hvdWxkIGJlIGBwcm9tb3RlZGAgdG8gZW5jbG9zaW5nIGNvbnRleHQgd2l0aDogYCg/Oi4uLilgXG5cdC8vXG5cdC8vIE5PVEU6IG5lc3RlZCBwYXJlbnMgbWF5IG5vdCBoYXZlIGFsdGVybmF0aXZlcy4uLiA6LSggICBgKGF8KGJ8YykpYCB3b24ndCB3b3JrPz8/XG5cdHBhcnNlUnVsZVN5bnRheF9wYXJlbnRoZXNlcyhzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0ID0gMCkge1xuXHRcdGxldCB7IGVuZCwgc2xpY2UgfSA9IFBhcnNlci5maW5kTmVzdGVkVG9rZW5zKHN5bnRheFN0cmVhbSwgXCIoXCIsIFwiKVwiLCBzdGFydCk7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBcInByb21vdGVcIiBmbGFnOiBgPzpgXG5cdFx0bGV0IHByb21vdGUgPSAoc2xpY2VbMF0gPT09IFwiP1wiICYmIHNsaWNlWzFdID09PSBcIjpcIik7XG5cdFx0aWYgKHByb21vdGUpIHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cblx0XHQvLyBwdWxsIG91dCBleHBsaWNpdCBhcmd1bWVudCBuYW1lXG5cdFx0bGV0IGFyZ3VtZW50O1xuXHRcdGlmIChzbGljZS5sZW5ndGggPiAyICYmIHNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBzbGljZVswXTtcblx0XHRcdHNsaWNlID0gc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXG5cdFx0Ly8gc3BsaXQgaW50byBncm91cHMsIGluY2x1ZGluZyBuZXN0ZWQgcGFyZW5zXG5cdFx0bGV0IGFsdGVybmF0aXZlcyA9XG5cdFx0XHRncm91cEFsdGVybmF0aXZlcyhzbGljZSlcblx0XHRcdC5tYXAoZnVuY3Rpb24oZ3JvdXApIHtcblx0XHRcdFx0bGV0IHJlc3VsdHMgPSBSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoZ3JvdXAsIFtdKTtcblx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHNbMF07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSdWxlLlNlcXVlbmNlKHsgcnVsZXM6IHJlc3VsdHMgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0bGV0IHJ1bGUgPSBhbHRlcm5hdGl2ZXMubGVuZ3RoID09PSAxID8gYWx0ZXJuYXRpdmVzWzBdIDogbmV3IFJ1bGUuQWx0ZXJuYXRpdmVzKHsgcnVsZXM6IGFsdGVybmF0aXZlcyB9KTtcblx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRpZiAocHJvbW90ZSkgcnVsZS5wcm9tb3RlID0gdHJ1ZTtcblx0XHRyZXR1cm4gWyBydWxlLCBlbmQgXTtcblxuXHRcdGZ1bmN0aW9uIGdyb3VwQWx0ZXJuYXRpdmVzKHRva2Vucykge1xuXHRcdFx0bGV0IGFsdGVybmF0aXZlcyA9IFtdO1xuXHRcdFx0bGV0IGN1cnJlbnQgPSBbXTtcblx0XHRcdGZvciAobGV0IGkgPSAwLCB0b2tlbjsgdG9rZW4gPSB0b2tlbnNbaV07IGkrKykge1xuXHRcdFx0XHQvLyBoYW5kbGUgYWx0ZXJuYXRlIG1hcmtlclxuXHRcdFx0XHRpZiAodG9rZW4gPT09IFwifFwiKSB7XG5cdFx0XHRcdFx0YWx0ZXJuYXRpdmVzLnB1c2goY3VycmVudCk7XG5cdFx0XHRcdFx0Y3VycmVudCA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGhhbmRsZSBuZXN0ZWQgcGFyZW5zXG5cdFx0XHRcdGVsc2UgaWYgKHRva2VuID09PSBcIihcIikge1xuXHRcdFx0XHRcdGxldCB7IGVuZCB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnModG9rZW5zLCBcIihcIiwgXCIpXCIsIGkpO1xuXHRcdFx0XHRcdGN1cnJlbnQgPSBjdXJyZW50LmNvbmNhdCh0b2tlbnMuc2xpY2UoaSwgZW5kICsgMSkpO1xuXHRcdFx0XHRcdGkgPSBlbmQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3VycmVudC5wdXNoKHRva2VuKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKGN1cnJlbnQubGVuZ3RoKSBhbHRlcm5hdGl2ZXMucHVzaChjdXJyZW50KTtcblx0XHRcdHJldHVybiBhbHRlcm5hdGl2ZXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIE1hdGNoIHJlcGVhdCBpbmRpY2F0b3IgYD9gLCBgK2Agb3IgYCpgIGJ5IGF0dGFjaGluZyBpdCB0byB0aGUgcHJldmlvdXMgcnVsZS5cblx0cGFyc2VSdWxlU3ludGF4X3JlcGVhdChzeW50YXhTdHJlYW0sIHJ1bGVzID0gW10sIHN0YXJ0ID0gMCkge1xuXHRcdGxldCBzeW1ib2wgPSBzeW50YXhTdHJlYW1bc3RhcnRdO1xuXHRcdGxldCBydWxlID0gcnVsZXNbcnVsZXMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKCFydWxlKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IGF0dGFjaCByZXBlYXQgc3ltYm9sICR7c3ltYm9sfSB0byBlbXB0eSBydWxlIWApO1xuXG5cdFx0Ly8gVHJhbnNmb3JtIGxhc3QgcnVsZSBpbnRvIGEgcmVwZWF0IGZvciBgKmAgYW5kIGArYC5cblx0XHRpZiAoc3ltYm9sID09PSBcIipcIiB8fCBzeW1ib2wgPT09IFwiK1wiKSB7XG5cdFx0XHRsZXQgYXJndW1lbnQgPSBydWxlLmFyZ3VtZW50O1xuXHRcdFx0cnVsZSA9IG5ldyBSdWxlLlJlcGVhdCh7IHJ1bGUgfSk7XG5cdFx0XHRpZiAoYXJndW1lbnQpIHJ1bGUuYXJndW1lbnQgPSBhcmd1bWVudDtcblx0XHRcdC8vIHB1c2ggaW50byBydWxlIHN0YWNrIGluIHBsYWNlIG9mIG9sZCBydWxlXG5cdFx0XHRydWxlc1tydWxlcy5sZW5ndGggLSAxXSA9IHJ1bGU7XG5cdFx0fVxuXG5cdFx0Ly8gUnVsZSBpcyBvcHRpb25hbCBmb3IgYD9gIGFuZCBgKmAuXG5cdFx0aWYgKHN5bWJvbCA9PT0gXCI/XCIgfHwgc3ltYm9sID09PSBcIipcIikge1xuXHRcdFx0cnVsZS5vcHRpb25hbCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFsgdW5kZWZpbmVkLCBzdGFydCBdXG5cdH0sXG5cblx0Ly8gTWF0Y2ggYHs8cnVsZU5hbWU+fWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X3N1YnJ1bGUoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydCA9IDApIHtcblx0XHRsZXQgbWF0Y2ggPSBQYXJzZXIuZmluZE5lc3RlZFRva2VucyhzeW50YXhTdHJlYW0sIFwie1wiLCBcIn1cIiwgc3RhcnQpO1xuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAobWF0Y2guc2xpY2UubGVuZ3RoID09PSAzICYmIG1hdGNoLnNsaWNlWzFdID09PSBcIjpcIikge1xuXHRcdFx0YXJndW1lbnQgPSBtYXRjaC5zbGljZVswXTtcblx0XHRcdG1hdGNoLnNsaWNlID0gbWF0Y2guc2xpY2Uuc2xpY2UoMik7XG5cdFx0fVxuXHRcdGlmIChtYXRjaC5zbGljZS5sZW5ndGggPiAxKSB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYENhbid0IHByb2Nlc3MgcnVsZXMgd2l0aCBtb3JlIHRoYW4gb25lIHJ1bGUgbmFtZTogeyR7bWF0Y2guc2xpY2Uuam9pbihcIlwiKX19YCk7XG5cblx0XHRsZXQgcGFyYW1zID0geyBydWxlOiBtYXRjaC5zbGljZVswXSB9O1xuXG5cdFx0Ly8gc2VlIGlmIHRoZXJlJ3MgYSBgbm90YCBydWxlIGluIHRoZXJlXG5cdFx0bGV0IGJhbmdQb3NpdGlvbiA9IHBhcmFtcy5ydWxlLmluZGV4T2YoXCIhXCIpO1xuXHRcdGlmIChiYW5nUG9zaXRpb24gIT09IC0xKSB7XG5cdFx0XHRwYXJhbXMubm90ID0gcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpOyAvL1sgcGFyYW1zLnJ1bGUuc3Vic3RyKGJhbmdQb3NpdGlvbiArIDEpIF07XG5cdFx0XHRwYXJhbXMucnVsZSA9IHBhcmFtcy5ydWxlLnN1YnN0cigwLCBiYW5nUG9zaXRpb24pO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gbmV3IFJ1bGUuU3VicnVsZShwYXJhbXMpO1xuXHRcdGlmIChhcmd1bWVudCkgcnVsZS5hcmd1bWVudCA9IGFyZ3VtZW50O1xuXHRcdHJldHVybiBbIHJ1bGUsIG1hdGNoLmVuZCBdO1xuXHR9LFxuXG5cdC8vIE1hdGNoIGxpc3QgZXhwcmVzc2lvbiBgWzxpdGVtPjxkZWxpbWl0ZXI+XWAgaW4gc3ludGF4IHJ1bGVzLlxuXHQvLyBSZXR1cm5zIGBbIHJ1bGUsIGVuZCBdYFxuXHQvLyBUaHJvd3MgaWYgaW52YWxpZC5cblx0cGFyc2VSdWxlU3ludGF4X2xpc3Qoc3ludGF4U3RyZWFtLCBydWxlcyA9IFtdLCBzdGFydCA9IDAsIGNvbnN0cnVjdG9yID0gUnVsZS5MaXN0KSB7XG5cdFx0bGV0IHsgZW5kLCBzbGljZSB9ID0gUGFyc2VyLmZpbmROZXN0ZWRUb2tlbnMoc3ludGF4U3RyZWFtLCBcIltcIiwgXCJdXCIsIHN0YXJ0KTtcblxuXHRcdGxldCBhcmd1bWVudDtcblx0XHRpZiAoc2xpY2UubGVuZ3RoID4gMiAmJiBzbGljZVsxXSA9PT0gXCI6XCIpIHtcblx0XHRcdGFyZ3VtZW50ID0gc2xpY2VbMF07XG5cdFx0XHRzbGljZSA9IHNsaWNlLnNsaWNlKDIpO1xuXHRcdH1cblxuXHRcdGxldCByZXN1bHRzID0gUnVsZS5wYXJzZVJ1bGVTeW50YXhfdG9rZW5zKHNsaWNlLCBbXSk7XG5cdFx0aWYgKHJlc3VsdHMubGVuZ3RoICE9PSAyKSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFVuZXhwZWN0ZWQgc3R1ZmYgYXQgZW5kIG9mIGxpc3Q6IFske3NsaWNlLmpvaW4oXCIgXCIpfV1gKTtcblx0XHR9XG5cdFx0bGV0IFsgaXRlbSwgZGVsaW1pdGVyIF0gPSByZXN1bHRzO1xuXG5cdFx0bGV0IHJ1bGUgPSBuZXcgY29uc3RydWN0b3IoeyBpdGVtLCBkZWxpbWl0ZXIgfSk7XG5cdFx0aWYgKGFyZ3VtZW50KSBydWxlLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG5cdFx0cmV0dXJuIFsgcnVsZSwgZW5kIF07XG5cdH0sXG5cbn0pO1xuXG5cblxuLy8gIyMgIEFkZCBtZXRob2RzIHRvIFBhcnNlciB0byBkZWZpbmUgcnVsZXMgdXNpbmcgdGhlIGFib3ZlIHN5bnRheC5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFBhcnNlci5wcm90b3R5cGUsIHtcblxuXHQvLyBQYXJzZSBhIGBydWxlU3ludGF4YCBydWxlIGFuZCBhZGQgaXQgdG8gb3VyIGxpc3Qgb2YgcnVsZXMuXG5cdC8vIFJldHVybnMgdGhlIG5ldyBydWxlLlxuXHQvLyBMb2dzIHBhcnNpbmcgZXJyb3JzIGJ1dCBhbGxvd3MgdGhpbmdzIHRvIGNvbnRpbnVlLlxuXHRhZGRTZXF1ZW5jZTogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLlNlcXVlbmNlLCBwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gQWRkIGEgYnVuY2ggb2Ygc3ludGF4ZXMgYXQgb25jZSBpZiB3ZSBnb3QgYW4gYXJyYXkgb2Ygc3ludGF4ZXNcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSlcblx0XHRcdHJldHVybiBydWxlU3ludGF4Lm1hcChzeW50YXggPT4gdGhpcy5hZGRTZXF1ZW5jZShuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSlbMF07XG5cblx0XHRpZiAodHlwZW9mIGNvbnN0cnVjdG9yICE9PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHByb3BlcnRpZXMgPSBjb25zdHJ1Y3Rvcjtcblx0XHRcdGNvbnN0cnVjdG9yID0gUnVsZS5TZXF1ZW5jZTtcblx0XHR9XG5cdFx0dHJ5IHtcblx0XHRcdGxldCBydWxlID0gUnVsZS5wYXJzZVJ1bGVTeW50YXgocnVsZVN5bnRheCwgY29uc3RydWN0b3IpO1xuXHRcdFx0Ly8gUmVmbGVjdCB0aGUgcnVsZSBiYWNrIG91dCB0byBtYWtlIHN1cmUgaXQgbG9va3MgKG1vcmUgb3IgbGVzcykgdGhlIHNhbWVcblx0XHRcdGlmIChQYXJzZXIuREVCVUcpIGNvbnNvbGUubG9nKGBBZGRlZCBydWxlICcke25hbWV9JzpcXG4gIElOUFVUOiAke3J1bGVTeW50YXh9IFxcbiBPVVRQVVQ6ICR7cnVsZX1gKTtcblxuLy9jb25zb2xlLmluZm8obmFtZSwgY29uc3RydWN0b3IsIHJ1bGUpO1xuXHRcdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRSdWxlKG5hbWUsIHJ1bGUpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZ3JvdXAoYEVycm9yIHBhcnNpbmcgc3ludGF4IGZvciBydWxlICcke25hbWV9JzpgKTtcblx0XHRcdGNvbnNvbGUubG9nKGBzeW50YXg6ICR7cnVsZVN5bnRheH1gKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZSk7XG5cdFx0fVxuXHR9fSxcblxuXHRhZGRTdGF0ZW1lbnQ6IHsgdmFsdWU6IGZ1bmN0aW9uKG5hbWUsIHJ1bGVTeW50YXgsIGNvbnN0cnVjdG9yID0gUnVsZS5TdGF0ZW1lbnQsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXgubWFwKHN5bnRheCA9PiB0aGlzLmFkZFN0YXRlbWVudChuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSlbMF07XG5cblx0XHRsZXQgcnVsZSA9IHRoaXMuYWRkU2VxdWVuY2UobmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwic3RhdGVtZW50XCIsIHJ1bGUpO1xuXHR9fSxcblxuXHRhZGRFeHByZXNzaW9uOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuRXhwcmVzc2lvbiwgcHJvcGVydGllcykge1xuXHRcdC8vIEFkZCBhIGJ1bmNoIG9mIHN5bnRheGVzIGF0IG9uY2UgaWYgd2UgZ290IGFuIGFycmF5IG9mIHN5bnRheGVzXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkocnVsZVN5bnRheCkpXG5cdFx0XHRyZXR1cm4gcnVsZVN5bnRheC5tYXAoc3ludGF4ID0+IHRoaXMuYWRkRXhwcmVzc2lvbihuYW1lLCBzeW50YXgsIGNvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSlbMF07XG5cblx0XHRsZXQgcnVsZSA9IHRoaXMuYWRkU2VxdWVuY2UobmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IsIHByb3BlcnRpZXMpO1xuXHRcdGlmIChydWxlKSByZXR1cm4gdGhpcy5hZGRSdWxlKFwiZXhwcmVzc2lvblwiLCBydWxlKTtcblx0fX0sXG5cblx0YWRkTGlzdDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLkxpc3QsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXgubWFwKHN5bnRheCA9PiB0aGlzLmFkZExpc3QobmFtZSwgc3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcykpWzBdO1xuXG5cdFx0bGV0IHN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgpO1xuXHRcdGxldCBydWxlID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X2xpc3Qoc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKVswXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZS5hZGRMaXN0KCR7bmFtZX0sICR7cnVsZVN5bnRheH0pOiBubyBydWxlIHByb2R1Y2VkYCk7XG5cdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fX0sXG5cblx0YWRkS2V5d29yZDogeyB2YWx1ZTogZnVuY3Rpb24obmFtZSwgcnVsZVN5bnRheCwgY29uc3RydWN0b3IgPSBSdWxlLktleXdvcmQsIHByb3BlcnRpZXMpIHtcblx0XHQvLyBBZGQgYSBidW5jaCBvZiBzeW50YXhlcyBhdCBvbmNlIGlmIHdlIGdvdCBhbiBhcnJheSBvZiBzeW50YXhlc1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHJ1bGVTeW50YXgpKVxuXHRcdFx0cmV0dXJuIHJ1bGVTeW50YXgubWFwKHN5bnRheCA9PiB0aGlzLmFkZEtleXdvcmQobmFtZSwgc3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcykpWzBdO1xuXG5cdFx0bGV0IHN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgpO1xuXHRcdGxldCBydWxlID0gKFJ1bGUucGFyc2VSdWxlU3ludGF4X2tleXdvcmQoc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKVswXTtcblx0XHRpZiAoIXJ1bGUpIHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZS5hZGRLZXl3b3JkKCR7bmFtZX0sICR7cnVsZVN5bnRheH0pOiBubyBydWxlIHByb2R1Y2VkYCk7XG5cdFx0aWYgKHByb3BlcnRpZXMpIE9iamVjdC5hc3NpZ24ocnVsZSwgcHJvcGVydGllcyk7XG5cdFx0cmV0dXJuIHRoaXMuYWRkUnVsZShuYW1lLCBydWxlKTtcblx0fX0sXG5cblx0YWRkU3ltYm9sOiB7IHZhbHVlOiBmdW5jdGlvbihuYW1lLCBydWxlU3ludGF4LCBjb25zdHJ1Y3RvciA9IFJ1bGUuU3ltYm9sLCBwcm9wZXJ0aWVzKSB7XG5cdFx0Ly8gQWRkIGEgYnVuY2ggb2Ygc3ludGF4ZXMgYXQgb25jZSBpZiB3ZSBnb3QgYW4gYXJyYXkgb2Ygc3ludGF4ZXNcblx0XHRpZiAoQXJyYXkuaXNBcnJheShydWxlU3ludGF4KSlcblx0XHRcdHJldHVybiBydWxlU3ludGF4Lm1hcChzeW50YXggPT4gdGhpcy5hZGRTeW1ib2wobmFtZSwgc3ludGF4LCBjb25zdHJ1Y3RvciwgcHJvcGVydGllcykpWzBdO1xuXG5cdFx0Ly8gUGFyc2UgYXMgYHRva2Vuc2AsIHdoaWNoIHdpbGwgbWVyZ2UgU3ltYm9scyBmb3IgdXMuXG5cdFx0bGV0IHN0cmVhbSA9IFJ1bGUudG9rZW5pc2VSdWxlU3ludGF4KHJ1bGVTeW50YXgpO1xuXHRcdGxldCBydWxlcyA9IChSdWxlLnBhcnNlUnVsZVN5bnRheF90b2tlbnMoc3RyZWFtLCBbXSwgMCwgY29uc3RydWN0b3IpIHx8IFtdKTtcblxuXHRcdGlmIChydWxlcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHRocm93IG5ldyBTeW50YXhFcnJvcihgUnVsZS5hZGRTeW1ib2woJHtuYW1lfSwgJHtydWxlU3ludGF4fSk6IG5vIHJ1bGUgcHJvZHVjZWRgKTtcblx0XHR9XG5cblx0XHRpZiAocnVsZXMubGVuZ3RoID4gMSB8fCAhKHJ1bGVzWzBdIGluc3RhbmNlb2YgUnVsZS5TeW1ib2wpKSB7XG5cdFx0XHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoYFJ1bGUuYWRkU3ltYm9sKCR7bmFtZX0sICR7cnVsZVN5bnRheH0pOiBnZW5lcmF0ZWQgc29tZXRoaW5nIGArXG5cdFx0XHRcdGAgb3RoZXIgdGhhbiBhIHNpbmdsZSBTeW1ib2wuICBVc2UgUnVsZS5hZGRTeW50YXgoKSBpbnN0ZWFkLmApO1xuXHRcdH1cblxuXHRcdGxldCBydWxlID0gcnVsZXNbMF07XG5cdFx0Ly8gQ29udmVydCB0byBwcm9wZXIgdHlwZSBpZiBuZWNlc3Nhcnlcblx0XHRpZiAoY29uc3RydWN0b3IgIT09IFJ1bGUuU3ltYm9sKSBydWxlID0gbmV3IGNvbnN0cnVjdG9yKHJ1bGUpO1xuXHRcdGlmIChwcm9wZXJ0aWVzKSBPYmplY3QuYXNzaWduKHJ1bGUsIHByb3BlcnRpZXMpO1xuXHRcdHJldHVybiB0aGlzLmFkZFJ1bGUobmFtZSwgcnVsZSk7XG5cdH19LFxuXG59KTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlU3ludGF4LmpzIiwiLy9cbi8vXHQjIENvcmUgYHJ1bGVzYCAtLSBzaW1wbGUgZGF0YXR5cGVzLCBldGMuXG4vL1xuLy8gTk9URTogbWFueSBvZiB0aGUgYmVsb3cgYXJlIGNyZWF0ZWQgYXMgY3VzdG9tIFBhdHRlcm4gc3ViY2xhc3NlcyBmb3IgZGVidWdnaW5nLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4uL1BhcnNlclwiO1xuaW1wb3J0IFJ1bGUgZnJvbSBcIi4uL1J1bGVTeW50YXhcIjtcbmltcG9ydCBUb2tlbml6ZXIgZnJvbSBcIi4uL1Rva2VuaXplclwiO1xuXG4vLyBDcmVhdGUgYGNvcmVgIHBhcnNlciBjb250ZXh0LlxuY29uc3QgcGFyc2VyID0gUGFyc2VyLmZvckNvbnRleHQoXCJjb3JlXCIpO1xuZXhwb3J0IGRlZmF1bHQgcGFyc2VyO1xuXG5cbi8vXG4vLyAjIyMgSW5zdGFsbCBzdGFuZGFyZCBydWxlc1xuLy9cblxucGFyc2VyLmFkZFJ1bGUoXCJzdGF0ZW1lbnRzXCIsIFJ1bGUuU3RhdGVtZW50cyk7XG5wYXJzZXIuYWRkUnVsZShcImNvbW1lbnRcIiwgUnVsZS5Db21tZW50KTtcblxuXG5cblxuLy8gYHdvcmRgID0gaXMgYSBzaW5nbGUgYWxwaGFudW1lcmljIHdvcmQuXG4vLyBNVVNUIHN0YXJ0IHdpdGggYSBsb3dlci1jYXNlIGxldHRlciAoPylcblJ1bGUuV29yZCA9IGNsYXNzIHdvcmQgZXh0ZW5kcyBSdWxlLlBhdHRlcm4ge1xuXHQvLyBDb252ZXJ0IFwiLVwiIHRvIFwiX1wiIGluIHNvdXJjZSBvdXRwdXQuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnJlcGxhY2UoL1xcLS9nLCBcIl9cIik7XG5cdH1cbn07XG5SdWxlLldvcmQucHJvdG90eXBlLnBhdHRlcm4gPSAvXlthLXpdW1xcd1xcLV0qJC87XG5wYXJzZXIuYWRkUnVsZShcIndvcmRcIiwgUnVsZS5Xb3JkKTtcblxuXG4vLyBgaWRlbnRpZmllcmAgPSB2YXJpYWJsZXMgb3IgcHJvcGVydHkgbmFtZS5cbi8vIE1VU1Qgc3RhcnQgd2l0aCBhIGxvd2VyLWNhc2UgbGV0dGVyICg/KVxuLy8gTk9URTogV2UgYmxhY2tsaXN0IGEgbG90IG9mIHdvcmRzIGFzIGlkZW50aWZpZXJzLlxuUnVsZS5JZGVudGlmaWVyID0gY2xhc3MgaWRlbnRpZmllciBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0fVxufTtcblJ1bGUuSWRlbnRpZmllci5wcm90b3R5cGUucGF0dGVybiA9IC9eW2Etel1bXFx3XFwtXSokLztcbmxldCBpZGVudGlmaWVyID0gcGFyc2VyLmFkZFJ1bGUoW1wiaWRlbnRpZmllclwiLCBcImV4cHJlc3Npb25cIl0sIFJ1bGUuSWRlbnRpZmllcik7XG5cbi8vIEFkZCBFbmdsaXNoIHByZXBvc2l0aW9ucyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vXG4vLyBXaWtpcGVkaWEgXCJQcmVwb3NpdGlvblwiOlxuLy9cdFwiUHJlcG9zaXRpb25zLi4uYXJlIGEgY2xhc3Mgb2Ygd29yZHMgdGhhdFxuLy9cdGV4cHJlc3Mgc3BhdGlhbCBvciB0ZW1wb3JhbCByZWxhdGlvbnMgIChpbiwgdW5kZXIsIHRvd2FyZHMsIGJlZm9yZSlcbi8vXHRvciBtYXJrIHZhcmlvdXMgc2VtYW50aWMgcm9sZXMgKG9mLCBmb3IpLlxuLy8gVEVTVE1FXG5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcImFib3V0XCIsIFwiYWJvdmVcIiwgXCJhZnRlclwiLCBcImFuZFwiLCBcImFzXCIsIFwiYXRcIixcblx0XCJiZWZvcmVcIiwgXCJiZWhpbmRcIiwgXCJiZWxvd1wiLCBcImJlbmVhdGhcIiwgXCJiZXNpZGVcIiwgXCJiZXR3ZWVuXCIsIFwiYmV5b25kXCIsIFwiYnlcIixcblx0XCJkZWZpbmVkXCIsIFwiZG93blwiLCBcImR1cmluZ1wiLFxuXHRcImVhY2hcIiwgXCJlbXB0eVwiLCBcImV4YWN0bHlcIiwgXCJleGNlcHRcIixcblx0XCJmb3JcIiwgXCJmcm9tXCIsXG5cdFwiZ3JlYXRlclwiLFxuXHRcIklcIiwgXCJpblwiLCBcImludG9cIixcblx0XCJsZXNzXCIsIFwibG9uZ1wiLFxuXHRcIm1lXCIsIFwibWludXNcIiwgXCJtb3JlXCIsXG5cdFwibmVhclwiLCBcIm5vdFwiLFxuXHRcIm9mXCIsIFwib2ZmXCIsIFwib25cIiwgXCJvbnRvXCIsIFwib3Bwb3NpdGVcIiwgXCJvclwiLCBcIm91dFwiLCBcIm91dHNpZGVcIiwgXCJvdmVyXCIsXG5cdFwic2hvcnRcIiwgXCJzaW5jZVwiLFxuXHRcInRoYW5cIiwgXCJ0aGVcIiwgXCJ0aGVuXCIsIFwidGhyb3VnaFwiLCBcInRocnVcIiwgXCJ0b1wiLCBcInRvd2FyZFwiLCBcInRvd2FyZHNcIixcblx0XCJ1bmRlZmluZWRcIiwgXCJ1bmRlclwiLCBcInVuZGVybmVhdGhcIiwgXCJ1bmlxdWVcIiwgXCJ1bnRpbFwiLCBcInVwXCIsIFwidXBvblwiLCBcInVwc2lkZVwiLFxuXHRcInZlcnN1c1wiLCBcInZzXCIsXG5cdFwid2hlcmVcIiwgXCJ3aXRoXCIsIFwid2l0aGluXCIsIFwid2l0aG91dFwiLFxuKTtcblxuLy8gQWRkIGNvbW1vbiBlbmdsaXNoIHZlcmJzIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJhcmVcIixcblx0XCJkb1wiLCBcImRvZXNcIixcblx0XCJjb250YWluc1wiLFxuXHRcImhhc1wiLCBcImhhdmVcIixcblx0XCJpc1wiLFxuXHRcInJlcGVhdFwiLFxuXHRcIndhc1wiLCBcIndlcmVcIlxuKTtcblxuLy8gQWRkIHNwZWNpYWwgY29udHJvbCBrZXl3b3JkcyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbmlkZW50aWZpZXIuYWRkVG9CbGFja2xpc3QoXG5cdFwiZWxzZVwiLFxuXHRcImlmXCIsXG5cdFwib3RoZXJ3aXNlXCIsXG5cdFwid2hpbGVcIlxuKTtcblxuLy8gYFR5cGVgID0gdHlwZSBuYW1lLlxuLy8gTVVTVCBzdGFydCB3aXRoIGFuIHVwcGVyLWNhc2UgbGV0dGVyICg/KVxuUnVsZS5UeXBlID0gY2xhc3MgdHlwZSBleHRlbmRzIFJ1bGUuUGF0dGVybiB7XG5cdC8vIENvbnZlcnQgXCItXCIgdG8gXCJfXCIgaW4gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGxldCB0eXBlID0gdGhpcy5tYXRjaGVkO1xuXHRcdHN3aXRjaCh0eXBlKSB7XG5cdFx0XHQvLyBzcGVjaWFsIGNhc2UgdG8gdGFrZSB0aGUgZm9sbG93aW5nIGFzIGxvd2VyY2FzZVxuXHRcdFx0Y2FzZSBcInRleHRcIjpcdFx0cmV0dXJuIFwiU3RyaW5nXCI7XG5cdFx0XHRjYXNlIFwiY2hhcmFjdGVyXCI6XHRyZXR1cm4gXCJDaGFyYWN0ZXJcIjtcblx0XHRcdGNhc2UgXCJudW1iZXJcIjpcdFx0cmV0dXJuIFwiTnVtYmVyXCI7XG5cdFx0XHRjYXNlIFwiaW50ZWdlclwiOlx0XHRyZXR1cm4gXCJJbnRlZ2VyXCI7XG5cdFx0XHRjYXNlIFwiZGVjaW1hbFwiOlx0XHRyZXR1cm4gXCJEZWNpbWFsXCI7XG5cdFx0XHRjYXNlIFwiYm9vbGVhblwiOlx0XHRyZXR1cm4gXCJCb29sZWFuXCI7XG5cdFx0XHRjYXNlIFwib2JqZWN0XCI6XHRcdHJldHVybiBcIk9iamVjdFwiO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIHR5cGUucmVwbGFjZSgvXFwtL2csIFwiX1wiKTtcblx0XHR9XG5cdH1cbn07XG5SdWxlLlR5cGUucHJvdG90eXBlLnBhdHRlcm4gPSAvKFtBLVpdW1xcd1xcLV0qfHRleHR8bnVtYmVyfGludGVnZXJ8ZGVjaW1hbHxjaGFyYWN0ZXJ8Ym9vbGVhbnxvYmplY3QpLztcbmxldCB0eXBlID0gcGFyc2VyLmFkZFJ1bGUoW1widHlwZVwiLCBcImV4cHJlc3Npb25cIl0sIFJ1bGUuVHlwZSk7XG50eXBlLmFkZFRvQmxhY2tsaXN0KFwiSVwiKTtcblxuXG4vLyBCb29sZWFuIGxpdGVyYWwsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFRPRE86IGJldHRlciBuYW1lIGZvciB0aGlzPz8/XG5SdWxlLkJvb2xlYW4gPSBjbGFzcyBib29sZWFuIGV4dGVuZHMgUnVsZS5QYXR0ZXJuIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHN3aXRjaCAodGhpcy5tYXRjaGVkKSB7XG5cdFx0XHRjYXNlIFwidHJ1ZVwiOlxuXHRcdFx0Y2FzZSBcInllc1wiOlxuXHRcdFx0Y2FzZSBcIm9rXCI6XG5cdFx0XHRjYXNlIFwic3VjY2Vzc1wiOlxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufTtcblJ1bGUuQm9vbGVhbi5wcm90b3R5cGUucGF0dGVybiA9IC9eKHRydWV8ZmFsc2V8eWVzfG5vfG9rfGNhbmNlbHxzdWNjZXNzfGZhaWx1cmUpJC87XG5wYXJzZXIuYWRkUnVsZShbXCJib29sZWFuXCIsIFwiZXhwcmVzc2lvblwiXSwgUnVsZS5Cb29sZWFuKTtcblxuLy8gQWRkIGJvb2xlYW4gdG9rZW5zIHRvIGlkZW50aWZpZXIgYmxhY2tsaXN0LlxuLy8gVEVTVE1FXG5pZGVudGlmaWVyLmFkZFRvQmxhY2tsaXN0KFxuXHRcInRydWVcIiwgXCJmYWxzZVwiLFxuXHRcInllc1wiLCBcIm5vXCIsXG5cdFwib2tcIiwgXCJjYW5jZWxcIixcblx0XCJzdWNjZXNzXCIsIFwiZmFpbHVyZVwiXG4pO1xuXG5cbi8vIGBudW1iZXJgIGFzIGVpdGhlciBmbG9hdCBvciBpbnRlZ2VyLCBjcmVhdGVkIHdpdGggY3VzdG9tIGNvbnN0cnVjdG9yIGZvciBkZWJ1Z2dpbmcuXG4vLyBOT1RFOiB5b3UgY2FuIGFsc28gdXNlIGBvbmVgLi4uYHRlbmAgYXMgc3RyaW5ncy4nXG4vLyBUT0RPOiAgYGludGVnZXJgIGFuZCBgZGVjaW1hbGA/ICB0b28gdGVjaHk/XG5SdWxlLk51bWJlciA9IGNsYXNzIG51bWJlciBleHRlbmRzIFJ1bGUge1xuXHQvLyBTcGVjaWFsIHdvcmRzIHlvdSBjYW4gdXNlIGFzIG51bWJlcnMuLi5cblx0c3RhdGljIE5VTUJFUl9OQU1FUyA9IHtcblx0XHR6ZXJvOiAwLFxuXHRcdG9uZTogMSxcblx0XHR0d286IDIsXG5cdFx0dGhyZWU6IDMsXG5cdFx0Zm91cjogNCxcblx0XHRmaXZlOiA1LFxuXHRcdHNpeDogNixcblx0XHRzZXZlbjogNyxcblx0XHRlaWdodDogOCxcblx0XHRuaW5lOiA5LFxuXHRcdHRlbjogMTBcblx0fVxuXG5cdC8vIE51bWJlcnMgZ2V0IGVuY29kZWQgYXMgbnVtYmVycyBpbiB0aGUgdG9rZW4gc3RyZWFtLlxuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwKSB7XG5cdFx0bGV0IHRva2VuID0gdG9rZW5zW3N0YXJ0XTtcblx0XHQvLyBpZiBhIHN0cmluZywgYXR0ZW1wdCB0byBydW4gdGhyb3VnaCBvdXIgTlVNQkVSX05BTUVTXG5cdFx0aWYgKHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIikgdG9rZW4gPSBSdWxlLk51bWJlci5OVU1CRVJfTkFNRVNbdG9rZW5dO1xuXHRcdGlmICh0eXBlb2YgdG9rZW4gIT09IFwibnVtYmVyXCIpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogdG9rZW4sXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0ICsgMVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gQ29udmVydCB0byBudW1iZXIgb24gc291cmNlIG91dHB1dC5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQ7XG5cdH1cbn07XG5cbnBhcnNlci5hZGRSdWxlKFtcIm51bWJlclwiLCBcImV4cHJlc3Npb25cIl0sIFJ1bGUuTnVtYmVyKTtcblxuLy8gQWRkIG51bWJlciB3b3JkcyB0byBpZGVudGlmaWVyIGJsYWNrbGlzdC5cbi8vIFRFU1RNRVxuaWRlbnRpZmllci5hZGRUb0JsYWNrbGlzdChcblx0XCJvbmVcIiwgXCJ0d29cIiwgXCJ0aHJlZVwiLCBcImZvdXJcIiwgXCJmaXZlXCIsXG5cdFwic2l4XCIsIFwic2V2ZW5cIiwgXCJlaWdodFwiLCBcIm5pbmVcIiwgXCJ0ZW5cIlxuKTtcblxuXG4vLyBMaXRlcmFsIGB0ZXh0YCBzdHJpbmcsIGNyZWF0ZWQgd2l0aCBjdXN0b20gY29uc3RydWN0b3IgZm9yIGRlYnVnZ2luZy5cbi8vIFlvdSBjYW4gdXNlIGVpdGhlciBzaW5nbGUgb3IgZG91YmxlIHF1b3RlcyBvbiB0aGUgb3V0c2lkZSAoYWx0aG91Z2ggZG91YmxlIHF1b3RlcyBhcmUgcHJlZmVycmVkKS5cbi8vIFJldHVybmVkIHZhbHVlIGhhcyBlbmNsb3NpbmcgcXVvdGVzLlxuUnVsZS5UZXh0ID0gY2xhc3MgdGV4dCBleHRlbmRzIFJ1bGUge1xuXHQvLyBUZXh0IHN0cmluZ3MgZ2V0IGVuY29kZWQgYXMgYHRleHRgIG9iamVjdHMgaW4gdGhlIHRva2VuIHN0cmVhbS5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCkge1xuXHRcdGxldCB0b2tlbiA9IHRva2Vuc1tzdGFydF07XG5cdFx0aWYgKCEodG9rZW4gaW5zdGFuY2VvZiBUb2tlbml6ZXIuVGV4dCkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogdG9rZW4sXG5cdFx0XHRuZXh0U3RhcnQ6IHN0YXJ0ICsgMVxuXHRcdH0pO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQucXVvdGVkU3RyaW5nO1xuXHR9XG59O1xucGFyc2VyLmFkZFJ1bGUoW1widGV4dFwiLCBcImV4cHJlc3Npb25cIl0sIFJ1bGUuVGV4dCk7XG5cblxuXG4vLyBMaXRlcmFsIGxpc3QgKGFycmF5KSwgZWc6ICBgWzEsMix0cnVlLGZhbHNlIF1gXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJsaXRlcmFsX2xpc3RcIixcblx0XCJcXFxcW1tsaXN0OntleHByZXNzaW9ufSxdP1xcXFxdXCIsXG5cdGNsYXNzIGxpdGVyYWxfbGlzdCBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdFx0bGV0IHsgbGlzdCB9ID0gdGhpcy5nZXRNYXRjaGVkU291cmNlKGNvbnRleHQpO1xuXHRcdFx0cmV0dXJuIGBbJHtsaXN0ID8gbGlzdC5qb2luKFwiLCBcIikgOiBcIlwifV1gO1xuXHRcdH1cblx0fVxuKTtcblxuXG4vLyBQYXJlbnRoZXNpemVkIGV4cHJlc3Npb25cbi8vVEVTVE1FXG5wYXJzZXIuYWRkRXhwcmVzc2lvbihcblx0XCJwYXJlbnRoZXNpemVkX2V4cHJlc3Npb25cIixcblx0XCJcXFxcKHtleHByZXNzaW9ufVxcXFwpXCIsXG5cdGNsYXNzIHBhcmVudGhlc2l6ZWRfZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuRXhwcmVzc2lvbiB7XG5cdFx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkWzFdO1xuXHRcdH1cblx0XHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0XHRsZXQgZXhwcmVzc2lvbiA9IHRoaXMucmVzdWx0cy50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdC8vIGRvbid0IGRvdWJsZSBwYXJlbnMgaWYgbm90IG5lY2Vzc2FyeVxuXHRcdFx0aWYgKHR5cGVvZiBleHByZXNzaW9uID09PSBcInN0cmluZ1wiICYmIGV4cHJlc3Npb24uc3RhcnRzV2l0aChcIihcIikgJiYgZXhwcmVzc2lvbi5lbmRzV2l0aChcIilcIikpIHJldHVybiBleHByZXNzaW9uO1xuXHRcdFx0cmV0dXJuIGAoJHtleHByZXNzaW9ufSlgO1xuXHRcdH1cblx0fVxuKVxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL3J1bGVzL2NvcmUuanMiLCIvL1x0IyBQYXJzZXIgUnVsZXNcbi8vXHRSdWxlcyBjYW4gYmUgYXMgc2ltcGxlIGFzIGEgc3RyaW5nIGBLZXl3b3JkYCBvciBhIGNvbXBsZXggc2VxdWVuY2Ugb2YgKG5lc3RlZCkgcnVsZXMuXG4vL1xuLy9cdFBhcnNlIGEgcnVsZSB3aXRoIGBydWxlLnBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCwgZW5kKWAsIHRoaXMgd2lsbCBlaXRoZXI6XG4vL1x0XHQtIHJldHVybiBgdW5kZWZpbmVkYCBpZiB0aGUgcnVsZSBkb2Vzbid0IG1hdGNoIHRoZSBoZWFkIG9mIHRoZSB0b2tlbnMsIG9yXG4vL1x0XHQtIHJldHVybiBhIENMT05FIG9mIHRoZSBydWxlIHdpdGggYXQgbGVhc3QgdGhlIGZvbGxvd2luZzpcbi8vXHRcdFx0LSBgbWF0Y2hlZGBcdFx0UmVzdWx0cyBvZiB5b3VyIHBhcnNlLlxuLy9cdFx0XHQtIGBuZXh0U3RhcnRgXHRQbGFjZSB3aGVyZSBuZXh0IG1hdGNoIHNob3VsZCBzdGFydCAoZWc6IG9uZSBiZXlvbmQgd2hhdCB5b3UgbWF0Y2hlZCkuXG4vL1xuLy9cdFRoZSBjbG9uZSByZXR1cm5lZCBhYm92ZSBjYW4gYmUgbWFuaXB1bGF0ZWQgd2l0aFxuLy9cdFx0LSBgcnVsZS5yZXN1bHRzYFx0XHRcdFJldHVybiBtYXRjaGVkIGFyZ3VtZW50cyBpbiBhIGZvcm1hdCBzdWl0YWJsZSB0byBkbzpcbi8vXHRcdC0gYHJ1bGUudG9Tb3VyY2UoY29udGV4dClgXHRSZXR1cm4gamF2YXNjcmlwdCBzb3VyY2UgdG8gaW50ZXJwcmV0IHRoZSBydWxlLlxuLy9cbmltcG9ydCBQYXJzZXIgZnJvbSBcIi4vUGFyc2VyLmpzXCI7XG5cbmltcG9ydCBnbG9iYWwgZnJvbSBcIi4vdXRpbHMvZ2xvYmFsXCI7XG5pbXBvcnQgeyBnZXRUYWJzLCBpc1doaXRlc3BhY2UgfSBmcm9tIFwiLi91dGlscy9zdHJpbmdcIjtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKC4uLnByb3BzKSB7XG5cdFx0T2JqZWN0LmFzc2lnbih0aGlzLCAuLi5wcm9wcyk7XG5cdH1cblxuXHQvLyBDbG9uZSB0aGlzIHJ1bGUgYW5kIGFkZCBhbnkgYHByb3BzYCBwYXNzZWQgaW4uXG5cdGNsb25lKHByb3BzKSB7XG5cdFx0cmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMsIHByb3BzKTtcblx0fVxuXG4vL1xuLy9cdFBhcnNpbmcgcHJpbWl0aXZlcyAtLSB5b3UgTVVTVCBpbXBsZW1lbnQgdGhlc2UgaW4geW91ciBzdWJjbGFzc2VzIVxuLy9cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcnVsZSBiZXR3ZWVuIGBzdGFydGAgYW5kIGBlbmRgIG9mIGB0b2tlbnNgLlxuXHQvLyBSZXR1cm5zIHJlc3VsdHMgb2YgdGhlIHBhcnNlIG9yIGB1bmRlZmluZWRgLlxuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQsIHN0YWNrKSB7XG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGJpdHMgb2Ygb3VyIHJ1bGUgYXJlIGZvdW5kIEFOWVdIRVJFIGJldHdlZW4gYHN0YXJ0YCBhbmQgYGVuZGAgaW4gdGhlIGB0b2tlbnNgLlxuXHQvLyBUaGlzIGlzIHVzZWQgYnkgY29tcGxpY2F0ZWQgKGVnOiBsZWZ0IHJlY3Vyc2l2ZSkgcnVsZXMgdG8gZXhpdCBxdWlja2x5IGlmIHRoZXJlJ3Mgbm8gY2hhbmNlLlxuXHQvLyBSZXR1cm5zOlxuXHQvL1x0LSBgdHJ1ZWAgaWYgdGhlIHJ1bGUgTUlHSFQgYmUgbWF0Y2hlZC5cblx0Ly9cdC0gYGZhbHNlYCBpZiB0aGVyZSBpcyBubyB3YXkgdGhlIHJ1bGUgY2FuIGJlIG1hdGNoZWQuXG5cdC8vXHQtIGB1bmRlZmluZWRgIGlmIG5vdCBkZXRlcm1pbnN0aWMgKGVnOiBubyB3YXkgdG8gdGVsbCBxdWlja2x5KS5cblx0dGVzdChwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0YWRkVG9CbGFja2xpc3QoLi4ud29yZHMpIHtcblx0XHRpZiAoIXRoaXMuYmxhY2tsaXN0KSB0aGlzLmJsYWNrbGlzdCA9IHt9O1xuXHRcdHdvcmRzLmZvckVhY2god29yZCA9PiB0aGlzLmJsYWNrbGlzdFt3b3JkXSA9IHRydWUpO1xuXHR9XG5cbi8vXG4vLyAjIyBvdXRwdXQgYXMgc291cmNlXG4vL1xuXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBOT1RFOiB5b3UgbWF5IHdhbnQgdG8gbWVtb2l6ZSB0aGUgcmVzdWx0cy5cblx0Z2V0IHJlc3VsdHMoKSB7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvLyBPdXRwdXQgdmFsdWUgZm9yIHRoaXMgSU5TVEFOVElBVEVEIHJ1bGUgYXMgc291cmNlLlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZDtcblx0fVxuXG5cbi8vXG4vLyAjIyBvdXRwdXQgYXMgc3RydWN0dXJlOlxuLy9cblx0dG9TdHJ1Y3R1cmUoY29udGV4dCkge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuLy9cbi8vICMjIGdyb3VwOiByZWZsZWN0aW9uXG4vL1xuXHRnZXQgcnVsZVR5cGUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0fVxufVxuXG5cbi8vIFJ1bGUgZm9yIG9uZSBvciBtb3JlIHNlcXVlbnRpYWwgbGl0ZXJhbCB2YWx1ZXMgdG8gbWF0Y2gsIHdoaWNoIGluY2x1ZGUgcHVuY3R1YXRpb24gc3VjaCBhcyBgKGAgZXRjLlxuUnVsZS5NYXRjaCA9IGNsYXNzIG1hdGNoIGV4dGVuZHMgUnVsZSB7XG5cdGNvbnN0cnVjdG9yKC4uLnByb3BzKSB7XG5cdFx0c3VwZXIoLi4ucHJvcHMpO1xuXHRcdC8vIGNvZXJjZSB0byBhbiBhcnJheSAoYSBiaXQgc2xvd2VyIGJ1dCBjbGVhbmVyKS5cblx0XHRpZiAoIUFycmF5LmlzQXJyYXkodGhpcy5tYXRjaCkpIHRoaXMubWF0Y2ggPSBbdGhpcy5tYXRjaF07XG5cdH1cblxuXHQvLyBBdHRlbXB0IHRvIG1hdGNoIHRoaXMgcnVsZSBpbiB0aGUgYHRva2Vuc2AuXG5cdC8vIFJldHVybnMgcmVzdWx0cyBvZiB0aGUgcGFyc2Ugb3IgYHVuZGVmaW5lZGAuXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCwgc3RhY2spIHtcblx0XHRpZiAoIXRoaXMuaGVhZFN0YXJ0c1dpdGgodGhpcy5tYXRjaCwgdG9rZW5zLCBzdGFydCwgZW5kKSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHQvLyBpZiBvbmx5IG9uZSBhbmQgd2UgaGF2ZSBhIGJsYWNrbGlzdCwgbWFrZSBzdXJlIGl0J3Mgbm90IGluIHRoZSBibGFja2xpc3QhXG5cdFx0aWYgKHRoaXMubWF0Y2gubGVuZ3RoID09PSAxICYmIHRoaXMuYmxhY2tsaXN0ICYmIHRoaXMuYmxhY2tsaXN0W3RoaXMubWF0Y2hbMF1dKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZDogdGhpcy5tYXRjaC5qb2luKHRoaXMubWF0Y2hEZWxpbWl0ZXIpLFxuXHRcdFx0bmV4dFN0YXJ0OiBzdGFydCArIHRoaXMubWF0Y2gubGVuZ3RoXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBEb2VzIHRoaXMgbWF0Y2ggYXBwZWFyIGFueXdoZXJlIGluIHRoZSB0b2tlbnM/XG5cdHRlc3QocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0bGV0IG1hdGNoU3RhcnQgPSB0b2tlbnMuaW5kZXhPZih0aGlzLm1hdGNoWzBdLCBzdGFydCk7XG5cdFx0cmV0dXJuIG1hdGNoU3RhcnQgIT09IC0xICYmIHRoaXMuaGVhZFN0YXJ0c1dpdGgodGhpcy5tYXRjaCwgdG9rZW5zLCBtYXRjaFN0YXJ0LCBlbmQpO1xuXHR9XG5cblx0Ly8gRG9lcyB0aGUgaGVhZCBvZiB0aGUgdG9rZW5zIHN0YXJ0IHdpdGggYW4gYXJyYXkgb2YgbWF0Y2hlcz9cblx0aGVhZFN0YXJ0c1dpdGgobWF0Y2hlcywgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCA9IHRva2Vucy5sZW5ndGgpIHtcblx0XHQvLyBiYWlsIGlmIG1hdGNoIHdvdWxkIGdvIGJleW9uZCB0aGUgZW5kXG5cdFx0aWYgKHN0YXJ0ICsgbWF0Y2hlcy5sZW5ndGggPiBlbmQpIHJldHVybiBmYWxzZTtcblxuXHRcdC8vIFNwZWNpYWwgY2FzZSBmb3Igb25lIG1hdGNoLCBtYXliZSBwcmVtYXR1cmUgb3B0aW1pemF0aW9uIGJ1dC4uLlxuXHRcdGlmIChtYXRjaGVzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIChtYXRjaGVzWzBdID09PSB0b2tlbnNbc3RhcnRdKTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbWF0Y2hlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKG1hdGNoZXNbaV0gIT09IHRva2Vuc1tzdGFydCArIGldKSByZXR1cm4gZmFsc2Vcblx0XHR9XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHR0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gYCR7dGhpcy5tYXRjaC5qb2luKHRoaXMubWF0Y2hEZWxpbWl0ZXIpfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblJ1bGUuTWF0Y2gucHJvdG90eXBlLm1hdGNoRGVsaW1pdGVyID0gXCJcIjtcblxuXG4vLyBTeW50YWN0aWMgc3VnYXIgdG8gc2VwYXJhdGUgYHN5bWJvbHNgICh3aGljaCBkb24ndCByZXF1aXJlIHNwYWNlcykgZnJvbSBga2V5d29yZHNgICh3aGljaCBkbykuXG5SdWxlLlN5bWJvbCA9IGNsYXNzIHN5bWJvbCBleHRlbmRzIFJ1bGUuTWF0Y2gge31cblxuUnVsZS5LZXl3b3JkID0gY2xhc3Mga2V5d29yZCBleHRlbmRzIFJ1bGUuTWF0Y2gge31cblJ1bGUuS2V5d29yZC5wcm90b3R5cGUubWF0Y2hEZWxpbWl0ZXIgPSBcIiBcIjtcblxuXG5cbi8vIFJlZ2V4IHBhdHRlcm4gdG8gbWF0Y2ggYSBTSU5HTEUgdG9rZW4uXG4vLyBgcnVsZS5wYXR0ZXJuYCBpcyB0aGUgcmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoLlxuLy8gTm90ZSB0aGF0IHlvdSBNVVNUIHN0YXJ0IHlvdXIgcGF0dGVybiB3aXRoIGBeYCBhbmQgZW5kIHdpdGggYCRgIHRvIG1ha2Ugc3VyZSBpdCBtYXRjaGVzIHRoZSBlbnRpcmUgdG9rZW4uXG4vLyBOb3RlIHRoYXQgdGhpcyBjYW4gb25seSBtYXRjaCBhIHNpbmdsZSB0b2tlbiFcblJ1bGUuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4gZXh0ZW5kcyBSdWxlIHtcblx0Ly8gQXR0ZW1wdCB0byBtYXRjaCB0aGlzIHBhdHRlcm4gYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgdG9rZW5zLlxuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQsIHN0YWNrKSB7XG5cdFx0bGV0IHRva2VuID0gdG9rZW5zW3N0YXJ0XTtcblx0XHRpZiAodHlwZW9mIHRva2VuICE9PSBcInN0cmluZ1wiKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IG1hdGNoID0gdG9rZW4ubWF0Y2godGhpcy5wYXR0ZXJuKTtcblx0XHRpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYmFpbCBpZiBwcmVzZW50IGluIGJsYWNrbGlzdFxuXHRcdGxldCBtYXRjaGVkID0gbWF0Y2hbMF07XG5cdFx0aWYgKHRoaXMuYmxhY2tsaXN0ICYmIHRoaXMuYmxhY2tsaXN0W21hdGNoZWRdKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdG5leHRTdGFydDogc3RhcnQgKyAxXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBUZXN0IHRvIHNlZSBpZiBhbnkgb2Ygb3VyIHBhdHRlcm4gaXMgZm91bmQgQU5ZV0hFUkUgaW4gdGhlIHRva2Vucy5cblx0dGVzdChwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRyZXR1cm4gdG9rZW5zLnNsaWNlKHN0YXJ0LCBlbmQpLnNvbWUodG9rZW4gPT4gdHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiICYmIHRva2VuLm1hdGNoKHRoaXMucGF0dGVybikpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMucGF0dGVybi5zb3VyY2U7XG5cdH1cbn1cblxuXG4vLyBTdWJydWxlIC0tIG5hbWUgb2YgYW5vdGhlciBydWxlIHRvIGJlIGNhbGxlZC5cbi8vIGBydWxlLnJ1bGVgIGlzIHRoZSBuYW1lIG9mIHRoZSBydWxlIGluIGBwYXJzZXIucnVsZXNgLlxuUnVsZS5TdWJydWxlID0gY2xhc3MgU3VicnVsZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQsIHN0YWNrKSB7XG5cdFx0bGV0IHJlc3VsdCA9IHBhcnNlci5wYXJzZVJ1bGVPckRpZSh0aGlzLnJ1bGUsIHRva2Vucywgc3RhcnQsIGVuZCwgc3RhY2ssIGBwYXJzZSBzdWJydWxlICcke3RoaXMucnVsZX0nYCk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAodGhpcy5hcmd1bWVudCkgcmVzdWx0LmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgYW55IG9mIG91ciBhbHRlcm5hdGl2ZXMgYXJlIGZvdW5kIEFOWVdIRVJFIGluIHRoZSB0b2tlbnMuXG5cdHRlc3QocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0cmV0dXJuIHBhcnNlci50ZXN0UnVsZSh0aGlzLnJ1bGUsIHRva2Vucywgc3RhcnQpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGB7JHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGV9fSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn1cblxuXG4vLyBTZXF1ZW5jZSBvZiBydWxlcyB0byBtYXRjaC5cblJ1bGUuU2VxdWVuY2UgPSBjbGFzcyBTZXF1ZW5jZSBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQsIHN0YWNrKSB7XG5cdFx0Ly8gSWYgd2UgaGF2ZSBhIGB0ZXN0UnVsZWAgZGVmaW5lZFxuXHRcdGlmICh0aGlzLnRlc3RSdWxlKSB7XG5cdFx0XHQvLyBGb3JnZXQgaXQgaWYgdGhlcmUgaXMgTk8gV0FZIHRoZSBydWxlIGNvdWxkIGJlIG1hdGNoZWQuXG5cdFx0XHRpZiAocGFyc2VyLnRlc3RSdWxlKHRoaXMudGVzdFJ1bGUsIHRva2Vucywgc3RhcnQpID09PSBmYWxzZSkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSdyZSBhIGxlZnRSZWN1cnNpdmUgc2VxdWVuY2UuLi5cblx0XHRpZiAodGhpcy5sZWZ0UmVjdXJzaXZlKSB7XG5cdFx0XHQvLyBJZiB0aGUgc3RhY2sgYWxyZWFkeSBjb250YWlucyB0aGlzIHJ1bGUsIGZvcmdldCBpdC5cblx0XHRcdGlmIChzdGFjayAmJiBzdGFjay5pbmNsdWRlcyh0aGlzKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdFx0Ly8gQ2xvbmUgc3RhY2sgYW5kIGFkZCB0aGlzIHJ1bGUgZm9yIHJlY3Vyc2lvbi4uLlxuXHRcdFx0c3RhY2sgPSBzdGFjayA/IHN0YWNrLmNvbmNhdCgpIDogW107XG5cdFx0XHRzdGFjay5wdXNoKHRoaXMpO1xuXG5cdFx0XHQvLyBUT0RPOiBXZSBjb3VsZCBkaXN0aW5ndWlzaCBiZXR3ZWVuIHByb2R1Y3RpdmUgYW5kIHVucHJvZHVjdGl2ZSBydWxlc1xuXHRcdFx0Ly9cdFx0IGJ5IGNoZWNraW5nIG9ubHkgcnVsZXMgd2hpY2ggb2NjdXIgYXQgdGhlIHNhbWUgYHN0YXJ0YC4uLlxuXHRcdFx0Ly9cdFx0IFRoaXMgd291bGQgcHJvYmFibHkgYWxsb3cgbW9yZSBpbnRlcmVzdGluZyB0aGluZ3MsIGJ1dCBpdCdzIG11Y2ggbXVjaCBzbG93ZXIuXG5cdFx0fVxuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXTtcblx0XHRsZXQgbmV4dFN0YXJ0ID0gc3RhcnQ7XG5cdFx0bGV0IGluZGV4ID0gMCwgcnVsZSA9IHVuZGVmaW5lZDtcblx0XHR3aGlsZSAocnVsZSA9IHRoaXMucnVsZXNbaW5kZXgrK10pIHtcblx0XHRcdGxldCBtYXRjaCA9IHJ1bGUucGFyc2UocGFyc2VyLCB0b2tlbnMsIG5leHRTdGFydCwgZW5kLCBzdGFjayk7XG5cdFx0XHRpZiAoIW1hdGNoICYmICFydWxlLm9wdGlvbmFsKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdG1hdGNoZWQucHVzaChtYXRjaCk7XG5cdFx0XHRcdG5leHRTdGFydCA9IG1hdGNoLm5leHRTdGFydDtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgd2UgZ2V0IGhlcmUsIHdlIG1hdGNoZWQgYWxsIHRoZSBydWxlcyFcblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0bmV4dFN0YXJ0XG5cdFx0fSk7XG5cdH1cblxuXG4vL1RPRE9DXG5cdC8vIFwiZ2F0aGVyXCIgYXJndW1lbnRzIGluIHByZXBhcmF0aW9uIHRvIGNhbGwgYHRvU291cmNlKClgXG5cdC8vIE9ubHkgY2FsbGFibGUgYWZ0ZXIgcGFyc2UgaXMgY29tcGxldGVkLlxuXHQvLyBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSB0aGUgYG1hdGNoZWRgIGFycmF5IGluZGV4ZWQgYnlcblx0Ly9cdFx0LSBgbWF0Y2guYXJndW1lbnRgOlx0XHRhcmd1bWVudCBzZXQgd2hlbiBydWxlIHdhcyBkZWNsYXJlZCwgZWc6IGB7dmFsdWU6bGl0ZXJhbH1gID0+IGB2YWx1ZWBcblx0Ly9cdFx0LSBgbWF0Y2gucnVsZU5hbWVgOlx0XHRuYW1lIG9mIHJ1bGUgd2hlbiBkZWZpbmVkXG5cdC8vXHRcdC0gYHJ1bGUgdHlwZWA6XHRcdFx0XHRuYW1lIG9mIHRoZSBydWxlIHR5cGVcblx0Ly8gTk9URTogbWVtb2l6ZXMgdGhlIHJlc3VsdHMuXG5cdGdldCByZXN1bHRzKCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdGxldCByZXN1bHRzID0gdGhpcy5fYWRkUmVzdWx0cyh7fSwgdGhpcy5tYXRjaGVkKTtcblx0XHRpZiAodGhpcy5jb21tZW50KSByZXN1bHRzLmNvbW1lbnQgPSB0aGlzLmNvbW1lbnQ7XG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH1cblxuXHRfYWRkUmVzdWx0cyhyZXN1bHRzLCBtYXRjaGVkKSB7XG5cdFx0bGV0IGluZGV4ID0gMCwgbWF0Y2ggPSB1bmRlZmluZWQ7XG5cdFx0d2hpbGUgKG1hdGNoID0gbWF0Y2hlZFtpbmRleCsrXSkge1xuXHRcdFx0aWYgKG1hdGNoLnByb21vdGUpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX2FkZFJlc3VsdHMocmVzdWx0cywgbWF0Y2gubWF0Y2hlZCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0bGV0IGFyZ05hbWUgPSBtYXRjaC5hcmd1bWVudCB8fCBtYXRjaC5ydWxlTmFtZSB8fCBtYXRjaC5jb25zdHJ1Y3Rvci5uYW1lO1xuXHRcdFx0XHQvLyBJZiBhcmcgYWxyZWFkeSBleGlzdHMsIGNvbnZlcnQgdG8gYW4gYXJyYXlcblx0XHRcdFx0aWYgKGFyZ05hbWUgaW4gcmVzdWx0cykge1xuXHRcdFx0XHRcdGlmICghQXJyYXkuaXNBcnJheShyZXN1bHRzW2FyZ05hbWVdKSkgcmVzdWx0c1thcmdOYW1lXSA9IFtyZXN1bHRzW2FyZ05hbWVdXTtcblx0XHRcdFx0XHRyZXN1bHRzW2FyZ05hbWVdLnB1c2gobWF0Y2gpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHJlc3VsdHNbYXJnTmFtZV0gPSBtYXRjaDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0cztcblx0fVxuXG5cdC8vIFJldHVybiBgdG9Tb3VyY2UoKWAgZm9yIG91ciBgcmVzdWx0c2AgYXMgYSBtYXAuXG5cdC8vIElmIHlvdSBwYXNzIGBrZXlzYCwgd2UnbGwgcmVzdHJpY3QgdG8ganVzdCB0aG9zZSBrZXlzLlxuXHRnZXRNYXRjaGVkU291cmNlKGNvbnRleHQsIC4uLmtleXMpIHtcblx0XHRsZXQgcmVzdWx0cyA9IHRoaXMucmVzdWx0cztcblx0XHRsZXQgb3V0cHV0ID0ge307XG5cdFx0aWYgKCFrZXlzLmxlbmd0aCkga2V5cyA9IE9iamVjdC5rZXlzKHJlc3VsdHMpO1xuXHRcdGtleXMuZm9yRWFjaChrZXkgPT4ge1xuXHRcdFx0bGV0IHZhbHVlID0gcmVzdWx0c1trZXldO1xuXHRcdFx0aWYgKHZhbHVlID09IG51bGwpIHJldHVybjtcblx0XHRcdGlmICh2YWx1ZS50b1NvdXJjZSkgb3V0cHV0W2tleV0gPSB2YWx1ZS50b1NvdXJjZShjb250ZXh0KTtcblx0XHRcdGVsc2Ugb3V0cHV0W2tleV0gPSB2YWx1ZTtcblx0XHR9KTtcblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0Ly8gRWNobyB0aGlzIHJ1bGUgYmFjayBvdXQuXG5cdHRvU3RyaW5nKCkge1xuXHRcdHJldHVybiBgJHt0aGlzLnJ1bGVzLmpvaW4oXCIgXCIpfSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cblxufVxuXG4vLyBTeW50YWN0aWMgc3VnYXIgZm9yIGRlYnVnZ2luZ1xuUnVsZS5FeHByZXNzaW9uID0gY2xhc3MgZXhwcmVzc2lvbiBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBIHN0YXRlbWVudCB0YWtlcyB1cCB0aGUgZW50aXJlIGxpbmUuXG5SdWxlLlN0YXRlbWVudCA9IGNsYXNzIHN0YXRlbWVudCBleHRlbmRzIFJ1bGUuU2VxdWVuY2Uge31cblxuXG4vLyBBbHRlcm5hdGl2ZSBzeW50YXgsIG1hdGNoaW5nIG9uZSBvZiBhIG51bWJlciBvZiBkaWZmZXJlbnQgcnVsZXMuXG4vLyBUaGUgcmVzdWx0IG9mIGEgcGFyc2UgaXMgdGhlIGxvbmdlc3QgcnVsZSB0aGF0IGFjdHVhbGx5IG1hdGNoZWQuXG4vLyBOT1RFOiBDdXJyZW50bHkgdGFrZXMgdGhlIGxvbmdlc3QgdmFsaWQgbWF0Y2guXG4vLyBUT0RPOiBtYXRjaCBhbGwgdmFsaWQgYWx0ZXJuYXRpdmVzXG4vLyBUT0RPOiByZW5hbWU/XG5SdWxlLkFsdGVybmF0aXZlcyA9IGNsYXNzIEFsdGVybmF0aXZlcyBleHRlbmRzIFJ1bGUge1xuXHRjb25zdHJ1Y3RvciguLi5wcm9wcykge1xuXHRcdHN1cGVyKC4uLnByb3BzKTtcblx0XHRpZiAoIXRoaXMucnVsZXMpIHRoaXMucnVsZXMgPSBbXTtcblx0fVxuXG5cdC8vIFRlc3QgdG8gc2VlIGlmIGFueSBvZiBvdXIgYWx0ZXJuYXRpdmVzIGFyZSBmb3VuZCBBTllXSEVSRSBpbiB0aGUgdG9rZW5zLlxuXHQvLyBOT1RFOiB0aGlzIHNob3VsZCBvbmx5IGJlIGNhbGxlZCBpZiB3ZSdyZSBzcGVjaWZpZWQgYXMgYSBgdGVzdFJ1bGVgXG5cdC8vXHRcdCBhbmQgdGhlbiBvbmx5IGlmIGFsbCBvZiBvdXIgcnVsZXMgYXJlIGRldGVybWluaXN0aWMuXG5cdHRlc3QocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0bGV0IGluZGV4ID0gMCwgcnVsZSA9IHVuZGVmaW5lZDtcblx0XHR3aGlsZSAocnVsZSA9IHRoaXMucnVsZXNbaW5kZXgrK10pIHtcblx0XHRcdGlmIChydWxlLnRlc3QocGFyc2VyLCB0b2tlbnMsIHN0YXJ0LCBlbmQpKSByZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gRmluZCBhbGwgcnVsZXMgd2hpY2ggbWF0Y2ggYW5kIGRlbGVnYXRlIHRvIGBnZXRCZXN0TWF0Y2goKWAgdG8gcGljayB0aGUgYmVzdCBvbmUuXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCwgc3RhY2spIHtcblx0XHRsZXQgbWF0Y2hlcyA9IFtdO1xuXHRcdGxldCBpbmRleCA9IDAsIHJ1bGUgPSB1bmRlZmluZWQ7XG5cdFx0d2hpbGUgKHJ1bGUgPSB0aGlzLnJ1bGVzW2luZGV4KytdKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBydWxlLnBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCwgZW5kLCBzdGFjayk7XG5cdFx0XHRpZiAobWF0Y2gpIG1hdGNoZXMucHVzaChtYXRjaCk7XG5cdFx0fVxuXG5cdFx0aWYgKCFtYXRjaGVzLmxlbmd0aCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIHVuY29tbWVudCB0aGUgYmVsb3cgdG8gcHJpbnQgYWx0ZXJuYXRpdmVzXG5cdFx0Ly8gaWYgKG1hdGNoZXMubGVuZ3RoID4gMSkge1xuXHRcdC8vXHRjb25zb2xlLmluZm8odGhpcy5hcmd1bWVudCB8fCB0aGlzLnJ1bGVOYW1lLCBtYXRjaGVzLCBtYXRjaGVzLm1hcChtYXRjaCA9PiBtYXRjaC5tYXRjaGVkVGV4dCkpO1xuXHRcdC8vIH1cblxuXHRcdGxldCBiZXN0TWF0Y2ggPSAobWF0Y2hlcy5sZW5ndGggPT09IDEgPyBtYXRjaGVzWzBdIDogdGhpcy5nZXRCZXN0TWF0Y2gobWF0Y2hlcykpO1xuXG5cdFx0Ly8gYXNzaWduIGBhcmdOYW1lYCBvciBgcnVsZU5hbWVgIGZvciBgcmVzdWx0c2Bcblx0XHRpZiAodGhpcy5hcmd1bWVudCkgYmVzdE1hdGNoLmFyZ3VtZW50ID0gdGhpcy5hcmd1bWVudDtcblx0XHRlbHNlIGlmICh0aGlzLnJ1bGVOYW1lKSBiZXN0TWF0Y2gucnVsZU5hbWUgPSB0aGlzLnJ1bGVOYW1lO1xuLy9UT0RPOiBvdGhlciB0aGluZ3MgdG8gY29weSBoZXJlPz8/XG5cblx0XHRyZXR1cm4gYmVzdE1hdGNoO1xuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBcImJlc3RcIiBtYXRjaCBnaXZlbiBtb3JlIHRoYW4gb25lIG1hdGNoZXMgYXQgdGhlIGhlYWQgb2YgdGhlIHRva2Vucy5cblx0Ly8gRGVmYXVsdCBpcyB0byByZXR1cm4gdGhlIGxvbmdlc3QgbWF0Y2guXG5cdC8vIEltcGxlbWVudCBzb21ldGhpbmcgZWxzZSB0byBkbywgZWcsIHByZWNlZGVuY2UgcnVsZXMuXG5cdGdldEJlc3RNYXRjaChtYXRjaGVzKSB7XG5cdFx0cmV0dXJuIG1hdGNoZXMucmVkdWNlKGZ1bmN0aW9uIChiZXN0LCBjdXJyZW50KSB7XG5cdFx0XHRpZiAoY3VycmVudC5uZXh0U3RhcnQgPiBiZXN0Lm5leHRTdGFydCkgcmV0dXJuIGN1cnJlbnQ7XG5cdFx0XHRyZXR1cm4gYmVzdDtcblx0XHR9LCBtYXRjaGVzWzBdKTtcblx0fVxuXG5cdGFkZFJ1bGUocnVsZSkge1xuXHRcdHRoaXMucnVsZXMucHVzaChydWxlKTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLnRvU291cmNlKGNvbnRleHQpO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGAoJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLnJ1bGVzLmpvaW4oXCJ8XCIpfSkke3RoaXMub3B0aW9uYWwgPyAnPycgOiAnJ31gO1xuXHR9XG59O1xuXG5cblxuLy8gUmVwZWF0aW5nIHJ1bGUuXG4vL1x0YHRoaXMucnVsZWAgaXMgdGhlIHJ1bGUgdGhhdCByZXBlYXRzLlxuLy9cbi8vIEFmdGVyIG1hdGNoaW5nOlxuLy9cdGB0aGlzLm1hdGNoZWRgIGlzIGFycmF5IG9mIHJlc3VsdHMgb2YgbWF0Y2hlcy5cbi8vXG4vL1x0QXV0b21hdGljYWxseSBjb25zdW1lcyB3aGl0ZXNwYWNlIGJlZm9yZSBydWxlcy5cbi8vXHRJZiBkb2Vzbid0IG1hdGNoIGF0IGxlYXN0IG9uZSwgcmV0dXJucyBgdW5kZWZpbmVkYC5cblJ1bGUuUmVwZWF0ID0gY2xhc3MgUmVwZWF0IGV4dGVuZHMgUnVsZSB7XG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCwgc3RhY2spIHtcblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuXHRcdGxldCBuZXh0U3RhcnQgPSBzdGFydDtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0bGV0IG1hdGNoID0gdGhpcy5ydWxlLnBhcnNlKHBhcnNlciwgdG9rZW5zLCBuZXh0U3RhcnQsIGVuZCwgc3RhY2spO1xuXHRcdFx0aWYgKCFtYXRjaCkgYnJlYWs7XG5cblx0XHRcdG1hdGNoZWQucHVzaChtYXRjaCk7XG5cdFx0XHRuZXh0U3RhcnQgPSBtYXRjaC5uZXh0U3RhcnQ7XG5cdFx0fVxuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdG5leHRTdGFydFxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gXCJnYXRoZXJcIiBhcmd1bWVudHMgaW4gcHJlcGFyYXRpb24gdG8gY2FsbCBgdG9Tb3VyY2UoKWBcblx0Ly8gT25seSBjYWxsYWJsZSBhZnRlciBwYXJzZSBpcyBjb21wbGV0ZWQuXG5cdC8vIFJldHVybnMgYW4gYXJyYXkgd2l0aCBhcmd1bWVudHMgb2YgYWxsIHJlc3VsdHMuXG5cdC8vIE5PVEU6IG1lbW9pemVzIHRoZSByZXN1bHRzLlxuXHRnZXQgcmVzdWx0cygpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIHVuZGVmaW5lZDtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaGVkLm1hcCggbWF0Y2ggPT4gbWF0Y2gucmVzdWx0cyApO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdGlmICghdGhpcy5tYXRjaGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQubWFwKG1hdGNoID0+IG1hdGNoLnRvU291cmNlKGNvbnRleHQpKTtcblx0fVxuXG5cdHRvU3RyaW5nKCkge1xuXHRcdGxldCBpc0NvbXBvdW5kUnVsZSA9ICh0aGlzLnJ1bGUgaW5zdGFuY2VvZiBSdWxlLlNlcXVlbmNlKVxuXHRcdFx0XHRcdFx0ICB8fCAodGhpcy5ydWxlIGluc3RhbmNlb2YgUnVsZS5LZXl3b3JkICYmIHRoaXMucnVsZS5tYXRjaC5sZW5ndGggPiAxKTtcblx0XHRjb25zdCBydWxlID0gaXNDb21wb3VuZFJ1bGUgPyBgKCR7dGhpcy5ydWxlfSlgIDogYCR7dGhpcy5ydWxlfWA7XG5cdFx0cmV0dXJuIGAke3J1bGV9JHt0aGlzLm9wdGlvbmFsID8gJyonIDogJysnfWA7XG5cdH1cbn1cblxuXG4vLyBMaXN0IG1hdGNoIHJ1bGU6ICAgYFs8aXRlbT48ZGVsaW1pdGVyPl1gLiBlZ1wiIGBbe251bWJlcn0sXWAgdG8gbWF0Y2ggYDEsMiwzYFxuLy9cdGBydWxlLml0ZW1gIGlzIHRoZSBydWxlIGZvciBlYWNoIGl0ZW0sXG4vL1x0YHJ1bGUuZGVsaW1pdGVyYCBpcyB0aGUgZGVsaW1pdGVyIGJldHdlZW4gZWFjaCBpdGVtLlxuLy8gXHRgcnVsZS5tYXRjaGVkYCBpbiB0aGUgb3V0cHV0IGlzIHRoZSBsaXN0IG9mIHZhbHVlcy5cbi8vXG4vL1xuLy8gTk9URTogd2UgYXNzdW1lIHRoYXQgYSBMaXN0IHJ1bGUgd2lsbCBOT1QgcmVwZWF0ICg/Pz8/KVxuUnVsZS5MaXN0ID0gY2xhc3MgTGlzdCBleHRlbmRzIFJ1bGUge1xuXHRwYXJzZShwYXJzZXIsIHRva2Vucywgc3RhcnQgPSAwLCBlbmQsIHN0YWNrKSB7XG5cdFx0Ly8gZW5zdXJlIGl0ZW0gYW5kIGRlbGltaXRlciBhcmUgb3B0aW9uYWwgc28gd2UgZG9uJ3QgYmFyZiBpbiBgcGFyc2VSdWxlYFxuXHRcdHRoaXMuaXRlbS5vcHRpb25hbCA9IHRydWU7XG5cdFx0dGhpcy5kZWxpbWl0ZXIub3B0aW9uYWwgPSB0cnVlO1xuXG5cdFx0bGV0IG1hdGNoZWQgPSBbXTtcblx0XHRsZXQgbmV4dFN0YXJ0ID0gc3RhcnQ7XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdC8vIGdldCBuZXh0IGl0ZW0sIGV4aXRpbmcgaWYgbm90IGZvdW5kXG5cdFx0XHRsZXQgaXRlbSA9IHRoaXMuaXRlbS5wYXJzZShwYXJzZXIsIHRva2VucywgbmV4dFN0YXJ0LCBlbmQsIHN0YWNrKTtcblx0XHRcdGlmICghaXRlbSkgYnJlYWs7XG5cblx0XHRcdG1hdGNoZWQucHVzaChpdGVtKTtcblx0XHRcdG5leHRTdGFydCA9IGl0ZW0ubmV4dFN0YXJ0O1xuXG5cdFx0XHQvLyBnZXQgZGVsaW1pdGVyLCBleGl0aW5nIGlmIG5vdCBmb3VuZFxuXHRcdFx0bGV0IGRlbGltaXRlciA9IHRoaXMuZGVsaW1pdGVyLnBhcnNlKHBhcnNlciwgdG9rZW5zLCBuZXh0U3RhcnQsIGVuZCwgc3RhY2spO1xuXHRcdFx0aWYgKCFkZWxpbWl0ZXIpIGJyZWFrO1xuXHRcdFx0bmV4dFN0YXJ0ID0gZGVsaW1pdGVyLm5leHRTdGFydDtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSBkaWRuJ3QgZ2V0IGFueSBtYXRjaGVzLCBmb3JnZXQgaXQuXG5cdFx0aWYgKG1hdGNoZWQubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0cmV0dXJuIHRoaXMuY2xvbmUoe1xuXHRcdFx0bWF0Y2hlZCxcblx0XHRcdG5leHRTdGFydFxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gUmV0dXJucyBsaXN0IG9mIHZhbHVlcyBhcyBzb3VyY2UuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRpZiAoIXRoaXMubWF0Y2hlZCkgcmV0dXJuIFtdO1xuXHRcdHJldHVybiB0aGlzLm1hdGNoZWQubWFwKCBtYXRjaCA9PiBtYXRjaC50b1NvdXJjZShjb250ZXh0KSApO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIGBbJHt0aGlzLmFyZ3VtZW50ID8gdGhpcy5hcmd1bWVudCtcIjpcIiA6IFwiXCJ9JHt0aGlzLml0ZW19ICR7dGhpcy5kZWxpbWl0ZXJ9XSR7dGhpcy5vcHRpb25hbCA/ICc/JyA6ICcnfWA7XG5cdH1cbn07XG5cblxuXG4vLyBCbGFuayBsaW5lIHJlcHJlc2VudGF0aW9uIGluIHBhcnNlciBvdXRwdXQuXG5SdWxlLkJsYW5rTGluZSA9IGNsYXNzIGJsYW5rX2xpbmUgZXh0ZW5kcyBSdWxlIHtcblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiBcIlxcblwiO1xuXHR9XG59XG5cbi8vIFBhcnNlciBlcnJvciByZXByZXNlbnRhdGlvbiBpbiBwYXJzZXIgb3V0cHV0LlxuUnVsZS5TdGF0ZW1lbnRQYXJzZUVycm9yID0gY2xhc3MgcGFyc2VfZXJyb3IgZXh0ZW5kcyBSdWxlIHtcblx0Y29uc3RydWN0b3IoLi4ucHJvcHMpIHtcblx0XHRzdXBlciguLi5wcm9wcyk7XG5cdFx0aWYgKFBhcnNlci5XQVJOKSBjb25zb2xlLndhcm4odGhpcy5tZXNzYWdlKTtcblx0fVxuXG5cdGdldCBtZXNzYWdlKCkge1xuXHRcdGlmICh0aGlzLnBhcnNlZCkge1xuXHRcdFx0cmV0dXJuIFwiQ0FOVCBQQVJTRSBFTlRJUkUgU1RBVEVNRU5UXFxuXCJcblx0XHRcdFx0ICsgXCJQQVJTRUQgICAgICA6IGBcIisgdGhpcy5wYXJzZWQgKyBcImBcXG5cIlxuXHRcdFx0XHQgKyBcIkNBTidUIFBBUlNFIDogYFwiKyB0aGlzLnVucGFyc2VkICsgXCJgXCI7XG5cdFx0fVxuXHRcdHJldHVybiBcIkNBTidUIFBBUlNFIFNUQVRFTUVOVDogYFwiICsgdGhpcy51bnBhcnNlZCArIFwiYFwiO1xuXHR9XG5cblx0dG9Tb3VyY2UoY29udGV4dCkge1xuXHRcdHJldHVybiBcIi8vIFwiICsgdGhpcy5tZXNzYWdlLnNwbGl0KFwiXFxuXCIpLmpvaW4oXCJcXG4vLyBcIik7XG5cdH1cbn1cblxuXG4vLyBDb21tZW50IHJ1bGUgLS0gbWF0Y2hlcyB0b2tlbnMgb2YgdHlwZSBgVG9rZW5pemVyLkNvbW1lbnRgLlxuUnVsZS5Db21tZW50ID0gY2xhc3MgY29tbWVudCBleHRlbmRzIFJ1bGUge1xuXHQvLyBDb21tZW50cyBhcmUgc3BlY2lhbGx5IG5vZGVzIGluIG91ciB0b2tlbiBzdHJlYW0uXG5cdHBhcnNlKHBhcnNlciwgdG9rZW5zLCBzdGFydCA9IDAsIGVuZCwgc3RhY2spIHtcblx0XHRsZXQgdG9rZW4gPSB0b2tlbnNbc3RhcnRdO1xuXHRcdGlmICghKHRva2VuIGluc3RhbmNlb2YgVG9rZW5pemVyLkNvbW1lbnQpKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiB0aGlzLmNsb25lKHtcblx0XHRcdG1hdGNoZWQ6IHRva2VuLFxuXHRcdFx0bmV4dFN0YXJ0OiBzdGFydCArIDFcblx0XHR9KTtcblx0fVxuXG5cdHRvU291cmNlKGNvbnRleHQpIHtcblx0XHRyZXR1cm4gYC8vJHt0aGlzLm1hdGNoZWQud2hpdGVzcGFjZX0ke3RoaXMubWF0Y2hlZC5jb21tZW50fWA7XG5cdH1cbn1cblxuXG4vLyBBIGJsb2NrIGlzIHVzZWQgdG8gcGFyc2UgYSBuZXN0ZWQgYmxvY2sgb2Ygc3RhdGVtZW50cy5cblJ1bGUuQmxvY2sgPSBjbGFzcyBibG9jayBleHRlbmRzIFJ1bGUuU3RhdGVtZW50IHtcblxuXHQvLyBQYXJzZSB0aGUgZW50aXJlIGBibG9ja2AsIHJldHVybmluZyByZXN1bHRzLlxuXHRwYXJzZUJsb2NrKHBhcnNlciwgYmxvY2ssIGluZGVudCA9IDApIHtcblx0XHRsZXQgbWF0Y2hlZCA9IFtdO1xuLy9jb25zb2xlLndhcm4oXCJibG9jazpcIiwgYmxvY2spO1xuXHRcdGJsb2NrLmNvbnRlbnRzLmZvckVhY2goKGl0ZW0sIGluZGV4KSA9PiB7XG5cdFx0XHRsZXQgcmVzdWx0O1xuXHRcdFx0aWYgKGl0ZW0ubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdG1hdGNoZWQucHVzaChuZXcgUnVsZS5CbGFua0xpbmUoKSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgVG9rZW5pemVyLkJsb2NrKSB7XG5cdFx0XHRcdGxldCBsYXN0ID0gbWF0Y2hlZFttYXRjaGVkLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHRpZiAobGFzdC5wYXJzZUJsb2NrKSB7XG5cdFx0XHRcdFx0bGFzdC5wYXJzZUJsb2NrKHBhcnNlciwgaXRlbSwgaW5kZW50ICsgMSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0bGV0IGJsb2NrID0gdGhpcy5wYXJzZUJsb2NrKHBhcnNlciwgaXRlbSwgaW5kZW50ICsgMSk7XG5cdFx0XHRcdFx0aWYgKGJsb2NrICE9PSB1bmRlZmluZWQpIG1hdGNoZWQucHVzaChibG9jayk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRtYXRjaGVkID0gbWF0Y2hlZC5jb25jYXQodGhpcy5wYXJzZVN0YXRlbWVudChwYXJzZXIsIGl0ZW0pKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHJldHVybiBuZXcgUnVsZS5CbG9jayh7XG5cdFx0XHRpbmRlbnQsXG5cdFx0XHRtYXRjaGVkXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBQYXJzZSBhIHNpbmdsZSBzdGF0ZW1lbnQgKGEgbGluZSdzIHdvcnRoIG9mIGB0b2tlbnNgKS5cblx0Ly8gU2tpcHMgd2hpdGVzcGFjZSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaW5lLlxuXHQvLyBBdXRvLW1hdGNoZXMgY29tbWVudCBpbiB0aGUgbWlkZGxlIG9mIHRoZSBsaW5lLlxuXHQvLyBSZXR1cm5zIGFycmF5IG9mIHJlc3VsdHMuXG5cdHBhcnNlU3RhdGVtZW50KHBhcnNlciwgdG9rZW5zKSB7XG5cdFx0bGV0IHJlc3VsdHMgPSBbXTtcblx0XHRsZXQgc3RhcnQgPSAwLCBlbmQgPSB0b2tlbnMubGVuZ3RoO1xuXHRcdGxldCBzdGF0ZW1lbnQsIGNvbW1lbnQ7XG5cblx0XHQvLyBjaGVjayBmb3IgYW4gaW5kZW50IGF0IHRoZSBzdGFydCBvZiB0aGUgbGluZVxuXHRcdGlmICh0b2tlbnNbc3RhcnRdIGluc3RhbmNlb2YgVG9rZW5pemVyLldoaXRlc3BhY2UpIHN0YXJ0Kys7XG5cblx0XHQvLyBjaGVjayBmb3IgYSBjb21tZW50IGF0IHRoZSBlbmQgb2YgdGhlIHRva2Vuc1xuXHRcdGlmICh0b2tlbnNbZW5kLTFdIGluc3RhbmNlb2YgVG9rZW5pemVyLkNvbW1lbnQpIHtcblx0XHRcdGNvbW1lbnQgPSBwYXJzZXIucGFyc2VSdWxlT3JEaWUoXCJjb21tZW50XCIsIHRva2VucywgZW5kLTEsIGVuZCwgdW5kZWZpbmVkLCBcInBhcnNlU3RhdGVtZW50XCIpO1xuXHRcdFx0Ly8gYWRkIGNvbW1lbnQgRklSU1QgaWYgZm91bmRcblx0XHRcdHJlc3VsdHMucHVzaChjb21tZW50KTtcblx0XHRcdGVuZC0tO1xuXHRcdH1cblxuXHRcdC8vIHBhcnNlIHRoZSByZXN0IGFzIGEgXCJzdGF0ZW1lbnRcIlxuXHRcdHN0YXRlbWVudCA9IHBhcnNlci5wYXJzZVJ1bGVPckRpZShcInN0YXRlbWVudFwiLCB0b2tlbnMsIHN0YXJ0LCBlbmQsIHVuZGVmaW5lZCwgXCJwYXJzZVN0YXRlbWVudFwiKTtcblx0XHQvLyBjb21wbGFpbiBpZiBubyBzdGF0ZW1lbnQgYW5kIG5vIGNvbW1lbnRcblx0XHRpZiAoIXN0YXRlbWVudCAmJiAhY29tbWVudCkge1xuXHRcdFx0bGV0IGVycm9yID0gbmV3IFJ1bGUuU3RhdGVtZW50UGFyc2VFcnJvcih7XG5cdFx0XHRcdHVucGFyc2VkOiB0b2tlbnMuc2xpY2Uoc3RhcnQsIGVuZCkuam9pbihcIiBcIilcblx0XHRcdH0pO1xuXHRcdFx0cmVzdWx0cy5wdXNoKGVycm9yKTtcblx0XHR9XG5cblx0XHQvLyBjb21wbGFpbiBjYW4ndCBwYXJzZSB0aGUgZW50aXJlIGxpbmUhXG5cdFx0ZWxzZSBpZiAoc3RhdGVtZW50ICYmIHN0YXRlbWVudC5uZXh0U3RhcnQgIT09IGVuZCkge1xuXHRcdFx0bGV0IGVycm9yID0gbmV3IFJ1bGUuU3RhdGVtZW50UGFyc2VFcnJvcih7XG5cdFx0XHRcdHBhcnNlZCA6IHRva2Vucy5zbGljZShzdGFydCwgc3RhdGVtZW50Lm5leHRTdGFydCkuam9pbihcIiBcIiksXG5cdFx0XHRcdHVucGFyc2VkIDogdG9rZW5zLnNsaWNlKHN0YXRlbWVudC5uZXh0U3RhcnQsIGVuZCkuam9pbihcIiBcIilcblx0XHRcdH0pO1xuXHRcdFx0cmVzdWx0cy5wdXNoKGVycm9yKTtcblx0XHR9XG5cblx0XHQvLyBPdGhlcndpc2UgYWRkIHRoZSBzdGF0ZW1lbnRcblx0XHRlbHNlIGlmIChzdGF0ZW1lbnQpIHtcblx0XHRcdHJlc3VsdHMucHVzaChzdGF0ZW1lbnQpO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9XG5cblx0Ly8gUmV0dXJuIHNvdXJjZSBmb3IgdGhpcyBibG9jayBhcyBhbiBhcnJheSBvZiBpbmRlbnRlZCBsaW5lcyBXSVRIT1VUIGB7YCBPUiBgfWAuXG5cdGJsb2NrVG9Tb3VyY2UoY29udGV4dCwgYmxvY2sgPSB0aGlzLm1hdGNoZWQpIHtcblx0XHRsZXQgcmVzdWx0cyA9IFtdLCBzdGF0ZW1lbnQ7XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGJsb2NrLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXQgbWF0Y2ggPSBibG9ja1tpXTtcbi8vY29uc29sZS5pbmZvKGksIG1hdGNoKTtcbnRyeSB7XG5cdFx0XHRzdGF0ZW1lbnQgPSBtYXRjaC50b1NvdXJjZShjb250ZXh0KSB8fCBcIlwiO1xufSBjYXRjaCAoZSkge1xuXHRjb25zb2xlLmVycm9yKGUpO1xuXHRjb25zb2xlLndhcm4oXCJFcnJvciBjb252ZXJ0aW5nIGJsb2NrOiBcIiwgYmxvY2ssIFwic3RhdGVtZW50OlwiLCBtYXRjaCk7XG59XG4vL2NvbnNvbGUuaW5mbyhpLCBzdGF0ZW1lbnQpO1xuXHRcdFx0aWYgKGlzV2hpdGVzcGFjZShzdGF0ZW1lbnQpKSB7XG5cdFx0XHRcdHJlc3VsdHMucHVzaChcIlwiKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoc3RhdGVtZW50KSkge1xuXHRcdFx0XHRyZXN1bHRzID0gcmVzdWx0cy5jb25jYXQoc3RhdGVtZW50KTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHR5cGVvZiBzdGF0ZW1lbnQgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0c3RhdGVtZW50ID0gc3RhdGVtZW50LnNwbGl0KFwiXFxuXCIpO1xuXHRcdFx0XHRyZXN1bHRzID0gcmVzdWx0cy5jb25jYXQoc3RhdGVtZW50KTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJibG9ja1RvU291cmNlKCk6IERPTidUIEtOT1cgSE9XIFRPIFdPUksgV0lUSFxcblxcdFwiLCBzdGF0ZW1lbnQsIFwiXFxuXFx0ZnJvbSBtYXRjaFwiLCBtYXRjaCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICh0aGlzLmluZGVudCAhPT0gMCkge1xuXHRcdFx0cmV0dXJuIFwiXFx0XCIgKyByZXN1bHRzLmpvaW4oXCJcXG5cXHRcIik7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHRzLmpvaW4oXCJcXG5cIik7XG5cdH1cblxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIFwiIHtcXG5cIiArIHRoaXMuYmxvY2tUb1NvdXJjZShjb250ZXh0KSArIFwiXFxuXCIgKyBcIn1cIjtcblx0fVxuXG5cdC8vIEZvcm1hdCBhcnJheSBvZiBgc3RhdGVtZW50c2AgYXMgYSBKUyBvdXRwdXQgYmxvY2s6XG5cdC8vXHQtIGlmIGBzdGF0ZW1lbnRzYCBpcyBlbXB0eSwgcmV0dXJucyBge31gXG5cdC8vXHQtIGlmIGBzdGF0ZW1lbnRzIGlzIGEgc2luZ2xlIGxpbmUsIHJldHVybnMgYHsgc3RhdGVtZW50IH1gXG5cdC8vXHQtIGVsc2UgcmV0dXJucyBtdWx0aXBsZSBsaW5lc1xuXHRzdGF0aWMgZW5jbG9zZVN0YXRlbWVudHMoLi4uYXJncykge1xuXHRcdHZhciBzdGF0ZW1lbnRzID0gW107XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXQgYXJnID0gYXJnc1tpXTtcblx0XHRcdGlmIChBcnJheS5pc0FycmF5KGFyZykpIHtcblx0XHRcdFx0c3RhdGVtZW50cyA9IHN0YXRlbWVudHMuY29uY2F0KGFyZyk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdHN0YXRlbWVudHMucHVzaChhcmcpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRzdGF0ZW1lbnRzID0gc3RhdGVtZW50cy5qb2luKFwiXFxuXCIpO1xuXG5cdFx0aWYgKCFzdGF0ZW1lbnRzKSByZXR1cm4gXCJ7fVwiO1xuXHRcdGlmICghc3RhdGVtZW50cy5pbmNsdWRlcyhcIlxcblwiKSAmJiBzdGF0ZW1lbnRzLmxlbmd0aCA8IDQwKSB7XG5cdFx0XHRyZXR1cm4gYHsgJHtzdGF0ZW1lbnRzLnRyaW0oKX0gfWA7XG5cdFx0fVxuXHRcdGlmIChzdGF0ZW1lbnRzWzBdICE9PSBcIlxcdFwiKSBzdGF0ZW1lbnRzID0gYFxcdCR7c3RhdGVtZW50c31gO1xuXHRcdHJldHVybiBge1xcbiR7c3RhdGVtZW50c31cXG59YDtcblx0fVxuXG59XG5cblxuLy8gYFN0YXRlbWVudHNgIGFyZSBhIHNwZWNpYWwgY2FzZSBmb3IgYSBibG9jayBvZiBgU3RhdGVtZW50YCBydWxlc1xuLy9cdHRoYXQgdW5kZXJzdGFuZCBuZXN0aW5nIGFuZCBjb21tZW50cy5cbi8vXG4vLyBUaGlzIGlzIGEgdG9wLWxldmVsIGNvbnN0cnVjdCwgZS5nLiB1c2VkIHRvIHBhcnNlIGFuIGVudGlyZSBmaWxlLlxuUnVsZS5TdGF0ZW1lbnRzID0gY2xhc3Mgc3RhdGVtZW50cyBleHRlbmRzIFJ1bGUuQmxvY2sge1xuXG5cdC8vIFNwbGl0IHN0YXRlbWVudHMgdXAgaW50byBibG9ja3MgYW5kIHBhcnNlICdlbS5cblx0cGFyc2UocGFyc2VyLCB0b2tlbnMsIHN0YXJ0ID0gMCwgZW5kID0gdG9rZW5zLmxlbmd0aCwgc3RhY2spIHtcblx0XHR2YXIgYmxvY2sgPSBUb2tlbml6ZXIuYnJlYWtJbnRvQmxvY2tzKHRva2Vucywgc3RhcnQsIGVuZCk7XG5cblx0XHRsZXQgbWF0Y2hlZCA9IHRoaXMucGFyc2VCbG9jayhwYXJzZXIsIGJsb2NrKTtcblx0XHRpZiAoIW1hdGNoZWQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5jbG9uZSh7XG5cdFx0XHRtYXRjaGVkLFxuXHRcdFx0bmV4dFN0YXJ0OiBlbmRcblx0XHR9KTtcblx0fVxuXG5cdC8vIE91dHB1dCBzdGF0ZW1lbnRzIFdJVEhPVVQgY3VybHkgYnJhY2VzIGFyb3VuZCB0aGVtLlxuXHR0b1NvdXJjZShjb250ZXh0KSB7XG5cdFx0cmV0dXJuIHRoaXMubWF0Y2hlZC5ibG9ja1RvU291cmNlKGNvbnRleHQpO1xuXHR9XG59XG5cblxuLy8gQSBgQmxvY2tTdGF0ZW1lbnRgIChlLmcuIGFuIGBpZmAgb3IgYHJlcGVhdGApOlxuLy9cdC0gaGFzIGFuIGluaXRpYWwgYHN0YXRlbWVudGBcbi8vXHQtIE1BWSBoYXZlIGFuIGlubGluZSBgc3RhdGVtZW50YCAob24gdGhlIHNhbWUgbGluZSwgZ2VuZXJhbGx5IGFmdGVyIGEgYDpgKVxuLy9cdC0gTUFZIGhhdmUgY29udGVudHMgYXMgYW4gZW1iZWRkZWQgYGJsb2NrYFxuLy9cbi8vXHRJbiB5b3VyIGBnZXRNYXRjaGVkU291cmNlKClgLCBgYmxvY2tgIHdpbGwgYmUgdGhlIHJlc3VsdGluZyBibG9jayBvdXRwdXQsIGlmIHRoZXJlIGlzIG9uZS5cbi8vXHRJdCdzIHVwIHRvIHlvdXIgcnVsZSB0byBkbyBzb21ldGhpbmcgd2l0aCBpdC4uLlxuUnVsZS5CbG9ja1N0YXRlbWVudCA9IGNsYXNzIGJsb2NrX3N0YXRlbWVudCBleHRlbmRzIFJ1bGUuQmxvY2sge1xuXG5cdC8vIFBhcnNlIGEgYmxvY2sgYW5kIGFkZCBpdCB0byBgdGhpcy5ibG9ja2Bcblx0cGFyc2VCbG9jayhwYXJzZXIsIGJsb2NrLCBpbmRlbnQgPSAwKSB7XG5cdFx0dGhpcy5ibG9jayA9IHN1cGVyLnBhcnNlQmxvY2soLi4uYXJndW1lbnRzKTtcblx0fVxuXG5cdC8vIFJldHVybiBgdG9Tb3VyY2UoKWAgZm9yIG91ciBgcmVzdWx0c2AgYXMgYSBtYXAuXG5cdC8vIElmIHlvdSBwYXNzIGBrZXlzYCwgd2UnbGwgcmVzdHJpY3QgdG8ganVzdCB0aG9zZSBrZXlzLlxuXHRnZXRNYXRjaGVkU291cmNlKGNvbnRleHQsIC4uLmtleXMpIHtcblx0XHRsZXQgb3V0cHV0ID0gc3VwZXIuZ2V0TWF0Y2hlZFNvdXJjZShjb250ZXh0LCAuLi5rZXlzKTtcblx0XHQvLyBhZGQgYGJsb2NrYCB0byBvdXRwdXQgaWYgZGVmaW5lZC5cblx0XHRpZiAodGhpcy5ibG9jaykge1xuXHRcdFx0b3V0cHV0LmJsb2NrID0gdGhpcy5ibG9jay5ibG9ja1RvU291cmNlKGNvbnRleHQpO1xuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG59XG5cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9SdWxlLmpzIiwiXG4vKipcbiAqIFdoZW4gc291cmNlIG1hcHMgYXJlIGVuYWJsZWQsIGBzdHlsZS1sb2FkZXJgIHVzZXMgYSBsaW5rIGVsZW1lbnQgd2l0aCBhIGRhdGEtdXJpIHRvXG4gKiBlbWJlZCB0aGUgY3NzIG9uIHRoZSBwYWdlLiBUaGlzIGJyZWFrcyBhbGwgcmVsYXRpdmUgdXJscyBiZWNhdXNlIG5vdyB0aGV5IGFyZSByZWxhdGl2ZSB0byBhXG4gKiBidW5kbGUgaW5zdGVhZCBvZiB0aGUgY3VycmVudCBwYWdlLlxuICpcbiAqIE9uZSBzb2x1dGlvbiBpcyB0byBvbmx5IHVzZSBmdWxsIHVybHMsIGJ1dCB0aGF0IG1heSBiZSBpbXBvc3NpYmxlLlxuICpcbiAqIEluc3RlYWQsIHRoaXMgZnVuY3Rpb24gXCJmaXhlc1wiIHRoZSByZWxhdGl2ZSB1cmxzIHRvIGJlIGFic29sdXRlIGFjY29yZGluZyB0byB0aGUgY3VycmVudCBwYWdlIGxvY2F0aW9uLlxuICpcbiAqIEEgcnVkaW1lbnRhcnkgdGVzdCBzdWl0ZSBpcyBsb2NhdGVkIGF0IGB0ZXN0L2ZpeFVybHMuanNgIGFuZCBjYW4gYmUgcnVuIHZpYSB0aGUgYG5wbSB0ZXN0YCBjb21tYW5kLlxuICpcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjc3MpIHtcbiAgLy8gZ2V0IGN1cnJlbnQgbG9jYXRpb25cbiAgdmFyIGxvY2F0aW9uID0gdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3cubG9jYXRpb247XG5cbiAgaWYgKCFsb2NhdGlvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcImZpeFVybHMgcmVxdWlyZXMgd2luZG93LmxvY2F0aW9uXCIpO1xuICB9XG5cblx0Ly8gYmxhbmsgb3IgbnVsbD9cblx0aWYgKCFjc3MgfHwgdHlwZW9mIGNzcyAhPT0gXCJzdHJpbmdcIikge1xuXHQgIHJldHVybiBjc3M7XG4gIH1cblxuICB2YXIgYmFzZVVybCA9IGxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgbG9jYXRpb24uaG9zdDtcbiAgdmFyIGN1cnJlbnREaXIgPSBiYXNlVXJsICsgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXFwvW15cXC9dKiQvLCBcIi9cIik7XG5cblx0Ly8gY29udmVydCBlYWNoIHVybCguLi4pXG5cdC8qXG5cdFRoaXMgcmVndWxhciBleHByZXNzaW9uIGlzIGp1c3QgYSB3YXkgdG8gcmVjdXJzaXZlbHkgbWF0Y2ggYnJhY2tldHMgd2l0aGluXG5cdGEgc3RyaW5nLlxuXG5cdCAvdXJsXFxzKlxcKCAgPSBNYXRjaCBvbiB0aGUgd29yZCBcInVybFwiIHdpdGggYW55IHdoaXRlc3BhY2UgYWZ0ZXIgaXQgYW5kIHRoZW4gYSBwYXJlbnNcblx0ICAgKCAgPSBTdGFydCBhIGNhcHR1cmluZyBncm91cFxuXHQgICAgICg/OiAgPSBTdGFydCBhIG5vbi1jYXB0dXJpbmcgZ3JvdXBcblx0ICAgICAgICAgW14pKF0gID0gTWF0Y2ggYW55dGhpbmcgdGhhdCBpc24ndCBhIHBhcmVudGhlc2VzXG5cdCAgICAgICAgIHwgID0gT1Jcblx0ICAgICAgICAgXFwoICA9IE1hdGNoIGEgc3RhcnQgcGFyZW50aGVzZXNcblx0ICAgICAgICAgICAgICg/OiAgPSBTdGFydCBhbm90aGVyIG5vbi1jYXB0dXJpbmcgZ3JvdXBzXG5cdCAgICAgICAgICAgICAgICAgW14pKF0rICA9IE1hdGNoIGFueXRoaW5nIHRoYXQgaXNuJ3QgYSBwYXJlbnRoZXNlc1xuXHQgICAgICAgICAgICAgICAgIHwgID0gT1Jcblx0ICAgICAgICAgICAgICAgICBcXCggID0gTWF0Y2ggYSBzdGFydCBwYXJlbnRoZXNlc1xuXHQgICAgICAgICAgICAgICAgICAgICBbXikoXSogID0gTWF0Y2ggYW55dGhpbmcgdGhhdCBpc24ndCBhIHBhcmVudGhlc2VzXG5cdCAgICAgICAgICAgICAgICAgXFwpICA9IE1hdGNoIGEgZW5kIHBhcmVudGhlc2VzXG5cdCAgICAgICAgICAgICApICA9IEVuZCBHcm91cFxuICAgICAgICAgICAgICAqXFwpID0gTWF0Y2ggYW55dGhpbmcgYW5kIHRoZW4gYSBjbG9zZSBwYXJlbnNcbiAgICAgICAgICApICA9IENsb3NlIG5vbi1jYXB0dXJpbmcgZ3JvdXBcbiAgICAgICAgICAqICA9IE1hdGNoIGFueXRoaW5nXG4gICAgICAgKSAgPSBDbG9zZSBjYXB0dXJpbmcgZ3JvdXBcblx0IFxcKSAgPSBNYXRjaCBhIGNsb3NlIHBhcmVuc1xuXG5cdCAvZ2kgID0gR2V0IGFsbCBtYXRjaGVzLCBub3QgdGhlIGZpcnN0LiAgQmUgY2FzZSBpbnNlbnNpdGl2ZS5cblx0ICovXG5cdHZhciBmaXhlZENzcyA9IGNzcy5yZXBsYWNlKC91cmxcXHMqXFwoKCg/OlteKShdfFxcKCg/OlteKShdK3xcXChbXikoXSpcXCkpKlxcKSkqKVxcKS9naSwgZnVuY3Rpb24oZnVsbE1hdGNoLCBvcmlnVXJsKSB7XG5cdFx0Ly8gc3RyaXAgcXVvdGVzIChpZiB0aGV5IGV4aXN0KVxuXHRcdHZhciB1bnF1b3RlZE9yaWdVcmwgPSBvcmlnVXJsXG5cdFx0XHQudHJpbSgpXG5cdFx0XHQucmVwbGFjZSgvXlwiKC4qKVwiJC8sIGZ1bmN0aW9uKG8sICQxKXsgcmV0dXJuICQxOyB9KVxuXHRcdFx0LnJlcGxhY2UoL14nKC4qKSckLywgZnVuY3Rpb24obywgJDEpeyByZXR1cm4gJDE7IH0pO1xuXG5cdFx0Ly8gYWxyZWFkeSBhIGZ1bGwgdXJsPyBubyBjaGFuZ2Vcblx0XHRpZiAoL14oI3xkYXRhOnxodHRwOlxcL1xcL3xodHRwczpcXC9cXC98ZmlsZTpcXC9cXC9cXC8pL2kudGVzdCh1bnF1b3RlZE9yaWdVcmwpKSB7XG5cdFx0ICByZXR1cm4gZnVsbE1hdGNoO1xuXHRcdH1cblxuXHRcdC8vIGNvbnZlcnQgdGhlIHVybCB0byBhIGZ1bGwgdXJsXG5cdFx0dmFyIG5ld1VybDtcblxuXHRcdGlmICh1bnF1b3RlZE9yaWdVcmwuaW5kZXhPZihcIi8vXCIpID09PSAwKSB7XG5cdFx0ICBcdC8vVE9ETzogc2hvdWxkIHdlIGFkZCBwcm90b2NvbD9cblx0XHRcdG5ld1VybCA9IHVucXVvdGVkT3JpZ1VybDtcblx0XHR9IGVsc2UgaWYgKHVucXVvdGVkT3JpZ1VybC5pbmRleE9mKFwiL1wiKSA9PT0gMCkge1xuXHRcdFx0Ly8gcGF0aCBzaG91bGQgYmUgcmVsYXRpdmUgdG8gdGhlIGJhc2UgdXJsXG5cdFx0XHRuZXdVcmwgPSBiYXNlVXJsICsgdW5xdW90ZWRPcmlnVXJsOyAvLyBhbHJlYWR5IHN0YXJ0cyB3aXRoICcvJ1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBwYXRoIHNob3VsZCBiZSByZWxhdGl2ZSB0byBjdXJyZW50IGRpcmVjdG9yeVxuXHRcdFx0bmV3VXJsID0gY3VycmVudERpciArIHVucXVvdGVkT3JpZ1VybC5yZXBsYWNlKC9eXFwuXFwvLywgXCJcIik7IC8vIFN0cmlwIGxlYWRpbmcgJy4vJ1xuXHRcdH1cblxuXHRcdC8vIHNlbmQgYmFjayB0aGUgZml4ZWQgdXJsKC4uLilcblx0XHRyZXR1cm4gXCJ1cmwoXCIgKyBKU09OLnN0cmluZ2lmeShuZXdVcmwpICsgXCIpXCI7XG5cdH0pO1xuXG5cdC8vIHNlbmQgYmFjayB0aGUgZml4ZWQgY3NzXG5cdHJldHVybiBmaXhlZENzcztcbn07XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vc3R5bGUtbG9hZGVyL2ZpeFVybHMuanNcbi8vIG1vZHVsZSBpZCA9IDkwNVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBzdHlsZS1sb2FkZXI6IEFkZHMgc29tZSBjc3MgdG8gdGhlIERPTSBieSBhZGRpbmcgYSA8c3R5bGU+IHRhZ1xuXG4vLyBsb2FkIHRoZSBzdHlsZXNcbnZhciBjb250ZW50ID0gcmVxdWlyZShcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvaW5kZXguanMhLi4vLi4vbm9kZV9tb2R1bGVzL2xlc3MtbG9hZGVyL2Rpc3QvaW5kZXguanMhLi9TcGFjZXIubGVzc1wiKTtcbmlmKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJykgY29udGVudCA9IFtbbW9kdWxlLmlkLCBjb250ZW50LCAnJ11dO1xuLy8gUHJlcGFyZSBjc3NUcmFuc2Zvcm1hdGlvblxudmFyIHRyYW5zZm9ybTtcblxudmFyIG9wdGlvbnMgPSB7fVxub3B0aW9ucy50cmFuc2Zvcm0gPSB0cmFuc2Zvcm1cbi8vIGFkZCB0aGUgc3R5bGVzIHRvIHRoZSBET01cbnZhciB1cGRhdGUgPSByZXF1aXJlKFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvYWRkU3R5bGVzLmpzXCIpKGNvbnRlbnQsIG9wdGlvbnMpO1xuaWYoY29udGVudC5sb2NhbHMpIG1vZHVsZS5leHBvcnRzID0gY29udGVudC5sb2NhbHM7XG4vLyBIb3QgTW9kdWxlIFJlcGxhY2VtZW50XG5pZihtb2R1bGUuaG90KSB7XG5cdC8vIFdoZW4gdGhlIHN0eWxlcyBjaGFuZ2UsIHVwZGF0ZSB0aGUgPHN0eWxlPiB0YWdzXG5cdGlmKCFjb250ZW50LmxvY2Fscykge1xuXHRcdG1vZHVsZS5ob3QuYWNjZXB0KFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL1NwYWNlci5sZXNzXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG5ld0NvbnRlbnQgPSByZXF1aXJlKFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL1NwYWNlci5sZXNzXCIpO1xuXHRcdFx0aWYodHlwZW9mIG5ld0NvbnRlbnQgPT09ICdzdHJpbmcnKSBuZXdDb250ZW50ID0gW1ttb2R1bGUuaWQsIG5ld0NvbnRlbnQsICcnXV07XG5cdFx0XHR1cGRhdGUobmV3Q29udGVudCk7XG5cdFx0fSk7XG5cdH1cblx0Ly8gV2hlbiB0aGUgbW9kdWxlIGlzIGRpc3Bvc2VkLCByZW1vdmUgdGhlIDxzdHlsZT4gdGFnc1xuXHRtb2R1bGUuaG90LmRpc3Bvc2UoZnVuY3Rpb24oKSB7IHVwZGF0ZSgpOyB9KTtcbn1cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9hcHAvU3BhY2VyLmxlc3Ncbi8vIG1vZHVsZSBpZCA9IDkwNlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBzdHlsZS1sb2FkZXI6IEFkZHMgc29tZSBjc3MgdG8gdGhlIERPTSBieSBhZGRpbmcgYSA8c3R5bGU+IHRhZ1xuXG4vLyBsb2FkIHRoZSBzdHlsZXNcbnZhciBjb250ZW50ID0gcmVxdWlyZShcIiEhLi4vLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvaW5kZXguanMhLi4vLi4vbm9kZV9tb2R1bGVzL2xlc3MtbG9hZGVyL2Rpc3QvaW5kZXguanMhLi9zdHlsZXMubGVzc1wiKTtcbmlmKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJykgY29udGVudCA9IFtbbW9kdWxlLmlkLCBjb250ZW50LCAnJ11dO1xuLy8gUHJlcGFyZSBjc3NUcmFuc2Zvcm1hdGlvblxudmFyIHRyYW5zZm9ybTtcblxudmFyIG9wdGlvbnMgPSB7fVxub3B0aW9ucy50cmFuc2Zvcm0gPSB0cmFuc2Zvcm1cbi8vIGFkZCB0aGUgc3R5bGVzIHRvIHRoZSBET01cbnZhciB1cGRhdGUgPSByZXF1aXJlKFwiIS4uLy4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvYWRkU3R5bGVzLmpzXCIpKGNvbnRlbnQsIG9wdGlvbnMpO1xuaWYoY29udGVudC5sb2NhbHMpIG1vZHVsZS5leHBvcnRzID0gY29udGVudC5sb2NhbHM7XG4vLyBIb3QgTW9kdWxlIFJlcGxhY2VtZW50XG5pZihtb2R1bGUuaG90KSB7XG5cdC8vIFdoZW4gdGhlIHN0eWxlcyBjaGFuZ2UsIHVwZGF0ZSB0aGUgPHN0eWxlPiB0YWdzXG5cdGlmKCFjb250ZW50LmxvY2Fscykge1xuXHRcdG1vZHVsZS5ob3QuYWNjZXB0KFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL3N0eWxlcy5sZXNzXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG5ld0NvbnRlbnQgPSByZXF1aXJlKFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL3N0eWxlcy5sZXNzXCIpO1xuXHRcdFx0aWYodHlwZW9mIG5ld0NvbnRlbnQgPT09ICdzdHJpbmcnKSBuZXdDb250ZW50ID0gW1ttb2R1bGUuaWQsIG5ld0NvbnRlbnQsICcnXV07XG5cdFx0XHR1cGRhdGUobmV3Q29udGVudCk7XG5cdFx0fSk7XG5cdH1cblx0Ly8gV2hlbiB0aGUgbW9kdWxlIGlzIGRpc3Bvc2VkLCByZW1vdmUgdGhlIDxzdHlsZT4gdGFnc1xuXHRtb2R1bGUuaG90LmRpc3Bvc2UoZnVuY3Rpb24oKSB7IHVwZGF0ZSgpOyB9KTtcbn1cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9hcHAvc3R5bGVzLmxlc3Ncbi8vIG1vZHVsZSBpZCA9IDkwN1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvLyBDb21tb24gaW1wb3J0c1xuaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IFJlYWN0RE9NIGZyb20gJ3JlYWN0LWRvbSc7XG5cbi8vIFBhcnNlclxuaW1wb3J0IHBhcnNlciBmcm9tIFwiLi4vaW5kZXhcIjtcblxuLy8gQXBwLXNwZWNpZmljIGltcG9ydHNcbmltcG9ydCBTcGVsbEVkaXRvciBmcm9tIFwiLi9TcGVsbEVkaXRvci5qc3hcIjtcblxuLy8gS2ljayBvZmYgb3VyIHRvcC1sZXZlbCBlbGVtZW50XG5SZWFjdERPTS5yZW5kZXIoXG4gIDxTcGVsbEVkaXRvciAvPixcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlYWN0LXJvb3QnKVxuKTtcblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9hcHAvaW5kZXguanN4IiwiaW1wb3J0IHsgZ2V0VGFicyB9IGZyb20gXCIuL3V0aWxzL3N0cmluZ1wiO1xuXG4vLyBHUlJSLi4uIG5vZGUgZG9lc24ndCBpbmNsdWRlIHRoaXM/Pz9cbi8vIENIRUNLIERJRkZFUkVOVCBOT0RFIFZFUlNJT05TLi4uXG5pZiAoIShBcnJheS5wcm90b3R5cGUuaW5jbHVkZXMpKSB7XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsIFwiaW5jbHVkZXNcIiwge1xuXHRcdHZhbHVlOiBmdW5jdGlvbih2YWx1ZSwgc3RhcnQpIHtcblx0XHRcdGxldCBpbmRleCA9IHRoaXMuaW5kZXhPZih2YWx1ZSwgc3RhcnQpO1xuXHRcdFx0cmV0dXJuIChpbmRleCAhPT0gLTEpO1xuXHRcdH1cblx0fSk7XG59XG5cblxuXG4vLyBgd2hpdGVzcGFjZWAgY2xhc3MgZm9yIG5vcm1hbCAobm9uLWluZGVudCwgbm9uLW5ld2xpbmUpIHdoaXRlc3BhY2UuXG5jbGFzcyB3aGl0ZXNwYWNlIHtcblx0Y29uc3RydWN0b3Iod2hpdGVzcGFjZSkge1xuXHRcdHRoaXMud2hpdGVzcGFjZSA9IHdoaXRlc3BhY2U7XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIFwibGVuZ3RoXCIgb2YgdGhpcyB3aGl0ZXNwYWNlLCBlZyBmb3IgYW4gaW5kZW50LlxuXHRnZXQgbGVuZ3RoKCkge1xuXHRcdHJldHVybiB0aGlzLndoaXRlc3BhY2UubGVuZ3RoO1xuXHR9XG5cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuIHRoaXMud2hpdGVzcGFjZTtcblx0fVxufVxuXG5cbi8vIGBpbmRlbnRgIGNsYXNzLlxuY2xhc3MgaW5kZW50IGV4dGVuZHMgd2hpdGVzcGFjZSB7fVxuXG5cbi8vIE5ld2xpbmUgc2luZ2xldG9uLlxuY2xhc3MgbmV3bGluZSBleHRlbmRzIHdoaXRlc3BhY2Uge31cblxuXG4vL1xuLy9cdCMgVG9rZW5pemVyXG4vL1x0LSBgLnRva2VuaXplKClgIFx0XHRCcmVha3MgdXAgbG9uZyBzdHJpbmcgaW50byB0b2tlbnMsIGluY2x1ZGluZyBuZXdsaW5lcywgSlNYIGV4cHJlc3Npb25zLCBldGMuXG4vL1x0LSBgLnRva2VuaXplTGluZXMoKWAgXHRUYWtlcyB0aGUgYWJvdmUgYW5kIGJyZWFrcyBpdCBpbnRvIGFuIGFycmF5IG9mIGFycmF5cyBmb3IgZWFjaCBsaW5lLlxuLy9cbi8vIFRPRE86IGVycm9yIGNoZWNraW5nIC8gcmVwb3J0aW5nLCBlc3BlY2lhbGx5IGluIEpTWCBleHByZXNzaW9ucy5cbi8vIFRPRE86IGhhdmUgbm9ybWFsIGB0b2tlbml6ZWAgc3RpY2sgd2hpdGVzcGFjZSBlbGVtZW50cyBpbiB0aGUgc3RyZWFtLCB0aGVuIGB0b2tlbml6ZUxpbmVzKClgIHRha2VzIHRoZW0gb3V0P1xuY29uc3QgVG9rZW5pemVyID0ge1xuXG5cdC8vIFNob3VsZCB3ZSB3YXJuIGFib3V0IGFub21hbG91cyBjb25kaXRpb25zP1xuXHRXQVJOIDogZmFsc2UsXG5cblx0Ly8gV2hpdGVzcGFjZSBjb25zdHJ1Y3Rvci5cblx0V2hpdGVzcGFjZTogd2hpdGVzcGFjZSxcblxuXHQvLyBJbmRlbnQgY29uc3RydWN0b3Jcblx0SW5kZW50OiBpbmRlbnQsXG5cblx0Ly8gTkVXTElORSBzaW5nbGV0b24uXG5cdE5FV0xJTkU6IG5ldyBuZXdsaW5lKFwiXFxuXCIpLFxuXG5cdC8vIFRva2VuaXplIHRleHQgYmV0d2VlbiBgc3RhcnRgIGFuZCBgZW5kYCBpbnRvIGFuIGFycmF5IG9mIGByZXN1bHRzYCwgYW4gYXJyYXkgb2Y6XG5cdC8vXHQtIGBUb2tlbml6ZXIuTkVXTElORWAgZm9yIGEgbmV3bGluZSBzeW1ib2xcblx0Ly9cdC0gc3RyaW5ncyBmb3Iga2V5d29yZHMvc3ltYm9sc1xuXHQvL1x0LSBudW1iZXJzIGZvciBudW1iZXIgbGl0ZXJhbHNcblx0Ly9cdC0gYHsgaW5kZW50OiBudW1iZXIgfWAgZm9yIGluZGVudCBhdCBzdGFydCBvZiBsaW5lXG5cdC8vXHQtIGB7IHR5cGU6IFwidGV4dFwiLCBsaXRlcmFsOiBcIidhYmMnXCIsIHRleHQ6IFwiYWJjXCIgfVxuXHQvL1x0LSBgeyB0eXBlOiBcImluZGVudFwiLCBsZXZlbDogNyB9YFxuXHQvL1x0LSBgeyB0eXBlOiBcImNvbW1lbnRcIiwgY29tbWVudDogXCJzdHJpbmdcIiwgY29tbWVudFN5bWJvbCwgd2hpdGVzcGFjZSB9YFxuLy9URVNUTUVcblx0dG9rZW5pemUodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0Ly8gcXVpY2sgcmV0dXJuIG91dCBvZiByYW5nZSBvciBvbmx5IHdoaXRlc3BhY2Vcblx0XHRpZiAoc3RhcnQgPj0gZW5kIHx8ICF0ZXh0LnRyaW0oKSkgcmV0dXJuIFtdO1xuXG5cdFx0bGV0IHRva2VucyA9IFtdO1xuXHRcdC8vIFByb2Nlc3Mgb3VyIHRvcC1sZXZlbCBydWxlcy5cblx0XHRsZXQgW3Jlc3VsdHMsIG5leHRTdGFydF0gPSB0aGlzLmVhdFRva2Vucyh0aGlzLm1hdGNoVG9wVG9rZW5zLCB0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRpZiAocmVzdWx0cykge1xuXHRcdFx0dG9rZW5zID0gdG9rZW5zLmNvbmNhdChyZXN1bHRzKTtcblx0XHRcdHN0YXJ0ID0gbmV4dFN0YXJ0O1xuXHRcdH1cblx0XHRpZiAoc3RhcnQgIT09IGVuZCkge1xuXHRcdFx0aWYgKFRva2VuaXplci5XQVJOKSBjb25zb2xlLndhcm4oXCJ0b2tlbml6ZSgpOiBkaWRuJ3QgY29uc3VtZTogYFwiLCB0ZXh0LnNsaWNlKHN0YXJ0LCBlbmQpICsgXCJgXCIpO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHRzO1xuXHR9LFxuXG5cdC8vIFJlcGVhdGVkbHkgZXhlY3V0ZSBhIGBtZXRob2RgIChib3VuZCB0byBgdGhpcykgd2hpY2ggcmV0dXJucyBhIGBbcmVzdWx0LCBuZXh0U3RhcnRdYCBvciBgdW5kZWZpbmVkYC5cblx0Ly8gUGxhY2VzIG1hdGNoZWQgcmVzdWx0cyB0b2dldGhlciBpbiBgcmVzdWx0c2AgYXJyYXkgYW5kIHJldHVybnMgYFtyZXN1bHRzLCBuZXh0U3RhcnRdYCBmb3IgdGhlIGVudGlyZSBzZXQuXG5cdC8vIFN0b3BzIGlmIGBtZXRob2RgIGRvZXNuJ3QgcmV0dXJuIGFueXRoaW5nLCBvciBpZiBjYWxsaW5nIGBtZXRob2RgIGlzIHVucHJvZHVjdGl2ZS5cbi8vVEVTVE1FXG5cdGVhdFRva2VucyhtZXRob2QsIHRleHQsIHN0YXJ0ID0gMCwgZW5kLCByZXN1bHRzID0gW10pIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIHByb2Nlc3MgcnVsZXMgcmVwZWF0ZWRseSB1bnRpbCB3ZSBnZXQgdG8gdGhlIGVuZFxuXHRcdHdoaWxlIChzdGFydCA8IGVuZCkge1xuXHRcdFx0bGV0IHJlc3VsdCA9IG1ldGhvZC5jYWxsKHRoaXMsIHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdFx0aWYgKCFyZXN1bHQpIGJyZWFrO1xuXG5cdFx0XHRsZXQgW3Rva2VucywgbmV4dFN0YXJ0XSA9IHJlc3VsdDtcblx0XHRcdC8vIEJhaWwgaWYgd2UgZGlkbid0IGdldCBhIHByb2R1Y3RpdmUgcnVsZSFcblx0XHRcdGlmIChzdGFydCA9PT0gbmV4dFN0YXJ0KSBicmVhaztcblxuXHRcdFx0Ly8gaGFuZGxlIG5ld1Jlc3VsdHMgYXMgYW4gYXJyYXkgb3Igc2luZ2xlIG9iamVjdC5cblx0XHRcdGlmICh0b2tlbnMgIT09IHVuZGVmaW5lZCkgcmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KHRva2Vucyk7XG5cdFx0XHRzdGFydCA9IG5leHRTdGFydDtcblx0XHR9XG5cdFx0cmV0dXJuIFtyZXN1bHRzLCBzdGFydF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYSBzaW5nbGUgdG9wLWxldmVsIHRva2VuIGF0IGB0ZXh0W3N0YXJ0XWAuXG4vL1RFU1RNRVxuXHRtYXRjaFRvcFRva2Vucyh0ZXh0LCBzdGFydCwgZW5kKSB7XG5cdFx0cmV0dXJuXHR0aGlzLm1hdGNoV2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0IHx8IHRoaXMubWF0Y2hXb3JkKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaE51bWJlcih0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0IHx8IHRoaXMubWF0Y2hOZXdsaW5lKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaEpTWEVsZW1lbnQodGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdCB8fCB0aGlzLm1hdGNoVGV4dCh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0IHx8IHRoaXMubWF0Y2hDb21tZW50KHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHQgfHwgdGhpcy5tYXRjaFN5bWJvbCh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdDtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgU3ltYm9sIGNoYXJhY3RlclxuXHQvL1xuXG5cdC8vIE1hdGNoIHRoZSBzaW5nbGUgXCJzeW1ib2xcIiBjaGFyYWN0ZXIgYXQgYHRleHRbc3RhcnRdYC5cblx0Ly8gTk9URTogVGhpcyBkb2VzIG5vdCBkbyBhbnkgY2hlY2tpbmcsIGl0IGp1c3QgYmxpbmRseSB1c2VzIHRoZSBjaGFyYWN0ZXIgaW4gcXVlc3Rpb24uXG5cdC8vXHRcdCBZb3Ugc2hvdWxkIG1ha2Ugc3VyZSBhbGwgb3RoZXIgcG9zc2libGUgcnVsZXMgaGF2ZSBiZWVuIGV4aGF1c3RlZCBmaXJzdC5cblx0bWF0Y2hTeW1ib2wodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiBbdGV4dFtzdGFydF0sIHN0YXJ0ICsgMV1cblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgV2hpdGVzcGFjZVxuXHQvL1xuXG5cdC8vIFJldHVybiB0aGUgZmlyc3QgY2hhciBwb3NpdGlvbiBhZnRlciBgc3RhcnRgIHdoaWNoIGlzIE5PVCBhIHdoaXRlc3BhY2UgY2hhciAoc3BhY2Ugb3IgdGFiIG9ubHkpLlxuXHQvLyBJZiBgdGV4dFtzdGFydF1gIGlzIG5vdCB3aGl0ZXNwYWNlLCByZXR1cm5zIGBzdGFydGAsXG5cdC8vXHRzbyB5b3UgY2FuIGNhbGwgdGhpcyBhdCBhbnkgdGltZSB0byBza2lwIHdoaXRlc3BhY2UgaW4gdGhlIG91dHB1dC5cblx0ZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gZW5kO1xuXG5cdFx0bGV0IHdoaXRlU3BhY2VFbmQgPSBzdGFydDtcblx0XHR3aGlsZSAod2hpdGVTcGFjZUVuZCA8IGVuZCAmJiAodGV4dFt3aGl0ZVNwYWNlRW5kXSA9PT0gXCIgXCIgfHwgdGV4dFt3aGl0ZVNwYWNlRW5kXSA9PT0gXCJcXHRcIikpIHtcblx0XHRcdHdoaXRlU3BhY2VFbmQrKztcblx0XHR9XG5cdFx0cmV0dXJuIHdoaXRlU3BhY2VFbmQ7XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIFdoaXRlc3BhY2Vcblx0Ly9cdE5PVEU6IFdoaXRlc3BhY2UgYXQgdGhlIGJlZ2lubmluZyBvZiBgdGV4dGAgb3IgdGhlIGJlZ2lubmluZyBvZiBhIGxpbmVcblx0Ly9cdFx0ICBpcyBjb25zaWRlcmVkIGFuIFwiaW5kZW50XCIgYW5kIHdpbGwgaGF2ZSBgLmlzSW5kZW50ID09PSB0cnVlYC5cblx0Ly9cblxuXHQvLyBDb252ZXJ0IGEgcnVuIG9mIHNwYWNlcyBhbmQvb3IgdGFicyBpbnRvIGEgYFRva2VuaXplci5XaGl0ZXNwYWNlYC5cblx0bWF0Y2hXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgd2hpdGVzcGFjZUVuZCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHQvLyBmb3JnZXQgaXQgaWYgbm8gZm9yd2FyZCBtb3Rpb25cblx0XHRpZiAod2hpdGVzcGFjZUVuZCA9PT0gc3RhcnQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgd2hpdGVzcGFjZSA9IHRleHQuc2xpY2Uoc3RhcnQsIHdoaXRlc3BhY2VFbmQpO1xuXHRcdGxldCB0b2tlbjtcblx0XHRpZiAoc3RhcnQgPT09IDAgfHwgdGV4dFtzdGFydC0xXSA9PT0gXCJcXG5cIilcblx0XHRcdHRva2VuID0gbmV3IFRva2VuaXplci5JbmRlbnQod2hpdGVzcGFjZSk7XG5cdFx0ZWxzZVxuXHRcdFx0dG9rZW4gPSBuZXcgVG9rZW5pemVyLldoaXRlc3BhY2Uod2hpdGVzcGFjZSk7XG5cblx0XHRyZXR1cm4gW3Rva2VuLCB3aGl0ZXNwYWNlRW5kXTtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgTmV3bGluZVxuXHQvL1xuXG5cdC8vIE1hdGNoIGEgc2luZ2xlIG5ld2xpbmUgY2hhcmFjdGVyIGF0IGB0ZXh0W3N0YXJ0XWAuXG5cdC8vIFJldHVybnMgYFtUb2tlbml6ZXIuTkVXTElORSwgbmV4dFN0YXJ0XWAgb24gbWF0Y2guXG5cdC8vIE90aGVyd2lzZSByZXR1cm5zIGB1bmRlZmluZWRgLlxuXHRtYXRjaE5ld2xpbmUodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCB8fCB0ZXh0W3N0YXJ0XSAhPT0gXCJcXG5cIikgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHJldHVybiBbVG9rZW5pemVyLk5FV0xJTkUsIHN0YXJ0ICsgMV07XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIFdvcmRcblx0Ly9cblxuXHQvLyBNYXRjaCBhIHNpbmdsZSBgd29yZGAgaW4gYHRleHRgIGF0IGNoYXJhY3RlciBgc3RhcnRgLlxuXHQvLyBSZXR1cm5zIGBbd29yZCwgd29yZEVuZF1gLlxuXHQvLyBSZXR1cm5zIGFuIGVtcHR5IGFycmF5IGlmIGNvdWxkbid0IG1hdGNoIGEgd29yZC5cblx0V09SRF9TVEFSVDogL1tBLVphLXpdLyxcblx0V09SRF9DSEFSIDogL15bXFx3Xy1dLyxcblx0bWF0Y2hXb3JkKHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRpZiAoIXRoaXMuV09SRF9TVEFSVC50ZXN0KHRleHRbc3RhcnRdKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCB3b3JkRW5kID0gc3RhcnQgKyAxO1xuXHRcdHdoaWxlICh3b3JkRW5kIDwgZW5kICYmIHRoaXMuV09SRF9DSEFSLnRlc3QodGV4dFt3b3JkRW5kXSkpIHtcblx0XHRcdHdvcmRFbmQrKztcblx0XHR9XG5cdFx0aWYgKHdvcmRFbmQgPT09IHN0YXJ0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHdvcmQgPSB0ZXh0LnNsaWNlKHN0YXJ0LCB3b3JkRW5kKTtcblx0XHRyZXR1cm4gW3dvcmQsIHdvcmRFbmRdO1xuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBOdW1iZXJzXG5cdC8vXG5cblx0Ly8gRWF0IGEgc2luZ2xlIG51bWJlci5cblx0Ly8gUmV0dXJucyBhIGBOdW1iZXJgIGlmIG1hdGNoZWQuXG5cdE5VTUJFUl9TVEFSVDogL1swLTktLl0vLFxuXHROVU1CRVIgOiAvXi0/KFswLTldKlxcLik/WzAtOV0rLyxcblx0bWF0Y2hOdW1iZXIodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGlmICghdGhpcy5OVU1CRVJfU1RBUlQudGVzdCh0ZXh0W3N0YXJ0XSkpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgbnVtYmVyTWF0Y2ggPSB0aGlzLm1hdGNoRXhwcmVzc2lvbkF0SGVhZCh0aGlzLk5VTUJFUiwgdGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0aWYgKCFudW1iZXJNYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBudW1iZXJTdHIgPSBudW1iZXJNYXRjaFswXTtcblx0XHRsZXQgbnVtYmVyID0gcGFyc2VGbG9hdChudW1iZXJTdHIsIDEwKTtcblx0XHRyZXR1cm4gW251bWJlciwgc3RhcnQgKyBudW1iZXJTdHIubGVuZ3RoXTtcblx0fSxcblxuXG5cdC8vXG5cdC8vXHQjIyMgVGV4dCBsaXRlcmFsXG5cdC8vXG5cblx0Ly8gRWF0IGEgdGV4dCBsaXRlcmFsIChzdGFydHMvZW5kcyB3aXRoIGAnYCBvciBgXCJgKS5cblx0Ly8gUmV0dXJucyBhIGBUb2tlbml6ZXIuVGV4dGAgaWYgbWF0Y2hlZC5cbi8vVEVTVE1FOiAgbm90IHN1cmUgdGhlIGVzY2FwaW5nIGxvZ2ljIGlzIHJlYWxseSByaWdodC4uLlxuXHRtYXRjaFRleHQodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBxdW90ZVN5bWJvbCA9IHRleHRbc3RhcnRdO1xuXHRcdGlmIChxdW90ZVN5bWJvbCAhPT0gJ1wiJyAmJiBxdW90ZVN5bWJvbCAhPT0gXCInXCIpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgdGV4dEVuZCA9IHN0YXJ0ICsgMTtcblx0XHR3aGlsZSAodGV4dEVuZCA8IGVuZCkge1xuXHRcdFx0bGV0IGNoYXIgPSB0ZXh0W3RleHRFbmRdO1xuXHRcdFx0aWYgKGNoYXIgPT09IHF1b3RlU3ltYm9sKSBicmVhaztcblx0XHRcdC8vIGlmIHdlIGdldCBhIGJhY2txdW90ZSwgaWdub3JlIHF1b3RlIGluIG5leHQgY2hhclxuXHRcdFx0aWYgKGNoYXIgPT09IFwiXFxcXFwiICYmIHRleHRbdGV4dEVuZCArIDFdID09PSBxdW90ZVN5bWJvbCkgdGV4dEVuZCsrO1xuXHRcdFx0dGV4dEVuZCsrO1xuXHRcdH1cblx0XHQvLyBGb3JnZXQgaXQgaWYgd2UgZGlkbid0IGVuZCB3aXRoIHRoZSBxdW90ZSBzeW1ib2xcblx0XHRpZiAodGV4dFt0ZXh0RW5kXSAhPT0gcXVvdGVTeW1ib2wpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0Ly8gYWR2YW5jZSBwYXN0IGVuZCBxdW90ZVxuXHRcdHRleHRFbmQrKztcblxuXHRcdGxldCBxdW90ZWRTdHJpbmcgPSB0ZXh0LnNsaWNlKHN0YXJ0LCB0ZXh0RW5kKTtcblx0XHRsZXQgdG9rZW4gPSBuZXcgVG9rZW5pemVyLlRleHQocXVvdGVkU3RyaW5nKTtcblx0XHRyZXR1cm4gW3Rva2VuLCB0ZXh0RW5kXTtcblx0fSxcblxuXHQvLyBgVGV4dGAgY2xhc3MgZm9yIHN0cmluZyBsaXRlcmFscy5cblx0Ly8gUGFzcyB0aGUgbGl0ZXJhbCB2YWx1ZSwgdXNlIGAudGV4dGAgdG8gZ2V0IGp1c3QgdGhlIGJpdCBpbnNpZGUgdGhlIHF1b3Rlcy5cblx0VGV4dCA6IGNsYXNzIHRleHQge1xuXHRcdGNvbnN0cnVjdG9yKHF1b3RlZFN0cmluZykge1xuXHRcdFx0dGhpcy5xdW90ZWRTdHJpbmcgPSBxdW90ZWRTdHJpbmc7XG5cdFx0fVxuXHRcdGdldCB0ZXh0KCkge1xuXHRcdFx0bGV0IHN0cmluZyA9IHRoaXMucXVvdGVkU3RyaW5nO1xuXHRcdFx0Ly8gY2FsY3VsYXRlIGB0ZXh0YCBhcyB0aGUgYml0cyBiZXR3ZWVuIHRoZSBxdW90ZXMuXG5cdFx0XHRsZXQgc3RhcnQgPSAwO1xuXHRcdFx0bGV0IGVuZCA9IHN0cmluZy5sZW5ndGg7XG5cdFx0XHRpZiAoc3RyaW5nW3N0YXJ0XSA9PT0gJ1wiJyB8fCBzdHJpbmdbc3RhcnRdID09PSBcIidcIikgc3RhcnQgPSAxO1xuXHRcdFx0aWYgKHN0cmluZ1tlbmQtMV0gPT09ICdcIicgfHwgc3RyaW5nW2VuZC0xXSA9PT0gXCInXCIpIGVuZCA9IC0xO1xuXHRcdFx0cmV0dXJuIHN0cmluZy5zbGljZShzdGFydCwgZW5kKTtcblx0XHR9XG5cdFx0dG9TdHJpbmcoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5xdW90ZWRTdHJpbmc7XG5cdFx0fVxuXHR9LFxuXG5cdC8vXG5cdC8vXHQjIyMgQ29tbWVudHNcblx0Ly9cblxuXHQvLyBFYXQgYSBjb21tZW50ICh1bnRpbCB0aGUgZW5kIG9mIHRoZSBsaW5lKS5cblx0Ly8gUmV0dXJucyBhIGBUb2tlbml6ZXIuQ29tbWVudGAgaWYgbWF0Y2hlZC5cblx0Q09NTUVOVCA6IC9eKCMjK3wtLSt8XFwvXFwvKykoXFxzKikoLiopLyxcblx0bWF0Y2hDb21tZW50KHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgY29tbWVudFN0YXJ0ID0gdGV4dC5zbGljZShzdGFydCwgc3RhcnQgKyAyKTtcblx0XHRpZiAoY29tbWVudFN0YXJ0ICE9PSBcIi0tXCIgJiYgY29tbWVudFN0YXJ0ICE9PSBcIlxcL1xcL1wiICYmIGNvbW1lbnRTdGFydCAhPT0gXCIjI1wiKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gY29tbWVudCBlYXRzIHVudGlsIHRoZSBlbmQgb2YgdGhlIGxpbmVcblx0XHRsZXQgbGluZSA9IHRoaXMuZ2V0TGluZUF0SGVhZCh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRsZXQgY29tbWVudE1hdGNoID0gbGluZS5tYXRjaCh0aGlzLkNPTU1FTlQpXG5cdFx0aWYgKCFjb21tZW50TWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgW21hdGNoLCBjb21tZW50U3ltYm9sLCB3aGl0ZXNwYWNlLCBjb21tZW50XSA9IGNvbW1lbnRNYXRjaDtcblx0XHRsZXQgdG9rZW4gPSBuZXcgVG9rZW5pemVyLkNvbW1lbnQoeyBjb21tZW50U3ltYm9sLCB3aGl0ZXNwYWNlLCBjb21tZW50IH0pO1xuXHRcdHJldHVybiBbdG9rZW4sIHN0YXJ0ICsgbGluZS5sZW5ndGhdO1xuXHR9LFxuXG5cdC8vIENvbW1lbnQgY2xhc3Ncbi8vVEVTVE1FXG5cdENvbW1lbnQgOiBjbGFzcyBjb21tZW50IHtcblx0XHRjb25zdHJ1Y3RvciAocHJvcHMpIHtcblx0XHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcHMpO1xuXHRcdH1cblx0XHR0b1N0cmluZygpIHtcblx0XHRcdHJldHVybiBgJHt0aGlzLmNvbW1lbnRTeW1ib2x9JHt0aGlzLndoaXRlc3BhY2V9JHt0aGlzLmNvbW1lbnR9YDtcblx0XHR9XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIEpTWFxuXHQvL1xuXG5cdC8vIEVhdCBhIChuZXN0ZWQpIEpTWCBleHByZXNzaW9uLlxuLy9URVNUTUVcblx0bWF0Y2hKU1hFbGVtZW50KHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHRsZXQgW2pzeEVsZW1lbnQsIG5leHRTdGFydF0gPSB0aGlzLm1hdGNoSlNYU3RhcnRUYWcodGV4dCwgc3RhcnQsIGVuZCkgfHwgW107XG5cdFx0aWYgKCFqc3hFbGVtZW50KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKCFqc3hFbGVtZW50LmlzVW5hcnlUYWcpIHtcblx0XHRcdGxldCBbY2hpbGRyZW4sIGNoaWxkRW5kXSA9IHRoaXMubWF0Y2hKU1hDaGlsZHJlbihqc3hFbGVtZW50LnRhZ05hbWUsIHRleHQsIG5leHRTdGFydCwgZW5kKTtcblx0XHRcdGlmIChjaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdFx0anN4RWxlbWVudC5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuXHRcdFx0XHRuZXh0U3RhcnQgPSBjaGlsZEVuZDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gW2pzeEVsZW1lbnQsIG5leHRTdGFydF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggSlNYIHN0YXJ0IHRhZyBhbmQgaW50ZXJuYWwgZWxlbWVudHMgKGJ1dCBOT1QgY2hpbGRyZW4pLlxuXHQvLyBSZXR1cm5zIGBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XWAgb3IgYHVuZGVmaW5lZGAuXG5cdC8vIFVzZSBgbWF0Y2hKU1hFbGVtZW50KClgIHRvIG1hdGNoIGNoaWxkcmVuLCBlbmQgdGFnLCBldGMuXG5cdC8vIElnbm9yZXMgbGVhZGluZyB3aGl0ZXNwYWNlLlxuXHRKU1hfVEFHX1NUQVJUIDogL148KFtBLVphLXpdW1xcdy1cXC5dKikoXFxzKlxcLz58XFxzKj58XFxzKykvLFxuLy8gVE9ETzogY2xlYW4gdGhpcyBzdHVmZiB1cCwgbWF5YmUgd2l0aCBmaW5kRmlyc3RBdEhlYWQ/XG5cdG1hdGNoSlNYU3RhcnRUYWcodGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBuZXh0U3RhcnQgPSB0aGlzLmVhdFdoaXRlc3BhY2UodGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0Ly8gTWFrZSBzdXJlIHdlIHN0YXJ0IHdpdGggYDxgLlxuXHRcdGlmICh0ZXh0W25leHRTdGFydF0gIT09IFwiPFwiKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHRhZ01hdGNoID0gdGhpcy5tYXRjaEV4cHJlc3Npb25BdEhlYWQodGhpcy5KU1hfVEFHX1NUQVJULCB0ZXh0LCBuZXh0U3RhcnQsIGVuZCk7XG5cdFx0aWYgKCF0YWdNYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBbIG1hdGNoVGV4dCwgdGFnTmFtZSwgZW5kQml0IF0gPSB0YWdNYXRjaDtcblx0XHRsZXQganN4RWxlbWVudCA9IG5ldyBUb2tlbml6ZXIuSlNYRWxlbWVudCh0YWdOYW1lKTtcblx0XHRuZXh0U3RhcnQgPSBuZXh0U3RhcnQgKyBtYXRjaFRleHQubGVuZ3RoO1xuXG5cdFx0Ly8gSWYgdW5hcnkgdGFnLCBtYXJrIGFzIHN1Y2ggYW5kIHJldHVybi5cblx0XHRlbmRCaXQgPSBlbmRCaXQudHJpbSgpO1xuXHRcdGlmIChlbmRCaXQgPT09IFwiLz5cIikge1xuXHRcdFx0anN4RWxlbWVudC5pc1VuYXJ5VGFnID0gdHJ1ZTtcblx0XHRcdHJldHVybiBbanN4RWxlbWVudCwgbmV4dFN0YXJ0XTtcblx0XHR9XG5cblx0XHQvLyBJZiB3ZSBkaWRuJ3QgaW1tZWRpYXRlbHkgZ2V0IGFuIGVuZCBtYXJrZXIsIGF0dGVtcHQgdG8gbWF0Y2ggYXR0cmlidXRlc1xuXHRcdGlmIChlbmRCaXQgIT09IFwiPlwiICYmIGVuZEJpdCAhPT0gXCIvPlwiKSB7XG5cdFx0XHRsZXQgWyBhdHRycywgYXR0ckVuZCBdID0gdGhpcy5lYXRUb2tlbnModGhpcy5tYXRjaEpTWEF0dHJpYnV0ZSwgdGV4dCwgbmV4dFN0YXJ0LCBlbmQpO1xuXHRcdFx0anN4RWxlbWVudC5hdHRyaWJ1dGVzID0gYXR0cnM7XG5cdFx0XHRuZXh0U3RhcnQgPSBhdHRyRW5kO1xuXHRcdH1cblxuXHRcdC8vIGF0IHRoaXMgcG9pbnQgd2Ugc2hvdWxkIGdldCBhbiBgLz5gIG9yIGA+YCAod2l0aCBubyB3aGl0ZXNwYWNlKS5cblx0XHRpZiAodGV4dFtuZXh0U3RhcnRdID09PSBcIi9cIiAmJiB0ZXh0W25leHRTdGFydCArIDFdID09PSBcIj5cIikge1xuXHRcdFx0ZW5kQml0ID0gXCIvPlwiO1xuXHRcdFx0bmV4dFN0YXJ0ICs9IDI7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKHRleHRbbmV4dFN0YXJ0XSA9PT0gXCI+XCIpIHtcblx0XHRcdGVuZEJpdCA9IHRleHRbbmV4dFN0YXJ0XTtcblx0XHRcdG5leHRTdGFydCArPSAxO1xuXHRcdH1cblxuXHRcdC8vIFJldHVybiBpbW1lZGlhdGVseSBmb3IgdW5hcnkgdGFnXG5cdFx0aWYgKGVuZEJpdCA9PT0gXCIvPlwiKSB7XG5cdFx0XHRqc3hFbGVtZW50LmlzVW5hcnlUYWcgPSB0cnVlO1xuXHRcdFx0cmV0dXJuIFtqc3hFbGVtZW50LCBuZXh0U3RhcnRdO1xuXHRcdH1cblxuXHRcdC8vIGFkdmFuY2UgcGFzdCBgPmBcblx0XHRpZiAoZW5kQml0ICE9PSBcIj5cIikge1xuXHRcdFx0aWYgKFRva2VuaXplci5XQVJOKSB7XG5cdFx0XHRcdGNvbnNvbGUud2FybihcIk1pc3NpbmcgZXhwZWN0ZWQgZW5kIGA+YCBmb3IganN4RWxlbWVudFwiLCBqc3hFbGVtZW50LCBcImBcIit0ZXh0LnNsaWNlKHN0YXJ0LCBuZXh0U3RhcnQpK1wiYFwiKTtcblx0XHRcdH1cblx0XHRcdGpzeEVsZW1lbnQuZXJyb3IgPSBcIk5vIGVuZCA+XCI7XG5cdFx0XHRyZXR1cm4gW2pzeEVsZW1lbnQsIG5leHRTdGFydF07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFtqc3hFbGVtZW50LCBuZXh0U3RhcnRdO1xuXHR9LFxuXG5cblx0Ly8gSlNYIGVsZW1lbnQgY2xhc3Ncblx0SlNYRWxlbWVudCA6IGNsYXNzIGpzeEVsZW1lbnQge1xuXHRcdGNvbnN0cnVjdG9yKHRhZ05hbWUsIGF0dHJpYnV0ZXMsIGNoaWxkcmVuKSB7XG5cdFx0XHR0aGlzLnRhZ05hbWUgPSB0YWdOYW1lO1xuXHRcdFx0aWYgKGF0dHJpYnV0ZXMpIHRoaXMuYXR0cmlidXRlcyA9IGF0dHJpYnV0ZXM7XG5cdFx0XHRpZiAoY2hpbGRyZW4pIHRoaXMuY2hpbGRyZW4gPSBjaGlsZHJlbjtcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4gYXR0cmlidXRlcyBhcyBhIG1hcC5cbi8vVEVTVE1FXG5cdFx0Z2V0IGF0dHJzKCkge1xuXHRcdFx0bGV0IGF0dHJzID0ge307XG5cdFx0XHRpZiAodGhpcy5hdHRyaWJ1dGVzKSB0aGlzLmF0dHJpYnV0ZXMuZm9yRWFjaChhdHRyID0+IHtcblx0XHRcdFx0Ly8gaWdub3JlIHVubmFtZWQgYXR0cmlidXRlc1xuXHRcdFx0XHRpZiAoYXR0ci5uYW1lKSBhdHRyc1thdHRyLm5hbWVdID0gYXR0ci52YWx1ZVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYXR0cnM7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIG91ciBhdHRyaWJ1dGVzIGFzIGEgc3RyaW5nXG4vL1RFU1RNRVxuXHRcdGdldCBhdHRyc0FzU3RyaW5nKCkge1xuXHRcdFx0aWYgKCF0aGlzLmF0dHJpYnV0ZXMpIHJldHVybiBcIlwiO1xuXHRcdFx0cmV0dXJuIFwiIFwiICsgdGhpcy5hdHRyaWJ1dGVzLm1hcCggKHsgbmFtZSwgdmFsdWUgfSkgPT4ge1xuXHRcdFx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIG5hbWU7XG5cdFx0XHRcdC8vIGNvbnZlcnQgdmFsdWUgYXJyYXkgKHRva2VucykgdG8gc3RyaW5nXG5cdFx0XHRcdC8vIFRPRE86IHRoaXMgd2lsbCB3YW50IHRvIGJlIHNtYXJ0ZXIuLi5cblx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB2YWx1ZSA9IGB7JHt2YWx1ZS5qb2luKFwiIFwiKX19YDtcblx0XHRcdFx0cmV0dXJuIGBuYW1lPSR7dmFsdWV9YDtcblx0XHRcdH0pLmpvaW4oXCIgXCIpO1xuXHRcdH1cblxuXHRcdC8vIFJldHVybiBvdXIgY2hpbGRyZW4gYXMgYSBzdHJpbmcuXG4vL1RFU1RNRVxuXHRcdGdldCBjaGlsZHJlbkFzU3RyaW5nKCkge1xuXHRcdFx0aWYgKCF0aGlzLmNoaWxkcmVuKSByZXR1cm4gXCJcIjtcblx0XHRcdHJldHVybiB0aGlzLmNoaWxkcmVuLm1hcChjaGlsZCA9PiB7XG5cdFx0XHRcdGlmIChBcnJheS5pc0FycmF5KGNoaWxkKSkgcmV0dXJuIGB7JHtjaGlsZC5qb2luKFwiIFwiKX19YDtcblx0XHRcdFx0cmV0dXJuIFwiXCIgKyBjaGlsZDtcblx0XHRcdH0pLmpvaW4oXCJcIik7XG5cdFx0fVxuXG5cdFx0dG9TdHJpbmcoKSB7XG5cdFx0XHRsZXQgYXR0cnMgPSB0aGlzLmF0dHJzQXNTdHJpbmc7XG5cdFx0XHRsZXQgY2hpbGRyZW4gPSB0aGlzLmNoaWxkcmVuQXNTdHJpbmc7XG5cdFx0XHRpZiAodGhpcy5pc1VuYXJ5VGFnKSByZXR1cm4gYDwke3RoaXMudGFnTmFtZX0ke2F0dHJzfS8+YDtcblx0XHRcdHJldHVybiBgPCR7dGhpcy50YWdOYW1lfSR7YXR0cnN9PiR7Y2hpbGRyZW59PC8ke3RoaXMudGFnTmFtZX0+YDtcblx0XHR9XG5cdH0sXG5cblxuXHQvL1xuXHQvL1x0IyMjIEpTWCBjaGlsZHJlblxuXHQvL1xuXG5cdC8vIE1hdGNoIEpTWCBlbGVtZW50IGNoaWxkcmVuIG9mIGA8dGFnTmFtZT5gIGF0IGB0ZXh0W3N0YXJ0XWAuXG5cdC8vIE1hdGNoZXMgbmVzdGVkIGNoaWxkcmVuIGFuZCBzdG9wcyBhZnRlciBtYXRjaGluZyBlbmQgdGFnOiBgPC90YWdOYW1lPmAuXG5cdC8vIFJldHVybnMgYFtjaGlsZHJlbiwgbmV4dFN0YXJ0XWAuXG4vL1RFU1RNRVxuXHRtYXRjaEpTWENoaWxkcmVuKHRhZ05hbWUsIHRleHQsIHN0YXJ0LCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBjaGlsZHJlbiA9IFtdO1xuXHRcdGxldCBuZXN0aW5nID0gMTtcblx0XHRsZXQgZW5kVGFnID0gYDwvJHt0YWdOYW1lfT5gO1xuXG5cdFx0bGV0IG5leHRTdGFydCA9IHN0YXJ0O1xuXHRcdHdoaWxlKHRydWUpIHtcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzLm1hdGNoSlNYQ2hpbGQoZW5kVGFnLCB0ZXh0LCBuZXh0U3RhcnQsIGVuZCk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgYnJlYWs7XG5cblx0XHRcdGxldCBbY2hpbGQsIGNoaWxkRW5kXSA9IHJlc3VsdDtcblx0XHRcdG5leHRTdGFydCA9IGNoaWxkRW5kO1xuXHRcdFx0Ly8gSWYgd2UgZ290IHRoZSBlbmRUYWcsIHVwZGF0ZSBuZXN0aW5nIGFuZCBicmVhayBvdXQgb2YgbG9vcCBpZiBuZXN0aW5nICE9PSAwXG5cdFx0XHRpZiAoY2hpbGQgPT09IGVuZFRhZykge1xuXHRcdFx0XHRuZXN0aW5nIC0tO1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMCkgYnJlYWs7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGlmIChjaGlsZCkgY2hpbGRyZW4ucHVzaChjaGlsZCk7XG5cdFx0XHR9XG5cdFx0fVxuLy8gVE9ETzogaG93IHRvIHN1cmZhY2UgdGhpcyBlcnJvcj8/P1xuXHRcdGlmIChuZXN0aW5nICE9PSAwKSB7XG5cdFx0XHRpZiAoVG9rZW5pemVyLldBUk4pIHtcblx0XHRcdFx0Y29uc29sZS53YXJuKGBtYXRjaEpTWENoaWxkcmVuKCR7dGV4dC5zbGljZShzdGFydCwgbmV4dFN0YXJ0ICsgMTApfTogZGlkbid0IG1hdGNoIGVuZCBjaGlsZCFgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIFtjaGlsZHJlbiwgbmV4dFN0YXJ0XTtcblx0fSxcblxuXHQvLyBNYXRjaCBhIHNpbmdsZSBKU1ggY2hpbGQ6XG5cdC8vXHQtIGN1cnJlbnQgZW5kVGFnXG5cdC8vXHQtIGB7IGpzeCBleHByZXNzaW9uIH1gXG5cdC8vXHQtIG5lc3RlZCBKU1ggZWxlbWVudFxuXHQvL1x0LSAoYW55dGhpbmcgZWxzZSkgYXMganN4VGV4dCBleHByZXNzaW9uLlxuXHRtYXRjaEpTWENoaWxkKGVuZFRhZywgdGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRjaEpTWEVuZFRhZyhlbmRUYWcsIHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHR8fCB0aGlzLm1hdGNoSlNYRXhwcmVzc2lvbih0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0fHwgdGhpcy5tYXRjaEpTWEVsZW1lbnQodGV4dCwgc3RhcnQsIGVuZClcbi8vIFRPRE86IG5ld2xpbmUgYW5kIGluZGVudD9cblx0XHRcdHx8IHRoaXMubWF0Y2hKU1hUZXh0KHRleHQsIHN0YXJ0LCBlbmQpO1xuXHR9LFxuXG5cdC8vIEF0dGVtcHQgdG8gbWF0Y2ggYSBzcGVjaWZpYyBlbmQgdGFnLlxuXHQvLyBJZ25vcmVzIGxlYWRpbmcgd2hpdGVzcGFjZS5cblx0bWF0Y2hKU1hFbmRUYWcoZW5kVGFnLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IG5leHRTdGFydCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRpZiAoIXRoaXMubWF0Y2hTdHJpbmdBdEhlYWQoZW5kVGFnLCB0ZXh0LCBuZXh0U3RhcnQsIGVuZCkpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIFtlbmRUYWcsIG5leHRTdGFydCArIGVuZFRhZy5sZW5ndGhdO1xuXHR9LFxuXG5cblx0Ly9cblx0Ly9cdCMjIyBKU1ggYXR0cmlidXRlc1xuXHQvL1xuXG5cdC8vIE1hdGNoIGEgc2luZ2xlIEpTWCBlbGVtZW50IGF0dHJpYnV0ZSBhcyBgPGF0dHI+PXs8dmFsdWU+fWBcbi8vIFRPRE86IHsuLi54eHh9XG5cdEpTWF9BVFRSSUJVVEVfU1RBUlQgOiAvXlxccyooW1xcdy1dK1xcYilcXHMqKD0/KVxccyovLFxuXHRtYXRjaEpTWEF0dHJpYnV0ZSh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYXR0cmlidXRlcyBtdXN0IHN0YXJ0IHdpdGggYSB3b3JkIGNoYXJhY3RlclxuXHRcdGlmICghdGhpcy5XT1JEX1NUQVJULnRlc3QodGV4dFtzdGFydF0pKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gYXR0ZW1wdCB0byBtYXRjaCBhbiBhdHRyaWJ1dGUgbmFtZSwgaW5jbHVkaW5nIGA9YCBpZiBwcmVzZW50LlxuXHRcdGxldCByZXN1bHQgPSB0aGlzLm1hdGNoRXhwcmVzc2lvbkF0SGVhZCh0aGlzLkpTWF9BVFRSSUJVVEVfU1RBUlQsIHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdGlmICghcmVzdWx0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IFsgbWF0Y2gsIG5hbWUsIGVxdWFscyBdID0gcmVzdWx0O1xuXHRcdGxldCBuZXh0U3RhcnQgPSBzdGFydCArIG1hdGNoLmxlbmd0aDtcblx0XHRsZXQgYXR0cmlidXRlID0gbmV3IFRva2VuaXplci5KU1hBdHRyaWJ1dGUobmFtZSk7XG5cblx0XHQvLyBpZiB0aGVyZSB3YXMgYW4gZXF1YWxzIGNoYXIsIHBhcnNlIHRoZSB2YWx1ZVxuXHRcdGlmIChlcXVhbHMpIHtcblx0XHRcdGxldCBbdmFsdWUsIHZhbHVlRW5kXSA9IHRoaXMubWF0Y2hKU1hBdHRyaWJ1dGVWYWx1ZSh0ZXh0LCBuZXh0U3RhcnQsIGVuZCkgfHwgW107XG5cdFx0XHRpZiAodmFsdWUpIHtcblx0XHRcdFx0YXR0cmlidXRlLnZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdG5leHRTdGFydCA9IHZhbHVlRW5kO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBlYXQgd2hpdGVzcGFjZSBiZWZvcmUgdGhlIG5leHQgYXR0cmlidXRlIC8gdGFnIGVuZFxuXHRcdG5leHRTdGFydCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBuZXh0U3RhcnQsIGVuZCk7XG5cdFx0cmV0dXJuIFthdHRyaWJ1dGUsIG5leHRTdGFydF07XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYSB2YWx1ZSBleHByZXNzaW9uIGZvciBhIEpTWCBlbGVtZW50IGF0dHJpYnV0ZTpcblx0Ly8gTk9URTogd2Ugd2lsbCBiZSBjYWxsZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIGA9YCAoYW5kIHN1YnNlcXVlbnQgd2hpdGVzcGFjZSkuXG5cdG1hdGNoSlNYQXR0cmlidXRlVmFsdWUodGV4dCwgc3RhcnQsIGVuZCkge1xuXHRcdHJldHVybiB0aGlzLm1hdGNoVGV4dCh0ZXh0LCBzdGFydCwgZW5kKVxuXHRcdFx0fHwgdGhpcy5tYXRjaEpTWEV4cHJlc3Npb24odGV4dCwgc3RhcnQsIGVuZClcblx0XHRcdHx8IHRoaXMubWF0Y2hKU1hFbGVtZW50KHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHR8fCB0aGlzLm1hdGNoSlNYQXR0cmlidXRlVmFsdWVJZGVudGlmaWVyKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0XHR8fCB0aGlzLm1hdGNoTnVtYmVyKHRleHQsIHN0YXJ0LCBlbmQpXG5cdFx0O1xuXHR9LFxuXG5cdC8vIE1hdGNoIGEgc2luZ2xlIGlkZW50aWZlciBhcyBhIEpTWCBhdHRyaWJ1dGUgdmFsdWUuXG5cdC8vIFJldHVybnMgYXMgYSBgSlNYRXhwcmVzc2lvbmAuXG5cdG1hdGNoSlNYQXR0cmlidXRlVmFsdWVJZGVudGlmaWVyKHRleHQsIHN0YXJ0LCBlbmQpIHtcblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5tYXRjaFdvcmQodGV4dCwgc3RhcnQsIGVuZCk7XG5cdFx0aWYgKCFyZXN1bHQpIHJldHVybjtcblxuXHRcdGxldCBbIHdvcmQsIG5leHRTdGFydCBdID0gcmVzdWx0O1xuXHRcdGxldCB0b2tlbiA9IG5ldyBUb2tlbml6ZXIuSlNYRXhwcmVzc2lvbih3b3JkKTtcblx0XHRyZXR1cm4gW3Rva2VuLCBuZXh0U3RhcnRdO1xuXHR9LFxuXG5cdC8vIEpTWCBhdHRyaWJ1dGUgY2xhc3Ncblx0Ly8gYG5hbWVgIGlzIHRoZSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGUuXG5cdC8vIGB2YWx1ZWAgaXMgb25lIG9mOlxuXHQvL1x0XHQtIGAnLi4uJ2BcdFx0XHQvLyBUZXh0IChsaXRlcmFsIHN0cmluZykuXG5cdC8vXHRcdC0gYFwiLi4uXCJgXHRcdFx0Ly8gVGV4dCAobGl0ZXJhbCBzdHJpbmcpLlxuXHQvL1x0XHQtIGB7Li4ufWBcdFx0XHQvLyBFeHByZXNzaW9uLiAgUmVzdWx0cyB3aWxsIGJlIHRva2VuaXplZCBhcnJheS5cblx0Ly9cdFx0LSBgPC4uLi4+YFx0XHRcdC8vIEpTWCBlbGVtZW50LlxuXHQvL1x0XHQtIGAxYFx0XHRcdFx0Ly8gTnVtYmVyLiAgTm90ZTogdGhpcyBpcyBhbiBleHRlbnNpb24gdG8gSlNYLlxuXG5cdEpTWEF0dHJpYnV0ZSA6IGNsYXNzIGpzeEF0dHJpYnV0ZSB7XG5cdFx0Y29uc3RydWN0b3IobmFtZSwgdmFsdWUpIHtcblx0XHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdFx0XHRpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkgdGhpcy52YWx1ZSA9IHZhbHVlO1xuXHRcdH1cblx0XHR0b1N0cmluZygpIHtcblx0XHRcdGlmICh0aGlzLnZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLm5hbWU7XG5cdFx0XHRyZXR1cm4gYCR7dGhpcy5uYW1lfT17JHt0aGlzLnZhbHVlfX1gO1xuXHRcdH1cblx0fSxcblxuXG5cdC8vIE1hdGNoIGEgSlNYIGV4cHJlc3Npb24gZW5jbG9zZWQgaW4gY3VybHkgYnJhY2VzLCBlZzogIGB7IC4uLiB9YC5cblx0Ly8gIEhhbmRsZXMgbmVzdGVkIGN1cmxpZXMsIHF1b3RlcywgZXRjLlxuXHQvLyBSZXR1cm5zIGFycmF5IG9mIHRva2VucyBvZiBpbnRlcm5hbCBtYXRjaC5cblx0Ly8gSWdub3JlcyBsZWFkaW5nIHdoaXRlc3BhY2UuXG4vL1RPRE86IG5ld2xpbmVzL2luZGVudHM/Pz9cbi8vVE9ETzogey4uLnh4eH1cbi8vVEVTVE1FXG5cdG1hdGNoSlNYRXhwcmVzc2lvbih0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IG5leHRTdGFydCA9IHRoaXMuZWF0V2hpdGVzcGFjZSh0ZXh0LCBzdGFydCwgZW5kKTtcblx0XHRsZXQgZW5kSW5kZXggPSB0aGlzLmZpbmRNYXRjaGluZ0F0SGVhZChcIntcIiwgXCJ9XCIsIHRleHQsIG5leHRTdGFydCwgZW5kKTtcblx0XHRpZiAoZW5kSW5kZXggPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdC8vIEdldCBjb250ZW50cywgaW5jbHVkaW5nIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHdoaXRlc3BhY2UuXG5cdFx0bGV0IGNvbnRlbnRzID0gdGV4dC5zbGljZShzdGFydCArIDEsIGVuZEluZGV4KTtcblxuXHRcdC8vIHJldHVybiBhIG5ldyBKU1hFeHByZXNzaW9uLCBhZHZhbmNpbmcgYmV5b25kIHRoZSBlbmRpbmcgYH1gLlxuXHRcdGxldCBleHByZXNzaW9uID0gbmV3IFRva2VuaXplci5KU1hFeHByZXNzaW9uKGNvbnRlbnRzKTtcblx0XHRyZXR1cm4gW2V4cHJlc3Npb24sIGVuZEluZGV4ICsgMV07XG5cdH0sXG5cblx0Ly8gSlNYIGV4cHJlc3Npb24sIGNvbXBvc2VkIG9mIGlubGluZSB0b2tlbnMgd2hpY2ggc2hvdWxkIHlpZWxkIGFuIGBleHByZXNzaW9uYC5cblx0SlNYRXhwcmVzc2lvbiA6IGNsYXNzIGpzeEV4cHJlc3Npb24ge1xuXHRcdGNvbnN0cnVjdG9yKGNvbnRlbnRzKSB7XG5cdFx0XHR0aGlzLmNvbnRlbnRzID0gY29udGVudHMgfHwgXCJcIjtcblx0XHR9XG5cdFx0Ly8gRGl2aWRlIGNvbnRlbnRzIGludG8gYHRva2Vuc2AuXG5cdFx0Z2V0IHRva2VucygpIHtcblx0XHRcdHJldHVybiBUb2tlbml6ZXIudG9rZW5pemUodGhpcy5jb250ZW50cy50cmltKCkpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBNYXRjaCBKU1hUZXh0IHVudGlsIHRoZSBvbmUgb2YgYHtgLCBgPGAsIGA+YCBvciBgfWAuXG5cdC8vIE5PVEU6IElOQ0xVREVTIGxlYWRpbmcgLyB0cmFpbGluZyB3aGl0ZXNwYWNlLlxuXHRKU1hfVEVYVF9FTkRfQ0hBUlMgOiBbXCJ7XCIsIFwiPFwiLCBcIj5cIiwgXCJ9XCJdLFxuLy9URVNUTUVcblx0bWF0Y2hKU1hUZXh0KHRleHQsIHN0YXJ0ID0gMCwgZW5kKSB7XG5cdFx0aWYgKHR5cGVvZiBlbmQgIT09IFwibnVtYmVyXCIgfHwgZW5kID4gdGV4dC5sZW5ndGgpIGVuZCA9IHRleHQubGVuZ3RoO1xuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cblx0XHQvLyB0ZW1wb3JhcmlseSBhZHZhbmNlIHBhc3Qgd2hpdGVzcGFjZSAod2UnbGwgaW5jbHVkZSBpdCBpbiB0aGUgb3V0cHV0KS5cblx0XHRsZXQgbmV4dFN0YXJ0ID0gdGhpcy5lYXRXaGl0ZXNwYWNlKHRleHQsIHN0YXJ0LCBlbmQpO1xuXHRcdGxldCBlbmRJbmRleCA9IHRoaXMuZmluZEZpcnN0QXRIZWFkKHRoaXMuSlNYX1RFWFRfRU5EX0NIQVJTLCB0ZXh0LCBuZXh0U3RhcnQsIGVuZCk7XG5cdFx0Ly8gSWYgdGhlIGZpcnN0IG5vbi13aGl0ZXNwYWNlIGNoYXIgaXMgaW4gb3VyIEVORF9DSEFSUywgZm9yZ2V0IGl0LlxuXHRcdGlmIChlbmRJbmRleCA9PT0gbmV4dFN0YXJ0KSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0Ly8gaWYgbm8gbWF0Y2gsIHdlJ3ZlIGdvdCBzb21lIHNvcnQgb2YgZXJyb3Jcblx0XHRpZiAoZW5kSW5kZXggPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aWYgKFRva2VuaXplci5XQVJOKSB7XG5cdFx0XHRcdGNvbnNvbGUud2FybihcIm1hdGNoSlNYVGV4dChcIit0ZXh0LnNsaWNlKHN0YXJ0LCBzdGFydCArIDUwKStcIik6IEpTWCBzZWVtcyB0byBiZSB1bmJhbGFuY2VkLlwiKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0Ly8gaW5jbHVkZSBsZWFkaW5nIHdoaXRlc3BhY2UgaW4gdGhlIG91dHB1dC5cblx0XHRsZXQganN4VGV4dCA9IHRleHQuc2xpY2Uoc3RhcnQsIGVuZEluZGV4KTtcblx0XHRyZXR1cm4gW2pzeFRleHQsIGVuZEluZGV4XTtcblx0fSxcblxuXG5cblxuXHQvL1xuXHQvL1x0IyMgVXRpbGl0eSBmdW5jdGlvbnNcblx0Ly9cblxuXHQvLyBSZXR1cm4gY2hhcmFjdGVycyB1cCB0bywgYnV0IG5vdCBpbmNsdWRpbmcsIHRoZSBuZXh0IG5ld2xpbmUgY2hhciBhZnRlciBgc3RhcnRgLlxuXHQvLyBJZiBgc3RhcnRgIGlzIGEgbmV3bGluZSBjaGFyIG9yIHN0YXJ0ID49IGVuZCwgcmV0dXJucyBlbXB0eSBzdHJpbmcuXG5cdC8vIElmIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZyAoZWc6IG5vIG1vcmUgbmV3bGluZXMpLCByZXR1cm5zIGZyb20gc3RhcnQgdG8gZW5kLlxuLy9URVNUTUVcblx0Z2V0TGluZUF0SGVhZCh0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gXCJcIjtcblxuXHRcdGxldCBuZXdsaW5lID0gdGV4dC5pbmRleE9mKFwiXFxuXCIsIHN0YXJ0KTtcblx0XHRpZiAobmV3bGluZSA9PT0gLTEgfHwgbmV3bGluZSA+IGVuZCkgbmV3bGluZSA9IGVuZDtcblx0XHRyZXR1cm4gdGV4dC5zbGljZShzdGFydCwgbmV3bGluZSk7XG5cdH0sXG5cblx0Ly8gTWF0Y2ggYSBtdWx0aS1jaGFyIHN0cmluZyBzdGFydGluZyBhdCBgdGV4dFtzdGFydF1gLlxuLy9URVNUTUVcblx0bWF0Y2hTdHJpbmdBdEhlYWQoc3RyaW5nLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0bGV0IHN0cmluZ0VuZCA9IHN0YXJ0ICsgc3RyaW5nLmxlbmd0aDtcblx0XHRpZiAoc3RyaW5nRW5kID4gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXHRcdHJldHVybiBzdHJpbmcgPT09IHRleHQuc2xpY2Uoc3RhcnQsIHN0cmluZ0VuZCk7XG5cdH0sXG5cblxuXHQvLyBNYXRjaCBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBzdGFydGluZyBhdCBgdGV4dFtzdGFydF1gLCByZXR1cm5pbmcgdGhlIG1hdGNoLlxuXHQvLyBSZXR1cm5zIGBudWxsYCBpZiBubyBtYXRjaC5cblx0Ly9cblx0Ly8gTk9URTogVGhlIGV4cHJlc3Npb24gTVVTVCBzdGFydCB3aXRoIGAvXi4uLi9gXG4vL1RFU1RNRVxuXHRtYXRjaEV4cHJlc3Npb25BdEhlYWQoZXhwcmVzc2lvbiwgdGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBoZWFkID0gdGV4dC5zbGljZShzdGFydCwgZW5kKTtcblx0XHRyZXR1cm4gaGVhZC5tYXRjaChleHByZXNzaW9uKTtcblx0fSxcblxuXHQvLyBGaW5kIGluZGV4IG9mIHRoZSBtYXRjaGluZyBTSU5HTEUgQ0hBUkFDVEVSIGBlbmREZWxpbWl0ZXJgIHRvIG1hdGNoIGBzdGFydERlbGltaXRlcmAuXG5cdC8vIE1hdGNoZXMgbmVzdGVkIGRlbGltaXRlcnMgYW5kIGhhbmRsZXMgZXNjYXBlZCBkZWxpbWl0ZXJzLlxuXHQvLyBBc3N1bWVzIGB0ZXh0W3N0YXJ0XWAgaXMgdGhlIHN0YXJ0RGVsaW1pdGVyIVxuXHQvLyBSZXR1cm5zIG51bWVyaWMgaW5kZXggb3IgYHVuZGVmaW5lZGAgaWYgbm8gbWF0Y2ggb3IgaWYgZmlyc3QgY2hhciBpcyBub3QgYHN0YXJ0RGVsaW1pdGVyYC5cblx0Ly9cblx0Ly9cdEFsc28gaGFuZGxlcyBuZXN0ZWQgcXVvdGVzIC0tIGlmIHdlIGVuY291bnRlciBhIHNpbmdsZSBvciBkb3VibGUgcXVvdGUsXG5cdC8vXHRcdHdlJ2xsIHNraXAgc2Nhbm5pbmcgdW50aWwgd2UgZmluZCBhIG1hdGNoaW5nIHF1b3RlLlxuXHQvL1xuXHQvL1x0ZWc6ICBgZmluZE1hdGNoaW5nQXRIZWFkKFwie1wiLCBcIn1cIiwgXCJ7YWF7YX1hYX1cIilgID0+IDhcbi8vVEVTVE1FXG5cdGZpbmRNYXRjaGluZ0F0SGVhZChzdGFydERlbGltaXRlciwgZW5kRGVsaW1pdGVyLCB0ZXh0LCBzdGFydCA9IDAsIGVuZCkge1xuXHRcdGlmICh0eXBlb2YgZW5kICE9PSBcIm51bWJlclwiIHx8IGVuZCA+IHRleHQubGVuZ3RoKSBlbmQgPSB0ZXh0Lmxlbmd0aDtcblx0XHRpZiAoc3RhcnQgPj0gZW5kKSByZXR1cm4gdW5kZWZpbmVkO1xuXG5cdFx0aWYgKHRleHRbc3RhcnRdICE9PSBzdGFydERlbGltaXRlcikgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdGxldCBuZXN0aW5nID0gMDtcblx0XHRsZXQgY3VycmVudCA9IHN0YXJ0O1xuXHRcdHdoaWxlIChjdXJyZW50IDwgZW5kKSB7XG5cdFx0XHRsZXQgY2hhciA9IHRleHRbY3VycmVudF07XG5cdFx0XHQvLyBpZiBzdGFydERlbGltaXRlciwgaW5jcmVhc2UgbmVzdGluZ1xuXHRcdFx0aWYgKGNoYXIgPT09IHN0YXJ0RGVsaW1pdGVyKSB7XG5cdFx0XHRcdG5lc3RpbmcrKztcblx0XHRcdH1cblx0XHRcdC8vIGlmIGVuZERlbGltaXRlciwgZGVjcmVhc2UgbmVzdGluZyBhbmQgcmV0dXJuIGlmIG5lc3RpbmcgYmFjayB0byAwXG5cdFx0XHRlbHNlIGlmIChjaGFyID09PSBlbmREZWxpbWl0ZXIpIHtcblx0XHRcdFx0bmVzdGluZy0tO1xuXHRcdFx0XHRpZiAobmVzdGluZyA9PT0gMCkgcmV0dXJuIGN1cnJlbnQ7XG5cdFx0XHR9XG5cdFx0XHQvLyBpZiBhIHNpbmdsZSBvciBkb3VibGUgcXVvdGUsIHNraXAgdW50aWwgdGhlIG1hdGNoaW5nIHF1b3RlXG5cdFx0XHRlbHNlIGlmIChjaGFyID09PSBcIidcIiB8fCBjaGFyID09PSAnXCInKSB7XG5cdFx0XHRcdGxldCBbdG9rZW4sIGFmdGVyUXVvdGVdID0gdGhpcy5tYXRjaFRleHQodGV4dCwgY3VycmVudCwgZW5kKSB8fCBbXTtcblx0XHRcdFx0Y3VycmVudCA9IGFmdGVyUXVvdGU7XG5cdFx0XHRcdGNvbnRpbnVlO1x0Ly8gY29udGludWUgc28gd2UgZG9uJ3QgYWRkIDEgdG8gY3VyZW50IGJlbG93XG5cdFx0XHR9XG5cdFx0XHQvLyBJZiBiYWNrc2xhc2gsIHNraXAgYW4gZXh0cmEgY2hhciBpZiBpdCdzIGVpdGhlciBkZWxpbWl0ZXIgb3IgYSBxdW90ZVxuXHRcdFx0ZWxzZSBpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHtcblx0XHRcdFx0Y2hhciA9IHRleHRbY3VycmVudCArIDFdO1xuXHRcdFx0XHRpZiAoY2hhciA9PT0gc3RhcnREZWxpbWl0ZXJcblx0XHRcdFx0IHx8IGNoYXIgPT09IGVuZERlbGltaXRlclxuXHRcdFx0XHQgfHwgY2hhciA9PT0gXCInXCJcblx0XHRcdFx0IHx8IGNoYXIgPT09ICdcIidcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0Y3VycmVudCsrOztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Y3VycmVudCsrO1xuXHRcdH1cblx0fSxcblxuXG5cdC8vIFJldHVybiB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IE5PTi1FU0NBUEVEIGNoYXJhY3RlciBpbiBgY2hhcnNgIGFmdGVyIGB0ZXh0W3N0YXJ0XWAuXG5cdC8vIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgd2UgZGlkbid0IGZpbmQgYSBtYXRjaC5cbi8vVEVTVE1FXG5cdGZpbmRGaXJzdEF0SGVhZChjaGFycywgdGV4dCwgc3RhcnQgPSAwLCBlbmQpIHtcblx0XHRpZiAodHlwZW9mIGVuZCAhPT0gXCJudW1iZXJcIiB8fCBlbmQgPiB0ZXh0Lmxlbmd0aCkgZW5kID0gdGV4dC5sZW5ndGg7XG5cdFx0aWYgKHN0YXJ0ID49IGVuZCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuXHRcdHdoaWxlIChzdGFydCA8IGVuZCkge1xuXHRcdFx0bGV0IGNoYXIgPSB0ZXh0W3N0YXJ0XTtcblx0XHRcdGlmIChjaGFycy5pbmNsdWRlcyhjaGFyKSkgcmV0dXJuIHN0YXJ0O1xuXHRcdFx0Ly8gaWYgd2UgZ290IGFuIGVzY2FwZSBjaGFyLCBpZ25vcmUgdGhlIG5leHQgY2hhciBpZiBpdCdzIGluIGBjaGFyc2Bcblx0XHRcdGlmIChjaGFyID09PSBcIlxcXFxcIiAmJiBjaGFycy5pbmNsdWRlcyh0ZXh0W3N0YXJ0KzFdKSkgc3RhcnQrKztcblx0XHRcdHN0YXJ0Kys7XG5cdFx0fVxuXHRcdGlmIChzdGFydCA+PSBlbmQpIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0cmV0dXJuIHN0YXJ0O1xuXHR9LFxuXG5cbi8vXG4vLyAjIyMgVXRpbGl0eVxuLy9cblxuXHQvLyBHaXZlbiBhIHNldCBvZiB0b2tlbnMsIHNsaWNlIHdoaXRlc3BhY2UgKGluZGVudCwgTkVXTElORSBvciBub3JtYWwgd2hpdGVzcGFjZSkgZnJvbSB0aGUgZnJvbnQuXG5cdHJlbW92ZUxlYWRpbmdXaGl0ZXNwYWNlKHRva2Vucywgc3RhcnQgPSAwKSB7XG5cdFx0d2hpbGUgKHRva2Vuc1tzdGFydF0gaW5zdGFuY2VvZiBUb2tlbml6ZXIuV2hpdGVzcGFjZSkgc3RhcnQrKztcblx0XHRpZiAoc3RhcnQgPT09IDApIHJldHVybiB0b2tlbnM7XG5cdFx0cmV0dXJuIHRva2Vucy5zbGljZShzdGFydCk7XG5cdH0sXG5cblx0Ly8gR2l2ZW4gYSBzZXQgb2YgdG9rZW5zLCByZW1vdmUgQUxMIFwibm9ybWFsXCIgd2hpdGVzcGFjZSB0b2tlbnMgKE5PVCBpbmRlbnQgb3IgTkVXTElORSkuXG5cdHJlbW92ZU5vcm1hbFdoaXRlc3BhY2UodG9rZW5zKSB7XG5cdFx0cmV0dXJuIHRva2Vucy5maWx0ZXIodG9rZW4gPT4gIVRva2VuaXplci5pc05vcm1hbFdoaXRlc3BhY2UodG9rZW4pKTtcblx0fSxcblxuXG5cdC8vIFJldHVybiBgdHJ1ZWAgaWYgYHRva2VuYCBpcyBcIm5vcm1hbFwiIHdoaXRlc3BjZSAobm90IGEgbmV3bGluZSBvciBpbmRlbnQpXG5cdGlzTm9ybWFsV2hpdGVzcGFjZSh0b2tlbikge1xuXHRcdHJldHVybiB0b2tlbiBpbnN0YW5jZW9mIFRva2VuaXplci5XaGl0ZXNwYWNlXG5cdFx0XHQmJiAhKHRva2VuIGluc3RhbmNlb2YgVG9rZW5pemVyLkluZGVudClcblx0XHRcdCYmICh0b2tlbiAhPT0gVG9rZW5pemVyLk5FV0xJTkUpO1xuXHR9LFxuXG5cbi8vXG4vLyAjIyMgQmxvY2sgLyBpbmRlbnQgcHJvY2Vzc2luZ1xuLy9cblxuXHQvLyBTaW1wbGUgYmxvY2sgY2xhc3MgZm9yIGBicmVha0ludG9CbG9ja3NgLlxuXHRCbG9jazogY2xhc3MgYmxvY2sge1xuXHRcdGNvbnN0cnVjdG9yKHByb3BzKXtcblx0XHRcdE9iamVjdC5hc3NpZ24odGhpcywgcHJvcHMpO1xuXHRcdFx0aWYgKCF0aGlzLmNvbnRlbnRzKSB0aGlzLmNvbnRlbnRzID0gW107XG5cdFx0fVxuXG5cdFx0dG9TdHJpbmcoKSB7XG5cdFx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcywgbnVsbCwgXCJcXHRcIik7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIEJyZWFrIHRva2VucyBpbnRvIGFuIGFycmF5IG9mIGFycmF5cyBieSBgTkVXTElORWBzLlxuXHQvLyBSZXR1cm5zIGFuIGFycmF5IG9mIGxpbmVzIFdJVEhPVVQgdGhlIGBORVdMSU5FYHMuXG5cdC8vIExpbmVzIHdoaWNoIGFyZSBjb21wb3NlZCBzb2xlbHkgb2Ygd2hpdGVzcGFjZSBhcmUgdHJlYXRlZCBhcyBibGFuay5cblx0YnJlYWtJbnRvTGluZXModG9rZW5zKSB7XG5cdFx0Ly8gQ29udmVydCB0byBsaW5lcy5cblx0XHRsZXQgY3VycmVudExpbmUgPSBbXTtcblx0XHRsZXQgbGluZXMgPSBbY3VycmVudExpbmVdO1xuXHRcdHRva2Vucy5mb3JFYWNoKHRva2VuID0+IHtcblx0XHRcdC8vIGFkZCBuZXcgYXJyYXkgZm9yIGVhY2ggbmV3bGluZVxuXHRcdFx0aWYgKHRva2VuID09PSBUb2tlbml6ZXIuTkVXTElORSkge1xuXHRcdFx0XHQvLyBjcmVhdGUgYSBuZXcgbGluZSBhbmQgcHVzaCBpdCBpblxuXHRcdFx0XHRjdXJyZW50TGluZSA9IFtdO1xuXHRcdFx0XHRyZXR1cm4gbGluZXMucHVzaChjdXJyZW50TGluZSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIG90aGVyd2lzZSBqdXN0IGFkZCB0byB0aGUgY3VycmVudCBsaW5lXG5cdFx0XHRjdXJyZW50TGluZS5wdXNoKHRva2VuKTtcblx0XHR9KTtcblxuXHRcdC8vIENsZWFyIGFueSBsaW5lcyB0aGF0IGFyZSBvbmx5IHdoaXRlc3BhY2Vcblx0XHRsaW5lcy5mb3JFYWNoKChsaW5lLCBpbmRleCkgPT4ge1xuXHRcdFx0aWYgKGxpbmUubGVuZ3RoID09PSAxICYmIGxpbmVbMF0gaW5zdGFuY2VvZiBUb2tlbml6ZXIuV2hpdGVzcGFjZSkgbGluZXNbaW5kZXhdID0gW107XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gbGluZXM7XG5cdH0sXG5cblx0Ly8gUmV0dXJuIGluZGVudHMgb2YgdGhlIHNwZWNpZmllZCBsaW5lcy5cblx0Ly8gSW5kZW50cyBlbXB0eSBsaW5lcyAoTkVXTElORXMpIGludG8gdGhlIGJsb2NrIEFGVEVSIHRoZXkgYXBwZWFyLlxuXHRnZXRMaW5lSW5kZW50cyhsaW5lcywgZGVmYXVsdEluZGVudCA9IDApIHtcblx0XHRpZiAobGluZXMubGVuZ3RoID09PSAwKSByZXR1cm4gW107XG5cblx0XHRjb25zdCBpbmRlbnRzID0gbGluZXMubWFwKFRva2VuaXplci5nZXRMaW5lSW5kZW50KTtcblx0XHRjb25zdCBlbmQgPSBpbmRlbnRzLmxlbmd0aDtcblxuXHRcdC8vIGZpZ3VyZSBvdXQgdGhlIGluZGVudCBvZiB0aGUgZmlyc3Qgbm9uLWVtcHR5IGxpbmVcblx0XHRsZXQgc3RhcnRJbmRlbnQgPSBnZXROZXh0SW5kZW50KDApO1xuXHRcdGlmIChzdGFydEluZGVudCA9PT0gdW5kZWZpbmVkKSBzdGFydEluZGVudCA9IGRlZmF1bHRJbmRlbnQ7XG5cblx0XHQvLyBpbmRlbnQgYmxhbmsgbGluZXMgdG8gdGhlIGluZGVudCBBRlRFUiB0aGVtXG5cdFx0Zm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGVuZDsgaW5kZXgrKykge1xuXHRcdFx0aWYgKGluZGVudHNbaW5kZXhdID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0aW5kZW50c1tpbmRleF0gPSBnZXROZXh0SW5kZW50KGluZGV4ICsgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBpbmRlbnRzO1xuXG5cdFx0Ly8gUmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgTkVYVCBub24tdW5kZWZpbmVkIGluZGVudC5cblx0XHRmdW5jdGlvbiBnZXROZXh0SW5kZW50KGluZGV4KSB7XG5cdFx0XHR3aGlsZSAoaW5kZXggPCBlbmQpIHtcblx0XHRcdFx0aWYgKGluZGVudHNbaW5kZXhdICE9PSB1bmRlZmluZWQpIHJldHVybiBpbmRlbnRzW2luZGV4XTtcblx0XHRcdFx0aW5kZXgrKztcblx0XHRcdH1cblx0XHRcdHJldHVybiBzdGFydEluZGVudDtcblx0XHR9XG5cdH0sXG5cblxuXHQvLyBSZXR1cm4gdGhlIGluZGVudCBvZiBhIGxpbmUgb2YgdG9rZW5zLlxuXHQvLyBSZXR1cm5zIGAwYCBpZiBub3QgaW5kZW50ZWQuXG5cdC8vIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgYSBibGFuayBsaW5lLlxuXHRnZXRMaW5lSW5kZW50KGxpbmUpIHtcblx0XHRpZiAoIWxpbmUgfHwgbGluZS5sZW5ndGggPT09IDApIHJldHVybiB1bmRlZmluZWQ7XG5cdFx0aWYgKGxpbmVbMF0gaW5zdGFuY2VvZiBUb2tlbml6ZXIuSW5kZW50KSByZXR1cm4gbGluZVswXS5sZW5ndGg7XG5cdFx0cmV0dXJuIDA7XG5cdH0sXG5cblx0Ly8gQnJlYWsgYHRva2Vuc2AgYmV0d2VlbiBgc3RhcnRgIGFuZCBgZW5kYCBpbnRvIGEgYFRva2VuaXplci5CbG9ja2Agd2l0aCBuZXN0ZWQgYGNvbnRlbnRzYC5cblx0Ly8gU2tpcHMgXCJub3JtYWxcIiB3aGl0ZXNwYWNlIGFuZCBpbmRlbnRzIGluIHRoZSByZXN1bHRzLlxuXHRicmVha0ludG9CbG9ja3M6IGZ1bmN0aW9uKHRva2Vucywgc3RhcnQgPSAwLCBlbmQgPSB0b2tlbnMubGVuZ3RoKSB7XG5cdFx0Ly8gcmVzdHJpY3QgdG8gdG9rZW5zIG9mIGludGVyZXN0XG5cdFx0dG9rZW5zID0gdG9rZW5zLnNsaWNlKHN0YXJ0LCBlbmQpO1xuXHRcdC8vIHJlbW92ZSBcIm5vcm1hbFwiIHdoaXRlc3BhY2Vcbi8vVE9ETzogYmV0dGVyIHRvIGxlYXZlIHRoaXMgdG8gY29uc3VtZXJzPz8/XG5cdFx0dG9rZW5zID0gVG9rZW5pemVyLnJlbW92ZU5vcm1hbFdoaXRlc3BhY2UodG9rZW5zKTtcblxuXHRcdC8vIGJyZWFrIGludG8gbGluZXMgJiByZXR1cm4gZWFybHkgaWYgbm8gbGluZXNcblx0XHRsZXQgbGluZXMgPSBUb2tlbml6ZXIuYnJlYWtJbnRvTGluZXModG9rZW5zKTtcblx0XHRpZiAobGluZXMubGVuZ3RoID09PSAwKSByZXR1cm4gW107XG5cblx0XHQvLyBmaWd1cmUgb3V0IGluZGVudHNcblx0XHRsZXQgaW5kZW50cyA9IFRva2VuaXplci5nZXRMaW5lSW5kZW50cyhsaW5lcyk7XG5cblx0XHQvLyBGaXJzdCBibG9jayBpcyBhdCB0aGUgTUlOSU1VTSBpbmRlbnQgb2YgYWxsIGxpbmVzIVxuXHRcdGxldCBtYXhJbmRlbnQgPSBNYXRoLm1pbi5hcHBseShNYXRoLCBpbmRlbnRzKTtcblx0XHRsZXQgYmxvY2sgPSBuZXcgVG9rZW5pemVyLkJsb2NrKHsgaW5kZW50OiBtYXhJbmRlbnQgfSk7XG5cblx0XHQvLyBzdGFjayBvZiBibG9ja3Ncblx0XHRsZXQgc3RhY2sgPSBbYmxvY2tdO1xuXG5cdFx0bGluZXMuZm9yRWFjaCggKGxpbmUsIGluZGV4KSA9PiB7XG5cdFx0XHQvLyBSZW1vdmUgbGVhZGluZyB3aGl0ZXNwYWNlIChlZzogaW5kZW50cylcblx0XHRcdGxpbmUgPSBUb2tlbml6ZXIucmVtb3ZlTGVhZGluZ1doaXRlc3BhY2UobGluZSk7XG5cblx0XHRcdGxldCBsaW5lSW5kZW50ID0gaW5kZW50c1tpbmRleF07XG5cdFx0XHRsZXQgdG9wID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG5cdFx0XHQvLyBJZiBpbmRlbnRpbmcsIHB1c2ggbmV3IGJsb2NrKHMpXG5cdFx0XHRpZiAobGluZUluZGVudCA+IHRvcC5pbmRlbnQpIHtcblx0XHRcdFx0d2hpbGUgKGxpbmVJbmRlbnQgPiB0b3AuaW5kZW50KSB7XG5cdFx0XHRcdFx0dmFyIG5ld0Jsb2NrID0gbmV3IFRva2VuaXplci5CbG9jayh7IGluZGVudDogdG9wLmluZGVudCArIDEgfSk7XG5cdFx0XHRcdFx0dG9wLmNvbnRlbnRzLnB1c2gobmV3QmxvY2spO1xuXHRcdFx0XHRcdHN0YWNrLnB1c2gobmV3QmxvY2spO1xuXG5cdFx0XHRcdFx0dG9wID0gbmV3QmxvY2s7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdC8vIElmIG91dGRlbnRpbmc6IHBvcCBibG9jayhzKVxuXHRcdFx0ZWxzZSBpZiAobGluZUluZGVudCA8IHRvcC5pbmRlbnQpIHtcblx0XHRcdFx0d2hpbGUgKGxpbmVJbmRlbnQgPCB0b3AuaW5kZW50KSB7XG5cdFx0XHRcdFx0c3RhY2sucG9wKCk7XG5cdFx0XHRcdFx0dG9wID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdC8vIGFkZCB0byB0b3AgYmxvY2tcblx0XHRcdHRvcC5jb250ZW50cy5wdXNoKGxpbmUpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGJsb2NrO1xuXHR9LFxuXG5cblxuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBUb2tlbml6ZXI7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvVG9rZW5pemVyLmpzIiwiaW1wb3J0IGdsb2JhbCBmcm9tIFwiLi9nbG9iYWxcIjtcblxuLy8gUmV0dXJuIHRydWUgaWYgdGV4dCBpcyBhbGwgd2hpdGVzcGFjZSwgaW5jbHVkaW5nIGVtcHR5IHN0cmluZy5cbmxldCBBTExfV0hJVEVTUEFDRSA9IC9eXFxzKiQvO1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2hpdGVzcGFjZSh0ZXh0KSB7XG5cdHJldHVybiBBTExfV0hJVEVTUEFDRS50ZXN0KHRleHQpXG59XG5cbi8vIFJldHVybiB0aGUgcGx1cmFsIG9mIGB3b3JkYC5cbi8vIE5PVEU6IHRoaXMgaXMgbm90IHZlcnkgZ29vZCBhdCBhbGwhISFcbi8vIFRPRE86IGV4Y2VwdGlvbnMsIGV0Yy5cbmV4cG9ydCBmdW5jdGlvbiBwbHVyYWxpemUod29yZCkge1xuXHRyZXR1cm4gd29yZCArIFwic1wiO1xufVxuXG4vLyBSZXR1cm4gdHJ1ZSBpZiB3b3JkIGlzIGEgcGx1cmFsLlxuLy8gTk9URTogZm9yIHdvcmRzIHdoaWNoIGFyZSBCT1RIIHNpbmd1bGFyIGFuZCBwbHVyYWwsIHRoaXMgd2lsbCByZXR1cm4gdHJ1ZS5cbmV4cG9ydCBmdW5jdGlvbiBpc1BsdXJhbCh3b3JkKSB7XG5cdHJldHVybiB3b3JkID09PSBwbHVyYWxpemUod29yZCk7XG59XG5cblxuLy8gUmV0dXJuIHRoZSBzaW5ndWxhciBvZiBgd29yZGAuXG4vLyBOT1RFOiB0aGlzIGlzIG5vdCB2ZXJ5IGdvb2QgYXQgYWxsISEhXG4vLyBUT0RPOiBleGNlcHRpb25zLCBldGMuXG5leHBvcnQgZnVuY3Rpb24gc2luZ3VsYXJpemUod29yZCkge1xuXHRyZXR1cm4gd29yZC5yZXBsYWNlKC9lP3MkLywgXCJcIik7XG59XG5cbi8vIFJldHVybiB0cnVlIGlmIHdvcmQgaXMgYSBzaW5ndWxhci5cbi8vIE5PVEU6IGZvciB3b3JkcyB3aGljaCBhcmUgQk9USCBzaW5ndWxhciBhbmQgcGx1cmFsLCB0aGlzIHdpbGwgcmV0dXJuIHRydWUuXG5leHBvcnQgZnVuY3Rpb24gaXNTaW5ndWxhcih3b3JkKSB7XG5cdHJldHVybiB3b3JkID09PSBzaW5ndWxhcml6ZSh3b3JkKTtcbn1cblxuXG4vLyBSZXR1cm4gYSBjZXJ0YWluIGBudW1iZXJgIG9mIHRhYiBjaGFyYWN0ZXJzLlxuY29uc3QgVEFCUyA9IFwiXFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XFx0XCI7XG5leHBvcnQgZnVuY3Rpb24gZ2V0VGFicyhudW1iZXIpIHtcblx0aWYgKHR5cGVvZiBudW1iZXIgIT09IFwibnVtYmVyXCIpIHJldHVybiBcIlwiO1xuXHRyZXR1cm4gVEFCUy5zdWJzdHIoMCwgbnVtYmVyKTtcbn1cblxuXG4vLyBFeHBvcnQgYWxsIGFzIGEgbHVtcFxubGV0IGFsbEV4cG9ydHMgPSB7Li4uZXhwb3J0c307XG5leHBvcnQgZGVmYXVsdCBhbGxFeHBvcnRzO1xuXG4vLyBERUJVRzogcHV0IG9uIGdsb2JhbCBmb3IgZGVidWdnaW5nLlxuZ2xvYmFsLlNUUklORyA9IGFsbEV4cG9ydHM7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvdXRpbHMvc3RyaW5nLmpzIl0sInNvdXJjZVJvb3QiOiIifQ==