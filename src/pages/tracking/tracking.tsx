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
import PracticeInfoForm from "../../components/practiceInfoForm/PracticeInfoForm";
import DrillsForm from "../../components/drillsForm/DrillsForm";
import TrackingContextProvider, { useTrackingContext } from "./TrackingContextProvider";
import DrillSegments from "../../components/DrillSegments";

const TrackingContent: React.FC = () => {
    const { t } = useTranslation('pet');
    const { mode, goToNextStep, goToPrevStep } = useTrackingContext();

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
                {mode !== 'practiceInfo' && <DrillSegments />}
                {mode === 'practiceInfo' && <PracticeInfoForm/>}
                {mode === 'drills' && <DrillsForm/>}
                {/* Platzhalter für timeWatcher */}
                {mode === 'timeWatcher' && <div style={{padding: 32, textAlign: 'center'}}>{t('timeWatcher.placeholder') || 'TimeWatcher View (Platzhalter)'}</div>}
                <IonRow className="ion-justify-content-center">
                    {mode !== 'practiceInfo' && <IonButton fill="outline" onClick={goToPrevStep}>
                        {t('buttons.previousButtonText')}
                    </IonButton>}
                    <IonButton fill="outline" onClick={goToNextStep}>{t('buttons.nextButtenText')}</IonButton>
                </IonRow>
            </IonContent>
        </IonPage>
    );
};

const Tracking: React.FC = () => {
    return (
        <TrackingContextProvider>
            <TrackingContent />
        </TrackingContextProvider>
    );
};

export default Tracking;