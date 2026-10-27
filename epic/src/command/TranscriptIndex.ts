import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

import type { TranscriptFacts } from "./command.types"

/****************
 * ### `TranscriptIndex`
 * What `Sessions.named()` needs of each saved session's transcript, kept in a file between runs.
 * - Why:  `named()` finds the sessions titled `<name>` or worked in worktree `<name>`, and a transcript is a big
 *   JSONL file (the biggest 176MB;  1.6GB over 197 of them in all).
 *   - reading every one for every `epic worktree status` took ~1.7s even with the files in memory, ~30s before
 *     epic `epic-engine` I67 (which fixed the real paths resolved per line), and it grows with every session
 *   - a transcript only grows, so what it names is worked out ONCE per version of it
 * - Use:  `factsOf(path)` for each transcript, then `save()` once.
 *   - a transcript whose size and modified time are what the index saw:  its facts from the index, the transcript unread
 *   - any other:  read and scanned (`scan()`), and remembered
 * - The file:  JSON, written by `save()` (`<claude home>/spell-epic/transcript-index.json`);
 *   Claude Code's folder is where the transcripts are, so a test's fake `home` has its own.
 *   - it holds raw folder names, never their worktree:  which worktree a folder is in is asked again every run
 * - Best effort, NEVER throws:
 *   - a missing, unreadable or old-version file is an empty index
 *   - a failed `save()` (a read-only folder ...) is skipped, and the next run scans again
 * - Its position:  node's own modules only, below `Sessions`, which owns the file's place.
 ****************/
export class TranscriptIndex {
  /** the index file's path */
  readonly file: string

  /** what the file held at construction, plus every transcript scanned since */
  private readonly entries: Map<string, IndexEntry>

  /** whether `entries` differs from the file:  `save()` writes only then */
  private changed = false

  /** - `file`:  where the index is kept */
  constructor({ file }: TranscriptIndexProps) {
    this.file = file
    this.entries = TranscriptIndex.load(file)
  }

  /**
   * Transcript `path`'s facts:  the index's while its size and modified time are unchanged, else a fresh scan.
   * - throws if `path` can't be read, as `readFileSync()` does
   * - SIDE EFFECT:  remembers the scan, for `save()`
   */
  factsOf(path: string): TranscriptFacts {
    // stat BEFORE reading:  a line written meanwhile makes the next run see a different size, and scan again
    const { size, mtimeMs } = statSync(path)
    const known = this.entries.get(path)
    if (known && known.size === size && known.mtimeMs === mtimeMs) return known
    const entry: IndexEntry = { size, mtimeMs, ...TranscriptIndex.scan(readFileSync(path, "utf8")) }
    this.entries.set(path, entry)
    this.changed = true
    return entry
  }

  /**
   * Write the index back when it changed, without the transcripts that are gone.
   * - atomic:  a temp file renamed over it, so a run reading it meanwhile never sees half a file
   * - two runs saving at once leave one's version, and the other's scans are repeated next time
   * - NEVER throws
   */
  save(): void {
    for (const path of this.entries.keys())
      if (!existsSync(path)) {
        this.entries.delete(path)
        this.changed = true
      }
    if (!this.changed) return
    const temp = `${this.file}.${process.pid}.tmp`
    try {
      mkdirSync(dirname(this.file), { recursive: true })
      const data: IndexData = { version: INDEX_VERSION, transcripts: Object.fromEntries(this.entries) }
      writeFileSync(temp, JSON.stringify(data))
      renameSync(temp, this.file)
      this.changed = false
    } catch {
      // best effort:  the index is only a shortcut
    }
  }

  ////////////////
  // ## Statics:  the file, the scan
  ////////////////

  /**
   * The facts of transcript text `text`:  every `"customTitle"` and `"cwd"` string in it, wherever it is, unparsed.
   * - cheap on purpose:  a regex over the text, no JSON parsing of lines, so a 176MB transcript takes ~0.2s
   * - a superset of what `Sessions.named()` reads from its lines (`custom-title` entries, an entry's own `cwd`):
   *   never misses one, may list a title or folder a tool result merely quotes
   * - static:  pure
   */
  static scan(text: string): TranscriptFacts {
    const raws = { customTitle: new Set<string>(), cwd: new Set<string>() }
    for (const [, key, raw] of text.matchAll(FACT_PATTERN)) raws[key as keyof typeof raws].add(raw!)
    return {
      titles: [...new Set([...raws.customTitle].map(decoded))],
      cwds: [...new Set([...raws.cwd].map(decoded))]
    }
  }

  /** The entries `file` holds, by transcript path;  none for a missing, unreadable or old-version file. */
  private static load(file: string): Map<string, IndexEntry> {
    try {
      const data = JSON.parse(readFileSync(file, "utf8")) as Partial<IndexData>
      if (data.version === INDEX_VERSION && data.transcripts) return new Map(Object.entries(data.transcripts))
    } catch {
      // no index yet, or a file that won't read:  scan everything
    }
    return new Map()
  }
}

/** What `new TranscriptIndex()` takes. */
export type TranscriptIndexProps = {
  /** the index file's path */
  file: string
}

/** What the index file holds. */
type IndexData = {
  /** `INDEX_VERSION` when written */
  version: number
  /** by the transcript's path */
  transcripts: Record<string, IndexEntry>
}

/** One transcript's facts, and the size and modified time (ms) of the file they were found in. */
type IndexEntry = TranscriptFacts & {
  size: number
  mtimeMs: number
}

/** Changes whenever `scan()` finds something else, so an old index is scanned afresh. */
const INDEX_VERSION = 1

/** A JSON string value under `customTitle` or `cwd`:  its key, and the text between its quotes (escapes still in). */
const FACT_PATTERN = /"(customTitle|cwd)"\s*:\s*"((?:[^"\\]|\\.)*)"/g

/** JSON string body `raw` (between its quotes), its escapes undone;  as written when it doesn't parse. */
function decoded(raw: string): string {
  if (!raw.includes("\\")) return raw
  try {
    return JSON.parse(`"${raw}"`) as string
  } catch {
    return raw
  }
}
