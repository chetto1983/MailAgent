import { useEffect, useState, useCallback } from 'react';

const FALLBACK_LOCALE = 'en';
const LOCALE_STORAGE_KEY = 'mailagent:locale';
const LOCALE_CHANGE_EVENT = 'mailagent:locale-change';

const normalizeLocale = (value?: string | null) => {
  if (!value) {
    return FALLBACK_LOCALE;
  }

  const lower = value.toLowerCase();

  if (lower.startsWith('it')) {
    return 'it';
  }

  return 'en';
};

export const useLocale = () => {
  const [locale, setLocale] = useState<string>(FALLBACK_LOCALE);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load from localStorage or detect from browser
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const detected = stored || normalizeLocale(navigator.language || navigator.languages?.[0]);

    setLocale(normalizeLocale(detected));

    // Listen for locale changes from other components
    const handleLocaleChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setLocale(normalizeLocale(customEvent.detail));
    };

    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);

    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    };
  }, []);

  const changeLocale = useCallback((newLocale: string) => {
    const normalized = normalizeLocale(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
    setLocale(normalized);

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: normalized }));
  }, []);

  return { locale, changeLocale };
};

export type { LocaleKey } from '@/locales';
