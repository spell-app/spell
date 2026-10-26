/* GENERATED -- do not edit, run `yarn gen:root` (source:  every `UI<Name>.en.ts`) */

import type { RootCatalogEntry } from "./UIRoot.types"

/** Every component tag => what `<ui-root>` needs before its family loads. */
export const ROOT_CATALOG: Readonly<Record<string, RootCatalogEntry>> = {
  "ui-accordion": {
    folder: "ui-accordion",
    skeleton: {
      parts: [
        { shape: "line", length: "long" },
        { shape: "line", length: "long" },
        { shape: "line", length: "long" }
      ]
    },
    attributes: [
      "appearance",
      "fluid",
      "inverted",
      "padding",
      "tree",
      "exclusive",
      "collapsible",
      "open",
      "source",
      "selector"
    ]
  },
  "ui-action": {
    folder: "ui-action",
    skeleton: { display: "inline", width: "8em", height: "2.5em" },
    attributes: [
      "color",
      "position",
      "value",
      "label",
      "description",
      "icon",
      "image",
      "flag",
      "link",
      "target",
      "appearance",
      "disabled",
      "selected",
      "padding",
      "kind",
      "action",
      "shortcut"
    ]
  },
  "ui-actions": { folder: "ui-parts", attributes: [] },
  "ui-ad": { folder: "ui-ad", skeleton: { width: "18em", height: "15em" }, attributes: ["unit", "align", "test"] },
  "ui-audio": { folder: "ui-video", attributes: ["src", "autoplay", "muted", "loop", "controls"] },
  "ui-author": { folder: "ui-parts", attributes: ["link", "target"] },
  "ui-avatar": { folder: "ui-parts", attributes: ["src", "tooltip"] },
  "ui-breadcrumb": { folder: "ui-breadcrumbs", attributes: ["selected", "link", "target"] },
  "ui-breadcrumbs": {
    folder: "ui-breadcrumbs",
    skeleton: { parts: [{ shape: "line", length: "medium" }] },
    attributes: ["size", "inverted", "divider", "divider-icon"]
  },
  "ui-button": {
    folder: "ui-button",
    skeleton: { display: "inline", width: "6em", height: "2.5em" },
    attributes: [
      "size",
      "color",
      "appearance",
      "inverted",
      "toggle",
      "selected",
      "active-text",
      "inactive-text",
      "disabled",
      "loading",
      "fluid",
      "padding",
      "wrap",
      "ellipsis",
      "labeled",
      "reveal",
      "attach",
      "icon",
      "icon-position",
      "label",
      "badge",
      "type",
      "commandfor",
      "command",
      "link",
      "target",
      "download",
      "name",
      "value"
    ],
    formControl: true
  },
  "ui-buttons": {
    folder: "ui-button",
    attributes: [
      "size",
      "color",
      "appearance",
      "inverted",
      "icon",
      "labeled",
      "padding",
      "toggle",
      "direction",
      "fluid",
      "equal",
      "wrapping",
      "spacing",
      "stackable",
      "attach",
      "width"
    ]
  },
  "ui-calendar": {
    folder: "ui-calendar",
    skeleton: { display: "inline", width: "14em", height: "2.5em" },
    attributes: [
      "size",
      "color",
      "inverted",
      "padding",
      "fluid",
      "disabled",
      "open",
      "type",
      "inline",
      "position",
      "value",
      "name",
      "required",
      "readonly",
      "placeholder",
      "min",
      "max",
      "initial-date",
      "first-day-of-week",
      "locale",
      "today",
      "disable-minute",
      "disable-month",
      "disable-year",
      "select-adjacent-days",
      "start-calendar",
      "end-calendar",
      "icon",
      "disabled-dates",
      "disabled-days-of-week"
    ],
    formControl: true
  },
  "ui-card": {
    folder: "ui-card",
    skeleton: {
      width: "18em",
      parts: [{ shape: "image", ratio: "square" }, { shape: "header" }, { shape: "paragraph", lines: 3 }]
    },
    attributes: [
      "size",
      "color",
      "direction",
      "appearance",
      "fluid",
      "align",
      "inverted",
      "disabled",
      "loading",
      "link",
      "target",
      "heading",
      "meta",
      "description",
      "extra",
      "image",
      "alt"
    ]
  },
  "ui-cards": {
    folder: "ui-card",
    attributes: [
      "size",
      "color",
      "columns",
      "doubling",
      "stackable",
      "stack-with",
      "align",
      "direction",
      "appearance",
      "inverted"
    ]
  },
  "ui-cell": { folder: "ui-table", attributes: ["header", "span", "align", "vertical-align"] },
  "ui-checkbox": {
    folder: "ui-checkbox",
    skeleton: { display: "inline", width: "6em", height: "1.25em" },
    attributes: [
      "size",
      "color",
      "appearance",
      "indeterminate",
      "padding",
      "invisible",
      "align",
      "disabled",
      "readonly",
      "inverted",
      "selected",
      "value",
      "name",
      "required",
      "label",
      "off-value"
    ],
    formControl: true
  },
  "ui-code": {
    folder: "ui-code",
    skeleton: { parts: [{ shape: "paragraph", lines: 5 }] },
    attributes: ["source", "load", "language", "line-numbers", "start", "wrap", "copy"]
  },
  "ui-column": {
    folder: "ui-grid",
    attributes: [
      "color",
      "width",
      "width-mobile",
      "width-tablet",
      "width-computer",
      "width-large",
      "width-widescreen",
      "attach",
      "centered",
      "stretched",
      "only",
      "align",
      "vertical-align"
    ]
  },
  "ui-comment": {
    folder: "ui-comment",
    skeleton: {
      parts: [
        { shape: "header", image: true },
        { shape: "paragraph", lines: 2 }
      ]
    },
    attributes: ["collapsed", "disabled"]
  },
  "ui-comments": {
    folder: "ui-comment",
    attributes: ["size", "threaded", "appearance", "inverted", "collapsed", "disabled"]
  },
  "ui-components": { folder: "ui-components", attributes: ["source"] },
  "ui-container": {
    folder: "ui-container",
    attributes: ["text", "fluid", "wide", "grid", "spacing", "align", "scrolling", "resizable"]
  },
  "ui-content": { folder: "ui-parts", attributes: ["image", "scrolling", "align", "vertical-align"] },
  "ui-date": { folder: "ui-parts", attributes: ["datetime"] },
  "ui-description": { folder: "ui-parts", attributes: [] },
  "ui-detail": { folder: "ui-parts", attributes: ["link"] },
  "ui-dimmer": {
    folder: "ui-dimmer",
    attributes: [
      "shade",
      "page",
      "inverted",
      "blurring",
      "appearance",
      "disabled",
      "vertical-align",
      "show-on",
      "closedby"
    ]
  },
  "ui-divider": {
    folder: "ui-divider",
    skeleton: { height: "0.25em" },
    attributes: ["size", "color", "direction", "spacer", "padding", "clearing", "section", "inverted", "align", "icon"]
  },
  "ui-docs-api": {
    folder: "ui-docs-api",
    skeleton: {
      parts: [
        { shape: "line", length: "short" },
        { shape: "paragraph", lines: 5 }
      ]
    },
    attributes: ["tag", "family", "only", "level"]
  },
  "ui-docs-example": {
    folder: "ui-docs-example",
    skeleton: { parts: [{ shape: "header" }, { shape: "paragraph", lines: 2 }] },
    attributes: ["header", "description", "level", "code", "language", "bare", "variation"]
  },
  "ui-docs-inspector": {
    folder: "ui-docs-inspector",
    skeleton: {
      parts: [
        { shape: "line", length: "short" },
        { shape: "paragraph", lines: 4 }
      ]
    },
    attributes: ["for", "all"]
  },
  "ui-docs-nav": {
    folder: "ui-docs-nav",
    skeleton: {
      width: "15em",
      parts: [
        { shape: "paragraph", lines: 3 },
        { shape: "paragraph", lines: 8 }
      ]
    },
    attributes: ["current", "base", "view", "size"]
  },
  "ui-docs-search": {
    folder: "ui-docs-search",
    skeleton: { width: "16em", height: "2.25em" },
    attributes: ["base", "page", "shortcuts", "placeholder", "size"]
  },
  "ui-docs-toc": {
    folder: "ui-docs-toc",
    skeleton: {
      parts: [
        { shape: "line", length: "short" },
        { shape: "paragraph", lines: 6 }
      ]
    },
    attributes: ["for", "header", "size", "expanded"]
  },
  "ui-docs-tokens": {
    folder: "ui-docs-tokens",
    skeleton: {
      parts: [
        { shape: "line", length: "short" },
        { shape: "paragraph", lines: 5 }
      ]
    },
    attributes: ["family", "tag", "global", "groups", "tokens", "playground", "target", "caption", "level"]
  },
  "ui-dropdown": {
    folder: "ui-dropdown",
    skeleton: { display: "inline", width: "14em", height: "2.5em" },
    attributes: [
      "size",
      "color",
      "state",
      "selection",
      "search",
      "multiple",
      "inline",
      "floating",
      "button",
      "labeled",
      "padding",
      "fluid",
      "scrolling",
      "appearance",
      "clearable",
      "disabled",
      "loading",
      "readonly",
      "inverted",
      "limit",
      "resizable",
      "length",
      "open",
      "pointing",
      "columnar",
      "direction",
      "icon",
      "placeholder",
      "value",
      "label",
      "name",
      "required",
      "allow-additions",
      "min-characters",
      "max-selections",
      "no-results-text",
      "addition-text",
      "options"
    ],
    formControl: true
  },
  "ui-embed": {
    folder: "ui-embed",
    skeleton: { width: "28em", height: "15.75em" },
    attributes: [
      "source",
      "video-id",
      "url",
      "placeholder",
      "label",
      "alt",
      "icon",
      "aspect-ratio",
      "autoplay",
      "parameters",
      "active"
    ]
  },
  "ui-emoji": {
    folder: "ui-emoji",
    skeleton: { display: "inline", width: "1em", height: "1em" },
    attributes: ["size", "name", "label", "appearance", "disabled", "loading"]
  },
  "ui-event": { folder: "ui-feed", attributes: ["color", "icon", "image", "label", "appearance", "disabled"] },
  "ui-extra": { folder: "ui-parts", attributes: ["text"] },
  "ui-feed": {
    folder: "ui-feed",
    skeleton: {
      parts: [
        { shape: "header", image: true },
        { shape: "paragraph", lines: 2 }
      ]
    },
    attributes: ["size", "color", "connected", "ordered", "divided", "appearance", "inverted", "disabled"]
  },
  "ui-field": {
    folder: "ui-form",
    skeleton: { height: "4.5em" },
    attributes: [
      "label",
      "description",
      "hint",
      "output",
      "error",
      "state",
      "apply",
      "mixed",
      "rules",
      "inline",
      "required",
      "readonly",
      "disabled",
      "width"
    ]
  },
  "ui-fields": {
    folder: "ui-form",
    attributes: ["state", "inline", "grouped", "unstackable", "required", "disabled", "equal", "widths"]
  },
  "ui-flag": {
    folder: "ui-flag",
    skeleton: { display: "inline", width: "1.1em", height: "0.8em" },
    attributes: ["size", "country"]
  },
  "ui-flyout": {
    folder: "ui-flyout",
    attributes: [
      "position",
      "fullscreen",
      "inverted",
      "blurring",
      "modeless",
      "width",
      "closable",
      "closedby",
      "heading",
      "content"
    ]
  },
  "ui-form": {
    folder: "ui-form",
    attributes: [
      "size",
      "state",
      "equal-width",
      "inverted",
      "loading",
      "disabled",
      "unstackable",
      "stack-with",
      "validate",
      "apply",
      "rules",
      "error-focus",
      "prevent-leaving",
      "value",
      "debug"
    ]
  },
  "ui-grid": {
    folder: "ui-grid",
    attributes: [
      "columns",
      "equal-width",
      "divided",
      "celled",
      "padding",
      "spacing",
      "centered",
      "stretched",
      "stackable",
      "doubling",
      "inverted",
      "only",
      "reversed",
      "stack-with",
      "align",
      "vertical-align"
    ]
  },
  "ui-header": {
    folder: "ui-parts",
    skeleton: { parts: [{ shape: "line", length: "medium" }] },
    attributes: [
      "level",
      "size",
      "color",
      "sub",
      "icon",
      "dividing",
      "block",
      "attach",
      "seamless",
      "align",
      "padding",
      "disabled",
      "inverted",
      "link"
    ]
  },
  "ui-icon": {
    folder: "ui-icon",
    skeleton: { display: "inline", width: "1em", height: "1em" },
    attributes: [
      "size",
      "color",
      "name",
      "label",
      "disabled",
      "inverted",
      "loading",
      "padding",
      "appearance",
      "flipped",
      "rotated",
      "corner"
    ]
  },
  "ui-icon-picker": {
    folder: "ui-icon-picker",
    skeleton: { display: "inline", width: "14em", height: "2.5em" },
    attributes: ["value", "name", "placeholder", "size", "fluid", "disabled", "readonly", "required"],
    formControl: true
  },
  "ui-icons": {
    folder: "ui-icon",
    skeleton: { display: "inline", width: "1em", height: "1em" },
    attributes: ["size", "label", "disabled", "loading", "padding", "appearance", "inverted"]
  },
  "ui-image": {
    folder: "ui-image",
    skeleton: { width: "10em", parts: [{ shape: "image", ratio: "square" }] },
    attributes: [
      "size",
      "avatar",
      "appearance",
      "align",
      "disabled",
      "fluid",
      "inline",
      "floated",
      "spacing",
      "vertical-align",
      "src",
      "caption",
      "alt",
      "width",
      "height",
      "loading",
      "link"
    ]
  },
  "ui-images": {
    folder: "ui-image",
    attributes: ["size", "avatar", "appearance", "align", "disabled", "fluid", "vertical-align"]
  },
  "ui-include": {
    folder: "ui-include",
    skeleton: { parts: [{ shape: "paragraph", lines: 4 }] },
    attributes: ["source", "load", "selector", "page-styles"]
  },
  "ui-input": {
    folder: "ui-input",
    skeleton: { display: "inline", width: "14em", height: "2.5em" },
    attributes: [
      "size",
      "color",
      "state",
      "appearance",
      "fluid",
      "loading",
      "disabled",
      "inverted",
      "readonly",
      "icon-position",
      "labeled",
      "action",
      "icon",
      "label",
      "type",
      "value",
      "name",
      "placeholder",
      "required",
      "pattern",
      "min",
      "max",
      "step",
      "minlength",
      "maxlength",
      "multiple",
      "accept",
      "autocomplete",
      "inputmode",
      "rules"
    ],
    formControl: true
  },
  "ui-item": {
    folder: "ui-item",
    attributes: [
      "color",
      "position",
      "value",
      "label",
      "description",
      "icon",
      "image",
      "flag",
      "link",
      "target",
      "appearance",
      "disabled",
      "selected",
      "padding",
      "kind"
    ]
  },
  "ui-items": {
    folder: "ui-items",
    skeleton: {
      parts: [
        { shape: "header", image: true },
        { shape: "paragraph", lines: 3 }
      ]
    },
    attributes: ["size", "divided", "spacing", "appearance", "unstackable", "stack-with", "inverted", "disabled"]
  },
  "ui-keys": { folder: "ui-keys", attributes: ["shortcut", "platform"] },
  "ui-label": {
    folder: "ui-label",
    skeleton: { display: "inline", width: "4em", height: "1.8em" },
    attributes: [
      "size",
      "color",
      "image",
      "tag",
      "corner",
      "ribbon",
      "pointing",
      "floating",
      "appearance",
      "attach",
      "direction",
      "empty",
      "fluid",
      "align",
      "prompt",
      "selected",
      "disabled",
      "inverted",
      "icon",
      "detail",
      "removable",
      "link",
      "target"
    ]
  },
  "ui-labels": {
    folder: "ui-label",
    attributes: ["size", "color", "tag", "appearance", "direction", "image", "fluid", "align", "inverted", "disabled"]
  },
  "ui-link": { folder: "ui-text", attributes: ["size", "color", "inverted", "disabled"] },
  "ui-list": {
    folder: "ui-list",
    skeleton: { parts: [{ shape: "paragraph", lines: 3 }] },
    attributes: [
      "size",
      "bulleted",
      "ordered",
      "suffixed",
      "appearance",
      "selection",
      "hover",
      "direction",
      "divided",
      "celled",
      "spacing",
      "padding",
      "inverted",
      "vertical-align"
    ]
  },
  "ui-loader": {
    folder: "ui-loader",
    attributes: [
      "size",
      "color",
      "speed",
      "disabled",
      "text",
      "inline",
      "align",
      "indeterminate",
      "double",
      "elastic",
      "inverted"
    ]
  },
  "ui-markdown": {
    folder: "ui-markdown",
    skeleton: { parts: [{ shape: "header" }, { shape: "paragraph", lines: 4 }] },
    attributes: ["source", "load", "size", "breaks", "heading-offset", "skip-title", "editable", "sanitized"]
  },
  "ui-menu": {
    folder: "ui-menu",
    skeleton: { height: "3em" },
    attributes: [
      "size",
      "color",
      "appearance",
      "position",
      "direction",
      "pagination",
      "icon",
      "labeled",
      "fluid",
      "stackable",
      "centered",
      "wrapping",
      "wrap",
      "inverted",
      "padding",
      "attach",
      "fixed",
      "align",
      "equal",
      "items",
      "interactive"
    ]
  },
  "ui-message": {
    folder: "ui-message",
    skeleton: { parts: [{ shape: "header" }, { shape: "line", length: "long" }] },
    attributes: [
      "size",
      "color",
      "state",
      "floating",
      "padding",
      "centered",
      "inverted",
      "attach",
      "align",
      "icon",
      "heading",
      "dismissible"
    ]
  },
  "ui-meta": { folder: "ui-parts", attributes: [] },
  "ui-modal": {
    folder: "ui-modal",
    attributes: [
      "size",
      "appearance",
      "inverted",
      "fullscreen",
      "overlay",
      "scrolling",
      "vertical-align",
      "closable",
      "closedby",
      "heading",
      "content"
    ]
  },
  "ui-nag": {
    folder: "ui-nag",
    attributes: [
      "size",
      "color",
      "inverted",
      "fixed",
      "overlay",
      "bottom",
      "closable",
      "key",
      "value",
      "storage",
      "expires",
      "persistent",
      "display-time",
      "path",
      "domain",
      "secure",
      "samesite"
    ]
  },
  "ui-or": { folder: "ui-button", attributes: ["label"] },
  "ui-page": {
    folder: "ui-page",
    attributes: [
      "display",
      "loading",
      "timeout",
      "theme",
      "size",
      "stack-with",
      "width",
      "height",
      "icons",
      "emoji",
      "assets",
      "fixed",
      "pure"
    ]
  },
  "ui-panel": {
    folder: "ui-panel",
    skeleton: { parts: [{ shape: "header" }, { shape: "paragraph" }] },
    attributes: [
      "label",
      "hint",
      "level",
      "parent",
      "icon",
      "badge",
      "description",
      "collapsible",
      "open",
      "fold-icon",
      "sticky",
      "offset",
      "color",
      "size",
      "dividing",
      "block",
      "appearance",
      "padding",
      "attach",
      "scrolling",
      "height",
      "align",
      "inverted",
      "loading",
      "disabled",
      "source",
      "selector"
    ]
  },
  "ui-placeholder": { folder: "ui-placeholder", attributes: ["fluid", "inverted"] },
  "ui-placeholder-header": { folder: "ui-placeholder", attributes: ["image"] },
  "ui-placeholder-image": { folder: "ui-placeholder", attributes: ["square", "rectangular"] },
  "ui-placeholder-line": { folder: "ui-placeholder", attributes: ["length"] },
  "ui-placeholder-paragraph": { folder: "ui-placeholder", attributes: [] },
  "ui-popup": {
    folder: "ui-popup",
    attributes: [
      "size",
      "color",
      "appearance",
      "fixed",
      "flowing",
      "fluid",
      "inverted",
      "loading",
      "wide",
      "position",
      "open-on",
      "for",
      "heading",
      "label",
      "hoverable",
      "show-delay",
      "hide-delay",
      "target"
    ]
  },
  "ui-progress": {
    folder: "ui-progress",
    skeleton: { height: "2em" },
    attributes: [
      "size",
      "color",
      "state",
      "speed",
      "active",
      "appearance",
      "disabled",
      "indicating",
      "inverted",
      "align",
      "indeterminate",
      "attach",
      "value",
      "total",
      "percent",
      "precision",
      "bar-text",
      "bar-colors",
      "label"
    ]
  },
  "ui-property": {
    folder: "ui-property-editor",
    skeleton: { height: "4.5em" },
    attributes: [
      "name",
      "as",
      "options",
      "label",
      "description",
      "hint",
      "output",
      "error",
      "state",
      "apply",
      "mixed",
      "rules",
      "inline",
      "required",
      "readonly",
      "disabled",
      "width"
    ]
  },
  "ui-property-editor": {
    folder: "ui-property-editor",
    skeleton: { parts: [{ shape: "header" }, { shape: "paragraph", lines: 3 }] },
    attributes: [
      "schema",
      "value",
      "source",
      "selector",
      "readonly",
      "output",
      "error",
      "size",
      "state",
      "equal-width",
      "inverted",
      "loading",
      "disabled",
      "unstackable",
      "stack-with",
      "validate",
      "apply",
      "rules",
      "error-focus",
      "prevent-leaving",
      "debug",
      "label",
      "hint",
      "level",
      "parent",
      "icon",
      "badge",
      "description",
      "collapsible",
      "open",
      "fold-icon",
      "sticky",
      "offset",
      "color",
      "dividing",
      "block",
      "appearance",
      "padding",
      "attach",
      "scrolling",
      "height",
      "align"
    ]
  },
  "ui-property-group": {
    folder: "ui-property-editor",
    skeleton: { parts: [{ shape: "header" }, { shape: "paragraph" }] },
    attributes: [
      "selector",
      "readonly",
      "state",
      "output",
      "error",
      "label",
      "hint",
      "level",
      "parent",
      "icon",
      "badge",
      "description",
      "collapsible",
      "open",
      "fold-icon",
      "sticky",
      "offset",
      "color",
      "size",
      "dividing",
      "block",
      "appearance",
      "padding",
      "attach",
      "scrolling",
      "height",
      "align",
      "inverted",
      "loading",
      "disabled"
    ]
  },
  "ui-pushable": { folder: "ui-sidebar", attributes: [] },
  "ui-pusher": { folder: "ui-sidebar", attributes: [] },
  "ui-quote": { folder: "ui-quote", attributes: ["inline", "cite"] },
  "ui-radio": {
    folder: "ui-checkbox",
    skeleton: { display: "inline", width: "6em", height: "1.25em" },
    attributes: [
      "size",
      "color",
      "appearance",
      "padding",
      "invisible",
      "align",
      "disabled",
      "readonly",
      "inverted",
      "selected",
      "value",
      "name",
      "required",
      "label"
    ],
    formControl: true
  },
  "ui-rail": { folder: "ui-rail", attributes: ["size", "position", "internal", "dividing", "attach", "close"] },
  "ui-rating": {
    folder: "ui-rating",
    skeleton: { display: "inline", width: "5.5em", height: "1.1em" },
    attributes: [
      "size",
      "color",
      "disabled",
      "readonly",
      "icon",
      "max-rating",
      "value",
      "clearable",
      "name",
      "required"
    ],
    formControl: true
  },
  "ui-repeat": { folder: "ui-form", attributes: ["items", "name"] },
  "ui-reveal": {
    folder: "ui-reveal",
    attributes: ["size", "fade", "move", "rotate", "slide", "instant", "clip", "active", "disabled"]
  },
  "ui-root": {
    folder: "ui-root",
    attributes: [
      "display",
      "loading",
      "timeout",
      "theme",
      "size",
      "stack-with",
      "width",
      "height",
      "icons",
      "emoji",
      "assets",
      "fixed",
      "pure"
    ]
  },
  "ui-row": {
    folder: "ui-grid",
    attributes: [
      "header",
      "footer",
      "color",
      "columns",
      "equal-width",
      "divided",
      "spacing",
      "centered",
      "stretched",
      "stackable",
      "doubling",
      "only",
      "reversed",
      "align",
      "vertical-align"
    ]
  },
  "ui-search": {
    folder: "ui-search",
    skeleton: { display: "inline", width: "15em", height: "2.5em" },
    attributes: [
      "size",
      "category",
      "direction",
      "fluid",
      "scrolling",
      "resizable",
      "length",
      "align",
      "loading",
      "disabled",
      "readonly",
      "open",
      "placeholder",
      "value",
      "name",
      "required",
      "url",
      "min-characters",
      "max-results",
      "search-delay",
      "full-text-search",
      "search-fields",
      "ignore-diacritics",
      "highlight-matches",
      "select-first-result",
      "show-no-results",
      "source"
    ],
    formControl: true
  },
  "ui-section": {
    folder: "ui-section",
    skeleton: { parts: [{ shape: "header" }, { shape: "paragraph" }] },
    attributes: [
      "label",
      "hint",
      "level",
      "parent",
      "icon",
      "badge",
      "description",
      "collapsible",
      "open",
      "fold-icon",
      "sticky",
      "offset",
      "color",
      "size",
      "dividing",
      "block",
      "appearance",
      "padding",
      "attach",
      "scrolling",
      "height",
      "align",
      "inverted",
      "loading",
      "disabled",
      "source",
      "selector"
    ]
  },
  "ui-sections": { folder: "ui-section", attributes: ["collapsing"] },
  "ui-segment": {
    folder: "ui-segment",
    skeleton: { parts: [{ shape: "header" }, { shape: "paragraph" }] },
    attributes: [
      "size",
      "color",
      "appearance",
      "placeholder",
      "padding",
      "clearing",
      "align",
      "attach",
      "seamless",
      "inverted",
      "loading",
      "disabled",
      "scrolling",
      "resizable"
    ]
  },
  "ui-segments": {
    folder: "ui-segment",
    attributes: [
      "size",
      "direction",
      "equal-width",
      "wrapping",
      "stackable",
      "appearance",
      "padding",
      "inverted",
      "loading",
      "disabled"
    ]
  },
  "ui-select": {
    folder: "ui-select",
    skeleton: { display: "inline", width: "12em", height: "2.5em" },
    attributes: [
      "size",
      "state",
      "fluid",
      "padding",
      "inverted",
      "disabled",
      "readonly",
      "multiple",
      "placeholder",
      "value",
      "name",
      "required",
      "options"
    ],
    formControl: true
  },
  "ui-shape": { folder: "ui-shape", attributes: ["cube", "text", "active-index", "direction", "duration"] },
  "ui-side": { folder: "ui-shape", attributes: [] },
  "ui-sidebar": {
    folder: "ui-sidebar",
    attributes: ["position", "width", "transition", "inverted", "blurring", "persistent", "closedby"]
  },
  "ui-slider": {
    folder: "ui-slider",
    skeleton: { width: "16em", height: "1.25em" },
    attributes: [
      "size",
      "color",
      "appearance",
      "disabled",
      "readonly",
      "hover",
      "inverted",
      "labeled",
      "range",
      "smooth",
      "ticked",
      "direction",
      "align",
      "min",
      "max",
      "step",
      "tick-step",
      "value",
      "end",
      "step-labels",
      "name",
      "required"
    ],
    formControl: true
  },
  "ui-stack": { folder: "ui-stack", attributes: ["direction", "wrap", "spacing", "align", "justify", "fluid"] },
  "ui-statistic": {
    folder: "ui-statistic",
    skeleton: { display: "inline", width: "6em", height: "4em" },
    attributes: ["size", "color", "direction", "inverted", "fluid", "value", "text", "label"]
  },
  "ui-statistics": {
    folder: "ui-statistic",
    attributes: ["size", "color", "direction", "inverted", "stackable", "stack-with", "equal", "widths"]
  },
  "ui-step": {
    folder: "ui-step",
    attributes: [
      "color",
      "selected",
      "completed",
      "disabled",
      "link",
      "target",
      "appearance",
      "icon",
      "heading",
      "description",
      "parent"
    ]
  },
  "ui-steps": {
    folder: "ui-step",
    skeleton: { height: "5em" },
    attributes: [
      "size",
      "color",
      "ordered",
      "direction",
      "appearance",
      "fluid",
      "equal",
      "attach",
      "unstackable",
      "stackable",
      "stack-with",
      "widths",
      "inverted"
    ]
  },
  "ui-sticky": { folder: "ui-sticky", attributes: ["offset", "bottom-offset", "pushing"] },
  "ui-summary": { folder: "ui-parts", attributes: [] },
  "ui-tab": {
    folder: "ui-tab",
    attributes: [
      "value",
      "label",
      "icon",
      "selected",
      "active",
      "disabled",
      "loading",
      "lazy",
      "attach",
      "parent",
      "appearance",
      "inverted"
    ]
  },
  "ui-table": {
    folder: "ui-table",
    skeleton: {
      parts: [
        { shape: "line", length: "long" },
        { shape: "paragraph", lines: 4 }
      ]
    },
    attributes: [
      "size",
      "color",
      "celled",
      "collapsing",
      "definition",
      "fixed",
      "inverted",
      "resizable",
      "selectable",
      "single-line",
      "sortable",
      "appearance",
      "unstackable",
      "padding",
      "attach",
      "stackable",
      "stack-by",
      "scrolling",
      "overflowing",
      "stuck",
      "columns",
      "align",
      "vertical-align",
      "sort-column",
      "sort-direction",
      "client-sort",
      "column-defs",
      "caption",
      "rows"
    ]
  },
  "ui-tabs": {
    folder: "ui-tab",
    skeleton: {
      parts: [
        { shape: "line", length: "medium" },
        { shape: "paragraph", lines: 3 }
      ]
    },
    attributes: [
      "size",
      "color",
      "appearance",
      "inverted",
      "direction",
      "fluid",
      "padding",
      "align",
      "equal",
      "attach",
      "value",
      "activation",
      "history"
    ]
  },
  "ui-term": { folder: "ui-terms", attributes: ["label", "value"] },
  "ui-terms": { folder: "ui-terms", attributes: ["direction", "spacing"] },
  "ui-text": { folder: "ui-text", attributes: ["size", "color", "state", "inverted", "paragraph", "disabled"] },
  "ui-textarea": {
    folder: "ui-input",
    skeleton: { width: "20em", height: "6em" },
    attributes: [
      "size",
      "state",
      "appearance",
      "fluid",
      "disabled",
      "inverted",
      "readonly",
      "value",
      "name",
      "placeholder",
      "required",
      "minlength",
      "maxlength",
      "rows",
      "autocomplete",
      "rules"
    ],
    formControl: true
  },
  "ui-theme-editor": { folder: "ui-theme-editor", skeleton: { height: "30em" }, attributes: ["base", "value"] },
  "ui-theme-menu": {
    folder: "ui-theme-menu",
    skeleton: { display: "inline", width: "5em", height: "2.25em" },
    attributes: ["show", "size", "inverted", "compact"]
  },
  "ui-title": { folder: "ui-parts", attributes: ["link"] },
  "ui-toast": {
    folder: "ui-toast",
    attributes: [
      "type",
      "color",
      "inverted",
      "heading",
      "message",
      "icon",
      "closable",
      "close-on-click",
      "display-time",
      "progress",
      "progress-up",
      "pause-on-hover",
      "compact",
      "actions"
    ]
  },
  "ui-toolbar": {
    folder: "ui-toolbar",
    skeleton: { display: "inline", width: "24em", height: "2.5em" },
    attributes: [
      "size",
      "color",
      "appearance",
      "position",
      "direction",
      "pagination",
      "icon",
      "labeled",
      "fluid",
      "stackable",
      "centered",
      "wrapping",
      "wrap",
      "inverted",
      "padding",
      "attach",
      "fixed",
      "align",
      "equal",
      "items",
      "interactive"
    ]
  },
  "ui-transition": {
    folder: "ui-transition",
    attributes: [
      "duration",
      "interrupt",
      "allow-repeats",
      "color",
      "inline",
      "inverted",
      "looping",
      "pulsating",
      "disabled"
    ]
  },
  "ui-tree-diagram": { folder: "ui-tree-diagram", skeleton: { height: "12em" }, attributes: ["tree"] },
  "ui-value": { folder: "ui-parts", attributes: ["text"] },
  "ui-video": {
    folder: "ui-video",
    attributes: ["src", "autoplay", "muted", "loop", "poster", "controls", "captions", "ratio"]
  },
  "ui-visibility": { folder: "ui-visibility", attributes: ["once", "continuous", "offset", "type", "duration"] }
}
