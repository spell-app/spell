import { onCleanup } from "solid-js"

import { E, UI, UIT } from "spell/ui/core"
import { F } from "spell/ui/forms"
import { radioVocabulary } from "./UIRadio.en"
import { CheckControl } from "./CheckControl"
import { RadioGroup } from "./RadioGroup"
import { type RadioMember } from "./UICheckbox.types"

/****************
 * ### `UIRadio`
 * The component behind `<ui-radio>`:  one radio button of a group.
 *
 * - Its shadow DOM:  `<div class="ui radio checkbox" part="checkbox">` (`slider` / `toggle` looks too)
 *   around a native `<input type="radio" part="control">` and its `<label part="label">` (see `CheckControl`).
 * - Grouped by `name` within its form owner, else its root node (`RadioGroup`):
 *   - choosing one unchooses the rest (without events, as natively)
 *   - only the group's tab stop is tabbable:  the chosen one, else the first enabled one
 *   - Arrow Down / Right choose the next enabled one, Arrow Up / Left the previous, wrapping.
 * - Only the newly chosen radio sends `ui-changed`;  the form gets the chosen one's `name=value`.
 * - `required` on any member requires a choice in the group:  every member reports `valueMissing`.
 ****************/
export class UIRadio extends CheckControl<typeof radioVocabulary> implements RadioMember {
  @E.proto static vocabulary = radioVocabulary

  readonly checkable = "radio"

  ////////////////
  // ## The group
  ////////////////

  /**
   * The group it's in, if named and connected;  tracked.
   * - Starts as the group found at construction (joined in the constructor), so the first render is final.
   * - Then written ONLY by `joinGroup()`, together with the membership, so readers never see one without the other.
   * - `ownedWrite`:  `joinGroup()` runs from the lifecycle methods, possibly inside a Solid render.
   */
  @E.state({ ownedWrite: true }) accessor group: RadioGroup | undefined = this.findGroup()

  constructor(...args: ConstructorParameters<typeof CheckControl>) {
    super(...args)
    this.group?.join(this)
    // `name` reads fresh here:  the DOM element's `attributeValues` has the new value before its callbacks run
    this.domElement.addPropertyChangedCallback((key: string) => {
      if (key === NAME) this.joinGroup()
    })
    // disposal (`domElement.dispose()`):  out of the group, without publishing into a dying root
    onCleanup(() => this.leaveGroup())
  }

  onConnect() {
    super.onConnect()
    this.joinGroup()
  }

  onDisconnect() {
    super.onDisconnect()
    this.joinGroup()
  }

  onFormAssociated() {
    this.joinGroup()
  }

  /**
   * Join the group its name, connection and form owner call for now (leaving the old one), and publish it.
   * - Called where those change:  construction, connect / disconnect, form association, a `name` write.
   *   NEVER from an effect on a memo of them (see `RadioGroup`).
   * - Reads the platform synchronously (`isConnected`, `internals.form`), and its own members untracked:
   *   it may run inside someone else's Solid computation.
   */
  @E.untracked
  private joinGroup() {
    const next = this.findGroup()
    const current = this.group
    if (next === current) return
    current?.leave(this)
    next?.join(this)
    this.group = next
  }

  /** Leave its group for good:  the element is being released. */
  @E.untracked
  private leaveGroup() {
    this.group?.leave(this)
  }

  /** The group its name, connection and form owner call for now. */
  @E.untracked
  private findGroup(): RadioGroup | undefined {
    const { domElement } = this
    const groupName = this.name
    if (!groupName || !domElement.isConnected) return undefined
    return RadioGroup.of(domElement.internals.form ?? domElement.getRootNode(), groupName)
  }

  /** This one was chosen:  unchoose the others in its group (no events, as natively). */
  @E.onChange("isSelected", "group")
  protected onGroupChoiceChanged(isSelected: boolean, group: RadioGroup | undefined) {
    if (!isSelected || !group) return
    for (const other of group.others(this)) if (other.isSelected) other.isSelected = false
  }

  /**
   * Arrow keys move the choice through the group, wrapping, focus following;  Home / End to the ends.
   * - The group's tab stop is its own (`inputTabIndex`), so the arrows only move focus (`tabindex: "left alone"`).
   */
  @E.untracked
  protected onKeyDown(event: KeyboardEvent) {
    const group = this.group
    if (!group) return
    // `readonly` never changes the choice, from either end of the move
    if (this.readonly) {
      if (ARROW_KEYS.has(event.key)) event.preventDefault()
      return
    }
    const members = group.membersInOrder.filter((member) => member === this || !member.isDisabled) as UIRadio[]
    if (members.length < 2) return
    UI.focus.arrowKey(event, {
      container: this.domElement,
      items: () => members.map((member) => member.domElement),
      orientation: "both",
      tabindex: "left alone",
      onChange: (_item, index) => {
        const target = members[index]!
        if (!target.readonly) target.choose(true, event)
      }
    })
  }

  /** The group's tab stop is tabbable, the others aren't;  alone, it is. */
  protected get inputTabIndex(): number {
    const group = this.group
    return !group || group.tabStop === this ? 0 : -1
  }

  ////////////////
  // ## Validity
  ////////////////

  /**
   * Group-wide validation:  a choice required by any member.
   * - `@derived`:  runs the validator over the group, and every member's effects read it.
   */
  @E.derived
  override get validation(): E.ValidationResult {
    const group = this.group
    const required = group ? group.isRequired : this.required
    const chosen = group ? group.selectedMember?.chosenValue : this.isSelected ? this.chosenValue : undefined
    return F.FormComponent.validator.validate(chosen ?? "", required ? [UIT.REQUIRED_RULE] : [], {
      label: this.validationLabel
    })
  }

  protected get validationLabel(): string | undefined {
    return this.name ?? super.validationLabel
  }

  ////////////////
  // ## Element hooks
  ////////////////

  protected get inputType(): "radio" {
    return "radio"
  }

  protected classValue(name: E.AttributeName<typeof radioVocabulary>): unknown {
    if (name === "appearance") return this.appearance ?? "radio"
    return super.classValue(name)
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIRadio extends E.AttributeValues<typeof radioVocabulary> {}

/** The `name` attribute's key, as the DOM element's change callbacks report it. */
const NAME: E.AttributeName<typeof radioVocabulary> = "name"

/** The keys that move through the group:  a `readonly` radio swallows them. */
const ARROW_KEYS = new Set<string>([UIT.Key.arrowDown, UIT.Key.arrowRight, UIT.Key.arrowUp, UIT.Key.arrowLeft])
