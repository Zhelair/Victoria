'use client';

import { useEffect } from 'react';
import { getSettings } from '@/lib/db';
import { evaluatePendingDailyRules } from '@/lib/scoring';
import { useVictoriaStore } from '@/store';
import i18n from '@/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useVictoriaStore((s) => s.settings.theme);
  const language = useVictoriaStore((s) => s.settings.language);

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
    const notificationsEnabled = useVictoriaStore.getState().settings.notificationsEnabled;
    if (!notificationsEnabled) return;

    import('@/lib/reminder-client')
      .then(async ({ syncRemindersFromServer }) => {
        await syncRemindersFromServer().catch(() => {
          // Keep app usable when the remote reminder mirror is unavailable.
        });
      })
      .catch(() => {
        // Ignore reminder bootstrap failures.
      });
  }, []);

  return <>{children}</>;
}
