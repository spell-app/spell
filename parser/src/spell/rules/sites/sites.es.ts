/**
 * The `sites` rule module's Spanish:  the same classes as `sites.en.ts`, in the same order (epic `mockup` P1).
 * - Each word through the glossary, `languages/es/GLOSSARY.md`.
 */
import { Synonyms } from "spell/parser/spell/rules/expressions"
import { SpellParser } from "spell/parser/spell/SpellParser"
import { CreateSite } from "./CreateSite"
import { SiteOverlay } from "./SiteOverlay"
import { SitePage } from "./SitePage"

/** The `sites` rule module, in Spanish. */
export const sitesEs = new SpellParser({ module: "sites" })

/** An indefinite article, either gender:  `un sitio`, `una página`. */
const A = "(un|una)"

// la palabra de un diálogo de un sitio, la primera en español:  `- tiene un diálogo de ajustes`
sitesEs.addRule(Synonyms.specialize({ ruleName: "site_dialog" }), { syntax: "(diálogo|dialogo|modal)" })

// la de un panel lateral:  `- tiene un panel de sintaxis`
sitesEs.addRule(Synonyms.specialize({ ruleName: "site_sidebar" }), { syntax: "(panel|lateral)" })

// un sitio, y dónde vive:  `spell ui es un sitio en "owen@spell/spell-ui":`, `guía galáctica es un sitio en la nube`
sitesEs.addRule(CreateSite, {
  syntax: `{type:type_words} es ${A} {superType:type} (en {address:text}|(cloud:en la nube))? {with_nested_statements}?`,
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "un sitio en la nube, y su página",
          input: [
            'una "portada" es una página',
            "guía galáctica es un sitio en la nube:",
            '\t- tiene una portada en "/"'
          ],
          js: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ],
          ts: [
            "export class Portada extends Page {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "}",
            "",
            "/**",
            " * `<test-sites-portada>`:  a portada, drawn in its own element, e.g. by `draw the portada`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its portada's properties;  its methods call its portada's.",
            " * - What every view's element does, e.g. drawing its portada, is `SpellElement`'s.",
            " */",
            "export class PortadaElement extends SpellElement<Portada> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-portada", "portada", [])',
            "}",
            "core.useElement(Portada, PortadaElement)",
            "export class GuíaGaláctica extends Site {",
            '  static elementTag = core.defineElement(this, "test_sites")',
            "  static pages = [{",
            '    name: "portada",',
            '    page: "Portada",',
            '    address: "/"',
            "  }]",
            '  static livesAt = "cloud"',
            "}",
            "",
            "/**",
            " * `<test-sites-guia-galactica>`:  a guía galáctica, drawn in its own element, e.g. by `draw the guía galáctica`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its guía galáctica's properties;  its methods call its guía galáctica's.",
            " * - What every view's element does, e.g. drawing its guía galáctica, is `SpellElement`'s.",
            " */",
            "export class GuíaGalácticaElement extends SpellElement<GuíaGaláctica> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-sites-guia-galactica", "guía galáctica", [])',
            "}",
            "core.useElement(GuíaGaláctica, GuíaGalácticaElement)",
            "export const guíaGaláctica = new GuíaGaláctica()"
          ]
        }
      ]
    }
  ]
})

// una página del sitio, en su dirección:  `- tiene una página de película en "/peliculas/:pelicula", llamada "Película"`
sitesEs.addRule(SitePage, {
  syntax: `{type:subject_it} tiene ${A} {part:member_words} en {address:text} (, (llamada|llamado) {title:text})? {with_nested_statements}?`
})

// ... sin el sujeto, como se dice en español:  `- tiene una página de película en "/peliculas/:pelicula"`
sitesEs.addRule(SitePage, {
  syntax: `{type:subject_implied} tiene ${A} {part:member_words} en {address:text} (, (llamada|llamado) {title:text})? {with_nested_statements}?`
})

// un diálogo o un panel del sitio:  `- tiene un diálogo de ajustes`, `- tiene un panel de sintaxis`
sitesEs.addRule(SiteOverlay, { syntax: `{type:subject_it} tiene ${A} {part:member_words}` })

// ... sin el sujeto:  `- tiene un diálogo de ajustes`
sitesEs.addRule(SiteOverlay, { syntax: `{type:subject_implied} tiene ${A} {part:member_words}` })

// ... con el nombre entre comillas, como se nombra en español lo que lleva `de`:
// `- tiene una "página de película" en "/peliculas/:película"`
sitesEs.addRule(SitePage, {
  syntax: `{type:subject_it} tiene ${A} {part:quoted_member} en {address:text} (, (llamada|llamado) {title:text})? {with_nested_statements}?`
})
sitesEs.addRule(SitePage, {
  syntax: `{type:subject_implied} tiene ${A} {part:quoted_member} en {address:text} (, (llamada|llamado) {title:text})? {with_nested_statements}?`
})

// ... y un diálogo o un panel:  `- tiene un "diálogo de ajustes"`, `- tiene un "panel de películas"`
sitesEs.addRule(SiteOverlay, { syntax: `{type:subject_it} tiene ${A} {part:quoted_member}` })
sitesEs.addRule(SiteOverlay, { syntax: `{type:subject_implied} tiene ${A} {part:quoted_member}` })
