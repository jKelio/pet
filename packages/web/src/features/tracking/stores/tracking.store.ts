import { create } from 'zustand';
import { DEFAULT_ACTION_BUTTONS } from '@pet/shared';
import type { PracticeInfo, Drill, ActionButton, TrackingMode, SessionType } from '@pet/shared';

function generateId(): string {
  return crypto.randomUUID();
}

function createDrills(n: number): Drill[] {
  return Array.from({ length: n }, (_, i) => createOneDrill(i + 1));
}

function createOneDrill(id: number): Drill {
  return {
    id,
    tags: [],
    actionButtons: DEFAULT_ACTION_BUTTONS.map((a) => ({ ...a })),
    timerData: {},
    counterData: {},
    wasteTime: { totalTime: 0, timeSegments: [] },
  };
}

const initialPracticeInfo: PracticeInfo = {
  clubName: '',
  teamName: '',
  date: new Date().toISOString(),
  coachName: '',
  athletesNumber: 0,
  coachesNumber: 0,
  totalTime: 0,
  trackedPlayerName: '',
  drillsNumber: 0,
  wasteTime: { totalTime: 0, timeSegments: [] },
};

interface TrackingStore {
  sessionId: string;
  mode: TrackingMode;
  sessionType: SessionType;
  practiceInfo: PracticeInfo;
  drills: Drill[];
  currentDrillIndex: number;
  /** Tracking a curated External Team (premium): the session binds to a kind='external' Team and syncs. */
  trackExternal: boolean;

  setPracticeInfo: (info: PracticeInfo | ((prev: PracticeInfo) => PracticeInfo)) => void;
  setDrills: (drills: Drill[] | ((prev: Drill[]) => Drill[])) => void;
  setCurrentDrillIndex: (i: number) => void;
  setSessionType: (t: SessionType) => void;
  setTrackExternal: (v: boolean) => void;
  initDrills: (n: number) => void;
  appendDrill: () => void;
  updateDrillAction: (drillIndex: number, actionId: string, partial: Partial<ActionButton>) => void;
  updateCurrentDrill: (drill: Drill) => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  resetAllData: () => void;
  /** Restore session state from a persisted draft */
  restoreFromDraft: (sessionId: string, practiceInfo: PracticeInfo, drills: Drill[], currentDrillIndex?: number) => void;
}

export const useTrackingStore = create<TrackingStore>()((set, get) => ({
  sessionId: generateId(),
  mode: 'practiceInfo',
  sessionType: 'planned',
  practiceInfo: { ...initialPracticeInfo },
  drills: [],
  currentDrillIndex: 0,
  trackExternal: false,

  setPracticeInfo: (info) =>
    set((state) => ({
      practiceInfo: typeof info === 'function' ? info(state.practiceInfo) : info,
    })),

  setDrills: (drills) =>
    set((state) => ({
      drills: typeof drills === 'function' ? drills(state.drills) : drills,
    })),

  setCurrentDrillIndex: (i) => set({ currentDrillIndex: i }),

  setSessionType: (t) =>
    set((state) => ({
      sessionType: t,
      practiceInfo: { ...state.practiceInfo, sessionType: t },
    })),

  setTrackExternal: (v) => set({ trackExternal: v }),

  initDrills: (n) => {
    const current = get().drills;
    if (current.length === n) return;
    set({ drills: createDrills(n) });
  },

  appendDrill: () =>
    set((state) => ({
      drills: [...state.drills, createOneDrill(state.drills.length + 1)],
    })),

  updateDrillAction: (drillIndex, actionId, partial) =>
    set((state) => ({
      drills: state.drills.map((drill, idx) => {
        if (idx !== drillIndex) return drill;
        return {
          ...drill,
          actionButtons: drill.actionButtons.map((a) =>
            a.id === actionId ? { ...a, ...partial } : a,
          ),
        };
      }),
    })),

  updateCurrentDrill: (drill) =>
    set((state) => ({
      drills: state.drills.map((d, i) => (i === state.currentDrillIndex ? drill : d)),
    })),

  goToNextStep: () =>
    set((state) => {
      switch (state.mode) {
        case 'practiceInfo':
          if (state.sessionType === 'open') {
            return {
              mode: 'timeWatcher',
              currentDrillIndex: 0,
              drills: state.drills.length === 0 ? [createOneDrill(1)] : state.drills,
            };
          }
          return { mode: 'drills' };
        case 'drills':
          return { mode: 'timeWatcher', currentDrillIndex: 0 };
        default:
          return {};
      }
    }),

  goToPrevStep: () =>
    set((state) => {
      switch (state.mode) {
        case 'drills':
          return { mode: 'practiceInfo' };
        default:
          return {};
      }
    }),

  resetAllData: () =>
    set({
      sessionId: generateId(),
      mode: 'practiceInfo',
      sessionType: 'planned',
      practiceInfo: { ...initialPracticeInfo, date: new Date().toISOString() },
      drills: [],
      currentDrillIndex: 0,
      trackExternal: false,
    }),

  restoreFromDraft: (sessionId, practiceInfo, drills, currentDrillIndex = 0) =>
    set({
      sessionId,
      practiceInfo,
      drills,
      sessionType: practiceInfo.sessionType ?? 'planned',
      mode: drills.length > 0 ? 'timeWatcher' : 'practiceInfo',
      currentDrillIndex,
      trackExternal: false,
    }),
}));
