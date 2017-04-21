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
		get results() {
			if (!this._results) {
				this._results = super.results;
				// transform property_names and pull out identifiers
				this._results.property_names = this._results.property_names.results.map( sequence => sequence.identifier );
			}
			return this._results;
		}

		toSource(context) {
			let thing = this.results.expression.toSource(context);
			let property_names = this.results.property_names.reverse().map( identifier => identifier.toSource(context) ).join(".");
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
			let assignment = this.results.assignment.toSource(context);
			let scope = this.results.scope && this.results.scope.toSource(context);
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
			let scope = this.results.scope.toSource(context);
			let identifier = this.results.identifier.toSource(context);
			let plural = (identifier + "_VALUES").toUpperCase();
			let list = this.results.list;
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

