import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../shared/components/ui/input.js';
import { Label } from '../../../shared/components/ui/label.js';
import { useTrackingStore } from '../stores/tracking.store.js';
import { useAdminStore } from '../../admin/stores/admin.store.js';
import { useAuthStore } from '../../auth/stores/auth.store.js';
import type { SessionType } from '@pet/shared';

function ClearableInput({
  id,
  value,
  onChange,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="relative">
      <Input id={id} value={value} onChange={onChange} className={value ? 'pr-8' : ''} {...props} />
      {value && (
        <button
          type="button"
          onClick={() => onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function PracticeInfoForm() {
  const { t } = useTranslation('pet');
  const practiceInfo = useTrackingStore((s) => s.practiceInfo);
  const setPracticeInfo = useTrackingStore((s) => s.setPracticeInfo);
  const initDrills = useTrackingStore((s) => s.initDrills);
  const sessionType = useTrackingStore((s) => s.sessionType);
  const setSessionType = useTrackingStore((s) => s.setSessionType);
  const teams = useAdminStore((s) => s.teams);
  const tenant = useAdminStore((s) => s.tenant);
  const members = useAdminStore((s) => s.members);
  const loadMembers = useAdminStore((s) => s.loadMembers);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (tenant?.name) {
      setPracticeInfo((prev) => prev.clubName ? prev : { ...prev, clubName: tenant.name });
    }
  }, [tenant?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (members.length === 0 && accessToken) {
      loadMembers(accessToken);
    }
  }, [accessToken, loadMembers, members.length]);

  const update = (field: string, value: string | number) =>
    setPracticeInfo({ ...practiceInfo, [field]: value });

  const selectedTeam = teams.find((t) => t.name === practiceInfo.teamName);
  const coachSuggestions = members
    .filter((m) => m.membership.role === 'coach')
    .filter((m) => !selectedTeam || m.teamIds.includes(selectedTeam.id));

  const handleDrillsNumber = (value: string) => {
    const n = parseInt(value, 10) || 0;
    setPracticeInfo({ ...practiceInfo, drillsNumber: n });
    initDrills(n);
  };

  const handleSessionType = (t: SessionType) => {
    setSessionType(t);
    if (t === 'open') {
      setPracticeInfo((prev) => ({ ...prev, drillsNumber: 0 }));
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('practice.sessionTypeLabel')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {(['planned', 'open'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleSessionType(type)}
              className={`flex flex-col items-start gap-0.5 rounded-lg border px-4 py-3 text-left transition-colors ${
                sessionType === type
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card text-foreground hover:bg-muted/50'
              }`}
            >
              <span className="text-sm font-semibold">
                {t(`practice.sessionType${type.charAt(0).toUpperCase() + type.slice(1)}` as never)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(`practice.sessionType${type.charAt(0).toUpperCase() + type.slice(1)}Desc` as never)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('general.infoHeader')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="clubName">{t('general.clubLabel')}</Label>
            <ClearableInput
              id="clubName"
              value={practiceInfo.clubName}
              onChange={(e) => update('clubName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teamName">{t('general.teamLabel')}</Label>
            <ClearableInput
              id="teamName"
              list="team-suggestions"
              value={practiceInfo.teamName}
              onChange={(e) => update('teamName', e.target.value)}
            />
            {teams.length > 0 && (
              <datalist id="team-suggestions">
                {teams.map((team) => (
                  <option key={team.id} value={team.name} />
                ))}
              </datalist>
            )}
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
            <ClearableInput
              id="coachName"
              list="coach-suggestions"
              value={practiceInfo.coachName}
              onChange={(e) => update('coachName', e.target.value)}
            />
            {coachSuggestions.length > 0 && (
              <datalist id="coach-suggestions">
                {coachSuggestions.map((m) => (
                  <option key={m.membership.id} value={m.user.name} />
                ))}
              </datalist>
            )}
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
            <ClearableInput
              id="trackedPlayerName"
              value={practiceInfo.trackedPlayerName}
              onChange={(e) => update('trackedPlayerName', e.target.value)}
            />
          </div>
          {sessionType !== 'open' && (
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
          )}
        </div>
      </section>
    </div>
  );
}
