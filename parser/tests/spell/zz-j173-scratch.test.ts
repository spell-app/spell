import { test } from "vite-plus/test"
import { spellParser } from "spell/parser/spell"
test("tok", () => {
  const toks = (spellParser as any).tokenize("which aren't 1 and don't have x")
  console.log(JSON.stringify(toks, null, 0))
})
