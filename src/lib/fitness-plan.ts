import { v4 as uuidv4 } from 'uuid';
import { getTodayDateKey } from '@/lib/utils';
import type { FitnessDay, FitnessPlan, FitnessPlanProfile } from '@/types';

type SessionKind =
  | 'strength-a'
  | 'strength-b'
  | 'strength-c'
  | 'cardio-steady'
  | 'cardio-intervals'
  | 'recovery'
  | 'rest';

const SOURCE_SUMMARY =
  'Built from conservative adult activity guidance: at least 150 minutes of moderate movement weekly plus muscle-strengthening on 2 or more days. Keep effort manageable, stop with sharp pain, and scale down if you are injured or medically limited.';

function getStrengthPrescription(intensity: FitnessPlanProfile['intensity']) {
  if (intensity === 'easy') {
    return {
      sets: '1-2',
      reps: '8-10',
      durationMin: 22,
      cardioMin: 20,
      recoveryMin: 12,
      note: 'Keep 2-3 reps in reserve. Aim for smooth technique, not max effort.',
    };
  }

  if (intensity === 'push') {
    return {
      sets: '3',
      reps: '10-14',
      durationMin: 40,
      cardioMin: 35,
      recoveryMin: 18,
      note: 'Work at a challenging but controlled effort. You should still be able to speak in short phrases.',
    };
  }

  return {
    sets: '2-3',
    reps: '8-12',
    durationMin: 30,
    cardioMin: 28,
    recoveryMin: 15,
    note: 'Use a steady pace and clean form. Rest briefly between sets.',
  };
}

function buildStrengthExercises(profile: FitnessPlanProfile, slot: 'A' | 'B' | 'C', sets: string, reps: string) {
  const repSuffix = `${sets} x ${reps}`;

  if (profile.environment === 'gym') {
    const gymMap = {
      A: [
        `Leg press or goblet squat - ${repSuffix}`,
        `Seated row or cable row - ${repSuffix}`,
        `Chest press or incline push-up - ${repSuffix}`,
        `Romanian deadlift with light-medium load - ${repSuffix}`,
        `Front plank - ${sets} x 20-40 sec`,
      ],
      B: [
        `Split squat or step-up - ${repSuffix}`,
        `Lat pulldown or assisted row - ${repSuffix}`,
        `Dumbbell shoulder press - ${repSuffix}`,
        `Hip hinge or back extension - ${repSuffix}`,
        `Dead bug - ${sets} x 6-10 / side`,
      ],
      C: [
        `Goblet squat - ${repSuffix}`,
        `Machine chest press - ${repSuffix}`,
        `Supported dumbbell row - ${repSuffix}`,
        `Hip thrust or glute bridge - ${repSuffix}`,
        `Farmer carry - ${sets} x 20-30 m`,
      ],
    };

    return gymMap[slot];
  }

  if (profile.environment === 'outdoor') {
    const outdoorMap = {
      A: [
        `Bench step-up or stair climb - ${repSuffix}`,
        `Incline push-up on bench - ${repSuffix}`,
        `Split squat - ${repSuffix}`,
        `Glute bridge - ${repSuffix}`,
        `Plank - ${sets} x 20-40 sec`,
      ],
      B: [
        `Walking lunge or split squat - ${repSuffix}`,
        `Bench-supported squat to stand - ${repSuffix}`,
        `Bench incline push-up - ${repSuffix}`,
        `Single-leg glute bridge - ${sets} x 6-10 / side`,
        `Bird dog - ${sets} x 6-10 / side`,
      ],
      C: [
        `Step-up - ${repSuffix}`,
        `Tempo squat (slow down, normal up) - ${repSuffix}`,
        `Push-up variation you can control - ${repSuffix}`,
        `Wall sit - ${sets} x 20-40 sec`,
        `Side plank - ${sets} x 15-30 sec / side`,
      ],
    };

    return outdoorMap[slot];
  }

  const homeMap = {
    A: [
      `Sit-to-stand or bodyweight squat - ${repSuffix}`,
      `Incline or knee push-up - ${repSuffix}`,
      `Glute bridge - ${repSuffix}`,
      `Bird dog - ${sets} x 6-10 / side`,
      `Front plank - ${sets} x 20-40 sec`,
    ],
    B: [
      `Reverse lunge or split squat - ${repSuffix}`,
      `Wall push-up or incline push-up - ${repSuffix}`,
      `Hip hinge good morning - ${repSuffix}`,
      `Dead bug - ${sets} x 6-10 / side`,
      `Calf raise - ${repSuffix}`,
    ],
    C: [
      `Tempo squat (slow lower) - ${repSuffix}`,
      `Chair-assisted split squat - ${repSuffix}`,
      `Single-leg glute bridge - ${sets} x 6-10 / side`,
      `Shoulder tap from wall or plank - ${sets} x 6-10 / side`,
      `Side plank - ${sets} x 15-30 sec / side`,
    ],
  };

  return homeMap[slot];
}

function buildCardioSession(profile: FitnessPlanProfile, variant: 'steady' | 'intervals', minutes: number) {
  const card = profile.cardioPreference === 'mixed'
    ? (profile.swimAllowed ? 'swim' : 'walk')
    : profile.cardioPreference;

  if (card === 'swim' && profile.swimAllowed) {
    return variant === 'steady'
      ? [`Easy-to-moderate swim or pool walk - ${minutes} min`, 'Keep the pace conversational.']
      : [`Swim intervals: 1 easy lap / 1 moderate lap for ${minutes} min`, 'Rest as needed and stop if form falls apart.'];
  }

  if (card === 'run') {
    return variant === 'steady'
      ? [`Walk-jog at a steady pace - ${minutes} min`, 'Use a pace where you can still talk in short sentences.']
      : [`Run-walk intervals for ${minutes} min`, 'Example: 1 min jog / 2 min walk repeated.'];
  }

  if (card === 'cycle') {
    return variant === 'steady'
      ? [`Easy-to-moderate cycling - ${minutes} min`, 'Stay smooth and keep breathing controlled.']
      : [`Cycle intervals for ${minutes} min`, 'Alternate 1 min brisk effort with 2 min easy riding.'];
  }

  return variant === 'steady'
    ? [`Brisk walk - ${minutes} min`, 'Use the talk test: you should be able to chat, but not sing.']
    : [`Walk intervals for ${minutes} min`, 'Alternate fast walking with easier recovery walking.'];
}

function buildRecoverySession(minutes: number) {
  return [
    `Easy walk - 10-20 min within a ${minutes}-minute session`,
    '5 minutes of mobility: ankles, hips, shoulders, and upper back',
    'Light stretch for calves, quads, chest, and hips',
  ];
}

function createDay(
  dayNumber: number,
  kind: SessionKind,
  profile: FitnessPlanProfile
): FitnessDay {
  const prescription = getStrengthPrescription(profile.intensity);

  if (kind === 'rest') {
    return {
      day: dayNumber,
      workoutType: 'rest',
      title: 'Rest + light walking',
      exercises: ['Optional easy walk 10-20 min', 'Gentle stretch if it feels good'],
      done: false,
      durationMin: 15,
      intensity: profile.intensity,
      coachNote: 'Rest is part of the plan. Keep the day easy.',
    };
  }

  if (kind === 'recovery') {
    return {
      day: dayNumber,
      workoutType: profile.environment === 'gym' ? 'home' : profile.environment,
      title: 'Recovery mobility',
      exercises: buildRecoverySession(prescription.recoveryMin),
      done: false,
      durationMin: prescription.recoveryMin,
      intensity: profile.intensity,
      coachNote: 'Use this to stay moving without chasing fatigue.',
    };
  }

  if (kind === 'cardio-steady' || kind === 'cardio-intervals') {
    return {
      day: dayNumber,
      workoutType: profile.environment === 'gym' ? 'outdoor' : profile.environment,
      title: kind === 'cardio-steady' ? 'Cardio steady' : 'Cardio intervals',
      exercises: buildCardioSession(
        profile,
        kind === 'cardio-steady' ? 'steady' : 'intervals',
        prescription.cardioMin
      ),
      done: false,
      durationMin: prescription.cardioMin,
      intensity: profile.intensity,
      coachNote: 'Keep it controlled and sustainable. This plan is for consistency first.',
    };
  }

  const slot = kind === 'strength-a' ? 'A' : kind === 'strength-b' ? 'B' : 'C';

  return {
    day: dayNumber,
    workoutType: profile.environment,
    title: `Strength ${slot}`,
    exercises: buildStrengthExercises(profile, slot, prescription.sets, prescription.reps),
    done: false,
    durationMin: prescription.durationMin,
    intensity: profile.intensity,
    coachNote: prescription.note,
    notes: 'Warm up for 5 minutes before starting. Stop if you feel sharp pain or dizziness.',
  };
}

function getWeeklyPattern(workoutsPerWeek: FitnessPlanProfile['workoutsPerWeek']): SessionKind[] {
  if (workoutsPerWeek === 3) {
    return ['strength-a', 'recovery', 'cardio-steady', 'rest', 'strength-b', 'recovery', 'rest'];
  }

  if (workoutsPerWeek === 5) {
    return ['strength-a', 'cardio-intervals', 'strength-b', 'recovery', 'strength-c', 'cardio-steady', 'rest'];
  }

  return ['strength-a', 'cardio-steady', 'recovery', 'strength-b', 'rest', 'cardio-intervals', 'recovery'];
}

function getPlanTitle(profile: FitnessPlanProfile) {
  const envLabel =
    profile.environment === 'gym'
      ? 'Gym'
      : profile.environment === 'outdoor'
        ? 'Outdoor'
        : 'Home';

  const goalLabel =
    profile.goal === 'fat-loss'
      ? 'Conditioning'
      : profile.goal === 'strength'
        ? 'Strength'
        : profile.goal === 'energy'
          ? 'Energy'
          : 'Consistency';

  return `${envLabel} ${goalLabel} - 14 Days`;
}

export function createFitnessPlan(profile: FitnessPlanProfile, customTitle?: string): FitnessPlan {
  const weekOne = getWeeklyPattern(profile.workoutsPerWeek);
  const weekTwo = [...weekOne.slice(2), ...weekOne.slice(0, 2)];
  const sequence = [...weekOne, ...weekTwo];

  return {
    id: uuidv4(),
    title: customTitle?.trim() || getPlanTitle(profile),
    createdAt: Date.now(),
    startDate: getTodayDateKey(),
    days: sequence.map((kind, index) => createDay(index + 1, kind, profile)),
    active: true,
    profile,
    sourceSummary: SOURCE_SUMMARY,
  };
}

export const DEFAULT_FITNESS_PROFILE: FitnessPlanProfile = {
  environment: 'home',
  intensity: 'easy',
  goal: 'consistency',
  cardioPreference: 'walk',
  swimAllowed: false,
  workoutsPerWeek: 4,
};

export const FITNESS_SOURCE_LINKS = [
  { label: 'CDC adults activity guidance', url: 'https://www.cdc.gov/physical-activity-basics/health-benefits/adults.html' },
  { label: 'WHO physical activity guidance', url: 'https://www.who.int/initiatives/behealthy/physical-activity' },
  { label: 'NHS strength and flexibility', url: 'https://www.nhs.uk/live-well/exercise/how-to-improve-strength-flexibility/' },
];
