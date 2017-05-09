webpackJsonp([0,1],{

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

/***/ 248:
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

/***/ 249:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
registerGlobals();
exports.extras = {
    allowStateChanges: allowStateChanges,
    deepEqual: deepEqual,
    getAtom: getAtom,
    getDebugName: getDebugName,
    getDependencyTree: getDependencyTree,
    getAdministration: getAdministration,
    getGlobalState: getGlobalState,
    getObserverTree: getObserverTree,
    isComputingDerivation: isComputingDerivation,
    isSpyEnabled: isSpyEnabled,
    onReactionError: onReactionError,
    reserveArrayBuffer: reserveArrayBuffer,
    resetGlobalState: resetGlobalState,
    shareGlobalState: shareGlobalState,
    spyReport: spyReport,
    spyReportEnd: spyReportEnd,
    spyReportStart: spyReportStart,
    setReactionScheduler: setReactionScheduler
};
if (typeof __MOBX_DEVTOOLS_GLOBAL_HOOK__ === "object") {
    __MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobx(module.exports);
}
module.exports.default = module.exports;
var actionFieldDecorator = createClassPropertyDecorator(function (target, key, value, args, originalDescriptor) {
    var actionName = (args && args.length === 1) ? args[0] : (value.name || key || "<unnamed action>");
    var wrappedAction = action(actionName, value);
    addHiddenProp(target, key, wrappedAction);
}, function (key) {
    return this[key];
}, function () {
    invariant(false, getMessage("m001"));
}, false, true);
var boundActionDecorator = createClassPropertyDecorator(function (target, key, value) {
    defineBoundAction(target, key, value);
}, function (key) {
    return this[key];
}, function () {
    invariant(false, getMessage("m001"));
}, false, false);
var action = function action(arg1, arg2, arg3, arg4) {
    if (arguments.length === 1 && typeof arg1 === "function")
        return createAction(arg1.name || "<unnamed action>", arg1);
    if (arguments.length === 2 && typeof arg2 === "function")
        return createAction(arg1, arg2);
    if (arguments.length === 1 && typeof arg1 === "string")
        return namedActionDecorator(arg1);
    return namedActionDecorator(arg2).apply(null, arguments);
};
exports.action = action;
action.bound = function boundAction(arg1, arg2, arg3) {
    if (typeof arg1 === "function") {
        var action_1 = createAction("<not yet bound action>", arg1);
        action_1.autoBind = true;
        return action_1;
    }
    return boundActionDecorator.apply(null, arguments);
};
function namedActionDecorator(name) {
    return function (target, prop, descriptor) {
        if (descriptor && typeof descriptor.value === "function") {
            descriptor.value = createAction(name, descriptor.value);
            descriptor.enumerable = false;
            descriptor.configurable = true;
            return descriptor;
        }
        return actionFieldDecorator(name).apply(this, arguments);
    };
}
function runInAction(arg1, arg2, arg3) {
    var actionName = typeof arg1 === "string" ? arg1 : arg1.name || "<unnamed action>";
    var fn = typeof arg1 === "function" ? arg1 : arg2;
    var scope = typeof arg1 === "function" ? arg2 : arg3;
    invariant(typeof fn === "function", getMessage("m002"));
    invariant(fn.length === 0, getMessage("m003"));
    invariant(typeof actionName === "string" && actionName.length > 0, "actions should have valid names, got: '" + actionName + "'");
    return executeAction(actionName, fn, scope, undefined);
}
exports.runInAction = runInAction;
function isAction(thing) {
    return typeof thing === "function" && thing.isMobxAction === true;
}
exports.isAction = isAction;
function defineBoundAction(target, propertyName, fn) {
    var res = function () {
        return executeAction(propertyName, fn, target, arguments);
    };
    res.isMobxAction = true;
    addHiddenProp(target, propertyName, res);
}
function autorun(arg1, arg2, arg3) {
    var name, view, scope;
    if (typeof arg1 === "string") {
        name = arg1;
        view = arg2;
        scope = arg3;
    }
    else {
        name = arg1.name || ("Autorun@" + getNextId());
        view = arg1;
        scope = arg2;
    }
    invariant(typeof view === "function", getMessage("m004"));
    invariant(isAction(view) === false, getMessage("m005"));
    if (scope)
        view = view.bind(scope);
    var reaction = new Reaction(name, function () {
        this.track(reactionRunner);
    });
    function reactionRunner() {
        view(reaction);
    }
    reaction.schedule();
    return reaction.getDisposer();
}
exports.autorun = autorun;
function when(arg1, arg2, arg3, arg4) {
    var name, predicate, effect, scope;
    if (typeof arg1 === "string") {
        name = arg1;
        predicate = arg2;
        effect = arg3;
        scope = arg4;
    }
    else {
        name = ("When@" + getNextId());
        predicate = arg1;
        effect = arg2;
        scope = arg3;
    }
    var disposer = autorun(name, function (r) {
        if (predicate.call(scope)) {
            r.dispose();
            var prevUntracked = untrackedStart();
            effect.call(scope);
            untrackedEnd(prevUntracked);
        }
    });
    return disposer;
}
exports.when = when;
function autorunAsync(arg1, arg2, arg3, arg4) {
    var name, func, delay, scope;
    if (typeof arg1 === "string") {
        name = arg1;
        func = arg2;
        delay = arg3;
        scope = arg4;
    }
    else {
        name = arg1.name || ("AutorunAsync@" + getNextId());
        func = arg1;
        delay = arg2;
        scope = arg3;
    }
    invariant(isAction(func) === false, getMessage("m006"));
    if (delay === void 0)
        delay = 1;
    if (scope)
        func = func.bind(scope);
    var isScheduled = false;
    var r = new Reaction(name, function () {
        if (!isScheduled) {
            isScheduled = true;
            setTimeout(function () {
                isScheduled = false;
                if (!r.isDisposed)
                    r.track(reactionRunner);
            }, delay);
        }
    });
    function reactionRunner() { func(r); }
    r.schedule();
    return r.getDisposer();
}
exports.autorunAsync = autorunAsync;
function reaction(expression, effect, arg3) {
    if (arguments.length > 3) {
        fail(getMessage("m007"));
    }
    if (isModifierDescriptor(expression)) {
        fail(getMessage("m008"));
    }
    var opts;
    if (typeof arg3 === "object") {
        opts = arg3;
    }
    else {
        opts = {};
    }
    opts.name = opts.name || expression.name || effect.name || ("Reaction@" + getNextId());
    opts.fireImmediately = arg3 === true || opts.fireImmediately === true;
    opts.delay = opts.delay || 0;
    opts.compareStructural = opts.compareStructural || opts.struct || false;
    effect = action(opts.name, opts.context ? effect.bind(opts.context) : effect);
    if (opts.context) {
        expression = expression.bind(opts.context);
    }
    var firstTime = true;
    var isScheduled = false;
    var nextValue;
    var r = new Reaction(opts.name, function () {
        if (firstTime || opts.delay < 1) {
            reactionRunner();
        }
        else if (!isScheduled) {
            isScheduled = true;
            setTimeout(function () {
                isScheduled = false;
                reactionRunner();
            }, opts.delay);
        }
    });
    function reactionRunner() {
        if (r.isDisposed)
            return;
        var changed = false;
        r.track(function () {
            var v = expression(r);
            changed = valueDidChange(opts.compareStructural, nextValue, v);
            nextValue = v;
        });
        if (firstTime && opts.fireImmediately)
            effect(nextValue, r);
        if (!firstTime && changed === true)
            effect(nextValue, r);
        if (firstTime)
            firstTime = false;
    }
    r.schedule();
    return r.getDisposer();
}
exports.reaction = reaction;
function createComputedDecorator(compareStructural) {
    return createClassPropertyDecorator(function (target, name, _, __, originalDescriptor) {
        invariant(typeof originalDescriptor !== "undefined", getMessage("m009"));
        invariant(typeof originalDescriptor.get === "function", getMessage("m010"));
        var adm = asObservableObject(target, "");
        defineComputedProperty(adm, name, originalDescriptor.get, originalDescriptor.set, compareStructural, false);
    }, function (name) {
        var observable = this.$mobx.values[name];
        if (observable === undefined)
            return undefined;
        return observable.get();
    }, function (name, value) {
        this.$mobx.values[name].set(value);
    }, false, false);
}
var computedDecorator = createComputedDecorator(false);
var computedStructDecorator = createComputedDecorator(true);
var computed = (function computed(arg1, arg2, arg3) {
    if (typeof arg2 === "string") {
        return computedDecorator.apply(null, arguments);
    }
    invariant(typeof arg1 === "function", getMessage("m011"));
    invariant(arguments.length < 3, getMessage("m012"));
    var opts = typeof arg2 === "object" ? arg2 : {};
    opts.setter = typeof arg2 === "function" ? arg2 : opts.setter;
    return new ComputedValue(arg1, opts.context, opts.compareStructural || opts.struct || false, opts.name || arg1.name || "", opts.setter);
});
exports.computed = computed;
computed.struct = computedStructDecorator;
function createTransformer(transformer, onCleanup) {
    invariant(typeof transformer === "function" && transformer.length < 2, "createTransformer expects a function that accepts one argument");
    var objectCache = {};
    var resetId = globalState.resetId;
    var Transformer = (function (_super) {
        __extends(Transformer, _super);
        function Transformer(sourceIdentifier, sourceObject) {
            var _this = _super.call(this, function () { return transformer(sourceObject); }, undefined, false, "Transformer-" + transformer.name + "-" + sourceIdentifier, undefined) || this;
            _this.sourceIdentifier = sourceIdentifier;
            _this.sourceObject = sourceObject;
            return _this;
        }
        Transformer.prototype.onBecomeUnobserved = function () {
            var lastValue = this.value;
            _super.prototype.onBecomeUnobserved.call(this);
            delete objectCache[this.sourceIdentifier];
            if (onCleanup)
                onCleanup(lastValue, this.sourceObject);
        };
        return Transformer;
    }(ComputedValue));
    return function (object) {
        if (resetId !== globalState.resetId) {
            objectCache = {};
            resetId = globalState.resetId;
        }
        var identifier = getMemoizationId(object);
        var reactiveTransformer = objectCache[identifier];
        if (reactiveTransformer)
            return reactiveTransformer.get();
        reactiveTransformer = objectCache[identifier] = new Transformer(identifier, object);
        return reactiveTransformer.get();
    };
}
exports.createTransformer = createTransformer;
function getMemoizationId(object) {
    if (typeof object === 'string' || typeof object === 'number')
        return object;
    if (object === null || typeof object !== "object")
        throw new Error("[mobx] transform expected some kind of object or primitive value, got: " + object);
    var tid = object.$transformId;
    if (tid === undefined) {
        tid = getNextId();
        addHiddenProp(object, "$transformId", tid);
    }
    return tid;
}
function expr(expr, scope) {
    if (!isComputingDerivation())
        console.warn(getMessage("m013"));
    return computed(expr, { context: scope }).get();
}
exports.expr = expr;
function extendObservable(target) {
    var properties = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        properties[_i - 1] = arguments[_i];
    }
    return extendObservableHelper(target, deepEnhancer, properties);
}
exports.extendObservable = extendObservable;
function extendShallowObservable(target) {
    var properties = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        properties[_i - 1] = arguments[_i];
    }
    return extendObservableHelper(target, referenceEnhancer, properties);
}
exports.extendShallowObservable = extendShallowObservable;
function extendObservableHelper(target, defaultEnhancer, properties) {
    invariant(arguments.length >= 2, getMessage("m014"));
    invariant(typeof target === "object", getMessage("m015"));
    invariant(!(isObservableMap(target)), getMessage("m016"));
    properties.forEach(function (propSet) {
        invariant(typeof propSet === "object", getMessage("m017"));
        invariant(!isObservable(propSet), getMessage("m018"));
    });
    var adm = asObservableObject(target);
    var definedProps = {};
    for (var i = properties.length - 1; i >= 0; i--) {
        var propSet = properties[i];
        for (var key in propSet)
            if (definedProps[key] !== true && hasOwnProperty(propSet, key)) {
                definedProps[key] = true;
                if (target === propSet && !isPropertyConfigurable(target, key))
                    continue;
                var descriptor = Object.getOwnPropertyDescriptor(propSet, key);
                defineObservablePropertyFromDescriptor(adm, key, descriptor, defaultEnhancer);
            }
    }
    return target;
}
function getDependencyTree(thing, property) {
    return nodeToDependencyTree(getAtom(thing, property));
}
function nodeToDependencyTree(node) {
    var result = {
        name: node.name
    };
    if (node.observing && node.observing.length > 0)
        result.dependencies = unique(node.observing).map(nodeToDependencyTree);
    return result;
}
function getObserverTree(thing, property) {
    return nodeToObserverTree(getAtom(thing, property));
}
function nodeToObserverTree(node) {
    var result = {
        name: node.name
    };
    if (hasObservers(node))
        result.observers = getObservers(node).map(nodeToObserverTree);
    return result;
}
function intercept(thing, propOrHandler, handler) {
    if (typeof handler === "function")
        return interceptProperty(thing, propOrHandler, handler);
    else
        return interceptInterceptable(thing, propOrHandler);
}
exports.intercept = intercept;
function interceptInterceptable(thing, handler) {
    return getAdministration(thing).intercept(handler);
}
function interceptProperty(thing, property, handler) {
    return getAdministration(thing, property).intercept(handler);
}
function isComputed(value, property) {
    if (value === null || value === undefined)
        return false;
    if (property !== undefined) {
        if (isObservableObject(value) === false)
            return false;
        var atom = getAtom(value, property);
        return isComputedValue(atom);
    }
    return isComputedValue(value);
}
exports.isComputed = isComputed;
function isObservable(value, property) {
    if (value === null || value === undefined)
        return false;
    if (property !== undefined) {
        if (isObservableArray(value) || isObservableMap(value))
            throw new Error(getMessage("m019"));
        else if (isObservableObject(value)) {
            var o = value.$mobx;
            return o.values && !!o.values[property];
        }
        return false;
    }
    return isObservableObject(value) || !!value.$mobx || isAtom(value) || isReaction(value) || isComputedValue(value);
}
exports.isObservable = isObservable;
var deepDecorator = createDecoratorForEnhancer(deepEnhancer);
var shallowDecorator = createDecoratorForEnhancer(shallowEnhancer);
var refDecorator = createDecoratorForEnhancer(referenceEnhancer);
var deepStructDecorator = createDecoratorForEnhancer(deepStructEnhancer);
var refStructDecorator = createDecoratorForEnhancer(refStructEnhancer);
function createObservable(v) {
    if (v === void 0) { v = undefined; }
    if (typeof arguments[1] === "string")
        return deepDecorator.apply(null, arguments);
    invariant(arguments.length <= 1, getMessage("m021"));
    invariant(!isModifierDescriptor(v), getMessage("m020"));
    if (isObservable(v))
        return v;
    var res = deepEnhancer(v, undefined, undefined);
    if (res !== v)
        return res;
    return observable.box(v);
}
var IObservableFactories = (function () {
    function IObservableFactories() {
    }
    IObservableFactories.prototype.box = function (value, name) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("box");
        return new ObservableValue(value, deepEnhancer, name);
    };
    IObservableFactories.prototype.shallowBox = function (value, name) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("shallowBox");
        return new ObservableValue(value, referenceEnhancer, name);
    };
    IObservableFactories.prototype.array = function (initialValues, name) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("array");
        return new ObservableArray(initialValues, deepEnhancer, name);
    };
    IObservableFactories.prototype.shallowArray = function (initialValues, name) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("shallowArray");
        return new ObservableArray(initialValues, referenceEnhancer, name);
    };
    IObservableFactories.prototype.map = function (initialValues, name) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("map");
        return new ObservableMap(initialValues, deepEnhancer, name);
    };
    IObservableFactories.prototype.shallowMap = function (initialValues, name) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("shallowMap");
        return new ObservableMap(initialValues, referenceEnhancer, name);
    };
    IObservableFactories.prototype.object = function (props, name) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("object");
        var res = {};
        asObservableObject(res, name);
        extendObservable(res, props);
        return res;
    };
    IObservableFactories.prototype.shallowObject = function (props, name) {
        if (arguments.length > 2)
            incorrectlyUsedAsDecorator("shallowObject");
        var res = {};
        asObservableObject(res, name);
        extendShallowObservable(res, props);
        return res;
    };
    IObservableFactories.prototype.ref = function () {
        if (arguments.length < 2) {
            return createModifierDescriptor(referenceEnhancer, arguments[0]);
        }
        else {
            return refDecorator.apply(null, arguments);
        }
    };
    IObservableFactories.prototype.shallow = function () {
        if (arguments.length < 2) {
            return createModifierDescriptor(shallowEnhancer, arguments[0]);
        }
        else {
            return shallowDecorator.apply(null, arguments);
        }
    };
    IObservableFactories.prototype.deep = function () {
        if (arguments.length < 2) {
            return createModifierDescriptor(deepEnhancer, arguments[0]);
        }
        else {
            return deepDecorator.apply(null, arguments);
        }
    };
    IObservableFactories.prototype.struct = function () {
        if (arguments.length < 2) {
            return createModifierDescriptor(deepStructEnhancer, arguments[0]);
        }
        else {
            return deepStructDecorator.apply(null, arguments);
        }
    };
    return IObservableFactories;
}());
exports.IObservableFactories = IObservableFactories;
var observable = createObservable;
exports.observable = observable;
Object.keys(IObservableFactories.prototype).forEach(function (key) { return observable[key] = IObservableFactories.prototype[key]; });
observable.deep.struct = observable.struct;
observable.ref.struct = function () {
    if (arguments.length < 2) {
        return createModifierDescriptor(refStructEnhancer, arguments[0]);
    }
    else {
        return refStructDecorator.apply(null, arguments);
    }
};
function incorrectlyUsedAsDecorator(methodName) {
    fail("Expected one or two arguments to observable." + methodName + ". Did you accidentally try to use observable." + methodName + " as decorator?");
}
function createDecoratorForEnhancer(enhancer) {
    invariant(!!enhancer, ":(");
    return createClassPropertyDecorator(function (target, name, baseValue, _, baseDescriptor) {
        assertPropertyConfigurable(target, name);
        invariant(!baseDescriptor || !baseDescriptor.get, getMessage("m022"));
        var adm = asObservableObject(target, undefined);
        defineObservableProperty(adm, name, baseValue, enhancer);
    }, function (name) {
        var observable = this.$mobx.values[name];
        if (observable === undefined)
            return undefined;
        return observable.get();
    }, function (name, value) {
        setPropertyValue(this, name, value);
    }, true, false);
}
function observe(thing, propOrCb, cbOrFire, fireImmediately) {
    if (typeof cbOrFire === "function")
        return observeObservableProperty(thing, propOrCb, cbOrFire, fireImmediately);
    else
        return observeObservable(thing, propOrCb, cbOrFire);
}
exports.observe = observe;
function observeObservable(thing, listener, fireImmediately) {
    return getAdministration(thing).observe(listener, fireImmediately);
}
function observeObservableProperty(thing, property, listener, fireImmediately) {
    return getAdministration(thing, property).observe(listener, fireImmediately);
}
function toJS(source, detectCycles, __alreadySeen) {
    if (detectCycles === void 0) { detectCycles = true; }
    if (__alreadySeen === void 0) { __alreadySeen = []; }
    function cache(value) {
        if (detectCycles)
            __alreadySeen.push([source, value]);
        return value;
    }
    if (isObservable(source)) {
        if (detectCycles && __alreadySeen === null)
            __alreadySeen = [];
        if (detectCycles && source !== null && typeof source === "object") {
            for (var i = 0, l = __alreadySeen.length; i < l; i++)
                if (__alreadySeen[i][0] === source)
                    return __alreadySeen[i][1];
        }
        if (isObservableArray(source)) {
            var res = cache([]);
            var toAdd = source.map(function (value) { return toJS(value, detectCycles, __alreadySeen); });
            res.length = toAdd.length;
            for (var i = 0, l = toAdd.length; i < l; i++)
                res[i] = toAdd[i];
            return res;
        }
        if (isObservableObject(source)) {
            var res = cache({});
            for (var key in source)
                res[key] = toJS(source[key], detectCycles, __alreadySeen);
            return res;
        }
        if (isObservableMap(source)) {
            var res_1 = cache({});
            source.forEach(function (value, key) { return res_1[key] = toJS(value, detectCycles, __alreadySeen); });
            return res_1;
        }
        if (isObservableValue(source))
            return toJS(source.get(), detectCycles, __alreadySeen);
    }
    return source;
}
exports.toJS = toJS;
function transaction(action, thisArg) {
    if (thisArg === void 0) { thisArg = undefined; }
    deprecated(getMessage("m023"));
    return runInTransaction.apply(undefined, arguments);
}
exports.transaction = transaction;
function runInTransaction(action, thisArg) {
    if (thisArg === void 0) { thisArg = undefined; }
    return executeAction("", action);
}
function log(msg) {
    console.log(msg);
    return msg;
}
function whyRun(thing, prop) {
    switch (arguments.length) {
        case 0:
            thing = globalState.trackingDerivation;
            if (!thing)
                return log(getMessage("m024"));
            break;
        case 2:
            thing = getAtom(thing, prop);
            break;
    }
    thing = getAtom(thing);
    if (isComputedValue(thing))
        return log(thing.whyRun());
    else if (isReaction(thing))
        return log(thing.whyRun());
    return fail(getMessage("m025"));
}
exports.whyRun = whyRun;
function createAction(actionName, fn) {
    invariant(typeof fn === "function", getMessage("m026"));
    invariant(typeof actionName === "string" && actionName.length > 0, "actions should have valid names, got: '" + actionName + "'");
    var res = function () {
        return executeAction(actionName, fn, this, arguments);
    };
    res.originalFn = fn;
    res.isMobxAction = true;
    return res;
}
function executeAction(actionName, fn, scope, args) {
    var runInfo = startAction(actionName, fn, scope, args);
    try {
        return fn.apply(scope, args);
    }
    finally {
        endAction(runInfo);
    }
}
function startAction(actionName, fn, scope, args) {
    var notifySpy = isSpyEnabled() && !!actionName;
    var startTime = 0;
    if (notifySpy) {
        startTime = Date.now();
        var l = (args && args.length) || 0;
        var flattendArgs = new Array(l);
        if (l > 0)
            for (var i = 0; i < l; i++)
                flattendArgs[i] = args[i];
        spyReportStart({
            type: "action",
            name: actionName,
            fn: fn,
            object: scope,
            arguments: flattendArgs
        });
    }
    var prevDerivation = untrackedStart();
    startBatch();
    var prevAllowStateChanges = allowStateChangesStart(true);
    return {
        prevDerivation: prevDerivation,
        prevAllowStateChanges: prevAllowStateChanges,
        notifySpy: notifySpy,
        startTime: startTime
    };
}
function endAction(runInfo) {
    allowStateChangesEnd(runInfo.prevAllowStateChanges);
    endBatch();
    untrackedEnd(runInfo.prevDerivation);
    if (runInfo.notifySpy)
        spyReportEnd({ time: Date.now() - runInfo.startTime });
}
function useStrict(strict) {
    invariant(globalState.trackingDerivation === null, getMessage("m028"));
    globalState.strictMode = strict;
    globalState.allowStateChanges = !strict;
}
exports.useStrict = useStrict;
function isStrictModeEnabled() {
    return globalState.strictMode;
}
exports.isStrictModeEnabled = isStrictModeEnabled;
function allowStateChanges(allowStateChanges, func) {
    var prev = allowStateChangesStart(allowStateChanges);
    var res;
    try {
        res = func();
    }
    finally {
        allowStateChangesEnd(prev);
    }
    return res;
}
function allowStateChangesStart(allowStateChanges) {
    var prev = globalState.allowStateChanges;
    globalState.allowStateChanges = allowStateChanges;
    return prev;
}
function allowStateChangesEnd(prev) {
    globalState.allowStateChanges = prev;
}
var BaseAtom = (function () {
    function BaseAtom(name) {
        if (name === void 0) { name = "Atom@" + getNextId(); }
        this.name = name;
        this.isPendingUnobservation = true;
        this.observers = [];
        this.observersIndexes = {};
        this.diffValue = 0;
        this.lastAccessedBy = 0;
        this.lowestObserverState = IDerivationState.NOT_TRACKING;
    }
    BaseAtom.prototype.onBecomeUnobserved = function () {
    };
    BaseAtom.prototype.reportObserved = function () {
        reportObserved(this);
    };
    BaseAtom.prototype.reportChanged = function () {
        startBatch();
        propagateChanged(this);
        endBatch();
    };
    BaseAtom.prototype.toString = function () {
        return this.name;
    };
    return BaseAtom;
}());
exports.BaseAtom = BaseAtom;
var Atom = (function (_super) {
    __extends(Atom, _super);
    function Atom(name, onBecomeObservedHandler, onBecomeUnobservedHandler) {
        if (name === void 0) { name = "Atom@" + getNextId(); }
        if (onBecomeObservedHandler === void 0) { onBecomeObservedHandler = noop; }
        if (onBecomeUnobservedHandler === void 0) { onBecomeUnobservedHandler = noop; }
        var _this = _super.call(this, name) || this;
        _this.name = name;
        _this.onBecomeObservedHandler = onBecomeObservedHandler;
        _this.onBecomeUnobservedHandler = onBecomeUnobservedHandler;
        _this.isPendingUnobservation = false;
        _this.isBeingTracked = false;
        return _this;
    }
    Atom.prototype.reportObserved = function () {
        startBatch();
        _super.prototype.reportObserved.call(this);
        if (!this.isBeingTracked) {
            this.isBeingTracked = true;
            this.onBecomeObservedHandler();
        }
        endBatch();
        return !!globalState.trackingDerivation;
    };
    Atom.prototype.onBecomeUnobserved = function () {
        this.isBeingTracked = false;
        this.onBecomeUnobservedHandler();
    };
    return Atom;
}(BaseAtom));
exports.Atom = Atom;
var isAtom = createInstanceofPredicate("Atom", BaseAtom);
var ComputedValue = (function () {
    function ComputedValue(derivation, scope, compareStructural, name, setter) {
        this.derivation = derivation;
        this.scope = scope;
        this.compareStructural = compareStructural;
        this.dependenciesState = IDerivationState.NOT_TRACKING;
        this.observing = [];
        this.newObserving = null;
        this.isPendingUnobservation = false;
        this.observers = [];
        this.observersIndexes = {};
        this.diffValue = 0;
        this.runId = 0;
        this.lastAccessedBy = 0;
        this.lowestObserverState = IDerivationState.UP_TO_DATE;
        this.unboundDepsCount = 0;
        this.__mapid = "#" + getNextId();
        this.value = undefined;
        this.isComputing = false;
        this.isRunningSetter = false;
        this.name = name || "ComputedValue@" + getNextId();
        if (setter)
            this.setter = createAction(name + "-setter", setter);
    }
    ComputedValue.prototype.onBecomeStale = function () {
        propagateMaybeChanged(this);
    };
    ComputedValue.prototype.onBecomeUnobserved = function () {
        clearObserving(this);
        this.value = undefined;
    };
    ComputedValue.prototype.get = function () {
        invariant(!this.isComputing, "Cycle detected in computation " + this.name, this.derivation);
        if (globalState.inBatch === 0) {
            startBatch();
            if (shouldCompute(this))
                this.value = this.computeValue(false);
            endBatch();
        }
        else {
            reportObserved(this);
            if (shouldCompute(this))
                if (this.trackAndCompute())
                    propagateChangeConfirmed(this);
        }
        var result = this.value;
        if (isCaughtException(result))
            throw result.cause;
        return result;
    };
    ComputedValue.prototype.peek = function () {
        var res = this.computeValue(false);
        if (isCaughtException(res))
            throw res.cause;
        return res;
    };
    ComputedValue.prototype.set = function (value) {
        if (this.setter) {
            invariant(!this.isRunningSetter, "The setter of computed value '" + this.name + "' is trying to update itself. Did you intend to update an _observable_ value, instead of the computed property?");
            this.isRunningSetter = true;
            try {
                this.setter.call(this.scope, value);
            }
            finally {
                this.isRunningSetter = false;
            }
        }
        else
            invariant(false, "[ComputedValue '" + this.name + "'] It is not possible to assign a new value to a computed value.");
    };
    ComputedValue.prototype.trackAndCompute = function () {
        if (isSpyEnabled()) {
            spyReport({
                object: this.scope,
                type: "compute",
                fn: this.derivation
            });
        }
        var oldValue = this.value;
        var newValue = this.value = this.computeValue(true);
        return isCaughtException(newValue) || valueDidChange(this.compareStructural, newValue, oldValue);
    };
    ComputedValue.prototype.computeValue = function (track) {
        this.isComputing = true;
        globalState.computationDepth++;
        var res;
        if (track) {
            res = trackDerivedFunction(this, this.derivation, this.scope);
        }
        else {
            try {
                res = this.derivation.call(this.scope);
            }
            catch (e) {
                res = new CaughtException(e);
            }
        }
        globalState.computationDepth--;
        this.isComputing = false;
        return res;
    };
    ;
    ComputedValue.prototype.observe = function (listener, fireImmediately) {
        var _this = this;
        var firstTime = true;
        var prevValue = undefined;
        return autorun(function () {
            var newValue = _this.get();
            if (!firstTime || fireImmediately) {
                var prevU = untrackedStart();
                listener({
                    type: "update",
                    object: _this,
                    newValue: newValue,
                    oldValue: prevValue
                });
                untrackedEnd(prevU);
            }
            firstTime = false;
            prevValue = newValue;
        });
    };
    ComputedValue.prototype.toJSON = function () {
        return this.get();
    };
    ComputedValue.prototype.toString = function () {
        return this.name + "[" + this.derivation.toString() + "]";
    };
    ComputedValue.prototype.valueOf = function () {
        return toPrimitive(this.get());
    };
    ;
    ComputedValue.prototype.whyRun = function () {
        var isTracking = Boolean(globalState.trackingDerivation);
        var observing = unique(this.isComputing ? this.newObserving : this.observing).map(function (dep) { return dep.name; });
        var observers = unique(getObservers(this).map(function (dep) { return dep.name; }));
        return ("\nWhyRun? computation '" + this.name + "':\n * Running because: " + (isTracking ? "[active] the value of this computation is needed by a reaction" : this.isComputing ? "[get] The value of this computed was requested outside a reaction" : "[idle] not running at the moment") + "\n" +
            (this.dependenciesState === IDerivationState.NOT_TRACKING ? getMessage("m032") :
                " * This computation will re-run if any of the following observables changes:\n    " + joinStrings(observing) + "\n    " + ((this.isComputing && isTracking) ? " (... or any observable accessed during the remainder of the current run)" : "") + "\n\t" + getMessage("m038") + "\n\n  * If the outcome of this computation changes, the following observers will be re-run:\n    " + joinStrings(observers) + "\n"));
    };
    return ComputedValue;
}());
ComputedValue.prototype[primitiveSymbol()] = ComputedValue.prototype.valueOf;
var isComputedValue = createInstanceofPredicate("ComputedValue", ComputedValue);
var IDerivationState;
(function (IDerivationState) {
    IDerivationState[IDerivationState["NOT_TRACKING"] = -1] = "NOT_TRACKING";
    IDerivationState[IDerivationState["UP_TO_DATE"] = 0] = "UP_TO_DATE";
    IDerivationState[IDerivationState["POSSIBLY_STALE"] = 1] = "POSSIBLY_STALE";
    IDerivationState[IDerivationState["STALE"] = 2] = "STALE";
})(IDerivationState || (IDerivationState = {}));
exports.IDerivationState = IDerivationState;
var CaughtException = (function () {
    function CaughtException(cause) {
        this.cause = cause;
    }
    return CaughtException;
}());
function isCaughtException(e) {
    return e instanceof CaughtException;
}
function shouldCompute(derivation) {
    switch (derivation.dependenciesState) {
        case IDerivationState.UP_TO_DATE: return false;
        case IDerivationState.NOT_TRACKING:
        case IDerivationState.STALE: return true;
        case IDerivationState.POSSIBLY_STALE: {
            var prevUntracked = untrackedStart();
            var obs = derivation.observing, l = obs.length;
            for (var i = 0; i < l; i++) {
                var obj = obs[i];
                if (isComputedValue(obj)) {
                    try {
                        obj.get();
                    }
                    catch (e) {
                        untrackedEnd(prevUntracked);
                        return true;
                    }
                    if (derivation.dependenciesState === IDerivationState.STALE) {
                        untrackedEnd(prevUntracked);
                        return true;
                    }
                }
            }
            changeDependenciesStateTo0(derivation);
            untrackedEnd(prevUntracked);
            return false;
        }
    }
}
function isComputingDerivation() {
    return globalState.trackingDerivation !== null;
}
function checkIfStateModificationsAreAllowed(atom) {
    var hasObservers = atom.observers.length > 0;
    if (globalState.computationDepth > 0 && hasObservers)
        fail(getMessage("m031") + atom.name);
    if (!globalState.allowStateChanges && hasObservers)
        fail(getMessage(globalState.strictMode ? "m030a" : "m030b") + atom.name);
}
function trackDerivedFunction(derivation, f, context) {
    changeDependenciesStateTo0(derivation);
    derivation.newObserving = new Array(derivation.observing.length + 100);
    derivation.unboundDepsCount = 0;
    derivation.runId = ++globalState.runId;
    var prevTracking = globalState.trackingDerivation;
    globalState.trackingDerivation = derivation;
    var result;
    try {
        result = f.call(context);
    }
    catch (e) {
        result = new CaughtException(e);
    }
    globalState.trackingDerivation = prevTracking;
    bindDependencies(derivation);
    return result;
}
function bindDependencies(derivation) {
    var prevObserving = derivation.observing;
    var observing = derivation.observing = derivation.newObserving;
    var lowestNewObservingDerivationState = IDerivationState.UP_TO_DATE;
    derivation.newObserving = null;
    var i0 = 0, l = derivation.unboundDepsCount;
    for (var i = 0; i < l; i++) {
        var dep = observing[i];
        if (dep.diffValue === 0) {
            dep.diffValue = 1;
            if (i0 !== i)
                observing[i0] = dep;
            i0++;
        }
        if (dep.dependenciesState > lowestNewObservingDerivationState) {
            lowestNewObservingDerivationState = dep.dependenciesState;
        }
    }
    observing.length = i0;
    l = prevObserving.length;
    while (l--) {
        var dep = prevObserving[l];
        if (dep.diffValue === 0) {
            removeObserver(dep, derivation);
        }
        dep.diffValue = 0;
    }
    while (i0--) {
        var dep = observing[i0];
        if (dep.diffValue === 1) {
            dep.diffValue = 0;
            addObserver(dep, derivation);
        }
    }
    if (lowestNewObservingDerivationState !== IDerivationState.UP_TO_DATE) {
        derivation.dependenciesState = lowestNewObservingDerivationState;
        derivation.onBecomeStale();
    }
}
function clearObserving(derivation) {
    var obs = derivation.observing;
    derivation.observing = [];
    var i = obs.length;
    while (i--)
        removeObserver(obs[i], derivation);
    derivation.dependenciesState = IDerivationState.NOT_TRACKING;
}
function untracked(action) {
    var prev = untrackedStart();
    var res = action();
    untrackedEnd(prev);
    return res;
}
exports.untracked = untracked;
function untrackedStart() {
    var prev = globalState.trackingDerivation;
    globalState.trackingDerivation = null;
    return prev;
}
function untrackedEnd(prev) {
    globalState.trackingDerivation = prev;
}
function changeDependenciesStateTo0(derivation) {
    if (derivation.dependenciesState === IDerivationState.UP_TO_DATE)
        return;
    derivation.dependenciesState = IDerivationState.UP_TO_DATE;
    var obs = derivation.observing;
    var i = obs.length;
    while (i--)
        obs[i].lowestObserverState = IDerivationState.UP_TO_DATE;
}
var persistentKeys = ["mobxGuid", "resetId", "spyListeners", "strictMode", "runId"];
var MobXGlobals = (function () {
    function MobXGlobals() {
        this.version = 5;
        this.trackingDerivation = null;
        this.computationDepth = 0;
        this.runId = 0;
        this.mobxGuid = 0;
        this.inBatch = 0;
        this.pendingUnobservations = [];
        this.pendingReactions = [];
        this.isRunningReactions = false;
        this.allowStateChanges = true;
        this.strictMode = false;
        this.resetId = 0;
        this.spyListeners = [];
        this.globalReactionErrorHandlers = [];
    }
    return MobXGlobals;
}());
var globalState = new MobXGlobals();
function shareGlobalState() {
    var global = getGlobal();
    var ownState = globalState;
    if (global.__mobservableTrackingStack || global.__mobservableViewStack)
        throw new Error("[mobx] An incompatible version of mobservable is already loaded.");
    if (global.__mobxGlobal && global.__mobxGlobal.version !== ownState.version)
        throw new Error("[mobx] An incompatible version of mobx is already loaded.");
    if (global.__mobxGlobal)
        globalState = global.__mobxGlobal;
    else
        global.__mobxGlobal = ownState;
}
function getGlobalState() {
    return globalState;
}
function registerGlobals() {
}
function resetGlobalState() {
    globalState.resetId++;
    var defaultGlobals = new MobXGlobals();
    for (var key in defaultGlobals)
        if (persistentKeys.indexOf(key) === -1)
            globalState[key] = defaultGlobals[key];
    globalState.allowStateChanges = !globalState.strictMode;
}
function hasObservers(observable) {
    return observable.observers && observable.observers.length > 0;
}
function getObservers(observable) {
    return observable.observers;
}
function invariantObservers(observable) {
    var list = observable.observers;
    var map = observable.observersIndexes;
    var l = list.length;
    for (var i = 0; i < l; i++) {
        var id = list[i].__mapid;
        if (i) {
            invariant(map[id] === i, "INTERNAL ERROR maps derivation.__mapid to index in list");
        }
        else {
            invariant(!(id in map), "INTERNAL ERROR observer on index 0 shouldnt be held in map.");
        }
    }
    invariant(list.length === 0 || Object.keys(map).length === list.length - 1, "INTERNAL ERROR there is no junk in map");
}
function addObserver(observable, node) {
    var l = observable.observers.length;
    if (l) {
        observable.observersIndexes[node.__mapid] = l;
    }
    observable.observers[l] = node;
    if (observable.lowestObserverState > node.dependenciesState)
        observable.lowestObserverState = node.dependenciesState;
}
function removeObserver(observable, node) {
    if (observable.observers.length === 1) {
        observable.observers.length = 0;
        queueForUnobservation(observable);
    }
    else {
        var list = observable.observers;
        var map_1 = observable.observersIndexes;
        var filler = list.pop();
        if (filler !== node) {
            var index = map_1[node.__mapid] || 0;
            if (index) {
                map_1[filler.__mapid] = index;
            }
            else {
                delete map_1[filler.__mapid];
            }
            list[index] = filler;
        }
        delete map_1[node.__mapid];
    }
}
function queueForUnobservation(observable) {
    if (!observable.isPendingUnobservation) {
        observable.isPendingUnobservation = true;
        globalState.pendingUnobservations.push(observable);
    }
}
function startBatch() {
    globalState.inBatch++;
}
function endBatch() {
    if (--globalState.inBatch === 0) {
        runReactions();
        var list = globalState.pendingUnobservations;
        for (var i = 0; i < list.length; i++) {
            var observable_1 = list[i];
            observable_1.isPendingUnobservation = false;
            if (observable_1.observers.length === 0) {
                observable_1.onBecomeUnobserved();
            }
        }
        globalState.pendingUnobservations = [];
    }
}
function reportObserved(observable) {
    var derivation = globalState.trackingDerivation;
    if (derivation !== null) {
        if (derivation.runId !== observable.lastAccessedBy) {
            observable.lastAccessedBy = derivation.runId;
            derivation.newObserving[derivation.unboundDepsCount++] = observable;
        }
    }
    else if (observable.observers.length === 0) {
        queueForUnobservation(observable);
    }
}
function invariantLOS(observable, msg) {
    var min = getObservers(observable).reduce(function (a, b) { return Math.min(a, b.dependenciesState); }, 2);
    if (min >= observable.lowestObserverState)
        return;
    throw new Error("lowestObserverState is wrong for " + msg + " because " + min + " < " + observable.lowestObserverState);
}
function propagateChanged(observable) {
    if (observable.lowestObserverState === IDerivationState.STALE)
        return;
    observable.lowestObserverState = IDerivationState.STALE;
    var observers = observable.observers;
    var i = observers.length;
    while (i--) {
        var d = observers[i];
        if (d.dependenciesState === IDerivationState.UP_TO_DATE)
            d.onBecomeStale();
        d.dependenciesState = IDerivationState.STALE;
    }
}
function propagateChangeConfirmed(observable) {
    if (observable.lowestObserverState === IDerivationState.STALE)
        return;
    observable.lowestObserverState = IDerivationState.STALE;
    var observers = observable.observers;
    var i = observers.length;
    while (i--) {
        var d = observers[i];
        if (d.dependenciesState === IDerivationState.POSSIBLY_STALE)
            d.dependenciesState = IDerivationState.STALE;
        else if (d.dependenciesState === IDerivationState.UP_TO_DATE)
            observable.lowestObserverState = IDerivationState.UP_TO_DATE;
    }
}
function propagateMaybeChanged(observable) {
    if (observable.lowestObserverState !== IDerivationState.UP_TO_DATE)
        return;
    observable.lowestObserverState = IDerivationState.POSSIBLY_STALE;
    var observers = observable.observers;
    var i = observers.length;
    while (i--) {
        var d = observers[i];
        if (d.dependenciesState === IDerivationState.UP_TO_DATE) {
            d.dependenciesState = IDerivationState.POSSIBLY_STALE;
            d.onBecomeStale();
        }
    }
}
var Reaction = (function () {
    function Reaction(name, onInvalidate) {
        if (name === void 0) { name = "Reaction@" + getNextId(); }
        this.name = name;
        this.onInvalidate = onInvalidate;
        this.observing = [];
        this.newObserving = [];
        this.dependenciesState = IDerivationState.NOT_TRACKING;
        this.diffValue = 0;
        this.runId = 0;
        this.unboundDepsCount = 0;
        this.__mapid = "#" + getNextId();
        this.isDisposed = false;
        this._isScheduled = false;
        this._isTrackPending = false;
        this._isRunning = false;
    }
    Reaction.prototype.onBecomeStale = function () {
        this.schedule();
    };
    Reaction.prototype.schedule = function () {
        if (!this._isScheduled) {
            this._isScheduled = true;
            globalState.pendingReactions.push(this);
            runReactions();
        }
    };
    Reaction.prototype.isScheduled = function () {
        return this._isScheduled;
    };
    Reaction.prototype.runReaction = function () {
        if (!this.isDisposed) {
            startBatch();
            this._isScheduled = false;
            if (shouldCompute(this)) {
                this._isTrackPending = true;
                this.onInvalidate();
                if (this._isTrackPending && isSpyEnabled()) {
                    spyReport({
                        object: this,
                        type: "scheduled-reaction"
                    });
                }
            }
            endBatch();
        }
    };
    Reaction.prototype.track = function (fn) {
        startBatch();
        var notify = isSpyEnabled();
        var startTime;
        if (notify) {
            startTime = Date.now();
            spyReportStart({
                object: this,
                type: "reaction",
                fn: fn
            });
        }
        this._isRunning = true;
        var result = trackDerivedFunction(this, fn, undefined);
        this._isRunning = false;
        this._isTrackPending = false;
        if (this.isDisposed) {
            clearObserving(this);
        }
        if (isCaughtException(result))
            this.reportExceptionInDerivation(result.cause);
        if (notify) {
            spyReportEnd({
                time: Date.now() - startTime
            });
        }
        endBatch();
    };
    Reaction.prototype.reportExceptionInDerivation = function (error) {
        var _this = this;
        if (this.errorHandler) {
            this.errorHandler(error, this);
            return;
        }
        var message = "[mobx] Encountered an uncaught exception that was thrown by a reaction or observer component, in: '" + this;
        var messageToUser = getMessage("m037");
        console.error(message || messageToUser, error);
        if (isSpyEnabled()) {
            spyReport({
                type: "error",
                message: message,
                error: error,
                object: this
            });
        }
        globalState.globalReactionErrorHandlers.forEach(function (f) { return f(error, _this); });
    };
    Reaction.prototype.dispose = function () {
        if (!this.isDisposed) {
            this.isDisposed = true;
            if (!this._isRunning) {
                startBatch();
                clearObserving(this);
                endBatch();
            }
        }
    };
    Reaction.prototype.getDisposer = function () {
        var r = this.dispose.bind(this);
        r.$mobx = this;
        r.onError = registerErrorHandler;
        return r;
    };
    Reaction.prototype.toString = function () {
        return "Reaction[" + this.name + "]";
    };
    Reaction.prototype.whyRun = function () {
        var observing = unique(this._isRunning ? this.newObserving : this.observing).map(function (dep) { return dep.name; });
        return ("\nWhyRun? reaction '" + this.name + "':\n * Status: [" + (this.isDisposed ? "stopped" : this._isRunning ? "running" : this.isScheduled() ? "scheduled" : "idle") + "]\n * This reaction will re-run if any of the following observables changes:\n    " + joinStrings(observing) + "\n    " + ((this._isRunning) ? " (... or any observable accessed during the remainder of the current run)" : "") + "\n\t" + getMessage("m038") + "\n");
    };
    return Reaction;
}());
exports.Reaction = Reaction;
function registerErrorHandler(handler) {
    invariant(this && this.$mobx && isReaction(this.$mobx), "Invalid `this`");
    invariant(!this.$mobx.errorHandler, "Only one onErrorHandler can be registered");
    this.$mobx.errorHandler = handler;
}
function onReactionError(handler) {
    globalState.globalReactionErrorHandlers.push(handler);
    return function () {
        var idx = globalState.globalReactionErrorHandlers.indexOf(handler);
        if (idx >= 0)
            globalState.globalReactionErrorHandlers.splice(idx, 1);
    };
}
var MAX_REACTION_ITERATIONS = 100;
var reactionScheduler = function (f) { return f(); };
function runReactions() {
    if (globalState.inBatch > 0 || globalState.isRunningReactions)
        return;
    reactionScheduler(runReactionsHelper);
}
function runReactionsHelper() {
    globalState.isRunningReactions = true;
    var allReactions = globalState.pendingReactions;
    var iterations = 0;
    while (allReactions.length > 0) {
        if (++iterations === MAX_REACTION_ITERATIONS) {
            console.error("Reaction doesn't converge to a stable state after " + MAX_REACTION_ITERATIONS + " iterations."
                + (" Probably there is a cycle in the reactive function: " + allReactions[0]));
            allReactions.splice(0);
        }
        var remainingReactions = allReactions.splice(0);
        for (var i = 0, l = remainingReactions.length; i < l; i++)
            remainingReactions[i].runReaction();
    }
    globalState.isRunningReactions = false;
}
var isReaction = createInstanceofPredicate("Reaction", Reaction);
function setReactionScheduler(fn) {
    var baseScheduler = reactionScheduler;
    reactionScheduler = function (f) { return fn(function () { return baseScheduler(f); }); };
}
function isSpyEnabled() {
    return !!globalState.spyListeners.length;
}
function spyReport(event) {
    if (!globalState.spyListeners.length)
        return;
    var listeners = globalState.spyListeners;
    for (var i = 0, l = listeners.length; i < l; i++)
        listeners[i](event);
}
function spyReportStart(event) {
    var change = objectAssign({}, event, { spyReportStart: true });
    spyReport(change);
}
var END_EVENT = { spyReportEnd: true };
function spyReportEnd(change) {
    if (change)
        spyReport(objectAssign({}, change, END_EVENT));
    else
        spyReport(END_EVENT);
}
function spy(listener) {
    globalState.spyListeners.push(listener);
    return once(function () {
        var idx = globalState.spyListeners.indexOf(listener);
        if (idx !== -1)
            globalState.spyListeners.splice(idx, 1);
    });
}
exports.spy = spy;
function hasInterceptors(interceptable) {
    return (interceptable.interceptors && interceptable.interceptors.length > 0);
}
function registerInterceptor(interceptable, handler) {
    var interceptors = interceptable.interceptors || (interceptable.interceptors = []);
    interceptors.push(handler);
    return once(function () {
        var idx = interceptors.indexOf(handler);
        if (idx !== -1)
            interceptors.splice(idx, 1);
    });
}
function interceptChange(interceptable, change) {
    var prevU = untrackedStart();
    try {
        var interceptors = interceptable.interceptors;
        if (interceptors)
            for (var i = 0, l = interceptors.length; i < l; i++) {
                change = interceptors[i](change);
                invariant(!change || change.type, "Intercept handlers should return nothing or a change object");
                if (!change)
                    break;
            }
        return change;
    }
    finally {
        untrackedEnd(prevU);
    }
}
function hasListeners(listenable) {
    return listenable.changeListeners && listenable.changeListeners.length > 0;
}
function registerListener(listenable, handler) {
    var listeners = listenable.changeListeners || (listenable.changeListeners = []);
    listeners.push(handler);
    return once(function () {
        var idx = listeners.indexOf(handler);
        if (idx !== -1)
            listeners.splice(idx, 1);
    });
}
function notifyListeners(listenable, change) {
    var prevU = untrackedStart();
    var listeners = listenable.changeListeners;
    if (!listeners)
        return;
    listeners = listeners.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i](change);
    }
    untrackedEnd(prevU);
}
function asReference(value) {
    deprecated("asReference is deprecated, use observable.ref instead");
    return observable.ref(value);
}
exports.asReference = asReference;
function asStructure(value) {
    deprecated("asStructure is deprecated. Use observable.struct, computed.struct or reaction options instead.");
    return observable.struct(value);
}
exports.asStructure = asStructure;
function asFlat(value) {
    deprecated("asFlat is deprecated, use observable.shallow instead");
    return observable.shallow(value);
}
exports.asFlat = asFlat;
function asMap(data) {
    deprecated("asMap is deprecated, use observable.map or observable.shallowMap instead");
    return observable.map(data || {});
}
exports.asMap = asMap;
function isModifierDescriptor(thing) {
    return typeof thing === "object" && thing !== null && thing.isMobxModifierDescriptor === true;
}
exports.isModifierDescriptor = isModifierDescriptor;
function createModifierDescriptor(enhancer, initialValue) {
    invariant(!isModifierDescriptor(initialValue), "Modifiers cannot be nested");
    return {
        isMobxModifierDescriptor: true,
        initialValue: initialValue,
        enhancer: enhancer
    };
}
function deepEnhancer(v, _, name) {
    if (isModifierDescriptor(v))
        fail("You tried to assign a modifier wrapped value to a collection, please define modifiers when creating the collection, not when modifying it");
    if (isObservable(v))
        return v;
    if (Array.isArray(v))
        return observable.array(v, name);
    if (isPlainObject(v))
        return observable.object(v, name);
    if (isES6Map(v))
        return observable.map(v, name);
    return v;
}
function shallowEnhancer(v, _, name) {
    if (isModifierDescriptor(v))
        fail("You tried to assign a modifier wrapped value to a collection, please define modifiers when creating the collection, not when modifying it");
    if (v === undefined || v === null)
        return v;
    if (isObservableObject(v) || isObservableArray(v) || isObservableMap(v))
        return v;
    if (Array.isArray(v))
        return observable.shallowArray(v, name);
    if (isPlainObject(v))
        return observable.shallowObject(v, name);
    if (isES6Map(v))
        return observable.shallowMap(v, name);
    return fail("The shallow modifier / decorator can only used in combination with arrays, objects and maps");
}
function referenceEnhancer(newValue) {
    return newValue;
}
function deepStructEnhancer(v, oldValue, name) {
    if (deepEqual(v, oldValue))
        return oldValue;
    if (isObservable(v))
        return v;
    if (Array.isArray(v))
        return new ObservableArray(v, deepStructEnhancer, name);
    if (isES6Map(v))
        return new ObservableMap(v, deepStructEnhancer, name);
    if (isPlainObject(v)) {
        var res = {};
        asObservableObject(res, name);
        extendObservableHelper(res, deepStructEnhancer, [v]);
        return res;
    }
    return v;
}
function refStructEnhancer(v, oldValue, name) {
    if (deepEqual(v, oldValue))
        return oldValue;
    return v;
}
var MAX_SPLICE_SIZE = 10000;
var safariPrototypeSetterInheritanceBug = (function () {
    var v = false;
    var p = {};
    Object.defineProperty(p, "0", { set: function () { v = true; } });
    Object.create(p)["0"] = 1;
    return v === false;
})();
var OBSERVABLE_ARRAY_BUFFER_SIZE = 0;
var StubArray = (function () {
    function StubArray() {
    }
    return StubArray;
}());
StubArray.prototype = [];
var ObservableArrayAdministration = (function () {
    function ObservableArrayAdministration(name, enhancer, array, owned) {
        this.array = array;
        this.owned = owned;
        this.lastKnownLength = 0;
        this.interceptors = null;
        this.changeListeners = null;
        this.atom = new BaseAtom(name || ("ObservableArray@" + getNextId()));
        this.enhancer = function (newV, oldV) { return enhancer(newV, oldV, name + "[..]"); };
    }
    ObservableArrayAdministration.prototype.intercept = function (handler) {
        return registerInterceptor(this, handler);
    };
    ObservableArrayAdministration.prototype.observe = function (listener, fireImmediately) {
        if (fireImmediately === void 0) { fireImmediately = false; }
        if (fireImmediately) {
            listener({
                object: this.array,
                type: "splice",
                index: 0,
                added: this.values.slice(),
                addedCount: this.values.length,
                removed: [],
                removedCount: 0
            });
        }
        return registerListener(this, listener);
    };
    ObservableArrayAdministration.prototype.getArrayLength = function () {
        this.atom.reportObserved();
        return this.values.length;
    };
    ObservableArrayAdministration.prototype.setArrayLength = function (newLength) {
        if (typeof newLength !== "number" || newLength < 0)
            throw new Error("[mobx.array] Out of range: " + newLength);
        var currentLength = this.values.length;
        if (newLength === currentLength)
            return;
        else if (newLength > currentLength) {
            var newItems = new Array(newLength - currentLength);
            for (var i = 0; i < newLength - currentLength; i++)
                newItems[i] = undefined;
            this.spliceWithArray(currentLength, 0, newItems);
        }
        else
            this.spliceWithArray(newLength, currentLength - newLength);
    };
    ObservableArrayAdministration.prototype.updateArrayLength = function (oldLength, delta) {
        if (oldLength !== this.lastKnownLength)
            throw new Error("[mobx] Modification exception: the internal structure of an observable array was changed. Did you use peek() to change it?");
        this.lastKnownLength += delta;
        if (delta > 0 && oldLength + delta + 1 > OBSERVABLE_ARRAY_BUFFER_SIZE)
            reserveArrayBuffer(oldLength + delta + 1);
    };
    ObservableArrayAdministration.prototype.spliceWithArray = function (index, deleteCount, newItems) {
        var _this = this;
        checkIfStateModificationsAreAllowed(this.atom);
        var length = this.values.length;
        if (index === undefined)
            index = 0;
        else if (index > length)
            index = length;
        else if (index < 0)
            index = Math.max(0, length + index);
        if (arguments.length === 1)
            deleteCount = length - index;
        else if (deleteCount === undefined || deleteCount === null)
            deleteCount = 0;
        else
            deleteCount = Math.max(0, Math.min(deleteCount, length - index));
        if (newItems === undefined)
            newItems = [];
        if (hasInterceptors(this)) {
            var change = interceptChange(this, {
                object: this.array,
                type: "splice",
                index: index,
                removedCount: deleteCount,
                added: newItems
            });
            if (!change)
                return EMPTY_ARRAY;
            deleteCount = change.removedCount;
            newItems = change.added;
        }
        newItems = newItems.map(function (v) { return _this.enhancer(v, undefined); });
        var lengthDelta = newItems.length - deleteCount;
        this.updateArrayLength(length, lengthDelta);
        var res = this.spliceItemsIntoValues(index, deleteCount, newItems);
        if (deleteCount !== 0 || newItems.length !== 0)
            this.notifyArraySplice(index, newItems, res);
        return res;
    };
    ObservableArrayAdministration.prototype.spliceItemsIntoValues = function (index, deleteCount, newItems) {
        if (newItems.length < MAX_SPLICE_SIZE) {
            return (_a = this.values).splice.apply(_a, [index, deleteCount].concat(newItems));
        }
        else {
            var res = this.values.slice(index, index + deleteCount);
            this.values = this.values.slice(0, index).concat(newItems, this.values.slice(index + deleteCount));
            return res;
        }
        var _a;
    };
    ObservableArrayAdministration.prototype.notifyArrayChildUpdate = function (index, newValue, oldValue) {
        var notifySpy = !this.owned && isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy ? {
            object: this.array,
            type: "update",
            index: index, newValue: newValue, oldValue: oldValue
        } : null;
        if (notifySpy)
            spyReportStart(change);
        this.atom.reportChanged();
        if (notify)
            notifyListeners(this, change);
        if (notifySpy)
            spyReportEnd();
    };
    ObservableArrayAdministration.prototype.notifyArraySplice = function (index, added, removed) {
        var notifySpy = !this.owned && isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy ? {
            object: this.array,
            type: "splice",
            index: index, removed: removed, added: added,
            removedCount: removed.length,
            addedCount: added.length
        } : null;
        if (notifySpy)
            spyReportStart(change);
        this.atom.reportChanged();
        if (notify)
            notifyListeners(this, change);
        if (notifySpy)
            spyReportEnd();
    };
    return ObservableArrayAdministration;
}());
var ObservableArray = (function (_super) {
    __extends(ObservableArray, _super);
    function ObservableArray(initialValues, enhancer, name, owned) {
        if (name === void 0) { name = "ObservableArray@" + getNextId(); }
        if (owned === void 0) { owned = false; }
        var _this = _super.call(this) || this;
        var adm = new ObservableArrayAdministration(name, enhancer, _this, owned);
        addHiddenFinalProp(_this, "$mobx", adm);
        if (initialValues && initialValues.length) {
            adm.updateArrayLength(0, initialValues.length);
            adm.values = initialValues.map(function (v) { return enhancer(v, undefined, name + "[..]"); });
            adm.notifyArraySplice(0, adm.values.slice(), EMPTY_ARRAY);
        }
        else {
            adm.values = [];
        }
        if (safariPrototypeSetterInheritanceBug) {
            Object.defineProperty(adm.array, "0", ENTRY_0);
        }
        return _this;
    }
    ObservableArray.prototype.intercept = function (handler) {
        return this.$mobx.intercept(handler);
    };
    ObservableArray.prototype.observe = function (listener, fireImmediately) {
        if (fireImmediately === void 0) { fireImmediately = false; }
        return this.$mobx.observe(listener, fireImmediately);
    };
    ObservableArray.prototype.clear = function () {
        return this.splice(0);
    };
    ObservableArray.prototype.concat = function () {
        var arrays = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            arrays[_i] = arguments[_i];
        }
        this.$mobx.atom.reportObserved();
        return Array.prototype.concat.apply(this.peek(), arrays.map(function (a) { return isObservableArray(a) ? a.peek() : a; }));
    };
    ObservableArray.prototype.replace = function (newItems) {
        return this.$mobx.spliceWithArray(0, this.$mobx.values.length, newItems);
    };
    ObservableArray.prototype.toJS = function () {
        return this.slice();
    };
    ObservableArray.prototype.toJSON = function () {
        return this.toJS();
    };
    ObservableArray.prototype.peek = function () {
        return this.$mobx.values;
    };
    ObservableArray.prototype.find = function (predicate, thisArg, fromIndex) {
        if (fromIndex === void 0) { fromIndex = 0; }
        this.$mobx.atom.reportObserved();
        var items = this.$mobx.values, l = items.length;
        for (var i = fromIndex; i < l; i++)
            if (predicate.call(thisArg, items[i], i, this))
                return items[i];
        return undefined;
    };
    ObservableArray.prototype.splice = function (index, deleteCount) {
        var newItems = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            newItems[_i - 2] = arguments[_i];
        }
        switch (arguments.length) {
            case 0:
                return [];
            case 1:
                return this.$mobx.spliceWithArray(index);
            case 2:
                return this.$mobx.spliceWithArray(index, deleteCount);
        }
        return this.$mobx.spliceWithArray(index, deleteCount, newItems);
    };
    ObservableArray.prototype.spliceWithArray = function (index, deleteCount, newItems) {
        return this.$mobx.spliceWithArray(index, deleteCount, newItems);
    };
    ObservableArray.prototype.push = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        var adm = this.$mobx;
        adm.spliceWithArray(adm.values.length, 0, items);
        return adm.values.length;
    };
    ObservableArray.prototype.pop = function () {
        return this.splice(Math.max(this.$mobx.values.length - 1, 0), 1)[0];
    };
    ObservableArray.prototype.shift = function () {
        return this.splice(0, 1)[0];
    };
    ObservableArray.prototype.unshift = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        var adm = this.$mobx;
        adm.spliceWithArray(0, 0, items);
        return adm.values.length;
    };
    ObservableArray.prototype.reverse = function () {
        this.$mobx.atom.reportObserved();
        var clone = this.slice();
        return clone.reverse.apply(clone, arguments);
    };
    ObservableArray.prototype.sort = function (compareFn) {
        this.$mobx.atom.reportObserved();
        var clone = this.slice();
        return clone.sort.apply(clone, arguments);
    };
    ObservableArray.prototype.remove = function (value) {
        var idx = this.$mobx.values.indexOf(value);
        if (idx > -1) {
            this.splice(idx, 1);
            return true;
        }
        return false;
    };
    ObservableArray.prototype.move = function (fromIndex, toIndex) {
        function checkIndex(index) {
            if (index < 0) {
                throw new Error("[mobx.array] Index out of bounds: " + index + " is negative");
            }
            var length = this.$mobx.values.length;
            if (index >= length) {
                throw new Error("[mobx.array] Index out of bounds: " + index + " is not smaller than " + length);
            }
        }
        checkIndex.call(this, fromIndex);
        checkIndex.call(this, toIndex);
        if (fromIndex === toIndex) {
            return;
        }
        var oldItems = this.$mobx.values;
        var newItems;
        if (fromIndex < toIndex) {
            newItems = oldItems.slice(0, fromIndex).concat(oldItems.slice(fromIndex + 1, toIndex + 1), [oldItems[fromIndex]], oldItems.slice(toIndex + 1));
        }
        else {
            newItems = oldItems.slice(0, toIndex).concat([oldItems[fromIndex]], oldItems.slice(toIndex, fromIndex), oldItems.slice(fromIndex + 1));
        }
        this.replace(newItems);
    };
    ObservableArray.prototype.toString = function () {
        this.$mobx.atom.reportObserved();
        return Array.prototype.toString.apply(this.$mobx.values, arguments);
    };
    ObservableArray.prototype.toLocaleString = function () {
        this.$mobx.atom.reportObserved();
        return Array.prototype.toLocaleString.apply(this.$mobx.values, arguments);
    };
    ObservableArray.prototype.get = function (index) {
        var impl = this.$mobx;
        if (impl) {
            if (index < impl.values.length) {
                impl.atom.reportObserved();
                return impl.values[index];
            }
            console.warn("[mobx.array] Attempt to read an array index (" + index + ") that is out of bounds (" + impl.values.length + "). Please check length first. Out of bound indices will not be tracked by MobX");
        }
        return undefined;
    };
    ObservableArray.prototype.set = function (index, newValue) {
        var adm = this.$mobx;
        var values = adm.values;
        if (index < values.length) {
            checkIfStateModificationsAreAllowed(adm.atom);
            var oldValue = values[index];
            if (hasInterceptors(adm)) {
                var change = interceptChange(adm, {
                    type: "update",
                    object: this,
                    index: index, newValue: newValue
                });
                if (!change)
                    return;
                newValue = change.newValue;
            }
            newValue = adm.enhancer(newValue, oldValue);
            var changed = newValue !== oldValue;
            if (changed) {
                values[index] = newValue;
                adm.notifyArrayChildUpdate(index, newValue, oldValue);
            }
        }
        else if (index === values.length) {
            adm.spliceWithArray(index, 0, [newValue]);
        }
        else {
            throw new Error("[mobx.array] Index out of bounds, " + index + " is larger than " + values.length);
        }
    };
    return ObservableArray;
}(StubArray));
declareIterator(ObservableArray.prototype, function () {
    return arrayAsIterator(this.slice());
});
makeNonEnumerable(ObservableArray.prototype, [
    "constructor",
    "intercept",
    "observe",
    "clear",
    "concat",
    "get",
    "replace",
    "toJS",
    "toJSON",
    "peek",
    "find",
    "splice",
    "spliceWithArray",
    "push",
    "pop",
    "set",
    "shift",
    "unshift",
    "reverse",
    "sort",
    "remove",
    "move",
    "toString",
    "toLocaleString"
]);
Object.defineProperty(ObservableArray.prototype, "length", {
    enumerable: false,
    configurable: true,
    get: function () {
        return this.$mobx.getArrayLength();
    },
    set: function (newLength) {
        this.$mobx.setArrayLength(newLength);
    }
});
[
    "every",
    "filter",
    "forEach",
    "indexOf",
    "join",
    "lastIndexOf",
    "map",
    "reduce",
    "reduceRight",
    "slice",
    "some"
].forEach(function (funcName) {
    var baseFunc = Array.prototype[funcName];
    invariant(typeof baseFunc === "function", "Base function not defined on Array prototype: '" + funcName + "'");
    addHiddenProp(ObservableArray.prototype, funcName, function () {
        this.$mobx.atom.reportObserved();
        return baseFunc.apply(this.$mobx.values, arguments);
    });
});
var ENTRY_0 = createArrayEntryDescriptor(0);
function createArrayEntryDescriptor(index) {
    return {
        enumerable: false,
        configurable: false,
        get: function () {
            return this.get(index);
        },
        set: function (value) {
            this.set(index, value);
        }
    };
}
function createArrayBufferItem(index) {
    Object.defineProperty(ObservableArray.prototype, "" + index, createArrayEntryDescriptor(index));
}
function reserveArrayBuffer(max) {
    for (var index = OBSERVABLE_ARRAY_BUFFER_SIZE; index < max; index++)
        createArrayBufferItem(index);
    OBSERVABLE_ARRAY_BUFFER_SIZE = max;
}
reserveArrayBuffer(1000);
var isObservableArrayAdministration = createInstanceofPredicate("ObservableArrayAdministration", ObservableArrayAdministration);
function isObservableArray(thing) {
    return isObject(thing) && isObservableArrayAdministration(thing.$mobx);
}
exports.isObservableArray = isObservableArray;
var ObservableMapMarker = {};
var ObservableMap = (function () {
    function ObservableMap(initialData, enhancer, name) {
        if (enhancer === void 0) { enhancer = deepEnhancer; }
        if (name === void 0) { name = "ObservableMap@" + getNextId(); }
        this.enhancer = enhancer;
        this.name = name;
        this.$mobx = ObservableMapMarker;
        this._data = Object.create(null);
        this._hasMap = Object.create(null);
        this._keys = new ObservableArray(undefined, referenceEnhancer, this.name + ".keys()", true);
        this.interceptors = null;
        this.changeListeners = null;
        this.merge(initialData);
    }
    ObservableMap.prototype._has = function (key) {
        return typeof this._data[key] !== "undefined";
    };
    ObservableMap.prototype.has = function (key) {
        if (!this.isValidKey(key))
            return false;
        key = "" + key;
        if (this._hasMap[key])
            return this._hasMap[key].get();
        return this._updateHasMapEntry(key, false).get();
    };
    ObservableMap.prototype.set = function (key, value) {
        this.assertValidKey(key);
        key = "" + key;
        var hasKey = this._has(key);
        if (hasInterceptors(this)) {
            var change = interceptChange(this, {
                type: hasKey ? "update" : "add",
                object: this,
                newValue: value,
                name: key
            });
            if (!change)
                return this;
            value = change.newValue;
        }
        if (hasKey) {
            this._updateValue(key, value);
        }
        else {
            this._addValue(key, value);
        }
        return this;
    };
    ObservableMap.prototype.delete = function (key) {
        var _this = this;
        this.assertValidKey(key);
        key = "" + key;
        if (hasInterceptors(this)) {
            var change = interceptChange(this, {
                type: "delete",
                object: this,
                name: key
            });
            if (!change)
                return false;
        }
        if (this._has(key)) {
            var notifySpy = isSpyEnabled();
            var notify = hasListeners(this);
            var change = notify || notifySpy ? {
                type: "delete",
                object: this,
                oldValue: this._data[key].value,
                name: key
            } : null;
            if (notifySpy)
                spyReportStart(change);
            runInTransaction(function () {
                _this._keys.remove(key);
                _this._updateHasMapEntry(key, false);
                var observable = _this._data[key];
                observable.setNewValue(undefined);
                _this._data[key] = undefined;
            });
            if (notify)
                notifyListeners(this, change);
            if (notifySpy)
                spyReportEnd();
            return true;
        }
        return false;
    };
    ObservableMap.prototype._updateHasMapEntry = function (key, value) {
        var entry = this._hasMap[key];
        if (entry) {
            entry.setNewValue(value);
        }
        else {
            entry = this._hasMap[key] = new ObservableValue(value, referenceEnhancer, this.name + "." + key + "?", false);
        }
        return entry;
    };
    ObservableMap.prototype._updateValue = function (name, newValue) {
        var observable = this._data[name];
        newValue = observable.prepareNewValue(newValue);
        if (newValue !== UNCHANGED) {
            var notifySpy = isSpyEnabled();
            var notify = hasListeners(this);
            var change = notify || notifySpy ? {
                type: "update",
                object: this,
                oldValue: observable.value,
                name: name, newValue: newValue
            } : null;
            if (notifySpy)
                spyReportStart(change);
            observable.setNewValue(newValue);
            if (notify)
                notifyListeners(this, change);
            if (notifySpy)
                spyReportEnd();
        }
    };
    ObservableMap.prototype._addValue = function (name, newValue) {
        var _this = this;
        runInTransaction(function () {
            var observable = _this._data[name] = new ObservableValue(newValue, _this.enhancer, _this.name + "." + name, false);
            newValue = observable.value;
            _this._updateHasMapEntry(name, true);
            _this._keys.push(name);
        });
        var notifySpy = isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy ? {
            type: "add",
            object: this,
            name: name, newValue: newValue
        } : null;
        if (notifySpy)
            spyReportStart(change);
        if (notify)
            notifyListeners(this, change);
        if (notifySpy)
            spyReportEnd();
    };
    ObservableMap.prototype.get = function (key) {
        key = "" + key;
        if (this.has(key))
            return this._data[key].get();
        return undefined;
    };
    ObservableMap.prototype.keys = function () {
        return arrayAsIterator(this._keys.slice());
    };
    ObservableMap.prototype.values = function () {
        return arrayAsIterator(this._keys.map(this.get, this));
    };
    ObservableMap.prototype.entries = function () {
        var _this = this;
        return arrayAsIterator(this._keys.map(function (key) { return [key, _this.get(key)]; }));
    };
    ObservableMap.prototype.forEach = function (callback, thisArg) {
        var _this = this;
        this.keys().forEach(function (key) { return callback.call(thisArg, _this.get(key), key, _this); });
    };
    ObservableMap.prototype.merge = function (other) {
        var _this = this;
        if (isObservableMap(other)) {
            other = other.toJS();
        }
        runInTransaction(function () {
            if (isPlainObject(other))
                Object.keys(other).forEach(function (key) { return _this.set(key, other[key]); });
            else if (Array.isArray(other))
                other.forEach(function (_a) {
                    var key = _a[0], value = _a[1];
                    return _this.set(key, value);
                });
            else if (isES6Map(other))
                other.forEach(function (value, key) { return _this.set(key, value); });
            else if (other !== null && other !== undefined)
                fail("Cannot initialize map from " + other);
        });
        return this;
    };
    ObservableMap.prototype.clear = function () {
        var _this = this;
        runInTransaction(function () {
            untracked(function () {
                _this.keys().forEach(_this.delete, _this);
            });
        });
    };
    ObservableMap.prototype.replace = function (values) {
        var _this = this;
        runInTransaction(function () {
            _this.clear();
            _this.merge(values);
        });
        return this;
    };
    Object.defineProperty(ObservableMap.prototype, "size", {
        get: function () {
            return this._keys.length;
        },
        enumerable: true,
        configurable: true
    });
    ObservableMap.prototype.toJS = function () {
        var _this = this;
        var res = {};
        this.keys().forEach(function (key) { return res[key] = _this.get(key); });
        return res;
    };
    ObservableMap.prototype.toJSON = function () {
        return this.toJS();
    };
    ObservableMap.prototype.isValidKey = function (key) {
        if (key === null || key === undefined)
            return false;
        if (typeof key === "string" || typeof key === "number" || typeof key === "boolean")
            return true;
        return false;
    };
    ObservableMap.prototype.assertValidKey = function (key) {
        if (!this.isValidKey(key))
            throw new Error("[mobx.map] Invalid key: '" + key + "', only strings, numbers and booleans are accepted as key in observable maps.");
    };
    ObservableMap.prototype.toString = function () {
        var _this = this;
        return this.name + "[{ " + this.keys().map(function (key) { return key + ": " + ("" + _this.get(key)); }).join(", ") + " }]";
    };
    ObservableMap.prototype.observe = function (listener, fireImmediately) {
        invariant(fireImmediately !== true, getMessage("m033"));
        return registerListener(this, listener);
    };
    ObservableMap.prototype.intercept = function (handler) {
        return registerInterceptor(this, handler);
    };
    return ObservableMap;
}());
exports.ObservableMap = ObservableMap;
declareIterator(ObservableMap.prototype, function () {
    return this.entries();
});
function map(initialValues) {
    deprecated("`mobx.map` is deprecated, use `new ObservableMap` or `mobx.observable.map` instead");
    return observable.map(initialValues);
}
exports.map = map;
var isObservableMap = createInstanceofPredicate("ObservableMap", ObservableMap);
exports.isObservableMap = isObservableMap;
var ObservableObjectAdministration = (function () {
    function ObservableObjectAdministration(target, name) {
        this.target = target;
        this.name = name;
        this.values = {};
        this.changeListeners = null;
        this.interceptors = null;
    }
    ObservableObjectAdministration.prototype.observe = function (callback, fireImmediately) {
        invariant(fireImmediately !== true, "`observe` doesn't support the fire immediately property for observable objects.");
        return registerListener(this, callback);
    };
    ObservableObjectAdministration.prototype.intercept = function (handler) {
        return registerInterceptor(this, handler);
    };
    return ObservableObjectAdministration;
}());
function asObservableObject(target, name) {
    if (isObservableObject(target))
        return target.$mobx;
    invariant(Object.isExtensible(target), getMessage("m035"));
    if (!isPlainObject(target))
        name = (target.constructor.name || "ObservableObject") + "@" + getNextId();
    if (!name)
        name = "ObservableObject@" + getNextId();
    var adm = new ObservableObjectAdministration(target, name);
    addHiddenFinalProp(target, "$mobx", adm);
    return adm;
}
function defineObservablePropertyFromDescriptor(adm, propName, descriptor, defaultEnhancer) {
    if (adm.values[propName]) {
        invariant("value" in descriptor, "The property " + propName + " in " + adm.name + " is already observable, cannot redefine it as computed property");
        adm.target[propName] = descriptor.value;
        return;
    }
    if ("value" in descriptor) {
        if (isModifierDescriptor(descriptor.value)) {
            var modifierDescriptor = descriptor.value;
            defineObservableProperty(adm, propName, modifierDescriptor.initialValue, modifierDescriptor.enhancer);
        }
        else if (isAction(descriptor.value) && descriptor.value.autoBind === true) {
            defineBoundAction(adm.target, propName, descriptor.value.originalFn);
        }
        else if (isComputedValue(descriptor.value)) {
            defineComputedPropertyFromComputedValue(adm, propName, descriptor.value);
        }
        else {
            defineObservableProperty(adm, propName, descriptor.value, defaultEnhancer);
        }
    }
    else {
        defineComputedProperty(adm, propName, descriptor.get, descriptor.set, false, true);
    }
}
function defineObservableProperty(adm, propName, newValue, enhancer) {
    assertPropertyConfigurable(adm.target, propName);
    if (hasInterceptors(adm)) {
        var change = interceptChange(adm, {
            object: adm.target,
            name: propName,
            type: "add",
            newValue: newValue
        });
        if (!change)
            return;
        newValue = change.newValue;
    }
    var observable = adm.values[propName] = new ObservableValue(newValue, enhancer, adm.name + "." + propName, false);
    newValue = observable.value;
    Object.defineProperty(adm.target, propName, generateObservablePropConfig(propName));
    notifyPropertyAddition(adm, adm.target, propName, newValue);
}
function defineComputedProperty(adm, propName, getter, setter, compareStructural, asInstanceProperty) {
    if (asInstanceProperty)
        assertPropertyConfigurable(adm.target, propName);
    adm.values[propName] = new ComputedValue(getter, adm.target, compareStructural, adm.name + "." + propName, setter);
    if (asInstanceProperty) {
        Object.defineProperty(adm.target, propName, generateComputedPropConfig(propName));
    }
}
function defineComputedPropertyFromComputedValue(adm, propName, computedValue) {
    var name = adm.name + "." + propName;
    computedValue.name = name;
    if (!computedValue.scope)
        computedValue.scope = adm.target;
    adm.values[propName] = computedValue;
    Object.defineProperty(adm.target, propName, generateComputedPropConfig(propName));
}
var observablePropertyConfigs = {};
var computedPropertyConfigs = {};
function generateObservablePropConfig(propName) {
    return observablePropertyConfigs[propName] || (observablePropertyConfigs[propName] = {
        configurable: true,
        enumerable: true,
        get: function () {
            return this.$mobx.values[propName].get();
        },
        set: function (v) {
            setPropertyValue(this, propName, v);
        }
    });
}
function generateComputedPropConfig(propName) {
    return computedPropertyConfigs[propName] || (computedPropertyConfigs[propName] = {
        configurable: true,
        enumerable: false,
        get: function () {
            return this.$mobx.values[propName].get();
        },
        set: function (v) {
            return this.$mobx.values[propName].set(v);
        }
    });
}
function setPropertyValue(instance, name, newValue) {
    var adm = instance.$mobx;
    var observable = adm.values[name];
    if (hasInterceptors(adm)) {
        var change = interceptChange(adm, {
            type: "update",
            object: instance,
            name: name, newValue: newValue
        });
        if (!change)
            return;
        newValue = change.newValue;
    }
    newValue = observable.prepareNewValue(newValue);
    if (newValue !== UNCHANGED) {
        var notify = hasListeners(adm);
        var notifySpy = isSpyEnabled();
        var change = notify || notifySpy ? {
            type: "update",
            object: instance,
            oldValue: observable.value,
            name: name, newValue: newValue
        } : null;
        if (notifySpy)
            spyReportStart(change);
        observable.setNewValue(newValue);
        if (notify)
            notifyListeners(adm, change);
        if (notifySpy)
            spyReportEnd();
    }
}
function notifyPropertyAddition(adm, object, name, newValue) {
    var notify = hasListeners(adm);
    var notifySpy = isSpyEnabled();
    var change = notify || notifySpy ? {
        type: "add",
        object: object, name: name, newValue: newValue
    } : null;
    if (notifySpy)
        spyReportStart(change);
    if (notify)
        notifyListeners(adm, change);
    if (notifySpy)
        spyReportEnd();
}
var isObservableObjectAdministration = createInstanceofPredicate("ObservableObjectAdministration", ObservableObjectAdministration);
function isObservableObject(thing) {
    if (isObject(thing)) {
        runLazyInitializers(thing);
        return isObservableObjectAdministration(thing.$mobx);
    }
    return false;
}
exports.isObservableObject = isObservableObject;
var UNCHANGED = {};
var ObservableValue = (function (_super) {
    __extends(ObservableValue, _super);
    function ObservableValue(value, enhancer, name, notifySpy) {
        if (name === void 0) { name = "ObservableValue@" + getNextId(); }
        if (notifySpy === void 0) { notifySpy = true; }
        var _this = _super.call(this, name) || this;
        _this.enhancer = enhancer;
        _this.hasUnreportedChange = false;
        _this.value = enhancer(value, undefined, name);
        if (notifySpy && isSpyEnabled()) {
            spyReport({ type: "create", object: _this, newValue: _this.value });
        }
        return _this;
    }
    ObservableValue.prototype.set = function (newValue) {
        var oldValue = this.value;
        newValue = this.prepareNewValue(newValue);
        if (newValue !== UNCHANGED) {
            var notifySpy = isSpyEnabled();
            if (notifySpy) {
                spyReportStart({
                    type: "update",
                    object: this,
                    newValue: newValue, oldValue: oldValue
                });
            }
            this.setNewValue(newValue);
            if (notifySpy)
                spyReportEnd();
        }
    };
    ObservableValue.prototype.prepareNewValue = function (newValue) {
        checkIfStateModificationsAreAllowed(this);
        if (hasInterceptors(this)) {
            var change = interceptChange(this, { object: this, type: "update", newValue: newValue });
            if (!change)
                return UNCHANGED;
            newValue = change.newValue;
        }
        newValue = this.enhancer(newValue, this.value, this.name);
        return this.value !== newValue
            ? newValue
            : UNCHANGED;
    };
    ObservableValue.prototype.setNewValue = function (newValue) {
        var oldValue = this.value;
        this.value = newValue;
        this.reportChanged();
        if (hasListeners(this)) {
            notifyListeners(this, {
                type: "update",
                object: this,
                newValue: newValue,
                oldValue: oldValue
            });
        }
    };
    ObservableValue.prototype.get = function () {
        this.reportObserved();
        return this.value;
    };
    ObservableValue.prototype.intercept = function (handler) {
        return registerInterceptor(this, handler);
    };
    ObservableValue.prototype.observe = function (listener, fireImmediately) {
        if (fireImmediately)
            listener({
                object: this,
                type: "update",
                newValue: this.value,
                oldValue: undefined
            });
        return registerListener(this, listener);
    };
    ObservableValue.prototype.toJSON = function () {
        return this.get();
    };
    ObservableValue.prototype.toString = function () {
        return this.name + "[" + this.value + "]";
    };
    ObservableValue.prototype.valueOf = function () {
        return toPrimitive(this.get());
    };
    return ObservableValue;
}(BaseAtom));
ObservableValue.prototype[primitiveSymbol()] = ObservableValue.prototype.valueOf;
var isObservableValue = createInstanceofPredicate("ObservableValue", ObservableValue);
exports.isBoxedObservable = isObservableValue;
function getAtom(thing, property) {
    if (typeof thing === "object" && thing !== null) {
        if (isObservableArray(thing)) {
            invariant(property === undefined, getMessage("m036"));
            return thing.$mobx.atom;
        }
        if (isObservableMap(thing)) {
            var anyThing = thing;
            if (property === undefined)
                return getAtom(anyThing._keys);
            var observable_2 = anyThing._data[property] || anyThing._hasMap[property];
            invariant(!!observable_2, "the entry '" + property + "' does not exist in the observable map '" + getDebugName(thing) + "'");
            return observable_2;
        }
        runLazyInitializers(thing);
        if (isObservableObject(thing)) {
            if (!property)
                return fail("please specify a property");
            var observable_3 = thing.$mobx.values[property];
            invariant(!!observable_3, "no observable property '" + property + "' found on the observable object '" + getDebugName(thing) + "'");
            return observable_3;
        }
        if (isAtom(thing) || isComputedValue(thing) || isReaction(thing)) {
            return thing;
        }
    }
    else if (typeof thing === "function") {
        if (isReaction(thing.$mobx)) {
            return thing.$mobx;
        }
    }
    return fail("Cannot obtain atom from " + thing);
}
function getAdministration(thing, property) {
    invariant(thing, "Expecting some object");
    if (property !== undefined)
        return getAdministration(getAtom(thing, property));
    if (isAtom(thing) || isComputedValue(thing) || isReaction(thing))
        return thing;
    if (isObservableMap(thing))
        return thing;
    runLazyInitializers(thing);
    if (thing.$mobx)
        return thing.$mobx;
    invariant(false, "Cannot obtain administration from " + thing);
}
function getDebugName(thing, property) {
    var named;
    if (property !== undefined)
        named = getAtom(thing, property);
    else if (isObservableObject(thing) || isObservableMap(thing))
        named = getAdministration(thing);
    else
        named = getAtom(thing);
    return named.name;
}
function createClassPropertyDecorator(onInitialize, get, set, enumerable, allowCustomArguments) {
    function classPropertyDecorator(target, key, descriptor, customArgs, argLen) {
        if (argLen === void 0) { argLen = 0; }
        invariant(allowCustomArguments || quacksLikeADecorator(arguments), "This function is a decorator, but it wasn't invoked like a decorator");
        if (!descriptor) {
            var newDescriptor = {
                enumerable: enumerable,
                configurable: true,
                get: function () {
                    if (!this.__mobxInitializedProps || this.__mobxInitializedProps[key] !== true)
                        typescriptInitializeProperty(this, key, undefined, onInitialize, customArgs, descriptor);
                    return get.call(this, key);
                },
                set: function (v) {
                    if (!this.__mobxInitializedProps || this.__mobxInitializedProps[key] !== true) {
                        typescriptInitializeProperty(this, key, v, onInitialize, customArgs, descriptor);
                    }
                    else {
                        set.call(this, key, v);
                    }
                }
            };
            if (arguments.length < 3 || arguments.length === 5 && argLen < 3) {
                Object.defineProperty(target, key, newDescriptor);
            }
            return newDescriptor;
        }
        else {
            if (!hasOwnProperty(target, "__mobxLazyInitializers")) {
                addHiddenProp(target, "__mobxLazyInitializers", (target.__mobxLazyInitializers && target.__mobxLazyInitializers.slice()) || []);
            }
            var value_1 = descriptor.value, initializer_1 = descriptor.initializer;
            target.__mobxLazyInitializers.push(function (instance) {
                onInitialize(instance, key, (initializer_1 ? initializer_1.call(instance) : value_1), customArgs, descriptor);
            });
            return {
                enumerable: enumerable, configurable: true,
                get: function () {
                    if (this.__mobxDidRunLazyInitializers !== true)
                        runLazyInitializers(this);
                    return get.call(this, key);
                },
                set: function (v) {
                    if (this.__mobxDidRunLazyInitializers !== true)
                        runLazyInitializers(this);
                    set.call(this, key, v);
                }
            };
        }
    }
    if (allowCustomArguments) {
        return function () {
            if (quacksLikeADecorator(arguments))
                return classPropertyDecorator.apply(null, arguments);
            var outerArgs = arguments;
            var argLen = arguments.length;
            return function (target, key, descriptor) { return classPropertyDecorator(target, key, descriptor, outerArgs, argLen); };
        };
    }
    return classPropertyDecorator;
}
function typescriptInitializeProperty(instance, key, v, onInitialize, customArgs, baseDescriptor) {
    if (!hasOwnProperty(instance, "__mobxInitializedProps"))
        addHiddenProp(instance, "__mobxInitializedProps", {});
    instance.__mobxInitializedProps[key] = true;
    onInitialize(instance, key, v, customArgs, baseDescriptor);
}
function runLazyInitializers(instance) {
    if (instance.__mobxDidRunLazyInitializers === true)
        return;
    if (instance.__mobxLazyInitializers) {
        addHiddenProp(instance, "__mobxDidRunLazyInitializers", true);
        instance.__mobxDidRunLazyInitializers && instance.__mobxLazyInitializers.forEach(function (initializer) { return initializer(instance); });
    }
}
function quacksLikeADecorator(args) {
    return (args.length === 2 || args.length === 3) && typeof args[1] === "string";
}
function iteratorSymbol() {
    return (typeof Symbol === "function" && Symbol.iterator) || "@@iterator";
}
var IS_ITERATING_MARKER = "__$$iterating";
function arrayAsIterator(array) {
    invariant(array[IS_ITERATING_MARKER] !== true, "Illegal state: cannot recycle array as iterator");
    addHiddenFinalProp(array, IS_ITERATING_MARKER, true);
    var idx = -1;
    addHiddenFinalProp(array, "next", function next() {
        idx++;
        return {
            done: idx >= this.length,
            value: idx < this.length ? this[idx] : undefined
        };
    });
    return array;
}
function declareIterator(prototType, iteratorFactory) {
    addHiddenFinalProp(prototType, iteratorSymbol(), iteratorFactory);
}
var messages = {
    "m001": "It is not allowed to assign new values to @action fields",
    "m002": "`runInAction` expects a function",
    "m003": "`runInAction` expects a function without arguments",
    "m004": "autorun expects a function",
    "m005": "Warning: attempted to pass an action to autorun. Actions are untracked and will not trigger on state changes. Use `reaction` or wrap only your state modification code in an action.",
    "m006": "Warning: attempted to pass an action to autorunAsync. Actions are untracked and will not trigger on state changes. Use `reaction` or wrap only your state modification code in an action.",
    "m007": "reaction only accepts 2 or 3 arguments. If migrating from MobX 2, please provide an options object",
    "m008": "wrapping reaction expression in `asReference` is no longer supported, use options object instead",
    "m009": "@computed can only be used on getter functions, like: '@computed get myProps() { return ...; }'. It looks like it was used on a property.",
    "m010": "@computed can only be used on getter functions, like: '@computed get myProps() { return ...; }'",
    "m011": "First argument to `computed` should be an expression. If using computed as decorator, don't pass it arguments",
    "m012": "computed takes one or two arguments if used as function",
    "m013": "[mobx.expr] 'expr' should only be used inside other reactive functions.",
    "m014": "extendObservable expected 2 or more arguments",
    "m015": "extendObservable expects an object as first argument",
    "m016": "extendObservable should not be used on maps, use map.merge instead",
    "m017": "all arguments of extendObservable should be objects",
    "m018": "extending an object with another observable (object) is not supported. Please construct an explicit propertymap, using `toJS` if need. See issue #540",
    "m019": "[mobx.isObservable] isObservable(object, propertyName) is not supported for arrays and maps. Use map.has or array.length instead.",
    "m020": "modifiers can only be used for individual object properties",
    "m021": "observable expects zero or one arguments",
    "m022": "@observable can not be used on getters, use @computed instead",
    "m023": "Using `transaction` is deprecated, use `runInAction` or `(@)action` instead.",
    "m024": "whyRun() can only be used if a derivation is active, or by passing an computed value / reaction explicitly. If you invoked whyRun from inside a computation; the computation is currently suspended but re-evaluating because somebody requested its value.",
    "m025": "whyRun can only be used on reactions and computed values",
    "m026": "`action` can only be invoked on functions",
    "m028": "It is not allowed to set `useStrict` when a derivation is running",
    "m029": "INTERNAL ERROR only onBecomeUnobserved shouldn't be called twice in a row",
    "m030a": "Since strict-mode is enabled, changing observed observable values outside actions is not allowed. Please wrap the code in an `action` if this change is intended. Tried to modify: ",
    "m030b": "Side effects like changing state are not allowed at this point. Are you trying to modify state from, for example, the render function of a React component? Tried to modify: ",
    "m031": "Computed values are not allowed to not cause side effects by changing observables that are already being observed. Tried to modify: ",
    "m032": "* This computation is suspended (not in use by any reaction) and won't run automatically.\n	Didn't expect this computation to be suspended at this point?\n	  1. Make sure this computation is used by a reaction (reaction, autorun, observer).\n	  2. Check whether you are using this computation synchronously (in the same stack as they reaction that needs it).",
    "m033": "`observe` doesn't support the fire immediately property for observable maps.",
    "m034": "`mobx.map` is deprecated, use `new ObservableMap` or `mobx.observable.map` instead",
    "m035": "Cannot make the designated object observable; it is not extensible",
    "m036": "It is not possible to get index atoms from arrays",
    "m037": "Hi there! I'm sorry you have just run into an exception.\nIf your debugger ends up here, know that some reaction (like the render() of an observer component, autorun or reaction)\nthrew an exception and that mobx caught it, to avoid that it brings the rest of your application down.\nThe original cause of the exception (the code that caused this reaction to run (again)), is still in the stack.\n\nHowever, more interesting is the actual stack trace of the error itself.\nHopefully the error is an instanceof Error, because in that case you can inspect the original stack of the error from where it was thrown.\nSee `error.stack` property, or press the very subtle \"(...)\" link you see near the console.error message that probably brought you here.\nThat stack is more interesting than the stack of this console.error itself.\n\nIf the exception you see is an exception you created yourself, make sure to use `throw new Error(\"Oops\")` instead of `throw \"Oops\"`,\nbecause the javascript environment will only preserve the original stack trace in the first form.\n\nYou can also make sure the debugger pauses the next time this very same exception is thrown by enabling \"Pause on caught exception\".\n(Note that it might pause on many other, unrelated exception as well).\n\nIf that all doesn't help you out, feel free to open an issue https://github.com/mobxjs/mobx/issues!\n",
    "m038": "Missing items in this list?\n    1. Check whether all used values are properly marked as observable (use isObservable to verify)\n    2. Make sure you didn't dereference values too early. MobX observes props, not primitives. E.g: use 'person.name' instead of 'name' in your computation.\n"
};
function getMessage(id) {
    return messages[id];
}
var EMPTY_ARRAY = [];
Object.freeze(EMPTY_ARRAY);
function getGlobal() {
    return global;
}
function getNextId() {
    return ++globalState.mobxGuid;
}
function fail(message, thing) {
    invariant(false, message, thing);
    throw "X";
}
function invariant(check, message, thing) {
    if (!check)
        throw new Error("[mobx] Invariant failed: " + message + (thing ? " in '" + thing + "'" : ""));
}
var deprecatedMessages = [];
function deprecated(msg) {
    if (deprecatedMessages.indexOf(msg) !== -1)
        return false;
    deprecatedMessages.push(msg);
    console.error("[mobx] Deprecated: " + msg);
    return true;
}
function once(func) {
    var invoked = false;
    return function () {
        if (invoked)
            return;
        invoked = true;
        return func.apply(this, arguments);
    };
}
var noop = function () { };
function unique(list) {
    var res = [];
    list.forEach(function (item) {
        if (res.indexOf(item) === -1)
            res.push(item);
    });
    return res;
}
function joinStrings(things, limit, separator) {
    if (limit === void 0) { limit = 100; }
    if (separator === void 0) { separator = " - "; }
    if (!things)
        return "";
    var sliced = things.slice(0, limit);
    return "" + sliced.join(separator) + (things.length > limit ? " (... and " + (things.length - limit) + "more)" : "");
}
function isObject(value) {
    return value !== null && typeof value === "object";
}
function isPlainObject(value) {
    if (value === null || typeof value !== "object")
        return false;
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
function objectAssign() {
    var res = arguments[0];
    for (var i = 1, l = arguments.length; i < l; i++) {
        var source = arguments[i];
        for (var key in source)
            if (hasOwnProperty(source, key)) {
                res[key] = source[key];
            }
    }
    return res;
}
function valueDidChange(compareStructural, oldValue, newValue) {
    if (typeof oldValue === 'number' && isNaN(oldValue)) {
        return typeof newValue !== 'number' || !isNaN(newValue);
    }
    return compareStructural
        ? !deepEqual(oldValue, newValue)
        : oldValue !== newValue;
}
var prototypeHasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwnProperty(object, propName) {
    return prototypeHasOwnProperty.call(object, propName);
}
function makeNonEnumerable(object, propNames) {
    for (var i = 0; i < propNames.length; i++) {
        addHiddenProp(object, propNames[i], object[propNames[i]]);
    }
}
function addHiddenProp(object, propName, value) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: true,
        configurable: true,
        value: value
    });
}
function addHiddenFinalProp(object, propName, value) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: false,
        configurable: true,
        value: value
    });
}
function isPropertyConfigurable(object, prop) {
    var descriptor = Object.getOwnPropertyDescriptor(object, prop);
    return !descriptor || (descriptor.configurable !== false && descriptor.writable !== false);
}
function assertPropertyConfigurable(object, prop) {
    invariant(isPropertyConfigurable(object, prop), "Cannot make property '" + prop + "' observable, it is not configurable and writable in the target object");
}
function getEnumerableKeys(obj) {
    var res = [];
    for (var key in obj)
        res.push(key);
    return res;
}
function deepEqual(a, b) {
    if (a === null && b === null)
        return true;
    if (a === undefined && b === undefined)
        return true;
    if (typeof a !== "object")
        return a === b;
    var aIsArray = isArrayLike(a);
    var aIsMap = isMapLike(a);
    if (aIsArray !== isArrayLike(b)) {
        return false;
    }
    else if (aIsMap !== isMapLike(b)) {
        return false;
    }
    else if (aIsArray) {
        if (a.length !== b.length)
            return false;
        for (var i = a.length - 1; i >= 0; i--)
            if (!deepEqual(a[i], b[i]))
                return false;
        return true;
    }
    else if (aIsMap) {
        if (a.size !== b.size)
            return false;
        var equals_1 = true;
        a.forEach(function (value, key) {
            equals_1 = equals_1 && deepEqual(b.get(key), value);
        });
        return equals_1;
    }
    else if (typeof a === "object" && typeof b === "object") {
        if (a === null || b === null)
            return false;
        if (isMapLike(a) && isMapLike(b)) {
            if (a.size !== b.size)
                return false;
            return deepEqual(observable.shallowMap(a).entries(), observable.shallowMap(b).entries());
        }
        if (getEnumerableKeys(a).length !== getEnumerableKeys(b).length)
            return false;
        for (var prop in a) {
            if (!(prop in b))
                return false;
            if (!deepEqual(a[prop], b[prop]))
                return false;
        }
        return true;
    }
    return false;
}
function createInstanceofPredicate(name, clazz) {
    var propName = "isMobX" + name;
    clazz.prototype[propName] = true;
    return function (x) {
        return isObject(x) && x[propName] === true;
    };
}
function isArrayLike(x) {
    return Array.isArray(x) || isObservableArray(x);
}
exports.isArrayLike = isArrayLike;
function isMapLike(x) {
    return isES6Map(x) || isObservableMap(x);
}
function isES6Map(thing) {
    if (getGlobal().Map !== undefined && thing instanceof getGlobal().Map)
        return true;
    return false;
}
function primitiveSymbol() {
    return (typeof Symbol === "function" && Symbol.toPrimitive) || "@@toPrimitive";
}
function toPrimitive(value) {
    return value === null ? null : typeof value === "object" ? ("" + value) : value;
}

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(243)))

/***/ }),

/***/ 250:
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

/***/ 251:
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

/***/ 451:
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
	fixUrls = __webpack_require__(889);

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

/***/ 452:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _desc, _value, _class, _descriptor, _descriptor2, _descriptor3, _class3, _class4, _temp;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _mobx = __webpack_require__(249);

var _mobx2 = _interopRequireDefault(_mobx);

var _mobxReact = __webpack_require__(465);

var _semanticUiReact = __webpack_require__(245);

var _Spacer = __webpack_require__(454);

var _Spacer2 = _interopRequireDefault(_Spacer);

__webpack_require__(891);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

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

		_initDefineProp(this, "selected", _descriptor2, this);

		_initDefineProp(this, "output", _descriptor3, this);

		//DEBUG
		window.examples = this;
	}

	// Return just the titles of the examples.


	_createClass(ExampleStore, [{
		key: "reset",


		//

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

			// Load selected example name
			this.select(localStorage.spellEditorExample);
		}

		// Save current examples & selection.

	}, {
		key: "save",
		value: function save() {
			localStorage.spellEditorExamples = JSON.stringify(this.examples);
		}

		// Select a different example.

	}, {
		key: "select",
		value: function select(example) {
			if (!example || this.examples[example] == null) example = Object.keys(this.examples)[0] || "";
			this.selected = localStorage.spellEditorExample = example;
			this.output = "";
		}

		// Compile the current example, placing it in our `output`.

	}, {
		key: "compile",
		value: function compile() {
			var _this = this;

			this.output = "...compiling...";
			setTimeout(function () {
				_this.output = parser.compile(_this.code);
			}, 100);
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

			var examples = Object.assign({}, this.examples);
			delete examples[name];
			this.examples = examples;
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
	}, {
		key: "titles",
		get: function get() {
			return Object.keys(this.examples);
		}

		// Return the code for the current example

	}, {
		key: "code",
		get: function get() {
			return this.examples[this.selected];
		}
	}]);

	return ExampleStore;
}(), (_descriptor = _applyDecoratedDescriptor(_class.prototype, "examples", [_mobx.observable], {
	enumerable: true,
	initializer: function initializer() {
		return {};
	}
}), _descriptor2 = _applyDecoratedDescriptor(_class.prototype, "selected", [_mobx.observable], {
	enumerable: true,
	initializer: function initializer() {
		return "";
	}
}), _descriptor3 = _applyDecoratedDescriptor(_class.prototype, "output", [_mobx.observable], {
	enumerable: true,
	initializer: function initializer() {
		return "";
	}
}), _applyDecoratedDescriptor(_class.prototype, "titles", [_mobx.computed], Object.getOwnPropertyDescriptor(_class.prototype, "titles"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "code", [_mobx.computed], Object.getOwnPropertyDescriptor(_class.prototype, "code"), _class.prototype)), _class);

var SpellEditor = (0, _mobxReact.observer)(_class3 = (_temp = _class4 = function (_React$Component) {
	_inherits(SpellEditor, _React$Component);

	function SpellEditor(props) {
		_classCallCheck(this, SpellEditor);

		//DEBUG
		var _this2 = _possibleConstructorReturn(this, (SpellEditor.__proto__ || Object.getPrototypeOf(SpellEditor)).call(this, props));

		_this2.onInputKeyDown = function (event) {
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

			var examples = _this2.props.examples;

			examples.update(examples.selected, element.value, "SKIP_SAVE");
		};

		_this2.onInputChange = function (event) {
			var examples = _this2.props.examples;

			examples.update(examples.selected, event.target.value, "SKIP_SAVE");
		};

		window.spellEditor = _this2;
		_this2.props.examples.load();
		return _this2;
	}

	// Do NOT exit on tab -- insert or remove tab(s) value instead.


	// On change of the input field,
	//	update the current example but do NOT auto-save.


	_createClass(SpellEditor, [{
		key: "render",
		value: function render() {
			var examples = this.props.examples;
			var titles = examples.titles,
			    selected = examples.selected,
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

			return _react2.default.createElement(
				_semanticUiReact.Grid,
				{ columns: 3, stretched: true, padded: true, className: "fullSize" },
				_react2.default.createElement(
					_semanticUiReact.Grid.Row,
					{ style: { height: "2rem", paddingTop: "0rem" } },
					_react2.default.createElement(
						_semanticUiReact.Menu,
						{ inverted: true, attached: true, fluid: true },
						_react2.default.createElement(_Spacer2.default, { medium: true }),
						_react2.default.createElement(
							_semanticUiReact.Menu.Item,
							null,
							"Example:"
						),
						_react2.default.createElement(_semanticUiReact.Dropdown, { item: true, selection: true, options: options, value: selected }),
						_react2.default.createElement(
							_semanticUiReact.Menu.Item,
							{ onClick: function onClick() {
									return examples.rename();
								} },
							"Rename"
						),
						_react2.default.createElement(
							_semanticUiReact.Menu.Item,
							{ onClick: function onClick() {
									return examples.delete();
								} },
							"Delete"
						),
						_react2.default.createElement(_Spacer2.default, { fluid: true }),
						_react2.default.createElement(
							_semanticUiReact.Menu.Item,
							{ onClick: function onClick() {
									return examples.create();
								} },
							"New"
						),
						_react2.default.createElement(
							_semanticUiReact.Menu.Item,
							{ onClick: function onClick() {
									return examples.duplicate();
								} },
							"Duplicate"
						),
						_react2.default.createElement(
							_semanticUiReact.Menu.Item,
							{ onClick: function onClick() {
									return examples.save();
								} },
							"Save"
						),
						_react2.default.createElement(_Spacer2.default, { fluid: true }),
						_react2.default.createElement(
							_semanticUiReact.Menu.Item,
							{ onClick: function onClick() {
									return examples.load();
								} },
							"Reload"
						),
						_react2.default.createElement(
							_semanticUiReact.Menu.Item,
							{ onClick: function onClick() {
									return examples.reset();
								} },
							"Reset"
						),
						_react2.default.createElement(_Spacer2.default, { medium: true })
					)
				),
				_react2.default.createElement(
					_semanticUiReact.Grid.Row,
					{ style: { height: "calc(100% - 3rem)" } },
					_react2.default.createElement(
						_semanticUiReact.Grid.Column,
						{ width: 7 },
						_react2.default.createElement(_semanticUiReact.TextArea, { className: "ui segment", value: code,
							onKeyDown: this.onInputKeyDown,
							onChange: this.onInputChange
						})
					),
					_react2.default.createElement(
						_semanticUiReact.Grid.Column,
						{ width: 1, verticalAlign: "middle" },
						_react2.default.createElement(_semanticUiReact.Button, { icon: "chevron right", onClick: function onClick() {
								return examples.compile();
							} })
					),
					_react2.default.createElement(
						_semanticUiReact.Grid.Column,
						{ width: 8 },
						_react2.default.createElement(_semanticUiReact.TextArea, { className: "ui segment", value: output })
					)
				)
			);
		}
	}]);

	return SpellEditor;
}(_react2.default.Component), _class4.defaultProps = {
	examples: new ExampleStore()
}, _temp)) || _class3;

exports.default = SpellEditor;

/***/ }),

/***/ 454:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Spacer;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _propTypes = __webpack_require__(469);

var _propTypes2 = _interopRequireDefault(_propTypes);

var _util = __webpack_require__(455);

__webpack_require__(890);

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

/***/ 455:
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

/***/ 463:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(248)(undefined);
// imports


// module
exports.push([module.i, ".oak.spacer {\n  position: relative;\n  display: block;\n}\n.oak.spacer.inline {\n  display: inline-block;\n  vertical-align: baseline;\n}\n.oak.spacer.fluid {\n  width: 100%;\n  flex: 1 1 100%;\n}\n.oak.spacer.tiny {\n  width: 2px;\n  height: 2px;\n}\n.oak.spacer.small {\n  width: 4px;\n  height: 4px;\n}\n.oak.spacer.medium {\n  width: 10px;\n  height: 10px;\n}\n.oak.spacer.large {\n  width: 20px;\n  height: 20px;\n}\n.oak.spacer.huge {\n  width: 30px;\n  height: 30px;\n}\n.oak.spacer.massive {\n  width: 50px;\n  height: 50px;\n}\n", ""]);

// exports


/***/ }),

/***/ 464:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(248)(undefined);
// imports


// module
exports.push([module.i, ".fullWidth {\n  width: 100%;\n}\n.fullHeight {\n  height: 100%;\n}\n.fullSize {\n  width: 100%;\n  height: 100%;\n}\n", ""]);

// exports


/***/ }),

/***/ 465:
/***/ (function(module, exports, __webpack_require__) {

(function webpackUniversalModuleDefinition(root, factory) {
	if(true)
		module.exports = factory(__webpack_require__(1), __webpack_require__(249), __webpack_require__(81));
	else if(typeof define === 'function' && define.amd)
		define(["react", "mobx", "react-dom"], factory);
	else if(typeof exports === 'object')
		exports["mobxReact"] = factory(require("react"), require("mobx"), require("react-dom"));
	else
		root["mobxReact"] = factory(root["React"], root["mobx"], root["ReactDOM"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__, __WEBPACK_EXTERNAL_MODULE_2__, __WEBPACK_EXTERNAL_MODULE_5__) {
return /******/ (function(modules) { // webpackBootstrap
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
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 8);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.objectOrObservableObject = exports.arrayOrObservableArrayOf = exports.arrayOrObservableArray = exports.observableObject = exports.observableMap = exports.observableArrayOf = exports.observableArray = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _mobx = __webpack_require__(2);

// Copied from React.PropTypes
function createChainableTypeChecker(validate) {
  function checkType(isRequired, props, propName, componentName, location, propFullName) {
    for (var _len = arguments.length, rest = Array(_len > 6 ? _len - 6 : 0), _key = 6; _key < _len; _key++) {
      rest[_key - 6] = arguments[_key];
    }

    return (0, _mobx.untracked)(function () {
      componentName = componentName || '<<anonymous>>';
      propFullName = propFullName || propName;
      if (props[propName] == null) {
        if (isRequired) {
          var actual = props[propName] === null ? 'null' : 'undefined';
          return new Error('The ' + location + ' `' + propFullName + '` is marked as required ' + 'in `' + componentName + '`, but its value is `' + actual + '`.');
        }
        return null;
      } else {
        return validate.apply(undefined, [props, propName, componentName, location, propFullName].concat(rest));
      }
    });
  }

  var chainedCheckType = checkType.bind(null, false);
  chainedCheckType.isRequired = checkType.bind(null, true);
  return chainedCheckType;
}

// Copied from React.PropTypes
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

// Copied from React.PropTypes
function getPropType(propValue) {
  var propType = typeof propValue === 'undefined' ? 'undefined' : _typeof(propValue);
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
// Copied from React.PropTypes
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

function createObservableTypeCheckerCreator(allowNativeType, mobxType) {
  return createChainableTypeChecker(function (props, propName, componentName, location, propFullName) {
    return (0, _mobx.untracked)(function () {
      if (allowNativeType) {
        if (getPropType(props[propName]) === mobxType.toLowerCase()) return null;
      }
      var mobxChecker = void 0;
      switch (mobxType) {
        case 'Array':
          mobxChecker = _mobx.isObservableArray;break;
        case 'Object':
          mobxChecker = _mobx.isObservableObject;break;
        case 'Map':
          mobxChecker = _mobx.isObservableMap;break;
        default:
          throw new Error('Unexpected mobxType: ' + mobxType);
      }
      var propValue = props[propName];
      if (!mobxChecker(propValue)) {
        var preciseType = getPreciseType(propValue);
        var nativeTypeExpectationMessage = allowNativeType ? ' or javascript `' + mobxType.toLowerCase() + '`' : '';
        return new Error('Invalid prop `' + propFullName + '` of type `' + preciseType + '` supplied to' + ' `' + componentName + '`, expected `mobx.Observable' + mobxType + '`' + nativeTypeExpectationMessage + '.');
      }
      return null;
    });
  });
}

function createObservableArrayOfTypeChecker(allowNativeType, typeChecker) {
  return createChainableTypeChecker(function (props, propName, componentName, location, propFullName) {
    for (var _len2 = arguments.length, rest = Array(_len2 > 5 ? _len2 - 5 : 0), _key2 = 5; _key2 < _len2; _key2++) {
      rest[_key2 - 5] = arguments[_key2];
    }

    return (0, _mobx.untracked)(function () {
      if (typeof typeChecker !== 'function') {
        return new Error('Property `' + propFullName + '` of component `' + componentName + '` has ' + 'invalid PropType notation.');
      }
      var error = createObservableTypeCheckerCreator(allowNativeType, 'Array')(props, propName, componentName);
      if (error instanceof Error) return error;
      var propValue = props[propName];
      for (var i = 0; i < propValue.length; i++) {
        error = typeChecker.apply(undefined, [propValue, i, componentName, location, propFullName + '[' + i + ']'].concat(rest));
        if (error instanceof Error) return error;
      }
      return null;
    });
  });
}

var observableArray = exports.observableArray = createObservableTypeCheckerCreator(false, 'Array');
var observableArrayOf = exports.observableArrayOf = createObservableArrayOfTypeChecker.bind(null, false);
var observableMap = exports.observableMap = createObservableTypeCheckerCreator(false, 'Map');
var observableObject = exports.observableObject = createObservableTypeCheckerCreator(false, 'Object');
var arrayOrObservableArray = exports.arrayOrObservableArray = createObservableTypeCheckerCreator(true, 'Array');
var arrayOrObservableArrayOf = exports.arrayOrObservableArrayOf = createObservableArrayOfTypeChecker.bind(null, true);
var objectOrObservableObject = exports.objectOrObservableObject = createObservableTypeCheckerCreator(true, 'Object');

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_2__;

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = inject;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _hoistNonReactStatics = __webpack_require__(10);

var _hoistNonReactStatics2 = _interopRequireDefault(_hoistNonReactStatics);

var _propTypes = __webpack_require__(0);

var PropTypes = _interopRequireWildcard(_propTypes);

var _observer = __webpack_require__(4);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var injectorContextTypes = {
  mobxStores: PropTypes.objectOrObservableObject
};
Object.seal(injectorContextTypes);

var proxiedInjectorProps = {
  contextTypes: {
    get: function get() {
      return injectorContextTypes;
    },
    set: function set(_) {
      console.warn("Mobx Injector: you are trying to attach `contextTypes` on an component decorated with `inject` (or `observer`) HOC. Please specify the contextTypes on the wrapped component instead. It is accessible through the `wrappedComponent`");
    },
    configurable: true,
    enumerable: false
  },
  isMobxInjector: {
    value: true,
    writable: true,
    configurable: true,
    enumerable: true
  }
};

/**
 * Store Injection
 */
function createStoreInjector(grabStoresFn, component, injectNames) {
  var _class, _temp2;

  var displayName = "inject-" + (component.displayName || component.name || component.constructor && component.constructor.name || "Unknown");
  if (injectNames) displayName += "-with-" + injectNames;

  var Injector = (_temp2 = _class = function (_Component) {
    _inherits(Injector, _Component);

    function Injector() {
      var _ref;

      var _temp, _this, _ret;

      _classCallCheck(this, Injector);

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = Injector.__proto__ || Object.getPrototypeOf(Injector)).call.apply(_ref, [this].concat(args))), _this), _this.storeRef = function (instance) {
        _this.wrappedInstance = instance;
      }, _temp), _possibleConstructorReturn(_this, _ret);
    }

    _createClass(Injector, [{
      key: 'render',
      value: function render() {
        // Optimization: it might be more efficient to apply the mapper function *outside* the render method
        // (if the mapper is a function), that could avoid expensive(?) re-rendering of the injector component
        // See this test: 'using a custom injector is not too reactive' in inject.js
        var newProps = {};
        for (var key in this.props) {
          if (this.props.hasOwnProperty(key)) {
            newProps[key] = this.props[key];
          }
        }var additionalProps = grabStoresFn(this.context.mobxStores || {}, newProps, this.context) || {};
        for (var _key2 in additionalProps) {
          newProps[_key2] = additionalProps[_key2];
        }
        newProps.ref = this.storeRef;

        return _react2.default.createElement(component, newProps);
      }
    }]);

    return Injector;
  }(_react.Component), _class.displayName = displayName, _temp2);

  // Static fields from component should be visible on the generated Injector

  (0, _hoistNonReactStatics2.default)(Injector, component);

  Injector.wrappedComponent = component;
  Object.defineProperties(Injector, proxiedInjectorProps);

  return Injector;
}

function grabStoresByName(storeNames) {
  return function (baseStores, nextProps) {
    storeNames.forEach(function (storeName) {
      if (storeName in nextProps) // prefer props over stores
        return;
      if (!(storeName in baseStores)) throw new Error("MobX observer: Store '" + storeName + "' is not available! Make sure it is provided by some Provider");
      nextProps[storeName] = baseStores[storeName];
    });
    return nextProps;
  };
}

/**
 * higher order component that injects stores to a child.
 * takes either a varargs list of strings, which are stores read from the context,
 * or a function that manually maps the available stores from the context to props:
 * storesToProps(mobxStores, props, context) => newProps
 */
function inject() /* fn(stores, nextProps) or ...storeNames */{
  var grabStoresFn = void 0;
  if (typeof arguments[0] === "function") {
    grabStoresFn = arguments[0];
    return function (componentClass) {
      var injected = createStoreInjector(grabStoresFn, componentClass);
      injected.isMobxInjector = false; // supress warning
      // mark the Injector as observer, to make it react to expressions in `grabStoresFn`,
      // see #111
      injected = (0, _observer.observer)(injected);
      injected.isMobxInjector = true; // restore warning
      return injected;
    };
  } else {
    var storeNames = [];
    for (var i = 0; i < arguments.length; i++) {
      storeNames[i] = arguments[i];
    }grabStoresFn = grabStoresByName(storeNames);
    return function (componentClass) {
      return createStoreInjector(grabStoresFn, componentClass, storeNames.join("-"));
    };
  }
}

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Observer = exports.renderReporter = exports.componentByNodeRegistery = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.trackComponents = trackComponents;
exports.useStaticRendering = useStaticRendering;
exports.observer = observer;

var _mobx = __webpack_require__(2);

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactDom = __webpack_require__(5);

var _reactDom2 = _interopRequireDefault(_reactDom);

var _EventEmitter = __webpack_require__(9);

var _EventEmitter2 = _interopRequireDefault(_EventEmitter);

var _propTypes = __webpack_require__(0);

var PropTypes = _interopRequireWildcard(_propTypes);

var _inject = __webpack_require__(3);

var _inject2 = _interopRequireDefault(_inject);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * dev tool support
 */
var isDevtoolsEnabled = false;

var isUsingStaticRendering = false;

var warnedAboutObserverInjectDeprecation = false;

// WeakMap<Node, Object>;
var componentByNodeRegistery = exports.componentByNodeRegistery = typeof WeakMap !== "undefined" ? new WeakMap() : undefined;
var renderReporter = exports.renderReporter = new _EventEmitter2.default();

function findDOMNode(component) {
  if (_reactDom2.default) {
    try {
      return _reactDom2.default.findDOMNode(component);
    } catch (e) {
      // findDOMNode will throw in react-test-renderer, see:
      // See https://github.com/mobxjs/mobx-react/issues/216
      // Is there a better heuristic?
      return null;
    }
  }
  return null;
}

function reportRendering(component) {
  var node = findDOMNode(component);
  if (node && componentByNodeRegistery) componentByNodeRegistery.set(node, component);

  renderReporter.emit({
    event: 'render',
    renderTime: component.__$mobRenderEnd - component.__$mobRenderStart,
    totalTime: Date.now() - component.__$mobRenderStart,
    component: component,
    node: node
  });
}

function trackComponents() {
  if (typeof WeakMap === "undefined") throw new Error("[mobx-react] tracking components is not supported in this browser.");
  if (!isDevtoolsEnabled) isDevtoolsEnabled = true;
}

function useStaticRendering(useStaticRendering) {
  isUsingStaticRendering = useStaticRendering;
}

/**
 * Utilities
 */

function patch(target, funcName) {
  var runMixinFirst = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var base = target[funcName];
  var mixinFunc = reactiveMixin[funcName];
  var f = !base ? mixinFunc : runMixinFirst === true ? function () {
    mixinFunc.apply(this, arguments);
    base.apply(this, arguments);
  } : function () {
    base.apply(this, arguments);
    mixinFunc.apply(this, arguments);
  };

  // MWE: ideally we freeze here to protect against accidental overwrites in component instances, see #195
  // ...but that breaks react-hot-loader, see #231...
  target[funcName] = f;
}

function isObjectShallowModified(prev, next) {
  if (null == prev || null == next || (typeof prev === 'undefined' ? 'undefined' : _typeof(prev)) !== "object" || (typeof next === 'undefined' ? 'undefined' : _typeof(next)) !== "object") {
    return prev !== next;
  }
  var keys = Object.keys(prev);
  if (keys.length !== Object.keys(next).length) {
    return true;
  }
  var key = void 0;
  for (var i = keys.length - 1; i >= 0, key = keys[i]; i--) {
    if (next[key] !== prev[key]) {
      return true;
    }
  }
  return false;
}

/**
 * ReactiveMixin
 */
var reactiveMixin = {
  componentWillMount: function componentWillMount() {
    var _this = this;

    if (isUsingStaticRendering === true) return;
    // Generate friendly name for debugging
    var initialName = this.displayName || this.name || this.constructor && (this.constructor.displayName || this.constructor.name) || "<component>";
    var rootNodeID = this._reactInternalInstance && this._reactInternalInstance._rootNodeID;

    /**
     * If props are shallowly modified, react will render anyway,
     * so atom.reportChanged() should not result in yet another re-render
     */
    var skipRender = false;
    /**
     * forceUpdate will re-assign this.props. We don't want that to cause a loop,
     * so detect these changes
     */
    var isForcingUpdate = false;

    function makePropertyObservableReference(propName) {
      var valueHolder = this[propName];
      var atom = new _mobx.Atom("reactive " + propName);
      Object.defineProperty(this, propName, {
        configurable: true, enumerable: true,
        get: function get() {
          atom.reportObserved();
          return valueHolder;
        },
        set: function set(v) {
          if (!isForcingUpdate && isObjectShallowModified(valueHolder, v)) {
            valueHolder = v;
            skipRender = true;
            atom.reportChanged();
            skipRender = false;
          } else {
            valueHolder = v;
          }
        }
      });
    }

    // make this.props an observable reference, see #124
    makePropertyObservableReference.call(this, "props");
    // make state an observable reference
    makePropertyObservableReference.call(this, "state");

    // wire up reactive render
    var baseRender = this.render.bind(this);
    var reaction = null;
    var isRenderingPending = false;

    var initialRender = function initialRender() {
      reaction = new _mobx.Reaction(initialName + '#' + rootNodeID + '.render()', function () {
        if (!isRenderingPending) {
          // N.B. Getting here *before mounting* means that a component constructor has side effects (see the relevant test in misc.js)
          // This unidiomatic React usage but React will correctly warn about this so we continue as usual
          // See #85 / Pull #44
          isRenderingPending = true;
          if (typeof _this.componentWillReact === "function") _this.componentWillReact(); // TODO: wrap in action?
          if (_this.__$mobxIsUnmounted !== true) {
            // If we are unmounted at this point, componentWillReact() had a side effect causing the component to unmounted
            // TODO: remove this check? Then react will properly warn about the fact that this should not happen? See #73
            // However, people also claim this migth happen during unit tests..
            var hasError = true;
            try {
              isForcingUpdate = true;
              if (!skipRender) _react2.default.Component.prototype.forceUpdate.call(_this);
              hasError = false;
            } finally {
              isForcingUpdate = false;
              if (hasError) reaction.dispose();
            }
          }
        }
      });
      reactiveRender.$mobx = reaction;
      _this.render = reactiveRender;
      return reactiveRender();
    };

    var reactiveRender = function reactiveRender() {
      isRenderingPending = false;
      var exception = undefined;
      var rendering = undefined;
      reaction.track(function () {
        if (isDevtoolsEnabled) {
          _this.__$mobRenderStart = Date.now();
        }
        try {
          rendering = _mobx.extras.allowStateChanges(false, baseRender);
        } catch (e) {
          exception = e;
        }
        if (isDevtoolsEnabled) {
          _this.__$mobRenderEnd = Date.now();
        }
      });
      if (exception) throw exception;
      return rendering;
    };

    this.render = initialRender;
  },

  componentWillUnmount: function componentWillUnmount() {
    if (isUsingStaticRendering === true) return;
    this.render.$mobx && this.render.$mobx.dispose();
    this.__$mobxIsUnmounted = true;
    if (isDevtoolsEnabled) {
      var node = findDOMNode(this);
      if (node && componentByNodeRegistery) {
        componentByNodeRegistery.delete(node);
      }
      renderReporter.emit({
        event: 'destroy',
        component: this,
        node: node
      });
    }
  },

  componentDidMount: function componentDidMount() {
    if (isDevtoolsEnabled) {
      reportRendering(this);
    }
  },

  componentDidUpdate: function componentDidUpdate() {
    if (isDevtoolsEnabled) {
      reportRendering(this);
    }
  },

  shouldComponentUpdate: function shouldComponentUpdate(nextProps, nextState) {
    if (isUsingStaticRendering) {
      console.warn("[mobx-react] It seems that a re-rendering of a React component is triggered while in static (server-side) mode. Please make sure components are rendered only once server-side.");
    }
    // update on any state changes (as is the default)
    if (this.state !== nextState) {
      return true;
    }
    // update if props are shallowly not equal, inspired by PureRenderMixin
    // we could return just 'false' here, and avoid the `skipRender` checks etc
    // however, it is nicer if lifecycle events are triggered like usually,
    // so we return true here if props are shallowly modified.
    return isObjectShallowModified(this.props, nextProps);
  }
};

/**
 * Observer function / decorator
 */
function observer(arg1, arg2) {
  if (typeof arg1 === "string") {
    throw new Error("Store names should be provided as array");
  }
  if (Array.isArray(arg1)) {
    // component needs stores
    if (!warnedAboutObserverInjectDeprecation) {
      warnedAboutObserverInjectDeprecation = true;
      console.warn('Mobx observer: Using observer to inject stores is deprecated since 4.0. Use `@inject("store1", "store2") @observer ComponentClass` or `inject("store1", "store2")(observer(componentClass))` instead of `@observer(["store1", "store2"]) ComponentClass`');
    }
    if (!arg2) {
      // invoked as decorator
      return function (componentClass) {
        return observer(arg1, componentClass);
      };
    } else {
      return _inject2.default.apply(null, arg1)(observer(arg2));
    }
  }
  var componentClass = arg1;

  if (componentClass.isMobxInjector === true) {
    console.warn('Mobx observer: You are trying to use \'observer\' on a component that already has \'inject\'. Please apply \'observer\' before applying \'inject\'');
  }

  // Stateless function component:
  // If it is function but doesn't seem to be a react class constructor,
  // wrap it to a react class automatically
  if (typeof componentClass === "function" && (!componentClass.prototype || !componentClass.prototype.render) && !componentClass.isReactClass && !_react2.default.Component.isPrototypeOf(componentClass)) {
    var _class, _temp;

    return observer((_temp = _class = function (_Component) {
      _inherits(_class, _Component);

      function _class() {
        _classCallCheck(this, _class);

        return _possibleConstructorReturn(this, (_class.__proto__ || Object.getPrototypeOf(_class)).apply(this, arguments));
      }

      _createClass(_class, [{
        key: 'render',
        value: function render() {
          return componentClass.call(this, this.props, this.context);
        }
      }]);

      return _class;
    }(_react.Component), _class.displayName = componentClass.displayName || componentClass.name, _class.contextTypes = componentClass.contextTypes, _class.propTypes = componentClass.propTypes, _class.defaultProps = componentClass.defaultProps, _temp));
  }

  if (!componentClass) {
    throw new Error("Please pass a valid component to 'observer'");
  }

  var target = componentClass.prototype || componentClass;
  mixinLifecycleEvents(target);
  componentClass.isMobXReactObserver = true;
  return componentClass;
}

function mixinLifecycleEvents(target) {
  patch(target, "componentWillMount", true);
  ["componentDidMount", "componentWillUnmount", "componentDidUpdate"].forEach(function (funcName) {
    patch(target, funcName);
  });
  if (!target.shouldComponentUpdate) {
    target.shouldComponentUpdate = reactiveMixin.shouldComponentUpdate;
  }
}

// TODO: support injection somehow as well?
var Observer = exports.Observer = observer(function (_ref) {
  var children = _ref.children;
  return children();
});

Observer.propTypes = {
  children: function children(propValue, key, componentName, location, propFullName) {
    if (typeof propValue[key] !== 'function') return new Error('Invalid prop `' + propFullName + '` of type `' + _typeof(propValue[key]) + '` supplied to' + ' `' + componentName + '`, expected `function`.');
  }
};

/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_5__;

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _class, _temp;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _propTypes = __webpack_require__(0);

var PropTypes = _interopRequireWildcard(_propTypes);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var specialReactKeys = { children: true, key: true, ref: true };

var Provider = (_temp = _class = function (_Component) {
  _inherits(Provider, _Component);

  function Provider() {
    _classCallCheck(this, Provider);

    return _possibleConstructorReturn(this, (Provider.__proto__ || Object.getPrototypeOf(Provider)).apply(this, arguments));
  }

  _createClass(Provider, [{
    key: 'render',
    value: function render() {
      return _react2.default.Children.only(this.props.children);
    }
  }, {
    key: 'getChildContext',
    value: function getChildContext() {
      var stores = {};
      // inherit stores
      var baseStores = this.context.mobxStores;
      if (baseStores) for (var key in baseStores) {
        stores[key] = baseStores[key];
      }
      // add own stores
      for (var _key in this.props) {
        if (!specialReactKeys[_key] && _key !== "suppressChangedStoreWarning") stores[_key] = this.props[_key];
      }return {
        mobxStores: stores
      };
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      // Maybe this warning is too aggressive?
      if (Object.keys(nextProps).length !== Object.keys(this.props).length) console.warn("MobX Provider: The set of provided stores has changed. Please avoid changing stores as the change might not propagate to all children");
      if (!nextProps.suppressChangedStoreWarning) for (var key in nextProps) {
        if (!specialReactKeys[key] && this.props[key] !== nextProps[key]) console.warn("MobX Provider: Provided store '" + key + "' has changed. Please avoid replacing stores as the change might not propagate to all children");
      }
    }
  }]);

  return Provider;
}(_react.Component), _class.contextTypes = {
  mobxStores: PropTypes.objectOrObservableObject
}, _class.childContextTypes = {
  mobxStores: PropTypes.objectOrObservableObject.isRequired
}, _temp);
exports.default = Provider;

/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = null


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PropTypes = exports.propTypes = exports.inject = exports.Provider = exports.useStaticRendering = exports.trackComponents = exports.componentByNodeRegistery = exports.renderReporter = exports.Observer = exports.observer = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _observer = __webpack_require__(4);

Object.defineProperty(exports, 'observer', {
  enumerable: true,
  get: function get() {
    return _observer.observer;
  }
});
Object.defineProperty(exports, 'Observer', {
  enumerable: true,
  get: function get() {
    return _observer.Observer;
  }
});
Object.defineProperty(exports, 'renderReporter', {
  enumerable: true,
  get: function get() {
    return _observer.renderReporter;
  }
});
Object.defineProperty(exports, 'componentByNodeRegistery', {
  enumerable: true,
  get: function get() {
    return _observer.componentByNodeRegistery;
  }
});
Object.defineProperty(exports, 'trackComponents', {
  enumerable: true,
  get: function get() {
    return _observer.trackComponents;
  }
});
Object.defineProperty(exports, 'useStaticRendering', {
  enumerable: true,
  get: function get() {
    return _observer.useStaticRendering;
  }
});

var _Provider = __webpack_require__(6);

Object.defineProperty(exports, 'Provider', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Provider).default;
  }
});

var _inject = __webpack_require__(3);

Object.defineProperty(exports, 'inject', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_inject).default;
  }
});

var _mobx = __webpack_require__(2);

var mobx = _interopRequireWildcard(_mobx);

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactDom = __webpack_require__(5);

var _reactNative = __webpack_require__(7);

var _propTypes = __webpack_require__(0);

var propTypes = _interopRequireWildcard(_propTypes);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var TARGET_LIB_NAME = void 0;
if (true) TARGET_LIB_NAME = 'mobx-react';
if (false) TARGET_LIB_NAME = 'mobx-react/native';
if (false) TARGET_LIB_NAME = 'mobx-react/custom';

if (!mobx) throw new Error(TARGET_LIB_NAME + ' requires the MobX package');
if (!_react2.default) throw new Error(TARGET_LIB_NAME + ' requires React to be available');

if ("browser" === 'browser' && typeof _reactDom.unstable_batchedUpdates === "function") mobx.extras.setReactionScheduler(_reactDom.unstable_batchedUpdates);
if (false) mobx.extras.setReactionScheduler(_reactNative.unstable_batchedUpdates);

exports.propTypes = propTypes;
exports.PropTypes = propTypes;
exports.default = module.exports;

/* DevTool support */

if ((typeof __MOBX_DEVTOOLS_GLOBAL_HOOK__ === 'undefined' ? 'undefined' : _typeof(__MOBX_DEVTOOLS_GLOBAL_HOOK__)) === 'object') {
  __MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobxReact(module.exports, mobx);
}

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EventEmitter = function () {
  function EventEmitter() {
    _classCallCheck(this, EventEmitter);

    this.listeners = [];
  }

  _createClass(EventEmitter, [{
    key: "on",
    value: function on(cb) {
      var _this = this;

      this.listeners.push(cb);
      return function () {
        var index = _this.listeners.indexOf(cb);
        if (index !== -1) _this.listeners.splice(index, 1);
      };
    }
  }, {
    key: "emit",
    value: function emit(data) {
      this.listeners.forEach(function (fn) {
        return fn(data);
      });
    }
  }]);

  return EventEmitter;
}();

exports.default = EventEmitter;

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * Copyright 2015, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */


var REACT_STATICS = {
    childContextTypes: true,
    contextTypes: true,
    defaultProps: true,
    displayName: true,
    getDefaultProps: true,
    mixins: true,
    propTypes: true,
    type: true
};

var KNOWN_STATICS = {
    name: true,
    length: true,
    prototype: true,
    caller: true,
    arguments: true,
    arity: true
};

var isGetOwnPropertySymbolsAvailable = typeof Object.getOwnPropertySymbols === 'function';

module.exports = function hoistNonReactStatics(targetComponent, sourceComponent, customStatics) {
    if (typeof sourceComponent !== 'string') { // don't hoist over string (html) components
        var keys = Object.getOwnPropertyNames(sourceComponent);

        /* istanbul ignore else */
        if (isGetOwnPropertySymbolsAvailable) {
            keys = keys.concat(Object.getOwnPropertySymbols(sourceComponent));
        }

        for (var i = 0; i < keys.length; ++i) {
            if (!REACT_STATICS[keys[i]] && !KNOWN_STATICS[keys[i]] && (!customStatics || !customStatics[keys[i]])) {
                try {
                    targetComponent[keys[i]] = sourceComponent[keys[i]];
                } catch (error) {

                }
            }
        }
    }

    return targetComponent;
};


/***/ })
/******/ ]);
});

/***/ }),

/***/ 466:
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
  var warning = __webpack_require__(251);
  var ReactPropTypesSecret = __webpack_require__(250);
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

/***/ 467:
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

/***/ 468:
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
var warning = __webpack_require__(251);

var ReactPropTypesSecret = __webpack_require__(250);
var checkPropTypes = __webpack_require__(466);

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

/***/ 469:
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
  module.exports = __webpack_require__(468)(isValidElement, throwOnDirectAccess);
} else {
  // By explicitly using `prop-types` you are opting into new production behavior.
  // http://fb.me/prop-types-in-prod
  module.exports = __webpack_require__(467)();
}

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0)))

/***/ }),

/***/ 889:
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

/***/ 890:
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
var update = __webpack_require__(451)(content, options);
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

/***/ 891:
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
var update = __webpack_require__(451)(content, options);
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

/***/ 892:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactDom = __webpack_require__(81);

var _reactDom2 = _interopRequireDefault(_reactDom);

var _index = __webpack_require__(453);

var _index2 = _interopRequireDefault(_index);

var _SpellEditor = __webpack_require__(452);

var _SpellEditor2 = _interopRequireDefault(_SpellEditor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Kick off our top-level element


// Parser
// Common imports
_reactDom2.default.render(_react2.default.createElement(_SpellEditor2.default, null), document.getElementById('react-root'));

// App-specific imports

/***/ })

},[892]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvfi9mYmpzL2xpYi9lbXB0eUZ1bmN0aW9uLmpzIiwid2VicGFjazovLy8uL34vcHJvcC10eXBlcy9+L2ZianMvbGliL2ludmFyaWFudC5qcyIsIndlYnBhY2s6Ly8vLi9+L2Nzcy1sb2FkZXIvbGliL2Nzcy1iYXNlLmpzIiwid2VicGFjazovLy8uL34vbW9ieC9saWIvbW9ieC5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvbGliL1JlYWN0UHJvcFR5cGVzU2VjcmV0LmpzIiwid2VicGFjazovLy8uL34vcHJvcC10eXBlcy9+L2ZianMvbGliL3dhcm5pbmcuanMiLCJ3ZWJwYWNrOi8vLy4vfi9zdHlsZS1sb2FkZXIvYWRkU3R5bGVzLmpzIiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BlbGxFZGl0b3IuanN4Iiwid2VicGFjazovLy8uL3NyYy9hcHAvU3BhY2VyLmpzeCIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL3V0aWwuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9TcGFjZXIubGVzcyIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL3N0eWxlcy5sZXNzIiwid2VicGFjazovLy8uL34vbW9ieC1yZWFjdC9pbmRleC5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvY2hlY2tQcm9wVHlwZXMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL2ZhY3RvcnlXaXRoVGhyb3dpbmdTaGltcy5qcyIsIndlYnBhY2s6Ly8vLi9+L3Byb3AtdHlwZXMvZmFjdG9yeVdpdGhUeXBlQ2hlY2tlcnMuanMiLCJ3ZWJwYWNrOi8vLy4vfi9wcm9wLXR5cGVzL2luZGV4LmpzIiwid2VicGFjazovLy8uL34vc3R5bGUtbG9hZGVyL2ZpeFVybHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2FwcC9TcGFjZXIubGVzcz8yMmFlIiwid2VicGFjazovLy8uL3NyYy9hcHAvc3R5bGVzLmxlc3M/YjAxMiIsIndlYnBhY2s6Ly8vLi9zcmMvYXBwL2luZGV4LmpzeCJdLCJuYW1lcyI6WyJFeGFtcGxlU3RvcmUiLCJ3aW5kb3ciLCJleGFtcGxlcyIsImxvY2FsU3RvcmFnZSIsInNwZWxsRWRpdG9yRXhhbXBsZXMiLCJzcGVsbEVkaXRvckV4YW1wbGUiLCJsb2NhdGlvbiIsInJlbG9hZCIsIkpTT04iLCJwYXJzZSIsInNlbGVjdCIsInN0cmluZ2lmeSIsImV4YW1wbGUiLCJPYmplY3QiLCJrZXlzIiwic2VsZWN0ZWQiLCJvdXRwdXQiLCJzZXRUaW1lb3V0IiwicGFyc2VyIiwiY29tcGlsZSIsImNvZGUiLCJuYW1lIiwic2tpcFNhdmUiLCJhc3NpZ24iLCJzYXZlIiwicHJvbXB0IiwidXBkYXRlIiwib2xkTmFtZSIsIm5ld05hbWUiLCJjb25zb2xlIiwid2FybiIsImRlbGV0ZSIsIlNwZWxsRWRpdG9yIiwicHJvcHMiLCJvbklucHV0S2V5RG93biIsImV2ZW50Iiwia2V5Q29kZSIsInByZXZlbnREZWZhdWx0IiwiZWxlbWVudCIsInRhcmdldCIsInRleHQiLCJ2YWx1ZSIsInN0YXJ0Iiwic2VsZWN0aW9uU3RhcnQiLCJlbmQiLCJzZWxlY3Rpb25FbmQiLCJuZXdUZXh0Iiwic2hpZnRLZXkiLCJsYXN0SW5kZXhPZiIsImluZGV4T2YiLCJsaW5lcyIsInNsaWNlIiwic3BsaXQiLCJtYXAiLCJsaW5lIiwic3Vic3RyIiwiam9pbiIsImxlbmd0aCIsIm9uSW5wdXRDaGFuZ2UiLCJzcGVsbEVkaXRvciIsImxvYWQiLCJ0aXRsZXMiLCJvcHRpb25zIiwidGl0bGUiLCJjb250ZW50Iiwib25DbGljayIsImhlaWdodCIsInBhZGRpbmdUb3AiLCJyZW5hbWUiLCJjcmVhdGUiLCJkdXBsaWNhdGUiLCJyZXNldCIsIkNvbXBvbmVudCIsImRlZmF1bHRQcm9wcyIsIlNwYWNlciIsImNsYXNzTmFtZSIsImFwcGVhcmFuY2UiLCJzaXplIiwid2lkdGgiLCJpbmxpbmUiLCJmbHVpZCIsInRpbnkiLCJzbWFsbCIsIm1lZGl1bSIsImxhcmdlIiwiaHVnZSIsIm1hc3NpdmUiLCJzcGFjZXJQcm9wcyIsInN0eWxlIiwicHJvcFR5cGVzIiwic3RyaW5nIiwibnVtYmVyIiwiYm9vbCIsImNsYXNzTmFtZXMiLCJhcmdzIiwiYXJnIiwiQXJyYXkiLCJpc0FycmF5Iiwia2V5IiwiZmlsdGVyIiwiQm9vbGVhbiIsInJlbmRlciIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw2Q0FBNkM7QUFDN0M7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsK0I7Ozs7Ozs7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLHFEQUFxRDtBQUNyRCxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTs7QUFFQSwwQkFBMEI7QUFDMUI7QUFDQTtBQUNBOztBQUVBLDJCOzs7Ozs7OztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbUNBQW1DLGdCQUFnQjtBQUNuRCxJQUFJO0FBQ0o7QUFDQTtBQUNBLEdBQUc7QUFDSDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQWdCLGlCQUFpQjtBQUNqQztBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVksb0JBQW9CO0FBQ2hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG9EQUFvRCxjQUFjOztBQUVsRTtBQUNBOzs7Ozs7Ozs7OENDM0VBO0FBQ0E7QUFDQTtBQUNBLFVBQVUsZ0JBQWdCLHNDQUFzQyxpQkFBaUIsRUFBRTtBQUNuRix5QkFBeUIsdURBQXVEO0FBQ2hGO0FBQ0E7QUFDQSx1QkFBdUIsc0JBQXNCO0FBQzdDO0FBQ0E7QUFDQSxDQUFDO0FBQ0QsOENBQThDLGNBQWM7QUFDNUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBLENBQUM7QUFDRDtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0EsQ0FBQztBQUNEO0FBQ0EsQ0FBQztBQUNEO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0EsS0FBSztBQUNMLCtCQUErQixTQUFTO0FBQ3hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1REFBdUQsa0NBQWtDLEVBQUU7QUFDM0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQkFBMkIsaUJBQWlCO0FBQzVDO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLHVCQUF1QjtBQUMzQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQix1QkFBdUI7QUFDM0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSx1Q0FBdUMsUUFBUTtBQUMvQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsdUJBQXVCLGVBQWU7QUFDdEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLG9FQUFvRSw4REFBOEQsRUFBRTtBQUNwSTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxrQ0FBa0MscUJBQXFCO0FBQ3ZELG1DQUFtQyxvQkFBb0I7QUFDdkQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscURBQXFELE9BQU87QUFDNUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFEQUFxRCxpREFBaUQsRUFBRTtBQUN4RztBQUNBLDZDQUE2QyxPQUFPO0FBQ3BEO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOEJBQThCO0FBQzlCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQ0FBZ0M7QUFDaEMsa0RBQWtELDhEQUE4RCxFQUFFO0FBQ2xIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QixxQkFBcUI7QUFDbEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QixxQkFBcUI7QUFDbEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQkFBMkIsT0FBTztBQUNsQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNCQUFzQix1Q0FBdUM7QUFDN0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDhCQUE4Qiw4QkFBOEI7QUFDNUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDO0FB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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQkFBbUIsT0FBTztBQUMxQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1QkFBdUIsaUJBQWlCO0FBQ3hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0RBQStELHlDQUF5QyxFQUFFO0FBQzFHO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtEQUFrRCxhQUFhO0FBQy9EO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtDQUFrQyx5QkFBeUI7QUFDM0QsOEJBQThCLHVDQUF1QztBQUNyRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDhEQUE4RCw4QkFBOEIsRUFBRTtBQUM5RjtBQUNBO0FBQ0E7QUFDQSw0Q0FBNEMsMkRBQTJELEVBQUU7QUFDekc7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJEQUEyRCxt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Q0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsRUFBRTtBQUNGOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxFQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRUFBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEVBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEVBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLHVEQUF1RDtBQUN2RDs7QUFFQSw2QkFBNkIsbUJBQW1COztBQUVoRDs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDbFRBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7QUFFQTs7OztBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlGQUF5RjtBQUN6RjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTzs7QUFFUDtBQUNBLEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxPQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQSxPQUFPO0FBQ1A7QUFDQTs7QUFFQTs7O0FBR0E7QUFDQTtBQUNBLENBQUM7QUFDRDs7QUFFQSxnQ0FBZ0MsMkNBQTJDLGdCQUFnQixrQkFBa0IsT0FBTywyQkFBMkIsd0RBQXdELGdDQUFnQyx1REFBdUQsMkRBQTJELEVBQUUsRUFBRSx5REFBeUQscUVBQXFFLDZEQUE2RCxvQkFBb0IsR0FBRyxFQUFFOztBQUVqakI7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUEsdUNBQXVDLDZCQUE2QixZQUFZLEVBQUUsT0FBTyxpQkFBaUIsbUJBQW1CLHVCQUF1Qiw0RUFBNEUsRUFBRSxFQUFFLHNCQUFzQixlQUFlLEVBQUU7O0FBRTNRLHNDQUFzQyx1Q0FBdUMsZ0JBQWdCOztBQUU3RixpREFBaUQsMENBQTBDLDBEQUEwRCxFQUFFOztBQUV2SixpREFBaUQsYUFBYSx1RkFBdUYsRUFBRSx1RkFBdUY7O0FBRTlPLDBDQUEwQywrREFBK0QscUdBQXFHLEVBQUUseUVBQXlFLGVBQWUseUVBQXlFLEVBQUUsRUFBRSx1SEFBdUg7O0FBRTVlLHdCQUF3Qjs7QUFFeEI7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBLENBQUM7QUFDRDtBQUNBLENBQUM7QUFDRDtBQUNBLENBQUM7QUFDRDs7QUFFQSxPQUFPO0FBQ1A7QUFDQTs7QUFFQTs7O0FBR0EsT0FBTztBQUNQO0FBQ0E7O0FBRUE7OztBQUdBO0FBQ0E7QUFDQSxDQUFDO0FBQ0Q7O0FBRUEsb0dBQW9HLG1CQUFtQixFQUFFLG1CQUFtQiw4SEFBOEg7O0FBRTFROztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQSx1Q0FBdUMsNkJBQTZCLFlBQVksRUFBRSxPQUFPLGlCQUFpQixtQkFBbUIsdUJBQXVCLDRFQUE0RSxFQUFFLEVBQUUsc0JBQXNCLGVBQWUsRUFBRTs7QUFFM1Esc0NBQXNDLHVDQUF1QyxnQkFBZ0I7O0FBRTdGO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBLE9BQU87QUFDUDtBQUNBOztBQUVBOzs7QUFHQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRCxnQ0FBZ0MsMkNBQTJDLGdCQUFnQixrQkFBa0IsT0FBTywyQkFBMkIsd0RBQXdELGdDQUFnQyx1REFBdUQsMkRBQTJELEVBQUUsRUFBRSx5REFBeUQscUVBQXFFLDZEQUE2RCxvQkFBb0IsR0FBRyxFQUFFOztBQUVqakIsaURBQWlELDBDQUEwQywwREFBMEQsRUFBRTs7QUFFdko7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsR0FBRzs7QUFFSDtBQUNBLENBQUM7O0FBRUQ7O0FBRUEsT0FBTztBQUNQO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBLDhDQUE4QztBQUM5Qzs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSx1QkFBdUIsaUJBQWlCO0FBQ3hDO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjs7QUFFakI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7O0FBR0EsT0FBTztBQUNQO0FBQ0EsQ0FBQyxFOzs7Ozs7OztBQ2psQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLE9BQU87QUFDbEIsV0FBVyxPQUFPO0FBQ2xCLFdBQVcsT0FBTztBQUNsQixXQUFXLE9BQU87QUFDbEIsV0FBVyxVQUFVO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0dBQWdHO0FBQ2hHO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxnR0FBZ0c7QUFDaEc7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOzs7Ozs7Ozs7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7Ozs7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsMENBQTBDOztBQUUxQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYSxRQUFRO0FBQ3JCLGNBQWM7QUFDZDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1YsNkJBQTZCO0FBQzdCLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBLCtCQUErQixLQUFLO0FBQ3BDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1QsNEJBQTRCO0FBQzVCLE9BQU87QUFDUDtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQXFCLHNCQUFzQjtBQUMzQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLHFCQUFxQiwyQkFBMkI7QUFDaEQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EscUJBQXFCLGdDQUFnQztBQUNyRDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7Ozs7O0FDN2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdDQUF3QyxXQUFXLEVBQUU7QUFDckQsd0NBQXdDLFdBQVcsRUFBRTs7QUFFckQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQSxzQ0FBc0M7QUFDdEMsR0FBRztBQUNIO0FBQ0EsOERBQThEO0FBQzlEOztBQUVBO0FBQ0E7QUFDQSxFQUFFOztBQUVGO0FBQ0E7QUFDQTs7Ozs7Ozs7QUN4RkE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0EsZ0NBQWdDLFVBQVUsRUFBRTtBQUM1QyxDOzs7Ozs7O0FDekJBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBLGdDQUFnQyxVQUFVLEVBQUU7QUFDNUMsQzs7Ozs7Ozs7OztBQ3hCQTs7OztBQUNBOzs7O0FBR0E7Ozs7QUFHQTs7Ozs7O0FBR0E7OztBQVBBO0FBSkE7QUFZQSxtQkFBUzZDLE1BQVQsQ0FDRSwwREFERixFQUVFQyxTQUFTQyxjQUFULENBQXdCLFlBQXhCLENBRkY7O0FBTEEsdUIiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDEzLXByZXNlbnQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKiBcbiAqL1xuXG5mdW5jdGlvbiBtYWtlRW1wdHlGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gYXJnO1xuICB9O1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gYWNjZXB0cyBhbmQgZGlzY2FyZHMgaW5wdXRzOyBpdCBoYXMgbm8gc2lkZSBlZmZlY3RzLiBUaGlzIGlzXG4gKiBwcmltYXJpbHkgdXNlZnVsIGlkaW9tYXRpY2FsbHkgZm9yIG92ZXJyaWRhYmxlIGZ1bmN0aW9uIGVuZHBvaW50cyB3aGljaFxuICogYWx3YXlzIG5lZWQgdG8gYmUgY2FsbGFibGUsIHNpbmNlIEpTIGxhY2tzIGEgbnVsbC1jYWxsIGlkaW9tIGFsYSBDb2NvYS5cbiAqL1xudmFyIGVtcHR5RnVuY3Rpb24gPSBmdW5jdGlvbiBlbXB0eUZ1bmN0aW9uKCkge307XG5cbmVtcHR5RnVuY3Rpb24udGhhdFJldHVybnMgPSBtYWtlRW1wdHlGdW5jdGlvbjtcbmVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNGYWxzZSA9IG1ha2VFbXB0eUZ1bmN0aW9uKGZhbHNlKTtcbmVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNUcnVlID0gbWFrZUVtcHR5RnVuY3Rpb24odHJ1ZSk7XG5lbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zTnVsbCA9IG1ha2VFbXB0eUZ1bmN0aW9uKG51bGwpO1xuZW1wdHlGdW5jdGlvbi50aGF0UmV0dXJuc1RoaXMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzO1xufTtcbmVtcHR5RnVuY3Rpb24udGhhdFJldHVybnNBcmd1bWVudCA9IGZ1bmN0aW9uIChhcmcpIHtcbiAgcmV0dXJuIGFyZztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZW1wdHlGdW5jdGlvbjtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9+L2ZianMvbGliL2VtcHR5RnVuY3Rpb24uanNcbi8vIG1vZHVsZSBpZCA9IDE0OVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIENvcHlyaWdodCAoYykgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBVc2UgaW52YXJpYW50KCkgdG8gYXNzZXJ0IHN0YXRlIHdoaWNoIHlvdXIgcHJvZ3JhbSBhc3N1bWVzIHRvIGJlIHRydWUuXG4gKlxuICogUHJvdmlkZSBzcHJpbnRmLXN0eWxlIGZvcm1hdCAob25seSAlcyBpcyBzdXBwb3J0ZWQpIGFuZCBhcmd1bWVudHNcbiAqIHRvIHByb3ZpZGUgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCBicm9rZSBhbmQgd2hhdCB5b3Ugd2VyZVxuICogZXhwZWN0aW5nLlxuICpcbiAqIFRoZSBpbnZhcmlhbnQgbWVzc2FnZSB3aWxsIGJlIHN0cmlwcGVkIGluIHByb2R1Y3Rpb24sIGJ1dCB0aGUgaW52YXJpYW50XG4gKiB3aWxsIHJlbWFpbiB0byBlbnN1cmUgbG9naWMgZG9lcyBub3QgZGlmZmVyIGluIHByb2R1Y3Rpb24uXG4gKi9cblxudmFyIHZhbGlkYXRlRm9ybWF0ID0gZnVuY3Rpb24gdmFsaWRhdGVGb3JtYXQoZm9ybWF0KSB7fTtcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgdmFsaWRhdGVGb3JtYXQgPSBmdW5jdGlvbiB2YWxpZGF0ZUZvcm1hdChmb3JtYXQpIHtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW52YXJpYW50IHJlcXVpcmVzIGFuIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQnKTtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGludmFyaWFudChjb25kaXRpb24sIGZvcm1hdCwgYSwgYiwgYywgZCwgZSwgZikge1xuICB2YWxpZGF0ZUZvcm1hdChmb3JtYXQpO1xuXG4gIGlmICghY29uZGl0aW9uKSB7XG4gICAgdmFyIGVycm9yO1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoJ01pbmlmaWVkIGV4Y2VwdGlvbiBvY2N1cnJlZDsgdXNlIHRoZSBub24tbWluaWZpZWQgZGV2IGVudmlyb25tZW50ICcgKyAnZm9yIHRoZSBmdWxsIGVycm9yIG1lc3NhZ2UgYW5kIGFkZGl0aW9uYWwgaGVscGZ1bCB3YXJuaW5ncy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFyZ3MgPSBbYSwgYiwgYywgZCwgZSwgZl07XG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoZm9ybWF0LnJlcGxhY2UoLyVzL2csIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107XG4gICAgICB9KSk7XG4gICAgICBlcnJvci5uYW1lID0gJ0ludmFyaWFudCBWaW9sYXRpb24nO1xuICAgIH1cblxuICAgIGVycm9yLmZyYW1lc1RvUG9wID0gMTsgLy8gd2UgZG9uJ3QgY2FyZSBhYm91dCBpbnZhcmlhbnQncyBvd24gZnJhbWVcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGludmFyaWFudDtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9+L2ZianMvbGliL2ludmFyaWFudC5qc1xuLy8gbW9kdWxlIGlkID0gMTUwXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qXG5cdE1JVCBMaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG5cdEF1dGhvciBUb2JpYXMgS29wcGVycyBAc29rcmFcbiovXG4vLyBjc3MgYmFzZSBjb2RlLCBpbmplY3RlZCBieSB0aGUgY3NzLWxvYWRlclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih1c2VTb3VyY2VNYXApIHtcblx0dmFyIGxpc3QgPSBbXTtcblxuXHQvLyByZXR1cm4gdGhlIGxpc3Qgb2YgbW9kdWxlcyBhcyBjc3Mgc3RyaW5nXG5cdGxpc3QudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcblx0XHRcdHZhciBjb250ZW50ID0gY3NzV2l0aE1hcHBpbmdUb1N0cmluZyhpdGVtLCB1c2VTb3VyY2VNYXApO1xuXHRcdFx0aWYoaXRlbVsyXSkge1xuXHRcdFx0XHRyZXR1cm4gXCJAbWVkaWEgXCIgKyBpdGVtWzJdICsgXCJ7XCIgKyBjb250ZW50ICsgXCJ9XCI7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gY29udGVudDtcblx0XHRcdH1cblx0XHR9KS5qb2luKFwiXCIpO1xuXHR9O1xuXG5cdC8vIGltcG9ydCBhIGxpc3Qgb2YgbW9kdWxlcyBpbnRvIHRoZSBsaXN0XG5cdGxpc3QuaSA9IGZ1bmN0aW9uKG1vZHVsZXMsIG1lZGlhUXVlcnkpIHtcblx0XHRpZih0eXBlb2YgbW9kdWxlcyA9PT0gXCJzdHJpbmdcIilcblx0XHRcdG1vZHVsZXMgPSBbW251bGwsIG1vZHVsZXMsIFwiXCJdXTtcblx0XHR2YXIgYWxyZWFkeUltcG9ydGVkTW9kdWxlcyA9IHt9O1xuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgaWQgPSB0aGlzW2ldWzBdO1xuXHRcdFx0aWYodHlwZW9mIGlkID09PSBcIm51bWJlclwiKVxuXHRcdFx0XHRhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2lkXSA9IHRydWU7XG5cdFx0fVxuXHRcdGZvcihpID0gMDsgaSA8IG1vZHVsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpdGVtID0gbW9kdWxlc1tpXTtcblx0XHRcdC8vIHNraXAgYWxyZWFkeSBpbXBvcnRlZCBtb2R1bGVcblx0XHRcdC8vIHRoaXMgaW1wbGVtZW50YXRpb24gaXMgbm90IDEwMCUgcGVyZmVjdCBmb3Igd2VpcmQgbWVkaWEgcXVlcnkgY29tYmluYXRpb25zXG5cdFx0XHQvLyAgd2hlbiBhIG1vZHVsZSBpcyBpbXBvcnRlZCBtdWx0aXBsZSB0aW1lcyB3aXRoIGRpZmZlcmVudCBtZWRpYSBxdWVyaWVzLlxuXHRcdFx0Ly8gIEkgaG9wZSB0aGlzIHdpbGwgbmV2ZXIgb2NjdXIgKEhleSB0aGlzIHdheSB3ZSBoYXZlIHNtYWxsZXIgYnVuZGxlcylcblx0XHRcdGlmKHR5cGVvZiBpdGVtWzBdICE9PSBcIm51bWJlclwiIHx8ICFhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2l0ZW1bMF1dKSB7XG5cdFx0XHRcdGlmKG1lZGlhUXVlcnkgJiYgIWl0ZW1bMl0pIHtcblx0XHRcdFx0XHRpdGVtWzJdID0gbWVkaWFRdWVyeTtcblx0XHRcdFx0fSBlbHNlIGlmKG1lZGlhUXVlcnkpIHtcblx0XHRcdFx0XHRpdGVtWzJdID0gXCIoXCIgKyBpdGVtWzJdICsgXCIpIGFuZCAoXCIgKyBtZWRpYVF1ZXJ5ICsgXCIpXCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0bGlzdC5wdXNoKGl0ZW0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblx0cmV0dXJuIGxpc3Q7XG59O1xuXG5mdW5jdGlvbiBjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKGl0ZW0sIHVzZVNvdXJjZU1hcCkge1xuXHR2YXIgY29udGVudCA9IGl0ZW1bMV0gfHwgJyc7XG5cdHZhciBjc3NNYXBwaW5nID0gaXRlbVszXTtcblx0aWYgKCFjc3NNYXBwaW5nKSB7XG5cdFx0cmV0dXJuIGNvbnRlbnQ7XG5cdH1cblxuXHRpZiAodXNlU291cmNlTWFwICYmIHR5cGVvZiBidG9hID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0dmFyIHNvdXJjZU1hcHBpbmcgPSB0b0NvbW1lbnQoY3NzTWFwcGluZyk7XG5cdFx0dmFyIHNvdXJjZVVSTHMgPSBjc3NNYXBwaW5nLnNvdXJjZXMubWFwKGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0XHRcdHJldHVybiAnLyojIHNvdXJjZVVSTD0nICsgY3NzTWFwcGluZy5zb3VyY2VSb290ICsgc291cmNlICsgJyAqLydcblx0XHR9KTtcblxuXHRcdHJldHVybiBbY29udGVudF0uY29uY2F0KHNvdXJjZVVSTHMpLmNvbmNhdChbc291cmNlTWFwcGluZ10pLmpvaW4oJ1xcbicpO1xuXHR9XG5cblx0cmV0dXJuIFtjb250ZW50XS5qb2luKCdcXG4nKTtcbn1cblxuLy8gQWRhcHRlZCBmcm9tIGNvbnZlcnQtc291cmNlLW1hcCAoTUlUKVxuZnVuY3Rpb24gdG9Db21tZW50KHNvdXJjZU1hcCkge1xuXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcblx0dmFyIGJhc2U2NCA9IGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHNvdXJjZU1hcCkpKSk7XG5cdHZhciBkYXRhID0gJ3NvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LCcgKyBiYXNlNjQ7XG5cblx0cmV0dXJuICcvKiMgJyArIGRhdGEgKyAnICovJztcbn1cblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9jc3MtbG9hZGVyL2xpYi9jc3MtYmFzZS5qc1xuLy8gbW9kdWxlIGlkID0gMjQ4XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcbiAgICAgICAgZnVuY3Rpb24gKGQsIGIpIHsgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07IH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgICAgIGV4dGVuZFN0YXRpY3MoZCwgYik7XG4gICAgICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgICAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG4gICAgfTtcbn0pKCk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5yZWdpc3Rlckdsb2JhbHMoKTtcbmV4cG9ydHMuZXh0cmFzID0ge1xuICAgIGFsbG93U3RhdGVDaGFuZ2VzOiBhbGxvd1N0YXRlQ2hhbmdlcyxcbiAgICBkZWVwRXF1YWw6IGRlZXBFcXVhbCxcbiAgICBnZXRBdG9tOiBnZXRBdG9tLFxuICAgIGdldERlYnVnTmFtZTogZ2V0RGVidWdOYW1lLFxuICAgIGdldERlcGVuZGVuY3lUcmVlOiBnZXREZXBlbmRlbmN5VHJlZSxcbiAgICBnZXRBZG1pbmlzdHJhdGlvbjogZ2V0QWRtaW5pc3RyYXRpb24sXG4gICAgZ2V0R2xvYmFsU3RhdGU6IGdldEdsb2JhbFN0YXRlLFxuICAgIGdldE9ic2VydmVyVHJlZTogZ2V0T2JzZXJ2ZXJUcmVlLFxuICAgIGlzQ29tcHV0aW5nRGVyaXZhdGlvbjogaXNDb21wdXRpbmdEZXJpdmF0aW9uLFxuICAgIGlzU3B5RW5hYmxlZDogaXNTcHlFbmFibGVkLFxuICAgIG9uUmVhY3Rpb25FcnJvcjogb25SZWFjdGlvbkVycm9yLFxuICAgIHJlc2VydmVBcnJheUJ1ZmZlcjogcmVzZXJ2ZUFycmF5QnVmZmVyLFxuICAgIHJlc2V0R2xvYmFsU3RhdGU6IHJlc2V0R2xvYmFsU3RhdGUsXG4gICAgc2hhcmVHbG9iYWxTdGF0ZTogc2hhcmVHbG9iYWxTdGF0ZSxcbiAgICBzcHlSZXBvcnQ6IHNweVJlcG9ydCxcbiAgICBzcHlSZXBvcnRFbmQ6IHNweVJlcG9ydEVuZCxcbiAgICBzcHlSZXBvcnRTdGFydDogc3B5UmVwb3J0U3RhcnQsXG4gICAgc2V0UmVhY3Rpb25TY2hlZHVsZXI6IHNldFJlYWN0aW9uU2NoZWR1bGVyXG59O1xuaWYgKHR5cGVvZiBfX01PQlhfREVWVE9PTFNfR0xPQkFMX0hPT0tfXyA9PT0gXCJvYmplY3RcIikge1xuICAgIF9fTU9CWF9ERVZUT09MU19HTE9CQUxfSE9PS19fLmluamVjdE1vYngobW9kdWxlLmV4cG9ydHMpO1xufVxubW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IG1vZHVsZS5leHBvcnRzO1xudmFyIGFjdGlvbkZpZWxkRGVjb3JhdG9yID0gY3JlYXRlQ2xhc3NQcm9wZXJ0eURlY29yYXRvcihmdW5jdGlvbiAodGFyZ2V0LCBrZXksIHZhbHVlLCBhcmdzLCBvcmlnaW5hbERlc2NyaXB0b3IpIHtcbiAgICB2YXIgYWN0aW9uTmFtZSA9IChhcmdzICYmIGFyZ3MubGVuZ3RoID09PSAxKSA/IGFyZ3NbMF0gOiAodmFsdWUubmFtZSB8fCBrZXkgfHwgXCI8dW5uYW1lZCBhY3Rpb24+XCIpO1xuICAgIHZhciB3cmFwcGVkQWN0aW9uID0gYWN0aW9uKGFjdGlvbk5hbWUsIHZhbHVlKTtcbiAgICBhZGRIaWRkZW5Qcm9wKHRhcmdldCwga2V5LCB3cmFwcGVkQWN0aW9uKTtcbn0sIGZ1bmN0aW9uIChrZXkpIHtcbiAgICByZXR1cm4gdGhpc1trZXldO1xufSwgZnVuY3Rpb24gKCkge1xuICAgIGludmFyaWFudChmYWxzZSwgZ2V0TWVzc2FnZShcIm0wMDFcIikpO1xufSwgZmFsc2UsIHRydWUpO1xudmFyIGJvdW5kQWN0aW9uRGVjb3JhdG9yID0gY3JlYXRlQ2xhc3NQcm9wZXJ0eURlY29yYXRvcihmdW5jdGlvbiAodGFyZ2V0LCBrZXksIHZhbHVlKSB7XG4gICAgZGVmaW5lQm91bmRBY3Rpb24odGFyZ2V0LCBrZXksIHZhbHVlKTtcbn0sIGZ1bmN0aW9uIChrZXkpIHtcbiAgICByZXR1cm4gdGhpc1trZXldO1xufSwgZnVuY3Rpb24gKCkge1xuICAgIGludmFyaWFudChmYWxzZSwgZ2V0TWVzc2FnZShcIm0wMDFcIikpO1xufSwgZmFsc2UsIGZhbHNlKTtcbnZhciBhY3Rpb24gPSBmdW5jdGlvbiBhY3Rpb24oYXJnMSwgYXJnMiwgYXJnMywgYXJnNCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxICYmIHR5cGVvZiBhcmcxID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgIHJldHVybiBjcmVhdGVBY3Rpb24oYXJnMS5uYW1lIHx8IFwiPHVubmFtZWQgYWN0aW9uPlwiLCBhcmcxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMiAmJiB0eXBlb2YgYXJnMiA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgICByZXR1cm4gY3JlYXRlQWN0aW9uKGFyZzEsIGFyZzIpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxICYmIHR5cGVvZiBhcmcxID09PSBcInN0cmluZ1wiKVxuICAgICAgICByZXR1cm4gbmFtZWRBY3Rpb25EZWNvcmF0b3IoYXJnMSk7XG4gICAgcmV0dXJuIG5hbWVkQWN0aW9uRGVjb3JhdG9yKGFyZzIpLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59O1xuZXhwb3J0cy5hY3Rpb24gPSBhY3Rpb247XG5hY3Rpb24uYm91bmQgPSBmdW5jdGlvbiBib3VuZEFjdGlvbihhcmcxLCBhcmcyLCBhcmczKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcxID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdmFyIGFjdGlvbl8xID0gY3JlYXRlQWN0aW9uKFwiPG5vdCB5ZXQgYm91bmQgYWN0aW9uPlwiLCBhcmcxKTtcbiAgICAgICAgYWN0aW9uXzEuYXV0b0JpbmQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gYWN0aW9uXzE7XG4gICAgfVxuICAgIHJldHVybiBib3VuZEFjdGlvbkRlY29yYXRvci5hcHBseShudWxsLCBhcmd1bWVudHMpO1xufTtcbmZ1bmN0aW9uIG5hbWVkQWN0aW9uRGVjb3JhdG9yKG5hbWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwgcHJvcCwgZGVzY3JpcHRvcikge1xuICAgICAgICBpZiAoZGVzY3JpcHRvciAmJiB0eXBlb2YgZGVzY3JpcHRvci52YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBkZXNjcmlwdG9yLnZhbHVlID0gY3JlYXRlQWN0aW9uKG5hbWUsIGRlc2NyaXB0b3IudmFsdWUpO1xuICAgICAgICAgICAgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm4gZGVzY3JpcHRvcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWN0aW9uRmllbGREZWNvcmF0b3IobmFtZSkuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xufVxuZnVuY3Rpb24gcnVuSW5BY3Rpb24oYXJnMSwgYXJnMiwgYXJnMykge1xuICAgIHZhciBhY3Rpb25OYW1lID0gdHlwZW9mIGFyZzEgPT09IFwic3RyaW5nXCIgPyBhcmcxIDogYXJnMS5uYW1lIHx8IFwiPHVubmFtZWQgYWN0aW9uPlwiO1xuICAgIHZhciBmbiA9IHR5cGVvZiBhcmcxID09PSBcImZ1bmN0aW9uXCIgPyBhcmcxIDogYXJnMjtcbiAgICB2YXIgc2NvcGUgPSB0eXBlb2YgYXJnMSA9PT0gXCJmdW5jdGlvblwiID8gYXJnMiA6IGFyZzM7XG4gICAgaW52YXJpYW50KHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiLCBnZXRNZXNzYWdlKFwibTAwMlwiKSk7XG4gICAgaW52YXJpYW50KGZuLmxlbmd0aCA9PT0gMCwgZ2V0TWVzc2FnZShcIm0wMDNcIikpO1xuICAgIGludmFyaWFudCh0eXBlb2YgYWN0aW9uTmFtZSA9PT0gXCJzdHJpbmdcIiAmJiBhY3Rpb25OYW1lLmxlbmd0aCA+IDAsIFwiYWN0aW9ucyBzaG91bGQgaGF2ZSB2YWxpZCBuYW1lcywgZ290OiAnXCIgKyBhY3Rpb25OYW1lICsgXCInXCIpO1xuICAgIHJldHVybiBleGVjdXRlQWN0aW9uKGFjdGlvbk5hbWUsIGZuLCBzY29wZSwgdW5kZWZpbmVkKTtcbn1cbmV4cG9ydHMucnVuSW5BY3Rpb24gPSBydW5JbkFjdGlvbjtcbmZ1bmN0aW9uIGlzQWN0aW9uKHRoaW5nKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB0aGluZyA9PT0gXCJmdW5jdGlvblwiICYmIHRoaW5nLmlzTW9ieEFjdGlvbiA9PT0gdHJ1ZTtcbn1cbmV4cG9ydHMuaXNBY3Rpb24gPSBpc0FjdGlvbjtcbmZ1bmN0aW9uIGRlZmluZUJvdW5kQWN0aW9uKHRhcmdldCwgcHJvcGVydHlOYW1lLCBmbikge1xuICAgIHZhciByZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBleGVjdXRlQWN0aW9uKHByb3BlcnR5TmFtZSwgZm4sIHRhcmdldCwgYXJndW1lbnRzKTtcbiAgICB9O1xuICAgIHJlcy5pc01vYnhBY3Rpb24gPSB0cnVlO1xuICAgIGFkZEhpZGRlblByb3AodGFyZ2V0LCBwcm9wZXJ0eU5hbWUsIHJlcyk7XG59XG5mdW5jdGlvbiBhdXRvcnVuKGFyZzEsIGFyZzIsIGFyZzMpIHtcbiAgICB2YXIgbmFtZSwgdmlldywgc2NvcGU7XG4gICAgaWYgKHR5cGVvZiBhcmcxID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIG5hbWUgPSBhcmcxO1xuICAgICAgICB2aWV3ID0gYXJnMjtcbiAgICAgICAgc2NvcGUgPSBhcmczO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbmFtZSA9IGFyZzEubmFtZSB8fCAoXCJBdXRvcnVuQFwiICsgZ2V0TmV4dElkKCkpO1xuICAgICAgICB2aWV3ID0gYXJnMTtcbiAgICAgICAgc2NvcGUgPSBhcmcyO1xuICAgIH1cbiAgICBpbnZhcmlhbnQodHlwZW9mIHZpZXcgPT09IFwiZnVuY3Rpb25cIiwgZ2V0TWVzc2FnZShcIm0wMDRcIikpO1xuICAgIGludmFyaWFudChpc0FjdGlvbih2aWV3KSA9PT0gZmFsc2UsIGdldE1lc3NhZ2UoXCJtMDA1XCIpKTtcbiAgICBpZiAoc2NvcGUpXG4gICAgICAgIHZpZXcgPSB2aWV3LmJpbmQoc2NvcGUpO1xuICAgIHZhciByZWFjdGlvbiA9IG5ldyBSZWFjdGlvbihuYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMudHJhY2socmVhY3Rpb25SdW5uZXIpO1xuICAgIH0pO1xuICAgIGZ1bmN0aW9uIHJlYWN0aW9uUnVubmVyKCkge1xuICAgICAgICB2aWV3KHJlYWN0aW9uKTtcbiAgICB9XG4gICAgcmVhY3Rpb24uc2NoZWR1bGUoKTtcbiAgICByZXR1cm4gcmVhY3Rpb24uZ2V0RGlzcG9zZXIoKTtcbn1cbmV4cG9ydHMuYXV0b3J1biA9IGF1dG9ydW47XG5mdW5jdGlvbiB3aGVuKGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQpIHtcbiAgICB2YXIgbmFtZSwgcHJlZGljYXRlLCBlZmZlY3QsIHNjb3BlO1xuICAgIGlmICh0eXBlb2YgYXJnMSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBuYW1lID0gYXJnMTtcbiAgICAgICAgcHJlZGljYXRlID0gYXJnMjtcbiAgICAgICAgZWZmZWN0ID0gYXJnMztcbiAgICAgICAgc2NvcGUgPSBhcmc0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbmFtZSA9IChcIldoZW5AXCIgKyBnZXROZXh0SWQoKSk7XG4gICAgICAgIHByZWRpY2F0ZSA9IGFyZzE7XG4gICAgICAgIGVmZmVjdCA9IGFyZzI7XG4gICAgICAgIHNjb3BlID0gYXJnMztcbiAgICB9XG4gICAgdmFyIGRpc3Bvc2VyID0gYXV0b3J1bihuYW1lLCBmdW5jdGlvbiAocikge1xuICAgICAgICBpZiAocHJlZGljYXRlLmNhbGwoc2NvcGUpKSB7XG4gICAgICAgICAgICByLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIHZhciBwcmV2VW50cmFja2VkID0gdW50cmFja2VkU3RhcnQoKTtcbiAgICAgICAgICAgIGVmZmVjdC5jYWxsKHNjb3BlKTtcbiAgICAgICAgICAgIHVudHJhY2tlZEVuZChwcmV2VW50cmFja2VkKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBkaXNwb3Nlcjtcbn1cbmV4cG9ydHMud2hlbiA9IHdoZW47XG5mdW5jdGlvbiBhdXRvcnVuQXN5bmMoYXJnMSwgYXJnMiwgYXJnMywgYXJnNCkge1xuICAgIHZhciBuYW1lLCBmdW5jLCBkZWxheSwgc2NvcGU7XG4gICAgaWYgKHR5cGVvZiBhcmcxID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIG5hbWUgPSBhcmcxO1xuICAgICAgICBmdW5jID0gYXJnMjtcbiAgICAgICAgZGVsYXkgPSBhcmczO1xuICAgICAgICBzY29wZSA9IGFyZzQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBuYW1lID0gYXJnMS5uYW1lIHx8IChcIkF1dG9ydW5Bc3luY0BcIiArIGdldE5leHRJZCgpKTtcbiAgICAgICAgZnVuYyA9IGFyZzE7XG4gICAgICAgIGRlbGF5ID0gYXJnMjtcbiAgICAgICAgc2NvcGUgPSBhcmczO1xuICAgIH1cbiAgICBpbnZhcmlhbnQoaXNBY3Rpb24oZnVuYykgPT09IGZhbHNlLCBnZXRNZXNzYWdlKFwibTAwNlwiKSk7XG4gICAgaWYgKGRlbGF5ID09PSB2b2lkIDApXG4gICAgICAgIGRlbGF5ID0gMTtcbiAgICBpZiAoc2NvcGUpXG4gICAgICAgIGZ1bmMgPSBmdW5jLmJpbmQoc2NvcGUpO1xuICAgIHZhciBpc1NjaGVkdWxlZCA9IGZhbHNlO1xuICAgIHZhciByID0gbmV3IFJlYWN0aW9uKG5hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFpc1NjaGVkdWxlZCkge1xuICAgICAgICAgICAgaXNTY2hlZHVsZWQgPSB0cnVlO1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaXNTY2hlZHVsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAoIXIuaXNEaXNwb3NlZClcbiAgICAgICAgICAgICAgICAgICAgci50cmFjayhyZWFjdGlvblJ1bm5lcik7XG4gICAgICAgICAgICB9LCBkZWxheSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBmdW5jdGlvbiByZWFjdGlvblJ1bm5lcigpIHsgZnVuYyhyKTsgfVxuICAgIHIuc2NoZWR1bGUoKTtcbiAgICByZXR1cm4gci5nZXREaXNwb3NlcigpO1xufVxuZXhwb3J0cy5hdXRvcnVuQXN5bmMgPSBhdXRvcnVuQXN5bmM7XG5mdW5jdGlvbiByZWFjdGlvbihleHByZXNzaW9uLCBlZmZlY3QsIGFyZzMpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDMpIHtcbiAgICAgICAgZmFpbChnZXRNZXNzYWdlKFwibTAwN1wiKSk7XG4gICAgfVxuICAgIGlmIChpc01vZGlmaWVyRGVzY3JpcHRvcihleHByZXNzaW9uKSkge1xuICAgICAgICBmYWlsKGdldE1lc3NhZ2UoXCJtMDA4XCIpKTtcbiAgICB9XG4gICAgdmFyIG9wdHM7XG4gICAgaWYgKHR5cGVvZiBhcmczID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIG9wdHMgPSBhcmczO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgb3B0cyA9IHt9O1xuICAgIH1cbiAgICBvcHRzLm5hbWUgPSBvcHRzLm5hbWUgfHwgZXhwcmVzc2lvbi5uYW1lIHx8IGVmZmVjdC5uYW1lIHx8IChcIlJlYWN0aW9uQFwiICsgZ2V0TmV4dElkKCkpO1xuICAgIG9wdHMuZmlyZUltbWVkaWF0ZWx5ID0gYXJnMyA9PT0gdHJ1ZSB8fCBvcHRzLmZpcmVJbW1lZGlhdGVseSA9PT0gdHJ1ZTtcbiAgICBvcHRzLmRlbGF5ID0gb3B0cy5kZWxheSB8fCAwO1xuICAgIG9wdHMuY29tcGFyZVN0cnVjdHVyYWwgPSBvcHRzLmNvbXBhcmVTdHJ1Y3R1cmFsIHx8IG9wdHMuc3RydWN0IHx8IGZhbHNlO1xuICAgIGVmZmVjdCA9IGFjdGlvbihvcHRzLm5hbWUsIG9wdHMuY29udGV4dCA/IGVmZmVjdC5iaW5kKG9wdHMuY29udGV4dCkgOiBlZmZlY3QpO1xuICAgIGlmIChvcHRzLmNvbnRleHQpIHtcbiAgICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uYmluZChvcHRzLmNvbnRleHQpO1xuICAgIH1cbiAgICB2YXIgZmlyc3RUaW1lID0gdHJ1ZTtcbiAgICB2YXIgaXNTY2hlZHVsZWQgPSBmYWxzZTtcbiAgICB2YXIgbmV4dFZhbHVlO1xuICAgIHZhciByID0gbmV3IFJlYWN0aW9uKG9wdHMubmFtZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoZmlyc3RUaW1lIHx8IG9wdHMuZGVsYXkgPCAxKSB7XG4gICAgICAgICAgICByZWFjdGlvblJ1bm5lcigpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFpc1NjaGVkdWxlZCkge1xuICAgICAgICAgICAgaXNTY2hlZHVsZWQgPSB0cnVlO1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaXNTY2hlZHVsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZWFjdGlvblJ1bm5lcigpO1xuICAgICAgICAgICAgfSwgb3B0cy5kZWxheSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBmdW5jdGlvbiByZWFjdGlvblJ1bm5lcigpIHtcbiAgICAgICAgaWYgKHIuaXNEaXNwb3NlZClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIGNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgci50cmFjayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdiA9IGV4cHJlc3Npb24ocik7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdmFsdWVEaWRDaGFuZ2Uob3B0cy5jb21wYXJlU3RydWN0dXJhbCwgbmV4dFZhbHVlLCB2KTtcbiAgICAgICAgICAgIG5leHRWYWx1ZSA9IHY7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZmlyc3RUaW1lICYmIG9wdHMuZmlyZUltbWVkaWF0ZWx5KVxuICAgICAgICAgICAgZWZmZWN0KG5leHRWYWx1ZSwgcik7XG4gICAgICAgIGlmICghZmlyc3RUaW1lICYmIGNoYW5nZWQgPT09IHRydWUpXG4gICAgICAgICAgICBlZmZlY3QobmV4dFZhbHVlLCByKTtcbiAgICAgICAgaWYgKGZpcnN0VGltZSlcbiAgICAgICAgICAgIGZpcnN0VGltZSA9IGZhbHNlO1xuICAgIH1cbiAgICByLnNjaGVkdWxlKCk7XG4gICAgcmV0dXJuIHIuZ2V0RGlzcG9zZXIoKTtcbn1cbmV4cG9ydHMucmVhY3Rpb24gPSByZWFjdGlvbjtcbmZ1bmN0aW9uIGNyZWF0ZUNvbXB1dGVkRGVjb3JhdG9yKGNvbXBhcmVTdHJ1Y3R1cmFsKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUNsYXNzUHJvcGVydHlEZWNvcmF0b3IoZnVuY3Rpb24gKHRhcmdldCwgbmFtZSwgXywgX18sIG9yaWdpbmFsRGVzY3JpcHRvcikge1xuICAgICAgICBpbnZhcmlhbnQodHlwZW9mIG9yaWdpbmFsRGVzY3JpcHRvciAhPT0gXCJ1bmRlZmluZWRcIiwgZ2V0TWVzc2FnZShcIm0wMDlcIikpO1xuICAgICAgICBpbnZhcmlhbnQodHlwZW9mIG9yaWdpbmFsRGVzY3JpcHRvci5nZXQgPT09IFwiZnVuY3Rpb25cIiwgZ2V0TWVzc2FnZShcIm0wMTBcIikpO1xuICAgICAgICB2YXIgYWRtID0gYXNPYnNlcnZhYmxlT2JqZWN0KHRhcmdldCwgXCJcIik7XG4gICAgICAgIGRlZmluZUNvbXB1dGVkUHJvcGVydHkoYWRtLCBuYW1lLCBvcmlnaW5hbERlc2NyaXB0b3IuZ2V0LCBvcmlnaW5hbERlc2NyaXB0b3Iuc2V0LCBjb21wYXJlU3RydWN0dXJhbCwgZmFsc2UpO1xuICAgIH0sIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHZhciBvYnNlcnZhYmxlID0gdGhpcy4kbW9ieC52YWx1ZXNbbmFtZV07XG4gICAgICAgIGlmIChvYnNlcnZhYmxlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZS5nZXQoKTtcbiAgICB9LCBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy4kbW9ieC52YWx1ZXNbbmFtZV0uc2V0KHZhbHVlKTtcbiAgICB9LCBmYWxzZSwgZmFsc2UpO1xufVxudmFyIGNvbXB1dGVkRGVjb3JhdG9yID0gY3JlYXRlQ29tcHV0ZWREZWNvcmF0b3IoZmFsc2UpO1xudmFyIGNvbXB1dGVkU3RydWN0RGVjb3JhdG9yID0gY3JlYXRlQ29tcHV0ZWREZWNvcmF0b3IodHJ1ZSk7XG52YXIgY29tcHV0ZWQgPSAoZnVuY3Rpb24gY29tcHV0ZWQoYXJnMSwgYXJnMiwgYXJnMykge1xuICAgIGlmICh0eXBlb2YgYXJnMiA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICByZXR1cm4gY29tcHV0ZWREZWNvcmF0b3IuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgaW52YXJpYW50KHR5cGVvZiBhcmcxID09PSBcImZ1bmN0aW9uXCIsIGdldE1lc3NhZ2UoXCJtMDExXCIpKTtcbiAgICBpbnZhcmlhbnQoYXJndW1lbnRzLmxlbmd0aCA8IDMsIGdldE1lc3NhZ2UoXCJtMDEyXCIpKTtcbiAgICB2YXIgb3B0cyA9IHR5cGVvZiBhcmcyID09PSBcIm9iamVjdFwiID8gYXJnMiA6IHt9O1xuICAgIG9wdHMuc2V0dGVyID0gdHlwZW9mIGFyZzIgPT09IFwiZnVuY3Rpb25cIiA/IGFyZzIgOiBvcHRzLnNldHRlcjtcbiAgICByZXR1cm4gbmV3IENvbXB1dGVkVmFsdWUoYXJnMSwgb3B0cy5jb250ZXh0LCBvcHRzLmNvbXBhcmVTdHJ1Y3R1cmFsIHx8IG9wdHMuc3RydWN0IHx8IGZhbHNlLCBvcHRzLm5hbWUgfHwgYXJnMS5uYW1lIHx8IFwiXCIsIG9wdHMuc2V0dGVyKTtcbn0pO1xuZXhwb3J0cy5jb21wdXRlZCA9IGNvbXB1dGVkO1xuY29tcHV0ZWQuc3RydWN0ID0gY29tcHV0ZWRTdHJ1Y3REZWNvcmF0b3I7XG5mdW5jdGlvbiBjcmVhdGVUcmFuc2Zvcm1lcih0cmFuc2Zvcm1lciwgb25DbGVhbnVwKSB7XG4gICAgaW52YXJpYW50KHR5cGVvZiB0cmFuc2Zvcm1lciA9PT0gXCJmdW5jdGlvblwiICYmIHRyYW5zZm9ybWVyLmxlbmd0aCA8IDIsIFwiY3JlYXRlVHJhbnNmb3JtZXIgZXhwZWN0cyBhIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBvbmUgYXJndW1lbnRcIik7XG4gICAgdmFyIG9iamVjdENhY2hlID0ge307XG4gICAgdmFyIHJlc2V0SWQgPSBnbG9iYWxTdGF0ZS5yZXNldElkO1xuICAgIHZhciBUcmFuc2Zvcm1lciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgICAgIF9fZXh0ZW5kcyhUcmFuc2Zvcm1lciwgX3N1cGVyKTtcbiAgICAgICAgZnVuY3Rpb24gVHJhbnNmb3JtZXIoc291cmNlSWRlbnRpZmllciwgc291cmNlT2JqZWN0KSB7XG4gICAgICAgICAgICB2YXIgX3RoaXMgPSBfc3VwZXIuY2FsbCh0aGlzLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cmFuc2Zvcm1lcihzb3VyY2VPYmplY3QpOyB9LCB1bmRlZmluZWQsIGZhbHNlLCBcIlRyYW5zZm9ybWVyLVwiICsgdHJhbnNmb3JtZXIubmFtZSArIFwiLVwiICsgc291cmNlSWRlbnRpZmllciwgdW5kZWZpbmVkKSB8fCB0aGlzO1xuICAgICAgICAgICAgX3RoaXMuc291cmNlSWRlbnRpZmllciA9IHNvdXJjZUlkZW50aWZpZXI7XG4gICAgICAgICAgICBfdGhpcy5zb3VyY2VPYmplY3QgPSBzb3VyY2VPYmplY3Q7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXM7XG4gICAgICAgIH1cbiAgICAgICAgVHJhbnNmb3JtZXIucHJvdG90eXBlLm9uQmVjb21lVW5vYnNlcnZlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsYXN0VmFsdWUgPSB0aGlzLnZhbHVlO1xuICAgICAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5vbkJlY29tZVVub2JzZXJ2ZWQuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIGRlbGV0ZSBvYmplY3RDYWNoZVt0aGlzLnNvdXJjZUlkZW50aWZpZXJdO1xuICAgICAgICAgICAgaWYgKG9uQ2xlYW51cClcbiAgICAgICAgICAgICAgICBvbkNsZWFudXAobGFzdFZhbHVlLCB0aGlzLnNvdXJjZU9iamVjdCk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBUcmFuc2Zvcm1lcjtcbiAgICB9KENvbXB1dGVkVmFsdWUpKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICBpZiAocmVzZXRJZCAhPT0gZ2xvYmFsU3RhdGUucmVzZXRJZCkge1xuICAgICAgICAgICAgb2JqZWN0Q2FjaGUgPSB7fTtcbiAgICAgICAgICAgIHJlc2V0SWQgPSBnbG9iYWxTdGF0ZS5yZXNldElkO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpZGVudGlmaWVyID0gZ2V0TWVtb2l6YXRpb25JZChvYmplY3QpO1xuICAgICAgICB2YXIgcmVhY3RpdmVUcmFuc2Zvcm1lciA9IG9iamVjdENhY2hlW2lkZW50aWZpZXJdO1xuICAgICAgICBpZiAocmVhY3RpdmVUcmFuc2Zvcm1lcilcbiAgICAgICAgICAgIHJldHVybiByZWFjdGl2ZVRyYW5zZm9ybWVyLmdldCgpO1xuICAgICAgICByZWFjdGl2ZVRyYW5zZm9ybWVyID0gb2JqZWN0Q2FjaGVbaWRlbnRpZmllcl0gPSBuZXcgVHJhbnNmb3JtZXIoaWRlbnRpZmllciwgb2JqZWN0KTtcbiAgICAgICAgcmV0dXJuIHJlYWN0aXZlVHJhbnNmb3JtZXIuZ2V0KCk7XG4gICAgfTtcbn1cbmV4cG9ydHMuY3JlYXRlVHJhbnNmb3JtZXIgPSBjcmVhdGVUcmFuc2Zvcm1lcjtcbmZ1bmN0aW9uIGdldE1lbW9pemF0aW9uSWQob2JqZWN0KSB7XG4gICAgaWYgKHR5cGVvZiBvYmplY3QgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBvYmplY3QgPT09ICdudW1iZXInKVxuICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgIGlmIChvYmplY3QgPT09IG51bGwgfHwgdHlwZW9mIG9iamVjdCAhPT0gXCJvYmplY3RcIilcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiW21vYnhdIHRyYW5zZm9ybSBleHBlY3RlZCBzb21lIGtpbmQgb2Ygb2JqZWN0IG9yIHByaW1pdGl2ZSB2YWx1ZSwgZ290OiBcIiArIG9iamVjdCk7XG4gICAgdmFyIHRpZCA9IG9iamVjdC4kdHJhbnNmb3JtSWQ7XG4gICAgaWYgKHRpZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRpZCA9IGdldE5leHRJZCgpO1xuICAgICAgICBhZGRIaWRkZW5Qcm9wKG9iamVjdCwgXCIkdHJhbnNmb3JtSWRcIiwgdGlkKTtcbiAgICB9XG4gICAgcmV0dXJuIHRpZDtcbn1cbmZ1bmN0aW9uIGV4cHIoZXhwciwgc2NvcGUpIHtcbiAgICBpZiAoIWlzQ29tcHV0aW5nRGVyaXZhdGlvbigpKVxuICAgICAgICBjb25zb2xlLndhcm4oZ2V0TWVzc2FnZShcIm0wMTNcIikpO1xuICAgIHJldHVybiBjb21wdXRlZChleHByLCB7IGNvbnRleHQ6IHNjb3BlIH0pLmdldCgpO1xufVxuZXhwb3J0cy5leHByID0gZXhwcjtcbmZ1bmN0aW9uIGV4dGVuZE9ic2VydmFibGUodGFyZ2V0KSB7XG4gICAgdmFyIHByb3BlcnRpZXMgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDE7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICBwcm9wZXJ0aWVzW19pIC0gMV0gPSBhcmd1bWVudHNbX2ldO1xuICAgIH1cbiAgICByZXR1cm4gZXh0ZW5kT2JzZXJ2YWJsZUhlbHBlcih0YXJnZXQsIGRlZXBFbmhhbmNlciwgcHJvcGVydGllcyk7XG59XG5leHBvcnRzLmV4dGVuZE9ic2VydmFibGUgPSBleHRlbmRPYnNlcnZhYmxlO1xuZnVuY3Rpb24gZXh0ZW5kU2hhbGxvd09ic2VydmFibGUodGFyZ2V0KSB7XG4gICAgdmFyIHByb3BlcnRpZXMgPSBbXTtcbiAgICBmb3IgKHZhciBfaSA9IDE7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICBwcm9wZXJ0aWVzW19pIC0gMV0gPSBhcmd1bWVudHNbX2ldO1xuICAgIH1cbiAgICByZXR1cm4gZXh0ZW5kT2JzZXJ2YWJsZUhlbHBlcih0YXJnZXQsIHJlZmVyZW5jZUVuaGFuY2VyLCBwcm9wZXJ0aWVzKTtcbn1cbmV4cG9ydHMuZXh0ZW5kU2hhbGxvd09ic2VydmFibGUgPSBleHRlbmRTaGFsbG93T2JzZXJ2YWJsZTtcbmZ1bmN0aW9uIGV4dGVuZE9ic2VydmFibGVIZWxwZXIodGFyZ2V0LCBkZWZhdWx0RW5oYW5jZXIsIHByb3BlcnRpZXMpIHtcbiAgICBpbnZhcmlhbnQoYXJndW1lbnRzLmxlbmd0aCA+PSAyLCBnZXRNZXNzYWdlKFwibTAxNFwiKSk7XG4gICAgaW52YXJpYW50KHR5cGVvZiB0YXJnZXQgPT09IFwib2JqZWN0XCIsIGdldE1lc3NhZ2UoXCJtMDE1XCIpKTtcbiAgICBpbnZhcmlhbnQoIShpc09ic2VydmFibGVNYXAodGFyZ2V0KSksIGdldE1lc3NhZ2UoXCJtMDE2XCIpKTtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24gKHByb3BTZXQpIHtcbiAgICAgICAgaW52YXJpYW50KHR5cGVvZiBwcm9wU2V0ID09PSBcIm9iamVjdFwiLCBnZXRNZXNzYWdlKFwibTAxN1wiKSk7XG4gICAgICAgIGludmFyaWFudCghaXNPYnNlcnZhYmxlKHByb3BTZXQpLCBnZXRNZXNzYWdlKFwibTAxOFwiKSk7XG4gICAgfSk7XG4gICAgdmFyIGFkbSA9IGFzT2JzZXJ2YWJsZU9iamVjdCh0YXJnZXQpO1xuICAgIHZhciBkZWZpbmVkUHJvcHMgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gcHJvcGVydGllcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICB2YXIgcHJvcFNldCA9IHByb3BlcnRpZXNbaV07XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBwcm9wU2V0KVxuICAgICAgICAgICAgaWYgKGRlZmluZWRQcm9wc1trZXldICE9PSB0cnVlICYmIGhhc093blByb3BlcnR5KHByb3BTZXQsIGtleSkpIHtcbiAgICAgICAgICAgICAgICBkZWZpbmVkUHJvcHNba2V5XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldCA9PT0gcHJvcFNldCAmJiAhaXNQcm9wZXJ0eUNvbmZpZ3VyYWJsZSh0YXJnZXQsIGtleSkpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihwcm9wU2V0LCBrZXkpO1xuICAgICAgICAgICAgICAgIGRlZmluZU9ic2VydmFibGVQcm9wZXJ0eUZyb21EZXNjcmlwdG9yKGFkbSwga2V5LCBkZXNjcmlwdG9yLCBkZWZhdWx0RW5oYW5jZXIpO1xuICAgICAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuZnVuY3Rpb24gZ2V0RGVwZW5kZW5jeVRyZWUodGhpbmcsIHByb3BlcnR5KSB7XG4gICAgcmV0dXJuIG5vZGVUb0RlcGVuZGVuY3lUcmVlKGdldEF0b20odGhpbmcsIHByb3BlcnR5KSk7XG59XG5mdW5jdGlvbiBub2RlVG9EZXBlbmRlbmN5VHJlZShub2RlKSB7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgbmFtZTogbm9kZS5uYW1lXG4gICAgfTtcbiAgICBpZiAobm9kZS5vYnNlcnZpbmcgJiYgbm9kZS5vYnNlcnZpbmcubGVuZ3RoID4gMClcbiAgICAgICAgcmVzdWx0LmRlcGVuZGVuY2llcyA9IHVuaXF1ZShub2RlLm9ic2VydmluZykubWFwKG5vZGVUb0RlcGVuZGVuY3lUcmVlKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gZ2V0T2JzZXJ2ZXJUcmVlKHRoaW5nLCBwcm9wZXJ0eSkge1xuICAgIHJldHVybiBub2RlVG9PYnNlcnZlclRyZWUoZ2V0QXRvbSh0aGluZywgcHJvcGVydHkpKTtcbn1cbmZ1bmN0aW9uIG5vZGVUb09ic2VydmVyVHJlZShub2RlKSB7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgbmFtZTogbm9kZS5uYW1lXG4gICAgfTtcbiAgICBpZiAoaGFzT2JzZXJ2ZXJzKG5vZGUpKVxuICAgICAgICByZXN1bHQub2JzZXJ2ZXJzID0gZ2V0T2JzZXJ2ZXJzKG5vZGUpLm1hcChub2RlVG9PYnNlcnZlclRyZWUpO1xuICAgIHJldHVybiByZXN1bHQ7XG59XG5mdW5jdGlvbiBpbnRlcmNlcHQodGhpbmcsIHByb3BPckhhbmRsZXIsIGhhbmRsZXIpIHtcbiAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgcmV0dXJuIGludGVyY2VwdFByb3BlcnR5KHRoaW5nLCBwcm9wT3JIYW5kbGVyLCBoYW5kbGVyKTtcbiAgICBlbHNlXG4gICAgICAgIHJldHVybiBpbnRlcmNlcHRJbnRlcmNlcHRhYmxlKHRoaW5nLCBwcm9wT3JIYW5kbGVyKTtcbn1cbmV4cG9ydHMuaW50ZXJjZXB0ID0gaW50ZXJjZXB0O1xuZnVuY3Rpb24gaW50ZXJjZXB0SW50ZXJjZXB0YWJsZSh0aGluZywgaGFuZGxlcikge1xuICAgIHJldHVybiBnZXRBZG1pbmlzdHJhdGlvbih0aGluZykuaW50ZXJjZXB0KGhhbmRsZXIpO1xufVxuZnVuY3Rpb24gaW50ZXJjZXB0UHJvcGVydHkodGhpbmcsIHByb3BlcnR5LCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGdldEFkbWluaXN0cmF0aW9uKHRoaW5nLCBwcm9wZXJ0eSkuaW50ZXJjZXB0KGhhbmRsZXIpO1xufVxuZnVuY3Rpb24gaXNDb21wdXRlZCh2YWx1ZSwgcHJvcGVydHkpIHtcbiAgICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChwcm9wZXJ0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChpc09ic2VydmFibGVPYmplY3QodmFsdWUpID09PSBmYWxzZSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIGF0b20gPSBnZXRBdG9tKHZhbHVlLCBwcm9wZXJ0eSk7XG4gICAgICAgIHJldHVybiBpc0NvbXB1dGVkVmFsdWUoYXRvbSk7XG4gICAgfVxuICAgIHJldHVybiBpc0NvbXB1dGVkVmFsdWUodmFsdWUpO1xufVxuZXhwb3J0cy5pc0NvbXB1dGVkID0gaXNDb21wdXRlZDtcbmZ1bmN0aW9uIGlzT2JzZXJ2YWJsZSh2YWx1ZSwgcHJvcGVydHkpIHtcbiAgICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChwcm9wZXJ0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChpc09ic2VydmFibGVBcnJheSh2YWx1ZSkgfHwgaXNPYnNlcnZhYmxlTWFwKHZhbHVlKSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihnZXRNZXNzYWdlKFwibTAxOVwiKSk7XG4gICAgICAgIGVsc2UgaWYgKGlzT2JzZXJ2YWJsZU9iamVjdCh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhciBvID0gdmFsdWUuJG1vYng7XG4gICAgICAgICAgICByZXR1cm4gby52YWx1ZXMgJiYgISFvLnZhbHVlc1twcm9wZXJ0eV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gaXNPYnNlcnZhYmxlT2JqZWN0KHZhbHVlKSB8fCAhIXZhbHVlLiRtb2J4IHx8IGlzQXRvbSh2YWx1ZSkgfHwgaXNSZWFjdGlvbih2YWx1ZSkgfHwgaXNDb21wdXRlZFZhbHVlKHZhbHVlKTtcbn1cbmV4cG9ydHMuaXNPYnNlcnZhYmxlID0gaXNPYnNlcnZhYmxlO1xudmFyIGRlZXBEZWNvcmF0b3IgPSBjcmVhdGVEZWNvcmF0b3JGb3JFbmhhbmNlcihkZWVwRW5oYW5jZXIpO1xudmFyIHNoYWxsb3dEZWNvcmF0b3IgPSBjcmVhdGVEZWNvcmF0b3JGb3JFbmhhbmNlcihzaGFsbG93RW5oYW5jZXIpO1xudmFyIHJlZkRlY29yYXRvciA9IGNyZWF0ZURlY29yYXRvckZvckVuaGFuY2VyKHJlZmVyZW5jZUVuaGFuY2VyKTtcbnZhciBkZWVwU3RydWN0RGVjb3JhdG9yID0gY3JlYXRlRGVjb3JhdG9yRm9yRW5oYW5jZXIoZGVlcFN0cnVjdEVuaGFuY2VyKTtcbnZhciByZWZTdHJ1Y3REZWNvcmF0b3IgPSBjcmVhdGVEZWNvcmF0b3JGb3JFbmhhbmNlcihyZWZTdHJ1Y3RFbmhhbmNlcik7XG5mdW5jdGlvbiBjcmVhdGVPYnNlcnZhYmxlKHYpIHtcbiAgICBpZiAodiA9PT0gdm9pZCAwKSB7IHYgPSB1bmRlZmluZWQ7IH1cbiAgICBpZiAodHlwZW9mIGFyZ3VtZW50c1sxXSA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgcmV0dXJuIGRlZXBEZWNvcmF0b3IuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICBpbnZhcmlhbnQoYXJndW1lbnRzLmxlbmd0aCA8PSAxLCBnZXRNZXNzYWdlKFwibTAyMVwiKSk7XG4gICAgaW52YXJpYW50KCFpc01vZGlmaWVyRGVzY3JpcHRvcih2KSwgZ2V0TWVzc2FnZShcIm0wMjBcIikpO1xuICAgIGlmIChpc09ic2VydmFibGUodikpXG4gICAgICAgIHJldHVybiB2O1xuICAgIHZhciByZXMgPSBkZWVwRW5oYW5jZXIodiwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuICAgIGlmIChyZXMgIT09IHYpXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgcmV0dXJuIG9ic2VydmFibGUuYm94KHYpO1xufVxudmFyIElPYnNlcnZhYmxlRmFjdG9yaWVzID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBJT2JzZXJ2YWJsZUZhY3RvcmllcygpIHtcbiAgICB9XG4gICAgSU9ic2VydmFibGVGYWN0b3JpZXMucHJvdG90eXBlLmJveCA9IGZ1bmN0aW9uICh2YWx1ZSwgbmFtZSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpXG4gICAgICAgICAgICBpbmNvcnJlY3RseVVzZWRBc0RlY29yYXRvcihcImJveFwiKTtcbiAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlVmFsdWUodmFsdWUsIGRlZXBFbmhhbmNlciwgbmFtZSk7XG4gICAgfTtcbiAgICBJT2JzZXJ2YWJsZUZhY3Rvcmllcy5wcm90b3R5cGUuc2hhbGxvd0JveCA9IGZ1bmN0aW9uICh2YWx1ZSwgbmFtZSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpXG4gICAgICAgICAgICBpbmNvcnJlY3RseVVzZWRBc0RlY29yYXRvcihcInNoYWxsb3dCb3hcIik7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZVZhbHVlKHZhbHVlLCByZWZlcmVuY2VFbmhhbmNlciwgbmFtZSk7XG4gICAgfTtcbiAgICBJT2JzZXJ2YWJsZUZhY3Rvcmllcy5wcm90b3R5cGUuYXJyYXkgPSBmdW5jdGlvbiAoaW5pdGlhbFZhbHVlcywgbmFtZSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpXG4gICAgICAgICAgICBpbmNvcnJlY3RseVVzZWRBc0RlY29yYXRvcihcImFycmF5XCIpO1xuICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGVBcnJheShpbml0aWFsVmFsdWVzLCBkZWVwRW5oYW5jZXIsIG5hbWUpO1xuICAgIH07XG4gICAgSU9ic2VydmFibGVGYWN0b3JpZXMucHJvdG90eXBlLnNoYWxsb3dBcnJheSA9IGZ1bmN0aW9uIChpbml0aWFsVmFsdWVzLCBuYW1lKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMilcbiAgICAgICAgICAgIGluY29ycmVjdGx5VXNlZEFzRGVjb3JhdG9yKFwic2hhbGxvd0FycmF5XCIpO1xuICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGVBcnJheShpbml0aWFsVmFsdWVzLCByZWZlcmVuY2VFbmhhbmNlciwgbmFtZSk7XG4gICAgfTtcbiAgICBJT2JzZXJ2YWJsZUZhY3Rvcmllcy5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gKGluaXRpYWxWYWx1ZXMsIG5hbWUpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKVxuICAgICAgICAgICAgaW5jb3JyZWN0bHlVc2VkQXNEZWNvcmF0b3IoXCJtYXBcIik7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZU1hcChpbml0aWFsVmFsdWVzLCBkZWVwRW5oYW5jZXIsIG5hbWUpO1xuICAgIH07XG4gICAgSU9ic2VydmFibGVGYWN0b3JpZXMucHJvdG90eXBlLnNoYWxsb3dNYXAgPSBmdW5jdGlvbiAoaW5pdGlhbFZhbHVlcywgbmFtZSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpXG4gICAgICAgICAgICBpbmNvcnJlY3RseVVzZWRBc0RlY29yYXRvcihcInNoYWxsb3dNYXBcIik7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZU1hcChpbml0aWFsVmFsdWVzLCByZWZlcmVuY2VFbmhhbmNlciwgbmFtZSk7XG4gICAgfTtcbiAgICBJT2JzZXJ2YWJsZUZhY3Rvcmllcy5wcm90b3R5cGUub2JqZWN0ID0gZnVuY3Rpb24gKHByb3BzLCBuYW1lKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMilcbiAgICAgICAgICAgIGluY29ycmVjdGx5VXNlZEFzRGVjb3JhdG9yKFwib2JqZWN0XCIpO1xuICAgICAgICB2YXIgcmVzID0ge307XG4gICAgICAgIGFzT2JzZXJ2YWJsZU9iamVjdChyZXMsIG5hbWUpO1xuICAgICAgICBleHRlbmRPYnNlcnZhYmxlKHJlcywgcHJvcHMpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgSU9ic2VydmFibGVGYWN0b3JpZXMucHJvdG90eXBlLnNoYWxsb3dPYmplY3QgPSBmdW5jdGlvbiAocHJvcHMsIG5hbWUpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKVxuICAgICAgICAgICAgaW5jb3JyZWN0bHlVc2VkQXNEZWNvcmF0b3IoXCJzaGFsbG93T2JqZWN0XCIpO1xuICAgICAgICB2YXIgcmVzID0ge307XG4gICAgICAgIGFzT2JzZXJ2YWJsZU9iamVjdChyZXMsIG5hbWUpO1xuICAgICAgICBleHRlbmRTaGFsbG93T2JzZXJ2YWJsZShyZXMsIHByb3BzKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9O1xuICAgIElPYnNlcnZhYmxlRmFjdG9yaWVzLnByb3RvdHlwZS5yZWYgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZU1vZGlmaWVyRGVzY3JpcHRvcihyZWZlcmVuY2VFbmhhbmNlciwgYXJndW1lbnRzWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiByZWZEZWNvcmF0b3IuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgSU9ic2VydmFibGVGYWN0b3JpZXMucHJvdG90eXBlLnNoYWxsb3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZU1vZGlmaWVyRGVzY3JpcHRvcihzaGFsbG93RW5oYW5jZXIsIGFyZ3VtZW50c1swXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gc2hhbGxvd0RlY29yYXRvci5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBJT2JzZXJ2YWJsZUZhY3Rvcmllcy5wcm90b3R5cGUuZGVlcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTW9kaWZpZXJEZXNjcmlwdG9yKGRlZXBFbmhhbmNlciwgYXJndW1lbnRzWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkZWVwRGVjb3JhdG9yLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIElPYnNlcnZhYmxlRmFjdG9yaWVzLnByb3RvdHlwZS5zdHJ1Y3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZU1vZGlmaWVyRGVzY3JpcHRvcihkZWVwU3RydWN0RW5oYW5jZXIsIGFyZ3VtZW50c1swXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZGVlcFN0cnVjdERlY29yYXRvci5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gSU9ic2VydmFibGVGYWN0b3JpZXM7XG59KCkpO1xuZXhwb3J0cy5JT2JzZXJ2YWJsZUZhY3RvcmllcyA9IElPYnNlcnZhYmxlRmFjdG9yaWVzO1xudmFyIG9ic2VydmFibGUgPSBjcmVhdGVPYnNlcnZhYmxlO1xuZXhwb3J0cy5vYnNlcnZhYmxlID0gb2JzZXJ2YWJsZTtcbk9iamVjdC5rZXlzKElPYnNlcnZhYmxlRmFjdG9yaWVzLnByb3RvdHlwZSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7IHJldHVybiBvYnNlcnZhYmxlW2tleV0gPSBJT2JzZXJ2YWJsZUZhY3Rvcmllcy5wcm90b3R5cGVba2V5XTsgfSk7XG5vYnNlcnZhYmxlLmRlZXAuc3RydWN0ID0gb2JzZXJ2YWJsZS5zdHJ1Y3Q7XG5vYnNlcnZhYmxlLnJlZi5zdHJ1Y3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVNb2RpZmllckRlc2NyaXB0b3IocmVmU3RydWN0RW5oYW5jZXIsIGFyZ3VtZW50c1swXSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVmU3RydWN0RGVjb3JhdG9yLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgfVxufTtcbmZ1bmN0aW9uIGluY29ycmVjdGx5VXNlZEFzRGVjb3JhdG9yKG1ldGhvZE5hbWUpIHtcbiAgICBmYWlsKFwiRXhwZWN0ZWQgb25lIG9yIHR3byBhcmd1bWVudHMgdG8gb2JzZXJ2YWJsZS5cIiArIG1ldGhvZE5hbWUgKyBcIi4gRGlkIHlvdSBhY2NpZGVudGFsbHkgdHJ5IHRvIHVzZSBvYnNlcnZhYmxlLlwiICsgbWV0aG9kTmFtZSArIFwiIGFzIGRlY29yYXRvcj9cIik7XG59XG5mdW5jdGlvbiBjcmVhdGVEZWNvcmF0b3JGb3JFbmhhbmNlcihlbmhhbmNlcikge1xuICAgIGludmFyaWFudCghIWVuaGFuY2VyLCBcIjooXCIpO1xuICAgIHJldHVybiBjcmVhdGVDbGFzc1Byb3BlcnR5RGVjb3JhdG9yKGZ1bmN0aW9uICh0YXJnZXQsIG5hbWUsIGJhc2VWYWx1ZSwgXywgYmFzZURlc2NyaXB0b3IpIHtcbiAgICAgICAgYXNzZXJ0UHJvcGVydHlDb25maWd1cmFibGUodGFyZ2V0LCBuYW1lKTtcbiAgICAgICAgaW52YXJpYW50KCFiYXNlRGVzY3JpcHRvciB8fCAhYmFzZURlc2NyaXB0b3IuZ2V0LCBnZXRNZXNzYWdlKFwibTAyMlwiKSk7XG4gICAgICAgIHZhciBhZG0gPSBhc09ic2VydmFibGVPYmplY3QodGFyZ2V0LCB1bmRlZmluZWQpO1xuICAgICAgICBkZWZpbmVPYnNlcnZhYmxlUHJvcGVydHkoYWRtLCBuYW1lLCBiYXNlVmFsdWUsIGVuaGFuY2VyKTtcbiAgICB9LCBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICB2YXIgb2JzZXJ2YWJsZSA9IHRoaXMuJG1vYngudmFsdWVzW25hbWVdO1xuICAgICAgICBpZiAob2JzZXJ2YWJsZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIG9ic2VydmFibGUuZ2V0KCk7XG4gICAgfSwgZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIHNldFByb3BlcnR5VmFsdWUodGhpcywgbmFtZSwgdmFsdWUpO1xuICAgIH0sIHRydWUsIGZhbHNlKTtcbn1cbmZ1bmN0aW9uIG9ic2VydmUodGhpbmcsIHByb3BPckNiLCBjYk9yRmlyZSwgZmlyZUltbWVkaWF0ZWx5KSB7XG4gICAgaWYgKHR5cGVvZiBjYk9yRmlyZSA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgICByZXR1cm4gb2JzZXJ2ZU9ic2VydmFibGVQcm9wZXJ0eSh0aGluZywgcHJvcE9yQ2IsIGNiT3JGaXJlLCBmaXJlSW1tZWRpYXRlbHkpO1xuICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIG9ic2VydmVPYnNlcnZhYmxlKHRoaW5nLCBwcm9wT3JDYiwgY2JPckZpcmUpO1xufVxuZXhwb3J0cy5vYnNlcnZlID0gb2JzZXJ2ZTtcbmZ1bmN0aW9uIG9ic2VydmVPYnNlcnZhYmxlKHRoaW5nLCBsaXN0ZW5lciwgZmlyZUltbWVkaWF0ZWx5KSB7XG4gICAgcmV0dXJuIGdldEFkbWluaXN0cmF0aW9uKHRoaW5nKS5vYnNlcnZlKGxpc3RlbmVyLCBmaXJlSW1tZWRpYXRlbHkpO1xufVxuZnVuY3Rpb24gb2JzZXJ2ZU9ic2VydmFibGVQcm9wZXJ0eSh0aGluZywgcHJvcGVydHksIGxpc3RlbmVyLCBmaXJlSW1tZWRpYXRlbHkpIHtcbiAgICByZXR1cm4gZ2V0QWRtaW5pc3RyYXRpb24odGhpbmcsIHByb3BlcnR5KS5vYnNlcnZlKGxpc3RlbmVyLCBmaXJlSW1tZWRpYXRlbHkpO1xufVxuZnVuY3Rpb24gdG9KUyhzb3VyY2UsIGRldGVjdEN5Y2xlcywgX19hbHJlYWR5U2Vlbikge1xuICAgIGlmIChkZXRlY3RDeWNsZXMgPT09IHZvaWQgMCkgeyBkZXRlY3RDeWNsZXMgPSB0cnVlOyB9XG4gICAgaWYgKF9fYWxyZWFkeVNlZW4gPT09IHZvaWQgMCkgeyBfX2FscmVhZHlTZWVuID0gW107IH1cbiAgICBmdW5jdGlvbiBjYWNoZSh2YWx1ZSkge1xuICAgICAgICBpZiAoZGV0ZWN0Q3ljbGVzKVxuICAgICAgICAgICAgX19hbHJlYWR5U2Vlbi5wdXNoKFtzb3VyY2UsIHZhbHVlXSk7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgaWYgKGlzT2JzZXJ2YWJsZShzb3VyY2UpKSB7XG4gICAgICAgIGlmIChkZXRlY3RDeWNsZXMgJiYgX19hbHJlYWR5U2VlbiA9PT0gbnVsbClcbiAgICAgICAgICAgIF9fYWxyZWFkeVNlZW4gPSBbXTtcbiAgICAgICAgaWYgKGRldGVjdEN5Y2xlcyAmJiBzb3VyY2UgIT09IG51bGwgJiYgdHlwZW9mIHNvdXJjZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBfX2FscmVhZHlTZWVuLmxlbmd0aDsgaSA8IGw7IGkrKylcbiAgICAgICAgICAgICAgICBpZiAoX19hbHJlYWR5U2VlbltpXVswXSA9PT0gc291cmNlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX19hbHJlYWR5U2VlbltpXVsxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNPYnNlcnZhYmxlQXJyYXkoc291cmNlKSkge1xuICAgICAgICAgICAgdmFyIHJlcyA9IGNhY2hlKFtdKTtcbiAgICAgICAgICAgIHZhciB0b0FkZCA9IHNvdXJjZS5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7IHJldHVybiB0b0pTKHZhbHVlLCBkZXRlY3RDeWNsZXMsIF9fYWxyZWFkeVNlZW4pOyB9KTtcbiAgICAgICAgICAgIHJlcy5sZW5ndGggPSB0b0FkZC5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRvQWRkLmxlbmd0aDsgaSA8IGw7IGkrKylcbiAgICAgICAgICAgICAgICByZXNbaV0gPSB0b0FkZFtpXTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzT2JzZXJ2YWJsZU9iamVjdChzb3VyY2UpKSB7XG4gICAgICAgICAgICB2YXIgcmVzID0gY2FjaGUoe30pO1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSlcbiAgICAgICAgICAgICAgICByZXNba2V5XSA9IHRvSlMoc291cmNlW2tleV0sIGRldGVjdEN5Y2xlcywgX19hbHJlYWR5U2Vlbik7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc09ic2VydmFibGVNYXAoc291cmNlKSkge1xuICAgICAgICAgICAgdmFyIHJlc18xID0gY2FjaGUoe30pO1xuICAgICAgICAgICAgc291cmNlLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHsgcmV0dXJuIHJlc18xW2tleV0gPSB0b0pTKHZhbHVlLCBkZXRlY3RDeWNsZXMsIF9fYWxyZWFkeVNlZW4pOyB9KTtcbiAgICAgICAgICAgIHJldHVybiByZXNfMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNPYnNlcnZhYmxlVmFsdWUoc291cmNlKSlcbiAgICAgICAgICAgIHJldHVybiB0b0pTKHNvdXJjZS5nZXQoKSwgZGV0ZWN0Q3ljbGVzLCBfX2FscmVhZHlTZWVuKTtcbiAgICB9XG4gICAgcmV0dXJuIHNvdXJjZTtcbn1cbmV4cG9ydHMudG9KUyA9IHRvSlM7XG5mdW5jdGlvbiB0cmFuc2FjdGlvbihhY3Rpb24sIHRoaXNBcmcpIHtcbiAgICBpZiAodGhpc0FyZyA9PT0gdm9pZCAwKSB7IHRoaXNBcmcgPSB1bmRlZmluZWQ7IH1cbiAgICBkZXByZWNhdGVkKGdldE1lc3NhZ2UoXCJtMDIzXCIpKTtcbiAgICByZXR1cm4gcnVuSW5UcmFuc2FjdGlvbi5hcHBseSh1bmRlZmluZWQsIGFyZ3VtZW50cyk7XG59XG5leHBvcnRzLnRyYW5zYWN0aW9uID0gdHJhbnNhY3Rpb247XG5mdW5jdGlvbiBydW5JblRyYW5zYWN0aW9uKGFjdGlvbiwgdGhpc0FyZykge1xuICAgIGlmICh0aGlzQXJnID09PSB2b2lkIDApIHsgdGhpc0FyZyA9IHVuZGVmaW5lZDsgfVxuICAgIHJldHVybiBleGVjdXRlQWN0aW9uKFwiXCIsIGFjdGlvbik7XG59XG5mdW5jdGlvbiBsb2cobXNnKSB7XG4gICAgY29uc29sZS5sb2cobXNnKTtcbiAgICByZXR1cm4gbXNnO1xufVxuZnVuY3Rpb24gd2h5UnVuKHRoaW5nLCBwcm9wKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHRoaW5nID0gZ2xvYmFsU3RhdGUudHJhY2tpbmdEZXJpdmF0aW9uO1xuICAgICAgICAgICAgaWYgKCF0aGluZylcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9nKGdldE1lc3NhZ2UoXCJtMDI0XCIpKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICB0aGluZyA9IGdldEF0b20odGhpbmcsIHByb3ApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHRoaW5nID0gZ2V0QXRvbSh0aGluZyk7XG4gICAgaWYgKGlzQ29tcHV0ZWRWYWx1ZSh0aGluZykpXG4gICAgICAgIHJldHVybiBsb2codGhpbmcud2h5UnVuKCkpO1xuICAgIGVsc2UgaWYgKGlzUmVhY3Rpb24odGhpbmcpKVxuICAgICAgICByZXR1cm4gbG9nKHRoaW5nLndoeVJ1bigpKTtcbiAgICByZXR1cm4gZmFpbChnZXRNZXNzYWdlKFwibTAyNVwiKSk7XG59XG5leHBvcnRzLndoeVJ1biA9IHdoeVJ1bjtcbmZ1bmN0aW9uIGNyZWF0ZUFjdGlvbihhY3Rpb25OYW1lLCBmbikge1xuICAgIGludmFyaWFudCh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIiwgZ2V0TWVzc2FnZShcIm0wMjZcIikpO1xuICAgIGludmFyaWFudCh0eXBlb2YgYWN0aW9uTmFtZSA9PT0gXCJzdHJpbmdcIiAmJiBhY3Rpb25OYW1lLmxlbmd0aCA+IDAsIFwiYWN0aW9ucyBzaG91bGQgaGF2ZSB2YWxpZCBuYW1lcywgZ290OiAnXCIgKyBhY3Rpb25OYW1lICsgXCInXCIpO1xuICAgIHZhciByZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBleGVjdXRlQWN0aW9uKGFjdGlvbk5hbWUsIGZuLCB0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgcmVzLm9yaWdpbmFsRm4gPSBmbjtcbiAgICByZXMuaXNNb2J4QWN0aW9uID0gdHJ1ZTtcbiAgICByZXR1cm4gcmVzO1xufVxuZnVuY3Rpb24gZXhlY3V0ZUFjdGlvbihhY3Rpb25OYW1lLCBmbiwgc2NvcGUsIGFyZ3MpIHtcbiAgICB2YXIgcnVuSW5mbyA9IHN0YXJ0QWN0aW9uKGFjdGlvbk5hbWUsIGZuLCBzY29wZSwgYXJncyk7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHNjb3BlLCBhcmdzKTtcbiAgICB9XG4gICAgZmluYWxseSB7XG4gICAgICAgIGVuZEFjdGlvbihydW5JbmZvKTtcbiAgICB9XG59XG5mdW5jdGlvbiBzdGFydEFjdGlvbihhY3Rpb25OYW1lLCBmbiwgc2NvcGUsIGFyZ3MpIHtcbiAgICB2YXIgbm90aWZ5U3B5ID0gaXNTcHlFbmFibGVkKCkgJiYgISFhY3Rpb25OYW1lO1xuICAgIHZhciBzdGFydFRpbWUgPSAwO1xuICAgIGlmIChub3RpZnlTcHkpIHtcbiAgICAgICAgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdmFyIGwgPSAoYXJncyAmJiBhcmdzLmxlbmd0aCkgfHwgMDtcbiAgICAgICAgdmFyIGZsYXR0ZW5kQXJncyA9IG5ldyBBcnJheShsKTtcbiAgICAgICAgaWYgKGwgPiAwKVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspXG4gICAgICAgICAgICAgICAgZmxhdHRlbmRBcmdzW2ldID0gYXJnc1tpXTtcbiAgICAgICAgc3B5UmVwb3J0U3RhcnQoe1xuICAgICAgICAgICAgdHlwZTogXCJhY3Rpb25cIixcbiAgICAgICAgICAgIG5hbWU6IGFjdGlvbk5hbWUsXG4gICAgICAgICAgICBmbjogZm4sXG4gICAgICAgICAgICBvYmplY3Q6IHNjb3BlLFxuICAgICAgICAgICAgYXJndW1lbnRzOiBmbGF0dGVuZEFyZ3NcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHZhciBwcmV2RGVyaXZhdGlvbiA9IHVudHJhY2tlZFN0YXJ0KCk7XG4gICAgc3RhcnRCYXRjaCgpO1xuICAgIHZhciBwcmV2QWxsb3dTdGF0ZUNoYW5nZXMgPSBhbGxvd1N0YXRlQ2hhbmdlc1N0YXJ0KHRydWUpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHByZXZEZXJpdmF0aW9uOiBwcmV2RGVyaXZhdGlvbixcbiAgICAgICAgcHJldkFsbG93U3RhdGVDaGFuZ2VzOiBwcmV2QWxsb3dTdGF0ZUNoYW5nZXMsXG4gICAgICAgIG5vdGlmeVNweTogbm90aWZ5U3B5LFxuICAgICAgICBzdGFydFRpbWU6IHN0YXJ0VGltZVxuICAgIH07XG59XG5mdW5jdGlvbiBlbmRBY3Rpb24ocnVuSW5mbykge1xuICAgIGFsbG93U3RhdGVDaGFuZ2VzRW5kKHJ1bkluZm8ucHJldkFsbG93U3RhdGVDaGFuZ2VzKTtcbiAgICBlbmRCYXRjaCgpO1xuICAgIHVudHJhY2tlZEVuZChydW5JbmZvLnByZXZEZXJpdmF0aW9uKTtcbiAgICBpZiAocnVuSW5mby5ub3RpZnlTcHkpXG4gICAgICAgIHNweVJlcG9ydEVuZCh7IHRpbWU6IERhdGUubm93KCkgLSBydW5JbmZvLnN0YXJ0VGltZSB9KTtcbn1cbmZ1bmN0aW9uIHVzZVN0cmljdChzdHJpY3QpIHtcbiAgICBpbnZhcmlhbnQoZ2xvYmFsU3RhdGUudHJhY2tpbmdEZXJpdmF0aW9uID09PSBudWxsLCBnZXRNZXNzYWdlKFwibTAyOFwiKSk7XG4gICAgZ2xvYmFsU3RhdGUuc3RyaWN0TW9kZSA9IHN0cmljdDtcbiAgICBnbG9iYWxTdGF0ZS5hbGxvd1N0YXRlQ2hhbmdlcyA9ICFzdHJpY3Q7XG59XG5leHBvcnRzLnVzZVN0cmljdCA9IHVzZVN0cmljdDtcbmZ1bmN0aW9uIGlzU3RyaWN0TW9kZUVuYWJsZWQoKSB7XG4gICAgcmV0dXJuIGdsb2JhbFN0YXRlLnN0cmljdE1vZGU7XG59XG5leHBvcnRzLmlzU3RyaWN0TW9kZUVuYWJsZWQgPSBpc1N0cmljdE1vZGVFbmFibGVkO1xuZnVuY3Rpb24gYWxsb3dTdGF0ZUNoYW5nZXMoYWxsb3dTdGF0ZUNoYW5nZXMsIGZ1bmMpIHtcbiAgICB2YXIgcHJldiA9IGFsbG93U3RhdGVDaGFuZ2VzU3RhcnQoYWxsb3dTdGF0ZUNoYW5nZXMpO1xuICAgIHZhciByZXM7XG4gICAgdHJ5IHtcbiAgICAgICAgcmVzID0gZnVuYygpO1xuICAgIH1cbiAgICBmaW5hbGx5IHtcbiAgICAgICAgYWxsb3dTdGF0ZUNoYW5nZXNFbmQocHJldik7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5mdW5jdGlvbiBhbGxvd1N0YXRlQ2hhbmdlc1N0YXJ0KGFsbG93U3RhdGVDaGFuZ2VzKSB7XG4gICAgdmFyIHByZXYgPSBnbG9iYWxTdGF0ZS5hbGxvd1N0YXRlQ2hhbmdlcztcbiAgICBnbG9iYWxTdGF0ZS5hbGxvd1N0YXRlQ2hhbmdlcyA9IGFsbG93U3RhdGVDaGFuZ2VzO1xuICAgIHJldHVybiBwcmV2O1xufVxuZnVuY3Rpb24gYWxsb3dTdGF0ZUNoYW5nZXNFbmQocHJldikge1xuICAgIGdsb2JhbFN0YXRlLmFsbG93U3RhdGVDaGFuZ2VzID0gcHJldjtcbn1cbnZhciBCYXNlQXRvbSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQmFzZUF0b20obmFtZSkge1xuICAgICAgICBpZiAobmFtZSA9PT0gdm9pZCAwKSB7IG5hbWUgPSBcIkF0b21AXCIgKyBnZXROZXh0SWQoKTsgfVxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLmlzUGVuZGluZ1Vub2JzZXJ2YXRpb24gPSB0cnVlO1xuICAgICAgICB0aGlzLm9ic2VydmVycyA9IFtdO1xuICAgICAgICB0aGlzLm9ic2VydmVyc0luZGV4ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5kaWZmVmFsdWUgPSAwO1xuICAgICAgICB0aGlzLmxhc3RBY2Nlc3NlZEJ5ID0gMDtcbiAgICAgICAgdGhpcy5sb3dlc3RPYnNlcnZlclN0YXRlID0gSURlcml2YXRpb25TdGF0ZS5OT1RfVFJBQ0tJTkc7XG4gICAgfVxuICAgIEJhc2VBdG9tLnByb3RvdHlwZS5vbkJlY29tZVVub2JzZXJ2ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgfTtcbiAgICBCYXNlQXRvbS5wcm90b3R5cGUucmVwb3J0T2JzZXJ2ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlcG9ydE9ic2VydmVkKHRoaXMpO1xuICAgIH07XG4gICAgQmFzZUF0b20ucHJvdG90eXBlLnJlcG9ydENoYW5nZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHN0YXJ0QmF0Y2goKTtcbiAgICAgICAgcHJvcGFnYXRlQ2hhbmdlZCh0aGlzKTtcbiAgICAgICAgZW5kQmF0Y2goKTtcbiAgICB9O1xuICAgIEJhc2VBdG9tLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmFtZTtcbiAgICB9O1xuICAgIHJldHVybiBCYXNlQXRvbTtcbn0oKSk7XG5leHBvcnRzLkJhc2VBdG9tID0gQmFzZUF0b207XG52YXIgQXRvbSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKEF0b20sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQXRvbShuYW1lLCBvbkJlY29tZU9ic2VydmVkSGFuZGxlciwgb25CZWNvbWVVbm9ic2VydmVkSGFuZGxlcikge1xuICAgICAgICBpZiAobmFtZSA9PT0gdm9pZCAwKSB7IG5hbWUgPSBcIkF0b21AXCIgKyBnZXROZXh0SWQoKTsgfVxuICAgICAgICBpZiAob25CZWNvbWVPYnNlcnZlZEhhbmRsZXIgPT09IHZvaWQgMCkgeyBvbkJlY29tZU9ic2VydmVkSGFuZGxlciA9IG5vb3A7IH1cbiAgICAgICAgaWYgKG9uQmVjb21lVW5vYnNlcnZlZEhhbmRsZXIgPT09IHZvaWQgMCkgeyBvbkJlY29tZVVub2JzZXJ2ZWRIYW5kbGVyID0gbm9vcDsgfVxuICAgICAgICB2YXIgX3RoaXMgPSBfc3VwZXIuY2FsbCh0aGlzLCBuYW1lKSB8fCB0aGlzO1xuICAgICAgICBfdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgX3RoaXMub25CZWNvbWVPYnNlcnZlZEhhbmRsZXIgPSBvbkJlY29tZU9ic2VydmVkSGFuZGxlcjtcbiAgICAgICAgX3RoaXMub25CZWNvbWVVbm9ic2VydmVkSGFuZGxlciA9IG9uQmVjb21lVW5vYnNlcnZlZEhhbmRsZXI7XG4gICAgICAgIF90aGlzLmlzUGVuZGluZ1Vub2JzZXJ2YXRpb24gPSBmYWxzZTtcbiAgICAgICAgX3RoaXMuaXNCZWluZ1RyYWNrZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIF90aGlzO1xuICAgIH1cbiAgICBBdG9tLnByb3RvdHlwZS5yZXBvcnRPYnNlcnZlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3RhcnRCYXRjaCgpO1xuICAgICAgICBfc3VwZXIucHJvdG90eXBlLnJlcG9ydE9ic2VydmVkLmNhbGwodGhpcyk7XG4gICAgICAgIGlmICghdGhpcy5pc0JlaW5nVHJhY2tlZCkge1xuICAgICAgICAgICAgdGhpcy5pc0JlaW5nVHJhY2tlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLm9uQmVjb21lT2JzZXJ2ZWRIYW5kbGVyKCk7XG4gICAgICAgIH1cbiAgICAgICAgZW5kQmF0Y2goKTtcbiAgICAgICAgcmV0dXJuICEhZ2xvYmFsU3RhdGUudHJhY2tpbmdEZXJpdmF0aW9uO1xuICAgIH07XG4gICAgQXRvbS5wcm90b3R5cGUub25CZWNvbWVVbm9ic2VydmVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmlzQmVpbmdUcmFja2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMub25CZWNvbWVVbm9ic2VydmVkSGFuZGxlcigpO1xuICAgIH07XG4gICAgcmV0dXJuIEF0b207XG59KEJhc2VBdG9tKSk7XG5leHBvcnRzLkF0b20gPSBBdG9tO1xudmFyIGlzQXRvbSA9IGNyZWF0ZUluc3RhbmNlb2ZQcmVkaWNhdGUoXCJBdG9tXCIsIEJhc2VBdG9tKTtcbnZhciBDb21wdXRlZFZhbHVlID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDb21wdXRlZFZhbHVlKGRlcml2YXRpb24sIHNjb3BlLCBjb21wYXJlU3RydWN0dXJhbCwgbmFtZSwgc2V0dGVyKSB7XG4gICAgICAgIHRoaXMuZGVyaXZhdGlvbiA9IGRlcml2YXRpb247XG4gICAgICAgIHRoaXMuc2NvcGUgPSBzY29wZTtcbiAgICAgICAgdGhpcy5jb21wYXJlU3RydWN0dXJhbCA9IGNvbXBhcmVTdHJ1Y3R1cmFsO1xuICAgICAgICB0aGlzLmRlcGVuZGVuY2llc1N0YXRlID0gSURlcml2YXRpb25TdGF0ZS5OT1RfVFJBQ0tJTkc7XG4gICAgICAgIHRoaXMub2JzZXJ2aW5nID0gW107XG4gICAgICAgIHRoaXMubmV3T2JzZXJ2aW5nID0gbnVsbDtcbiAgICAgICAgdGhpcy5pc1BlbmRpbmdVbm9ic2VydmF0aW9uID0gZmFsc2U7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzID0gW107XG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzSW5kZXhlcyA9IHt9O1xuICAgICAgICB0aGlzLmRpZmZWYWx1ZSA9IDA7XG4gICAgICAgIHRoaXMucnVuSWQgPSAwO1xuICAgICAgICB0aGlzLmxhc3RBY2Nlc3NlZEJ5ID0gMDtcbiAgICAgICAgdGhpcy5sb3dlc3RPYnNlcnZlclN0YXRlID0gSURlcml2YXRpb25TdGF0ZS5VUF9UT19EQVRFO1xuICAgICAgICB0aGlzLnVuYm91bmREZXBzQ291bnQgPSAwO1xuICAgICAgICB0aGlzLl9fbWFwaWQgPSBcIiNcIiArIGdldE5leHRJZCgpO1xuICAgICAgICB0aGlzLnZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmlzQ29tcHV0aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXNSdW5uaW5nU2V0dGVyID0gZmFsc2U7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWUgfHwgXCJDb21wdXRlZFZhbHVlQFwiICsgZ2V0TmV4dElkKCk7XG4gICAgICAgIGlmIChzZXR0ZXIpXG4gICAgICAgICAgICB0aGlzLnNldHRlciA9IGNyZWF0ZUFjdGlvbihuYW1lICsgXCItc2V0dGVyXCIsIHNldHRlcik7XG4gICAgfVxuICAgIENvbXB1dGVkVmFsdWUucHJvdG90eXBlLm9uQmVjb21lU3RhbGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHByb3BhZ2F0ZU1heWJlQ2hhbmdlZCh0aGlzKTtcbiAgICB9O1xuICAgIENvbXB1dGVkVmFsdWUucHJvdG90eXBlLm9uQmVjb21lVW5vYnNlcnZlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2xlYXJPYnNlcnZpbmcodGhpcyk7XG4gICAgICAgIHRoaXMudmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgfTtcbiAgICBDb21wdXRlZFZhbHVlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGludmFyaWFudCghdGhpcy5pc0NvbXB1dGluZywgXCJDeWNsZSBkZXRlY3RlZCBpbiBjb21wdXRhdGlvbiBcIiArIHRoaXMubmFtZSwgdGhpcy5kZXJpdmF0aW9uKTtcbiAgICAgICAgaWYgKGdsb2JhbFN0YXRlLmluQmF0Y2ggPT09IDApIHtcbiAgICAgICAgICAgIHN0YXJ0QmF0Y2goKTtcbiAgICAgICAgICAgIGlmIChzaG91bGRDb21wdXRlKHRoaXMpKVxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSB0aGlzLmNvbXB1dGVWYWx1ZShmYWxzZSk7XG4gICAgICAgICAgICBlbmRCYXRjaCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVwb3J0T2JzZXJ2ZWQodGhpcyk7XG4gICAgICAgICAgICBpZiAoc2hvdWxkQ29tcHV0ZSh0aGlzKSlcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50cmFja0FuZENvbXB1dGUoKSlcbiAgICAgICAgICAgICAgICAgICAgcHJvcGFnYXRlQ2hhbmdlQ29uZmlybWVkKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXN1bHQgPSB0aGlzLnZhbHVlO1xuICAgICAgICBpZiAoaXNDYXVnaHRFeGNlcHRpb24ocmVzdWx0KSlcbiAgICAgICAgICAgIHRocm93IHJlc3VsdC5jYXVzZTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICAgIENvbXB1dGVkVmFsdWUucHJvdG90eXBlLnBlZWsgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZXMgPSB0aGlzLmNvbXB1dGVWYWx1ZShmYWxzZSk7XG4gICAgICAgIGlmIChpc0NhdWdodEV4Y2VwdGlvbihyZXMpKVxuICAgICAgICAgICAgdGhyb3cgcmVzLmNhdXNlO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgQ29tcHV0ZWRWYWx1ZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmICh0aGlzLnNldHRlcikge1xuICAgICAgICAgICAgaW52YXJpYW50KCF0aGlzLmlzUnVubmluZ1NldHRlciwgXCJUaGUgc2V0dGVyIG9mIGNvbXB1dGVkIHZhbHVlICdcIiArIHRoaXMubmFtZSArIFwiJyBpcyB0cnlpbmcgdG8gdXBkYXRlIGl0c2VsZi4gRGlkIHlvdSBpbnRlbmQgdG8gdXBkYXRlIGFuIF9vYnNlcnZhYmxlXyB2YWx1ZSwgaW5zdGVhZCBvZiB0aGUgY29tcHV0ZWQgcHJvcGVydHk/XCIpO1xuICAgICAgICAgICAgdGhpcy5pc1J1bm5pbmdTZXR0ZXIgPSB0cnVlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRlci5jYWxsKHRoaXMuc2NvcGUsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNSdW5uaW5nU2V0dGVyID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgaW52YXJpYW50KGZhbHNlLCBcIltDb21wdXRlZFZhbHVlICdcIiArIHRoaXMubmFtZSArIFwiJ10gSXQgaXMgbm90IHBvc3NpYmxlIHRvIGFzc2lnbiBhIG5ldyB2YWx1ZSB0byBhIGNvbXB1dGVkIHZhbHVlLlwiKTtcbiAgICB9O1xuICAgIENvbXB1dGVkVmFsdWUucHJvdG90eXBlLnRyYWNrQW5kQ29tcHV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGlzU3B5RW5hYmxlZCgpKSB7XG4gICAgICAgICAgICBzcHlSZXBvcnQoe1xuICAgICAgICAgICAgICAgIG9iamVjdDogdGhpcy5zY29wZSxcbiAgICAgICAgICAgICAgICB0eXBlOiBcImNvbXB1dGVcIixcbiAgICAgICAgICAgICAgICBmbjogdGhpcy5kZXJpdmF0aW9uXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgb2xkVmFsdWUgPSB0aGlzLnZhbHVlO1xuICAgICAgICB2YXIgbmV3VmFsdWUgPSB0aGlzLnZhbHVlID0gdGhpcy5jb21wdXRlVmFsdWUodHJ1ZSk7XG4gICAgICAgIHJldHVybiBpc0NhdWdodEV4Y2VwdGlvbihuZXdWYWx1ZSkgfHwgdmFsdWVEaWRDaGFuZ2UodGhpcy5jb21wYXJlU3RydWN0dXJhbCwgbmV3VmFsdWUsIG9sZFZhbHVlKTtcbiAgICB9O1xuICAgIENvbXB1dGVkVmFsdWUucHJvdG90eXBlLmNvbXB1dGVWYWx1ZSA9IGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICB0aGlzLmlzQ29tcHV0aW5nID0gdHJ1ZTtcbiAgICAgICAgZ2xvYmFsU3RhdGUuY29tcHV0YXRpb25EZXB0aCsrO1xuICAgICAgICB2YXIgcmVzO1xuICAgICAgICBpZiAodHJhY2spIHtcbiAgICAgICAgICAgIHJlcyA9IHRyYWNrRGVyaXZlZEZ1bmN0aW9uKHRoaXMsIHRoaXMuZGVyaXZhdGlvbiwgdGhpcy5zY29wZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJlcyA9IHRoaXMuZGVyaXZhdGlvbi5jYWxsKHRoaXMuc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICByZXMgPSBuZXcgQ2F1Z2h0RXhjZXB0aW9uKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGdsb2JhbFN0YXRlLmNvbXB1dGF0aW9uRGVwdGgtLTtcbiAgICAgICAgdGhpcy5pc0NvbXB1dGluZyA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgO1xuICAgIENvbXB1dGVkVmFsdWUucHJvdG90eXBlLm9ic2VydmUgPSBmdW5jdGlvbiAobGlzdGVuZXIsIGZpcmVJbW1lZGlhdGVseSkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB2YXIgZmlyc3RUaW1lID0gdHJ1ZTtcbiAgICAgICAgdmFyIHByZXZWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIGF1dG9ydW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG5ld1ZhbHVlID0gX3RoaXMuZ2V0KCk7XG4gICAgICAgICAgICBpZiAoIWZpcnN0VGltZSB8fCBmaXJlSW1tZWRpYXRlbHkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJldlUgPSB1bnRyYWNrZWRTdGFydCgpO1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyKHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJ1cGRhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBfdGhpcyxcbiAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWU6IG5ld1ZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBvbGRWYWx1ZTogcHJldlZhbHVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdW50cmFja2VkRW5kKHByZXZVKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpcnN0VGltZSA9IGZhbHNlO1xuICAgICAgICAgICAgcHJldlZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgQ29tcHV0ZWRWYWx1ZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXQoKTtcbiAgICB9O1xuICAgIENvbXB1dGVkVmFsdWUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5uYW1lICsgXCJbXCIgKyB0aGlzLmRlcml2YXRpb24udG9TdHJpbmcoKSArIFwiXVwiO1xuICAgIH07XG4gICAgQ29tcHV0ZWRWYWx1ZS5wcm90b3R5cGUudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRvUHJpbWl0aXZlKHRoaXMuZ2V0KCkpO1xuICAgIH07XG4gICAgO1xuICAgIENvbXB1dGVkVmFsdWUucHJvdG90eXBlLndoeVJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGlzVHJhY2tpbmcgPSBCb29sZWFuKGdsb2JhbFN0YXRlLnRyYWNraW5nRGVyaXZhdGlvbik7XG4gICAgICAgIHZhciBvYnNlcnZpbmcgPSB1bmlxdWUodGhpcy5pc0NvbXB1dGluZyA/IHRoaXMubmV3T2JzZXJ2aW5nIDogdGhpcy5vYnNlcnZpbmcpLm1hcChmdW5jdGlvbiAoZGVwKSB7IHJldHVybiBkZXAubmFtZTsgfSk7XG4gICAgICAgIHZhciBvYnNlcnZlcnMgPSB1bmlxdWUoZ2V0T2JzZXJ2ZXJzKHRoaXMpLm1hcChmdW5jdGlvbiAoZGVwKSB7IHJldHVybiBkZXAubmFtZTsgfSkpO1xuICAgICAgICByZXR1cm4gKFwiXFxuV2h5UnVuPyBjb21wdXRhdGlvbiAnXCIgKyB0aGlzLm5hbWUgKyBcIic6XFxuICogUnVubmluZyBiZWNhdXNlOiBcIiArIChpc1RyYWNraW5nID8gXCJbYWN0aXZlXSB0aGUgdmFsdWUgb2YgdGhpcyBjb21wdXRhdGlvbiBpcyBuZWVkZWQgYnkgYSByZWFjdGlvblwiIDogdGhpcy5pc0NvbXB1dGluZyA/IFwiW2dldF0gVGhlIHZhbHVlIG9mIHRoaXMgY29tcHV0ZWQgd2FzIHJlcXVlc3RlZCBvdXRzaWRlIGEgcmVhY3Rpb25cIiA6IFwiW2lkbGVdIG5vdCBydW5uaW5nIGF0IHRoZSBtb21lbnRcIikgKyBcIlxcblwiICtcbiAgICAgICAgICAgICh0aGlzLmRlcGVuZGVuY2llc1N0YXRlID09PSBJRGVyaXZhdGlvblN0YXRlLk5PVF9UUkFDS0lORyA/IGdldE1lc3NhZ2UoXCJtMDMyXCIpIDpcbiAgICAgICAgICAgICAgICBcIiAqIFRoaXMgY29tcHV0YXRpb24gd2lsbCByZS1ydW4gaWYgYW55IG9mIHRoZSBmb2xsb3dpbmcgb2JzZXJ2YWJsZXMgY2hhbmdlczpcXG4gICAgXCIgKyBqb2luU3RyaW5ncyhvYnNlcnZpbmcpICsgXCJcXG4gICAgXCIgKyAoKHRoaXMuaXNDb21wdXRpbmcgJiYgaXNUcmFja2luZykgPyBcIiAoLi4uIG9yIGFueSBvYnNlcnZhYmxlIGFjY2Vzc2VkIGR1cmluZyB0aGUgcmVtYWluZGVyIG9mIHRoZSBjdXJyZW50IHJ1bilcIiA6IFwiXCIpICsgXCJcXG5cXHRcIiArIGdldE1lc3NhZ2UoXCJtMDM4XCIpICsgXCJcXG5cXG4gICogSWYgdGhlIG91dGNvbWUgb2YgdGhpcyBjb21wdXRhdGlvbiBjaGFuZ2VzLCB0aGUgZm9sbG93aW5nIG9ic2VydmVycyB3aWxsIGJlIHJlLXJ1bjpcXG4gICAgXCIgKyBqb2luU3RyaW5ncyhvYnNlcnZlcnMpICsgXCJcXG5cIikpO1xuICAgIH07XG4gICAgcmV0dXJuIENvbXB1dGVkVmFsdWU7XG59KCkpO1xuQ29tcHV0ZWRWYWx1ZS5wcm90b3R5cGVbcHJpbWl0aXZlU3ltYm9sKCldID0gQ29tcHV0ZWRWYWx1ZS5wcm90b3R5cGUudmFsdWVPZjtcbnZhciBpc0NvbXB1dGVkVmFsdWUgPSBjcmVhdGVJbnN0YW5jZW9mUHJlZGljYXRlKFwiQ29tcHV0ZWRWYWx1ZVwiLCBDb21wdXRlZFZhbHVlKTtcbnZhciBJRGVyaXZhdGlvblN0YXRlO1xuKGZ1bmN0aW9uIChJRGVyaXZhdGlvblN0YXRlKSB7XG4gICAgSURlcml2YXRpb25TdGF0ZVtJRGVyaXZhdGlvblN0YXRlW1wiTk9UX1RSQUNLSU5HXCJdID0gLTFdID0gXCJOT1RfVFJBQ0tJTkdcIjtcbiAgICBJRGVyaXZhdGlvblN0YXRlW0lEZXJpdmF0aW9uU3RhdGVbXCJVUF9UT19EQVRFXCJdID0gMF0gPSBcIlVQX1RPX0RBVEVcIjtcbiAgICBJRGVyaXZhdGlvblN0YXRlW0lEZXJpdmF0aW9uU3RhdGVbXCJQT1NTSUJMWV9TVEFMRVwiXSA9IDFdID0gXCJQT1NTSUJMWV9TVEFMRVwiO1xuICAgIElEZXJpdmF0aW9uU3RhdGVbSURlcml2YXRpb25TdGF0ZVtcIlNUQUxFXCJdID0gMl0gPSBcIlNUQUxFXCI7XG59KShJRGVyaXZhdGlvblN0YXRlIHx8IChJRGVyaXZhdGlvblN0YXRlID0ge30pKTtcbmV4cG9ydHMuSURlcml2YXRpb25TdGF0ZSA9IElEZXJpdmF0aW9uU3RhdGU7XG52YXIgQ2F1Z2h0RXhjZXB0aW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDYXVnaHRFeGNlcHRpb24oY2F1c2UpIHtcbiAgICAgICAgdGhpcy5jYXVzZSA9IGNhdXNlO1xuICAgIH1cbiAgICByZXR1cm4gQ2F1Z2h0RXhjZXB0aW9uO1xufSgpKTtcbmZ1bmN0aW9uIGlzQ2F1Z2h0RXhjZXB0aW9uKGUpIHtcbiAgICByZXR1cm4gZSBpbnN0YW5jZW9mIENhdWdodEV4Y2VwdGlvbjtcbn1cbmZ1bmN0aW9uIHNob3VsZENvbXB1dGUoZGVyaXZhdGlvbikge1xuICAgIHN3aXRjaCAoZGVyaXZhdGlvbi5kZXBlbmRlbmNpZXNTdGF0ZSkge1xuICAgICAgICBjYXNlIElEZXJpdmF0aW9uU3RhdGUuVVBfVE9fREFURTogcmV0dXJuIGZhbHNlO1xuICAgICAgICBjYXNlIElEZXJpdmF0aW9uU3RhdGUuTk9UX1RSQUNLSU5HOlxuICAgICAgICBjYXNlIElEZXJpdmF0aW9uU3RhdGUuU1RBTEU6IHJldHVybiB0cnVlO1xuICAgICAgICBjYXNlIElEZXJpdmF0aW9uU3RhdGUuUE9TU0lCTFlfU1RBTEU6IHtcbiAgICAgICAgICAgIHZhciBwcmV2VW50cmFja2VkID0gdW50cmFja2VkU3RhcnQoKTtcbiAgICAgICAgICAgIHZhciBvYnMgPSBkZXJpdmF0aW9uLm9ic2VydmluZywgbCA9IG9icy5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBvYmogPSBvYnNbaV07XG4gICAgICAgICAgICAgICAgaWYgKGlzQ29tcHV0ZWRWYWx1ZShvYmopKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYmouZ2V0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVudHJhY2tlZEVuZChwcmV2VW50cmFja2VkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXJpdmF0aW9uLmRlcGVuZGVuY2llc1N0YXRlID09PSBJRGVyaXZhdGlvblN0YXRlLlNUQUxFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1bnRyYWNrZWRFbmQocHJldlVudHJhY2tlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNoYW5nZURlcGVuZGVuY2llc1N0YXRlVG8wKGRlcml2YXRpb24pO1xuICAgICAgICAgICAgdW50cmFja2VkRW5kKHByZXZVbnRyYWNrZWQpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gaXNDb21wdXRpbmdEZXJpdmF0aW9uKCkge1xuICAgIHJldHVybiBnbG9iYWxTdGF0ZS50cmFja2luZ0Rlcml2YXRpb24gIT09IG51bGw7XG59XG5mdW5jdGlvbiBjaGVja0lmU3RhdGVNb2RpZmljYXRpb25zQXJlQWxsb3dlZChhdG9tKSB7XG4gICAgdmFyIGhhc09ic2VydmVycyA9IGF0b20ub2JzZXJ2ZXJzLmxlbmd0aCA+IDA7XG4gICAgaWYgKGdsb2JhbFN0YXRlLmNvbXB1dGF0aW9uRGVwdGggPiAwICYmIGhhc09ic2VydmVycylcbiAgICAgICAgZmFpbChnZXRNZXNzYWdlKFwibTAzMVwiKSArIGF0b20ubmFtZSk7XG4gICAgaWYgKCFnbG9iYWxTdGF0ZS5hbGxvd1N0YXRlQ2hhbmdlcyAmJiBoYXNPYnNlcnZlcnMpXG4gICAgICAgIGZhaWwoZ2V0TWVzc2FnZShnbG9iYWxTdGF0ZS5zdHJpY3RNb2RlID8gXCJtMDMwYVwiIDogXCJtMDMwYlwiKSArIGF0b20ubmFtZSk7XG59XG5mdW5jdGlvbiB0cmFja0Rlcml2ZWRGdW5jdGlvbihkZXJpdmF0aW9uLCBmLCBjb250ZXh0KSB7XG4gICAgY2hhbmdlRGVwZW5kZW5jaWVzU3RhdGVUbzAoZGVyaXZhdGlvbik7XG4gICAgZGVyaXZhdGlvbi5uZXdPYnNlcnZpbmcgPSBuZXcgQXJyYXkoZGVyaXZhdGlvbi5vYnNlcnZpbmcubGVuZ3RoICsgMTAwKTtcbiAgICBkZXJpdmF0aW9uLnVuYm91bmREZXBzQ291bnQgPSAwO1xuICAgIGRlcml2YXRpb24ucnVuSWQgPSArK2dsb2JhbFN0YXRlLnJ1bklkO1xuICAgIHZhciBwcmV2VHJhY2tpbmcgPSBnbG9iYWxTdGF0ZS50cmFja2luZ0Rlcml2YXRpb247XG4gICAgZ2xvYmFsU3RhdGUudHJhY2tpbmdEZXJpdmF0aW9uID0gZGVyaXZhdGlvbjtcbiAgICB2YXIgcmVzdWx0O1xuICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGYuY2FsbChjb250ZXh0KTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVzdWx0ID0gbmV3IENhdWdodEV4Y2VwdGlvbihlKTtcbiAgICB9XG4gICAgZ2xvYmFsU3RhdGUudHJhY2tpbmdEZXJpdmF0aW9uID0gcHJldlRyYWNraW5nO1xuICAgIGJpbmREZXBlbmRlbmNpZXMoZGVyaXZhdGlvbik7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmZ1bmN0aW9uIGJpbmREZXBlbmRlbmNpZXMoZGVyaXZhdGlvbikge1xuICAgIHZhciBwcmV2T2JzZXJ2aW5nID0gZGVyaXZhdGlvbi5vYnNlcnZpbmc7XG4gICAgdmFyIG9ic2VydmluZyA9IGRlcml2YXRpb24ub2JzZXJ2aW5nID0gZGVyaXZhdGlvbi5uZXdPYnNlcnZpbmc7XG4gICAgdmFyIGxvd2VzdE5ld09ic2VydmluZ0Rlcml2YXRpb25TdGF0ZSA9IElEZXJpdmF0aW9uU3RhdGUuVVBfVE9fREFURTtcbiAgICBkZXJpdmF0aW9uLm5ld09ic2VydmluZyA9IG51bGw7XG4gICAgdmFyIGkwID0gMCwgbCA9IGRlcml2YXRpb24udW5ib3VuZERlcHNDb3VudDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIgZGVwID0gb2JzZXJ2aW5nW2ldO1xuICAgICAgICBpZiAoZGVwLmRpZmZWYWx1ZSA9PT0gMCkge1xuICAgICAgICAgICAgZGVwLmRpZmZWYWx1ZSA9IDE7XG4gICAgICAgICAgICBpZiAoaTAgIT09IGkpXG4gICAgICAgICAgICAgICAgb2JzZXJ2aW5nW2kwXSA9IGRlcDtcbiAgICAgICAgICAgIGkwKys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlcC5kZXBlbmRlbmNpZXNTdGF0ZSA+IGxvd2VzdE5ld09ic2VydmluZ0Rlcml2YXRpb25TdGF0ZSkge1xuICAgICAgICAgICAgbG93ZXN0TmV3T2JzZXJ2aW5nRGVyaXZhdGlvblN0YXRlID0gZGVwLmRlcGVuZGVuY2llc1N0YXRlO1xuICAgICAgICB9XG4gICAgfVxuICAgIG9ic2VydmluZy5sZW5ndGggPSBpMDtcbiAgICBsID0gcHJldk9ic2VydmluZy5sZW5ndGg7XG4gICAgd2hpbGUgKGwtLSkge1xuICAgICAgICB2YXIgZGVwID0gcHJldk9ic2VydmluZ1tsXTtcbiAgICAgICAgaWYgKGRlcC5kaWZmVmFsdWUgPT09IDApIHtcbiAgICAgICAgICAgIHJlbW92ZU9ic2VydmVyKGRlcCwgZGVyaXZhdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgZGVwLmRpZmZWYWx1ZSA9IDA7XG4gICAgfVxuICAgIHdoaWxlIChpMC0tKSB7XG4gICAgICAgIHZhciBkZXAgPSBvYnNlcnZpbmdbaTBdO1xuICAgICAgICBpZiAoZGVwLmRpZmZWYWx1ZSA9PT0gMSkge1xuICAgICAgICAgICAgZGVwLmRpZmZWYWx1ZSA9IDA7XG4gICAgICAgICAgICBhZGRPYnNlcnZlcihkZXAsIGRlcml2YXRpb24pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChsb3dlc3ROZXdPYnNlcnZpbmdEZXJpdmF0aW9uU3RhdGUgIT09IElEZXJpdmF0aW9uU3RhdGUuVVBfVE9fREFURSkge1xuICAgICAgICBkZXJpdmF0aW9uLmRlcGVuZGVuY2llc1N0YXRlID0gbG93ZXN0TmV3T2JzZXJ2aW5nRGVyaXZhdGlvblN0YXRlO1xuICAgICAgICBkZXJpdmF0aW9uLm9uQmVjb21lU3RhbGUoKTtcbiAgICB9XG59XG5mdW5jdGlvbiBjbGVhck9ic2VydmluZyhkZXJpdmF0aW9uKSB7XG4gICAgdmFyIG9icyA9IGRlcml2YXRpb24ub2JzZXJ2aW5nO1xuICAgIGRlcml2YXRpb24ub2JzZXJ2aW5nID0gW107XG4gICAgdmFyIGkgPSBvYnMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pXG4gICAgICAgIHJlbW92ZU9ic2VydmVyKG9ic1tpXSwgZGVyaXZhdGlvbik7XG4gICAgZGVyaXZhdGlvbi5kZXBlbmRlbmNpZXNTdGF0ZSA9IElEZXJpdmF0aW9uU3RhdGUuTk9UX1RSQUNLSU5HO1xufVxuZnVuY3Rpb24gdW50cmFja2VkKGFjdGlvbikge1xuICAgIHZhciBwcmV2ID0gdW50cmFja2VkU3RhcnQoKTtcbiAgICB2YXIgcmVzID0gYWN0aW9uKCk7XG4gICAgdW50cmFja2VkRW5kKHByZXYpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLnVudHJhY2tlZCA9IHVudHJhY2tlZDtcbmZ1bmN0aW9uIHVudHJhY2tlZFN0YXJ0KCkge1xuICAgIHZhciBwcmV2ID0gZ2xvYmFsU3RhdGUudHJhY2tpbmdEZXJpdmF0aW9uO1xuICAgIGdsb2JhbFN0YXRlLnRyYWNraW5nRGVyaXZhdGlvbiA9IG51bGw7XG4gICAgcmV0dXJuIHByZXY7XG59XG5mdW5jdGlvbiB1bnRyYWNrZWRFbmQocHJldikge1xuICAgIGdsb2JhbFN0YXRlLnRyYWNraW5nRGVyaXZhdGlvbiA9IHByZXY7XG59XG5mdW5jdGlvbiBjaGFuZ2VEZXBlbmRlbmNpZXNTdGF0ZVRvMChkZXJpdmF0aW9uKSB7XG4gICAgaWYgKGRlcml2YXRpb24uZGVwZW5kZW5jaWVzU3RhdGUgPT09IElEZXJpdmF0aW9uU3RhdGUuVVBfVE9fREFURSlcbiAgICAgICAgcmV0dXJuO1xuICAgIGRlcml2YXRpb24uZGVwZW5kZW5jaWVzU3RhdGUgPSBJRGVyaXZhdGlvblN0YXRlLlVQX1RPX0RBVEU7XG4gICAgdmFyIG9icyA9IGRlcml2YXRpb24ub2JzZXJ2aW5nO1xuICAgIHZhciBpID0gb2JzLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKVxuICAgICAgICBvYnNbaV0ubG93ZXN0T2JzZXJ2ZXJTdGF0ZSA9IElEZXJpdmF0aW9uU3RhdGUuVVBfVE9fREFURTtcbn1cbnZhciBwZXJzaXN0ZW50S2V5cyA9IFtcIm1vYnhHdWlkXCIsIFwicmVzZXRJZFwiLCBcInNweUxpc3RlbmVyc1wiLCBcInN0cmljdE1vZGVcIiwgXCJydW5JZFwiXTtcbnZhciBNb2JYR2xvYmFscyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTW9iWEdsb2JhbHMoKSB7XG4gICAgICAgIHRoaXMudmVyc2lvbiA9IDU7XG4gICAgICAgIHRoaXMudHJhY2tpbmdEZXJpdmF0aW9uID0gbnVsbDtcbiAgICAgICAgdGhpcy5jb21wdXRhdGlvbkRlcHRoID0gMDtcbiAgICAgICAgdGhpcy5ydW5JZCA9IDA7XG4gICAgICAgIHRoaXMubW9ieEd1aWQgPSAwO1xuICAgICAgICB0aGlzLmluQmF0Y2ggPSAwO1xuICAgICAgICB0aGlzLnBlbmRpbmdVbm9ic2VydmF0aW9ucyA9IFtdO1xuICAgICAgICB0aGlzLnBlbmRpbmdSZWFjdGlvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5pc1J1bm5pbmdSZWFjdGlvbnMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5hbGxvd1N0YXRlQ2hhbmdlcyA9IHRydWU7XG4gICAgICAgIHRoaXMuc3RyaWN0TW9kZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnJlc2V0SWQgPSAwO1xuICAgICAgICB0aGlzLnNweUxpc3RlbmVycyA9IFtdO1xuICAgICAgICB0aGlzLmdsb2JhbFJlYWN0aW9uRXJyb3JIYW5kbGVycyA9IFtdO1xuICAgIH1cbiAgICByZXR1cm4gTW9iWEdsb2JhbHM7XG59KCkpO1xudmFyIGdsb2JhbFN0YXRlID0gbmV3IE1vYlhHbG9iYWxzKCk7XG5mdW5jdGlvbiBzaGFyZUdsb2JhbFN0YXRlKCkge1xuICAgIHZhciBnbG9iYWwgPSBnZXRHbG9iYWwoKTtcbiAgICB2YXIgb3duU3RhdGUgPSBnbG9iYWxTdGF0ZTtcbiAgICBpZiAoZ2xvYmFsLl9fbW9ic2VydmFibGVUcmFja2luZ1N0YWNrIHx8IGdsb2JhbC5fX21vYnNlcnZhYmxlVmlld1N0YWNrKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJbbW9ieF0gQW4gaW5jb21wYXRpYmxlIHZlcnNpb24gb2YgbW9ic2VydmFibGUgaXMgYWxyZWFkeSBsb2FkZWQuXCIpO1xuICAgIGlmIChnbG9iYWwuX19tb2J4R2xvYmFsICYmIGdsb2JhbC5fX21vYnhHbG9iYWwudmVyc2lvbiAhPT0gb3duU3RhdGUudmVyc2lvbilcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiW21vYnhdIEFuIGluY29tcGF0aWJsZSB2ZXJzaW9uIG9mIG1vYnggaXMgYWxyZWFkeSBsb2FkZWQuXCIpO1xuICAgIGlmIChnbG9iYWwuX19tb2J4R2xvYmFsKVxuICAgICAgICBnbG9iYWxTdGF0ZSA9IGdsb2JhbC5fX21vYnhHbG9iYWw7XG4gICAgZWxzZVxuICAgICAgICBnbG9iYWwuX19tb2J4R2xvYmFsID0gb3duU3RhdGU7XG59XG5mdW5jdGlvbiBnZXRHbG9iYWxTdGF0ZSgpIHtcbiAgICByZXR1cm4gZ2xvYmFsU3RhdGU7XG59XG5mdW5jdGlvbiByZWdpc3Rlckdsb2JhbHMoKSB7XG59XG5mdW5jdGlvbiByZXNldEdsb2JhbFN0YXRlKCkge1xuICAgIGdsb2JhbFN0YXRlLnJlc2V0SWQrKztcbiAgICB2YXIgZGVmYXVsdEdsb2JhbHMgPSBuZXcgTW9iWEdsb2JhbHMoKTtcbiAgICBmb3IgKHZhciBrZXkgaW4gZGVmYXVsdEdsb2JhbHMpXG4gICAgICAgIGlmIChwZXJzaXN0ZW50S2V5cy5pbmRleE9mKGtleSkgPT09IC0xKVxuICAgICAgICAgICAgZ2xvYmFsU3RhdGVba2V5XSA9IGRlZmF1bHRHbG9iYWxzW2tleV07XG4gICAgZ2xvYmFsU3RhdGUuYWxsb3dTdGF0ZUNoYW5nZXMgPSAhZ2xvYmFsU3RhdGUuc3RyaWN0TW9kZTtcbn1cbmZ1bmN0aW9uIGhhc09ic2VydmVycyhvYnNlcnZhYmxlKSB7XG4gICAgcmV0dXJuIG9ic2VydmFibGUub2JzZXJ2ZXJzICYmIG9ic2VydmFibGUub2JzZXJ2ZXJzLmxlbmd0aCA+IDA7XG59XG5mdW5jdGlvbiBnZXRPYnNlcnZlcnMob2JzZXJ2YWJsZSkge1xuICAgIHJldHVybiBvYnNlcnZhYmxlLm9ic2VydmVycztcbn1cbmZ1bmN0aW9uIGludmFyaWFudE9ic2VydmVycyhvYnNlcnZhYmxlKSB7XG4gICAgdmFyIGxpc3QgPSBvYnNlcnZhYmxlLm9ic2VydmVycztcbiAgICB2YXIgbWFwID0gb2JzZXJ2YWJsZS5vYnNlcnZlcnNJbmRleGVzO1xuICAgIHZhciBsID0gbGlzdC5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdmFyIGlkID0gbGlzdFtpXS5fX21hcGlkO1xuICAgICAgICBpZiAoaSkge1xuICAgICAgICAgICAgaW52YXJpYW50KG1hcFtpZF0gPT09IGksIFwiSU5URVJOQUwgRVJST1IgbWFwcyBkZXJpdmF0aW9uLl9fbWFwaWQgdG8gaW5kZXggaW4gbGlzdFwiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGludmFyaWFudCghKGlkIGluIG1hcCksIFwiSU5URVJOQUwgRVJST1Igb2JzZXJ2ZXIgb24gaW5kZXggMCBzaG91bGRudCBiZSBoZWxkIGluIG1hcC5cIik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaW52YXJpYW50KGxpc3QubGVuZ3RoID09PSAwIHx8IE9iamVjdC5rZXlzKG1hcCkubGVuZ3RoID09PSBsaXN0Lmxlbmd0aCAtIDEsIFwiSU5URVJOQUwgRVJST1IgdGhlcmUgaXMgbm8ganVuayBpbiBtYXBcIik7XG59XG5mdW5jdGlvbiBhZGRPYnNlcnZlcihvYnNlcnZhYmxlLCBub2RlKSB7XG4gICAgdmFyIGwgPSBvYnNlcnZhYmxlLm9ic2VydmVycy5sZW5ndGg7XG4gICAgaWYgKGwpIHtcbiAgICAgICAgb2JzZXJ2YWJsZS5vYnNlcnZlcnNJbmRleGVzW25vZGUuX19tYXBpZF0gPSBsO1xuICAgIH1cbiAgICBvYnNlcnZhYmxlLm9ic2VydmVyc1tsXSA9IG5vZGU7XG4gICAgaWYgKG9ic2VydmFibGUubG93ZXN0T2JzZXJ2ZXJTdGF0ZSA+IG5vZGUuZGVwZW5kZW5jaWVzU3RhdGUpXG4gICAgICAgIG9ic2VydmFibGUubG93ZXN0T2JzZXJ2ZXJTdGF0ZSA9IG5vZGUuZGVwZW5kZW5jaWVzU3RhdGU7XG59XG5mdW5jdGlvbiByZW1vdmVPYnNlcnZlcihvYnNlcnZhYmxlLCBub2RlKSB7XG4gICAgaWYgKG9ic2VydmFibGUub2JzZXJ2ZXJzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBvYnNlcnZhYmxlLm9ic2VydmVycy5sZW5ndGggPSAwO1xuICAgICAgICBxdWV1ZUZvclVub2JzZXJ2YXRpb24ob2JzZXJ2YWJsZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgbGlzdCA9IG9ic2VydmFibGUub2JzZXJ2ZXJzO1xuICAgICAgICB2YXIgbWFwXzEgPSBvYnNlcnZhYmxlLm9ic2VydmVyc0luZGV4ZXM7XG4gICAgICAgIHZhciBmaWxsZXIgPSBsaXN0LnBvcCgpO1xuICAgICAgICBpZiAoZmlsbGVyICE9PSBub2RlKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBtYXBfMVtub2RlLl9fbWFwaWRdIHx8IDA7XG4gICAgICAgICAgICBpZiAoaW5kZXgpIHtcbiAgICAgICAgICAgICAgICBtYXBfMVtmaWxsZXIuX19tYXBpZF0gPSBpbmRleDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBtYXBfMVtmaWxsZXIuX19tYXBpZF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaXN0W2luZGV4XSA9IGZpbGxlcjtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgbWFwXzFbbm9kZS5fX21hcGlkXTtcbiAgICB9XG59XG5mdW5jdGlvbiBxdWV1ZUZvclVub2JzZXJ2YXRpb24ob2JzZXJ2YWJsZSkge1xuICAgIGlmICghb2JzZXJ2YWJsZS5pc1BlbmRpbmdVbm9ic2VydmF0aW9uKSB7XG4gICAgICAgIG9ic2VydmFibGUuaXNQZW5kaW5nVW5vYnNlcnZhdGlvbiA9IHRydWU7XG4gICAgICAgIGdsb2JhbFN0YXRlLnBlbmRpbmdVbm9ic2VydmF0aW9ucy5wdXNoKG9ic2VydmFibGUpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHN0YXJ0QmF0Y2goKSB7XG4gICAgZ2xvYmFsU3RhdGUuaW5CYXRjaCsrO1xufVxuZnVuY3Rpb24gZW5kQmF0Y2goKSB7XG4gICAgaWYgKC0tZ2xvYmFsU3RhdGUuaW5CYXRjaCA9PT0gMCkge1xuICAgICAgICBydW5SZWFjdGlvbnMoKTtcbiAgICAgICAgdmFyIGxpc3QgPSBnbG9iYWxTdGF0ZS5wZW5kaW5nVW5vYnNlcnZhdGlvbnM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG9ic2VydmFibGVfMSA9IGxpc3RbaV07XG4gICAgICAgICAgICBvYnNlcnZhYmxlXzEuaXNQZW5kaW5nVW5vYnNlcnZhdGlvbiA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKG9ic2VydmFibGVfMS5vYnNlcnZlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2YWJsZV8xLm9uQmVjb21lVW5vYnNlcnZlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGdsb2JhbFN0YXRlLnBlbmRpbmdVbm9ic2VydmF0aW9ucyA9IFtdO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHJlcG9ydE9ic2VydmVkKG9ic2VydmFibGUpIHtcbiAgICB2YXIgZGVyaXZhdGlvbiA9IGdsb2JhbFN0YXRlLnRyYWNraW5nRGVyaXZhdGlvbjtcbiAgICBpZiAoZGVyaXZhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICBpZiAoZGVyaXZhdGlvbi5ydW5JZCAhPT0gb2JzZXJ2YWJsZS5sYXN0QWNjZXNzZWRCeSkge1xuICAgICAgICAgICAgb2JzZXJ2YWJsZS5sYXN0QWNjZXNzZWRCeSA9IGRlcml2YXRpb24ucnVuSWQ7XG4gICAgICAgICAgICBkZXJpdmF0aW9uLm5ld09ic2VydmluZ1tkZXJpdmF0aW9uLnVuYm91bmREZXBzQ291bnQrK10gPSBvYnNlcnZhYmxlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKG9ic2VydmFibGUub2JzZXJ2ZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBxdWV1ZUZvclVub2JzZXJ2YXRpb24ob2JzZXJ2YWJsZSk7XG4gICAgfVxufVxuZnVuY3Rpb24gaW52YXJpYW50TE9TKG9ic2VydmFibGUsIG1zZykge1xuICAgIHZhciBtaW4gPSBnZXRPYnNlcnZlcnMob2JzZXJ2YWJsZSkucmVkdWNlKGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBNYXRoLm1pbihhLCBiLmRlcGVuZGVuY2llc1N0YXRlKTsgfSwgMik7XG4gICAgaWYgKG1pbiA+PSBvYnNlcnZhYmxlLmxvd2VzdE9ic2VydmVyU3RhdGUpXG4gICAgICAgIHJldHVybjtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJsb3dlc3RPYnNlcnZlclN0YXRlIGlzIHdyb25nIGZvciBcIiArIG1zZyArIFwiIGJlY2F1c2UgXCIgKyBtaW4gKyBcIiA8IFwiICsgb2JzZXJ2YWJsZS5sb3dlc3RPYnNlcnZlclN0YXRlKTtcbn1cbmZ1bmN0aW9uIHByb3BhZ2F0ZUNoYW5nZWQob2JzZXJ2YWJsZSkge1xuICAgIGlmIChvYnNlcnZhYmxlLmxvd2VzdE9ic2VydmVyU3RhdGUgPT09IElEZXJpdmF0aW9uU3RhdGUuU1RBTEUpXG4gICAgICAgIHJldHVybjtcbiAgICBvYnNlcnZhYmxlLmxvd2VzdE9ic2VydmVyU3RhdGUgPSBJRGVyaXZhdGlvblN0YXRlLlNUQUxFO1xuICAgIHZhciBvYnNlcnZlcnMgPSBvYnNlcnZhYmxlLm9ic2VydmVycztcbiAgICB2YXIgaSA9IG9ic2VydmVycy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICB2YXIgZCA9IG9ic2VydmVyc1tpXTtcbiAgICAgICAgaWYgKGQuZGVwZW5kZW5jaWVzU3RhdGUgPT09IElEZXJpdmF0aW9uU3RhdGUuVVBfVE9fREFURSlcbiAgICAgICAgICAgIGQub25CZWNvbWVTdGFsZSgpO1xuICAgICAgICBkLmRlcGVuZGVuY2llc1N0YXRlID0gSURlcml2YXRpb25TdGF0ZS5TVEFMRTtcbiAgICB9XG59XG5mdW5jdGlvbiBwcm9wYWdhdGVDaGFuZ2VDb25maXJtZWQob2JzZXJ2YWJsZSkge1xuICAgIGlmIChvYnNlcnZhYmxlLmxvd2VzdE9ic2VydmVyU3RhdGUgPT09IElEZXJpdmF0aW9uU3RhdGUuU1RBTEUpXG4gICAgICAgIHJldHVybjtcbiAgICBvYnNlcnZhYmxlLmxvd2VzdE9ic2VydmVyU3RhdGUgPSBJRGVyaXZhdGlvblN0YXRlLlNUQUxFO1xuICAgIHZhciBvYnNlcnZlcnMgPSBvYnNlcnZhYmxlLm9ic2VydmVycztcbiAgICB2YXIgaSA9IG9ic2VydmVycy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICB2YXIgZCA9IG9ic2VydmVyc1tpXTtcbiAgICAgICAgaWYgKGQuZGVwZW5kZW5jaWVzU3RhdGUgPT09IElEZXJpdmF0aW9uU3RhdGUuUE9TU0lCTFlfU1RBTEUpXG4gICAgICAgICAgICBkLmRlcGVuZGVuY2llc1N0YXRlID0gSURlcml2YXRpb25TdGF0ZS5TVEFMRTtcbiAgICAgICAgZWxzZSBpZiAoZC5kZXBlbmRlbmNpZXNTdGF0ZSA9PT0gSURlcml2YXRpb25TdGF0ZS5VUF9UT19EQVRFKVxuICAgICAgICAgICAgb2JzZXJ2YWJsZS5sb3dlc3RPYnNlcnZlclN0YXRlID0gSURlcml2YXRpb25TdGF0ZS5VUF9UT19EQVRFO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHByb3BhZ2F0ZU1heWJlQ2hhbmdlZChvYnNlcnZhYmxlKSB7XG4gICAgaWYgKG9ic2VydmFibGUubG93ZXN0T2JzZXJ2ZXJTdGF0ZSAhPT0gSURlcml2YXRpb25TdGF0ZS5VUF9UT19EQVRFKVxuICAgICAgICByZXR1cm47XG4gICAgb2JzZXJ2YWJsZS5sb3dlc3RPYnNlcnZlclN0YXRlID0gSURlcml2YXRpb25TdGF0ZS5QT1NTSUJMWV9TVEFMRTtcbiAgICB2YXIgb2JzZXJ2ZXJzID0gb2JzZXJ2YWJsZS5vYnNlcnZlcnM7XG4gICAgdmFyIGkgPSBvYnNlcnZlcnMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgdmFyIGQgPSBvYnNlcnZlcnNbaV07XG4gICAgICAgIGlmIChkLmRlcGVuZGVuY2llc1N0YXRlID09PSBJRGVyaXZhdGlvblN0YXRlLlVQX1RPX0RBVEUpIHtcbiAgICAgICAgICAgIGQuZGVwZW5kZW5jaWVzU3RhdGUgPSBJRGVyaXZhdGlvblN0YXRlLlBPU1NJQkxZX1NUQUxFO1xuICAgICAgICAgICAgZC5vbkJlY29tZVN0YWxlKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG52YXIgUmVhY3Rpb24gPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFJlYWN0aW9uKG5hbWUsIG9uSW52YWxpZGF0ZSkge1xuICAgICAgICBpZiAobmFtZSA9PT0gdm9pZCAwKSB7IG5hbWUgPSBcIlJlYWN0aW9uQFwiICsgZ2V0TmV4dElkKCk7IH1cbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5vbkludmFsaWRhdGUgPSBvbkludmFsaWRhdGU7XG4gICAgICAgIHRoaXMub2JzZXJ2aW5nID0gW107XG4gICAgICAgIHRoaXMubmV3T2JzZXJ2aW5nID0gW107XG4gICAgICAgIHRoaXMuZGVwZW5kZW5jaWVzU3RhdGUgPSBJRGVyaXZhdGlvblN0YXRlLk5PVF9UUkFDS0lORztcbiAgICAgICAgdGhpcy5kaWZmVmFsdWUgPSAwO1xuICAgICAgICB0aGlzLnJ1bklkID0gMDtcbiAgICAgICAgdGhpcy51bmJvdW5kRGVwc0NvdW50ID0gMDtcbiAgICAgICAgdGhpcy5fX21hcGlkID0gXCIjXCIgKyBnZXROZXh0SWQoKTtcbiAgICAgICAgdGhpcy5pc0Rpc3Bvc2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2lzU2NoZWR1bGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2lzVHJhY2tQZW5kaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2lzUnVubmluZyA9IGZhbHNlO1xuICAgIH1cbiAgICBSZWFjdGlvbi5wcm90b3R5cGUub25CZWNvbWVTdGFsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5zY2hlZHVsZSgpO1xuICAgIH07XG4gICAgUmVhY3Rpb24ucHJvdG90eXBlLnNjaGVkdWxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2lzU2NoZWR1bGVkKSB7XG4gICAgICAgICAgICB0aGlzLl9pc1NjaGVkdWxlZCA9IHRydWU7XG4gICAgICAgICAgICBnbG9iYWxTdGF0ZS5wZW5kaW5nUmVhY3Rpb25zLnB1c2godGhpcyk7XG4gICAgICAgICAgICBydW5SZWFjdGlvbnMoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgUmVhY3Rpb24ucHJvdG90eXBlLmlzU2NoZWR1bGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faXNTY2hlZHVsZWQ7XG4gICAgfTtcbiAgICBSZWFjdGlvbi5wcm90b3R5cGUucnVuUmVhY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0Rpc3Bvc2VkKSB7XG4gICAgICAgICAgICBzdGFydEJhdGNoKCk7XG4gICAgICAgICAgICB0aGlzLl9pc1NjaGVkdWxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHNob3VsZENvbXB1dGUodGhpcykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9pc1RyYWNrUGVuZGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5vbkludmFsaWRhdGUoKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5faXNUcmFja1BlbmRpbmcgJiYgaXNTcHlFbmFibGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3B5UmVwb3J0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdDogdGhpcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic2NoZWR1bGVkLXJlYWN0aW9uXCJcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZW5kQmF0Y2goKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgUmVhY3Rpb24ucHJvdG90eXBlLnRyYWNrID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHN0YXJ0QmF0Y2goKTtcbiAgICAgICAgdmFyIG5vdGlmeSA9IGlzU3B5RW5hYmxlZCgpO1xuICAgICAgICB2YXIgc3RhcnRUaW1lO1xuICAgICAgICBpZiAobm90aWZ5KSB7XG4gICAgICAgICAgICBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgc3B5UmVwb3J0U3RhcnQoe1xuICAgICAgICAgICAgICAgIG9iamVjdDogdGhpcyxcbiAgICAgICAgICAgICAgICB0eXBlOiBcInJlYWN0aW9uXCIsXG4gICAgICAgICAgICAgICAgZm46IGZuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pc1J1bm5pbmcgPSB0cnVlO1xuICAgICAgICB2YXIgcmVzdWx0ID0gdHJhY2tEZXJpdmVkRnVuY3Rpb24odGhpcywgZm4sIHVuZGVmaW5lZCk7XG4gICAgICAgIHRoaXMuX2lzUnVubmluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9pc1RyYWNrUGVuZGluZyA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5pc0Rpc3Bvc2VkKSB7XG4gICAgICAgICAgICBjbGVhck9ic2VydmluZyh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNDYXVnaHRFeGNlcHRpb24ocmVzdWx0KSlcbiAgICAgICAgICAgIHRoaXMucmVwb3J0RXhjZXB0aW9uSW5EZXJpdmF0aW9uKHJlc3VsdC5jYXVzZSk7XG4gICAgICAgIGlmIChub3RpZnkpIHtcbiAgICAgICAgICAgIHNweVJlcG9ydEVuZCh7XG4gICAgICAgICAgICAgICAgdGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZW5kQmF0Y2goKTtcbiAgICB9O1xuICAgIFJlYWN0aW9uLnByb3RvdHlwZS5yZXBvcnRFeGNlcHRpb25JbkRlcml2YXRpb24gPSBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgaWYgKHRoaXMuZXJyb3JIYW5kbGVyKSB7XG4gICAgICAgICAgICB0aGlzLmVycm9ySGFuZGxlcihlcnJvciwgdGhpcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1lc3NhZ2UgPSBcIlttb2J4XSBFbmNvdW50ZXJlZCBhbiB1bmNhdWdodCBleGNlcHRpb24gdGhhdCB3YXMgdGhyb3duIGJ5IGEgcmVhY3Rpb24gb3Igb2JzZXJ2ZXIgY29tcG9uZW50LCBpbjogJ1wiICsgdGhpcztcbiAgICAgICAgdmFyIG1lc3NhZ2VUb1VzZXIgPSBnZXRNZXNzYWdlKFwibTAzN1wiKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihtZXNzYWdlIHx8IG1lc3NhZ2VUb1VzZXIsIGVycm9yKTtcbiAgICAgICAgaWYgKGlzU3B5RW5hYmxlZCgpKSB7XG4gICAgICAgICAgICBzcHlSZXBvcnQoe1xuICAgICAgICAgICAgICAgIHR5cGU6IFwiZXJyb3JcIixcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvcixcbiAgICAgICAgICAgICAgICBvYmplY3Q6IHRoaXNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGdsb2JhbFN0YXRlLmdsb2JhbFJlYWN0aW9uRXJyb3JIYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uIChmKSB7IHJldHVybiBmKGVycm9yLCBfdGhpcyk7IH0pO1xuICAgIH07XG4gICAgUmVhY3Rpb24ucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0Rpc3Bvc2VkKSB7XG4gICAgICAgICAgICB0aGlzLmlzRGlzcG9zZWQgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9pc1J1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICBzdGFydEJhdGNoKCk7XG4gICAgICAgICAgICAgICAgY2xlYXJPYnNlcnZpbmcodGhpcyk7XG4gICAgICAgICAgICAgICAgZW5kQmF0Y2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgUmVhY3Rpb24ucHJvdG90eXBlLmdldERpc3Bvc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgciA9IHRoaXMuZGlzcG9zZS5iaW5kKHRoaXMpO1xuICAgICAgICByLiRtb2J4ID0gdGhpcztcbiAgICAgICAgci5vbkVycm9yID0gcmVnaXN0ZXJFcnJvckhhbmRsZXI7XG4gICAgICAgIHJldHVybiByO1xuICAgIH07XG4gICAgUmVhY3Rpb24ucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gXCJSZWFjdGlvbltcIiArIHRoaXMubmFtZSArIFwiXVwiO1xuICAgIH07XG4gICAgUmVhY3Rpb24ucHJvdG90eXBlLndoeVJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9ic2VydmluZyA9IHVuaXF1ZSh0aGlzLl9pc1J1bm5pbmcgPyB0aGlzLm5ld09ic2VydmluZyA6IHRoaXMub2JzZXJ2aW5nKS5tYXAoZnVuY3Rpb24gKGRlcCkgeyByZXR1cm4gZGVwLm5hbWU7IH0pO1xuICAgICAgICByZXR1cm4gKFwiXFxuV2h5UnVuPyByZWFjdGlvbiAnXCIgKyB0aGlzLm5hbWUgKyBcIic6XFxuICogU3RhdHVzOiBbXCIgKyAodGhpcy5pc0Rpc3Bvc2VkID8gXCJzdG9wcGVkXCIgOiB0aGlzLl9pc1J1bm5pbmcgPyBcInJ1bm5pbmdcIiA6IHRoaXMuaXNTY2hlZHVsZWQoKSA/IFwic2NoZWR1bGVkXCIgOiBcImlkbGVcIikgKyBcIl1cXG4gKiBUaGlzIHJlYWN0aW9uIHdpbGwgcmUtcnVuIGlmIGFueSBvZiB0aGUgZm9sbG93aW5nIG9ic2VydmFibGVzIGNoYW5nZXM6XFxuICAgIFwiICsgam9pblN0cmluZ3Mob2JzZXJ2aW5nKSArIFwiXFxuICAgIFwiICsgKCh0aGlzLl9pc1J1bm5pbmcpID8gXCIgKC4uLiBvciBhbnkgb2JzZXJ2YWJsZSBhY2Nlc3NlZCBkdXJpbmcgdGhlIHJlbWFpbmRlciBvZiB0aGUgY3VycmVudCBydW4pXCIgOiBcIlwiKSArIFwiXFxuXFx0XCIgKyBnZXRNZXNzYWdlKFwibTAzOFwiKSArIFwiXFxuXCIpO1xuICAgIH07XG4gICAgcmV0dXJuIFJlYWN0aW9uO1xufSgpKTtcbmV4cG9ydHMuUmVhY3Rpb24gPSBSZWFjdGlvbjtcbmZ1bmN0aW9uIHJlZ2lzdGVyRXJyb3JIYW5kbGVyKGhhbmRsZXIpIHtcbiAgICBpbnZhcmlhbnQodGhpcyAmJiB0aGlzLiRtb2J4ICYmIGlzUmVhY3Rpb24odGhpcy4kbW9ieCksIFwiSW52YWxpZCBgdGhpc2BcIik7XG4gICAgaW52YXJpYW50KCF0aGlzLiRtb2J4LmVycm9ySGFuZGxlciwgXCJPbmx5IG9uZSBvbkVycm9ySGFuZGxlciBjYW4gYmUgcmVnaXN0ZXJlZFwiKTtcbiAgICB0aGlzLiRtb2J4LmVycm9ySGFuZGxlciA9IGhhbmRsZXI7XG59XG5mdW5jdGlvbiBvblJlYWN0aW9uRXJyb3IoaGFuZGxlcikge1xuICAgIGdsb2JhbFN0YXRlLmdsb2JhbFJlYWN0aW9uRXJyb3JIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpZHggPSBnbG9iYWxTdGF0ZS5nbG9iYWxSZWFjdGlvbkVycm9ySGFuZGxlcnMuaW5kZXhPZihoYW5kbGVyKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKVxuICAgICAgICAgICAgZ2xvYmFsU3RhdGUuZ2xvYmFsUmVhY3Rpb25FcnJvckhhbmRsZXJzLnNwbGljZShpZHgsIDEpO1xuICAgIH07XG59XG52YXIgTUFYX1JFQUNUSU9OX0lURVJBVElPTlMgPSAxMDA7XG52YXIgcmVhY3Rpb25TY2hlZHVsZXIgPSBmdW5jdGlvbiAoZikgeyByZXR1cm4gZigpOyB9O1xuZnVuY3Rpb24gcnVuUmVhY3Rpb25zKCkge1xuICAgIGlmIChnbG9iYWxTdGF0ZS5pbkJhdGNoID4gMCB8fCBnbG9iYWxTdGF0ZS5pc1J1bm5pbmdSZWFjdGlvbnMpXG4gICAgICAgIHJldHVybjtcbiAgICByZWFjdGlvblNjaGVkdWxlcihydW5SZWFjdGlvbnNIZWxwZXIpO1xufVxuZnVuY3Rpb24gcnVuUmVhY3Rpb25zSGVscGVyKCkge1xuICAgIGdsb2JhbFN0YXRlLmlzUnVubmluZ1JlYWN0aW9ucyA9IHRydWU7XG4gICAgdmFyIGFsbFJlYWN0aW9ucyA9IGdsb2JhbFN0YXRlLnBlbmRpbmdSZWFjdGlvbnM7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHdoaWxlIChhbGxSZWFjdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICBpZiAoKytpdGVyYXRpb25zID09PSBNQVhfUkVBQ1RJT05fSVRFUkFUSU9OUykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlJlYWN0aW9uIGRvZXNuJ3QgY29udmVyZ2UgdG8gYSBzdGFibGUgc3RhdGUgYWZ0ZXIgXCIgKyBNQVhfUkVBQ1RJT05fSVRFUkFUSU9OUyArIFwiIGl0ZXJhdGlvbnMuXCJcbiAgICAgICAgICAgICAgICArIChcIiBQcm9iYWJseSB0aGVyZSBpcyBhIGN5Y2xlIGluIHRoZSByZWFjdGl2ZSBmdW5jdGlvbjogXCIgKyBhbGxSZWFjdGlvbnNbMF0pKTtcbiAgICAgICAgICAgIGFsbFJlYWN0aW9ucy5zcGxpY2UoMCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlbWFpbmluZ1JlYWN0aW9ucyA9IGFsbFJlYWN0aW9ucy5zcGxpY2UoMCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gcmVtYWluaW5nUmVhY3Rpb25zLmxlbmd0aDsgaSA8IGw7IGkrKylcbiAgICAgICAgICAgIHJlbWFpbmluZ1JlYWN0aW9uc1tpXS5ydW5SZWFjdGlvbigpO1xuICAgIH1cbiAgICBnbG9iYWxTdGF0ZS5pc1J1bm5pbmdSZWFjdGlvbnMgPSBmYWxzZTtcbn1cbnZhciBpc1JlYWN0aW9uID0gY3JlYXRlSW5zdGFuY2VvZlByZWRpY2F0ZShcIlJlYWN0aW9uXCIsIFJlYWN0aW9uKTtcbmZ1bmN0aW9uIHNldFJlYWN0aW9uU2NoZWR1bGVyKGZuKSB7XG4gICAgdmFyIGJhc2VTY2hlZHVsZXIgPSByZWFjdGlvblNjaGVkdWxlcjtcbiAgICByZWFjdGlvblNjaGVkdWxlciA9IGZ1bmN0aW9uIChmKSB7IHJldHVybiBmbihmdW5jdGlvbiAoKSB7IHJldHVybiBiYXNlU2NoZWR1bGVyKGYpOyB9KTsgfTtcbn1cbmZ1bmN0aW9uIGlzU3B5RW5hYmxlZCgpIHtcbiAgICByZXR1cm4gISFnbG9iYWxTdGF0ZS5zcHlMaXN0ZW5lcnMubGVuZ3RoO1xufVxuZnVuY3Rpb24gc3B5UmVwb3J0KGV2ZW50KSB7XG4gICAgaWYgKCFnbG9iYWxTdGF0ZS5zcHlMaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgICByZXR1cm47XG4gICAgdmFyIGxpc3RlbmVycyA9IGdsb2JhbFN0YXRlLnNweUxpc3RlbmVycztcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsOyBpKyspXG4gICAgICAgIGxpc3RlbmVyc1tpXShldmVudCk7XG59XG5mdW5jdGlvbiBzcHlSZXBvcnRTdGFydChldmVudCkge1xuICAgIHZhciBjaGFuZ2UgPSBvYmplY3RBc3NpZ24oe30sIGV2ZW50LCB7IHNweVJlcG9ydFN0YXJ0OiB0cnVlIH0pO1xuICAgIHNweVJlcG9ydChjaGFuZ2UpO1xufVxudmFyIEVORF9FVkVOVCA9IHsgc3B5UmVwb3J0RW5kOiB0cnVlIH07XG5mdW5jdGlvbiBzcHlSZXBvcnRFbmQoY2hhbmdlKSB7XG4gICAgaWYgKGNoYW5nZSlcbiAgICAgICAgc3B5UmVwb3J0KG9iamVjdEFzc2lnbih7fSwgY2hhbmdlLCBFTkRfRVZFTlQpKTtcbiAgICBlbHNlXG4gICAgICAgIHNweVJlcG9ydChFTkRfRVZFTlQpO1xufVxuZnVuY3Rpb24gc3B5KGxpc3RlbmVyKSB7XG4gICAgZ2xvYmFsU3RhdGUuc3B5TGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuICAgIHJldHVybiBvbmNlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGlkeCA9IGdsb2JhbFN0YXRlLnNweUxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgICAgICAgaWYgKGlkeCAhPT0gLTEpXG4gICAgICAgICAgICBnbG9iYWxTdGF0ZS5zcHlMaXN0ZW5lcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgfSk7XG59XG5leHBvcnRzLnNweSA9IHNweTtcbmZ1bmN0aW9uIGhhc0ludGVyY2VwdG9ycyhpbnRlcmNlcHRhYmxlKSB7XG4gICAgcmV0dXJuIChpbnRlcmNlcHRhYmxlLmludGVyY2VwdG9ycyAmJiBpbnRlcmNlcHRhYmxlLmludGVyY2VwdG9ycy5sZW5ndGggPiAwKTtcbn1cbmZ1bmN0aW9uIHJlZ2lzdGVySW50ZXJjZXB0b3IoaW50ZXJjZXB0YWJsZSwgaGFuZGxlcikge1xuICAgIHZhciBpbnRlcmNlcHRvcnMgPSBpbnRlcmNlcHRhYmxlLmludGVyY2VwdG9ycyB8fCAoaW50ZXJjZXB0YWJsZS5pbnRlcmNlcHRvcnMgPSBbXSk7XG4gICAgaW50ZXJjZXB0b3JzLnB1c2goaGFuZGxlcik7XG4gICAgcmV0dXJuIG9uY2UoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaWR4ID0gaW50ZXJjZXB0b3JzLmluZGV4T2YoaGFuZGxlcik7XG4gICAgICAgIGlmIChpZHggIT09IC0xKVxuICAgICAgICAgICAgaW50ZXJjZXB0b3JzLnNwbGljZShpZHgsIDEpO1xuICAgIH0pO1xufVxuZnVuY3Rpb24gaW50ZXJjZXB0Q2hhbmdlKGludGVyY2VwdGFibGUsIGNoYW5nZSkge1xuICAgIHZhciBwcmV2VSA9IHVudHJhY2tlZFN0YXJ0KCk7XG4gICAgdHJ5IHtcbiAgICAgICAgdmFyIGludGVyY2VwdG9ycyA9IGludGVyY2VwdGFibGUuaW50ZXJjZXB0b3JzO1xuICAgICAgICBpZiAoaW50ZXJjZXB0b3JzKVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBpbnRlcmNlcHRvcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlID0gaW50ZXJjZXB0b3JzW2ldKGNoYW5nZSk7XG4gICAgICAgICAgICAgICAgaW52YXJpYW50KCFjaGFuZ2UgfHwgY2hhbmdlLnR5cGUsIFwiSW50ZXJjZXB0IGhhbmRsZXJzIHNob3VsZCByZXR1cm4gbm90aGluZyBvciBhIGNoYW5nZSBvYmplY3RcIik7XG4gICAgICAgICAgICAgICAgaWYgKCFjaGFuZ2UpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2hhbmdlO1xuICAgIH1cbiAgICBmaW5hbGx5IHtcbiAgICAgICAgdW50cmFja2VkRW5kKHByZXZVKTtcbiAgICB9XG59XG5mdW5jdGlvbiBoYXNMaXN0ZW5lcnMobGlzdGVuYWJsZSkge1xuICAgIHJldHVybiBsaXN0ZW5hYmxlLmNoYW5nZUxpc3RlbmVycyAmJiBsaXN0ZW5hYmxlLmNoYW5nZUxpc3RlbmVycy5sZW5ndGggPiAwO1xufVxuZnVuY3Rpb24gcmVnaXN0ZXJMaXN0ZW5lcihsaXN0ZW5hYmxlLCBoYW5kbGVyKSB7XG4gICAgdmFyIGxpc3RlbmVycyA9IGxpc3RlbmFibGUuY2hhbmdlTGlzdGVuZXJzIHx8IChsaXN0ZW5hYmxlLmNoYW5nZUxpc3RlbmVycyA9IFtdKTtcbiAgICBsaXN0ZW5lcnMucHVzaChoYW5kbGVyKTtcbiAgICByZXR1cm4gb25jZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpZHggPSBsaXN0ZW5lcnMuaW5kZXhPZihoYW5kbGVyKTtcbiAgICAgICAgaWYgKGlkeCAhPT0gLTEpXG4gICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBub3RpZnlMaXN0ZW5lcnMobGlzdGVuYWJsZSwgY2hhbmdlKSB7XG4gICAgdmFyIHByZXZVID0gdW50cmFja2VkU3RhcnQoKTtcbiAgICB2YXIgbGlzdGVuZXJzID0gbGlzdGVuYWJsZS5jaGFuZ2VMaXN0ZW5lcnM7XG4gICAgaWYgKCFsaXN0ZW5lcnMpXG4gICAgICAgIHJldHVybjtcbiAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuc2xpY2UoKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgbGlzdGVuZXJzW2ldKGNoYW5nZSk7XG4gICAgfVxuICAgIHVudHJhY2tlZEVuZChwcmV2VSk7XG59XG5mdW5jdGlvbiBhc1JlZmVyZW5jZSh2YWx1ZSkge1xuICAgIGRlcHJlY2F0ZWQoXCJhc1JlZmVyZW5jZSBpcyBkZXByZWNhdGVkLCB1c2Ugb2JzZXJ2YWJsZS5yZWYgaW5zdGVhZFwiKTtcbiAgICByZXR1cm4gb2JzZXJ2YWJsZS5yZWYodmFsdWUpO1xufVxuZXhwb3J0cy5hc1JlZmVyZW5jZSA9IGFzUmVmZXJlbmNlO1xuZnVuY3Rpb24gYXNTdHJ1Y3R1cmUodmFsdWUpIHtcbiAgICBkZXByZWNhdGVkKFwiYXNTdHJ1Y3R1cmUgaXMgZGVwcmVjYXRlZC4gVXNlIG9ic2VydmFibGUuc3RydWN0LCBjb21wdXRlZC5zdHJ1Y3Qgb3IgcmVhY3Rpb24gb3B0aW9ucyBpbnN0ZWFkLlwiKTtcbiAgICByZXR1cm4gb2JzZXJ2YWJsZS5zdHJ1Y3QodmFsdWUpO1xufVxuZXhwb3J0cy5hc1N0cnVjdHVyZSA9IGFzU3RydWN0dXJlO1xuZnVuY3Rpb24gYXNGbGF0KHZhbHVlKSB7XG4gICAgZGVwcmVjYXRlZChcImFzRmxhdCBpcyBkZXByZWNhdGVkLCB1c2Ugb2JzZXJ2YWJsZS5zaGFsbG93IGluc3RlYWRcIik7XG4gICAgcmV0dXJuIG9ic2VydmFibGUuc2hhbGxvdyh2YWx1ZSk7XG59XG5leHBvcnRzLmFzRmxhdCA9IGFzRmxhdDtcbmZ1bmN0aW9uIGFzTWFwKGRhdGEpIHtcbiAgICBkZXByZWNhdGVkKFwiYXNNYXAgaXMgZGVwcmVjYXRlZCwgdXNlIG9ic2VydmFibGUubWFwIG9yIG9ic2VydmFibGUuc2hhbGxvd01hcCBpbnN0ZWFkXCIpO1xuICAgIHJldHVybiBvYnNlcnZhYmxlLm1hcChkYXRhIHx8IHt9KTtcbn1cbmV4cG9ydHMuYXNNYXAgPSBhc01hcDtcbmZ1bmN0aW9uIGlzTW9kaWZpZXJEZXNjcmlwdG9yKHRoaW5nKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB0aGluZyA9PT0gXCJvYmplY3RcIiAmJiB0aGluZyAhPT0gbnVsbCAmJiB0aGluZy5pc01vYnhNb2RpZmllckRlc2NyaXB0b3IgPT09IHRydWU7XG59XG5leHBvcnRzLmlzTW9kaWZpZXJEZXNjcmlwdG9yID0gaXNNb2RpZmllckRlc2NyaXB0b3I7XG5mdW5jdGlvbiBjcmVhdGVNb2RpZmllckRlc2NyaXB0b3IoZW5oYW5jZXIsIGluaXRpYWxWYWx1ZSkge1xuICAgIGludmFyaWFudCghaXNNb2RpZmllckRlc2NyaXB0b3IoaW5pdGlhbFZhbHVlKSwgXCJNb2RpZmllcnMgY2Fubm90IGJlIG5lc3RlZFwiKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBpc01vYnhNb2RpZmllckRlc2NyaXB0b3I6IHRydWUsXG4gICAgICAgIGluaXRpYWxWYWx1ZTogaW5pdGlhbFZhbHVlLFxuICAgICAgICBlbmhhbmNlcjogZW5oYW5jZXJcbiAgICB9O1xufVxuZnVuY3Rpb24gZGVlcEVuaGFuY2VyKHYsIF8sIG5hbWUpIHtcbiAgICBpZiAoaXNNb2RpZmllckRlc2NyaXB0b3IodikpXG4gICAgICAgIGZhaWwoXCJZb3UgdHJpZWQgdG8gYXNzaWduIGEgbW9kaWZpZXIgd3JhcHBlZCB2YWx1ZSB0byBhIGNvbGxlY3Rpb24sIHBsZWFzZSBkZWZpbmUgbW9kaWZpZXJzIHdoZW4gY3JlYXRpbmcgdGhlIGNvbGxlY3Rpb24sIG5vdCB3aGVuIG1vZGlmeWluZyBpdFwiKTtcbiAgICBpZiAoaXNPYnNlcnZhYmxlKHYpKVxuICAgICAgICByZXR1cm4gdjtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSlcbiAgICAgICAgcmV0dXJuIG9ic2VydmFibGUuYXJyYXkodiwgbmFtZSk7XG4gICAgaWYgKGlzUGxhaW5PYmplY3QodikpXG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlLm9iamVjdCh2LCBuYW1lKTtcbiAgICBpZiAoaXNFUzZNYXAodikpXG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlLm1hcCh2LCBuYW1lKTtcbiAgICByZXR1cm4gdjtcbn1cbmZ1bmN0aW9uIHNoYWxsb3dFbmhhbmNlcih2LCBfLCBuYW1lKSB7XG4gICAgaWYgKGlzTW9kaWZpZXJEZXNjcmlwdG9yKHYpKVxuICAgICAgICBmYWlsKFwiWW91IHRyaWVkIHRvIGFzc2lnbiBhIG1vZGlmaWVyIHdyYXBwZWQgdmFsdWUgdG8gYSBjb2xsZWN0aW9uLCBwbGVhc2UgZGVmaW5lIG1vZGlmaWVycyB3aGVuIGNyZWF0aW5nIHRoZSBjb2xsZWN0aW9uLCBub3Qgd2hlbiBtb2RpZnlpbmcgaXRcIik7XG4gICAgaWYgKHYgPT09IHVuZGVmaW5lZCB8fCB2ID09PSBudWxsKVxuICAgICAgICByZXR1cm4gdjtcbiAgICBpZiAoaXNPYnNlcnZhYmxlT2JqZWN0KHYpIHx8IGlzT2JzZXJ2YWJsZUFycmF5KHYpIHx8IGlzT2JzZXJ2YWJsZU1hcCh2KSlcbiAgICAgICAgcmV0dXJuIHY7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodikpXG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlLnNoYWxsb3dBcnJheSh2LCBuYW1lKTtcbiAgICBpZiAoaXNQbGFpbk9iamVjdCh2KSlcbiAgICAgICAgcmV0dXJuIG9ic2VydmFibGUuc2hhbGxvd09iamVjdCh2LCBuYW1lKTtcbiAgICBpZiAoaXNFUzZNYXAodikpXG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlLnNoYWxsb3dNYXAodiwgbmFtZSk7XG4gICAgcmV0dXJuIGZhaWwoXCJUaGUgc2hhbGxvdyBtb2RpZmllciAvIGRlY29yYXRvciBjYW4gb25seSB1c2VkIGluIGNvbWJpbmF0aW9uIHdpdGggYXJyYXlzLCBvYmplY3RzIGFuZCBtYXBzXCIpO1xufVxuZnVuY3Rpb24gcmVmZXJlbmNlRW5oYW5jZXIobmV3VmFsdWUpIHtcbiAgICByZXR1cm4gbmV3VmFsdWU7XG59XG5mdW5jdGlvbiBkZWVwU3RydWN0RW5oYW5jZXIodiwgb2xkVmFsdWUsIG5hbWUpIHtcbiAgICBpZiAoZGVlcEVxdWFsKHYsIG9sZFZhbHVlKSlcbiAgICAgICAgcmV0dXJuIG9sZFZhbHVlO1xuICAgIGlmIChpc09ic2VydmFibGUodikpXG4gICAgICAgIHJldHVybiB2O1xuICAgIGlmIChBcnJheS5pc0FycmF5KHYpKVxuICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGVBcnJheSh2LCBkZWVwU3RydWN0RW5oYW5jZXIsIG5hbWUpO1xuICAgIGlmIChpc0VTNk1hcCh2KSlcbiAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlTWFwKHYsIGRlZXBTdHJ1Y3RFbmhhbmNlciwgbmFtZSk7XG4gICAgaWYgKGlzUGxhaW5PYmplY3QodikpIHtcbiAgICAgICAgdmFyIHJlcyA9IHt9O1xuICAgICAgICBhc09ic2VydmFibGVPYmplY3QocmVzLCBuYW1lKTtcbiAgICAgICAgZXh0ZW5kT2JzZXJ2YWJsZUhlbHBlcihyZXMsIGRlZXBTdHJ1Y3RFbmhhbmNlciwgW3ZdKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgcmV0dXJuIHY7XG59XG5mdW5jdGlvbiByZWZTdHJ1Y3RFbmhhbmNlcih2LCBvbGRWYWx1ZSwgbmFtZSkge1xuICAgIGlmIChkZWVwRXF1YWwodiwgb2xkVmFsdWUpKVxuICAgICAgICByZXR1cm4gb2xkVmFsdWU7XG4gICAgcmV0dXJuIHY7XG59XG52YXIgTUFYX1NQTElDRV9TSVpFID0gMTAwMDA7XG52YXIgc2FmYXJpUHJvdG90eXBlU2V0dGVySW5oZXJpdGFuY2VCdWcgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciB2ID0gZmFsc2U7XG4gICAgdmFyIHAgPSB7fTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocCwgXCIwXCIsIHsgc2V0OiBmdW5jdGlvbiAoKSB7IHYgPSB0cnVlOyB9IH0pO1xuICAgIE9iamVjdC5jcmVhdGUocClbXCIwXCJdID0gMTtcbiAgICByZXR1cm4gdiA9PT0gZmFsc2U7XG59KSgpO1xudmFyIE9CU0VSVkFCTEVfQVJSQVlfQlVGRkVSX1NJWkUgPSAwO1xudmFyIFN0dWJBcnJheSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU3R1YkFycmF5KCkge1xuICAgIH1cbiAgICByZXR1cm4gU3R1YkFycmF5O1xufSgpKTtcblN0dWJBcnJheS5wcm90b3R5cGUgPSBbXTtcbnZhciBPYnNlcnZhYmxlQXJyYXlBZG1pbmlzdHJhdGlvbiA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gT2JzZXJ2YWJsZUFycmF5QWRtaW5pc3RyYXRpb24obmFtZSwgZW5oYW5jZXIsIGFycmF5LCBvd25lZCkge1xuICAgICAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMub3duZWQgPSBvd25lZDtcbiAgICAgICAgdGhpcy5sYXN0S25vd25MZW5ndGggPSAwO1xuICAgICAgICB0aGlzLmludGVyY2VwdG9ycyA9IG51bGw7XG4gICAgICAgIHRoaXMuY2hhbmdlTGlzdGVuZXJzID0gbnVsbDtcbiAgICAgICAgdGhpcy5hdG9tID0gbmV3IEJhc2VBdG9tKG5hbWUgfHwgKFwiT2JzZXJ2YWJsZUFycmF5QFwiICsgZ2V0TmV4dElkKCkpKTtcbiAgICAgICAgdGhpcy5lbmhhbmNlciA9IGZ1bmN0aW9uIChuZXdWLCBvbGRWKSB7IHJldHVybiBlbmhhbmNlcihuZXdWLCBvbGRWLCBuYW1lICsgXCJbLi5dXCIpOyB9O1xuICAgIH1cbiAgICBPYnNlcnZhYmxlQXJyYXlBZG1pbmlzdHJhdGlvbi5wcm90b3R5cGUuaW50ZXJjZXB0ID0gZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgcmV0dXJuIHJlZ2lzdGVySW50ZXJjZXB0b3IodGhpcywgaGFuZGxlcik7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlQXJyYXlBZG1pbmlzdHJhdGlvbi5wcm90b3R5cGUub2JzZXJ2ZSA9IGZ1bmN0aW9uIChsaXN0ZW5lciwgZmlyZUltbWVkaWF0ZWx5KSB7XG4gICAgICAgIGlmIChmaXJlSW1tZWRpYXRlbHkgPT09IHZvaWQgMCkgeyBmaXJlSW1tZWRpYXRlbHkgPSBmYWxzZTsgfVxuICAgICAgICBpZiAoZmlyZUltbWVkaWF0ZWx5KSB7XG4gICAgICAgICAgICBsaXN0ZW5lcih7XG4gICAgICAgICAgICAgICAgb2JqZWN0OiB0aGlzLmFycmF5LFxuICAgICAgICAgICAgICAgIHR5cGU6IFwic3BsaWNlXCIsXG4gICAgICAgICAgICAgICAgaW5kZXg6IDAsXG4gICAgICAgICAgICAgICAgYWRkZWQ6IHRoaXMudmFsdWVzLnNsaWNlKCksXG4gICAgICAgICAgICAgICAgYWRkZWRDb3VudDogdGhpcy52YWx1ZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJlbW92ZWQ6IFtdLFxuICAgICAgICAgICAgICAgIHJlbW92ZWRDb3VudDogMFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlZ2lzdGVyTGlzdGVuZXIodGhpcywgbGlzdGVuZXIpO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZUFycmF5QWRtaW5pc3RyYXRpb24ucHJvdG90eXBlLmdldEFycmF5TGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmF0b20ucmVwb3J0T2JzZXJ2ZWQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmxlbmd0aDtcbiAgICB9O1xuICAgIE9ic2VydmFibGVBcnJheUFkbWluaXN0cmF0aW9uLnByb3RvdHlwZS5zZXRBcnJheUxlbmd0aCA9IGZ1bmN0aW9uIChuZXdMZW5ndGgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBuZXdMZW5ndGggIT09IFwibnVtYmVyXCIgfHwgbmV3TGVuZ3RoIDwgMClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlttb2J4LmFycmF5XSBPdXQgb2YgcmFuZ2U6IFwiICsgbmV3TGVuZ3RoKTtcbiAgICAgICAgdmFyIGN1cnJlbnRMZW5ndGggPSB0aGlzLnZhbHVlcy5sZW5ndGg7XG4gICAgICAgIGlmIChuZXdMZW5ndGggPT09IGN1cnJlbnRMZW5ndGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGVsc2UgaWYgKG5ld0xlbmd0aCA+IGN1cnJlbnRMZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciBuZXdJdGVtcyA9IG5ldyBBcnJheShuZXdMZW5ndGggLSBjdXJyZW50TGVuZ3RoKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmV3TGVuZ3RoIC0gY3VycmVudExlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICAgIG5ld0l0ZW1zW2ldID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5zcGxpY2VXaXRoQXJyYXkoY3VycmVudExlbmd0aCwgMCwgbmV3SXRlbXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMuc3BsaWNlV2l0aEFycmF5KG5ld0xlbmd0aCwgY3VycmVudExlbmd0aCAtIG5ld0xlbmd0aCk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlQXJyYXlBZG1pbmlzdHJhdGlvbi5wcm90b3R5cGUudXBkYXRlQXJyYXlMZW5ndGggPSBmdW5jdGlvbiAob2xkTGVuZ3RoLCBkZWx0YSkge1xuICAgICAgICBpZiAob2xkTGVuZ3RoICE9PSB0aGlzLmxhc3RLbm93bkxlbmd0aClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlttb2J4XSBNb2RpZmljYXRpb24gZXhjZXB0aW9uOiB0aGUgaW50ZXJuYWwgc3RydWN0dXJlIG9mIGFuIG9ic2VydmFibGUgYXJyYXkgd2FzIGNoYW5nZWQuIERpZCB5b3UgdXNlIHBlZWsoKSB0byBjaGFuZ2UgaXQ/XCIpO1xuICAgICAgICB0aGlzLmxhc3RLbm93bkxlbmd0aCArPSBkZWx0YTtcbiAgICAgICAgaWYgKGRlbHRhID4gMCAmJiBvbGRMZW5ndGggKyBkZWx0YSArIDEgPiBPQlNFUlZBQkxFX0FSUkFZX0JVRkZFUl9TSVpFKVxuICAgICAgICAgICAgcmVzZXJ2ZUFycmF5QnVmZmVyKG9sZExlbmd0aCArIGRlbHRhICsgMSk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlQXJyYXlBZG1pbmlzdHJhdGlvbi5wcm90b3R5cGUuc3BsaWNlV2l0aEFycmF5ID0gZnVuY3Rpb24gKGluZGV4LCBkZWxldGVDb3VudCwgbmV3SXRlbXMpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgY2hlY2tJZlN0YXRlTW9kaWZpY2F0aW9uc0FyZUFsbG93ZWQodGhpcy5hdG9tKTtcbiAgICAgICAgdmFyIGxlbmd0aCA9IHRoaXMudmFsdWVzLmxlbmd0aDtcbiAgICAgICAgaWYgKGluZGV4ID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgIGVsc2UgaWYgKGluZGV4ID4gbGVuZ3RoKVxuICAgICAgICAgICAgaW5kZXggPSBsZW5ndGg7XG4gICAgICAgIGVsc2UgaWYgKGluZGV4IDwgMClcbiAgICAgICAgICAgIGluZGV4ID0gTWF0aC5tYXgoMCwgbGVuZ3RoICsgaW5kZXgpO1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSlcbiAgICAgICAgICAgIGRlbGV0ZUNvdW50ID0gbGVuZ3RoIC0gaW5kZXg7XG4gICAgICAgIGVsc2UgaWYgKGRlbGV0ZUNvdW50ID09PSB1bmRlZmluZWQgfHwgZGVsZXRlQ291bnQgPT09IG51bGwpXG4gICAgICAgICAgICBkZWxldGVDb3VudCA9IDA7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGRlbGV0ZUNvdW50ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oZGVsZXRlQ291bnQsIGxlbmd0aCAtIGluZGV4KSk7XG4gICAgICAgIGlmIChuZXdJdGVtcyA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgbmV3SXRlbXMgPSBbXTtcbiAgICAgICAgaWYgKGhhc0ludGVyY2VwdG9ycyh0aGlzKSkge1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGludGVyY2VwdENoYW5nZSh0aGlzLCB7XG4gICAgICAgICAgICAgICAgb2JqZWN0OiB0aGlzLmFycmF5LFxuICAgICAgICAgICAgICAgIHR5cGU6IFwic3BsaWNlXCIsXG4gICAgICAgICAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICAgICAgICAgIHJlbW92ZWRDb3VudDogZGVsZXRlQ291bnQsXG4gICAgICAgICAgICAgICAgYWRkZWQ6IG5ld0l0ZW1zXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghY2hhbmdlKVxuICAgICAgICAgICAgICAgIHJldHVybiBFTVBUWV9BUlJBWTtcbiAgICAgICAgICAgIGRlbGV0ZUNvdW50ID0gY2hhbmdlLnJlbW92ZWRDb3VudDtcbiAgICAgICAgICAgIG5ld0l0ZW1zID0gY2hhbmdlLmFkZGVkO1xuICAgICAgICB9XG4gICAgICAgIG5ld0l0ZW1zID0gbmV3SXRlbXMubWFwKGZ1bmN0aW9uICh2KSB7IHJldHVybiBfdGhpcy5lbmhhbmNlcih2LCB1bmRlZmluZWQpOyB9KTtcbiAgICAgICAgdmFyIGxlbmd0aERlbHRhID0gbmV3SXRlbXMubGVuZ3RoIC0gZGVsZXRlQ291bnQ7XG4gICAgICAgIHRoaXMudXBkYXRlQXJyYXlMZW5ndGgobGVuZ3RoLCBsZW5ndGhEZWx0YSk7XG4gICAgICAgIHZhciByZXMgPSB0aGlzLnNwbGljZUl0ZW1zSW50b1ZhbHVlcyhpbmRleCwgZGVsZXRlQ291bnQsIG5ld0l0ZW1zKTtcbiAgICAgICAgaWYgKGRlbGV0ZUNvdW50ICE9PSAwIHx8IG5ld0l0ZW1zLmxlbmd0aCAhPT0gMClcbiAgICAgICAgICAgIHRoaXMubm90aWZ5QXJyYXlTcGxpY2UoaW5kZXgsIG5ld0l0ZW1zLCByZXMpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZUFycmF5QWRtaW5pc3RyYXRpb24ucHJvdG90eXBlLnNwbGljZUl0ZW1zSW50b1ZhbHVlcyA9IGZ1bmN0aW9uIChpbmRleCwgZGVsZXRlQ291bnQsIG5ld0l0ZW1zKSB7XG4gICAgICAgIGlmIChuZXdJdGVtcy5sZW5ndGggPCBNQVhfU1BMSUNFX1NJWkUpIHtcbiAgICAgICAgICAgIHJldHVybiAoX2EgPSB0aGlzLnZhbHVlcykuc3BsaWNlLmFwcGx5KF9hLCBbaW5kZXgsIGRlbGV0ZUNvdW50XS5jb25jYXQobmV3SXRlbXMpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciByZXMgPSB0aGlzLnZhbHVlcy5zbGljZShpbmRleCwgaW5kZXggKyBkZWxldGVDb3VudCk7XG4gICAgICAgICAgICB0aGlzLnZhbHVlcyA9IHRoaXMudmFsdWVzLnNsaWNlKDAsIGluZGV4KS5jb25jYXQobmV3SXRlbXMsIHRoaXMudmFsdWVzLnNsaWNlKGluZGV4ICsgZGVsZXRlQ291bnQpKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9hO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZUFycmF5QWRtaW5pc3RyYXRpb24ucHJvdG90eXBlLm5vdGlmeUFycmF5Q2hpbGRVcGRhdGUgPSBmdW5jdGlvbiAoaW5kZXgsIG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgICB2YXIgbm90aWZ5U3B5ID0gIXRoaXMub3duZWQgJiYgaXNTcHlFbmFibGVkKCk7XG4gICAgICAgIHZhciBub3RpZnkgPSBoYXNMaXN0ZW5lcnModGhpcyk7XG4gICAgICAgIHZhciBjaGFuZ2UgPSBub3RpZnkgfHwgbm90aWZ5U3B5ID8ge1xuICAgICAgICAgICAgb2JqZWN0OiB0aGlzLmFycmF5LFxuICAgICAgICAgICAgdHlwZTogXCJ1cGRhdGVcIixcbiAgICAgICAgICAgIGluZGV4OiBpbmRleCwgbmV3VmFsdWU6IG5ld1ZhbHVlLCBvbGRWYWx1ZTogb2xkVmFsdWVcbiAgICAgICAgfSA6IG51bGw7XG4gICAgICAgIGlmIChub3RpZnlTcHkpXG4gICAgICAgICAgICBzcHlSZXBvcnRTdGFydChjaGFuZ2UpO1xuICAgICAgICB0aGlzLmF0b20ucmVwb3J0Q2hhbmdlZCgpO1xuICAgICAgICBpZiAobm90aWZ5KVxuICAgICAgICAgICAgbm90aWZ5TGlzdGVuZXJzKHRoaXMsIGNoYW5nZSk7XG4gICAgICAgIGlmIChub3RpZnlTcHkpXG4gICAgICAgICAgICBzcHlSZXBvcnRFbmQoKTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVBcnJheUFkbWluaXN0cmF0aW9uLnByb3RvdHlwZS5ub3RpZnlBcnJheVNwbGljZSA9IGZ1bmN0aW9uIChpbmRleCwgYWRkZWQsIHJlbW92ZWQpIHtcbiAgICAgICAgdmFyIG5vdGlmeVNweSA9ICF0aGlzLm93bmVkICYmIGlzU3B5RW5hYmxlZCgpO1xuICAgICAgICB2YXIgbm90aWZ5ID0gaGFzTGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICB2YXIgY2hhbmdlID0gbm90aWZ5IHx8IG5vdGlmeVNweSA/IHtcbiAgICAgICAgICAgIG9iamVjdDogdGhpcy5hcnJheSxcbiAgICAgICAgICAgIHR5cGU6IFwic3BsaWNlXCIsXG4gICAgICAgICAgICBpbmRleDogaW5kZXgsIHJlbW92ZWQ6IHJlbW92ZWQsIGFkZGVkOiBhZGRlZCxcbiAgICAgICAgICAgIHJlbW92ZWRDb3VudDogcmVtb3ZlZC5sZW5ndGgsXG4gICAgICAgICAgICBhZGRlZENvdW50OiBhZGRlZC5sZW5ndGhcbiAgICAgICAgfSA6IG51bGw7XG4gICAgICAgIGlmIChub3RpZnlTcHkpXG4gICAgICAgICAgICBzcHlSZXBvcnRTdGFydChjaGFuZ2UpO1xuICAgICAgICB0aGlzLmF0b20ucmVwb3J0Q2hhbmdlZCgpO1xuICAgICAgICBpZiAobm90aWZ5KVxuICAgICAgICAgICAgbm90aWZ5TGlzdGVuZXJzKHRoaXMsIGNoYW5nZSk7XG4gICAgICAgIGlmIChub3RpZnlTcHkpXG4gICAgICAgICAgICBzcHlSZXBvcnRFbmQoKTtcbiAgICB9O1xuICAgIHJldHVybiBPYnNlcnZhYmxlQXJyYXlBZG1pbmlzdHJhdGlvbjtcbn0oKSk7XG52YXIgT2JzZXJ2YWJsZUFycmF5ID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoT2JzZXJ2YWJsZUFycmF5LCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIE9ic2VydmFibGVBcnJheShpbml0aWFsVmFsdWVzLCBlbmhhbmNlciwgbmFtZSwgb3duZWQpIHtcbiAgICAgICAgaWYgKG5hbWUgPT09IHZvaWQgMCkgeyBuYW1lID0gXCJPYnNlcnZhYmxlQXJyYXlAXCIgKyBnZXROZXh0SWQoKTsgfVxuICAgICAgICBpZiAob3duZWQgPT09IHZvaWQgMCkgeyBvd25lZCA9IGZhbHNlOyB9XG4gICAgICAgIHZhciBfdGhpcyA9IF9zdXBlci5jYWxsKHRoaXMpIHx8IHRoaXM7XG4gICAgICAgIHZhciBhZG0gPSBuZXcgT2JzZXJ2YWJsZUFycmF5QWRtaW5pc3RyYXRpb24obmFtZSwgZW5oYW5jZXIsIF90aGlzLCBvd25lZCk7XG4gICAgICAgIGFkZEhpZGRlbkZpbmFsUHJvcChfdGhpcywgXCIkbW9ieFwiLCBhZG0pO1xuICAgICAgICBpZiAoaW5pdGlhbFZhbHVlcyAmJiBpbml0aWFsVmFsdWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgYWRtLnVwZGF0ZUFycmF5TGVuZ3RoKDAsIGluaXRpYWxWYWx1ZXMubGVuZ3RoKTtcbiAgICAgICAgICAgIGFkbS52YWx1ZXMgPSBpbml0aWFsVmFsdWVzLm1hcChmdW5jdGlvbiAodikgeyByZXR1cm4gZW5oYW5jZXIodiwgdW5kZWZpbmVkLCBuYW1lICsgXCJbLi5dXCIpOyB9KTtcbiAgICAgICAgICAgIGFkbS5ub3RpZnlBcnJheVNwbGljZSgwLCBhZG0udmFsdWVzLnNsaWNlKCksIEVNUFRZX0FSUkFZKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGFkbS52YWx1ZXMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2FmYXJpUHJvdG90eXBlU2V0dGVySW5oZXJpdGFuY2VCdWcpIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhZG0uYXJyYXksIFwiMFwiLCBFTlRSWV8wKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gX3RoaXM7XG4gICAgfVxuICAgIE9ic2VydmFibGVBcnJheS5wcm90b3R5cGUuaW50ZXJjZXB0ID0gZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuJG1vYnguaW50ZXJjZXB0KGhhbmRsZXIpO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZUFycmF5LnByb3RvdHlwZS5vYnNlcnZlID0gZnVuY3Rpb24gKGxpc3RlbmVyLCBmaXJlSW1tZWRpYXRlbHkpIHtcbiAgICAgICAgaWYgKGZpcmVJbW1lZGlhdGVseSA9PT0gdm9pZCAwKSB7IGZpcmVJbW1lZGlhdGVseSA9IGZhbHNlOyB9XG4gICAgICAgIHJldHVybiB0aGlzLiRtb2J4Lm9ic2VydmUobGlzdGVuZXIsIGZpcmVJbW1lZGlhdGVseSk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlQXJyYXkucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zcGxpY2UoMCk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlQXJyYXkucHJvdG90eXBlLmNvbmNhdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFycmF5cyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgYXJyYXlzW19pXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kbW9ieC5hdG9tLnJlcG9ydE9ic2VydmVkKCk7XG4gICAgICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KHRoaXMucGVlaygpLCBhcnJheXMubWFwKGZ1bmN0aW9uIChhKSB7IHJldHVybiBpc09ic2VydmFibGVBcnJheShhKSA/IGEucGVlaygpIDogYTsgfSkpO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZUFycmF5LnByb3RvdHlwZS5yZXBsYWNlID0gZnVuY3Rpb24gKG5ld0l0ZW1zKSB7XG4gICAgICAgIHJldHVybiB0aGlzLiRtb2J4LnNwbGljZVdpdGhBcnJheSgwLCB0aGlzLiRtb2J4LnZhbHVlcy5sZW5ndGgsIG5ld0l0ZW1zKTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVBcnJheS5wcm90b3R5cGUudG9KUyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2xpY2UoKTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVBcnJheS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b0pTKCk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlQXJyYXkucHJvdG90eXBlLnBlZWsgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLiRtb2J4LnZhbHVlcztcbiAgICB9O1xuICAgIE9ic2VydmFibGVBcnJheS5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uIChwcmVkaWNhdGUsIHRoaXNBcmcsIGZyb21JbmRleCkge1xuICAgICAgICBpZiAoZnJvbUluZGV4ID09PSB2b2lkIDApIHsgZnJvbUluZGV4ID0gMDsgfVxuICAgICAgICB0aGlzLiRtb2J4LmF0b20ucmVwb3J0T2JzZXJ2ZWQoKTtcbiAgICAgICAgdmFyIGl0ZW1zID0gdGhpcy4kbW9ieC52YWx1ZXMsIGwgPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGkgPSBmcm9tSW5kZXg7IGkgPCBsOyBpKyspXG4gICAgICAgICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywgaXRlbXNbaV0sIGksIHRoaXMpKVxuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtc1tpXTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9O1xuICAgIE9ic2VydmFibGVBcnJheS5wcm90b3R5cGUuc3BsaWNlID0gZnVuY3Rpb24gKGluZGV4LCBkZWxldGVDb3VudCkge1xuICAgICAgICB2YXIgbmV3SXRlbXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAyOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIG5ld0l0ZW1zW19pIC0gMl0gPSBhcmd1bWVudHNbX2ldO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kbW9ieC5zcGxpY2VXaXRoQXJyYXkoaW5kZXgpO1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRtb2J4LnNwbGljZVdpdGhBcnJheShpbmRleCwgZGVsZXRlQ291bnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLiRtb2J4LnNwbGljZVdpdGhBcnJheShpbmRleCwgZGVsZXRlQ291bnQsIG5ld0l0ZW1zKTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVBcnJheS5wcm90b3R5cGUuc3BsaWNlV2l0aEFycmF5ID0gZnVuY3Rpb24gKGluZGV4LCBkZWxldGVDb3VudCwgbmV3SXRlbXMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuJG1vYnguc3BsaWNlV2l0aEFycmF5KGluZGV4LCBkZWxldGVDb3VudCwgbmV3SXRlbXMpO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZUFycmF5LnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaXRlbXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIGl0ZW1zW19pXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFkbSA9IHRoaXMuJG1vYng7XG4gICAgICAgIGFkbS5zcGxpY2VXaXRoQXJyYXkoYWRtLnZhbHVlcy5sZW5ndGgsIDAsIGl0ZW1zKTtcbiAgICAgICAgcmV0dXJuIGFkbS52YWx1ZXMubGVuZ3RoO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZUFycmF5LnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNwbGljZShNYXRoLm1heCh0aGlzLiRtb2J4LnZhbHVlcy5sZW5ndGggLSAxLCAwKSwgMSlbMF07XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlQXJyYXkucHJvdG90eXBlLnNoaWZ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zcGxpY2UoMCwgMSlbMF07XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlQXJyYXkucHJvdG90eXBlLnVuc2hpZnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpdGVtcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgaXRlbXNbX2ldID0gYXJndW1lbnRzW19pXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYWRtID0gdGhpcy4kbW9ieDtcbiAgICAgICAgYWRtLnNwbGljZVdpdGhBcnJheSgwLCAwLCBpdGVtcyk7XG4gICAgICAgIHJldHVybiBhZG0udmFsdWVzLmxlbmd0aDtcbiAgICB9O1xuICAgIE9ic2VydmFibGVBcnJheS5wcm90b3R5cGUucmV2ZXJzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy4kbW9ieC5hdG9tLnJlcG9ydE9ic2VydmVkKCk7XG4gICAgICAgIHZhciBjbG9uZSA9IHRoaXMuc2xpY2UoKTtcbiAgICAgICAgcmV0dXJuIGNsb25lLnJldmVyc2UuYXBwbHkoY2xvbmUsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlQXJyYXkucHJvdG90eXBlLnNvcnQgPSBmdW5jdGlvbiAoY29tcGFyZUZuKSB7XG4gICAgICAgIHRoaXMuJG1vYnguYXRvbS5yZXBvcnRPYnNlcnZlZCgpO1xuICAgICAgICB2YXIgY2xvbmUgPSB0aGlzLnNsaWNlKCk7XG4gICAgICAgIHJldHVybiBjbG9uZS5zb3J0LmFwcGx5KGNsb25lLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZUFycmF5LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIGlkeCA9IHRoaXMuJG1vYngudmFsdWVzLmluZGV4T2YodmFsdWUpO1xuICAgICAgICBpZiAoaWR4ID4gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlQXJyYXkucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbiAoZnJvbUluZGV4LCB0b0luZGV4KSB7XG4gICAgICAgIGZ1bmN0aW9uIGNoZWNrSW5kZXgoaW5kZXgpIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA8IDApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJbbW9ieC5hcnJheV0gSW5kZXggb3V0IG9mIGJvdW5kczogXCIgKyBpbmRleCArIFwiIGlzIG5lZ2F0aXZlXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGxlbmd0aCA9IHRoaXMuJG1vYngudmFsdWVzLmxlbmd0aDtcbiAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJbbW9ieC5hcnJheV0gSW5kZXggb3V0IG9mIGJvdW5kczogXCIgKyBpbmRleCArIFwiIGlzIG5vdCBzbWFsbGVyIHRoYW4gXCIgKyBsZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNoZWNrSW5kZXguY2FsbCh0aGlzLCBmcm9tSW5kZXgpO1xuICAgICAgICBjaGVja0luZGV4LmNhbGwodGhpcywgdG9JbmRleCk7XG4gICAgICAgIGlmIChmcm9tSW5kZXggPT09IHRvSW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgb2xkSXRlbXMgPSB0aGlzLiRtb2J4LnZhbHVlcztcbiAgICAgICAgdmFyIG5ld0l0ZW1zO1xuICAgICAgICBpZiAoZnJvbUluZGV4IDwgdG9JbmRleCkge1xuICAgICAgICAgICAgbmV3SXRlbXMgPSBvbGRJdGVtcy5zbGljZSgwLCBmcm9tSW5kZXgpLmNvbmNhdChvbGRJdGVtcy5zbGljZShmcm9tSW5kZXggKyAxLCB0b0luZGV4ICsgMSksIFtvbGRJdGVtc1tmcm9tSW5kZXhdXSwgb2xkSXRlbXMuc2xpY2UodG9JbmRleCArIDEpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG5ld0l0ZW1zID0gb2xkSXRlbXMuc2xpY2UoMCwgdG9JbmRleCkuY29uY2F0KFtvbGRJdGVtc1tmcm9tSW5kZXhdXSwgb2xkSXRlbXMuc2xpY2UodG9JbmRleCwgZnJvbUluZGV4KSwgb2xkSXRlbXMuc2xpY2UoZnJvbUluZGV4ICsgMSkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVwbGFjZShuZXdJdGVtcyk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlQXJyYXkucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLiRtb2J4LmF0b20ucmVwb3J0T2JzZXJ2ZWQoKTtcbiAgICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS50b1N0cmluZy5hcHBseSh0aGlzLiRtb2J4LnZhbHVlcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVBcnJheS5wcm90b3R5cGUudG9Mb2NhbGVTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuJG1vYnguYXRvbS5yZXBvcnRPYnNlcnZlZCgpO1xuICAgICAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnRvTG9jYWxlU3RyaW5nLmFwcGx5KHRoaXMuJG1vYngudmFsdWVzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZUFycmF5LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgdmFyIGltcGwgPSB0aGlzLiRtb2J4O1xuICAgICAgICBpZiAoaW1wbCkge1xuICAgICAgICAgICAgaWYgKGluZGV4IDwgaW1wbC52YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaW1wbC5hdG9tLnJlcG9ydE9ic2VydmVkKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGltcGwudmFsdWVzW2luZGV4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIlttb2J4LmFycmF5XSBBdHRlbXB0IHRvIHJlYWQgYW4gYXJyYXkgaW5kZXggKFwiICsgaW5kZXggKyBcIikgdGhhdCBpcyBvdXQgb2YgYm91bmRzIChcIiArIGltcGwudmFsdWVzLmxlbmd0aCArIFwiKS4gUGxlYXNlIGNoZWNrIGxlbmd0aCBmaXJzdC4gT3V0IG9mIGJvdW5kIGluZGljZXMgd2lsbCBub3QgYmUgdHJhY2tlZCBieSBNb2JYXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlQXJyYXkucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChpbmRleCwgbmV3VmFsdWUpIHtcbiAgICAgICAgdmFyIGFkbSA9IHRoaXMuJG1vYng7XG4gICAgICAgIHZhciB2YWx1ZXMgPSBhZG0udmFsdWVzO1xuICAgICAgICBpZiAoaW5kZXggPCB2YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBjaGVja0lmU3RhdGVNb2RpZmljYXRpb25zQXJlQWxsb3dlZChhZG0uYXRvbSk7XG4gICAgICAgICAgICB2YXIgb2xkVmFsdWUgPSB2YWx1ZXNbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKGhhc0ludGVyY2VwdG9ycyhhZG0pKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGludGVyY2VwdENoYW5nZShhZG0sIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJ1cGRhdGVcIixcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgICAgICAgICAgICAgICBpbmRleDogaW5kZXgsIG5ld1ZhbHVlOiBuZXdWYWx1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICghY2hhbmdlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgbmV3VmFsdWUgPSBjaGFuZ2UubmV3VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdWYWx1ZSA9IGFkbS5lbmhhbmNlcihuZXdWYWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgICAgICAgdmFyIGNoYW5nZWQgPSBuZXdWYWx1ZSAhPT0gb2xkVmFsdWU7XG4gICAgICAgICAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgICAgICAgICAgIHZhbHVlc1tpbmRleF0gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICBhZG0ubm90aWZ5QXJyYXlDaGlsZFVwZGF0ZShpbmRleCwgbmV3VmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpbmRleCA9PT0gdmFsdWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgYWRtLnNwbGljZVdpdGhBcnJheShpbmRleCwgMCwgW25ld1ZhbHVlXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJbbW9ieC5hcnJheV0gSW5kZXggb3V0IG9mIGJvdW5kcywgXCIgKyBpbmRleCArIFwiIGlzIGxhcmdlciB0aGFuIFwiICsgdmFsdWVzLmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBPYnNlcnZhYmxlQXJyYXk7XG59KFN0dWJBcnJheSkpO1xuZGVjbGFyZUl0ZXJhdG9yKE9ic2VydmFibGVBcnJheS5wcm90b3R5cGUsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gYXJyYXlBc0l0ZXJhdG9yKHRoaXMuc2xpY2UoKSk7XG59KTtcbm1ha2VOb25FbnVtZXJhYmxlKE9ic2VydmFibGVBcnJheS5wcm90b3R5cGUsIFtcbiAgICBcImNvbnN0cnVjdG9yXCIsXG4gICAgXCJpbnRlcmNlcHRcIixcbiAgICBcIm9ic2VydmVcIixcbiAgICBcImNsZWFyXCIsXG4gICAgXCJjb25jYXRcIixcbiAgICBcImdldFwiLFxuICAgIFwicmVwbGFjZVwiLFxuICAgIFwidG9KU1wiLFxuICAgIFwidG9KU09OXCIsXG4gICAgXCJwZWVrXCIsXG4gICAgXCJmaW5kXCIsXG4gICAgXCJzcGxpY2VcIixcbiAgICBcInNwbGljZVdpdGhBcnJheVwiLFxuICAgIFwicHVzaFwiLFxuICAgIFwicG9wXCIsXG4gICAgXCJzZXRcIixcbiAgICBcInNoaWZ0XCIsXG4gICAgXCJ1bnNoaWZ0XCIsXG4gICAgXCJyZXZlcnNlXCIsXG4gICAgXCJzb3J0XCIsXG4gICAgXCJyZW1vdmVcIixcbiAgICBcIm1vdmVcIixcbiAgICBcInRvU3RyaW5nXCIsXG4gICAgXCJ0b0xvY2FsZVN0cmluZ1wiXG5dKTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShPYnNlcnZhYmxlQXJyYXkucHJvdG90eXBlLCBcImxlbmd0aFwiLCB7XG4gICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy4kbW9ieC5nZXRBcnJheUxlbmd0aCgpO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbiAobmV3TGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuJG1vYnguc2V0QXJyYXlMZW5ndGgobmV3TGVuZ3RoKTtcbiAgICB9XG59KTtcbltcbiAgICBcImV2ZXJ5XCIsXG4gICAgXCJmaWx0ZXJcIixcbiAgICBcImZvckVhY2hcIixcbiAgICBcImluZGV4T2ZcIixcbiAgICBcImpvaW5cIixcbiAgICBcImxhc3RJbmRleE9mXCIsXG4gICAgXCJtYXBcIixcbiAgICBcInJlZHVjZVwiLFxuICAgIFwicmVkdWNlUmlnaHRcIixcbiAgICBcInNsaWNlXCIsXG4gICAgXCJzb21lXCJcbl0uZm9yRWFjaChmdW5jdGlvbiAoZnVuY05hbWUpIHtcbiAgICB2YXIgYmFzZUZ1bmMgPSBBcnJheS5wcm90b3R5cGVbZnVuY05hbWVdO1xuICAgIGludmFyaWFudCh0eXBlb2YgYmFzZUZ1bmMgPT09IFwiZnVuY3Rpb25cIiwgXCJCYXNlIGZ1bmN0aW9uIG5vdCBkZWZpbmVkIG9uIEFycmF5IHByb3RvdHlwZTogJ1wiICsgZnVuY05hbWUgKyBcIidcIik7XG4gICAgYWRkSGlkZGVuUHJvcChPYnNlcnZhYmxlQXJyYXkucHJvdG90eXBlLCBmdW5jTmFtZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLiRtb2J4LmF0b20ucmVwb3J0T2JzZXJ2ZWQoKTtcbiAgICAgICAgcmV0dXJuIGJhc2VGdW5jLmFwcGx5KHRoaXMuJG1vYngudmFsdWVzLCBhcmd1bWVudHMpO1xuICAgIH0pO1xufSk7XG52YXIgRU5UUllfMCA9IGNyZWF0ZUFycmF5RW50cnlEZXNjcmlwdG9yKDApO1xuZnVuY3Rpb24gY3JlYXRlQXJyYXlFbnRyeURlc2NyaXB0b3IoaW5kZXgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXQoaW5kZXgpO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoaW5kZXgsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5mdW5jdGlvbiBjcmVhdGVBcnJheUJ1ZmZlckl0ZW0oaW5kZXgpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoT2JzZXJ2YWJsZUFycmF5LnByb3RvdHlwZSwgXCJcIiArIGluZGV4LCBjcmVhdGVBcnJheUVudHJ5RGVzY3JpcHRvcihpbmRleCkpO1xufVxuZnVuY3Rpb24gcmVzZXJ2ZUFycmF5QnVmZmVyKG1heCkge1xuICAgIGZvciAodmFyIGluZGV4ID0gT0JTRVJWQUJMRV9BUlJBWV9CVUZGRVJfU0laRTsgaW5kZXggPCBtYXg7IGluZGV4KyspXG4gICAgICAgIGNyZWF0ZUFycmF5QnVmZmVySXRlbShpbmRleCk7XG4gICAgT0JTRVJWQUJMRV9BUlJBWV9CVUZGRVJfU0laRSA9IG1heDtcbn1cbnJlc2VydmVBcnJheUJ1ZmZlcigxMDAwKTtcbnZhciBpc09ic2VydmFibGVBcnJheUFkbWluaXN0cmF0aW9uID0gY3JlYXRlSW5zdGFuY2VvZlByZWRpY2F0ZShcIk9ic2VydmFibGVBcnJheUFkbWluaXN0cmF0aW9uXCIsIE9ic2VydmFibGVBcnJheUFkbWluaXN0cmF0aW9uKTtcbmZ1bmN0aW9uIGlzT2JzZXJ2YWJsZUFycmF5KHRoaW5nKSB7XG4gICAgcmV0dXJuIGlzT2JqZWN0KHRoaW5nKSAmJiBpc09ic2VydmFibGVBcnJheUFkbWluaXN0cmF0aW9uKHRoaW5nLiRtb2J4KTtcbn1cbmV4cG9ydHMuaXNPYnNlcnZhYmxlQXJyYXkgPSBpc09ic2VydmFibGVBcnJheTtcbnZhciBPYnNlcnZhYmxlTWFwTWFya2VyID0ge307XG52YXIgT2JzZXJ2YWJsZU1hcCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gT2JzZXJ2YWJsZU1hcChpbml0aWFsRGF0YSwgZW5oYW5jZXIsIG5hbWUpIHtcbiAgICAgICAgaWYgKGVuaGFuY2VyID09PSB2b2lkIDApIHsgZW5oYW5jZXIgPSBkZWVwRW5oYW5jZXI7IH1cbiAgICAgICAgaWYgKG5hbWUgPT09IHZvaWQgMCkgeyBuYW1lID0gXCJPYnNlcnZhYmxlTWFwQFwiICsgZ2V0TmV4dElkKCk7IH1cbiAgICAgICAgdGhpcy5lbmhhbmNlciA9IGVuaGFuY2VyO1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLiRtb2J4ID0gT2JzZXJ2YWJsZU1hcE1hcmtlcjtcbiAgICAgICAgdGhpcy5fZGF0YSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIHRoaXMuX2hhc01hcCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIHRoaXMuX2tleXMgPSBuZXcgT2JzZXJ2YWJsZUFycmF5KHVuZGVmaW5lZCwgcmVmZXJlbmNlRW5oYW5jZXIsIHRoaXMubmFtZSArIFwiLmtleXMoKVwiLCB0cnVlKTtcbiAgICAgICAgdGhpcy5pbnRlcmNlcHRvcnMgPSBudWxsO1xuICAgICAgICB0aGlzLmNoYW5nZUxpc3RlbmVycyA9IG51bGw7XG4gICAgICAgIHRoaXMubWVyZ2UoaW5pdGlhbERhdGEpO1xuICAgIH1cbiAgICBPYnNlcnZhYmxlTWFwLnByb3RvdHlwZS5faGFzID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIHRoaXMuX2RhdGFba2V5XSAhPT0gXCJ1bmRlZmluZWRcIjtcbiAgICB9O1xuICAgIE9ic2VydmFibGVNYXAucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzVmFsaWRLZXkoa2V5KSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAga2V5ID0gXCJcIiArIGtleTtcbiAgICAgICAgaWYgKHRoaXMuX2hhc01hcFtrZXldKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhc01hcFtrZXldLmdldCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5fdXBkYXRlSGFzTWFwRW50cnkoa2V5LCBmYWxzZSkuZ2V0KCk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlTWFwLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLmFzc2VydFZhbGlkS2V5KGtleSk7XG4gICAgICAgIGtleSA9IFwiXCIgKyBrZXk7XG4gICAgICAgIHZhciBoYXNLZXkgPSB0aGlzLl9oYXMoa2V5KTtcbiAgICAgICAgaWYgKGhhc0ludGVyY2VwdG9ycyh0aGlzKSkge1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGludGVyY2VwdENoYW5nZSh0aGlzLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogaGFzS2V5ID8gXCJ1cGRhdGVcIiA6IFwiYWRkXCIsXG4gICAgICAgICAgICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgICAgICAgICAgIG5ld1ZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICBuYW1lOiBrZXlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFjaGFuZ2UpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB2YWx1ZSA9IGNoYW5nZS5uZXdWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGFzS2V5KSB7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGVWYWx1ZShrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2FkZFZhbHVlKGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZU1hcC5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB0aGlzLmFzc2VydFZhbGlkS2V5KGtleSk7XG4gICAgICAgIGtleSA9IFwiXCIgKyBrZXk7XG4gICAgICAgIGlmIChoYXNJbnRlcmNlcHRvcnModGhpcykpIHtcbiAgICAgICAgICAgIHZhciBjaGFuZ2UgPSBpbnRlcmNlcHRDaGFuZ2UodGhpcywge1xuICAgICAgICAgICAgICAgIHR5cGU6IFwiZGVsZXRlXCIsXG4gICAgICAgICAgICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgICAgICAgICAgIG5hbWU6IGtleVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIWNoYW5nZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2hhcyhrZXkpKSB7XG4gICAgICAgICAgICB2YXIgbm90aWZ5U3B5ID0gaXNTcHlFbmFibGVkKCk7XG4gICAgICAgICAgICB2YXIgbm90aWZ5ID0gaGFzTGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IG5vdGlmeSB8fCBub3RpZnlTcHkgPyB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJkZWxldGVcIixcbiAgICAgICAgICAgICAgICBvYmplY3Q6IHRoaXMsXG4gICAgICAgICAgICAgICAgb2xkVmFsdWU6IHRoaXMuX2RhdGFba2V5XS52YWx1ZSxcbiAgICAgICAgICAgICAgICBuYW1lOiBrZXlcbiAgICAgICAgICAgIH0gOiBudWxsO1xuICAgICAgICAgICAgaWYgKG5vdGlmeVNweSlcbiAgICAgICAgICAgICAgICBzcHlSZXBvcnRTdGFydChjaGFuZ2UpO1xuICAgICAgICAgICAgcnVuSW5UcmFuc2FjdGlvbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMuX2tleXMucmVtb3ZlKGtleSk7XG4gICAgICAgICAgICAgICAgX3RoaXMuX3VwZGF0ZUhhc01hcEVudHJ5KGtleSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIHZhciBvYnNlcnZhYmxlID0gX3RoaXMuX2RhdGFba2V5XTtcbiAgICAgICAgICAgICAgICBvYnNlcnZhYmxlLnNldE5ld1ZhbHVlKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgX3RoaXMuX2RhdGFba2V5XSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKG5vdGlmeSlcbiAgICAgICAgICAgICAgICBub3RpZnlMaXN0ZW5lcnModGhpcywgY2hhbmdlKTtcbiAgICAgICAgICAgIGlmIChub3RpZnlTcHkpXG4gICAgICAgICAgICAgICAgc3B5UmVwb3J0RW5kKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlTWFwLnByb3RvdHlwZS5fdXBkYXRlSGFzTWFwRW50cnkgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICB2YXIgZW50cnkgPSB0aGlzLl9oYXNNYXBba2V5XTtcbiAgICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgICAgICBlbnRyeS5zZXROZXdWYWx1ZSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlbnRyeSA9IHRoaXMuX2hhc01hcFtrZXldID0gbmV3IE9ic2VydmFibGVWYWx1ZSh2YWx1ZSwgcmVmZXJlbmNlRW5oYW5jZXIsIHRoaXMubmFtZSArIFwiLlwiICsga2V5ICsgXCI/XCIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZW50cnk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlTWFwLnByb3RvdHlwZS5fdXBkYXRlVmFsdWUgPSBmdW5jdGlvbiAobmFtZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgdmFyIG9ic2VydmFibGUgPSB0aGlzLl9kYXRhW25hbWVdO1xuICAgICAgICBuZXdWYWx1ZSA9IG9ic2VydmFibGUucHJlcGFyZU5ld1ZhbHVlKG5ld1ZhbHVlKTtcbiAgICAgICAgaWYgKG5ld1ZhbHVlICE9PSBVTkNIQU5HRUQpIHtcbiAgICAgICAgICAgIHZhciBub3RpZnlTcHkgPSBpc1NweUVuYWJsZWQoKTtcbiAgICAgICAgICAgIHZhciBub3RpZnkgPSBoYXNMaXN0ZW5lcnModGhpcyk7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gbm90aWZ5IHx8IG5vdGlmeVNweSA/IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcInVwZGF0ZVwiLFxuICAgICAgICAgICAgICAgIG9iamVjdDogdGhpcyxcbiAgICAgICAgICAgICAgICBvbGRWYWx1ZTogb2JzZXJ2YWJsZS52YWx1ZSxcbiAgICAgICAgICAgICAgICBuYW1lOiBuYW1lLCBuZXdWYWx1ZTogbmV3VmFsdWVcbiAgICAgICAgICAgIH0gOiBudWxsO1xuICAgICAgICAgICAgaWYgKG5vdGlmeVNweSlcbiAgICAgICAgICAgICAgICBzcHlSZXBvcnRTdGFydChjaGFuZ2UpO1xuICAgICAgICAgICAgb2JzZXJ2YWJsZS5zZXROZXdWYWx1ZShuZXdWYWx1ZSk7XG4gICAgICAgICAgICBpZiAobm90aWZ5KVxuICAgICAgICAgICAgICAgIG5vdGlmeUxpc3RlbmVycyh0aGlzLCBjaGFuZ2UpO1xuICAgICAgICAgICAgaWYgKG5vdGlmeVNweSlcbiAgICAgICAgICAgICAgICBzcHlSZXBvcnRFbmQoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgT2JzZXJ2YWJsZU1hcC5wcm90b3R5cGUuX2FkZFZhbHVlID0gZnVuY3Rpb24gKG5hbWUsIG5ld1ZhbHVlKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHJ1bkluVHJhbnNhY3Rpb24oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG9ic2VydmFibGUgPSBfdGhpcy5fZGF0YVtuYW1lXSA9IG5ldyBPYnNlcnZhYmxlVmFsdWUobmV3VmFsdWUsIF90aGlzLmVuaGFuY2VyLCBfdGhpcy5uYW1lICsgXCIuXCIgKyBuYW1lLCBmYWxzZSk7XG4gICAgICAgICAgICBuZXdWYWx1ZSA9IG9ic2VydmFibGUudmFsdWU7XG4gICAgICAgICAgICBfdGhpcy5fdXBkYXRlSGFzTWFwRW50cnkobmFtZSwgdHJ1ZSk7XG4gICAgICAgICAgICBfdGhpcy5fa2V5cy5wdXNoKG5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIG5vdGlmeVNweSA9IGlzU3B5RW5hYmxlZCgpO1xuICAgICAgICB2YXIgbm90aWZ5ID0gaGFzTGlzdGVuZXJzKHRoaXMpO1xuICAgICAgICB2YXIgY2hhbmdlID0gbm90aWZ5IHx8IG5vdGlmeVNweSA/IHtcbiAgICAgICAgICAgIHR5cGU6IFwiYWRkXCIsXG4gICAgICAgICAgICBvYmplY3Q6IHRoaXMsXG4gICAgICAgICAgICBuYW1lOiBuYW1lLCBuZXdWYWx1ZTogbmV3VmFsdWVcbiAgICAgICAgfSA6IG51bGw7XG4gICAgICAgIGlmIChub3RpZnlTcHkpXG4gICAgICAgICAgICBzcHlSZXBvcnRTdGFydChjaGFuZ2UpO1xuICAgICAgICBpZiAobm90aWZ5KVxuICAgICAgICAgICAgbm90aWZ5TGlzdGVuZXJzKHRoaXMsIGNoYW5nZSk7XG4gICAgICAgIGlmIChub3RpZnlTcHkpXG4gICAgICAgICAgICBzcHlSZXBvcnRFbmQoKTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVNYXAucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAga2V5ID0gXCJcIiArIGtleTtcbiAgICAgICAgaWYgKHRoaXMuaGFzKGtleSkpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZGF0YVtrZXldLmdldCgpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZU1hcC5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFycmF5QXNJdGVyYXRvcih0aGlzLl9rZXlzLnNsaWNlKCkpO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZU1hcC5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gYXJyYXlBc0l0ZXJhdG9yKHRoaXMuX2tleXMubWFwKHRoaXMuZ2V0LCB0aGlzKSk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlTWFwLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICByZXR1cm4gYXJyYXlBc0l0ZXJhdG9yKHRoaXMuX2tleXMubWFwKGZ1bmN0aW9uIChrZXkpIHsgcmV0dXJuIFtrZXksIF90aGlzLmdldChrZXkpXTsgfSkpO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZU1hcC5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIChjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB0aGlzLmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHsgcmV0dXJuIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgX3RoaXMuZ2V0KGtleSksIGtleSwgX3RoaXMpOyB9KTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVNYXAucHJvdG90eXBlLm1lcmdlID0gZnVuY3Rpb24gKG90aGVyKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmIChpc09ic2VydmFibGVNYXAob3RoZXIpKSB7XG4gICAgICAgICAgICBvdGhlciA9IG90aGVyLnRvSlMoKTtcbiAgICAgICAgfVxuICAgICAgICBydW5JblRyYW5zYWN0aW9uKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChpc1BsYWluT2JqZWN0KG90aGVyKSlcbiAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhvdGhlcikuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7IHJldHVybiBfdGhpcy5zZXQoa2V5LCBvdGhlcltrZXldKTsgfSk7XG4gICAgICAgICAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KG90aGVyKSlcbiAgICAgICAgICAgICAgICBvdGhlci5mb3JFYWNoKGZ1bmN0aW9uIChfYSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gX2FbMF0sIHZhbHVlID0gX2FbMV07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlbHNlIGlmIChpc0VTNk1hcChvdGhlcikpXG4gICAgICAgICAgICAgICAgb3RoZXIuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUsIGtleSkgeyByZXR1cm4gX3RoaXMuc2V0KGtleSwgdmFsdWUpOyB9KTtcbiAgICAgICAgICAgIGVsc2UgaWYgKG90aGVyICE9PSBudWxsICYmIG90aGVyICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgZmFpbChcIkNhbm5vdCBpbml0aWFsaXplIG1hcCBmcm9tIFwiICsgb3RoZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlTWFwLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgcnVuSW5UcmFuc2FjdGlvbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB1bnRyYWNrZWQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIF90aGlzLmtleXMoKS5mb3JFYWNoKF90aGlzLmRlbGV0ZSwgX3RoaXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZU1hcC5wcm90b3R5cGUucmVwbGFjZSA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgcnVuSW5UcmFuc2FjdGlvbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBfdGhpcy5jbGVhcigpO1xuICAgICAgICAgICAgX3RoaXMubWVyZ2UodmFsdWVzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE9ic2VydmFibGVNYXAucHJvdG90eXBlLCBcInNpemVcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9rZXlzLmxlbmd0aDtcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgT2JzZXJ2YWJsZU1hcC5wcm90b3R5cGUudG9KUyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdmFyIHJlcyA9IHt9O1xuICAgICAgICB0aGlzLmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHsgcmV0dXJuIHJlc1trZXldID0gX3RoaXMuZ2V0KGtleSk7IH0pO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZU1hcC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b0pTKCk7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlTWFwLnByb3RvdHlwZS5pc1ZhbGlkS2V5ID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBpZiAoa2V5ID09PSBudWxsIHx8IGtleSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2Yga2V5ID09PSBcIm51bWJlclwiIHx8IHR5cGVvZiBrZXkgPT09IFwiYm9vbGVhblwiKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVNYXAucHJvdG90eXBlLmFzc2VydFZhbGlkS2V5ID0gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNWYWxpZEtleShrZXkpKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiW21vYngubWFwXSBJbnZhbGlkIGtleTogJ1wiICsga2V5ICsgXCInLCBvbmx5IHN0cmluZ3MsIG51bWJlcnMgYW5kIGJvb2xlYW5zIGFyZSBhY2NlcHRlZCBhcyBrZXkgaW4gb2JzZXJ2YWJsZSBtYXBzLlwiKTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVNYXAucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICByZXR1cm4gdGhpcy5uYW1lICsgXCJbeyBcIiArIHRoaXMua2V5cygpLm1hcChmdW5jdGlvbiAoa2V5KSB7IHJldHVybiBrZXkgKyBcIjogXCIgKyAoXCJcIiArIF90aGlzLmdldChrZXkpKTsgfSkuam9pbihcIiwgXCIpICsgXCIgfV1cIjtcbiAgICB9O1xuICAgIE9ic2VydmFibGVNYXAucHJvdG90eXBlLm9ic2VydmUgPSBmdW5jdGlvbiAobGlzdGVuZXIsIGZpcmVJbW1lZGlhdGVseSkge1xuICAgICAgICBpbnZhcmlhbnQoZmlyZUltbWVkaWF0ZWx5ICE9PSB0cnVlLCBnZXRNZXNzYWdlKFwibTAzM1wiKSk7XG4gICAgICAgIHJldHVybiByZWdpc3Rlckxpc3RlbmVyKHRoaXMsIGxpc3RlbmVyKTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVNYXAucHJvdG90eXBlLmludGVyY2VwdCA9IGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIHJldHVybiByZWdpc3RlckludGVyY2VwdG9yKHRoaXMsIGhhbmRsZXIpO1xuICAgIH07XG4gICAgcmV0dXJuIE9ic2VydmFibGVNYXA7XG59KCkpO1xuZXhwb3J0cy5PYnNlcnZhYmxlTWFwID0gT2JzZXJ2YWJsZU1hcDtcbmRlY2xhcmVJdGVyYXRvcihPYnNlcnZhYmxlTWFwLnByb3RvdHlwZSwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmVudHJpZXMoKTtcbn0pO1xuZnVuY3Rpb24gbWFwKGluaXRpYWxWYWx1ZXMpIHtcbiAgICBkZXByZWNhdGVkKFwiYG1vYngubWFwYCBpcyBkZXByZWNhdGVkLCB1c2UgYG5ldyBPYnNlcnZhYmxlTWFwYCBvciBgbW9ieC5vYnNlcnZhYmxlLm1hcGAgaW5zdGVhZFwiKTtcbiAgICByZXR1cm4gb2JzZXJ2YWJsZS5tYXAoaW5pdGlhbFZhbHVlcyk7XG59XG5leHBvcnRzLm1hcCA9IG1hcDtcbnZhciBpc09ic2VydmFibGVNYXAgPSBjcmVhdGVJbnN0YW5jZW9mUHJlZGljYXRlKFwiT2JzZXJ2YWJsZU1hcFwiLCBPYnNlcnZhYmxlTWFwKTtcbmV4cG9ydHMuaXNPYnNlcnZhYmxlTWFwID0gaXNPYnNlcnZhYmxlTWFwO1xudmFyIE9ic2VydmFibGVPYmplY3RBZG1pbmlzdHJhdGlvbiA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gT2JzZXJ2YWJsZU9iamVjdEFkbWluaXN0cmF0aW9uKHRhcmdldCwgbmFtZSkge1xuICAgICAgICB0aGlzLnRhcmdldCA9IHRhcmdldDtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5jaGFuZ2VMaXN0ZW5lcnMgPSBudWxsO1xuICAgICAgICB0aGlzLmludGVyY2VwdG9ycyA9IG51bGw7XG4gICAgfVxuICAgIE9ic2VydmFibGVPYmplY3RBZG1pbmlzdHJhdGlvbi5wcm90b3R5cGUub2JzZXJ2ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaywgZmlyZUltbWVkaWF0ZWx5KSB7XG4gICAgICAgIGludmFyaWFudChmaXJlSW1tZWRpYXRlbHkgIT09IHRydWUsIFwiYG9ic2VydmVgIGRvZXNuJ3Qgc3VwcG9ydCB0aGUgZmlyZSBpbW1lZGlhdGVseSBwcm9wZXJ0eSBmb3Igb2JzZXJ2YWJsZSBvYmplY3RzLlwiKTtcbiAgICAgICAgcmV0dXJuIHJlZ2lzdGVyTGlzdGVuZXIodGhpcywgY2FsbGJhY2spO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZU9iamVjdEFkbWluaXN0cmF0aW9uLnByb3RvdHlwZS5pbnRlcmNlcHQgPSBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICByZXR1cm4gcmVnaXN0ZXJJbnRlcmNlcHRvcih0aGlzLCBoYW5kbGVyKTtcbiAgICB9O1xuICAgIHJldHVybiBPYnNlcnZhYmxlT2JqZWN0QWRtaW5pc3RyYXRpb247XG59KCkpO1xuZnVuY3Rpb24gYXNPYnNlcnZhYmxlT2JqZWN0KHRhcmdldCwgbmFtZSkge1xuICAgIGlmIChpc09ic2VydmFibGVPYmplY3QodGFyZ2V0KSlcbiAgICAgICAgcmV0dXJuIHRhcmdldC4kbW9ieDtcbiAgICBpbnZhcmlhbnQoT2JqZWN0LmlzRXh0ZW5zaWJsZSh0YXJnZXQpLCBnZXRNZXNzYWdlKFwibTAzNVwiKSk7XG4gICAgaWYgKCFpc1BsYWluT2JqZWN0KHRhcmdldCkpXG4gICAgICAgIG5hbWUgPSAodGFyZ2V0LmNvbnN0cnVjdG9yLm5hbWUgfHwgXCJPYnNlcnZhYmxlT2JqZWN0XCIpICsgXCJAXCIgKyBnZXROZXh0SWQoKTtcbiAgICBpZiAoIW5hbWUpXG4gICAgICAgIG5hbWUgPSBcIk9ic2VydmFibGVPYmplY3RAXCIgKyBnZXROZXh0SWQoKTtcbiAgICB2YXIgYWRtID0gbmV3IE9ic2VydmFibGVPYmplY3RBZG1pbmlzdHJhdGlvbih0YXJnZXQsIG5hbWUpO1xuICAgIGFkZEhpZGRlbkZpbmFsUHJvcCh0YXJnZXQsIFwiJG1vYnhcIiwgYWRtKTtcbiAgICByZXR1cm4gYWRtO1xufVxuZnVuY3Rpb24gZGVmaW5lT2JzZXJ2YWJsZVByb3BlcnR5RnJvbURlc2NyaXB0b3IoYWRtLCBwcm9wTmFtZSwgZGVzY3JpcHRvciwgZGVmYXVsdEVuaGFuY2VyKSB7XG4gICAgaWYgKGFkbS52YWx1ZXNbcHJvcE5hbWVdKSB7XG4gICAgICAgIGludmFyaWFudChcInZhbHVlXCIgaW4gZGVzY3JpcHRvciwgXCJUaGUgcHJvcGVydHkgXCIgKyBwcm9wTmFtZSArIFwiIGluIFwiICsgYWRtLm5hbWUgKyBcIiBpcyBhbHJlYWR5IG9ic2VydmFibGUsIGNhbm5vdCByZWRlZmluZSBpdCBhcyBjb21wdXRlZCBwcm9wZXJ0eVwiKTtcbiAgICAgICAgYWRtLnRhcmdldFtwcm9wTmFtZV0gPSBkZXNjcmlwdG9yLnZhbHVlO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikge1xuICAgICAgICBpZiAoaXNNb2RpZmllckRlc2NyaXB0b3IoZGVzY3JpcHRvci52YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhciBtb2RpZmllckRlc2NyaXB0b3IgPSBkZXNjcmlwdG9yLnZhbHVlO1xuICAgICAgICAgICAgZGVmaW5lT2JzZXJ2YWJsZVByb3BlcnR5KGFkbSwgcHJvcE5hbWUsIG1vZGlmaWVyRGVzY3JpcHRvci5pbml0aWFsVmFsdWUsIG1vZGlmaWVyRGVzY3JpcHRvci5lbmhhbmNlcik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXNBY3Rpb24oZGVzY3JpcHRvci52YWx1ZSkgJiYgZGVzY3JpcHRvci52YWx1ZS5hdXRvQmluZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgZGVmaW5lQm91bmRBY3Rpb24oYWRtLnRhcmdldCwgcHJvcE5hbWUsIGRlc2NyaXB0b3IudmFsdWUub3JpZ2luYWxGbik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXNDb21wdXRlZFZhbHVlKGRlc2NyaXB0b3IudmFsdWUpKSB7XG4gICAgICAgICAgICBkZWZpbmVDb21wdXRlZFByb3BlcnR5RnJvbUNvbXB1dGVkVmFsdWUoYWRtLCBwcm9wTmFtZSwgZGVzY3JpcHRvci52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkZWZpbmVPYnNlcnZhYmxlUHJvcGVydHkoYWRtLCBwcm9wTmFtZSwgZGVzY3JpcHRvci52YWx1ZSwgZGVmYXVsdEVuaGFuY2VyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGVmaW5lQ29tcHV0ZWRQcm9wZXJ0eShhZG0sIHByb3BOYW1lLCBkZXNjcmlwdG9yLmdldCwgZGVzY3JpcHRvci5zZXQsIGZhbHNlLCB0cnVlKTtcbiAgICB9XG59XG5mdW5jdGlvbiBkZWZpbmVPYnNlcnZhYmxlUHJvcGVydHkoYWRtLCBwcm9wTmFtZSwgbmV3VmFsdWUsIGVuaGFuY2VyKSB7XG4gICAgYXNzZXJ0UHJvcGVydHlDb25maWd1cmFibGUoYWRtLnRhcmdldCwgcHJvcE5hbWUpO1xuICAgIGlmIChoYXNJbnRlcmNlcHRvcnMoYWRtKSkge1xuICAgICAgICB2YXIgY2hhbmdlID0gaW50ZXJjZXB0Q2hhbmdlKGFkbSwge1xuICAgICAgICAgICAgb2JqZWN0OiBhZG0udGFyZ2V0LFxuICAgICAgICAgICAgbmFtZTogcHJvcE5hbWUsXG4gICAgICAgICAgICB0eXBlOiBcImFkZFwiLFxuICAgICAgICAgICAgbmV3VmFsdWU6IG5ld1ZhbHVlXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWNoYW5nZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgbmV3VmFsdWUgPSBjaGFuZ2UubmV3VmFsdWU7XG4gICAgfVxuICAgIHZhciBvYnNlcnZhYmxlID0gYWRtLnZhbHVlc1twcm9wTmFtZV0gPSBuZXcgT2JzZXJ2YWJsZVZhbHVlKG5ld1ZhbHVlLCBlbmhhbmNlciwgYWRtLm5hbWUgKyBcIi5cIiArIHByb3BOYW1lLCBmYWxzZSk7XG4gICAgbmV3VmFsdWUgPSBvYnNlcnZhYmxlLnZhbHVlO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhZG0udGFyZ2V0LCBwcm9wTmFtZSwgZ2VuZXJhdGVPYnNlcnZhYmxlUHJvcENvbmZpZyhwcm9wTmFtZSkpO1xuICAgIG5vdGlmeVByb3BlcnR5QWRkaXRpb24oYWRtLCBhZG0udGFyZ2V0LCBwcm9wTmFtZSwgbmV3VmFsdWUpO1xufVxuZnVuY3Rpb24gZGVmaW5lQ29tcHV0ZWRQcm9wZXJ0eShhZG0sIHByb3BOYW1lLCBnZXR0ZXIsIHNldHRlciwgY29tcGFyZVN0cnVjdHVyYWwsIGFzSW5zdGFuY2VQcm9wZXJ0eSkge1xuICAgIGlmIChhc0luc3RhbmNlUHJvcGVydHkpXG4gICAgICAgIGFzc2VydFByb3BlcnR5Q29uZmlndXJhYmxlKGFkbS50YXJnZXQsIHByb3BOYW1lKTtcbiAgICBhZG0udmFsdWVzW3Byb3BOYW1lXSA9IG5ldyBDb21wdXRlZFZhbHVlKGdldHRlciwgYWRtLnRhcmdldCwgY29tcGFyZVN0cnVjdHVyYWwsIGFkbS5uYW1lICsgXCIuXCIgKyBwcm9wTmFtZSwgc2V0dGVyKTtcbiAgICBpZiAoYXNJbnN0YW5jZVByb3BlcnR5KSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhZG0udGFyZ2V0LCBwcm9wTmFtZSwgZ2VuZXJhdGVDb21wdXRlZFByb3BDb25maWcocHJvcE5hbWUpKTtcbiAgICB9XG59XG5mdW5jdGlvbiBkZWZpbmVDb21wdXRlZFByb3BlcnR5RnJvbUNvbXB1dGVkVmFsdWUoYWRtLCBwcm9wTmFtZSwgY29tcHV0ZWRWYWx1ZSkge1xuICAgIHZhciBuYW1lID0gYWRtLm5hbWUgKyBcIi5cIiArIHByb3BOYW1lO1xuICAgIGNvbXB1dGVkVmFsdWUubmFtZSA9IG5hbWU7XG4gICAgaWYgKCFjb21wdXRlZFZhbHVlLnNjb3BlKVxuICAgICAgICBjb21wdXRlZFZhbHVlLnNjb3BlID0gYWRtLnRhcmdldDtcbiAgICBhZG0udmFsdWVzW3Byb3BOYW1lXSA9IGNvbXB1dGVkVmFsdWU7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGFkbS50YXJnZXQsIHByb3BOYW1lLCBnZW5lcmF0ZUNvbXB1dGVkUHJvcENvbmZpZyhwcm9wTmFtZSkpO1xufVxudmFyIG9ic2VydmFibGVQcm9wZXJ0eUNvbmZpZ3MgPSB7fTtcbnZhciBjb21wdXRlZFByb3BlcnR5Q29uZmlncyA9IHt9O1xuZnVuY3Rpb24gZ2VuZXJhdGVPYnNlcnZhYmxlUHJvcENvbmZpZyhwcm9wTmFtZSkge1xuICAgIHJldHVybiBvYnNlcnZhYmxlUHJvcGVydHlDb25maWdzW3Byb3BOYW1lXSB8fCAob2JzZXJ2YWJsZVByb3BlcnR5Q29uZmlnc1twcm9wTmFtZV0gPSB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kbW9ieC52YWx1ZXNbcHJvcE5hbWVdLmdldCgpO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICBzZXRQcm9wZXJ0eVZhbHVlKHRoaXMsIHByb3BOYW1lLCB2KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuZnVuY3Rpb24gZ2VuZXJhdGVDb21wdXRlZFByb3BDb25maWcocHJvcE5hbWUpIHtcbiAgICByZXR1cm4gY29tcHV0ZWRQcm9wZXJ0eUNvbmZpZ3NbcHJvcE5hbWVdIHx8IChjb21wdXRlZFByb3BlcnR5Q29uZmlnc1twcm9wTmFtZV0gPSB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJG1vYngudmFsdWVzW3Byb3BOYW1lXS5nZXQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJG1vYngudmFsdWVzW3Byb3BOYW1lXS5zZXQodik7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbmZ1bmN0aW9uIHNldFByb3BlcnR5VmFsdWUoaW5zdGFuY2UsIG5hbWUsIG5ld1ZhbHVlKSB7XG4gICAgdmFyIGFkbSA9IGluc3RhbmNlLiRtb2J4O1xuICAgIHZhciBvYnNlcnZhYmxlID0gYWRtLnZhbHVlc1tuYW1lXTtcbiAgICBpZiAoaGFzSW50ZXJjZXB0b3JzKGFkbSkpIHtcbiAgICAgICAgdmFyIGNoYW5nZSA9IGludGVyY2VwdENoYW5nZShhZG0sIHtcbiAgICAgICAgICAgIHR5cGU6IFwidXBkYXRlXCIsXG4gICAgICAgICAgICBvYmplY3Q6IGluc3RhbmNlLFxuICAgICAgICAgICAgbmFtZTogbmFtZSwgbmV3VmFsdWU6IG5ld1ZhbHVlXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWNoYW5nZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgbmV3VmFsdWUgPSBjaGFuZ2UubmV3VmFsdWU7XG4gICAgfVxuICAgIG5ld1ZhbHVlID0gb2JzZXJ2YWJsZS5wcmVwYXJlTmV3VmFsdWUobmV3VmFsdWUpO1xuICAgIGlmIChuZXdWYWx1ZSAhPT0gVU5DSEFOR0VEKSB7XG4gICAgICAgIHZhciBub3RpZnkgPSBoYXNMaXN0ZW5lcnMoYWRtKTtcbiAgICAgICAgdmFyIG5vdGlmeVNweSA9IGlzU3B5RW5hYmxlZCgpO1xuICAgICAgICB2YXIgY2hhbmdlID0gbm90aWZ5IHx8IG5vdGlmeVNweSA/IHtcbiAgICAgICAgICAgIHR5cGU6IFwidXBkYXRlXCIsXG4gICAgICAgICAgICBvYmplY3Q6IGluc3RhbmNlLFxuICAgICAgICAgICAgb2xkVmFsdWU6IG9ic2VydmFibGUudmFsdWUsXG4gICAgICAgICAgICBuYW1lOiBuYW1lLCBuZXdWYWx1ZTogbmV3VmFsdWVcbiAgICAgICAgfSA6IG51bGw7XG4gICAgICAgIGlmIChub3RpZnlTcHkpXG4gICAgICAgICAgICBzcHlSZXBvcnRTdGFydChjaGFuZ2UpO1xuICAgICAgICBvYnNlcnZhYmxlLnNldE5ld1ZhbHVlKG5ld1ZhbHVlKTtcbiAgICAgICAgaWYgKG5vdGlmeSlcbiAgICAgICAgICAgIG5vdGlmeUxpc3RlbmVycyhhZG0sIGNoYW5nZSk7XG4gICAgICAgIGlmIChub3RpZnlTcHkpXG4gICAgICAgICAgICBzcHlSZXBvcnRFbmQoKTtcbiAgICB9XG59XG5mdW5jdGlvbiBub3RpZnlQcm9wZXJ0eUFkZGl0aW9uKGFkbSwgb2JqZWN0LCBuYW1lLCBuZXdWYWx1ZSkge1xuICAgIHZhciBub3RpZnkgPSBoYXNMaXN0ZW5lcnMoYWRtKTtcbiAgICB2YXIgbm90aWZ5U3B5ID0gaXNTcHlFbmFibGVkKCk7XG4gICAgdmFyIGNoYW5nZSA9IG5vdGlmeSB8fCBub3RpZnlTcHkgPyB7XG4gICAgICAgIHR5cGU6IFwiYWRkXCIsXG4gICAgICAgIG9iamVjdDogb2JqZWN0LCBuYW1lOiBuYW1lLCBuZXdWYWx1ZTogbmV3VmFsdWVcbiAgICB9IDogbnVsbDtcbiAgICBpZiAobm90aWZ5U3B5KVxuICAgICAgICBzcHlSZXBvcnRTdGFydChjaGFuZ2UpO1xuICAgIGlmIChub3RpZnkpXG4gICAgICAgIG5vdGlmeUxpc3RlbmVycyhhZG0sIGNoYW5nZSk7XG4gICAgaWYgKG5vdGlmeVNweSlcbiAgICAgICAgc3B5UmVwb3J0RW5kKCk7XG59XG52YXIgaXNPYnNlcnZhYmxlT2JqZWN0QWRtaW5pc3RyYXRpb24gPSBjcmVhdGVJbnN0YW5jZW9mUHJlZGljYXRlKFwiT2JzZXJ2YWJsZU9iamVjdEFkbWluaXN0cmF0aW9uXCIsIE9ic2VydmFibGVPYmplY3RBZG1pbmlzdHJhdGlvbik7XG5mdW5jdGlvbiBpc09ic2VydmFibGVPYmplY3QodGhpbmcpIHtcbiAgICBpZiAoaXNPYmplY3QodGhpbmcpKSB7XG4gICAgICAgIHJ1bkxhenlJbml0aWFsaXplcnModGhpbmcpO1xuICAgICAgICByZXR1cm4gaXNPYnNlcnZhYmxlT2JqZWN0QWRtaW5pc3RyYXRpb24odGhpbmcuJG1vYngpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5leHBvcnRzLmlzT2JzZXJ2YWJsZU9iamVjdCA9IGlzT2JzZXJ2YWJsZU9iamVjdDtcbnZhciBVTkNIQU5HRUQgPSB7fTtcbnZhciBPYnNlcnZhYmxlVmFsdWUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhPYnNlcnZhYmxlVmFsdWUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gT2JzZXJ2YWJsZVZhbHVlKHZhbHVlLCBlbmhhbmNlciwgbmFtZSwgbm90aWZ5U3B5KSB7XG4gICAgICAgIGlmIChuYW1lID09PSB2b2lkIDApIHsgbmFtZSA9IFwiT2JzZXJ2YWJsZVZhbHVlQFwiICsgZ2V0TmV4dElkKCk7IH1cbiAgICAgICAgaWYgKG5vdGlmeVNweSA9PT0gdm9pZCAwKSB7IG5vdGlmeVNweSA9IHRydWU7IH1cbiAgICAgICAgdmFyIF90aGlzID0gX3N1cGVyLmNhbGwodGhpcywgbmFtZSkgfHwgdGhpcztcbiAgICAgICAgX3RoaXMuZW5oYW5jZXIgPSBlbmhhbmNlcjtcbiAgICAgICAgX3RoaXMuaGFzVW5yZXBvcnRlZENoYW5nZSA9IGZhbHNlO1xuICAgICAgICBfdGhpcy52YWx1ZSA9IGVuaGFuY2VyKHZhbHVlLCB1bmRlZmluZWQsIG5hbWUpO1xuICAgICAgICBpZiAobm90aWZ5U3B5ICYmIGlzU3B5RW5hYmxlZCgpKSB7XG4gICAgICAgICAgICBzcHlSZXBvcnQoeyB0eXBlOiBcImNyZWF0ZVwiLCBvYmplY3Q6IF90aGlzLCBuZXdWYWx1ZTogX3RoaXMudmFsdWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF90aGlzO1xuICAgIH1cbiAgICBPYnNlcnZhYmxlVmFsdWUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICB2YXIgb2xkVmFsdWUgPSB0aGlzLnZhbHVlO1xuICAgICAgICBuZXdWYWx1ZSA9IHRoaXMucHJlcGFyZU5ld1ZhbHVlKG5ld1ZhbHVlKTtcbiAgICAgICAgaWYgKG5ld1ZhbHVlICE9PSBVTkNIQU5HRUQpIHtcbiAgICAgICAgICAgIHZhciBub3RpZnlTcHkgPSBpc1NweUVuYWJsZWQoKTtcbiAgICAgICAgICAgIGlmIChub3RpZnlTcHkpIHtcbiAgICAgICAgICAgICAgICBzcHlSZXBvcnRTdGFydCh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwidXBkYXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogdGhpcyxcbiAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWU6IG5ld1ZhbHVlLCBvbGRWYWx1ZTogb2xkVmFsdWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2V0TmV3VmFsdWUobmV3VmFsdWUpO1xuICAgICAgICAgICAgaWYgKG5vdGlmeVNweSlcbiAgICAgICAgICAgICAgICBzcHlSZXBvcnRFbmQoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgT2JzZXJ2YWJsZVZhbHVlLnByb3RvdHlwZS5wcmVwYXJlTmV3VmFsdWUgPSBmdW5jdGlvbiAobmV3VmFsdWUpIHtcbiAgICAgICAgY2hlY2tJZlN0YXRlTW9kaWZpY2F0aW9uc0FyZUFsbG93ZWQodGhpcyk7XG4gICAgICAgIGlmIChoYXNJbnRlcmNlcHRvcnModGhpcykpIHtcbiAgICAgICAgICAgIHZhciBjaGFuZ2UgPSBpbnRlcmNlcHRDaGFuZ2UodGhpcywgeyBvYmplY3Q6IHRoaXMsIHR5cGU6IFwidXBkYXRlXCIsIG5ld1ZhbHVlOiBuZXdWYWx1ZSB9KTtcbiAgICAgICAgICAgIGlmICghY2hhbmdlKVxuICAgICAgICAgICAgICAgIHJldHVybiBVTkNIQU5HRUQ7XG4gICAgICAgICAgICBuZXdWYWx1ZSA9IGNoYW5nZS5uZXdWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBuZXdWYWx1ZSA9IHRoaXMuZW5oYW5jZXIobmV3VmFsdWUsIHRoaXMudmFsdWUsIHRoaXMubmFtZSk7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlICE9PSBuZXdWYWx1ZVxuICAgICAgICAgICAgPyBuZXdWYWx1ZVxuICAgICAgICAgICAgOiBVTkNIQU5HRUQ7XG4gICAgfTtcbiAgICBPYnNlcnZhYmxlVmFsdWUucHJvdG90eXBlLnNldE5ld1ZhbHVlID0gZnVuY3Rpb24gKG5ld1ZhbHVlKSB7XG4gICAgICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMudmFsdWU7XG4gICAgICAgIHRoaXMudmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgdGhpcy5yZXBvcnRDaGFuZ2VkKCk7XG4gICAgICAgIGlmIChoYXNMaXN0ZW5lcnModGhpcykpIHtcbiAgICAgICAgICAgIG5vdGlmeUxpc3RlbmVycyh0aGlzLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJ1cGRhdGVcIixcbiAgICAgICAgICAgICAgICBvYmplY3Q6IHRoaXMsXG4gICAgICAgICAgICAgICAgbmV3VmFsdWU6IG5ld1ZhbHVlLFxuICAgICAgICAgICAgICAgIG9sZFZhbHVlOiBvbGRWYWx1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIE9ic2VydmFibGVWYWx1ZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJlcG9ydE9ic2VydmVkKCk7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICAgIH07XG4gICAgT2JzZXJ2YWJsZVZhbHVlLnByb3RvdHlwZS5pbnRlcmNlcHQgPSBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICByZXR1cm4gcmVnaXN0ZXJJbnRlcmNlcHRvcih0aGlzLCBoYW5kbGVyKTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVWYWx1ZS5wcm90b3R5cGUub2JzZXJ2ZSA9IGZ1bmN0aW9uIChsaXN0ZW5lciwgZmlyZUltbWVkaWF0ZWx5KSB7XG4gICAgICAgIGlmIChmaXJlSW1tZWRpYXRlbHkpXG4gICAgICAgICAgICBsaXN0ZW5lcih7XG4gICAgICAgICAgICAgICAgb2JqZWN0OiB0aGlzLFxuICAgICAgICAgICAgICAgIHR5cGU6IFwidXBkYXRlXCIsXG4gICAgICAgICAgICAgICAgbmV3VmFsdWU6IHRoaXMudmFsdWUsXG4gICAgICAgICAgICAgICAgb2xkVmFsdWU6IHVuZGVmaW5lZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZWdpc3Rlckxpc3RlbmVyKHRoaXMsIGxpc3RlbmVyKTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVWYWx1ZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXQoKTtcbiAgICB9O1xuICAgIE9ic2VydmFibGVWYWx1ZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWUgKyBcIltcIiArIHRoaXMudmFsdWUgKyBcIl1cIjtcbiAgICB9O1xuICAgIE9ic2VydmFibGVWYWx1ZS5wcm90b3R5cGUudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRvUHJpbWl0aXZlKHRoaXMuZ2V0KCkpO1xuICAgIH07XG4gICAgcmV0dXJuIE9ic2VydmFibGVWYWx1ZTtcbn0oQmFzZUF0b20pKTtcbk9ic2VydmFibGVWYWx1ZS5wcm90b3R5cGVbcHJpbWl0aXZlU3ltYm9sKCldID0gT2JzZXJ2YWJsZVZhbHVlLnByb3RvdHlwZS52YWx1ZU9mO1xudmFyIGlzT2JzZXJ2YWJsZVZhbHVlID0gY3JlYXRlSW5zdGFuY2VvZlByZWRpY2F0ZShcIk9ic2VydmFibGVWYWx1ZVwiLCBPYnNlcnZhYmxlVmFsdWUpO1xuZXhwb3J0cy5pc0JveGVkT2JzZXJ2YWJsZSA9IGlzT2JzZXJ2YWJsZVZhbHVlO1xuZnVuY3Rpb24gZ2V0QXRvbSh0aGluZywgcHJvcGVydHkpIHtcbiAgICBpZiAodHlwZW9mIHRoaW5nID09PSBcIm9iamVjdFwiICYmIHRoaW5nICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChpc09ic2VydmFibGVBcnJheSh0aGluZykpIHtcbiAgICAgICAgICAgIGludmFyaWFudChwcm9wZXJ0eSA9PT0gdW5kZWZpbmVkLCBnZXRNZXNzYWdlKFwibTAzNlwiKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpbmcuJG1vYnguYXRvbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNPYnNlcnZhYmxlTWFwKHRoaW5nKSkge1xuICAgICAgICAgICAgdmFyIGFueVRoaW5nID0gdGhpbmc7XG4gICAgICAgICAgICBpZiAocHJvcGVydHkgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0QXRvbShhbnlUaGluZy5fa2V5cyk7XG4gICAgICAgICAgICB2YXIgb2JzZXJ2YWJsZV8yID0gYW55VGhpbmcuX2RhdGFbcHJvcGVydHldIHx8IGFueVRoaW5nLl9oYXNNYXBbcHJvcGVydHldO1xuICAgICAgICAgICAgaW52YXJpYW50KCEhb2JzZXJ2YWJsZV8yLCBcInRoZSBlbnRyeSAnXCIgKyBwcm9wZXJ0eSArIFwiJyBkb2VzIG5vdCBleGlzdCBpbiB0aGUgb2JzZXJ2YWJsZSBtYXAgJ1wiICsgZ2V0RGVidWdOYW1lKHRoaW5nKSArIFwiJ1wiKTtcbiAgICAgICAgICAgIHJldHVybiBvYnNlcnZhYmxlXzI7XG4gICAgICAgIH1cbiAgICAgICAgcnVuTGF6eUluaXRpYWxpemVycyh0aGluZyk7XG4gICAgICAgIGlmIChpc09ic2VydmFibGVPYmplY3QodGhpbmcpKSB7XG4gICAgICAgICAgICBpZiAoIXByb3BlcnR5KVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWlsKFwicGxlYXNlIHNwZWNpZnkgYSBwcm9wZXJ0eVwiKTtcbiAgICAgICAgICAgIHZhciBvYnNlcnZhYmxlXzMgPSB0aGluZy4kbW9ieC52YWx1ZXNbcHJvcGVydHldO1xuICAgICAgICAgICAgaW52YXJpYW50KCEhb2JzZXJ2YWJsZV8zLCBcIm5vIG9ic2VydmFibGUgcHJvcGVydHkgJ1wiICsgcHJvcGVydHkgKyBcIicgZm91bmQgb24gdGhlIG9ic2VydmFibGUgb2JqZWN0ICdcIiArIGdldERlYnVnTmFtZSh0aGluZykgKyBcIidcIik7XG4gICAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZV8zO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0F0b20odGhpbmcpIHx8IGlzQ29tcHV0ZWRWYWx1ZSh0aGluZykgfHwgaXNSZWFjdGlvbih0aGluZykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGluZztcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgdGhpbmcgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBpZiAoaXNSZWFjdGlvbih0aGluZy4kbW9ieCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGluZy4kbW9ieDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFpbChcIkNhbm5vdCBvYnRhaW4gYXRvbSBmcm9tIFwiICsgdGhpbmcpO1xufVxuZnVuY3Rpb24gZ2V0QWRtaW5pc3RyYXRpb24odGhpbmcsIHByb3BlcnR5KSB7XG4gICAgaW52YXJpYW50KHRoaW5nLCBcIkV4cGVjdGluZyBzb21lIG9iamVjdFwiKTtcbiAgICBpZiAocHJvcGVydHkgIT09IHVuZGVmaW5lZClcbiAgICAgICAgcmV0dXJuIGdldEFkbWluaXN0cmF0aW9uKGdldEF0b20odGhpbmcsIHByb3BlcnR5KSk7XG4gICAgaWYgKGlzQXRvbSh0aGluZykgfHwgaXNDb21wdXRlZFZhbHVlKHRoaW5nKSB8fCBpc1JlYWN0aW9uKHRoaW5nKSlcbiAgICAgICAgcmV0dXJuIHRoaW5nO1xuICAgIGlmIChpc09ic2VydmFibGVNYXAodGhpbmcpKVxuICAgICAgICByZXR1cm4gdGhpbmc7XG4gICAgcnVuTGF6eUluaXRpYWxpemVycyh0aGluZyk7XG4gICAgaWYgKHRoaW5nLiRtb2J4KVxuICAgICAgICByZXR1cm4gdGhpbmcuJG1vYng7XG4gICAgaW52YXJpYW50KGZhbHNlLCBcIkNhbm5vdCBvYnRhaW4gYWRtaW5pc3RyYXRpb24gZnJvbSBcIiArIHRoaW5nKTtcbn1cbmZ1bmN0aW9uIGdldERlYnVnTmFtZSh0aGluZywgcHJvcGVydHkpIHtcbiAgICB2YXIgbmFtZWQ7XG4gICAgaWYgKHByb3BlcnR5ICE9PSB1bmRlZmluZWQpXG4gICAgICAgIG5hbWVkID0gZ2V0QXRvbSh0aGluZywgcHJvcGVydHkpO1xuICAgIGVsc2UgaWYgKGlzT2JzZXJ2YWJsZU9iamVjdCh0aGluZykgfHwgaXNPYnNlcnZhYmxlTWFwKHRoaW5nKSlcbiAgICAgICAgbmFtZWQgPSBnZXRBZG1pbmlzdHJhdGlvbih0aGluZyk7XG4gICAgZWxzZVxuICAgICAgICBuYW1lZCA9IGdldEF0b20odGhpbmcpO1xuICAgIHJldHVybiBuYW1lZC5uYW1lO1xufVxuZnVuY3Rpb24gY3JlYXRlQ2xhc3NQcm9wZXJ0eURlY29yYXRvcihvbkluaXRpYWxpemUsIGdldCwgc2V0LCBlbnVtZXJhYmxlLCBhbGxvd0N1c3RvbUFyZ3VtZW50cykge1xuICAgIGZ1bmN0aW9uIGNsYXNzUHJvcGVydHlEZWNvcmF0b3IodGFyZ2V0LCBrZXksIGRlc2NyaXB0b3IsIGN1c3RvbUFyZ3MsIGFyZ0xlbikge1xuICAgICAgICBpZiAoYXJnTGVuID09PSB2b2lkIDApIHsgYXJnTGVuID0gMDsgfVxuICAgICAgICBpbnZhcmlhbnQoYWxsb3dDdXN0b21Bcmd1bWVudHMgfHwgcXVhY2tzTGlrZUFEZWNvcmF0b3IoYXJndW1lbnRzKSwgXCJUaGlzIGZ1bmN0aW9uIGlzIGEgZGVjb3JhdG9yLCBidXQgaXQgd2Fzbid0IGludm9rZWQgbGlrZSBhIGRlY29yYXRvclwiKTtcbiAgICAgICAgaWYgKCFkZXNjcmlwdG9yKSB7XG4gICAgICAgICAgICB2YXIgbmV3RGVzY3JpcHRvciA9IHtcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBlbnVtZXJhYmxlLFxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9fbW9ieEluaXRpYWxpemVkUHJvcHMgfHwgdGhpcy5fX21vYnhJbml0aWFsaXplZFByb3BzW2tleV0gIT09IHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlc2NyaXB0SW5pdGlhbGl6ZVByb3BlcnR5KHRoaXMsIGtleSwgdW5kZWZpbmVkLCBvbkluaXRpYWxpemUsIGN1c3RvbUFyZ3MsIGRlc2NyaXB0b3IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0LmNhbGwodGhpcywga2V5KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9fbW9ieEluaXRpYWxpemVkUHJvcHMgfHwgdGhpcy5fX21vYnhJbml0aWFsaXplZFByb3BzW2tleV0gIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVzY3JpcHRJbml0aWFsaXplUHJvcGVydHkodGhpcywga2V5LCB2LCBvbkluaXRpYWxpemUsIGN1c3RvbUFyZ3MsIGRlc2NyaXB0b3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0LmNhbGwodGhpcywga2V5LCB2KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gNSAmJiBhcmdMZW4gPCAzKSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCBuZXdEZXNjcmlwdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXdEZXNjcmlwdG9yO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh0YXJnZXQsIFwiX19tb2J4TGF6eUluaXRpYWxpemVyc1wiKSkge1xuICAgICAgICAgICAgICAgIGFkZEhpZGRlblByb3AodGFyZ2V0LCBcIl9fbW9ieExhenlJbml0aWFsaXplcnNcIiwgKHRhcmdldC5fX21vYnhMYXp5SW5pdGlhbGl6ZXJzICYmIHRhcmdldC5fX21vYnhMYXp5SW5pdGlhbGl6ZXJzLnNsaWNlKCkpIHx8IFtdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB2YWx1ZV8xID0gZGVzY3JpcHRvci52YWx1ZSwgaW5pdGlhbGl6ZXJfMSA9IGRlc2NyaXB0b3IuaW5pdGlhbGl6ZXI7XG4gICAgICAgICAgICB0YXJnZXQuX19tb2J4TGF6eUluaXRpYWxpemVycy5wdXNoKGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIG9uSW5pdGlhbGl6ZShpbnN0YW5jZSwga2V5LCAoaW5pdGlhbGl6ZXJfMSA/IGluaXRpYWxpemVyXzEuY2FsbChpbnN0YW5jZSkgOiB2YWx1ZV8xKSwgY3VzdG9tQXJncywgZGVzY3JpcHRvcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZW51bWVyYWJsZSwgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fX21vYnhEaWRSdW5MYXp5SW5pdGlhbGl6ZXJzICE9PSB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgcnVuTGF6eUluaXRpYWxpemVycyh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldC5jYWxsKHRoaXMsIGtleSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl9fbW9ieERpZFJ1bkxhenlJbml0aWFsaXplcnMgIT09IHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICBydW5MYXp5SW5pdGlhbGl6ZXJzKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICBzZXQuY2FsbCh0aGlzLCBrZXksIHYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGFsbG93Q3VzdG9tQXJndW1lbnRzKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAocXVhY2tzTGlrZUFEZWNvcmF0b3IoYXJndW1lbnRzKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gY2xhc3NQcm9wZXJ0eURlY29yYXRvci5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIG91dGVyQXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgIHZhciBhcmdMZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSwgZGVzY3JpcHRvcikgeyByZXR1cm4gY2xhc3NQcm9wZXJ0eURlY29yYXRvcih0YXJnZXQsIGtleSwgZGVzY3JpcHRvciwgb3V0ZXJBcmdzLCBhcmdMZW4pOyB9O1xuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gY2xhc3NQcm9wZXJ0eURlY29yYXRvcjtcbn1cbmZ1bmN0aW9uIHR5cGVzY3JpcHRJbml0aWFsaXplUHJvcGVydHkoaW5zdGFuY2UsIGtleSwgdiwgb25Jbml0aWFsaXplLCBjdXN0b21BcmdzLCBiYXNlRGVzY3JpcHRvcikge1xuICAgIGlmICghaGFzT3duUHJvcGVydHkoaW5zdGFuY2UsIFwiX19tb2J4SW5pdGlhbGl6ZWRQcm9wc1wiKSlcbiAgICAgICAgYWRkSGlkZGVuUHJvcChpbnN0YW5jZSwgXCJfX21vYnhJbml0aWFsaXplZFByb3BzXCIsIHt9KTtcbiAgICBpbnN0YW5jZS5fX21vYnhJbml0aWFsaXplZFByb3BzW2tleV0gPSB0cnVlO1xuICAgIG9uSW5pdGlhbGl6ZShpbnN0YW5jZSwga2V5LCB2LCBjdXN0b21BcmdzLCBiYXNlRGVzY3JpcHRvcik7XG59XG5mdW5jdGlvbiBydW5MYXp5SW5pdGlhbGl6ZXJzKGluc3RhbmNlKSB7XG4gICAgaWYgKGluc3RhbmNlLl9fbW9ieERpZFJ1bkxhenlJbml0aWFsaXplcnMgPT09IHRydWUpXG4gICAgICAgIHJldHVybjtcbiAgICBpZiAoaW5zdGFuY2UuX19tb2J4TGF6eUluaXRpYWxpemVycykge1xuICAgICAgICBhZGRIaWRkZW5Qcm9wKGluc3RhbmNlLCBcIl9fbW9ieERpZFJ1bkxhenlJbml0aWFsaXplcnNcIiwgdHJ1ZSk7XG4gICAgICAgIGluc3RhbmNlLl9fbW9ieERpZFJ1bkxhenlJbml0aWFsaXplcnMgJiYgaW5zdGFuY2UuX19tb2J4TGF6eUluaXRpYWxpemVycy5mb3JFYWNoKGZ1bmN0aW9uIChpbml0aWFsaXplcikgeyByZXR1cm4gaW5pdGlhbGl6ZXIoaW5zdGFuY2UpOyB9KTtcbiAgICB9XG59XG5mdW5jdGlvbiBxdWFja3NMaWtlQURlY29yYXRvcihhcmdzKSB7XG4gICAgcmV0dXJuIChhcmdzLmxlbmd0aCA9PT0gMiB8fCBhcmdzLmxlbmd0aCA9PT0gMykgJiYgdHlwZW9mIGFyZ3NbMV0gPT09IFwic3RyaW5nXCI7XG59XG5mdW5jdGlvbiBpdGVyYXRvclN5bWJvbCgpIHtcbiAgICByZXR1cm4gKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IpIHx8IFwiQEBpdGVyYXRvclwiO1xufVxudmFyIElTX0lURVJBVElOR19NQVJLRVIgPSBcIl9fJCRpdGVyYXRpbmdcIjtcbmZ1bmN0aW9uIGFycmF5QXNJdGVyYXRvcihhcnJheSkge1xuICAgIGludmFyaWFudChhcnJheVtJU19JVEVSQVRJTkdfTUFSS0VSXSAhPT0gdHJ1ZSwgXCJJbGxlZ2FsIHN0YXRlOiBjYW5ub3QgcmVjeWNsZSBhcnJheSBhcyBpdGVyYXRvclwiKTtcbiAgICBhZGRIaWRkZW5GaW5hbFByb3AoYXJyYXksIElTX0lURVJBVElOR19NQVJLRVIsIHRydWUpO1xuICAgIHZhciBpZHggPSAtMTtcbiAgICBhZGRIaWRkZW5GaW5hbFByb3AoYXJyYXksIFwibmV4dFwiLCBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICBpZHgrKztcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRvbmU6IGlkeCA+PSB0aGlzLmxlbmd0aCxcbiAgICAgICAgICAgIHZhbHVlOiBpZHggPCB0aGlzLmxlbmd0aCA/IHRoaXNbaWR4XSA6IHVuZGVmaW5lZFxuICAgICAgICB9O1xuICAgIH0pO1xuICAgIHJldHVybiBhcnJheTtcbn1cbmZ1bmN0aW9uIGRlY2xhcmVJdGVyYXRvcihwcm90b3RUeXBlLCBpdGVyYXRvckZhY3RvcnkpIHtcbiAgICBhZGRIaWRkZW5GaW5hbFByb3AocHJvdG90VHlwZSwgaXRlcmF0b3JTeW1ib2woKSwgaXRlcmF0b3JGYWN0b3J5KTtcbn1cbnZhciBtZXNzYWdlcyA9IHtcbiAgICBcIm0wMDFcIjogXCJJdCBpcyBub3QgYWxsb3dlZCB0byBhc3NpZ24gbmV3IHZhbHVlcyB0byBAYWN0aW9uIGZpZWxkc1wiLFxuICAgIFwibTAwMlwiOiBcImBydW5JbkFjdGlvbmAgZXhwZWN0cyBhIGZ1bmN0aW9uXCIsXG4gICAgXCJtMDAzXCI6IFwiYHJ1bkluQWN0aW9uYCBleHBlY3RzIGEgZnVuY3Rpb24gd2l0aG91dCBhcmd1bWVudHNcIixcbiAgICBcIm0wMDRcIjogXCJhdXRvcnVuIGV4cGVjdHMgYSBmdW5jdGlvblwiLFxuICAgIFwibTAwNVwiOiBcIldhcm5pbmc6IGF0dGVtcHRlZCB0byBwYXNzIGFuIGFjdGlvbiB0byBhdXRvcnVuLiBBY3Rpb25zIGFyZSB1bnRyYWNrZWQgYW5kIHdpbGwgbm90IHRyaWdnZXIgb24gc3RhdGUgY2hhbmdlcy4gVXNlIGByZWFjdGlvbmAgb3Igd3JhcCBvbmx5IHlvdXIgc3RhdGUgbW9kaWZpY2F0aW9uIGNvZGUgaW4gYW4gYWN0aW9uLlwiLFxuICAgIFwibTAwNlwiOiBcIldhcm5pbmc6IGF0dGVtcHRlZCB0byBwYXNzIGFuIGFjdGlvbiB0byBhdXRvcnVuQXN5bmMuIEFjdGlvbnMgYXJlIHVudHJhY2tlZCBhbmQgd2lsbCBub3QgdHJpZ2dlciBvbiBzdGF0ZSBjaGFuZ2VzLiBVc2UgYHJlYWN0aW9uYCBvciB3cmFwIG9ubHkgeW91ciBzdGF0ZSBtb2RpZmljYXRpb24gY29kZSBpbiBhbiBhY3Rpb24uXCIsXG4gICAgXCJtMDA3XCI6IFwicmVhY3Rpb24gb25seSBhY2NlcHRzIDIgb3IgMyBhcmd1bWVudHMuIElmIG1pZ3JhdGluZyBmcm9tIE1vYlggMiwgcGxlYXNlIHByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3RcIixcbiAgICBcIm0wMDhcIjogXCJ3cmFwcGluZyByZWFjdGlvbiBleHByZXNzaW9uIGluIGBhc1JlZmVyZW5jZWAgaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZCwgdXNlIG9wdGlvbnMgb2JqZWN0IGluc3RlYWRcIixcbiAgICBcIm0wMDlcIjogXCJAY29tcHV0ZWQgY2FuIG9ubHkgYmUgdXNlZCBvbiBnZXR0ZXIgZnVuY3Rpb25zLCBsaWtlOiAnQGNvbXB1dGVkIGdldCBteVByb3BzKCkgeyByZXR1cm4gLi4uOyB9Jy4gSXQgbG9va3MgbGlrZSBpdCB3YXMgdXNlZCBvbiBhIHByb3BlcnR5LlwiLFxuICAgIFwibTAxMFwiOiBcIkBjb21wdXRlZCBjYW4gb25seSBiZSB1c2VkIG9uIGdldHRlciBmdW5jdGlvbnMsIGxpa2U6ICdAY29tcHV0ZWQgZ2V0IG15UHJvcHMoKSB7IHJldHVybiAuLi47IH0nXCIsXG4gICAgXCJtMDExXCI6IFwiRmlyc3QgYXJndW1lbnQgdG8gYGNvbXB1dGVkYCBzaG91bGQgYmUgYW4gZXhwcmVzc2lvbi4gSWYgdXNpbmcgY29tcHV0ZWQgYXMgZGVjb3JhdG9yLCBkb24ndCBwYXNzIGl0IGFyZ3VtZW50c1wiLFxuICAgIFwibTAxMlwiOiBcImNvbXB1dGVkIHRha2VzIG9uZSBvciB0d28gYXJndW1lbnRzIGlmIHVzZWQgYXMgZnVuY3Rpb25cIixcbiAgICBcIm0wMTNcIjogXCJbbW9ieC5leHByXSAnZXhwcicgc2hvdWxkIG9ubHkgYmUgdXNlZCBpbnNpZGUgb3RoZXIgcmVhY3RpdmUgZnVuY3Rpb25zLlwiLFxuICAgIFwibTAxNFwiOiBcImV4dGVuZE9ic2VydmFibGUgZXhwZWN0ZWQgMiBvciBtb3JlIGFyZ3VtZW50c1wiLFxuICAgIFwibTAxNVwiOiBcImV4dGVuZE9ic2VydmFibGUgZXhwZWN0cyBhbiBvYmplY3QgYXMgZmlyc3QgYXJndW1lbnRcIixcbiAgICBcIm0wMTZcIjogXCJleHRlbmRPYnNlcnZhYmxlIHNob3VsZCBub3QgYmUgdXNlZCBvbiBtYXBzLCB1c2UgbWFwLm1lcmdlIGluc3RlYWRcIixcbiAgICBcIm0wMTdcIjogXCJhbGwgYXJndW1lbnRzIG9mIGV4dGVuZE9ic2VydmFibGUgc2hvdWxkIGJlIG9iamVjdHNcIixcbiAgICBcIm0wMThcIjogXCJleHRlbmRpbmcgYW4gb2JqZWN0IHdpdGggYW5vdGhlciBvYnNlcnZhYmxlIChvYmplY3QpIGlzIG5vdCBzdXBwb3J0ZWQuIFBsZWFzZSBjb25zdHJ1Y3QgYW4gZXhwbGljaXQgcHJvcGVydHltYXAsIHVzaW5nIGB0b0pTYCBpZiBuZWVkLiBTZWUgaXNzdWUgIzU0MFwiLFxuICAgIFwibTAxOVwiOiBcIlttb2J4LmlzT2JzZXJ2YWJsZV0gaXNPYnNlcnZhYmxlKG9iamVjdCwgcHJvcGVydHlOYW1lKSBpcyBub3Qgc3VwcG9ydGVkIGZvciBhcnJheXMgYW5kIG1hcHMuIFVzZSBtYXAuaGFzIG9yIGFycmF5Lmxlbmd0aCBpbnN0ZWFkLlwiLFxuICAgIFwibTAyMFwiOiBcIm1vZGlmaWVycyBjYW4gb25seSBiZSB1c2VkIGZvciBpbmRpdmlkdWFsIG9iamVjdCBwcm9wZXJ0aWVzXCIsXG4gICAgXCJtMDIxXCI6IFwib2JzZXJ2YWJsZSBleHBlY3RzIHplcm8gb3Igb25lIGFyZ3VtZW50c1wiLFxuICAgIFwibTAyMlwiOiBcIkBvYnNlcnZhYmxlIGNhbiBub3QgYmUgdXNlZCBvbiBnZXR0ZXJzLCB1c2UgQGNvbXB1dGVkIGluc3RlYWRcIixcbiAgICBcIm0wMjNcIjogXCJVc2luZyBgdHJhbnNhY3Rpb25gIGlzIGRlcHJlY2F0ZWQsIHVzZSBgcnVuSW5BY3Rpb25gIG9yIGAoQClhY3Rpb25gIGluc3RlYWQuXCIsXG4gICAgXCJtMDI0XCI6IFwid2h5UnVuKCkgY2FuIG9ubHkgYmUgdXNlZCBpZiBhIGRlcml2YXRpb24gaXMgYWN0aXZlLCBvciBieSBwYXNzaW5nIGFuIGNvbXB1dGVkIHZhbHVlIC8gcmVhY3Rpb24gZXhwbGljaXRseS4gSWYgeW91IGludm9rZWQgd2h5UnVuIGZyb20gaW5zaWRlIGEgY29tcHV0YXRpb247IHRoZSBjb21wdXRhdGlvbiBpcyBjdXJyZW50bHkgc3VzcGVuZGVkIGJ1dCByZS1ldmFsdWF0aW5nIGJlY2F1c2Ugc29tZWJvZHkgcmVxdWVzdGVkIGl0cyB2YWx1ZS5cIixcbiAgICBcIm0wMjVcIjogXCJ3aHlSdW4gY2FuIG9ubHkgYmUgdXNlZCBvbiByZWFjdGlvbnMgYW5kIGNvbXB1dGVkIHZhbHVlc1wiLFxuICAgIFwibTAyNlwiOiBcImBhY3Rpb25gIGNhbiBvbmx5IGJlIGludm9rZWQgb24gZnVuY3Rpb25zXCIsXG4gICAgXCJtMDI4XCI6IFwiSXQgaXMgbm90IGFsbG93ZWQgdG8gc2V0IGB1c2VTdHJpY3RgIHdoZW4gYSBkZXJpdmF0aW9uIGlzIHJ1bm5pbmdcIixcbiAgICBcIm0wMjlcIjogXCJJTlRFUk5BTCBFUlJPUiBvbmx5IG9uQmVjb21lVW5vYnNlcnZlZCBzaG91bGRuJ3QgYmUgY2FsbGVkIHR3aWNlIGluIGEgcm93XCIsXG4gICAgXCJtMDMwYVwiOiBcIlNpbmNlIHN0cmljdC1tb2RlIGlzIGVuYWJsZWQsIGNoYW5naW5nIG9ic2VydmVkIG9ic2VydmFibGUgdmFsdWVzIG91dHNpZGUgYWN0aW9ucyBpcyBub3QgYWxsb3dlZC4gUGxlYXNlIHdyYXAgdGhlIGNvZGUgaW4gYW4gYGFjdGlvbmAgaWYgdGhpcyBjaGFuZ2UgaXMgaW50ZW5kZWQuIFRyaWVkIHRvIG1vZGlmeTogXCIsXG4gICAgXCJtMDMwYlwiOiBcIlNpZGUgZWZmZWN0cyBsaWtlIGNoYW5naW5nIHN0YXRlIGFyZSBub3QgYWxsb3dlZCBhdCB0aGlzIHBvaW50LiBBcmUgeW91IHRyeWluZyB0byBtb2RpZnkgc3RhdGUgZnJvbSwgZm9yIGV4YW1wbGUsIHRoZSByZW5kZXIgZnVuY3Rpb24gb2YgYSBSZWFjdCBjb21wb25lbnQ/IFRyaWVkIHRvIG1vZGlmeTogXCIsXG4gICAgXCJtMDMxXCI6IFwiQ29tcHV0ZWQgdmFsdWVzIGFyZSBub3QgYWxsb3dlZCB0byBub3QgY2F1c2Ugc2lkZSBlZmZlY3RzIGJ5IGNoYW5naW5nIG9ic2VydmFibGVzIHRoYXQgYXJlIGFscmVhZHkgYmVpbmcgb2JzZXJ2ZWQuIFRyaWVkIHRvIG1vZGlmeTogXCIsXG4gICAgXCJtMDMyXCI6IFwiKiBUaGlzIGNvbXB1dGF0aW9uIGlzIHN1c3BlbmRlZCAobm90IGluIHVzZSBieSBhbnkgcmVhY3Rpb24pIGFuZCB3b24ndCBydW4gYXV0b21hdGljYWxseS5cXG5cdERpZG4ndCBleHBlY3QgdGhpcyBjb21wdXRhdGlvbiB0byBiZSBzdXNwZW5kZWQgYXQgdGhpcyBwb2ludD9cXG5cdCAgMS4gTWFrZSBzdXJlIHRoaXMgY29tcHV0YXRpb24gaXMgdXNlZCBieSBhIHJlYWN0aW9uIChyZWFjdGlvbiwgYXV0b3J1biwgb2JzZXJ2ZXIpLlxcblx0ICAyLiBDaGVjayB3aGV0aGVyIHlvdSBhcmUgdXNpbmcgdGhpcyBjb21wdXRhdGlvbiBzeW5jaHJvbm91c2x5IChpbiB0aGUgc2FtZSBzdGFjayBhcyB0aGV5IHJlYWN0aW9uIHRoYXQgbmVlZHMgaXQpLlwiLFxuICAgIFwibTAzM1wiOiBcImBvYnNlcnZlYCBkb2Vzbid0IHN1cHBvcnQgdGhlIGZpcmUgaW1tZWRpYXRlbHkgcHJvcGVydHkgZm9yIG9ic2VydmFibGUgbWFwcy5cIixcbiAgICBcIm0wMzRcIjogXCJgbW9ieC5tYXBgIGlzIGRlcHJlY2F0ZWQsIHVzZSBgbmV3IE9ic2VydmFibGVNYXBgIG9yIGBtb2J4Lm9ic2VydmFibGUubWFwYCBpbnN0ZWFkXCIsXG4gICAgXCJtMDM1XCI6IFwiQ2Fubm90IG1ha2UgdGhlIGRlc2lnbmF0ZWQgb2JqZWN0IG9ic2VydmFibGU7IGl0IGlzIG5vdCBleHRlbnNpYmxlXCIsXG4gICAgXCJtMDM2XCI6IFwiSXQgaXMgbm90IHBvc3NpYmxlIHRvIGdldCBpbmRleCBhdG9tcyBmcm9tIGFycmF5c1wiLFxuICAgIFwibTAzN1wiOiBcIkhpIHRoZXJlISBJJ20gc29ycnkgeW91IGhhdmUganVzdCBydW4gaW50byBhbiBleGNlcHRpb24uXFxuSWYgeW91ciBkZWJ1Z2dlciBlbmRzIHVwIGhlcmUsIGtub3cgdGhhdCBzb21lIHJlYWN0aW9uIChsaWtlIHRoZSByZW5kZXIoKSBvZiBhbiBvYnNlcnZlciBjb21wb25lbnQsIGF1dG9ydW4gb3IgcmVhY3Rpb24pXFxudGhyZXcgYW4gZXhjZXB0aW9uIGFuZCB0aGF0IG1vYnggY2F1Z2h0IGl0LCB0byBhdm9pZCB0aGF0IGl0IGJyaW5ncyB0aGUgcmVzdCBvZiB5b3VyIGFwcGxpY2F0aW9uIGRvd24uXFxuVGhlIG9yaWdpbmFsIGNhdXNlIG9mIHRoZSBleGNlcHRpb24gKHRoZSBjb2RlIHRoYXQgY2F1c2VkIHRoaXMgcmVhY3Rpb24gdG8gcnVuIChhZ2FpbikpLCBpcyBzdGlsbCBpbiB0aGUgc3RhY2suXFxuXFxuSG93ZXZlciwgbW9yZSBpbnRlcmVzdGluZyBpcyB0aGUgYWN0dWFsIHN0YWNrIHRyYWNlIG9mIHRoZSBlcnJvciBpdHNlbGYuXFxuSG9wZWZ1bGx5IHRoZSBlcnJvciBpcyBhbiBpbnN0YW5jZW9mIEVycm9yLCBiZWNhdXNlIGluIHRoYXQgY2FzZSB5b3UgY2FuIGluc3BlY3QgdGhlIG9yaWdpbmFsIHN0YWNrIG9mIHRoZSBlcnJvciBmcm9tIHdoZXJlIGl0IHdhcyB0aHJvd24uXFxuU2VlIGBlcnJvci5zdGFja2AgcHJvcGVydHksIG9yIHByZXNzIHRoZSB2ZXJ5IHN1YnRsZSBcXFwiKC4uLilcXFwiIGxpbmsgeW91IHNlZSBuZWFyIHRoZSBjb25zb2xlLmVycm9yIG1lc3NhZ2UgdGhhdCBwcm9iYWJseSBicm91Z2h0IHlvdSBoZXJlLlxcblRoYXQgc3RhY2sgaXMgbW9yZSBpbnRlcmVzdGluZyB0aGFuIHRoZSBzdGFjayBvZiB0aGlzIGNvbnNvbGUuZXJyb3IgaXRzZWxmLlxcblxcbklmIHRoZSBleGNlcHRpb24geW91IHNlZSBpcyBhbiBleGNlcHRpb24geW91IGNyZWF0ZWQgeW91cnNlbGYsIG1ha2Ugc3VyZSB0byB1c2UgYHRocm93IG5ldyBFcnJvcihcXFwiT29wc1xcXCIpYCBpbnN0ZWFkIG9mIGB0aHJvdyBcXFwiT29wc1xcXCJgLFxcbmJlY2F1c2UgdGhlIGphdmFzY3JpcHQgZW52aXJvbm1lbnQgd2lsbCBvbmx5IHByZXNlcnZlIHRoZSBvcmlnaW5hbCBzdGFjayB0cmFjZSBpbiB0aGUgZmlyc3QgZm9ybS5cXG5cXG5Zb3UgY2FuIGFsc28gbWFrZSBzdXJlIHRoZSBkZWJ1Z2dlciBwYXVzZXMgdGhlIG5leHQgdGltZSB0aGlzIHZlcnkgc2FtZSBleGNlcHRpb24gaXMgdGhyb3duIGJ5IGVuYWJsaW5nIFxcXCJQYXVzZSBvbiBjYXVnaHQgZXhjZXB0aW9uXFxcIi5cXG4oTm90ZSB0aGF0IGl0IG1pZ2h0IHBhdXNlIG9uIG1hbnkgb3RoZXIsIHVucmVsYXRlZCBleGNlcHRpb24gYXMgd2VsbCkuXFxuXFxuSWYgdGhhdCBhbGwgZG9lc24ndCBoZWxwIHlvdSBvdXQsIGZlZWwgZnJlZSB0byBvcGVuIGFuIGlzc3VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tb2J4anMvbW9ieC9pc3N1ZXMhXFxuXCIsXG4gICAgXCJtMDM4XCI6IFwiTWlzc2luZyBpdGVtcyBpbiB0aGlzIGxpc3Q/XFxuICAgIDEuIENoZWNrIHdoZXRoZXIgYWxsIHVzZWQgdmFsdWVzIGFyZSBwcm9wZXJseSBtYXJrZWQgYXMgb2JzZXJ2YWJsZSAodXNlIGlzT2JzZXJ2YWJsZSB0byB2ZXJpZnkpXFxuICAgIDIuIE1ha2Ugc3VyZSB5b3UgZGlkbid0IGRlcmVmZXJlbmNlIHZhbHVlcyB0b28gZWFybHkuIE1vYlggb2JzZXJ2ZXMgcHJvcHMsIG5vdCBwcmltaXRpdmVzLiBFLmc6IHVzZSAncGVyc29uLm5hbWUnIGluc3RlYWQgb2YgJ25hbWUnIGluIHlvdXIgY29tcHV0YXRpb24uXFxuXCJcbn07XG5mdW5jdGlvbiBnZXRNZXNzYWdlKGlkKSB7XG4gICAgcmV0dXJuIG1lc3NhZ2VzW2lkXTtcbn1cbnZhciBFTVBUWV9BUlJBWSA9IFtdO1xuT2JqZWN0LmZyZWV6ZShFTVBUWV9BUlJBWSk7XG5mdW5jdGlvbiBnZXRHbG9iYWwoKSB7XG4gICAgcmV0dXJuIGdsb2JhbDtcbn1cbmZ1bmN0aW9uIGdldE5leHRJZCgpIHtcbiAgICByZXR1cm4gKytnbG9iYWxTdGF0ZS5tb2J4R3VpZDtcbn1cbmZ1bmN0aW9uIGZhaWwobWVzc2FnZSwgdGhpbmcpIHtcbiAgICBpbnZhcmlhbnQoZmFsc2UsIG1lc3NhZ2UsIHRoaW5nKTtcbiAgICB0aHJvdyBcIlhcIjtcbn1cbmZ1bmN0aW9uIGludmFyaWFudChjaGVjaywgbWVzc2FnZSwgdGhpbmcpIHtcbiAgICBpZiAoIWNoZWNrKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJbbW9ieF0gSW52YXJpYW50IGZhaWxlZDogXCIgKyBtZXNzYWdlICsgKHRoaW5nID8gXCIgaW4gJ1wiICsgdGhpbmcgKyBcIidcIiA6IFwiXCIpKTtcbn1cbnZhciBkZXByZWNhdGVkTWVzc2FnZXMgPSBbXTtcbmZ1bmN0aW9uIGRlcHJlY2F0ZWQobXNnKSB7XG4gICAgaWYgKGRlcHJlY2F0ZWRNZXNzYWdlcy5pbmRleE9mKG1zZykgIT09IC0xKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgZGVwcmVjYXRlZE1lc3NhZ2VzLnB1c2gobXNnKTtcbiAgICBjb25zb2xlLmVycm9yKFwiW21vYnhdIERlcHJlY2F0ZWQ6IFwiICsgbXNnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn1cbmZ1bmN0aW9uIG9uY2UoZnVuYykge1xuICAgIHZhciBpbnZva2VkID0gZmFsc2U7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGludm9rZWQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGludm9rZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG52YXIgbm9vcCA9IGZ1bmN0aW9uICgpIHsgfTtcbmZ1bmN0aW9uIHVuaXF1ZShsaXN0KSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGxpc3QuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBpZiAocmVzLmluZGV4T2YoaXRlbSkgPT09IC0xKVxuICAgICAgICAgICAgcmVzLnB1c2goaXRlbSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmZ1bmN0aW9uIGpvaW5TdHJpbmdzKHRoaW5ncywgbGltaXQsIHNlcGFyYXRvcikge1xuICAgIGlmIChsaW1pdCA9PT0gdm9pZCAwKSB7IGxpbWl0ID0gMTAwOyB9XG4gICAgaWYgKHNlcGFyYXRvciA9PT0gdm9pZCAwKSB7IHNlcGFyYXRvciA9IFwiIC0gXCI7IH1cbiAgICBpZiAoIXRoaW5ncylcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgdmFyIHNsaWNlZCA9IHRoaW5ncy5zbGljZSgwLCBsaW1pdCk7XG4gICAgcmV0dXJuIFwiXCIgKyBzbGljZWQuam9pbihzZXBhcmF0b3IpICsgKHRoaW5ncy5sZW5ndGggPiBsaW1pdCA/IFwiICguLi4gYW5kIFwiICsgKHRoaW5ncy5sZW5ndGggLSBsaW1pdCkgKyBcIm1vcmUpXCIgOiBcIlwiKTtcbn1cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIjtcbn1cbmZ1bmN0aW9uIGlzUGxhaW5PYmplY3QodmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IG51bGwgfHwgdHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKTtcbiAgICByZXR1cm4gcHJvdG8gPT09IE9iamVjdC5wcm90b3R5cGUgfHwgcHJvdG8gPT09IG51bGw7XG59XG5mdW5jdGlvbiBvYmplY3RBc3NpZ24oKSB7XG4gICAgdmFyIHJlcyA9IGFyZ3VtZW50c1swXTtcbiAgICBmb3IgKHZhciBpID0gMSwgbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSlcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eShzb3VyY2UsIGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXNba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuZnVuY3Rpb24gdmFsdWVEaWRDaGFuZ2UoY29tcGFyZVN0cnVjdHVyYWwsIG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICAgIGlmICh0eXBlb2Ygb2xkVmFsdWUgPT09ICdudW1iZXInICYmIGlzTmFOKG9sZFZhbHVlKSkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG5ld1ZhbHVlICE9PSAnbnVtYmVyJyB8fCAhaXNOYU4obmV3VmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGFyZVN0cnVjdHVyYWxcbiAgICAgICAgPyAhZGVlcEVxdWFsKG9sZFZhbHVlLCBuZXdWYWx1ZSlcbiAgICAgICAgOiBvbGRWYWx1ZSAhPT0gbmV3VmFsdWU7XG59XG52YXIgcHJvdG90eXBlSGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqZWN0LCBwcm9wTmFtZSkge1xuICAgIHJldHVybiBwcm90b3R5cGVIYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcE5hbWUpO1xufVxuZnVuY3Rpb24gbWFrZU5vbkVudW1lcmFibGUob2JqZWN0LCBwcm9wTmFtZXMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBhZGRIaWRkZW5Qcm9wKG9iamVjdCwgcHJvcE5hbWVzW2ldLCBvYmplY3RbcHJvcE5hbWVzW2ldXSk7XG4gICAgfVxufVxuZnVuY3Rpb24gYWRkSGlkZGVuUHJvcChvYmplY3QsIHByb3BOYW1lLCB2YWx1ZSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIHByb3BOYW1lLCB7XG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGFkZEhpZGRlbkZpbmFsUHJvcChvYmplY3QsIHByb3BOYW1lLCB2YWx1ZSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIHByb3BOYW1lLCB7XG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgfSk7XG59XG5mdW5jdGlvbiBpc1Byb3BlcnR5Q29uZmlndXJhYmxlKG9iamVjdCwgcHJvcCkge1xuICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIHByb3ApO1xuICAgIHJldHVybiAhZGVzY3JpcHRvciB8fCAoZGVzY3JpcHRvci5jb25maWd1cmFibGUgIT09IGZhbHNlICYmIGRlc2NyaXB0b3Iud3JpdGFibGUgIT09IGZhbHNlKTtcbn1cbmZ1bmN0aW9uIGFzc2VydFByb3BlcnR5Q29uZmlndXJhYmxlKG9iamVjdCwgcHJvcCkge1xuICAgIGludmFyaWFudChpc1Byb3BlcnR5Q29uZmlndXJhYmxlKG9iamVjdCwgcHJvcCksIFwiQ2Fubm90IG1ha2UgcHJvcGVydHkgJ1wiICsgcHJvcCArIFwiJyBvYnNlcnZhYmxlLCBpdCBpcyBub3QgY29uZmlndXJhYmxlIGFuZCB3cml0YWJsZSBpbiB0aGUgdGFyZ2V0IG9iamVjdFwiKTtcbn1cbmZ1bmN0aW9uIGdldEVudW1lcmFibGVLZXlzKG9iaikge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKVxuICAgICAgICByZXMucHVzaChrZXkpO1xuICAgIHJldHVybiByZXM7XG59XG5mdW5jdGlvbiBkZWVwRXF1YWwoYSwgYikge1xuICAgIGlmIChhID09PSBudWxsICYmIGIgPT09IG51bGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIGlmIChhID09PSB1bmRlZmluZWQgJiYgYiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICBpZiAodHlwZW9mIGEgIT09IFwib2JqZWN0XCIpXG4gICAgICAgIHJldHVybiBhID09PSBiO1xuICAgIHZhciBhSXNBcnJheSA9IGlzQXJyYXlMaWtlKGEpO1xuICAgIHZhciBhSXNNYXAgPSBpc01hcExpa2UoYSk7XG4gICAgaWYgKGFJc0FycmF5ICE9PSBpc0FycmF5TGlrZShiKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVsc2UgaWYgKGFJc01hcCAhPT0gaXNNYXBMaWtlKGIpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZWxzZSBpZiAoYUlzQXJyYXkpIHtcbiAgICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgaSA9IGEubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pXG4gICAgICAgICAgICBpZiAoIWRlZXBFcXVhbChhW2ldLCBiW2ldKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBlbHNlIGlmIChhSXNNYXApIHtcbiAgICAgICAgaWYgKGEuc2l6ZSAhPT0gYi5zaXplKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgZXF1YWxzXzEgPSB0cnVlO1xuICAgICAgICBhLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgIGVxdWFsc18xID0gZXF1YWxzXzEgJiYgZGVlcEVxdWFsKGIuZ2V0KGtleSksIHZhbHVlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBlcXVhbHNfMTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGEgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIGIgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgaWYgKGEgPT09IG51bGwgfHwgYiA9PT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGlzTWFwTGlrZShhKSAmJiBpc01hcExpa2UoYikpIHtcbiAgICAgICAgICAgIGlmIChhLnNpemUgIT09IGIuc2l6ZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gZGVlcEVxdWFsKG9ic2VydmFibGUuc2hhbGxvd01hcChhKS5lbnRyaWVzKCksIG9ic2VydmFibGUuc2hhbGxvd01hcChiKS5lbnRyaWVzKCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChnZXRFbnVtZXJhYmxlS2V5cyhhKS5sZW5ndGggIT09IGdldEVudW1lcmFibGVLZXlzKGIpLmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBhKSB7XG4gICAgICAgICAgICBpZiAoIShwcm9wIGluIGIpKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKGFbcHJvcF0sIGJbcHJvcF0pKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuZnVuY3Rpb24gY3JlYXRlSW5zdGFuY2VvZlByZWRpY2F0ZShuYW1lLCBjbGF6eikge1xuICAgIHZhciBwcm9wTmFtZSA9IFwiaXNNb2JYXCIgKyBuYW1lO1xuICAgIGNsYXp6LnByb3RvdHlwZVtwcm9wTmFtZV0gPSB0cnVlO1xuICAgIHJldHVybiBmdW5jdGlvbiAoeCkge1xuICAgICAgICByZXR1cm4gaXNPYmplY3QoeCkgJiYgeFtwcm9wTmFtZV0gPT09IHRydWU7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlKHgpIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh4KSB8fCBpc09ic2VydmFibGVBcnJheSh4KTtcbn1cbmV4cG9ydHMuaXNBcnJheUxpa2UgPSBpc0FycmF5TGlrZTtcbmZ1bmN0aW9uIGlzTWFwTGlrZSh4KSB7XG4gICAgcmV0dXJuIGlzRVM2TWFwKHgpIHx8IGlzT2JzZXJ2YWJsZU1hcCh4KTtcbn1cbmZ1bmN0aW9uIGlzRVM2TWFwKHRoaW5nKSB7XG4gICAgaWYgKGdldEdsb2JhbCgpLk1hcCAhPT0gdW5kZWZpbmVkICYmIHRoaW5nIGluc3RhbmNlb2YgZ2V0R2xvYmFsKCkuTWFwKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7XG59XG5mdW5jdGlvbiBwcmltaXRpdmVTeW1ib2woKSB7XG4gICAgcmV0dXJuICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLnRvUHJpbWl0aXZlKSB8fCBcIkBAdG9QcmltaXRpdmVcIjtcbn1cbmZ1bmN0aW9uIHRvUHJpbWl0aXZlKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID09PSBudWxsID8gbnVsbCA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiA/IChcIlwiICsgdmFsdWUpIDogdmFsdWU7XG59XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vbW9ieC9saWIvbW9ieC5qc1xuLy8gbW9kdWxlIGlkID0gMjQ5XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFJlYWN0UHJvcFR5cGVzU2VjcmV0ID0gJ1NFQ1JFVF9ET19OT1RfUEFTU19USElTX09SX1lPVV9XSUxMX0JFX0ZJUkVEJztcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdFByb3BUeXBlc1NlY3JldDtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL2xpYi9SZWFjdFByb3BUeXBlc1NlY3JldC5qc1xuLy8gbW9kdWxlIGlkID0gMjUwXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTQtMjAxNSwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBlbXB0eUZ1bmN0aW9uID0gcmVxdWlyZSgnLi9lbXB0eUZ1bmN0aW9uJyk7XG5cbi8qKlxuICogU2ltaWxhciB0byBpbnZhcmlhbnQgYnV0IG9ubHkgbG9ncyBhIHdhcm5pbmcgaWYgdGhlIGNvbmRpdGlvbiBpcyBub3QgbWV0LlxuICogVGhpcyBjYW4gYmUgdXNlZCB0byBsb2cgaXNzdWVzIGluIGRldmVsb3BtZW50IGVudmlyb25tZW50cyBpbiBjcml0aWNhbFxuICogcGF0aHMuIFJlbW92aW5nIHRoZSBsb2dnaW5nIGNvZGUgZm9yIHByb2R1Y3Rpb24gZW52aXJvbm1lbnRzIHdpbGwga2VlcCB0aGVcbiAqIHNhbWUgbG9naWMgYW5kIGZvbGxvdyB0aGUgc2FtZSBjb2RlIHBhdGhzLlxuICovXG5cbnZhciB3YXJuaW5nID0gZW1wdHlGdW5jdGlvbjtcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcHJpbnRXYXJuaW5nID0gZnVuY3Rpb24gcHJpbnRXYXJuaW5nKGZvcm1hdCkge1xuICAgICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuID4gMSA/IF9sZW4gLSAxIDogMCksIF9rZXkgPSAxOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICAgIGFyZ3NbX2tleSAtIDFdID0gYXJndW1lbnRzW19rZXldO1xuICAgICAgfVxuXG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgdmFyIG1lc3NhZ2UgPSAnV2FybmluZzogJyArIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmdzW2FyZ0luZGV4KytdO1xuICAgICAgfSk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSk7XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICAvLyAtLS0gV2VsY29tZSB0byBkZWJ1Z2dpbmcgUmVhY3QgLS0tXG4gICAgICAgIC8vIFRoaXMgZXJyb3Igd2FzIHRocm93biBhcyBhIGNvbnZlbmllbmNlIHNvIHRoYXQgeW91IGNhbiB1c2UgdGhpcyBzdGFja1xuICAgICAgICAvLyB0byBmaW5kIHRoZSBjYWxsc2l0ZSB0aGF0IGNhdXNlZCB0aGlzIHdhcm5pbmcgdG8gZmlyZS5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgfSBjYXRjaCAoeCkge31cbiAgICB9O1xuXG4gICAgd2FybmluZyA9IGZ1bmN0aW9uIHdhcm5pbmcoY29uZGl0aW9uLCBmb3JtYXQpIHtcbiAgICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2B3YXJuaW5nKGNvbmRpdGlvbiwgZm9ybWF0LCAuLi5hcmdzKWAgcmVxdWlyZXMgYSB3YXJuaW5nICcgKyAnbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZm9ybWF0LmluZGV4T2YoJ0ZhaWxlZCBDb21wb3NpdGUgcHJvcFR5cGU6ICcpID09PSAwKSB7XG4gICAgICAgIHJldHVybjsgLy8gSWdub3JlIENvbXBvc2l0ZUNvbXBvbmVudCBwcm9wdHlwZSBjaGVjay5cbiAgICAgIH1cblxuICAgICAgaWYgKCFjb25kaXRpb24pIHtcbiAgICAgICAgZm9yICh2YXIgX2xlbjIgPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gQXJyYXkoX2xlbjIgPiAyID8gX2xlbjIgLSAyIDogMCksIF9rZXkyID0gMjsgX2tleTIgPCBfbGVuMjsgX2tleTIrKykge1xuICAgICAgICAgIGFyZ3NbX2tleTIgLSAyXSA9IGFyZ3VtZW50c1tfa2V5Ml07XG4gICAgICAgIH1cblxuICAgICAgICBwcmludFdhcm5pbmcuYXBwbHkodW5kZWZpbmVkLCBbZm9ybWF0XS5jb25jYXQoYXJncykpO1xuICAgICAgfVxuICAgIH07XG4gIH0pKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gd2FybmluZztcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9+L2ZianMvbGliL3dhcm5pbmcuanNcbi8vIG1vZHVsZSBpZCA9IDI1MVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKlxuXHRNSVQgTGljZW5zZSBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuXHRBdXRob3IgVG9iaWFzIEtvcHBlcnMgQHNva3JhXG4qL1xudmFyIHN0eWxlc0luRG9tID0ge30sXG5cdG1lbW9pemUgPSBmdW5jdGlvbihmbikge1xuXHRcdHZhciBtZW1vO1xuXHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAodHlwZW9mIG1lbW8gPT09IFwidW5kZWZpbmVkXCIpIG1lbW8gPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdFx0cmV0dXJuIG1lbW87XG5cdFx0fTtcblx0fSxcblx0aXNPbGRJRSA9IG1lbW9pemUoZnVuY3Rpb24oKSB7XG5cdFx0Ly8gVGVzdCBmb3IgSUUgPD0gOSBhcyBwcm9wb3NlZCBieSBCcm93c2VyaGFja3Ncblx0XHQvLyBAc2VlIGh0dHA6Ly9icm93c2VyaGFja3MuY29tLyNoYWNrLWU3MWQ4NjkyZjY1MzM0MTczZmVlNzE1YzIyMmNiODA1XG5cdFx0Ly8gVGVzdHMgZm9yIGV4aXN0ZW5jZSBvZiBzdGFuZGFyZCBnbG9iYWxzIGlzIHRvIGFsbG93IHN0eWxlLWxvYWRlciBcblx0XHQvLyB0byBvcGVyYXRlIGNvcnJlY3RseSBpbnRvIG5vbi1zdGFuZGFyZCBlbnZpcm9ubWVudHNcblx0XHQvLyBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrLWNvbnRyaWIvc3R5bGUtbG9hZGVyL2lzc3Vlcy8xNzdcblx0XHRyZXR1cm4gd2luZG93ICYmIGRvY3VtZW50ICYmIGRvY3VtZW50LmFsbCAmJiAhd2luZG93LmF0b2I7XG5cdH0pLFxuXHRnZXRFbGVtZW50ID0gKGZ1bmN0aW9uKGZuKSB7XG5cdFx0dmFyIG1lbW8gPSB7fTtcblx0XHRyZXR1cm4gZnVuY3Rpb24oc2VsZWN0b3IpIHtcblx0XHRcdGlmICh0eXBlb2YgbWVtb1tzZWxlY3Rvcl0gPT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdFx0bWVtb1tzZWxlY3Rvcl0gPSBmbi5jYWxsKHRoaXMsIHNlbGVjdG9yKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBtZW1vW3NlbGVjdG9yXVxuXHRcdH07XG5cdH0pKGZ1bmN0aW9uIChzdHlsZVRhcmdldCkge1xuXHRcdHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHN0eWxlVGFyZ2V0KVxuXHR9KSxcblx0c2luZ2xldG9uRWxlbWVudCA9IG51bGwsXG5cdHNpbmdsZXRvbkNvdW50ZXIgPSAwLFxuXHRzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcCA9IFtdLFxuXHRmaXhVcmxzID0gcmVxdWlyZShcIi4vZml4VXJsc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihsaXN0LCBvcHRpb25zKSB7XG5cdGlmKHR5cGVvZiBERUJVRyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBERUJVRykge1xuXHRcdGlmKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IEVycm9yKFwiVGhlIHN0eWxlLWxvYWRlciBjYW5ub3QgYmUgdXNlZCBpbiBhIG5vbi1icm93c2VyIGVudmlyb25tZW50XCIpO1xuXHR9XG5cblx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdG9wdGlvbnMuYXR0cnMgPSB0eXBlb2Ygb3B0aW9ucy5hdHRycyA9PT0gXCJvYmplY3RcIiA/IG9wdGlvbnMuYXR0cnMgOiB7fTtcblxuXHQvLyBGb3JjZSBzaW5nbGUtdGFnIHNvbHV0aW9uIG9uIElFNi05LCB3aGljaCBoYXMgYSBoYXJkIGxpbWl0IG9uIHRoZSAjIG9mIDxzdHlsZT5cblx0Ly8gdGFncyBpdCB3aWxsIGFsbG93IG9uIGEgcGFnZVxuXHRpZiAodHlwZW9mIG9wdGlvbnMuc2luZ2xldG9uID09PSBcInVuZGVmaW5lZFwiKSBvcHRpb25zLnNpbmdsZXRvbiA9IGlzT2xkSUUoKTtcblxuXHQvLyBCeSBkZWZhdWx0LCBhZGQgPHN0eWxlPiB0YWdzIHRvIHRoZSA8aGVhZD4gZWxlbWVudFxuXHRpZiAodHlwZW9mIG9wdGlvbnMuaW5zZXJ0SW50byA9PT0gXCJ1bmRlZmluZWRcIikgb3B0aW9ucy5pbnNlcnRJbnRvID0gXCJoZWFkXCI7XG5cblx0Ly8gQnkgZGVmYXVsdCwgYWRkIDxzdHlsZT4gdGFncyB0byB0aGUgYm90dG9tIG9mIHRoZSB0YXJnZXRcblx0aWYgKHR5cGVvZiBvcHRpb25zLmluc2VydEF0ID09PSBcInVuZGVmaW5lZFwiKSBvcHRpb25zLmluc2VydEF0ID0gXCJib3R0b21cIjtcblxuXHR2YXIgc3R5bGVzID0gbGlzdFRvU3R5bGVzKGxpc3QsIG9wdGlvbnMpO1xuXHRhZGRTdHlsZXNUb0RvbShzdHlsZXMsIG9wdGlvbnMpO1xuXG5cdHJldHVybiBmdW5jdGlvbiB1cGRhdGUobmV3TGlzdCkge1xuXHRcdHZhciBtYXlSZW1vdmUgPSBbXTtcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgc3R5bGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgaXRlbSA9IHN0eWxlc1tpXTtcblx0XHRcdHZhciBkb21TdHlsZSA9IHN0eWxlc0luRG9tW2l0ZW0uaWRdO1xuXHRcdFx0ZG9tU3R5bGUucmVmcy0tO1xuXHRcdFx0bWF5UmVtb3ZlLnB1c2goZG9tU3R5bGUpO1xuXHRcdH1cblx0XHRpZihuZXdMaXN0KSB7XG5cdFx0XHR2YXIgbmV3U3R5bGVzID0gbGlzdFRvU3R5bGVzKG5ld0xpc3QsIG9wdGlvbnMpO1xuXHRcdFx0YWRkU3R5bGVzVG9Eb20obmV3U3R5bGVzLCBvcHRpb25zKTtcblx0XHR9XG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IG1heVJlbW92ZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGRvbVN0eWxlID0gbWF5UmVtb3ZlW2ldO1xuXHRcdFx0aWYoZG9tU3R5bGUucmVmcyA9PT0gMCkge1xuXHRcdFx0XHRmb3IodmFyIGogPSAwOyBqIDwgZG9tU3R5bGUucGFydHMubGVuZ3RoOyBqKyspXG5cdFx0XHRcdFx0ZG9tU3R5bGUucGFydHNbal0oKTtcblx0XHRcdFx0ZGVsZXRlIHN0eWxlc0luRG9tW2RvbVN0eWxlLmlkXTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG59O1xuXG5mdW5jdGlvbiBhZGRTdHlsZXNUb0RvbShzdHlsZXMsIG9wdGlvbnMpIHtcblx0Zm9yKHZhciBpID0gMDsgaSA8IHN0eWxlcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBpdGVtID0gc3R5bGVzW2ldO1xuXHRcdHZhciBkb21TdHlsZSA9IHN0eWxlc0luRG9tW2l0ZW0uaWRdO1xuXHRcdGlmKGRvbVN0eWxlKSB7XG5cdFx0XHRkb21TdHlsZS5yZWZzKys7XG5cdFx0XHRmb3IodmFyIGogPSAwOyBqIDwgZG9tU3R5bGUucGFydHMubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0ZG9tU3R5bGUucGFydHNbal0oaXRlbS5wYXJ0c1tqXSk7XG5cdFx0XHR9XG5cdFx0XHRmb3IoOyBqIDwgaXRlbS5wYXJ0cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRkb21TdHlsZS5wYXJ0cy5wdXNoKGFkZFN0eWxlKGl0ZW0ucGFydHNbal0sIG9wdGlvbnMpKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIHBhcnRzID0gW107XG5cdFx0XHRmb3IodmFyIGogPSAwOyBqIDwgaXRlbS5wYXJ0cy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRwYXJ0cy5wdXNoKGFkZFN0eWxlKGl0ZW0ucGFydHNbal0sIG9wdGlvbnMpKTtcblx0XHRcdH1cblx0XHRcdHN0eWxlc0luRG9tW2l0ZW0uaWRdID0ge2lkOiBpdGVtLmlkLCByZWZzOiAxLCBwYXJ0czogcGFydHN9O1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBsaXN0VG9TdHlsZXMobGlzdCwgb3B0aW9ucykge1xuXHR2YXIgc3R5bGVzID0gW107XG5cdHZhciBuZXdTdHlsZXMgPSB7fTtcblx0Zm9yKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgaXRlbSA9IGxpc3RbaV07XG5cdFx0dmFyIGlkID0gb3B0aW9ucy5iYXNlID8gaXRlbVswXSArIG9wdGlvbnMuYmFzZSA6IGl0ZW1bMF07XG5cdFx0dmFyIGNzcyA9IGl0ZW1bMV07XG5cdFx0dmFyIG1lZGlhID0gaXRlbVsyXTtcblx0XHR2YXIgc291cmNlTWFwID0gaXRlbVszXTtcblx0XHR2YXIgcGFydCA9IHtjc3M6IGNzcywgbWVkaWE6IG1lZGlhLCBzb3VyY2VNYXA6IHNvdXJjZU1hcH07XG5cdFx0aWYoIW5ld1N0eWxlc1tpZF0pXG5cdFx0XHRzdHlsZXMucHVzaChuZXdTdHlsZXNbaWRdID0ge2lkOiBpZCwgcGFydHM6IFtwYXJ0XX0pO1xuXHRcdGVsc2Vcblx0XHRcdG5ld1N0eWxlc1tpZF0ucGFydHMucHVzaChwYXJ0KTtcblx0fVxuXHRyZXR1cm4gc3R5bGVzO1xufVxuXG5mdW5jdGlvbiBpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucywgc3R5bGVFbGVtZW50KSB7XG5cdHZhciBzdHlsZVRhcmdldCA9IGdldEVsZW1lbnQob3B0aW9ucy5pbnNlcnRJbnRvKVxuXHRpZiAoIXN0eWxlVGFyZ2V0KSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiQ291bGRuJ3QgZmluZCBhIHN0eWxlIHRhcmdldC4gVGhpcyBwcm9iYWJseSBtZWFucyB0aGF0IHRoZSB2YWx1ZSBmb3IgdGhlICdpbnNlcnRJbnRvJyBwYXJhbWV0ZXIgaXMgaW52YWxpZC5cIik7XG5cdH1cblx0dmFyIGxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wID0gc3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3Bbc3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3AubGVuZ3RoIC0gMV07XG5cdGlmIChvcHRpb25zLmluc2VydEF0ID09PSBcInRvcFwiKSB7XG5cdFx0aWYoIWxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wKSB7XG5cdFx0XHRzdHlsZVRhcmdldC5pbnNlcnRCZWZvcmUoc3R5bGVFbGVtZW50LCBzdHlsZVRhcmdldC5maXJzdENoaWxkKTtcblx0XHR9IGVsc2UgaWYobGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3AubmV4dFNpYmxpbmcpIHtcblx0XHRcdHN0eWxlVGFyZ2V0Lmluc2VydEJlZm9yZShzdHlsZUVsZW1lbnQsIGxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wLm5leHRTaWJsaW5nKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c3R5bGVUYXJnZXQuYXBwZW5kQ2hpbGQoc3R5bGVFbGVtZW50KTtcblx0XHR9XG5cdFx0c3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3AucHVzaChzdHlsZUVsZW1lbnQpO1xuXHR9IGVsc2UgaWYgKG9wdGlvbnMuaW5zZXJ0QXQgPT09IFwiYm90dG9tXCIpIHtcblx0XHRzdHlsZVRhcmdldC5hcHBlbmRDaGlsZChzdHlsZUVsZW1lbnQpO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdmFsdWUgZm9yIHBhcmFtZXRlciAnaW5zZXJ0QXQnLiBNdXN0IGJlICd0b3AnIG9yICdib3R0b20nLlwiKTtcblx0fVxufVxuXG5mdW5jdGlvbiByZW1vdmVTdHlsZUVsZW1lbnQoc3R5bGVFbGVtZW50KSB7XG5cdHN0eWxlRWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHN0eWxlRWxlbWVudCk7XG5cdHZhciBpZHggPSBzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcC5pbmRleE9mKHN0eWxlRWxlbWVudCk7XG5cdGlmKGlkeCA+PSAwKSB7XG5cdFx0c3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3Auc3BsaWNlKGlkeCwgMSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlU3R5bGVFbGVtZW50KG9wdGlvbnMpIHtcblx0dmFyIHN0eWxlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcblx0b3B0aW9ucy5hdHRycy50eXBlID0gXCJ0ZXh0L2Nzc1wiO1xuXG5cdGF0dGFjaFRhZ0F0dHJzKHN0eWxlRWxlbWVudCwgb3B0aW9ucy5hdHRycyk7XG5cdGluc2VydFN0eWxlRWxlbWVudChvcHRpb25zLCBzdHlsZUVsZW1lbnQpO1xuXHRyZXR1cm4gc3R5bGVFbGVtZW50O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVMaW5rRWxlbWVudChvcHRpb25zKSB7XG5cdHZhciBsaW5rRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaW5rXCIpO1xuXHRvcHRpb25zLmF0dHJzLnR5cGUgPSBcInRleHQvY3NzXCI7XG5cdG9wdGlvbnMuYXR0cnMucmVsID0gXCJzdHlsZXNoZWV0XCI7XG5cblx0YXR0YWNoVGFnQXR0cnMobGlua0VsZW1lbnQsIG9wdGlvbnMuYXR0cnMpO1xuXHRpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucywgbGlua0VsZW1lbnQpO1xuXHRyZXR1cm4gbGlua0VsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIGF0dGFjaFRhZ0F0dHJzKGVsZW1lbnQsIGF0dHJzKSB7XG5cdE9iamVjdC5rZXlzKGF0dHJzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcblx0XHRlbGVtZW50LnNldEF0dHJpYnV0ZShrZXksIGF0dHJzW2tleV0pO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gYWRkU3R5bGUob2JqLCBvcHRpb25zKSB7XG5cdHZhciBzdHlsZUVsZW1lbnQsIHVwZGF0ZSwgcmVtb3ZlLCB0cmFuc2Zvcm1SZXN1bHQ7XG5cblx0Ly8gSWYgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gd2FzIGRlZmluZWQsIHJ1biBpdCBvbiB0aGUgY3NzXG5cdGlmIChvcHRpb25zLnRyYW5zZm9ybSAmJiBvYmouY3NzKSB7XG5cdCAgICB0cmFuc2Zvcm1SZXN1bHQgPSBvcHRpb25zLnRyYW5zZm9ybShvYmouY3NzKTtcblx0ICAgIFxuXHQgICAgaWYgKHRyYW5zZm9ybVJlc3VsdCkge1xuXHQgICAgXHQvLyBJZiB0cmFuc2Zvcm0gcmV0dXJucyBhIHZhbHVlLCB1c2UgdGhhdCBpbnN0ZWFkIG9mIHRoZSBvcmlnaW5hbCBjc3MuXG5cdCAgICBcdC8vIFRoaXMgYWxsb3dzIHJ1bm5pbmcgcnVudGltZSB0cmFuc2Zvcm1hdGlvbnMgb24gdGhlIGNzcy5cblx0ICAgIFx0b2JqLmNzcyA9IHRyYW5zZm9ybVJlc3VsdDtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICBcdC8vIElmIHRoZSB0cmFuc2Zvcm0gZnVuY3Rpb24gcmV0dXJucyBhIGZhbHN5IHZhbHVlLCBkb24ndCBhZGQgdGhpcyBjc3MuIFxuXHQgICAgXHQvLyBUaGlzIGFsbG93cyBjb25kaXRpb25hbCBsb2FkaW5nIG9mIGNzc1xuXHQgICAgXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdCAgICBcdFx0Ly8gbm9vcFxuXHQgICAgXHR9O1xuXHQgICAgfVxuXHR9XG5cblx0aWYgKG9wdGlvbnMuc2luZ2xldG9uKSB7XG5cdFx0dmFyIHN0eWxlSW5kZXggPSBzaW5nbGV0b25Db3VudGVyKys7XG5cdFx0c3R5bGVFbGVtZW50ID0gc2luZ2xldG9uRWxlbWVudCB8fCAoc2luZ2xldG9uRWxlbWVudCA9IGNyZWF0ZVN0eWxlRWxlbWVudChvcHRpb25zKSk7XG5cdFx0dXBkYXRlID0gYXBwbHlUb1NpbmdsZXRvblRhZy5iaW5kKG51bGwsIHN0eWxlRWxlbWVudCwgc3R5bGVJbmRleCwgZmFsc2UpO1xuXHRcdHJlbW92ZSA9IGFwcGx5VG9TaW5nbGV0b25UYWcuYmluZChudWxsLCBzdHlsZUVsZW1lbnQsIHN0eWxlSW5kZXgsIHRydWUpO1xuXHR9IGVsc2UgaWYob2JqLnNvdXJjZU1hcCAmJlxuXHRcdHR5cGVvZiBVUkwgPT09IFwiZnVuY3Rpb25cIiAmJlxuXHRcdHR5cGVvZiBVUkwuY3JlYXRlT2JqZWN0VVJMID09PSBcImZ1bmN0aW9uXCIgJiZcblx0XHR0eXBlb2YgVVJMLnJldm9rZU9iamVjdFVSTCA9PT0gXCJmdW5jdGlvblwiICYmXG5cdFx0dHlwZW9mIEJsb2IgPT09IFwiZnVuY3Rpb25cIiAmJlxuXHRcdHR5cGVvZiBidG9hID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRzdHlsZUVsZW1lbnQgPSBjcmVhdGVMaW5rRWxlbWVudChvcHRpb25zKTtcblx0XHR1cGRhdGUgPSB1cGRhdGVMaW5rLmJpbmQobnVsbCwgc3R5bGVFbGVtZW50LCBvcHRpb25zKTtcblx0XHRyZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpO1xuXHRcdFx0aWYoc3R5bGVFbGVtZW50LmhyZWYpXG5cdFx0XHRcdFVSTC5yZXZva2VPYmplY3RVUkwoc3R5bGVFbGVtZW50LmhyZWYpO1xuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0c3R5bGVFbGVtZW50ID0gY3JlYXRlU3R5bGVFbGVtZW50KG9wdGlvbnMpO1xuXHRcdHVwZGF0ZSA9IGFwcGx5VG9UYWcuYmluZChudWxsLCBzdHlsZUVsZW1lbnQpO1xuXHRcdHJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCk7XG5cdFx0fTtcblx0fVxuXG5cdHVwZGF0ZShvYmopO1xuXG5cdHJldHVybiBmdW5jdGlvbiB1cGRhdGVTdHlsZShuZXdPYmopIHtcblx0XHRpZihuZXdPYmopIHtcblx0XHRcdGlmKG5ld09iai5jc3MgPT09IG9iai5jc3MgJiYgbmV3T2JqLm1lZGlhID09PSBvYmoubWVkaWEgJiYgbmV3T2JqLnNvdXJjZU1hcCA9PT0gb2JqLnNvdXJjZU1hcClcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0dXBkYXRlKG9iaiA9IG5ld09iaik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlbW92ZSgpO1xuXHRcdH1cblx0fTtcbn1cblxudmFyIHJlcGxhY2VUZXh0ID0gKGZ1bmN0aW9uICgpIHtcblx0dmFyIHRleHRTdG9yZSA9IFtdO1xuXG5cdHJldHVybiBmdW5jdGlvbiAoaW5kZXgsIHJlcGxhY2VtZW50KSB7XG5cdFx0dGV4dFN0b3JlW2luZGV4XSA9IHJlcGxhY2VtZW50O1xuXHRcdHJldHVybiB0ZXh0U3RvcmUuZmlsdGVyKEJvb2xlYW4pLmpvaW4oJ1xcbicpO1xuXHR9O1xufSkoKTtcblxuZnVuY3Rpb24gYXBwbHlUb1NpbmdsZXRvblRhZyhzdHlsZUVsZW1lbnQsIGluZGV4LCByZW1vdmUsIG9iaikge1xuXHR2YXIgY3NzID0gcmVtb3ZlID8gXCJcIiA6IG9iai5jc3M7XG5cblx0aWYgKHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0KSB7XG5cdFx0c3R5bGVFbGVtZW50LnN0eWxlU2hlZXQuY3NzVGV4dCA9IHJlcGxhY2VUZXh0KGluZGV4LCBjc3MpO1xuXHR9IGVsc2Uge1xuXHRcdHZhciBjc3NOb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKTtcblx0XHR2YXIgY2hpbGROb2RlcyA9IHN0eWxlRWxlbWVudC5jaGlsZE5vZGVzO1xuXHRcdGlmIChjaGlsZE5vZGVzW2luZGV4XSkgc3R5bGVFbGVtZW50LnJlbW92ZUNoaWxkKGNoaWxkTm9kZXNbaW5kZXhdKTtcblx0XHRpZiAoY2hpbGROb2Rlcy5sZW5ndGgpIHtcblx0XHRcdHN0eWxlRWxlbWVudC5pbnNlcnRCZWZvcmUoY3NzTm9kZSwgY2hpbGROb2Rlc1tpbmRleF0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzdHlsZUVsZW1lbnQuYXBwZW5kQ2hpbGQoY3NzTm9kZSk7XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGFwcGx5VG9UYWcoc3R5bGVFbGVtZW50LCBvYmopIHtcblx0dmFyIGNzcyA9IG9iai5jc3M7XG5cdHZhciBtZWRpYSA9IG9iai5tZWRpYTtcblxuXHRpZihtZWRpYSkge1xuXHRcdHN0eWxlRWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJtZWRpYVwiLCBtZWRpYSlcblx0fVxuXG5cdGlmKHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0KSB7XG5cdFx0c3R5bGVFbGVtZW50LnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcblx0fSBlbHNlIHtcblx0XHR3aGlsZShzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCkge1xuXHRcdFx0c3R5bGVFbGVtZW50LnJlbW92ZUNoaWxkKHN0eWxlRWxlbWVudC5maXJzdENoaWxkKTtcblx0XHR9XG5cdFx0c3R5bGVFbGVtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUxpbmsobGlua0VsZW1lbnQsIG9wdGlvbnMsIG9iaikge1xuXHR2YXIgY3NzID0gb2JqLmNzcztcblx0dmFyIHNvdXJjZU1hcCA9IG9iai5zb3VyY2VNYXA7XG5cblx0LyogSWYgY29udmVydFRvQWJzb2x1dGVVcmxzIGlzbid0IGRlZmluZWQsIGJ1dCBzb3VyY2VtYXBzIGFyZSBlbmFibGVkXG5cdGFuZCB0aGVyZSBpcyBubyBwdWJsaWNQYXRoIGRlZmluZWQgdGhlbiBsZXRzIHR1cm4gY29udmVydFRvQWJzb2x1dGVVcmxzXG5cdG9uIGJ5IGRlZmF1bHQuICBPdGhlcndpc2UgZGVmYXVsdCB0byB0aGUgY29udmVydFRvQWJzb2x1dGVVcmxzIG9wdGlvblxuXHRkaXJlY3RseVxuXHQqL1xuXHR2YXIgYXV0b0ZpeFVybHMgPSBvcHRpb25zLmNvbnZlcnRUb0Fic29sdXRlVXJscyA9PT0gdW5kZWZpbmVkICYmIHNvdXJjZU1hcDtcblxuXHRpZiAob3B0aW9ucy5jb252ZXJ0VG9BYnNvbHV0ZVVybHMgfHwgYXV0b0ZpeFVybHMpe1xuXHRcdGNzcyA9IGZpeFVybHMoY3NzKTtcblx0fVxuXG5cdGlmKHNvdXJjZU1hcCkge1xuXHRcdC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI2NjAzODc1XG5cdFx0Y3NzICs9IFwiXFxuLyojIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxcIiArIGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHNvdXJjZU1hcCkpKSkgKyBcIiAqL1wiO1xuXHR9XG5cblx0dmFyIGJsb2IgPSBuZXcgQmxvYihbY3NzXSwgeyB0eXBlOiBcInRleHQvY3NzXCIgfSk7XG5cblx0dmFyIG9sZFNyYyA9IGxpbmtFbGVtZW50LmhyZWY7XG5cblx0bGlua0VsZW1lbnQuaHJlZiA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cblx0aWYob2xkU3JjKVxuXHRcdFVSTC5yZXZva2VPYmplY3RVUkwob2xkU3JjKTtcbn1cblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9zdHlsZS1sb2FkZXIvYWRkU3R5bGVzLmpzXG4vLyBtb2R1bGUgaWQgPSA0NTFcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IG1vYngsIHsgb2JzZXJ2YWJsZSwgY29tcHV0ZWQgfSBmcm9tIFwibW9ieFwiO1xuaW1wb3J0IHsgb2JzZXJ2ZXIgfSBmcm9tIFwibW9ieC1yZWFjdFwiO1xuaW1wb3J0IHsgQnV0dG9uLCBEcm9wZG93biwgR3JpZCwgTWVudSwgU2VnbWVudCwgVGV4dEFyZWEgfSBmcm9tICdzZW1hbnRpYy11aS1yZWFjdCdcblxuaW1wb3J0IFNwYWNlciBmcm9tIFwiLi9TcGFjZXIuanN4XCI7XG5pbXBvcnQgXCIuL3N0eWxlcy5sZXNzXCI7XG5cblxuY2xhc3MgRXhhbXBsZVN0b3JlIHtcblx0QG9ic2VydmFibGUgZXhhbXBsZXMgPSB7fTtcblx0QG9ic2VydmFibGUgc2VsZWN0ZWQgPSBcIlwiO1xuXHRAb2JzZXJ2YWJsZSBvdXRwdXQgPSBcIlwiO1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuLy9ERUJVR1xud2luZG93LmV4YW1wbGVzID0gdGhpcztcblx0fVxuXG5cdC8vIFJldHVybiBqdXN0IHRoZSB0aXRsZXMgb2YgdGhlIGV4YW1wbGVzLlxuXHRAY29tcHV0ZWQgZ2V0IHRpdGxlcygpIHtcblx0XHRyZXR1cm4gT2JqZWN0LmtleXModGhpcy5leGFtcGxlcyk7XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIGNvZGUgZm9yIHRoZSBjdXJyZW50IGV4YW1wbGVcblx0QGNvbXB1dGVkIGdldCBjb2RlKCkge1xuXHRcdHJldHVybiB0aGlzLmV4YW1wbGVzW3RoaXMuc2VsZWN0ZWRdO1xuXHR9XG5cblx0Ly9cblxuXHQvLyBSZXNldCBhbGwgZXhhbXBsZXMgZnJvbSBsb2NhbFN0b3JhZ2UuXG5cdHJlc2V0KCkge1xuXHRcdGRlbGV0ZSBsb2NhbFN0b3JhZ2Uuc3BlbGxFZGl0b3JFeGFtcGxlcztcblx0XHRkZWxldGUgbG9jYWxTdG9yYWdlLnNwZWxsRWRpdG9yRXhhbXBsZTtcblx0XHR3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdH1cblxuXHQvLyBMb2FkIGV4YW1wbGVzXG5cdGxvYWQoKSB7XG5cdFx0Ly8gTG9hZCBleGFtcGxlcyBmcm9tIGxvY2FsU3RvcmFnZVxuXHRcdHRoaXMuZXhhbXBsZXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5zcGVsbEVkaXRvckV4YW1wbGVzXG5cdFx0XHR8fCAne1wiRm9vXCI6XCJkZWZpbmUgdHlwZSBGb29cIiwgXCJCYXJcIjpcImRlZmluZSB0eXBlIEJhclwifScpO1xuXG5cdFx0Ly8gTG9hZCBzZWxlY3RlZCBleGFtcGxlIG5hbWVcblx0XHR0aGlzLnNlbGVjdChsb2NhbFN0b3JhZ2Uuc3BlbGxFZGl0b3JFeGFtcGxlKTtcblx0fVxuXG5cdC8vIFNhdmUgY3VycmVudCBleGFtcGxlcyAmIHNlbGVjdGlvbi5cblx0c2F2ZSgpIHtcblx0XHRsb2NhbFN0b3JhZ2Uuc3BlbGxFZGl0b3JFeGFtcGxlcyA9IEpTT04uc3RyaW5naWZ5KHRoaXMuZXhhbXBsZXMpO1xuXHR9XG5cblx0Ly8gU2VsZWN0IGEgZGlmZmVyZW50IGV4YW1wbGUuXG5cdHNlbGVjdChleGFtcGxlKSB7XG5cdFx0aWYgKCFleGFtcGxlIHx8IHRoaXMuZXhhbXBsZXNbZXhhbXBsZV0gPT0gbnVsbCkgZXhhbXBsZSA9IE9iamVjdC5rZXlzKHRoaXMuZXhhbXBsZXMpWzBdIHx8IFwiXCI7XG5cdFx0dGhpcy5zZWxlY3RlZCA9IGxvY2FsU3RvcmFnZS5zcGVsbEVkaXRvckV4YW1wbGUgPSBleGFtcGxlO1xuXHRcdHRoaXMub3V0cHV0ID0gXCJcIjtcblx0fVxuXG5cdC8vIENvbXBpbGUgdGhlIGN1cnJlbnQgZXhhbXBsZSwgcGxhY2luZyBpdCBpbiBvdXIgYG91dHB1dGAuXG5cdGNvbXBpbGUoKSB7XG5cdFx0dGhpcy5vdXRwdXQgPSBcIi4uLmNvbXBpbGluZy4uLlwiO1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0dGhpcy5vdXRwdXQgPSBwYXJzZXIuY29tcGlsZSh0aGlzLmNvZGUpO1xuXHRcdH0sIDEwMCk7XG5cdH1cblxuXHQvLyBDcmVhdGUgYSBuZXcgZXhhbXBsZS5cblx0Ly8gU2F2ZXMgYW5kIHNlbGVjdHMgdGhlIGV4YW1wbGUgYXV0b21hdGljYWxseS5cblx0dXBkYXRlKG5hbWUsIGNvZGUsIHNraXBTYXZlKSB7XG5cdFx0dGhpcy5leGFtcGxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZXhhbXBsZXMsIHsgWyBuYW1lIF06IGNvZGUgfSk7XG5cdFx0dGhpcy5zZWxlY3QobmFtZSk7XG5cdFx0dGhpcy5vdXRwdXQgPSBcIlwiO1xuXHRcdGlmICghc2tpcFNhdmUpIHRoaXMuc2F2ZSgpO1xuXHR9XG5cblx0Ly8gRGVsZXRlIGFuIGV4YW1wbGUuXG5cdC8vIFNhdmVzIGFuZCBzZWxlY3RzIGFub3RoZXIgZXhhbXBsZSBhdXRvbWF0aWNhbGx5LlxuXHRkZWxldGUobmFtZSA9IHRoaXMuc2VsZWN0ZWQpIHtcblx0XHRsZXQgZXhhbXBsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmV4YW1wbGVzKTtcblx0XHRkZWxldGUgZXhhbXBsZXNbbmFtZV07XG5cdFx0dGhpcy5leGFtcGxlcyA9IGV4YW1wbGVzO1xuXHRcdHRoaXMuc2VsZWN0KCk7XG5cdH1cblxuXHQvLyBDcmVhdGUgYSBuZXcgZXhhbXBsZS5cblx0Y3JlYXRlKG5hbWUsIGNvZGUgPSBcIlwiKSB7XG5cdFx0Ly8gSWYgbm8gbmFtZSwgcHJvbXB0LlxuXHRcdGlmICghbmFtZSkgbmFtZSA9IHByb21wdChcIk5hbWUgZm9yIHRoaXMgZXhhbXBsZT9cIik7XG5cdFx0Ly8gRm9yZ2V0IGl0IGlmIG5vIG5hbWUuXG5cdFx0aWYgKCFuYW1lKSByZXR1cm47XG5cblx0XHR0aGlzLnVwZGF0ZShuYW1lLCBjb2RlKTtcblx0fVxuXG5cdC8vIFJlbmFtZSBhbiBleGFtcGxlLlxuXHQvLyBTZWxlY3RzIGFuZCBzYXZlcyBhdXRvbWF0aWNhbGx5LlxuXHRyZW5hbWUob2xkTmFtZSA9IHRoaXMuc2VsZWN0ZWQsIG5ld05hbWUpIHtcblx0XHQvLyBJZiBubyBuZXcgbmFtZSwgcHJvbXB0LlxuXHRcdGlmICghbmV3TmFtZSkgbmV3TmFtZSA9IHByb21wdChcIk5ldyBuYW1lIGZvciB0aGlzIGV4YW1wbGU/XCIsIG9sZE5hbWUpO1xuXG5cdFx0Ly8gRm9yZ2V0IGl0IGlmIG5vIG5hbWUgc3VwcGxpZWQgb3IgbmFtZSBpcyB0aGUgc2FtZVxuXHRcdGlmICghbmV3TmFtZSB8fCBuZXdOYW1lID09PSBvbGROYW1lKSByZXR1cm47XG5cdFx0aWYgKHRoaXMuZXhhbXBsZXNbbmV3TmFtZV0pIHJldHVybiBjb25zb2xlLndhcm4oYGV4YW1wbGVzLnJlbmFtZShcIiR7bmV3TmFtZX1cIik6IG5hbWUgYWxyZWFkeSBpbiB1c2VgKTtcblxuXHRcdGxldCBjb2RlID0gdGhpcy5leGFtcGxlc1tvbGROYW1lXTtcblx0XHR0aGlzLmRlbGV0ZShvbGROYW1lKTtcblx0XHR0aGlzLnVwZGF0ZShuZXdOYW1lLCBjb2RlKTtcblx0fVxuXG5cdC8vIER1cGxpY2F0ZSBhbiBleGFtcGxlLlxuXHRkdXBsaWNhdGUob2xkTmFtZSA9IHRoaXMuc2VsZWN0ZWQsIG5ld05hbWUpIHtcblx0XHQvLyBJZiBubyBuZXcgbmFtZSwgcHJvbXB0LlxuXHRcdGlmICghbmV3TmFtZSkgbmV3TmFtZSA9IHByb21wdChcIk5ldyBuYW1lIGZvciBkdXBsaWNhdGUgZXhhbXBsZT9cIiwgb2xkTmFtZSk7XG5cdFx0Ly8gRm9yZ2V0IGl0IGlmIG5vIG5hbWUgc3VwcGxpZWQgb3IgbmFtZSBpcyB0aGUgc2FtZVxuXHRcdGlmICghbmV3TmFtZSB8fCBuZXdOYW1lID09PSBvbGROYW1lKSByZXR1cm47XG5cdFx0aWYgKHRoaXMuZXhhbXBsZXNbbmV3TmFtZV0pIHJldHVybiBjb25zb2xlLndhcm4oYGV4YW1wbGVzLnJlbmFtZShcIiR7bmV3TmFtZX1cIik6IG5hbWUgYWxyZWFkeSBpbiB1c2VgKTtcblxuXHRcdHRoaXMudXBkYXRlKG5ld05hbWUsIHRoaXMuY29kZSk7XG5cdH1cbn1cblxuXG5Ab2JzZXJ2ZXJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNwZWxsRWRpdG9yIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0c3RhdGljIGRlZmF1bHRQcm9wcyA9IHtcblx0XHRleGFtcGxlczogbmV3IEV4YW1wbGVTdG9yZSgpXG5cdH07XG5cblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG4vL0RFQlVHXG53aW5kb3cuc3BlbGxFZGl0b3IgPSB0aGlzO1xuXHRcdHRoaXMucHJvcHMuZXhhbXBsZXMubG9hZCgpO1xuXHR9XG5cblx0Ly8gRG8gTk9UIGV4aXQgb24gdGFiIC0tIGluc2VydCBvciByZW1vdmUgdGFiKHMpIHZhbHVlIGluc3RlYWQuXG5cdG9uSW5wdXRLZXlEb3duID0gKGV2ZW50KSA9PiB7XG5cdFx0Ly8gRm9yZ2V0IGl0IGlmIG5vdCBhIHRhYlxuXHRcdGlmIChldmVudC5rZXlDb2RlICE9PSA5KSByZXR1cm47XG5cblx0XHQvLyBwcmV2ZW50IGRlZmF1bHQgc28gd2UgZG9uJ3QgZXhpdCB0aGUgZmllbGRcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0Ly8gZmlndXJlIG91dCB0aGUgdGV4dCByYW5nZVxuXHRcdHZhciBlbGVtZW50ID0gZXZlbnQudGFyZ2V0O1xuXHRcdHZhciB0ZXh0ID0gZWxlbWVudC52YWx1ZTtcblx0XHR2YXIgc3RhcnQgPSBlbGVtZW50LnNlbGVjdGlvblN0YXJ0O1xuXHRcdHZhciBlbmQgPSBlbGVtZW50LnNlbGVjdGlvbkVuZDtcblxuXHRcdC8vIFJlcGxhY2VtZW50IHRleHRcblx0XHRsZXQgbmV3VGV4dCA9IFwiXCIsIHNlbGVjdGlvblN0YXJ0ID0gc3RhcnQsIHNlbGVjdGlvbkVuZCA9IGVuZDtcblxuXHRcdC8vIElmIHNlbGVjdGlvbiBpcyBlbXB0eSxcblx0XHRpZiAoc3RhcnQgPT09IGVuZCAmJiAhZXZlbnQuc2hpZnRLZXkpIHtcblx0XHRcdG5ld1RleHQgPSBcIlxcdFwiO1xuXHRcdFx0c2VsZWN0aW9uU3RhcnQgPSBzZWxlY3Rpb25FbmQgPSBlbmQgKyAxO1xuXHRcdH1cblx0XHQvLyBvdGhlcndpc2UgaW5kZW50L2RlLWluZGVudCBhbGwgb2YgdGhlIGxpbmVzXG5cdFx0ZWxzZSB7XG5cdFx0Ly8gdXNlIHN0YXJ0IGFuZCBlbmQgb2YgbGluZShzKVxuLy9jb25zb2xlLmluZm8oYHN0YXJ0OiAke3N0YXJ0fSA6JHt0ZXh0W3N0YXJ0XX06ICAgZW5kOiAke2VuZH0gOiAke3RleHRbZW5kXX06YCk7XG5cdFx0XHRpZiAodGV4dFtzdGFydF0gIT09IFwiXFxuXCIpIHN0YXJ0ID0gdGV4dC5sYXN0SW5kZXhPZihcIlxcblwiLCBzdGFydCkgKyAxO1xuXHRcdFx0aWYgKHRleHRbZW5kLTFdID09PSBcIlxcblwiKSBlbmQtLTtcblx0XHRcdGVsc2UgaWYgKHRleHRbZW5kKzFdICE9PSBcIlxcblwiKSBlbmQgPSB0ZXh0LmluZGV4T2YoXCJcXG5cIiwgZW5kKSAtIDE7XG4vL2NvbnNvbGUuaW5mbyhgc3RhcnQ6ICR7c3RhcnR9IDoke3RleHRbc3RhcnRdfTogICBlbmQ6ICR7ZW5kfSA6ICR7dGV4dFtlbmRdfTpgKTtcblxuXHRcdFx0bGV0IGxpbmVzID0gdGV4dC5zbGljZShzdGFydCwgZW5kKS5zcGxpdChcIlxcblwiKTtcblx0XHRcdC8vIGlmIHNoaWZ0IGtleSBpcyBkb3duLCBSRU1PVkUgYSB0YWIgZnJvbSBlYWNoIGxpbmVcblx0XHRcdGlmIChldmVudC5zaGlmdEtleSkge1xuXHRcdFx0XHRsaW5lcyA9IGxpbmVzLm1hcChsaW5lID0+IGxpbmVbMF0gPT09IFwiXFx0XCIgPyBsaW5lLnN1YnN0cigxKSA6IGxpbmUpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gb3RoZXJ3aXNlIEFERCBhIHRhYiB0byBlYWNoIGxpbmVcblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRsaW5lcyA9IGxpbmVzLm1hcChsaW5lID0+IFwiXFx0XCIgKyBsaW5lKTtcblx0XHRcdH1cblx0XHRcdHNlbGVjdGlvblN0YXJ0ID0gc3RhcnQ7XG5cdFx0XHRuZXdUZXh0ID0gbGluZXMuam9pbihcIlxcblwiKTtcblx0XHRcdHNlbGVjdGlvbkVuZCA9IHNlbGVjdGlvblN0YXJ0ICsgbmV3VGV4dC5sZW5ndGggKyAxO1xuXHRcdH1cblxuXHRcdC8vIFVwZGF0ZSBpbnB1dCB2YWx1ZS5cblx0XHRlbGVtZW50LnZhbHVlIFx0PSB0ZXh0LnN1YnN0cigwLCBzdGFydClcblx0XHRcdFx0XHRcdCsgbmV3VGV4dFxuXHRcdFx0XHRcdFx0KyB0ZXh0LnN1YnN0cihlbmQpO1xuXG5cdFx0Ly8gVXBkYXRlIHRoZSBzZWxlY3Rpb25cblx0XHRlbGVtZW50LnNlbGVjdGlvblN0YXJ0ID0gc2VsZWN0aW9uU3RhcnQ7XG5cdFx0ZWxlbWVudC5zZWxlY3Rpb25FbmQgPSBzZWxlY3Rpb25FbmQ7XG5cblx0XHRsZXQgeyBleGFtcGxlcyB9ID0gdGhpcy5wcm9wcztcblx0XHRleGFtcGxlcy51cGRhdGUoZXhhbXBsZXMuc2VsZWN0ZWQsIGVsZW1lbnQudmFsdWUsIFwiU0tJUF9TQVZFXCIpO1xuXHR9XG5cblx0Ly8gT24gY2hhbmdlIG9mIHRoZSBpbnB1dCBmaWVsZCxcblx0Ly9cdHVwZGF0ZSB0aGUgY3VycmVudCBleGFtcGxlIGJ1dCBkbyBOT1QgYXV0by1zYXZlLlxuXHRvbklucHV0Q2hhbmdlID0gKGV2ZW50KSA9PiB7XG5cdFx0bGV0IHsgZXhhbXBsZXMgfSA9IHRoaXMucHJvcHM7XG5cdFx0ZXhhbXBsZXMudXBkYXRlKGV4YW1wbGVzLnNlbGVjdGVkLCBldmVudC50YXJnZXQudmFsdWUsIFwiU0tJUF9TQVZFXCIpO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdGxldCB7IGV4YW1wbGVzIH0gPSB0aGlzLnByb3BzO1xuXHRcdGxldCB7IHRpdGxlcywgc2VsZWN0ZWQsIGNvZGUsIG91dHB1dCB9ID0gZXhhbXBsZXM7XG5cblx0XHQvLyBDcmVhdGUgbWVudWl0ZW1zIGZyb20gdGhlIGV4YW1wbGVzXG5cdFx0bGV0IG9wdGlvbnMgPSB0aXRsZXMubWFwKCB0aXRsZSA9PlxuXHRcdFx0KHtcblx0XHRcdFx0dmFsdWU6IHRpdGxlLFxuXHRcdFx0XHR0aXRsZTogdGl0bGUsXG5cdFx0XHRcdHRleHQ6IHRpdGxlLFxuXHRcdFx0XHRjb250ZW50OiB0aXRsZSxcblx0XHRcdFx0b25DbGljazogKCkgPT4gZXhhbXBsZXMuc2VsZWN0KHRpdGxlKVxuXHRcdFx0fSkpO1xuXG5cdFx0cmV0dXJuIChcblx0XHQ8R3JpZCBjb2x1bW5zPXszfSBzdHJldGNoZWQgcGFkZGVkIGNsYXNzTmFtZT1cImZ1bGxTaXplXCI+XG5cdFx0XHQ8R3JpZC5Sb3cgc3R5bGU9e3sgaGVpZ2h0OiBcIjJyZW1cIiwgcGFkZGluZ1RvcDogXCIwcmVtXCIgfX0+XG5cdFx0XHRcdDxNZW51IGludmVydGVkIGF0dGFjaGVkIGZsdWlkPlxuXHRcdFx0XHRcdDxTcGFjZXIgbWVkaXVtLz5cblx0XHRcdFx0XHQ8TWVudS5JdGVtPkV4YW1wbGU6PC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0PERyb3Bkb3duIGl0ZW0gc2VsZWN0aW9uIG9wdGlvbnM9e29wdGlvbnN9IHZhbHVlPXtzZWxlY3RlZH0vPlxuXHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gZXhhbXBsZXMucmVuYW1lKCl9PlJlbmFtZTwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gZXhhbXBsZXMuZGVsZXRlKCl9PkRlbGV0ZTwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdDxTcGFjZXIgZmx1aWQvPlxuXHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gZXhhbXBsZXMuY3JlYXRlKCl9Pk5ldzwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gZXhhbXBsZXMuZHVwbGljYXRlKCl9PkR1cGxpY2F0ZTwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gZXhhbXBsZXMuc2F2ZSgpfT5TYXZlPC9NZW51Lkl0ZW0+XG5cdFx0XHRcdFx0PFNwYWNlciBmbHVpZC8+XG5cdFx0XHRcdFx0PE1lbnUuSXRlbSBvbkNsaWNrPXsoKSA9PiBleGFtcGxlcy5sb2FkKCl9PlJlbG9hZDwvTWVudS5JdGVtPlxuXHRcdFx0XHRcdDxNZW51Lkl0ZW0gb25DbGljaz17KCkgPT4gZXhhbXBsZXMucmVzZXQoKX0+UmVzZXQ8L01lbnUuSXRlbT5cblx0XHRcdFx0XHQ8U3BhY2VyIG1lZGl1bS8+XG5cdFx0XHRcdDwvTWVudT5cblx0XHRcdDwvR3JpZC5Sb3c+XG5cdFx0XHQ8R3JpZC5Sb3cgc3R5bGU9e3sgaGVpZ2h0OiBcImNhbGMoMTAwJSAtIDNyZW0pXCIgfX0+XG5cdFx0XHRcdDxHcmlkLkNvbHVtbiB3aWR0aD17N30+XG5cdFx0XHRcdFx0PFRleHRBcmVhIGNsYXNzTmFtZT1cInVpIHNlZ21lbnRcIiB2YWx1ZT17Y29kZX1cblx0XHRcdFx0XHRcdG9uS2V5RG93bj17dGhpcy5vbklucHV0S2V5RG93bn1cblx0XHRcdFx0XHRcdG9uQ2hhbmdlPXt0aGlzLm9uSW5wdXRDaGFuZ2V9XG5cdFx0XHRcdFx0Lz5cblx0XHRcdFx0PC9HcmlkLkNvbHVtbj5cblx0XHRcdFx0PEdyaWQuQ29sdW1uIHdpZHRoPXsxfSB2ZXJ0aWNhbEFsaWduPVwibWlkZGxlXCI+XG5cdFx0XHRcdDxCdXR0b24gaWNvbj1cImNoZXZyb24gcmlnaHRcIiBvbkNsaWNrPXsoKSA9PiBleGFtcGxlcy5jb21waWxlKCl9Lz5cblx0XHRcdFx0PC9HcmlkLkNvbHVtbj5cblx0XHRcdFx0PEdyaWQuQ29sdW1uIHdpZHRoPXs4fT5cblx0XHRcdFx0XHQ8VGV4dEFyZWEgY2xhc3NOYW1lPVwidWkgc2VnbWVudFwiIHZhbHVlPXtvdXRwdXR9Lz5cblx0XHRcdFx0PC9HcmlkLkNvbHVtbj5cblx0XHRcdDwvR3JpZC5Sb3c+XG5cdFx0PC9HcmlkPlxuXHQpO31cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3NyYy9hcHAvU3BlbGxFZGl0b3IuanN4IiwiLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vL1xuLy8gIDxTcGFjZXI+IGNvbXBvbmVudCBmb3IgdXNlIHdpdGggb2FrLlxuLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5pbXBvcnQgUmVhY3QgZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgUHJvcFR5cGVzIGZyb20gXCJwcm9wLXR5cGVzXCI7XG5pbXBvcnQgeyBjbGFzc05hbWVzIH0gZnJvbSBcIi4vdXRpbFwiO1xuXG5pbXBvcnQgXCIuL1NwYWNlci5sZXNzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIFNwYWNlcihwcm9wcykge1xuICBjb25zdCB7XG4gICAgY2xhc3NOYW1lLFxuICAgIGFwcGVhcmFuY2UsIHNpemUsIHdpZHRoLCBoZWlnaHQsXG4gICAgaW5saW5lLCBmbHVpZCwgdGlueSwgc21hbGwsIG1lZGl1bSwgbGFyZ2UsIGh1Z2UsIG1hc3NpdmVcbiAgfSA9IHByb3BzO1xuXG4gIGNvbnN0IHNwYWNlclByb3BzID0ge1xuICAgIGNsYXNzTmFtZTogY2xhc3NOYW1lcyhjbGFzc05hbWUsIFwib2FrXCIsIHNpemUsIGFwcGVhcmFuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHsgaW5saW5lLCBmbHVpZCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBcInNwYWNlclwiKSxcbiAgICBzdHlsZToge1xuICAgICAgd2lkdGgsXG4gICAgICBoZWlnaHQsXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIDxkaXYgey4uLnNwYWNlclByb3BzfS8+O1xufVxuXG5TcGFjZXIucHJvcFR5cGVzID0ge1xuICBjbGFzc05hbWU6IFByb3BUeXBlcy5zdHJpbmcsXG4gIGFwcGVhcmFuY2U6IFByb3BUeXBlcy5zdHJpbmcsXG4gIHNpemU6IFByb3BUeXBlcy5zdHJpbmcsXG4gIHdpZHRoOiBQcm9wVHlwZXMubnVtYmVyLFxuICBoZWlnaHQ6IFByb3BUeXBlcy5udW1iZXIsXG5cbiAgaW5saW5lOiBQcm9wVHlwZXMuYm9vbCxcbiAgZmx1aWQ6IFByb3BUeXBlcy5ib29sLFxuXG59O1xuXG5TcGFjZXIuZGVmYXVsdFByb3BzID0ge1xuICBzaXplOiBcIm1lZGl1bVwiXG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvYXBwL1NwYWNlci5qc3giLCIvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBSZWFjdCBVdGlsaXR5IGZ1bmN0aW9uc1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8vIGBjbGFzc05hbWVzYCwgY29uY2VwdCBzdG9sZW4gZnJvbTogIGh0dHA6Ly9qZWR3YXRzb24uZ2l0aHViLmlvL2NsYXNzbmFtZXNcbmV4cG9ydCBmdW5jdGlvbiBjbGFzc05hbWVzICguLi5hcmdzKSB7XG4gIHJldHVybiBhcmdzLm1hcCggYXJnID0+IHtcbiAgICBpZiAoIWFyZykgcmV0dXJuIFwiXCI7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYXJnKSkgcmV0dXJuIGNsYXNzTmFtZXMoLi4uYXJnKTtcbiAgICBzd2l0Y2ggKHR5cGVvZiBhcmcpIHtcbiAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgIGNhc2UgXCJzdHJpbmdcIjogIHJldHVybiBhcmc7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoYXJnKS5tYXAoIGtleSA9PiBhcmdba2V5XSA/IGtleSA6IFwiXCIpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAgICAgICAgIC5qb2luKFwiIFwiKTtcbiAgICB9XG4gIH0pLmZpbHRlcihCb29sZWFuKVxuICAgIC5qb2luKFwiIFwiKTtcbn1cblxuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2FwcC91dGlsLmpzIiwiZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2xpYi9jc3MtYmFzZS5qc1wiKSh1bmRlZmluZWQpO1xuLy8gaW1wb3J0c1xuXG5cbi8vIG1vZHVsZVxuZXhwb3J0cy5wdXNoKFttb2R1bGUuaWQsIFwiLm9hay5zcGFjZXIge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgZGlzcGxheTogYmxvY2s7XFxufVxcbi5vYWsuc3BhY2VyLmlubGluZSB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICB2ZXJ0aWNhbC1hbGlnbjogYmFzZWxpbmU7XFxufVxcbi5vYWsuc3BhY2VyLmZsdWlkIHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgZmxleDogMSAxIDEwMCU7XFxufVxcbi5vYWsuc3BhY2VyLnRpbnkge1xcbiAgd2lkdGg6IDJweDtcXG4gIGhlaWdodDogMnB4O1xcbn1cXG4ub2FrLnNwYWNlci5zbWFsbCB7XFxuICB3aWR0aDogNHB4O1xcbiAgaGVpZ2h0OiA0cHg7XFxufVxcbi5vYWsuc3BhY2VyLm1lZGl1bSB7XFxuICB3aWR0aDogMTBweDtcXG4gIGhlaWdodDogMTBweDtcXG59XFxuLm9hay5zcGFjZXIubGFyZ2Uge1xcbiAgd2lkdGg6IDIwcHg7XFxuICBoZWlnaHQ6IDIwcHg7XFxufVxcbi5vYWsuc3BhY2VyLmh1Z2Uge1xcbiAgd2lkdGg6IDMwcHg7XFxuICBoZWlnaHQ6IDMwcHg7XFxufVxcbi5vYWsuc3BhY2VyLm1hc3NpdmUge1xcbiAgd2lkdGg6IDUwcHg7XFxuICBoZWlnaHQ6IDUwcHg7XFxufVxcblwiLCBcIlwiXSk7XG5cbi8vIGV4cG9ydHNcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9jc3MtbG9hZGVyIS4vfi9sZXNzLWxvYWRlci9kaXN0IS4vc3JjL2FwcC9TcGFjZXIubGVzc1xuLy8gbW9kdWxlIGlkID0gNDYzXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsImV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9saWIvY3NzLWJhc2UuanNcIikodW5kZWZpbmVkKTtcbi8vIGltcG9ydHNcblxuXG4vLyBtb2R1bGVcbmV4cG9ydHMucHVzaChbbW9kdWxlLmlkLCBcIi5mdWxsV2lkdGgge1xcbiAgd2lkdGg6IDEwMCU7XFxufVxcbi5mdWxsSGVpZ2h0IHtcXG4gIGhlaWdodDogMTAwJTtcXG59XFxuLmZ1bGxTaXplIHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgaGVpZ2h0OiAxMDAlO1xcbn1cXG5cIiwgXCJcIl0pO1xuXG4vLyBleHBvcnRzXG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vY3NzLWxvYWRlciEuL34vbGVzcy1sb2FkZXIvZGlzdCEuL3NyYy9hcHAvc3R5bGVzLmxlc3Ncbi8vIG1vZHVsZSBpZCA9IDQ2NFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIoZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoXCJyZWFjdFwiKSwgcmVxdWlyZShcIm1vYnhcIiksIHJlcXVpcmUoXCJyZWFjdC1kb21cIikpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoW1wicmVhY3RcIiwgXCJtb2J4XCIsIFwicmVhY3QtZG9tXCJdLCBmYWN0b3J5KTtcblx0ZWxzZSBpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpXG5cdFx0ZXhwb3J0c1tcIm1vYnhSZWFjdFwiXSA9IGZhY3RvcnkocmVxdWlyZShcInJlYWN0XCIpLCByZXF1aXJlKFwibW9ieFwiKSwgcmVxdWlyZShcInJlYWN0LWRvbVwiKSk7XG5cdGVsc2Vcblx0XHRyb290W1wibW9ieFJlYWN0XCJdID0gZmFjdG9yeShyb290W1wiUmVhY3RcIl0sIHJvb3RbXCJtb2J4XCJdLCByb290W1wiUmVhY3RET01cIl0pO1xufSkodGhpcywgZnVuY3Rpb24oX19XRUJQQUNLX0VYVEVSTkFMX01PRFVMRV8xX18sIF9fV0VCUEFDS19FWFRFUk5BTF9NT0RVTEVfMl9fLCBfX1dFQlBBQ0tfRVhURVJOQUxfTU9EVUxFXzVfXykge1xucmV0dXJuIC8qKioqKiovIChmdW5jdGlvbihtb2R1bGVzKSB7IC8vIHdlYnBhY2tCb290c3RyYXBcbi8qKioqKiovIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuLyoqKioqKi8gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuLyoqKioqKi9cbi8qKioqKiovIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbi8qKioqKiovIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuLyoqKioqKi9cbi8qKioqKiovIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbi8qKioqKiovIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbi8qKioqKiovIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuLyoqKioqKi9cbi8qKioqKiovIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuLyoqKioqKi8gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbi8qKioqKiovIFx0XHRcdGk6IG1vZHVsZUlkLFxuLyoqKioqKi8gXHRcdFx0bDogZmFsc2UsXG4vKioqKioqLyBcdFx0XHRleHBvcnRzOiB7fVxuLyoqKioqKi8gXHRcdH07XG4vKioqKioqL1xuLyoqKioqKi8gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuLyoqKioqKi8gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuLyoqKioqKi9cbi8qKioqKiovIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4vKioqKioqLyBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuLyoqKioqKi9cbi8qKioqKiovIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuLyoqKioqKi8gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbi8qKioqKiovIFx0fVxuLyoqKioqKi9cbi8qKioqKiovXG4vKioqKioqLyBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4vKioqKioqLyBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG4vKioqKioqL1xuLyoqKioqKi8gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuLyoqKioqKi9cbi8qKioqKiovIFx0Ly8gaWRlbnRpdHkgZnVuY3Rpb24gZm9yIGNhbGxpbmcgaGFybW9ueSBpbXBvcnRzIHdpdGggdGhlIGNvcnJlY3QgY29udGV4dFxuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG4vKioqKioqL1xuLyoqKioqKi8gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbi8qKioqKiovIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4vKioqKioqLyBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuLyoqKioqKi8gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbi8qKioqKiovIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbi8qKioqKiovIFx0XHRcdFx0ZW51bWVyYWJsZTogdHJ1ZSxcbi8qKioqKiovIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbi8qKioqKiovIFx0XHRcdH0pO1xuLyoqKioqKi8gXHRcdH1cbi8qKioqKiovIFx0fTtcbi8qKioqKiovXG4vKioqKioqLyBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4vKioqKioqLyBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuLyoqKioqKi8gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuLyoqKioqKi8gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbi8qKioqKiovIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4vKioqKioqLyBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuLyoqKioqKi8gXHRcdHJldHVybiBnZXR0ZXI7XG4vKioqKioqLyBcdH07XG4vKioqKioqL1xuLyoqKioqKi8gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbi8qKioqKiovIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuLyoqKioqKi9cbi8qKioqKiovIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbi8qKioqKiovIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcbi8qKioqKiovXG4vKioqKioqLyBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLyoqKioqKi8gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSA4KTtcbi8qKioqKiovIH0pXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyoqKioqKi8gKFtcbi8qIDAgKi9cbi8qKiovIChmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMub2JqZWN0T3JPYnNlcnZhYmxlT2JqZWN0ID0gZXhwb3J0cy5hcnJheU9yT2JzZXJ2YWJsZUFycmF5T2YgPSBleHBvcnRzLmFycmF5T3JPYnNlcnZhYmxlQXJyYXkgPSBleHBvcnRzLm9ic2VydmFibGVPYmplY3QgPSBleHBvcnRzLm9ic2VydmFibGVNYXAgPSBleHBvcnRzLm9ic2VydmFibGVBcnJheU9mID0gZXhwb3J0cy5vYnNlcnZhYmxlQXJyYXkgPSB1bmRlZmluZWQ7XG5cbnZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxudmFyIF9tb2J4ID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuLy8gQ29waWVkIGZyb20gUmVhY3QuUHJvcFR5cGVzXG5mdW5jdGlvbiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSkge1xuICBmdW5jdGlvbiBjaGVja1R5cGUoaXNSZXF1aXJlZCwgcHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIHJlc3QgPSBBcnJheShfbGVuID4gNiA/IF9sZW4gLSA2IDogMCksIF9rZXkgPSA2OyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICByZXN0W19rZXkgLSA2XSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICB9XG5cbiAgICByZXR1cm4gKDAsIF9tb2J4LnVudHJhY2tlZCkoZnVuY3Rpb24gKCkge1xuICAgICAgY29tcG9uZW50TmFtZSA9IGNvbXBvbmVudE5hbWUgfHwgJzw8YW5vbnltb3VzPj4nO1xuICAgICAgcHJvcEZ1bGxOYW1lID0gcHJvcEZ1bGxOYW1lIHx8IHByb3BOYW1lO1xuICAgICAgaWYgKHByb3BzW3Byb3BOYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIGlmIChpc1JlcXVpcmVkKSB7XG4gICAgICAgICAgdmFyIGFjdHVhbCA9IHByb3BzW3Byb3BOYW1lXSA9PT0gbnVsbCA/ICdudWxsJyA6ICd1bmRlZmluZWQnO1xuICAgICAgICAgIHJldHVybiBuZXcgRXJyb3IoJ1RoZSAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2AgaXMgbWFya2VkIGFzIHJlcXVpcmVkICcgKyAnaW4gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGJ1dCBpdHMgdmFsdWUgaXMgYCcgKyBhY3R1YWwgKyAnYC4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWxpZGF0ZS5hcHBseSh1bmRlZmluZWQsIFtwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWVdLmNvbmNhdChyZXN0KSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICB2YXIgY2hhaW5lZENoZWNrVHlwZSA9IGNoZWNrVHlwZS5iaW5kKG51bGwsIGZhbHNlKTtcbiAgY2hhaW5lZENoZWNrVHlwZS5pc1JlcXVpcmVkID0gY2hlY2tUeXBlLmJpbmQobnVsbCwgdHJ1ZSk7XG4gIHJldHVybiBjaGFpbmVkQ2hlY2tUeXBlO1xufVxuXG4vLyBDb3BpZWQgZnJvbSBSZWFjdC5Qcm9wVHlwZXNcbmZ1bmN0aW9uIGlzU3ltYm9sKHByb3BUeXBlLCBwcm9wVmFsdWUpIHtcbiAgLy8gTmF0aXZlIFN5bWJvbC5cbiAgaWYgKHByb3BUeXBlID09PSAnc3ltYm9sJykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gMTkuNC4zLjUgU3ltYm9sLnByb3RvdHlwZVtAQHRvU3RyaW5nVGFnXSA9PT0gJ1N5bWJvbCdcbiAgaWYgKHByb3BWYWx1ZVsnQEB0b1N0cmluZ1RhZyddID09PSAnU3ltYm9sJykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gRmFsbGJhY2sgZm9yIG5vbi1zcGVjIGNvbXBsaWFudCBTeW1ib2xzIHdoaWNoIGFyZSBwb2x5ZmlsbGVkLlxuICBpZiAodHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiBwcm9wVmFsdWUgaW5zdGFuY2VvZiBTeW1ib2wpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLy8gQ29waWVkIGZyb20gUmVhY3QuUHJvcFR5cGVzXG5mdW5jdGlvbiBnZXRQcm9wVHlwZShwcm9wVmFsdWUpIHtcbiAgdmFyIHByb3BUeXBlID0gdHlwZW9mIHByb3BWYWx1ZSA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YocHJvcFZhbHVlKTtcbiAgaWYgKEFycmF5LmlzQXJyYXkocHJvcFZhbHVlKSkge1xuICAgIHJldHVybiAnYXJyYXknO1xuICB9XG4gIGlmIChwcm9wVmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAvLyBPbGQgd2Via2l0cyAoYXQgbGVhc3QgdW50aWwgQW5kcm9pZCA0LjApIHJldHVybiAnZnVuY3Rpb24nIHJhdGhlciB0aGFuXG4gICAgLy8gJ29iamVjdCcgZm9yIHR5cGVvZiBhIFJlZ0V4cC4gV2UnbGwgbm9ybWFsaXplIHRoaXMgaGVyZSBzbyB0aGF0IC9ibGEvXG4gICAgLy8gcGFzc2VzIFByb3BUeXBlcy5vYmplY3QuXG4gICAgcmV0dXJuICdvYmplY3QnO1xuICB9XG4gIGlmIChpc1N5bWJvbChwcm9wVHlwZSwgcHJvcFZhbHVlKSkge1xuICAgIHJldHVybiAnc3ltYm9sJztcbiAgfVxuICByZXR1cm4gcHJvcFR5cGU7XG59XG5cbi8vIFRoaXMgaGFuZGxlcyBtb3JlIHR5cGVzIHRoYW4gYGdldFByb3BUeXBlYC4gT25seSB1c2VkIGZvciBlcnJvciBtZXNzYWdlcy5cbi8vIENvcGllZCBmcm9tIFJlYWN0LlByb3BUeXBlc1xuZnVuY3Rpb24gZ2V0UHJlY2lzZVR5cGUocHJvcFZhbHVlKSB7XG4gIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gIGlmIChwcm9wVHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICBpZiAocHJvcFZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgcmV0dXJuICdkYXRlJztcbiAgICB9IGVsc2UgaWYgKHByb3BWYWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgcmV0dXJuICdyZWdleHAnO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcHJvcFR5cGU7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU9ic2VydmFibGVUeXBlQ2hlY2tlckNyZWF0b3IoYWxsb3dOYXRpdmVUeXBlLCBtb2J4VHlwZSkge1xuICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIoZnVuY3Rpb24gKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgIHJldHVybiAoMCwgX21vYngudW50cmFja2VkKShmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoYWxsb3dOYXRpdmVUeXBlKSB7XG4gICAgICAgIGlmIChnZXRQcm9wVHlwZShwcm9wc1twcm9wTmFtZV0pID09PSBtb2J4VHlwZS50b0xvd2VyQ2FzZSgpKSByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHZhciBtb2J4Q2hlY2tlciA9IHZvaWQgMDtcbiAgICAgIHN3aXRjaCAobW9ieFR5cGUpIHtcbiAgICAgICAgY2FzZSAnQXJyYXknOlxuICAgICAgICAgIG1vYnhDaGVja2VyID0gX21vYnguaXNPYnNlcnZhYmxlQXJyYXk7YnJlYWs7XG4gICAgICAgIGNhc2UgJ09iamVjdCc6XG4gICAgICAgICAgbW9ieENoZWNrZXIgPSBfbW9ieC5pc09ic2VydmFibGVPYmplY3Q7YnJlYWs7XG4gICAgICAgIGNhc2UgJ01hcCc6XG4gICAgICAgICAgbW9ieENoZWNrZXIgPSBfbW9ieC5pc09ic2VydmFibGVNYXA7YnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIG1vYnhUeXBlOiAnICsgbW9ieFR5cGUpO1xuICAgICAgfVxuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIGlmICghbW9ieENoZWNrZXIocHJvcFZhbHVlKSkge1xuICAgICAgICB2YXIgcHJlY2lzZVR5cGUgPSBnZXRQcmVjaXNlVHlwZShwcm9wVmFsdWUpO1xuICAgICAgICB2YXIgbmF0aXZlVHlwZUV4cGVjdGF0aW9uTWVzc2FnZSA9IGFsbG93TmF0aXZlVHlwZSA/ICcgb3IgamF2YXNjcmlwdCBgJyArIG1vYnhUeXBlLnRvTG93ZXJDYXNlKCkgKyAnYCcgOiAnJztcbiAgICAgICAgcmV0dXJuIG5ldyBFcnJvcignSW52YWxpZCBwcm9wIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSBgJyArIHByZWNpc2VUeXBlICsgJ2Agc3VwcGxpZWQgdG8nICsgJyBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgYG1vYnguT2JzZXJ2YWJsZScgKyBtb2J4VHlwZSArICdgJyArIG5hdGl2ZVR5cGVFeHBlY3RhdGlvbk1lc3NhZ2UgKyAnLicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVPYnNlcnZhYmxlQXJyYXlPZlR5cGVDaGVja2VyKGFsbG93TmF0aXZlVHlwZSwgdHlwZUNoZWNrZXIpIHtcbiAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKGZ1bmN0aW9uIChwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICBmb3IgKHZhciBfbGVuMiA9IGFyZ3VtZW50cy5sZW5ndGgsIHJlc3QgPSBBcnJheShfbGVuMiA+IDUgPyBfbGVuMiAtIDUgOiAwKSwgX2tleTIgPSA1OyBfa2V5MiA8IF9sZW4yOyBfa2V5MisrKSB7XG4gICAgICByZXN0W19rZXkyIC0gNV0gPSBhcmd1bWVudHNbX2tleTJdO1xuICAgIH1cblxuICAgIHJldHVybiAoMCwgX21vYngudW50cmFja2VkKShmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodHlwZW9mIHR5cGVDaGVja2VyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBuZXcgRXJyb3IoJ1Byb3BlcnR5IGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgY29tcG9uZW50IGAnICsgY29tcG9uZW50TmFtZSArICdgIGhhcyAnICsgJ2ludmFsaWQgUHJvcFR5cGUgbm90YXRpb24uJyk7XG4gICAgICB9XG4gICAgICB2YXIgZXJyb3IgPSBjcmVhdGVPYnNlcnZhYmxlVHlwZUNoZWNrZXJDcmVhdG9yKGFsbG93TmF0aXZlVHlwZSwgJ0FycmF5JykocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lKTtcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gZXJyb3I7XG4gICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wVmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZXJyb3IgPSB0eXBlQ2hlY2tlci5hcHBseSh1bmRlZmluZWQsIFtwcm9wVmFsdWUsIGksIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUgKyAnWycgKyBpICsgJ10nXS5jb25jYXQocmVzdCkpO1xuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikgcmV0dXJuIGVycm9yO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSk7XG4gIH0pO1xufVxuXG52YXIgb2JzZXJ2YWJsZUFycmF5ID0gZXhwb3J0cy5vYnNlcnZhYmxlQXJyYXkgPSBjcmVhdGVPYnNlcnZhYmxlVHlwZUNoZWNrZXJDcmVhdG9yKGZhbHNlLCAnQXJyYXknKTtcbnZhciBvYnNlcnZhYmxlQXJyYXlPZiA9IGV4cG9ydHMub2JzZXJ2YWJsZUFycmF5T2YgPSBjcmVhdGVPYnNlcnZhYmxlQXJyYXlPZlR5cGVDaGVja2VyLmJpbmQobnVsbCwgZmFsc2UpO1xudmFyIG9ic2VydmFibGVNYXAgPSBleHBvcnRzLm9ic2VydmFibGVNYXAgPSBjcmVhdGVPYnNlcnZhYmxlVHlwZUNoZWNrZXJDcmVhdG9yKGZhbHNlLCAnTWFwJyk7XG52YXIgb2JzZXJ2YWJsZU9iamVjdCA9IGV4cG9ydHMub2JzZXJ2YWJsZU9iamVjdCA9IGNyZWF0ZU9ic2VydmFibGVUeXBlQ2hlY2tlckNyZWF0b3IoZmFsc2UsICdPYmplY3QnKTtcbnZhciBhcnJheU9yT2JzZXJ2YWJsZUFycmF5ID0gZXhwb3J0cy5hcnJheU9yT2JzZXJ2YWJsZUFycmF5ID0gY3JlYXRlT2JzZXJ2YWJsZVR5cGVDaGVja2VyQ3JlYXRvcih0cnVlLCAnQXJyYXknKTtcbnZhciBhcnJheU9yT2JzZXJ2YWJsZUFycmF5T2YgPSBleHBvcnRzLmFycmF5T3JPYnNlcnZhYmxlQXJyYXlPZiA9IGNyZWF0ZU9ic2VydmFibGVBcnJheU9mVHlwZUNoZWNrZXIuYmluZChudWxsLCB0cnVlKTtcbnZhciBvYmplY3RPck9ic2VydmFibGVPYmplY3QgPSBleHBvcnRzLm9iamVjdE9yT2JzZXJ2YWJsZU9iamVjdCA9IGNyZWF0ZU9ic2VydmFibGVUeXBlQ2hlY2tlckNyZWF0b3IodHJ1ZSwgJ09iamVjdCcpO1xuXG4vKioqLyB9KSxcbi8qIDEgKi9cbi8qKiovIChmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMpIHtcblxubW9kdWxlLmV4cG9ydHMgPSBfX1dFQlBBQ0tfRVhURVJOQUxfTU9EVUxFXzFfXztcblxuLyoqKi8gfSksXG4vKiAyICovXG4vKioqLyAoZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzKSB7XG5cbm1vZHVsZS5leHBvcnRzID0gX19XRUJQQUNLX0VYVEVSTkFMX01PRFVMRV8yX187XG5cbi8qKiovIH0pLFxuLyogMyAqL1xuLyoqKi8gKGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cInVzZSBzdHJpY3RcIjtcblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpO1xuXG5leHBvcnRzLmRlZmF1bHQgPSBpbmplY3Q7XG5cbnZhciBfcmVhY3QgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxudmFyIF9ob2lzdE5vblJlYWN0U3RhdGljcyA9IF9fd2VicGFja19yZXF1aXJlX18oMTApO1xuXG52YXIgX2hvaXN0Tm9uUmVhY3RTdGF0aWNzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2hvaXN0Tm9uUmVhY3RTdGF0aWNzKTtcblxudmFyIF9wcm9wVHlwZXMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDApO1xuXG52YXIgUHJvcFR5cGVzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX3Byb3BUeXBlcyk7XG5cbnZhciBfb2JzZXJ2ZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmICghc2VsZikgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIGNhbGwgJiYgKHR5cGVvZiBjYWxsID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpID8gY2FsbCA6IHNlbGY7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgXCIgKyB0eXBlb2Ygc3VwZXJDbGFzcyk7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcykgOiBzdWJDbGFzcy5fX3Byb3RvX18gPSBzdXBlckNsYXNzOyB9XG5cbnZhciBpbmplY3RvckNvbnRleHRUeXBlcyA9IHtcbiAgbW9ieFN0b3JlczogUHJvcFR5cGVzLm9iamVjdE9yT2JzZXJ2YWJsZU9iamVjdFxufTtcbk9iamVjdC5zZWFsKGluamVjdG9yQ29udGV4dFR5cGVzKTtcblxudmFyIHByb3hpZWRJbmplY3RvclByb3BzID0ge1xuICBjb250ZXh0VHlwZXM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgIHJldHVybiBpbmplY3RvckNvbnRleHRUeXBlcztcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24gc2V0KF8pIHtcbiAgICAgIGNvbnNvbGUud2FybihcIk1vYnggSW5qZWN0b3I6IHlvdSBhcmUgdHJ5aW5nIHRvIGF0dGFjaCBgY29udGV4dFR5cGVzYCBvbiBhbiBjb21wb25lbnQgZGVjb3JhdGVkIHdpdGggYGluamVjdGAgKG9yIGBvYnNlcnZlcmApIEhPQy4gUGxlYXNlIHNwZWNpZnkgdGhlIGNvbnRleHRUeXBlcyBvbiB0aGUgd3JhcHBlZCBjb21wb25lbnQgaW5zdGVhZC4gSXQgaXMgYWNjZXNzaWJsZSB0aHJvdWdoIHRoZSBgd3JhcHBlZENvbXBvbmVudGBcIik7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSxcbiAgaXNNb2J4SW5qZWN0b3I6IHtcbiAgICB2YWx1ZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZVxuICB9XG59O1xuXG4vKipcbiAqIFN0b3JlIEluamVjdGlvblxuICovXG5mdW5jdGlvbiBjcmVhdGVTdG9yZUluamVjdG9yKGdyYWJTdG9yZXNGbiwgY29tcG9uZW50LCBpbmplY3ROYW1lcykge1xuICB2YXIgX2NsYXNzLCBfdGVtcDI7XG5cbiAgdmFyIGRpc3BsYXlOYW1lID0gXCJpbmplY3QtXCIgKyAoY29tcG9uZW50LmRpc3BsYXlOYW1lIHx8IGNvbXBvbmVudC5uYW1lIHx8IGNvbXBvbmVudC5jb25zdHJ1Y3RvciAmJiBjb21wb25lbnQuY29uc3RydWN0b3IubmFtZSB8fCBcIlVua25vd25cIik7XG4gIGlmIChpbmplY3ROYW1lcykgZGlzcGxheU5hbWUgKz0gXCItd2l0aC1cIiArIGluamVjdE5hbWVzO1xuXG4gIHZhciBJbmplY3RvciA9IChfdGVtcDIgPSBfY2xhc3MgPSBmdW5jdGlvbiAoX0NvbXBvbmVudCkge1xuICAgIF9pbmhlcml0cyhJbmplY3RvciwgX0NvbXBvbmVudCk7XG5cbiAgICBmdW5jdGlvbiBJbmplY3RvcigpIHtcbiAgICAgIHZhciBfcmVmO1xuXG4gICAgICB2YXIgX3RlbXAsIF90aGlzLCBfcmV0O1xuXG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgSW5qZWN0b3IpO1xuXG4gICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4pLCBfa2V5ID0gMDsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgICBhcmdzW19rZXldID0gYXJndW1lbnRzW19rZXldO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gX3JldCA9IChfdGVtcCA9IChfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIChfcmVmID0gSW5qZWN0b3IuX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihJbmplY3RvcikpLmNhbGwuYXBwbHkoX3JlZiwgW3RoaXNdLmNvbmNhdChhcmdzKSkpLCBfdGhpcyksIF90aGlzLnN0b3JlUmVmID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gICAgICAgIF90aGlzLndyYXBwZWRJbnN0YW5jZSA9IGluc3RhbmNlO1xuICAgICAgfSwgX3RlbXApLCBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihfdGhpcywgX3JldCk7XG4gICAgfVxuXG4gICAgX2NyZWF0ZUNsYXNzKEluamVjdG9yLCBbe1xuICAgICAga2V5OiAncmVuZGVyJyxcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICAgIC8vIE9wdGltaXphdGlvbjogaXQgbWlnaHQgYmUgbW9yZSBlZmZpY2llbnQgdG8gYXBwbHkgdGhlIG1hcHBlciBmdW5jdGlvbiAqb3V0c2lkZSogdGhlIHJlbmRlciBtZXRob2RcbiAgICAgICAgLy8gKGlmIHRoZSBtYXBwZXIgaXMgYSBmdW5jdGlvbiksIHRoYXQgY291bGQgYXZvaWQgZXhwZW5zaXZlKD8pIHJlLXJlbmRlcmluZyBvZiB0aGUgaW5qZWN0b3IgY29tcG9uZW50XG4gICAgICAgIC8vIFNlZSB0aGlzIHRlc3Q6ICd1c2luZyBhIGN1c3RvbSBpbmplY3RvciBpcyBub3QgdG9vIHJlYWN0aXZlJyBpbiBpbmplY3QuanNcbiAgICAgICAgdmFyIG5ld1Byb3BzID0ge307XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLnByb3BzKSB7XG4gICAgICAgICAgaWYgKHRoaXMucHJvcHMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgbmV3UHJvcHNba2V5XSA9IHRoaXMucHJvcHNba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH12YXIgYWRkaXRpb25hbFByb3BzID0gZ3JhYlN0b3Jlc0ZuKHRoaXMuY29udGV4dC5tb2J4U3RvcmVzIHx8IHt9LCBuZXdQcm9wcywgdGhpcy5jb250ZXh0KSB8fCB7fTtcbiAgICAgICAgZm9yICh2YXIgX2tleTIgaW4gYWRkaXRpb25hbFByb3BzKSB7XG4gICAgICAgICAgbmV3UHJvcHNbX2tleTJdID0gYWRkaXRpb25hbFByb3BzW19rZXkyXTtcbiAgICAgICAgfVxuICAgICAgICBuZXdQcm9wcy5yZWYgPSB0aGlzLnN0b3JlUmVmO1xuXG4gICAgICAgIHJldHVybiBfcmVhY3QyLmRlZmF1bHQuY3JlYXRlRWxlbWVudChjb21wb25lbnQsIG5ld1Byb3BzKTtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gSW5qZWN0b3I7XG4gIH0oX3JlYWN0LkNvbXBvbmVudCksIF9jbGFzcy5kaXNwbGF5TmFtZSA9IGRpc3BsYXlOYW1lLCBfdGVtcDIpO1xuXG4gIC8vIFN0YXRpYyBmaWVsZHMgZnJvbSBjb21wb25lbnQgc2hvdWxkIGJlIHZpc2libGUgb24gdGhlIGdlbmVyYXRlZCBJbmplY3RvclxuXG4gICgwLCBfaG9pc3ROb25SZWFjdFN0YXRpY3MyLmRlZmF1bHQpKEluamVjdG9yLCBjb21wb25lbnQpO1xuXG4gIEluamVjdG9yLndyYXBwZWRDb21wb25lbnQgPSBjb21wb25lbnQ7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEluamVjdG9yLCBwcm94aWVkSW5qZWN0b3JQcm9wcyk7XG5cbiAgcmV0dXJuIEluamVjdG9yO1xufVxuXG5mdW5jdGlvbiBncmFiU3RvcmVzQnlOYW1lKHN0b3JlTmFtZXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChiYXNlU3RvcmVzLCBuZXh0UHJvcHMpIHtcbiAgICBzdG9yZU5hbWVzLmZvckVhY2goZnVuY3Rpb24gKHN0b3JlTmFtZSkge1xuICAgICAgaWYgKHN0b3JlTmFtZSBpbiBuZXh0UHJvcHMpIC8vIHByZWZlciBwcm9wcyBvdmVyIHN0b3Jlc1xuICAgICAgICByZXR1cm47XG4gICAgICBpZiAoIShzdG9yZU5hbWUgaW4gYmFzZVN0b3JlcykpIHRocm93IG5ldyBFcnJvcihcIk1vYlggb2JzZXJ2ZXI6IFN0b3JlICdcIiArIHN0b3JlTmFtZSArIFwiJyBpcyBub3QgYXZhaWxhYmxlISBNYWtlIHN1cmUgaXQgaXMgcHJvdmlkZWQgYnkgc29tZSBQcm92aWRlclwiKTtcbiAgICAgIG5leHRQcm9wc1tzdG9yZU5hbWVdID0gYmFzZVN0b3Jlc1tzdG9yZU5hbWVdO1xuICAgIH0pO1xuICAgIHJldHVybiBuZXh0UHJvcHM7XG4gIH07XG59XG5cbi8qKlxuICogaGlnaGVyIG9yZGVyIGNvbXBvbmVudCB0aGF0IGluamVjdHMgc3RvcmVzIHRvIGEgY2hpbGQuXG4gKiB0YWtlcyBlaXRoZXIgYSB2YXJhcmdzIGxpc3Qgb2Ygc3RyaW5ncywgd2hpY2ggYXJlIHN0b3JlcyByZWFkIGZyb20gdGhlIGNvbnRleHQsXG4gKiBvciBhIGZ1bmN0aW9uIHRoYXQgbWFudWFsbHkgbWFwcyB0aGUgYXZhaWxhYmxlIHN0b3JlcyBmcm9tIHRoZSBjb250ZXh0IHRvIHByb3BzOlxuICogc3RvcmVzVG9Qcm9wcyhtb2J4U3RvcmVzLCBwcm9wcywgY29udGV4dCkgPT4gbmV3UHJvcHNcbiAqL1xuZnVuY3Rpb24gaW5qZWN0KCkgLyogZm4oc3RvcmVzLCBuZXh0UHJvcHMpIG9yIC4uLnN0b3JlTmFtZXMgKi97XG4gIHZhciBncmFiU3RvcmVzRm4gPSB2b2lkIDA7XG4gIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBncmFiU3RvcmVzRm4gPSBhcmd1bWVudHNbMF07XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChjb21wb25lbnRDbGFzcykge1xuICAgICAgdmFyIGluamVjdGVkID0gY3JlYXRlU3RvcmVJbmplY3RvcihncmFiU3RvcmVzRm4sIGNvbXBvbmVudENsYXNzKTtcbiAgICAgIGluamVjdGVkLmlzTW9ieEluamVjdG9yID0gZmFsc2U7IC8vIHN1cHJlc3Mgd2FybmluZ1xuICAgICAgLy8gbWFyayB0aGUgSW5qZWN0b3IgYXMgb2JzZXJ2ZXIsIHRvIG1ha2UgaXQgcmVhY3QgdG8gZXhwcmVzc2lvbnMgaW4gYGdyYWJTdG9yZXNGbmAsXG4gICAgICAvLyBzZWUgIzExMVxuICAgICAgaW5qZWN0ZWQgPSAoMCwgX29ic2VydmVyLm9ic2VydmVyKShpbmplY3RlZCk7XG4gICAgICBpbmplY3RlZC5pc01vYnhJbmplY3RvciA9IHRydWU7IC8vIHJlc3RvcmUgd2FybmluZ1xuICAgICAgcmV0dXJuIGluamVjdGVkO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgdmFyIHN0b3JlTmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgc3RvcmVOYW1lc1tpXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9Z3JhYlN0b3Jlc0ZuID0gZ3JhYlN0b3Jlc0J5TmFtZShzdG9yZU5hbWVzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGNvbXBvbmVudENsYXNzKSB7XG4gICAgICByZXR1cm4gY3JlYXRlU3RvcmVJbmplY3RvcihncmFiU3RvcmVzRm4sIGNvbXBvbmVudENsYXNzLCBzdG9yZU5hbWVzLmpvaW4oXCItXCIpKTtcbiAgICB9O1xuICB9XG59XG5cbi8qKiovIH0pLFxuLyogNCAqL1xuLyoqKi8gKGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cInVzZSBzdHJpY3RcIjtcblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5PYnNlcnZlciA9IGV4cG9ydHMucmVuZGVyUmVwb3J0ZXIgPSBleHBvcnRzLmNvbXBvbmVudEJ5Tm9kZVJlZ2lzdGVyeSA9IHVuZGVmaW5lZDtcblxudmFyIF9jcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9IHJldHVybiBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH07IH0oKTtcblxudmFyIF90eXBlb2YgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIiA/IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH0gOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9O1xuXG5leHBvcnRzLnRyYWNrQ29tcG9uZW50cyA9IHRyYWNrQ29tcG9uZW50cztcbmV4cG9ydHMudXNlU3RhdGljUmVuZGVyaW5nID0gdXNlU3RhdGljUmVuZGVyaW5nO1xuZXhwb3J0cy5vYnNlcnZlciA9IG9ic2VydmVyO1xuXG52YXIgX21vYnggPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG52YXIgX3JlYWN0ID0gX193ZWJwYWNrX3JlcXVpcmVfXygxKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbnZhciBfcmVhY3REb20gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUpO1xuXG52YXIgX3JlYWN0RG9tMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0RG9tKTtcblxudmFyIF9FdmVudEVtaXR0ZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDkpO1xuXG52YXIgX0V2ZW50RW1pdHRlcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9FdmVudEVtaXR0ZXIpO1xuXG52YXIgX3Byb3BUeXBlcyA9IF9fd2VicGFja19yZXF1aXJlX18oMCk7XG5cbnZhciBQcm9wVHlwZXMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfcHJvcFR5cGVzKTtcblxudmFyIF9pbmplY3QgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG52YXIgX2luamVjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9pbmplY3QpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmICghc2VsZikgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIGNhbGwgJiYgKHR5cGVvZiBjYWxsID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpID8gY2FsbCA6IHNlbGY7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgXCIgKyB0eXBlb2Ygc3VwZXJDbGFzcyk7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcykgOiBzdWJDbGFzcy5fX3Byb3RvX18gPSBzdXBlckNsYXNzOyB9XG5cbi8qKlxuICogZGV2IHRvb2wgc3VwcG9ydFxuICovXG52YXIgaXNEZXZ0b29sc0VuYWJsZWQgPSBmYWxzZTtcblxudmFyIGlzVXNpbmdTdGF0aWNSZW5kZXJpbmcgPSBmYWxzZTtcblxudmFyIHdhcm5lZEFib3V0T2JzZXJ2ZXJJbmplY3REZXByZWNhdGlvbiA9IGZhbHNlO1xuXG4vLyBXZWFrTWFwPE5vZGUsIE9iamVjdD47XG52YXIgY29tcG9uZW50QnlOb2RlUmVnaXN0ZXJ5ID0gZXhwb3J0cy5jb21wb25lbnRCeU5vZGVSZWdpc3RlcnkgPSB0eXBlb2YgV2Vha01hcCAhPT0gXCJ1bmRlZmluZWRcIiA/IG5ldyBXZWFrTWFwKCkgOiB1bmRlZmluZWQ7XG52YXIgcmVuZGVyUmVwb3J0ZXIgPSBleHBvcnRzLnJlbmRlclJlcG9ydGVyID0gbmV3IF9FdmVudEVtaXR0ZXIyLmRlZmF1bHQoKTtcblxuZnVuY3Rpb24gZmluZERPTU5vZGUoY29tcG9uZW50KSB7XG4gIGlmIChfcmVhY3REb20yLmRlZmF1bHQpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIF9yZWFjdERvbTIuZGVmYXVsdC5maW5kRE9NTm9kZShjb21wb25lbnQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIGZpbmRET01Ob2RlIHdpbGwgdGhyb3cgaW4gcmVhY3QtdGVzdC1yZW5kZXJlciwgc2VlOlxuICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tb2J4anMvbW9ieC1yZWFjdC9pc3N1ZXMvMjE2XG4gICAgICAvLyBJcyB0aGVyZSBhIGJldHRlciBoZXVyaXN0aWM/XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHJlcG9ydFJlbmRlcmluZyhjb21wb25lbnQpIHtcbiAgdmFyIG5vZGUgPSBmaW5kRE9NTm9kZShjb21wb25lbnQpO1xuICBpZiAobm9kZSAmJiBjb21wb25lbnRCeU5vZGVSZWdpc3RlcnkpIGNvbXBvbmVudEJ5Tm9kZVJlZ2lzdGVyeS5zZXQobm9kZSwgY29tcG9uZW50KTtcblxuICByZW5kZXJSZXBvcnRlci5lbWl0KHtcbiAgICBldmVudDogJ3JlbmRlcicsXG4gICAgcmVuZGVyVGltZTogY29tcG9uZW50Ll9fJG1vYlJlbmRlckVuZCAtIGNvbXBvbmVudC5fXyRtb2JSZW5kZXJTdGFydCxcbiAgICB0b3RhbFRpbWU6IERhdGUubm93KCkgLSBjb21wb25lbnQuX18kbW9iUmVuZGVyU3RhcnQsXG4gICAgY29tcG9uZW50OiBjb21wb25lbnQsXG4gICAgbm9kZTogbm9kZVxuICB9KTtcbn1cblxuZnVuY3Rpb24gdHJhY2tDb21wb25lbnRzKCkge1xuICBpZiAodHlwZW9mIFdlYWtNYXAgPT09IFwidW5kZWZpbmVkXCIpIHRocm93IG5ldyBFcnJvcihcIlttb2J4LXJlYWN0XSB0cmFja2luZyBjb21wb25lbnRzIGlzIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyLlwiKTtcbiAgaWYgKCFpc0RldnRvb2xzRW5hYmxlZCkgaXNEZXZ0b29sc0VuYWJsZWQgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiB1c2VTdGF0aWNSZW5kZXJpbmcodXNlU3RhdGljUmVuZGVyaW5nKSB7XG4gIGlzVXNpbmdTdGF0aWNSZW5kZXJpbmcgPSB1c2VTdGF0aWNSZW5kZXJpbmc7XG59XG5cbi8qKlxuICogVXRpbGl0aWVzXG4gKi9cblxuZnVuY3Rpb24gcGF0Y2godGFyZ2V0LCBmdW5jTmFtZSkge1xuICB2YXIgcnVuTWl4aW5GaXJzdCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogZmFsc2U7XG5cbiAgdmFyIGJhc2UgPSB0YXJnZXRbZnVuY05hbWVdO1xuICB2YXIgbWl4aW5GdW5jID0gcmVhY3RpdmVNaXhpbltmdW5jTmFtZV07XG4gIHZhciBmID0gIWJhc2UgPyBtaXhpbkZ1bmMgOiBydW5NaXhpbkZpcnN0ID09PSB0cnVlID8gZnVuY3Rpb24gKCkge1xuICAgIG1peGluRnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGJhc2UuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSA6IGZ1bmN0aW9uICgpIHtcbiAgICBiYXNlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgbWl4aW5GdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG5cbiAgLy8gTVdFOiBpZGVhbGx5IHdlIGZyZWV6ZSBoZXJlIHRvIHByb3RlY3QgYWdhaW5zdCBhY2NpZGVudGFsIG92ZXJ3cml0ZXMgaW4gY29tcG9uZW50IGluc3RhbmNlcywgc2VlICMxOTVcbiAgLy8gLi4uYnV0IHRoYXQgYnJlYWtzIHJlYWN0LWhvdC1sb2FkZXIsIHNlZSAjMjMxLi4uXG4gIHRhcmdldFtmdW5jTmFtZV0gPSBmO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdFNoYWxsb3dNb2RpZmllZChwcmV2LCBuZXh0KSB7XG4gIGlmIChudWxsID09IHByZXYgfHwgbnVsbCA9PSBuZXh0IHx8ICh0eXBlb2YgcHJldiA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YocHJldikpICE9PSBcIm9iamVjdFwiIHx8ICh0eXBlb2YgbmV4dCA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YobmV4dCkpICE9PSBcIm9iamVjdFwiKSB7XG4gICAgcmV0dXJuIHByZXYgIT09IG5leHQ7XG4gIH1cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcmV2KTtcbiAgaWYgKGtleXMubGVuZ3RoICE9PSBPYmplY3Qua2V5cyhuZXh0KS5sZW5ndGgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICB2YXIga2V5ID0gdm9pZCAwO1xuICBmb3IgKHZhciBpID0ga2V5cy5sZW5ndGggLSAxOyBpID49IDAsIGtleSA9IGtleXNbaV07IGktLSkge1xuICAgIGlmIChuZXh0W2tleV0gIT09IHByZXZba2V5XSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBSZWFjdGl2ZU1peGluXG4gKi9cbnZhciByZWFjdGl2ZU1peGluID0ge1xuICBjb21wb25lbnRXaWxsTW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxNb3VudCgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKGlzVXNpbmdTdGF0aWNSZW5kZXJpbmcgPT09IHRydWUpIHJldHVybjtcbiAgICAvLyBHZW5lcmF0ZSBmcmllbmRseSBuYW1lIGZvciBkZWJ1Z2dpbmdcbiAgICB2YXIgaW5pdGlhbE5hbWUgPSB0aGlzLmRpc3BsYXlOYW1lIHx8IHRoaXMubmFtZSB8fCB0aGlzLmNvbnN0cnVjdG9yICYmICh0aGlzLmNvbnN0cnVjdG9yLmRpc3BsYXlOYW1lIHx8IHRoaXMuY29uc3RydWN0b3IubmFtZSkgfHwgXCI8Y29tcG9uZW50PlwiO1xuICAgIHZhciByb290Tm9kZUlEID0gdGhpcy5fcmVhY3RJbnRlcm5hbEluc3RhbmNlICYmIHRoaXMuX3JlYWN0SW50ZXJuYWxJbnN0YW5jZS5fcm9vdE5vZGVJRDtcblxuICAgIC8qKlxuICAgICAqIElmIHByb3BzIGFyZSBzaGFsbG93bHkgbW9kaWZpZWQsIHJlYWN0IHdpbGwgcmVuZGVyIGFueXdheSxcbiAgICAgKiBzbyBhdG9tLnJlcG9ydENoYW5nZWQoKSBzaG91bGQgbm90IHJlc3VsdCBpbiB5ZXQgYW5vdGhlciByZS1yZW5kZXJcbiAgICAgKi9cbiAgICB2YXIgc2tpcFJlbmRlciA9IGZhbHNlO1xuICAgIC8qKlxuICAgICAqIGZvcmNlVXBkYXRlIHdpbGwgcmUtYXNzaWduIHRoaXMucHJvcHMuIFdlIGRvbid0IHdhbnQgdGhhdCB0byBjYXVzZSBhIGxvb3AsXG4gICAgICogc28gZGV0ZWN0IHRoZXNlIGNoYW5nZXNcbiAgICAgKi9cbiAgICB2YXIgaXNGb3JjaW5nVXBkYXRlID0gZmFsc2U7XG5cbiAgICBmdW5jdGlvbiBtYWtlUHJvcGVydHlPYnNlcnZhYmxlUmVmZXJlbmNlKHByb3BOYW1lKSB7XG4gICAgICB2YXIgdmFsdWVIb2xkZXIgPSB0aGlzW3Byb3BOYW1lXTtcbiAgICAgIHZhciBhdG9tID0gbmV3IF9tb2J4LkF0b20oXCJyZWFjdGl2ZSBcIiArIHByb3BOYW1lKTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBwcm9wTmFtZSwge1xuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIGF0b20ucmVwb3J0T2JzZXJ2ZWQoKTtcbiAgICAgICAgICByZXR1cm4gdmFsdWVIb2xkZXI7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gc2V0KHYpIHtcbiAgICAgICAgICBpZiAoIWlzRm9yY2luZ1VwZGF0ZSAmJiBpc09iamVjdFNoYWxsb3dNb2RpZmllZCh2YWx1ZUhvbGRlciwgdikpIHtcbiAgICAgICAgICAgIHZhbHVlSG9sZGVyID0gdjtcbiAgICAgICAgICAgIHNraXBSZW5kZXIgPSB0cnVlO1xuICAgICAgICAgICAgYXRvbS5yZXBvcnRDaGFuZ2VkKCk7XG4gICAgICAgICAgICBza2lwUmVuZGVyID0gZmFsc2U7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlSG9sZGVyID0gdjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIG1ha2UgdGhpcy5wcm9wcyBhbiBvYnNlcnZhYmxlIHJlZmVyZW5jZSwgc2VlICMxMjRcbiAgICBtYWtlUHJvcGVydHlPYnNlcnZhYmxlUmVmZXJlbmNlLmNhbGwodGhpcywgXCJwcm9wc1wiKTtcbiAgICAvLyBtYWtlIHN0YXRlIGFuIG9ic2VydmFibGUgcmVmZXJlbmNlXG4gICAgbWFrZVByb3BlcnR5T2JzZXJ2YWJsZVJlZmVyZW5jZS5jYWxsKHRoaXMsIFwic3RhdGVcIik7XG5cbiAgICAvLyB3aXJlIHVwIHJlYWN0aXZlIHJlbmRlclxuICAgIHZhciBiYXNlUmVuZGVyID0gdGhpcy5yZW5kZXIuYmluZCh0aGlzKTtcbiAgICB2YXIgcmVhY3Rpb24gPSBudWxsO1xuICAgIHZhciBpc1JlbmRlcmluZ1BlbmRpbmcgPSBmYWxzZTtcblxuICAgIHZhciBpbml0aWFsUmVuZGVyID0gZnVuY3Rpb24gaW5pdGlhbFJlbmRlcigpIHtcbiAgICAgIHJlYWN0aW9uID0gbmV3IF9tb2J4LlJlYWN0aW9uKGluaXRpYWxOYW1lICsgJyMnICsgcm9vdE5vZGVJRCArICcucmVuZGVyKCknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghaXNSZW5kZXJpbmdQZW5kaW5nKSB7XG4gICAgICAgICAgLy8gTi5CLiBHZXR0aW5nIGhlcmUgKmJlZm9yZSBtb3VudGluZyogbWVhbnMgdGhhdCBhIGNvbXBvbmVudCBjb25zdHJ1Y3RvciBoYXMgc2lkZSBlZmZlY3RzIChzZWUgdGhlIHJlbGV2YW50IHRlc3QgaW4gbWlzYy5qcylcbiAgICAgICAgICAvLyBUaGlzIHVuaWRpb21hdGljIFJlYWN0IHVzYWdlIGJ1dCBSZWFjdCB3aWxsIGNvcnJlY3RseSB3YXJuIGFib3V0IHRoaXMgc28gd2UgY29udGludWUgYXMgdXN1YWxcbiAgICAgICAgICAvLyBTZWUgIzg1IC8gUHVsbCAjNDRcbiAgICAgICAgICBpc1JlbmRlcmluZ1BlbmRpbmcgPSB0cnVlO1xuICAgICAgICAgIGlmICh0eXBlb2YgX3RoaXMuY29tcG9uZW50V2lsbFJlYWN0ID09PSBcImZ1bmN0aW9uXCIpIF90aGlzLmNvbXBvbmVudFdpbGxSZWFjdCgpOyAvLyBUT0RPOiB3cmFwIGluIGFjdGlvbj9cbiAgICAgICAgICBpZiAoX3RoaXMuX18kbW9ieElzVW5tb3VudGVkICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBhcmUgdW5tb3VudGVkIGF0IHRoaXMgcG9pbnQsIGNvbXBvbmVudFdpbGxSZWFjdCgpIGhhZCBhIHNpZGUgZWZmZWN0IGNhdXNpbmcgdGhlIGNvbXBvbmVudCB0byB1bm1vdW50ZWRcbiAgICAgICAgICAgIC8vIFRPRE86IHJlbW92ZSB0aGlzIGNoZWNrPyBUaGVuIHJlYWN0IHdpbGwgcHJvcGVybHkgd2FybiBhYm91dCB0aGUgZmFjdCB0aGF0IHRoaXMgc2hvdWxkIG5vdCBoYXBwZW4/IFNlZSAjNzNcbiAgICAgICAgICAgIC8vIEhvd2V2ZXIsIHBlb3BsZSBhbHNvIGNsYWltIHRoaXMgbWlndGggaGFwcGVuIGR1cmluZyB1bml0IHRlc3RzLi5cbiAgICAgICAgICAgIHZhciBoYXNFcnJvciA9IHRydWU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpc0ZvcmNpbmdVcGRhdGUgPSB0cnVlO1xuICAgICAgICAgICAgICBpZiAoIXNraXBSZW5kZXIpIF9yZWFjdDIuZGVmYXVsdC5Db21wb25lbnQucHJvdG90eXBlLmZvcmNlVXBkYXRlLmNhbGwoX3RoaXMpO1xuICAgICAgICAgICAgICBoYXNFcnJvciA9IGZhbHNlO1xuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgaXNGb3JjaW5nVXBkYXRlID0gZmFsc2U7XG4gICAgICAgICAgICAgIGlmIChoYXNFcnJvcikgcmVhY3Rpb24uZGlzcG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZWFjdGl2ZVJlbmRlci4kbW9ieCA9IHJlYWN0aW9uO1xuICAgICAgX3RoaXMucmVuZGVyID0gcmVhY3RpdmVSZW5kZXI7XG4gICAgICByZXR1cm4gcmVhY3RpdmVSZW5kZXIoKTtcbiAgICB9O1xuXG4gICAgdmFyIHJlYWN0aXZlUmVuZGVyID0gZnVuY3Rpb24gcmVhY3RpdmVSZW5kZXIoKSB7XG4gICAgICBpc1JlbmRlcmluZ1BlbmRpbmcgPSBmYWxzZTtcbiAgICAgIHZhciBleGNlcHRpb24gPSB1bmRlZmluZWQ7XG4gICAgICB2YXIgcmVuZGVyaW5nID0gdW5kZWZpbmVkO1xuICAgICAgcmVhY3Rpb24udHJhY2soZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoaXNEZXZ0b29sc0VuYWJsZWQpIHtcbiAgICAgICAgICBfdGhpcy5fXyRtb2JSZW5kZXJTdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZW5kZXJpbmcgPSBfbW9ieC5leHRyYXMuYWxsb3dTdGF0ZUNoYW5nZXMoZmFsc2UsIGJhc2VSZW5kZXIpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgZXhjZXB0aW9uID0gZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNEZXZ0b29sc0VuYWJsZWQpIHtcbiAgICAgICAgICBfdGhpcy5fXyRtb2JSZW5kZXJFbmQgPSBEYXRlLm5vdygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChleGNlcHRpb24pIHRocm93IGV4Y2VwdGlvbjtcbiAgICAgIHJldHVybiByZW5kZXJpbmc7XG4gICAgfTtcblxuICAgIHRoaXMucmVuZGVyID0gaW5pdGlhbFJlbmRlcjtcbiAgfSxcblxuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gY29tcG9uZW50V2lsbFVubW91bnQoKSB7XG4gICAgaWYgKGlzVXNpbmdTdGF0aWNSZW5kZXJpbmcgPT09IHRydWUpIHJldHVybjtcbiAgICB0aGlzLnJlbmRlci4kbW9ieCAmJiB0aGlzLnJlbmRlci4kbW9ieC5kaXNwb3NlKCk7XG4gICAgdGhpcy5fXyRtb2J4SXNVbm1vdW50ZWQgPSB0cnVlO1xuICAgIGlmIChpc0RldnRvb2xzRW5hYmxlZCkge1xuICAgICAgdmFyIG5vZGUgPSBmaW5kRE9NTm9kZSh0aGlzKTtcbiAgICAgIGlmIChub2RlICYmIGNvbXBvbmVudEJ5Tm9kZVJlZ2lzdGVyeSkge1xuICAgICAgICBjb21wb25lbnRCeU5vZGVSZWdpc3RlcnkuZGVsZXRlKG5vZGUpO1xuICAgICAgfVxuICAgICAgcmVuZGVyUmVwb3J0ZXIuZW1pdCh7XG4gICAgICAgIGV2ZW50OiAnZGVzdHJveScsXG4gICAgICAgIGNvbXBvbmVudDogdGhpcyxcbiAgICAgICAgbm9kZTogbm9kZVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICBpZiAoaXNEZXZ0b29sc0VuYWJsZWQpIHtcbiAgICAgIHJlcG9ydFJlbmRlcmluZyh0aGlzKTtcbiAgICB9XG4gIH0sXG5cbiAgY29tcG9uZW50RGlkVXBkYXRlOiBmdW5jdGlvbiBjb21wb25lbnREaWRVcGRhdGUoKSB7XG4gICAgaWYgKGlzRGV2dG9vbHNFbmFibGVkKSB7XG4gICAgICByZXBvcnRSZW5kZXJpbmcodGhpcyk7XG4gICAgfVxuICB9LFxuXG4gIHNob3VsZENvbXBvbmVudFVwZGF0ZTogZnVuY3Rpb24gc2hvdWxkQ29tcG9uZW50VXBkYXRlKG5leHRQcm9wcywgbmV4dFN0YXRlKSB7XG4gICAgaWYgKGlzVXNpbmdTdGF0aWNSZW5kZXJpbmcpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIlttb2J4LXJlYWN0XSBJdCBzZWVtcyB0aGF0IGEgcmUtcmVuZGVyaW5nIG9mIGEgUmVhY3QgY29tcG9uZW50IGlzIHRyaWdnZXJlZCB3aGlsZSBpbiBzdGF0aWMgKHNlcnZlci1zaWRlKSBtb2RlLiBQbGVhc2UgbWFrZSBzdXJlIGNvbXBvbmVudHMgYXJlIHJlbmRlcmVkIG9ubHkgb25jZSBzZXJ2ZXItc2lkZS5cIik7XG4gICAgfVxuICAgIC8vIHVwZGF0ZSBvbiBhbnkgc3RhdGUgY2hhbmdlcyAoYXMgaXMgdGhlIGRlZmF1bHQpXG4gICAgaWYgKHRoaXMuc3RhdGUgIT09IG5leHRTdGF0ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vIHVwZGF0ZSBpZiBwcm9wcyBhcmUgc2hhbGxvd2x5IG5vdCBlcXVhbCwgaW5zcGlyZWQgYnkgUHVyZVJlbmRlck1peGluXG4gICAgLy8gd2UgY291bGQgcmV0dXJuIGp1c3QgJ2ZhbHNlJyBoZXJlLCBhbmQgYXZvaWQgdGhlIGBza2lwUmVuZGVyYCBjaGVja3MgZXRjXG4gICAgLy8gaG93ZXZlciwgaXQgaXMgbmljZXIgaWYgbGlmZWN5Y2xlIGV2ZW50cyBhcmUgdHJpZ2dlcmVkIGxpa2UgdXN1YWxseSxcbiAgICAvLyBzbyB3ZSByZXR1cm4gdHJ1ZSBoZXJlIGlmIHByb3BzIGFyZSBzaGFsbG93bHkgbW9kaWZpZWQuXG4gICAgcmV0dXJuIGlzT2JqZWN0U2hhbGxvd01vZGlmaWVkKHRoaXMucHJvcHMsIG5leHRQcm9wcyk7XG4gIH1cbn07XG5cbi8qKlxuICogT2JzZXJ2ZXIgZnVuY3Rpb24gLyBkZWNvcmF0b3JcbiAqL1xuZnVuY3Rpb24gb2JzZXJ2ZXIoYXJnMSwgYXJnMikge1xuICBpZiAodHlwZW9mIGFyZzEgPT09IFwic3RyaW5nXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJTdG9yZSBuYW1lcyBzaG91bGQgYmUgcHJvdmlkZWQgYXMgYXJyYXlcIik7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkoYXJnMSkpIHtcbiAgICAvLyBjb21wb25lbnQgbmVlZHMgc3RvcmVzXG4gICAgaWYgKCF3YXJuZWRBYm91dE9ic2VydmVySW5qZWN0RGVwcmVjYXRpb24pIHtcbiAgICAgIHdhcm5lZEFib3V0T2JzZXJ2ZXJJbmplY3REZXByZWNhdGlvbiA9IHRydWU7XG4gICAgICBjb25zb2xlLndhcm4oJ01vYnggb2JzZXJ2ZXI6IFVzaW5nIG9ic2VydmVyIHRvIGluamVjdCBzdG9yZXMgaXMgZGVwcmVjYXRlZCBzaW5jZSA0LjAuIFVzZSBgQGluamVjdChcInN0b3JlMVwiLCBcInN0b3JlMlwiKSBAb2JzZXJ2ZXIgQ29tcG9uZW50Q2xhc3NgIG9yIGBpbmplY3QoXCJzdG9yZTFcIiwgXCJzdG9yZTJcIikob2JzZXJ2ZXIoY29tcG9uZW50Q2xhc3MpKWAgaW5zdGVhZCBvZiBgQG9ic2VydmVyKFtcInN0b3JlMVwiLCBcInN0b3JlMlwiXSkgQ29tcG9uZW50Q2xhc3NgJyk7XG4gICAgfVxuICAgIGlmICghYXJnMikge1xuICAgICAgLy8gaW52b2tlZCBhcyBkZWNvcmF0b3JcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoY29tcG9uZW50Q2xhc3MpIHtcbiAgICAgICAgcmV0dXJuIG9ic2VydmVyKGFyZzEsIGNvbXBvbmVudENsYXNzKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBfaW5qZWN0Mi5kZWZhdWx0LmFwcGx5KG51bGwsIGFyZzEpKG9ic2VydmVyKGFyZzIpKTtcbiAgICB9XG4gIH1cbiAgdmFyIGNvbXBvbmVudENsYXNzID0gYXJnMTtcblxuICBpZiAoY29tcG9uZW50Q2xhc3MuaXNNb2J4SW5qZWN0b3IgPT09IHRydWUpIHtcbiAgICBjb25zb2xlLndhcm4oJ01vYnggb2JzZXJ2ZXI6IFlvdSBhcmUgdHJ5aW5nIHRvIHVzZSBcXCdvYnNlcnZlclxcJyBvbiBhIGNvbXBvbmVudCB0aGF0IGFscmVhZHkgaGFzIFxcJ2luamVjdFxcJy4gUGxlYXNlIGFwcGx5IFxcJ29ic2VydmVyXFwnIGJlZm9yZSBhcHBseWluZyBcXCdpbmplY3RcXCcnKTtcbiAgfVxuXG4gIC8vIFN0YXRlbGVzcyBmdW5jdGlvbiBjb21wb25lbnQ6XG4gIC8vIElmIGl0IGlzIGZ1bmN0aW9uIGJ1dCBkb2Vzbid0IHNlZW0gdG8gYmUgYSByZWFjdCBjbGFzcyBjb25zdHJ1Y3RvcixcbiAgLy8gd3JhcCBpdCB0byBhIHJlYWN0IGNsYXNzIGF1dG9tYXRpY2FsbHlcbiAgaWYgKHR5cGVvZiBjb21wb25lbnRDbGFzcyA9PT0gXCJmdW5jdGlvblwiICYmICghY29tcG9uZW50Q2xhc3MucHJvdG90eXBlIHx8ICFjb21wb25lbnRDbGFzcy5wcm90b3R5cGUucmVuZGVyKSAmJiAhY29tcG9uZW50Q2xhc3MuaXNSZWFjdENsYXNzICYmICFfcmVhY3QyLmRlZmF1bHQuQ29tcG9uZW50LmlzUHJvdG90eXBlT2YoY29tcG9uZW50Q2xhc3MpKSB7XG4gICAgdmFyIF9jbGFzcywgX3RlbXA7XG5cbiAgICByZXR1cm4gb2JzZXJ2ZXIoKF90ZW1wID0gX2NsYXNzID0gZnVuY3Rpb24gKF9Db21wb25lbnQpIHtcbiAgICAgIF9pbmhlcml0cyhfY2xhc3MsIF9Db21wb25lbnQpO1xuXG4gICAgICBmdW5jdGlvbiBfY2xhc3MoKSB7XG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBfY2xhc3MpO1xuXG4gICAgICAgIHJldHVybiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybih0aGlzLCAoX2NsYXNzLl9fcHJvdG9fXyB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoX2NsYXNzKSkuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgICB9XG5cbiAgICAgIF9jcmVhdGVDbGFzcyhfY2xhc3MsIFt7XG4gICAgICAgIGtleTogJ3JlbmRlcicsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbXBvbmVudENsYXNzLmNhbGwodGhpcywgdGhpcy5wcm9wcywgdGhpcy5jb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfV0pO1xuXG4gICAgICByZXR1cm4gX2NsYXNzO1xuICAgIH0oX3JlYWN0LkNvbXBvbmVudCksIF9jbGFzcy5kaXNwbGF5TmFtZSA9IGNvbXBvbmVudENsYXNzLmRpc3BsYXlOYW1lIHx8IGNvbXBvbmVudENsYXNzLm5hbWUsIF9jbGFzcy5jb250ZXh0VHlwZXMgPSBjb21wb25lbnRDbGFzcy5jb250ZXh0VHlwZXMsIF9jbGFzcy5wcm9wVHlwZXMgPSBjb21wb25lbnRDbGFzcy5wcm9wVHlwZXMsIF9jbGFzcy5kZWZhdWx0UHJvcHMgPSBjb21wb25lbnRDbGFzcy5kZWZhdWx0UHJvcHMsIF90ZW1wKSk7XG4gIH1cblxuICBpZiAoIWNvbXBvbmVudENsYXNzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiUGxlYXNlIHBhc3MgYSB2YWxpZCBjb21wb25lbnQgdG8gJ29ic2VydmVyJ1wiKTtcbiAgfVxuXG4gIHZhciB0YXJnZXQgPSBjb21wb25lbnRDbGFzcy5wcm90b3R5cGUgfHwgY29tcG9uZW50Q2xhc3M7XG4gIG1peGluTGlmZWN5Y2xlRXZlbnRzKHRhcmdldCk7XG4gIGNvbXBvbmVudENsYXNzLmlzTW9iWFJlYWN0T2JzZXJ2ZXIgPSB0cnVlO1xuICByZXR1cm4gY29tcG9uZW50Q2xhc3M7XG59XG5cbmZ1bmN0aW9uIG1peGluTGlmZWN5Y2xlRXZlbnRzKHRhcmdldCkge1xuICBwYXRjaCh0YXJnZXQsIFwiY29tcG9uZW50V2lsbE1vdW50XCIsIHRydWUpO1xuICBbXCJjb21wb25lbnREaWRNb3VudFwiLCBcImNvbXBvbmVudFdpbGxVbm1vdW50XCIsIFwiY29tcG9uZW50RGlkVXBkYXRlXCJdLmZvckVhY2goZnVuY3Rpb24gKGZ1bmNOYW1lKSB7XG4gICAgcGF0Y2godGFyZ2V0LCBmdW5jTmFtZSk7XG4gIH0pO1xuICBpZiAoIXRhcmdldC5zaG91bGRDb21wb25lbnRVcGRhdGUpIHtcbiAgICB0YXJnZXQuc2hvdWxkQ29tcG9uZW50VXBkYXRlID0gcmVhY3RpdmVNaXhpbi5zaG91bGRDb21wb25lbnRVcGRhdGU7XG4gIH1cbn1cblxuLy8gVE9ETzogc3VwcG9ydCBpbmplY3Rpb24gc29tZWhvdyBhcyB3ZWxsP1xudmFyIE9ic2VydmVyID0gZXhwb3J0cy5PYnNlcnZlciA9IG9ic2VydmVyKGZ1bmN0aW9uIChfcmVmKSB7XG4gIHZhciBjaGlsZHJlbiA9IF9yZWYuY2hpbGRyZW47XG4gIHJldHVybiBjaGlsZHJlbigpO1xufSk7XG5cbk9ic2VydmVyLnByb3BUeXBlcyA9IHtcbiAgY2hpbGRyZW46IGZ1bmN0aW9uIGNoaWxkcmVuKHByb3BWYWx1ZSwga2V5LCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBwcm9wVmFsdWVba2V5XSAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIG5ldyBFcnJvcignSW52YWxpZCBwcm9wIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSBgJyArIF90eXBlb2YocHJvcFZhbHVlW2tleV0pICsgJ2Agc3VwcGxpZWQgdG8nICsgJyBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgYGZ1bmN0aW9uYC4nKTtcbiAgfVxufTtcblxuLyoqKi8gfSksXG4vKiA1ICovXG4vKioqLyAoZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzKSB7XG5cbm1vZHVsZS5leHBvcnRzID0gX19XRUJQQUNLX0VYVEVSTkFMX01PRFVMRV81X187XG5cbi8qKiovIH0pLFxuLyogNiAqL1xuLyoqKi8gKGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cInVzZSBzdHJpY3RcIjtcblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdW5kZWZpbmVkO1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpO1xuXG52YXIgX2NsYXNzLCBfdGVtcDtcblxudmFyIF9yZWFjdCA9IF9fd2VicGFja19yZXF1aXJlX18oMSk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG52YXIgX3Byb3BUeXBlcyA9IF9fd2VicGFja19yZXF1aXJlX18oMCk7XG5cbnZhciBQcm9wVHlwZXMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfcHJvcFR5cGVzKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBlbHNlIHsgdmFyIG5ld09iaiA9IHt9OyBpZiAob2JqICE9IG51bGwpIHsgZm9yICh2YXIga2V5IGluIG9iaikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoIXNlbGYpIHsgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwidGhpcyBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCAtIHN1cGVyKCkgaGFzbid0IGJlZW4gY2FsbGVkXCIpOyB9IHJldHVybiBjYWxsICYmICh0eXBlb2YgY2FsbCA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSA/IGNhbGwgOiBzZWxmOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvbiwgbm90IFwiICsgdHlwZW9mIHN1cGVyQ2xhc3MpOyB9IHN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcyAmJiBzdXBlckNsYXNzLnByb3RvdHlwZSwgeyBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogc3ViQ2xhc3MsIGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3Quc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIDogc3ViQ2xhc3MuX19wcm90b19fID0gc3VwZXJDbGFzczsgfVxuXG52YXIgc3BlY2lhbFJlYWN0S2V5cyA9IHsgY2hpbGRyZW46IHRydWUsIGtleTogdHJ1ZSwgcmVmOiB0cnVlIH07XG5cbnZhciBQcm92aWRlciA9IChfdGVtcCA9IF9jbGFzcyA9IGZ1bmN0aW9uIChfQ29tcG9uZW50KSB7XG4gIF9pbmhlcml0cyhQcm92aWRlciwgX0NvbXBvbmVudCk7XG5cbiAgZnVuY3Rpb24gUHJvdmlkZXIoKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFByb3ZpZGVyKTtcblxuICAgIHJldHVybiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybih0aGlzLCAoUHJvdmlkZXIuX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihQcm92aWRlcikpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKFByb3ZpZGVyLCBbe1xuICAgIGtleTogJ3JlbmRlcicsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgIHJldHVybiBfcmVhY3QyLmRlZmF1bHQuQ2hpbGRyZW4ub25seSh0aGlzLnByb3BzLmNoaWxkcmVuKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdnZXRDaGlsZENvbnRleHQnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXRDaGlsZENvbnRleHQoKSB7XG4gICAgICB2YXIgc3RvcmVzID0ge307XG4gICAgICAvLyBpbmhlcml0IHN0b3Jlc1xuICAgICAgdmFyIGJhc2VTdG9yZXMgPSB0aGlzLmNvbnRleHQubW9ieFN0b3JlcztcbiAgICAgIGlmIChiYXNlU3RvcmVzKSBmb3IgKHZhciBrZXkgaW4gYmFzZVN0b3Jlcykge1xuICAgICAgICBzdG9yZXNba2V5XSA9IGJhc2VTdG9yZXNba2V5XTtcbiAgICAgIH1cbiAgICAgIC8vIGFkZCBvd24gc3RvcmVzXG4gICAgICBmb3IgKHZhciBfa2V5IGluIHRoaXMucHJvcHMpIHtcbiAgICAgICAgaWYgKCFzcGVjaWFsUmVhY3RLZXlzW19rZXldICYmIF9rZXkgIT09IFwic3VwcHJlc3NDaGFuZ2VkU3RvcmVXYXJuaW5nXCIpIHN0b3Jlc1tfa2V5XSA9IHRoaXMucHJvcHNbX2tleV07XG4gICAgICB9cmV0dXJuIHtcbiAgICAgICAgbW9ieFN0b3Jlczogc3RvcmVzXG4gICAgICB9O1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2NvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKG5leHRQcm9wcykge1xuICAgICAgLy8gTWF5YmUgdGhpcyB3YXJuaW5nIGlzIHRvbyBhZ2dyZXNzaXZlP1xuICAgICAgaWYgKE9iamVjdC5rZXlzKG5leHRQcm9wcykubGVuZ3RoICE9PSBPYmplY3Qua2V5cyh0aGlzLnByb3BzKS5sZW5ndGgpIGNvbnNvbGUud2FybihcIk1vYlggUHJvdmlkZXI6IFRoZSBzZXQgb2YgcHJvdmlkZWQgc3RvcmVzIGhhcyBjaGFuZ2VkLiBQbGVhc2UgYXZvaWQgY2hhbmdpbmcgc3RvcmVzIGFzIHRoZSBjaGFuZ2UgbWlnaHQgbm90IHByb3BhZ2F0ZSB0byBhbGwgY2hpbGRyZW5cIik7XG4gICAgICBpZiAoIW5leHRQcm9wcy5zdXBwcmVzc0NoYW5nZWRTdG9yZVdhcm5pbmcpIGZvciAodmFyIGtleSBpbiBuZXh0UHJvcHMpIHtcbiAgICAgICAgaWYgKCFzcGVjaWFsUmVhY3RLZXlzW2tleV0gJiYgdGhpcy5wcm9wc1trZXldICE9PSBuZXh0UHJvcHNba2V5XSkgY29uc29sZS53YXJuKFwiTW9iWCBQcm92aWRlcjogUHJvdmlkZWQgc3RvcmUgJ1wiICsga2V5ICsgXCInIGhhcyBjaGFuZ2VkLiBQbGVhc2UgYXZvaWQgcmVwbGFjaW5nIHN0b3JlcyBhcyB0aGUgY2hhbmdlIG1pZ2h0IG5vdCBwcm9wYWdhdGUgdG8gYWxsIGNoaWxkcmVuXCIpO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBQcm92aWRlcjtcbn0oX3JlYWN0LkNvbXBvbmVudCksIF9jbGFzcy5jb250ZXh0VHlwZXMgPSB7XG4gIG1vYnhTdG9yZXM6IFByb3BUeXBlcy5vYmplY3RPck9ic2VydmFibGVPYmplY3Rcbn0sIF9jbGFzcy5jaGlsZENvbnRleHRUeXBlcyA9IHtcbiAgbW9ieFN0b3JlczogUHJvcFR5cGVzLm9iamVjdE9yT2JzZXJ2YWJsZU9iamVjdC5pc1JlcXVpcmVkXG59LCBfdGVtcCk7XG5leHBvcnRzLmRlZmF1bHQgPSBQcm92aWRlcjtcblxuLyoqKi8gfSksXG4vKiA3ICovXG4vKioqLyAoZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzKSB7XG5cbm1vZHVsZS5leHBvcnRzID0gbnVsbFxuXG5cbi8qKiovIH0pLFxuLyogOCAqL1xuLyoqKi8gKGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cInVzZSBzdHJpY3RcIjtcblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5Qcm9wVHlwZXMgPSBleHBvcnRzLnByb3BUeXBlcyA9IGV4cG9ydHMuaW5qZWN0ID0gZXhwb3J0cy5Qcm92aWRlciA9IGV4cG9ydHMudXNlU3RhdGljUmVuZGVyaW5nID0gZXhwb3J0cy50cmFja0NvbXBvbmVudHMgPSBleHBvcnRzLmNvbXBvbmVudEJ5Tm9kZVJlZ2lzdGVyeSA9IGV4cG9ydHMucmVuZGVyUmVwb3J0ZXIgPSBleHBvcnRzLk9ic2VydmVyID0gZXhwb3J0cy5vYnNlcnZlciA9IHVuZGVmaW5lZDtcblxudmFyIF90eXBlb2YgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIiA/IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH0gOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9O1xuXG52YXIgX29ic2VydmVyID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdvYnNlcnZlcicsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuIF9vYnNlcnZlci5vYnNlcnZlcjtcbiAgfVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ09ic2VydmVyJywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICByZXR1cm4gX29ic2VydmVyLk9ic2VydmVyO1xuICB9XG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAncmVuZGVyUmVwb3J0ZXInLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgIHJldHVybiBfb2JzZXJ2ZXIucmVuZGVyUmVwb3J0ZXI7XG4gIH1cbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdjb21wb25lbnRCeU5vZGVSZWdpc3RlcnknLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgIHJldHVybiBfb2JzZXJ2ZXIuY29tcG9uZW50QnlOb2RlUmVnaXN0ZXJ5O1xuICB9XG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAndHJhY2tDb21wb25lbnRzJywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICByZXR1cm4gX29ic2VydmVyLnRyYWNrQ29tcG9uZW50cztcbiAgfVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ3VzZVN0YXRpY1JlbmRlcmluZycsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuIF9vYnNlcnZlci51c2VTdGF0aWNSZW5kZXJpbmc7XG4gIH1cbn0pO1xuXG52YXIgX1Byb3ZpZGVyID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdQcm92aWRlcicsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX1Byb3ZpZGVyKS5kZWZhdWx0O1xuICB9XG59KTtcblxudmFyIF9pbmplY3QgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ2luamVjdCcsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2luamVjdCkuZGVmYXVsdDtcbiAgfVxufSk7XG5cbnZhciBfbW9ieCA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cbnZhciBtb2J4ID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX21vYngpO1xuXG52YXIgX3JlYWN0ID0gX193ZWJwYWNrX3JlcXVpcmVfXygxKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbnZhciBfcmVhY3REb20gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUpO1xuXG52YXIgX3JlYWN0TmF0aXZlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3KTtcblxudmFyIF9wcm9wVHlwZXMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDApO1xuXG52YXIgcHJvcFR5cGVzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX3Byb3BUeXBlcyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbnZhciBUQVJHRVRfTElCX05BTUUgPSB2b2lkIDA7XG5pZiAodHJ1ZSkgVEFSR0VUX0xJQl9OQU1FID0gJ21vYngtcmVhY3QnO1xuaWYgKGZhbHNlKSBUQVJHRVRfTElCX05BTUUgPSAnbW9ieC1yZWFjdC9uYXRpdmUnO1xuaWYgKGZhbHNlKSBUQVJHRVRfTElCX05BTUUgPSAnbW9ieC1yZWFjdC9jdXN0b20nO1xuXG5pZiAoIW1vYngpIHRocm93IG5ldyBFcnJvcihUQVJHRVRfTElCX05BTUUgKyAnIHJlcXVpcmVzIHRoZSBNb2JYIHBhY2thZ2UnKTtcbmlmICghX3JlYWN0Mi5kZWZhdWx0KSB0aHJvdyBuZXcgRXJyb3IoVEFSR0VUX0xJQl9OQU1FICsgJyByZXF1aXJlcyBSZWFjdCB0byBiZSBhdmFpbGFibGUnKTtcblxuaWYgKFwiYnJvd3NlclwiID09PSAnYnJvd3NlcicgJiYgdHlwZW9mIF9yZWFjdERvbS51bnN0YWJsZV9iYXRjaGVkVXBkYXRlcyA9PT0gXCJmdW5jdGlvblwiKSBtb2J4LmV4dHJhcy5zZXRSZWFjdGlvblNjaGVkdWxlcihfcmVhY3REb20udW5zdGFibGVfYmF0Y2hlZFVwZGF0ZXMpO1xuaWYgKGZhbHNlKSBtb2J4LmV4dHJhcy5zZXRSZWFjdGlvblNjaGVkdWxlcihfcmVhY3ROYXRpdmUudW5zdGFibGVfYmF0Y2hlZFVwZGF0ZXMpO1xuXG5leHBvcnRzLnByb3BUeXBlcyA9IHByb3BUeXBlcztcbmV4cG9ydHMuUHJvcFR5cGVzID0gcHJvcFR5cGVzO1xuZXhwb3J0cy5kZWZhdWx0ID0gbW9kdWxlLmV4cG9ydHM7XG5cbi8qIERldlRvb2wgc3VwcG9ydCAqL1xuXG5pZiAoKHR5cGVvZiBfX01PQlhfREVWVE9PTFNfR0xPQkFMX0hPT0tfXyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YoX19NT0JYX0RFVlRPT0xTX0dMT0JBTF9IT09LX18pKSA9PT0gJ29iamVjdCcpIHtcbiAgX19NT0JYX0RFVlRPT0xTX0dMT0JBTF9IT09LX18uaW5qZWN0TW9ieFJlYWN0KG1vZHVsZS5leHBvcnRzLCBtb2J4KTtcbn1cblxuLyoqKi8gfSksXG4vKiA5ICovXG4vKioqLyAoZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblwidXNlIHN0cmljdFwiO1xuXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfY3JlYXRlQ2xhc3MgPSBmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfSByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9OyB9KCk7XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbnZhciBFdmVudEVtaXR0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRXZlbnRFbWl0dGVyKTtcblxuICAgIHRoaXMubGlzdGVuZXJzID0gW107XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRXZlbnRFbWl0dGVyLCBbe1xuICAgIGtleTogXCJvblwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBvbihjYikge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgdGhpcy5saXN0ZW5lcnMucHVzaChjYik7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaW5kZXggPSBfdGhpcy5saXN0ZW5lcnMuaW5kZXhPZihjYik7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIF90aGlzLmxpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiZW1pdFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBlbWl0KGRhdGEpIHtcbiAgICAgIHRoaXMubGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHJldHVybiBmbihkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBFdmVudEVtaXR0ZXI7XG59KCk7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IEV2ZW50RW1pdHRlcjtcblxuLyoqKi8gfSksXG4vKiAxMCAqL1xuLyoqKi8gKGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cInVzZSBzdHJpY3RcIjtcbi8qKlxuICogQ29weXJpZ2h0IDIwMTUsIFlhaG9vISBJbmMuXG4gKiBDb3B5cmlnaHRzIGxpY2Vuc2VkIHVuZGVyIHRoZSBOZXcgQlNEIExpY2Vuc2UuIFNlZSB0aGUgYWNjb21wYW55aW5nIExJQ0VOU0UgZmlsZSBmb3IgdGVybXMuXG4gKi9cblxuXG52YXIgUkVBQ1RfU1RBVElDUyA9IHtcbiAgICBjaGlsZENvbnRleHRUeXBlczogdHJ1ZSxcbiAgICBjb250ZXh0VHlwZXM6IHRydWUsXG4gICAgZGVmYXVsdFByb3BzOiB0cnVlLFxuICAgIGRpc3BsYXlOYW1lOiB0cnVlLFxuICAgIGdldERlZmF1bHRQcm9wczogdHJ1ZSxcbiAgICBtaXhpbnM6IHRydWUsXG4gICAgcHJvcFR5cGVzOiB0cnVlLFxuICAgIHR5cGU6IHRydWVcbn07XG5cbnZhciBLTk9XTl9TVEFUSUNTID0ge1xuICAgIG5hbWU6IHRydWUsXG4gICAgbGVuZ3RoOiB0cnVlLFxuICAgIHByb3RvdHlwZTogdHJ1ZSxcbiAgICBjYWxsZXI6IHRydWUsXG4gICAgYXJndW1lbnRzOiB0cnVlLFxuICAgIGFyaXR5OiB0cnVlXG59O1xuXG52YXIgaXNHZXRPd25Qcm9wZXJ0eVN5bWJvbHNBdmFpbGFibGUgPSB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gJ2Z1bmN0aW9uJztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBob2lzdE5vblJlYWN0U3RhdGljcyh0YXJnZXRDb21wb25lbnQsIHNvdXJjZUNvbXBvbmVudCwgY3VzdG9tU3RhdGljcykge1xuICAgIGlmICh0eXBlb2Ygc291cmNlQ29tcG9uZW50ICE9PSAnc3RyaW5nJykgeyAvLyBkb24ndCBob2lzdCBvdmVyIHN0cmluZyAoaHRtbCkgY29tcG9uZW50c1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHNvdXJjZUNvbXBvbmVudCk7XG5cbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgaWYgKGlzR2V0T3duUHJvcGVydHlTeW1ib2xzQXZhaWxhYmxlKSB7XG4gICAgICAgICAgICBrZXlzID0ga2V5cy5jb25jYXQoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzb3VyY2VDb21wb25lbnQpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKCFSRUFDVF9TVEFUSUNTW2tleXNbaV1dICYmICFLTk9XTl9TVEFUSUNTW2tleXNbaV1dICYmICghY3VzdG9tU3RhdGljcyB8fCAhY3VzdG9tU3RhdGljc1trZXlzW2ldXSkpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRDb21wb25lbnRba2V5c1tpXV0gPSBzb3VyY2VDb21wb25lbnRba2V5c1tpXV07XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRDb21wb25lbnQ7XG59O1xuXG5cbi8qKiovIH0pXG4vKioqKioqLyBdKTtcbn0pO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9tb2J4LXJlYWN0L2luZGV4LmpzXG4vLyBtb2R1bGUgaWQgPSA0NjVcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICB2YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnZmJqcy9saWIvaW52YXJpYW50Jyk7XG4gIHZhciB3YXJuaW5nID0gcmVxdWlyZSgnZmJqcy9saWIvd2FybmluZycpO1xuICB2YXIgUmVhY3RQcm9wVHlwZXNTZWNyZXQgPSByZXF1aXJlKCcuL2xpYi9SZWFjdFByb3BUeXBlc1NlY3JldCcpO1xuICB2YXIgbG9nZ2VkVHlwZUZhaWx1cmVzID0ge307XG59XG5cbi8qKlxuICogQXNzZXJ0IHRoYXQgdGhlIHZhbHVlcyBtYXRjaCB3aXRoIHRoZSB0eXBlIHNwZWNzLlxuICogRXJyb3IgbWVzc2FnZXMgYXJlIG1lbW9yaXplZCBhbmQgd2lsbCBvbmx5IGJlIHNob3duIG9uY2UuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IHR5cGVTcGVjcyBNYXAgb2YgbmFtZSB0byBhIFJlYWN0UHJvcFR5cGVcbiAqIEBwYXJhbSB7b2JqZWN0fSB2YWx1ZXMgUnVudGltZSB2YWx1ZXMgdGhhdCBuZWVkIHRvIGJlIHR5cGUtY2hlY2tlZFxuICogQHBhcmFtIHtzdHJpbmd9IGxvY2F0aW9uIGUuZy4gXCJwcm9wXCIsIFwiY29udGV4dFwiLCBcImNoaWxkIGNvbnRleHRcIlxuICogQHBhcmFtIHtzdHJpbmd9IGNvbXBvbmVudE5hbWUgTmFtZSBvZiB0aGUgY29tcG9uZW50IGZvciBlcnJvciBtZXNzYWdlcy5cbiAqIEBwYXJhbSB7P0Z1bmN0aW9ufSBnZXRTdGFjayBSZXR1cm5zIHRoZSBjb21wb25lbnQgc3RhY2suXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBjaGVja1Byb3BUeXBlcyh0eXBlU3BlY3MsIHZhbHVlcywgbG9jYXRpb24sIGNvbXBvbmVudE5hbWUsIGdldFN0YWNrKSB7XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgZm9yICh2YXIgdHlwZVNwZWNOYW1lIGluIHR5cGVTcGVjcykge1xuICAgICAgaWYgKHR5cGVTcGVjcy5oYXNPd25Qcm9wZXJ0eSh0eXBlU3BlY05hbWUpKSB7XG4gICAgICAgIHZhciBlcnJvcjtcbiAgICAgICAgLy8gUHJvcCB0eXBlIHZhbGlkYXRpb24gbWF5IHRocm93LiBJbiBjYXNlIHRoZXkgZG8sIHdlIGRvbid0IHdhbnQgdG9cbiAgICAgICAgLy8gZmFpbCB0aGUgcmVuZGVyIHBoYXNlIHdoZXJlIGl0IGRpZG4ndCBmYWlsIGJlZm9yZS4gU28gd2UgbG9nIGl0LlxuICAgICAgICAvLyBBZnRlciB0aGVzZSBoYXZlIGJlZW4gY2xlYW5lZCB1cCwgd2UnbGwgbGV0IHRoZW0gdGhyb3cuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gVGhpcyBpcyBpbnRlbnRpb25hbGx5IGFuIGludmFyaWFudCB0aGF0IGdldHMgY2F1Z2h0LiBJdCdzIHRoZSBzYW1lXG4gICAgICAgICAgLy8gYmVoYXZpb3IgYXMgd2l0aG91dCB0aGlzIHN0YXRlbWVudCBleGNlcHQgd2l0aCBhIGJldHRlciBtZXNzYWdlLlxuICAgICAgICAgIGludmFyaWFudCh0eXBlb2YgdHlwZVNwZWNzW3R5cGVTcGVjTmFtZV0gPT09ICdmdW5jdGlvbicsICclczogJXMgdHlwZSBgJXNgIGlzIGludmFsaWQ7IGl0IG11c3QgYmUgYSBmdW5jdGlvbiwgdXN1YWxseSBmcm9tICcgKyAnUmVhY3QuUHJvcFR5cGVzLicsIGNvbXBvbmVudE5hbWUgfHwgJ1JlYWN0IGNsYXNzJywgbG9jYXRpb24sIHR5cGVTcGVjTmFtZSk7XG4gICAgICAgICAgZXJyb3IgPSB0eXBlU3BlY3NbdHlwZVNwZWNOYW1lXSh2YWx1ZXMsIHR5cGVTcGVjTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIG51bGwsIFJlYWN0UHJvcFR5cGVzU2VjcmV0KTtcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICBlcnJvciA9IGV4O1xuICAgICAgICB9XG4gICAgICAgIHdhcm5pbmcoIWVycm9yIHx8IGVycm9yIGluc3RhbmNlb2YgRXJyb3IsICclczogdHlwZSBzcGVjaWZpY2F0aW9uIG9mICVzIGAlc2AgaXMgaW52YWxpZDsgdGhlIHR5cGUgY2hlY2tlciAnICsgJ2Z1bmN0aW9uIG11c3QgcmV0dXJuIGBudWxsYCBvciBhbiBgRXJyb3JgIGJ1dCByZXR1cm5lZCBhICVzLiAnICsgJ1lvdSBtYXkgaGF2ZSBmb3Jnb3R0ZW4gdG8gcGFzcyBhbiBhcmd1bWVudCB0byB0aGUgdHlwZSBjaGVja2VyICcgKyAnY3JlYXRvciAoYXJyYXlPZiwgaW5zdGFuY2VPZiwgb2JqZWN0T2YsIG9uZU9mLCBvbmVPZlR5cGUsIGFuZCAnICsgJ3NoYXBlIGFsbCByZXF1aXJlIGFuIGFyZ3VtZW50KS4nLCBjb21wb25lbnROYW1lIHx8ICdSZWFjdCBjbGFzcycsIGxvY2F0aW9uLCB0eXBlU3BlY05hbWUsIHR5cGVvZiBlcnJvcik7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmICEoZXJyb3IubWVzc2FnZSBpbiBsb2dnZWRUeXBlRmFpbHVyZXMpKSB7XG4gICAgICAgICAgLy8gT25seSBtb25pdG9yIHRoaXMgZmFpbHVyZSBvbmNlIGJlY2F1c2UgdGhlcmUgdGVuZHMgdG8gYmUgYSBsb3Qgb2YgdGhlXG4gICAgICAgICAgLy8gc2FtZSBlcnJvci5cbiAgICAgICAgICBsb2dnZWRUeXBlRmFpbHVyZXNbZXJyb3IubWVzc2FnZV0gPSB0cnVlO1xuXG4gICAgICAgICAgdmFyIHN0YWNrID0gZ2V0U3RhY2sgPyBnZXRTdGFjaygpIDogJyc7XG5cbiAgICAgICAgICB3YXJuaW5nKGZhbHNlLCAnRmFpbGVkICVzIHR5cGU6ICVzJXMnLCBsb2NhdGlvbiwgZXJyb3IubWVzc2FnZSwgc3RhY2sgIT0gbnVsbCA/IHN0YWNrIDogJycpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY2hlY2tQcm9wVHlwZXM7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL34vcHJvcC10eXBlcy9jaGVja1Byb3BUeXBlcy5qc1xuLy8gbW9kdWxlIGlkID0gNDY2XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVtcHR5RnVuY3Rpb24gPSByZXF1aXJlKCdmYmpzL2xpYi9lbXB0eUZ1bmN0aW9uJyk7XG52YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnZmJqcy9saWIvaW52YXJpYW50Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIC8vIEltcG9ydGFudCFcbiAgLy8gS2VlcCB0aGlzIGxpc3QgaW4gc3luYyB3aXRoIHByb2R1Y3Rpb24gdmVyc2lvbiBpbiBgLi9mYWN0b3J5V2l0aFR5cGVDaGVja2Vycy5qc2AuXG4gIGZ1bmN0aW9uIHNoaW0oKSB7XG4gICAgaW52YXJpYW50KFxuICAgICAgZmFsc2UsXG4gICAgICAnQ2FsbGluZyBQcm9wVHlwZXMgdmFsaWRhdG9ycyBkaXJlY3RseSBpcyBub3Qgc3VwcG9ydGVkIGJ5IHRoZSBgcHJvcC10eXBlc2AgcGFja2FnZS4gJyArXG4gICAgICAnVXNlIFByb3BUeXBlcy5jaGVja1Byb3BUeXBlcygpIHRvIGNhbGwgdGhlbS4gJyArXG4gICAgICAnUmVhZCBtb3JlIGF0IGh0dHA6Ly9mYi5tZS91c2UtY2hlY2stcHJvcC10eXBlcydcbiAgICApO1xuICB9O1xuICBzaGltLmlzUmVxdWlyZWQgPSBzaGltO1xuICBmdW5jdGlvbiBnZXRTaGltKCkge1xuICAgIHJldHVybiBzaGltO1xuICB9O1xuICB2YXIgUmVhY3RQcm9wVHlwZXMgPSB7XG4gICAgYXJyYXk6IHNoaW0sXG4gICAgYm9vbDogc2hpbSxcbiAgICBmdW5jOiBzaGltLFxuICAgIG51bWJlcjogc2hpbSxcbiAgICBvYmplY3Q6IHNoaW0sXG4gICAgc3RyaW5nOiBzaGltLFxuICAgIHN5bWJvbDogc2hpbSxcblxuICAgIGFueTogc2hpbSxcbiAgICBhcnJheU9mOiBnZXRTaGltLFxuICAgIGVsZW1lbnQ6IHNoaW0sXG4gICAgaW5zdGFuY2VPZjogZ2V0U2hpbSxcbiAgICBub2RlOiBzaGltLFxuICAgIG9iamVjdE9mOiBnZXRTaGltLFxuICAgIG9uZU9mOiBnZXRTaGltLFxuICAgIG9uZU9mVHlwZTogZ2V0U2hpbSxcbiAgICBzaGFwZTogZ2V0U2hpbVxuICB9O1xuXG4gIFJlYWN0UHJvcFR5cGVzLmNoZWNrUHJvcFR5cGVzID0gZW1wdHlGdW5jdGlvbjtcbiAgUmVhY3RQcm9wVHlwZXMuUHJvcFR5cGVzID0gUmVhY3RQcm9wVHlwZXM7XG5cbiAgcmV0dXJuIFJlYWN0UHJvcFR5cGVzO1xufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9wcm9wLXR5cGVzL2ZhY3RvcnlXaXRoVGhyb3dpbmdTaGltcy5qc1xuLy8gbW9kdWxlIGlkID0gNDY3XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtcHJlc2VudCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGVtcHR5RnVuY3Rpb24gPSByZXF1aXJlKCdmYmpzL2xpYi9lbXB0eUZ1bmN0aW9uJyk7XG52YXIgaW52YXJpYW50ID0gcmVxdWlyZSgnZmJqcy9saWIvaW52YXJpYW50Jyk7XG52YXIgd2FybmluZyA9IHJlcXVpcmUoJ2ZianMvbGliL3dhcm5pbmcnKTtcblxudmFyIFJlYWN0UHJvcFR5cGVzU2VjcmV0ID0gcmVxdWlyZSgnLi9saWIvUmVhY3RQcm9wVHlwZXNTZWNyZXQnKTtcbnZhciBjaGVja1Byb3BUeXBlcyA9IHJlcXVpcmUoJy4vY2hlY2tQcm9wVHlwZXMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpc1ZhbGlkRWxlbWVudCwgdGhyb3dPbkRpcmVjdEFjY2Vzcykge1xuICAvKiBnbG9iYWwgU3ltYm9sICovXG4gIHZhciBJVEVSQVRPUl9TWU1CT0wgPSB0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIFN5bWJvbC5pdGVyYXRvcjtcbiAgdmFyIEZBVVhfSVRFUkFUT1JfU1lNQk9MID0gJ0BAaXRlcmF0b3InOyAvLyBCZWZvcmUgU3ltYm9sIHNwZWMuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGl0ZXJhdG9yIG1ldGhvZCBmdW5jdGlvbiBjb250YWluZWQgb24gdGhlIGl0ZXJhYmxlIG9iamVjdC5cbiAgICpcbiAgICogQmUgc3VyZSB0byBpbnZva2UgdGhlIGZ1bmN0aW9uIHdpdGggdGhlIGl0ZXJhYmxlIGFzIGNvbnRleHQ6XG4gICAqXG4gICAqICAgICB2YXIgaXRlcmF0b3JGbiA9IGdldEl0ZXJhdG9yRm4obXlJdGVyYWJsZSk7XG4gICAqICAgICBpZiAoaXRlcmF0b3JGbikge1xuICAgKiAgICAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYXRvckZuLmNhbGwobXlJdGVyYWJsZSk7XG4gICAqICAgICAgIC4uLlxuICAgKiAgICAgfVxuICAgKlxuICAgKiBAcGFyYW0gez9vYmplY3R9IG1heWJlSXRlcmFibGVcbiAgICogQHJldHVybiB7P2Z1bmN0aW9ufVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0SXRlcmF0b3JGbihtYXliZUl0ZXJhYmxlKSB7XG4gICAgdmFyIGl0ZXJhdG9yRm4gPSBtYXliZUl0ZXJhYmxlICYmIChJVEVSQVRPUl9TWU1CT0wgJiYgbWF5YmVJdGVyYWJsZVtJVEVSQVRPUl9TWU1CT0xdIHx8IG1heWJlSXRlcmFibGVbRkFVWF9JVEVSQVRPUl9TWU1CT0xdKTtcbiAgICBpZiAodHlwZW9mIGl0ZXJhdG9yRm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBpdGVyYXRvckZuO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb2xsZWN0aW9uIG9mIG1ldGhvZHMgdGhhdCBhbGxvdyBkZWNsYXJhdGlvbiBhbmQgdmFsaWRhdGlvbiBvZiBwcm9wcyB0aGF0IGFyZVxuICAgKiBzdXBwbGllZCB0byBSZWFjdCBjb21wb25lbnRzLiBFeGFtcGxlIHVzYWdlOlxuICAgKlxuICAgKiAgIHZhciBQcm9wcyA9IHJlcXVpcmUoJ1JlYWN0UHJvcFR5cGVzJyk7XG4gICAqICAgdmFyIE15QXJ0aWNsZSA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcbiAgICogICAgIHByb3BUeXBlczoge1xuICAgKiAgICAgICAvLyBBbiBvcHRpb25hbCBzdHJpbmcgcHJvcCBuYW1lZCBcImRlc2NyaXB0aW9uXCIuXG4gICAqICAgICAgIGRlc2NyaXB0aW9uOiBQcm9wcy5zdHJpbmcsXG4gICAqXG4gICAqICAgICAgIC8vIEEgcmVxdWlyZWQgZW51bSBwcm9wIG5hbWVkIFwiY2F0ZWdvcnlcIi5cbiAgICogICAgICAgY2F0ZWdvcnk6IFByb3BzLm9uZU9mKFsnTmV3cycsJ1Bob3RvcyddKS5pc1JlcXVpcmVkLFxuICAgKlxuICAgKiAgICAgICAvLyBBIHByb3AgbmFtZWQgXCJkaWFsb2dcIiB0aGF0IHJlcXVpcmVzIGFuIGluc3RhbmNlIG9mIERpYWxvZy5cbiAgICogICAgICAgZGlhbG9nOiBQcm9wcy5pbnN0YW5jZU9mKERpYWxvZykuaXNSZXF1aXJlZFxuICAgKiAgICAgfSxcbiAgICogICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7IC4uLiB9XG4gICAqICAgfSk7XG4gICAqXG4gICAqIEEgbW9yZSBmb3JtYWwgc3BlY2lmaWNhdGlvbiBvZiBob3cgdGhlc2UgbWV0aG9kcyBhcmUgdXNlZDpcbiAgICpcbiAgICogICB0eXBlIDo9IGFycmF5fGJvb2x8ZnVuY3xvYmplY3R8bnVtYmVyfHN0cmluZ3xvbmVPZihbLi4uXSl8aW5zdGFuY2VPZiguLi4pXG4gICAqICAgZGVjbCA6PSBSZWFjdFByb3BUeXBlcy57dHlwZX0oLmlzUmVxdWlyZWQpP1xuICAgKlxuICAgKiBFYWNoIGFuZCBldmVyeSBkZWNsYXJhdGlvbiBwcm9kdWNlcyBhIGZ1bmN0aW9uIHdpdGggdGhlIHNhbWUgc2lnbmF0dXJlLiBUaGlzXG4gICAqIGFsbG93cyB0aGUgY3JlYXRpb24gb2YgY3VzdG9tIHZhbGlkYXRpb24gZnVuY3Rpb25zLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogIHZhciBNeUxpbmsgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG4gICAqICAgIHByb3BUeXBlczoge1xuICAgKiAgICAgIC8vIEFuIG9wdGlvbmFsIHN0cmluZyBvciBVUkkgcHJvcCBuYW1lZCBcImhyZWZcIi5cbiAgICogICAgICBocmVmOiBmdW5jdGlvbihwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUpIHtcbiAgICogICAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAqICAgICAgICBpZiAocHJvcFZhbHVlICE9IG51bGwgJiYgdHlwZW9mIHByb3BWYWx1ZSAhPT0gJ3N0cmluZycgJiZcbiAgICogICAgICAgICAgICAhKHByb3BWYWx1ZSBpbnN0YW5jZW9mIFVSSSkpIHtcbiAgICogICAgICAgICAgcmV0dXJuIG5ldyBFcnJvcihcbiAgICogICAgICAgICAgICAnRXhwZWN0ZWQgYSBzdHJpbmcgb3IgYW4gVVJJIGZvciAnICsgcHJvcE5hbWUgKyAnIGluICcgK1xuICAgKiAgICAgICAgICAgIGNvbXBvbmVudE5hbWVcbiAgICogICAgICAgICAgKTtcbiAgICogICAgICAgIH1cbiAgICogICAgICB9XG4gICAqICAgIH0sXG4gICAqICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7Li4ufVxuICAgKiAgfSk7XG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cblxuICB2YXIgQU5PTllNT1VTID0gJzw8YW5vbnltb3VzPj4nO1xuXG4gIC8vIEltcG9ydGFudCFcbiAgLy8gS2VlcCB0aGlzIGxpc3QgaW4gc3luYyB3aXRoIHByb2R1Y3Rpb24gdmVyc2lvbiBpbiBgLi9mYWN0b3J5V2l0aFRocm93aW5nU2hpbXMuanNgLlxuICB2YXIgUmVhY3RQcm9wVHlwZXMgPSB7XG4gICAgYXJyYXk6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdhcnJheScpLFxuICAgIGJvb2w6IGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyKCdib29sZWFuJyksXG4gICAgZnVuYzogY3JlYXRlUHJpbWl0aXZlVHlwZUNoZWNrZXIoJ2Z1bmN0aW9uJyksXG4gICAgbnVtYmVyOiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignbnVtYmVyJyksXG4gICAgb2JqZWN0OiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignb2JqZWN0JyksXG4gICAgc3RyaW5nOiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignc3RyaW5nJyksXG4gICAgc3ltYm9sOiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcignc3ltYm9sJyksXG5cbiAgICBhbnk6IGNyZWF0ZUFueVR5cGVDaGVja2VyKCksXG4gICAgYXJyYXlPZjogY3JlYXRlQXJyYXlPZlR5cGVDaGVja2VyLFxuICAgIGVsZW1lbnQ6IGNyZWF0ZUVsZW1lbnRUeXBlQ2hlY2tlcigpLFxuICAgIGluc3RhbmNlT2Y6IGNyZWF0ZUluc3RhbmNlVHlwZUNoZWNrZXIsXG4gICAgbm9kZTogY3JlYXRlTm9kZUNoZWNrZXIoKSxcbiAgICBvYmplY3RPZjogY3JlYXRlT2JqZWN0T2ZUeXBlQ2hlY2tlcixcbiAgICBvbmVPZjogY3JlYXRlRW51bVR5cGVDaGVja2VyLFxuICAgIG9uZU9mVHlwZTogY3JlYXRlVW5pb25UeXBlQ2hlY2tlcixcbiAgICBzaGFwZTogY3JlYXRlU2hhcGVUeXBlQ2hlY2tlclxuICB9O1xuXG4gIC8qKlxuICAgKiBpbmxpbmVkIE9iamVjdC5pcyBwb2x5ZmlsbCB0byBhdm9pZCByZXF1aXJpbmcgY29uc3VtZXJzIHNoaXAgdGhlaXIgb3duXG4gICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL09iamVjdC9pc1xuICAgKi9cbiAgLyplc2xpbnQtZGlzYWJsZSBuby1zZWxmLWNvbXBhcmUqL1xuICBmdW5jdGlvbiBpcyh4LCB5KSB7XG4gICAgLy8gU2FtZVZhbHVlIGFsZ29yaXRobVxuICAgIGlmICh4ID09PSB5KSB7XG4gICAgICAvLyBTdGVwcyAxLTUsIDctMTBcbiAgICAgIC8vIFN0ZXBzIDYuYi02LmU6ICswICE9IC0wXG4gICAgICByZXR1cm4geCAhPT0gMCB8fCAxIC8geCA9PT0gMSAvIHk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFN0ZXAgNi5hOiBOYU4gPT0gTmFOXG4gICAgICByZXR1cm4geCAhPT0geCAmJiB5ICE9PSB5O1xuICAgIH1cbiAgfVxuICAvKmVzbGludC1lbmFibGUgbm8tc2VsZi1jb21wYXJlKi9cblxuICAvKipcbiAgICogV2UgdXNlIGFuIEVycm9yLWxpa2Ugb2JqZWN0IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IGFzIHBlb3BsZSBtYXkgY2FsbFxuICAgKiBQcm9wVHlwZXMgZGlyZWN0bHkgYW5kIGluc3BlY3QgdGhlaXIgb3V0cHV0LiBIb3dldmVyLCB3ZSBkb24ndCB1c2UgcmVhbFxuICAgKiBFcnJvcnMgYW55bW9yZS4gV2UgZG9uJ3QgaW5zcGVjdCB0aGVpciBzdGFjayBhbnl3YXksIGFuZCBjcmVhdGluZyB0aGVtXG4gICAqIGlzIHByb2hpYml0aXZlbHkgZXhwZW5zaXZlIGlmIHRoZXkgYXJlIGNyZWF0ZWQgdG9vIG9mdGVuLCBzdWNoIGFzIHdoYXRcbiAgICogaGFwcGVucyBpbiBvbmVPZlR5cGUoKSBmb3IgYW55IHR5cGUgYmVmb3JlIHRoZSBvbmUgdGhhdCBtYXRjaGVkLlxuICAgKi9cbiAgZnVuY3Rpb24gUHJvcFR5cGVFcnJvcihtZXNzYWdlKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICB0aGlzLnN0YWNrID0gJyc7XG4gIH1cbiAgLy8gTWFrZSBgaW5zdGFuY2VvZiBFcnJvcmAgc3RpbGwgd29yayBmb3IgcmV0dXJuZWQgZXJyb3JzLlxuICBQcm9wVHlwZUVycm9yLnByb3RvdHlwZSA9IEVycm9yLnByb3RvdHlwZTtcblxuICBmdW5jdGlvbiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSkge1xuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgICB2YXIgbWFudWFsUHJvcFR5cGVDYWxsQ2FjaGUgPSB7fTtcbiAgICAgIHZhciBtYW51YWxQcm9wVHlwZVdhcm5pbmdDb3VudCA9IDA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNoZWNrVHlwZShpc1JlcXVpcmVkLCBwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUsIHNlY3JldCkge1xuICAgICAgY29tcG9uZW50TmFtZSA9IGNvbXBvbmVudE5hbWUgfHwgQU5PTllNT1VTO1xuICAgICAgcHJvcEZ1bGxOYW1lID0gcHJvcEZ1bGxOYW1lIHx8IHByb3BOYW1lO1xuXG4gICAgICBpZiAoc2VjcmV0ICE9PSBSZWFjdFByb3BUeXBlc1NlY3JldCkge1xuICAgICAgICBpZiAodGhyb3dPbkRpcmVjdEFjY2Vzcykge1xuICAgICAgICAgIC8vIE5ldyBiZWhhdmlvciBvbmx5IGZvciB1c2VycyBvZiBgcHJvcC10eXBlc2AgcGFja2FnZVxuICAgICAgICAgIGludmFyaWFudChcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgJ0NhbGxpbmcgUHJvcFR5cGVzIHZhbGlkYXRvcnMgZGlyZWN0bHkgaXMgbm90IHN1cHBvcnRlZCBieSB0aGUgYHByb3AtdHlwZXNgIHBhY2thZ2UuICcgK1xuICAgICAgICAgICAgJ1VzZSBgUHJvcFR5cGVzLmNoZWNrUHJvcFR5cGVzKClgIHRvIGNhbGwgdGhlbS4gJyArXG4gICAgICAgICAgICAnUmVhZCBtb3JlIGF0IGh0dHA6Ly9mYi5tZS91c2UtY2hlY2stcHJvcC10eXBlcydcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgLy8gT2xkIGJlaGF2aW9yIGZvciBwZW9wbGUgdXNpbmcgUmVhY3QuUHJvcFR5cGVzXG4gICAgICAgICAgdmFyIGNhY2hlS2V5ID0gY29tcG9uZW50TmFtZSArICc6JyArIHByb3BOYW1lO1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICFtYW51YWxQcm9wVHlwZUNhbGxDYWNoZVtjYWNoZUtleV0gJiZcbiAgICAgICAgICAgIC8vIEF2b2lkIHNwYW1taW5nIHRoZSBjb25zb2xlIGJlY2F1c2UgdGhleSBhcmUgb2Z0ZW4gbm90IGFjdGlvbmFibGUgZXhjZXB0IGZvciBsaWIgYXV0aG9yc1xuICAgICAgICAgICAgbWFudWFsUHJvcFR5cGVXYXJuaW5nQ291bnQgPCAzXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICB3YXJuaW5nKFxuICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgJ1lvdSBhcmUgbWFudWFsbHkgY2FsbGluZyBhIFJlYWN0LlByb3BUeXBlcyB2YWxpZGF0aW9uICcgK1xuICAgICAgICAgICAgICAnZnVuY3Rpb24gZm9yIHRoZSBgJXNgIHByb3Agb24gYCVzYC4gVGhpcyBpcyBkZXByZWNhdGVkICcgK1xuICAgICAgICAgICAgICAnYW5kIHdpbGwgdGhyb3cgaW4gdGhlIHN0YW5kYWxvbmUgYHByb3AtdHlwZXNgIHBhY2thZ2UuICcgK1xuICAgICAgICAgICAgICAnWW91IG1heSBiZSBzZWVpbmcgdGhpcyB3YXJuaW5nIGR1ZSB0byBhIHRoaXJkLXBhcnR5IFByb3BUeXBlcyAnICtcbiAgICAgICAgICAgICAgJ2xpYnJhcnkuIFNlZSBodHRwczovL2ZiLm1lL3JlYWN0LXdhcm5pbmctZG9udC1jYWxsLXByb3B0eXBlcyAnICsgJ2ZvciBkZXRhaWxzLicsXG4gICAgICAgICAgICAgIHByb3BGdWxsTmFtZSxcbiAgICAgICAgICAgICAgY29tcG9uZW50TmFtZVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIG1hbnVhbFByb3BUeXBlQ2FsbENhY2hlW2NhY2hlS2V5XSA9IHRydWU7XG4gICAgICAgICAgICBtYW51YWxQcm9wVHlwZVdhcm5pbmdDb3VudCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHByb3BzW3Byb3BOYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIGlmIChpc1JlcXVpcmVkKSB7XG4gICAgICAgICAgaWYgKHByb3BzW3Byb3BOYW1lXSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdUaGUgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIGlzIG1hcmtlZCBhcyByZXF1aXJlZCAnICsgKCdpbiBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgYnV0IGl0cyB2YWx1ZSBpcyBgbnVsbGAuJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ1RoZSAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2AgaXMgbWFya2VkIGFzIHJlcXVpcmVkIGluICcgKyAoJ2AnICsgY29tcG9uZW50TmFtZSArICdgLCBidXQgaXRzIHZhbHVlIGlzIGB1bmRlZmluZWRgLicpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBjaGFpbmVkQ2hlY2tUeXBlID0gY2hlY2tUeXBlLmJpbmQobnVsbCwgZmFsc2UpO1xuICAgIGNoYWluZWRDaGVja1R5cGUuaXNSZXF1aXJlZCA9IGNoZWNrVHlwZS5iaW5kKG51bGwsIHRydWUpO1xuXG4gICAgcmV0dXJuIGNoYWluZWRDaGVja1R5cGU7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVQcmltaXRpdmVUeXBlQ2hlY2tlcihleHBlY3RlZFR5cGUpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUsIHNlY3JldCkge1xuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgICBpZiAocHJvcFR5cGUgIT09IGV4cGVjdGVkVHlwZSkge1xuICAgICAgICAvLyBgcHJvcFZhbHVlYCBiZWluZyBpbnN0YW5jZSBvZiwgc2F5LCBkYXRlL3JlZ2V4cCwgcGFzcyB0aGUgJ29iamVjdCdcbiAgICAgICAgLy8gY2hlY2ssIGJ1dCB3ZSBjYW4gb2ZmZXIgYSBtb3JlIHByZWNpc2UgZXJyb3IgbWVzc2FnZSBoZXJlIHJhdGhlciB0aGFuXG4gICAgICAgIC8vICdvZiB0eXBlIGBvYmplY3RgJy5cbiAgICAgICAgdmFyIHByZWNpc2VUeXBlID0gZ2V0UHJlY2lzZVR5cGUocHJvcFZhbHVlKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHR5cGUgJyArICgnYCcgKyBwcmVjaXNlVHlwZSArICdgIHN1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCAnKSArICgnYCcgKyBleHBlY3RlZFR5cGUgKyAnYC4nKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUFueVR5cGVDaGVja2VyKCkge1xuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcihlbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zTnVsbCk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVBcnJheU9mVHlwZUNoZWNrZXIodHlwZUNoZWNrZXIpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIGlmICh0eXBlb2YgdHlwZUNoZWNrZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdQcm9wZXJ0eSBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIGNvbXBvbmVudCBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCBoYXMgaW52YWxpZCBQcm9wVHlwZSBub3RhdGlvbiBpbnNpZGUgYXJyYXlPZi4nKTtcbiAgICAgIH1cbiAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvcFZhbHVlKSkge1xuICAgICAgICB2YXIgcHJvcFR5cGUgPSBnZXRQcm9wVHlwZShwcm9wVmFsdWUpO1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHR5cGUgJyArICgnYCcgKyBwcm9wVHlwZSArICdgIHN1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCBhbiBhcnJheS4nKSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BWYWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZXJyb3IgPSB0eXBlQ2hlY2tlcihwcm9wVmFsdWUsIGksIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUgKyAnWycgKyBpICsgJ10nLCBSZWFjdFByb3BUeXBlc1NlY3JldCk7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnRUeXBlQ2hlY2tlcigpIHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgICBpZiAoIWlzVmFsaWRFbGVtZW50KHByb3BWYWx1ZSkpIHtcbiAgICAgICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9wVHlwZUVycm9yKCdJbnZhbGlkICcgKyBsb2NhdGlvbiArICcgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiB0eXBlICcgKyAoJ2AnICsgcHJvcFR5cGUgKyAnYCBzdXBwbGllZCB0byBgJyArIGNvbXBvbmVudE5hbWUgKyAnYCwgZXhwZWN0ZWQgYSBzaW5nbGUgUmVhY3RFbGVtZW50LicpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlSW5zdGFuY2VUeXBlQ2hlY2tlcihleHBlY3RlZENsYXNzKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICBpZiAoIShwcm9wc1twcm9wTmFtZV0gaW5zdGFuY2VvZiBleHBlY3RlZENsYXNzKSkge1xuICAgICAgICB2YXIgZXhwZWN0ZWRDbGFzc05hbWUgPSBleHBlY3RlZENsYXNzLm5hbWUgfHwgQU5PTllNT1VTO1xuICAgICAgICB2YXIgYWN0dWFsQ2xhc3NOYW1lID0gZ2V0Q2xhc3NOYW1lKHByb3BzW3Byb3BOYW1lXSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSAnICsgKCdgJyArIGFjdHVhbENsYXNzTmFtZSArICdgIHN1cHBsaWVkIHRvIGAnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCAnKSArICgnaW5zdGFuY2Ugb2YgYCcgKyBleHBlY3RlZENsYXNzTmFtZSArICdgLicpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRW51bVR5cGVDaGVja2VyKGV4cGVjdGVkVmFsdWVzKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGV4cGVjdGVkVmFsdWVzKSkge1xuICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IHdhcm5pbmcoZmFsc2UsICdJbnZhbGlkIGFyZ3VtZW50IHN1cHBsaWVkIHRvIG9uZU9mLCBleHBlY3RlZCBhbiBpbnN0YW5jZSBvZiBhcnJheS4nKSA6IHZvaWQgMDtcbiAgICAgIHJldHVybiBlbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zTnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV4cGVjdGVkVmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpcyhwcm9wVmFsdWUsIGV4cGVjdGVkVmFsdWVzW2ldKSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZXNTdHJpbmcgPSBKU09OLnN0cmluZ2lmeShleHBlY3RlZFZhbHVlcyk7XG4gICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIG9mIHZhbHVlIGAnICsgcHJvcFZhbHVlICsgJ2AgJyArICgnc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIG9uZSBvZiAnICsgdmFsdWVzU3RyaW5nICsgJy4nKSk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVPYmplY3RPZlR5cGVDaGVja2VyKHR5cGVDaGVja2VyKSB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGUocHJvcHMsIHByb3BOYW1lLCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lKSB7XG4gICAgICBpZiAodHlwZW9mIHR5cGVDaGVja2VyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignUHJvcGVydHkgYCcgKyBwcm9wRnVsbE5hbWUgKyAnYCBvZiBjb21wb25lbnQgYCcgKyBjb21wb25lbnROYW1lICsgJ2AgaGFzIGludmFsaWQgUHJvcFR5cGUgbm90YXRpb24gaW5zaWRlIG9iamVjdE9mLicpO1xuICAgICAgfVxuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgICBpZiAocHJvcFR5cGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSAnICsgKCdgJyArIHByb3BUeXBlICsgJ2Agc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIGFuIG9iamVjdC4nKSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBrZXkgaW4gcHJvcFZhbHVlKSB7XG4gICAgICAgIGlmIChwcm9wVmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIHZhciBlcnJvciA9IHR5cGVDaGVja2VyKHByb3BWYWx1ZSwga2V5LCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lICsgJy4nICsga2V5LCBSZWFjdFByb3BUeXBlc1NlY3JldCk7XG4gICAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlQ2hhaW5hYmxlVHlwZUNoZWNrZXIodmFsaWRhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlVW5pb25UeXBlQ2hlY2tlcihhcnJheU9mVHlwZUNoZWNrZXJzKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGFycmF5T2ZUeXBlQ2hlY2tlcnMpKSB7XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gd2FybmluZyhmYWxzZSwgJ0ludmFsaWQgYXJndW1lbnQgc3VwcGxpZWQgdG8gb25lT2ZUeXBlLCBleHBlY3RlZCBhbiBpbnN0YW5jZSBvZiBhcnJheS4nKSA6IHZvaWQgMDtcbiAgICAgIHJldHVybiBlbXB0eUZ1bmN0aW9uLnRoYXRSZXR1cm5zTnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZShwcm9wcywgcHJvcE5hbWUsIGNvbXBvbmVudE5hbWUsIGxvY2F0aW9uLCBwcm9wRnVsbE5hbWUpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXlPZlR5cGVDaGVja2Vycy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hlY2tlciA9IGFycmF5T2ZUeXBlQ2hlY2tlcnNbaV07XG4gICAgICAgIGlmIChjaGVja2VyKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSwgUmVhY3RQcm9wVHlwZXNTZWNyZXQpID09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIHN1cHBsaWVkIHRvICcgKyAoJ2AnICsgY29tcG9uZW50TmFtZSArICdgLicpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU5vZGVDaGVja2VyKCkge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgaWYgKCFpc05vZGUocHJvcHNbcHJvcE5hbWVdKSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb3BUeXBlRXJyb3IoJ0ludmFsaWQgJyArIGxvY2F0aW9uICsgJyBgJyArIHByb3BGdWxsTmFtZSArICdgIHN1cHBsaWVkIHRvICcgKyAoJ2AnICsgY29tcG9uZW50TmFtZSArICdgLCBleHBlY3RlZCBhIFJlYWN0Tm9kZS4nKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZUNoYWluYWJsZVR5cGVDaGVja2VyKHZhbGlkYXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVNoYXBlVHlwZUNoZWNrZXIoc2hhcGVUeXBlcykge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHByb3BzLCBwcm9wTmFtZSwgY29tcG9uZW50TmFtZSwgbG9jYXRpb24sIHByb3BGdWxsTmFtZSkge1xuICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcbiAgICAgIHZhciBwcm9wVHlwZSA9IGdldFByb3BUeXBlKHByb3BWYWx1ZSk7XG4gICAgICBpZiAocHJvcFR5cGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvcFR5cGVFcnJvcignSW52YWxpZCAnICsgbG9jYXRpb24gKyAnIGAnICsgcHJvcEZ1bGxOYW1lICsgJ2Agb2YgdHlwZSBgJyArIHByb3BUeXBlICsgJ2AgJyArICgnc3VwcGxpZWQgdG8gYCcgKyBjb21wb25lbnROYW1lICsgJ2AsIGV4cGVjdGVkIGBvYmplY3RgLicpKTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGtleSBpbiBzaGFwZVR5cGVzKSB7XG4gICAgICAgIHZhciBjaGVja2VyID0gc2hhcGVUeXBlc1trZXldO1xuICAgICAgICBpZiAoIWNoZWNrZXIpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXJyb3IgPSBjaGVja2VyKHByb3BWYWx1ZSwga2V5LCBjb21wb25lbnROYW1lLCBsb2NhdGlvbiwgcHJvcEZ1bGxOYW1lICsgJy4nICsga2V5LCBSZWFjdFByb3BUeXBlc1NlY3JldCk7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVDaGFpbmFibGVUeXBlQ2hlY2tlcih2YWxpZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc05vZGUocHJvcFZhbHVlKSB7XG4gICAgc3dpdGNoICh0eXBlb2YgcHJvcFZhbHVlKSB7XG4gICAgICBjYXNlICdudW1iZXInOlxuICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgIGNhc2UgJ3VuZGVmaW5lZCc6XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgIHJldHVybiAhcHJvcFZhbHVlO1xuICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocHJvcFZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiBwcm9wVmFsdWUuZXZlcnkoaXNOb2RlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvcFZhbHVlID09PSBudWxsIHx8IGlzVmFsaWRFbGVtZW50KHByb3BWYWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpdGVyYXRvckZuID0gZ2V0SXRlcmF0b3JGbihwcm9wVmFsdWUpO1xuICAgICAgICBpZiAoaXRlcmF0b3JGbikge1xuICAgICAgICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhdG9yRm4uY2FsbChwcm9wVmFsdWUpO1xuICAgICAgICAgIHZhciBzdGVwO1xuICAgICAgICAgIGlmIChpdGVyYXRvckZuICE9PSBwcm9wVmFsdWUuZW50cmllcykge1xuICAgICAgICAgICAgd2hpbGUgKCEoc3RlcCA9IGl0ZXJhdG9yLm5leHQoKSkuZG9uZSkge1xuICAgICAgICAgICAgICBpZiAoIWlzTm9kZShzdGVwLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJdGVyYXRvciB3aWxsIHByb3ZpZGUgZW50cnkgW2ssdl0gdHVwbGVzIHJhdGhlciB0aGFuIHZhbHVlcy5cbiAgICAgICAgICAgIHdoaWxlICghKHN0ZXAgPSBpdGVyYXRvci5uZXh0KCkpLmRvbmUpIHtcbiAgICAgICAgICAgICAgdmFyIGVudHJ5ID0gc3RlcC52YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpc05vZGUoZW50cnlbMV0pKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGlzU3ltYm9sKHByb3BUeXBlLCBwcm9wVmFsdWUpIHtcbiAgICAvLyBOYXRpdmUgU3ltYm9sLlxuICAgIGlmIChwcm9wVHlwZSA9PT0gJ3N5bWJvbCcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIDE5LjQuMy41IFN5bWJvbC5wcm90b3R5cGVbQEB0b1N0cmluZ1RhZ10gPT09ICdTeW1ib2wnXG4gICAgaWYgKHByb3BWYWx1ZVsnQEB0b1N0cmluZ1RhZyddID09PSAnU3ltYm9sJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRmFsbGJhY2sgZm9yIG5vbi1zcGVjIGNvbXBsaWFudCBTeW1ib2xzIHdoaWNoIGFyZSBwb2x5ZmlsbGVkLlxuICAgIGlmICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIHByb3BWYWx1ZSBpbnN0YW5jZW9mIFN5bWJvbCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gRXF1aXZhbGVudCBvZiBgdHlwZW9mYCBidXQgd2l0aCBzcGVjaWFsIGhhbmRsaW5nIGZvciBhcnJheSBhbmQgcmVnZXhwLlxuICBmdW5jdGlvbiBnZXRQcm9wVHlwZShwcm9wVmFsdWUpIHtcbiAgICB2YXIgcHJvcFR5cGUgPSB0eXBlb2YgcHJvcFZhbHVlO1xuICAgIGlmIChBcnJheS5pc0FycmF5KHByb3BWYWx1ZSkpIHtcbiAgICAgIHJldHVybiAnYXJyYXknO1xuICAgIH1cbiAgICBpZiAocHJvcFZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAvLyBPbGQgd2Via2l0cyAoYXQgbGVhc3QgdW50aWwgQW5kcm9pZCA0LjApIHJldHVybiAnZnVuY3Rpb24nIHJhdGhlciB0aGFuXG4gICAgICAvLyAnb2JqZWN0JyBmb3IgdHlwZW9mIGEgUmVnRXhwLiBXZSdsbCBub3JtYWxpemUgdGhpcyBoZXJlIHNvIHRoYXQgL2JsYS9cbiAgICAgIC8vIHBhc3NlcyBQcm9wVHlwZXMub2JqZWN0LlxuICAgICAgcmV0dXJuICdvYmplY3QnO1xuICAgIH1cbiAgICBpZiAoaXNTeW1ib2wocHJvcFR5cGUsIHByb3BWYWx1ZSkpIHtcbiAgICAgIHJldHVybiAnc3ltYm9sJztcbiAgICB9XG4gICAgcmV0dXJuIHByb3BUeXBlO1xuICB9XG5cbiAgLy8gVGhpcyBoYW5kbGVzIG1vcmUgdHlwZXMgdGhhbiBgZ2V0UHJvcFR5cGVgLiBPbmx5IHVzZWQgZm9yIGVycm9yIG1lc3NhZ2VzLlxuICAvLyBTZWUgYGNyZWF0ZVByaW1pdGl2ZVR5cGVDaGVja2VyYC5cbiAgZnVuY3Rpb24gZ2V0UHJlY2lzZVR5cGUocHJvcFZhbHVlKSB7XG4gICAgdmFyIHByb3BUeXBlID0gZ2V0UHJvcFR5cGUocHJvcFZhbHVlKTtcbiAgICBpZiAocHJvcFR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAocHJvcFZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICByZXR1cm4gJ2RhdGUnO1xuICAgICAgfSBlbHNlIGlmIChwcm9wVmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgcmV0dXJuICdyZWdleHAnO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcHJvcFR5cGU7XG4gIH1cblxuICAvLyBSZXR1cm5zIGNsYXNzIG5hbWUgb2YgdGhlIG9iamVjdCwgaWYgYW55LlxuICBmdW5jdGlvbiBnZXRDbGFzc05hbWUocHJvcFZhbHVlKSB7XG4gICAgaWYgKCFwcm9wVmFsdWUuY29uc3RydWN0b3IgfHwgIXByb3BWYWx1ZS5jb25zdHJ1Y3Rvci5uYW1lKSB7XG4gICAgICByZXR1cm4gQU5PTllNT1VTO1xuICAgIH1cbiAgICByZXR1cm4gcHJvcFZhbHVlLmNvbnN0cnVjdG9yLm5hbWU7XG4gIH1cblxuICBSZWFjdFByb3BUeXBlcy5jaGVja1Byb3BUeXBlcyA9IGNoZWNrUHJvcFR5cGVzO1xuICBSZWFjdFByb3BUeXBlcy5Qcm9wVHlwZXMgPSBSZWFjdFByb3BUeXBlcztcblxuICByZXR1cm4gUmVhY3RQcm9wVHlwZXM7XG59O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3Byb3AtdHlwZXMvZmFjdG9yeVdpdGhUeXBlQ2hlY2tlcnMuanNcbi8vIG1vZHVsZSBpZCA9IDQ2OFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCIvKipcbiAqIENvcHlyaWdodCAyMDEzLXByZXNlbnQsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICB2YXIgUkVBQ1RfRUxFTUVOVF9UWVBFID0gKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiZcbiAgICBTeW1ib2wuZm9yICYmXG4gICAgU3ltYm9sLmZvcigncmVhY3QuZWxlbWVudCcpKSB8fFxuICAgIDB4ZWFjNztcblxuICB2YXIgaXNWYWxpZEVsZW1lbnQgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgICByZXR1cm4gdHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIG9iamVjdCAhPT0gbnVsbCAmJlxuICAgICAgb2JqZWN0LiQkdHlwZW9mID09PSBSRUFDVF9FTEVNRU5UX1RZUEU7XG4gIH07XG5cbiAgLy8gQnkgZXhwbGljaXRseSB1c2luZyBgcHJvcC10eXBlc2AgeW91IGFyZSBvcHRpbmcgaW50byBuZXcgZGV2ZWxvcG1lbnQgYmVoYXZpb3IuXG4gIC8vIGh0dHA6Ly9mYi5tZS9wcm9wLXR5cGVzLWluLXByb2RcbiAgdmFyIHRocm93T25EaXJlY3RBY2Nlc3MgPSB0cnVlO1xuICBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZmFjdG9yeVdpdGhUeXBlQ2hlY2tlcnMnKShpc1ZhbGlkRWxlbWVudCwgdGhyb3dPbkRpcmVjdEFjY2Vzcyk7XG59IGVsc2Uge1xuICAvLyBCeSBleHBsaWNpdGx5IHVzaW5nIGBwcm9wLXR5cGVzYCB5b3UgYXJlIG9wdGluZyBpbnRvIG5ldyBwcm9kdWN0aW9uIGJlaGF2aW9yLlxuICAvLyBodHRwOi8vZmIubWUvcHJvcC10eXBlcy1pbi1wcm9kXG4gIG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9mYWN0b3J5V2l0aFRocm93aW5nU2hpbXMnKSgpO1xufVxuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9+L3Byb3AtdHlwZXMvaW5kZXguanNcbi8vIG1vZHVsZSBpZCA9IDQ2OVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJcbi8qKlxuICogV2hlbiBzb3VyY2UgbWFwcyBhcmUgZW5hYmxlZCwgYHN0eWxlLWxvYWRlcmAgdXNlcyBhIGxpbmsgZWxlbWVudCB3aXRoIGEgZGF0YS11cmkgdG9cbiAqIGVtYmVkIHRoZSBjc3Mgb24gdGhlIHBhZ2UuIFRoaXMgYnJlYWtzIGFsbCByZWxhdGl2ZSB1cmxzIGJlY2F1c2Ugbm93IHRoZXkgYXJlIHJlbGF0aXZlIHRvIGFcbiAqIGJ1bmRsZSBpbnN0ZWFkIG9mIHRoZSBjdXJyZW50IHBhZ2UuXG4gKlxuICogT25lIHNvbHV0aW9uIGlzIHRvIG9ubHkgdXNlIGZ1bGwgdXJscywgYnV0IHRoYXQgbWF5IGJlIGltcG9zc2libGUuXG4gKlxuICogSW5zdGVhZCwgdGhpcyBmdW5jdGlvbiBcImZpeGVzXCIgdGhlIHJlbGF0aXZlIHVybHMgdG8gYmUgYWJzb2x1dGUgYWNjb3JkaW5nIHRvIHRoZSBjdXJyZW50IHBhZ2UgbG9jYXRpb24uXG4gKlxuICogQSBydWRpbWVudGFyeSB0ZXN0IHN1aXRlIGlzIGxvY2F0ZWQgYXQgYHRlc3QvZml4VXJscy5qc2AgYW5kIGNhbiBiZSBydW4gdmlhIHRoZSBgbnBtIHRlc3RgIGNvbW1hbmQuXG4gKlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNzcykge1xuICAvLyBnZXQgY3VycmVudCBsb2NhdGlvblxuICB2YXIgbG9jYXRpb24gPSB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvdy5sb2NhdGlvbjtcblxuICBpZiAoIWxvY2F0aW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiZml4VXJscyByZXF1aXJlcyB3aW5kb3cubG9jYXRpb25cIik7XG4gIH1cblxuXHQvLyBibGFuayBvciBudWxsP1xuXHRpZiAoIWNzcyB8fCB0eXBlb2YgY3NzICE9PSBcInN0cmluZ1wiKSB7XG5cdCAgcmV0dXJuIGNzcztcbiAgfVxuXG4gIHZhciBiYXNlVXJsID0gbG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2NhdGlvbi5ob3N0O1xuICB2YXIgY3VycmVudERpciA9IGJhc2VVcmwgKyBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC9bXlxcL10qJC8sIFwiL1wiKTtcblxuXHQvLyBjb252ZXJ0IGVhY2ggdXJsKC4uLilcblx0Lypcblx0VGhpcyByZWd1bGFyIGV4cHJlc3Npb24gaXMganVzdCBhIHdheSB0byByZWN1cnNpdmVseSBtYXRjaCBicmFja2V0cyB3aXRoaW5cblx0YSBzdHJpbmcuXG5cblx0IC91cmxcXHMqXFwoICA9IE1hdGNoIG9uIHRoZSB3b3JkIFwidXJsXCIgd2l0aCBhbnkgd2hpdGVzcGFjZSBhZnRlciBpdCBhbmQgdGhlbiBhIHBhcmVuc1xuXHQgICAoICA9IFN0YXJ0IGEgY2FwdHVyaW5nIGdyb3VwXG5cdCAgICAgKD86ICA9IFN0YXJ0IGEgbm9uLWNhcHR1cmluZyBncm91cFxuXHQgICAgICAgICBbXikoXSAgPSBNYXRjaCBhbnl0aGluZyB0aGF0IGlzbid0IGEgcGFyZW50aGVzZXNcblx0ICAgICAgICAgfCAgPSBPUlxuXHQgICAgICAgICBcXCggID0gTWF0Y2ggYSBzdGFydCBwYXJlbnRoZXNlc1xuXHQgICAgICAgICAgICAgKD86ICA9IFN0YXJ0IGFub3RoZXIgbm9uLWNhcHR1cmluZyBncm91cHNcblx0ICAgICAgICAgICAgICAgICBbXikoXSsgID0gTWF0Y2ggYW55dGhpbmcgdGhhdCBpc24ndCBhIHBhcmVudGhlc2VzXG5cdCAgICAgICAgICAgICAgICAgfCAgPSBPUlxuXHQgICAgICAgICAgICAgICAgIFxcKCAgPSBNYXRjaCBhIHN0YXJ0IHBhcmVudGhlc2VzXG5cdCAgICAgICAgICAgICAgICAgICAgIFteKShdKiAgPSBNYXRjaCBhbnl0aGluZyB0aGF0IGlzbid0IGEgcGFyZW50aGVzZXNcblx0ICAgICAgICAgICAgICAgICBcXCkgID0gTWF0Y2ggYSBlbmQgcGFyZW50aGVzZXNcblx0ICAgICAgICAgICAgICkgID0gRW5kIEdyb3VwXG4gICAgICAgICAgICAgICpcXCkgPSBNYXRjaCBhbnl0aGluZyBhbmQgdGhlbiBhIGNsb3NlIHBhcmVuc1xuICAgICAgICAgICkgID0gQ2xvc2Ugbm9uLWNhcHR1cmluZyBncm91cFxuICAgICAgICAgICogID0gTWF0Y2ggYW55dGhpbmdcbiAgICAgICApICA9IENsb3NlIGNhcHR1cmluZyBncm91cFxuXHQgXFwpICA9IE1hdGNoIGEgY2xvc2UgcGFyZW5zXG5cblx0IC9naSAgPSBHZXQgYWxsIG1hdGNoZXMsIG5vdCB0aGUgZmlyc3QuICBCZSBjYXNlIGluc2Vuc2l0aXZlLlxuXHQgKi9cblx0dmFyIGZpeGVkQ3NzID0gY3NzLnJlcGxhY2UoL3VybFxccypcXCgoKD86W14pKF18XFwoKD86W14pKF0rfFxcKFteKShdKlxcKSkqXFwpKSopXFwpL2dpLCBmdW5jdGlvbihmdWxsTWF0Y2gsIG9yaWdVcmwpIHtcblx0XHQvLyBzdHJpcCBxdW90ZXMgKGlmIHRoZXkgZXhpc3QpXG5cdFx0dmFyIHVucXVvdGVkT3JpZ1VybCA9IG9yaWdVcmxcblx0XHRcdC50cmltKClcblx0XHRcdC5yZXBsYWNlKC9eXCIoLiopXCIkLywgZnVuY3Rpb24obywgJDEpeyByZXR1cm4gJDE7IH0pXG5cdFx0XHQucmVwbGFjZSgvXicoLiopJyQvLCBmdW5jdGlvbihvLCAkMSl7IHJldHVybiAkMTsgfSk7XG5cblx0XHQvLyBhbHJlYWR5IGEgZnVsbCB1cmw/IG5vIGNoYW5nZVxuXHRcdGlmICgvXigjfGRhdGE6fGh0dHA6XFwvXFwvfGh0dHBzOlxcL1xcL3xmaWxlOlxcL1xcL1xcLykvaS50ZXN0KHVucXVvdGVkT3JpZ1VybCkpIHtcblx0XHQgIHJldHVybiBmdWxsTWF0Y2g7XG5cdFx0fVxuXG5cdFx0Ly8gY29udmVydCB0aGUgdXJsIHRvIGEgZnVsbCB1cmxcblx0XHR2YXIgbmV3VXJsO1xuXG5cdFx0aWYgKHVucXVvdGVkT3JpZ1VybC5pbmRleE9mKFwiLy9cIikgPT09IDApIHtcblx0XHQgIFx0Ly9UT0RPOiBzaG91bGQgd2UgYWRkIHByb3RvY29sP1xuXHRcdFx0bmV3VXJsID0gdW5xdW90ZWRPcmlnVXJsO1xuXHRcdH0gZWxzZSBpZiAodW5xdW90ZWRPcmlnVXJsLmluZGV4T2YoXCIvXCIpID09PSAwKSB7XG5cdFx0XHQvLyBwYXRoIHNob3VsZCBiZSByZWxhdGl2ZSB0byB0aGUgYmFzZSB1cmxcblx0XHRcdG5ld1VybCA9IGJhc2VVcmwgKyB1bnF1b3RlZE9yaWdVcmw7IC8vIGFscmVhZHkgc3RhcnRzIHdpdGggJy8nXG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIHBhdGggc2hvdWxkIGJlIHJlbGF0aXZlIHRvIGN1cnJlbnQgZGlyZWN0b3J5XG5cdFx0XHRuZXdVcmwgPSBjdXJyZW50RGlyICsgdW5xdW90ZWRPcmlnVXJsLnJlcGxhY2UoL15cXC5cXC8vLCBcIlwiKTsgLy8gU3RyaXAgbGVhZGluZyAnLi8nXG5cdFx0fVxuXG5cdFx0Ly8gc2VuZCBiYWNrIHRoZSBmaXhlZCB1cmwoLi4uKVxuXHRcdHJldHVybiBcInVybChcIiArIEpTT04uc3RyaW5naWZ5KG5ld1VybCkgKyBcIilcIjtcblx0fSk7XG5cblx0Ly8gc2VuZCBiYWNrIHRoZSBmaXhlZCBjc3Ncblx0cmV0dXJuIGZpeGVkQ3NzO1xufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vfi9zdHlsZS1sb2FkZXIvZml4VXJscy5qc1xuLy8gbW9kdWxlIGlkID0gODg5XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIHN0eWxlLWxvYWRlcjogQWRkcyBzb21lIGNzcyB0byB0aGUgRE9NIGJ5IGFkZGluZyBhIDxzdHlsZT4gdGFnXG5cbi8vIGxvYWQgdGhlIHN0eWxlc1xudmFyIGNvbnRlbnQgPSByZXF1aXJlKFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL1NwYWNlci5sZXNzXCIpO1xuaWYodHlwZW9mIGNvbnRlbnQgPT09ICdzdHJpbmcnKSBjb250ZW50ID0gW1ttb2R1bGUuaWQsIGNvbnRlbnQsICcnXV07XG4vLyBQcmVwYXJlIGNzc1RyYW5zZm9ybWF0aW9uXG52YXIgdHJhbnNmb3JtO1xuXG52YXIgb3B0aW9ucyA9IHt9XG5vcHRpb25zLnRyYW5zZm9ybSA9IHRyYW5zZm9ybVxuLy8gYWRkIHRoZSBzdHlsZXMgdG8gdGhlIERPTVxudmFyIHVwZGF0ZSA9IHJlcXVpcmUoXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9hZGRTdHlsZXMuanNcIikoY29udGVudCwgb3B0aW9ucyk7XG5pZihjb250ZW50LmxvY2FscykgbW9kdWxlLmV4cG9ydHMgPSBjb250ZW50LmxvY2Fscztcbi8vIEhvdCBNb2R1bGUgUmVwbGFjZW1lbnRcbmlmKG1vZHVsZS5ob3QpIHtcblx0Ly8gV2hlbiB0aGUgc3R5bGVzIGNoYW5nZSwgdXBkYXRlIHRoZSA8c3R5bGU+IHRhZ3Ncblx0aWYoIWNvbnRlbnQubG9jYWxzKSB7XG5cdFx0bW9kdWxlLmhvdC5hY2NlcHQoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vU3BhY2VyLmxlc3NcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbmV3Q29udGVudCA9IHJlcXVpcmUoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vU3BhY2VyLmxlc3NcIik7XG5cdFx0XHRpZih0eXBlb2YgbmV3Q29udGVudCA9PT0gJ3N0cmluZycpIG5ld0NvbnRlbnQgPSBbW21vZHVsZS5pZCwgbmV3Q29udGVudCwgJyddXTtcblx0XHRcdHVwZGF0ZShuZXdDb250ZW50KTtcblx0XHR9KTtcblx0fVxuXHQvLyBXaGVuIHRoZSBtb2R1bGUgaXMgZGlzcG9zZWQsIHJlbW92ZSB0aGUgPHN0eWxlPiB0YWdzXG5cdG1vZHVsZS5ob3QuZGlzcG9zZShmdW5jdGlvbigpIHsgdXBkYXRlKCk7IH0pO1xufVxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2FwcC9TcGFjZXIubGVzc1xuLy8gbW9kdWxlIGlkID0gODkwXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIHN0eWxlLWxvYWRlcjogQWRkcyBzb21lIGNzcyB0byB0aGUgRE9NIGJ5IGFkZGluZyBhIDxzdHlsZT4gdGFnXG5cbi8vIGxvYWQgdGhlIHN0eWxlc1xudmFyIGNvbnRlbnQgPSByZXF1aXJlKFwiISEuLi8uLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9pbmRleC5qcyEuLi8uLi9ub2RlX21vZHVsZXMvbGVzcy1sb2FkZXIvZGlzdC9pbmRleC5qcyEuL3N0eWxlcy5sZXNzXCIpO1xuaWYodHlwZW9mIGNvbnRlbnQgPT09ICdzdHJpbmcnKSBjb250ZW50ID0gW1ttb2R1bGUuaWQsIGNvbnRlbnQsICcnXV07XG4vLyBQcmVwYXJlIGNzc1RyYW5zZm9ybWF0aW9uXG52YXIgdHJhbnNmb3JtO1xuXG52YXIgb3B0aW9ucyA9IHt9XG5vcHRpb25zLnRyYW5zZm9ybSA9IHRyYW5zZm9ybVxuLy8gYWRkIHRoZSBzdHlsZXMgdG8gdGhlIERPTVxudmFyIHVwZGF0ZSA9IHJlcXVpcmUoXCIhLi4vLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9hZGRTdHlsZXMuanNcIikoY29udGVudCwgb3B0aW9ucyk7XG5pZihjb250ZW50LmxvY2FscykgbW9kdWxlLmV4cG9ydHMgPSBjb250ZW50LmxvY2Fscztcbi8vIEhvdCBNb2R1bGUgUmVwbGFjZW1lbnRcbmlmKG1vZHVsZS5ob3QpIHtcblx0Ly8gV2hlbiB0aGUgc3R5bGVzIGNoYW5nZSwgdXBkYXRlIHRoZSA8c3R5bGU+IHRhZ3Ncblx0aWYoIWNvbnRlbnQubG9jYWxzKSB7XG5cdFx0bW9kdWxlLmhvdC5hY2NlcHQoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vc3R5bGVzLmxlc3NcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbmV3Q29udGVudCA9IHJlcXVpcmUoXCIhIS4uLy4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2luZGV4LmpzIS4uLy4uL25vZGVfbW9kdWxlcy9sZXNzLWxvYWRlci9kaXN0L2luZGV4LmpzIS4vc3R5bGVzLmxlc3NcIik7XG5cdFx0XHRpZih0eXBlb2YgbmV3Q29udGVudCA9PT0gJ3N0cmluZycpIG5ld0NvbnRlbnQgPSBbW21vZHVsZS5pZCwgbmV3Q29udGVudCwgJyddXTtcblx0XHRcdHVwZGF0ZShuZXdDb250ZW50KTtcblx0XHR9KTtcblx0fVxuXHQvLyBXaGVuIHRoZSBtb2R1bGUgaXMgZGlzcG9zZWQsIHJlbW92ZSB0aGUgPHN0eWxlPiB0YWdzXG5cdG1vZHVsZS5ob3QuZGlzcG9zZShmdW5jdGlvbigpIHsgdXBkYXRlKCk7IH0pO1xufVxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2FwcC9zdHlsZXMubGVzc1xuLy8gbW9kdWxlIGlkID0gODkxXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIi8vIENvbW1vbiBpbXBvcnRzXG5pbXBvcnQgUmVhY3QgZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgUmVhY3RET00gZnJvbSAncmVhY3QtZG9tJztcblxuLy8gUGFyc2VyXG5pbXBvcnQgcGFyc2VyIGZyb20gXCIuLi9pbmRleFwiO1xuXG4vLyBBcHAtc3BlY2lmaWMgaW1wb3J0c1xuaW1wb3J0IFNwZWxsRWRpdG9yIGZyb20gXCIuL1NwZWxsRWRpdG9yLmpzeFwiO1xuXG5cbi8vIEtpY2sgb2ZmIG91ciB0b3AtbGV2ZWwgZWxlbWVudFxuUmVhY3RET00ucmVuZGVyKFxuICA8U3BlbGxFZGl0b3IgLz4sXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZWFjdC1yb290Jylcbik7XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvYXBwL2luZGV4LmpzeCJdLCJzb3VyY2VSb290IjoiIn0=