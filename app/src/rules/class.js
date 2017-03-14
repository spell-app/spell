//
//	# Rules for defining classes (known as `types`)
//
import Rule from "../RuleSyntax";
import parser from "./_parser";
// re-export parser for testing.
export default parser;

parser.addSyntax("scope-modifier", "(scope:global|constant|shared)");

parser.addStatement(
	"declare-property",
	"{scope-modifier}? {assignment}",
	{
		toSource(context) {
			let args = this.gatherArguments();
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
	"declare-property-as-one-of",
	"{identifier} as one of {list:literal-list}",
	{
		toSource(context) {
			let args = this.gatherArguments();
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

