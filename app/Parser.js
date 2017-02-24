// Spell "English" parser strawman


window.Tokenizer = class Tokenizer {

	// Find the matching instance of possibly nested `endToken` to balance `startToken`.
	// If successful, returns `{ startIndex, endIndex, slice }`
	// Throws if unsucessful.
	static findNested(tokens, startToken, endToken, startIndex = 0) {
		if (tokens[startIndex] !== startToken) throw new SyntaxError(`Expected '${startToken}' at index ${startIndex} of tokens`);
		var nesting = 0;
		var nested = false;
		for (var endIndex = startIndex + 1, lastIndex = tokens.length; endIndex < lastIndex; endIndex++) {
			var token = tokens[endIndex];
			if (token === startToken) {
				nesting++;
				nested = true;
			}
			if (token === endToken) {
				if (nesting === 0)
					return { startIndex, endIndex, slice: tokens.slice(startIndex+1, endIndex), nested };
				nesting--;
			}
		}
		throw new SyntaxError(`Couldn't find matching '${endToken}'s starting at item ${startIndex}`);
	}

}


window.Rule = class Rule {
	constructor(properties) {
		Object.assign(this, properties);
		this.tokens = [];
	}

	toJSON() {
		return this.tokens;
	}

	toString() {
		return this.tokens.join(" ");
	}

}





window.Parser = class Parser {
	constructor(properties) {
		Object.assign(this, properties);

		// Map of { ruleName => Rule }
		this.rules = {};
	}

	// Given rule `name` and `syntaxes` as `[ "syntax with {variables}", "production with {variables}" ]`
	// create a Rule which will:
	//	- parse the syntax
	makeRule(name, syntaxes) {
		// if rule already exists, add syntaxes and re-compile
		let existingRule = this.rules[name];
		if (existingRule) {
			syntaxes = syntaxes.concat(existingRule.syntaxes);
		}
		this.rules[name] = new Rule(syntaxes);
	}
}


//Token.parseRuleSyntax("(constant|shared)? {variable} as one of \\({literal}(, {literal})*\\)");
Token.parseRuleSyntax("(modifier:constant|shared)? {variable} as one of \\([enumeration:{literal},]\\)");


//Token.parseRuleSyntax("(modifiers:constant|shared)* {variable} as one of \\((list:{literal}(, {literal})*)\\)").tokens;
