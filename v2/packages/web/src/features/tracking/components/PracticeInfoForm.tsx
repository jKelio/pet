import { useTranslation } from 'react-i18next';
import { Input } from '../../../shared/components/ui/input.js';
import { Label } from '../../../shared/components/ui/label.js';
import { useTrackingStore } from '../stores/tracking.store.js';

export function PracticeInfoForm() {
  const { t } = useTranslation('pet');
  const practiceInfo = useTrackingStore((s) => s.practiceInfo);
  const setPracticeInfo = useTrackingStore((s) => s.setPracticeInfo);
  const initDrills = useTrackingStore((s) => s.initDrills);

  const update = (field: string, value: string | number) =>
    setPracticeInfo({ ...practiceInfo, [field]: value });

  const handleDrillsNumber = (value: string) => {
    const n = parseInt(value, 10) || 0;
    setPracticeInfo({ ...practiceInfo, drillsNumber: n });
    initDrills(n);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('general.infoHeader')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="clubName">{t('general.clubLabel')}</Label>
            <Input
              id="clubName"
              value={practiceInfo.clubName}
              onChange={(e) => update('clubName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teamName">{t('general.teamLabel')}</Label>
            <Input
              id="teamName"
              value={practiceInfo.teamName}
              onChange={(e) => update('teamName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">{t('general.dateLabel')}</Label>
            <Input
              id="date"
              type="date"
              value={practiceInfo.date.slice(0, 10)}
              onChange={(e) => update('date', new Date(e.target.value).toISOString())}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coachName">{t('general.coachLabel')}</Label>
            <Input
              id="coachName"
              value={practiceInfo.coachName}
              onChange={(e) => update('coachName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="evaluation">{t('general.evaluationLabel')}</Label>
            <Input
              id="evaluation"
              type="number"
              min={0}
              max={10}
              value={practiceInfo.evaluation}
              onChange={(e) => update('evaluation', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('practice.infoHeader')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="athletesNumber">{t('practice.athletesNumberLabel')}</Label>
            <Input
              id="athletesNumber"
              type="number"
              min={0}
              value={practiceInfo.athletesNumber}
              onChange={(e) => update('athletesNumber', parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coachesNumber">{t('practice.coachesNumberLabel')}</Label>
            <Input
              id="coachesNumber"
              type="number"
              min={0}
              value={practiceInfo.coachesNumber}
              onChange={(e) => update('coachesNumber', parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="totalTime">{t('practice.totalTimeLabel')}</Label>
            <Input
              id="totalTime"
              type="number"
              min={0}
              step={0.5}
              value={practiceInfo.totalTime}
              onChange={(e) => update('totalTime', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trackedPlayerName">{t('practice.trackedPlayerNameLabel')}</Label>
            <Input
              id="trackedPlayerName"
              value={practiceInfo.trackedPlayerName}
              onChange={(e) => update('trackedPlayerName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="drillsNumber">{t('practice.drillsNumberLabel')}</Label>
            <Input
              id="drillsNumber"
              type="number"
              min={1}
              max={20}
              value={practiceInfo.drillsNumber}
              onChange={(e) => handleDrillsNumber(e.target.value)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
