/**
 * The `methods` rule module:  dynamic method definitions (`to foo ...`, `animation ...`) and their call sites,
 * quoted ad-hoc expressions on a type (`a thing "..." if`), and the method-signature / method-arg rules they share.
 * - A definition registers its call-site rule as it parses:  a `DynamicMethodRule`, `MethodPostfixRule` or
 *   `MethodInfixRule`, `specialize()`d -- see `MethodDefinition.getRule()`.
 * - One rule class per file;  `methods.en.ts` registers them on `methods` (`methods.parser.ts`),
 *   and each other language's `methods.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./methods.parser"
export * from "./methods.shared"
export * from "./DynamicMethodRule"
export * from "./MethodPostfixRule"
export * from "./MethodInfixRule"
export * from "./MethodDefinition"
export * from "./MethodKeyword"
export * from "./VarMethodArg"
export * from "./ValuedVarMethodArg"
export * from "./TypeMethodArg"
export * from "./BareTypeArg"
export * from "./TypedMethodArg"
export * from "./WithPropsArg"
export * from "./MethodSignature"
export * from "./QuotedSignatureWords"
export * from "./QuotedMethodSignature"
export * from "./ToDoSomething"
export * from "./CreateAnimation"
export * from "./QuotedTypeExpression"
