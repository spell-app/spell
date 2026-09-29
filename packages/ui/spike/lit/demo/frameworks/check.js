/**
 * Shared round-trip check for the framework smoke pages:  once the framework has mounted the dropdown with an
 * `options` array, `value="b"` and `open`, click the first option and expect the framework's own state
 * (rendered into `#value`) and the element's `value` to both become `"a"`.
 * - Writes `PASS ...` / `FAIL ...` to `#result`.
 */
export async function roundTrip(framework) {
  const result = document.querySelector("#result")
  try {
    const dropdown = await until(() => document.querySelector("ui-dropdown"))
    await until(() => dropdown.shadowRoot?.querySelectorAll(".menu > .item").length === 3)
    const before = {
      text: dropdown.shadowRoot.querySelector(".text").textContent.trim(),
      open: dropdown.open,
      popoverOpen: dropdown.shadowRoot.querySelector(".menu").matches(":popover-open"),
      optionsIsProperty: Array.isArray(dropdown.options),
      hasOptionsAttribute: dropdown.hasAttribute("options")
    }
    dropdown.shadowRoot.querySelector(".menu > .item").click()
    await until(() => document.querySelector("#value").textContent.trim() === "a")
    await dropdown.updateComplete
    const after = { value: dropdown.value, framework: document.querySelector("#value").textContent.trim() }
    const ok =
      before.text === "Banana" && before.open && before.popoverOpen && before.optionsIsProperty && after.value === "a"
    result.textContent = `${ok ? "PASS" : "FAIL"} ${framework} ${JSON.stringify({ before, after })}`
  } catch (error) {
    result.textContent = `FAIL ${framework} ${error}`
  }
}

/** Resolve with `test()`'s first truthy value, polling;  reject after 8 s. */
function until(test) {
  return new Promise((resolve, reject) => {
    const start = performance.now()
    const poll = () => {
      const value = test()
      if (value) resolve(value)
      else if (performance.now() - start > 8000) reject(new Error(`timed out waiting for ${test}`))
      else setTimeout(poll, 20)
    }
    poll()
  })
}

/** The options every page passes as a PROPERTY. */
export const OPTIONS = [
  { value: "a", text: "Apple" },
  { value: "b", text: "Banana" },
  { value: "c", text: "Cherry" }
]
