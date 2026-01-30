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
    timestamps: number[];
}

interface TimerContextType {
    timers: Record<string, TimerState>;
    counters: Record<string, CounterState>;
    currentTimer: string | null;
    wasteTime: number;
    wasteTrackingActive: boolean;
    setWasteTrackingActive: (active: boolean) => void;
    startTimer: (actionId: string) => void;
    pauseTimer: (actionId: string) => void;
    stopTimer: (actionId: string) => void;
    incrementCounter: (actionId: string) => void;
    decrementCounter: (actionId: string) => void;
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
    const { drills, currentDrillIndex, setDrills } = useTrackingContext();
    
    const [timers, setTimers] = useState<Record<string, TimerState>>({});
    const [counters, setCounters] = useState<Record<string, CounterState>>({});
    const [currentTimer, setCurrentTimer] = useState<string | null>(null);
    const [wasteTime, setWasteTime] = useState<number>(0);
    const [wasteTrackingActive, setWasteTrackingActive] = useState<boolean>(false);
    
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
                    count: savedCounterData?.count || 0,
                    timestamps: savedCounterData?.timestamps || []
                };
            }
        });

        setTimers(newTimers);
        setCounters(newCounters);
        setCurrentTimer(null);
        setWasteTime(currentDrill?.wasteTime || 0); // Load saved waste time
    }, [currentDrillIndex]);

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
        if (wasteTrackingActive && !currentTimer) {
            wasteTimeIntervalRef.current = setInterval(() => {
                setWasteTime(prev => prev + 100);
            }, 100);
        } else {
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
    }, [wasteTrackingActive, currentTimer]);

    // Save waste time to drill when timer starts/stops or drill changes
    useEffect(() => {
        if (wasteTime > 0) {
            setDrills(prevDrills => prevDrills.map((drill, idx) => {
                if (idx !== currentDrillIndex) return drill;
                return { ...drill, wasteTime };
            }));
        }
    }, [currentTimer, currentDrillIndex]);

    const startTimer = (actionId: string) => {
        if (currentTimer && currentTimer !== actionId) {
            // Stop current timer
            stopTimer(currentTimer);
        }

        const now = Date.now();

        setTimers(prev => {
            const timer = prev[actionId] || {
                isRunning: false,
                startTime: null,
                elapsedTime: 0,
                totalTime: 0,
                timeSegments: []
            };
            return {
                ...prev,
                [actionId]: {
                    ...timer,
                    isRunning: true,
                    startTime: now,
                    elapsedTime: 0,
                    timeSegments: [
                        ...timer.timeSegments,
                        {
                            startTime: now,
                            endTime: null,
                            duration: 0
                        }
                    ]
                }
            };
        });
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

            // Save timer data to tracking context (verschoben in useEffect)
            // saveTimerData(actionId, {
            //     totalTime: updatedTimer.totalTime,
            //     timeSegments: updatedTimer.timeSegments
            // });

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

            // Save timer data to tracking context (verschoben in useEffect)
            // saveTimerData(actionId, {
            //     totalTime: updatedTimer.totalTime,
            //     timeSegments: updatedTimer.timeSegments
            // });

            return {
                ...prev,
                [actionId]: updatedTimer
            };
        });
        setCurrentTimer(null);
    };

    // useEffect zum Speichern der Timer-Daten nach State-Update
    React.useEffect(() => {
        Object.entries(timers).forEach(([actionId, timer]) => {
            if (timer.timeSegments.length > 0) {
                const lastSegment = timer.timeSegments[timer.timeSegments.length - 1];
                // Speichere nur, wenn der Timer nicht läuft (z.B. nach Pause oder Stop)
                if (!timer.isRunning) {
                    saveTimerData(actionId, {
                        totalTime: timer.totalTime,
                        timeSegments: timer.timeSegments
                    });
                }
            }
        });
    }, [timers]);



    const incrementCounter = (actionId: string) => {
        setCounters(prev => {
            const prevTimestamps = prev[actionId]?.timestamps ?? [];
            const newCount = (prev[actionId]?.count ?? 0) + 1;
            const updatedCounters = {
                ...prev,
                [actionId]: {
                    count: newCount,
                    timestamps: [...prevTimestamps, Date.now()]
                }
            };
            return updatedCounters;
        });
    };

    const decrementCounter = (actionId: string) => {
        setCounters(prev => {
            const prevTimestamps = prev[actionId]?.timestamps ?? [];
            const newCount = Math.max(0, (prev[actionId]?.count ?? 0) - 1);
            const updatedCounters = {
                ...prev,
                [actionId]: {
                    count: newCount,
                    timestamps: prevTimestamps.slice(0, -1)
                }
            };
            return updatedCounters;
        });
    };

    // useEffect zum Speichern der Counter-Daten nach State-Update
    React.useEffect(() => {
        Object.entries(counters).forEach(([actionId, counter]) => {
            if (typeof counter.count === 'number') {
                saveCounterData(actionId, counter);
            }
        });
    }, [counters]);



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

    const saveCounterData = (actionId: string, countOrData: any) => {
        setDrills(prevDrills => prevDrills.map((drill, idx) => {
            if (idx !== currentDrillIndex) return drill;
            let counterData;
            if (typeof countOrData === 'number') {
                // Backward compatibility: falls nur count übergeben wird
                counterData = { count: countOrData, timestamps: [] };
            } else {
                counterData = countOrData;
            }
            return {
                ...drill,
                counterData: {
                    ...drill.counterData,
                    [actionId]: counterData
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
        wasteTrackingActive,
        setWasteTrackingActive,
        startTimer,
        pauseTimer,
        stopTimer,
        incrementCounter,
        decrementCounter,
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