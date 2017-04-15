// Memoize/forget semantics.

// Return a memoize function for use as a getter in a `Object.defineProperty()`
// TESTME
export function memoizedGetter(property, getter) {
	return {
		get : function() {
			if (this[property] === undefined) {
				var value = getter.apply(this);
				if (value !== undefined) {
					Object.defineProperty(this, property, { value, configurable: true });
				}
			}
			return this[property];
		}
	}
}
