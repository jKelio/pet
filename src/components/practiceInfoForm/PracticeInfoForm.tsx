import {
    IonDatetime,
    IonDatetimeButton,
    IonInput,
    IonItem, IonItemDivider, IonItemGroup,
    IonLabel,
    IonList,
    IonListHeader,
    IonModal
} from "@ionic/react";
import React, {useCallback} from "react";
import {useTranslation} from "react-i18next";
import {useTrackingContext} from "../../pages/tracking/TrackingContextProvider";

const PracticeInfoForm: React.FC = () => {
    const {t} = useTranslation('pet');
    const {practiceInfo, setPracticeInfo, initDrills} = useTrackingContext();
    const changeDrillsNumber = useCallback((drillsNumber: number) => {
        setPracticeInfo({
            ...practiceInfo,
            drillsNumber
        });
        initDrills(drillsNumber);
    }, [initDrills, practiceInfo, setPracticeInfo]);

    return <IonList>
        <IonItemGroup>
            <IonItemDivider>
                <IonListHeader>
                    <IonLabel>{t('general.infoHeader')}</IonLabel>
                </IonListHeader>
            </IonItemDivider>
            <IonItem>
                <IonLabel position="floating">{t('general.clubLabel')}</IonLabel>
                <IonInput value={practiceInfo.clubName}
                          clearInput={true}
                          onIonChange={(e) => setPracticeInfo({
                              ...practiceInfo,
                              clubName: e.detail.value || ''
                          })}/>
            </IonItem>
            <IonItem>
                <IonLabel position="floating">{t('general.teamLabel')}</IonLabel>
                <IonInput value={practiceInfo.teamName}
                          clearInput={true}
                          onIonChange={(e) => setPracticeInfo({
                              ...practiceInfo,
                              teamName: e.detail.value || ''
                          })}/>
            </IonItem>
            <IonItem>
                <IonLabel>{t('general.dateLabel')}</IonLabel>
                <IonDatetimeButton datetime="datetime"/>
                <IonModal keepContentsMounted={true}>
                    <IonDatetime id="datetime" onIonChange={(e) => setPracticeInfo({
                        ...practiceInfo,
                        date: e.detail.value as string
                    })}/>
                </IonModal>
            </IonItem>
            <IonItem>
                <IonLabel position="floating">{t('general.coachLabel')}</IonLabel>
                <IonInput value={practiceInfo.coachName}
                          clearInput={true}
                          onIonChange={(e) => setPracticeInfo({
                              ...practiceInfo,
                              coachName: e.detail.value || ''
                          })}/>
            </IonItem>
            <IonItem>
                <IonLabel position="floating">{t('general.evaluationLabel')}</IonLabel>
                <IonInput type="number"
                          value={practiceInfo.evaluation}
                          clearInput={true}
                          onIonChange={(e) => setPracticeInfo({
                              ...practiceInfo,
                              evaluation: parseFloat(e.detail.value || '0')
                          })}/>
            </IonItem>
        </IonItemGroup>
        <IonItemGroup>
            <IonItemDivider>
                <IonListHeader>
                    <IonLabel>{t('practice.infoHeader')}</IonLabel>
                </IonListHeader>
            </IonItemDivider>
            <IonItem>
                <IonLabel position="floating">{t('practice.athletesNumberLabel')}</IonLabel>
                <IonInput type="number"
                          value={practiceInfo.athletesNumber}
                          clearInput={true}
                          onIonChange={(e) => setPracticeInfo({
                              ...practiceInfo,
                              athletesNumber: parseFloat(e.detail.value || '0')
                          })}/>
            </IonItem>
            <IonItem>
                <IonLabel position="floating">{t('practice.coachesNumberLabel')}</IonLabel>
                <IonInput type="number"
                          value={practiceInfo.coachesNumber}
                          clearInput={true}
                          onIonChange={(e) => setPracticeInfo({
                              ...practiceInfo,
                              coachesNumber: parseFloat(e.detail.value || '0')
                          })}/>
            </IonItem>
            <IonItem>
                <IonLabel position="floating">{t('practice.totalTimeLabel')}</IonLabel>
                <IonInput type="number"
                          value={practiceInfo.totalTime}
                          clearInput={true}
                          onIonChange={(e) => setPracticeInfo({
                              ...practiceInfo,
                              totalTime: parseFloat(e.detail.value || '0')
                          })}/>
            </IonItem>
            <IonItem>
                <IonLabel position="floating">{t('practice.trackedPlayerNameLabel')}</IonLabel>
                <IonInput value={practiceInfo.trackedPlayerName}
                          clearInput={true}
                          onIonChange={(e) => setPracticeInfo({
                              ...practiceInfo,
                              trackedPlayerName: e.detail.value || ''
                          })}/>
            </IonItem>
            <IonItem>
                <IonLabel position="floating">{t('practice.drillsNumberLabel')}</IonLabel>
                <IonInput type="number"
                          value={practiceInfo.drillsNumber}
                          clearInput={true}
                          onIonChange={(e) => changeDrillsNumber(parseInt(e.detail.value || '0'))}/>
            </IonItem>
        </IonItemGroup>
    </IonList>;
};

export default PracticeInfoForm;
