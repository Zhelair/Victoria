'use client';

import { useEffect } from 'react';
import { getSettings } from '@/lib/db';
import { evaluatePendingDailyRules } from '@/lib/scoring';
import { useVictoriaStore } from '@/store';
import i18n from '@/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useVictoriaStore((s) => s.settings.theme);
  const language = useVictoriaStore((s) => s.settings.language);
  const notificationsEnabled = useVictoriaStore((s) => s.settings.notificationsEnabled);

  useEffect(() => {
    const persistApi = useVictoriaStore.persist;

    if (persistApi.hasHydrated()) {
      getSettings()
        .then((dbSettings) => {
          if (!dbSettings) return;
          useVictoriaStore.setState((state) => ({
            settings: {
              ...state.settings,
              ...dbSettings,
            },
          }));
        })
        .catch(() => {
          // Ignore IndexedDB read failures and fall back to the hydrated store state.
        })
        .then(async () => {
          try {
            await evaluatePendingDailyRules();
          } catch {
            // Ignore scoring engine failures and keep app boot resilient.
          }
        })
        .finally(() => {
          useVictoriaStore.setState({ _hasHydrated: true });
        });
      return undefined;
    }

    useVictoriaStore.setState({ _hasHydrated: false });
    const unsubHydrate = persistApi.onHydrate(() => {
      useVictoriaStore.setState({ _hasHydrated: false });
    });
    const unsubFinish = persistApi.onFinishHydration(() => {
      useVictoriaStore.setState({ _hasHydrated: true });
    });

    Promise.resolve(persistApi.rehydrate())
      .catch(() => {
        // Fall back to defaults when storage is unavailable or malformed.
      })
      .then(async () => {
        try {
          const dbSettings = await getSettings();
          if (!dbSettings) return;

          useVictoriaStore.setState((state) => ({
            settings: {
              ...state.settings,
              ...dbSettings,
            },
          }));
        } catch {
          // Ignore IndexedDB read failures and keep the in-memory state.
        }
        try {
          await evaluatePendingDailyRules();
        } catch {
          // Ignore scoring engine failures and keep app boot resilient.
        }
      })
      .finally(() => {
        useVictoriaStore.setState({ _hasHydrated: true });
      });

    return () => {
      unsubHydrate();
      unsubFinish();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      try {
        const { dispatchLocalDueReminders, syncRemindersFromServer } = await import('@/lib/reminder-client');
        await syncRemindersFromServer().catch(() => {
          // Keep app usable when the reminder backend is unavailable.
        });
        if (!cancelled && notificationsEnabled) {
          await dispatchLocalDueReminders().catch(() => {
            // Ignore notification delivery failures and keep the app responsive.
          });
        }
      } catch {
        // Ignore reminder client bootstrap failures.
      }
    };

    void run();

    if (notificationsEnabled) {
      intervalId = setInterval(() => {
        void run();
      }, 30_000);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [notificationsEnabled]);

  return <>{children}</>;
}
