import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonMenuButton,
    IonPage,
    IonRow,
    IonTitle,
    IonToolbar
} from "@ionic/react";
import React from "react";
import {useTranslation} from "react-i18next";
import { useHistory } from "react-router-dom";
import PracticeInfoForm from "../../components/practiceInfoForm/PracticeInfoForm";
import DrillsForm from "../../components/drillsForm/DrillsForm";
import { useTrackingContext } from "./TrackingContextProvider";
import DrillSegments from "../../components/DrillSegments";

const Tracking: React.FC = () => {
    const { t } = useTranslation('pet');
    const { mode, goToNextStep, goToPrevStep, practiceInfo, setCurrentDrillIndex } = useTrackingContext();
    const history = useHistory();

    const goToTimeWatcher = () => {
        setCurrentDrillIndex(0);
        history.push('/page/timeWatcher');
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonMenuButton/>
                    </IonButtons>
                    <IonTitle>{t('title')}</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen>
                <IonHeader collapse="condense">
                    <IonToolbar>
                        <IonTitle size="large">{t('title')}</IonTitle>
                    </IonToolbar>
                </IonHeader>
                {mode !== 'practiceInfo' && mode !== 'timeWatcher' && <DrillSegments />}
                {mode === 'practiceInfo' && <PracticeInfoForm/>}
                {mode === 'drills' && <DrillsForm/>}
                {mode === 'timeWatcher' && (
                    <div style={{padding: 32, textAlign: 'center'}}>
                        <p>{t('timeWatcher.placeholder') || 'TimeWatcher View (Platzhalter)'}</p>
                        <IonButton onClick={goToTimeWatcher} color="primary">
                            {t('timeWatcher.startButton') || 'Start TimeWatcher'}
                        </IonButton>
                    </div>
                )}
                <IonRow className="ion-justify-content-center">
                    {mode !== 'practiceInfo' && <IonButton fill="outline" onClick={goToPrevStep}>
                        {t('buttons.previousButtonText')}
                    </IonButton>}
                    {mode === 'drills' ? (
                        <IonButton 
                            fill="solid"
                            color="primary"
                            expand="block"
                            onClick={goToTimeWatcher}
                        >
                            {t('timeWatcher.startButton') || 'Start TimeWatcher'}
                        </IonButton>
                    ) : (
                        mode !== 'timeWatcher' && <IonButton 
                            fill="outline" 
                            onClick={goToNextStep}
                            disabled={mode === 'practiceInfo' && practiceInfo.drillsNumber <= 0}
                        >
                            {t('buttons.nextButtenText')}
                        </IonButton>
                    )}
                </IonRow>
            </IonContent>
        </IonPage>
    );
};

export default Tracking;