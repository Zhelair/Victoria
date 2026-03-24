'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppShell } from '@/components/layout/AppShell';
import { useVictoriaStore } from '@/store';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import type { LogEntry, LogCategory } from '@/types';

export default function TrackPage() {
  const { t } = useTranslation();
  const [savedFeedback, setSavedFeedback] = useState(false);
  const logCategories = useVictoriaStore((s) => s.logCategories);
  const updateLogCategory = useVictoriaStore((s) => s.updateLogCategory);
  const addLogCategory = useVictoriaStore((s) => s.addLogCategory);

  const today = new Date().toISOString().split('T')[0];
  const todayEntries = useLiveQuery(
    () => db.logEntries.where('date').equals(today).toArray(),
    [today]
  );

  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatType, setNewCatType] = useState<LogCategory['type']>('number');

  const enabledCategories = logCategories.filter((c) => c.enabled);

  const handleSave = async () => {
    const entries: LogEntry[] = Object.entries(values)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([categoryId, value]) => ({
        id: uuidv4(),
        date: today,
        timestamp: Date.now(),
        category: categoryId,
        value,
      }));

    if (entries.length === 0) return;

    await db.logEntries.bulkAdd(entries);
    setValues({});
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const addCategory = () => {
    if (!newCatLabel.trim()) return;
    addLogCategory({
      id: uuidv4(),
      label: newCatLabel.trim(),
      emoji: '📊',
      type: newCatType,
      enabled: true,
    });
    setNewCatLabel('');
  };

  return (
    <AppShell>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-pixel text-[9px]" style={{ color: 'var(--accent)' }}>
              {t('track.title')}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            className="font-pixel text-[7px] px-2 py-1 rounded-lg"
            style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
          >
            ⚙ {t('track.addCategory')}
          </button>
        </div>

        {/* Category manager */}
        {showCategoryManager && (
          <div className="card p-4 space-y-3">
            <h3 className="font-pixel text-[8px]" style={{ color: 'var(--text-muted)' }}>
              {t('track.addCategory')}
            </h3>

            {/* Existing categories toggle */}
            <div className="space-y-2">
              {logCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text)' }}>
                    {cat.emoji} {cat.label}
                  </span>
                  <button
                    onClick={() => updateLogCategory(cat.id, { enabled: !cat.enabled })}
                    className={cn(
                      'w-10 h-5 rounded-full transition-all relative',
                      cat.enabled ? 'bg-green-500' : 'bg-gray-300'
                    )}
                    style={{ backgroundColor: cat.enabled ? '#22c55e' : 'var(--border)' }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                      style={{ left: cat.enabled ? '22px' : '2px' }}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new category */}
            <div className="pt-2 border-t border-theme space-y-2">
              <div className="flex gap-2">
                {(['number', 'boolean', 'scale', 'text'] as LogCategory['type'][]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewCatType(type)}
                    className="px-2 py-1 rounded-lg font-pixel text-[6px] transition-all"
                    style={{
                      backgroundColor: newCatType === type ? 'var(--accent)' : 'var(--shell)',
                      color: newCatType === type ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  placeholder="Category name..."
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--shell)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                />
                <button
                  onClick={addCategory}
                  className="px-3 py-2 rounded-xl text-sm text-white"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Today's log form */}
        <div className="card p-4 space-y-4">
          <h3 className="font-pixel text-[8px]" style={{ color: 'var(--text)' }}>
            {t('track.today')}
          </h3>

          {enabledCategories.map((cat) => {
            const existingEntry = todayEntries?.find((e) => e.category === cat.id);
            return (
              <CategoryInput
                key={cat.id}
                category={cat}
                value={values[cat.id]}
                existingValue={existingEntry?.value}
                onChange={(v) => setValues((prev) => ({ ...prev, [cat.id]: v }))}
              />
            );
          })}

          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl font-pixel text-[9px] text-white transition-all active:scale-95"
            style={{ backgroundColor: savedFeedback ? '#22c55e' : 'var(--accent)' }}
          >
            {savedFeedback ? `✓ ${t('track.logSaved')}` : t('track.saveLog')}
          </button>
        </div>

        {/* Today's logged entries */}
        {todayEntries && todayEntries.length > 0 && (
          <div className="card p-4">
            <h3 className="font-pixel text-[8px] mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('track.history')}
            </h3>
            <div className="space-y-2">
              {todayEntries.map((entry) => {
                const cat = logCategories.find((c) => c.id === entry.category);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-1 border-b border-theme"
                  >
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {cat?.emoji} {cat?.label ?? entry.category}
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {String(entry.value)}{cat?.unit ? ` ${cat.unit}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CategoryInput({
  category,
  value,
  existingValue,
  onChange,
}: {
  category: LogCategory;
  value: string | number | boolean | undefined;
  existingValue: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  const displayValue = value !== undefined ? value : '';

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg flex-shrink-0">{category.emoji}</span>
      <div className="flex-1">
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text)' }}>
          {category.label}
          {category.unit && (
            <span className="ml-1 font-pixel text-[6px]" style={{ color: 'var(--text-muted)' }}>
              ({category.unit})
            </span>
          )}
          {existingValue !== undefined && (
            <span className="ml-2 font-pixel text-[6px]" style={{ color: '#22c55e' }}>
              logged: {String(existingValue)}
            </span>
          )}
        </label>

        {category.type === 'boolean' && (
          <div className="flex gap-2">
            <button
              onClick={() => onChange(true)}
              className={cn(
                'px-3 py-1 rounded-lg font-pixel text-[7px] transition-all',
                displayValue === true ? 'text-white' : ''
              )}
              style={{
                backgroundColor: displayValue === true ? '#22c55e' : 'var(--shell)',
                color: displayValue === true ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              Yes
            </button>
            <button
              onClick={() => onChange(false)}
              className={cn(
                'px-3 py-1 rounded-lg font-pixel text-[7px] transition-all',
                displayValue === false ? 'text-white' : ''
              )}
              style={{
                backgroundColor: displayValue === false ? '#ef4444' : 'var(--shell)',
                color: displayValue === false ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              No
            </button>
          </div>
        )}

        {category.type === 'scale' && (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={10}
              value={Number(displayValue) || 5}
              onChange={(e) => onChange(Number(e.target.value))}
              className="flex-1 accent-[var(--accent)]"
            />
            <span
              className="font-pixel text-[9px] w-6 text-center"
              style={{ color: 'var(--accent)' }}
            >
              {Number(displayValue) || 5}
            </span>
          </div>
        )}

        {category.type === 'number' && (
          <input
            type="number"
            value={String(displayValue)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--shell)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
            placeholder="0"
          />
        )}

        {category.type === 'text' && (
          <input
            type="text"
            value={String(displayValue)}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--shell)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
            placeholder="Enter value..."
          />
        )}
      </div>
    </div>
  );
}
