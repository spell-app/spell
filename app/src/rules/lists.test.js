import Rule from "../RuleSyntax";
import "./core.js";
import parser from "./lists.js";

test("parser is defined", () => {
	expect(parser).toBeDefined();
});

test("index expression with #", () => {
	let result = parser.parse("expression", "item #1 of myList");
	expect(result.toSource()).toBe("myList[0]");
});

test("negative index expression with #", () => {
	let result = parser.parse("expression", "item #-1 of myList");
	expect(result.toSource()).toBe("spell.getItem(myList, -1)");
});

test("index expression without #", () => {
	let result = parser.parse("expression", "item 1 of myList");
	expect(result.toSource()).toBe("myList[0]");
});

test("negative index expression without #", () => {
	let result = parser.parse("expression", "item -11 of myList");
	expect(result.toSource()).toBe("spell.getItem(myList, -11)");
});

test("index expression with custom identifier", () => {
	let result = parser.parse("expression", "word -11 of myList");
	expect(result.toSource()).toBe("spell.getItem(myList, -11)");
});

test("ordinal index expression", () => {
	let result = parser.parse("expression", "the first item of myList");
	expect(result.toSource()).toBe("myList[0]");
});

test("ordinal index expression with custom identifier", () => {
	let result = parser.parse("expression", "the second word of myList");
	expect(result.toSource()).toBe("myList[1]");
});

