import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../shared/components/ui/input.js';
import { Label } from '../../../shared/components/ui/label.js';
import { NumberInput } from '../../../shared/components/ui/number-input.js';
import { Switch } from '../../../shared/components/ui/switch.js';
import { AutocompleteInput } from '../../../shared/components/ui/autocomplete-input.js';
import { useTrackingStore } from '../stores/tracking.store.js';
import { useAdminStore } from '../../admin/stores/admin.store.js';
import { useAuthStore } from '../../auth/stores/auth.store.js';
import type { SessionType } from '@pet/shared';

export function PracticeInfoForm() {
  const { t } = useTranslation('pet');
  const practiceInfo = useTrackingStore((s) => s.practiceInfo);
  const setPracticeInfo = useTrackingStore((s) => s.setPracticeInfo);
  const initDrills = useTrackingStore((s) => s.initDrills);
  const sessionType = useTrackingStore((s) => s.sessionType);
  const setSessionType = useTrackingStore((s) => s.setSessionType);
  const localOnly = useTrackingStore((s) => s.localOnly);
  const setLocalOnly = useTrackingStore((s) => s.setLocalOnly);
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

  const handleDrillsNumber = (n: number) => {
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
            <AutocompleteInput
              id="clubName"
              value={practiceInfo.clubName}
              suggestions={[]}
              onChange={(clubName) => update('clubName', clubName)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teamName">{t('general.teamLabel')}</Label>
            <AutocompleteInput
              id="teamName"
              value={practiceInfo.teamName}
              suggestions={teams.map((t) => t.name)}
              onChange={(teamName) => {
                const match = teams.find((tm) => tm.name === teamName);
                setPracticeInfo({ ...practiceInfo, teamName, teamId: match?.id });
              }}
            />
            <div className="flex items-center gap-2 pt-1">
              <Switch id="localOnly" checked={localOnly} onCheckedChange={setLocalOnly} />
              <Label
                htmlFor="localOnly"
                className="text-xs font-normal text-muted-foreground cursor-pointer"
              >
                {t('sessions.localOnlyLabel')}
              </Label>
            </div>
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
            <AutocompleteInput
              id="coachName"
              value={practiceInfo.coachName}
              suggestions={coachSuggestions.map((m) => m.user.name)}
              onChange={(coachName) => update('coachName', coachName)}
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
            <NumberInput
              id="athletesNumber"
              min={0}
              max={999}
              value={practiceInfo.athletesNumber}
              onChange={(v) => update('athletesNumber', v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coachesNumber">{t('practice.coachesNumberLabel')}</Label>
            <NumberInput
              id="coachesNumber"
              min={0}
              max={999}
              value={practiceInfo.coachesNumber}
              onChange={(v) => update('coachesNumber', v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="totalTime">{t('practice.totalTimeLabel')}</Label>
            <NumberInput
              id="totalTime"
              min={0}
              step={0.5}
              inputMode="decimal"
              value={practiceInfo.totalTime}
              onChange={(v) => update('totalTime', v)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trackedPlayerName">{t('practice.trackedPlayerNameLabel')}</Label>
            <AutocompleteInput
              id="trackedPlayerName"
              value={practiceInfo.trackedPlayerName}
              suggestions={[]}
              onChange={(trackedPlayerName) => update('trackedPlayerName', trackedPlayerName)}
            />
          </div>
          {sessionType !== 'open' && (
            <div className="space-y-1.5">
              <Label htmlFor="drillsNumber">{t('practice.drillsNumberLabel')}</Label>
              <NumberInput
                id="drillsNumber"
                min={1}
                max={20}
                value={practiceInfo.drillsNumber}
                onChange={handleDrillsNumber}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
