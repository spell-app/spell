//
//	# Rules for defining classes (known as `types`)
//
import Rule from "../RuleSyntax";
import parser from "./_parser";
// re-export parser for testing.
export default parser;


// TESTME
parser.addStatement(
	"define_type",
	"define type {type} (extendsClause:as (a|an) {superType:type})?",
	class define_type extends Rule.Statement {
		toSource(context) {
			let { type, extendsClause } = this.results;
			type = type.toSource(context);
			let superType = extendsClause && extendsClause.results.superType.toSource(context);
			if (superType) {
				return `class ${type} extends ${superType}`;
			}
			return `class ${type}`;

		}
	}
);

parser.addSyntax(
	"argsClause",
	"with [args:{identifier} and]",

	class argsClause extends Rule.Sequence {
		// Return just the identifiers as the results
		get results() {
			return super.results.args;
		}

		toSource(context) {
			return this.results.matched.map(arg => arg.toSource(context)).join(", ");
		}
	}
);

// TESTME
parser.addStatement(
	"declare_method",
	"to {identifier} (argsClause:with [args:{identifier} and])? (\\:)? {statement}?",
	class declare_method extends Rule.Statement {
		toSource(context) {
			let { identifier, argsClause, statement } = this.results;
			identifier = identifier.toSource(context);
			let args = argsClause && argsClause.results.args.matched.map(arg => arg.toSource(context));
			if (statement) statement = statement.toSource(context);
//console.info(identifier, args, statement);

			let result = `${identifier}(${args && args.join(", ") || ""})`
			if (statement) result += ` { ${statement} }`;
			return result;
		}
	}
);

// TESTME
parser.addStatement(
	"getter",
	"get {identifier} (\\:)? {expression}?",
	class getter extends Rule.Statement {
		toSource(context) {
			let { identifier, expression } = this.results;
			identifier = identifier.toSource(context);
			if (expression) expression = expression.toSource(context);
//console.info(identifier, args, expression);

			let result = `get ${identifier}()`
			if (expression) result += ` { return ${expression} }`;
			return result;
		}
	}
);


//TESTME
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

//TESTME
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


parser.addSyntax("scope_modifier", "(scope:global|constant|shared|local)");

//TESTME
parser.addStatement(
	"declare_property",
	"{scope_modifier}? {assignment}",
	{
		toSource(context) {
			let { assignment, scope_modifier } = this.results;
			assignment = assignment.toSource(context);
			let scope = scope && scope.toSource(context);
			switch (scope) {
				case "global":
					return `global.${assignment}`;

				case "constant":
					return `const ${assignment}`;

				case "shared":
					return `static ${assignment}`;

				case "local":
				default:
					return assignment;
			}
		}
	}
);

//TESTME
parser.addStatement(
	"declare_typedProperty",
// TODO: scope_modifier???
	"{identifier} as (a|an)? {type}",
	{
		toSource(context) {
			let { identifier, type } = this.results;
			identifier = identifier.toSource(context);
			type = type.toSource(context);

			return `get ${identifier} { return this.__${identifier} }\n`
				 + `set ${identifier}(value) { if (spell.isA(value, ${type}) this.__${identifier} = value }`;
		}
	}
);


// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
//TESTME
parser.addStatement(
	"declare_property_as_one_of",
	"{scope_modifier}? {identifier} as one of {list:literal_list}",
	{
		toSource(context) {
			let { scope_modifier, identifier, list } = this.results;
//TODO: not handling scope_modifier
			identifier = identifier.toSource(context);
			let plural = (identifier + "_VALUES").toUpperCase();
			let values = list.toSource(context);
//TODO: list.getItem(0)
			let first = list.results.matched[0];
			let firstValue = first ? first.toSource(context) : "undefined";

			return `get ${identifier} { return ("__${identifier}" in this ? this.__${identifier} : ${firstValue}) }\n`
				 + `set ${identifier}(value) { if (${values}.includes(value)) this.__${identifier} = value }`;

// MORE EFFICIENT BUT UGLIER
// 			return `static ${plural} = ${values};\n`
// 				 + `get ${identifier} { return ("__${identifier}" in this ? this.__${identifier} : ${firstValue}) }\n`
// 				 + `set ${identifier}(value) { if (this.constructor.${plural}.includes(value)) this.__${identifier} = value }`;
		}
	}
);

