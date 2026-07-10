import { useTranslation } from 'react-i18next';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '../ui/button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu.js';
import {
  THEME_PREFERENCES,
  useThemeStore,
  type ThemePreference,
} from '../../stores/theme.store.js';

const THEME_ICONS: Record<ThemePreference, React.ComponentType<{ className?: string }>> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function ThemeSwitcher() {
  const { t } = useTranslation('pet');
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const CurrentIcon = THEME_ICONS[preference];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground"
        >
          <CurrentIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{t(`theme.${preference}`)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {THEME_PREFERENCES.map((pref) => {
          const Icon = THEME_ICONS[pref];
          return (
            <DropdownMenuItem
              key={pref}
              onSelect={() => setPreference(pref)}
              className="justify-between"
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {t(`theme.${pref}`)}
              </span>
              {pref === preference && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
