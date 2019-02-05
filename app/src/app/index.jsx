// Common imports
import React from "react";
import ReactDOM from 'react-dom';

// Parser
import parser from "../rules/spell/index.js";

// App-specific imports
import SpellEditor from "./SpellEditor.jsx";

// Kick off our top-level element
ReactDOM.render(
  <SpellEditor />,
  document.getElementById('react-root')
);
