'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, BarChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { AppShell } from '@/components/layout/AppShell';
import { useVictoriaStore } from '@/store';
import { db, getMoodScoreHistory } from '@/lib/db';
import { getDateKeyDaysAgo } from '@/lib/utils';


type Range = 7 | 30 | 90;

export default function StatsPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState<Range>(7);
  const [moodHistory, setMoodHistory] = useState<{ date: string; score: number }[]>([]);
  const [categoryData, setCategoryData] = useState<Record<string, { date: string; value: number }[]>>({});
  const logCategories = useVictoriaStore((s) => s.logCategories);
  const streakDays = useVictoriaStore((s) => s.streakDays);
  const totalDays = useVictoriaStore((s) => s.totalDays);
  const moodScore = useVictoriaStore((s) => s.moodScore);

  useEffect(() => {
    setMounted(true);
    loadData(range);
  }, [range]);

  const loadData = async (days: number) => {
    // Mood history from daily logs
    const mood = await getMoodScoreHistory(days);
    setMoodHistory(mood);

    // Category data from log entries
    const startStr = getDateKeyDaysAgo(days);

    const entries = await db.logEntries
      .where('date')
      .aboveOrEqual(startStr)
      .toArray();

    // Group by category and date
    const grouped: Record<string, { date: string; value: number }[]> = {};
    for (const entry of entries) {
      const val = typeof entry.value === 'number' ? entry.value : undefined;
      if (val === undefined) continue;
      if (!grouped[entry.category]) grouped[entry.category] = [];
      grouped[entry.category].push({ date: entry.date, value: val });
    }
    setCategoryData(grouped);
  };

  const numericCategories = logCategories.filter(
    (c) => c.enabled && (c.type === 'number' || c.type === 'scale') && categoryData[c.id]?.length > 0
  );

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <AppShell>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-[9px]" style={{ color: 'var(--accent)' }}>
            {t('stats.title')}
          </h2>
          {/* Range selector */}
          <div className="flex gap-1">
            {([7, 30, 90] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-2 py-1 rounded-lg font-pixel text-[6px] transition-all"
                style={{
                  backgroundColor: range === r ? 'var(--accent)' : 'var(--shell)',
                  color: range === r ? 'white' : 'var(--text-muted)',
                }}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Current Score" value={moodScore} unit="pts" color="var(--accent)" />
          <StatCard label="Streak" value={streakDays} unit="days" color="#f59e0b" />
          <StatCard label="Total Days" value={totalDays} unit="days" color="#22c55e" />
        </div>

        {/* Mood history chart */}
        <div className="card p-4">
          <h3 className="font-pixel text-[8px] mb-4" style={{ color: 'var(--text-muted)' }}>
            {t('stats.moodHistory')}
          </h3>
          {!mounted || moodHistory.length < 2 ? (
            <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>
              {t('stats.noData')}
            </p>
          ) : (
            <div style={{ width: '100%', height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodHistory.map((d) => ({ ...d, date: formatDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 8, fill: 'var(--text-muted)', fontFamily: 'monospace' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 8, fill: 'var(--text-muted)', fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontFamily: '"Press Start 2P", monospace',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--accent)', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Per-category charts */}
        {mounted && numericCategories.map((cat) => {
          const data = categoryData[cat.id]
            .sort((a: any, b: any) => a.date.localeCompare(b.date))
            .map((d: any) => ({ ...d, date: formatDate(d.date) }));

          return (
            <div key={cat.id} className="card p-4">
              <h3 className="font-pixel text-[8px] mb-4" style={{ color: 'var(--text-muted)' }}>
                {cat.emoji} {cat.label}{cat.unit ? ` (${cat.unit})` : ''}
              </h3>
              <div style={{ width: '100%', height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 8, fill: 'var(--text-muted)', fontFamily: 'monospace' }}
                    />
                    <YAxis
                      tick={{ fontSize: 8, fill: 'var(--text-muted)', fontFamily: 'monospace' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '10px',
                      }}
                    />
                    <Bar dataKey="value" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}

        {numericCategories.length === 0 && moodHistory.length < 2 && (
          <div className="card p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('stats.noData')}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Start tracking your daily activities to see charts here.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="card p-3 text-center">
      <div className="font-pixel text-lg" style={{ color }}>
        {value}
      </div>
      <div className="font-pixel text-[6px] mt-1" style={{ color: 'var(--text-muted)' }}>
        {unit}
      </div>
      <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  );
}
