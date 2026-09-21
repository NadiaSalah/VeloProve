/** AUTH BUG: accepts empty password. */
export function login(username, password) {
  if (!username) {
    return { ok: false, status: 401, error: 'username required' };
  }
  // BUG: empty password accepted
  return { ok: true, status: 200, user: username };
}
