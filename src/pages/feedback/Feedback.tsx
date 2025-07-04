import React, { useState } from "react";
import {
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton
} from "@ionic/react";
import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";

const Feedback: React.FC = () => {
    const { t } = useTranslation(["menu", "feedback"]);
    const { user } = useAuth0();
    const [type, setType] = useState<string>("general");
    const [text, setText] = useState<string>("");

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
                        <IonTitle size="large">{t('menu:feedback')}</IonTitle>
                    </IonToolbar>
                </IonHeader>
                <form>
                    <IonList>
                        <IonItem>
                            <IonLabel position="stacked">{t('feedback:userLabel')}</IonLabel>
                            <IonInput readonly value={user?.name || user?.email || "-"} />
                        </IonItem>
                        <IonItem>
                            <IonLabel position="stacked">{t('feedback:typeLabel')}</IonLabel>
                            <IonSelect value={type} onIonChange={e => setType(e.detail.value)}>
                                <IonSelectOption value="general">{t('feedback:typeGeneral')}</IonSelectOption>
                                <IonSelectOption value="feature">{t('feedback:typeFeature')}</IonSelectOption>
                            </IonSelect>
                        </IonItem>
                        <IonItem>
                            <IonLabel position="stacked">{t('feedback:feedbackLabel')}</IonLabel>
                            <IonTextarea
                                value={text}
                                onIonInput={e => setText(e.detail.value ?? '')}
                                placeholder={t('feedback:feedbackPlaceholder') || ''}
                                autoGrow
                            />
                        </IonItem>
                        <IonItem lines="none">
                            <IonButton expand="block" type="submit" disabled>{t('feedback:submitButton')}</IonButton>
                        </IonItem>
                    </IonList>
                </form>
            </IonContent>
        </IonPage>
    );
};

export default Feedback;