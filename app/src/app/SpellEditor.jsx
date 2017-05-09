import React from "react";
import mobx, { observable, computed } from "mobx";
import { observer } from "mobx-react";
import { Button, Dropdown, Grid, Menu, Segment, TextArea } from 'semantic-ui-react'

import Spacer from "./Spacer.jsx";
import "./styles.less";


class ExampleStore {
	@observable examples = {};
	@observable selected = "";
	@observable output = "";

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

	//

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

		// Load selected example name
		this.select(localStorage.spellEditorExample);
	}

	// Save current examples & selection.
	save() {
		localStorage.spellEditorExamples = JSON.stringify(this.examples);
	}

	// Select a different example.
	select(example) {
		if (!example || this.examples[example] == null) example = Object.keys(this.examples)[0] || "";
		this.selected = localStorage.spellEditorExample = example;
		this.output = "";
	}

	// Compile the current example, placing it in our `output`.
	compile() {
		this.output = "...compiling...";
		setTimeout(() => {
			this.output = parser.compile(this.code);
		}, 100);
	}

	// Create a new example.
	// Saves and selects the example automatically.
	update(name, code, skipSave) {
		this.examples = Object.assign({}, this.examples, { [ name ]: code });
		this.select(name);
		this.output = "";
		if (!skipSave) this.save();
	}

	// Delete an example.
	// Saves and selects another example automatically.
	delete(name = this.selected) {
		let examples = Object.assign({}, this.examples);
		delete examples[name];
		this.examples = examples;
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
}


@observer
export default class SpellEditor extends React.Component {
	static defaultProps = {
		examples: new ExampleStore()
	};

	constructor(props) {
		super(props);
//DEBUG
window.spellEditor = this;
		this.props.examples.load();
	}

	// Do NOT exit on tab -- insert or remove tab(s) value instead.
	onInputKeyDown = (event) => {
		// Forget it if not a tab
		if (event.keyCode !== 9) return;

		// prevent default so we don't exit the field
		event.preventDefault();

		// figure out the text range
		var element = event.target;
		var text = element.value;
		var start = element.selectionStart;
		var end = element.selectionEnd;

		// Replacement text
		let newText = "", selectionStart = start, selectionEnd = end;

		// If selection is empty,
		if (start === end && !event.shiftKey) {
			newText = "\t";
			selectionStart = selectionEnd = end + 1;
		}
		// otherwise indent/de-indent all of the lines
		else {
		// use start and end of line(s)
//console.info(`start: ${start} :${text[start]}:   end: ${end} : ${text[end]}:`);
			if (text[start] !== "\n") start = text.lastIndexOf("\n", start) + 1;
			if (text[end-1] === "\n") end--;
			else if (text[end+1] !== "\n") end = text.indexOf("\n", end) - 1;
//console.info(`start: ${start} :${text[start]}:   end: ${end} : ${text[end]}:`);

			let lines = text.slice(start, end).split("\n");
			// if shift key is down, REMOVE a tab from each line
			if (event.shiftKey) {
				lines = lines.map(line => line[0] === "\t" ? line.substr(1) : line);
			}
			// otherwise ADD a tab to each line
			else {
				lines = lines.map(line => "\t" + line);
			}
			selectionStart = start;
			newText = lines.join("\n");
			selectionEnd = selectionStart + newText.length + 1;
		}

		// Update input value.
		element.value 	= text.substr(0, start)
						+ newText
						+ text.substr(end);

		// Update the selection
		element.selectionStart = selectionStart;
		element.selectionEnd = selectionEnd;

		let { examples } = this.props;
		examples.update(examples.selected, element.value, "SKIP_SAVE");
	}

	// On change of the input field,
	//	update the current example but do NOT auto-save.
	onInputChange = (event) => {
		let { examples } = this.props;
		examples.update(examples.selected, event.target.value, "SKIP_SAVE");
	}

	render() {
		let { examples } = this.props;
		let { titles, selected, code, output } = examples;

		// Create menuitems from the examples
		let options = titles.map( title =>
			({
				value: title,
				title: title,
				text: title,
				content: title,
				onClick: () => examples.select(title)
			}));

		return (
		<Grid columns={3} stretched padded className="fullSize">
			<Grid.Row style={{ height: "2rem", paddingTop: "0rem" }}>
				<Menu inverted attached fluid>
					<Spacer medium/>
					<Menu.Item>Example:</Menu.Item>
					<Dropdown item selection options={options} value={selected}/>
					<Menu.Item onClick={() => examples.rename()}>Rename</Menu.Item>
					<Menu.Item onClick={() => examples.delete()}>Delete</Menu.Item>
					<Spacer fluid/>
					<Menu.Item onClick={() => examples.create()}>New</Menu.Item>
					<Menu.Item onClick={() => examples.duplicate()}>Duplicate</Menu.Item>
					<Menu.Item onClick={() => examples.save()}>Save</Menu.Item>
					<Spacer fluid/>
					<Menu.Item onClick={() => examples.load()}>Reload</Menu.Item>
					<Menu.Item onClick={() => examples.reset()}>Reset</Menu.Item>
					<Spacer medium/>
				</Menu>
			</Grid.Row>
			<Grid.Row style={{ height: "calc(100% - 3rem)" }}>
				<Grid.Column width={7}>
					<TextArea className="ui segment" value={code}
						onKeyDown={this.onInputKeyDown}
						onChange={this.onInputChange}
					/>
				</Grid.Column>
				<Grid.Column width={1} verticalAlign="middle">
				<Button icon="chevron right" onClick={() => examples.compile()}/>
				</Grid.Column>
				<Grid.Column width={8}>
					<TextArea className="ui segment" value={output}/>
				</Grid.Column>
			</Grid.Row>
		</Grid>
	);}
}
