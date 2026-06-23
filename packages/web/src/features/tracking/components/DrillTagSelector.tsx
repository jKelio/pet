import { useTranslation } from 'react-i18next';
import { DRILL_TAGS } from '@pet/shared';
import type { DrillTag } from '@pet/shared';

interface Props {
  /** Section heading shown above the tag pills. */
  label: string;
  /** Tags currently selected on the drill. */
  selectedTags: string[];
  /** Toggle a tag on/off. */
  onToggle: (tag: DrillTag) => void;
}

/**
 * Presentational multi-select of Drill Tags. Owns no store access — the
 * consumer supplies the current tags and a toggle handler. Reused by the
 * drills setup form and the live Gap view.
 */
export function DrillTagSelector({ label, selectedTags, onToggle }: Props) {
  const { t } = useTranslation('pet');

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </h3>
      <div className="flex flex-wrap gap-2">
        {DRILL_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              selectedTags.includes(tag)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            {t(`drills.${tag}`)}
          </button>
        ))}
      </div>
    </section>
  );
}
