import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
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
  // Hydration flag
  _hasHydrated: boolean;

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

  // Mini-game daily usage
  miniGameUsage: {
    date: string;
    feed: number;
    play: number;
    cleaned: boolean;
    slept: boolean;
    giftGiven: boolean;
    complimentCount: number;
  };
  recordMiniGame: (game: 'feed' | 'play' | 'clean' | 'sleep') => { allowed: boolean; delta: number };
  recordGirlInteraction: (type: 'gift' | 'compliment') => { allowed: boolean };
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(name, value);
    } catch {
      // Ignore storage write failures in restricted browser modes.
    }
  },
  removeItem: (name) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(name);
    } catch {
      // Ignore storage delete failures in restricted browser modes.
    }
  },
};

export const useVictoriaStore = create<VictoriaState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,

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

      miniGameUsage: { date: '', feed: 0, play: 0, cleaned: false, slept: false, giftGiven: false, complimentCount: 0 },
      recordMiniGame: (game) => {
        const today = new Date().toISOString().split('T')[0];
        const prev = get().miniGameUsage;
        const u = prev.date === today ? prev : { date: today, feed: 0, play: 0, cleaned: false, slept: false, giftGiven: false, complimentCount: 0 };
        const newU = { ...u };
        let delta = 0;
        let allowed = false;
        if (game === 'feed' && u.feed < 3) { allowed = true; delta = 2; newU.feed++; }
        else if (game === 'play' && u.play < 3) { allowed = true; delta = 2; newU.play++; }
        else if (game === 'clean' && !u.cleaned) { allowed = true; delta = 3; newU.cleaned = true; }
        else if (game === 'sleep' && !u.slept) { allowed = true; newU.slept = true; }
        if (allowed) {
          set((s) => ({
            miniGameUsage: newU,
            moodScore: delta > 0 ? Math.max(0, Math.min(100, s.moodScore + delta)) : s.moodScore,
          }));
        }
        return { allowed, delta };
      },

      recordGirlInteraction: (type) => {
        const today = new Date().toISOString().split('T')[0];
        const prev = get().miniGameUsage;
        const u = prev.date === today
          ? prev
          : { date: today, feed: 0, play: 0, cleaned: false, slept: false, giftGiven: false, complimentCount: 0 };
        if (type === 'gift' && u.giftGiven) return { allowed: false };
        if (type === 'compliment' && u.complimentCount >= 3) return { allowed: false };
        const newU = { ...u };
        if (type === 'gift') newU.giftGiven = true;
        else newU.complimentCount++;
        set({ miniGameUsage: newU });
        return { allowed: true };
      },
    }),
    {
      name: 'victoria-store',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? noopStorage : safeStorage)),
      skipHydration: true,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<VictoriaState> | undefined;
        return {
          ...currentState,
          ...persisted,
          settings: {
            ...DEFAULT_SETTINGS,
            ...currentState.settings,
            ...(persisted?.settings ?? {}),
          },
        };
      },
      onRehydrateStorage: () => (_state, _error) => {
        useVictoriaStore.setState({ _hasHydrated: true });
      },
      partialize: (state) => ({
        settings: state.settings,
        moodScore: state.moodScore,
        scoringRules: state.scoringRules,
        logCategories: state.logCategories,
        tier: state.tier,
        streakDays: state.streakDays,
        totalDays: state.totalDays,
        checkinDoneToday: state.checkinDoneToday,
        miniGameUsage: state.miniGameUsage,
      }),
    }
  )
);
