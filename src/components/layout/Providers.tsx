'use client';

import { useEffect } from 'react';
import { useVictoriaStore } from '@/store';
import i18n from '@/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useVictoriaStore((s) => s.settings.theme);
  const language = useVictoriaStore((s) => s.settings.language);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    i18n.changeLanguage(language);
  }, [language]);

  return <>{children}</>;
}
