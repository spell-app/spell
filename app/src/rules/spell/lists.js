//
//	# Rules for dealing with lists
//

// TODO: confirm identifiers are plural in some of the below?
// TODO: `list.clone()` to return new list of same type.

import Parser from "../../Parser";
import Rule from "../../Rule";

import { isPlural, singularize } from "../../utils/string";

// Create "lists" parser context.
const parser = Parser.forName("lists");
export default parser;


// WORKING FROM OTHER RULES (testme)
//	`the length of <list>`
//	`<thing> is not? in <list>`
//	`<list> is not? empty`
//	`set item 1 of myList to 'a'`


// TODO: 	`create list with <exp>, <exp>, <exp>`
// TODO:	`duplicate list`
// TODO:	`duplicate list with <exp>, <exp>, <exp>` ???
// TODO:	`the size of <list>` => will map to `list.size`...
//				- install `size` as an alias to `length`?
// TODO:	`move <thing> to end of <list>` ???
// TODO:	`Set` for a unique list?
// TODO:	typed list?
// TODO:	list which won't take null/undefined


// Return the length of the list.
//TESTME
parser.addExpression(
	"list_length",
	"the? number of {identifier} in {list:expression}",
	class list_length extends Rule.Sequence {
		toSource(context) {
			let { list, identifier } = this.getMatchedSource(context);
// TODO: special case 'words', 'lines', etc
			return `${list}.length`;
		}
	}
);

// Return the first position of specified item in the list as an array.
// If item is not found, returns `undefined`.
// NOTE: this position returned is **1-based**.
//TESTME
// TODO: `positions`, `last position`, `after...`
parser.addExpression(
	"list_position",
	"the? position of {thing:expression} in {list:expression}",
	class list_position extends Rule.Sequence {
		toSource(context) {
			let { thing, list } = this.getMatchedSource(context);
			return `spell.positionOf(${thing}, ${list})`
		}
	}
);


//
//	Ordinal numbers (first, second, last, etc).
// TODO: sixty-fifth, two hundred forty ninth...
//
parser.addKeyword("ordinal", "first", class ordinal extends Rule.Keyword{ toSource() { return 1 }});
parser.addKeyword("ordinal", "second", class ordinal extends Rule.Keyword{ toSource() { return 2 }});
parser.addKeyword("ordinal", "third", class ordinal extends Rule.Keyword{ toSource() { return 3 }});
parser.addKeyword("ordinal", "fourth", class ordinal extends Rule.Keyword{ toSource() { return 4 }});
parser.addKeyword("ordinal", "fifth", class ordinal extends Rule.Keyword{ toSource() { return 5 }});
parser.addKeyword("ordinal", "sixth", class ordinal extends Rule.Keyword{ toSource() { return 6 }});
parser.addKeyword("ordinal", "seventh", class ordinal extends Rule.Keyword{ toSource() { return 7 }});
parser.addKeyword("ordinal", "eighth", class ordinal extends Rule.Keyword{ toSource() { return 8 }});
parser.addKeyword("ordinal", "ninth", class ordinal extends Rule.Keyword{ toSource() { return 9 }});
parser.addKeyword("ordinal", "tenth", class ordinal extends Rule.Keyword{ toSource() { return 10 }});
parser.addKeyword("ordinal", "penultimate", class ordinal extends Rule.Keyword{ toSource() { return -2 }});
parser.addKeyword("ordinal", "final", class ordinal extends Rule.Keyword{ toSource() { return -1 }});
parser.addKeyword("ordinal", "last", class ordinal extends Rule.Keyword{ toSource() { return -1 }});


// treat list as a stack or queue
//TESTME
parser.addKeyword("ordinal", "top", class ordinal extends Rule.Keyword{ toSource() { return 1 }});
parser.addKeyword("ordinal", "bottom", class ordinal extends Rule.Keyword{ toSource() { return -1 }});


// Index expression: numeric position in some list.
//	e.g.	`card 1 of the pile`
//			`card #2 of the pile`
//			`the first card of the pile`
//
// NOTE: Negative numeric positions come from the END of the list.
//	e.g.	`card -1 of the pile`
//
// NOTE: Our positions are **1-based** and Javascript is **0-based**.
//		 e.g. `item 1 of the array`  = `array[0]`
//
// TODO: if `identifier` is "word", output `getWord()` etc
parser.addExpression(
	"position_expression",
	[
		"{identifier} {position:expression} of (the?) {expression}",
		"the {position:ordinal} {identifier} of (the?) {expression}"
	],
	class position_expression extends Rule.Expression{
		toSource(context) {
			let { identifier, position, expression } = this.getMatchedSource(context);
// TODO: special case 'words', 'lines', etc ?

			// If we got a positive number literal, compensate for JS 0-based arrays now,
			// for nicer output.
			if (typeof position === "number" && position > 0) {
				return `${expression}[${position - 1}]`;
			}
			return `spell.getItem(${expression}, ${position})`;

	// This is safer, but using the above sometimes for demo purposes
	//		return `spell.getItem(${expression}, ${position})`;
		}
	}
);

// Pick a SINGLE random item from the list.
// TODO: confirm identifier is plural?
//TESTME
parser.addExpression(
	"random_position_expression",
	"a random {identifier} (of|from|in) (the)? {list:expression}",
	class random_position_expression extends Rule.Expression {
		toSource(context) {
			let { list } = this.getMatchedSource(context);
			return `spell.getRandomItemOf(${list})`;
		}
	}
);

// Pick a unique set of random items from the list, returning an array.
// TODO: `two random items...`
// TODO: confirm identifier is plural?
// TODO: `list.clone()` to return new list of same type.
//TESTME
parser.addExpression(
	"random_positions_expression",
	"{number} random {identifier} (of|from|in) (the)? {list:expression}",
	class random_positions_expression extends Rule.Expression {
		toSource(context) {
			let { number, list } = this.getMatchedSource(context);
			return `spell.getRandomItemsOf(${list}, ${number})`;
		}
	}
);


// Range expression.
// Returns a new list.
// NOTE: `start` is **1-based**.
// NOTE: `end` is inclusive!
// TODO: confirm identifier is plural?
// TODO: `list.clone()` to return new list of same type.
//TESTME
parser.addExpression(
	"range_expression",
	"{identifier} {start:expression} to {end:expression} of {list:expression}",
	class range_expression extends Rule.Expression {
		toSource(context) {
			let { start, end, list } = this.getMatchedSource(context);
			return `spell.getRange(${list}, ${start}, ${end})`;
		}
	}
);

// Starting range expression.
// Returns a new list.
// e.g.	`first 4 items of list`
//TESTME
parser.addExpression(
	"first_in_range",
	"first {number:expression} {identifier} (in|of) {list:expression}",
	class range_expression extends Rule.Expression {
		toSource(context) {
			let { number, list } = this.getMatchedSource(context);
			return `spell.getRange(${list}, 1, ${number})`;
		}
	}
);

// Ending range expression.
// Returns a new list.
// e.g.	`last 4 items of list`
//TESTME
parser.addExpression(
	"last_in_range",
	"last {number:expression} {identifier} (in|of) {list:expression}",
	class range_expression extends Rule.Expression {
		toSource(context) {
			let { number, list } = this.getMatchedSource(context);
			return `spell.getEndRange(${list}, 1, ${number})`;
		}
	}
);


// Range expression starting at some item in the list.
// Returns a new list.
// If item is not found, returns an empty list. (???)
//TESTME
parser.addExpression(
	"range_expression",
	"{identifier} (in|of) {list:expression} starting with {thing:expression}",
	class range_expression extends Rule.Expression {
		toSource(context) {
			let { thing, list } = this.getMatchedSource(context);
			return `spell.getRange(${list}, spell.positionOf(${thing}, ${list}))`;
		}
	}
);


// List filter.
// NOTE: we will singularize `identifier` and use that as the argument to `expression`.
//TESTME
parser.addExpression(
	"list_filter",
	"{identifier} (in|of) {list:expression} where {condition:expression}",
	class list_filter extends Rule.Expression {
		toSource(context) {
			let { identifier, condition, list } = this.getMatchedSource(context);
			// use singular of identifier for method argument
			let argument = singularize(identifier.toSource(context));
			return `spell.filter(${list}, ${argument} => ${condition})`;
		}
	}
);


// Set membership (left recursive).
// NOTE: we will singularize `identifier` and use that as the argument to `expression`.
//TESTME
parser.addExpression(
	"list_membership_test",
	"{list:expression} (operator:has|has no|doesnt have|does not have) {identifier} where {filter:expression}",
	class list_membership_test extends Rule.Expression {
		// Add test rule for quicker processing
		static testRule = new Rule.Keyword({ match: ["where"] });
		get testRule() { return this.constructor.testRule }

		toSource(context) {
			let { identifier, operator, filter, list } = this.getMatchedSource(context);
			let bang = operator === "has" ? "" : "!";
			// use singular of identifier for method argument
			let argument = singularize(identifier.toSource(context));
			return `${bang}spell.any(${list}, ${argument} => ${filter})`;
		}
	}
);

//
//	Adding to list (in-place)
//

// Add to end of list.
//TESTME
parser.addStatement(
	"list_append",
	[
		"append {thing:expression} to {list:expression}",
		"add {thing:expression} to ((the?) end of)? {list:expression}",
	],
	class list_append extends Rule.Statement {
		toSource(context) {
			let { thing, list } = this.getMatchedSource(context);
			return `spell.append(${list}, ${thing})`;
		}
	}
);

// Add to beginning of list.
//TESTME
parser.addStatement(
	"list_prepend",
	[
		"prepend {thing:expression} to {list:expression}",
//"top" as stack === bottom?
		"add {thing:expression} to the (start|front|top) of {list:expression}"
	],
	class list_prepend extends Rule.Statement {
		toSource(context) {
			let { thing, list } = this.getMatchedSource(context);
			return `spell.prepend(${list}, ${thing})`;
		}
	}
);

// Add to middle of list, pushing existing items out of the way.
//TESTME
parser.addStatement(
	"list_add_at",
	"add {thing:expression} to {list:expression} at position {position:expression}",
	class list_splice extends Rule.Statement {
		toSource(context) {
			let { thing, position, list } = this.getMatchedSource(context);
			return `spell.splice(${list}, ${position}, ${thing})`;
		}
	}
);


// TODO:  	"add {thing:expression} to {list:expression} before {item:expression}",

// Add to middle of list, pushing existing items out of the way.
//TESTME
parser.addStatement(
	"list_add_after",
	"add {thing:expression} to {list:expression} after {item:expression}",
	class list_add_after extends Rule.Statement {
		toSource(context) {
			let { thing, item, list } = this.getMatchedSource(context);
			return `spell.splice(${list}, spell.positionOf(${list}, ${item}), ${thing})`;
		}
	}
);



//
//	Removing from list (in-place)
//

// Empty list.
//TODO: make `empty` and/or `clear` a generic statement???
//TESTME
parser.addStatement(
	"list_empty",
	"(empty|clear) {list:expression}",
	class list_empty extends Rule.Statement {
		toSource(context) {
			let { list } = this.getMatchedSource(context);
			return `spell.clear(${list})`;
		}
	}
);

// Remove one item from list by position.
//TESTME
parser.addStatement(
	"list_remove_position",
	"remove {identifier} {number:expression} of {list:expression}",
	class list_remove_position extends Rule.Statement {
		toSource(context) {
			let { number, list } = this.getMatchedSource(context);
			return `spell.removeItem(${list}, ${number})`;
		}
	}
);

// Remove range of things from list.
// NOTE: `start` is **1-based**.
// NOTE: `end` is inclusive!
//TESTME
parser.addStatement(
	"list_remove_range",
	"remove {identifier} {start:expression} to {end:expression} of {list:expression}",
	class list_remove_position extends Rule.Statement {
		toSource(context) {
			let { start, end, list } = this.getMatchedSource(context);
			return `spell.removeRange(${list}, ${start}, ${end})`;
		}
	}
);


// Remove all instances of something from a list.
//TESTME
parser.addStatement(
	"list_remove",
	"remove {thing:expression} from {list:expression}",
	class list_remove extends Rule.Statement {
		toSource(context) {
			let { thing, list } = this.getMatchedSource(context);
			return `spell.remove(${list}, ${thing})`;
		}
	}
);

// Remove all items from list where condition is true.
// NOTE: we will singularize `identifier` and use that as the argument to `expression`.
//TESTME
parser.addStatement(
	"list_remove_where",
	"remove {identifier} (in|of|from) {list:expression} where {condition:expression}",
	class list_remove_where extends Rule.Statement {
		toSource(context) {
			let { identifier, condition, list } = this.getMatchedSource(context);
			// use singular of identifier for method argument
			let argument = singularize(identifier.toSource(context));
			return `spell.removeWhere(${list}, ${argument} => ${condition})`;
		}
	}
);


//
//	Random (in-place) list manipulation.
//

// Reverse list in-place.
//TESTME
parser.addStatement(
	"list_reverse",
	"reverse {list:expression}",
	class list_reverse extends Rule.Statement {
		toSource(context) {
			let { list } = this.getMatchedSource(context);
			return `spell.reverse(${list})`;
		}
	}
);

// Shuffle list in-place.
//TESTME
parser.addStatement(
	"list_shuffle",
	"(randomize|shuffle) {list:expression}",
	class list_shuffle extends Rule.Statement {
		toSource(context) {
			let { list } = this.getMatchedSource(context);
			return `spell.shuffle(${list})`;
		}
	}
);


// Iteration
//TESTME
parser.addStatement(
	"list_iteration",
	[
		"for (each)? {itemVar:identifier} in {list:expression}:? {statement}?",
		"for (each)? {itemVar:identifier} (and|,) {positionVar:identifier} in {list:expression}:? {statement}?",
	],
	class list_iteration extends Rule.BlockStatement {
		toSource(context) {
			let { itemVar, positionVar, list, statement, block } = this.getMatchedSource(context);
			let output;
			if (positionVar) {
				output = `for (let ${positionVar} = 1, bar; ${itemVar} = ${list}[${positionVar}-1], ${positionVar} <= ${list}.length; ${positionVar}++) `
			}
			else {
				// NOTE: this is relatively slow...  probably doesn't matter...
				output = `for (let ${itemVar} of ${list}) `;
			}
			output += Rule.Block.encloseStatements(statement, block);
			return output;
		}
	}
);


// Range
//TESTME
parser.addExpression(
	"range_expression",
	"range {start:expression} to {end:expression}",
	class range_expression extends Rule.Expression {
		toSource(context) {
			let { start, end } = this.getMatchedSource(context);
			return `spell.getRange(${start}, ${end})`;
		}
	}
);
