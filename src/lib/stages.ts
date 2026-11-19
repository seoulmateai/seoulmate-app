// Copied from seoulmate/lib/affection/stages.ts. Keep the stage math in sync.

export const MAX_AFFECTION = 100;
export const AFFECTION_PER_STAGE = 20;
export const EPISODE_COUNT = 5;

export const STAGE_LABELS = [
  "Stranger",
  "Acquaintance",
  "Confidant",
  "Crush",
  "Lover",
  "Beloved",
] as const;

export type StageLabel = (typeof STAGE_LABELS)[number];

export function stageIndex(affection: number) {
  const value = Number.isFinite(affection) ? affection : 0;
  const clamped = Math.min(MAX_AFFECTION, Math.max(0, Math.round(value)));
  return Math.min(EPISODE_COUNT, Math.floor(clamped / AFFECTION_PER_STAGE));
}

export function stageLabel(stage: number): StageLabel {
  return STAGE_LABELS[Math.min(EPISODE_COUNT, Math.max(0, stage))];
}

export type RelationshipView = { affection: number; nextEpisodeStage: number | null };
