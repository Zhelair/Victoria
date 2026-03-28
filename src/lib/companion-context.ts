import { db } from '@/lib/db';
import { getDateKeyDaysAgo, getTodayDateKey } from '@/lib/utils';
import type { AppSettings, ChatSphere, Goal, LogEntry, Reminder, TodoItem } from '@/types';

function formatGoal(goal: Goal) {
  const target = goal.targetDate ? ` (target ${goal.targetDate})` : '';
  const progress = goal.progress ? ` - progress: ${goal.progress}` : '';
  return `- [${goal.horizon}] ${goal.text}${target}${progress}`;
}

function formatTodo(todo: TodoItem) {
  const due = todo.dueDate ? ` due ${todo.dueDate}` : '';
  const sphere = todo.sphere ? ` [${todo.sphere}]` : '';
  return `- ${todo.text}${sphere}${due}`;
}

function formatLog(entry: LogEntry) {
  const value =
    typeof entry.value === 'boolean'
      ? entry.value ? 'yes' : 'no'
      : String(entry.value);
  const note = entry.note ? ` (${entry.note})` : '';
  return `- ${entry.date}: ${entry.category} = ${value}${note}`;
}

function nextPlanLine(plan: { title: string; startDate: string; days: Array<{ day: number; workoutType: string; exercises: string[]; done: boolean; notes?: string }> }) {
  const nextDay = plan.days.find((day) => !day.done) ?? plan.days[plan.days.length - 1];
  if (!nextDay) return null;

  const exercises = nextDay.exercises.length > 0
    ? ` Exercises: ${nextDay.exercises.slice(0, 4).join(', ')}.`
    : '';
  const notes = nextDay.notes ? ` Notes: ${nextDay.notes}.` : '';
  const title = 'title' in nextDay && typeof nextDay.title === 'string' ? ` ${nextDay.title}.` : '';
  return `${plan.title} - next plan day is Day ${nextDay.day} (${nextDay.workoutType}).${title}${exercises}${notes}`;
}

export async function buildCompanionContext({
  settings,
  activeSphere,
  moodScore,
  streakDays,
  totalDays,
}: {
  settings: AppSettings;
  activeSphere: ChatSphere;
  moodScore: number;
  streakDays: number;
  totalDays: number;
}) {
  const today = getTodayDateKey();
  const startDate = getDateKeyDaysAgo(14);

  const [pendingTodos, activeGoals, activePlan, activeReminders, recentLogs] = await Promise.all([
    db.todos.orderBy('createdAt').filter((todo) => !todo.done).toArray(),
    db.goals.filter((goal) => !goal.done).toArray(),
    db.fitnessPlans.filter((plan) => plan.active).first(),
    db.reminders.filter((reminder) => reminder.active).toArray(),
    db.logEntries.where('date').between(startDate, today, true, true).reverse().sortBy('timestamp'),
  ]);

  const prioritizedTodos = pendingTodos
    .sort((a, b) => {
      const aScore = a.sphere === activeSphere ? 0 : 1;
      const bScore = b.sphere === activeSphere ? 0 : 1;
      return aScore - bScore || a.createdAt - b.createdAt;
    })
    .slice(0, 6);

  const prioritizedGoals = activeGoals
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 5);

  const recentRelevantLogs = recentLogs.slice(0, 10);
  const lines = [
    'Trusted app context from Victoria local data. Use it when relevant, but do not recite it all unless the user asks.',
    `User profile: name ${settings.userName || 'friend'}, active chat sphere ${activeSphere}, mood score ${moodScore}, streak ${streakDays}, total days ${totalDays}.`,
    `Preferred routine only, not the current clock time: usual wake-up time ${settings.wakeUpTime}, usual sleep time ${settings.sleepTime}.`,
  ];

  if (prioritizedGoals.length > 0) {
    lines.push('Active goals:');
    lines.push(...prioritizedGoals.map(formatGoal));
  } else {
    lines.push('Active goals: none saved right now.');
  }

  if (prioritizedTodos.length > 0) {
    lines.push('Pending todos:');
    lines.push(...prioritizedTodos.map(formatTodo));
  } else {
    lines.push('Pending todos: none saved right now.');
  }

  if (activeReminders.length > 0) {
    lines.push(`Active reminders: ${activeReminders.slice(0, 4).map((reminder: Reminder) => reminder.title).join(', ')}.`);
  } else {
    lines.push('Active reminders: none saved right now.');
  }

  if (activePlan) {
    const completedDays = activePlan.days.filter((day) => day.done).length;
    lines.push(`Fitness plan progress: ${activePlan.title} started ${activePlan.startDate}, ${completedDays}/${activePlan.days.length} days done.`);
    if (activePlan.profile) {
      lines.push(
        `Fitness profile: ${activePlan.profile.environment} training, ${activePlan.profile.intensity} intensity, goal ${activePlan.profile.goal}, cardio ${activePlan.profile.cardioPreference}, ${activePlan.profile.workoutsPerWeek} main sessions per week.`
      );
    }
    const nextLine = nextPlanLine(activePlan);
    if (nextLine) {
      lines.push(nextLine);
    }
  } else {
    lines.push('Fitness plan progress: no active fitness plan.');
  }

  if (recentRelevantLogs.length > 0) {
    lines.push('Recent logs from the last 14 days:');
    lines.push(...recentRelevantLogs.map(formatLog));
  } else {
    lines.push('Recent logs: no recent tracking entries.');
  }

  if (settings.morningBriefingEnabled) {
    lines.push(
      `Morning preferences: location ${settings.morningLocation}, weather ${settings.morningWeatherEnabled ? 'wanted' : 'off'}, news ${settings.morningNewsEnabled ? `wanted for topics ${settings.morningNewsTopics || 'general'}` : 'off'}, facts ${settings.morningFactCategories || 'general'}.`
    );
  }

  return lines.join('\n');
}
