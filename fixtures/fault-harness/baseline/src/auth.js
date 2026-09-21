/** Clean baseline — empty password rejected; profiles scoped by role. */
export function login(username, password) {
  if (!username || !password || String(password).length === 0) {
    return { ok: false, status: 401, error: 'password required' };
  }
  return { ok: true, status: 200, user: username, role: 'user' };
}

export function getProfile(role) {
  if (role === 'admin') {
    return { role: 'admin', secret: true };
  }
  return { role: 'user', secret: false };
}
