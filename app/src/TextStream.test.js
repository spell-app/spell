import TextStream from "./TextStream.js";

//
//	Creation
//
test("creates text stream with empty input string", () => {
	let stream = new TextStream();
	expect(stream.text).toBe("");
	expect(stream.startIndex).toBe(0);
	expect(stream.length).toBe(0);
	expect(stream.isEmpty).toBe(true);
});

test("creates text stream with input string", () => {
	let stream = new TextStream("test");
	expect(stream.startIndex).toBe(0);
	expect(stream.length).toBe(4);
	expect(stream.isEmpty).toBe(false);
});

test("creates text stream with properties", () => {
	let stream = new TextStream({ text: "test" });
	expect(stream.text).toBe("test");
	expect(stream.startIndex).toBe(0);
	expect(stream.length).toBe(4);
	expect(stream.isEmpty).toBe(false);
});


//
//	Cloning
//
test("clones with no properties", () => {
	let stream = new TextStream("test");
	let clone = stream.clone();
	expect(clone.text).toBe(stream.text);
	expect(clone.startIndex).toBe(stream.startIndex);
});

test("clones with no properties", () => {
	let stream = new TextStream("test");
	let clone = stream.clone({ endIndex: 4 });
	expect(clone.text).toBe(stream.text);
	expect(clone.startIndex).toBe(stream.startIndex);
	expect(clone.endIndex).toBe(4);
});


//
//	Advance
//
test("advances to", () => {
	let stream = new TextStream("test");
	expect(stream.startIndex).toBe(0);
	let clone = stream.advanceTo(4);
	expect(clone.text).toBe(stream.text);
	expect(clone.startIndex).toBe(4);
});

test("advances by", () => {
	let stream = new TextStream("test");
	expect(stream.startIndex).toBe(0);
	let clone = stream.advanceBy(2);
	expect(clone.text).toBe(stream.text);
	expect(clone.startIndex).toBe(2);
});



//
//	Matching
//
test("match throws if no regex argument", () => {
	let stream = new TextStream("test");
	expect(() => stream.match("test"))
		.toThrow(TypeError);
});

test("match works with valid regex", () => {
	let stream = new TextStream("test");
	let match = stream.match(/test/);
	expect(match).toBeInstanceOf(Array);
	expect(match[0]).toBe("test");
});

test("match fails with invalid regex", () => {
	let stream = new TextStream("test");
	let match = stream.match(/BLORG/);
	expect(match).toBe(undefined);
});

test("startsWith works with valid string", () => {
	let stream = new TextStream("test").advanceBy(2);
	let matched = stream.startsWith("st");
	expect(matched).toBe(true);
});

test("startsWith fails with invalid string", () => {
	let stream = new TextStream("test").advanceBy(2);
	let matched = stream.startsWith("ST");
	expect(matched).toBe(false);
});



//
//	Reflection
//
test("head", () => {
	let stream = new TextStream("test");
	expect(stream.head).toBe("test");
	expect(stream.advanceBy(2).head).toBe("st");
});

test("range with no parameters", () => {
	let stream = new TextStream("test");
	expect(stream.range()).toBe("test");
});

test("range with startIndex", () => {
	let stream = new TextStream("test");
	expect(stream.range(1)).toBe("est");
});

test("range with startIndex and endIndex", () => {
	let stream = new TextStream("test");
	expect(stream.range(1, 3)).toBe("es");
});

test("length", () => {
	let stream = new TextStream("test");
	expect(stream.length).toBe(4);
});

test("isEmpty", () => {
	let stream = new TextStream("test");
	expect(stream.isEmpty).toBe(false);
});

test("toString", () => {
	let stream = new TextStream("test");
	expect(stream.toString()).toBe("test");
});
