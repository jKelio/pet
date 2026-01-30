import React, {useEffect, useRef} from "react";
import {
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonList,
    IonMenuButton,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar
} from "@ionic/react";
import {useTranslation} from "react-i18next";

const Language: React.FC = () => {
    const { t, i18n} = useTranslation('menu');
    const selectRef = useRef<HTMLIonSelectElement|null>(null);
    useEffect(() => {
        selectRef.current!.value = i18n.language || 'en';
    });

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonMenuButton/>
                    </IonButtons>
                    <IonTitle>{t('language')}</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen>
                <IonHeader collapse="condense">
                    <IonToolbar>
                        <IonTitle size="large">{t('language')}</IonTitle>
                    </IonToolbar>
                </IonHeader>
                <IonList>
                    <IonItem>
                        <IonSelect
                            ref={selectRef}
                            placeholder={t('language') || ''}
                            onIonChange={(e) => i18n.changeLanguage(e.detail.value)}
                        >
                            <IonSelectOption value="en">English</IonSelectOption>
                            <IonSelectOption value="de">Deutsch</IonSelectOption>
                            <IonSelectOption value="ru">Русский</IonSelectOption>
                        </IonSelect>
                    </IonItem>
                </IonList>
            </IonContent>
        </IonPage>
    );
}

export default Language;