import type { Metadata } from "next";

import LoginExperience from "./_components/LoginExperience";
import "./login.css";

export const metadata: Metadata = {
  title: "Sign in · Core Engine",
  description: "Access the Core Engine execution layer.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginExperience />;
}
