import React, { useEffect, useState, useRef } from 'react';
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
    IonFabButton
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useTrackingContext } from './TrackingContext';
import { useTimerContext } from './TimerContext';
import {
    play,
    pause,
    timeOutline,
    calculatorOutline,
    hourglassOutline,
    addCircleOutline,
    removeCircleOutline,
    checkmarkCircleOutline,
    stopCircleOutline,
    playCircleOutline
} from 'ionicons/icons';

const TimeWatcher: React.FC = () => {
    const { t } = useTranslation('pet');
    const {
        drills,
        currentDrillIndex,
        setCurrentDrillIndex,
        practiceInfo,
        initDrills
    } = useTrackingContext();
    const {
        timers,
        counters,
        currentTimer,
        wasteTime,
        drillActive,
        startTimer,
        pauseTimer,
        incrementCounter,
        decrementCounter,
        formatTime,
        startTracking,
        startDrill,
        endDrill,
        finishTracking
    } = useTimerContext();
    const history = useHistory();

    // Tracks whether a drill has been ended (distinguishes "before first drill" from "between drills")
    const [drillHasEnded, setDrillHasEnded] = useState(false);
    // Live elapsed time for the current gap period (display only)
    const [gapElapsed, setGapElapsed] = useState(0);
    const gapDisplayStartRef = useRef<number | null>(null);

    const currentDrill = drills[currentDrillIndex];
    const enabledActions = currentDrill?.actionButtons.filter(action => action.enabled) || [];
    const isLastDrill = currentDrillIndex === drills.length - 1;

    // Start gap tracking when TimeWatcher mounts
    useEffect(() => {
        startTracking();
    }, [startTracking]);

    // Ensure drills are initialized
    useEffect(() => {
        if (drills.length === 0 && practiceInfo.drillsNumber > 0) {
            initDrills(practiceInfo.drillsNumber);
        }
        if (drills.length > 0 && (currentDrillIndex >= drills.length || currentDrillIndex < 0)) {
            setCurrentDrillIndex(0);
        }
    }, [drills.length, currentDrillIndex, practiceInfo.drillsNumber, initDrills, setCurrentDrillIndex]);

    // Gap elapsed display timer
    useEffect(() => {
        if (!drillActive) {
            gapDisplayStartRef.current = Date.now();
            setGapElapsed(0);
            const interval = setInterval(() => {
                setGapElapsed(Date.now() - (gapDisplayStartRef.current || Date.now()));
            }, 100);
            return () => clearInterval(interval);
        } else {
            setGapElapsed(0);
            gapDisplayStartRef.current = null;
        }
    }, [drillActive]);

    const handleStartDrill = () => {
        if (drillHasEnded) {
            setCurrentDrillIndex(currentDrillIndex + 1);
        }
        setDrillHasEnded(false);
        startDrill();
    };

    const handleEndDrill = () => {
        endDrill();
        setDrillHasEnded(true);
    };

    const handleFinishTraining = () => {
        finishTracking();
        history.push('/page/results');
    };

    const handleTimerButtonClick = (actionId: string, isCurrentTimer: boolean, isRunning: boolean) => {
        if (isCurrentTimer && isRunning) {
            pauseTimer(actionId);
        } else {
            startTimer(actionId);
        }
    };

    // Next drill number to display (1-based)
    const nextDrillNumber = drillHasEnded ? currentDrillIndex + 2 : currentDrillIndex + 1;

    // --- GAP VIEW ---
    if (!drillActive) {
        const showFinishButton = drillHasEnded && isLastDrill;

        return (
            <IonPage>
                <IonHeader>
                    <IonToolbar>
                        <IonTitle>{t('timeWatcher.pause')}</IonTitle>
                    </IonToolbar>
                </IonHeader>

                <IonContent>
                    <IonGrid>
                        <IonRow>
                            <IonCol>
                                <IonCard>
                                    <IonCardHeader>
                                        <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <IonIcon icon={hourglassOutline} size="large" />
                                            {t('timeWatcher.gapTime')}
                                        </IonCardTitle>
                                    </IonCardHeader>
                                    <IonCardContent>
                                        <IonItem>
                                            <IonLabel>
                                                <h2 style={{ fontSize: '2rem', textAlign: 'center' }}>
                                                    {formatTime(gapElapsed)}
                                                </h2>
                                            </IonLabel>
                                            <IonBadge slot="end" color="warning">
                                                {t('timeWatcher.active')}
                                            </IonBadge>
                                        </IonItem>
                                    </IonCardContent>
                                </IonCard>
                            </IonCol>
                        </IonRow>
                    </IonGrid>

                    <IonFab vertical="bottom" horizontal="center" slot="fixed">
                        {showFinishButton ? (
                            <IonFabButton onClick={handleFinishTraining} color="success">
                                <IonIcon icon={checkmarkCircleOutline} />
                            </IonFabButton>
                        ) : (
                            <IonFabButton onClick={handleStartDrill} color="primary">
                                <IonIcon icon={playCircleOutline} />
                            </IonFabButton>
                        )}
                    </IonFab>

                    {/* Label below FAB */}
                    <div style={{
                        position: 'fixed',
                        bottom: 16,
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        pointerEvents: 'none',
                        paddingBottom: 'env(safe-area-inset-bottom)'
                    }}>
                        <span style={{ fontSize: '0.85rem', color: '#666', marginTop: 70, display: 'block' }}>
                            {showFinishButton
                                ? t('timeWatcher.finishTraining')
                                : `${t('timeWatcher.startDrill')} ${nextDrillNumber}`
                            }
                        </span>
                    </div>
                </IonContent>
            </IonPage>
        );
    }

    // --- DRILL ACTIVE VIEW ---
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', minHeight: 48 }}>
                        <IonTitle style={{ flex: '0 1 auto', marginRight: 12 }}>
                            {t('timeWatcher.title')} - {t('drills.drill')} {currentDrillIndex + 1}
                        </IonTitle>
                        {currentDrill?.tags && Array.from(currentDrill.tags).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                                {Array.from(currentDrill.tags).map(tag => (
                                    <IonBadge key={tag} color="primary" style={{ marginRight: 6, marginBottom: 2 }}>
                                        {t(`drills.${tag}`)}
                                    </IonBadge>
                                ))}
                            </div>
                        )}
                    </div>
                </IonToolbar>
            </IonHeader>

            <IonContent>
                <IonGrid>
                    <IonRow>
                        <IonCol>
                            <IonCard>
                                <IonCardHeader>
                                    <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                                            onClick={() => handleTimerButtonClick(action.id, isCurrentTimer, isRunning)}
                                                            color={isRunning ? 'warning' : 'success'}
                                                            disabled={!isCurrentTimer && !!currentTimer}
                                                        >
                                                            <IonIcon icon={isRunning ? pause : play} size="large" />
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
                                    <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                    <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                    </IonItem>
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                    </IonRow>
                </IonGrid>

                <IonFab vertical="bottom" horizontal="center" slot="fixed">
                    <IonFabButton onClick={handleEndDrill} color="danger">
                        <IonIcon icon={stopCircleOutline} />
                    </IonFabButton>
                </IonFab>

                <div style={{
                    position: 'fixed',
                    bottom: 16,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    pointerEvents: 'none',
                    paddingBottom: 'env(safe-area-inset-bottom)'
                }}>
                    <span style={{ fontSize: '0.85rem', color: '#666', marginTop: 70, display: 'block' }}>
                        {t('timeWatcher.endDrill')}
                    </span>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default TimeWatcher;
