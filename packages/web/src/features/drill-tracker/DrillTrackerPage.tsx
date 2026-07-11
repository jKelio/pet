import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useBlocker } from 'react-router-dom';
import { Download, Loader2, X } from 'lucide-react';
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
import { useTrackingStore } from '../tracking/stores/tracking.store.js';
import { useTimerStore } from '../tracking/stores/timer.store.js';
import { TimeWatcher } from '../tracking/components/TimeWatcher.js';
import { discardDraft, drillRunHasData } from '../tracking/hooks/useDraftPersistence.js';
import { useAuthStore } from '../auth/stores/auth.store.js';
import { useAdminStore } from '../admin/stores/admin.store.js';
import { DrillResultCard } from '../results/components/DrillResultCard.js';
import { buildDrillRunPdfModel } from '../results/lib/buildDrillRunPdfModel.js';
import { toServerSessionId } from '../results/lib/serverSessionId.js';
import { pdfApi } from '../results/api/pdf.api.js';
import { ApiClientError } from '../../shared/lib/api-client.js';
import { useDrillRunDraft } from './hooks/useDrillRunDraft.js';
import { DrillRunExportDialog } from './components/DrillRunExportDialog.js';

type Phase = 'live' | 'evaluation';

/**
 * The Drill Tracker surface: one ephemeral Drill Run — live tracking straight
 * away (zero setup), then an in-page evaluation. Nothing is ever stored as a
 * session; closing the evaluation discards the run (ADR 0017). The evaluation
 * is rendered in-page instead of navigating to /sessions precisely because
 * ResultsPage persists the store contents as a Completed Session on mount.
 */
export function DrillTrackerPage() {
  const { t, i18n } = useTranslation('pet');
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('live');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const closingRef = useRef(false);

  const { showResumePrompt, resumeRun, startNewRun } = useDrillRunDraft();

  const sessionId = useTrackingStore((s) => s.sessionId);
  const drills = useTrackingStore((s) => s.drills);
  const accessToken = useAuthStore((s) => s.accessToken);
  const membership = useAdminStore((s) => s.membership);
  const entitlements = useAdminStore((s) => s.entitlements);
  const loadProfile = useAdminStore((s) => s.loadProfile);

  const hasData = drillRunHasData(drills);
  // An untouched live run may be left silently; once data exists (or the
  // evaluation is open) leaving means discarding and must be confirmed.
  const canLeaveSilently = phase === 'live' && !hasData;

  useEffect(() => {
    if (accessToken && !membership) loadProfile(accessToken);
  }, [accessToken, membership]); // eslint-disable-line react-hooks/exhaustive-deps

  const cleanup = async () => {
    await discardDraft(useTrackingStore.getState().sessionId).catch(() => {});
    useTrackingStore.getState().resetAllData();
    useTimerStore.getState().resetAll();
  };

  // beforeunload — a reload mid-run is covered by the crash-recovery draft,
  // but warn anyway once the run holds data.
  useEffect(() => {
    if (canLeaveSilently) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [canLeaveSilently]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !closingRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  // Data-less runs leave without a prompt — but still reset the store so the
  // Training Tracker never mounts on a drill-run seeded store.
  useEffect(() => {
    if (blocker.state === 'blocked' && canLeaveSilently) {
      void cleanup().then(() => blocker.proceed?.());
    }
  }, [blocker.state, canLeaveSilently]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeaveConfirmed = async () => {
    await cleanup();
    blocker.proceed?.();
  };

  const handleClose = async () => {
    closingRef.current = true;
    setShowCloseConfirm(false);
    await cleanup();
    navigate('/');
  };

  const handleExport = async (fields: { playerName?: string; drillLabel?: string }) => {
    if (isExporting) return;
    if (!accessToken) {
      setPdfError(t('results.pdfNeedsAccount'));
      return;
    }
    setIsExporting(true);
    setPdfError(null);

    try {
      const drill = useTrackingStore.getState().drills[0];
      const model = buildDrillRunPdfModel({
        sessionId: toServerSessionId(sessionId),
        drill,
        playerName: fields.playerName,
        drillLabel: fields.drillLabel,
        t,
        language: i18n.language,
      });
      const blob = await pdfApi.generate(model, accessToken);
      const date = new Date().toISOString().split('T')[0];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drill-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      // Refresh entitlements so the remaining-export hint updates.
      loadProfile(accessToken);
    } catch (err) {
      if (err instanceof ApiClientError && (err.code === 'QUOTA_EXCEEDED' || err.code === 'UPGRADE_REQUIRED')) {
        setPdfError(t('results.pdfQuotaReached'));
      } else {
        setPdfError(err instanceof Error ? err.message : t('results.exportError'));
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="flex flex-col border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4 gap-3 flex-wrap">
          <h1 className="text-xl font-bold">
            {phase === 'live' ? t('drillTracker.title') : t('drillTracker.evaluationTitle')}
          </h1>
          {phase === 'live' ? (
            <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="ml-1.5 hidden sm:inline">
                  {isExporting ? t('results.exporting') : t('results.pdfExport')}
                  {!isExporting && typeof entitlements?.pdf.remaining === 'number'
                    ? ` (${entitlements.pdf.remaining})`
                    : ''}
                </span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCloseConfirm(true)}>
                <X className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">{t('drillTracker.close')}</span>
              </Button>
            </div>
          )}
        </div>
        {pdfError && (
          <p className="px-6 pb-3 text-xs text-destructive">
            {t('sessions.errorPrefix')}: {pdfError}
          </p>
        )}
      </div>

      {/* Content */}
      {phase === 'live' ? (
        <div className="flex-1 overflow-y-auto">
          <TimeWatcher onFinish={() => setPhase('evaluation')} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {drills[0] && <DrillResultCard drill={drills[0]} />}
        </div>
      )}

      <DrillRunExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
      />

      {/* Close-confirm — closing the evaluation discards the run for good */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('drillTracker.closeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('drillTracker.closeConfirmBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCloseConfirm(false)}>
              {t('buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>
              {t('drillTracker.close')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave-confirm — navigating away discards the run */}
      <AlertDialog
        open={blocker.state === 'blocked' && !canLeaveSilently}
        onOpenChange={() => blocker.reset?.()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('drillTracker.leaveConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('drillTracker.leaveConfirmBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              {t('buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveConfirmed}>
              {t('buttons.leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resume-draft — an interrupted Drill Run was restored */}
      <AlertDialog open={showResumePrompt} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('drillTracker.resumeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('drillTracker.resumeBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resumeRun}>
              {t('buttons.resumeSession')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={startNewRun}>
              {t('drillTracker.newRun')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
