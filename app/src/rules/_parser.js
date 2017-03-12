//
//	# Create a `parser` singleton to use to set up rules and during tests.
//
import Parser from "../Parser";
const parser = new Parser();
export default parser;

// Stick on window for reflection and ad-hoc testing.
window.parser = parser;

