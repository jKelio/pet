import React, {Dispatch, ReactNode, SetStateAction, useContext, useState} from "react";
import {createContext} from "react";

const initialActionButtons: ActionButton[] = [
    {
        id: 'explanation',
        type: 'timer',
        enabled: true
    },
    {
        id: 'demonstration',
        type: 'timer',
        enabled: true
    },
    {
        id: 'feedbackteam',
        type: 'timer',
        enabled: true
    },
    {
        id: 'changesideone',
        type: 'timer',
        enabled: true
    },
    {
        id: 'changesidetwo',
        type: 'timer',
        enabled: true
    },
    {
        id: 'timemoving',
        type: 'counter',
        enabled: true
    },
    {
        id: 'repetition',
        type: 'counter',
        enabled: true
    },
    {
        id: 'feedbackplayers',
        type: 'counter',
        enabled: true
    },
    {
        id: 'shots',
        type: 'counter',
        enabled: true
    },
    {
        id: 'passes',
        type: 'counter',
        enabled: true
    }
];

const createDrills = (drillsNumber: number) => {
    return Array.from(Array(drillsNumber).keys()).map(n => ({
        id: n + 1,
        tags: new Set(),
        actionButtons: initialActionButtons.map(a => ({ ...a })),
        timerData: {},
        counterData: {},
        wasteTime: 0
    } as Drill));
}

interface PracticeInfo {
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

interface TimerData {
    totalTime: number;
    timeSegments: Array<{
        startTime: number;
        endTime: number | null;
        duration: number;
    }>;
}

interface CounterData {
    count: number;
}

interface Drill {
    id: number;
    tags: Set<string>;
    actionButtons: ActionButton[];
    timerData: Record<string, TimerData>;
    counterData: Record<string, CounterData>;
    wasteTime: number;
}

interface ActionButton {
    id: string;
    type: 'timer' | 'counter'
    enabled: boolean
}

export type TrackingMode = 'practiceInfo' | 'drills' | 'timeWatcher';

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
        updateDrillAction
    };
}

const TrackingContext = createContext<{
    practiceInfo: PracticeInfo,
    setPracticeInfo: Dispatch<SetStateAction<PracticeInfo>>,
    drills: Drill[],
    setDrills: Dispatch<SetStateAction<Drill[]>>,
    currentDrillIndex: number,
    setCurrentDrillIndex: Dispatch<SetStateAction<number>>,
    mode: TrackingMode,
    setMode: Dispatch<SetStateAction<TrackingMode>>,
    goToNextStep: () => void,
    goToPrevStep: () => void,
    updateDrillAction: (drillIndex: number, actionId: string, newAction: Partial<ActionButton>) => void
}>({
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
    drills: [] as Drill[],
    setDrills: () => {},
    currentDrillIndex: 0,
    setCurrentDrillIndex: () => {},
    mode: 'practiceInfo',
    setMode: () => {},
    goToNextStep: () => {},
    goToPrevStep: () => {},
    updateDrillAction: () => {}
});

const TrackingContextProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [practiceInfo, setPracticeInfo] = useState<PracticeInfo>({
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
    const [drills, setDrills] = useState<Drill[]>([]);
    const [currentDrillIndex, setCurrentDrillIndex] = useState<number>(0);
    const [mode, setMode] = useState<TrackingMode>('practiceInfo');

    const goToNextStep = () => {
        setMode((prev) => {
            switch (prev) {
                case 'practiceInfo':
                    return 'drills';
                case 'drills':
                    setCurrentDrillIndex(0); // Reset auf ersten Drill beim Wechsel zu timeWatcher
                    return 'timeWatcher';
                case 'timeWatcher':
                    return 'timeWatcher'; // bleibt
                default:
                    return prev;
            }
        });
    };

    const goToPrevStep = () => {
        setMode((prev) => {
            switch (prev) {
                case 'drills':
                    return 'practiceInfo';
                case 'timeWatcher':
                    return 'drills';
                case 'practiceInfo':
                    return 'practiceInfo'; // bleibt
                default:
                    return prev;
            }
        });
    };

    // Neue Funktion zum gezielten Updaten einer Action eines Drills
    const updateDrillAction = (drillIndex: number, actionId: string, newAction: Partial<ActionButton>) => {
        setDrills(prevDrills => prevDrills.map((drill, idx) => {
            if (idx !== drillIndex) return drill;
            return {
                ...drill,
                actionButtons: drill.actionButtons.map(action =>
                    action.id === actionId ? { ...action, ...newAction } : action
                )
            };
        }));
    };

    return <TrackingContext.Provider value={{
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
    }}>
        {children}
    </TrackingContext.Provider>
};
export default TrackingContextProvider;
