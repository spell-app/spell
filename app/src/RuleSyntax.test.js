import Rule from "./RuleSyntax.js";

//
//	Rule.String
//
test("parse single string", () => {
	let rule = Rule.parseRuleSyntax(">");
	expect(rule).toBeInstanceOf(Rule.Symbol);
	expect(rule.string).toBe(">");
});

test("parse multiple strings as one string", () => {
	let rule = Rule.parseRuleSyntax(">=");
	expect(rule).toBeInstanceOf(Rule.Symbol);
	expect(rule.string).toBe(">=");

	expect(rule.toString()).toBe(">=");
});


//
//	Rule.Keyword
//
test("parse single keyword", () => {
	let rule = Rule.parseRuleSyntax("is");
	expect(rule).toBeInstanceOf(Rule.Keyword);
	expect(rule.string).toBe("is");

	expect(rule.toString()).toBe("is");
});

test("parse multiple keywords as a sequence", () => {
	let rule = Rule.parseRuleSyntax("is not");
	expect(rule).toBeInstanceOf(Rule.Keyword);
	expect(rule.string).toBe("is not");

	expect(rule.toString()).toBe("is not");
});

test("parse non-word keyword", () => {
	let rule = Rule.parseRuleSyntax(":");
	expect(rule).toBeInstanceOf(Rule.Symbol);
	expect(rule.string).toBe(":");

	expect(rule.toString()).toBe(":");
});

test("parse escaped non-word keyword", () => {
	let rule = Rule.parseRuleSyntax("\\(");
	expect(rule).toBeInstanceOf(Rule.Symbol);
	expect(rule.string).toBe("(");
	expect(rule.toString()).toBe("\\(");
});


//
//	Rule.Subrule
//
test("parse subrule", () => {
	let rule = Rule.parseRuleSyntax("{subrule}");
	expect(rule).toBeInstanceOf(Rule.Subrule);
	expect(rule.rule).toBe("subrule");
});

test("parse subrule with named argument", () => {
	let rule = Rule.parseRuleSyntax("{arg:subrule}");
	expect(rule).toBeInstanceOf(Rule.Subrule);
	expect(rule.rule).toBe("subrule");
	expect(rule.argument).toBe("arg");

	expect(rule.toString()).toBe("{arg:subrule}");
});


//
//	Rule.List
//
test("parse list", () => {
	let rule = Rule.parseRuleSyntax("[{number},]");
	expect(rule).toBeInstanceOf(Rule.List);
	expect(rule.item).toBeInstanceOf(Rule.Subrule);
	expect(rule.delimiter).toBeInstanceOf(Rule.Symbol);

	expect(rule.toString()).toBe("[{number} ,]");
});

test("parse list with named argument", () => {
	let rule = Rule.parseRuleSyntax("[my-list:{number},]");
	expect(rule).toBeInstanceOf(Rule.List);
	expect(rule.item).toBeInstanceOf(Rule.Subrule);
	expect(rule.delimiter).toBeInstanceOf(Rule.Symbol);
	expect(rule.argument).toBe("my-list");
	expect(rule.toString()).toBe("[my-list:{number} ,]");
});

test("parse list with keyword delimiter", () => {
	let rule = Rule.parseRuleSyntax("[{number}and]");
	expect(rule).toBeInstanceOf(Rule.List);
	expect(rule.item).toBeInstanceOf(Rule.Subrule);
	expect(rule.delimiter).toBeInstanceOf(Rule.Keyword);
	expect(rule.delimiter.string).toBe("and");

	expect(rule.toString()).toBe("[{number} and]");
});

test("fail list with extra stuff", () => {
	expect(() => Rule.parseRuleSyntax("[{number}, bad input]"))
		.toThrow(SyntaxError);
});


//
//	Rule.Alternatives
//
test("parse simple alternatives", () => {
	let rule = Rule.parseRuleSyntax("(a|bb| cccccc )");

	expect(rule).toBeInstanceOf(Rule.Alternatives);
	expect(rule.rules.length).toBe(3);

	expect(rule.rules[0]).toBeInstanceOf(Rule.Keyword);
	expect(rule.rules[0].string).toBe("a");

	expect(rule.rules[1]).toBeInstanceOf(Rule.Keyword);
	expect(rule.rules[1].string).toBe("bb");

	expect(rule.rules[2]).toBeInstanceOf(Rule.Keyword);
	expect(rule.rules[2].string).toBe("cccccc");

	expect(rule.toString()).toBe("(a|bb|cccccc)");
});

test("parse named alternatives", () => {
	let rule = Rule.parseRuleSyntax("(foo:a|b)");

	expect(rule).toBeInstanceOf(Rule.Alternatives);
	expect(rule.argument).toBe("foo");
	expect(rule.rules.length).toBe(2);

	expect(rule.rules[0]).toBeInstanceOf(Rule.Keyword);
	expect(rule.rules[0].string).toBe("a");

	expect(rule.rules[1]).toBeInstanceOf(Rule.Keyword);
	expect(rule.rules[1].string).toBe("b");

	expect(rule.toString()).toBe("(foo:a|b)");
});

test("parse complex alternatives", () => {
	let rule = Rule.parseRuleSyntax("( is a test | {named:subrule} | [{number},] | (a|b) )");
	expect(rule).toBeInstanceOf(Rule.Alternatives);

	expect(rule.rules.length).toBe(4);
	expect(rule.rules[0]).toBeInstanceOf(Rule.Keyword);
	expect(rule.rules[1]).toBeInstanceOf(Rule.Subrule);
	expect(rule.rules[2]).toBeInstanceOf(Rule.List);
	expect(rule.rules[3]).toBeInstanceOf(Rule.Alternatives);

	expect(rule.toString()).toBe("(is a test|{named:subrule}|[{number} ,]|(a|b))");
});


//
//	Optional
//
test("parse optional string", () => {
	let rule = Rule.parseRuleSyntax(";?");
	expect(rule).toBeInstanceOf(Rule.Symbol);
	expect(rule.string).toBe(";");
	expect(rule.optional).toBe(true);

	expect(rule.toString()).toBe(";?");
});

test("parse optional keyword", () => {
	let rule = Rule.parseRuleSyntax("yah?");
	expect(rule).toBeInstanceOf(Rule.Keyword);
	expect(rule.optional).toBe(true);

	expect(rule.toString()).toBe("yah?");
});

test("parse optional subrule", () => {
	let rule = Rule.parseRuleSyntax("{number}?");
	expect(rule).toBeInstanceOf(Rule.Subrule);
	expect(rule.optional).toBe(true);

	expect(rule.toString()).toBe("{number}?");
});

test("parse optional alternatives", () => {
	let rule = Rule.parseRuleSyntax("(a|b)?");
	expect(rule).toBeInstanceOf(Rule.Alternatives);
	expect(rule.optional).toBe(true);

	expect(rule.toString()).toBe("(a|b)?");
});

test("parse optional list", () => {
	let rule = Rule.parseRuleSyntax("[{number},]?");
	expect(rule).toBeInstanceOf(Rule.List);
	expect(rule.optional).toBe(true);

	expect(rule.toString()).toBe("[{number} ,]?");
});


//
//	Repeats
//
test("parse * repeated subrule", () => {
	let rule = Rule.parseRuleSyntax("{number}*");
	expect(rule).toBeInstanceOf(Rule.Repeat);
	expect(rule.optional).toBe(true);
	expect(rule.rule).toBeInstanceOf(Rule.Subrule);


	expect(rule.toString()).toBe("{number}*");
});

test("parse + repeated subrule", () => {
	let rule = Rule.parseRuleSyntax("{number}+");
	expect(rule).toBeInstanceOf(Rule.Repeat);
	expect(rule.optional).toBeUndefined();
	expect(rule.rule).toBeInstanceOf(Rule.Subrule);

	expect(rule.toString()).toBe("{number}+");
});

test("parse + repeated sequence", () => {
	let rule = Rule.parseRuleSyntax("(one or more)+");
	expect(rule).toBeInstanceOf(Rule.Repeat);
	expect(rule.optional).toBeUndefined();
	expect(rule.rule).toBeInstanceOf(Rule.Keyword);

	expect(rule.toString()).toBe("(one or more)+");
});

test("parse + repeated list", () => {
	let rule = Rule.parseRuleSyntax("[{number},]+");
	expect(rule).toBeInstanceOf(Rule.Repeat);
	expect(rule.optional).toBeUndefined();
	expect(rule.rule).toBeInstanceOf(Rule.List);

	expect(rule.toString()).toBe("[{number} ,]+");
});


//
//	Error cases
//
test("thrown on improperly balanced parenthesis, etc", () => {
	expect(() => Rule.parseRuleSyntax("(abc"))
		.toThrow(SyntaxError);

	expect(() => Rule.parseRuleSyntax("[abc"))
		.toThrow(SyntaxError);

	expect(() => Rule.parseRuleSyntax("{abc"))
		.toThrow(SyntaxError);

});

test("throw on invalid end tokens", () => {
	expect(() => Rule.parseRuleSyntax("}"))
		.toThrow(SyntaxError);

	expect(() => Rule.parseRuleSyntax(")"))
		.toThrow(SyntaxError);

	expect(() => Rule.parseRuleSyntax("]"))
		.toThrow(SyntaxError);

	expect(() => Rule.parseRuleSyntax("|"))
		.toThrow(SyntaxError);
});
