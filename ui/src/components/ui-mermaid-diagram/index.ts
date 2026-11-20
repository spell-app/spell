/**
 * The Mermaid diagram family:  defines `<ui-mermaid-diagram>` and exports its component, `UIMermaidDiagram`, its DOM
 * element class, `DOMMermaidDiagramElement`, and its helper, `MermaidDrawer`;
 *   and `ElkEngine`, the one door to ELK it lays out with (`spell/ui/util/ElkEngine`), for a bundle that swaps its loader.
 * - SIDE EFFECTS:  importing it defines the tag, and `<ui-loader>` and `<ui-message>` (its loading and error looks),
 *   `<ui-dropdown>`, `<ui-item>` and `<ui-icon>` (its menu).
 * - Also the library's `spell/ui/ui-mermaid-diagram` entry (its size is in `notes/report.md`).
 * - Mermaid is NOT in this chunk:  `MermaidEngine` loads on the first draw, and Mermaid splits itself by kind of
 *   diagram from there.
 */

import { DOMMermaidDiagramElement, UIMermaidDiagram } from "./UIMermaidDiagram"
import { MermaidDrawer } from "./MermaidDrawer"
// Import directly:  the one door to ELK, in no barrel (its header says why)
import { ElkEngine } from "spell/ui/util/ElkEngine"

import "spell/ui/components/ui-loader"
import "spell/ui/components/ui-message"
import "spell/ui/components/ui-dropdown"
import "spell/ui/components/ui-item"
import "spell/ui/components/ui-icon"

UIMermaidDiagram.define()

export { UIMermaidDiagram, DOMMermaidDiagramElement, MermaidDrawer, ElkEngine }
