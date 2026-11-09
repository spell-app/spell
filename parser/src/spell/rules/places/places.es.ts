/**
 * The `places` rule module's Spanish:  the same classes as `places.en.ts`, in the same order.
 * - Each word through the glossary, `languages/es/GLOSSARY.md`.
 * - What agrees with its noun takes every form (`ninguno`, `ninguna`), and the agreement warning says which it should be.
 */
import type { P } from "spell/parser/parser"
import { Negatable, Synonyms, Wording } from "spell/parser/spell/rules/expressions"
import { SpellParser } from "spell/parser/spell/SpellParser"
import { InOneGo } from "./InOneGo"
import { CancelAction } from "./CancelAction"
import { DiscardDraft } from "./DiscardDraft"
import { AccountIncluded } from "./AccountIncluded"
import { CheckedAt } from "./CheckedAt"
import { KeptOnDevice } from "./KeptOnDevice"
import { CheckedEvery } from "./CheckedEvery"
import { CollectionAt } from "./CollectionAt"
import { CreatePlace } from "./CreatePlace"
import { StoredOnThisDevice } from "./StoredOnThisDevice"
import { DraftOf } from "./DraftOf"
import { FieldCalled } from "./FieldCalled"
import { FirstFewWhere } from "./FirstFewWhere"
import { HelpfulWord } from "./HelpfulWord"
import { IdColumn } from "./IdColumn"
import { KeyIfSet } from "./KeyIfSet"
import { KeyIsSecret } from "./KeyIsSecret"
import { KeyWritten } from "./KeyWritten"
import { ListsUnder } from "./ListsUnder"
import { LoadThings } from "./LoadThings"
import { NumberOfThingsWhere } from "./NumberOfThingsWhere"
import { OperationAt } from "./OperationAt"
import { PictureAt } from "./PictureAt"
import { ProjectedFields } from "./ProjectedFields"
import { ProjectedInto } from "./ProjectedInto"
import { ProjectedOnlyWhere } from "./ProjectedOnlyWhere"
import { ProjectionOf } from "./ProjectionOf"
import { MostRowsEach } from "./MostRowsEach"
import { RowsAllowedEach } from "./RowsAllowedEach"
import { ConfirmedJoin } from "./ConfirmedJoin"
import { RowsOnlyFrom } from "./RowsOnlyFrom"
import { SignUpsFrom } from "./SignUpsFrom"
import { CurrentPerson, PeopleHere, SignInMenu, TheirField } from "./PeopleWords"
import { TheyAre } from "./TheyAre"
import { WhereField } from "./WhereField"
import {
  IfThatFails,
  IfThatFailsSay,
  IfThereAreNone,
  ShowItAllIn,
  ShowThemAll,
  ShowThemAtATime,
  ShowThemIn,
  ShowThemPaged,
  WhileWaiting
} from "./ReadRider"
import { ReloadThings } from "./ReloadThings"
import { SaveDraft } from "./SaveDraft"
import { SavedInPlace } from "./SavedInPlace"
import { SavedInTheCloud } from "./SavedInTheCloud"
import { SearchedFields } from "./SearchedFields"
import { SearchesWith } from "./SearchesWith"
import { SearchesEverything } from "./SearchesEverything"
import { RequestsASecond } from "./RequestsASecond"
import { EveryThingMatching } from "./EveryThingMatching"
import { SearchedAt } from "./SearchedAt"
import { CollectionSearchedWith } from "./CollectionSearchedWith"
import { AskedBy } from "./AskedBy"
import { ThereAreThings } from "./ThereAreThings"
import { ThingWithId } from "./ThingWithId"
import { TotalOf } from "./TotalOf"
import { TryAgain } from "./TryAgain"
import { VersionsIn } from "./VersionsIn"
import { NextPageIn } from "./NextPageIn"
import { NextPageInLink } from "./NextPageInLink"
import { NextPageByOffset } from "./NextPageByOffset"
import { NextPageByNumber } from "./NextPageByNumber"
import { NextPageByLastId } from "./NextPageByLastId"
import { FiltersBy } from "./FiltersBy"
import { SortsBy } from "./SortsBy"
import { GivesFieldsNamedIn } from "./GivesFieldsNamedIn"
import { IsReadOnly } from "./IsReadOnly"
import { RowsIn } from "./RowsIn"
import { ListsGiveOnly } from "./ListsGiveOnly"
import { PageSizeIs } from "./PageSizeIs"
import { WritesLike } from "./WritesLike"

/** The Spanish of the `places` rule module. */
export const placesEs = new SpellParser({ module: "places" })

const A = "(un|una)"
const THE = "(el|la|los|las)"

/** `hay menos de 2 recetas donde ...`, `no hay recetas`:  see `ThereAreThings`. */
const THERE_ARE =
  "(none:no)? hay {compare:there_are_how_many}? (one:un|una|uno)? {count:number}? ({type:known_type}|{list:member_words})"

/**
 * A rule test's known type, for a list under it (`ListsUnder`).
 * - `Scope.types` is typed narrowly (`ScopeList<TypeScope>`):  the concrete `RootScope` accepts plain `TypeScopeProps` too.
 */
function addPublicacion(scope: P.Scope) {
  ;(scope as P.RootScope).types.add({ name: "Publicación" })
}

/** A rule test's private sign-up sheet, in a space, for a projection of it (`ProjectionOf`). */
function addHojaDeInscripcion(scope: P.Scope) {
  scope.compile('hoja de inscripción es una carpeta de datos en "@rs/picnic-privado/inscripciones"', "block")
}

placesEs.addRule(
  Wording.specialize({
    ruleName: "place_kind",
    meanings: [
      "web_server",
      "graphql_server",
      "data_folder",
      "file",
      "room",
      "sheet",
      "excel_file",
      "google_sheet",
      "airtable",
      "atmosphere_space",
      "atmosphere_account"
    ]
  }),
  {
    syntax:
      "((web_server:servidor web)|(graphql_server:servidor graphql)|(data_folder:carpeta de datos)|(excel_file:archivo de excel/i)|(file:archivo)|(room:sala)|(google_sheet:hoja de google)|(sheet:hoja de cálculo|hoja)|(airtable:airtable)|(atmosphere_space:espacio de atmosphere/i)|(atmosphere_account:cuenta de atmosphere/i|atmosphere/i))"
  }
)

placesEs.addRule(
  Wording.specialize({ ruleName: "place_kind_here", meanings: ["database_on_this_device", "in_memory_database"] }),
  {
    syntax:
      "((database_on_this_device:base de datos en este dispositivo)|(in_memory_database:base de datos en memoria))"
  }
)

placesEs.addRule(
  Wording.specialize({ ruleName: "place_kind_each_person", meanings: ["personal_atmosphere_account"] }),
  { syntax: "(personal_atmosphere_account:cuenta personal de atmosphere/i|atmosphere/i personal)" }
)

placesEs.addRule(Negatable.specialize({ ruleName: "are_or_are_not" }), { syntax: "(es|está|(negated:no es|no está))" })

placesEs.addRule(Synonyms.specialize({ ruleName: "each_persons_own" }), { syntax: "personal" })

placesEs.addRule(CreatePlace, {
  syntax: `{type:type_words} es ${A} {kind:place_kind} {personal:each_persons_own}? (en|desde) {address:text} {with_nested_statements}?`,
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'recetario familiar es un servidor web en "https://api.example.com/v1"',
          [
            "export class RecetarioFamiliar extends Place {}",
            "export const recetarioFamiliar = core.place(new RecetarioFamiliar(), {",
            '  name: "recetario_familiar",',
            '  kind: "web server",',
            '  at: "https://api.example.com/v1",',
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(CreatePlace, {
  syntax: `{type:type_words} es ${A} {superType:type} (en|desde) {address:text} {with_nested_statements}?`
})
placesEs.addRule(CreatePlace, { syntax: `{type:type_words} es ${A} {kind:place_kind_here} {with_nested_statements}?` })
placesEs.addRule(CreatePlace, {
  syntax: `{type:type_words} es ${A} {kind:place_kind_each_person} ((en|desde) {address:text})? {with_nested_statements}?`
})
placesEs.addRule(StoredOnThisDevice, {
  syntax: "{type:type_words} se guarda en este dispositivo (each_tab:, para cada pestaña)? {with_nested_statements}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          "ajustes se guarda en este dispositivo",
          [
            "export class Ajuste extends Place {}",
            "export const ajustes = core.place(new Ajuste(), {",
            '  name: "ajustes",',
            '  kind: "database on this device"',
            "})"
          ]
        ],
        [
          "borrador se guarda en este dispositivo, para cada pestaña",
          [
            "export class Borrador extends Place {}",
            "export const borrador = core.place(new Borrador(), {",
            '  name: "borrador",',
            '  kind: "database on this device",',
            "  forEachTab: true",
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(SavedInTheCloud, {
  syntax: "{type:type_words} se guarda en la nube {with_nested_statements}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          "recetario familiar se guarda en la nube",
          [
            "export class RecetarioFamiliar extends Place {}",
            "export const recetarioFamiliar = core.place(new RecetarioFamiliar(), {",
            '  name: "recetario_familiar",',
            '  kind: "the cloud",',
            '  at: "/api/places/spaces/personal/recetario-familiar",',
            "  checkedEvery: 5,",
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(SavedInTheCloud, { syntax: "{type:subject_it} (se guarda|vive) en la nube" })
placesEs.addRule(ProjectionOf, {
  syntax: `${THE}? {type:type_words} es una proyección de {source:expression} {with_nested_statements}?`,
  tests: [
    {
      compileAs: "block",
      beforeEach: addHojaDeInscripcion,
      tests: [
        [
          'la hoja publicada es una proyección de la hoja de inscripción\n\t- dentro de "@rs/picnic"\n\t- mostrando de cada fila su persona y turno\n\t- solo donde su "estado" es "confirmado"',
          [
            "export class HojaPublicada extends Place {}",
            "export const hojaPublicada = core.place(new HojaPublicada(), {",
            '  name: "hoja_publicada",',
            '  kind: "data folder",',
            '  at: "/api/places/spaces/@rs/picnic",',
            "  projection: {",
            '    into: "@rs/picnic",',
            '    of: "/api/places/spaces/@rs/picnic-privado/inscripciones",',
            '    fields: ["persona", "turno"],',
            '    where: { estado: "confirmado" }',
            "  },",
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(ProjectedInto, { syntax: "dentro de {address:text}" })
placesEs.addRule(ProjectedFields, {
  syntax: "mostrando de (cada|toda) {thing:identifier} (su|sus) {fields:searched_fields}"
})
placesEs.addRule(ProjectedOnlyWhere, { syntax: "solo donde su {field:text} es {value:text}" })
placesEs.addRule(SignUpsFrom, {
  syntax: "abierta a inscripciones de {address:text}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'hoja de inscripción es una carpeta de datos en "picnic@rs/__private/inscripciones"\n\t- abierta a inscripciones de "picnic@rs/hoja"\n\t- solo sus asistentes añaden filas\n\t- como mucho 2 filas por cada turno',
          [
            "export class HojaDeInscripción extends Place {}",
            "export const hojaDeInscripción = core.place(new HojaDeInscripción(), {",
            '  name: "hoja_de_inscripción",',
            '  kind: "data folder",',
            '  at: "/api/places/spaces/picnic@rs/__private/inscripciones",',
            "  sheet: {",
            '    signUpsFrom: "picnic@rs/hoja",',
            '    onlyFrom: "asistentes",',
            '    mostEach: { field: "turno", most: 2 }',
            "  },",
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(RowsOnlyFrom, { syntax: "solo sus {list:identifier} añaden filas" })
placesEs.addRule(MostRowsEach, { syntax: "como mucho {most:number} filas (por|para) cada {field:identifier}" })
placesEs.addRule(RowsAllowedEach, {
  syntax: "cada persona (pide|añade) como mucho sus {field:text} {collection:identifier}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'hoja de inscripción es una carpeta de datos en "picnic@rs/__private/inscripciones"\n\t- solo sus asistentes añaden filas\n\t- como mucho 2 filas por cada turno\n\t- como mucho 40 filas por cada evento\n\t- cada persona pide como mucho sus "invitaciones" entradas\n\t- las entradas confirmadas se unen a "picnic@rs/__attendees"',
          [
            "export class HojaDeInscripción extends Place {}",
            "export const hojaDeInscripción = core.place(new HojaDeInscripción(), {",
            '  name: "hoja_de_inscripción",',
            '  kind: "data folder",',
            '  at: "/api/places/spaces/picnic@rs/__private/inscripciones",',
            "  sheet: {",
            '    onlyFrom: "asistentes",',
            '    mostEach: [{ field: "turno", most: 2 }, { field: "evento", most: 40 }],',
            '    allowance: { collection: "entradas", field: "invitaciones" },',
            '    joins: { collection: "entradas", address: "picnic@rs/__attendees" }',
            "  },",
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(ConfirmedJoin, {
  syntax: "(los|las) {collection:identifier} (confirmados|confirmadas) se unen a {address:text}"
})

placesEs.addRule(CollectionAt, { syntax: `${THE} {collection:plural_type} están en {path:text}` })
placesEs.addRule(CollectionAt, { syntax: `${THE} {collection:plural_type} se encuentran en {path:text}` })
placesEs.addRule(SearchedAt, { syntax: `${THE} {collection:plural_type} se buscan en {path:text}` })
placesEs.addRule(PictureAt, {
  syntax: `${THE} {property:member_words} de ${A} {owner:known_type} es una imagen en {path:text}`
})
placesEs.addRule(PictureAt, {
  syntax: `${THE} {property:quoted_member} de ${A} {owner:known_type} es una imagen en {path:text}`
})
placesEs.addRule(FieldCalled, {
  syntax: `${THE} {property:member_words} de ${A} {owner:known_type} se (llama|llaman) {name:text}`
})
placesEs.addRule(FieldCalled, {
  syntax: `${THE} {property:quoted_member} de ${A} {owner:known_type} se (llama|llaman) {name:text}`
})
placesEs.addRule(KeyIfSet, { syntax: "{type:subject_its} clave opcional es el secreto {name:text}" })
placesEs.addRule(KeyIsSecret, { syntax: "{type:subject_its} clave es el secreto {name:text}" })
placesEs.addRule(KeyWritten, { syntax: "{type:subject_its} clave es {key:text}" })
placesEs.addRule(Wording.specialize({ ruleName: "check_unit", meanings: ["second", "minute", "hour", "day"] }), {
  syntax: "((second:segundo|segundos)|(minute:minuto|minutos)|(hour:hora|horas)|(day:día|días|dia|dias))"
})
placesEs.addRule(CheckedEvery, { syntax: "{type:subject_implied} se revisa cada {number} {unit:check_unit}?" })
placesEs.addRule(CheckedEvery, { syntax: "{type:subject_implied} se revisa cada {unit:check_unit}" })
placesEs.addRule(Wording.specialize({ ruleName: "day_half", meanings: ["am", "pm"] }), {
  syntax: "((am:de la mañana|am|AM)|(pm:de la tarde|de la noche|pm|PM))"
})
placesEs.addRule(Wording.specialize({ ruleName: "clock_zone", meanings: ["utc", "local"] }), {
  syntax: "((utc:UTC|utc)|(local:hora local))"
})
placesEs.addRule(CheckedAt, {
  syntax:
    "{type:subject_implied} se revisa una vez al día (a (la|las) {hour:number} (: {minute:number})? {half:day_half}? {zone:clock_zone}?)?"
})
placesEs.addRule(CheckedAt, {
  syntax:
    "{type:subject_implied} se revisa cada día a (la|las) {hour:number} (: {minute:number})? {half:day_half}? {zone:clock_zone}?"
})
placesEs.addRule(Wording.specialize({ ruleName: "size_unit", meanings: ["kb", "mb", "gb"] }), {
  syntax: "((kb:KB|kilobytes)|(mb:MB|megabytes)|(gb:GB|gigabytes))"
})
placesEs.addRule(KeptOnDevice, {
  syntax: "guarda una copia en este dispositivo (, hasta {size:number} {unit:size_unit})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'guerra de las galaxias es un servidor web en "https://swapi.py4e.com/api"\n\t- guarda una copia en este dispositivo, hasta 20 MB',
          [
            "export class GuerraDeLasGalaxias extends Place {}",
            "export const guerraDeLasGalaxias = core.place(new GuerraDeLasGalaxias(), {",
            '  name: "guerra_de_las_galaxias",',
            '  kind: "web server",',
            '  at: "https://swapi.py4e.com/api",',
            "  keptOnDevice: 20000000,",
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(VersionsIn, { syntax: "{type:subject_its} versión está en {field:text}" })
placesEs.addRule(IdColumn, { syntax: "{type:subject_its} identificador está en {column:text}" })
placesEs.addRule(RowsIn, {
  syntax: "{type:subject_its} filas están en (el {inner:text} de)? (el {outer:text} de)? su? {field:text}"
})
placesEs.addRule(NextPageIn, {
  syntax:
    "{type:subject_its} página siguiente está en (el {inner:text} de)? (el {outer:text} de)? su? {field:text} (, devuelta como {param:text})?"
})
placesEs.addRule(NextPageInLink, { syntax: "{type:subject_its} página siguiente está en su cabecera {header:text}" })
placesEs.addRule(NextPageByOffset, {
  syntax: "{type:subject_its} página siguiente se pide con ({limit:text} y)? {offset:text}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'museo met es un servidor web en "https://collectionapi.metmuseum.org"\n\t- su página siguiente se pide con "limit" y "offset"',
          [
            "export class MuseoMet extends Place {}",
            "export const museoMet = core.place(new MuseoMet(), {",
            '  name: "museo_met",',
            '  kind: "web server",',
            '  at: "https://collectionapi.metmuseum.org",',
            '  pagesByOffset: { limit: "limit", offset: "offset" },',
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(NextPageByLastId, {
  syntax:
    "{type:subject_its} página siguiente se pide con ({limit:text} y)? el último id como {param:text} (, hasta que (el {inner:text} de)? su {field:text} sea no)?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'stripe es un servidor web en "https://stripe.test"\n\t- su página siguiente se pide con "limit" y el último id como "starting_after", hasta que su "has_more" sea no',
          [
            "export class Stripe extends Place {}",
            "export const stripe = core.place(new Stripe(), {",
            '  name: "stripe",',
            '  kind: "web server",',
            '  at: "https://stripe.test",',
            "  pagesByLastId: {",
            '    limit: "limit",',
            '    param: "starting_after",',
            '    moreIn: "has_more"',
            "  },",
            '  unclearNumbers: ","',
            "})"
          ]
        ],
        [
          'tienda es un servidor web en "https://tienda.test"\n\t- su página siguiente se pide con el último id como "after", hasta que el "more" de su "paging" sea no',
          [
            "export class Tienda extends Place {}",
            "export const tienda = core.place(new Tienda(), {",
            '  name: "tienda",',
            '  kind: "web server",',
            '  at: "https://tienda.test",',
            '  pagesByLastId: { param: "after", moreIn: "paging.more" },',
            '  unclearNumbers: ","',
            "})"
          ]
        ],
        [
          'tienda es un servidor web en "https://tienda.test"\n\t- su página siguiente se pide con el último id como "after"',
          [
            "export class Tienda extends Place {}",
            "export const tienda = core.place(new Tienda(), {",
            '  name: "tienda",',
            '  kind: "web server",',
            '  at: "https://tienda.test",',
            '  pagesByLastId: { param: "after" },',
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(NextPageByNumber, {
  syntax:
    "{type:subject_its} página siguiente se pide por número con ({limit:text} y)? {page:text} (, contando desde {first:number})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'github es un servidor web en "https://github.test"\n\t- su página siguiente se pide por número con "per_page" y "page"',
          [
            "export class Github extends Place {}",
            "export const github = core.place(new Github(), {",
            '  name: "github",',
            '  kind: "web server",',
            '  at: "https://github.test",',
            '  pagesByNumber: { limit: "per_page", page: "page" },',
            '  unclearNumbers: ","',
            "})"
          ]
        ],
        [
          'spring es un servidor web en "https://spring.test"\n\t- su página siguiente se pide por número con "size" y "page", contando desde 0',
          [
            "export class Spring extends Place {}",
            "export const spring = core.place(new Spring(), {",
            '  name: "spring",',
            '  kind: "web server",',
            '  at: "https://spring.test",',
            "  pagesByNumber: {",
            '    limit: "size",',
            '    page: "page",',
            "    first: 0",
            "  },",
            '  unclearNumbers: ","',
            "})"
          ]
        ],
        [
          'blog es un servidor web en "https://blog.test"\n\t- su página siguiente se pide por número con "p"',
          [
            "export class Blog extends Place {}",
            "export const blog = core.place(new Blog(), {",
            '  name: "blog",',
            '  kind: "web server",',
            '  at: "https://blog.test",',
            '  pagesByNumber: { page: "p" },',
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(FiltersBy, {
  syntax: "{type:subject_implied} filtra por todos los campos",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'recetario es un servidor web en "https://recetario.test"\n\t- filtra por todos los campos',
          [
            "export class Recetario extends Place {}",
            "export const recetario = core.place(new Recetario(), {",
            '  name: "recetario",',
            '  kind: "web server",',
            '  at: "https://recetario.test",',
            '  filters: "every field",',
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(FiltersBy, {
  syntax: "{type:subject_implied} filtra por {fields:searched_fields}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'recetario es un servidor web en "https://recetario.test"\n\t- filtra por cocina y tiempo',
          [
            "export class Recetario extends Place {}",
            "export const recetario = core.place(new Recetario(), {",
            '  name: "recetario",',
            '  kind: "web server",',
            '  at: "https://recetario.test",',
            '  filters: ["cocina", "tiempo"],',
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(SortsBy, { syntax: "{type:subject_implied} ordena por todos los campos (con {param:text})?" })
placesEs.addRule(SortsBy, {
  syntax: "{type:subject_implied} ordena por {fields:searched_fields} (con {param:text})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'recetario es un servidor web en "https://recetario.test"\n\t- ordena por titulo y fecha con "order"',
          [
            "export class Recetario extends Place {}",
            "export const recetario = core.place(new Recetario(), {",
            '  name: "recetario",',
            '  kind: "web server",',
            '  at: "https://recetario.test",',
            '  sorts: ["titulo", "fecha"],',
            '  sortedWith: "order",',
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(GivesFieldsNamedIn, {
  syntax: "{type:subject_implied} da solo los campos nombrados en {param:text}",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'paises es un servidor web en "https://paises.test"\n\t- da solo los campos nombrados en "response_fields"',
          [
            "export class Paise extends Place {}",
            "export const paises = core.place(new Paise(), {",
            '  name: "paises",',
            '  kind: "web server",',
            '  at: "https://paises.test",',
            '  fieldsNamedIn: "response_fields",',
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(IsReadOnly, {
  syntax: "{type:subject_implied} es de solo lectura",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'paises es un servidor web en "https://paises.test"\n\t- es de solo lectura',
          [
            "export class Paise extends Place {}",
            "export const paises = core.place(new Paise(), {",
            '  name: "paises",',
            '  kind: "web server",',
            '  at: "https://paises.test",',
            "  readOnly: true,",
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(ListsUnder, {
  syntax: `${THE} {property:member_words} de ${A} {owner:known_type} están en {path:text}`,
  tests: [
    {
      compileAs: "block",
      beforeEach: addPublicacion,
      tests: [
        [
          'typicode es un servidor web en "https://jsonplaceholder.typicode.com"\n\t- los comentarios de una publicación están en "/posts/{id}/comments"',
          [
            "export class Typicode extends Place {}",
            "export const typicode = core.place(new Typicode(), {",
            '  name: "typicode",',
            '  kind: "web server",',
            '  at: "https://jsonplaceholder.typicode.com",',
            '  listsUnder: { publicaciones: { comentarios: "/posts/{id}/comments" } },',
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    },
    {
      compileAs: "statement",
      beforeEach: addPublicacion,
      tests: [
        {
          title: "solo bajo un lugar",
          input: 'los comentarios de una publicación están en "/posts/{id}/comments"',
          js: undefined
        }
      ]
    }
  ]
})
placesEs.addRule(ListsUnder, {
  syntax: `${THE} {property:quoted_member} de ${A} {owner:known_type} están en {path:text}`
})
placesEs.addRule(ListsGiveOnly, {
  syntax: "{type:subject_its} listas solo dan {field:text} (y {more:text})? de cada uno"
})
placesEs.addRule(PageSizeIs, { syntax: "{type:subject_implied} da hasta {size:number} a la vez" })
placesEs.addRule(RequestsASecond, {
  syntax: "{type:subject_implied} acepta hasta {most:number} peticiones por segundo",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'museo met es un servidor web en "https://collectionapi.metmuseum.org"\n\t- acepta hasta 80 peticiones por segundo',
          [
            "export class MuseoMet extends Place {}",
            "export const museoMet = core.place(new MuseoMet(), {",
            '  name: "museo_met",',
            '  kind: "web server",',
            '  at: "https://collectionapi.metmuseum.org",',
            "  mostPerSecond: 80,",
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(Wording.specialize({ ruleName: "numbers_or_names", meanings: ["numbers", "names"] }), {
  syntax: "((numbers:los números)|(names:los nombres))"
})
placesEs.addRule(WritesLike, { syntax: "{type:subject_implied} escribe {what:numbers_or_names} como {example:text}" })
placesEs.addRule(SearchedFields, { syntax: "[{identifier} (,|y|e)]" })
// antes de `searches_with`, que también lee `todo` como el nombre de un campo
placesEs.addRule(SearchesEverything, {
  syntax: "{type:subject_implied} busca en todo con {param:text} (en {path:text})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'museo met es un servidor web en "https://collectionapi.metmuseum.org"\n\t- busca en todo con "q" en "/v1.1/search"',
          [
            "export class MuseoMet extends Place {}",
            "export const museoMet = core.place(new MuseoMet(), {",
            '  name: "museo_met",',
            '  kind: "web server",',
            '  at: "https://collectionapi.metmuseum.org",',
            "  searches: {",
            '    param: "q",',
            "    fields: [],",
            '    at: "/v1.1/search"',
            "  },",
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(SearchesWith, {
  syntax: "{type:subject_implied} busca (en)? {fields:searched_fields} con {param:text}"
})
placesEs.addRule(CollectionSearchedWith, {
  syntax: `${THE} {collection:plural_type} se buscan con {param:text} (en {path:text})?`,
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'github es un servidor web en "https://api.github.com"\n\t- los repositorios se buscan con "q" en "/search/repositories"',
          [
            "export class Github extends Place {}",
            "export const github = core.place(new Github(), {",
            '  name: "github",',
            '  kind: "web server",',
            '  at: "https://api.github.com",',
            "  collections: { repositorios: {",
            "    searches: {",
            '      param: "q",',
            "      fields: [],",
            '      at: "/search/repositories"',
            "    },",
            '    at: "/search/repositories",',
            "    searchedOnly: true",
            "  } },",
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(AskedBy, {
  syntax: `${THE} {collection:plural_type} se piden por (su|sus)? {fields:searched_fields}`,
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          'open meteo es un servidor web en "https://api.open-meteo.com"\n\t- los pronósticos se piden por su latitud y longitud',
          [
            "export class OpenMeteo extends Place {}",
            "export const openMeteo = core.place(new OpenMeteo(), {",
            '  name: "open_meteo",',
            '  kind: "web server",',
            '  at: "https://api.open-meteo.com",',
            '  collections: { pronósticos: { askedBy: ["latitud", "longitud"] } },',
            '  unclearNumbers: ","',
            "})"
          ]
        ]
      ]
    }
  ]
})
placesEs.addRule(AccountIncluded, { syntax: "{type:subject_implied} incluye la cuenta {account:text}" })
placesEs.addRule(OperationAt, { syntax: "para {signature:method_signature} está en {path:text}" })

placesEs.addRule(SavedInPlace, { syntax: "{type:subject_it} (se guarda|vive) en {place:expression}" })
placesEs.addRule(SavedInPlace, { syntax: `${A} {type:known_type} (se guarda|vive) en {place:expression}` })
placesEs.addRule(SavedInPlace, { syntax: "{type:subject_implied} (se guarda|vive) en {place:expression}" })

placesEs.addRule(WhileWaiting, { syntax: "mientras (espera|carga) :? {statement_body}?" })
placesEs.addRule(IfThereAreNone, { syntax: "si no hay (ninguno|ninguna|nada) :? {statement_body}?" })
placesEs.addRule(IfThatFailsSay, { syntax: "si falla decir {text:expression}" })
placesEs.addRule(ShowThemPaged, { syntax: "mostrarlos en (páginas|paginas)" })
placesEs.addRule(ShowThemAll, { syntax: "mostrarlos todos" })
placesEs.addRule(ShowThemAtATime, {
  syntax: "mostrarlos de {size:number} en {same:number}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        ["mostrarlos de 12 en 12", 'core.readRider("pageSize", () => 12)'],
        { title: "the same number, twice", input: "mostrarlos de 12 en 10", js: undefined }
      ]
    }
  ]
})
placesEs.addRule(ShowThemIn, { syntax: "mostrarlos en :? {statement_body}?" })
placesEs.addRule(ShowItAllIn, { syntax: "mostrar todo en :? {statement_body}?" })
placesEs.addRule(IfThatFails, { syntax: "si falla :? {statement_body}?" })

placesEs.addRule(InOneGo, {
  syntax: "de una vez :? {statement_body}?",
  tests: [
    {
      compileAs: "statement",
      tests: [["de una vez: imprimir 1", "await core.inOneGo(() => core.console.log(1))"]]
    }
  ]
})
placesEs.addRule(DraftOf, {
  syntax: "un borrador de {thing:operand}",
  tests: [{ compileAs: "expression", tests: [["un borrador de cosa", undefined]] }]
})
placesEs.addRule(SaveDraft, { syntax: "guardar {draft:expression}" })
placesEs.addRule(DiscardDraft, { syntax: "descartar {draft:expression}" })
placesEs.addRule(CancelAction, { syntax: `(parar|cancelar) ${THE}? {action:identifier}` })
placesEs.addRule(ReloadThings, { syntax: `recargar ${THE} {type:plural_type}` })
placesEs.addRule(TryAgain, {
  syntax: "reintentar",
  tests: [{ compileAs: "statement", tests: [["reintentar", "core.reloadSaved()"]] }]
})

placesEs.addRule(ThingWithId, { syntax: "(el|la) {type:known_type} cuyo identificador es {id:expression}" })
placesEs.addRule(EveryThingMatching, {
  syntax: "(cada|todo|toda) {type:known_type} que (coincide|coincida) con {words:expression}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          [
            'museo met es un servidor web en "https://collectionapi.metmuseum.org"',
            '\t- busca en todo con "q"',
            "una obra es una cosa",
            "\t- vive en museo met"
          ].join("\n"),
          "block"
        )
        scope.variables?.add("búsqueda")
      },
      tests: [["cada obra que coincide con búsqueda", 'await core.savedThings(Obra, { search: { "*": búsqueda } })']]
    }
  ]
})
placesEs.addRule(EveryThingMatching, {
  syntax: "((todos|todas) (los|las)?|los|las)? {type:plural_type} que (coinciden|coincidan) con {words:expression}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          [
            'museo met es un servidor web en "https://collectionapi.metmuseum.org"',
            '\t- busca en todo con "q"',
            "una obra es una cosa",
            "\t- vive en museo met"
          ].join("\n"),
          "block"
        )
        scope.variables?.add("búsqueda")
      },
      tests: [
        [
          "todas las obras que coinciden con búsqueda",
          'await core.savedThings(Obra, { search: { "*": búsqueda } })'
        ],
        ["las obras que coinciden con búsqueda", 'await core.savedThings(Obra, { search: { "*": búsqueda } })']
      ]
    }
  ]
})
placesEs.addRule(FirstFewWhere, {
  syntax: `(los|las) (primeros|primeras) {number} {type:plural_type} donde {inline_expression}?`
})
placesEs.addRule(NumberOfThingsWhere, { syntax: "el número de {type:plural_type} donde {inline_expression}?" })
placesEs.addRule(
  Wording.specialize({ ruleName: "there_are_how_many", meanings: ["none", "fewer", "more", "at_least", "at_most"] }),
  { syntax: "((fewer:menos de)|(more:más de|mas de)|(at_least:al menos)|(at_most:como mucho|como máximo|como maximo))" }
)
placesEs.addRule(ThereAreThings, { syntax: `${THERE_ARE} donde {inline_expression}?` })
placesEs.addRule(ThereAreThings, { syntax: THERE_ARE })
placesEs.addRule(TotalOf, {
  syntax: "(el total|la suma) de {list:operand}",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["el total de [1, 2]", "core.totalOf([1, 2])"],
        ["la suma de [1, 2]", "core.totalOf([1, 2])"]
      ]
    }
  ]
})

placesEs.addRule(WhereField, { syntax: `${THE} {property:member_words}` })
// Before its plain self:  the same words, in a `where`, are the thing's field
placesEs.addRule(TheyAre, {
  syntax: "{operator:are_or_are_not} {expression:where_field}"
})
// `la persona no es el cocinero`, by the word every comparison reads:  as English does (epic `language`, Q15)
placesEs.addRule(TheyAre, { syntax: "{operator:is_or_is_not} {expression:where_field}" })
placesEs.addRule(TheyAre, { syntax: "{operator:are_or_are_not} {expression:operand}" })
placesEs.addRule(CurrentPerson, {
  syntax: "(esa persona|la persona)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["esa persona", "core.currentPerson()"],
        ["la persona", "core.currentPerson()"]
      ]
    }
  ]
})
placesEs.addRule(SignInMenu, {
  syntax: "el menú de acceso",
  tests: [{ compileAs: "expression", tests: [["el menú de acceso", "core.signInMenu()"]] }]
})
placesEs.addRule(TheirField, {
  syntax: `${THE} {field:member_words} de esa persona`,
  tests: [{ compileAs: "expression", tests: [["el nombre de esa persona", "core.currentPerson().name"]] }]
})
placesEs.addRule(PeopleHere, {
  syntax: "(todos los presentes|las personas presentes)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["las personas presentes", "core.peopleHere()"],
        ["todos los presentes", "core.peopleHere()"]
      ]
    }
  ]
})

placesEs.addRule(LoadThings, { syntax: "(cargar|traer) {value:expression}" })
placesEs.addRule(HelpfulWord, { syntax: "(traer|consultar|unir)" })
placesEs.addRule(HelpfulWord, { syntax: "conectar a" })
