// The single seam between the login experience and the authentication backend.
//
// Today this posts to a local mock route handler (`/api/auth`). To connect the
// real Core Engine identity service later, change only the body of
// `authenticate()` — the UI and the Rubik's Cube state machine consume the
// `AuthResult` union and never see transport details.

import type { AuthResult, Credentials } from "./types";

/**
 * Minimum time the "authenticating" phase is shown, even if the backend answers
 * instantly. The decoding beat is part of the identity of this screen, so we
 * never want it to flash by.
 */
export const MIN_AUTH_MS = 650;

export async function authenticate(
  credentials: Credentials,
): Promise<AuthResult> {
  const startedAt = Date.now();

  let result: AuthResult;
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | AuthResult
      | null;

    if (payload && typeof payload.ok === "boolean") {
      result = payload;
    } else if (response.ok) {
      result = { ok: false, error: "Unexpected response from identity service" };
    } else {
      result = { ok: false, error: "Access denied" };
    }
  } catch {
    result = { ok: false, error: "Identity service unreachable" };
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_AUTH_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_AUTH_MS - elapsed));
  }

  return result;
}

export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth", { method: "DELETE", cache: "no-store" });
  } catch {
    // Best effort — the session cookie expires on its own.
  }
}
