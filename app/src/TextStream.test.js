import TextStream from "./TextStream.js";

test("creates text stream with empty input string", () => {
	let it = new TextStream();
	expect(it.length).toBe(0);
});

test("creates text stream with input string", () => {
	let it = new TextStream("test");
	expect(it.length).toBe(4);
});
