import React from "react";
import { observer } from "mobx-react";
import { Button, Dropdown, Grid, Menu, Segment, TextArea } from 'semantic-ui-react'

import ExampleStore from "./ExampleStore";
import Spacer from "./Spacer.jsx";
import "./styles.less";
import TabbableTextArea from "./TabbableTextArea";

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
					<TabbableTextArea className="ui segment" value={code}
						onChange={(event) => examples.update(examples.selected, event.target.value, "SKIP_SAVE")}
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
