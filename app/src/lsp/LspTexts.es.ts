/**
 * The language server's words in Spanish, for a program written in Spanish (epic `spanish` P13).
 * - Spanish nouns have a gender the labels can't know (`una carta`, `un mazo`):
 *   so `{superType}`, `{datatype}` follow a preposition (`subtipo de Cosa`, `de tipo carta`), never an article.
 * - A first draft, for a native speaker to review.
 */

import type { LspTextPack } from "./LspTexts.en"

export const LSP_TEXTS_ES: LspTextPack = {
  ////////////////
  // ## Hover
  ////////////////

  readsAs: "Se lee",
  waits: "Tarda:  lo que la llama espera a que termine.",
  forExample: "p. ej.",
  builtIn: "incorporado:  **{words}** de {type}",
  variable: "variable",
  as: "como",
  alias: "alias",
  type: "plantilla",
  isA: ", subplantilla de {superType}",
  stub: "(esbozo)",
  properties: "propiedades",
  enumerations: "enumeraciones",
  constant: "constante",
  method: "acción",
  function: "función",
  matches: "encaja con",
  or: "o",
  compilesTo: "compila a",
  property: "propiedad",
  ofType: " de {type}",
  aDatatype: "de tipo {datatype}",
  autoDeclared: "declarada donde se asigna por primera vez",
  exclusive: "su {datatype}, de solo lectura:  pertenece a uno solo a la vez",
  declaredIn: "declarado en {where}",

  ////////////////
  // ## Completion
  ////////////////

  statement: "sentencia",
  next: "siguiente",
  spellWordFor: "la palabra de spell para <{tag}>",
  actionTag: 'un botón para una de las acciones del programa:  <acción "jugar solo" />',
  contextMenuTag: "el menú del clic derecho del elemento donde está",
  dividerTag: "una línea entre los grupos de un menú contextual",
  actionOf: "acción de {type}",
  componentTag: "un componente",
  attributeOf: "atributo de <{tag}>",
  appAction: "acción propia de la aplicación",
  typeNamed: "plantilla {name}",
  propertyOf: "propiedad de {types}",

  ////////////////
  // ## Quick fixes
  ////////////////

  define: "Definir `{signature}`",

  // an attribute's value switched between text and code (`LSP.CodeOrText`, epic `editor` T74)
  makeItCode: "Convertir en código",
  makeItText: "Convertir en texto",

  ////////////////
  // ## The Template Explorer's tree
  ////////////////

  imported: "importado",
  notParsed: "sin analizar",
  typeIsA: "subplantilla de {superType}",

  ////////////////
  // ## Picking a value (epic `editor` T61)
  ////////////////

  pickColor: "Elegir un color…",
  pickIcon: "Elegir un icono…"
}
