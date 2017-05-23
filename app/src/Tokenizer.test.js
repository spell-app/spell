import Tokenizer from "./Tokenizer.js";


//
// matchSymbol()
//
test("matchSymbol():  Doesn't match empty string.", () => {
	let result = Tokenizer.matchSymbol("");
	expect(result).toEqual(undefined);
});

test("matchSymbol():  Match a single character.", () => {
	let result = Tokenizer.matchSymbol(":");
	expect(result).toEqual([":", 1]);
});

test("matchSymbol():  Doesn't match if start beyond the end", () => {
	let result = Tokenizer.matchSymbol(":", 2);
	expect(result).toEqual(undefined);
});

test("matchSymbol():  Doesn't match if start === end", () => {
	let result = Tokenizer.matchSymbol(":", 2, 2);
	expect(result).toEqual(undefined);
});

test("matchSymbol():  Doesn't match if start is out of range", () => {
	let result = Tokenizer.matchSymbol(":", 100);
	expect(result).toEqual(undefined);
});

test("matchSymbol():  Doesn't match if start is > end", () => {
	let result = Tokenizer.matchSymbol(":::", 2, 1);
	expect(result).toEqual(undefined);
});

test("matchSymbol():  Doesn't barf if end is out of range", () => {
	let result = Tokenizer.matchSymbol(":", 0, 100);
	expect(result).toEqual([":", 1]);
});


//
// eatWhitespace()
//
test("eatWhitespace():  Doesn't match empty string", () => {
	let result = Tokenizer.eatWhitespace("", 0);
	expect(result).toEqual(0);
});

test("eatWhitespace():  Returns same position if not whitespace", () => {
	let result = Tokenizer.eatWhitespace("x", 0);
	expect(result).toEqual(0);
});

test("eatWhitespace():  Spaces are eaten", () => {
	let result = Tokenizer.eatWhitespace("   x", 0);
	expect(result).toEqual(3);
});

test("eatWhitespace():  Tabs are eaten", () => {
	let result = Tokenizer.eatWhitespace("\t\t\tx", 0);
	expect(result).toEqual(3);
});

test("eatWhitespace():  Mixed tabs and spaces are eaten", () => {
	let result = Tokenizer.eatWhitespace("\t \tx", 0);
	expect(result).toEqual(3);
});

test("eatWhitespace():  End of string is not a problem", () => {
	let result = Tokenizer.eatWhitespace("\t \t", 0);
	expect(result).toEqual(3);
});

test("eatWhitespace():  Should NOT eat newline", () => {
	let result = Tokenizer.eatWhitespace("  \n x", 0);
	expect(result).toEqual(2);
});

test("eatWhitespace():  Make sure it works in the middle of the string", () => {
	let result = Tokenizer.eatWhitespace("  \n x", 3);
	expect(result).toEqual(4);
});

test("eatWhitespace():  Make sure it doesn't go beyond specified end", () => {
	let result = Tokenizer.eatWhitespace("       ", 3, 4);
	expect(result).toEqual(4);
});

test("eatWhitespace():  Returns actual end if end is out of range", () => {
	let result = Tokenizer.eatWhitespace("   ", 100);
	expect(result).toEqual(3);
});

test("eatWhitespace():  Returns end if start > end", () => {
	let result = Tokenizer.eatWhitespace("   ", 2, 1);
	expect(result).toEqual(1);
});

test("eatWhitespace():  Works properly if end is out of range", () => {
	let result = Tokenizer.eatWhitespace("   ", 0, 100);
	expect(result).toEqual(3);
});


//
// matchWhitespace()
//
test("matchWhitespace():  Returns undefined for empty string", () => {
	let result = Tokenizer.matchWhitespace("");
	expect(result).toEqual(undefined);
});

test("matchWhitespace():  If no match, returns undefined", () => {
	let result = Tokenizer.matchWhitespace("x");
	expect(result).toEqual(undefined);
});

test("matchWhitespace():  Spaces are fine", () => {
	let result = Tokenizer.matchWhitespace("   x");
	expect(result).toEqual([undefined, 3]);
});

test("matchWhitespace():  Tabs are fine", () => {
	let result = Tokenizer.matchWhitespace("\t\t\tx");
	expect(result).toEqual([undefined, 3]);
});

test("matchWhitespace():  Mixed spaces and tabs are fine", () => {
	let result = Tokenizer.matchWhitespace("\t \tx");
	expect(result).toEqual([undefined, 3]);
});

test("matchWhitespace():  Should NOT match newline", () => {
	let result = Tokenizer.matchWhitespace("\n");
	expect(result).toEqual(undefined);
});

test("matchWhitespace():  Make sure it works in the middle of the string", () => {
	let result = Tokenizer.matchWhitespace("  \n x", 3);
	expect(result).toEqual([undefined, 4]);
});

test("matchWhitespace():  Make sure it doesn't go beyond the end", () => {
	let result = Tokenizer.matchWhitespace("       ", 3, 4);
	expect(result).toEqual([undefined, 4]);
});

test("eatWhitespace():  Doesn't match if start > end", () => {
	let result = Tokenizer.matchWhitespace("   ", 2, 1);
	expect(result).toEqual(undefined);
});

test("matchWhitespace():  Doesn't match if start is out of range", () => {
	let result = Tokenizer.matchWhitespace("   ", 100);
	expect(result).toEqual(undefined);
});

test("matchWhitespace():  Matches if end is out of range", () => {
	let result = Tokenizer.matchWhitespace("   ", 0, 100);
	expect(result).toEqual([undefined, 3]);
});




//
// matchNewline()
//
test("matchNewline():  Returns undefined for empty string", () => {
	let result = Tokenizer.matchNewline("");
	expect(result).toEqual(undefined);
});

test("matchNewline():  If no match, returns undefined", () => {
	let result = Tokenizer.matchNewline("x");
	expect(result).toEqual(undefined);
});

test("matchNewline():  Matches at beginning of string", () => {
	let result = Tokenizer.matchNewline("\nx");
	expect(result).toEqual([Tokenizer.NEWLINE, 1]);
});

test("matchNewline():  Should NOT match spaces", () => {
	let result = Tokenizer.matchNewline(" ");
	expect(result).toEqual(undefined);
});

test("matchNewline():  Should NOT match tabs", () => {
	let result = Tokenizer.matchNewline("\t");
	expect(result).toEqual(undefined);
});

test("matchNewline():  Make sure it matches in the middle of the string", () => {
	let result = Tokenizer.matchNewline("  \n x", 2);
	expect(result).toEqual([Tokenizer.NEWLINE, 3]);
});

test("matchNewline():  Make sure it doesn't match incorrectly in the middle of the string", () => {
	let result = Tokenizer.matchNewline("  \n x", 3);
	expect(result).toEqual(undefined);
});

test("matchNewline():  Make sure it doesn't go beyond the end", () => {
	let result = Tokenizer.matchNewline("  \n x", 3, 4);
	expect(result).toEqual(undefined);
});

test("matchNewline():  Doesn't match if start > end", () => {
	let result = Tokenizer.matchNewline("\n\n\n", 2, 1);
	expect(result).toEqual(undefined);
});

test("matchNewline():  Doesn't match if start is out of range", () => {
	let result = Tokenizer.matchNewline("\n", 100);
	expect(result).toEqual(undefined);
});

test("matchNewline():  Matches if end is out of range", () => {
	let result = Tokenizer.matchNewline("\n", 0, 100);
	expect(result).toEqual([Tokenizer.NEWLINE, 1]);
});


//
// matchIndent()
//
test("matchIndent():  Returns undefined for empty string", () => {
	let result = Tokenizer.matchIndent("");
	expect(result).toEqual(undefined);
});

test("matchIndent():  If no match, returns undefined", () => {
	let result = Tokenizer.matchIndent("x");
	expect(result).toEqual(undefined);
});

test("matchIndent():  Matches single indent at beginning of string", () => {
	let result = Tokenizer.matchIndent("\tx");
	expect(result[0]).toBeInstanceOf(Tokenizer.Indent);
	expect(result[0].level).toBe(1);
	expect(result[1]).toBe(1);
});

test("matchIndent():  Matches multiple indents at beginning of string", () => {
	let result = Tokenizer.matchIndent("\t\t\tx");
	expect(result[0]).toBeInstanceOf(Tokenizer.Indent);
	expect(result[0].level).toBe(3);
	expect(result[1]).toBe(3);
});

test("matchIndent():  Should NOT match spaces", () => {
	let result = Tokenizer.matchIndent(" ");
	expect(result).toEqual(undefined);
});

test("matchIndent():  Should NOT match newline", () => {
	let result = Tokenizer.matchIndent("\n");
	expect(result).toEqual(undefined);
});

test("matchIndent():  Make sure it matches correctly in the middle of the string", () => {
	let result = Tokenizer.matchIndent("xx\t\t\t x", 2);
	expect(result[0]).toBeInstanceOf(Tokenizer.Indent);
	expect(result[0].level).toBe(3);
	expect(result[1]).toBe(5);
});

test("matchIndent():  Make sure it doesn't match incorrectly in the middle of the string", () => {
	let result = Tokenizer.matchIndent("xx\txx", 3);
	expect(result).toEqual(undefined);
});

test("matchIndent():  Make sure it doesn't go beyond the specified end", () => {
	let result = Tokenizer.matchIndent("xx\t\t\txx", 2, 3);
	expect(result[0]).toBeInstanceOf(Tokenizer.Indent);
	expect(result[0].level).toBe(1);
	expect(result[1]).toEqual(3);
});


test("matchIndent():  Doesn't match if start > end", () => {
	let result = Tokenizer.matchIndent("\t\t\t", 2, 1);
	expect(result).toEqual(undefined);
});

test("matchIndent():  Doesn't match if start is out of range", () => {
	let result = Tokenizer.matchIndent("\t", 100);
	expect(result).toEqual(undefined);
});

test("matchIndent():  Matches if end is out of range", () => {
	let result = Tokenizer.matchIndent("\t", 0, 100);
	expect(result[0]).toBeInstanceOf(Tokenizer.Indent);
	expect(result[0].level).toBe(1);
	expect(result[1]).toBe(1);
});



//
// matchNewlineAndIndent()
//
test("matchNewlineAndIndent():  Returns undefined for empty string", () => {
	let result = Tokenizer.matchNewlineAndIndent("");
	expect(result).toEqual(undefined);
});

test("matchNewlineAndIndent():  If no match, returns undefined", () => {
	let result = Tokenizer.matchNewlineAndIndent("x");
	expect(result).toEqual(undefined);
});

test("matchNewlineAndIndent():  Matches single newline only at beginning of string", () => {
	let result = Tokenizer.matchNewlineAndIndent("\nx");
	expect(result).toEqual([Tokenizer.NEWLINE, 1]);
});

test("matchNewlineAndIndent():  Matches single newline if multiple newlines at at beginning of string", () => {
	let result = Tokenizer.matchNewlineAndIndent("\n\n\nx");
	expect(result).toEqual([Tokenizer.NEWLINE, 1]);
});

test("matchNewlineAndIndent():  Matches newline and single tab at beginning of string", () => {
	let result = Tokenizer.matchNewlineAndIndent("\n\t");
	expect(result[0][0]).toEqual(Tokenizer.NEWLINE);
	expect(result[0][1]).toBeInstanceOf(Tokenizer.Indent);
	expect(result[0][1].level).toBe(1);
	expect(result[1]).toEqual(2);
});

test("matchNewlineAndIndent():  Matches newline and multiple tab at beginning of string", () => {
	let result = Tokenizer.matchNewlineAndIndent("\n\t\t\t");
	expect(result[0][0]).toEqual(Tokenizer.NEWLINE);
	expect(result[0][1]).toBeInstanceOf(Tokenizer.Indent);
	expect(result[0][1].level).toBe(3);
	expect(result[1]).toEqual(4);
});

test("matchNewlineAndIndent():  Should NOT tab w/o preceding newline", () => {
	let result = Tokenizer.matchNewlineAndIndent("\t");
	expect(result).toEqual(undefined);
});

test("matchNewlineAndIndent():  Make sure it matches correctly in the middle of the string", () => {
	let result = Tokenizer.matchNewlineAndIndent("xx\n\t\txx", 2);
	expect(result[0][0]).toEqual(Tokenizer.NEWLINE);
	expect(result[0][1]).toBeInstanceOf(Tokenizer.Indent);
	expect(result[0][1].level).toBe(2);
	expect(result[1]).toEqual(5);
});

test("matchNewlineAndIndent():  Make sure it doesn't match incorrectly in the middle of the string", () => {
	let result = Tokenizer.matchNewlineAndIndent("xx\n\t\txx", 3);
	expect(result).toEqual(undefined);
});

test("matchNewlineAndIndent():  Make sure it doesn't go beyond the specified end", () => {
	let result = Tokenizer.matchNewlineAndIndent("xx\n\t\txx", 2, 3);
	expect(result[0]).toEqual(Tokenizer.NEWLINE);
	expect(result[1]).toEqual(3);

	result = Tokenizer.matchNewlineAndIndent("xx\n\t\txx", 2, 4);
	expect(result[0][0]).toEqual(Tokenizer.NEWLINE);
	expect(result[0][1]).toBeInstanceOf(Tokenizer.Indent);
	expect(result[0][1].level).toBe(1);
	expect(result[1]).toEqual(4);
});

test("matchIndent():  Doesn't match if start > end", () => {
	let result = Tokenizer.matchNewlineAndIndent("\n\t\t", 2, 1);
	expect(result).toEqual(undefined);
});

test("matchNewlineAndIndent():  Doesn't match if start is out of range", () => {
	let result = Tokenizer.matchNewlineAndIndent("\n\t", 100);
	expect(result).toEqual(undefined);
});

test("matchNewlineAndIndent():  Matches if end is out of range", () => {
	let result = Tokenizer.matchNewlineAndIndent("\n\t", 0, 100);
	expect(result[0][0]).toEqual(Tokenizer.NEWLINE);
	expect(result[0][1]).toBeInstanceOf(Tokenizer.Indent);
	expect(result[0][1].level).toBe(1);
	expect(result[1]).toEqual(2);
});

test("matchNewlineAndIndent():  Doesn't barf if start and end are both out of range", () => {
	let result = Tokenizer.matchNewlineAndIndent("\n\t", 99, 100);
	expect(result).toEqual(undefined);
});
