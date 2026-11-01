/// <reference types="node" />

import { beforeAll, describe, expect, test } from "vite-plus/test"

import { StaticRender } from "spell/ui/static"
import { UITreeDiagram } from "spell/ui/components/ui-tree-diagram/UITreeDiagram"
import { UITreeNode } from "spell/ui/components/ui-tree-diagram/UITreeNode"

describe("<ui-tree-diagram> static render", () => {
  beforeAll(() => {
    StaticRender.define(UITreeDiagram, UITreeNode)
  })

  test("draws nested tags with nothing to measure with:  sized from character counts", () => {
    const html = StaticRender.fragment(
      `<ui-tree-diagram><ui-tree-node label="Root"><ui-tree-node label="Child"></ui-tree-node></ui-tree-node></ui-tree-diagram>`
    )
    expect(html).toContain("Root")
    expect(html).toContain("Child")
    expect(html).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/)
  })
})
