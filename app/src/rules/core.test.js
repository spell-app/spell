import TextStream from "../TextStream";
import parser from "./core.js";

test("parser is defined", () => {
	expect(parser).toBeDefined();
});


//
//	Identifiers
//
test("correctly matches identifiers", () => {
	let result = parser.parse("identifier", "abc ");
	expect(result.toSource()).toBe("abc");

	result = parser.parse("identifier", "abc-def ");
	expect(result.toSource()).toBe("abc_def");

	result = parser.parse("identifier", "abc_def ");
	expect(result.toSource()).toBe("abc_def");

	result = parser.parse("identifier", "abc01 ");
	expect(result.toSource()).toBe("abc01");

	result = parser.parse("identifier", "abc-def_01 ");
	expect(result.toSource()).toBe("abc_def_01");

	result = parser.parse("identifier", "$asda ");
	expect(result).toBeUndefined();

	result = parser.parse("identifier", "(asda) ");
	expect(result).toBeUndefined();
});


test("doesn't confuse identifiers and Types", () => {
	let result = parser.parse("identifier", "Abc");
	expect(result).toBeUndefined();
});


//
//	Type
//
test("correctly matches Types", () => {
	let result = parser.parse("type", "Abc ");
	expect(result.toSource()).toBe("Abc");

	result = parser.parse("type", "Abc-def ");
	expect(result.toSource()).toBe("Abc_def");

	result = parser.parse("type", "Abc_def ");
	expect(result.toSource()).toBe("Abc_def");

	result = parser.parse("type", "Abc01 ");
	expect(result.toSource()).toBe("Abc01");

	result = parser.parse("type", "Abc-def_01 ");
	expect(result.toSource()).toBe("Abc_def_01");

	result = parser.parse("type", "$asda ");
	expect(result).toBeUndefined();

	result = parser.parse("type", "(asda) ");
	expect(result).toBeUndefined();
});


//
//	Number
//
test("correctly matches numbers", () => {
	let result = parser.parse("number", "1");
	expect(result.toSource()).toBe(1);

	result = parser.parse("number", "1000");
	expect(result.toSource()).toBe(1000);

	result = parser.parse("number", " -1");
	expect(result.toSource()).toBe(-1);

	result = parser.parse("number", "- 1");
	expect(result).toBeUndefined();

	result = parser.parse("number", "1.1");
	expect(result.toSource()).toBe(1.1);

	result = parser.parse("number", "000.1");
	expect(result.toSource()).toBe(0.1);

	result = parser.parse("number", "1.");
	expect(result.toSource()).toBe(1);

	result = parser.parse("number", ".1");
	expect(result.toSource()).toBe(0.1);

	result = parser.parse("number", "-111.111");
	expect(result.toSource()).toBe(-111.111);

	result = parser.parse("number", "a1");
	expect(result).toBeUndefined();

	result = parser.parse("number", "(1");
	expect(result).toBeUndefined();
});


//
//	Text
//
test("correctly matches text type", () => {
	let result = parser.parse("text", '"a"');
	expect(result.toSource()).toBe('"a"');

	result = parser.parse("text", '"aaaaa"');
	expect(result.toSource()).toBe('"aaaaa"');

	result = parser.parse("text", '""');
	expect(result.toSource()).toBe('""');

	result = parser.parse("text", "'a'");
	expect(result.toSource()).toBe("'a'");

	result = parser.parse("text", "'aaaaa'");
	expect(result.toSource()).toBe("'aaaaa'");

	result = parser.parse("text", "''");
	expect(result.toSource()).toBe("''");
});


//
//	Boolean
//
test("correctly matches boolean type", () => {
	let result = parser.parse("boolean", "yes ");
	expect(result.toSource()).toBe(true);

	result = parser.parse("boolean", "true ");
	expect(result.toSource()).toBe(true);

	result = parser.parse("boolean", "ok ");
	expect(result.toSource()).toBe(true);

	result = parser.parse("boolean", "success ");
	expect(result.toSource()).toBe(true);

	result = parser.parse("boolean", "no ");
	expect(result.toSource()).toBe(false);

	result = parser.parse("boolean", "false ");
	expect(result.toSource()).toBe(false);

	result = parser.parse("boolean", "cancel ");
	expect(result.toSource()).toBe(false);

	result = parser.parse("boolean", "failure ");
	expect(result.toSource()).toBe(false);
});

test("doesn't match boolean as part of a word", () => {
	let result = parser.parse("boolean", "  yessir ");
	expect(result).toBeUndefined();
});



//
//	Literal-list
//
test("correctly matches literal lists", () => {
	let result = parser.parse("literal_list", " [] ");
	expect(result.toSource()).toBe("[]");

	result = parser.parse("literal_list", " [1] ");
	expect(result.toSource()).toBe("[1]");

	result = parser.parse("literal_list", " [1,] ");
	expect(result.toSource()).toBe("[1]");

	result = parser.parse("literal_list", " [1,2,3] ");
	expect(result.toSource()).toBe("[1, 2, 3]");

	result = parser.parse("literal_list", " [1,2,3,] ");
	expect(result.toSource()).toBe("[1, 2, 3]");

	result = parser.parse("literal_list", " [,1,2,3,] ");
	expect(result).toBeUndefined();

	result = parser.parse("literal_list", " [yes,no,'a',1,] ");
	expect(result.toSource()).toBe("[true, false, 'a', 1]");
});


//
//	Parenthesized expression
//
test("correctly matches parenthesized expressions", () => {
	let result = parser.parse("expression", "(someVar)");
	expect(result.toSource()).toBe("(someVar)");

// HMMM... these won't work unless you import `operators.js`...
// 	result = parser.parse("expression", "(1) and (true)");
// 	expect(result.toSource()).toBe("((1) && (true))");
//
// 	result = parser.parse("expression", "((1) and (true))");
// 	expect(result.toSource()).toBe("((1) && (true))");

});
