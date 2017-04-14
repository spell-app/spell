To get started
----------------
- Clone this repo
- `cd <repo location>`
- `npm install`


To compile code
----------------
- `cd <repo location>`
- `npm run watch`


To test
----------------
- `cd <repo location>`
- `npm test`

and/or

- `jest src/RuleSyntax.test.js`

and/ or

- `jest --coverage`


TODO
----

- TODOC: basic structure
- TODOC: ambiguous parsing and context to disambiguate


Parser operation
----------------

To parse `text`
- Wrap `text` in a `textStream`
- Split into lines
	- parse each line as a `statement`
	- pay attention to indentation to indicate blocks



TextStream
----------
- `TextStream`s represent (long) strings of text to be parsed.
- `TextStream`s have a `startIndex` (called the "parse point" of the stream) and possibly an `endIndex` (e.g. the end of the current line).
- `stream.head` is the substring at the current parse point in the stream.
- `stream.match(<regex>)` and `stream.startsWith(<string>)` are the primary matching primitives
	and automatically repsect `startIndex` and `endIndex`.
- Streams are immutable -- use `stream.advanceTo(<newStart>)` to get a new stream
	beyond current parse point, which uses structural sharing to clone efficiently.



Rule
----
- `Rule`s match specific characters/logical structures in a `textStream`.
- Unlike most parsers, we don't break the process into separate "lexing" ("tokenizing")
	and "parsing" (rule matching) phases -- both are handled in one pass by `rules` of various scope.
- Thus a `rule` can match a single specific "word" (a.k.a. "token"), an expression,
	a class defintion, an entire file, etc.
- Simple rules are composed into larger rules, for example:
	- `identifier` is a simple rule satisified with a regular expression,
	- `{literal-value}` is a rule satisfied with one alternative of a set of regular expressions, while
	- `{identifier} = {literal-value}` is a `statement` rule which uses the above as subrules.
- Rules come in various flavors:
	- `Keyword`s match a literal string.
	- `Pattern`s match a regular expression.
	- `Subrule`s match another rule, specified by rule name.
	- `Sequence`s match a sequence of named rules and/or keywords.
	- `Alternatives` match one or more of a set of alternative rules.
	- `List`s match a delmited list of items.
- You'll generally specify rules using our `RuleSyntax`, which is a human-friendly way
	of specifying a sequence of rules as a string, e.g.
	- `{identifier} = {literal-value}` creates a `sequence` of
		1. `identifier` subrule
		2. `=` keyword
		3. `literal-value` subrule

RuleSyntax
----------
| Syntax		| Description |
|---------------|-------------|
| `{...}`		| Curly braces indicate that we should match a named subrule here. |
| `(...)`		| Parenthesis indicate a parenthesized expression, often a set of `Alternatives` or used to make a rule optional (see below). |
| `[...]`		| Indicates a `List` expresion. |
| `(...|...)`	| A vertical pipe, generally found inside parenthesis, indicates a set of `Alternatives`, any one of which will work.
| `...?`		| A question mark indicates that the preceding rule is optional. |
| `...*`		| An asterisk indicates that the preceding rule is optional, and may repeat one or more times. |
| `...+`		| A plus indicates that the preceding rule is required, and MAY be repeated. |
| whitespace	| Whitespace is used for nesting blocks and separating pattern/keyword rules, and is automatically consumed. Use `tab` characters for nesting. |
| anything else	| Pretty much anything else indicates a keyword, which may be punctuation, e.g. `=`, or english words `is`, `not`, `play`, etc. |

- TODO: describe results of matching rules
- TODO: describe using `(name:...)` to name a rule/subrule/list

