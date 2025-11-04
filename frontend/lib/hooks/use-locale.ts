import { useEffect, useState } from 'react';

const FALLBACK_LOCALE = 'en';

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
    const detected =
      typeof navigator !== 'undefined'
        ? normalizeLocale(navigator.language || navigator.languages?.[0])
        : FALLBACK_LOCALE;

    setLocale(detected);
  }, []);

  return locale;
};
