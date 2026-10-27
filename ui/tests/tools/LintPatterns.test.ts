import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"
import { RuleTester } from "vite-plus/lint/plugins-dev"

import { PATTERN_FOLDERS } from "spell/toolchain/lint"
import { PATTERN_RULES } from "spell/toolchain/lint/patterns"

/**
 * The `spell-ui/*` lint rules (`spell/toolchain/lint/patterns`, the toolchain's):
 * what each flags, and the ALLOW-LIST of the uses that stay.
 * - Here, in `ui`'s node tooling tests:  the patterns are Spell UI's, and so is the allow-list.
 * - A new `// oxlint-disable-next-line spell/ui/...` comment fails "the allow-list" below until it's added there:
 *   every exception is seen in review, with its reason.
 */

////////////////
// ## The rules
////////////////

RuleTester.describe = describe
RuleTester.it = test

const tester = new RuleTester()

describe("spell-ui/no-solid-effect", () => {
  tester.run("no-solid-effect", PATTERN_RULES["no-solid-effect"], {
    valid: [`import { For, Show, createMemo, onCleanup } from "solid-js"`, `import { createEffect } from "./mine"`],
    invalid: [
      { code: `import { createEffect } from "solid-js"`, errors: [{ message: /@E\.onChange/ }] },
      { code: `import { createRenderEffect } from "solid-js"`, errors: [{ message: /@E\.onChange/ }] },
      { code: `import { onSettled } from "solid-js"`, errors: [{ message: /@E\.watches/ }] },
      { code: `import { Show, onMount as mount } from "solid-js"`, errors: [{ message: /onMount\(\)/ }] }
    ]
  })
})

describe("spell-ui/no-mutation-observer", () => {
  tester.run("no-mutation-observer", PATTERN_RULES["no-mutation-observer"], {
    valid: [`new ResizeObserver(() => {})`, { code: `let observer: MutationObserver | undefined`, filename: "a.ts" }],
    invalid: [{ code: `new MutationObserver(() => {})`, errors: [{ message: /@E\.watches/ }] }]
  })
})

describe("spell-ui/no-dom-element-listener", () => {
  tester.run("no-dom-element-listener", PATTERN_RULES["no-dom-element-listener"], {
    valid: [`window.addEventListener("resize", f)`, `this.box.addEventListener("click", f)`],
    invalid: [
      { code: `this.domElement.addEventListener("click", f)`, errors: [{ message: /@E\.on/ }] },
      { code: `domElement.addEventListener("focusout", f)`, errors: [{ message: /@E\.on/ }] }
    ]
  })
})

describe("spell-ui/no-untrack", () => {
  tester.run("no-untrack", PATTERN_RULES["no-untrack"], {
    valid: [`const x = this.untracked`, `E.untracked(f, context)`],
    invalid: [{ code: `const x = untrack(() => this.value)`, errors: [{ message: /@E\.untracked/ }] }]
  })
})

describe("spell-ui/no-raw-timer", () => {
  tester.run("no-raw-timer", PATTERN_RULES["no-raw-timer"], {
    valid: [
      `E.after(0.5, f)`,
      `if (typeof requestAnimationFrame !== "function") return`,
      `this.setTimeout(f)`,
      // a name every object has, not a timer (the rule once looked it up with `in`)
      `valueOf(edit, "light")`
    ],
    invalid: [
      { code: `setTimeout(f, 500)`, errors: [{ message: /E\.after/ }] },
      { code: `window.setInterval(f, 500)`, errors: [{ message: /E\.every/ }] },
      { code: `queueMicrotask(f)`, errors: [{ message: /E\.afterSolidUpdate/ }] },
      { code: `globalThis.requestAnimationFrame(f)`, errors: [{ message: /E\.beforeNextPaint/ }] }
    ]
  })
})

describe("spell-ui/no-function-component", () => {
  tester.run("no-function-component", PATTERN_RULES["no-function-component"], {
    valid: [
      { code: `function NoteBox() { return <div /> }`, filename: "inside.tsx" },
      { code: `export function renderBox() { return <div /> }`, filename: "lower.tsx" },
      { code: `export const FOLDS = "folds"`, filename: "constant.tsx" },
      { code: `export function Parse(text: string) { return text.trim() }`, filename: "no-jsx.tsx" }
    ],
    invalid: [
      { code: `export function NoteBox() { return <div /> }`, filename: "a.tsx", errors: [{ message: /NoteBox/ }] },
      { code: `export const Chevron = () => <svg />`, filename: "b.tsx", errors: [{ message: /Chevron/ }] },
      { code: `export default function Panel() { return <></> }`, filename: "c.tsx", errors: [{ message: /Panel/ }] }
    ]
  })
})

////////////////
// ## The allow-list
////////////////

/**
 * Every `spell-ui/*` rule turned off on purpose in Spell UI's component folders:  `file` (from spell-ui's root), the
 * rule, and the reason its disable comment gives (the comment's text after `--`).
 * - Spell UI's own folders only (`PATTERN_FOLDERS.ui`):  the brand's and the app's are in their own repos, which this
 *   one can't see (epic `repo-split` P8).
 */
const ALLOWED: readonly Allowed[] = [
  {
    file: "src/components/ui-dropdown/SlottedItems.ts",
    rule: "no-solid-effect",
    reason: "a helper class, not a component:  no decorator reaches it"
  },
  {
    file: "src/components/ui-dropdown/SlottedItems.ts",
    rule: "no-mutation-observer",
    reason: "a helper class:  `@E.watches` is for components"
  },
  {
    file: "src/components/ui-form/FormBinding.ts",
    rule: "no-solid-effect",
    reason: "a helper class, not a component:  one effect per bound control, in a root of its own"
  },
  {
    file: "src/components/ui-form/UIForm.tsx",
    rule: "no-mutation-observer",
    reason: "only while connected:  `@E.watches` lasts the element's whole life"
  },
  {
    file: "src/components/ui-form/UIRepeat.tsx",
    rule: "no-mutation-observer",
    reason: "only while connected:  `@E.watches` lasts the element's whole life"
  },
  {
    file: "src/components/ui-item/UIItem.tsx",
    rule: "no-untrack",
    reason: "half-tracked on purpose (above)"
  },
  {
    file: "src/components/ui-menu/UIMenu.tsx",
    rule: "no-untrack",
    reason: "half-tracked on purpose (above)"
  },
  {
    file: "src/components/ui-root/LoaderMessage.ts",
    rule: "no-solid-effect",
    reason: "a static helper drawing plain DOM:  no members to decorate"
  },
  {
    file: "src/components/ui-root/PlaceholderSkeleton.ts",
    rule: "no-solid-effect",
    reason: "a static helper drawing plain DOM:  no members to decorate"
  },
  {
    file: "src/components/ui-root/UIRoot.tsx",
    rule: "no-mutation-observer",
    reason: "only while connected:  `@E.watches` lasts the element's whole life"
  },
  {
    file: "src/components/ui-table/TableClassMirror.ts",
    rule: "no-mutation-observer",
    reason: "a helper class, watching ANOTHER element (the table)"
  },
  {
    file: "src/components/ui-table/UITable.tsx",
    rule: "no-solid-effect",
    reason: "the class mirror's RENDER effect:  a throw must reach the error boundary"
  },
  {
    file: "src/components/ui-table/UITable.tsx",
    rule: "no-mutation-observer",
    reason: "watches the managed TABLE, swapped with it"
  },
  {
    file: "src/components/ui-visibility/UIVisibility.tsx",
    rule: "no-mutation-observer",
    reason: "only while `images` is on and the element connected"
  },
  {
    file: "src/components/ui-toc/UIToc.tsx",
    rule: "no-mutation-observer",
    reason: "watches the FOLLOWED content, another element"
  }
]

describe("spell-ui/* disable comments", () => {
  test("the allow-list:  EVERY disable comment in the component folders is listed, with its reason", () => {
    expect(disableComments()).toEqual(sorted(ALLOWED))
  })

  test("each turns off ONE line, and says why:  `// oxlint-disable-next-line ui/<rule> -- <why>`", () => {
    const loose = componentFiles().flatMap((file) =>
      readFileSync(join(ROOT, file), "utf8")
        .split("\n")
        .filter((line) => /oxlint-disable.*spell-ui\//.test(line) && !NEXT_LINE.test(line))
        .map((line) => `${file}: ${line.trim()}`)
    )
    expect(loose).toEqual([])
  })
})

////////////////
// ## Helpers
////////////////

/** spell-ui's root:  this file is in `tests/tools/`. */
const ROOT = fileURLToPath(new URL("../../", import.meta.url))

/** A disable comment the rules allow:  one line, one rule, a reason. */
const NEXT_LINE = /\/\/ oxlint-disable-next-line spell-ui\/([\w-]+) -- (.+)$/

/** Every `spell-ui/*` disable comment in the component folders, sorted. */
function disableComments(): Allowed[] {
  const found: Allowed[] = []
  for (const file of componentFiles()) {
    for (const line of readFileSync(join(ROOT, file), "utf8").split("\n")) {
      const match = NEXT_LINE.exec(line)
      if (match) found.push({ file, rule: match[1]!, reason: match[2]!.trim() })
    }
  }
  return sorted(found)
}

/** Spell UI's component files the rules cover (`PATTERN_FOLDERS.ui`), tests left out, from spell-ui's root. */
function componentFiles(): string[] {
  return (PATTERN_FOLDERS.ui ?? []).flatMap((folder) =>
    (readdirSync(join(ROOT, folder), { recursive: true }) as string[])
      .filter((path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path))
      .map((path) => relative(ROOT, join(ROOT, folder, path)))
  )
}

/** `list`, by file, then rule, then reason. */
function sorted(list: readonly Allowed[]): Allowed[] {
  const key = ({ file, rule, reason }: Allowed) => `${file}\n${rule}\n${reason}`
  return [...list].sort((a, b) => key(a).localeCompare(key(b)))
}

/** One allowed use:  where, which rule, and why. */
type Allowed = {
  /** from spell-ui's root */
  file: string
  /** the rule's name, without `ui/` */
  rule: string
  /** the disable comment's reason */
  reason: string
}
