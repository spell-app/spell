import global from "./global";

// Return the plural of `word`.
// NOTE: this is not very good at all!!!
// TODO: exceptions, etc.
export function pluralize(word) {
	return word + "s";
}

// Return true if word is a plural.
// NOTE: for words which are BOTH singular and plural, this will return true.
export function isPlural(word) {
	return word === pluralize(word);
}


// Return the singular of `word`.
// NOTE: this is not very good at all!!!
// TODO: exceptions, etc.
export function singularize(word) {
	return word.replace(/e?s$/, "");
}

// Return true if word is a singular.
// NOTE: for words which are BOTH singular and plural, this will return true.
export function isSingular(word) {
	return word === singularize(word);
}


// Export all as a lump
let allExports = {...exports};
export default allExports;

// DEBUG: put on global for debugging.
global.STRING = allExports;
