import React, { useState, useEffect, useRef } from 'react';
import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonIcon,
    IonBadge,
    IonGrid,
    IonRow,
    IonCol,
    IonFab,
    IonFabButton,
    IonButtons,
    IonBackButton
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useTrackingContext } from './TrackingContextProvider';
import { 
    play, 
    pause, 
    stop, 
    arrowForward, 
    arrowBack,
    timeOutline,
    calculatorOutline,
    trashOutline,
    hourglassOutline,
    addCircleOutline,
    removeCircleOutline,
    checkmarkCircleOutline
} from 'ionicons/icons';

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

const TimeWatcher: React.FC = () => {
    const { t } = useTranslation('pet');
    const { 
        drills, 
        currentDrillIndex, 
        setCurrentDrillIndex,
        updateDrillAction,
        practiceInfo,
        initDrills
    } = useTrackingContext();
    const history = useHistory();
    
    const [timers, setTimers] = useState<Record<string, TimerState>>({});
    const [counters, setCounters] = useState<Record<string, CounterState>>({});
    const [currentTimer, setCurrentTimer] = useState<string | null>(null);
    const [wasteTime, setWasteTime] = useState<number>(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const wasteTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const currentDrill = drills[currentDrillIndex];
    const enabledActions = currentDrill?.actionButtons.filter(action => action.enabled) || [];

    // Stelle sicher, dass Drills initialisiert sind und currentDrillIndex korrekt ist
    useEffect(() => {
        if (drills.length === 0 && practiceInfo.drillsNumber > 0) {
            // Drills wurden noch nicht erstellt, erstelle sie jetzt
            initDrills(practiceInfo.drillsNumber);
        }
        
        // Stelle sicher, dass currentDrillIndex im gültigen Bereich ist
        if (drills.length > 0 && (currentDrillIndex >= drills.length || currentDrillIndex < 0)) {
            setCurrentDrillIndex(0);
        }
    }, [drills.length, currentDrillIndex, practiceInfo.drillsNumber, initDrills]);

    // Timer-Logik
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
    }, [currentTimer]); // Entferne 'timers' aus den Dependencies

    // Waste Time Tracking
    useEffect(() => {
        if (!currentTimer) {
            // Kein Timer läuft - starte Waste Time Tracking
            wasteTimeIntervalRef.current = setInterval(() => {
                setWasteTime(prev => prev + 100);
            }, 100);
        } else {
            // Timer läuft - stoppe Waste Time Tracking
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

    // Initialisiere Timer und Counter für enabled Actions
    useEffect(() => {
        const newTimers: Record<string, TimerState> = {};
        const newCounters: Record<string, CounterState> = {};

        enabledActions.forEach(action => {
            if (action.type === 'timer') {
                newTimers[action.id] = {
                    isRunning: false,
                    startTime: null,
                    elapsedTime: 0,
                    totalTime: 0,
                    timeSegments: []
                };
            } else if (action.type === 'counter') {
                newCounters[action.id] = {
                    count: 0
                };
            }
        });

        setTimers(newTimers);
        setCounters(newCounters);
        setCurrentTimer(null);
        setWasteTime(0); // Reset Waste Time für neuen Drill
    }, [currentDrillIndex]); // Verwende currentDrillIndex statt enabledActions

    const startTimer = (actionId: string) => {
        if (currentTimer && currentTimer !== actionId) {
            // Stoppe aktuellen Timer
            stopTimer(currentTimer);
        }

        const now = Date.now();
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

            // Aktualisiere das letzte Zeitsegment
            const updatedSegments = [...timer.timeSegments];
            if (updatedSegments.length > 0) {
                const lastSegment = updatedSegments[updatedSegments.length - 1];
                lastSegment.endTime = now;
                lastSegment.duration = now - lastSegment.startTime;
            }

            return {
                ...prev,
                [actionId]: {
                    ...timer,
                    isRunning: false,
                    totalTime: timer.totalTime + timer.elapsedTime,
                    elapsedTime: 0,
                    startTime: null,
                    timeSegments: updatedSegments
                }
            };
        });
        setCurrentTimer(null);
    };

    const stopTimer = (actionId: string) => {
        const now = Date.now();
        setTimers(prev => {
            const timer = prev[actionId];
            
            // Aktualisiere das letzte Zeitsegment
            const updatedSegments = [...timer.timeSegments];
            if (updatedSegments.length > 0) {
                const lastSegment = updatedSegments[updatedSegments.length - 1];
                lastSegment.endTime = now;
                lastSegment.duration = now - lastSegment.startTime;
            }

            return {
                ...prev,
                [actionId]: {
                    ...timer,
                    isRunning: false,
                    totalTime: timer.totalTime + timer.elapsedTime,
                    elapsedTime: 0,
                    startTime: null,
                    timeSegments: updatedSegments
                }
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
        setCounters(prev => ({
            ...prev,
            [actionId]: {
                count: prev[actionId].count + 1
            }
        }));
    };

    const decrementCounter = (actionId: string) => {
        setCounters(prev => ({
            ...prev,
            [actionId]: {
                count: Math.max(0, prev[actionId].count - 1)
            }
        }));
    };

    const resetCounter = (actionId: string) => {
        setCounters(prev => ({
            ...prev,
            [actionId]: {
                count: 0
            }
        }));
    };

    const formatTime = (milliseconds: number): string => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const tenths = Math.floor((milliseconds % 1000) / 100);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
    };

    const goToNextDrill = () => {
        if (currentDrillIndex < drills.length - 1) {
            setCurrentDrillIndex(currentDrillIndex + 1);
        }
    };

    const finishTraining = () => {
        history.push('/page/results');
    };

    const goToPrevDrill = () => {
        if (currentDrillIndex > 0) {
            setCurrentDrillIndex(currentDrillIndex - 1);
        }
    };

    const isFirstDrill = currentDrillIndex === 0;
    const isLastDrill = currentDrillIndex === drills.length - 1;

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>
                        {t('timeWatcher.title')} - {t('drills.drill')} {currentDrillIndex + 1}
                    </IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent>
                <IonGrid>
                    <IonRow>
                        <IonCol>
                            <IonCard>
                                <IonCardHeader>
                                    <IonCardTitle>
                                        <IonIcon icon={timeOutline} size="large" />
                                        {t('timeWatcher.timers')}
                                    </IonCardTitle>
                                </IonCardHeader>
                                <IonCardContent>
                                    {enabledActions.filter(action => action.type === 'timer').length > 0 ? (
                                        enabledActions
                                            .filter(action => action.type === 'timer')
                                            .map(action => {
                                                const timer = timers[action.id];
                                                const totalTime = timer?.totalTime + timer?.elapsedTime || 0;
                                                const isRunning = timer?.isRunning || false;
                                                const isCurrentTimer = currentTimer === action.id;

                                                return (
                                                    <IonItem key={action.id}>
                                                        <IonLabel>
                                                            <h3>{t(`actions.${action.id}`)}</h3>
                                                            <p>{formatTime(totalTime)}</p>
                                                        </IonLabel>
                                                        <IonBadge 
                                                            slot="end" 
                                                            color={isCurrentTimer ? 'success' : 'medium'}
                                                        >
                                                            {isCurrentTimer ? t('timeWatcher.active') : t('timeWatcher.inactive')}
                                                        </IonBadge>
                                                        <IonButton
                                                            slot="end"
                                                            fill="clear"
                                                            onClick={() => isRunning ? pauseTimer(action.id) : startTimer(action.id)}
                                                            color={isRunning ? 'warning' : 'success'}
                                                        >
                                                            <IonIcon icon={isRunning ? pause : play} size="large" />
                                                        </IonButton>
                                                        <IonButton
                                                            slot="end"
                                                            fill="clear"
                                                            onClick={() => resetTimer(action.id)}
                                                            color="danger"
                                                        >
                                                            <IonIcon icon={trashOutline} size="large" />
                                                        </IonButton>
                                                    </IonItem>
                                                );
                                            })
                                    ) : (
                                        <IonItem>
                                            <IonLabel>
                                                <p>Keine Timer-Actions aktiviert</p>
                                            </IonLabel>
                                        </IonItem>
                                    )}
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                    </IonRow>

                    <IonRow>
                        <IonCol>
                            <IonCard>
                                <IonCardHeader>
                                    <IonCardTitle>
                                        <IonIcon icon={calculatorOutline} size="large" />
                                        {t('timeWatcher.counters')}
                                    </IonCardTitle>
                                </IonCardHeader>
                                <IonCardContent>
                                    {enabledActions.filter(action => action.type === 'counter').length > 0 ? (
                                        enabledActions
                                            .filter(action => action.type === 'counter')
                                            .map(action => {
                                                const counter = counters[action.id];
                                                const count = counter?.count || 0;

                                                return (
                                                    <IonItem key={action.id}>
                                                        <IonLabel>
                                                            <h3>{t(`actions.${action.id}`)}</h3>
                                                            <p>{t('timeWatcher.count')}: {count}</p>
                                                        </IonLabel>
                                                        <IonButton
                                                            slot="end"
                                                            fill="clear"
                                                            onClick={() => incrementCounter(action.id)}
                                                            color="success"
                                                            size="large"
                                                        >
                                                            <IonIcon icon={addCircleOutline} size="large" />
                                                        </IonButton>
                                                        <IonButton
                                                            slot="end"
                                                            fill="clear"
                                                            onClick={() => decrementCounter(action.id)}
                                                            color="warning"
                                                            size="large"
                                                        >
                                                            <IonIcon icon={removeCircleOutline} size="large" />
                                                        </IonButton>
                                                        <IonButton
                                                            slot="end"
                                                            fill="clear"
                                                            onClick={() => resetCounter(action.id)}
                                                            color="danger"
                                                        >
                                                            <IonIcon icon={trashOutline} size="large" />
                                                        </IonButton>
                                                    </IonItem>
                                                );
                                            })
                                    ) : (
                                        <IonItem>
                                            <IonLabel>
                                                <p>Keine Counter-Actions aktiviert</p>
                                            </IonLabel>
                                        </IonItem>
                                    )}
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                    </IonRow>

                    <IonRow>
                        <IonCol>
                            <IonCard>
                                <IonCardHeader>
                                    <IonCardTitle>
                                        <IonIcon icon={hourglassOutline} size="large" />
                                        {t('timeWatcher.wasteTime') || 'Waste Time'}
                                    </IonCardTitle>
                                </IonCardHeader>
                                <IonCardContent>
                                    <IonItem>
                                        <IonLabel>
                                            <h3>{t('timeWatcher.wasteTime') || 'Waste Time'}</h3>
                                            <p>{formatTime(wasteTime)}</p>
                                        </IonLabel>
                                        <IonBadge 
                                            slot="end" 
                                            color={!currentTimer ? 'warning' : 'medium'}
                                        >
                                            {!currentTimer ? t('timeWatcher.active') : t('timeWatcher.inactive')}
                                        </IonBadge>
                                        <IonButton
                                            slot="end"
                                            fill="clear"
                                            onClick={() => setWasteTime(0)}
                                            color="danger"
                                        >
                                            <IonIcon icon={trashOutline} size="large" />
                                        </IonButton>
                                    </IonItem>
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                    </IonRow>
                </IonGrid>

                <IonFab vertical="bottom" horizontal="center" slot="fixed">
                    {isLastDrill ? (
                        <IonFabButton onClick={finishTraining} color="success">
                            <IonIcon icon={checkmarkCircleOutline} />
                        </IonFabButton>
                    ) : (
                        <IonFabButton onClick={goToNextDrill}>
                            <IonIcon icon={arrowForward} />
                        </IonFabButton>
                    )}
                </IonFab>
            </IonContent>
        </IonPage>
    );
};

export default TimeWatcher; 