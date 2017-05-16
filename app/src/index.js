export TextStream from "./TextStream.js";
export Parser from "./Parser.js";
export Rule from "./Rule.js";
import "./RuleSyntax";
import parser from "./rules/index.js";

// Stick on window for reflection and ad-hoc testing.
if (typeof window !== "undefined") {
	window.TextStream = exports.TextStream;
	window.Parser = exports.Parser;
	window.Rule = exports.Rule;
	window.parser = exports.parser;
}

export default parser;
