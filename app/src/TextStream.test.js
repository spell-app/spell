import TextStream from "./TextStream.js";

// TODO: test with empty input stream

test("creates text stream with input string", () => {
	let it = new TextStream("test");
	expect(it.constructor).toBe(TextStream);
});
