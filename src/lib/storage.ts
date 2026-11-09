// Device-local storage (ADR 0004). Wraps localStorage, which throws when storage is blocked
// (some private modes, disabled site data) or full. Every value is also kept in memory, so the
// site works the same for the rest of the visit, just without persistence.

/** Bump when a stored shape changes incompatibly; old keys are then simply ignored. */
export const SCHEMA_VERSION = 1;
const PREFIX = `tafalado:v${SCHEMA_VERSION}:`;

/** The localStorage key for `name`, for an inline script that must read it before first paint. */
export const storageKey = (name: string): string => PREFIX + name;

const memory = new Map<string, string>();

function local(): globalThis.Storage | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

/** The stored value, or undefined when missing, unreadable or rejected by `isValid`. */
export function read<T>(name: string, isValid: (value: unknown) => value is T): T | undefined {
  const key = storageKey(name);
  // Memory first: it holds this visit's latest writes even when localStorage refused them.
  let raw = memory.get(key);
  if (raw === undefined) {
    try {
      raw = local()?.getItem(key) ?? undefined;
    } catch {
      raw = undefined;
    }
  }
  if (raw === undefined) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function write(name: string, value: unknown): void {
  const key = storageKey(name);
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    local()?.setItem(key, raw);
  } catch {
    // Blocked or full: memory still has it.
  }
}
