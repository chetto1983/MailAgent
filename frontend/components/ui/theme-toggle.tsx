
import { useTheme as useNextTheme } from 'next-themes';
import { IconButton } from '@mui/material';
import { Moon, Sun } from 'lucide-react';
import { useTranslations } from '@/lib/hooks/use-translations';

export const ThemeToggle = () => {
  const t = useTranslations();
  const { theme, setTheme, systemTheme } = useNextTheme();
  const resolvedTheme = theme === 'system' ? systemTheme : theme;
  const isDark = resolvedTheme === 'dark';

  return (
    <IconButton
      aria-label={t.common.toggleTheme}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      sx={{
        ml: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
};
