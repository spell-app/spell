//
//	# Rules for defining classes (known as `types`)
//
import Rule from "../RuleSyntax";
import parser from "./_parser";
// re-export parser for testing.
export default parser;


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


parser.addSyntax("scope_modifier", "(scope:global|constant|shared|local)");

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

// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
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
			return `static ${plural} = ${values};\n`
				 + `get ${identifier} { return ("__${identifier}" in this ? this.__${identifier} : ${firstValue}) }\n`
				 + `set ${identifier}(value) { if (this.constructor.${plural}.includes(value)) this.__${identifier} = value }\n`;
		}
	}
);

