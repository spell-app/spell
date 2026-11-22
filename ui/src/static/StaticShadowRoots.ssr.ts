import { UIT } from "spell/ui/core"
import { SSR } from "spell/ui/static"

/****************
 * ### `StaticShadowRoots`
 * Puts each rendered `ui-*` element's view into its own shadow root, written as a declarative
 * `<template shadowrootmode="open">`:  the static render's SHADOW output (`StaticRender.page(html, { output: "shadow" })`).
 * - The page paints styled before any script;
 *   when the elements start, each one hydrates what's there (`UIComponent`, "Server-drawn shadow roots").
 * - Unlike the light output (`StaticFlattener`), nothing moves:  the element keeps its tag, its attributes and its
 *   children, which its slots take as they would in a browser.
 * - Per root, first:  a `<link>` per sheet it adopts in a browser, in the same order (`StaticStylesheet.shadowLinks()`),
 *   the same address for every root that adopts it, so the browser fetches and parses each once.
 * - Leaves out a family whose shadow root assigns its slots by hand (`slotAssignment: "manual"`):
 *   no template can say so, so it draws in the page as before.
 * - What a browser can't be told in markup is left to the element:  its custom states, and its internals' ARIA.
 * - Node only (`spell/ui/static`), plain DOM on linkedom:  NEVER imported by a component or `spell-ui`.
 ****************/
export class StaticShadowRoots {
  /** Give every view's element its shadow root;  `sheets`:  where the linked sheets are. */
  static attach(document: Document, views: readonly SSR.StaticView[], sheets: SSR.ShadowSheets) {
    for (const view of views) StaticShadowRoots.attachOne(document, view, sheets)
  }

  /** Does `family`'s shadow root take a declarative template?  Not when it assigns its slots by hand. */
  static takes(family: SSR.StaticFamily): boolean {
    return family.Class.prototype.elementSetup.slotAssignment !== "manual"
  }

  /** One element's template, first among its children. */
  private static attachOne(
    document: Document,
    { element, family, html, sheetNames }: SSR.StaticView,
    sheets: SSR.ShadowSheets
  ) {
    const { delegatesFocus } = family.Class.prototype.elementSetup
    const template = document.createElement("template")
    template.setAttribute("shadowrootmode", "open")
    if (delegatesFocus) template.setAttribute("shadowrootdelegatesfocus", "")
    const links = SSR.StaticStylesheet.shadowLinks(family, sheetNames ?? [])
      .map((file) => `<link rel="stylesheet" href="${sheets.href}${file}">`)
      .join("")
    // the view parsed on its own first:  linkedom keeps a template's content out of reach of queries
    const view = document.createElement("div")
    view.innerHTML = html
    // the light output's mark for the flattener:  nothing reads it here
    for (const control of view.querySelectorAll(`[${UIT.STATIC_CONTROL}]`)) control.removeAttribute(UIT.STATIC_CONTROL)
    template.innerHTML = links + view.innerHTML
    element.insertBefore(template, element.firstChild)
  }
}
