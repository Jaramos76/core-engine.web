import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://coreengine.online";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Core Engine — AI Execution Engine",
  description:
    "A provider-neutral execution foundation for tools, memory, agents, skills, diagnostics, and intelligent systems.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Core Engine — AI Execution Engine",
    description:
      "A provider-neutral execution foundation for tools, memory, agents, skills, diagnostics, and intelligent systems.",
    url: siteUrl,
    siteName: "Core Engine",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Core Engine — AI Execution Engine",
    description:
      "A provider-neutral execution foundation for tools, memory, agents, skills, diagnostics, and intelligent systems.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0b0d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
