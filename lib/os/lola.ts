// Lola's spoken responses. Deterministic summaries built from the dataset so
// the orchestrator always answers with real numbers from the active context.

import { rankedAttention } from "./attention";
import { dueLabel } from "./format";
import type {
  AttentionItem,
  CommandResult,
  Dataset,
  Entity,
} from "./types";

function nameOf(dataset: Dataset, id: string): string {
  return dataset.entities[id]?.name ?? id;
}

export function respondToCommand(
  result: CommandResult,
  dataset: Dataset,
  attention: Map<string, AttentionItem>,
): string {
  switch (result.kind) {
    case "focus-project": {
      const p = dataset.entities[result.projectId];
      if (!p || p.category !== "project") return result.note;
      const owned = dataset.relationships
        .filter((r) => r.type === "owns" && r.source === p.id)
        .map((r) => dataset.entities[r.target])
        .filter(Boolean) as Entity[];
      const tasks = owned.filter((e) => e.category === "task");
      const openTasks = tasks.filter(
        (e) => e.category === "task" && e.status !== "done",
      );
      const blocked = tasks.filter(
        (e) => e.category === "task" && e.status === "blocked",
      );
      const unreplied = owned.filter(
        (e) =>
          e.category === "communication" && e.needsReply && !e.repliedAt,
      );
      const parts = [
        `${p.name} — ${p.phase.toLowerCase()}, ${p.health.replace("-", " ")}.`,
        `${openTasks.length} open task(s)` +
          (blocked.length ? `, ${blocked.length} blocked` : "") +
          `, ${unreplied.length} message(s) awaiting your reply.`,
      ];
      if (p.nextDeadline) {
        parts.push(`Next deadline ${dueLabel(p.nextDeadline, dataset.now)}.`);
      }
      if (blocked.length) {
        parts.push(`The blocker: ${blocked[0].name}.`);
      }
      return parts.join(" ");
    }

    case "attention-today": {
      const ranked = rankedAttention(attention).slice(0, 4);
      if (!ranked.length) return "Nothing is on fire. You're clear.";
      const lines = ranked.map(
        (a) => `• ${nameOf(dataset, a.entityId)} — ${a.reasons[0]}`,
      );
      return `${ranked.length} things want you first:\n${lines.join("\n")}`;
    }

    case "ask-agent": {
      const agent = dataset.entities[result.agentId];
      const label = agent?.name ?? "the agent";
      return `${label} is on it — "${result.prompt}". I'll surface the findings in this project's context.`;
    }

    case "select": {
      const e = dataset.entities[result.entityId];
      return e ? `${e.name}. ${e.summary ?? result.note}` : result.note;
    }

    case "filter":
      return result.note;
    case "set-view":
      return result.note;
    case "search":
      return result.note;
    case "clear":
      return "Back to the whole network.";
    case "reply":
    default:
      return result.note;
  }
}
