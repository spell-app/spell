import { describe, expect, it } from "vite-plus/test"

import { TokenTree } from "spell/ui/components/ui-theme-editor/TokenTree"

/** A tree of `tokens` in group `place`, each token's path its name's parts after `--ui-<place>-`. */
function treeOf(place: string, tokens: string[]) {
  return new TokenTree({
    groups: [{ place, tokens }],
    pathOf: (token) => token.slice(`--ui-${place}-`.length).split("-"),
    labelOf: (group) => group.toUpperCase()
  })
}

describe("TokenTree", () => {
  it("nests a group's tokens by their name's parts;  a branch can be a token too", () => {
    const tree = treeOf("menu", ["--ui-menu-radius", "--ui-menu-segmented", "--ui-menu-segmented-background"])
    const [menu] = tree.roots
    expect(menu!.name).toBe("MENU")
    expect(menu!.children.map((node) => node.name)).toEqual(["radius", "segmented"])
    const segmented = tree.nodes.get("menu/segmented")!
    expect(segmented.token).toBe("--ui-menu-segmented")
    expect(segmented.children.map((node) => node.token)).toEqual(["--ui-menu-segmented-background"])
  })

  it("folds a branch of one child into it, so no level holds a single row", () => {
    const tree = treeOf("menu", ["--ui-menu-item-padding-x", "--ui-menu-radius"])
    expect(tree.roots[0]!.children.map((node) => node.name)).toEqual(["item-padding-x", "radius"])
    expect(tree.nodes.get("menu/item/padding/x")!.token).toBe("--ui-menu-item-padding-x")
  })

  it("filtered():  only the tokens kept, and the branches that hold them", () => {
    const tree = treeOf("menu", ["--ui-menu-radius", "--ui-menu-tab-color", "--ui-menu-tab-weight"])
    const [menu] = tree.filtered((node) => node.token!.includes("weight"))
    expect(menu!.children.map((node) => node.name)).toEqual(["tab"])
    expect(menu!.children[0]!.children.map((node) => node.token)).toEqual(["--ui-menu-tab-weight"])
  })
})
