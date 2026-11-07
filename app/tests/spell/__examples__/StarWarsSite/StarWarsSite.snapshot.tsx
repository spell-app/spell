import { core, View, Page, Site, prop } from "@spell/core"
import { E, SpellElement } from "@spell/elements"
import { Character, Planet, Film, Species, Vehicle, Starship, WikiPage, Namespace, Title, Thumbnail, Originalimage, ContentUrl, Desktop, Mobile, Card } from "@spell/project/@spell/examples/StarWars"

export class SettingsDialog extends View {
  static elementTag = core.defineElement(this, "test-project")
}

/**
 * `<test-project-settings-dialog>`:  a settings dialog, drawn in its own element, e.g. by `draw the settings dialog`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its settings dialog's properties;  its methods call its settings dialog's.
 * - What every view's element does, e.g. drawing its settings dialog, is `SpellElement`'s.
 */
export class SettingsDialogElement extends SpellElement<SettingsDialog> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-settings-dialog", "settings dialog", [])
}
core.useElement(SettingsDialog, SettingsDialogElement)

export class PersonSidebar extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** Whoever it's showing */
  // - its "person" is a character
  @prop({ type: "Character" })
  accessor person!: Character
}

/**
 * `<test-project-person-sidebar>`:  a person sidebar, drawn in its own element, e.g. by `draw the person sidebar`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its person sidebar's properties;  its methods call its person sidebar's.
 * - What every view's element does, e.g. drawing its person sidebar, is `SpellElement`'s.
 */
export class PersonSidebarElement extends SpellElement<PersonSidebar> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-person-sidebar", "person sidebar", [
    { name: "person", kind: "string", description: "Its person." }
  ])
}
core.useElement(PersonSidebar, PersonSidebarElement)

/**
 * 
 * The whole Star Wars example as a site (epic `mockup` P1):  each of its collections, films, people, planets, species,
 * vehicles and starships, as a list page and a page for one of them.
 * Its pages are empty for now:  the click-through mockups draw them.
 * The site says where each page is, and fills what an address names:  "/films/:film" shows the film page, its film
 * the one the address names.
 * 
 */
export class FilmsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")
}

/**
 * `<test-project-films-page>`:  a films page, drawn in its own element, e.g. by `draw the films page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its films page's properties;  its methods call its films page's.
 * - What every view's element does, e.g. drawing its films page, is `SpellElement`'s.
 */
export class FilmsPageElement extends SpellElement<FilmsPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-films-page", "films page", [])
}
core.useElement(FilmsPage, FilmsPageElement)
export const filmsPage = new FilmsPage()

export class FilmPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  /** The film the address names:  /films/:film */
  // - its "film" is a film
  @prop({ type: "Film" })
  accessor film!: Film
}

/**
 * `<test-project-film-page>`:  a film page, drawn in its own element, e.g. by `draw the film page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its film page's properties;  its methods call its film page's.
 * - What every view's element does, e.g. drawing its film page, is `SpellElement`'s.
 */
export class FilmPageElement extends SpellElement<FilmPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-film-page", "film page", [
    { name: "film", kind: "string", description: "Its film." }
  ])
}
core.useElement(FilmPage, FilmPageElement)
export const filmPage = new FilmPage()

export class PeoplePage extends Page {
  static elementTag = core.defineElement(this, "test-project")
}

/**
 * `<test-project-people-page>`:  a people page, drawn in its own element, e.g. by `draw the people page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its people page's properties;  its methods call its people page's.
 * - What every view's element does, e.g. drawing its people page, is `SpellElement`'s.
 */
export class PeoplePageElement extends SpellElement<PeoplePage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-people-page", "people page", [])
}
core.useElement(PeoplePage, PeoplePageElement)
export const peoplePage = new PeoplePage()

export class PersonPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  /** The person the address names:  /people/:person */
  // - its "person" is a character
  @prop({ type: "Character" })
  accessor person!: Character
}

/**
 * `<test-project-person-page>`:  a person page, drawn in its own element, e.g. by `draw the person page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its person page's properties;  its methods call its person page's.
 * - What every view's element does, e.g. drawing its person page, is `SpellElement`'s.
 */
export class PersonPageElement extends SpellElement<PersonPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-person-page", "person page", [
    { name: "person", kind: "string", description: "Its person." }
  ])
}
core.useElement(PersonPage, PersonPageElement)
export const personPage = new PersonPage()

export class PlanetsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")
}

/**
 * `<test-project-planets-page>`:  a planets page, drawn in its own element, e.g. by `draw the planets page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its planets page's properties;  its methods call its planets page's.
 * - What every view's element does, e.g. drawing its planets page, is `SpellElement`'s.
 */
export class PlanetsPageElement extends SpellElement<PlanetsPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-planets-page", "planets page", [])
}
core.useElement(PlanetsPage, PlanetsPageElement)
export const planetsPage = new PlanetsPage()

export class PlanetPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  /** The planet the address names:  /planets/:planet */
  // - its "planet" is a planet
  @prop({ type: "Planet" })
  accessor planet!: Planet
}

/**
 * `<test-project-planet-page>`:  a planet page, drawn in its own element, e.g. by `draw the planet page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its planet page's properties;  its methods call its planet page's.
 * - What every view's element does, e.g. drawing its planet page, is `SpellElement`'s.
 */
export class PlanetPageElement extends SpellElement<PlanetPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-planet-page", "planet page", [
    { name: "planet", kind: "string", description: "Its planet." }
  ])
}
core.useElement(PlanetPage, PlanetPageElement)
export const planetPage = new PlanetPage()

/** "species" is one and many:  so the list's page is "species list page" */
export class SpeciesListPage extends Page {
  static elementTag = core.defineElement(this, "test-project")
}

/**
 * `<test-project-species-list-page>`:  a species list page, drawn in its own element, e.g. by `draw the species list page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its species list page's properties;  its methods call its species list page's.
 * - What every view's element does, e.g. drawing its species list page, is `SpellElement`'s.
 */
export class SpeciesListPageElement extends SpellElement<SpeciesListPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-species-list-page", "species list page", [])
}
core.useElement(SpeciesListPage, SpeciesListPageElement)
export const speciesListPage = new SpeciesListPage()

export class SpeciesPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  /** The species the address names:  /species/:species */
  // - its "species" is a species
  @prop({ type: "Species" })
  accessor species!: Species
}

/**
 * `<test-project-species-page>`:  a species page, drawn in its own element, e.g. by `draw the species page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its species page's properties;  its methods call its species page's.
 * - What every view's element does, e.g. drawing its species page, is `SpellElement`'s.
 */
export class SpeciesPageElement extends SpellElement<SpeciesPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-species-page", "species page", [
    { name: "species", kind: "string", description: "Its species." }
  ])
}
core.useElement(SpeciesPage, SpeciesPageElement)
export const speciesPage = new SpeciesPage()

export class VehiclesPage extends Page {
  static elementTag = core.defineElement(this, "test-project")
}

/**
 * `<test-project-vehicles-page>`:  a vehicles page, drawn in its own element, e.g. by `draw the vehicles page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its vehicles page's properties;  its methods call its vehicles page's.
 * - What every view's element does, e.g. drawing its vehicles page, is `SpellElement`'s.
 */
export class VehiclesPageElement extends SpellElement<VehiclesPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-vehicles-page", "vehicles page", [])
}
core.useElement(VehiclesPage, VehiclesPageElement)
export const vehiclesPage = new VehiclesPage()

export class VehiclePage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  /** The vehicle the address names:  /vehicles/:vehicle */
  // - its "vehicle" is a vehicle
  @prop({ type: "Vehicle" })
  accessor vehicle!: Vehicle
}

/**
 * `<test-project-vehicle-page>`:  a vehicle page, drawn in its own element, e.g. by `draw the vehicle page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its vehicle page's properties;  its methods call its vehicle page's.
 * - What every view's element does, e.g. drawing its vehicle page, is `SpellElement`'s.
 */
export class VehiclePageElement extends SpellElement<VehiclePage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-vehicle-page", "vehicle page", [
    { name: "vehicle", kind: "string", description: "Its vehicle." }
  ])
}
core.useElement(VehiclePage, VehiclePageElement)
export const vehiclePage = new VehiclePage()

export class StarshipsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")
}

/**
 * `<test-project-starships-page>`:  a starships page, drawn in its own element, e.g. by `draw the starships page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its starships page's properties;  its methods call its starships page's.
 * - What every view's element does, e.g. drawing its starships page, is `SpellElement`'s.
 */
export class StarshipsPageElement extends SpellElement<StarshipsPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-starships-page", "starships page", [])
}
core.useElement(StarshipsPage, StarshipsPageElement)
export const starshipsPage = new StarshipsPage()

export class StarshipPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  /** The starship the address names:  /starships/:starship */
  // - its "starship" is a starship
  @prop({ type: "Starship" })
  accessor starship!: Starship
}

/**
 * `<test-project-starship-page>`:  a starship page, drawn in its own element, e.g. by `draw the starship page`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its starship page's properties;  its methods call its starship page's.
 * - What every view's element does, e.g. drawing its starship page, is `SpellElement`'s.
 */
export class StarshipPageElement extends SpellElement<StarshipPage> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-starship-page", "starship page", [
    { name: "starship", kind: "string", description: "Its starship." }
  ])
}
core.useElement(StarshipPage, StarshipPageElement)
export const starshipPage = new StarshipPage()

export class GalaxyGuide extends Site {
  static elementTag = core.defineElement(this, "test-project")
  static pages = [{
    name: "films page",
    page: "FilmsPage",
    address: "/films",
    title: "Films",
    pages: [{
      name: "film page",
      page: "FilmPage",
      address: "/films/:film",
      title: "Film",
      params: ["film"]
    }]
  }, {
    name: "people page",
    page: "PeoplePage",
    address: "/people",
    title: "People",
    pages: [{
      name: "person page",
      page: "PersonPage",
      address: "/people/:person",
      title: "Person",
      params: ["person"]
    }]
  }, {
    name: "planets page",
    page: "PlanetsPage",
    address: "/planets",
    title: "Planets",
    pages: [{
      name: "planet page",
      page: "PlanetPage",
      address: "/planets/:planet",
      title: "Planet",
      params: ["planet"]
    }]
  }, {
    name: "species list page",
    page: "SpeciesListPage",
    address: "/species",
    title: "Species",
    pages: [{
      name: "species page",
      page: "SpeciesPage",
      address: "/species/:species",
      title: "Species",
      params: ["species"]
    }]
  }, {
    name: "vehicles page",
    page: "VehiclesPage",
    address: "/vehicles",
    title: "Vehicles",
    pages: [{
      name: "vehicle page",
      page: "VehiclePage",
      address: "/vehicles/:vehicle",
      title: "Vehicle",
      params: ["vehicle"]
    }]
  }, {
    name: "starships page",
    page: "StarshipsPage",
    address: "/starships",
    title: "Starships",
    pages: [{
      name: "starship page",
      page: "StarshipPage",
      address: "/starships/:starship",
      title: "Starship",
      params: ["starship"]
    }]
  }]
  static dialogs = [{ name: "settings dialog", view: "SettingsDialog" }]
  static sidebars = [{ name: "person sidebar", view: "PersonSidebar" }]
}

/**
 * `<test-project-galaxy-guide>`:  a galaxy guide, drawn in its own element, e.g. by `draw the galaxy guide`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its galaxy guide's properties;  its methods call its galaxy guide's.
 * - What every view's element does, e.g. drawing its galaxy guide, is `SpellElement`'s.
 */
export class GalaxyGuideElement extends SpellElement<GalaxyGuide> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-galaxy-guide", "galaxy guide", [])
}
core.useElement(GalaxyGuide, GalaxyGuideElement)
export const galaxyGuide = new GalaxyGuide()

// -----------
if (!core.isCarryingOver) filmsPage.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `SettingsDialogElement` */
      "test-project-settings-dialog": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PersonSidebarElement` */
      "test-project-person-sidebar": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `FilmsPageElement` */
      "test-project-films-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `FilmPageElement` */
      "test-project-film-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PeoplePageElement` */
      "test-project-people-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PersonPageElement` */
      "test-project-person-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PlanetsPageElement` */
      "test-project-planets-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `PlanetPageElement` */
      "test-project-planet-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `SpeciesListPageElement` */
      "test-project-species-list-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `SpeciesPageElement` */
      "test-project-species-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `VehiclesPageElement` */
      "test-project-vehicles-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `VehiclePageElement` */
      "test-project-vehicle-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `StarshipsPageElement` */
      "test-project-starships-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `StarshipPageElement` */
      "test-project-starship-page": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `GalaxyGuideElement` */
      "test-project-galaxy-guide": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
