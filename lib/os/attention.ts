// Attention Engine — derives what actually needs the operator, rather than
// echoing notifications. Produces a score (0..1), an urgency band, and the
// human reasons behind it. The graph and the Attention view both read this.

import { daysBetween } from "./format";
import type { AttentionItem, Dataset, Entity, Urgency } from "./types";

function urgencyFor(score: number): Urgency {
  if (score >= 0.75) return "now";
  if (score >= 0.45) return "soon";
  return "watch";
}

function scoreEntity(
  entity: Entity,
  dataset: Dataset,
  incoming: Map<string, string[]>,
): { score: number; reasons: string[] } {
  const now = dataset.now;
  const reasons: string[] = [];
  let score = 0;

  if (entity.category === "task" && entity.status !== "done") {
    if (entity.due) {
      const d = daysBetween(now, entity.due);
      if (d < 0) {
        score += 0.55;
        reasons.push(`Overdue by ${Math.abs(Math.round(d))} day(s)`);
      } else if (d <= 2) {
        score += 0.38;
        reasons.push("Due within 2 days");
      } else if (d <= 5) {
        score += 0.2;
        reasons.push("Deadline approaching");
      }
    }
    if (entity.status === "blocked") {
      score += 0.28;
      reasons.push("Task is blocked");
    }
    if (entity.priority === "critical") {
      score += 0.22;
      reasons.push("Critical priority");
    } else if (entity.priority === "high") {
      score += 0.12;
    }
    if (entity.status === "review") {
      score += 0.1;
      reasons.push("Waiting for review");
    }
  }

  if (entity.category === "communication") {
    if (entity.needsReply && !entity.repliedAt) {
      const d = daysBetween(entity.date, now);
      score += 0.3 + Math.min(0.25, d * 0.05);
      reasons.push(
        d >= 1 ? `Unanswered for ${Math.round(d)} day(s)` : "Awaiting your reply",
      );
    }
  }

  if (entity.category === "event") {
    const d = daysBetween(now, entity.start);
    if (d >= 0 && d <= 2) {
      score += entity.kind === "deadline" ? 0.4 : 0.24;
      reasons.push(
        entity.kind === "deadline" ? "Deadline in ≤ 2 days" : "Happening soon",
      );
    } else if (d >= 0 && d <= 5 && entity.kind === "deadline") {
      score += 0.22;
      reasons.push("Deadline this week");
    }
  }

  if (entity.category === "agent") {
    if (entity.state === "blocked") {
      score += 0.5;
      reasons.push(entity.activity ?? "Agent is blocked");
    } else if (entity.state === "attention") {
      score += 0.42;
      reasons.push(entity.activity ?? "Agent needs a decision");
    } else if (entity.state === "waiting") {
      score += 0.14;
      reasons.push("Agent is waiting on a dependency");
    }
  }

  if (entity.category === "document") {
    if (entity.status === "in-review") {
      score += 0.16;
      reasons.push("Document in review");
    }
  }

  if (entity.category === "project") {
    if (entity.health === "blocked") {
      score += 0.4;
      reasons.push("Project is blocked");
    } else if (entity.health === "at-risk") {
      score += 0.22;
      reasons.push("Project at risk");
    }
    if (entity.nextDeadline) {
      const d = daysBetween(now, entity.nextDeadline);
      if (d < 0) {
        score += 0.3;
        reasons.push("Deadline passed");
      } else if (d <= 5) {
        score += 0.18;
        reasons.push("Deadline within a week");
      }
    }
    // Roll up urgent children so a project glows when its work does.
    const kids = incoming.get(entity.id) ?? [];
    let hot = 0;
    for (const kid of kids) {
      const k = dataset.entities[kid];
      if (!k) continue;
      if (k.category === "task" && k.status === "blocked") hot += 1;
      if (k.category === "communication" && k.needsReply && !k.repliedAt) hot += 1;
    }
    if (hot > 0) {
      score += Math.min(0.24, hot * 0.08);
      reasons.push(`${hot} item(s) here need action`);
    }
  }

  return { score: Math.min(1, score), reasons };
}

export function computeAttention(dataset: Dataset): Map<string, AttentionItem> {
  // owner -> [child ids], via "owns" relationships
  const incoming = new Map<string, string[]>();
  for (const r of dataset.relationships) {
    if (r.type === "owns") {
      const arr = incoming.get(r.source) ?? [];
      arr.push(r.target);
      incoming.set(r.source, arr);
    }
  }

  const out = new Map<string, AttentionItem>();
  for (const entity of Object.values(dataset.entities)) {
    const { score, reasons } = scoreEntity(entity, dataset, incoming);
    if (score <= 0.05 || reasons.length === 0) continue;
    out.set(entity.id, {
      entityId: entity.id,
      score,
      urgency: urgencyFor(score),
      reasons,
    });
  }
  return out;
}

export function rankedAttention(
  map: Map<string, AttentionItem>,
): AttentionItem[] {
  return [...map.values()].sort((a, b) => b.score - a.score);
}
