//
//	# Rules for defining classes (known as `types`)
//
import Rule from "../RuleSyntax";
import parser from "./_parser";
// re-export parser for testing.
export default parser;


parser.addExpression(
	"property_expression",
	"(property_names:the {identifier} of)+ {expression}",
	undefined,
	class property_expression extends Rule.Expression {
		get args() {
			if (!this._args) {
				this._args = super.args;
				// transform property_names and pull out identifiers
				this._args.property_names = this._args.property_names.args.map( sequence => sequence.identifier );
			}
			return this._args;
		}

		toSource(context) {
			let thing = this.args.expression.toSource(context);
			let property_names = this.args.property_names.reverse().map( identifier => identifier.toSource(context) ).join(".");
			return `spell.get(${thing}, '${property_names}')`;
		}
	}
);


parser.addSyntax("scope_modifier", "(scope:global|constant|shared|local)");

parser.addStatement(
	"declare_property",
	"{scope_modifier}? {assignment}",
	{
		toSource(context) {
			let assignment = this.args.assignment.toSource(context);
			let scope = this.args.scope && this.args.scope.toSource(context);
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
			let scope = this.args.scope.toSource(context);
			let identifier = this.args.identifier.toSource(context);
			let plural = (identifier + "_VALUES").toUpperCase();
			let list = this.args.list;
			let values = list.toSource(context);
			let first = list.args.results[0];
			let firstValue = first ? first.toSource(context) : "undefined";
			return `static ${plural} = ${values};\n`
				 + `get ${identifier} { return ("__${identifier}" in this ? this.__${identifier} : ${firstValue}) }\n`
				 + `set ${identifier}(value) { if (this.constructor.${plural}.includes(value)) this.__${identifier} = value }\n`;
		}
	}
);

