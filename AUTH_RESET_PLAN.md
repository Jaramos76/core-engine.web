# Core Engine Web Authentication Upgrade

Status: implementation branch preparation

Goals:
- Replace the temporary shared `CE_DEMO_PASSWORD` flow with a real administrator identity.
- Associate the admin account with an email address.
- Add a "Forgot password?" flow.
- Generate one-time reset tokens with expiry, storing only a hash server-side.
- Return the same reset-request response whether or not an email exists.
- Invalidate tokens after use.
- Never log passwords or reset tokens.
- Keep the current login UI and Rubik's Cube experience compatible while the auth backend changes.
- Preserve a safe migration path from the existing deployment.

Deployment will remain separate from code changes so production is not modified until the branch is reviewed and built successfully.
