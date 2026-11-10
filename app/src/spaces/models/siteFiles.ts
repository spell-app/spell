/**
 * Does `text`, a file of a project, declare a site, in either of Spell's forms?
 * - spellx:  `<site "galaxy guide">` (or its old spelling, `<spell-site>`);  code spell:  `galaxy guide is a site:`.
 * - By reading its text, so a list of projects can say which are sites without compiling them:
 *   what the editor's Site button and the page of a group's sites both go by.
 * - Plain text in, a boolean out:  it loads no parser, so it runs in a server and a page alike.
 */
export function declaresSite(text: string): boolean {
  return SPELLX_SITE.test(text) || CODE_SITE.test(text)
}

/**
 * Where a spellx site starts:  `<site "galaxy guide">`, Spanish's `<sitio>` (epic `language` P41);
 * or their old spellings, `<spell-site>`, `<encanto-sitio>`.
 */
export const SPELLX_SITE = /^<(?:(?:spell|encanto)-)?(?:site|sitio)\b/m

/** Where a code-spell site starts:  `galaxy guide is a site:`, `... is a site at "owen@spell/galaxy":`. */
export const CODE_SITE = /^\S.* is an? site\b.*$/m
