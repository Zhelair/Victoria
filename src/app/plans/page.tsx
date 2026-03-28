'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/lib/db';
import { cn, getTodayDateKey } from '@/lib/utils';
import type { FitnessDay, FitnessPlan, TodoItem, Goal } from '@/types';

export default function PlansPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'fitness' | 'todos' | 'goals'>('fitness');

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div
          className="flex border-b border-theme px-3 pt-3"
          style={{ backgroundColor: 'var(--card-bg)' }}
        >
          {(['fitness', 'todos', 'goals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 font-pixel text-[7px] rounded-t-lg transition-colors',
                activeTab === tab
                  ? 'border-b-2'
                  : 'opacity-50'
              )}
              style={{
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                borderColor: activeTab === tab ? 'var(--accent)' : 'transparent',
              }}
            >
              {tab === 'fitness' ? t('plans.fitnessPlan') : tab === 'todos' ? t('plans.todos') : t('plans.goals')}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'fitness' && <FitnessTab />}
          {activeTab === 'todos' && <TodosTab />}
          {activeTab === 'goals' && <GoalsTab />}
        </div>
      </div>
    </AppShell>
  );
}

// ─── Fitness Tab ──────────────────────────────────────────────────────────────

function FitnessTab() {
  const { t } = useTranslation();
  const plans = useLiveQuery(() => db.fitnessPlans.toArray(), []);
  const activePlan = plans?.find((p) => !!p.active);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');

  const createPlan = async () => {
    if (!newPlanTitle.trim()) return;

    // Deactivate any existing active plan
    if (activePlan) {
      await db.fitnessPlans.update(activePlan.id, { active: false as unknown as boolean });
    }

    const days: FitnessDay[] = Array.from({ length: 14 }, (_, i) => ({
      day: i + 1,
      workoutType: i % 7 === 0 || i % 7 === 3 ? 'rest' : 'home',
      exercises: [],
      done: false,
    }));

    const plan: FitnessPlan = {
      id: uuidv4(),
      title: newPlanTitle,
      createdAt: Date.now(),
      startDate: getTodayDateKey(),
      days,
      active: true,
    };

    await db.fitnessPlans.add(plan);
    setNewPlanTitle('');
    setShowNewPlan(false);
  };

  const toggleDay = async (planId: string, dayIndex: number) => {
    const plan = await db.fitnessPlans.get(planId);
    if (!plan) return;
    const days = plan.days.map((d, i) =>
      i === dayIndex ? { ...d, done: !d.done } : d
    );
    await db.fitnessPlans.update(planId, { days });
  };

  return (
    <div className="space-y-4">
      {!activePlan && !showNewPlan && (
        <div className="card p-6 text-center space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('plans.noPlan')}
          </p>
          <button
            onClick={() => setShowNewPlan(true)}
            className="px-4 py-2 rounded-xl font-pixel text-[8px] text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            + {t('plans.newPlan')}
          </button>
        </div>
      )}

      {showNewPlan && (
        <div className="card p-4 space-y-3">
          <h3 className="font-pixel text-[9px]" style={{ color: 'var(--text)' }}>
            {t('plans.newPlan')}
          </h3>
          <input
            type="text"
            value={newPlanTitle}
            onChange={(e) => setNewPlanTitle(e.target.value)}
            placeholder="e.g. 2-Week Shred"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--shell)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
            onKeyDown={(e) => e.key === 'Enter' && createPlan()}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={createPlan}
              className="flex-1 py-2 rounded-xl font-pixel text-[8px] text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {t('common.save')}
            </button>
            <button
              onClick={() => setShowNewPlan(false)}
              className="px-4 py-2 rounded-xl font-pixel text-[8px]"
              style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {activePlan && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-[9px]" style={{ color: 'var(--accent)' }}>
              {activePlan.title}
            </h3>
            <button
              onClick={() => setShowNewPlan(true)}
              className="font-pixel text-[7px] px-2 py-1 rounded-lg"
              style={{ backgroundColor: 'var(--shell)', color: 'var(--text-muted)' }}
            >
              + {t('plans.newPlan')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {activePlan.days.map((day, i) => (
              <DayCard
                key={i}
                day={day}
                dayNumber={i + 1}
                onToggle={() => toggleDay(activePlan.id, i)}
                planId={activePlan.id}
                dayIndex={i}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DayCard({
  day,
  dayNumber,
  onToggle,
  planId,
  dayIndex,
}: {
  day: FitnessDay;
  dayNumber: number;
  onToggle: () => void;
  planId: string;
  dayIndex: number;
}) {
  const { t } = useTranslation();
  const [editingExercise, setEditingExercise] = useState('');
  const [showInput, setShowInput] = useState(false);

  const workoutColors = {
    rest: '#6b7280',
    home: '#3b82f6',
    outdoor: '#22c55e',
  };

  const addExercise = async () => {
    if (!editingExercise.trim()) return;
    const plan = await db.fitnessPlans.get(planId);
    if (!plan) return;
    const days = plan.days.map((d, i) =>
      i === dayIndex
        ? { ...d, exercises: [...(d.exercises || []), editingExercise.trim()] }
        : d
    );
    await db.fitnessPlans.update(planId, { days });
    setEditingExercise('');
    setShowInput(false);
  };

  return (
    <div
      className={cn(
        'card p-3 transition-all',
        day.done ? 'opacity-60' : ''
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-pixel text-[7px]" style={{ color: 'var(--text-muted)' }}>
          {t('plans.day', { n: dayNumber })}
        </span>
        <button
          onClick={onToggle}
          className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: day.done ? '#22c55e' : 'var(--border)',
            backgroundColor: day.done ? '#22c55e' : 'transparent',
          }}
        >
          {day.done && <span className="text-white text-[8px]">✓</span>}
        </button>
      </div>

      <div className="flex items-center gap-1 mb-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: workoutColors[day.workoutType] }}
        />
        <span className="font-pixel text-[6px]" style={{ color: 'var(--text-muted)' }}>
          {t(`plans.${day.workoutType}`)}
        </span>
      </div>

      {day.exercises && day.exercises.length > 0 && (
        <ul className="space-y-1 mb-2">
          {day.exercises.map((ex, j) => (
            <li key={j} className="text-[10px] truncate" style={{ color: 'var(--text)' }}>
              • {ex}
            </li>
          ))}
        </ul>
      )}

      {showInput ? (
        <div className="flex gap-1">
          <input
            type="text"
            value={editingExercise}
            onChange={(e) => setEditingExercise(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addExercise()}
            placeholder="Exercise..."
            className="flex-1 px-2 py-1 rounded text-[10px] outline-none"
            style={{ backgroundColor: 'var(--shell)', color: 'var(--text)', border: '1px solid var(--border)' }}
            autoFocus
          />
          <button onClick={addExercise} className="text-[10px] px-1" style={{ color: 'var(--accent)' }}>✓</button>
          <button onClick={() => setShowInput(false)} className="text-[10px] px-1" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="font-pixel text-[6px]"
          style={{ color: 'var(--text-muted)' }}
        >
          + add
        </button>
      )}
    </div>
  );
}

// ─── Todos Tab ────────────────────────────────────────────────────────────────

function TodosTab() {
  const { t } = useTranslation();
  const todos = useLiveQuery(() => db.todos.orderBy('createdAt').toArray(), []);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    const todo: TodoItem = {
      id: uuidv4(),
      text: newTodo.trim(),
      done: false,
      createdAt: Date.now(),
    };
    await db.todos.add(todo);
    setNewTodo('');
  };

  const toggleTodo = async (id: string, done: boolean) => {
    await db.todos.update(id, { done: !done });
  };

  const deleteTodo = async (id: string) => {
    await db.todos.delete(id);
  };

  const pending = todos?.filter((t) => !t.done) ?? [];
  const done = todos?.filter((t) => t.done) ?? [];

  return (
    <div className="space-y-4">
      {/* Add input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder={t('plans.addTodo')}
          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: 'var(--shell)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        />
        <button
          onClick={addTodo}
          className="px-4 py-2 rounded-xl font-pixel text-[8px] text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {t('common.add')}
        </button>
      </div>

      {/* Pending todos */}
      {pending.length === 0 && done.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
          {t('plans.noTodos')}
        </p>
      )}

      <div className="space-y-2">
        {pending.map((todo) => (
          <TodoRow key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
        ))}
      </div>

      {done.length > 0 && (
        <div>
          <p className="font-pixel text-[7px] mb-2" style={{ color: 'var(--text-muted)' }}>
            {t('common.done')} ({done.length})
          </p>
          <div className="space-y-2 opacity-50">
            {done.map((todo) => (
              <TodoRow key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  onDelete,
}: {
  todo: TodoItem;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-xl"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
      }}
    >
      <button
        onClick={() => onToggle(todo.id, todo.done)}
        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
        style={{
          borderColor: todo.done ? '#22c55e' : 'var(--border)',
          backgroundColor: todo.done ? '#22c55e' : 'transparent',
        }}
      >
        {todo.done && <span className="text-white text-[8px]">✓</span>}
      </button>
      <span
        className={cn('flex-1 text-sm', todo.done ? 'line-through opacity-50' : '')}
        style={{ color: 'var(--text)' }}
      >
        {todo.text}
      </span>
      {todo.dueDate && (
        <span className="font-pixel text-[6px]" style={{ color: 'var(--text-muted)' }}>
          {todo.dueDate}
        </span>
      )}
      <button
        onClick={() => onDelete(todo.id)}
        className="text-xs opacity-30 hover:opacity-100 transition-opacity"
        style={{ color: '#ef4444' }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

function GoalsTab() {
  const { t } = useTranslation();
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const [newGoal, setNewGoal] = useState('');
  const [horizon, setHorizon] = useState<Goal['horizon']>('3months');

  const addGoal = async () => {
    if (!newGoal.trim()) return;
    const goal: Goal = {
      id: uuidv4(),
      text: newGoal.trim(),
      horizon,
      done: false,
      createdAt: Date.now(),
    };
    await db.goals.add(goal);
    setNewGoal('');
  };

  const horizons: Goal['horizon'][] = ['3months', '6months', 'year', 'life'];

  return (
    <div className="space-y-4">
      {/* Add goal */}
      <div className="card p-4 space-y-3">
        <h3 className="font-pixel text-[8px]" style={{ color: 'var(--text-muted)' }}>
          {t('plans.addGoal')}
        </h3>
        <div className="flex gap-2 flex-wrap">
          {horizons.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className="px-2 py-1 rounded-lg font-pixel text-[6px] transition-all"
              style={{
                backgroundColor: horizon === h ? 'var(--accent)' : 'var(--shell)',
                color: horizon === h ? 'white' : 'var(--text-muted)',
              }}
            >
              {t(`plans.horizons.${h}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
            placeholder="Your goal..."
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--shell)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          />
          <button
            onClick={addGoal}
            className="px-4 py-2 rounded-xl font-pixel text-[8px] text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {t('common.add')}
          </button>
        </div>
      </div>

      {/* Goals list */}
      {goals?.length === 0 && (
        <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>
          No goals yet. What do you want to achieve?
        </p>
      )}

      {horizons.map((h) => {
        const hGoals = goals?.filter((g) => g.horizon === h) ?? [];
        if (hGoals.length === 0) return null;
        return (
          <div key={h}>
            <p className="font-pixel text-[7px] mb-2" style={{ color: 'var(--text-muted)' }}>
              {t(`plans.horizons.${h}`)}
            </p>
            <div className="space-y-2">
              {hGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-start gap-3 px-3 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)' }}
                >
                  <button
                    onClick={() => db.goals.update(goal.id, { done: !goal.done })}
                    className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      borderColor: goal.done ? '#22c55e' : 'var(--border)',
                      backgroundColor: goal.done ? '#22c55e' : 'transparent',
                    }}
                  >
                    {goal.done && <span className="text-white text-[8px]">✓</span>}
                  </button>
                  <div className="flex-1">
                    <p
                      className={cn('text-sm', goal.done ? 'line-through opacity-50' : '')}
                      style={{ color: 'var(--text)' }}
                    >
                      {goal.text}
                    </p>
                    {goal.targetDate && (
                      <p className="font-pixel text-[6px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        Target: {goal.targetDate}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => db.goals.delete(goal.id)}
                    className="text-xs opacity-30 hover:opacity-100 transition-opacity"
                    style={{ color: '#ef4444' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
