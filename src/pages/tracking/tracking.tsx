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
import React, {useState} from "react";
import {useTranslation} from "react-i18next";
import PracticeInfoForm from "../../components/practiceInfoForm/PracticeInfoForm";
import DrillsForm from "../../components/drillsForm/DrillsForm";
import TrackingContextProvider from "./TrackingContextProvider";
import DrillSegments from "../../components/DrillSegments";

const Tracking: React.FC = () => {
    const {t} = useTranslation('pet');
    const [mode, setMode] = useState<'practiceInfo' | 'drills' | 'timeWatcher'>('practiceInfo')

    const goToNextStep = () => {
        switch (mode) {
            case "practiceInfo":
                setMode("drills");
                break;
            case "drills":
                setMode("timeWatcher");
                break;
            case "timeWatcher":
                // TODO
                break;
        }
    };
    const goToPrevStep = () => {
        switch (mode) {
            case "drills":
                setMode("practiceInfo");
                break;
            case "timeWatcher":
                setMode("drills");
                break;
        }
    };

    return <TrackingContextProvider children={[<IonPage key="TrackingPage">
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
            <IonRow className="ion-justify-content-center">
                {mode !== 'practiceInfo' && <IonButton fill="outline"
                                                       onClick={goToPrevStep}>
                    {t('buttons.previousButtonText')}
                </IonButton>}
                <IonButton fill="outline" onClick={goToNextStep}>{t('buttons.nextButtenText')}</IonButton>
            </IonRow>
        </IonContent>
    </IonPage>]}/>;
};

export default Tracking;