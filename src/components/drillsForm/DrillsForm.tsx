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
    const {getCurrentDrill, updateCurrentDrill, updateDrillAction, currentDrillIndex} = useTrackingContext();

    const updateToggledActionButtonAtCurrentDrillByIndex = (actionId: string) => {
        const currentDrill = getCurrentDrill();
        const action = currentDrill.actionButtons.find(a => a.id === actionId);
        if (!action) return;
        updateDrillAction(currentDrillIndex, actionId, { enabled: !action.enabled });
    };


    const updateTagsAtCurrentDrill = (tags: string[]) => {
        const currentDrill = getCurrentDrill();
        updateCurrentDrill({
            ...currentDrill,
            tags: new Set(tags || []),
        });
    };

    return (
        <IonList>
            <IonItem>
                <IonSelect label={t('drills.selectCategoriesLabel') || ''}
                           labelPlacement="floating"
                           multiple={true}
                           value={Array.from(getCurrentDrill()?.tags.values() || [])}
                           onIonChange={e => updateTagsAtCurrentDrill(e.detail.value)}>
                    {tags.map((tag) => (
                        <IonSelectOption key={`selectable_${tag}`} value={tag}>
                            {t(`drills.${tag}`)}
                        </IonSelectOption>
                    ))}
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
                        .map((a) => (
                            <IonItem key={a.id}>
                                <IonLabel>
                                    <h3>{t(`actions.${a.id}`)}</h3>
                                    <p>{t(`actions.${a.type}`)}</p>
                                </IonLabel>
                                <IonToggle slot="end"
                                           checked={a.enabled}
                                           onIonChange={() => updateToggledActionButtonAtCurrentDrillByIndex(a.id)} />
                            </IonItem>
                        ))}
                </IonList>
            </IonItem>
        </IonList>
    );
};

export default DrillsForm;
