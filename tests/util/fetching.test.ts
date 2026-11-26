import { describe, expect, test } from "vite-plus/test"

import { queryText } from "spell/util/fetching"

describe("queryText()", () => {
  test("writes each key and value, in the data's order", () => {
    expect(queryText({ b: "2", a: "1" })).toBe("b=2&a=1")
  })

  test("sorts the keys when asked, as `$fetch()` does", () => {
    expect(queryText({ b: "2", c: "3", a: "1" }, { sort: true })).toBe("a=1&b=2&c=3")
  })

  test("writes numbers and booleans as their text, an empty string as `name=`", () => {
    expect(queryText({ page: 2, fresh: true, off: false, empty: "" })).toBe("page=2&fresh=true&off=false&empty=")
  })

  test("repeats an array's key once per item, leaving out `undefined` and `null`", () => {
    expect(queryText({ tag: ["a", undefined, "b", null, 3] })).toBe("tag=a&tag=b&tag=3")
  })

  test("leaves out `undefined` and `null` values", () => {
    expect(queryText({ a: undefined, b: null, c: "x" })).toBe("c=x")
  })

  test("encodes keys and values as a URL's part:  a space as %20, `!'()*` too", () => {
    expect(queryText({ page: "/a b.html" })).toBe("page=%2Fa%20b.html")
    expect(queryText({ "a&b": "x=y?z#w+v" })).toBe("a%26b=x%3Dy%3Fz%23w%2Bv")
    expect(queryText({ q: "it's (done)!*" })).toBe("q=it%27s%20%28done%29%21%2A")
  })

  test("encodes letters outside ASCII as UTF-8", () => {
    expect(queryText({ q: "café ☕" })).toBe("q=caf%C3%A9%20%E2%98%95")
  })

  test("writes nothing for empty data", () => {
    expect(queryText({})).toBe("")
  })
})
