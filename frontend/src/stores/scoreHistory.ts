import { create } from "zustand";
import type { LeadCategory } from "@/api/types";

export type ScoreEvent = {
  lead_id: string;
  lead_name?: string;
  company_name?: string;
  score_value: number;
  score_category: LeadCategory;
  prediction_probability?: number;
  recommended_action?: string;
  created_at: string;
};

type ScoreHistoryState = {
  events: ScoreEvent[];
  add: (event: ScoreEvent) => void;
  clear: () => void;
};

const KEY = "isa_score_events";
const MAX = 30;

function load(): ScoreEvent[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as ScoreEvent[];
    return Array.isArray(data) ? data.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export const useScoreHistoryStore = create<ScoreHistoryState>((set, get) => ({
  events: load(),
  add: (event) => {
    const next = [event, ...get().events].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    set({ events: next });
  },
  clear: () => {
    localStorage.removeItem(KEY);
    set({ events: [] });
  },
}));
