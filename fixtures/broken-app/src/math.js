/** Intentional application bug for diagnose / verify failure-path fixtures. */
export function add(a, b) {
  return a - b; // BUG: should add
}

export function health() {
  return { ok: true };
}
