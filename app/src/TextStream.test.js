import TextStream from "./TextStream.js";

test("creates text stream with input string", () => {
	let it = new TextStream("test");
	expect(it.constructor).toBe(TextStream);
});
