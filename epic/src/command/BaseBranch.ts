import { Git } from "spell/server/Git"

/****************
 * ### `BaseBranch`
 * Bringing the LOCAL base branch up to date with `origin`, for a repo whose base branch takes only pull requests
 * (`baseBranchProtected`).
 * - Why:  new worktrees are cut from local `main`, and `epic worktree merge-main` merges local `main`.
 *   Nothing lands on it here any more, so without this it goes stale the moment GitHub merges a pull request.
 * - Who:  the worktree hook, before it makes a new worktree;  `MainMerge`, before it merges.
 * - Safe or not at all:  fast-forward only, and only over a clean checkout.
 *   Offline, diverged, ahead or dirty, it changes nothing, says so in one line, and the caller carries on.
 * - Its position:  node's own modules and the kit's `Git` only, so plain `node` loads it (the worktree hook);
 *   NEVER an `enum` or a parameter property.
 * - All `static`:  no state.
 ****************/
export class BaseBranch {
  /**
   * Fast-forward branch `base` of main checkout `main` from `origin`, when that can be done safely.
   * - `base` checked out there:  `git merge --ff-only`, only with nothing uncommitted there
   * - `base` not checked out there:  `git fetch origin <base>:<base>`, which git itself does only as a fast-forward
   * - NEVER throws
   * - SIDE EFFECT:  a fetch, and the local branch and its checkout moved
   */
  static catchUp(main: string, base: string): BaseCatchUp {
    if (!Git.out(["remote", "get-url", "origin"], main)) return { action: "no remote", line: "" }
    const fetched = Git.run(["fetch", "-q", "origin", base], main, { timeout: NETWORK_TIMEOUT })
    if (!fetched.ok) {
      const why = firstLine(fetched.err) || "the fetch failed"
      return { action: "offline", line: `couldn't reach origin (${why}):  going on from local ${base}, maybe behind` }
    }
    const theirs = `refs/remotes/origin/${base}`
    const ours = `refs/heads/${base}`
    const [local, remote] = [Git.out(["rev-parse", ours], main), Git.out(["rev-parse", theirs], main)]
    if (!local || !remote) return { action: "no remote", line: "" }
    if (local === remote) return { action: "current", line: "" }
    const behind = Git.out(["rev-list", "--count", `${ours}..${theirs}`], main) ?? "0"
    const ahead = Git.out(["rev-list", "--count", `${theirs}..${ours}`], main) ?? "0"
    if (ahead !== "0")
      return behind === "0"
        ? {
            action: "ahead",
            line: `local ${base} is ${ahead} commit(s) ahead of origin's, which only a pull or merge request can bring there`
          }
        : {
            action: "diverged",
            line: `local ${base} and origin's have diverged (${ahead} commit(s) only here):  going on from local ${base}`
          }
    const onBase = Git.out(["branch", "--show-current"], main) === base
    if (onBase && Git.out(["status", "--porcelain", "--untracked-files=no"], main))
      return { action: "dirty", line: `local ${base} has uncommitted changes:  not fast-forwarded, going on from it` }
    const moved = onBase
      ? Git.run(["merge", "-q", "--ff-only", theirs], main, { timeout: NETWORK_TIMEOUT })
      : Git.run(["fetch", "-q", "origin", `${base}:${base}`], main, { timeout: NETWORK_TIMEOUT })
    if (!moved.ok)
      return {
        action: "failed",
        line: `couldn't fast-forward local ${base} (${firstLine(moved.err) || "git said no"}):  going on from it`
      }
    return { action: "fast-forwarded", line: `local ${base} fast-forwarded from origin (${behind} commit(s))` }
  }
}

/**
 * What `BaseBranch.catchUp()` did.
 * - `action`:
 *   - `fast-forwarded`:  it moved;  `current`:  nothing to do
 *   - `no remote`:  no `origin`, or it has no such branch
 *   - `offline`, `ahead`, `diverged`, `dirty`, `failed`:  left as it was
 * - `line`:  what to tell the person;  `""`:  nothing worth saying
 */
export type BaseCatchUp = {
  action: "fast-forwarded" | "current" | "no remote" | "offline" | "ahead" | "diverged" | "dirty" | "failed"
  line: string
}

/** How long a fetch of the base branch may take, ms:  a network call, longer than git's local default. */
const NETWORK_TIMEOUT = 60_000

/** The first line of `text`, trimmed. */
function firstLine(text: string): string {
  return text.split("\n")[0]?.trim() ?? ""
}
