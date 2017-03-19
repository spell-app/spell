//
//	# Rules for defining classes (known as `types`)
//
import Rule from "../RuleSyntax";
import parser from "./_parser";
// re-export parser for testing.
export default parser;



// TODO: move into 'ordinal' or some such
parser.addSyntax("ordinal", "(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|penultimate|last|final)", {
	toSource(context) {
		switch (this.matched) {
			case "first":		return 1;
			case "second":		return 2;
			case "third":		return 3;
			case "fourth":		return 4;
			case "fifth":		return 5;
			case "sixth":		return 6;
			case "seventh":		return 7;
			case "eighth":		return 8;
			case "ninth":		return 9;
			case "tenth":		return 10;
			case "penultimate":	return -2;
			case "last":		return -1;
			case "final":		return -1;
		}
	}
});

parser.addExpression("ordinal-expression", "the {ordinal} item of {expression}", {
	toSource() {
		let args = this.gatherArguments();
		let ordinal = args.ordinal.toSource();
		let thing = args.expression.toSource();
		return `spell.getItem(${thing}, ordinal)`;
	}
});


//parser.addExpression("property-of", "{property:property-name}+ {expression}", {
parser.addExpression("property-of", "(properties:the {identifier} of)+ {expression}", {
 	gatherArguments() {
		let args = Rule.Expression.gatherArguments(this);
		// transform properties and reverse order
		args.properties = args.properties.map( sequence => sequence.identifier ).reverse();
		return args;
 	},

	toSource(context) {
		let args = this.gatherArguments();
		let thing = args.expression.toSource();
		let properties = args.properties.map( identifier => identifier.toSource() ).join(".");
		return `spell.get(${thing}, '${properties}')`;
	}
});



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

