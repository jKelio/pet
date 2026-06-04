import { create } from 'zustand';
import type { Drill, TimeSegment, TimerData, CounterData } from '@pet/shared';
import {
  TIME_MOVING_WITH_PUCK,
  TIME_MOVING_WITHOUT_PUCK,
  PUCK_RELEASE_COUNTER_IDS,
} from '@pet/shared';
import { useTrackingStore } from './tracking.store.js';

export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number;
  totalTime: number;
  timeSegments: TimeSegment[];
}

export interface CounterState {
  count: number;
  timestamps: number[];
}

interface TimerStore {
  timers: Record<string, TimerState>;
  counters: Record<string, CounterState>;
  currentTimer: string | null;
  wasteTime: number;
  drillActive: boolean;
  // Segment tracking (not rendered directly — stored in state for action access)
  gapSegmentStart: number | null;
  wasteSegmentStart: number | null;

  tick: () => void;
  tickWasteTime: () => void;

  startTimer: (id: string) => void;
  pauseTimer: (id: string) => void;
  stopTimer: (id: string) => void;
  incrementCounter: (id: string) => void;
  decrementCounter: (id: string) => void;

  initForDrill: (drill: Drill) => void;
  resetAll: () => void;
  startTracking: () => void;
  startDrill: () => void;
  endDrill: () => void;
  finishTracking: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

export { formatTime };

export const useTimerStore = create<TimerStore>()((set, get) => ({
  timers: {},
  counters: {},
  currentTimer: null,
  wasteTime: 0,
  drillActive: false,
  gapSegmentStart: null,
  wasteSegmentStart: null,

  tick: () => {
    const { currentTimer, timers } = get();
    if (!currentTimer) return;
    const timer = timers[currentTimer];
    if (!timer?.isRunning || timer.startTime === null) return;
    set((state) => ({
      timers: {
        ...state.timers,
        [currentTimer]: {
          ...timer,
          elapsedTime: Date.now() - timer.startTime!,
        },
      },
    }));
  },

  tickWasteTime: () => set((state) => ({ wasteTime: state.wasteTime + 100 })),

  startTimer: (id) => {
    const { currentTimer, timers, drillActive, wasteSegmentStart, wasteTime } = get();

    // Stop the currently running timer if different
    if (currentTimer && currentTimer !== id) {
      get().stopTimer(currentTimer);
    }

    // Close in-drill waste segment if currently idle
    if (drillActive && wasteSegmentStart !== null) {
      const segEnd = Date.now();
      const newSeg: TimeSegment = {
        startTime: wasteSegmentStart,
        endTime: segEnd,
        duration: segEnd - wasteSegmentStart,
      };
      const { currentDrillIndex, drills, setDrills } = useTrackingStore.getState();
      const existingSegs = drills[currentDrillIndex]?.wasteTime?.timeSegments ?? [];
      setDrills((prev) =>
        prev.map((drill, idx) =>
          idx !== currentDrillIndex
            ? drill
            : {
                ...drill,
                wasteTime: {
                  totalTime: wasteTime,
                  timeSegments: [...existingSegs, newSeg],
                },
              },
        ),
      );
      set({ wasteSegmentStart: null });
    }

    const now = Date.now();
    const existing = timers[id] ?? {
      isRunning: false,
      startTime: null,
      elapsedTime: 0,
      totalTime: 0,
      timeSegments: [],
    };

    set((state) => ({
      currentTimer: id,
      timers: {
        ...state.timers,
        [id]: {
          ...existing,
          isRunning: true,
          startTime: now,
          elapsedTime: 0,
          timeSegments: [
            ...existing.timeSegments,
            { startTime: now, endTime: null, duration: 0 },
          ],
        },
      },
    }));
  },

  pauseTimer: (id) => {
    const { timers, drillActive } = get();
    const timer = timers[id];
    if (!timer?.isRunning) return;

    const now = Date.now();
    const updatedSegments = [...timer.timeSegments];
    if (updatedSegments.length > 0) {
      const last = updatedSegments[updatedSegments.length - 1];
      updatedSegments[updatedSegments.length - 1] = {
        ...last,
        endTime: now,
        duration: now - last.startTime,
      };
    }

    const updatedTimer: TimerState = {
      ...timer,
      isRunning: false,
      totalTime: timer.totalTime + timer.elapsedTime,
      elapsedTime: 0,
      startTime: null,
      timeSegments: updatedSegments,
    };

    set((state) => ({
      currentTimer: null,
      timers: { ...state.timers, [id]: updatedTimer },
      wasteSegmentStart: drillActive ? Date.now() : null,
    }));

    // Persist to tracking store
    const { currentDrillIndex, setDrills } = useTrackingStore.getState();
    const timerData: TimerData = {
      totalTime: updatedTimer.totalTime,
      timeSegments: updatedTimer.timeSegments,
    };
    setDrills((prev) =>
      prev.map((drill, idx) =>
        idx !== currentDrillIndex
          ? drill
          : { ...drill, timerData: { ...drill.timerData, [id]: timerData } },
      ),
    );
  },

  stopTimer: (id) => {
    const { timers, drillActive } = get();
    const timer = timers[id];
    if (!timer) return;

    const now = Date.now();
    const updatedSegments = [...timer.timeSegments];
    if (updatedSegments.length > 0) {
      const last = updatedSegments[updatedSegments.length - 1];
      if (last.endTime === null) {
        updatedSegments[updatedSegments.length - 1] = {
          ...last,
          endTime: now,
          duration: now - last.startTime,
        };
      }
    }

    const updatedTimer: TimerState = {
      ...timer,
      isRunning: false,
      totalTime: timer.totalTime + timer.elapsedTime,
      elapsedTime: 0,
      startTime: null,
      timeSegments: updatedSegments,
    };

    set((state) => ({
      currentTimer: state.currentTimer === id ? null : state.currentTimer,
      timers: { ...state.timers, [id]: updatedTimer },
      wasteSegmentStart: drillActive ? Date.now() : null,
    }));

    // Persist to tracking store
    const { currentDrillIndex, setDrills } = useTrackingStore.getState();
    const timerData: TimerData = {
      totalTime: updatedTimer.totalTime,
      timeSegments: updatedTimer.timeSegments,
    };
    setDrills((prev) =>
      prev.map((drill, idx) =>
        idx !== currentDrillIndex
          ? drill
          : { ...drill, timerData: { ...drill.timerData, [id]: timerData } },
      ),
    );
  },

  incrementCounter: (id) => {
    const { currentDrillIndex, setDrills } = useTrackingStore.getState();
    set((state) => {
      const prev = state.counters[id] ?? { count: 0, timestamps: [] };
      const updated: CounterState = {
        count: prev.count + 1,
        timestamps: [...prev.timestamps, Date.now()],
      };
      setDrills((drills) =>
        drills.map((drill, idx) =>
          idx !== currentDrillIndex
            ? drill
            : {
                ...drill,
                counterData: {
                  ...drill.counterData,
                  [id]: updated as CounterData,
                },
              },
        ),
      );
      return { counters: { ...state.counters, [id]: updated } };
    });

    // Coupling: a Pass or Shot releases the puck. Only while the tracked player
    // is moving WITH the puck does this switch Time Moving to "without puck"
    // (which stops the with-puck timer). Otherwise it stays a plain counter tap.
    if (
      (PUCK_RELEASE_COUNTER_IDS as readonly string[]).includes(id) &&
      get().currentTimer === TIME_MOVING_WITH_PUCK
    ) {
      get().startTimer(TIME_MOVING_WITHOUT_PUCK);
    }
  },

  decrementCounter: (id) => {
    const { currentDrillIndex, setDrills } = useTrackingStore.getState();
    set((state) => {
      const prev = state.counters[id] ?? { count: 0, timestamps: [] };
      const updated: CounterState = {
        count: Math.max(0, prev.count - 1),
        timestamps: prev.timestamps.slice(0, -1),
      };
      setDrills((drills) =>
        drills.map((drill, idx) =>
          idx !== currentDrillIndex
            ? drill
            : {
                ...drill,
                counterData: {
                  ...drill.counterData,
                  [id]: updated as CounterData,
                },
              },
        ),
      );
      return { counters: { ...state.counters, [id]: updated } };
    });
  },

  initForDrill: (drill) => {
    const newTimers: Record<string, TimerState> = {};
    const newCounters: Record<string, CounterState> = {};

    for (const action of drill.actionButtons.filter((a) => a.enabled)) {
      if (action.type === 'timer') {
        const saved = drill.timerData[action.id];
        newTimers[action.id] = {
          isRunning: false,
          startTime: null,
          elapsedTime: 0,
          totalTime: saved?.totalTime ?? 0,
          timeSegments: saved?.timeSegments ?? [],
        };
      } else {
        const saved = drill.counterData[action.id];
        newCounters[action.id] = {
          count: saved?.count ?? 0,
          timestamps: saved?.timestamps ?? [],
        };
      }
    }

    set({
      timers: newTimers,
      counters: newCounters,
      currentTimer: null,
      wasteTime: drill.wasteTime?.totalTime ?? 0,
      wasteSegmentStart: null,
    });
  },

  resetAll: () =>
    set({
      timers: {},
      counters: {},
      currentTimer: null,
      wasteTime: 0,
      drillActive: false,
      gapSegmentStart: null,
      wasteSegmentStart: null,
    }),

  startTracking: () => set({ gapSegmentStart: Date.now() }),

  startDrill: () => {
    const { gapSegmentStart } = get();

    // Close gap segment → save to practiceInfo.wasteTime
    if (gapSegmentStart !== null) {
      const segEnd = Date.now();
      const newSeg: TimeSegment = {
        startTime: gapSegmentStart,
        endTime: segEnd,
        duration: segEnd - gapSegmentStart,
      };
      useTrackingStore.getState().setPracticeInfo((prev) => ({
        ...prev,
        wasteTime: {
          totalTime: (prev.wasteTime?.totalTime ?? 0) + newSeg.duration,
          timeSegments: [...(prev.wasteTime?.timeSegments ?? []), newSeg],
        },
      }));
    }

    set({
      gapSegmentStart: null,
      wasteSegmentStart: Date.now(),
      drillActive: true,
    });
  },

  endDrill: () => {
    const { currentTimer, wasteSegmentStart, wasteTime } = get();

    if (currentTimer) {
      get().stopTimer(currentTimer);
      set({ wasteSegmentStart: null });
    }

    const { currentDrillIndex, drills, setDrills } = useTrackingStore.getState();
    const freshWasteStart = get().wasteSegmentStart;

    if (freshWasteStart !== null) {
      const segEnd = Date.now();
      const newSeg: TimeSegment = {
        startTime: freshWasteStart,
        endTime: segEnd,
        duration: segEnd - freshWasteStart,
      };
      const existingSegs = drills[currentDrillIndex]?.wasteTime?.timeSegments ?? [];
      setDrills((prev) =>
        prev.map((drill, idx) =>
          idx !== currentDrillIndex
            ? drill
            : {
                ...drill,
                wasteTime: {
                  totalTime: wasteTime,
                  timeSegments: [...existingSegs, newSeg],
                },
              },
        ),
      );
    }

    set({
      drillActive: false,
      wasteSegmentStart: null,
      gapSegmentStart: Date.now(),
    });
  },

  finishTracking: () => {
    const { gapSegmentStart } = get();
    if (gapSegmentStart !== null) {
      const segEnd = Date.now();
      const newSeg: TimeSegment = {
        startTime: gapSegmentStart,
        endTime: segEnd,
        duration: segEnd - gapSegmentStart,
      };
      useTrackingStore.getState().setPracticeInfo((prev) => ({
        ...prev,
        wasteTime: {
          totalTime: (prev.wasteTime?.totalTime ?? 0) + newSeg.duration,
          timeSegments: [...(prev.wasteTime?.timeSegments ?? []), newSeg],
        },
      }));
      set({ gapSegmentStart: null });
    }
  },
}));
