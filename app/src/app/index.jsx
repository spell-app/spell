// Common imports
import React from "react";
import ReactDOM from 'react-dom';

// Parser
import parser from "../index";

// Define `parse()` and `compile()` for command line.
window.parse = parser.parse.bind(parser);
window.compile = parser.compile.bind(parser);

// App-specific imports
import SpellEditor from "./SpellEditor.jsx";

// Kick off our top-level element
ReactDOM.render(
  <SpellEditor />,
  document.getElementById('react-root')
);
