import React from "react";
import { Button, Dropdown, Grid, Menu, Segment, TextArea } from 'semantic-ui-react'
import Spacer from "./Spacer.jsx";

import "./styles.less";






export default class SpellEditor extends React.Component {
	constructor() {
		super();
//DEBUG
window.spellEditor = this;
		this.state = this.loadExamples();
		this.compileExampleSoon();
	}

	// Get examples from localStorage.
	loadExamples = () => {
		let examples = JSON.parse(localStorage.spellEditorExamples || '{"Foo":"define type foo", "Bar":"define type bar"}');
		let example = (this.state && this.state.example) || localStorage.spellEditorExample;
		if (!example || !examples[example]) example = Object.keys(examples)[0];
		// make local copy of code so we can modify w/o explicitly saving.
		let code = examples[example];
		return { examples, example, code, output: "...compiling..." };
	}

	// Rename the current example.
	// Saves automatically.
	renameExample = () => {
		let example = this.state.example;
		let newName = prompt("New name for this example?", example);
		if (!newName || newName === example) return;

		let { examples } = this.state;
		examples[newName] = examples[example];
		delete examples[example];

		this.saveExamples(examples, newName);
		this.setState({ examples, example: newName });
	}

	// Duplicate the current example with a new name.
	duplicateExample = () => {
		let { examples, example } = this.state;
		let newName = prompt("Name for duplicate example?", example);
		if (newName === example) return;
		examples[newName] = examples[example];
		this.saveExamples(examples, example);
		this.setState({ examples, example: newName });
	}

	onDeleteExample = () => this.deleteExample();
	deleteExample = (example = this.state.example) => {
		let { examples } = this.state;
		delete examples[example];
		example = Object.keys(examples)[0];
		this.saveExamples(examples, example);
		this.setState({ examples, example, code: examples[example], output: undefined });
	}


	// Save examples to localStorage.
	onSaveExamples = () => this.saveExamples();
	saveExamples = (examples = this.state.examples, example = this.state.example) => {
		localStorage.spellEditorExamples = JSON.stringify(examples);
		localStorage.spellEditorExample = example;
	}

	// Reload examples from localStorage.
	reloadExamples = () => {
		this.setState(this.loadExamples());
	}

	// Select an example to show.
	selectExample = (example) => {
		localStorage.spellEditorExample = example;
		let { examples } = this.state;
		this.setState({ example, output: "...compiling..." });
		this.compileExampleSoon();
	}

	// Compile the current example into the output.
	compileExample = () => {
		let { example, examples } = this.state;
		let output = parser.compile(examples[example]);
		this.setState({ output });
	}

	compileExampleSoon = () => {
		setTimeout(this.compileExample, 100);
	}


	// Input textarea changed.
	// Update `state.examples`.
	onInputChanged = (event) => {
		let examples = Object.assign({}, this.state.examples);
		// update the in-memory value of `Examples`
		let example = this.state.example;
		let value = event.target.value;
		examples[example] = value;

		this.setState({ examples });
	}


	render() {
		let props = this.props;
		let { examples, example, output } = this.state;
		let code = examples[example];

		// Create menuitems from the examples
		let options = Object.keys(examples).map( title =>
			({
				value: title,
				title: title,
				text: title,
				content: title,
				onClick: ()=>this.selectExample(title)
			}));

		return (
		<Grid columns={3} stretched padded className="fullSize">
			<Grid.Row style={{ height: "2rem", paddingTop: "0rem" }}>
				<Menu inverted attached fluid>
					<Spacer medium/>
					<Menu.Item>Example:</Menu.Item>
					<Dropdown item selection options={options} value={example}/>
					<Menu.Item onClick={this.renameExample}>Rename</Menu.Item>
					<Menu.Item onClick={this.onDeleteExample}>Delete</Menu.Item>
					<Spacer fluid/>
					<Menu.Item onClick={this.onSaveExamples}>Save</Menu.Item>
					<Menu.Item onClick={this.reloadExamples}>Reload</Menu.Item>
					<Spacer fluid/>
					<Menu.Item onClick={this.duplicateExample}>Duplicate</Menu.Item>
					<Menu.Item>New</Menu.Item>
					<Spacer medium/>
				</Menu>
			</Grid.Row>
			<Grid.Row style={{ height: "calc(100% - 3rem)" }}>
				<Grid.Column width={7}>
					<TextArea className="ui segment" value={code} onChange={this.onInputChanged}/>
				</Grid.Column>
				<Grid.Column width={1} verticalAlign="middle">
				<Button icon="chevron right" onClick={this.compileExample}/>
				</Grid.Column>
				<Grid.Column width={8}>
					<TextArea className="ui segment" value={output}/>
				</Grid.Column>
			</Grid.Row>
		</Grid>
	);}
}
