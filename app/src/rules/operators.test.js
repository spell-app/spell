import Rule from "../RuleSyntax";
import parser from "./operators.js";

test("parser is defined", () => {
	expect(parser).toBeDefined();
});

console.warn(parser.parse);

//
//##	Infix operators
//
test("is operator", () => {
	let result = parser.parse("infix-operator-expression", "a is 1");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(a == 1)");
});

test("is not operator", () => {
	let result = parser.parse("infix-operator-expression", "a is not 1");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(a != 1)");
});

test("is exactly operator", () => {
	let result = parser.parse("infix-operator-expression", "a is exactly 1");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(a === 1)");
});

test("is not exactly operator", () => {
	let result = parser.parse("infix-operator-expression", "a is not exactly 1");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(a !== 1)");
});

test("is a operator", () => {
	let result = parser.parse("infix-operator-expression", "a is a string");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("spell.isOfType(a, 'string')");
});

test("is an operator", () => {
	let result = parser.parse("infix-operator-expression", "a is an element");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("spell.isOfType(a, 'element')");
});

test("is not a operator", () => {
	let result = parser.parse("infix-operator-expression", "a is not a string");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("!spell.isOfType(a, 'string')");
});

test("is not an operator", () => {
	let result = parser.parse("infix-operator-expression", "a is not an element");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("!spell.isOfType(a, 'element')");
});


test("is in operator", () => {
	let result = parser.parse("infix-operator-expression", "a is in myList");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("spell.isIn(a, myList)");
});

test("is one of operator", () => {
	let result = parser.parse("infix-operator-expression", "a is one of myList");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("spell.isIn(a, myList)");
});

test("is not in operator", () => {
	let result = parser.parse("infix-operator-expression", "a is not in myList");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("!spell.isIn(a, myList)");
});

test("is not one of operator", () => {
	let result = parser.parse("infix-operator-expression", "a is not one of myList");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("!spell.isIn(a, myList)");
});

test("> operator", () => {
	let result = parser.parse("infix-operator-expression", "a > b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(a > b)");
});

test("is greater than operator", () => {
	let result = parser.parse("infix-operator-expression", "a is greater than b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(a > b)");
});


test(">= operator", () => {
	let result = parser.parse("infix-operator-expression", "a >= b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(a >= b)");
});

test("is greater than or equal to operator", () => {
	let result = parser.parse("infix-operator-expression", "a is greater than or equal to b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(a >= b)");
});


test("< operator", () => {
	let result = parser.parse("infix-operator-expression", "a < b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(a < b)");
});

test("is less than operator", () => {
	let result = parser.parse("infix-operator-expression", "a is less than b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(a < b)");
});


test("<= operator", () => {
	let result = parser.parse("infix-operator-expression", "a <= b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(a <= b)");
});

test("is less than or equal to operator", () => {
	let result = parser.parse("infix-operator-expression", "a is less than or equal to b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(a <= b)");
});



//
//## Postfix operators
//
test("is defined operator", () => {
	let result = parser.parse("postfix-operator-expression", "a is defined");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(typeof a !== 'undefined')");
});

test("is not defined operator", () => {
	let result = parser.parse("postfix-operator-expression", "a is not defined");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(typeof a === 'undefined')");
});

test("is undefined operator", () => {
	let result = parser.parse("postfix-operator-expression", "a is undefined");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(typeof a === 'undefined')");
});

test("is empty operator", () => {
	let result = parser.parse("postfix-operator-expression", "a is empty");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("spell.isEmpty(a)");
});

test("is not empty operator", () => {
	let result = parser.parse("postfix-operator-expression", "a is not empty");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("!spell.isEmpty(a)");
});
