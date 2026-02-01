import { createContext, useContext, Dispatch, SetStateAction } from 'react';

export interface PracticeInfo {
    clubName: string;
    teamName: string;
    date: string;
    coachName: string;
    evaluation: number;
    athletesNumber: number;
    coachesNumber: number;
    totalTime: number;
    trackedPlayerName: string;
    drillsNumber: number;
}

export interface TimerData {
    totalTime: number;
    timeSegments: Array<{
        startTime: number;
        endTime: number | null;
        duration: number;
    }>;
}

export interface CounterData {
    count: number;
    timestamps: number[];
}

export interface Drill {
    id: number;
    tags: Set<string>;
    actionButtons: ActionButton[];
    timerData: Record<string, TimerData>;
    counterData: Record<string, CounterData>;
    wasteTime: number;
}

export interface ActionButton {
    id: string;
    type: 'timer' | 'counter';
    enabled: boolean;
}

export type TrackingMode = 'practiceInfo' | 'drills' | 'timeWatcher';

export interface TrackingContextType {
    practiceInfo: PracticeInfo;
    setPracticeInfo: Dispatch<SetStateAction<PracticeInfo>>;
    drills: Drill[];
    setDrills: Dispatch<SetStateAction<Drill[]>>;
    currentDrillIndex: number;
    setCurrentDrillIndex: Dispatch<SetStateAction<number>>;
    mode: TrackingMode;
    setMode: Dispatch<SetStateAction<TrackingMode>>;
    goToNextStep: () => void;
    goToPrevStep: () => void;
    updateDrillAction: (drillIndex: number, actionId: string, newAction: Partial<ActionButton>) => void;
}

const initialActionButtons: ActionButton[] = [
    { id: 'explanation', type: 'timer', enabled: true },
    { id: 'demonstration', type: 'timer', enabled: true },
    { id: 'feedbackteam', type: 'timer', enabled: true },
    { id: 'timemoving', type: 'timer', enabled: true },
    { id: 'repetition', type: 'counter', enabled: true },
    { id: 'feedbackplayers', type: 'counter', enabled: true },
    { id: 'shots', type: 'counter', enabled: true },
    { id: 'passes', type: 'counter', enabled: true }
];

export const createDrills = (drillsNumber: number): Drill[] => {
    return Array.from(Array(drillsNumber).keys()).map(n => ({
        id: n + 1,
        tags: new Set(),
        actionButtons: initialActionButtons.map(a => ({ ...a })),
        timerData: {},
        counterData: {},
        wasteTime: 0
    }));
};

export const TrackingContext = createContext<TrackingContextType>({
    practiceInfo: {
        clubName: '',
        teamName: '',
        date: new Date().toISOString(),
        coachName: '',
        evaluation: 0,
        athletesNumber: 0,
        coachesNumber: 0,
        totalTime: 0,
        trackedPlayerName: '',
        drillsNumber: 0,
    },
    setPracticeInfo: () => {},
    drills: [],
    setDrills: () => {},
    currentDrillIndex: 0,
    setCurrentDrillIndex: () => {},
    mode: 'practiceInfo',
    setMode: () => {},
    goToNextStep: () => {},
    goToPrevStep: () => {},
    updateDrillAction: () => {}
});

export const useTrackingContext = () => {
    const context = useContext(TrackingContext);
    const {
        practiceInfo,
        setPracticeInfo,
        drills,
        setDrills,
        currentDrillIndex,
        setCurrentDrillIndex,
        mode,
        setMode,
        goToNextStep,
        goToPrevStep,
        updateDrillAction
    } = context;

    const initDrills = (drillsNumber: number) => {
        setDrills(createDrills(drillsNumber));
    };

    const getCurrentDrill = () => {
        return drills[currentDrillIndex];
    };

    const updateCurrentDrill = (updatedDrill: Drill) => {
        setDrills([
            ...drills.slice(0, currentDrillIndex),
            updatedDrill,
            ...drills.slice(currentDrillIndex + 1)
        ]);
    };

    const resetAllData = () => {
        setPracticeInfo({
            clubName: '',
            teamName: '',
            date: new Date().toISOString(),
            coachName: '',
            evaluation: 0,
            athletesNumber: 0,
            coachesNumber: 0,
            totalTime: 0,
            trackedPlayerName: '',
            drillsNumber: 0,
        });
        setDrills([]);
        setCurrentDrillIndex(0);
        setMode('practiceInfo');
    };

    return {
        practiceInfo,
        setPracticeInfo,
        drills,
        setDrills,
        currentDrillIndex,
        setCurrentDrillIndex,
        mode,
        setMode,
        goToNextStep,
        goToPrevStep,
        initDrills,
        getCurrentDrill,
        updateCurrentDrill,
        updateDrillAction,
        resetAllData
    };
};
