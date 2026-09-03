"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const DISCIPLINES = [
  "Architectural",
  "Structural",
  "Mechanical",
  "Electrical",
  "Plumbing",
  "Civil",
  "Fire Protection",
  "Landscape",
];

const PRIORITIES = ["low", "normal", "high", "critical"];
const HEALTHS = ["green", "yellow", "red"];
const STATUSES = ["active", "on-hold", "permitting", "construction", "closeout"];

type FieldErr = { field?: string; message: string } | null;

export function NewProjectForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<FieldErr>(null);
  const submittedRef = useRef(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittedRef.current || pending) return; // guard against double-submit
    submittedRef.current = true;
    setPending(true);
    setErr(null);

    const fd = new FormData(e.currentTarget);
    const get = (k: string) => {
      const v = fd.get(k);
      return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
    };
    const payload = {
      number: get("number"),
      name: get("name"),
      status: get("status"),
      addressLine: get("addressLine"),
      city: get("city"),
      state: get("state"),
      zip: get("zip"),
      projectType: get("projectType"),
      scopeOfWork: get("scopeOfWork"),
      currentPhase: get("currentPhase"),
      priority: get("priority"),
      client: get("client"),
      architect: get("architect"),
      projectManager: get("projectManager"),
      disciplines: fd.getAll("disciplines").filter((d): d is string => typeof d === "string"),
      ahj: get("ahj"),
      permitNumber: get("permitNumber"),
      permitStatus: get("permitStatus"),
      startDate: get("startDate"),
      targetDate: get("targetDate"),
      nextAction: get("nextAction"),
      nextActionDue: get("nextActionDue"),
      health: get("health"),
    };

    try {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        // straight to the new project's detail page
        router.push(`/dashboard/projects/${encodeURIComponent(data.number)}`);
        return;
      }
      setErr({ field: data.field, message: data.error ?? "Could not create the project." });
    } catch {
      setErr({ message: "Network error — the project was not created." });
    } finally {
      submittedRef.current = false;
      setPending(false);
    }
  }

  return (
    <form className="wk-form" onSubmit={onSubmit} noValidate>
      {err && (
        <p className="wk-form-error" role="alert">
          {err.message}
        </p>
      )}

      <fieldset className="wk-form-section">
        <legend>Identity</legend>
        <div className="wk-form-grid">
          <label className="wk-fld">
            <span>
              Project number <b className="wk-req">required</b>
            </span>
            <input
              name="number"
              required
              autoComplete="off"
              autoFocus
              placeholder="26-24"
              aria-invalid={err?.field === "number" || undefined}
            />
          </label>
          <label className="wk-fld">
            <span>
              Project name <b className="wk-req">required</b>
            </span>
            <input
              name="name"
              required
              autoComplete="off"
              placeholder="Ramos Residence"
              aria-invalid={err?.field === "name" || undefined}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="wk-form-section">
        <legend>Location</legend>
        <div className="wk-form-grid">
          <label className="wk-fld wk-fld-wide">
            <span>Address</span>
            <input name="addressLine" autoComplete="off" placeholder="1450 SW 12th Ave" />
          </label>
          <label className="wk-fld">
            <span>City</span>
            <input name="city" autoComplete="off" />
          </label>
          <label className="wk-fld">
            <span>State</span>
            <input name="state" autoComplete="off" maxLength={2} placeholder="FL" />
          </label>
          <label className="wk-fld">
            <span>ZIP</span>
            <input name="zip" autoComplete="off" inputMode="numeric" placeholder="33130" />
          </label>
        </div>
      </fieldset>

      <fieldset className="wk-form-section">
        <legend>Classification</legend>
        <div className="wk-form-grid">
          <label className="wk-fld">
            <span>Project type</span>
            <input name="projectType" autoComplete="off" placeholder="Residential" />
          </label>
          <label className="wk-fld">
            <span>Current phase</span>
            <input name="currentPhase" autoComplete="off" placeholder="Schematic Design" />
          </label>
          <label className="wk-fld">
            <span>Priority</span>
            <select name="priority" defaultValue="">
              <option value="">—</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="wk-fld">
            <span>Health</span>
            <select name="health" defaultValue="">
              <option value="">—</option>
              {HEALTHS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="wk-fld">
            <span>Status</span>
            <select name="status" defaultValue="active">
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
          <label className="wk-fld wk-fld-wide">
            <span>Scope of work</span>
            <textarea name="scopeOfWork" rows={2} placeholder="Interior renovation and addition." />
          </label>
        </div>
      </fieldset>

      <fieldset className="wk-form-section">
        <legend>Disciplines</legend>
        <div className="wk-check-grid">
          {DISCIPLINES.map((d) => (
            <label key={d} className="wk-check">
              <input type="checkbox" name="disciplines" value={d} />
              {d}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="wk-form-section">
        <legend>People</legend>
        <div className="wk-form-grid">
          <label className="wk-fld">
            <span>Client</span>
            <input name="client" autoComplete="off" />
          </label>
          <label className="wk-fld">
            <span>Architect</span>
            <input name="architect" autoComplete="off" />
          </label>
          <label className="wk-fld">
            <span>Project manager</span>
            <input name="projectManager" autoComplete="off" />
          </label>
        </div>
      </fieldset>

      <fieldset className="wk-form-section">
        <legend>Regulatory</legend>
        <div className="wk-form-grid">
          <label className="wk-fld">
            <span>AHJ</span>
            <input name="ahj" autoComplete="off" placeholder="City of Miami" />
          </label>
          <label className="wk-fld">
            <span>Permit number</span>
            <input name="permitNumber" autoComplete="off" />
          </label>
          <label className="wk-fld">
            <span>Permit status</span>
            <input name="permitStatus" autoComplete="off" placeholder="not submitted" />
          </label>
        </div>
      </fieldset>

      <fieldset className="wk-form-section">
        <legend>Schedule</legend>
        <div className="wk-form-grid">
          <label className="wk-fld">
            <span>Start date</span>
            <input name="startDate" type="date" />
          </label>
          <label className="wk-fld">
            <span>Target date</span>
            <input name="targetDate" type="date" />
          </label>
          <label className="wk-fld wk-fld-wide">
            <span>Next action</span>
            <input
              name="nextAction"
              autoComplete="off"
              placeholder="Send consultant scope requests"
            />
          </label>
          <label className="wk-fld">
            <span>Next action due</span>
            <input name="nextActionDue" type="date" />
          </label>
        </div>
        <p className="wk-form-hint">
          A next action is created as an open task on the new project.
        </p>
      </fieldset>

      <div className="wk-form-actions">
        <button type="submit" className="wk-btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create project"}
        </button>
        <button
          type="button"
          className="wk-btn-ghost"
          onClick={() => router.push("/dashboard/projects")}
          disabled={pending}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
