"use client";

import { useId, useState, type FormEvent } from "react";

import type { Credentials } from "../_auth/types";
import type { CubePhase } from "../_cube/RubiksCube";

interface LoginFormProps {
  phase: CubePhase;
  onSubmit: (credentials: Credentials) => void;
}

const BUTTON_LABEL: Record<CubePhase, string> = {
  idle: "Enter Core Engine",
  authenticating: "Verifying",
  solving: "Decrypting",
  success: "Access granted",
  error: "Enter Core Engine",
};

export default function LoginForm({ phase, onSubmit }: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const idField = useId();
  const pwField = useId();

  const busy = phase === "authenticating" || phase === "solving";
  const locked = busy || phase === "success";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locked) return;
    onSubmit({ identifier: identifier.trim(), password });
  };

  return (
    <form
      className="login-panel"
      onSubmit={handleSubmit}
      aria-busy={busy}
      noValidate
    >
      <div className="login-field">
        <label htmlFor={idField}>Username or email</label>
        <input
          id={idField}
          type="text"
          inputMode="email"
          autoComplete="username"
          spellCheck={false}
          value={identifier}
          disabled={locked}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="operator@coreengine.online"
        />
      </div>

      <div className="login-field">
        <label htmlFor={pwField}>Password</label>
        <input
          id={pwField}
          type="password"
          autoComplete="current-password"
          value={password}
          disabled={locked}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
        />
      </div>

      <button
        type="submit"
        className="login-submit"
        data-phase={phase}
        disabled={locked}
      >
        <span>{BUTTON_LABEL[phase]}</span>
        {busy && <span className="login-submit-spark" aria-hidden="true" />}
      </button>

      <p className="login-hint">
        {process.env.NODE_ENV === "production" ? (
          "Restricted access · temporary credentials"
        ) : (
          <>
            Demo access — any identifier, password <code>coreengine</code>
          </>
        )}
      </p>
    </form>
  );
}
