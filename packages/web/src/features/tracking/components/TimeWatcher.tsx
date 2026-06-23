import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, CheckCircle, Hourglass, Timer, Hash, Plus, Minus } from 'lucide-react';
import {
  PUCK_TIMER_IDS,
  TIME_MOVING_WITH_PUCK,
  TIME_MOVING_WITHOUT_PUCK,
} from '@pet/shared';
import { Button } from '../../../shared/components/ui/button.js';
import { useTrackingStore } from '../stores/tracking.store.js';
import { useTimerStore, formatTime } from '../stores/timer.store.js';
import { useTimerEngine } from '../hooks/useTimerEngine.js';
import { DrillTagSelector } from './DrillTagSelector.js';

interface Props {
  onFinish: () => void;
}

export function TimeWatcher({ onFinish }: Props) {
  const { t } = useTranslation('pet');

  // Mount the timer engine (sets up intervals and drill initialization)
  useTimerEngine();

  const drills = useTrackingStore((s) => s.drills);
  const currentDrillIndex = useTrackingStore((s) => s.currentDrillIndex);
  const setCurrentDrillIndex = useTrackingStore((s) => s.setCurrentDrillIndex);
  const sessionType = useTrackingStore((s) => s.sessionType);
  const appendDrill = useTrackingStore((s) => s.appendDrill);
  const setPracticeInfo = useTrackingStore((s) => s.setPracticeInfo);
  const updateCurrentDrill = useTrackingStore((s) => s.updateCurrentDrill);

  const timers = useTimerStore((s) => s.timers);
  const counters = useTimerStore((s) => s.counters);
  const currentTimer = useTimerStore((s) => s.currentTimer);
  const wasteTime = useTimerStore((s) => s.wasteTime);
  const drillActive = useTimerStore((s) => s.drillActive);
  const startTimer = useTimerStore((s) => s.startTimer);
  const pauseTimer = useTimerStore((s) => s.pauseTimer);
  const incrementCounter = useTimerStore((s) => s.incrementCounter);
  const decrementCounter = useTimerStore((s) => s.decrementCounter);
  const startTracking = useTimerStore((s) => s.startTracking);
  const startDrill = useTimerStore((s) => s.startDrill);
  const endDrill = useTimerStore((s) => s.endDrill);
  const finishTracking = useTimerStore((s) => s.finishTracking);

  const [drillHasEnded, setDrillHasEnded] = useState(false);
  const [gapElapsed, setGapElapsed] = useState(0);
  const gapDisplayStartRef = useRef<number | null>(null);

  const currentDrill = drills[currentDrillIndex];
  const enabledActions = currentDrill?.actionButtons.filter((a) => a.enabled) ?? [];
  const isLastDrill = currentDrillIndex === drills.length - 1;

  // Begin gap tracking on mount
  useEffect(() => {
    startTracking();
  }, [startTracking]);

  // Gap elapsed display timer
  useEffect(() => {
    if (!drillActive) {
      gapDisplayStartRef.current = Date.now();
      setGapElapsed(0);
      const id = setInterval(() => {
        setGapElapsed(Date.now() - (gapDisplayStartRef.current ?? Date.now()));
      }, 100);
      return () => clearInterval(id);
    } else {
      setGapElapsed(0);
      gapDisplayStartRef.current = null;
    }
  }, [drillActive]);

  const handleStartDrill = () => {
    if (drillHasEnded) {
      setCurrentDrillIndex(currentDrillIndex + 1);
    }
    setDrillHasEnded(false);
    startDrill();
  };

  const handleEndDrill = () => {
    endDrill();
    setDrillHasEnded(true);
  };

  const handleFinish = () => {
    finishTracking();
    if (sessionType === 'open') {
      setPracticeInfo((prev) => ({ ...prev, drillsNumber: drills.length }));
    }
    onFinish();
  };

  const handleAddAndStartDrill = () => {
    appendDrill();
    setCurrentDrillIndex(drills.length);
    setDrillHasEnded(false);
    startDrill();
  };

  // In a gap after a drill ended, currentDrillIndex still points at that
  // just-finished drill, so the tag selector edits exactly that drill.
  const handleToggleTag = (tag: string) => {
    if (!currentDrill) return;
    const current = currentDrill.tags as string[];
    const next = current.includes(tag)
      ? current.filter((tg) => tg !== tag)
      : [...current, tag];
    updateCurrentDrill({ ...currentDrill, tags: next as typeof currentDrill.tags });
  };

  const handleTimerClick = (actionId: string, isRunning: boolean) => {
    if (isRunning) {
      pauseTimer(actionId);
    } else {
      startTimer(actionId);
    }
  };

  const nextDrillNumber = drillHasEnded ? currentDrillIndex + 2 : currentDrillIndex + 1;
  const showFinishButton = drillHasEnded && isLastDrill;

  // ── GAP VIEW ──────────────────────────────────────────────────────────────
  if (!drillActive) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <Hourglass className="h-8 w-8 mx-auto mb-3 text-amber-500" />
              <p className="text-sm text-muted-foreground mb-1">{t('timeWatcher.gapTime')}</p>
              <p className="text-4xl font-mono font-bold tabular-nums">
                {formatTime(gapElapsed)}
              </p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">
                {t('timeWatcher.active')}
              </span>
            </div>

            {/* Tag (or revise) the drill that just ended. Hidden in the very
                first gap, before any drill has run. */}
            {drillHasEnded && currentDrill && (
              <div className="rounded-xl border border-border bg-card p-4">
                <DrillTagSelector
                  label={`${t('drills.drill')} ${currentDrillIndex + 1} · ${t('timeWatcher.drillTags')}`}
                  selectedTags={currentDrill.tags as string[]}
                  onToggle={handleToggleTag}
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border space-y-2">
          {sessionType === 'open' ? (
            drillHasEnded ? (
              <>
                <Button className="w-full" onClick={handleAddAndStartDrill}>
                  <Play className="h-4 w-4 mr-2" />
                  {t('timeWatcher.addDrill', { n: drills.length + 1 })}
                </Button>
                <Button className="w-full" variant="default" onClick={handleFinish}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('timeWatcher.finishTraining')}
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={handleStartDrill}>
                <Play className="h-4 w-4 mr-2" />
                {t('timeWatcher.startDrill')} 1
              </Button>
            )
          ) : showFinishButton ? (
            <Button className="w-full" variant="default" onClick={handleFinish}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('timeWatcher.finishTraining')}
            </Button>
          ) : (
            <Button className="w-full" onClick={handleStartDrill}>
              <Play className="h-4 w-4 mr-2" />
              {t('timeWatcher.startDrill')} {nextDrillNumber}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── DRILL ACTIVE VIEW ──────────────────────────────────────────────────────
  const timerActions = enabledActions.filter((a) => a.type === 'timer');
  const counterActions = enabledActions.filter((a) => a.type === 'counter');

  // Time Moving = with Puck + without Puck (the running one's elapsed counts live).
  const withPuck = timers[TIME_MOVING_WITH_PUCK];
  const withoutPuck = timers[TIME_MOVING_WITHOUT_PUCK];
  const showTimeMovingTotal = timerActions.some((a) =>
    (PUCK_TIMER_IDS as readonly string[]).includes(a.id),
  );
  const timeMovingTotal =
    (withPuck?.totalTime ?? 0) +
    (withPuck?.elapsedTime ?? 0) +
    (withoutPuck?.totalTime ?? 0) +
    (withoutPuck?.elapsedTime ?? 0);

  return (
    <div className="flex flex-col h-full">
      {/* Drill header */}
      <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm">
          {t('timeWatcher.title')} — {t('drills.drill')} {currentDrillIndex + 1}
        </span>
        {(currentDrill?.tags as string[])?.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
          >
            {t(`drills.${tag}`)}
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Timers */}
        {timerActions.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" />
              {t('timeWatcher.timers')}
            </h3>
            {timerActions.map((action) => {
              const timer = timers[action.id];
              const total = (timer?.totalTime ?? 0) + (timer?.elapsedTime ?? 0);
              const isRunning = timer?.isRunning ?? false;
              const isActive = currentTimer === action.id;
              // The two Time Moving puck timers may always switch directly
              // between each other; other timers stay mutually exclusive.
              const isPuckPair =
                (PUCK_TIMER_IDS as readonly string[]).includes(action.id) &&
                !!currentTimer &&
                (PUCK_TIMER_IDS as readonly string[]).includes(currentTimer);
              const isDisabled = !!currentTimer && !isActive && !isPuckPair;

              return (
                <div
                  key={action.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t(`actions.${action.id}`)}</p>
                    <p className="font-mono text-lg font-bold tabular-nums">{formatTime(total)}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isActive ? t('timeWatcher.active') : t('timeWatcher.inactive')}
                  </span>
                  <Button
                    size="icon"
                    variant={isRunning ? 'destructive' : 'default'}
                    disabled={isDisabled}
                    onClick={() => handleTimerClick(action.id, isRunning)}
                    className="shrink-0"
                  >
                    {isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })}

            {showTimeMovingTotal && (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate">
                    {t('timeWatcher.timeMovingTotal')}
                  </p>
                </div>
                <p className="font-mono text-base font-bold tabular-nums">
                  {formatTime(timeMovingTotal)}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Counters */}
        {counterActions.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              {t('timeWatcher.counters')}
            </h3>
            {counterActions.map((action) => {
              const counter = counters[action.id];
              const count = counter?.count ?? 0;

              return (
                <div
                  key={action.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t(`actions.${action.id}`)}</p>
                    <p className="text-2xl font-bold tabular-nums">{count}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => decrementCounter(action.id)}
                      disabled={count === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => incrementCounter(action.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Waste time */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Hourglass className="h-3.5 w-3.5" />
            {t('timeWatcher.wasteTime')}
          </h3>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex-1">
              <p className="font-mono text-lg font-bold tabular-nums">{formatTime(wasteTime)}</p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                !currentTimer
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {!currentTimer ? t('timeWatcher.active') : t('timeWatcher.inactive')}
            </span>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button className="w-full" variant="destructive" onClick={handleEndDrill}>
          <Square className="h-4 w-4 mr-2" />
          {t('timeWatcher.endDrill')}
        </Button>
      </div>
    </div>
  );
}
