// ─── Tiers ────────────────────────────────────────────────────────────────────
export type Tier = 'free' | 'pro' | 'max';

// ─── Themes ───────────────────────────────────────────────────────────────────
export type Theme = 'classic' | 'midnight' | 'clean';

// ─── Languages ────────────────────────────────────────────────────────────────
export type Language = 'en' | 'ru' | 'bg' | 'de' | 'fr' | 'es' | 'pt' | 'it' | 'pl';

// ─── Character ────────────────────────────────────────────────────────────────
export type CharacterMode = 'creature' | 'girl' | 'cat';

// ─── Mood ─────────────────────────────────────────────────────────────────────
export type MoodTier = 'sunshine' | 'balanced' | 'sideeye' | 'icequeen' | 'dark';

export function getMoodTier(score: number): MoodTier {
  if (score >= 85) return 'sunshine';
  if (score >= 65) return 'balanced';
  if (score >= 45) return 'sideeye';
  if (score >= 20) return 'icequeen';
  return 'dark';
}

export const MOOD_TIER_NAMES: Record<MoodTier, string> = {
  sunshine: 'Sunshine Victoria',
  balanced: 'Balanced Victoria',
  sideeye: 'Side-Eye Victoria',
  icequeen: 'Ice Queen Victoria',
  dark: 'Dark Victoria',
};

// ─── Personality ──────────────────────────────────────────────────────────────
export type PersonalityMode = 'cheerful' | 'balanced' | 'critical';

// ─── Scoring Rule ─────────────────────────────────────────────────────────────
export interface ScoringRule {
  id: string;
  label: string;
  emoji: string;
  type: 'damage' | 'heal';
  points: number;
  enabled: boolean;
  category: 'fitness' | 'diet' | 'social' | 'career' | 'daily' | 'custom';
}

export const DEFAULT_SCORING_RULES: ScoringRule[] = [
  // Damage rules
  { id: 'late_wake', label: 'Woke up after 10am', emoji: '😴', type: 'damage', points: 10, enabled: true, category: 'daily' },
  { id: 'no_workout', label: 'No workout on workout day', emoji: '🏋️', type: 'damage', points: 15, enabled: true, category: 'fitness' },
  { id: 'drank_beer', label: '2+ beers / drinks', emoji: '🍺', type: 'damage', points: 10, enabled: true, category: 'diet' },
  { id: 'no_job_app', label: 'No job application in 3 days', emoji: '💼', type: 'damage', points: 20, enabled: true, category: 'career' },
  { id: 'skipped_checkin', label: 'Skipped morning check-in', emoji: '☀️', type: 'damage', points: 8, enabled: true, category: 'daily' },
  { id: 'ordered_food', label: 'Ordered food instead of cooking', emoji: '🛵', type: 'damage', points: 5, enabled: true, category: 'diet' },
  { id: 'no_plan_progress', label: 'No fitness plan progress today', emoji: '📋', type: 'damage', points: 2, enabled: true, category: 'fitness' },
  // Heal rules
  { id: 'did_workout', label: 'Did pushups / ABS', emoji: '💪', type: 'heal', points: 10, enabled: true, category: 'fitness' },
  { id: 'outdoor_workout', label: 'Swam / outdoor workout', emoji: '🏊', type: 'heal', points: 20, enabled: true, category: 'fitness' },
  { id: 'long_walk', label: 'Walked 2km+', emoji: '🚶', type: 'heal', points: 12, enabled: true, category: 'fitness' },
  { id: 'no_beer', label: 'No alcohol today', emoji: '🚫🍺', type: 'heal', points: 10, enabled: true, category: 'diet' },
  { id: 'healthy_meal', label: 'Logged healthy meal', emoji: '🥗', type: 'heal', points: 8, enabled: true, category: 'diet' },
  { id: 'meditation', label: 'Meditation / Practice', emoji: '🧘', type: 'heal', points: 7, enabled: true, category: 'daily' },
  { id: 'slept_early', label: 'Slept before midnight', emoji: '😴', type: 'heal', points: 7, enabled: true, category: 'daily' },
  { id: 'job_application', label: 'Applied to a job', emoji: '📨', type: 'heal', points: 20, enabled: true, category: 'career' },
  { id: 'met_friend', label: 'Met a friend', emoji: '👥', type: 'heal', points: 15, enabled: true, category: 'social' },
  { id: 'went_out', label: 'Went somewhere (museum, event, etc.)', emoji: '🏛️', type: 'heal', points: 18, enabled: true, category: 'social' },
  { id: 'cooked', label: 'Batch cooked meals', emoji: '🍳', type: 'heal', points: 15, enabled: true, category: 'diet' },
  { id: 'cleaned_house', label: 'Cleaned the house', emoji: '🧹', type: 'heal', points: 12, enabled: true, category: 'daily' },
  { id: 'did_laundry', label: 'Did laundry', emoji: '👕', type: 'heal', points: 8, enabled: true, category: 'daily' },
];

// ─── Daily Log ────────────────────────────────────────────────────────────────
export interface LogEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  timestamp: number;
  category: string;
  value: string | number | boolean;
  note?: string;
}

export interface DailyLog {
  id: string;
  date: string;
  entries: LogEntry[];
  moodScore: number; // Victoria's score at end of day
  scoreDelta: number; // +/- for the day
  wakeTime?: string; // HH:MM
  checkinDone: boolean;
}

// ─── Log Category ─────────────────────────────────────────────────────────────
export interface LogCategory {
  id: string;
  label: string;
  emoji: string;
  type: 'number' | 'boolean' | 'text' | 'scale'; // scale = 1-10
  unit?: string; // kg, ml, etc.
  enabled: boolean;
}

export const DEFAULT_LOG_CATEGORIES: LogCategory[] = [
  { id: 'mood', label: 'Mood', emoji: '😊', type: 'scale', enabled: true },
  { id: 'weight', label: 'Weight', emoji: '⚖️', type: 'number', unit: 'kg', enabled: true },
  { id: 'sleep_time', label: 'Wake time', emoji: '⏰', type: 'text', enabled: true },
  { id: 'beers', label: 'Drinks', emoji: '🍺', type: 'number', enabled: true },
  { id: 'water', label: 'Water (glasses)', emoji: '💧', type: 'number', enabled: true },
  { id: 'steps', label: 'Steps', emoji: '👟', type: 'number', enabled: false },
  { id: 'calories', label: 'Calories', emoji: '🔥', type: 'number', enabled: false },
  { id: 'energy', label: 'Energy level', emoji: '⚡', type: 'scale', enabled: true },
  { id: 'notes', label: 'Daily notes', emoji: '📝', type: 'text', enabled: true },
];

// ─── Chat ─────────────────────────────────────────────────────────────────────
export type ChatSphere = 'main' | 'health' | 'career' | 'social' | 'mind' | 'daily';

export const SPHERE_META: Record<ChatSphere, { label: string; emoji: string; color: string }> = {
  main: { label: 'Main Chat', emoji: '💬', color: '#6366f1' },
  health: { label: 'Health & Body', emoji: '🏃', color: '#10b981' },
  career: { label: 'Career & Work', emoji: '💼', color: '#f59e0b' },
  social: { label: 'Social & Life', emoji: '👥', color: '#ec4899' },
  mind: { label: 'Mind & Learning', emoji: '🧠', color: '#8b5cf6' },
  daily: { label: 'Daily Life', emoji: '🏠', color: '#06b6d4' },
};

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  hasFile?: boolean;
  fileName?: string;
}

export interface ChatThread {
  id: string;
  sphere: ChatSphere;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  pinnedContext?: string; // saved MD/text context for this sphere
}

// ─── Fitness Plan ─────────────────────────────────────────────────────────────
export interface FitnessDay {
  day: number; // 1-14
  date?: string; // ISO date if assigned
  workoutType: 'rest' | 'home' | 'outdoor';
  exercises: string[];
  done: boolean;
  notes?: string;
}

export interface FitnessPlan {
  id: string;
  title: string;
  createdAt: number;
  startDate: string;
  days: FitnessDay[];
  active: boolean;
}

// ─── Todo ─────────────────────────────────────────────────────────────────────
export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  dueDate?: string;
  sphere?: ChatSphere;
}

// ─── Long-term Goal ───────────────────────────────────────────────────────────
export interface Goal {
  id: string;
  text: string;
  targetDate?: string;
  horizon: '3months' | '6months' | 'year' | 'life';
  done: boolean;
  createdAt: number;
  lastCheckin?: string;
  progress?: string; // free text notes on progress
}

// ─── Save Slot ────────────────────────────────────────────────────────────────
export interface SaveSlot {
  slot: 1 | 2 | 3;
  label: string;
  savedAt: number;
  day: number; // how many days since first use
  moodScore: number;
  data: AppSnapshot;
}

export interface AppSnapshot {
  settings: AppSettings;
  scoringRules: ScoringRule[];
  logCategories: LogCategory[];
  goals: Goal[];
  todos: TodoItem[];
  fitnessPlan?: FitnessPlan;
  moodScore: number;
  streakDays: number;
  totalDays: number;
  // NOTE: API keys are explicitly excluded from snapshots
}

// ─── App Settings ─────────────────────────────────────────────────────────────
export interface AppSettings {
  userName: string;
  theme: Theme;
  language: Language;
  characterMode: CharacterMode;
  personalityMode: PersonalityMode;
  animationsEnabled: boolean;
  animationLevel: 'full' | 'reduced' | 'off';
  wakeUpTime: string; // HH:MM
  sleepTime: string; // HH:MM - when she goes to sleep (00:00)
  tier: Tier;
  onboardingDone: boolean;
  notificationsEnabled: boolean;
  voiceEnabled: boolean;
  voiceRate: number; // 0.5 - 2
  voicePitch: number; // 0 - 2
  selectedVoiceName?: string; // browser voice name
  createdAt: number;
  firstOpenDate: string;
  messageCount: number;
  tamaShellColor?: string; // custom shell color (hex)
  tamaScreenColor?: string; // custom screen color (hex)
  soundsEnabled: boolean;
  morningBriefingEnabled: boolean;
  morningLocation: string;
  morningWeatherEnabled: boolean;
  morningNewsEnabled: boolean;
  morningNewsTopics: string;
  morningFactCategories: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  userName: '',
  theme: 'classic',
  language: 'en',
  characterMode: 'creature',
  personalityMode: 'balanced',
  animationsEnabled: true,
  animationLevel: 'full',
  wakeUpTime: '09:00',
  sleepTime: '00:00',
  tier: 'free',
  onboardingDone: false,
  notificationsEnabled: false,
  voiceEnabled: false,
  voiceRate: 1,
  voicePitch: 1.1,
  selectedVoiceName: undefined,
  createdAt: Date.now(),
  firstOpenDate: new Date().toISOString().split('T')[0],
  messageCount: 0,
  soundsEnabled: false,
  morningBriefingEnabled: true,
  morningLocation: 'Sofia, Bulgaria',
  morningWeatherEnabled: true,
  morningNewsEnabled: false,
  morningNewsTopics: 'AI, tech',
  morningFactCategories: 'science, history',
};
