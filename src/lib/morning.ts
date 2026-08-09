const FACT_BANK: Record<string, string[]> = {
  science: [
    'Your body makes millions of new cells every second.',
    'A short walk can improve attention and make the next task easier to begin.',
    'Sleep helps the brain consolidate useful memories from the day before.',
    'Trees and plants release oxygen through photosynthesis, quietly sustaining life every day.',
  ],
  history: [
    'The printing press helped knowledge travel farther and reach more people.',
    'Libraries have connected people with ideas and each other for centuries.',
    'Many historic cities were built through the patient work of ordinary craftspeople.',
    'Music, art and writing have helped communities preserve meaning across generations.',
  ],
  ai: [
    'The phrase "artificial intelligence" was popularized in the 1950s.',
    'Modern AI systems learn patterns from examples rather than memorizing a fixed script.',
    'Speech recognition, translation, and recommendations all rely on different kinds of machine learning.',
    'AI works best when it has clear goals, useful context, and strong human judgment around it.',
  ],
  tech: [
    'The first computer bugs were literal insects found in hardware.',
    'The original internet was designed so information could still move even if parts of the network failed.',
    'A lot of battery life wins come from software efficiency, not just bigger batteries.',
    'Touchscreens existed long before smartphones made them mainstream.',
  ],
  general: [
    'Small repeated actions shape routines more reliably than occasional bursts of motivation.',
    'Your attention is a resource, not an unlimited background process.',
    'Consistency usually beats intensity when habits are still fragile.',
    'Momentum grows faster when the first task of the day is obvious.',
  ],
};

const EVENT_BANK = [
  'A good morning routine works best when the first win is easy to start and easy to finish.',
  'Today is a strong day to clear one lingering task before it grows heavier in your head.',
  'If your energy is uneven today, protect the first useful hour instead of chasing a perfect day.',
  'Treat today like a reset point: one clean action can change the tone of the whole day.',
];

function getDaySeed(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function normalizeCategories(raw: string) {
  return raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getMorningSpark(categoriesRaw: string) {
  const categories = normalizeCategories(categoriesRaw);
  const validCategories = categories.filter((category) => category in FACT_BANK);
  const pool = validCategories.length > 0 ? validCategories : ['general'];
  const seed = getDaySeed();
  const category = pool[seed % pool.length];
  const facts = FACT_BANK[category] ?? FACT_BANK.general;
  const label = seed % 2 === 0 ? 'A good thing to remember' : 'Morning note';
  const text =
    seed % 2 === 0
      ? facts[Math.floor(seed / pool.length) % facts.length]
      : EVENT_BANK[Math.floor(seed / 2) % EVENT_BANK.length];

  return {
    label,
    category,
    text,
  };
}

export function getActivePlanDayNumber(
  startDate: string,
  completedDays: number
) {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return completedDays + 1;
  }

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(14, diffDays + 1, completedDays + 1));
}
