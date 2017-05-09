/* Store of example spell code fragments. */
import mobx, { observable, computed } from "mobx";

export default class ExampleStore {
	@observable examples = {};
	@observable selected = "";
	@observable output = "";
	@observable dirty = false;

	constructor() {
//DEBUG
window.examples = this;
	}

	// Return just the titles of the examples.
	@computed get titles() {
		return Object.keys(this.examples);
	}

	// Return the code for the current example
	@computed get code() {
		return this.examples[this.selected];
	}

	// Reset all examples from localStorage.
	reset() {
		delete localStorage.spellEditorExamples;
		delete localStorage.spellEditorExample;
		window.location.reload();
	}

	// Load examples
	load() {
		// Load examples from localStorage
		this.examples = JSON.parse(localStorage.spellEditorExamples
			|| '{"Foo":"define type Foo", "Bar":"define type Bar"}');

		// Save a copy of examples for revert
		this._savedExamples = {...this.examples};

		// Load selected example name
		this.select(localStorage.spellEditorExample);
		this.dirty = false;
	}

	// Save current examples & selection.
	save() {
		localStorage.spellEditorExamples = JSON.stringify(this.examples);
		this.dirty = false;

		// Save a copy of examples for revert
		this._savedExamples = {...this.examples};
	}

	// Revert the current example
	revert(example = this.selected) {
		this.update(example, this._savedExamples[example]);
	}

	// Select a different example.
	select(example) {
		if (!example || this.examples[example] == null) example = Object.keys(this.examples)[0] || "";
		this.selected = localStorage.spellEditorExample = example;
		this._selectedWas = this.code;
		this.output = "";
	}

	// Create a new example.
	// Saves and selects the example automatically.
	update(name, code, skipSave) {
		this.examples = Object.assign({}, this.examples, { [ name ]: code });
		this.select(name);
		this.output = "";
		if (!skipSave) this.save();
		else this.dirty = true;
	}

	// Delete an example.
	// Saves and selects another example automatically.
	delete(name = this.selected) {
		let examples = Object.assign({}, this.examples);
		delete examples[name];
		this.examples = examples;
		this.save();
		this.select();
	}

	// Create a new example.
	create(name, code = "") {
		// If no name, prompt.
		if (!name) name = prompt("Name for this example?");
		// Forget it if no name.
		if (!name) return;

		this.update(name, code);
	}

	// Rename an example.
	// Selects and saves automatically.
	rename(oldName = this.selected, newName) {
		// If no new name, prompt.
		if (!newName) newName = prompt("New name for this example?", oldName);

		// Forget it if no name supplied or name is the same
		if (!newName || newName === oldName) return;
		if (this.examples[newName]) return console.warn(`examples.rename("${newName}"): name already in use`);

		let code = this.examples[oldName];
		this.delete(oldName);
		this.update(newName, code);
	}

	// Duplicate an example.
	duplicate(oldName = this.selected, newName) {
		// If no new name, prompt.
		if (!newName) newName = prompt("New name for duplicate example?", oldName);
		// Forget it if no name supplied or name is the same
		if (!newName || newName === oldName) return;
		if (this.examples[newName]) return console.warn(`examples.rename("${newName}"): name already in use`);

		this.update(newName, this.code);
	}

	// Compile the current example, placing it in our `output`.
//TODO: some way to do this automatically w/ "output" ?
	compile() {
		this.output = "...compiling...";
		setTimeout(() => {
			this.output = parser.compile(this.code);
		}, 100);
	}

}
