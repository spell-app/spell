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
      "styled",
      "fluid",
      "inverted",
      "basic",
      "compact",
      "tree",
      "exclusive",
      "collapsible",
      "open",
      "source",
      "select"
    ]
  },
  "ui-actions": { folder: "ui-parts", attributes: [] },
  "ui-ad": { folder: "ui-ad", skeleton: { width: "18em", height: "15em" }, attributes: ["unit", "centered", "test"] },
  "ui-author": { folder: "ui-parts", attributes: ["href", "target"] },
  "ui-avatar": { folder: "ui-parts", attributes: ["src", "alt"] },
  "ui-breadcrumb": {
    folder: "ui-breadcrumb",
    skeleton: { parts: [{ shape: "line", length: "medium" }] },
    attributes: ["size", "inverted", "divider", "divider-icon"]
  },
  "ui-breadcrumb-section": { folder: "ui-breadcrumb", attributes: ["active", "href", "target"] },
  "ui-button": {
    folder: "ui-button",
    skeleton: { display: "inline", width: "6em", height: "2.5em" },
    attributes: [
      "size",
      "color",
      "primary",
      "secondary",
      "positive",
      "negative",
      "basic",
      "tertiary",
      "inverted",
      "toggle",
      "active",
      "active-text",
      "inactive-text",
      "disabled",
      "loading",
      "fluid",
      "circular",
      "compact",
      "unpadded",
      "wrapped",
      "ellipsis",
      "labeled",
      "animated",
      "attached",
      "floated",
      "icon",
      "icon-position",
      "content",
      "label",
      "type",
      "commandfor",
      "command",
      "href",
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
      "primary",
      "secondary",
      "positive",
      "negative",
      "basic",
      "tertiary",
      "inverted",
      "icon",
      "labeled",
      "compact",
      "circular",
      "toggle",
      "vertical",
      "fluid",
      "equal",
      "wrapping",
      "spaced",
      "stackable",
      "attached",
      "floated",
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
      "compact",
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
      "horizontal",
      "raised",
      "link",
      "fluid",
      "centered",
      "basic",
      "dashed",
      "inverted",
      "disabled",
      "loading",
      "href",
      "target",
      "header",
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
      "centered",
      "horizontal",
      "raised",
      "link",
      "basic",
      "inverted"
    ]
  },
  "ui-checkbox": {
    folder: "ui-checkbox",
    skeleton: { display: "inline", width: "6em", height: "1.25em" },
    attributes: [
      "size",
      "color",
      "type",
      "indeterminate",
      "fitted",
      "invisible",
      "right-aligned",
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
      "floated",
      "attached",
      "centered",
      "stretched",
      "only",
      "text-align",
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
    attributes: ["size", "threaded", "minimal", "inverted", "collapsed", "disabled"]
  },
  "ui-components": { folder: "ui-components", attributes: ["source"] },
  "ui-container": {
    folder: "ui-container",
    attributes: ["text", "fluid", "wide", "grid", "relaxed", "text-align", "scrolling", "resizable"]
  },
  "ui-content": { folder: "ui-parts", attributes: ["image", "scrolling", "floated", "text-align", "vertical-align"] },
  "ui-date": { folder: "ui-parts", attributes: ["datetime"] },
  "ui-description": { folder: "ui-parts", attributes: [] },
  "ui-detail": { folder: "ui-parts", attributes: ["href"] },
  "ui-dimmer": {
    folder: "ui-dimmer",
    attributes: ["shade", "page", "inverted", "blurring", "simple", "disabled", "vertical-align", "show-on", "closedby"]
  },
  "ui-divider": {
    folder: "ui-divider",
    skeleton: { height: "0.25em" },
    attributes: [
      "size",
      "color",
      "horizontal",
      "vertical",
      "spacer",
      "fitted",
      "clearing",
      "section",
      "inverted",
      "text-align",
      "icon"
    ]
  },
  "ui-docs-api": {
    folder: "ui-docs-api",
    skeleton: {
      parts: [
        { shape: "line", length: "short" },
        { shape: "paragraph", lines: 5 }
      ]
    },
    attributes: ["tag", "family", "level"]
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
  "ui-docs-themes": {
    folder: "ui-docs-themes",
    skeleton: { display: "inline", width: "5em", height: "2.25em" },
    attributes: ["for", "show", "size", "inverted"]
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
      "compact",
      "fluid",
      "scrolling",
      "upward",
      "simple",
      "clearable",
      "disabled",
      "loading",
      "readonly",
      "inverted",
      "unlimited",
      "resizable",
      "short",
      "very-short",
      "long",
      "very-long",
      "open",
      "pointing",
      "columnar",
      "direction",
      "icon",
      "placeholder",
      "value",
      "text",
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
      "branded-ui",
      "parameters",
      "active"
    ]
  },
  "ui-emoji": {
    folder: "ui-emoji",
    skeleton: { display: "inline", width: "1em", height: "1em" },
    attributes: ["size", "name", "label", "link", "disabled", "loading"]
  },
  "ui-event": { folder: "ui-feed", attributes: ["color", "icon", "image", "label", "basic", "disabled"] },
  "ui-extra": { folder: "ui-parts", attributes: ["text"] },
  "ui-feed": {
    folder: "ui-feed",
    skeleton: {
      parts: [
        { shape: "header", image: true },
        { shape: "paragraph", lines: 2 }
      ]
    },
    attributes: ["size", "color", "connected", "ordered", "divided", "basic", "inverted", "disabled"]
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
    attributes: ["position", "fullscreen", "inverted", "blurring", "width", "closable", "closedby", "header", "content"]
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
      "padded",
      "relaxed",
      "compact",
      "centered",
      "stretched",
      "stackable",
      "doubling",
      "inverted",
      "only",
      "reversed",
      "stack-with",
      "text-align",
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
      "attached",
      "seamless",
      "floated",
      "text-align",
      "fitted",
      "disabled",
      "inverted",
      "href"
    ]
  },
  "ui-icon": {
    folder: "ui-icon",
    skeleton: { display: "inline", width: "1em", height: "1em" },
    attributes: [
      "size",
      "color",
      "name",
      "outline",
      "label",
      "disabled",
      "inverted",
      "loading",
      "fitted",
      "link",
      "circular",
      "bordered",
      "flipped",
      "rotated",
      "corner"
    ]
  },
  "ui-icons": {
    folder: "ui-icon",
    skeleton: { display: "inline", width: "1em", height: "1em" },
    attributes: ["size", "label", "disabled", "loading", "fitted", "circular", "bordered", "inverted"]
  },
  "ui-image": {
    folder: "ui-image",
    skeleton: { width: "10em", parts: [{ shape: "image", ratio: "square" }] },
    attributes: [
      "size",
      "avatar",
      "bordered",
      "centered",
      "circular",
      "disabled",
      "fluid",
      "inline",
      "rounded",
      "floated",
      "spaced",
      "vertical-align",
      "src",
      "alt",
      "width",
      "height",
      "loading",
      "href"
    ]
  },
  "ui-images": {
    folder: "ui-image",
    attributes: [
      "size",
      "avatar",
      "bordered",
      "centered",
      "circular",
      "disabled",
      "fluid",
      "rounded",
      "floated",
      "vertical-align"
    ]
  },
  "ui-include": {
    folder: "ui-include",
    skeleton: { parts: [{ shape: "paragraph", lines: 4 }] },
    attributes: ["source", "load", "select", "page-styles"]
  },
  "ui-input": {
    folder: "ui-input",
    skeleton: { display: "inline", width: "14em", height: "2.5em" },
    attributes: [
      "size",
      "color",
      "state",
      "transparent",
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
      "text",
      "description",
      "icon",
      "image",
      "flag",
      "href",
      "target",
      "link",
      "disabled",
      "selected",
      "fitted",
      "type"
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
    attributes: ["size", "divided", "relaxed", "link", "unstackable", "stack-with", "inverted", "disabled"]
  },
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
      "basic",
      "tinted",
      "attached",
      "horizontal",
      "circular",
      "empty",
      "fluid",
      "centered",
      "prompt",
      "active",
      "disabled",
      "inverted",
      "icon",
      "detail",
      "removable",
      "href",
      "target"
    ]
  },
  "ui-labels": {
    folder: "ui-label",
    attributes: [
      "size",
      "color",
      "tag",
      "basic",
      "tinted",
      "circular",
      "horizontal",
      "image",
      "fluid",
      "centered",
      "inverted",
      "disabled"
    ]
  },
  "ui-list": {
    folder: "ui-list",
    skeleton: { parts: [{ shape: "paragraph", lines: 3 }] },
    attributes: [
      "size",
      "bulleted",
      "ordered",
      "suffixed",
      "link",
      "selection",
      "animated",
      "horizontal",
      "divided",
      "celled",
      "relaxed",
      "fitted",
      "inverted",
      "floated",
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
      "centered",
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
      "secondary",
      "pointing",
      "tabular",
      "text",
      "vertical",
      "pagination",
      "icon",
      "labeled",
      "link",
      "fluid",
      "stackable",
      "centered",
      "borderless",
      "compact",
      "wrapping",
      "wrapped",
      "inverted",
      "floated",
      "fitted",
      "attached",
      "fixed",
      "alignment",
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
      "compact",
      "centered",
      "inverted",
      "attached",
      "text-align",
      "icon",
      "header",
      "dismissible"
    ]
  },
  "ui-meta": { folder: "ui-parts", attributes: [] },
  "ui-modal": {
    folder: "ui-modal",
    attributes: [
      "size",
      "basic",
      "inverted",
      "fullscreen",
      "overlay",
      "scrolling",
      "vertical-align",
      "closable",
      "closedby",
      "header",
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
      "persist",
      "display-time",
      "path",
      "domain",
      "secure",
      "samesite"
    ]
  },
  "ui-or": { folder: "ui-button", attributes: ["text"] },
  "ui-panel": {
    folder: "ui-panel",
    skeleton: { parts: [{ shape: "header" }, { shape: "paragraph" }] },
    attributes: [
      "label",
      "hint",
      "level",
      "icon",
      "badge",
      "description",
      "collapsible",
      "collapsed",
      "fold-icon",
      "sticky",
      "offset",
      "color",
      "size",
      "dividing",
      "block",
      "bordered",
      "styled",
      "raised",
      "basic",
      "compact",
      "padded",
      "attached",
      "scrolling",
      "height",
      "text-align",
      "inverted",
      "loading",
      "disabled",
      "source",
      "select"
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
      "basic",
      "fixed",
      "flowing",
      "fluid",
      "inverted",
      "loading",
      "wide",
      "position",
      "open-on",
      "for",
      "header",
      "content",
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
      "basic",
      "disabled",
      "indicating",
      "inverted",
      "right-aligned",
      "indeterminate",
      "attached",
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
      "select",
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
      "icon",
      "badge",
      "description",
      "collapsible",
      "collapsed",
      "fold-icon",
      "sticky",
      "offset",
      "color",
      "dividing",
      "block",
      "bordered",
      "styled",
      "raised",
      "basic",
      "compact",
      "padded",
      "attached",
      "scrolling",
      "height",
      "text-align"
    ]
  },
  "ui-property-group": {
    folder: "ui-property-editor",
    skeleton: { parts: [{ shape: "header" }, { shape: "paragraph" }] },
    attributes: [
      "select",
      "readonly",
      "state",
      "output",
      "error",
      "label",
      "hint",
      "level",
      "icon",
      "badge",
      "description",
      "collapsible",
      "collapsed",
      "fold-icon",
      "sticky",
      "offset",
      "color",
      "size",
      "dividing",
      "block",
      "bordered",
      "styled",
      "raised",
      "basic",
      "compact",
      "padded",
      "attached",
      "scrolling",
      "height",
      "text-align",
      "inverted",
      "loading",
      "disabled"
    ]
  },
  "ui-pushable": { folder: "ui-sidebar", attributes: [] },
  "ui-pusher": { folder: "ui-sidebar", attributes: [] },
  "ui-radio": {
    folder: "ui-checkbox",
    skeleton: { display: "inline", width: "6em", height: "1.25em" },
    attributes: [
      "size",
      "color",
      "type",
      "fitted",
      "invisible",
      "right-aligned",
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
  "ui-rail": { folder: "ui-rail", attributes: ["size", "position", "internal", "dividing", "attached", "close"] },
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
    attributes: ["size", "fade", "move", "rotate", "slide", "instant", "unclipped", "active", "disabled"]
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
      "color",
      "columns",
      "equal-width",
      "divided",
      "relaxed",
      "centered",
      "stretched",
      "stackable",
      "doubling",
      "only",
      "reversed",
      "text-align",
      "vertical-align"
    ]
  },
  "ui-search": {
    folder: "ui-search",
    skeleton: { display: "inline", width: "15em", height: "2.5em" },
    attributes: [
      "size",
      "category",
      "horizontal",
      "fluid",
      "scrolling",
      "resizable",
      "short",
      "very-short",
      "long",
      "very-long",
      "aligned",
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
      "icon",
      "badge",
      "description",
      "collapsible",
      "collapsed",
      "fold-icon",
      "sticky",
      "offset",
      "color",
      "size",
      "dividing",
      "block",
      "bordered",
      "styled",
      "raised",
      "basic",
      "compact",
      "padded",
      "attached",
      "scrolling",
      "height",
      "text-align",
      "inverted",
      "loading",
      "disabled",
      "source",
      "select"
    ]
  },
  "ui-sections": { folder: "ui-section", attributes: ["collapsing"] },
  "ui-segment": {
    folder: "ui-segment",
    skeleton: { parts: [{ shape: "header" }, { shape: "paragraph" }] },
    attributes: [
      "size",
      "color",
      "raised",
      "stacked",
      "piled",
      "vertical",
      "placeholder",
      "circular",
      "compact",
      "padded",
      "basic",
      "clearing",
      "floated",
      "text-align",
      "secondary",
      "tertiary",
      "attached",
      "seamless",
      "inverted",
      "loading",
      "disabled",
      "fitted",
      "scrolling",
      "resizable"
    ]
  },
  "ui-segments": {
    folder: "ui-segment",
    attributes: [
      "size",
      "horizontal",
      "equal-width",
      "wrapping",
      "stackable",
      "raised",
      "stacked",
      "piled",
      "compact",
      "basic",
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
      "compact",
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
      "basic",
      "disabled",
      "readonly",
      "hover",
      "inverted",
      "labeled",
      "range",
      "reversed",
      "smooth",
      "ticked",
      "vertical",
      "aligned",
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
  "ui-statistic": {
    folder: "ui-statistic",
    skeleton: { display: "inline", width: "6em", height: "4em" },
    attributes: ["size", "color", "horizontal", "inverted", "fluid", "floated", "value", "text", "label"]
  },
  "ui-statistics": {
    folder: "ui-statistic",
    attributes: ["size", "color", "horizontal", "inverted", "stackable", "stack-with", "equal", "widths"]
  },
  "ui-step": {
    folder: "ui-step",
    attributes: [
      "color",
      "selected",
      "completed",
      "disabled",
      "link",
      "href",
      "target",
      "icon",
      "header",
      "description"
    ]
  },
  "ui-steps": {
    folder: "ui-step",
    skeleton: { height: "5em" },
    attributes: [
      "size",
      "color",
      "ordered",
      "vertical",
      "circular",
      "fluid",
      "equal",
      "attached",
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
      "attached",
      "basic",
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
      "striped",
      "structured",
      "unstackable",
      "basic",
      "compact",
      "padded",
      "attached",
      "stackable",
      "stack-by",
      "scrolling",
      "overflowing",
      "stuck",
      "columns",
      "text-align",
      "vertical-align",
      "sort-column",
      "sort-direction",
      "client-sort",
      "column-defs",
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
      "tabular",
      "pointing",
      "secondary",
      "text",
      "inverted",
      "vertical",
      "fluid",
      "compact",
      "alignment",
      "equal",
      "basic",
      "attached",
      "value",
      "activation",
      "history"
    ]
  },
  "ui-text": { folder: "ui-text", attributes: ["size", "color", "state", "inverted", "disabled"] },
  "ui-textarea": {
    folder: "ui-input",
    skeleton: { width: "20em", height: "6em" },
    attributes: [
      "size",
      "state",
      "transparent",
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
  "ui-title": { folder: "ui-parts", attributes: ["href"] },
  "ui-toast": {
    folder: "ui-toast",
    attributes: [
      "type",
      "color",
      "inverted",
      "header",
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
  "ui-visibility": { folder: "ui-visibility", attributes: ["once", "continuous", "offset", "type", "duration"] }
}
