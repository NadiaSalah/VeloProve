/** APPLICATION_BUG disposable: inverted add. */
export function add(a, b) {
  return a - b; // BUG: should add
}
