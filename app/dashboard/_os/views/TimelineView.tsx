"use client";

import { useMemo, useRef, useState } from "react";

import { daysBetween, shortDate } from "@/lib/os/format";
import { CATEGORY } from "@/lib/os/visual";
import type { Category, Entity } from "@/lib/os/types";
import { useOS } from "../OSProvider";

const START_OFFSET = -10;
const END_OFFSET = 42;
const PX_PER_DAY = 34;
const ITEM_PX = 190; // reserved width per item chip, for collision layout
const ROW_PX = 30;

interface Item {
  id: string;
  name: string;
  category: Category;
  date: string;
  offset: number;
  lane: number;
  row: number;
}

const LANES = [
  "Deadlines & milestones",
  "Meetings & inspections",
  "Tasks",
  "Document activity",
  "Agent activity",
];

export function TimelineView() {
  const os = useOS();
  const now = os.dataset.now;
  const trackRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(0);
  const [dragging, setDragging] = useState(false);

  const { items, laneRows } = useMemo(() => {
    const raw: Omit<Item, "row">[] = [];
    const push = (e: Entity, date: string | undefined, lane: number) => {
      if (!date) return;
      const offset = daysBetween(now, date);
      if (offset < START_OFFSET || offset > END_OFFSET) return;
      raw.push({ id: e.id, name: e.name, category: e.category, date, offset, lane });
    };
    for (const e of Object.values(os.dataset.entities)) {
      if (e.category === "event") {
        push(e, e.start, e.kind === "meeting" || e.kind === "inspection" ? 1 : 0);
      } else if (e.category === "task") {
        push(e, e.due, 2);
      } else if (e.category === "document") {
        push(e, e.updatedAt, 3);
      } else if (e.category === "execution") {
        push(e, e.startedAt, 4);
      } else if (e.category === "project" && e.nextDeadline) {
        push(e, e.nextDeadline, 0);
      }
    }
    raw.sort((a, b) => a.offset - b.offset);

    // Greedy collision layout: stack overlapping chips into sub-rows per lane.
    const rowEnds: number[][] = LANES.map(() => []);
    const placed: Item[] = raw.map((it) => {
      const startX = (it.offset - START_OFFSET) * PX_PER_DAY;
      const ends = rowEnds[it.lane];
      let row = ends.findIndex((end) => startX >= end);
      if (row === -1) {
        row = ends.length;
        ends.push(0);
      }
      ends[row] = startX + ITEM_PX;
      return { ...it, row };
    });
    const laneRowCounts = rowEnds.map((r) => Math.max(1, r.length));
    return { items: placed, laneRows: laneRowCounts };
  }, [os.dataset, now]);

  const totalDays = END_OFFSET - START_OFFSET;
  const width = totalDays * PX_PER_DAY;
  const xForOffset = (o: number) => (o - START_OFFSET) * PX_PER_DAY;
  const laneOffsets = laneRows.reduce<number[]>((acc, _, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + Math.max(1, laneRows[i - 1]) * ROW_PX + 26);
    return acc;
  }, []);
  const innerHeight =
    laneOffsets[laneOffsets.length - 1] +
    Math.max(1, laneRows[laneRows.length - 1]) * ROW_PX +
    40;

  const setCursorFromClient = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left + (trackRef.current?.scrollLeft ?? 0);
    const off = x / PX_PER_DAY + START_OFFSET;
    setCursor(Math.max(START_OFFSET, Math.min(END_OFFSET, off)));
  };

  const cursorDate = new Date(now);
  cursorDate.setDate(cursorDate.getDate() + Math.round(cursor));

  const dayTicks = [];
  for (let d = START_OFFSET; d <= END_OFFSET; d += 2) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + d);
    dayTicks.push({ d, label: shortDate(dt.toISOString()) });
  }

  return (
    <div className="og-view og-timeline-view">
      <div className="og-view-head">
        <h1>Timeline</h1>
        <p>
          Scrub through time — deadlines, meetings, task due dates, document
          revisions and agent runs across every project.
        </p>
      </div>

      <div className="og-tl-readout">
        <span className="mono">Cursor</span>
        <b>{shortDate(cursorDate.toISOString())}</b>
        <span>
          {Math.round(cursor) === 0
            ? "today"
            : Math.round(cursor) > 0
              ? `+${Math.round(cursor)}d`
              : `${Math.round(cursor)}d`}
        </span>
      </div>

      <div
        className="og-tl-track"
        ref={trackRef}
        onPointerDown={(e) => {
          setDragging(true);
          setCursorFromClient(e.clientX);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => dragging && setCursorFromClient(e.clientX)}
        onPointerUp={() => setDragging(false)}
      >
        <div className="og-tl-inner" style={{ width, height: innerHeight }}>
          <div className="og-tl-ticks">
            {dayTicks.map((t) => (
              <span
                key={t.d}
                className="og-tl-tick"
                style={{ left: xForOffset(t.d) }}
                data-now={t.d === 0}
              >
                {t.label}
              </span>
            ))}
          </div>

          <div
            className="og-tl-now"
            style={{ left: xForOffset(0), bottom: 0, top: 24 }}
            aria-hidden="true"
          />
          <div
            className="og-tl-cursor"
            style={{ left: xForOffset(cursor), bottom: 0, top: 24 }}
            aria-hidden="true"
          />

          {LANES.map((laneName, laneIndex) => (
            <div
              className="og-tl-lane"
              key={laneName}
              style={{
                top: 30 + laneOffsets[laneIndex],
                height: Math.max(1, laneRows[laneIndex]) * ROW_PX,
              }}
            >
              <span className="og-tl-lane-label">{laneName}</span>
              {items
                .filter((it) => it.lane === laneIndex)
                .map((it) => {
                  const near = Math.abs(it.offset - cursor) <= 1.2;
                  const past = it.offset < cursor - 0.1;
                  const att = os.attention.get(it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className="og-tl-item"
                      style={{
                        left: xForOffset(it.offset),
                        top: it.row * ROW_PX + 14,
                        borderColor: CATEGORY[it.category].color,
                        opacity: past ? 0.5 : 1,
                      }}
                      data-near={near}
                      data-attention={att ? "true" : "false"}
                      onClick={(e) => {
                        e.stopPropagation();
                        os.select(it.id);
                        os.toggleInspector(true);
                      }}
                      title={`${it.name} — ${shortDate(it.date)}`}
                    >
                      <span
                        className="og-tl-item-dot"
                        style={{ background: CATEGORY[it.category].color }}
                      />
                      <span className="og-tl-item-name">{it.name}</span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
