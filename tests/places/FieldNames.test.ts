/**
 * A server's field names matched to ours by their words, and numbers read from text (epic `data` P23).
 */
import { describe, expect, test } from "vite-plus/test"

import { decimalMarkIn, FieldNames, nameStyleLike, numberInText, ourNameFor, theirNameFor } from "spell/places"

describe("a field's name, by its words", () => {
  test.each([
    ["hair_color", "hairColor"],
    ["hairColor", "hairColor"],
    ["HairColor", "hairColor"],
    ["Hair Color", "hairColor"],
    ["hair-color", "hairColor"],
    ["MGLT", "mglt"],
    ["url", "url"],
    ["episode_id", "episodeId"],
    ["cost_in_credits", "costInCredits"]
  ])("%s is our %s", (theirs, ours) => {
    expect(ourNameFor(theirs)).toBe(ours)
  })

  test("a style, from an example;  one word says nothing", () => {
    expect(["hair_color", "hairColor", "HairColor", "hair-color", "Hair Color", "hair"].map(nameStyleLike)).toEqual([
      "snake",
      "camel",
      "pascal",
      "kebab",
      "words",
      undefined
    ])
    expect(theirNameFor("averageHeight", "snake")).toBe("average_height")
    expect(theirNameFor("averageHeight", "words")).toBe("Average Height")
  })

  test("what's read is spelled back the same way;  what's named wins;  the rest, in the server's style", () => {
    const names = new FieldNames({ averageHeight: "avg_ht" }, "snake")
    expect(names.fromServer({ hair_color: "blond", avg_ht: "172", MGLT: "60", url: "x" })).toEqual({
      hairColor: "blond",
      averageHeight: "172",
      mglt: "60",
      url: "x"
    })
    expect(names.toServer({ hairColor: "red", averageHeight: 180, mglt: 70, eyeColor: "blue" })).toEqual({
      hair_color: "red",
      avg_ht: 180,
      MGLT: 70,
      eye_color: "blue"
    })
  })

  test("a sheet's columns:  known before a row is read, a named one wins, and the id column keeps its name", () => {
    const names = FieldNames.ofColumns(["Recipe ID", "Dish Name", "Hair Color"], { title: "Dish Name" }, ["Recipe ID"])
    expect(names.toServer({ title: "Broth", hairColor: "red", "Recipe ID": "r-1", nobody: 1 })).toEqual({
      "Dish Name": "Broth",
      "Hair Color": "red",
      "Recipe ID": "r-1",
      nobody: 1
    })
    expect(names.fromServer({ "Recipe ID": "r-1", "Dish Name": "Soup" })).toEqual({ "Recipe ID": "r-1", title: "Soup" })
  })

  test("what a line names wins over a column that reads the same, whichever comes first", () => {
    const names = new FieldNames({ title: "Dish Name" })
    expect(names.fromServer({ Title: "Not this", "Dish Name": "Soup" })).toEqual({ title: "Soup" })
  })

  describe('a name given in plain words:  `its "created at"` (J237)', () => {
    test.each(["created_at", "createdAt", "CreatedAt", "Created At", "created-at"])("finds %s", (their) => {
      const names = new FieldNames({ created: "created at" })
      expect(names.fromServer({ [their]: "then" })).toEqual({ created: "then", createdAt: "then" })
      expect(names.toServer({ created: "now" })).toEqual({ [their]: "now" })
    })

    test("the words exactly come first", () => {
      const names = new FieldNames({ created: "created at" })
      expect(names.fromServer({ created_at: "spelled", "created at": "exact" }).created).toBe("exact")
    })

    test("the first spelling is it:  a second spelling of those words is a field of its own", () => {
      const names = new FieldNames({ created: "created at" })
      expect(names.fromServer({ created_at: "first", createdAt: "second" })).toEqual({
        created: "first",
        createdAt: "second"
      })
    })

    test("before it's read one:  the server's style, else ours", () => {
      expect(new FieldNames({ created: "created at" }, "snake").serverName("created")).toBe("created_at")
      expect(new FieldNames({ created: "created at" }).serverName("created")).toBe("createdAt")
    })

    test("any other name is exact", () => {
      expect(new FieldNames({ created: "created_at" }).fromServer({ createdAt: "other" })).toEqual({ createdAt: "other" })
      const sheet = new FieldNames({ title: "Dish Name" })
      expect(sheet.fromServer({ dish_name: "other" })).toEqual({ dishName: "other" })
    })
  })

  test("with no style, a field it hasn't read keeps our name", () => {
    expect(new FieldNames().serverName("eyeColor")).toBe("eyeColor")
  })
})

describe("a number written as text", () => {
  test.each([
    ["172", 172],
    ["-1.5", -1.5],
    ["1,200", 1200],
    ["1,200,000", 1200000],
    ["1,5", 1.5],
    ["1 200", 1200],
    ["1.200,5", 1200.5],
    ["1,200.5", 1200.5],
    ["1.200.000", 1200000],
    ["3,75", 3.75]
  ])("%s is %d", (text, number) => {
    expect(numberInText(text)).toBe(number)
  })

  test.each(["1,20,0", "5'10\"", "1,200 km", "unknown", ""])("%s isn't one", (text) => {
    expect(numberInText(text)).toBeUndefined()
  })

  test("a mark the source is known to write wins;  one the text can't settle reads the language's way", () => {
    expect(numberInText("1,200", ",")).toBe(1.2)
    expect(numberInText("1.200", ",")).toBe(1200)
    expect(numberInText("1,200", undefined, ",")).toBe(1.2)
    expect(numberInText("1,5", undefined, ".")).toBe(1.5)
  })

  test("which mark a column uses, as its values show it", () => {
    expect(decimalMarkIn(["1,200", "3,75"])).toBe(",")
    expect(decimalMarkIn(["1.5", "1,200"])).toBe(".")
    expect(decimalMarkIn(["1,200", "172"])).toBeUndefined()
    expect(decimalMarkIn(["1,5", "1.5"])).toBe(".")
  })
})
