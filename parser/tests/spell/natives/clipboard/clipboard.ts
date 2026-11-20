/**
 * A made-up clipboard helper, the javascript side of the Clipboard test project (epic `from-console` P10):
 * what its Spell calls with `call native`.
 * - Keeps what it's handed instead of touching a real clipboard, so a test can read it back.
 */

/** Everything `copyText()` was handed, oldest first. */
export const copied: string[] = []

/** Put `text` on the clipboard, as if the person had copied it:  here, onto `copied`, and say so. */
export async function copyText(text: string): Promise<void> {
  await Promise.resolve()
  copied.push(text)
  console.log(`copied ${text}`)
}

/** `text` in capitals. */
export function shout(text: string): string {
  return text.toUpperCase()
}
