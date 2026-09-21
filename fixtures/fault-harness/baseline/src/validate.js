/** Clean baseline — email must contain @. */
export function isValidEmail(email) {
  return typeof email === 'string' && email.includes('@') && email.includes('.');
}

export function acceptContact(payload) {
  if (!isValidEmail(payload?.email)) {
    return { ok: false, status: 400, error: 'invalid email' };
  }
  return { ok: true, status: 200 };
}
