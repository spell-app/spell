/**
 * The `sites` rule module's English:  every rule's syntax and tests, in tie-break order (epic `mockup` P1).
 * - `sites.es.ts` registers the same classes in the same order.
 */
import { Synonyms, Wording } from "spell/parser/spell/rules/expressions"
import { sites } from "./sites.parser"
import { CreateSite } from "./CreateSite"
import { SiteOverlay } from "./SiteOverlay"
import { SitePage } from "./SitePage"
import { ShowSitePart } from "./ShowSitePart"
import { SiteAddressOf } from "./SiteAddressOf"
import { SitePartWords } from "./SitePartWords"

/** What a page's line may say after its address:  what the navigation calls it, its tab, how far along it is, its picture. */
const PAGE_DETAILS = "(, named {title:text})? (, tab {tab:text})? (, {state:site_page_state})? (, pictured in {picture:text})?"

/** What any part's line may end with:  its place in its section of the site editor's board, and its colour there. */
const CARD_DETAILS = "(, in row {row:number} column {column:number})? (, (colored|coloured) {color:site_card_color})?"

////////////////
// ## Word rules
////////////////

// the last word of a site's dialog, for `site_overlay`:  `- it has a settings dialog`
sites.addRule(Synonyms.specialize({ ruleName: "site_dialog" }), { syntax: "(dialog|modal)" })

// the last word of a site's sidebar, for `site_overlay`:  `- it has a syntax sidebar`
sites.addRule(Synonyms.specialize({ ruleName: "site_sidebar" }), { syntax: "(sidebar|flyout)" })

// what state a site's page is in, last on its line:  `- it has a films page at "/films", old` (epic `mockup` P13, T14)
sites.addRule(Wording.specialize({ ruleName: "site_page_state", meanings: ["old", "new", "mocked", "built"] }), {
  syntax: "((old:old)|(new:new)|(mocked:mocked)|(built:built))"
})

// the colour of a part's card on the site editor's board, one of Spell UI's:  `- it has a films page at "/films", colored blue`
sites.addRule(
  Wording.specialize({
    ruleName: "site_card_color",
    meanings: ["red", "orange", "yellow", "olive", "green", "teal", "blue", "violet", "purple", "pink", "brown", "grey"]
  }),
  {
    syntax:
      "((red:red)|(orange:orange)|(yellow:yellow)|(olive:olive)|(green:green)|(teal:teal)|(blue:blue)|(violet:violet)|(purple:purple)|(pink:pink)|(brown:brown)|(grey:grey))"
  }
)

// the words naming a site's part, `of` / `de` included (epic `mockup` P3, T5)
sites.addRule(SitePartWords, {
  tests: [
    {
      tests: [
        { title: "a name", input: "film page", js: "filmPage" },
        { title: "joined by of", input: "list of films page", js: "listOfFilmsPage" },
        { title: "of before an article ends it", input: "page of the", js: "page" }
      ]
    }
  ]
})

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
  syntax: `{type:subject_it} has (a|an) {part:site_part_words} at {address:text} ${PAGE_DETAILS} ${CARD_DETAILS} {with_nested_statements}?`
})

// ... with the subject left out:  `- has a film page at "/films/:film"`
sites.addRule(SitePage, {
  syntax: `{type:subject_implied} has (a|an) {part:site_part_words} at {address:text} ${PAGE_DETAILS} ${CARD_DETAILS} {with_nested_statements}?`
})

// a dialog or a sidebar of a site:  `- it has a settings dialog`, `- it has a syntax sidebar`
sites.addRule(SiteOverlay, { syntax: `{type:subject_it} has (a|an) {part:site_part_words} ${CARD_DETAILS}` })

// ... with the subject left out:  `- has a settings dialog`
sites.addRule(SiteOverlay, { syntax: `{type:subject_implied} has (a|an) {part:site_part_words} ${CARD_DETAILS}` })

// ... its name quoted, as any name may be:  `- it has a "page of films" at "/films"`
sites.addRule(SitePage, {
  syntax: `{type:subject_it} has (a|an) {part:quoted_member} at {address:text} ${PAGE_DETAILS} ${CARD_DETAILS} {with_nested_statements}?`
})
sites.addRule(SitePage, {
  syntax: `{type:subject_implied} has (a|an) {part:quoted_member} at {address:text} ${PAGE_DETAILS} ${CARD_DETAILS} {with_nested_statements}?`
})

// ... and a dialog or sidebar's:  `- it has a "dialog of settings"`
sites.addRule(SiteOverlay, { syntax: `{type:subject_it} has (a|an) {part:quoted_member} ${CARD_DETAILS}` })
sites.addRule(SiteOverlay, { syntax: `{type:subject_implied} has (a|an) {part:quoted_member} ${CARD_DETAILS}` })

////////////////
// ## Its not found and error pages (epic `mockup` P2)
////////////////

// a site's page for an address it has no page for:  `- it has a not found page`
sites.addRule(Wording.specialize({ ruleName: "site_not_found_page", meanings: [] }), {
  syntax: "(not found page|missing page)"
})

// a site's page for a page that failed:  `- it has an error page`
sites.addRule(Wording.specialize({ ruleName: "site_error_page", meanings: [] }), {
  syntax: "(error page|failure page)"
})

// `not` can't be in a member's name, so each has a line of its own:
// `- it has a not found page` (Spanish's `de` can't either:  `página de error`)
sites.addRule(SiteOverlay, { syntax: `{type:subject_it} has (a|an) {part:site_not_found_page} ${CARD_DETAILS}` })
sites.addRule(SiteOverlay, { syntax: `{type:subject_implied} has (a|an) {part:site_not_found_page} ${CARD_DETAILS}` })
sites.addRule(SiteOverlay, { syntax: `{type:subject_it} has (a|an) {part:site_error_page} ${CARD_DETAILS}` })
sites.addRule(SiteOverlay, { syntax: `{type:subject_implied} has (a|an) {part:site_error_page} ${CARD_DETAILS}` })

////////////////
// ## Going to its pages (epic `mockup` P2)
////////////////

// go to a page, its parameter filled:  `go to the film page for this film`
sites.addRule(ShowSitePart, { syntax: "go to the {part:site_part_words} ((for|with) {thing:expression})?" })
sites.addRule(ShowSitePart, { syntax: "go to the {part:quoted_member} ((for|with) {thing:expression})?" })

// show a page, or open a dialog or sidebar:  `show the film page with this film`, `show the settings dialog`
sites.addRule(ShowSitePart, { syntax: "show the {part:site_part_words} ((for|with) {thing:expression})?" })
sites.addRule(ShowSitePart, { syntax: "show the {part:quoted_member} ((for|with) {thing:expression})?" })

// close an open dialog or sidebar:  `close the review dialog` (epic `mockup` P8)
sites.addRule(ShowSitePart, { syntax: "(close:close) the {part:site_part_words}" })
sites.addRule(ShowSitePart, { syntax: "(close:close) the {part:quoted_member}" })

// a page's address, for a link:  `the address of the film page for this film`
sites.addRule(SiteAddressOf, { syntax: "the address of the {part:site_part_words} ((for|with) {thing:expression})?" })
