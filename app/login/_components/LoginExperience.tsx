"use client";

// Front-page orchestrator. Owns the authentication phase machine and wires it
// to three independent pieces: the auth service, the Rubik's Cube scene, and
// the login UI. Nothing here knows how the cube animates or how credentials
// are transported.
//
//   idle → (submit) → authenticating → success path: solving → success → /dashboard
//                                    → failure path: error → idle

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { authenticate } from "../_auth/authService";
import type { Credentials } from "../_auth/types";
import type { CubePhase } from "../_cube/RubiksCube";
import CoreEngineMark from "./CoreEngineMark";
import LoginForm from "./LoginForm";
import AccessDenied from "./AccessDenied";

const CubeStage = dynamic(() => import("../_cube/CubeStage"), { ssr: false });

const GLOW_BY_PHASE: Record<
  CubePhase,
  { opacity: number; scale: number; background: string }
> = {
  idle: { opacity: 0.22, scale: 1, background: "var(--login-glow-teal)" },
  authenticating: {
    opacity: 0.34,
    scale: 1.05,
    background: "var(--login-glow-teal)",
  },
  solving: { opacity: 0.4, scale: 1.08, background: "var(--login-glow-teal)" },
  success: {
    opacity: 0.78,
    scale: 1.35,
    background: "var(--login-glow-bright)",
  },
  error: { opacity: 0.4, scale: 1.04, background: "var(--login-glow-red)" },
};

export default function LoginExperience() {
  const router = useRouter();
  const prefersReduced = useReducedMotion() ?? false;

  const [phase, setPhase] = useState<CubePhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const handleSubmit = useCallback(async (credentials: Credentials) => {
    if (phaseRef.current !== "idle" && phaseRef.current !== "error") return;

    setErrorMessage(null);
    setPhase("authenticating");

    const result = await authenticate(credentials);

    if (result.ok) {
      setPhase("solving");
    } else {
      setErrorMessage(result.error);
      setPhase("error");
    }
  }, []);

  // Cube finished solving → light it up, hold, then leave for the dashboard.
  const handleSolved = useCallback(() => {
    setPhase("success");
  }, []);

  const handleErrorComplete = useCallback(() => {
    // Cube has settled from its wrong-way twitch; return to idle so the
    // operator can try again. The message fades out with the phase change.
    window.setTimeout(() => {
      setPhase((current) => (current === "error" ? "idle" : current));
    }, 700);
  }, []);

  useEffect(() => {
    if (phase !== "success") return;
    const hold = prefersReduced ? 250 : 1050;
    const t = window.setTimeout(() => setLeaving(true), hold);
    return () => window.clearTimeout(t);
  }, [phase, prefersReduced]);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(
      () => router.push("/dashboard"),
      prefersReduced ? 120 : 780,
    );
    return () => window.clearTimeout(t);
  }, [leaving, prefersReduced, router]);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  return (
    <div className="login-root" data-phase={phase}>
      <div className="login-cube">
        <CubeStage
          phase={phase}
          onSolved={handleSolved}
          onErrorComplete={handleErrorComplete}
          reducedMotion={prefersReduced}
        />
      </div>

      <div className="login-glow-wrap" aria-hidden="true">
        <motion.div
          className="login-glow"
          animate={GLOW_BY_PHASE[phase]}
          transition={{
            duration: phase === "success" ? 0.9 : 0.5,
            ease: "easeOut",
          }}
        />
      </div>

      <div className="login-content">
        <CoreEngineMark />

        <div className="login-stack">
          <LoginForm phase={phase} onSubmit={handleSubmit} />
          <div className="login-message" aria-live="polite">
            <AnimatePresence mode="wait">
              {phase === "error" && errorMessage && (
                <AccessDenied key={errorMessage} message={errorMessage} />
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="login-foot mono">Core Engine · Execution Layer</p>
      </div>

      <AnimatePresence>
        {leaving && (
          <motion.div
            className="login-exit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: prefersReduced ? 0.1 : 0.7, ease: "easeIn" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
