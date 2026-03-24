import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppSettings,
  ScoringRule,
  LogCategory,
  Tier,
  MoodTier,
  ChatSphere,
} from '@/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_SCORING_RULES,
  DEFAULT_LOG_CATEGORIES,
  getMoodTier,
} from '@/types';

interface VictoriaState {
  // Settings
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;

  // Mood / score
  moodScore: number;
  setMoodScore: (score: number) => void;
  adjustMoodScore: (delta: number) => void;

  // Scoring rules
  scoringRules: ScoringRule[];
  setScoringRules: (rules: ScoringRule[]) => void;
  addScoringRule: (rule: ScoringRule) => void;
  updateScoringRule: (id: string, partial: Partial<ScoringRule>) => void;
  deleteScoringRule: (id: string) => void;

  // Log categories
  logCategories: LogCategory[];
  setLogCategories: (cats: LogCategory[]) => void;
  addLogCategory: (cat: LogCategory) => void;
  updateLogCategory: (id: string, partial: Partial<LogCategory>) => void;

  // Auth / tier
  tier: Tier;
  setTier: (tier: Tier) => void;

  // Active chat sphere
  activeSphere: ChatSphere;
  setActiveSphere: (sphere: ChatSphere) => void;

  // Streak
  streakDays: number;
  setStreakDays: (n: number) => void;
  totalDays: number;
  setTotalDays: (n: number) => void;

  // Onboarding
  isOnboarding: boolean;
  setIsOnboarding: (v: boolean) => void;

  // Morning checkin done today
  checkinDoneToday: boolean;
  setCheckinDoneToday: (v: boolean) => void;

  // Computed
  getMoodTier: () => MoodTier;
}

export const useVictoriaStore = create<VictoriaState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),

      moodScore: 70,
      setMoodScore: (score) => set({ moodScore: Math.max(0, Math.min(100, score)) }),
      adjustMoodScore: (delta) =>
        set((s) => ({
          moodScore: Math.max(0, Math.min(100, s.moodScore + delta)),
        })),

      scoringRules: DEFAULT_SCORING_RULES,
      setScoringRules: (rules) => set({ scoringRules: rules }),
      addScoringRule: (rule) =>
        set((s) => ({ scoringRules: [...s.scoringRules, rule] })),
      updateScoringRule: (id, partial) =>
        set((s) => ({
          scoringRules: s.scoringRules.map((r) =>
            r.id === id ? { ...r, ...partial } : r
          ),
        })),
      deleteScoringRule: (id) =>
        set((s) => ({
          scoringRules: s.scoringRules.filter((r) => r.id !== id),
        })),

      logCategories: DEFAULT_LOG_CATEGORIES,
      setLogCategories: (cats) => set({ logCategories: cats }),
      addLogCategory: (cat) =>
        set((s) => ({ logCategories: [...s.logCategories, cat] })),
      updateLogCategory: (id, partial) =>
        set((s) => ({
          logCategories: s.logCategories.map((c) =>
            c.id === id ? { ...c, ...partial } : c
          ),
        })),

      tier: 'free',
      setTier: (tier) => set({ tier }),

      activeSphere: 'main',
      setActiveSphere: (sphere) => set({ activeSphere: sphere }),

      streakDays: 0,
      setStreakDays: (n) => set({ streakDays: n }),
      totalDays: 0,
      setTotalDays: (n) => set({ totalDays: n }),

      isOnboarding: false,
      setIsOnboarding: (v) => set({ isOnboarding: v }),

      checkinDoneToday: false,
      setCheckinDoneToday: (v) => set({ checkinDoneToday: v }),

      getMoodTier: () => getMoodTier(get().moodScore),
    }),
    {
      name: 'victoria-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        moodScore: state.moodScore,
        scoringRules: state.scoringRules,
        logCategories: state.logCategories,
        tier: state.tier,
        streakDays: state.streakDays,
        totalDays: state.totalDays,
        checkinDoneToday: state.checkinDoneToday,
      }),
    }
  )
);
