import TextStream from "./TextStream.js";
import Parser from "./Parser.js";
import Rule from "./Rule.js";
import "./RuleSyntax";
import parser from "./rules/index.js";

// Stick on window for reflection and ad-hoc testing.
if (typeof window !== "undefined") {
	window.TextStream = TextStream;
	window.Parser = Parser;
	window.Rule = Rule;
	window.parser = parser;
}

export default {
	TextStream, Parser, Rule, parser
}

