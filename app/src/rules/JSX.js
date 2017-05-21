//
//	# Rules for defining classes (known as `types`)
//
import Tokenizer from "../Tokenizer";
import Rule from "../RuleSyntax";
import parser from "./_parser";

// re-export parser for testing.
export default parser;


// JSX expression.
Rule.JSX = class jsxElement extends Rule.Pattern {
	// Text strings get encoded as `text` objects in the token stream.
	parse(parser, tokens, startIndex = 0) {
		let token = tokens[startIndex];
		if (!(token instanceof Tokenizer.JSXElement)) return undefined;
		return this.clone({
			matched: token,
			nextStart: startIndex + 1
		});
	}

	toSource(context) {
		return this.matched+"";
	}
};
parser.addRule(["jsx", "expression", "statement"], Rule.JSX);
