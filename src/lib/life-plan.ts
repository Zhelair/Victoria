import type { ScoringRule } from '@/types';

export type LifePillarId = 'career' | 'health' | 'relationships' | 'character' | 'spirit';

export interface LifePillar {
  id: LifePillarId;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  yearlyFocus: string;
}

export const LIFE_PILLARS: LifePillar[] = [
  { id: 'career', label: 'Career & money', shortLabel: 'Career', icon: '💼', color: '#B7791F', yearlyFocus: 'Become reliable, useful, visible and increasingly valuable.' },
  { id: 'health', label: 'Health', shortLabel: 'Health', icon: '🌿', color: '#3F7F5F', yearlyFocus: 'Protect sobriety, energy, sleep, training and a peaceful mind.' },
  { id: 'relationships', label: 'Relationships', shortLabel: 'People', icon: '🤝', color: '#B76E79', yearlyFocus: 'Build friendship, community and a loving partnership.' },
  { id: 'character', label: 'Character', shortLabel: 'Character', icon: '🧭', color: '#6B7280', yearlyFocus: 'Be kind with boundaries: calm, decisive and responsible.' },
  { id: 'spirit', label: 'Spirit', shortLabel: 'Spirit', icon: '🕯️', color: '#7C5CBF', yearlyFocus: 'Practise, meditate, study, enjoy culture and reflect usefully.' },
];

export const QUARTERLY_DIRECTION = [
  { label: 'Months 1–3', career: 'Learn the role, people, products and expectations.', relationships: 'Create weekly opportunities to meet people.', health: 'Establish morning practice and two stronger sessions.', money: 'Map debts, costs and parent-support capacity.' },
  { label: 'Months 4–6', career: 'Deliver reliably; offer useful improvements; pass probation.', relationships: 'Date with curiosity and standards.', health: 'Protect routines during work adjustment.', money: 'Begin disciplined repayment and saving.' },
  { label: 'Months 7–9', career: 'Build measurable contribution and ask for feedback.', relationships: 'Deepen mutual connections and community.', health: 'Keep HORA, movement and recovery consistent.', money: 'Set next-year targets; revisit side-income project.' },
  { label: 'Months 10–12', career: 'Prepare a next-level development conversation.', relationships: 'Build a healthy partnership if compatibility is mutual.', health: 'Review energy, practices and spiritual growth.', money: 'Review progress and set the next annual direction.' },
] as const;

export const PLANNER_SCORING_RULES: ScoringRule[] = [
  { id: 'morning_practice', label: 'Completed morning practice', emoji: '☀️', type: 'heal', points: 6, enabled: true, category: 'daily', pinnedToHome: true, triggerPhrases: ['morning practice', 'morning routine', 'morning stretch'] },
  { id: 'stronger_workout', label: 'Completed a stronger workout', emoji: '💪', type: 'heal', points: 12, enabled: true, category: 'fitness', pinnedToHome: true, triggerPhrases: ['stronger workout', 'trained today', 'worked out', 'did a workout'] },
  { id: 'daily_movement', label: 'Walked or moved with intention', emoji: '🚶', type: 'heal', points: 5, enabled: true, category: 'fitness', pinnedToHome: true, triggerPhrases: ['went for a walk', 'walked', 'daily movement'] },
  { id: 'sobriety_protected', label: 'Protected sobriety today', emoji: '🛡️', type: 'heal', points: 10, enabled: true, category: 'daily', pinnedToHome: true, triggerPhrases: ['stayed sober', 'no alcohol today', 'protected sobriety'] },
  { id: 'career_learning', label: 'Career learning or improvement', emoji: '📚', type: 'heal', points: 10, enabled: true, category: 'career', pinnedToHome: true, triggerPhrases: ['career learning', 'learned at work', 'work improvement'] },
  { id: 'social_culture', label: 'Social, dating or cultural action', emoji: '🤝', type: 'heal', points: 10, enabled: true, category: 'social', pinnedToHome: true, triggerPhrases: ['met a friend', 'went on a date', 'social action', 'cultural action'] },
  { id: 'meditation_practice', label: 'Meditation or spiritual practice', emoji: '🧘', type: 'heal', points: 7, enabled: true, category: 'daily', pinnedToHome: true, triggerPhrases: ['meditated', 'meditation', 'spiritual practice'] },
  { id: 'money_check', label: 'Completed money check', emoji: '💰', type: 'heal', points: 6, enabled: true, category: 'career', triggerPhrases: ['money check', 'checked my money', 'budget review'] },
  { id: 'weekly_review', label: 'Completed weekly review', emoji: '🗓️', type: 'heal', points: 12, enabled: true, category: 'daily', pinnedToHome: true, triggerPhrases: ['weekly review', 'reviewed my week'] },
  { id: 'evening_reset', label: 'Completed evening reset', emoji: '🌙', type: 'heal', points: 5, enabled: true, category: 'daily', triggerPhrases: ['evening reset', 'tidied home', 'read and reflected'] },
];

export const LEGACY_DEFAULT_RULE_IDS = new Set([
  'late_wake', 'no_workout', 'drank_beer', 'no_job_app', 'skipped_checkin', 'ordered_food', 'no_plan_progress',
  'did_workout', 'outdoor_workout', 'long_walk', 'no_beer', 'healthy_meal', 'meditation', 'slept_early',
  'job_application', 'met_friend', 'went_out', 'cooked', 'cleaned_house', 'did_laundry',
]);

const RULE_TO_PILLAR: Record<string, LifePillarId> = {
  morning_practice: 'health', stronger_workout: 'health', daily_movement: 'health', sobriety_protected: 'health',
  career_learning: 'career', money_check: 'career', social_culture: 'relationships', meditation_practice: 'spirit',
  weekly_review: 'character', evening_reset: 'character',
};

export function getPillarForRule(ruleId: string): LifePillarId | null { return RULE_TO_PILLAR[ruleId] ?? null; }
export function getCurrentQuarter(date = new Date()) { return QUARTERLY_DIRECTION[Math.floor(date.getMonth() / 3)]; }
