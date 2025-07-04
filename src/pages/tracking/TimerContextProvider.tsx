import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useTrackingContext } from './TrackingContextProvider';

interface TimerState {
    isRunning: boolean;
    startTime: number | null;
    elapsedTime: number;
    totalTime: number;
    timeSegments: Array<{
        startTime: number;
        endTime: number | null;
        duration: number;
    }>;
}

interface CounterState {
    count: number;
}

interface TimerContextType {
    timers: Record<string, TimerState>;
    counters: Record<string, CounterState>;
    currentTimer: string | null;
    wasteTime: number;
    startTimer: (actionId: string) => void;
    pauseTimer: (actionId: string) => void;
    stopTimer: (actionId: string) => void;
    resetTimer: (actionId: string) => void;
    incrementCounter: (actionId: string) => void;
    decrementCounter: (actionId: string) => void;
    resetCounter: (actionId: string) => void;
    resetWasteTime: () => void;
    formatTime: (milliseconds: number) => string;
    saveTimerData: (actionId: string, timerData: any) => void;
    saveCounterData: (actionId: string, count: number) => void;
    saveWasteTime: (wasteTime: number) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const useTimerContext = () => {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error('useTimerContext must be used within a TimerContextProvider');
    }
    return context;
};

interface TimerContextProviderProps {
    children: ReactNode;
}

const TimerContextProvider: React.FC<TimerContextProviderProps> = ({ children }) => {
    const { drills, currentDrillIndex, setDrills, practiceInfo } = useTrackingContext();
    
    const [timers, setTimers] = useState<Record<string, TimerState>>({});
    const [counters, setCounters] = useState<Record<string, CounterState>>({});
    const [currentTimer, setCurrentTimer] = useState<string | null>(null);
    const [wasteTime, setWasteTime] = useState<number>(0);
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const wasteTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const currentDrill = drills[currentDrillIndex];
    const enabledActions = currentDrill?.actionButtons.filter(action => action.enabled) || [];

    // Initialize timers and counters for enabled actions
    useEffect(() => {
        const newTimers: Record<string, TimerState> = {};
        const newCounters: Record<string, CounterState> = {};

        enabledActions.forEach(action => {
            if (action.type === 'timer') {
                const savedTimerData = currentDrill?.timerData[action.id];
                newTimers[action.id] = {
                    isRunning: false,
                    startTime: null,
                    elapsedTime: 0,
                    totalTime: savedTimerData?.totalTime || 0,
                    timeSegments: savedTimerData?.timeSegments || []
                };
            } else if (action.type === 'counter') {
                const savedCounterData = currentDrill?.counterData[action.id];
                newCounters[action.id] = {
                    count: savedCounterData?.count || 0
                };
            }
        });

        setTimers(newTimers);
        setCounters(newCounters);
        setCurrentTimer(null);
        setWasteTime(currentDrill?.wasteTime || 0); // Load saved waste time
    }, [currentDrillIndex, currentDrill]);

    // Timer logic
    useEffect(() => {
        if (currentTimer && timers[currentTimer]?.isRunning) {
            intervalRef.current = setInterval(() => {
                setTimers(prev => ({
                    ...prev,
                    [currentTimer]: {
                        ...prev[currentTimer],
                        elapsedTime: Date.now() - (prev[currentTimer].startTime || 0)
                    }
                }));
            }, 100);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [currentTimer]);

    // Waste time tracking
    useEffect(() => {
        if (!currentTimer) {
            // No timer running - start waste time tracking
            wasteTimeIntervalRef.current = setInterval(() => {
                setWasteTime(prev => prev + 100);
            }, 100);
        } else {
            // Timer running - stop waste time tracking
            if (wasteTimeIntervalRef.current) {
                clearInterval(wasteTimeIntervalRef.current);
                wasteTimeIntervalRef.current = null;
            }
        }

        return () => {
            if (wasteTimeIntervalRef.current) {
                clearInterval(wasteTimeIntervalRef.current);
            }
        };
    }, [currentTimer]);

    const startTimer = (actionId: string) => {
        if (currentTimer && currentTimer !== actionId) {
            // Stop current timer
            stopTimer(currentTimer);
        }

        const now = Date.now();
        // Trainingsstartzeit aus practiceInfo holen
        if (
            currentDrillIndex === 0 &&
            (currentDrill?.wasteTime === 0 || currentDrill?.wasteTime === undefined)
        ) {
            const trainingStart = new Date(practiceInfo.date).getTime();
            const diff = now - trainingStart;
            if (diff > 0) {
                setWasteTime(diff);
                saveWasteTime(diff);
            }
        }

        setTimers(prev => ({
            ...prev,
            [actionId]: {
                ...prev[actionId],
                isRunning: true,
                startTime: now,
                elapsedTime: 0,
                timeSegments: [
                    ...prev[actionId].timeSegments,
                    {
                        startTime: now,
                        endTime: null,
                        duration: 0
                    }
                ]
            }
        }));
        setCurrentTimer(actionId);
    };

    const pauseTimer = (actionId: string) => {
        const now = Date.now();
        setTimers(prev => {
            const timer = prev[actionId];
            if (!timer.isRunning) return prev;

            // Update the last time segment
            const updatedSegments = [...timer.timeSegments];
            if (updatedSegments.length > 0) {
                const lastSegment = updatedSegments[updatedSegments.length - 1];
                lastSegment.endTime = now;
                lastSegment.duration = now - lastSegment.startTime;
            }

            const updatedTimer = {
                ...timer,
                isRunning: false,
                totalTime: timer.totalTime + timer.elapsedTime,
                elapsedTime: 0,
                startTime: null,
                timeSegments: updatedSegments
            };

            // Save timer data to tracking context
            saveTimerData(actionId, {
                totalTime: updatedTimer.totalTime,
                timeSegments: updatedTimer.timeSegments
            });

            return {
                ...prev,
                [actionId]: updatedTimer
            };
        });
        setCurrentTimer(null);
    };

    const stopTimer = (actionId: string) => {
        const now = Date.now();
        setTimers(prev => {
            const timer = prev[actionId];
            
            // Update the last time segment
            const updatedSegments = [...timer.timeSegments];
            if (updatedSegments.length > 0) {
                const lastSegment = updatedSegments[updatedSegments.length - 1];
                lastSegment.endTime = now;
                lastSegment.duration = now - lastSegment.startTime;
            }

            const updatedTimer = {
                ...timer,
                isRunning: false,
                totalTime: timer.totalTime + timer.elapsedTime,
                elapsedTime: 0,
                startTime: null,
                timeSegments: updatedSegments
            };

            // Save timer data to tracking context
            saveTimerData(actionId, {
                totalTime: updatedTimer.totalTime,
                timeSegments: updatedTimer.timeSegments
            });

            return {
                ...prev,
                [actionId]: updatedTimer
            };
        });
        setCurrentTimer(null);
    };

    const resetTimer = (actionId: string) => {
        setTimers(prev => ({
            ...prev,
            [actionId]: {
                isRunning: false,
                startTime: null,
                elapsedTime: 0,
                totalTime: 0,
                timeSegments: []
            }
        }));
    };

    const incrementCounter = (actionId: string) => {
        setCounters(prev => {
            const newCount = prev[actionId].count + 1;
            const updatedCounters = {
                ...prev,
                [actionId]: {
                    count: newCount
                }
            };
            
            // Save counter data to tracking context
            saveCounterData(actionId, newCount);
            
            return updatedCounters;
        });
    };

    const decrementCounter = (actionId: string) => {
        setCounters(prev => {
            const newCount = Math.max(0, prev[actionId].count - 1);
            const updatedCounters = {
                ...prev,
                [actionId]: {
                    count: newCount
                }
            };
            
            // Save counter data to tracking context
            saveCounterData(actionId, newCount);
            
            return updatedCounters;
        });
    };

    const resetCounter = (actionId: string) => {
        setCounters(prev => ({
            ...prev,
            [actionId]: {
                count: 0
            }
        }));
    };

    const resetWasteTime = () => {
        setWasteTime(0);
        saveWasteTime(0);
    };

    const formatTime = (milliseconds: number): string => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const tenths = Math.floor((milliseconds % 1000) / 100);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
    };

    const saveTimerData = (actionId: string, timerData: any) => {
        setDrills(prevDrills => prevDrills.map((drill, idx) => {
            if (idx !== currentDrillIndex) return drill;
            return {
                ...drill,
                timerData: {
                    ...drill.timerData,
                    [actionId]: timerData
                }
            };
        }));
    };

    const saveCounterData = (actionId: string, count: number) => {
        setDrills(prevDrills => prevDrills.map((drill, idx) => {
            if (idx !== currentDrillIndex) return drill;
            return {
                ...drill,
                counterData: {
                    ...drill.counterData,
                    [actionId]: { count }
                }
            };
        }));
    };

    const saveWasteTime = (wasteTime: number) => {
        setDrills(prevDrills => prevDrills.map((drill, idx) => {
            if (idx !== currentDrillIndex) return drill;
            return {
                ...drill,
                wasteTime
            };
        }));
    };

    const value: TimerContextType = {
        timers,
        counters,
        currentTimer,
        wasteTime,
        startTimer,
        pauseTimer,
        stopTimer,
        resetTimer,
        incrementCounter,
        decrementCounter,
        resetCounter,
        resetWasteTime,
        formatTime,
        saveTimerData,
        saveCounterData,
        saveWasteTime
    };

    return (
        <TimerContext.Provider value={value}>
            {children}
        </TimerContext.Provider>
    );
};

export default TimerContextProvider; 