// Export all standard "english" rules.
import Parser from "../Parser";

// Load all standard rules files.
import "./core";
import "./lists";
import "./operators";
import "./if";
import "./statements";
import "./types";
import "./JSX";


// Create parser for all.
const parser = Parser.forContext("all");
export default parser;

// And depend on standard rules loaded above.
parser.import("core", "lists", "operators", "if", "statements", "types", "JSX");
