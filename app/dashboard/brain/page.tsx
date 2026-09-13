import type { Metadata } from "next";
import BrainClient from "./BrainClient";

export const metadata: Metadata = {
  title: "3D Brain · Core Engine",
  robots: { index: false, follow: false },
};

export default function BrainPage() {
  return <BrainClient />;
}
