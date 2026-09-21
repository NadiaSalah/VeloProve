/** VALIDATION BUG: accepts malformed email. */
export function isValidEmail() {
  return true;
}

export function acceptContact(payload) {
  return { ok: true, status: 200, email: payload?.email };
}
