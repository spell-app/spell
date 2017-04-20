//
//	# Rules for defining classes (known as `types`)
//
import Rule from "../RuleSyntax";
import parser from "./_parser";
// re-export parser for testing.
export default parser;


//parser.addExpression("property_expression", "{property:property_name}+ {expression}", {
parser.addExpression(
	"property_expression",
	"(properties:the {identifier} of)+ {expression}",
	undefined,
	class property_expression extends Rule.Expression {
		get args() {
			let args = Rule.Expression.gatherArguments(this);
			// transform properties and reverse order
			args.properties = args.properties.map( sequence => sequence.identifier ).reverse();
			return args;
		}

		toSource(context) {
			let args = this.args;
			let thing = args.expression.toSource();
			let properties = args.properties.map( identifier => identifier.toSource() ).join(".");
			return `spell.get(${thing}, '${properties}')`;
		}
	}
);



parser.addSyntax("scope_modifier", "(scope:global|constant|shared)");

parser.addStatement(
	"declare_property",
	"{scope_modifier}? {assignment}",
	{
		toSource(context) {
			let args = this.args;
			let identifier = args.assignment.identifier.toSource();
			let value = args.assignment.expression.toSource();
			let assignment = `${identifier} = ${value}`;

			var scope = args.scope ? args.scope.toSource() : "local";
			switch (scope) {
				case "global":
					return `global.${assignment}`;

				case "constant":
					return `const ${assignment}`;

				case "shared":
					return `static ${assignment}`;

				default:
					return assignment;
			}
		}
	}
);

// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
parser.addStatement(
	"declare_property_as_one_of",
	"{identifier} as one of {list:literal_list}",
	{
		toSource(context) {
			let args = this.args;
			let identifier = args.identifier.toSource();
			let plural = (identifier + "_VALUES").toUpperCase();
			let list = args.list.list;
			let values = list.toSource();
			let first = list.results[0];
			let firstValue = first ? first.toSource() : "undefined";

			return `static ${plural} = ${values};\n`
				 + `get ${identifier} { return ("__${identifier}" in this ? this.__${identifier} : ${firstValue}) }\n`
				 + `set ${identifier}(value) { if (this.constructor.${plural}.includes(value)) this.__${identifier} = value }\n`;
		}
	}
);

