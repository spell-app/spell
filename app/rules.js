
//
// Regex pattern rules with custom constructors for debugging
//
//parser.addPattern("whitespace", /^\s+/);
parser.addRule("whitespace", new (class whitespace extends Rule.Pattern{})({ pattern: /^\s+/, optional: true }));

// `identifier` = variables or property name.
// MUST start with a lower-case letter (?)
//parser.addPattern("identifier", /^[a-z][\w\d\-_]*/);
parser.addRule("identifier", new (class identifier extends Rule.Pattern{})({ pattern: /^[a-z][\w\-]*/ }));

// `Type` = type name.
// MUST start with an upper-case letter (?)
//parser.addPattern("typename", /^[A-Z][\w\d\-_]*/);
parser.addRule("Type", new (class Type extends Rule.Pattern{})({ pattern: /^[A-Z][\w\d\-_]*/ }));


// Numeric literal (either float or integer), created with custom constructor for debugging.
parser.addRule("number", new (class number extends Rule.Pattern{})({
	pattern: /^-?\d+(?:\.\d+)?/,
	toSource: function(context) {
		return parseFloat(this.value, 10);
	}
}));


// Literal `text` string, created with custom constructor for debugging.
// Returned `value` has enclosing quotes.
parser.addRule("text", new (class text extends Rule.Pattern{})({
	pattern: /^(?:"[^"]*"|'[^']*')/
}));


// Boolean literal, created with custom constructor for debugging.
// TODO: better name for this???
parser.addRule("boolean", new (class boolean extends Rule.Pattern{})({
	pattern: /^(?:true|false|yes|no|success|failure)\b/,
	toSource: function(context) {
		switch (this.value) {
			case "true":
			case "yes":
			case "success":
				return true;
			default:
				return false;
		}
	}
}));

// Rules auto-derived from our `rule syntax`.


// Literal value as number, text or boolean.
parser.addSyntax("literal", "({number}|{text}|{boolean})", { argument: "literal" });


// Literal list (array), eg:  `[1,2,true,false ]`
parser.addSyntax(
	"literal-list",
	"\\[[list:{literal},]?\\]",
	{
		// Modify `arguments` of this expression to just the list returned.
		gatherArguments() {
			var args = Rule.Sequence.prototype.gatherArguments.apply(this);
			if (!args) return undefined;
			return args.list;
		},

		toSource(context) {
			var list = this.gatherArguments();
			return list.toSource();
		}
	}
);



parser.addSyntax("scope-modifier", "(scope:global|constant|shared)");

parser.addSyntax(
	"declare-property",
	"{scope-modifier}? {identifier} = {literal}",
	{
		toSource(context) {
			let args = this.gatherArguments();
			let statement = `${args.identifier.toSource()} = ${args.literal.toSource()};`;

			var scope = (args.scope ? args.scope.toSource() : "local");
			switch (scope) {
				case "global":
					return `global.${statement}`;

				case "constant":
					return `const ${statement}`;

				case "shared":
					return `static ${statement}`;

				default:
					return statement;
			}
		}
	}
);

// TODO: warn on invalid set?  shared?  undefined? something other than the first value as default?
parser.addSyntax(
	"declare-property-as-one-of",
	"{identifier} as one of {list:literal-list}",
	{
		toSource(context) {
			let args = this.gatherArguments();

			let identifier = args.identifier.toSource();
			let plural = Sugar.String.pluralize(identifier);
			let values = args.list.toSource();
			let first = args.list.value[0];
			let firstValue = first ? first.toSource() : "undefined";

			return `static ${plural} = ${values};\n`
				 + `get ${identifier} { return ("__${identifier}" in this ? this.__${identifier} : ${firstValue}) }\n`
				 + `set ${identifier}(value) { if (this.constructor.${plural}.includes(value)) this.__${identifier} = value }\n`;
		}
	}
);
