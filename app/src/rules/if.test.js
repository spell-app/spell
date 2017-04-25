import Rule from "../RuleSyntax";
import "./if.js";
import parser from "./statements.js";

test("parser is defined", () => {
	expect(parser).toBeDefined();
});

test("simple if...then works w/o statement", () => {
	let result = parser.parse("statement", "if a then");
	expect(result.toSource()).toBe("if (a)");
});

test("simple if...then works", () => {
	let result = parser.parse("statement", "if a then b = 1");
	expect(result.toSource()).toBe("if (a) { b = 1 }");
});

test("simple if...: works", () => {
	let result = parser.parse("statement", "if a: b = 1");
	expect(result.toSource()).toBe("if (a) { b = 1 }");
});

test("simple if...: works with extra whitepsace", () => {
	let result = parser.parse("statement", "if a : b = 1");
	expect(result.toSource()).toBe("if (a) { b = 1 }");
});

test("simple inverted if works", () => {
	let result = parser.parse("statement", "b = 1 if a");
	expect(result.toSource()).toBe("if (a) { b = 1 }");
});

test("simple inverted if...else works", () => {
	let result = parser.parse("statement", "b = 1 if a else b = 2");
	expect(result.toSource()).toBe("if (a) { b = 1 } else { b = 2 }");
});

test("simple inverted if...otherwise works", () => {
	let result = parser.parse("statement", "b = 1 if a otherwise b = 2");
	expect(result.toSource()).toBe("if (a) { b = 1 } else { b = 2 }");
});

test("simple else if...then works w/o statement", () => {
	let result = parser.parse("statement", "else if a then");
	expect(result.toSource()).toBe("else if (a)");
});

test("simple else if...then works", () => {
	let result = parser.parse("statement", "else if a then b = 1");
	expect(result.toSource()).toBe("else if (a) { b = 1 }");
});

test("simple else if...: works", () => {
	let result = parser.parse("statement", "else if a: b = 1");
	expect(result.toSource()).toBe("else if (a) { b = 1 }");
});

test("else works w/o statement", () => {
	let result = parser.parse("statement", "else");
	expect(result.toSource()).toBe("else");
});

test("otherwise works w/o statement", () => {
	let result = parser.parse("statement", "otherwise");
	expect(result.toSource()).toBe("else");
});

test("else works w/ statement", () => {
	let result = parser.parse("statement", "else b = 1");
	expect(result.toSource()).toBe("else { b = 1 }");
});

//
//	# compound expressions
//

// test("compound condition", () => {
// 	let result = parser.parse("statement", "if a is 1 and b is defined: b = 2");
// 	expect(result.toSource()).toBe("if ((a == 1) && (b !== undefined)) { b = 2 }");
// });
