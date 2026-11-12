/**
 * Run-history scope. Sign-in is the host portal's job (see ../host/bridge.ts); this file no longer stores tokens.
 *
 * Session id: random UUID created once per browser tab session, sent as `X-Session-Id` on every call.
 *   ASSUMPTION: backend scopes run history ("session db") to this id.
 * Browser storage failures are swallowed so private windows still work.
 */

const SESSION_KEY = 'gama.session_id';

const memory: Record<string, string> = {};

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key) ?? memory[key] ?? null;
  } catch {
    return memory[key] ?? null;
  }
}
function write(key: string, value: string) {
  memory[key] = value;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getSessionId(): string {
  let id = read(SESSION_KEY);
  if (!id) {
    id = uuid();
    write(SESSION_KEY, id);
  }
  return id;
}
