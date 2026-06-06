import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';
import { Button } from '../ui/button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu.js';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../../lib/i18n.js';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  // i18n.language may be a regional variant (e.g. 'de-DE'); normalise to base.
  const current = i18n.language.split('-')[0] as SupportedLanguage;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground"
        >
          <Languages className="h-4 w-4 shrink-0" />
          <span className="truncate">{LANGUAGE_LABELS[current] ?? LANGUAGE_LABELS.en}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {SUPPORTED_LANGUAGES.map((lng) => (
          <DropdownMenuItem
            key={lng}
            onSelect={() => i18n.changeLanguage(lng)}
            className="justify-between"
          >
            {LANGUAGE_LABELS[lng]}
            {lng === current && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
