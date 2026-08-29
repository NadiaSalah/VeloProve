export function authenticateUser(token?: string): { success: boolean; error?: string } {
  if (!token) {
    return { success: false, error: 'Missing token' };
  }
  return { success: true };
}
