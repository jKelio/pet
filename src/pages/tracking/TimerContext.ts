import { createContext, useContext } from 'react';

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

export interface TimerState extends TimerData {
    isRunning: boolean;
    startTime: number | null;
    elapsedTime: number;
}

export type CounterState = CounterData;

export interface TimerContextType {
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
    saveTimerData: (actionId: string, timerData: TimerData) => void;
    saveCounterData: (actionId: string, count: number) => void;
    saveWasteTime: (wasteTime: number) => void;
}

export const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const useTimerContext = () => {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error('useTimerContext must be used within a TimerContextProvider');
    }
    return context;
};
