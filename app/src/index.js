export Tokenizer from "./Tokenizer.js";
export Parser from "./Parser.js";
export Rule from "./Rule.js";
import "./RuleSyntax";
import parser from "./rules/index.js";

// Stick on window for reflection and ad-hoc testing.
if (typeof window !== "undefined") {
	Object.assign(window, {
		Tokenizer: exports.Tokenizer,
		tokenize: exports.Tokenizer.tokenize.bind(exports.Tokenizer),

		Rule: exports.Rule,

		Parser: exports.Parser,
		parser: parser,
		parse: parser.parse.bind(parser),
		compile: parser.compile.bind(parser),
	});
}

export default parser;
