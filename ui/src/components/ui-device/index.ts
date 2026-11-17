/**
 * The device family:  defines `<ui-device>`, and exports its component.
 * - SIDE EFFECT:  importing it defines the tag, and the buttons and modal it draws with.
 * - Also the library's `spell/ui/ui-device` entry.
 */

import { UIDevice } from "./UIDevice"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-modal"

UIDevice.define()

export { UIDevice, type DeviceName, type Size as DeviceSize } from "./UIDevice"
