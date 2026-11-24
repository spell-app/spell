import { core, Thing, List, App, Place, h } from "@spell/core"

export class Pokemon extends Thing {
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("baseExperience", { type: "number" }) }
  get baseExperience() { return this.getProp("baseExperience") }
  set baseExperience(value) { this.setProp("baseExperience", value) }

  static { this.declareProp("height", { type: "number" }) }
  get height() { return this.getProp("height") }
  set height(value) { this.setProp("height", value) }

  static { this.declareProp("default", { type: "choice", storedAs: "is_default" }) }
  get default() { return this.getProp("default") }
  set default(value) { this.setProp("default", value) }

  static { this.declareProp("order", { type: "number" }) }
  get order() { return this.getProp("order") }
  set order(value) { this.setProp("order", value) }

  static { this.declareProp("weight", { type: "number" }) }
  get weight() { return this.getProp("weight") }
  set weight(value) { this.setProp("weight", value) }

  static { this.declareProp("abilities", { itemType: "PokemonAbility", init: () => new List({ instanceType: "PokemonAbility" }) }) }
  get abilities() { return this.getProp("abilities") }
  set abilities(value) { this.setProp("abilities", value) }

  static { this.declareProp("pastAbilities", { itemType: "PastAbility", init: () => new List({ instanceType: "PastAbility" }) }) }
  get pastAbilities() { return this.getProp("pastAbilities") }
  set pastAbilities(value) { this.setProp("pastAbilities", value) }

  static { this.declareProp("forms", { itemType: "PokeApiName", init: () => new List({ instanceType: "PokeApiName" }) }) }
  get forms() { return this.getProp("forms") }
  set forms(value) { this.setProp("forms", value) }

  static { this.declareProp("gameIndices", { itemType: "GameIndex", init: () => new List({ instanceType: "GameIndex" }) }) }
  get gameIndices() { return this.getProp("gameIndices") }
  set gameIndices(value) { this.setProp("gameIndices", value) }

  static { this.declareProp("heldItems", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get heldItems() { return this.getProp("heldItems") }
  set heldItems(value) { this.setProp("heldItems", value) }

  static { this.declareProp("locationAreaEncounters", { type: "text" }) }
  get locationAreaEncounters() { return this.getProp("locationAreaEncounters") }
  set locationAreaEncounters(value) { this.setProp("locationAreaEncounters", value) }

  static { this.declareProp("moves", { itemType: "PokemonMove", init: () => new List({ instanceType: "PokemonMove" }) }) }
  get moves() { return this.getProp("moves") }
  set moves(value) { this.setProp("moves", value) }

  static { this.declareProp("species", { type: "PokemonSpecies", link: true }) }
  get species() { return core.linked(this, "species", PokemonSpecies) }
  set species(value) { this.setProp("species", value) }

  static { this.declareProp("sprites", { type: "Sprite" }) }
  get sprites() { return this.getProp("sprites") }
  set sprites(value) { this.setProp("sprites", value) }

  static { this.declareProp("cries", { type: "Cry" }) }
  get cries() { return this.getProp("cries") }
  set cries(value) { this.setProp("cries", value) }

  static { this.declareProp("stats", { itemType: "Stat", init: () => new List({ instanceType: "Stat" }) }) }
  get stats() { return this.getProp("stats") }
  set stats(value) { this.setProp("stats", value) }

  static { this.declareProp("pastStats", { itemType: "PastStat", init: () => new List({ instanceType: "PastStat" }) }) }
  get pastStats() { return this.getProp("pastStats") }
  set pastStats(value) { this.setProp("pastStats", value) }

  static { this.declareProp("types", { itemType: "PokemonType", init: () => new List({ instanceType: "PokemonType" }) }) }
  get types() { return this.getProp("types") }
  set types(value) { this.setProp("types", value) }

  static { this.declareProp("pastTypes", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get pastTypes() { return this.getProp("pastTypes") }
  set pastTypes(value) { this.setProp("pastTypes", value) }

  static { this.declareProp("picture", { readsFrom: ["poke_api"] }) }
  get picture() {
    return this.sprites?.other?.officialArtwork?.frontDefault
  }

  static { this.declareProp("sound", { readsFrom: ["poke_api"] }) }
  get sound() {
    return this.cries?.latest
  }

  static { this.declareProp("numberTag", { readsFrom: ["poke_api"] }) }
  get numberTag() {
    if (this.number < 10) return `#000${this.number}`
    if (this.number < 100) return `#00${this.number}`
    if (this.number < 1000) return `#0${this.number}`
    return `#${this.number}`
  }

  static { this.declareProp("evolutions", { readsFrom: ["poke_api"] }) }
  get evolutions() {
    return this.species?.evolutionChain?.chain
  }

  static { this.declareProp("loved", { readsFrom: ["my_favourites"] }) }
  get loved() { return core.waitedValue(this, "loved", async () => {
    const address = this.id
    return core.itemCountOf(await core.savedThings(Favourite, { filter: { address: address } })) > 0
  }, () => [this.id]) }

  async open() {
    if ((await core.answerOf(pokedex, "showing")) === this) return
    if (await core.answerOf(pokedex, "showing")) {
      core.stop((await core.answerOf(pokedex, "showing"))?.sound)

      core.append(await core.answerOf(pokedex, "trail"), await core.answerOf(pokedex, "showing"))
    }
    pokedex.search = ""
    pokedex.showing = this
    core.loadSound(this.sound)

    core.scrollToTop()
  }

  hear() {
    core.play(this.sound)
  }

  async love() {
    const address = this.id
    if (core.itemCountOf(await core.savedThings(Favourite, { filter: { address: address } })) > 0) await core.inOneGo(async () => core.map(core.filter(await core.savedThings(Favourite, { filter: { address: address } }), (favourite) => favourite.address === address), (favourite) => core.removeSaved(favourite)))
    else core.saveThing(new Favourite({ name: this.name, address: address }))
  }

  draw() {
    return h("ui-card", {
      appearance: "link raised",
      onClick: core.pressed(this, async () => await this.open()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    },
      h("ui-image", { appearance: "circular", background: "yellow", src: () => this.picture, alt: "", "aspect-ratio": "1" }),
      h("ui-content",
        h("ui-header", { size: "large", font: "title-caps" }, () => this.name),
        h("ui-meta", "Number ", () => this.number)
      )
    )
  }

  drawPage() {
    return [
      h("ui-stack", { direction: "horizontal", wrap: true, align: "center" },
        h("ui-image", {
          appearance: "circular",
          background: "yellow",
          size: "large",
          src: () => this.picture,
          alt: () => this.name,
          "aspect-ratio": "1"
        }),
        h("ui-stack", { fluid: true, align: "start" },
          h("ui-header", { size: "poster", color: "red", font: "title-caps heavy" }, () => this.name),
          h("ui-text", { size: "huge" }, "Number ", () => this.number),
          h("ui-stack", { direction: "horizontal", wrap: true },
            h("slot", { name: "kinds" }, () => this.drawKinds())
          ),
          h("ui-text", { size: "large" },
            h("ui-dimension", { value: () => this.height * 10, dimension: "length", unit: "cm" }),
            " tall, and ",
            h("ui-dimension", { value: () => this.weight / 10, dimension: "weight", unit: "kg" }),
            " heavy"
          ),
          h("ui-stack", { direction: "horizontal", align: "center" },
            h("slot", { name: "heart" }, () => this.drawHeart()),
            h("ui-button", {
              color: "blue",
              appearance: "circular",
              size: "massive",
              icon: "volume up",
              onClick: core.pressed(this, () => this.hear()),
              title: "Hear it",
              "aria-label": "Hear it",
              style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
            })
          )
        )
      ),
      h("ui-header", { size: "large" }, "How strong is it?"),
      h("slot", { name: "strengths" }, () => this.drawStrengths()),
      h("ui-header", { class: "section", size: "large", part: "page" }, "Evolutions"),
      h("slot", { name: "family" }, () => this.drawFamily())
    ]
  }

  drawFamily() { return core.drawWaiting(() => {
    return core.drawThing(this.evolutions)
  }) }

  drawEvolution() {
    return h("ui-card", {
      appearance: "link",
      width: "10em",
      onClick: core.pressed(this, async () => await this.open()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
      part: "evolution"
    },
      h("ui-image", {
        appearance: "circular",
        background: "yellow",
        "aspect-ratio": "1",
        size: "small",
        align: "center",
        src: () => this.picture,
        alt: ""
      }),
      h("ui-content", { align: "center" },
        h("ui-header", () => this.name),
        h("ui-meta", () => this.numberTag),
        h("slot", { name: "pills" }, () => this.drawPills())
      )
    )
  }

  drawPills() {
    return core.drawRead(() => this.types, (type) => core.drawThing(type), { items: () => h("ui-labels", { size: "small", part: "pills" }) })
  }

  drawHeart() { return core.drawWaiting(() => {
    if (this.loved) {
      return h("ui-button", {
        color: "red",
        appearance: "circular",
        size: "massive",
        icon: "heart",
        onClick: core.pressed(this, async () => await this.love()),
        title: "One of my favourites",
        "aria-label": "One of my favourites",
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
        part: "heart"
      })
    } else {
      return h("ui-button", {
        appearance: "circular",
        size: "massive",
        icon: "heart outline",
        onClick: core.pressed(this, async () => await this.love()),
        title: "Keep it as a favourite",
        "aria-label": "Keep it as a favourite",
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
        part: "heart"
      })
    }
  }) }

  drawKinds() {
    return core.drawRead(() => this.types, (type) => core.drawThing(type), { items: () => h("ui-labels", { size: "huge", part: "kinds" }) })
  }

  drawStrengths() {
    return core.drawEach(this.stats, (stat) => h("ui-progress", {
      "max-width": "36em",
      value: () => stat.baseStat,
      total: "255",
      color: "green",
      size: "large",
      label: () => `${stat.word}:  {value}`,
      part: "strengths"
    }))
  }

  static savedIn = {
    place: "poke_api",
    collection: "pokemon",
    times: ["created", "modified"], select: ["number", "name", "height", "weight", "species", "sprites", "cries", "stats", "types"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
core.describeAction(Pokemon, "open", { title: "Open It", undoneAs: "Open It" })
core.describeAction(Pokemon, "hear", { title: "Hear It", undoneAs: "Hear It" })
core.describeAction(Pokemon, "love", { title: "Love It", undoneAs: "Love It" })

export class PokemonSpecies extends Thing {
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("order", { type: "number" }) }
  get order() { return this.getProp("order") }
  set order(value) { this.setProp("order", value) }

  static { this.declareProp("genderRate", { type: "number" }) }
  get genderRate() { return this.getProp("genderRate") }
  set genderRate(value) { this.setProp("genderRate", value) }

  static { this.declareProp("captureRate", { type: "number" }) }
  get captureRate() { return this.getProp("captureRate") }
  set captureRate(value) { this.setProp("captureRate", value) }

  static { this.declareProp("baseHappiness", { type: "number" }) }
  get baseHappiness() { return this.getProp("baseHappiness") }
  set baseHappiness(value) { this.setProp("baseHappiness", value) }

  static { this.declareProp("baby", { type: "choice", storedAs: "is_baby" }) }
  get baby() { return this.getProp("baby") }
  set baby(value) { this.setProp("baby", value) }

  static { this.declareProp("legendary", { type: "choice", storedAs: "is_legendary" }) }
  get legendary() { return this.getProp("legendary") }
  set legendary(value) { this.setProp("legendary", value) }

  static { this.declareProp("mythical", { type: "choice", storedAs: "is_mythical" }) }
  get mythical() { return this.getProp("mythical") }
  set mythical(value) { this.setProp("mythical", value) }

  static { this.declareProp("hatchCounter", { type: "number" }) }
  get hatchCounter() { return this.getProp("hatchCounter") }
  set hatchCounter(value) { this.setProp("hatchCounter", value) }

  static { this.declareProp("genderDifferences", { type: "choice", storedAs: "has_gender_differences" }) }
  get genderDifferences() { return this.getProp("genderDifferences") }
  set genderDifferences(value) { this.setProp("genderDifferences", value) }

  static { this.declareProp("formsSwitchable", { type: "choice" }) }
  get formsSwitchable() { return this.getProp("formsSwitchable") }
  set formsSwitchable(value) { this.setProp("formsSwitchable", value) }

  static { this.declareProp("growthRate", { type: "PokeApiName" }) }
  get growthRate() { return this.getProp("growthRate") }
  set growthRate(value) { this.setProp("growthRate", value) }

  static { this.declareProp("pokedexNumbers", { itemType: "PokedexNumber", init: () => new List({ instanceType: "PokedexNumber" }) }) }
  get pokedexNumbers() { return this.getProp("pokedexNumbers") }
  set pokedexNumbers(value) { this.setProp("pokedexNumbers", value) }

  static { this.declareProp("eggGroups", { itemType: "PokeApiName", init: () => new List({ instanceType: "PokeApiName" }) }) }
  get eggGroups() { return this.getProp("eggGroups") }
  set eggGroups(value) { this.setProp("eggGroups", value) }

  static { this.declareProp("color", { type: "PokeApiName" }) }
  get color() { return this.getProp("color") }
  set color(value) { this.setProp("color", value) }

  static { this.declareProp("shape", { type: "PokeApiName" }) }
  get shape() { return this.getProp("shape") }
  set shape(value) { this.setProp("shape", value) }

  static { this.declareProp("evolvesFromSpecies", { type: "PokemonSpecies", link: true }) }
  get evolvesFromSpecies() { return core.linked(this, "evolvesFromSpecies", PokemonSpecies) }
  set evolvesFromSpecies(value) { this.setProp("evolvesFromSpecies", value) }

  static { this.declareProp("evolutionChain", { type: "EvolutionChain", link: true }) }
  get evolutionChain() { return core.linked(this, "evolutionChain", EvolutionChain) }
  set evolutionChain(value) { this.setProp("evolutionChain", value) }

  static { this.declareProp("habitat", { type: "PokeApiName" }) }
  get habitat() { return this.getProp("habitat") }
  set habitat(value) { this.setProp("habitat", value) }

  static { this.declareProp("generation", { type: "Generation", link: true }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }) }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  static { this.declareProp("palParkEncounters", { itemType: "PalParkEncounter", init: () => new List({ instanceType: "PalParkEncounter" }) }) }
  get palParkEncounters() { return this.getProp("palParkEncounters") }
  set palParkEncounters(value) { this.setProp("palParkEncounters", value) }

  static { this.declareProp("formDescriptions", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get formDescriptions() { return this.getProp("formDescriptions") }
  set formDescriptions(value) { this.setProp("formDescriptions", value) }

  static { this.declareProp("flavorTextEntries", { itemType: "FlavorTextEntry", init: () => new List({ instanceType: "FlavorTextEntry" }) }) }
  get flavorTextEntries() { return this.getProp("flavorTextEntries") }
  set flavorTextEntries(value) { this.setProp("flavorTextEntries", value) }

  static { this.declareProp("genera", { itemType: "Genus", init: () => new List({ instanceType: "Genus" }) }) }
  get genera() { return this.getProp("genera") }
  set genera(value) { this.setProp("genera", value) }

  static { this.declareProp("varieties", { itemType: "Variety", init: () => new List({ instanceType: "Variety" }) }) }
  get varieties() { return this.getProp("varieties") }
  set varieties(value) { this.setProp("varieties", value) }

  static { this.declareProp("pokemon", { readsFrom: ["poke_api", "my_favourites"] }) }
  get pokemon() { return core.waitedValue(this, "pokemon", async () => {
    return await core.answerOf(core.getItemAt(this.varieties, 0), "pokemon")
  }, () => [this.varieties]) }

  static drawsWaiting = true
  draw() {
    return this.pokemon.drawEvolution()
  }

  static savedIn = {
    place: "poke_api",
    collection: "pokemon_species",
    times: ["created", "modified"], select: ["number", "name", "evolutionChain", "varieties"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Type extends Thing {
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("damageRelations", { type: "DamageRelation" }) }
  get damageRelations() { return this.getProp("damageRelations") }
  set damageRelations(value) { this.setProp("damageRelations", value) }

  static { this.declareProp("pastDamageRelations", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get pastDamageRelations() { return this.getProp("pastDamageRelations") }
  set pastDamageRelations(value) { this.setProp("pastDamageRelations", value) }

  static { this.declareProp("gameIndices", { itemType: "GameIndex", init: () => new List({ instanceType: "GameIndex" }) }) }
  get gameIndices() { return this.getProp("gameIndices") }
  set gameIndices(value) { this.setProp("gameIndices", value) }

  static { this.declareProp("generation", { type: "Generation", link: true }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  static { this.declareProp("moveDamageClass", { type: "PokeApiName" }) }
  get moveDamageClass() { return this.getProp("moveDamageClass") }
  set moveDamageClass(value) { this.setProp("moveDamageClass", value) }

  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }) }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  static { this.declareProp("pokemon", { itemType: "TypePokemon", init: () => new List({ instanceType: "TypePokemon" }) }) }
  get pokemon() { return this.getProp("pokemon") }
  set pokemon(value) { this.setProp("pokemon", value) }

  static { this.declareProp("moves", { itemType: "Move", init: () => new List({ instanceType: "Move" }) }) }
  get moves() { return core.linked(this, "moves", Move) }
  set moves(value) { this.setProp("moves", value) }

  static { this.declareProp("isReal", { readsFrom: ["poke_api"] }) }
  get isReal() {
    return this.name !== "unknown" && this.name !== "shadow" && this.name !== "stellar"
  }

  static { this.declareProp("colour", { readsFrom: ["poke_api"] }) }
  get colour() {
    if (this.name === "fire") return "red"
    if (this.name === "water" || this.name === "ice") return "blue"
    if (this.name === "grass" || this.name === "bug") return "green"
    if (this.name === "electric") return "yellow"
    if (this.name === "psychic" || this.name === "fairy") return "pink"
    if (this.name === "poison" || this.name === "ghost") return "purple"
    if (this.name === "dragon") return "violet"
    if (this.name === "ground" || this.name === "rock" || this.name === "fighting") return "brown"
    if (this.name === "flying") return "teal"
    if (this.name === "dark") return "black"
    if (this.name === "steel") return "grey"
    return "orange"
  }

  async pick() {
    pokedex.pickedKind = this
    pokedex.showing = undefined
  }

  draw() {
    return h("ui-button", {
      class: "kind",
      color: () => this.colour,
      size: "large",
      font: "title-caps",
      onClick: core.pressed(this, async () => await this.pick()),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
    }, () => this.name)
  }

  static savedIn = {
    place: "poke_api",
    collection: "types",
    times: ["created", "modified"], select: ["number", "name", "pokemon"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
core.describeAction(Type, "pick", { title: "Pick It", undoneAs: "Pick It" })

export class Ability extends Thing {
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("mainSeries", { type: "choice", storedAs: "is_main_series" }) }
  get mainSeries() { return this.getProp("mainSeries") }
  set mainSeries(value) { this.setProp("mainSeries", value) }

  static { this.declareProp("generation", { type: "Generation", link: true }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }) }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  static { this.declareProp("effectEntries", { itemType: "EffectEntry", init: () => new List({ instanceType: "EffectEntry" }) }) }
  get effectEntries() { return this.getProp("effectEntries") }
  set effectEntries(value) { this.setProp("effectEntries", value) }

  static { this.declareProp("effectChanges", { itemType: "EffectChange", init: () => new List({ instanceType: "EffectChange" }) }) }
  get effectChanges() { return this.getProp("effectChanges") }
  set effectChanges(value) { this.setProp("effectChanges", value) }

  static { this.declareProp("flavorTextEntries", { itemType: "FlavorTextEntry", init: () => new List({ instanceType: "FlavorTextEntry" }) }) }
  get flavorTextEntries() { return this.getProp("flavorTextEntries") }
  set flavorTextEntries(value) { this.setProp("flavorTextEntries", value) }

  static { this.declareProp("pokemon", { itemType: "AbilityPokemon", init: () => new List({ instanceType: "AbilityPokemon" }) }) }
  get pokemon() { return this.getProp("pokemon") }
  set pokemon(value) { this.setProp("pokemon", value) }

  static savedIn = {
    place: "poke_api",
    collection: "abilities",
    times: ["created", "modified"], select: ["number", "name", "pokemon"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Move extends Thing {
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("accuracy", { type: "number" }) }
  get accuracy() { return this.getProp("accuracy") }
  set accuracy(value) { this.setProp("accuracy", value) }

  static { this.declareProp("pp", { type: "number" }) }
  get pp() { return this.getProp("pp") }
  set pp(value) { this.setProp("pp", value) }

  static { this.declareProp("priority", { type: "number" }) }
  get priority() { return this.getProp("priority") }
  set priority(value) { this.setProp("priority", value) }

  static { this.declareProp("power", { type: "number" }) }
  get power() { return this.getProp("power") }
  set power(value) { this.setProp("power", value) }

  static { this.declareProp("contestCombos", { type: "ContestCombo" }) }
  get contestCombos() { return this.getProp("contestCombos") }
  set contestCombos(value) { this.setProp("contestCombos", value) }

  static { this.declareProp("contestType", { type: "PokeApiName" }) }
  get contestType() { return this.getProp("contestType") }
  set contestType(value) { this.setProp("contestType", value) }

  static { this.declareProp("contestEffect", { type: "PokeApiName" }) }
  get contestEffect() { return this.getProp("contestEffect") }
  set contestEffect(value) { this.setProp("contestEffect", value) }

  static { this.declareProp("damageClass", { type: "PokeApiName" }) }
  get damageClass() { return this.getProp("damageClass") }
  set damageClass(value) { this.setProp("damageClass", value) }

  static { this.declareProp("effectEntries", { itemType: "EffectEntry", init: () => new List({ instanceType: "EffectEntry" }) }) }
  get effectEntries() { return this.getProp("effectEntries") }
  set effectEntries(value) { this.setProp("effectEntries", value) }

  static { this.declareProp("effectChanges", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get effectChanges() { return this.getProp("effectChanges") }
  set effectChanges(value) { this.setProp("effectChanges", value) }

  static { this.declareProp("generation", { type: "Generation", link: true }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  static { this.declareProp("meta", { type: "Meta" }) }
  get meta() { return this.getProp("meta") }
  set meta(value) { this.setProp("meta", value) }

  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }) }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  static { this.declareProp("pastValues", { itemType: "PastValue", init: () => new List({ instanceType: "PastValue" }) }) }
  get pastValues() { return this.getProp("pastValues") }
  set pastValues(value) { this.setProp("pastValues", value) }

  static { this.declareProp("statChanges", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get statChanges() { return this.getProp("statChanges") }
  set statChanges(value) { this.setProp("statChanges", value) }

  static { this.declareProp("superContestEffect", { type: "PokeApiName" }) }
  get superContestEffect() { return this.getProp("superContestEffect") }
  set superContestEffect(value) { this.setProp("superContestEffect", value) }

  static { this.declareProp("target", { type: "PokeApiName" }) }
  get target() { return this.getProp("target") }
  set target(value) { this.setProp("target", value) }

  static { this.declareProp("kind", { type: "Type", storedAs: "type", link: true }) }
  get kind() { return core.linked(this, "kind", Type) }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("machines", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get machines() { return this.getProp("machines") }
  set machines(value) { this.setProp("machines", value) }

  static { this.declareProp("flavorTextEntries", { itemType: "FlavorTextEntry", init: () => new List({ instanceType: "FlavorTextEntry" }) }) }
  get flavorTextEntries() { return this.getProp("flavorTextEntries") }
  set flavorTextEntries(value) { this.setProp("flavorTextEntries", value) }

  static { this.declareProp("learnedByPokemon", { itemType: "Pokemon", init: () => new List({ instanceType: "Pokemon" }) }) }
  get learnedByPokemon() { return core.linked(this, "learnedByPokemon", Pokemon) }
  set learnedByPokemon(value) { this.setProp("learnedByPokemon", value) }

  static savedIn = {
    place: "poke_api",
    collection: "moves",
    times: ["created", "modified"], select: ["number", "name", "kind"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class EvolutionChain extends Thing {
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("chain", { type: "Chain" }) }
  get chain() { return this.getProp("chain") }
  set chain(value) { this.setProp("chain", value) }

  static savedIn = {
    place: "poke_api",
    collection: "evolution_chains",
    times: ["created", "modified"], select: ["number", "chain"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Generation extends Thing {
  static { this.declareProp("number", { type: "number", storedAs: "id" }) }
  get number() { return this.getProp("number") }
  set number(value) { this.setProp("number", value) }

  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("abilities", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get abilities() { return this.getProp("abilities") }
  set abilities(value) { this.setProp("abilities", value) }

  static { this.declareProp("mainRegion", { type: "PokeApiName" }) }
  get mainRegion() { return this.getProp("mainRegion") }
  set mainRegion(value) { this.setProp("mainRegion", value) }

  static { this.declareProp("moves", { itemType: "Move", init: () => new List({ instanceType: "Move" }) }) }
  get moves() { return core.linked(this, "moves", Move) }
  set moves(value) { this.setProp("moves", value) }

  static { this.declareProp("names", { itemType: "Name", init: () => new List({ instanceType: "Name" }) }) }
  get names() { return this.getProp("names") }
  set names(value) { this.setProp("names", value) }

  static { this.declareProp("pokemonSpecies", { itemType: "PokemonSpecies", init: () => new List({ instanceType: "PokemonSpecies" }) }) }
  get pokemonSpecies() { return core.linked(this, "pokemonSpecies", PokemonSpecies) }
  set pokemonSpecies(value) { this.setProp("pokemonSpecies", value) }

  static { this.declareProp("types", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get types() { return core.linked(this, "types", Type) }
  set types(value) { this.setProp("types", value) }

  static { this.declareProp("versionGroups", { itemType: "PokeApiName", init: () => new List({ instanceType: "PokeApiName" }) }) }
  get versionGroups() { return this.getProp("versionGroups") }
  set versionGroups(value) { this.setProp("versionGroups", value) }

  static savedIn = {
    place: "poke_api",
    collection: "generations",
    times: ["created", "modified"], select: ["number", "name", "types"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class PokemonAbility extends Thing {
  static { this.declareProp("hidden", { type: "choice", storedAs: "is_hidden" }) }
  get hidden() { return this.getProp("hidden") }
  set hidden(value) { this.setProp("hidden", value) }

  static { this.declareProp("slot", { type: "number" }) }
  get slot() { return this.getProp("slot") }
  set slot(value) { this.setProp("slot", value) }

  static { this.declareProp("ability", { type: "Ability", link: true }) }
  get ability() { return core.linked(this, "ability", Ability) }
  set ability(value) { this.setProp("ability", value) }
}

export class PastAbility extends Thing {
  static { this.declareProp("generation", { type: "Generation", link: true }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  static { this.declareProp("abilities", { itemType: "PastAbilityAbility", init: () => new List({ instanceType: "PastAbilityAbility" }) }) }
  get abilities() { return this.getProp("abilities") }
  set abilities(value) { this.setProp("abilities", value) }
}

export class PastAbilityAbility extends Thing {
  static { this.declareProp("hidden", { type: "choice", storedAs: "is_hidden" }) }
  get hidden() { return this.getProp("hidden") }
  set hidden(value) { this.setProp("hidden", value) }

  static { this.declareProp("slot", { type: "number" }) }
  get slot() { return this.getProp("slot") }
  set slot(value) { this.setProp("slot", value) }
}

export class GameIndex extends Thing {
  static { this.declareProp("gameIndex", { type: "number" }) }
  get gameIndex() { return this.getProp("gameIndex") }
  set gameIndex(value) { this.setProp("gameIndex", value) }

  static { this.declareProp("version", { type: "PokeApiName" }) }
  get version() { return this.getProp("version") }
  set version(value) { this.setProp("version", value) }
}

export class PokemonMove extends Thing {
  static { this.declareProp("move", { type: "Move", link: true }) }
  get move() { return core.linked(this, "move", Move) }
  set move(value) { this.setProp("move", value) }

  static { this.declareProp("versionGroupDetails", { itemType: "VersionGroupDetail", init: () => new List({ instanceType: "VersionGroupDetail" }) }) }
  get versionGroupDetails() { return this.getProp("versionGroupDetails") }
  set versionGroupDetails(value) { this.setProp("versionGroupDetails", value) }
}

export class VersionGroupDetail extends Thing {
  static { this.declareProp("levelLearnedAt", { type: "number" }) }
  get levelLearnedAt() { return this.getProp("levelLearnedAt") }
  set levelLearnedAt(value) { this.setProp("levelLearnedAt", value) }

  static { this.declareProp("versionGroup", { type: "PokeApiName" }) }
  get versionGroup() { return this.getProp("versionGroup") }
  set versionGroup(value) { this.setProp("versionGroup", value) }

  static { this.declareProp("moveLearnMethod", { type: "PokeApiName" }) }
  get moveLearnMethod() { return this.getProp("moveLearnMethod") }
  set moveLearnMethod(value) { this.setProp("moveLearnMethod", value) }

  static { this.declareProp("order", { type: "number" }) }
  get order() { return this.getProp("order") }
  set order(value) { this.setProp("order", value) }
}

export class Sprite extends Thing {
  static { this.declareProp("other", { type: "Other" }) }
  get other() { return this.getProp("other") }
  set other(value) { this.setProp("other", value) }

  static { this.declareProp("backShiny", { type: "text" }) }
  get backShiny() { return this.getProp("backShiny") }
  set backShiny(value) { this.setProp("backShiny", value) }

  static { this.declareProp("frontShiny", { type: "text" }) }
  get frontShiny() { return this.getProp("frontShiny") }
  set frontShiny(value) { this.setProp("frontShiny", value) }

  static { this.declareProp("backDefault", { type: "text" }) }
  get backDefault() { return this.getProp("backDefault") }
  set backDefault(value) { this.setProp("backDefault", value) }

  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class Other extends Thing {
  static { this.declareProp("home", { type: "Home" }) }
  get home() { return this.getProp("home") }
  set home(value) { this.setProp("home", value) }

  static { this.declareProp("showdown", { type: "Showdown" }) }
  get showdown() { return this.getProp("showdown") }
  set showdown(value) { this.setProp("showdown", value) }

  static { this.declareProp("dreamWorld", { type: "DreamWorld" }) }
  get dreamWorld() { return this.getProp("dreamWorld") }
  set dreamWorld(value) { this.setProp("dreamWorld", value) }

  static { this.declareProp("officialArtwork", { type: "OfficialArtwork" }) }
  get officialArtwork() { return this.getProp("officialArtwork") }
  set officialArtwork(value) { this.setProp("officialArtwork", value) }
}

export class Home extends Thing {
  static { this.declareProp("frontShiny", { type: "text" }) }
  get frontShiny() { return this.getProp("frontShiny") }
  set frontShiny(value) { this.setProp("frontShiny", value) }

  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class Showdown extends Thing {
  static { this.declareProp("backShiny", { type: "text" }) }
  get backShiny() { return this.getProp("backShiny") }
  set backShiny(value) { this.setProp("backShiny", value) }

  static { this.declareProp("frontShiny", { type: "text" }) }
  get frontShiny() { return this.getProp("frontShiny") }
  set frontShiny(value) { this.setProp("frontShiny", value) }

  static { this.declareProp("backDefault", { type: "text" }) }
  get backDefault() { return this.getProp("backDefault") }
  set backDefault(value) { this.setProp("backDefault", value) }

  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class DreamWorld extends Thing {
  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class OfficialArtwork extends Thing {
  static { this.declareProp("frontShiny", { type: "text" }) }
  get frontShiny() { return this.getProp("frontShiny") }
  set frontShiny(value) { this.setProp("frontShiny", value) }

  static { this.declareProp("frontDefault", { type: "text" }) }
  get frontDefault() { return this.getProp("frontDefault") }
  set frontDefault(value) { this.setProp("frontDefault", value) }
}

export class Cry extends Thing {
  static { this.declareProp("latest", { type: "text" }) }
  get latest() { return this.getProp("latest") }
  set latest(value) { this.setProp("latest", value) }

  static { this.declareProp("legacy", { type: "text" }) }
  get legacy() { return this.getProp("legacy") }
  set legacy(value) { this.setProp("legacy", value) }
}

export class Stat extends Thing {
  static { this.declareProp("baseStat", { type: "number" }) }
  get baseStat() { return this.getProp("baseStat") }
  set baseStat(value) { this.setProp("baseStat", value) }

  static { this.declareProp("effort", { type: "number" }) }
  get effort() { return this.getProp("effort") }
  set effort(value) { this.setProp("effort", value) }

  static { this.declareProp("stat", { type: "PokeApiName" }) }
  get stat() { return this.getProp("stat") }
  set stat(value) { this.setProp("stat", value) }

  get word() {
    const name = this.stat?.name
    if (name === "hp") return "Health"
    if (name === "attack") return "Attack"
    if (name === "defense") return "Defence"
    if (name === "special-attack") return "Special attack"
    if (name === "special-defense") return "Special defence"
    return "Speed"
  }
}

export class PastStat extends Thing {
  static { this.declareProp("generation", { type: "Generation", link: true }) }
  get generation() { return core.linked(this, "generation", Generation) }
  set generation(value) { this.setProp("generation", value) }

  static { this.declareProp("stats", { itemType: "Stat", init: () => new List({ instanceType: "Stat" }) }) }
  get stats() { return this.getProp("stats") }
  set stats(value) { this.setProp("stats", value) }
}

export class PokemonType extends Thing {
  static { this.declareProp("slot", { type: "number" }) }
  get slot() { return this.getProp("slot") }
  set slot(value) { this.setProp("slot", value) }

  static { this.declareProp("kind", { type: "Type", storedAs: "type", link: true }) }
  get kind() { return core.linked(this, "kind", Type) }
  set kind(value) { this.setProp("kind", value) }

  static drawsWaiting = true
  draw() {
    return h("ui-label", { class: "kind", color: () => this.kind?.colour, size: "huge", font: "title-caps" },
      () => core.whileWaiting(() => this.kind?.name)
    )
  }
}

export class PokedexNumber extends Thing {
  static { this.declareProp("entryNumber", { type: "number" }) }
  get entryNumber() { return this.getProp("entryNumber") }
  set entryNumber(value) { this.setProp("entryNumber", value) }

  static { this.declareProp("pokedex", { type: "PokeApiName" }) }
  get pokedex() { return this.getProp("pokedex") }
  set pokedex(value) { this.setProp("pokedex", value) }
}

export class Name extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("language", { type: "PokeApiName" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }
}

export class PalParkEncounter extends Thing {
  static { this.declareProp("baseScore", { type: "number" }) }
  get baseScore() { return this.getProp("baseScore") }
  set baseScore(value) { this.setProp("baseScore", value) }

  static { this.declareProp("rate", { type: "number" }) }
  get rate() { return this.getProp("rate") }
  set rate(value) { this.setProp("rate", value) }

  static { this.declareProp("area", { type: "PokeApiName" }) }
  get area() { return this.getProp("area") }
  set area(value) { this.setProp("area", value) }
}

export class FlavorTextEntry extends Thing {
  static { this.declareProp("flavorText", { type: "text" }) }
  get flavorText() { return this.getProp("flavorText") }
  set flavorText(value) { this.setProp("flavorText", value) }

  static { this.declareProp("language", { type: "PokeApiName" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }

  static { this.declareProp("version", { type: "PokeApiName" }) }
  get version() { return this.getProp("version") }
  set version(value) { this.setProp("version", value) }
}

export class Genus extends Thing {
  static { this.declareProp("genus", { type: "text" }) }
  get genus() { return this.getProp("genus") }
  set genus(value) { this.setProp("genus", value) }

  static { this.declareProp("language", { type: "PokeApiName" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }
}

export class Variety extends Thing {
  static { this.declareProp("default", { type: "choice", storedAs: "is_default" }) }
  get default() { return this.getProp("default") }
  set default(value) { this.setProp("default", value) }

  static { this.declareProp("pokemon", { type: "Pokemon", link: true }) }
  get pokemon() { return core.linked(this, "pokemon", Pokemon) }
  set pokemon(value) { this.setProp("pokemon", value) }
}

export class DamageRelation extends Thing {
  static { this.declareProp("noDamageTo", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get noDamageTo() { return core.linked(this, "noDamageTo", Type) }
  set noDamageTo(value) { this.setProp("noDamageTo", value) }

  static { this.declareProp("halfDamageTo", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get halfDamageTo() { return core.linked(this, "halfDamageTo", Type) }
  set halfDamageTo(value) { this.setProp("halfDamageTo", value) }

  static { this.declareProp("doubleDamageTo", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get doubleDamageTo() { return core.linked(this, "doubleDamageTo", Type) }
  set doubleDamageTo(value) { this.setProp("doubleDamageTo", value) }

  static { this.declareProp("noDamageFrom", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get noDamageFrom() { return core.linked(this, "noDamageFrom", Type) }
  set noDamageFrom(value) { this.setProp("noDamageFrom", value) }

  static { this.declareProp("halfDamageFrom", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get halfDamageFrom() { return core.linked(this, "halfDamageFrom", Type) }
  set halfDamageFrom(value) { this.setProp("halfDamageFrom", value) }

  static { this.declareProp("doubleDamageFrom", { itemType: "Type", init: () => new List({ instanceType: "Type" }) }) }
  get doubleDamageFrom() { return core.linked(this, "doubleDamageFrom", Type) }
  set doubleDamageFrom(value) { this.setProp("doubleDamageFrom", value) }
}

export class TypePokemon extends Thing {
  static { this.declareProp("slot", { type: "number" }) }
  get slot() { return this.getProp("slot") }
  set slot(value) { this.setProp("slot", value) }

  static { this.declareProp("pokemon", { type: "Pokemon", link: true }) }
  get pokemon() { return core.linked(this, "pokemon", Pokemon) }
  set pokemon(value) { this.setProp("pokemon", value) }

  static drawsWaiting = true
  draw() {
    return core.drawThing(this.pokemon)
  }
}

export class EffectEntry extends Thing {
  static { this.declareProp("effect", { type: "text" }) }
  get effect() { return this.getProp("effect") }
  set effect(value) { this.setProp("effect", value) }

  static { this.declareProp("shortEffect", { type: "text" }) }
  get shortEffect() { return this.getProp("shortEffect") }
  set shortEffect(value) { this.setProp("shortEffect", value) }

  static { this.declareProp("language", { type: "PokeApiName" }) }
  get language() { return this.getProp("language") }
  set language(value) { this.setProp("language", value) }
}

export class EffectChange extends Thing {
  static { this.declareProp("versionGroup", { type: "PokeApiName" }) }
  get versionGroup() { return this.getProp("versionGroup") }
  set versionGroup(value) { this.setProp("versionGroup", value) }

  static { this.declareProp("effectEntries", { itemType: "EffectEntry", init: () => new List({ instanceType: "EffectEntry" }) }) }
  get effectEntries() { return this.getProp("effectEntries") }
  set effectEntries(value) { this.setProp("effectEntries", value) }
}

export class AbilityPokemon extends Thing {
  static { this.declareProp("hidden", { type: "choice", storedAs: "is_hidden" }) }
  get hidden() { return this.getProp("hidden") }
  set hidden(value) { this.setProp("hidden", value) }

  static { this.declareProp("slot", { type: "number" }) }
  get slot() { return this.getProp("slot") }
  set slot(value) { this.setProp("slot", value) }

  static { this.declareProp("pokemon", { type: "Pokemon", link: true }) }
  get pokemon() { return core.linked(this, "pokemon", Pokemon) }
  set pokemon(value) { this.setProp("pokemon", value) }
}

export class ContestCombo extends Thing {
  static { this.declareProp("normal", { type: "Normal" }) }
  get normal() { return this.getProp("normal") }
  set normal(value) { this.setProp("normal", value) }

  static { this.declareProp("super", { type: "Super" }) }
  get super() { return this.getProp("super") }
  set super(value) { this.setProp("super", value) }
}

export class Normal extends Thing {
  static { this.declareProp("useBefore", { itemType: "Move", init: () => new List({ instanceType: "Move" }) }) }
  get useBefore() { return core.linked(this, "useBefore", Move) }
  set useBefore(value) { this.setProp("useBefore", value) }

  static { this.declareProp("useAfter", { itemType: "Move", init: () => new List({ instanceType: "Move" }) }) }
  get useAfter() { return core.linked(this, "useAfter", Move) }
  set useAfter(value) { this.setProp("useAfter", value) }
}

export class Super extends Thing {}

export class Meta extends Thing {
  static { this.declareProp("ailment", { type: "PokeApiName" }) }
  get ailment() { return this.getProp("ailment") }
  set ailment(value) { this.setProp("ailment", value) }

  static { this.declareProp("category", { type: "PokeApiName" }) }
  get category() { return this.getProp("category") }
  set category(value) { this.setProp("category", value) }

  static { this.declareProp("drain", { type: "number" }) }
  get drain() { return this.getProp("drain") }
  set drain(value) { this.setProp("drain", value) }

  static { this.declareProp("healing", { type: "number" }) }
  get healing() { return this.getProp("healing") }
  set healing(value) { this.setProp("healing", value) }

  static { this.declareProp("critRate", { type: "number" }) }
  get critRate() { return this.getProp("critRate") }
  set critRate(value) { this.setProp("critRate", value) }

  static { this.declareProp("ailmentChance", { type: "number" }) }
  get ailmentChance() { return this.getProp("ailmentChance") }
  set ailmentChance(value) { this.setProp("ailmentChance", value) }

  static { this.declareProp("flinchChance", { type: "number" }) }
  get flinchChance() { return this.getProp("flinchChance") }
  set flinchChance(value) { this.setProp("flinchChance", value) }

  static { this.declareProp("statChance", { type: "number" }) }
  get statChance() { return this.getProp("statChance") }
  set statChance(value) { this.setProp("statChance", value) }
}

export class PastValue extends Thing {
  static { this.declareProp("effectEntries", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get effectEntries() { return this.getProp("effectEntries") }
  set effectEntries(value) { this.setProp("effectEntries", value) }

  static { this.declareProp("kind", { type: "Type", storedAs: "type", link: true }) }
  get kind() { return core.linked(this, "kind", Type) }
  set kind(value) { this.setProp("kind", value) }

  static { this.declareProp("versionGroup", { type: "PokeApiName" }) }
  get versionGroup() { return this.getProp("versionGroup") }
  set versionGroup(value) { this.setProp("versionGroup", value) }
}

export class Chain extends Thing {
  static { this.declareProp("baby", { type: "choice", storedAs: "is_baby" }) }
  get baby() { return this.getProp("baby") }
  set baby(value) { this.setProp("baby", value) }

  static { this.declareProp("species", { type: "PokemonSpecies", link: true }) }
  get species() { return core.linked(this, "species", PokemonSpecies) }
  set species(value) { this.setProp("species", value) }

  static { this.declareProp("evolutionDetails", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get evolutionDetails() { return this.getProp("evolutionDetails") }
  set evolutionDetails(value) { this.setProp("evolutionDetails", value) }

  static { this.declareProp("evolvesTo", { itemType: "Chain", init: () => new List({ instanceType: "Chain" }) }) }
  get evolvesTo() { return this.getProp("evolvesTo") }
  set evolvesTo(value) { this.setProp("evolvesTo", value) }

  draw() {
    return h("ui-stack", { direction: "horizontal", align: "center", spacing: "sm", stackable: "34em" },
      () => core.whileWaiting(() => core.drawThing(this.species)),
      () => core.drawIf(() => !core.isEmpty(this.evolvesTo), () => [
        h("ui-icon", { name: "chevron right", size: "large", rotated: "when stacked" }),
        h("ui-stack", { direction: "horizontal", wrap: true, align: "center", justify: "center", spacing: "sm" },
          h("slot", { name: "branches" }, () => this.drawBranches())
        )
      ])
    )
  }

  drawBranches() {
    return core.drawEach(this.evolvesTo, (chain) => core.drawThing(chain))
  }
}

export class PokeApiName extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("address", { type: "text", storedAs: "url" }) }
  get address() { return this.getProp("address") }
  set address(value) { this.setProp("address", value) }
}

export class PokeApi extends Place {}
export const pokeApi = core.place(new PokeApi(), {
  name: "poke_api",
  kind: "web server",
  at: "https://pokeapi.co/api/v2",
  idColumn: "url",
  rowsIn: "results",
  nextPageIn: "next",
  pageSize: 2000,
  listsGive: ["name"],
  checkedEvery: 86400,
  keptOnDevice: true,
  namesLike: "base_experience",
  collections: {
    pokemon: { at: "/pokemon" },
    pokemonSpecies: { at: "/pokemon-species" },
    types: { at: "/type" },
    abilities: { at: "/ability" },
    moves: { at: "/move" },
    evolutionChains: { at: "/evolution-chain" },
    generations: { at: "/generation" }
  }
})

// -----------
export class Favourite extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("address", { type: "text" }) }
  get address() { return this.getProp("address") }
  set address(value) { this.setProp("address", value) }

  static { this.declareProp("pokemon", { readsFrom: ["poke_api", "my_favourites"] }) }
  get pokemon() { return core.waitedValue(this, "pokemon", async () => {
    return await core.savedThingWithId(Pokemon, this.address)
  }, () => [this.address]) }

  static drawsWaiting = true
  draw() {
    return core.drawThing(this.pokemon)
  }

  static savedIn = {
    place: "my_favourites",
    collection: "favourites",
    times: ["created", "modified"]
  }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class MyFavourite extends Place {}
export const myFavourites = core.place(new MyFavourite(), { name: "my_favourites", kind: "database on this device" })

// -----------

// -----------
export class Guess extends Thing {
  static { this.declareProp("hiding", { type: "Pokemon", link: true }) }
  get hiding() { return core.linked(this, "hiding", Pokemon) }
  set hiding(value) { this.setProp("hiding", value) }

  static { this.declareProp("choices", { itemType: "Pokemon", init: () => new List({ instanceType: "Pokemon" }) }) }
  get choices() { return core.linked(this, "choices", Pokemon) }
  set choices(value) { this.setProp("choices", value) }

  static { this.declareProp("guessed", { type: "Pokemon", link: true }) }
  get guessed() { return core.linked(this, "guessed", Pokemon) }
  set guessed(value) { this.setProp("guessed", value) }

  get foundOut() {
    return this.guessed !== undefined
  }

  get right() {
    return this.guessed === this.hiding
  }

  get look() {
    if (this.foundOut) return "shadow found"
    return "shadow"
  }

  async playAgain() {
    const firstOnes = core.rangeStartingAt(await core.savedThings(Pokemon), 0, 151)
    this.choices = core.randomItemsOf(firstOnes, 4)
    this.hiding = core.randomItemOf(await core.answerOf(this, "choices"))
    this.guessed = undefined
  }

  static drawsWaiting = true
  draw() {
    if (this.hiding) {
      return [
        h("ui-segment", { class: () => this.look, align: "center" },
          () => core.drawWaiting(() => h("ui-image", { class: "art", align: "center", src: () => this.hiding?.picture, alt: "A Pokémon, hiding" }), "ui-image")
        ),
        h("slot", { name: "answer" }, () => this.drawAnswer())
      ]
    } else {
      return h("ui-segment", { class: "shadow", align: "center" },
        h("ui-header", { size: "huge" }, "Who's that Pokémon?"),
        h("ui-button", {
          color: "yellow",
          size: "massive",
          appearance: "pill raised",
          onClick: core.pressed(this, async () => await this.playAgain()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Let's play!")
      )
    }
  }

  drawAnswer() { return core.drawWaiting(() => {
    if (this.foundOut) {
      return [
        this.right ? h("ui-header", { class: "said", size: "huge", align: "center", font: "title-caps", part: "answer" },
          "Yes!  It's ",
          () => core.whileWaiting(() => this.hiding?.name),
          "!"
        ) : h("ui-header", { class: "said", size: "huge", align: "center", font: "title-caps", part: "answer" },
          "It's ",
          () => core.whileWaiting(() => this.hiding?.name),
          "!"
        ),
        h("ui-stack", { direction: "horizontal", justify: "center", part: "answer" },
          h("ui-button", {
            color: "yellow",
            size: "massive",
            appearance: "pill raised",
            onClick: core.pressed(this, async () => await this.playAgain()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Play again")
        )
      ]
    } else {
      return h("ui-stack", { direction: "horizontal", wrap: true, justify: "center", part: "answer" },
        h("slot", { name: "choice_buttons" }, () => this.drawChoiceButtons())
      )
    }
  }) }

  drawChoiceButtons() {
    return core.drawRead(() => this.choices, (choice) => h("ui-button", {
      color: "yellow",
      size: "huge",
      appearance: "pill raised",
      font: "title-caps",
      onClick: core.pressed(this, async () => (this.guessed = choice)),
      style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
      part: "choice_buttons"
    }, () => choice.name))
  }
}
core.describeAction(Guess, "playAgain", { title: "Play Again", undoneAs: "Play Again" })
// -----------
core.useDefaults("/PokeSpell.spell", {
  "ui-button": { appearance: "pill" }
})

export class Pokedex extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("tab", { type: "text" }) }
  get tab() { return this.getProp("tab") }
  set tab(value) { this.setProp("tab", value) }

  static { this.declareProp("search", { type: "text" }) }
  get search() { return this.getProp("search") }
  set search(value) { this.setProp("search", value) }

  static { this.declareProp("showing", { type: "Pokemon", link: true }) }
  get showing() { return core.linked(this, "showing", Pokemon) }
  set showing(value) { this.setProp("showing", value) }

  static { this.declareProp("trail", { itemType: "Pokemon", init: () => new List({ instanceType: "Pokemon" }) }) }
  get trail() { return core.linked(this, "trail", Pokemon) }
  set trail(value) { this.setProp("trail", value) }

  static { this.declareProp("pickedKind", { type: "Type", link: true }) }
  get pickedKind() { return core.linked(this, "pickedKind", Type) }
  set pickedKind(value) { this.setProp("pickedKind", value) }

  static { this.declareProp("game", { init: () => new Guess({ id: "game" }), early: true }) }
  get game() { return this.getProp("game") }
  set game(value) { this.setProp("game", value) }

  create() {
    this.tab = "everyone"
    this.search = ""
  }

  async goToWhere(where) {
    this.tab = where
    this.search = ""
    this.showing = undefined
    core.clear(await core.answerOf(this, "trail"))
    core.scrollToTop()
  }

  async goBack() {
    if (core.isEmpty(await core.answerOf(this, "trail"))) {
      this.showing = undefined
      return
    }
    this.showing = core.getItemAt(await core.answerOf(this, "trail"), -1)
    core.removeItemAt(await core.answerOf(this, "trail"), -1)
    core.scrollToTop()
  }

  async surpriseMe() {
    await core.randomItemOf(await core.savedThings(Pokemon))?.open()
  }

  static { this.declareProp("kindsToPick", { readsFrom: ["poke_api"] }) }
  get kindsToPick() { return core.waitedValue(this, "kindsToPick", async () => {
    return core.filter(await core.savedThings(Type, {}, "looks through"), (type) => type.isReal)
  }) }

  static { this.declareProp("found", { readsFrom: ["poke_api"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    const lookingFor = this.search.toLocaleLowerCase()
    return core.filter(await core.savedThings(Pokemon, {}, "looks through"), (pokemon) => core.includes(pokemon.name, lookingFor))
  }, () => [this.search]) }

  draw() {
    return [
      h("ui-stack", { direction: "horizontal", wrap: true, align: "center", justify: "between" },
        h("ui-button", {
          appearance: "tertiary",
          color: "red",
          padding: "none",
          size: "poster",
          font: "heavy",
          shadow: "yellow",
          onClick: core.pressed(this, async () => await this.goToWhere("everyone")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "PokéSpell"),
        h("ui-form", { "prop:value": this, fluid: true, "min-width": "16em", "max-width": "26em" },
          h("ui-field", { label: "Find a Pokémon" },
            h("ui-input", { name: "search", icon: "search", size: "large", placeholder: "Pikachu" })
          )
        ),
        h("ui-button", {
          color: "yellow",
          size: "huge",
          appearance: "pill raised",
          icon: "wand magic sparkles",
          onClick: core.pressed(this, async () => await this.surpriseMe()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Surprise me!")
      ),
      h("ui-toolbar", { appearance: "secondary pointing", size: "huge", "aria-label": "Look through" },
        h("ui-item", {
          selected: () => this.tab === "everyone",
          onClick: core.pressed(this, async () => await this.goToWhere("everyone")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Everyone"),
        h("ui-item", {
          selected: () => this.tab === "kinds",
          onClick: core.pressed(this, async () => await this.goToWhere("kinds")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Kinds"),
        h("ui-item", {
          selected: () => this.tab === "favourites",
          onClick: core.pressed(this, async () => await this.goToWhere("favourites")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Favourites"),
        h("ui-item", {
          selected: () => this.tab === "guess",
          onClick: core.pressed(this, async () => await this.goToWhere("guess")),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Who's that Pokémon?")
      ),
      h("slot", { name: "shelf" }, () => this.drawShelf()),
      h("ui-text", { paragraph: true, size: "small" },
        "Every Pokémon, its pictures and its sounds, from ",
        h("ui-link", { link: "https://pokeapi.co/" }, "PokéAPI"),
        ". Pokémon belongs to Nintendo, Game Freak and Creatures."
      )
    ]
  }

  drawShelf() { return core.drawWaiting(() => {
    if (this.showing && this.search === "") {
      return [
        h("ui-button", {
          appearance: "basic",
          icon: "arrow left",
          size: "large",
          onClick: core.pressed(this, async () => await this.goBack()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none",
          part: "shelf"
        }, "Back"),
        this.showing?.drawPage()
      ]
    } else if (this.search !== "") {
      return core.drawRead(() => this.found, (pokemon) => core.drawThing(pokemon), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "shelf" }, "Looking…"),
        none: () => h("ui-text", { part: "shelf" }, "Nobody's called that.  Try another name!"),
        paging: () => "pages",
        items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" })
      })
    } else if (this.tab === "kinds") return h("slot", { name: "kinds" }, () => this.drawKinds())
    else if (this.tab === "favourites") return core.drawRead(async () => await core.savedThings(Favourite, {}, "as drawn"), (favourite) => core.drawThing(favourite), { none: () => h("ui-text", { part: "shelf" }, "No favourites yet.  Press a Pokémon's heart to keep it here!"), items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" }) })
    else if (this.tab === "guess") return core.drawThing(this.game)
    else {
      return core.drawRead(async () => await core.savedThings(Pokemon, {}, "as drawn"), (pokemon) => core.drawThing(pokemon), {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "shelf" }, "Waking up the Pokémon…"),
        paging: () => "pages",
        items: () => h("ui-cards", { columns: "4", doubling: true, part: "shelf" })
      })
    }
  }) }

  drawKinds() { return core.drawWaiting(() => {
    return [
      h("ui-stack", { direction: "horizontal", wrap: true, justify: "center", part: "kinds" },
        h("slot", { name: "kind_buttons" }, () => this.drawKindButtons())
      ),
      this.pickedKind ? [
        h("ui-header", { class: "kind-heading", size: "large", font: "title-caps", part: "kinds" },
          () => core.whileWaiting(() => this.pickedKind?.name),
          " Pokémon"
        ),
        core.drawRead(() => this.pickedKind?.pokemon, (item) => core.drawThing(item), {
          waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "kinds" }, "Finding them…"),
          paging: () => "pages",
          items: () => h("ui-cards", { columns: "4", doubling: true, part: "kinds" })
        })
      ] : h("ui-header", { size: "small", align: "center", part: "kinds" },
        "Pick a kind, and see who's that kind."
      )
    ]
  }) }

  drawKindButtons() {
    return core.drawRead(() => this.kindsToPick, (type) => core.drawThing(type))
  }
}
export const pokedex = new Pokedex()
core.describeAction(Pokedex, "goToWhere", { title: "Go to Where", undoneAs: "Go to Where" })
core.describeAction(Pokedex, "goBack", { title: "Go Back", undoneAs: "Go Back" })
core.describeAction(Pokedex, "surpriseMe", { title: "Surprise Me", undoneAs: "Surprise Me" })

if (!core.isCarryingOver) pokedex.start()
// -----------
core.installStyles(undefined, `/* File styles.css:  PokéSpell's theme, and Who's that Pokémon's shadow.¬   - The theme:  a bright sky (a night sky in dark mode), round friendly letters, white cards with round corners.¬     Spell UI's own tokens, so every card, header and button follows.¬   - Every other look is an attribute, in the .spell files:¬     - the logo and a Pokémon's name:  \`size="poster"\`, \`font="heavy"\`, the logo's \`shadow="yellow"\`¬     - each picture's sunny circle:  \`background="yellow"\`¬     - how wide the search, a strength bar and a card in a family are:  \`width\`, \`min-width\`, \`max-width\`¬     - a family's row that runs down a phone, its arrows turning:  \`stackable="34em"\`, \`rotated="when stacked"\`¬     - each kind's colour, a button's own \`color\`;  every button a pill, the app's \`<ui-defaults>\` */¬¬poke-spell-app {¬  --sky: linear-gradient(180deg, #8fd8ff 0%, #d9f4ff 45%, #fff6c9 100%);¬  --ink: #1d2b4f;¬  --ui-text-color: var(--ink);¬  --ui-header-color: var(--ink);¬  --ui-font-family: var(--ui-font-family-rounded);¬  --ui-font-family-heading: var(--ui-font-family-rounded);¬  /* A card stays white in the dark, so its words stay dark */¬  --ui-card-background: #fff;¬  --ui-card-header-color: #1d2b4f;¬  --ui-card-border-color: transparent;¬  --ui-card-margin-block: 0;¬  --ui-card-radius: 1.5em;¬  --ui-card-link-raise: 0.4em;¬  --ui-segment-radius: 1.5em;¬¬  color-scheme: light;¬  container-type: inline-size;¬  display: block;¬  min-height: 100vh;¬  padding: 1em clamp(1em, 4vw, 3em) 2em;¬  background: var(--sky);¬  color: var(--ink);¬}¬¬@media (prefers-color-scheme: dark) {¬  poke-spell-app {¬    --sky: radial-gradient(ellipse at 50% 0%, #2c3f8f 0%, #141c45 55%, #0b1030 100%);¬    --ink: #f2f5ff;¬¬    color-scheme: dark;¬  }¬}¬¬/****************¬ * Who's that Pokémon?  Black as a shadow, until you've guessed.¬ ****************/¬¬.shadow::part(segment) {¬  background: radial-gradient(circle, #fff 0%, #ffe066 45%, #ff9f1c 100%);¬}¬¬/* No hairline round it (the theme's, for photos with white edges):  a black shape on the sunburst */¬.shadow .art::part(image) {¬  width: min(18em, 70vw);¬  outline: none;¬  filter: brightness(0);¬  transition: filter 0.6s ease;¬}¬¬.shadow.found .art::part(image) {¬  filter: none;¬}¬`)
