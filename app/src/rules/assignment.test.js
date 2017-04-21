import Rule from "../RuleSyntax";
import parser from "./assignment.js";

test("parser is defined", () => {
	expect(parser).toBeDefined();
});

//
//	Assignment
//
test("assign number to identifier", () => {
	let result = parser.parse("assignment", "a = 1");
	expect(result).toBeInstanceOf(Rule.Statement);
	expect(result.toSource()).toBe("a = 1");

	expect(result.args.identifier).toBeInstanceOf(Rule.Pattern);
	expect(result.args.identifier.toSource()).toBe("a");

	expect(result.args.expression).toBeInstanceOf(Rule.Number);
	expect(result.args.expression.toSource()).toBe(1);
});

test("assign string to identifier", () => {
	let result = parser.parse("assignment", "a = 'a'");
	expect(result).toBeInstanceOf(Rule.Statement);
	expect(result.toSource()).toBe("a = 'a'");

	expect(result.args.expression).toBeInstanceOf(Rule.Text);
	expect(result.args.expression.toSource()).toBe("'a'");
});

test("assign boolean to identifier", () => {
	let result = parser.parse("assignment", "a = yes");
	expect(result).toBeInstanceOf(Rule.Statement);
	expect(result.toSource()).toBe("a = true");

	expect(result.args.expression).toBeInstanceOf(Rule.Boolean);
	expect(result.args.expression.toSource()).toBe(true);
});

test("assign list to identifier", () => {
	let result = parser.parse("assignment", "a = [1,2,yes,'a']");
	expect(result).toBeInstanceOf(Rule.Statement);
	expect(result.toSource()).toBe("a = [1, 2, true, 'a']");
});
