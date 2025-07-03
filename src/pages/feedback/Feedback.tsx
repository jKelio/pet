import React from "react";
import {
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonList,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar
} from "@ionic/react";
import {useTranslation} from "react-i18next";

const Feedback: React.FC = () => {
    const { t } = useTranslation();

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonMenuButton/>
                    </IonButtons>
                    <IonTitle>{t('menu:feedback')}</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen>
                <IonHeader collapse="condense">
                    <IonToolbar>
                        <IonTitle size="large">{t('menu:feedback' || '')}</IonTitle>
                    </IonToolbar>
                </IonHeader>
                <IonList>
                    <IonItem>TODO</IonItem>
                </IonList>
            </IonContent>
        </IonPage>
    );
};

export default Feedback;