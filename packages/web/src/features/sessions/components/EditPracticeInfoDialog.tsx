import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '../../../shared/components/ui/button.js';
import { Input } from '../../../shared/components/ui/input.js';
import { Label } from '../../../shared/components/ui/label.js';
import { NumberInput } from '../../../shared/components/ui/number-input.js';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '../../../shared/components/ui/alert-dialog.js';
import type { PracticeInfo, UpdatePracticeInfoInput } from '@pet/shared';

interface EditPracticeInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practiceInfo: PracticeInfo;
  /** Persist the corrected metadata; throw to keep the dialog open with an error. */
  onSave: (patch: UpdatePracticeInfoInput) => Promise<void>;
}

function toPatch(pi: PracticeInfo): UpdatePracticeInfoInput {
  return {
    date: pi.date,
    coachName: pi.coachName,
    trackedPlayerName: pi.trackedPlayerName,
    athletesNumber: pi.athletesNumber,
    coachesNumber: pi.coachesNumber,
    totalTime: pi.totalTime,
  };
}

/**
 * Dialog to correct a completed session's practice metadata after the fact
 * (date, coach, tracked player, headcounts, planned duration). Team assignment
 * and tracked timing data are intentionally not editable.
 */
export function EditPracticeInfoDialog({
  open,
  onOpenChange,
  practiceInfo,
  onSave,
}: EditPracticeInfoDialogProps) {
  const { t } = useTranslation('pet');
  const [form, setForm] = useState<UpdatePracticeInfoInput>(() => toPatch(practiceInfo));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form each time the dialog opens (possibly for another session)
  useEffect(() => {
    if (open) {
      setForm(toPatch(practiceInfo));
      setError(null);
    }
  }, [open, practiceInfo]);

  const update = <K extends keyof UpdatePracticeInfoInput>(field: K, value: UpdatePracticeInfoInput[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('sessions.editError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('sessions.editPracticeInfo')}</AlertDialogTitle>
          <AlertDialogDescription>
            {practiceInfo.clubName} – {practiceInfo.teamName}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-date">{t('general.dateLabel')}</Label>
            <Input
              id="edit-date"
              type="date"
              value={form.date ? form.date.slice(0, 10) : ''}
              onChange={(e) => {
                if (e.target.value) update('date', new Date(e.target.value).toISOString());
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-coachName">{t('general.coachLabel')}</Label>
            <Input
              id="edit-coachName"
              value={form.coachName}
              onChange={(e) => update('coachName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-trackedPlayerName">{t('practice.trackedPlayerNameLabel')}</Label>
            <Input
              id="edit-trackedPlayerName"
              value={form.trackedPlayerName}
              onChange={(e) => update('trackedPlayerName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-totalTime">{t('practice.totalTimeLabel')}</Label>
            <NumberInput
              id="edit-totalTime"
              min={0}
              max={300}
              step={5}
              inputMode="numeric"
              value={form.totalTime}
              onChange={(v) => update('totalTime', v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-athletesNumber">{t('practice.athletesNumberLabel')}</Label>
            <NumberInput
              id="edit-athletesNumber"
              min={0}
              max={999}
              value={form.athletesNumber}
              onChange={(v) => update('athletesNumber', v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-coachesNumber">{t('practice.coachesNumberLabel')}</Label>
            <NumberInput
              id="edit-coachesNumber"
              min={0}
              max={999}
              value={form.coachesNumber}
              onChange={(v) => update('coachesNumber', v)}
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('sessions.editCancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t('sessions.editSave')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
