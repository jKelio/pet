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
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
    IonInput
} from "@ionic/react";
import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { Browser } from "@capacitor/browser";

const Feedback: React.FC = () => {
    const { t } = useTranslation(["menu", "feedback"]);
    const { user } = useAuth0();
    const [type, setType] = useState<string>("general");
    const [text, setText] = useState<string>("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!text.trim()) return;

        const userName = user?.name || user?.email || "Anonymous";

        if (type === "feature") {
            const title = encodeURIComponent(`[Feedback] ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`);
            const body = encodeURIComponent(`**User:** ${userName}\n\n**Feedback:**\n${text}`);
            const url = `https://github.com/jkelio/pet/issues/new?title=${title}&body=${body}`;
            await Browser.open({ url });
        } else {
            const subject = encodeURIComponent(`PET Feedback von ${userName}`);
            const body = encodeURIComponent(`Von: ${userName}\n\n${text}`);
            window.location.href = `mailto:info@leon-jaekel.com?subject=${subject}&body=${body}`;
        }

        setText("");
    };

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
                <form onSubmit={handleSubmit}>
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
                            <IonButton expand="block" type="submit" disabled={!text.trim()}>{t('feedback:submitButton')}</IonButton>
                        </IonItem>
                    </IonList>
                </form>
            </IonContent>
        </IonPage>
    );
};

export default Feedback;