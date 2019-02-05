//TODO: move to string utils
// List of special characters in regular expressions.
// Used to escape those chars when creating regular expressions from strings.
const REGEXP_SPECIAL_CHARACTERS = (function() {
  const chars = {};
  "\\/^$*+?.()|{},[]".split("").forEach(char => chars[char] = true);
  return chars;
})()

// Given a "normal" `string`, escape any regular expression special characters
//	so we can create a `new RegExp()`.
// Also converts a single space to arbitrary set of spaces with "\s+"
function escapeRegExpCharacters(string) {
  return string.split("")
    .map(function (char, index, list) {
      // Special case for backslash
      if (char === "\\") return "\\";
      // Special case for space
      if (char === " ") return "\\s+";
      // If a special char and previous character was not an escape, escape the result.
      if (Parser.REGEXP_SPECIAL_CHARACTERS[char] && list[index-1] !== "\\") return "\\"+char;
      // This char should be fine by itself.
      return char;
    })
    .join("");
}

// Create a new regular expression from a "normal" string, escaping special characters as necessary.
export function RegExpFromString(string, flags) {
  return new RegExp(Parser.escapeRegExpCharacters(string), flags);
}
