import { describe, expect, test } from "vite-plus/test"
import { P } from "spell/parser/parser"

/** A list of `{ name, aka? }` records, keyed by name in lower case, with an alias. */
function list() {
  return new P.ScopeList<{ name: string; aka?: string }>({
    keyProp: "name",
    aliasProp: "aka",
    normalizeKey: (key) => key.toLowerCase()
  })
}

describe("ScopeList get(), through its index", () => {
  test("finds each key's FIRST item, normalized, as a look through them all did", () => {
    const items = list()
    const first = { name: "Card" }
    items.add(first, { name: "card" }, { name: "Pile" })
    expect(items.get("CARD")).toBe(first)
    expect(items.get("pile")?.name).toBe("Pile")
    expect(items.get("deck")).toBeUndefined()
  })

  test("an item added after a lookup is found too, and doesn't take an earlier one's key", () => {
    const items = list()
    const first = { name: "Card" }
    items.add(first)
    expect(items.get("card")).toBe(first)
    const pile = { name: "Pile" }
    items.add(pile, { name: "CARD" })
    expect(items.get("pile")).toBe(pile)
    expect(items.get("card")).toBe(first)
  })

  test("replace():  the new item is found, not the one it replaced", () => {
    const items = list()
    items.add({ name: "Card" })
    expect(items.get("card")).toBeDefined()
    const card = { name: "card" }
    items.replace(card)
    expect(items.get("Card")).toBe(card)
  })

  test("an alias finds an item after every key, even one set after it was added (`TypeScope.claim()`)", () => {
    const items = list()
    const bank = { name: "BankAccount" } as { name: string; aka?: string }
    items.add(bank, { name: "Account" })
    expect(items.get("account")?.name).toBe("Account")
    bank.aka = "Savings"
    expect(items.get("savings")).toBe(bank)
  })
})
