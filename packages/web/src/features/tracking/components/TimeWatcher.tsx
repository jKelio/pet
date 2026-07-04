import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, CheckCircle, Hourglass, Timer, Hash, Plus } from 'lucide-react';
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
  const startTracking = useTimerStore((s) => s.startTracking);
  const startDrill = useTimerStore((s) => s.startDrill);
  const endDrill = useTimerStore((s) => s.endDrill);
  const finishTracking = useTimerStore((s) => s.finishTracking);

  const [drillHasEnded, setDrillHasEnded] = useState(false);
  const [gapElapsed, setGapElapsed] = useState(0);
  const gapDisplayStartRef = useRef<number | null>(null);
  const [blockedCounterId, setBlockedCounterId] = useState<string | null>(null);

  const currentDrill = drills[currentDrillIndex];
  const enabledActions = currentDrill?.actionButtons.filter((a) => a.enabled) ?? [];
  const isLastDrill = currentDrillIndex === drills.length - 1;

  // Begin gap tracking on mount
  useEffect(() => {
    startTracking();
  }, [startTracking]);

  useEffect(() => {
    if (!blockedCounterId) return;
    const id = setTimeout(() => setBlockedCounterId(null), 250);
    return () => clearTimeout(id);
  }, [blockedCounterId]);

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

  // The two puck timers are presented as a single grouped "Bewegungszeit"
  // control — but only when BOTH are enabled. With just one, it falls back to a
  // normal simple-timer card so the segmented toggle never has a dead side.
  const puckActions = timerActions.filter((a) =>
    (PUCK_TIMER_IDS as readonly string[]).includes(a.id),
  );
  const showPuckGroup = puckActions.length === 2;

  // Ordered render slots for the timer grid. Simple timers are 1-column cells;
  // when both puck timers are enabled they collapse into a single Bewegungszeit
  // card spanning 2 columns, inserted at the puck timers' position so it tiles
  // inline with the other timers (e.g. one row with Technique Time).
  type TimerAction = (typeof timerActions)[number];
  type TimerSlot = { kind: 'timer'; action: TimerAction } | { kind: 'puckGroup' };
  const timerSlots: TimerSlot[] = [];
  let puckGroupInserted = false;
  for (const a of timerActions) {
    const isPuck = (PUCK_TIMER_IDS as readonly string[]).includes(a.id);
    if (showPuckGroup && isPuck) {
      if (!puckGroupInserted) {
        timerSlots.push({ kind: 'puckGroup' });
        puckGroupInserted = true;
      }
      continue;
    }
    timerSlots.push({ kind: 'timer', action: a });
  }

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
            {/* Compact 3-up grid. Simple timers are equal-height cards with the
                start/stop button pinned to the bottom so buttons align across a
                row. The grouped Bewegungszeit control is a 2-column cell inserted
                at the puck timers' position (e.g. one row with Technique Time):
                a mit-Puck | ohne-Puck segmented toggle where tapping a side
                starts it and stops the other (= Reception / Turnover) and tapping
                the active side again stops movement (ends the Time-Moving-Episode). */}
            {timerSlots.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {timerSlots.map((slot) => {
                  if (slot.kind === 'puckGroup') {
                    return (
                      <div
                        key="puck-group"
                        className={`relative col-span-2 flex flex-col gap-1.5 rounded-lg border bg-card p-2 ${
                          !!currentTimer && (PUCK_TIMER_IDS as readonly string[]).includes(currentTimer)
                            ? 'border-green-500'
                            : 'border-border'
                        }`}
                      >
                        {(() => {
                          const isPuckActive = !!currentTimer && (PUCK_TIMER_IDS as readonly string[]).includes(currentTimer);
                          return (
                            <span className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${isPuckActive ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                          );
                        })()}
                        <div className="flex min-h-[2rem] items-center justify-between gap-2 pr-4">
                          <p className="text-xs font-medium">{t('actions.timemoving')}</p>
                          <p className="font-mono text-sm font-bold tabular-nums">
                            {formatTime(timeMovingTotal)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {(PUCK_TIMER_IDS as readonly string[]).map((id) => {
                            const timer = timers[id];
                            const total = (timer?.totalTime ?? 0) + (timer?.elapsedTime ?? 0);
                            const isRunning = timer?.isRunning ?? false;
                            const isActive = currentTimer === id;
                            const isWith = id === TIME_MOVING_WITH_PUCK;
                            const isDisabled = !!currentTimer && !(PUCK_TIMER_IDS as readonly string[]).includes(currentTimer);
                            return (
                              <button
                                key={id}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => handleTimerClick(id, isRunning)}
                                className={`flex-1 rounded-md border px-2 py-1.5 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isActive
                                    ? 'border-destructive bg-destructive text-destructive-foreground'
                                    : 'border-primary bg-primary text-primary-foreground'
                                }`}
                              >
                                <span className="flex items-center justify-center gap-1 overflow-hidden whitespace-nowrap text-[11px] font-medium">
                                  <span className="shrink-0">
                                    {isActive ? (
                                      <Square className="h-3 w-3" />
                                    ) : (
                                      <Play className="h-3 w-3" />
                                    )}
                                  </span>
                                  <span className="truncate">
                                    {t(isWith ? 'timeWatcher.withPuck' : 'timeWatcher.withoutPuck')}
                                  </span>
                                </span>
                                <span className="block font-mono text-sm font-bold tabular-nums">
                                  {formatTime(total)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  const action = slot.action;
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
                      className={`relative flex flex-col gap-1.5 rounded-lg border bg-card p-2 ${isActive ? 'border-green-500' : 'border-border'}`}
                    >
                      <span
                        className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${
                          isActive ? 'bg-green-500' : 'bg-muted-foreground/30'
                        }`}
                      />
                      <p className="min-h-[2rem] text-xs font-medium leading-tight line-clamp-2 pr-4">
                        {t(`actions.${action.id}`)}
                      </p>
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleTimerClick(action.id, isRunning)}
                        className={`flex-1 rounded-md border px-2 py-1.5 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isActive
                            ? 'border-destructive bg-destructive text-destructive-foreground'
                            : 'border-primary bg-primary text-primary-foreground'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1 text-[11px] font-medium">
                          {isActive ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        </span>
                        <span className="block font-mono text-sm font-bold tabular-nums">
                          {formatTime(total)}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Single-puck-timer fallback keeps the standalone dashed total. */}
            {!showPuckGroup && showTimeMovingTotal && (
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
            <div className="grid grid-cols-3 gap-2">
              {counterActions.map((action) => {
                const counter = counters[action.id];
                const count = counter?.count ?? 0;
                const isBlocked = blockedCounterId === action.id;

                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={isBlocked}
                    onClick={() => {
                      if (isBlocked) return;
                      incrementCounter(action.id);
                      setBlockedCounterId(action.id);
                    }}
                    className={`relative flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-primary-foreground transition-colors active:bg-primary/80 ${
                      isBlocked
                        ? 'border-green-500 bg-green-500 cursor-not-allowed'
                        : 'border-primary bg-primary'
                    }`}
                  >
                    <Plus className="absolute top-1.5 right-1.5 h-3 w-3 text-primary-foreground/60" />
                    <span className="min-h-[2rem] flex items-center justify-center text-xs font-medium leading-tight line-clamp-2 pr-3">
                      {t(`actions.${action.id}`)}
                    </span>
                    <span className="text-2xl font-bold tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
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
