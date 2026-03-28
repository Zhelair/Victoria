import Dexie, { type Table } from 'dexie';
import { getDateKeyDaysAgo, getTodayDateKey } from '@/lib/utils';
import type {
  DailyLog,
  LogEntry,
  ChatThread,
  FitnessPlan,
  TodoItem,
  Goal,
  SaveSlot,
  AppSettings,
  ScoringRule,
  LogCategory,
} from '@/types';

export class VictoriaDB extends Dexie {
  dailyLogs!: Table<DailyLog>;
  logEntries!: Table<LogEntry>;
  chatThreads!: Table<ChatThread>;
  fitnessPlans!: Table<FitnessPlan>;
  todos!: Table<TodoItem>;
  goals!: Table<Goal>;
  saveSlots!: Table<SaveSlot>;
  settings!: Table<AppSettings & { id: string }>;
  scoringRules!: Table<ScoringRule>;
  logCategories!: Table<LogCategory>;

  constructor() {
    super('VictoriaDB');

    this.version(1).stores({
      dailyLogs: 'id, date, checkinDone',
      logEntries: 'id, date, category, timestamp',
      chatThreads: 'id, sphere, updatedAt',
      fitnessPlans: 'id, active, startDate',
      todos: 'id, done, sphere, dueDate',
      goals: 'id, horizon, done',
      saveSlots: 'slot',
      settings: 'id',
      scoringRules: 'id, type, category, enabled',
      logCategories: 'id, enabled',
    });

    // v2: add createdAt index to todos so orderBy('createdAt') works
    this.version(2).stores({
      todos: 'id, done, sphere, dueDate, createdAt',
    });
  }
}

export const db = new VictoriaDB();

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings | null> {
  const record = await db.settings.get('main');
  if (!record) return null;
  const { id: _id, ...settings } = record;
  return settings as AppSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ ...settings, id: 'main' });
}

export async function getTodayLog(): Promise<DailyLog | null> {
  const today = getTodayDateKey();
  return (await db.dailyLogs.where('date').equals(today).first()) ?? null;
}

export async function getOrCreateTodayLog(moodScore: number): Promise<DailyLog> {
  const today = getTodayDateKey();
  const existing = await db.dailyLogs.where('date').equals(today).first();
  if (existing) return existing;

  const newLog: DailyLog = {
    id: `log_${today}`,
    date: today,
    entries: [],
    moodScore,
    scoreDelta: 0,
    checkinDone: false,
  };
  await db.dailyLogs.add(newLog);
  return newLog;
}

export async function addLogEntry(entry: LogEntry): Promise<void> {
  await db.logEntries.add(entry);
  const log = await getOrCreateTodayLog(70);
  const updated = {
    ...log,
    entries: [...log.entries, entry],
  };
  await db.dailyLogs.put(updated);
}

export async function getLogEntriesForRange(
  startDate: string,
  endDate: string
): Promise<LogEntry[]> {
  return db.logEntries
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();
}

export async function getChatThreads(sphere?: string): Promise<ChatThread[]> {
  if (sphere) {
    return db.chatThreads
      .where('sphere')
      .equals(sphere)
      .reverse()
      .sortBy('updatedAt');
  }
  return db.chatThreads.orderBy('updatedAt').reverse().toArray();
}

export async function saveChatThread(thread: ChatThread): Promise<void> {
  await db.chatThreads.put(thread);
}

export async function deleteChatThread(id: string): Promise<void> {
  await db.chatThreads.delete(id);
}

export async function getMoodScoreHistory(
  days: number = 30
): Promise<Array<{ date: string; score: number }>> {
  const startStr = getDateKeyDaysAgo(days);
  const logs = await db.dailyLogs
    .where('date')
    .aboveOrEqual(startStr)
    .toArray();
  return logs
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => ({ date: l.date, score: l.moodScore }));
}
