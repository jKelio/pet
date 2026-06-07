import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../shared/components/ui/alert-dialog.js';
import { useTrackingStore } from './stores/tracking.store.js';
import { useAdminStore } from '../admin/stores/admin.store.js';
import { PracticeInfoForm } from './components/PracticeInfoForm.js';
import { DrillsForm } from './components/DrillsForm.js';
import { TimeWatcher } from './components/TimeWatcher.js';
import { useDraftPersistence } from './hooks/useDraftPersistence.js';

export function TrackingPage() {
  const { t } = useTranslation('pet');
  const navigate = useNavigate();
  useDraftPersistence();
  const mode = useTrackingStore((s) => s.mode);
  const drillsNumber = useTrackingStore((s) => s.practiceInfo.drillsNumber);
  const sessionType = useTrackingStore((s) => s.sessionType);
  const goToNextStep = useTrackingStore((s) => s.goToNextStep);
  const goToPrevStep = useTrackingStore((s) => s.goToPrevStep);
  const resetAllData = useTrackingStore((s) => s.resetAllData);
  const setPracticeInfo = useTrackingStore((s) => s.setPracticeInfo);
  const tenant = useAdminStore((s) => s.tenant);

  const [showStartConfirm, setShowStartConfirm] = useState(false);

  const isLastSetupStep =
    (mode === 'practiceInfo' && sessionType === 'open') || mode === 'drills';

  const handleReset = () => {
    resetAllData();
    if (tenant?.name) {
      setPracticeInfo((prev) => ({ ...prev, clubName: tenant.name }));
    }
  };

  const canAdvance = mode === 'practiceInfo' ? (sessionType === 'open' || drillsNumber > 0) : true;

  const handleFinish = () => {
    navigate('/sessions');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <h1 className="text-xl font-bold">{t(`steps.${mode}`, { defaultValue: t('steps.fallback') })}</h1>

        {/* Live indicator — visible for the entire TimeWatcher session */}
        {mode === 'timeWatcher' && (
          <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
        )}

        {/* Step indicator (practiceInfo / drills only, planned sessions only) */}
        {mode !== 'timeWatcher' && sessionType === 'planned' && (
          <div className="flex items-center gap-2">
            {['practiceInfo', 'drills'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === mode
                      ? 'bg-primary text-primary-foreground'
                      : mode === 'drills' && i === 0
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 1 && <div className="h-px w-4 bg-border" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${mode !== 'timeWatcher' ? 'p-6' : ''}`}>
        {mode === 'practiceInfo' && <PracticeInfoForm />}
        {mode === 'drills' && <DrillsForm />}
        {mode === 'timeWatcher' && <TimeWatcher onFinish={handleFinish} />}
      </div>

      {/* Navigation footer (setup steps only) */}
      {mode !== 'timeWatcher' && (
        <div className="p-4 border-t border-border flex gap-3 bg-card">
          {mode === 'drills' && (
            <Button variant="outline" onClick={goToPrevStep} className="flex-1">
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('buttons.previousButtonText')}
            </Button>
          )}
          {mode === 'practiceInfo' && (
            <Button variant="ghost" size="icon" onClick={handleReset} title={t('buttons.resetForm')}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={() => isLastSetupStep ? setShowStartConfirm(true) : goToNextStep()}
            disabled={!canAdvance}
            className="flex-1"
          >
            {isLastSetupStep ? t('buttons.startTraining') : t('buttons.nextButtenText')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <AlertDialog open={showStartConfirm} onOpenChange={setShowStartConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('timeWatcher.startConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('timeWatcher.startConfirmBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowStartConfirm(false)}>
              {t('buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowStartConfirm(false); goToNextStep(); }}>
              {t('buttons.startTraining')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
