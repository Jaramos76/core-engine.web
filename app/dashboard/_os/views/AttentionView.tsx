"use client";

import { AttentionList } from "../attention/AttentionList";

export function AttentionView() {
  return (
    <div className="og-view og-attn-view">
      <div className="og-view-head">
        <h1>Attention</h1>
        <p>
          What Core Engine has calculated needs you — weighted by deadline,
          dependency and risk. Not every notification; the ones that matter.
        </p>
      </div>
      <AttentionList />
    </div>
  );
}
