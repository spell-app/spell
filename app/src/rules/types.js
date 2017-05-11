//
//	# Rules for defining classes (known as `types`)
//
import global from "../utils/global";
import { pluralize } from "../utils/string";
import Rule from "../RuleSyntax";
import parser from "./_parser";

// re-export parser for testing.
export default parser;



//MOVE TO `objects`?
// Properties clause: creates an object with one or more property values.
//	`foo = 1, bar = 2`
//TODO: would like to use `and` but that will barf on expressions...
//TODO: how to do properties on multiple lines?
//TESTME w/o `= expression`
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

// `new`
// NOTE: we assume that all types take an object of properties????
parser.addSequence(
	"new_thing",
	"(create|new) {type} (?:with {props:object_literal_properties})?",
	class new_thing extends Rule.Sequence {
		getResults(context) {
			let { type, props } = this.results;
			return {
				type: type.toSource(context),
				props: props && props.toSource(context) || ""
			};
		}
		toSource(context) {
			let { type, props } = this.getResults(context);
			// Special case for object, which we'll create with an object literal.
			if (type === "Object") {
				if (!props) return "{}";
				return `${props}`;
			}

			return `new ${type}(${props})`;
		}
	}
);
// This works as an expression OR a statement.
parser.addRule("expression", parser.rules.new_thing);
parser.addRule("statement", parser.rules.new_thing);




// Define class.
parser.addStatement(
	"define_type",
	"define type {type} (extends_clause:as (a|an) {superType:type})?",
	class define_type extends Rule.Statement {
		toSource(context) {
			let { type, extends_clause } = this.results;
			type = type.toSource(context);
			let superType = extends_clause && extends_clause.results.superType.toSource(context);
			if (superType) {
				return `class ${type} extends ${superType}`;
			}
			return `class ${type}`;

		}
	}
);

//TODO: constructor



//MOVE TO `functions`?
// Arguments clause for methods
//	`with foo` or `with foo and bar and baz`
//TODO: {identifier} = {expression}	=> requires `,` instead of `and`
//TODO: `with foo as Type`
//TODO:	`with foo...` for splat?
parser.addSequence(
	"args_clause",
	"with [args:{identifier} ,]",
	class args_clause extends Rule.Sequence {
		// Return just the arguments as the results
		get results() {
			return super.results.args;
		}

		// Return just the argument names as an array
		get argNames() {
			return this.results.matched.map(arg => arg.matched);
		}

		toSource(context) {
			return this.argNames.join(", ");
		}
	}
);


// Declare instance method or normal function.
parser.addStatement(
	"declare_method",
	"(to|on) {identifier} {args_clause}? (\\:)? {statement}?",
	class declare_method extends Rule.Statement {
		toSource(context) {
			let { identifier, args_clause, statement } = this.results;

			identifier = identifier.toSource(context);
			let args = (args_clause && args_clause.toSource(context)) || "";
			statement = (statement ? ` { ${statement.toSource(context)} }` : "");

			return `${identifier}(${args})${statement}`
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
	"declare_action",
	"action (word_clause:{word}|{type})+ (\\:)? {statement}?",
	class declare_action extends Rule.Statement {

		toSource(context) {
			let { word_clause, statement } = this.results;
			let words = word_clause.matched.map( word => word.toSource(context) );
			// if there's only one word, it can't be a blacklisted identifier or a type
			if (words.length === 1) {
				var word = words[0];
				if (word_clause.matched instanceof Rule.Type) {
					throw new SyntaxError(`parse('declare_action'): one-word actions may not be types: ${word}`);
				}

// HACK: `global.parser` is a hack here for convenience in testing...
				let parser = context ? context.parser : global.parser;
				if (parser.rules.identifier.blacklist[word]) {
					throw new SyntaxError(`parse('declare_action'): one-word actions may not be blacklisted identifiers": ${word}`);
				}
			}

			// figure out arguments and/or types
			var args = [];
			var types = [];
			// if any of the words are types (capital letter) make that an argument of the same name.
			word_clause.matched.map( (item, index) => {
				if (item instanceof Rule.Type) {
					let type = words[index];
					let word = type.toLowerCase();
					types.push([type, word]);
					words[index] = word;
					args.push(word);
				}
			});
			// get static method name and arguments for output
			let methodName = words.join("_");
			args = args.join(", ");

			// figure out if there are any conditions on the above
			let conditions = types.map( ([type, word]) => {
				return `\tif (!spell.isA(${word}, ${type})) return undefined`;
			});

			// get statements, adding conditions if necessary
			statement = statement ? statement.toSource(context) : "";
			let statements = "";
			if (statement) {
				statements = [];
				if (conditions.length) statements = statements.concat(conditions);
				if (statement) statements.push("\t" + statement);
				statements = ` {\n${statements.join("\n")}\n }\n`;
			}
			else if (conditions.length) {
				statements = ` {\n${conditions.join("\n")}`;
			}
//debugger;
			// Create as a STATIC function
	//TODO: create as an instance function we can call on ourself!
			return `static ${methodName}(${args})${statements}`;
		}
	}
);


// Getter either with or without arguments.
// If you specify arguments, yields a normal function which returns a value.
parser.addStatement(
	"getter",
	"get {identifier} {args_clause}? (\\:)? {expression}?",
	class getter extends Rule.Statement {
		toSource(context) {
			let { identifier, args_clause, expression } = this.results;
			identifier = identifier.toSource(context);
			let args = args_clause && args_clause.toSource(context);
			expression = (expression ? ` { return (${expression.toSource(context)}) }` : "");

			if (args && expression) {
				return `${identifier}(${args})${expression}`;
			}
			else if (args) {
				return `${identifier}(${args})`;

			} else if (expression) {
				return `get ${identifier}()${expression}`;
			} else {
				return `get ${identifier}()`;
			}
			return result;
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
	"setter",
	"set {identifier} {args_clause}? (\\:)? {statement}?",
	class getter extends Rule.Statement {
		toSource(context) {
			let { identifier, args_clause, statement } = this.results;
			identifier = identifier.toSource(context);

			// Assume we want the same name as the identifier if no argumens
			let args = (args_clause && args_clause.argNames) || [identifier];
			// Complain if more than one argument
			if (args.length > 1)
				console.warn("parse('setter'): only one argument allowed in setter:  ", this.matchedText);

			statement = (statement ? ` { ${statement.toSource(context)} }` : "");

			return `set ${identifier}(${args[0]})${statement}`;
			return result;
		}
	}
);


//
//	declare properties
//

//TODO: another name for `constant` ?
parser.addStatement(
	"declare_property",
	"(scope:property|constant|shared property) {identifier} (value_clause:= {expression})?",
	class declare_property extends Rule.Statement {
		toSource(context) {
			let { scope, identifier, value_clause } = this.results;
			scope = scope.toSource(context);
			identifier = identifier.toSource(context);
			let value = value_clause && " = " + value_clause.results.expression.toSource(context) || "";

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
	"declare_property",
	"property {identifier} as (a|an)? {type}",
	class declare_property extends Rule.Statement {
		toSource(context) {
			let { identifier, type } = this.results;
			identifier = identifier.toSource(context);
			type = type.toSource(context);

			return `get ${identifier}() { return this.__${identifier} }\n`
				 + `set ${identifier}(value) { if (spell.isA(value, ${type}) this.__${identifier} = value }`;
		}
	}
);


// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
parser.addStatement(
	"declare_property",
	"property {identifier} as one of {list:literal_list}",
	class declare_property_as_one_of extends Rule.Statement {
		toSource(context) {
			let { identifier, list } = this.results;

			identifier = identifier.toSource(context);
			let plural = pluralize(identifier);

			let values = list.toSource(context);
			let first = list.getItem(0);
			let firstValue = first ? first.toSource(context) : "undefined";

			return `@proto ${plural} = ${values}\n`
				 + `get ${identifier}() { return this.__${identifier} === undefined ? ${firstValue} : this.__${identifier} }\n`
				 + `set ${identifier}(value) { if (this.${plural}.includes(value)) this.__${identifier} = value }`;

// MORE EFFICIENT BUT UGLIER
// 			return `static ${plural} = ${values};\n`
// 				 + `get ${identifier} { return ("__${identifier}" in this ? this.__${identifier} : ${firstValue}) }\n`
// 				 + `set ${identifier}(value) { if (this.constructor.${plural}.includes(value)) this.__${identifier} = value }`;
		}
	}
);


//
//	Self-reference
//
parser.addKeyword("me", "me",
	class me extends Rule.Keyword {
		toSource(context) {
			return "this";
		}
	}
);
parser.addRule("expression", parser.rules.me);

// TODO: this really makes me want to make `I am empty` etc work...
parser.addKeyword("I", "I",
	class I extends Rule.Keyword {
		toSource(context) {
			return "this";
		}
	}
);
parser.addRule("expression", parser.rules.I);


//
//	Property access
//

parser.addExpression(
	"property_expression",
	"(properties:the {identifier} of)+ the? {expression}",
	class property_expression extends Rule.Expression {
		toSource(context) {
			let { expression, properties } = this.results;
			expression = expression.toSource(context);
			properties = properties.results
							.reverse()
							.map( property => property.identifier.toSource(context) )
							.join(".");
			return `${expression}.${properties}`;
// NOTE: the following is safer, but ugly for demo purposes
//			return `spell.get(${expression}, ['${properties}'])`;
		}
	}
);

parser.addExpression(
	"property_expression",
	"(my|this) {identifier}",
	class property_expression extends Rule.Expression {
		toSource(context) {
			let { identifier } = this.results;
			identifier = identifier.toSource(context);
			return `this.${identifier}`;
		}
	}
);
