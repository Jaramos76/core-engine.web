import type { Metadata } from "next";
import Link from "next/link";

import { WorkShell } from "../../_work/WorkShell";
import "../../_work/work.css";
import { NewProjectForm } from "./NewProjectForm";

export const metadata: Metadata = {
  title: "New project · Core Engine",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  return (
    <WorkShell active="projects">
      <div className="wk-detail-head">
        <Link href="/dashboard/projects" className="wk-back">
          ← All projects
        </Link>
        <h1 className="wk-h1" style={{ marginTop: 10 }}>
          New project
        </h1>
        <p className="wk-sub">
          Created directly in Core Engine — no Obsidian note, no folder, no import.
          A next action becomes a real task, and the creation is recorded in the
          activity feed as a native Core Engine event.
        </p>
      </div>
      <NewProjectForm />
    </WorkShell>
  );
}
