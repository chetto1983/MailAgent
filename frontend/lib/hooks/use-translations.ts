import { useMemo } from 'react';
import { useLocale } from '@/lib/hooks/use-locale';
import { getTranslations } from '@/locales';

export const useTranslations = () => {
  const locale = useLocale();

  return useMemo(() => getTranslations(locale), [locale]);
};

export default useTranslations;
