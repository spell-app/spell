// Memoize/forget semantics.

// Return a memoizing getter function.
// TESTME
export function memoized(property, getter) {
	return function() {
		if (this[property] === undefined) {
			var value = getter.apply(this);
			if (value !== undefined) {
				// Define so that we can be deleted and re-defined, but not set or enumerated.
				Object.defineProperty(this, property, { value, configurable: true });
			}
		}
		return this[property];
	}
}


// Return a memoize function for use as a getter in a `Object.defineProperty()`
// TESTME
export function defineMemoized(property, getter) {
	return {
		get : memoized(property, getter)
	}
}
