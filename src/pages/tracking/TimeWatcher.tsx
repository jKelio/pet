import React, { useEffect } from 'react';
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
import { useTimerContext } from './TimerContextProvider';
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
        startTimer,
        pauseTimer,
        resetTimer,
        incrementCounter,
        decrementCounter,
        resetCounter,
        resetWasteTime,
        formatTime
    } = useTimerContext();
    const history = useHistory();

    const currentDrill = drills[currentDrillIndex];
    const enabledActions = currentDrill?.actionButtons.filter(action => action.enabled) || [];

    // Ensure drills are initialized and currentDrillIndex is correct
    useEffect(() => {
        if (drills.length === 0 && practiceInfo.drillsNumber > 0) {
            // Drills haven't been created yet, create them now
            initDrills(practiceInfo.drillsNumber);
        }
        
        // Ensure currentDrillIndex is within valid range
        if (drills.length > 0 && (currentDrillIndex >= drills.length || currentDrillIndex < 0)) {
            setCurrentDrillIndex(0);
        }
    }, [drills.length, currentDrillIndex, practiceInfo.drillsNumber, initDrills, setCurrentDrillIndex]);

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
                                            onClick={resetWasteTime}
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