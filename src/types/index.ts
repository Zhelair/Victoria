import { getTodayDateKey } from '@/lib/utils';

export type Tier = 'free' | 'pro' | 'max';

export type Theme = 'classic' | 'midnight' | 'clean';

export type Language = 'en' | 'ru' | 'bg' | 'de' | 'fr' | 'es' | 'pt' | 'it' | 'pl';

export type CharacterMode = 'creature' | 'girl' | 'cat';

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

export type PersonalityMode = 'cheerful' | 'balanced' | 'critical';

export interface ScoringRule {
  id: string;
  label: string;
  emoji: string;
  type: 'damage' | 'heal';
  points: number;
  enabled: boolean;
  category: 'fitness' | 'diet' | 'social' | 'career' | 'daily' | 'custom';
  pinnedToHome?: boolean;
  triggerPhrases?: string[];
}

export const DEFAULT_SCORING_RULES: ScoringRule[] = [
  { id: 'late_wake', label: 'Woke up after 10am', emoji: '😴', type: 'damage', points: 10, enabled: true, category: 'daily', triggerPhrases: ['woke up after 10', 'woke up late', 'slept in'] },
  { id: 'no_workout', label: 'No workout on workout day', emoji: '🏋️', type: 'damage', points: 15, enabled: true, category: 'fitness', triggerPhrases: ['skipped workout', 'no workout today', 'did not train'] },
  { id: 'drank_beer', label: '2+ beers / drinks', emoji: '🍺', type: 'damage', points: 10, enabled: true, category: 'diet', triggerPhrases: ['drank beer', 'had beers', 'got drunk', 'too much alcohol', 'drank a lot'] },
  { id: 'no_job_app', label: 'No job application in 3 days', emoji: '💼', type: 'damage', points: 20, enabled: true, category: 'career', triggerPhrases: ['did not apply to jobs', 'no job application', 'skipped job search'] },
  { id: 'skipped_checkin', label: 'Skipped morning check-in', emoji: '☀️', type: 'damage', points: 8, enabled: true, category: 'daily', triggerPhrases: ['skipped check in', 'missed morning check in'] },
  { id: 'ordered_food', label: 'Ordered food instead of cooking', emoji: '🛵', type: 'damage', points: 5, enabled: true, category: 'diet', triggerPhrases: ['ordered food', 'ordered takeaway', 'got takeout'] },
  { id: 'no_plan_progress', label: 'No fitness plan progress today', emoji: '📋', type: 'damage', points: 2, enabled: true, category: 'fitness', triggerPhrases: ['no plan progress', 'did not follow my plan'] },
  { id: 'did_workout', label: 'Did pushups / ABS', emoji: '💪', type: 'heal', points: 10, enabled: true, category: 'fitness', pinnedToHome: true, triggerPhrases: ['did pushups', 'worked out', 'did abs', 'trained today'] },
  { id: 'outdoor_workout', label: 'Swam / outdoor workout', emoji: '🏊', type: 'heal', points: 20, enabled: true, category: 'fitness', triggerPhrases: ['went swimming', 'did outdoor workout', 'swam today'] },
  { id: 'long_walk', label: 'Walked 2km+', emoji: '🚶', type: 'heal', points: 12, enabled: true, category: 'fitness', pinnedToHome: true, triggerPhrases: ['walked 2km', 'long walk', 'walked a lot'] },
  { id: 'no_beer', label: 'No alcohol today', emoji: '🚫🍺', type: 'heal', points: 10, enabled: true, category: 'diet', triggerPhrases: ['no alcohol today', 'stayed sober', 'did not drink'] },
  { id: 'healthy_meal', label: 'Logged healthy meal', emoji: '🥗', type: 'heal', points: 8, enabled: true, category: 'diet', pinnedToHome: true, triggerPhrases: ['healthy meal', 'ate healthy', 'ate clean'] },
  { id: 'meditation', label: 'Meditation / Practice', emoji: '🧘', type: 'heal', points: 7, enabled: true, category: 'daily', pinnedToHome: true, triggerPhrases: ['meditated', 'did meditation', 'practice session'] },
  { id: 'slept_early', label: 'Slept before midnight', emoji: '😴', type: 'heal', points: 7, enabled: true, category: 'daily', triggerPhrases: ['slept before midnight', 'went to bed early'] },
  { id: 'job_application', label: 'Applied to a job', emoji: '📨', type: 'heal', points: 20, enabled: true, category: 'career', pinnedToHome: true, triggerPhrases: ['applied to a job', 'sent job application', 'job application done'] },
  { id: 'met_friend', label: 'Met a friend', emoji: '👥', type: 'heal', points: 15, enabled: true, category: 'social', triggerPhrases: ['met a friend', 'saw a friend'] },
  { id: 'went_out', label: 'Went somewhere (museum, event, etc.)', emoji: '🏛️', type: 'heal', points: 18, enabled: true, category: 'social', triggerPhrases: ['went out', 'left the house', 'went somewhere'] },
  { id: 'cooked', label: 'Batch cooked meals', emoji: '🍳', type: 'heal', points: 15, enabled: true, category: 'diet', triggerPhrases: ['cooked today', 'batch cooked', 'made food'] },
  { id: 'cleaned_house', label: 'Cleaned the house', emoji: '🧹', type: 'heal', points: 12, enabled: true, category: 'daily', triggerPhrases: ['cleaned the house', 'cleaned today'] },
  { id: 'did_laundry', label: 'Did laundry', emoji: '👕', type: 'heal', points: 8, enabled: true, category: 'daily', triggerPhrases: ['did laundry', 'washed clothes'] },
];

export interface LogEntry {
  id: string;
  date: string;
  timestamp: number;
  category: string;
  value: string | number | boolean;
  note?: string;
  source?: 'track' | 'rule' | 'chat-confirmation' | 'mini-game' | 'system';
  ruleId?: string;
  scoreDelta?: number;
}

export interface DailyLog {
  id: string;
  date: string;
  entries: LogEntry[];
  moodScore: number;
  scoreDelta: number;
  wakeTime?: string;
  checkinDone: boolean;
}

export interface LogCategory {
  id: string;
  label: string;
  emoji: string;
  type: 'number' | 'boolean' | 'text' | 'scale';
  unit?: string;
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
  pinnedContext?: string;
}

export interface FitnessDay {
  day: number;
  date?: string;
  workoutType: 'rest' | 'home' | 'outdoor' | 'gym';
  title?: string;
  exercises: string[];
  done: boolean;
  completedDate?: string;
  durationMin?: number;
  intensity?: 'easy' | 'steady' | 'push';
  coachNote?: string;
  notes?: string;
}

export interface FitnessPlanProfile {
  environment: 'home' | 'gym' | 'outdoor';
  intensity: 'easy' | 'steady' | 'push';
  goal: 'consistency' | 'strength' | 'fat-loss' | 'energy';
  cardioPreference: 'walk' | 'run' | 'cycle' | 'swim' | 'mixed';
  swimAllowed: boolean;
  workoutsPerWeek: 3 | 4 | 5;
}

export interface FitnessPlan {
  id: string;
  title: string;
  createdAt: number;
  startDate: string;
  days: FitnessDay[];
  active: boolean;
  profile?: FitnessPlanProfile;
  sourceSummary?: string;
}

export type ReminderRepeat = 'once' | 'daily' | 'weekdays' | 'weekly';

export type ReminderCategory = 'personal' | 'health' | 'work' | 'errand' | 'habit';

export type ReminderSoundMode = 'default' | 'silent';

export interface Reminder {
  id: string;
  title: string;
  note?: string;
  scheduledFor: string;
  nextTriggerAt: string;
  repeat: ReminderRepeat;
  category: ReminderCategory;
  sound: ReminderSoundMode;
  voicePreferred: boolean;
  timeZone: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  lastTriggeredAt?: string;
  completedAt?: string;
  syncState?: 'pending' | 'synced' | 'error';
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  dueDate?: string;
  sphere?: ChatSphere;
}

export interface Goal {
  id: string;
  text: string;
  targetDate?: string;
  horizon: '3months' | '6months' | 'year' | 'life';
  done: boolean;
  createdAt: number;
  lastCheckin?: string;
  progress?: string;
}

export interface SaveSlot {
  slot: 1 | 2 | 3;
  label: string;
  savedAt: number;
  day: number;
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
}

export interface AppSettings {
  userName: string;
  theme: Theme;
  language: Language;
  characterMode: CharacterMode;
  personalityMode: PersonalityMode;
  animationsEnabled: boolean;
  animationLevel: 'full' | 'reduced' | 'off';
  wakeUpTime: string;
  sleepTime: string;
  tier: Tier;
  onboardingDone: boolean;
  notificationsEnabled: boolean;
  voiceEnabled: boolean;
  voiceRate: number;
  voicePitch: number;
  selectedVoiceName?: string;
  createdAt: number;
  firstOpenDate: string;
  messageCount: number;
  tamaShellColor?: string;
  tamaScreenColor?: string;
  soundsEnabled: boolean;
  soundVolume: number;
  chatScoreConfirmationsEnabled: boolean;
  lastDailyRuleEvaluationDate?: string;
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
  firstOpenDate: getTodayDateKey(),
  messageCount: 0,
  soundsEnabled: false,
  soundVolume: 1,
  chatScoreConfirmationsEnabled: true,
  morningBriefingEnabled: true,
  morningLocation: 'Sofia, Bulgaria',
  morningWeatherEnabled: true,
  morningNewsEnabled: false,
  morningNewsTopics: 'AI, tech',
  morningFactCategories: 'science, history',
};
