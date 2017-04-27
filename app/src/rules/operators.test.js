import Rule from "../RuleSyntax";
import parser from "./operators.js";

test("parser is defined", () => {
	expect(parser).toBeDefined();
});

//
//##	Infix operators
//

test("is operator", () => {
	let result = parser.parse("expression", "a is 1");
	expect(result.toSource()).toBe("(a == 1)");
});

test("is not operator", () => {
	let result = parser.parse("expression", "a is not 1");
	expect(result.toSource()).toBe("(a != 1)");
});

test("is exactly operator", () => {
	let result = parser.parse("expression", "a is exactly 1");
	expect(result.toSource()).toBe("(a === 1)");
});

test("is not exactly operator", () => {
	let result = parser.parse("expression", "a is not exactly 1");
	expect(result.toSource()).toBe("(a !== 1)");
});

test("is a operator", () => {
	let result = parser.parse("expression", "a is a string");
	expect(result.toSource()).toBe("spell.isOfType(a, 'string')");
});

test("is an operator", () => {
	let result = parser.parse("expression", "a is an element");
	expect(result.toSource()).toBe("spell.isOfType(a, 'element')");
});

test("is not a operator", () => {
	let result = parser.parse("expression", "a is not a string");
	expect(result.toSource()).toBe("!spell.isOfType(a, 'string')");
});

test("is not an operator", () => {
	let result = parser.parse("expression", "a is not an element");
	expect(result.toSource()).toBe("!spell.isOfType(a, 'element')");
});


test("is in operator", () => {
	let result = parser.parse("expression", "a is in myList");
	expect(result.toSource()).toBe("myList.includes(a)");
});

test("is one of operator", () => {
	let result = parser.parse("expression", "a is one of myList");
	expect(result.toSource()).toBe("myList.includes(a)");
});

test("is not in operator", () => {
	let result = parser.parse("expression", "a is not in myList");
	expect(result.toSource()).toBe("!myList.includes(a)");
});

test("is not one of operator", () => {
	let result = parser.parse("expression", "a is not one of myList");
	expect(result.toSource()).toBe("!myList.includes(a)");
});

test("includes", () => {
	let result = parser.parse("expression", "myList includes a");
	expect(result.toSource()).toBe("myList.includes(a)");
});

test("contains", () => {
	let result = parser.parse("expression", "myList contains a");
	expect(result.toSource()).toBe("myList.includes(a)");
});

test("does not contain", () => {
	let result = parser.parse("expression", "myList does not contain a");
	expect(result.toSource()).toBe("!myList.includes(a)");
});

test("does not include", () => {
	let result = parser.parse("expression", "myList does not include a");
	expect(result.toSource()).toBe("!myList.includes(a)");
});

test("includes", () => {
	let result = parser.parse("expression", "myList includes a");
	expect(result.toSource()).toBe("myList.includes(a)");
});


test("> operator", () => {
	let result = parser.parse("expression", "a > b");
	expect(result.toSource()).toBe("(a > b)");
});

test("is greater than operator", () => {
	let result = parser.parse("expression", "a is greater than b");
	expect(result.toSource()).toBe("(a > b)");
});


test(">= operator", () => {
	let result = parser.parse("expression", "a >= b");
	expect(result.toSource()).toBe("(a >= b)");
});

test("is greater than or equal to operator", () => {
	let result = parser.parse("expression", "a is greater than or equal to b");
	expect(result.toSource()).toBe("(a >= b)");
});


test("< operator", () => {
	let result = parser.parse("expression", "a < b");
	expect(result.toSource()).toBe("(a < b)");
});

test("is less than operator", () => {
	let result = parser.parse("expression", "a is less than b");
	expect(result.toSource()).toBe("(a < b)");
});


test("<= operator", () => {
	let result = parser.parse("expression", "a <= b");
	expect(result.toSource()).toBe("(a <= b)");
});

test("is less than or equal to operator", () => {
	let result = parser.parse("expression", "a is less than or equal to b");
	expect(result.toSource()).toBe("(a <= b)");
});


test("+ operator", () => {
	let result = parser.parse("expression", "a + b");
	expect(result.toSource()).toBe("a + b");
});

test("plus operator", () => {
	let result = parser.parse("expression", "a plus b");
	expect(result.toSource()).toBe("a + b");
});


test("- operator", () => {
	let result = parser.parse("expression", "a - b");
	expect(result.toSource()).toBe("a - b");
});

test("minus operator", () => {
	let result = parser.parse("expression", "a minus b");
	expect(result.toSource()).toBe("a - b");
});


test("* operator", () => {
	let result = parser.parse("expression", "a * b");
	expect(result.toSource()).toBe("a * b");
});

test("times operator", () => {
	let result = parser.parse("expression", "a times b");
	expect(result.toSource()).toBe("a * b");
});

test("/ operator", () => {
	let result = parser.parse("expression", "a / b");
	expect(result.toSource()).toBe("a / b");
});

test("divided_by operator", () => {
	let result = parser.parse("expression", "a divided by b");
	expect(result.toSource()).toBe("a / b");
});





//
//## Postfix operators
//
test("postfix operators require a toJS function", () => {
	expect(() => {
		parser.addPostfixOperator("foo", "foo");
	}).toThrow(TypeError);
});

test("is defined operator", () => {
	let result = parser.parse("expression", "a is defined");
	expect(result.toSource()).toBe("(typeof a !== 'undefined')");
});

test("is not defined operator", () => {
	let result = parser.parse("expression", "a is not defined");
	expect(result.toSource()).toBe("(typeof a === 'undefined')");
});

test("is undefined operator", () => {
	let result = parser.parse("expression", "a is undefined");
	expect(result.toSource()).toBe("(typeof a === 'undefined')");
});

test("is empty operator", () => {
	let result = parser.parse("expression", "a is empty");
	expect(result.toSource()).toBe("spell.isEmpty(a)");
});

test("is not empty operator", () => {
	let result = parser.parse("expression", "a is not empty");
	expect(result.toSource()).toBe("!spell.isEmpty(a)");
});
