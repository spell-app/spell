//
//	# Create a `parser` singleton to use to set up rules and during tests.
//
import Parser from "../Parser";
import Rule from "../RuleSyntax";

// Create parser instance.
const parser = new Parser();
export default parser;

// Stick on window for reflection and ad-hoc testing.
//TODO: global...
window.parser = parser;

