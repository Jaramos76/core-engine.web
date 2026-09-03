// Authentication contract for the Core Engine front page.
//
// This module defines the shapes that flow between the login UI and whatever
// backend eventually verifies credentials. Keeping it isolated means the real
// implementation can be swapped in without touching the cube animation or the
// login form — see `authService.ts` for the single seam that talks to the API.

export interface Credentials {
  /** Username or email as typed by the operator. */
  identifier: string;
  password: string;
}

export interface AuthenticatedUser {
  name: string;
  email: string;
}

export type AuthResult =
  | { ok: true; token: string; user: AuthenticatedUser }
  | { ok: false; error: string };
