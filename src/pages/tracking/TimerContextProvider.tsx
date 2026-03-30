import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useTrackingContext } from './TrackingContext';
import { TimerContext, TimerState, CounterState, TimerData, CounterData } from './TimerContext';

interface TimerContextProviderProps {
    children: ReactNode;
}

const TimerContextProvider: React.FC<TimerContextProviderProps> = ({ children }) => {
    const { drills, currentDrillIndex, setDrills, practiceInfo, setPracticeInfo } = useTrackingContext();

    const [timers, setTimers] = useState<Record<string, TimerState>>({});
    const [counters, setCounters] = useState<Record<string, CounterState>>({});
    const [currentTimer, setCurrentTimer] = useState<string | null>(null);
    const [wasteTime, setWasteTime] = useState<number>(0);
    const [drillActive, setDrillActive] = useState<boolean>(false);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const wasteTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const wasteTimeRef = useRef(wasteTime);
    wasteTimeRef.current = wasteTime;

    const drillActiveRef = useRef(drillActive);
    drillActiveRef.current = drillActive;

    const currentTimerRef = useRef(currentTimer);
    currentTimerRef.current = currentTimer;

    const drillsRef = useRef(drills);
    drillsRef.current = drills;

    // Tracks the start of the current gap period (between drills / pre-training / post-training)
    const gapSegmentStartRef = useRef<number | null>(null);
    // Tracks the start of the current in-drill idle period
    const wasteSegmentStartRef = useRef<number | null>(null);

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

    // Reset all timer data when drills array becomes empty
    useEffect(() => {
        if (drills.length === 0) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (wasteTimeIntervalRef.current) {
                clearInterval(wasteTimeIntervalRef.current);
                wasteTimeIntervalRef.current = null;
            }
            setTimers({});
            setCounters({});
            setCurrentTimer(null);
            setWasteTime(0);
            setDrillActive(false);
            gapSegmentStartRef.current = null;
            wasteSegmentStartRef.current = null;
        }
    }, [drills.length]);

    useEffect(() => {
        if (drills.length === 0) return;

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
        setWasteTime(drill?.wasteTime?.totalTime || 0);

        setTimeout(() => {
            isInitializingRef.current = false;
        }, 0);
    }, [currentDrillIndex, drills.length]);

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

    // In-drill waste time display interval (runs when drill is active and no timer is running)
    useEffect(() => {
        if (drillActive && !currentTimer) {
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
    }, [drillActive, currentTimer]);

    const startTimer = (actionId: string) => {
        if (currentTimer && currentTimer !== actionId) {
            stopTimer(currentTimer);
        }

        // Close in-drill waste segment if currently idle
        if (drillActiveRef.current && wasteSegmentStartRef.current !== null) {
            const segEnd = Date.now();
            const newSeg = {
                startTime: wasteSegmentStartRef.current,
                endTime: segEnd,
                duration: segEnd - wasteSegmentStartRef.current
            };
            const existingSegs = drillsRef.current[currentDrillIndex]?.wasteTime?.timeSegments || [];
            setDrills(prev => prev.map((drill, idx) => {
                if (idx !== currentDrillIndex) return drill;
                return {
                    ...drill,
                    wasteTime: {
                        totalTime: wasteTimeRef.current,
                        timeSegments: [...existingSegs, newSeg]
                    }
                };
            }));
            wasteSegmentStartRef.current = null;
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

        // Start in-drill waste segment if drill is active
        if (drillActiveRef.current) {
            wasteSegmentStartRef.current = Date.now();
        }
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

        // Start in-drill waste segment if drill is active
        if (drillActiveRef.current) {
            wasteSegmentStartRef.current = Date.now();
        }
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

    // Called when TimeWatcher mounts — begins gap tracking before first drill
    const startTracking = useCallback(() => {
        gapSegmentStartRef.current = Date.now();
    }, []);

    // Called when coach explicitly starts a drill
    const startDrill = useCallback(() => {
        // Close the current gap segment and save to practiceInfo
        if (gapSegmentStartRef.current !== null) {
            const segEnd = Date.now();
            const newSeg = {
                startTime: gapSegmentStartRef.current,
                endTime: segEnd,
                duration: segEnd - gapSegmentStartRef.current
            };
            setPracticeInfo(prev => ({
                ...prev,
                wasteTime: {
                    totalTime: (prev.wasteTime?.totalTime || 0) + newSeg.duration,
                    timeSegments: [...(prev.wasteTime?.timeSegments || []), newSeg]
                }
            }));
            gapSegmentStartRef.current = null;
        }
        // Begin tracking in-drill waste immediately (no timer running at drill start)
        wasteSegmentStartRef.current = Date.now();
        setDrillActive(true);
    }, [setPracticeInfo]);

    // Called when coach explicitly ends a drill
    const endDrill = useCallback(() => {
        // Stop any running timer (also triggers wasteSegmentStartRef in stopTimer — we'll clear it below)
        if (currentTimerRef.current) {
            stopTimer(currentTimerRef.current);
            wasteSegmentStartRef.current = null; // No waste starts after drill end
        }

        // Close in-drill waste segment if open
        if (wasteSegmentStartRef.current !== null) {
            const segEnd = Date.now();
            const newSeg = {
                startTime: wasteSegmentStartRef.current,
                endTime: segEnd,
                duration: segEnd - wasteSegmentStartRef.current
            };
            const existingSegs = drillsRef.current[currentDrillIndex]?.wasteTime?.timeSegments || [];
            setDrills(prev => prev.map((drill, idx) => {
                if (idx !== currentDrillIndex) return drill;
                return {
                    ...drill,
                    wasteTime: {
                        totalTime: wasteTimeRef.current,
                        timeSegments: [...existingSegs, newSeg]
                    }
                };
            }));
            wasteSegmentStartRef.current = null;
        }

        setDrillActive(false);
        gapSegmentStartRef.current = Date.now();
    }, [currentDrillIndex, setDrills, stopTimer]);

    // Called before navigating to results — closes the final gap segment
    const finishTracking = useCallback(() => {
        if (gapSegmentStartRef.current !== null) {
            const segEnd = Date.now();
            const newSeg = {
                startTime: gapSegmentStartRef.current,
                endTime: segEnd,
                duration: segEnd - gapSegmentStartRef.current
            };
            setPracticeInfo(prev => ({
                ...prev,
                wasteTime: {
                    totalTime: (prev.wasteTime?.totalTime || 0) + newSeg.duration,
                    timeSegments: [...(prev.wasteTime?.timeSegments || []), newSeg]
                }
            }));
            gapSegmentStartRef.current = null;
        }
    }, [setPracticeInfo]);

    const value = {
        timers,
        counters,
        currentTimer,
        wasteTime,
        drillActive,
        startTimer,
        pauseTimer,
        stopTimer,
        incrementCounter,
        decrementCounter,
        formatTime,
        saveTimerData,
        saveCounterData,
        startTracking,
        startDrill,
        endDrill,
        finishTracking
    };

    return (
        <TimerContext.Provider value={value}>
            {children}
        </TimerContext.Provider>
    );
};

export default TimerContextProvider;
