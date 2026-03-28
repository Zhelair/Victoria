'use client';

import { useEffect } from 'react';
import { useVictoriaStore } from '@/store';
import i18n from '@/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useVictoriaStore((s) => s.settings.theme);
  const language = useVictoriaStore((s) => s.settings.language);

  useEffect(() => {
    const persistApi = useVictoriaStore.persist;

    if (persistApi.hasHydrated()) {
      useVictoriaStore.setState({ _hasHydrated: true });
      return;
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

  return <>{children}</>;
}
