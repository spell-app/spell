/**
 * The `expressions` rule module:  Spell's boolean, comparison and type-check expression suffixes.
 * - e.g. `and`, `or`, `is`, `is a`, `includes`, `is empty`, string-case conversion, type coercion
 * - Also its base classes:
 *   - `InfixOperatorSuffix` / `PostfixOperatorSuffix`:  every operator-suffix rule here extends one
 *   - `CompoundExpression`:  combines them, with the shunting-yard algorithm
 *   - `SpellExpression`
 *   - and the WORD RULES:  `Wording`, `Synonyms`, `Negatable`
 * - One rule class per file;  `expressions.en.ts` registers them on `expressions` (`expressions.parser.ts`),
 *   and each other language's `expressions.<lang>.ts` registers the same rules in its own words.
 *   The base classes register nothing themselves.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./expressions.parser"
export * from "./expressions.shared"
export * from "./SpellExpression"
export * from "./Wording"
export * from "./Synonyms"
export * from "./Negatable"
export * from "./InfixOperatorSuffix"
export * from "./PostfixOperatorSuffix"
export * from "./ParenthesizedExpression"
export * from "./CompoundExpression"
export * from "./ArithmeticExpression"
export * from "./And"
export * from "./Or"
export * from "./IsEqual"
export * from "./IsExactly"
export * from "./IsA"
export * from "./IsSameTypeAs"
export * from "./IsIn"
export * from "./Includes"
export * from "./DoesNotInclude"
export * from "./IsDefined"
export * from "./Exists"
export * from "./ThereIsA"
export * from "./IsEmpty"
export * from "./AsUppercase"
export * from "./AsLowercase"
export * from "./AsAType"
export * from "./HexDigits"
export * from "./HexLiteral"
export * from "./UnicodeCode"
export * from "./UnicodeOffset"
export * from "./UnicodeLiteral"
export * from "./UnicodeExpression"
