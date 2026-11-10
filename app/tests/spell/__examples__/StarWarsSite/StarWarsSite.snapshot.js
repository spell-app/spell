import { core, Thing, View, Page, Site, Place, h } from "@spell/core"
import { Character, Planet, Film, Species, Vehicle, Starship, WikiPage, Namespace, Title, Thumbnail, Originalimage, ContentUrl, Desktop, Mobile, Card, StarWar, Wikipedia } from "@spell/project/@spell/examples/StarWars"

core.heading("Reviews:  kept on this device")
///////////////////////////////////
// ## Reviews:  kept on this device
///////////////////////////////////

export class Review extends Thing {
  // - its "film title" is text
  static { this.declareProp("filmTitle", { type: "text", declaredAt: { path: "/StarWarsReviews.api.spell", start: 325, end: 352 } }) }
  get filmTitle() { return this.getProp("filmTitle") }
  set filmTitle(value) { this.setProp("filmTitle", value) }

  // - its "stars" is a number
  static { this.declareProp("stars", { type: "number", declaredAt: { path: "/StarWarsReviews.api.spell", start: 357, end: 387 } }) }
  get stars() { return this.getProp("stars") }
  set stars(value) { this.setProp("stars", value) }

  // - its "words" is text
  static { this.declareProp("words", { type: "text", declaredAt: { path: "/StarWarsReviews.api.spell", start: 393, end: 415 } }) }
  get words() { return this.getProp("words") }
  set words(value) { this.setProp("words", value) }

  static savedIn = {
    place: "galaxy_reviews",
    collection: "reviews",
    times: ["created", "modified"]
  }

  // - it lives in galaxy reviews
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/StarWarsReviews.api.spell", start: 287, end: 313 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in galaxy reviews
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/StarWarsReviews.api.spell", start: 287, end: 313 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/**
 * What people think of a film, written on the site's film pages (epic `mockup` P8).
 * Kept in this browser:  change the next line to keep them somewhere else, and nothing else changes.
 */
export class GalaxyReview extends Place {}
export const galaxyReviews = core.place(new GalaxyReview(), { name: "galaxy_reviews", kind: "database on this device" })

// -----------
//
// The whole Star Wars example as a site (epic `mockup` P1), and its click-through mockup (P8):  each of its
// collections, films, people, planets, species, vehicles and starships, as a list page and a page for one of them.
// Each page says first what it must let people do, its jobs (epic `mockup` P6), plain lines or Agile stories,
// ticked where the mockup does it.
// The site says where each page is, and fills what an address names:  "/films/:film" shows the film page, its film
// the one the address names.
// It wears the Mockup theme, a hand-drawn sketch, so nobody takes it for the finished look.
// Its people, planets and ships are read from swapi.py4e.com, as the Star Wars example's are;  its reviews are kept
// on this device (StarWarsReviews.api.spell).
//

core.heading("Every page's top:  its title, and the settings")
//# Every page's top:  its title, and the settings

export class PageTop extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "title" is a text
  static { this.declareProp("title", { type: "text" }) }
  get title() { return this.getProp("title") }
  set title(value) { this.setProp("title", value) }

  draw() {
    return h("ui-stack", { direction: "horizontal", align: "center", justify: "between" },
      h("ui-header", { size: "large" }, () => this.title),
      h("ui-button", {
        class: "settings",
        appearance: "basic",
        icon: "cog",
        onClick: core.pressed(this, () => core.showSitePart("settings dialog")),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Settings")
    )
  }
}

core.heading("The films")
//# The films

/** A person in a few lines:  the page and the sidebar both show them */
export class PersonFact extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "person" is a character
  static { this.declareProp("person", { type: "Character", link: true }) }
  get person() { return core.linked(this, "person", Character) }
  set person(value) { this.setProp("person", value) }

  static drawsWaiting = true
  draw() {
    return h("ui-table", { appearance: "definition", celled: true, unstackable: true },
      h("ui-row",
        h("ui-cell", "Born"),
        h("ui-cell", () => core.whileWaiting(() => this.person?.birthYear))
      ),
      h("ui-row",
        h("ui-cell", "Height"),
        h("ui-cell",
          () => core.whileWaiting(() => core.measureShown(this.person?.height, "Length", "centimeter"))
        )
      ),
      h("ui-row",
        h("ui-cell", "Gender"),
        h("ui-cell", () => core.whileWaiting(() => this.person?.gender))
      ),
      h("ui-row",
        h("ui-cell", "Home"),
        h("ui-cell",
          h("ui-link", { link: () => core.siteAddressOf("planet page", this.person?.homeworld) },
            () => core.whileWaiting(() => this.person?.homeworld?.name)
          )
        )
      )
    )
  }
}

export class PersonSidebar extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** Whoever it's showing */
  // - its "person" is a character
  static { this.declareProp("person", { type: "Character", link: true }) }
  get person() { return core.linked(this, "person", Character) }
  set person(value) { this.setProp("person", value) }

  static drawsWaiting = true
  draw() {
    return [
      h("ui-header", { size: "medium" }, () => core.whileWaiting(() => this.person?.name)),
      core.drawThing(new PersonFact({ person: this.person })),
      h("ui-link", { class: "whole-page", link: () => core.siteAddressOf("person page", this.person) },
        "Their whole page"
      )
    ]
  }
}

export class SettingsDialog extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "units" is metric or imperial
  static Units = ["metric", "imperial"]
  static { this.declareProp("units", { oneOf: SettingsDialog.Units }) }
  get units() { return this.getProp("units") }
  set units(value) { this.setProp("units", value) }

  // - its "crawl" is shown or hidden
  static Crawls = ["shown", "hidden"]
  static { this.declareProp("crawl", { oneOf: SettingsDialog.Crawls }) }
  get crawl() { return this.getProp("crawl") }
  set crawl(value) { this.setProp("crawl", value) }

  draw() {
    return [
      h("ui-header", { size: "medium" }, "Settings"),
      h("ui-form", { value: this },
        h("ui-field", { label: "Lengths and weights in" },
          h("ui-select", { name: "units" },
            h("ui-item", { value: "metric" }, "Metres and kilos"),
            h("ui-item", { value: "imperial" }, "Feet and pounds")
          )
        ),
        h("ui-field", { label: "A film's opening crawl" },
          h("ui-select", { name: "crawl" },
            h("ui-item", { value: "shown" }, "Shown"),
            h("ui-item", { value: "hidden" }, "Hidden")
          )
        )
      ),
      h("ui-button", {
        class: "done",
        color: "primary",
        onClick: core.pressed(this, () => core.closeSitePart("settings dialog")),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Done")
    ]
  }
}

export class ReviewDialog extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** The film it's a review of */
  // - its "film" is a film
  static { this.declareProp("film", { type: "Film", link: true }) }
  get film() { return core.linked(this, "film", Film) }
  set film(value) { this.setProp("film", value) }

  /** The review being written:  saved when it's done */
  // - its "draft" is a new review with stars = 5
  static { this.declareProp("draft", { init: () => new Review({ stars: 5 }), early: true }) }
  get draft() { return this.getProp("draft") }
  set draft(value) { this.setProp("draft", value) }

  async saveTheReview() {
    this.draft.filmTitle = (await core.answerOf(this, "film"))?.title
    core.saveThing(this.draft)
    this.draft = new Review({ stars: 5 })
    core.closeSitePart("review dialog")
  }

  draw() {
    return [
      h("ui-header", { size: "medium" }, "Review ", () => core.whileWaiting(() => this.film?.title)),
      h("ui-form", { "prop:value": () => this.draft },
        h("ui-field", { label: "Stars" },
          h("ui-input", { class: "stars", name: "stars", type: "number", min: "1", max: "5" })
        ),
        h("ui-field", { label: "What did you think?" },
          h("ui-textarea", { class: "words", name: "words", rows: "4" })
        )
      ),
      h("ui-button", {
        class: "save-review",
        color: "primary",
        disabled: () => this.draft.words === "",
        onClick: core.pressed(this, async () => await this.saveTheReview()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, "Save the review")
    ]
  }
}

export class FilmsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see every film, in the order they came out</story>\n<story \"S2\">\n  As a fan, I want to sort the films by when they're set, so that I can watch them in story order\n  - done when:  a switch flips the list between release and story order\n</story>\n<story \"S3\" done>open a film's page from its row</story>"

  draw() {
    return [
      core.drawThing(new PageTop({ title: "Films" })),
      core.drawRead(async () => await core.savedThings(Film, {}, "as drawn"), (film) => [
        h("ui-cell", { "data-column": "Episode" }, () => film.episodeId),
        h("ui-cell", { "data-column": "Title" },
          h("ui-link", { class: "film", link: () => core.siteAddressOf("film page", film) }, () => film.title)
        ),
        h("ui-cell", { "data-column": "Directed by" }, () => film.director),
        h("ui-cell", { "data-column": "Released" }, () => core.dateShown(film.releaseDate))
      ], { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking the galaxy for its films"), items: () => h("ui-table", { celled: true, selectable: true }, h("ui-row")) })
    ]
  }
}
export const filmsPage = new FilmsPage()

export class FilmPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>read the film's opening crawl</story>\n<story \"S2\" done>\n  As a fan, I want to see who's in a film, so that I can find their other films\n  - done when:  its people are listed, each a link to their page\n</story>\n<story \"S3\" done>see the planets, starships and vehicles it shows</story>\n<story \"S4\" done>\n  As a fan, I want to say what I thought of a film, so that I remember it\n  - done when:  \"Add a review\" asks for stars and words, and the film's page lists the reviews\n</story>"

  /** The film the address names:  /films/:film */
  // - its "film" is a film
  static { this.declareProp("film", { type: "Film", link: true }) }
  get film() { return core.linked(this, "film", Film) }
  set film(value) { this.setProp("film", value) }

  /** What's been said of it, on this device */
  static { this.declareProp("reviews", { declaredAt: { path: "/StarWarsSite.spell", start: 2597, end: 2791 }, readsFrom: ["galaxy_reviews"] }) }
  get reviews() { return core.waitedValue(this, "reviews", async () => {
    const title = (await core.answerOf(this, "film"))?.title
    return await core.savedThings(Review, { filter: { filmTitle: title }, sort: [{ field: "created", descending: true }] })
  }) }

  static drawsWaiting = true
  draw() {
    return [
      core.drawThing(new PageTop({ title: this.film?.title })),
      h("ui-text", { color: "grey" },
        "Episode ",
        () => core.whileWaiting(() => this.film?.episodeId),
        " · directed by ",
        () => core.whileWaiting(() => this.film?.director),
        " · released ",
        () => core.whileWaiting(() => core.dateShown(this.film?.releaseDate))
      ),
      h("ui-segment",
        h("ui-text", { paragraph: true }, () => core.whileWaiting(() => this.film?.openingCrawl))
      ),
      h("ui-header", { size: "small" }, "Who's in it"),
      core.drawRead(() => this.film?.characters, (person) => h("ui-button", {
        class: "person",
        appearance: "basic",
        size: "small",
        onClick: core.pressed(this, () => core.showSitePart("person sidebar", person)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, () => person.name), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Following the links"), items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" }) }),
      h("ui-header", { size: "small" }, "Where it happens"),
      core.drawRead(() => this.film?.planets, (planet) => h("ui-link", { link: () => core.siteAddressOf("planet page", planet) }, () => planet.name), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Following the links"), items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" }) }),
      h("ui-header", { size: "small" }, "What they fly"),
      core.drawRead(() => this.film?.starships, (starship) => h("ui-link", { link: () => core.siteAddressOf("starship page", starship) }, () => starship.name), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Following the links"), items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" }) }),
      h("ui-header", { size: "small" }, "What they drive"),
      core.drawRead(() => this.film?.vehicles, (vehicle) => h("ui-link", { link: () => core.siteAddressOf("vehicle page", vehicle) }, () => vehicle.name), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Following the links"), items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" }) }),
      h("ui-stack", { direction: "horizontal", align: "center", justify: "between" },
        h("ui-header", { size: "small" }, "Reviews"),
        h("ui-button", {
          class: "add-review",
          color: "primary",
          icon: "pencil",
          onClick: core.pressed(this, async () => core.showSitePart("review dialog", await core.answerOf(this, "film"))),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Add a review")
      ),
      core.drawRead(() => this.reviews, (review) => h("ui-segment", { class: "review" }, h("ui-text", () => review.stars, " of 5 · ", () => review.words)), { none: () => h("ui-text", "No reviews yet:  be the first.") })
    ]
  }
}
export const filmPage = new FilmPage()

core.heading("The people")
//# The people

export class PeoplePage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\">find a person by name as I type</story>\n<story \"S2\" done>see each person's home planet and species at a glance</story>\n<story \"S3\" done>open a person in the side panel without leaving the list</story>"

  draw() {
    return [
      core.drawThing(new PageTop({ title: "People" })),
      core.drawRead(async () => await core.savedThings(Character, {}, "as drawn"), (person) => [
        h("ui-cell", { "data-column": "Name" },
          h("ui-link", { link: () => core.siteAddressOf("person page", person) }, () => person.name)
        ),
        h("ui-cell", { "data-column": "Born" }, () => person.birthYear),
        h("ui-cell", { "data-column": "Home" }, () => person.homeworld.name),
        h("ui-cell", { "data-column": "" },
          h("ui-button", {
            appearance: "basic",
            size: "small",
            onClick: core.pressed(this, () => core.showSitePart("person sidebar", person)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Glance")
        )
      ], { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking the galaxy for its people"), items: () => h("ui-table", { celled: true, selectable: true }, h("ui-row")) })
    ]
  }
}
export const peoplePage = new PeoplePage()

export class PersonPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see a person's height, birth year and home planet</story>\n<story \"S2\" done>\n  As a fan, I want to see every film a person is in, so that I can follow their story\n  - done when:  their films are listed in release order, each a link\n</story>"

  /** The person the address names:  /people/:person */
  // - its "person" is a character
  static { this.declareProp("person", { type: "Character", link: true }) }
  get person() { return core.linked(this, "person", Character) }
  set person(value) { this.setProp("person", value) }

  static drawsWaiting = true
  draw() {
    return [
      core.drawThing(new PageTop({ title: this.person?.name })),
      core.drawThing(new PersonFact({ person: this.person })),
      h("ui-header", { size: "small" }, "Films"),
      core.drawRead(() => this.person?.films, (film) => h("ui-link", { link: () => core.siteAddressOf("film page", film) }, () => film.title), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Following the links"), items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" }) })
    ]
  }
}
export const personPage = new PersonPage()

core.heading("The planets")
//# The planets

export class PlanetsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see every planet, with its climate and terrain</story>\n<story \"S2\">sort the planets by how many people live there</story>"

  draw() {
    return [
      core.drawThing(new PageTop({ title: "Planets" })),
      core.drawRead(async () => await core.savedThings(Planet, {}, "as drawn"), (planet) => [
        h("ui-cell", { "data-column": "Name" },
          h("ui-link", { link: () => core.siteAddressOf("planet page", planet) }, () => planet.name)
        ),
        h("ui-cell", { "data-column": "Climate" }, () => planet.climate),
        h("ui-cell", { "data-column": "Terrain" }, () => planet.terrain),
        h("ui-cell", { "data-column": "Population" }, () => planet.population)
      ], { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking the galaxy for its planets"), items: () => h("ui-table", { celled: true, selectable: true }, h("ui-row")) })
    ]
  }
}
export const planetsPage = new PlanetsPage()

export class PlanetPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see who comes from a planet</story>\n<story \"S2\" done>see the films a planet appears in</story>"

  /** The planet the address names:  /planets/:planet */
  // - its "planet" is a planet
  static { this.declareProp("planet", { type: "Planet", link: true }) }
  get planet() { return core.linked(this, "planet", Planet) }
  set planet(value) { this.setProp("planet", value) }

  static drawsWaiting = true
  draw() {
    return [
      core.drawThing(new PageTop({ title: this.planet?.name })),
      h("ui-text", { color: "grey" },
        () => core.whileWaiting(() => this.planet?.climate),
        " · ",
        () => core.whileWaiting(() => this.planet?.terrain),
        " · ",
        () => core.whileWaiting(() => this.planet?.population),
        " people"
      ),
      h("ui-header", { size: "small" }, "Who's from here"),
      core.drawRead(() => this.planet?.residents, (person) => h("ui-button", {
        appearance: "basic",
        size: "small",
        onClick: core.pressed(this, () => core.showSitePart("person sidebar", person)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, () => person.name), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Following the links"), items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" }) }),
      h("ui-header", { size: "small" }, "Seen in"),
      core.drawRead(() => this.planet?.films, (film) => h("ui-link", { link: () => core.siteAddressOf("film page", film) }, () => film.title), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Following the links"), items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" }) })
    ]
  }
}
export const planetPage = new PlanetPage()

core.heading("The species")
//# The species

export class SpeciesListPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see every species, with its classification and language</story>\n<story \"S2\">filter the species by how long they live</story>"

  draw() {
    return [
      core.drawThing(new PageTop({ title: "Species" })),
      core.drawRead(async () => await core.savedThings(Species, {}, "as drawn"), (one) => [
        h("ui-cell", { "data-column": "Name" },
          h("ui-link", { link: () => core.siteAddressOf("species page", one) }, () => one.name)
        ),
        h("ui-cell", { "data-column": "Classification" }, () => one.classification),
        h("ui-cell", { "data-column": "Language" }, () => one.language),
        h("ui-cell", { "data-column": "Lives" }, () => one.averageLifespan)
      ], { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking the galaxy for its species"), items: () => h("ui-table", { celled: true, selectable: true }, h("ui-row")) })
    ]
  }
}
export const speciesListPage = new SpeciesListPage()

export class SpeciesPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see the people of a species</story>\n<story \"S2\">see a species' home world</story>"

  /** The species the address names:  /species/:species */
  // - its "species" is a species
  static { this.declareProp("species", { type: "Species", link: true }) }
  get species() { return core.linked(this, "species", Species) }
  set species(value) { this.setProp("species", value) }

  static drawsWaiting = true
  draw() {
    return [
      core.drawThing(new PageTop({ title: this.species?.name })),
      h("ui-text", { color: "grey" },
        () => core.whileWaiting(() => this.species?.classification),
        " · speaks ",
        () => core.whileWaiting(() => this.species?.language)
      ),
      h("ui-header", { size: "small" }, "Its people"),
      core.drawRead(() => this.species?.people, (person) => h("ui-button", {
        appearance: "basic",
        size: "small",
        onClick: core.pressed(this, () => core.showSitePart("person sidebar", person)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, () => person.name), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Following the links"), items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" }) })
    ]
  }
}
export const speciesPage = new SpeciesPage()

core.heading("The vehicles and starships")
//# The vehicles and starships

export class VehiclesPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see every vehicle, with its class and crew</story>\n<story \"S2\">sort the vehicles by speed</story>"

  draw() {
    return [
      core.drawThing(new PageTop({ title: "Vehicles" })),
      core.drawRead(async () => await core.savedThings(Vehicle, {}, "as drawn"), (vehicle) => [
        h("ui-cell", { "data-column": "Name" },
          h("ui-link", { link: () => core.siteAddressOf("vehicle page", vehicle) }, () => vehicle.name)
        ),
        h("ui-cell", { "data-column": "Class" }, () => vehicle.vehicleClass),
        h("ui-cell", { "data-column": "Crew" }, () => vehicle.crew)
      ], { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking the galaxy for its vehicles"), items: () => h("ui-table", { celled: true, selectable: true }, h("ui-row")) })
    ]
  }
}
export const vehiclesPage = new VehiclesPage()

export class VehiclePage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see who has piloted a vehicle</story>\n<story \"S2\" done>see the films it appears in</story>"

  /** The vehicle the address names:  /vehicles/:vehicle */
  // - its "vehicle" is a vehicle
  static { this.declareProp("vehicle", { type: "Vehicle", link: true }) }
  get vehicle() { return core.linked(this, "vehicle", Vehicle) }
  set vehicle(value) { this.setProp("vehicle", value) }

  static drawsWaiting = true
  draw() {
    return [
      core.drawThing(new PageTop({ title: this.vehicle?.name })),
      h("ui-text", { color: "grey" },
        () => core.whileWaiting(() => this.vehicle?.model),
        " · ",
        () => core.whileWaiting(() => this.vehicle?.manufacturer)
      ),
      h("ui-header", { size: "small" }, "Piloted by"),
      core.drawRead(() => this.vehicle?.pilots, (person) => h("ui-button", {
        appearance: "basic",
        size: "small",
        onClick: core.pressed(this, () => core.showSitePart("person sidebar", person)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, () => person.name), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Following the links"),
        none: () => h("ui-text", "Nobody we know of."),
        items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" })
      }),
      h("ui-header", { size: "small" }, "Seen in"),
      core.drawRead(() => this.vehicle?.films, (film) => h("ui-link", { link: () => core.siteAddressOf("film page", film) }, () => film.title), { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Following the links"), items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" }) })
    ]
  }
}
export const vehiclePage = new VehiclePage()

export class StarshipsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see every starship, with its class and hyperdrive rating</story>\n<story \"S2\">\n  As a pilot, I want to compare two starships side by side, so that I can pick the faster one\n  - done when:  picking two starships shows their numbers in two columns\n</story>"

  draw() {
    return [
      core.drawThing(new PageTop({ title: "Starships" })),
      core.drawRead(async () => await core.savedThings(Starship, {}, "as drawn"), (starship) => [
        h("ui-cell", { "data-column": "Name" },
          h("ui-link", { link: () => core.siteAddressOf("starship page", starship) }, () => starship.name)
        ),
        h("ui-cell", { "data-column": "Class" }, () => starship.starshipClass),
        h("ui-cell", { "data-column": "Hyperdrive" }, () => starship.hyperdriveRating)
      ], { waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Asking the galaxy for its starships"), items: () => h("ui-table", { celled: true, selectable: true }, h("ui-row")) })
    ]
  }
}
export const starshipsPage = new StarshipsPage()

export class StarshipPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see a starship's pilots</story>\n<story \"S2\" done>see its length, crew and cost</story>"

  /** The starship the address names:  /starships/:starship */
  // - its "starship" is a starship
  static { this.declareProp("starship", { type: "Starship", link: true }) }
  get starship() { return core.linked(this, "starship", Starship) }
  set starship(value) { this.setProp("starship", value) }

  static drawsWaiting = true
  draw() {
    return [
      core.drawThing(new PageTop({ title: this.starship?.name })),
      h("ui-text", { color: "grey" },
        () => core.whileWaiting(() => this.starship?.length),
        " m long · crew ",
        () => core.whileWaiting(() => this.starship?.crew),
        " · ",
        () => core.whileWaiting(() => this.starship?.costInCredits),
        " credits"
      ),
      h("ui-header", { size: "small" }, "Piloted by"),
      core.drawRead(() => this.starship?.pilots, (person) => h("ui-button", {
        appearance: "basic",
        size: "small",
        onClick: core.pressed(this, () => core.showSitePart("person sidebar", person)),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, () => person.name), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true }, "Following the links"),
        none: () => h("ui-text", "Nobody we know of."),
        items: () => h("ui-stack", { direction: "horizontal", wrap: true, spacing: "xs" })
      })
    ]
  }
}
export const starshipPage = new StarshipPage()

core.heading("Every review, edited like a spreadsheet")
//# Every review, edited like a spreadsheet

export class ReviewsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  static stories = "<story \"S1\" done>see every review written on this device, in one table</story>\n<story \"S2\" done>\n  As a fan, I want to fix a review's stars or words in place, so that I don't have to write it again\n  - done when:  a cell edits as a spreadsheet's does, and Enter keeps it\n</story>\n<story \"S3\" done>add or remove a review right in the table</story>\n<story \"S4\" done>paste a block of reviews copied from a spreadsheet</story>"

  static drawsWaiting = true
  draw() {
    return [
      core.drawThing(new PageTop({ title: "Reviews" })),
      h("ui-table", {
        editable: true,
        celled: true,
        "prop:rows": () => core.waitedValue(this, "every review", async () => await core.savedThings(Review))
      })
    ]
  }
}
export const reviewsPage = new ReviewsPage()

core.heading("The dialogs:  the settings, and a review of a film")
//# The dialogs:  the settings, and a review of a film

core.heading("The site:  where each page is, its dialogs and sidebars, and the theme it wears")
//# The site:  where each page is, its dialogs and sidebars, and the theme it wears

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
  }, {
    name: "reviews page",
    page: "ReviewsPage",
    address: "/reviews",
    title: "Reviews"
  }]
  static dialogs = [{ name: "settings dialog", view: "SettingsDialog" }, { name: "review dialog", view: "ReviewDialog" }]
  static sidebars = [{ name: "person sidebar", view: "PersonSidebar" }]
  static notFoundPage = { name: "not found page" }
  static errorPage = { name: "error page" }

  /** The theme its pages wear:  a hand-drawn sketch, while it's a mockup */
  get theme() {
    return "mockup"
  }
}
export const galaxyGuide = new GalaxyGuide()

// -----------
if (!core.isCarryingOver) galaxyGuide.start()
