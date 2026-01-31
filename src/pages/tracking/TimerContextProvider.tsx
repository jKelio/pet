import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useTrackingContext } from './TrackingContext';
import { TimerContext, TimerState, CounterState, TimerData, CounterData } from './TimerContext';

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

    const wasteTimeRef = useRef(wasteTime);
    wasteTimeRef.current = wasteTime;

    const drillsRef = useRef(drills);
    drillsRef.current = drills;

    const isInitializingRef = useRef(false);

    const saveTimerData = useCallback((actionId: string, timerData: TimerData) => {
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
    }, [currentDrillIndex, setDrills]);

    const saveCounterData = useCallback((actionId: string, countOrData: number | CounterData) => {
        setDrills(prevDrills => prevDrills.map((drill, idx) => {
            if (idx !== currentDrillIndex) return drill;
            let counterData;
            if (typeof countOrData === 'number') {
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
    }, [currentDrillIndex, setDrills]);

    useEffect(() => {
        isInitializingRef.current = true;

        const drill = drillsRef.current[currentDrillIndex];
        const actions = drill?.actionButtons.filter(action => action.enabled) || [];

        const newTimers: Record<string, TimerState> = {};
        const newCounters: Record<string, CounterState> = {};

        actions.forEach(action => {
            if (action.type === 'timer') {
                const savedTimerData = drill?.timerData[action.id];
                newTimers[action.id] = {
                    isRunning: false,
                    startTime: null,
                    elapsedTime: 0,
                    totalTime: savedTimerData?.totalTime || 0,
                    timeSegments: savedTimerData?.timeSegments || []
                };
            } else if (action.type === 'counter') {
                const savedCounterData = drill?.counterData[action.id];
                newCounters[action.id] = {
                    count: savedCounterData?.count || 0,
                    timestamps: savedCounterData?.timestamps || []
                };
            }
        });

        setTimers(newTimers);
        setCounters(newCounters);
        setCurrentTimer(null);
        setWasteTime(drill?.wasteTime || 0);

        setTimeout(() => {
            isInitializingRef.current = false;
        }, 0);
    }, [currentDrillIndex]);

    useEffect(() => {
        if (!currentTimer) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        intervalRef.current = setInterval(() => {
            setTimers(prev => {
                const timer = prev[currentTimer];
                if (!timer?.isRunning) return prev;
                return {
                    ...prev,
                    [currentTimer]: {
                        ...timer,
                        elapsedTime: Date.now() - (timer.startTime || 0)
                    }
                };
            });
        }, 100);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [currentTimer]);

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

    useEffect(() => {
        if (wasteTimeRef.current > 0) {
            setDrills(prevDrills => prevDrills.map((drill, idx) => {
                if (idx !== currentDrillIndex) return drill;
                return { ...drill, wasteTime: wasteTimeRef.current };
            }));
        }
    }, [currentTimer, currentDrillIndex, setDrills]);

    const startTimer = (actionId: string) => {
        if (currentTimer && currentTimer !== actionId) {
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

            return {
                ...prev,
                [actionId]: updatedTimer
            };
        });
        setCurrentTimer(null);
    };

    useEffect(() => {
        if (isInitializingRef.current) return;

        Object.entries(timers).forEach(([actionId, timer]) => {
            if (timer.timeSegments.length > 0 && !timer.isRunning) {
                saveTimerData(actionId, {
                    totalTime: timer.totalTime,
                    timeSegments: timer.timeSegments
                });
            }
        });
    }, [timers, saveTimerData]);

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

    useEffect(() => {
        if (isInitializingRef.current) return;

        Object.entries(counters).forEach(([actionId, counter]) => {
            if (typeof counter.count === 'number') {
                saveCounterData(actionId, counter);
            }
        });
    }, [counters, saveCounterData]);

    const formatTime = (milliseconds: number): string => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const tenths = Math.floor((milliseconds % 1000) / 100);

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
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

    const value = {
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
