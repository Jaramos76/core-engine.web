"use client";

import { motion } from "framer-motion";

// A small, restrained failure notice. No shake, no shout — a red hairline,
// a short message, gone again on the next attempt.

export default function AccessDenied({ message }: { message: string }) {
  return (
    <motion.div
      className="login-denied"
      role="alert"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <span className="login-denied-dot" aria-hidden="true" />
      {message}
    </motion.div>
  );
}
