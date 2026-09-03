"use client";

import { useMemo } from "react";

import { relatedByCategory } from "@/lib/os/graph";
import { rankedAttention } from "@/lib/os/attention";
import { dueLabel, relativeTime, shortDate, titleCase } from "@/lib/os/format";
import { CATEGORY, AGENT_STATE_META } from "@/lib/os/visual";
import type { Category, Entity } from "@/lib/os/types";
import { Glyph } from "./Glyph";
import { useOS } from "./OSProvider";

function Row({
  entities,
  title,
  emptyHint,
}: {
  entities: Entity[] | undefined;
  title: string;
  emptyHint?: string;
}) {
  const os = useOS();
  if (!entities || entities.length === 0) {
    return emptyHint ? (
      <div className="og-insp-group">
        <span className="og-insp-group-title">{title}</span>
        <p className="og-insp-empty">{emptyHint}</p>
      </div>
    ) : null;
  }
  return (
    <div className="og-insp-group">
      <span className="og-insp-group-title">
        {title} <b>{entities.length}</b>
      </span>
      <ul className="og-insp-list">
        {entities.map((e) => {
          const att = os.attention.get(e.id);
          return (
            <li key={e.id}>
              <button type="button" onClick={() => os.select(e.id)}>
                <Glyph shape={CATEGORY[e.category].shape} color={CATEGORY[e.category].color} size={11} />
                <span className="og-insp-list-name">{e.name}</span>
                {att && <span className="og-insp-flag" data-u={att.urgency} />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="og-insp-field">
      <span>{label}</span>
      <div>{value}</div>
    </div>
  );
}

export function ContextInspector() {
  const os = useOS();
  const { dataset, index, state } = os;
  const entity = state.selectedId ? dataset.entities[state.selectedId] : null;

  const related = useMemo(
    () =>
      state.selectedId
        ? relatedByCategory(index, dataset, state.selectedId)
        : ({} as Partial<Record<Category, Entity[]>>),
    [state.selectedId, index, dataset],
  );

  if (!os.state.inspectorOpen) return null;

  return (
    <aside className="og-inspector">
      <div className="og-inspector-scroll">
        {!entity ? (
          <OverviewPanel />
        ) : (
          <>
            <header className="og-insp-head">
              <span
                className="og-insp-cat"
                style={{ color: CATEGORY[entity.category].color }}
              >
                <Glyph shape={CATEGORY[entity.category].shape} color={CATEGORY[entity.category].color} size={13} />
                {CATEGORY[entity.category].label}
              </span>
              <h2 className="og-insp-name">{entity.name}</h2>
              {entity.summary && <p className="og-insp-summary">{entity.summary}</p>}
            </header>

            <EntityBody entity={entity} related={related} />

            <div className="og-insp-actions">
              {entity.category === "project" && (
                <button type="button" onClick={() => os.focusProject(entity.id)}>
                  Isolate network
                </button>
              )}
              <button
                type="button"
                onClick={() => os.runCommand(`everything related to ${entity.name}`)}
              >
                Expand relationships
              </button>
              {entity.category === "agent" && (
                <button
                  type="button"
                  onClick={() =>
                    os.runCommand(`ask ${entity.name} to investigate the active context`)
                  }
                >
                  Dispatch
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function OverviewPanel() {
  const os = useOS();
  const ctx = os.activeContext;
  const top = useMemo(
    () => rankedAttention(os.attention).slice(0, 6),
    [os.attention],
  );

  return (
    <div>
      <header className="og-insp-head">
        <span className="og-insp-cat">Context</span>
        <h2 className="og-insp-name">{ctx.label}</h2>
        <p className="og-insp-summary">
          {ctx.projectId
            ? "You are working inside this project. Agents inherit this context."
            : "Select a node, or ask Lola. Nothing is assumed until you focus a project."}
        </p>
      </header>

      <div className="og-insp-group">
        <span className="og-insp-group-title">Needs you first</span>
        <ul className="og-insp-attn">
          {top.map((a) => {
            const e = os.dataset.entities[a.entityId];
            if (!e) return null;
            return (
              <li key={a.entityId}>
                <button type="button" onClick={() => os.select(a.entityId)}>
                  <span className="og-insp-attn-bar" data-u={a.urgency}>
                    <span style={{ width: `${Math.round(a.score * 100)}%` }} />
                  </span>
                  <span className="og-insp-attn-name">{e.name}</span>
                  <span className="og-insp-attn-reason">{a.reasons[0]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function EntityBody({
  entity,
  related,
}: {
  entity: Entity;
  related: Partial<Record<Category, Entity[]>>;
}) {
  const os = useOS();
  const now = os.dataset.now;

  switch (entity.category) {
    case "project":
      return (
        <>
          <div className="og-insp-fields">
            <Field label="Status" value={titleCase(entity.status)} />
            <Field label="Phase" value={entity.phase} />
            <Field
              label="Health"
              value={<span data-health={entity.health}>{titleCase(entity.health)}</span>}
            />
            {entity.nextDeadline && (
              <Field label="Next deadline" value={dueLabel(entity.nextDeadline, now)} />
            )}
            {entity.client && <Field label="Client" value={entity.client} />}
            {entity.location && <Field label="Location" value={entity.location} />}
          </div>
          <Row title="Agents assigned" entities={related.agent} />
          <Row title="Open tasks" entities={related.task?.filter((t) => t.category === "task" && t.status !== "done")} />
          <Row title="Team" entities={related.person} />
          <Row title="Documents" entities={related.document} />
          <Row title="Communications" entities={related.communication} />
          <Row title="Schedule" entities={related.event} />
        </>
      );

    case "agent": {
      const meta = AGENT_STATE_META[entity.state];
      return (
        <>
          <div className="og-insp-fields">
            <Field label="Role" value={entity.role} />
            <Field
              label="State"
              value={
                <span className="og-agent-state" style={{ color: meta.color }}>
                  {meta.active && <span className="og-agent-pulse" style={{ background: meta.color }} />}
                  {meta.label}
                </span>
              }
            />
            {entity.activity && <Field label="Current activity" value={entity.activity} />}
          </div>
          <Row title="Assigned tasks" entities={related.task} />
          <Row title="Working on" entities={related.project} />
          <Row title="Tools" entities={related.tool} emptyHint="No tools bound" />
          <Row title="Knowledge sources" entities={related.knowledge} emptyHint="No sources bound" />
          <Row title="Recent executions" entities={related.execution} />
        </>
      );
    }

    case "task":
      return (
        <>
          <div className="og-insp-fields">
            <Field label="Status" value={titleCase(entity.status)} />
            <Field label="Priority" value={<span data-prio={entity.priority}>{titleCase(entity.priority)}</span>} />
            {entity.due && <Field label="Due" value={dueLabel(entity.due, now)} />}
            {entity.projectId && (
              <Field
                label="Project"
                value={
                  <button type="button" className="og-link" onClick={() => os.select(entity.projectId!)}>
                    {os.dataset.entities[entity.projectId]?.name}
                  </button>
                }
              />
            )}
          </div>
          <Row title="Depends on" entities={related.task} />
          <Row title="From" entities={related.communication} />
          <Row title="Owned by" entities={related.agent} />
          <Row title="Related documents" entities={related.document} />
        </>
      );

    case "communication":
      return (
        <>
          <div className="og-insp-fields">
            <Field label="From" value={entity.from} />
            <Field label="When" value={`${shortDate(entity.date)} · ${relativeTime(entity.date, now)}`} />
            <Field
              label="Status"
              value={
                entity.repliedAt
                  ? "Replied"
                  : entity.needsReply
                    ? "Awaiting your reply"
                    : "No reply needed"
              }
            />
          </div>
          <Row title="Generated tasks" entities={related.task} />
          <Row title="Project" entities={related.project} />
          <Row title="People" entities={related.person} />
        </>
      );

    case "document":
      return (
        <>
          <div className="og-insp-fields">
            <Field label="Type" value={titleCase(entity.docType)} />
            <Field label="Status" value={titleCase(entity.status)} />
            {entity.revision && <Field label="Revision" value={entity.revision} />}
            <Field label="Updated" value={relativeTime(entity.updatedAt, now)} />
          </div>
          <Row title="Project" entities={related.project} />
          <Row title="Related tasks" entities={related.task} />
          <Row title="References knowledge" entities={related.knowledge} />
          <Row title="Authors" entities={related.person} />
        </>
      );

    case "person":
      return (
        <>
          <div className="og-insp-fields">
            <Field label="Role" value={entity.role} />
            {entity.org && <Field label="Organization" value={entity.org} />}
            {entity.discipline && <Field label="Discipline" value={titleCase(entity.discipline)} />}
          </div>
          <Row title="On projects" entities={related.project} />
          <Row title="Communications" entities={related.communication} />
          <Row title="Meetings" entities={related.event} />
          <Row title="Documents" entities={related.document} />
        </>
      );

    case "event":
      return (
        <>
          <div className="og-insp-fields">
            <Field label="Kind" value={titleCase(entity.kind)} />
            <Field label="When" value={`${shortDate(entity.start)} · ${relativeTime(entity.start, now)}`} />
          </div>
          <Row title="Project" entities={related.project} />
          <Row title="Participants" entities={related.person} />
          <Row title="Related" entities={[...(related.task ?? []), ...(related.communication ?? [])]} />
        </>
      );

    case "knowledge":
      return (
        <>
          <div className="og-insp-fields">
            <Field label="Domain" value={titleCase(entity.domain)} />
          </div>
          <Row title="Used by agents" entities={related.agent} />
          <Row title="Referenced by" entities={related.document} />
          <Row title="Related knowledge" entities={related.knowledge} />
          <Row title="Ideas" entities={related.idea} />
        </>
      );

    case "idea":
      return (
        <>
          <div className="og-insp-fields">
            <Field label="Stage" value={titleCase(entity.stage)} />
          </div>
          <Row title="About" entities={[...(related.project ?? []), ...(related.tool ?? [])]} />
          <Row title="Research" entities={related.knowledge} />
          <Row title="Related tasks" entities={related.task} />
        </>
      );

    case "tool":
      return (
        <>
          <div className="og-insp-fields">
            <Field label="Kind" value={titleCase(entity.kind)} />
          </div>
          <Row title="Used by" entities={related.agent} />
          <Row title="Backed by service" entities={related.service} />
        </>
      );

    case "execution":
      return (
        <>
          <div className="og-insp-fields">
            <Field label="Outcome" value={titleCase(entity.outcome)} />
            <Field label="Started" value={relativeTime(entity.startedAt, now)} />
            {entity.finishedAt && <Field label="Finished" value={relativeTime(entity.finishedAt, now)} />}
          </div>
          <Row title="Agent" entities={related.agent} />
          <Row title="About" entities={[...(related.task ?? []), ...(related.project ?? []), ...(related.idea ?? [])]} />
        </>
      );

    case "service":
      return (
        <div className="og-insp-fields">
          <Field label="Status" value={titleCase(entity.status)} />
        </div>
      );

    default:
      return null;
  }
}
