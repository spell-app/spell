import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

/****************
 * ### `GitHubVisibility`
 * Whether GitHub says a repo is public, asked before the epic repo is pushed (`SharedSync`;  epic `epic-engine` T153):
 * epic pages may name what the code repos mustn't, so the epic repo must stay private.
 * - Asks GitHub's API without signing in:  a public repo answers with `"private": false`;  a private one isn't found.
 * - Kept in the epic repo's git folder for 10 minutes (`spell-visibility.json`):  a sync runs every turn, and GitHub
 *   answers 60 questions an hour without signing in.
 * - GitHub didn't answer (offline, too many questions):  the last answer kept, however old;  none:  `undefined`.
 * - Not a GitHub address:  `undefined`, never asked.
 * - all `static`
 ****************/
export class GitHubVisibility {
  /** Asks GitHub's API about `owner/name`;  the tests' stand-in replaces it. */
  static ask = async (repo: string): Promise<boolean | undefined> => {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: { accept: "application/vnd.github+json", "user-agent": "spell-epic" },
        signal: AbortSignal.timeout(10_000)
      })
      if (response.status === 404) return false
      if (!response.ok) return undefined
      return (await response.json()).private === false
    } catch {
      return undefined
    }
  }

  /**
   * Does GitHub say the repo at `url` (a remote's address) is public?  `gitDir` keeps the answer.
   * - `undefined`:  not on GitHub, or GitHub didn't answer and nothing was kept
   * - NEVER throws
   */
  static async isPublic(url: string, gitDir: string, now = Date.now()): Promise<boolean | undefined> {
    const repo = GitHubVisibility.repoOf(url)
    if (!repo) return undefined
    const file = join(gitDir, FILE_NAME)
    const kept = readKept(file)
    if (kept?.repo === repo && now - kept.at < KEEP_FOR) return kept.isPublic
    const answer = await GitHubVisibility.ask(repo)
    if (answer === undefined) return kept?.repo === repo ? kept.isPublic : undefined
    try {
      writeFileSync(file, JSON.stringify({ repo, at: now, isPublic: answer }))
    } catch {
      // asked again next time
    }
    return answer
  }

  /** `owner/name` of a GitHub address (`https://github.com/a/b.git`, `git@github.com:a/b`);  `undefined` for another host. */
  static repoOf(url: string): string | undefined {
    const found = /github\.com[:/]([^/]+\/[^/]+?)(\.git)?\/?$/i.exec(url.trim())
    return found?.[1]
  }
}

/** The answer kept, by the epic repo. */
type KeptAnswer = { repo: string; at: number; isPublic: boolean }

/** The file the answer is kept in, in the epic repo's git folder. */
const FILE_NAME = "spell-visibility.json"

/** How long an answer is kept before GitHub is asked again:  10 minutes. */
const KEEP_FOR = 10 * 60 * 1000

/** The answer kept in `file`;  `undefined` when there's none, or it won't read. */
function readKept(file: string): KeptAnswer | undefined {
  try {
    return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as KeptAnswer) : undefined
  } catch {
    return undefined
  }
}
