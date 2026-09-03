"use client";

// Single source of UI state for the Agentic OS. Holds the (currently mock)
// dataset, the derived graph / attention model, and all workspace state:
// selection, focus, lens, search, views, Lola's transcript.
//
// Data concerns (dataset, graph, attention) are separated from UI state so the
// dataset can later come from a Core Engine API without touching components.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

import { computeAttention } from "@/lib/os/attention";
import { interpretCommand } from "@/lib/os/commands";
import { deriveActiveContext } from "@/lib/os/context";
import { buildGraph, indexGraph, subgraphIds } from "@/lib/os/graph";
import { respondToCommand } from "@/lib/os/lola";
import { buildMockDataset } from "@/lib/os/mock/dataset";
import { NAV_LENSES } from "@/lib/os/visual";
import type {
  ActiveContext,
  AttentionItem,
  Category,
  CommandResult,
  Dataset,
  GraphData,
  OSView,
} from "@/lib/os/types";

interface LogEntry {
  id: number;
  role: "user" | "lola";
  text: string;
}

interface OSState {
  view: OSView;
  selectedId: string | null;
  hoveredId: string | null;
  focusProjectId: string | null;
  lens: string;
  filterCategories: Category[] | null;
  search: string;
  paletteOpen: boolean;
  attentionPanelOpen: boolean;
  attentionEmphasis: boolean;
  inspectorOpen: boolean;
  lolaLog: LogEntry[];
  lastNote: string | null;
}

type Action =
  | { type: "set-view"; view: OSView }
  | { type: "select"; id: string | null }
  | { type: "hover"; id: string | null }
  | { type: "focus-project"; id: string | null }
  | { type: "set-lens"; lens: string }
  | { type: "set-filter"; categories: Category[] | null }
  | { type: "set-search"; value: string }
  | { type: "toggle-palette"; open?: boolean }
  | { type: "toggle-attention"; open?: boolean }
  | { type: "toggle-inspector"; open?: boolean }
  | { type: "push-log"; entry: Omit<LogEntry, "id"> }
  | { type: "apply-command"; result: CommandResult }
  | { type: "clear" };

let logSeq = 0;

const initialState: OSState = {
  view: "graph",
  selectedId: null,
  hoveredId: null,
  focusProjectId: null,
  lens: "home",
  filterCategories: null,
  search: "",
  paletteOpen: false,
  attentionPanelOpen: false,
  attentionEmphasis: false,
  inspectorOpen: true,
  lolaLog: [
    {
      id: (logSeq += 1),
      role: "lola",
      text: "Core Engine is online. Ask me for a project, or say what needs you today.",
    },
  ],
  lastNote: null,
};

function reducer(state: OSState, action: Action): OSState {
  switch (action.type) {
    case "set-view":
      return { ...state, view: action.view };
    case "select":
      return {
        ...state,
        selectedId: action.id,
        inspectorOpen: action.id ? true : state.inspectorOpen,
      };
    case "hover":
      return { ...state, hoveredId: action.id };
    case "focus-project":
      return {
        ...state,
        focusProjectId: action.id,
        selectedId: action.id ?? state.selectedId,
        filterCategories: null,
        lens: "home",
        attentionEmphasis: false,
      };
    case "set-lens": {
      const lens = NAV_LENSES.find((l) => l.id === action.lens);
      return {
        ...state,
        lens: action.lens,
        filterCategories: lens?.categories ?? null,
        focusProjectId: action.lens === "home" ? null : state.focusProjectId,
        attentionEmphasis: false,
        view: action.lens === "system" ? "agents" : action.lens === "schedule" ? "timeline" : "graph",
      };
    }
    case "set-filter":
      return { ...state, filterCategories: action.categories, focusProjectId: null };
    case "set-search":
      return { ...state, search: action.value };
    case "toggle-palette":
      return { ...state, paletteOpen: action.open ?? !state.paletteOpen };
    case "toggle-attention":
      return {
        ...state,
        attentionPanelOpen: action.open ?? !state.attentionPanelOpen,
      };
    case "toggle-inspector":
      return { ...state, inspectorOpen: action.open ?? !state.inspectorOpen };
    case "push-log":
      return {
        ...state,
        lolaLog: [
          ...state.lolaLog.slice(-30),
          { ...action.entry, id: (logSeq += 1) },
        ],
      };
    case "clear":
      return {
        ...state,
        selectedId: null,
        focusProjectId: null,
        filterCategories: null,
        search: "",
        lens: "home",
        attentionEmphasis: false,
        attentionPanelOpen: false,
      };
    case "apply-command": {
      const r = action.result;
      const next: OSState = { ...state, lastNote: r.note, paletteOpen: false };
      switch (r.kind) {
        case "focus-project":
          return {
            ...next,
            focusProjectId: r.projectId,
            selectedId: r.projectId,
            filterCategories: null,
            lens: "home",
            search: "",
            view: "graph",
            attentionEmphasis: false,
          };
        case "select":
          return { ...next, selectedId: r.entityId, inspectorOpen: true, view: "graph" };
        case "set-view":
          return { ...next, view: r.view };
        case "filter":
          return {
            ...next,
            filterCategories: r.categories,
            focusProjectId: null,
            view: "graph",
          };
        case "attention-today":
          return {
            ...next,
            attentionPanelOpen: true,
            attentionEmphasis: true,
            view: "graph",
          };
        case "ask-agent":
          return { ...next, selectedId: r.agentId, inspectorOpen: true, view: "graph" };
        case "search":
          return { ...next, search: r.query, view: "graph" };
        case "clear":
          return {
            ...next,
            selectedId: null,
            focusProjectId: null,
            filterCategories: null,
            search: "",
            lens: "home",
            attentionEmphasis: false,
          };
        default:
          return next;
      }
    }
    default:
      return state;
  }
}

interface OSContextValue {
  dataset: Dataset;
  graph: GraphData;
  index: ReturnType<typeof indexGraph>;
  attention: Map<string, AttentionItem>;
  state: OSState;
  activeContext: ActiveContext;
  /** node ids currently rendered given lens / filter / focus */
  visibleIds: Set<string> | null;
  /** node ids in the neighbourhood of the current selection (for highlight) */
  focusIds: Set<string> | null;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  focusProject: (id: string | null) => void;
  setLens: (lens: string) => void;
  setFilter: (categories: Category[] | null) => void;
  setSearch: (value: string) => void;
  setView: (view: OSView) => void;
  togglePalette: (open?: boolean) => void;
  toggleAttention: (open?: boolean) => void;
  toggleInspector: (open?: boolean) => void;
  clear: () => void;
  runCommand: (input: string) => CommandResult;
}

const OSContext = createContext<OSContextValue | null>(null);

export function OSProvider({ children }: { children: ReactNode }) {
  const dataset = useMemo(() => buildMockDataset(), []);
  const graph = useMemo(() => buildGraph(dataset), [dataset]);
  const index = useMemo(() => indexGraph(graph), [graph]);
  const attention = useMemo(() => computeAttention(dataset), [dataset]);

  const [state, dispatch] = useReducer(reducer, initialState);

  const activeContext = useMemo(
    () =>
      deriveActiveContext(
        dataset,
        graph,
        state.focusProjectId,
        state.selectedId,
        index,
      ),
    [dataset, graph, index, state.focusProjectId, state.selectedId],
  );

  const visibleIds = useMemo<Set<string> | null>(() => {
    if (state.focusProjectId) {
      return subgraphIds(index, state.focusProjectId, 2);
    }
    if (state.filterCategories) {
      const cats = new Set(state.filterCategories);
      const keep = new Set<string>();
      for (const n of graph.nodes) if (cats.has(n.category)) keep.add(n.id);
      // include one hop so filtered nodes keep their anchors
      for (const id of [...keep]) {
        for (const nb of index.adjacency.get(id) ?? []) keep.add(nb);
      }
      return keep;
    }
    return null;
  }, [state.focusProjectId, state.filterCategories, graph, index]);

  const focusIds = useMemo<Set<string> | null>(() => {
    if (!state.selectedId) return null;
    return subgraphIds(index, state.selectedId, 1);
  }, [state.selectedId, index]);

  const runCommand = useCallback(
    (input: string): CommandResult => {
      const result = interpretCommand(input, dataset);
      dispatch({ type: "push-log", entry: { role: "user", text: input } });
      dispatch({
        type: "push-log",
        entry: {
          role: "lola",
          text: respondToCommand(result, dataset, attention),
        },
      });
      dispatch({ type: "apply-command", result });
      return result;
    },
    [dataset, attention],
  );

  const value = useMemo<OSContextValue>(
    () => ({
      dataset,
      graph,
      index,
      attention,
      state,
      activeContext,
      visibleIds,
      focusIds,
      select: (id) => dispatch({ type: "select", id }),
      hover: (id) => dispatch({ type: "hover", id }),
      focusProject: (id) => dispatch({ type: "focus-project", id }),
      setLens: (lens) => dispatch({ type: "set-lens", lens }),
      setFilter: (categories) => dispatch({ type: "set-filter", categories }),
      setSearch: (value) => dispatch({ type: "set-search", value }),
      setView: (view) => dispatch({ type: "set-view", view }),
      togglePalette: (open) => dispatch({ type: "toggle-palette", open }),
      toggleAttention: (open) => dispatch({ type: "toggle-attention", open }),
      toggleInspector: (open) => dispatch({ type: "toggle-inspector", open }),
      clear: () => dispatch({ type: "clear" }),
      runCommand,
    }),
    [
      dataset,
      graph,
      index,
      attention,
      state,
      activeContext,
      visibleIds,
      focusIds,
      runCommand,
    ],
  );

  return <OSContext.Provider value={value}>{children}</OSContext.Provider>;
}

export function useOS(): OSContextValue {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error("useOS must be used inside <OSProvider>");
  return ctx;
}
