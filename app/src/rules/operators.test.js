import Rule from "../RuleSyntax";
import parser from "./operators.js";

test("parser is defined", () => {
	expect(parser).toBeDefined();
});

//
//##	Infix operators
//
test("infix operators require a transformer function", () => {
	expect(() => {
		parser.addInfixOperator("foo", "foo");
	}).toThrow(TypeError);
});

test("is operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is 1");
//	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(avar == 1)");
});

test("is not operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is not 1");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(avar != 1)");
});

test("is exactly operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is exactly 1");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(avar === 1)");
});

test("is not exactly operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is not exactly 1");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(avar !== 1)");
});

test("is a operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is a string");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("spell.isOfType(avar, 'string')");
});

test("is an operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is an element");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("spell.isOfType(avar, 'element')");
});

test("is not a operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is not a string");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("!spell.isOfType(avar, 'string')");
});

test("is not an operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is not an element");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("!spell.isOfType(avar, 'element')");
});


test("is in operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is in myList");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("spell.contains(myList, avar)");
});

test("is one of operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is one of myList");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("spell.contains(myList, avar)");
});

test("is not in operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is not in myList");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("!spell.contains(myList, avar)");
});

test("is not one of operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is not one of myList");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("!spell.contains(myList, avar)");
});

test("> operator", () => {
	let result = parser.parse("infix_operator_expression", "avar > b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(avar > b)");
});

test("is greater than operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is greater than b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(avar > b)");
});


test(">= operator", () => {
	let result = parser.parse("infix_operator_expression", "avar >= b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(avar >= b)");
});

test("is greater than or equal to operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is greater than or equal to b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(avar >= b)");
});


test("< operator", () => {
	let result = parser.parse("infix_operator_expression", "avar < b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(avar < b)");
});

test("is less than operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is less than b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(avar < b)");
});


test("<= operator", () => {
	let result = parser.parse("infix_operator_expression", "avar <= b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(avar <= b)");
});

test("is less than or equal to operator", () => {
	let result = parser.parse("infix_operator_expression", "avar is less than or equal to b");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(avar <= b)");
});



//
//## Postfix operators
//
test("postfix operators require a transformer function", () => {
	expect(() => {
		parser.addPostfixOperator("foo", "foo");
	}).toThrow(TypeError);
});

test("is defined operator", () => {
	let result = parser.parse("postfix_operator_expression", "avar is defined");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(typeof avar !== 'undefined')");
});

test("is not defined operator", () => {
	let result = parser.parse("postfix_operator_expression", "avar is not defined");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(typeof avar === 'undefined')");
});

test("is undefined operator", () => {
	let result = parser.parse("postfix_operator_expression", "avar is undefined");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("(typeof avar === 'undefined')");
});

test("is empty operator", () => {
	let result = parser.parse("postfix_operator_expression", "avar is empty");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("spell.isEmpty(avar)");
});

test("is not empty operator", () => {
	let result = parser.parse("postfix_operator_expression", "avar is not empty");
	expect(result).toBeInstanceOf(Rule.Sequence);
	expect(result.toSource()).toBe("!spell.isEmpty(avar)");
});
