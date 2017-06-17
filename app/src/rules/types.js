//
//	# Rules for defining classes (known as `types`)
//

// TODO: mixins / traits / composed classes / annotations

import Parser from "../Parser";
import Rule from "../RuleSyntax";

import global from "../utils/global";
import { pluralize } from "../utils/string";

// Create "types" parser context.
const parser = Parser.forContext("types");
export default parser;

// Import core rules.
import "./core";
parser.import("core");

// Define "type" (a.k.a. "class").
parser.addStatement(
	["define_type", "MUTATOR"],
	"define type {type} (?:as (a|an) {superType:type})?",
	class define_type extends Rule.BlockStatement {

		// Return a logical representation of the data structure
		toStructure(context) {
			let { type, superType } = this.getMatchedSource(context);
			let block = (this.block && this.block.matched) || [];

			let properties = [];
			let methods = [];
			let other = [];
			block.map(statement => statement.toStructure(context))
				 .filter(Boolean)
				 .forEach(structure => {
					if (structure.type === "property") 		properties.push(structure);
					else if (structure.type === "method") 	methods.push(structure);
				 	else									other.push(structure);
				 });

			return {
				type: "class",
				name: type,
				superType,
				properties,
				methods,
				other
			}
		}


		toSource(context) {
			let { type, superType, block } = this.getMatchedSource(context);

// DEBUG
console.info("TYPE STRUCTURE:", this.toStructure(context));

			let output = `class ${type}`;
			if (superType) output += ` extends ${superType}`;
			output += " " + Rule.Block.encloseStatements(block);
			return output;
		}
	}
);


// `new` or `create`
// This works as an expression OR a statement.
// NOTE: we assume that all types take an object of properties????
parser.addSequence(
	["expression", "statement"],
	"(create|new) {type} (?:with {props:object_literal_properties})?",
	class new_thing extends Rule.Sequence {
		toSource(context) {
			let { type, props = "" } = this.getMatchedSource(context);
			// Special case for object, which we'll create with an object literal.
			if (type === "Object") {
				if (!props) return "{}";
				return props;
			}

			return `new ${type}(${props})`;
		}
	}
);


//TODO: constructor



// Declare instance method or normal function.
parser.addStatement(
	["declare_method", "MUTATOR"],
	"(to|on) {name:identifier} {args}? (\\:)? {statement}?",
	class declare_method extends Rule.BlockStatement {
		// Return a logical representation of the data structure
		toStructure(context) {
			let { name, args } = this.getMatchedSource(context);
			return {
				type: "method",
				name,
				args
			}
		}

		toSource(context) {
			let { name, args, statement, block } = this.getMatchedSource(context);
			args = (Array.isArray(args) ? args.join(", ") : "");

			let output = `${name}(${args}) `;
			output += Rule.Block.encloseStatements(statement, block);
			return output;
		}
	}
);


// Declare "action", which can be called globally and affects the parser.
// TODO: `with` clause (will conflict with `word`)
// TODO: install in parser somehow
// TODO: create instance function?  or maybe we don't need it:
//			`action turn Card over` for an instance is just `turn me over`
//			`action add card to deck` => `add me to deck`
//TESTME
parser.addStatement(
	["declare_action", "MUTATOR"],
	"action (keywords:{word}|{type})+ (\\:)? {statement}?",
	class declare_action extends Rule.BlockStatement {

		// Add `name`, `args` and `types` to matched source
		getMatchedSource(context) {
			let output = super.getMatchedSource(context);

			// if there's only one keyword, it can't be a blacklisted identifier or a type
			let { keywords } = output;
			let keywordMatches = this.results.keywords.matched;
			if (keywords.length === 1) {
				let keyword = keywords[0];
				if (keywordMatches[0] instanceof Rule.Type) {
					console.error(`parse('declare_action'): one-word actions may not be types: ${keyword}`);
				}

// HACK: `global.parser` is a hack here for convenience in testing...
				let parser = (context && context.parser) || global.parser;
				let blacklist = parser.getBlacklist("identifier");
				if (blacklist[keyword]) {
					console.error(`parse('declare_action'): one-word actions may not be blacklisted identifiers": ${keyword}`);
				}
			}

			// figure out arguments and/or types
			output.args = [];
			output.types = {};

			// if any of the words are types (capital letter) make that an argument of the same name.
			keywordMatches.map( (item, index) => {
				if (item instanceof Rule.Type) {
					let Type = keywords[index];
					let type = Type.toLowerCase();

					output.types[type] = Type;
					output.args.push(type);

					// replace with lowercase in method name
					keywords[index] = type;
				}
			});
			// get static method name and arguments for output
			output.name = keywords.join("_");
			return output;
		}

		toSource(context) {
			let { name, args, types, statement, block } = this.getMatchedSource(context);

			// figure out if there are any conditions due to known argument types
			let conditions = [];
			for (let arg in types) {
				conditions.push(`\tif (!spell.isA(${arg}, ${types[arg]})) return undefined`);
			}

			args = args.join(", ");
			let statements = Rule.Block.encloseStatements(conditions, statement, block);

			// Create as a STATIC function
	//TODO: create as an instance function we can call on ourself!
			return `static ${name}(${args}) ${statements}`;
		}

		toStructure(context) {
			let { name, args, types } = this.getMatchedSource(context);
			return {
				type: "method",
				name,
				args,
				types
			}
		}
	}
);


// Getter either with or without arguments.
// If you specify arguments, yields a normal function which returns a value.
parser.addStatement(
	["getter", "MUTATOR"],
	"get {identifier} (\\:)? {expression}?",
	class getter extends Rule.BlockStatement {
		toSource(context) {
			let { identifier, expression, block } = this.getMatchedSource(context);
			// If they specified an inline-expression, prepend return
			if (expression && !expression.startsWith("return ")) expression = `return (${expression})`;
			let output = `get ${identifier}() `;
			output += Rule.Block.encloseStatements(expression, block);
			return output;
		}
	}
);

// Setter.
// Complains if you specify more than one argument.
// If you don't pass an explicit argument, we'll assume it's the same as the identifier.
// eg;	`set color: set the color of my text to color`
//
// TODO: internal getter/setter semantics ala objective C
//			`set color: if color is in ["red", "blue"] then set my color to color`
//		 => `my color` within setter should automatically translate to `this._color` ???
parser.addStatement(
	["setter", "MUTATOR"],
	"set {identifier} {args}? (\\:)? {statement}?",
	class setter extends Rule.BlockStatement {
		toSource(context) {
			// default args to the identifier
			let { identifier, args = [identifier], statement, block } = this.getMatchedSource(context);
			// Complain if more than one argument
			if (args && args.length > 1) {
				console.warn("parse('setter'): only one argument allowed in setter:  ", this.matchedText);
				args = [ args[0] ];
			}
			let output = `set ${identifier}(${args}) `;
			output += Rule.Block.encloseStatements(statement, block);
			return output;
		}
	}
);


//
//	declare properties
//

//TODO: another name for `constant` ?
parser.addStatement(
	["declare_property", "MUTATOR"],
	"(scope:property|constant|shared property) {identifier} (?:= {value:expression})?",
	class declare_property extends Rule.Statement {
		toSource(context) {
			let { scope, identifier, value = "" } = this.getMatchedSource(context);
			if (value) value = ` = ${value}`;

			let declaration = `${identifier}${value}`;
			switch (scope) {
				case "constant":
					if (!value) console.warn("parse('declare_property'): constant properties must declare a value:  ", this.matchedText);
					return `const ${declaration}`;

				case "shared property":
					return `@proto ${declaration}`;

				case "property":
				default:
					return declaration;
			}
		}
	}
);

// TODO: scope_modifier???
// TODO: initial value
parser.addStatement(
	["declare_property_of_type", "MUTATOR"],
	"property {identifier} as (a|an)? {type}",
	class declare_property_of_type extends Rule.Statement {
		toSource(context) {
			let { identifier, type } = this.getMatchedSource(context);
			return `get ${identifier}() { return this.__${identifier} }\n`
				 + `set ${identifier}(value) { if (spell.isA(value, ${type}) this.__${identifier} = value }`;
		}
	}
);


// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
parser.addStatement(
	["declare_property_as_one_of", "MUTATOR"],
	"property {identifier} as one of {list:literal_list}",
	class declare_property_as_one_of extends Rule.Statement {
		toSource(context) {
			let { identifier, list } = this.getMatchedSource(context);
			let plural = pluralize(identifier);
			return `@proto ${plural} = ${list}\n`
				 + `get ${identifier}() { return this.__${identifier} === undefined ? this.${plural}[0] : this.__${identifier} }\n`
				 + `set ${identifier}(value) { if (this.${plural}.includes(value)) this.__${identifier} = value }`;

// MORE EFFICIENT BUT UGLIER
// 			return `static ${plural} = ${list};\n`
// 				 + `get ${identifier} { return ("__${identifier}" in this ? this.__${identifier} : ${firstValue}) }\n`
// 				 + `set ${identifier}(value) { if (this.constructor.${plural}.includes(value)) this.__${identifier} = value }`;
		}
	}
);


//
//	Self-reference
//
parser.addKeyword(
	["me", "expression"],
	"me",
	class me extends Rule.Keyword {
		toSource(context) {
			return "this";
		}
	}
);

// TODO: this really makes me want to make `I am empty` etc work...
parser.addKeyword(
	["I", "expression"],
	"I",
	class I extends Rule.Keyword {
		toSource(context) {
			return "this";
		}
	}
);


//
//	Property access
//

parser.addExpression(
	"property_expression",
	"(properties:the {identifier} of)+ the? {expression}",
	class property_expression extends Rule.Expression {
		getMatchedSource(context) {
			let { expression, properties } = this.results;
			return {
				expression: expression.toSource(context),
				properties: properties.matched.map( property => property.results.identifier.toSource(context) )
			};
		}

		toSource(context) {
			let { expression, properties } = this.getMatchedSource(context);
			properties = properties.reverse().join(".");
			return `${expression}.${properties}`;
// NOTE: the following is safer, but ugly for demo purposes
//			return `spell.get(${expression}, ['${properties}'])`;
		}
	}
);

parser.addExpression(
	"my_property_expression",
	"(my|this) {identifier}",
	class my_property_expression extends Rule.Expression {
		toSource(context) {
			let { identifier } = this.getMatchedSource(context);
			return `this.${identifier}`;
		}
	}
);


//
//	Utility
//


// Properties clause: creates an object with one or more property values.
//	`foo = 1, bar = 2`
//TODO: would like to use `and` but that will barf on expressions...
//TODO: how to do properties on multiple lines?
parser.addList(
	"object_literal_properties",
	"[({key:identifier}(?:= {value:expression})?) ,]",
	class object_literal_properties extends Rule.List {
		toSource(context) {
			let props = this.results.matched.map(function (prop) {
					let { key, value } = prop.results;
					key = key.toSource(context);
					value = value && value.toSource(context);
					if (value) return `"${key}": ${value}`
					return key;
				});
			return `{ ${props.join(", ")} }`;
		}
	}
);


//MOVE TO `functions`?
// Arguments clause for methods
//	`with foo` or `with foo and bar and baz`
//TODO: {identifier} = {expression}	=> requires `,` instead of `and`
//TODO: `with foo as Type`
//TODO:	`with foo...` for splat?
parser.addSequence(
	"args",
	"with [args:{identifier} ,]",
	class args extends Rule.Sequence {
		// Returns an array of argument values
		toSource(context) {
			return this.results.args.matched.map(arg => arg.matched);
		}
	}
);
