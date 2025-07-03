import {
    IonItem,
    IonItemDivider,
    IonLabel,
    IonList,
    IonListHeader,
    IonSelect,
    IonSelectOption,
    IonToggle
} from "@ionic/react";
import React, {useCallback} from "react";
import {useTranslation} from "react-i18next";
import {useTrackingContext} from "../../pages/tracking/TrackingContextProvider";

const tags = [
    'station',
    'drill',
    'technique',
    'tactic',
    'smallareagame',
    'skating',
    'passing',
    'shot',
    'puckhandling',
    'battlechecking'
];

const DrillsForm: React.FC = () => {
    const {t} = useTranslation('pet')
    const {getCurrentDrill, updateCurrentDrill} = useTrackingContext();

    const updateToggledActionButtonAtCurrentDrillByIndex = useCallback((i: number) => {
        debugger;
        const currentDrill = getCurrentDrill();
        updateCurrentDrill({
            ...currentDrill,
            actionButtons: [
                ...currentDrill.actionButtons.slice(0, i),
                {
                    ...currentDrill.actionButtons[i],
                    enabled: !currentDrill.actionButtons[i].enabled
                },
                ...currentDrill.actionButtons.slice(i)
            ],
        });
    }, [getCurrentDrill, updateCurrentDrill]);


    const updateTagsAtCurrentDrill = useCallback((tags: string[]) => {
        debugger;
        const currentDrill = getCurrentDrill();
        updateCurrentDrill({
            ...currentDrill,
            tags: new Set(tags || []),
        });
    }, [getCurrentDrill, updateCurrentDrill]);

    return <IonList>
        <IonItem>
            <IonLabel position="floating">{t('drills.selectCategoriesLabel')}</IonLabel>
            <IonSelect placeholder={t('drills.selectCategoriesLabel') || ''}
                       multiple={true}
                       value={Array.from(getCurrentDrill()?.tags.values() || [])}>
                {tags.map((tag, i) => <IonSelectOption key={`selectable_${tag}`} value={tag}>
                    {t(`drills.${tag}`)}
                </IonSelectOption>)}
            </IonSelect>
        </IonItem>
        <IonItemDivider>
            <IonListHeader>
                <IonLabel>{t('actions.label')}</IonLabel>
            </IonListHeader>
        </IonItemDivider>
        <IonItem>
            <IonList style={{width: '100%'}}>
                {(getCurrentDrill()?.actionButtons || [])
                    .map((a, i) => <IonItem key={a.id}>
                        <IonLabel>
                            <h3>{t(`actions.${a.id}`)}</h3>
                            <p>{t(`actions.${a.type}`)}</p>
                        </IonLabel>
                        <IonToggle slot="end"
                                   checked={a.enabled}
                                   onIonChange={(e) => updateToggledActionButtonAtCurrentDrillByIndex(i)}/>
                    </IonItem>)}
            </IonList>
        </IonItem>
    </IonList>
};

export default DrillsForm;
