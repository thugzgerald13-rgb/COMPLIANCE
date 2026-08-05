export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Unknown error';
}

export function logError(scope: string, error: unknown): string {
  const message = toErrorMessage(error);
  console.error(`[${scope}] ${message}`, error);
  return message;
}

export function safeJsonParse<T>(raw: string, scope: string): { value: T } | { error: string } {
  try {
    return { value: JSON.parse(raw) as T };
  } catch (error) {
    return { error: logError(scope, error) };
  }
}

export function writeLocalStorage(key: string, value: string, scope: string): string | null {
  try {
    localStorage.setItem(key, value);
    return null;
  } catch (error) {
    return logError(scope, error);
  }
}
