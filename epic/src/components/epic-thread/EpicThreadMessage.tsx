import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

import { ThreadFacts } from "spell/epic/comments"

import { epicThreadMessageVocabulary } from "./EpicThreadMessage.en"
import { BASE, ROOM, WHEN, WHO, WORDS } from "./EpicThread.types"

import messageCSS from "./EpicThreadMessage.css?inline"

/****************
 * ### `EpicThreadMessage`
 * The component behind `<epic-thread-message>`:  one message of a comment's thread, drawn by `<epic-thread>` in its
 * shadow root (Owen, 2026-10-10:  "lose the 'claude' 'You' bit -- move the time to the top-right of each bit position
 * absolute";  then "Put You in bold, same line, before me and Claude: before yours").
 * - The colour says who (`by`):  a person's plain on the thread's ivory, an agent's a light box in the agent's colour
 *   (`--epic-voice-agent`, epic `epic-friend` P10;  violet before), the Done line green, the thinking stub in the
 *   agent's colour and italic (`EpicThreadMessage.css`).
 *   - a speaker with a colour of their own (the repo's settings):  `--_epic-voice`, which `<epic-thread>` sets on it
 * - A bold "You:" / "Codex:" starts its first line:  floated before what was said (its slot), so it sits on the
 *   first line of the first paragraph, whatever that paragraph is.  The Done line has its check instead.
 * - Its time over its top right corner, `position: absolute`;  a hidden copy floats there, so the first line's text
 *   stops short of it and the rest run full width.  The full date and time is its tooltip.
 * - What was said is its children:  the thread's own markup (Owen's paragraphs, Claude's answer as the server
 *   gave it), styled by the thread's sheet.
 ****************/
export class EpicThreadMessage extends E.UIComponent<typeof epicThreadMessageVocabulary> {
  @E.proto static vocabulary = epicThreadMessageVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-thread-message": messageCSS },
    // a click on its words selects them, never jumps to a link in them
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /**
   * Who, in bold, before what was said (epic `epic-friend` P2;  any agent since P10):  "You:", "Ana:", "Claude:",
   * "Codex (Ana):";  none on the Done line.
   * - a person's words:  "You:" when they're the reader's (`mine`), or name nobody (a comment from before names)
   * - an agent's, by its name (`agent`;  none:  Claude):  "Codex (Ana):" for another person's session's, else "Codex:"
   */
  get who(): string | undefined {
    const person = this.person?.trim()
    if (this.by === "person")
      return this.mine || !person ? this.translationForKey("you") : this.translationForKey("person", { person })
    if (this.by === "agent" || this.by === "thinking") {
      const agent = ThreadFacts.agentLabel(this.agent)
      return person && !this.mine
        ? this.translationForKey("agentOf", { agent, person })
        : this.translationForKey("agent", { agent })
    }
    return undefined
  }

  render(): JSX.Element {
    return (
      <div class={BASE} part={this.partForName("base")}>
        <Show when={this.stamp}>
          {(stamp) => (
            <>
              <span class={ROOM} aria-hidden="true">
                {stamp()}
              </span>
              <time class={WHEN} part={this.partForName("time")} datetime={this.at} title={this.localTime}>
                {stamp()}
              </time>
            </>
          )}
        </Show>
        <div class={WORDS} part={this.partForName("words")}>
          <Show when={this.who}>{(who) => <b class={WHO}>{who()}</b>}</Show>
          <slot />
        </div>
      </div>
    )
  }

  /** Its full local date and time (`2026-10-10 09:12`), its time's tooltip. */
  get localTime(): string {
    return ThreadFacts.localStamp(this.at)
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicThreadMessage extends E.AttributeValues<typeof epicThreadMessageVocabulary> {}
