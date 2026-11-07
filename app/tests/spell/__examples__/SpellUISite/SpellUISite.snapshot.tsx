import { core, Site } from "@spell/core"
import { E, SpellElement } from "@spell/elements"
import { ButtonExample, ButtonUsage, ButtonApi, ButtonTheming } from "@spell/project/@spell/notebooks/Button"
import { ActionExample, ActionUsage, ActionApi, ActionTheming } from "@spell/project/@spell/notebooks/Action"
import { ModalExample, ModalUsage, ModalApi, ModalTheming } from "@spell/project/@spell/notebooks/Modal"
import { AccordionExample, AccordionUsage, AccordionApi, AccordionTheming } from "@spell/project/@spell/notebooks/Accordion"

/**
 * 
 * Spell UI's component pages as one site (epic `mockup` P1).
 * Each component's tabs are notebooks of their own project, imported here:  the site says where each one is, and
 * what the side navigation calls it.  The notebooks say nothing about their addresses, so a page moves here alone.
 * Its first page, a component's Usage tab, is its address;  its other tabs are under it.
 * 
 */
export class SpellUi extends Site {
  static elementTag = core.defineElement(this, "test-project")
  static pages = [{
    name: "button usage page",
    page: "ButtonUsage",
    address: "/button",
    title: "Button",
    pages: [{
      name: "button examples page",
      page: "ButtonExample",
      address: "/button/examples",
      title: "Examples"
    }, {
      name: "button api page",
      page: "ButtonApi",
      address: "/button/api",
      title: "API"
    }, {
      name: "button theming page",
      page: "ButtonTheming",
      address: "/button/theming",
      title: "Theming"
    }]
  }, {
    name: "action usage page",
    page: "ActionUsage",
    address: "/action",
    title: "Action",
    pages: [{
      name: "action examples page",
      page: "ActionExample",
      address: "/action/examples",
      title: "Examples"
    }, {
      name: "action api page",
      page: "ActionApi",
      address: "/action/api",
      title: "API"
    }, {
      name: "action theming page",
      page: "ActionTheming",
      address: "/action/theming",
      title: "Theming"
    }]
  }, {
    name: "modal usage page",
    page: "ModalUsage",
    address: "/modal",
    title: "Modal",
    pages: [{
      name: "modal examples page",
      page: "ModalExample",
      address: "/modal/examples",
      title: "Examples"
    }, {
      name: "modal api page",
      page: "ModalApi",
      address: "/modal/api",
      title: "API"
    }, {
      name: "modal theming page",
      page: "ModalTheming",
      address: "/modal/theming",
      title: "Theming"
    }]
  }, {
    name: "accordion usage page",
    page: "AccordionUsage",
    address: "/accordion",
    title: "Accordion",
    pages: [{
      name: "accordion examples page",
      page: "AccordionExample",
      address: "/accordion/examples",
      title: "Examples"
    }, {
      name: "accordion api page",
      page: "AccordionApi",
      address: "/accordion/api",
      title: "API"
    }, {
      name: "accordion theming page",
      page: "AccordionTheming",
      address: "/accordion/theming",
      title: "Theming"
    }]
  }]
  static dialogs = [{ name: "settings dialog" }]
  static sidebars = [{ name: "syntax sidebar" }]
  static notFoundPage = { name: "not found page" }
  static errorPage = { name: "error page" }
}

/**
 * `<test-project-spell-ui>`:  a spell ui, drawn in its own element, e.g. by `draw the spell ui`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its spell ui's properties;  its methods call its spell ui's.
 * - What every view's element does, e.g. drawing its spell ui, is `SpellElement`'s.
 */
export class SpellUiElement extends SpellElement<SpellUi> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-spell-ui", "spell ui", [])
}
core.useElement(SpellUi, SpellUiElement)
export const spellUi = new SpellUi()

// the docs site's own:  its settings, and the syntax of the language a component page shows

// -----------
if (!core.isCarryingOver) spellUi.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `SpellUiElement` */
      "test-project-spell-ui": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
