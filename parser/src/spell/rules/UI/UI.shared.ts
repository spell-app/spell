import { SPELL_COLORS } from "spell/util"
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"

/**
 * What `alert`, `warn` and `confirm` hand the core after their message (epic `language` T143, T144).
 * - Only buttons written:  their texts, one by one, as before titles and sizes came in,
 *   so `alert "Yo!" with "yep"` still compiles to `core.alert("Yo!", "yep")`.
 * - A title or a size written:  ONE options object, the buttons in it too,
 *   e.g. `core.alert("You won!", { title: "Solitaire", size: "big", okText: "New game" })`.
 * - `size` is its word rule's MEANING (`text_size`), so `en texto grande` compiles as `in big text` does.
 */
export function dialogArguments(match: P.Match, groups: DialogGroups): P.ASTExpression[] {
  const { message, title, size, okButton, cancelButton } = groups
  const expression = (group: P.AnyMatch) => P.asAST<P.ASTExpression>(group.AST)
  const args = [expression(message)]
  const sizeWord = Wording.meaningOf(size)
  if (!title && !sizeWord) {
    if (okButton) args.push(expression(okButton))
    if (cancelButton) args.push(expression(cancelButton))
    return args
  }
  const options = new P.ASTObjectLiteral(match)
  if (title) options.addProp("title", expression(title))
  if (sizeWord) options.addProp("size", new P.ASTStringLiteral(match, { value: sizeWord, quote: '"' }))
  if (okButton) options.addProp("okText", expression(okButton))
  if (cancelButton) options.addProp("cancelText", expression(cancelButton))
  args.push(options)
  return args
}

/** The groups a dialog statement matched, each optional but its message. */
export type DialogGroups = {
  /** what it says */
  message: P.AnyMatch
  /** `titled "Solitaire"`:  its heading */
  title?: P.AnyMatch
  /** `in big text`:  its message's size (`text_size`) */
  size?: P.Match
  /** `with "New game"`:  the ok button's words */
  okButton?: P.AnyMatch
  /** `confirm`'s `... and "Not now"`:  the cancel button's words */
  cancelButton?: P.AnyMatch
}

/** The sizes a dialog's message may be, Spell UI's size words:  `text_size`'s meanings. */
export const TEXT_SIZES = ["small", "big", "huge"]

////////////////
// ## Sounds and videos, by name (epic `language` P65)
////////////////

/** What a program plays:  `media_kind`'s meanings, the core's `MediaKind`. */
export const MEDIA_KINDS = ["sound", "video"]

/**
 * SIDE EFFECT:  notes that `scope`'s project has a sound or video named `name`, so its words read as that name without
 * quotes (`play the card slide sound`) and `sound "card slide"` isn't refused (`hasMediaNamed()`).
 * - Noted where it's named:  `sound "card slide" is at "..."`, `its "card slide" is a sound at "..."`,
 *   `<sound "card slide" source="..." />`.
 * - Names only ever join, as menus' do (`noteMenuName()`):  a name renamed in an editor still counts until a fresh parse.
 */
export function noteMediaName(scope: P.Scope, name: string): void {
  const project = projectOf(scope)
  let names = MEDIA_NAMES.get(project)
  if (!names) MEDIA_NAMES.set(project, (names = new Set()))
  names.add(mediaNameKey(name))
}

/** Has `scope`'s project a sound or video named `name` (`noteMediaName()`)?  Any case or spacing. */
export function hasMediaNamed(scope: P.Scope, name: string): boolean {
  return !!MEDIA_NAMES.get(projectOf(scope))?.has(mediaNameKey(name))
}

/** Every sound and video name `scope`'s project has, as `mediaNameKey()` writes them. */
export function mediaNamesIn(scope: P.Scope): ReadonlySet<string> {
  return MEDIA_NAMES.get(projectOf(scope)) ?? new Set()
}

/**
 * Each project's sound and video names, as `mediaNameKey()` writes them.
 * - REFACTOR:  one `ProjectNames` for these and the menus' (`noteMenuName()`, `JSX.shared.ts`), keyed by what they name.
 */
const MEDIA_NAMES = new WeakMap<P.Scope, Set<string>>()

/**
 * A sound or video's name as the core finds it, any case or spacing:  `Card Slide`, `card-slide` => `card slide`.
 * - The core's own `keyOf()`, in its `media.ts`:  a copy, as spell never imports the core's code.
 */
export function mediaNameKey(name: string): string {
  return `${name}`
    .trim()
    .replace(/[\s_-]+/g, " ")
    .toLowerCase()
}

/**
 * The event a sound or video sends, by its name, kind and what happened:  `card-slide-sound-ends`.
 * - The core's own `mediaEventName()`, in its `media.ts`:  a copy, as spell never imports the core's code.
 */
export function mediaEventName(name: string, kind: string, happened: string): string {
  return `${mediaNameKey(name).replaceAll(" ", "-")}-${kind}-${happened}`
}

/** The project `scope` is in;  `scope` itself when it's in none (a rule's own test). */
function projectOf(scope: P.Scope): P.Scope {
  let at: P.Scope | undefined = scope
  while (at && !(at instanceof P.ProjectScope)) at = at.parentScope
  return at ?? scope
}

////////////////
// ## Colour words
////////////////

/** One of Spell UI's colours, by its hue name:  `red`, `grey` ... */
export type SpellColor = (typeof SPELL_COLORS)[number]

/**
 * Each language's words for Spell UI's colours (epic `language` T114):  the ONE list every colour a program says reads,
 * `notify ... in red` and a site's `colored blue` alike.
 * - Its forms, `|` between them, longest first where one starts another (`verde oliva` before `verde`).
 * - In the order a syntax tries them, so the same order in every language.
 */
export const COLOR_WORDS: Record<"en" | "es", Record<SpellColor, string>> = {
  en: {
    red: "red",
    orange: "orange",
    yellow: "yellow",
    olive: "olive",
    teal: "teal",
    green: "green",
    blue: "blue",
    violet: "violet",
    purple: "purple",
    pink: "pink",
    brown: "brown",
    grey: "grey|gray",
    black: "black"
  },
  es: {
    red: "rojo|roja",
    orange: "naranja",
    yellow: "amarillo|amarilla",
    olive: "verde oliva|oliva",
    teal: "verde azulado|turquesa",
    green: "verde",
    blue: "azul",
    violet: "violeta",
    purple: "morado|morada|púrpura|purpura",
    pink: "rosa",
    brown: "marrón|marron",
    grey: "gris",
    black: "negro|negra"
  }
}

/** A word rule's syntax for `colors` in `language`, each form's group its colour:  `((red:red)|...|(grey:grey|gray))`. */
export function colorWordsSyntax(
  language: keyof typeof COLOR_WORDS,
  colors: readonly SpellColor[] = SPELL_COLORS
): string {
  const words = COLOR_WORDS[language]
  const forms = (Object.keys(words) as SpellColor[]).filter((color) => colors.includes(color))
  return `(${forms.map((color) => `(${color}:${words[color]})`).join("|")})`
}

/** The colours a site's board gives its cards:  Spell UI's, but black (epic `mockup`). */
export const BOARD_COLORS: SpellColor[] = SPELL_COLORS.filter((color) => color !== "black")
