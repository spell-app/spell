/**
 * The `sites` rule module's English:  every rule's syntax and tests, in tie-break order (epic `mockup` P1).
 * - `sites.es.ts` registers the same classes in the same order.
 */
import { Synonyms } from "spell/parser/spell/rules/expressions"
import { sites } from "./sites.parser"
import { CreateSite } from "./CreateSite"
import { SiteOverlay } from "./SiteOverlay"
import { SitePage } from "./SitePage"

////////////////
// ## Word rules
////////////////

// the last word of a site's dialog, for `site_overlay`:  `- it has a settings dialog`
sites.addRule(Synonyms.specialize({ ruleName: "site_dialog" }), { syntax: "(dialog|modal)" })

// the last word of a site's sidebar, for `site_overlay`:  `- it has a syntax sidebar`
sites.addRule(Synonyms.specialize({ ruleName: "site_sidebar" }), { syntax: "(sidebar|flyout)" })

////////////////
// ## A site and its parts
////////////////

// a site, and where it lives:  `spell ui is a site at "owen@spell/spell-ui":`, `galaxy guide is a site in the cloud`
sites.addRule(CreateSite, {
  syntax:
    "{type:type_words} is (a|an) {superType:type} (at {address:text}|(cloud:in the cloud))? {with_nested_statements}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "a site, and the pages, dialogs and sidebars under it",
          input: [
            'a "film" is a thing where:',
            '\t- its "title" is text',
            'a "films page" is a page',
            'a "film page" is a page where:',
            "\t- it has a film",
            'galaxy guide is a site at "owen@spell/galaxy":',
            '\t- it has a films page at "/films", named "Films"',
            '\t\t- it has a film page at "/films/:film"',
            "\t- it has a settings dialog",
            "\t- it has a film sidebar"
          ],
          js: [
            "export class Film extends Thing {",
            '  // - its "title" is text',
            '  static { this.declareProp("title", { type: "text" }) }',
            '  get title() { return this.getProp("title") }',
            '  set title(value) { this.setProp("title", value) }',
            "}",
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class FilmPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "",
            "  // - it has a film",
            '  get film() { return this.getProp("film") }',
            '  set film(value) { this.setProp("film", value) }',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    title: "Films",',
            "    pages: [{",
            '      name: "film page",',
            '      page: "FilmPage",',
            '      address: "/films/:film",',
            '      params: ["film"]',
            "    }]",
            "  }]",
            '  static dialogs = [{ name: "settings dialog" }]',
            '  static sidebars = [{ name: "film sidebar" }]',
            '  static livesAt = "owen@spell/galaxy"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class Film extends Thing {",
            '  // - its "title" is text',
            '  @prop({ type: "text" })',
            "  accessor title!: string",
            "}",
            "export class FilmsPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-films-page>`:  a films page, drawn in its own element, e.g. by `draw the films page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its films page's properties;  its methods call its films page's.",
            " * - What every view's element does, e.g. drawing its films page, is `SpellElement`'s.",
            " */",
            "export class FilmsPageElement extends SpellElement<FilmsPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-films-page", "films page", [])',
            "}",
            "core.useElement(FilmsPage, FilmsPageElement)",
            "export class FilmPage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "",
            "  // - it has a film",
            "  @prop() accessor film!: any /* spell: type unknown */",
            "}",
            "",
            "/**",
            " * `<test-sites-film-page>`:  a film page, drawn in its own element, e.g. by `draw the film page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its film page's properties;  its methods call its film page's.",
            " * - What every view's element does, e.g. drawing its film page, is `SpellElement`'s.",
            " */",
            "export class FilmPageElement extends SpellElement<FilmPage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-film-page", "film page", [',
            '    { name: "film", kind: "string", description: "Its film." }',
            "  ])",
            "}",
            "core.useElement(FilmPage, FilmPageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "films page",',
            '    page: "FilmsPage",',
            '    address: "/films",',
            '    title: "Films",',
            "    pages: [{",
            '      name: "film page",',
            '      page: "FilmPage",',
            '      address: "/films/:film",',
            '      params: ["film"]',
            "    }]",
            "  }]",
            '  static dialogs = [{ name: "settings dialog" }]',
            '  static sidebars = [{ name: "film sidebar" }]',
            '  static livesAt = "owen@spell/galaxy"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "in the cloud",
          input: ['a "home page" is a page', "galaxy guide is a site in the cloud:", '\t- it has a home page at "/"'],
          js: [
            "export class HomePage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "home page",',
            '    page: "HomePage",',
            '    address: "/"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const galaxyGuide = new GalaxyGuide()"
          ],
          ts: [
            "export class HomePage extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-home-page>`:  a home page, drawn in its own element, e.g. by `draw the home page`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its home page's properties;  its methods call its home page's.",
            " * - What every view's element does, e.g. drawing its home page, is `SpellElement`'s.",
            " */",
            "export class HomePageElement extends SpellElement<HomePage> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-home-page", "home page", [])',
            "}",
            "core.useElement(HomePage, HomePageElement)",
            "export class GalaxyGuide extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "home page",',
            '    page: "HomePage",',
            '    address: "/"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.",
            " * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.",
            " */",
            "export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-galaxy-guide", "galaxy guide", [])',
            "}",
            "core.useElement(GalaxyGuide, GalaxyGuideElement)",
            "export const galaxyGuide = new GalaxyGuide()"
          ]
        },
        {
          title: "not a site:  an app is `create_one_of_a_kind`'s",
          input: ["solitaire is an app"],
          js: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_sites", "App")',
            "}",
            "export const solitaire = new Solitaire()"
          ],
          ts: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_sites", "App")',
            "}",
            "",
            "/**",
            " * `<test-sites-app>`:  a solitaire, drawn in its own element, e.g. by `draw the solitaire`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitaire's properties;  its methods call its solitaire's.",
            " * - What every view's element does, e.g. drawing its solitaire, is `SpellElement`'s.",
            " */",
            "export class SolitaireElement extends SpellElement<Solitaire> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-app", "solitaire", [])',
            "}",
            "core.useElement(Solitaire, SolitaireElement)",
            "export const solitaire = new Solitaire()"
          ]
        }
      ]
    }
  ]
})

// a page of a site, at its address:  `- it has a film page at "/films/:film", named "Film"`
sites.addRule(SitePage, {
  syntax:
    "{type:subject_it} has (a|an) {part:member_words} at {address:text} (, named {title:text})? {with_nested_statements}?"
})

// ... with the subject left out:  `- has a film page at "/films/:film"`
sites.addRule(SitePage, {
  syntax:
    "{type:subject_implied} has (a|an) {part:member_words} at {address:text} (, named {title:text})? {with_nested_statements}?"
})

// a dialog or a sidebar of a site:  `- it has a settings dialog`, `- it has a syntax sidebar`
sites.addRule(SiteOverlay, { syntax: "{type:subject_it} has (a|an) {part:member_words}" })

// ... with the subject left out:  `- has a settings dialog`
sites.addRule(SiteOverlay, { syntax: "{type:subject_implied} has (a|an) {part:member_words}" })

// ... its name quoted, for a page named with `of` in it:  `- it has a "page of films" at "/films"`
sites.addRule(SitePage, {
  syntax:
    "{type:subject_it} has (a|an) {part:quoted_member} at {address:text} (, named {title:text})? {with_nested_statements}?"
})
sites.addRule(SitePage, {
  syntax:
    "{type:subject_implied} has (a|an) {part:quoted_member} at {address:text} (, named {title:text})? {with_nested_statements}?"
})

// ... and a dialog or sidebar's:  `- it has a "dialog of settings"`
sites.addRule(SiteOverlay, { syntax: "{type:subject_it} has (a|an) {part:quoted_member}" })
sites.addRule(SiteOverlay, { syntax: "{type:subject_implied} has (a|an) {part:quoted_member}" })
