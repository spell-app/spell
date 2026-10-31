import { describe, expect, test } from "vite-plus/test"

import { parseCsv } from "spell/util/places/csv"

describe("parseCsv()", () => {
  test("plain rows, with or without a last line end", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"]
    ])
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"]
    ])
  })

  test("nothing at all is no rows", () => {
    expect(parseCsv("")).toEqual([])
    expect(parseCsv("\n\n")).toEqual([])
    expect(parseCsv("﻿")).toEqual([])
  })

  test("a comma, a line end and a doubled quote inside quotes are all just text", () => {
    expect(parseCsv('"a,b","two\nlines","say ""hi"""\n')).toEqual([["a,b", "two\nlines", 'say "hi"']])
  })

  test("CRLF, LF and a lone CR all end a line;  CRLF inside quotes stays", () => {
    expect(parseCsv('a\r\nb\nc\rd\r\n"e\r\nf"')).toEqual([["a"], ["b"], ["c"], ["d"], ["e\r\nf"]])
  })

  test("empty fields are kept, at the start, middle and end of a row", () => {
    expect(parseCsv(",b,\n,,")).toEqual([
      ["", "b", ""],
      ["", "", ""]
    ])
    expect(parseCsv('"",x')).toEqual([["", "x"]])
    expect(parseCsv("a,")).toEqual([["a", ""]])
  })

  test("a blank line is no row, wherever it is", () => {
    expect(parseCsv("a\n\nb\n\n")).toEqual([["a"], ["b"]])
  })

  test("the byte-order mark some programs write isn't part of the first column's name", () => {
    expect(parseCsv("﻿id,name\n")).toEqual([["id", "name"]])
    expect(parseCsv('﻿"id",name\n')).toEqual([["id", "name"]])
  })

  test("spaces around a field are the field's", () => {
    expect(parseCsv(" a , b ")).toEqual([[" a ", " b "]])
  })

  test("a quote inside an unquoted field is just a quote;  text after a closing quote stays, as spreadsheets read it", () => {
    expect(parseCsv('5" pan,x')).toEqual([['5" pan', "x"]])
    expect(parseCsv('"a"b,c')).toEqual([["ab", "c"]])
  })

  test("a quoted field that never closes THROWS, naming its row:  a file half saved isn't data", () => {
    expect(() => parseCsv('a\nb,"oops\nc')).toThrow(/row 2 never closes/)
    expect(() => parseCsv('"')).toThrow(SyntaxError)
  })

  test("a doubled quote at the very end isn't a close:  it still never closes", () => {
    expect(() => parseCsv('"a""')).toThrow(SyntaxError)
  })
})
