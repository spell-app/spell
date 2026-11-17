/*! SPELL: WORDS how-star-wars-works en */
export const words = {
  lang: "en",
  types: {
    Film: {
      title: "title",
      episodeId: "episode id",
      director: "director",
      releaseDate: "release date",
      characters: "characters",
      planets: "planets",
      card: "card",
      draw: "draw it",
      facts: "facts"
    },
    Character: {
      name: "name",
      birthYear: "birth year",
      hairColor: "hair color",
      eyeColor: "eye color",
      homeworld: "homeworld",
      films: "films",
      card: "card",
      draw: "draw it",
      facts: "facts"
    },
    Planet: {
      name: "name",
      climate: "climate",
      terrain: "terrain",
      residents: "residents",
      films: "films",
      card: "card",
      draw: "draw it",
      facts: "facts"
    },
    Card: {
      label: "label",
      kind: "kind",
      subject: "subject",
      draw: "draw it"
    },
    Fact: {
      label: "label",
      value: "value",
      date: "date",
      isKnown: "is known",
      draw: "draw it"
    },
    FactTable: {
      facts: "facts",
      shown: "shown",
      draw: "draw it"
    },
    Section: {
      heading: "heading",
      things: "things",
      single: "single",
      draw: "draw it"
    },
    Guide: {
      showing: "showing",
      trail: "trail",
      goBack: "go back",
      draw: "draw it"
    },
    Thing: {
      open: "open (a thing)"
    }
  },
  groups: {
    Thing: [
      { name: "The app:  a list of films, or the page of whatever's open", members: ["open"] }
    ]
  }
}
