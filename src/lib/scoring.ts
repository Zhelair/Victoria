import { v4 as uuidv4 } from 'uuid';
import { addLogEntryWithMood, db, getDailyLogByDate, getLogEntriesForDate, getLogEntriesForRange } from '@/lib/db';
import { daysBetween, formatDate, getDateKeyDaysAgo, getTodayDateKey } from '@/lib/utils';
import { useVictoriaStore } from '@/store';
import type { FitnessPlan, LogEntry, ScoringRule } from '@/types';

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

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function addDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function endOfDayTimestamp(dateKey: string) {
  const date = parseDateKey(dateKey);
  date.setHours(23, 59, 0, 0);
  return date.getTime();
}

function parseWakeTime(value: string | number | boolean | undefined) {
  if (typeof value !== 'string') return null;
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function getPlanDayForDate(plan: FitnessPlan | undefined, dateKey: string) {
  if (!plan) return null;
  const dayOffset = Math.floor((parseDateKey(dateKey).getTime() - parseDateKey(plan.startDate).getTime()) / (1000 * 60 * 60 * 24));
  if (dayOffset < 0 || dayOffset >= plan.days.length) return null;
  return plan.days[dayOffset];
}

function persistAutoRuleSummary(results: Array<{ ruleId: string; label: string; delta: number; date: string }>) {
  if (typeof window === 'undefined' || results.length === 0) return;
  try {
    sessionStorage.setItem(
      `victoria-auto-rule-summary-${getTodayDateKey()}`,
      JSON.stringify(results)
    );
  } catch {
    // non-critical
  }
}

async function evaluateRulesForDate(dateKey: string) {
  const state = useVictoriaStore.getState();
  const rules = state.scoringRules.filter((rule) => rule.enabled);
  const entries = await getLogEntriesForDate(dateKey);
  const dailyLog = await getDailyLogByDate(dateKey);
  const activePlan = await db.fitnessPlans.filter((plan) => plan.active).first();
  const applied: Array<{ ruleId: string; label: string; delta: number; date: string }> = [];

  const existingRuleIds = new Set(
    entries
      .map((entry) => entry.ruleId)
      .filter((ruleId): ruleId is string => Boolean(ruleId))
  );

  const applyIfNeeded = async (ruleId: string, note: string, value?: LogEntry['value']) => {
    if (existingRuleIds.has(ruleId)) return;
    const result = await applyScoringRule(ruleId, {
      source: 'system',
      date: dateKey,
      timestamp: endOfDayTimestamp(dateKey),
      note,
      value,
    });
    if (!result.ok) return;
    existingRuleIds.add(ruleId);
    applied.push({
      ruleId,
      label: result.rule.label,
      delta: result.delta,
      date: dateKey,
    });
  };

  const wakeEntry = entries.find((entry) => entry.category === 'sleep_time');
  const wakeMinutes = parseWakeTime(wakeEntry?.value);
  if (wakeMinutes !== null && wakeMinutes > 10 * 60) {
    await applyIfNeeded('late_wake', `Auto-check: wake time logged as ${String(wakeEntry?.value)}.`, wakeEntry?.value);
  }

  const drinksEntry = entries.find((entry) => entry.category === 'beers' && typeof entry.value === 'number');
  if (typeof drinksEntry?.value === 'number' && drinksEntry.value >= 2) {
    await applyIfNeeded('drank_beer', `Auto-check: ${drinksEntry.value} drinks logged.`, drinksEntry.value);
  }

  if (state.settings.morningBriefingEnabled && !dailyLog?.checkinDone) {
    await applyIfNeeded('skipped_checkin', 'Auto-check: no morning check-in was recorded.');
  }

  const planDay = getPlanDayForDate(activePlan, dateKey);
  const completedWorkout = planDay?.done || planDay?.completedDate === dateKey;
  if (planDay && planDay.workoutType !== 'rest' && !completedWorkout) {
    await applyIfNeeded('no_workout', `Auto-check: ${planDay.title || planDay.workoutType} was not completed on its scheduled day.`);
  }

  const appAgeDays = daysBetween(state.settings.firstOpenDate, dateKey);
  if (appAgeDays >= 3) {
    const recentJobWindowStart = addDays(dateKey, -2);
    const recentEntries = await getLogEntriesForRange(recentJobWindowStart, dateKey);
    const hasJobApplication = recentEntries.some(
      (entry) => entry.ruleId === 'job_application' || entry.category === 'job_application'
    );
    if (!hasJobApplication) {
      await applyIfNeeded('no_job_app', 'Auto-check: no job application was logged in the last 3 days.');
    }
  }

  return applied;
}

export async function evaluatePendingDailyRules() {
  const state = useVictoriaStore.getState();
  const today = getTodayDateKey();
  const yesterday = getDateKeyDaysAgo(1);
  const lastEvaluated = state.settings.lastDailyRuleEvaluationDate;

  if (lastEvaluated && lastEvaluated >= yesterday) {
    return [];
  }

  let current = lastEvaluated ? addDays(lastEvaluated, 1) : yesterday;
  const applied: Array<{ ruleId: string; label: string; delta: number; date: string }> = [];

  while (current <= yesterday) {
    const dateResults = await evaluateRulesForDate(current);
    applied.push(...dateResults);
    current = addDays(current, 1);
  }

  state.updateSettings({ lastDailyRuleEvaluationDate: yesterday });
  persistAutoRuleSummary(applied.filter((result) => result.date === yesterday));

  return applied;
}
