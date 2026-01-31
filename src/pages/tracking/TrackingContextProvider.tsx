import React, { useState } from 'react';
import {
    TrackingContext,
    TrackingMode,
    PracticeInfo,
    Drill,
    ActionButton
} from './TrackingContext';

const TrackingContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
                    setCurrentDrillIndex(0);
                    return 'timeWatcher';
                case 'timeWatcher':
                    return 'timeWatcher';
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
                    return 'practiceInfo';
                default:
                    return prev;
            }
        });
    };

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

    return (
        <TrackingContext.Provider value={{
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
    );
};

export default TrackingContextProvider;
