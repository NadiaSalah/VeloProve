export function health() {
  return { ok: true };
}

export function greet(name) {
  if (!name || !String(name).trim()) {
    return { ok: false, error: 'name required' };
  }
  return { ok: true, message: `Hello, ${name}` };
}
