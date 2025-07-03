import React, {Dispatch, ReactNode, SetStateAction, useCallback, useContext, useState} from "react";
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
        id: 'gettingstarted',
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
        actionButtons: initialActionButtons
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

interface Drill {
    id: number;
    tags: Set<string>;
    actionButtons: ActionButton[]
}

interface ActionButton {
    id: string;
    type: 'timer' | 'counter'
    enabled: boolean
}

export const useTrackingContext = () => {
    const {
        practiceInfo,
        setPracticeInfo,
        drills,
        setDrills,
        currentDrillIndex,
        setCurrentDrillIndex
    } = useContext(TrackingContext);

    const initDrills = useCallback((drillsNumber: number) => {
        setDrills(createDrills(drillsNumber));
    }, [setDrills]);

    const getCurrentDrill = useCallback(() => {
        return drills[currentDrillIndex];
    }, [currentDrillIndex, drills])

    const updateCurrentDrill = useCallback((updatedDrill: Drill) => {
        setDrills([
            ...drills.slice(0, currentDrillIndex),
            updatedDrill,
            ...drills.slice(currentDrillIndex)
        ]);
    }, [currentDrillIndex, drills, setDrills]);

    return {practiceInfo, setPracticeInfo, drills, setDrills, currentDrillIndex, setCurrentDrillIndex, initDrills, getCurrentDrill, updateCurrentDrill};
}

const TrackingContext = createContext<{
    practiceInfo: PracticeInfo,
    setPracticeInfo: Dispatch<SetStateAction<PracticeInfo>>,
    drills: Drill[],
    setDrills: Dispatch<SetStateAction<Drill[]>>,
    currentDrillIndex: number,
    setCurrentDrillIndex: Dispatch<SetStateAction<number>>
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
    setPracticeInfo: () => {
    },
    drills: [] as Drill[],
    setDrills: () => {
    },
    currentDrillIndex: 0,
    setCurrentDrillIndex: () => {
    }
});

const TrackingContextProvider: React.FC<{ children: ReactNode[] }> = ({children}) => {
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
    const [currentDrillIndex, setCurrentDrillIndex] = useState<number>(0)


    return <TrackingContext.Provider value={{
        practiceInfo,
        setPracticeInfo,
        drills,
        setDrills,
        currentDrillIndex,
        setCurrentDrillIndex
    }}>
        {children}
    </TrackingContext.Provider>
};
export default TrackingContextProvider;
