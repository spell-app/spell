import { observer } from "mobx-react";
import React from "react";
import keydown from "react-keydown";
import { Button, Dropdown, Grid, Menu, Segment, TextArea } from 'semantic-ui-react'

import ExampleStore from "./ExampleStore";
import Spacer from "./Spacer.jsx";
import "./styles.less";
import TabbableTextArea from "./TabbableTextArea.jsx";

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

	@keydown("ctrl+s")
	save() { this.props.examples.save(); }

	@keydown("ctrl+r")
	revert() { this.props.examples.revert(); }

	@keydown("ctrl+c")
	compile() { this.props.examples.compile(); }

	@keydown("ctrl+n")
	create() { this.props.examples.create(); }

	@keydown("ctrl+d")
	delete() { this.props.examples.delete(undefined, "CONFIRM"); }

	// @keydown("")
	rename() { this.props.examples.rename(); }

	// @keydown("")
	duplicate() { this.props.examples.duplicate(); }

	render() {
		let { examples } = this.props;
		let { titles, selected, dirty, code, output } = examples;

		// Create menuitems from the examples
		let options = titles.map( title =>
			({
				value: title,
				title: title,
				text: title,
				content: title,
				onClick: () => examples.select(title)
			}));

		function dirtyButtons() {
			if (!dirty) return;
			return (
				<Menu secondary style={{ position: "absolute", right: "1rem", top: "3px", margin: 0 }}>
					<Button negative onClick={() => this.revert()}>Revert</Button>
					<Button positive onClick={() => this.save()}>Save</Button>
				</Menu>
			);
		}

		function compileButton() {
			if (output) return;
			return <Button
					style={{ position: "absolute",  width: "4em", left: "calc(50% - 2em)", top: "50%" }}
					onClick={() => this.compile()}
					icon="right chevron"/>;
		}

		return (
		<Grid stretched padded className="fullHeight">
			<Grid.Row style={{ height: "2rem", paddingTop: "0rem" }} className="ui inverted attached menu">
				<Grid.Column width={7}>
					<Menu inverted attached fluid>
						<Menu.Item>Example:</Menu.Item>
						<Dropdown item selection options={options} value={selected} style={{ width: "20em" }}/>
						<Menu.Item onClick={() => this.rename()}>Rename</Menu.Item>
						<Menu.Item onClick={() => this.delete()}>Delete</Menu.Item>
					</Menu>
				</Grid.Column>
				<Grid.Column width={2}>
					<Menu inverted attached fluid>
						<Menu.Item onClick={() => this.create()}>New</Menu.Item>
						<Menu.Item onClick={() => this.duplicate()}>Duplicate</Menu.Item>
					</Menu>
				</Grid.Column>
				<Grid.Column width={7}>
					<Menu inverted attached fluid>
						<Spacer fluid/>
						<Menu.Item onClick={() => examples.load()}>Reload</Menu.Item>
						<Menu.Item onClick={() => examples.reset()}>Reset</Menu.Item>
					</Menu>
				</Grid.Column>
			</Grid.Row>
			<Grid.Row style={{ height: "calc(100% - 3rem)" }}>
				<Grid.Column width={8}>
					<TabbableTextArea
						className="ui segment"
						value={code}
						onChange={(event) => examples.update(examples.selected, event.target.value, "SKIP_SAVE")}
					/>
					{dirtyButtons()}
				</Grid.Column>
				<Grid.Column width={8}>
					<TextArea className="ui segment" value={output}/>
				</Grid.Column>
				{compileButton()}
			</Grid.Row>
		</Grid>
	);}
}
