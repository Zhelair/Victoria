import { v4 as uuidv4 } from 'uuid';
import { addLogEntryWithMood } from '@/lib/db';
import { getTodayDateKey } from '@/lib/utils';
import { useVictoriaStore } from '@/store';
import type { LogEntry, ScoringRule } from '@/types';

export const MAX_HOME_PINNED_RULES = 5;

function normalizePoints(points: number) {
  return Math.max(1, Math.round(Math.abs(points)));
}

export function getRuleScoreDelta(rule: ScoringRule) {
  const points = normalizePoints(rule.points);
  return rule.type === 'heal' ? points : -points;
}

export function getPinnedHomeRules(rules: ScoringRule[]) {
  return rules.filter((rule) => rule.enabled && rule.pinnedToHome).slice(0, MAX_HOME_PINNED_RULES);
}

export async function applyScoringRule(
  ruleId: string,
  options?: {
    source?: LogEntry['source'];
    note?: string;
    value?: LogEntry['value'];
    timestamp?: number;
    date?: string;
  }
) {
  const state = useVictoriaStore.getState();
  const rule = state.scoringRules.find((candidate) => candidate.id === ruleId);

  if (!rule || !rule.enabled) {
    return {
      ok: false as const,
      reason: 'missing-rule',
    };
  }

  const delta = getRuleScoreDelta(rule);
  state.adjustMoodScore(delta);
  const moodScore = useVictoriaStore.getState().moodScore;
  const entry: LogEntry = {
    id: uuidv4(),
    date: options?.date ?? getTodayDateKey(),
    timestamp: options?.timestamp ?? Date.now(),
    category: rule.id,
    value: options?.value ?? rule.label,
    note: options?.note,
    source: options?.source ?? 'rule',
    ruleId: rule.id,
    scoreDelta: delta,
  };

  await addLogEntryWithMood(entry, moodScore);

  return {
    ok: true as const,
    rule,
    delta,
    moodScore,
    entry,
  };
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectScoringRuleFromText(text: string, rules: ScoringRule[]) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return null;

  const candidates = rules
    .filter((rule) => rule.enabled)
    .map((rule) => {
      const phrases = (rule.triggerPhrases?.length ? rule.triggerPhrases : [rule.label])
        .map(normalizeText)
        .filter(Boolean);
      const match = phrases.find((phrase) => normalizedText.includes(phrase));
      if (!match) return null;
      return {
        rule,
        matchedPhrase: match,
        score: match.length,
      };
    })
    .filter((candidate): candidate is { rule: ScoringRule; matchedPhrase: string; score: number } => Boolean(candidate))
    .sort((a, b) => b.score - a.score);

  return candidates[0] ?? null;
}
